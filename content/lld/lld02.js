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
}` }, { lang: 'java', title: 'After: Strategy + registry — new discounts plug in', code: `interface DiscountPolicy {
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
}` }],
    codeTitle: ['Bad: growing switch', 'Good: plug-in strategies'],
    viz: [{
      title: 'Add new discount types: edit-the-switch vs plug-in classes',
      input: 'FESTIVE STUDENT BULK',
      inputLabel: 'New discount types to add (1-4 words, letters only)',
      gen: function (input) {
        var names = String(input || '').trim().split(/[\s,]+/).filter(Boolean).map(function (s) { return s.toUpperCase(); });
        if (!names.length || names.length > 4 || names.some(function (n) { return !/^[A-Z]{2,10}$/.test(n); })) throw new Error('Enter 1-4 type names (2-10 letters each), e.g. FESTIVE STUDENT');
        var cases = ['REGULAR', 'PREMIUM', 'EMPLOYEE'], pct = { REGULAR: '0', PREMIUM: 'amt * 0.10', EMPLOYEE: 'amt * 0.30' };
        function sw(list, newIdx) {
          var lines = ['class DiscountCalculator {', '  double discount(String type, double amt) {', '    switch (type) {'];
          list.forEach(function (c) { lines.push('      case "' + c + '": return ' + (pct[c] || 'amt * 0.15') + ';'); });
          lines.push('      default: throw new IllegalArgumentException(type);', '    }', '  }', '}');
          var hl = {}; if (newIdx >= 0) hl[4 + newIdx] = 'bad';
          for (var i = 0; i < list.length; i++) if (i !== newIdx) hl[4 + i] = newIdx >= 0 ? 'cur' : '';
          return CODE('DiscountCalculator.java', lines.join('\n'), hl);
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
      { title: 'Shapes and the instanceof chain', html: `<p>${H.c('r', 'Bad:')} <code>AreaCalculator.area(Object s)</code> with <code>if (s instanceof Circle) … else if (s instanceof Rect) …</code>. Adding Triangle edits the calculator <i>and</i> every other method with a similar chain (perimeter, draw). ${H.c('g', 'Good:')} <code>interface Shape { double area(); }</code> — each shape knows its own area; the calculator just sums <code>s.area()</code>.</p>`, code: `interface Shape { double area(); }
record Circle(double r) implements Shape { public double area() { return Math.PI * r * r; } }
record Rect(double w, double h) implements Shape { public double area() { return w * h; } }
record Triangle(double b, double h) implements Shape { public double area() { return 0.5 * b * h; } } // added later, nothing edited

class AreaCalculator {
    static double total(List<Shape> shapes) {
        double sum = 0;
        for (Shape s : shapes) sum += s.area();
        return sum;
    }
}` },
      { title: 'The JDK already follows OCP: Comparator', html: `<p><code>List.sort(Comparator)</code> was written once and never changes, yet you can sort by price, by name, by date, descending, with ties broken… by passing a new <code>Comparator</code>. The sort algorithm is <b>closed</b>; the ordering is <b>open</b>. That is the Strategy pattern, and lambdas make "a new class" as small as one line.</p>`, code: `record Product(String name, double price) {}
class SortDemo {
    public static void main(String[] args) {
        List<Product> ps = new ArrayList<>(List.of(new Product("pen", 10), new Product("bag", 50), new Product("ink", 10)));
        ps.sort(Comparator.comparingDouble(Product::price).thenComparing(Product::name)); // new behaviour, no edits to sort()
        System.out.println(ps);
    }
}` },
      { title: 'When a switch is actually fine: sealed types (Java 21)', html: `<p>If the set of <b>types is fixed</b> but you keep adding <b>operations</b> (e.g. a compiler's AST, or <code>PaymentResult = Success | Failure | Pending</code>), a <code>sealed</code> interface with an exhaustive pattern-matching <code>switch</code> is the better trade-off: the compiler errors if a case is missing. OCP is about the <b>axis of change</b>: new types → polymorphism; new operations over fixed types → sealed + switch (or Visitor).</p>`, code: `sealed interface PaymentResult permits Success, Failure, Pending {}
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
}` }
    ],
    deepDive: `<p><b>Meyer vs Martin.</b> Meyer's 1988 OCP used <i>implementation inheritance</i>: once a class is released, you extend it by subclassing. Martin's 1996 "polymorphic OCP" uses <i>interfaces</i>: depend on an abstraction, add implementations. Modern Java favours the latter (plus composition), because deep inheritance trees create their own fragility.</p>
<p><b>Strategic closure.</b> You cannot be closed against everything. If discounts start needing the customer's order history, the <code>discount(double amt)</code> signature itself must change — every implementation is touched. Good designers pick abstractions around <b>stable concepts</b> (pass a rich <code>Order</code> object, not five primitive parameters) and accept that a truly new kind of requirement may need modification. "Fool me once" rule: do not pre-build sockets for imagined changes; when the second or third variation shows up, refactor to make that axis open.</p>
<p><b>The expression problem.</b> Polymorphism makes adding <i>types</i> cheap and adding <i>operations</i> expensive (every class needs the new method). Switch/pattern-matching makes adding <i>operations</i> cheap and adding <i>types</i> expensive. Java 21's sealed interfaces + exhaustive switches give compiler safety to the second style. Visitor pattern is the classic OO bridge. Naming this trade-off in an interview signals senior-level thinking.</p>
<p><b>OCP at system level.</b> Plugin architectures (IDE plugins, <code>java.util.ServiceLoader</code>, Spring injecting <code>List&lt;DiscountPolicy&gt;</code>), feature flags, and event-driven systems (new consumer of an existing Kafka topic needs zero producer changes) are OCP at scale. Configuration-driven rules (a discount table in a DB) push it further — new discount without a deploy — at the cost of testability and type safety.</p>
<p><b>Performance note:</b> an interface call is a virtual dispatch; the JIT inlines monomorphic and bimorphic call sites, so in hot loops with 1–2 implementations the cost is nearly zero. With many implementations (megamorphic) it is a few nanoseconds — irrelevant for business logic.</p>`,
    aiEra: `<p><b>What AI changes:</b> asked to "add a student discount", an assistant will most likely add another <code>case</code> to the existing switch — the smallest diff. It optimises for <i>this</i> change, not the next ten. Reviewing AI diffs for "did this edit tested code that could have been extended instead?" is now a core skill.</p>
<p><b>Use AI as a partner:</b> <code>This switch on customerType appears in 4 files. Refactor to the Strategy pattern so a new type needs only a new class. Show the before/after file list.</code> Or ask it to find all switches on the same enum across the codebase — great at that search. You can also ask <code>Is a sealed interface with pattern matching better than Strategy here? Which axis changes more?</code></p>
<p><b>Where AI goes wrong:</b> it may build a full plugin framework with reflection and annotations for three discount types (over-engineering), or put the registry inside Checkout (so Checkout still changes per type). <b>What you must still own:</b> predicting the real axis of change from the business conversation, deciding where wiring lives (composition root), and choosing between polymorphism and sealed switches.</p>`,
    problems: [{
      title: 'Payment methods without the if-else ladder',
      level: 'Medium', tags: ['OCP', 'strategy', 'registry'], companies: ['Razorpay', 'PayPal', 'Paytm', 'Amazon'],
      statement: `<p><code>PaymentProcessor.pay(method, amount)</code> uses an if/else ladder for <code>"CARD"</code> (2% fee), <code>"UPI"</code> (no fee) and <code>"WALLET"</code> (1% fee, fails if amount &gt; 10,000). The team must add <b>NETBANKING</b> (flat fee 15) next sprint and more methods later. Redesign so that adding a method <b>never edits</b> <code>PaymentProcessor</code> or any existing method class. Unknown methods must fail with a clear error.</p>`,
      constraints: `<p>Java 21, no frameworks. Amounts are positive doubles (use <code>BigDecimal</code> in real money code). Return the total charged (amount + fee).</p>`,
      example: `<p><code>pay("CARD", 1000)</code> → ${H.c('g', '1020.0')} (2% fee). <code>pay("WALLET", 20000)</code> → ${H.c('r', 'IllegalStateException: wallet limit')}. <code>pay("NETBANKING", 1000)</code> → ${H.c('g', '1015.0')} after adding one new class.</p>`,
      brute: {
        why: `<p>The if/else ladder mixes all payment rules in one method. Adding NETBANKING edits this tested method, re-tests all branches and risks breaking CARD. The same ladder is often duplicated for refunds and receipts — every new method becomes shotgun surgery.</p>`,
        code: `class PaymentProcessor {
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
}`
      },
      mcq: { q: 'Where should the knowledge "WALLET fails above 10,000" live after the refactor?', options: ['Inside the WalletPayment class', 'Inside PaymentProcessor, before calling the strategy', 'In a global constants class', 'In the caller (UI)'], answer: 0, explain: 'Each strategy owns all of its rules. If the processor checked wallet limits, it would still change whenever wallet rules change — OCP and SRP both broken.' },
      hints: [
        `<p>The thing that varies is "how a method charges". Make it an interface: <code>PaymentMethod { String code(); double charge(double amount); }</code>.</p>`,
        `<p>The processor keeps a <code>Map&lt;String, PaymentMethod&gt;</code> built from a list passed into its constructor. Lookup → delegate.</p>`,
        `<p>Edge cases: duplicate codes in the list (fail fast), unknown code (clear exception), negative amounts (validate once in the processor — that rule is common to all). Recipe: interface → 3 classes → map registry → add NetBanking as a 4th class + one wiring line.</p>`
      ],
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
        System.out.println(p.pay("CARD", 1000));        // 1020.0
        System.out.println(p.pay("NETBANKING", 1000));  // 1015.0
        try { p.pay("WALLET", 20000); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }
    }
}`,
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
}` }, { lang: 'java', title: 'After: siblings under a shared, honest abstraction (immutable)', code: `interface Shape { double area(); }

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
}` }],
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
      { title: 'The JDK\'s own compromise: unmodifiable lists', html: `<p><code>List.of(1, 2, 3).add(4)</code> compiles but throws <code>UnsupportedOperationException</code>. The <code>List</code> interface documents <code>add</code> as an "optional operation", so technically the contract allows it — but it is the same smell: callers cannot trust the type. That is why modern APIs prefer separate read-only types (Kotlin's <code>List</code> vs <code>MutableList</code>, Guava's <code>ImmutableList</code> documenting intent). ${H.c('y', 'Lesson:')} if your method only reads, accept a read-only view; if it mutates, document it.</p>`, code: `class ListDemo {
    public static void main(String[] args) {
        List<Integer> fixed = List.of(1, 2, 3);
        try { fixed.add(4); }
        catch (UnsupportedOperationException e) { System.out.println("List.of is immutable: " + e); }
    }
}` },
      { title: 'java.sql.Timestamp extends java.util.Date (equals is not symmetric)', html: `<p>The Javadoc itself warns: <code>date.equals(timestamp)</code> can be true while <code>timestamp.equals(date)</code> is false, because Timestamp adds nanoseconds. Any code that puts Dates and Timestamps in the same <code>HashSet</code> can misbehave. The JDK authors note this "inheritance is implementation inheritance, not type inheritance" — a textbook LSP violation kept for backward compatibility.</p>` },
      { title: 'Strengthened precondition in a payment subclass', html: `<p>${H.c('r', 'Bad:')} <code>PaymentGateway.charge(amount)</code> accepts any positive amount. <code>PrepaidCardGateway</code> overrides it and throws if amount &gt; card balance. Checkout code written for the parent never expected that exception → crashes for prepaid users. ${H.c('g', 'Fix:')} put the possibility of decline <b>in the parent contract</b>: return a <code>ChargeResult</code> (approved / declined with reason). Now every gateway, including prepaid, honours the same promise.</p>`, code: `sealed interface ChargeResult permits Approved, Declined {}
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
}` }
    ],
    deepDive: `<p><b>Formal version (Liskov & Wing, 1994):</b> "Let φ(x) be a property provable about objects x of type T. Then φ(y) should be true for objects y of type S where S is a subtype of T." The provable property for Rectangle is "after setWidth(a), setHeight(b), area = a·b". Square cannot satisfy it, so Square is not a behavioural subtype — even though Java accepts <code>extends</code>.</p>
