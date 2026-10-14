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

registerModule({ id: 'lld02', title: 'SOLID Principles', intro: 'x', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
