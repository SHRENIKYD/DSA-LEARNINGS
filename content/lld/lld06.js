(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- tiny helpers shared by all visualizers ---------- */
  // a class / interface / object box for class diagrams and runtime diagrams
  function B(id, label, x, y, w) { var n = { id: id, label: label, x: x, y: y, shape: 'box' }; if (w) n.w = w; return n; }
  // a circle node (used for state machines)
  function N(id, label, x, y) { return { id: id, label: label, x: x, y: y }; }
  // a directed diagram: edge [u, v, label] means "u talks to / depends on v"
  function G(label, nodes, edges, o) {
    o = o || {};
    return { type: 'graph', label: label, directed: o.undirected ? false : true, height: o.h || 60, nodes: nodes, edges: edges, hl: o.hl || {}, ehl: o.ehl || {}, tags: o.tags || {} };
  }
  function CODE(label, code, hl) { return { type: 'code', label: label, lang: 'java', code: code, hl: hl || {} }; }
  function TXT(html, label) { var p = { type: 'text', html: html }; if (label) p.label = label; return p; }
  function VARS(label, vals, hl) { return { type: 'vars', label: label, vals: vals, hl: hl || {} }; }
  function STACK(label, items, hl) { return { type: 'stack', label: label, items: items.slice(), hl: hl || {} }; }
  function F(narr, parts) { return { narr: narr, parts: parts }; }
  function clone(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function pick(input, options, hint) {
    var k = String(input === undefined ? '' : input).trim().toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(options, k)) throw new Error(hint);
    return options[k];
  }
  // every edge of a diagram painted with one class (e.g. all 'done')
  function paint(edges, cls) { var r = {}; edges.forEach(function (e) { r[e[0] + '-' + e[1]] = cls; }); return r; }
  function tokens(input, sep, max, hint) {
    var t = String(input === undefined ? '' : input).split(sep).map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
    if (!t.length) throw new Error(hint);
    if (t.length > max) throw new Error('Use at most ' + max + ' items. ' + hint);
    return t;
  }

  /* ======================= TOPIC 1: STRATEGY ======================= */
  topics.push({
    title: 'Strategy: Swap the Algorithm, Keep the Code',
    analogy: `<p>Think of <b>Google Maps</b>. You type the same destination, then tap <b>Car</b>, <b>Bike</b>, <b>Walk</b> or <b>Train</b>. The app does not change — only the <i>way the route is calculated</i> changes. Each mode is a separate "route plan" plugged into the same screen. Or think of a <b>phone charger</b>: the phone has one socket, and you can plug in a slow charger, a fast charger or a power bank. The phone does not care which one, as long as it fits the socket. That socket is the <b>interface</b>; each charger is a <b>strategy</b>.</p>`,
    explain: `<p><b>Behavioral patterns</b> are about <i>how objects share work and talk to each other</i> (creational patterns were about creating objects, structural ones about wiring them together). Strategy is the simplest and most used of them.</p>
<p><b>Strategy in one line:</b> put each version of an algorithm in its own small class behind a common interface, and let the main object (the <b>context</b>) hold <i>one</i> of them and call it. You can swap the strategy at runtime without touching the context.</p>
${H.table(['Role', 'What it is', 'In the checkout example'], [
  ['<b>Strategy</b> (interface)', 'The "socket": one method every algorithm must provide', '<code>DiscountStrategy.apply(amount)</code>'],
  ['<b>Concrete strategies</b>', 'One class per algorithm', '<code>NoDiscount</code>, <code>FlatOff</code>, <code>PercentOff</code>, <code>FestiveCap</code>'],
  ['<b>Context</b>', 'The object that <i>uses</i> a strategy but does not know which one', '<code>Checkout</code>'],
  ['<b>Client</b>', 'Whoever picks the strategy and gives it to the context', 'controller / config / A-B test flag']
])}
<p><b>The naive way</b> is one big method: <code>if (type.equals("FLAT")) … else if (type.equals("PERCENT")) … else if …</code>. It works on day one. On day 30 marketing wants "festive 20% capped at ₹300", then "buy one get one", then "first-order free delivery". Every new rule edits the same method, the method grows to 200 lines, every edit risks breaking old rules, and you cannot unit test one rule alone. That is a broken <b>Open/Closed Principle</b>: the class is not closed for modification.</p>
<p><b>With Strategy</b>, adding a rule = adding one new class. Nothing old is touched. ${H.c('g', 'Each rule is tiny, testable and reusable.')}</p>
<p><b>Modern Java twist:</b> if the strategy interface has one method, it is a <b>functional interface</b>, so a strategy can simply be a lambda: <code>Checkout c = new Checkout(amt -&gt; amt * 0.9);</code>. You already use this daily — <code>Comparator</code> is a strategy for <code>Collections.sort</code>, and <code>ThreadPoolExecutor</code> takes a <code>RejectedExecutionHandler</code> strategy.</p>`,
    clues: [
      '"Support <b>multiple ways</b> to pay / sort / route / compress / price" → one interface, one class per way.',
      '"The <b>algorithm should be selectable at runtime</b>" or "chosen by config / user / A-B test" → Strategy.',
      '"We will keep adding new pricing / discount / fare rules" → Open/Closed via Strategy.',
      'You see a <code>switch</code> on a <i>type string</i> that picks <i>how to compute</i> something → refactor to Strategy (or a Map of strategies).',
      'Interview phrase "make it <b>pluggable</b>" or "how would you add a new X without changing existing code?"',
      'Machine-coding: Parking lot <b>fee calculation</b>, Splitwise <b>split types</b> (equal/exact/percent), Elevator <b>scheduling algorithm</b>, Rate limiter <b>algorithm choice</b>.'
    ],
    code: [{ lang: 'java', title: 'Classic Strategy: interface + classes + context', code: `// 1) The "socket": every discount rule must provide this one method.
interface DiscountStrategy {
    double apply(double amount);           // returns the amount AFTER discount
    default String name() { return getClass().getSimpleName(); }
}

// 2) One small class per rule. Adding a rule never edits an old one.
class NoDiscount implements DiscountStrategy {
    public double apply(double amount) { return amount; }
}
class FlatOff implements DiscountStrategy {
    private final double off, minOrder;
    FlatOff(double off, double minOrder) { this.off = off; this.minOrder = minOrder; }
    public double apply(double amount) { return amount >= minOrder ? amount - off : amount; }
}
class PercentOff implements DiscountStrategy {
    private final double pct;
    PercentOff(double pct) { this.pct = pct; }
    public double apply(double amount) { return amount * (1 - pct / 100.0); }
}
class FestiveCap implements DiscountStrategy {            // 20% off, but at most 300
    public double apply(double amount) { return amount - Math.min(amount * 0.20, 300); }
}

// 3) The context: uses a strategy, never asks "which one are you?"
class Checkout {
    private DiscountStrategy strategy = new NoDiscount();
    void setStrategy(DiscountStrategy s) { this.strategy = Objects.requireNonNull(s); }
    double total(double cartAmount) {
        double after = strategy.apply(cartAmount);
        return Math.round(after * 100) / 100.0;           // money rounding lives in ONE place
    }
}

class Main {
    public static void main(String[] args) {
        Checkout c = new Checkout();
        List<DiscountStrategy> rules = List.of(new NoDiscount(), new FlatOff(100, 500),
                                               new PercentOff(10), new FestiveCap());
        for (DiscountStrategy r : rules) {
            c.setStrategy(r);                              // swap at runtime
            System.out.println(r.name() + " -> " + c.total(1000));
        }
        c.setStrategy(amount -> amount - 50);              // a lambda is a strategy too
        System.out.println("Lambda -> " + c.total(1000));
    }
}` }, { lang: 'java', title: 'Strategy registry: pick by key without if/else', code: `// When the strategy is chosen by a string (config, request param), use a Map, not a switch.
enum ShippingSpeed { STANDARD, EXPRESS, SAME_DAY }

class ShippingCalculator {
    private final Map<ShippingSpeed, ToDoubleFunction<Double>> rules = new EnumMap<>(ShippingSpeed.class);

    ShippingCalculator() {
        rules.put(ShippingSpeed.STANDARD, kg -> 40 + 10 * kg);
        rules.put(ShippingSpeed.EXPRESS,  kg -> 90 + 15 * kg);
        rules.put(ShippingSpeed.SAME_DAY, kg -> 150 + 25 * kg);
    }

    // New speed? Add one enum constant + one put(). No method body grows.
    double cost(ShippingSpeed speed, double kg) {
        ToDoubleFunction<Double> rule = rules.get(speed);
        if (rule == null) throw new IllegalArgumentException("No rule for " + speed);
        return rule.applyAsDouble(kg);
    }

    public static void main(String[] args) {
        ShippingCalculator calc = new ShippingCalculator();
        for (ShippingSpeed s : ShippingSpeed.values()) System.out.println(s + " 2kg = " + calc.cost(s, 2));
    }
}` }],
    codeTitle: ['Strategy with classes', 'Strategy registry with lambdas'],
    viz: {
      title: 'Strategy: one Checkout, swappable discount rules',
      input: '1000 none flat percent festive',
      inputLabel: 'Cart amount, then strategies to plug in (none | flat | percent | festive)',
      gen: function (input) {
        var t = tokens(input, /[\s,]+/, 9, 'Example: 1000 none flat percent festive');
        var amt = Number(t[0]);
        if (isNaN(amt) || amt <= 0 || amt > 1e7) throw new Error('First value must be a positive cart amount, e.g. 1000');
        var defs = {
          none: { id: 'NO', cls: 'NoDiscount', f: function (a) { return a; }, rule: 'returns the amount unchanged' },
          flat: { id: 'FL', cls: 'FlatOff(100, min 500)', f: function (a) { return a >= 500 ? a - 100 : a; }, rule: '₹100 off if amount ≥ 500' },
          percent: { id: 'PC', cls: 'PercentOff(10)', f: function (a) { return a * 0.9; }, rule: '10% off' },
          festive: { id: 'FE', cls: 'FestiveCap', f: function (a) { return a - Math.min(a * 0.2, 300); }, rule: '20% off, capped at ₹300' }
        };
        var seq = t.slice(1);
        if (!seq.length) throw new Error('Give at least one strategy after the amount: none, flat, percent or festive');
        seq.forEach(function (s) { if (!defs[s.toLowerCase()]) throw new Error('Unknown strategy "' + s + '". Use none, flat, percent or festive'); });
        var nodes = [B('CL', 'Client', 12, 8), B('CK', 'Checkout (context)', 12, 34), B('DS', '«DiscountStrategy»', 47, 34),
          B('NO', 'NoDiscount', 85, 6), B('FL', 'FlatOff', 85, 24), B('PC', 'PercentOff', 85, 44), B('FE', 'FestiveCap', 85, 62)];
        var edges = [['CL', 'CK', 'setStrategy()'], ['CK', 'DS', 'apply()'], ['NO', 'DS', 'implements'], ['FL', 'DS'], ['PC', 'DS'], ['FE', 'DS']];
        var frames = [];
        var naive = 'double total(String type, double a) {\n  if (type.equals("NONE")) return a;\n  else if (type.equals("FLAT")) return a >= 500 ? a - 100 : a;\n  else if (type.equals("PERCENT")) return a * 0.9;\n  else if (type.equals("FESTIVE")) return a - Math.min(a*0.2, 300);\n  // every new rule = edit THIS method again\n  throw new IllegalArgumentException(type);\n}';
        frames.push(F('<b>The naive design</b>: one method with an if/else per rule. Every new discount means re-opening and re-testing this method. ' + H.c('r', 'This is the pain Strategy removes.'),
          [CODE('Naive: if/else ladder inside Checkout', naive, { 2: 'bad', 3: 'bad', 4: 'bad', 5: 'bad', 6: 'bad' })]));
        frames.push(F('<b>The Strategy structure.</b> <code>Checkout</code> only knows the <b>interface</b> «DiscountStrategy». Four small classes implement it. Arrows from the concrete classes mean "implements". The client decides which one to plug in.',
          [G('Class diagram', nodes, edges, { h: 70, hl: { DS: 'sel', CK: 'cur' }, ehl: { 'CK-DS': 'cur' } })]));
        var results = [], cur = 'NO';
        seq.forEach(function (s, i) {
          var d = defs[s.toLowerCase()], after = Math.round(d.f(amt) * 100) / 100;
          var hl = { CL: 'cur', CK: 'win' }; hl[d.id] = 'sel';
          var eh = { 'CL-CK': 'cur' };
          frames.push(F('Step ' + (i + 1) + 'a: the client calls <code>checkout.setStrategy(new ' + d.cls.replace(/\(.*$/, '') + '(…))</code>. ' +
            'Checkout simply stores the reference — ' + H.c('g', 'no if/else, no type check') + '. The old strategy (' + cur + ') is just dropped.',
            [G('Swapping the strategy at runtime', nodes, edges, { h: 70, hl: hl, ehl: eh, tags: (function () { var g = {}; g[d.id] = 'plugged in'; return g; })() }),
              VARS('Checkout fields', { strategy: d.cls, cartAmount: amt })]));
          var hl2 = { CK: 'cur', DS: 'cur' }; hl2[d.id] = 'ok';
          var eh2 = { 'CK-DS': 'ok' }; eh2[d.id + '-DS'] = 'ok';
          results.push([d.cls, d.rule, String(amt), String(after)]);
          frames.push(F('Step ' + (i + 1) + 'b: <code>checkout.total(' + amt + ')</code> calls <code>strategy.apply(' + amt + ')</code>. Java\'s dynamic dispatch lands in <b>' + d.cls + '</b> (' + d.rule + '). Result: <b>₹' + after + '</b>.',
            [G('Runtime call path', nodes, edges, { h: 70, hl: hl2, ehl: eh2 }),
              VARS('Result', { before: amt, after: after, saved: Math.round((amt - after) * 100) / 100 }, { after: 'ok' }),
              CODE('What runs', 'double total(double a) {\n  double after = strategy.apply(a);\n  return round(after);\n}', { 2: 'ok' })]));
          cur = d.cls;
        });
        frames.push(F('Summary: the <b>same</b> Checkout code produced ' + results.length + ' different answers just by plugging in different strategies. Adding a 5th rule = one new class; Checkout is ' + H.c('g', 'closed for modification, open for extension') + '.',
          [{ type: 'table', label: 'Strategy results for ₹' + amt, columns: ['Strategy', 'Rule', 'Before', 'After'], rows: results, hl: {} }]));
        return frames;
      }
    },
    examples: [
      { title: 'Comparator is a Strategy you already use', html: `<p><code>Collections.sort(list, comparator)</code>: the sort algorithm (context) is fixed; <b>how to compare two items</b> is the strategy. Sorting employees by salary, then by name, then by joining date needs zero changes to the sort code — just different comparators.</p>`, code: `record Emp(String name, int salary) {}
List<Emp> emps = new ArrayList<>(List.of(new Emp("Asha", 90), new Emp("Ben", 70), new Emp("Cy", 80)));
emps.sort(Comparator.comparingInt(Emp::salary));          // strategy 1
System.out.println(emps);
emps.sort(Comparator.comparing(Emp::name).reversed());    // strategy 2
System.out.println(emps);` },
      { title: 'Payment methods at checkout', html: `<p>Card, UPI, Wallet, Net-banking all "pay an amount" but each talks to a different gateway with different fees and retries. A <code>PaymentStrategy</code> interface with <code>pay(Order)</code> lets the order service stay identical while finance adds "Buy Now Pay Later" next quarter as a brand-new class. Combine with a <b>factory/registry</b> that maps <code>"UPI"</code> → <code>UpiPayment</code> so the controller never writes if/else.</p>` },
      { title: 'Splitwise split types', html: `<p>An expense can be split <b>EQUAL</b>, <b>EXACT</b> amounts or by <b>PERCENT</b>. Each is a <code>SplitStrategy.split(total, participants)</code> returning a map of user → share, plus its own validation (percent must add to 100, exact must add to total). Interviewers love this because the validation rules are different per strategy — exactly the code that would otherwise turn into a tangle of if/else.</p>`, code: `interface SplitStrategy { Map<String, Double> split(double total, List<String> users); }
SplitStrategy equal = (total, users) -> {
    Map<String, Double> m = new LinkedHashMap<>();
    for (String u : users) m.put(u, total / users.size());
    return m;
};
System.out.println(equal.split(300, List.of("A", "B", "C")));   // {A=100.0, B=100.0, C=100.0}` },
      { title: 'When NOT to use Strategy', html: `<p>If there are only <b>two</b> options that will never grow (e.g. ascending vs descending), a boolean or a simple <code>Comparator.reversed()</code> is clearer. Strategy pays off when variants <b>grow over time</b>, are <b>tested separately</b>, or are <b>chosen at runtime</b>. Do not create five classes for a one-line difference — that is over-engineering (YAGNI).</p>` }
    ],
    deepDive: `<p><b>Strategy vs State:</b> both look identical on a class diagram (context holds an interface). The difference is <i>who switches</i>. In Strategy the <b>client</b> chooses and the strategies do not know each other. In State the <b>states themselves</b> trigger transitions ("after paying, move to PAID"). If the objects call <code>context.setX(new Other())</code>, it is State.</p>
<p><b>Strategy vs Template Method:</b> both vary one part of an algorithm. Template Method uses <b>inheritance</b> (subclass overrides a step, chosen at compile time); Strategy uses <b>composition</b> (object passed in, swappable at runtime). Modern advice ("favour composition over inheritance") pushes toward Strategy.</p>
<p><b>Stateless strategies can be shared:</b> a <code>PercentOff(10)</code> has no mutable fields, so one instance can serve all threads — store it as a constant or an enum. If a strategy holds per-request state (e.g. a running total), create a fresh one per use or it will become a race condition.</p>
<p><b>Enum strategies:</b> <code>enum Op { ADD { int apply(int a,int b){return a+b;} }, MUL { … }; abstract int apply(int a,int b); }</code> gives a closed, serializable, switch-free set — great when the list is fixed and known at compile time. A <b>Map&lt;Key, Strategy&gt;</b> registry is better when plugins are added at runtime (Spring auto-injects <code>Map&lt;String, PaymentStrategy&gt;</code> by bean name).</p>
<p><b>Performance:</b> the virtual call through an interface is almost free — the JIT inlines monomorphic and bimorphic call sites. Megamorphic sites (3+ hot implementations) cost a few nanoseconds; never a reason to keep the if/else.</p>
<p><b>Testing:</b> each strategy is a pure function → table-driven unit tests; the context is tested once with a fake strategy. This is the real interview win: "every rule is tested in isolation".</p>`,
    aiEra: `<p><b>What AI changes:</b> Copilot-style tools happily generate the if/else ladder because it is the most common code on the internet. Your job is to <b>spot the axis of change</b> ("pricing rules keep changing") and ask for a Strategy instead. AI is excellent at the boring part: "Generate 5 DiscountStrategy implementations with JUnit 5 parameterized tests for edge cases (0, negative, exactly-at-threshold)."</p>
<p><b>LLM apps are full of strategies:</b> choosing a model (cheap vs smart), a retrieval method (keyword vs vector vs hybrid), or a chunking method in RAG — each is a strategy behind one interface so you can A/B test without rewriting the pipeline. Agent frameworks call these "pluggable policies".</p>
<p><b>Where AI goes wrong:</b> it may make strategies stateful singletons (thread-safety bugs), invent a strategy for a two-option boolean, or forget to validate input inside each strategy. <b>What you must still own:</b> deciding whether variation is real, naming the interface well, and explaining the trade-off vs a simple switch in the interview.</p>`,
    problems: [{
      title: 'Ride Fare Calculator (Uber/Ola style)', level: 'Easy', tags: ['strategy', 'open-closed'], companies: ['Uber', 'Ola', 'Lyft'],
      statement: `<p>Design a <code>FareCalculator</code> for a ride app. A ride has distance (km) and duration (minutes). Fare types: <b>NORMAL</b> = 50 base + 12/km + 1/min; <b>SURGE</b> = NORMAL × surge multiplier; <b>POOL</b> = 70% of NORMAL. New fare types (e.g. NIGHT, AIRPORT) will be added every month. Changing a fare type at runtime must not change <code>FareCalculator</code> code.</p>`,
      constraints: `Distance 0–500 km, duration 0–600 min, surge multiplier 1.0–5.0. Round fare to 2 decimals.`,
      example: `<p>Ride: 10 km, 20 min. ${H.c('b', 'NORMAL')} = 50 + 120 + 20 = <b>190</b>. ${H.c('b', 'SURGE ×1.5')} = <b>285</b>. ${H.c('b', 'POOL')} = 0.7 × 190 = <b>133</b>. Same ride, three answers, because only the <i>pricing algorithm</i> changed.</p>`,
      brute: { why: `<p>A single method with <code>if (type == NORMAL) … else if (type == SURGE) …</code>. Each new type edits the same method (breaks Open/Closed), surge needs an extra parameter that NORMAL and POOL ignore, and the method cannot be tested per fare type. After 10 fare types it is a 150-line method everyone is scared to touch.</p>`, code: `class NaiveFareCalculator {
    double fare(String type, double km, double min, double surge) {
        double normal = 50 + 12 * km + 1 * min;
        if (type.equals("NORMAL")) return normal;
        else if (type.equals("SURGE")) return normal * surge;   // surge param unused by others
        else if (type.equals("POOL")) return normal * 0.7;
        // NIGHT, AIRPORT, RENTAL... every month we edit this method again
        throw new IllegalArgumentException("Unknown fare type " + type);
    }
}` },
      mcq: { q: 'Product says "a new fare type AIRPORT (flat 200 + 15/km) launches next week". With Strategy, what changes?', options: ['Add one class AirportFare implements FareStrategy; FareCalculator untouched', 'Add another else-if in FareCalculator', 'Subclass FareCalculator', 'Change the Ride class'], answer: 0, explain: 'Strategy makes new behaviour an addition, not a modification. The context only knows the interface.' },
      hints: [`<p>Hint 1: What varies is the <b>formula</b>; what stays the same is "take a ride, return a fare, round it". Put the varying part behind an interface.</p>`, `<p>Hint 2: <code>interface FareStrategy { double fare(Ride r); }</code>. SURGE can <b>wrap</b> another strategy (NORMAL) and multiply, so its multiplier lives in its own constructor — no unused parameters.</p>`, `<p>Hint 3: Validate negative distance once in the context. Recipe: Ride record → strategy classes → <code>FareCalculator(FareStrategy)</code> with <code>setStrategy</code> → round in one place.</p>`],
      solution: {
        approach: `<p>Make <code>FareStrategy</code> the single varying point. <code>NormalFare</code> holds the base formula. <code>SurgeFare</code> and <code>PoolFare</code> <b>reuse</b> <code>NormalFare</code> by composition (they wrap it), so the base formula exists once. <code>FareCalculator</code> validates the ride, delegates to the current strategy and rounds. A new type is a new class; the calculator never changes. Strategies are immutable, so they are thread-safe and can be shared.</p>`,
        code: `record Ride(double km, double minutes) {}

interface FareStrategy { double fare(Ride r); }

class NormalFare implements FareStrategy {
    public double fare(Ride r) { return 50 + 12 * r.km() + 1 * r.minutes(); }
}
class SurgeFare implements FareStrategy {
    private final FareStrategy base; private final double multiplier;
    SurgeFare(FareStrategy base, double multiplier) {
        if (multiplier < 1.0 || multiplier > 5.0) throw new IllegalArgumentException("surge 1.0-5.0");
        this.base = base; this.multiplier = multiplier;
    }
    public double fare(Ride r) { return base.fare(r) * multiplier; }
}
class PoolFare implements FareStrategy {
    private final FareStrategy base;
    PoolFare(FareStrategy base) { this.base = base; }
    public double fare(Ride r) { return base.fare(r) * 0.7; }
}
class AirportFare implements FareStrategy {          // added later: zero edits elsewhere
    public double fare(Ride r) { return 200 + 15 * r.km(); }
}

class FareCalculator {
    private FareStrategy strategy;
    FareCalculator(FareStrategy s) { this.strategy = s; }
    void setStrategy(FareStrategy s) { this.strategy = s; }
    double calculate(Ride r) {
        if (r.km() < 0 || r.minutes() < 0) throw new IllegalArgumentException("negative ride");
        return Math.round(strategy.fare(r) * 100) / 100.0;
    }

    public static void main(String[] args) {
        Ride ride = new Ride(10, 20);
        FareStrategy normal = new NormalFare();
        FareCalculator calc = new FareCalculator(normal);
        System.out.println("NORMAL  " + calc.calculate(ride));   // 190.0
        calc.setStrategy(new SurgeFare(normal, 1.5));
        System.out.println("SURGE   " + calc.calculate(ride));   // 285.0
        calc.setStrategy(new PoolFare(normal));
        System.out.println("POOL    " + calc.calculate(ride));   // 133.0
        calc.setStrategy(new AirportFare());
        System.out.println("AIRPORT " + calc.calculate(ride));   // 350.0
    }
}`,
        complexity: `<p>O(1) per fare. Adding a fare type: one new class, zero modified classes. Strategies are immutable → safe to share across threads.</p>`,
        followUps: ['How would you pick the strategy from a city + time-of-day config without if/else? (Map registry or a rule chain.)', 'How would you combine SURGE on top of POOL? (Wrapping strategies — that is the Decorator idea.)', 'How do you unit test each strategy?']
      }
    }]
  });

  /* ======================= TOPIC 2: OBSERVER ======================= */
  topics.push({
    title: 'Observer: Tell Everyone Who Cares, Without Knowing Them',
    analogy: `<p>A <b>YouTube channel</b> does not phone each fan when a new video is out. Fans press <b>Subscribe</b>; when a video is uploaded, YouTube notifies every subscriber automatically. The creator does not even know who the subscribers are, and fans can unsubscribe any time. A <b>newspaper delivery</b> works the same way: you sign up, and every morning the paper arrives until you cancel.</p>`,
    explain: `<p><b>Observer in one line:</b> an object (the <b>subject</b>) keeps a list of interested objects (<b>observers</b>) and automatically tells all of them when something changes. Observers can join or leave at any time.</p>
${H.table(['Role', 'Job', 'Stock example'], [
  ['<b>Subject</b> (publisher)', 'Holds state + a list of observers; has <code>subscribe</code>, <code>unsubscribe</code>, <code>notifyAll</code>', '<code>StockTicker</code>'],
  ['<b>Observer</b> (interface)', 'One callback method, e.g. <code>onPriceChange(symbol, price)</code>', '<code>PriceObserver</code>'],
  ['<b>Concrete observers</b>', 'Each reacts in its own way', '<code>MobileApp</code>, <code>EmailAlert</code>, <code>TradingBot</code>, <code>Dashboard</code>']
])}
<p><b>The naive way:</b> inside <code>setPrice()</code> you write <code>mobileApp.push(…); emailService.send(…); tradingBot.consider(…);</code>. Now the ticker <i>knows and depends on</i> every consumer. Adding a dashboard means editing the ticker. Removing email for a weekend means editing the ticker. One slow email server makes the whole price update slow. ${H.c('r', 'The producer is welded to all its consumers.')}</p>
<p><b>With Observer:</b> the ticker only knows the <i>interface</i>. It loops over a list and calls the same method on each. Consumers plug themselves in. ${H.c('g', 'One-to-many dependency, loosely coupled.')}</p>
<p>Two delivery styles: <b>push</b> (the subject sends the data in the call: <code>onPrice("TCS", 3900)</code>) and <b>pull</b> (the subject just says "I changed", and the observer calls <code>ticker.getPrice()</code>). Push is simpler and most common; pull avoids sending data that most observers do not need.</p>
<p>You meet Observer everywhere: GUI click listeners, <code>addEventListener</code> in JavaScript, Spring <code>@EventListener</code>, React state re-rendering, database triggers, and — at system scale — Kafka/pub-sub topics.</p>`,
    clues: [
      '"When X happens, <b>notify</b> A, B and C" / "send alerts to all subscribers" → Observer.',
      '"Users can <b>subscribe / unsubscribe / follow</b>" → subject keeps an observer list.',
      '"New consumers will be added later without changing the producer" → loose one-to-many coupling.',
      '"Update the UI whenever the model changes" (MVC, data binding) → Observer.',
      'Machine-coding: <b>notification service</b>, stock ticker, auction bidding (notify all bidders), order status updates, YouTube/Twitter follow feed, elevator display panels.',
      'If they say "across services / must survive crashes" → still Observer idea, but implemented as a <b>message broker</b> (pub/sub), not in-memory lists.'
    ],
    code: [{ lang: 'java', title: 'Thread-safe Observer with typed events and unsubscribe handles', code: `// The observer contract: one callback. A lambda can implement it.
@FunctionalInterface
interface PriceObserver { void onPrice(String symbol, double oldPrice, double newPrice); }

class StockTicker {
    // CopyOnWriteArrayList: safe if observers (un)subscribe while we are notifying.
    private final List<PriceObserver> observers = new CopyOnWriteArrayList<>();
    private final Map<String, Double> prices = new HashMap<>();

    // Returning an AutoCloseable "subscription" makes unsubscribing easy and leak-proof.
    AutoCloseable subscribe(PriceObserver o) {
        observers.add(o);
        return () -> observers.remove(o);
    }

    void setPrice(String symbol, double newPrice) {
        Double old = prices.put(symbol, newPrice);
        if (old != null && old == newPrice) return;          // no change, no noise
        notifyAllObservers(symbol, old == null ? newPrice : old, newPrice);
    }

    private void notifyAllObservers(String s, double oldP, double newP) {
        for (PriceObserver o : observers) {
            try {
                o.onPrice(s, oldP, newP);                  // push model: data travels with the call
            } catch (RuntimeException e) {                 // one broken observer must not stop the others
                System.out.println("observer failed: " + e.getMessage());
            }
        }
    }
}

class MobileApp implements PriceObserver {
    public void onPrice(String s, double o, double n) { System.out.println("[app] " + s + " now " + n); }
}
class EmailAlert implements PriceObserver {
    private final double thresholdPct;
    EmailAlert(double thresholdPct) { this.thresholdPct = thresholdPct; }
    public void onPrice(String s, double o, double n) {
        double change = Math.abs(n - o) / o * 100;
        if (change >= thresholdPct) System.out.println("[email] " + s + " moved " + String.format("%.1f", change) + "%");
    }
}

class Demo {
    public static void main(String[] args) throws Exception {
        StockTicker t = new StockTicker();
        t.subscribe(new MobileApp());
        AutoCloseable email = t.subscribe(new EmailAlert(3));
        t.subscribe((s, o, n) -> System.out.println("[dashboard] plot " + s + "=" + n));
        t.setPrice("TCS", 100);
        t.setPrice("TCS", 104);      // app, email (4%), dashboard
        email.close();               // unsubscribe
        t.setPrice("TCS", 97);       // app, dashboard only
    }
}` }],
    codeTitle: ['Observer in modern Java'],
    viz: {
      title: 'Observer: price updates fanning out to subscribers',
      input: '100 104 +bot 97 -email +dash 101',
      inputLabel: 'Events: a number = new price, +name = subscribe, -name = unsubscribe (names: app, email, bot, dash)',
      gen: function (input) {
        var t = tokens(input, /[\s,]+/, 12, 'Example: 100 104 +bot 97 -email');
        var ALL = { app: { id: 'APP', label: 'MobileApp', y: 8 }, email: { id: 'EM', label: 'EmailAlert(≥3%)', y: 26 }, bot: { id: 'BOT', label: 'TradingBot', y: 44 }, dash: { id: 'DB', label: 'Dashboard', y: 62 } };
        var subs = ['app', 'email'];
        var nodesFor = function () {
          var ns = [B('ST', 'StockTicker (subject)', 18, 35)];
          Object.keys(ALL).forEach(function (k) { ns.push(B(ALL[k].id, ALL[k].label, 82, ALL[k].y)); });
          return ns;
        };
        var edgesFor = function () { return subs.map(function (k) { return ['ST', ALL[k].id]; }); };
        var frames = [], price = null;
        frames.push(F('<b>Structure.</b> The subject <code>StockTicker</code> holds a <b>list of PriceObserver</b>. It never names concrete classes — it just loops and calls <code>onPrice()</code>. Right now <b>app</b> and <b>email</b> are subscribed (arrows). bot and dash exist but are not listening (no arrow).',
          [G('Subject → subscribed observers', nodesFor(), edgesFor(), { h: 70, hl: { ST: 'sel' } }), { type: 'list', label: 'observers list inside StockTicker', values: subs.map(function (k) { return ALL[k].label; }) }]));
        t.forEach(function (tok) {
          var m = /^([+-])([a-z]+)$/i.exec(tok);
          if (m) {
            var name = m[2].toLowerCase();
            if (!ALL[name]) throw new Error('Unknown observer "' + name + '". Use app, email, bot or dash');
            var h = {}; h[ALL[name].id] = m[1] === '+' ? 'ok' : 'bad';
            if (m[1] === '+') {
              if (subs.indexOf(name) < 0) subs.push(name);
              frames.push(F('<code>ticker.subscribe(' + ALL[name].label + ')</code>: the observer is <b>added to the list</b>. The ticker code did not change — ' + H.c('g', 'new consumer plugged in at runtime') + '.',
                [G('Subscribe', nodesFor(), edgesFor(), { h: 70, hl: h, ehl: (function () { var e = {}; e['ST-' + ALL[name].id] = 'ok'; return e; })() }), { type: 'list', label: 'observers list', values: subs.map(function (k) { return ALL[k].label; }) }]));
            } else {
              var at = subs.indexOf(name);
              if (at >= 0) subs.splice(at, 1);
              frames.push(F('<code>subscription.close()</code> for ' + ALL[name].label + ': removed from the list, so it will ' + H.c('r', 'not') + ' hear future updates. (Forgetting this is the classic "lapsed listener" memory leak.)',
                [G('Unsubscribe', nodesFor(), edgesFor(), { h: 70, hl: h }), { type: 'list', label: 'observers list', values: subs.map(function (k) { return ALL[k].label; }) }]));
            }
            return;
          }
          var p = Number(tok);
          if (isNaN(p) || p <= 0 || p > 1e6) throw new Error('"' + tok + '" is not a price or +name / -name');
          var old = price === null ? p : price;
          price = p;
          var pct = old ? Math.round(Math.abs(p - old) / old * 1000) / 10 : 0;
          frames.push(F('<code>setPrice(' + p + ')</code> (old ' + old + ', change ' + pct + '%). The subject updates its own state, then calls <code>notifyAll()</code>, which walks the list <b>in order</b>.',
            [G('Price changed', nodesFor(), edgesFor(), { h: 70, hl: { ST: 'cur' } }), VARS('StockTicker state', { symbol: 'TCS', oldPrice: old, newPrice: p, subscribers: subs.length }, { newPrice: 'cur' })]));
          var ehl = {}, hl = { ST: 'cur' }, tags = {};
          subs.forEach(function (k, i) {
            var o = ALL[k], react;
            if (k === 'app') react = 'push "TCS ' + p + '"';
            else if (k === 'email') react = pct >= 3 ? 'email sent (' + pct + '%)' : 'ignored (under 3%)';
            else if (k === 'bot') react = p < old ? 'BUY signal' : 'hold';
            else react = 'chart point ' + p;
            ehl['ST-' + o.id] = 'ok'; hl[o.id] = 'ok'; tags[o.id] = react;
            var e2 = clone(ehl), h2 = clone(hl); e2['ST-' + o.id] = 'cur'; h2[o.id] = 'cur';
            frames.push(F('Notify #' + (i + 1) + ': <code>' + o.label.replace(/\(.*$/, '') + '.onPrice("TCS", ' + old + ', ' + p + ')</code> → ' + react + '. Each observer decides <i>for itself</i> what to do; the subject does not care.',
              [G('Fan-out, edge by edge', nodesFor(), edgesFor(), { h: 70, hl: h2, ehl: e2, tags: clone(tags) })]));
          });
          if (!subs.length) frames.push(F('Nobody is subscribed, so the notification loop does nothing. The subject still works fine — it never depended on any observer.', [G('Empty list', nodesFor(), [], { h: 70, hl: { ST: 'cur' } })]));
        });
        frames.push(F('Done. Notice: across all those events, the <code>StockTicker</code> class was never edited — consumers came and went at runtime. ' + H.c('g', 'That is the whole point of Observer.'),
          [G('Final subscriptions', nodesFor(), edgesFor(), { h: 70, hl: { ST: 'sel' } }), { type: 'list', label: 'observers list', values: subs.length ? subs.map(function (k) { return ALL[k].label; }) : ['(empty)'] }]));
        return frames;
      }
    },
    examples: [
      { title: 'GUI / browser event listeners', html: `<p><code>button.addActionListener(e -&gt; save())</code> in Swing or <code>button.addEventListener('click', save)</code> in JS: the button is the subject, your lambda is the observer. The button library was written years before your code, yet it can call you — because it only knows the listener interface.</p>` },
      { title: 'Order status updates in e-commerce', html: `<p>When an order becomes <b>SHIPPED</b>: send SMS, send email, update loyalty points, notify the warehouse dashboard. With Observer, <code>Order.setStatus()</code> publishes an <code>OrderShipped</code> event and four listeners react. Next quarter adding "WhatsApp message" is one new listener class.</p>`, code: `interface OrderListener { void onStatus(String orderId, String status); }
List<OrderListener> listeners = new ArrayList<>();
listeners.add((id, st) -> System.out.println("SMS: order " + id + " is " + st));
listeners.add((id, st) -> System.out.println("Loyalty: +10 points for " + id));
for (OrderListener l : listeners) l.onStatus("A42", "SHIPPED");` },
      { title: 'Auction: notify all other bidders', html: `<p>Each bidder subscribes to an <code>Auction</code>. When Asha bids ₹500, the auction notifies everyone <i>except</i> Asha that the highest bid changed. Note the design decision: the subject can filter (skip the sender) — or each observer can ignore its own event. Discuss which is cleaner (subject-side filtering keeps observers dumb).</p>` },
      { title: 'Observer vs Pub/Sub broker', html: `<p>In-process Observer: subject holds direct references; delivery is a method call; if the process dies, events are lost. <b>Pub/Sub</b> (Kafka, Redis Pub/Sub, SNS): publisher and subscribers do not know each other at all — a <b>broker</b> sits between them, events can be persisted, replayed, delivered across machines. Same idea, different scale. Say this in interviews to show you know the boundary.</p>` }
    ],
    deepDive: `<p><b>The lapsed listener problem:</b> the subject's list holds strong references, so an observer that forgot to unsubscribe can never be garbage collected (a classic Android/Swing memory leak). Fixes: return an <code>AutoCloseable</code> subscription and use try-with-resources or lifecycle hooks; or store <code>WeakReference</code> observers (but then lambdas with no other reference vanish instantly — surprising!).</p>
<p><b>Concurrency:</b> iterating an <code>ArrayList</code> while an observer unsubscribes inside its callback throws <code>ConcurrentModificationException</code>. <code>CopyOnWriteArrayList</code> gives a snapshot iterator — perfect when reads (notifications) vastly outnumber writes (subscriptions). Never call observers while holding a lock: an observer may call back into the subject and deadlock.</p>
<p><b>Failure isolation and ordering:</b> one observer throwing must not stop the rest — wrap each call. Notification order is the list order; <b>never</b> let correctness depend on it. Slow observers block the subject in a synchronous design — move to async delivery (an <code>ExecutorService</code> per observer, or a queue) when observers do I/O.</p>
<p><b>Re-entrancy and cascades:</b> an observer that changes the subject triggers another notification while the first is still in progress → infinite loops or inconsistent views. Guard with a "notifying" flag or queue events.</p>
<p><b>Java history:</b> <code>java.util.Observable</code> was deprecated in Java 9 (it is a class, not an interface, and its notification order and thread-safety were unspecified). Use your own interface, <code>PropertyChangeSupport</code> (JavaBeans), <code>java.util.concurrent.Flow</code> (Reactive Streams with <b>back-pressure</b>), or frameworks (Spring events, RxJava, Project Reactor).</p>`,
    aiEra: `<p><b>What AI changes:</b> asking an assistant "add an email notification when stock changes" usually yields a direct call inside <code>setPrice()</code>. Recognise the one-to-many smell and steer it: "Refactor to an Observer with a <code>PriceObserver</code> interface and <code>CopyOnWriteArrayList</code>, keep subscriptions closeable." AI is great at producing the listener boilerplate and the tests that assert each observer got called once.</p>
<p><b>Agents are event-driven:</b> tool results, streaming tokens and human-in-the-loop approvals are all delivered via callbacks/observers (e.g. streaming handlers that fire per token). LLM observability tools hook into frameworks as observers to log every model call.</p>
<p><b>Where AI goes wrong:</b> forgets unsubscribe (leaks), iterates a plain <code>ArrayList</code> while mutating it, lets one exception kill the loop, or calls observers inside a <code>synchronized</code> block. <b>What you own:</b> sync vs async delivery, failure isolation, ordering guarantees, and when to graduate to a real broker.</p>`,
    problems: [{
      title: 'Stock Price Alert System', level: 'Medium', tags: ['observer', 'notifications'], companies: ['Zerodha', 'Robinhood', 'Bloomberg'],
      statement: `<p>Build <code>StockMarket</code> where users subscribe to a stock symbol with a rule: "alert me when price goes <b>above X</b>" or "<b>below Y</b>". When <code>updatePrice(symbol, price)</code> is called, every matching subscriber of <b>that symbol only</b> is notified once per crossing (not on every tick while it stays above). Users can unsubscribe. Channels (push/SMS/email) must be pluggable.</p>`,
      constraints: `Up to 10<sup>4</sup> symbols, 10<sup>5</sup> subscriptions. Updates are frequent; subscriptions are rare. Updates for one symbol must not touch subscribers of other symbols.`,
      example: `<p>Asha: TCS above 4000 (push). Ben: TCS below 3500 (SMS).<br>update TCS 3900 → nobody. update TCS 4050 → ${H.c('g', 'Asha alerted')} (crossed above). update TCS 4100 → ${H.c('m', 'nobody')} (still above, no new crossing). update TCS 3400 → ${H.c('g', 'Ben alerted')}.</p>`,
      brute: { why: `<p>The market keeps one global list and, on every update, loops over <b>all</b> 10<sup>5</sup> subscriptions checking symbol and rule, and calls <code>smsService.send()</code> / <code>emailService.send()</code> directly with an if/else on channel. Wasted work: scanning unrelated symbols; coupling: adding WhatsApp edits the market; bug: alerts fire on every tick above the threshold.</p>`, code: `class NaiveMarket {
    record Sub(String user, String symbol, double above, double below, String channel) {}
    private final List<Sub> subs = new ArrayList<>();
    void add(Sub s) { subs.add(s); }
    void updatePrice(String symbol, double price) {
        for (Sub s : subs) {                                     // scans every symbol's subs
            if (!s.symbol().equals(symbol)) continue;
            boolean hit = price > s.above() || price < s.below(); // fires on EVERY tick
            if (!hit) continue;
            if (s.channel().equals("SMS")) System.out.println("SMS to " + s.user());
            else if (s.channel().equals("EMAIL")) System.out.println("EMAIL to " + s.user());
            else System.out.println("PUSH to " + s.user());       // new channel = edit here
        }
    }
}` },
      mcq: { q: 'How do you make sure an update to INFY never scans TCS subscribers?', options: ['Map&lt;String symbol, List&lt;Observer&gt;&gt; — one subject list per symbol', 'Sort the global list', 'Use a Set instead of a List', 'Notify everyone and let them filter'], answer: 0, explain: 'Partition observers by topic (symbol). Each update only walks its own list — like per-topic subscriptions in a pub/sub system.' },
      hints: [`<p>Hint 1: Each subscription is an <b>observer</b> with its own rule and its own memory of "was I already triggered?" (edge detection = notify on crossing only).</p>`, `<p>Hint 2: <code>Map&lt;String, List&lt;PriceAlert&gt;&gt;</code> keyed by symbol, values in <code>CopyOnWriteArrayList</code>. Channel is a separate <code>Notifier</code> interface (a strategy) injected into the alert.</p>`, `<p>Hint 3: Rule "above X": fire when <code>prev ≤ X &lt; now</code>. Store <code>lastPrice</code> per symbol. Return a handle from subscribe so the user can unsubscribe. Recipe: subscribe → map.computeIfAbsent(symbol) → add; update → get list → for each: alert.onPrice(prev, now).</p>`],
      solution: {
        approach: `<p>Use Observer with <b>topic partitioning</b>: the market is a subject per symbol (a map from symbol to its observer list). Each <code>PriceAlert</code> is an observer that knows its rule and detects <b>crossings</b> using the previous and new price, so it fires once per crossing. How the alert is delivered is a separate <code>Notifier</code> strategy, so adding WhatsApp touches neither the market nor the alert logic. Subscriptions return a <code>Runnable</code> that removes the observer.</p>`,
        code: `interface Notifier { void send(String user, String msg); }

interface PriceListener { void onPrice(String symbol, double prev, double now); }

class PriceAlert implements PriceListener {
    enum Dir { ABOVE, BELOW }
    private final String user; private final Dir dir; private final double level; private final Notifier notifier;
    PriceAlert(String user, Dir dir, double level, Notifier notifier) {
        this.user = user; this.dir = dir; this.level = level; this.notifier = notifier;
    }
    public void onPrice(String symbol, double prev, double now) {
        boolean crossed = dir == Dir.ABOVE ? (prev <= level && now > level) : (prev >= level && now < level);
        if (crossed) notifier.send(user, symbol + " is " + dir + " " + level + " (now " + now + ")");
    }
}

class StockMarket {
    private final Map<String, List<PriceListener>> bySymbol = new ConcurrentHashMap<>();
    private final Map<String, Double> lastPrice = new ConcurrentHashMap<>();

    Runnable subscribe(String symbol, PriceListener l) {
        bySymbol.computeIfAbsent(symbol, k -> new CopyOnWriteArrayList<>()).add(l);
        return () -> bySymbol.getOrDefault(symbol, List.of()).remove(l);   // unsubscribe handle
    }

    void updatePrice(String symbol, double now) {
        Double prevObj = lastPrice.put(symbol, now);
        double prev = prevObj == null ? now : prevObj;
        for (PriceListener l : bySymbol.getOrDefault(symbol, List.of())) {   // only THIS symbol
            try { l.onPrice(symbol, prev, now); }
            catch (RuntimeException e) { System.out.println("listener failed: " + e.getMessage()); }
        }
    }

    public static void main(String[] args) {
        Notifier push = (u, m) -> System.out.println("PUSH " + u + ": " + m);
        Notifier sms = (u, m) -> System.out.println("SMS  " + u + ": " + m);
        StockMarket mkt = new StockMarket();
        mkt.subscribe("TCS", new PriceAlert("asha", PriceAlert.Dir.ABOVE, 4000, push));
        Runnable ben = mkt.subscribe("TCS", new PriceAlert("ben", PriceAlert.Dir.BELOW, 3500, sms));
        for (double p : new double[]{3900, 4050, 4100, 3400}) mkt.updatePrice("TCS", p);
        ben.run();                       // ben unsubscribes
        mkt.updatePrice("TCS", 3600);
        mkt.updatePrice("TCS", 3300);    // nobody: asha's rule is ABOVE, ben left
    }
}`,
        complexity: `<p>Update: O(k) where k = subscribers of that symbol (not all subscribers). Subscribe/unsubscribe: O(k) due to copy-on-write — fine because they are rare. Memory O(total subscriptions).</p>`,
        followUps: ['Notifications go to a slow SMS gateway — how do you keep updatePrice fast? (async executor / queue per channel)', 'How would this look across 50 servers? (Kafka topic per symbol partition, consumer groups)', 'How do you avoid alert storms when price oscillates around the level? (hysteresis / cooldown)']
      }
    }]
  });

  /* ======================= TOPIC 3: COMMAND ======================= */
  topics.push({
    title: 'Command: Turn a Request into an Object (Undo, Queue, Log)',
    analogy: `<p>At a <b>restaurant</b>, you do not walk into the kitchen and tell the chef what to do. The waiter writes your wish on an <b>order slip</b> and puts it on the rail. The slip is a <i>thing</i>: it can wait in a queue, be cancelled, be re-done if the dish is dropped, and at the end of the day the slips are a log of everything that happened. The waiter does not know how to cook; the chef does not know who ordered. The slip connects them. That slip is a <b>Command object</b>.</p>`,
    explain: `<p><b>Command in one line:</b> wrap "do this action, on this object, with these arguments" into an object with an <code>execute()</code> method (and usually <code>undo()</code>). Now an action can be <b>stored, queued, logged, retried, scheduled or undone</b> like any other data.</p>
${H.table(['Role', 'Job', 'Text editor example'], [
  ['<b>Command</b> (interface)', '<code>execute()</code>, <code>undo()</code>', '<code>EditCommand</code>'],
  ['<b>Concrete command</b>', 'Stores the receiver + the arguments + what it needs to undo', '<code>InsertText("Hello")</code>, <code>DeleteText(3)</code>'],
  ['<b>Receiver</b>', 'The object that really does the work', '<code>Document</code>'],
  ['<b>Invoker</b>', 'Triggers commands, keeps history; does not know what they do', '<code>CommandManager</code> (toolbar, keyboard shortcuts)'],
  ['<b>Client</b>', 'Creates the command and hands it to the invoker', 'the key handler for Ctrl+V']
])}
<p><b>The naive way:</b> the toolbar button calls <code>document.insert(…)</code> directly, and undo is a giant method: <code>if (lastAction.equals("INSERT")) … else if (lastAction.equals("DELETE")) …</code> that must remember every action's details in loose fields. Or worse, snapshot the <i>whole document</i> after every keystroke (memory blows up on a 50 MB file). ${H.c('r', 'Undo logic for every action lives in one tangled place.')}</p>
<p><b>With Command:</b> each action knows how to do <i>and undo itself</i>. The invoker keeps two stacks: <b>undo stack</b> and <b>redo stack</b>.</p>
<ul>
<li>Run a new command → execute it, push on undo stack, ${H.c('y', 'clear the redo stack')} (the old "future" is no longer valid).</li>
<li>Undo → pop from undo stack, call <code>undo()</code>, push on redo stack.</li>
<li>Redo → pop from redo stack, call <code>execute()</code>, push back on undo stack.</li>
</ul>
<p>The same object model gives you <b>job queues</b> (a thread pool runs <code>Runnable</code> commands), <b>macros</b> (a command that holds a list of commands), <b>transaction logs</b> (write commands to disk, replay after a crash) and <b>remote calls</b> (serialize the command, send it).</p>`,
    clues: [
      '"Support <b>undo / redo</b>" → Command with undo and redo stacks (or Memento if actions are hard to reverse).',
      '"<b>Queue</b> requests and process them later / on another thread" / "schedule jobs" → Command (Runnable/Callable are commands).',
      '"Record a <b>macro</b>" / "replay the sequence of operations" / "audit log of every action" → Command objects stored in a list.',
      '"Decouple the button/remote from the device it controls" (smart-home remote, keyboard shortcuts, menu items) → Command.',
      '"Retry failed operations" / "transactional outbox" / "event sourcing" → operations as data.',
      'Machine-coding: <b>text editor</b>, drawing app, smart-home remote, bank transactions with reversal, spreadsheet with undo, game replays.'
    ],
    code: [{ lang: 'java', title: 'Text editor with undo/redo using Command', code: `// Receiver: knows HOW to edit text. Knows nothing about undo.
class Document {
    private final StringBuilder text = new StringBuilder();
    void insert(int pos, String s) { text.insert(pos, s); }
    String delete(int pos, int len) {                  // returns what was removed
        String gone = text.substring(pos, pos + len);
        text.delete(pos, pos + len);
        return gone;
    }
    int length() { return text.length(); }
    @Override public String toString() { return text.toString(); }
}

interface EditCommand {
    void execute();
    void undo();
}

// Each command stores exactly what it needs to reverse itself (not the whole document).
class InsertText implements EditCommand {
    private final Document doc; private final String s; private int pos;
    InsertText(Document doc, String s) { this.doc = doc; this.s = s; }
    public void execute() { pos = doc.length(); doc.insert(pos, s); }
    public void undo() { doc.delete(pos, s.length()); }
}
class DeleteLast implements EditCommand {
    private final Document doc; private final int n; private String removed = ""; private int pos;
    DeleteLast(Document doc, int n) { this.doc = doc; this.n = n; }
    public void execute() {
        int k = Math.min(n, doc.length());
        pos = doc.length() - k;
        removed = doc.delete(pos, k);                  // remember the deleted text for undo
    }
    public void undo() { doc.insert(pos, removed); }
}

// Invoker: runs commands and keeps history. It never looks inside a command.
class CommandManager {
    private final Deque<EditCommand> undo = new ArrayDeque<>();
    private final Deque<EditCommand> redo = new ArrayDeque<>();
    private final int limit;
    CommandManager(int limit) { this.limit = limit; }

    void run(EditCommand c) {
        c.execute();
        undo.push(c);
        if (undo.size() > limit) undo.removeLast();     // bounded history: drop the oldest
        redo.clear();                                  // a new action kills the old "future"
    }
    boolean undo() {
        if (undo.isEmpty()) return false;
        EditCommand c = undo.pop(); c.undo(); redo.push(c); return true;
    }
    boolean redo() {
        if (redo.isEmpty()) return false;
        EditCommand c = redo.pop(); c.execute(); undo.push(c); return true;
    }
}

class EditorDemo {
    public static void main(String[] args) {
        Document doc = new Document();
        CommandManager cm = new CommandManager(100);
        cm.run(new InsertText(doc, "Hello"));
        cm.run(new InsertText(doc, " World"));
        cm.run(new DeleteLast(doc, 3));
        System.out.println(doc);   // Hello Wo
        cm.undo(); System.out.println(doc);   // Hello World
        cm.undo(); System.out.println(doc);   // Hello
        cm.redo(); System.out.println(doc);   // Hello World
    }
}` }, { lang: 'java', title: 'Commands as jobs: queue, macro and log', code: `// Runnable IS the Command pattern without undo. An executor is an invoker with a queue.
class JobsDemo {
    public static void main(String[] args) throws Exception {
        List<String> auditLog = new CopyOnWriteArrayList<>();
        BlockingQueue<Runnable> queue = new LinkedBlockingQueue<>();

        queue.add(() -> auditLog.add("resize image 42"));
        queue.add(() -> auditLog.add("send welcome email to asha"));

        // Macro = a command made of commands (Composite + Command)
        List<Runnable> steps = List.of(() -> auditLog.add("lights off"), () -> auditLog.add("lock door"));
        Runnable goodNight = () -> steps.forEach(Runnable::run);
        queue.add(goodNight);

        ExecutorService pool = Executors.newFixedThreadPool(2);
        while (!queue.isEmpty()) pool.submit(queue.poll());   // the invoker does not know what jobs do
        pool.shutdown();
        pool.awaitTermination(1, TimeUnit.SECONDS);
        System.out.println(auditLog.size() + " actions ran: " + auditLog);
    }
}` }],
    codeTitle: ['Undo/redo editor', 'Command as queued jobs + macro'],
    viz: {
      title: 'Command: undo and redo stacks in a text editor',
      input: 'type Hello; type  World; delete 3; undo; undo; redo; type !; redo',
      inputLabel: 'Actions separated by ; (type TEXT | delete N | undo | redo)',
      gen: function (input) {
        var acts = tokens(input, ';', 14, 'Example: type Hello; delete 2; undo; redo');
        var raw = String(input).split(';').filter(function (s) { return s.trim().length; });
        var nodes = [B('CL', 'Client (key handler)', 12, 8), B('INV', 'CommandManager (invoker)', 45, 8), B('CMD', '«EditCommand»', 45, 34), B('INS', 'InsertText', 18, 58), B('DEL', 'DeleteLast', 72, 58), B('DOC', 'Document (receiver)', 85, 30)];
        var edges = [['CL', 'INV', 'run(cmd)'], ['INV', 'CMD', 'execute/undo'], ['INS', 'CMD'], ['DEL', 'CMD'], ['INS', 'DOC'], ['DEL', 'DOC']];
        var doc = '', undo = [], redo = [], frames = [];
        var lbl = function (c) { return c.kind === 'ins' ? 'Insert "' + c.s + '"' : 'Delete ' + c.n + (c.removed !== undefined ? ' ("' + c.removed + '")' : ''); };
        var parts = function (g, hlU, hlR) {
          return [g, VARS('Document text', { text: '"' + doc + '"', length: doc.length }),
            STACK('Undo stack (top = last done)', undo.map(lbl), hlU || {}), STACK('Redo stack', redo.map(lbl), hlR || {})];
        };
        frames.push(F('<b>Structure.</b> The client creates command objects and hands them to the <b>invoker</b>. The invoker only knows <code>execute()</code>/<code>undo()</code>. Each concrete command talks to the <b>receiver</b> (Document). Both stacks start empty.',
          parts(G('Command roles', nodes, edges, { h: 66, hl: { INV: 'sel', CMD: 'sel' } }))));
        acts.forEach(function (a, i) {
          var rawA = raw[i].replace(/^\s+/, '');
          var m = /^(\w+)\s?([\s\S]*)$/.exec(rawA), op = m ? m[1].toLowerCase() : '';
          if (op === 'type') {
            var s = m[2];
            if (!s.length) throw new Error('"type" needs text, e.g. type Hello');
            if (s.length > 20) throw new Error('Keep typed text under 20 characters');
            var c = { kind: 'ins', s: s, pos: doc.length };
            doc = doc + s; undo.push(c); var cleared = redo.length; redo = [];
            frames.push(F('<code>run(new InsertText("' + esc(s) + '"))</code>: execute appends the text at position ' + c.pos + ', the command is <b>pushed on the undo stack</b>' + (cleared ? ', and the redo stack is ' + H.c('y', 'cleared (' + cleared + ' item(s) gone)') + ' because we branched off into a new future.' : '.'),
              parts(G('execute()', nodes, edges, { h: 66, hl: { CL: 'cur', INV: 'cur', INS: 'ok', DOC: 'ok' }, ehl: { 'CL-INV': 'cur', 'INV-CMD': 'ok', 'INS-DOC': 'ok' } }), (function () { var h = {}; h[undo.length - 1] = 'ok'; return h; })())));
          } else if (op === 'delete') {
            var n = parseInt(m[2], 10);
            if (isNaN(n) || n < 1 || n > 50) throw new Error('"delete" needs a count 1-50, e.g. delete 3');
            var k = Math.min(n, doc.length), c2 = { kind: 'del', n: n, pos: doc.length - k, removed: doc.slice(doc.length - k) };
            doc = doc.slice(0, doc.length - k); undo.push(c2); var cl2 = redo.length; redo = [];
            frames.push(F('<code>run(new DeleteLast(' + n + '))</code>: removes "' + esc(c2.removed) + '" and <b>remembers it inside the command</b> — that is all undo will need (not a copy of the whole document).' + (cl2 ? ' Redo stack cleared.' : ''),
              parts(G('execute()', nodes, edges, { h: 66, hl: { CL: 'cur', INV: 'cur', DEL: 'ok', DOC: 'ok' }, ehl: { 'CL-INV': 'cur', 'INV-CMD': 'ok', 'DEL-DOC': 'ok' } }), (function () { var h = {}; h[undo.length - 1] = 'ok'; return h; })())));
          } else if (op === 'undo') {
            if (!undo.length) {
              frames.push(F('<code>undo()</code> with an empty undo stack → nothing to undo, return false. ' + H.c('m', 'Always handle this edge case.'), parts(G('nothing to undo', nodes, edges, { h: 66, hl: { INV: 'bad' } }))));
              return;
            }
            var u = undo.pop();
            var hlu = {}; hlu[undo.length] = 'bad';
            var before = undo.concat([u]);
            if (u.kind === 'ins') doc = doc.slice(0, u.pos) + doc.slice(u.pos + u.s.length);
            else doc = doc.slice(0, u.pos) + u.removed + doc.slice(u.pos);
            redo.push(u);
            frames.push(F('<code>undo()</code>: pop <b>' + esc(lbl(u)) + '</b> from the undo stack and call its <code>undo()</code> — ' + (u.kind === 'ins' ? 'delete the text it inserted' : 're-insert the text it saved') + '. Then push it on the <b>redo stack</b> so it can be replayed.',
              [G('undo()', nodes, edges, { h: 66, hl: { INV: 'cur', DOC: 'cur' }, ehl: { 'INV-CMD': 'cur' } }), VARS('Document text', { text: '"' + doc + '"', length: doc.length }, { text: 'cur' }),
                STACK('Undo stack (before pop)', before.map(lbl), (function () { var h = {}; h[before.length - 1] = 'bad'; return h; })()), STACK('Redo stack', redo.map(lbl), (function () { var h = {}; h[redo.length - 1] = 'ok'; return h; })())]));
          } else if (op === 'redo') {
            if (!redo.length) {
              frames.push(F('<code>redo()</code> with an empty redo stack → nothing to redo (either nothing was undone, or a new action cleared the future).', parts(G('nothing to redo', nodes, edges, { h: 66, hl: { INV: 'bad' } }))));
              return;
            }
            var r = redo.pop();
            if (r.kind === 'ins') { r.pos = doc.length; doc = doc + r.s; }
            else { var k2 = Math.min(r.n, doc.length); r.pos = doc.length - k2; r.removed = doc.slice(doc.length - k2); doc = doc.slice(0, doc.length - k2); }
            undo.push(r);
            frames.push(F('<code>redo()</code>: pop <b>' + esc(lbl(r)) + '</b> from the redo stack, call <code>execute()</code> again, push it back on the undo stack.',
              parts(G('redo()', nodes, edges, { h: 66, hl: { INV: 'cur', DOC: 'ok' }, ehl: { 'INV-CMD': 'ok' } }), (function () { var h = {}; h[undo.length - 1] = 'ok'; return h; })())));
          } else throw new Error('Unknown action "' + rawA + '". Use type TEXT, delete N, undo or redo');
        });
        frames.push(F('Finished. Every action was an <b>object</b>: that is why we could stack it, reverse it and replay it. The invoker never contained a single if/else about action types.', parts(G('Command roles', nodes, edges, { h: 66, hl: { INV: 'sel' } }))));
        return frames;
      }
    },
    examples: [
      { title: 'Smart-home remote with programmable buttons', html: `<p>A remote has 7 slots. Slot 1 = <code>LightOnCommand(livingRoomLight)</code>, slot 2 = <code>FanSpeedCommand(fan, HIGH)</code>. The remote (invoker) just calls <code>slots[i].execute()</code>. Re-program a button at runtime by assigning a different command. The undo button calls <code>lastCommand.undo()</code> — for the fan, undo restores the <i>previous</i> speed that the command saved before changing it.</p>` },
      { title: 'Thread pools and schedulers', html: `<p><code>executor.submit(() -&gt; resize(img))</code>: your lambda is a command object. The executor (invoker) queues it, picks a thread and calls <code>run()</code>, with zero knowledge of image resizing. <code>ScheduledExecutorService</code> is the same with a time delay. Message queues (SQS, RabbitMQ) are this idea across machines: the message is a serialized command.</p>`, code: `ScheduledExecutorService ses = Executors.newSingleThreadScheduledExecutor();
Runnable reminder = () -> System.out.println("Drink water!");   // command object
ses.schedule(reminder, 10, TimeUnit.MILLISECONDS);
ses.shutdown();
ses.awaitTermination(1, TimeUnit.SECONDS);` },
      { title: 'Database-style write-ahead log', html: `<p>A key-value store writes each command (<code>SET k v</code>, <code>DEL k</code>) to an append-only log <b>before</b> applying it. After a crash, it replays the log to rebuild memory. Redis AOF works this way. Commands that are data = durability, replication (send the log to replicas) and auditing for free.</p>` },
      { title: 'Undo for irreversible actions', html: `<p>Some actions cannot be undone by "doing the opposite": sending an email, charging a card, applying a lossy image filter. Options: a <b>compensating command</b> (refund instead of un-charge, send a "please ignore" email), or a <b>Memento snapshot</b> taken before execute (the image filter). Mention this nuance — interviewers love it.</p>` }
    ],
    deepDive: `<p><b>What to store for undo:</b> the minimum needed to reverse — inserted position and length, deleted text, previous value. Storing full snapshots per command turns O(edit) memory into O(document) per step. Rule: reversible operations store <i>deltas</i>; non-invertible operations store a <i>memento</i>.</p>
<p><b>Redo invalidation:</b> after undoing three steps and typing something new, the redo stack must be cleared — otherwise redo would apply an edit on a document it was never meant for (positions no longer valid). Advanced editors keep an <b>undo tree</b> (Vim, Emacs undo-tree) instead of discarding branches.</p>
<p><b>Grouping/coalescing:</b> users expect one undo to remove a whole typed word, not one character. Merge consecutive <code>InsertText</code> commands within 500 ms into one (a <code>mergeWith(other)</code> method), or wrap a multi-step operation (find/replace-all) in a <b>MacroCommand</b> so it undoes atomically.</p>
<p><b>Bounded history:</b> cap the deque (drop oldest) to bound memory; persist to disk for very long sessions.</p>
<p><b>Concurrency and collaboration:</b> in a shared document (Google Docs), undoing <i>my</i> last insert after <i>you</i> typed before it means the stored position is stale. Real systems transform operations (<b>Operational Transformation</b>) or use <b>CRDTs</b>. In single-user apps, make the invoker single-threaded (UI thread) or synchronize run/undo/redo.</p>
<p><b>Idempotency:</b> queued commands may be delivered twice (at-least-once queues). Give each a unique id and make <code>execute()</code> idempotent, or de-duplicate on the receiver. <b>Command vs Strategy:</b> a strategy says <i>how</i> to do a job; a command says <i>which job</i> to do (with its arguments captured) — and can be stored and undone.</p>`,
    aiEra: `<p><b>What AI changes:</b> function calling in LLMs is literally the Command pattern: the model outputs a <b>tool call</b> (name + JSON arguments) — a request reified as data — and your code (the invoker) validates and executes it. Agents that edit code or files should log each tool call as a command with an <code>undo</code> (git commit, file backup) so a human can roll back a bad step.</p>
<p><b>Use AI as a partner:</b> "Generate JUnit tests that run random sequences of 50 commands, then undo all of them, and assert the document is empty" — property-based tests catch undo bugs humans miss.</p>
<p><b>Where AI goes wrong:</b> forgets to clear the redo stack, stores positions that become stale, implements undo by re-computing from scratch, or forgets that some commands are irreversible. <b>What you own:</b> choosing delta vs snapshot, grouping semantics, idempotency for queued commands and the human-approval gate for destructive agent actions.</p>`,
    problems: [{
      title: 'Bank Account Operations with Undo', level: 'Medium', tags: ['command', 'undo'], companies: ['Goldman Sachs', 'PayPal', 'Razorpay'],
      statement: `<p>Implement <code>Bank</code> with accounts and three operations: <b>deposit</b>(acc, amt), <b>withdraw</b>(acc, amt), <b>transfer</b>(from, to, amt). Every <i>successful</i> operation can be undone in reverse order with <code>undoLast()</code>, and <code>history()</code> lists performed operations. A failed operation (insufficient funds) must not change balances and must not enter the history. Adding new operation types (e.g. "add interest") must not change the undo machinery.</p>`,
      constraints: `Amounts are positive longs (paise). Up to 10<sup>5</sup> operations. Undo must be O(1) per operation.`,
      example: `<p>A=100, B=0. transfer(A,B,70) ✔ → A=30,B=70. withdraw(A,50) ${H.c('r', '✘ insufficient')} → no change, not in history. deposit(B,5) ✔ → B=75. undoLast() → B=70. undoLast() → A=100, B=0. history() was [transfer, deposit] before the undos.</p>`,
      brute: { why: `<p>Keep a list of strings like <code>"TRANSFER A B 70"</code> and in <code>undoLast()</code> parse the string and switch on the operation name to reverse it. Every new operation edits both the "do" switch and the "undo" switch; parsing is fragile; failed operations accidentally get logged because logging happens before the balance check.</p>`, code: `class NaiveBank {
    final Map<String, Long> bal = new HashMap<>();
    final Deque<String> log = new ArrayDeque<>();
    void op(String type, String a, String b, long amt) {
        log.push(type + " " + a + " " + b + " " + amt);          // logged even if it fails!
        if (type.equals("DEP")) bal.merge(a, amt, Long::sum);
        else if (type.equals("WD")) bal.merge(a, -amt, Long::sum);  // no funds check
        else if (type.equals("TR")) { bal.merge(a, -amt, Long::sum); bal.merge(b, amt, Long::sum); }
    }
    void undoLast() {
        String[] p = log.pop().split(" ");
        long amt = Long.parseLong(p[3]);
        if (p[0].equals("DEP")) bal.merge(p[1], -amt, Long::sum);     // second switch to maintain
        else if (p[0].equals("WD")) bal.merge(p[1], amt, Long::sum);
        else if (p[0].equals("TR")) { bal.merge(p[1], amt, Long::sum); bal.merge(p[2], -amt, Long::sum); }
    }
}` },
      mcq: { q: 'withdraw(A, 50) fails because A has only 30. What should the invoker do?', options: ['Not push it onto the undo stack — execute() reports failure first', 'Push it and let undo add 50 back', 'Push it and mark it failed', 'Throw away the entire history'], answer: 0, explain: 'Only successful commands belong in history; undoing a failed withdraw would create money. Have execute() return a boolean (or throw) and push only on success.' },
      hints: [`<p>Hint 1: Each operation becomes an object that knows how to <code>execute()</code> and <code>undo()</code> itself. The bank (invoker) just keeps a stack.</p>`, `<p>Hint 2: <code>interface BankCommand { boolean execute(); void undo(); String describe(); }</code>. Transfer can <b>reuse</b> withdraw + deposit internally, and undo them in reverse order.</p>`, `<p>Hint 3: Push to history only when <code>execute()</code> returns true. Undo on an empty stack returns false. Recipe: Account receiver with deposit/withdraw(returns boolean) → three command classes → Bank.run(cmd) / undoLast().</p>`],
      solution: {
        approach: `<p>Receiver = <code>Account</code> (holds balance, rejects overdrafts). Each operation is a <code>BankCommand</code> carrying its accounts and amount, so it can reverse itself exactly. <code>TransferCommand</code> is built from a withdraw and a deposit; if the withdraw fails nothing happens. The invoker <code>Bank</code> pushes only successful commands, so <code>undoLast()</code> is a pop + <code>undo()</code>. New operations (interest, fee) are new classes — the invoker never changes.</p>`,
        code: `class Account {
    final String id; private long balance;
    Account(String id, long balance) { this.id = id; this.balance = balance; }
    void deposit(long amt) { balance += amt; }
    boolean withdraw(long amt) {
        if (amt > balance) return false;          // receiver guards its own invariant
        balance -= amt; return true;
    }
    long balance() { return balance; }
}

interface BankCommand { boolean execute(); void undo(); String describe(); }

class DepositCommand implements BankCommand {
    private final Account acc; private final long amt;
    DepositCommand(Account acc, long amt) { this.acc = acc; this.amt = amt; }
    public boolean execute() { acc.deposit(amt); return true; }
    public void undo() { acc.withdraw(amt); }
    public String describe() { return "deposit " + amt + " to " + acc.id; }
}
class WithdrawCommand implements BankCommand {
    private final Account acc; private final long amt;
    WithdrawCommand(Account acc, long amt) { this.acc = acc; this.amt = amt; }
    public boolean execute() { return acc.withdraw(amt); }
    public void undo() { acc.deposit(amt); }
    public String describe() { return "withdraw " + amt + " from " + acc.id; }
}
class TransferCommand implements BankCommand {
    private final BankCommand out, in; private final String text;
    TransferCommand(Account from, Account to, long amt) {
        out = new WithdrawCommand(from, amt); in = new DepositCommand(to, amt);
        text = "transfer " + amt + " " + from.id + "->" + to.id;
    }
    public boolean execute() { if (!out.execute()) return false; in.execute(); return true; }
    public void undo() { in.undo(); out.undo(); }               // reverse order
    public String describe() { return text; }
}

class Bank {
    private final Deque<BankCommand> history = new ArrayDeque<>();
    boolean run(BankCommand c) {
        if (!c.execute()) { System.out.println("FAILED: " + c.describe()); return false; }
        history.push(c);
        return true;
    }
    boolean undoLast() {
        if (history.isEmpty()) return false;
        history.pop().undo();
        return true;
    }
    List<String> history() {
        List<String> out = new ArrayList<>();
        history.descendingIterator().forEachRemaining(c -> out.add(c.describe()));
        return out;
    }

    public static void main(String[] args) {
        Account a = new Account("A", 100), b = new Account("B", 0);
        Bank bank = new Bank();
        bank.run(new TransferCommand(a, b, 70));
        bank.run(new WithdrawCommand(a, 50));            // fails, not recorded
        bank.run(new DepositCommand(b, 5));
        System.out.println(bank.history() + " A=" + a.balance() + " B=" + b.balance());
        bank.undoLast(); bank.undoLast();
        System.out.println("after undo A=" + a.balance() + " B=" + b.balance());   // A=100 B=0
    }
}`,
        complexity: `<p>run and undoLast are O(1). History memory O(number of successful operations) — bound it with a capped deque in production.</p>`,
        followUps: ['Two threads transfer at once — where do you lock? (lock both accounts in a fixed id order to avoid deadlock)', 'Undo should be allowed only within 24 hours — where does that rule live?', 'How would you persist commands for crash recovery (write-ahead log)?']
      }
    }]
  });

  /* ======================= TOPIC 4: STATE ======================= */
  topics.push({
    title: 'State: Same Button, Different Behaviour by Mode',
    analogy: `<p>Press the <b>power button</b> on your phone. If the phone is <i>off</i>, it boots. If it is <i>on and unlocked</i>, the screen locks. If it is <i>ringing</i>, it silences the call. Same button, totally different behaviour — because the phone is in a different <b>state</b>. A <b>traffic light</b> is the same: "next" means green→yellow, yellow→red, red→green. Each mode knows what comes next.</p>`,
    explain: `<p><b>State in one line:</b> when an object's behaviour depends on which "mode" it is in, give each mode its own class. The object (the <b>context</b>) holds a reference to its current state object and <b>delegates</b> every action to it. States decide what the action does <i>and</i> which state comes next.</p>
${H.table(['Role', 'Job', 'Order example'], [
  ['<b>Context</b>', 'The thing with modes; delegates actions to its current state', '<code>Order</code>'],
  ['<b>State</b> (interface)', 'One method per action/event', '<code>pay()</code>, <code>ship()</code>, <code>deliver()</code>, <code>cancel()</code>'],
  ['<b>Concrete states</b>', 'One class per mode; legal actions do work + switch state, illegal ones refuse', '<code>NewState</code>, <code>PaidState</code>, <code>ShippedState</code>, <code>DeliveredState</code>, <code>CancelledState</code>']
])}
<p><b>The naive way:</b> an enum field <code>status</code> and, inside <i>every</i> method, a switch: <code>ship() { if (status == NEW) throw…; else if (status == PAID) {…status = SHIPPED;} else if (status == SHIPPED) throw…; else if …}</code>. With 5 states × 4 actions you get 20 branches scattered across 4 methods. Adding a state "ON_HOLD" means editing <b>every</b> method; forgetting one creates an illegal transition bug in production (e.g. shipping a cancelled order). ${H.c('r', 'The rules of one state are smeared across the whole class.')}</p>
<p><b>With State:</b> all rules of "Paid" live in <code>PaidState</code>. Adding ON_HOLD = one new class + edges from the states that can reach it. The context's methods become one-liners: <code>void ship() { state.ship(this); }</code>.</p>
<p><b>Think in a state diagram first</b> (circles = states, arrows = events). In interviews, <b>draw it before coding</b>: it surfaces missing transitions ("can you cancel after shipping?") and gives you a checklist of tests (every arrow + every missing arrow).</p>`,
    clues: [
      '"The object behaves <b>differently depending on its status / mode / phase</b>" → State.',
      '"Valid transitions are…", "you cannot X once Y happened", "lifecycle of an order / ticket / document" → state machine.',
      'Many methods each starting with <code>switch (status)</code> or <code>if (state == …)</code> → State pattern refactor.',
      'Machine-coding: <b>vending machine</b>, <b>ATM</b>, elevator, traffic light, media player (playing/paused/stopped), TCP connection, order/payment lifecycle, game character (idle/running/jumping).',
      '"Add a new status later without breaking others" → one class per state.',
      'Follow-up "what happens if <b>two requests</b> change the state at once?" → synchronized transitions / optimistic locking on a version column.'
    ],
    code: [{ lang: 'java', title: 'Order lifecycle with the State pattern', code: `interface OrderState {
    // Default = illegal. Each state overrides only what it allows. Unknown actions fail loudly.
    default void pay(Order o)     { illegal("pay"); }
    default void ship(Order o)    { illegal("ship"); }
    default void deliver(Order o) { illegal("deliver"); }
    default void cancel(Order o)  { illegal("cancel"); }
    String name();
    private void illegal(String action) {
        throw new IllegalStateException("Cannot " + action + " when order is " + name());
    }
}

// States hold no per-order data, so ONE instance of each can be shared by all orders.
final class NewState implements OrderState {
    static final NewState I = new NewState();
    public void pay(Order o)    { System.out.println("charging card"); o.setState(PaidState.I); }
    public void cancel(Order o) { o.setState(CancelledState.I); }
    public String name() { return "NEW"; }
}
final class PaidState implements OrderState {
    static final PaidState I = new PaidState();
    public void ship(Order o)   { System.out.println("handing to courier"); o.setState(ShippedState.I); }
    public void cancel(Order o) { System.out.println("refunding"); o.setState(CancelledState.I); }
    public String name() { return "PAID"; }
}
final class ShippedState implements OrderState {
    static final ShippedState I = new ShippedState();
    public void deliver(Order o) { o.setState(DeliveredState.I); }
    public String name() { return "SHIPPED"; }        // cancel not allowed: default throws
}
final class DeliveredState implements OrderState {
    static final DeliveredState I = new DeliveredState();
    public String name() { return "DELIVERED"; }      // terminal state
}
final class CancelledState implements OrderState {
    static final CancelledState I = new CancelledState();
    public String name() { return "CANCELLED"; }      // terminal state
}

class Order {
    private OrderState state = NewState.I;
    private final List<String> audit = new ArrayList<>();
    void setState(OrderState next) { audit.add(state.name() + " -> " + next.name()); state = next; }
    // Every public action is a one-line delegation. synchronized = one transition at a time.
    synchronized void pay()     { state.pay(this); }
    synchronized void ship()    { state.ship(this); }
    synchronized void deliver() { state.deliver(this); }
    synchronized void cancel()  { state.cancel(this); }
    String status() { return state.name(); }
    List<String> audit() { return audit; }

    public static void main(String[] args) {
        Order o = new Order();
        o.pay(); o.ship();
        try { o.cancel(); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }
        o.deliver();
        System.out.println(o.status() + " " + o.audit());
    }
}` }, { lang: 'java', title: 'Table-driven alternative: enum + transition map', code: `// When states have little behaviour (just "which event leads where"), a table is simpler than classes.
enum Light { RED, GREEN, YELLOW }
enum Event { TIMER, EMERGENCY }

class TrafficLight {
    private static final Map<Light, Map<Event, Light>> T = new EnumMap<>(Light.class);
    static {
        T.put(Light.RED,    Map.of(Event.TIMER, Light.GREEN,  Event.EMERGENCY, Light.RED));
        T.put(Light.GREEN,  Map.of(Event.TIMER, Light.YELLOW, Event.EMERGENCY, Light.RED));
        T.put(Light.YELLOW, Map.of(Event.TIMER, Light.RED,    Event.EMERGENCY, Light.RED));
    }
    private Light current = Light.RED;

    Light fire(Event e) {
        Light next = T.get(current).get(e);
        if (next == null) throw new IllegalStateException(e + " not allowed in " + current);
        current = next;
        return current;
    }

    public static void main(String[] args) {
        TrafficLight tl = new TrafficLight();
        for (int i = 0; i < 4; i++) System.out.print(tl.fire(Event.TIMER) + " ");
        System.out.println(tl.fire(Event.EMERGENCY));
    }
}` }],
    codeTitle: ['State classes', 'Enum transition table'],
    viz: {
      title: 'State machine: an order moving through its lifecycle',
      input: 'pay ship cancel deliver pay',
      inputLabel: 'Events in order (pay | ship | deliver | cancel)',
      gen: function (input) {
        var ev = tokens(input, /[\s,]+/, 12, 'Example: pay ship cancel deliver');
        var nodes = [N('NEW', 'NEW', 10, 30), N('PAID', 'PAID', 35, 30), N('SHIPPED', 'SHIPPED', 62, 30), N('DELIVERED', 'DELIVERED', 90, 30), N('CANCELLED', 'CANCELLED', 35, 62)];
        var edges = [['NEW', 'PAID', 'pay'], ['PAID', 'SHIPPED', 'ship'], ['SHIPPED', 'DELIVERED', 'deliver'], ['NEW', 'CANCELLED', 'cancel'], ['PAID', 'CANCELLED', 'cancel']];
        var T = { NEW: { pay: 'PAID', cancel: 'CANCELLED' }, PAID: { ship: 'SHIPPED', cancel: 'CANCELLED' }, SHIPPED: { deliver: 'DELIVERED' }, DELIVERED: {}, CANCELLED: {} };
        var CLS = { NEW: 'NewState', PAID: 'PaidState', SHIPPED: 'ShippedState', DELIVERED: 'DeliveredState', CANCELLED: 'CancelledState' };
        var code = 'class Order {\n  OrderState state = NewState.I;\n  void pay()     { state.pay(this); }\n  void ship()    { state.ship(this); }\n  void deliver() { state.deliver(this); }\n  void cancel()  { state.cancel(this); }\n}';
        var LINE = { pay: 3, ship: 4, deliver: 5, cancel: 6 };
        var cur = 'NEW', frames = [], audit = [];
        var done = {};
        frames.push(F('<b>Draw the state diagram first.</b> Circles are states, arrows are the only legal events. Anything without an arrow is illegal (e.g. <i>cancel</i> after SHIPPED). The order starts in <b>NEW</b>, and its <code>state</code> field points to the <code>NewState</code> object.',
          [G('Order state diagram', nodes, edges, { h: 70, hl: { NEW: 'cur' } }), VARS('Order context', { state: 'NewState', status: 'NEW' }, { state: 'cur' }), CODE('Context just delegates', code, { 2: 'cur' })]));
        ev.forEach(function (e) {
          e = e.toLowerCase();
          if (!LINE[e]) throw new Error('Unknown event "' + e + '". Use pay, ship, deliver or cancel');
          var hl = clone(done); hl[cur] = 'cur';
          var ch = {}; ch[LINE[e]] = 'cur';
          frames.push(F('Event <b>' + e + '()</b> arrives. The Order does <i>not</i> check its status — it calls <code>state.' + e + '(this)</code>, so Java dispatches to <b>' + CLS[cur] + '.' + e + '()</b>.',
            [G('Dispatching to the current state', nodes, edges, { h: 70, hl: hl }), VARS('Order context', { state: CLS[cur], status: cur, event: e + '()' }, { event: 'cur' }), CODE('Delegation', code, ch)]));
          var nxt = T[cur][e];
          if (!nxt) {
            var hb = clone(done); hb[cur] = 'bad';
            var cb = {}; cb[LINE[e]] = 'bad';
            frames.push(F(H.c('r', 'Illegal!') + ' ' + CLS[cur] + ' does not override <code>' + e + '()</code>, so the interface default throws <code>IllegalStateException("Cannot ' + e + ' when order is ' + cur + '")</code>. State stays <b>' + cur + '</b>. ' + (cur === 'DELIVERED' || cur === 'CANCELLED' ? 'It is a <b>terminal</b> state — nothing leaves it.' : 'No arrow labelled "' + e + '" leaves this circle.'),
              [G('Rejected event', nodes, edges, { h: 70, hl: hb, tags: (function () { var t = {}; t[cur] = e + '? no'; return t; })() }), VARS('Order context', { state: CLS[cur], status: cur, result: 'IllegalStateException' }, { result: 'bad' }), CODE('Delegation', code, cb)]));
            return;
          }
          var eh = {}; eh[cur + '-' + nxt] = 'ok';
          done[cur] = 'done';
          var hn = clone(done); hn[nxt] = 'ok';
          audit.push(cur + '→' + nxt);
          frames.push(F(CLS[cur] + '.' + e + '() does its work' + (e === 'pay' ? ' (charge card)' : e === 'ship' ? ' (hand to courier)' : e === 'cancel' && cur === 'PAID' ? ' (refund money)' : '') + ' and then calls <code>order.setState(' + CLS[nxt] + '.I)</code>. ' + H.c('g', 'The state object itself chose the next state') + ' — that is what separates State from Strategy.',
            [G('Transition ' + cur + ' → ' + nxt, nodes, edges, { h: 70, hl: hn, ehl: eh }), VARS('Order context', { state: CLS[nxt], status: nxt }, { state: 'ok' }), { type: 'list', label: 'audit log', values: audit.slice() }]));
          cur = nxt;
        });
        var fin = clone(done); fin[cur] = 'sel';
        frames.push(F('Final state: <b>' + cur + '</b>. Every rule for a state lived in one class, and illegal events were refused automatically by the default methods — no 20-branch switch anywhere.',
          [G('Final', nodes, edges, { h: 70, hl: fin }), { type: 'list', label: 'audit log', values: audit.length ? audit.slice() : ['(no transitions)'] }]));
        return frames;
      }
    },
    examples: [
      { title: 'Media player: play / pause / stop', html: `<p>States: <b>Stopped</b>, <b>Playing</b>, <b>Paused</b>. The <i>play</i> button in Stopped starts from 0:00; in Paused it resumes from the saved position; in Playing it does nothing. With State, each meaning lives in its own class instead of <code>if (playing) … else if (paused) …</code> in every button handler.</p>`, code: `interface PlayerState { PlayerState play(); PlayerState pause(); }
PlayerState[] holder = new PlayerState[1];
PlayerState paused = new PlayerState() {
    public PlayerState play() { System.out.println("resume"); return holder[0]; }
    public PlayerState pause() { return this; }
};
holder[0] = new PlayerState() {   // playing
    public PlayerState play() { return this; }
    public PlayerState pause() { System.out.println("pause at 1:23"); return paused; }
};
PlayerState s = holder[0];
s = s.pause();
s = s.play();` },
      { title: 'Vending machine (classic interview)', html: `<p>States: <b>Idle</b> → (insert coin) → <b>HasMoney</b> → (select item) → <b>Dispensing</b> → <b>Idle</b>, plus <b>SoldOut</b>. "Select item" in Idle says "insert money first"; in HasMoney it checks price and stock; in SoldOut it refunds. The machine (context) also holds data (inventory, balance) that states read and update. Full design comes in LLD 9.</p>` },
      { title: 'TCP connection', html: `<p>RFC 793 literally defines TCP as a state machine: CLOSED, LISTEN, SYN_SENT, SYN_RECEIVED, ESTABLISHED, FIN_WAIT, TIME_WAIT… The same segment (e.g. a FIN) means different things in different states. The original GoF book used <code>TCPConnection</code> as its State example.</p>` },
      { title: 'State vs plain enum switch: when is a switch fine?', html: `<p>If there are 3 states, 2 events and almost no behaviour per state (only "next state"), an <b>enum + transition table</b> (second code tab) is clearer than 3 classes. Use full State classes when states have <b>real behaviour</b> (charging, refunding, timers, messages) or the number of states grows. With Java 21 sealed interfaces + pattern-matching switch, the compiler can also check that every state is handled.</p>` }
    ],
    deepDive: `<p><b>Who owns transitions?</b> Option A (classic GoF): each state calls <code>context.setState(next)</code> — easy to read, but states know each other. Option B: state methods <b>return</b> the next state and the context assigns it — states become pure functions, easier to test. Option C: a central <b>transition table</b> (event → next state) plus per-state entry/exit actions — what workflow engines (Spring Statemachine, AWS Step Functions) do.</p>
<p><b>Shared vs per-context state objects:</b> if a state holds no fields, use one singleton per state (flyweight) — zero allocation per transition. If it holds data (e.g. "Dispensing" needs the selected item), either keep that data in the context or allocate a fresh state object per transition.</p>
<p><b>Entry/exit actions and guards:</b> real machines need "on entering PAID, send receipt" and guards like "ship only if address verified". Put entry actions in an <code>onEnter(ctx)</code> method called by <code>setState</code>; guards are conditions inside the event method.</p>
<p><b>Concurrency:</b> two threads calling <code>pay()</code> and <code>cancel()</code> at the same time can both read NEW and both transition. Make transitions atomic: <code>synchronized</code> methods in-memory, or in a database <code>UPDATE orders SET status='PAID', version=version+1 WHERE id=? AND status='NEW' AND version=?</code> (optimistic locking) — affected rows = 0 means someone else won.</p>
<p><b>Persistence:</b> store the state <i>name</i> (enum) in the DB and map it back to the state object on load; never serialize state classes. <b>Hierarchical state machines</b> (statecharts) add nested states (e.g. "Active" contains Playing/Paused) to avoid duplicated transitions — used in UI frameworks (XState) and embedded systems.</p>`,
    aiEra: `<p><b>What AI changes:</b> state machines are where generated code quietly breaks: AI writes a status enum plus scattered if-checks and misses transitions. Use AI to <b>enumerate the state × event matrix</b> ("list every (state, event) pair and what should happen; mark illegal ones") and to generate one test per cell — then review the matrix yourself.</p>
<p><b>Agents are state machines:</b> an agent loop is <i>planning → calling tool → waiting for approval → observing → done/failed</i>. Frameworks like LangGraph model agents as explicit graphs of states and transitions precisely because free-form loops are hard to debug and resume. Persisting the current state lets a long-running agent resume after a crash.</p>
<p><b>Where AI goes wrong:</b> forgets terminal states, allows events in states where they make no sense, ignores concurrent transitions. <b>What you own:</b> drawing the diagram, choosing classes vs table, and making transitions atomic.</p>`,
    problems: [{
      title: 'Document Publishing Workflow', level: 'Medium', tags: ['state', 'workflow'], companies: ['Atlassian', 'Medium', 'Notion'],
      statement: `<p>A <code>Document</code> is in <b>Draft</b>, <b>Moderation</b> or <b>Published</b>. Method <code>publish(User u)</code>: in Draft → goes to Moderation, <i>but</i> if <code>u</code> is an admin it goes straight to Published. In Moderation → only an admin can publish (→ Published); others get an error. In Published → no-op. Method <code>reject()</code>: Moderation → Draft; elsewhere illegal. Method <code>expire()</code>: Published → Draft. Text can be edited only in Draft. Design so that adding an <b>Archived</b> state later is easy.</p>`,
      constraints: `Single document object, but methods may be called from multiple threads. Illegal actions throw <code>IllegalStateException</code> with a clear message.`,
      example: `<p>Draft --publish(author)--> ${H.c('y', 'Moderation')} --publish(author)--> ${H.c('r', 'error: only admin')} --reject()--> ${H.c('b', 'Draft')} --publish(admin)--> ${H.c('g', 'Published')} --edit("x")--> ${H.c('r', 'error: not editable')}.</p>`,
      brute: { why: `<p>An enum field plus a <code>switch</code> inside <code>publish</code>, <code>reject</code>, <code>expire</code> and <code>edit</code>. That is 3 states × 4 methods = 12 branches spread over 4 methods. Adding Archived means editing all four switches; a missed <code>default</code> silently allows illegal transitions.</p>`, code: `class NaiveDocument {
    enum S { DRAFT, MODERATION, PUBLISHED }
    S s = S.DRAFT; String text = "";
    void publish(boolean admin) {
        switch (s) {
            case DRAFT -> s = admin ? S.PUBLISHED : S.MODERATION;
            case MODERATION -> { if (admin) s = S.PUBLISHED; else throw new IllegalStateException("admin only"); }
            case PUBLISHED -> { }
        }
    }
    void reject() { if (s == S.MODERATION) s = S.DRAFT; else throw new IllegalStateException(); }
    void expire() { if (s == S.PUBLISHED) s = S.DRAFT; else throw new IllegalStateException(); }
    void edit(String t) { if (s == S.DRAFT) text = t; else throw new IllegalStateException(); }
    // adding ARCHIVED = touch every method above
}` },
      mcq: { q: 'In the State pattern, where does the rule "only admins may publish from Moderation" live?', options: ['Inside ModerationState.publish()', 'Inside Document.publish() with an if', 'In the User class', 'In a global validator'], answer: 0, explain: 'All rules of a state live in that state class. Document.publish() just delegates.' },
      hints: [`<p>Hint 1: List the states and, for each, what every method does. That table <i>is</i> your class list.</p>`, `<p>Hint 2: <code>interface DocState</code> with default methods that throw; each state overrides only legal actions. States return or set the next state.</p>`, `<p>Hint 3: <code>edit()</code> is allowed only in Draft → <code>DraftState</code> overrides edit; others inherit the throwing default. Mark Document methods <code>synchronized</code>. Recipe: record User(name, admin) → DocState interface → 3 singletons → Document delegates.</p>`],
      solution: {
        approach: `<p>Model each state as a class implementing <code>DocState</code>. Defaults throw "not allowed in X", so each state only overrides what is legal — illegal transitions are impossible to forget. The <b>state returns the next state</b> (pure, easy to test) and the <code>Document</code> context assigns it inside a synchronized method. Adding Archived = one new class + override <code>archive()</code> in the states that allow it.</p>`,
        code: `record User(String name, boolean admin) {}

interface DocState {
    String name();
    default DocState publish(Document d, User u) { throw no("publish"); }
    default DocState reject(Document d)          { throw no("reject"); }
    default DocState expire(Document d)          { throw no("expire"); }
    default void edit(Document d, String text)   { throw no("edit"); }
    private IllegalStateException no(String what) { return new IllegalStateException("Cannot " + what + " in " + name()); }
}

final class Draft implements DocState {
    static final Draft I = new Draft();
    public String name() { return "Draft"; }
    public DocState publish(Document d, User u) { return u.admin() ? Published.I : Moderation.I; }
    public void edit(Document d, String text) { d.setText(text); }
}
final class Moderation implements DocState {
    static final Moderation I = new Moderation();
    public String name() { return "Moderation"; }
    public DocState publish(Document d, User u) {
        if (!u.admin()) throw new IllegalStateException("Only an admin can publish from Moderation");
        return Published.I;
    }
    public DocState reject(Document d) { return Draft.I; }
}
final class Published implements DocState {
    static final Published I = new Published();
    public String name() { return "Published"; }
    public DocState publish(Document d, User u) { return this; }     // no-op
    public DocState expire(Document d) { return Draft.I; }
}

class Document {
    private DocState state = Draft.I;
    private String text = "";
    void setText(String t) { text = t; }
    synchronized void publish(User u) { state = state.publish(this, u); }
    synchronized void reject()        { state = state.reject(this); }
    synchronized void expire()        { state = state.expire(this); }
    synchronized void edit(String t)  { state.edit(this, t); }
    String state() { return state.name(); }

    public static void main(String[] args) {
        User author = new User("ria", false), admin = new User("root", true);
        Document d = new Document();
        d.edit("hello");
        d.publish(author);                       System.out.println(d.state());   // Moderation
        try { d.publish(author); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }
        d.reject();                              System.out.println(d.state());   // Draft
        d.publish(admin);                        System.out.println(d.state());   // Published
        try { d.edit("x"); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }
    }
}`,
        complexity: `<p>Every action O(1). Adding a state: 1 new class + small overrides in states that transition into it; Document unchanged.</p>`,
        followUps: ['Store the state in a database row — how do you rebuild the object on load?', 'Add Archived reachable from Draft and Published; what changes?', 'Two admins publish and reject at the same moment — how does the DB version column help?']
      }
    }]
  });

  registerModule({
    id: 'lld06',
    title: 'Behavioral Design Patterns',
    intro: `<p>Creational patterns decide <b>how objects are born</b>, structural patterns decide <b>how they are wired together</b>, and <b>behavioral patterns decide how they talk and share work</b> once the program runs. This module covers all ten classics you will meet in Low-Level Design interviews: <b>Strategy, Observer, Command, State, Template Method, Chain of Responsibility, Iterator, Mediator, Memento and Visitor</b>.</p>
<p>Every pattern follows the same path: a real-life analogy first, then the naive if/else design and <i>why it hurts</i>, then the pattern's class diagram and a <b>step-by-step animation of it running</b> (notifications fanning out, state machines moving, requests walking down a chain, undo stacks pushing and popping), then compilable modern Java (records, lambdas, sealed types), worked examples, expert deep dives and how AI tools change the job. The module ends with a "which pattern fits?" clue detector, 14 practice problems, a quiz and interview questions.</p>`,
    goals: [
      'Recognise from the wording of a requirement which behavioral pattern fits (and when none is needed)',
      'Implement all 10 behavioral patterns in idiomatic, thread-aware Java 21 — interfaces, lambdas, records, sealed types',
      'Replace if/else and switch-on-type ladders with Strategy, State, Chain of Responsibility or Visitor and explain the trade-off',
      'Build undo/redo with Command and Memento, and explain the difference between the two',
      'Tell apart look-alike patterns: Strategy vs State, Observer vs Mediator, Command vs Memento, Template Method vs Strategy',
      'Combine patterns in machine-coding rounds (notification service, workflow engine, middleware pipeline, transactional store)'
    ],
    prereqs: `LLD 2 (SOLID Principles) — especially Open/Closed and Dependency Inversion; LLD 4–5 (Creational and Structural patterns) helpful; comfortable Java: interfaces, abstract classes, generics, lambdas.`,
    hours: 16,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