<p><b>What the compiler checks vs what it cannot.</b> Java enforces the <i>signature</i> part: overriding methods cannot reduce visibility, cannot throw broader <b>checked</b> exceptions, may use covariant return types (return a subtype). Java does <b>not</b> check unchecked exceptions, nulls, value ranges, side effects or invariants. That is why LSP is a design discipline and why <b>contract tests</b> exist: write an abstract JUnit test class for the interface (e.g. <code>abstract class AccountContractTest { abstract Account create(); … }</code>) and run it against every implementation.</p>
<p><b>Variance connection.</b> LSP is why method parameters should be <i>contravariant</i> and return types <i>covariant</i> (a child may accept more and return less). Java generics show the same idea with PECS: <code>List&lt;? extends Number&gt;</code> for producers, <code>List&lt;? super Integer&gt;</code> for consumers.</p>
<p><b>Inheritance vs composition.</b> Most LSP violations come from inheriting to <b>reuse code</b> rather than to express a true subtype (<code>Stack extends Vector</code>, <code>Properties extends Hashtable</code> — both JDK regrets: Properties allows non-String values through Hashtable's <code>put</code>). Effective Java Item 18: "favor composition over inheritance". Java 17+ <code>sealed</code> classes help by limiting who can extend you, and <code>final</code> by default (as in Kotlin) prevents accidental subtyping.</p>
<p><b>Real-world bites:</b> a <code>CachedRepository</code> subclass that returns stale data where the parent promised fresh; a "test double" that silently ignores writes so tests pass but behaviour differs; an <code>equals</code> override in a subclass that adds a field and breaks symmetry/transitivity (Effective Java Item 10). Microservices have LSP too: a new API version that rejects requests the old one accepted is a strengthened precondition — it breaks clients.</p>`,
    aiEra: `<p><b>What AI changes:</b> when an assistant hits "this subclass cannot do X", its favourite quick fix is <code>throw new UnsupportedOperationException()</code> or an <code>instanceof</code> check in the caller — both are LSP violations that compile and pass the happy-path test. As AI writes more hierarchies, spotting these "refused bequests" in review becomes your job.</p>
<p><b>Use AI as a partner:</b> ask <code>For this interface, list the implicit contract: preconditions, postconditions, invariants, exceptions. Then check each implementation against it.</code> Ask it to <b>generate contract tests</b>: <code>Write an abstract JUnit 5 test for the Account interface that every implementation must pass.</code> AI is good at enumerating edge cases like nulls, zero, negative values and ordering.</p>
<p><b>Where AI goes wrong:</b> it reasons from real-world "is-a" ("a penguin is a bird, so extend Bird") instead of behavioural contracts, and it rarely notices weakened postconditions (returning null, returning stale data). <b>What you must still own:</b> defining the promises of your abstractions, deciding when to split a capability into its own interface, and choosing composition when inheritance would only reuse code.</p>`,
    problems: [{
      title: 'Fixed deposits that cannot withdraw',
      level: 'Medium', tags: ['LSP', 'interfaces', 'banking'], companies: ['Goldman Sachs', 'JPMorgan', 'Paytm'],
      statement: `<p>A bank models <code>Account</code> with <code>deposit</code>, <code>withdraw</code> and <code>balance</code>. <code>SavingsAccount</code> and <code>FixedDepositAccount</code> extend it, but a fixed deposit cannot be withdrawn before maturity, so its <code>withdraw</code> throws. A monthly job calls <code>withdraw(fee)</code> on every account and crashes on the first FD. Redesign the hierarchy so that the monthly job <b>cannot even compile</b> with an FD in its list, and FDs still support deposits (top-ups) and balance checks.</p>`,
      constraints: `<p>Java 21. Balance must never go negative. Fees apply only to withdrawable accounts; FDs earn interest instead.</p>`,
      example: `<p>Accounts: Savings(1000), FD(5000), Savings(50). Monthly fee 100. ${H.c('r', 'Before:')} job crashes at FD → third account never charged. ${H.c('g', 'After:')} the job takes <code>List&lt;Withdrawable&gt;</code>, charges both savings accounts (the 50 one is skipped with "insufficient funds"), and the FD is not in that list by construction.</p>`,
      brute: {
        why: `<p>FixedDepositAccount <b>strengthens the precondition</b> of <code>withdraw</code> (parent: "any amount ≤ balance"; child: "never"). Every client of <code>Account</code> must now guard with <code>instanceof</code> or try/catch, and the bug only appears when production data contains an FD — classic LSP violation.</p>`,
        code: `class Account {
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
}`
      },
      mcq: { q: 'Which LSP rule does <code>FixedDepositAccount.withdraw</code> break?', options: ['It strengthens the precondition (and adds a surprise exception)', 'It weakens the postcondition of deposit', 'It changes the return type', 'None — throwing is always allowed'], answer: 0, explain: 'The parent accepts any amount up to the balance; the child accepts nothing. Callers relying on the parent contract break.' },
      hints: [
        `<p>Not every account can do everything. Which capability is shared by all (deposit, balance) and which only by some (withdraw)?</p>`,
        `<p>Make <code>Account</code> an interface with <code>deposit</code> + <code>balance</code>; create <code>Withdrawable extends Account</code> with <code>withdraw</code>. Savings implements Withdrawable; FD implements only Account (plus <code>mature()</code>).</p>`,
        `<p>The job's parameter type becomes <code>List&lt;Withdrawable&gt;</code> — the compiler now enforces the rule. Handle insufficient funds as a normal result (return boolean / skip), not by crashing the whole batch.</p>`
      ],
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
    public void deposit(double amt) { if (amt <= 0) throw new IllegalArgumentException(); balance += amt; }
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
    public void deposit(double amt) { if (amt <= 0) throw new IllegalArgumentException(); balance += amt; }
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
        System.out.println("charged " + run(List.of(s1, s2), 100));   // charged 1
        // run(List.of(s1, fd), 100);  // does not compile: FD is not Withdrawable
        fd.addInterest(0.07);
        System.out.println(s1.balance() + " " + s2.balance() + " " + fd.balance());
    }
}`,
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
<p><b>The refactor:</b> split by <b>client role</b>, not by random size: <code>Printer</code>, <code>Scanner</code>, <code>Fax</code>. A multi-function machine implements all three (Java allows many interfaces). Each client asks for exactly the role it needs: <code>PrintQueue(Printer p)</code>. If some client really needs two roles together, define a small combined interface (<code>interface Copier extends Printer, Scanner {}</code>).</p>
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
}` }, { lang: 'java', title: 'After: role interfaces, each client depends on what it uses', code: `interface Printer { void print(String doc); }
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
}` }],
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
      { title: 'The JDK loves tiny role interfaces', html: `<p><code>Runnable</code> (1 method), <code>Comparable</code> (1), <code>AutoCloseable</code> (1), <code>Iterable</code> (1 abstract), <code>Supplier</code>/<code>Consumer</code>/<code>Function</code>. Because they are tiny, <i>anything</i> can implement them and try-with-resources works with any <code>AutoCloseable</code> — a database connection, a file, your own lock wrapper. Small interfaces are the most reusable abstractions ever written.</p>`, code: `class Lease implements AutoCloseable {
    Lease() { System.out.println("lease taken"); }
    @Override public void close() { System.out.println("lease released"); }   // the ONLY method required
}
class Use {
    public static void main(String[] args) {
        try (Lease l = new Lease()) { System.out.println("working"); }       // works with any AutoCloseable
    }
}` },
      { title: 'Reader vs Writer: a repository split', html: `<p>A <code>ProductRepository</code> with 25 methods (find, search, save, delete, bulkImport, exportCsv, stats…) is used by the product page (reads), the admin panel (writes) and the nightly import (bulk). ${H.c('g', 'ISP split:')} <code>ProductReader</code>, <code>ProductWriter</code>, <code>ProductBulkImporter</code>. The product page now cannot accidentally delete; its tests fake 2 methods instead of 25; read side can later be served from a cache or replica without touching writers. This is CQRS in miniature.</p>`, code: `record Product(String sku, String name, double price) {}
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
}` },
      { title: 'Worker and Robot: "eat()" does not belong to everyone', html: `<p>${H.c('r', 'Bad:')} <code>interface Worker { void work(); void eat(); void sleep(); }</code>. A <code>Robot</code> worker must implement <code>eat()</code> and <code>sleep()</code> as empty methods. A canteen scheduler that calls <code>eat()</code> on all workers "feeds" robots. ${H.c('g', 'Fix:')} <code>Workable</code>, <code>Feedable</code>, <code>Restable</code>; <code>HumanWorker implements all three</code>, <code>Robot implements Workable</code> (plus maybe <code>Chargeable</code>). The canteen takes <code>List&lt;Feedable&gt;</code>.</p>` },
      { title: 'Do not "fix" fat interfaces with default methods', html: `<p>Java 8 default methods tempt people to write <code>default void fax(String d, String n) { throw new UnsupportedOperationException(); }</code> in the fat interface so implementers need not override. The compile error disappears, but the lie remains: every <code>Machine</code> still <i>claims</i> to fax. Defaults are great for adding <b>genuinely shared</b> behaviour built from other methods (like <code>copy()</code> above), not for hiding missing capabilities.</p>` }
    ],
    deepDive: `<p><b>Origin story.</b> Uncle Bob described ISP after consulting at Xerox: one huge <code>Job</code> class served all printer tasks; a tiny change to stapling forced a full hour-long rebuild of everything, because every module depended on the giant interface. Splitting into role interfaces cut the rebuild and deploy ripple. In Java today, compile times are smaller, but the same ripple exists in <b>deployments</b> (shared library versions), <b>test mocks</b> and <b>team coordination</b>.</p>
<p><b>Header interfaces vs role interfaces</b> (Martin Fowler). A header interface mirrors all public methods of one class (<code>IUserService</code> for <code>UserService</code>) — usually pointless. A role interface is defined from the <b>client's point of view</b> ("what do I need?"). In ports-and-adapters architecture, the client (the domain) owns these small interfaces — that links ISP directly to DIP.</p>
<p><b>How small is too small?</b> One method per interface everywhere leads to "interface soup" where a constructor takes eight one-method interfaces that always come together. Group methods that are <b>always used together by the same clients</b> (cohesion again). Composite interfaces (<code>Copier extends Printer, Scanner</code>) or records of lambdas can bundle them.</p>
<p><b>ISP beyond classes:</b> REST APIs that return enormous payloads to every client (mobile, web, partners) are fat interfaces; GraphQL and Backend-for-Frontend (BFF) patterns let each client ask for exactly what it needs. Shared "common" libraries with 300 utilities force every service to upgrade together — split them. Kafka topics carrying a "god event" with 80 fields couple all consumers to every schema change — publish focused events.</p>
<p><b>Java details:</b> <code>sealed</code> interfaces can restrict implementers; generics plus intersection types let a method demand several roles without a new interface: <code>&lt;T extends Printer &amp; Scanner&gt; void copyAll(T device)</code>.</p>`,
    aiEra: `<p><b>What AI changes:</b> ask an assistant to "create an interface for this service" and it will usually extract <b>every</b> public method into one header interface — instant fat interface. It also fills unsupported methods with <code>throw new UnsupportedOperationException("Not implemented")</code> to make the build green.</p>
<p><b>Use AI as a partner:</b> <code>Here are the 6 classes that use UserService. For each, list which methods it calls. Propose role interfaces grouped by caller.</code> This usage analysis is tedious for humans and easy for AI (or IDE "find usages"). Then: <code>Generate the new interfaces and update constructor parameter types to the narrowest role.</code></p>
<p><b>Where AI goes wrong:</b> splitting by method count or alphabet rather than by client role, or producing one-method interfaces for everything. It may also add default methods that throw. <b>What you must still own:</b> naming roles in the domain's language (<code>PaymentAuthorizer</code>, not <code>IService2</code>), deciding which methods are always used together, and keeping the number of interfaces proportional to real variation.</p>`,
    problems: [{
      title: 'Smart-home devices with a fat SmartDevice interface',
      level: 'Easy', tags: ['ISP', 'role interfaces'], companies: ['Google', 'Amazon', 'Samsung'],
      statement: `<p>A smart-home app defines <code>SmartDevice</code> with <code>turnOn</code>, <code>turnOff</code>, <code>setBrightness(int)</code>, <code>setTemperature(int)</code> and <code>playMusic(String)</code>. A bulb, a thermostat and a speaker all implement it, filling unsupported methods with exceptions. A "Good night" scene must turn off <b>every</b> device and dim lights to 10%. Redesign with ISP so no class has fake methods and the scene works for all devices.</p>`,
      constraints: `<p>Java 21. Brightness 0–100, temperature 16–30 °C. A device can have several capabilities (a smart lamp-speaker exists).</p>`,
      example: `<p>Devices: Bulb, Thermostat, Speaker, LampSpeaker. "Good night" → all four turned off; Bulb and LampSpeaker dimmed to 10. ${H.c('r', 'Before:')} calling <code>setBrightness</code> on the thermostat throws. ${H.c('g', 'After:')} the scene dims only <code>Dimmable</code> devices — chosen by type, not by try/catch.</p>`,
      brute: {
        why: `<p>Every device is forced to implement five methods; three of the four classes contain fake implementations. The scene has to wrap calls in try/catch or <code>instanceof</code> checks, and any change to <code>playMusic</code>'s signature forces the bulb and thermostat to change too.</p>`,
        code: `interface SmartDevice {
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
}`
      },
      mcq: { q: 'What should the "Good night" scene depend on to turn everything off?', options: ['A small <code>Switchable</code> interface implemented by all devices', 'The fat <code>SmartDevice</code> interface', 'Each concrete class (Bulb, Speaker…)', 'A static utility with instanceof checks'], answer: 0, explain: 'The scene needs only on/off for everyone and brightness for some. Each need is a role: Switchable for all, Dimmable for lights.' },
      hints: [
        `<p>Group methods by capability: on/off (all), brightness (lights), temperature (thermostat), music (speakers).</p>`,
        `<p>Create <code>Switchable</code>, <code>Dimmable extends Switchable</code>, <code>Thermostatic</code>, <code>MusicPlayer</code>. LampSpeaker implements Dimmable and MusicPlayer.</p>`,
        `<p>Scene takes <code>List&lt;Switchable&gt;</code> to turn off and <code>List&lt;Dimmable&gt;</code> to dim — or filters with pattern matching once at the boundary. Validate ranges inside each device.</p>`
      ],
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
    }
}`,
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
}` }, { lang: 'java', title: 'After: domain owns the ports, infrastructure plugs in, tests use fakes', code: `record Order(String id, String email, double amount) {}

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
}` }],
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
      { title: 'Time is a dependency too: inject a Clock', html: `<p>${H.c('r', 'Bad:')} <code>coupon.isExpired()</code> calls <code>LocalDate.now()</code> inside. Testing "expires at midnight" means waiting until midnight or hacking the system clock. ${H.c('g', 'Good:')} pass <code>java.time.Clock</code> (a JDK abstraction made for exactly this). Production uses <code>Clock.systemDefaultZone()</code>; tests use <code>Clock.fixed(...)</code>.</p>`, code: `class Coupon {
    private final LocalDate expiry;
    private final Clock clock;
    Coupon(LocalDate expiry, Clock clock) { this.expiry = expiry; this.clock = clock; }
    boolean isExpired() { return LocalDate.now(clock).isAfter(expiry); }

    public static void main(String[] args) {
        Clock fixed = Clock.fixed(Instant.parse("2026-01-02T10:00:00Z"), ZoneOffset.UTC);
        System.out.println(new Coupon(LocalDate.of(2026, 1, 1), fixed).isExpired());   // true, deterministic
    }
}` },
      { title: 'Payment gateway port: swapping Stripe for Razorpay', html: `<p>The checkout domain defines <code>interface PaymentGateway { PaymentResult charge(Money amount, String token); }</code>. <code>StripeGateway</code> and <code>RazorpayGateway</code> are adapters translating to each vendor's SDK. Expanding to India means writing one adapter and changing one wiring line, and a <code>FakeGateway</code> lets you test declines, timeouts and retries without a sandbox account. This is <b>hexagonal architecture</b> (ports and adapters) — DIP applied to a whole application.</p>` },
      { title: 'Spring does the wiring, DIP is still your job', html: `<p>With Spring, <code>@Service class OrderService { OrderService(OrderRepository repo, Notifier n) {…} }</code> gets its dependencies injected automatically (constructor injection is the recommended style; field <code>@Autowired</code> hides dependencies and blocks <code>final</code> fields). But if <code>OrderRepository</code> is a JPA interface full of database-specific methods, or the service injects <code>JdbcTemplate</code> directly, you are using DI <b>without</b> DIP — the policy still depends on details.</p>` },
      { title: 'Service Locator: DI\'s evil twin', html: `<p><code>Notifier n = ServiceLocator.get(Notifier.class);</code> inside a method <i>looks</i> decoupled, but dependencies are now hidden (not in the constructor), failures happen at runtime, and tests must configure a global registry. Prefer explicit constructor parameters: if a constructor has 9 parameters, that is useful feedback that the class has too many responsibilities (SRP!).</p>` }
    ],
    deepDive: `<p><b>Ownership of the abstraction is the heart of DIP.</b> If <code>OrderRepository</code> sits in the infrastructure package next to <code>MySqlOrderRepository</code>, the domain still depends on the infrastructure <i>package</i>. Put the interface in the domain package (or module), and make infrastructure depend on domain. In a Java multi-module build (Maven/Gradle), the <code>domain</code> module has <b>no dependency</b> on <code>infra</code>; <code>infra</code> depends on <code>domain</code>; <code>app</code> depends on both and wires them. ArchUnit tests can enforce "classes in ..domain.. must not depend on ..infra..".</p>
<p><b>Injection styles:</b> constructor (preferred: immutable, required deps obvious, no partially built objects), setter (optional deps, but allows invalid state), method parameter (for per-call collaborators like a <code>Clock</code> in a pure function), and field injection (framework magic — avoid in new code). Too many constructor parameters is a design signal, not a reason to switch to field injection.</p>
<p><b>Don\'t invert everything.</b> Depending on stable, concrete JDK types (<code>String</code>, <code>List</code>, <code>BigDecimal</code>, <code>Duration</code>) is fine — they almost never change in breaking ways. Invert dependencies on things that are <b>volatile</b> (vendors, I/O, frameworks), <b>slow</b> (network, disk) or <b>non-deterministic</b> (time, randomness, UUIDs). A <code>Money</code> value object needs no interface.</p>
<p><b>Runtime vs compile time.</b> Flow of control still goes service → MySQL at runtime; only the <i>source code</i> dependency is inverted. This is what lets plugins work: an IDE core defines extension-point interfaces; plugins compiled years later implement them and are loaded via <code>ServiceLoader</code> (<code>META-INF/services</code>) or the module system's <code>uses</code>/<code>provides</code>.</p>
<p><b>Testing payoff numbers:</b> a typical service test through a real DB + container takes 1–5 s; with in-memory fakes, 1–5 ms. A suite of 2,000 such tests drops from ~1 hour to ~10 seconds, which changes how often developers run tests. Keep a smaller set of integration tests (Testcontainers) to verify each adapter against the real thing — fakes must honour the same contract (LSP!).</p>`,
    aiEra: `<p><b>What AI changes:</b> generated code frequently instantiates clients inline (<code>new OpenAIClient(apiKey)</code>, <code>HttpClient.newHttpClient()</code>, <code>new S3Client()</code>) inside business methods, reads env vars deep in the logic and calls <code>Instant.now()</code> directly. It runs — and is untestable. Tools that let AI agents run your tests reward designs with fast, deterministic tests, which is exactly what DIP gives you.</p>
<p><b>Use AI as a partner:</b> <code>Find every place this class touches I/O, time, randomness or a vendor SDK. Propose a domain-owned interface for each, then generate in-memory fakes and JUnit tests using them.</code> AI is very good at producing the adapter boilerplate and fakes once the port is defined.</p>
<p><b>DIP for AI features themselves:</b> wrap LLM calls behind a domain port such as <code>interface Summarizer { Summary summarize(Document d); }</code>. You can swap models or vendors, add caching or guardrails as decorators, and test business flows with a deterministic fake summarizer instead of a slow, costly, non-deterministic model call. <b>Where AI goes wrong:</b> it writes interfaces that mirror the vendor SDK (leaky abstraction) or puts the interface in the vendor package. <b>What you must still own:</b> where the ports live, what language they speak, and which dependencies are volatile enough to invert.</p>`,
    problems: [{
      title: 'Make the WeatherAlert service testable',
      level: 'Medium', tags: ['DIP', 'dependency injection', 'testing'], companies: ['Uber', 'Microsoft', 'Atlassian'],
      statement: `<p><code>WeatherAlertService.checkAndAlert(city)</code> creates an HTTP weather client with <code>new</code>, reads the current hour with <code>LocalTime.now()</code>, and sends alerts with <code>System.out</code> (standing in for an SMS SDK). Rules: send an alert if the temperature is above 40 °C, but <b>not between 22:00 and 07:00</b> (quiet hours) unless it is above 45 °C. Refactor using DIP so the rules can be tested for any temperature and any time in milliseconds, and the SMS vendor can be swapped.</p>`,
      constraints: `<p>Java 21, no frameworks or mocking libraries. Write the "tests" as plain assertions in <code>main</code> using hand-written fakes.</p>`,
      example: `<p>42 °C at 14:00 → ${H.c('g', 'alert')}. 42 °C at 23:30 → ${H.c('y', 'no alert (quiet hours)')}. 46 °C at 23:30 → ${H.c('r', 'alert (emergency overrides quiet hours)')}. 30 °C anytime → no alert.</p>`,
      brute: {
        why: `<p>All three dependencies are hard-wired: the network (slow, flaky, rate-limited), the system clock (you cannot test 23:30 at 14:00) and the alert channel (tests would send real SMS). The only way to test the quiet-hours rule is to run it at night against a live API. Swapping vendors means editing the business rule class.</p>`,
        code: `class HttpWeatherClient {
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
}`
      },
      mcq: { q: 'Which of these should become injected dependencies?', options: ['Weather source, clock and alert sender', 'Only the weather source', 'Only the alert sender', 'None — use static mocking instead'], answer: 0, explain: 'All three are volatile or non-deterministic: network, time and an external vendor. Each gets a domain-owned interface (or the JDK\'s <code>Clock</code>).' },
      hints: [
        `<p>Find the hidden inputs: anything from the network, the clock or an external system. Each one is a dependency to invert.</p>`,
        `<p>Define <code>WeatherProvider</code> and <code>AlertSender</code> interfaces in the domain; use <code>java.time.Clock</code> for time. Inject all three via the constructor.</p>`,
        `<p>Fakes: <code>FixedWeather(temp)</code>, <code>RecordingSender</code> (stores messages), <code>Clock.fixed(...)</code>. Test boundaries: 40 vs 40.1, 45 vs 45.1, 21:59 vs 22:00, 06:59 vs 07:00.</p>`
      ],
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
        if (alert) sender.send("Heat alert in " + city + ": " + t + "C");
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
        System.out.println("ok: " + temp + "C at " + time + " -> " + got);
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
        // production wiring
        new WeatherAlertService(new HttpWeatherProvider(), new SmsAlertSender(), Clock.systemDefaultZone()).checkAndAlert("Delhi");
    }
}`,
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
}` }, { lang: 'java', title: 'After: small roles, plug-in formats, injected I/O', code: `record Sale(String region, double amount) {}
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
}` }],
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
        var frames = [F('A teammate asks you to review this <b>ReportService</b>. It works in production. We will check it against: <b>' + uniq.join(', ') + '</b>.', [CODE('ReportService.java (under review)', T7_BAD, {}), { type: 'table', label: 'Review findings', columns: ['Principle', 'Lines', 'Fix'], rows: [] }])];
        var rows = [], all = {};
        uniq.forEach(function (l) {
          var f = F2[l], hl = {};
          Object.keys(all).forEach(function (k) { hl[k] = 'done'; });
          f.lines.forEach(function (n) { hl[n] = 'bad'; all[n] = 1; });
          rows.push([l + ' — ' + f.name, f.lines.join(', '), f.fix]);
          frames.push(F('<b>' + l + ' — ' + f.name + ':</b> ' + f.msg, [CODE('ReportService.java (under review)', T7_BAD, hl), { type: 'table', label: 'Review findings', columns: ['Principle', 'Lines', 'Fix'], rows: rows.slice(), hl: (function () { var r = {}; r[rows.length - 1] = 'sel'; return r; })() }]));
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
      { title: 'SOLID in a functional style', html: `<p>A one-method interface is just a function. Java lambdas let you apply OCP and DIP with almost no ceremony: inject a <code>Function&lt;Order, Double&gt;</code> discount, a <code>Supplier&lt;Instant&gt;</code> clock or a <code>Predicate&lt;User&gt;</code> rule. Prefer a <b>named</b> interface when the role deserves a domain name or needs several methods; use built-in functional types for tiny, local strategies.</p>`, code: `record Order(String id, double amount) {}
class Pricing {
    private final Function<Order, Double> discount;      // strategy as a function (OCP)
    private final Supplier<Instant> now;                  // time as a dependency (DIP)
    Pricing(Function<Order, Double> discount, Supplier<Instant> now) { this.discount = discount; this.now = now; }
    String quote(Order o) { return o.id() + " pays " + (o.amount() - discount.apply(o)) + " at " + now.get(); }

    public static void main(String[] args) {
        Pricing p = new Pricing(o -> o.amount() > 1000 ? 100.0 : 0.0, () -> Instant.parse("2026-01-01T00:00:00Z"));
        System.out.println(p.quote(new Order("A1", 1500)));
    }
}` },
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
      constraints: `<p>Java 21, no frameworks. Keep the public behaviour: <code>notifyOrderShipped(user, orderId)</code> sends one message via the user's preferred channel and records success/failure.</p>`,
      example: `<p>User prefers SMS → "Your order #42 has shipped" via SMS, log "u1 SMS ok". User prefers WHATSAPP (after adding one class) → same text via WhatsApp. Unknown preference → falls back to EMAIL instead of crashing.</p>`,
      brute: {
        why: `<p>${H.c('r', 'S:')} one class builds text, picks channels, logs and talks to vendors. ${H.c('r', 'O:')} the switch must be edited for WhatsApp. ${H.c('r', 'L:')} PushChannel extends EmailChannel and throws on attachments. ${H.c('r', 'I:')} <code>Channel</code> forces <code>schedule</code> and <code>attach</code> on everyone. ${H.c('r', 'D:')} <code>new TwilioClient()</code>, <code>new FileWriter</code> inside business code — tests send real SMS and write files.</p>`,
        code: `interface Channel {
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
}`
      },
      mcq: { q: 'Product adds WhatsApp. In the refactored design, what is the minimal change?', options: ['Add a WhatsAppChannel class and register it in the composition root', 'Add a case to NotificationService and a WhatsAppChannel class', 'Make WhatsAppChannel extend SmsChannel', 'Add whatsapp() to the Channel interface'], answer: 0, explain: 'With a registry of <code>Channel</code> implementations keyed by name (OCP) and injected into the service (DIP), the new class plus one wiring line is all that changes.' },
      hints: [
        `<p>Write the findings table first: for each principle, which lines and what pain. Then group responsibilities: text building, channel choice, sending per vendor, logging.</p>`,
        `<p>Ports: <code>Channel { String name(); void send(Contact c, Message m); }</code>, optional roles <code>SupportsAttachments</code> and <code>Schedulable</code>, <code>MessageTemplates</code>, <code>DeliveryLog</code>. Service receives a list of channels and builds a map.</p>`,
        `<p>Fallback channel for unknown preferences; catch per-send failures and log them; Push no longer extends Email (siblings). Test in <code>main</code> with a <code>RecordingChannel</code> and <code>InMemoryLog</code>.</p>`
      ],
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
        System.out.println(log.lines);

        // test-style wiring: fakes only
        RecordingChannel email = new RecordingChannel("EMAIL");
        InMemoryLog testLog = new InMemoryLog();
        new NotificationService(List.of(email), "EMAIL", new DefaultTemplates(), testLog)
                .notifyOrderShipped(new Contact("t1", "SMS", "t@x.com"), "7");
        if (!email.sent.equals(List.of("t@x.com|Your order #7 has shipped"))) throw new AssertionError(email.sent);
        System.out.println("test passed: " + testLog.lines);
    }
}`,
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
    constraints: `<p>Java 21. <code>Book</code> should stay a simple domain object. Storage must be swappable (file today, S3 tomorrow).</p>`,
    example: `<p>Changing the console layout from "Title by Author" to a boxed format → ${H.c('g', 'only BookPrinter changes')}. Moving to S3 → ${H.c('g', 'only a new BookStore implementation')}; <code>Book</code> is untouched in both cases.</p>`,
    brute: {
      why: `<p><code>Book</code> has three reasons to change: book data (domain), presentation (UI team) and persistence (infra team). Every UI tweak re-opens the class that infra depends on and vice versa; the file I/O also makes <code>Book</code> hard to unit test. This is a <b>Single Responsibility</b> violation.</p>`,
      code: `class Book {
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
}`
    },
    mcq: { q: 'Which principle does <code>Book.saveToFile</code> most directly violate?', options: ['Single Responsibility', 'Liskov Substitution', 'Interface Segregation', 'None — books should save themselves'], answer: 0, explain: 'Persistence is a different actor\'s concern (infra) from the book\'s data and from printing (UI). Three actors → three reasons to change.' },
    hints: [
      `<p>Ask "who would request a change to each method?" — you will find three different answers.</p>`,
      `<p>Keep <code>Book</code> as a record. Create <code>BookPrinter</code> for layout and a <code>BookStore</code> interface for persistence with a file implementation.</p>`,
      `<p>The printer can return a <code>String</code> (easy to test) and let the caller print it. Storage gets an interface so S3 is just another implementation (that is DIP + OCP as a bonus).</p>`
    ],
    solution: {
      approach: `<p><b>SRP: one class per actor.</b> <code>Book</code> becomes a record (pure data plus simple invariants). <code>BookPrinter</code> owns presentation and returns text, so it is trivially testable. <code>BookStore</code> is an interface; <code>FileBookStore</code> and later <code>S3BookStore</code> implement it. A layout change touches one class; a storage change adds one class.</p>`,
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
    }
}`,
      complexity: `<p>O(size of text) to render, O(1) average to save/load in the map. Change cost: 1 class per requirement instead of re-opening <code>Book</code>.</p>`,
      followUps: ['Should <code>Book</code> have a <code>wordCount()</code> method, or is that another responsibility?', 'How would you add an HTML renderer without touching BookPrinter?']
    }
  });

  practice.push({
    title: 'Decoy ducks that cannot quack',
    level: 'Easy', tags: ['LSP', 'inheritance', 'spot the violation'], companies: ['Microsoft', 'Adobe'],
    statement: `<p>A game has <code>Duck</code> with <code>quack()</code> and <code>fly()</code>. <code>MallardDuck</code> does both. A wooden <code>DecoyDuck</code> extends <code>Duck</code> and throws <code>UnsupportedOperationException</code> from both methods. The "pond chorus" feature calls <code>quack()</code> on every duck and crashes when a decoy is in the pond. <b>Which principle is violated?</b> Redesign so the chorus can never receive a duck that cannot quack.</p>`,
    constraints: `<p>Java 21. Decoys still appear in the pond list (they float). No <code>instanceof</code> in the chorus.</p>`,
    example: `<p>Pond: [Mallard, Decoy, Rubber]. ${H.c('r', 'Before:')} chorus crashes at Decoy. ${H.c('g', 'After:')} chorus takes only <code>Quackable</code> things → "Quack", "Squeak"; the decoy is in the pond list but not in the chorus list.</p>`,
    brute: {
      why: `<p><code>DecoyDuck</code> cannot keep the promise of its parent (<code>quack()</code> makes a sound). Any code written for <code>Duck</code> breaks when handed a decoy — a <b>Liskov Substitution</b> violation. Fixing it with <code>instanceof DecoyDuck</code> in the chorus would also break OCP.</p>`,
      code: `class Duck {
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
}`
    },
    mcq: { q: 'What is the best fix?', options: ['Split capabilities into small interfaces (Floatable, Quackable, Flyable) and let each duck implement what it can', 'Catch the exception in the chorus', 'Make DecoyDuck.quack() print nothing', 'Add <code>if (d instanceof DecoyDuck) continue;</code>'], answer: 0, explain: 'An empty quack silently breaks the promise too (weakened postcondition). Capabilities as role interfaces let the type system keep decoys out of the chorus.' },
    hints: [
      `<p>What can <i>every</i> duck do? Float. What can only some do? Quack, fly. Put each capability in its own interface.</p>`,
      `<p><code>interface Floatable</code>, <code>interface Quackable</code>, <code>interface Flyable</code>. Mallard implements all three; Decoy only Floatable; Rubber floats and squeaks.</p>`,
      `<p>The chorus parameter type becomes <code>List&lt;? extends Quackable&gt;</code>. The pond can be <code>List&lt;Floatable&gt;</code>. No exceptions, no instanceof.</p>`
    ],
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
        System.out.println(pond.stream().map(Floatable::name).toList());   // all float
        System.out.println(chorus(List.of(m, r)));                          // [Quack, Squeak]
        // chorus(List.of(m, d));  // compile error: DecoyDuck is not Quackable
    }
}`,
      complexity: `<p>O(n) for the chorus. Runtime crash risk from decoys: eliminated by the type system.</p>`,
      followUps: ['Is an empty <code>quack()</code> body acceptable? Which LSP rule does it break?', 'How does the Strategy pattern (QuackBehavior) from Head First Design Patterns solve the same problem with composition?']
    }
  });

  practice.push({
    title: 'Area calculator with an instanceof chain',
    level: 'Easy', tags: ['OCP', 'polymorphism'], companies: ['Amazon', 'Walmart'],
    statement: `<p><code>AreaCalculator.total(List&lt;Object&gt; shapes)</code> loops and uses <code>instanceof Circle</code> / <code>instanceof Rectangle</code> to compute each area. Next sprint adds <code>Triangle</code>, then <code>Hexagon</code>. <b>Which principle is violated?</b> Refactor so new shapes never require editing <code>AreaCalculator</code>.</p>`,
    constraints: `<p>Java 21. Dimensions are positive doubles. Unknown objects must not silently count as zero.</p>`,
    example: `<p>[Circle(r=1), Rectangle(2,3)] → 3.14159… + 6 = ${H.c('g', '9.14')}. After adding Triangle(base 4, height 3) → +6 = ${H.c('g', '15.14')} with zero edits to the calculator.</p>`,
    brute: {
      why: `<p>Each new shape means editing <code>total()</code> and every other method with a similar chain (perimeter, draw). The fallback branch silently ignores unknown shapes — a hidden bug. This violates <b>Open/Closed</b>; the type <code>Object</code> also gives the compiler nothing to check.</p>`,
      code: `class Circle { double r; Circle(double r) { this.r = r; } }
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
}`
    },
    mcq: { q: 'Where should the formula for a triangle\'s area live after the refactor?', options: ['In the Triangle class itself', 'In AreaCalculator', 'In a ShapeUtils class', 'In the UI'], answer: 0, explain: 'Replace conditional with polymorphism: each shape knows its own area, so the calculator only calls <code>s.area()</code>.' },
    hints: [
      `<p>The varying behaviour is "how to compute area". Put it behind an interface method that every shape implements.</p>`,
      `<p><code>interface Shape { double area(); }</code> and records <code>Circle</code>, <code>Rectangle</code>, <code>Triangle</code> implementing it.</p>`,
      `<p>Change the list type to <code>List&lt;? extends Shape&gt;</code> so non-shapes cannot sneak in. Validate dimensions in compact record constructors.</p>`
    ],
    solution: {
      approach: `<p><b>Replace conditional with polymorphism.</b> A <code>Shape</code> interface with <code>area()</code>; each shape is a small record that validates its dimensions. The calculator sums <code>area()</code> over <code>Shape</code>s and never changes again. The type parameter also fixes the "unknown object counts as zero" bug at compile time.</p>`,
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
        System.out.printf("%.2f%n", total(List.of(new Circle(1), new Rectangle(2, 3), new Triangle(4, 3))));  // 15.14
    }
}`,
      complexity: `<p>O(n) over shapes. New shape: 1 new record, 0 edited files.</p>`,
      followUps: ['If you keep adding <i>operations</i> (area, perimeter, draw, export) more often than shapes, would a sealed interface + pattern-matching switch be better? Why?', 'How would you add perimeter without breaking existing shape classes (default method? visitor?)']
    }
  });

  practice.push({
    title: 'The Car that builds its own petrol engine',
    level: 'Easy', tags: ['DIP', 'dependency injection'], companies: ['Tata Motors', 'Bosch', 'Google'],
    statement: `<p><code>Car</code> has a field <code>private final PetrolEngine engine = new PetrolEngine();</code> and <code>drive()</code> calls <code>engine.start()</code>. The company now builds electric and hybrid versions, and the test team wants to test <code>Car</code> without a real engine simulation (which takes seconds). <b>Which principle is violated?</b> Refactor so the same <code>Car</code> class works with any engine and can be tested with a fake.</p>`,
    constraints: `<p>Java 21. A car must always have an engine (no nulls). Engine start may fail; <code>drive()</code> should report it.</p>`,
    example: `<p><code>new Car(new ElectricMotor()).drive()</code> → ${H.c('g', '"silent whirr… driving"')}. <code>new Car(new FailingEngine()).drive()</code> in a test → ${H.c('y', '"engine failed to start"')}, no real simulation needed.</p>`,
    brute: {
      why: `<p>The high-level <code>Car</code> depends directly on the low-level <code>PetrolEngine</code> and even creates it. Supporting EVs means editing <code>Car</code> (or copy-pasting it into <code>ElectricCar</code>), and tests cannot swap the slow engine — a <b>Dependency Inversion</b> violation ("new is glue").</p>`,
      code: `class PetrolEngine {
    boolean start() {
        System.out.println("crank... vroom (slow simulation)");
        return true;
    }
}
class Car {
    private final PetrolEngine engine = new PetrolEngine();   // glued forever
    String drive() { return engine.start() ? "driving" : "engine failed to start"; }
}`
    },
    mcq: { q: 'Who should own the <code>Engine</code> interface?', options: ['The Car side (the high-level module that needs it)', 'The PetrolEngine package', 'A shared utils package', 'Nobody — use abstract classes only'], answer: 0, explain: 'In DIP the abstraction is shaped by and belongs to the client that uses it; engines plug into the car\'s "socket".' },
    hints: [
      `<p>What does <code>Car</code> really need? Only "something that can start". That is the abstraction.</p>`,
      `<p>Create <code>interface Engine { boolean start(); String sound(); }</code>; pass it to <code>Car</code>'s constructor with <code>Objects.requireNonNull</code>.</p>`,
      `<p>Write <code>PetrolEngine</code>, <code>ElectricMotor</code> and a test fake <code>FailingEngine</code>. Wire concrete engines in <code>main</code> (the composition root).</p>`
    ],
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
      complexity: `<p>O(1). Adding a hybrid engine: 1 new class, <code>Car</code> untouched; tests no longer need the slow simulation.</p>`,
      followUps: ['A hybrid uses both a petrol engine and a motor — how would you compose them (Composite pattern)?', 'Constructor vs setter injection here: which and why?']
    }
  });

  /* ======================= PRACTICE: MEDIUM ======================= */
  practice.push({
    title: 'Fat CustomerRepository used by a read-only dashboard',
    level: 'Medium', tags: ['ISP', 'CQRS', 'repository'], companies: ['Salesforce', 'Freshworks', 'Zoho'],
    statement: `<p><code>CustomerRepository</code> has 8 methods: <code>findById</code>, <code>findAll</code>, <code>countByCity</code>, <code>save</code>, <code>delete</code>, <code>bulkImport</code>, <code>exportCsv</code>, <code>purgeInactive</code>. The analytics dashboard only reads and counts, but its unit tests must stub all 8 methods, and last week a bug let the dashboard call <code>purgeInactive()</code>. <b>Which principle is violated?</b> Split the interface so each client sees only what it needs, while one storage class can still serve everyone.</p>`,
    constraints: `<p>Java 21. Keep one implementation class (<code>InMemoryCustomerStore</code>). The dashboard must not be able to call write or admin methods at compile time.</p>`,
    example: `<p>Dashboard: <code>countByCity()</code> → ${H.c('g', '{Pune=2, Delhi=1}')}. Trying <code>reader.purgeInactive()</code> in dashboard code → ${H.c('r', 'compile error')} after the refactor. Dashboard test fakes 2 methods instead of 8.</p>`,
    brute: {
      why: `<p>Every client depends on all 8 methods (an <b>Interface Segregation</b> violation): read-only code can perform destructive operations, tests stub methods they never call, and a signature change to <code>bulkImport</code> forces the dashboard to rebuild and retest.</p>`,
      code: `record Customer(String id, String city, boolean active) {}

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
}`
    },
    mcq: { q: 'How should the 8 methods be grouped?', options: ['By client role: reader (find/count), writer (save/delete), admin (bulk/export/purge)', 'Alphabetically into two interfaces', 'One interface per method', 'Keep one interface but add Javadoc warnings'], answer: 0, explain: 'ISP splits by who uses the methods. Three roles match three kinds of clients; one-method-per-interface would be needless fragmentation.' },
    hints: [
      `<p>List each client and the methods it calls: dashboard (findAll, countByCity), signup flow (save, findById), admin tool (bulkImport, exportCsv, purgeInactive, delete).</p>`,
      `<p>Create <code>CustomerReader</code>, <code>CustomerWriter</code>, <code>CustomerAdmin</code>. One class implements all three; each client's constructor asks for one role.</p>`,
      `<p>If a client needs two roles, accept both parameters or define a tiny combined interface. Make the dashboard test use a lambda-free tiny fake implementing only <code>CustomerReader</code>.</p>`
    ],
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
    String render() { return "Customers per city: " + reader.countByCity(); }
}
class AdminTool {
    private final CustomerAdmin admin;
    AdminTool(CustomerAdmin admin) { this.admin = admin; }
    String nightlyCleanup() { return "purged " + admin.purgeInactive(); }
}

class Wiring {
    public static void main(String[] args) {
        InMemoryCustomerStore store = new InMemoryCustomerStore();
        store.bulkImport(List.of(new Customer("1", "Pune", true), new Customer("2", "Pune", true), new Customer("3", "Delhi", false)));
        System.out.println(new Dashboard(store).render());       // {Delhi=1, Pune=2}
        System.out.println(new AdminTool(store).nightlyCleanup()); // purged 1
        System.out.println(new Dashboard(store).render());       // {Pune=2}
    }
}`,
      complexity: `<p>Same O(1)/O(n) operations as before. Dashboard dependency surface: 8 methods → 3; destructive calls from read-only code: impossible.</p>`,
      followUps: ['How would Spring let you inject the same bean as three different interface types?', 'The reader should hit a read replica: where does that decision live?']
    }
  });

  practice.push({
    title: 'Shipping cost calculator for many carriers',
    level: 'Medium', tags: ['OCP', 'SRP', 'strategy'], companies: ['Flipkart', 'Delhivery', 'Amazon'],
    statement: `<p><code>ShippingCalculator.cost(carrier, weightKg, region)</code> uses nested if/else: BlueDart = 50 + 20/kg, Delhivery = 40 + 25/kg, IndiaPost = 30 + 15/kg, and every carrier adds a <b>region surcharge</b> (METRO 0%, TIER2 10%, REMOTE 35%). Business adds carriers every quarter and sometimes changes surcharges. <b>Identify the violations</b> and redesign so a new carrier is a new class and surcharge changes touch one class.</p>`,
    constraints: `<p>Java 21. Weight &gt; 0 and ≤ 50 kg. Unknown carrier → clear exception. Return cost rounded to 2 decimals (use <code>BigDecimal</code> in real code).</p>`,
    example: `<p>BlueDart, 2 kg, TIER2 → (50 + 40) × 1.10 = ${H.c('g', '99.00')}. IndiaPost, 1 kg, REMOTE → (30 + 15) × 1.35 = ${H.c('g', '60.75')}. A new carrier "Shadowfax" = one new class.</p>`,
    brute: {
      why: `<p><b>OCP:</b> each carrier edits the if/else. <b>SRP:</b> carrier pricing (owned by partnerships team) and regional surcharges (owned by finance) are tangled in one method, so a surcharge change re-tests every carrier. The surcharge logic is also duplicated inside each branch.</p>`,
      code: `class ShippingCalculator {
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
}`
    },
    mcq: { q: 'Finance changes REMOTE surcharge to 40%. In the good design, which class changes?', options: ['Only the surcharge policy', 'Every carrier class', 'The calculator and every carrier', 'The Region enum and the calculator'], answer: 0, explain: 'Carrier rates and regional surcharges are separate responsibilities with separate owners, so they live in separate classes.' },
    hints: [
      `<p>There are two independent axes of change: carriers and regional surcharges. Each deserves its own abstraction.</p>`,
      `<p><code>interface CarrierRate { String code(); double baseCost(double kg); }</code> plus a <code>SurchargePolicy</code> (enum-backed map). The calculator combines them.</p>`,
      `<p>Register carriers from a list into a map (fail on duplicates). Validate weight once in the calculator. Use an <code>enum Region</code> so typos are compile errors.</p>`
    ],
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
        System.out.println(c.cost("BLUEDART", 2, Region.TIER2));   // 99.0
        System.out.println(c.cost("INDIAPOST", 1, Region.REMOTE)); // 60.75
        System.out.println(c.cost("SHADOWFAX", 3, Region.METRO));  // 89.0
    }
}`,
      complexity: `<p>O(1) per quote. New carrier: 1 class + 1 list entry. Surcharge change: 1 class. Neither re-tests the other axis.</p>`,
      followUps: ['Some carriers do not serve REMOTE regions — where does that rule go without breaking LSP?', 'Rates come from a partner API daily: how does <code>CarrierRate</code> stay the same while data changes?', 'Pick the cheapest carrier for a parcel: new class or method?']
    }
  });

  practice.push({
    title: 'Fleet refuelling breaks on electric cars',
    level: 'Medium', tags: ['LSP', 'composition', 'ISP'], companies: ['Ola', 'Uber', 'Tesla'],
    statement: `<p>A fleet app has <code>Vehicle</code> with <code>refuel(double litres)</code> and <code>range()</code>. <code>ElectricCar extends Vehicle</code> overrides <code>refuel</code> to throw because it charges instead. The nightly <code>FleetService.topUpAll()</code> refuels every vehicle and crashes on the first EV. Redesign so <b>every vehicle can be topped up through one honest contract</b>, EVs and petrol cars both work in the nightly job, and adding a CNG car or hydrogen truck needs no change to the job.</p>`,
    constraints: `<p>Java 21. Fuel tank capacity in litres, battery capacity in kWh. Range = energy × efficiency. No <code>instanceof</code> in the job.</p>`,
    example: `<p>Fleet: PetrolCar(tank 40 L, 15 km/L, 10 L left), ElectricCar(60 kWh, 6 km/kWh, 20 kWh left). <code>topUpAll()</code> → petrol tank to 40 L (range 600 km), battery to 60 kWh (range 360 km). ${H.c('g', 'No crash.')}</p>`,
    brute: {
      why: `<p><code>ElectricCar</code> cannot honour <code>refuel(litres)</code> — the parent contract is shaped around petrol. The override throws (surprise exception), so every <code>Vehicle</code> client is at risk: a <b>Liskov</b> violation caused by an abstraction that leaked a detail (litres) into the base type.</p>`,
      code: `class Vehicle {
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
}`
    },
    mcq: { q: 'What is the root cause of this LSP violation?', options: ['The base type exposes a petrol-specific detail (litres) as if every vehicle had it', 'ElectricCar forgot to call super', 'refuel should be static', 'Java lacks multiple inheritance'], answer: 0, explain: 'The abstraction is wrong. A neutral contract ("top up to full", "range") that every energy source can honour fixes the hierarchy.' },
    hints: [
      `<p>What does the nightly job really want? "Make every vehicle full." Litres vs kWh is a detail of the energy source.</p>`,
      `<p>Use composition: <code>interface EnergySource { void fillUp(); double rangeKm(); }</code> with <code>FuelTank</code> and <code>Battery</code>. A <code>Vehicle</code> <i>has</i> an energy source.</p>`,
      `<p>Petrol-only operations like <code>refuel(litres)</code> live on <code>FuelTank</code>, not on Vehicle. A hybrid could hold two sources (composite). The job calls <code>v.energy().fillUp()</code>.</p>`
    ],
    solution: {
      approach: `<p><b>Fix the abstraction, prefer composition.</b> Every vehicle has an <code>EnergySource</code> whose contract (<code>fillUp()</code>, <code>rangeKm()</code>) every implementation can keep. Unit-specific operations stay on the concrete source. The job depends only on the honest contract, so EVs, CNG or hydrogen all work. A <code>HybridSource</code> composite shows how the design extends without touching the job.</p>`,
      code: `interface EnergySource { void fillUp(); double rangeKm(); }

class FuelTank implements EnergySource {
    private final double capacityL, kmPerL; private double litres;
    FuelTank(double capacityL, double kmPerL, double litres) { this.capacityL = capacityL; this.kmPerL = kmPerL; this.litres = litres; }
    void add(double l) { if (l <= 0) throw new IllegalArgumentException(); litres = Math.min(capacityL, litres + l); }   // petrol-specific
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
        topUpAll(fleet);
        fleet.forEach(v -> System.out.println(v.plate() + " range " + v.energy().rangeKm() + " km"));
    }
}`,
      complexity: `<p>O(n) over the fleet. New energy type = 1 class; the job never changes and never throws for a vehicle type.</p>`,
      followUps: ['Charging takes hours but refuelling takes minutes — how would you model scheduling without breaking the contract?', 'Why is composition (Vehicle has-an EnergySource) better here than more subclasses (PetrolCar, ElectricCar, HybridCar)?']
    }
  });

  practice.push({
    title: 'Coupon validation hard-wired to a singleton DB and the system clock',
    level: 'Medium', tags: ['DIP', 'testability', 'Clock'], companies: ['Swiggy', 'Myntra', 'Shopify'],
    statement: `<p><code>CouponService.apply(code, cartTotal)</code> fetches the coupon with <code>CouponDb.getInstance().find(code)</code> and checks expiry with <code>LocalDate.now()</code>. Rules: coupon must exist, not be expired, cart ≥ minimum; discount = percent of cart capped at <code>maxOff</code>. QA cannot test "expires today vs yesterday" reliably and every test needs the shared DB. Refactor using DIP and write boundary tests in <code>main</code>.</p>`,
    constraints: `<p>Java 21, no mocking libraries. Expiry date is inclusive (valid through the end of that day). Return the discount amount (0 if not applicable) and a reason.</p>`,
    example: `<p>Coupon SAVE20: 20%, max 150, min cart 500, expires 2026-03-31. Cart 1000 on 2026-03-31 → ${H.c('g', '150 (capped)')}. Same on 2026-04-01 → ${H.c('r', '0 (expired)')}. Cart 400 → ${H.c('y', '0 (below minimum)')}.</p>`,
    brute: {
      why: `<p>Two hidden dependencies: a global singleton (shared mutable state, cannot substitute) and the wall clock (non-deterministic). The business rule cannot be tested in isolation, tests interfere with each other through the singleton, and midnight-boundary bugs slip through — a <b>Dependency Inversion</b> violation.</p>`,
      code: `record Coupon(String code, int percent, double maxOff, double minCart, LocalDate expires) {}

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
}`
    },
    mcq: { q: 'Why inject <code>java.time.Clock</code> instead of calling <code>LocalDate.now()</code>?', options: ['So tests can fix "now" to any instant and zone deterministically', 'Because LocalDate.now() is deprecated', 'Clock is faster', 'To avoid time zones entirely'], answer: 0, explain: 'Clock is the JDK\'s built-in abstraction for time. <code>Clock.fixed</code> makes expiry boundaries testable; production passes <code>Clock.system(zone)</code>.' },
    hints: [
      `<p>List everything the rule reads that is not a parameter: the coupon store and the current date. Each becomes an injected dependency.</p>`,
      `<p><code>interface CouponRepository { Optional&lt;Coupon&gt; find(String code); }</code> + <code>Clock</code> in the constructor. Return a small result record with amount + reason.</p>`,
      `<p>Boundary tests: expiry day itself (valid), next day (expired), cart exactly at minimum (valid), cart just below, discount exactly at the cap. Use <code>Clock.fixed(..., ZoneId.of("Asia/Kolkata"))</code>.</p>`
    ],
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
        if (cart < c.minCart()) return new CouponResult(0, "below minimum " + c.minCart());
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
        System.out.println("ok " + r);
    }
    public static void main(String[] args) {
        expect(at("2026-03-31").apply("SAVE20", 1000), 150, "ok");        // last valid day, capped
        expect(at("2026-04-01").apply("SAVE20", 1000), 0, "expired");
        expect(at("2026-03-01").apply("SAVE20", 500), 100, "ok");         // exactly at minimum
        expect(at("2026-03-01").apply("SAVE20", 499.99), 0, "below");
        expect(at("2026-03-01").apply("NOPE", 1000), 0, "unknown");
    }
}`,
      complexity: `<p>O(1) per application. Tests: 5 deterministic boundary cases in milliseconds, no shared DB, no dependence on the real date.</p>`,
      followUps: ['Per-user usage limits ("once per user") need storage of redemptions — new port or extend CouponRepository? (think ISP)', 'Why are singletons with global state considered a DIP/testability smell, and when is a singleton still fine?']
    }
  });

  practice.push({
    title: 'Invoice that calculates, taxes by country and prints',
    level: 'Medium', tags: ['SRP', 'OCP', 'tax'], companies: ['Stripe', 'Chargebee', 'SAP'],
    statement: `<p><code>Invoice</code> holds line items and has <code>total()</code> (which includes a <code>switch</code> on country: IN 18% GST, UK 20% VAT, US 0% at federal level), and <code>print()</code> which formats a text invoice. The company is launching in Germany (19%) and Singapore (9%), and the design team wants a new layout. <b>Name both violated principles</b> and refactor so adding a country and changing the layout each touch one place.</p>`,
    constraints: `<p>Java 21. Money as <code>BigDecimal</code> with 2-decimal HALF_UP rounding. Unknown country → exception at invoice creation, not at print time.</p>`,
    example: `<p>Items: 2 × 100.00 + 1 × 50.00 = 250.00. Country IN → tax 45.00, total ${H.c('g', '295.00')}. Country DE (added as new class) → tax 47.50, total ${H.c('g', '297.50')}.</p>`,
    brute: {
      why: `<p><b>SRP:</b> one class serves finance (tax rules), sales (line items) and design (layout). <b>OCP:</b> every new country edits the switch inside <code>total()</code>. A layout tweak re-opens the class that computes money — risky.</p>`,
      code: `class Invoice {
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
}`
    },
    mcq: { q: 'Where should "Germany charges 19%" be written after the refactor?', options: ['In a new GermanVat class implementing TaxPolicy', 'In the Invoice switch', 'In the InvoicePrinter', 'In a properties file read by Invoice.print()'], answer: 0, explain: 'Tax rules are their own responsibility with their own axis of change (countries), so each country is a TaxPolicy implementation.' },
    hints: [
      `<p>Three responsibilities: line items and subtotal (sales), tax by country (finance), formatting (design).</p>`,
      `<p><code>record LineItem</code>, <code>Invoice</code> (lines + subtotal + injected <code>TaxPolicy</code>), <code>interface TaxPolicy { String country(); BigDecimal taxOn(BigDecimal subtotal); }</code>, <code>InvoicePrinter</code>.</p>`,
      `<p>A <code>TaxPolicies</code> registry resolves the country when the invoice is created (fail fast). Use <code>setScale(2, RoundingMode.HALF_UP)</code> once, on the tax amount.</p>`
    ],
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
    public static void main(String[] args) {
        TaxPolicies taxes = new TaxPolicies(List.of(
                new FlatRateTax("IN", new BigDecimal("0.18")), new FlatRateTax("UK", new BigDecimal("0.20")),
                new FlatRateTax("US", BigDecimal.ZERO), new FlatRateTax("DE", new BigDecimal("0.19")),
                new FlatRateTax("SG", new BigDecimal("0.09"))));
        Invoice inv = new Invoice(taxes.forCountry("DE"));
        inv.add(new LineItem("Pen", 2, new BigDecimal("100.00")));
        inv.add(new LineItem("Ink", 1, new BigDecimal("50.00")));
        System.out.println(new InvoicePrinter().render(inv));   // Tax 47.50, Total 297.50
    }
}`,
      complexity: `<p>O(items) per total. New country: one registry entry (or one class for complex rules like US state taxes). New layout: one printer class.</p>`,
      followUps: ['US sales tax depends on state and product category — how does TaxPolicy\'s signature need to evolve (pass the Invoice or a TaxContext)?', 'Should Invoice store the computed tax at issue time? (hint: legal immutability of issued invoices)']
    }
  });

  practice.push({
    title: 'A logger with if-chains for levels and destinations',
    level: 'Medium', tags: ['OCP', 'SRP', 'DIP', 'logging'], companies: ['Atlassian', 'Datadog', 'Oracle'],
    statement: `<p>A home-grown <code>Logger.log(level, msg)</code> checks a string config <code>"console"</code>/<code>"file"</code> with if/else, filters levels with string comparisons, and formats lines itself. Teams want JSON output, a Kafka destination and multiple destinations at once. <b>Identify the violations</b> and design a small logging library where formats and destinations plug in, the minimum level is configurable, and tests can capture output.</p>`,
    constraints: `<p>Java 21. Levels DEBUG &lt; INFO &lt; WARN &lt; ERROR. One failing destination must not stop others. Keep it single-threaded for this exercise.</p>`,
    example: `<p>Min level INFO, appenders [console(text), memory(json)]. <code>debug("x")</code> → nothing. <code>warn("disk 91%")</code> → console: <code>WARN disk 91%</code>; memory: <code>{"level":"WARN","msg":"disk 91%"}</code>.</p>`,
    brute: {
      why: `<p><b>OCP:</b> every destination or format edits <code>log()</code>. <b>SRP:</b> filtering, formatting and writing are mixed. <b>DIP:</b> the logger creates file writers itself, so tests must read files from disk. String levels also allow typos ("WARNING") that silently never log.</p>`,
      code: `class Logger {
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
}`
    },
    mcq: { q: 'Which split mirrors real logging frameworks (Logback/Log4j)?', options: ['Logger (level filter) → Appender (destination) → Layout (format)', 'One Logger subclass per destination', 'A static LogUtils class', 'Separate loggers per level'], answer: 0, explain: 'Frameworks separate what/whether to log, where it goes and how it looks — each an independent axis of change.' },
    hints: [
      `<p>Three axes of change: which messages pass (level), how a line looks (format), where it goes (destination). Each becomes an abstraction.</p>`,
      `<p><code>enum Level</code>; <code>interface LogFormat { String format(Level l, String msg); }</code>; <code>interface Appender { void append(String line); }</code>; Logger takes a list of (format, appender) pairs.</p>`,
      `<p>Wrap each append in try/catch so one broken destination does not stop others. A <code>MemoryAppender</code> collecting lines makes testing trivial.</p>`
    ],
    solution: {
      approach: `<p><b>Separate filter, format and destination; inject them.</b> <code>Level</code> is an enum (typos become compile errors). <code>LogFormat</code> and <code>Appender</code> are tiny interfaces; a <code>Sink</code> pairs them so each destination can have its own format. <code>Logger</code> filters by level and fans out to sinks, isolating failures. JSON or Kafka support = new classes only; tests use <code>MemoryAppender</code>.</p>`,
      code: `enum Level { DEBUG, INFO, WARN, ERROR }

interface LogFormat { String format(Level level, String msg); }
interface Appender { void append(String line); }
record Sink(LogFormat format, Appender appender) {}

class TextFormat implements LogFormat { public String format(Level l, String m) { return l + " " + m; } }
class JsonFormat implements LogFormat {
    public String format(Level l, String m) { return "{\\"level\\":\\"" + l + "\\",\\"msg\\":\\"" + m.replace("\\"", "\\\\\\"") + "\\"}"; }
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
            catch (RuntimeException e) { System.err.println("appender failed: " + e.getMessage()); }   // isolate failures
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
        System.out.println(mem.lines);   // [{"level":"WARN","msg":"disk 91%"}]
    }
}`,
      complexity: `<p>O(sinks) per log call. New format or destination: 1 class, 0 edits. Tests read <code>MemoryAppender.lines</code> instead of files.</p>`,
      followUps: ['Make appenders asynchronous with a bounded queue — what happens when it is full (drop, block)?', 'Add per-package log levels (com.shop.payment=DEBUG): which class changes?', 'How does SLF4J use DIP so libraries do not depend on a specific logging backend?']
    }
  });

  /* ======================= PRACTICE: HARD ======================= */
  practice.push({
    title: 'Parking lot exit flow: refactor a God class',
    level: 'Hard', tags: ['SOLID', 'parking lot', 'machine coding'], companies: ['Amazon', 'Flipkart', 'Uber', 'Microsoft'],
    statement: `<p>A parking lot's <code>ParkingLot</code> class tracks free spots per vehicle type, issues tickets, computes fees with a <code>switch</code> on vehicle type, charges via <code>new CardTerminal()</code> or cash, reads the time with <code>System.currentTimeMillis()</code>, and prints a receipt. New requirements: EV spots with a charging fee, weekend pricing, UPI payments, and fast unit tests. <b>Write the findings (which principle, where) and implement a SOLID design</b> for park → exit → pay → receipt.</p>`,
    constraints: `<p>Java 21. Vehicle types: BIKE, CAR, EV, TRUCK. Pricing: first hour flat, then per started hour (BIKE 10/5, CAR 30/20, TRUCK 60/40; EV = CAR rate + 15 per hour charging). Weekend: +25%. Lot full → reject park. Paying twice for one ticket → reject.</p>`,
    example: `<p>CAR parks Sat 10:00, exits 12:30 → hours = 3 (started hours) → 30 + 2×20 = 70 → weekend ×1.25 = ${H.c('g', '87.50')}. EV, Mon 09:00–10:00 → 30 + 15 = ${H.c('g', '45.00')}. Third car when 2 car spots exist → ${H.c('r', 'rejected: no spot')}.</p>`,
    brute: {
      why: `<p><b>S:</b> spots, tickets, pricing, payments and receipts in one class (5 actors). <b>O:</b> fee switch and payment if/else edited for EV/UPI/weekend. <b>D:</b> <code>new CardTerminal()</code> and <code>System.currentTimeMillis()</code> make tests slow and time-dependent. <b>I/L</b> risks appear as soon as someone adds "refund" to a shared payment interface that cash cannot honour. Every new requirement edits the same method.</p>`,
      code: `class CardTerminal { boolean charge(double amt) { System.out.println("card charged " + amt); return true; } }

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
}`
    },
    mcq: { q: 'Weekend pricing (+25%) should be added how?', options: ['As a decorator/wrapper PricingPolicy around the base policy, using the injected Clock', 'As another case in the fee switch', 'Inside the payment classes', 'By subclassing ParkingLot as WeekendParkingLot'], answer: 0, explain: 'A <code>WeekendSurcharge implements PricingPolicy</code> wrapping the base policy adds behaviour without editing it (OCP), and reading time from the ticket/Clock keeps it testable (DIP).' },
    hints: [
      `<p>Write one line per responsibility: spot allocation, ticketing, pricing, payment, receipts, time. Each is a candidate class or port.</p>`,
      `<p>Ports: <code>PricingPolicy { double fee(Ticket t, Instant exit); }</code>, <code>PaymentMethod { String code(); boolean pay(double amt); }</code>, <code>Clock</code>. Classes: <code>SpotInventory</code>, <code>Ticket</code> record, <code>ParkingService</code> orchestrator, <code>ReceiptFormatter</code>.</p>`,
      `<p>Pricing: <code>BaseRates</code> (map type → first/next), <code>EvChargingFee</code> and <code>WeekendSurcharge</code> as decorators. Hours = ceil(minutes/60), min 1. Mark tickets paid to block double payment; free the spot only after successful payment.</p>`
    ],
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
        svc.park("MH12CD0001", VehicleType.CAR).orElseThrow();
        System.out.println(svc.park("MH12EF0002", VehicleType.CAR).isPresent());   // false: full
        clock.advance(Duration.ofMinutes(150));
        System.out.println(svc.exit(car.id(), "UPI"));                            // 87.50 (3h, weekend)
        try { svc.exit(car.id(), "UPI"); } catch (IllegalStateException e) { System.out.println("blocked: " + e.getMessage()); }
    }
}`,
      complexity: `<p>O(1) per park/exit (hash maps, EnumMap). Each new requirement (UPI, EV fee, weekend) was a new class; <code>ParkingService</code> never changed for them. Tests simulate Saturdays and 150 minutes instantly via <code>MutableClock</code>.</p>`,
      followUps: ['Multiple floors and nearest-spot allocation: which class changes and which interface would you introduce (SpotAllocationStrategy)?', 'Two exit gates processing the same ticket concurrently — how do you make <code>exit</code> safe?', 'Lost ticket with a fixed penalty: new PricingPolicy or new flow?']
    }
  });

  practice.push({
    title: 'Plugin text pipeline: add filters without touching the processor',
    level: 'Hard', tags: ['OCP', 'DIP', 'pipeline', 'registry'], companies: ['Google', 'Meta', 'Grammarly'],
    statement: `<p>A content moderation service has <code>TextProcessor.process(text, boolean trim, boolean lower, boolean maskEmails, boolean censor)</code>. Every new rule adds a boolean parameter and an <code>if</code>, the order of steps is hard-coded, and call sites look like <code>process(t, true, false, true, true)</code>. Design a pipeline where <b>new filters are plugged in by name from configuration</b> (e.g. <code>"trim,mask-emails,censor"</code>), the order comes from config, and the core never changes. Add a new <code>mask-phones</code> filter to prove it.</p>`,
    constraints: `<p>Java 21. Filters are pure functions String → String. Unknown filter names fail at startup with a helpful message listing known names. Banned words list is injected (not hard-coded).</p>`,
    example: `<p>Config <code>"trim,mask-emails,censor"</code>, banned = [darn]. Input <code>"  Mail me at a@b.com, darn it  "</code> → ${H.c('g', '"Mail me at ***@***, **** it"')}. Config <code>"trim,mask-phones"</code> works after adding one class + one registration.</p>`,
    brute: {
      why: `<p>Boolean-flag parameters violate <b>OCP</b> (each rule edits the signature and every caller) and hide meaning at call sites. The hard-coded order and banned list couple policy to data (<b>DIP</b>: configuration and word lists are details). It is also an <b>SRP</b> pile: four unrelated rules in one method, each owned by a different team (privacy, trust &amp; safety, formatting).</p>`,
      code: `class TextProcessor {
    String process(String text, boolean trim, boolean lower, boolean maskEmails, boolean censor) {
        String t = text;
        if (trim) t = t.trim();
        if (lower) t = t.toLowerCase();
        if (maskEmails) t = t.replaceAll("[\\\\w.+-]+@[\\\\w-]+\\\\.[\\\\w.]+", "***@***");
        if (censor) t = t.replaceAll("(?i)darn", "****");            // banned list hard-coded
        return t;                                                     // new rule? new boolean + new if
    }
}`
    },
    mcq: { q: 'What makes the pipeline open for extension?', options: ['A TextFilter interface plus a name → factory registry used to build the chain from config', 'An enum of all filters with a switch', 'Subclassing TextProcessor for each combination', 'More boolean parameters with default values'], answer: 0, explain: 'Filters implement one interface and register themselves by name; the pipeline composes whatever the config lists. The core code never learns about specific filters.' },
    hints: [
      `<p>Each step is "String in, String out" — a perfect single-method interface. A pipeline is just a list of them applied in order.</p>`,
      `<p><code>interface TextFilter { String apply(String s); }</code>, <code>FilterRegistry</code> mapping names to <code>Supplier&lt;TextFilter&gt;</code>, <code>Pipeline.fromConfig(String, registry)</code>.</p>`,
      `<p>Inject the banned-word list into <code>CensorFilter</code>'s constructor (registered with a lambda that captures it). Validate all names before building; quote banned words with <code>Pattern.quote</code> and use word boundaries.</p>`
    ],
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
    }
}`,
      complexity: `<p>O(k × n) for k filters over text of length n (each regex pass is linear in practice). Adding a filter: 1 class + 1 registration; Pipeline and existing filters unchanged.</p>`,
      followUps: ['Some filters need to <i>reject</i> text instead of transforming it — change the interface or add a second role (<code>TextValidator</code>)?', 'Load third-party filters from jars at runtime: how would <code>ServiceLoader</code> fit, and how do you sandbox them?', 'Make the order of filters safe (e.g. lower before censor) — validation rules in the registry?']
    }
  });

  practice.push({
    title: 'Stack extends ArrayList, and a BoundedStack that throws',
    level: 'Hard', tags: ['LSP', 'composition over inheritance', 'contract tests'], companies: ['Oracle', 'Goldman Sachs', 'Bloomberg'],
    statement: `<p>A codebase has <code>class LifoStack&lt;T&gt; extends ArrayList&lt;T&gt;</code> with <code>push</code>/<code>pop</code>, and <code>BoundedStack&lt;T&gt; extends LifoStack&lt;T&gt;</code> whose <code>push</code> throws when full. Bugs: callers use <code>add(0, x)</code> and <code>remove(i)</code> (inherited from ArrayList) and break LIFO order; a scheduler written for <code>LifoStack</code> crashes with a <code>BoundedStack</code>. <b>Explain both LSP problems</b> and design a stack abstraction whose contract both an unbounded and a bounded stack can honour, verified by a shared contract test.</p>`,
    constraints: `<p>Java 21. Operations: push, pop, peek, size, isEmpty. Pop/peek on empty must not throw (return <code>Optional</code>). No public method may let callers bypass LIFO.</p>`,
    example: `<p>Bounded(capacity 2): push A → true, push B → true, push C → ${H.c('y', 'false (full, unchanged)')}, pop → ${H.c('g', 'B')}. The same contract test passes for both <code>ArrayLifoStack</code> and <code>BoundedLifoStack</code>.</p>`,
    brute: {
      why: `<p>(1) <b>Inheritance for reuse</b>: extending ArrayList exposes ~40 list methods that break the stack invariant (only the top is accessible) — the subclass cannot protect its own invariant (the same flaw as <code>java.util.Stack extends Vector</code>). (2) <code>BoundedStack.push</code> <b>strengthens the precondition</b> ("only when not full") and adds a surprise exception, so clients of <code>LifoStack</code> break — a direct LSP violation.</p>`,
      code: `class LifoStack<T> extends ArrayList<T> {
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
}`
    },
    mcq: { q: 'How can a bounded stack and an unbounded stack share one honest contract?', options: ['Make push return boolean ("accepted or not") in the interface, so "full" is part of the contract', 'Let the bounded stack silently drop the item and return void', 'Catch IllegalStateException in every caller', 'Make capacity a static constant'], answer: 0, explain: 'Like <code>Queue.offer</code>, a boolean result lets every implementation keep the promise. The unbounded one always returns true; the bounded one returns false when full. Callers wrote code for the contract, so nothing surprises them.' },
    hints: [
      `<p>Problem 1 is solved by <b>composition</b>: keep an <code>ArrayDeque</code> inside and expose only stack operations.</p>`,
      `<p>Problem 2 is solved by designing the <b>interface contract</b> so that "cannot accept" is a normal outcome: <code>boolean push(T)</code>, <code>Optional&lt;T&gt; pop()</code>.</p>`,
      `<p>Write a contract test once (a method taking a <code>Supplier</code> of fresh stacks) that checks LIFO order, empty behaviour, size, and "push false ⇒ unchanged"; run it against both implementations.</p>`
    ],
    solution: {
      approach: `<p><b>Composition + contract-first interface + contract tests.</b> <code>LifoStack&lt;T&gt;</code> is an interface whose contract allows rejection (<code>push</code> returns false and leaves the stack unchanged) and uses <code>Optional</code> for empty pops. <code>ArrayLifoStack</code> wraps an <code>ArrayDeque</code> (no list methods leak). <code>BoundedLifoStack</code> wraps another stack (decorator) and refuses when full — honouring the same contract. One reusable contract test verifies every implementation, which is how LSP is enforced in practice.</p>`,
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
    }
}`,
      complexity: `<p>All operations O(1) amortised (ArrayDeque). The contract test is O(1) per implementation and catches LSP regressions automatically in CI.</p>`,
      followUps: ['Why does <code>java.util.Stack</code> (extends Vector) violate the same idea, and why does the JDK recommend <code>Deque</code>?', 'A thread-safe stack: decorator around LifoStack or a new implementation? What changes in the contract (blocking vs non-blocking)?', 'How do <code>Queue.add</code> (throws) vs <code>Queue.offer</code> (returns false) relate to this design?']
    }
  });

  practice.push({
    title: 'Testable checkout with inventory, payment and notification ports',
    level: 'Hard', tags: ['DIP', 'ISP', 'SRP', 'hexagonal'], companies: ['Amazon', 'Shopify', 'Zepto', 'Walmart'],
    statement: `<p><code>CheckoutService.checkout(cart)</code> calls the static <code>InventoryDb.reserve(...)</code>, <code>new RazorpayClient(key).charge(...)</code> and <code>new SmtpMailer().send(...)</code>. If payment fails after stock was reserved, the stock is never released. The inventory class exposes 12 methods (stock admin, reports, reservations) to checkout. Redesign with <b>domain-owned ports</b>, a <b>narrow inventory role</b> for checkout, correct <b>compensation</b> on payment failure, and tests with fakes for: success, out of stock, payment declined (stock released), email failure (order still succeeds).</p>`,
    constraints: `<p>Java 21, no frameworks. A cart has (sku, qty) lines and a total. Reservation is all-or-nothing. Email is best-effort.</p>`,
    example: `<p>Stock {pen: 5}. Cart [pen×2] + payment OK → ${H.c('g', 'CONFIRMED')}, stock 3, email sent. Cart [pen×9] → ${H.c('y', 'OUT_OF_STOCK')}. Cart [pen×2] + decline → ${H.c('r', 'PAYMENT_DECLINED')}, stock back to 5.</p>`,
    brute: {
      why: `<p><b>DIP:</b> static and <code>new</code>-ed vendor clients make the flow untestable and vendor-locked. <b>ISP:</b> checkout depends on a 12-method inventory API. <b>SRP:</b> orchestration, vendor calls and email wording are mixed. The missing compensation bug survived precisely because nobody could test "payment declined" without a real gateway.</p>`,
      code: `class InventoryDb {                                        // static global, 12 methods in real life
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
}`
    },
    mcq: { q: 'Which inventory interface should checkout depend on?', options: ['A narrow StockReservations port: reserve(lines) and release(lines)', 'The full 12-method InventoryDb', 'A generic Repository&lt;Object&gt;', 'None — call the DB directly from checkout'], answer: 0, explain: 'ISP + DIP: the checkout domain defines the small port it needs, shaped by its use case (reserve/release), and the inventory adapter implements it.' },
    hints: [
      `<p>List what checkout needs from the outside world: reserve stock, release stock, charge money, send a confirmation. Those four verbs are your ports.</p>`,
      `<p><code>StockReservations { boolean reserve(List&lt;Line&gt;); void release(List&lt;Line&gt;); }</code>, <code>PaymentGateway { boolean charge(double, String ref); }</code>, <code>OrderNotifier { void confirmed(Order); }</code>. Inject all three.</p>`,
      `<p>Flow: reserve (all-or-nothing) → charge → on decline release and return → notify inside try/catch (best effort). Fakes: in-memory stock, scripted gateway (approve/decline), notifier that can be told to throw.</p>`
    ],
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
        for (Line l : lines) if (qty.getOrDefault(l.sku(), 0) < l.qty()) return false;   // check all first: all-or-nothing
        lines.forEach(l -> qty.merge(l.sku(), -l.qty(), Integer::sum));
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
    }
}`,
      complexity: `<p>O(lines) per checkout. Four business scenarios verified in milliseconds; vendor swaps (Razorpay → Stripe, SMTP → SES) are new adapters only.</p>`,
      followUps: ['Payment times out (unknown result) — how do idempotency keys and a status query port change the flow?', 'Two checkouts race for the last pen — where does the atomicity guarantee belong (adapter/DB), and how does the port contract express it?', 'Move notifications to an event (OrderConfirmed) published to a queue: which class changes?']
    }
  });

  /* ======================= QUIZ ======================= */
  quiz.push(
    { q: 'In Uncle Bob\'s modern wording, SRP means a module should be responsible to…', options: ['One actor (one group of people who request changes)', 'One method', 'One database table', 'One developer'], answer: 0, explain: '"A module should be responsible to one, and only one, actor." A class with many methods can still follow SRP if they all change for the same stakeholder.' },
    { q: 'A <code>DiscountCalculator</code> has a <code>switch</code> on customer type that grows every month. Which principle is most directly violated?', options: ['Open/Closed', 'Liskov Substitution', 'Interface Segregation', 'Dependency Inversion'], answer: 0, explain: 'Each new discount modifies tested code. Replace the conditional with polymorphism (a <code>DiscountPolicy</code> per type) so new types are added, not edited in.' },
    { q: '<code>Square extends Rectangle</code> overrides <code>setWidth</code> to also set the height. Client code expecting area = w × h breaks. This violates…', options: ['Liskov Substitution', 'Single Responsibility', 'Open/Closed', 'Interface Segregation'], answer: 0, explain: 'The subclass breaks the behavioural contract of the parent ("setWidth changes only width"), so it is not substitutable.' },
    { q: 'Which of these is a classic smell of an Interface Segregation violation?', options: ['Implementations that throw <code>UnsupportedOperationException</code> for methods they cannot support', 'A class with a private helper method', 'An interface with one method', 'Using generics in an interface'], answer: 0, explain: 'Forced, fake implementations mean the interface is too fat for some implementers. Split it into role interfaces.' },
    { q: 'In the Dependency Inversion Principle, who should own (define) the <code>OrderRepository</code> interface?', options: ['The high-level domain module that uses it', 'The MySQL adapter package', 'The JDBC driver vendor', 'A shared utils module used by everyone'], answer: 0, explain: 'The abstraction is shaped by the client\'s needs and lives with the policy; low-level details depend on it. That is what "inversion" refers to.' },
    { q: 'What is the relationship between DIP and Dependency Injection (DI)?', options: ['DI (passing dependencies in) is a technique often used to achieve DIP', 'They are exactly the same thing', 'DI forbids interfaces', 'DIP requires a framework like Spring'], answer: 0, explain: 'DIP is the principle (depend on abstractions). DI is how you supply the concrete implementation from outside. IoC containers automate DI. You can do DI with plain constructors.' },
    { q: 'A subclass method requires <code>amount ≤ 1000</code> while the parent accepted any positive amount. In LSP terms this…', options: ['Strengthens a precondition — not allowed', 'Weakens a precondition — allowed', 'Strengthens a postcondition — allowed', 'Has nothing to do with LSP'], answer: 0, explain: 'Subtypes may accept <i>more</i> (weaker preconditions) and promise <i>more</i> (stronger postconditions), never less. Demanding more from callers breaks parent-based clients.' },
    { q: 'Which change best applies DIP to code that calls <code>LocalDate.now()</code> inside a business rule?', options: ['Inject a <code>java.time.Clock</code> and call <code>LocalDate.now(clock)</code>', 'Wrap the call in try/catch', 'Make the method static', 'Cache today\'s date in a static field'], answer: 0, explain: 'Time is a volatile, non-deterministic dependency. <code>Clock</code> is the JDK\'s abstraction for it; tests pass <code>Clock.fixed(...)</code>.' },
    { q: 'You have exactly one implementation of a payment interface, no plans for another, and no testing need for a fake. Strongest design advice?', options: ['Consider a concrete class for now (YAGNI); extract an interface when a real need appears', 'Always add an interface plus an abstract factory', 'Use reflection to load implementations', 'Duplicate the class just in case'], answer: 0, explain: 'SOLID responds to real or clearly expected change. Interfaces with one implementation and no test seam are needless complexity; IDEs extract interfaces in seconds when needed.' },
    { q: 'Java 21 offers <code>sealed</code> interfaces with exhaustive pattern-matching <code>switch</code>. When is that a better fit than polymorphic classes (Strategy)?', options: ['When the set of types is fixed but new operations are added often', 'When new types are added every week by different teams', 'Never — switches always violate OCP', 'Only for primitive types'], answer: 0, explain: 'This is the expression problem. Polymorphism makes adding types cheap; sealed + switch makes adding operations cheap with compiler-checked exhaustiveness. Pick by the axis of change.' },
    { q: 'An <code>OfficeMachine</code> implements <code>Printer</code>, <code>Scanner</code> and <code>Fax</code>. A <code>PrintQueue</code> constructor should accept…', options: ['A <code>Printer</code>', 'An <code>OfficeMachine</code>', 'An <code>Object</code>', 'All three interfaces as separate parameters'], answer: 0, explain: 'Depend on the narrowest role you use. PrintQueue then works with any printer and is unaffected by fax/scan changes.' },
    { q: 'Which statement about a Facade and SRP is correct?', options: ['A facade with many methods that only delegate (no business logic) does not violate SRP', 'Any class with more than 5 methods violates SRP', 'Facades must contain all business rules', 'Facades are forbidden by SOLID'], answer: 0, explain: 'A facade offers a convenient entry point and has no reason to change except "expose a new operation". A God class, by contrast, contains logic for many actors.' }
  );

  /* ======================= INTERVIEW ======================= */
  interview.push(
    { q: 'What are the SOLID principles? Explain each in one or two sentences with an example.', level: 'B', a: `<p><b>S</b> — Single Responsibility: one reason to change (one actor). An <code>Invoice</code> should not also print and email itself. <b>O</b> — Open/Closed: add behaviour by adding code, not editing tested code; new discount = new <code>DiscountPolicy</code> class. <b>L</b> — Liskov Substitution: subtypes must keep the parent's promises; a <code>Penguin</code> that throws from <code>fly()</code> breaks code written for <code>Bird</code>. <b>I</b> — Interface Segregation: clients should not depend on methods they do not use; split <code>Machine</code> into <code>Printer</code>, <code>Scanner</code>, <code>Fax</code>. <b>D</b> — Dependency Inversion: business logic depends on abstractions it owns (<code>OrderRepository</code>), and MySQL/SMTP adapters implement them. Together they keep changes local and code testable.</p>`, followUps: ['Which one gives the biggest win in a typical legacy codebase?', 'Who coined the acronym and when?'] },
    { q: 'Is SRP the same as "a class should do only one thing"?', level: 'B', a: `<p>No. "Do one thing" applies to <b>functions</b>. SRP is about <b>reasons to change</b>: a class should be responsible to one actor. A <code>ShoppingCart</code> with add, remove, total and itemCount does several things but all change for the same reason (cart rules), so it follows SRP. An <code>Employee</code> with <code>calculatePay</code> (finance), <code>reportHours</code> (HR) and <code>save</code> (DBA) violates it even if each method is tiny. The danger is shared code between actors — HR edits a helper and payroll silently changes. Over-splitting by method destroys cohesion, the opposite smell.</p>`, followUps: ['How do you identify actors in a requirement?', 'What is accidental duplication and why should you sometimes keep it?'] },
    { q: 'How do you achieve the Open/Closed Principle in Java? Give a concrete refactoring.', level: 'I', a: `<p>Identify the axis of change (e.g. payment methods), extract an interface for the varying behaviour (<code>PaymentMethod { String code(); double charge(double amt); }</code>), move each <code>if/case</code> branch into its own implementing class, and let the caller hold a <code>Map&lt;String, PaymentMethod&gt;</code> built from an injected list. New method = new class + one wiring line in the composition root (or zero with Spring's <code>List&lt;PaymentMethod&gt;</code> injection or <code>ServiceLoader</code>). Patterns delivering OCP: Strategy, Decorator, Template Method, Observer, plugins. Note OCP is strategic: you choose which changes to be closed against, based on real variation.</p>`, followUps: ['Is the one wiring line a violation of OCP?', 'When would you keep a switch instead (sealed types)?'] },
    { q: 'Explain the Liskov Substitution Principle using contracts. What exactly is a subclass allowed to change?', level: 'I', a: `<p>A subtype must be usable anywhere the supertype is expected without breaking correctness. In Design-by-Contract terms a subclass may: <b>weaken preconditions</b> (accept more inputs), <b>strengthen postconditions</b> (promise more), and must <b>preserve invariants</b> and the history constraint (not allow state changes the parent forbids). It must not throw new kinds of exceptions clients do not expect. Java checks only signatures (visibility, checked exceptions, covariant returns) — behaviour is on you. Square/Rectangle, read-only collections throwing on <code>add</code>, and <code>Timestamp extends Date</code> breaking equals symmetry are classic examples. Enforce it with <b>contract tests</b> run against all implementations.</p>`, followUps: ['How do covariant return types relate to LSP?', 'Is <code>Collections.unmodifiableList</code> an LSP violation?'] },
    { q: 'How would you fix the Square/Rectangle problem? Give at least two options.', level: 'I', a: `<p>(1) <b>Siblings under a smaller abstraction</b>: <code>interface Shape { double area(); }</code> with <code>Rectangle</code> and <code>Square</code> both implementing it; code needing independent width/height asks for <code>Rectangle</code> specifically. (2) <b>Immutability</b>: records with no setters — <code>Rectangle withWidth(w)</code> returns a new object; with no mutators, there is no promise to break, and a <code>Square</code> can offer <code>toRectangle()</code>. (3) Model squareness as a <b>query</b>: one <code>Rectangle</code> with <code>isSquare()</code>. Avoid the anti-fix of <code>instanceof</code> checks in clients — that spreads knowledge of subclasses everywhere and breaks OCP.</p>`, followUps: ['Why is "a square is a rectangle in math" not enough in code?', 'How would a contract test catch this?'] },
    { q: 'What is the difference between ISP and SRP? Can a class follow one and violate the other?', level: 'I', a: `<p>SRP looks at a class from the <b>inside</b>: why would it change, for which actor? ISP looks from the <b>client's side</b>: what does each caller or implementer have to depend on? A cohesive <code>OfficeMachine</code> can follow SRP (one hardware team owns it) yet violate ISP if it is exposed only through one fat <code>Machine</code> interface that a print queue must depend on. Fix: keep the class, expose role interfaces (<code>Printer</code>, <code>Scanner</code>, <code>Fax</code>). Conversely, a God class may expose narrow interfaces to each client (ISP fine) while still mixing actors internally (SRP broken).</p>`, followUps: ['What are header interfaces vs role interfaces?', 'How small is too small for an interface?'] },
    { q: 'DIP vs Dependency Injection vs Inversion of Control — explain the differences.', level: 'I', a: `<p><b>DIP</b> is a design principle: high-level policy and low-level details both depend on abstractions, and the abstraction is owned by the policy side. <b>Dependency Injection</b> is a technique: an object receives its collaborators (constructor, setter, method parameter) instead of creating them with <code>new</code>. <b>IoC</b> is a broader idea: the framework controls the flow and object lifecycle (Spring container, servlet container calling your code); DI containers are one IoC form. You can use DI without DIP (injecting a concrete <code>JdbcTemplate</code> into domain code) and DIP without a container (wire in <code>main</code> — the composition root). Constructor injection is preferred: explicit, immutable, testable.</p>`, followUps: ['What is a composition root?', 'Why is the Service Locator considered an anti-pattern?'] },
    { q: 'Here is a class that creates a MySQL connection and an HTTP client inside its methods. How do you make it unit-testable without a mocking framework?', level: 'B', a: `<p>Apply DIP in small steps: (1) identify every external dependency — database, HTTP, time, randomness, environment variables; (2) define domain-owned interfaces for them in business terms (<code>OrderRepository.save(Order)</code>, <code>RatesProvider.rateFor(currency)</code>) and use <code>java.time.Clock</code> for time; (3) inject them through the constructor; (4) write tiny hand-made fakes — an in-memory map repository, a fixed-rate provider, <code>Clock.fixed</code>; (5) move all <code>new</code>s to a composition root. Tests now run in milliseconds and cover edge cases (declines, timeouts, midnight) deterministically. Keep a few integration tests per adapter against the real system.</p>`, followUps: ['When are mocks better than fakes?', 'How do you ensure fakes behave like the real adapters (LSP)?'] },
    { q: 'Can SOLID be over-applied? How do you decide when to add an abstraction?', level: 'A', a: `<p>Yes. Interfaces with one implementation everywhere, factories of factories and deep layering create <b>needless complexity</b>: more files, more indirection, slower onboarding, and no protection against real change. My rules: add an abstraction when (a) there is a <b>proven axis of change</b> (rule of three: third variation), (b) a dependency is <b>volatile or non-deterministic</b> (vendor, I/O, time) and needs a test seam, or (c) a <b>plugin/extension requirement</b> exists. Otherwise write a concrete class and refactor later — IDE refactorings are cheap if the code is tested. In interviews, state the trade-off explicitly: "I'm adding a PricingStrategy because rates vary by vehicle type and the interviewer hinted at weekend pricing."</p>`, followUps: ['What is YAGNI and how does it interact with OCP?', 'Name a criticism of SOLID (e.g. CUPID) and your view.'] },
    { q: 'How would you refactor a 3,000-line legacy God class towards SOLID without breaking production?', level: 'A', a: `<p>(1) Pin behaviour with <b>characterization tests</b> (golden-master style if needed). (2) Find seams: apply DIP first — inject DB/HTTP/time so the class becomes testable. (3) Use git history and method-field clustering to find <b>actors</b>; Extract Class per actor, leaving the old class as a temporary <b>facade</b> that delegates so callers do not change (strangler pattern). (4) Replace type switches with polymorphism where variation is real. (5) Split fat interfaces as clients migrate. (6) Add contract tests for new hierarchies. Ship every step as a small, reviewed, reversible commit behind feature flags if behaviour risk exists; measure with coverage and mutation testing.</p>`, followUps: ['How do you find hidden actors using git log?', 'What is the strangler fig pattern at class level?'] },
    { q: 'In a Parking Lot machine-coding round, where do SOLID principles show up?', level: 'I', a: `<p><b>SRP:</b> separate <code>SpotAllocator</code>, <code>TicketService</code>, <code>PricingPolicy</code>, <code>PaymentProcessor</code>, <code>DisplayBoard</code>. <b>OCP:</b> new vehicle types, pricing rules (weekend, EV charging) and payment methods are new classes — pricing decorators and payment strategies. <b>LSP:</b> every <code>Vehicle</code> subtype fits the spot-matching contract; an EV that needs a charger is modelled via spot features, not by throwing. <b>ISP:</b> display boards get a read-only <code>AvailabilityView</code>; admins get <code>SpotAdmin</code>. <b>DIP:</b> <code>ParkingService</code> depends on <code>PaymentGateway</code>, <code>Clock</code> and repositories via constructor injection, so the interviewer's "now add weekend pricing" becomes a 5-minute addition.</p>`, followUps: ['How would you support multiple floors with nearest-spot allocation?', 'Where do you handle concurrency on spot allocation?'] },
    { q: 'How does SOLID relate to design patterns and to hexagonal/clean architecture?', level: 'A', a: `<p>Patterns are reusable <b>implementations</b> of the principles. Strategy, Decorator, Observer and Template Method realise OCP; Adapter and Abstract Factory support DIP; Facade keeps SRP-split subsystems convenient; Composite and Null Object help LSP-friendly hierarchies. <b>Hexagonal architecture</b> (ports and adapters) is DIP at application scale: the domain defines ports (interfaces), adapters for DB, HTTP, messaging implement them, and dependencies point inward. Clean architecture adds SRP-driven layers (entities, use cases, interface adapters, frameworks) with the Dependency Rule: source code dependencies only point inward. Package principles (Common Closure, Common Reuse, Acyclic Dependencies, Stable Abstractions) are SOLID applied to modules.</p>`, followUps: ['Which pattern would you use to add retries around a payment adapter?', 'How do you enforce the dependency rule in a Java build (ArchUnit, modules)?'] },
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
  allProblems.forEach(function (p, i) { rotate(p.mcq, i * 2 + 1); });

  registerModule({
    id: 'lld02',
    title: 'SOLID Principles',
    intro: `<p>Code that works today is the easy part. The hard part is the <b>next change</b>: a new payment method, a new tax rule, a new database, a test that must run in milliseconds. This module teaches the five <b>SOLID</b> principles — <b>S</b>ingle Responsibility, <b>O</b>pen/Closed, <b>L</b>iskov Substitution, <b>I</b>nterface Segregation and <b>D</b>ependency Inversion — the toolkit every LLD interviewer silently grades you on.</p>
<p>For every principle you will see a <b>real bad design</b> in Java, learn to <b>smell</b> the problem, watch the <b>ripple of a change</b> spread class by class in animated class diagrams (red arrows = violating dependencies, green = fixed), and step through a <b>refactor</b> line by line into a clean Java design. Then you practise like an interviewer tests you: "which principle is violated?", "refactor this code", and full multi-principle reviews — plus when <i>not</i> to apply SOLID, and how AI assistants change the picture.</p>`,
    goals: [
      'Explain each SOLID principle in one plain sentence, with its classic bad design, the smell, and the refactored Java design',
      'Spot violations in unfamiliar code fast — God classes, growing switches, "unsupported" overrides, fat interfaces, <code>new</code> inside business logic — and name the principle',
      'Refactor safely in small steps: extract class by actor, replace conditional with polymorphism, split role interfaces, inject domain-owned ports, verify with contract tests',
      'Make business logic unit-testable with hand-written fakes and an injected <code>Clock</code>, and explain DIP vs DI vs IoC',
      'Judge the dosage: argue when an abstraction pays off (rule of three, volatile dependencies) and when it is over-engineering',
      'Use SOLID as a review lens for AI-generated code and in machine-coding rounds (Parking Lot, notifications, checkout)'
    ],
    prereqs: `<p>LLD 1 (OOP Modelling &amp; UML) — classes, interfaces, inheritance vs composition, reading class diagrams. Comfortable Java basics: interfaces, records, generics, lambdas, <code>Map</code>/<code>List</code> (Java track modules 1–6 or equivalent). No framework knowledge needed.</p>`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
