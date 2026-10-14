(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- shared little helpers for the visualizers ---------------- */
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function box(id, label, x, y, w) { var n = { id: id, label: label, x: x, y: y, shape: 'box' }; if (w) n.w = w; return n; }
  function note(html, label) { return { type: 'text', label: label || 'What is happening and why', html: html }; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function word(input, allowed, hint) {
    var s = String(input === undefined || input === null ? '' : input).trim().toLowerCase();
    if (allowed.indexOf(s) < 0) throw new Error(hint);
    return s;
  }
  function intOf(input, lo, hi, hint) {
    var s = String(input === undefined || input === null ? '' : input).trim();
    if (!/^-?\d+$/.test(s)) throw new Error(hint);
    var n = Number(s);
    if (n < lo || n > hi) throw new Error(hint);
    return n;
  }
  function tokens(input, max, hint) {
    var t = String(input === undefined || input === null ? '' : input).trim().split(/[\s,]+/).filter(function (x) { return x.length; });
    if (!t.length) throw new Error(hint);
    if (t.length > max) throw new Error('Use at most ' + max + ' items. ' + hint);
    return t;
  }
  /* Turns a list of steps into frames for a fixed code listing.
     step = { l: line | [lines], cls, v: {vars}, hv: {name: cls}, vl: 'vars label', extra: [parts], narr } */
  function codeFrames(code, steps, label) {
    return steps.map(function (s) {
      var hl = {};
      [].concat(s.l === undefined ? [] : s.l).forEach(function (n) { hl[n] = s.cls || 'cur'; });
      var parts = [{ type: 'code', label: label || 'Code (highlighted line = running now)', lang: 'java', code: code, hl: hl }];
      if (s.v) parts.push({ type: 'vars', label: s.vl || 'Variables', vals: s.v, hl: s.hv || {} });
      (s.extra || []).forEach(function (p) { parts.push(p); });
      return { narr: s.narr, parts: parts };
    });
  }
  /* ======================================================================
     TOPIC 1 — Why creational patterns: the trouble with `new` everywhere
     ====================================================================== */
  topics.push({
    title: 'Why Creational Patterns? The Trouble with "new" Everywhere',
    analogy: `<p>When you eat at a restaurant you say <b>"one margherita, please"</b>. You do not walk into the kitchen, pick the oven, knead the dough and choose the cheese supplier yourself. The kitchen hides all of that. If the restaurant changes its cheese supplier tomorrow, <b>you</b> do not have to learn anything new — you still say "one margherita".</p>
<p>Writing <code>new SmtpMailer()</code> inside twenty classes is like every customer walking into the kitchen and cooking for themselves. The day the recipe changes, twenty people have to re-learn it. <b>Creational patterns are the kitchen</b>: one place that knows <i>how</i> objects are made, so everyone else just asks for them.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> In Java you make objects with <code>new</code>. That is fine for tiny things like <code>new Point(2, 3)</code>. But when the <i>kind</i> of object, the <i>number</i> of objects, or the <i>steps</i> to build it might change, sprinkling <code>new</code> everywhere glues your code to one exact class. A <b>creational design pattern</b> is a well-known recipe for moving "how do I make this object?" into <b>one place</b>, so the rest of the code only says "give me one".</p>
<p>Three pains of <code>new</code> everywhere:</p>
<ul>
<li><b>Ripple changes</b> — switch from <code>SmtpMailer</code> to <code>SendGridMailer</code> and you edit every file that wrote <code>new SmtpMailer()</code>.</li>
<li><b>Hard to test</b> — a class that does <code>new RealPaymentGateway()</code> inside itself cannot be given a fake gateway in a unit test.</li>
<li><b>Messy construction</b> — objects that need ten parameters, validation, caching or expensive setup end up with copy-pasted setup code all over.</li>
</ul>
<p>The six creational patterns in this module, each answering one question:</p>
${H.table(['Pattern', 'The question it answers', 'Everyday picture'], [
  ['<b>Singleton</b>', 'How do I make sure there is <b>exactly one</b> of something?', 'One control tower per airport'],
  ['<b>Factory Method</b>', 'How do I let code ask for "a product" without naming the <b>concrete class</b>?', 'Logistics branch picks truck or ship'],
  ['<b>Abstract Factory</b>', 'How do I create a whole <b>family</b> of matching objects?', 'IKEA "Modern" collection: chair + sofa + table that match'],
  ['<b>Builder</b>', 'How do I build an object with <b>many optional parts</b>, step by step?', 'Subway sandwich counter'],
  ['<b>Prototype</b>', 'How do I make a new object by <b>copying</b> an existing one?', 'Photocopy a filled-in form, change the name'],
  ['<b>Object Pool</b>', 'How do I <b>reuse</b> expensive objects instead of making new ones?', 'Bike-sharing dock: borrow, ride, return']
])}
<p>🔵 <b>How to choose quickly</b> — ask in this order: <span class="c-b">Must there be only one?</span> → Singleton. <span class="c-b">Is it expensive and reusable?</span> → Object Pool. <span class="c-b">Many optional parts / validation?</span> → Builder. <span class="c-b">Cheaper to copy a configured one?</span> → Prototype. <span class="c-b">Several objects that must match?</span> → Abstract Factory. <span class="c-b">Otherwise just "which class?"</span> → Factory Method (or a simple factory). The second visualizer walks this decision tree for real scenarios.</p>
<p>Remember: patterns are <b>tools, not trophies</b>. If a class has one implementation and a two-field constructor, plain <code>new</code> is the right answer.</p>`,
    clues: [
      '"It should be easy to add a <b>new type</b> later (e.g. a new payment method / notification channel)" → a factory hides the concrete class',
      '"There must be <b>only one</b> instance (config, registry, logger)" → Singleton, or better: one instance managed by DI',
      '"The object has <b>many optional fields</b> / a constructor with 8+ parameters" → Builder',
      '"Creating it is <b>expensive</b> (DB connection, thread, socket) and it can be reused" → Object Pool',
      '"Create <b>matching</b> UI widgets / cloud resources per platform" → Abstract Factory',
      '"Make many <b>similar</b> objects from a configured template" → Prototype',
      '"How would you <b>unit test</b> this class?" when the class calls <code>new</code> on its own dependencies → inject a factory or the dependency'
    ],
    code: [
      { lang: 'java', title: 'Naive version: new everywhere (the brute force)', code: `
// Every service creates its own SmtpMailer with "new".
// Changing the email provider means editing EVERY one of these classes.
class SmtpMailer {
    void send(String to, String msg) {
        System.out.println("SMTP -> " + to + ": " + msg);
    }
}

class SignupService {
    void register(String email) {
        SmtpMailer mailer = new SmtpMailer();   // hard-wired concrete class
        mailer.send(email, "Welcome!");
    }
}

class OrderService {
    void place(String email) {
        SmtpMailer mailer = new SmtpMailer();   // same decision copy-pasted
        mailer.send(email, "Order placed");
    }
}

class PasswordService {
    void reset(String email) {
        SmtpMailer mailer = new SmtpMailer();   // ...and again
        mailer.send(email, "Here is your reset link");
    }
}` },
      { lang: 'java', title: 'Refactored: one factory decides, services depend on an interface', code: `
// 1) Clients talk to an interface, not a concrete class.
interface Mailer {
    void send(String to, String msg);
}

class SmtpMailer implements Mailer {
    public void send(String to, String msg) { System.out.println("SMTP -> " + to + ": " + msg); }
}

class SendGridMailer implements Mailer {
    public void send(String to, String msg) { System.out.println("SendGrid API -> " + to + ": " + msg); }
}

// 2) ONE place knows how to pick and build the concrete class.
final class MailerFactory {
    private MailerFactory() { }              // utility class: no instances

    static Mailer create(String provider) {
        return switch (provider.toLowerCase()) {
            case "smtp" -> new SmtpMailer();
            case "sendgrid" -> new SendGridMailer();
            default -> throw new IllegalArgumentException("Unknown mail provider: " + provider);
        };
    }
}

// 3) Services receive the dependency (constructor injection) -> easy to test.
class SignupService {
    private final Mailer mailer;

    SignupService(Mailer mailer) { this.mailer = mailer; }

    void register(String email) { mailer.send(email, "Welcome!"); }
}

public class Main {
    public static void main(String[] args) {
        // Changing provider = changing ONE string (usually read from config).
        Mailer mailer = MailerFactory.create("sendgrid");
        new SignupService(mailer).register("asha@example.com");
    }
}` }
    ],
    codeTitle: ['Brute force: new everywhere', 'Refactored with a factory + interface'],
    viz: [
      {
        title: 'The ripple of "new": how many files change when the provider changes?',
        input: '4',
        inputLabel: 'Number of classes that call new SmtpMailer() (2-6)',
        gen: function (input) {
          var n = intOf(input, 2, 6, 'Enter a whole number from 2 to 6');
          var names = ['Signup', 'Order', 'Password', 'Invoice', 'Refund', 'Report'];
          var gap = 12, h = Math.max(48, n * gap + 8), mid = (n * gap) / 2 + 2;
          var frames = [];
          function clients() { var a = []; for (var i = 0; i < n; i++) a.push(box('c' + i, names[i] + 'Service', 14, 8 + i * gap)); return a; }
          function naive(target, hl, ehl, tags) {
            var e = []; for (var i = 0; i < n; i++) e.push(['c' + i, target, 'new']);
            return { type: 'graph', label: 'Who creates the mailer? (naive design)', directed: true, height: h, nodes: clients().concat([box('smtp', 'SmtpMailer', 82, mid), box('sg', 'SendGridMailer', 82, mid + 12)]), edges: e, hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
          }
          frames.push({ narr: 'Naive design: <b>' + n + '</b> services each write <code>new SmtpMailer()</code>. Every arrow is a hard-coded dependency on one concrete class.', parts: [naive('smtp', { smtp: 'cur' }), { type: 'vars', label: 'Cost so far', vals: { classesThatSayNew: n, filesToEditOnChange: '?' } }] });
          var ehl = {}, tags = {}, hl = { smtp: 'bad', sg: 'ok' };
          for (var i = 0; i < n; i++) { ehl['c' + i + '-smtp'] = 'bad'; tags['c' + i] = 'must edit'; }
          frames.push({ narr: 'Business says: <span class="c-r">"move to SendGrid"</span>. Every red arrow points at the old class, so <b>every</b> service must be opened, edited, re-tested and re-deployed.', parts: [naive('smtp', hl, ehl, tags), { type: 'vars', label: 'Cost', vals: { classesThatSayNew: n, filesToEditOnChange: n }, hl: { filesToEditOnChange: 'bad' } }] });
          for (var k = 0; k < n; k++) {
            var hk = { sg: 'ok' }, ek = {}, tk = {};
            for (var j = 0; j < n; j++) {
              if (j < k) { hk['c' + j] = 'done'; tk['c' + j] = 'edited'; }
              else if (j === k) { hk['c' + j] = 'cur'; tk['c' + j] = 'editing...'; }
              else { tk['c' + j] = 'must edit'; ek['c' + j + '-smtp'] = 'bad'; }
            }
            var g = naive('smtp', hk, ek, tk);
            g.edges = []; for (j = 0; j < n; j++) g.edges.push(['c' + j, j <= k ? 'sg' : 'smtp', 'new']);
            for (j = 0; j <= k; j++) g.ehl['c' + j + '-sg'] = j === k ? 'cur' : 'ok';
            frames.push({ narr: 'Editing <b>' + names[k] + 'Service</b> by hand (' + (k + 1) + ' of ' + n + '). Miss one and production sends half the emails through the old provider.', parts: [g, { type: 'vars', label: 'Cost', vals: { edited: k + 1, remaining: n - k - 1 }, hl: { edited: 'cur' } }] });
          }
          var fn = clients().concat([box('f', 'MailerFactory', 50, mid), box('smtp', 'SmtpMailer', 85, mid - 8), box('sg', 'SendGridMailer', 85, mid + 8)]);
          var fe = []; for (i = 0; i < n; i++) fe.push(['c' + i, 'f', 'create()']);
          frames.push({ narr: 'Refactor: services now ask <b>MailerFactory</b> for a <code>Mailer</code> (an interface). Only the factory says <code>new</code>. Same behaviour, but the decision lives in <b>one</b> place.', parts: [{ type: 'graph', label: 'With a factory', directed: true, height: h, nodes: fn, edges: fe.concat([['f', 'smtp', 'new']]), hl: { f: 'sel' }, ehl: { 'f-smtp': 'cur' } }, { type: 'vars', label: 'Cost', vals: { classesThatSayNew: 1 }, hl: { classesThatSayNew: 'ok' } }] });
          frames.push({ narr: 'Same business request, "move to SendGrid": change <b>one line</b> inside the factory (or one config value). No service file changes. <span class="c-g">That is the whole point of creational patterns.</span>', parts: [{ type: 'graph', label: 'Provider switched inside the factory only', directed: true, height: h, nodes: fn, edges: fe.concat([['f', 'sg', 'new']]), hl: { f: 'cur', sg: 'ok', smtp: 'done' }, ehl: { 'f-sg': 'ok' } }, { type: 'vars', label: 'Cost', vals: { filesToEditOnChange: 1 }, hl: { filesToEditOnChange: 'ok' } }] });
          frames.push({ narr: 'Summary for <b>' + n + '</b> call sites. The gap grows with every new service that needs email.', parts: [{ type: 'table', label: 'Naive vs factory', columns: ['Design', 'Files to edit on provider change', 'Can a test inject a fake?'], rows: [['new everywhere', String(n), 'No — new is inside the method'], ['Factory + interface + injection', '1', 'Yes — pass a FakeMailer']], hl: { 1: 'ok', 0: 'bad' } }] });
          return frames;
        }
      },
      {
        title: 'Which creational pattern fits? Walk the decision tree',
        input: 'pizza',
        inputLabel: 'Scenario: logger | connection | pizza | enemy | theme | notification',
        gen: function (input) {
          var s = word(input, ['logger', 'connection', 'pizza', 'enemy', 'theme', 'notification'], 'Type one of: logger, connection, pizza, enemy, theme, notification');
          var story = {
            logger: 'An app-wide audit logger that every class writes to, with one shared file handle.',
            connection: 'Database connections: each takes ~50 ms to open (TCP + TLS + auth) and requests need them thousands of times per second.',
            pizza: 'A Pizza with size, crust, sauce, cheese, up to 10 toppings, extra options — most optional, some combos invalid.',
            enemy: 'A game spawns 500 "Orc" enemies, each starting from the same fully configured template (stats, AI tree, textures).',
            theme: 'A UI must create Button, Checkbox and Dialog that all match the Light or the Dark theme — never mixed.',
            notification: 'Send a notification via Email, SMS or Push, picked at runtime from user settings.'
          }[s];
          var answers = { logger: [1], connection: [0, 1], pizza: [0, 0, 1], enemy: [0, 0, 0, 1], theme: [0, 0, 0, 0, 1], notification: [0, 0, 0, 0, 0] }[s];
          var qs = ['q1', 'q2', 'q3', 'q4', 'q5'], res = ['Singleton', 'Pool', 'Builder', 'Proto', 'AbsF'];
          var why = [
            'Exactly one shared instance is a real requirement → <b>Singleton</b> (enum or holder idiom, or one bean in a DI container).',
            'Expensive to create, cheap to reuse, bounded resource → <b>Object Pool</b> (in practice: HikariCP).',
            'Many optional parts plus validation → <b>Builder</b> with a fluent API and a validating <code>build()</code>.',
            'Copying a configured template is cheaper than building from scratch → <b>Prototype</b> (copy constructor / <code>copy()</code>).',
            'A whole family of objects must match → <b>Abstract Factory</b> (LightThemeFactory / DarkThemeFactory).'
          ];
          var nodes = [
            box('q1', 'Need exactly one?', 22, 8), box('q2', 'Expensive + reusable?', 22, 24), box('q3', 'Many optional parts?', 22, 40),
            box('q4', 'Copy a configured one?', 22, 56), box('q5', 'Family that must match?', 22, 72), box('FM', 'Factory Method', 22, 88),
            box('Singleton', 'Singleton', 78, 8), box('Pool', 'Object Pool', 78, 24), box('Builder', 'Builder', 78, 40), box('Proto', 'Prototype', 78, 56), box('AbsF', 'Abstract Factory', 78, 72)
          ];
          var edges = [['q1', 'Singleton', 'yes'], ['q1', 'q2', 'no'], ['q2', 'Pool', 'yes'], ['q2', 'q3', 'no'], ['q3', 'Builder', 'yes'], ['q3', 'q4', 'no'], ['q4', 'Proto', 'yes'], ['q4', 'q5', 'no'], ['q5', 'AbsF', 'yes'], ['q5', 'FM', 'no']];
          var frames = [], hl = {}, ehl = {};
          function g() { return { type: 'graph', label: 'Creational decision tree', directed: true, height: 96, nodes: nodes, edges: edges, hl: clone(hl), ehl: clone(ehl) }; }
          frames.push({ narr: 'Scenario <b>' + s + '</b>: ' + story + ' Start at the top question.', parts: [g(), note('Ask the questions in order. The first <b>yes</b> usually wins; the rest are often combined later (e.g. a Singleton factory that returns Builders).')] });
          for (var i = 0; i < answers.length; i++) {
            hl[qs[i]] = 'cur';
            frames.push({ narr: 'Question ' + (i + 1) + ': <b>' + nodes[i].label + '</b> For this scenario the answer is ' + (answers[i] ? '<span class="c-g">yes</span>' : '<span class="c-m">no</span>') + '.', parts: [g()] });
            hl[qs[i]] = 'done';
            if (answers[i]) { ehl[qs[i] + '-' + res[i]] = 'ok'; hl[res[i]] = 'sel'; frames.push({ narr: 'Follow the <b>yes</b> edge. ' + why[i], parts: [g(), note(why[i], 'Verdict')] }); frames.push({ narr: 'Cheat sheet: every scenario and where it lands. Try another scenario in the input box to walk a different path.', parts: [{ type: 'table', label: 'Scenario → pattern', columns: ['Scenario', 'Pattern'], rows: [['logger', 'Singleton'], ['connection', 'Object Pool'], ['pizza', 'Builder'], ['enemy', 'Prototype'], ['theme', 'Abstract Factory'], ['notification', 'Factory Method']], hl: one(['logger', 'connection', 'pizza', 'enemy', 'theme'].indexOf(s), 'sel') }] }); return frames; }
            ehl[qs[i] + '-' + (i < 4 ? qs[i + 1] : 'FM')] = 'cur';
          }
          hl.FM = 'sel';
          frames.push({ narr: 'All answers were no: the only question left is <b>which concrete class</b> to create → <b>Factory Method</b> (or a simple registry factory).', parts: [g(), note('Notification channel picked at runtime → <code>NotificationFactory.create(channel)</code> returns an <code>EmailNotification</code>, <code>SmsNotification</code> or <code>PushNotification</code> behind one interface.', 'Verdict')] });
          return frames;
        }
      }
    ],
    examples: [
      { title: 'Test pain: you cannot fake what you "new" yourself', html: `<p>If <code>CheckoutService</code> does <code>new StripeGateway()</code> inside <code>pay()</code>, every unit test hits the real Stripe sandbox (slow, flaky, needs network). Pass the gateway in through the constructor and the test can hand in a <code>FakeGateway</code> that just records calls. The fix is not "more patterns" — it is "creation happens <b>outside</b> the class that uses the object".</p>`, code: `
interface PaymentGateway { boolean charge(String user, long cents); }

class FakeGateway implements PaymentGateway {
    final List<String> calls = new ArrayList<>();
    public boolean charge(String user, long cents) { calls.add(user + ":" + cents); return true; }
}

class CheckoutService {
    private final PaymentGateway gateway;           // injected, not created here
    CheckoutService(PaymentGateway gateway) { this.gateway = gateway; }
    boolean pay(String user, long cents) { return cents > 0 && gateway.charge(user, cents); }
}

class CheckoutTest {
    public static void main(String[] args) {
        FakeGateway fake = new FakeGateway();
        boolean ok = new CheckoutService(fake).pay("asha", 4999);
        System.out.println(ok + " " + fake.calls);   // true [asha:4999]
    }
}` },
      { title: 'The 9-argument constructor (a Builder is waiting to happen)', html: `<p><code>new Pizza("L", "thin", "tomato", true, false, true, null, 2, "no onion")</code> — which <code>true</code> is cheese? Swap two booleans and it still compiles. When you see long parameter lists with many optional values, the creational fix is a <b>Builder</b> (topic 5). The brute force — many overloaded constructors — is called the <b>telescoping constructor</b> anti-pattern.</p>` },
      { title: 'When plain new is perfectly fine', html: `<p>Value objects and data holders — <code>new Point(2, 3)</code>, a <code>record Money(long cents, String currency)</code>, <code>new ArrayList&lt;&gt;()</code> inside a method — have one obvious implementation and no lifecycle. Wrapping them in factories is <b>over-engineering</b> (YAGNI). Use patterns where change, cost, or complexity actually lives.</p>`, code: `
record Money(long cents, String currency) {
    Money {
        if (cents < 0) throw new IllegalArgumentException("negative money");
    }
}

class Demo {
    public static void main(String[] args) {
        Money price = new Money(4999, "INR");   // plain new is the right call here
        System.out.println(price);
    }
}` },
      { title: 'Static factory methods: the JDK already does this', html: `<p><code>Integer.valueOf(100)</code> returns a <b>cached</b> object for -128..127, <code>List.of(1, 2)</code> returns a hidden immutable class, <code>EnumSet.noneOf(Day.class)</code> picks <code>RegularEnumSet</code> or <code>JumboEnumSet</code> based on size. A <b>named static method</b> that returns an object is the lightest creational tool: it can cache, pick a subclass, and has a meaningful name (<code>of</code>, <code>from</code>, <code>valueOf</code>, <code>newInstance</code>).</p>`, code: `
class StaticFactoryDemo {
    public static void main(String[] args) {
        Integer a = Integer.valueOf(100), b = Integer.valueOf(100);
        System.out.println(a == b);                          // true: same cached object
        List<Integer> list = List.of(1, 2, 3);                // concrete class is hidden
        System.out.println(list.getClass().getSimpleName()); // e.g. ListN (JDK internal)
    }
}` }
    ],
    deepDive: `<p>🟣 <b>Where the patterns come from.</b> The 1994 "Gang of Four" (GoF) book lists five creational patterns: Abstract Factory, Builder, Factory Method, Prototype, Singleton. <b>Object Pool</b> is not in GoF but is a classic creational idiom (connection pools, thread pools). "Simple Factory" (one method with a <code>switch</code>) is also not a GoF pattern — it is a useful idiom that interviewers still call "factory".</p>
<p><b>The real principle underneath</b> is the <b>Dependency Inversion Principle</b> plus separating <i>construction</i> from <i>use</i>. In 2026 production Java, most of that separation is done by a <b>dependency-injection container</b> (Spring, Micronaut, Quarkus, Guice, Dagger): it is effectively a giant configurable factory that builds the object graph once at startup, with "singleton" as the default bean scope. Knowing the patterns still matters because (1) DI containers are built from them, (2) you need them in libraries, CLIs and Android code without a container, and (3) LLD interviews expect you to write them by hand.</p>
<p><b>Costs.</b> Every factory adds a type and an indirection; a reader must jump one more hop to find the concrete class. A good rule: introduce a factory when there are <b>two or more</b> implementations, creation needs <b>logic</b> (validation, caching, config), or tests need <b>substitution</b>. Effective Java (Item 1) recommends static factory methods over constructors for named creation, caching and returning subtypes; Item 2 recommends Builders once you pass four or so parameters.</p>
<p><b>Performance reality.</b> Object allocation on the modern JVM is a pointer bump in a thread-local buffer (TLAB) — roughly ten nanoseconds — and short-lived garbage is very cheap with G1/ZGC. So "avoid new for speed" is almost never a good reason; <b>"avoid new for coupling"</b> is.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants generate a Builder, a factory registry or a holder-idiom Singleton in seconds, so the typing is free. The scarce skill is <b>deciding</b> whether a pattern is needed at all and which one. AI tools love to over-pattern: ask for "a clean notification service" and you may get an AbstractNotificationFactoryProvider for a single implementation.</p>
<p><b>Use AI as a partner:</b> <code>Here are my requirements: ... List the objects whose creation may change, and for each say "plain new", "factory", "builder" or "DI" with one-line reasoning. Do not write code yet.</code> Then challenge its choices. <b>Where AI goes wrong:</b> mixing up Factory Method with Simple Factory, generating non-thread-safe lazy singletons, forgetting validation in <code>build()</code>, adding factories for value objects. <b>What you must own:</b> the trade-off conversation in the interview — "I would start with constructor injection; I add a factory only when a second implementation appears."</p>`,
    problems: [
      {
        title: 'Refactor the new-everywhere Report Exporter',
        level: 'Easy', tags: ['factory', 'refactoring', 'open-closed'], companies: ['Amazon', 'Flipkart', 'Atlassian'],
        statement: `<p><code>ReportService</code> exports rows as PDF, CSV or JSON. Today every method contains its own <code>if (format.equals("pdf")) new PdfExporter() else if ...</code> chain, so adding XLSX means editing three methods. Refactor so that:</p>
<ul><li>All exporters implement one interface <code>Exporter</code> with <code>String export(List&lt;String&gt; rows)</code>.</li>
<li>An <code>ExporterFactory</code> is the <b>only</b> place that creates exporters, and new formats are added by <b>one registration line</b>.</li>
<li>Unknown formats throw <code>IllegalArgumentException</code> listing the supported formats.</li></ul>`,
        constraints: `Format names are case-insensitive. The factory is filled at startup and then only read (possibly from many threads). Up to 20 formats.`,
        example: `<p>Input: <code>factory.create("CSV").export(List.of("a", "b"))</code> → Output: <span class="c-g">"a,b"</span> because the factory lower-cases "CSV", finds the CSV supplier and the CSV exporter joins rows with commas.<br>Input: <code>factory.create("xml")</code> → <span class="c-r">IllegalArgumentException: Unsupported format xml, supported: [csv, json, pdf]</span>.</p>`,
        brute: {
          why: `<p>The naive code repeats the format decision in every method and calls <code>new</code> directly. Adding a format touches N methods (Open/Closed violated), the string literals drift apart ("Csv" vs "csv"), and no test can inject a fake exporter. It works, but every change is risky and the cost grows with each new method.</p>`,
          code: `
class PdfExporter { String export(List<String> rows) { return "PDF[" + String.join("|", rows) + "]"; } }
class CsvExporter { String export(List<String> rows) { return String.join(",", rows); } }

class ReportService {
    String daily(String format, List<String> rows) {
        if (format.equals("pdf")) return new PdfExporter().export(rows);
        else if (format.equals("csv")) return new CsvExporter().export(rows);
        throw new IllegalArgumentException(format);
    }
    String monthly(String format, List<String> rows) {
        // same chain copy-pasted -- and someone forgot equalsIgnoreCase here
        if (format.equals("pdf")) return new PdfExporter().export(rows);
        else if (format.equals("csv")) return new CsvExporter().export(rows);
        throw new IllegalArgumentException(format);
    }
}`
        },
        mcq: { q: 'Product wants an XLSX export next sprint. In the refactored design, what is the ideal change?', options: ['Add an XlsxExporter class and one register("xlsx", XlsxExporter::new) line', 'Add another else-if in every ReportService method', 'Make ReportService extend XlsxExporter', 'Add a boolean isXlsx parameter to export()'], answer: 0, explain: 'A registry factory is open for extension (new class + one registration) and closed for modification (no existing method changes).' },
        hints: [
          `<p>Hint 1: the thing that varies is "which class to construct". Put that decision behind one method: <code>create(String format)</code>.</p>`,
          `<p>Hint 2: instead of a growing <code>switch</code>, store <code>Map&lt;String, Supplier&lt;Exporter&gt;&gt;</code>. A <code>Supplier</code> is "a recipe that makes a new object when called", e.g. <code>CsvExporter::new</code>.</p>`,
          `<p>Hint 3: normalise the key with <code>toLowerCase(Locale.ROOT)</code>, throw a helpful message for unknown keys, and inject the factory into <code>ReportService</code> so tests can register a fake format.</p>`
        ],
        solution: {
          approach: `<p><b>Idea:</b> separate <i>choosing and building</i> exporters from <i>using</i> them.</p>
<ol><li>Create interface <code>Exporter</code>; each format is one small class.</li>
<li><code>ExporterFactory</code> holds a <code>Map&lt;String, Supplier&lt;Exporter&gt;&gt;</code>. <code>register</code> adds a recipe; <code>create</code> looks it up and calls <code>get()</code> to build a fresh exporter.</li>
<li><code>ReportService</code> receives the factory in its constructor and never says <code>new</code> for exporters.</li>
<li>Adding XLSX = one new class + one <code>register</code> line, no edits to existing logic (Open/Closed).</li></ol>
<p>Because the map is fully built before use and then only read, an unmodifiable copy (or <code>ConcurrentHashMap</code>) makes concurrent reads safe.</p>`,
          code: `
interface Exporter {
    String export(List<String> rows);
}

class PdfExporter implements Exporter {
    public String export(List<String> rows) { return "PDF[" + String.join("|", rows) + "]"; }
}

class CsvExporter implements Exporter {
    public String export(List<String> rows) { return String.join(",", rows); }
}

class JsonExporter implements Exporter {
    public String export(List<String> rows) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < rows.size(); i++) {
            if (i > 0) sb.append(',');
            sb.append('"').append(rows.get(i)).append('"');
        }
        return sb.append(']').toString();
    }
}

final class ExporterFactory {
    // format -> recipe that builds a fresh exporter
    private final Map<String, Supplier<Exporter>> registry = new ConcurrentHashMap<>();

    ExporterFactory register(String format, Supplier<Exporter> recipe) {
        registry.put(format.toLowerCase(Locale.ROOT), recipe);
        return this;                                   // allows chaining at startup
    }

    Exporter create(String format) {
        Supplier<Exporter> recipe = registry.get(format.toLowerCase(Locale.ROOT));
        if (recipe == null) {
            throw new IllegalArgumentException("Unsupported format " + format
                + ", supported: " + new TreeSet<>(registry.keySet()));
        }
        return recipe.get();
    }
}

class ReportService {
    private final ExporterFactory factory;

    ReportService(ExporterFactory factory) { this.factory = factory; }

    String daily(String format, List<String> rows) { return factory.create(format).export(rows); }

    String monthly(String format, List<String> rows) { return factory.create(format).export(rows); }
}

public class Main {
    public static void main(String[] args) {
        ExporterFactory factory = new ExporterFactory()
            .register("pdf", PdfExporter::new)
            .register("csv", CsvExporter::new)
            .register("json", JsonExporter::new);
        ReportService service = new ReportService(factory);
        System.out.println(service.daily("CSV", List.of("a", "b")));    // a,b
        System.out.println(service.monthly("json", List.of("x")));      // ["x"]
        try {
            service.daily("xml", List.of());
        } catch (IllegalArgumentException e) {
            System.out.println(e.getMessage());
        }
    }
}`,
          complexity: `<p><code>create</code> is one hash lookup: O(1) average. Memory O(F) for F registered formats. Adding a format: O(1) code change (one class + one line).</p>`,
          followUps: ['How would you load formats automatically from plugins? (ServiceLoader / classpath scanning)', 'Should exporters be stateless and cached instead of created per call?', 'How does Spring replace this registry? (inject Map&lt;String, Exporter&gt; of beans)']
        }
      }
    ]
  });
  /* ======================================================================
     TOPIC 2 — Singleton and its thread-safe variants
     ====================================================================== */
  var SINGLETON_CODES = {
    unsafe: 'class Config {\n  private static Config instance;\n  static Config getInstance() {\n    if (instance == null) {\n      instance = new Config();\n    }\n    return instance;\n  }\n}',
    sync: 'class Config {\n  private static Config instance;\n  static synchronized Config getInstance() {\n    if (instance == null) {\n      instance = new Config();\n    }\n    return instance;\n  }\n}',
    dcl: 'class Config {\n  private static volatile Config instance;\n  static Config getInstance() {\n    Config local = instance;\n    if (local == null) {\n      synchronized (Config.class) {\n        local = instance;\n        if (local == null) {\n          instance = local = new Config();\n        }\n      }\n    }\n    return local;\n  }\n}',
    'dcl-no-volatile': 'class Config {\n  private static Config instance; // NOT volatile\n  static Config getInstance() {\n    Config local = instance;\n    if (local == null) {\n      synchronized (Config.class) {\n        local = instance;\n        if (local == null) {\n          instance = local = new Config();\n        }\n      }\n    }\n    return local;\n  }\n}',
    holder: 'class Config {\n  private Config() { }\n  private static class Holder {\n    static final Config INSTANCE = new Config();\n  }\n  static Config getInstance() {\n    return Holder.INSTANCE;\n  }\n}'
  };
  /* step: [thread, line, what, instance, lock, rowClass, narr] */
  var SINGLETON_STEPS = {
    unsafe: [
      ['A', 4, 'reads instance: null', 'null', '-', 'cur', 'Thread A checks <code>instance == null</code>. It is null, so A decides to create the object.'],
      ['B', 4, 'reads instance: null', 'null', '-', 'bad', 'Before A finishes, the scheduler switches to Thread B. B also sees <b>null</b> — nothing stops two threads being inside the <code>if</code> at once.'],
      ['A', 5, 'new Config() -> #1', '#1', '-', 'cur', 'A builds object <b>#1</b> and stores it.'],
      ['B', 5, 'new Config() -> #2', '#2', '-', 'bad', 'B builds object <b>#2</b> and <span class="c-r">overwrites</span> the field. Two constructors ran (two DB connections, two file handles...).'],
      ['A', 7, 'returns #1', '#2', '-', 'bad', 'A returns #1 — but the field now holds #2. A keeps using an orphan.'],
      ['B', 7, 'returns #2', '#2', '-', 'bad', '<span class="c-r">Broken:</span> callers hold two different "singletons". Any state written to #1 is invisible to #2. This race is rare in tests and common under production load.']
    ],
    sync: [
      ['A', 3, 'acquires lock on Config.class', 'null', 'A', 'cur', 'A enters the <code>synchronized</code> method, taking the class lock.'],
      ['B', 3, 'tries lock: BLOCKED', 'null', 'A', 'bad', 'B calls at the same time but must <b>wait</b> — only one thread can be inside.'],
      ['A', 4, 'reads instance: null', 'null', 'A', 'cur', 'A sees null...'],
      ['A', 5, 'new Config() -> #1', '#1', 'A', 'ok', '...and creates <b>#1</b>.'],
      ['A', 7, 'returns #1, releases lock', '#1', '-', 'ok', 'A returns and releases the lock. The write is visible to the next thread that takes the same lock (happens-before).'],
      ['B', 4, 'gets lock, reads #1', '#1', 'B', 'ok', 'B finally enters and sees #1, so it skips creation.'],
      ['B', 7, 'returns #1, releases lock', '#1', '-', 'ok', '<span class="c-g">Correct</span>: one object. But...'],
      ['C', 3, 'later call: lock again', '#1', 'C', 'cur', '...every future call (millions of them) still takes the lock even though the object exists. Uncontended locks are cheap today, but under heavy contention this becomes a bottleneck. That is why DCL and the holder idiom exist.']
    ],
    dcl: [
      ['A', 4, 'reads instance: null', 'null', '-', 'cur', 'First check, <b>without a lock</b>: A sees null.'],
      ['B', 4, 'reads instance: null', 'null', '-', 'cur', 'B also sees null. Both will try to lock.'],
      ['A', 6, 'acquires lock', 'null', 'A', 'cur', 'A wins the lock.'],
      ['B', 6, 'tries lock: BLOCKED', 'null', 'A', 'bad', 'B waits at the <code>synchronized</code> block.'],
      ['A', 7, 'second check: null', 'null', 'A', 'cur', 'Second check inside the lock: still null, so A must create.'],
      ['A', 9, 'new Config() -> #1 (volatile write)', '#1', 'A', 'ok', 'A creates <b>#1</b>. Because the field is <b>volatile</b>, the constructor is guaranteed to finish <i>before</i> any other thread can see the reference.'],
      ['A', 13, 'releases lock, returns #1', '#1', '-', 'ok', 'A leaves the block and returns #1.'],
      ['B', 7, 'gets lock, second check: #1', '#1', 'B', 'ok', 'B now gets the lock and re-reads the field: <b>#1</b>. This second check is what stops B from making #2. (Without it, DCL = the broken version.)'],
      ['B', 13, 'returns #1', '#1', '-', 'ok', 'B returns the same object. <span class="c-g">One instance.</span>'],
      ['C', 4, 'reads #1, no lock at all', '#1', '-', 'ok', 'Every later call takes the <b>fast path</b>: one volatile read, no lock. That is the performance win of DCL. The <code>local</code> variable avoids reading the volatile field twice.']
    ],
    'dcl-no-volatile': [
      ['A', 4, 'reads instance: null', 'null', '-', 'cur', 'Same DCL code, but the field is <b>not volatile</b>. A sees null.'],
      ['A', 6, 'acquires lock', 'null', 'A', 'cur', 'A takes the lock and passes the second check.'],
      ['A', 9, 'step 1: allocate memory', 'null', 'A', 'cur', '<code>new Config()</code> is really three steps: (1) allocate memory, (2) run the constructor, (3) store the reference. Without volatile the JIT/CPU may <b>reorder</b> (2) and (3).'],
      ['A', 9, 'step 3 first: instance = ref', 'half-built', 'A', 'bad', 'A publishes the reference <b>before</b> the constructor runs. The field is non-null but <code>url</code> is still null.'],
      ['B', 4, 'reads instance: NOT null', 'half-built', 'A', 'bad', 'B does the first check <b>without a lock</b>: non-null! So B skips the lock entirely...'],
      ['B', 13, 'returns half-built object', 'half-built', 'A', 'bad', '...and returns it. B calls <code>config.url()</code> and gets <span class="c-r">null</span> — a bug that appears once a week on one CPU type.'],
      ['A', 9, 'step 2: constructor finishes', '#1', 'A', 'cur', 'Only now does A finish the constructor. Too late for B.'],
      ['A', 13, 'returns #1', '#1', '-', 'sel', '<b>Fix:</b> declare the field <code>volatile</code> (Java 5+ memory model) or use the holder idiom / enum, which get safe publication from class initialization.']
    ],
    holder: [
      ['A', 7, 'touches Holder.INSTANCE', 'not loaded', '-', 'cur', 'The <code>Holder</code> nested class is <b>not initialised</b> until someone touches it. A is first.'],
      ['A', 4, 'JVM init lock: running static init', 'creating', 'JVM', 'cur', 'The JVM takes its internal <b>class-initialisation lock</b> and runs the static initialiser. (JLS 12.4.2 guarantees this happens exactly once.)'],
      ['B', 7, 'touches Holder: WAITS', 'creating', 'JVM', 'bad', 'B touches Holder while initialisation is in progress, so the JVM makes B wait. No code from us needed.'],
      ['A', 4, 'new Config() -> #1', '#1', 'JVM', 'ok', 'Constructor completes; the static final field is safely published.'],
      ['A', 7, 'returns #1', '#1', '-', 'ok', 'A returns #1. Initialisation is marked complete.'],
      ['B', 7, 'returns #1', '#1', '-', 'ok', 'B wakes up and reads the same #1.'],
      ['C', 7, 'returns #1, no lock', '#1', '-', 'ok', 'Later calls just read a static final field: no lock, no volatile, fully lazy. <span class="c-g">Simplest correct lazy singleton in Java.</span>']
    ]
  };

  topics.push({
    title: 'Singleton: Exactly One Instance (and Five Thread-Safe Ways to Build It)',
    analogy: `<p>An airport has <b>one control tower</b>. Every pilot radios the same tower; if two towers gave different instructions, planes would crash. You do not build a tower when you land — you ask for "the tower" and get the one that already exists.</p>
<p>A <b>Singleton</b> is that tower: a class that allows <b>exactly one</b> object and gives everyone a single way to reach it. The tricky part is the moment two pilots radio at the same instant while the tower is still being built — that is the thread-safety story of this topic.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A Singleton has three ingredients:</p>
<ol><li>A <b>private constructor</b> — nobody outside can say <code>new</code>.</li>
<li>A <b>static field</b> holding the one instance.</li>
<li>A <b>static access method</b> (usually <code>getInstance()</code>) that returns it.</li></ol>
<p><b>Good uses:</b> something that is <i>truly</i> one per process — app configuration loaded once, a registry, an in-memory cache, a metrics collector, a driver for one physical device. <b>Bad uses:</b> "I want a global variable" — that hides dependencies and makes tests share state.</p>
<p>🔵 <b>The five Java variants</b> (all with a private constructor):</p>
${H.table(['Variant', 'Lazy?', 'Thread-safe?', 'Cost per call', 'Verdict'], [
  ['Eager <code>static final INSTANCE = new X()</code>', 'No (created when class loads)', '<span class="c-g">Yes</span> (class init is safe)', 'Field read', 'Great when creation is cheap'],
  ['Lazy, no locking', 'Yes', '<span class="c-r">No</span> — race creates two', 'Field read', '<span class="c-r">Never in multi-threaded code</span>'],
  ['<code>synchronized getInstance()</code>', 'Yes', '<span class="c-g">Yes</span>', 'Lock every call', 'Correct, slower under contention'],
  ['Double-checked locking + <b>volatile</b>', 'Yes', '<span class="c-g">Yes</span> (only with volatile!)', 'Volatile read', 'Correct but easy to get wrong'],
  ['Holder idiom (static nested class)', 'Yes', '<span class="c-g">Yes</span> (JVM class-init lock)', 'Field read', '<span class="c-g">Best lazy option</span>'],
  ['<code>enum X { INSTANCE }</code>', 'Loads with the enum', '<span class="c-g">Yes</span> + safe vs reflection &amp; serialization', 'Field read', '<span class="c-g">Joshua Bloch\'s recommendation</span>']
])}
<p><b>Why DCL needs <code>volatile</code>:</b> <code>instance = new Config()</code> is three steps (allocate, construct, assign). Without <code>volatile</code>, the assignment may become visible to another thread <i>before</i> construction finishes, so that thread skips the lock and uses a half-built object. The visualizer below plays that out with two threads.</p>
<p><b>Three ways to break a Singleton</b> and the fixes: <b>reflection</b> (<code>setAccessible(true)</code> on the private constructor → throw from the constructor if an instance exists, or use an enum), <b>serialization</b> (deserialising creates a new object → add <code>readResolve()</code> returning the instance, or use an enum), <b>cloning</b> (do not implement <code>Cloneable</code>). Also: separate <b>class loaders</b> each get their own "singleton".</p>`,
    clues: [
      '"There must be <b>only one</b> X in the application" (config, registry, ID generator, device driver)',
      '"<b>Lazy</b> initialisation, and it is called from <b>many threads</b>" → holder idiom or DCL with volatile',
      '"Make it safe against <b>reflection and serialization</b>" → enum singleton',
      '"Global point of access" in the problem statement → Singleton, then mention testability and DI',
      '"Why is this double-checked locking broken?" → missing <code>volatile</code> or missing second check',
      '"Our unit tests interfere with each other" → hidden shared Singleton state; inject an interface instead'
    ],
    code: [
      { lang: 'java', title: 'All thread-safe variants side by side (with a concurrency smoke test)', code: `
// 1) EAGER: created when the class is initialised. Thread-safe for free.
final class EagerConfig {
    private static final EagerConfig INSTANCE = new EagerConfig();
    private EagerConfig() { }
    static EagerConfig getInstance() { return INSTANCE; }
}

// 2) LAZY + synchronized method: correct, but every call takes the lock.
final class SyncConfig {
    private static SyncConfig instance;
    private SyncConfig() { }
    static synchronized SyncConfig getInstance() {
        if (instance == null) {
            instance = new SyncConfig();
        }
        return instance;
    }
}

// 3) DOUBLE-CHECKED LOCKING: volatile is mandatory.
final class DclConfig {
    private static volatile DclConfig instance;
    private DclConfig() { }
    static DclConfig getInstance() {
        DclConfig local = instance;              // one volatile read on the fast path
        if (local == null) {                     // 1st check: no lock
            synchronized (DclConfig.class) {
                local = instance;
                if (local == null) {             // 2nd check: inside the lock
                    instance = local = new DclConfig();
                }
            }
        }
        return local;
    }
}

// 4) HOLDER IDIOM (initialization-on-demand): lazy + lock-free reads.
final class HolderConfig {
    private HolderConfig() { }
    private static final class Holder {
        static final HolderConfig INSTANCE = new HolderConfig();   // runs on first access to Holder
    }
    static HolderConfig getInstance() { return Holder.INSTANCE; }
}

// 5) ENUM: the JVM guarantees one instance, even against reflection/serialization.
enum EnumConfig {
    INSTANCE;
    private final Map<String, String> settings = new ConcurrentHashMap<>();
    String get(String key) { return settings.getOrDefault(key, ""); }
    void set(String key, String value) { settings.put(key, value); }
}

public class Main {
    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(8);
        Set<Integer> ids = ConcurrentHashMap.newKeySet();       // identity hash codes seen
        CountDownLatch start = new CountDownLatch(1);
        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < 8; i++) {
            futures.add(pool.submit(() -> {
                start.await();                                   // release all threads together
                ids.add(System.identityHashCode(DclConfig.getInstance()));
                return null;
            }));
        }
        start.countDown();
        for (Future<?> f : futures) f.get();
        pool.shutdown();
        System.out.println("distinct DCL instances: " + ids.size());   // 1
        System.out.println(HolderConfig.getInstance() == HolderConfig.getInstance()); // true
        EnumConfig.INSTANCE.set("region", "ap-south-1");
        System.out.println(EnumConfig.INSTANCE.get("region"));
    }
}` },
      { lang: 'java', title: 'Breaking a Singleton (reflection, serialization) and defending it', code: `
import java.lang.reflect.Constructor;
import java.lang.reflect.InvocationTargetException;

final class Settings implements Serializable {
    private static final long serialVersionUID = 1L;
    private static boolean created = false;                 // initialised before INSTANCE (textual order)
    private static final Settings INSTANCE = new Settings();

    private Settings() {
        synchronized (Settings.class) {
            if (created) {                                   // reflection guard
                throw new IllegalStateException("Use Settings.getInstance()");
            }
            created = true;
        }
    }

    static Settings getInstance() { return INSTANCE; }

    // Serialization guard: replace the freshly deserialised copy with THE instance.
    private Object readResolve() { return INSTANCE; }
}

public class BreakDemo {
    public static void main(String[] args) throws Exception {
        // Attack 1: reflection
        Constructor<Settings> ctor = Settings.class.getDeclaredConstructor();
        ctor.setAccessible(true);
        try {
            ctor.newInstance();
        } catch (InvocationTargetException e) {
            System.out.println("reflection blocked: " + e.getCause().getMessage());
        }

        // Attack 2: serialization round-trip
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(bytes)) {
            out.writeObject(Settings.getInstance());
        }
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(bytes.toByteArray()))) {
            Object copy = in.readObject();
            System.out.println("same after deserialize? " + (copy == Settings.getInstance())); // true
        }
    }
}` }
    ],
    codeTitle: ['Five variants + smoke test', 'Attacks and defences'],
    viz: [
      {
        title: 'Two threads race into getInstance(): pick a variant',
        input: 'dcl',
        inputLabel: 'Variant: unsafe | sync | dcl | dcl-no-volatile | holder',
        gen: function (input) {
          var v = word(input, ['unsafe', 'sync', 'dcl', 'dcl-no-volatile', 'holder'], 'Type one of: unsafe, sync, dcl, dcl-no-volatile, holder');
          var code = SINGLETON_CODES[v], steps = SINGLETON_STEPS[v], rows = [], frames = [], created = 0;
          frames.push({ narr: 'Variant <b>' + v + '</b>. Two threads, <b>A</b> and <b>B</b>, call <code>getInstance()</code> at almost the same moment while the instance does not exist yet. Watch the table: one row per step the scheduler runs.', parts: [
            { type: 'code', label: 'Code under test', lang: 'java', code: code, hl: {} },
            { type: 'table', label: 'Interleaving (who ran what)', columns: ['#', 'Thread A', 'Thread B', 'instance field'], rows: [['0', 'calls getInstance()', 'calls getInstance()', 'null']], hl: {} },
            { type: 'vars', label: 'Shared state', vals: { instance: 'null', lockHeldBy: '-', objectsCreated: 0 } }
          ] });
          steps.forEach(function (s, i) {
            if (/-> #/.test(s[2])) created++;
            var a = s[0] === 'A' ? s[2] : '', b = s[0] === 'B' ? s[2] : '';
            if (s[0] === 'C') { a = 'Thread C (later): ' + s[2]; }
            rows.push([String(i + 1), a, b, s[3]]);
            var hl = {}; hl[s[1]] = s[5] === 'bad' ? 'bad' : (s[5] === 'ok' ? 'ok' : 'cur');
            var vh = {}; if (s[5] === 'bad') vh.instance = 'bad'; if (/-> #/.test(s[2])) vh.objectsCreated = created > 1 ? 'bad' : 'ok';
            frames.push({ narr: '<b>Thread ' + s[0] + '</b>, line ' + s[1] + ': ' + s[6], parts: [
              { type: 'code', label: 'Code under test (Thread ' + s[0] + ' is here)', lang: 'java', code: code, hl: hl },
              { type: 'table', label: 'Interleaving (who ran what)', columns: ['#', 'Thread A', 'Thread B', 'instance field'], rows: [['0', 'calls getInstance()', 'calls getInstance()', 'null']].concat(rows.map(function (r) { return r.slice(); })), hl: one(rows.length, s[5] === 'bad' ? 'bad' : (s[5] === 'ok' ? 'ok' : (s[5] === 'sel' ? 'sel' : 'cur'))) },
              { type: 'vars', label: 'Shared state', vals: { instance: s[3], lockHeldBy: s[4], objectsCreated: created }, hl: vh }
            ] });
          });
          var verdict = { unsafe: '<span class="c-r">Two objects created. Never use in concurrent code.</span>', sync: '<span class="c-g">One object.</span> Cost: a lock on every call.', dcl: '<span class="c-g">One object</span>, lock only during creation. Needs volatile + two checks.', 'dcl-no-volatile': '<span class="c-r">Another thread can see a half-constructed object.</span> Add volatile.', holder: '<span class="c-g">One object</span>, lazy, no explicit locking: the JVM does it.' }[v];
          frames.push({ narr: 'Verdict for <b>' + v + '</b>: ' + verdict + ' Try another variant in the input box to compare.', parts: [
            { type: 'table', label: 'All variants at a glance', columns: ['Variant', 'Instances under race', 'Lock on fast path?'], rows: [['unsafe', '2 (bug)', 'no'], ['sync', '1', 'yes, every call'], ['dcl (volatile)', '1', 'no'], ['dcl-no-volatile', '1 but maybe half-built (bug)', 'no'], ['holder / enum', '1', 'no']], hl: one({ unsafe: 0, sync: 1, dcl: 2, 'dcl-no-volatile': 3, holder: 4 }[v], (v === 'unsafe' || v === 'dcl-no-volatile') ? 'bad' : 'ok') }
          ] });
          return frames;
        }
      },
      {
        title: 'Singleton class structure: many callers, one object (and a reflection attack)',
        input: '3',
        inputLabel: 'Number of client classes (2-5)',
        gen: function (input) {
          var n = intOf(input, 2, 5, 'Enter a whole number from 2 to 5');
          var names = ['OrderService', 'PaymentService', 'CartService', 'AuditJob', 'ReportJob'];
          var gap = 12, h = Math.max(54, n * gap + 18), mid = 8 + ((n - 1) * gap) / 2;
          var nodes = [];
          for (var i = 0; i < n; i++) nodes.push(box('c' + i, names[i], 14, 8 + i * gap));
          nodes.push(box('S', 'AppConfig (private ctor)', 52, mid));
          nodes.push(box('obj', 'object #1', 88, mid));
          var frames = [], edges = [], hl = {}, ehl = {}, tags = {};
          function g(extraNodes, extraEdges) { return { type: 'graph', label: 'Who holds what', directed: true, height: h, nodes: nodes.concat(extraNodes || []), edges: edges.concat(extraEdges || []), hl: clone(hl), ehl: clone(ehl), tags: clone(tags) }; }
          tags.S = 'instance = null'; tags.obj = 'not yet';
          hl.obj = 'done';
          frames.push({ narr: 'Class structure: <b>AppConfig</b> has a <b>private constructor</b>, a <b>static</b> field <code>instance</code> and a static <code>getInstance()</code>. No object exists yet.', parts: [g(), { type: 'vars', label: 'Static state', vals: { instance: 'null', constructorCalls: 0 } }] });
          for (i = 0; i < n; i++) {
            edges.push(['c' + i, 'S', 'getInstance()']);
            hl = { S: 'cur' }; ehl = {}; ehl['c' + i + '-S'] = 'cur';
            if (i === 0) {
              tags.S = 'instance = #1'; tags.obj = 'created once';
              hl.obj = 'ok';
              frames.push({ narr: '<b>' + names[i] + '</b> is the first caller: <code>instance</code> is null, so the constructor runs <b>once</b> and the object is stored.', parts: [g([], [['S', 'obj', 'new (once)']]), { type: 'vars', label: 'Static state', vals: { instance: '#1', constructorCalls: 1 }, hl: { constructorCalls: 'ok' } }] });
              edges.push(['S', 'obj', 'returns']);
            } else {
              hl.obj = 'sel'; ehl['S-obj'] = 'ok';
              frames.push({ narr: '<b>' + names[i] + '</b> calls <code>getInstance()</code>: the field is already set, so it gets the <b>same object #1</b>. No new constructor call.', parts: [g(), { type: 'vars', label: 'Static state', vals: { instance: '#1', constructorCalls: 1, callers: i + 1 } }] });
            }
          }
          hl = { obj: 'sel' }; ehl = {};
          frames.push({ narr: 'Every client shares one object: changes made by one are seen by all. That is the feature <b>and</b> the danger (global mutable state).', parts: [g(), note('Prefer making the singleton <b>immutable</b> or internally thread-safe (e.g. ConcurrentHashMap inside).')] });
          hl = { evil: 'bad', obj2: 'bad' };
          frames.push({ narr: '<span class="c-r">Attack:</span> code uses reflection: <code>ctor.setAccessible(true); ctor.newInstance()</code>. A private constructor alone does not stop this — a <b>second object</b> appears.', parts: [g([box('evil', 'Reflection hack', 14, h - 6), box('obj2', 'object #2 (!)', 88, h - 6)], [['evil', 'obj2', 'newInstance()']]), { type: 'vars', label: 'Static state', vals: { instance: '#1', constructorCalls: 2 }, hl: { constructorCalls: 'bad' } }] });
          hl = { evil: 'done', obj: 'sel' };
          frames.push({ narr: '<span class="c-g">Defence:</span> throw from the constructor if an instance already exists, or use <code>enum AppConfig { INSTANCE }</code> — the JVM refuses to reflectively create enum constants and handles serialization for you.', parts: [g([box('evil', 'Reflection hack', 14, h - 6)], []), note('<code>IllegalArgumentException: Cannot reflectively create enum objects</code> is what the JDK throws for enums.', 'Enum wins')] });
          return frames;
        }
      }
    ],
    examples: [
      { title: 'Configuration loaded once (holder idiom)', html: `<p>Reading <code>app.properties</code> from disk on every call is slow and can give different answers if the file changes mid-request. Load it once, lazily, and expose read-only getters. The holder idiom gives laziness and thread-safety without any lock in our code.</p>`, code: `
final class AppConfig {
    private final Map<String, String> values;

    private AppConfig() {
        // Imagine reading app.properties here; we fake it for the demo.
        Map<String, String> m = new HashMap<>();
        m.put("db.url", "jdbc:postgresql://localhost/shop");
        m.put("cache.ttl", "300");
        values = Map.copyOf(m);                 // immutable -> safe to share
    }

    private static final class Holder { static final AppConfig INSTANCE = new AppConfig(); }

    static AppConfig get() { return Holder.INSTANCE; }

    String value(String key) { return values.getOrDefault(key, ""); }
}

class ConfigDemo {
    public static void main(String[] args) {
        System.out.println(AppConfig.get().value("db.url"));
        System.out.println(AppConfig.get() == AppConfig.get());   // true
    }
}` },
      { title: 'Enum singleton logger with thread-safe state', html: `<p>An enum constant is created once when the enum class initialises. Keep internal state thread-safe (here an <code>AtomicLong</code> counter) because many threads will call it.</p>`, code: `
enum AuditLog {
    INSTANCE;

    private final AtomicLong lines = new AtomicLong();

    void log(String msg) {
        long n = lines.incrementAndGet();
        System.out.println("[" + n + "] " + msg);
    }
}

class LogDemo {
    public static void main(String[] args) {
        AuditLog.INSTANCE.log("user asha logged in");
        AuditLog.INSTANCE.log("order 42 placed");
    }
}` },
      { title: 'The testability problem and the DI fix', html: `<p><code>PriceService</code> calls <code>SystemClock.getInstance().now()</code> — tests cannot control time, so "expires after 30 days" is untestable. Fix: depend on an interface and <b>inject</b> it. Production wires the one real instance (still a single object — "singleton by configuration"), tests pass a fixed clock. This is why modern code prefers <b>one instance managed by DI</b> over the Singleton <i>pattern</i>.</p>`, code: `
interface TimeSource { long nowMillis(); }

final class SystemTime implements TimeSource {
    static final SystemTime INSTANCE = new SystemTime();
    private SystemTime() { }
    public long nowMillis() { return System.currentTimeMillis(); }
}

class Coupon {
    private final TimeSource time;
    private final long expiresAt;
    Coupon(TimeSource time, long expiresAt) { this.time = time; this.expiresAt = expiresAt; }
    boolean valid() { return time.nowMillis() < expiresAt; }
}

class CouponTest {
    public static void main(String[] args) {
        TimeSource fixed = () -> 1_000L;                      // test clock
        System.out.println(new Coupon(fixed, 2_000L).valid());  // true
        System.out.println(new Coupon(SystemTime.INSTANCE, 0L).valid()); // false
    }
}` },
      { title: '"One per JVM" is not "one per system"', html: `<p>A Singleton is unique per <b>class loader</b> in <b>one JVM</b>. Run 10 pods of your service and you have 10 "singletons". Web servers with per-app class loaders can even have two in one JVM. If you need one-per-cluster (a single scheduler, a global counter) you need a <b>distributed</b> mechanism: leader election (ZooKeeper/etcd), a database row lock, or a Redis <code>INCR</code> — not a Java pattern.</p>` }
    ],
    deepDive: `<p>🟣 <b>Java Memory Model details.</b> A <code>volatile</code> write <i>happens-before</i> every subsequent read of that field, which forbids the "publish before construct" reordering. Since Java 5 (JSR-133) DCL with <code>volatile</code> is correct; before that it was famously broken. <code>final</code> fields get a special guarantee: once a constructor finishes, other threads that see the reference see correct final field values — which is why <b>immutable</b> singletons are robust even when published sloppily.</p>
<p><b>Class initialisation</b> (JLS §12.4.2) is performed under a per-class lock and happens at most once; that is what makes eager, holder and enum singletons thread-safe without explicit locks. A trap: if the static initialiser throws, the class is marked erroneous and every later access throws <code>NoClassDefFoundError</code> — log the root cause.</p>
<p><b>Performance:</b> an uncontended <code>synchronized</code> costs tens of nanoseconds today (biased locking was removed in JDK 15, but thin locks are fast); the holder idiom compiles to a plain static read that the JIT can constant-fold. <b>Deadlock trap:</b> two singletons whose constructors call each other's <code>getInstance()</code> from different threads can deadlock on class-init locks.</p>
<p><b>Lifecycle and testing.</b> Singletons live until the class loader dies, so they leak in hot-redeploy environments and keep state across tests. Common mitigations: make them stateless/immutable, add a package-private <code>resetForTests()</code> (a smell), or switch to DI where the container owns the single instance. Spring's default <code>@Scope("singleton")</code> means "one per application context", not the GoF pattern. <b>Multiton</b> (one instance per key, e.g. per tenant) is a common variant: use <code>ConcurrentHashMap.computeIfAbsent</code>.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> ask an assistant for "a thread-safe singleton" and you usually get DCL — sometimes <b>without volatile</b> or with the lazy unsafe version, because older blog posts dominate training data. Code review is now the job: check private constructor, volatile + two checks (or holder/enum), immutable state, and whether a singleton is needed at all.</p>
<p><b>Use AI as a partner:</b> <code>Review this Singleton for: thread safety under JMM, reflection, serialization, cloning, class-loader issues, and test isolation. Point to the exact line for each issue.</code> Ask it to write a <b>jcstress</b> or <code>CountDownLatch</code> race test. <b>Where AI goes wrong:</b> claiming <code>synchronized</code> is "very slow" (outdated), recommending Singleton for things that should be injected, forgetting <code>readResolve</code>. <b>What you must own:</b> explaining <i>why</i> volatile is needed in your own words, and arguing "DI-managed single instance" vs "Singleton pattern" in an interview.</p>`,
    problems: [
      {
        title: 'Fix the Broken Singleton ID Generator',
        level: 'Medium', tags: ['singleton', 'concurrency', 'volatile', 'atomic'], companies: ['Amazon', 'Uber', 'Goldman Sachs'],
        statement: `<p>This ID generator is meant to hand out unique, increasing order IDs across the whole JVM. Under load, the team sees <b>duplicate IDs</b>. Find every bug and fix it.</p>
<pre>class IdGenerator {
    private static IdGenerator instance;
    private long next = 0;
    public IdGenerator() { }
    public static IdGenerator getInstance() {
        if (instance == null) {
            synchronized (IdGenerator.class) {
                instance = new IdGenerator();
            }
        }
        return instance;
    }
    public long nextId() { return ++next; }
}</pre>`,
        constraints: `Up to 64 threads call <code>getInstance().nextId()</code> concurrently, millions of times per second. IDs must be unique and start at 1. No external libraries.`,
        example: `<p>8 threads × 10,000 calls each must produce <span class="c-g">80,000 distinct IDs</span> (1..80000 in some order). The broken version can produce <span class="c-r">fewer distinct IDs</span> because (a) two generators may be created, each starting at 0, and (b) <code>++next</code> is read-modify-write, so two threads can read the same value.</p>`,
        brute: {
          why: `<p>The most naive "design": every caller does <code>new IdGenerator()</code>. Each object starts at 0, so every service hands out ID 1, 2, 3... → duplicates immediately. The broken Singleton tries to fix that but has four bugs: a <b>public constructor</b> (anyone can still <code>new</code>), <b>no second check</b> inside the lock (two threads that both saw null each create one), <b>no volatile</b> (half-built object visible), and a <b>non-atomic</b> <code>++next</code>.</p>`,
          code: `
class NaiveIdGenerator {
    private long next = 0;
    long nextId() { return ++next; }
}

class OrderService {
    long newOrderId() { return new NaiveIdGenerator().nextId(); }   // always returns 1!
}

class InvoiceService {
    long newInvoiceId() { return new NaiveIdGenerator().nextId(); } // also 1 -> duplicates
}`
        },
        mcq: { q: 'Even with a perfect single instance, why can nextId() still return duplicates?', options: ['++next is read-modify-write and not atomic', 'long fields are always cached per thread forever', 'static methods cannot be called concurrently', 'The JVM reuses object IDs'], answer: 0, explain: 'Two threads can read next = 41, both add 1 and both return 42. Use AtomicLong.incrementAndGet() or synchronize the method.' },
        hints: [
          `<p>Hint 1: there are two separate problems — "only one generator object" (creation safety) and "the counter itself" (operation safety). Fixing one does not fix the other.</p>`,
          `<p>Hint 2: for creation, either make the constructor private and use the holder idiom, or keep DCL but add <code>volatile</code> and a second <code>null</code> check inside <code>synchronized</code>.</p>`,
          `<p>Hint 3: replace <code>long next</code> with <code>AtomicLong</code> and use <code>incrementAndGet()</code>. Then prove it with a test: N threads, a <code>CountDownLatch</code> start gate, collect IDs in a concurrent set and compare its size.</p>`
        ],
        solution: {
          approach: `<p><b>Fix list:</b></p>
<ol><li><b>Private constructor</b> so <code>new IdGenerator()</code> is impossible outside the class.</li>
<li><b>Holder idiom</b> for lazy, thread-safe creation (the JVM's class-init lock does the work). DCL with <code>volatile</code> + second check would also be correct — the holder idiom is just harder to get wrong.</li>
<li><b>AtomicLong</b> counter: <code>incrementAndGet()</code> is a single atomic CAS-based operation, so no two threads get the same value.</li>
<li><b>Prove it</b> with a concurrent test that releases all threads at once.</li></ol>
<p>Interview bonus: mention that this is unique per JVM only; across many servers use a Snowflake-style ID (timestamp + machine id + sequence) or a database sequence.</p>`,
          code: `
final class IdGenerator {
    private final AtomicLong next = new AtomicLong();          // atomic counter

    private IdGenerator() { }                                   // no outside "new"

    private static final class Holder {
        static final IdGenerator INSTANCE = new IdGenerator();  // created on first use, once
    }

    static IdGenerator getInstance() { return Holder.INSTANCE; }

    long nextId() { return next.incrementAndGet(); }           // 1, 2, 3, ... never duplicated
}

public class Main {
    public static void main(String[] args) throws Exception {
        int threads = 8, perThread = 10_000;
        Set<Long> seen = ConcurrentHashMap.newKeySet();
        CountDownLatch go = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        List<Future<?>> jobs = new ArrayList<>();
        for (int t = 0; t < threads; t++) {
            jobs.add(pool.submit(() -> {
                go.await();
                for (int i = 0; i < perThread; i++) seen.add(IdGenerator.getInstance().nextId());
                return null;
            }));
        }
        go.countDown();
        for (Future<?> j : jobs) j.get();
        pool.shutdown();
        System.out.println("distinct ids = " + seen.size() + " (expected " + threads * perThread + ")");
    }
}`,
          complexity: `<p><code>getInstance()</code>: O(1), lock-free after initialisation. <code>nextId()</code>: O(1) CAS; under extreme contention consider <code>LongAdder</code>-style striping or pre-allocated ID blocks per thread.</p>`,
          followUps: ['Rewrite it as an enum singleton. What do you gain?', 'How would you generate unique IDs across 50 servers?', 'Why is the holder idiom lazy even though the field is static?']
        }
      }
    ]
  });
  /* ======================================================================
     TOPIC 3 — Factory Method (and Simple Factory, static factory methods)
     ====================================================================== */
  var LOGI_CODE = 'abstract class Logistics {\n  // the FACTORY METHOD: subclasses pick the product\n  protected abstract Transport createTransport();\n\n  // business logic that USES the product\n  String planDelivery(String cargo) {\n    Transport t = createTransport();\n    return t.deliver(cargo);\n  }\n}\nclass RoadLogistics extends Logistics {\n  protected Transport createTransport() { return new Truck(); }\n}\nclass SeaLogistics extends Logistics {\n  protected Transport createTransport() { return new Ship(); }\n}\nclass AirLogistics extends Logistics {\n  protected Transport createTransport() { return new Plane(); }\n}';

  topics.push({
    title: 'Factory Method: Let Subclasses (or a Registry) Decide Which Class to Create',
    analogy: `<p>A logistics company's head office has one delivery plan: <i>"pick up cargo, load it, deliver it, send the invoice"</i>. The <b>road branch</b> follows that plan with trucks; the <b>sea branch</b> follows the same plan with ships. Head office never says "buy a truck" — it says "each branch, bring your own vehicle".</p>
<p>That "bring your own vehicle" step is the <b>factory method</b>: the general plan lives in the parent, and the <b>one decision that varies</b> — which concrete object to create — is left to each subclass (or to a lookup table).</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Code that <i>uses</i> an object should not have to know its <i>exact class</i>. It asks a method — the factory — for "a Notification" or "a Transport", and the factory decides whether that means <code>SmsNotification</code> or <code>Ship</code>. The caller only knows the interface.</p>
<p>🔵 <b>Three flavours you must be able to tell apart</b>:</p>
${H.table(['Flavour', 'Shape in code', 'Use it when'], [
  ['<b>Simple Factory</b> (idiom)', 'One method: <code>create(type)</code> with a <code>switch</code> or a <code>Map&lt;String, Supplier&lt;T&gt;&gt;</code>', 'The choice depends on <b>data</b> (config, user input, file type)'],
  ['<b>Factory Method</b> (GoF)', 'Abstract parent declares <code>abstract Product createProduct()</code> and uses it inside its own logic; each subclass overrides it', 'A <b>framework/base class</b> has a fixed workflow but subclasses must plug in their own product'],
  ['<b>Static factory method</b>', '<code>List.of()</code>, <code>Integer.valueOf()</code>, <code>Optional.empty()</code>', 'You want a <b>name</b>, caching, or to return a hidden subtype']
])}
<p><b>Factory Method, step by step:</b> (1) Define the product interface <code>Transport</code>. (2) Concrete products <code>Truck</code>, <code>Ship</code>. (3) Abstract creator <code>Logistics</code> with an abstract <code>createTransport()</code> and a normal method <code>planDelivery()</code> that calls it. (4) Concrete creators <code>RoadLogistics</code>, <code>SeaLogistics</code> override the factory method. The parent's logic is written once; the "which class?" decision is pushed down.</p>
<p><b>Open/Closed in practice:</b> a <code>switch</code>-based factory must be edited for every new type. A <b>registry</b> (<code>register("whatsapp", WhatsAppNotification::new)</code>) lets you add types without touching existing code — this is how plugin systems, Spring's bean maps and JDBC drivers work.</p>
<p><b>Pitfalls:</b> a factory that returns <code>null</code> for unknown types (throw instead), giant <code>if/else</code> factories that know too much, factories for classes with only one implementation, and confusing Factory Method (inheritance-based) with Abstract Factory (object that makes a <i>family</i>).</p>`,
    clues: [
      '"Support Email, SMS and Push — and <b>more channels later</b>" → factory returning a <code>Notification</code> interface',
      '"The type is decided at <b>runtime</b> from config / user input / file extension" → registry-based simple factory',
      '"A framework defines the workflow, <b>subclasses supply the object</b>" → GoF Factory Method',
      '"Avoid <b>if-else chains</b> of new" or "follow Open/Closed" → <code>Map&lt;String, Supplier&lt;T&gt;&gt;</code>',
      '"Client code should depend only on the <b>interface</b>" → factory hides concrete classes',
      '"Give constructors meaningful names / cache instances" → static factory methods (<code>of</code>, <code>valueOf</code>)'
    ],
    code: [
      { lang: 'java', title: 'Simple Factory with a registry (Open/Closed friendly)', code: `
interface Notification {
    String send(String to, String text);
}

class EmailNotification implements Notification {
    public String send(String to, String text) { return "EMAIL to " + to + ": " + text; }
}

class SmsNotification implements Notification {
    public String send(String to, String text) { return "SMS to " + to + ": " + text; }
}

class PushNotification implements Notification {
    public String send(String to, String text) { return "PUSH to device of " + to + ": " + text; }
}

final class NotificationFactory {
    private final Map<String, Supplier<Notification>> registry = new ConcurrentHashMap<>();

    NotificationFactory() {
        register("email", EmailNotification::new);
        register("sms", SmsNotification::new);
        register("push", PushNotification::new);
    }

    // New channels plug in here -- no edits to create() or to any client.
    void register(String channel, Supplier<Notification> recipe) {
        registry.put(channel.toLowerCase(Locale.ROOT), Objects.requireNonNull(recipe));
    }

    Notification create(String channel) {
        Supplier<Notification> recipe = registry.get(channel.toLowerCase(Locale.ROOT));
        if (recipe == null) {
            throw new IllegalArgumentException("Unknown channel '" + channel + "'. Known: " + registry.keySet());
        }
        return recipe.get();                       // a brand-new product each call
    }
}

public class Main {
    public static void main(String[] args) {
        NotificationFactory factory = new NotificationFactory();
        Notification n = factory.create("SMS");     // client knows only the interface
        System.out.println(n.send("+91-98xxxx", "OTP 4821"));

        // A plugin adds a channel at startup:
        factory.register("whatsapp", () -> (to, text) -> "WHATSAPP to " + to + ": " + text);
        System.out.println(factory.create("whatsapp").send("asha", "Your order shipped"));
    }
}` },
      { lang: 'java', title: 'GoF Factory Method: the parent workflow calls an overridable creation method', code: `
interface Transport {
    String deliver(String cargo);
}

class Truck implements Transport {
    public String deliver(String cargo) { return cargo + " delivered by road in a truck"; }
}

class Ship implements Transport {
    public String deliver(String cargo) { return cargo + " delivered by sea in a container ship"; }
}

class Plane implements Transport {
    public String deliver(String cargo) { return cargo + " delivered by air"; }
}

abstract class Logistics {
    // The FACTORY METHOD: the one step subclasses must supply.
    protected abstract Transport createTransport();

    // Shared business logic written once; it does not know Truck/Ship/Plane.
    String planDelivery(String cargo) {
        Transport t = createTransport();
        return "[plan] " + t.deliver(cargo);
    }
}

class RoadLogistics extends Logistics {
    protected Transport createTransport() { return new Truck(); }
}

class SeaLogistics extends Logistics {
    protected Transport createTransport() { return new Ship(); }
}

class AirLogistics extends Logistics {
    protected Transport createTransport() { return new Plane(); }
}

public class LogisticsApp {
    public static void main(String[] args) {
        List<Logistics> branches = List.of(new RoadLogistics(), new SeaLogistics(), new AirLogistics());
        for (Logistics branch : branches) {
            System.out.println(branch.planDelivery("200 boxes"));
        }
    }
}` }
    ],
    codeTitle: ['Simple Factory + registry', 'GoF Factory Method'],
    viz: [
      {
        title: 'Factory picks the product: follow the highlighted edge',
        input: 'sms',
        inputLabel: 'Channel to create (email | sms | push | anything else to see the error path)',
        gen: function (input) {
          var ch = String(input === undefined || input === null ? '' : input).trim().toLowerCase();
          if (!/^[a-z]{2,12}$/.test(ch)) throw new Error('Type a channel name of 2-12 letters, e.g. sms');
          var prods = { email: 'EmailNotification', sms: 'SmsNotification', push: 'PushNotification' };
          var ids = { email: 'E', sms: 'S', push: 'P' };
          var nodes = [box('C', 'Client', 10, 30), box('F', 'NotificationFactory', 40, 30), box('E', 'EmailNotification', 82, 8), box('S', 'SmsNotification', 82, 30), box('P', 'PushNotification', 82, 52)];
          var edges = [['C', 'F', 'create("' + ch + '")'], ['F', 'E', 'new'], ['F', 'S', 'new'], ['F', 'P', 'new']];
          var reg = [['email', 'EmailNotification::new'], ['sms', 'SmsNotification::new'], ['push', 'PushNotification::new']];
          var frames = [];
          function g(hl, ehl, tags, xn, xe) { return { type: 'graph', label: 'Factory structure', directed: true, height: 60, nodes: nodes.concat(xn || []), edges: edges.concat(xe || []), hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
          frames.push({ narr: 'Structure: the <b>Client</b> knows only the <code>Notification</code> interface and the factory. Three concrete products sit behind the factory; the client never names them.', parts: [g({ F: 'sel' }, {}, { E: 'implements Notification', S: 'implements Notification', P: 'implements Notification' }), { type: 'map', label: 'Factory registry: key → recipe (Supplier)', entries: reg }] });
          frames.push({ narr: 'Client calls <code>factory.create("' + ch + '")</code>. It does <b>not</b> say <code>new</code> anywhere.', parts: [g({ C: 'cur', F: 'cur' }, { 'C-F': 'cur' }), { type: 'code', label: 'Client code', lang: 'java', code: 'Notification n = factory.create("' + ch + '");\nn.send("asha", "OTP 4821");', hl: { 1: 'cur' } }] });
          var found = prods[ch] !== undefined;
          frames.push({ narr: 'Factory normalises the key and looks it up in its registry map. ' + (found ? 'Key <b>' + ch + '</b> is <span class="c-g">registered</span>.' : 'Key <b>' + ch + '</b> is <span class="c-r">not registered</span>.'), parts: [g({ F: 'cur' }), { type: 'map', label: 'Factory registry lookup', entries: reg, hl: found ? one(ch, 'ok') : {} }, { type: 'vars', label: 'Inside create()', vals: { key: ch, recipe: found ? prods[ch] + '::new' : 'null' }, hl: { recipe: found ? 'ok' : 'bad' } }] });
          if (!found) {
            frames.push({ narr: '<span class="c-r">Unknown channel</span>: a good factory <b>throws</b> a clear error (never returns null — a null would explode later, far from the cause).', parts: [g({ F: 'bad' }, { 'C-F': 'bad' }), note('<code>IllegalArgumentException: Unknown channel \'' + H.esc(ch) + '\'. Known: [email, sms, push]</code>', 'Thrown to the client')] });
            frames.push({ narr: 'To support <b>' + ch + '</b>, write one new class and register it at startup. <b>No existing class changes</b> — the Open/Closed principle in action.', parts: [g({ X: 'ok' }, { 'F-X': 'ok' }, { X: 'new plugin' }, [box('X', ch.charAt(0).toUpperCase() + ch.slice(1) + 'Notification', 40, 54)], [['F', 'X', 'new']]), { type: 'map', label: 'Registry after register()', entries: reg.concat([[ch, 'NewChannel::new']]), hl: one(ch, 'ok') }] });
            frames.push({ narr: 'Retry <code>create("' + ch + '")</code>: now the edge to the new product lights up. Clients were never touched.', parts: [g({ X: 'sel' }, { 'C-F': 'ok', 'F-X': 'ok' }, {}, [box('X', ch.charAt(0).toUpperCase() + ch.slice(1) + 'Notification', 40, 54)], [['F', 'X', 'new']])] });
            return frames;
          }
          var id = ids[ch], ehl = { 'C-F': 'ok' }; ehl['F-' + id] = 'ok';
          var hl = { F: 'done' }; hl[id] = 'ok';
          frames.push({ narr: 'The factory calls the recipe: <code>new ' + prods[ch] + '()</code>. Follow the <span class="c-g">green edge</span>: this is the only place in the whole program where that class name appears.', parts: [g(hl, ehl, one(id, 'new object'))] });
          hl = {}; hl[id] = 'sel';
          frames.push({ narr: 'It returns the object typed as the <b>interface</b> <code>Notification</code>. The client\'s variable cannot even see that it is an ' + prods[ch] + '.', parts: [g(hl, {}, { C: 'holds: Notification' }), { type: 'vars', label: 'Client variables', vals: { n: 'Notification (runtime: ' + prods[ch] + ')' }, hl: { n: 'sel' } }] });
          frames.push({ narr: '<code>n.send(...)</code> uses <b>dynamic dispatch</b>: the JVM calls ' + prods[ch] + '.send() because that is the real object. Polymorphism does the rest.', parts: [{ type: 'code', label: 'Client code', lang: 'java', code: 'Notification n = factory.create("' + ch + '");\nn.send("asha", "OTP 4821");', hl: { 2: 'ok' } }, note('Output: <code>' + { email: 'EMAIL', sms: 'SMS', push: 'PUSH' }[ch] + ' to asha: OTP 4821</code>', 'Console')] });
          frames.push({ narr: 'Change the user\'s preference from ' + ch + ' to another channel and only the <b>string</b> changes — zero code edits in the client. Try another input above.', parts: [g({ F: 'sel' }, ehl)] });
          return frames;
        }
      },
      {
        title: 'GoF Factory Method: parent workflow, subclass picks the product',
        input: 'sea',
        inputLabel: 'Branch: road | sea | air',
        gen: function (input) {
          var b = word(input, ['road', 'sea', 'air'], 'Type road, sea or air');
          var sub = { road: 'R', sea: 'S', air: 'A' }[b], prod = { road: 'T', sea: 'H', air: 'P' }[b];
          var subName = { road: 'RoadLogistics', sea: 'SeaLogistics', air: 'AirLogistics' }[b], prodName = { road: 'Truck', sea: 'Ship', air: 'Plane' }[b];
          var line = { road: 12, sea: 15, air: 18 }[b];
          var nodes = [box('L', 'Logistics (abstract)', 50, 7), box('R', 'RoadLogistics', 16, 28), box('S', 'SeaLogistics', 50, 28), box('A', 'AirLogistics', 84, 28), box('T', 'Truck', 16, 50), box('H', 'Ship', 50, 50), box('P', 'Plane', 84, 50)];
          var edges = [['R', 'L', 'extends'], ['S', 'L', 'extends'], ['A', 'L', 'extends'], ['R', 'T', 'creates'], ['S', 'H', 'creates'], ['A', 'P', 'creates']];
          function g(hl, ehl) { return { type: 'graph', label: 'Class structure', directed: true, height: 58, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {} }; }
          var frames = [];
          frames.push({ narr: 'Class structure: one abstract <b>creator</b> (Logistics), three <b>concrete creators</b>, three <b>products</b>. Each concrete creator is paired with the product it makes.', parts: [g({ L: 'sel' }), { type: 'code', label: 'Code', lang: 'java', code: LOGI_CODE, hl: { 3: 'sel' } }] });
          var h1 = {}; h1[sub] = 'cur';
          frames.push({ narr: 'Client code: <code>Logistics app = new ' + subName + '(); app.planDelivery("200 boxes");</code> — the client picks a <b>branch</b>, not a vehicle.', parts: [g(h1), { type: 'code', label: 'Code', lang: 'java', code: LOGI_CODE, hl: { 6: 'cur' } }] });
          var h2 = { L: 'cur' }; h2[sub] = 'done'; var e2 = {}; e2[sub + '-L'] = 'cur';
          frames.push({ narr: '<code>planDelivery</code> is inherited: it runs the <b>parent\'s</b> code. The parent reaches the line <code>Transport t = createTransport();</code> — but it has no idea what that returns.', parts: [g(h2, e2), { type: 'code', label: 'Code', lang: 'java', code: LOGI_CODE, hl: { 7: 'cur' } }] });
          var h3 = {}; h3[sub] = 'cur'; var e3 = {}; e3[sub + '-L'] = 'ok';
          frames.push({ narr: 'Dynamic dispatch jumps to the <b>override</b> in ' + subName + '. This override is the factory method: the single line that knows the concrete class.', parts: [g(h3, e3), { type: 'code', label: 'Code', lang: 'java', code: LOGI_CODE, hl: one(line, 'cur') }] });
          var h4 = {}; h4[prod] = 'ok'; h4[sub] = 'done'; var e4 = {}; e4[sub + '-' + prod] = 'ok';
          frames.push({ narr: 'The override does <code>new ' + prodName + '()</code>. Follow the green edge: ' + subName + ' → ' + prodName + '.', parts: [g(h4, e4), { type: 'vars', label: 'Inside planDelivery()', vals: { t: 'Transport (runtime: ' + prodName + ')' }, hl: { t: 'ok' } }] });
          var h5 = { L: 'cur' }; h5[prod] = 'sel';
          frames.push({ narr: 'Back in the parent: <code>t.deliver(cargo)</code> runs ' + prodName + '.deliver(). The parent workflow was written <b>once</b> and works with every vehicle.', parts: [g(h5), { type: 'code', label: 'Code', lang: 'java', code: LOGI_CODE, hl: { 8: 'ok' } }] });
          frames.push({ narr: 'Adding <b>RailLogistics</b> + <b>Train</b> means two new classes and zero edits to Logistics or any client. Contrast with a <code>switch</code> inside planDelivery() that every new vehicle would have to edit.', parts: [g({ L: 'sel' }), note('Factory Method = <b>inheritance</b> picks the product. Simple Factory = <b>data</b> (a key) picks the product. Abstract Factory = an <b>object</b> that makes a whole family.', 'Remember')] });
          return frames;
        }
      }
    ],
    examples: [
      { title: 'You use Factory Method every day: Collection.iterator()', html: `<p><code>Iterable</code> declares <code>iterator()</code>; <code>ArrayList</code> returns its private <code>Itr</code>, <code>HashSet</code> returns a key iterator of its map, <code>TreeMap</code> returns an in-order iterator. The enhanced <code>for</code> loop is the "parent workflow" that only knows <code>Iterator</code>. Other JDK factories: <code>Calendar.getInstance()</code>, <code>NumberFormat.getCurrencyInstance(locale)</code>, <code>Executors.newFixedThreadPool(n)</code>, <code>DriverManager.getConnection(url)</code>.</p>`, code: `
class IteratorFactoryDemo {
    public static void main(String[] args) {
        List<Iterable<Integer>> sources = List.of(new ArrayList<Integer>(List.of(3, 1, 2)), new TreeSet<Integer>(List.of(3, 1, 2)));
        for (Iterable<Integer> src : sources) {
            Iterator<Integer> it = src.iterator();            // factory method: each class picks its iterator
            System.out.println(it.getClass().getName());
        }
    }
}` },
      { title: 'Enum-based factory: compile-time safe types', html: `<p>When the set of types is fixed and known, an <code>enum</code> where each constant knows how to build its product removes string typos and makes a <code>switch</code> unnecessary. Adding a constant forces you to implement <code>create</code> — the compiler checks completeness.</p>`, code: `
interface Shape { double area(); }

enum ShapeType {
    CIRCLE { Shape create(double s) { return () -> Math.PI * s * s; } },
    SQUARE { Shape create(double s) { return () -> s * s; } },
    TRIANGLE { Shape create(double s) { return () -> Math.sqrt(3) / 4 * s * s; } };

    abstract Shape create(double size);   // each constant is its own factory method
}

class ShapeDemo {
    public static void main(String[] args) {
        for (ShapeType t : ShapeType.values()) {
            System.out.printf("%s area(2) = %.2f%n", t, t.create(2).area());
        }
    }
}` },
      { title: 'Factory Method as a testing seam ("subclass and override")', html: `<p>Legacy class <code>ReportJob</code> creates a real <code>S3Uploader</code> inside <code>run()</code>. Extract that <code>new</code> into a <b>protected factory method</b>; production keeps working, and the test subclass overrides it to return a fake. This is the smallest safe refactor before full dependency injection.</p>`, code: `
interface Uploader { String upload(String data); }

class S3Uploader implements Uploader {
    public String upload(String data) { return "s3://bucket/report-" + data.length(); }
}

class ReportJob {
    protected Uploader createUploader() { return new S3Uploader(); }   // factory method seam

    String run(String data) { return createUploader().upload(data.toUpperCase()); }
}

class ReportJobTest {
    public static void main(String[] args) {
        List<String> uploaded = new ArrayList<>();
        ReportJob job = new ReportJob() {
            @Override protected Uploader createUploader() {
                return data -> { uploaded.add(data); return "fake://ok"; };
            }
        };
        System.out.println(job.run("sales") + " " + uploaded);   // fake://ok [SALES]
    }
}` },
      { title: 'Choosing a parser by file extension (data-driven)', html: `<p>An importer gets <code>orders.csv</code>, <code>orders.json</code>, <code>orders.xml</code>. The extension is <b>data</b>, so a registry-based simple factory fits: <code>parsers.get(ext).get()</code>. Unknown extension → a clear "unsupported file type" error shown to the user, not a <code>NullPointerException</code>.</p>` }
    ],
    deepDive: `<p>🟣 <b>Factory Method vs Simple Factory vs Template Method.</b> GoF Factory Method is really a special case of <b>Template Method</b>: the parent's algorithm has one step — "create the product" — that subclasses fill in. A Simple Factory has no inheritance at all; it is a function from a key to an object. Interviewers accept "factory" for both, but naming the difference precisely is a signal of seniority.</p>
<p><b>Parameterised factory methods</b> (<code>createTransport(Type t)</code>) mix both styles; keep them small. When a factory grows conditionals on <i>several</i> dimensions (country × payment type × amount), move to a <b>strategy registry</b> or a rules table instead of nesting <code>if</code>s.</p>
<p><b>Reflection-based factories</b> (<code>Class.forName(name).getDeclaredConstructor().newInstance()</code>) power plugin systems and old JDBC drivers, but lose compile-time checks and are slower; modern Java prefers <code>ServiceLoader</code> (module-aware, declarative <code>META-INF/services</code> or <code>provides ... with ...</code> in <code>module-info</code>). <b>Generic factories</b>: <code>&lt;T&gt; T create(Class&lt;T&gt; type)</code> with a <code>Map&lt;Class&lt;?&gt;, Supplier&lt;?&gt;&gt;</code> and a checked cast is how mini-DI containers start.</p>
<p><b>Product lifetime:</b> a factory may return a <b>new</b> object each time, a <b>cached</b> shared one (stateless products, flyweights), or a <b>pooled</b> one. Document which — callers who mutate a "fresh" object that is actually shared create spooky bugs. Also make the registry thread-safe if registration can happen after startup (<code>ConcurrentHashMap</code>), and fail fast on duplicate keys.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> generating a factory with ten product classes is now instant, so teams drown in tiny classes. The design question — <i>does this variation point actually exist?</i> — is yours. In 2026 code reviews, the frequent AI smell is a factory wrapping a single implementation "for future extensibility".</p>
<p><b>Use AI as a partner:</b> <code>Convert this if/else chain of new into a registry factory; keep behaviour identical and list any edge cases (case sensitivity, nulls, unknown keys) you changed.</code> Then ask for tests per branch. In agent/tool systems, the <b>tool registry</b> an LLM agent uses (name → handler) is literally a registry factory; MCP servers expose tools by name the same way. <b>Where AI goes wrong:</b> returning <code>null</code> for unknown types, using reflection when a <code>Supplier</code> map is enough, confusing Factory Method with Abstract Factory in explanations. <b>What you must own:</b> choosing the flavour, naming it correctly, and explaining the Open/Closed trade-off.</p>`,
    problems: [
      {
        title: 'Ride Type Factory (Uber-style)',
        level: 'Medium', tags: ['factory', 'registry', 'polymorphism'], companies: ['Uber', 'Ola', 'Lyft', 'Swiggy'],
        statement: `<p>A ride app offers <b>AUTO</b>, <b>MINI</b>, <b>SEDAN</b> and <b>SUV</b>. Each ride type computes a fare differently: <code>base + perKm × km</code>, and SUV adds a flat ₹50 comfort fee. Design:</p>
<ul><li>an interface <code>Ride</code> with <code>String type()</code> and <code>long fare(int km)</code> (in rupees);</li>
<li>a <code>RideFactory</code> that creates a ride from a type name, so that adding <b>BIKE</b> later is one new class plus one registration;</li>
<li>a <code>FareService</code> that quotes all available types for a distance without knowing any concrete class.</li></ul>`,
        constraints: `Rates (base, perKm): AUTO (25, 10), MINI (40, 12), SEDAN (60, 15), SUV (80, 20) + 50. 1 ≤ km ≤ 500. Type names case-insensitive; unknown → IllegalArgumentException.`,
        example: `<p><code>quoteAll(10)</code> → <span class="c-g">{AUTO=125, MINI=160, SEDAN=210, SUV=330}</span>. Why: AUTO 25 + 10×10 = 125; MINI 40 + 12×10 = 160; SEDAN 60 + 15×10 = 210; SUV 80 + 20×10 + 50 = 330.</p>`,
        brute: {
          why: `<p>The naive solution puts a <code>switch</code> on the type string inside <code>FareService</code> and computes fares inline, or calls <code>new SuvRide()</code> directly in several services. Every new ride type edits the switch in every place it was copied, and the fare rules leak into services that should not know them.</p>`,
          code: `
class FareServiceNaive {
    long fare(String type, int km) {
        switch (type) {
            case "AUTO": return 25 + 10L * km;
            case "MINI": return 40 + 12L * km;
            case "SEDAN": return 60 + 15L * km;
            case "SUV": return 80 + 20L * km + 50;
            default: throw new IllegalArgumentException(type);
        }
    }
}`
        },
        mcq: { q: 'Where should the knowledge "SUV adds a ₹50 comfort fee" live?', options: ['In the SuvRide class (the product)', 'In FareService', 'In the factory\'s create() method', 'In the client UI'], answer: 0, explain: 'Products own their behaviour; the factory only decides which product to build. Keeping rules in the product keeps the factory tiny and the service generic.' },
        hints: [
          `<p>Hint 1: the varying part is "how this ride type computes its fare". Make each type its own class implementing <code>Ride</code>.</p>`,
          `<p>Hint 2: since AUTO/MINI/SEDAN share the formula, one class <code>StandardRide(type, base, perKm)</code> can serve all three via different constructor arguments; SUV can extend or wrap it.</p>`,
          `<p>Hint 3: the factory is a <code>LinkedHashMap&lt;String, Supplier&lt;Ride&gt;&gt;</code> (keeps insertion order for quotes). <code>FareService</code> loops over <code>factory.types()</code>, calls <code>create</code>, and builds a result map.</p>`
        ],
        solution: {
          approach: `<p>Products own the fare rule; the factory owns the "name → product" mapping; the service only uses the interface.</p>
<ol><li><code>StandardRide</code> holds type, base and per-km rate. <code>SuvRide</code> extends it and adds the comfort fee by overriding <code>fare</code>.</li>
<li><code>RideFactory</code> registers suppliers in a <code>LinkedHashMap</code> keyed by upper-case type. <code>create</code> throws for unknown types.</li>
<li><code>FareService.quoteAll(km)</code> iterates <code>factory.types()</code> and asks each product for its fare.</li>
<li>Adding BIKE: <code>factory.register("BIKE", () -&gt; new StandardRide("BIKE", 15, 6))</code>. Nothing else changes.</li></ol>`,
          code: `
interface Ride {
    String type();
    long fare(int km);
}

class StandardRide implements Ride {
    private final String type;
    private final long base, perKm;

    StandardRide(String type, long base, long perKm) {
        this.type = type; this.base = base; this.perKm = perKm;
    }

    public String type() { return type; }

    public long fare(int km) {
        if (km < 1) throw new IllegalArgumentException("km must be >= 1");
        return base + perKm * km;
    }
}

class SuvRide extends StandardRide {
    private static final long COMFORT_FEE = 50;

    SuvRide() { super("SUV", 80, 20); }

    @Override public long fare(int km) { return super.fare(km) + COMFORT_FEE; }
}

final class RideFactory {
    private final Map<String, Supplier<Ride>> registry = new LinkedHashMap<>();

    RideFactory() {
        register("AUTO", () -> new StandardRide("AUTO", 25, 10));
        register("MINI", () -> new StandardRide("MINI", 40, 12));
        register("SEDAN", () -> new StandardRide("SEDAN", 60, 15));
        register("SUV", SuvRide::new);
    }

    void register(String type, Supplier<Ride> recipe) {
        String key = type.toUpperCase(Locale.ROOT);
        if (registry.putIfAbsent(key, recipe) != null) throw new IllegalStateException("Duplicate type " + key);
    }

    Ride create(String type) {
        Supplier<Ride> recipe = registry.get(type.toUpperCase(Locale.ROOT));
        if (recipe == null) throw new IllegalArgumentException("Unknown ride type: " + type);
        return recipe.get();
    }

    Set<String> types() { return Collections.unmodifiableSet(registry.keySet()); }
}

class FareService {
    private final RideFactory factory;

    FareService(RideFactory factory) { this.factory = factory; }

    Map<String, Long> quoteAll(int km) {
        Map<String, Long> quotes = new LinkedHashMap<>();
        for (String t : factory.types()) quotes.put(t, factory.create(t).fare(km));
        return quotes;
    }
}

public class Main {
    public static void main(String[] args) {
        RideFactory factory = new RideFactory();
        FareService service = new FareService(factory);
        System.out.println(service.quoteAll(10));        // {AUTO=125, MINI=160, SEDAN=210, SUV=330}
        factory.register("BIKE", () -> new StandardRide("BIKE", 15, 6));
        System.out.println(service.quoteAll(10).get("BIKE"));   // 75
    }
}`,
          complexity: `<p><code>create</code>: O(1) hash lookup. <code>quoteAll</code>: O(T) for T ride types. Adding a type: one class (or one lambda) + one registration line.</p>`,
          followUps: ['Add surge pricing without editing every ride class (hint: Decorator or Strategy)', 'Load rates from config instead of hard-coding them', 'Make register() safe to call while quotes are running concurrently']
        }
      }
    ]
  });
  /* ======================================================================
     TOPIC 4 — Abstract Factory
     ====================================================================== */
  topics.push({
    title: 'Abstract Factory: Create Whole Families of Matching Objects',
    analogy: `<p>At IKEA you pick a <b>collection</b> — say "Modern Oak". From that one choice you get a chair, a sofa and a table that all <b>match</b>. You never accidentally walk out with a Victorian chair and a Modern table, because you only shopped inside one collection.</p>
<p>An <b>Abstract Factory</b> is that collection: one object that knows how to make <i>every</i> piece of a family. Pick the factory once ("Dark theme", "AWS", "Postgres") and every object it hands you is guaranteed to fit with the others.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Sometimes you do not create just <i>one</i> kind of object — you create several kinds that must <b>belong together</b>: a Button, a Checkbox and a Dialog of the same theme; a Storage and a Queue of the same cloud; a Connection and a SQL dialect of the same database. An Abstract Factory is an interface with <b>one create method per product</b>, and one concrete factory <b>per family</b>.</p>
${H.table(['', 'createButton()', 'createCheckbox()'], [
  ['<b>LightThemeFactory</b>', 'LightButton', 'LightCheckbox'],
  ['<b>DarkThemeFactory</b>', 'DarkButton', 'DarkCheckbox']
])}
<p>Rows are <b>families</b> (concrete factories), columns are <b>products</b> (create methods). The client holds one <code>ThemeFactory</code> reference and calls <code>createButton()</code> and <code>createCheckbox()</code> — it is impossible for it to get a dark button with a light checkbox.</p>
<p>🔵 <b>Participants:</b></p>
<ul><li><b>AbstractFactory</b> — <code>interface ThemeFactory { Button createButton(); Checkbox createCheckbox(); }</code></li>
<li><b>ConcreteFactory</b> — <code>LightThemeFactory</code>, <code>DarkThemeFactory</code></li>
<li><b>AbstractProduct</b> — <code>Button</code>, <code>Checkbox</code></li>
<li><b>ConcreteProduct</b> — <code>DarkButton</code>, <code>LightCheckbox</code>, ...</li>
<li><b>Client</b> — receives a <code>ThemeFactory</code> (usually chosen once at startup from config) and uses only interfaces.</li></ul>
<p><b>The trade-off you must say out loud:</b> adding a new <b>family</b> (a "HighContrast" theme) is easy — one new factory class plus its products, nothing else changes. Adding a new <b>product</b> (a <code>Slider</code>) is hard — the interface and <i>every</i> factory must change. So use Abstract Factory when families grow more often than product types.</p>
<p><b>Abstract Factory vs Factory Method:</b> Factory Method is <i>one</i> method that subclasses override to make <i>one</i> product. Abstract Factory is an <i>object</i> with <i>several</i> creation methods for a <i>family</i>. Inside, each create method of an Abstract Factory is often implemented as a factory method.</p>`,
    clues: [
      '"Support <b>light and dark themes</b> / Windows and Mac widgets" → one factory per theme/platform',
      '"Products must be <b>compatible with each other</b>" or "never mix X with Y" → Abstract Factory guarantees consistency',
      '"Switch the whole app from <b>AWS to GCP</b> (storage + queue + secrets) with one config change"',
      '"Different <b>database vendors</b> need matching connection, dialect and migration tools"',
      '"Production vs <b>test</b> implementations of several collaborators at once" → a TestKit factory',
      '"New families are added often, new product types rarely" → Abstract Factory\'s sweet spot'
    ],
    code: [
      { lang: 'java', title: 'Theme kit: one choice, every widget matches', code: `
// Abstract products
interface Button { String render(); }
interface Checkbox { String render(boolean checked); }

// Concrete products: Light family
class LightButton implements Button {
    public String render() { return "[ OK ] (black text on white)"; }
}
class LightCheckbox implements Checkbox {
    public String render(boolean c) { return (c ? "[x]" : "[ ]") + " (grey border on white)"; }
}

// Concrete products: Dark family
class DarkButton implements Button {
    public String render() { return "[ OK ] (white text on charcoal)"; }
}
class DarkCheckbox implements Checkbox {
    public String render(boolean c) { return (c ? "[x]" : "[ ]") + " (teal border on charcoal)"; }
}

// The ABSTRACT FACTORY: one create method per product type.
interface ThemeFactory {
    Button createButton();
    Checkbox createCheckbox();
}

class LightThemeFactory implements ThemeFactory {
    public Button createButton() { return new LightButton(); }
    public Checkbox createCheckbox() { return new LightCheckbox(); }
}

class DarkThemeFactory implements ThemeFactory {
    public Button createButton() { return new DarkButton(); }
    public Checkbox createCheckbox() { return new DarkCheckbox(); }
}

// Client: knows only interfaces. Cannot mix families by accident.
class SettingsScreen {
    private final Button save;
    private final Checkbox notifications;

    SettingsScreen(ThemeFactory theme) {
        this.save = theme.createButton();
        this.notifications = theme.createCheckbox();
    }

    String draw() { return notifications.render(true) + " | " + save.render(); }
}

public class Main {
    // Pick the family ONCE (from config), usually at startup.
    static ThemeFactory themeFor(String name) {
        return switch (name.toLowerCase()) {
            case "dark" -> new DarkThemeFactory();
            case "light" -> new LightThemeFactory();
            default -> throw new IllegalArgumentException("Unknown theme " + name);
        };
    }

    public static void main(String[] args) {
        System.out.println(new SettingsScreen(themeFor("dark")).draw());
        System.out.println(new SettingsScreen(themeFor("light")).draw());
    }
}` }
    ],
    codeTitle: ['Abstract Factory: theme kit'],
    viz: [
      {
        title: 'One factory, one family: watch the edges stay inside the chosen family',
        input: 'dark',
        inputLabel: 'Theme: light | dark',
        gen: function (input) {
          var t = word(input, ['light', 'dark'], 'Type light or dark');
          var F = t === 'dark' ? 'DF' : 'LF', other = t === 'dark' ? 'LF' : 'DF', pre = t === 'dark' ? 'D' : 'L', Name = t === 'dark' ? 'Dark' : 'Light';
          var nodes = [box('App', 'SettingsScreen', 11, 30), box('LF', 'LightThemeFactory', 42, 12), box('DF', 'DarkThemeFactory', 42, 48),
            box('LB', 'LightButton', 84, 4), box('LC', 'LightCheckbox', 84, 20), box('DB', 'DarkButton', 84, 40), box('DC', 'DarkCheckbox', 84, 56)];
          var edges = [['App', 'LF', 'uses?'], ['App', 'DF', 'uses?'], ['LF', 'LB', 'createButton'], ['LF', 'LC', 'createCheckbox'], ['DF', 'DB', 'createButton'], ['DF', 'DC', 'createCheckbox']];
          function g(hl, ehl, tags, e2) { return { type: 'graph', label: 'Abstract Factory: families (rows) and products', directed: true, height: 62, nodes: nodes, edges: e2 || edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
          var frames = [];
          frames.push({ narr: 'Two <b>families</b>: Light (top) and Dark (bottom). Each concrete factory knows how to make <b>every</b> product of its own family — and nothing from the other.', parts: [g({ LF: 'win', DF: 'win' }, {}, { LF: 'family 1', DF: 'family 2' }), { type: 'grid', label: 'Factory × product matrix', colHead: ['', 'createButton()', 'createCheckbox()'], rowHead: ['LightThemeFactory', 'DarkThemeFactory'], rows: [['LightButton', 'LightCheckbox'], ['DarkButton', 'DarkCheckbox']] }] });
          var h = { App: 'cur' }; h[F] = 'sel'; h[other] = 'done'; var e = {}; e['App-' + F] = 'cur';
          frames.push({ narr: 'Startup reads <code>theme=' + t + '</code> and creates <b>' + Name + 'ThemeFactory</b> once. From now on the screen only holds a <code>ThemeFactory</code> reference; the other family is out of the picture.', parts: [g(h, e), { type: 'vars', label: 'SettingsScreen fields', vals: { theme: 'ThemeFactory (' + Name + ')', save: '-', notifications: '-' }, hl: { theme: 'sel' } }] });
          h = {}; h[F] = 'cur'; h[pre + 'B'] = 'ok'; e = {}; e[F + '-' + pre + 'B'] = 'ok';
          frames.push({ narr: 'Constructor calls <code>theme.createButton()</code> → the ' + t + ' factory returns <b>' + Name + 'Button</b> (typed as <code>Button</code>).', parts: [g(h, e), { type: 'vars', label: 'SettingsScreen fields', vals: { theme: 'ThemeFactory (' + Name + ')', save: Name + 'Button', notifications: '-' }, hl: { save: 'ok' } }] });
          h = {}; h[F] = 'cur'; h[pre + 'B'] = 'sel'; h[pre + 'C'] = 'ok'; e = {}; e[F + '-' + pre + 'C'] = 'ok';
          frames.push({ narr: 'Then <code>theme.createCheckbox()</code> → <b>' + Name + 'Checkbox</b>. Same factory, so same family — consistency is <b>structural</b>, not a matter of developer discipline.', parts: [g(h, e), { type: 'vars', label: 'SettingsScreen fields', vals: { theme: 'ThemeFactory (' + Name + ')', save: Name + 'Button', notifications: Name + 'Checkbox' }, hl: { notifications: 'ok' } }] });
          frames.push({ narr: 'Rendering: both widgets come from the ' + t + ' family. <span class="c-g">Visually consistent screen.</span>', parts: [{ type: 'table', label: 'Rendered widgets', columns: ['Widget', 'Concrete class', 'Family'], rows: [['Save button', Name + 'Button', Name], ['Notifications checkbox', Name + 'Checkbox', Name]], hl: { 0: 'ok', 1: 'ok' } }] });
          var otherPre = pre === 'D' ? 'L' : 'D', otherName = Name === 'Dark' ? 'Light' : 'Dark';
          var bad = [['App', pre + 'B', 'new ' + Name + 'Button()'], ['App', otherPre + 'C', 'new ' + otherName + 'Checkbox()']];
          var bh = { App: 'cur' }; bh[pre + 'B'] = 'ok'; bh[otherPre + 'C'] = 'bad'; var be = {}; be['App-' + otherPre + 'C'] = 'bad';
          frames.push({ narr: '<span class="c-r">Brute force for comparison:</span> the screen calls <code>new</code> directly. One developer wrote <code>new ' + otherName + 'Checkbox()</code> by mistake — it compiles, and the screen ships with a mismatched widget. Nothing in the design prevents it.', parts: [g(bh, be, {}, bad), { type: 'table', label: 'Rendered widgets (naive)', columns: ['Widget', 'Concrete class', 'Family'], rows: [['Save button', Name + 'Button', Name], ['Notifications checkbox', otherName + 'Checkbox', otherName]], hl: { 1: 'bad' } }] });
          frames.push({ narr: 'Switching the whole app to the other theme with Abstract Factory = change <b>one config value</b>. With naive <code>new</code> = hunt every widget creation in every screen.', parts: [g({ App: 'sel' }), note('Abstract Factory guarantees <b>family consistency</b> and makes the family <b>swappable</b> at one point.', 'Takeaway')] });
          return frames;
        }
      },
      {
        title: 'The trade-off: add a family (easy) vs add a product type (touches everything)',
        input: 'product',
        inputLabel: 'What to add: family | product',
        gen: function (input) {
          var what = word(input, ['family', 'product'], 'Type family or product');
          var frames = [];
          var rows = [['LightButton', 'LightCheckbox'], ['DarkButton', 'DarkCheckbox']];
          var rh = ['LightThemeFactory', 'DarkThemeFactory'], ch = ['', 'createButton()', 'createCheckbox()'];
          frames.push({ narr: 'Today: 2 families × 2 products = 4 product classes, 2 factories, 1 factory interface.', parts: [{ type: 'grid', label: 'Factory × product matrix', colHead: ch, rowHead: rh, rows: clone(rows) }, { type: 'vars', label: 'Count', vals: { factories: 2, productTypes: 2, classes: 4 } }] });
          if (what === 'family') {
            frames.push({ narr: 'Add a <b>HighContrast</b> family: one new <b>row</b>. Write <code>HighContrastThemeFactory</code> plus its two products.', parts: [{ type: 'grid', label: 'New row appears', colHead: ch, rowHead: rh.concat(['HighContrastFactory']), rows: rows.concat([['HCButton', 'HCCheckbox']]), hl: { '2,0': 'ok', '2,1': 'ok' } }] });
            frames.push({ narr: 'Which existing files changed? <b>None</b>. The <code>ThemeFactory</code> interface, the Light and Dark factories and every client stay untouched (only the startup switch learns the new name).', parts: [{ type: 'grid', label: 'Existing cells untouched', colHead: ch, rowHead: rh.concat(['HighContrastFactory']), rows: rows.concat([['HCButton', 'HCCheckbox']]), hl: { '0,0': 'done', '0,1': 'done', '1,0': 'done', '1,1': 'done', '2,0': 'ok', '2,1': 'ok' } }, { type: 'vars', label: 'Edits', vals: { newClasses: 3, existingFilesEdited: 1 }, hl: { existingFilesEdited: 'ok' } }] });
            frames.push({ narr: '<span class="c-g">Adding families is cheap.</span> This is exactly the axis Abstract Factory is built to extend (Open/Closed along rows).', parts: [note('Rule of thumb: pick Abstract Factory when you expect <b>more families</b> (themes, vendors, clouds, platforms) more often than <b>more product types</b>.', 'Takeaway')] });
          } else {
            frames.push({ narr: 'Add a <b>Slider</b> product: one new <b>column</b>. The <code>ThemeFactory</code> interface needs <code>createSlider()</code>...', parts: [{ type: 'grid', label: 'New column appears', colHead: ch.concat(['createSlider()']), rowHead: rh, rows: [['LightButton', 'LightCheckbox', 'LightSlider'], ['DarkButton', 'DarkCheckbox', 'DarkSlider']], hl: { '0,2': 'bad', '1,2': 'bad' } }] });
            frames.push({ narr: '...so <b>every</b> concrete factory fails to compile until it implements the new method. With 6 families that is 6 edits plus 6 new slider classes.', parts: [{ type: 'table', label: 'Files you must touch', columns: ['File', 'Change'], rows: [['ThemeFactory.java', 'add createSlider()'], ['LightThemeFactory.java', 'implement it'], ['DarkThemeFactory.java', 'implement it'], ['LightSlider.java', 'new'], ['DarkSlider.java', 'new']], hl: { 0: 'bad', 1: 'bad', 2: 'bad' } }, { type: 'vars', label: 'Edits', vals: { newClasses: 2, existingFilesEdited: 3 }, hl: { existingFilesEdited: 'bad' } }] });
            frames.push({ narr: 'Mitigations: a Java <b>default method</b> in the interface (<code>default Slider createSlider() { return new BasicSlider(); }</code>) lets old factories compile, or split into smaller factories. Still, product-type growth is Abstract Factory\'s weak spot.', parts: [note('Say this trade-off in interviews: "Easy to add families, hard to add product types."', 'Takeaway')] });
          }
          return frames;
        }
      }
    ],
    examples: [
      { title: 'Cross-platform UI (the classic GoF example)', html: `<p>A desktop app runs on Windows and macOS. <code>GuiFactory</code> has <code>createButton()</code>, <code>createMenu()</code>, <code>createScrollbar()</code>. At startup: <code>GuiFactory f = os.startsWith("Mac") ? new MacFactory() : new WinFactory();</code>. Every screen then builds widgets through <code>f</code>, so a Mac menu never appears next to a Windows scrollbar. Java's own Swing used a related idea with pluggable Look-and-Feel (<code>UIManager</code>).</p>` },
      { title: 'Test kit vs production kit', html: `<p>Integration tests need a <b>fake payment gateway</b>, a <b>fake email sender</b> and an <b>in-memory clock</b> — all together. Wrap them in a family: <code>InfraFactory</code> with <code>ProdInfraFactory</code> and <code>TestInfraFactory</code>. One switch flips every collaborator, so you never run a test that charges a real card because one dependency was forgotten.</p>`, code: `
interface Payments { String charge(long cents); }
interface Mailer { String mail(String to); }

interface InfraFactory {
    Payments payments();
    Mailer mailer();
}

class ProdInfra implements InfraFactory {
    public Payments payments() { return cents -> "charged card " + cents; }
    public Mailer mailer() { return to -> "smtp to " + to; }
}

class TestInfra implements InfraFactory {
    public Payments payments() { return cents -> "FAKE charge " + cents; }
    public Mailer mailer() { return to -> "FAKE mail " + to; }
}

class Checkout {
    private final Payments payments;
    private final Mailer mailer;
    Checkout(InfraFactory infra) { payments = infra.payments(); mailer = infra.mailer(); }
    String run() { return payments.charge(999) + " / " + mailer.mail("asha"); }
}

class InfraDemo {
    public static void main(String[] args) {
        System.out.println(new Checkout(new TestInfra()).run());   // both fakes, guaranteed
    }
}` },
      { title: 'Database vendor family (dialect mismatch bug)', html: `<p>A reporting tool supports MySQL and PostgreSQL. Each needs a matching <b>connection URL builder</b>, <b>SQL dialect</b> (<code>LIMIT ?</code> vs <code>FETCH FIRST ? ROWS ONLY</code>, backticks vs double quotes) and <b>migration runner</b>. Without a family factory a developer pairs the Postgres connection with the MySQL dialect and queries fail only at runtime. <code>DatabaseKitFactory</code> with <code>MySqlKit</code> and <code>PostgresKit</code> makes that pairing impossible.</p>` },
      { title: 'Abstract Factory inside the JDK', html: `<p><code>javax.xml.parsers.DocumentBuilderFactory.newInstance()</code> returns a vendor implementation that then creates matching <code>DocumentBuilder</code>s; <code>java.sql.Connection</code> (from a driver) acts as a factory for driver-specific <code>Statement</code>, <code>PreparedStatement</code> and <code>Blob</code> objects that only work with that same connection.</p>` }
    ],
    deepDive: `<p>🟣 <b>How concrete factories are chosen.</b> The family is picked once at a <b>composition root</b>: <code>main()</code>, a DI configuration class (<code>@Configuration</code> with <code>@Profile("aws")</code>), or <code>ServiceLoader</code> discovering a provider on the classpath. The factory itself is usually stateless, so it is commonly a <b>singleton</b> (or a DI singleton bean) — this is the classic "Abstract Factory implemented as a Singleton" combination in GoF.</p>
<p><b>Generic / reflective variant:</b> instead of one method per product, a single <code>&lt;T&gt; T create(Class&lt;T&gt; productType)</code> backed by a <code>Map&lt;Class&lt;?&gt;, Supplier&lt;?&gt;&gt;</code> makes adding products easy but loses compile-time completeness checks: a family can silently miss a product until runtime. A middle ground is a <b>sealed interface</b> family in Java 17+ so the compiler knows every implementation.</p>
<p><b>Family rules beyond types.</b> Sometimes products must also share <i>state</i> — the same AWS region and credentials, the same JDBC connection. Make the concrete factory hold that shared context (<code>new AwsFactory(region, credentials)</code>) and pass it into every product it creates. That is where Abstract Factory clearly beats scattered <code>new</code>s.</p>
<p><b>Combination patterns:</b> Abstract Factory + Prototype (the factory clones configured prototypes instead of hard-coding classes — new families become data, not code), Abstract Factory + Builder (the factory returns pre-configured builders), and Bridge (structural) when abstraction and platform must vary independently.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> asked to "support AWS and GCP", assistants often sprinkle <code>if (provider.equals("aws"))</code> in every service — a family-mismatch bug waiting to happen. Your job is to spot that the problem is a <b>family</b> and centralise it. Conversely, AI may generate Abstract Factories for a single product type, which is just a Factory Method with extra ceremony.</p>
<p><b>Use AI as a partner:</b> <code>List every object in this codebase whose implementation depends on the cloud provider. Group them into families and propose one factory interface. Flag any place that mixes providers.</code> In LLM application code, the same pattern shows up as a <b>model-provider kit</b>: a chat client, an embedding client and a tokenizer that must come from the same vendor/model family — mixing a tokenizer from one model with another model's limits causes subtle truncation bugs. <b>What you must own:</b> stating the families-vs-products trade-off and choosing where the family is selected.</p>`,
    problems: [
      {
        title: 'Cloud Provider Kit (AWS vs GCP)',
        level: 'Medium', tags: ['abstract factory', 'cloud', 'consistency'], companies: ['Microsoft', 'Google', 'Salesforce', 'Razorpay'],
        statement: `<p>An upload service stores a file and then publishes an "uploaded" event. It must run on <b>AWS</b> (S3 + SQS) or <b>GCP</b> (Cloud Storage + Pub/Sub), selected by one config value. Using the two cloud SDKs together (e.g. S3 + Pub/Sub) is forbidden by the security team.</p>
<p>Design interfaces <code>BlobStore</code> (<code>String put(String name, byte[] data)</code> returning a URI) and <code>EventBus</code> (<code>String publish(String topic, String msg)</code>), plus an abstract factory <code>CloudKit</code>. Write <code>UploadService</code> that depends only on the interfaces. Simulate the SDK calls with strings.</p>`,
        constraints: `Exactly one provider per process. Region is shared by all products of a family. Provider names: "aws", "gcp" (case-insensitive). Unknown provider → fail at startup, not at first upload.`,
        example: `<p>Config <code>provider=aws, region=ap-south-1</code>; <code>upload("a.png", 3 bytes)</code> → <span class="c-g">"s3://ap-south-1/a.png"</span> and event <span class="c-g">"sqs[ap-south-1]/uploads: a.png"</span>. With <code>gcp</code> both outputs switch together to <code>gs://</code> and <code>pubsub</code> — never one of each.</p>`,
        brute: {
          why: `<p>The naive service checks the provider string at every call site and calls <code>new</code> on SDK wrappers directly. It is easy to update the storage branch and forget the queue branch, producing an S3 + Pub/Sub mix that violates policy; the region is passed around separately and can drift; and a typo in the provider name fails only on the first upload in production.</p>`,
          code: `
class S3 { String put(String region, String n) { return "s3://" + region + "/" + n; } }
class Gcs { String put(String region, String n) { return "gs://" + region + "/" + n; } }
class Sqs { String send(String region, String m) { return "sqs[" + region + "]/" + m; } }
class PubSub { String send(String region, String m) { return "pubsub[" + region + "]/" + m; } }

class UploadServiceNaive {
    String upload(String provider, String region, String name) {
        String uri = provider.equals("aws") ? new S3().put(region, name) : new Gcs().put(region, name);
        // BUG: someone copy-pasted the wrong condition -- AWS storage + GCP queue
        String evt = provider.equals("gcp") ? new Sqs().send(region, name) : new PubSub().send(region, name);
        return uri + " | " + evt;
    }
}`
        },
        mcq: { q: 'The team later adds Azure. With the Abstract Factory design, what changes?', options: ['Add AzureKit + its two products, and one line in the provider switch', 'Edit UploadService and every other service', 'Add createAzure() to the CloudKit interface', 'Nothing can be added without rewriting'], answer: 0, explain: 'A new family is a new row: new factory and products, no change to clients or the interface.' },
        hints: [
          `<p>Hint 1: the two objects must always come from the same provider — that is the definition of a <b>family</b>. One factory interface with <code>blobStore()</code> and <code>eventBus()</code>.</p>`,
          `<p>Hint 2: give each concrete kit a constructor parameter <code>region</code> and pass it into both products, so shared context cannot drift.</p>`,
          `<p>Hint 3: select the kit once in a static <code>CloudKit.forProvider(name, region)</code> that throws on unknown names, and inject the kit (or its two products) into <code>UploadService</code>.</p>`
        ],
        solution: {
          approach: `<p><b>Abstract Factory with shared family context.</b></p>
<ol><li>Interfaces <code>BlobStore</code> and <code>EventBus</code> are the abstract products.</li>
<li><code>CloudKit</code> is the abstract factory; <code>AwsKit</code> and <code>GcpKit</code> each take a region and create matching products that all use it.</li>
<li><code>CloudKit.forProvider</code> is the single selection point (fails fast at startup).</li>
<li><code>UploadService</code> receives the kit in its constructor, grabs both products once, and never mentions a provider name — so a mixed pair is impossible to write.</li></ol>`,
          code: `
interface BlobStore { String put(String name, byte[] data); }
interface EventBus { String publish(String topic, String msg); }

interface CloudKit {
    BlobStore blobStore();
    EventBus eventBus();

    static CloudKit forProvider(String provider, String region) {
        return switch (provider.toLowerCase(Locale.ROOT)) {
            case "aws" -> new AwsKit(region);
            case "gcp" -> new GcpKit(region);
            default -> throw new IllegalArgumentException("Unsupported provider: " + provider);
        };
    }
}

final class AwsKit implements CloudKit {
    private final String region;                 // shared by every product of this family
    AwsKit(String region) { this.region = region; }
    public BlobStore blobStore() { return (name, data) -> "s3://" + region + "/" + name; }
    public EventBus eventBus() { return (topic, msg) -> "sqs[" + region + "]/" + topic + ": " + msg; }
}

final class GcpKit implements CloudKit {
    private final String region;
    GcpKit(String region) { this.region = region; }
    public BlobStore blobStore() { return (name, data) -> "gs://" + region + "/" + name; }
    public EventBus eventBus() { return (topic, msg) -> "pubsub[" + region + "]/" + topic + ": " + msg; }
}

class UploadService {
    private final BlobStore store;
    private final EventBus bus;

    UploadService(CloudKit kit) {                // both products from ONE family
        this.store = kit.blobStore();
        this.bus = kit.eventBus();
    }

    String upload(String name, byte[] data) {
        String uri = store.put(name, data);
        String evt = bus.publish("uploads", name);
        return uri + " | " + evt;
    }
}

public class Main {
    public static void main(String[] args) {
        CloudKit kit = CloudKit.forProvider("aws", "ap-south-1");   // chosen once at startup
        System.out.println(new UploadService(kit).upload("a.png", new byte[] {1, 2, 3}));
        System.out.println(new UploadService(CloudKit.forProvider("GCP", "asia-south1")).upload("b.png", new byte[0]));
    }
}`,
          complexity: `<p>All operations O(1). Adding a provider: one kit + its products (new row). Adding a product type (e.g. <code>SecretStore</code>): edit the interface and every kit — call out this trade-off.</p>`,
          followUps: ['Add a SecretStore product: how do you avoid breaking every kit at once?', 'How would Spring profiles replace forProvider()?', 'How would you test UploadService without any cloud?']
        }
      }
    ]
  });
  /* ======================================================================
     TOPIC 5 — Builder
     ====================================================================== */
  topics.push({
    title: 'Builder: Assemble Complex Objects Step by Step (No More 9-Argument Constructors)',
    analogy: `<p>At a sandwich counter you do not shout all your choices in one breath in a fixed order. You say: <i>"Wheat bread... add cheese... add olives... no onions... toast it"</i>, and the person behind the counter keeps a <b>half-made sandwich</b> on the tray. Only when you say <b>"wrap it"</b> do you get the finished sandwich — and if you asked for something impossible ("toast a salad"), they tell you right then.</p>
<p>The <b>Builder</b> is that person with the tray: it collects your choices one by one, with names, in any order, then <code>build()</code> checks everything and hands you a <b>finished, unchangeable</b> object.</p>`,
    explain: `<p>🟢 <b>The problem.</b> Objects with many fields — most of them optional — are painful to create:</p>
<ul><li><b>Telescoping constructors</b>: <code>Pizza(size)</code>, <code>Pizza(size, crust)</code>, <code>Pizza(size, crust, cheese)</code>... and the call <code>new Pizza("L", "thin", true, false, true)</code> is unreadable — which <code>true</code> is cheese? Swap two and it still compiles.</li>
<li><b>JavaBeans setters</b>: <code>new Pizza()</code> then <code>setSize()</code>, <code>setCrust()</code>... the object exists in a <b>half-built, invalid</b> state between calls, it must be mutable, and nobody checks rules that involve several fields.</li></ul>
<p>🔵 <b>The Builder recipe (Effective Java style):</b></p>
<ol><li>The product (<code>Pizza</code>) has <b>private final</b> fields and a <b>private</b> constructor that takes a <code>Builder</code>.</li>
<li>A <code>public static class Builder</code> holds the same fields as mutable working copies, with sensible <b>defaults</b>.</li>
<li>Each setter-like method sets one field and <code>return this;</code> — that enables <b>fluent chaining</b>: <code>.size("L").crust("thin")</code>.</li>
<li>Simple per-field checks happen <b>in the setter</b> (fail fast); rules involving <b>several fields</b> run in <code>build()</code>.</li>
<li><code>build()</code> copies everything into a new immutable product (defensive copies of lists!).</li></ol>
${H.table(['Approach', 'Readable call?', 'Valid at all times?', 'Immutable?', 'Cross-field validation'], [
  ['Telescoping constructors', '<span class="c-r">No</span> (positional)', 'Yes', 'Yes', 'Awkward'],
  ['JavaBeans setters', 'Yes', '<span class="c-r">No</span> (half-built)', '<span class="c-r">No</span>', '<span class="c-r">Nowhere natural</span>'],
  ['<b>Builder</b>', '<span class="c-g">Yes</span> (named)', '<span class="c-g">Yes</span> (product only exists after build)', '<span class="c-g">Yes</span>', '<span class="c-g">In build()</span>']
])}
<p><b>Variants you should know:</b> the GoF <b>Director</b> (an object that runs a fixed sequence of builder steps, e.g. "standard margherita"), the <b>step builder</b> (interfaces force required fields in order at compile time), <b>Lombok <code>@Builder</code></b> (generated code), and <code>toBuilder()</code> for "copy this immutable object with one change".</p>
<p><b>Pitfalls:</b> forgetting <code>List.copyOf</code> (the builder's list leaks into the "immutable" product), reusing one builder across threads (builders are <b>not</b> thread-safe), validating nothing in <code>build()</code>, and using a builder for a two-field class (overkill — use a constructor or a record).</p>`,
    clues: [
      '"Object has <b>many optional parameters</b>" or a constructor with 5+ arguments → Builder',
      '"Create an <b>immutable</b> object but configure it step by step" → Builder + private final fields',
      '"Some combinations are <b>invalid</b> (e.g. body only allowed for POST)" → validate in <code>build()</code>',
      '"Readable test data / fixtures" → builders with defaults (Test Data Builder)',
      '"Same construction steps, different representations" (HTML vs PDF report) → GoF Builder + Director',
      '"Required fields must be set before build compiles" → step builder'
    ],
    code: [
      { lang: 'java', title: 'Effective Java Builder with validation and an immutable product', code: `
final class Pizza {
    private final String size;              // required: S, M or L
    private final String crust;
    private final String sauce;
    private final boolean cheese;
    private final List<String> toppings;    // immutable copy

    private Pizza(Builder b) {               // only the Builder can call this
        this.size = b.size;
        this.crust = b.crust;
        this.sauce = b.sauce;
        this.cheese = b.cheese;
        this.toppings = List.copyOf(b.toppings);   // defensive copy -> truly immutable
    }

    static Builder builder() { return new Builder(); }

    @Override public String toString() {
        return size + " " + crust + " pizza, " + sauce + " sauce, cheese=" + cheese + ", toppings=" + toppings;
    }

    static final class Builder {
        private String size;                         // no default: required
        private String crust = "regular";            // sensible defaults
        private String sauce = "tomato";
        private boolean cheese = true;
        private final List<String> toppings = new ArrayList<>();

        private Builder() { }

        Builder size(String s) {
            if (!Set.of("S", "M", "L").contains(s)) throw new IllegalArgumentException("size must be S, M or L");
            this.size = s;
            return this;                             // fluent chaining
        }
        Builder crust(String c) { this.crust = Objects.requireNonNull(c); return this; }
        Builder sauce(String s) { this.sauce = Objects.requireNonNull(s); return this; }
        Builder cheese(boolean c) { this.cheese = c; return this; }
        Builder topping(String t) { this.toppings.add(Objects.requireNonNull(t)); return this; }

        Pizza build() {
            // cross-field rules live here, checked once, before the object exists
            if (size == null) throw new IllegalStateException("size is required");
            if (crust.equals("stuffed") && !size.equals("L")) throw new IllegalStateException("stuffed crust only for L");
            if (toppings.size() > 5) throw new IllegalStateException("max 5 toppings");
            return new Pizza(this);
        }
    }
}

public class Main {
    public static void main(String[] args) {
        Pizza p = Pizza.builder()
            .size("L")
            .crust("thin")
            .topping("olive")
            .topping("corn")
            .build();
        System.out.println(p);

        try {
            Pizza.builder().size("M").crust("stuffed").build();
        } catch (IllegalStateException e) {
            System.out.println("rejected: " + e.getMessage());
        }
    }
}` }
    ],
    codeTitle: ['Builder with validation'],
    viz: [
      {
        title: 'Builder accumulating fields, then build() validates',
        input: 'size=L crust=thin cheese=true topping=olive topping=corn',
        inputLabel: 'Builder calls as key=value (keys: size crust sauce cheese topping)',
        gen: function (input) {
          var toks = tokens(input, 10, 'Example: size=L crust=thin topping=olive');
          var calls = toks.map(function (t) {
            var m = /^(size|crust|sauce|cheese|topping)=([A-Za-z]{1,12})$/.exec(t);
            if (!m) throw new Error('Each item must be key=value with key in size, crust, sauce, cheese, topping (letters only). Bad item: ' + t);
            return [m[1], m[2]];
          });
          var lines = ['Pizza p = Pizza.builder()'];
          calls.forEach(function (c) { lines.push('    .' + c[0] + '(' + (c[0] === 'cheese' ? c[1] : '"' + c[1] + '"') + ')'); });
          lines.push('    .build();');
          var code = lines.join('\n');
          var st = { size: 'null (required)', crust: 'regular', sauce: 'tomato', cheese: 'true', toppings: '[]' }, tops = [];
          var frames = [];
          function vars(h) { return { type: 'vars', label: 'Builder fields (mutable, private)', vals: clone(st), hl: h || {} }; }
          frames.push({ narr: '<code>Pizza.builder()</code> creates an empty <b>Builder</b> with defaults. No Pizza exists yet — so there is no half-built Pizza anyone could misuse.', parts: [{ type: 'code', label: 'Client code', lang: 'java', code: code, hl: { 1: 'cur' } }, vars({ size: 'cur' }), note('Defaults: crust=regular, sauce=tomato, cheese=true. <b>size</b> has no default because it is required.')] });
          for (var i = 0; i < calls.length; i++) {
            var k = calls[i][0], v = calls[i][1], hlLine = one(i + 2, 'cur'), h = {};
            if (k === 'size' && ['S', 'M', 'L'].indexOf(v) < 0) {
              hlLine[i + 2] = 'bad';
              frames.push({ narr: '<code>.size("' + v + '")</code> fails its <b>single-field check</b> immediately: <span class="c-r">IllegalArgumentException: size must be S, M or L</span>. Failing at the setter points straight at the bad line.', parts: [{ type: 'code', label: 'Client code', lang: 'java', code: code, hl: hlLine }, vars({ size: 'bad' })] });
              frames.push({ narr: 'The chain stops; <code>build()</code> never runs, and no invalid Pizza is ever created.', parts: [note('Fix the input (size must be S, M or L) and run again.', 'Result')] });
              frames.push({ narr: 'Two layers of validation: <b>setters</b> reject a single bad value at once (clear stack trace), <b>build()</b> rejects bad <i>combinations</i> once all values are known.', parts: [{ type: 'table', label: 'Where each check lives', columns: ['Check', 'Where', 'Exception'], rows: [['size is S/M/L', 'size() setter', 'IllegalArgumentException'], ['size was set at all', 'build()', 'IllegalStateException'], ['stuffed crust only on L', 'build()', 'IllegalStateException'], ['at most 5 toppings', 'build()', 'IllegalStateException']], hl: { 0: 'bad' } }] });
              return frames;
            }
            if (k === 'cheese' && ['true', 'false'].indexOf(v) < 0) throw new Error('cheese must be true or false');
            if (k === 'topping') { tops.push(v); st.toppings = '[' + tops.join(', ') + ']'; h.toppings = 'ok'; }
            else { var old = st[k]; st[k] = v; h[k] = 'ok'; }
            frames.push({ narr: '<code>.' + k + '(' + v + ')</code> ' + (k === 'topping' ? 'appends <b>' + v + '</b> to the toppings list (topping can be called many times).' : 'sets <b>' + k + '</b> from <i>' + old + '</i> to <b>' + v + '</b>.') + ' It returns <code>this</code>, so the next call chains on the same builder.', parts: [{ type: 'code', label: 'Client code', lang: 'java', code: code, hl: hlLine }, vars(h)] });
          }
          var bl = lines.length, errs = [];
          if (st.size.indexOf('null') === 0) errs.push('size is required');
          if (st.crust === 'stuffed' && st.size !== 'L') errs.push('stuffed crust only for L');
          if (tops.length > 5) errs.push('max 5 toppings');
          frames.push({ narr: '<code>.build()</code> runs the <b>cross-field rules</b>: size present? stuffed crust only on L? at most 5 toppings?', parts: [{ type: 'code', label: 'Client code', lang: 'java', code: code, hl: one(bl, 'cur') }, { type: 'table', label: 'build() validation', columns: ['Rule', 'Result'], rows: [['size is set', st.size.indexOf('null') === 0 ? 'FAIL' : 'ok'], ['stuffed crust only when size = L', st.crust === 'stuffed' && st.size !== 'L' ? 'FAIL' : 'ok'], ['toppings ≤ 5 (have ' + tops.length + ')', tops.length > 5 ? 'FAIL' : 'ok']], hl: { 0: st.size.indexOf('null') === 0 ? 'bad' : 'ok', 1: st.crust === 'stuffed' && st.size !== 'L' ? 'bad' : 'ok', 2: tops.length > 5 ? 'bad' : 'ok' } }] });
          if (errs.length) {
            frames.push({ narr: '<span class="c-r">IllegalStateException: ' + errs[0] + '</span>. The product is never created, so no code can ever observe an invalid Pizza.', parts: [{ type: 'code', label: 'Client code', lang: 'java', code: code, hl: one(bl, 'bad') }, vars({})] });
            return frames;
          }
          frames.push({ narr: 'All rules pass: <code>new Pizza(this)</code> copies the fields into <b>final</b> fields and the list via <code>List.copyOf</code>. <span class="c-g">An immutable, valid Pizza now exists.</span>', parts: [{ type: 'code', label: 'Client code', lang: 'java', code: code, hl: one(bl, 'ok') }, { type: 'table', label: 'Pizza (immutable product)', columns: ['field', 'value'], rows: [['size', st.size], ['crust', st.crust], ['sauce', st.sauce], ['cheese', st.cheese], ['toppings', st.toppings]], hl: { 0: 'sel', 1: 'sel', 2: 'sel', 3: 'sel', 4: 'sel' } }] });
          frames.push({ narr: 'Why the defensive copy matters: if someone keeps the builder and calls <code>.topping("ham")</code> again, the <b>already built</b> Pizza does not change. The product has no setters and its list is unmodifiable.', parts: [{ type: 'vars', label: 'After build: builder vs product', vals: { 'builder.toppings': '[' + tops.concat(['ham']).join(', ') + ']', 'pizza.toppings': st.toppings }, hl: { 'builder.toppings': 'cur', 'pizza.toppings': 'ok' } }] });
          return frames;
        }
      },
      {
        title: 'Telescoping constructor vs JavaBeans vs Builder',
        gen: function () {
          var tele = 'Pizza(String size)\nPizza(String size, String crust)\nPizza(String size, String crust, String sauce)\nPizza(String size, String crust, String sauce, boolean cheese)\nPizza(String size, String crust, String sauce, boolean cheese, boolean extraCheese, boolean glutenFree)';
          return [
            { narr: 'Brute force #1: <b>telescoping constructors</b> — one overload per extra parameter. Five constructors for six fields, and it keeps growing.', parts: [{ type: 'code', label: 'Overloads', lang: 'java', code: tele, hl: { 5: 'bad' } }] },
            { narr: 'Read this call: <code>new Pizza("L", "thin", "tomato", true, false, true)</code>. Which boolean is gluten-free? You must open the class to know. Swap two booleans and it <b>still compiles</b> — the bug ships.', parts: [{ type: 'table', label: 'Positional arguments', columns: ['Position', 'Value', 'Meaning'], rows: [['1', '"L"', 'size'], ['2', '"thin"', 'crust'], ['3', '"tomato"', 'sauce'], ['4', 'true', 'cheese?'], ['5', 'false', 'extraCheese?'], ['6', 'true', 'glutenFree?']], hl: { 3: 'bad', 4: 'bad', 5: 'bad' } }] },
            { narr: 'Brute force #2: <b>JavaBeans</b> — <code>new Pizza()</code> then setters. Between lines the object is <span class="c-r">half-built</span>: another thread (or an exception) can see a Pizza with no size.', parts: [{ type: 'code', label: 'Setters', lang: 'java', code: 'Pizza p = new Pizza();\np.setCrust("stuffed");   // p is visible, size == null!\np.setSize("M");          // stuffed + M is invalid, nobody checks\np.addTopping("olive");', hl: { 2: 'bad', 3: 'bad' } }, { type: 'vars', label: 'p right after line 2', vals: { size: 'null', crust: 'stuffed', valid: false }, hl: { size: 'bad', valid: 'bad' } }] },
            { narr: '<b>Builder</b>: named steps (readable), any order, defaults for the rest, one validation point, and the Pizza only exists after <code>build()</code> succeeds.', parts: [{ type: 'code', label: 'Builder', lang: 'java', code: 'Pizza p = Pizza.builder()\n    .size("L")\n    .crust("thin")\n    .glutenFree(true)\n    .build();', hl: { 2: 'ok', 3: 'ok', 4: 'ok', 5: 'sel' } }] },
            { narr: 'Summary: Builder costs one extra nested class, but buys readability, immutability and validation. Use it from roughly <b>4+ parameters</b> or whenever there are optional fields with rules.', parts: [{ type: 'table', label: 'Comparison', columns: ['Approach', 'Readable', 'Never half-built', 'Immutable', 'Validates combos'], rows: [['Telescoping', 'no', 'yes', 'yes', 'awkward'], ['JavaBeans', 'yes', 'no', 'no', 'no'], ['Builder', 'yes', 'yes', 'yes', 'yes']], hl: { 2: 'ok' } }] }
          ];
        }
      }
    ],
    examples: [
      { title: 'The JDK HttpRequest builder', html: `<p><code>java.net.http.HttpRequest</code> (Java 11+) is built with a fluent builder: required URI, optional headers (repeatable), method with body, timeout. <code>build()</code> returns an immutable request you can safely reuse across threads. <code>HttpClient.newBuilder()</code> works the same way.</p>`, code: `
import java.net.URI;
import java.net.http.HttpRequest;

class HttpBuilderDemo {
    public static void main(String[] args) {
        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create("https://api.example.com/orders"))
            .header("Authorization", "Bearer token-123")
            .header("Accept", "application/json")
            .timeout(Duration.ofSeconds(5))
            .POST(HttpRequest.BodyPublishers.ofString("{\\"item\\":42}"))
            .build();
        System.out.println(req.method() + " " + req.uri() + " " + req.headers().map());
    }
}` },
      { title: 'Director: reusable recipes on top of a builder', html: `<p>The GoF <b>Director</b> owns a <i>sequence</i> of builder calls so common configurations are not copy-pasted. A cafe has "Margherita" and "Veggie Supreme" presets; the director drives the same builder, and callers can still tweak before <code>build()</code>.</p>`, code: `
class Meal {
    final List<String> items;
    Meal(List<String> items) { this.items = List.copyOf(items); }
    public String toString() { return String.join(" + ", items); }
}

class MealBuilder {
    private final List<String> items = new ArrayList<>();
    MealBuilder main(String m) { items.add(m); return this; }
    MealBuilder side(String s) { items.add(s); return this; }
    MealBuilder drink(String d) { items.add(d); return this; }
    Meal build() {
        if (items.isEmpty()) throw new IllegalStateException("empty meal");
        return new Meal(items);
    }
}

class MealDirector {                       // knows the recipes, not the representation
    MealBuilder kidsCombo() { return new MealBuilder().main("mini burger").side("apple slices").drink("milk"); }
    MealBuilder valueCombo() { return new MealBuilder().main("burger").side("fries").drink("cola"); }
}

class DirectorDemo {
    public static void main(String[] args) {
        MealDirector d = new MealDirector();
        System.out.println(d.kidsCombo().build());
        System.out.println(d.valueCombo().drink("extra water").build());   // tweak before build
    }
}` },
      { title: 'toBuilder(): copy an immutable object with one change', html: `<p>Immutable objects cannot be edited, so "change the timeout" means "make a copy with a new timeout". A <code>toBuilder()</code> pre-fills a builder from the existing object — clean and safe. Records give you immutability for free; adding a small builder to a record is common when it has many optional components.</p>`, code: `
record RetryPolicy(int maxAttempts, long backoffMs, boolean jitter) {
    RetryPolicy {
        if (maxAttempts < 1) throw new IllegalArgumentException("maxAttempts >= 1");
    }

    Builder toBuilder() { return new Builder().maxAttempts(maxAttempts).backoffMs(backoffMs).jitter(jitter); }

    static final class Builder {
        private int maxAttempts = 3;
        private long backoffMs = 200;
        private boolean jitter = true;
        Builder maxAttempts(int v) { maxAttempts = v; return this; }
        Builder backoffMs(long v) { backoffMs = v; return this; }
        Builder jitter(boolean v) { jitter = v; return this; }
        RetryPolicy build() { return new RetryPolicy(maxAttempts, backoffMs, jitter); }
    }
}

class RetryDemo {
    public static void main(String[] args) {
        RetryPolicy base = new RetryPolicy.Builder().build();
        RetryPolicy aggressive = base.toBuilder().maxAttempts(10).build();
        System.out.println(base + " -> " + aggressive);
    }
}` },
      { title: 'Test Data Builders keep tests readable', html: `<p>Tests that need a <code>User</code> with 15 fields become noise. A builder with valid defaults lets each test state only what matters: <code>aUser().withAge(17).build()</code> for the "minors cannot buy" test. Readers instantly see the one field under test.</p>` }
    ],
    deepDive: `<p>🟣 <b>Step builder (type-safe required fields).</b> Return a different interface from each required step — <code>builder().to(..)</code> returns <code>SubjectStep</code>, whose only method <code>subject(..)</code> returns <code>OptionalStep</code> with <code>cc()</code>, <code>body()</code> and <code>build()</code>. Forgetting a required field becomes a <b>compile error</b> instead of a runtime exception. The cost is more interfaces; use it for public APIs with critical required fields.</p>
<p><b>Generic hierarchical builders.</b> When products have a class hierarchy, builders use a recursive generic <code>abstract static class Builder&lt;T extends Builder&lt;T&gt;&gt;</code> with an abstract <code>self()</code> method so parent setters return the child builder type (Effective Java Item 2's <code>NyPizza</code>/<code>Calzone</code> example).</p>
<p><b>Immutability details.</b> Copy collections with <code>List.copyOf</code>/<code>Map.copyOf</code> (these also reject <code>null</code> elements). Validate <b>after</b> copying in the product constructor if the builder could be mutated by another thread between check and copy (time-of-check/time-of-use). Builders are cheap, short-lived objects; escape analysis often removes their allocation entirely.</p>
<p><b>Tooling.</b> Lombok's <code>@Builder</code> (with <code>toBuilder = true</code>, <code>@Singular</code> for collections, <code>@Builder.Default</code> for defaults), Immutables and AutoValue generate builders. Records do not have builders built in; for records with a few fields, a canonical constructor with validation is enough. <b>GoF's original Builder</b> was about the <i>same construction process producing different representations</i> (e.g. a document converter building RTF, TeX or plain text); the Effective Java builder is about readable, safe construction — know both meanings.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> writing builder boilerplate is now free (and Lombok already made it free). What still goes wrong in AI-generated builders: <b>no validation</b> in <code>build()</code>, lists passed through without copying, setters left on the product "for convenience", and builders for two-field classes. Review for those four things.</p>
<p><b>Use AI as a partner:</b> <code>Generate a Builder for this class. Required: url, method. Rules: body only for POST/PUT, timeout 1-60s. Make the product immutable and write tests for every rule.</code> Then read the tests — they reveal whether the rules were understood. In LLM apps, request objects to model APIs (messages, tools, temperature, max tokens, stop sequences) are classic builder territory: many optional fields with cross-field rules. <b>What you must own:</b> deciding which fields are required, which defaults are safe, and which combinations are illegal — that is domain knowledge, not boilerplate.</p>`,
    problems: [
      {
        title: 'Build an Immutable ApiRequest',
        level: 'Medium', tags: ['builder', 'immutability', 'validation'], companies: ['Google', 'Stripe', 'PhonePe', 'Adobe'],
        statement: `<p>Design <code>ApiRequest</code> for an internal HTTP library:</p>
<ul><li>Required: <code>url</code> (must start with <code>http://</code> or <code>https://</code>) and <code>method</code> (GET, POST, PUT, DELETE).</li>
<li>Optional: any number of headers (same header name may repeat), query params, <code>timeoutSeconds</code> (default 30, allowed 1-120), <code>body</code>.</li>
<li>Rule: a body is allowed only for POST and PUT; POST and PUT <b>require</b> a body.</li>
<li>The built request must be <b>immutable</b>: changing the builder afterwards must not affect it, and its header map cannot be modified.</li></ul>`,
        constraints: `Up to 50 headers and 50 query params. Invalid single values throw <code>IllegalArgumentException</code> immediately; invalid combinations throw <code>IllegalStateException</code> from <code>build()</code>.`,
        example: `<p><code>ApiRequest.builder("https://api.shop.com/orders", "POST").header("X-Trace", "a1").query("page", "2").body("{}").build()</code> → <span class="c-g">POST https://api.shop.com/orders?page=2 headers={X-Trace=[a1]} timeout=30s</span>.<br><code>builder(url, "GET").body("x").build()</code> → <span class="c-r">IllegalStateException: GET cannot have a body</span>.</p>`,
        brute: {
          why: `<p>The naive class exposes a public no-arg constructor plus setters, or a pile of overloaded constructors. Callers forget the method, set a body on GET, or pass arguments in the wrong order; the object is mutable, so a request shared between threads can change under them. Validation either does not exist or is duplicated in every caller.</p>`,
          code: `
class ApiRequestNaive {
    public String url, method, body;
    public Map<String, String> headers = new HashMap<>();   // repeated headers lost, mutable
    public int timeoutSeconds;                                // default 0 = no timeout?!

    public ApiRequestNaive() { }
    public ApiRequestNaive(String url) { this.url = url; }
    public ApiRequestNaive(String url, String method) { this(url); this.method = method; }
    public ApiRequestNaive(String url, String method, String body) { this(url, method); this.body = body; }
}`
        },
        mcq: { q: 'Where should the rule "GET cannot have a body" be checked?', options: ['In build(), because it involves two fields (method and body)', 'In the body() setter', 'In the method() setter', 'In every caller'], answer: 0, explain: 'Cross-field rules belong in build(): the builder methods can be called in any order, so only build() sees the final combination.' },
        hints: [
          `<p>Hint 1: required fields go into the <code>builder(url, method)</code> factory so they can never be missing; everything else gets a default.</p>`,
          `<p>Hint 2: store headers as <code>Map&lt;String, List&lt;String&gt;&gt;</code> in a <code>LinkedHashMap</code> (keeps order, supports repeats). In the product, deep-copy it: copy each list with <code>List.copyOf</code>, then the map with <code>Map.copyOf</code> or wrap unmodifiably.</p>`,
          `<p>Hint 3: per-field checks in setters (url scheme, method name, timeout range), combination checks in <code>build()</code> (body vs method). Write a <code>toString</code> that prints the final URL with query params so tests are easy.</p>`
        ],
        solution: {
          approach: `<p><b>Builder with required-args entry point + two validation layers + deep immutability.</b></p>
<ol><li><code>ApiRequest.builder(url, method)</code> validates and stores the two required values.</li>
<li>Optional methods (<code>header</code>, <code>query</code>, <code>timeoutSeconds</code>, <code>body</code>) validate their own input and return <code>this</code>.</li>
<li><code>build()</code> checks the body/method combination, then calls the private constructor.</li>
<li>The constructor deep-copies headers (each list, then the map) and query params, so later builder changes cannot leak in and the maps are unmodifiable.</li></ol>`,
          code: `
final class ApiRequest {
    private final String url, method, body;
    private final int timeoutSeconds;
    private final Map<String, List<String>> headers;
    private final Map<String, String> query;

    private ApiRequest(Builder b) {
        this.url = b.url;
        this.method = b.method;
        this.body = b.body;
        this.timeoutSeconds = b.timeoutSeconds;
        Map<String, List<String>> h = new LinkedHashMap<>();
        b.headers.forEach((k, v) -> h.put(k, List.copyOf(v)));          // deep copy
        this.headers = Collections.unmodifiableMap(h);
        this.query = Collections.unmodifiableMap(new LinkedHashMap<>(b.query));
    }

    static Builder builder(String url, String method) { return new Builder(url, method); }

    Map<String, List<String>> headers() { return headers; }

    @Override public String toString() {
        StringBuilder full = new StringBuilder(url);
        String sep = "?";
        for (Map.Entry<String, String> e : query.entrySet()) {
            full.append(sep).append(e.getKey()).append('=').append(e.getValue());
            sep = "&";
        }
        return method + " " + full + " headers=" + headers + " timeout=" + timeoutSeconds + "s"
            + (body == null ? "" : " body=" + body);
    }

    static final class Builder {
        private static final Set<String> METHODS = Set.of("GET", "POST", "PUT", "DELETE");
        private final String url, method;
        private String body;
        private int timeoutSeconds = 30;
        private final Map<String, List<String>> headers = new LinkedHashMap<>();
        private final Map<String, String> query = new LinkedHashMap<>();

        private Builder(String url, String method) {
            if (url == null || !(url.startsWith("http://") || url.startsWith("https://")))
                throw new IllegalArgumentException("url must start with http:// or https://");
            String m = method == null ? "" : method.toUpperCase(Locale.ROOT);
            if (!METHODS.contains(m)) throw new IllegalArgumentException("unsupported method " + method);
            this.url = url;
            this.method = m;
        }

        Builder header(String name, String value) {
            headers.computeIfAbsent(Objects.requireNonNull(name), k -> new ArrayList<>()).add(Objects.requireNonNull(value));
            return this;
        }

        Builder query(String name, String value) { query.put(Objects.requireNonNull(name), Objects.requireNonNull(value)); return this; }

        Builder timeoutSeconds(int s) {
            if (s < 1 || s > 120) throw new IllegalArgumentException("timeout must be 1-120 seconds");
            this.timeoutSeconds = s;
            return this;
        }

        Builder body(String b) { this.body = Objects.requireNonNull(b); return this; }

        ApiRequest build() {
            boolean needsBody = method.equals("POST") || method.equals("PUT");
            if (needsBody && body == null) throw new IllegalStateException(method + " requires a body");
            if (!needsBody && body != null) throw new IllegalStateException(method + " cannot have a body");
            return new ApiRequest(this);
        }
    }
}

public class Main {
    public static void main(String[] args) {
        ApiRequest.Builder b = ApiRequest.builder("https://api.shop.com/orders", "post")
            .header("X-Trace", "a1").query("page", "2").body("{}");
        ApiRequest req = b.build();
        b.header("X-Trace", "LEAK?");                     // must not affect req
        System.out.println(req);
        try {
            ApiRequest.builder("https://api.shop.com/orders", "GET").body("x").build();
        } catch (IllegalStateException e) {
            System.out.println("rejected: " + e.getMessage());
        }
    }
}`,
          complexity: `<p>Each builder call O(1) amortised; <code>build()</code> O(H + Q) to copy H headers and Q query params. Memory O(H + Q).</p>`,
          followUps: ['Turn url/method into a compile-time step builder', 'Add toBuilder() so a retry can change only the timeout', 'How would you URL-encode query values safely?']
        }
      }
    ]
  });
  /* ======================================================================
     TOPIC 6 — Prototype
     ====================================================================== */
  topics.push({
    title: 'Prototype: Make New Objects by Copying a Configured One (Shallow vs Deep)',
    analogy: `<p>Your office needs 30 copies of a long form that is already <b>filled in</b> except for the employee name. Nobody re-types 40 fields thirty times: you <b>photocopy</b> the filled form and just write a different name on each copy.</p>
<p>The <b>Prototype</b> pattern is that photocopier. Keep one carefully prepared object (the prototype), and when you need another, <b>copy</b> it and tweak the few differences. The catch: if the original has a sticky note attached (a shared list or object), a lazy copier copies the <i>pointer</i> to the sticky note, not the note — so writing on one copy's note changes everyone's. That is <b>shallow vs deep copy</b>.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Instead of <code>new Enemy(...)</code> with 20 arguments, an expensive asset load and an AI behaviour tree, you keep one fully set-up <code>orcPrototype</code> and call <code>orcPrototype.copy()</code>. Each copy starts identical, then you change its position or name.</p>
<p><b>When Prototype fits:</b></p>
<ul><li>Creating from scratch is <b>expensive</b> (parsing files, DB reads, heavy computation) but copying is cheap.</li>
<li>You need many objects that differ only a little from a <b>template</b>.</li>
<li>The concrete class is only known at <b>runtime</b> (you hold a <code>Shape</code> and want "another one of whatever this is").</li>
<li>You want to configure "kinds" as <b>data</b>: a <b>prototype registry</b> maps <code>"orc"</code>, <code>"archer"</code> to prototypes — new kinds without new classes.</li></ul>
<p>🔵 <b>Shallow vs deep copy</b> — the heart of this topic:</p>
${H.table(['Field type', 'Shallow copy does', 'Deep copy does', 'Safe to share?'], [
  ['primitive (<code>int health</code>)', 'copies the value', 'copies the value', '<span class="c-g">Yes</span>'],
  ['immutable object (<code>String</code>, <code>Integer</code>, records of immutables)', 'copies the reference', 'copies the reference (fine)', '<span class="c-g">Yes</span>'],
  ['mutable object (<code>List</code>, <code>Position</code>, arrays)', 'copies the <b>reference</b> → both share it', 'creates a <b>new</b> copy of it', '<span class="c-r">No</span> — must deep copy']
])}
<p><b>How to copy in Java:</b></p>
<ol><li><b>Copy constructor / copy method (preferred)</b>: <code>Enemy(Enemy other)</code> or <code>copy()</code> — explicit, works with <code>final</code> fields, no checked exceptions.</li>
<li><b><code>Cloneable</code> + <code>Object.clone()</code></b>: built-in, but <b>shallow</b> by default, bypasses constructors, clashes with <code>final</code> fields, needs a cast and a <code>CloneNotSupportedException</code> dance. Joshua Bloch calls the design broken; use it mainly for <b>arrays</b> (<code>int[] b = a.clone()</code>, which is fine for 1D primitive arrays).</li>
<li><b>Serialization round-trip</b>: deep but slow and fragile — avoid in hot paths.</li></ol>
<p><b>Pitfalls:</b> shallow-copying mutable fields (the classic bug), deep-copying things that <i>should</i> be shared (a reference to a big immutable texture or a shared service), cycles in object graphs (need an identity map while copying), and forgetting that a copy of an object holding a DB connection should probably <i>not</i> copy the connection.</p>`,
    clues: [
      '"Create many <b>similar</b> objects from a template" / "spawn N enemies of type X" → Prototype + registry',
      '"Object creation is <b>expensive</b> (loading, parsing, DB) but objects are similar" → copy instead of rebuild',
      '"Clone this object" / "duplicate document" / "copy-paste in an editor" → copy method with deep-copy rules',
      '"Changing the copy also changed the original" → shallow copy bug, deep-copy the mutable fields',
      '"Add new kinds as <b>configuration</b>, not new classes" → prototype registry keyed by name',
      '"Why not just implement Cloneable?" → explain clone() pitfalls, prefer copy constructors'
    ],
    code: [
      { lang: 'java', title: 'Copy constructor + prototype registry (deep copy of mutable parts)', code: `
final class Position {
    int x, y;                                         // mutable on purpose
    Position(int x, int y) { this.x = x; this.y = y; }
    Position(Position p) { this(p.x, p.y); }          // copy constructor
    public String toString() { return "(" + x + "," + y + ")"; }
}

final class Enemy {
    private final String kind;                        // immutable -> sharing is fine
    private int health;                               // primitive -> copied by value
    private final List<String> loot;                  // mutable -> must be deep-copied
    private final Position pos;                       // mutable -> must be deep-copied

    Enemy(String kind, int health, List<String> loot, Position pos) {
        // Imagine expensive work here: loading a model, building an AI tree...
        this.kind = kind;
        this.health = health;
        this.loot = new ArrayList<>(loot);
        this.pos = new Position(pos);
    }

    private Enemy(Enemy other) {                      // the prototype copy path
        this.kind = other.kind;
        this.health = other.health;
        this.loot = new ArrayList<>(other.loot);       // new list, same immutable Strings
        this.pos = new Position(other.pos);            // new Position
    }

    Enemy copy() { return new Enemy(this); }

    Enemy at(int x, int y) { pos.x = x; pos.y = y; return this; }
    void addLoot(String item) { loot.add(item); }
    public String toString() { return kind + " hp=" + health + " loot=" + loot + " at " + pos; }
}

final class EnemyRegistry {
    private final Map<String, Enemy> prototypes = new HashMap<>();

    void register(String key, Enemy prototype) { prototypes.put(key, prototype); }

    Enemy spawn(String key) {
        Enemy proto = prototypes.get(key);
        if (proto == null) throw new IllegalArgumentException("No prototype for " + key);
        return proto.copy();                           // cheap copy instead of expensive build
    }
}

public class Main {
    public static void main(String[] args) {
        EnemyRegistry registry = new EnemyRegistry();
        registry.register("orc", new Enemy("Orc", 120, List.of("axe"), new Position(0, 0)));
        registry.register("archer", new Enemy("Archer", 70, List.of("bow", "arrows"), new Position(0, 0)));

        Enemy a = registry.spawn("orc").at(5, 2);
        Enemy b = registry.spawn("orc").at(9, 4);
        a.addLoot("gold");                              // only a changes
        System.out.println(a);
        System.out.println(b);
        System.out.println(registry.spawn("archer"));
    }
}` },
      { lang: 'java', title: 'Cloneable: shallow by default, and how to deep-fix it', code: `
class Document implements Cloneable {
    String title;
    List<String> pages = new ArrayList<>();

    Document(String title) { this.title = title; }

    // Shallow: Object.clone copies field values -> 'pages' reference is SHARED.
    @Override public Document clone() {
        try {
            return (Document) super.clone();
        } catch (CloneNotSupportedException e) {
            throw new AssertionError("cannot happen: we implement Cloneable", e);
        }
    }

    Document deepClone() {
        Document d = clone();
        d.pages = new ArrayList<>(pages);    // replace shared list with a private copy
        return d;
    }
}

class CloneDemo {
    public static void main(String[] args) {
        Document original = new Document("Spec");
        original.pages.add("intro");

        Document shallow = original.clone();
        shallow.pages.add("SURPRISE");
        System.out.println(original.pages);   // [intro, SURPRISE]  <- bug

        Document deep = original.deepClone();
        deep.pages.add("only in deep");
        System.out.println(original.pages);   // unchanged by deep copy

        int[] scores = {3, 1, 2};
        int[] copy = scores.clone();            // arrays: clone() is the idiomatic copy
        copy[0] = 99;
        System.out.println(scores[0]);          // 3
    }
}` }
    ],
    codeTitle: ['Prototype with copy constructor + registry', 'Cloneable shallow vs deep'],
    viz: [
      {
        title: 'Shallow vs deep copy: who shares the loot list?',
        input: 'shallow',
        inputLabel: 'Copy style: shallow | deep',
        gen: function (input) {
          var mode = word(input, ['shallow', 'deep'], 'Type shallow or deep');
          var deep = mode === 'deep';
          var frames = [];
          var baseNodes = [box('o', 'orc #1 (prototype)', 16, 10), box('L1', 'loot list A', 58, 10), box('P1', 'Position A', 58, 26)];
          var baseEdges = [['o', 'L1', 'loot'], ['o', 'P1', 'pos']];
          frames.push({ narr: 'The prototype <b>orc #1</b> owns a mutable <b>loot list</b> and a mutable <b>Position</b>. Arrows are references (pointers) held in its fields.', parts: [{ type: 'graph', label: 'Heap', directed: true, height: 58, nodes: baseNodes, edges: baseEdges, hl: { o: 'sel' } }, { type: 'vars', label: 'orc #1 fields', vals: { kind: '"Orc"', health: 120, loot: '→ list A [axe]', pos: '→ Position A (0,0)' } }] });
          var cn = [box('c', 'orc #2 (copy)', 16, 46)], ce, ch = {};
          if (deep) {
            cn.push(box('L2', 'loot list B', 58, 42), box('P2', 'Position B', 58, 54));
            ce = [['c', 'L2', 'loot'], ['c', 'P2', 'pos']];
            ch = { c: 'ok', L2: 'ok', P2: 'ok' };
          } else {
            ce = [['c', 'L1', 'loot'], ['c', 'P1', 'pos']];
            ch = { c: 'ok', L1: 'win', P1: 'win' };
          }
          frames.push({ narr: deep ? '<b>Deep copy</b>: the copy constructor creates <b>new</b> list B and <b>new</b> Position B with the same contents. Each object owns its own mutable parts.' : '<b>Shallow copy</b> (<code>super.clone()</code>): field values are copied — and for object fields the value <i>is the reference</i>. Both orcs now point at the <b>same</b> list A and Position A.', parts: [{ type: 'graph', label: 'Heap after copy', directed: true, height: 58, nodes: baseNodes.concat(cn), edges: baseEdges.concat(ce), hl: ch }, { type: 'vars', label: 'orc #2 fields', vals: { kind: '"Orc" (shared, immutable: fine)', health: 120, loot: deep ? '→ list B' : '→ list A (SHARED)', pos: deep ? '→ Position B' : '→ Position A (SHARED)' }, hl: { loot: deep ? 'ok' : 'bad', pos: deep ? 'ok' : 'bad' } }] });
          frames.push({ narr: 'Change a <b>primitive</b> on the copy: <code>copy.health = 50</code>. Primitives are copied by value, so the prototype keeps 120 in <b>both</b> styles.', parts: [{ type: 'table', label: 'health', columns: ['object', 'health'], rows: [['orc #1 (prototype)', '120'], ['orc #2 (copy)', '50']], hl: { 1: 'ok' } }] });
          var e2 = {}; e2[deep ? 'c-L2' : 'c-L1'] = 'cur';
          var h2 = deep ? { L2: 'ok', L1: 'done' } : { L1: 'bad', o: 'bad' };
          frames.push({ narr: 'Now <code>copy.addLoot("gold")</code>. ' + (deep ? 'It goes into list B. The prototype\'s list A is untouched. <span class="c-g">Correct.</span>' : 'It goes into list A — which the <b>prototype also uses</b>. <span class="c-r">Every future orc spawned from this prototype now carries gold.</span>'), parts: [{ type: 'graph', label: 'Heap', directed: true, height: 58, nodes: baseNodes.concat(cn), edges: baseEdges.concat(ce), hl: h2, ehl: e2 }, { type: 'table', label: 'loot as seen by each object', columns: ['object', 'loot'], rows: [['orc #1 (prototype)', deep ? '[axe]' : '[axe, gold]'], ['orc #2 (copy)', '[axe, gold]']], hl: deep ? { 1: 'ok' } : { 0: 'bad', 1: 'cur' } }] });
          frames.push({ narr: 'Move the copy: <code>copy.at(9, 4)</code>. ' + (deep ? 'Only Position B changes.' : 'Position A is shared, so the prototype "teleports" too — a classic game bug.'), parts: [{ type: 'table', label: 'positions', columns: ['object', 'pos'], rows: [['orc #1 (prototype)', deep ? '(0,0)' : '(9,4)'], ['orc #2 (copy)', '(9,4)']], hl: deep ? { 1: 'ok' } : { 0: 'bad' } }] });
          frames.push({ narr: 'Rule: copy <b>primitives</b> and <b>immutable</b> references as-is; create <b>new</b> instances of every <b>mutable</b> field (recursively). Copy constructors make that explicit; <code>Object.clone()</code> makes shallow the silent default.', parts: [{ type: 'table', label: 'Summary', columns: ['field', 'shallow', 'deep'], rows: [['int health', 'independent', 'independent'], ['String kind', 'shared (ok, immutable)', 'shared (ok)'], ['List loot', 'SHARED (bug)', 'independent'], ['Position pos', 'SHARED (bug)', 'independent']], hl: { 2: deep ? 'ok' : 'bad', 3: deep ? 'ok' : 'bad' } }] });
          return frames;
        }
      },
      {
        title: 'Prototype registry: spawn by copying instead of building',
        input: 'orc orc archer orc',
        inputLabel: 'Spawn order (orc | archer | dragon), up to 8',
        gen: function (input) {
          var keys = tokens(input, 8, 'Example: orc orc archer');
          var protos = { orc: 'Orc hp=120 [axe]', archer: 'Archer hp=70 [bow]', dragon: 'Dragon hp=900 [fire]' };
          keys.forEach(function (k) { if (!protos[k.toLowerCase()]) throw new Error('Unknown kind "' + k + '". Use orc, archer or dragon'); });
          var frames = [], spawned = [], buildMs = 0, copyMs = 0;
          var entries = [['orc', protos.orc], ['archer', protos.archer], ['dragon', protos.dragon]];
          frames.push({ narr: 'At startup the game builds <b>one</b> prototype per kind (expensive: load mesh, textures, AI tree — say <b>200 ms</b> each) and stores them in a registry map.', parts: [{ type: 'map', label: 'Prototype registry', entries: entries }, { type: 'vars', label: 'Cost model', vals: { buildFromScratch: '200 ms', copyPrototype: '0.02 ms' } }] });
          keys.forEach(function (raw, i) {
            var k = raw.toLowerCase(); var x = 3 + 2 * i;
            spawned.push(k + '@(' + x + ',1)');
            buildMs += 200; copyMs += 0.02;
            frames.push({ narr: 'Spawn #' + (i + 1) + ': <code>registry.spawn("' + k + '")</code> looks up the prototype and calls <code>copy()</code>, then moves it to (' + x + ',1). No asset loading happens.', parts: [{ type: 'map', label: 'Prototype registry', entries: entries, hl: one(k, 'ok') }, { type: 'array', label: 'Enemies in the world', values: spawned.slice(), hl: one(i, 'ok') }, { type: 'vars', label: 'Total time so far', vals: { naiveNewEachTime: buildMs + ' ms', prototypeCopies: copyMs.toFixed(2) + ' ms' }, hl: { prototypeCopies: 'ok', naiveNewEachTime: 'bad' } }] });
          });
          frames.push({ narr: 'A designer adds a <b>"elite orc"</b> by registering a tweaked copy of the orc prototype (hp 300). No new Java class — kinds become <b>data</b>.', parts: [{ type: 'map', label: 'Prototype registry', entries: entries.concat([['eliteOrc', 'Orc hp=300 [axe, shield]']]), hl: { eliteOrc: 'ok' } }, note('<code>Enemy elite = registry.spawn("orc"); elite.setHealth(300); registry.register("eliteOrc", elite);</code>', 'Code')] });
          frames.push({ narr: 'Result: ' + keys.length + ' enemies for ' + copyMs.toFixed(2) + ' ms of copying instead of ' + buildMs + ' ms of rebuilding. Remember the copy must be <b>deep</b> for mutable parts, but can <b>share</b> heavy immutable assets like textures.', parts: [{ type: 'table', label: 'Naive vs Prototype', columns: ['Approach', 'Time for ' + keys.length + ' spawns', 'New kind needs'], rows: [['new Enemy(...) each time', buildMs + ' ms', 'new constructor call site'], ['registry.spawn(key)', copyMs.toFixed(2) + ' ms', 'one register() line']], hl: { 1: 'ok', 0: 'bad' } }] });
          return frames;
        }
      }
    ],
    examples: [
      { title: 'The JDK prefers copy constructors and copy factories', html: `<p><code>new ArrayList&lt;&gt;(other)</code>, <code>new HashMap&lt;&gt;(other)</code>, <code>List.copyOf(other)</code>, <code>EnumSet.copyOf(set)</code> are all "prototype by copy constructor". They are explicit, type-safe and shallow at the element level — the <b>elements</b> are shared, so copying a <code>List&lt;Position&gt;</code> this way still shares each <code>Position</code>.</p>`, code: `
class CopyDemo {
    public static void main(String[] args) {
        List<int[]> original = new ArrayList<>();
        original.add(new int[] {1, 2});
        List<int[]> copy = new ArrayList<>(original);  // new list, SAME int[] inside
        copy.get(0)[0] = 99;
        System.out.println(original.get(0)[0]);          // 99: elements are shared
        copy.add(new int[] {7});
        System.out.println(original.size());              // 1: the list itself is separate
    }
}` },
      { title: 'Invoice template per customer', html: `<p>A billing system prepares an <code>InvoiceTemplate</code>: company header, tax rules for the region, footer text, payment terms — loaded once from the database. For each of 10,000 customers it copies the template and fills in customer name and line items. Copying avoids 10,000 DB reads and guarantees every invoice starts from exactly the same configuration.</p>` },
      { title: 'Why clone() surprises people', html: `<p>(1) <code>Object.clone()</code> does <b>not</b> call any constructor, so invariants enforced in constructors are skipped. (2) <code>final</code> mutable fields cannot be reassigned in <code>clone()</code>, so you cannot deep-copy them. (3) <code>Cloneable</code> has no methods — it only flips <code>Object.clone</code>'s behaviour. (4) Subclasses inherit a broken clone unless they override it. Copy constructors avoid all four.</p>`, code: `
class Account implements Cloneable {
    private final List<String> history = new ArrayList<>();   // final + mutable

    void record(String e) { history.add(e); }

    @Override protected Account clone() throws CloneNotSupportedException {
        Account c = (Account) super.clone();
        // c.history = new ArrayList<>(history);   <- would not compile: history is final
        return c;                                    // so history stays SHARED
    }

    int size() { return history.size(); }
}

class AccountDemo {
    public static void main(String[] args) throws Exception {
        Account a = new Account();
        Account b = a.clone();
        b.record("withdraw 500");
        System.out.println(a.size());   // 1 -- a's history changed through b
    }
}` },
      { title: 'Copy-paste in an editor', html: `<p>Diagram editors (Figma, draw.io) implement "duplicate" by asking the selected shape to copy itself: <code>Shape copy = selected.copy()</code>. The editor does not know whether it is a <code>Circle</code> or a <code>Group</code> of 40 shapes; each class knows how to copy itself (a <code>Group</code> deep-copies its children). That runtime polymorphic copy is exactly what Prototype adds over "just call new".</p>` }
    ],
    deepDive: `<p>🟣 <b>Deep copy of graphs.</b> Real object graphs have shared sub-objects and cycles (a <code>Department</code> lists <code>Employee</code>s who point back to the department). Naive recursive deep copy loops forever or duplicates shared nodes. The fix is a copy with an <b>identity map</b> (<code>IdentityHashMap&lt;Object, Object&gt;</code> from original to copy): before copying a node, check if it was already copied. This is the same idea as cloning a graph in DSA (LeetCode 133).</p>
<p><b>What to share vs copy.</b> Decide per field: immutable values (Strings, records of immutables, <code>BigDecimal</code>) — share. Heavy read-only assets (textures, compiled regex <code>Pattern</code>) — share deliberately (this overlaps with the <b>Flyweight</b> pattern). Mutable state — copy. External resources (sockets, DB connections, thread handles) — usually <b>do not</b> copy; the copy gets its own or none.</p>
<p><b>clone() internals.</b> <code>Object.clone()</code> is a native, field-by-field memory copy (fast), and requires <code>Cloneable</code> or throws <code>CloneNotSupportedException</code>. Arrays override <code>clone()</code> publicly and return the right type (covariant), so <code>arr.clone()</code> is idiomatic; for 2D arrays it is shallow (rows shared), so clone each row. Records and immutable value classes rarely need Prototype — you share them freely, and "with" methods create modified copies.</p>
<p><b>Serialization-based deep copy</b> (write to bytes, read back) handles any graph but is slow, requires <code>Serializable</code> everywhere, and has security pitfalls (Java deserialization gadgets); libraries use reflection-based deep cloners, which break encapsulation. Prefer explicit copy methods, which are fast and reviewable.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants readily emit <code>implements Cloneable</code> with <code>super.clone()</code> — the shallow trap — or "deep copy via JSON serialization" which is slow and loses types. Ask explicitly for copy constructors and a per-field share/copy table.</p>
<p><b>Use AI as a partner:</b> <code>For each field of this class, say share or deep-copy and why; then generate a copy constructor and a test proving the copy is independent for every mutable field.</code> The tests catch shallow bugs instantly. In AI systems the Prototype idea appears as <b>conversation/agent templates</b>: a configured system prompt + tool list + settings is copied per user session, and a shallow copy of the message list leaks one user's history into another's — a real privacy bug class. <b>What you must own:</b> knowing which state is mutable and who should own it.</p>`,
    problems: [
      {
        title: 'Deep Copy a Game Level (Save Slots)',
        level: 'Medium', tags: ['prototype', 'deep copy', 'arrays'], companies: ['Electronic Arts', 'Ubisoft', 'Microsoft', 'Adobe'],
        statement: `<p>A puzzle game lets players create <b>save slots</b> by duplicating the current <code>Level</code>, then keep playing. Playing on after saving must never alter the saved copy. A <code>Level</code> has: <code>String name</code>, <code>int[][] tiles</code> (grid), <code>List&lt;Monster&gt; monsters</code> (each with mutable <code>hp</code>), and <code>Map&lt;String, Integer&gt; inventory</code>. Implement <code>Level copy()</code> so the copy is fully independent, and explain which fields can be shared.</p>`,
        constraints: `Grid up to 200 × 200, up to 1,000 monsters, inventory up to 100 items. Copy should be O(size of the level) and not re-read the level file.`,
        example: `<p>Save a copy, then on the live level: set <code>tiles[0][0] = 9</code>, hit the first monster for 30 damage, add 1 key. The saved copy still shows <span class="c-g">tiles[0][0] = 0, monster hp = 100, keys = 0</span>. With a shallow copy it would show <span class="c-r">9, 70, 1</span>.</p>`,
        brute: {
          why: `<p>Naive approach 1: build a fresh level from scratch with <code>new</code> every time by re-parsing the level file — slow (I/O + parsing) and it loses the player's progress, so it is not even correct for save slots. Naive approach 2: <code>super.clone()</code> or copying field references — fast but <b>shallow</b>: the 2D array rows, the monster objects and the map are shared, so continuing to play silently edits the "saved" game.</p>`,
          code: `
class Monster { int hp = 100; }

class LevelNaive {
    String name; int[][] tiles; List<Monster> monsters; Map<String, Integer> inventory;

    LevelNaive shallowCopy() {
        LevelNaive c = new LevelNaive();
        c.name = name;
        c.tiles = tiles;            // same grid
        c.monsters = monsters;      // same list, same monsters
        c.inventory = inventory;    // same map
        return c;
    }
}`
        },
        mcq: { q: 'For int[][] tiles, which copy is truly independent?', options: ['Clone every row: copy[i] = tiles[i].clone()', 'tiles.clone()', 'copy = tiles', 'Arrays.asList(tiles)'], answer: 0, explain: 'tiles.clone() copies only the outer array of row references; rows are still shared. Each row (an int[]) must be cloned.' },
        hints: [
          `<p>Hint 1: go field by field. <code>String</code> and <code>Integer</code> are immutable → share. <code>int[][]</code>, <code>List&lt;Monster&gt;</code>, <code>Monster</code>, and the map container are mutable → copy.</p>`,
          `<p>Hint 2: a 2D array is an array of arrays — clone the outer array <b>and</b> each row. For monsters, create a new list containing <code>m.copy()</code> for each monster.</p>`,
          `<p>Hint 3: put the logic in a private copy constructor <code>Level(Level other)</code> and expose <code>copy()</code>. Test independence by mutating every field of the original after copying.</p>`
        ],
        solution: {
          approach: `<p><b>Field-by-field deep copy via a copy constructor.</b></p>
<ul><li><code>name</code>: String is immutable → share the reference.</li>
<li><code>tiles</code>: new outer array, each row cloned (<code>int[]</code> of primitives → <code>clone()</code> is a full copy).</li>
<li><code>monsters</code>: new <code>ArrayList</code>; each <code>Monster</code> copied via its own copy constructor (deep).</li>
<li><code>inventory</code>: new <code>HashMap</code> — keys (String) and values (Integer) are immutable, so a new map container is enough.</li></ul>
<p>The test mutates the original after copying and checks the copy is unchanged.</p>`,
          code: `
final class Monster {
    final String type;
    int hp;
    Monster(String type, int hp) { this.type = type; this.hp = hp; }
    Monster(Monster other) { this(other.type, other.hp); }
    Monster copy() { return new Monster(this); }
}

final class Level {
    final String name;
    final int[][] tiles;
    final List<Monster> monsters;
    final Map<String, Integer> inventory;

    Level(String name, int[][] tiles, List<Monster> monsters, Map<String, Integer> inventory) {
        this.name = name;
        this.tiles = tiles;
        this.monsters = monsters;
        this.inventory = inventory;
    }

    private Level(Level o) {
        this.name = o.name;                                   // immutable: share
        this.tiles = new int[o.tiles.length][];
        for (int r = 0; r < o.tiles.length; r++) {
            this.tiles[r] = o.tiles[r].clone();               // copy each row
        }
        this.monsters = new ArrayList<>(o.monsters.size());
        for (Monster m : o.monsters) this.monsters.add(m.copy());   // deep copy elements
        this.inventory = new HashMap<>(o.inventory);          // String/Integer are immutable
    }

    Level copy() { return new Level(this); }
}

public class Main {
    public static void main(String[] args) {
        Level live = new Level("Cave-1", new int[][] {{0, 1}, {1, 0}},
            new ArrayList<>(List.of(new Monster("bat", 100))), new HashMap<>(Map.of("key", 0)));

        Level saved = live.copy();

        live.tiles[0][0] = 9;
        live.monsters.get(0).hp -= 30;
        live.inventory.merge("key", 1, Integer::sum);

        System.out.println("saved tile = " + saved.tiles[0][0]);            // 0
        System.out.println("saved hp   = " + saved.monsters.get(0).hp);     // 100
        System.out.println("saved keys = " + saved.inventory.get("key"));   // 0
        System.out.println("live  hp   = " + live.monsters.get(0).hp);      // 70
    }
}`,
          complexity: `<p>Time O(R·C + M + I) for an R×C grid, M monsters and I inventory entries; memory the same. No I/O, unlike rebuilding from the file.</p>`,
          followUps: ['Monsters can target each other (references between monsters). How do you preserve those links in the copy?', 'How could you make save slots cheaper with immutable data and structural sharing?', 'Should a copy share the loaded texture atlas? Why?']
        }
      }
    ]
  });
  /* ======================================================================
     TOPIC 7 — Object Pool
     ====================================================================== */
  topics.push({
    title: 'Object Pool: Borrow, Use, Return — Reusing Expensive Objects Safely',
    analogy: `<p>A city <b>bike-sharing dock</b> has 10 bikes. You borrow one, ride, and return it to the dock; the next person takes the same bike. The city does not build a new bike for every ride (expensive) and does not let the dock grow forever (limited space). If all bikes are out, you <b>wait</b> a few minutes or give up. Before lending a bike out again, someone checks the tyres; a broken bike is removed and replaced.</p>
<p>An <b>Object Pool</b> is that dock for expensive objects — database connections, threads, network sockets, big buffers: a <b>bounded</b> set you borrow and <b>must return</b>.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Some objects are slow to create — a database connection needs a TCP handshake, TLS, and authentication (often 20-100 ms). If every web request opened a new one, you would waste time <i>and</i> overload the database with thousands of connections. A pool creates a few, keeps them, and lends them out.</p>
<p><b>The contract:</b></p>
<ul><li><code>acquire()</code> — give me an idle object; if none is idle and we are below <b>max</b>, create one; if we are at max, <b>wait</b> (with a timeout).</li>
<li><code>release(obj)</code> — <b>reset</b> it (clear state: rollback open transactions, clear buffers) and put it back.</li>
<li><b>Validate</b> on borrow (is the connection still alive?) and drop broken ones.</li>
<li><b>Bound</b> the size — the pool is also a <b>throttle</b> that protects the downstream system.</li></ul>
<p>🔵 <b>Java building blocks:</b> a <code>ConcurrentLinkedQueue</code> or <code>BlockingQueue</code> of idle objects, a <code>Semaphore(max)</code> to limit how many are borrowed at once (and to block with timeout), a <code>Supplier&lt;T&gt;</code> to create, a <code>Consumer&lt;T&gt;</code> to reset, a <code>Predicate&lt;T&gt;</code> to validate. Wrap a borrowed object in an <code>AutoCloseable</code> lease so <b>try-with-resources</b> always returns it.</p>
${H.table(['Pool this', 'Do NOT pool this'], [
  ['DB connections (HikariCP), HTTP/2 connections', 'Small short-lived objects (<code>new Point</code>, DTOs) — the GC is faster than your pool'],
  ['Platform threads (<code>ThreadPoolExecutor</code>)', 'Virtual threads (Java 21+) — create one per task; limit concurrency with a Semaphore instead'],
  ['Large direct <code>ByteBuffer</code>s, GPU/native handles', 'Objects with complex hidden state you cannot reliably reset'],
  ['Expensive parsers/clients that are not thread-safe', 'Thread-safe clients — just share one instance']
])}
<p><b>Pitfalls:</b> <b>leaks</b> (borrow without return → pool exhausted → every request hangs), <b>dirty objects</b> (returned without reset → next user sees old state, e.g. an open transaction or another user's data), <b>double release</b> (same object handed to two callers), <b>no timeout</b> (threads block forever), and <b>oversized pools</b> (100 DB connections can be slower than 10 because the database thrashes).</p>`,
    clues: [
      '"Creating X is <b>expensive</b> and X can be <b>reused</b>" (connections, sockets, threads) → Object Pool',
      '"Limit the number of <b>concurrent</b> connections to the database" → bounded pool doubles as a throttle',
      '"Requests hang under load / <b>pool exhausted</b>" → leak or missing timeout; use try-with-resources',
      '"Implement a <b>connection pool</b> / thread pool" in an LLD round → Semaphore + queue + validate/reset',
      '"Should we pool these small objects for performance?" → usually no on the modern JVM; measure first',
      '"Virtual threads" in the question → do not pool threads; bound concurrency with a Semaphore'
    ],
    code: [
      { lang: 'java', title: 'Generic, bounded, thread-safe pool with validation, reset, timeout and leases', code: `
final class BoundedPool<T> {
    private final ConcurrentLinkedQueue<T> idle = new ConcurrentLinkedQueue<>();
    private final Semaphore permits;                 // how many may be borrowed at once
    private final Supplier<T> factory;               // creates a new object (expensive)
    private final Predicate<T> isHealthy;            // validation on borrow
    private final Consumer<T> reset;                 // clean state on return
    private final AtomicInteger created = new AtomicInteger();

    BoundedPool(int max, Supplier<T> factory, Predicate<T> isHealthy, Consumer<T> reset) {
        if (max < 1) throw new IllegalArgumentException("max >= 1");
        this.permits = new Semaphore(max, true);     // fair: waiters served in order
        this.factory = factory;
        this.isHealthy = isHealthy;
        this.reset = reset;
    }

    Lease acquire(long timeout, TimeUnit unit) throws InterruptedException, TimeoutException {
        if (!permits.tryAcquire(timeout, unit)) throw new TimeoutException("pool exhausted");
        try {
            T obj;
            while ((obj = idle.poll()) != null) {
                if (isHealthy.test(obj)) return new Lease(obj);   // reuse a healthy idle object
                created.decrementAndGet();                        // drop a broken one
            }
            obj = factory.get();                                  // none idle: create
            created.incrementAndGet();
            return new Lease(obj);
        } catch (RuntimeException e) {
            permits.release();                                    // never lose a permit
            throw e;
        }
    }

    int createdCount() { return created.get(); }
    int idleCount() { return idle.size(); }

    /** try-with-resources handle: close() returns the object exactly once. */
    final class Lease implements AutoCloseable {
        private final T obj;
        private final AtomicBoolean returned = new AtomicBoolean();
        private Lease(T obj) { this.obj = obj; }
        T get() {
            if (returned.get()) throw new IllegalStateException("lease already returned");
            return obj;
        }
        @Override public void close() {
            if (!returned.compareAndSet(false, true)) return;     // double release ignored
            try {
                reset.accept(obj);
                idle.offer(obj);
            } finally {
                permits.release();
            }
        }
    }
}

final class FakeConnection {
    private static final AtomicInteger IDS = new AtomicInteger();
    final int id = IDS.incrementAndGet();
    boolean open = true;
    String txState = "none";

    FakeConnection() {
        try { Thread.sleep(20); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }  // slow handshake
    }
}

public class Main {
    public static void main(String[] args) throws Exception {
        BoundedPool<FakeConnection> pool = new BoundedPool<>(3, FakeConnection::new,
            c -> c.open, c -> c.txState = "none");

        ExecutorService workers = Executors.newFixedThreadPool(10);
        List<Future<?>> jobs = new ArrayList<>();
        for (int i = 0; i < 30; i++) {
            jobs.add(workers.submit(() -> {
                try (BoundedPool<FakeConnection>.Lease lease = pool.acquire(2, TimeUnit.SECONDS)) {
                    lease.get().txState = "open";                 // use it
                    Thread.sleep(5);
                }                                                 // auto-returned + reset
                return null;
            }));
        }
        for (Future<?> j : jobs) j.get();
        workers.shutdown();
        System.out.println("30 tasks served by " + pool.createdCount() + " connections; idle=" + pool.idleCount());
    }
}` }
    ],
    codeTitle: ['Generic BoundedPool with leases'],
    viz: [
      {
        title: 'Pool in action: create, reuse, wait, hand-off',
        input: 'max=3 a a a a r2 a r1 r3 a',
        inputLabel: 'Optional max=N (1-5), then a = acquire, rK = release object #K',
        gen: function (input) {
          var toks = tokens(input, 16, 'Example: max=3 a a a r1 a');
          var max = 3;
          if (/^max=\d$/.test(toks[0])) { max = Number(toks[0].slice(4)); toks = toks.slice(1); }
          if (max < 1 || max > 5) throw new Error('max must be 1-5');
          if (!toks.length) throw new Error('Add some operations after max=N, e.g. a a r1');
          toks.forEach(function (t) { if (!/^(a|r\d)$/.test(t)) throw new Error('Use a (acquire) or r1..r9 (release object #1..#9). Bad item: ' + t); });
          var idle = [], borrowed = [], waiters = [], created = 0, caller = 0, frames = [];
          var owner = {};
          function parts(hq, hs, hw, extra) {
            var p = [
              { type: 'queue', label: 'Idle objects (ready to lend)', items: idle.slice(), hl: hq || {}, frontLabel: 'next', backLabel: 'returned' },
              { type: 'set', label: 'Borrowed (object@caller)', items: borrowed.map(function (o) { return o + '@' + owner[o]; }), hl: hs || {} },
              { type: 'queue', label: 'Callers waiting for a permit', items: waiters.slice(), hl: hw || {} },
              { type: 'vars', label: 'Pool state', vals: { max: max, created: created, idle: idle.length, borrowed: borrowed.length, permitsLeft: max - borrowed.length }, hl: extra || {} }
            ];
            return p;
          }
          frames.push({ narr: 'Structure: callers go through the <b>pool</b>; only the pool calls the expensive factory. Max <b>' + max + '</b> objects can be out at once.', parts: [{ type: 'graph', label: 'Object Pool structure', directed: true, height: 40, nodes: [box('C', 'Caller', 10, 20), box('P', 'BoundedPool', 40, 20), box('Q', 'idle queue', 76, 6), box('F', 'factory (slow new)', 76, 20), box('S', 'Semaphore(' + max + ')', 76, 34)], edges: [['C', 'P', 'acquire/release'], ['P', 'Q', 'reuse'], ['P', 'F', 'create'], ['P', 'S', 'permit']], hl: { P: 'sel' } }].concat(parts()) });
          toks.forEach(function (t) {
            if (t === 'a') {
              caller++; var who = 'C' + caller;
              if (borrowed.length >= max) {
                waiters.push(who);
                frames.push({ narr: '<b>' + who + '</b> calls <code>acquire()</code> but all ' + max + ' permits are taken. It <span class="c-r">waits</span> (with a timeout — never forever). This back-pressure protects the database.', parts: parts({}, {}, one(waiters.length - 1, 'bad'), { permitsLeft: 'bad' }) });
              } else if (idle.length) {
                var o = idle.shift(); borrowed.push(o); owner[o] = who;
                frames.push({ narr: '<b>' + who + '</b> acquires: an idle object <b>' + o + '</b> exists, so it is validated and <span class="c-g">reused</span> — no expensive creation.', parts: parts({}, one(o + '@' + who, 'ok'), {}, { idle: 'ok' }) });
              } else {
                created++; var n = '#' + created; borrowed.push(n); owner[n] = who;
                frames.push({ narr: '<b>' + who + '</b> acquires: nothing idle and only ' + (created - 1) + ' created (&lt; max), so the pool <b>creates</b> ' + n + ' (slow: ~50 ms handshake).', parts: parts({}, one(n + '@' + who, 'cur'), {}, { created: 'cur' }) });
              }
            } else {
              var id = '#' + t.slice(1), at = borrowed.indexOf(id);
              if (at < 0) {
                frames.push({ narr: 'Release of <b>' + id + '</b> is <span class="c-r">rejected</span>: it is not currently borrowed (double release or a foreign object). Accepting it would let two callers share one connection.', parts: parts({}, {}, {}, {}) });
                return;
              }
              var prev = owner[id];
              borrowed.splice(at, 1); delete owner[id];
              if (waiters.length) {
                var w = waiters.shift(); borrowed.push(id); owner[id] = w;
                frames.push({ narr: prev + ' releases <b>' + id + '</b>: it is <b>reset</b> (rollback, clear state), then handed straight to the first waiter <b>' + w + '</b>.', parts: parts({}, one(id + '@' + w, 'ok'), {}, { borrowed: 'cur' }) });
              } else {
                idle.push(id);
                frames.push({ narr: prev + ' releases <b>' + id + '</b>: reset and pushed to the idle queue for the next borrower.', parts: parts(one(idle.length - 1, 'ok'), {}, {}, { idle: 'ok' }) });
              }
            }
          });
          frames.push({ narr: 'Done. <b>' + caller + '</b> acquire calls were served by only <b>' + created + '</b> real objects. ' + (waiters.length ? '<span class="c-r">' + waiters.length + ' caller(s) still waiting</span> — if nobody releases, they time out (or a leak hangs them forever).' : 'Nobody is left waiting.'), parts: parts() });
          return frames;
        }
      }
    ],
    examples: [
      { title: 'HikariCP: the pool you will actually use', html: `<p>Spring Boot's default JDBC pool is HikariCP. Key knobs: <code>maximumPoolSize</code> (often ~10: a classic formula is cores × 2 + effective disks for the database), <code>connectionTimeout</code> (how long <code>getConnection()</code> waits, default 30 s), <code>maxLifetime</code> (retire connections before the DB or a firewall kills them), <code>leakDetectionThreshold</code> (log a stack trace when a connection is held too long). It validates connections with the JDBC4 <code>isValid()</code> check and resets auto-commit, isolation and read-only state on return — exactly the validate/reset steps of the pattern.</p>` },
      { title: 'A thread pool is an object pool of workers', html: `<p><code>ThreadPoolExecutor</code> keeps up to N platform threads alive and feeds them tasks from a queue. Creating an OS thread costs ~tens of microseconds and ~1 MB of stack reservation, so reusing them matters. The bounded queue plus a rejection policy is the pool's back-pressure.</p>`, code: `
class ThreadPoolDemo {
    public static void main(String[] args) throws Exception {
        ThreadPoolExecutor pool = new ThreadPoolExecutor(
            2, 4,                                   // core and max workers
            30, TimeUnit.SECONDS,                   // idle workers above core die after 30 s
            new ArrayBlockingQueue<>(100),          // bounded task queue = back-pressure
            new ThreadPoolExecutor.CallerRunsPolicy());
        Set<String> workers = ConcurrentHashMap.newKeySet();
        List<Future<?>> fs = new ArrayList<>();
        for (int i = 0; i < 20; i++) fs.add(pool.submit(() -> workers.add(Thread.currentThread().getName())));
        for (Future<?> f : fs) f.get();
        pool.shutdown();
        System.out.println("20 tasks ran on " + workers.size() + " reused threads");
    }
}` },
      { title: 'Java 21 virtual threads: do NOT pool them', html: `<p>Virtual threads are cheap (a few hundred bytes, created in microseconds). Pooling them adds overhead and defeats their purpose. If you need to limit concurrency (e.g. at most 20 calls to a fragile API), use a <code>Semaphore</code> — the pool's <i>throttling</i> half without the <i>reuse</i> half.</p>`, code: `
class VirtualThreadLimit {
    public static void main(String[] args) throws Exception {
        Semaphore apiSlots = new Semaphore(20);                  // throttle, not a pool
        AtomicInteger done = new AtomicInteger();
        try (ExecutorService exec = Executors.newVirtualThreadPerTaskExecutor()) {
            for (int i = 0; i < 1_000; i++) {
                exec.submit(() -> {
                    apiSlots.acquire();
                    try {
                        Thread.sleep(1);                         // pretend remote call
                        done.incrementAndGet();
                    } finally {
                        apiSlots.release();
                    }
                    return null;
                });
            }
        }                                                        // close() waits for all tasks
        System.out.println("completed " + done.get());
    }
}` },
      { title: 'The leak that took down checkout', html: `<p>A service did <code>Connection c = pool.getConnection();</code> then returned early on a validation error <b>without closing</b>. Each bad request leaked one of 10 connections; after 10 bad requests every checkout request waited 30 s and timed out. Fixes: <b>try-with-resources</b> on every borrow, a <b>leak-detection</b> threshold that logs the borrower's stack trace, and <b>alerts</b> on pool "active = max" and "pending threads &gt; 0".</p>` }
    ],
    deepDive: `<p>🟣 <b>Sizing.</b> Little's Law: <i>connections needed ≈ request rate × time each request holds a connection</i>. At 500 req/s holding a connection for 8 ms you need ~4 on average; add headroom for bursts. Bigger is not better: a database with 8 cores serving 200 active connections context-switches and fights over locks, so throughput drops. Many teams run 10-20 per app instance and put a server-side pooler (PgBouncer) in front of PostgreSQL when they have hundreds of instances.</p>
<p><b>Correctness details.</b> (1) Use a <b>fair</b> semaphore or FIFO queue to avoid starvation. (2) Never lose a permit: release it in <code>finally</code> even if the factory throws. (3) Guard against <b>double release</b> with a per-lease flag or an identity set of borrowed objects. (4) <b>Reset</b> must be complete — for JDBC: rollback, restore auto-commit, isolation, schema, clear warnings. (5) <b>Eviction</b>: close idle objects after a while and objects older than <code>maxLifetime</code> (handled by a background housekeeper thread). (6) <b>Shutdown</b>: stop lending, wait for leases, close everything.</p>
<p><b>Performance internals.</b> HikariCP is fast because it avoids a global lock: a <code>ConcurrentBag</code> gives each thread a <code>ThreadLocal</code> list of recently used connections and uses a lock-free shared list plus a hand-off queue. Generic pools like Apache Commons Pool 2 (<code>GenericObjectPool</code>) offer configurable LIFO/FIFO, test-on-borrow/return/idle, and abandoned-object tracking.</p>
<p><b>Object pools vs GC.</b> In the 2000s people pooled ordinary objects to dodge GC pauses. With TLAB allocation and generational/concurrent collectors (G1, ZGC generational since JDK 21), pooling small objects usually <b>hurts</b>: pooled objects live long, get promoted to the old generation, and add cache misses and synchronisation. Pool only when creation involves <b>I/O, native resources, or large allocations</b> — and measure.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> asked for "a connection pool", AI tools often produce a <code>synchronized</code> list with <code>wait/notify</code>, no timeout, no validation and no double-release protection — it passes a happy-path test and deadlocks or leaks in production. Review checklist: bounded? timeout? permits released in <code>finally</code>? reset? validation? leases with try-with-resources?</p>
<p><b>Use AI as a partner:</b> <code>Write a stress test for this pool: 50 threads, random hold times, 5% of factory calls throw, some callers double-release. Assert created ≤ max and no permit is lost.</code> Pool-like resource control is central in AI systems too: GPU inference servers <b>pool</b> model replicas and KV-cache blocks (vLLM's PagedAttention manages a pool of fixed-size cache blocks), and LLM API clients bound concurrent requests with semaphores to respect rate limits. <b>What you must own:</b> sizing with Little's Law, choosing between pool and plain throttle, and leak diagnosis.</p>`,
    problems: [
      {
        title: 'Thread-Safe Connection Pool with Timeout and Health Checks',
        level: 'Hard', tags: ['object pool', 'concurrency', 'semaphore'], companies: ['Amazon', 'Oracle', 'Atlassian', 'Zomato'],
        statement: `<p>Implement <code>ConnectionPool</code> for a service whose database allows at most <code>maxSize</code> connections from this instance.</p>
<ul><li><code>Connection borrow(long timeoutMs)</code>: return a healthy idle connection, or create one if fewer than <code>maxSize</code> exist, or wait up to <code>timeoutMs</code>; throw <code>TimeoutException</code> after that.</li>
<li><code>void giveBack(Connection c)</code>: reset it (rollback any open transaction) and make it available. Reject connections that were not borrowed from this pool or are already returned.</li>
<li>Unhealthy connections (closed by the server) found at borrow time are discarded and do not count toward <code>maxSize</code>.</li>
<li><code>shutdown()</code>: refuse new borrows and close idle connections.</li></ul>`,
        constraints: `1 ≤ maxSize ≤ 100; up to 1,000 concurrent threads; creating a connection may throw (network error) and must not leak capacity. No external libraries.`,
        example: `<p><code>maxSize = 2</code>. T1 borrows (creates #1), T2 borrows (creates #2), T3 <code>borrow(100)</code> waits; T1 gives back #1 → T3 gets <span class="c-g">#1</span> (reused, reset). If nobody gives back within 100 ms, T3 gets <span class="c-r">TimeoutException</span>. Giving back #1 twice → <span class="c-r">IllegalStateException</span>.</p>`,
        brute: {
          why: `<p>The naive approach opens a brand-new connection with <code>new</code> on every request and closes it after: each request pays the handshake (tens of ms), and under a traffic spike the service opens thousands of connections and knocks over the database (which typically allows a few hundred in total). There is no limit, no reuse and no back-pressure.</p>`,
          code: `
class Connection {
    final int id;
    Connection(int id) { this.id = id; /* imagine a slow TCP + TLS + auth handshake */ }
    void close() { }
}

class OrderDao {
    private static int nextId = 0;

    String findOrder(long orderId) {
        Connection c = new Connection(++nextId);   // new connection per call: slow + unbounded
        try {
            return "order " + orderId + " via connection " + c.id;
        } finally {
            c.close();
        }
    }
}`
        },
        mcq: { q: 'The factory throws while creating a connection inside borrow(). What must the pool do?', options: ['Release the permit it took, then rethrow', 'Keep the permit so the slot stays reserved', 'Return null to the caller', 'Retry forever'], answer: 0, explain: 'If the permit is not released, capacity silently shrinks by one with every failure until the pool is permanently exhausted.' },
        hints: [
          `<p>Hint 1: separate "how many may be out at once" (a <code>Semaphore(maxSize)</code> with <code>tryAcquire(timeout)</code>) from "which objects are idle" (a concurrent queue).</p>`,
          `<p>Hint 2: keep a concurrent identity set of borrowed connections. <code>giveBack</code> must <code>remove</code> from it successfully before accepting; otherwise it is a double/foreign return.</p>`,
          `<p>Hint 3: in <code>borrow</code>, loop polling idle connections, discarding unhealthy ones; if none, create. Wrap creation in try/catch and release the permit on failure. <code>shutdown</code> flips a volatile flag and closes idle connections.</p>`
        ],
        solution: {
          approach: `<p><b>Semaphore for capacity + queue for idle objects + identity set for ownership.</b></p>
<ol><li><code>permits = new Semaphore(maxSize, true)</code>: each borrowed connection holds one permit; <code>tryAcquire(timeout)</code> gives the waiting-with-timeout behaviour and fairness.</li>
<li><code>borrow</code>: after getting a permit, poll the idle queue; discard unhealthy connections (close them); if nothing healthy, create a new one. Any exception → release the permit and rethrow. Record the connection in <code>borrowed</code>.</li>
<li><code>giveBack</code>: <code>borrowed.remove(c)</code> must return true (else reject). Reset (rollback), then offer to idle (or close if shut down), and release the permit in <code>finally</code>.</li>
<li><code>shutdown</code>: set a volatile flag so new borrows fail fast, then close idle connections.</li></ol>
<p>Invariant: <code>borrowed + permits available = maxSize</code>, and live connections ≤ maxSize.</p>`,
          code: `
final class Connection {
    private static final AtomicInteger IDS = new AtomicInteger();
    final int id = IDS.incrementAndGet();
    volatile boolean alive = true;
    volatile boolean inTransaction = false;

    void rollback() { inTransaction = false; }
    void close() { alive = false; }
}

final class ConnectionPool {
    private final Semaphore permits;
    private final ConcurrentLinkedQueue<Connection> idle = new ConcurrentLinkedQueue<>();
    private final Set<Connection> borrowed = Collections.newSetFromMap(new ConcurrentHashMap<>());
    private final Supplier<Connection> factory;
    private volatile boolean shutDown = false;

    ConnectionPool(int maxSize, Supplier<Connection> factory) {
        if (maxSize < 1) throw new IllegalArgumentException("maxSize >= 1");
        this.permits = new Semaphore(maxSize, true);
        this.factory = factory;
    }

    Connection borrow(long timeoutMs) throws InterruptedException, TimeoutException {
        if (shutDown) throw new IllegalStateException("pool is shut down");
        if (!permits.tryAcquire(timeoutMs, TimeUnit.MILLISECONDS)) {
            throw new TimeoutException("no connection within " + timeoutMs + " ms");
        }
        try {
            Connection c;
            while ((c = idle.poll()) != null) {
                if (c.alive) break;                 // healthy: reuse
                c.close();                          // dead: discard, does not count any more
            }
            if (c == null) c = factory.get();       // may throw
            borrowed.add(c);
            return c;
        } catch (RuntimeException e) {
            permits.release();                      // never lose capacity
            throw e;
        }
    }

    void giveBack(Connection c) {
        if (!borrowed.remove(c)) throw new IllegalStateException("connection " + c.id + " was not borrowed from this pool");
        try {
            if (c.inTransaction) c.rollback();      // reset dirty state
            if (shutDown || !c.alive) c.close();
            else idle.offer(c);
        } finally {
            permits.release();
        }
    }

    void shutdown() {
        shutDown = true;
        Connection c;
        while ((c = idle.poll()) != null) c.close();
    }

    int idleCount() { return idle.size(); }
}

public class Main {
    public static void main(String[] args) throws Exception {
        ConnectionPool pool = new ConnectionPool(2, Connection::new);
        Connection a = pool.borrow(100);
        Connection b = pool.borrow(100);
        try {
            pool.borrow(50);
        } catch (TimeoutException e) {
            System.out.println("third borrow: " + e.getMessage());
        }
        a.inTransaction = true;
        pool.giveBack(a);                                     // rolled back + idle
        Connection c = pool.borrow(100);
        System.out.println("reused #" + c.id + " (same as a: " + (c == a) + "), tx=" + c.inTransaction);
        try {
            pool.giveBack(a);
            pool.giveBack(a);
        } catch (IllegalStateException e) {
            System.out.println("double return rejected: " + e.getMessage());
        }
        pool.giveBack(b);
        pool.shutdown();
        System.out.println("idle after shutdown = " + pool.idleCount());
    }
}`,
          complexity: `<p><code>borrow</code>/<code>giveBack</code>: O(1) amortised (plus discarded dead connections). Memory O(maxSize). Waiting threads are parked by the semaphore, not spinning.</p>`,
          followUps: ['Add maxLifetime: retire connections older than 30 minutes', 'Add leak detection that logs who borrowed a connection held for over 10 s', 'How would you avoid the global queue contention at 10k borrows/s? (HikariCP ConcurrentBag)']
        }
      }
    ]
  });
  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Which Pattern Fits? An App-Wide Audit Logger',
    level: 'Easy', tags: ['which pattern', 'singleton', 'enum'], companies: ['Infosys', 'TCS', 'Amazon'],
    statement: `<p>Every service in a banking app must append lines to <b>one</b> audit log. Today each class does <code>new AuditLogger("audit.log")</code>, and auditors found interleaved, half-written lines and "too many open files" errors. (1) Name the creational pattern that fits and say why. (2) Implement it so that all threads share one logger, each line gets a unique increasing sequence number, and the logger cannot be duplicated by reflection or serialization.</p>`,
    constraints: `Called from up to 200 threads. Sequence numbers start at 1 with no gaps or duplicates. Store lines in memory (a list) for this exercise instead of a real file.`,
    example: `<p>Thread A logs "login asha", thread B logs "transfer 500" → the log holds <span class="c-g">1 login asha</span> and <span class="c-g">2 transfer 500</span> (or 1/2 swapped by timing) — never two lines with the same number, and <code>AuditLog.INSTANCE == AuditLog.INSTANCE</code>.</p>`,
    brute: {
      why: `<p>Constructing the logger with <code>new</code> in every class opens one file handle per instance (resource exhaustion), and separate instances keep separate counters, so sequence numbers repeat. Writes from different instances interleave because there is no single place to synchronise.</p>`,
      code: `
class AuditLoggerNaive {
    private final String file;
    private int seq = 0;                        // per-instance counter: duplicates across instances
    AuditLoggerNaive(String file) { this.file = file; /* opens a new handle each time */ }
    String log(String msg) { return (++seq) + " " + msg + " -> " + file; }
}

class TransferService {
    String transfer() { return new AuditLoggerNaive("audit.log").log("transfer 500"); }   // always "1 ..."
}`
    },
    mcq: { q: 'Which variant best satisfies "one instance, safe against reflection and serialization" with the least code?', options: ['enum AuditLog { INSTANCE }', 'Lazy getInstance() without locking', 'Public constructor plus a static field', 'A new instance per thread via ThreadLocal'], answer: 0, explain: 'The JVM guarantees enum constants are created once, refuses reflective creation of enums and serializes them by name.' },
    hints: [
      `<p>Hint 1: "exactly one shared logger" is the Singleton requirement — and reflection/serialization safety points straight to the enum form.</p>`,
      `<p>Hint 2: the counter and the write must be atomic together, otherwise line order and numbers can disagree. A <code>synchronized</code> method covering both is simplest.</p>`,
      `<p>Hint 3: keep lines in a list guarded by the same lock and expose a read-only snapshot (<code>List.copyOf</code>) for tests.</p>`
    ],
    solution: {
      approach: `<p><b>Pattern: Singleton (enum form).</b> The requirement is "one shared resource for the whole process". The enum gives a single instance created during class initialisation (thread-safe), and is immune to reflection and serialization duplication. Inside, one <code>synchronized</code> method increments the sequence and appends the line in one atomic step, so numbers and order always agree.</p>`,
      code: `
enum AuditLog {
    INSTANCE;

    private final List<String> lines = new ArrayList<>();
    private long seq = 0;

    synchronized long log(String msg) {          // number + append happen atomically
        seq++;
        lines.add(seq + " " + msg);
        return seq;
    }

    synchronized List<String> snapshot() { return List.copyOf(lines); }
}

public class Main {
    public static void main(String[] args) throws Exception {
        Thread a = new Thread(() -> { for (int i = 0; i < 1000; i++) AuditLog.INSTANCE.log("A" + i); });
        Thread b = new Thread(() -> { for (int i = 0; i < 1000; i++) AuditLog.INSTANCE.log("B" + i); });
        a.start(); b.start(); a.join(); b.join();
        List<String> snap = AuditLog.INSTANCE.snapshot();
        System.out.println(snap.size() + " lines, last = " + snap.get(snap.size() - 1));
    }
}`,
      complexity: `<p>O(1) per log call; the lock serialises writers, which is what an ordered log needs. For very high throughput, use a lock-free queue and a single writer thread.</p>`,
      followUps: ['Why might DI (one bean) be better than an enum singleton here?', 'How would you make the logger asynchronous without losing order?']
    }
  });

  practice.push({
    title: 'Eager Singleton for Feature Flags',
    level: 'Easy', tags: ['singleton', 'eager', 'immutability'], companies: ['Flipkart', 'Swiggy', 'Paytm'],
    statement: `<p>Feature flags are loaded from a properties string at startup and then only read, thousands of times per second, from many threads. Currently every request does <code>new FeatureFlags()</code> which re-parses the configuration. Implement <code>FeatureFlags</code> as an <b>eager</b> singleton with an <b>immutable</b> map and a method <code>boolean isOn(String flag)</code> (unknown flags are off).</p>`,
    constraints: `Config format: <code>name=true|false</code> pairs separated by commas, e.g. <code>"newCheckout=true,darkMode=false"</code>. Up to 500 flags. Reads must be lock-free.`,
    example: `<p>With config <code>"newCheckout=true,darkMode=false"</code>: <code>isOn("newCheckout")</code> → <span class="c-g">true</span>, <code>isOn("darkMode")</code> → <span class="c-r">false</span>, <code>isOn("beta")</code> → <span class="c-r">false</span> (unknown).</p>`,
    brute: {
      why: `<p>Creating a new <code>FeatureFlags</code> per request repeats the parse on the hot path (wasted CPU and allocations) and, if the config source changes mid-request, two parts of one request can see different flag values. A single, immutable, eagerly created instance is parsed once and is consistent.</p>`,
      code: `
class FeatureFlagsNaive {
    private final Map<String, Boolean> flags = new HashMap<>();

    FeatureFlagsNaive(String config) {                 // parsed again for EVERY request
        for (String pair : config.split(",")) {
            String[] kv = pair.split("=");
            flags.put(kv[0].trim(), Boolean.parseBoolean(kv[1].trim()));
        }
    }

    boolean isOn(String f) { return flags.getOrDefault(f, false); }
}`
    },
    mcq: { q: 'Why is an eager singleton with an immutable Map safe to read from many threads without locks?', options: ['Class initialisation safely publishes the final field, and nobody can modify the map afterwards', 'HashMap is always thread-safe', 'Static fields are copied per thread', 'The JIT removes all races'], answer: 0, explain: 'Static initialisation happens-before any use of the class, and an unmodifiable map has no writes after construction, so there is nothing to race on.' },
    hints: [
      `<p>Hint 1: "loaded once at startup, read forever" is the textbook case for <b>eager</b> initialisation — no laziness needed.</p>`,
      `<p>Hint 2: <code>private static final FeatureFlags INSTANCE = new FeatureFlags(load());</code> plus a private constructor.</p>`,
      `<p>Hint 3: build a <code>HashMap</code> while parsing, then store <code>Map.copyOf(...)</code> in a <code>final</code> field. Skip blank or malformed pairs instead of crashing.</p>`
    ],
    solution: {
      approach: `<p>Eager singleton: the JVM creates the instance while initialising the class (thread-safe, once). The constructor parses the config into a temporary map and stores an immutable copy in a final field. Reads are plain map lookups with no locking. In a real app <code>load()</code> would read a file or remote config service once.</p>`,
      code: `
final class FeatureFlags {
    private static final FeatureFlags INSTANCE = new FeatureFlags(load());

    private final Map<String, Boolean> flags;

    private FeatureFlags(String config) {
        Map<String, Boolean> m = new HashMap<>();
        for (String pair : config.split(",")) {
            String[] kv = pair.split("=");
            if (kv.length != 2 || kv[0].isBlank()) continue;          // ignore malformed entries
            m.put(kv[0].trim(), Boolean.parseBoolean(kv[1].trim()));
        }
        this.flags = Map.copyOf(m);                                    // immutable snapshot
    }

    private static String load() { return "newCheckout=true,darkMode=false"; }   // stand-in for file/remote

    static FeatureFlags get() { return INSTANCE; }

    boolean isOn(String flag) { return flags.getOrDefault(flag, false); }
}

public class Main {
    public static void main(String[] args) {
        FeatureFlags f = FeatureFlags.get();
        System.out.println(f.isOn("newCheckout") + " " + f.isOn("darkMode") + " " + f.isOn("beta"));
    }
}`,
      complexity: `<p>Parse once: O(F) for F flags. Each <code>isOn</code>: O(1), lock-free.</p>`,
      followUps: ['Flags must refresh every minute without restarts: how do you swap the map safely? (volatile reference to a new immutable map)', 'How would you test code that reads FeatureFlags.get()?']
    }
  });

  practice.push({
    title: 'Shape Factory: Replace the Switch',
    level: 'Easy', tags: ['factory', 'registry', 'lambdas'], companies: ['Adobe', 'Autodesk', 'Microsoft'],
    statement: `<p>A drawing app creates shapes from user commands like <code>"circle 2"</code> or <code>"square 3"</code>. The code has a <code>switch</code> on the shape name copied into three screens. Write a <code>ShapeFactory</code> that maps a name to a <code>Function&lt;Double, Shape&gt;</code> recipe, so <code>create("circle", 2)</code> returns a <code>Shape</code> with <code>area()</code> and <code>name()</code>. Adding <code>"hexagon"</code> must not change existing code.</p>`,
    constraints: `Names are case-insensitive. Size must be &gt; 0 (else IllegalArgumentException). Unknown names throw IllegalArgumentException listing known shapes.`,
    example: `<p><code>create("Circle", 2).area()</code> → <span class="c-g">12.566...</span> (π × 2²); <code>create("square", 3).area()</code> → <span class="c-g">9.0</span>; <code>create("blob", 1)</code> → <span class="c-r">IllegalArgumentException: unknown shape blob, known [circle, square, triangle]</span>.</p>`,
    brute: {
      why: `<p>The switch is duplicated in every screen that creates shapes, each with <code>new Circle(...)</code> etc. A new shape means editing every copy, and copies drift (one screen forgets "triangle"). The creation decision should live in exactly one place.</p>`,
      code: `
class Circle { final double r; Circle(double r) { this.r = r; } double area() { return Math.PI * r * r; } }
class Square { final double s; Square(double s) { this.s = s; } double area() { return s * s; } }

class CanvasScreen {
    double addShape(String name, double size) {
        switch (name) {                                  // copy #1 of the switch
            case "circle": return new Circle(size).area();
            case "square": return new Square(size).area();
            default: throw new IllegalArgumentException(name);
        }
    }
}`
    },
    mcq: { q: 'What does Function&lt;Double, Shape&gt; represent in the registry?', options: ['A recipe that takes a size and builds a new Shape', 'A cached Shape object', 'The Shape interface itself', 'A comparator for shapes'], answer: 0, explain: 'Each map value is a creation function; calling apply(size) runs the constructor for that shape type.' },
    hints: [
      `<p>Hint 1: define <code>interface Shape { String name(); double area(); }</code> and small implementations (records work nicely).</p>`,
      `<p>Hint 2: <code>Map&lt;String, Function&lt;Double, Shape&gt;&gt; recipes</code>; register with constructor references like <code>Circle::new</code>.</p>`,
      `<p>Hint 3: validate size before calling the recipe and lower-case the key with <code>Locale.ROOT</code>. Use a <code>TreeMap</code> so the "known shapes" message is sorted.</p>`
    ],
    solution: {
      approach: `<p>A registry-based simple factory. Each shape is a record implementing <code>Shape</code>. The factory owns a sorted map from name to constructor reference; <code>create</code> validates input, finds the recipe and applies it. New shapes are added with one <code>register</code> call.</p>`,
      code: `
interface Shape {
    String name();
    double area();
}

record Circle(double r) implements Shape {
    public String name() { return "circle"; }
    public double area() { return Math.PI * r * r; }
}

record Square(double side) implements Shape {
    public String name() { return "square"; }
    public double area() { return side * side; }
}

record Triangle(double side) implements Shape {           // equilateral
    public String name() { return "triangle"; }
    public double area() { return Math.sqrt(3) / 4 * side * side; }
}

final class ShapeFactory {
    private final Map<String, Function<Double, Shape>> recipes = new TreeMap<>();

    ShapeFactory() {
        register("circle", Circle::new);
        register("square", Square::new);
        register("triangle", Triangle::new);
    }

    void register(String name, Function<Double, Shape> recipe) {
        recipes.put(name.toLowerCase(Locale.ROOT), recipe);
    }

    Shape create(String name, double size) {
        if (size <= 0) throw new IllegalArgumentException("size must be > 0");
        Function<Double, Shape> recipe = recipes.get(name.toLowerCase(Locale.ROOT));
        if (recipe == null) throw new IllegalArgumentException("unknown shape " + name + ", known " + recipes.keySet());
        return recipe.apply(size);
    }
}

public class Main {
    public static void main(String[] args) {
        ShapeFactory f = new ShapeFactory();
        System.out.println(f.create("Circle", 2).area());
        System.out.println(f.create("square", 3).area());
        f.register("hexagon", s -> new Shape() {
            public String name() { return "hexagon"; }
            public double area() { return 3 * Math.sqrt(3) / 2 * s * s; }
        });
        System.out.println(f.create("hexagon", 1).name());
    }
}`,
      complexity: `<p><code>create</code>: O(log K) with a TreeMap of K shapes (O(1) with a HashMap). Adding a shape: one class + one line.</p>`,
      followUps: ['Parse full commands like "circle 2" robustly', 'Should the factory cache shapes of the same size? When would that be safe?']
    }
  });

  practice.push({
    title: 'Copy Constructor for a Resume Template',
    level: 'Easy', tags: ['prototype', 'copy constructor', 'deep copy'], companies: ['LinkedIn', 'Naukri', 'Indeed'],
    statement: `<p>A resume builder lets users start from a <b>template</b> resume (headline, skills list, address) and personalise it. Users report that adding a skill to <i>their</i> resume also added it to the template everyone else uses. Implement <code>Resume</code> with a <b>copy constructor</b> that makes copies fully independent, and a method <code>Resume personalised(String name)</code> that returns a copy with the name changed.</p>`,
    constraints: `<code>Resume</code> fields: <code>String name</code>, <code>String headline</code>, <code>List&lt;String&gt; skills</code> (mutable), <code>Address address</code> (mutable: city, pin). Up to 100 skills.`,
    example: `<p>Template skills <code>[Java, SQL]</code>. <code>Resume mine = template.personalised("Asha"); mine.addSkill("Kafka");</code> → mine has <span class="c-g">[Java, SQL, Kafka]</span>, template still <span class="c-g">[Java, SQL]</span>. Changing <code>mine.address().city</code> leaves the template's city unchanged.</p>`,
    brute: {
      why: `<p>The buggy version copies references: <code>copy.skills = template.skills</code>. Both resumes share one list and one address, so edits leak into the template. The other naive option — rebuilding every resume with <code>new Resume(...)</code> by re-entering every field — duplicates setup code everywhere and drifts from the template.</p>`,
      code: `
class Address { String city; String pin; Address(String c, String p) { city = c; pin = p; } }

class ResumeNaive {
    String name, headline;
    List<String> skills;
    Address address;

    ResumeNaive copy() {
        ResumeNaive r = new ResumeNaive();
        r.name = name; r.headline = headline;
        r.skills = skills;          // SHARED list -> bug
        r.address = address;        // SHARED address -> bug
        return r;
    }
}`
    },
    mcq: { q: 'Which fields of Resume can safely be shared by reference in a copy?', options: ['name and headline (Strings are immutable)', 'skills (List)', 'address (mutable class)', 'All of them'], answer: 0, explain: 'Immutable objects can be shared; mutable List and Address must be copied so edits stay local.' },
    hints: [
      `<p>Hint 1: classify each field — immutable (share) or mutable (copy).</p>`,
      `<p>Hint 2: give <code>Address</code> its own copy constructor, then in <code>Resume(Resume other)</code> do <code>new ArrayList&lt;&gt;(other.skills)</code> and <code>new Address(other.address)</code>.</p>`,
      `<p>Hint 3: <code>personalised(name)</code> = copy, then set the name. Test by mutating the copy's list and address and printing the template.</p>`
    ],
    solution: {
      approach: `<p>Prototype via copy constructors. Strings are shared; the skills list and the address get fresh copies. <code>personalised</code> builds on the copy constructor, so every resume derived from the template is independent.</p>`,
      code: `
final class Address {
    String city, pin;
    Address(String city, String pin) { this.city = city; this.pin = pin; }
    Address(Address o) { this(o.city, o.pin); }
    public String toString() { return city + "-" + pin; }
}

final class Resume {
    private String name;
    private final String headline;
    private final List<String> skills;
    private final Address address;

    Resume(String name, String headline, List<String> skills, Address address) {
        this.name = name;
        this.headline = headline;
        this.skills = new ArrayList<>(skills);
        this.address = new Address(address);
    }

    Resume(Resume o) {                                  // copy constructor = prototype copy
        this.name = o.name;
        this.headline = o.headline;
        this.skills = new ArrayList<>(o.skills);
        this.address = new Address(o.address);
    }

    Resume personalised(String newName) {
        Resume r = new Resume(this);
        r.name = newName;
        return r;
    }

    void addSkill(String s) { skills.add(s); }
    Address address() { return address; }
    public String toString() { return name + " | " + headline + " | " + skills + " | " + address; }
}

public class Main {
    public static void main(String[] args) {
        Resume template = new Resume("Your Name", "Backend Engineer", List.of("Java", "SQL"), new Address("Pune", "411001"));
        Resume mine = template.personalised("Asha");
        mine.addSkill("Kafka");
        mine.address().city = "Bengaluru";
        System.out.println(mine);
        System.out.println(template);
    }
}`,
      complexity: `<p>Copy: O(S) for S skills. No shared mutable state between copies.</p>`,
      followUps: ['Make Address a record. What changes in the copy logic?', 'Add a list of Experience objects that are themselves mutable']
    }
  });

  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'Fix the Broken Singleton: Reflection, Serialization and Clone',
    level: 'Medium', tags: ['singleton', 'fix the bug', 'serialization', 'reflection'], companies: ['Goldman Sachs', 'JP Morgan', 'Oracle'],
    statement: `<p>Code review found this "singleton" in a trading app. List every way it can end up with more than one instance or a half-built instance, and rewrite it so it is truly single.</p>
<pre>public class RiskEngine implements Serializable, Cloneable {
    private static RiskEngine instance;
    private Map&lt;String, Double&gt; limits = new HashMap&lt;&gt;();
    private RiskEngine() { }
    public static RiskEngine getInstance() {
        if (instance == null) {
            synchronized (RiskEngine.class) {
                if (instance == null) instance = new RiskEngine();
            }
        }
        return instance;
    }
    @Override public Object clone() throws CloneNotSupportedException { return super.clone(); }
}</pre>`,
    constraints: `Must stay lazily initialised OR justify eager. Limits are read and updated from many threads. Keep the public API <code>getInstance()</code>, <code>setLimit(desk, value)</code>, <code>limit(desk)</code>.`,
    example: `<p>Attacks the fixed version must survive: <code>clone()</code> → <span class="c-r">CloneNotSupportedException</span> (or not cloneable), reflection → <span class="c-r">exception</span>, serialize + deserialize → <span class="c-g">same instance</span>, 32 racing threads → <span class="c-g">one instance</span>.</p>`,
    brute: {
      why: `<p>The original's issues: (1) <b>no volatile</b> on <code>instance</code> → another thread may see a half-constructed object; (2) <b>public clone()</b> returning <code>super.clone()</code> → a second instance (sharing the same map, too!); (3) <b>Serializable without readResolve</b> → every deserialisation creates a new instance; (4) <b>reflection</b> can call the private constructor; (5) the <code>HashMap</code> is mutated from many threads without synchronisation. The truly naive alternative — just using <code>new RiskEngine()</code> wherever needed — gives each desk its own limits, which is a compliance disaster.</p>`,
      code: `
class RiskEngineNaive {
    private final Map<String, Double> limits = new HashMap<>();
    void setLimit(String desk, double v) { limits.put(desk, v); }
    Double limit(String desk) { return limits.get(desk); }
}

class DeskA { RiskEngineNaive engine = new RiskEngineNaive(); }   // its own limits
class DeskB { RiskEngineNaive engine = new RiskEngineNaive(); }   // different limits -> inconsistent risk`
    },
    mcq: { q: 'Which single change fixes clone, reflection AND serialization duplication at once?', options: ['Convert it to enum RiskEngine { INSTANCE; ... }', 'Add volatile to the field', 'Make getInstance() synchronized', 'Mark the class final'], answer: 0, explain: 'Enums cannot be cloned, cannot be created reflectively, and deserialize to the existing constant. Volatile only fixes the publication bug.' },
    hints: [
      `<p>Hint 1: list attack vectors separately: thread race / publication, <code>clone()</code>, serialization, reflection, and the thread-unsafe map inside.</p>`,
      `<p>Hint 2: the enum form fixes the first four at once. If you must keep a class, you need volatile (or holder idiom), no Cloneable, <code>readResolve()</code>, and a constructor guard.</p>`,
      `<p>Hint 3: the internal state must be thread-safe too: <code>ConcurrentHashMap</code>. Prove it with a serialization round-trip and a reflection attempt in <code>main</code>.</p>`
    ],
    solution: {
      approach: `<p>Rewrite as an <b>enum singleton</b> with a <code>ConcurrentHashMap</code> inside. The JVM guarantees: one instance created during class initialisation (thread-safe, safely published), no cloning (<code>Enum.clone()</code> is final and throws), no reflective construction, and serialization by name returns the existing constant. The demo proves the serialization and reflection cases. Eager-ness is acceptable because constructing an empty map is cheap; if construction were expensive, the holder idiom inside a class with <code>readResolve</code> + constructor guard would be the alternative.</p>`,
      code: `
import java.lang.reflect.Constructor;

enum RiskEngine {
    INSTANCE;

    private final Map<String, Double> limits = new ConcurrentHashMap<>();

    static RiskEngine getInstance() { return INSTANCE; }

    void setLimit(String desk, double value) {
        if (value < 0) throw new IllegalArgumentException("limit must be >= 0");
        limits.put(desk, value);
    }

    double limit(String desk) { return limits.getOrDefault(desk, 0.0); }
}

public class Main {
    public static void main(String[] args) throws Exception {
        RiskEngine.getInstance().setLimit("fx", 1_000_000);

        // Serialization round-trip returns the same constant.
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (ObjectOutputStream out = new ObjectOutputStream(bytes)) { out.writeObject(RiskEngine.INSTANCE); }
        try (ObjectInputStream in = new ObjectInputStream(new ByteArrayInputStream(bytes.toByteArray()))) {
            System.out.println("same after deserialize: " + (in.readObject() == RiskEngine.INSTANCE));
        }

        // Reflection cannot create enum constants.
        try {
            Constructor<?> c = RiskEngine.class.getDeclaredConstructors()[0];
            c.setAccessible(true);
            c.newInstance("SECOND", 1);
        } catch (ReflectiveOperationException | IllegalArgumentException e) {
            System.out.println("reflection blocked: " + e.getClass().getSimpleName());
        }
        System.out.println("fx limit = " + RiskEngine.getInstance().limit("fx"));
    }
}`,
      complexity: `<p>All operations O(1). Lock-free reads/writes via <code>ConcurrentHashMap</code>.</p>`,
      followUps: ['Keep it a class with lazy init: write the holder idiom + readResolve + constructor guard version', 'How would you reset the singleton between unit tests, and why is needing that a design smell?']
    }
  });
  practice.push({
    title: 'Name That Pattern: JDK Edition',
    level: 'Medium', tags: ['which pattern', 'jdk', 'pattern recognition'], companies: ['Oracle', 'Amazon', 'Walmart'],
    statement: `<p>For each JDK call, name the creational pattern (or idiom) it uses and explain in one line: <code>Runtime.getRuntime()</code>, <code>Calendar.getInstance()</code>, <code>new StringBuilder().append(..).toString()</code>, <code>Integer.valueOf(42)</code>, <code>new ArrayList&lt;&gt;(otherList)</code>, <code>Executors.newFixedThreadPool(4)</code>, <code>list.iterator()</code>. Then write a small program that demonstrates each one with an observable fact (e.g. identity checks).</p>`,
    constraints: `Use only the standard library. Each demonstration must print a fact that supports your classification (same instance? hidden subclass? copied state?).`,
    example: `<p><code>Runtime.getRuntime() == Runtime.getRuntime()</code> → <span class="c-g">true</span> → <b>Singleton</b>. <code>Calendar.getInstance()</code> returns a <code>GregorianCalendar</code> (or a locale-specific subclass) → <b>factory method</b>, and two calls give <span class="c-g">different</span> objects, so it is <i>not</i> a singleton despite the name.</p>`,
    brute: {
      why: `<p>The naive way to "recognise" patterns is by <b>method names</b>: anything called <code>getInstance</code> is a Singleton, anything with "Factory" is a factory. That is wrong for <code>Calendar.getInstance()</code> (new object each time) and misses <code>iterator()</code> (a factory method with no "factory" in its name). Patterns are recognised by <b>behaviour and structure</b>, not names.</p>`,
      code: `
class NaiveClassifier {
    static String classify(String methodName) {
        if (methodName.contains("getInstance")) return "Singleton";     // wrong for Calendar
        if (methodName.contains("Factory") || methodName.startsWith("new")) return "Factory";
        return "No pattern";                                               // wrong for iterator()
    }
}`
    },
    mcq: { q: 'Integer.valueOf(42) == Integer.valueOf(42) is true, but Integer.valueOf(1000) == Integer.valueOf(1000) is usually false. Which idea explains it?', options: ['A static factory method that caches a range of instances (-128..127)', 'Integer is a Singleton', 'The Builder pattern', 'Prototype cloning'], answer: 0, explain: 'valueOf is a static factory that returns cached instances for small values (a flyweight-like cache) and new objects otherwise.' },
    hints: [
      `<p>Hint 1: to test "Singleton", compare two calls with <code>==</code>. To test "factory hiding a subclass", print <code>getClass().getName()</code>.</p>`,
      `<p>Hint 2: <code>StringBuilder</code> accumulates parts and produces a final immutable <code>String</code> — builder idea. <code>new ArrayList&lt;&gt;(other)</code> creates an object from an existing one — prototype via copy constructor.</p>`,
      `<p>Hint 3: <code>Executors.newFixedThreadPool</code> is a static factory that returns a <code>ThreadPoolExecutor</code>, which itself is an object pool of threads.</p>`
    ],
    solution: {
      approach: `<p>Classification: <b>Runtime.getRuntime()</b> → Singleton (eager). <b>Calendar.getInstance()</b> → factory method choosing a locale-specific subclass, new object per call. <b>StringBuilder</b> → builder idea (accumulate, then <code>toString()</code> builds an immutable String). <b>Integer.valueOf</b> → static factory with caching. <b>new ArrayList&lt;&gt;(other)</b> → prototype by copy constructor (shallow at element level). <b>Executors.newFixedThreadPool</b> → static factory returning an object pool of threads. <b>iterator()</b> → GoF factory method (each collection decides its iterator class). The program prints evidence for each.</p>`,
      code: `
public class Main {
    public static void main(String[] args) throws Exception {
        System.out.println("Runtime singleton: " + (Runtime.getRuntime() == Runtime.getRuntime()));

        Calendar c1 = Calendar.getInstance(), c2 = Calendar.getInstance();
        System.out.println("Calendar factory: " + c1.getClass().getSimpleName() + ", same object? " + (c1 == c2));

        String built = new StringBuilder().append("Hello").append(", ").append("world").toString();
        System.out.println("Builder idea: " + built);

        System.out.println("valueOf cache: " + (Integer.valueOf(42) == Integer.valueOf(42)));

        List<String> original = new ArrayList<>(List.of("a", "b"));
        List<String> copy = new ArrayList<>(original);
        copy.add("c");
        System.out.println("Prototype copy: original=" + original + " copy=" + copy);

        ExecutorService pool = Executors.newFixedThreadPool(2);
        System.out.println("Pool factory returns: " + pool.getClass().getSimpleName());
        pool.shutdown();

        Iterator<String> it = original.iterator();
        System.out.println("Factory method iterator(): " + it.getClass().getName());
    }
}`,
      complexity: `<p>Not an algorithmic problem; each demonstration is O(1). The value is in the reasoning: test behaviour (identity, class, copies) rather than trusting names.</p>`,
      followUps: ['Find a Builder and an Abstract Factory in java.net.http or javax.xml', 'Is Collections.emptyList() a singleton? How would you check?']
    }
  });

  practice.push({
    title: 'Furniture Shop: Abstract Factory for Matching Collections',
    level: 'Medium', tags: ['abstract factory', 'families'], companies: ['IKEA', 'Pepperfry', 'Wayfair', 'Amazon'],
    statement: `<p>An online furniture shop sells <b>Chairs</b> and <b>Sofas</b> in two collections: <b>Modern</b> and <b>Victorian</b>. A "room bundle" must contain one chair and one sofa from the <b>same</b> collection. Each product has <code>describe()</code> and <code>price()</code>. Implement an Abstract Factory, a <code>RoomBundle</code> built from a factory, and show that adding an <b>ArtDeco</b> collection needs no change to <code>RoomBundle</code>.</p>`,
    constraints: `Prices (₹): Modern chair 4,000, sofa 25,000; Victorian chair 7,500, sofa 42,000; ArtDeco chair 6,000, sofa 38,000. Bundles get 10% off the total (integer rupees, round down).`,
    example: `<p><code>new RoomBundle(new ModernFactory()).total()</code> → (4,000 + 25,000) × 0.9 = <span class="c-g">26,100</span>, description "Modern chair + Modern sofa". A bundle can never be "Modern chair + Victorian sofa".</p>`,
    brute: {
      why: `<p>The naive bundle takes two strings and calls <code>new</code> based on each — nothing stops <code>bundle("modern", "victorian")</code>. Every place that builds furniture repeats the if-else, and a new collection touches all of them.</p>`,
      code: `
class ModernChair { int price() { return 4000; } }
class VictorianSofa { int price() { return 42000; } }
class ModernSofa { int price() { return 25000; } }

class BundleNaive {
    int total(String chairStyle, String sofaStyle) {
        int chair = chairStyle.equals("modern") ? new ModernChair().price() : 7500;
        int sofa = sofaStyle.equals("modern") ? new ModernSofa().price() : new VictorianSofa().price();
        return (chair + sofa) * 9 / 10;          // happily mixes styles
    }
}`
    },
    mcq: { q: 'Why does RoomBundle take a FurnitureFactory instead of two style strings?', options: ['One factory can only produce one collection, so mismatches become impossible', 'It is faster', 'Strings cannot be compared in Java', 'To avoid using interfaces'], answer: 0, explain: 'Passing a single family object makes consistency structural rather than relying on callers to pass matching strings.' },
    hints: [
      `<p>Hint 1: abstract products <code>Chair</code> and <code>Sofa</code>; abstract factory <code>FurnitureFactory</code> with <code>createChair()</code> and <code>createSofa()</code>.</p>`,
      `<p>Hint 2: products can be tiny records parameterised by collection name and price; each concrete factory fills in its own values.</p>`,
      `<p>Hint 3: compute the discount with integer math: <code>(chair + sofa) * 90 / 100</code>. ArtDeco = a new factory class only.</p>`
    ],
    solution: {
      approach: `<p>Abstract Factory with one concrete factory per collection. <code>RoomBundle</code> asks a single factory for both pieces, so they always match. Adding ArtDeco is a new row (new factory); <code>RoomBundle</code> and the interfaces stay unchanged.</p>`,
      code: `
interface Chair { String describe(); int price(); }
interface Sofa { String describe(); int price(); }

record SimpleChair(String collection, int price) implements Chair {
    public String describe() { return collection + " chair"; }
}

record SimpleSofa(String collection, int price) implements Sofa {
    public String describe() { return collection + " sofa"; }
}

interface FurnitureFactory {
    Chair createChair();
    Sofa createSofa();
}

class ModernFactory implements FurnitureFactory {
    public Chair createChair() { return new SimpleChair("Modern", 4000); }
    public Sofa createSofa() { return new SimpleSofa("Modern", 25000); }
}

class VictorianFactory implements FurnitureFactory {
    public Chair createChair() { return new SimpleChair("Victorian", 7500); }
    public Sofa createSofa() { return new SimpleSofa("Victorian", 42000); }
}

class ArtDecoFactory implements FurnitureFactory {          // new family: zero edits elsewhere
    public Chair createChair() { return new SimpleChair("ArtDeco", 6000); }
    public Sofa createSofa() { return new SimpleSofa("ArtDeco", 38000); }
}

class RoomBundle {
    private final Chair chair;
    private final Sofa sofa;

    RoomBundle(FurnitureFactory factory) {
        this.chair = factory.createChair();
        this.sofa = factory.createSofa();
    }

    int total() { return (chair.price() + sofa.price()) * 90 / 100; }

    String describe() { return chair.describe() + " + " + sofa.describe(); }
}

public class Main {
    public static void main(String[] args) {
        for (FurnitureFactory f : List.of(new ModernFactory(), new VictorianFactory(), new ArtDecoFactory())) {
            RoomBundle b = new RoomBundle(f);
            System.out.println(b.describe() + " = Rs " + b.total());
        }
    }
}`,
      complexity: `<p>O(1) per bundle. New collection: one factory class. New product type (Table): edit the interface and every factory — the known trade-off.</p>`,
      followUps: ['Add a Table product with a default method so old factories still compile', 'Load collections from a database instead of classes (hint: Prototype registry)']
    }
  });

  practice.push({
    title: 'User Profile Builder with Required Fields and toBuilder()',
    level: 'Medium', tags: ['builder', 'validation', 'immutability'], companies: ['Meta', 'LinkedIn', 'Instagram', 'ShareChat'],
    statement: `<p>Implement an immutable <code>UserProfile</code> with a Builder. Required: <code>username</code> (3-20 chars, letters/digits/underscore) and <code>email</code> (must contain exactly one <code>@</code>). Optional: <code>phone</code>, <code>age</code> (13-120), <code>interests</code> (repeatable, max 10, duplicates ignored, order kept), <code>marketingOptIn</code> (default false). Rule: users under 18 cannot opt in to marketing. Add <code>toBuilder()</code> so an "edit profile" screen can change one field and build a new profile.</p>`,
    constraints: `Single-field errors → IllegalArgumentException at the setter; cross-field errors → IllegalStateException in build(). The built profile's interests must be unmodifiable.`,
    example: `<p><code>UserProfile.builder("asha_k", "asha@mail.com").age(16).interest("chess").interest("chess").build()</code> → <span class="c-g">asha_k, 16, [chess], optIn=false</span>. Adding <code>.marketingOptIn(true)</code> → <span class="c-r">IllegalStateException: under-18 users cannot opt in</span>.</p>`,
    brute: {
      why: `<p>The naive class is a mutable JavaBean with a no-arg constructor and setters: profiles can exist without a username, validation is scattered across controllers, a 16-year-old can be opted in if the setters are called in the "wrong" order, and anyone holding the profile can mutate it later.</p>`,
      code: `
class UserProfileNaive {
    private String username, email, phone;
    private int age;
    private boolean marketingOptIn;
    private List<String> interests = new ArrayList<>();

    public void setUsername(String u) { username = u; }
    public void setEmail(String e) { email = e; }
    public void setAge(int a) { age = a; }
    public void setMarketingOptIn(boolean b) { marketingOptIn = b; }   // no age check anywhere
    public List<String> getInterests() { return interests; }          // leaks mutable list
}`
    },
    mcq: { q: 'Why use a LinkedHashSet for interests inside the builder?', options: ['It ignores duplicates while keeping insertion order', 'It sorts interests alphabetically', 'It is thread-safe', 'It is required by the Builder pattern'], answer: 0, explain: 'LinkedHashSet gives set semantics (no duplicates) and predictable iteration order, matching the requirements.' },
    hints: [
      `<p>Hint 1: put required fields in <code>builder(username, email)</code> so they can never be missing.</p>`,
      `<p>Hint 2: validate username with a regex <code>[A-Za-z0-9_]{3,20}</code>, email with <code>indexOf('@') == lastIndexOf('@')</code> and &gt; 0. Age range in the setter.</p>`,
      `<p>Hint 3: in <code>build()</code> check the age/opt-in rule (age unknown = treat as adult? state your assumption). <code>toBuilder()</code> creates a builder pre-filled with every field.</p>`
    ],
    solution: {
      approach: `<p>Builder with a required-args entry point, field validation in setters, cross-field validation in <code>build()</code>, and an immutable product with <code>List.copyOf</code>. Assumption: unknown age is allowed to opt in only if age was never set (stated explicitly; many products would require age instead). <code>toBuilder()</code> copies every field into a fresh builder so edits create a new immutable profile.</p>`,
      code: `
final class UserProfile {
    private final String username, email, phone;
    private final Integer age;
    private final List<String> interests;
    private final boolean marketingOptIn;

    private UserProfile(Builder b) {
        username = b.username; email = b.email; phone = b.phone; age = b.age;
        interests = List.copyOf(b.interests);
        marketingOptIn = b.marketingOptIn;
    }

    static Builder builder(String username, String email) { return new Builder(username, email); }

    Builder toBuilder() {
        Builder b = new Builder(username, email);
        b.phone = phone; b.age = age; b.interests.addAll(interests); b.marketingOptIn = marketingOptIn;
        return b;
    }

    public String toString() {
        return username + ", " + email + ", age=" + age + ", " + interests + ", optIn=" + marketingOptIn;
    }

    static final class Builder {
        private final String username, email;
        private String phone;
        private Integer age;
        private final Set<String> interests = new LinkedHashSet<>();
        private boolean marketingOptIn = false;

        private Builder(String username, String email) {
            if (username == null || !username.matches("[A-Za-z0-9_]{3,20}"))
                throw new IllegalArgumentException("username must be 3-20 letters, digits or _");
            if (email == null || email.indexOf('@') <= 0 || email.indexOf('@') != email.lastIndexOf('@'))
                throw new IllegalArgumentException("invalid email");
            this.username = username;
            this.email = email;
        }

        Builder phone(String p) { this.phone = Objects.requireNonNull(p); return this; }

        Builder age(int a) {
            if (a < 13 || a > 120) throw new IllegalArgumentException("age must be 13-120");
            this.age = a;
            return this;
        }

        Builder interest(String i) {
            if (!interests.contains(i) && interests.size() == 10) throw new IllegalArgumentException("max 10 interests");
            interests.add(Objects.requireNonNull(i));
            return this;
        }

        Builder marketingOptIn(boolean v) { this.marketingOptIn = v; return this; }

        UserProfile build() {
            if (marketingOptIn && age != null && age < 18)
                throw new IllegalStateException("under-18 users cannot opt in");
            return new UserProfile(this);
        }
    }
}

public class Main {
    public static void main(String[] args) {
        UserProfile p = UserProfile.builder("asha_k", "asha@mail.com").age(16).interest("chess").interest("chess").build();
        System.out.println(p);
        try {
            p.toBuilder().marketingOptIn(true).build();
        } catch (IllegalStateException e) {
            System.out.println("rejected: " + e.getMessage());
        }
        UserProfile older = p.toBuilder().age(19).marketingOptIn(true).build();
        System.out.println(older);
    }
}`,
      complexity: `<p>Each setter O(1); <code>build()</code> O(I) to copy I interests; <code>toBuilder()</code> O(I).</p>`,
      followUps: ['Make age mandatory when marketingOptIn is true', 'How would Lombok @Builder(toBuilder = true) with @Singular reduce this code, and what validation would you still write?']
    }
  });

  practice.push({
    title: 'Document Template Registry (Prototype)',
    level: 'Medium', tags: ['prototype', 'registry', 'deep copy'], companies: ['Google', 'Notion', 'Zoho', 'Atlassian'],
    statement: `<p>A docs app offers templates: <b>"meeting-notes"</b> (sections Agenda, Notes, Action Items) and <b>"invoice"</b> (sections Bill To, Items, Total). Creating a template from scratch is expensive (it loads styles and fonts — simulate with a counter). Build a <code>TemplateRegistry</code> that stores prototypes and returns <b>independent</b> copies via <code>create(name, title)</code>. Users may then add sections or edit section text without affecting the stored template or other documents.</p>`,
    constraints: `A <code>Document</code> has <code>title</code>, <code>List&lt;Section&gt;</code> (each Section has mutable <code>heading</code> and <code>body</code>), and a <code>Style</code> object that is immutable and heavy (share it). Unknown template → IllegalArgumentException.`,
    example: `<p>Create two meeting-notes docs, add "Decisions" to the first and write in its Notes body. The second doc and the registry template still have <span class="c-g">3 sections with empty bodies</span>, and the expensive style was loaded <span class="c-g">once per template</span>, not once per document.</p>`,
    brute: {
      why: `<p>The naive approach calls <code>new Document(...)</code> and rebuilds sections and styles for every document — the expensive style loading runs every time and the template's structure is duplicated in code. A slightly smarter but buggy approach returns the same template object (or a shallow copy), so edits by one user appear in everyone's documents.</p>`,
      code: `
class Section { String heading, body = ""; Section(String h) { heading = h; } }

class DocumentNaive {
    static int styleLoads = 0;
    String title;
    List<Section> sections = new ArrayList<>();

    DocumentNaive(String title, String... headings) {
        this.title = title;
        styleLoads++;                                  // expensive style/font load EVERY time
        for (String h : headings) sections.add(new Section(h));
    }
}`
    },
    mcq: { q: 'Which part of Document should be SHARED between copies?', options: ['The immutable heavy Style', 'The List of sections', 'Each Section object', 'Nothing — share nothing ever'], answer: 0, explain: 'Immutable, heavy data is safe and efficient to share (Flyweight-like); mutable sections must be copied.' },
    hints: [
      `<p>Hint 1: give <code>Section</code> and <code>Document</code> copy constructors. Decide per field: Style → share, List and Sections → copy.</p>`,
      `<p>Hint 2: the registry holds <code>Map&lt;String, Document&gt;</code> prototypes built once; <code>create</code> copies and sets the title.</p>`,
      `<p>Hint 3: count style loads with a static counter in the Style constructor to prove they happen only at registration time.</p>`
    ],
    solution: {
      approach: `<p>Prototype registry. Templates are built once (style loaded once). <code>create</code> deep-copies the section list and each <code>Section</code>, shares the immutable <code>Style</code>, and sets the new title. Documents are independent of each other and of the template.</p>`,
      code: `
final class Style {
    static int loads = 0;
    final String font;
    Style(String font) { this.font = font; loads++; }   // expensive in real life
}

final class Section {
    String heading, body = "";
    Section(String heading) { this.heading = heading; }
    Section(Section o) { this.heading = o.heading; this.body = o.body; }
}

final class Document {
    String title;
    final List<Section> sections;
    final Style style;

    Document(String title, Style style, String... headings) {
        this.title = title;
        this.style = style;
        this.sections = new ArrayList<>();
        for (String h : headings) sections.add(new Section(h));
    }

    Document(Document o) {
        this.title = o.title;
        this.style = o.style;                                   // immutable + heavy: share
        this.sections = new ArrayList<>();
        for (Section s : o.sections) sections.add(new Section(s));   // deep copy
    }

    public String toString() {
        StringBuilder sb = new StringBuilder(title + " [" + style.font + "]");
        for (Section s : sections) sb.append(" | ").append(s.heading).append(": '").append(s.body).append("'");
        return sb.toString();
    }
}

final class TemplateRegistry {
    private final Map<String, Document> prototypes = new HashMap<>();

    void register(String name, Document prototype) { prototypes.put(name, prototype); }

    Document create(String name, String title) {
        Document proto = prototypes.get(name);
        if (proto == null) throw new IllegalArgumentException("no template " + name);
        Document d = new Document(proto);
        d.title = title;
        return d;
    }
}

public class Main {
    public static void main(String[] args) {
        TemplateRegistry reg = new TemplateRegistry();
        reg.register("meeting-notes", new Document("Meeting", new Style("Inter"), "Agenda", "Notes", "Action Items"));
        reg.register("invoice", new Document("Invoice", new Style("Roboto Mono"), "Bill To", "Items", "Total"));

        Document a = reg.create("meeting-notes", "Sprint 12 planning");
        Document b = reg.create("meeting-notes", "Design review");
        a.sections.add(new Section("Decisions"));
        a.sections.get(1).body = "Ship on Friday";

        System.out.println(a);
        System.out.println(b);
        System.out.println("style loads = " + Style.loads);       // 2 (one per template)
    }
}`,
      complexity: `<p><code>create</code>: O(S) for S sections. Style loading: once per template instead of once per document.</p>`,
      followUps: ['Let users save their own document as a new template', 'Sections can contain nested sub-sections: adapt the deep copy']
    }
  });

  practice.push({
    title: 'Notification Sender with a Factory Method and Retry Template',
    level: 'Medium', tags: ['factory method', 'template method', 'inheritance'], companies: ['Twilio', 'Freshworks', 'Swiggy', 'Uber'],
    statement: `<p>Write an abstract class <code>NotificationSender</code> with a final method <code>String deliver(String to, String msg)</code> that: validates the recipient, obtains a channel via an abstract <b>factory method</b> <code>createChannel()</code>, tries to send up to 3 times, and returns a status string. Implement <code>EmailSender</code> and <code>SmsSender</code> (SMS truncates messages to 160 chars). Channels are simulated; a test channel fails the first N attempts.</p>`,
    constraints: `Recipient must be non-blank. Each attempt calls <code>channel.send</code>, which returns true/false. After 3 failures return <code>"FAILED after 3 attempts"</code>. The retry logic must exist in exactly one place.`,
    example: `<p><code>new SmsSender().deliver("+9198...", 200-char text)</code> → <span class="c-g">"SENT via SMS on attempt 1 (160 chars)"</span>. A sender whose channel fails twice → <span class="c-g">"SENT via TEST on attempt 3 ..."</span>; fails 5 times → <span class="c-r">"FAILED after 3 attempts"</span>.</p>`,
    brute: {
      why: `<p>The naive version has <code>EmailService</code> and <code>SmsService</code>, each with its own copy of validation + retry loop + <code>new SmtpChannel()</code>/<code>new SmsGatewayChannel()</code>. A bug fix to the retry logic must be applied twice (and usually only gets applied once).</p>`,
      code: `
class EmailServiceNaive {
    String deliver(String to, String msg) {
        for (int attempt = 1; attempt <= 3; attempt++) {
            if (new SmtpChannelNaive().send(to, msg)) return "SENT via EMAIL on attempt " + attempt;
        }
        return "FAILED";
    }
}

class SmtpChannelNaive { boolean send(String to, String msg) { return true; } }
// SmsServiceNaive duplicates the same loop with new SmsChannelNaive() ...`
    },
    mcq: { q: 'Why is deliver() declared final?', options: ['So subclasses can only vary the product (channel), not the shared workflow', 'Final methods run faster', 'Abstract classes require it', 'To allow multiple inheritance'], answer: 0, explain: 'The template workflow (validate, retry, report) must be identical for all senders; subclasses customise only createChannel().' },
    hints: [
      `<p>Hint 1: this is Factory Method inside a Template Method: the parent's algorithm calls <code>createChannel()</code>, which subclasses implement.</p>`,
      `<p>Hint 2: define <code>interface Channel { String name(); boolean send(String to, String msg); }</code>. SMS truncation belongs in a protected hook or in the SMS channel itself.</p>`,
      `<p>Hint 3: for testing, an anonymous subclass of <code>NotificationSender</code> can return a channel with a failure counter.</p>`
    ],
    solution: {
      approach: `<p>The parent class owns the workflow (validate → create channel → prepare text → retry loop → status). Subclasses override only <code>createChannel()</code> (the factory method) and optionally the <code>prepare</code> hook. Testing uses an anonymous subclass returning a flaky channel, which also demonstrates the "subclass and override" seam.</p>`,
      code: `
interface Channel {
    String name();
    boolean send(String to, String msg);
}

abstract class NotificationSender {
    private static final int MAX_ATTEMPTS = 3;

    protected abstract Channel createChannel();              // FACTORY METHOD

    protected String prepare(String msg) { return msg; }      // optional hook

    final String deliver(String to, String msg) {
        if (to == null || to.isBlank()) throw new IllegalArgumentException("recipient required");
        Channel channel = createChannel();
        String text = prepare(msg);
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            if (channel.send(to, text)) {
                return "SENT via " + channel.name() + " on attempt " + attempt + " (" + text.length() + " chars)";
            }
        }
        return "FAILED after " + MAX_ATTEMPTS + " attempts";
    }
}

class EmailSender extends NotificationSender {
    protected Channel createChannel() {
        return new Channel() {
            public String name() { return "EMAIL"; }
            public boolean send(String to, String msg) { return to.contains("@"); }
        };
    }
}

class SmsSender extends NotificationSender {
    protected Channel createChannel() {
        return new Channel() {
            public String name() { return "SMS"; }
            public boolean send(String to, String msg) { return to.startsWith("+"); }
        };
    }

    @Override protected String prepare(String msg) { return msg.length() <= 160 ? msg : msg.substring(0, 160); }
}

public class Main {
    static NotificationSender flaky(int failures) {
        return new NotificationSender() {
            protected Channel createChannel() {
                int[] left = {failures};
                return new Channel() {
                    public String name() { return "TEST"; }
                    public boolean send(String to, String msg) { return left[0]-- <= 0; }
                };
            }
        };
    }

    public static void main(String[] args) {
        System.out.println(new SmsSender().deliver("+919800000000", "x".repeat(200)));
        System.out.println(new EmailSender().deliver("asha@mail.com", "Your order shipped"));
        System.out.println(flaky(2).deliver("anyone", "hi"));
        System.out.println(flaky(5).deliver("anyone", "hi"));
    }
}`,
      complexity: `<p>O(attempts) per delivery (≤ 3). Adding a channel: one subclass overriding <code>createChannel()</code>.</p>`,
      followUps: ['Add exponential backoff between attempts without touching subclasses', 'When would you prefer composition (inject a ChannelFactory) over this inheritance-based design?']
    }
  });

  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'Step Builder: Compile-Time Required Fields for an Email',
    level: 'Hard', tags: ['builder', 'step builder', 'type safety'], companies: ['Google', 'Microsoft', 'Stripe'],
    statement: `<p>Design an <code>Email</code> builder where forgetting a required field is a <b>compile error</b>, not a runtime exception. Required, in order: <code>from</code>, at least one <code>to</code>, <code>subject</code>. Then optional in any order: more <code>to</code>, <code>cc</code>, <code>body</code>, <code>attachment</code> (max 5), then <code>build()</code>. <code>Email.builder().from("a@x.com").subject("Hi").build()</code> must not compile (no <code>to</code>).</p>`,
    constraints: `Addresses must contain '@' (runtime check). Body defaults to empty string. Built Email is immutable. Use interfaces for steps and a single private implementation class.`,
    example: `<p><code>Email.builder().from("ops@x.com").to("asha@x.com").subject("Deploy").cc("lead@x.com").body("Done").build()</code> → <span class="c-g">Email[from=ops@x.com, to=[asha@x.com], cc=[lead@x.com], subject=Deploy, attachments=0]</span>. Calling <code>.subject(..)</code> right after <code>.from(..)</code> is <span class="c-r">a compile error</span>: the <code>FromStep</code>'s result type only has <code>to(..)</code>.</p>`,
    brute: {
      why: `<p>A classic builder accepts calls in any order and checks required fields only in <code>build()</code>, so a missing <code>to</code> is discovered at runtime — maybe in production for a rarely used email. The truly naive version is a constructor <code>new Email(from, to, cc, subject, body, attachments)</code> where nulls and argument order are both error-prone.</p>`,
      code: `
class EmailNaive {
    final String from, subject, body;
    final List<String> to, cc;

    EmailNaive(String from, List<String> to, List<String> cc, String subject, String body) {
        this.from = from; this.to = to; this.cc = cc; this.subject = subject; this.body = body;   // nulls welcome
    }
}

class Sender {
    EmailNaive make() { return new EmailNaive("ops@x.com", null, null, "Deploy", null); }   // compiles, broken
}`
    },
    mcq: { q: 'What makes a step builder enforce order at compile time?', options: ['Each step method returns a different interface exposing only the next allowed methods', 'Annotations on the fields', 'A runtime state machine', 'Making build() private'], answer: 0, explain: 'The type returned by each step limits what the compiler lets you call next.' },
    hints: [
      `<p>Hint 1: interfaces <code>FromStep</code> (from → ToStep), <code>ToStep</code> (to → SubjectStep), <code>SubjectStep</code> (subject → OptionalStep), <code>OptionalStep</code> (to, cc, body, attachment → OptionalStep; build → Email).</p>`,
      `<p>Hint 2: one private static class <code>Steps</code> implements all four interfaces and holds the mutable state; <code>Email.builder()</code> returns it typed as <code>FromStep</code>.</p>`,
      `<p>Hint 3: runtime checks still matter for values ('@' present, attachment limit). Copy lists with <code>List.copyOf</code> in the Email constructor.</p>`
    ],
    solution: {
      approach: `<p><b>Step builder.</b> The public entry returns <code>FromStep</code>; its only method returns <code>ToStep</code>, whose only method returns <code>SubjectStep</code>, which returns <code>OptionalStep</code>. Only <code>OptionalStep</code> has <code>build()</code>, so the compiler guarantees from, to and subject were provided in that order. One private class implements all steps (no extra allocations). Values are still validated at runtime, and the product is immutable.</p>`,
      code: `
final class Email {
    interface FromStep { ToStep from(String address); }
    interface ToStep { SubjectStep to(String address); }
    interface SubjectStep { OptionalStep subject(String subject); }
    interface OptionalStep {
        OptionalStep to(String address);
        OptionalStep cc(String address);
        OptionalStep body(String body);
        OptionalStep attachment(String fileName);
        Email build();
    }

    private final String from, subject, body;
    private final List<String> to, cc, attachments;

    private Email(Steps s) {
        from = s.from; subject = s.subject; body = s.body;
        to = List.copyOf(s.to); cc = List.copyOf(s.cc); attachments = List.copyOf(s.attachments);
    }

    static FromStep builder() { return new Steps(); }

    @Override public String toString() {
        return "Email[from=" + from + ", to=" + to + ", cc=" + cc + ", subject=" + subject + ", attachments=" + attachments.size() + "]";
    }

    private static final class Steps implements FromStep, ToStep, SubjectStep, OptionalStep {
        private String from, subject, body = "";
        private final List<String> to = new ArrayList<>(), cc = new ArrayList<>(), attachments = new ArrayList<>();

        private static String checked(String address) {
            if (address == null || !address.contains("@")) throw new IllegalArgumentException("bad address: " + address);
            return address;
        }

        public ToStep from(String a) { from = checked(a); return this; }
        public OptionalStep subject(String s) { subject = Objects.requireNonNull(s); return this; }
        public Steps to(String a) { to.add(checked(a)); return this; }   // Steps is both a SubjectStep and an OptionalStep
        public OptionalStep cc(String a) { cc.add(checked(a)); return this; }
        public OptionalStep body(String b) { body = Objects.requireNonNull(b); return this; }
        public OptionalStep attachment(String f) {
            if (attachments.size() == 5) throw new IllegalArgumentException("max 5 attachments");
            attachments.add(Objects.requireNonNull(f));
            return this;
        }
        public Email build() { return new Email(this); }
    }
}

public class Main {
    public static void main(String[] args) {
        Email e = Email.builder()
            .from("ops@x.com")
            .to("asha@x.com")
            .subject("Deploy")
            .cc("lead@x.com")
            .body("Done")
            .build();
        System.out.println(e);
        // Email.builder().from("ops@x.com").subject("Hi");   <- does not compile: ToStep has no subject()
    }
}`,
      complexity: `<p>O(1) per step; <code>build()</code> O(T + C + A) for the list copies. Zero runtime cost for the ordering guarantee — it is all in the types.</p>`,
      followUps: ['The single to() method satisfies ToStep (returns SubjectStep) and OptionalStep (returns OptionalStep) by returning Steps, which implements both. Explain why covariant return types make this legal', 'When is a step builder overkill?']
    }
  });

  practice.push({
    title: 'Multiton: Exactly One Lazy Instance per Tenant',
    level: 'Hard', tags: ['singleton', 'multiton', 'concurrency', 'computeIfAbsent'], companies: ['Salesforce', 'Atlassian', 'Shopify', 'Freshworks'],
    statement: `<p>A SaaS app needs one <code>TenantContext</code> per tenant (it loads tenant settings — expensive, simulate with a sleep and a counter). Implement <code>TenantContext.of(String tenantId)</code> so that: each tenant's context is created <b>lazily</b>, <b>exactly once</b> even when 100 threads ask for the same new tenant at the same time; different tenants do not block each other while being created; at most <code>MAX_TENANTS</code> contexts exist (throw beyond that); and <code>evict(tenantId)</code> removes one.</p>`,
    constraints: `Tenant IDs: 1-32 chars [a-z0-9-]. MAX_TENANTS = 1000. Creation takes ~50 ms. Reads of existing tenants must be lock-free.`,
    example: `<p>100 threads call <code>of("acme")</code> together → the constructor runs <span class="c-g">once</span>; all get the same object. A thread asking for <code>"globex"</code> at the same time is <span class="c-g">not blocked</span> by acme's creation. After <code>evict("acme")</code>, the next <code>of("acme")</code> creates a fresh context.</p>`,
    brute: {
      why: `<p>Naive approach 1: <code>new TenantContext(id)</code> per request → settings reloaded on every request. Naive approach 2: a <code>HashMap</code> with check-then-put → two threads both see "missing" and both create (double load, inconsistent caches), and <code>HashMap</code> can be corrupted by concurrent writes. Naive approach 3: one global <code>synchronized</code> method → correct but every tenant's creation blocks every other tenant.</p>`,
      code: `
class TenantContextNaive {
    private static final Map<String, TenantContextNaive> CACHE = new HashMap<>();
    final String id;

    private TenantContextNaive(String id) { this.id = id; /* expensive load */ }

    static TenantContextNaive of(String id) {
        TenantContextNaive c = CACHE.get(id);           // check...
        if (c == null) {
            c = new TenantContextNaive(id);             // ...then act: two threads both create
            CACHE.put(id, c);                           // unsynchronised HashMap write
        }
        return c;
    }
}`
    },
    mcq: { q: 'Why is ConcurrentHashMap.computeIfAbsent a good fit here?', options: ['It runs the creation function at most once per key atomically, locking only that key\'s bin', 'It locks the entire map during creation', 'It never calls the function', 'It is the same as get() then put()'], answer: 0, explain: 'computeIfAbsent is atomic per key; other keys in different bins proceed in parallel. Keep the function short and never modify the map inside it.' },
    hints: [
      `<p>Hint 1: this is a <b>Multiton</b>: a Singleton per key. The registry is a <code>ConcurrentHashMap&lt;String, TenantContext&gt;</code>.</p>`,
      `<p>Hint 2: <code>computeIfAbsent</code> guarantees one creation per key. To avoid holding the map's bin lock during a 50 ms load, store a lightweight holder (e.g. a <code>FutureTask</code> or memoizing wrapper) and run the expensive part outside.</p>`,
      `<p>Hint 3: enforce the cap before inserting new keys (an <code>AtomicInteger</code> counter or checking size; explain the small race and how you handle it), and make <code>evict</code> a <code>remove</code>.</p>`
    ],
    solution: {
      approach: `<p><b>Multiton with per-key futures.</b> The map stores <code>FutureTask&lt;TenantContext&gt;</code>. <code>computeIfAbsent</code> inserts a not-yet-run task atomically (cheap, so the bin lock is held only briefly). The thread whose task was inserted runs it; everyone else calls <code>get()</code> on the same future and waits only for <b>that</b> tenant. Existing tenants are served by a lock-free <code>get</code> + completed future. A counter enforces the cap; if creation fails, the entry is removed so a later call can retry. <code>evict</code> removes the entry and decrements the counter.</p>`,
      code: `
final class TenantContext {
    static final int MAX_TENANTS = 1000;
    static final AtomicInteger LOADS = new AtomicInteger();
    private static final ConcurrentHashMap<String, FutureTask<TenantContext>> REGISTRY = new ConcurrentHashMap<>();
    private static final AtomicInteger COUNT = new AtomicInteger();

    final String tenantId;
    final Map<String, String> settings;

    private TenantContext(String tenantId) {
        this.tenantId = tenantId;
        LOADS.incrementAndGet();
        try { Thread.sleep(50); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }  // slow load
        this.settings = Map.of("plan", "pro", "region", "ap-south-1");
    }

    static TenantContext of(String tenantId) {
        if (tenantId == null || !tenantId.matches("[a-z0-9-]{1,32}")) throw new IllegalArgumentException("bad tenant id");
        FutureTask<TenantContext> task = REGISTRY.get(tenantId);          // lock-free fast path
        if (task == null) {
            FutureTask<TenantContext> mine = new FutureTask<>(() -> new TenantContext(tenantId));
            task = REGISTRY.computeIfAbsent(tenantId, k -> {
                if (COUNT.incrementAndGet() > MAX_TENANTS) {
                    COUNT.decrementAndGet();
                    throw new IllegalStateException("tenant limit reached");
                }
                return mine;                                               // cheap: nothing runs yet
            });
            if (task == mine) mine.run();                                  // only the inserting thread loads
        }
        try {
            return task.get();                                             // others wait for THIS tenant only
        } catch (ExecutionException e) {
            if (REGISTRY.remove(tenantId, task)) COUNT.decrementAndGet();  // allow retry later
            throw new IllegalStateException("failed to load tenant " + tenantId, e.getCause());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("interrupted", e);
        }
    }

    static void evict(String tenantId) {
        if (REGISTRY.remove(tenantId) != null) COUNT.decrementAndGet();
    }
}

public class Main {
    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(32);
        CountDownLatch go = new CountDownLatch(1);
        Set<TenantContext> seen = ConcurrentHashMap.newKeySet();
        List<Future<?>> fs = new ArrayList<>();
        for (int i = 0; i < 100; i++) {
            String id = i % 10 == 0 ? "globex" : "acme";
            fs.add(pool.submit(() -> { go.await(); seen.add(TenantContext.of(id)); return null; }));
        }
        go.countDown();
        for (Future<?> f : fs) f.get();
        pool.shutdown();
        System.out.println("distinct contexts = " + seen.size() + ", loads = " + TenantContext.LOADS.get());   // 2, 2
        TenantContext.evict("acme");
        System.out.println("after evict, new acme? " + !seen.contains(TenantContext.of("acme")));
    }
}`,
      complexity: `<p>Existing tenant: O(1) lock-free read. New tenant: one load per key; concurrent callers for the same key wait on its future; other keys proceed in parallel. Memory O(T) for T tenants.</p>`,
      followUps: ['Replace the hard cap with LRU eviction (e.g. Caffeine) — what changes?', 'Why must the function passed to computeIfAbsent never do slow I/O or touch the same map?', 'How does this relate to Spring\'s request/session scopes?']
    }
  });

  practice.push({
    title: 'Mini DI Container with Singleton and Prototype Scopes',
    level: 'Hard', tags: ['factory', 'singleton', 'prototype scope', 'dependency injection'], companies: ['VMware', 'Google', 'Amazon', 'Red Hat'],
    statement: `<p>Build a tiny dependency-injection container — the thing Spring does for you. API: <code>&lt;T&gt; void bind(Class&lt;T&gt; type, Function&lt;Container, T&gt; factory, Scope scope)</code> and <code>&lt;T&gt; T get(Class&lt;T&gt; type)</code>. <b>SINGLETON</b> scope: the factory runs at most once (lazily, thread-safe) and every <code>get</code> returns that object. <b>PROTOTYPE</b> scope: every <code>get</code> runs the factory again. Factories can call <code>c.get(...)</code> to obtain their own dependencies. Detect missing bindings and <b>circular dependencies</b> (A needs B needs A) with a clear error.</p>`,
    constraints: `Up to 500 bindings. get() may be called from many threads. Circular dependency detection must report the cycle path, e.g. <code>A -&gt; B -&gt; A</code>.`,
    example: `<p>Bind <code>Clock</code> as SINGLETON, <code>OrderService</code> as PROTOTYPE whose factory does <code>new OrderService(c.get(Clock.class))</code>. Two <code>get(OrderService.class)</code> calls → <span class="c-g">two different services sharing one Clock</span>. Binding A→B and B→A then <code>get(A.class)</code> → <span class="c-r">IllegalStateException: circular dependency A -&gt; B -&gt; A</span>.</p>`,
    brute: {
      why: `<p>Without a container, each class builds its own dependencies with <code>new</code> deep inside constructors: object graphs are wired in hundreds of places, "singletons" are duplicated by accident (each service makes its own Clock or connection pool), and swapping an implementation for tests means editing constructors. Scope rules live nowhere.</p>`,
      code: `
class Clock { long now() { return System.currentTimeMillis(); } }

class OrderService {
    private final Clock clock = new Clock();           // each service builds its own
}

class InvoiceService {
    private final Clock clock = new Clock();           // a second Clock: "singleton" duplicated
    private final OrderService orders = new OrderService();   // hard-wired, untestable
}`
    },
    mcq: { q: 'Two threads call get(Db.class) for a SINGLETON binding at the same time for the first time. What must the container guarantee?', options: ['The factory runs once and both threads receive the same instance', 'Each thread gets its own instance', 'One thread gets null', 'The second call throws'], answer: 0, explain: 'Singleton scope means one instance per container: creation must be synchronised (or memoised atomically).' },
    hints: [
      `<p>Hint 1: store a <code>Binding</code> per type: factory, scope, and for singletons a cached instance. The container is itself a <b>registry factory</b>.</p>`,
      `<p>Hint 2: for thread-safe lazy singletons, synchronise creation per binding (double-checked with a volatile field, or a lock per binding). Do not hold a global lock while a factory runs other <code>get</code>s.</p>`,
      `<p>Hint 3: for cycle detection, keep a <code>ThreadLocal&lt;Deque&lt;Class&lt;?&gt;&gt;&gt;</code> of types currently being built by this thread; if <code>get(X)</code> finds X already on the stack, report the path from X to X.</p>`
    ],
    solution: {
      approach: `<p>The container is a map from <code>Class</code> to <code>Binding</code>. <code>get</code> looks up the binding (missing → clear error), pushes the type onto a per-thread "currently creating" stack (finding it already there → cycle error with the path), then either runs the factory (PROTOTYPE) or returns the cached singleton, creating it under the binding's own lock with double-checked locking on a volatile field (SINGLETON). The type is popped in <code>finally</code>. Factories receive the container, so dependencies resolve recursively — this is exactly how DI containers combine Factory, Singleton and Prototype.</p>`,
      code: `
enum Scope { SINGLETON, PROTOTYPE }

final class Container {
    private static final class Binding<T> {
        final Function<Container, T> factory;
        final Scope scope;
        volatile T instance;                          // only used for SINGLETON
        Binding(Function<Container, T> factory, Scope scope) { this.factory = factory; this.scope = scope; }
    }

    private final Map<Class<?>, Binding<?>> bindings = new ConcurrentHashMap<>();
    private final ThreadLocal<Deque<Class<?>>> creating = ThreadLocal.withInitial(ArrayDeque::new);

    <T> void bind(Class<T> type, Function<Container, T> factory, Scope scope) {
        if (bindings.putIfAbsent(type, new Binding<>(factory, scope)) != null) {
            throw new IllegalStateException("already bound: " + type.getSimpleName());
        }
    }

    @SuppressWarnings("unchecked")
    <T> T get(Class<T> type) {
        Binding<T> b = (Binding<T>) bindings.get(type);
        if (b == null) throw new IllegalStateException("no binding for " + type.getSimpleName());
        if (b.scope == Scope.SINGLETON && b.instance != null) return b.instance;   // fast path

        Deque<Class<?>> stack = creating.get();
        if (stack.contains(type)) {
            StringBuilder path = new StringBuilder();
            boolean inCycle = false;
            for (Iterator<Class<?>> it = stack.descendingIterator(); it.hasNext(); ) {
                Class<?> c = it.next();
                if (c == type) inCycle = true;
                if (inCycle) path.append(c.getSimpleName()).append(" -> ");
            }
            throw new IllegalStateException("circular dependency " + path + type.getSimpleName());
        }
        stack.push(type);
        try {
            if (b.scope == Scope.PROTOTYPE) return b.factory.apply(this);
            synchronized (b) {                                   // per-binding lock
                if (b.instance == null) b.instance = b.factory.apply(this);
                return b.instance;
            }
        } finally {
            stack.pop();
        }
    }
}

class Clock { long now() { return 42L; } }
class OrderService {
    final Clock clock;
    OrderService(Clock clock) { this.clock = clock; }
}
class A { A(B b) { } }
class B { B(A a) { } }

public class Main {
    public static void main(String[] args) {
        Container c = new Container();
        c.bind(Clock.class, k -> new Clock(), Scope.SINGLETON);
        c.bind(OrderService.class, k -> new OrderService(k.get(Clock.class)), Scope.PROTOTYPE);

        OrderService s1 = c.get(OrderService.class), s2 = c.get(OrderService.class);
        System.out.println("different services: " + (s1 != s2) + ", shared clock: " + (s1.clock == s2.clock));

        c.bind(A.class, k -> new A(k.get(B.class)), Scope.SINGLETON);
        c.bind(B.class, k -> new B(k.get(A.class)), Scope.SINGLETON);
        try {
            c.get(A.class);
        } catch (IllegalStateException e) {
            System.out.println(e.getMessage());          // circular dependency A -> B -> A
        }
    }
}`,
      complexity: `<p><code>get</code>: O(1) lookup + O(D) cycle check for current creation depth D; singleton fast path is one volatile read. Memory O(bindings).</p>`,
      followUps: ['Two threads build singletons A and B that depend on each other in opposite orders: can the per-binding locks deadlock? How do real containers avoid it (eager creation at startup)?', 'Add constructor injection by reflection instead of explicit factories', 'Add a request scope']
    }
  });

  practice.push({
    title: 'Size-Class Buffer Pool (Netty-style)',
    level: 'Hard', tags: ['object pool', 'memory', 'concurrency'], companies: ['Netflix', 'LinkedIn', 'Cloudflare', 'Apple'],
    statement: `<p>A network server allocates <code>byte[]</code> buffers for every request; profiling shows large-buffer churn. Build <code>BufferPool</code> with <b>size classes</b> 1 KB, 4 KB and 16 KB. <code>acquire(int bytesNeeded)</code> returns a buffer from the smallest class ≥ <code>bytesNeeded</code> (reuse an idle one or allocate new). Requests above 16 KB are <b>not pooled</b> (allocate exactly). <code>release(byte[] buf)</code> must <b>zero</b> the buffer (it may contain another user's data), return it to its class, and drop it if that class already holds <code>maxIdlePerClass</code> idle buffers. Track hits and misses.</p>`,
    constraints: `Thread-safe for thousands of threads. maxIdlePerClass = 64. Releasing a buffer whose length is not a size class is ignored (it was unpooled). Never hand the same buffer to two holders.`,
    example: `<p><code>acquire(3000)</code> → a <span class="c-g">4096-byte</span> buffer (miss: allocated). Release it, then <code>acquire(2000)</code> → the <span class="c-g">same 4096-byte</span> buffer, now zeroed (hit). <code>acquire(20000)</code> → a <span class="c-y">20000-byte</span> unpooled buffer.</p>`,
    brute: {
      why: `<p>Allocating <code>new byte[n]</code> for every request is simple and, for small sizes, actually fine on a modern JVM. For large, frequently allocated buffers it causes allocation pressure and GC churn (large arrays may go straight to old generation/humongous regions in G1). A single pool of one size wastes memory (a 100-byte request holding 16 KB); a pool without zeroing leaks data between requests.</p>`,
      code: `
class RequestHandlerNaive {
    byte[] handle(int payloadSize) {
        byte[] buf = new byte[payloadSize];   // fresh allocation per request
        buf[0] = 1;                            // pretend to read/write
        return buf;                            // garbage right after the response
    }
}`
    },
    mcq: { q: 'Why must release() zero the buffer before pooling it?', options: ['The next borrower could otherwise read the previous request\'s data', 'Java requires arrays to be zeroed', 'It makes acquire() faster', 'To reduce the array length'], answer: 0, explain: 'Pooled buffers are shared across requests over time; stale contents are a data-leak vulnerability (think of Heartbleed-style bugs).' },
    hints: [
      `<p>Hint 1: map a request size to a class index: the first of [1024, 4096, 16384] that is ≥ n; above the max → unpooled.</p>`,
      `<p>Hint 2: one <code>ConcurrentLinkedQueue&lt;byte[]&gt;</code> per class plus an <code>AtomicInteger</code> idle counter per class to enforce <code>maxIdlePerClass</code> without calling the O(n) <code>size()</code>.</p>`,
      `<p>Hint 3: in <code>release</code>, find the class by exact length; <code>Arrays.fill(buf, (byte) 0)</code>; increment the idle counter only if below the limit, else drop. Count hits/misses with <code>LongAdder</code>.</p>`
    ],
    solution: {
      approach: `<p>Three independent sub-pools, one per size class, each a lock-free queue with an atomic idle counter. <code>acquire</code> picks the smallest fitting class, polls a buffer (hit) or allocates (miss); oversize requests bypass the pool. <code>release</code> zeroes the buffer and returns it to its class if there is room. Because a buffer is either in a queue or held by exactly one caller, the same buffer is never handed out twice — as long as callers do not release twice, which a production version would guard with a lease object (see the topic code).</p>`,
      code: `
final class BufferPool {
    private static final int[] SIZES = {1024, 4096, 16384};
    private final int maxIdlePerClass;
    private final List<ConcurrentLinkedQueue<byte[]>> queues = new ArrayList<>();
    private final AtomicInteger[] idle = new AtomicInteger[SIZES.length];
    final LongAdder hits = new LongAdder(), misses = new LongAdder();

    BufferPool(int maxIdlePerClass) {
        this.maxIdlePerClass = maxIdlePerClass;
        for (int i = 0; i < SIZES.length; i++) {
            queues.add(new ConcurrentLinkedQueue<>());
            idle[i] = new AtomicInteger();
        }
    }

    private static int classFor(int n) {
        for (int i = 0; i < SIZES.length; i++) if (n <= SIZES[i]) return i;
        return -1;                                            // too big: unpooled
    }

    byte[] acquire(int bytesNeeded) {
        if (bytesNeeded < 1) throw new IllegalArgumentException("bytesNeeded >= 1");
        int c = classFor(bytesNeeded);
        if (c < 0) { misses.increment(); return new byte[bytesNeeded]; }
        byte[] buf = queues.get(c).poll();
        if (buf != null) {
            idle[c].decrementAndGet();
            hits.increment();
            return buf;
        }
        misses.increment();
        return new byte[SIZES[c]];
    }

    void release(byte[] buf) {
        int c = Arrays.binarySearch(SIZES, buf.length);
        if (c < 0) return;                                    // unpooled size: let GC take it
        Arrays.fill(buf, (byte) 0);                           // never leak previous contents
        while (true) {
            int now = idle[c].get();
            if (now >= maxIdlePerClass) return;               // class full: drop
            if (idle[c].compareAndSet(now, now + 1)) break;   // reserve a slot
        }
        queues.get(c).offer(buf);
    }
}

public class Main {
    public static void main(String[] args) {
        BufferPool pool = new BufferPool(64);
        byte[] a = pool.acquire(3000);
        a[0] = 7;
        System.out.println("got " + a.length);                    // 4096 (miss)
        pool.release(a);
        byte[] b = pool.acquire(2000);
        System.out.println("reused: " + (a == b) + ", zeroed: " + (b[0] == 0));   // true, true
        System.out.println("oversize: " + pool.acquire(20000).length);            // 20000
        System.out.println("hits=" + pool.hits.sum() + " misses=" + pool.misses.sum());
    }
}`,
      complexity: `<p><code>acquire</code>/<code>release</code>: O(1) lock-free, plus O(size) to zero on release. Memory bounded by 64 × (1 + 4 + 16) KB = 1.3 MB of idle buffers.</p>`,
      followUps: ['Add per-thread caches (like Netty\'s PoolThreadCache) to avoid queue contention', 'Would you still need this pool with direct ByteBuffers? What changes?', 'How do you detect buffers that are never released?']
    }
  });
  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: 'In double-checked locking, what goes wrong if the instance field is NOT volatile?', options: ['Another thread may see a non-null reference to an object whose constructor has not finished', 'The code does not compile', 'The lock is never released', 'Two locks are created'], answer: 0, explain: 'Without volatile, the write of the reference can be reordered before the constructor\'s writes, so a thread on the unlocked fast path can use a half-built object.' },
    { q: 'Why is the holder idiom (static nested Holder class) lazy AND thread-safe without explicit locks?', options: ['The nested class is initialised on first access, and the JVM runs class initialisation once under its own lock', 'Static fields are always thread-local', 'The JIT inlines it away', 'Nested classes are created per thread'], answer: 0, explain: 'JLS class initialisation rules guarantee exactly-once, safely published static init, triggered only when Holder is first touched.' },
    { q: 'Which singleton form is protected against reflection and serialization duplication by the JVM itself?', options: ['enum Singleton { INSTANCE }', 'Eager static final field', 'Double-checked locking', 'Holder idiom'], answer: 0, explain: 'Enums cannot be instantiated reflectively and deserialize to the existing constant; other forms need readResolve() and constructor guards.' },
    { q: 'A base class defines processOrder() which calls an abstract createPaymentProcessor() that subclasses override. Which pattern is this?', options: ['Factory Method', 'Abstract Factory', 'Builder', 'Prototype'], answer: 0, explain: 'A parent workflow delegating object creation to an overridable method is the GoF Factory Method.' },
    { q: 'You need a Button, a Menu and a Dialog that must all match the Windows or the macOS look. Which pattern?', options: ['Abstract Factory', 'Singleton', 'Object Pool', 'Prototype'], answer: 0, explain: 'A family of related products that must be consistent is exactly what an Abstract Factory provides.' },
    { q: 'What is the main weakness of Abstract Factory?', options: ['Adding a new product type requires changing the interface and every concrete factory', 'Adding a new family is very hard', 'It cannot be used with interfaces', 'It always creates singletons'], answer: 0, explain: 'New families (rows) are easy; new product types (columns) ripple through every factory.' },
    { q: 'Where should a Builder check the rule "stuffed crust only allowed on Large"?', options: ['In build(), because the rule involves two fields set in any order', 'In the crust() method only', 'In the product\'s getter', 'Nowhere; builders do not validate'], answer: 0, explain: 'Builder methods can be called in any order, so cross-field rules can only be checked once all values are known: in build().' },
    { q: 'A Builder stores toppings in an ArrayList and the product constructor does this.toppings = b.toppings. What is the bug?', options: ['The product shares the builder\'s mutable list, so it is not immutable', 'ArrayList cannot be used in builders', 'It causes a compile error', 'Nothing is wrong'], answer: 0, explain: 'Without List.copyOf (a defensive copy), later builder calls or anyone holding the list can change the "immutable" product.' },
    { q: 'An object has an int, a String and a List&lt;Item&gt; field. What does Object.clone() (via super.clone()) give you?', options: ['A shallow copy: int copied, String and List references shared', 'A full deep copy of everything', 'A copy with null object fields', 'A compile error unless the class is final'], answer: 0, explain: 'super.clone() copies field values; for reference fields the value is the reference. Sharing the String is fine (immutable), sharing the List is the classic bug.' },
    { q: 'Which is generally recommended in modern Java for implementing Prototype?', options: ['A copy constructor or copy() method', 'Cloneable with super.clone() everywhere', 'Serialization round-trip on every copy', 'Reflection-based field copying'], answer: 0, explain: 'Copy constructors are explicit, work with final fields, need no casts or checked exceptions, and make share-vs-copy decisions visible.' },
    { q: 'Which objects are good candidates for an Object Pool on the modern JVM?', options: ['Database connections and platform threads', 'Small DTOs created per request', 'Java 21 virtual threads', 'Immutable Strings'], answer: 0, explain: 'Pool objects whose creation involves I/O, native resources or large allocations. Small objects are cheaper to allocate than to pool; virtual threads are designed to be created per task.' },
    { q: 'In a pool\'s acquire(), the factory throws after a semaphore permit was taken. What must happen?', options: ['Release the permit in a catch/finally, then rethrow', 'Keep the permit to reserve the slot', 'Return null', 'Shut down the pool'], answer: 0, explain: 'A lost permit permanently shrinks capacity; after enough failures the pool deadlocks.' },
    { q: 'Integer.valueOf(127) == Integer.valueOf(127) prints true. Which creational idea is this?', options: ['A static factory method returning cached instances', 'Singleton', 'Abstract Factory', 'Builder'], answer: 0, explain: 'valueOf is a static factory that caches -128..127, a benefit constructors (which must always create new objects) cannot offer.' }
  );

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push(
    { q: 'What are creational design patterns, and why not just use <code>new</code> everywhere?', level: 'B', a: `<p>Creational patterns move the decision of <b>which class to instantiate, how many instances exist, and how they are assembled</b> into one place. Using <code>new ConcreteClass()</code> everywhere couples every caller to that class: changing it ripples through many files, tests cannot substitute fakes, and complex setup (validation, caching, expensive initialisation) gets duplicated. The six to know: Singleton, Factory Method, Abstract Factory, Builder, Prototype (GoF) and Object Pool. I also say clearly that plain <code>new</code> is fine for value objects and classes with one obvious implementation — patterns are for where change or cost actually lives.</p>`, followUps: ['How does dependency injection relate to these patterns?', 'Give an example where a factory would be over-engineering.'] },
    { q: 'Write a thread-safe lazy Singleton in Java and explain why it is correct.', level: 'I', a: `<p>My default is the <b>holder idiom</b>: a private constructor, a <code>private static final class Holder { static final X INSTANCE = new X(); }</code> and <code>getInstance()</code> returning <code>Holder.INSTANCE</code>. It is lazy because the JVM initialises <code>Holder</code> only on first access, and thread-safe because class initialisation runs exactly once under the JVM's init lock with safe publication (JLS 12.4.2). If I also need protection against reflection and serialization, I use <code>enum X { INSTANCE }</code>. Double-checked locking is correct only with a <b>volatile</b> field and a second null check inside the <code>synchronized</code> block.</p>`, followUps: ['Why exactly is volatile needed in DCL?', 'What happens if the singleton\'s constructor throws?'] },
    { q: 'How can a Singleton be broken, and how do you prevent each attack?', level: 'I', a: `<p>(1) <b>Race conditions</b> in lazy init → use holder/enum/DCL with volatile. (2) <b>Reflection</b>: <code>setAccessible(true)</code> on the private constructor → throw from the constructor if an instance already exists, or use an enum (the JDK refuses reflective enum creation). (3) <b>Serialization</b>: <code>readObject</code> builds a new instance → implement <code>readResolve()</code> returning the singleton, or use an enum. (4) <b>Cloning</b> → do not implement <code>Cloneable</code>, or override <code>clone()</code> to throw. (5) <b>Multiple class loaders</b> → each has its own copy; only fixable by loading the class from a shared parent loader. (6) <b>Multiple JVMs</b> → a Java singleton is per process; cluster-wide uniqueness needs leader election or a distributed lock.</p>`, followUps: ['Show readResolve in code.', 'Why does enum solve most of these at once?'] },
    { q: 'Why do many teams consider Singleton an anti-pattern, and what do they use instead?', level: 'A', a: `<p>The <b>pattern</b> combines two things: "only one instance" (often fine) and "global static access" (the problem). Global access hides dependencies (you cannot see from a constructor that a class uses the config), couples code to a concrete class, makes unit tests share state and run order-dependent, and blocks substitution with fakes. The modern approach keeps the <i>single instance</i> but drops the <i>global access</i>: a DI container creates one instance (Spring's default singleton scope) and injects it through constructors, usually behind an interface. Tests then pass their own instance. I still use enum/holder singletons for truly stateless, process-wide utilities or in code without a container.</p>`, followUps: ['How would you migrate a codebase away from static getInstance() calls safely?', 'Is Spring\'s singleton scope the same as the GoF Singleton?'] },
    { q: 'Explain the difference between Simple Factory, Factory Method and Abstract Factory.', level: 'I', a: `<p><b>Simple Factory</b> (an idiom, not GoF): one method like <code>create(type)</code> with a switch or a registry map; the choice is driven by <b>data</b>. <b>Factory Method</b> (GoF): a parent class's workflow calls an abstract/overridable <code>createProduct()</code>; <b>subclasses</b> decide the concrete product — inheritance-based, often combined with Template Method. <b>Abstract Factory</b> (GoF): an <b>object</b> with several create methods producing a <b>family</b> of related products that must be compatible (LightTheme vs DarkTheme widgets). Factory Method creates one product via inheritance; Abstract Factory creates a family via composition, and its methods are frequently implemented as factory methods.</p>`, followUps: ['Which one is Collection.iterator()?', 'How do you make a simple factory Open/Closed?'] },
    { q: 'How do you design a factory that follows the Open/Closed Principle?', level: 'I', a: `<p>Replace the growing <code>switch</code> with a <b>registry</b>: <code>Map&lt;String, Supplier&lt;T&gt;&gt;</code> (or <code>Function</code> when creation needs arguments). Each product registers itself once at startup (<code>register("sms", SmsNotification::new)</code>), possibly discovered through <code>ServiceLoader</code> or the DI container (Spring can inject a <code>Map&lt;String, Notification&gt;</code> of all beans). <code>create</code> normalises the key, throws a clear exception for unknown keys (never returns null), and returns a new or shared instance as documented. Adding a product = a new class plus one registration, with no edits to existing code. I also make the map thread-safe or immutable after startup and reject duplicate keys.</p>`, followUps: ['How would you load plugins from JARs at runtime?', 'What are the downsides of reflection-based factories?'] },
    { q: 'When would you choose Abstract Factory, and what trade-off do you mention?', level: 'I', a: `<p>When the system must create <b>families of related objects</b> that must be used together — UI widgets per platform/theme, cloud clients per provider (storage + queue + secrets sharing a region and credentials), DB vendor kits (connection + dialect + migrator), or prod vs test infrastructure. The client receives one factory (chosen once at the composition root) and can never mix families. The trade-off: adding a <b>new family</b> is cheap (one factory + its products, Open/Closed), but adding a <b>new product type</b> forces changes to the interface and every concrete factory. Java default methods can soften that. If families never vary, it is overkill.</p>`, followUps: ['How does Spring @Profile relate to Abstract Factory?', 'Abstract Factory vs Bridge?'] },
    { q: 'Explain the Builder pattern. When is it better than constructors or setters?', level: 'B', a: `<p>A Builder collects construction parameters step by step through named, chainable methods, then <code>build()</code> validates and creates the product, usually <b>immutable</b>. It beats <b>telescoping constructors</b> (unreadable positional arguments, easy to swap two booleans) and <b>JavaBeans setters</b> (object exists half-built, must be mutable, no place for cross-field validation). Use it from about 4+ parameters, when many are optional, when combinations have rules, or when you want immutability with readable construction. Implementation: private constructor taking the builder, static nested builder with defaults, <code>return this</code> in each method, per-field checks in setters, cross-field checks in <code>build()</code>, defensive copies of collections.</p>`, followUps: ['What is a step builder?', 'What does the GoF Director add?'] },
    { q: 'What are common mistakes when implementing a Builder?', level: 'I', a: `<p>(1) <b>No validation</b> in <code>build()</code>, so invalid combinations still get built. (2) <b>No defensive copy</b> of collections, so the "immutable" product shares the builder's list. (3) Leaving <b>setters on the product</b>, defeating immutability. (4) Sharing one builder across <b>threads</b> — builders are mutable and not thread-safe. (5) Using a builder for a <b>two-field</b> class where a constructor or record is clearer. (6) Required fields as optional builder methods, so forgetting them is only a runtime error — pass them to <code>builder(required...)</code> or use a step builder. (7) Validating in the product constructor <i>before</i> copying, opening a time-of-check/time-of-use gap.</p>`, followUps: ['How does Lombok @Builder handle collections and defaults?', 'How would you add toBuilder()?'] },
    { q: 'Explain the Prototype pattern and shallow vs deep copy with an example.', level: 'I', a: `<p>Prototype creates objects by <b>copying a configured instance</b> instead of building from scratch — useful when construction is expensive (loading assets, parsing, DB reads), when objects are near-identical templates, or when the concrete class is only known at runtime (a registry of prototypes keyed by name). A <b>shallow copy</b> copies field values, so reference fields are shared: copying an <code>Enemy</code> with a <code>List&lt;String&gt; loot</code> shallowly means adding loot to the copy also changes the prototype. A <b>deep copy</b> creates new instances of mutable fields (recursively). Immutable fields (Strings, records of immutables) and heavy read-only data can be shared safely. I implement it with copy constructors rather than <code>Cloneable</code>.</p>`, followUps: ['How do you deep-copy a graph with cycles?', 'Why is Cloneable considered broken?'] },
    { q: 'Why does Effective Java advise against Cloneable, and what should you use?', level: 'A', a: `<p><code>Cloneable</code> is a marker interface with no <code>clone()</code> method; it just changes <code>Object.clone()</code>'s behaviour. <code>clone()</code> is protected, returns <code>Object</code> (cast needed), throws a checked <code>CloneNotSupportedException</code>, creates objects <b>without calling a constructor</b> (invariants skipped), is <b>shallow</b> by default, and cannot reassign <code>final</code> fields, so deep-copying final mutable fields is impossible. Subclasses inherit broken behaviour unless they override carefully. Use a <b>copy constructor</b> or <b>static copy factory</b> (<code>new ArrayList&lt;&gt;(c)</code>, <code>List.copyOf</code>) instead. The exception: arrays, where <code>array.clone()</code> is idiomatic (shallow for nested arrays).</p>`, followUps: ['How do you correctly deep-copy an int[][]?', 'What does List.copyOf do differently from new ArrayList&lt;&gt;(list)?'] },
    { q: 'Design a thread-safe connection pool. What are the key components and failure modes?', level: 'A', a: `<p>Components: a <code>Semaphore(maxSize, fair)</code> bounding borrowed connections and giving <code>tryAcquire(timeout)</code>; a concurrent queue of idle connections; a factory; <b>validation on borrow</b> (discard dead connections); <b>reset on return</b> (rollback, restore auto-commit/isolation); an identity set or lease object to reject <b>double/foreign returns</b>; <b>try-with-resources</b> leases; housekeeping for <code>maxLifetime</code>/idle eviction; and <code>shutdown()</code>. Failure modes: leaks (missing return → exhaustion, mitigate with leak detection), lost permits when the factory throws (release in catch), dirty state leaking between users, blocking forever without timeouts, and oversizing (Little's Law sizing; often ~10 per instance). In production I use HikariCP and tune it rather than write my own.</p>`, followUps: ['How does HikariCP avoid lock contention?', 'How would you size the pool for 2,000 req/s with 5 ms DB time?'] },
    { q: 'Is object pooling still a good idea on modern JVMs?', level: 'E', a: `<p>Only for objects whose creation involves <b>I/O, native resources or large allocations</b>: DB/HTTP connections, platform threads, large direct <code>ByteBuffer</code>s, GPU handles. For ordinary objects, TLAB bump-pointer allocation costs nanoseconds and generational collectors (G1, generational ZGC) reclaim short-lived garbage almost for free; pooling them makes objects long-lived, promotes them to the old generation, adds synchronisation and cache misses, and risks dirty-state bugs. Virtual threads (Java 21) should be created per task; to limit concurrency use a <code>Semaphore</code>. So: pool for <b>resource limits and expensive setup</b>, not for "avoiding new"; and measure with JFR/async-profiler before and after.</p>`, followUps: ['What is a humongous allocation in G1 and why might it justify buffer pooling?', 'How do Netty pooled allocators work at a high level?'] },
    { q: 'How do DI containers like Spring relate to creational patterns?', level: 'E', a: `<p>A DI container is essentially a configurable <b>Abstract Factory/registry</b> for the whole object graph. Bean definitions are recipes (factory methods: <code>@Bean</code> methods are literally factory methods), <b>singleton scope</b> gives one instance per application context (lazily or eagerly created, thread-safe), <b>prototype scope</b> creates a new instance per lookup (the container plays Prototype/factory), <code>FactoryBean</code> and <code>ObjectProvider</code> are explicit factories, and <code>@Profile</code>/<code>@Conditional</code> choose a family of beans (Abstract Factory per environment). Builders appear in configuration (<code>RestClient.builder()</code>), and connection pools (HikariCP) are beans. Knowing the patterns lets you reason about scope bugs, e.g. injecting a prototype into a singleton only creates it once unless you use a provider.</p>`, followUps: ['How do you get a fresh prototype bean inside a singleton?', 'What are the risks of circular dependencies between singletons?'] }
  );

  registerModule({
    id: 'lld04',
    title: 'Creational Design Patterns',
    intro: `<p>Every object in your program is born somewhere. If that "somewhere" is a scattered <code>new ConcreteClass()</code> in fifty files, every change to how objects are made — a new provider, a new theme, a required validation, a limit on connections — turns into a risky hunt through the codebase. <b>Creational design patterns</b> put object creation in one deliberate place.</p>
<p>In this module you will master all six creational patterns asked in LLD interviews: <b>Singleton</b> (with every thread-safe Java variant, how each one breaks, and why <code>volatile</code> matters), <b>Factory Method</b> (and the Simple Factory and static factory idioms), <b>Abstract Factory</b>, <b>Builder</b>, <b>Prototype</b> (shallow vs deep copy) and <b>Object Pool</b>. Each topic starts with an everyday analogy, animates the class structure and the object-creation flow step by step, shows compilable Java, and finishes with production reality and how AI tools change the work. Practice includes "which pattern fits?" questions, implement-the-pattern exercises, and fix-the-broken-singleton bugs.</p>`,
    goals: [
      'Choose the right creational pattern (or plain <code>new</code>) from the wording of a requirement, and explain the trade-off out loud',
      'Write a correct thread-safe Singleton (holder idiom, enum, DCL with volatile) and explain the Java Memory Model reason each works — or breaks',
      'Implement Factory Method, a registry-based factory and an Abstract Factory that keep client code depending only on interfaces',
      'Build immutable objects with a validating Builder (including a compile-time step builder) and copy objects safely with deep-copy Prototypes',
      'Design a bounded, thread-safe Object Pool with timeouts, validation, reset and leak protection — and know when not to pool at all'
    ],
    prereqs: `LLD 1 (OOP Modelling &amp; UML), LLD 2 (SOLID — especially Open/Closed and Dependency Inversion) and LLD 3 (Clean Code). Comfortable with Java interfaces, generics, lambdas/method references, and the basics of <code>synchronized</code>, <code>volatile</code> and <code>java.util.concurrent</code> (Java track modules on concurrency help for the Singleton and Pool topics).`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
