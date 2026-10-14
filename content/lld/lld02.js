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
    return options[k];
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

registerModule({ id: 'lld02', title: 'SOLID Principles', intro: 'x', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
