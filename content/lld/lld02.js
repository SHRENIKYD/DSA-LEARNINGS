(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- tiny helpers shared by all visualizers ---------- */
  // a class / interface / module box for class diagrams
  function B(id, label, x, y) { return { id: id, label: label, x: x, y: y, shape: 'box' }; }
  // a directed class diagram: edge [u, v, label] means "u depends on / uses v"
  function G(label, nodes, edges, o) {
    o = o || {};
    return { type: 'graph', label: label, directed: true, height: o.h || 60, nodes: nodes, edges: edges, hl: o.hl || {}, ehl: o.ehl || {}, tags: o.tags || {} };
  }
  // python / TypeScript / C++ versions of Java code panes, keyed by the exact Java text (filled in near the end of this file)
  var ALTS = {};
  function mkAlt(py, ts, cpp, maps) {
    maps = maps || {};
    return { python: { code: py, map: maps.python || {} }, js: { lang: 'ts', code: ts, map: maps.ts || {} }, cpp: { code: cpp, map: maps.cpp || {} } };
  }
  function CODE(label, code, hl, alt) { return { type: 'code', label: label, lang: 'java', code: code, hl: hl || {}, alt: alt || ALTS[code] }; }
  function TXT(html, label) { var p = { type: 'text', html: html }; if (label) p.label = label; return p; }
  function F(narr, parts) { return { narr: narr, parts: parts }; }
  function clone(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r; }
  function pick(input, options, hint) {
    var k = String(input === undefined ? '' : input).trim().toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(options, k)) throw new Error(hint);
    return k;   // the normalised key the user chose
  }
  // every edge of a diagram painted with one class (e.g. all 'bad' or all 'ok')
  function paint(edges, cls) { var r = {}; edges.forEach(function (e) { r[e[0] + '-' + e[1]] = cls; }); return r; }

  /*
   * Ripple effect animation.
   * A change lands on `start`. Every class that depends on a changed class (directly or indirectly)
   * must be re-opened, re-compiled or re-tested. We walk the reverse dependency edges breadth-first
   * and light the classes up one by one. `cls` = 'bad' for the messy design, 'ok' for the clean one.
   */
  function ripple(label, nodes, edges, start, why, cls, h) {
    var frames = [], hl = {}, ehl = {}, order = [start], seen = {}, q = [start], names = {};
    nodes.forEach(function (n) { names[n.id] = n.label; });
    seen[start] = true; hl[start] = 'cur';
    frames.push(F('A change request lands on <b>' + names[start] + '</b>: ' + why + ' Now watch who else has to be opened, rebuilt or re-tested because they <i>depend on</i> it.',
      [G(label, nodes, edges, { hl: clone(hl), ehl: clone(ehl), tags: { } , h: h }), { type: 'vars', label: 'damage so far', vals: { boxesTouched: 1 }, hl: { boxesTouched: 'cur' } }]));
    while (q.length) {
      var cur = q.shift();
      edges.forEach(function (e) {
        if (e[1] === cur && !seen[e[0]]) {
          seen[e[0]] = true; q.push(e[0]); order.push(e[0]);
          var h2 = clone(hl); h2[e[0]] = 'cur'; h2[cur] = cls;
          var eh = clone(ehl); eh[e[0] + '-' + e[1]] = cls;
          frames.push(F('<b>' + names[e[0]] + '</b> depends on <b>' + names[cur] + '</b> (arrow ' + names[e[0]] + ' → ' + names[cur] + '), so the change ripples into it. ' +
            (cls === 'bad' ? '<span class="c-r">One more box to edit or re-check.</span>' : '<span class="c-g">Expected, local impact — the direct user re-checks, and the ripple stops here.</span>'),
            [G(label, nodes, edges, { hl: h2, ehl: eh, h: h }), { type: 'vars', label: 'damage so far', vals: { boxesTouched: order.length }, hl: { boxesTouched: cls === 'bad' ? 'bad' : 'ok' } }]));
          hl[e[0]] = cls; ehl[e[0] + '-' + e[1]] = cls;
        }
      });
      hl[cur] = cls;
    }
    var fin = clone(hl);
    frames.push(F('Ripple finished: <b>' + order.length + ' of ' + nodes.length + '</b> boxes touched (' + order.map(function (id) { return names[id]; }).join(', ') + '). ' +
      (cls === 'bad' ? '<span class="c-r">Big blast radius = rigid, fragile design.</span>' : '<span class="c-g">Small blast radius = the design absorbed the change.</span>'),
      [G(label, nodes, edges, { hl: fin, ehl: clone(ehl), h: h }), { type: 'vars', label: 'final damage', vals: { boxesTouched: order.length, totalBoxes: nodes.length }, hl: { boxesTouched: cls === 'bad' ? 'bad' : 'ok' } }]));
    return frames;
  }

  /*
   * Step through a refactor: `steps` = [{ narr, code, hl, graph? }]
   */
  function refactorFrames(title, steps) {
    return steps.map(function (s) {
      var parts = [CODE(s.label || title, s.code, s.hl)];
      if (s.graph) parts.push(s.graph);
      if (s.note) parts.push(TXT(s.note));
      return F(s.narr, parts);
    });
  }

  /* ======================= TOPIC 1: WHY SOLID ======================= */
  var T1_GOD = `class OrderManager {
  double placeOrder(String item, double price, String email) {
    double tax = price * 0.18;          // tax rule
    double total = price + tax;
    String sql = "INSERT INTO orders VALUES('"
        + item + "'," + total + ")";    // database
    System.out.println("MySQL> " + sql);
    String pdf = "%PDF " + item + " " + total; // invoice
    System.out.println("SMTP to " + email
        + ": " + pdf);                  // email
    return total;
  }
}`;
  var T1_CLEAN = `class OrderService {
  private final TaxPolicy tax;
  private final OrderRepository repo;
  private final InvoiceRenderer renderer;
  private final Notifier notifier;
  OrderService(TaxPolicy t, OrderRepository r,
               InvoiceRenderer v, Notifier n) {
    tax = t; repo = r; renderer = v; notifier = n;
  }
  double placeOrder(String item, double price, String email) {
    double total = price + tax.on(price);
    repo.save(item, total);
    notifier.send(email, renderer.render(item, total));
    return total;
  }
}`;

  topics.push({
    title: 'Why SOLID? Design Smells and the Ripple of Change',
    analogy: `<p>Imagine an old house where <b>all the electrical wires run through one wall</b>. You want to move one light switch, but the electrician must break the kitchen tiles, cut the TV cable and re-paint the bedroom. Nothing is "broken", yet every small change is <b>slow, scary and expensive</b>. A well-built house has separate circuits, standard sockets and a fuse box: you swap a lamp without touching anything else. <b>SOLID is the wiring code for software</b> — five rules that keep each change inside one small room.</p>`,
    explain: `<p><b>Big idea:</b> code is read and changed far more often than it is written. A design is "good" when <b>the next change is cheap and safe</b>. Bad designs still run — they just make every change hurt. Robert C. Martin ("Uncle Bob") collected five principles around the year 2000 and Michael Feathers noticed their first letters spell <b>SOLID</b>:</p>
${H.table(['Letter', 'Principle', 'One-line meaning (plain English)', 'Pain it removes'], [
  ['<b>S</b>', 'Single Responsibility', 'A class should have one reason to change — it serves one "boss".', 'Fixing the invoice breaks the email'],
  ['<b>O</b>', 'Open/Closed', 'Add new behaviour by adding new code, not by editing old, tested code.', 'Every new feature edits the same giant switch'],
  ['<b>L</b>', 'Liskov Substitution', 'A child class must work anywhere its parent is expected — no surprises.', '<code>instanceof</code> checks and "not supported" exceptions'],
  ['<b>I</b>', 'Interface Segregation', 'Many small, focused interfaces beat one fat interface.', 'Classes forced to implement methods they do not need'],
  ['<b>D</b>', 'Dependency Inversion', 'Business logic depends on abstractions (interfaces), not on concrete tools like MySQL.', 'Cannot test or swap the database / email provider']
])}
<p><b>The four classic design smells</b> (smell = a hint that something is wrong, like the smell of gas):</p>
<ul>
<li>${H.c('r', 'Rigidity')} — one change forces many other changes. "We just wanted to add UPI payments and touched 14 files."</li>
<li>${H.c('r', 'Fragility')} — a change breaks something in a far-away, unrelated place. "We fixed the PDF and the email broke."</li>
<li>${H.c('r', 'Immobility')} — you cannot reuse a useful piece because it is welded to everything else. "Our discount logic needs the whole web server to run."</li>
<li>${H.c('r', 'Viscosity')} — doing the right thing is harder than hacking. "Easier to copy-paste than to extend."</li>
</ul>
<p><b>Two words you will hear all module:</b> <b>coupling</b> = how much one class knows about / depends on another (want it <i>low</i>); <b>cohesion</b> = how closely the things inside one class belong together (want it <i>high</i>). SOLID is basically five practical recipes for <b>low coupling, high cohesion</b>.</p>
<p><b>How to read our class diagrams:</b> a box is a class or interface (interfaces are written like ${H.c('p', '«TaxPolicy»')}); an arrow <b>A → B</b> means "A depends on B" (A uses, extends or implements B). If B changes, A may have to change too — that is the <b>ripple</b>. ${H.c('r', 'Red arrows')} are dependencies that violate a principle; ${H.c('g', 'green arrows')} are the healthy ones after refactoring.</p>`,
    clues: [
      '"Design this so it is <b>easy to extend</b>" / "how would you add a new type later?" → they are testing SOLID, mostly OCP + DIP.',
      '"Here is some code, <b>review it</b>" or "what is wrong with this class?" → name the smell (rigidity/fragility) and the principle it breaks.',
      '"Make it <b>testable</b>" / "how would you unit test this?" → dependency inversion + small responsibilities.',
      'A class named <code>Manager</code>, <code>Helper</code>, <code>Utils</code>, <code>Processor</code> with 20+ methods → God class, SRP smell.',
      '"Requirements will change frequently" / "support multiple providers" → design for the axis of change with interfaces.',
      'Machine-coding rounds (Parking Lot, Splitwise…) → interviewers silently grade SOLID: are new vehicle types / split types added without editing old classes?'
    ],
    code: [{ lang: 'java', title: 'Before: one God class does tax, DB, PDF and email', code: `class OrderManager {
    // Four different "bosses" can ask for changes here:
    // finance (tax), DBA (SQL), design team (invoice), ops (email).
    double placeOrder(String item, double price, String email) {
        double tax = price * 0.18;                       // finance rule, hard-coded
        double total = price + tax;
        String sql = "INSERT INTO orders VALUES('" + item + "'," + total + ")";
        System.out.println("MySQL> " + sql);             // talks to MySQL directly
        String pdf = "%PDF invoice: " + item + " = " + total;  // invoice layout
        System.out.println("SMTP to " + email + ": " + pdf);   // talks to SMTP directly
        return total;
    }

    public static void main(String[] args) {
        System.out.println(new OrderManager().placeOrder("Book", 100, "a@b.com"));
    }
}`, alt: [
          { lang: 'python', code: `class OrderManager:
    # Four different "bosses" can ask for changes here:
    # finance (tax), DBA (SQL), design team (invoice), ops (email).
    def place_order(self, item: str, price: float, email: str) -> float:
        tax = price * 0.18                           # finance rule, hard-coded
        total = price + tax
        sql = f"INSERT INTO orders VALUES('{item}',{total})"
        print("MySQL>", sql)                         # talks to MySQL directly
        pdf = f"%PDF invoice: {item} = {total}"      # invoice layout
        print(f"SMTP to {email}: {pdf}")             # talks to SMTP directly
        return total


if __name__ == "__main__":
    print(OrderManager().place_order("Book", 100, "a@b.com"))` },
          { lang: 'ts', code: `class OrderManager {
  // Four different "bosses" can ask for changes here:
  // finance (tax), DBA (SQL), design team (invoice), ops (email).
  placeOrder(item: string, price: number, email: string): number {
    const tax = price * 0.18; // finance rule, hard-coded
    const total = price + tax;
    const sql = \`INSERT INTO orders VALUES('\${item}',\${total})\`;
    console.log("MySQL> " + sql); // talks to MySQL directly
    const pdf = \`%PDF invoice: \${item} = \${total}\`; // invoice layout
    console.log(\`SMTP to \${email}: \${pdf}\`); // talks to SMTP directly
    return total;
  }
}

console.log(new OrderManager().placeOrder("Book", 100, "a@b.com"));` },
          { lang: 'cpp', code: `class OrderManager {
public:
    // Four different "bosses" can ask for changes here:
    // finance (tax), DBA (SQL), design team (invoice), ops (email).
    double placeOrder(const string& item, double price, const string& email) {
        double tax = price * 0.18;                        // finance rule, hard-coded
        double total = price + tax;
        cout << "MySQL> INSERT INTO orders VALUES('" << item << "'," << total << ")\\n";   // talks to MySQL directly
        cout << "SMTP to " << email << ": %PDF invoice: " << item << " = " << total << "\\n";   // invoice layout + SMTP, mixed together
        return total;
    }
};

int main() {
    cout << OrderManager().placeOrder("Book", 100, "a@b.com") << "\\n";
}` },
  { lang: 'csharp', code: `
using System;

class OrderManager {
    // Four different "bosses" can ask for changes here:
    // finance (tax), DBA (SQL), design team (invoice), ops (email).
    public double PlaceOrder(string item, double price, string email) {
        double tax = price * 0.18;                       // finance rule, hard-coded
        double total = price + tax;
        string sql = "INSERT INTO orders VALUES('" + item + "'," + total + ")";
        Console.WriteLine("MySQL> " + sql);              // talks to MySQL directly
        string pdf = "%PDF invoice: " + item + " = " + total;  // invoice layout
        Console.WriteLine("SMTP to " + email + ": " + pdf);    // talks to SMTP directly
        return total;
    }
}

class Program {
    static void Main() {
        Console.WriteLine(new OrderManager().PlaceOrder("Book", 100, "a@b.com"));
    }
}` }
        ] }, { lang: 'java', title: 'After: each concern behind its own small interface (SOLID preview)', code: `interface TaxPolicy { double on(double price); }
interface OrderRepository { void save(String item, double total); }
interface InvoiceRenderer { String render(String item, double total); }
interface Notifier { void send(String to, String body); }

class GstTax implements TaxPolicy { public double on(double p) { return p * 0.18; } }
class MySqlOrderRepository implements OrderRepository {
    public void save(String item, double total) { System.out.println("MySQL> save " + item + " " + total); }
}
class PdfInvoiceRenderer implements InvoiceRenderer {
    public String render(String item, double total) { return "%PDF invoice: " + item + " = " + total; }
}
class EmailNotifier implements Notifier {
    public void send(String to, String body) { System.out.println("SMTP to " + to + ": " + body); }
}

// High-level policy: knows WHAT happens, not HOW each tool works.
class OrderService {
    private final TaxPolicy tax;
    private final OrderRepository repo;
    private final InvoiceRenderer renderer;
    private final Notifier notifier;

    OrderService(TaxPolicy tax, OrderRepository repo, InvoiceRenderer renderer, Notifier notifier) {
        this.tax = tax; this.repo = repo; this.renderer = renderer; this.notifier = notifier;
    }

    double placeOrder(String item, double price, String email) {
        double total = price + tax.on(price);
        repo.save(item, total);
        notifier.send(email, renderer.render(item, total));
        return total;
    }
}

class Main {
    public static void main(String[] args) {
        OrderService svc = new OrderService(new GstTax(), new MySqlOrderRepository(),
                new PdfInvoiceRenderer(), new EmailNotifier());   // wiring happens at the edge
        System.out.println(svc.placeOrder("Book", 100, "a@b.com"));
    }
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod


class TaxPolicy(ABC):
    @abstractmethod
    def on(self, price: float) -> float: ...


class OrderRepository(ABC):
    @abstractmethod
    def save(self, item: str, total: float) -> None: ...


class InvoiceRenderer(ABC):
    @abstractmethod
    def render(self, item: str, total: float) -> str: ...


class Notifier(ABC):
    @abstractmethod
    def send(self, to: str, body: str) -> None: ...


class GstTax(TaxPolicy):
    def on(self, price: float) -> float:
        return price * 0.18


class MySqlOrderRepository(OrderRepository):
    def save(self, item: str, total: float) -> None:
        print(f"MySQL> save {item} {total}")


class PdfInvoiceRenderer(InvoiceRenderer):
    def render(self, item: str, total: float) -> str:
        return f"%PDF invoice: {item} = {total}"


class EmailNotifier(Notifier):
    def send(self, to: str, body: str) -> None:
        print(f"SMTP to {to}: {body}")


# High-level policy: knows WHAT happens, not HOW each tool works.
class OrderService:
    def __init__(self, tax: TaxPolicy, repo: OrderRepository,
                 renderer: InvoiceRenderer, notifier: Notifier) -> None:
        self._tax = tax
        self._repo = repo
        self._renderer = renderer
        self._notifier = notifier

    def place_order(self, item: str, price: float, email: str) -> float:
        total = price + self._tax.on(price)
        self._repo.save(item, total)
        self._notifier.send(email, self._renderer.render(item, total))
        return total


if __name__ == "__main__":
    svc = OrderService(GstTax(), MySqlOrderRepository(),
                       PdfInvoiceRenderer(), EmailNotifier())  # wiring happens at the edge
    print(svc.place_order("Book", 100, "a@b.com"))` },
          { lang: 'ts', code: `interface TaxPolicy { on(price: number): number; }
interface OrderRepository { save(item: string, total: number): void; }
interface InvoiceRenderer { render(item: string, total: number): string; }
interface Notifier { send(to: string, body: string): void; }

class GstTax implements TaxPolicy {
  on(price: number): number { return price * 0.18; }
}
class MySqlOrderRepository implements OrderRepository {
  save(item: string, total: number): void { console.log(\`MySQL> save \${item} \${total}\`); }
}
class PdfInvoiceRenderer implements InvoiceRenderer {
  render(item: string, total: number): string { return \`%PDF invoice: \${item} = \${total}\`; }
}
class EmailNotifier implements Notifier {
  send(to: string, body: string): void { console.log(\`SMTP to \${to}: \${body}\`); }
}

// High-level policy: knows WHAT happens, not HOW each tool works.
class OrderService {
  constructor(
    private readonly tax: TaxPolicy,
    private readonly repo: OrderRepository,
    private readonly renderer: InvoiceRenderer,
    private readonly notifier: Notifier,
  ) {}

  placeOrder(item: string, price: number, email: string): number {
    const total = price + this.tax.on(price);
    this.repo.save(item, total);
    this.notifier.send(email, this.renderer.render(item, total));
    return total;
  }
}

const svc = new OrderService(new GstTax(), new MySqlOrderRepository(),
  new PdfInvoiceRenderer(), new EmailNotifier()); // wiring happens at the edge
console.log(svc.placeOrder("Book", 100, "a@b.com"));` },
          { lang: 'cpp', code: `class TaxPolicy {
public:
    virtual ~TaxPolicy() = default;
    virtual double on(double price) const = 0;
};
class OrderRepository {
public:
    virtual ~OrderRepository() = default;
    virtual void save(const string& item, double total) = 0;
};
class InvoiceRenderer {
public:
    virtual ~InvoiceRenderer() = default;
    virtual string render(const string& item, double total) const = 0;
};
class Notifier {
public:
    virtual ~Notifier() = default;
    virtual void send(const string& to, const string& body) = 0;
};

class GstTax : public TaxPolicy {
public:
    double on(double p) const override { return p * 0.18; }
};
class MySqlOrderRepository : public OrderRepository {
public:
    void save(const string& item, double total) override { cout << "MySQL> save " << item << " " << total << "\\n"; }
};
class PdfInvoiceRenderer : public InvoiceRenderer {
public:
    string render(const string& item, double total) const override {
        ostringstream out;
        out << "%PDF invoice: " << item << " = " << total;
        return out.str();
    }
};
class EmailNotifier : public Notifier {
public:
    void send(const string& to, const string& body) override { cout << "SMTP to " << to << ": " << body << "\\n"; }
};

// High-level policy: knows WHAT happens, not HOW each tool works.
class OrderService {
    unique_ptr<TaxPolicy> tax_;
    unique_ptr<OrderRepository> repo_;
    unique_ptr<InvoiceRenderer> renderer_;
    unique_ptr<Notifier> notifier_;
public:
    OrderService(unique_ptr<TaxPolicy> tax, unique_ptr<OrderRepository> repo,
                 unique_ptr<InvoiceRenderer> renderer, unique_ptr<Notifier> notifier)
        : tax_(std::move(tax)), repo_(std::move(repo)), renderer_(std::move(renderer)), notifier_(std::move(notifier)) {}

    double placeOrder(const string& item, double price, const string& email) {
        double total = price + tax_->on(price);
        repo_->save(item, total);
        notifier_->send(email, renderer_->render(item, total));
        return total;
    }
};

int main() {
    OrderService svc(make_unique<GstTax>(), make_unique<MySqlOrderRepository>(),
                     make_unique<PdfInvoiceRenderer>(), make_unique<EmailNotifier>());   // wiring happens at the edge
    cout << svc.placeOrder("Book", 100, "a@b.com") << "\\n";
}` },
  { lang: 'csharp', code: `
using System;

interface ITaxPolicy { double On(double price); }
interface IOrderRepository { void Save(string item, double total); }
interface IInvoiceRenderer { string Render(string item, double total); }
interface INotifier { void Send(string to, string body); }

class GstTax : ITaxPolicy { public double On(double p) { return p * 0.18; } }
class MySqlOrderRepository : IOrderRepository {
    public void Save(string item, double total) { Console.WriteLine("MySQL> save " + item + " " + total); }
}
class PdfInvoiceRenderer : IInvoiceRenderer {
    public string Render(string item, double total) { return "%PDF invoice: " + item + " = " + total; }
}
class EmailNotifier : INotifier {
    public void Send(string to, string body) { Console.WriteLine("SMTP to " + to + ": " + body); }
}

// High-level policy: knows WHAT happens, not HOW each tool works.
class OrderService {
    private readonly ITaxPolicy tax;
    private readonly IOrderRepository repo;
    private readonly IInvoiceRenderer renderer;
    private readonly INotifier notifier;

    public OrderService(ITaxPolicy tax, IOrderRepository repo, IInvoiceRenderer renderer, INotifier notifier) {
        this.tax = tax; this.repo = repo; this.renderer = renderer; this.notifier = notifier;
    }

    public double PlaceOrder(string item, double price, string email) {
        double total = price + tax.On(price);
        repo.Save(item, total);
        notifier.Send(email, renderer.Render(item, total));
        return total;
    }
}

class Program {
    static void Main() {
        OrderService svc = new OrderService(new GstTax(), new MySqlOrderRepository(),
                new PdfInvoiceRenderer(), new EmailNotifier());   // wiring happens at the edge
        Console.WriteLine(svc.PlaceOrder("Book", 100, "a@b.com"));
    }
}` }
        ] }],
    codeTitle: ['Bad: God class', 'Good: SOLID split'],
    viz: [{
      title: 'Ripple of one change: tangled design vs SOLID design',
      input: 'db',
      inputLabel: 'Which change arrives? db | tax | pdf | email',
      gen: function (input) {
        var which = pick(input, { db: 1, tax: 1, pdf: 1, email: 1 }, 'Type one of: db, tax, pdf, email');
        var bn = [B('UI', 'CheckoutPage', 15, 8), B('REP', 'ReportScreen', 50, 8), B('MOB', 'MobileApp', 85, 8),
          B('OM', 'OrderManager', 50, 30), B('SQL', 'MySQL', 15, 52), B('PDF', 'PdfLib', 50, 52), B('SMTP', 'SMTP', 85, 52)];
        var be = [['UI', 'OM'], ['REP', 'OM'], ['MOB', 'OM'], ['OM', 'SQL'], ['OM', 'PDF'], ['OM', 'SMTP'], ['REP', 'SQL']];
        var an = [B('UI', 'CheckoutPage', 50, 6), B('OS', 'OrderService', 50, 22),
          B('IR', '«OrderRepo»', 12, 40), B('IT', '«TaxPolicy»', 37, 40), B('IV', '«Renderer»', 63, 40), B('IN', '«Notifier»', 88, 40),
          B('MY', 'MySqlRepo', 12, 60), B('GST', 'GstTax', 37, 60), B('PR', 'PdfRenderer', 63, 60), B('EM', 'EmailNotifier', 88, 60)];
        var ae = [['UI', 'OS'], ['OS', 'IR'], ['OS', 'IT'], ['OS', 'IV'], ['OS', 'IN'], ['MY', 'IR'], ['GST', 'IT'], ['PR', 'IV'], ['EM', 'IN']];
        var bStart = { db: 'SQL', tax: 'OM', pdf: 'PDF', email: 'SMTP' }[which];
        var aStart = { db: 'MY', tax: 'GST', pdf: 'PR', email: 'EM' }[which];
        var why = { db: 'the team migrates from MySQL to PostgreSQL.', tax: 'the government changes GST from 18% to 12% for books.', pdf: 'marketing wants a new invoice layout.', email: 'ops moves from SMTP to an email API provider.' }[which];
        var frames = [F('<b>Before:</b> a typical "it works" design. Three screens call one God class <b>OrderManager</b>, which talks to MySQL, a PDF library and SMTP directly. ReportScreen even reads MySQL tables itself. Red arrows = risky concrete dependencies.',
          [G('Tangled design (before)', bn, be, { ehl: paint(be, 'bad'), hl: { OM: 'bad' }, tags: { OM: 'God class' } })])];
        frames = frames.concat(ripple('Tangled design (before)', bn, be, bStart, why, 'bad'));
        frames.push(F('<b>After:</b> the same features with SOLID. OrderService only knows four small interfaces (purple «…» boxes). Concrete tools <i>implement</i> those interfaces, so arrows point <b>up</b> into abstractions — that is Dependency Inversion.',
          [G('SOLID design (after)', an, ae, { ehl: paint(ae, 'ok'), h: 68, hl: { IR: 'sel', IT: 'sel', IV: 'sel', IN: 'sel' } })]));
        frames = frames.concat(ripple('SOLID design (after)', an, ae, aStart, why, 'ok', 68));
        frames.push(F('Same change, two designs. In the tangled one the change flowed <b>upward through the God class into every screen</b>. In the SOLID one nobody depends on the concrete class, so the ripple stops immediately. That is the whole point of SOLID: <b>shrink the blast radius of change</b>.',
          [TXT('<b>Try other inputs:</b> <code>tax</code>, <code>pdf</code>, <code>email</code>. In the tangled design, a tax change hits the God class, which every screen depends on. In the SOLID design it touches only <code>GstTax</code>.')]));
        return frames;
      }
    }, {
      title: 'Code walk: spotting four reasons to change in one method',
      gen: function () {
        return refactorFrames('OrderManager', [
          { narr: 'Here is the God class. It compiles, it works, tests pass. So what is wrong? Let us ask: <b>who could ask us to change this method?</b>', code: T1_GOD, hl: { 2: 'cur' } },
          { narr: '<span class="c-r">Reason 1 — finance.</span> The tax rate and formula live here. A new tax law means editing this method.', code: T1_GOD, hl: { 3: 'bad', 4: 'bad' } },
          { narr: '<span class="c-r">Reason 2 — the DBA.</span> Raw SQL text, built by string concatenation (also an SQL-injection risk!). A schema change means editing this method.', code: T1_GOD, hl: { 5: 'bad', 6: 'bad', 7: 'bad' } },
          { narr: '<span class="c-r">Reason 3 — the design team.</span> The invoice format is hard-coded. A new layout means editing this method.', code: T1_GOD, hl: { 8: 'bad' } },
          { narr: '<span class="c-r">Reason 4 — operations.</span> Email delivery details are here too. Four bosses, one method: a classic <b>Single Responsibility</b> violation that also blocks testing (<b>Dependency Inversion</b>).', code: T1_GOD, hl: { 9: 'bad', 10: 'bad' } },
          { narr: '<span class="c-g">Refactored.</span> Each reason to change moved to its own class behind an interface. OrderService keeps only the <b>business story</b>: price + tax, save, render, notify.', code: T1_CLEAN, hl: { 2: 'ok', 3: 'ok', 4: 'ok', 5: 'ok', 11: 'ok', 12: 'ok', 13: 'ok' } },
          { narr: 'The constructor receives its helpers instead of creating them (<b>dependency injection</b>). In a unit test we pass fakes — no MySQL, no SMTP, test runs in milliseconds.', code: T1_CLEAN, hl: { 6: 'cur', 7: 'cur', 8: 'cur' } }
        ]);
      }
    }],
    examples: [
      { title: 'Rigidity in real life: "just add Euro support"', html: `<p>A shop stored prices as <code>double rupees</code> and formatted them with <code>"₹" + amount</code> in 23 places. Adding Euro meant editing 23 files and re-testing checkout, invoices, reports and emails. ${H.c('r', 'Rigid')}: one small business request → huge diff. ${H.c('g', 'Fix')}: a single <code>Money</code> value object plus a <code>PriceFormatter</code> — one place to change (SRP), new currencies added without editing old code (OCP).</p>` },
      { title: 'Fragility: fixed the PDF, broke the email', html: `<p>Invoice PDF generation and email sending shared one private helper <code>buildBody()</code>. A developer changed it to produce A4 PDF layout; the email body now contained PDF markup. Two features that serve different people were coupled through shared code. ${H.c('g', 'SRP fix')}: <code>InvoiceRenderer</code> and <code>EmailComposer</code> each own their formatting, so changing one can never break the other.</p>` },
      { title: 'Immobility: cannot reuse the discount logic in the mobile backend', html: `<p>The discount rules lived inside a servlet that read <code>HttpServletRequest</code> and opened a JDBC connection. The new mobile API wanted the same rules but could not use them without dragging the web layer and MySQL along. ${H.c('g', 'DIP fix')}: a pure <code>DiscountPolicy</code> class with inputs and outputs only (no web, no DB) — reusable anywhere and testable with any unit-test framework (JUnit, pytest, Jest, GoogleTest).</p>`, code: { lang: 'java', code: `interface DiscountPolicy { double discountFor(double cartTotal, int loyaltyYears); }
class LoyaltyDiscount implements DiscountPolicy {
    public double discountFor(double cartTotal, int loyaltyYears) {
        return cartTotal * Math.min(0.10, loyaltyYears * 0.02);   // 2% per year, max 10%
    }
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod


class DiscountPolicy(ABC):
    @abstractmethod
    def discount_for(self, cart_total: float, loyalty_years: int) -> float: ...


class LoyaltyDiscount(DiscountPolicy):
    def discount_for(self, cart_total: float, loyalty_years: int) -> float:
        return cart_total * min(0.10, loyalty_years * 0.02)  # 2% per year, max 10%` },
          { lang: 'ts', code: `interface DiscountPolicy { discountFor(cartTotal: number, loyaltyYears: number): number; }

class LoyaltyDiscount implements DiscountPolicy {
  discountFor(cartTotal: number, loyaltyYears: number): number {
    return cartTotal * Math.min(0.10, loyaltyYears * 0.02); // 2% per year, max 10%
  }
}` },
          { lang: 'cpp', code: `class DiscountPolicy {
public:
    virtual ~DiscountPolicy() = default;
    virtual double discountFor(double cartTotal, int loyaltyYears) const = 0;
};

class LoyaltyDiscount : public DiscountPolicy {
public:
    double discountFor(double cartTotal, int loyaltyYears) const override {
        return cartTotal * min(0.10, loyaltyYears * 0.02);   // 2% per year, max 10%
    }
};` },
  { lang: 'csharp', code: `
using System;

interface IDiscountPolicy { double DiscountFor(double cartTotal, int loyaltyYears); }
class LoyaltyDiscount : IDiscountPolicy {
    public double DiscountFor(double cartTotal, int loyaltyYears) {
        return cartTotal * Math.Min(0.10, loyaltyYears * 0.02);   // 2% per year, max 10%
    }
}` }
        ] } }
    ],
    deepDive: `<p><b>Where SOLID came from.</b> The ideas are older than the acronym: Bertrand Meyer described Open/Closed in 1988 (<i>Object-Oriented Software Construction</i>), Barbara Liskov gave the substitution keynote in 1987 (formalised with Jeannette Wing in 1994), and Robert C. Martin wrote "Design Principles and Design Patterns" (2000). Michael Feathers coined S-O-L-I-D around 2004. Martin's later book <i>Clean Architecture</i> (2017) re-frames SRP around <b>actors</b> (the people or groups who request changes).</p>
<p><b>Why "dependency direction" is the real story.</b> Every arrow in a class diagram is a path along which change can travel. The <b>Stable Dependencies Principle</b> says: depend in the direction of stability. Interfaces that rarely change are stable; MySQL drivers, PDF libraries and HTTP clients change often. If your core business rules point at volatile details, every vendor update ripples into the core. SOLID — especially OCP and DIP — flips those arrows so volatile details depend on stable policies.</p>
<p><b>Measuring it (production reality).</b> Tools compute <i>afferent coupling</i> Ca (who depends on me), <i>efferent coupling</i> Ce (whom I depend on) and <i>instability</i> I = Ce / (Ca + Ce). Example: OrderManager above has Ca = 3 (three screens) and Ce = 3 (MySQL, PDF, SMTP), so I = 3/6 = 0.5 — half-stable, half-volatile: the worst place for business rules. Code review tools (SonarQube, architecture tests such as ArchUnit, import-linter or dependency-cruiser) can fail a build when, say, <code>domain</code> packages import a database driver (<code>java.sql</code>, <code>sqlite3</code>, <code>pg</code>). Teams also track "change coupling" from git history: files that always change together but live far apart reveal hidden SRP violations.</p>
<p><b>SOLID is not free.</b> Every interface is another file to read and another indirection to follow. Apply a principle where change is <b>likely or already happening</b> (the "rule of three": refactor when you see the third variation). Over-applying SOLID creates "interface for everything" designs with one implementation each — the needless-complexity smell. Good engineers can argue both sides in an interview.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI coding assistants generate working code fast — and they happily produce God classes, giant <code>switch</code> statements and <code>new MySqlClient()</code> inside business logic because that is the shortest path to "it runs". The cost of <i>writing</i> code dropped; the cost of <i>changing</i> badly structured code did not. SOLID matters more, because you now review far more code than you type.</p>
<p><b>Use AI as a partner:</b> ask it <code>List every reason this class might need to change and who would request each change</code>, or <code>Draw the dependency graph of these classes as a table: class → depends on</code>. Ask for a refactor <i>in small, test-preserving steps</i> rather than one big rewrite. Also ask it to <b>argue against</b> a refactor: <code>Is extracting an interface here over-engineering?</code></p>
<p><b>Where AI goes wrong:</b> it adds interfaces with a single implementation everywhere, invents abstract factories nobody needs, and sometimes "fixes" an LSP problem by adding <code>instanceof</code> checks. It cannot know which axis of change is real in your business. <b>What you must still own:</b> knowing who the actors are, which changes are likely, and where the seams should go — that is design judgement, and it is exactly what LLD interviews test.</p>`
  });

  /* ======================= TOPIC 2: SRP ======================= */
  var T2_BAD = `class Employee {
  String name; double rate; int hours;
  // Accounting (CFO) owns this
  double calculatePay() {
    return regularHours() * rate;
  }
  // HR (COO) owns this
  String reportHours() {
    return name + ": " + regularHours() + "h";
  }
  // DBA (CTO) owns this
  void save() {
    System.out.println("UPDATE emp ...");
  }
  // shared helper: whose rule is it?
  int regularHours() {
    return Math.min(hours, 40);
  }
}`;
  var T2_GOOD = `record EmployeeData(String name,
                    double rate, int hours) {}

class PayCalculator {          // Accounting
  double pay(EmployeeData e) {
    return Math.min(e.hours(), 40) * e.rate();
  }
}
class HourReporter {           // HR
  String report(EmployeeData e) {
    return e.name() + ": " + e.hours() + "h";
  }
}
class EmployeeRepository {     // DBA
  void save(EmployeeData e) {
    System.out.println("UPDATE emp ...");
  }
}`;

  topics.push({
    title: 'S — Single Responsibility Principle (SRP)',
    analogy: `<p>A Swiss Army knife is handy on a picnic, but a restaurant kitchen never uses one: if the blade gets blunt, you send the <i>whole</i> knife — scissors, bottle-opener and all — for repair, and nobody can open a bottle that day. Kitchens use a <b>separate chef's knife, scissors and opener</b>. Each tool has <b>one job and one reason to be sent for repair</b>. SRP asks your classes to be kitchen tools, not Swiss Army knives.</p>`,
    explain: `<p><b>Official wording:</b> "A class should have <b>one, and only one, reason to change</b>." Uncle Bob later sharpened it: "A module should be responsible to <b>one, and only one, actor</b>." An <b>actor</b> is a person or group who can ask for a change — Finance, HR, the DBA, the marketing team, a regulator.</p>
<p><b>It does NOT mean "a class should do one tiny thing" or "have one method".</b> A <code>ShoppingCart</code> with <code>add</code>, <code>remove</code>, <code>total</code> and <code>itemCount</code> is perfectly SRP: all four change for the same reason (cart rules). The test is: <b>who would ask me to change this, and are they the same person?</b></p>
<p><b>The classic bad design</b> (from Clean Architecture): an <code>Employee</code> class with</p>
${H.table(['Method', 'Who asks for changes', 'Why it is dangerous here'], [
  ['<code>calculatePay()</code>', 'Accounting / CFO', 'Uses shared <code>regularHours()</code>'],
  ['<code>reportHours()</code>', 'HR / COO', 'Also uses <code>regularHours()</code>'],
  ['<code>save()</code>', 'DBA / CTO', 'Schema changes recompile payroll code'],
  ['<code>regularHours()</code>', H.c('r', 'both Accounting and HR'), 'HR tweaks it → payroll silently changes!']
])}
<p>HR asks: "count training hours differently in reports". A developer edits <code>regularHours()</code>, HR is happy, tests for the report pass… and next month <b>everybody is paid wrongly</b>, because payroll used the same helper. That is <b>fragility</b> caused by mixing two actors in one class.</p>
<p><b>The smell checklist:</b></p>
<ul>
<li>You describe the class with "<b>and</b>": "it validates <i>and</i> saves <i>and</i> emails".</li>
<li>Its imports span unrelated worlds: <code>java.sql</code> + mail + PDF + HTTP.</li>
<li>Different teams keep getting <b>merge conflicts</b> in the same file.</li>
<li>A unit test of one behaviour needs a database, a mail server and a clock.</li>
</ul>
<p><b>The refactor:</b> split by actor. Keep shared <b>data</b> in a plain object (a Java <code>record</code>, a Python frozen <code>@dataclass</code>, a TypeScript <code>interface</code>, a C++ <code>struct</code>), and give each actor its own class: <code>PayCalculator</code>, <code>HourReporter</code>, <code>EmployeeRepository</code>. If callers want one entry point, add a thin <b>Facade</b> that only delegates.</p>`,
    clues: [
      'Class names ending in <code>Manager</code>, <code>Handler</code>, <code>Processor</code>, <code>Utils</code> with 500+ lines → probable SRP violation.',
      'The requirement mentions <b>different stakeholders</b>: "finance wants…", "support team wants…", "compliance needs…" → separate classes per actor.',
      '"Generate a report and email it and save it" → three responsibilities: build, deliver, persist.',
      '"Why are two teams always editing the same file?" → mixed actors (Conway\'s law in code).',
      '"How would you test the validation logic alone?" → if you cannot without a DB, validation is tangled with persistence.',
      'One class imports <code>java.sql.*</code> AND an HTTP/mail client AND does math → split.'
    ],
    code: [{ lang: 'java', title: 'Before: Employee serves three actors', code: `class Employee {
    String name; double hourlyRate; int hoursThisWeek;

    Employee(String name, double hourlyRate, int hoursThisWeek) {
        this.name = name; this.hourlyRate = hourlyRate; this.hoursThisWeek = hoursThisWeek;
    }

    double calculatePay() { return regularHours() * hourlyRate; }          // Accounting
    String reportHours()  { return name + " worked " + regularHours() + "h"; } // HR
    void save()           { System.out.println("UPDATE employee SET ... WHERE name='" + name + "'"); } // DBA

    // Shared helper. HR changes it for reports -> payroll silently changes too!
    int regularHours() { return Math.min(hoursThisWeek, 40); }
}`, alt: [
          { lang: 'python', code: `class Employee:
    def __init__(self, name: str, hourly_rate: float, hours_this_week: int) -> None:
        self.name = name
        self.hourly_rate = hourly_rate
        self.hours_this_week = hours_this_week

    def calculate_pay(self) -> float:  # Accounting
        return self.regular_hours() * self.hourly_rate

    def report_hours(self) -> str:  # HR
        return f"{self.name} worked {self.regular_hours()}h"

    def save(self) -> None:  # DBA
        print(f"UPDATE employee SET ... WHERE name='{self.name}'")

    # Shared helper. HR changes it for reports -> payroll silently changes too!
    def regular_hours(self) -> int:
        return min(self.hours_this_week, 40)` },
          { lang: 'ts', code: `class Employee {
  constructor(
    public name: string,
    public hourlyRate: number,
    public hoursThisWeek: number,
  ) {}

  calculatePay(): number { return this.regularHours() * this.hourlyRate; } // Accounting
  reportHours(): string { return \`\${this.name} worked \${this.regularHours()}h\`; } // HR
  save(): void { console.log(\`UPDATE employee SET ... WHERE name='\${this.name}'\`); } // DBA

  // Shared helper. HR changes it for reports -> payroll silently changes too!
  regularHours(): number { return Math.min(this.hoursThisWeek, 40); }
}` },
          { lang: 'cpp', code: `class Employee {
public:
    string name;
    double hourlyRate;
    int hoursThisWeek;

    Employee(string name, double hourlyRate, int hoursThisWeek)
        : name(std::move(name)), hourlyRate(hourlyRate), hoursThisWeek(hoursThisWeek) {}

    double calculatePay() const { return regularHours() * hourlyRate; }                    // Accounting
    string reportHours() const { return name + " worked " + to_string(regularHours()) + "h"; }   // HR
    void save() const { cout << "UPDATE employee SET ... WHERE name='" << name << "'\\n"; }       // DBA

    // Shared helper. HR changes it for reports -> payroll silently changes too!
    int regularHours() const { return min(hoursThisWeek, 40); }
};` },
  { lang: 'csharp', code: `
using System;

class Employee {
    public string Name; public double HourlyRate; public int HoursThisWeek;

    public Employee(string name, double hourlyRate, int hoursThisWeek) {
        Name = name; HourlyRate = hourlyRate; HoursThisWeek = hoursThisWeek;
    }

    public double CalculatePay() { return RegularHours() * HourlyRate; }           // Accounting
    public string ReportHours() { return Name + " worked " + RegularHours() + "h"; } // HR
    public void Save() { Console.WriteLine("UPDATE employee SET ... WHERE name='" + Name + "'"); } // DBA

    // Shared helper. HR changes it for reports -> payroll silently changes too!
    int RegularHours() { return Math.Min(HoursThisWeek, 40); }
}` }
        ] }, { lang: 'java', title: 'After: one class per actor, shared data in a record, optional facade', code: `record EmployeeData(String name, double hourlyRate, int hoursThisWeek) {}

// Accounting owns this. Its own notion of "regular hours".
class PayCalculator {
    private static final int REGULAR_LIMIT = 40;
    double weeklyPay(EmployeeData e) {
        int regular = Math.min(e.hoursThisWeek(), REGULAR_LIMIT);
        int overtime = Math.max(0, e.hoursThisWeek() - REGULAR_LIMIT);
        return regular * e.hourlyRate() + overtime * e.hourlyRate() * 1.5;
    }
}

// HR owns this. Can change freely without touching pay.
class HourReporter {
    String report(EmployeeData e) { return e.name() + " worked " + e.hoursThisWeek() + "h this week"; }
}

// DBA owns this.
class EmployeeRepository {
    private final Map<String, EmployeeData> table = new HashMap<>();
    void save(EmployeeData e) { table.put(e.name(), e); }
    Optional<EmployeeData> find(String name) { return Optional.ofNullable(table.get(name)); }
}

// Facade: one convenient entry point, zero business logic of its own.
class EmployeeFacade {
    private final PayCalculator pay = new PayCalculator();
    private final HourReporter reporter = new HourReporter();
    private final EmployeeRepository repo = new EmployeeRepository();

    double pay(EmployeeData e)    { return pay.weeklyPay(e); }
    String report(EmployeeData e) { return reporter.report(e); }
    void save(EmployeeData e)     { repo.save(e); }
}

class Demo {
    public static void main(String[] args) {
        EmployeeData asha = new EmployeeData("Asha", 20.0, 45);
        EmployeeFacade f = new EmployeeFacade();
        System.out.println(f.pay(asha));      // 40*20 + 5*30 = 950.0
        System.out.println(f.report(asha));
        f.save(asha);
    }
}`, alt: [
          { lang: 'python', code: `from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class EmployeeData:
    name: str
    hourly_rate: float
    hours_this_week: int


# Accounting owns this. Its own notion of "regular hours".
class PayCalculator:
    REGULAR_LIMIT = 40

    def weekly_pay(self, e: EmployeeData) -> float:
        regular = min(e.hours_this_week, self.REGULAR_LIMIT)
        overtime = max(0, e.hours_this_week - self.REGULAR_LIMIT)
        return regular * e.hourly_rate + overtime * e.hourly_rate * 1.5


# HR owns this. Can change freely without touching pay.
class HourReporter:
    def report(self, e: EmployeeData) -> str:
        return f"{e.name} worked {e.hours_this_week}h this week"


# DBA owns this.
class EmployeeRepository:
    def __init__(self) -> None:
        self._table: dict[str, EmployeeData] = {}

    def save(self, e: EmployeeData) -> None:
        self._table[e.name] = e

    def find(self, name: str) -> Optional[EmployeeData]:
        return self._table.get(name)


# Facade: one convenient entry point, zero business logic of its own.
class EmployeeFacade:
    def __init__(self) -> None:
        self._pay = PayCalculator()
        self._reporter = HourReporter()
        self._repo = EmployeeRepository()

    def pay(self, e: EmployeeData) -> float:
        return self._pay.weekly_pay(e)

    def report(self, e: EmployeeData) -> str:
        return self._reporter.report(e)

    def save(self, e: EmployeeData) -> None:
        self._repo.save(e)


if __name__ == "__main__":
    asha = EmployeeData("Asha", 20.0, 45)
    f = EmployeeFacade()
    print(f.pay(asha))  # 40*20 + 5*30 = 950.0
    print(f.report(asha))
    f.save(asha)` },
          { lang: 'ts', code: `interface EmployeeData {
  readonly name: string;
  readonly hourlyRate: number;
  readonly hoursThisWeek: number;
}

// Accounting owns this. Its own notion of "regular hours".
class PayCalculator {
  private static readonly REGULAR_LIMIT = 40;
  weeklyPay(e: EmployeeData): number {
    const regular = Math.min(e.hoursThisWeek, PayCalculator.REGULAR_LIMIT);
    const overtime = Math.max(0, e.hoursThisWeek - PayCalculator.REGULAR_LIMIT);
    return regular * e.hourlyRate + overtime * e.hourlyRate * 1.5;
  }
}

// HR owns this. Can change freely without touching pay.
class HourReporter {
  report(e: EmployeeData): string { return \`\${e.name} worked \${e.hoursThisWeek}h this week\`; }
}

// DBA owns this.
class EmployeeRepository {
  private readonly table = new Map<string, EmployeeData>();
  save(e: EmployeeData): void { this.table.set(e.name, e); }
  find(name: string): EmployeeData | undefined { return this.table.get(name); }
}

// Facade: one convenient entry point, zero business logic of its own.
class EmployeeFacade {
  private readonly payCalc = new PayCalculator();
  private readonly reporter = new HourReporter();
  private readonly repo = new EmployeeRepository();

  pay(e: EmployeeData): number { return this.payCalc.weeklyPay(e); }
  report(e: EmployeeData): string { return this.reporter.report(e); }
  save(e: EmployeeData): void { this.repo.save(e); }
}

const asha: EmployeeData = { name: "Asha", hourlyRate: 20.0, hoursThisWeek: 45 };
const f = new EmployeeFacade();
console.log(f.pay(asha)); // 40*20 + 5*30 = 950
console.log(f.report(asha));
f.save(asha);` },
          { lang: 'cpp', code: `struct EmployeeData {
    string name;
    double hourlyRate;
    int hoursThisWeek;
};

// Accounting owns this. Its own notion of "regular hours".
class PayCalculator {
    static constexpr int REGULAR_LIMIT = 40;
public:
    double weeklyPay(const EmployeeData& e) const {
        int regular = min(e.hoursThisWeek, REGULAR_LIMIT);
        int overtime = max(0, e.hoursThisWeek - REGULAR_LIMIT);
        return regular * e.hourlyRate + overtime * e.hourlyRate * 1.5;
    }
};

// HR owns this. Can change freely without touching pay.
class HourReporter {
public:
    string report(const EmployeeData& e) const { return e.name + " worked " + to_string(e.hoursThisWeek) + "h this week"; }
};

// DBA owns this.
class EmployeeRepository {
    unordered_map<string, EmployeeData> table_;
public:
    void save(const EmployeeData& e) { table_[e.name] = e; }
    optional<EmployeeData> find(const string& name) const {
        auto it = table_.find(name);
        if (it == table_.end()) return nullopt;
        return it->second;
    }
};

// Facade: one convenient entry point, zero business logic of its own.
class EmployeeFacade {
    PayCalculator pay_;
    HourReporter reporter_;
    EmployeeRepository repo_;
public:
    double pay(const EmployeeData& e) const { return pay_.weeklyPay(e); }
    string report(const EmployeeData& e) const { return reporter_.report(e); }
    void save(const EmployeeData& e) { repo_.save(e); }
};

int main() {
    EmployeeData asha{"Asha", 20.0, 45};
    EmployeeFacade f;
    cout << f.pay(asha) << "\\n";   // 40*20 + 5*30 = 950
    cout << f.report(asha) << "\\n";
    f.save(asha);
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

sealed class EmployeeData {
    public readonly string Name; public readonly double HourlyRate; public readonly int HoursThisWeek;
    public EmployeeData(string name, double hourlyRate, int hoursThisWeek) { Name = name; HourlyRate = hourlyRate; HoursThisWeek = hoursThisWeek; }
}

// Accounting owns this. Its own notion of "regular hours".
class PayCalculator {
    private const int RegularLimit = 40;
    public double WeeklyPay(EmployeeData e) {
        int regular = Math.Min(e.HoursThisWeek, RegularLimit);
        int overtime = Math.Max(0, e.HoursThisWeek - RegularLimit);
        return regular * e.HourlyRate + overtime * e.HourlyRate * 1.5;
    }
}

// HR owns this. Can change freely without touching pay.
class HourReporter {
    public string Report(EmployeeData e) { return e.Name + " worked " + e.HoursThisWeek + "h this week"; }
}

// DBA owns this.
class EmployeeRepository {
    private readonly Dictionary<string, EmployeeData> table = new Dictionary<string, EmployeeData>();
    public void Save(EmployeeData e) { table[e.Name] = e; }
    public EmployeeData Find(string name) { EmployeeData e; return table.TryGetValue(name, out e) ? e : null; }
}

// Facade: one convenient entry point, zero business logic of its own.
class EmployeeFacade {
    private readonly PayCalculator pay = new PayCalculator();
    private readonly HourReporter reporter = new HourReporter();
    private readonly EmployeeRepository repo = new EmployeeRepository();

    public double Pay(EmployeeData e) { return pay.WeeklyPay(e); }
    public string Report(EmployeeData e) { return reporter.Report(e); }
    public void Save(EmployeeData e) { repo.Save(e); }
}

class Program {
    static void Main() {
        EmployeeData asha = new EmployeeData("Asha", 20.0, 45);
        EmployeeFacade f = new EmployeeFacade();
        Console.WriteLine(f.Pay(asha).ToString("0.0"));   // 40*20 + 5*30 = 950.0
        Console.WriteLine(f.Report(asha));
        f.Save(asha);
    }
}` }
        ] }],
    codeTitle: ['Bad: three actors, one class', 'Good: split by actor'],
    viz: [{
      title: 'Who gets hurt? Ripple of one actor\'s change (before vs after SRP)',
      input: 'hr',
      inputLabel: 'Who requests a change? hr | accounting | dba',
      gen: function (input) {
        var who = pick(input, { hr: 1, accounting: 1, dba: 1 }, 'Type one of: hr, accounting, dba');
        var bn = [B('ACC', 'Accounting', 15, 6), B('HR', 'HR', 50, 6), B('DBA', 'DBA', 85, 6),
          B('PAY', 'calculatePay()', 15, 26), B('REP', 'reportHours()', 50, 26), B('SAVE', 'save()', 85, 26),
          B('REG', 'regularHours()', 33, 48)];
        var be = [['ACC', 'PAY'], ['HR', 'REP'], ['DBA', 'SAVE'], ['PAY', 'REG'], ['REP', 'REG']];
        var an = [B('ACC', 'Accounting', 15, 6), B('HR', 'HR', 50, 6), B('DBA', 'DBA', 85, 6),
          B('PC', 'PayCalculator', 15, 26), B('HRP', 'HourReporter', 50, 26), B('ER', 'EmployeeRepo', 85, 26),
          B('ED', 'EmployeeData', 50, 48)];
        var ae = [['ACC', 'PC'], ['HR', 'HRP'], ['DBA', 'ER'], ['PC', 'ED'], ['HRP', 'ED'], ['ER', 'ED']];
        var bStart = { hr: 'REG', accounting: 'PAY', dba: 'SAVE' }[who];
        var aStart = { hr: 'HRP', accounting: 'PC', dba: 'ER' }[who];
        var why = { hr: 'HR wants training hours counted differently in reports. In the old class the developer edits the shared helper regularHours().', accounting: 'Accounting wants overtime paid at 1.5x.', dba: 'The DBA renames the employee table.' }[who];
        var frames = [F('<b>Before:</b> one <code>Employee</code> class, three actors pointing at its methods. Notice <b>regularHours()</b> is used by both payroll and the HR report — two bosses share one rule.',
          [G('Employee class (methods as boxes)', bn, be, { hl: { REG: 'bad' }, ehl: { 'PAY-REG': 'bad', 'REP-REG': 'bad' }, tags: { REG: 'shared by 2 actors' } })])];
        frames = frames.concat(ripple('Employee class (methods as boxes)', bn, be, bStart, why, 'bad'));
        if (who === 'hr') frames.push(F('<span class="c-r">Look at the damage:</span> HR asked for a <i>report</i> change, but the ripple reached <b>Accounting</b>. Payroll now pays the wrong amount and nobody in Accounting asked for any change. This is exactly the bug SRP prevents.',
          [G('Employee class (methods as boxes)', bn, be, { hl: { REG: 'bad', PAY: 'bad', ACC: 'bad', REP: 'cur', HR: 'cur' }, ehl: paint(be, 'bad'), tags: { ACC: 'paid wrongly!' } })]));
        frames.push(F('<b>After SRP:</b> each actor talks to its own class. They share only <b>EmployeeData</b> — a plain record of facts (name, rate, hours) with no business rules inside.',
          [G('Split by actor', an, ae, { ehl: paint(ae, 'ok'), hl: { ED: 'sel' } })]));
        frames = frames.concat(ripple('Split by actor', an, ae, aStart, why.replace(' In the old class the developer edits the shared helper regularHours().', ' Now the developer edits HourReporter only.'), 'ok'));
        return frames;
      }
    }, {
      title: 'Refactor step by step: extracting classes by actor',
      gen: function () {
        return refactorFrames('Employee refactor', [
          { narr: 'Start: the God-ish <b>Employee</b>. Step 1 of any SRP refactor: label each method with its actor (comments on lines 3, 7, 11).', code: T2_BAD, hl: { 3: 'cur', 7: 'cur', 11: 'cur' } },
          { narr: '<span class="c-r">The trap:</span> <code>regularHours()</code> is called from both the Accounting method (line 5) and the HR method (line 9). Same code, two owners — "accidental duplication" glued into one function.', code: T2_BAD, hl: { 5: 'bad', 9: 'bad', 16: 'bad', 17: 'bad' } },
          { narr: 'Step 2: pull out the pure data into a <b>record</b>. Data has no reason to change except "we track a new fact".', code: T2_GOOD, hl: { 1: 'ok', 2: 'ok' } },
          { narr: 'Step 3: <b>PayCalculator</b> gets its own copy of the 40-hour rule. Yes, a tiny bit of duplication — on purpose, because Accounting and HR may evolve the rule differently.', code: T2_GOOD, hl: { 4: 'ok', 5: 'ok', 6: 'ok' } },
          { narr: 'Step 4: <b>HourReporter</b> is now free to report raw hours, training hours, anything HR wants, without touching pay.', code: T2_GOOD, hl: { 9: 'ok', 10: 'ok', 11: 'ok' } },
          { narr: 'Step 5: persistence moves to <b>EmployeeRepository</b>. A schema change no longer forces payroll code to be recompiled and re-tested.', code: T2_GOOD, hl: { 14: 'ok', 15: 'ok', 16: 'ok' } }
        ]);
      }
    }],
    examples: [
      { title: 'One responsibility ≠ one method', html: `<p>${H.c('g', 'Fine as is:')} a <code>BankAccount</code> with <code>deposit</code>, <code>withdraw</code>, <code>balance</code> and <code>statementLines</code>. All four serve one actor (account rules). Splitting it into <code>Depositor</code>, <code>Withdrawer</code>… would scatter one concept across many files — <b>low cohesion</b>, the opposite smell. SRP is about <b>reasons to change</b>, not about counting methods.</p>` },
      { title: 'Logging frameworks get SRP right', html: `<p>Logback/Log4j separate <b>what</b> to log (Logger + level), <b>how it looks</b> (Layout/Encoder: JSON, pattern) and <b>where it goes</b> (Appender: console, file, Kafka). Ops can move logs from files to a cloud collector by changing the appender without touching any formatting code; a security team can mask fields in the layout without touching appenders.</p>`, code: { lang: 'java', code: `interface LogLayout   { String format(String level, String msg); }
interface LogAppender { void append(String line); }

class JsonLayout implements LogLayout {
    public String format(String level, String msg) {
        return "{\\"level\\":\\"" + level + "\\",\\"msg\\":\\"" + msg + "\\"}";
    }
}
class ConsoleAppender implements LogAppender { public void append(String line) { System.out.println(line); } }

class SimpleLogger {
    private final LogLayout layout; private final LogAppender appender;
    SimpleLogger(LogLayout layout, LogAppender appender) { this.layout = layout; this.appender = appender; }
    void info(String msg) { appender.append(layout.format("INFO", msg)); }
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod


class LogLayout(ABC):
    @abstractmethod
    def format(self, level: str, msg: str) -> str: ...


class LogAppender(ABC):
    @abstractmethod
    def append(self, line: str) -> None: ...


class JsonLayout(LogLayout):
    def format(self, level: str, msg: str) -> str:
        return f'{{"level":"{level}","msg":"{msg}"}}'


class ConsoleAppender(LogAppender):
    def append(self, line: str) -> None:
        print(line)


class SimpleLogger:
    def __init__(self, layout: LogLayout, appender: LogAppender) -> None:
        self._layout = layout
        self._appender = appender

    def info(self, msg: str) -> None:
        self._appender.append(self._layout.format("INFO", msg))` },
          { lang: 'ts', code: `interface LogLayout { format(level: string, msg: string): string; }
interface LogAppender { append(line: string): void; }

class JsonLayout implements LogLayout {
  format(level: string, msg: string): string {
    return \`{"level":"\${level}","msg":"\${msg}"}\`;
  }
}
class ConsoleAppender implements LogAppender {
  append(line: string): void { console.log(line); }
}

class SimpleLogger {
  constructor(private readonly layout: LogLayout, private readonly appender: LogAppender) {}
  info(msg: string): void { this.appender.append(this.layout.format("INFO", msg)); }
}` },
          { lang: 'cpp', code: `class LogLayout {
public:
    virtual ~LogLayout() = default;
    virtual string format(const string& level, const string& msg) const = 0;
};
class LogAppender {
public:
    virtual ~LogAppender() = default;
    virtual void append(const string& line) = 0;
};

class JsonLayout : public LogLayout {
public:
    string format(const string& level, const string& msg) const override {
        return "{\\"level\\":\\"" + level + "\\",\\"msg\\":\\"" + msg + "\\"}";
    }
};
class ConsoleAppender : public LogAppender {
public:
    void append(const string& line) override { cout << line << "\\n"; }
};

class SimpleLogger {
    const LogLayout& layout_;
    LogAppender& appender_;
public:
    SimpleLogger(const LogLayout& layout, LogAppender& appender) : layout_(layout), appender_(appender) {}
    void info(const string& msg) { appender_.append(layout_.format("INFO", msg)); }
};` },
  { lang: 'csharp', code: `
using System;

interface ILogLayout { string Format(string level, string msg); }
interface ILogAppender { void Append(string line); }

class JsonLayout : ILogLayout {
    public string Format(string level, string msg) {
        return "{\\"level\\":\\"" + level + "\\",\\"msg\\":\\"" + msg + "\\"}";
    }
}
class ConsoleAppender : ILogAppender { public void Append(string line) { Console.WriteLine(line); } }

class SimpleLogger {
    private readonly ILogLayout layout; private readonly ILogAppender appender;
    public SimpleLogger(ILogLayout layout, ILogAppender appender) { this.layout = layout; this.appender = appender; }
    public void Info(string msg) { appender.Append(layout.Format("INFO", msg)); }
}` }
        ] } },
      { title: 'A report job with four actors', html: `<p>"Every night, fetch sales from the DB, compute totals per region, render an Excel file and email it to managers." Four reasons to change: data source (DBA), the maths (finance), the file format (managers' preferences), delivery (IT). ${H.table(['Class', 'Actor'], [['<code>SalesQuery</code>', 'DBA'], ['<code>RegionTotals</code>', 'Finance'], ['<code>ExcelReportWriter</code>', 'Managers'], ['<code>ReportMailer</code>', 'IT'], ['<code>NightlyReportJob</code> (orchestrates)', 'nobody — only wires steps']])} The orchestrator reads like a story: fetch → compute → render → send.</p>` },
      { title: 'Accidental vs real duplication', html: `<p>After the split, PayCalculator and HourReporter both mention "40 hours". Is that a DRY violation? <b>No</b> — it is <i>accidental</i> duplication: the numbers match today but belong to different actors and may diverge tomorrow. Real duplication is the same knowledge with the same owner (e.g. the GST rate typed in five places). Merge real duplication; keep accidental duplication separate.</p>` }
    ],
    deepDive: `<p><b>Cohesion, measured.</b> LCOM (Lack of Cohesion of Methods) counts method pairs that share no fields. In the bad Employee, <code>save()</code> touches only <code>name</code> while <code>calculatePay()</code> touches <code>rate</code> and <code>hours</code> — the class splits naturally into clusters. When IntelliJ's "Extract Class" suggests clusters, you are seeing SRP fault lines.</p>
<p><b>SRP at every level.</b> Method level: a method should do one thing at one level of abstraction. Class level: one actor. Package/module level: the Common Closure Principle — "classes that change together belong together". Service level: microservices are often split by business capability (bounded context) — SRP at architecture scale. Conway's Law says systems mirror team structure; SRP lets teams own code without stepping on each other.</p>
<p><b>Facade vs God class.</b> A facade has many methods but <b>no logic</b> — it only delegates, so it has no reason to change except "a new operation is exposed". A God class has logic for many actors. Interviewers like hearing this distinction.</p>
<p><b>Over-application.</b> Splitting <code>User</code> into <code>UserNameHolder</code> and <code>UserEmailHolder</code> serves no actor and destroys cohesion. Heuristic: split when you can <b>name two different people</b> who would request changes, or when tests need unrelated setup. Also beware of "anemic" designs where all data is in records and all behaviour in services — fine for simple CRUD, painful for rich domains (DDD prefers behaviour inside entities when it belongs to the same actor).</p>
<p><b>Production reality:</b> SRP violations show up in git: <code>git log --format= --name-only | sort | uniq -c | sort -rn</code> reveals "hot files" that every feature touches. Those hot files are where splitting pays off first.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants generate large "service" classes that do validation, persistence, HTTP calls and formatting in one file because the prompt said "build the user registration feature". They also love <code>Utils</code> classes. The faster code appears, the faster God classes grow.</p>
<p><b>Use AI as a partner:</b> paste a class and ask <code>Group these methods by the stakeholder who would request changes to them. Suggest class names per group.</code> Then ask <code>Refactor using Extract Class in 4 small steps, keeping the public API identical so existing tests still pass.</code> AI is excellent at mechanical extraction once <i>you</i> decide the seams.</p>
<p><b>Where AI goes wrong:</b> it over-splits by technical layer ("Validator, Mapper, Converter, Helper, Manager") instead of by actor, producing many tiny classes that still change together. It may also "DRY up" accidental duplication, re-creating the shared <code>regularHours()</code> trap. <b>What you must still own:</b> identifying the actors from the business, deciding what is accidental vs real duplication, and keeping the orchestration readable.</p>`,
    problems: [{
      title: 'Split the UserRegistration God class',
      level: 'Easy', tags: ['SRP', 'refactoring', 'extract class'], companies: ['Amazon', 'Flipkart', 'Swiggy'],
      statement: `<p>The class below validates input, hashes the password, saves the user and sends a welcome email — all inside <code>register()</code>. Product says: "Marketing will change the welcome email often, security will change hashing to a stronger algorithm, and we will move from an in-memory store to PostgreSQL." Refactor so each of those changes touches <b>exactly one class</b>, keeping <code>register(email, password)</code> as the public entry point.</p>`,
      constraints: `<p>Standard library only, no frameworks. Email must contain "@" and password ≥ 8 chars. Duplicate emails are rejected. Do not store raw passwords.</p>`,
      example: `<p><code>register("asha@x.com", "secret123")</code> → ${H.c('g', 'saved, welcome email sent')}. <code>register("bad", "123")</code> → ${H.c('r', 'IllegalArgumentException("invalid email")')} — validation fails before any hashing, saving or emailing happens.</p>`,
      brute: {
        why: `<p>Everything lives in one method: four actors (product rules, security, DBA, marketing) edit the same file. Changing the email template means re-testing hashing and storage; you cannot unit test validation without also "sending" email. The SHA-256 call, the map and the print statement are hard-wired — <b>rigid and fragile</b>.</p>`,
        code: { lang: 'java', code: `import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;

class UserRegistration {
    private final Map<String, String> users = new HashMap<>();

    void register(String email, String password) throws Exception {
        if (email == null || !email.contains("@")) throw new IllegalArgumentException("invalid email");
        if (password == null || password.length() < 8) throw new IllegalArgumentException("weak password");
        if (users.containsKey(email)) throw new IllegalStateException("duplicate");
        MessageDigest md = MessageDigest.getInstance("SHA-256");          // security concern
        String hash = HexFormat.of().formatHex(md.digest(password.getBytes(StandardCharsets.UTF_8)));
        users.put(email, hash);                                           // storage concern
        System.out.println("To " + email + ": Welcome aboard!");           // marketing concern
    }
}`, alt: [
                { lang: 'python', code: `
import hashlib

class UserRegistration:
    def __init__(self):
        self.users = {}

    def register(self, email, password):
        if email is None or "@" not in email: raise ValueError("invalid email")
        if password is None or len(password) < 8: raise ValueError("weak password")
        if email in self.users: raise RuntimeError("duplicate")
        h = hashlib.sha256(password.encode("utf-8")).hexdigest()   # security concern
        self.users[email] = h                                      # storage concern
        print("To " + email + ": Welcome aboard!")                 # marketing concern` },
                { lang: 'ts', code: `
import { createHash } from "crypto";

class UserRegistration {
    private users = new Map<string, string>();

    register(email: string | null, password: string | null): void {
        if (email === null || !email.includes("@")) throw new Error("invalid email");
        if (password === null || password.length < 8) throw new Error("weak password");
        if (this.users.has(email)) throw new Error("duplicate");
        const hash = createHash("sha256").update(password).digest("hex");   // security concern
        this.users.set(email, hash);                                        // storage concern
        console.log("To " + email + ": Welcome aboard!");                   // marketing concern
    }
}` },
                { lang: 'cpp', code: `
class UserRegistration {
    unordered_map<string, string> users;
public:
    void registerUser(const string& email, const string& password) {
        if (email.find('@') == string::npos) throw invalid_argument("invalid email");
        if (password.size() < 8) throw invalid_argument("weak password");
        if (users.count(email)) throw runtime_error("duplicate");
        string hash = to_string(std::hash<string>{}(password));   // security concern (real code: SHA-256)
        users[email] = hash;                                      // storage concern
        cout << "To " << email << ": Welcome aboard!\\n";          // marketing concern
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;

class UserRegistration {
    private readonly Dictionary<string, string> users = new Dictionary<string, string>();

    public void Register(string email, string password) {
        if (email == null || !email.Contains("@")) throw new ArgumentException("invalid email");
        if (password == null || password.Length < 8) throw new ArgumentException("weak password");
        if (users.ContainsKey(email)) throw new InvalidOperationException("duplicate");
        string hash;
        using (SHA256 sha = SHA256.Create())                                 // security concern
            hash = BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(password))).Replace("-", "").ToLower();
        users[email] = hash;                                                 // storage concern
        Console.WriteLine("To " + email + ": Welcome aboard!");              // marketing concern
    }
}` }
              ] }
      },
      mcq: { q: 'Marketing wants a new welcome message. In a good SRP design, how many classes change?', options: ['Exactly one (the mailer / message class)', 'The registration service and the mailer', 'All of them, because register() calls them', 'None — use a config file only'], answer: 0, explain: 'Each actor owns one class. The orchestrator only calls <code>mailer.sendWelcome(email)</code>, so the message content can change without touching it.' },
      hints: [
        `<p>List the actors first: who asks for changes to validation rules, hashing, storage and email? Each actor becomes a class.</p>`,
        `<p>Create <code>UserValidator</code>, <code>PasswordHasher</code> (interface), <code>UserRepository</code> (interface), <code>WelcomeMailer</code> (interface), and a thin <code>RegistrationService</code> that calls them in order.</p>`,
        `<p>Order matters: validate → check duplicate → hash → save → mail. Pass the collaborators through the constructor so tests can give fakes. Edge cases: null email, duplicate email, mail failure after save (log it, do not lose the user).</p>`
      ],
      tests: { io: true, cases: [{ stdin: '', stdout: "To asha@x.com: Welcome aboard!\nstored hash fcf730b6d95236ec\nrejected: invalid email\nrejected: weak password\nrejected: duplicate email\nmail failed, will retry: smtp down\nsaved despite mail failure: true\n" }] },
      solution: {
        approach: `<p><b>Split by actor, orchestrate in one thin class.</b> The validator owns input rules; the hasher owns the algorithm (swap SHA-256 for bcrypt/Argon2 by adding a class); the repository owns storage; the mailer owns wording and delivery. <code>RegistrationService.register</code> now reads like the requirement. Each future change from the statement lands in one class, and each class can be unit-tested alone with fakes. Note SHA-256 is shown only because Java, Python and Node.js ship it (C++ has no standard hash, so its tab carries a compact SHA-256) — real systems use a slow, salted hash like bcrypt or Argon2.</p>`,
        code: `import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;

class UserValidator {                                   // product rules
    void validate(String email, String password) {
        if (email == null || !email.contains("@")) throw new IllegalArgumentException("invalid email");
        if (password == null || password.length() < 8) throw new IllegalArgumentException("weak password");
    }
}

interface PasswordHasher { String hash(String raw); }  // security team
class Sha256Hasher implements PasswordHasher {
    public String hash(String raw) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) { throw new IllegalStateException(e); }
    }
}

interface UserRepository {                              // DBA
    boolean exists(String email);
    void save(String email, String passwordHash);
}
class InMemoryUserRepository implements UserRepository {
    private final Map<String, String> users = new HashMap<>();
    public boolean exists(String email) { return users.containsKey(email); }
    public void save(String email, String hash) { users.put(email, hash); }
    String hashOf(String email) { return users.get(email); }   // for the demo only
}

interface WelcomeMailer { void sendWelcome(String email); }   // marketing
class ConsoleWelcomeMailer implements WelcomeMailer {
    public void sendWelcome(String email) { System.out.println("To " + email + ": Welcome aboard!"); }
}
class FlakyMailer implements WelcomeMailer {                   // simulates a mail server outage
    public void sendWelcome(String email) { throw new IllegalStateException("smtp down"); }
}

class RegistrationService {                             // orchestration only
    private final UserValidator validator;
    private final PasswordHasher hasher;
    private final UserRepository repo;
    private final WelcomeMailer mailer;

    RegistrationService(UserValidator v, PasswordHasher h, UserRepository r, WelcomeMailer m) {
        validator = v; hasher = h; repo = r; mailer = m;
    }

    void register(String email, String password) {
        validator.validate(email, password);
        if (repo.exists(email)) throw new IllegalStateException("duplicate email");
        repo.save(email, hasher.hash(password));
        try { mailer.sendWelcome(email); }
        catch (RuntimeException e) { System.out.println("mail failed, will retry: " + e.getMessage()); }
    }

    public static void main(String[] args) {
        InMemoryUserRepository repo = new InMemoryUserRepository();
        RegistrationService s = new RegistrationService(new UserValidator(), new Sha256Hasher(),
                repo, new ConsoleWelcomeMailer());
        s.register("asha@x.com", "secret123");
        System.out.println("stored hash " + repo.hashOf("asha@x.com").substring(0, 16));
        String[][] attempts = { {"bad", "123"}, {"ravi@x.com", "short"}, {"asha@x.com", "secret123"} };
        for (String[] a : attempts) {
            try { s.register(a[0], a[1]); }
            catch (IllegalArgumentException | IllegalStateException e) { System.out.println("rejected: " + e.getMessage()); }
        }
        new RegistrationService(new UserValidator(), new Sha256Hasher(), repo, new FlakyMailer())
                .register("ravi@x.com", "longpassword");
        System.out.println("saved despite mail failure: " + repo.exists("ravi@x.com"));
    }
}`,
        alt: [
          { lang: 'python', code: `import hashlib
from abc import ABC, abstractmethod


class UserValidator:  # product rules
    def validate(self, email: str, password: str) -> None:
        if email is None or "@" not in email:
            raise ValueError("invalid email")
        if password is None or len(password) < 8:
            raise ValueError("weak password")


class PasswordHasher(ABC):  # security team
    @abstractmethod
    def hash(self, raw: str) -> str: ...


class Sha256Hasher(PasswordHasher):
    def hash(self, raw: str) -> str:
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()


class UserRepository(ABC):  # DBA
    @abstractmethod
    def exists(self, email: str) -> bool: ...

    @abstractmethod
    def save(self, email: str, password_hash: str) -> None: ...


class InMemoryUserRepository(UserRepository):
    def __init__(self) -> None:
        self._users: dict[str, str] = {}

    def exists(self, email: str) -> bool:
        return email in self._users

    def save(self, email: str, password_hash: str) -> None:
        self._users[email] = password_hash

    def hash_of(self, email: str) -> str:  # for the demo only
        return self._users[email]


class WelcomeMailer(ABC):  # marketing
    @abstractmethod
    def send_welcome(self, email: str) -> None: ...


class ConsoleWelcomeMailer(WelcomeMailer):
    def send_welcome(self, email: str) -> None:
        print(f"To {email}: Welcome aboard!")


class FlakyMailer(WelcomeMailer):  # simulates a mail server outage
    def send_welcome(self, email: str) -> None:
        raise RuntimeError("smtp down")


class RegistrationService:  # orchestration only
    def __init__(self, validator: UserValidator, hasher: PasswordHasher,
                 repo: UserRepository, mailer: WelcomeMailer) -> None:
        self._validator = validator
        self._hasher = hasher
        self._repo = repo
        self._mailer = mailer

    def register(self, email: str, password: str) -> None:
        self._validator.validate(email, password)
        if self._repo.exists(email):
            raise RuntimeError("duplicate email")
        self._repo.save(email, self._hasher.hash(password))
        try:
            self._mailer.send_welcome(email)
        except RuntimeError as e:
            print(f"mail failed, will retry: {e}")


def main() -> None:
    repo = InMemoryUserRepository()
    s = RegistrationService(UserValidator(), Sha256Hasher(), repo, ConsoleWelcomeMailer())
    s.register("asha@x.com", "secret123")
    print("stored hash", repo.hash_of("asha@x.com")[:16])
    for email, password in [("bad", "123"), ("ravi@x.com", "short"), ("asha@x.com", "secret123")]:
        try:
            s.register(email, password)
        except (ValueError, RuntimeError) as e:
            print(f"rejected: {e}")
    RegistrationService(UserValidator(), Sha256Hasher(), repo, FlakyMailer()).register("ravi@x.com", "longpassword")
    print("saved despite mail failure:", str(repo.exists("ravi@x.com")).lower())


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `import { createHash } from "node:crypto";

class UserValidator {                                   // product rules
  validate(email: string, password: string): void {
    if (!email.includes("@")) throw new Error("invalid email");
    if (password.length < 8) throw new Error("weak password");
  }
}

interface PasswordHasher { hash(raw: string): string; }   // security team
class Sha256Hasher implements PasswordHasher {
  hash(raw: string): string {
    return createHash("sha256").update(raw, "utf8").digest("hex");
  }
}

interface UserRepository {                                // DBA
  exists(email: string): boolean;
  save(email: string, passwordHash: string): void;
}
class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, string>();
  exists(email: string): boolean { return this.users.has(email); }
  save(email: string, passwordHash: string): void { this.users.set(email, passwordHash); }
  hashOf(email: string): string { return this.users.get(email) ?? ""; }   // for the demo only
}

interface WelcomeMailer { sendWelcome(email: string): void; }   // marketing
class ConsoleWelcomeMailer implements WelcomeMailer {
  sendWelcome(email: string): void { console.log(\`To \${email}: Welcome aboard!\`); }
}
class FlakyMailer implements WelcomeMailer {                    // simulates a mail server outage
  sendWelcome(_email: string): void { throw new Error("smtp down"); }
}

class RegistrationService {                                     // orchestration only
  constructor(
    private readonly validator: UserValidator,
    private readonly hasher: PasswordHasher,
    private readonly repo: UserRepository,
    private readonly mailer: WelcomeMailer,
  ) {}

  register(email: string, password: string): void {
    this.validator.validate(email, password);
    if (this.repo.exists(email)) throw new Error("duplicate email");
    this.repo.save(email, this.hasher.hash(password));
    try {
      this.mailer.sendWelcome(email);
    } catch (e) {
      console.log(\`mail failed, will retry: \${(e as Error).message}\`);
    }
  }
}

function main(): void {
  const repo = new InMemoryUserRepository();
  const s = new RegistrationService(new UserValidator(), new Sha256Hasher(), repo, new ConsoleWelcomeMailer());
  s.register("asha@x.com", "secret123");
  console.log("stored hash " + repo.hashOf("asha@x.com").slice(0, 16));
  const attempts: [string, string][] = [["bad", "123"], ["ravi@x.com", "short"], ["asha@x.com", "secret123"]];
  for (const [email, password] of attempts) {
    try {
      s.register(email, password);
    } catch (e) {
      console.log("rejected: " + (e as Error).message);
    }
  }
  new RegistrationService(new UserValidator(), new Sha256Hasher(), repo, new FlakyMailer())
    .register("ravi@x.com", "longpassword");
  console.log("saved despite mail failure: " + repo.exists("ravi@x.com"));
}
main();` },
          { lang: 'cpp', code: `// The C++ standard library has no SHA-256, so this compact version stands in for OpenSSL or libsodium.
static string sha256Hex(const string& msg) {
    static const uint32_t K[64] = {
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2};
    uint32_t h[8] = {0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19};
    string data = msg;
    const uint64_t bits = static_cast<uint64_t>(msg.size()) * 8;
    data.push_back(static_cast<char>(0x80));
    while (data.size() % 64 != 56) data.push_back('\\0');
    for (int i = 7; i >= 0; --i) data.push_back(static_cast<char>(bits >> (8 * i)));
    auto rotr = [](uint32_t x, int n) { return (x >> n) | (x << (32 - n)); };
    for (size_t off = 0; off < data.size(); off += 64) {
        uint32_t w[64];
        for (int i = 0; i < 16; ++i) {
            const auto* p = reinterpret_cast<const unsigned char*>(data.data()) + off + 4 * i;
            w[i] = (uint32_t(p[0]) << 24) | (uint32_t(p[1]) << 16) | (uint32_t(p[2]) << 8) | uint32_t(p[3]);
        }
        for (int i = 16; i < 64; ++i) {
            uint32_t s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >> 3);
            uint32_t s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >> 10);
            w[i] = w[i - 16] + s0 + w[i - 7] + s1;
        }
        uint32_t a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
        for (int i = 0; i < 64; ++i) {
            uint32_t t1 = hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i];
            uint32_t t2 = (rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c));
            hh = g; g = f; f = e; e = d + t1; d = c; c = b; b = a; a = t1 + t2;
        }
        h[0] += a; h[1] += b; h[2] += c; h[3] += d; h[4] += e; h[5] += f; h[6] += g; h[7] += hh;
    }
    ostringstream out;
    for (uint32_t v : h) out << hex << setw(8) << setfill('0') << v;
    return out.str();
}

class UserValidator {                                   // product rules
public:
    void validate(const string& email, const string& password) const {
        if (email.find('@') == string::npos) throw invalid_argument("invalid email");
        if (password.size() < 8) throw invalid_argument("weak password");
    }
};

class PasswordHasher {                                  // security team
public:
    virtual ~PasswordHasher() = default;
    virtual string hash(const string& raw) const = 0;
};
class Sha256Hasher : public PasswordHasher {
public:
    string hash(const string& raw) const override { return sha256Hex(raw); }
};

class UserRepository {                                  // DBA
public:
    virtual ~UserRepository() = default;
    virtual bool exists(const string& email) const = 0;
    virtual void save(const string& email, const string& passwordHash) = 0;
};
class InMemoryUserRepository : public UserRepository {
    unordered_map<string, string> users_;
public:
    bool exists(const string& email) const override { return users_.count(email) > 0; }
    void save(const string& email, const string& hash) override { users_[email] = hash; }
    string hashOf(const string& email) const { return users_.at(email); }   // for the demo only
};

class WelcomeMailer {                                   // marketing
public:
    virtual ~WelcomeMailer() = default;
    virtual void sendWelcome(const string& email) = 0;
};
class ConsoleWelcomeMailer : public WelcomeMailer {
public:
    void sendWelcome(const string& email) override { cout << "To " << email << ": Welcome aboard!\\n"; }
};
class FlakyMailer : public WelcomeMailer {              // simulates a mail server outage
public:
    void sendWelcome(const string&) override { throw runtime_error("smtp down"); }
};

class RegistrationService {                             // orchestration only
    UserValidator validator_;
    unique_ptr<PasswordHasher> hasher_;
    shared_ptr<UserRepository> repo_;
    unique_ptr<WelcomeMailer> mailer_;
public:
    RegistrationService(UserValidator v, unique_ptr<PasswordHasher> h,
                        shared_ptr<UserRepository> r, unique_ptr<WelcomeMailer> m)
        : validator_(v), hasher_(std::move(h)), repo_(std::move(r)), mailer_(std::move(m)) {}

    void registerUser(const string& email, const string& password) {
        validator_.validate(email, password);
        if (repo_->exists(email)) throw runtime_error("duplicate email");
        repo_->save(email, hasher_->hash(password));
        try {
            mailer_->sendWelcome(email);
        } catch (const runtime_error& e) {
            cout << "mail failed, will retry: " << e.what() << "\\n";
        }
    }
};

int main() {
    auto repo = make_shared<InMemoryUserRepository>();
    RegistrationService s(UserValidator(), make_unique<Sha256Hasher>(), repo, make_unique<ConsoleWelcomeMailer>());
    s.registerUser("asha@x.com", "secret123");
    cout << "stored hash " << repo->hashOf("asha@x.com").substr(0, 16) << "\\n";
    const vector<pair<string, string>> attempts = {{"bad", "123"}, {"ravi@x.com", "short"}, {"asha@x.com", "secret123"}};
    for (const auto& [email, password] : attempts) {
        try {
            s.registerUser(email, password);
        } catch (const exception& e) {
            cout << "rejected: " << e.what() << "\\n";
        }
    }
    RegistrationService flaky(UserValidator(), make_unique<Sha256Hasher>(), repo, make_unique<FlakyMailer>());
    flaky.registerUser("ravi@x.com", "longpassword");
    cout << "saved despite mail failure: " << boolalpha << repo->exists("ravi@x.com") << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;

class UserValidator {                                   // product rules
    public void Validate(string email, string password) {
        if (email == null || !email.Contains("@")) throw new ArgumentException("invalid email");
        if (password == null || password.Length < 8) throw new ArgumentException("weak password");
    }
}

interface IPasswordHasher { string Hash(string raw); }  // security team
class Sha256Hasher : IPasswordHasher {
    public string Hash(string raw) {
        using (SHA256 sha = SHA256.Create())
            return BitConverter.ToString(sha.ComputeHash(Encoding.UTF8.GetBytes(raw))).Replace("-", "").ToLower();
    }
}

interface IUserRepository {                             // DBA
    bool Exists(string email);
    void Save(string email, string passwordHash);
}
class InMemoryUserRepository : IUserRepository {
    private readonly Dictionary<string, string> users = new Dictionary<string, string>();
    public bool Exists(string email) { return users.ContainsKey(email); }
    public void Save(string email, string hash) { users[email] = hash; }
    public string HashOf(string email) { return users[email]; }   // for the demo only
}

interface IWelcomeMailer { void SendWelcome(string email); }   // marketing
class ConsoleWelcomeMailer : IWelcomeMailer {
    public void SendWelcome(string email) { Console.WriteLine("To " + email + ": Welcome aboard!"); }
}
class FlakyMailer : IWelcomeMailer {                            // simulates a mail server outage
    public void SendWelcome(string email) { throw new InvalidOperationException("smtp down"); }
}

class RegistrationService {                             // orchestration only
    private readonly UserValidator validator;
    private readonly IPasswordHasher hasher;
    private readonly IUserRepository repo;
    private readonly IWelcomeMailer mailer;

    public RegistrationService(UserValidator v, IPasswordHasher h, IUserRepository r, IWelcomeMailer m) {
        validator = v; hasher = h; repo = r; mailer = m;
    }

    public void Register(string email, string password) {
        validator.Validate(email, password);
        if (repo.Exists(email)) throw new InvalidOperationException("duplicate email");
        repo.Save(email, hasher.Hash(password));
        try { mailer.SendWelcome(email); }
        catch (Exception e) { Console.WriteLine("mail failed, will retry: " + e.Message); }
    }
}

class Program {
    static void Main() {
        InMemoryUserRepository repo = new InMemoryUserRepository();
        RegistrationService s = new RegistrationService(new UserValidator(), new Sha256Hasher(),
                repo, new ConsoleWelcomeMailer());
        s.Register("asha@x.com", "secret123");
        Console.WriteLine("stored hash " + repo.HashOf("asha@x.com").Substring(0, 16));
        string[][] attempts = { new[] { "bad", "123" }, new[] { "ravi@x.com", "short" }, new[] { "asha@x.com", "secret123" } };
        foreach (string[] a in attempts) {
            try { s.Register(a[0], a[1]); }
            catch (Exception e) when (e is ArgumentException || e is InvalidOperationException) { Console.WriteLine("rejected: " + e.Message); }
        }
        new RegistrationService(new UserValidator(), new Sha256Hasher(), repo, new FlakyMailer())
                .Register("ravi@x.com", "longpassword");
        Console.WriteLine("saved despite mail failure: " + repo.Exists("ravi@x.com").ToString().ToLower());
    }
}` }
        ],
        complexity: `<p>Runtime is the same as before: O(1) map operations plus O(P) hashing for password length P. The win is in <b>change cost</b>: each requirement change touches 1 class instead of 1 file shared by 4 teams, and each class is testable in isolation.</p>`,
        followUps: ['How would you send the email asynchronously so a slow mail server does not slow registration?', 'Where would you put rate limiting for registrations — and which actor owns it?', 'Swap SHA-256 for BCrypt: how many classes change?']
      }
    }]
  });

  /* ======================= TOPIC 3: OCP ======================= */
  var T3_BAD = `class DiscountCalculator {
  double discount(String type, double amt) {
    switch (type) {
      case "REGULAR":  return 0;
      case "PREMIUM":  return amt * 0.10;
      case "EMPLOYEE": return amt * 0.30;
      default: throw new IllegalArgumentException(type);
    }
  }
}`;
  var T3_GOOD = `interface DiscountPolicy {
  double discount(double amt);
}
class Premium implements DiscountPolicy {
  public double discount(double a) { return a * 0.10; }
}
class Employee implements DiscountPolicy {
  public double discount(double a) { return a * 0.30; }
}
class Checkout {
  private final Map<String, DiscountPolicy> rules;
  Checkout(Map<String, DiscountPolicy> rules) {
    this.rules = Map.copyOf(rules);
  }
  double pay(String type, double amt) {
    DiscountPolicy p = rules.getOrDefault(type, a -> 0);
    return amt - p.discount(amt);
  }
}
// adding FESTIVE = one NEW class + one map entry:
class Festive implements DiscountPolicy {
  public double discount(double a) { return a * 0.20; }
}`;

  topics.push({
    title: 'O — Open/Closed Principle (OCP)',
    analogy: `<p>Think of a <b>power strip</b>. When you buy a new phone charger you do not open the strip with a screwdriver and solder new wires — you just <b>plug it in</b>. The strip is <b>closed</b> (nobody rewires it) yet <b>open</b> (any new device with a standard plug works). Your code should have "sockets" (interfaces) so new features plug in, instead of every feature cutting open old, tested wiring.</p>`,
    explain: `<p><b>Official wording</b> (Bertrand Meyer, 1988): "Software entities should be <b>open for extension, but closed for modification</b>." In plain English: <b>when a new requirement of an expected kind arrives, you should be able to add new code instead of editing old, working code.</b></p>
<p><b>Why editing old code hurts:</b> old code is tested, deployed and trusted. Every edit risks breaking existing behaviour, forces re-testing of all cases, and creates merge conflicts when two developers add two features to the same <code>switch</code>.</p>
<p><b>The classic smell:</b> a <code>switch</code> or <code>if/else-if</code> chain on a "type" that keeps growing:</p>
${H.table(['Month', 'Business request', 'What the developer does in the bad design'], [
  ['Jan', 'Premium customers get 10%', 'adds <code>case "PREMIUM"</code>'],
  ['Mar', 'Employees get 30%', 'edits the same method again'],
  ['Oct', 'Festive sale 20%', H.c('r', 'edits again, re-tests all cases')],
  ['Nov', 'Students 15%', H.c('r', 'conflicts with a colleague\'s festive edit')]
])}
<p>And usually the <b>same switch is copy-pasted</b> in other places (discount, label on the invoice, loyalty points) — "shotgun surgery": one new type means hunting down every switch.</p>
<p><b>The refactor — "replace conditional with polymorphism":</b></p>
<ol>
<li>Create an interface for the thing that varies: <code>DiscountPolicy { double discount(double amt); }</code></li>
<li>Move each <code>case</code> body into its own class implementing that interface.</li>
<li>The caller holds a <code>DiscountPolicy</code> (or a <code>Map</code> from type to policy) and just calls it.</li>
<li>New type = <b>new class</b> + one line where objects are wired up (the "composition root"). Existing classes are untouched.</li>
</ol>
<p><b>Important honesty:</b> no code is closed against <i>every</i> change. OCP means you <b>choose the likely axis of change</b> (new discount kinds, new payment methods, new file formats) and make <i>that</i> pluggable. Patterns that deliver OCP: Strategy, Template Method, Decorator, Observer, plugins.</p>`,
    clues: [
      '"We will add more <b>types / providers / formats</b> later" → put an interface on that axis (Strategy).',
      'A growing <code>switch (type)</code> or <code>if (x instanceof A) … else if (x instanceof B)</code> chain → OCP smell.',
      '"Add a new payment method <b>without touching existing code</b>" — the interviewer literally quotes OCP.',
      '"Support plugins / third-party extensions" → open/closed via interfaces + registry/ServiceLoader.',
      'The same switch appears in 3+ places (price, label, icon) → shotgun surgery; move behaviour into polymorphic classes.',
      'Machine coding: "new vehicle type in parking lot", "new split type in Splitwise", "new piece in chess" → OCP checkpoints.'
    ],
    code: [{ lang: 'java', title: 'Before: a switch that every new discount must edit', code: `class DiscountCalculator {
    double discount(String customerType, double amount) {
        switch (customerType) {
            case "REGULAR":  return 0;
            case "PREMIUM":  return amount * 0.10;
            case "EMPLOYEE": return amount * 0.30;
            // Festive sale? Students? Bulk orders? -> edit this method again and again
            default: throw new IllegalArgumentException("Unknown type " + customerType);
        }
    }
}`, alt: [
          { lang: 'python', code: `class DiscountCalculator:
    def discount(self, customer_type: str, amount: float) -> float:
        if customer_type == "REGULAR":
            return 0
        if customer_type == "PREMIUM":
            return amount * 0.10
        if customer_type == "EMPLOYEE":
            return amount * 0.30
        # Festive sale? Students? Bulk orders? -> edit this method again and again
        raise ValueError(f"Unknown type {customer_type}")` },
          { lang: 'ts', code: `class DiscountCalculator {
  discount(customerType: string, amount: number): number {
    switch (customerType) {
      case "REGULAR": return 0;
      case "PREMIUM": return amount * 0.10;
      case "EMPLOYEE": return amount * 0.30;
      // Festive sale? Students? Bulk orders? -> edit this method again and again
      default: throw new Error(\`Unknown type \${customerType}\`);
    }
  }
}` },
          { lang: 'cpp', code: `class DiscountCalculator {
public:
    double discount(const string& customerType, double amount) const {
        if (customerType == "REGULAR") return 0;
        if (customerType == "PREMIUM") return amount * 0.10;
        if (customerType == "EMPLOYEE") return amount * 0.30;
        // Festive sale? Students? Bulk orders? -> edit this method again and again
        throw invalid_argument("Unknown type " + customerType);
    }
};` },
  { lang: 'csharp', code: `
using System;

class DiscountCalculator {
    public double Discount(string customerType, double amount) {
        switch (customerType) {
            case "REGULAR":  return 0;
            case "PREMIUM":  return amount * 0.10;
            case "EMPLOYEE": return amount * 0.30;
            // Festive sale? Students? Bulk orders? -> edit this method again and again
            default: throw new ArgumentException("Unknown type " + customerType);
        }
    }
}` }
        ] }, { lang: 'java', title: 'After: Strategy + registry — new discounts plug in', code: `interface DiscountPolicy {
    double discount(double amount);
}

class NoDiscount implements DiscountPolicy { public double discount(double a) { return 0; } }
class PremiumDiscount implements DiscountPolicy { public double discount(double a) { return a * 0.10; } }
class EmployeeDiscount implements DiscountPolicy { public double discount(double a) { return a * 0.30; } }

// Closed: this class never changes when a new discount appears.
class Checkout {
    private final Map<String, DiscountPolicy> policies;

    Checkout(Map<String, DiscountPolicy> policies) { this.policies = Map.copyOf(policies); }

    double payable(String customerType, double amount) {
        DiscountPolicy p = policies.getOrDefault(customerType, new NoDiscount());
        return amount - p.discount(amount);
    }
}

// Open: a brand-new class, written months later, no old file edited.
class FestiveDiscount implements DiscountPolicy {
    public double discount(double a) { return Math.min(a * 0.20, 500); }   // 20%, capped at 500
}

class Main {
    public static void main(String[] args) {
        Map<String, DiscountPolicy> wiring = new HashMap<>();      // composition root
        wiring.put("PREMIUM", new PremiumDiscount());
        wiring.put("EMPLOYEE", new EmployeeDiscount());
        wiring.put("FESTIVE", new FestiveDiscount());              // the only "edit": one line of wiring
        Checkout c = new Checkout(wiring);
        System.out.println(c.payable("FESTIVE", 1000));   // 800.0
        System.out.println(c.payable("REGULAR", 1000));   // 1000.0
    }
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod


class DiscountPolicy(ABC):
    @abstractmethod
    def discount(self, amount: float) -> float: ...


class NoDiscount(DiscountPolicy):
    def discount(self, amount: float) -> float:
        return 0


class PremiumDiscount(DiscountPolicy):
    def discount(self, amount: float) -> float:
        return amount * 0.10


class EmployeeDiscount(DiscountPolicy):
    def discount(self, amount: float) -> float:
        return amount * 0.30


# Closed: this class never changes when a new discount appears.
class Checkout:
    def __init__(self, policies: dict[str, DiscountPolicy]) -> None:
        self._policies = dict(policies)

    def payable(self, customer_type: str, amount: float) -> float:
        policy = self._policies.get(customer_type, NoDiscount())
        return amount - policy.discount(amount)


# Open: a brand-new class, written months later, no old file edited.
class FestiveDiscount(DiscountPolicy):
    def discount(self, amount: float) -> float:
        return min(amount * 0.20, 500)  # 20%, capped at 500


if __name__ == "__main__":
    wiring: dict[str, DiscountPolicy] = {  # composition root
        "PREMIUM": PremiumDiscount(),
        "EMPLOYEE": EmployeeDiscount(),
        "FESTIVE": FestiveDiscount(),  # the only "edit": one line of wiring
    }
    c = Checkout(wiring)
    print(c.payable("FESTIVE", 1000))  # 800.0
    print(c.payable("REGULAR", 1000.0))  # 1000.0` },
          { lang: 'ts', code: `interface DiscountPolicy {
  discount(amount: number): number;
}

class NoDiscount implements DiscountPolicy { discount(_a: number): number { return 0; } }
class PremiumDiscount implements DiscountPolicy { discount(a: number): number { return a * 0.10; } }
class EmployeeDiscount implements DiscountPolicy { discount(a: number): number { return a * 0.30; } }

// Closed: this class never changes when a new discount appears.
class Checkout {
  private readonly policies: ReadonlyMap<string, DiscountPolicy>;

  constructor(policies: Map<string, DiscountPolicy>) { this.policies = new Map(policies); }

  payable(customerType: string, amount: number): number {
    const policy = this.policies.get(customerType) ?? new NoDiscount();
    return amount - policy.discount(amount);
  }
}

// Open: a brand-new class, written months later, no old file edited.
class FestiveDiscount implements DiscountPolicy {
  discount(a: number): number { return Math.min(a * 0.20, 500); } // 20%, capped at 500
}

const wiring = new Map<string, DiscountPolicy>(); // composition root
wiring.set("PREMIUM", new PremiumDiscount());
wiring.set("EMPLOYEE", new EmployeeDiscount());
wiring.set("FESTIVE", new FestiveDiscount()); // the only "edit": one line of wiring
const c = new Checkout(wiring);
console.log(c.payable("FESTIVE", 1000)); // 800
console.log(c.payable("REGULAR", 1000)); // 1000` },
          { lang: 'cpp', code: `class DiscountPolicy {
public:
    virtual ~DiscountPolicy() = default;
    virtual double discount(double amount) const = 0;
};

class NoDiscount : public DiscountPolicy {
public:
    double discount(double) const override { return 0; }
};
class PremiumDiscount : public DiscountPolicy {
public:
    double discount(double a) const override { return a * 0.10; }
};
class EmployeeDiscount : public DiscountPolicy {
public:
    double discount(double a) const override { return a * 0.30; }
};

// Closed: this class never changes when a new discount appears.
class Checkout {
    unordered_map<string, shared_ptr<const DiscountPolicy>> policies_;
    shared_ptr<const DiscountPolicy> none_ = make_shared<NoDiscount>();
public:
    explicit Checkout(unordered_map<string, shared_ptr<const DiscountPolicy>> policies) : policies_(std::move(policies)) {}

    double payable(const string& customerType, double amount) const {
        auto it = policies_.find(customerType);
        const DiscountPolicy& p = it != policies_.end() ? *it->second : *none_;
        return amount - p.discount(amount);
    }
};

// Open: a brand-new class, written months later, no old file edited.
class FestiveDiscount : public DiscountPolicy {
public:
    double discount(double a) const override { return min(a * 0.20, 500.0); }   // 20%, capped at 500
};

int main() {
    unordered_map<string, shared_ptr<const DiscountPolicy>> wiring;   // composition root
    wiring["PREMIUM"] = make_shared<PremiumDiscount>();
    wiring["EMPLOYEE"] = make_shared<EmployeeDiscount>();
    wiring["FESTIVE"] = make_shared<FestiveDiscount>();               // the only "edit": one line of wiring
    Checkout c(std::move(wiring));
    cout << c.payable("FESTIVE", 1000) << "\\n";   // 800
    cout << c.payable("REGULAR", 1000) << "\\n";   // 1000
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

interface IDiscountPolicy {
    double Discount(double amount);
}

class NoDiscount : IDiscountPolicy { public double Discount(double a) { return 0; } }
class PremiumDiscount : IDiscountPolicy { public double Discount(double a) { return a * 0.10; } }
class EmployeeDiscount : IDiscountPolicy { public double Discount(double a) { return a * 0.30; } }

// Closed: this class never changes when a new discount appears.
class Checkout {
    private readonly Dictionary<string, IDiscountPolicy> policies;

    public Checkout(Dictionary<string, IDiscountPolicy> policies) { this.policies = new Dictionary<string, IDiscountPolicy>(policies); }

    public double Payable(string customerType, double amount) {
        IDiscountPolicy p;
        if (!policies.TryGetValue(customerType, out p)) p = new NoDiscount();
        return amount - p.Discount(amount);
    }
}

// Open: a brand-new class, written months later, no old file edited.
class FestiveDiscount : IDiscountPolicy {
    public double Discount(double a) { return Math.Min(a * 0.20, 500); }   // 20%, capped at 500
}

class Program {
    static void Main() {
        var wiring = new Dictionary<string, IDiscountPolicy>();      // composition root
        wiring["PREMIUM"] = new PremiumDiscount();
        wiring["EMPLOYEE"] = new EmployeeDiscount();
        wiring["FESTIVE"] = new FestiveDiscount();                   // the only "edit": one line of wiring
        Checkout c = new Checkout(wiring);
        Console.WriteLine(c.Payable("FESTIVE", 1000).ToString("0.0"));   // 800.0
        Console.WriteLine(c.Payable("REGULAR", 1000).ToString("0.0"));   // 1000.0
    }
}` }
        ] }],
    codeTitle: ['Bad: growing switch', 'Good: plug-in strategies'],
    viz: [{
      title: 'Add new discount types: edit-the-switch vs plug-in classes',
      input: 'FESTIVE STUDENT BULK',
      inputLabel: 'New discount types to add (1-4 words, letters only)',
      gen: function (input) {
        var names = String(input || '').trim().split(/[\s,]+/).filter(Boolean).map(function (s) { return s.toUpperCase(); });
        if (!names.length || names.length > 4 || names.some(function (n) { return !/^[A-Z]{2,10}$/.test(n); })) throw new Error('Enter 1-4 type names (2-10 letters each), e.g. FESTIVE STUDENT');
        var cases = ['REGULAR', 'PREMIUM', 'EMPLOYEE'], pct = { REGULAR: '0', PREMIUM: 'amt * 0.10', EMPLOYEE: 'amt * 0.30' };
        function swAlt(list, newIdx) {
          function amt(c) { return pct[c] || 'amt * 0.15'; }
          var py = ['class DiscountCalculator:', '    def discount(self, type, amt):', '        match type:'];
          var ts = ['class DiscountCalculator {', '  discount(type: string, amt: number): number {', '    switch (type) {'];
          var cc = ['struct DiscountCalculator {', '  double discount(const string& type, double amt) {', '    // C++ cannot switch on a string: an if-chain'];
          list.forEach(function (c) {
            py.push('            case "' + c + '": return ' + amt(c));
            ts.push('      case "' + c + '": return ' + amt(c) + ';');
            cc.push('    if (type == "' + c + '") return ' + amt(c) + ';');
          });
          py.push('            case _: raise ValueError(type)');
          ts.push('      default: throw new Error(type);', '    }', '  }', '}');
          cc.push('    throw invalid_argument(type);', '  }', '};');
          return mkAlt(py.join('\n'), ts.join('\n'), cc.join('\n'));
        }
        function sw(list, newIdx) {
          var lines = ['class DiscountCalculator {', '  double discount(String type, double amt) {', '    switch (type) {'];
          list.forEach(function (c) { lines.push('      case "' + c + '": return ' + (pct[c] || 'amt * 0.15') + ';'); });
          lines.push('      default: throw new IllegalArgumentException(type);', '    }', '  }', '}');
          var hl = {}; if (newIdx >= 0) hl[4 + newIdx] = 'bad';
          for (var i = 0; i < list.length; i++) if (i !== newIdx) hl[4 + i] = newIdx >= 0 ? 'cur' : '';
          return CODE('DiscountCalculator', lines.join('\n'), hl, swAlt(list, newIdx));
        }
        var frames = [], edits = 0, retests = 0;
        frames.push(F('<b>Before (violates OCP):</b> one class with a switch over 3 types. It is tested and in production. Now the business sends ' + names.length + ' new discount type(s): <b>' + names.join(', ') + '</b>.',
          [sw(cases, -1), G('Dependencies', [B('CO', 'Checkout', 25, 10), B('DC', 'DiscountCalculator', 70, 10)], [['CO', 'DC']], { h: 22, ehl: { 'CO-DC': 'bad' } })]));
        var list = cases.slice();
        names.forEach(function (n) {
          list.push(n); edits++; retests += list.length;
          frames.push(F('Add <b>' + n + '</b>: open the <i>existing</i> DiscountCalculator and insert a new case (red line). Because the method changed, every existing case (amber) must be re-tested: <b>' + list.length + '</b> cases this time. <span class="c-r">Old code modified.</span>',
            [sw(list, list.length - 1), { type: 'vars', label: 'cost so far (bad design)', vals: { oldFilesEdited: edits, caseRetests: retests }, hl: { oldFilesEdited: 'bad', caseRetests: 'bad' } }]));
        });
        var badEdits = edits, badRetests = retests;
        var nodes = [B('CO', 'Checkout', 50, 8), B('DP', '«DiscountPolicy»', 50, 26), B('R', 'Regular', 20, 44), B('P', 'Premium', 50, 44), B('E', 'Employee', 80, 44)];
        var edges = [['CO', 'DP'], ['R', 'DP'], ['P', 'DP'], ['E', 'DP']];
        frames.push(F('<b>After (follows OCP):</b> Checkout depends only on the <b>«DiscountPolicy»</b> interface. Each existing discount is its own small class. Let us add the same new types again.',
          [G('Plug-in design', nodes.slice(), edges.slice(), { h: 70, ehl: paint(edges, 'ok'), hl: { DP: 'sel' } })]));
        var newTests = 0;
        names.forEach(function (n, i) {
          var id = 'N' + i; nodes.push(B(id, n, 14 + i * 24, 62)); edges.push([id, 'DP']); newTests++;
          var hl = { DP: 'sel' }; hl[id] = 'ok'; var eh = paint(edges, 'ok'); eh[id + '-DP'] = 'cur';
          frames.push(F('Add <b>' + n + '</b>: write a <span class="c-g">new class</span> <code>' + n.charAt(0) + n.slice(1).toLowerCase() + 'Discount implements DiscountPolicy</code> and register it with one line of wiring. Checkout, Regular, Premium and Employee are <b>not opened</b>. Only the new class needs new tests.',
            [G('Plug-in design', nodes.slice(), edges.slice(), { h: 70, ehl: eh, hl: hl, tags: (function () { var t = {}; t[id] = 'new'; return t; })() }),
              { type: 'vars', label: 'cost so far (OCP design)', vals: { oldFilesEdited: 0, newClasses: i + 1, newTestsOnly: newTests }, hl: { oldFilesEdited: 'ok' } }]));
        });
        frames.push(F('Scoreboard. Same features, very different risk. The OCP design never re-opened tested code; each feature was isolated in its own file (easy code review, no merge conflicts, easy to switch off).',
          [{ type: 'table', label: 'Bad vs good', columns: ['Metric', 'Switch design', 'Plug-in design'], rows: [['Existing files edited', badEdits, 0], ['Existing cases re-tested', badRetests, 0], ['New classes', 0, names.length], ['Merge-conflict risk', 'high (same method)', 'low (separate files)']], hl: { 0: 'sel' } }]));
        return frames;
      }
    }, {
      title: 'Refactor: replace conditional with polymorphism',
      gen: function () {
        return refactorFrames('Refactor', [
          { narr: 'The switch on a type string. Each <code>case</code> is a little piece of behaviour hiding inside one method.', code: T3_BAD, hl: { 3: 'cur', 4: 'bad', 5: 'bad', 6: 'bad' } },
          { narr: 'Also note the <code>default</code>: an unknown type crashes at runtime. The compiler cannot help us when types are just strings.', code: T3_BAD, hl: { 7: 'bad' } },
          { narr: 'Step 1: name the thing that varies — <b>DiscountPolicy</b>, a one-method interface.', code: T3_GOOD, hl: { 1: 'ok', 2: 'ok', 3: 'ok' } },
          { narr: 'Step 2: each case body becomes a class. Premium\'s rule lives only in Premium.', code: T3_GOOD, hl: { 4: 'ok', 5: 'ok', 6: 'ok', 7: 'ok', 8: 'ok', 9: 'ok' } },
          { narr: 'Step 3: Checkout looks up a policy and calls it. It has no idea how many discounts exist. <code>getOrDefault</code> with a lambda gives "no discount" for unknown types — no crash.', code: T3_GOOD, hl: { 11: 'cur', 15: 'ok', 16: 'ok', 17: 'ok' } },
          { narr: 'Step 4 — the payoff. A festive sale arrives: one <b>new</b> class. Nothing above was edited. <span class="c-g">Open for extension, closed for modification.</span>', code: T3_GOOD, hl: { 20: 'ok', 21: 'ok', 22: 'ok', 23: 'ok' } }
        ]);
      }
    }],
    examples: [
      { title: 'Shapes and the instanceof chain', html: `<p>${H.c('r', 'Bad:')} <code>AreaCalculator.area(Object s)</code> with <code>if (s instanceof Circle) … else if (s instanceof Rect) …</code>. Adding Triangle edits the calculator <i>and</i> every other method with a similar chain (perimeter, draw). ${H.c('g', 'Good:')} <code>interface Shape { double area(); }</code> — each shape knows its own area; the calculator just sums <code>s.area()</code>.</p>`, code: { lang: 'java', code: `interface Shape { double area(); }
record Circle(double r) implements Shape { public double area() { return Math.PI * r * r; } }
record Rect(double w, double h) implements Shape { public double area() { return w * h; } }
record Triangle(double b, double h) implements Shape { public double area() { return 0.5 * b * h; } } // added later, nothing edited

class AreaCalculator {
    static double total(List<Shape> shapes) {
        double sum = 0;
        for (Shape s : shapes) sum += s.area();
        return sum;
    }
}`, alt: [
          { lang: 'python', code: `import math
from abc import ABC, abstractmethod
from dataclasses import dataclass


class Shape(ABC):
    @abstractmethod
    def area(self) -> float: ...


@dataclass(frozen=True)
class Circle(Shape):
    r: float

    def area(self) -> float:
        return math.pi * self.r * self.r


@dataclass(frozen=True)
class Rect(Shape):
    w: float
    h: float

    def area(self) -> float:
        return self.w * self.h


@dataclass(frozen=True)
class Triangle(Shape):  # added later, nothing edited
    b: float
    h: float

    def area(self) -> float:
        return 0.5 * self.b * self.h


class AreaCalculator:
    @staticmethod
    def total(shapes: list[Shape]) -> float:
        return sum(s.area() for s in shapes)` },
          { lang: 'ts', code: `interface Shape { area(): number; }

class Circle implements Shape {
  constructor(readonly r: number) {}
  area(): number { return Math.PI * this.r * this.r; }
}
class Rect implements Shape {
  constructor(readonly w: number, readonly h: number) {}
  area(): number { return this.w * this.h; }
}
class Triangle implements Shape { // added later, nothing edited
  constructor(readonly b: number, readonly h: number) {}
  area(): number { return 0.5 * this.b * this.h; }
}

class AreaCalculator {
  static total(shapes: readonly Shape[]): number {
    let sum = 0;
    for (const s of shapes) sum += s.area();
    return sum;
  }
}` },
          { lang: 'cpp', code: `class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
};
class Circle : public Shape {
    double r_;
public:
    explicit Circle(double r) : r_(r) {}
    double area() const override { return numbers::pi * r_ * r_; }
};
class Rect : public Shape {
    double w_, h_;
public:
    Rect(double w, double h) : w_(w), h_(h) {}
    double area() const override { return w_ * h_; }
};
class Triangle : public Shape {   // added later, nothing edited
    double b_, h_;
public:
    Triangle(double b, double h) : b_(b), h_(h) {}
    double area() const override { return 0.5 * b_ * h_; }
};

class AreaCalculator {
public:
    static double total(const vector<unique_ptr<Shape>>& shapes) {
        double sum = 0;
        for (const auto& s : shapes) sum += s->area();
        return sum;
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

interface IShape { double Area(); }
sealed class Circle : IShape { readonly double r; public Circle(double r) { this.r = r; } public double Area() { return Math.PI * r * r; } }
sealed class Rect : IShape { readonly double w, h; public Rect(double w, double h) { this.w = w; this.h = h; } public double Area() { return w * h; } }
sealed class Triangle : IShape { readonly double b, h; public Triangle(double b, double h) { this.b = b; this.h = h; } public double Area() { return 0.5 * b * h; } } // added later, nothing edited

static class AreaCalculator {
    public static double Total(List<IShape> shapes) {
        double sum = 0;
        foreach (IShape s in shapes) sum += s.Area();
        return sum;
    }
}` }
        ] } },
      { title: 'Standard libraries already follow OCP: sort comparators', html: `<p><code>List.sort(Comparator)</code> (in Python <code>sorted(key=…)</code>, in JavaScript <code>sort(compare)</code>, in C++ <code>std::sort</code> with a lambda) was written once and never changes, yet you can sort by price, by name, by date, descending, with ties broken… by passing a new <code>Comparator</code>. The sort algorithm is <b>closed</b>; the ordering is <b>open</b>. That is the Strategy pattern, and lambdas make "a new class" as small as one line.</p>`, code: { lang: 'java', code: `record Product(String name, double price) {}
class SortDemo {
    public static void main(String[] args) {
        List<Product> ps = new ArrayList<>(List.of(new Product("pen", 10), new Product("bag", 50), new Product("ink", 10)));
        ps.sort(Comparator.comparingDouble(Product::price).thenComparing(Product::name)); // new behaviour, no edits to sort()
        System.out.println(ps);
    }
}`, alt: [
          { lang: 'python', code: `from dataclasses import dataclass


@dataclass(frozen=True)
class Product:
    name: str
    price: float


if __name__ == "__main__":
    ps = [Product("pen", 10), Product("bag", 50), Product("ink", 10)]
    ps.sort(key=lambda p: (p.price, p.name))  # new behaviour, no edits to sort()
    print(ps)` },
          { lang: 'ts', code: `interface Product { readonly name: string; readonly price: number; }

const ps: Product[] = [{ name: "pen", price: 10 }, { name: "bag", price: 50 }, { name: "ink", price: 10 }];
ps.sort((a, b) => a.price - b.price || a.name.localeCompare(b.name)); // new behaviour, no edits to sort()
console.log(ps);` },
          { lang: 'cpp', code: `struct Product {
    string name;
    double price;
};

int main() {
    vector<Product> ps = {{"pen", 10}, {"bag", 50}, {"ink", 10}};
    sort(ps.begin(), ps.end(), [](const Product& a, const Product& b) {   // new behaviour, no edits to sort()
        return tie(a.price, a.name) < tie(b.price, b.name);
    });
    for (const Product& p : ps) cout << p.name << " " << p.price << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

sealed class Product {
    public readonly string Name; public readonly double Price;
    public Product(string name, double price) { Name = name; Price = price; }
    public override string ToString() { return "Product[name=" + Name + ", price=" + Price.ToString("0.0") + "]"; }
}
class Program {
    static void Main() {
        var ps = new List<Product> { new Product("pen", 10), new Product("bag", 50), new Product("ink", 10) };
        ps = ps.OrderBy(p => p.Price).ThenBy(p => p.Name, StringComparer.Ordinal).ToList(); // new behaviour, no edits to the sort
        Console.WriteLine("[" + string.Join(", ", ps) + "]");
    }
}` }
        ] } },
      { title: 'When a switch is actually fine: sealed types and exhaustive matching', html: `<p>If the set of <b>types is fixed</b> but you keep adding <b>operations</b> (e.g. a compiler's AST, or <code>PaymentResult = Success | Failure | Pending</code>), a closed set of variants with exhaustive matching is the better trade-off (Java <code>sealed</code> + <code>switch</code>, a TypeScript discriminated union, C++ <code>std::variant</code> + <code>std::visit</code>, Python <code>match</code> checked by a type checker): the compiler errors if a case is missing. OCP is about the <b>axis of change</b>: new types → polymorphism; new operations over fixed types → sealed + switch (or Visitor).</p>`, code: { lang: 'java', code: `sealed interface PaymentResult permits Success, Failure, Pending {}
record Success(String txnId) implements PaymentResult {}
record Failure(String reason) implements PaymentResult {}
record Pending(int retryInSec) implements PaymentResult {}

class ResultText {
    static String describe(PaymentResult r) {
        return switch (r) {             // exhaustive: no default needed, compiler checks every case
            case Success s -> "Paid, id " + s.txnId();
            case Failure f -> "Failed: " + f.reason();
            case Pending p -> "Retry in " + p.retryInSec() + "s";
        };
    }
}`, alt: [
          { lang: 'python', code: `from dataclasses import dataclass
from typing import assert_never


@dataclass(frozen=True)
class Success:
    txn_id: str


@dataclass(frozen=True)
class Failure:
    reason: str


@dataclass(frozen=True)
class Pending:
    retry_in_sec: int


PaymentResult = Success | Failure | Pending  # a closed set of variants


def describe(r: PaymentResult) -> str:
    match r:  # a type checker verifies every case is handled
        case Success(txn_id):
            return f"Paid, id {txn_id}"
        case Failure(reason):
            return f"Failed: {reason}"
        case Pending(retry_in_sec):
            return f"Retry in {retry_in_sec}s"
        case _:
            assert_never(r)` },
          { lang: 'ts', code: `type PaymentResult =
  | { kind: "success"; txnId: string }
  | { kind: "failure"; reason: string }
  | { kind: "pending"; retryInSec: number };

function describe(r: PaymentResult): string {
  switch (r.kind) { // exhaustive: the compiler rejects a missing case
    case "success": return \`Paid, id \${r.txnId}\`;
    case "failure": return \`Failed: \${r.reason}\`;
    case "pending": return \`Retry in \${r.retryInSec}s\`;
  }
}` },
          { lang: 'cpp', code: `struct Success { string txnId; };
struct Failure { string reason; };
struct Pending { int retryInSec; };
template <class... Ts> struct overloaded : Ts... { using Ts::operator()...; };
template <class... Ts> overloaded(Ts...) -> overloaded<Ts...>;

using PaymentResult = variant<Success, Failure, Pending>;

string describe(const PaymentResult& r) {
    return visit(overloaded{   // exhaustive: the compiler rejects a missing alternative
        [](const Success& s) { return "Paid, id " + s.txnId; },
        [](const Failure& f) { return "Failed: " + f.reason; },
        [](const Pending& p) { return "Retry in " + to_string(p.retryInSec) + "s"; },
    }, r);
}` },
  { lang: 'csharp', code: `
using System;

// A closed set of variants: the base constructor is private, so only the nested classes can derive.
abstract class PaymentResult {
    private PaymentResult() { }
    public sealed class Success : PaymentResult { public readonly string TxnId; public Success(string txnId) { TxnId = txnId; } }
    public sealed class Failure : PaymentResult { public readonly string Reason; public Failure(string reason) { Reason = reason; } }
    public sealed class Pending : PaymentResult { public readonly int RetryInSec; public Pending(int retryInSec) { RetryInSec = retryInSec; } }
}

static class ResultText {
    public static string Describe(PaymentResult r) {
        if (r is PaymentResult.Success s) return "Paid, id " + s.TxnId;      // every variant handled here
        if (r is PaymentResult.Failure f) return "Failed: " + f.Reason;
        if (r is PaymentResult.Pending p) return "Retry in " + p.RetryInSec + "s";
        throw new ArgumentException("unknown result");
    }
}` }
        ] } }
    ],
    deepDive: `<p><b>Meyer vs Martin.</b> Meyer's 1988 OCP used <i>implementation inheritance</i>: once a class is released, you extend it by subclassing. Martin's 1996 "polymorphic OCP" uses <i>interfaces</i>: depend on an abstraction, add implementations. Modern object-oriented style favours the latter (plus composition), because deep inheritance trees create their own fragility.</p>
<p><b>Strategic closure.</b> You cannot be closed against everything. If discounts start needing the customer's order history, the <code>discount(double amt)</code> signature itself must change — every implementation is touched. Good designers pick abstractions around <b>stable concepts</b> (pass a rich <code>Order</code> object, not five primitive parameters) and accept that a truly new kind of requirement may need modification. "Fool me once" rule: do not pre-build sockets for imagined changes; when the second or third variation shows up, refactor to make that axis open.</p>
<p><b>The expression problem.</b> Polymorphism makes adding <i>types</i> cheap and adding <i>operations</i> expensive (every class needs the new method). Switch/pattern-matching makes adding <i>operations</i> cheap and adding <i>types</i> expensive. Sealed types with exhaustive matching (Java 21 <code>sealed</code> + <code>switch</code>, TypeScript discriminated unions, C++ <code>std::variant</code>) give compiler safety to the second style. Visitor pattern is the classic OO bridge. Naming this trade-off in an interview signals senior-level thinking.</p>
<p><b>OCP at system level.</b> Plugin architectures (IDE plugins, <code>java.util.ServiceLoader</code>, Spring injecting <code>List&lt;DiscountPolicy&gt;</code>), feature flags, and event-driven systems (new consumer of an existing Kafka topic needs zero producer changes) are OCP at scale. Configuration-driven rules (a discount table in a DB) push it further — new discount without a deploy — at the cost of testability and type safety.</p>
<p><b>Performance note:</b> an interface call is a virtual dispatch; the JIT inlines monomorphic and bimorphic call sites, so in hot loops with 1–2 implementations the cost is nearly zero. With many implementations (megamorphic) it is a few nanoseconds — irrelevant for business logic.</p>`,
    aiEra: `<p><b>What AI changes:</b> asked to "add a student discount", an assistant will most likely add another <code>case</code> to the existing switch — the smallest diff. It optimises for <i>this</i> change, not the next ten. Reviewing AI diffs for "did this edit tested code that could have been extended instead?" is now a core skill.</p>
<p><b>Use AI as a partner:</b> <code>This switch on customerType appears in 4 files. Refactor to the Strategy pattern so a new type needs only a new class. Show the before/after file list.</code> Or ask it to find all switches on the same enum across the codebase — great at that search. You can also ask <code>Is a sealed interface with pattern matching better than Strategy here? Which axis changes more?</code></p>
<p><b>Where AI goes wrong:</b> it may build a full plugin framework with reflection and annotations for three discount types (over-engineering), or put the registry inside Checkout (so Checkout still changes per type). <b>What you must still own:</b> predicting the real axis of change from the business conversation, deciding where wiring lives (composition root), and choosing between polymorphism and sealed switches.</p>`,
    problems: [{
      title: 'Payment methods without the if-else ladder',
      level: 'Medium', tags: ['OCP', 'strategy', 'registry'], companies: ['Razorpay', 'PayPal', 'Paytm', 'Amazon'],
      statement: `<p><code>PaymentProcessor.pay(method, amount)</code> uses an if/else ladder for <code>"CARD"</code> (2% fee), <code>"UPI"</code> (no fee) and <code>"WALLET"</code> (1% fee, fails if amount &gt; 10,000). The team must add <b>NETBANKING</b> (flat fee 15) next sprint and more methods later. Redesign so that adding a method <b>never edits</b> <code>PaymentProcessor</code> or any existing method class. Unknown methods must fail with a clear error.</p>`,
      constraints: `<p>Standard library only, no frameworks. Amounts are positive doubles (use a decimal type or integer minor units in real money code). Return the total charged (amount + fee).</p>`,
      example: `<p><code>pay("CARD", 1000)</code> → ${H.c('g', '1020.0')} (2% fee). <code>pay("WALLET", 20000)</code> → ${H.c('r', 'IllegalStateException: wallet limit')}. <code>pay("NETBANKING", 1000)</code> → ${H.c('g', '1015.0')} after adding one new class.</p>`,
      brute: {
        why: `<p>The if/else ladder mixes all payment rules in one method. Adding NETBANKING edits this tested method, re-tests all branches and risks breaking CARD. The same ladder is often duplicated for refunds and receipts — every new method becomes shotgun surgery.</p>`,
        code: { lang: 'java', code: `class PaymentProcessor {
    double pay(String method, double amount) {
        if (method.equals("CARD")) {
            return amount + amount * 0.02;
        } else if (method.equals("UPI")) {
            return amount;
        } else if (method.equals("WALLET")) {
            if (amount > 10_000) throw new IllegalStateException("wallet limit");
            return amount + amount * 0.01;
        } else {
            throw new IllegalArgumentException("unknown method " + method);
        }
    }
}`, alt: [
                { lang: 'python', code: `
class PaymentProcessor:
    def pay(self, method, amount):
        if method == "CARD":
            return amount + amount * 0.02
        elif method == "UPI":
            return amount
        elif method == "WALLET":
            if amount > 10_000: raise RuntimeError("wallet limit")
            return amount + amount * 0.01
        else:
            raise ValueError("unknown method " + method)` },
                { lang: 'ts', code: `
class PaymentProcessor {
    pay(method: string, amount: number): number {
        if (method === "CARD") {
            return amount + amount * 0.02;
        } else if (method === "UPI") {
            return amount;
        } else if (method === "WALLET") {
            if (amount > 10_000) throw new Error("wallet limit");
            return amount + amount * 0.01;
        } else {
            throw new Error("unknown method " + method);
        }
    }
}` },
                { lang: 'cpp', code: `
class PaymentProcessor {
public:
    double pay(const string& method, double amount) {
        if (method == "CARD") {
            return amount + amount * 0.02;
        } else if (method == "UPI") {
            return amount;
        } else if (method == "WALLET") {
            if (amount > 10000) throw runtime_error("wallet limit");
            return amount + amount * 0.01;
        } else {
            throw invalid_argument("unknown method " + method);
        }
    }
};` },
  { lang: 'csharp', code: `
using System;

class PaymentProcessor {
    public double Pay(string method, double amount) {
        if (method == "CARD") {
            return amount + amount * 0.02;
        } else if (method == "UPI") {
            return amount;
        } else if (method == "WALLET") {
            if (amount > 10000) throw new InvalidOperationException("wallet limit");
            return amount + amount * 0.01;
        } else {
            throw new ArgumentException("unknown method " + method);
        }
    }
}` }
              ] }
      },
      mcq: { q: 'Where should the knowledge "WALLET fails above 10,000" live after the refactor?', options: ['Inside the WalletPayment class', 'Inside PaymentProcessor, before calling the strategy', 'In a global constants class', 'In the caller (UI)'], answer: 0, explain: 'Each strategy owns all of its rules. If the processor checked wallet limits, it would still change whenever wallet rules change — OCP and SRP both broken.' },
      hints: [
        `<p>The thing that varies is "how a method charges". Make it an interface: <code>PaymentMethod { String code(); double charge(double amount); }</code>.</p>`,
        `<p>The processor keeps a <code>Map&lt;String, PaymentMethod&gt;</code> built from a list passed into its constructor. Lookup → delegate.</p>`,
        `<p>Edge cases: duplicate codes in the list (fail fast), unknown code (clear exception), negative amounts (validate once in the processor — that rule is common to all). Recipe: interface → 3 classes → map registry → add NetBanking as a 4th class + one wiring line.</p>`
      ],
      tests: { io: true, cases: [{ stdin: '', stdout: "CARD 1020.00\nUPI 1000.00\nWALLET 1010.00\nNETBANKING 1015.00\nwallet limit\nunknown method BITCOIN\namount must be positive\nduplicate method UPI\n" }] },
      solution: {
        approach: `<p><b>Strategy + self-registering registry.</b> Each payment method class owns its fee and limits. <code>PaymentProcessor</code> receives a list of methods, indexes them by <code>code()</code>, and only does the common work (validate amount, look up, delegate). NetBanking is a new class added to the wiring list; no existing class changes. With Spring, the list would be injected automatically (<code>List&lt;PaymentMethod&gt;</code>), making it zero-edit.</p>`,
        code: `interface PaymentMethod {
    String code();
    double charge(double amount);   // returns total charged
}

class CardPayment implements PaymentMethod {
    public String code() { return "CARD"; }
    public double charge(double amount) { return amount + amount * 0.02; }
}
class UpiPayment implements PaymentMethod {
    public String code() { return "UPI"; }
    public double charge(double amount) { return amount; }
}
class WalletPayment implements PaymentMethod {
    private static final double LIMIT = 10_000;
    public String code() { return "WALLET"; }
    public double charge(double amount) {
        if (amount > LIMIT) throw new IllegalStateException("wallet limit");
        return amount + amount * 0.01;
    }
}
// Added next sprint: a NEW file, nothing else edited.
class NetBankingPayment implements PaymentMethod {
    public String code() { return "NETBANKING"; }
    public double charge(double amount) { return amount + 15; }
}

class PaymentProcessor {
    private final Map<String, PaymentMethod> methods = new HashMap<>();

    PaymentProcessor(List<PaymentMethod> available) {
        for (PaymentMethod m : available)
            if (methods.putIfAbsent(m.code(), m) != null)
                throw new IllegalArgumentException("duplicate method " + m.code());
    }

    double pay(String code, double amount) {
        if (amount <= 0) throw new IllegalArgumentException("amount must be positive");
        PaymentMethod m = methods.get(code);
        if (m == null) throw new IllegalArgumentException("unknown method " + code);
        return m.charge(amount);
    }

    public static void main(String[] args) {
        PaymentProcessor p = new PaymentProcessor(List.of(
                new CardPayment(), new UpiPayment(), new WalletPayment(), new NetBankingPayment()));
        for (String code : List.of("CARD", "UPI", "WALLET", "NETBANKING"))
            System.out.println(code + " " + String.format("%.2f", p.pay(code, 1000)));
        try { p.pay("WALLET", 20000); } catch (RuntimeException e) { System.out.println(e.getMessage()); }
        try { p.pay("BITCOIN", 500); } catch (RuntimeException e) { System.out.println(e.getMessage()); }
        try { p.pay("UPI", 0); } catch (RuntimeException e) { System.out.println(e.getMessage()); }
        try { new PaymentProcessor(List.of(new UpiPayment(), new UpiPayment())); }
        catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
    }
}`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod


class PaymentMethod(ABC):
    @property
    @abstractmethod
    def code(self) -> str: ...

    @abstractmethod
    def charge(self, amount: float) -> float:
        """Returns the total charged."""


class CardPayment(PaymentMethod):
    code = "CARD"

    def charge(self, amount: float) -> float:
        return amount + amount * 0.02


class UpiPayment(PaymentMethod):
    code = "UPI"

    def charge(self, amount: float) -> float:
        return amount


class WalletPayment(PaymentMethod):
    code = "WALLET"
    LIMIT = 10_000

    def charge(self, amount: float) -> float:
        if amount > self.LIMIT:
            raise RuntimeError("wallet limit")
        return amount + amount * 0.01


# Added next sprint: a NEW class, nothing else edited.
class NetBankingPayment(PaymentMethod):
    code = "NETBANKING"

    def charge(self, amount: float) -> float:
        return amount + 15


class PaymentProcessor:
    def __init__(self, available: list[PaymentMethod]) -> None:
        self._methods: dict[str, PaymentMethod] = {}
        for m in available:
            if m.code in self._methods:
                raise ValueError(f"duplicate method {m.code}")
            self._methods[m.code] = m

    def pay(self, code: str, amount: float) -> float:
        if amount <= 0:
            raise ValueError("amount must be positive")
        method = self._methods.get(code)
        if method is None:
            raise ValueError(f"unknown method {code}")
        return method.charge(amount)


def main() -> None:
    p = PaymentProcessor([CardPayment(), UpiPayment(), WalletPayment(), NetBankingPayment()])
    for code in ["CARD", "UPI", "WALLET", "NETBANKING"]:
        print(f"{code} {p.pay(code, 1000):.2f}")
    for code, amount in [("WALLET", 20000), ("BITCOIN", 500), ("UPI", 0)]:
        try:
            p.pay(code, amount)
        except (ValueError, RuntimeError) as e:
            print(e)
    try:
        PaymentProcessor([UpiPayment(), UpiPayment()])
    except ValueError as e:
        print(e)


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `interface PaymentMethod {
  readonly code: string;
  charge(amount: number): number; // returns total charged
}

class CardPayment implements PaymentMethod {
  readonly code = "CARD";
  charge(amount: number): number { return amount + amount * 0.02; }
}
class UpiPayment implements PaymentMethod {
  readonly code = "UPI";
  charge(amount: number): number { return amount; }
}
class WalletPayment implements PaymentMethod {
  readonly code = "WALLET";
  private static readonly LIMIT = 10_000;
  charge(amount: number): number {
    if (amount > WalletPayment.LIMIT) throw new Error("wallet limit");
    return amount + amount * 0.01;
  }
}
// Added next sprint: a NEW class, nothing else edited.
class NetBankingPayment implements PaymentMethod {
  readonly code = "NETBANKING";
  charge(amount: number): number { return amount + 15; }
}

class PaymentProcessor {
  private readonly methods = new Map<string, PaymentMethod>();

  constructor(available: PaymentMethod[]) {
    for (const m of available) {
      if (this.methods.has(m.code)) throw new Error(\`duplicate method \${m.code}\`);
      this.methods.set(m.code, m);
    }
  }

  pay(code: string, amount: number): number {
    if (amount <= 0) throw new Error("amount must be positive");
    const method = this.methods.get(code);
    if (method === undefined) throw new Error(\`unknown method \${code}\`);
    return method.charge(amount);
  }
}

function main(): void {
  const p = new PaymentProcessor([new CardPayment(), new UpiPayment(), new WalletPayment(), new NetBankingPayment()]);
  for (const code of ["CARD", "UPI", "WALLET", "NETBANKING"]) {
    console.log(\`\${code} \${p.pay(code, 1000).toFixed(2)}\`);
  }
  const bad: [string, number][] = [["WALLET", 20000], ["BITCOIN", 500], ["UPI", 0]];
  for (const [code, amount] of bad) {
    try {
      p.pay(code, amount);
    } catch (e) {
      console.log((e as Error).message);
    }
  }
  try {
    new PaymentProcessor([new UpiPayment(), new UpiPayment()]);
  } catch (e) {
    console.log((e as Error).message);
  }
}
main();` },
          { lang: 'cpp', code: `class PaymentMethod {
public:
    virtual ~PaymentMethod() = default;
    virtual string code() const = 0;
    virtual double charge(double amount) const = 0;   // returns total charged
};

class CardPayment : public PaymentMethod {
public:
    string code() const override { return "CARD"; }
    double charge(double amount) const override { return amount + amount * 0.02; }
};
class UpiPayment : public PaymentMethod {
public:
    string code() const override { return "UPI"; }
    double charge(double amount) const override { return amount; }
};
class WalletPayment : public PaymentMethod {
    static constexpr double LIMIT = 10'000;
public:
    string code() const override { return "WALLET"; }
    double charge(double amount) const override {
        if (amount > LIMIT) throw runtime_error("wallet limit");
        return amount + amount * 0.01;
    }
};
// Added next sprint: a NEW class, nothing else edited.
class NetBankingPayment : public PaymentMethod {
public:
    string code() const override { return "NETBANKING"; }
    double charge(double amount) const override { return amount + 15; }
};

class PaymentProcessor {
    unordered_map<string, unique_ptr<PaymentMethod>> methods_;
public:
    explicit PaymentProcessor(vector<unique_ptr<PaymentMethod>> available) {
        for (auto& m : available) {
            string code = m->code();
            if (methods_.count(code)) throw invalid_argument("duplicate method " + code);
            methods_[code] = std::move(m);
        }
    }

    double pay(const string& code, double amount) const {
        if (amount <= 0) throw invalid_argument("amount must be positive");
        auto it = methods_.find(code);
        if (it == methods_.end()) throw invalid_argument("unknown method " + code);
        return it->second->charge(amount);
    }
};

int main() {
    vector<unique_ptr<PaymentMethod>> all;
    all.push_back(make_unique<CardPayment>());
    all.push_back(make_unique<UpiPayment>());
    all.push_back(make_unique<WalletPayment>());
    all.push_back(make_unique<NetBankingPayment>());
    PaymentProcessor p(std::move(all));
    cout << fixed << setprecision(2);
    for (const string code : {"CARD", "UPI", "WALLET", "NETBANKING"})
        cout << code << " " << p.pay(code, 1000) << "\\n";
    const vector<pair<string, double>> bad = {{"WALLET", 20000}, {"BITCOIN", 500}, {"UPI", 0}};
    for (const auto& [code, amount] : bad) {
        try {
            p.pay(code, amount);
        } catch (const exception& e) {
            cout << e.what() << "\\n";
        }
    }
    try {
        vector<unique_ptr<PaymentMethod>> twice;
        twice.push_back(make_unique<UpiPayment>());
        twice.push_back(make_unique<UpiPayment>());
        PaymentProcessor dup(std::move(twice));
    } catch (const exception& e) {
        cout << e.what() << "\\n";
    }
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

interface IPaymentMethod {
    string Code { get; }
    double Charge(double amount);   // returns total charged
}

class CardPayment : IPaymentMethod {
    public string Code { get { return "CARD"; } }
    public double Charge(double amount) { return amount + amount * 0.02; }
}
class UpiPayment : IPaymentMethod {
    public string Code { get { return "UPI"; } }
    public double Charge(double amount) { return amount; }
}
class WalletPayment : IPaymentMethod {
    private const double Limit = 10000;
    public string Code { get { return "WALLET"; } }
    public double Charge(double amount) {
        if (amount > Limit) throw new InvalidOperationException("wallet limit");
        return amount + amount * 0.01;
    }
}
// Added next sprint: a NEW file, nothing else edited.
class NetBankingPayment : IPaymentMethod {
    public string Code { get { return "NETBANKING"; } }
    public double Charge(double amount) { return amount + 15; }
}

class PaymentProcessor {
    private readonly Dictionary<string, IPaymentMethod> methods = new Dictionary<string, IPaymentMethod>();

    public PaymentProcessor(IEnumerable<IPaymentMethod> available) {
        foreach (IPaymentMethod m in available) {
            if (methods.ContainsKey(m.Code)) throw new ArgumentException("duplicate method " + m.Code);
            methods[m.Code] = m;
        }
    }

    public double Pay(string code, double amount) {
        if (amount <= 0) throw new ArgumentException("amount must be positive");
        IPaymentMethod m;
        if (!methods.TryGetValue(code, out m)) throw new ArgumentException("unknown method " + code);
        return m.Charge(amount);
    }
}

class Program {
    static void Main() {
        PaymentProcessor p = new PaymentProcessor(new IPaymentMethod[] {
                new CardPayment(), new UpiPayment(), new WalletPayment(), new NetBankingPayment() });
        foreach (string code in new[] { "CARD", "UPI", "WALLET", "NETBANKING" })
            Console.WriteLine(code + " " + p.Pay(code, 1000).ToString("F2"));
        try { p.Pay("WALLET", 20000); } catch (Exception e) { Console.WriteLine(e.Message); }
        try { p.Pay("BITCOIN", 500); } catch (Exception e) { Console.WriteLine(e.Message); }
        try { p.Pay("UPI", 0); } catch (Exception e) { Console.WriteLine(e.Message); }
        try { new PaymentProcessor(new IPaymentMethod[] { new UpiPayment(), new UpiPayment() }); }
        catch (ArgumentException e) { Console.WriteLine(e.Message); }
    }
}` }
        ],
        complexity: `<p>O(1) lookup per payment (HashMap), O(k) construction for k methods. Adding a method: 1 new class + 1 wiring entry; 0 existing classes edited, 0 existing tests re-run.</p>`,
        followUps: ['Refunds also differ per method — add <code>refund()</code> to the interface or a separate <code>Refundable</code> interface? (hint: ISP)', 'How would you load methods as plugins from jars using <code>ServiceLoader</code>?', 'Fees change per region — what new abstraction appears?']
      }
    }]
  });

  /* ======================= TOPIC 4: LSP ======================= */
  var T4_CLIENT = `class Rectangle {
  protected int w, h;
  void setWidth(int w)  { this.w = w; }
  void setHeight(int h) { this.h = h; }
  int area() { return w * h; }
}
class Square extends Rectangle {
  void setWidth(int s)  { w = s; h = s; }
  void setHeight(int s) { w = s; h = s; }
}
// client written against Rectangle's promise
void stretch(Rectangle r) {
  r.setWidth(5);
  r.setHeight(4);
  check(r.area() == 20);
}`;

  topics.push({
    title: 'L — Liskov Substitution Principle (LSP)',
    analogy: `<p>You rent a car and the agency says "any car in this category". You get a different model than you expected — fine, the steering wheel, pedals and gear stick work the same. But imagine a "car" where the <b>brake pedal plays music</b> and the horn applies the brakes. It <i>is</i> technically a car, yet it breaks every driver's expectations — someone will crash. LSP says: <b>a subclass may be a different model, but it must keep the same promises</b> as the parent, so any code written for the parent keeps working.</p>`,
    explain: `<p><b>Barbara Liskov (1987), in plain English:</b> if <code>S</code> is a subtype of <code>T</code>, you should be able to <b>replace a T with an S anywhere</b> without the program behaving incorrectly. "Is-a" in real life is <b>not enough</b>; the subclass must be <b>behaviourally</b> substitutable.</p>
<p><b>The famous trap — Square extends Rectangle.</b> Mathematically a square <i>is a</i> rectangle. In code, <code>Rectangle</code> promises "setWidth changes only the width". <code>Square</code> must keep sides equal, so its <code>setWidth</code> also changes the height. A client that does <code>setWidth(5); setHeight(4);</code> expects area 20 but gets 16 with a Square. Compiles fine — fails at runtime.</p>
<p><b>The contract rules</b> (Design by Contract, Meyer + Liskov/Wing):</p>
${H.table(['Rule', 'Plain English', 'Violation example'], [
  ['Preconditions cannot be <b>stronger</b>', 'A child cannot demand more from callers', 'Parent accepts any amount; child rejects amounts &gt; 1000'],
  ['Postconditions cannot be <b>weaker</b>', 'A child must deliver at least what the parent promised', 'Parent never returns null; child returns null'],
  ['Invariants must be <b>preserved</b>', 'Facts that are always true for the parent stay true', 'Balance ≥ 0 broken by an "overdraft" child'],
  ['No new <b>surprise exceptions</b>', 'Do not throw where the parent never would', '<code>Penguin.fly()</code> throws <code>UnsupportedOperationException</code>'],
  ['History constraint', 'Do not allow state changes the parent forbids', 'Mutable subclass of an immutable class']
])}
<p><b>Smells that shout "LSP broken":</b></p>
<ul>
<li>${H.c('r', '<code>if (x instanceof Square)</code>')} in client code — the client had to learn about the subclass to stay correct.</li>
<li>Overrides that <b>throw</b> <code>UnsupportedOperationException</code> or do nothing (empty body).</li>
<li>Subclass documentation says "<i>unlike the parent, this one…</i>".</li>
<li>Tests written for the parent fail when run against the child.</li>
</ul>
<p><b>Fixes:</b> (1) do not inherit — make both implement a smaller shared interface (<code>Shape { area(); }</code>); (2) split the capability out (<code>FlyingBird</code> vs <code>Bird</code>); (3) make objects immutable so "setWidth" never exists; (4) prefer <b>composition</b> over inheritance when you only wanted code reuse.</p>`,
    clues: [
      '"Penguin is a Bird but cannot fly" / "Square is a Rectangle" → the interviewer is fishing for LSP.',
      'Code contains <code>instanceof</code> checks or <code>getClass() ==</code> before calling an overridden method → substitutability is broken.',
      'An override that throws <code>UnsupportedOperationException</code> or has an empty body → refused bequest smell.',
      '"Should X extend Y?" questions → ask "can every Y-client safely receive an X?" not "is X a Y in real life?"',
      '"Read-only version of a mutable collection/account" → do not subclass the mutable one; split interfaces.',
      'Parent\'s unit tests fail when run on the subclass → behavioural contract violated.'
    ],
    code: [{ lang: 'java', title: 'Before: Square extends Rectangle breaks client expectations', code: `class Rectangle {
    protected int width, height;
    void setWidth(int w)  { width = w; }
    void setHeight(int h) { height = h; }
    int area() { return width * height; }
}

class Square extends Rectangle {
    // keeps sides equal -> silently changes the OTHER side too
    @Override void setWidth(int s)  { width = s; height = s; }
    @Override void setHeight(int s) { width = s; height = s; }
}

class Client {
    static void stretch(Rectangle r) {
        r.setWidth(5);
        r.setHeight(4);
        System.out.println("expected 20, got " + r.area());   // Square prints 16!
    }
    public static void main(String[] args) {
        stretch(new Rectangle());
        stretch(new Square());
    }
}`, alt: [
          { lang: 'python', code: `class Rectangle:
    def __init__(self) -> None:
        self.width = 0
        self.height = 0

    def set_width(self, w: int) -> None:
        self.width = w

    def set_height(self, h: int) -> None:
        self.height = h

    def area(self) -> int:
        return self.width * self.height


class Square(Rectangle):
    # keeps sides equal -> silently changes the OTHER side too
    def set_width(self, s: int) -> None:
        self.width = self.height = s

    def set_height(self, s: int) -> None:
        self.width = self.height = s


def stretch(r: Rectangle) -> None:
    r.set_width(5)
    r.set_height(4)
    print(f"expected 20, got {r.area()}")  # Square prints 16!


if __name__ == "__main__":
    stretch(Rectangle())
    stretch(Square())` },
          { lang: 'ts', code: `class Rectangle {
  protected width = 0;
  protected height = 0;
  setWidth(w: number): void { this.width = w; }
  setHeight(h: number): void { this.height = h; }
  area(): number { return this.width * this.height; }
}

class Square extends Rectangle {
  // keeps sides equal -> silently changes the OTHER side too
  override setWidth(s: number): void { this.width = s; this.height = s; }
  override setHeight(s: number): void { this.width = s; this.height = s; }
}

function stretch(r: Rectangle): void {
  r.setWidth(5);
  r.setHeight(4);
  console.log(\`expected 20, got \${r.area()}\`); // Square prints 16!
}

stretch(new Rectangle());
stretch(new Square());` },
          { lang: 'cpp', code: `class Rectangle {
protected:
    int width = 0, height = 0;
public:
    virtual ~Rectangle() = default;
    virtual void setWidth(int w) { width = w; }
    virtual void setHeight(int h) { height = h; }
    int area() const { return width * height; }
};

class Square : public Rectangle {
public:
    // keeps sides equal -> silently changes the OTHER side too
    void setWidth(int s) override { width = s; height = s; }
    void setHeight(int s) override { width = s; height = s; }
};

void stretch(Rectangle& r) {
    r.setWidth(5);
    r.setHeight(4);
    cout << "expected 20, got " << r.area() << "\\n";   // Square prints 16!
}

int main() {
    Rectangle rect;
    Square square;
    stretch(rect);
    stretch(square);
}` },
  { lang: 'csharp', code: `
using System;

class Rectangle {
    protected int width, height;
    public virtual void SetWidth(int w) { width = w; }
    public virtual void SetHeight(int h) { height = h; }
    public int Area() { return width * height; }
}

class Square : Rectangle {
    // keeps sides equal -> silently changes the OTHER side too
    public override void SetWidth(int s) { width = s; height = s; }
    public override void SetHeight(int s) { width = s; height = s; }
}

class Program {
    static void Stretch(Rectangle r) {
        r.SetWidth(5);
        r.SetHeight(4);
        Console.WriteLine("expected 20, got " + r.Area());   // Square prints 16!
    }
    static void Main() {
        Stretch(new Rectangle());
        Stretch(new Square());
    }
}` }
        ] }, { lang: 'java', title: 'After: siblings under a shared, honest abstraction (immutable)', code: `interface Shape { double area(); }

// Immutable value objects: no setters, so no broken "setWidth" promise exists.
record Rectangle(double width, double height) implements Shape {
    Rectangle {
        if (width <= 0 || height <= 0) throw new IllegalArgumentException("sides must be positive");
    }
    public double area() { return width * height; }
    Rectangle withWidth(double w) { return new Rectangle(w, height); }   // "change" = new object
}

record Square(double side) implements Shape {
    Square { if (side <= 0) throw new IllegalArgumentException("side must be positive"); }
    public double area() { return side * side; }
    Rectangle toRectangle() { return new Rectangle(side, side); }
}

class Client {
    static double totalArea(List<Shape> shapes) {         // works for ANY Shape, no instanceof
        return shapes.stream().mapToDouble(Shape::area).sum();
    }
    public static void main(String[] args) {
        System.out.println(totalArea(List.of(new Rectangle(5, 4), new Square(4))));  // 36.0
    }
}`, alt: [
          { lang: 'python', code: `import math
from abc import ABC, abstractmethod
from dataclasses import dataclass


class Shape(ABC):
    @abstractmethod
    def area(self) -> float: ...


# Immutable value objects: no setters, so no broken "set_width" promise exists.
@dataclass(frozen=True)
class Rectangle(Shape):
    width: float
    height: float

    def __post_init__(self) -> None:
        if self.width <= 0 or self.height <= 0:
            raise ValueError("sides must be positive")

    def area(self) -> float:
        return self.width * self.height

    def with_width(self, w: float) -> "Rectangle":  # "change" = new object
        return Rectangle(w, self.height)


@dataclass(frozen=True)
class Square(Shape):
    side: float

    def __post_init__(self) -> None:
        if self.side <= 0:
            raise ValueError("side must be positive")

    def area(self) -> float:
        return self.side * self.side

    def to_rectangle(self) -> Rectangle:
        return Rectangle(self.side, self.side)


def total_area(shapes: list[Shape]) -> float:  # works for ANY Shape, no isinstance
    return sum(s.area() for s in shapes)


if __name__ == "__main__":
    print(total_area([Rectangle(5.0, 4.0), Square(4.0)]))  # 36.0` },
          { lang: 'ts', code: `interface Shape { area(): number; }

// Immutable value objects: no setters, so no broken "setWidth" promise exists.
class Rectangle implements Shape {
  constructor(readonly width: number, readonly height: number) {
    if (width <= 0 || height <= 0) throw new Error("sides must be positive");
  }
  area(): number { return this.width * this.height; }
  withWidth(w: number): Rectangle { return new Rectangle(w, this.height); } // "change" = new object
}

class Square implements Shape {
  constructor(readonly side: number) {
    if (side <= 0) throw new Error("side must be positive");
  }
  area(): number { return this.side * this.side; }
  toRectangle(): Rectangle { return new Rectangle(this.side, this.side); }
}

function totalArea(shapes: readonly Shape[]): number { // works for ANY Shape, no instanceof
  return shapes.reduce((sum, s) => sum + s.area(), 0);
}

console.log(totalArea([new Rectangle(5, 4), new Square(4)])); // 36` },
          { lang: 'cpp', code: `class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
};

// Immutable value objects: no setters, so no broken "setWidth" promise exists.
class Rectangle : public Shape {
    double width_, height_;
public:
    Rectangle(double width, double height) : width_(width), height_(height) {
        if (width <= 0 || height <= 0) throw invalid_argument("sides must be positive");
    }
    double area() const override { return width_ * height_; }
    Rectangle withWidth(double w) const { return Rectangle(w, height_); }   // "change" = new object
};

class Square : public Shape {
    double side_;
public:
    explicit Square(double side) : side_(side) {
        if (side <= 0) throw invalid_argument("side must be positive");
    }
    double area() const override { return side_ * side_; }
    Rectangle toRectangle() const { return Rectangle(side_, side_); }
};

double totalArea(const vector<const Shape*>& shapes) {   // works for ANY Shape, no dynamic_cast
    double sum = 0;
    for (const Shape* s : shapes) sum += s->area();
    return sum;
}

int main() {
    Rectangle r(5, 4);
    Square s(4);
    cout << totalArea({&r, &s}) << "\\n";   // 36
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

interface IShape { double Area(); }

// Immutable value objects: no setters, so no broken "SetWidth" promise exists.
sealed class Rectangle : IShape {
    public readonly double Width, Height;
    public Rectangle(double width, double height) {
        if (width <= 0 || height <= 0) throw new ArgumentException("sides must be positive");
        Width = width; Height = height;
    }
    public double Area() { return Width * Height; }
    public Rectangle WithWidth(double w) { return new Rectangle(w, Height); }   // "change" = new object
}

sealed class Square : IShape {
    public readonly double Side;
    public Square(double side) { if (side <= 0) throw new ArgumentException("side must be positive"); Side = side; }
    public double Area() { return Side * Side; }
    public Rectangle ToRectangle() { return new Rectangle(Side, Side); }
}

class Program {
    static double TotalArea(List<IShape> shapes) {         // works for ANY IShape, no type checks
        return shapes.Sum(s => s.Area());
    }
    static void Main() {
        Console.WriteLine(TotalArea(new List<IShape> { new Rectangle(5, 4), new Square(4) }).ToString("0.0"));  // 36.0
    }
}` }
        ] }],
    codeTitle: ['Bad: Square extends Rectangle', 'Good: Shape siblings'],
    viz: [{
      title: 'Substitute the subclass: does the client\'s promise still hold?',
      input: 'square',
      inputLabel: 'Object passed to stretch(): rectangle | square',
      gen: function (input) {
        var kind = pick(input, { rectangle: 1, square: 1 }, 'Type rectangle or square');
        var sq = kind === 'square', w = 0, h = 0, frames = [];
        var diag = function (cls) {
          return G('Class diagram', [B('CL', 'stretch(Rectangle)', 50, 6), B('R', 'Rectangle', 50, 24), B('S', 'Square', 50, 42)],
            [['CL', 'R', 'uses'], ['S', 'R', 'extends']], { h: 50, hl: { S: cls || '' }, ehl: { 'S-R': cls || 'cur' } });
        };
        frames.push(F('The client <code>stretch</code> was written against <b>Rectangle</b> and relies on its promise: "setWidth changes only the width, setHeight only the height". We now pass a <b>' + kind + '</b>. LSP says this must be safe.',
          [CODE('Rectangle, Square and a client', T4_CLIENT, { 12: 'cur' }), diag(sq ? 'cur' : ''), { type: 'vars', label: 'object state', vals: { type: sq ? 'Square' : 'Rectangle', w: w, h: h } }]));
        w = 5; if (sq) h = 5;
        frames.push(F('<code>r.setWidth(5)</code>. ' + (sq ? 'Square\'s override runs (line 8): it sets <b>both</b> w and h to 5. Already a surprise: the client only asked for the width.' : 'Rectangle sets only w = 5, as promised.'),
          [CODE('Rectangle, Square and a client', T4_CLIENT, sq ? { 13: 'cur', 8: 'bad' } : { 13: 'cur', 3: 'ok' }), { type: 'vars', label: 'object state', vals: { type: sq ? 'Square' : 'Rectangle', w: w, h: h }, hl: sq ? { w: 'cur', h: 'bad' } : { w: 'ok' } }]));
        h = 4; if (sq) w = 4;
        frames.push(F('<code>r.setHeight(4)</code>. ' + (sq ? 'Square sets <b>both</b> to 4 again (line 9). The width the client set a moment ago is gone.' : 'Rectangle sets only h = 4. Width is still 5.'),
          [CODE('Rectangle, Square and a client', T4_CLIENT, sq ? { 14: 'cur', 9: 'bad' } : { 14: 'cur', 4: 'ok' }), { type: 'vars', label: 'object state', vals: { type: sq ? 'Square' : 'Rectangle', w: w, h: h }, hl: sq ? { w: 'bad', h: 'cur' } : { h: 'ok' } }]));
        var area = w * h, okay = area === 20;
        frames.push(F('<code>check(r.area() == 20)</code> → area = ' + w + ' × ' + h + ' = <b>' + area + '</b>. ' + (okay ? '<span class="c-g">Promise kept.</span>' : '<span class="c-r">Promise broken! The compiler was happy, the type system said Square IS-A Rectangle, but behaviour changed. That is an LSP violation.</span>'),
          [CODE('Rectangle, Square and a client', T4_CLIENT, { 15: okay ? 'ok' : 'bad' }), diag(okay ? 'ok' : 'bad'), { type: 'vars', label: 'object state', vals: { type: sq ? 'Square' : 'Rectangle', w: w, h: h, area: area, expected: 20 }, hl: { area: okay ? 'ok' : 'bad' } }]));
        frames.push(F('A tempting "fix": add <code>if (r instanceof Square) …</code> to the client. <span class="c-r">Worse!</span> Now every client must know every subclass — that breaks OCP too. The real fix is in the hierarchy.',
          [CODE('Anti-fix', 'void stretch(Rectangle r) {\n  if (r instanceof Square) return; // hack\n  r.setWidth(5);\n  r.setHeight(4);\n}', { 2: 'bad' })]));
        frames.push(F('<b>Refactored:</b> Rectangle and Square become <b>siblings</b> implementing a small <b>«Shape»</b> interface with only <code>area()</code> — a promise both can keep. Clients that need independent width/height ask for a <code>Rectangle</code> specifically.',
          [G('After: honest abstraction', [B('CL', 'totalArea(shapes)', 50, 6), B('SH', '«Shape»', 50, 24), B('R', 'Rectangle', 25, 44), B('S', 'Square', 75, 44)],
            [['CL', 'SH', 'uses'], ['R', 'SH'], ['S', 'SH']], { h: 52, ehl: { 'CL-SH': 'ok', 'R-SH': 'ok', 'S-SH': 'ok' }, hl: { SH: 'sel' } }),
          TXT('Bonus: make them <b>immutable records</b>. With no setters, there is no "setWidth" promise to break, and a Square can still produce a Rectangle view via <code>toRectangle()</code>.')]));
        return frames;
      }
    }, {
      title: 'Loop over birds: who breaks the loop?',
      input: 'sparrow penguin eagle ostrich',
      inputLabel: 'Birds (sparrow, eagle, parrot, penguin, ostrich, kiwi), max 6',
      gen: function (input) {
        var canFly = { sparrow: true, eagle: true, parrot: true, penguin: false, ostrich: false, kiwi: false };
        var birds = String(input || '').trim().toLowerCase().split(/[\s,]+/).filter(Boolean);
        if (!birds.length || birds.length > 6 || birds.some(function (b) { return !(b in canFly); })) throw new Error('Use 1-6 of: sparrow, eagle, parrot, penguin, ostrich, kiwi');
        var code = 'abstract class Bird { abstract void fly(); }\nclass Penguin extends Bird {\n  void fly() { throw new UnsupportedOperationException(); }\n}\n// client\nfor (Bird b : birds) b.fly();';
        var frames = [F('<b>Before:</b> <code>Bird</code> declares <code>fly()</code>, so every bird must implement it. Flightless birds "implement" it by throwing. The client trusts the parent type and calls <code>fly()</code> on everyone.',
          [CODE('Bird hierarchy', code, { 1: 'cur', 3: 'bad' }), { type: 'array', label: 'birds', values: birds }])];
        var hl = {}, crashed = false;
        for (var i = 0; i < birds.length && !crashed; i++) {
          var ok = canFly[birds[i]], h2 = clone(hl), ptr = {};
          h2[i] = ok ? 'ok' : 'bad'; ptr[i] = 'b';
          frames.push(F('<code>' + birds[i] + '.fly()</code> → ' + (ok ? '<span class="c-g">flies, fine.</span>' : '<span class="c-r">throws UnsupportedOperationException! The loop crashes; birds after it never get processed.</span> The subclass broke the parent\'s promise.'),
            [CODE('Bird hierarchy', code, { 6: ok ? 'ok' : 'bad' }), { type: 'array', label: 'birds', values: birds, hl: h2, ptr: ptr }]));
          hl[i] = ok ? 'ok' : 'bad'; if (!ok) crashed = true;
        }
        if (!crashed) frames.push(F('No flightless bird this time, so it "works" — which is exactly why LSP bugs hide until production data contains the unexpected subclass.', [{ type: 'array', label: 'birds', values: birds, hl: hl }]));
        var fixed = 'interface Bird { void eat(); }\ninterface FlyingBird extends Bird { void fly(); }\nclass Sparrow implements FlyingBird { ... }\nclass Penguin implements Bird { ... }\n// client asks for exactly what it needs\nfor (FlyingBird b : flyers) b.fly();';
        frames.push(F('<b>Fix:</b> move <code>fly()</code> out of the base type. Only <b>FlyingBird</b> promises flight; Penguin is just a <b>Bird</b>. The compiler now prevents putting a penguin into the list of flyers.',
          [CODE('Refactored hierarchy', fixed, { 2: 'ok', 4: 'ok', 6: 'ok' }),
            G('After', [B('BI', '«Bird»', 50, 6), B('FB', '«FlyingBird»', 25, 24), B('SP', 'Sparrow', 15, 44), B('EA', 'Eagle', 40, 44), B('PE', 'Penguin', 75, 24)],
              [['FB', 'BI'], ['SP', 'FB'], ['EA', 'FB'], ['PE', 'BI']], { h: 52, ehl: { 'FB-BI': 'ok', 'SP-FB': 'ok', 'EA-FB': 'ok', 'PE-BI': 'ok' } })]));
        var flyers = birds.filter(function (b) { return canFly[b]; });
        frames.push(F('Re-run with the new types: the flyers list contains only <b>' + (flyers.join(', ') || 'nobody') + '</b>. Every element keeps the promise, so the loop can never crash for this reason. <span class="c-g">Substitutable.</span>',
          [{ type: 'array', label: 'List&lt;FlyingBird&gt;', values: flyers.length ? flyers : ['(empty)'], hl: (function () { var r = {}; flyers.forEach(function (_, i) { r[i] = 'ok'; }); return r; })() },
            { type: 'array', label: 'other birds (eat, walk, swim)', values: birds.filter(function (b) { return !canFly[b]; }).concat(birds.every(function (b) { return canFly[b]; }) ? ['(none)'] : []) }]));
        return frames;
      }
    }],
    examples: [
      { title: 'Standard libraries make this compromise too: read-only collections', html: `<p><code>List.of(1, 2, 3).add(4)</code> compiles but throws <code>UnsupportedOperationException</code>. The <code>List</code> interface documents <code>add</code> as an "optional operation", so technically the contract allows it — but it is the same smell: callers cannot trust the type. Python tuples, <code>const</code> collections in C++ and <code>readonly</code> arrays in TypeScript make the promise in the type instead. That is why modern APIs prefer separate read-only types (Kotlin's <code>List</code> vs <code>MutableList</code>, Guava's <code>ImmutableList</code> documenting intent). ${H.c('y', 'Lesson:')} if your method only reads, accept a read-only view; if it mutates, document it.</p>`, code: { lang: 'java', code: `class ListDemo {
    public static void main(String[] args) {
        List<Integer> fixed = List.of(1, 2, 3);
        try { fixed.add(4); }
        catch (UnsupportedOperationException e) { System.out.println("List.of is immutable: " + e); }
    }
}`, alt: [
          { lang: 'python', code: `if __name__ == "__main__":
    fixed = (1, 2, 3)  # a tuple is immutable
    try:
        fixed.append(4)  # type: ignore[attr-defined]
    except AttributeError as e:
        print("tuple is immutable:", e)` },
          { lang: 'ts', code: `const fixed: readonly number[] = Object.freeze([1, 2, 3]);
try {
  (fixed as number[]).push(4); // the type says readonly; freeze enforces it at run time
} catch (e) {
  console.log("frozen array is immutable: " + (e as Error).message);
}` },
          { lang: 'cpp', code: `int main() {
    const vector<int> fixed = {1, 2, 3};
    // fixed.push_back(4);   // compile error: push_back is not a const member function
    cout << "const vector size " << fixed.size() << " (mutation is rejected at compile time)\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class Program {
    static void Main() {
        IList<int> fixedList = Array.AsReadOnly(new[] { 1, 2, 3 });
        try { fixedList.Add(4); }
        catch (NotSupportedException e) { Console.WriteLine("a read-only list is immutable: " + e.Message); }
    }
}` }
        ] } },
      { title: 'java.sql.Timestamp extends java.util.Date (equals is not symmetric)', html: `<p>The Javadoc itself warns: <code>date.equals(timestamp)</code> can be true while <code>timestamp.equals(date)</code> is false, because Timestamp adds nanoseconds. Any code that puts Dates and Timestamps in the same <code>HashSet</code> can misbehave. The JDK authors note this "inheritance is implementation inheritance, not type inheritance" — a textbook LSP violation kept for backward compatibility.</p>` },
      { title: 'Strengthened precondition in a payment subclass', html: `<p>${H.c('r', 'Bad:')} <code>PaymentGateway.charge(amount)</code> accepts any positive amount. <code>PrepaidCardGateway</code> overrides it and throws if amount &gt; card balance. Checkout code written for the parent never expected that exception → crashes for prepaid users. ${H.c('g', 'Fix:')} put the possibility of decline <b>in the parent contract</b>: return a <code>ChargeResult</code> (approved / declined with reason). Now every gateway, including prepaid, honours the same promise.</p>`, code: { lang: 'java', code: `sealed interface ChargeResult permits Approved, Declined {}
record Approved(String txnId) implements ChargeResult {}
record Declined(String reason) implements ChargeResult {}

interface PaymentGateway { ChargeResult charge(double amount); }

class PrepaidCardGateway implements PaymentGateway {
    private double balance = 300;
    public ChargeResult charge(double amount) {
        if (amount > balance) return new Declined("insufficient prepaid balance");   // allowed by contract
        balance -= amount;
        return new Approved("PP-" + System.nanoTime());
    }
}`, alt: [
          { lang: 'python', code: `import time
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class Approved:
    txn_id: str


@dataclass(frozen=True)
class Declined:
    reason: str


ChargeResult = Approved | Declined


class PaymentGateway(ABC):
    @abstractmethod
    def charge(self, amount: float) -> ChargeResult: ...


class PrepaidCardGateway(PaymentGateway):
    def __init__(self) -> None:
        self._balance = 300.0

    def charge(self, amount: float) -> ChargeResult:
        if amount > self._balance:
            return Declined("insufficient prepaid balance")  # allowed by contract
        self._balance -= amount
        return Approved(f"PP-{time.monotonic_ns()}")` },
          { lang: 'ts', code: `type ChargeResult =
  | { kind: "approved"; txnId: string }
  | { kind: "declined"; reason: string };

interface PaymentGateway { charge(amount: number): ChargeResult; }

class PrepaidCardGateway implements PaymentGateway {
  private balance = 300;
  charge(amount: number): ChargeResult {
    if (amount > this.balance) return { kind: "declined", reason: "insufficient prepaid balance" }; // allowed by contract
    this.balance -= amount;
    return { kind: "approved", txnId: "PP-" + process.hrtime.bigint() };
  }
}` },
          { lang: 'cpp', code: `struct Approved { string txnId; };
struct Declined { string reason; };
using ChargeResult = variant<Approved, Declined>;

class PaymentGateway {
public:
    virtual ~PaymentGateway() = default;
    virtual ChargeResult charge(double amount) = 0;
};

class PrepaidCardGateway : public PaymentGateway {
    double balance_ = 300;
public:
    ChargeResult charge(double amount) override {
        if (amount > balance_) return Declined{"insufficient prepaid balance"};   // allowed by contract
        balance_ -= amount;
        return Approved{"PP-" + to_string(chrono::steady_clock::now().time_since_epoch().count())};
    }
};` },
  { lang: 'csharp', code: `
using System;

abstract class ChargeResult {
    private ChargeResult() { }
    public sealed class Approved : ChargeResult { public readonly string TxnId; public Approved(string txnId) { TxnId = txnId; } }
    public sealed class Declined : ChargeResult { public readonly string Reason; public Declined(string reason) { Reason = reason; } }
}

interface IPaymentGateway { ChargeResult Charge(double amount); }

class PrepaidCardGateway : IPaymentGateway {
    private double balance = 300;
    public ChargeResult Charge(double amount) {
        if (amount > balance) return new ChargeResult.Declined("insufficient prepaid balance");   // allowed by contract
        balance -= amount;
        return new ChargeResult.Approved("PP-" + DateTime.UtcNow.Ticks);
    }
}` }
        ] } }
    ],
    deepDive: `<p><b>Formal version (Liskov & Wing, 1994):</b> "Let φ(x) be a property provable about objects x of type T. Then φ(y) should be true for objects y of type S where S is a subtype of T." The provable property for Rectangle is "after setWidth(a), setHeight(b), area = a·b". Square cannot satisfy it, so Square is not a behavioural subtype — even though the compiler accepts <code>extends</code>.</p>
<p><b>What the compiler checks vs what it cannot.</b> The compiler enforces only the <i>signature</i> part (Java: overriding methods cannot reduce visibility, cannot throw broader <b>checked</b> exceptions and may return a subtype; C++ and TypeScript check parameter and return types; Python checks nothing until a type checker runs). No language checks unchecked exceptions, nulls, value ranges, side effects or invariants. That is why LSP is a design discipline and why <b>contract tests</b> exist: write one shared test suite for the interface (an abstract JUnit class such as <code>abstract class AccountContractTest { abstract Account create(); … }</code>, a pytest base class, a Jest function that takes a factory, a GoogleTest typed test) and run it against every implementation.</p>
<p><b>Variance connection.</b> LSP is why method parameters should be <i>contravariant</i> and return types <i>covariant</i> (a child may accept more and return less). Java generics show the same idea with PECS: <code>List&lt;? extends Number&gt;</code> for producers, <code>List&lt;? super Integer&gt;</code> for consumers.</p>
<p><b>Inheritance vs composition.</b> Most LSP violations come from inheriting to <b>reuse code</b> rather than to express a true subtype (<code>Stack extends Vector</code>, <code>Properties extends Hashtable</code> — both JDK regrets: Properties allows non-String values through Hashtable's <code>put</code>). Effective Java Item 18: "favor composition over inheritance". Closing a class to extension helps: Java <code>sealed</code> and <code>final</code>, C++ <code>final</code>, Python's <code>typing.final</code> (enforced by type checkers only); final-by-default languages such as Kotlin prevent accidental subtyping.</p>
<p><b>Real-world bites:</b> a <code>CachedRepository</code> subclass that returns stale data where the parent promised fresh; a "test double" that silently ignores writes so tests pass but behaviour differs; an <code>equals</code> override in a subclass that adds a field and breaks symmetry/transitivity (Effective Java Item 10). Microservices have LSP too: a new API version that rejects requests the old one accepted is a strengthened precondition — it breaks clients.</p>`,
    aiEra: `<p><b>What AI changes:</b> when an assistant hits "this subclass cannot do X", its favourite quick fix is <code>throw new UnsupportedOperationException()</code> or an <code>instanceof</code> check in the caller — both are LSP violations that compile and pass the happy-path test. As AI writes more hierarchies, spotting these "refused bequests" in review becomes your job.</p>
<p><b>Use AI as a partner:</b> ask <code>For this interface, list the implicit contract: preconditions, postconditions, invariants, exceptions. Then check each implementation against it.</code> Ask it to <b>generate contract tests</b>: <code>Write a shared contract test for the Account interface (JUnit 5, pytest, Jest or GoogleTest) that every implementation must pass.</code> AI is good at enumerating edge cases like nulls, zero, negative values and ordering.</p>
<p><b>Where AI goes wrong:</b> it reasons from real-world "is-a" ("a penguin is a bird, so extend Bird") instead of behavioural contracts, and it rarely notices weakened postconditions (returning null, returning stale data). <b>What you must still own:</b> defining the promises of your abstractions, deciding when to split a capability into its own interface, and choosing composition when inheritance would only reuse code.</p>`,
    problems: [{
      title: 'Fixed deposits that cannot withdraw',
      level: 'Medium', tags: ['LSP', 'interfaces', 'banking'], companies: ['Goldman Sachs', 'JPMorgan', 'Paytm'],
      statement: `<p>A bank models <code>Account</code> with <code>deposit</code>, <code>withdraw</code> and <code>balance</code>. <code>SavingsAccount</code> and <code>FixedDepositAccount</code> extend it, but a fixed deposit cannot be withdrawn before maturity, so its <code>withdraw</code> throws. A monthly job calls <code>withdraw(fee)</code> on every account and crashes on the first FD. Redesign the hierarchy so that the monthly job <b>cannot even compile</b> with an FD in its list, and FDs still support deposits (top-ups) and balance checks.</p>`,
      constraints: `<p>Balance must never go negative. Fees apply only to withdrawable accounts; FDs earn interest instead.</p>`,
      example: `<p>Accounts: Savings(1000), FD(5000), Savings(50). Monthly fee 100. ${H.c('r', 'Before:')} job crashes at FD → third account never charged. ${H.c('g', 'After:')} the job takes <code>List&lt;Withdrawable&gt;</code> and tries both savings accounts (the 1000 one is charged; the 50 one is skipped with "insufficient funds"). The FD is not in that list by construction.</p>`,
      brute: {
        why: `<p>FixedDepositAccount <b>strengthens the precondition</b> of <code>withdraw</code> (parent: "any amount ≤ balance"; child: "never"). Every client of <code>Account</code> must now guard with a type check (<code>instanceof</code> / <code>isinstance</code>) or try/catch, and the bug only appears when production data contains an FD — classic LSP violation.</p>`,
        code: { lang: 'java', code: `class Account {
    protected double balance;
    Account(double opening) { balance = opening; }
    void deposit(double amt) { balance += amt; }
    void withdraw(double amt) {
        if (amt > balance) throw new IllegalStateException("insufficient funds");
        balance -= amt;
    }
    double balance() { return balance; }
}
class SavingsAccount extends Account { SavingsAccount(double o) { super(o); } }
class FixedDepositAccount extends Account {
    FixedDepositAccount(double o) { super(o); }
    @Override void withdraw(double amt) { throw new UnsupportedOperationException("FD locked"); }
}
class MonthlyFeeJob {
    static void run(List<Account> accounts, double fee) {
        for (Account a : accounts) a.withdraw(fee);   // crashes on the first FD
    }
}`, alt: [
                { lang: 'python', code: `
class Account:
    def __init__(self, opening): self._balance = opening
    def deposit(self, amt): self._balance += amt
    def withdraw(self, amt):
        if amt > self._balance: raise RuntimeError("insufficient funds")
        self._balance -= amt
    def balance(self): return self._balance

class SavingsAccount(Account): pass

class FixedDepositAccount(Account):
    def withdraw(self, amt): raise NotImplementedError("FD locked")

class MonthlyFeeJob:
    @staticmethod
    def run(accounts, fee):
        for a in accounts: a.withdraw(fee)   # crashes on the first FD` },
                { lang: 'ts', code: `
class Account {
    protected _balance: number;
    constructor(opening: number) { this._balance = opening; }
    deposit(amt: number): void { this._balance += amt; }
    withdraw(amt: number): void {
        if (amt > this._balance) throw new Error("insufficient funds");
        this._balance -= amt;
    }
    balance(): number { return this._balance; }
}
class SavingsAccount extends Account { }
class FixedDepositAccount extends Account {
    override withdraw(amt: number): void { throw new Error("FD locked"); }
}
class MonthlyFeeJob {
    static run(accounts: Account[], fee: number): void {
        for (const a of accounts) a.withdraw(fee);   // crashes on the first FD
    }
}` },
                { lang: 'cpp', code: `
class Account {
protected:
    double bal;
public:
    Account(double opening) : bal(opening) {}
    virtual ~Account() = default;
    void deposit(double amt) { bal += amt; }
    virtual void withdraw(double amt) {
        if (amt > bal) throw runtime_error("insufficient funds");
        bal -= amt;
    }
    double balance() { return bal; }
};
class SavingsAccount : public Account { public: SavingsAccount(double o) : Account(o) {} };
class FixedDepositAccount : public Account {
public:
    FixedDepositAccount(double o) : Account(o) {}
    void withdraw(double amt) override { throw logic_error("FD locked"); }
};
struct MonthlyFeeJob {
    static void run(vector<Account*>& accounts, double fee) {
        for (Account* a : accounts) a->withdraw(fee);   // crashes on the first FD
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class Account {
    protected double balance;
    public Account(double opening) { balance = opening; }
    public void Deposit(double amt) { balance += amt; }
    public virtual void Withdraw(double amt) {
        if (amt > balance) throw new InvalidOperationException("insufficient funds");
        balance -= amt;
    }
    public double Balance { get { return balance; } }
}
class SavingsAccount : Account { public SavingsAccount(double o) : base(o) { } }
class FixedDepositAccount : Account {
    public FixedDepositAccount(double o) : base(o) { }
    public override void Withdraw(double amt) { throw new NotSupportedException("FD locked"); }
}
static class MonthlyFeeJob {
    public static void Run(List<Account> accounts, double fee) {
        foreach (Account a in accounts) a.Withdraw(fee);   // crashes on the first FD
    }
}` }
              ] }
      },
      mcq: { q: 'Which LSP rule does <code>FixedDepositAccount.withdraw</code> break?', options: ['It strengthens the precondition (and adds a surprise exception)', 'It weakens the postcondition of deposit', 'It changes the return type', 'None — throwing is always allowed'], answer: 0, explain: 'The parent accepts any amount up to the balance; the child accepts nothing. Callers relying on the parent contract break.' },
      hints: [
        `<p>Not every account can do everything. Which capability is shared by all (deposit, balance) and which only by some (withdraw)?</p>`,
        `<p>Make <code>Account</code> an interface with <code>deposit</code> + <code>balance</code>; create <code>Withdrawable extends Account</code> with <code>withdraw</code>. Savings implements Withdrawable; FD implements only Account (plus <code>mature()</code>).</p>`,
        `<p>The job's parameter type becomes <code>List&lt;Withdrawable&gt;</code> — the compiler now enforces the rule. Handle insufficient funds as a normal result (return boolean / skip), not by crashing the whole batch.</p>`
      ],
      tests: { io: true, cases: [{ stdin: '', stdout: "charged 1\n900.00 50.00 5885.00\namount must be positive\nmatured payout 5885.00\nFD balance 0.00 matured true\n" }] },
      solution: {
        approach: `<p><b>Split the capability, let the type system enforce it.</b> The shared contract (<code>Account</code>) contains only what every account can honour. <code>Withdrawable</code> adds withdrawal with a promise that savings accounts keep. FDs implement <code>Account</code> and add a maturity method. The monthly job declares exactly what it needs, so passing an FD is a compile error rather than a 3 AM incident. Insufficient funds is modelled as a <code>boolean</code> result so one poor account does not abort the batch.</p>`,
        code: `interface Account {
    void deposit(double amt);
    double balance();
}
interface Withdrawable extends Account {
    boolean withdraw(double amt);          // promise: true and balance reduced, or false and unchanged
}

class SavingsAccount implements Withdrawable {
    private double balance;
    SavingsAccount(double opening) { balance = opening; }
    public void deposit(double amt) { if (amt <= 0) throw new IllegalArgumentException("amount must be positive"); balance += amt; }
    public double balance() { return balance; }
    public boolean withdraw(double amt) {
        if (amt <= 0 || amt > balance) return false;
        balance -= amt;
        return true;
    }
}

class FixedDepositAccount implements Account {
    private double balance;
    private boolean matured;
    FixedDepositAccount(double opening) { balance = opening; }
    public void deposit(double amt) { if (amt <= 0) throw new IllegalArgumentException("amount must be positive"); balance += amt; }
    public double balance() { return balance; }
    void addInterest(double rate) { balance += balance * rate; }
    double mature() { matured = true; double out = balance; balance = 0; return out; }
    boolean isMatured() { return matured; }
}

class MonthlyFeeJob {
    static int run(List<? extends Withdrawable> accounts, double fee) {
        int charged = 0;
        for (Withdrawable a : accounts) if (a.withdraw(fee)) charged++;
        return charged;
    }

    public static void main(String[] args) {
        SavingsAccount s1 = new SavingsAccount(1000), s2 = new SavingsAccount(50);
        FixedDepositAccount fd = new FixedDepositAccount(5000);
        System.out.println("charged " + run(List.of(s1, s2), 100));   // charged 1: s2 cannot cover the fee
        // run(List.of(s1, fd), 100);  // does not compile: FD is not Withdrawable
        fd.deposit(500);                                              // top-ups still work
        fd.addInterest(0.07);
        System.out.println(String.format("%.2f %.2f %.2f", s1.balance(), s2.balance(), fd.balance()));
        try { s1.deposit(-1); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
        System.out.println(String.format("matured payout %.2f", fd.mature()));
        System.out.println(String.format("FD balance %.2f matured %b", fd.balance(), fd.isMatured()));
    }
}`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod


class Account(ABC):
    @abstractmethod
    def deposit(self, amt: float) -> None: ...

    @abstractmethod
    def balance(self) -> float: ...


class Withdrawable(Account):
    @abstractmethod
    def withdraw(self, amt: float) -> bool:
        """Promise: True and balance reduced, or False and unchanged."""


class SavingsAccount(Withdrawable):
    def __init__(self, opening: float) -> None:
        self._balance = opening

    def deposit(self, amt: float) -> None:
        if amt <= 0:
            raise ValueError("amount must be positive")
        self._balance += amt

    def balance(self) -> float:
        return self._balance

    def withdraw(self, amt: float) -> bool:
        if amt <= 0 or amt > self._balance:
            return False
        self._balance -= amt
        return True


class FixedDepositAccount(Account):
    def __init__(self, opening: float) -> None:
        self._balance = opening
        self._matured = False

    def deposit(self, amt: float) -> None:
        if amt <= 0:
            raise ValueError("amount must be positive")
        self._balance += amt

    def balance(self) -> float:
        return self._balance

    def add_interest(self, rate: float) -> None:
        self._balance += self._balance * rate

    def mature(self) -> float:
        self._matured = True
        out, self._balance = self._balance, 0.0
        return out

    def is_matured(self) -> bool:
        return self._matured


def run_monthly_fee(accounts: list[Withdrawable], fee: float) -> int:
    return sum(1 for a in accounts if a.withdraw(fee))


def main() -> None:
    s1, s2 = SavingsAccount(1000), SavingsAccount(50)
    fd = FixedDepositAccount(5000)
    print("charged", run_monthly_fee([s1, s2], 100))  # charged 1: s2 cannot cover the fee
    # run_monthly_fee([s1, fd], 100)  # a type checker (mypy/pyright) rejects this: FD is not Withdrawable
    fd.deposit(500)  # top-ups still work
    fd.add_interest(0.07)
    print(f"{s1.balance():.2f} {s2.balance():.2f} {fd.balance():.2f}")
    try:
        s1.deposit(-1)
    except ValueError as e:
        print(e)
    print(f"matured payout {fd.mature():.2f}")
    print(f"FD balance {fd.balance():.2f} matured {str(fd.is_matured()).lower()}")


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `interface Account {
  deposit(amt: number): void;
  balance(): number;
}
interface Withdrawable extends Account {
  withdraw(amt: number): boolean; // promise: true and balance reduced, or false and unchanged
}

class SavingsAccount implements Withdrawable {
  private bal: number;
  constructor(opening: number) { this.bal = opening; }
  deposit(amt: number): void {
    if (amt <= 0) throw new Error("amount must be positive");
    this.bal += amt;
  }
  balance(): number { return this.bal; }
  withdraw(amt: number): boolean {
    if (amt <= 0 || amt > this.bal) return false;
    this.bal -= amt;
    return true;
  }
}

class FixedDepositAccount implements Account {
  private bal: number;
  private matured = false;
  constructor(opening: number) { this.bal = opening; }
  deposit(amt: number): void {
    if (amt <= 0) throw new Error("amount must be positive");
    this.bal += amt;
  }
  balance(): number { return this.bal; }
  addInterest(rate: number): void { this.bal += this.bal * rate; }
  mature(): number {
    this.matured = true;
    const out = this.bal;
    this.bal = 0;
    return out;
  }
  isMatured(): boolean { return this.matured; }
}

function runMonthlyFee(accounts: readonly Withdrawable[], fee: number): number {
  let charged = 0;
  for (const a of accounts) if (a.withdraw(fee)) charged++;
  return charged;
}

function main(): void {
  const s1 = new SavingsAccount(1000), s2 = new SavingsAccount(50);
  const fd = new FixedDepositAccount(5000);
  console.log("charged " + runMonthlyFee([s1, s2], 100)); // charged 1: s2 cannot cover the fee
  // runMonthlyFee([s1, fd], 100);  // does not compile: FD has no withdraw()
  fd.deposit(500); // top-ups still work
  fd.addInterest(0.07);
  console.log(\`\${s1.balance().toFixed(2)} \${s2.balance().toFixed(2)} \${fd.balance().toFixed(2)}\`);
  try {
    s1.deposit(-1);
  } catch (e) {
    console.log((e as Error).message);
  }
  console.log(\`matured payout \${fd.mature().toFixed(2)}\`);
  console.log(\`FD balance \${fd.balance().toFixed(2)} matured \${fd.isMatured()}\`);
}
main();` },
          { lang: 'cpp', code: `class Account {
public:
    virtual ~Account() = default;
    virtual void deposit(double amt) = 0;
    virtual double balance() const = 0;
};

class Withdrawable : public Account {
public:
    // promise: true and balance reduced, or false and unchanged
    virtual bool withdraw(double amt) = 0;
};

class SavingsAccount : public Withdrawable {
    double balance_;
public:
    explicit SavingsAccount(double opening) : balance_(opening) {}
    void deposit(double amt) override {
        if (amt <= 0) throw invalid_argument("amount must be positive");
        balance_ += amt;
    }
    double balance() const override { return balance_; }
    bool withdraw(double amt) override {
        if (amt <= 0 || amt > balance_) return false;
        balance_ -= amt;
        return true;
    }
};

class FixedDepositAccount : public Account {
    double balance_;
    bool matured_ = false;
public:
    explicit FixedDepositAccount(double opening) : balance_(opening) {}
    void deposit(double amt) override {
        if (amt <= 0) throw invalid_argument("amount must be positive");
        balance_ += amt;
    }
    double balance() const override { return balance_; }
    void addInterest(double rate) { balance_ += balance_ * rate; }
    double mature() { matured_ = true; return exchange(balance_, 0.0); }
    bool isMatured() const { return matured_; }
};

int runMonthlyFee(const vector<Withdrawable*>& accounts, double fee) {
    int charged = 0;
    for (Withdrawable* a : accounts) if (a->withdraw(fee)) ++charged;
    return charged;
}

int main() {
    SavingsAccount s1(1000), s2(50);
    FixedDepositAccount fd(5000);
    cout << "charged " << runMonthlyFee({&s1, &s2}, 100) << "\\n";   // charged 1: s2 cannot cover the fee
    // runMonthlyFee({&s1, &fd}, 100);  // does not compile: FixedDepositAccount* is not Withdrawable*
    fd.deposit(500);                                                // top-ups still work
    fd.addInterest(0.07);
    cout << fixed << setprecision(2) << s1.balance() << " " << s2.balance() << " " << fd.balance() << "\\n";
    try {
        s1.deposit(-1);
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";
    }
    cout << "matured payout " << fd.mature() << "\\n";
    cout << "FD balance " << fd.balance() << " matured " << boolalpha << fd.isMatured() << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

interface IAccount {
    void Deposit(double amt);
    double Balance { get; }
}
interface IWithdrawable : IAccount {
    bool Withdraw(double amt);          // promise: true and balance reduced, or false and unchanged
}

class SavingsAccount : IWithdrawable {
    private double balance;
    public SavingsAccount(double opening) { balance = opening; }
    public void Deposit(double amt) { if (amt <= 0) throw new ArgumentException("amount must be positive"); balance += amt; }
    public double Balance { get { return balance; } }
    public bool Withdraw(double amt) {
        if (amt <= 0 || amt > balance) return false;
        balance -= amt;
        return true;
    }
}

class FixedDepositAccount : IAccount {
    private double balance;
    private bool matured;
    public FixedDepositAccount(double opening) { balance = opening; }
    public void Deposit(double amt) { if (amt <= 0) throw new ArgumentException("amount must be positive"); balance += amt; }
    public double Balance { get { return balance; } }
    public void AddInterest(double rate) { balance += balance * rate; }
    public double Mature() { matured = true; double result = balance; balance = 0; return result; }
    public bool IsMatured { get { return matured; } }
}

static class MonthlyFeeJob {
    public static int Run(IEnumerable<IWithdrawable> accounts, double fee) {
        int charged = 0;
        foreach (IWithdrawable a in accounts) if (a.Withdraw(fee)) charged++;
        return charged;
    }
}

class Program {
    static void Main() {
        SavingsAccount s1 = new SavingsAccount(1000), s2 = new SavingsAccount(50);
        FixedDepositAccount fd = new FixedDepositAccount(5000);
        Console.WriteLine("charged " + MonthlyFeeJob.Run(new[] { s1, s2 }, 100));   // charged 1: s2 cannot cover the fee
        // MonthlyFeeJob.Run(new IAccount[] { s1, fd }, 100);  // does not compile: FD is not IWithdrawable
        fd.Deposit(500);                                              // top-ups still work
        fd.AddInterest(0.07);
        Console.WriteLine(s1.Balance.ToString("F2") + " " + s2.Balance.ToString("F2") + " " + fd.Balance.ToString("F2"));
        try { s1.Deposit(-1); } catch (ArgumentException e) { Console.WriteLine(e.Message); }
        Console.WriteLine("matured payout " + fd.Mature().ToString("F2"));
        Console.WriteLine("FD balance " + fd.Balance.ToString("F2") + " matured " + fd.IsMatured.ToString().ToLower());
    }
}` }
        ],
        complexity: `<p>O(n) for the job over n accounts, O(1) per operation. The real gain: a whole class of runtime crashes became compile-time errors.</p>`,
        followUps: ['An overdraft account allows balance down to −5000. Does it still satisfy <code>Withdrawable</code>\'s promise? What invariant must the interface state?', 'Write an abstract contract test that every <code>Withdrawable</code> must pass.', 'Should <code>mature()</code> return an amount or transfer to a linked savings account?']
      }
    }]
  });

  /* ======================= TOPIC 5: ISP ======================= */
  var T5_BAD = `interface Machine {
  void print(String doc);
  void scan(String doc);
  void fax(String doc, String number);
}
class BasicPrinter implements Machine {
  public void print(String d) { System.out.println(d); }
  public void scan(String d) {
    throw new UnsupportedOperationException();
  }
  public void fax(String d, String n) {
    throw new UnsupportedOperationException();
  }
}`;
  var T5_GOOD = `interface Printer { void print(String doc); }
interface Scanner { String scan(String doc); }
interface Fax { void fax(String doc, String number); }

class BasicPrinter implements Printer {
  public void print(String d) { System.out.println(d); }
}
class OfficeMachine implements Printer, Scanner, Fax {
  public void print(String d) { System.out.println(d); }
  public String scan(String d) { return "scan:" + d; }
  public void fax(String d, String n) { System.out.println(n); }
}
class PrintQueue {               // needs printing only
  private final Printer printer;
  PrintQueue(Printer p) { printer = p; }
}`;

  topics.push({
    title: 'I — Interface Segregation Principle (ISP)',
    analogy: `<p>At a restaurant, imagine the menu were a <b>200-page binder</b> containing the kitchen's supplier contracts, staff rosters and tax filings — just because they are all "restaurant stuff". You only wanted dessert. Worse, every time the supplier contract changes, the waiter brings you a reprinted binder. A good restaurant gives <b>each person the small card they need</b>: a dessert menu for you, a recipe card for the chef, an invoice for the accountant. ISP says: <b>give each client a small interface with only the methods it uses</b>.</p>`,
    explain: `<p><b>Official wording:</b> "Clients should not be forced to depend upon interfaces that they do not use." A <b>client</b> here is any code that calls or implements an interface.</p>
<p><b>Two kinds of pain from a fat interface:</b></p>
<ol>
<li><b>Implementers suffer:</b> a simple <code>BasicPrinter</code> must implement <code>scan()</code> and <code>fax()</code> it cannot do, so it throws or does nothing — which also breaks <b>LSP</b>.</li>
<li><b>Callers suffer:</b> <code>PrintQueue</code> only prints, yet depends on the whole <code>Machine</code>. When someone changes <code>fax()</code>'s signature, PrintQueue must be recompiled, re-tested and redeployed — a ripple through code that never faxes. Its tests must also mock methods it never calls.</li>
</ol>
${H.table(['Implementer', 'print', 'scan', 'fax'], [
  ['BasicPrinter', H.c('g', 'real'), H.c('r', 'throws'), H.c('r', 'throws')],
  ['OfficeMachine', H.c('g', 'real'), H.c('g', 'real'), H.c('g', 'real')],
  ['PhoneScannerApp', H.c('r', 'throws'), H.c('g', 'real'), H.c('r', 'throws')]
])}
<p>Count the red cells: 4 forced, fake implementations. Each is a lie the type system tells: "this object can fax" — it cannot.</p>
<p><b>The refactor:</b> split by <b>client role</b>, not by random size: <code>Printer</code>, <code>Scanner</code>, <code>Fax</code>. A multi-function machine implements all three (Java, TypeScript and C++ classes can implement many interfaces; Python uses multiple inheritance). Each client asks for exactly the role it needs: <code>PrintQueue(Printer p)</code>. If some client really needs two roles together, define a small combined interface (<code>interface Copier extends Printer, Scanner {}</code>).</p>
<p><b>Smell checklist:</b> methods that throw <code>UnsupportedOperationException</code>; empty "do nothing" implementations; mocks in tests that stub 10 methods to test 1; interfaces named after a <i>thing</i> (<code>Machine</code>, <code>UserService</code> with 40 methods) rather than a <i>role</i> (<code>Printable</code>, <code>UserReader</code>); a change to one method forcing unrelated modules to rebuild.</p>
<p><b>ISP vs SRP:</b> SRP is about why a <i>class</i> changes; ISP is about what a <i>client sees</i>. A class can stay one cohesive thing (OfficeMachine) while exposing several narrow interfaces to different clients.</p>`,
    clues: [
      'An implementation full of <code>throw new UnsupportedOperationException()</code> or empty methods → fat interface (ISP) and usually LSP too.',
      '"Some devices support X but not Y" / "not all users can do Z" → split capabilities into role interfaces.',
      '"Read-only client" / "reporting service only reads" → separate <code>Reader</code> and <code>Writer</code> interfaces (CQRS at class level).',
      'Tests need to mock 15 methods to test a class that calls 2 → the class depends on too much.',
      'A <code>XxxService</code> interface with 30+ methods used by many teams → split per client.',
      '"Changing one method forces unrelated modules to recompile/redeploy" → interface coupling.'
    ],
    code: [{ lang: 'java', title: 'Before: one fat Machine interface', code: `interface Machine {
    void print(String doc);
    String scan(String doc);
    void fax(String doc, String number);
}

class BasicPrinter implements Machine {
    public void print(String doc) { System.out.println("Printing " + doc); }
    public String scan(String doc) { throw new UnsupportedOperationException("cannot scan"); }  // forced lie
    public void fax(String doc, String n) { throw new UnsupportedOperationException("cannot fax"); }  // forced lie
}

class PrintQueue {                // only prints, but sees (and is coupled to) scan + fax
    private final Machine machine;
    PrintQueue(Machine machine) { this.machine = machine; }
    void flush(List<String> docs) { docs.forEach(machine::print); }
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod


class Machine(ABC):
    @abstractmethod
    def print(self, doc: str) -> None: ...

    @abstractmethod
    def scan(self, doc: str) -> str: ...

    @abstractmethod
    def fax(self, doc: str, number: str) -> None: ...


class BasicPrinter(Machine):
    def print(self, doc: str) -> None:
        print(f"Printing {doc}")

    def scan(self, doc: str) -> str:
        raise NotImplementedError("cannot scan")  # forced lie

    def fax(self, doc: str, number: str) -> None:
        raise NotImplementedError("cannot fax")  # forced lie


class PrintQueue:  # only prints, but sees (and is coupled to) scan + fax
    def __init__(self, machine: Machine) -> None:
        self._machine = machine

    def flush(self, docs: list[str]) -> None:
        for d in docs:
            self._machine.print(d)` },
          { lang: 'ts', code: `interface Machine {
  print(doc: string): void;
  scan(doc: string): string;
  fax(doc: string, number: string): void;
}

class BasicPrinter implements Machine {
  print(doc: string): void { console.log(\`Printing \${doc}\`); }
  scan(_doc: string): string { throw new Error("cannot scan"); } // forced lie
  fax(_doc: string, _number: string): void { throw new Error("cannot fax"); } // forced lie
}

class PrintQueue { // only prints, but sees (and is coupled to) scan + fax
  constructor(private readonly machine: Machine) {}
  flush(docs: string[]): void { docs.forEach((d) => this.machine.print(d)); }
}` },
          { lang: 'cpp', code: `class Machine {
public:
    virtual ~Machine() = default;
    virtual void print(const string& doc) = 0;
    virtual string scan(const string& doc) = 0;
    virtual void fax(const string& doc, const string& number) = 0;
};

class BasicPrinter : public Machine {
public:
    void print(const string& doc) override { cout << "Printing " << doc << "\\n"; }
    string scan(const string&) override { throw logic_error("cannot scan"); }       // forced lie
    void fax(const string&, const string&) override { throw logic_error("cannot fax"); }   // forced lie
};

class PrintQueue {   // only prints, but sees (and is coupled to) scan + fax
    Machine& machine_;
public:
    explicit PrintQueue(Machine& machine) : machine_(machine) {}
    void flush(const vector<string>& docs) {
        for (const string& d : docs) machine_.print(d);
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

interface IMachine {
    void Print(string doc);
    string Scan(string doc);
    void Fax(string doc, string number);
}

class BasicPrinter : IMachine {
    public void Print(string doc) { Console.WriteLine("Printing " + doc); }
    public string Scan(string doc) { throw new NotSupportedException("cannot scan"); }  // forced lie
    public void Fax(string doc, string n) { throw new NotSupportedException("cannot fax"); }  // forced lie
}

class PrintQueue {                // only prints, but sees (and is coupled to) Scan + Fax
    private readonly IMachine machine;
    public PrintQueue(IMachine machine) { this.machine = machine; }
    public void Flush(List<string> docs) { docs.ForEach(machine.Print); }
}` }
        ] }, { lang: 'java', title: 'After: role interfaces, each client depends on what it uses', code: `interface Printer { void print(String doc); }
interface Scanner { String scan(String doc); }
interface Fax     { void fax(String doc, String number); }
interface Copier extends Printer, Scanner {      // composed role for clients that need both
    default void copy(String doc) { print(scan(doc)); }
}

class BasicPrinter implements Printer {
    public void print(String doc) { System.out.println("Printing " + doc); }
}

class OfficeMachine implements Copier, Fax {
    public void print(String doc) { System.out.println("Office printing " + doc); }
    public String scan(String doc) { return "[scanned " + doc + "]"; }
    public void fax(String doc, String number) { System.out.println("Fax " + doc + " to " + number); }
}

class PrintQueue {
    private final Printer printer;                 // narrow dependency
    PrintQueue(Printer printer) { this.printer = printer; }
    void flush(List<String> docs) { docs.forEach(printer::print); }
}

class Main {
    public static void main(String[] args) {
        new PrintQueue(new BasicPrinter()).flush(List.of("a.pdf", "b.pdf"));
        new PrintQueue(new OfficeMachine()).flush(List.of("c.pdf"));   // office machine is also a Printer
        new OfficeMachine().copy("id-card");
    }
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod


class Printer(ABC):
    @abstractmethod
    def print(self, doc: str) -> None: ...


class Scanner(ABC):
    @abstractmethod
    def scan(self, doc: str) -> str: ...


class Fax(ABC):
    @abstractmethod
    def fax(self, doc: str, number: str) -> None: ...


class Copier(Printer, Scanner):  # composed role for clients that need both
    def copy(self, doc: str) -> None:
        self.print(self.scan(doc))


class BasicPrinter(Printer):
    def print(self, doc: str) -> None:
        print(f"Printing {doc}")


class OfficeMachine(Copier, Fax):
    def print(self, doc: str) -> None:
        print(f"Office printing {doc}")

    def scan(self, doc: str) -> str:
        return f"[scanned {doc}]"

    def fax(self, doc: str, number: str) -> None:
        print(f"Fax {doc} to {number}")


class PrintQueue:
    def __init__(self, printer: Printer) -> None:  # narrow dependency
        self._printer = printer

    def flush(self, docs: list[str]) -> None:
        for d in docs:
            self._printer.print(d)


if __name__ == "__main__":
    PrintQueue(BasicPrinter()).flush(["a.pdf", "b.pdf"])
    PrintQueue(OfficeMachine()).flush(["c.pdf"])  # office machine is also a Printer
    OfficeMachine().copy("id-card")` },
          { lang: 'ts', code: `interface Printer { print(doc: string): void; }
interface Scanner { scan(doc: string): string; }
interface Fax { fax(doc: string, number: string): void; }
interface Copier extends Printer, Scanner { // composed role for clients that need both
  copy(doc: string): void;
}

class BasicPrinter implements Printer {
  print(doc: string): void { console.log(\`Printing \${doc}\`); }
}

class OfficeMachine implements Copier, Fax {
  print(doc: string): void { console.log(\`Office printing \${doc}\`); }
  scan(doc: string): string { return \`[scanned \${doc}]\`; }
  fax(doc: string, number: string): void { console.log(\`Fax \${doc} to \${number}\`); }
  copy(doc: string): void { this.print(this.scan(doc)); }
}

class PrintQueue {
  constructor(private readonly printer: Printer) {} // narrow dependency
  flush(docs: string[]): void { docs.forEach((d) => this.printer.print(d)); }
}

new PrintQueue(new BasicPrinter()).flush(["a.pdf", "b.pdf"]);
new PrintQueue(new OfficeMachine()).flush(["c.pdf"]); // office machine is also a Printer
new OfficeMachine().copy("id-card");` },
          { lang: 'cpp', code: `class Printer {
public:
    virtual ~Printer() = default;
    virtual void print(const string& doc) = 0;
};
class Scanner {
public:
    virtual ~Scanner() = default;
    virtual string scan(const string& doc) = 0;
};
class Fax {
public:
    virtual ~Fax() = default;
    virtual void fax(const string& doc, const string& number) = 0;
};
class Copier : public Printer, public Scanner {   // composed role for clients that need both
public:
    void copy(const string& doc) { print(scan(doc)); }
};

class BasicPrinter : public Printer {
public:
    void print(const string& doc) override { cout << "Printing " << doc << "\\n"; }
};

class OfficeMachine : public Copier, public Fax {
public:
    void print(const string& doc) override { cout << "Office printing " << doc << "\\n"; }
    string scan(const string& doc) override { return "[scanned " + doc + "]"; }
    void fax(const string& doc, const string& number) override { cout << "Fax " << doc << " to " << number << "\\n"; }
};

class PrintQueue {
    Printer& printer_;   // narrow dependency
public:
    explicit PrintQueue(Printer& printer) : printer_(printer) {}
    void flush(const vector<string>& docs) {
        for (const string& d : docs) printer_.print(d);
    }
};

int main() {
    BasicPrinter basic;
    OfficeMachine office;
    PrintQueue(basic).flush({"a.pdf", "b.pdf"});
    PrintQueue(office).flush({"c.pdf"});   // office machine is also a Printer
    office.copy("id-card");
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

interface IPrinter { void Print(string doc); }
interface IScanner { string Scan(string doc); }
interface IFax     { void Fax(string doc, string number); }
interface ICopier : IPrinter, IScanner { }       // composed role for clients that need both
static class CopierExt {
    public static void Copy(this ICopier c, string doc) { c.Print(c.Scan(doc)); }   // shared behaviour on the role
}

class BasicPrinter : IPrinter {
    public void Print(string doc) { Console.WriteLine("Printing " + doc); }
}

class OfficeMachine : ICopier, IFax {
    public void Print(string doc) { Console.WriteLine("Office printing " + doc); }
    public string Scan(string doc) { return "[scanned " + doc + "]"; }
    public void Fax(string doc, string number) { Console.WriteLine("Fax " + doc + " to " + number); }
}

class PrintQueue {
    private readonly IPrinter printer;              // narrow dependency
    public PrintQueue(IPrinter printer) { this.printer = printer; }
    public void Flush(List<string> docs) { docs.ForEach(printer.Print); }
}

class Program {
    static void Main() {
        new PrintQueue(new BasicPrinter()).Flush(new List<string> { "a.pdf", "b.pdf" });
        new PrintQueue(new OfficeMachine()).Flush(new List<string> { "c.pdf" });   // office machine is also an IPrinter
        new OfficeMachine().Copy("id-card");
    }
}` }
        ] }],
    codeTitle: ['Bad: fat interface', 'Good: segregated roles'],
    viz: [{
      title: 'Change one method: who must rebuild? (fat vs segregated)',
      input: 'fax',
      inputLabel: 'Which method signature changes? print | scan | fax',
      gen: function (input) {
        var m = pick(input, { print: 1, scan: 1, fax: 1 }, 'Type one of: print, scan, fax');
        var bn = [B('PQ', 'PrintQueue', 15, 6), B('SA', 'ScanApp', 50, 6), B('FS', 'FaxService', 85, 6),
          B('MA', '«Machine»', 50, 28), B('BP', 'BasicPrinter', 25, 50), B('OM', 'OfficeMachine', 75, 50)];
        var be = [['PQ', 'MA'], ['SA', 'MA'], ['FS', 'MA'], ['BP', 'MA'], ['OM', 'MA']];
        var an = [B('PQ', 'PrintQueue', 15, 6), B('SA', 'ScanApp', 50, 6), B('FS', 'FaxService', 85, 6),
          B('IP', '«Printer»', 15, 28), B('IS', '«Scanner»', 50, 28), B('IF', '«Fax»', 85, 28),
          B('BP', 'BasicPrinter', 22, 50), B('OM', 'OfficeMachine', 70, 50)];
        var ae = [['PQ', 'IP'], ['SA', 'IS'], ['FS', 'IF'], ['BP', 'IP'], ['OM', 'IP'], ['OM', 'IS'], ['OM', 'IF']];
        var why = 'the <code>' + m + '()</code> method gets a new parameter (e.g. an <code>Options</code> object).';
        var frames = [F('<b>Before:</b> three clients and two implementers all hang off one fat <b>«Machine»</b> interface. BasicPrinter is forced to fake <code>scan</code> and <code>fax</code> (tags show the lies).',
          [G('Fat interface', bn, be, { ehl: paint(be, 'bad'), hl: { MA: 'bad', BP: 'bad' }, tags: { BP: '2 fake methods', MA: '3 methods' } })])];
        frames = frames.concat(ripple('Fat interface', bn, be, 'MA', why + ' The change is in «Machine», so everything attached to it is affected —', 'bad'));
        frames.push(F('<b>After ISP:</b> three role interfaces. Each client points at exactly one role. BasicPrinter implements only «Printer» — no fake methods. OfficeMachine implements all three roles.',
          [G('Segregated roles', an, ae, { ehl: paint(ae, 'ok'), hl: { IP: 'sel', IS: 'sel', IF: 'sel' }, tags: { BP: '0 fake methods' } })]));
        var start = { print: 'IP', scan: 'IS', fax: 'IF' }[m];
        frames = frames.concat(ripple('Segregated roles', an, ae, start, why + ' Only the role that owns this method changes —', 'ok'));
        frames.push(F('Compare the blast radius: with the fat interface a change to <code>' + m + '()</code> touched all 6 boxes, including clients that never call it. With role interfaces it touched only the role, its one client and its real implementers.',
          [{ type: 'table', label: 'Who had to rebuild?', columns: ['Box', 'Fat interface', 'Role interfaces'], rows: [
            ['PrintQueue', 'yes', m === 'print' ? 'yes (uses print)' : 'no'], ['ScanApp', 'yes', m === 'scan' ? 'yes (uses scan)' : 'no'], ['FaxService', 'yes', m === 'fax' ? 'yes (uses fax)' : 'no'],
            ['BasicPrinter', 'yes', m === 'print' ? 'yes' : 'no'], ['OfficeMachine', 'yes', 'yes']] }]));
        return frames;
      }
    }, {
      title: 'Refactor: from fake methods to role interfaces',
      gen: function () {
        var grid = function (rows, hl) { return { type: 'grid', label: 'Implementer × method (✔ real, ✘ forced fake)', colHead: ['print', 'scan', 'fax'], rowHead: ['BasicPrinter', 'OfficeMachine'], rows: rows, hl: hl || {} }; };
        return [
          F('The fat interface: three methods, every implementer must provide all three.', [CODE('Before', T5_BAD, { 1: 'cur', 2: 'cur', 3: 'cur', 4: 'cur' }), grid([['✔', '✘', '✘'], ['✔', '✔', '✔']], { '0,1': 'bad', '0,2': 'bad' })]),
          F('<span class="c-r">Forced lies:</span> BasicPrinter cannot scan or fax, so it throws. Any client that receives a <code>Machine</code> and calls <code>scan()</code> will crash if it got a BasicPrinter — ISP violation causing an LSP violation.', [CODE('Before', T5_BAD, { 8: 'bad', 9: 'bad', 11: 'bad', 12: 'bad' }), grid([['✔', '✘', '✘'], ['✔', '✔', '✔']], { '0,1': 'bad', '0,2': 'bad' })]),
          F('Step 1: split by <b>role</b> — one interface per capability a client needs.', [CODE('After', T5_GOOD, { 1: 'ok', 2: 'ok', 3: 'ok' })]),
          F('Step 2: BasicPrinter implements only what it can really do. No throwing stubs left.', [CODE('After', T5_GOOD, { 5: 'ok', 6: 'ok', 7: 'ok' }), grid([['✔', '—', '—'], ['✔', '✔', '✔']], { '0,0': 'ok', '1,0': 'ok', '1,1': 'ok', '1,2': 'ok' })]),
          F('Step 3: a capable class implements several roles. Java allows any number of interfaces, so nothing is lost.', [CODE('After', T5_GOOD, { 8: 'ok', 9: 'ok', 10: 'ok', 11: 'ok' })]),
          F('Step 4: clients ask for the narrowest role. PrintQueue takes a <code>Printer</code>: it can be given a BasicPrinter <i>or</i> an OfficeMachine, its tests mock one method, and fax changes never reach it.', [CODE('After', T5_GOOD, { 13: 'ok', 14: 'ok', 15: 'ok' })])
        ];
      }
    }],
    examples: [
      { title: 'Standard libraries love tiny role interfaces', html: `<p>In Java: <code>Runnable</code> (1 method), <code>Comparable</code> (1), <code>AutoCloseable</code> (1), <code>Iterable</code> (1 abstract), <code>Supplier</code>/<code>Consumer</code>/<code>Function</code>. Because they are tiny, <i>anything</i> can implement them and try-with-resources works with any <code>AutoCloseable</code> (Python's <code>with</code> needs only <code>__enter__</code> and <code>__exit__</code>; C++ RAII needs only a destructor) — a database connection, a file, your own lock wrapper. Small interfaces are the most reusable abstractions ever written.</p>`, code: { lang: 'java', code: `class Lease implements AutoCloseable {
    Lease() { System.out.println("lease taken"); }
    @Override public void close() { System.out.println("lease released"); }   // the ONLY method required
}
class Use {
    public static void main(String[] args) {
        try (Lease l = new Lease()) { System.out.println("working"); }       // works with any AutoCloseable
    }
}`, alt: [
          { lang: 'python', code: `class Lease:
    def __init__(self) -> None:
        print("lease taken")

    def __enter__(self) -> "Lease":
        return self

    def __exit__(self, *exc: object) -> None:  # the ONLY methods required
        print("lease released")


if __name__ == "__main__":
    with Lease():  # works with any context manager
        print("working")` },
          { lang: 'ts', code: `interface Closeable { close(): void; } // the ONLY method required

class Lease implements Closeable {
  constructor() { console.log("lease taken"); }
  close(): void { console.log("lease released"); }
}

function using<T extends Closeable>(resource: T, body: (r: T) => void): void {
  try {
    body(resource);
  } finally {
    resource.close();
  }
}

using(new Lease(), () => console.log("working")); // works with any Closeable` },
          { lang: 'cpp', code: `class Lease {   // RAII: the destructor is the "close" method, and it always runs
public:
    Lease() { cout << "lease taken\\n"; }
    ~Lease() { cout << "lease released\\n"; }
    Lease(const Lease&) = delete;
    Lease& operator=(const Lease&) = delete;
};

int main() {
    Lease lease;
    cout << "working\\n";
}` },
  { lang: 'csharp', code: `
using System;

class Lease : IDisposable {
    public Lease() { Console.WriteLine("lease taken"); }
    public void Dispose() { Console.WriteLine("lease released"); }   // the ONLY method required
}
class Program {
    static void Main() {
        using (Lease l = new Lease()) { Console.WriteLine("working"); }   // works with any IDisposable
    }
}` }
        ] } },
      { title: 'Reader vs Writer: a repository split', html: `<p>A <code>ProductRepository</code> with 25 methods (find, search, save, delete, bulkImport, exportCsv, stats…) is used by the product page (reads), the admin panel (writes) and the nightly import (bulk). ${H.c('g', 'ISP split:')} <code>ProductReader</code>, <code>ProductWriter</code>, <code>ProductBulkImporter</code>. The product page now cannot accidentally delete; its tests fake 2 methods instead of 25; read side can later be served from a cache or replica without touching writers. This is CQRS in miniature.</p>`, code: { lang: 'java', code: `record Product(String sku, String name, double price) {}
interface ProductReader { Optional<Product> bySku(String sku); List<Product> search(String text); }
interface ProductWriter { void save(Product p); void delete(String sku); }

class InMemoryProducts implements ProductReader, ProductWriter {     // one class, two roles
    private final Map<String, Product> data = new HashMap<>();
    public Optional<Product> bySku(String sku) { return Optional.ofNullable(data.get(sku)); }
    public List<Product> search(String t) { return data.values().stream().filter(p -> p.name().contains(t)).toList(); }
    public void save(Product p) { data.put(p.sku(), p); }
    public void delete(String sku) { data.remove(sku); }
}

class ProductPage {                       // can only read: deleting is impossible by type
    private final ProductReader reader;
    ProductPage(ProductReader reader) { this.reader = reader; }
    String render(String sku) { return reader.bySku(sku).map(Product::name).orElse("Not found"); }
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class Product:
    sku: str
    name: str
    price: float


class ProductReader(ABC):
    @abstractmethod
    def by_sku(self, sku: str) -> Optional[Product]: ...

    @abstractmethod
    def search(self, text: str) -> list[Product]: ...


class ProductWriter(ABC):
    @abstractmethod
    def save(self, p: Product) -> None: ...

    @abstractmethod
    def delete(self, sku: str) -> None: ...


class InMemoryProducts(ProductReader, ProductWriter):  # one class, two roles
    def __init__(self) -> None:
        self._data: dict[str, Product] = {}

    def by_sku(self, sku: str) -> Optional[Product]:
        return self._data.get(sku)

    def search(self, text: str) -> list[Product]:
        return [p for p in self._data.values() if text in p.name]

    def save(self, p: Product) -> None:
        self._data[p.sku] = p

    def delete(self, sku: str) -> None:
        self._data.pop(sku, None)


class ProductPage:  # can only read: deleting is impossible by type
    def __init__(self, reader: ProductReader) -> None:
        self._reader = reader

    def render(self, sku: str) -> str:
        p = self._reader.by_sku(sku)
        return p.name if p else "Not found"` },
          { lang: 'ts', code: `interface Product { readonly sku: string; readonly name: string; readonly price: number; }
interface ProductReader { bySku(sku: string): Product | undefined; search(text: string): Product[]; }
interface ProductWriter { save(p: Product): void; delete(sku: string): void; }

class InMemoryProducts implements ProductReader, ProductWriter { // one class, two roles
  private readonly data = new Map<string, Product>();
  bySku(sku: string): Product | undefined { return this.data.get(sku); }
  search(t: string): Product[] { return [...this.data.values()].filter((p) => p.name.includes(t)); }
  save(p: Product): void { this.data.set(p.sku, p); }
  delete(sku: string): void { this.data.delete(sku); }
}

class ProductPage { // can only read: deleting is impossible by type
  constructor(private readonly reader: ProductReader) {}
  render(sku: string): string { return this.reader.bySku(sku)?.name ?? "Not found"; }
}` },
          { lang: 'cpp', code: `struct Product {
    string sku, name;
    double price;
};

class ProductReader {
public:
    virtual ~ProductReader() = default;
    virtual optional<Product> bySku(const string& sku) const = 0;
    virtual vector<Product> search(const string& text) const = 0;
};
class ProductWriter {
public:
    virtual ~ProductWriter() = default;
    virtual void save(const Product& p) = 0;
    virtual void remove(const string& sku) = 0;   // Java: delete (a C++ keyword)
};

class InMemoryProducts : public ProductReader, public ProductWriter {   // one class, two roles
    unordered_map<string, Product> data_;
public:
    optional<Product> bySku(const string& sku) const override {
        auto it = data_.find(sku);
        if (it == data_.end()) return nullopt;
        return it->second;
    }
    vector<Product> search(const string& t) const override {
        vector<Product> out;
        for (const auto& [sku, p] : data_) if (p.name.find(t) != string::npos) out.push_back(p);
        return out;
    }
    void save(const Product& p) override { data_[p.sku] = p; }
    void remove(const string& sku) override { data_.erase(sku); }
};

class ProductPage {   // can only read: deleting is impossible by type
    const ProductReader& reader_;
public:
    explicit ProductPage(const ProductReader& reader) : reader_(reader) {}
    string render(const string& sku) const {
        auto p = reader_.bySku(sku);
        return p ? p->name : "Not found";
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

sealed class Product {
    public readonly string Sku, Name; public readonly double Price;
    public Product(string sku, string name, double price) { Sku = sku; Name = name; Price = price; }
}
interface IProductReader { Product BySku(string sku); List<Product> Search(string text); }   // BySku: null when absent
interface IProductWriter { void Save(Product p); void Delete(string sku); }

class InMemoryProducts : IProductReader, IProductWriter {     // one class, two roles
    private readonly Dictionary<string, Product> data = new Dictionary<string, Product>();
    public Product BySku(string sku) { Product p; return data.TryGetValue(sku, out p) ? p : null; }
    public List<Product> Search(string t) { return data.Values.Where(p => p.Name.Contains(t)).ToList(); }
    public void Save(Product p) { data[p.Sku] = p; }
    public void Delete(string sku) { data.Remove(sku); }
}

class ProductPage {                       // can only read: deleting is impossible by type
    private readonly IProductReader reader;
    public ProductPage(IProductReader reader) { this.reader = reader; }
    public string Render(string sku) { Product p = reader.BySku(sku); return p == null ? "Not found" : p.Name; }
}` }
        ] } },
      { title: 'Worker and Robot: "eat()" does not belong to everyone', html: `<p>${H.c('r', 'Bad:')} <code>interface Worker { void work(); void eat(); void sleep(); }</code>. A <code>Robot</code> worker must implement <code>eat()</code> and <code>sleep()</code> as empty methods. A canteen scheduler that calls <code>eat()</code> on all workers "feeds" robots. ${H.c('g', 'Fix:')} <code>Workable</code>, <code>Feedable</code>, <code>Restable</code>; <code>HumanWorker implements all three</code>, <code>Robot implements Workable</code> (plus maybe <code>Chargeable</code>). The canteen takes <code>List&lt;Feedable&gt;</code>.</p>` },
      { title: 'Do not "fix" fat interfaces with default methods', html: `<p>Default methods (Java 8+; a default body in a Python or C++ base class is the same trap) tempt people to write <code>default void fax(String d, String n) { throw new UnsupportedOperationException(); }</code> in the fat interface so implementers need not override. The compile error disappears, but the lie remains: every <code>Machine</code> still <i>claims</i> to fax. Defaults are great for adding <b>genuinely shared</b> behaviour built from other methods (like <code>copy()</code> above), not for hiding missing capabilities.</p>` }
    ],
    deepDive: `<p><b>Origin story.</b> Uncle Bob described ISP after consulting at Xerox: one huge <code>Job</code> class served all printer tasks; a tiny change to stapling forced a full hour-long rebuild of everything, because every module depended on the giant interface. Splitting into role interfaces cut the rebuild and deploy ripple. Today compile times are smaller, but the same ripple exists in <b>deployments</b> (shared library versions), <b>test mocks</b> and <b>team coordination</b>.</p>
<p><b>Header interfaces vs role interfaces</b> (Martin Fowler). A header interface mirrors all public methods of one class (<code>IUserService</code> for <code>UserService</code>) — usually pointless. A role interface is defined from the <b>client's point of view</b> ("what do I need?"). In ports-and-adapters architecture, the client (the domain) owns these small interfaces — that links ISP directly to DIP.</p>
<p><b>How small is too small?</b> One method per interface everywhere leads to "interface soup" where a constructor takes eight one-method interfaces that always come together. Group methods that are <b>always used together by the same clients</b> (cohesion again). Composite interfaces (<code>Copier extends Printer, Scanner</code>) or records of lambdas can bundle them.</p>
<p><b>ISP beyond classes:</b> REST APIs that return enormous payloads to every client (mobile, web, partners) are fat interfaces; GraphQL and Backend-for-Frontend (BFF) patterns let each client ask for exactly what it needs. Shared "common" libraries with 300 utilities force every service to upgrade together — split them. Kafka topics carrying a "god event" with 80 fields couple all consumers to every schema change — publish focused events.</p>
<p><b>Language details:</b> in Java, <code>sealed</code> interfaces can restrict implementers, and generics plus intersection types let a method demand several roles without a new interface: <code>&lt;T extends Printer &amp; Scanner&gt; void copyAll(T device)</code>. TypeScript writes the same constraint as <code>T extends Printer &amp; Scanner</code>, C++20 as a <code>requires</code> clause, and Python as a <code>typing.Protocol</code> that extends both.</p>`,
    aiEra: `<p><b>What AI changes:</b> ask an assistant to "create an interface for this service" and it will usually extract <b>every</b> public method into one header interface — instant fat interface. It also fills unsupported methods with <code>throw new UnsupportedOperationException("Not implemented")</code> to make the build green.</p>
<p><b>Use AI as a partner:</b> <code>Here are the 6 classes that use UserService. For each, list which methods it calls. Propose role interfaces grouped by caller.</code> This usage analysis is tedious for humans and easy for AI (or IDE "find usages"). Then: <code>Generate the new interfaces and update constructor parameter types to the narrowest role.</code></p>
<p><b>Where AI goes wrong:</b> splitting by method count or alphabet rather than by client role, or producing one-method interfaces for everything. It may also add default methods that throw. <b>What you must still own:</b> naming roles in the domain's language (<code>PaymentAuthorizer</code>, not <code>IService2</code>), deciding which methods are always used together, and keeping the number of interfaces proportional to real variation.</p>`,
    problems: [{
      title: 'Smart-home devices with a fat SmartDevice interface',
      level: 'Easy', tags: ['ISP', 'role interfaces'], companies: ['Google', 'Amazon', 'Samsung'],
      statement: `<p>A smart-home app defines <code>SmartDevice</code> with <code>turnOn</code>, <code>turnOff</code>, <code>setBrightness(int)</code>, <code>setTemperature(int)</code> and <code>playMusic(String)</code>. A bulb, a thermostat and a speaker all implement it, filling unsupported methods with exceptions. A "Good night" scene must turn off <b>every</b> device and dim lights to 10%. Redesign with ISP so no class has fake methods and the scene works for all devices.</p>`,
      constraints: `<p>Brightness 0–100, temperature 16–30 °C. A device can have several capabilities (a smart lamp-speaker exists).</p>`,
      example: `<p>Devices: Bulb, Thermostat, Speaker, LampSpeaker. "Good night" → all four turned off; Bulb and LampSpeaker dimmed to 10. ${H.c('r', 'Before:')} calling <code>setBrightness</code> on the thermostat throws. ${H.c('g', 'After:')} the scene dims only <code>Dimmable</code> devices — chosen by type, not by try/catch.</p>`,
      brute: {
        why: `<p>Every device is forced to implement five methods; three of the four classes contain fake implementations. The scene has to wrap calls in try/catch or type checks (<code>instanceof</code> / <code>isinstance</code>), and any change to <code>playMusic</code>'s signature forces the bulb and thermostat to change too.</p>`,
        code: { lang: 'java', code: `interface SmartDevice {
    void turnOn(); void turnOff();
    void setBrightness(int pct);
    void setTemperature(int celsius);
    void playMusic(String song);
}
class Bulb implements SmartDevice {
    public void turnOn() { System.out.println("bulb on"); }
    public void turnOff() { System.out.println("bulb off"); }
    public void setBrightness(int p) { System.out.println("bulb " + p + "%"); }
    public void setTemperature(int c) { throw new UnsupportedOperationException(); }
    public void playMusic(String s) { throw new UnsupportedOperationException(); }
}
class Scene {
    static void goodNight(List<SmartDevice> all) {
        for (SmartDevice d : all) {
            d.turnOff();
            try { d.setBrightness(10); } catch (UnsupportedOperationException ignored) { }  // smell
        }
    }
}`, alt: [
                { lang: 'python', code: `
class SmartDevice:
    def turn_on(self): raise NotImplementedError
    def turn_off(self): raise NotImplementedError
    def set_brightness(self, pct): raise NotImplementedError
    def set_temperature(self, celsius): raise NotImplementedError
    def play_music(self, song): raise NotImplementedError

class Bulb(SmartDevice):
    def turn_on(self): print("bulb on")
    def turn_off(self): print("bulb off")
    def set_brightness(self, p): print(f"bulb {p}%")
    def set_temperature(self, c): raise NotImplementedError
    def play_music(self, s): raise NotImplementedError

class Scene:
    @staticmethod
    def good_night(all_devices):
        for d in all_devices:
            d.turn_off()
            try: d.set_brightness(10)
            except NotImplementedError: pass   # smell` },
                { lang: 'ts', code: `
interface SmartDevice {
    turnOn(): void; turnOff(): void;
    setBrightness(pct: number): void;
    setTemperature(celsius: number): void;
    playMusic(song: string): void;
}
class Bulb implements SmartDevice {
    turnOn() { console.log("bulb on"); }
    turnOff() { console.log("bulb off"); }
    setBrightness(p: number) { console.log("bulb " + p + "%"); }
    setTemperature(c: number): void { throw new Error("unsupported"); }
    playMusic(s: string): void { throw new Error("unsupported"); }
}
class Scene {
    static goodNight(all: SmartDevice[]): void {
        for (const d of all) {
            d.turnOff();
            try { d.setBrightness(10); } catch (ignored) { }  // smell
        }
    }
}` },
                { lang: 'cpp', code: `
class SmartDevice {
public:
    virtual ~SmartDevice() = default;
    virtual void turnOn() = 0; virtual void turnOff() = 0;
    virtual void setBrightness(int pct) = 0;
    virtual void setTemperature(int celsius) = 0;
    virtual void playMusic(const string& song) = 0;
};
class Bulb : public SmartDevice {
public:
    void turnOn() override { cout << "bulb on\\n"; }
    void turnOff() override { cout << "bulb off\\n"; }
    void setBrightness(int p) override { cout << "bulb " << p << "%\\n"; }
    void setTemperature(int c) override { throw logic_error("unsupported"); }
    void playMusic(const string& s) override { throw logic_error("unsupported"); }
};
struct Scene {
    static void goodNight(vector<SmartDevice*>& all) {
        for (SmartDevice* d : all) {
            d->turnOff();
            try { d->setBrightness(10); } catch (const logic_error&) { }  // smell
        }
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

interface ISmartDevice {
    void TurnOn(); void TurnOff();
    void SetBrightness(int pct);
    void SetTemperature(int celsius);
    void PlayMusic(string song);
}
class Bulb : ISmartDevice {
    public void TurnOn() { Console.WriteLine("bulb on"); }
    public void TurnOff() { Console.WriteLine("bulb off"); }
    public void SetBrightness(int p) { Console.WriteLine("bulb " + p + "%"); }
    public void SetTemperature(int c) { throw new NotSupportedException(); }
    public void PlayMusic(string s) { throw new NotSupportedException(); }
}
static class Scene {
    public static void GoodNight(List<ISmartDevice> all) {
        foreach (ISmartDevice d in all) {
            d.TurnOff();
            try { d.SetBrightness(10); } catch (NotSupportedException) { }  // smell
        }
    }
}` }
              ] }
      },
      mcq: { q: 'What should the "Good night" scene depend on to turn everything off?', options: ['A small <code>Switchable</code> interface implemented by all devices', 'The fat <code>SmartDevice</code> interface', 'Each concrete class (Bulb, Speaker…)', 'A static utility with instanceof checks'], answer: 0, explain: 'The scene needs only on/off for everyone and brightness for some. Each need is a role: Switchable for all, Dimmable for lights.' },
      hints: [
        `<p>Group methods by capability: on/off (all), brightness (lights), temperature (thermostat), music (speakers).</p>`,
        `<p>Create <code>Switchable</code>, <code>Dimmable extends Switchable</code>, <code>Thermostatic</code>, <code>MusicPlayer</code>. LampSpeaker implements Dimmable and MusicPlayer.</p>`,
        `<p>Scene takes <code>List&lt;Switchable&gt;</code> to turn off and <code>List&lt;Dimmable&gt;</code> to dim — or filters with pattern matching once at the boundary. Validate ranges inside each device.</p>`
      ],
      tests: { io: true, cases: [{ stdin: '', stdout: "Bulb at 10%\nBulb off\nThermostat off\nSpeaker off\nLampSpeaker light 10%\nLampSpeaker off\nrejected: 0-100\nrejected: 16-30\nPlaying Raga\n" }] },
      solution: {
        approach: `<p><b>Role interfaces per capability.</b> Every device is <code>Switchable</code>; lights add <code>Dimmable</code>; the thermostat adds <code>Thermostatic</code>; speakers add <code>MusicPlayer</code>. No class implements a method it cannot honour. The scene asks for exactly the roles it uses. Adding a "smart blind" later means implementing <code>Switchable</code> (and maybe a new <code>Positionable</code>) — no fat interface to edit.</p>`,
        code: `interface Switchable { void turnOn(); void turnOff(); String name(); }
interface Dimmable extends Switchable { void setBrightness(int pct); }
interface Thermostatic extends Switchable { void setTemperature(int celsius); }
interface MusicPlayer extends Switchable { void play(String song); }

class Bulb implements Dimmable {
    public String name() { return "Bulb"; }
    public void turnOn() { System.out.println("Bulb on"); }
    public void turnOff() { System.out.println("Bulb off"); }
    public void setBrightness(int pct) {
        if (pct < 0 || pct > 100) throw new IllegalArgumentException("0-100");
        System.out.println("Bulb at " + pct + "%");
    }
}
class Thermostat implements Thermostatic {
    public String name() { return "Thermostat"; }
    public void turnOn() { System.out.println("Thermostat on"); }
    public void turnOff() { System.out.println("Thermostat off"); }
    public void setTemperature(int c) {
        if (c < 16 || c > 30) throw new IllegalArgumentException("16-30");
        System.out.println("Thermostat set to " + c);
    }
}
class Speaker implements MusicPlayer {
    public String name() { return "Speaker"; }
    public void turnOn() { System.out.println("Speaker on"); }
    public void turnOff() { System.out.println("Speaker off"); }
    public void play(String song) { System.out.println("Playing " + song); }
}
class LampSpeaker implements Dimmable, MusicPlayer {      // two roles, zero fakes
    public String name() { return "LampSpeaker"; }
    public void turnOn() { System.out.println("LampSpeaker on"); }
    public void turnOff() { System.out.println("LampSpeaker off"); }
    public void setBrightness(int pct) { System.out.println("LampSpeaker light " + pct + "%"); }
    public void play(String song) { System.out.println("LampSpeaker plays " + song); }
}

class GoodNightScene {
    void run(List<? extends Switchable> devices) {
        for (Switchable d : devices) {
            if (d instanceof Dimmable light) light.setBrightness(10);   // capability check at ONE boundary
            d.turnOff();
        }
    }
    public static void main(String[] args) {
        new GoodNightScene().run(List.of(new Bulb(), new Thermostat(), new Speaker(), new LampSpeaker()));
        try { new Bulb().setBrightness(150); } catch (IllegalArgumentException e) { System.out.println("rejected: " + e.getMessage()); }
        try { new Thermostat().setTemperature(35); } catch (IllegalArgumentException e) { System.out.println("rejected: " + e.getMessage()); }
        new Speaker().play("Raga");
    }
}`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod


class Switchable(ABC):
    @abstractmethod
    def name(self) -> str: ...

    @abstractmethod
    def turn_on(self) -> None: ...

    @abstractmethod
    def turn_off(self) -> None: ...


class Dimmable(Switchable):
    @abstractmethod
    def set_brightness(self, pct: int) -> None: ...


class Thermostatic(Switchable):
    @abstractmethod
    def set_temperature(self, celsius: int) -> None: ...


class MusicPlayer(Switchable):
    @abstractmethod
    def play(self, song: str) -> None: ...


class Bulb(Dimmable):
    def name(self) -> str:
        return "Bulb"

    def turn_on(self) -> None:
        print("Bulb on")

    def turn_off(self) -> None:
        print("Bulb off")

    def set_brightness(self, pct: int) -> None:
        if pct < 0 or pct > 100:
            raise ValueError("0-100")
        print(f"Bulb at {pct}%")


class Thermostat(Thermostatic):
    def name(self) -> str:
        return "Thermostat"

    def turn_on(self) -> None:
        print("Thermostat on")

    def turn_off(self) -> None:
        print("Thermostat off")

    def set_temperature(self, celsius: int) -> None:
        if celsius < 16 or celsius > 30:
            raise ValueError("16-30")
        print(f"Thermostat set to {celsius}")


class Speaker(MusicPlayer):
    def name(self) -> str:
        return "Speaker"

    def turn_on(self) -> None:
        print("Speaker on")

    def turn_off(self) -> None:
        print("Speaker off")

    def play(self, song: str) -> None:
        print(f"Playing {song}")


class LampSpeaker(Dimmable, MusicPlayer):  # two roles, zero fakes
    def name(self) -> str:
        return "LampSpeaker"

    def turn_on(self) -> None:
        print("LampSpeaker on")

    def turn_off(self) -> None:
        print("LampSpeaker off")

    def set_brightness(self, pct: int) -> None:
        print(f"LampSpeaker light {pct}%")

    def play(self, song: str) -> None:
        print(f"LampSpeaker plays {song}")


class GoodNightScene:
    def run(self, devices: list[Switchable]) -> None:
        for d in devices:
            if isinstance(d, Dimmable):  # capability check at ONE boundary
                d.set_brightness(10)
            d.turn_off()


def main() -> None:
    GoodNightScene().run([Bulb(), Thermostat(), Speaker(), LampSpeaker()])
    try:
        Bulb().set_brightness(150)
    except ValueError as e:
        print(f"rejected: {e}")
    try:
        Thermostat().set_temperature(35)
    except ValueError as e:
        print(f"rejected: {e}")
    Speaker().play("Raga")


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `interface Switchable { name(): string; turnOn(): void; turnOff(): void; }
interface Dimmable extends Switchable { setBrightness(pct: number): void; }
interface Thermostatic extends Switchable { setTemperature(celsius: number): void; }
interface MusicPlayer extends Switchable { play(song: string): void; }

// structural capability check: TypeScript interfaces vanish at run time, so test for the method
function isDimmable(d: Switchable): d is Dimmable {
  return typeof (d as Partial<Dimmable>).setBrightness === "function";
}

class Bulb implements Dimmable {
  name(): string { return "Bulb"; }
  turnOn(): void { console.log("Bulb on"); }
  turnOff(): void { console.log("Bulb off"); }
  setBrightness(pct: number): void {
    if (pct < 0 || pct > 100) throw new Error("0-100");
    console.log(\`Bulb at \${pct}%\`);
  }
}
class Thermostat implements Thermostatic {
  name(): string { return "Thermostat"; }
  turnOn(): void { console.log("Thermostat on"); }
  turnOff(): void { console.log("Thermostat off"); }
  setTemperature(c: number): void {
    if (c < 16 || c > 30) throw new Error("16-30");
    console.log(\`Thermostat set to \${c}\`);
  }
}
class Speaker implements MusicPlayer {
  name(): string { return "Speaker"; }
  turnOn(): void { console.log("Speaker on"); }
  turnOff(): void { console.log("Speaker off"); }
  play(song: string): void { console.log(\`Playing \${song}\`); }
}
class LampSpeaker implements Dimmable, MusicPlayer { // two roles, zero fakes
  name(): string { return "LampSpeaker"; }
  turnOn(): void { console.log("LampSpeaker on"); }
  turnOff(): void { console.log("LampSpeaker off"); }
  setBrightness(pct: number): void { console.log(\`LampSpeaker light \${pct}%\`); }
  play(song: string): void { console.log(\`LampSpeaker plays \${song}\`); }
}

class GoodNightScene {
  run(devices: readonly Switchable[]): void {
    for (const d of devices) {
      if (isDimmable(d)) d.setBrightness(10); // capability check at ONE boundary
      d.turnOff();
    }
  }
}

function main(): void {
  new GoodNightScene().run([new Bulb(), new Thermostat(), new Speaker(), new LampSpeaker()]);
  try {
    new Bulb().setBrightness(150);
  } catch (e) {
    console.log("rejected: " + (e as Error).message);
  }
  try {
    new Thermostat().setTemperature(35);
  } catch (e) {
    console.log("rejected: " + (e as Error).message);
  }
  new Speaker().play("Raga");
}
main();` },
          { lang: 'cpp', code: `// virtual inheritance: Dimmable and MusicPlayer share ONE Switchable inside LampSpeaker
class Switchable {
public:
    virtual ~Switchable() = default;
    virtual string name() const = 0;
    virtual void turnOn() = 0;
    virtual void turnOff() = 0;
};
class Dimmable : public virtual Switchable {
public:
    virtual void setBrightness(int pct) = 0;
};
class Thermostatic : public virtual Switchable {
public:
    virtual void setTemperature(int celsius) = 0;
};
class MusicPlayer : public virtual Switchable {
public:
    virtual void play(const string& song) = 0;
};

class Bulb : public Dimmable {
public:
    string name() const override { return "Bulb"; }
    void turnOn() override { cout << "Bulb on\\n"; }
    void turnOff() override { cout << "Bulb off\\n"; }
    void setBrightness(int pct) override {
        if (pct < 0 || pct > 100) throw invalid_argument("0-100");
        cout << "Bulb at " << pct << "%\\n";
    }
};
class Thermostat : public Thermostatic {
public:
    string name() const override { return "Thermostat"; }
    void turnOn() override { cout << "Thermostat on\\n"; }
    void turnOff() override { cout << "Thermostat off\\n"; }
    void setTemperature(int c) override {
        if (c < 16 || c > 30) throw invalid_argument("16-30");
        cout << "Thermostat set to " << c << "\\n";
    }
};
class Speaker : public MusicPlayer {
public:
    string name() const override { return "Speaker"; }
    void turnOn() override { cout << "Speaker on\\n"; }
    void turnOff() override { cout << "Speaker off\\n"; }
    void play(const string& song) override { cout << "Playing " << song << "\\n"; }
};
class LampSpeaker : public Dimmable, public MusicPlayer {   // two roles, zero fakes
public:
    string name() const override { return "LampSpeaker"; }
    void turnOn() override { cout << "LampSpeaker on\\n"; }
    void turnOff() override { cout << "LampSpeaker off\\n"; }
    void setBrightness(int pct) override { cout << "LampSpeaker light " << pct << "%\\n"; }
    void play(const string& song) override { cout << "LampSpeaker plays " << song << "\\n"; }
};

class GoodNightScene {
public:
    void run(const vector<unique_ptr<Switchable>>& devices) const {
        for (const auto& d : devices) {
            if (auto* light = dynamic_cast<Dimmable*>(d.get())) light->setBrightness(10);   // capability check at ONE boundary
            d->turnOff();
        }
    }
};

int main() {
    vector<unique_ptr<Switchable>> devices;
    devices.push_back(make_unique<Bulb>());
    devices.push_back(make_unique<Thermostat>());
    devices.push_back(make_unique<Speaker>());
    devices.push_back(make_unique<LampSpeaker>());
    GoodNightScene().run(devices);
    try {
        Bulb().setBrightness(150);
    } catch (const invalid_argument& e) {
        cout << "rejected: " << e.what() << "\\n";
    }
    try {
        Thermostat().setTemperature(35);
    } catch (const invalid_argument& e) {
        cout << "rejected: " << e.what() << "\\n";
    }
    Speaker().play("Raga");
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

interface ISwitchable { void TurnOn(); void TurnOff(); string Name { get; } }
interface IDimmable : ISwitchable { void SetBrightness(int pct); }
interface IThermostatic : ISwitchable { void SetTemperature(int celsius); }
interface IMusicPlayer : ISwitchable { void Play(string song); }

class Bulb : IDimmable {
    public string Name { get { return "Bulb"; } }
    public void TurnOn() { Console.WriteLine("Bulb on"); }
    public void TurnOff() { Console.WriteLine("Bulb off"); }
    public void SetBrightness(int pct) {
        if (pct < 0 || pct > 100) throw new ArgumentException("0-100");
        Console.WriteLine("Bulb at " + pct + "%");
    }
}
class Thermostat : IThermostatic {
    public string Name { get { return "Thermostat"; } }
    public void TurnOn() { Console.WriteLine("Thermostat on"); }
    public void TurnOff() { Console.WriteLine("Thermostat off"); }
    public void SetTemperature(int c) {
        if (c < 16 || c > 30) throw new ArgumentException("16-30");
        Console.WriteLine("Thermostat set to " + c);
    }
}
class Speaker : IMusicPlayer {
    public string Name { get { return "Speaker"; } }
    public void TurnOn() { Console.WriteLine("Speaker on"); }
    public void TurnOff() { Console.WriteLine("Speaker off"); }
    public void Play(string song) { Console.WriteLine("Playing " + song); }
}
class LampSpeaker : IDimmable, IMusicPlayer {      // two roles, zero fakes
    public string Name { get { return "LampSpeaker"; } }
    public void TurnOn() { Console.WriteLine("LampSpeaker on"); }
    public void TurnOff() { Console.WriteLine("LampSpeaker off"); }
    public void SetBrightness(int pct) { Console.WriteLine("LampSpeaker light " + pct + "%"); }
    public void Play(string song) { Console.WriteLine("LampSpeaker plays " + song); }
}

class GoodNightScene {
    public void Run(IEnumerable<ISwitchable> devices) {
        foreach (ISwitchable d in devices) {
            if (d is IDimmable light) light.SetBrightness(10);   // capability check at ONE boundary
            d.TurnOff();
        }
    }
}

class Program {
    static void Main() {
        new GoodNightScene().Run(new ISwitchable[] { new Bulb(), new Thermostat(), new Speaker(), new LampSpeaker() });
        try { new Bulb().SetBrightness(150); } catch (ArgumentException e) { Console.WriteLine("rejected: " + e.Message); }
        try { new Thermostat().SetTemperature(35); } catch (ArgumentException e) { Console.WriteLine("rejected: " + e.Message); }
        new Speaker().Play("Raga");
    }
}` }
        ],
        complexity: `<p>O(n) over devices. Fake methods: 7 before → 0 after. A change to <code>play()</code> now affects only music players.</p>`,
        followUps: ['The scene uses one <code>instanceof Dimmable</code>. Is that an OCP/LSP smell or acceptable capability discovery? How else could you do it (separate lists, visitor)?', 'How would you model a device whose capabilities are discovered at runtime (e.g. Matter/Zigbee devices)?', 'Where would you put scheduling ("turn off at 23:00")?']
      }
    }]
  });

  /* ======================= TOPIC 6: DIP ======================= */
  var T6_BAD = `class OrderService {
  private final MySqlOrderRepository repo =
      new MySqlOrderRepository("jdbc:mysql://prod");
  private final SmtpMailer mailer =
      new SmtpMailer("smtp.company.com");

  void place(Order o) {
    repo.insert(o);
    mailer.send(o.email(), "Order placed");
  }
}`;
  var T6_GOOD = `// owned by the DOMAIN (high-level) package
interface OrderRepository { void save(Order o); }
interface Notifier { void notify(String to, String msg); }

class OrderService {
  private final OrderRepository repo;
  private final Notifier notifier;
  OrderService(OrderRepository r, Notifier n) {
    repo = r; notifier = n;          // injected
  }
  void place(Order o) {
    repo.save(o);
    notifier.notify(o.email(), "Order placed");
  }
}
// infrastructure (low-level) implements domain's interface
class MySqlOrderRepository implements OrderRepository {
  public void save(Order o) { /* JDBC insert */ }
}`;

  topics.push({
    title: 'D — Dependency Inversion Principle (DIP)',
    analogy: `<p>Your <b>laptop does not have a hair-dryer wired into it</b>. It has a <b>USB-C port</b> — a standard the laptop maker defined. Any charger, monitor or drive from any company plugs in, because <i>they</i> follow the laptop's standard. The laptop (the important, high-level thing) does not depend on a specific gadget; the gadgets depend on the laptop's port. DIP says your <b>business logic should own the "port" (an interface)</b>, and databases, email providers and payment APIs should plug into it.</p>`,
    explain: `<p><b>Official wording (two parts):</b></p>
<ol>
<li>High-level modules should not depend on low-level modules. <b>Both should depend on abstractions.</b></li>
<li>Abstractions should not depend on details. <b>Details should depend on abstractions.</b></li>
</ol>
<p><b>High-level</b> = the code that expresses business policy ("placing an order saves it and notifies the customer"). <b>Low-level</b> = the details of how ("JDBC insert into MySQL", "SMTP on port 587"). Policies change slowly and are valuable; details change often (new database, new email vendor).</p>
<p><b>The bad design:</b> <code>OrderService</code> does <code>new MySqlOrderRepository(...)</code> and <code>new SmtpMailer(...)</code> inside itself. Consequences:</p>
<ul>
<li>${H.c('r', 'Cannot unit test')} without a real MySQL and SMTP server (or ugly static mocking).</li>
<li>${H.c('r', 'Cannot swap')} MySQL → PostgreSQL or SMTP → SendGrid without editing business code.</li>
<li>${H.c('r', 'Compile-time coupling')}: the business package imports JDBC and mail libraries.</li>
</ul>
<p><b>Why "inversion"?</b> In the naive design, arrows point <b>down</b>: OrderService → MySqlRepo. After DIP, the domain defines <code>interface OrderRepository</code>, and <code>MySqlOrderRepository implements OrderRepository</code> — the arrow from the low-level class now points <b>up</b> into the domain. The <b>source-code dependency is inverted</b> against the flow of control (at runtime the service still calls MySQL).</p>
${H.table(['Term', 'What it is', 'Relation'], [
  ['<b>DIP</b> (principle)', 'Depend on abstractions; details plug in', 'The goal'],
  ['<b>DI</b> (dependency injection)', 'Pass collaborators in (constructor/setter) instead of <code>new</code>-ing them', 'A technique to achieve DIP'],
  ['<b>IoC</b> (inversion of control)', 'A framework calls your code and manages object creation (Spring, Guice)', 'A tool that automates DI'],
  ['<b>Composition root</b>', 'The one place (e.g. <code>main</code> or config) where concrete classes are chosen and wired', 'Where all the <code>new</code>s live']
])}
<p><b>Key detail people miss:</b> the interface belongs to the <b>high-level</b> module and is shaped by its needs (<code>save(Order)</code>), not by the database's API (<code>executeUpdate(String sql)</code>). If the interface just mirrors the MySQL class, you have an abstraction in name only.</p>`,
    clues: [
      '"How would you <b>unit test</b> this?" when the class does <code>new</code> on a DB/HTTP client → inject an interface.',
      '"We might switch from MySQL to Postgres / from Stripe to Razorpay" → domain-owned port + adapters.',
      'Business class imports <code>java.sql</code>, an HTTP client, an AWS SDK or uses <code>LocalDateTime.now()</code> / <code>new Random()</code> directly → hidden dependencies.',
      '"Explain DI vs DIP vs IoC" — classic interview question; know all three and how they relate.',
      'Static calls to singletons (<code>Database.getInstance()</code>) inside business logic → hard-wired dependency.',
      'Hexagonal / clean / onion architecture questions → DIP at architecture scale.'
    ],
    code: [{ lang: 'java', title: 'Before: business logic creates its own concrete tools', code: `record Order(String id, String email, double amount) {}

class MySqlOrderRepository {
    MySqlOrderRepository(String url) { System.out.println("connecting to " + url); }   // real I/O in constructor
    void insert(Order o) { System.out.println("INSERT order " + o.id()); }
}
class SmtpMailer {
    SmtpMailer(String host) { System.out.println("opening SMTP to " + host); }
    void send(String to, String body) { System.out.println("mail " + to + ": " + body); }
}

class OrderService {
    // hard-wired: tests hit production-like servers; swapping vendors means editing this class
    private final MySqlOrderRepository repo = new MySqlOrderRepository("jdbc:mysql://prod-db:3306/shop");
    private final SmtpMailer mailer = new SmtpMailer("smtp.company.com");

    void place(Order o) {
        if (o.amount() <= 0) throw new IllegalArgumentException("bad amount");
        repo.insert(o);
        mailer.send(o.email(), "Order " + o.id() + " placed");
    }
}`, alt: [
          { lang: 'python', code: `from dataclasses import dataclass


@dataclass(frozen=True)
class Order:
    id: str
    email: str
    amount: float


class MySqlOrderRepository:
    def __init__(self, url: str) -> None:
        print(f"connecting to {url}")  # real I/O in constructor

    def insert(self, o: Order) -> None:
        print(f"INSERT order {o.id}")


class SmtpMailer:
    def __init__(self, host: str) -> None:
        print(f"opening SMTP to {host}")

    def send(self, to: str, body: str) -> None:
        print(f"mail {to}: {body}")


class OrderService:
    def __init__(self) -> None:
        # hard-wired: tests hit production-like servers; swapping vendors means editing this class
        self._repo = MySqlOrderRepository("jdbc:mysql://prod-db:3306/shop")
        self._mailer = SmtpMailer("smtp.company.com")

    def place(self, o: Order) -> None:
        if o.amount <= 0:
            raise ValueError("bad amount")
        self._repo.insert(o)
        self._mailer.send(o.email, f"Order {o.id} placed")` },
          { lang: 'ts', code: `interface Order { readonly id: string; readonly email: string; readonly amount: number; }

class MySqlOrderRepository {
  constructor(url: string) { console.log(\`connecting to \${url}\`); } // real I/O in constructor
  insert(o: Order): void { console.log(\`INSERT order \${o.id}\`); }
}
class SmtpMailer {
  constructor(host: string) { console.log(\`opening SMTP to \${host}\`); }
  send(to: string, body: string): void { console.log(\`mail \${to}: \${body}\`); }
}

class OrderService {
  // hard-wired: tests hit production-like servers; swapping vendors means editing this class
  private readonly repo = new MySqlOrderRepository("jdbc:mysql://prod-db:3306/shop");
  private readonly mailer = new SmtpMailer("smtp.company.com");

  place(o: Order): void {
    if (o.amount <= 0) throw new Error("bad amount");
    this.repo.insert(o);
    this.mailer.send(o.email, \`Order \${o.id} placed\`);
  }
}` },
          { lang: 'cpp', code: `struct Order {
    string id, email;
    double amount;
};

class MySqlOrderRepository {
public:
    explicit MySqlOrderRepository(const string& url) { cout << "connecting to " << url << "\\n"; }   // real I/O in constructor
    void insert(const Order& o) { cout << "INSERT order " << o.id << "\\n"; }
};
class SmtpMailer {
public:
    explicit SmtpMailer(const string& host) { cout << "opening SMTP to " << host << "\\n"; }
    void send(const string& to, const string& body) { cout << "mail " << to << ": " << body << "\\n"; }
};

class OrderService {
    // hard-wired: tests hit production-like servers; swapping vendors means editing this class
    MySqlOrderRepository repo_{"jdbc:mysql://prod-db:3306/shop"};
    SmtpMailer mailer_{"smtp.company.com"};
public:
    void place(const Order& o) {
        if (o.amount <= 0) throw invalid_argument("bad amount");
        repo_.insert(o);
        mailer_.send(o.email, "Order " + o.id + " placed");
    }
};` },
  { lang: 'csharp', code: `
using System;

sealed class Order {
    public readonly string Id, Email; public readonly double Amount;
    public Order(string id, string email, double amount) { Id = id; Email = email; Amount = amount; }
}

class MySqlOrderRepository {
    public MySqlOrderRepository(string url) { Console.WriteLine("connecting to " + url); }   // real I/O in constructor
    public void Insert(Order o) { Console.WriteLine("INSERT order " + o.Id); }
}
class SmtpMailer {
    public SmtpMailer(string host) { Console.WriteLine("opening SMTP to " + host); }
    public void Send(string to, string body) { Console.WriteLine("mail " + to + ": " + body); }
}

class OrderService {
    // hard-wired: tests hit production-like servers; swapping vendors means editing this class
    private readonly MySqlOrderRepository repo = new MySqlOrderRepository("Server=prod-db;Database=shop");
    private readonly SmtpMailer mailer = new SmtpMailer("smtp.company.com");

    public void Place(Order o) {
        if (o.Amount <= 0) throw new ArgumentException("bad amount");
        repo.Insert(o);
        mailer.Send(o.Email, "Order " + o.Id + " placed");
    }
}` }
        ] }, { lang: 'java', title: 'After: domain owns the ports, infrastructure plugs in, tests use fakes', code: `record Order(String id, String email, double amount) {}

// ---- domain (high-level): policy + the interfaces it NEEDS ----
interface OrderRepository { void save(Order o); Optional<Order> find(String id); }
interface Notifier { void notify(String to, String message); }

class OrderService {
    private final OrderRepository repo;
    private final Notifier notifier;

    OrderService(OrderRepository repo, Notifier notifier) {       // constructor injection
        this.repo = Objects.requireNonNull(repo);
        this.notifier = Objects.requireNonNull(notifier);
    }

    void place(Order o) {
        if (o.amount() <= 0) throw new IllegalArgumentException("bad amount");
        repo.save(o);
        notifier.notify(o.email(), "Order " + o.id() + " placed");
    }
}

// ---- infrastructure (low-level): details depend on the domain's abstractions ----
class JdbcOrderRepository implements OrderRepository {
    private final Map<String, Order> fakeTable = new HashMap<>();   // stands in for JDBC here
    public void save(Order o) { System.out.println("SQL INSERT " + o.id()); fakeTable.put(o.id(), o); }
    public Optional<Order> find(String id) { return Optional.ofNullable(fakeTable.get(id)); }
}
class EmailNotifier implements Notifier {
    public void notify(String to, String m) { System.out.println("email " + to + ": " + m); }
}

// ---- test doubles: no DB, no network, runs in microseconds ----
class InMemoryOrderRepository implements OrderRepository {
    final Map<String, Order> saved = new HashMap<>();
    public void save(Order o) { saved.put(o.id(), o); }
    public Optional<Order> find(String id) { return Optional.ofNullable(saved.get(id)); }
}
class RecordingNotifier implements Notifier {
    final List<String> sent = new ArrayList<>();
    public void notify(String to, String m) { sent.add(to + "|" + m); }
}

// ---- composition root: the ONLY place that knows concrete classes ----
class App {
    public static void main(String[] args) {
        new OrderService(new JdbcOrderRepository(), new EmailNotifier()).place(new Order("o1", "a@b.com", 499));

        // "unit test" style check with fakes
        InMemoryOrderRepository repo = new InMemoryOrderRepository();
        RecordingNotifier notifier = new RecordingNotifier();
        new OrderService(repo, notifier).place(new Order("o2", "c@d.com", 99));
        System.out.println(repo.find("o2").isPresent() + " " + notifier.sent);   // true [c@d.com|Order o2 placed]
    }
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class Order:
    id: str
    email: str
    amount: float


# ---- domain (high-level): policy + the interfaces it NEEDS ----
class OrderRepository(ABC):
    @abstractmethod
    def save(self, o: Order) -> None: ...

    @abstractmethod
    def find(self, id: str) -> Optional[Order]: ...


class Notifier(ABC):
    @abstractmethod
    def notify(self, to: str, message: str) -> None: ...


class OrderService:
    def __init__(self, repo: OrderRepository, notifier: Notifier) -> None:  # constructor injection
        if repo is None or notifier is None:
            raise ValueError("dependencies required")
        self._repo = repo
        self._notifier = notifier

    def place(self, o: Order) -> None:
        if o.amount <= 0:
            raise ValueError("bad amount")
        self._repo.save(o)
        self._notifier.notify(o.email, f"Order {o.id} placed")


# ---- infrastructure (low-level): details depend on the domain's abstractions ----
class JdbcOrderRepository(OrderRepository):
    def __init__(self) -> None:
        self._fake_table: dict[str, Order] = {}  # stands in for JDBC here

    def save(self, o: Order) -> None:
        print(f"SQL INSERT {o.id}")
        self._fake_table[o.id] = o

    def find(self, id: str) -> Optional[Order]:
        return self._fake_table.get(id)


class EmailNotifier(Notifier):
    def notify(self, to: str, message: str) -> None:
        print(f"email {to}: {message}")


# ---- test doubles: no DB, no network, runs in microseconds ----
class InMemoryOrderRepository(OrderRepository):
    def __init__(self) -> None:
        self.saved: dict[str, Order] = {}

    def save(self, o: Order) -> None:
        self.saved[o.id] = o

    def find(self, id: str) -> Optional[Order]:
        return self.saved.get(id)


class RecordingNotifier(Notifier):
    def __init__(self) -> None:
        self.sent: list[str] = []

    def notify(self, to: str, message: str) -> None:
        self.sent.append(f"{to}|{message}")


# ---- composition root: the ONLY place that knows concrete classes ----
if __name__ == "__main__":
    OrderService(JdbcOrderRepository(), EmailNotifier()).place(Order("o1", "a@b.com", 499))

    # "unit test" style check with fakes
    repo = InMemoryOrderRepository()
    notifier = RecordingNotifier()
    OrderService(repo, notifier).place(Order("o2", "c@d.com", 99))
    print(str(repo.find("o2") is not None).lower(), notifier.sent)  # true ['c@d.com|Order o2 placed']` },
          { lang: 'ts', code: `interface Order { readonly id: string; readonly email: string; readonly amount: number; }

// ---- domain (high-level): policy + the interfaces it NEEDS ----
interface OrderRepository { save(o: Order): void; find(id: string): Order | undefined; }
interface Notifier { notify(to: string, message: string): void; }

class OrderService {
  constructor(
    private readonly repo: OrderRepository, // constructor injection
    private readonly notifier: Notifier,
  ) {}

  place(o: Order): void {
    if (o.amount <= 0) throw new Error("bad amount");
    this.repo.save(o);
    this.notifier.notify(o.email, \`Order \${o.id} placed\`);
  }
}

// ---- infrastructure (low-level): details depend on the domain's abstractions ----
class JdbcOrderRepository implements OrderRepository {
  private readonly fakeTable = new Map<string, Order>(); // stands in for JDBC here
  save(o: Order): void { console.log(\`SQL INSERT \${o.id}\`); this.fakeTable.set(o.id, o); }
  find(id: string): Order | undefined { return this.fakeTable.get(id); }
}
class EmailNotifier implements Notifier {
  notify(to: string, m: string): void { console.log(\`email \${to}: \${m}\`); }
}

// ---- test doubles: no DB, no network, runs in microseconds ----
class InMemoryOrderRepository implements OrderRepository {
  readonly saved = new Map<string, Order>();
  save(o: Order): void { this.saved.set(o.id, o); }
  find(id: string): Order | undefined { return this.saved.get(id); }
}
class RecordingNotifier implements Notifier {
  readonly sent: string[] = [];
  notify(to: string, m: string): void { this.sent.push(\`\${to}|\${m}\`); }
}

// ---- composition root: the ONLY place that knows concrete classes ----
new OrderService(new JdbcOrderRepository(), new EmailNotifier()).place({ id: "o1", email: "a@b.com", amount: 499 });

// "unit test" style check with fakes
const repo = new InMemoryOrderRepository();
const notifier = new RecordingNotifier();
new OrderService(repo, notifier).place({ id: "o2", email: "c@d.com", amount: 99 });
console.log(repo.find("o2") !== undefined, notifier.sent); // true [ 'c@d.com|Order o2 placed' ]` },
          { lang: 'cpp', code: `struct Order {
    string id, email;
    double amount;
};

// ---- domain (high-level): policy + the interfaces it NEEDS ----
class OrderRepository {
public:
    virtual ~OrderRepository() = default;
    virtual void save(const Order& o) = 0;
    virtual optional<Order> find(const string& id) const = 0;
};
class Notifier {
public:
    virtual ~Notifier() = default;
    virtual void notify(const string& to, const string& message) = 0;
};

class OrderService {
    OrderRepository& repo_;   // non-owning: the composition root owns the adapters
    Notifier& notifier_;
public:
    OrderService(OrderRepository& repo, Notifier& notifier) : repo_(repo), notifier_(notifier) {}   // constructor injection

    void place(const Order& o) {
        if (o.amount <= 0) throw invalid_argument("bad amount");
        repo_.save(o);
        notifier_.notify(o.email, "Order " + o.id + " placed");
    }
};

// ---- infrastructure (low-level): details depend on the domain's abstractions ----
class JdbcOrderRepository : public OrderRepository {
    unordered_map<string, Order> fakeTable_;   // stands in for JDBC here
public:
    void save(const Order& o) override { cout << "SQL INSERT " << o.id << "\\n"; fakeTable_[o.id] = o; }
    optional<Order> find(const string& id) const override {
        auto it = fakeTable_.find(id);
        if (it == fakeTable_.end()) return nullopt;
        return it->second;
    }
};
class EmailNotifier : public Notifier {
public:
    void notify(const string& to, const string& m) override { cout << "email " << to << ": " << m << "\\n"; }
};

// ---- test doubles: no DB, no network, runs in microseconds ----
class InMemoryOrderRepository : public OrderRepository {
public:
    unordered_map<string, Order> saved;
    void save(const Order& o) override { saved[o.id] = o; }
    optional<Order> find(const string& id) const override {
        auto it = saved.find(id);
        if (it == saved.end()) return nullopt;
        return it->second;
    }
};
class RecordingNotifier : public Notifier {
public:
    vector<string> sent;
    void notify(const string& to, const string& m) override { sent.push_back(to + "|" + m); }
};

// ---- composition root: the ONLY place that knows concrete classes ----
int main() {
    JdbcOrderRepository jdbc;
    EmailNotifier email;
    OrderService(jdbc, email).place({"o1", "a@b.com", 499});

    // "unit test" style check with fakes
    InMemoryOrderRepository repo;
    RecordingNotifier notifier;
    OrderService(repo, notifier).place({"o2", "c@d.com", 99});
    cout << boolalpha << repo.find("o2").has_value() << " [" << notifier.sent[0] << "]\\n";   // true [c@d.com|Order o2 placed]
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

sealed class Order {
    public readonly string Id, Email; public readonly double Amount;
    public Order(string id, string email, double amount) { Id = id; Email = email; Amount = amount; }
}

// ---- domain (high-level): policy + the interfaces it NEEDS ----
interface IOrderRepository { void Save(Order o); Order Find(string id); }   // Find: null when absent
interface INotifier { void Notify(string to, string message); }

class OrderService {
    private readonly IOrderRepository repo;
    private readonly INotifier notifier;

    public OrderService(IOrderRepository repo, INotifier notifier) {       // constructor injection
        if (repo == null) throw new ArgumentNullException("repo");
        if (notifier == null) throw new ArgumentNullException("notifier");
        this.repo = repo; this.notifier = notifier;
    }

    public void Place(Order o) {
        if (o.Amount <= 0) throw new ArgumentException("bad amount");
        repo.Save(o);
        notifier.Notify(o.Email, "Order " + o.Id + " placed");
    }
}

// ---- infrastructure (low-level): details depend on the domain's abstractions ----
class SqlOrderRepository : IOrderRepository {
    private readonly Dictionary<string, Order> fakeTable = new Dictionary<string, Order>();   // stands in for ADO.NET here
    public void Save(Order o) { Console.WriteLine("SQL INSERT " + o.Id); fakeTable[o.Id] = o; }
    public Order Find(string id) { Order o; return fakeTable.TryGetValue(id, out o) ? o : null; }
}
class EmailNotifier : INotifier {
    public void Notify(string to, string m) { Console.WriteLine("email " + to + ": " + m); }
}

// ---- test doubles: no DB, no network, runs in microseconds ----
class InMemoryOrderRepository : IOrderRepository {
    public readonly Dictionary<string, Order> Saved = new Dictionary<string, Order>();
    public void Save(Order o) { Saved[o.Id] = o; }
    public Order Find(string id) { Order o; return Saved.TryGetValue(id, out o) ? o : null; }
}
class RecordingNotifier : INotifier {
    public readonly List<string> Sent = new List<string>();
    public void Notify(string to, string m) { Sent.Add(to + "|" + m); }
}

// ---- composition root: the ONLY place that knows concrete classes ----
class Program {
    static void Main() {
        new OrderService(new SqlOrderRepository(), new EmailNotifier()).Place(new Order("o1", "a@b.com", 499));

        // "unit test" style check with fakes
        InMemoryOrderRepository repo = new InMemoryOrderRepository();
        RecordingNotifier notifier = new RecordingNotifier();
        new OrderService(repo, notifier).Place(new Order("o2", "c@d.com", 99));
        Console.WriteLine((repo.Find("o2") != null).ToString().ToLower() + " [" + string.Join(", ", notifier.Sent) + "]");   // true [c@d.com|Order o2 placed]
    }
}` }
        ] }],
    codeTitle: ['Bad: hard-wired details', 'Good: inverted dependencies + DI'],
    viz: [{
      title: 'Arrows flip: dependency direction before and after DIP',
      input: 'postgres',
      inputLabel: 'Change to make: postgres | sms | test',
      gen: function (input) {
        var c = pick(input, { postgres: 1, sms: 1, test: 1 }, 'Type one of: postgres, sms, test');
        var bn = [B('CT', 'OrderController', 50, 6), B('OS', 'OrderService', 50, 24), B('TS', 'OrderServiceTest', 15, 24),
          B('MY', 'MySqlRepo', 30, 46), B('SM', 'SmtpMailer', 72, 46)];
        var be = [['CT', 'OS'], ['TS', 'OS'], ['OS', 'MY'], ['OS', 'SM']];
        var frames = [F('<b>Before DIP:</b> the high-level <b>OrderService</b> points <b>down</b> at concrete low-level classes (red). Even its test depends — through it — on MySQL and SMTP. Tags show packages.',
          [G('Before: policy depends on details', bn, be, { ehl: paint(be, 'bad'), hl: { OS: 'cur' }, tags: { OS: 'domain', MY: 'infra', SM: 'infra' } })])];
        if (c === 'test') {
          frames.push(F('Run <b>OrderServiceTest</b>. Constructing OrderService runs <code>new MySqlRepo("jdbc:mysql://prod…")</code> inside it. <span class="c-r">The test needs a live database and mail server</span>, is slow and flaky, and might send real emails.',
            [G('Before: policy depends on details', bn, be, { ehl: { 'TS-OS': 'cur', 'OS-MY': 'bad', 'OS-SM': 'bad' }, hl: { TS: 'cur', MY: 'bad', SM: 'bad' }, tags: { MY: 'needs DB!', SM: 'needs SMTP!' } }),
              { type: 'vars', label: 'test run', vals: { needsDatabase: 'yes', needsMailServer: 'yes', duration: '~4 s', flaky: 'yes' }, hl: { needsDatabase: 'bad', needsMailServer: 'bad' } }]));
        } else {
          var tgt = c === 'postgres' ? 'MY' : 'SM';
          frames = frames.concat(ripple('Before: policy depends on details', bn, be, tgt, c === 'postgres' ? 'we migrate to PostgreSQL. OrderService literally contains <code>new MySqlRepo(...)</code>, so it must be edited.' : 'notifications move from email to SMS. OrderService contains <code>new SmtpMailer(...)</code>, so it must be edited.', 'bad'));
        }
        var an = [B('CT', 'OrderController', 50, 6), B('OS', 'OrderService', 50, 22), B('TS', 'OrderServiceTest', 15, 22),
          B('IR', '«OrderRepository»', 30, 40), B('IN', '«Notifier»', 72, 40),
          B('MY', 'MySqlRepo', 14, 60), B('PG', 'PostgresRepo', 42, 60), B('EM', 'EmailNotifier', 66, 60), B('SMS', 'SmsNotifier', 90, 60), B('ROOT', 'AppConfig', 88, 22)];
        var ae = [['CT', 'OS'], ['TS', 'OS'], ['OS', 'IR'], ['OS', 'IN'], ['MY', 'IR'], ['PG', 'IR'], ['EM', 'IN'], ['SMS', 'IN'], ['ROOT', c === 'sms' ? 'SMS' : 'PG'], ['ROOT', 'OS']];
        frames.push(F('<b>Step 1 — introduce ports owned by the domain:</b> <b>«OrderRepository»</b> and <b>«Notifier»</b> live in the <i>domain</i> package and speak business language (<code>save(Order)</code>, <code>notify(to, msg)</code>).',
          [G('After: details depend on policy', an, ae, { ehl: { 'OS-IR': 'ok', 'OS-IN': 'ok' }, hl: { IR: 'sel', IN: 'sel' }, tags: { IR: 'domain', IN: 'domain', OS: 'domain' }, h: 68 })]));
        frames.push(F('<b>Step 2 — the inversion:</b> concrete classes now <b>implement</b> the domain interfaces, so their arrows point <b>up</b> (green). The domain package imports nothing from infrastructure.',
          [G('After: details depend on policy', an, ae, { ehl: paint(ae, 'ok'), hl: { MY: 'ok', PG: 'ok', EM: 'ok', SMS: 'ok' }, tags: { MY: 'infra', PG: 'infra', EM: 'infra', SMS: 'infra' }, h: 68 })]));
        frames.push(F('<b>Step 3 — composition root:</b> <b>AppConfig</b> (or Spring) is the only box that names concrete classes. It builds the adapters and injects them into OrderService\'s constructor.',
          [G('After: details depend on policy', an, ae, { ehl: paint(ae, 'ok'), hl: { ROOT: 'cur' }, tags: { ROOT: 'all the new()s', OS: 'no new()' }, h: 68 })]));
        if (c === 'test') {
          frames.push(F('Run <b>OrderServiceTest</b> again: it passes an <code>InMemoryOrderRepository</code> and a <code>RecordingNotifier</code>. <span class="c-g">No database, no network, milliseconds, deterministic.</span>',
            [G('After: details depend on policy', an, ae, { ehl: { 'TS-OS': 'ok', 'OS-IR': 'ok', 'OS-IN': 'ok' }, hl: { TS: 'ok', OS: 'ok', IR: 'sel', IN: 'sel' }, tags: { IR: 'fake in test', IN: 'fake in test' }, h: 68 }),
              { type: 'vars', label: 'test run', vals: { needsDatabase: 'no', needsMailServer: 'no', duration: '~2 ms', flaky: 'no' }, hl: { needsDatabase: 'ok', needsMailServer: 'ok', duration: 'ok' } }]));
        } else {
          frames = frames.concat(ripple('After: details depend on policy', an, ae, c === 'postgres' ? 'PG' : 'SMS', c === 'postgres' ? 'we migrate to PostgreSQL by writing a new PostgresRepo adapter.' : 'we add an SmsNotifier adapter.', 'ok', 68));
          frames.push(F('Result: OrderService, its controller and its tests were <b>not edited</b>. Only the new adapter and one wiring line in AppConfig changed. <span class="c-g">That is DIP paying off.</span>',
            [TXT('Before: the change rippled through OrderService into the controller and tests. After: it stopped at the composition root. Try the input <code>test</code> to see the testing benefit.')]));
        }
        return frames;
      }
    }, {
      title: 'Refactor step by step: from new() inside to constructor injection',
      gen: function () {
        return refactorFrames('OrderService', [
          { narr: 'The service builds its own tools with <code>new</code>, including a production URL. "new is glue": it glues this class to those exact classes forever.', code: T6_BAD, hl: { 2: 'bad', 3: 'bad', 4: 'bad', 5: 'bad' } },
          { narr: 'The business method itself is fine — it says <b>what</b> should happen. The problem is only the <b>how</b> it is wired to.', code: T6_BAD, hl: { 7: 'cur', 8: 'cur', 9: 'cur' } },
          { narr: 'Step 1: write interfaces from the <b>service\'s point of view</b>. Names come from the domain (<code>save</code>, <code>notify</code>), not from JDBC or SMTP.', code: T6_GOOD, hl: { 1: 'ok', 2: 'ok', 3: 'ok' } },
          { narr: 'Step 2: fields become interface types, and the constructor <b>receives</b> them. This is constructor injection — dependencies are explicit, final, and visible in the signature.', code: T6_GOOD, hl: { 6: 'ok', 7: 'ok', 8: 'ok', 9: 'ok' } },
          { narr: 'Step 3: business method unchanged except it now calls abstractions.', code: T6_GOOD, hl: { 11: 'cur', 12: 'ok', 13: 'ok' } },
          { narr: 'Step 4: the MySQL class <b>implements the domain\'s interface</b> — the arrow now points from infrastructure to domain. Dependency inverted.', code: T6_GOOD, hl: { 16: 'ok', 17: 'ok', 18: 'ok' } }
        ]);
      }
    }],
    examples: [
      { title: 'Time is a dependency too: inject a Clock', html: `<p>${H.c('r', 'Bad:')} <code>coupon.isExpired()</code> calls <code>LocalDate.now()</code> inside. Testing "expires at midnight" means waiting until midnight or hacking the system clock. ${H.c('g', 'Good:')} pass a clock (Java: <code>java.time.Clock</code>, made for exactly this; Python: a <code>Callable</code> that returns the current time; TypeScript: a <code>() =&gt; Date</code>; C++: a <code>std::function</code> or a small <code>Clock</code> interface). In Java, production uses <code>Clock.systemDefaultZone()</code> and tests use <code>Clock.fixed(...)</code>.</p>`, code: { lang: 'java', code: `class Coupon {
    private final LocalDate expiry;
    private final Clock clock;
    Coupon(LocalDate expiry, Clock clock) { this.expiry = expiry; this.clock = clock; }
    boolean isExpired() { return LocalDate.now(clock).isAfter(expiry); }

    public static void main(String[] args) {
        Clock fixed = Clock.fixed(Instant.parse("2026-01-02T10:00:00Z"), ZoneOffset.UTC);
        System.out.println(new Coupon(LocalDate.of(2026, 1, 1), fixed).isExpired());   // true, deterministic
    }
}`, alt: [
          { lang: 'python', code: `from datetime import date, datetime, timezone
from typing import Callable


class Coupon:
    def __init__(self, expiry: date, clock: Callable[[], datetime]) -> None:
        self._expiry = expiry
        self._clock = clock  # time is injected, not read from the system

    def is_expired(self) -> bool:
        return self._clock().date() > self._expiry


if __name__ == "__main__":
    fixed = lambda: datetime(2026, 1, 2, 10, 0, tzinfo=timezone.utc)
    print(str(Coupon(date(2026, 1, 1), fixed).is_expired()).lower())  # true, deterministic` },
          { lang: 'ts', code: `class Coupon {
  // expiry is an ISO date "YYYY-MM-DD"; the clock is injected, not read from the system
  constructor(private readonly expiry: string, private readonly now: () => Date) {}
  isExpired(): boolean { return this.now().toISOString().slice(0, 10) > this.expiry; }
}

const fixed = (): Date => new Date("2026-01-02T10:00:00Z");
console.log(new Coupon("2026-01-01", fixed).isExpired()); // true, deterministic` },
          { lang: 'cpp', code: `class Coupon {
    chrono::year_month_day expiry_;
    function<chrono::year_month_day()> today_;   // time is injected, not read from the system
public:
    Coupon(chrono::year_month_day expiry, function<chrono::year_month_day()> today)
        : expiry_(expiry), today_(std::move(today)) {}
    bool isExpired() const { return today_() > expiry_; }
};

int main() {
    using namespace chrono;
    auto fixed = [] { return year_month_day{year{2026}, January, day{2}}; };
    cout << boolalpha << Coupon(year_month_day{year{2026}, January, day{1}}, fixed).isExpired() << "\\n";   // true, deterministic
}` },
  { lang: 'csharp', code: `
using System;

class Coupon {
    private readonly DateTime expiry;
    private readonly Func<DateTime> clock;              // "now" as a dependency
    public Coupon(DateTime expiry, Func<DateTime> clock) { this.expiry = expiry; this.clock = clock; }
    public bool IsExpired() { return clock().Date > expiry; }
}
class Program {
    static void Main() {
        Func<DateTime> fixedClock = () => new DateTime(2026, 1, 2, 10, 0, 0);
        Console.WriteLine(new Coupon(new DateTime(2026, 1, 1), fixedClock).IsExpired().ToString().ToLower());   // true, deterministic
    }
}` }
        ] } },
      { title: 'Payment gateway port: swapping Stripe for Razorpay', html: `<p>The checkout domain defines <code>interface PaymentGateway { PaymentResult charge(Money amount, String token); }</code>. <code>StripeGateway</code> and <code>RazorpayGateway</code> are adapters translating to each vendor's SDK. Expanding to India means writing one adapter and changing one wiring line, and a <code>FakeGateway</code> lets you test declines, timeouts and retries without a sandbox account. This is <b>hexagonal architecture</b> (ports and adapters) — DIP applied to a whole application.</p>` },
      { title: 'Spring does the wiring, DIP is still your job', html: `<p>With Spring, <code>@Service class OrderService { OrderService(OrderRepository repo, Notifier n) {…} }</code> gets its dependencies injected automatically (constructor injection is the recommended style; field <code>@Autowired</code> hides dependencies and blocks <code>final</code> fields). But if <code>OrderRepository</code> is a JPA interface full of database-specific methods, or the service injects <code>JdbcTemplate</code> directly, you are using DI <b>without</b> DIP — the policy still depends on details.</p>` },
      { title: 'Service Locator: DI\'s evil twin', html: `<p><code>Notifier n = ServiceLocator.get(Notifier.class);</code> inside a method <i>looks</i> decoupled, but dependencies are now hidden (not in the constructor), failures happen at runtime, and tests must configure a global registry. Prefer explicit constructor parameters: if a constructor has 9 parameters, that is useful feedback that the class has too many responsibilities (SRP!).</p>` }
    ],
    deepDive: `<p><b>Ownership of the abstraction is the heart of DIP.</b> If <code>OrderRepository</code> sits in the infrastructure package next to <code>MySqlOrderRepository</code>, the domain still depends on the infrastructure <i>package</i>. Put the interface in the domain package (or module), and make infrastructure depend on domain. In a multi-module build (Maven/Gradle modules, Python packages, TypeScript workspaces, CMake targets), the <code>domain</code> module has <b>no dependency</b> on <code>infra</code>; <code>infra</code> depends on <code>domain</code>; <code>app</code> depends on both and wires them. Architecture tests (ArchUnit in Java, import-linter in Python, dependency-cruiser in TypeScript) can enforce "classes in ..domain.. must not depend on ..infra..".</p>
<p><b>Injection styles:</b> constructor (preferred: immutable, required deps obvious, no partially built objects), setter (optional deps, but allows invalid state), method parameter (for per-call collaborators like a <code>Clock</code> in a pure function), and field injection (framework magic — avoid in new code). Too many constructor parameters is a design signal, not a reason to switch to field injection.</p>
<p><b>Don\'t invert everything.</b> Depending on stable, concrete standard-library types (<code>String</code>, <code>List</code>, <code>BigDecimal</code>, <code>Duration</code>) is fine — they almost never change in breaking ways. Invert dependencies on things that are <b>volatile</b> (vendors, I/O, frameworks), <b>slow</b> (network, disk) or <b>non-deterministic</b> (time, randomness, UUIDs). A <code>Money</code> value object needs no interface.</p>
<p><b>Runtime vs compile time.</b> Flow of control still goes service → MySQL at runtime; only the <i>source code</i> dependency is inverted. This is what lets plugins work: an IDE core defines extension-point interfaces; plugins compiled years later implement them and are loaded via <code>ServiceLoader</code> (<code>META-INF/services</code>) or the module system's <code>uses</code>/<code>provides</code>.</p>
<p><b>Testing payoff numbers:</b> a typical service test through a real DB + container takes 1–5 s; with in-memory fakes, 1–5 ms. A suite of 2,000 such tests drops from ~1 hour to ~10 seconds, which changes how often developers run tests. Keep a smaller set of integration tests (Testcontainers) to verify each adapter against the real thing — fakes must honour the same contract (LSP!).</p>`,
    aiEra: `<p><b>What AI changes:</b> generated code frequently instantiates clients inline (<code>new OpenAIClient(apiKey)</code>, <code>HttpClient.newHttpClient()</code>, <code>new S3Client()</code>) inside business methods, reads env vars deep in the logic and calls <code>Instant.now()</code> directly. It runs — and is untestable. Tools that let AI agents run your tests reward designs with fast, deterministic tests, which is exactly what DIP gives you.</p>
<p><b>Use AI as a partner:</b> <code>Find every place this class touches I/O, time, randomness or a vendor SDK. Propose a domain-owned interface for each, then generate in-memory fakes and unit tests using them.</code> AI is very good at producing the adapter boilerplate and fakes once the port is defined.</p>
<p><b>DIP for AI features themselves:</b> wrap LLM calls behind a domain port such as <code>interface Summarizer { Summary summarize(Document d); }</code>. You can swap models or vendors, add caching or guardrails as decorators, and test business flows with a deterministic fake summarizer instead of a slow, costly, non-deterministic model call. <b>Where AI goes wrong:</b> it writes interfaces that mirror the vendor SDK (leaky abstraction) or puts the interface in the vendor package. <b>What you must still own:</b> where the ports live, what language they speak, and which dependencies are volatile enough to invert.</p>`,
    problems: [{
      title: 'Make the WeatherAlert service testable',
      level: 'Medium', tags: ['DIP', 'dependency injection', 'testing'], companies: ['Uber', 'Microsoft', 'Atlassian'],
      statement: `<p><code>WeatherAlertService.checkAndAlert(city)</code> creates an HTTP weather client with <code>new</code>, reads the current hour with <code>LocalTime.now()</code>, and sends alerts with <code>System.out</code> (standing in for an SMS SDK). Rules: send an alert if the temperature is above 40 °C, but <b>not between 22:00 and 07:00</b> (quiet hours) unless it is above 45 °C. Refactor using DIP so the rules can be tested for any temperature and any time in milliseconds, and the SMS vendor can be swapped.</p>`,
      constraints: `<p>Standard library only: no frameworks or mocking libraries. Write the "tests" as plain assertions in <code>main</code> using hand-written fakes.</p>`,
      example: `<p>42 °C at 14:00 → ${H.c('g', 'alert')}. 42 °C at 23:30 → ${H.c('y', 'no alert (quiet hours)')}. 46 °C at 23:30 → ${H.c('r', 'alert (emergency overrides quiet hours)')}. 30 °C anytime → no alert.</p>`,
      brute: {
        why: `<p>All three dependencies are hard-wired: the network (slow, flaky, rate-limited), the system clock (you cannot test 23:30 at 14:00) and the alert channel (tests would send real SMS). The only way to test the quiet-hours rule is to run it at night against a live API. Swapping vendors means editing the business rule class.</p>`,
        code: { lang: 'java', code: `class HttpWeatherClient {
    double currentTemp(String city) {
        System.out.println("GET https://api.weather.example/" + city);   // pretend network call
        return 41.5;
    }
}
class WeatherAlertService {
    void checkAndAlert(String city) {
        double t = new HttpWeatherClient().currentTemp(city);   // hidden dependency 1
        int hour = LocalTime.now().getHour();                   // hidden dependency 2
        boolean quiet = hour >= 22 || hour < 7;
        if (t > 45 || (t > 40 && !quiet))
            System.out.println("SMS: heat alert in " + city + " " + t);   // hidden dependency 3
    }
}`, alt: [
                { lang: 'python', code: `
import datetime

class HttpWeatherClient:
    def current_temp(self, city):
        print("GET https://api.weather.example/" + city)   # pretend network call
        return 41.5

class WeatherAlertService:
    def check_and_alert(self, city):
        t = HttpWeatherClient().current_temp(city)   # hidden dependency 1
        hour = datetime.datetime.now().hour          # hidden dependency 2
        quiet = hour >= 22 or hour < 7
        if t > 45 or (t > 40 and not quiet):
            print(f"SMS: heat alert in {city} {t}")   # hidden dependency 3` },
                { lang: 'ts', code: `
class HttpWeatherClient {
    currentTemp(city: string): number {
        console.log("GET https://api.weather.example/" + city);   // pretend network call
        return 41.5;
    }
}
class WeatherAlertService {
    checkAndAlert(city: string): void {
        const t = new HttpWeatherClient().currentTemp(city);   // hidden dependency 1
        const hour = new Date().getHours();                    // hidden dependency 2
        const quiet = hour >= 22 || hour < 7;
        if (t > 45 || (t > 40 && !quiet))
            console.log("SMS: heat alert in " + city + " " + t);   // hidden dependency 3
    }
}` },
                { lang: 'cpp', code: `
class HttpWeatherClient {
public:
    double currentTemp(const string& city) {
        cout << "GET https://api.weather.example/" << city << "\\n";   // pretend network call
        return 41.5;
    }
};
class WeatherAlertService {
public:
    void checkAndAlert(const string& city) {
        double t = HttpWeatherClient().currentTemp(city);   // hidden dependency 1
        time_t now = time(nullptr);
        int hour = localtime(&now)->tm_hour;                // hidden dependency 2
        bool quiet = hour >= 22 || hour < 7;
        if (t > 45 || (t > 40 && !quiet))
            cout << "SMS: heat alert in " << city << " " << t << "\\n";   // hidden dependency 3
    }
};` },
  { lang: 'csharp', code: `
using System;

class HttpWeatherClient {
    public double CurrentTemp(string city) {
        Console.WriteLine("GET https://api.weather.example/" + city);   // pretend network call
        return 41.5;
    }
}
class WeatherAlertService {
    public void CheckAndAlert(string city) {
        double t = new HttpWeatherClient().CurrentTemp(city);   // hidden dependency 1
        int hour = DateTime.Now.Hour;                           // hidden dependency 2
        bool quiet = hour >= 22 || hour < 7;
        if (t > 45 || (t > 40 && !quiet))
            Console.WriteLine("SMS: heat alert in " + city + " " + t);   // hidden dependency 3
    }
}` }
              ] }
      },
      mcq: { q: 'Which of these should become injected dependencies?', options: ['Weather source, clock and alert sender', 'Only the weather source', 'Only the alert sender', 'None — use static mocking instead'], answer: 0, explain: 'All three are volatile or non-deterministic: network, time and an external vendor. Each gets a domain-owned interface (or a standard clock abstraction).' },
      hints: [
        `<p>Find the hidden inputs: anything from the network, the clock or an external system. Each one is a dependency to invert.</p>`,
        `<p>Define <code>WeatherProvider</code> and <code>AlertSender</code> interfaces in the domain; use a clock abstraction for time (<code>java.time.Clock</code> in Java, or a small <code>Clock</code> interface). Inject all three via the constructor.</p>`,
        `<p>Fakes: <code>FixedWeather(temp)</code>, <code>RecordingSender</code> (stores messages), a fixed clock (<code>Clock.fixed(...)</code> in Java). Test boundaries: 40 vs 40.1, 45 vs 45.1, 21:59 vs 22:00, 06:59 vs 07:00.</p>`
      ],
      tests: { io: true, cases: [{ stdin: '', stdout: "ok: 42.0C at 14:00 -> true\nok: 42.0C at 23:30 -> false\nok: 46.0C at 23:30 -> true\nok: 30.0C at 12:00 -> false\nok: 40.1C at 21:59 -> true\nok: 40.1C at 22:00 -> false\nok: 45.0C at 06:59 -> false\nok: 42.0C at 07:00 -> true\nGET weather for Delhi\nSMS: Heat alert in Delhi: 41.5C\n" }] },
      solution: {
        approach: `<p><b>Invert every volatile dependency.</b> The service keeps only the rule. <code>WeatherProvider</code> and <code>AlertSender</code> are domain ports; time comes from an injected <code>Clock</code> (zone-aware). Production wiring passes the HTTP client and SMS adapter; tests pass a fixed weather fake, a recording sender and <code>Clock.fixed</code>. The quiet-hours logic is now covered at exact boundaries in milliseconds, and switching SMS vendors is a new adapter only.</p>`,
        code: `interface WeatherProvider { double currentTempC(String city); }
interface AlertSender { void send(String message); }

class WeatherAlertService {
    private final WeatherProvider weather;
    private final AlertSender sender;
    private final Clock clock;

    WeatherAlertService(WeatherProvider weather, AlertSender sender, Clock clock) {
        this.weather = weather; this.sender = sender; this.clock = clock;
    }

    boolean checkAndAlert(String city) {
        double t = weather.currentTempC(city);
        int hour = LocalTime.now(clock).getHour();
        boolean quiet = hour >= 22 || hour < 7;
        boolean alert = t > 45 || (t > 40 && !quiet);
        if (alert) sender.send(String.format("Heat alert in %s: %.1fC", city, t));
        return alert;
    }
}

// production adapters (would wrap real HTTP / SMS SDKs)
class HttpWeatherProvider implements WeatherProvider {
    public double currentTempC(String city) { System.out.println("GET weather for " + city); return 41.5; }
}
class SmsAlertSender implements AlertSender {
    public void send(String m) { System.out.println("SMS: " + m); }
}

// test fakes
class FixedWeather implements WeatherProvider {
    private final double t; FixedWeather(double t) { this.t = t; }
    public double currentTempC(String city) { return t; }
}
class RecordingSender implements AlertSender {
    final List<String> sent = new ArrayList<>();
    public void send(String m) { sent.add(m); }
}

class WeatherAlertTest {
    static Clock at(String hhmm) {
        return Clock.fixed(Instant.parse("2026-05-01T" + hhmm + ":00Z"), ZoneOffset.UTC);
    }
    static void check(double temp, String time, boolean expected) {
        RecordingSender s = new RecordingSender();
        boolean got = new WeatherAlertService(new FixedWeather(temp), s, at(time)).checkAndAlert("Delhi");
        if (got != expected || s.sent.size() != (expected ? 1 : 0))
            throw new AssertionError(temp + "C at " + time + " expected " + expected);
        System.out.println(String.format("ok: %.1fC at %s -> %b", temp, time, got));
    }
    public static void main(String[] args) {
        check(42, "14:00", true);
        check(42, "23:30", false);
        check(46, "23:30", true);
        check(30, "12:00", false);
        check(40.1, "21:59", true);
        check(40.1, "22:00", false);
        check(45.0, "06:59", false);
        check(42, "07:00", true);
        // production wiring (a real app passes Clock.systemDefaultZone(); fixed here so the output is repeatable)
        new WeatherAlertService(new HttpWeatherProvider(), new SmsAlertSender(), at("14:00")).checkAndAlert("Delhi");
    }
}`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod


class WeatherProvider(ABC):
    @abstractmethod
    def current_temp_c(self, city: str) -> float: ...


class AlertSender(ABC):
    @abstractmethod
    def send(self, message: str) -> None: ...


class Clock(ABC):
    @abstractmethod
    def hour(self) -> int: ...


class WeatherAlertService:
    def __init__(self, weather: WeatherProvider, sender: AlertSender, clock: Clock) -> None:
        self._weather = weather
        self._sender = sender
        self._clock = clock

    def check_and_alert(self, city: str) -> bool:
        t = self._weather.current_temp_c(city)
        hour = self._clock.hour()
        quiet = hour >= 22 or hour < 7
        alert = t > 45 or (t > 40 and not quiet)
        if alert:
            self._sender.send(f"Heat alert in {city}: {t:.1f}C")
        return alert


# production adapters (would wrap real HTTP / SMS SDKs)
class HttpWeatherProvider(WeatherProvider):
    def current_temp_c(self, city: str) -> float:
        print(f"GET weather for {city}")
        return 41.5


class SmsAlertSender(AlertSender):
    def send(self, message: str) -> None:
        print(f"SMS: {message}")


class FixedClock(Clock):  # a real app would also have a SystemClock
    def __init__(self, hhmm: str) -> None:
        self._hour = int(hhmm.split(":")[0])

    def hour(self) -> int:
        return self._hour


# test fakes
class FixedWeather(WeatherProvider):
    def __init__(self, t: float) -> None:
        self._t = t

    def current_temp_c(self, city: str) -> float:
        return self._t


class RecordingSender(AlertSender):
    def __init__(self) -> None:
        self.sent: list[str] = []

    def send(self, message: str) -> None:
        self.sent.append(message)


class WeatherAlertTest:
    @staticmethod
    def at(hhmm: str) -> Clock:
        return FixedClock(hhmm)

    @staticmethod
    def check(temp: float, time: str, expected: bool) -> None:
        s = RecordingSender()
        got = WeatherAlertService(FixedWeather(temp), s, WeatherAlertTest.at(time)).check_and_alert("Delhi")
        if got != expected or len(s.sent) != (1 if expected else 0):
            raise AssertionError(f"{temp}C at {time} expected {expected}")
        print(f"ok: {temp:.1f}C at {time} -> {str(got).lower()}")


def main() -> None:
    check = WeatherAlertTest.check
    check(42, "14:00", True)
    check(42, "23:30", False)
    check(46, "23:30", True)
    check(30, "12:00", False)
    check(40.1, "21:59", True)
    check(40.1, "22:00", False)
    check(45.0, "06:59", False)
    check(42, "07:00", True)
    # production wiring (a real app passes a SystemClock; fixed here so the output is repeatable)
    WeatherAlertService(HttpWeatherProvider(), SmsAlertSender(), WeatherAlertTest.at("14:00")).check_and_alert("Delhi")


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `interface WeatherProvider { currentTempC(city: string): number; }
interface AlertSender { send(message: string): void; }
interface Clock { hour(): number; }

class WeatherAlertService {
  constructor(
    private readonly weather: WeatherProvider,
    private readonly sender: AlertSender,
    private readonly clock: Clock,
  ) {}

  checkAndAlert(city: string): boolean {
    const t = this.weather.currentTempC(city);
    const hour = this.clock.hour();
    const quiet = hour >= 22 || hour < 7;
    const alert = t > 45 || (t > 40 && !quiet);
    if (alert) this.sender.send(\`Heat alert in \${city}: \${t.toFixed(1)}C\`);
    return alert;
  }
}

// production adapters (would wrap real HTTP / SMS SDKs)
class HttpWeatherProvider implements WeatherProvider {
  currentTempC(city: string): number {
    console.log(\`GET weather for \${city}\`);
    return 41.5;
  }
}
class SmsAlertSender implements AlertSender {
  send(m: string): void { console.log(\`SMS: \${m}\`); }
}
class FixedClock implements Clock { // a real app would also have a SystemClock
  private readonly h: number;
  constructor(hhmm: string) { this.h = Number(hhmm.split(":")[0]); }
  hour(): number { return this.h; }
}

// test fakes
class FixedWeather implements WeatherProvider {
  constructor(private readonly t: number) {}
  currentTempC(_city: string): number { return this.t; }
}
class RecordingSender implements AlertSender {
  readonly sent: string[] = [];
  send(m: string): void { this.sent.push(m); }
}

class WeatherAlertTest {
  static at(hhmm: string): Clock { return new FixedClock(hhmm); }
  static check(temp: number, time: string, expected: boolean): void {
    const s = new RecordingSender();
    const got = new WeatherAlertService(new FixedWeather(temp), s, WeatherAlertTest.at(time)).checkAndAlert("Delhi");
    if (got !== expected || s.sent.length !== (expected ? 1 : 0))
      throw new Error(\`\${temp}C at \${time} expected \${expected}\`);
    console.log(\`ok: \${temp.toFixed(1)}C at \${time} -> \${got}\`);
  }
}

function main(): void {
  const check = WeatherAlertTest.check;
  check(42, "14:00", true);
  check(42, "23:30", false);
  check(46, "23:30", true);
  check(30, "12:00", false);
  check(40.1, "21:59", true);
  check(40.1, "22:00", false);
  check(45.0, "06:59", false);
  check(42, "07:00", true);
  // production wiring (a real app passes a SystemClock; fixed here so the output is repeatable)
  new WeatherAlertService(new HttpWeatherProvider(), new SmsAlertSender(), WeatherAlertTest.at("14:00")).checkAndAlert("Delhi");
}
main();` },
          { lang: 'cpp', code: `class WeatherProvider {
public:
    virtual ~WeatherProvider() = default;
    virtual double currentTempC(const string& city) const = 0;
};
class AlertSender {
public:
    virtual ~AlertSender() = default;
    virtual void send(const string& message) = 0;
};
class Clock {
public:
    virtual ~Clock() = default;
    virtual int hour() const = 0;
};

class WeatherAlertService {
    const WeatherProvider& weather_;
    AlertSender& sender_;
    const Clock& clock_;
public:
    WeatherAlertService(const WeatherProvider& weather, AlertSender& sender, const Clock& clock)
        : weather_(weather), sender_(sender), clock_(clock) {}

    bool checkAndAlert(const string& city) {
        double t = weather_.currentTempC(city);
        int hour = clock_.hour();
        bool quiet = hour >= 22 || hour < 7;
        bool alert = t > 45 || (t > 40 && !quiet);
        if (alert) {
            char buf[96];
            snprintf(buf, sizeof buf, "Heat alert in %s: %.1fC", city.c_str(), t);
            sender_.send(buf);
        }
        return alert;
    }
};

// production adapters (would wrap real HTTP / SMS SDKs)
class HttpWeatherProvider : public WeatherProvider {
public:
    double currentTempC(const string& city) const override {
        cout << "GET weather for " << city << "\\n";
        return 41.5;
    }
};
class SmsAlertSender : public AlertSender {
public:
    void send(const string& m) override { cout << "SMS: " << m << "\\n"; }
};
class FixedClock : public Clock {   // a real app would also have a SystemClock
    int hour_;
public:
    explicit FixedClock(const string& hhmm) : hour_(stoi(hhmm.substr(0, 2))) {}
    int hour() const override { return hour_; }
};

// test fakes
class FixedWeather : public WeatherProvider {
    double t_;
public:
    explicit FixedWeather(double t) : t_(t) {}
    double currentTempC(const string&) const override { return t_; }
};
class RecordingSender : public AlertSender {
public:
    vector<string> sent;
    void send(const string& m) override { sent.push_back(m); }
};

class WeatherAlertTest {
public:
    static void check(double temp, const string& time, bool expected) {
        RecordingSender s;
        FixedWeather weather(temp);
        FixedClock clock(time);
        bool got = WeatherAlertService(weather, s, clock).checkAndAlert("Delhi");
        if (got != expected || s.sent.size() != (expected ? 1u : 0u))
            throw runtime_error("unexpected result at " + time);
        printf("ok: %.1fC at %s -> %s\\n", temp, time.c_str(), got ? "true" : "false");
    }
};

int main() {
    auto check = WeatherAlertTest::check;
    check(42, "14:00", true);
    check(42, "23:30", false);
    check(46, "23:30", true);
    check(30, "12:00", false);
    check(40.1, "21:59", true);
    check(40.1, "22:00", false);
    check(45.0, "06:59", false);
    check(42, "07:00", true);
    // production wiring (a real app passes a SystemClock; fixed here so the output is repeatable)
    HttpWeatherProvider http;
    SmsAlertSender sms;
    FixedClock afternoon("14:00");
    WeatherAlertService(http, sms, afternoon).checkAndAlert("Delhi");
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

interface IWeatherProvider { double CurrentTempC(string city); }
interface IAlertSender { void Send(string message); }

class WeatherAlertService {
    private readonly IWeatherProvider weather;
    private readonly IAlertSender sender;
    private readonly Func<DateTime> clock;

    public WeatherAlertService(IWeatherProvider weather, IAlertSender sender, Func<DateTime> clock) {
        this.weather = weather; this.sender = sender; this.clock = clock;
    }

    public bool CheckAndAlert(string city) {
        double t = weather.CurrentTempC(city);
        int hour = clock().Hour;
        bool quiet = hour >= 22 || hour < 7;
        bool alert = t > 45 || (t > 40 && !quiet);
        if (alert) sender.Send("Heat alert in " + city + ": " + t.ToString("F1") + "C");
        return alert;
    }
}

// production adapters (would wrap real HTTP / SMS SDKs)
class HttpWeatherProvider : IWeatherProvider {
    public double CurrentTempC(string city) { Console.WriteLine("GET weather for " + city); return 41.5; }
}
class SmsAlertSender : IAlertSender {
    public void Send(string m) { Console.WriteLine("SMS: " + m); }
}

// test fakes
class FixedWeather : IWeatherProvider {
    private readonly double t; public FixedWeather(double t) { this.t = t; }
    public double CurrentTempC(string city) { return t; }
}
class RecordingSender : IAlertSender {
    public readonly List<string> Sent = new List<string>();
    public void Send(string m) { Sent.Add(m); }
}

class Program {
    static Func<DateTime> At(string hhmm) {
        DateTime fixedTime = DateTime.Parse("2026-05-01T" + hhmm + ":00");
        return () => fixedTime;
    }
    static void Check(double temp, string time, bool expected) {
        RecordingSender s = new RecordingSender();
        bool got = new WeatherAlertService(new FixedWeather(temp), s, At(time)).CheckAndAlert("Delhi");
        if (got != expected || s.Sent.Count != (expected ? 1 : 0))
            throw new Exception(temp + "C at " + time + " expected " + expected);
        Console.WriteLine("ok: " + temp.ToString("F1") + "C at " + time + " -> " + got.ToString().ToLower());
    }
    static void Main() {
        Check(42, "14:00", true);
        Check(42, "23:30", false);
        Check(46, "23:30", true);
        Check(30, "12:00", false);
        Check(40.1, "21:59", true);
        Check(40.1, "22:00", false);
        Check(45.0, "06:59", false);
        Check(42, "07:00", true);
        // production wiring (a real app passes () => DateTime.Now; fixed here so the output is repeatable)
        new WeatherAlertService(new HttpWeatherProvider(), new SmsAlertSender(), At("14:00")).CheckAndAlert("Delhi");
    }
}` }
        ],
        complexity: `<p>O(1) per check. Test suite: 8 boundary cases in a few milliseconds with zero network or SMS cost — impossible before the refactor.</p>`,
        followUps: ['Quiet hours depend on the user\'s time zone — what changes?', 'Add retry with backoff for the weather API without touching the rule: which pattern (decorator around <code>WeatherProvider</code>)?', 'How would you avoid alerting the same city every 5 minutes (dedup / cooldown) — new dependency?']
      }
    }]
  });

  /* ======================= TOPIC 7: SOLID TOGETHER ======================= */
  var T7_BAD = `class ReportService {
  private final MySqlSales db = new MySqlSales();
  String run(String format, String email) {
    List<Sale> sales = db.query("SELECT * FROM sales");
    double total = 0;
    for (Sale s : sales) total += s.amount();
    String out;
    if (format.equals("CSV")) out = toCsv(sales, total);
    else if (format.equals("PDF")) out = toPdf(sales, total);
    else throw new IllegalArgumentException(format);
    new SmtpClient().send(email, out);
    return out;
  }
}
class ScreenReportService extends ReportService {
  @Override String run(String format, String email) {
    throw new UnsupportedOperationException("no email");
  }
}
interface Exporter {
  String csv(List<Sale> s); String pdf(List<Sale> s);
  String xlsx(List<Sale> s); String html(List<Sale> s);
}`;

  topics.push({
    title: 'SOLID Together: Code Reviews, Trade-offs and When Not to Apply It',
    analogy: `<p>A good doctor does not prescribe every medicine in the cabinet. They <b>diagnose first</b> (which symptom? which cause?), then give the smallest effective treatment, and they know side effects. SOLID principles are medicines: <b>SRP, OCP, LSP, ISP, DIP each cure a specific symptom</b>. Taking all of them for a tiny script causes side effects — dozens of interfaces, indirection everywhere ("over-engineering"). The skill is diagnosis plus dosage.</p>`,
    explain: `<p><b>Real code rarely breaks just one principle.</b> Violations travel together: a God class (SRP) usually contains a type switch (OCP), creates its own database client (DIP), and its subclasses throw "not supported" (LSP) because the base interface is too fat (ISP). In interviews you will often get one messy class and be asked to "review and improve" it.</p>
<p><b>A 5-question review checklist</b> (run it on any class):</p>
${H.table(['Ask', 'If yes…', 'Principle'], [
  ['Who would ask to change this class? More than one actor?', 'Split by actor', '<b>S</b>'],
  ['Will a new type/format/provider force me to edit this code?', 'Extract interface + polymorphism', '<b>O</b>'],
  ['Does any subclass throw "unsupported", ignore a call, or need <code>instanceof</code> checks?', 'Fix the hierarchy / use composition', '<b>L</b>'],
  ['Does any implementer or client carry methods it never uses?', 'Split into role interfaces', '<b>I</b>'],
  ['Does business logic <code>new</code> up I/O, vendors, time or randomness?', 'Inject a domain-owned abstraction', '<b>D</b>']
])}
<p><b>How the principles support each other:</b> SRP produces small classes → ISP keeps their interfaces small → DIP lets high-level classes depend on those interfaces → OCP becomes possible because new implementations can be plugged in → LSP makes sure those plug-ins behave. Remove one and the others weaken.</p>
<p><b>When NOT to apply (just as important):</b></p>
<ul>
<li><b>YAGNI</b> ("You Aren't Gonna Need It"): one implementation, no expected variation → no interface yet. Extract it when the second real variation appears (it takes 2 minutes with an IDE).</li>
<li><b>Rule of three:</b> first time just write it, second time notice the duplication, third time refactor to an abstraction.</li>
<li><b>Scripts, prototypes, throw-away code:</b> optimise for speed of learning.</li>
<li><b>Stable things:</b> do not wrap <code>String</code>, <code>List</code> or <code>BigDecimal</code> in interfaces.</li>
</ul>
<p><b>Interview framing:</b> say the smell, name the principle, show the minimal refactor, and mention the trade-off ("this adds two interfaces; worth it because payment providers change every quarter").</p>`,
    clues: [
      '"Review this code" / "what would you improve?" → run the S-O-L-I-D checklist out loud, one finding at a time.',
      '"Is this over-engineered?" → discuss YAGNI, rule of three, number of real implementations.',
      '"How would you make this extensible <b>and</b> testable?" → OCP + DIP together (Strategy behind a domain interface, injected).',
      'Machine-coding with "the interviewer will add a requirement in 20 minutes" → design the likely axis of change with interfaces from the start.',
      '"Explain SOLID with one example" → pick a single class (e.g. a report or notification service) and show all five violations and fixes.',
      '"Which principle matters most?" → senior answer: they are connected; DIP + SRP usually give the biggest testability win.'
    ],
    code: [{ lang: 'java', title: 'Before: one report class violating all five principles', code: `record Sale(String region, double amount) {}

class MySqlSales { List<Sale> query(String sql) { return List.of(new Sale("N", 100), new Sale("S", 250)); } }
class SmtpClient { void send(String to, String body) { System.out.println("SMTP " + to + ":\\n" + body); } }

class ReportService {
    private final MySqlSales db = new MySqlSales();                   // D: concrete DB inside policy
    String run(String format, String email) {                         // S: query + math + format + email
        List<Sale> sales = db.query("SELECT * FROM sales");
        double total = 0;
        for (Sale s : sales) total += s.amount();
        String out;
        if (format.equals("CSV")) out = "region,amount\\n" + total;     // O: every format edits this
        else if (format.equals("PDF")) out = "%PDF total=" + total;
        else throw new IllegalArgumentException(format);
        new SmtpClient().send(email, out);                            // D: concrete mailer
        return out;
    }
}

class ScreenReportService extends ReportService {                     // L: refuses the parent's job
    @Override String run(String format, String email) { throw new UnsupportedOperationException("no email"); }
}

interface Exporter {                                                  // I: every exporter must do 4 formats
    String csv(List<Sale> s); String pdf(List<Sale> s);
    String xlsx(List<Sale> s); String html(List<Sale> s);
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class Sale:
    region: str
    amount: float


class MySqlSales:
    def query(self, sql: str) -> list[Sale]:
        return [Sale("N", 100), Sale("S", 250)]


class SmtpClient:
    def send(self, to: str, body: str) -> None:
        print(f"SMTP {to}:\\n{body}")


class ReportService:
    def __init__(self) -> None:
        self._db = MySqlSales()  # D: concrete DB inside policy

    def run(self, format: str, email: str) -> str:  # S: query + math + format + email
        sales = self._db.query("SELECT * FROM sales")
        total = sum(s.amount for s in sales)
        if format == "CSV":  # O: every format edits this
            out = f"region,amount\\n{total}"
        elif format == "PDF":
            out = f"%PDF total={total}"
        else:
            raise ValueError(format)
        SmtpClient().send(email, out)  # D: concrete mailer
        return out


class ScreenReportService(ReportService):  # L: refuses the parent's job
    def run(self, format: str, email: str) -> str:
        raise NotImplementedError("no email")


class Exporter(ABC):  # I: every exporter must do 4 formats
    @abstractmethod
    def csv(self, s: list[Sale]) -> str: ...

    @abstractmethod
    def pdf(self, s: list[Sale]) -> str: ...

    @abstractmethod
    def xlsx(self, s: list[Sale]) -> str: ...

    @abstractmethod
    def html(self, s: list[Sale]) -> str: ...` },
          { lang: 'ts', code: `interface Sale { readonly region: string; readonly amount: number; }

class MySqlSales {
  query(_sql: string): Sale[] { return [{ region: "N", amount: 100 }, { region: "S", amount: 250 }]; }
}
class SmtpClient {
  send(to: string, body: string): void { console.log(\`SMTP \${to}:\\n\${body}\`); }
}

class ReportService {
  private readonly db = new MySqlSales(); // D: concrete DB inside policy

  run(format: string, email: string): string { // S: query + math + format + email
    const sales = this.db.query("SELECT * FROM sales");
    const total = sales.reduce((sum, s) => sum + s.amount, 0);
    let out: string;
    if (format === "CSV") out = \`region,amount\\n\${total}\`; // O: every format edits this
    else if (format === "PDF") out = \`%PDF total=\${total}\`;
    else throw new Error(format);
    new SmtpClient().send(email, out); // D: concrete mailer
    return out;
  }
}

class ScreenReportService extends ReportService { // L: refuses the parent's job
  override run(_format: string, _email: string): string { throw new Error("no email"); }
}

interface Exporter { // I: every exporter must do 4 formats
  csv(s: Sale[]): string;
  pdf(s: Sale[]): string;
  xlsx(s: Sale[]): string;
  html(s: Sale[]): string;
}` },
          { lang: 'cpp', code: `struct Sale {
    string region;
    double amount;
};

class MySqlSales {
public:
    vector<Sale> query(const string&) const { return {{"N", 100}, {"S", 250}}; }
};
class SmtpClient {
public:
    void send(const string& to, const string& body) const { cout << "SMTP " << to << ":\\n" << body << "\\n"; }
};

class ReportService {
    MySqlSales db_;   // D: concrete DB inside policy
public:
    virtual ~ReportService() = default;
    virtual string run(const string& format, const string& email) {   // S: query + math + format + email
        vector<Sale> sales = db_.query("SELECT * FROM sales");
        double total = 0;
        for (const Sale& s : sales) total += s.amount;
        string out;
        if (format == "CSV") out = "region,amount\\n" + to_string(total);   // O: every format edits this
        else if (format == "PDF") out = "%PDF total=" + to_string(total);
        else throw invalid_argument(format);
        SmtpClient().send(email, out);   // D: concrete mailer
        return out;
    }
};

class ScreenReportService : public ReportService {   // L: refuses the parent's job
public:
    string run(const string&, const string&) override { throw logic_error("no email"); }
};

class Exporter {   // I: every exporter must do 4 formats
public:
    virtual ~Exporter() = default;
    virtual string csv(const vector<Sale>& s) = 0;
    virtual string pdf(const vector<Sale>& s) = 0;
    virtual string xlsx(const vector<Sale>& s) = 0;
    virtual string html(const vector<Sale>& s) = 0;
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

sealed class Sale {
    public readonly string Region; public readonly double Amount;
    public Sale(string region, double amount) { Region = region; Amount = amount; }
}

class MySqlSales { public List<Sale> Query(string sql) { return new List<Sale> { new Sale("N", 100), new Sale("S", 250) }; } }
class SmtpClient { public void Send(string to, string body) { Console.WriteLine("SMTP " + to + ":\\n" + body); } }

class ReportService {
    private readonly MySqlSales db = new MySqlSales();                    // D: concrete DB inside policy
    public virtual string Run(string format, string email) {              // S: query + math + format + email
        List<Sale> sales = db.Query("SELECT * FROM sales");
        double total = 0;
        foreach (Sale s in sales) total += s.Amount;
        string result;
        if (format == "CSV") result = "region,amount\\n" + total;          // O: every format edits this
        else if (format == "PDF") result = "%PDF total=" + total;
        else throw new ArgumentException(format);
        new SmtpClient().Send(email, result);                             // D: concrete mailer
        return result;
    }
}

class ScreenReportService : ReportService {                               // L: refuses the parent's job
    public override string Run(string format, string email) { throw new NotSupportedException("no email"); }
}

interface IExporter {                                                     // I: every exporter must do 4 formats
    string Csv(List<Sale> s); string Pdf(List<Sale> s);
    string Xlsx(List<Sale> s); string Html(List<Sale> s);
}` }
        ] }, { lang: 'java', title: 'After: small roles, plug-in formats, injected I/O', code: `record Sale(String region, double amount) {}
record SalesSummary(List<Sale> sales, double total) {
    static SalesSummary of(List<Sale> sales) {                                        // S: the maths, nothing else
        return new SalesSummary(sales, sales.stream().mapToDouble(Sale::amount).sum());
    }
}

interface SalesSource { List<Sale> load(); }                                           // D: domain-owned ports
interface ReportDelivery { void deliver(String content); }
interface ReportFormat { String code(); String render(SalesSummary s); }               // I: one role, O: plug-in

class CsvFormat implements ReportFormat {
    public String code() { return "CSV"; }
    public String render(SalesSummary s) {
        StringBuilder sb = new StringBuilder("region,amount\\n");
        s.sales().forEach(x -> sb.append(x.region()).append(',').append(x.amount()).append('\\n'));
        return sb.append("TOTAL,").append(s.total()).toString();
    }
}
class TextFormat implements ReportFormat {
    public String code() { return "TEXT"; }
    public String render(SalesSummary s) { return "Total sales: " + s.total(); }
}

class EmailDelivery implements ReportDelivery {
    private final String to;
    EmailDelivery(String to) { this.to = to; }
    public void deliver(String c) { System.out.println("email to " + to + ":\\n" + c); }
}
class ScreenDelivery implements ReportDelivery {                                        // L: an honest sibling
    public void deliver(String c) { System.out.println("[screen]\\n" + c); }
}

class ReportJob {                                                                       // orchestration only
    private final SalesSource source;
    private final Map<String, ReportFormat> formats = new HashMap<>();

    ReportJob(SalesSource source, List<ReportFormat> available) {
        this.source = source;
        available.forEach(f -> formats.put(f.code(), f));
    }

    String run(String formatCode, ReportDelivery delivery) {
        ReportFormat f = formats.get(formatCode);
        if (f == null) throw new IllegalArgumentException("unknown format " + formatCode);
        String out = f.render(SalesSummary.of(source.load()));
        delivery.deliver(out);
        return out;
    }

    public static void main(String[] args) {
        SalesSource fake = () -> List.of(new Sale("N", 100), new Sale("S", 250));      // lambda = tiny adapter
        ReportJob job = new ReportJob(fake, List.of(new CsvFormat(), new TextFormat()));
        job.run("CSV", new EmailDelivery("boss@shop.com"));
        job.run("TEXT", new ScreenDelivery());
    }
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class Sale:
    region: str
    amount: float


@dataclass(frozen=True)
class SalesSummary:
    sales: tuple[Sale, ...]
    total: float

    @staticmethod
    def of(sales: list[Sale]) -> "SalesSummary":  # S: the maths, nothing else
        return SalesSummary(tuple(sales), sum(s.amount for s in sales))


class SalesSource(ABC):  # D: domain-owned ports
    @abstractmethod
    def load(self) -> list[Sale]: ...


class ReportDelivery(ABC):
    @abstractmethod
    def deliver(self, content: str) -> None: ...


class ReportFormat(ABC):  # I: one role, O: plug-in
    @property
    @abstractmethod
    def code(self) -> str: ...

    @abstractmethod
    def render(self, s: SalesSummary) -> str: ...


class CsvFormat(ReportFormat):
    code = "CSV"

    def render(self, s: SalesSummary) -> str:
        rows = ["region,amount"] + [f"{x.region},{x.amount}" for x in s.sales]
        return "\\n".join(rows + [f"TOTAL,{s.total}"])


class TextFormat(ReportFormat):
    code = "TEXT"

    def render(self, s: SalesSummary) -> str:
        return f"Total sales: {s.total}"


class EmailDelivery(ReportDelivery):
    def __init__(self, to: str) -> None:
        self._to = to

    def deliver(self, content: str) -> None:
        print(f"email to {self._to}:\\n{content}")


class ScreenDelivery(ReportDelivery):  # L: an honest sibling
    def deliver(self, content: str) -> None:
        print(f"[screen]\\n{content}")


class FakeSales(SalesSource):  # tiny adapter for the demo
    def load(self) -> list[Sale]:
        return [Sale("N", 100), Sale("S", 250)]


class ReportJob:  # orchestration only
    def __init__(self, source: SalesSource, available: list[ReportFormat]) -> None:
        self._source = source
        self._formats = {f.code: f for f in available}

    def run(self, format_code: str, delivery: ReportDelivery) -> str:
        f = self._formats.get(format_code)
        if f is None:
            raise ValueError(f"unknown format {format_code}")
        out = f.render(SalesSummary.of(self._source.load()))
        delivery.deliver(out)
        return out


if __name__ == "__main__":
    job = ReportJob(FakeSales(), [CsvFormat(), TextFormat()])
    job.run("CSV", EmailDelivery("boss@shop.com"))
    job.run("TEXT", ScreenDelivery())` },
          { lang: 'ts', code: `interface Sale { readonly region: string; readonly amount: number; }
interface SalesSummary { readonly sales: readonly Sale[]; readonly total: number; }

function summarize(sales: readonly Sale[]): SalesSummary { // S: the maths, nothing else
  return { sales, total: sales.reduce((sum, s) => sum + s.amount, 0) };
}

interface SalesSource { load(): Sale[]; } // D: domain-owned ports
interface ReportDelivery { deliver(content: string): void; }
interface ReportFormat { readonly code: string; render(s: SalesSummary): string; } // I: one role, O: plug-in

class CsvFormat implements ReportFormat {
  readonly code = "CSV";
  render(s: SalesSummary): string {
    const rows = ["region,amount", ...s.sales.map((x) => \`\${x.region},\${x.amount}\`), \`TOTAL,\${s.total}\`];
    return rows.join("\\n");
  }
}
class TextFormat implements ReportFormat {
  readonly code = "TEXT";
  render(s: SalesSummary): string { return \`Total sales: \${s.total}\`; }
}

class EmailDelivery implements ReportDelivery {
  constructor(private readonly to: string) {}
  deliver(c: string): void { console.log(\`email to \${this.to}:\\n\${c}\`); }
}
class ScreenDelivery implements ReportDelivery { // L: an honest sibling
  deliver(c: string): void { console.log(\`[screen]\\n\${c}\`); }
}

class ReportJob { // orchestration only
  private readonly formats = new Map<string, ReportFormat>();

  constructor(private readonly source: SalesSource, available: ReportFormat[]) {
    available.forEach((f) => this.formats.set(f.code, f));
  }

  run(formatCode: string, delivery: ReportDelivery): string {
    const f = this.formats.get(formatCode);
    if (f === undefined) throw new Error(\`unknown format \${formatCode}\`);
    const out = f.render(summarize(this.source.load()));
    delivery.deliver(out);
    return out;
  }
}

const fake: SalesSource = { load: () => [{ region: "N", amount: 100 }, { region: "S", amount: 250 }] }; // object literal = tiny adapter
const job = new ReportJob(fake, [new CsvFormat(), new TextFormat()]);
job.run("CSV", new EmailDelivery("boss@shop.com"));
job.run("TEXT", new ScreenDelivery());` },
          { lang: 'cpp', code: `struct Sale {
    string region;
    double amount;
};
struct SalesSummary {
    vector<Sale> sales;
    double total;
    static SalesSummary of(const vector<Sale>& sales) {   // S: the maths, nothing else
        double sum = 0;
        for (const Sale& s : sales) sum += s.amount;
        return {sales, sum};
    }
};

class SalesSource {   // D: domain-owned ports
public:
    virtual ~SalesSource() = default;
    virtual vector<Sale> load() const = 0;
};
class ReportDelivery {
public:
    virtual ~ReportDelivery() = default;
    virtual void deliver(const string& content) = 0;
};
class ReportFormat {   // I: one role, O: plug-in
public:
    virtual ~ReportFormat() = default;
    virtual string code() const = 0;
    virtual string render(const SalesSummary& s) const = 0;
};

class CsvFormat : public ReportFormat {
public:
    string code() const override { return "CSV"; }
    string render(const SalesSummary& s) const override {
        ostringstream out;
        out << "region,amount\\n";
        for (const Sale& x : s.sales) out << x.region << ',' << x.amount << '\\n';
        out << "TOTAL," << s.total;
        return out.str();
    }
};
class TextFormat : public ReportFormat {
public:
    string code() const override { return "TEXT"; }
    string render(const SalesSummary& s) const override {
        ostringstream out;
        out << "Total sales: " << s.total;
        return out.str();
    }
};

class EmailDelivery : public ReportDelivery {
    string to_;
public:
    explicit EmailDelivery(string to) : to_(std::move(to)) {}
    void deliver(const string& c) override { cout << "email to " << to_ << ":\\n" << c << "\\n"; }
};
class ScreenDelivery : public ReportDelivery {   // L: an honest sibling
public:
    void deliver(const string& c) override { cout << "[screen]\\n" << c << "\\n"; }
};

class FakeSales : public SalesSource {   // tiny adapter for the demo
public:
    vector<Sale> load() const override { return {{"N", 100}, {"S", 250}}; }
};

class ReportJob {   // orchestration only
    const SalesSource& source_;
    unordered_map<string, unique_ptr<ReportFormat>> formats_;
public:
    ReportJob(const SalesSource& source, vector<unique_ptr<ReportFormat>> available) : source_(source) {
        for (auto& f : available) {
            string code = f->code();
            formats_[code] = std::move(f);
        }
    }

    string run(const string& formatCode, ReportDelivery& delivery) const {
        auto it = formats_.find(formatCode);
        if (it == formats_.end()) throw invalid_argument("unknown format " + formatCode);
        string out = it->second->render(SalesSummary::of(source_.load()));
        delivery.deliver(out);
        return out;
    }
};

int main() {
    FakeSales fake;
    vector<unique_ptr<ReportFormat>> formats;
    formats.push_back(make_unique<CsvFormat>());
    formats.push_back(make_unique<TextFormat>());
    ReportJob job(fake, std::move(formats));
    EmailDelivery email("boss@shop.com");
    ScreenDelivery screen;
    job.run("CSV", email);
    job.run("TEXT", screen);
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

sealed class Sale {
    public readonly string Region; public readonly double Amount;
    public Sale(string region, double amount) { Region = region; Amount = amount; }
}
sealed class SalesSummary {
    public readonly List<Sale> Sales; public readonly double Total;
    private SalesSummary(List<Sale> sales, double total) { Sales = sales; Total = total; }
    public static SalesSummary Of(List<Sale> sales) {                                   // S: the maths, nothing else
        return new SalesSummary(sales, sales.Sum(s => s.Amount));
    }
}

interface ISalesSource { List<Sale> Load(); }                                           // D: domain-owned ports
interface IReportDelivery { void Deliver(string content); }
interface IReportFormat { string Code { get; } string Render(SalesSummary s); }          // I: one role, O: plug-in

class CsvFormat : IReportFormat {
    public string Code { get { return "CSV"; } }
    public string Render(SalesSummary s) {
        StringBuilder sb = new StringBuilder("region,amount\\n");
        foreach (Sale x in s.Sales) sb.Append(x.Region).Append(',').Append(x.Amount.ToString("0.0")).Append('\\n');
        return sb.Append("TOTAL,").Append(s.Total.ToString("0.0")).ToString();
    }
}
class TextFormat : IReportFormat {
    public string Code { get { return "TEXT"; } }
    public string Render(SalesSummary s) { return "Total sales: " + s.Total.ToString("0.0"); }
}

class EmailDelivery : IReportDelivery {
    private readonly string to;
    public EmailDelivery(string to) { this.to = to; }
    public void Deliver(string c) { Console.WriteLine("email to " + to + ":\\n" + c); }
}
class ScreenDelivery : IReportDelivery {                                                // L: an honest sibling
    public void Deliver(string c) { Console.WriteLine("[screen]\\n" + c); }
}
sealed class LambdaSource : ISalesSource {                                              // lambda = tiny adapter
    private readonly Func<List<Sale>> load;
    public LambdaSource(Func<List<Sale>> load) { this.load = load; }
    public List<Sale> Load() { return load(); }
}

class ReportJob {                                                                       // orchestration only
    private readonly ISalesSource source;
    private readonly Dictionary<string, IReportFormat> formats = new Dictionary<string, IReportFormat>();

    public ReportJob(ISalesSource source, IEnumerable<IReportFormat> available) {
        this.source = source;
        foreach (IReportFormat f in available) formats[f.Code] = f;
    }

    public string Run(string formatCode, IReportDelivery delivery) {
        IReportFormat f;
        if (!formats.TryGetValue(formatCode, out f)) throw new ArgumentException("unknown format " + formatCode);
        string result = f.Render(SalesSummary.Of(source.Load()));
        delivery.Deliver(result);
        return result;
    }
}

class Program {
    static void Main() {
        ISalesSource fake = new LambdaSource(() => new List<Sale> { new Sale("N", 100), new Sale("S", 250) });
        ReportJob job = new ReportJob(fake, new IReportFormat[] { new CsvFormat(), new TextFormat() });
        job.Run("CSV", new EmailDelivery("boss@shop.com"));
        job.Run("TEXT", new ScreenDelivery());
    }
}` }
        ] }],
    codeTitle: ['Bad: all five violations', 'Good: SOLID refactor'],
    viz: [{
      title: 'Code review: find the violations one principle at a time',
      input: 'SOLID',
      inputLabel: 'Principles to review (letters from S O L I D, e.g. SD)',
      gen: function (input) {
        var letters = String(input || '').toUpperCase().replace(/[^A-Z]/g, '').split('');
        var uniq = [];
        letters.forEach(function (l) { if (uniq.indexOf(l) < 0) uniq.push(l); });
        if (!uniq.length || uniq.some(function (l) { return 'SOLID'.indexOf(l) < 0; })) throw new Error('Use only the letters S, O, L, I, D (e.g. SOLID or SD)');
        uniq.sort(function (a, b) { return 'SOLID'.indexOf(a) - 'SOLID'.indexOf(b); });
        var F2 = {
          S: { lines: [3, 4, 5, 6, 8, 9, 11], name: 'Single Responsibility', msg: '<code>run()</code> queries the DB, does the maths, formats AND emails — four actors (DBA, finance, report users, IT) in one method.', fix: 'SalesSource + SalesSummary + ReportFormat + ReportDelivery, ReportJob orchestrates' },
          O: { lines: [8, 9, 10], name: 'Open/Closed', msg: 'The if/else on <code>format</code>: adding XLSX means editing this tested method.', fix: 'ReportFormat interface + registry map; new format = new class' },
          L: { lines: [15, 16, 17, 18, 19], name: 'Liskov Substitution', msg: '<code>ScreenReportService</code> throws where the parent works. Code holding a <code>ReportService</code> crashes if given this subclass.', fix: 'Delivery is a separate role: EmailDelivery and ScreenDelivery are siblings' },
          I: { lines: [20, 21, 22, 23], name: 'Interface Segregation', msg: 'Fat <code>Exporter</code>: an exporter that only does CSV must still implement pdf, xlsx and html.', fix: 'One small ReportFormat role per format class' },
          D: { lines: [2, 11], name: 'Dependency Inversion', msg: 'Business logic builds <code>new MySqlSales()</code> and <code>new SmtpClient()</code> — untestable, unswappable.', fix: 'Inject SalesSource and ReportDelivery (domain-owned interfaces)' }
        };
        var frames = [F('A teammate asks you to review this <b>ReportService</b>. It works in production. We will check it against: <b>' + uniq.join(', ') + '</b>.', [CODE('ReportService (under review)', T7_BAD, {}), { type: 'table', label: 'Review findings', columns: ['Principle', 'Lines', 'Fix'], rows: [] }])];
        var rows = [], all = {};
        uniq.forEach(function (l) {
          var f = F2[l], hl = {};
          Object.keys(all).forEach(function (k) { hl[k] = 'done'; });
          f.lines.forEach(function (n) { hl[n] = 'bad'; all[n] = 1; });
          rows.push([l + ' — ' + f.name, f.lines.join(', '), f.fix]);
          frames.push(F('<b>' + l + ' — ' + f.name + ':</b> ' + f.msg, [CODE('ReportService (under review)', T7_BAD, hl), { type: 'table', label: 'Review findings', columns: ['Principle', 'Lines', 'Fix'], rows: rows.slice(), hl: (function () { var r = {}; r[rows.length - 1] = 'sel'; return r; })() }]));
        });
        var nodes = [B('JOB', 'ReportJob', 50, 6), B('SRC', '«SalesSource»', 15, 24), B('SUM', 'SalesSummary', 50, 24), B('FMT', '«ReportFormat»', 85, 24),
          B('DEL', '«ReportDelivery»', 30, 44), B('CSV', 'CsvFormat', 72, 44), B('TXT', 'TextFormat', 94, 44), B('EM', 'EmailDelivery', 18, 62), B('SC', 'ScreenDelivery', 48, 62), B('MY', 'MySqlSource', 80, 62)];
        var edges = [['JOB', 'SRC'], ['JOB', 'SUM'], ['JOB', 'FMT'], ['JOB', 'DEL'], ['CSV', 'FMT'], ['TXT', 'FMT'], ['EM', 'DEL'], ['SC', 'DEL'], ['MY', 'SRC']];
        frames.push(F('<b>Refactored design.</b> Each finding maps to a box: small roles (purple), plug-in implementations (green arrows point up into abstractions), and a thin <b>ReportJob</b> that only orchestrates.',
          [G('After the review', nodes, edges, { ehl: paint(edges, 'ok'), h: 70, hl: { SRC: 'sel', FMT: 'sel', DEL: 'sel', JOB: 'cur' } }), { type: 'table', label: 'Review findings', columns: ['Principle', 'Lines', 'Fix'], rows: rows.slice() }]));
        frames.push(F('Sanity check on cost: we went from 3 tangled types to ~9 small ones. Worth it here because formats and delivery channels <b>do</b> change often. For a one-off script, the original would be fine — say this trade-off out loud in interviews.',
          [{ type: 'vars', label: 'trade-off', vals: { typesBefore: 3, typesAfter: 9, filesEditedToAddXlsx_before: 1 + ' (core method)', filesEditedToAddXlsx_after: '0 (+1 new class)' }, hl: { filesEditedToAddXlsx_after: 'ok', typesAfter: 'cur' } }]));
        return frames;
      }
    }, {
      title: 'Dosage: rule of three vs over-engineering',
      gen: function () {
        return [
          F('<b>Variation 1:</b> the shop sells only in India. Just write <code>GstTax</code> as a plain class. No interface yet — YAGNI. Any extra abstraction now is a guess.',
            [G('Design', [B('CO', 'Checkout', 30, 10), B('G', 'GstTax', 70, 10)], [['CO', 'G']], { h: 22, hl: { G: 'ok' } }), { type: 'vars', label: 'state', vals: { realVariations: 1, interfaces: 0, verdict: 'keep simple' }, hl: { verdict: 'ok' } }]),
          F('<b>Variation 2:</b> UAE launch needs VAT. You notice the duplication / branching. Many teams add one <code>if</code> here and note it. Some extract the interface now if a third region is already on the roadmap.',
            [G('Design', [B('CO', 'Checkout', 30, 10), B('G', 'GstTax', 70, 6), B('V', 'VatTax', 70, 18)], [['CO', 'G'], ['CO', 'V']], { h: 26, ehl: { 'CO-V': 'cur' } }), { type: 'vars', label: 'state', vals: { realVariations: 2, interfaces: 0, verdict: 'watch it' }, hl: { verdict: 'cur' } }]),
          F('<b>Variation 3:</b> Singapore GST. Now the axis of change is <i>proven</i>. Extract <b>«TaxPolicy»</b>, inject it, and every future country is a new class (OCP + DIP), each tested alone (SRP).',
            [G('Design', [B('CO', 'Checkout', 50, 6), B('TP', '«TaxPolicy»', 50, 22), B('G', 'GstTax', 18, 40), B('V', 'VatTax', 50, 40), B('SG', 'SgGstTax', 82, 40)], [['CO', 'TP'], ['G', 'TP'], ['V', 'TP'], ['SG', 'TP']], { h: 48, ehl: { 'CO-TP': 'ok', 'G-TP': 'ok', 'V-TP': 'ok', 'SG-TP': 'ok' }, hl: { TP: 'sel' } }),
              { type: 'vars', label: 'state', vals: { realVariations: 3, interfaces: 1, verdict: 'refactor now' }, hl: { verdict: 'ok' } }]),
          F('<span class="c-r">Over-engineering:</span> the same feature built "enterprise style" on day one — factory for a factory, an interface per class, one implementation each. Every arrow is indirection a reader must follow, and none of it protects against a real change.',
            [G('Needless complexity', [B('CO', 'Checkout', 12, 8), B('F1', '«TaxFactoryProvider»', 50, 8), B('F2', 'TaxFactoryProviderImpl', 50, 26), B('F3', '«TaxFactory»', 12, 26), B('F4', 'TaxFactoryImpl', 12, 44), B('TI', '«ITax»', 50, 44), B('T', 'TaxImpl', 88, 44)],
              [['CO', 'F1'], ['F2', 'F1'], ['F2', 'F3'], ['F4', 'F3'], ['F4', 'TI'], ['T', 'TI']], { h: 52, ehl: { 'CO-F1': 'bad', 'F2-F1': 'bad', 'F2-F3': 'bad', 'F4-F3': 'bad', 'F4-TI': 'bad', 'T-TI': 'bad' }, hl: { F1: 'bad', F2: 'bad', F3: 'bad', F4: 'bad' }, tags: { T: 'only 1 impl ever' } }),
              { type: 'vars', label: 'state', vals: { realVariations: 1, interfaces: 3, verdict: 'needless complexity' }, hl: { verdict: 'bad' } }]),
          F('<b>Takeaway:</b> SOLID is a response to <b>real or clearly expected change</b>. Good designers can explain <i>why</i> each abstraction exists ("tax varies by country — 3 already, 2 more planned"). If you cannot name the change an interface protects against, you probably do not need it yet.',
            [{ type: 'table', label: 'When to abstract', columns: ['Signal', 'Action'], rows: [['1 implementation, no roadmap', 'Concrete class'], ['Needed for testing (I/O, time, vendor)', 'Interface now (DIP)'], ['2 variations', 'Consider; note it'], ['3+ variations / plugin requirement', 'Interface + strategy (OCP)'], ['Interface with 1 impl and no test need', 'Remove it']], hl: { 1: 'sel', 3: 'ok' } }])
        ];
      }
    }],
    examples: [
      { title: 'Parking Lot interview: where SOLID shows up', html: `<p>${H.table(['Requirement', 'Principle', 'Design move'], [['New vehicle types (EV, truck)', 'O, L', '<code>Vehicle</code> hierarchy where every subtype is substitutable; spot fitting via <code>SpotType</code> rules'], ['Pricing changes per city/hour', 'O, D', '<code>PricingStrategy</code> interface injected into <code>TicketService</code>'], ['Payment by card/UPI/cash', 'O, I', '<code>PaymentMethod</code> role; only cash needs <code>ChangeDispenser</code>'], ['Display boards vs admin panel', 'I', '<code>SpotAvailabilityReader</code> vs <code>SpotAdmin</code> interfaces'], ['Entry gate logic vs billing', 'S', '<code>EntryGate</code>, <code>BillingService</code>, <code>SpotAllocator</code> separate']])}</p>` },
      { title: 'SOLID in a functional style', html: `<p>A one-method interface is just a function. First-class functions (Java lambdas, Python callables, TypeScript arrow functions, C++ <code>std::function</code>) let you apply OCP and DIP with almost no ceremony. In Java, inject a <code>Function&lt;Order, Double&gt;</code> discount, a <code>Supplier&lt;Instant&gt;</code> clock or a <code>Predicate&lt;User&gt;</code> rule. Prefer a <b>named</b> interface when the role deserves a domain name or needs several methods; use built-in functional types for tiny, local strategies.</p>`, code: { lang: 'java', code: `record Order(String id, double amount) {}
class Pricing {
    private final Function<Order, Double> discount;      // strategy as a function (OCP)
    private final Supplier<Instant> now;                  // time as a dependency (DIP)
    Pricing(Function<Order, Double> discount, Supplier<Instant> now) { this.discount = discount; this.now = now; }
    String quote(Order o) { return o.id() + " pays " + (o.amount() - discount.apply(o)) + " at " + now.get(); }

    public static void main(String[] args) {
        Pricing p = new Pricing(o -> o.amount() > 1000 ? 100.0 : 0.0, () -> Instant.parse("2026-01-01T00:00:00Z"));
        System.out.println(p.quote(new Order("A1", 1500)));
    }
}`, alt: [
          { lang: 'python', code: `from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable


@dataclass(frozen=True)
class Order:
    id: str
    amount: float


class Pricing:
    def __init__(self, discount: Callable[[Order], float], now: Callable[[], datetime]) -> None:
        self._discount = discount  # strategy as a function (OCP)
        self._now = now  # time as a dependency (DIP)

    def quote(self, o: Order) -> str:
        return f"{o.id} pays {o.amount - self._discount(o)} at {self._now().isoformat()}"


if __name__ == "__main__":
    p = Pricing(lambda o: 100.0 if o.amount > 1000 else 0.0,
                lambda: datetime(2026, 1, 1, tzinfo=timezone.utc))
    print(p.quote(Order("A1", 1500)))` },
          { lang: 'ts', code: `interface Order { readonly id: string; readonly amount: number; }

class Pricing {
  constructor(
    private readonly discount: (o: Order) => number, // strategy as a function (OCP)
    private readonly now: () => Date, // time as a dependency (DIP)
  ) {}
  quote(o: Order): string {
    return \`\${o.id} pays \${o.amount - this.discount(o)} at \${this.now().toISOString()}\`;
  }
}

const p = new Pricing((o) => (o.amount > 1000 ? 100 : 0), () => new Date("2026-01-01T00:00:00Z"));
console.log(p.quote({ id: "A1", amount: 1500 }));` },
          { lang: 'cpp', code: `struct Order {
    string id;
    double amount;
};

class Pricing {
    function<double(const Order&)> discount_;   // strategy as a function (OCP)
    function<string()> now_;                    // time as a dependency (DIP)
public:
    Pricing(function<double(const Order&)> discount, function<string()> now)
        : discount_(std::move(discount)), now_(std::move(now)) {}

    string quote(const Order& o) const {
        ostringstream out;
        out << o.id << " pays " << (o.amount - discount_(o)) << " at " << now_();
        return out.str();
    }
};

int main() {
    Pricing p([](const Order& o) { return o.amount > 1000 ? 100.0 : 0.0; }, [] { return string("2026-01-01T00:00:00Z"); });
    cout << p.quote({"A1", 1500}) << "\\n";
}` },
  { lang: 'csharp', code: `
using System;

sealed class Order {
    public readonly string Id; public readonly double Amount;
    public Order(string id, double amount) { Id = id; Amount = amount; }
}
class Pricing {
    private readonly Func<Order, double> discount;      // strategy as a function (OCP)
    private readonly Func<DateTime> now;                // time as a dependency (DIP)
    public Pricing(Func<Order, double> discount, Func<DateTime> now) { this.discount = discount; this.now = now; }
    public string Quote(Order o) { return o.Id + " pays " + (o.Amount - discount(o)).ToString("0.0") + " at " + now().ToString("yyyy-MM-ddTHH:mm:ssZ"); }
}
class Program {
    static void Main() {
        Pricing p = new Pricing(o => o.Amount > 1000 ? 100.0 : 0.0, () => new DateTime(2026, 1, 1, 0, 0, 0));
        Console.WriteLine(p.Quote(new Order("A1", 1500)));
    }
}` }
        ] } },
      { title: 'Refactoring safely: the order of moves', html: `<p>Never "big-bang" rewrite. A safe sequence on legacy code: (1) write <b>characterization tests</b> that pin current behaviour; (2) apply DIP first — inject the DB/mail clients so the class becomes testable; (3) extract classes by actor (SRP) with IDE refactorings; (4) replace conditionals with polymorphism (OCP); (5) split interfaces as clients emerge (ISP); (6) run contract tests on all implementations (LSP). Each step is a small commit with green tests.</p>` }
    ],
    deepDive: `<p><b>Principles behind the principles.</b> All five reduce to managing <b>dependencies</b> so that change stays local. Related package-level principles (also from Martin): Common Closure (things that change together live together — SRP for packages), Common Reuse (do not force users of a package to depend on things they do not use — ISP for packages), Acyclic Dependencies (no cycles between packages), Stable Abstractions (stable packages should be abstract). Clean/Hexagonal architecture is DIP + SRP applied to whole layers.</p>
<p><b>Criticisms worth knowing.</b> Dan North and others argue SOLID is vague ("one reason to change" is subjective) and propose CUPID (Composable, Unix philosophy, Predictable, Idiomatic, Domain-based). Casey Muratori-style performance critiques note that deep virtual-dispatch hierarchies can hurt cache locality in hot loops (games, HFT). Both critiques are fair in their contexts: SOLID targets <b>business software that changes often</b>, not tight numeric kernels. Mentioning that you know the limits is a strong senior signal.</p>
<p><b>Metrics and tooling in production:</b> SonarQube flags cognitive complexity, God classes and long switch statements; ArchUnit enforces layer and package rules in tests; IntelliJ's "Extract Interface", "Replace Conditional with Polymorphism", "Pull Members Up/Push Down" automate most SOLID refactors safely. Mutation testing (PIT) measures whether tests actually protect behaviour before a refactor.</p>
<p><b>Designing for testability = designing for change.</b> Tests are the first "second client" of your code. If a class is hard to test, it is usually violating SRP (too much setup) or DIP (hidden dependencies). TDD tends to push designs toward SOLID naturally.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI makes producing code cheap, so the bottleneck moves to <b>review and design judgement</b>. A SOLID checklist is an excellent review lens for AI-generated pull requests: AI diffs often add a new <code>case</code> (OCP), new up an SDK client inline (DIP), or add an "unsupported" override (LSP). Teams increasingly encode such rules as lint/ArchUnit checks that both humans and agents must pass.</p>
<p><b>Use AI as a partner:</b> <code>Review this class against each SOLID principle. For each finding give line numbers, severity, and the smallest refactor. Also tell me which findings are NOT worth fixing and why.</code> The second sentence matters — it forces trade-off thinking and avoids over-engineering. Then ask for a step-by-step refactor plan with tests kept green after each step.</p>
<p><b>Where AI goes wrong:</b> it treats SOLID as a checklist to maximise, generating factories, interfaces and layers for a 50-line feature. It also cannot know your organisation's real axes of change. <b>What you must still own:</b> the diagnosis (which smell is actually hurting), the dosage (YAGNI vs extensibility), and the explanation to your team or interviewer of <i>why</i> this design fits these requirements.</p>`,
    problems: [{
      title: 'Review and fix a NotificationManager (all five principles)',
      level: 'Hard', tags: ['SOLID', 'code review', 'refactoring', 'notifications'], companies: ['Swiggy', 'Zomato', 'Uber', 'Meta'],
      statement: `<p>The class below sends order notifications. It picks a channel with a switch on the user's preference, builds the message text, logs to a file and calls vendor clients created inline. A <code>PushChannel</code> subclass of <code>EmailChannel</code> throws for attachments, and the <code>Channel</code> interface forces every channel to support scheduling and attachments. Product plans WhatsApp next month and wants quiet tests. <b>List every SOLID violation with the line/area, then deliver a refactored design</b> where: adding WhatsApp touches no existing class, templates change without touching delivery, and the service is testable with fakes.</p>`,
      constraints: `<p>Standard library only, no frameworks. Keep the public behaviour: <code>notifyOrderShipped(user, orderId)</code> sends one message via the user's preferred channel and records success/failure.</p>`,
      example: `<p>User prefers SMS → "Your order #42 has shipped" via SMS, log "u1 SMS ok". User prefers WHATSAPP (after adding one class) → same text via WhatsApp. Unknown preference → falls back to EMAIL instead of crashing.</p>`,
      brute: {
        why: `<p>${H.c('r', 'S:')} one class builds text, picks channels, logs and talks to vendors. ${H.c('r', 'O:')} the switch must be edited for WhatsApp. ${H.c('r', 'L:')} PushChannel extends EmailChannel and throws on attachments. ${H.c('r', 'I:')} <code>Channel</code> forces <code>schedule</code> and <code>attach</code> on everyone. ${H.c('r', 'D:')} constructing a <code>TwilioClient</code> and opening the log file inside business code — tests send real SMS and write files.</p>`,
        code: { lang: 'java', code: `interface Channel {
    void send(String to, String text);
    void schedule(String to, String text, long epochMillis);
    void attach(String fileName);
}
class TwilioClient { void sms(String to, String t) { System.out.println("twilio " + to + " " + t); } }

class EmailChannel implements Channel {
    public void send(String to, String text) { System.out.println("email " + to + " " + text); }
    public void schedule(String to, String text, long at) { System.out.println("scheduled email"); }
    public void attach(String f) { System.out.println("attached " + f); }
}
class PushChannel extends EmailChannel {
    @Override public void send(String to, String text) { System.out.println("push " + to + " " + text); }
    @Override public void attach(String f) { throw new UnsupportedOperationException("push has no attachments"); }
}

class NotificationManager {
    void notifyOrderShipped(String userId, String pref, String contact, String orderId) throws IOException {
        String text = "Your order #" + orderId + " has shipped";
        boolean ok = true;
        switch (pref) {
            case "SMS" -> new TwilioClient().sms(contact, text);
            case "EMAIL" -> new EmailChannel().send(contact, text);
            case "PUSH" -> new PushChannel().send(contact, text);
            default -> ok = false;
        }
        try (FileWriter w = new FileWriter("notify.log", true)) { w.write(userId + " " + pref + " " + ok + "\\n"); }
    }
}`, alt: [
                { lang: 'python', code: `
class Channel:
    def send(self, to, text): raise NotImplementedError
    def schedule(self, to, text, epoch_millis): raise NotImplementedError
    def attach(self, file_name): raise NotImplementedError

class TwilioClient:
    def sms(self, to, t): print("twilio " + to + " " + t)

class EmailChannel(Channel):
    def send(self, to, text): print("email " + to + " " + text)
    def schedule(self, to, text, at): print("scheduled email")
    def attach(self, f): print("attached " + f)

class PushChannel(EmailChannel):
    def send(self, to, text): print("push " + to + " " + text)
    def attach(self, f): raise NotImplementedError("push has no attachments")

class NotificationManager:
    def notify_order_shipped(self, user_id, pref, contact, order_id):
        text = "Your order #" + order_id + " has shipped"
        ok = True
        if pref == "SMS": TwilioClient().sms(contact, text)
        elif pref == "EMAIL": EmailChannel().send(contact, text)
        elif pref == "PUSH": PushChannel().send(contact, text)
        else: ok = False
        with open("notify.log", "a") as w: w.write(f"{user_id} {pref} {ok}\\n")` },
                { lang: 'ts', code: `
import { appendFileSync } from "fs";

interface Channel {
    send(to: string, text: string): void;
    schedule(to: string, text: string, epochMillis: number): void;
    attach(fileName: string): void;
}
class TwilioClient { sms(to: string, t: string): void { console.log("twilio " + to + " " + t); } }

class EmailChannel implements Channel {
    send(to: string, text: string): void { console.log("email " + to + " " + text); }
    schedule(to: string, text: string, at: number): void { console.log("scheduled email"); }
    attach(f: string): void { console.log("attached " + f); }
}
class PushChannel extends EmailChannel {
    override send(to: string, text: string): void { console.log("push " + to + " " + text); }
    override attach(f: string): void { throw new Error("push has no attachments"); }
}

class NotificationManager {
    notifyOrderShipped(userId: string, pref: string, contact: string, orderId: string): void {
        const text = "Your order #" + orderId + " has shipped";
        let ok = true;
        switch (pref) {
            case "SMS": new TwilioClient().sms(contact, text); break;
            case "EMAIL": new EmailChannel().send(contact, text); break;
            case "PUSH": new PushChannel().send(contact, text); break;
            default: ok = false;
        }
        appendFileSync("notify.log", userId + " " + pref + " " + ok + "\\n");
    }
}` },
                { lang: 'cpp', code: `
class Channel {
public:
    virtual ~Channel() = default;
    virtual void send(const string& to, const string& text) = 0;
    virtual void schedule(const string& to, const string& text, long long epochMillis) = 0;
    virtual void attach(const string& fileName) = 0;
};
struct TwilioClient { void sms(const string& to, const string& t) { cout << "twilio " << to << " " << t << "\\n"; } };

class EmailChannel : public Channel {
public:
    void send(const string& to, const string& text) override { cout << "email " << to << " " << text << "\\n"; }
    void schedule(const string& to, const string& text, long long at) override { cout << "scheduled email\\n"; }
    void attach(const string& f) override { cout << "attached " << f << "\\n"; }
};
class PushChannel : public EmailChannel {
public:
    void send(const string& to, const string& text) override { cout << "push " << to << " " << text << "\\n"; }
    void attach(const string& f) override { throw logic_error("push has no attachments"); }
};

class NotificationManager {
public:
    void notifyOrderShipped(const string& userId, const string& pref, const string& contact, const string& orderId) {
        string text = "Your order #" + orderId + " has shipped";
        bool ok = true;
        if (pref == "SMS") TwilioClient().sms(contact, text);
        else if (pref == "EMAIL") EmailChannel().send(contact, text);
        else if (pref == "PUSH") PushChannel().send(contact, text);
        else ok = false;
        ofstream("notify.log", ios::app) << userId << " " << pref << " " << ok << "\\n";
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.IO;

interface IChannel {
    void Send(string to, string text);
    void Schedule(string to, string text, long epochMillis);
    void Attach(string fileName);
}
class TwilioClient { public void Sms(string to, string t) { Console.WriteLine("twilio " + to + " " + t); } }

class EmailChannel : IChannel {
    public virtual void Send(string to, string text) { Console.WriteLine("email " + to + " " + text); }
    public void Schedule(string to, string text, long at) { Console.WriteLine("scheduled email"); }
    public virtual void Attach(string f) { Console.WriteLine("attached " + f); }
}
class PushChannel : EmailChannel {
    public override void Send(string to, string text) { Console.WriteLine("push " + to + " " + text); }
    public override void Attach(string f) { throw new NotSupportedException("push has no attachments"); }
}

class NotificationManager {
    public void NotifyOrderShipped(string userId, string pref, string contact, string orderId) {
        string text = "Your order #" + orderId + " has shipped";
        bool ok = true;
        switch (pref) {
            case "SMS": new TwilioClient().Sms(contact, text); break;
            case "EMAIL": new EmailChannel().Send(contact, text); break;
            case "PUSH": new PushChannel().Send(contact, text); break;
            default: ok = false; break;
        }
        File.AppendAllText("notify.log", userId + " " + pref + " " + ok + "\\n");
    }
}` }
              ] }
      },
      mcq: { q: 'Product adds WhatsApp. In the refactored design, what is the minimal change?', options: ['Add a WhatsAppChannel class and register it in the composition root', 'Add a case to NotificationService and a WhatsAppChannel class', 'Make WhatsAppChannel extend SmsChannel', 'Add whatsapp() to the Channel interface'], answer: 0, explain: 'With a registry of <code>Channel</code> implementations keyed by name (OCP) and injected into the service (DIP), the new class plus one wiring line is all that changes.' },
      hints: [
        `<p>Write the findings table first: for each principle, which lines and what pain. Then group responsibilities: text building, channel choice, sending per vendor, logging.</p>`,
        `<p>Ports: <code>Channel { String name(); void send(Contact c, Message m); }</code>, optional roles <code>SupportsAttachments</code> and <code>Schedulable</code>, <code>MessageTemplates</code>, <code>DeliveryLog</code>. Service receives a list of channels and builds a map.</p>`,
        `<p>Fallback channel for unknown preferences; catch per-send failures and log them; Push no longer extends Email (siblings). Test in <code>main</code> with a <code>RecordingChannel</code> and <code>InMemoryLog</code>.</p>`
      ],
      tests: { io: true, cases: [{ stdin: '', stdout: "SMS to +91-90000: Your order #42 has shipped\nWhatsApp to +91-80000: Your order #43 has shipped\nEmail to u3@x.com: Shipped - Your order #44 has shipped\nu1 SMS ok | u2 WHATSAPP ok | u3 EMAIL ok\nEmail to u4@x.com: Shipped - Your order #45 has shipped\n+ invoice.pdf\npush supports attachments: false\ntest passed: t1 EMAIL ok\ndelivered: false\nt2 PUSH failed\n" }] },
      solution: {
        approach: `<p><b>Findings → fixes.</b> S: split into <code>MessageTemplates</code> (wording), <code>Channel</code> adapters (delivery), <code>DeliveryLog</code> (audit) and a thin <code>NotificationService</code>. O: channels live in a registry keyed by name; WhatsApp is a new class. L: Push and Email become siblings; no override refuses work. I: <code>Channel</code> has only <code>send</code>; attachments and scheduling are optional role interfaces implemented only by channels that support them. D: vendor clients and the log are behind domain-owned interfaces and injected, so tests use fakes. Unknown preferences fall back to email, and a failing channel is logged rather than crashing the caller.</p>`,
        code: `record Contact(String userId, String preferredChannel, String address) {}
record Message(String title, String body) {}

interface Channel { String name(); void send(Contact to, Message m); }
interface SupportsAttachments { void sendWithAttachment(Contact to, Message m, String fileName); }   // optional role (ISP)
interface MessageTemplates { Message orderShipped(String orderId); }
interface DeliveryLog { void record(String userId, String channel, boolean ok); }

class DefaultTemplates implements MessageTemplates {
    public Message orderShipped(String orderId) { return new Message("Shipped", "Your order #" + orderId + " has shipped"); }
}

// adapters (would wrap vendor SDKs)
class SmsChannel implements Channel {
    public String name() { return "SMS"; }
    public void send(Contact to, Message m) { System.out.println("SMS to " + to.address() + ": " + m.body()); }
}
class EmailChannel implements Channel, SupportsAttachments {
    public String name() { return "EMAIL"; }
    public void send(Contact to, Message m) { System.out.println("Email to " + to.address() + ": " + m.title() + " - " + m.body()); }
    public void sendWithAttachment(Contact to, Message m, String f) { send(to, m); System.out.println("  + " + f); }
}
class PushChannel implements Channel {                       // sibling, not a broken subclass
    public String name() { return "PUSH"; }
    public void send(Contact to, Message m) { System.out.println("Push to " + to.address() + ": " + m.body()); }
}
class WhatsAppChannel implements Channel {                   // added later: new class only
    public String name() { return "WHATSAPP"; }
    public void send(Contact to, Message m) { System.out.println("WhatsApp to " + to.address() + ": " + m.body()); }
}

class NotificationService {
    private final Map<String, Channel> channels = new HashMap<>();
    private final Channel fallback;
    private final MessageTemplates templates;
    private final DeliveryLog log;

    NotificationService(List<Channel> available, String fallbackName, MessageTemplates templates, DeliveryLog log) {
        available.forEach(c -> channels.put(c.name(), c));
        this.fallback = Objects.requireNonNull(channels.get(fallbackName), "fallback channel missing");
        this.templates = templates; this.log = log;
    }

    boolean notifyOrderShipped(Contact to, String orderId) {
        Channel ch = channels.getOrDefault(to.preferredChannel(), fallback);
        try {
            ch.send(to, templates.orderShipped(orderId));
            log.record(to.userId(), ch.name(), true);
            return true;
        } catch (RuntimeException e) {
            log.record(to.userId(), ch.name(), false);
            return false;
        }
    }
}

// fakes for tests
class InMemoryLog implements DeliveryLog {
    final List<String> lines = new ArrayList<>();
    public void record(String u, String c, boolean ok) { lines.add(u + " " + c + " " + (ok ? "ok" : "failed")); }
}
class RecordingChannel implements Channel {
    private final String name; final List<String> sent = new ArrayList<>();
    RecordingChannel(String name) { this.name = name; }
    public String name() { return name; }
    public void send(Contact to, Message m) { sent.add(to.address() + "|" + m.body()); }
}

class BrokenChannel implements Channel {                      // simulates a vendor outage
    public String name() { return "PUSH"; }
    public void send(Contact to, Message m) { throw new IllegalStateException("push gateway down"); }
}

class NotificationDemo {
    public static void main(String[] args) {
        // production-style wiring
        InMemoryLog log = new InMemoryLog();
        NotificationService prod = new NotificationService(
                List.of(new SmsChannel(), new EmailChannel(), new PushChannel(), new WhatsAppChannel()),
                "EMAIL", new DefaultTemplates(), log);
        prod.notifyOrderShipped(new Contact("u1", "SMS", "+91-90000"), "42");
        prod.notifyOrderShipped(new Contact("u2", "WHATSAPP", "+91-80000"), "43");
        prod.notifyOrderShipped(new Contact("u3", "PIGEON", "u3@x.com"), "44");   // falls back to EMAIL
        System.out.println(String.join(" | ", log.lines));

        // optional role: only channels that implement SupportsAttachments can send files
        new EmailChannel().sendWithAttachment(new Contact("u4", "EMAIL", "u4@x.com"), new DefaultTemplates().orderShipped("45"), "invoice.pdf");
        System.out.println("push supports attachments: " + (new PushChannel() instanceof SupportsAttachments));

        // test-style wiring: fakes only
        RecordingChannel email = new RecordingChannel("EMAIL");
        InMemoryLog testLog = new InMemoryLog();
        new NotificationService(List.of(email), "EMAIL", new DefaultTemplates(), testLog)
                .notifyOrderShipped(new Contact("t1", "SMS", "t@x.com"), "7");
        if (!email.sent.equals(List.of("t@x.com|Your order #7 has shipped"))) throw new AssertionError(email.sent);
        System.out.println("test passed: " + String.join(" | ", testLog.lines));

        // failure path: the chosen channel throws, so delivery is logged as failed
        InMemoryLog failLog = new InMemoryLog();
        boolean delivered = new NotificationService(List.of(new BrokenChannel(), new RecordingChannel("EMAIL")), "EMAIL",
                new DefaultTemplates(), failLog).notifyOrderShipped(new Contact("t2", "PUSH", "t@x.com"), "8");
        System.out.println("delivered: " + delivered);
        System.out.println(String.join(" | ", failLog.lines));
    }
}`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class Contact:
    user_id: str
    preferred_channel: str
    address: str


@dataclass(frozen=True)
class Message:
    title: str
    body: str


class Channel(ABC):
    @abstractmethod
    def name(self) -> str: ...

    @abstractmethod
    def send(self, to: Contact, m: Message) -> None: ...


class SupportsAttachments(ABC):  # optional role (ISP)
    @abstractmethod
    def send_with_attachment(self, to: Contact, m: Message, file_name: str) -> None: ...


class MessageTemplates(ABC):
    @abstractmethod
    def order_shipped(self, order_id: str) -> Message: ...


class DeliveryLog(ABC):
    @abstractmethod
    def record(self, user_id: str, channel: str, ok: bool) -> None: ...


class DefaultTemplates(MessageTemplates):
    def order_shipped(self, order_id: str) -> Message:
        return Message("Shipped", f"Your order #{order_id} has shipped")


# adapters (would wrap vendor SDKs)
class SmsChannel(Channel):
    def name(self) -> str:
        return "SMS"

    def send(self, to: Contact, m: Message) -> None:
        print(f"SMS to {to.address}: {m.body}")


class EmailChannel(Channel, SupportsAttachments):
    def name(self) -> str:
        return "EMAIL"

    def send(self, to: Contact, m: Message) -> None:
        print(f"Email to {to.address}: {m.title} - {m.body}")

    def send_with_attachment(self, to: Contact, m: Message, file_name: str) -> None:
        self.send(to, m)
        print(f"  + {file_name}")


class PushChannel(Channel):  # sibling, not a broken subclass
    def name(self) -> str:
        return "PUSH"

    def send(self, to: Contact, m: Message) -> None:
        print(f"Push to {to.address}: {m.body}")


class WhatsAppChannel(Channel):  # added later: new class only
    def name(self) -> str:
        return "WHATSAPP"

    def send(self, to: Contact, m: Message) -> None:
        print(f"WhatsApp to {to.address}: {m.body}")


class NotificationService:
    def __init__(self, available: list[Channel], fallback_name: str,
                 templates: MessageTemplates, log: DeliveryLog) -> None:
        self._channels = {c.name(): c for c in available}
        if fallback_name not in self._channels:
            raise ValueError("fallback channel missing")
        self._fallback = self._channels[fallback_name]
        self._templates = templates
        self._log = log

    def notify_order_shipped(self, to: Contact, order_id: str) -> bool:
        ch = self._channels.get(to.preferred_channel, self._fallback)
        try:
            ch.send(to, self._templates.order_shipped(order_id))
            self._log.record(to.user_id, ch.name(), True)
            return True
        except RuntimeError:
            self._log.record(to.user_id, ch.name(), False)
            return False


# fakes for tests
class InMemoryLog(DeliveryLog):
    def __init__(self) -> None:
        self.lines: list[str] = []

    def record(self, user_id: str, channel: str, ok: bool) -> None:
        self.lines.append(f"{user_id} {channel} {'ok' if ok else 'failed'}")


class RecordingChannel(Channel):
    def __init__(self, name: str) -> None:
        self._name = name
        self.sent: list[str] = []

    def name(self) -> str:
        return self._name

    def send(self, to: Contact, m: Message) -> None:
        self.sent.append(f"{to.address}|{m.body}")


class BrokenChannel(Channel):  # simulates a vendor outage
    def name(self) -> str:
        return "PUSH"

    def send(self, to: Contact, m: Message) -> None:
        raise RuntimeError("push gateway down")


class NotificationDemo:
    @staticmethod
    def main() -> None:
        # production-style wiring
        log = InMemoryLog()
        prod = NotificationService(
            [SmsChannel(), EmailChannel(), PushChannel(), WhatsAppChannel()],
            "EMAIL", DefaultTemplates(), log)
        prod.notify_order_shipped(Contact("u1", "SMS", "+91-90000"), "42")
        prod.notify_order_shipped(Contact("u2", "WHATSAPP", "+91-80000"), "43")
        prod.notify_order_shipped(Contact("u3", "PIGEON", "u3@x.com"), "44")  # falls back to EMAIL
        print(" | ".join(log.lines))

        # optional role: only channels that implement SupportsAttachments can send files
        EmailChannel().send_with_attachment(Contact("u4", "EMAIL", "u4@x.com"), DefaultTemplates().order_shipped("45"), "invoice.pdf")
        print("push supports attachments:", str(isinstance(PushChannel(), SupportsAttachments)).lower())

        # test-style wiring: fakes only
        email = RecordingChannel("EMAIL")
        test_log = InMemoryLog()
        NotificationService([email], "EMAIL", DefaultTemplates(), test_log).notify_order_shipped(
            Contact("t1", "SMS", "t@x.com"), "7")
        if email.sent != ["t@x.com|Your order #7 has shipped"]:
            raise AssertionError(email.sent)
        print("test passed:", " | ".join(test_log.lines))

        # failure path: the chosen channel throws, so delivery is logged as failed
        fail_log = InMemoryLog()
        delivered = NotificationService([BrokenChannel(), RecordingChannel("EMAIL")], "EMAIL",
                                        DefaultTemplates(), fail_log).notify_order_shipped(
            Contact("t2", "PUSH", "t@x.com"), "8")
        print("delivered:", str(delivered).lower())
        print(" | ".join(fail_log.lines))


if __name__ == "__main__":
    NotificationDemo.main()` },
          { lang: 'ts', code: `interface Contact { readonly userId: string; readonly preferredChannel: string; readonly address: string; }
interface Message { readonly title: string; readonly body: string; }

interface Channel { name(): string; send(to: Contact, m: Message): void; }
interface SupportsAttachments { sendWithAttachment(to: Contact, m: Message, fileName: string): void; } // optional role (ISP)
interface MessageTemplates { orderShipped(orderId: string): Message; }
interface DeliveryLog { record(userId: string, channel: string, ok: boolean): void; }

function supportsAttachments(c: Channel): c is Channel & SupportsAttachments {
  return typeof (c as Partial<SupportsAttachments>).sendWithAttachment === "function";
}

class DefaultTemplates implements MessageTemplates {
  orderShipped(orderId: string): Message { return { title: "Shipped", body: \`Your order #\${orderId} has shipped\` }; }
}

// adapters (would wrap vendor SDKs)
class SmsChannel implements Channel {
  name(): string { return "SMS"; }
  send(to: Contact, m: Message): void { console.log(\`SMS to \${to.address}: \${m.body}\`); }
}
class EmailChannel implements Channel, SupportsAttachments {
  name(): string { return "EMAIL"; }
  send(to: Contact, m: Message): void { console.log(\`Email to \${to.address}: \${m.title} - \${m.body}\`); }
  sendWithAttachment(to: Contact, m: Message, f: string): void { this.send(to, m); console.log(\`  + \${f}\`); }
}
class PushChannel implements Channel { // sibling, not a broken subclass
  name(): string { return "PUSH"; }
  send(to: Contact, m: Message): void { console.log(\`Push to \${to.address}: \${m.body}\`); }
}
class WhatsAppChannel implements Channel { // added later: new class only
  name(): string { return "WHATSAPP"; }
  send(to: Contact, m: Message): void { console.log(\`WhatsApp to \${to.address}: \${m.body}\`); }
}

class NotificationService {
  private readonly channels = new Map<string, Channel>();
  private readonly fallback: Channel;

  constructor(
    available: Channel[],
    fallbackName: string,
    private readonly templates: MessageTemplates,
    private readonly log: DeliveryLog,
  ) {
    for (const c of available) this.channels.set(c.name(), c);
    const fb = this.channels.get(fallbackName);
    if (fb === undefined) throw new Error("fallback channel missing");
    this.fallback = fb;
  }

  notifyOrderShipped(to: Contact, orderId: string): boolean {
    const ch = this.channels.get(to.preferredChannel) ?? this.fallback;
    try {
      ch.send(to, this.templates.orderShipped(orderId));
      this.log.record(to.userId, ch.name(), true);
      return true;
    } catch {
      this.log.record(to.userId, ch.name(), false);
      return false;
    }
  }
}

// fakes for tests
class InMemoryLog implements DeliveryLog {
  readonly lines: string[] = [];
  record(userId: string, channel: string, ok: boolean): void { this.lines.push(\`\${userId} \${channel} \${ok ? "ok" : "failed"}\`); }
}
class RecordingChannel implements Channel {
  readonly sent: string[] = [];
  constructor(private readonly channelName: string) {}
  name(): string { return this.channelName; }
  send(to: Contact, m: Message): void { this.sent.push(\`\${to.address}|\${m.body}\`); }
}
class BrokenChannel implements Channel { // simulates a vendor outage
  name(): string { return "PUSH"; }
  send(_to: Contact, _m: Message): void { throw new Error("push gateway down"); }
}

class NotificationDemo {
  static main(): void {
    // production-style wiring
    const log = new InMemoryLog();
    const prod = new NotificationService(
      [new SmsChannel(), new EmailChannel(), new PushChannel(), new WhatsAppChannel()],
      "EMAIL", new DefaultTemplates(), log);
    prod.notifyOrderShipped({ userId: "u1", preferredChannel: "SMS", address: "+91-90000" }, "42");
    prod.notifyOrderShipped({ userId: "u2", preferredChannel: "WHATSAPP", address: "+91-80000" }, "43");
    prod.notifyOrderShipped({ userId: "u3", preferredChannel: "PIGEON", address: "u3@x.com" }, "44"); // falls back to EMAIL
    console.log(log.lines.join(" | "));

    // optional role: only channels that implement SupportsAttachments can send files
    new EmailChannel().sendWithAttachment({ userId: "u4", preferredChannel: "EMAIL", address: "u4@x.com" },
      new DefaultTemplates().orderShipped("45"), "invoice.pdf");
    console.log("push supports attachments: " + supportsAttachments(new PushChannel()));

    // test-style wiring: fakes only
    const email = new RecordingChannel("EMAIL");
    const testLog = new InMemoryLog();
    new NotificationService([email], "EMAIL", new DefaultTemplates(), testLog)
      .notifyOrderShipped({ userId: "t1", preferredChannel: "SMS", address: "t@x.com" }, "7");
    if (email.sent.join(",") !== "t@x.com|Your order #7 has shipped") throw new Error(email.sent.join(","));
    console.log("test passed: " + testLog.lines.join(" | "));

    // failure path: the chosen channel throws, so delivery is logged as failed
    const failLog = new InMemoryLog();
    const delivered = new NotificationService([new BrokenChannel(), new RecordingChannel("EMAIL")], "EMAIL",
      new DefaultTemplates(), failLog).notifyOrderShipped({ userId: "t2", preferredChannel: "PUSH", address: "t@x.com" }, "8");
    console.log("delivered: " + delivered);
    console.log(failLog.lines.join(" | "));
  }
}
NotificationDemo.main();` },
          { lang: 'cpp', code: `struct Contact { string userId, preferredChannel, address; };
struct Message { string title, body; };

class Channel {
public:
    virtual ~Channel() = default;
    virtual string name() const = 0;
    virtual void send(const Contact& to, const Message& m) = 0;
};
class SupportsAttachments {                               // optional role (ISP)
public:
    virtual ~SupportsAttachments() = default;
    virtual void sendWithAttachment(const Contact& to, const Message& m, const string& fileName) = 0;
};
class MessageTemplates {
public:
    virtual ~MessageTemplates() = default;
    virtual Message orderShipped(const string& orderId) const = 0;
};
class DeliveryLog {
public:
    virtual ~DeliveryLog() = default;
    virtual void record(const string& userId, const string& channel, bool ok) = 0;
};

class DefaultTemplates : public MessageTemplates {
public:
    Message orderShipped(const string& orderId) const override { return {"Shipped", "Your order #" + orderId + " has shipped"}; }
};

// adapters (would wrap vendor SDKs)
class SmsChannel : public Channel {
public:
    string name() const override { return "SMS"; }
    void send(const Contact& to, const Message& m) override { cout << "SMS to " << to.address << ": " << m.body << "\\n"; }
};
class EmailChannel : public Channel, public SupportsAttachments {
public:
    string name() const override { return "EMAIL"; }
    void send(const Contact& to, const Message& m) override { cout << "Email to " << to.address << ": " << m.title << " - " << m.body << "\\n"; }
    void sendWithAttachment(const Contact& to, const Message& m, const string& f) override { send(to, m); cout << "  + " << f << "\\n"; }
};
class PushChannel : public Channel {                      // sibling, not a broken subclass
public:
    string name() const override { return "PUSH"; }
    void send(const Contact& to, const Message& m) override { cout << "Push to " << to.address << ": " << m.body << "\\n"; }
};
class WhatsAppChannel : public Channel {                  // added later: new class only
public:
    string name() const override { return "WHATSAPP"; }
    void send(const Contact& to, const Message& m) override { cout << "WhatsApp to " << to.address << ": " << m.body << "\\n"; }
};

class NotificationService {
    unordered_map<string, shared_ptr<Channel>> channels_;
    shared_ptr<Channel> fallback_;
    const MessageTemplates& templates_;
    DeliveryLog& log_;
public:
    NotificationService(const vector<shared_ptr<Channel>>& available, const string& fallbackName,
                        const MessageTemplates& templates, DeliveryLog& log)
        : templates_(templates), log_(log) {
        for (const auto& c : available) channels_[c->name()] = c;
        auto it = channels_.find(fallbackName);
        if (it == channels_.end()) throw invalid_argument("fallback channel missing");
        fallback_ = it->second;
    }

    bool notifyOrderShipped(const Contact& to, const string& orderId) {
        auto it = channels_.find(to.preferredChannel);
        Channel& ch = it != channels_.end() ? *it->second : *fallback_;
        try {
            ch.send(to, templates_.orderShipped(orderId));
            log_.record(to.userId, ch.name(), true);
            return true;
        } catch (const runtime_error&) {
            log_.record(to.userId, ch.name(), false);
            return false;
        }
    }
};

// fakes for tests
class InMemoryLog : public DeliveryLog {
public:
    vector<string> lines;
    void record(const string& u, const string& c, bool ok) override { lines.push_back(u + " " + c + " " + (ok ? "ok" : "failed")); }
};
class RecordingChannel : public Channel {
    string name_;
public:
    vector<string> sent;
    explicit RecordingChannel(string name) : name_(std::move(name)) {}
    string name() const override { return name_; }
    void send(const Contact& to, const Message& m) override { sent.push_back(to.address + "|" + m.body); }
};
class BrokenChannel : public Channel {                    // simulates a vendor outage
public:
    string name() const override { return "PUSH"; }
    void send(const Contact&, const Message&) override { throw runtime_error("push gateway down"); }
};

static string joinLines(const vector<string>& lines) {
    string out;
    for (size_t i = 0; i < lines.size(); ++i) out += (i ? " | " : "") + lines[i];
    return out;
}

class NotificationDemo {
public:
    static void run() {
        DefaultTemplates templates;
        // production-style wiring
        InMemoryLog log;
        NotificationService prod({make_shared<SmsChannel>(), make_shared<EmailChannel>(), make_shared<PushChannel>(),
                                  make_shared<WhatsAppChannel>()}, "EMAIL", templates, log);
        prod.notifyOrderShipped({"u1", "SMS", "+91-90000"}, "42");
        prod.notifyOrderShipped({"u2", "WHATSAPP", "+91-80000"}, "43");
        prod.notifyOrderShipped({"u3", "PIGEON", "u3@x.com"}, "44");   // falls back to EMAIL
        cout << joinLines(log.lines) << "\\n";

        // optional role: only channels that implement SupportsAttachments can send files
        EmailChannel().sendWithAttachment({"u4", "EMAIL", "u4@x.com"}, templates.orderShipped("45"), "invoice.pdf");
        PushChannel push;
        cout << "push supports attachments: " << boolalpha << (dynamic_cast<SupportsAttachments*>(&push) != nullptr) << "\\n";

        // test-style wiring: fakes only (shared_ptr lets the test keep a handle on the fake)
        auto email = make_shared<RecordingChannel>("EMAIL");
        InMemoryLog testLog;
        NotificationService({email}, "EMAIL", templates, testLog).notifyOrderShipped({"t1", "SMS", "t@x.com"}, "7");
        if (email->sent != vector<string>{"t@x.com|Your order #7 has shipped"}) throw runtime_error("unexpected message");
        cout << "test passed: " << joinLines(testLog.lines) << "\\n";

        // failure path: the chosen channel throws, so delivery is logged as failed
        InMemoryLog failLog;
        bool delivered = NotificationService({make_shared<BrokenChannel>(), make_shared<RecordingChannel>("EMAIL")},
                                             "EMAIL", templates, failLog).notifyOrderShipped({"t2", "PUSH", "t@x.com"}, "8");
        cout << "delivered: " << delivered << "\\n";
        cout << joinLines(failLog.lines) << "\\n";
    }
};

int main() {
    cout << boolalpha;
    NotificationDemo::run();
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

sealed class Contact {
    public readonly string UserId, PreferredChannel, Address;
    public Contact(string userId, string preferredChannel, string address) { UserId = userId; PreferredChannel = preferredChannel; Address = address; }
}
sealed class Message {
    public readonly string Title, Body;
    public Message(string title, string body) { Title = title; Body = body; }
}

interface IChannel { string Name { get; } void Send(Contact to, Message m); }
interface ISupportsAttachments { void SendWithAttachment(Contact to, Message m, string fileName); }   // optional role (ISP)
interface IMessageTemplates { Message OrderShipped(string orderId); }
interface IDeliveryLog { void Record(string userId, string channel, bool ok); }

class DefaultTemplates : IMessageTemplates {
    public Message OrderShipped(string orderId) { return new Message("Shipped", "Your order #" + orderId + " has shipped"); }
}

// adapters (would wrap vendor SDKs)
class SmsChannel : IChannel {
    public string Name { get { return "SMS"; } }
    public void Send(Contact to, Message m) { Console.WriteLine("SMS to " + to.Address + ": " + m.Body); }
}
class EmailChannel : IChannel, ISupportsAttachments {
    public string Name { get { return "EMAIL"; } }
    public void Send(Contact to, Message m) { Console.WriteLine("Email to " + to.Address + ": " + m.Title + " - " + m.Body); }
    public void SendWithAttachment(Contact to, Message m, string f) { Send(to, m); Console.WriteLine("  + " + f); }
}
class PushChannel : IChannel {                               // sibling, not a broken subclass
    public string Name { get { return "PUSH"; } }
    public void Send(Contact to, Message m) { Console.WriteLine("Push to " + to.Address + ": " + m.Body); }
}
class WhatsAppChannel : IChannel {                           // added later: new class only
    public string Name { get { return "WHATSAPP"; } }
    public void Send(Contact to, Message m) { Console.WriteLine("WhatsApp to " + to.Address + ": " + m.Body); }
}

class NotificationService {
    private readonly Dictionary<string, IChannel> channels = new Dictionary<string, IChannel>();
    private readonly IChannel fallback;
    private readonly IMessageTemplates templates;
    private readonly IDeliveryLog log;

    public NotificationService(IEnumerable<IChannel> available, string fallbackName, IMessageTemplates templates, IDeliveryLog log) {
        foreach (IChannel c in available) channels[c.Name] = c;
        if (!channels.TryGetValue(fallbackName, out fallback)) throw new ArgumentException("fallback channel missing");
        this.templates = templates; this.log = log;
    }

    public bool NotifyOrderShipped(Contact to, string orderId) {
        IChannel ch;
        if (!channels.TryGetValue(to.PreferredChannel, out ch)) ch = fallback;
        try {
            ch.Send(to, templates.OrderShipped(orderId));
            log.Record(to.UserId, ch.Name, true);
            return true;
        } catch (Exception) {
            log.Record(to.UserId, ch.Name, false);
            return false;
        }
    }
}

// fakes for tests
class InMemoryLog : IDeliveryLog {
    public readonly List<string> Lines = new List<string>();
    public void Record(string u, string c, bool ok) { Lines.Add(u + " " + c + " " + (ok ? "ok" : "failed")); }
}
class RecordingChannel : IChannel {
    private readonly string name; public readonly List<string> Sent = new List<string>();
    public RecordingChannel(string name) { this.name = name; }
    public string Name { get { return name; } }
    public void Send(Contact to, Message m) { Sent.Add(to.Address + "|" + m.Body); }
}

class BrokenChannel : IChannel {                              // simulates a vendor outage
    public string Name { get { return "PUSH"; } }
    public void Send(Contact to, Message m) { throw new InvalidOperationException("push gateway down"); }
}

class Program {
    static void Main() {
        // production-style wiring
        InMemoryLog log = new InMemoryLog();
        NotificationService prod = new NotificationService(
                new IChannel[] { new SmsChannel(), new EmailChannel(), new PushChannel(), new WhatsAppChannel() },
                "EMAIL", new DefaultTemplates(), log);
        prod.NotifyOrderShipped(new Contact("u1", "SMS", "+91-90000"), "42");
        prod.NotifyOrderShipped(new Contact("u2", "WHATSAPP", "+91-80000"), "43");
        prod.NotifyOrderShipped(new Contact("u3", "PIGEON", "u3@x.com"), "44");   // falls back to EMAIL
        Console.WriteLine(string.Join(" | ", log.Lines));

        // optional role: only channels that implement ISupportsAttachments can send files
        new EmailChannel().SendWithAttachment(new Contact("u4", "EMAIL", "u4@x.com"), new DefaultTemplates().OrderShipped("45"), "invoice.pdf");
        Console.WriteLine("push supports attachments: " + (new PushChannel() is ISupportsAttachments).ToString().ToLower());

        // test-style wiring: fakes only
        RecordingChannel email = new RecordingChannel("EMAIL");
        InMemoryLog testLog = new InMemoryLog();
        new NotificationService(new IChannel[] { email }, "EMAIL", new DefaultTemplates(), testLog)
                .NotifyOrderShipped(new Contact("t1", "SMS", "t@x.com"), "7");
        if (!email.Sent.SequenceEqual(new[] { "t@x.com|Your order #7 has shipped" })) throw new Exception(string.Join(",", email.Sent));
        Console.WriteLine("test passed: " + string.Join(" | ", testLog.Lines));

        // failure path: the chosen channel throws, so delivery is logged as failed
        InMemoryLog failLog = new InMemoryLog();
        bool delivered = new NotificationService(new IChannel[] { new BrokenChannel(), new RecordingChannel("EMAIL") }, "EMAIL",
                new DefaultTemplates(), failLog).NotifyOrderShipped(new Contact("t2", "PUSH", "t@x.com"), "8");
        Console.WriteLine("delivered: " + delivered.ToString().ToLower());
        Console.WriteLine(string.Join(" | ", failLog.Lines));
    }
}` }
        ],
        complexity: `<p>O(1) channel lookup per notification. Adding a channel: 1 new class + 1 wiring entry, 0 edits. Tests run without vendors, files or network.</p>`,
        followUps: ['Users want multiple channels (SMS + push) with priority and retry on failure — which pattern (chain of responsibility / decorator)?', 'Make sending asynchronous through a queue: which interface changes, which does not?', 'Per-country templates and languages: how does <code>MessageTemplates</code> evolve without touching channels?']
      }
    }]
  });

  /* ======================= PRACTICE: EASY ======================= */
  practice.push({
    title: 'Which principle? The Book that prints and saves itself',
    level: 'Easy', tags: ['SRP', 'spot the violation'], companies: ['TCS', 'Infosys', 'Amazon'],
    statement: `<p>A library app has a <code>Book</code> class holding title, author and text. It also has <code>printToConsole()</code> and <code>saveToFile(path)</code>. The UI team keeps changing the print layout; the infra team is moving storage from files to S3. <b>Name the violated principle</b>, explain who the actors are, and refactor so a layout change and a storage change each touch one class.</p>`,
    constraints: `<p><code>Book</code> should stay a simple domain object. Storage must be swappable (file today, S3 tomorrow).</p>`,
    example: `<p>Changing the console layout from "Title by Author" to a boxed format → ${H.c('g', 'only BookPrinter changes')}. Moving to S3 → ${H.c('g', 'only a new BookStore implementation')}; <code>Book</code> is untouched in both cases.</p>`,
    brute: {
      why: `<p><code>Book</code> has three reasons to change: book data (domain), presentation (UI team) and persistence (infra team). Every UI tweak re-opens the class that infra depends on and vice versa; the file I/O also makes <code>Book</code> hard to unit test. This is a <b>Single Responsibility</b> violation.</p>`,
      code: { lang: 'java', code: `class Book {
    String title, author, text;
    Book(String title, String author, String text) { this.title = title; this.author = author; this.text = text; }

    void printToConsole() {                       // UI team's concern
        System.out.println(title + " by " + author);
        System.out.println(text);
    }
    void saveToFile(String path) throws IOException {   // infra team's concern
        try (PrintWriter w = new PrintWriter(new FileWriter(path))) {
            w.println(title); w.println(author); w.println(text);
        }
    }
}`, alt: [
              { lang: 'python', code: `
class Book:
    def __init__(self, title, author, text):
        self.title, self.author, self.text = title, author, text

    def print_to_console(self):                  # UI team's concern
        print(self.title + " by " + self.author)
        print(self.text)

    def save_to_file(self, path):                # infra team's concern
        with open(path, "w") as w:
            w.write(self.title + "\\n" + self.author + "\\n" + self.text + "\\n")` },
              { lang: 'ts', code: `
import { writeFileSync } from "fs";

class Book {
    constructor(public title: string, public author: string, public text: string) {}

    printToConsole(): void {                       // UI team's concern
        console.log(this.title + " by " + this.author);
        console.log(this.text);
    }
    saveToFile(path: string): void {               // infra team's concern
        writeFileSync(path, this.title + "\\n" + this.author + "\\n" + this.text + "\\n");
    }
}` },
              { lang: 'cpp', code: `
class Book {
public:
    string title, author, text;
    Book(string title, string author, string text) : title(title), author(author), text(text) {}

    void printToConsole() {                        // UI team's concern
        cout << title << " by " << author << "\\n";
        cout << text << "\\n";
    }
    void saveToFile(const string& path) {          // infra team's concern
        ofstream w(path);
        w << title << "\\n" << author << "\\n" << text << "\\n";
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.IO;

class Book {
    public string Title, Author, Text;
    public Book(string title, string author, string text) { Title = title; Author = author; Text = text; }

    public void PrintToConsole() {                       // UI team's concern
        Console.WriteLine(Title + " by " + Author);
        Console.WriteLine(Text);
    }
    public void SaveToFile(string path) {                // infra team's concern
        using (StreamWriter w = new StreamWriter(path)) {
            w.WriteLine(Title); w.WriteLine(Author); w.WriteLine(Text);
        }
    }
}` }
            ] }
    },
    mcq: { q: 'Which principle does <code>Book.saveToFile</code> most directly violate?', options: ['Single Responsibility', 'Liskov Substitution', 'Interface Segregation', 'None — books should save themselves'], answer: 0, explain: 'Persistence is a different actor\'s concern (infra) from the book\'s data and from printing (UI). Three actors → three reasons to change.' },
    hints: [
      `<p>Ask "who would request a change to each method?" — you will find three different answers.</p>`,
      `<p>Keep <code>Book</code> as an immutable value type (a Java <code>record</code>, a Python frozen dataclass). Create <code>BookPrinter</code> for layout and a <code>BookStore</code> interface for persistence with a file implementation.</p>`,
      `<p>The printer can return a <code>String</code> (easy to test) and let the caller print it. Storage gets an interface so S3 is just another implementation (that is DIP + OCP as a bonus).</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "SOLID 101 by Asha\nSmall classes, clear roles.\nfound: false\ntitle required\n" }] },
      solution: {
      approach: `<p><b>SRP: one class per actor.</b> <code>Book</code> becomes an immutable value type (a Java record, a Python frozen dataclass; pure data plus simple invariants). <code>BookPrinter</code> owns presentation and returns text, so it is trivially testable. <code>BookStore</code> is an interface; <code>FileBookStore</code> and later <code>S3BookStore</code> implement it. A layout change touches one class; a storage change adds one class.</p>`,
      code: `record Book(String title, String author, String text) {
    Book {
        if (title == null || title.isBlank()) throw new IllegalArgumentException("title required");
    }
}

class BookPrinter {                                   // UI team owns this
    String render(Book b) { return b.title() + " by " + b.author() + "\\n" + b.text(); }
}

interface BookStore { void save(Book b); Optional<Book> load(String title); }   // infra team owns implementations

class InMemoryBookStore implements BookStore {        // stands in for File/S3 in this demo
    private final Map<String, Book> data = new HashMap<>();
    public void save(Book b) { data.put(b.title(), b); }
    public Optional<Book> load(String title) { return Optional.ofNullable(data.get(title)); }
}

class LibraryDemo {
    public static void main(String[] args) {
        Book b = new Book("SOLID 101", "Asha", "Small classes, clear roles.");
        BookStore store = new InMemoryBookStore();
        store.save(b);
        System.out.println(new BookPrinter().render(store.load("SOLID 101").orElseThrow()));
        System.out.println("found: " + store.load("Missing").isPresent());
        try { new Book(" ", "Asha", "text"); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
    }
}`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class Book:
    title: str
    author: str
    text: str

    def __post_init__(self) -> None:
        if not self.title or not self.title.strip():
            raise ValueError("title required")


class BookPrinter:  # UI team owns this
    def render(self, b: Book) -> str:
        return f"{b.title} by {b.author}\\n{b.text}"


class BookStore(ABC):  # infra team owns implementations
    @abstractmethod
    def save(self, b: Book) -> None: ...

    @abstractmethod
    def load(self, title: str) -> Optional[Book]: ...


class InMemoryBookStore(BookStore):  # stands in for File/S3 in this demo
    def __init__(self) -> None:
        self._data: dict[str, Book] = {}

    def save(self, b: Book) -> None:
        self._data[b.title] = b

    def load(self, title: str) -> Optional[Book]:
        return self._data.get(title)


class LibraryDemo:
    @staticmethod
    def main() -> None:
        b = Book("SOLID 101", "Asha", "Small classes, clear roles.")
        store: BookStore = InMemoryBookStore()
        store.save(b)
        loaded = store.load("SOLID 101")
        assert loaded is not None
        print(BookPrinter().render(loaded))
        print("found:", str(store.load("Missing") is not None).lower())
        try:
            Book(" ", "Asha", "text")
        except ValueError as e:
            print(e)


if __name__ == "__main__":
    LibraryDemo.main()` },
          { lang: 'ts', code: `class Book { // immutable value object
  constructor(
    readonly title: string,
    readonly author: string,
    readonly text: string,
  ) {
    if (title.trim() === "") throw new Error("title required");
  }
}

class BookPrinter { // UI team owns this
  render(b: Book): string { return \`\${b.title} by \${b.author}\\n\${b.text}\`; }
}

interface BookStore { // infra team owns implementations
  save(b: Book): void;
  load(title: string): Book | undefined;
}

class InMemoryBookStore implements BookStore { // stands in for File/S3 in this demo
  private readonly data = new Map<string, Book>();
  save(b: Book): void { this.data.set(b.title, b); }
  load(title: string): Book | undefined { return this.data.get(title); }
}

class LibraryDemo {
  static main(): void {
    const b = new Book("SOLID 101", "Asha", "Small classes, clear roles.");
    const store: BookStore = new InMemoryBookStore();
    store.save(b);
    const loaded = store.load("SOLID 101");
    if (loaded === undefined) throw new Error("missing");
    console.log(new BookPrinter().render(loaded));
    console.log("found: " + (store.load("Missing") !== undefined));
    try {
      new Book(" ", "Asha", "text");
    } catch (e) {
      console.log((e as Error).message);
    }
  }
}
LibraryDemo.main();` },
          { lang: 'cpp', code: `class Book {   // immutable value object
    string title_, author_, text_;
public:
    Book(string title, string author, string text)
        : title_(std::move(title)), author_(std::move(author)), text_(std::move(text)) {
        if (title_.find_first_not_of(" \\t") == string::npos) throw invalid_argument("title required");
    }
    const string& title() const { return title_; }
    const string& author() const { return author_; }
    const string& text() const { return text_; }
};

class BookPrinter {   // UI team owns this
public:
    string render(const Book& b) const { return b.title() + " by " + b.author() + "\\n" + b.text(); }
};

class BookStore {   // infra team owns implementations
public:
    virtual ~BookStore() = default;
    virtual void save(const Book& b) = 0;
    virtual optional<Book> load(const string& title) const = 0;
};

class InMemoryBookStore : public BookStore {   // stands in for File/S3 in this demo
    unordered_map<string, Book> data_;
public:
    void save(const Book& b) override { data_.insert_or_assign(b.title(), b); }
    optional<Book> load(const string& title) const override {
        auto it = data_.find(title);
        if (it == data_.end()) return nullopt;
        return it->second;
    }
};

class LibraryDemo {
public:
    static void run() {
        Book b("SOLID 101", "Asha", "Small classes, clear roles.");
        InMemoryBookStore store;
        store.save(b);
        cout << BookPrinter().render(store.load("SOLID 101").value()) << "\\n";
        cout << "found: " << boolalpha << store.load("Missing").has_value() << "\\n";
        try {
            Book(" ", "Asha", "text");
        } catch (const invalid_argument& e) {
            cout << e.what() << "\\n";
        }
    }
};

int main() { LibraryDemo::run(); }` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

sealed class Book {
    public readonly string Title, Author, Text;
    public Book(string title, string author, string text) {
        if (string.IsNullOrWhiteSpace(title)) throw new ArgumentException("title required");
        Title = title; Author = author; Text = text;
    }
}

class BookPrinter {                                   // UI team owns this
    public string Render(Book b) { return b.Title + " by " + b.Author + "\\n" + b.Text; }
}

interface IBookStore { void Save(Book b); Book Load(string title); }   // infra team owns implementations; Load: null when absent

class InMemoryBookStore : IBookStore {                // stands in for File/S3 in this demo
    private readonly Dictionary<string, Book> data = new Dictionary<string, Book>();
    public void Save(Book b) { data[b.Title] = b; }
    public Book Load(string title) { Book b; return data.TryGetValue(title, out b) ? b : null; }
}

class Program {
    static void Main() {
        Book b = new Book("SOLID 101", "Asha", "Small classes, clear roles.");
        IBookStore store = new InMemoryBookStore();
        store.Save(b);
        Console.WriteLine(new BookPrinter().Render(store.Load("SOLID 101")));
        Console.WriteLine("found: " + (store.Load("Missing") != null).ToString().ToLower());
        try { new Book(" ", "Asha", "text"); } catch (ArgumentException e) { Console.WriteLine(e.Message); }
    }
}` }
        ],
      complexity: `<p>O(size of text) to render, O(1) average to save/load in the map. Change cost: 1 class per requirement instead of re-opening <code>Book</code>.</p>`,
      followUps: ['Should <code>Book</code> have a <code>wordCount()</code> method, or is that another responsibility?', 'How would you add an HTML renderer without touching BookPrinter?']
    }
  });

  practice.push({
    title: 'Decoy ducks that cannot quack',
    level: 'Easy', tags: ['LSP', 'inheritance', 'spot the violation'], companies: ['Microsoft', 'Adobe'],
    statement: `<p>A game has <code>Duck</code> with <code>quack()</code> and <code>fly()</code>. <code>MallardDuck</code> does both. A wooden <code>DecoyDuck</code> extends <code>Duck</code> and throws <code>UnsupportedOperationException</code> from both methods. The "pond chorus" feature calls <code>quack()</code> on every duck and crashes when a decoy is in the pond. <b>Which principle is violated?</b> Redesign so the chorus can never receive a duck that cannot quack.</p>`,
    constraints: `<p>Decoys still appear in the pond list (they float). No type test (<code>instanceof</code>, <code>isinstance</code>, <code>dynamic_cast</code>) in the chorus.</p>`,
    example: `<p>Pond: [Mallard, Decoy, Rubber]. ${H.c('r', 'Before:')} chorus crashes at Decoy. ${H.c('g', 'After:')} chorus takes only <code>Quackable</code> things → "Quack", "Squeak"; the decoy is in the pond list but not in the chorus list.</p>`,
    brute: {
      why: `<p><code>DecoyDuck</code> cannot keep the promise of its parent (<code>quack()</code> makes a sound). Any code written for <code>Duck</code> breaks when handed a decoy — a <b>Liskov Substitution</b> violation. Fixing it with a type check for <code>DecoyDuck</code> (<code>instanceof</code> / <code>isinstance</code>) in the chorus would also break OCP.</p>`,
      code: { lang: 'java', code: `class Duck {
    void quack() { System.out.println("Quack"); }
    void fly() { System.out.println("Flap flap"); }
}
class MallardDuck extends Duck { }
class DecoyDuck extends Duck {
    @Override void quack() { throw new UnsupportedOperationException("wooden"); }
    @Override void fly() { throw new UnsupportedOperationException("wooden"); }
}
class Chorus {
    static void sing(List<Duck> pond) { pond.forEach(Duck::quack); }   // crashes on decoys
}`, alt: [
              { lang: 'python', code: `
class Duck:
    def quack(self): print("Quack")
    def fly(self): print("Flap flap")

class MallardDuck(Duck): pass

class DecoyDuck(Duck):
    def quack(self): raise NotImplementedError("wooden")
    def fly(self): raise NotImplementedError("wooden")

class Chorus:
    @staticmethod
    def sing(pond):
        for d in pond: d.quack()   # crashes on decoys` },
              { lang: 'ts', code: `
class Duck {
    quack(): void { console.log("Quack"); }
    fly(): void { console.log("Flap flap"); }
}
class MallardDuck extends Duck { }
class DecoyDuck extends Duck {
    override quack(): void { throw new Error("wooden"); }
    override fly(): void { throw new Error("wooden"); }
}
class Chorus {
    static sing(pond: Duck[]): void { pond.forEach(d => d.quack()); }   // crashes on decoys
}` },
              { lang: 'cpp', code: `
class Duck {
public:
    virtual ~Duck() = default;
    virtual void quack() { cout << "Quack\\n"; }
    virtual void fly() { cout << "Flap flap\\n"; }
};
class MallardDuck : public Duck { };
class DecoyDuck : public Duck {
public:
    void quack() override { throw logic_error("wooden"); }
    void fly() override { throw logic_error("wooden"); }
};
struct Chorus {
    static void sing(vector<Duck*>& pond) { for (Duck* d : pond) d->quack(); }   // crashes on decoys
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class Duck {
    public virtual void Quack() { Console.WriteLine("Quack"); }
    public virtual void Fly() { Console.WriteLine("Flap flap"); }
}
class MallardDuck : Duck { }
class DecoyDuck : Duck {
    public override void Quack() { throw new NotSupportedException("wooden"); }
    public override void Fly() { throw new NotSupportedException("wooden"); }
}
static class Chorus {
    public static void Sing(List<Duck> pond) { pond.ForEach(d => d.Quack()); }   // crashes on decoys
}` }
            ] }
    },
    mcq: { q: 'What is the best fix?', options: ['Split capabilities into small interfaces (Floatable, Quackable, Flyable) and let each duck implement what it can', 'Catch the exception in the chorus', 'Make DecoyDuck.quack() print nothing', 'Add <code>if (d instanceof DecoyDuck) continue;</code>'], answer: 0, explain: 'An empty quack silently breaks the promise too (weakened postcondition). Capabilities as role interfaces let the type system keep decoys out of the chorus.' },
    hints: [
      `<p>What can <i>every</i> duck do? Float. What can only some do? Quack, fly. Put each capability in its own interface.</p>`,
      `<p><code>interface Floatable</code>, <code>interface Quackable</code>, <code>interface Flyable</code>. Mallard implements all three; Decoy only Floatable; Rubber floats and squeaks.</p>`,
      `<p>The chorus parameter type becomes <code>List&lt;? extends Quackable&gt;</code>. The pond can be <code>List&lt;Floatable&gt;</code>. No exceptions, no instanceof.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "Mallard, Decoy, Rubber\nQuack, Squeak\nFlap flap\nDecoy can quack: false\n" }] },
      solution: {
      approach: `<p><b>LSP via capability interfaces (with an ISP flavour).</b> The base abstraction contains only what every duck can honour (floating). Quacking and flying become separate roles. The chorus asks for <code>Quackable</code>, so a decoy cannot be passed — the bug moves from runtime to compile time.</p>`,
      code: `interface Floatable { String name(); }
interface Quackable { String quack(); }
interface Flyable { String fly(); }

class MallardDuck implements Floatable, Quackable, Flyable {
    public String name() { return "Mallard"; }
    public String quack() { return "Quack"; }
    public String fly() { return "Flap flap"; }
}
class RubberDuck implements Floatable, Quackable {
    public String name() { return "Rubber"; }
    public String quack() { return "Squeak"; }
}
class DecoyDuck implements Floatable {
    public String name() { return "Decoy"; }
}

class Pond {
    static List<String> chorus(List<? extends Quackable> singers) {
        return singers.stream().map(Quackable::quack).toList();
    }
    public static void main(String[] args) {
        MallardDuck m = new MallardDuck(); RubberDuck r = new RubberDuck(); DecoyDuck d = new DecoyDuck();
        List<Floatable> pond = List.of(m, d, r);
        System.out.println(String.join(", ", pond.stream().map(Floatable::name).toList()));   // all float
        System.out.println(String.join(", ", chorus(List.of(m, r))));                          // Quack, Squeak
        // chorus(List.of(m, d));  // compile error: DecoyDuck is not Quackable
        System.out.println(m.fly());
        System.out.println("Decoy can quack: " + (d instanceof Quackable));
    }
}`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod


class Floatable(ABC):
    @abstractmethod
    def name(self) -> str: ...


class Quackable(ABC):
    @abstractmethod
    def quack(self) -> str: ...


class Flyable(ABC):
    @abstractmethod
    def fly(self) -> str: ...


class MallardDuck(Floatable, Quackable, Flyable):
    def name(self) -> str:
        return "Mallard"

    def quack(self) -> str:
        return "Quack"

    def fly(self) -> str:
        return "Flap flap"


class RubberDuck(Floatable, Quackable):
    def name(self) -> str:
        return "Rubber"

    def quack(self) -> str:
        return "Squeak"


class DecoyDuck(Floatable):
    def name(self) -> str:
        return "Decoy"


class Pond:
    @staticmethod
    def chorus(singers: list[Quackable]) -> list[str]:
        return [s.quack() for s in singers]

    @staticmethod
    def main() -> None:
        m, r, d = MallardDuck(), RubberDuck(), DecoyDuck()
        pond: list[Floatable] = [m, d, r]
        print(", ".join(f.name() for f in pond))  # all float
        print(", ".join(Pond.chorus([m, r])))  # Quack, Squeak
        # Pond.chorus([m, d])  # a type checker rejects this: DecoyDuck is not Quackable
        print(m.fly())
        print("Decoy can quack:", str(isinstance(d, Quackable)).lower())


if __name__ == "__main__":
    Pond.main()` },
          { lang: 'ts', code: `interface Floatable { name(): string; }
interface Quackable { quack(): string; }
interface Flyable { fly(): string; }

class MallardDuck implements Floatable, Quackable, Flyable {
  name(): string { return "Mallard"; }
  quack(): string { return "Quack"; }
  fly(): string { return "Flap flap"; }
}
class RubberDuck implements Floatable, Quackable {
  name(): string { return "Rubber"; }
  quack(): string { return "Squeak"; }
}
class DecoyDuck implements Floatable {
  name(): string { return "Decoy"; }
}

class Pond {
  static chorus(singers: readonly Quackable[]): string[] {
    return singers.map((s) => s.quack());
  }

  static main(): void {
    const m = new MallardDuck(), r = new RubberDuck(), d = new DecoyDuck();
    const pond: Floatable[] = [m, d, r];
    console.log(pond.map((f) => f.name()).join(", ")); // all float
    console.log(Pond.chorus([m, r]).join(", ")); // Quack, Squeak
    // Pond.chorus([m, d]);  // compile error: DecoyDuck has no quack()
    console.log(m.fly());
    console.log("Decoy can quack: " + ("quack" in d));
  }
}
Pond.main();` },
          { lang: 'cpp', code: `class Floatable {
public:
    virtual ~Floatable() = default;
    virtual string name() const = 0;
};
class Quackable {
public:
    virtual ~Quackable() = default;
    virtual string quack() const = 0;
};
class Flyable {
public:
    virtual ~Flyable() = default;
    virtual string fly() const = 0;
};

class MallardDuck : public Floatable, public Quackable, public Flyable {
public:
    string name() const override { return "Mallard"; }
    string quack() const override { return "Quack"; }
    string fly() const override { return "Flap flap"; }
};
class RubberDuck : public Floatable, public Quackable {
public:
    string name() const override { return "Rubber"; }
    string quack() const override { return "Squeak"; }
};
class DecoyDuck : public Floatable {
public:
    string name() const override { return "Decoy"; }
};

static string joined(const vector<string>& parts) {
    string out;
    for (size_t i = 0; i < parts.size(); ++i) out += (i ? ", " : "") + parts[i];
    return out;
}

class Pond {
public:
    static vector<string> chorus(const vector<const Quackable*>& singers) {
        vector<string> out;
        for (const Quackable* s : singers) out.push_back(s->quack());
        return out;
    }
};

int main() {
    MallardDuck m;
    RubberDuck r;
    DecoyDuck d;
    const vector<const Floatable*> pond = {&m, &d, &r};
    vector<string> names;
    for (const Floatable* f : pond) names.push_back(f->name());
    cout << joined(names) << "\\n";                                  // all float
    cout << joined(Pond::chorus({&m, &r})) << "\\n";                  // Quack, Squeak
    // Pond::chorus({&m, &d});  // compile error: DecoyDuck* is not Quackable*
    cout << m.fly() << "\\n";
    cout << "Decoy can quack: " << boolalpha << (dynamic_cast<const Quackable*>(&d) != nullptr) << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

interface IFloatable { string Name { get; } }
interface IQuackable { string Quack(); }
interface IFlyable { string Fly(); }

class MallardDuck : IFloatable, IQuackable, IFlyable {
    public string Name { get { return "Mallard"; } }
    public string Quack() { return "Quack"; }
    public string Fly() { return "Flap flap"; }
}
class RubberDuck : IFloatable, IQuackable {
    public string Name { get { return "Rubber"; } }
    public string Quack() { return "Squeak"; }
}
class DecoyDuck : IFloatable {
    public string Name { get { return "Decoy"; } }
}

class Pond {
    public static List<string> Chorus(IEnumerable<IQuackable> singers) {
        return singers.Select(s => s.Quack()).ToList();
    }
}

class Program {
    static void Main() {
        MallardDuck m = new MallardDuck(); RubberDuck r = new RubberDuck(); DecoyDuck d = new DecoyDuck();
        List<IFloatable> pond = new List<IFloatable> { m, d, r };
        Console.WriteLine(string.Join(", ", pond.Select(f => f.Name)));          // all float
        Console.WriteLine(string.Join(", ", Pond.Chorus(new IQuackable[] { m, r })));   // Quack, Squeak
        // Pond.Chorus(new IQuackable[] { m, d });  // compile error: DecoyDuck is not IQuackable
        Console.WriteLine(m.Fly());
        Console.WriteLine("Decoy can quack: " + (d is IQuackable).ToString().ToLower());
    }
}` }
        ],
      complexity: `<p>O(n) for the chorus. Runtime crash risk from decoys: eliminated by the type system.</p>`,
      followUps: ['Is an empty <code>quack()</code> body acceptable? Which LSP rule does it break?', 'How does the Strategy pattern (QuackBehavior) from Head First Design Patterns solve the same problem with composition?']
    }
  });

  practice.push({
    title: 'Area calculator with an instanceof chain',
    level: 'Easy', tags: ['OCP', 'polymorphism'], companies: ['Amazon', 'Walmart'],
    statement: `<p><code>AreaCalculator.total(List&lt;Object&gt; shapes)</code> loops and uses <code>instanceof Circle</code> / <code>instanceof Rectangle</code> to compute each area. Next sprint adds <code>Triangle</code>, then <code>Hexagon</code>. <b>Which principle is violated?</b> Refactor so new shapes never require editing <code>AreaCalculator</code>.</p>`,
    constraints: `<p>Dimensions are positive doubles. Unknown objects must not silently count as zero.</p>`,
    example: `<p>[Circle(r=1), Rectangle(2,3)] → 3.14159… + 6 = ${H.c('g', '9.14')}. After adding Triangle(base 4, height 3) → +6 = ${H.c('g', '15.14')} with zero edits to the calculator.</p>`,
    brute: {
      why: `<p>Each new shape means editing <code>total()</code> and every other method with a similar chain (perimeter, draw). The fallback branch silently ignores unknown shapes — a hidden bug. This violates <b>Open/Closed</b>; the type <code>Object</code> also gives the compiler nothing to check.</p>`,
      code: { lang: 'java', code: `class Circle { double r; Circle(double r) { this.r = r; } }
class Rectangle { double w, h; Rectangle(double w, double h) { this.w = w; this.h = h; } }

class AreaCalculator {
    static double total(List<Object> shapes) {
        double sum = 0;
        for (Object s : shapes) {
            if (s instanceof Circle c) sum += Math.PI * c.r * c.r;
            else if (s instanceof Rectangle r) sum += r.w * r.h;
            // Triangle? Hexagon? -> edit here, and in perimeter(), and in draw()...
        }
        return sum;
    }
}`, alt: [
              { lang: 'python', code: `
import math

class Circle:
    def __init__(self, r): self.r = r
class Rectangle:
    def __init__(self, w, h): self.w, self.h = w, h

class AreaCalculator:
    @staticmethod
    def total(shapes):
        s_sum = 0.0
        for s in shapes:
            if isinstance(s, Circle): s_sum += math.pi * s.r * s.r
            elif isinstance(s, Rectangle): s_sum += s.w * s.h
            # Triangle? Hexagon? -> edit here, and in perimeter(), and in draw()...
        return s_sum` },
              { lang: 'ts', code: `
class Circle { constructor(public r: number) {} }
class Rectangle { constructor(public w: number, public h: number) {} }

class AreaCalculator {
    static total(shapes: object[]): number {
        let sum = 0;
        for (const s of shapes) {
            if (s instanceof Circle) sum += Math.PI * s.r * s.r;
            else if (s instanceof Rectangle) sum += s.w * s.h;
            // Triangle? Hexagon? -> edit here, and in perimeter(), and in draw()...
        }
        return sum;
    }
}` },
              { lang: 'cpp', code: `
struct Circle { double r; Circle(double r) : r(r) {} virtual ~Circle() = default; };
struct Rectangle { double w, h; Rectangle(double w, double h) : w(w), h(h) {} virtual ~Rectangle() = default; };

struct AreaCalculator {
    static double total(const vector<void*>& shapes) {
        double sum = 0;
        for (void* p : shapes) {
            if (auto* c = dynamic_cast<Circle*>((Circle*)p)) sum += M_PI * c->r * c->r;
            else if (auto* r = dynamic_cast<Rectangle*>((Rectangle*)p)) sum += r->w * r->h;
            // Triangle? Hexagon? -> edit here, and in perimeter(), and in draw()...
        }
        return sum;
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class Circle { public double R; public Circle(double r) { R = r; } }
class Rectangle { public double W, H; public Rectangle(double w, double h) { W = w; H = h; } }

static class AreaCalculator {
    public static double Total(List<object> shapes) {
        double sum = 0;
        foreach (object s in shapes) {
            if (s is Circle c) sum += Math.PI * c.R * c.R;
            else if (s is Rectangle r) sum += r.W * r.H;
            // Triangle? Hexagon? -> edit here, and in Perimeter(), and in Draw()...
        }
        return sum;
    }
}` }
            ] }
    },
    mcq: { q: 'Where should the formula for a triangle\'s area live after the refactor?', options: ['In the Triangle class itself', 'In AreaCalculator', 'In a ShapeUtils class', 'In the UI'], answer: 0, explain: 'Replace conditional with polymorphism: each shape knows its own area, so the calculator only calls <code>s.area()</code>.' },
    hints: [
      `<p>The varying behaviour is "how to compute area". Put it behind an interface method that every shape implements.</p>`,
      `<p><code>interface Shape { double area(); }</code> and records <code>Circle</code>, <code>Rectangle</code>, <code>Triangle</code> implementing it.</p>`,
      `<p>Change the list type to <code>List&lt;? extends Shape&gt;</code> so non-shapes cannot sneak in. Validate dimensions in the constructor (a compact record constructor in Java).</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "9.14\n15.14\nradius > 0\n" }] },
      solution: {
      approach: `<p><b>Replace conditional with polymorphism.</b> A <code>Shape</code> interface with <code>area()</code>; each shape is a small immutable class (a Java record) that validates its dimensions. The calculator sums <code>area()</code> over <code>Shape</code>s and never changes again. The type parameter also fixes the "unknown object counts as zero" bug at compile time.</p>`,
      code: `interface Shape { double area(); }

record Circle(double r) implements Shape {
    Circle { if (r <= 0) throw new IllegalArgumentException("radius > 0"); }
    public double area() { return Math.PI * r * r; }
}
record Rectangle(double w, double h) implements Shape {
    Rectangle { if (w <= 0 || h <= 0) throw new IllegalArgumentException("sides > 0"); }
    public double area() { return w * h; }
}
record Triangle(double base, double height) implements Shape {      // added later, nothing edited
    Triangle { if (base <= 0 || height <= 0) throw new IllegalArgumentException("> 0"); }
    public double area() { return 0.5 * base * height; }
}

class AreaCalculator {
    static double total(List<? extends Shape> shapes) {
        return shapes.stream().mapToDouble(Shape::area).sum();
    }
    public static void main(String[] args) {
        System.out.printf("%.2f%n", total(List.of(new Circle(1), new Rectangle(2, 3))));                      // 9.14
        System.out.printf("%.2f%n", total(List.of(new Circle(1), new Rectangle(2, 3), new Triangle(4, 3))));  // 15.14
        try { new Circle(-1); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
    }
}`,
        alt: [
          { lang: 'python', code: `import math
from abc import ABC, abstractmethod
from dataclasses import dataclass


class Shape(ABC):
    @abstractmethod
    def area(self) -> float: ...


@dataclass(frozen=True)
class Circle(Shape):
    r: float

    def __post_init__(self) -> None:
        if self.r <= 0:
            raise ValueError("radius > 0")

    def area(self) -> float:
        return math.pi * self.r * self.r


@dataclass(frozen=True)
class Rectangle(Shape):
    w: float
    h: float

    def __post_init__(self) -> None:
        if self.w <= 0 or self.h <= 0:
            raise ValueError("sides > 0")

    def area(self) -> float:
        return self.w * self.h


@dataclass(frozen=True)
class Triangle(Shape):  # added later, nothing edited
    base: float
    height: float

    def __post_init__(self) -> None:
        if self.base <= 0 or self.height <= 0:
            raise ValueError("> 0")

    def area(self) -> float:
        return 0.5 * self.base * self.height


class AreaCalculator:
    @staticmethod
    def total(shapes: list[Shape]) -> float:
        return sum(s.area() for s in shapes)

    @staticmethod
    def main() -> None:
        print(f"{AreaCalculator.total([Circle(1), Rectangle(2, 3)]):.2f}")  # 9.14
        print(f"{AreaCalculator.total([Circle(1), Rectangle(2, 3), Triangle(4, 3)]):.2f}")  # 15.14
        try:
            Circle(-1)
        except ValueError as e:
            print(e)


if __name__ == "__main__":
    AreaCalculator.main()` },
          { lang: 'ts', code: `interface Shape { area(): number; }

class Circle implements Shape {
  constructor(readonly r: number) {
    if (r <= 0) throw new Error("radius > 0");
  }
  area(): number { return Math.PI * this.r * this.r; }
}
class Rectangle implements Shape {
  constructor(readonly w: number, readonly h: number) {
    if (w <= 0 || h <= 0) throw new Error("sides > 0");
  }
  area(): number { return this.w * this.h; }
}
class Triangle implements Shape { // added later, nothing edited
  constructor(readonly base: number, readonly height: number) {
    if (base <= 0 || height <= 0) throw new Error("> 0");
  }
  area(): number { return 0.5 * this.base * this.height; }
}

class AreaCalculator {
  static total(shapes: readonly Shape[]): number {
    return shapes.reduce((sum, s) => sum + s.area(), 0);
  }

  static main(): void {
    console.log(AreaCalculator.total([new Circle(1), new Rectangle(2, 3)]).toFixed(2)); // 9.14
    console.log(AreaCalculator.total([new Circle(1), new Rectangle(2, 3), new Triangle(4, 3)]).toFixed(2)); // 15.14
    try {
      new Circle(-1);
    } catch (e) {
      console.log((e as Error).message);
    }
  }
}
AreaCalculator.main();` },
          { lang: 'cpp', code: `class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
};

class Circle : public Shape {
    double r_;
public:
    explicit Circle(double r) : r_(r) {
        if (r <= 0) throw invalid_argument("radius > 0");
    }
    double area() const override { return numbers::pi * r_ * r_; }
};
class Rectangle : public Shape {
    double w_, h_;
public:
    Rectangle(double w, double h) : w_(w), h_(h) {
        if (w <= 0 || h <= 0) throw invalid_argument("sides > 0");
    }
    double area() const override { return w_ * h_; }
};
class Triangle : public Shape {   // added later, nothing edited
    double base_, height_;
public:
    Triangle(double base, double height) : base_(base), height_(height) {
        if (base <= 0 || height <= 0) throw invalid_argument("> 0");
    }
    double area() const override { return 0.5 * base_ * height_; }
};

class AreaCalculator {
public:
    static double total(const vector<unique_ptr<Shape>>& shapes) {
        double sum = 0;
        for (const auto& s : shapes) sum += s->area();
        return sum;
    }
};

int main() {
    cout << fixed << setprecision(2);
    vector<unique_ptr<Shape>> shapes;
    shapes.push_back(make_unique<Circle>(1));
    shapes.push_back(make_unique<Rectangle>(2, 3));
    cout << AreaCalculator::total(shapes) << "\\n";            // 9.14
    shapes.push_back(make_unique<Triangle>(4, 3));
    cout << AreaCalculator::total(shapes) << "\\n";            // 15.14
    try {
        Circle bad(-1);
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";
    }
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

interface IShape { double Area(); }

sealed class Circle : IShape {
    public readonly double R;
    public Circle(double r) { if (r <= 0) throw new ArgumentException("radius > 0"); R = r; }
    public double Area() { return Math.PI * R * R; }
}
sealed class Rectangle : IShape {
    public readonly double W, H;
    public Rectangle(double w, double h) { if (w <= 0 || h <= 0) throw new ArgumentException("sides > 0"); W = w; H = h; }
    public double Area() { return W * H; }
}
sealed class Triangle : IShape {                                    // added later, nothing edited
    public readonly double Base, Height;
    public Triangle(double b, double h) { if (b <= 0 || h <= 0) throw new ArgumentException("> 0"); Base = b; Height = h; }
    public double Area() { return 0.5 * Base * Height; }
}

static class AreaCalculator {
    public static double Total(IEnumerable<IShape> shapes) {
        return shapes.Sum(s => s.Area());
    }
}

class Program {
    static void Main() {
        Console.WriteLine(AreaCalculator.Total(new IShape[] { new Circle(1), new Rectangle(2, 3) }).ToString("F2"));                      // 9.14
        Console.WriteLine(AreaCalculator.Total(new IShape[] { new Circle(1), new Rectangle(2, 3), new Triangle(4, 3) }).ToString("F2"));  // 15.14
        try { new Circle(-1); } catch (ArgumentException e) { Console.WriteLine(e.Message); }
    }
}` }
        ],
      complexity: `<p>O(n) over shapes. New shape: 1 new record, 0 edited files.</p>`,
      followUps: ['If you keep adding <i>operations</i> (area, perimeter, draw, export) more often than shapes, would a sealed interface + pattern-matching switch be better? Why?', 'How would you add perimeter without breaking existing shape classes (default method? visitor?)']
    }
  });

  practice.push({
    title: 'The Car that builds its own petrol engine',
    level: 'Easy', tags: ['DIP', 'dependency injection'], companies: ['Tata Motors', 'Bosch', 'Google'],
    statement: `<p><code>Car</code> has a field <code>private final PetrolEngine engine = new PetrolEngine();</code> and <code>drive()</code> calls <code>engine.start()</code>. The company now builds electric and hybrid versions, and the test team wants to test <code>Car</code> without a real engine simulation (which takes seconds). <b>Which principle is violated?</b> Refactor so the same <code>Car</code> class works with any engine and can be tested with a fake.</p>`,
    constraints: `<p>A car must always have an engine (no nulls). Engine start may fail; <code>drive()</code> should report it.</p>`,
    example: `<p><code>new Car(new ElectricMotor()).drive()</code> → ${H.c('g', '"silent whirr... driving"')}. <code>new Car(new FailingEngine()).drive()</code> in a test → ${H.c('y', '"engine failed to start"')}, no real simulation needed.</p>`,
    brute: {
      why: `<p>The high-level <code>Car</code> depends directly on the low-level <code>PetrolEngine</code> and even creates it. Supporting EVs means editing <code>Car</code> (or copy-pasting it into <code>ElectricCar</code>), and tests cannot swap the slow engine — a <b>Dependency Inversion</b> violation (constructing a collaborator yourself, "new" in Java/TypeScript/C++, is glue).</p>`,
      code: { lang: 'java', code: `class PetrolEngine {
    boolean start() {
        System.out.println("crank... vroom (slow simulation)");
        return true;
    }
}
class Car {
    private final PetrolEngine engine = new PetrolEngine();   // glued forever
    String drive() { return engine.start() ? "driving" : "engine failed to start"; }
}`, alt: [
              { lang: 'python', code: `
class PetrolEngine:
    def start(self):
        print("crank... vroom (slow simulation)")
        return True

class Car:
    def __init__(self):
        self._engine = PetrolEngine()   # glued forever
    def drive(self):
        return "driving" if self._engine.start() else "engine failed to start"` },
              { lang: 'ts', code: `
class PetrolEngine {
    start(): boolean {
        console.log("crank... vroom (slow simulation)");
        return true;
    }
}
class Car {
    private readonly engine = new PetrolEngine();   // glued forever
    drive(): string { return this.engine.start() ? "driving" : "engine failed to start"; }
}` },
              { lang: 'cpp', code: `
class PetrolEngine {
public:
    bool start() {
        cout << "crank... vroom (slow simulation)\\n";
        return true;
    }
};
class Car {
    PetrolEngine engine;   // glued forever
public:
    string drive() { return engine.start() ? "driving" : "engine failed to start"; }
};` },
  { lang: 'csharp', code: `
using System;

class PetrolEngine {
    public bool Start() {
        Console.WriteLine("crank... vroom (slow simulation)");
        return true;
    }
}
class Car {
    private readonly PetrolEngine engine = new PetrolEngine();   // glued forever
    public string Drive() { return engine.Start() ? "driving" : "engine failed to start"; }
}` }
            ] }
    },
    mcq: { q: 'Who should own the <code>Engine</code> interface?', options: ['The Car side (the high-level module that needs it)', 'The PetrolEngine package', 'A shared utils package', 'Nobody — use abstract classes only'], answer: 0, explain: 'In DIP the abstraction is shaped by and belongs to the client that uses it; engines plug into the car\'s "socket".' },
    hints: [
      `<p>What does <code>Car</code> really need? Only "something that can start". That is the abstraction.</p>`,
      `<p>Create <code>interface Engine { boolean start(); String sound(); }</code>; pass it to <code>Car</code>'s constructor with <code>Objects.requireNonNull</code>.</p>`,
      `<p>Write <code>PetrolEngine</code>, <code>ElectricMotor</code> and a test fake <code>FailingEngine</code>. Wire concrete engines in <code>main</code> (the composition root).</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "vroom... driving\nsilent whirr... driving\ntest ok: engine failed to start\n" }] },
      solution: {
      approach: `<p><b>Constructor injection behind a client-owned interface.</b> <code>Car</code> depends on <code>Engine</code>, receives it in its constructor and never names a concrete class. New engine types are new classes (OCP); tests pass fakes (fast, deterministic). <code>requireNonNull</code> keeps the invariant "a car always has an engine".</p>`,
      code: `interface Engine { boolean start(); String sound(); }

class PetrolEngine implements Engine {
    public boolean start() { return true; }
    public String sound() { return "vroom"; }
}
class ElectricMotor implements Engine {
    public boolean start() { return true; }
    public String sound() { return "silent whirr"; }
}
class FailingEngine implements Engine {          // test double
    public boolean start() { return false; }
    public String sound() { return "click"; }
}

class Car {
    private final Engine engine;
    Car(Engine engine) { this.engine = Objects.requireNonNull(engine, "engine"); }
    String drive() { return engine.start() ? engine.sound() + "... driving" : "engine failed to start"; }

    public static void main(String[] args) {
        System.out.println(new Car(new PetrolEngine()).drive());
        System.out.println(new Car(new ElectricMotor()).drive());
        String r = new Car(new FailingEngine()).drive();
        if (!r.equals("engine failed to start")) throw new AssertionError(r);
        System.out.println("test ok: " + r);
    }
}`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod


class Engine(ABC):
    @abstractmethod
    def start(self) -> bool: ...

    @abstractmethod
    def sound(self) -> str: ...


class PetrolEngine(Engine):
    def start(self) -> bool:
        return True

    def sound(self) -> str:
        return "vroom"


class ElectricMotor(Engine):
    def start(self) -> bool:
        return True

    def sound(self) -> str:
        return "silent whirr"


class FailingEngine(Engine):  # test double
    def start(self) -> bool:
        return False

    def sound(self) -> str:
        return "click"


class Car:
    def __init__(self, engine: Engine) -> None:
        if engine is None:
            raise ValueError("engine")
        self._engine = engine  # injected, never created here

    def drive(self) -> str:
        return f"{self._engine.sound()}... driving" if self._engine.start() else "engine failed to start"


def main() -> None:
    print(Car(PetrolEngine()).drive())
    print(Car(ElectricMotor()).drive())
    r = Car(FailingEngine()).drive()
    if r != "engine failed to start":
        raise AssertionError(r)
    print("test ok:", r)


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `interface Engine {
  start(): boolean;
  sound(): string;
}

class PetrolEngine implements Engine {
  start(): boolean { return true; }
  sound(): string { return "vroom"; }
}
class ElectricMotor implements Engine {
  start(): boolean { return true; }
  sound(): string { return "silent whirr"; }
}
class FailingEngine implements Engine { // test double
  start(): boolean { return false; }
  sound(): string { return "click"; }
}

class Car {
  constructor(private readonly engine: Engine) {} // injected, never created here

  drive(): string {
    return this.engine.start() ? \`\${this.engine.sound()}... driving\` : "engine failed to start";
  }
}

function main(): void {
  console.log(new Car(new PetrolEngine()).drive());
  console.log(new Car(new ElectricMotor()).drive());
  const r = new Car(new FailingEngine()).drive();
  if (r !== "engine failed to start") throw new Error(r);
  console.log("test ok: " + r);
}
main();` },
          { lang: 'cpp', code: `class Engine {
public:
    virtual ~Engine() = default;
    virtual bool start() = 0;
    virtual string sound() const = 0;
};

class PetrolEngine : public Engine {
public:
    bool start() override { return true; }
    string sound() const override { return "vroom"; }
};
class ElectricMotor : public Engine {
public:
    bool start() override { return true; }
    string sound() const override { return "silent whirr"; }
};
class FailingEngine : public Engine {   // test double
public:
    bool start() override { return false; }
    string sound() const override { return "click"; }
};

class Car {
    unique_ptr<Engine> engine_;   // the car owns whichever engine it is given
public:
    explicit Car(unique_ptr<Engine> engine) : engine_(std::move(engine)) {
        if (!engine_) throw invalid_argument("engine");
    }
    string drive() { return engine_->start() ? engine_->sound() + "... driving" : "engine failed to start"; }
};

int main() {
    cout << Car(make_unique<PetrolEngine>()).drive() << "\\n";
    cout << Car(make_unique<ElectricMotor>()).drive() << "\\n";
    string r = Car(make_unique<FailingEngine>()).drive();
    if (r != "engine failed to start") throw runtime_error(r);
    cout << "test ok: " << r << "\\n";
}` },
  { lang: 'csharp', code: `
using System;

interface IEngine { bool Start(); string Sound(); }

class PetrolEngine : IEngine {
    public bool Start() { return true; }
    public string Sound() { return "vroom"; }
}
class ElectricMotor : IEngine {
    public bool Start() { return true; }
    public string Sound() { return "silent whirr"; }
}
class FailingEngine : IEngine {                  // test double
    public bool Start() { return false; }
    public string Sound() { return "click"; }
}

class Car {
    private readonly IEngine engine;
    public Car(IEngine engine) { if (engine == null) throw new ArgumentNullException("engine"); this.engine = engine; }
    public string Drive() { return engine.Start() ? engine.Sound() + "... driving" : "engine failed to start"; }
}

class Program {
    static void Main() {
        Console.WriteLine(new Car(new PetrolEngine()).Drive());
        Console.WriteLine(new Car(new ElectricMotor()).Drive());
        string r = new Car(new FailingEngine()).Drive();
        if (r != "engine failed to start") throw new Exception(r);
        Console.WriteLine("test ok: " + r);
    }
}` }
        ],
      complexity: `<p>O(1). Adding a hybrid engine: 1 new class, <code>Car</code> untouched; tests no longer need the slow simulation.</p>`,
      followUps: ['A hybrid uses both a petrol engine and a motor — how would you compose them (Composite pattern)?', 'Constructor vs setter injection here: which and why?']
    }
  });

  /* ======================= PRACTICE: MEDIUM ======================= */
  practice.push({
    title: 'Fat CustomerRepository used by a read-only dashboard',
    level: 'Medium', tags: ['ISP', 'CQRS', 'repository'], companies: ['Salesforce', 'Freshworks', 'Zoho'],
    statement: `<p><code>CustomerRepository</code> has 8 methods: <code>findById</code>, <code>findAll</code>, <code>countByCity</code>, <code>save</code>, <code>delete</code>, <code>bulkImport</code>, <code>exportCsv</code>, <code>purgeInactive</code>. The analytics dashboard only reads and counts, but its unit tests must stub all 8 methods, and last week a bug let the dashboard call <code>purgeInactive()</code>. <b>Which principle is violated?</b> Split the interface so each client sees only what it needs, while one storage class can still serve everyone.</p>`,
    constraints: `<p>Keep one implementation class (<code>InMemoryCustomerStore</code>). The dashboard must not be able to call write or admin methods at compile time.</p>`,
    example: `<p>Dashboard: <code>countByCity()</code> → ${H.c('g', '{Delhi=1, Pune=2}')}. Trying <code>reader.purgeInactive()</code> in dashboard code → ${H.c('r', 'compile error')} after the refactor. Dashboard test fakes 3 methods (the reader role) instead of 8.</p>`,
    brute: {
      why: `<p>Every client depends on all 8 methods (an <b>Interface Segregation</b> violation): read-only code can perform destructive operations, tests stub methods they never call, and a signature change to <code>bulkImport</code> forces the dashboard to rebuild and retest.</p>`,
      code: { lang: 'java', code: `record Customer(String id, String city, boolean active) {}

interface CustomerRepository {
    Optional<Customer> findById(String id);
    List<Customer> findAll();
    Map<String, Long> countByCity();
    void save(Customer c);
    void delete(String id);
    void bulkImport(List<Customer> cs);
    String exportCsv();
    int purgeInactive();
}

class Dashboard {
    private final CustomerRepository repo;          // sees everything, including purgeInactive()
    Dashboard(CustomerRepository repo) { this.repo = repo; }
    String render() { return "Customers per city: " + repo.countByCity(); }
}`, alt: [
              { lang: 'python', code: `
from dataclasses import dataclass

@dataclass(frozen=True)
class Customer:
    id: str
    city: str
    active: bool

class CustomerRepository:
    def find_by_id(self, id): raise NotImplementedError
    def find_all(self): raise NotImplementedError
    def count_by_city(self): raise NotImplementedError
    def save(self, c): raise NotImplementedError
    def delete(self, id): raise NotImplementedError
    def bulk_import(self, cs): raise NotImplementedError
    def export_csv(self): raise NotImplementedError
    def purge_inactive(self): raise NotImplementedError

class Dashboard:
    def __init__(self, repo):
        self._repo = repo          # sees everything, including purge_inactive()
    def render(self):
        return "Customers per city: " + str(self._repo.count_by_city())` },
              { lang: 'ts', code: `
interface Customer { id: string; city: string; active: boolean }

interface CustomerRepository {
    findById(id: string): Customer | undefined;
    findAll(): Customer[];
    countByCity(): Map<string, number>;
    save(c: Customer): void;
    delete(id: string): void;
    bulkImport(cs: Customer[]): void;
    exportCsv(): string;
    purgeInactive(): number;
}

class Dashboard {
    constructor(private readonly repo: CustomerRepository) {}   // sees everything, including purgeInactive()
    render(): string { return "Customers per city: " + JSON.stringify([...this.repo.countByCity()]); }
}` },
              { lang: 'cpp', code: `
struct Customer { string id, city; bool active; };

class CustomerRepository {
public:
    virtual ~CustomerRepository() = default;
    virtual optional<Customer> findById(const string& id) = 0;
    virtual vector<Customer> findAll() = 0;
    virtual map<string, long long> countByCity() = 0;
    virtual void save(const Customer& c) = 0;
    virtual void remove(const string& id) = 0;
    virtual void bulkImport(const vector<Customer>& cs) = 0;
    virtual string exportCsv() = 0;
    virtual int purgeInactive() = 0;
};

class Dashboard {
    CustomerRepository& repo;          // sees everything, including purgeInactive()
public:
    Dashboard(CustomerRepository& repo) : repo(repo) {}
    string render() { return "Customers per city: " + to_string(repo.countByCity().size()); }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

sealed class Customer {
    public readonly string Id, City; public readonly bool Active;
    public Customer(string id, string city, bool active) { Id = id; City = city; Active = active; }
}

interface ICustomerRepository {
    Customer FindById(string id);
    List<Customer> FindAll();
    SortedDictionary<string, long> CountByCity();
    void Save(Customer c);
    void Delete(string id);
    void BulkImport(List<Customer> cs);
    string ExportCsv();
    int PurgeInactive();
}

class Dashboard {
    private readonly ICustomerRepository repo;          // sees everything, including PurgeInactive()
    public Dashboard(ICustomerRepository repo) { this.repo = repo; }
    public string Render() { return "Customers per city: {" + string.Join(", ", repo.CountByCity().Select(kv => kv.Key + "=" + kv.Value)) + "}"; }
}` }
            ] }
    },
    mcq: { q: 'How should the 8 methods be grouped?', options: ['By client role: reader (find/count), writer (save/delete), admin (bulk/export/purge)', 'Alphabetically into two interfaces', 'One interface per method', 'Keep one interface but add Javadoc warnings'], answer: 0, explain: 'ISP splits by who uses the methods. Three roles match three kinds of clients; one-method-per-interface would be needless fragmentation.' },
    hints: [
      `<p>List each client and the methods it calls: dashboard (findAll, countByCity), signup flow (save, findById), admin tool (bulkImport, exportCsv, purgeInactive, delete).</p>`,
      `<p>Create <code>CustomerReader</code>, <code>CustomerWriter</code>, <code>CustomerAdmin</code>. One class implements all three; each client's constructor asks for one role.</p>`,
      `<p>If a client needs two roles, accept both parameters or define a tiny combined interface. Make the dashboard test use a lambda-free tiny fake implementing only <code>CustomerReader</code>.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "Customers per city: {Delhi=1, Pune=2}\npurged 1\nCustomers per city: {Pune=2}\nfind 1: Pune\nfind 3: none\nid,city,active\n1,Pune,true\n2,Pune,true\nCustomers per city: {Goa=4}\n" }] },
      solution: {
      approach: `<p><b>Role interfaces from the client's point of view.</b> Reader, Writer and Admin interfaces; the store implements all three (high cohesion stays). The dashboard depends on <code>CustomerReader</code>, so destructive calls are impossible by type and its fake implements 3 methods. Later, the reader can be served from a read replica or cache without touching writers — CQRS at class level.</p>`,
      code: `record Customer(String id, String city, boolean active) {}

interface CustomerReader {
    Optional<Customer> findById(String id);
    List<Customer> findAll();
    Map<String, Long> countByCity();
}
interface CustomerWriter { void save(Customer c); void delete(String id); }
interface CustomerAdmin { void bulkImport(List<Customer> cs); String exportCsv(); int purgeInactive(); }

class InMemoryCustomerStore implements CustomerReader, CustomerWriter, CustomerAdmin {
    private final Map<String, Customer> data = new LinkedHashMap<>();
    public Optional<Customer> findById(String id) { return Optional.ofNullable(data.get(id)); }
    public List<Customer> findAll() { return List.copyOf(data.values()); }
    public Map<String, Long> countByCity() {
        Map<String, Long> m = new TreeMap<>();
        data.values().forEach(c -> m.merge(c.city(), 1L, Long::sum));
        return m;
    }
    public void save(Customer c) { data.put(c.id(), c); }
    public void delete(String id) { data.remove(id); }
    public void bulkImport(List<Customer> cs) { cs.forEach(this::save); }
    public String exportCsv() {
        StringBuilder sb = new StringBuilder("id,city,active\\n");
        data.values().forEach(c -> sb.append(c.id()).append(',').append(c.city()).append(',').append(c.active()).append('\\n'));
        return sb.toString();
    }
    public int purgeInactive() {
        int before = data.size();
        data.values().removeIf(c -> !c.active());
        return before - data.size();
    }
}

class Dashboard {
    private final CustomerReader reader;             // read-only by type
    Dashboard(CustomerReader reader) { this.reader = reader; }
    String render() {
        String body = reader.countByCity().entrySet().stream()
                .map(e -> e.getKey() + "=" + e.getValue()).collect(Collectors.joining(", "));
        return "Customers per city: {" + body + "}";
    }
}
class AdminTool {
    private final CustomerAdmin admin;
    AdminTool(CustomerAdmin admin) { this.admin = admin; }
    String nightlyCleanup() { return "purged " + admin.purgeInactive(); }
}

class FakeReader implements CustomerReader {              // a dashboard test fakes 3 methods, not 8
    public Optional<Customer> findById(String id) { return Optional.empty(); }
    public List<Customer> findAll() { return List.of(); }
    public Map<String, Long> countByCity() { return Map.of("Goa", 4L); }
}

class Wiring {
    public static void main(String[] args) {
        InMemoryCustomerStore store = new InMemoryCustomerStore();
        store.bulkImport(List.of(new Customer("1", "Pune", true), new Customer("2", "Pune", true), new Customer("3", "Delhi", false)));
        System.out.println(new Dashboard(store).render());       // {Delhi=1, Pune=2}
        System.out.println(new AdminTool(store).nightlyCleanup()); // purged 1
        System.out.println(new Dashboard(store).render());       // {Pune=2}
        System.out.println("find 1: " + store.findById("1").map(Customer::city).orElse("none"));
        System.out.println("find 3: " + store.findById("3").map(Customer::city).orElse("none"));
        System.out.print(store.exportCsv());
        System.out.println(new Dashboard(new FakeReader()).render());
    }
}`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class Customer:
    id: str
    city: str
    active: bool


class CustomerReader(ABC):
    @abstractmethod
    def find_by_id(self, id: str) -> Optional[Customer]: ...

    @abstractmethod
    def find_all(self) -> list[Customer]: ...

    @abstractmethod
    def count_by_city(self) -> dict[str, int]: ...


class CustomerWriter(ABC):
    @abstractmethod
    def save(self, c: Customer) -> None: ...

    @abstractmethod
    def delete(self, id: str) -> None: ...


class CustomerAdmin(ABC):
    @abstractmethod
    def bulk_import(self, cs: list[Customer]) -> None: ...

    @abstractmethod
    def export_csv(self) -> str: ...

    @abstractmethod
    def purge_inactive(self) -> int: ...


class InMemoryCustomerStore(CustomerReader, CustomerWriter, CustomerAdmin):
    def __init__(self) -> None:
        self._data: dict[str, Customer] = {}

    def find_by_id(self, id: str) -> Optional[Customer]:
        return self._data.get(id)

    def find_all(self) -> list[Customer]:
        return list(self._data.values())

    def count_by_city(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for c in self._data.values():
            counts[c.city] = counts.get(c.city, 0) + 1
        return dict(sorted(counts.items()))

    def save(self, c: Customer) -> None:
        self._data[c.id] = c

    def delete(self, id: str) -> None:
        self._data.pop(id, None)

    def bulk_import(self, cs: list[Customer]) -> None:
        for c in cs:
            self.save(c)

    def export_csv(self) -> str:
        rows = ["id,city,active"]
        rows += [f"{c.id},{c.city},{str(c.active).lower()}" for c in self._data.values()]
        return "\\n".join(rows) + "\\n"

    def purge_inactive(self) -> int:
        before = len(self._data)
        self._data = {k: c for k, c in self._data.items() if c.active}
        return before - len(self._data)


class Dashboard:
    def __init__(self, reader: CustomerReader) -> None:  # read-only by type
        self._reader = reader

    def render(self) -> str:
        body = ", ".join(f"{city}={n}" for city, n in sorted(self._reader.count_by_city().items()))
        return "Customers per city: {" + body + "}"


class AdminTool:
    def __init__(self, admin: CustomerAdmin) -> None:
        self._admin = admin

    def nightly_cleanup(self) -> str:
        return f"purged {self._admin.purge_inactive()}"


class FakeReader(CustomerReader):  # a dashboard test fakes 3 methods, not 8
    def find_by_id(self, id: str) -> Optional[Customer]:
        return None

    def find_all(self) -> list[Customer]:
        return []

    def count_by_city(self) -> dict[str, int]:
        return {"Goa": 4}


class Wiring:
    @staticmethod
    def main() -> None:
        store = InMemoryCustomerStore()
        store.bulk_import([Customer("1", "Pune", True), Customer("2", "Pune", True), Customer("3", "Delhi", False)])
        print(Dashboard(store).render())  # {Delhi=1, Pune=2}
        print(AdminTool(store).nightly_cleanup())  # purged 1
        print(Dashboard(store).render())  # {Pune=2}
        found = store.find_by_id("1")
        print("find 1:", found.city if found else "none")
        found = store.find_by_id("3")
        print("find 3:", found.city if found else "none")
        print(store.export_csv(), end="")
        print(Dashboard(FakeReader()).render())


if __name__ == "__main__":
    Wiring.main()` },
          { lang: 'ts', code: `interface Customer { readonly id: string; readonly city: string; readonly active: boolean; }

interface CustomerReader {
  findById(id: string): Customer | undefined;
  findAll(): Customer[];
  countByCity(): Map<string, number>;
}
interface CustomerWriter { save(c: Customer): void; delete(id: string): void; }
interface CustomerAdmin { bulkImport(cs: Customer[]): void; exportCsv(): string; purgeInactive(): number; }

class InMemoryCustomerStore implements CustomerReader, CustomerWriter, CustomerAdmin {
  private readonly data = new Map<string, Customer>();
  findById(id: string): Customer | undefined { return this.data.get(id); }
  findAll(): Customer[] { return [...this.data.values()]; }
  countByCity(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const c of this.data.values()) counts.set(c.city, (counts.get(c.city) ?? 0) + 1);
    return counts;
  }
  save(c: Customer): void { this.data.set(c.id, c); }
  delete(id: string): void { this.data.delete(id); }
  bulkImport(cs: Customer[]): void { cs.forEach((c) => this.save(c)); }
  exportCsv(): string {
    let csv = "id,city,active\\n";
    for (const c of this.data.values()) csv += \`\${c.id},\${c.city},\${c.active}\\n\`;
    return csv;
  }
  purgeInactive(): number {
    const before = this.data.size;
    for (const [id, c] of this.data) if (!c.active) this.data.delete(id);
    return before - this.data.size;
  }
}

class Dashboard {
  constructor(private readonly reader: CustomerReader) {} // read-only by type

  render(): string {
    const body = [...this.reader.countByCity().entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([city, n]) => \`\${city}=\${n}\`)
      .join(", ");
    return \`Customers per city: {\${body}}\`;
  }
}
class AdminTool {
  constructor(private readonly admin: CustomerAdmin) {}
  nightlyCleanup(): string { return \`purged \${this.admin.purgeInactive()}\`; }
}

class FakeReader implements CustomerReader { // a dashboard test fakes 3 methods, not 8
  findById(_id: string): Customer | undefined { return undefined; }
  findAll(): Customer[] { return []; }
  countByCity(): Map<string, number> { return new Map([["Goa", 4]]); }
}

class Wiring {
  static main(): void {
    const store = new InMemoryCustomerStore();
    store.bulkImport([
      { id: "1", city: "Pune", active: true },
      { id: "2", city: "Pune", active: true },
      { id: "3", city: "Delhi", active: false },
    ]);
    console.log(new Dashboard(store).render()); // {Delhi=1, Pune=2}
    console.log(new AdminTool(store).nightlyCleanup()); // purged 1
    console.log(new Dashboard(store).render()); // {Pune=2}
    console.log("find 1: " + (store.findById("1")?.city ?? "none"));
    console.log("find 3: " + (store.findById("3")?.city ?? "none"));
    process.stdout.write(store.exportCsv());
    console.log(new Dashboard(new FakeReader()).render());
  }
}
Wiring.main();` },
          { lang: 'cpp', code: `struct Customer { string id, city; bool active; };

class CustomerReader {
public:
    virtual ~CustomerReader() = default;
    virtual optional<Customer> findById(const string& id) const = 0;
    virtual vector<Customer> findAll() const = 0;
    virtual map<string, long long> countByCity() const = 0;
};
class CustomerWriter {
public:
    virtual ~CustomerWriter() = default;
    virtual void save(const Customer& c) = 0;
    virtual void remove(const string& id) = 0;   // Java: delete (a C++ keyword)
};
class CustomerAdmin {
public:
    virtual ~CustomerAdmin() = default;
    virtual void bulkImport(const vector<Customer>& cs) = 0;
    virtual string exportCsv() const = 0;
    virtual int purgeInactive() = 0;
};

class InMemoryCustomerStore : public CustomerReader, public CustomerWriter, public CustomerAdmin {
    vector<Customer> data_;   // insertion order
    vector<Customer>::iterator find(const string& id) {
        return find_if(data_.begin(), data_.end(), [&](const Customer& c) { return c.id == id; });
    }
public:
    optional<Customer> findById(const string& id) const override {
        for (const Customer& c : data_) if (c.id == id) return c;
        return nullopt;
    }
    vector<Customer> findAll() const override { return data_; }
    map<string, long long> countByCity() const override {
        map<string, long long> counts;   // ordered by city
        for (const Customer& c : data_) ++counts[c.city];
        return counts;
    }
    void save(const Customer& c) override {
        auto it = find(c.id);
        if (it == data_.end()) data_.push_back(c); else *it = c;
    }
    void remove(const string& id) override {
        auto it = find(id);
        if (it != data_.end()) data_.erase(it);
    }
    void bulkImport(const vector<Customer>& cs) override { for (const Customer& c : cs) save(c); }
    string exportCsv() const override {
        string csv = "id,city,active\\n";
        for (const Customer& c : data_) csv += c.id + "," + c.city + "," + (c.active ? "true" : "false") + "\\n";
        return csv;
    }
    int purgeInactive() override {
        size_t before = data_.size();
        erase_if(data_, [](const Customer& c) { return !c.active; });
        return static_cast<int>(before - data_.size());
    }
};

class Dashboard {
    const CustomerReader& reader_;   // read-only by type
public:
    explicit Dashboard(const CustomerReader& reader) : reader_(reader) {}
    string render() const {
        string body;
        for (const auto& [city, n] : reader_.countByCity()) body += (body.empty() ? "" : ", ") + city + "=" + to_string(n);
        return "Customers per city: {" + body + "}";
    }
};
class AdminTool {
    CustomerAdmin& admin_;
public:
    explicit AdminTool(CustomerAdmin& admin) : admin_(admin) {}
    string nightlyCleanup() { return "purged " + to_string(admin_.purgeInactive()); }
};

class FakeReader : public CustomerReader {   // a dashboard test fakes 3 methods, not 8
public:
    optional<Customer> findById(const string&) const override { return nullopt; }
    vector<Customer> findAll() const override { return {}; }
    map<string, long long> countByCity() const override { return {{"Goa", 4}}; }
};

int main() {
    InMemoryCustomerStore store;
    store.bulkImport({{"1", "Pune", true}, {"2", "Pune", true}, {"3", "Delhi", false}});
    cout << Dashboard(store).render() << "\\n";          // {Delhi=1, Pune=2}
    cout << AdminTool(store).nightlyCleanup() << "\\n";  // purged 1
    cout << Dashboard(store).render() << "\\n";          // {Pune=2}
    auto one = store.findById("1"), three = store.findById("3");
    cout << "find 1: " << (one ? one->city : "none") << "\\n";
    cout << "find 3: " << (three ? three->city : "none") << "\\n";
    cout << store.exportCsv();
    cout << Dashboard(FakeReader()).render() << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

sealed class Customer {
    public readonly string Id, City; public readonly bool Active;
    public Customer(string id, string city, bool active) { Id = id; City = city; Active = active; }
}

interface ICustomerReader {
    Customer FindById(string id);                       // null when absent
    List<Customer> FindAll();
    SortedDictionary<string, long> CountByCity();
}
interface ICustomerWriter { void Save(Customer c); void Delete(string id); }
interface ICustomerAdmin { void BulkImport(List<Customer> cs); string ExportCsv(); int PurgeInactive(); }

class InMemoryCustomerStore : ICustomerReader, ICustomerWriter, ICustomerAdmin {
    private readonly List<Customer> data = new List<Customer>();      // insertion order kept
    public Customer FindById(string id) { return data.FirstOrDefault(c => c.Id == id); }
    public List<Customer> FindAll() { return new List<Customer>(data); }
    public SortedDictionary<string, long> CountByCity() {
        var m = new SortedDictionary<string, long>(StringComparer.Ordinal);
        foreach (Customer c in data) { long n; m.TryGetValue(c.City, out n); m[c.City] = n + 1; }
        return m;
    }
    public void Save(Customer c) { Delete(c.Id); data.Add(c); }
    public void Delete(string id) { data.RemoveAll(c => c.Id == id); }
    public void BulkImport(List<Customer> cs) { cs.ForEach(Save); }
    public string ExportCsv() {
        StringBuilder sb = new StringBuilder("id,city,active\\n");
        foreach (Customer c in data) sb.Append(c.Id).Append(',').Append(c.City).Append(',').Append(c.Active.ToString().ToLower()).Append('\\n');
        return sb.ToString();
    }
    public int PurgeInactive() {
        int before = data.Count;
        data.RemoveAll(c => !c.Active);
        return before - data.Count;
    }
}

class Dashboard {
    private readonly ICustomerReader reader;             // read-only by type
    public Dashboard(ICustomerReader reader) { this.reader = reader; }
    public string Render() {
        string body = string.Join(", ", reader.CountByCity().Select(e => e.Key + "=" + e.Value));
        return "Customers per city: {" + body + "}";
    }
}
class AdminTool {
    private readonly ICustomerAdmin admin;
    public AdminTool(ICustomerAdmin admin) { this.admin = admin; }
    public string NightlyCleanup() { return "purged " + admin.PurgeInactive(); }
}

class FakeReader : ICustomerReader {              // a dashboard test fakes 3 methods, not 8
    public Customer FindById(string id) { return null; }
    public List<Customer> FindAll() { return new List<Customer>(); }
    public SortedDictionary<string, long> CountByCity() { return new SortedDictionary<string, long> { { "Goa", 4L } }; }
}

class Program {
    static string CityOf(Customer c) { return c == null ? "none" : c.City; }
    static void Main() {
        InMemoryCustomerStore store = new InMemoryCustomerStore();
        store.BulkImport(new List<Customer> { new Customer("1", "Pune", true), new Customer("2", "Pune", true), new Customer("3", "Delhi", false) });
        Console.WriteLine(new Dashboard(store).Render());        // {Delhi=1, Pune=2}
        Console.WriteLine(new AdminTool(store).NightlyCleanup()); // purged 1
        Console.WriteLine(new Dashboard(store).Render());        // {Pune=2}
        Console.WriteLine("find 1: " + CityOf(store.FindById("1")));
        Console.WriteLine("find 3: " + CityOf(store.FindById("3")));
        Console.Write(store.ExportCsv());
        Console.WriteLine(new Dashboard(new FakeReader()).Render());
    }
}` }
        ],
      complexity: `<p>Same O(1)/O(n) operations as before. Dashboard dependency surface: 8 methods → 3; destructive calls from read-only code: impossible.</p>`,
      followUps: ['How would Spring let you inject the same bean as three different interface types?', 'The reader should hit a read replica: where does that decision live?']
    }
  });

  practice.push({
    title: 'Shipping cost calculator for many carriers',
    level: 'Medium', tags: ['OCP', 'SRP', 'strategy'], companies: ['Flipkart', 'Delhivery', 'Amazon'],
    statement: `<p><code>ShippingCalculator.cost(carrier, weightKg, region)</code> uses nested if/else: BlueDart = 50 + 20/kg, Delhivery = 40 + 25/kg, IndiaPost = 30 + 15/kg, and every carrier adds a <b>region surcharge</b> (METRO 0%, TIER2 10%, REMOTE 35%). Business adds carriers every quarter and sometimes changes surcharges. <b>Identify the violations</b> and redesign so a new carrier is a new class and surcharge changes touch one class.</p>`,
    constraints: `<p>Weight &gt; 0 and ≤ 50 kg. Unknown carrier → clear exception. Return cost rounded to 2 decimals (use a decimal type in real code).</p>`,
    example: `<p>BlueDart, 2 kg, TIER2 → (50 + 40) × 1.10 = ${H.c('g', '99.00')}. IndiaPost, 1 kg, REMOTE → (30 + 15) × 1.35 = ${H.c('g', '60.75')}. A new carrier "Shadowfax" = one new class.</p>`,
    brute: {
      why: `<p><b>OCP:</b> each carrier edits the if/else. <b>SRP:</b> carrier pricing (owned by partnerships team) and regional surcharges (owned by finance) are tangled in one method, so a surcharge change re-tests every carrier. The surcharge logic is also duplicated inside each branch.</p>`,
      code: { lang: 'java', code: `class ShippingCalculator {
    double cost(String carrier, double kg, String region) {
        double base;
        if (carrier.equals("BLUEDART")) base = 50 + 20 * kg;
        else if (carrier.equals("DELHIVERY")) base = 40 + 25 * kg;
        else if (carrier.equals("INDIAPOST")) base = 30 + 15 * kg;
        else throw new IllegalArgumentException(carrier);
        if (region.equals("TIER2")) base *= 1.10;
        else if (region.equals("REMOTE")) base *= 1.35;
        return Math.round(base * 100) / 100.0;
    }
}`, alt: [
              { lang: 'python', code: `
import math

class ShippingCalculator:
    def cost(self, carrier, kg, region):
        if carrier == "BLUEDART": base = 50 + 20 * kg
        elif carrier == "DELHIVERY": base = 40 + 25 * kg
        elif carrier == "INDIAPOST": base = 30 + 15 * kg
        else: raise ValueError(carrier)
        if region == "TIER2": base *= 1.10
        elif region == "REMOTE": base *= 1.35
        return round(base * 100) / 100.0` },
              { lang: 'ts', code: `
class ShippingCalculator {
    cost(carrier: string, kg: number, region: string): number {
        let base: number;
        if (carrier === "BLUEDART") base = 50 + 20 * kg;
        else if (carrier === "DELHIVERY") base = 40 + 25 * kg;
        else if (carrier === "INDIAPOST") base = 30 + 15 * kg;
        else throw new Error(carrier);
        if (region === "TIER2") base *= 1.10;
        else if (region === "REMOTE") base *= 1.35;
        return Math.round(base * 100) / 100.0;
    }
}` },
              { lang: 'cpp', code: `
class ShippingCalculator {
public:
    double cost(const string& carrier, double kg, const string& region) {
        double base;
        if (carrier == "BLUEDART") base = 50 + 20 * kg;
        else if (carrier == "DELHIVERY") base = 40 + 25 * kg;
        else if (carrier == "INDIAPOST") base = 30 + 15 * kg;
        else throw invalid_argument(carrier);
        if (region == "TIER2") base *= 1.10;
        else if (region == "REMOTE") base *= 1.35;
        return round(base * 100) / 100.0;
    }
};` },
  { lang: 'csharp', code: `
using System;

class ShippingCalculator {
    public double Cost(string carrier, double kg, string region) {
        double baseCost;
        if (carrier == "BLUEDART") baseCost = 50 + 20 * kg;
        else if (carrier == "DELHIVERY") baseCost = 40 + 25 * kg;
        else if (carrier == "INDIAPOST") baseCost = 30 + 15 * kg;
        else throw new ArgumentException(carrier);
        if (region == "TIER2") baseCost *= 1.10;
        else if (region == "REMOTE") baseCost *= 1.35;
        return Math.Round(baseCost * 100, MidpointRounding.AwayFromZero) / 100.0;
    }
}` }
            ] }
    },
    mcq: { q: 'Finance changes REMOTE surcharge to 40%. In the good design, which class changes?', options: ['Only the surcharge policy', 'Every carrier class', 'The calculator and every carrier', 'The Region enum and the calculator'], answer: 0, explain: 'Carrier rates and regional surcharges are separate responsibilities with separate owners, so they live in separate classes.' },
    hints: [
      `<p>There are two independent axes of change: carriers and regional surcharges. Each deserves its own abstraction.</p>`,
      `<p><code>interface CarrierRate { String code(); double baseCost(double kg); }</code> plus a <code>SurchargePolicy</code> (enum-backed map). The calculator combines them.</p>`,
      `<p>Register carriers from a list into a map (fail on duplicates). Validate weight once in the calculator. Use an <code>enum Region</code> so typos are compile errors.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "99.00\n60.75\n89.00\nweight must be in (0, 50]\nunknown carrier DTDC\ndup BLUEDART\n" }] },
      solution: {
      approach: `<p><b>Two strategies, one orchestrator.</b> <code>CarrierRate</code> implementations hold each carrier's formula (OCP: add a class per carrier). <code>SurchargePolicy</code> owns the regional multipliers (SRP: finance's rules in one place). <code>ShippingCalculator</code> validates, looks up the carrier, applies the surcharge and rounds. Carriers and policy are injected, so tests can use fixed fakes.</p>`,
      code: `enum Region { METRO, TIER2, REMOTE }

interface CarrierRate { String code(); double baseCost(double kg); }

class BlueDart implements CarrierRate { public String code() { return "BLUEDART"; } public double baseCost(double kg) { return 50 + 20 * kg; } }
class Delhivery implements CarrierRate { public String code() { return "DELHIVERY"; } public double baseCost(double kg) { return 40 + 25 * kg; } }
class IndiaPost implements CarrierRate { public String code() { return "INDIAPOST"; } public double baseCost(double kg) { return 30 + 15 * kg; } }
class Shadowfax implements CarrierRate { public String code() { return "SHADOWFAX"; } public double baseCost(double kg) { return 35 + 18 * kg; } }   // new: zero edits elsewhere

class SurchargePolicy {                                       // finance owns this
    private final Map<Region, Double> multiplier = new EnumMap<>(Map.of(Region.METRO, 1.00, Region.TIER2, 1.10, Region.REMOTE, 1.35));
    double apply(Region r, double amount) { return amount * multiplier.get(r); }
}

class ShippingCalculator {
    private final Map<String, CarrierRate> carriers = new HashMap<>();
    private final SurchargePolicy surcharges;

    ShippingCalculator(List<CarrierRate> rates, SurchargePolicy surcharges) {
        rates.forEach(r -> { if (carriers.putIfAbsent(r.code(), r) != null) throw new IllegalArgumentException("dup " + r.code()); });
        this.surcharges = surcharges;
    }

    double cost(String carrier, double kg, Region region) {
        if (kg <= 0 || kg > 50) throw new IllegalArgumentException("weight must be in (0, 50]");
        CarrierRate rate = carriers.get(carrier);
        if (rate == null) throw new IllegalArgumentException("unknown carrier " + carrier);
        return Math.round(surcharges.apply(region, rate.baseCost(kg)) * 100) / 100.0;
    }

    public static void main(String[] args) {
        ShippingCalculator c = new ShippingCalculator(
                List.of(new BlueDart(), new Delhivery(), new IndiaPost(), new Shadowfax()), new SurchargePolicy());
        System.out.println(String.format("%.2f", c.cost("BLUEDART", 2, Region.TIER2)));   // 99.00
        System.out.println(String.format("%.2f", c.cost("INDIAPOST", 1, Region.REMOTE))); // 60.75
        System.out.println(String.format("%.2f", c.cost("SHADOWFAX", 3, Region.METRO)));  // 89.00
        try { c.cost("BLUEDART", 0, Region.METRO); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
        try { c.cost("DTDC", 1, Region.METRO); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
        try { new ShippingCalculator(List.of(new BlueDart(), new BlueDart()), new SurchargePolicy()); }
        catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
    }
}`,
        alt: [
          { lang: 'python', code: `import math
from abc import ABC, abstractmethod
from enum import Enum


class Region(Enum):
    METRO = 1.00
    TIER2 = 1.10
    REMOTE = 1.35


class CarrierRate(ABC):
    @property
    @abstractmethod
    def code(self) -> str: ...

    @abstractmethod
    def base_cost(self, kg: float) -> float: ...


class BlueDart(CarrierRate):
    code = "BLUEDART"

    def base_cost(self, kg: float) -> float:
        return 50 + 20 * kg


class Delhivery(CarrierRate):
    code = "DELHIVERY"

    def base_cost(self, kg: float) -> float:
        return 40 + 25 * kg


class IndiaPost(CarrierRate):
    code = "INDIAPOST"

    def base_cost(self, kg: float) -> float:
        return 30 + 15 * kg


class Shadowfax(CarrierRate):  # new: zero edits elsewhere
    code = "SHADOWFAX"

    def base_cost(self, kg: float) -> float:
        return 35 + 18 * kg


class SurchargePolicy:  # finance owns this
    def apply(self, region: Region, amount: float) -> float:
        return amount * region.value


class ShippingCalculator:
    def __init__(self, rates: list[CarrierRate], surcharges: SurchargePolicy) -> None:
        self._carriers: dict[str, CarrierRate] = {}
        for r in rates:
            if r.code in self._carriers:
                raise ValueError(f"dup {r.code}")
            self._carriers[r.code] = r
        self._surcharges = surcharges

    def cost(self, carrier: str, kg: float, region: Region) -> float:
        if kg <= 0 or kg > 50:
            raise ValueError("weight must be in (0, 50]")
        rate = self._carriers.get(carrier)
        if rate is None:
            raise ValueError(f"unknown carrier {carrier}")
        return math.floor(self._surcharges.apply(region, rate.base_cost(kg)) * 100 + 0.5) / 100  # round half up


def main() -> None:
    c = ShippingCalculator([BlueDart(), Delhivery(), IndiaPost(), Shadowfax()], SurchargePolicy())
    print(f"{c.cost('BLUEDART', 2, Region.TIER2):.2f}")  # 99.00
    print(f"{c.cost('INDIAPOST', 1, Region.REMOTE):.2f}")  # 60.75
    print(f"{c.cost('SHADOWFAX', 3, Region.METRO):.2f}")  # 89.00
    for carrier, kg in [("BLUEDART", 0), ("DTDC", 1)]:
        try:
            c.cost(carrier, kg, Region.METRO)
        except ValueError as e:
            print(e)
    try:
        ShippingCalculator([BlueDart(), BlueDart()], SurchargePolicy())
    except ValueError as e:
        print(e)


if __name__ == "__main__":
    main()` },
          { lang: 'ts', code: `type Region = "METRO" | "TIER2" | "REMOTE";

interface CarrierRate {
  readonly code: string;
  baseCost(kg: number): number;
}

class BlueDart implements CarrierRate {
  readonly code = "BLUEDART";
  baseCost(kg: number): number { return 50 + 20 * kg; }
}
class Delhivery implements CarrierRate {
  readonly code = "DELHIVERY";
  baseCost(kg: number): number { return 40 + 25 * kg; }
}
class IndiaPost implements CarrierRate {
  readonly code = "INDIAPOST";
  baseCost(kg: number): number { return 30 + 15 * kg; }
}
class Shadowfax implements CarrierRate { // new: zero edits elsewhere
  readonly code = "SHADOWFAX";
  baseCost(kg: number): number { return 35 + 18 * kg; }
}

class SurchargePolicy { // finance owns this
  private readonly multiplier: Record<Region, number> = { METRO: 1.0, TIER2: 1.1, REMOTE: 1.35 };
  apply(region: Region, amount: number): number { return amount * this.multiplier[region]; }
}

class ShippingCalculator {
  private readonly carriers = new Map<string, CarrierRate>();

  constructor(rates: CarrierRate[], private readonly surcharges: SurchargePolicy) {
    for (const r of rates) {
      if (this.carriers.has(r.code)) throw new Error(\`dup \${r.code}\`);
      this.carriers.set(r.code, r);
    }
  }

  cost(carrier: string, kg: number, region: Region): number {
    if (kg <= 0 || kg > 50) throw new Error("weight must be in (0, 50]");
    const rate = this.carriers.get(carrier);
    if (rate === undefined) throw new Error(\`unknown carrier \${carrier}\`);
    return Math.round(this.surcharges.apply(region, rate.baseCost(kg)) * 100) / 100;
  }
}

function main(): void {
  const c = new ShippingCalculator([new BlueDart(), new Delhivery(), new IndiaPost(), new Shadowfax()], new SurchargePolicy());
  console.log(c.cost("BLUEDART", 2, "TIER2").toFixed(2)); // 99.00
  console.log(c.cost("INDIAPOST", 1, "REMOTE").toFixed(2)); // 60.75
  console.log(c.cost("SHADOWFAX", 3, "METRO").toFixed(2)); // 89.00
  for (const [carrier, kg] of [["BLUEDART", 0], ["DTDC", 1]] as const) {
    try {
      c.cost(carrier, kg, "METRO");
    } catch (e) {
      console.log((e as Error).message);
    }
  }
  try {
    new ShippingCalculator([new BlueDart(), new BlueDart()], new SurchargePolicy());
  } catch (e) {
    console.log((e as Error).message);
  }
}
main();` },
          { lang: 'cpp', code: `enum class Region { Metro, Tier2, Remote };

class CarrierRate {
public:
    virtual ~CarrierRate() = default;
    virtual string code() const = 0;
    virtual double baseCost(double kg) const = 0;
};

class BlueDart : public CarrierRate {
public:
    string code() const override { return "BLUEDART"; }
    double baseCost(double kg) const override { return 50 + 20 * kg; }
};
class Delhivery : public CarrierRate {
public:
    string code() const override { return "DELHIVERY"; }
    double baseCost(double kg) const override { return 40 + 25 * kg; }
};
class IndiaPost : public CarrierRate {
public:
    string code() const override { return "INDIAPOST"; }
    double baseCost(double kg) const override { return 30 + 15 * kg; }
};
class Shadowfax : public CarrierRate {   // new: zero edits elsewhere
public:
    string code() const override { return "SHADOWFAX"; }
    double baseCost(double kg) const override { return 35 + 18 * kg; }
};

class SurchargePolicy {   // finance owns this
    map<Region, double> multiplier_ = {{Region::Metro, 1.00}, {Region::Tier2, 1.10}, {Region::Remote, 1.35}};
public:
    double apply(Region r, double amount) const { return amount * multiplier_.at(r); }
};

class ShippingCalculator {
    unordered_map<string, unique_ptr<CarrierRate>> carriers_;
    SurchargePolicy surcharges_;
public:
    ShippingCalculator(vector<unique_ptr<CarrierRate>> rates, SurchargePolicy surcharges) : surcharges_(surcharges) {
        for (auto& r : rates) {
            string code = r->code();
            if (carriers_.count(code)) throw invalid_argument("dup " + code);
            carriers_[code] = std::move(r);
        }
    }

    double cost(const string& carrier, double kg, Region region) const {
        if (kg <= 0 || kg > 50) throw invalid_argument("weight must be in (0, 50]");
        auto it = carriers_.find(carrier);
        if (it == carriers_.end()) throw invalid_argument("unknown carrier " + carrier);
        return round(surcharges_.apply(region, it->second->baseCost(kg)) * 100) / 100;
    }
};

static vector<unique_ptr<CarrierRate>> allCarriers() {
    vector<unique_ptr<CarrierRate>> v;
    v.push_back(make_unique<BlueDart>());
    v.push_back(make_unique<Delhivery>());
    v.push_back(make_unique<IndiaPost>());
    v.push_back(make_unique<Shadowfax>());
    return v;
}

int main() {
    ShippingCalculator c(allCarriers(), SurchargePolicy());
    cout << fixed << setprecision(2);
    cout << c.cost("BLUEDART", 2, Region::Tier2) << "\\n";     // 99.00
    cout << c.cost("INDIAPOST", 1, Region::Remote) << "\\n";   // 60.75
    cout << c.cost("SHADOWFAX", 3, Region::Metro) << "\\n";    // 89.00
    for (const auto& [carrier, kg] : vector<pair<string, double>>{{"BLUEDART", 0}, {"DTDC", 1}}) {
        try {
            c.cost(carrier, kg, Region::Metro);
        } catch (const invalid_argument& e) {
            cout << e.what() << "\\n";
        }
    }
    try {
        vector<unique_ptr<CarrierRate>> twice;
        twice.push_back(make_unique<BlueDart>());
        twice.push_back(make_unique<BlueDart>());
        ShippingCalculator dup(std::move(twice), SurchargePolicy());
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";
    }
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

enum Region { METRO, TIER2, REMOTE }

interface ICarrierRate { string Code { get; } double BaseCost(double kg); }

class BlueDart : ICarrierRate { public string Code { get { return "BLUEDART"; } } public double BaseCost(double kg) { return 50 + 20 * kg; } }
class Delhivery : ICarrierRate { public string Code { get { return "DELHIVERY"; } } public double BaseCost(double kg) { return 40 + 25 * kg; } }
class IndiaPost : ICarrierRate { public string Code { get { return "INDIAPOST"; } } public double BaseCost(double kg) { return 30 + 15 * kg; } }
class Shadowfax : ICarrierRate { public string Code { get { return "SHADOWFAX"; } } public double BaseCost(double kg) { return 35 + 18 * kg; } }   // new: zero edits elsewhere

class SurchargePolicy {                                       // finance owns this
    private readonly Dictionary<Region, double> multiplier = new Dictionary<Region, double> { { Region.METRO, 1.00 }, { Region.TIER2, 1.10 }, { Region.REMOTE, 1.35 } };
    public double Apply(Region r, double amount) { return amount * multiplier[r]; }
}

class ShippingCalculator {
    private readonly Dictionary<string, ICarrierRate> carriers = new Dictionary<string, ICarrierRate>();
    private readonly SurchargePolicy surcharges;

    public ShippingCalculator(IEnumerable<ICarrierRate> rates, SurchargePolicy surcharges) {
        foreach (ICarrierRate r in rates) {
            if (carriers.ContainsKey(r.Code)) throw new ArgumentException("dup " + r.Code);
            carriers[r.Code] = r;
        }
        this.surcharges = surcharges;
    }

    public double Cost(string carrier, double kg, Region region) {
        if (kg <= 0 || kg > 50) throw new ArgumentException("weight must be in (0, 50]");
        ICarrierRate rate;
        if (!carriers.TryGetValue(carrier, out rate)) throw new ArgumentException("unknown carrier " + carrier);
        return Math.Round(surcharges.Apply(region, rate.BaseCost(kg)) * 100, MidpointRounding.AwayFromZero) / 100.0;
    }
}

class Program {
    static void Main() {
        ShippingCalculator c = new ShippingCalculator(
                new ICarrierRate[] { new BlueDart(), new Delhivery(), new IndiaPost(), new Shadowfax() }, new SurchargePolicy());
        Console.WriteLine(c.Cost("BLUEDART", 2, Region.TIER2).ToString("F2"));   // 99.00
        Console.WriteLine(c.Cost("INDIAPOST", 1, Region.REMOTE).ToString("F2")); // 60.75
        Console.WriteLine(c.Cost("SHADOWFAX", 3, Region.METRO).ToString("F2"));  // 89.00
        try { c.Cost("BLUEDART", 0, Region.METRO); } catch (ArgumentException e) { Console.WriteLine(e.Message); }
        try { c.Cost("DTDC", 1, Region.METRO); } catch (ArgumentException e) { Console.WriteLine(e.Message); }
        try { new ShippingCalculator(new ICarrierRate[] { new BlueDart(), new BlueDart() }, new SurchargePolicy()); }
        catch (ArgumentException e) { Console.WriteLine(e.Message); }
    }
}` }
        ],
      complexity: `<p>O(1) per quote. New carrier: 1 class + 1 list entry. Surcharge change: 1 class. Neither re-tests the other axis.</p>`,
      followUps: ['Some carriers do not serve REMOTE regions — where does that rule go without breaking LSP?', 'Rates come from a partner API daily: how does <code>CarrierRate</code> stay the same while data changes?', 'Pick the cheapest carrier for a parcel: new class or method?']
    }
  });

  practice.push({
    title: 'Fleet refuelling breaks on electric cars',
    level: 'Medium', tags: ['LSP', 'composition', 'ISP'], companies: ['Ola', 'Uber', 'Tesla'],
    statement: `<p>A fleet app has <code>Vehicle</code> with <code>refuel(double litres)</code> and <code>range()</code>. <code>ElectricCar extends Vehicle</code> overrides <code>refuel</code> to throw because it charges instead. The nightly <code>FleetService.topUpAll()</code> refuels every vehicle and crashes on the first EV. Redesign so <b>every vehicle can be topped up through one honest contract</b>, EVs and petrol cars both work in the nightly job, and adding a CNG car or hydrogen truck needs no change to the job.</p>`,
    constraints: `<p>Fuel tank capacity in litres, battery capacity in kWh. Range = energy × efficiency. No type test (<code>instanceof</code>, <code>isinstance</code>, <code>dynamic_cast</code>) in the job.</p>`,
    example: `<p>Fleet: PetrolCar(tank 40 L, 15 km/L, 10 L left), ElectricCar(60 kWh, 6 km/kWh, 20 kWh left). <code>topUpAll()</code> → petrol tank to 40 L (range 600 km), battery to 60 kWh (range 360 km). ${H.c('g', 'No crash.')}</p>`,
    brute: {
      why: `<p><code>ElectricCar</code> cannot honour <code>refuel(litres)</code> — the parent contract is shaped around petrol. The override throws (surprise exception), so every <code>Vehicle</code> client is at risk: a <b>Liskov</b> violation caused by an abstraction that leaked a detail (litres) into the base type.</p>`,
      code: { lang: 'java', code: `class Vehicle {
    protected double fuelLitres, tankLitres, kmPerLitre;
    Vehicle(double tank, double kmpl, double current) { tankLitres = tank; kmPerLitre = kmpl; fuelLitres = current; }
    void refuel(double litres) { fuelLitres = Math.min(tankLitres, fuelLitres + litres); }
    double range() { return fuelLitres * kmPerLitre; }
}
class ElectricCar extends Vehicle {
    ElectricCar() { super(0, 0, 0); }
    @Override void refuel(double litres) { throw new UnsupportedOperationException("EVs charge!"); }
}
class FleetService {
    static void topUpAll(List<Vehicle> fleet) {
        for (Vehicle v : fleet) v.refuel(v.tankLitres);   // boom on the first EV
    }
}`, alt: [
              { lang: 'python', code: `
class Vehicle:
    def __init__(self, tank, kmpl, current):
        self.tank_litres, self.km_per_litre, self.fuel_litres = tank, kmpl, current
    def refuel(self, litres): self.fuel_litres = min(self.tank_litres, self.fuel_litres + litres)
    def range(self): return self.fuel_litres * self.km_per_litre

class ElectricCar(Vehicle):
    def __init__(self): super().__init__(0, 0, 0)
    def refuel(self, litres): raise NotImplementedError("EVs charge!")

class FleetService:
    @staticmethod
    def top_up_all(fleet):
        for v in fleet: v.refuel(v.tank_litres)   # boom on the first EV` },
              { lang: 'ts', code: `
class Vehicle {
    constructor(protected tankLitres: number, protected kmPerLitre: number, protected fuelLitres: number) {}
    refuel(litres: number): void { this.fuelLitres = Math.min(this.tankLitres, this.fuelLitres + litres); }
    range(): number { return this.fuelLitres * this.kmPerLitre; }
    get tank(): number { return this.tankLitres; }
}
class ElectricCar extends Vehicle {
    constructor() { super(0, 0, 0); }
    override refuel(litres: number): void { throw new Error("EVs charge!"); }
}
class FleetService {
    static topUpAll(fleet: Vehicle[]): void {
        for (const v of fleet) v.refuel(v.tank);   // boom on the first EV
    }
}` },
              { lang: 'cpp', code: `
class Vehicle {
protected:
    double fuelLitres, tankLitres, kmPerLitre;
public:
    Vehicle(double tank, double kmpl, double current) : fuelLitres(current), tankLitres(tank), kmPerLitre(kmpl) {}
    virtual ~Vehicle() = default;
    virtual void refuel(double litres) { fuelLitres = min(tankLitres, fuelLitres + litres); }
    double range() { return fuelLitres * kmPerLitre; }
    double tank() { return tankLitres; }
};
class ElectricCar : public Vehicle {
public:
    ElectricCar() : Vehicle(0, 0, 0) {}
    void refuel(double litres) override { throw logic_error("EVs charge!"); }
};
struct FleetService {
    static void topUpAll(vector<Vehicle*>& fleet) {
        for (Vehicle* v : fleet) v->refuel(v->tank());   // boom on the first EV
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class Vehicle {
    protected double fuelLitres, tankLitres, kmPerLitre;
    public Vehicle(double tank, double kmpl, double current) { tankLitres = tank; kmPerLitre = kmpl; fuelLitres = current; }
    public virtual void Refuel(double litres) { fuelLitres = Math.Min(tankLitres, fuelLitres + litres); }
    public double Range() { return fuelLitres * kmPerLitre; }
    public double TankLitres { get { return tankLitres; } }
}
class ElectricCar : Vehicle {
    public ElectricCar() : base(0, 0, 0) { }
    public override void Refuel(double litres) { throw new NotSupportedException("EVs charge!"); }
}
static class FleetService {
    public static void TopUpAll(List<Vehicle> fleet) {
        foreach (Vehicle v in fleet) v.Refuel(v.TankLitres);   // boom on the first EV
    }
}` }
            ] }
    },
    mcq: { q: 'What is the root cause of this LSP violation?', options: ['The base type exposes a petrol-specific detail (litres) as if every vehicle had it', 'ElectricCar forgot to call super', 'refuel should be static', 'The language lacks multiple inheritance'], answer: 0, explain: 'The abstraction is wrong. A neutral contract ("top up to full", "range") that every energy source can honour fixes the hierarchy.' },
    hints: [
      `<p>What does the nightly job really want? "Make every vehicle full." Litres vs kWh is a detail of the energy source.</p>`,
      `<p>Use composition: <code>interface EnergySource { void fillUp(); double rangeKm(); }</code> with <code>FuelTank</code> and <code>Battery</code>. A <code>Vehicle</code> <i>has</i> an energy source.</p>`,
      `<p>Petrol-only operations like <code>refuel(litres)</code> live on <code>FuelTank</code>, not on Vehicle. A hybrid could hold two sources (composite). The job calls <code>v.energy().fillUp()</code>.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "MH12-P before 150 km\nMH12-E before 120 km\nMH12-H before 114 km\nMH12-P after 600 km\nMH12-E after 360 km\nMH12-H after 670 km\ntank after add(5): 225 km\ntank after add(100): 600 km\nlitres must be positive\n" }] },
      solution: {
      approach: `<p><b>Fix the abstraction, prefer composition.</b> Every vehicle has an <code>EnergySource</code> whose contract (<code>fillUp()</code>, <code>rangeKm()</code>) every implementation can keep. Unit-specific operations stay on the concrete source. The job depends only on the honest contract, so EVs, CNG or hydrogen all work. A <code>HybridSource</code> composite shows how the design extends without touching the job.</p>`,
      code: `interface EnergySource { void fillUp(); double rangeKm(); }

class FuelTank implements EnergySource {
    private final double capacityL, kmPerL; private double litres;
    FuelTank(double capacityL, double kmPerL, double litres) { this.capacityL = capacityL; this.kmPerL = kmPerL; this.litres = litres; }
    void add(double l) { if (l <= 0) throw new IllegalArgumentException("litres must be positive"); litres = Math.min(capacityL, litres + l); }   // petrol-specific
    public void fillUp() { litres = capacityL; }
    public double rangeKm() { return litres * kmPerL; }
}
class Battery implements EnergySource {
    private final double capacityKwh, kmPerKwh; private double kwh;
    Battery(double capacityKwh, double kmPerKwh, double kwh) { this.capacityKwh = capacityKwh; this.kmPerKwh = kmPerKwh; this.kwh = kwh; }
    public void fillUp() { kwh = capacityKwh; }
    public double rangeKm() { return kwh * kmPerKwh; }
}
class HybridSource implements EnergySource {          // composite: still honours the contract
    private final List<EnergySource> parts;
    HybridSource(EnergySource... parts) { this.parts = List.of(parts); }
    public void fillUp() { parts.forEach(EnergySource::fillUp); }
    public double rangeKm() { return parts.stream().mapToDouble(EnergySource::rangeKm).sum(); }
}

record Vehicle(String plate, EnergySource energy) {}

class FleetService {
    static void topUpAll(List<Vehicle> fleet) { fleet.forEach(v -> v.energy().fillUp()); }

    public static void main(String[] args) {
        List<Vehicle> fleet = List.of(
                new Vehicle("MH12-P", new FuelTank(40, 15, 10)),
                new Vehicle("MH12-E", new Battery(60, 6, 20)),
                new Vehicle("MH12-H", new HybridSource(new FuelTank(30, 20, 5), new Battery(10, 7, 2))));
        fleet.forEach(v -> System.out.println(v.plate() + String.format(" before %.0f km", v.energy().rangeKm())));
        topUpAll(fleet);
        fleet.forEach(v -> System.out.println(v.plate() + String.format(" after %.0f km", v.energy().rangeKm())));

        FuelTank tank = new FuelTank(40, 15, 10);                      // petrol-only operation stays on FuelTank
        tank.add(5);
        System.out.println(String.format("tank after add(5): %.0f km", tank.rangeKm()));
        tank.add(100);                                                 // capped at capacity
        System.out.println(String.format("tank after add(100): %.0f km", tank.rangeKm()));
        try { tank.add(0); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
    }
}`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass


class EnergySource(ABC):
    @abstractmethod
    def fill_up(self) -> None: ...

    @abstractmethod
    def range_km(self) -> float: ...


class FuelTank(EnergySource):
    def __init__(self, capacity_l: float, km_per_l: float, litres: float) -> None:
        self._capacity_l = capacity_l
        self._km_per_l = km_per_l
        self._litres = litres

    def add(self, l: float) -> None:  # petrol-specific
        if l <= 0:
            raise ValueError("litres must be positive")
        self._litres = min(self._capacity_l, self._litres + l)

    def fill_up(self) -> None:
        self._litres = self._capacity_l

    def range_km(self) -> float:
        return self._litres * self._km_per_l


class Battery(EnergySource):
    def __init__(self, capacity_kwh: float, km_per_kwh: float, kwh: float) -> None:
        self._capacity_kwh = capacity_kwh
        self._km_per_kwh = km_per_kwh
        self._kwh = kwh

    def fill_up(self) -> None:
        self._kwh = self._capacity_kwh

    def range_km(self) -> float:
        return self._kwh * self._km_per_kwh


class HybridSource(EnergySource):  # composite: still honours the contract
    def __init__(self, *parts: EnergySource) -> None:
        self._parts = list(parts)

    def fill_up(self) -> None:
        for p in self._parts:
            p.fill_up()

    def range_km(self) -> float:
        return sum(p.range_km() for p in self._parts)


@dataclass(frozen=True)
class Vehicle:
    plate: str
    energy: EnergySource


class FleetService:
    @staticmethod
    def top_up_all(fleet: list[Vehicle]) -> None:
        for v in fleet:
            v.energy.fill_up()

    @staticmethod
    def main() -> None:
        fleet = [
            Vehicle("MH12-P", FuelTank(40, 15, 10)),
            Vehicle("MH12-E", Battery(60, 6, 20)),
            Vehicle("MH12-H", HybridSource(FuelTank(30, 20, 5), Battery(10, 7, 2))),
        ]
        for v in fleet:
            print(f"{v.plate} before {v.energy.range_km():.0f} km")
        FleetService.top_up_all(fleet)
        for v in fleet:
            print(f"{v.plate} after {v.energy.range_km():.0f} km")

        tank = FuelTank(40, 15, 10)  # petrol-only operation stays on FuelTank
        tank.add(5)
        print(f"tank after add(5): {tank.range_km():.0f} km")
        tank.add(100)  # capped at capacity
        print(f"tank after add(100): {tank.range_km():.0f} km")
        try:
            tank.add(0)
        except ValueError as e:
            print(e)


if __name__ == "__main__":
    FleetService.main()` },
          { lang: 'ts', code: `interface EnergySource {
  fillUp(): void;
  rangeKm(): number;
}

class FuelTank implements EnergySource {
  constructor(
    private readonly capacityL: number,
    private readonly kmPerL: number,
    private litres: number,
  ) {}
  add(l: number): void { // petrol-specific
    if (l <= 0) throw new Error("litres must be positive");
    this.litres = Math.min(this.capacityL, this.litres + l);
  }
  fillUp(): void { this.litres = this.capacityL; }
  rangeKm(): number { return this.litres * this.kmPerL; }
}
class Battery implements EnergySource {
  constructor(
    private readonly capacityKwh: number,
    private readonly kmPerKwh: number,
    private kwh: number,
  ) {}
  fillUp(): void { this.kwh = this.capacityKwh; }
  rangeKm(): number { return this.kwh * this.kmPerKwh; }
}
class HybridSource implements EnergySource { // composite: still honours the contract
  private readonly parts: readonly EnergySource[];
  constructor(...parts: EnergySource[]) { this.parts = parts; }
  fillUp(): void { this.parts.forEach((p) => p.fillUp()); }
  rangeKm(): number { return this.parts.reduce((sum, p) => sum + p.rangeKm(), 0); }
}

interface Vehicle { readonly plate: string; readonly energy: EnergySource; }

class FleetService {
  static topUpAll(fleet: readonly Vehicle[]): void {
    fleet.forEach((v) => v.energy.fillUp());
  }

  static main(): void {
    const fleet: Vehicle[] = [
      { plate: "MH12-P", energy: new FuelTank(40, 15, 10) },
      { plate: "MH12-E", energy: new Battery(60, 6, 20) },
      { plate: "MH12-H", energy: new HybridSource(new FuelTank(30, 20, 5), new Battery(10, 7, 2)) },
    ];
    fleet.forEach((v) => console.log(\`\${v.plate} before \${v.energy.rangeKm().toFixed(0)} km\`));
    FleetService.topUpAll(fleet);
    fleet.forEach((v) => console.log(\`\${v.plate} after \${v.energy.rangeKm().toFixed(0)} km\`));

    const tank = new FuelTank(40, 15, 10); // petrol-only operation stays on FuelTank
    tank.add(5);
    console.log(\`tank after add(5): \${tank.rangeKm().toFixed(0)} km\`);
    tank.add(100); // capped at capacity
    console.log(\`tank after add(100): \${tank.rangeKm().toFixed(0)} km\`);
    try {
      tank.add(0);
    } catch (e) {
      console.log((e as Error).message);
    }
  }
}
FleetService.main();` },
          { lang: 'cpp', code: `class EnergySource {
public:
    virtual ~EnergySource() = default;
    virtual void fillUp() = 0;
    virtual double rangeKm() const = 0;
};

class FuelTank : public EnergySource {
    double capacityL_, kmPerL_, litres_;
public:
    FuelTank(double capacityL, double kmPerL, double litres) : capacityL_(capacityL), kmPerL_(kmPerL), litres_(litres) {}
    void add(double l) {   // petrol-specific
        if (l <= 0) throw invalid_argument("litres must be positive");
        litres_ = min(capacityL_, litres_ + l);
    }
    void fillUp() override { litres_ = capacityL_; }
    double rangeKm() const override { return litres_ * kmPerL_; }
};
class Battery : public EnergySource {
    double capacityKwh_, kmPerKwh_, kwh_;
public:
    Battery(double capacityKwh, double kmPerKwh, double kwh) : capacityKwh_(capacityKwh), kmPerKwh_(kmPerKwh), kwh_(kwh) {}
    void fillUp() override { kwh_ = capacityKwh_; }
    double rangeKm() const override { return kwh_ * kmPerKwh_; }
};
class HybridSource : public EnergySource {   // composite: still honours the contract
    vector<unique_ptr<EnergySource>> parts_;
public:
    explicit HybridSource(vector<unique_ptr<EnergySource>> parts) : parts_(std::move(parts)) {}
    void fillUp() override { for (auto& p : parts_) p->fillUp(); }
    double rangeKm() const override {
        double sum = 0;
        for (const auto& p : parts_) sum += p->rangeKm();
        return sum;
    }
};

struct Vehicle {
    string plate;
    unique_ptr<EnergySource> energy;
};

class FleetService {
public:
    static void topUpAll(vector<Vehicle>& fleet) {
        for (auto& v : fleet) v.energy->fillUp();
    }
};

int main() {
    vector<unique_ptr<EnergySource>> hybridParts;
    hybridParts.push_back(make_unique<FuelTank>(30, 20, 5));
    hybridParts.push_back(make_unique<Battery>(10, 7, 2));

    vector<Vehicle> fleet;
    fleet.push_back({"MH12-P", make_unique<FuelTank>(40, 15, 10)});
    fleet.push_back({"MH12-E", make_unique<Battery>(60, 6, 20)});
    fleet.push_back({"MH12-H", make_unique<HybridSource>(std::move(hybridParts))});

    cout << fixed << setprecision(0);
    for (const auto& v : fleet) cout << v.plate << " before " << v.energy->rangeKm() << " km\\n";
    FleetService::topUpAll(fleet);
    for (const auto& v : fleet) cout << v.plate << " after " << v.energy->rangeKm() << " km\\n";

    FuelTank tank(40, 15, 10);   // petrol-only operation stays on FuelTank
    tank.add(5);
    cout << "tank after add(5): " << tank.rangeKm() << " km\\n";
    tank.add(100);               // capped at capacity
    cout << "tank after add(100): " << tank.rangeKm() << " km\\n";
    try {
        tank.add(0);
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";
    }
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

interface IEnergySource { void FillUp(); double RangeKm(); }

class FuelTank : IEnergySource {
    private readonly double capacityL, kmPerL; private double litres;
    public FuelTank(double capacityL, double kmPerL, double litres) { this.capacityL = capacityL; this.kmPerL = kmPerL; this.litres = litres; }
    public void Add(double l) { if (l <= 0) throw new ArgumentException("litres must be positive"); litres = Math.Min(capacityL, litres + l); }   // petrol-specific
    public void FillUp() { litres = capacityL; }
    public double RangeKm() { return litres * kmPerL; }
}
class Battery : IEnergySource {
    private readonly double capacityKwh, kmPerKwh; private double kwh;
    public Battery(double capacityKwh, double kmPerKwh, double kwh) { this.capacityKwh = capacityKwh; this.kmPerKwh = kmPerKwh; this.kwh = kwh; }
    public void FillUp() { kwh = capacityKwh; }
    public double RangeKm() { return kwh * kmPerKwh; }
}
class HybridSource : IEnergySource {          // composite: still honours the contract
    private readonly List<IEnergySource> parts;
    public HybridSource(params IEnergySource[] parts) { this.parts = new List<IEnergySource>(parts); }
    public void FillUp() { parts.ForEach(p => p.FillUp()); }
    public double RangeKm() { return parts.Sum(p => p.RangeKm()); }
}

sealed class Vehicle {
    public readonly string Plate; public readonly IEnergySource Energy;
    public Vehicle(string plate, IEnergySource energy) { Plate = plate; Energy = energy; }
}

static class FleetService {
    public static void TopUpAll(List<Vehicle> fleet) { fleet.ForEach(v => v.Energy.FillUp()); }
}

class Program {
    static void Main() {
        List<Vehicle> fleet = new List<Vehicle> {
                new Vehicle("MH12-P", new FuelTank(40, 15, 10)),
                new Vehicle("MH12-E", new Battery(60, 6, 20)),
                new Vehicle("MH12-H", new HybridSource(new FuelTank(30, 20, 5), new Battery(10, 7, 2))) };
        fleet.ForEach(v => Console.WriteLine(v.Plate + " before " + v.Energy.RangeKm().ToString("F0") + " km"));
        FleetService.TopUpAll(fleet);
        fleet.ForEach(v => Console.WriteLine(v.Plate + " after " + v.Energy.RangeKm().ToString("F0") + " km"));

        FuelTank tank = new FuelTank(40, 15, 10);                      // petrol-only operation stays on FuelTank
        tank.Add(5);
        Console.WriteLine("tank after add(5): " + tank.RangeKm().ToString("F0") + " km");
        tank.Add(100);                                                 // capped at capacity
        Console.WriteLine("tank after add(100): " + tank.RangeKm().ToString("F0") + " km");
        try { tank.Add(0); } catch (ArgumentException e) { Console.WriteLine(e.Message); }
    }
}` }
        ],
      complexity: `<p>O(n) over the fleet. New energy type = 1 class; the job never changes and never throws for a vehicle type.</p>`,
      followUps: ['Charging takes hours but refuelling takes minutes — how would you model scheduling without breaking the contract?', 'Why is composition (Vehicle has-an EnergySource) better here than more subclasses (PetrolCar, ElectricCar, HybridCar)?']
    }
  });

  practice.push({
    title: 'Coupon validation hard-wired to a singleton DB and the system clock',
    level: 'Medium', tags: ['DIP', 'testability', 'Clock'], companies: ['Swiggy', 'Myntra', 'Shopify'],
    statement: `<p><code>CouponService.apply(code, cartTotal)</code> fetches the coupon with <code>CouponDb.getInstance().find(code)</code> and checks expiry with <code>LocalDate.now()</code>. Rules: coupon must exist, not be expired, cart ≥ minimum; discount = percent of cart capped at <code>maxOff</code>. QA cannot test "expires today vs yesterday" reliably and every test needs the shared DB. Refactor using DIP and write boundary tests in <code>main</code>.</p>`,
    constraints: `<p>Standard library only, no mocking libraries. Expiry date is inclusive (valid through the end of that day). Return the discount amount (0 if not applicable) and a reason.</p>`,
    example: `<p>Coupon SAVE20: 20%, max 150, min cart 500, expires 2026-03-31. Cart 1000 on 2026-03-31 → ${H.c('g', '150 (capped)')}. Same on 2026-04-01 → ${H.c('r', '0 (expired)')}. Cart 400 → ${H.c('y', '0 (below minimum)')}.</p>`,
    brute: {
      why: `<p>Two hidden dependencies: a global singleton (shared mutable state, cannot substitute) and the wall clock (non-deterministic). The business rule cannot be tested in isolation, tests interfere with each other through the singleton, and midnight-boundary bugs slip through — a <b>Dependency Inversion</b> violation.</p>`,
      code: { lang: 'java', code: `record Coupon(String code, int percent, double maxOff, double minCart, LocalDate expires) {}

class CouponDb {                                          // global singleton
    private static final CouponDb INSTANCE = new CouponDb();
    private final Map<String, Coupon> rows = new HashMap<>();
    static CouponDb getInstance() { return INSTANCE; }
    Coupon find(String code) { return rows.get(code); }
}

class CouponService {
    double apply(String code, double cart) {
        Coupon c = CouponDb.getInstance().find(code);     // hidden dependency 1
        if (c == null || LocalDate.now().isAfter(c.expires()) || cart < c.minCart()) return 0;   // hidden dependency 2
        return Math.min(cart * c.percent() / 100.0, c.maxOff());
    }
}`, alt: [
              { lang: 'python', code: `
from dataclasses import dataclass
from datetime import date

@dataclass(frozen=True)
class Coupon:
    code: str
    percent: int
    max_off: float
    min_cart: float
    expires: date

class CouponDb:                                  # global singleton
    _instance = None
    def __init__(self): self.rows = {}
    @classmethod
    def get_instance(cls):
        if cls._instance is None: cls._instance = CouponDb()
        return cls._instance
    def find(self, code): return self.rows.get(code)

class CouponService:
    def apply(self, code, cart):
        c = CouponDb.get_instance().find(code)    # hidden dependency 1
        if c is None or date.today() > c.expires or cart < c.min_cart: return 0   # hidden dependency 2
        return min(cart * c.percent / 100.0, c.max_off)` },
              { lang: 'ts', code: `
interface Coupon { code: string; percent: number; maxOff: number; minCart: number; expires: Date }

class CouponDb {                                          // global singleton
    private static readonly INSTANCE = new CouponDb();
    private readonly rows = new Map<string, Coupon>();
    static getInstance(): CouponDb { return CouponDb.INSTANCE; }
    find(code: string): Coupon | undefined { return this.rows.get(code); }
}

class CouponService {
    apply(code: string, cart: number): number {
        const c = CouponDb.getInstance().find(code);     // hidden dependency 1
        if (!c || new Date() > c.expires || cart < c.minCart) return 0;   // hidden dependency 2
        return Math.min(cart * c.percent / 100.0, c.maxOff);
    }
}` },
              { lang: 'cpp', code: `
struct Coupon { string code; int percent; double maxOff, minCart; time_t expires; };

class CouponDb {                                          // global singleton
    unordered_map<string, Coupon> rows;
public:
    static CouponDb& getInstance() { static CouponDb instance; return instance; }
    const Coupon* find(const string& code) { auto it = rows.find(code); return it == rows.end() ? nullptr : &it->second; }
};

class CouponService {
public:
    double apply(const string& code, double cart) {
        const Coupon* c = CouponDb::getInstance().find(code);     // hidden dependency 1
        if (!c || time(nullptr) > c->expires || cart < c->minCart) return 0;   // hidden dependency 2
        return min(cart * c->percent / 100.0, c->maxOff);
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

sealed class Coupon {
    public readonly string Code; public readonly int Percent; public readonly double MaxOff, MinCart; public readonly DateTime Expires;
    public Coupon(string code, int percent, double maxOff, double minCart, DateTime expires) { Code = code; Percent = percent; MaxOff = maxOff; MinCart = minCart; Expires = expires; }
}

class CouponDb {                                          // global singleton
    private static readonly CouponDb Instance = new CouponDb();
    private readonly Dictionary<string, Coupon> rows = new Dictionary<string, Coupon>();
    public static CouponDb GetInstance() { return Instance; }
    public Coupon Find(string code) { Coupon c; return rows.TryGetValue(code, out c) ? c : null; }
}

class CouponService {
    public double Apply(string code, double cart) {
        Coupon c = CouponDb.GetInstance().Find(code);     // hidden dependency 1
        if (c == null || DateTime.Today > c.Expires || cart < c.MinCart) return 0;   // hidden dependency 2
        return Math.Min(cart * c.Percent / 100.0, c.MaxOff);
    }
}` }
            ] }
    },
    mcq: { q: 'Why inject <code>java.time.Clock</code> instead of calling <code>LocalDate.now()</code>?', options: ['So tests can fix "now" to any instant and zone deterministically', 'Because LocalDate.now() is deprecated', 'Clock is faster', 'To avoid time zones entirely'], answer: 0, explain: 'A clock abstraction (Java\'s built-in <code>Clock</code>, or an injected function that returns now) lets tests fix the date. <code>Clock.fixed</code> makes expiry boundaries testable; production passes <code>Clock.system(zone)</code>.' },
    hints: [
      `<p>List everything the rule reads that is not a parameter: the coupon store and the current date. Each becomes an injected dependency.</p>`,
      `<p><code>interface CouponRepository { Optional&lt;Coupon&gt; find(String code); }</code> + <code>Clock</code> in the constructor. Return a small result record with amount + reason.</p>`,
      `<p>Boundary tests: expiry day itself (valid), next day (expired), cart exactly at minimum (valid), cart just below, discount exactly at the cap. Use <code>Clock.fixed(..., ZoneId.of("Asia/Kolkata"))</code>.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "ok 150.00 ok\nok 0.00 expired\nok 100.00 ok\nok 0.00 below minimum 500\nok 0.00 unknown coupon\n" }] },
      solution: {
      approach: `<p><b>Inject the store and the clock.</b> <code>CouponService</code> depends on a domain-owned <code>CouponRepository</code> and on <code>Clock</code>. The rule is unchanged but now deterministic and isolated: tests construct an in-memory repo and a fixed clock per case, so they cannot interfere. The result record explains <i>why</i> a coupon failed — useful for UI and logs.</p>`,
      code: `record Coupon(String code, int percent, double maxOff, double minCart, LocalDate expires) {}
record CouponResult(double discount, String reason) {}

interface CouponRepository { Optional<Coupon> find(String code); }

class InMemoryCoupons implements CouponRepository {
    private final Map<String, Coupon> rows = new HashMap<>();
    InMemoryCoupons(Coupon... cs) { for (Coupon c : cs) rows.put(c.code(), c); }
    public Optional<Coupon> find(String code) { return Optional.ofNullable(rows.get(code)); }
}

class CouponService {
    private final CouponRepository repo;
    private final Clock clock;
    CouponService(CouponRepository repo, Clock clock) { this.repo = repo; this.clock = clock; }

    CouponResult apply(String code, double cart) {
        Optional<Coupon> found = repo.find(code);
        if (found.isEmpty()) return new CouponResult(0, "unknown coupon");
        Coupon c = found.get();
        if (LocalDate.now(clock).isAfter(c.expires())) return new CouponResult(0, "expired");
        if (cart < c.minCart()) return new CouponResult(0, String.format("below minimum %.0f", c.minCart()));
        return new CouponResult(Math.min(cart * c.percent() / 100.0, c.maxOff()), "ok");
    }
}

class CouponTests {
    static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    static CouponService at(String date) {
        Clock fixed = Clock.fixed(LocalDate.parse(date).atTime(23, 59).atZone(IST).toInstant(), IST);
        return new CouponService(new InMemoryCoupons(new Coupon("SAVE20", 20, 150, 500, LocalDate.of(2026, 3, 31))), fixed);
    }
    static void expect(CouponResult r, double amount, String reason) {
        if (r.discount() != amount || !r.reason().startsWith(reason)) throw new AssertionError(r);
        System.out.println(String.format("ok %.2f %s", r.discount(), r.reason()));
    }
    public static void main(String[] args) {
        expect(at("2026-03-31").apply("SAVE20", 1000), 150, "ok");        // last valid day, capped
        expect(at("2026-04-01").apply("SAVE20", 1000), 0, "expired");
        expect(at("2026-03-01").apply("SAVE20", 500), 100, "ok");         // exactly at minimum
        expect(at("2026-03-01").apply("SAVE20", 499.99), 0, "below");
        expect(at("2026-03-01").apply("NOPE", 1000), 0, "unknown");
    }
}`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from typing import Optional


@dataclass(frozen=True)
class Coupon:
    code: str
    percent: int
    max_off: float
    min_cart: float
    expires: date


@dataclass(frozen=True)
class CouponResult:
    discount: float
    reason: str


class CouponRepository(ABC):
    @abstractmethod
    def find(self, code: str) -> Optional[Coupon]: ...


class Clock(ABC):
    @abstractmethod
    def today(self) -> date: ...


class InMemoryCoupons(CouponRepository):
    def __init__(self, *coupons: Coupon) -> None:
        self._rows = {c.code: c for c in coupons}

    def find(self, code: str) -> Optional[Coupon]:
        return self._rows.get(code)


class CouponService:
    def __init__(self, repo: CouponRepository, clock: Clock) -> None:
        self._repo = repo
        self._clock = clock

    def apply(self, code: str, cart: float) -> CouponResult:
        c = self._repo.find(code)
        if c is None:
            return CouponResult(0, "unknown coupon")
        if self._clock.today() > c.expires:
            return CouponResult(0, "expired")
        if cart < c.min_cart:
            return CouponResult(0, f"below minimum {c.min_cart:.0f}")
        return CouponResult(min(cart * c.percent / 100.0, c.max_off), "ok")


class FixedClock(Clock):  # test clock: always the same day
    def __init__(self, day: date) -> None:
        self._day = day

    def today(self) -> date:
        return self._day


class CouponTests:
    @staticmethod
    def at(day: str) -> CouponService:
        coupons = InMemoryCoupons(Coupon("SAVE20", 20, 150, 500, date(2026, 3, 31)))
        return CouponService(coupons, FixedClock(date.fromisoformat(day)))

    @staticmethod
    def expect(r: CouponResult, amount: float, reason: str) -> None:
        if r.discount != amount or not r.reason.startswith(reason):
            raise AssertionError(r)
        print(f"ok {r.discount:.2f} {r.reason}")

    @staticmethod
    def main() -> None:
        at, expect = CouponTests.at, CouponTests.expect
        expect(at("2026-03-31").apply("SAVE20", 1000), 150, "ok")  # last valid day, capped
        expect(at("2026-04-01").apply("SAVE20", 1000), 0, "expired")
        expect(at("2026-03-01").apply("SAVE20", 500), 100, "ok")  # exactly at minimum
        expect(at("2026-03-01").apply("SAVE20", 499.99), 0, "below")
        expect(at("2026-03-01").apply("NOPE", 1000), 0, "unknown")


if __name__ == "__main__":
    CouponTests.main()` },
          { lang: 'ts', code: `// dates are ISO "YYYY-MM-DD" strings, which compare correctly as plain strings
interface Coupon {
  readonly code: string;
  readonly percent: number;
  readonly maxOff: number;
  readonly minCart: number;
  readonly expires: string;
}
interface CouponResult { readonly discount: number; readonly reason: string; }

interface CouponRepository { find(code: string): Coupon | undefined; }
interface Clock { today(): string; }

class InMemoryCoupons implements CouponRepository {
  private readonly rows = new Map<string, Coupon>();
  constructor(...coupons: Coupon[]) { for (const c of coupons) this.rows.set(c.code, c); }
  find(code: string): Coupon | undefined { return this.rows.get(code); }
}

class CouponService {
  constructor(private readonly repo: CouponRepository, private readonly clock: Clock) {}

  apply(code: string, cart: number): CouponResult {
    const c = this.repo.find(code);
    if (c === undefined) return { discount: 0, reason: "unknown coupon" };
    if (this.clock.today() > c.expires) return { discount: 0, reason: "expired" };
    if (cart < c.minCart) return { discount: 0, reason: \`below minimum \${c.minCart.toFixed(0)}\` };
    return { discount: Math.min((cart * c.percent) / 100, c.maxOff), reason: "ok" };
  }
}

class FixedClock implements Clock { // test clock: always the same day
  constructor(private readonly day: string) {}
  today(): string { return this.day; }
}

class CouponTests {
  static at(day: string): CouponService {
    const coupons = new InMemoryCoupons({ code: "SAVE20", percent: 20, maxOff: 150, minCart: 500, expires: "2026-03-31" });
    return new CouponService(coupons, new FixedClock(day));
  }
  static expect(r: CouponResult, amount: number, reason: string): void {
    if (r.discount !== amount || !r.reason.startsWith(reason)) throw new Error(JSON.stringify(r));
    console.log(\`ok \${r.discount.toFixed(2)} \${r.reason}\`);
  }
  static main(): void {
    const { at, expect } = CouponTests;
    expect(at("2026-03-31").apply("SAVE20", 1000), 150, "ok"); // last valid day, capped
    expect(at("2026-04-01").apply("SAVE20", 1000), 0, "expired");
    expect(at("2026-03-01").apply("SAVE20", 500), 100, "ok"); // exactly at minimum
    expect(at("2026-03-01").apply("SAVE20", 499.99), 0, "below");
    expect(at("2026-03-01").apply("NOPE", 1000), 0, "unknown");
  }
}
CouponTests.main();` },
          { lang: 'cpp', code: `using Day = chrono::year_month_day;

struct Coupon {
    string code;
    int percent;
    double maxOff, minCart;
    Day expires;
};
struct CouponResult {
    double discount;
    string reason;
};

class CouponRepository {
public:
    virtual ~CouponRepository() = default;
    virtual optional<Coupon> find(const string& code) const = 0;
};
class Clock {
public:
    virtual ~Clock() = default;
    virtual Day today() const = 0;
};

class InMemoryCoupons : public CouponRepository {
    unordered_map<string, Coupon> rows_;
public:
    InMemoryCoupons(initializer_list<Coupon> coupons) { for (const Coupon& c : coupons) rows_.emplace(c.code, c); }
    optional<Coupon> find(const string& code) const override {
        auto it = rows_.find(code);
        if (it == rows_.end()) return nullopt;
        return it->second;
    }
};

class CouponService {
    const CouponRepository& repo_;
    const Clock& clock_;
public:
    CouponService(const CouponRepository& repo, const Clock& clock) : repo_(repo), clock_(clock) {}

    CouponResult apply(const string& code, double cart) const {
        optional<Coupon> found = repo_.find(code);
        if (!found) return {0, "unknown coupon"};
        const Coupon& c = *found;
        if (clock_.today() > c.expires) return {0, "expired"};
        if (cart < c.minCart) {
            char buf[48];
            snprintf(buf, sizeof buf, "below minimum %.0f", c.minCart);
            return {0, buf};
        }
        return {min(cart * c.percent / 100.0, c.maxOff), "ok"};
    }
};

class FixedClock : public Clock {   // test clock: always the same day
    Day day_;
public:
    explicit FixedClock(const string& iso) {
        int y, m, d;
        sscanf(iso.c_str(), "%d-%d-%d", &y, &m, &d);
        day_ = Day{chrono::year{y}, chrono::month{static_cast<unsigned>(m)}, chrono::day{static_cast<unsigned>(d)}};
    }
    Day today() const override { return day_; }
};

class CouponTests {
public:
    static void expect(const string& day, const string& code, double cart, double amount, const string& reason) {
        InMemoryCoupons coupons{{"SAVE20", 20, 150, 500, Day{chrono::year{2026}, chrono::March, chrono::day{31}}}};
        FixedClock clock(day);
        CouponResult r = CouponService(coupons, clock).apply(code, cart);
        if (r.discount != amount || r.reason.rfind(reason, 0) != 0) throw runtime_error("unexpected result: " + r.reason);
        printf("ok %.2f %s\\n", r.discount, r.reason.c_str());
    }
};

int main() {
    CouponTests::expect("2026-03-31", "SAVE20", 1000, 150, "ok");     // last valid day, capped
    CouponTests::expect("2026-04-01", "SAVE20", 1000, 0, "expired");
    CouponTests::expect("2026-03-01", "SAVE20", 500, 100, "ok");      // exactly at minimum
    CouponTests::expect("2026-03-01", "SAVE20", 499.99, 0, "below");
    CouponTests::expect("2026-03-01", "NOPE", 1000, 0, "unknown");
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

sealed class Coupon {
    public readonly string Code; public readonly int Percent; public readonly double MaxOff, MinCart; public readonly DateTime Expires;
    public Coupon(string code, int percent, double maxOff, double minCart, DateTime expires) { Code = code; Percent = percent; MaxOff = maxOff; MinCart = minCart; Expires = expires; }
}
sealed class CouponResult {
    public readonly double Discount; public readonly string Reason;
    public CouponResult(double discount, string reason) { Discount = discount; Reason = reason; }
    public override string ToString() { return "CouponResult[discount=" + Discount + ", reason=" + Reason + "]"; }
}

interface ICouponRepository { Coupon Find(string code); }   // null when unknown

class InMemoryCoupons : ICouponRepository {
    private readonly Dictionary<string, Coupon> rows = new Dictionary<string, Coupon>();
    public InMemoryCoupons(params Coupon[] cs) { foreach (Coupon c in cs) rows[c.Code] = c; }
    public Coupon Find(string code) { Coupon c; return rows.TryGetValue(code, out c) ? c : null; }
}

class CouponService {
    private readonly ICouponRepository repo;
    private readonly Func<DateTime> clock;
    public CouponService(ICouponRepository repo, Func<DateTime> clock) { this.repo = repo; this.clock = clock; }

    public CouponResult Apply(string code, double cart) {
        Coupon c = repo.Find(code);
        if (c == null) return new CouponResult(0, "unknown coupon");
        if (clock().Date > c.Expires) return new CouponResult(0, "expired");
        if (cart < c.MinCart) return new CouponResult(0, "below minimum " + c.MinCart.ToString("F0"));
        return new CouponResult(Math.Min(cart * c.Percent / 100.0, c.MaxOff), "ok");
    }
}

class Program {
    static CouponService At(string date) {
        DateTime fixedTime = DateTime.Parse(date).AddHours(23).AddMinutes(59);
        return new CouponService(new InMemoryCoupons(new Coupon("SAVE20", 20, 150, 500, new DateTime(2026, 3, 31))), () => fixedTime);
    }
    static void Expect(CouponResult r, double amount, string reason) {
        if (r.Discount != amount || !r.Reason.StartsWith(reason)) throw new Exception(r.ToString());
        Console.WriteLine("ok " + r.Discount.ToString("F2") + " " + r.Reason);
    }
    static void Main() {
        Expect(At("2026-03-31").Apply("SAVE20", 1000), 150, "ok");        // last valid day, capped
        Expect(At("2026-04-01").Apply("SAVE20", 1000), 0, "expired");
        Expect(At("2026-03-01").Apply("SAVE20", 500), 100, "ok");         // exactly at minimum
        Expect(At("2026-03-01").Apply("SAVE20", 499.99), 0, "below");
        Expect(At("2026-03-01").Apply("NOPE", 1000), 0, "unknown");
    }
}` }
        ],
      complexity: `<p>O(1) per application. Tests: 5 deterministic boundary cases in milliseconds, no shared DB, no dependence on the real date.</p>`,
      followUps: ['Per-user usage limits ("once per user") need storage of redemptions — new port or extend CouponRepository? (think ISP)', 'Why are singletons with global state considered a DIP/testability smell, and when is a singleton still fine?']
    }
  });

  practice.push({
    title: 'Invoice that calculates, taxes by country and prints',
    level: 'Medium', tags: ['SRP', 'OCP', 'tax'], companies: ['Stripe', 'Chargebee', 'SAP'],
    statement: `<p><code>Invoice</code> holds line items and has <code>total()</code> (which includes a <code>switch</code> on country: IN 18% GST, UK 20% VAT, US 0% at federal level), and <code>print()</code> which formats a text invoice. The company is launching in Germany (19%) and Singapore (9%), and the design team wants a new layout. <b>Name both violated principles</b> and refactor so adding a country and changing the layout each touch one place.</p>`,
    constraints: `<p>Money as an exact decimal (Java <code>BigDecimal</code>, Python <code>Decimal</code>) or integer minor units, with 2-decimal HALF_UP rounding. Unknown country → exception at invoice creation, not at print time.</p>`,
    example: `<p>Items: 2 × 100.00 + 1 × 50.00 = 250.00. Country IN → tax 45.00, total ${H.c('g', '295.00')}. Country DE (added as new class) → tax 47.50, total ${H.c('g', '297.50')}.</p>`,
    brute: {
      why: `<p><b>SRP:</b> one class serves finance (tax rules), sales (line items) and design (layout). <b>OCP:</b> every new country edits the switch inside <code>total()</code>. A layout tweak re-opens the class that computes money — risky.</p>`,
      code: { lang: 'java', code: `class Invoice {
    private final String country;
    private final List<double[]> lines = new ArrayList<>();   // {qty, unitPrice}
    Invoice(String country) { this.country = country; }
    void add(int qty, double price) { lines.add(new double[]{qty, price}); }

    double total() {
        double sub = 0;
        for (double[] l : lines) sub += l[0] * l[1];
        switch (country) {
            case "IN": return sub * 1.18;
            case "UK": return sub * 1.20;
            case "US": return sub;
            default: throw new IllegalArgumentException(country);
        }
    }
    void print() { System.out.println("INVOICE (" + country + ") total = " + total()); }
}`, alt: [
              { lang: 'python', code: `
class Invoice:
    def __init__(self, country):
        self._country = country
        self._lines = []             # (qty, unit_price)
    def add(self, qty, price): self._lines.append((qty, price))

    def total(self):
        sub = 0.0
        for qty, price in self._lines: sub += qty * price
        if self._country == "IN": return sub * 1.18
        if self._country == "UK": return sub * 1.20
        if self._country == "US": return sub
        raise ValueError(self._country)

    def print(self): print(f"INVOICE ({self._country}) total = {self.total()}")` },
              { lang: 'ts', code: `
class Invoice {
    private readonly lines: [number, number][] = [];   // [qty, unitPrice]
    constructor(private readonly country: string) {}
    add(qty: number, price: number): void { this.lines.push([qty, price]); }

    total(): number {
        let sub = 0;
        for (const l of this.lines) sub += l[0] * l[1];
        switch (this.country) {
            case "IN": return sub * 1.18;
            case "UK": return sub * 1.20;
            case "US": return sub;
            default: throw new Error(this.country);
        }
    }
    print(): void { console.log("INVOICE (" + this.country + ") total = " + this.total()); }
}` },
              { lang: 'cpp', code: `
class Invoice {
    string country;
    vector<pair<int, double>> lines;   // {qty, unitPrice}
public:
    Invoice(string country) : country(country) {}
    void add(int qty, double price) { lines.push_back({qty, price}); }

    double total() {
        double sub = 0;
        for (auto& l : lines) sub += l.first * l.second;
        if (country == "IN") return sub * 1.18;
        if (country == "UK") return sub * 1.20;
        if (country == "US") return sub;
        throw invalid_argument(country);
    }
    void print() { cout << "INVOICE (" << country << ") total = " << total() << "\\n"; }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class Invoice {
    private readonly string country;
    private readonly List<double[]> lines = new List<double[]>();   // {qty, unitPrice}
    public Invoice(string country) { this.country = country; }
    public void Add(int qty, double price) { lines.Add(new[] { qty, price }); }

    public double Total() {
        double sub = 0;
        foreach (double[] l in lines) sub += l[0] * l[1];
        switch (country) {
            case "IN": return sub * 1.18;
            case "UK": return sub * 1.20;
            case "US": return sub;
            default: throw new ArgumentException(country);
        }
    }
    public void Print() { Console.WriteLine("INVOICE (" + country + ") total = " + Total()); }
}` }
            ] }
    },
    mcq: { q: 'Where should "Germany charges 19%" be written after the refactor?', options: ['In a new GermanVat class implementing TaxPolicy', 'In the Invoice switch', 'In the InvoicePrinter', 'In a properties file read by Invoice.print()'], answer: 0, explain: 'Tax rules are their own responsibility with their own axis of change (countries), so each country is a TaxPolicy implementation.' },
    hints: [
      `<p>Three responsibilities: line items and subtotal (sales), tax by country (finance), formatting (design).</p>`,
      `<p><code>record LineItem</code>, <code>Invoice</code> (lines + subtotal + injected <code>TaxPolicy</code>), <code>interface TaxPolicy { String country(); BigDecimal taxOn(BigDecimal subtotal); }</code>, <code>InvoicePrinter</code>.</p>`,
      `<p>A <code>TaxPolicies</code> registry resolves the country when the invoice is created (fail fast). Use <code>setScale(2, RoundingMode.HALF_UP)</code> once, on the tax amount.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "INVOICE [DE]\nPen x2 200.00\nInk x1 50.00\nTax: 47.50\nTotal: 297.50\nIN total 295.00\nno tax policy for XX\n" }] },
      solution: {
      approach: `<p><b>Split by actor, open the country axis.</b> <code>Invoice</code> owns items and the subtotal and receives its <code>TaxPolicy</code> (resolved at creation, so an unknown country fails immediately). Each country is a class (or a data-driven <code>FlatRateTax</code>) registered in <code>TaxPolicies</code>. <code>InvoicePrinter</code> only formats. A new layout = new printer; a new country = new registry entry.</p>`,
      code: `record LineItem(String name, int qty, BigDecimal unitPrice) {
    BigDecimal amount() { return unitPrice.multiply(BigDecimal.valueOf(qty)); }
}

interface TaxPolicy { String country(); BigDecimal taxOn(BigDecimal subtotal); }

record FlatRateTax(String country, BigDecimal rate) implements TaxPolicy {     // data-driven policy
    public BigDecimal taxOn(BigDecimal sub) { return sub.multiply(rate).setScale(2, RoundingMode.HALF_UP); }
}

class TaxPolicies {
    private final Map<String, TaxPolicy> byCountry = new HashMap<>();
    TaxPolicies(List<TaxPolicy> all) { all.forEach(p -> byCountry.put(p.country(), p)); }
    TaxPolicy forCountry(String c) {
        TaxPolicy p = byCountry.get(c);
        if (p == null) throw new IllegalArgumentException("no tax policy for " + c);
        return p;
    }
}

class Invoice {
    private final List<LineItem> items = new ArrayList<>();
    private final TaxPolicy tax;
    Invoice(TaxPolicy tax) { this.tax = tax; }
    void add(LineItem i) { items.add(i); }
    List<LineItem> items() { return List.copyOf(items); }
    String country() { return tax.country(); }
    BigDecimal subtotal() { return items.stream().map(LineItem::amount).reduce(BigDecimal.ZERO, BigDecimal::add); }
    BigDecimal taxAmount() { return tax.taxOn(subtotal()); }
    BigDecimal total() { return subtotal().add(taxAmount()).setScale(2, RoundingMode.HALF_UP); }
}

class InvoicePrinter {                                        // design team owns layout
    String render(Invoice inv) {
        StringBuilder sb = new StringBuilder("INVOICE [" + inv.country() + "]\\n");
        inv.items().forEach(i -> sb.append(String.format("%-8s x%d %10s%n", i.name(), i.qty(), i.amount())));
        return sb.append("Tax: ").append(inv.taxAmount()).append("\\nTotal: ").append(inv.total()).toString();
    }
}

class InvoiceDemo {
    static Invoice sample(TaxPolicy tax) {
        Invoice inv = new Invoice(tax);
        inv.add(new LineItem("Pen", 2, new BigDecimal("100.00")));
        inv.add(new LineItem("Ink", 1, new BigDecimal("50.00")));
        return inv;
    }

    public static void main(String[] args) {
        TaxPolicies taxes = new TaxPolicies(List.of(
                new FlatRateTax("IN", new BigDecimal("0.18")), new FlatRateTax("UK", new BigDecimal("0.20")),
                new FlatRateTax("US", BigDecimal.ZERO), new FlatRateTax("DE", new BigDecimal("0.19")),
                new FlatRateTax("SG", new BigDecimal("0.09"))));
        System.out.println(new InvoicePrinter().render(sample(taxes.forCountry("DE"))));   // Tax 47.50, Total 297.50
        System.out.println("IN total " + sample(taxes.forCountry("IN")).total());           // 295.00
        try { taxes.forCountry("XX"); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
    }
}`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

CENT = Decimal("0.01")


@dataclass(frozen=True)
class LineItem:
    name: str
    qty: int
    unit_price: Decimal

    def amount(self) -> Decimal:
        return self.unit_price * self.qty


class TaxPolicy(ABC):
    @property
    @abstractmethod
    def country(self) -> str: ...

    @abstractmethod
    def tax_on(self, subtotal: Decimal) -> Decimal: ...


class FlatRateTax(TaxPolicy):  # data-driven policy
    def __init__(self, country: str, rate: Decimal) -> None:
        self._country = country
        self._rate = rate

    @property
    def country(self) -> str:
        return self._country

    def tax_on(self, subtotal: Decimal) -> Decimal:
        return (subtotal * self._rate).quantize(CENT, rounding=ROUND_HALF_UP)


class TaxPolicies:
    def __init__(self, policies: list[TaxPolicy]) -> None:
        self._by_country = {p.country: p for p in policies}

    def for_country(self, country: str) -> TaxPolicy:
        policy = self._by_country.get(country)
        if policy is None:
            raise ValueError(f"no tax policy for {country}")
        return policy


class Invoice:
    def __init__(self, tax: TaxPolicy) -> None:
        self._items: list[LineItem] = []
        self._tax = tax

    def add(self, item: LineItem) -> None:
        self._items.append(item)

    def items(self) -> tuple[LineItem, ...]:
        return tuple(self._items)

    def country(self) -> str:
        return self._tax.country

    def subtotal(self) -> Decimal:
        return sum((i.amount() for i in self._items), Decimal("0"))

    def tax_amount(self) -> Decimal:
        return self._tax.tax_on(self.subtotal())

    def total(self) -> Decimal:
        return (self.subtotal() + self.tax_amount()).quantize(CENT, rounding=ROUND_HALF_UP)


class InvoicePrinter:  # design team owns layout
    def render(self, inv: Invoice) -> str:
        lines = [f"INVOICE [{inv.country()}]"]
        lines += [f"{i.name:<8} x{i.qty} {str(i.amount()):>10}" for i in inv.items()]
        lines += [f"Tax: {inv.tax_amount()}", f"Total: {inv.total()}"]
        return "\\n".join(lines)


class InvoiceDemo:
    @staticmethod
    def sample(tax: TaxPolicy) -> Invoice:
        inv = Invoice(tax)
        inv.add(LineItem("Pen", 2, Decimal("100.00")))
        inv.add(LineItem("Ink", 1, Decimal("50.00")))
        return inv

    @staticmethod
    def main() -> None:
        taxes = TaxPolicies([
            FlatRateTax("IN", Decimal("0.18")), FlatRateTax("UK", Decimal("0.20")),
            FlatRateTax("US", Decimal("0")), FlatRateTax("DE", Decimal("0.19")),
            FlatRateTax("SG", Decimal("0.09")),
        ])
        print(InvoicePrinter().render(InvoiceDemo.sample(taxes.for_country("DE"))))  # Tax 47.50, Total 297.50
        print("IN total", InvoiceDemo.sample(taxes.for_country("IN")).total())  # 295.00
        try:
            taxes.for_country("XX")
        except ValueError as e:
            print(e)


if __name__ == "__main__":
    InvoiceDemo.main()` },
          { lang: 'ts', code: `// Money is whole cents (an integer) and rates are basis points: 1900 = 19.00%. No floating-point drift.
function money(cents: number): string {
  return \`\${Math.trunc(cents / 100)}.\${String(cents % 100).padStart(2, "0")}\`;
}

class LineItem {
  constructor(readonly name: string, readonly qty: number, readonly unitCents: number) {}
  amount(): number { return this.unitCents * this.qty; }
}

interface TaxPolicy {
  country(): string;
  taxOn(subtotalCents: number): number;
}

class FlatRateTax implements TaxPolicy { // data-driven policy
  constructor(private readonly code: string, private readonly rateBps: number) {}
  country(): string { return this.code; }
  taxOn(subtotalCents: number): number {
    return Math.floor((subtotalCents * this.rateBps + 5000) / 10000); // round half up
  }
}

class TaxPolicies {
  private readonly byCountry = new Map<string, TaxPolicy>();
  constructor(all: TaxPolicy[]) { for (const p of all) this.byCountry.set(p.country(), p); }
  forCountry(c: string): TaxPolicy {
    const p = this.byCountry.get(c);
    if (p === undefined) throw new Error(\`no tax policy for \${c}\`);
    return p;
  }
}

class Invoice {
  private readonly lines: LineItem[] = [];
  constructor(private readonly tax: TaxPolicy) {}
  add(i: LineItem): void { this.lines.push(i); }
  items(): readonly LineItem[] { return [...this.lines]; }
  country(): string { return this.tax.country(); }
  subtotal(): number { return this.lines.reduce((sum, i) => sum + i.amount(), 0); }
  taxAmount(): number { return this.tax.taxOn(this.subtotal()); }
  total(): number { return this.subtotal() + this.taxAmount(); }
}

class InvoicePrinter { // design team owns layout
  render(inv: Invoice): string {
    const rows = inv.items().map((i) => \`\${i.name.padEnd(8)} x\${i.qty} \${money(i.amount()).padStart(10)}\`);
    return [\`INVOICE [\${inv.country()}]\`, ...rows, \`Tax: \${money(inv.taxAmount())}\`, \`Total: \${money(inv.total())}\`].join("\\n");
  }
}

class InvoiceDemo {
  static sample(tax: TaxPolicy): Invoice {
    const inv = new Invoice(tax);
    inv.add(new LineItem("Pen", 2, 10000));
    inv.add(new LineItem("Ink", 1, 5000));
    return inv;
  }

  static main(): void {
    const taxes = new TaxPolicies([
      new FlatRateTax("IN", 1800), new FlatRateTax("UK", 2000), new FlatRateTax("US", 0),
      new FlatRateTax("DE", 1900), new FlatRateTax("SG", 900),
    ]);
    console.log(new InvoicePrinter().render(InvoiceDemo.sample(taxes.forCountry("DE")))); // Tax 47.50, Total 297.50
    console.log("IN total " + money(InvoiceDemo.sample(taxes.forCountry("IN")).total())); // 295.00
    try {
      taxes.forCountry("XX");
    } catch (e) {
      console.log((e as Error).message);
    }
  }
}
InvoiceDemo.main();` },
          { lang: 'cpp', code: `// Money is whole cents (an integer) and rates are basis points: 1900 = 19.00%. No floating-point drift.
static string money(long long cents) {
    char buf[32];
    snprintf(buf, sizeof buf, "%lld.%02lld", cents / 100, cents % 100);
    return buf;
}

struct LineItem {
    string name;
    int qty;
    long long unitCents;
    long long amount() const { return unitCents * qty; }
};

class TaxPolicy {
public:
    virtual ~TaxPolicy() = default;
    virtual string country() const = 0;
    virtual long long taxOn(long long subtotalCents) const = 0;
};

class FlatRateTax : public TaxPolicy {   // data-driven policy
    string code_;
    long long rateBps_;
public:
    FlatRateTax(string code, long long rateBps) : code_(std::move(code)), rateBps_(rateBps) {}
    string country() const override { return code_; }
    long long taxOn(long long subtotalCents) const override {
        return (subtotalCents * rateBps_ + 5000) / 10000;   // round half up
    }
};

class TaxPolicies {
    unordered_map<string, unique_ptr<TaxPolicy>> byCountry_;
public:
    explicit TaxPolicies(vector<unique_ptr<TaxPolicy>> all) {
        for (auto& p : all) {
            string c = p->country();
            byCountry_[c] = std::move(p);
        }
    }
    const TaxPolicy& forCountry(const string& c) const {
        auto it = byCountry_.find(c);
        if (it == byCountry_.end()) throw invalid_argument("no tax policy for " + c);
        return *it->second;
    }
};

class Invoice {
    vector<LineItem> items_;
    const TaxPolicy& tax_;
public:
    explicit Invoice(const TaxPolicy& tax) : tax_(tax) {}
    void add(LineItem i) { items_.push_back(std::move(i)); }
    const vector<LineItem>& items() const { return items_; }
    string country() const { return tax_.country(); }
    long long subtotal() const {
        long long sum = 0;
        for (const LineItem& i : items_) sum += i.amount();
        return sum;
    }
    long long taxAmount() const { return tax_.taxOn(subtotal()); }
    long long total() const { return subtotal() + taxAmount(); }
};

class InvoicePrinter {   // design team owns layout
public:
    string render(const Invoice& inv) const {
        string out = "INVOICE [" + inv.country() + "]\\n";
        for (const LineItem& i : inv.items()) {
            char line[96];
            snprintf(line, sizeof line, "%-8s x%d %10s\\n", i.name.c_str(), i.qty, money(i.amount()).c_str());
            out += line;
        }
        return out + "Tax: " + money(inv.taxAmount()) + "\\nTotal: " + money(inv.total());
    }
};

class InvoiceDemo {
public:
    static Invoice sample(const TaxPolicy& tax) {
        Invoice inv(tax);
        inv.add({"Pen", 2, 10000});
        inv.add({"Ink", 1, 5000});
        return inv;
    }
};

int main() {
    vector<unique_ptr<TaxPolicy>> all;
    all.push_back(make_unique<FlatRateTax>("IN", 1800));
    all.push_back(make_unique<FlatRateTax>("UK", 2000));
    all.push_back(make_unique<FlatRateTax>("US", 0));
    all.push_back(make_unique<FlatRateTax>("DE", 1900));
    all.push_back(make_unique<FlatRateTax>("SG", 900));
    TaxPolicies taxes(std::move(all));
    cout << InvoicePrinter().render(InvoiceDemo::sample(taxes.forCountry("DE"))) << "\\n";   // Tax 47.50, Total 297.50
    cout << "IN total " << money(InvoiceDemo::sample(taxes.forCountry("IN")).total()) << "\\n";   // 295.00
    try {
        taxes.forCountry("XX");
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";
    }
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

sealed class LineItem {
    public readonly string Name; public readonly int Qty; public readonly decimal UnitPrice;
    public LineItem(string name, int qty, decimal unitPrice) { Name = name; Qty = qty; UnitPrice = unitPrice; }
    public decimal Amount() { return UnitPrice * Qty; }
}

interface ITaxPolicy { string Country { get; } decimal TaxOn(decimal subtotal); }

sealed class FlatRateTax : ITaxPolicy {                         // data-driven policy
    private readonly string country; private readonly decimal rate;
    public FlatRateTax(string country, decimal rate) { this.country = country; this.rate = rate; }
    public string Country { get { return country; } }
    public decimal TaxOn(decimal sub) { return Math.Round(sub * rate, 2, MidpointRounding.AwayFromZero); }
}

class TaxPolicies {
    private readonly Dictionary<string, ITaxPolicy> byCountry = new Dictionary<string, ITaxPolicy>();
    public TaxPolicies(IEnumerable<ITaxPolicy> all) { foreach (ITaxPolicy p in all) byCountry[p.Country] = p; }
    public ITaxPolicy ForCountry(string c) {
        ITaxPolicy p;
        if (!byCountry.TryGetValue(c, out p)) throw new ArgumentException("no tax policy for " + c);
        return p;
    }
}

class Invoice {
    private readonly List<LineItem> items = new List<LineItem>();
    private readonly ITaxPolicy tax;
    public Invoice(ITaxPolicy tax) { this.tax = tax; }
    public void Add(LineItem i) { items.Add(i); }
    public List<LineItem> Items() { return new List<LineItem>(items); }
    public string Country { get { return tax.Country; } }
    public decimal Subtotal() { return items.Sum(i => i.Amount()); }
    public decimal TaxAmount() { return tax.TaxOn(Subtotal()); }
    public decimal Total() { return Math.Round(Subtotal() + TaxAmount(), 2, MidpointRounding.AwayFromZero); }
}

class InvoicePrinter {                                        // design team owns layout
    public string Render(Invoice inv) {
        StringBuilder sb = new StringBuilder("INVOICE [" + inv.Country + "]\\n");
        foreach (LineItem i in inv.Items()) sb.Append(string.Format("{0,-8} x{1} {2,10}", i.Name, i.Qty, i.Amount().ToString("F2"))).Append('\\n');
        return sb.Append("Tax: ").Append(inv.TaxAmount().ToString("F2")).Append("\\nTotal: ").Append(inv.Total().ToString("F2")).ToString();
    }
}

class Program {
    static Invoice Sample(ITaxPolicy tax) {
        Invoice inv = new Invoice(tax);
        inv.Add(new LineItem("Pen", 2, 100.00m));
        inv.Add(new LineItem("Ink", 1, 50.00m));
        return inv;
    }

    static void Main() {
        TaxPolicies taxes = new TaxPolicies(new ITaxPolicy[] {
                new FlatRateTax("IN", 0.18m), new FlatRateTax("UK", 0.20m),
                new FlatRateTax("US", 0m), new FlatRateTax("DE", 0.19m),
                new FlatRateTax("SG", 0.09m) });
        Console.WriteLine(new InvoicePrinter().Render(Sample(taxes.ForCountry("DE"))));   // Tax 47.50, Total 297.50
        Console.WriteLine("IN total " + Sample(taxes.ForCountry("IN")).Total().ToString("F2"));   // 295.00
        try { taxes.ForCountry("XX"); } catch (ArgumentException e) { Console.WriteLine(e.Message); }
    }
}` }
        ],
      complexity: `<p>O(items) per total. New country: one registry entry (or one class for complex rules like US state taxes). New layout: one printer class.</p>`,
      followUps: ['US sales tax depends on state and product category — how does TaxPolicy\'s signature need to evolve (pass the Invoice or a TaxContext)?', 'Should Invoice store the computed tax at issue time? (hint: legal immutability of issued invoices)']
    }
  });

  practice.push({
    title: 'A logger with if-chains for levels and destinations',
    level: 'Medium', tags: ['OCP', 'SRP', 'DIP', 'logging'], companies: ['Atlassian', 'Datadog', 'Oracle'],
    statement: `<p>A home-grown <code>Logger.log(level, msg)</code> checks a string config <code>"console"</code>/<code>"file"</code> with if/else, filters levels with string comparisons, and formats lines itself. Teams want JSON output, a Kafka destination and multiple destinations at once. <b>Identify the violations</b> and design a small logging library where formats and destinations plug in, the minimum level is configurable, and tests can capture output.</p>`,
    constraints: `<p>Levels DEBUG &lt; INFO &lt; WARN &lt; ERROR. One failing destination must not stop others. Keep it single-threaded for this exercise.</p>`,
    example: `<p>Min level INFO, appenders [console(text), memory(json)]. <code>debug("x")</code> → nothing. <code>warn("disk 91%")</code> → console: <code>WARN disk 91%</code>; memory: <code>{"level":"WARN","msg":"disk 91%"}</code>.</p>`,
    brute: {
      why: `<p><b>OCP:</b> every destination or format edits <code>log()</code>. <b>SRP:</b> filtering, formatting and writing are mixed. <b>DIP:</b> the logger creates file writers itself, so tests must read files from disk. String levels also allow typos ("WARNING") that silently never log.</p>`,
      code: { lang: 'java', code: `class Logger {
    private final String destination;   // "console" or "file"
    private final String minLevel;
    Logger(String destination, String minLevel) { this.destination = destination; this.minLevel = minLevel; }

    void log(String level, String msg) throws IOException {
        List<String> order = List.of("DEBUG", "INFO", "WARN", "ERROR");
        if (order.indexOf(level) < order.indexOf(minLevel)) return;
        String line = java.time.LocalTime.now() + " " + level + " " + msg;
        if (destination.equals("console")) System.out.println(line);
        else if (destination.equals("file")) {
            try (FileWriter w = new FileWriter("app.log", true)) { w.write(line + "\\n"); }
        }
    }
}`, alt: [
              { lang: 'python', code: `
import datetime

class Logger:
    def __init__(self, destination, min_level):
        self._destination = destination    # "console" or "file"
        self._min_level = min_level

    def log(self, level, msg):
        order = ["DEBUG", "INFO", "WARN", "ERROR"]
        if order.index(level) < order.index(self._min_level): return
        line = str(datetime.datetime.now().time()) + " " + level + " " + msg
        if self._destination == "console": print(line)
        elif self._destination == "file":
            with open("app.log", "a") as w: w.write(line + "\\n")` },
              { lang: 'ts', code: `
import { appendFileSync } from "fs";

class Logger {
    constructor(private readonly destination: string, private readonly minLevel: string) {}   // "console" or "file"

    log(level: string, msg: string): void {
        const order = ["DEBUG", "INFO", "WARN", "ERROR"];
        if (order.indexOf(level) < order.indexOf(this.minLevel)) return;
        const line = new Date().toISOString() + " " + level + " " + msg;
        if (this.destination === "console") console.log(line);
        else if (this.destination === "file") {
            appendFileSync("app.log", line + "\\n");
        }
    }
}` },
              { lang: 'cpp', code: `
class Logger {
    string destination;   // "console" or "file"
    string minLevel;
public:
    Logger(string destination, string minLevel) : destination(destination), minLevel(minLevel) {}

    void log(const string& level, const string& msg) {
        vector<string> order = {"DEBUG", "INFO", "WARN", "ERROR"};
        auto idx = [&](const string& s) { return find(order.begin(), order.end(), s) - order.begin(); };
        if (idx(level) < idx(minLevel)) return;
        string line = to_string(time(nullptr)) + " " + level + " " + msg;
        if (destination == "console") cout << line << "\\n";
        else if (destination == "file") {
            ofstream("app.log", ios::app) << line << "\\n";
        }
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.IO;

class Logger {
    private readonly string destination;   // "console" or "file"
    private readonly string minLevel;
    public Logger(string destination, string minLevel) { this.destination = destination; this.minLevel = minLevel; }

    public void Log(string level, string msg) {
        List<string> order = new List<string> { "DEBUG", "INFO", "WARN", "ERROR" };
        if (order.IndexOf(level) < order.IndexOf(minLevel)) return;
        string line = DateTime.Now.ToString("HH:mm:ss.fff") + " " + level + " " + msg;
        if (destination == "console") Console.WriteLine(line);
        else if (destination == "file") File.AppendAllText("app.log", line + "\\n");
    }
}` }
            ] }
    },
    mcq: { q: 'Which split mirrors real logging frameworks (Logback/Log4j)?', options: ['Logger (level filter) → Appender (destination) → Layout (format)', 'One Logger subclass per destination', 'A static LogUtils class', 'Separate loggers per level'], answer: 0, explain: 'Frameworks separate what/whether to log, where it goes and how it looks — each an independent axis of change.' },
    hints: [
      `<p>Three axes of change: which messages pass (level), how a line looks (format), where it goes (destination). Each becomes an abstraction.</p>`,
      `<p><code>enum Level</code>; <code>interface LogFormat { String format(Level l, String msg); }</code>; <code>interface Appender { void append(String line); }</code>; Logger takes a list of (format, appender) pairs.</p>`,
      `<p>Wrap each append in try/catch so one broken destination does not stop others. A <code>MemoryAppender</code> collecting lines makes testing trivial.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "WARN disk 91%\nappender failed: disk full\nERROR said \"no\"\nappender failed: disk full\nERROR path C:\\tmp\nappender failed: disk full\n{\"level\":\"WARN\",\"msg\":\"disk 91%\"}\n{\"level\":\"ERROR\",\"msg\":\"said \\\"no\\\"\"}\n{\"level\":\"ERROR\",\"msg\":\"path C:\\\\tmp\"}\n" }] },
      solution: {
      approach: `<p><b>Separate filter, format and destination; inject them.</b> <code>Level</code> is an enum (typos become compile errors). <code>LogFormat</code> and <code>Appender</code> are tiny interfaces; a <code>Sink</code> pairs them so each destination can have its own format. <code>Logger</code> filters by level and fans out to sinks, isolating failures. JSON or Kafka support = new classes only; tests use <code>MemoryAppender</code>.</p>`,
      code: `enum Level { DEBUG, INFO, WARN, ERROR }

interface LogFormat { String format(Level level, String msg); }
interface Appender { void append(String line); }
record Sink(LogFormat format, Appender appender) {}

class TextFormat implements LogFormat { public String format(Level l, String m) { return l + " " + m; } }
class JsonFormat implements LogFormat {
    public String format(Level l, String m) {
        String escaped = m.replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\"");   // minimal escaping; real libraries use a JSON encoder
        return "{\\"level\\":\\"" + l + "\\",\\"msg\\":\\"" + escaped + "\\"}";
    }
}
class ConsoleAppender implements Appender { public void append(String line) { System.out.println(line); } }
class MemoryAppender implements Appender {
    final List<String> lines = new ArrayList<>();
    public void append(String line) { lines.add(line); }
}
class BrokenAppender implements Appender { public void append(String line) { throw new IllegalStateException("disk full"); } }

class Logger {
    private final Level min;
    private final List<Sink> sinks;
    Logger(Level min, List<Sink> sinks) { this.min = min; this.sinks = List.copyOf(sinks); }

    void log(Level level, String msg) {
        if (level.compareTo(min) < 0) return;
        for (Sink s : sinks) {
            try { s.appender().append(s.format().format(level, msg)); }
            catch (RuntimeException e) { System.out.println("appender failed: " + e.getMessage()); }   // isolate failures
        }
    }
    void debug(String m) { log(Level.DEBUG, m); }
    void warn(String m) { log(Level.WARN, m); }

    public static void main(String[] args) {
        MemoryAppender mem = new MemoryAppender();
        Logger log = new Logger(Level.INFO, List.of(
                new Sink(new TextFormat(), new ConsoleAppender()),
                new Sink(new JsonFormat(), new BrokenAppender()),
                new Sink(new JsonFormat(), mem)));
        log.debug("ignored");
        log.warn("disk 91%");
        log.log(Level.ERROR, "said \\"no\\"");
        log.log(Level.ERROR, "path C:\\\\tmp");
        mem.lines.forEach(System.out::println);   // the memory appender still got every line
    }
}`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import IntEnum


class Level(IntEnum):
    DEBUG = 0
    INFO = 1
    WARN = 2
    ERROR = 3


class LogFormat(ABC):
    @abstractmethod
    def format(self, level: Level, msg: str) -> str: ...


class Appender(ABC):
    @abstractmethod
    def append(self, line: str) -> None: ...


@dataclass(frozen=True)
class Sink:
    format: LogFormat
    appender: Appender


class TextFormat(LogFormat):
    def format(self, level: Level, msg: str) -> str:
        return f"{level.name} {msg}"


class JsonFormat(LogFormat):
    def format(self, level: Level, msg: str) -> str:
        escaped = msg.replace("\\\\", "\\\\\\\\").replace('"', '\\\\"')  # minimal escaping; real libraries use a JSON encoder
        return f'{{"level":"{level.name}","msg":"{escaped}"}}'


class ConsoleAppender(Appender):
    def append(self, line: str) -> None:
        print(line)


class MemoryAppender(Appender):
    def __init__(self) -> None:
        self.lines: list[str] = []

    def append(self, line: str) -> None:
        self.lines.append(line)


class BrokenAppender(Appender):
    def append(self, line: str) -> None:
        raise RuntimeError("disk full")


class Logger:
    def __init__(self, minimum: Level, sinks: list[Sink]) -> None:
        self._min = minimum
        self._sinks = list(sinks)

    def log(self, level: Level, msg: str) -> None:
        if level < self._min:
            return
        for s in self._sinks:
            try:
                s.appender.append(s.format.format(level, msg))
            except RuntimeError as e:  # isolate failures
                print(f"appender failed: {e}")

    def debug(self, m: str) -> None:
        self.log(Level.DEBUG, m)

    def warn(self, m: str) -> None:
        self.log(Level.WARN, m)

    @staticmethod
    def main() -> None:
        mem = MemoryAppender()
        log = Logger(Level.INFO, [
            Sink(TextFormat(), ConsoleAppender()),
            Sink(JsonFormat(), BrokenAppender()),
            Sink(JsonFormat(), mem),
        ])
        log.debug("ignored")
        log.warn("disk 91%")
        log.log(Level.ERROR, 'said "no"')
        log.log(Level.ERROR, "path C:\\\\tmp")
        for line in mem.lines:  # the memory appender still got every line
            print(line)


if __name__ == "__main__":
    Logger.main()` },
          { lang: 'ts', code: `enum Level { DEBUG, INFO, WARN, ERROR }

interface LogFormat { format(level: Level, msg: string): string; }
interface Appender { append(line: string): void; }
interface Sink { readonly format: LogFormat; readonly appender: Appender; }

class TextFormat implements LogFormat {
  format(level: Level, msg: string): string { return \`\${Level[level]} \${msg}\`; }
}
class JsonFormat implements LogFormat {
  format(level: Level, msg: string): string {
    const escaped = msg.replaceAll("\\\\", "\\\\\\\\").replaceAll('"', '\\\\"'); // minimal escaping; real libraries use a JSON encoder
    return \`{"level":"\${Level[level]}","msg":"\${escaped}"}\`;
  }
}
class ConsoleAppender implements Appender {
  append(line: string): void { console.log(line); }
}
class MemoryAppender implements Appender {
  readonly lines: string[] = [];
  append(line: string): void { this.lines.push(line); }
}
class BrokenAppender implements Appender {
  append(_line: string): void { throw new Error("disk full"); }
}

class Logger {
  private readonly sinks: readonly Sink[];

  constructor(private readonly min: Level, sinks: Sink[]) { this.sinks = [...sinks]; }

  log(level: Level, msg: string): void {
    if (level < this.min) return;
    for (const s of this.sinks) {
      try {
        s.appender.append(s.format.format(level, msg));
      } catch (e) { // isolate failures
        console.log(\`appender failed: \${(e as Error).message}\`);
      }
    }
  }
  debug(m: string): void { this.log(Level.DEBUG, m); }
  warn(m: string): void { this.log(Level.WARN, m); }

  static main(): void {
    const mem = new MemoryAppender();
    const log = new Logger(Level.INFO, [
      { format: new TextFormat(), appender: new ConsoleAppender() },
      { format: new JsonFormat(), appender: new BrokenAppender() },
      { format: new JsonFormat(), appender: mem },
    ]);
    log.debug("ignored");
    log.warn("disk 91%");
    log.log(Level.ERROR, 'said "no"');
    log.log(Level.ERROR, "path C:\\\\tmp");
    mem.lines.forEach((line) => console.log(line)); // the memory appender still got every line
  }
}
Logger.main();` },
          { lang: 'cpp', code: `enum class Level { Debug, Info, Warn, Error };

static const char* levelName(Level l) {
    switch (l) {
        case Level::Debug: return "DEBUG";
        case Level::Info: return "INFO";
        case Level::Warn: return "WARN";
        case Level::Error: return "ERROR";
    }
    return "?";
}

class LogFormat {
public:
    virtual ~LogFormat() = default;
    virtual string format(Level level, const string& msg) const = 0;
};
class Appender {
public:
    virtual ~Appender() = default;
    virtual void append(const string& line) = 0;
};
struct Sink {
    shared_ptr<LogFormat> format;
    shared_ptr<Appender> appender;
};

class TextFormat : public LogFormat {
public:
    string format(Level l, const string& m) const override { return string(levelName(l)) + " " + m; }
};
class JsonFormat : public LogFormat {
public:
    string format(Level l, const string& m) const override {
        string escaped;
        for (char c : m) {
            if (c == '"' || c == '\\\\') escaped += '\\\\';   // minimal escaping; real libraries use a JSON encoder
            escaped += c;
        }
        return string("{\\"level\\":\\"") + levelName(l) + "\\",\\"msg\\":\\"" + escaped + "\\"}";
    }
};
class ConsoleAppender : public Appender {
public:
    void append(const string& line) override { cout << line << "\\n"; }
};
class MemoryAppender : public Appender {
public:
    vector<string> lines;
    void append(const string& line) override { lines.push_back(line); }
};
class BrokenAppender : public Appender {
public:
    void append(const string&) override { throw runtime_error("disk full"); }
};

class Logger {
    Level min_;
    vector<Sink> sinks_;
public:
    Logger(Level min, vector<Sink> sinks) : min_(min), sinks_(std::move(sinks)) {}

    void log(Level level, const string& msg) {
        if (level < min_) return;
        for (const Sink& s : sinks_) {
            try {
                s.appender->append(s.format->format(level, msg));
            } catch (const runtime_error& e) {   // isolate failures
                cout << "appender failed: " << e.what() << "\\n";
            }
        }
    }
    void debug(const string& m) { log(Level::Debug, m); }
    void warn(const string& m) { log(Level::Warn, m); }
};

int main() {
    auto mem = make_shared<MemoryAppender>();
    Logger log(Level::Info, {
        {make_shared<TextFormat>(), make_shared<ConsoleAppender>()},
        {make_shared<JsonFormat>(), make_shared<BrokenAppender>()},
        {make_shared<JsonFormat>(), mem}});
    log.debug("ignored");
    log.warn("disk 91%");
    log.log(Level::Error, "said \\"no\\"");
    log.log(Level::Error, "path C:\\\\tmp");
    for (const string& line : mem->lines) cout << line << "\\n";   // the memory appender still got every line
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

enum Level { DEBUG, INFO, WARN, ERROR }

interface ILogFormat { string Format(Level level, string msg); }
interface IAppender { void Append(string line); }
sealed class Sink {
    public readonly ILogFormat Format; public readonly IAppender Appender;
    public Sink(ILogFormat format, IAppender appender) { Format = format; Appender = appender; }
}

class TextFormat : ILogFormat { public string Format(Level l, string m) { return l + " " + m; } }
class JsonFormat : ILogFormat {
    public string Format(Level l, string m) {
        string escaped = m.Replace("\\\\", "\\\\\\\\").Replace("\\"", "\\\\\\"");   // minimal escaping; real libraries use a JSON encoder
        return "{\\"level\\":\\"" + l + "\\",\\"msg\\":\\"" + escaped + "\\"}";
    }
}
class ConsoleAppender : IAppender { public void Append(string line) { Console.WriteLine(line); } }
class MemoryAppender : IAppender {
    public readonly List<string> Lines = new List<string>();
    public void Append(string line) { Lines.Add(line); }
}
class BrokenAppender : IAppender { public void Append(string line) { throw new InvalidOperationException("disk full"); } }

class Logger {
    private readonly Level min;
    private readonly List<Sink> sinks;
    public Logger(Level min, IEnumerable<Sink> sinks) { this.min = min; this.sinks = new List<Sink>(sinks); }

    public void Log(Level level, string msg) {
        if (level < min) return;
        foreach (Sink s in sinks) {
            try { s.Appender.Append(s.Format.Format(level, msg)); }
            catch (Exception e) { Console.WriteLine("appender failed: " + e.Message); }   // isolate failures
        }
    }
    public void Debug(string m) { Log(Level.DEBUG, m); }
    public void Warn(string m) { Log(Level.WARN, m); }
}

class Program {
    static void Main() {
        MemoryAppender mem = new MemoryAppender();
        Logger log = new Logger(Level.INFO, new[] {
                new Sink(new TextFormat(), new ConsoleAppender()),
                new Sink(new JsonFormat(), new BrokenAppender()),
                new Sink(new JsonFormat(), mem) });
        log.Debug("ignored");
        log.Warn("disk 91%");
        log.Log(Level.ERROR, "said \\"no\\"");
        log.Log(Level.ERROR, "path C:\\\\tmp");
        mem.Lines.ForEach(Console.WriteLine);   // the memory appender still got every line
    }
}` }
        ],
      complexity: `<p>O(sinks) per log call. New format or destination: 1 class, 0 edits. Tests read <code>MemoryAppender.lines</code> instead of files.</p>`,
      followUps: ['Make appenders asynchronous with a bounded queue — what happens when it is full (drop, block)?', 'Add per-package log levels (com.shop.payment=DEBUG): which class changes?', 'How does SLF4J use DIP so libraries do not depend on a specific logging backend?']
    }
  });

  /* ======================= PRACTICE: HARD ======================= */
  practice.push({
    title: 'Parking lot exit flow: refactor a God class',
    level: 'Hard', tags: ['SOLID', 'parking lot', 'machine coding'], companies: ['Amazon', 'Flipkart', 'Uber', 'Microsoft'],
    statement: `<p>A parking lot's <code>ParkingLot</code> class tracks free spots per vehicle type, issues tickets, computes fees with a <code>switch</code> on vehicle type, charges via <code>new CardTerminal()</code> or cash, reads the time with <code>System.currentTimeMillis()</code>, and prints a receipt. New requirements: EV spots with a charging fee, weekend pricing, UPI payments, and fast unit tests. <b>Write the findings (which principle, where) and implement a SOLID design</b> for park → exit → pay → receipt.</p>`,
    constraints: `<p>Vehicle types: BIKE, CAR, EV, TRUCK. Pricing: first hour flat, then per started hour (BIKE 10/5, CAR 30/20, TRUCK 60/40; EV = CAR rate + 15 per hour charging). Weekend: +25%. Lot full → reject park. Paying twice for one ticket → reject.</p>`,
    example: `<p>CAR parks Sat 10:00, exits 12:30 → hours = 3 (started hours) → 30 + 2×20 = 70 → weekend ×1.25 = ${H.c('g', '87.50')}. EV, Mon 09:00–10:00 → 30 + 15 = ${H.c('g', '45.00')}. Third car when 2 car spots exist → ${H.c('r', 'rejected: no spot')}.</p>`,
    brute: {
      why: `<p><b>S:</b> spots, tickets, pricing, payments and receipts in one class (5 actors). <b>O:</b> fee switch and payment if/else edited for EV/UPI/weekend. <b>D:</b> constructing a <code>CardTerminal</code> inside the method and reading the system clock directly make tests slow and time-dependent. <b>I/L</b> risks appear as soon as someone adds "refund" to a shared payment interface that cash cannot honour. Every new requirement edits the same method.</p>`,
      code: { lang: 'java', code: `class CardTerminal { boolean charge(double amt) { System.out.println("card charged " + amt); return true; } }

class ParkingLot {
    private final Map<String, Integer> free = new HashMap<>(Map.of("BIKE", 2, "CAR", 2, "TRUCK", 1));
    private final Map<String, String[]> tickets = new HashMap<>();   // plate -> {type, startMillis}

    String park(String type, String plate) {
        if (free.getOrDefault(type, 0) == 0) return "FULL";
        free.merge(type, -1, Integer::sum);
        tickets.put(plate, new String[]{type, String.valueOf(System.currentTimeMillis())});
        return "TICKET-" + plate;
    }

    double exit(String plate, String payBy) {
        String[] t = tickets.remove(plate);
        long hours = Math.max(1, (System.currentTimeMillis() - Long.parseLong(t[1]) + 3_599_999) / 3_600_000);
        double fee;
        switch (t[0]) {
            case "BIKE": fee = 10 + (hours - 1) * 5; break;
            case "CAR": fee = 30 + (hours - 1) * 20; break;
            case "TRUCK": fee = 60 + (hours - 1) * 40; break;
            default: throw new IllegalArgumentException(t[0]);
        }
        if (payBy.equals("CARD")) new CardTerminal().charge(fee);
        else if (payBy.equals("CASH")) System.out.println("collect cash " + fee);
        free.merge(t[0], 1, Integer::sum);
        System.out.println("RECEIPT " + plate + " " + hours + "h " + fee);
        return fee;
    }
}`, alt: [
              { lang: 'python', code: `
import time

class CardTerminal:
    def charge(self, amt): print("card charged", amt); return True

class ParkingLot:
    def __init__(self):
        self._free = {"BIKE": 2, "CAR": 2, "TRUCK": 1}
        self._tickets = {}                      # plate -> (type, start_millis)

    def park(self, type, plate):
        if self._free.get(type, 0) == 0: return "FULL"
        self._free[type] -= 1
        self._tickets[plate] = (type, int(time.time() * 1000))
        return "TICKET-" + plate

    def exit(self, plate, pay_by):
        typ, start = self._tickets.pop(plate)
        hours = max(1, (int(time.time() * 1000) - start + 3_599_999) // 3_600_000)
        if typ == "BIKE": fee = 10 + (hours - 1) * 5
        elif typ == "CAR": fee = 30 + (hours - 1) * 20
        elif typ == "TRUCK": fee = 60 + (hours - 1) * 40
        else: raise ValueError(typ)
        if pay_by == "CARD": CardTerminal().charge(fee)
        elif pay_by == "CASH": print("collect cash", fee)
        self._free[typ] += 1
        print("RECEIPT", plate, str(hours) + "h", fee)
        return fee` },
              { lang: 'ts', code: `
class CardTerminal { charge(amt: number): boolean { console.log("card charged " + amt); return true; } }

class ParkingLot {
    private free = new Map<string, number>([["BIKE", 2], ["CAR", 2], ["TRUCK", 1]]);
    private tickets = new Map<string, [string, number]>();   // plate -> [type, startMillis]

    park(type: string, plate: string): string {
        if ((this.free.get(type) ?? 0) === 0) return "FULL";
        this.free.set(type, this.free.get(type)! - 1);
        this.tickets.set(plate, [type, Date.now()]);
        return "TICKET-" + plate;
    }

    exit(plate: string, payBy: string): number {
        const [type, start] = this.tickets.get(plate)!;
        this.tickets.delete(plate);
        const hours = Math.max(1, Math.floor((Date.now() - start + 3_599_999) / 3_600_000));
        let fee: number;
        switch (type) {
            case "BIKE": fee = 10 + (hours - 1) * 5; break;
            case "CAR": fee = 30 + (hours - 1) * 20; break;
            case "TRUCK": fee = 60 + (hours - 1) * 40; break;
            default: throw new Error(type);
        }
        if (payBy === "CARD") new CardTerminal().charge(fee);
        else if (payBy === "CASH") console.log("collect cash " + fee);
        this.free.set(type, this.free.get(type)! + 1);
        console.log("RECEIPT " + plate + " " + hours + "h " + fee);
        return fee;
    }
}` },
              { lang: 'cpp', code: `
struct CardTerminal { bool charge(double amt) { cout << "card charged " << amt << "\\n"; return true; } };

class ParkingLot {
    unordered_map<string, int> free = {{"BIKE", 2}, {"CAR", 2}, {"TRUCK", 1}};
    unordered_map<string, pair<string, long long>> tickets;   // plate -> {type, startMillis}
    static long long nowMillis() { return chrono::duration_cast<chrono::milliseconds>(chrono::system_clock::now().time_since_epoch()).count(); }
public:
    string park(const string& type, const string& plate) {
        if (free[type] == 0) return "FULL";
        free[type]--;
        tickets[plate] = {type, nowMillis()};
        return "TICKET-" + plate;
    }

    double exit(const string& plate, const string& payBy) {
        auto t = tickets[plate]; tickets.erase(plate);
        long long hours = max(1LL, (nowMillis() - t.second + 3599999) / 3600000);
        double fee;
        if (t.first == "BIKE") fee = 10 + (hours - 1) * 5;
        else if (t.first == "CAR") fee = 30 + (hours - 1) * 20;
        else if (t.first == "TRUCK") fee = 60 + (hours - 1) * 40;
        else throw invalid_argument(t.first);
        if (payBy == "CARD") CardTerminal().charge(fee);
        else if (payBy == "CASH") cout << "collect cash " << fee << "\\n";
        free[t.first]++;
        cout << "RECEIPT " << plate << " " << hours << "h " << fee << "\\n";
        return fee;
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class CardTerminal { public bool Charge(double amt) { Console.WriteLine("card charged " + amt); return true; } }

class ParkingLot {
    private readonly Dictionary<string, int> free = new Dictionary<string, int> { { "BIKE", 2 }, { "CAR", 2 }, { "TRUCK", 1 } };
    private readonly Dictionary<string, string[]> tickets = new Dictionary<string, string[]>();   // plate -> {type, startMillis}

    public string Park(string type, string plate) {
        int n; free.TryGetValue(type, out n);
        if (n == 0) return "FULL";
        free[type] = n - 1;
        tickets[plate] = new[] { type, DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString() };
        return "TICKET-" + plate;
    }

    public double Exit(string plate, string payBy) {
        string[] t = tickets[plate]; tickets.Remove(plate);
        long hours = Math.Max(1, (DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() - long.Parse(t[1]) + 3599999) / 3600000);
        double fee;
        switch (t[0]) {
            case "BIKE": fee = 10 + (hours - 1) * 5; break;
            case "CAR": fee = 30 + (hours - 1) * 20; break;
            case "TRUCK": fee = 60 + (hours - 1) * 40; break;
            default: throw new ArgumentException(t[0]);
        }
        if (payBy == "CARD") new CardTerminal().Charge(fee);
        else if (payBy == "CASH") Console.WriteLine("collect cash " + fee);
        free[t[0]]++;
        Console.WriteLine("RECEIPT " + plate + " " + hours + "h " + fee);
        return fee;
    }
}` }
            ] }
    },
    mcq: { q: 'Weekend pricing (+25%) should be added how?', options: ['As a decorator/wrapper PricingPolicy around the base policy, using the injected Clock', 'As another case in the fee switch', 'Inside the payment classes', 'By subclassing ParkingLot as WeekendParkingLot'], answer: 0, explain: 'A <code>WeekendSurcharge implements PricingPolicy</code> wrapping the base policy adds behaviour without editing it (OCP), and reading time from the ticket/Clock keeps it testable (DIP).' },
    hints: [
      `<p>Write one line per responsibility: spot allocation, ticketing, pricing, payment, receipts, time. Each is a candidate class or port.</p>`,
      `<p>Ports: <code>PricingPolicy { double fee(Ticket t, Instant exit); }</code>, <code>PaymentMethod { String code(); boolean pay(double amt); }</code>, <code>Clock</code>. Classes: <code>SpotInventory</code>, <code>Ticket</code> record, <code>ParkingService</code> orchestrator, <code>ReceiptFormatter</code>.</p>`,
      `<p>Pricing: <code>BaseRates</code> (map type → first/next), <code>EvChargingFee</code> and <code>WeekendSurcharge</code> as decorators. Hours = ceil(minutes/60), min 1. Mark tickets paid to block double payment; free the spot only after successful payment.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "false\nRECEIPT MH12AB1234 CAR 87.50 via UPI\nblocked: unknown or already paid ticket\ntrue\nunsupported payment CRYPTO\nRECEIPT MH12EV0003 EV 45.00 via CASH\n" }] },
      solution: {
      approach: `<p><b>Findings → design.</b> SRP: <code>SpotInventory</code> (capacity), <code>ParkingService</code> (flow), <code>ReceiptFormatter</code> (text). OCP: pricing is a <code>PricingPolicy</code> chain — base rates, then EV charging and weekend decorators; payments are registered <code>PaymentMethod</code>s (UPI = new class). LSP: every payment method honours "returns false on decline" instead of throwing; every pricing decorator returns a fee ≥ the base. ISP: payment methods expose only <code>pay</code> — refunds would be a separate <code>Refundable</code> role. DIP: time via injected <code>Clock</code>, payments via interfaces, so the tests below run instantly at any simulated date.</p>`,
      code: `enum VehicleType { BIKE, CAR, EV, TRUCK }
record Ticket(String id, String plate, VehicleType type, Instant entry) {}

interface PricingPolicy { double fee(Ticket t, Instant exit); }
interface PaymentMethod { String code(); boolean pay(double amount); }

class BaseRates implements PricingPolicy {
    private final Map<VehicleType, double[]> rates = new EnumMap<>(Map.of(
            VehicleType.BIKE, new double[]{10, 5}, VehicleType.CAR, new double[]{30, 20},
            VehicleType.EV, new double[]{30, 20}, VehicleType.TRUCK, new double[]{60, 40}));
    static long hours(Ticket t, Instant exit) {
        long min = Math.max(1, Duration.between(t.entry(), exit).toMinutes());
        return (min + 59) / 60;                                    // started hours, at least 1
    }
    public double fee(Ticket t, Instant exit) {
        double[] r = rates.get(t.type());
        return r[0] + (hours(t, exit) - 1) * r[1];
    }
}
class EvChargingFee implements PricingPolicy {                     // decorator: adds, never removes
    private final PricingPolicy inner;
    EvChargingFee(PricingPolicy inner) { this.inner = inner; }
    public double fee(Ticket t, Instant exit) {
        double f = inner.fee(t, exit);
        return t.type() == VehicleType.EV ? f + 15 * BaseRates.hours(t, exit) : f;
    }
}
class WeekendSurcharge implements PricingPolicy {
    private final PricingPolicy inner; private final ZoneId zone;
    WeekendSurcharge(PricingPolicy inner, ZoneId zone) { this.inner = inner; this.zone = zone; }
    public double fee(Ticket t, Instant exit) {
        DayOfWeek d = t.entry().atZone(zone).getDayOfWeek();
        boolean weekend = d == DayOfWeek.SATURDAY || d == DayOfWeek.SUNDAY;
        return inner.fee(t, exit) * (weekend ? 1.25 : 1.0);
    }
}

class SpotInventory {
    private final Map<VehicleType, Integer> free;
    SpotInventory(Map<VehicleType, Integer> capacity) { free = new EnumMap<>(capacity); }
    boolean take(VehicleType t) { int n = free.getOrDefault(t, 0); if (n == 0) return false; free.put(t, n - 1); return true; }
    void release(VehicleType t) { free.merge(t, 1, Integer::sum); }
}

class ReceiptFormatter {
    String format(Ticket t, double fee, String method) { return String.format("RECEIPT %s %s %.2f via %s", t.plate(), t.type(), fee, method); }
}

class ParkingService {
    private final SpotInventory spots; private final PricingPolicy pricing; private final Clock clock;
    private final Map<String, PaymentMethod> methods = new HashMap<>();
    private final Map<String, Ticket> open = new HashMap<>();
    private final ReceiptFormatter receipts = new ReceiptFormatter();
    private int seq = 0;

    ParkingService(SpotInventory spots, PricingPolicy pricing, List<PaymentMethod> ms, Clock clock) {
        this.spots = spots; this.pricing = pricing; this.clock = clock;
        ms.forEach(m -> methods.put(m.code(), m));
    }

    Optional<Ticket> park(String plate, VehicleType type) {
        if (!spots.take(type)) return Optional.empty();
        Ticket t = new Ticket("T" + (++seq), plate, type, clock.instant());
        open.put(t.id(), t);
        return Optional.of(t);
    }

    String exit(String ticketId, String methodCode) {
        Ticket t = open.get(ticketId);
        if (t == null) throw new IllegalStateException("unknown or already paid ticket");
        PaymentMethod m = methods.get(methodCode);
        if (m == null) throw new IllegalArgumentException("unsupported payment " + methodCode);
        double fee = Math.round(pricing.fee(t, clock.instant()) * 100) / 100.0;
        if (!m.pay(fee)) return "DECLINED";                      // ticket stays open, spot stays taken
        open.remove(ticketId);
        spots.release(t.type());
        return receipts.format(t, fee, m.code());
    }
}

// adapters + fakes
class CashPayment implements PaymentMethod { public String code() { return "CASH"; } public boolean pay(double a) { return true; } }
class UpiPayment implements PaymentMethod { public String code() { return "UPI"; } public boolean pay(double a) { return a < 100_000; } }

class MutableClock extends Clock {                                    // test clock we can move forward
    private Instant now; private final ZoneId zone;
    MutableClock(Instant start, ZoneId zone) { now = start; this.zone = zone; }
    void advance(Duration d) { now = now.plus(d); }
    public ZoneId getZone() { return zone; }
    public Clock withZone(ZoneId z) { return new MutableClock(now, z); }
    public Instant instant() { return now; }
}

class ParkingDemo {
    public static void main(String[] args) {
        ZoneId ist = ZoneId.of("Asia/Kolkata");
        MutableClock clock = new MutableClock(LocalDateTime.of(2026, 3, 7, 10, 0).atZone(ist).toInstant(), ist);   // Saturday
        PricingPolicy pricing = new WeekendSurcharge(new EvChargingFee(new BaseRates()), ist);
        ParkingService svc = new ParkingService(new SpotInventory(Map.of(VehicleType.CAR, 2, VehicleType.EV, 1)),
                pricing, List.of(new CashPayment(), new UpiPayment()), clock);

        Ticket car = svc.park("MH12AB1234", VehicleType.CAR).orElseThrow();
        Ticket second = svc.park("MH12CD0001", VehicleType.CAR).orElseThrow();
        System.out.println(svc.park("MH12EF0002", VehicleType.CAR).isPresent());   // false: full
        clock.advance(Duration.ofMinutes(150));
        System.out.println(svc.exit(car.id(), "UPI"));                            // 87.50 (3h, weekend)
        try { svc.exit(car.id(), "UPI"); } catch (IllegalStateException e) { System.out.println("blocked: " + e.getMessage()); }
        System.out.println(svc.park("MH12EF0002", VehicleType.CAR).isPresent());   // true: the exit freed a spot
        try { svc.exit(second.id(), "CRYPTO"); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }

        clock.advance(Duration.ofMinutes(2670));                                  // Sat 12:30 -> Mon 09:00
        Ticket ev = svc.park("MH12EV0003", VehicleType.EV).orElseThrow();
        clock.advance(Duration.ofMinutes(60));
        System.out.println(svc.exit(ev.id(), "CASH"));                            // 45.00: no weekend surcharge, EV charging added
    }
}`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Optional


class VehicleType(Enum):
    BIKE = "BIKE"
    CAR = "CAR"
    EV = "EV"
    TRUCK = "TRUCK"


@dataclass(frozen=True)
class Ticket:
    id: str
    plate: str
    type: VehicleType
    entry: datetime


class Clock(ABC):
    @abstractmethod
    def instant(self) -> datetime: ...


class PricingPolicy(ABC):
    @abstractmethod
    def fee(self, t: Ticket, exit_time: datetime) -> float: ...


class PaymentMethod(ABC):
    @property
    @abstractmethod
    def code(self) -> str: ...

    @abstractmethod
    def pay(self, amount: float) -> bool: ...


def started_hours(t: Ticket, exit_time: datetime) -> int:
    minutes = max(1, int((exit_time - t.entry).total_seconds() // 60))
    return (minutes + 59) // 60  # started hours, at least 1


class BaseRates(PricingPolicy):
    _RATES = {
        VehicleType.BIKE: (10, 5), VehicleType.CAR: (30, 20),
        VehicleType.EV: (30, 20), VehicleType.TRUCK: (60, 40),
    }

    def fee(self, t: Ticket, exit_time: datetime) -> float:
        first, extra = self._RATES[t.type]
        return first + (started_hours(t, exit_time) - 1) * extra


class EvChargingFee(PricingPolicy):  # decorator: adds, never removes
    def __init__(self, inner: PricingPolicy) -> None:
        self._inner = inner

    def fee(self, t: Ticket, exit_time: datetime) -> float:
        f = self._inner.fee(t, exit_time)
        return f + 15 * started_hours(t, exit_time) if t.type is VehicleType.EV else f


class WeekendSurcharge(PricingPolicy):
    def __init__(self, inner: PricingPolicy, zone: timezone) -> None:
        self._inner = inner
        self._zone = zone

    def fee(self, t: Ticket, exit_time: datetime) -> float:
        weekend = t.entry.astimezone(self._zone).weekday() >= 5  # Saturday or Sunday
        return self._inner.fee(t, exit_time) * (1.25 if weekend else 1.0)


class SpotInventory:
    def __init__(self, capacity: dict[VehicleType, int]) -> None:
        self._free = dict(capacity)

    def take(self, t: VehicleType) -> bool:
        n = self._free.get(t, 0)
        if n == 0:
            return False
        self._free[t] = n - 1
        return True

    def release(self, t: VehicleType) -> None:
        self._free[t] = self._free.get(t, 0) + 1


class ReceiptFormatter:
    def format(self, t: Ticket, fee: float, method: str) -> str:
        return f"RECEIPT {t.plate} {t.type.value} {fee:.2f} via {method}"


class ParkingService:
    def __init__(self, spots: SpotInventory, pricing: PricingPolicy,
                 methods: list[PaymentMethod], clock: Clock) -> None:
        self._spots = spots
        self._pricing = pricing
        self._clock = clock
        self._methods = {m.code: m for m in methods}
        self._open: dict[str, Ticket] = {}
        self._receipts = ReceiptFormatter()
        self._seq = 0

    def park(self, plate: str, type: VehicleType) -> Optional[Ticket]:
        if not self._spots.take(type):
            return None
        self._seq += 1
        t = Ticket(f"T{self._seq}", plate, type, self._clock.instant())
        self._open[t.id] = t
        return t

    def exit(self, ticket_id: str, method_code: str) -> str:
        t = self._open.get(ticket_id)
        if t is None:
            raise RuntimeError("unknown or already paid ticket")
        m = self._methods.get(method_code)
        if m is None:
            raise ValueError(f"unsupported payment {method_code}")
        fee = int(self._pricing.fee(t, self._clock.instant()) * 100 + 0.5) / 100
        if not m.pay(fee):
            return "DECLINED"  # ticket stays open, spot stays taken
        del self._open[ticket_id]
        self._spots.release(t.type)
        return self._receipts.format(t, fee, m.code)


# adapters + fakes
class CashPayment(PaymentMethod):
    code = "CASH"

    def pay(self, amount: float) -> bool:
        return True


class UpiPayment(PaymentMethod):
    code = "UPI"

    def pay(self, amount: float) -> bool:
        return amount < 100_000


class MutableClock(Clock):  # test clock we can move forward
    def __init__(self, start: datetime) -> None:
        self._now = start

    def advance(self, d: timedelta) -> None:
        self._now += d

    def instant(self) -> datetime:
        return self._now


class ParkingDemo:
    @staticmethod
    def main() -> None:
        ist = timezone(timedelta(hours=5, minutes=30))
        clock = MutableClock(datetime(2026, 3, 7, 10, 0, tzinfo=ist))  # Saturday
        pricing = WeekendSurcharge(EvChargingFee(BaseRates()), ist)
        svc = ParkingService(SpotInventory({VehicleType.CAR: 2, VehicleType.EV: 1}),
                             pricing, [CashPayment(), UpiPayment()], clock)

        car = svc.park("MH12AB1234", VehicleType.CAR)
        second = svc.park("MH12CD0001", VehicleType.CAR)
        assert car is not None and second is not None
        print(str(svc.park("MH12EF0002", VehicleType.CAR) is not None).lower())  # false: full
        clock.advance(timedelta(minutes=150))
        print(svc.exit(car.id, "UPI"))  # 87.50 (3h, weekend)
        try:
            svc.exit(car.id, "UPI")
        except RuntimeError as e:
            print(f"blocked: {e}")
        print(str(svc.park("MH12EF0002", VehicleType.CAR) is not None).lower())  # true: the exit freed a spot
        try:
            svc.exit(second.id, "CRYPTO")
        except ValueError as e:
            print(e)

        clock.advance(timedelta(minutes=2670))  # Sat 12:30 -> Mon 09:00
        ev = svc.park("MH12EV0003", VehicleType.EV)
        assert ev is not None
        clock.advance(timedelta(minutes=60))
        print(svc.exit(ev.id, "CASH"))  # 45.00: no weekend surcharge, EV charging added


if __name__ == "__main__":
    ParkingDemo.main()` },
          { lang: 'ts', code: `type VehicleType = "BIKE" | "CAR" | "EV" | "TRUCK";

interface Ticket {
  readonly id: string;
  readonly plate: string;
  readonly type: VehicleType;
  readonly entry: number; // epoch milliseconds
}

interface Clock { instant(): number; }
interface PricingPolicy { fee(t: Ticket, exit: number): number; }
interface PaymentMethod { readonly code: string; pay(amount: number): boolean; }

const MINUTE = 60_000;
const IST_OFFSET = 330 * MINUTE; // UTC+05:30

function startedHours(t: Ticket, exit: number): number {
  const minutes = Math.max(1, Math.floor((exit - t.entry) / MINUTE));
  return Math.floor((minutes + 59) / 60); // started hours, at least 1
}

class BaseRates implements PricingPolicy {
  private readonly rates: Record<VehicleType, [number, number]> = {
    BIKE: [10, 5], CAR: [30, 20], EV: [30, 20], TRUCK: [60, 40],
  };
  fee(t: Ticket, exit: number): number {
    const [first, extra] = this.rates[t.type];
    return first + (startedHours(t, exit) - 1) * extra;
  }
}
class EvChargingFee implements PricingPolicy { // decorator: adds, never removes
  constructor(private readonly inner: PricingPolicy) {}
  fee(t: Ticket, exit: number): number {
    const f = this.inner.fee(t, exit);
    return t.type === "EV" ? f + 15 * startedHours(t, exit) : f;
  }
}
class WeekendSurcharge implements PricingPolicy {
  constructor(private readonly inner: PricingPolicy, private readonly offsetMs: number) {}
  fee(t: Ticket, exit: number): number {
    const day = new Date(t.entry + this.offsetMs).getUTCDay(); // 0 = Sunday, 6 = Saturday
    return this.inner.fee(t, exit) * (day === 0 || day === 6 ? 1.25 : 1.0);
  }
}

class SpotInventory {
  private readonly free = new Map<VehicleType, number>();
  constructor(capacity: Partial<Record<VehicleType, number>>) {
    for (const [t, n] of Object.entries(capacity)) this.free.set(t as VehicleType, n);
  }
  take(t: VehicleType): boolean {
    const n = this.free.get(t) ?? 0;
    if (n === 0) return false;
    this.free.set(t, n - 1);
    return true;
  }
  release(t: VehicleType): void { this.free.set(t, (this.free.get(t) ?? 0) + 1); }
}

class ReceiptFormatter {
  format(t: Ticket, fee: number, method: string): string {
    return \`RECEIPT \${t.plate} \${t.type} \${fee.toFixed(2)} via \${method}\`;
  }
}

class ParkingService {
  private readonly methods = new Map<string, PaymentMethod>();
  private readonly open = new Map<string, Ticket>();
  private readonly receipts = new ReceiptFormatter();
  private seq = 0;

  constructor(
    private readonly spots: SpotInventory,
    private readonly pricing: PricingPolicy,
    methods: PaymentMethod[],
    private readonly clock: Clock,
  ) {
    for (const m of methods) this.methods.set(m.code, m);
  }

  park(plate: string, type: VehicleType): Ticket | undefined {
    if (!this.spots.take(type)) return undefined;
    const t: Ticket = { id: \`T\${++this.seq}\`, plate, type, entry: this.clock.instant() };
    this.open.set(t.id, t);
    return t;
  }

  exit(ticketId: string, methodCode: string): string {
    const t = this.open.get(ticketId);
    if (t === undefined) throw new Error("unknown or already paid ticket");
    const m = this.methods.get(methodCode);
    if (m === undefined) throw new Error(\`unsupported payment \${methodCode}\`);
    const fee = Math.round(this.pricing.fee(t, this.clock.instant()) * 100) / 100;
    if (!m.pay(fee)) return "DECLINED"; // ticket stays open, spot stays taken
    this.open.delete(ticketId);
    this.spots.release(t.type);
    return this.receipts.format(t, fee, m.code);
  }
}

// adapters + fakes
class CashPayment implements PaymentMethod {
  readonly code = "CASH";
  pay(_amount: number): boolean { return true; }
}
class UpiPayment implements PaymentMethod {
  readonly code = "UPI";
  pay(amount: number): boolean { return amount < 100_000; }
}

class MutableClock implements Clock { // test clock we can move forward
  constructor(private now: number) {}
  advance(minutes: number): void { this.now += minutes * MINUTE; }
  instant(): number { return this.now; }
}

class ParkingDemo {
  static main(): void {
    const clock = new MutableClock(Date.UTC(2026, 2, 7, 10, 0) - IST_OFFSET); // Saturday 10:00 IST
    const pricing = new WeekendSurcharge(new EvChargingFee(new BaseRates()), IST_OFFSET);
    const svc = new ParkingService(new SpotInventory({ CAR: 2, EV: 1 }), pricing, [new CashPayment(), new UpiPayment()], clock);

    const car = svc.park("MH12AB1234", "CAR");
    const second = svc.park("MH12CD0001", "CAR");
    if (car === undefined || second === undefined) throw new Error("expected two spots");
    console.log(svc.park("MH12EF0002", "CAR") !== undefined); // false: full
    clock.advance(150);
    console.log(svc.exit(car.id, "UPI")); // 87.50 (3h, weekend)
    try {
      svc.exit(car.id, "UPI");
    } catch (e) {
      console.log("blocked: " + (e as Error).message);
    }
    console.log(svc.park("MH12EF0002", "CAR") !== undefined); // true: the exit freed a spot
    try {
      svc.exit(second.id, "CRYPTO");
    } catch (e) {
      console.log((e as Error).message);
    }

    clock.advance(2670); // Sat 12:30 -> Mon 09:00
    const ev = svc.park("MH12EV0003", "EV");
    if (ev === undefined) throw new Error("expected an EV spot");
    clock.advance(60);
    console.log(svc.exit(ev.id, "CASH")); // 45.00: no weekend surcharge, EV charging added
  }
}
ParkingDemo.main();` },
          { lang: 'cpp', code: `using Instant = chrono::sys_seconds;

enum class VehicleType { Bike, Car, Ev, Truck };

static const char* typeName(VehicleType t) {
    switch (t) {
        case VehicleType::Bike: return "BIKE";
        case VehicleType::Car: return "CAR";
        case VehicleType::Ev: return "EV";
        case VehicleType::Truck: return "TRUCK";
    }
    return "?";
}

struct Ticket {
    string id, plate;
    VehicleType type;
    Instant entry;
};

class Clock {
public:
    virtual ~Clock() = default;
    virtual Instant instant() const = 0;
};
class PricingPolicy {
public:
    virtual ~PricingPolicy() = default;
    virtual double fee(const Ticket& t, Instant exit) const = 0;
};
class PaymentMethod {
public:
    virtual ~PaymentMethod() = default;
    virtual string code() const = 0;
    virtual bool pay(double amount) = 0;
};

static long long startedHours(const Ticket& t, Instant exit) {
    long long minutes = max<long long>(1, chrono::duration_cast<chrono::minutes>(exit - t.entry).count());
    return (minutes + 59) / 60;   // started hours, at least 1
}

class BaseRates : public PricingPolicy {
    map<VehicleType, pair<double, double>> rates_ = {
        {VehicleType::Bike, {10, 5}}, {VehicleType::Car, {30, 20}},
        {VehicleType::Ev, {30, 20}}, {VehicleType::Truck, {60, 40}}};
public:
    double fee(const Ticket& t, Instant exit) const override {
        auto [first, extra] = rates_.at(t.type);
        return first + (startedHours(t, exit) - 1) * extra;
    }
};
class EvChargingFee : public PricingPolicy {   // decorator: adds, never removes
    unique_ptr<PricingPolicy> inner_;
public:
    explicit EvChargingFee(unique_ptr<PricingPolicy> inner) : inner_(std::move(inner)) {}
    double fee(const Ticket& t, Instant exit) const override {
        double f = inner_->fee(t, exit);
        return t.type == VehicleType::Ev ? f + 15 * startedHours(t, exit) : f;
    }
};
class WeekendSurcharge : public PricingPolicy {
    unique_ptr<PricingPolicy> inner_;
    chrono::minutes zoneOffset_;
public:
    WeekendSurcharge(unique_ptr<PricingPolicy> inner, chrono::minutes zoneOffset)
        : inner_(std::move(inner)), zoneOffset_(zoneOffset) {}
    double fee(const Ticket& t, Instant exit) const override {
        chrono::weekday d{chrono::floor<chrono::days>(t.entry + zoneOffset_)};
        bool weekend = d == chrono::Saturday || d == chrono::Sunday;
        return inner_->fee(t, exit) * (weekend ? 1.25 : 1.0);
    }
};

class SpotInventory {
    map<VehicleType, int> free_;
public:
    explicit SpotInventory(map<VehicleType, int> capacity) : free_(std::move(capacity)) {}
    bool take(VehicleType t) {
        int& n = free_[t];
        if (n == 0) return false;
        --n;
        return true;
    }
    void release(VehicleType t) { ++free_[t]; }
};

class ReceiptFormatter {
public:
    string format(const Ticket& t, double fee, const string& method) const {
        char buf[128];
        snprintf(buf, sizeof buf, "RECEIPT %s %s %.2f via %s", t.plate.c_str(), typeName(t.type), fee, method.c_str());
        return buf;
    }
};

class ParkingService {
    SpotInventory spots_;
    unique_ptr<PricingPolicy> pricing_;
    const Clock& clock_;
    unordered_map<string, unique_ptr<PaymentMethod>> methods_;
    unordered_map<string, Ticket> open_;
    ReceiptFormatter receipts_;
    int seq_ = 0;
public:
    ParkingService(SpotInventory spots, unique_ptr<PricingPolicy> pricing,
                   vector<unique_ptr<PaymentMethod>> methods, const Clock& clock)
        : spots_(std::move(spots)), pricing_(std::move(pricing)), clock_(clock) {
        for (auto& m : methods) {
            string code = m->code();
            methods_[code] = std::move(m);
        }
    }

    optional<Ticket> park(const string& plate, VehicleType type) {
        if (!spots_.take(type)) return nullopt;
        Ticket t{"T" + to_string(++seq_), plate, type, clock_.instant()};
        open_.emplace(t.id, t);
        return t;
    }

    string exit(const string& ticketId, const string& methodCode) {
        auto ticket = open_.find(ticketId);
        if (ticket == open_.end()) throw runtime_error("unknown or already paid ticket");
        auto method = methods_.find(methodCode);
        if (method == methods_.end()) throw invalid_argument("unsupported payment " + methodCode);
        const Ticket& t = ticket->second;
        double fee = round(pricing_->fee(t, clock_.instant()) * 100) / 100;
        if (!method->second->pay(fee)) return "DECLINED";   // ticket stays open, spot stays taken
        string receipt = receipts_.format(t, fee, methodCode);
        spots_.release(t.type);
        open_.erase(ticket);
        return receipt;
    }
};

// adapters + fakes
class CashPayment : public PaymentMethod {
public:
    string code() const override { return "CASH"; }
    bool pay(double) override { return true; }
};
class UpiPayment : public PaymentMethod {
public:
    string code() const override { return "UPI"; }
    bool pay(double amount) override { return amount < 100'000; }
};

class MutableClock : public Clock {   // test clock we can move forward
    Instant now_;
public:
    explicit MutableClock(Instant start) : now_(start) {}
    void advance(chrono::minutes d) { now_ += d; }
    Instant instant() const override { return now_; }
};

class ParkingDemo {
public:
    static void run() {
        using namespace chrono_literals;
        const auto ist = 330min;
        MutableClock clock(chrono::sys_days{2026y / chrono::March / 7} + 10h - ist);   // Saturday 10:00 IST
        vector<unique_ptr<PaymentMethod>> methods;
        methods.push_back(make_unique<CashPayment>());
        methods.push_back(make_unique<UpiPayment>());
        ParkingService svc(SpotInventory({{VehicleType::Car, 2}, {VehicleType::Ev, 1}}),
                           make_unique<WeekendSurcharge>(make_unique<EvChargingFee>(make_unique<BaseRates>()), ist),
                           std::move(methods), clock);

        Ticket car = svc.park("MH12AB1234", VehicleType::Car).value();
        Ticket second = svc.park("MH12CD0001", VehicleType::Car).value();
        cout << svc.park("MH12EF0002", VehicleType::Car).has_value() << "\\n";   // false: full
        clock.advance(150min);
        cout << svc.exit(car.id, "UPI") << "\\n";                               // 87.50 (3h, weekend)
        try {
            svc.exit(car.id, "UPI");
        } catch (const runtime_error& e) {
            cout << "blocked: " << e.what() << "\\n";
        }
        cout << svc.park("MH12EF0002", VehicleType::Car).has_value() << "\\n";   // true: the exit freed a spot
        try {
            svc.exit(second.id, "CRYPTO");
        } catch (const invalid_argument& e) {
            cout << e.what() << "\\n";
        }

        clock.advance(2670min);   // Sat 12:30 -> Mon 09:00
        Ticket ev = svc.park("MH12EV0003", VehicleType::Ev).value();
        clock.advance(60min);
        cout << svc.exit(ev.id, "CASH") << "\\n";   // 45.00: no weekend surcharge, EV charging added
    }
};

int main() {
    cout << boolalpha;
    ParkingDemo::run();
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

enum VehicleType { BIKE, CAR, EV, TRUCK }
sealed class Ticket {
    public readonly string Id, Plate; public readonly VehicleType Type; public readonly DateTime Entry;
    public Ticket(string id, string plate, VehicleType type, DateTime entry) { Id = id; Plate = plate; Type = type; Entry = entry; }
}

interface IPricingPolicy { double Fee(Ticket t, DateTime exit); }
interface IPaymentMethod { string Code { get; } bool Pay(double amount); }
interface IClock { DateTime Now { get; } }                              // time as a dependency

class BaseRates : IPricingPolicy {
    private readonly Dictionary<VehicleType, double[]> rates = new Dictionary<VehicleType, double[]> {
            { VehicleType.BIKE, new double[] { 10, 5 } }, { VehicleType.CAR, new double[] { 30, 20 } },
            { VehicleType.EV, new double[] { 30, 20 } }, { VehicleType.TRUCK, new double[] { 60, 40 } } };
    public static long Hours(Ticket t, DateTime exit) {
        long min = Math.Max(1, (long)(exit - t.Entry).TotalMinutes);
        return (min + 59) / 60;                                    // started hours, at least 1
    }
    public double Fee(Ticket t, DateTime exit) {
        double[] r = rates[t.Type];
        return r[0] + (Hours(t, exit) - 1) * r[1];
    }
}
class EvChargingFee : IPricingPolicy {                             // decorator: adds, never removes
    private readonly IPricingPolicy inner;
    public EvChargingFee(IPricingPolicy inner) { this.inner = inner; }
    public double Fee(Ticket t, DateTime exit) {
        double f = inner.Fee(t, exit);
        return t.Type == VehicleType.EV ? f + 15 * BaseRates.Hours(t, exit) : f;
    }
}
class WeekendSurcharge : IPricingPolicy {
    private readonly IPricingPolicy inner;
    public WeekendSurcharge(IPricingPolicy inner) { this.inner = inner; }
    public double Fee(Ticket t, DateTime exit) {
        DayOfWeek d = t.Entry.DayOfWeek;
        bool weekend = d == DayOfWeek.Saturday || d == DayOfWeek.Sunday;
        return inner.Fee(t, exit) * (weekend ? 1.25 : 1.0);
    }
}

class SpotInventory {
    private readonly Dictionary<VehicleType, int> free;
    public SpotInventory(Dictionary<VehicleType, int> capacity) { free = new Dictionary<VehicleType, int>(capacity); }
    public bool Take(VehicleType t) { int n; free.TryGetValue(t, out n); if (n == 0) return false; free[t] = n - 1; return true; }
    public void Release(VehicleType t) { int n; free.TryGetValue(t, out n); free[t] = n + 1; }
}

class ReceiptFormatter {
    public string Format(Ticket t, double fee, string method) { return "RECEIPT " + t.Plate + " " + t.Type + " " + fee.ToString("F2") + " via " + method; }
}

class ParkingService {
    private readonly SpotInventory spots; private readonly IPricingPolicy pricing; private readonly IClock clock;
    private readonly Dictionary<string, IPaymentMethod> methods = new Dictionary<string, IPaymentMethod>();
    private readonly Dictionary<string, Ticket> open = new Dictionary<string, Ticket>();
    private readonly ReceiptFormatter receipts = new ReceiptFormatter();
    private int seq = 0;

    public ParkingService(SpotInventory spots, IPricingPolicy pricing, IEnumerable<IPaymentMethod> ms, IClock clock) {
        this.spots = spots; this.pricing = pricing; this.clock = clock;
        foreach (IPaymentMethod m in ms) methods[m.Code] = m;
    }

    public Ticket Park(string plate, VehicleType type) {              // null when full
        if (!spots.Take(type)) return null;
        Ticket t = new Ticket("T" + (++seq), plate, type, clock.Now);
        open[t.Id] = t;
        return t;
    }

    public string Exit(string ticketId, string methodCode) {
        Ticket t;
        if (!open.TryGetValue(ticketId, out t)) throw new InvalidOperationException("unknown or already paid ticket");
        IPaymentMethod m;
        if (!methods.TryGetValue(methodCode, out m)) throw new ArgumentException("unsupported payment " + methodCode);
        double fee = Math.Round(pricing.Fee(t, clock.Now) * 100, MidpointRounding.AwayFromZero) / 100.0;
        if (!m.Pay(fee)) return "DECLINED";                      // ticket stays open, spot stays taken
        open.Remove(ticketId);
        spots.Release(t.Type);
        return receipts.Format(t, fee, m.Code);
    }
}

// adapters + fakes
class CashPayment : IPaymentMethod { public string Code { get { return "CASH"; } } public bool Pay(double a) { return true; } }
class UpiPayment : IPaymentMethod { public string Code { get { return "UPI"; } } public bool Pay(double a) { return a < 100000; } }

class MutableClock : IClock {                                     // test clock we can move forward
    private DateTime now;
    public MutableClock(DateTime start) { now = start; }
    public void Advance(TimeSpan d) { now = now + d; }
    public DateTime Now { get { return now; } }
}

class Program {
    static void Main() {
        MutableClock clock = new MutableClock(new DateTime(2026, 3, 7, 10, 0, 0));   // Saturday
        IPricingPolicy pricing = new WeekendSurcharge(new EvChargingFee(new BaseRates()));
        ParkingService svc = new ParkingService(new SpotInventory(new Dictionary<VehicleType, int> { { VehicleType.CAR, 2 }, { VehicleType.EV, 1 } }),
                pricing, new IPaymentMethod[] { new CashPayment(), new UpiPayment() }, clock);

        Ticket car = svc.Park("MH12AB1234", VehicleType.CAR);
        Ticket second = svc.Park("MH12CD0001", VehicleType.CAR);
        Console.WriteLine((svc.Park("MH12EF0002", VehicleType.CAR) != null).ToString().ToLower());   // false: full
        clock.Advance(TimeSpan.FromMinutes(150));
        Console.WriteLine(svc.Exit(car.Id, "UPI"));                                                 // 87.50 (3h, weekend)
        try { svc.Exit(car.Id, "UPI"); } catch (InvalidOperationException e) { Console.WriteLine("blocked: " + e.Message); }
        Console.WriteLine((svc.Park("MH12EF0002", VehicleType.CAR) != null).ToString().ToLower());   // true: the exit freed a spot
        try { svc.Exit(second.Id, "CRYPTO"); } catch (ArgumentException e) { Console.WriteLine(e.Message); }

        clock.Advance(TimeSpan.FromMinutes(2670));                                                 // Sat 12:30 -> Mon 09:00
        Ticket ev = svc.Park("MH12EV0003", VehicleType.EV);
        clock.Advance(TimeSpan.FromMinutes(60));
        Console.WriteLine(svc.Exit(ev.Id, "CASH"));                                                 // 45.00: no weekend surcharge, EV charging added
    }
}` }
        ],
      complexity: `<p>O(1) per park/exit (hash maps, EnumMap). Each new requirement (UPI, EV fee, weekend) was a new class; <code>ParkingService</code> never changed for them. Tests simulate Saturdays and 150 minutes instantly via <code>MutableClock</code>.</p>`,
      followUps: ['Multiple floors and nearest-spot allocation: which class changes and which interface would you introduce (SpotAllocationStrategy)?', 'Two exit gates processing the same ticket concurrently — how do you make <code>exit</code> safe?', 'Lost ticket with a fixed penalty: new PricingPolicy or new flow?']
    }
  });

  practice.push({
    title: 'Plugin text pipeline: add filters without touching the processor',
    level: 'Hard', tags: ['OCP', 'DIP', 'pipeline', 'registry'], companies: ['Google', 'Meta', 'Grammarly'],
    statement: `<p>A content moderation service has <code>TextProcessor.process(text, boolean trim, boolean lower, boolean maskEmails, boolean censor)</code>. Every new rule adds a boolean parameter and an <code>if</code>, the order of steps is hard-coded, and call sites look like <code>process(t, true, false, true, true)</code>. Design a pipeline where <b>new filters are plugged in by name from configuration</b> (e.g. <code>"trim,mask-emails,censor"</code>), the order comes from config, and the core never changes. Add a new <code>mask-phones</code> filter to prove it.</p>`,
    constraints: `<p>Filters are pure functions String → String. Unknown filter names fail at startup with a helpful message listing known names. Banned words list is injected (not hard-coded).</p>`,
    example: `<p>Config <code>"trim,mask-emails,censor"</code>, banned = [darn]. Input <code>"  Mail me at a@b.com, darn it  "</code> → ${H.c('g', '"Mail me at ***@***, **** it"')}. Config <code>"trim,mask-phones"</code> works after adding one class + one registration.</p>`,
    brute: {
      why: `<p>Boolean-flag parameters violate <b>OCP</b> (each rule edits the signature and every caller) and hide meaning at call sites. The hard-coded order and banned list couple policy to data (<b>DIP</b>: configuration and word lists are details). It is also an <b>SRP</b> pile: four unrelated rules in one method, each owned by a different team (privacy, trust &amp; safety, formatting).</p>`,
      code: { lang: 'java', code: `class TextProcessor {
    String process(String text, boolean trim, boolean lower, boolean maskEmails, boolean censor) {
        String t = text;
        if (trim) t = t.trim();
        if (lower) t = t.toLowerCase();
        if (maskEmails) t = t.replaceAll("[\\\\w.+-]+@[\\\\w-]+\\\\.[\\\\w.]+", "***@***");
        if (censor) t = t.replaceAll("(?i)darn", "****");            // banned list hard-coded
        return t;                                                     // new rule? new boolean + new if
    }
}`, alt: [
              { lang: 'python', code: `
import re

class TextProcessor:
    def process(self, text, trim, lower, mask_emails, censor):
        t = text
        if trim: t = t.strip()
        if lower: t = t.lower()
        if mask_emails: t = re.sub(r"[\\w.+-]+@[\\w-]+\\.[\\w.]+", "***@***", t)
        if censor: t = re.sub(r"(?i)darn", "****", t)            # banned list hard-coded
        return t                                                  # new rule? new boolean + new if` },
              { lang: 'ts', code: `
class TextProcessor {
    process(text: string, trim: boolean, lower: boolean, maskEmails: boolean, censor: boolean): string {
        let t = text;
        if (trim) t = t.trim();
        if (lower) t = t.toLowerCase();
        if (maskEmails) t = t.replace(/[\\w.+-]+@[\\w-]+\\.[\\w.]+/g, "***@***");
        if (censor) t = t.replace(/darn/gi, "****");              // banned list hard-coded
        return t;                                                  // new rule? new boolean + new if
    }
}` },
              { lang: 'cpp', code: `
class TextProcessor {
public:
    string process(string text, bool trim, bool lower, bool maskEmails, bool censor) {
        string t = text;
        if (trim) { t.erase(0, t.find_first_not_of(" \\t\\n")); t.erase(t.find_last_not_of(" \\t\\n") + 1); }
        if (lower) transform(t.begin(), t.end(), t.begin(), ::tolower);
        if (maskEmails) t = regex_replace(t, regex("[\\\\w.+-]+@[\\\\w-]+\\\\.[\\\\w.]+"), "***@***");
        if (censor) t = regex_replace(t, regex("darn", regex::icase), "****");   // banned list hard-coded
        return t;                                                                 // new rule? new boolean + new if
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Text.RegularExpressions;

class TextProcessor {
    public string Process(string text, bool trim, bool lower, bool maskEmails, bool censor) {
        string t = text;
        if (trim) t = t.Trim();
        if (lower) t = t.ToLower();
        if (maskEmails) t = Regex.Replace(t, @"[\\w.+-]+@[\\w-]+\\.[\\w.]+", "***@***");
        if (censor) t = Regex.Replace(t, "darn", "****", RegexOptions.IgnoreCase);   // banned list hard-coded
        return t;                                                                    // new rule? new boolean + new if
    }
}` }
            ] }
    },
    mcq: { q: 'What makes the pipeline open for extension?', options: ['A TextFilter interface plus a name → factory registry used to build the chain from config', 'An enum of all filters with a switch', 'Subclassing TextProcessor for each combination', 'More boolean parameters with default values'], answer: 0, explain: 'Filters implement one interface and register themselves by name; the pipeline composes whatever the config lists. The core code never learns about specific filters.' },
    hints: [
      `<p>Each step is "String in, String out" — a perfect single-method interface. A pipeline is just a list of them applied in order.</p>`,
      `<p><code>interface TextFilter { String apply(String s); }</code>, <code>FilterRegistry</code> mapping names to <code>Supplier&lt;TextFilter&gt;</code>, <code>Pipeline.fromConfig(String, registry)</code>.</p>`,
      `<p>Inject the banned-word list into <code>CensorFilter</code>'s constructor (registered with a lambda that captures it). Validate all names before building; escape banned words before building the pattern (<code>Pattern.quote</code>, <code>re.escape</code>) and use word boundaries.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "Mail me at ***@***, **** it\ncall [phone] now\nunknown filter 'translate', known: [trim, lower, mask-emails, censor, mask-phones]\nhello\nduplicate filter trim\n" }] },
      solution: {
      approach: `<p><b>Strategy objects composed into a pipeline, discovered through a registry.</b> Each rule is a small <code>TextFilter</code> (SRP, independently testable). The <code>FilterRegistry</code> maps config names to factories; the composition root registers built-ins and the banned-word list (DIP: data injected). <code>Pipeline</code> only applies filters in order and never changes (OCP). Unknown names fail fast with the list of known filters. Adding <code>mask-phones</code> = one class + one <code>register</code> call; in a real plugin system, <code>ServiceLoader</code> could do the registration.</p>`,
      code: `import java.util.regex.Pattern;

interface TextFilter { String apply(String s); }

class TrimFilter implements TextFilter { public String apply(String s) { return s.strip(); } }
class LowerFilter implements TextFilter { public String apply(String s) { return s.toLowerCase(); } }
class MaskEmailsFilter implements TextFilter {
    private static final Pattern EMAIL = Pattern.compile("[\\\\w.+-]+@[\\\\w-]+\\\\.[\\\\w.]+");
    public String apply(String s) { return EMAIL.matcher(s).replaceAll("***@***"); }
}
class CensorFilter implements TextFilter {
    private final List<Pattern> banned;
    CensorFilter(List<String> words) {
        banned = words.stream().map(w -> Pattern.compile("(?i)\\\\b" + Pattern.quote(w) + "\\\\b")).toList();
    }
    public String apply(String s) {
        String out = s;
        for (Pattern p : banned) out = p.matcher(out).replaceAll(m -> "*".repeat(m.group().length()));
        return out;
    }
}
class MaskPhonesFilter implements TextFilter {                    // NEW: added without touching anything else
    private static final Pattern PHONE = Pattern.compile("\\\\+?\\\\d[\\\\d -]{8,}\\\\d");
    public String apply(String s) { return PHONE.matcher(s).replaceAll("[phone]"); }
}

class FilterRegistry {
    private final Map<String, Supplier<TextFilter>> factories = new LinkedHashMap<>();
    FilterRegistry register(String name, Supplier<TextFilter> f) {
        if (factories.putIfAbsent(name, f) != null) throw new IllegalArgumentException("duplicate filter " + name);
        return this;
    }
    TextFilter create(String name) {
        Supplier<TextFilter> f = factories.get(name);
        if (f == null) throw new IllegalArgumentException("unknown filter '" + name + "', known: " + factories.keySet());
        return f.get();
    }
}

class Pipeline {
    private final List<TextFilter> steps;
    Pipeline(List<TextFilter> steps) { this.steps = List.copyOf(steps); }
    static Pipeline fromConfig(String config, FilterRegistry reg) {
        List<TextFilter> steps = new ArrayList<>();
        for (String name : config.split(",")) if (!name.isBlank()) steps.add(reg.create(name.strip()));
        return new Pipeline(steps);
    }
    String run(String text) {
        String t = text;
        for (TextFilter f : steps) t = f.apply(t);
        return t;
    }
}

class ModerationApp {
    public static void main(String[] args) {
        List<String> banned = List.of("darn");                        // would come from a config service
        FilterRegistry reg = new FilterRegistry()
                .register("trim", TrimFilter::new)
                .register("lower", LowerFilter::new)
                .register("mask-emails", MaskEmailsFilter::new)
                .register("censor", () -> new CensorFilter(banned))
                .register("mask-phones", MaskPhonesFilter::new);   // the only line added for the new filter

        System.out.println(Pipeline.fromConfig("trim,mask-emails,censor", reg).run("  Mail me at a@b.com, darn it  "));
        System.out.println(Pipeline.fromConfig("trim,mask-phones", reg).run(" call +91 98765 43210 now "));
        try { Pipeline.fromConfig("trim,translate", reg); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
        System.out.println(Pipeline.fromConfig("lower,trim", reg).run("  HeLLo  "));   // order comes from config
        try { reg.register("trim", TrimFilter::new); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
    }
}`,
        alt: [
          { lang: 'python', code: `import re
from abc import ABC, abstractmethod
from typing import Callable


class TextFilter(ABC):
    @abstractmethod
    def apply(self, s: str) -> str: ...


class TrimFilter(TextFilter):
    def apply(self, s: str) -> str:
        return s.strip()


class LowerFilter(TextFilter):
    def apply(self, s: str) -> str:
        return s.lower()


class MaskEmailsFilter(TextFilter):
    _EMAIL = re.compile(r"[\\w.+-]+@[\\w-]+\\.[\\w.]+")

    def apply(self, s: str) -> str:
        return self._EMAIL.sub("***@***", s)


class CensorFilter(TextFilter):
    def __init__(self, words: list[str]) -> None:
        self._banned = [re.compile(r"\\b" + re.escape(w) + r"\\b", re.IGNORECASE) for w in words]

    def apply(self, s: str) -> str:
        for pattern in self._banned:
            s = pattern.sub(lambda m: "*" * len(m.group()), s)
        return s


class MaskPhonesFilter(TextFilter):  # NEW: added without touching anything else
    _PHONE = re.compile(r"\\+?\\d[\\d -]{8,}\\d")

    def apply(self, s: str) -> str:
        return self._PHONE.sub("[phone]", s)


class FilterRegistry:
    def __init__(self) -> None:
        self._factories: dict[str, Callable[[], TextFilter]] = {}

    def register(self, name: str, factory: Callable[[], TextFilter]) -> "FilterRegistry":
        if name in self._factories:
            raise ValueError(f"duplicate filter {name}")
        self._factories[name] = factory
        return self

    def create(self, name: str) -> TextFilter:
        factory = self._factories.get(name)
        if factory is None:
            known = ", ".join(self._factories)
            raise ValueError(f"unknown filter '{name}', known: [{known}]")
        return factory()


class Pipeline:
    def __init__(self, steps: list[TextFilter]) -> None:
        self._steps = list(steps)

    @staticmethod
    def from_config(config: str, reg: FilterRegistry) -> "Pipeline":
        return Pipeline([reg.create(name.strip()) for name in config.split(",") if name.strip()])

    def run(self, text: str) -> str:
        for f in self._steps:
            text = f.apply(text)
        return text


class ModerationApp:
    @staticmethod
    def main() -> None:
        banned = ["darn"]  # would come from a config service
        reg = (FilterRegistry()
               .register("trim", TrimFilter)
               .register("lower", LowerFilter)
               .register("mask-emails", MaskEmailsFilter)
               .register("censor", lambda: CensorFilter(banned))
               .register("mask-phones", MaskPhonesFilter))  # the only line added for the new filter

        print(Pipeline.from_config("trim,mask-emails,censor", reg).run("  Mail me at a@b.com, darn it  "))
        print(Pipeline.from_config("trim,mask-phones", reg).run(" call +91 98765 43210 now "))
        try:
            Pipeline.from_config("trim,translate", reg)
        except ValueError as e:
            print(e)
        print(Pipeline.from_config("lower,trim", reg).run("  HeLLo  "))  # order comes from config
        try:
            reg.register("trim", TrimFilter)
        except ValueError as e:
            print(e)


if __name__ == "__main__":
    ModerationApp.main()` },
          { lang: 'ts', code: `interface TextFilter { apply(s: string): string; }

class TrimFilter implements TextFilter {
  apply(s: string): string { return s.trim(); }
}
class LowerFilter implements TextFilter {
  apply(s: string): string { return s.toLowerCase(); }
}
class MaskEmailsFilter implements TextFilter {
  private static readonly EMAIL = /[\\w.+-]+@[\\w-]+\\.[\\w.]+/g;
  apply(s: string): string { return s.replace(MaskEmailsFilter.EMAIL, "***@***"); }
}
class CensorFilter implements TextFilter {
  private readonly banned: RegExp[];
  constructor(words: string[]) {
    this.banned = words.map((w) => new RegExp("\\\\b" + w.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\$&") + "\\\\b", "gi"));
  }
  apply(s: string): string {
    return this.banned.reduce((out, p) => out.replace(p, (m) => "*".repeat(m.length)), s);
  }
}
class MaskPhonesFilter implements TextFilter { // NEW: added without touching anything else
  private static readonly PHONE = /\\+?\\d[\\d -]{8,}\\d/g;
  apply(s: string): string { return s.replace(MaskPhonesFilter.PHONE, "[phone]"); }
}

class FilterRegistry {
  private readonly factories = new Map<string, () => TextFilter>();

  register(name: string, factory: () => TextFilter): this {
    if (this.factories.has(name)) throw new Error(\`duplicate filter \${name}\`);
    this.factories.set(name, factory);
    return this;
  }

  create(name: string): TextFilter {
    const factory = this.factories.get(name);
    if (factory === undefined) {
      throw new Error(\`unknown filter '\${name}', known: [\${[...this.factories.keys()].join(", ")}]\`);
    }
    return factory();
  }
}

class Pipeline {
  private readonly steps: readonly TextFilter[];
  constructor(steps: TextFilter[]) { this.steps = [...steps]; }

  static fromConfig(config: string, reg: FilterRegistry): Pipeline {
    return new Pipeline(config.split(",").filter((n) => n.trim() !== "").map((n) => reg.create(n.trim())));
  }

  run(text: string): string {
    return this.steps.reduce((t, f) => f.apply(t), text);
  }
}

class ModerationApp {
  static main(): void {
    const banned = ["darn"]; // would come from a config service
    const reg = new FilterRegistry()
      .register("trim", () => new TrimFilter())
      .register("lower", () => new LowerFilter())
      .register("mask-emails", () => new MaskEmailsFilter())
      .register("censor", () => new CensorFilter(banned))
      .register("mask-phones", () => new MaskPhonesFilter()); // the only line added for the new filter

    console.log(Pipeline.fromConfig("trim,mask-emails,censor", reg).run("  Mail me at a@b.com, darn it  "));
    console.log(Pipeline.fromConfig("trim,mask-phones", reg).run(" call +91 98765 43210 now "));
    try {
      Pipeline.fromConfig("trim,translate", reg);
    } catch (e) {
      console.log((e as Error).message);
    }
    console.log(Pipeline.fromConfig("lower,trim", reg).run("  HeLLo  ")); // order comes from config
    try {
      reg.register("trim", () => new TrimFilter());
    } catch (e) {
      console.log((e as Error).message);
    }
  }
}
ModerationApp.main();` },
          { lang: 'cpp', code: `// std::regex has no replace-with-callback, so this helper rebuilds the string match by match
static string replaceAll(const string& s, const regex& re, const function<string(const smatch&)>& fn) {
    string out;
    auto last = s.cbegin();
    for (sregex_iterator it(s.begin(), s.end(), re), end; it != end; ++it) {
        out.append(last, (*it)[0].first);
        out += fn(*it);
        last = (*it)[0].second;
    }
    out.append(last, s.cend());
    return out;
}

class TextFilter {
public:
    virtual ~TextFilter() = default;
    virtual string apply(const string& s) const = 0;
};

class TrimFilter : public TextFilter {
public:
    string apply(const string& s) const override {
        size_t b = s.find_first_not_of(" \\t\\r\\n"), e = s.find_last_not_of(" \\t\\r\\n");
        return b == string::npos ? "" : s.substr(b, e - b + 1);
    }
};
class LowerFilter : public TextFilter {
public:
    string apply(const string& s) const override {
        string out = s;
        transform(out.begin(), out.end(), out.begin(), [](unsigned char c) { return tolower(c); });
        return out;
    }
};
class MaskEmailsFilter : public TextFilter {
    regex email_{R"([\\w.+-]+@[\\w-]+\\.[\\w.]+)"};
public:
    string apply(const string& s) const override { return regex_replace(s, email_, "***@***"); }
};
class CensorFilter : public TextFilter {
    vector<regex> banned_;
public:
    explicit CensorFilter(const vector<string>& words) {
        for (const string& w : words) {
            static const regex special(R"([.*+?^\${}()|\\[\\]\\\\])");
            banned_.emplace_back("\\\\b" + regex_replace(w, special, "\\\\$&") + "\\\\b", regex::icase);
        }
    }
    string apply(const string& s) const override {
        string out = s;
        for (const regex& p : banned_)
            out = replaceAll(out, p, [](const smatch& m) { return string(m.length(), '*'); });
        return out;
    }
};
class MaskPhonesFilter : public TextFilter {   // NEW: added without touching anything else
    regex phone_{R"(\\+?\\d[\\d -]{8,}\\d)"};
public:
    string apply(const string& s) const override { return regex_replace(s, phone_, "[phone]"); }
};

class FilterRegistry {
    unordered_map<string, function<unique_ptr<TextFilter>()>> factories_;
    vector<string> order_;   // registration order, for the error message
public:
    // Java/Python/TypeScript call this register(); the word is reserved in C++
    FilterRegistry& add(const string& name, function<unique_ptr<TextFilter>()> factory) {
        if (factories_.count(name)) throw invalid_argument("duplicate filter " + name);
        factories_[name] = std::move(factory);
        order_.push_back(name);
        return *this;
    }
    unique_ptr<TextFilter> create(const string& name) const {
        auto it = factories_.find(name);
        if (it == factories_.end()) {
            string known;
            for (const string& n : order_) known += (known.empty() ? "" : ", ") + n;
            throw invalid_argument("unknown filter '" + name + "', known: [" + known + "]");
        }
        return it->second();
    }
};

class Pipeline {
    vector<unique_ptr<TextFilter>> steps_;
public:
    explicit Pipeline(vector<unique_ptr<TextFilter>> steps) : steps_(std::move(steps)) {}

    static Pipeline fromConfig(const string& config, const FilterRegistry& reg) {
        vector<unique_ptr<TextFilter>> steps;
        stringstream in(config);
        for (string name; getline(in, name, ',');) {
            name = TrimFilter().apply(name);
            if (!name.empty()) steps.push_back(reg.create(name));
        }
        return Pipeline(std::move(steps));
    }

    string run(string text) const {
        for (const auto& f : steps_) text = f->apply(text);
        return text;
    }
};

int main() {
    const vector<string> banned = {"darn"};   // would come from a config service
    FilterRegistry reg;
    reg.add("trim", [] { return make_unique<TrimFilter>(); })
       .add("lower", [] { return make_unique<LowerFilter>(); })
       .add("mask-emails", [] { return make_unique<MaskEmailsFilter>(); })
       .add("censor", [&banned] { return make_unique<CensorFilter>(banned); })
       .add("mask-phones", [] { return make_unique<MaskPhonesFilter>(); });   // the only line added for the new filter

    cout << Pipeline::fromConfig("trim,mask-emails,censor", reg).run("  Mail me at a@b.com, darn it  ") << "\\n";
    cout << Pipeline::fromConfig("trim,mask-phones", reg).run(" call +91 98765 43210 now ") << "\\n";
    try {
        Pipeline::fromConfig("trim,translate", reg);
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";
    }
    cout << Pipeline::fromConfig("lower,trim", reg).run("  HeLLo  ") << "\\n";   // order comes from config
    try {
        reg.add("trim", [] { return make_unique<TrimFilter>(); });
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";
    }
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;

interface ITextFilter { string Apply(string s); }

class TrimFilter : ITextFilter { public string Apply(string s) { return s.Trim(); } }
class LowerFilter : ITextFilter { public string Apply(string s) { return s.ToLower(); } }
class MaskEmailsFilter : ITextFilter {
    private static readonly Regex Email = new Regex(@"[\\w.+-]+@[\\w-]+\\.[\\w.]+");
    public string Apply(string s) { return Email.Replace(s, "***@***"); }
}
class CensorFilter : ITextFilter {
    private readonly List<Regex> banned;
    public CensorFilter(IEnumerable<string> words) {
        banned = words.Select(w => new Regex(@"\\b" + Regex.Escape(w) + @"\\b", RegexOptions.IgnoreCase)).ToList();
    }
    public string Apply(string s) {
        string result = s;
        foreach (Regex p in banned) result = p.Replace(result, m => new string('*', m.Value.Length));
        return result;
    }
}
class MaskPhonesFilter : ITextFilter {                    // NEW: added without touching anything else
    private static readonly Regex Phone = new Regex(@"\\+?\\d[\\d -]{8,}\\d");
    public string Apply(string s) { return Phone.Replace(s, "[phone]"); }
}

class FilterRegistry {
    private readonly List<string> order = new List<string>();                                   // registration order
    private readonly Dictionary<string, Func<ITextFilter>> factories = new Dictionary<string, Func<ITextFilter>>();
    public FilterRegistry Register(string name, Func<ITextFilter> f) {
        if (factories.ContainsKey(name)) throw new ArgumentException("duplicate filter " + name);
        factories[name] = f; order.Add(name);
        return this;
    }
    public ITextFilter Create(string name) {
        Func<ITextFilter> f;
        if (!factories.TryGetValue(name, out f)) throw new ArgumentException("unknown filter '" + name + "', known: [" + string.Join(", ", order) + "]");
        return f();
    }
}

class Pipeline {
    private readonly List<ITextFilter> steps;
    public Pipeline(IEnumerable<ITextFilter> steps) { this.steps = new List<ITextFilter>(steps); }
    public static Pipeline FromConfig(string config, FilterRegistry reg) {
        List<ITextFilter> steps = new List<ITextFilter>();
        foreach (string name in config.Split(',')) if (!string.IsNullOrWhiteSpace(name)) steps.Add(reg.Create(name.Trim()));
        return new Pipeline(steps);
    }
    public string Run(string text) {
        string t = text;
        foreach (ITextFilter f in steps) t = f.Apply(t);
        return t;
    }
}

class Program {
    static void Main() {
        List<string> banned = new List<string> { "darn" };               // would come from a config service
        FilterRegistry reg = new FilterRegistry()
                .Register("trim", () => new TrimFilter())
                .Register("lower", () => new LowerFilter())
                .Register("mask-emails", () => new MaskEmailsFilter())
                .Register("censor", () => new CensorFilter(banned))
                .Register("mask-phones", () => new MaskPhonesFilter());   // the only line added for the new filter

        Console.WriteLine(Pipeline.FromConfig("trim,mask-emails,censor", reg).Run("  Mail me at a@b.com, darn it  "));
        Console.WriteLine(Pipeline.FromConfig("trim,mask-phones", reg).Run(" call +91 98765 43210 now "));
        try { Pipeline.FromConfig("trim,translate", reg); } catch (ArgumentException e) { Console.WriteLine(e.Message); }
        Console.WriteLine(Pipeline.FromConfig("lower,trim", reg).Run("  HeLLo  "));   // order comes from config
        try { reg.Register("trim", () => new TrimFilter()); } catch (ArgumentException e) { Console.WriteLine(e.Message); }
    }
}` }
        ],
      complexity: `<p>O(k × n) for k filters over text of length n (each regex pass is linear in practice). Adding a filter: 1 class + 1 registration; Pipeline and existing filters unchanged.</p>`,
      followUps: ['Some filters need to <i>reject</i> text instead of transforming it — change the interface or add a second role (<code>TextValidator</code>)?', 'Load third-party filters from jars at runtime: how would <code>ServiceLoader</code> fit, and how do you sandbox them?', 'Make the order of filters safe (e.g. lower before censor) — validation rules in the registry?']
    }
  });

  practice.push({
    title: 'Stack extends ArrayList, and a BoundedStack that throws',
    level: 'Hard', tags: ['LSP', 'composition over inheritance', 'contract tests'], companies: ['Oracle', 'Goldman Sachs', 'Bloomberg'],
    statement: `<p>A codebase has <code>class LifoStack&lt;T&gt; extends ArrayList&lt;T&gt;</code> with <code>push</code>/<code>pop</code>, and <code>BoundedStack&lt;T&gt; extends LifoStack&lt;T&gt;</code> whose <code>push</code> throws when full. Bugs: callers use <code>add(0, x)</code> and <code>remove(i)</code> (inherited from ArrayList) and break LIFO order; a scheduler written for <code>LifoStack</code> crashes with a <code>BoundedStack</code>. <b>Explain both LSP problems</b> and design a stack abstraction whose contract both an unbounded and a bounded stack can honour, verified by a shared contract test.</p>`,
    constraints: `<p>Operations: push, pop, peek, size, isEmpty. Pop/peek on empty must not throw (return an empty optional: Java <code>Optional</code>, Python <code>None</code>, TypeScript <code>undefined</code>, C++ <code>std::optional</code>). No public method may let callers bypass LIFO.</p>`,
    example: `<p>Bounded(capacity 2): push A → true, push B → true, push C → ${H.c('y', 'false (full, unchanged)')}, pop → ${H.c('g', 'B')}. The same contract test passes for both <code>ArrayLifoStack</code> and <code>BoundedLifoStack</code>.</p>`,
    brute: {
      why: `<p>(1) <b>Inheritance for reuse</b>: extending a list class (<code>ArrayList</code> in Java, <code>list</code> in Python, <code>Array</code> in TypeScript, <code>vector</code> in C++) exposes dozens of list methods that break the stack invariant (only the top is accessible) — the subclass cannot protect its own invariant (the same flaw as <code>java.util.Stack extends Vector</code>). (2) <code>BoundedStack.push</code> <b>strengthens the precondition</b> ("only when not full") and adds a surprise exception, so clients of <code>LifoStack</code> break — a direct LSP violation.</p>`,
      code: { lang: 'java', code: `class LifoStack<T> extends ArrayList<T> {
    void push(T x) { add(x); }
    T pop() { return remove(size() - 1); }          // throws on empty
}
class BoundedStack<T> extends LifoStack<T> {
    private final int capacity;
    BoundedStack(int capacity) { this.capacity = capacity; }
    @Override void push(T x) {
        if (size() == capacity) throw new IllegalStateException("full");   // strengthened precondition
        super.push(x);
    }
}
class Scheduler {
    static void runAll(LifoStack<String> jobs) {
        for (int i = 0; i < 3; i++) jobs.push("job" + i);   // crashes for BoundedStack(2)
        jobs.add(0, "sneaky");                              // inherited: breaks LIFO silently
    }
}`, alt: [
              { lang: 'python', code: `
class LifoStack(list):
    def push(self, x): self.append(x)
    def pop(self): return super().pop()          # raises on empty

class BoundedStack(LifoStack):
    def __init__(self, capacity):
        super().__init__()
        self._capacity = capacity
    def push(self, x):
        if len(self) == self._capacity: raise RuntimeError("full")   # strengthened precondition
        super().push(x)

class Scheduler:
    @staticmethod
    def run_all(jobs):
        for i in range(3): jobs.push("job" + str(i))   # crashes for BoundedStack(2)
        jobs.insert(0, "sneaky")                       # inherited: breaks LIFO silently` },
              { lang: 'ts', code: `
class LifoStack<T> extends Array<T> {
    pushItem(x: T): void { this.push(x); }
    popItem(): T | undefined { return this.pop(); }
}
class BoundedStack<T> extends LifoStack<T> {
    private capacity = 0;
    static of<T>(capacity: number): BoundedStack<T> { const s = new BoundedStack<T>(); s.capacity = capacity; return s; }
    override pushItem(x: T): void {
        if (this.length === this.capacity) throw new Error("full");   // strengthened precondition
        super.pushItem(x);
    }
}
class Scheduler {
    static runAll(jobs: LifoStack<string>): void {
        for (let i = 0; i < 3; i++) jobs.pushItem("job" + i);   // crashes for BoundedStack(2)
        jobs.unshift("sneaky");                                  // inherited: breaks LIFO silently
    }
}` },
              { lang: 'cpp', code: `
template <class T>
class LifoStack : public vector<T> {
public:
    void pushItem(T x) { this->push_back(x); }
    T popItem() { T x = this->back(); this->pop_back(); return x; }
};
template <class T>
class BoundedStack : public LifoStack<T> {
    size_t capacity;
public:
    BoundedStack(size_t capacity) : capacity(capacity) {}
    void pushItem(T x) {
        if (this->size() == capacity) throw runtime_error("full");   // strengthened precondition
        LifoStack<T>::pushItem(x);
    }
};
struct Scheduler {
    static void runAll(BoundedStack<string>& jobs) {
        for (int i = 0; i < 3; i++) jobs.pushItem("job" + to_string(i));   // crashes for BoundedStack(2)
        jobs.insert(jobs.begin(), "sneaky");                                // inherited: breaks LIFO silently
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class LifoStack<T> : List<T> {
    public virtual void Push(T x) { Add(x); }
    public T Pop() { T x = this[Count - 1]; RemoveAt(Count - 1); return x; }   // throws on empty
}
class BoundedStack<T> : LifoStack<T> {
    private readonly int capacity;
    public BoundedStack(int capacity) { this.capacity = capacity; }
    public override void Push(T x) {
        if (Count == capacity) throw new InvalidOperationException("full");   // strengthened precondition
        base.Push(x);
    }
}
static class Scheduler {
    public static void RunAll(LifoStack<string> jobs) {
        for (int i = 0; i < 3; i++) jobs.Push("job" + i);   // crashes for BoundedStack(2)
        jobs.Insert(0, "sneaky");                            // inherited: breaks LIFO silently
    }
}` }
            ] }
    },
    mcq: { q: 'How can a bounded stack and an unbounded stack share one honest contract?', options: ['Make push return boolean ("accepted or not") in the interface, so "full" is part of the contract', 'Let the bounded stack silently drop the item and return void', 'Catch IllegalStateException in every caller', 'Make capacity a static constant'], answer: 0, explain: 'Like <code>Queue.offer</code>, a boolean result lets every implementation keep the promise. The unbounded one always returns true; the bounded one returns false when full. Callers wrote code for the contract, so nothing surprises them.' },
    hints: [
      `<p>Problem 1 is solved by <b>composition</b>: keep an <code>ArrayDeque</code> inside and expose only stack operations.</p>`,
      `<p>Problem 2 is solved by designing the <b>interface contract</b> so that "cannot accept" is a normal outcome: <code>boolean push(T)</code>, <code>Optional&lt;T&gt; pop()</code>.</p>`,
      `<p>Write a contract test once (a method taking a <code>Supplier</code> of fresh stacks) that checks LIFO order, empty behaviour, size, and "push false ⇒ unchanged"; run it against both implementations.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "ArrayLifoStack: contract OK\nBoundedLifoStack(2): contract OK\nBoundedLifoStack(10): contract OK\npush job0 -> true\npush job1 -> true\npush job2 -> false\npop -> job1\ncapacity > 0\n" }] },
      solution: {
      approach: `<p><b>Composition + contract-first interface + contract tests.</b> <code>LifoStack&lt;T&gt;</code> is an interface whose contract allows rejection (<code>push</code> returns false and leaves the stack unchanged) and uses an optional value (<code>Optional</code>, <code>None</code>, <code>undefined</code>, <code>std::optional</code>) for empty pops. <code>ArrayLifoStack</code> wraps an <code>ArrayDeque</code> (no list methods leak). <code>BoundedLifoStack</code> wraps another stack (decorator) and refuses when full — honouring the same contract. One reusable contract test verifies every implementation, which is how LSP is enforced in practice.</p>`,
      code: `interface LifoStack<T> {
    /** Contract: returns true and places x on top, or returns false and leaves the stack unchanged. */
    boolean push(T x);
    Optional<T> pop();
    Optional<T> peek();
    int size();
    default boolean isEmpty() { return size() == 0; }
}

class ArrayLifoStack<T> implements LifoStack<T> {          // composition: nothing from ArrayDeque leaks out
    private final ArrayDeque<T> items = new ArrayDeque<>();
    public boolean push(T x) { items.push(Objects.requireNonNull(x)); return true; }
    public Optional<T> pop() { return Optional.ofNullable(items.poll()); }
    public Optional<T> peek() { return Optional.ofNullable(items.peek()); }
    public int size() { return items.size(); }
}

class BoundedLifoStack<T> implements LifoStack<T> {        // decorator honouring the same contract
    private final LifoStack<T> inner; private final int capacity;
    BoundedLifoStack(LifoStack<T> inner, int capacity) {
        if (capacity <= 0) throw new IllegalArgumentException("capacity > 0");
        this.inner = inner; this.capacity = capacity;
    }
    public boolean push(T x) { return size() < capacity && inner.push(x); }
    public Optional<T> pop() { return inner.pop(); }
    public Optional<T> peek() { return inner.peek(); }
    public int size() { return inner.size(); }
}

class LifoStackContract {                                   // run against EVERY implementation
    static void verify(String name, Supplier<LifoStack<String>> fresh) {
        LifoStack<String> s = fresh.get();
        check(s.isEmpty() && s.pop().isEmpty() && s.peek().isEmpty(), "empty behaviour");
        check(s.push("A") && s.push("B"), "accepts at least 2 items");
        check(s.peek().orElseThrow().equals("B") && s.size() == 2, "peek top without removing");
        int before = s.size();
        boolean accepted = s.push("C");
        check(accepted ? s.size() == before + 1 : s.size() == before && s.peek().orElseThrow().equals("B"), "rejected push leaves stack unchanged");
        if (accepted) check(s.pop().orElseThrow().equals("C"), "LIFO order");
        check(s.pop().orElseThrow().equals("B") && s.pop().orElseThrow().equals("A"), "LIFO order");
        check(s.isEmpty(), "empty after pops");
        System.out.println(name + ": contract OK");
    }
    static void check(boolean cond, String what) { if (!cond) throw new AssertionError(what); }

    public static void main(String[] args) {
        verify("ArrayLifoStack", ArrayLifoStack::new);
        verify("BoundedLifoStack(2)", () -> new BoundedLifoStack<>(new ArrayLifoStack<>(), 2));
        verify("BoundedLifoStack(10)", () -> new BoundedLifoStack<>(new ArrayLifoStack<>(), 10));

        LifoStack<String> jobs = new BoundedLifoStack<>(new ArrayLifoStack<>(), 2);
        for (int i = 0; i < 3; i++) System.out.println("push job" + i + " -> " + jobs.push("job" + i));   // true, true, false
        System.out.println("pop -> " + jobs.pop().orElseThrow());                                          // job1
        try { new BoundedLifoStack<>(new ArrayLifoStack<String>(), 0); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
    }
}`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from typing import Callable, Generic, Optional, TypeVar

T = TypeVar("T")


class LifoStack(ABC, Generic[T]):
    @abstractmethod
    def push(self, x: T) -> bool:
        """Contract: returns True and places x on top, or returns False and leaves the stack unchanged."""

    @abstractmethod
    def pop(self) -> Optional[T]: ...

    @abstractmethod
    def peek(self) -> Optional[T]: ...

    @abstractmethod
    def size(self) -> int: ...

    def is_empty(self) -> bool:
        return self.size() == 0


class ArrayLifoStack(LifoStack[T]):  # composition: nothing from list leaks out
    def __init__(self) -> None:
        self._items: list[T] = []

    def push(self, x: T) -> bool:
        if x is None:
            raise ValueError("item required")
        self._items.append(x)
        return True

    def pop(self) -> Optional[T]:
        return self._items.pop() if self._items else None

    def peek(self) -> Optional[T]:
        return self._items[-1] if self._items else None

    def size(self) -> int:
        return len(self._items)


class BoundedLifoStack(LifoStack[T]):  # decorator honouring the same contract
    def __init__(self, inner: LifoStack[T], capacity: int) -> None:
        if capacity <= 0:
            raise ValueError("capacity > 0")
        self._inner = inner
        self._capacity = capacity

    def push(self, x: T) -> bool:
        return self.size() < self._capacity and self._inner.push(x)

    def pop(self) -> Optional[T]:
        return self._inner.pop()

    def peek(self) -> Optional[T]:
        return self._inner.peek()

    def size(self) -> int:
        return self._inner.size()


class LifoStackContract:  # run against EVERY implementation
    @staticmethod
    def verify(name: str, fresh: Callable[[], LifoStack[str]]) -> None:
        check = LifoStackContract.check
        s = fresh()
        check(s.is_empty() and s.pop() is None and s.peek() is None, "empty behaviour")
        check(s.push("A") and s.push("B"), "accepts at least 2 items")
        check(s.peek() == "B" and s.size() == 2, "peek top without removing")
        before = s.size()
        accepted = s.push("C")
        check(s.size() == before + 1 if accepted else s.size() == before and s.peek() == "B",
              "rejected push leaves stack unchanged")
        if accepted:
            check(s.pop() == "C", "LIFO order")
        check(s.pop() == "B" and s.pop() == "A", "LIFO order")
        check(s.is_empty(), "empty after pops")
        print(f"{name}: contract OK")

    @staticmethod
    def check(cond: bool, what: str) -> None:
        if not cond:
            raise AssertionError(what)

    @staticmethod
    def main() -> None:
        LifoStackContract.verify("ArrayLifoStack", ArrayLifoStack)
        LifoStackContract.verify("BoundedLifoStack(2)", lambda: BoundedLifoStack(ArrayLifoStack(), 2))
        LifoStackContract.verify("BoundedLifoStack(10)", lambda: BoundedLifoStack(ArrayLifoStack(), 10))

        jobs: LifoStack[str] = BoundedLifoStack(ArrayLifoStack(), 2)
        for i in range(3):
            print(f"push job{i} -> {str(jobs.push(f'job{i}')).lower()}")  # true, true, false
        print("pop ->", jobs.pop())  # job1
        try:
            BoundedLifoStack(ArrayLifoStack(), 0)
        except ValueError as e:
            print(e)


if __name__ == "__main__":
    LifoStackContract.main()` },
          { lang: 'ts', code: `interface LifoStack<T> {
  /** Contract: returns true and places x on top, or returns false and leaves the stack unchanged. */
  push(x: T): boolean;
  pop(): T | undefined;
  peek(): T | undefined;
  size(): number;
  isEmpty(): boolean; // interfaces have no default methods, so each class provides this one-liner
}

class ArrayLifoStack<T> implements LifoStack<T> { // composition: nothing from Array leaks out
  private readonly items: T[] = [];
  push(x: T): boolean {
    if (x === null || x === undefined) throw new Error("item required");
    this.items.push(x);
    return true;
  }
  pop(): T | undefined { return this.items.pop(); }
  peek(): T | undefined { return this.items[this.items.length - 1]; }
  size(): number { return this.items.length; }
  isEmpty(): boolean { return this.items.length === 0; }
}

class BoundedLifoStack<T> implements LifoStack<T> { // decorator honouring the same contract
  constructor(private readonly inner: LifoStack<T>, private readonly capacity: number) {
    if (capacity <= 0) throw new Error("capacity > 0");
  }
  push(x: T): boolean { return this.size() < this.capacity && this.inner.push(x); }
  pop(): T | undefined { return this.inner.pop(); }
  peek(): T | undefined { return this.inner.peek(); }
  size(): number { return this.inner.size(); }
  isEmpty(): boolean { return this.inner.isEmpty(); }
}

class LifoStackContract { // run against EVERY implementation
  static verify(name: string, fresh: () => LifoStack<string>): void {
    const check = LifoStackContract.check;
    const s = fresh();
    check(s.isEmpty() && s.pop() === undefined && s.peek() === undefined, "empty behaviour");
    check(s.push("A") && s.push("B"), "accepts at least 2 items");
    check(s.peek() === "B" && s.size() === 2, "peek top without removing");
    const before = s.size();
    const accepted = s.push("C");
    check(accepted ? s.size() === before + 1 : s.size() === before && s.peek() === "B", "rejected push leaves stack unchanged");
    if (accepted) check(s.pop() === "C", "LIFO order");
    check(s.pop() === "B" && s.pop() === "A", "LIFO order");
    check(s.isEmpty(), "empty after pops");
    console.log(\`\${name}: contract OK\`);
  }

  static check(cond: boolean, what: string): void {
    if (!cond) throw new Error(what);
  }

  static main(): void {
    LifoStackContract.verify("ArrayLifoStack", () => new ArrayLifoStack<string>());
    LifoStackContract.verify("BoundedLifoStack(2)", () => new BoundedLifoStack(new ArrayLifoStack<string>(), 2));
    LifoStackContract.verify("BoundedLifoStack(10)", () => new BoundedLifoStack(new ArrayLifoStack<string>(), 10));

    const jobs: LifoStack<string> = new BoundedLifoStack(new ArrayLifoStack<string>(), 2);
    for (let i = 0; i < 3; i++) console.log(\`push job\${i} -> \${jobs.push("job" + i)}\`); // true, true, false
    console.log("pop -> " + jobs.pop()); // job1
    try {
      new BoundedLifoStack(new ArrayLifoStack<string>(), 0);
    } catch (e) {
      console.log((e as Error).message);
    }
  }
}
LifoStackContract.main();` },
          { lang: 'cpp', code: `template <class T>
class LifoStack {
public:
    virtual ~LifoStack() = default;
    // Contract: returns true and places x on top, or returns false and leaves the stack unchanged.
    virtual bool push(T x) = 0;
    virtual optional<T> pop() = 0;
    virtual optional<T> peek() const = 0;
    virtual size_t size() const = 0;
    virtual bool isEmpty() const { return size() == 0; }
};

template <class T>
class ArrayLifoStack : public LifoStack<T> {   // composition: nothing from vector leaks out
    vector<T> items_;
public:
    bool push(T x) override { items_.push_back(std::move(x)); return true; }
    optional<T> pop() override {
        if (items_.empty()) return nullopt;
        T top = std::move(items_.back());
        items_.pop_back();
        return top;
    }
    optional<T> peek() const override {
        if (items_.empty()) return nullopt;
        return items_.back();
    }
    size_t size() const override { return items_.size(); }
};

template <class T>
class BoundedLifoStack : public LifoStack<T> {   // decorator honouring the same contract
    unique_ptr<LifoStack<T>> inner_;
    size_t capacity_;
public:
    BoundedLifoStack(unique_ptr<LifoStack<T>> inner, int capacity) : inner_(std::move(inner)) {
        if (capacity <= 0) throw invalid_argument("capacity > 0");
        capacity_ = static_cast<size_t>(capacity);
    }
    bool push(T x) override { return size() < capacity_ && inner_->push(std::move(x)); }
    optional<T> pop() override { return inner_->pop(); }
    optional<T> peek() const override { return inner_->peek(); }
    size_t size() const override { return inner_->size(); }
};

class LifoStackContract {   // run against EVERY implementation
public:
    static void verify(const string& name, const function<unique_ptr<LifoStack<string>>()>& fresh) {
        auto s = fresh();
        check(s->isEmpty() && !s->pop() && !s->peek(), "empty behaviour");
        check(s->push("A") && s->push("B"), "accepts at least 2 items");
        check(s->peek() == "B" && s->size() == 2, "peek top without removing");
        size_t before = s->size();
        bool accepted = s->push("C");
        check(accepted ? s->size() == before + 1 : s->size() == before && s->peek() == "B", "rejected push leaves stack unchanged");
        if (accepted) check(s->pop() == "C", "LIFO order");
        check(s->pop() == "B" && s->pop() == "A", "LIFO order");
        check(s->isEmpty(), "empty after pops");
        cout << name << ": contract OK\\n";
    }
    static void check(bool cond, const string& what) {
        if (!cond) throw runtime_error(what);
    }
};

int main() {
    cout << boolalpha;
    LifoStackContract::verify("ArrayLifoStack", [] { return make_unique<ArrayLifoStack<string>>(); });
    LifoStackContract::verify("BoundedLifoStack(2)", [] {
        return make_unique<BoundedLifoStack<string>>(make_unique<ArrayLifoStack<string>>(), 2);
    });
    LifoStackContract::verify("BoundedLifoStack(10)", [] {
        return make_unique<BoundedLifoStack<string>>(make_unique<ArrayLifoStack<string>>(), 10);
    });

    unique_ptr<LifoStack<string>> jobs = make_unique<BoundedLifoStack<string>>(make_unique<ArrayLifoStack<string>>(), 2);
    for (int i = 0; i < 3; ++i) cout << "push job" << i << " -> " << jobs->push("job" + to_string(i)) << "\\n";   // true, true, false
    cout << "pop -> " << jobs->pop().value() << "\\n";                                                          // job1
    try {
        BoundedLifoStack<string> bad(make_unique<ArrayLifoStack<string>>(), 0);
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";
    }
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

interface ILifoStack<T> {
    /// Contract: returns true and places x on top, or returns false and leaves the stack unchanged.
    bool Push(T x);
    bool TryPop(out T item);
    bool TryPeek(out T item);
    int Count { get; }
}
static class LifoStackExt {
    public static bool IsEmpty<T>(this ILifoStack<T> s) { return s.Count == 0; }
}

class ArrayLifoStack<T> : ILifoStack<T> {                 // composition: nothing from Stack<T> leaks out
    private readonly Stack<T> items = new Stack<T>();
    public bool Push(T x) { if (x == null) throw new ArgumentNullException("x"); items.Push(x); return true; }
    public bool TryPop(out T item) { if (items.Count == 0) { item = default(T); return false; } item = items.Pop(); return true; }
    public bool TryPeek(out T item) { if (items.Count == 0) { item = default(T); return false; } item = items.Peek(); return true; }
    public int Count { get { return items.Count; } }
}

class BoundedLifoStack<T> : ILifoStack<T> {               // decorator honouring the same contract
    private readonly ILifoStack<T> inner; private readonly int capacity;
    public BoundedLifoStack(ILifoStack<T> inner, int capacity) {
        if (capacity <= 0) throw new ArgumentException("capacity > 0");
        this.inner = inner; this.capacity = capacity;
    }
    public bool Push(T x) { return Count < capacity && inner.Push(x); }
    public bool TryPop(out T item) { return inner.TryPop(out item); }
    public bool TryPeek(out T item) { return inner.TryPeek(out item); }
    public int Count { get { return inner.Count; } }
}

static class LifoStackContract {                           // run against EVERY implementation
    static T Top<T>(ILifoStack<T> s) { T x; if (!s.TryPeek(out x)) throw new InvalidOperationException("empty"); return x; }
    static T Popped<T>(ILifoStack<T> s) { T x; if (!s.TryPop(out x)) throw new InvalidOperationException("empty"); return x; }
    public static void Verify(string name, Func<ILifoStack<string>> fresh) {
        ILifoStack<string> s = fresh();
        string ignored;
        Check(s.IsEmpty() && !s.TryPop(out ignored) && !s.TryPeek(out ignored), "empty behaviour");
        Check(s.Push("A") && s.Push("B"), "accepts at least 2 items");
        Check(Top(s) == "B" && s.Count == 2, "peek top without removing");
        int before = s.Count;
        bool accepted = s.Push("C");
        Check(accepted ? s.Count == before + 1 : s.Count == before && Top(s) == "B", "rejected push leaves stack unchanged");
        if (accepted) Check(Popped(s) == "C", "LIFO order");
        Check(Popped(s) == "B" && Popped(s) == "A", "LIFO order");
        Check(s.IsEmpty(), "empty after pops");
        Console.WriteLine(name + ": contract OK");
    }
    static void Check(bool cond, string what) { if (!cond) throw new Exception(what); }
}

class Program {
    static void Main() {
        LifoStackContract.Verify("ArrayLifoStack", () => new ArrayLifoStack<string>());
        LifoStackContract.Verify("BoundedLifoStack(2)", () => new BoundedLifoStack<string>(new ArrayLifoStack<string>(), 2));
        LifoStackContract.Verify("BoundedLifoStack(10)", () => new BoundedLifoStack<string>(new ArrayLifoStack<string>(), 10));

        ILifoStack<string> jobs = new BoundedLifoStack<string>(new ArrayLifoStack<string>(), 2);
        for (int i = 0; i < 3; i++) Console.WriteLine("push job" + i + " -> " + jobs.Push("job" + i).ToString().ToLower());   // true, true, false
        string top; jobs.TryPop(out top);
        Console.WriteLine("pop -> " + top);                                                                                  // job1
        try { new BoundedLifoStack<string>(new ArrayLifoStack<string>(), 0); } catch (ArgumentException e) { Console.WriteLine(e.Message); }
    }
}` }
        ],
      complexity: `<p>All operations O(1) amortised (ArrayDeque). The contract test is O(1) per implementation and catches LSP regressions automatically in CI.</p>`,
      followUps: ['Why does <code>java.util.Stack</code> (extends Vector) violate the same idea, and why does the JDK recommend <code>Deque</code>?', 'A thread-safe stack: decorator around LifoStack or a new implementation? What changes in the contract (blocking vs non-blocking)?', 'How do <code>Queue.add</code> (throws) vs <code>Queue.offer</code> (returns false) relate to this design?']
    }
  });

  practice.push({
    title: 'Testable checkout with inventory, payment and notification ports',
    level: 'Hard', tags: ['DIP', 'ISP', 'SRP', 'hexagonal'], companies: ['Amazon', 'Shopify', 'Zepto', 'Walmart'],
    statement: `<p><code>CheckoutService.checkout(cart)</code> calls the static <code>InventoryDb.reserve(...)</code>, <code>new RazorpayClient(key).charge(...)</code> and <code>new SmtpMailer().send(...)</code>. If payment fails after stock was reserved, the stock is never released. The inventory class exposes 12 methods (stock admin, reports, reservations) to checkout. Redesign with <b>domain-owned ports</b>, a <b>narrow inventory role</b> for checkout, correct <b>compensation</b> on payment failure, and tests with fakes for: success, out of stock, payment declined (stock released), email failure (order still succeeds).</p>`,
    constraints: `<p>Standard library only, no frameworks. A cart has (sku, qty) lines and a total. Reservation is all-or-nothing. Email is best-effort.</p>`,
    example: `<p>Stock {pen: 5}. Cart [pen×2] + payment OK → ${H.c('g', 'CONFIRMED')}, stock 3, email sent. Cart [pen×9] → ${H.c('y', 'OUT_OF_STOCK')}. Cart [pen×2] + decline → ${H.c('r', 'PAYMENT_DECLINED')}, stock back to 5.</p>`,
    brute: {
      why: `<p><b>DIP:</b> static and <code>new</code>-ed vendor clients make the flow untestable and vendor-locked. <b>ISP:</b> checkout depends on a 12-method inventory API. <b>SRP:</b> orchestration, vendor calls and email wording are mixed. The missing compensation bug survived precisely because nobody could test "payment declined" without a real gateway.</p>`,
      code: { lang: 'java', code: `class InventoryDb {                                        // static global, 12 methods in real life
    static final Map<String, Integer> STOCK = new HashMap<>(Map.of("pen", 5));
    static boolean reserve(String sku, int qty) {
        int have = STOCK.getOrDefault(sku, 0);
        if (have < qty) return false;
        STOCK.put(sku, have - qty);
        return true;
    }
}
class RazorpayClient { RazorpayClient(String key) { } boolean charge(double amt) { return amt < 1000; } }
class SmtpMailer { void send(String to, String body) { System.out.println("mail " + to + " " + body); } }

class CheckoutService {
    String checkout(String sku, int qty, double total, String email) {
        if (!InventoryDb.reserve(sku, qty)) return "OUT_OF_STOCK";
        if (!new RazorpayClient("live_key").charge(total)) return "PAYMENT_DECLINED";   // BUG: stock never released
        new SmtpMailer().send(email, "Order confirmed");                               // failure here kills checkout
        return "CONFIRMED";
    }
}`, alt: [
              { lang: 'python', code: `
class InventoryDb:                                         # static global, 12 methods in real life
    STOCK = {"pen": 5}
    @staticmethod
    def reserve(sku, qty):
        have = InventoryDb.STOCK.get(sku, 0)
        if have < qty: return False
        InventoryDb.STOCK[sku] = have - qty
        return True

class RazorpayClient:
    def __init__(self, key): pass
    def charge(self, amt): return amt < 1000

class SmtpMailer:
    def send(self, to, body): print("mail", to, body)

class CheckoutService:
    def checkout(self, sku, qty, total, email):
        if not InventoryDb.reserve(sku, qty): return "OUT_OF_STOCK"
        if not RazorpayClient("live_key").charge(total): return "PAYMENT_DECLINED"   # BUG: stock never released
        SmtpMailer().send(email, "Order confirmed")                                  # failure here kills checkout
        return "CONFIRMED"` },
              { lang: 'ts', code: `
class InventoryDb {                                        // static global, 12 methods in real life
    static readonly STOCK = new Map<string, number>([["pen", 5]]);
    static reserve(sku: string, qty: number): boolean {
        const have = InventoryDb.STOCK.get(sku) ?? 0;
        if (have < qty) return false;
        InventoryDb.STOCK.set(sku, have - qty);
        return true;
    }
}
class RazorpayClient { constructor(key: string) { } charge(amt: number): boolean { return amt < 1000; } }
class SmtpMailer { send(to: string, body: string): void { console.log("mail " + to + " " + body); } }

class CheckoutService {
    checkout(sku: string, qty: number, total: number, email: string): string {
        if (!InventoryDb.reserve(sku, qty)) return "OUT_OF_STOCK";
        if (!new RazorpayClient("live_key").charge(total)) return "PAYMENT_DECLINED";   // BUG: stock never released
        new SmtpMailer().send(email, "Order confirmed");                               // failure here kills checkout
        return "CONFIRMED";
    }
}` },
              { lang: 'cpp', code: `
class InventoryDb {                                        // static global, 12 methods in real life
public:
    static inline unordered_map<string, int> STOCK = {{"pen", 5}};
    static bool reserve(const string& sku, int qty) {
        int have = STOCK.count(sku) ? STOCK[sku] : 0;
        if (have < qty) return false;
        STOCK[sku] = have - qty;
        return true;
    }
};
struct RazorpayClient { RazorpayClient(string key) { } bool charge(double amt) { return amt < 1000; } };
struct SmtpMailer { void send(const string& to, const string& body) { cout << "mail " << to << " " << body << "\\n"; } };

class CheckoutService {
public:
    string checkout(const string& sku, int qty, double total, const string& email) {
        if (!InventoryDb::reserve(sku, qty)) return "OUT_OF_STOCK";
        if (!RazorpayClient("live_key").charge(total)) return "PAYMENT_DECLINED";   // BUG: stock never released
        SmtpMailer().send(email, "Order confirmed");                               // failure here kills checkout
        return "CONFIRMED";
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

static class InventoryDb {                                 // static global, 12 methods in real life
    public static readonly Dictionary<string, int> Stock = new Dictionary<string, int> { { "pen", 5 } };
    public static bool Reserve(string sku, int qty) {
        int have; Stock.TryGetValue(sku, out have);
        if (have < qty) return false;
        Stock[sku] = have - qty;
        return true;
    }
}
class RazorpayClient { public RazorpayClient(string key) { } public bool Charge(double amt) { return amt < 1000; } }
class SmtpMailer { public void Send(string to, string body) { Console.WriteLine("mail " + to + " " + body); } }

class CheckoutService {
    public string Checkout(string sku, int qty, double total, string email) {
        if (!InventoryDb.Reserve(sku, qty)) return "OUT_OF_STOCK";
        if (!new RazorpayClient("live_key").Charge(total)) return "PAYMENT_DECLINED";   // BUG: stock never released
        new SmtpMailer().Send(email, "Order confirmed");                               // failure here kills checkout
        return "CONFIRMED";
    }
}` }
            ] }
    },
    mcq: { q: 'Which inventory interface should checkout depend on?', options: ['A narrow StockReservations port: reserve(lines) and release(lines)', 'The full 12-method InventoryDb', 'A generic Repository&lt;Object&gt;', 'None — call the DB directly from checkout'], answer: 0, explain: 'ISP + DIP: the checkout domain defines the small port it needs, shaped by its use case (reserve/release), and the inventory adapter implements it.' },
    hints: [
      `<p>List what checkout needs from the outside world: reserve stock, release stock, charge money, send a confirmation. Those four verbs are your ports.</p>`,
      `<p><code>StockReservations { boolean reserve(List&lt;Line&gt;); void release(List&lt;Line&gt;); }</code>, <code>PaymentGateway { boolean charge(double, String ref); }</code>, <code>OrderNotifier { void confirmed(Order); }</code>. Inject all three.</p>`,
      `<p>Flow: reserve (all-or-nothing) → charge → on decline release and return → notify inside try/catch (best effort). Fakes: in-memory stock, scripted gateway (approve/decline), notifier that can be told to throw.</p>`
    ],
    tests: { io: true, cases: [{ stdin: '', stdout: "ok success\nok stock reduced\nok email sent\nok out of stock\nok stock untouched\nok declined\nok stock released after decline\nnotify failed, queued for retry: SMTP down\nok email failure tolerated\nok duplicate lines counted together\nok stock untouched after rejected duplicate lines\n" }] },
      solution: {
      approach: `<p><b>Hexagonal checkout.</b> The domain owns three narrow ports (DIP + ISP). <code>CheckoutService</code> orchestrates only (SRP): reserve atomically, charge, compensate by releasing stock on decline, and treat email as best-effort so a mail outage never loses a paid order. Adapters wrap the inventory DB, Razorpay and SMTP in production; in tests, fakes make every branch — including the previously untestable compensation path — run in milliseconds. The bug fix and the design fix are the same move.</p>`,
      code: `record Line(String sku, int qty) {}
record Cart(String customerEmail, List<Line> lines, double total) {}
enum CheckoutStatus { CONFIRMED, OUT_OF_STOCK, PAYMENT_DECLINED }

// ---- ports owned by the checkout domain ----
interface StockReservations { boolean reserve(List<Line> lines); void release(List<Line> lines); }
interface PaymentGateway { boolean charge(double amount, String reference); }
interface OrderNotifier { void confirmed(String email, String orderRef); }

class CheckoutService {
    private final StockReservations stock; private final PaymentGateway payments; private final OrderNotifier notifier;
    private int seq = 0;
    CheckoutService(StockReservations s, PaymentGateway p, OrderNotifier n) { stock = s; payments = p; notifier = n; }

    CheckoutStatus checkout(Cart cart) {
        if (!stock.reserve(cart.lines())) return CheckoutStatus.OUT_OF_STOCK;
        String ref = "ORD-" + (++seq);
        if (!payments.charge(cart.total(), ref)) {
            stock.release(cart.lines());                              // compensation
            return CheckoutStatus.PAYMENT_DECLINED;
        }
        try { notifier.confirmed(cart.customerEmail(), ref); }
        catch (RuntimeException e) { System.out.println("notify failed, queued for retry: " + e.getMessage()); }
        return CheckoutStatus.CONFIRMED;
    }
}

// ---- fakes (an in-memory adapter can also serve local dev) ----
class InMemoryStock implements StockReservations {
    final Map<String, Integer> qty = new HashMap<>();
    InMemoryStock(Map<String, Integer> initial) { qty.putAll(initial); }
    public boolean reserve(List<Line> lines) {
        Map<String, Integer> need = new HashMap<>();                                     // two lines may share a sku
        lines.forEach(l -> need.merge(l.sku(), l.qty(), Integer::sum));
        for (Map.Entry<String, Integer> e : need.entrySet())
            if (qty.getOrDefault(e.getKey(), 0) < e.getValue()) return false;           // check all first: all-or-nothing
        need.forEach((sku, n) -> qty.merge(sku, -n, Integer::sum));
        return true;
    }
    public void release(List<Line> lines) { lines.forEach(l -> qty.merge(l.sku(), l.qty(), Integer::sum)); }
}
class ScriptedGateway implements PaymentGateway {
    private final boolean approve; final List<String> charged = new ArrayList<>();
    ScriptedGateway(boolean approve) { this.approve = approve; }
    public boolean charge(double amount, String ref) { charged.add(ref + ":" + amount); return approve; }
}
class TestNotifier implements OrderNotifier {
    private final boolean fail; final List<String> sent = new ArrayList<>();
    TestNotifier(boolean fail) { this.fail = fail; }
    public void confirmed(String email, String ref) { if (fail) throw new IllegalStateException("SMTP down"); sent.add(email + " " + ref); }
}

class CheckoutTests {
    static Cart cart(int qty) { return new Cart("a@b.com", List.of(new Line("pen", qty)), 20.0 * qty); }
    static void eq(Object a, Object b, String what) { if (!a.equals(b)) throw new AssertionError(what + ": " + a + " != " + b); System.out.println("ok " + what); }

    public static void main(String[] args) {
        InMemoryStock s1 = new InMemoryStock(Map.of("pen", 5)); TestNotifier n1 = new TestNotifier(false);
        eq(new CheckoutService(s1, new ScriptedGateway(true), n1).checkout(cart(2)), CheckoutStatus.CONFIRMED, "success");
        eq(s1.qty.get("pen"), 3, "stock reduced"); eq(n1.sent.size(), 1, "email sent");

        InMemoryStock s2 = new InMemoryStock(Map.of("pen", 5));
        eq(new CheckoutService(s2, new ScriptedGateway(true), new TestNotifier(false)).checkout(cart(9)), CheckoutStatus.OUT_OF_STOCK, "out of stock");
        eq(s2.qty.get("pen"), 5, "stock untouched");

        InMemoryStock s3 = new InMemoryStock(Map.of("pen", 5));
        eq(new CheckoutService(s3, new ScriptedGateway(false), new TestNotifier(false)).checkout(cart(2)), CheckoutStatus.PAYMENT_DECLINED, "declined");
        eq(s3.qty.get("pen"), 5, "stock released after decline");

        InMemoryStock s4 = new InMemoryStock(Map.of("pen", 5));
        eq(new CheckoutService(s4, new ScriptedGateway(true), new TestNotifier(true)).checkout(cart(1)), CheckoutStatus.CONFIRMED, "email failure tolerated");

        InMemoryStock s5 = new InMemoryStock(Map.of("pen", 5));
        Cart twoLines = new Cart("a@b.com", List.of(new Line("pen", 3), new Line("pen", 3)), 120.0);   // 6 pens in total
        eq(new CheckoutService(s5, new ScriptedGateway(true), new TestNotifier(false)).checkout(twoLines), CheckoutStatus.OUT_OF_STOCK, "duplicate lines counted together");
        eq(s5.qty.get("pen"), 5, "stock untouched after rejected duplicate lines");
    }
}`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum


@dataclass(frozen=True)
class Line:
    sku: str
    qty: int


@dataclass(frozen=True)
class Cart:
    customer_email: str
    lines: tuple[Line, ...]
    total: float


class CheckoutStatus(Enum):
    CONFIRMED = "CONFIRMED"
    OUT_OF_STOCK = "OUT_OF_STOCK"
    PAYMENT_DECLINED = "PAYMENT_DECLINED"


# ---- ports owned by the checkout domain ----
class StockReservations(ABC):
    @abstractmethod
    def reserve(self, lines: tuple[Line, ...]) -> bool: ...

    @abstractmethod
    def release(self, lines: tuple[Line, ...]) -> None: ...


class PaymentGateway(ABC):
    @abstractmethod
    def charge(self, amount: float, reference: str) -> bool: ...


class OrderNotifier(ABC):
    @abstractmethod
    def confirmed(self, email: str, order_ref: str) -> None: ...


class CheckoutService:
    def __init__(self, stock: StockReservations, payments: PaymentGateway, notifier: OrderNotifier) -> None:
        self._stock = stock
        self._payments = payments
        self._notifier = notifier
        self._seq = 0

    def checkout(self, cart: Cart) -> CheckoutStatus:
        if not self._stock.reserve(cart.lines):
            return CheckoutStatus.OUT_OF_STOCK
        self._seq += 1
        ref = f"ORD-{self._seq}"
        if not self._payments.charge(cart.total, ref):
            self._stock.release(cart.lines)  # compensation
            return CheckoutStatus.PAYMENT_DECLINED
        try:
            self._notifier.confirmed(cart.customer_email, ref)
        except RuntimeError as e:
            print(f"notify failed, queued for retry: {e}")
        return CheckoutStatus.CONFIRMED


# ---- fakes (an in-memory adapter can also serve local dev) ----
class InMemoryStock(StockReservations):
    def __init__(self, initial: dict[str, int]) -> None:
        self.qty = dict(initial)

    def reserve(self, lines: tuple[Line, ...]) -> bool:
        need: dict[str, int] = {}  # two lines may share a sku
        for l in lines:
            need[l.sku] = need.get(l.sku, 0) + l.qty
        if any(self.qty.get(sku, 0) < n for sku, n in need.items()):  # check all first: all-or-nothing
            return False
        for sku, n in need.items():
            self.qty[sku] = self.qty.get(sku, 0) - n
        return True

    def release(self, lines: tuple[Line, ...]) -> None:
        for l in lines:
            self.qty[l.sku] = self.qty.get(l.sku, 0) + l.qty


class ScriptedGateway(PaymentGateway):
    def __init__(self, approve: bool) -> None:
        self._approve = approve
        self.charged: list[str] = []

    def charge(self, amount: float, reference: str) -> bool:
        self.charged.append(f"{reference}:{amount}")
        return self._approve


class TestNotifier(OrderNotifier):
    __test__ = False  # not a pytest test class

    def __init__(self, fail: bool) -> None:
        self._fail = fail
        self.sent: list[str] = []

    def confirmed(self, email: str, order_ref: str) -> None:
        if self._fail:
            raise RuntimeError("SMTP down")
        self.sent.append(f"{email} {order_ref}")


class CheckoutTests:
    __test__ = False

    @staticmethod
    def cart(qty: int) -> Cart:
        return Cart("a@b.com", (Line("pen", qty),), 20.0 * qty)

    @staticmethod
    def eq(a: object, b: object, what: str) -> None:
        if a != b:
            raise AssertionError(f"{what}: {a} != {b}")
        print(f"ok {what}")

    @staticmethod
    def main() -> None:
        eq, cart = CheckoutTests.eq, CheckoutTests.cart
        s1, n1 = InMemoryStock({"pen": 5}), TestNotifier(False)
        eq(CheckoutService(s1, ScriptedGateway(True), n1).checkout(cart(2)), CheckoutStatus.CONFIRMED, "success")
        eq(s1.qty["pen"], 3, "stock reduced")
        eq(len(n1.sent), 1, "email sent")

        s2 = InMemoryStock({"pen": 5})
        eq(CheckoutService(s2, ScriptedGateway(True), TestNotifier(False)).checkout(cart(9)),
           CheckoutStatus.OUT_OF_STOCK, "out of stock")
        eq(s2.qty["pen"], 5, "stock untouched")

        s3 = InMemoryStock({"pen": 5})
        eq(CheckoutService(s3, ScriptedGateway(False), TestNotifier(False)).checkout(cart(2)),
           CheckoutStatus.PAYMENT_DECLINED, "declined")
        eq(s3.qty["pen"], 5, "stock released after decline")

        s4 = InMemoryStock({"pen": 5})
        eq(CheckoutService(s4, ScriptedGateway(True), TestNotifier(True)).checkout(cart(1)),
           CheckoutStatus.CONFIRMED, "email failure tolerated")

        s5 = InMemoryStock({"pen": 5})
        two_lines = Cart("a@b.com", (Line("pen", 3), Line("pen", 3)), 120.0)  # 6 pens in total
        eq(CheckoutService(s5, ScriptedGateway(True), TestNotifier(False)).checkout(two_lines),
           CheckoutStatus.OUT_OF_STOCK, "duplicate lines counted together")
        eq(s5.qty["pen"], 5, "stock untouched after rejected duplicate lines")


if __name__ == "__main__":
    CheckoutTests.main()` },
          { lang: 'ts', code: `interface Line { readonly sku: string; readonly qty: number; }
interface Cart { readonly customerEmail: string; readonly lines: readonly Line[]; readonly total: number; }
type CheckoutStatus = "CONFIRMED" | "OUT_OF_STOCK" | "PAYMENT_DECLINED";

// ---- ports owned by the checkout domain ----
interface StockReservations {
  reserve(lines: readonly Line[]): boolean;
  release(lines: readonly Line[]): void;
}
interface PaymentGateway { charge(amount: number, reference: string): boolean; }
interface OrderNotifier { confirmed(email: string, orderRef: string): void; }

class CheckoutService {
  private seq = 0;

  constructor(
    private readonly stock: StockReservations,
    private readonly payments: PaymentGateway,
    private readonly notifier: OrderNotifier,
  ) {}

  checkout(cart: Cart): CheckoutStatus {
    if (!this.stock.reserve(cart.lines)) return "OUT_OF_STOCK";
    const ref = \`ORD-\${++this.seq}\`;
    if (!this.payments.charge(cart.total, ref)) {
      this.stock.release(cart.lines); // compensation
      return "PAYMENT_DECLINED";
    }
    try {
      this.notifier.confirmed(cart.customerEmail, ref);
    } catch (e) {
      console.log(\`notify failed, queued for retry: \${(e as Error).message}\`);
    }
    return "CONFIRMED";
  }
}

// ---- fakes (an in-memory adapter can also serve local dev) ----
class InMemoryStock implements StockReservations {
  readonly qty = new Map<string, number>();
  constructor(initial: Record<string, number>) {
    for (const [sku, n] of Object.entries(initial)) this.qty.set(sku, n);
  }
  reserve(lines: readonly Line[]): boolean {
    const need = new Map<string, number>(); // two lines may share a sku
    for (const l of lines) need.set(l.sku, (need.get(l.sku) ?? 0) + l.qty);
    for (const [sku, n] of need) if ((this.qty.get(sku) ?? 0) < n) return false; // check all first: all-or-nothing
    for (const [sku, n] of need) this.qty.set(sku, (this.qty.get(sku) ?? 0) - n);
    return true;
  }
  release(lines: readonly Line[]): void {
    for (const l of lines) this.qty.set(l.sku, (this.qty.get(l.sku) ?? 0) + l.qty);
  }
}
class ScriptedGateway implements PaymentGateway {
  readonly charged: string[] = [];
  constructor(private readonly approve: boolean) {}
  charge(amount: number, ref: string): boolean {
    this.charged.push(\`\${ref}:\${amount}\`);
    return this.approve;
  }
}
class TestNotifier implements OrderNotifier {
  readonly sent: string[] = [];
  constructor(private readonly fail: boolean) {}
  confirmed(email: string, ref: string): void {
    if (this.fail) throw new Error("SMTP down");
    this.sent.push(\`\${email} \${ref}\`);
  }
}

class CheckoutTests {
  static cart(qty: number): Cart {
    return { customerEmail: "a@b.com", lines: [{ sku: "pen", qty }], total: 20.0 * qty };
  }
  static eq(a: unknown, b: unknown, what: string): void {
    if (a !== b) throw new Error(\`\${what}: \${String(a)} != \${String(b)}\`);
    console.log(\`ok \${what}\`);
  }

  static main(): void {
    const { eq, cart } = CheckoutTests;
    const s1 = new InMemoryStock({ pen: 5 }), n1 = new TestNotifier(false);
    eq(new CheckoutService(s1, new ScriptedGateway(true), n1).checkout(cart(2)), "CONFIRMED", "success");
    eq(s1.qty.get("pen"), 3, "stock reduced");
    eq(n1.sent.length, 1, "email sent");

    const s2 = new InMemoryStock({ pen: 5 });
    eq(new CheckoutService(s2, new ScriptedGateway(true), new TestNotifier(false)).checkout(cart(9)), "OUT_OF_STOCK", "out of stock");
    eq(s2.qty.get("pen"), 5, "stock untouched");

    const s3 = new InMemoryStock({ pen: 5 });
    eq(new CheckoutService(s3, new ScriptedGateway(false), new TestNotifier(false)).checkout(cart(2)), "PAYMENT_DECLINED", "declined");
    eq(s3.qty.get("pen"), 5, "stock released after decline");

    const s4 = new InMemoryStock({ pen: 5 });
    eq(new CheckoutService(s4, new ScriptedGateway(true), new TestNotifier(true)).checkout(cart(1)), "CONFIRMED", "email failure tolerated");

    const s5 = new InMemoryStock({ pen: 5 });
    const twoLines: Cart = { customerEmail: "a@b.com", lines: [{ sku: "pen", qty: 3 }, { sku: "pen", qty: 3 }], total: 120.0 }; // 6 pens in total
    eq(new CheckoutService(s5, new ScriptedGateway(true), new TestNotifier(false)).checkout(twoLines), "OUT_OF_STOCK", "duplicate lines counted together");
    eq(s5.qty.get("pen"), 5, "stock untouched after rejected duplicate lines");
  }
}
CheckoutTests.main();` },
          { lang: 'cpp', code: `struct Line { string sku; int qty; };
struct Cart { string customerEmail; vector<Line> lines; double total; };
enum class CheckoutStatus { Confirmed, OutOfStock, PaymentDeclined };

// ---- ports owned by the checkout domain ----
class StockReservations {
public:
    virtual ~StockReservations() = default;
    virtual bool reserve(const vector<Line>& lines) = 0;
    virtual void release(const vector<Line>& lines) = 0;
};
class PaymentGateway {
public:
    virtual ~PaymentGateway() = default;
    virtual bool charge(double amount, const string& reference) = 0;
};
class OrderNotifier {
public:
    virtual ~OrderNotifier() = default;
    virtual void confirmed(const string& email, const string& orderRef) = 0;
};

class CheckoutService {
    StockReservations& stock_;   // non-owning: the caller wires and owns the adapters
    PaymentGateway& payments_;
    OrderNotifier& notifier_;
    int seq_ = 0;
public:
    CheckoutService(StockReservations& s, PaymentGateway& p, OrderNotifier& n) : stock_(s), payments_(p), notifier_(n) {}

    CheckoutStatus checkout(const Cart& cart) {
        if (!stock_.reserve(cart.lines)) return CheckoutStatus::OutOfStock;
        string ref = "ORD-" + to_string(++seq_);
        if (!payments_.charge(cart.total, ref)) {
            stock_.release(cart.lines);   // compensation
            return CheckoutStatus::PaymentDeclined;
        }
        try {
            notifier_.confirmed(cart.customerEmail, ref);
        } catch (const runtime_error& e) {
            cout << "notify failed, queued for retry: " << e.what() << "\\n";
        }
        return CheckoutStatus::Confirmed;
    }
};

// ---- fakes (an in-memory adapter can also serve local dev) ----
class InMemoryStock : public StockReservations {
public:
    map<string, int> qty;
    explicit InMemoryStock(map<string, int> initial) : qty(std::move(initial)) {}
    bool reserve(const vector<Line>& lines) override {
        map<string, int> need;   // two lines may share a sku
        for (const Line& l : lines) need[l.sku] += l.qty;
        for (const auto& [sku, n] : need) {
            auto it = qty.find(sku);
            if ((it == qty.end() ? 0 : it->second) < n) return false;   // check all first: all-or-nothing
        }
        for (const auto& [sku, n] : need) qty[sku] -= n;
        return true;
    }
    void release(const vector<Line>& lines) override {
        for (const Line& l : lines) qty[l.sku] += l.qty;
    }
};
class ScriptedGateway : public PaymentGateway {
    bool approve_;
public:
    vector<string> charged;
    explicit ScriptedGateway(bool approve) : approve_(approve) {}
    bool charge(double amount, const string& ref) override {
        charged.push_back(ref + ":" + to_string(amount));
        return approve_;
    }
};
class TestNotifier : public OrderNotifier {
    bool fail_;
public:
    vector<string> sent;
    explicit TestNotifier(bool fail) : fail_(fail) {}
    void confirmed(const string& email, const string& ref) override {
        if (fail_) throw runtime_error("SMTP down");
        sent.push_back(email + " " + ref);
    }
};

class CheckoutTests {
public:
    static Cart cart(int qty) { return {"a@b.com", {{"pen", qty}}, 20.0 * qty}; }

    template <class A, class B>
    static void eq(const A& a, const B& b, const string& what) {
        if (!(a == b)) throw runtime_error(what + ": values differ");
        cout << "ok " << what << "\\n";
    }
};

int main() {
    InMemoryStock s1({{"pen", 5}});
    ScriptedGateway pay1(true);
    TestNotifier n1(false);
    CheckoutTests::eq(CheckoutService(s1, pay1, n1).checkout(CheckoutTests::cart(2)), CheckoutStatus::Confirmed, "success");
    CheckoutTests::eq(s1.qty["pen"], 3, "stock reduced");
    CheckoutTests::eq(n1.sent.size(), size_t{1}, "email sent");

    InMemoryStock s2({{"pen", 5}});
    ScriptedGateway pay2(true);
    TestNotifier n2(false);
    CheckoutTests::eq(CheckoutService(s2, pay2, n2).checkout(CheckoutTests::cart(9)), CheckoutStatus::OutOfStock, "out of stock");
    CheckoutTests::eq(s2.qty["pen"], 5, "stock untouched");

    InMemoryStock s3({{"pen", 5}});
    ScriptedGateway pay3(false);
    TestNotifier n3(false);
    CheckoutTests::eq(CheckoutService(s3, pay3, n3).checkout(CheckoutTests::cart(2)), CheckoutStatus::PaymentDeclined, "declined");
    CheckoutTests::eq(s3.qty["pen"], 5, "stock released after decline");

    InMemoryStock s4({{"pen", 5}});
    ScriptedGateway pay4(true);
    TestNotifier n4(true);
    CheckoutTests::eq(CheckoutService(s4, pay4, n4).checkout(CheckoutTests::cart(1)), CheckoutStatus::Confirmed, "email failure tolerated");

    InMemoryStock s5({{"pen", 5}});
    ScriptedGateway pay5(true);
    TestNotifier n5(false);
    Cart twoLines{"a@b.com", {{"pen", 3}, {"pen", 3}}, 120.0};   // 6 pens in total
    CheckoutTests::eq(CheckoutService(s5, pay5, n5).checkout(twoLines), CheckoutStatus::OutOfStock, "duplicate lines counted together");
    CheckoutTests::eq(s5.qty["pen"], 5, "stock untouched after rejected duplicate lines");
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

sealed class Line {
    public readonly string Sku; public readonly int Qty;
    public Line(string sku, int qty) { Sku = sku; Qty = qty; }
}
sealed class Cart {
    public readonly string CustomerEmail; public readonly List<Line> Lines; public readonly double Total;
    public Cart(string customerEmail, List<Line> lines, double total) { CustomerEmail = customerEmail; Lines = lines; Total = total; }
}
enum CheckoutStatus { CONFIRMED, OUT_OF_STOCK, PAYMENT_DECLINED }

// ---- ports owned by the checkout domain ----
interface IStockReservations { bool Reserve(List<Line> lines); void Release(List<Line> lines); }
interface IPaymentGateway { bool Charge(double amount, string reference); }
interface IOrderNotifier { void Confirmed(string email, string orderRef); }

class CheckoutService {
    private readonly IStockReservations stock; private readonly IPaymentGateway payments; private readonly IOrderNotifier notifier;
    private int seq = 0;
    public CheckoutService(IStockReservations s, IPaymentGateway p, IOrderNotifier n) { stock = s; payments = p; notifier = n; }

    public CheckoutStatus Checkout(Cart cart) {
        if (!stock.Reserve(cart.Lines)) return CheckoutStatus.OUT_OF_STOCK;
        string reference = "ORD-" + (++seq);
        if (!payments.Charge(cart.Total, reference)) {
            stock.Release(cart.Lines);                                // compensation
            return CheckoutStatus.PAYMENT_DECLINED;
        }
        try { notifier.Confirmed(cart.CustomerEmail, reference); }
        catch (Exception e) { Console.WriteLine("notify failed, queued for retry: " + e.Message); }
        return CheckoutStatus.CONFIRMED;
    }
}

// ---- fakes (an in-memory adapter can also serve local dev) ----
class InMemoryStock : IStockReservations {
    public readonly Dictionary<string, int> Qty = new Dictionary<string, int>();
    public InMemoryStock(Dictionary<string, int> initial) { foreach (var kv in initial) Qty[kv.Key] = kv.Value; }
    public bool Reserve(List<Line> lines) {
        Dictionary<string, int> need = new Dictionary<string, int>();                     // two lines may share a sku
        foreach (Line l in lines) { int n; need.TryGetValue(l.Sku, out n); need[l.Sku] = n + l.Qty; }
        foreach (var e in need) { int have; Qty.TryGetValue(e.Key, out have); if (have < e.Value) return false; }   // check all first: all-or-nothing
        foreach (var e in need) Qty[e.Key] -= e.Value;
        return true;
    }
    public void Release(List<Line> lines) { foreach (Line l in lines) { int n; Qty.TryGetValue(l.Sku, out n); Qty[l.Sku] = n + l.Qty; } }
}
class ScriptedGateway : IPaymentGateway {
    private readonly bool approve; public readonly List<string> Charged = new List<string>();
    public ScriptedGateway(bool approve) { this.approve = approve; }
    public bool Charge(double amount, string reference) { Charged.Add(reference + ":" + amount); return approve; }
}
class TestNotifier : IOrderNotifier {
    private readonly bool fail; public readonly List<string> Sent = new List<string>();
    public TestNotifier(bool fail) { this.fail = fail; }
    public void Confirmed(string email, string reference) { if (fail) throw new InvalidOperationException("SMTP down"); Sent.Add(email + " " + reference); }
}

class Program {
    static Cart MakeCart(int qty) { return new Cart("a@b.com", new List<Line> { new Line("pen", qty) }, 20.0 * qty); }
    static Dictionary<string, int> Pens(int n) { return new Dictionary<string, int> { { "pen", n } }; }
    static void Eq(object a, object b, string what) { if (!a.Equals(b)) throw new Exception(what + ": " + a + " != " + b); Console.WriteLine("ok " + what); }

    static void Main() {
        InMemoryStock s1 = new InMemoryStock(Pens(5)); TestNotifier n1 = new TestNotifier(false);
        Eq(new CheckoutService(s1, new ScriptedGateway(true), n1).Checkout(MakeCart(2)), CheckoutStatus.CONFIRMED, "success");
        Eq(s1.Qty["pen"], 3, "stock reduced"); Eq(n1.Sent.Count, 1, "email sent");

        InMemoryStock s2 = new InMemoryStock(Pens(5));
        Eq(new CheckoutService(s2, new ScriptedGateway(true), new TestNotifier(false)).Checkout(MakeCart(9)), CheckoutStatus.OUT_OF_STOCK, "out of stock");
        Eq(s2.Qty["pen"], 5, "stock untouched");

        InMemoryStock s3 = new InMemoryStock(Pens(5));
        Eq(new CheckoutService(s3, new ScriptedGateway(false), new TestNotifier(false)).Checkout(MakeCart(2)), CheckoutStatus.PAYMENT_DECLINED, "declined");
        Eq(s3.Qty["pen"], 5, "stock released after decline");

        InMemoryStock s4 = new InMemoryStock(Pens(5));
        Eq(new CheckoutService(s4, new ScriptedGateway(true), new TestNotifier(true)).Checkout(MakeCart(1)), CheckoutStatus.CONFIRMED, "email failure tolerated");

        InMemoryStock s5 = new InMemoryStock(Pens(5));
        Cart twoLines = new Cart("a@b.com", new List<Line> { new Line("pen", 3), new Line("pen", 3) }, 120.0);   // 6 pens in total
        Eq(new CheckoutService(s5, new ScriptedGateway(true), new TestNotifier(false)).Checkout(twoLines), CheckoutStatus.OUT_OF_STOCK, "duplicate lines counted together");
        Eq(s5.Qty["pen"], 5, "stock untouched after rejected duplicate lines");
    }
}` }
        ],
      complexity: `<p>O(lines) per checkout. Four business scenarios verified in milliseconds; vendor swaps (Razorpay → Stripe, SMTP → SES) are new adapters only.</p>`,
      followUps: ['Payment times out (unknown result) — how do idempotency keys and a status query port change the flow?', 'Two checkouts race for the last pen — where does the atomicity guarantee belong (adapter/DB), and how does the port contract express it?', 'Move notifications to an event (OrderConfirmed) published to a queue: which class changes?']
    }
  });

  /* ======================= QUIZ ======================= */
  quiz.push(
    { q: 'In Uncle Bob\'s modern wording, SRP means a module should be responsible to…', options: ['One actor (one group of people who request changes)', 'One method', 'One database table', 'One developer'], answer: 0, explain: '"A module should be responsible to one, and only one, actor." A class with many methods can still follow SRP if they all change for the same stakeholder.' },
    { q: 'A <code>DiscountCalculator</code> has a <code>switch</code> on customer type that grows every month. Which principle is most directly violated?', options: ['Open/Closed', 'Liskov Substitution', 'Interface Segregation', 'Dependency Inversion'], answer: 0, explain: 'Each new discount modifies tested code. Replace the conditional with polymorphism (a <code>DiscountPolicy</code> per type) so new types are added, not edited in.' },
    { q: '<code>Square extends Rectangle</code> overrides <code>setWidth</code> to also set the height. Client code expecting area = w × h breaks. This violates…', options: ['Liskov Substitution', 'Single Responsibility', 'Open/Closed', 'Interface Segregation'], answer: 0, explain: 'The subclass breaks the behavioural contract of the parent ("setWidth changes only width"), so it is not substitutable.' },
    { q: 'Which of these is a classic smell of an Interface Segregation violation?', options: ['Implementations that throw a "not supported" error (<code>UnsupportedOperationException</code> in Java, <code>NotImplementedError</code> in Python) for methods they cannot support', 'A class with a private helper method', 'An interface with one method', 'Using generics in an interface'], answer: 0, explain: 'Forced, fake implementations mean the interface is too fat for some implementers. Split it into role interfaces.' },
    { q: 'In the Dependency Inversion Principle, who should own (define) the <code>OrderRepository</code> interface?', options: ['The high-level domain module that uses it', 'The MySQL adapter package', 'The JDBC driver vendor', 'A shared utils module used by everyone'], answer: 0, explain: 'The abstraction is shaped by the client\'s needs and lives with the policy; low-level details depend on it. That is what "inversion" refers to.' },
    { q: 'What is the relationship between DIP and Dependency Injection (DI)?', options: ['DI (passing dependencies in) is a technique often used to achieve DIP', 'They are exactly the same thing', 'DI forbids interfaces', 'DIP requires a framework like Spring'], answer: 0, explain: 'DIP is the principle (depend on abstractions). DI is how you supply the concrete implementation from outside. IoC containers automate DI. You can do DI with plain constructors.' },
    { q: 'A subclass method requires <code>amount ≤ 1000</code> while the parent accepted any positive amount. In LSP terms this…', options: ['Strengthens a precondition — not allowed', 'Weakens a precondition — allowed', 'Strengthens a postcondition — allowed', 'Has nothing to do with LSP'], answer: 0, explain: 'Subtypes may accept <i>more</i> (weaker preconditions) and promise <i>more</i> (stronger postconditions), never less. Demanding more from callers breaks parent-based clients.' },
    { q: 'Which change best applies DIP to code that reads the current date inside a business rule (<code>LocalDate.now()</code>, <code>date.today()</code>, <code>new Date()</code>)?', options: ['Inject a clock abstraction (Java\'s <code>Clock</code>, a function that returns now) and read the date from it', 'Wrap the call in try/catch', 'Make the method static', 'Cache today\'s date in a static field'], answer: 0, explain: 'Time is a volatile, non-deterministic dependency. A clock abstraction is the standard fix (Java\'s <code>Clock</code>, or an injected function that returns now); tests pass <code>Clock.fixed(...)</code>.' },
    { q: 'You have exactly one implementation of a payment interface, no plans for another, and no testing need for a fake. Strongest design advice?', options: ['Consider a concrete class for now (YAGNI); extract an interface when a real need appears', 'Always add an interface plus an abstract factory', 'Use reflection to load implementations', 'Duplicate the class just in case'], answer: 0, explain: 'SOLID responds to real or clearly expected change. Interfaces with one implementation and no test seam are needless complexity; IDEs extract interfaces in seconds when needed.' },
    { q: 'Sealed types with exhaustive pattern matching (Java 21 <code>sealed</code> + <code>switch</code>, a TypeScript discriminated union, C++ <code>std::variant</code>) are available. When is that a better fit than polymorphic classes (Strategy)?', options: ['When the set of types is fixed but new operations are added often', 'When new types are added every week by different teams', 'Never — switches always violate OCP', 'Only for primitive types'], answer: 0, explain: 'This is the expression problem. Polymorphism makes adding types cheap; sealed + switch makes adding operations cheap with compiler-checked exhaustiveness. Pick by the axis of change.' },
    { q: 'An <code>OfficeMachine</code> implements <code>Printer</code>, <code>Scanner</code> and <code>Fax</code>. A <code>PrintQueue</code> constructor should accept…', options: ['A <code>Printer</code>', 'An <code>OfficeMachine</code>', 'An <code>Object</code>', 'All three interfaces as separate parameters'], answer: 0, explain: 'Depend on the narrowest role you use. PrintQueue then works with any printer and is unaffected by fax/scan changes.' },
    { q: 'Which statement about a Facade and SRP is correct?', options: ['A facade with many methods that only delegate (no business logic) does not violate SRP', 'Any class with more than 5 methods violates SRP', 'Facades must contain all business rules', 'Facades are forbidden by SOLID'], answer: 0, explain: 'A facade offers a convenient entry point and has no reason to change except "expose a new operation". A God class, by contrast, contains logic for many actors.' }
  );

  /* ======================= INTERVIEW ======================= */
  interview.push(
    { q: 'What are the SOLID principles? Explain each in one or two sentences with an example.', level: 'B', a: `<p><b>S</b> — Single Responsibility: one reason to change (one actor). An <code>Invoice</code> should not also print and email itself. <b>O</b> — Open/Closed: add behaviour by adding code, not editing tested code; new discount = new <code>DiscountPolicy</code> class. <b>L</b> — Liskov Substitution: subtypes must keep the parent's promises; a <code>Penguin</code> that throws from <code>fly()</code> breaks code written for <code>Bird</code>. <b>I</b> — Interface Segregation: clients should not depend on methods they do not use; split <code>Machine</code> into <code>Printer</code>, <code>Scanner</code>, <code>Fax</code>. <b>D</b> — Dependency Inversion: business logic depends on abstractions it owns (<code>OrderRepository</code>), and MySQL/SMTP adapters implement them. Together they keep changes local and code testable.</p>`, followUps: ['Which one gives the biggest win in a typical legacy codebase?', 'Who coined the acronym and when?'] },
    { q: 'Is SRP the same as "a class should do only one thing"?', level: 'B', a: `<p>No. "Do one thing" applies to <b>functions</b>. SRP is about <b>reasons to change</b>: a class should be responsible to one actor. A <code>ShoppingCart</code> with add, remove, total and itemCount does several things but all change for the same reason (cart rules), so it follows SRP. An <code>Employee</code> with <code>calculatePay</code> (finance), <code>reportHours</code> (HR) and <code>save</code> (DBA) violates it even if each method is tiny. The danger is shared code between actors — HR edits a helper and payroll silently changes. Over-splitting by method destroys cohesion, the opposite smell.</p>`, followUps: ['How do you identify actors in a requirement?', 'What is accidental duplication and why should you sometimes keep it?'] },
    { q: 'How do you achieve the Open/Closed Principle in an object-oriented language? Give a concrete refactoring.', level: 'I', a: `<p>Identify the axis of change (e.g. payment methods), extract an interface for the varying behaviour (<code>PaymentMethod { String code(); double charge(double amt); }</code>), move each <code>if/case</code> branch into its own implementing class, and let the caller hold a <code>Map&lt;String, PaymentMethod&gt;</code> built from an injected list. New method = new class + one wiring line in the composition root (or zero with Spring's <code>List&lt;PaymentMethod&gt;</code> injection or <code>ServiceLoader</code>). Patterns delivering OCP: Strategy, Decorator, Template Method, Observer, plugins. Note OCP is strategic: you choose which changes to be closed against, based on real variation.</p>`, followUps: ['Is the one wiring line a violation of OCP?', 'When would you keep a switch instead (sealed types)?'] },
    { q: 'Explain the Liskov Substitution Principle using contracts. What exactly is a subclass allowed to change?', level: 'I', a: `<p>A subtype must be usable anywhere the supertype is expected without breaking correctness. In Design-by-Contract terms a subclass may: <b>weaken preconditions</b> (accept more inputs), <b>strengthen postconditions</b> (promise more), and must <b>preserve invariants</b> and the history constraint (not allow state changes the parent forbids). It must not throw new kinds of exceptions clients do not expect. Compilers check only signatures (in Java: visibility, checked exceptions, covariant returns) — behaviour is on you. Square/Rectangle, read-only collections throwing on <code>add</code>, and <code>Timestamp extends Date</code> breaking equals symmetry are classic examples. Enforce it with <b>contract tests</b> run against all implementations.</p>`, followUps: ['How do covariant return types relate to LSP?', 'Is <code>Collections.unmodifiableList</code> an LSP violation?'] },
    { q: 'How would you fix the Square/Rectangle problem? Give at least two options.', level: 'I', a: `<p>(1) <b>Siblings under a smaller abstraction</b>: <code>interface Shape { double area(); }</code> with <code>Rectangle</code> and <code>Square</code> both implementing it; code needing independent width/height asks for <code>Rectangle</code> specifically. (2) <b>Immutability</b>: records with no setters — <code>Rectangle withWidth(w)</code> returns a new object; with no mutators, there is no promise to break, and a <code>Square</code> can offer <code>toRectangle()</code>. (3) Model squareness as a <b>query</b>: one <code>Rectangle</code> with <code>isSquare()</code>. Avoid the anti-fix of <code>instanceof</code> checks in clients — that spreads knowledge of subclasses everywhere and breaks OCP.</p>`, followUps: ['Why is "a square is a rectangle in math" not enough in code?', 'How would a contract test catch this?'] },
    { q: 'What is the difference between ISP and SRP? Can a class follow one and violate the other?', level: 'I', a: `<p>SRP looks at a class from the <b>inside</b>: why would it change, for which actor? ISP looks from the <b>client's side</b>: what does each caller or implementer have to depend on? A cohesive <code>OfficeMachine</code> can follow SRP (one hardware team owns it) yet violate ISP if it is exposed only through one fat <code>Machine</code> interface that a print queue must depend on. Fix: keep the class, expose role interfaces (<code>Printer</code>, <code>Scanner</code>, <code>Fax</code>). Conversely, a God class may expose narrow interfaces to each client (ISP fine) while still mixing actors internally (SRP broken).</p>`, followUps: ['What are header interfaces vs role interfaces?', 'How small is too small for an interface?'] },
    { q: 'DIP vs Dependency Injection vs Inversion of Control — explain the differences.', level: 'I', a: `<p><b>DIP</b> is a design principle: high-level policy and low-level details both depend on abstractions, and the abstraction is owned by the policy side. <b>Dependency Injection</b> is a technique: an object receives its collaborators (constructor, setter, method parameter) instead of creating them with <code>new</code>. <b>IoC</b> is a broader idea: the framework controls the flow and object lifecycle (Spring container, servlet container calling your code); DI containers are one IoC form. You can use DI without DIP (injecting a concrete <code>JdbcTemplate</code> into domain code) and DIP without a container (wire in <code>main</code> — the composition root). Constructor injection is preferred: explicit, immutable, testable.</p>`, followUps: ['What is a composition root?', 'Why is the Service Locator considered an anti-pattern?'] },
    { q: 'Here is a class that creates a MySQL connection and an HTTP client inside its methods. How do you make it unit-testable without a mocking framework?', level: 'B', a: `<p>Apply DIP in small steps: (1) identify every external dependency — database, HTTP, time, randomness, environment variables; (2) define domain-owned interfaces for them in business terms (<code>OrderRepository.save(Order)</code>, <code>RatesProvider.rateFor(currency)</code>) and use a clock abstraction (Java\'s <code>java.time.Clock</code>) for time; (3) inject them through the constructor; (4) write tiny hand-made fakes — an in-memory map repository, a fixed-rate provider, <code>Clock.fixed</code>; (5) move all <code>new</code>s to a composition root. Tests now run in milliseconds and cover edge cases (declines, timeouts, midnight) deterministically. Keep a few integration tests per adapter against the real system.</p>`, followUps: ['When are mocks better than fakes?', 'How do you ensure fakes behave like the real adapters (LSP)?'] },
    { q: 'Can SOLID be over-applied? How do you decide when to add an abstraction?', level: 'A', a: `<p>Yes. Interfaces with one implementation everywhere, factories of factories and deep layering create <b>needless complexity</b>: more files, more indirection, slower onboarding, and no protection against real change. My rules: add an abstraction when (a) there is a <b>proven axis of change</b> (rule of three: third variation), (b) a dependency is <b>volatile or non-deterministic</b> (vendor, I/O, time) and needs a test seam, or (c) a <b>plugin/extension requirement</b> exists. Otherwise write a concrete class and refactor later — IDE refactorings are cheap if the code is tested. In interviews, state the trade-off explicitly: "I'm adding a PricingStrategy because rates vary by vehicle type and the interviewer hinted at weekend pricing."</p>`, followUps: ['What is YAGNI and how does it interact with OCP?', 'Name a criticism of SOLID (e.g. CUPID) and your view.'] },
    { q: 'How would you refactor a 3,000-line legacy God class towards SOLID without breaking production?', level: 'A', a: `<p>(1) Pin behaviour with <b>characterization tests</b> (golden-master style if needed). (2) Find seams: apply DIP first — inject DB/HTTP/time so the class becomes testable. (3) Use git history and method-field clustering to find <b>actors</b>; Extract Class per actor, leaving the old class as a temporary <b>facade</b> that delegates so callers do not change (strangler pattern). (4) Replace type switches with polymorphism where variation is real. (5) Split fat interfaces as clients migrate. (6) Add contract tests for new hierarchies. Ship every step as a small, reviewed, reversible commit behind feature flags if behaviour risk exists; measure with coverage and mutation testing.</p>`, followUps: ['How do you find hidden actors using git log?', 'What is the strangler fig pattern at class level?'] },
    { q: 'In a Parking Lot machine-coding round, where do SOLID principles show up?', level: 'I', a: `<p><b>SRP:</b> separate <code>SpotAllocator</code>, <code>TicketService</code>, <code>PricingPolicy</code>, <code>PaymentProcessor</code>, <code>DisplayBoard</code>. <b>OCP:</b> new vehicle types, pricing rules (weekend, EV charging) and payment methods are new classes — pricing decorators and payment strategies. <b>LSP:</b> every <code>Vehicle</code> subtype fits the spot-matching contract; an EV that needs a charger is modelled via spot features, not by throwing. <b>ISP:</b> display boards get a read-only <code>AvailabilityView</code>; admins get <code>SpotAdmin</code>. <b>DIP:</b> <code>ParkingService</code> depends on <code>PaymentGateway</code>, <code>Clock</code> and repositories via constructor injection, so the interviewer's "now add weekend pricing" becomes a 5-minute addition.</p>`, followUps: ['How would you support multiple floors with nearest-spot allocation?', 'Where do you handle concurrency on spot allocation?'] },
    { q: 'How does SOLID relate to design patterns and to hexagonal/clean architecture?', level: 'A', a: `<p>Patterns are reusable <b>implementations</b> of the principles. Strategy, Decorator, Observer and Template Method realise OCP; Adapter and Abstract Factory support DIP; Facade keeps SRP-split subsystems convenient; Composite and Null Object help LSP-friendly hierarchies. <b>Hexagonal architecture</b> (ports and adapters) is DIP at application scale: the domain defines ports (interfaces), adapters for DB, HTTP, messaging implement them, and dependencies point inward. Clean architecture adds SRP-driven layers (entities, use cases, interface adapters, frameworks) with the Dependency Rule: source code dependencies only point inward. Package principles (Common Closure, Common Reuse, Acyclic Dependencies, Stable Abstractions) are SOLID applied to modules.</p>`, followUps: ['Which pattern would you use to add retries around a payment adapter?', 'How do you enforce the dependency rule in your build (ArchUnit, import-linter, dependency-cruiser, module boundaries)?'] },
    { q: 'How do you use AI coding assistants without letting them erode SOLID in your codebase?', level: 'E', a: `<p>AI tends to produce the shortest diff: another <code>case</code> in a switch, an inline <code>new VendorClient()</code>, an override that throws "not supported", or a 40-method header interface. I counter that by (1) giving it the <b>design constraints</b> in the prompt (ports, where interfaces live, "add a new strategy class rather than editing X"); (2) reviewing AI diffs against a SOLID checklist and asking it to justify each new abstraction — and to say which are <i>not</i> worth adding; (3) encoding rules as automated checks (ArchUnit: domain must not import infra; Sonar rules for switch size and class size) so agents get fast feedback; (4) using AI for the mechanical parts — usage analysis for ISP splits, generating fakes and contract tests, extracting classes once I choose the seams. Design judgement — actors, axes of change, dosage — stays with humans.</p>`, followUps: ['Which architectural rules would you automate first?', 'How would you wrap an LLM call behind a port and test the business flow?'] }
  );

  /* ---------- vary the position of correct answers (authored with the answer first) ---------- */
  function rotate(m, k) {
    if (!m || !Array.isArray(m.options)) return;
    var n = m.options.length, s = ((k % n) + n) % n;
    if (!s) return;
    var correct = m.options[m.answer];
    m.options = m.options.slice(n - s).concat(m.options.slice(0, n - s));
    m.answer = m.options.indexOf(correct);
  }
  quiz.forEach(function (q, i) { rotate(q, i * 3 + 1); });
  var allProblems = practice.slice();
  topics.forEach(function (t) { (t.problems || []).forEach(function (p) { allProblems.push(p); }); });
  allProblems.forEach(function (p, i) { rotate(p.mcq, i * 3 + 2); });

  /* ---- python / TypeScript / C++ versions of the Java code panes (same lines, so hl and "line N" narration still match) ---- */
  ALTS[T1_GOD] = mkAlt(`class OrderManager:
    def place_order(self, item, price, email):
        tax = price * 0.18          # tax rule
        total = price + tax
        sql = ("INSERT INTO orders VALUES('"
            + item + "'," + str(total) + ")")    # database
        print("MySQL> " + sql)
        pdf = "%PDF " + item + " " + str(total)  # invoice
        print("SMTP to " + email
            + ": " + pdf)                  # email
        return total`, `class OrderManager {
  placeOrder(item: string, price: number, email: string): number {
    const tax = price * 0.18;          // tax rule
    const total = price + tax;
    const sql = "INSERT INTO orders VALUES('"
        + item + "'," + total + ")";    // database
    console.log("MySQL> " + sql);
    const pdf = "%PDF " + item + " " + total; // invoice
    console.log("SMTP to " + email
        + ": " + pdf);                  // email
    return total;
  }
}`, `class OrderManager {
public:
  double placeOrder(string item, double price, string email) {
    double tax = price * 0.18;          // tax rule
    double total = price + tax;
    string sql = "INSERT INTO orders VALUES('"
        + item + "'," + to_string(total) + ")";    // database
    cout << "MySQL> " << sql << endl;
    string pdf = "%PDF " + item + " " + to_string(total); // invoice
    cout << "SMTP to " << email
        << ": " << pdf << endl;         // email
    return total;
  }
};`, { cpp: { 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 11 } });
  ALTS[T1_CLEAN] = mkAlt(`class OrderService:
    tax: TaxPolicy
    repo: OrderRepository
    renderer: InvoiceRenderer
    notifier: Notifier
    def __init__(self, t: TaxPolicy, r: OrderRepository,
                 v: InvoiceRenderer, n: Notifier):
        self.tax, self.repo, self.renderer, self.notifier = t, r, v, n

    def place_order(self, item, price, email):
        total = price + self.tax.on(price)
        self.repo.save(item, total)
        self.notifier.send(email, self.renderer.render(item, total))
        return total`, `class OrderService {
  private readonly tax: TaxPolicy;
  private readonly repo: OrderRepository;
  private readonly renderer: InvoiceRenderer;
  private readonly notifier: Notifier;
  constructor(t: TaxPolicy, r: OrderRepository,
              v: InvoiceRenderer, n: Notifier) {
    this.tax = t; this.repo = r; this.renderer = v; this.notifier = n;
  }
  placeOrder(item: string, price: number, email: string): number {
    const total = price + this.tax.on(price);
    this.repo.save(item, total);
    this.notifier.send(email, this.renderer.render(item, total));
    return total;
  }
}`, `class OrderService {
  TaxPolicy& tax;
  OrderRepository& repo;
  InvoiceRenderer& renderer;
  Notifier& notifier;
public: OrderService(TaxPolicy& t, OrderRepository& r,
               InvoiceRenderer& v, Notifier& n)
    : tax(t), repo(r), renderer(v), notifier(n) {}

  double placeOrder(string item, double price, string email) {
    double total = price + tax.on(price);
    repo.save(item, total);
    notifier.send(email, renderer.render(item, total));
    return total;
  }
};`);
  ALTS[T2_BAD] = mkAlt(`class Employee:
    def __init__(self, name, rate, hours): self.name, self.rate, self.hours = name, rate, hours
    # Accounting (CFO) owns this
    def calculate_pay(self):
        return self.regular_hours() * self.rate

    # HR (COO) owns this
    def report_hours(self):
        return self.name + ": " + str(self.regular_hours()) + "h"

    # DBA (CTO) owns this
    def save(self):
        print("UPDATE emp ...")

    # shared helper: whose rule is it?
    def regular_hours(self):
        return min(self.hours, 40)`, `class Employee {
  name = ""; rate = 0; hours = 0;
  // Accounting (CFO) owns this
  calculatePay(): number {
    return this.regularHours() * this.rate;
  }
  // HR (COO) owns this
  reportHours(): string {
    return this.name + ": " + this.regularHours() + "h";
  }
  // DBA (CTO) owns this
  save(): void {
    console.log("UPDATE emp ...");
  }
  // shared helper: whose rule is it?
  regularHours(): number {
    return Math.min(this.hours, 40);
  }
}`, `class Employee {
public: string name; double rate; int hours;
  // Accounting (CFO) owns this
  double calculatePay() {
    return regularHours() * rate;
  }
  // HR (COO) owns this
  string reportHours() {
    return name + ": " + to_string(regularHours()) + "h";
  }
  // DBA (CTO) owns this
  void save() {
    cout << "UPDATE emp ..." << endl;
  }
  // shared helper: whose rule is it?
  int regularHours() {
    return min(hours, 40);
  }
};`);
  ALTS[T2_GOOD] = mkAlt(`@dataclass(frozen=True)
class EmployeeData: name: str; rate: float; hours: int

class PayCalculator:          # Accounting
    def pay(self, e):
        return min(e.hours, 40) * e.rate


class HourReporter:           # HR
    def report(self, e):
        return e.name + ": " + str(e.hours) + "h"


class EmployeeRepository:     # DBA
    def save(self, e):
        print("UPDATE emp ...")`, `interface EmployeeData { readonly name: string;
                      readonly rate: number; readonly hours: number; }

class PayCalculator {          // Accounting
  pay(e: EmployeeData): number {
    return Math.min(e.hours, 40) * e.rate;
  }
}
class HourReporter {           // HR
  report(e: EmployeeData): string {
    return e.name + ": " + e.hours + "h";
  }
}
class EmployeeRepository {     // DBA
  save(e: EmployeeData): void {
    console.log("UPDATE emp ...");
  }
}`, `struct EmployeeData { string name;
                      double rate; int hours; };

struct PayCalculator {          // Accounting
  double pay(const EmployeeData& e) {
    return min(e.hours, 40) * e.rate;
  }
};
struct HourReporter {           // HR
  string report(const EmployeeData& e) {
    return e.name + ": " + to_string(e.hours) + "h";
  }
};
struct EmployeeRepository {     // DBA
  void save(const EmployeeData& e) {
    cout << "UPDATE emp ..." << endl;
  }
};`);
  ALTS[T3_BAD] = mkAlt(`class DiscountCalculator:
    def discount(self, type, amt):
        match type:
            case "REGULAR":  return 0
            case "PREMIUM":  return amt * 0.10
            case "EMPLOYEE": return amt * 0.30
            case _: raise ValueError(type)`, `class DiscountCalculator {
  discount(type: string, amt: number): number {
    switch (type) {
      case "REGULAR":  return 0;
      case "PREMIUM":  return amt * 0.10;
      case "EMPLOYEE": return amt * 0.30;
      default: throw new Error(type);
    }
  }
}`, `struct DiscountCalculator {
  double discount(const string& type, double amt) {
    // C++ cannot switch on a string: an if-chain
    if (type == "REGULAR")  return 0;
    if (type == "PREMIUM")  return amt * 0.10;
    if (type == "EMPLOYEE") return amt * 0.30;
    throw invalid_argument(type);
  }
};`);
  ALTS[T3_GOOD] = mkAlt(`class DiscountPolicy(ABC):
    @abstractmethod
    def discount(self, amt): pass
class Premium(DiscountPolicy):
    def discount(self, a): return a * 0.10

class Employee(DiscountPolicy):
    def discount(self, a): return a * 0.30

class Checkout:
    rules: dict[str, DiscountPolicy]
    def __init__(self, rules):
        self.rules = dict(rules)

    def pay(self, type, amt):
        p = self.rules.get(type, SimpleNamespace(discount=lambda a: 0))
        return amt - p.discount(amt)


# adding FESTIVE = one NEW class + one map entry:
class Festive(DiscountPolicy):
    def discount(self, a): return a * 0.20
    # nothing above was edited`, `interface DiscountPolicy {
  discount(amt: number): number;
}
class Premium implements DiscountPolicy {
  discount(a: number): number { return a * 0.10; }
}
class Employee implements DiscountPolicy {
  discount(a: number): number { return a * 0.30; }
}
class Checkout {
  private readonly rules: Map<string, DiscountPolicy>;
  constructor(rules: Map<string, DiscountPolicy>) {
    this.rules = new Map(rules);
  }
  pay(type: string, amt: number): number {
    const p = this.rules.get(type) ?? { discount: (a: number) => 0 };
    return amt - p.discount(amt);
  }
}
// adding FESTIVE = one NEW class + one map entry:
class Festive implements DiscountPolicy {
  discount(a: number): number { return a * 0.20; }
}`, `struct DiscountPolicy {
  virtual ~DiscountPolicy() = default; virtual double discount(double amt) const = 0;
};
struct Premium : DiscountPolicy {
  double discount(double a) const override { return a * 0.10; }
};
struct Employee : DiscountPolicy {
  double discount(double a) const override { return a * 0.30; }
};
class Checkout {
  map<string, shared_ptr<DiscountPolicy>> rules;
public: Checkout(map<string, shared_ptr<DiscountPolicy>> r)
    : rules(r) {}

  double pay(const string& type, double amt) {
    double d = rules.count(type) ? rules.at(type)->discount(amt) : 0;   // unknown type: no discount
    return amt - d;
  }
};
// adding FESTIVE = one NEW class + one map entry:
struct Festive : DiscountPolicy {
  double discount(double a) const override { return a * 0.20; }
};`);
  ALTS[T4_CLIENT] = mkAlt(`class Rectangle:
    w = h = 0
    def set_width(self, w): self.w = w
    def set_height(self, h): self.h = h
    def area(self): return self.w * self.h

class Square(Rectangle):
    def set_width(self, s): self.w = self.h = s
    def set_height(self, s): self.w = self.h = s

# client written against Rectangle's promise
def stretch(r):
    r.set_width(5)
    r.set_height(4)
    check(r.area() == 20)`, `class Rectangle {
  protected w = 0; protected h = 0;
  setWidth(w: number): void { this.w = w; }
  setHeight(h: number): void { this.h = h; }
  area(): number { return this.w * this.h; }
}
class Square extends Rectangle {
  override setWidth(s: number): void { this.w = s; this.h = s; }
  override setHeight(s: number): void { this.w = s; this.h = s; }
}
// client written against Rectangle's promise
function stretch(r: Rectangle): void {
  r.setWidth(5);
  r.setHeight(4);
  check(r.area() === 20);
}`, `class Rectangle {
protected: int w = 0, h = 0;
public: virtual void setWidth(int w)  { this->w = w; }
  virtual void setHeight(int h) { this->h = h; }
  int area() { return w * h; }
};
class Square : public Rectangle {
public: void setWidth(int s) override  { w = s; h = s; }
  void setHeight(int s) override { w = s; h = s; }
};
// client written against Rectangle's promise
void stretch(Rectangle& r) {
  r.setWidth(5);
  r.setHeight(4);
  check(r.area() == 20);
}`);
  ALTS['void stretch(Rectangle r) {\n  if (r instanceof Square) return; // hack\n  r.setWidth(5);\n  r.setHeight(4);\n}'] = mkAlt(`def stretch(r):
    if isinstance(r, Square): return  # hack
    r.set_width(5)
    r.set_height(4)`, `function stretch(r: Rectangle): void {
  if (r instanceof Square) return; // hack
  r.setWidth(5);
  r.setHeight(4);
}`, `void stretch(Rectangle& r) {
  if (dynamic_cast<Square*>(&r)) return; // hack
  r.setWidth(5);
  r.setHeight(4);
}`);
  ALTS['abstract class Bird { abstract void fly(); }\nclass Penguin extends Bird {\n  void fly() { throw new UnsupportedOperationException(); }\n}\n// client\nfor (Bird b : birds) b.fly();'] = mkAlt(`class Bird(ABC):
    @abstractmethod
    def fly(self): pass
class Penguin(Bird):
    def fly(self): raise NotImplementedError()
# client
for b in birds: b.fly()`, `abstract class Bird { abstract fly(): void; }
class Penguin extends Bird {
  fly(): void { throw new Error("unsupported"); }
}
// client
for (const b of birds) b.fly();`, `struct Bird { virtual void fly() = 0; };
struct Penguin : Bird {
  void fly() override { throw logic_error("unsupported"); }
};
// client
for (Bird* b : birds) b->fly();`, { python: { 1: 3, 3: 5, 6: 7 } });
  ALTS['interface Bird { void eat(); }\ninterface FlyingBird extends Bird { void fly(); }\nclass Sparrow implements FlyingBird { ... }\nclass Penguin implements Bird { ... }\n// client asks for exactly what it needs\nfor (FlyingBird b : flyers) b.fly();'] = mkAlt(`class Bird(ABC):
    @abstractmethod
    def eat(self): pass
class FlyingBird(Bird):
    @abstractmethod
    def fly(self): pass
class Sparrow(FlyingBird):    # implements eat() and fly()
    def eat(self): print("eat")
    def fly(self): print("fly")
class Penguin(Bird):          # implements only eat()
    def eat(self): print("eat")
# client asks for exactly what it needs
for b in flyers: b.fly()`, `interface Bird { eat(): void }
interface FlyingBird extends Bird { fly(): void }
class Sparrow implements FlyingBird { eat() { console.log("eat"); } fly() { console.log("fly"); } }
class Penguin implements Bird { eat() { console.log("eat"); } }
// client asks for exactly what it needs
for (const b of flyers) b.fly();`, `struct Bird { virtual void eat() = 0; virtual ~Bird() = default; };
struct FlyingBird : Bird { virtual void fly() = 0; };
struct Sparrow : FlyingBird { void eat() override { cout << "eat\\n"; } void fly() override { cout << "fly\\n"; } };
struct Penguin : Bird { void eat() override { cout << "eat\\n"; } };
// client asks for exactly what it needs
for (FlyingBird* b : flyers) b->fly();`, { python: { 2: 4, 4: 10, 6: 13 } });
  ALTS[T5_BAD] = mkAlt(`class Machine:
    def print(self, doc): raise NotImplementedError
    def scan(self, doc): raise NotImplementedError
    def fax(self, doc, number): raise NotImplementedError

class BasicPrinter(Machine):
    def print(self, d): print(d)
    def scan(self, d):
        raise NotImplementedError()

    def fax(self, d, n):
        raise NotImplementedError()
`, `interface Machine {
  print(doc: string): void;
  scan(doc: string): void;
  fax(doc: string, number: string): void;
}
class BasicPrinter implements Machine {
  print(d: string): void { console.log(d); }
  scan(d: string): void {
    throw new Error("unsupported");
  }
  fax(d: string, n: string): void {
    throw new Error("unsupported");
  }
}`, `struct Machine {
  virtual void print(const string& doc) = 0;
  virtual void scan(const string& doc) = 0;
  virtual void fax(const string& doc, const string& number) = 0;
};
struct BasicPrinter : Machine {
  void print(const string& d) override { cout << d << endl; }
  void scan(const string& d) override {
    throw logic_error("unsupported");
  }
  void fax(const string& d, const string& n) override {
    throw logic_error("unsupported");
  }
};`);
  ALTS[T5_GOOD] = mkAlt(`class Printer(Protocol): print: Callable[[str], None]
class Scanner(Protocol): scan: Callable[[str], str]
class Fax(Protocol): fax: Callable[[str, str], None]

class BasicPrinter(Printer):
    def print(self, d): print(d)

class OfficeMachine(Printer, Scanner, Fax):
    def print(self, d): print(d)
    def scan(self, d): return "scan:" + d
    def fax(self, d, n): print(n)

class PrintQueue:               # needs printing only
    printer: Printer
    def __init__(self, p): self.printer = p
`, `interface Printer { print(doc: string): void; }
interface Scanner { scan(doc: string): string; }
interface Fax { fax(doc: string, number: string): void; }

class BasicPrinter implements Printer {
  print(d: string): void { console.log(d); }
}
class OfficeMachine implements Printer, Scanner, Fax {
  print(d: string): void { console.log(d); }
  scan(d: string): string { return "scan:" + d; }
  fax(d: string, n: string): void { console.log(n); }
}
class PrintQueue {               // needs printing only
  private readonly printer: Printer;
  constructor(p: Printer) { this.printer = p; }
}`, `struct Printer { virtual void print(const string& doc) = 0; };
struct Scanner { virtual string scan(const string& doc) = 0; };
struct Fax { virtual void fax(const string& doc, const string& number) = 0; };

struct BasicPrinter : Printer {
  void print(const string& d) override { cout << d << endl; }
};
struct OfficeMachine : Printer, Scanner, Fax {
  void print(const string& d) override { cout << d << endl; }
  string scan(const string& d) override { return "scan:" + d; }
  void fax(const string& d, const string& n) override { cout << n << endl; }
};
class PrintQueue {               // needs printing only
  Printer& printer;
public: PrintQueue(Printer& p) : printer(p) {}
};`);
  ALTS[T6_BAD] = mkAlt(`class OrderService:
    def __init__(self):
        self._repo = MySqlOrderRepository("mysql://prod")
        self._mailer = SmtpMailer("smtp.company.com")

    def place(self, o):
        self._repo.insert(o)
        self._mailer.send(o.email, "Order placed")`, `class OrderService {
  private readonly repo =
      new MySqlOrderRepository("mysql://prod");
  private readonly mailer =
      new SmtpMailer("smtp.company.com");

  place(o: Order): void {
    this.repo.insert(o);
    this.mailer.send(o.email(), "Order placed");
  }
}`, `class OrderService {
  MySqlOrderRepository repo =
      MySqlOrderRepository("mysql://prod");
  SmtpMailer mailer =
      SmtpMailer("smtp.company.com");

public: void place(Order& o) {
    repo.insert(o);
    mailer.send(o.email(), "Order placed");
  }
};`, { python: { 2: 3, 3: 3, 4: 4, 5: 4, 7: 6, 8: 7, 9: 8 } });
  ALTS[T6_GOOD] = mkAlt(`# owned by the DOMAIN (high-level) package
class OrderRepository(Protocol): save: Callable[[Order], None]
class Notifier(Protocol): notify: Callable[[str, str], None]

class OrderService:
    _repo: OrderRepository
    _notifier: Notifier
    def __init__(self, r: OrderRepository, n: Notifier):
        self._repo, self._notifier = r, n          # injected

    def place(self, o):
        self._repo.save(o)
        self._notifier.notify(o.email, "Order placed")


# infrastructure (low-level) implements domain's interface
class MySqlOrderRepository(OrderRepository):
    def save(self, o): pass   # JDBC-style insert`, `// owned by the DOMAIN (high-level) package
interface OrderRepository { save(o: Order): void; }
interface Notifier { notify(to: string, msg: string): void; }

class OrderService {
  private readonly repo: OrderRepository;
  private readonly notifier: Notifier;
  constructor(r: OrderRepository, n: Notifier) {
    this.repo = r; this.notifier = n;          // injected
  }
  place(o: Order): void {
    this.repo.save(o);
    this.notifier.notify(o.email(), "Order placed");
  }
}
// infrastructure (low-level) implements domain's interface
class MySqlOrderRepository implements OrderRepository {
  save(o: Order): void { /* JDBC insert */ }
}`, `// owned by the DOMAIN (high-level) package
struct OrderRepository { virtual void save(Order& o) = 0; };
struct Notifier { virtual void notify(const string& to, const string& msg) = 0; };

class OrderService {
  OrderRepository& repo;
  Notifier& notifier;
public: OrderService(OrderRepository& r, Notifier& n)
    : repo(r), notifier(n) {}          // injected

  void place(Order& o) {
    repo.save(o);
    notifier.notify(o.email(), "Order placed");
  }
};
// infrastructure (low-level) implements domain's interface
struct MySqlOrderRepository : OrderRepository {
  void save(Order& o) override { /* JDBC insert */ }
};`);
  ALTS[T7_BAD] = mkAlt(`class ReportService:
    def __init__(self): self._db = MySqlSales()
    def run(self, format, email):
        sales = self._db.query("SELECT * FROM sales")
        total = 0.0
        for s in sales: total += s.amount()
        out = None
        if format == "CSV": out = to_csv(sales, total)
        elif format == "PDF": out = to_pdf(sales, total)
        else: raise ValueError(format)
        SmtpClient().send(email, out)
        return out


class ScreenReportService(ReportService):
    def run(self, format, email):
        raise NotImplementedError("no email")


class Exporter:
    csv = pdf = None      # csv(s), pdf(s): abstract
    xlsx = html = None    # xlsx(s), html(s): abstract
    # one fat interface for every client`, `class ReportService {
  private readonly db = new MySqlSales();
  run(format: string, email: string): string {
    const sales: Sale[] = this.db.query("SELECT * FROM sales");
    let total = 0;
    for (const s of sales) total += s.amount();
    let out: string;
    if (format === "CSV") out = toCsv(sales, total);
    else if (format === "PDF") out = toPdf(sales, total);
    else throw new Error(format);
    new SmtpClient().send(email, out);
    return out;
  }
}
class ScreenReportService extends ReportService {
  override run(format: string, email: string): string {
    throw new Error("no email");
  }
}
interface Exporter {
  csv(s: Sale[]): string; pdf(s: Sale[]): string;
  xlsx(s: Sale[]): string; html(s: Sale[]): string;
}`, `class ReportService {
  MySqlSales db;
public: virtual string run(const string& format, const string& email) {
    vector<Sale> sales = db.query("SELECT * FROM sales");
    double total = 0;
    for (auto& s : sales) total += s.amount();
    string out;
    if (format == "CSV") out = toCsv(sales, total);
    else if (format == "PDF") out = toPdf(sales, total);
    else throw invalid_argument(format);
    SmtpClient().send(email, out);
    return out;
  }
};
class ScreenReportService : public ReportService {
public: string run(const string& format, const string& email) override {
    throw logic_error("no email");
  }
};
struct Exporter {
  virtual string csv(const vector<Sale>& s) = 0; virtual string pdf(const vector<Sale>& s) = 0;
  virtual string xlsx(const vector<Sale>& s) = 0; virtual string html(const vector<Sale>& s) = 0;
};`);

  registerModule({
    id: 'lld02',
    title: 'SOLID Principles',
    intro: `<p>Code that works today is the easy part. The hard part is the <b>next change</b>: a new payment method, a new tax rule, a new database, a test that must run in milliseconds. This module teaches the five <b>SOLID</b> principles — <b>S</b>ingle Responsibility, <b>O</b>pen/Closed, <b>L</b>iskov Substitution, <b>I</b>nterface Segregation and <b>D</b>ependency Inversion — the toolkit every LLD interviewer silently grades you on.</p>
<p>For every principle you will see a <b>real bad design</b> (shown in Java, with Python, TypeScript and C++ tabs on every code block), learn to <b>smell</b> the problem, watch the <b>ripple of a change</b> spread class by class in animated class diagrams (red arrows = violating dependencies, green = fixed), and step through a <b>refactor</b> line by line into a clean design. Then you practise like an interviewer tests you: "which principle is violated?", "refactor this code", and full multi-principle reviews — plus when <i>not</i> to apply SOLID, and how AI assistants change the picture.</p>`,
    goals: [
      'Explain each SOLID principle in one plain sentence, with its classic bad design, the smell, and the refactored design',
      'Spot violations in unfamiliar code fast — God classes, growing switches, "unsupported" overrides, fat interfaces, <code>new</code> inside business logic — and name the principle',
      'Refactor safely in small steps: extract class by actor, replace conditional with polymorphism, split role interfaces, inject domain-owned ports, verify with contract tests',
      'Make business logic unit-testable with hand-written fakes and an injected <code>Clock</code>, and explain DIP vs DI vs IoC',
      'Judge the dosage: argue when an abstraction pays off (rule of three, volatile dependencies) and when it is over-engineering',
      'Use SOLID as a review lens for AI-generated code and in machine-coding rounds (Parking Lot, notifications, checkout)'
    ],
    prereqs: `<p>LLD 1 (OOP Modelling &amp; UML) — classes, interfaces, inheritance vs composition, reading class diagrams. Comfortable Java basics: interfaces, records, generics, lambdas, <code>Map</code>/<code>List</code> (Java track modules 1–6 or equivalent). No framework knowledge needed.</p>`,
    hours: 12,
    langNotes: {
      java: `<p><b>Role interfaces vs abstract classes.</b> An <code>interface</code> is the natural SOLID seam: a class implements many (ISP), tests pass a fake, and a lambda can implement a one-method interface. Keep abstract classes for shared state and a fixed algorithm skeleton. Be careful with <code>default</code> methods: they let you grow an interface without breaking implementers, but a default that throws <code>UnsupportedOperationException</code> is an LSP lie. Put <code>@Override</code> on every implementing method so a signature typo becomes a compile error instead of a new method. <b>Closed sets and capability checks.</b> <code>sealed</code> interfaces with <code>record</code>s and an exhaustive <code>switch</code> give OCP the other way round (fixed types, open operations); <code>instanceof</code> is fine at one boundary to discover an optional capability (a <code>Dimmable</code> device) and a smell inside business rules. <b>Equality and hashing.</b> Registries keyed by a code such as <code>"CARD"</code> need stable keys; value objects (money, coupons, line items) should be <code>record</code>s so <code>equals</code>, <code>hashCode</code> and <code>toString</code> are correct. <b>Immutability.</b> <code>final</code> fields, <code>List.copyOf</code> and <code>Map.copyOf</code> in constructors stop callers from changing a strategy list after injection. <b>Injection and time.</b> Constructor injection with <code>Objects.requireNonNull</code>; pass a <code>java.time.Clock</code> (<code>Clock.fixed</code> in tests) instead of calling <code>now()</code>. <b>Numbers.</b> Money belongs in <code>BigDecimal</code> (set the scale and <code>RoundingMode.HALF_UP</code> explicitly) or <code>long</code> minor units; <code>int</code> overflow wraps silently and <code>double</code> rounds.</p>`,
      python: `<p><b>Role interfaces vs abstract classes.</b> Use <code>abc.ABC</code> with <code>@abstractmethod</code> for a nominal interface (a class that forgets a method cannot be instantiated), and <code>typing.Protocol</code> when any object with the right methods should fit, which is ISP with no inheritance at all. Mark a Protocol <code>@runtime_checkable</code> only if you need <code>isinstance</code> to discover a capability. Python never checks substitutability at run time: a subclass that raises <code>NotImplementedError</code> is accepted silently, so lean on mypy or pyright and on shared contract tests (a base test class run for every implementation). An abstract property such as <code>code</code> can be satisfied by a plain class attribute (<code>code = "CARD"</code>). <b>Closed sets.</b> A union of frozen dataclasses with <code>match</code> and <code>assert_never</code> gives an exhaustive check under a type checker. <b>Equality and hashing.</b> <code>@dataclass(frozen=True)</code> generates <code>__eq__</code> and <code>__hash__</code>, which is what you want for value objects and dictionary keys; defining <code>__eq__</code> by hand removes <code>__hash__</code>. <b>Immutability.</b> Frozen dataclasses, tuples (<code>tuple(self._items)</code> as a read-only snapshot) and <code>dict(policies)</code> copies in the constructor. <b>Injection and time.</b> Plain constructor parameters; a <code>Callable</code> is the one-method interface (<code>Callable[[Order], float]</code>), and a clock is just a function that returns <code>datetime</code>. <b>Numbers.</b> Integers never overflow; for money use <code>Decimal</code> with <code>quantize(..., ROUND_HALF_UP)</code>, because <code>round()</code> rounds halves to even and <code>float</code> cannot hold 0.1 exactly.</p>`,
      js: `<p><b>TypeScript.</b> <b>Role interfaces vs abstract classes.</b> An <code>interface</code> is erased at run time, so it is the cheapest SOLID seam: any object with the right methods fits (types are structural), which makes an object literal a perfectly good fake. The price is that you cannot ask "does this object implement <code>Dimmable</code>?" at run time; write a type guard that tests for the method (<code>typeof d.setBrightness === "function"</code>) and keep it at one boundary. Interfaces have no default methods, so share code with a function or an <code>abstract class</code>. Turn on <code>strict</code> and <code>noImplicitOverride</code> so a mistyped override is an error. <b>Closed sets.</b> A discriminated union (<code>kind: "success" | "failure"</code>) with a <code>switch</code> is checked for exhaustiveness by the compiler. <b>Equality and hashing.</b> <code>===</code> compares object identity, and <code>Map</code> and <code>Set</code> use it too, so key registries by a string code (<code>"CARD"</code>) and give value objects an <code>equals</code> method or compare fields. <b>Immutability.</b> <code>readonly</code> and <code>ReadonlyArray</code> exist only at compile time; copy in constructors (<code>new Map(policies)</code>, <code>[...items]</code>) or <code>Object.freeze</code> when you must enforce it. <b>Injection and time.</b> Constructor parameter properties (<code>constructor(private readonly repo: OrderRepository) {}</code>) are the shortest way to inject; a function type is the one-method interface; inject a <code>() =&gt; Date</code> instead of calling <code>new Date()</code>. <b>Numbers.</b> <code>number</code> is a double: keep money in integer cents, round with <code>Math.round</code> (halves round up), and format with <code>toFixed(2)</code>.</p>`,
      cpp: `<p><b>Role interfaces vs abstract classes.</b> An interface is a class of pure virtual functions (<code>= 0</code>), and it must have a <b>virtual destructor</b> (<code>virtual ~Shape() = default;</code>), otherwise deleting a derived object through a base pointer is undefined behaviour. Mark every implementation <code>override</code> so a signature mismatch fails to compile, and use <code>final</code> to forbid further subclassing. A class that implements two roles (<code>LampSpeaker : public Dimmable, public MusicPlayer</code>) whose roles share a base needs <b>virtual inheritance</b> to avoid two copies of that base. <b>Closed sets and capability checks.</b> <code>std::variant</code> with <code>std::visit</code> is the exhaustive closed set; <code>dynamic_cast</code> (which needs a polymorphic base) discovers an optional capability at one boundary. <b>Ownership and lifetimes.</b> Injection is an ownership decision: take a <code>std::unique_ptr&lt;Port&gt;</code> when the service owns the dependency, a reference when the caller owns it and outlives the service (the composition root in <code>main</code>), and <code>std::shared_ptr</code> only when several owners really exist (a test keeps a handle on a fake the service also holds). Never copy a polymorphic object by value: <code>Rectangle r = square;</code> slices off the derived part, which is a quiet LSP bug. <b>Equality and immutability.</b> Value objects are plain structs with <code>const</code> members or <code>bool operator==(const T&amp;) const = default;</code>; return <code>const T&amp;</code> from getters instead of exposing a mutable collection. <b>One-method interfaces and time.</b> <code>std::function</code> or a template parameter replaces a single-method interface; inject a clock (<code>std::chrono</code> time points) rather than calling <code>now()</code>. <b>Numbers and names.</b> Signed overflow is undefined behaviour, so use <code>long long</code> cents; <code>delete</code>, <code>register</code> and <code>new</code> are keywords and cannot be method names (this module uses <code>remove</code> and <code>add</code>); the standard library has no SHA-256, so the registration example carries a small implementation.</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
