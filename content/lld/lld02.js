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
  function CODE(label, code, hl) { return { type: 'code', label: label, lang: 'java', code: code, hl: hl || {} }; }
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
      [G(label, nodes, edges, { hl: clone(hl), ehl: clone(ehl), tags: { } , h: h }), { type: 'vars', label: 'damage so far', vals: { classesTouched: 1 }, hl: { classesTouched: 'cur' } }]));
    while (q.length) {
      var cur = q.shift();
      edges.forEach(function (e) {
        if (e[1] === cur && !seen[e[0]]) {
          seen[e[0]] = true; q.push(e[0]); order.push(e[0]);
          var h2 = clone(hl); h2[e[0]] = 'cur'; h2[cur] = cls;
          var eh = clone(ehl); eh[e[0] + '-' + e[1]] = cls;
          frames.push(F('<b>' + names[e[0]] + '</b> depends on <b>' + names[cur] + '</b> (arrow ' + names[e[0]] + ' → ' + names[cur] + '), so the change ripples into it. ' +
            (cls === 'bad' ? '<span class="c-r">One more file to edit and re-test.</span>' : 'It only uses a stable abstraction, so a quick re-test is enough.'),
            [G(label, nodes, edges, { hl: h2, ehl: eh, h: h }), { type: 'vars', label: 'damage so far', vals: { classesTouched: order.length }, hl: { classesTouched: cls === 'bad' ? 'bad' : 'ok' } }]));
          hl[e[0]] = cls; ehl[e[0] + '-' + e[1]] = cls;
        }
      });
      hl[cur] = cls;
    }
    var fin = clone(hl);
    frames.push(F('Ripple finished: <b>' + order.length + ' of ' + nodes.length + '</b> classes touched (' + order.map(function (id) { return names[id]; }).join(', ') + '). ' +
      (cls === 'bad' ? '<span class="c-r">Big blast radius = rigid, fragile design.</span>' : '<span class="c-g">Small blast radius = the design absorbed the change.</span>'),
      [G(label, nodes, edges, { hl: fin, ehl: clone(ehl), h: h }), { type: 'vars', label: 'final damage', vals: { classesTouched: order.length, totalClasses: nodes.length }, hl: { classesTouched: cls === 'bad' ? 'bad' : 'ok' } }]));
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
}` }, { lang: 'java', title: 'After: each concern behind its own small interface (SOLID preview)', code: `interface TaxPolicy { double on(double price); }
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
}` }],
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
        return refactorFrames('OrderManager.java', [
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
      { title: 'Immobility: cannot reuse the discount logic in the mobile backend', html: `<p>The discount rules lived inside a servlet that read <code>HttpServletRequest</code> and opened a JDBC connection. The new mobile API wanted the same rules but could not use them without dragging the web layer and MySQL along. ${H.c('g', 'DIP fix')}: a pure <code>DiscountPolicy</code> class with inputs and outputs only (no web, no DB) — reusable anywhere and testable in plain JUnit.</p>`, code: `interface DiscountPolicy { double discountFor(double cartTotal, int loyaltyYears); }
class LoyaltyDiscount implements DiscountPolicy {
    public double discountFor(double cartTotal, int loyaltyYears) {
        return cartTotal * Math.min(0.10, loyaltyYears * 0.02);   // 2% per year, max 10%
    }
}` }
    ],
    deepDive: `<p><b>Where SOLID came from.</b> The ideas are older than the acronym: Bertrand Meyer described Open/Closed in 1988 (<i>Object-Oriented Software Construction</i>), Barbara Liskov gave the substitution keynote in 1987 (formalised with Jeannette Wing in 1994), and Robert C. Martin wrote "Design Principles and Design Patterns" (2000). Michael Feathers coined S-O-L-I-D around 2004. Martin's later book <i>Clean Architecture</i> (2017) re-frames SRP around <b>actors</b> (the people or groups who request changes).</p>
<p><b>Why "dependency direction" is the real story.</b> Every arrow in a class diagram is a path along which change can travel. The <b>Stable Dependencies Principle</b> says: depend in the direction of stability. Interfaces that rarely change are stable; MySQL drivers, PDF libraries and HTTP clients change often. If your core business rules point at volatile details, every vendor update ripples into the core. SOLID — especially OCP and DIP — flips those arrows so volatile details depend on stable policies.</p>
<p><b>Measuring it (production reality).</b> Tools compute <i>afferent coupling</i> Ca (who depends on me), <i>efferent coupling</i> Ce (whom I depend on) and <i>instability</i> I = Ce / (Ca + Ce). Example: OrderManager above has Ca = 3 (three screens) and Ce = 3 (MySQL, PDF, SMTP), so I = 3/6 = 0.5 — half-stable, half-volatile: the worst place for business rules. Code review tools (SonarQube, ArchUnit tests in Java) can fail a build when, say, <code>domain</code> packages import <code>java.sql</code>. Teams also track "change coupling" from git history: files that always change together but live far apart reveal hidden SRP violations.</p>
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
<p><b>The refactor:</b> split by actor. Keep shared <b>data</b> in a plain object (a Java <code>record</code>), and give each actor its own class: <code>PayCalculator</code>, <code>HourReporter</code>, <code>EmployeeRepository</code>. If callers want one entry point, add a thin <b>Facade</b> that only delegates.</p>`,
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
}` }, { lang: 'java', title: 'After: one class per actor, shared data in a record, optional facade', code: `record EmployeeData(String name, double hourlyRate, int hoursThisWeek) {}

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
}` }],
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
      { title: 'Logging frameworks get SRP right', html: `<p>Logback/Log4j separate <b>what</b> to log (Logger + level), <b>how it looks</b> (Layout/Encoder: JSON, pattern) and <b>where it goes</b> (Appender: console, file, Kafka). Ops can move logs from files to a cloud collector by changing the appender without touching any formatting code; a security team can mask fields in the layout without touching appenders.</p>`, code: `interface LogLayout   { String format(String level, String msg); }
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
}` },
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
      constraints: `<p>Plain Java 21, no frameworks. Email must contain "@" and password ≥ 8 chars. Duplicate emails are rejected. Do not store raw passwords.</p>`,
      example: `<p><code>register("asha@x.com", "secret123")</code> → ${H.c('g', 'saved, welcome email sent')}. <code>register("bad", "123")</code> → ${H.c('r', 'IllegalArgumentException("invalid email")')} — validation fails before any hashing, saving or emailing happens.</p>`,
      brute: {
        why: `<p>Everything lives in one method: four actors (product rules, security, DBA, marketing) edit the same file. Changing the email template means re-testing hashing and storage; you cannot unit test validation without also "sending" email. The SHA-256 call, the map and the println are hard-wired — <b>rigid and fragile</b>.</p>`,
        code: `import java.security.MessageDigest;
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
}`
      },
      mcq: { q: 'Marketing wants a new welcome message. In a good SRP design, how many classes change?', options: ['Exactly one (the mailer / message class)', 'The registration service and the mailer', 'All of them, because register() calls them', 'None — use a config file only'], answer: 0, explain: 'Each actor owns one class. The orchestrator only calls <code>mailer.sendWelcome(email)</code>, so the message content can change without touching it.' },
      hints: [
        `<p>List the actors first: who asks for changes to validation rules, hashing, storage and email? Each actor becomes a class.</p>`,
        `<p>Create <code>UserValidator</code>, <code>PasswordHasher</code> (interface), <code>UserRepository</code> (interface), <code>WelcomeMailer</code> (interface), and a thin <code>RegistrationService</code> that calls them in order.</p>`,
        `<p>Order matters: validate → check duplicate → hash → save → mail. Pass the collaborators through the constructor so tests can give fakes. Edge cases: null email, duplicate email, mail failure after save (log it, do not lose the user).</p>`
      ],
      solution: {
        approach: `<p><b>Split by actor, orchestrate in one thin class.</b> The validator owns input rules; the hasher owns the algorithm (swap SHA-256 for bcrypt/Argon2 by adding a class); the repository owns storage; the mailer owns wording and delivery. <code>RegistrationService.register</code> now reads like the requirement. Each future change from the statement lands in one class, and each class can be unit-tested alone with fakes. Note SHA-256 is shown only because it is in the JDK — real systems use a slow, salted hash like bcrypt or Argon2.</p>`,
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
}

interface WelcomeMailer { void sendWelcome(String email); }   // marketing
class ConsoleWelcomeMailer implements WelcomeMailer {
    public void sendWelcome(String email) { System.out.println("To " + email + ": Welcome aboard!"); }
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
        RegistrationService s = new RegistrationService(new UserValidator(), new Sha256Hasher(),
                new InMemoryUserRepository(), new ConsoleWelcomeMailer());
        s.register("asha@x.com", "secret123");
        try { s.register("bad", "123"); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
    }
}`,
        complexity: `<p>Runtime is the same as before: O(1) map operations plus O(P) hashing for password length P. The win is in <b>change cost</b>: each requirement change touches 1 class instead of 1 file shared by 4 teams, and each class is testable in isolation.</p>`,
        followUps: ['How would you send the email asynchronously so a slow mail server does not slow registration?', 'Where would you put rate limiting for registrations — and which actor owns it?', 'Swap SHA-256 for BCrypt: how many classes change?']
      }
    }]
  });

registerModule({ id: 'lld02', title: 'SOLID Principles', intro: 'x', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
