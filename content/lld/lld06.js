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

  /* ======================= TOPIC 5: TEMPLATE METHOD ======================= */
  topics.push({
    title: 'Template Method: Fixed Recipe, Customisable Steps',
    analogy: `<p>Every <b>tea and coffee</b> follows the same recipe: <i>boil water → brew → pour into cup → add extras</i>. Only "brew" (steep a tea bag vs filter coffee grounds) and "extras" (lemon vs milk and sugar) differ. A café writes the recipe <b>once</b> on the wall and each drink fills in its own blanks. Or think of a <b>job application form</b>: the company fixes the order of sections; you only fill in your own answers.</p>`,
    explain: `<p><b>Template Method in one line:</b> a base class defines the <b>skeleton of an algorithm</b> in one method (the <i>template method</i>, usually <code>final</code>) and leaves some steps for subclasses to fill in. The order of steps can never be changed by subclasses — only the steps themselves.</p>
${H.table(['Kind of step', 'Declared as', 'Meaning'], [
  ['<b>Fixed step</b>', 'normal (often <code>private</code>/<code>final</code>) method in base', 'Same for everyone, e.g. open file, close file'],
  ['<b>Abstract step</b>', '<code>protected abstract</code>', 'Every subclass <i>must</i> provide it, e.g. <code>parse()</code>'],
  ['<b>Hook</b>', '<code>protected</code> method with a default (often empty or <code>true</code>)', 'Subclass <i>may</i> override to customise, e.g. <code>shouldValidate()</code>, <code>afterImport()</code>'],
  ['<b>Template method</b>', '<code>public final</code>', 'Calls the steps in a fixed order']
])}
<p><b>The naive way:</b> <code>CsvImporter</code> and <code>JsonImporter</code> are two separate classes that each open the file, parse, validate, save and log. 80% of the code is copy-pasted. A bug fix in "save" (say, batching inserts) must be done in every copy; someone forgets one, and the JSON importer still inserts row by row. ${H.c('r', 'Duplicated skeleton = duplicated bugs.')}</p>
<p><b>With Template Method:</b> the skeleton lives once in <code>DataImporter.importFile()</code>. Subclasses write only <code>parse()</code>. This is the <b>Hollywood Principle</b>: "Don't call us, we'll call you" — the base class calls the subclass's steps, not the other way round.</p>
<p>You see it in the JDK and frameworks: <code>AbstractList</code> (implement <code>get</code> and <code>size</code>, get the whole List API), <code>InputStream.read(byte[])</code> built on the abstract <code>read()</code>, <code>HttpServlet.service()</code> dispatching to <code>doGet</code>/<code>doPost</code>, JUnit's <code>@BeforeEach</code> → test → <code>@AfterEach</code> lifecycle, Spring's <code>JdbcTemplate</code> (a callback-based cousin).</p>`,
    clues: [
      '"Several classes do <b>the same steps in the same order</b> but differ in one or two steps" → Template Method.',
      '"Avoid duplicated code between CsvExporter and PdfExporter" / "common workflow, different formats".',
      '"The order of steps must be <b>enforced</b>" (e.g. always authenticate before processing, always close resources) → <code>final</code> template method.',
      '"Provide extension points / hooks for subclasses" → hook methods.',
      'Machine-coding: data import/export pipelines, report generation, payment flow (validate → debit → notify), game turn loop, test framework lifecycle, build pipelines.',
      'If they then say "but we need to switch the step <b>at runtime</b>" → prefer Strategy (composition) over Template Method (inheritance).'
    ],
    code: [{ lang: 'java', title: 'Data importer skeleton with abstract steps and hooks', code: `record Row(String name, int age) {}

abstract class DataImporter {
    // The TEMPLATE METHOD: final, so subclasses cannot change the order of steps.
    public final int importFile(String fileName, String content) {
        System.out.println("open " + fileName);              // fixed step
        List<Row> rows = parse(content);                     // abstract step: must override
        if (shouldValidate()) rows = validate(rows);         // hook decides whether to validate
        save(rows);                                          // fixed step
        afterImport(rows.size());                            // hook: empty by default
        return rows.size();
    }

    protected abstract List<Row> parse(String content);      // every format is different

    protected boolean shouldValidate() { return true; }      // hook with a sensible default
    protected void afterImport(int count) { }                // hook: do nothing by default

    private List<Row> validate(List<Row> rows) {             // shared rule, written once
        List<Row> ok = new ArrayList<>();
        for (Row r : rows) if (r.age() >= 0 && r.age() < 150 && !r.name().isBlank()) ok.add(r);
        return ok;
    }
    private void save(List<Row> rows) {                      // shared, e.g. batched DB insert
        System.out.println("saving " + rows.size() + " rows in one batch");
    }
}

class CsvImporter extends DataImporter {
    protected List<Row> parse(String content) {
        List<Row> out = new ArrayList<>();
        for (String line : content.split("\\n")) {
            String[] p = line.split(",");
            out.add(new Row(p[0].trim(), Integer.parseInt(p[1].trim())));
        }
        return out;
    }
}

class TrustedFeedImporter extends DataImporter {             // already-clean partner feed
    protected List<Row> parse(String content) {
        List<Row> out = new ArrayList<>();
        for (String part : content.split(";")) {
            String[] kv = part.split("=");
            out.add(new Row(kv[0], Integer.parseInt(kv[1])));
        }
        return out;
    }
    @Override protected boolean shouldValidate() { return false; }               // override hook
    @Override protected void afterImport(int n) { System.out.println("ping partner: got " + n); }
}

class ImportDemo {
    public static void main(String[] args) {
        System.out.println(new CsvImporter().importFile("users.csv", "asha, 31\\nben, -4\\ncy, 22"));
        System.out.println(new TrustedFeedImporter().importFile("feed.txt", "dee=40;eli=29"));
    }
}` }],
    codeTitle: ['Template Method with hooks'],
    viz: {
      title: 'Template Method: who runs each step (base vs subclass)',
      input: 'csv',
      inputLabel: 'Importer: csv | json | trusted',
      gen: function (input) {
        var kind = pick(input, { csv: 'csv', json: 'json', trusted: 'trusted' }, 'Type csv, json or trusted');
        var SUB = { csv: { id: 'CSV', cls: 'CsvImporter' }, json: { id: 'JSON', cls: 'JsonImporter' }, trusted: { id: 'TR', cls: 'TrustedFeedImporter' } }[kind];
        var nodes = [B('BASE', 'DataImporter (abstract)', 50, 8), B('CSV', 'CsvImporter', 15, 40), B('JSON', 'JsonImporter', 50, 40), B('TR', 'TrustedFeedImporter', 85, 40), B('DB', 'Database', 50, 64)];
        var edges = [['CSV', 'BASE', 'extends'], ['JSON', 'BASE', 'extends'], ['TR', 'BASE', 'extends'], ['BASE', 'DB', 'save()']];
        var code = 'public final int importFile(String f, String c) {\n  open(f);                        // fixed\n  List<Row> rows = parse(c);      // abstract\n  if (shouldValidate())           // hook\n    rows = validate(rows);        // fixed\n  save(rows);                     // fixed\n  afterImport(rows.size());       // hook\n  return rows.size();\n}';
        var rowsIn = { csv: ['asha,31', 'ben,-4', 'cy,22'], json: ['{"n":"dee","a":40}', '{"n":"","a":5}'], trusted: ['dee=40', 'eli=29'] }[kind];
        var parsed = { csv: ['asha 31', 'ben -4', 'cy 22'], json: ['dee 40', '(blank) 5'], trusted: ['dee 40', 'eli 29'] }[kind];
        var valid = { csv: ['asha 31', 'cy 22'], json: ['dee 40'], trusted: ['dee 40', 'eli 29'] }[kind];
        var frames = [];
        var sh = {}; sh[SUB.id] = 'sel';
        frames.push(F('<b>Structure.</b> The abstract base owns the <b>skeleton</b> (<code>importFile</code>, marked <code>final</code>). Subclasses only fill blanks. We will run <b>' + SUB.cls + '</b>: watch which box runs each line.',
          [G('Inheritance: subclasses extend the skeleton', nodes, edges, { h: 70, hl: (function () { var h = clone(sh); h.BASE = 'cur'; return h; })() }), CODE('Template method in DataImporter', code, { 1: 'sel' })]));
        var step = function (line, who, narr, extra, cls) {
          var h = {}; h[who] = cls || 'cur';
          var c = {}; c[line] = cls || 'cur';
          var e = {}; if (who === SUB.id) e[SUB.id + '-BASE'] = 'cur';
          frames.push(F(narr, [G('Who runs this step?', nodes, edges, { h: 70, hl: h, ehl: e, tags: (function () { var t = {}; t[who] = 'running'; return t; })() }), CODE('Template method in DataImporter', code, c)].concat(extra || [])));
        };
        step(2, 'BASE', '<b>Fixed step</b> <code>open(f)</code> runs in the <b>base class</b>. No subclass can skip it or move it — the method is <code>final</code>.', [{ type: 'array', label: 'raw input lines', values: rowsIn }]);
        step(3, SUB.id, '<b>Abstract step</b> <code>parse(c)</code>: the base calls it, but Java dispatches to <b>' + SUB.cls + '.parse()</b>. "Don\'t call us, we\'ll call you" — the parent calls the child.', [{ type: 'array', label: 'parsed rows', values: parsed }], 'ok');
        var validates = kind !== 'trusted';
        step(4, validates ? 'BASE' : SUB.id, '<b>Hook</b> <code>shouldValidate()</code>: ' + (validates ? 'not overridden, so the base default <code>true</code> is used.' : H.c('p', 'TrustedFeedImporter overrides it to return false') + ' — a hook lets a subclass switch a step off without touching the skeleton.'), [VARS('hook result', { shouldValidate: validates }, { shouldValidate: validates ? 'ok' : 'bad' })], validates ? 'cur' : 'sel');
        if (validates) {
          var hlv = {}; parsed.forEach(function (p, i) { hlv[i] = valid.indexOf(p) >= 0 ? 'g' : 'r'; });
          step(5, 'BASE', '<b>Shared rule</b> <code>validate(rows)</code> runs in the base: bad rows (negative age, blank name) are dropped. Written <b>once</b> for every importer — fix it here and all formats get the fix.', [{ type: 'array', label: 'after validation (red = dropped)', values: parsed, hl: (function () { var h = {}; parsed.forEach(function (p, i) { h[i] = valid.indexOf(p) >= 0 ? 'ok' : 'bad'; }); return h; })() }]);
        } else {
          step(5, 'BASE', 'Validation is <b>skipped</b> because the hook returned false. Line 5 never runs for this subclass.', [{ type: 'array', label: 'rows (unvalidated)', values: parsed }], 'done');
        }
        var hs = { BASE: 'cur', DB: 'ok' };
        frames.push(F('<b>Fixed step</b> <code>save(rows)</code>: the base does one batched insert of ' + valid.length + ' rows. If tomorrow we switch to bulk COPY, we change one method and every importer benefits.',
          [G('Who runs this step?', nodes, edges, { h: 70, hl: hs, ehl: { 'BASE-DB': 'ok' } }), CODE('Template method in DataImporter', code, { 6: 'cur' }), { type: 'array', label: 'saved', values: valid }]));
        step(7, kind === 'trusted' ? SUB.id : 'BASE', '<b>Hook</b> <code>afterImport(n)</code>: ' + (kind === 'trusted' ? 'overridden — TrustedFeedImporter pings the partner with the count.' : 'not overridden, so the empty default does nothing.'), [VARS('result', { imported: valid.length })], kind === 'trusted' ? 'sel' : 'done');
        frames.push(F('Done: <b>' + valid.length + '</b> rows imported. The subclass wrote only <code>parse()</code>' + (kind === 'trusted' ? ' and two tiny hook overrides' : '') + '. The order open → parse → validate → save → afterImport was guaranteed by the base. ' + H.c('g', 'No duplicated skeleton.'),
          [G('Summary', nodes, edges, { h: 70, hl: (function () { var h = { BASE: 'sel' }; h[SUB.id] = 'ok'; return h; })() }), { type: 'table', label: 'Step ownership', columns: ['Step', 'Kind', 'Runs in'], rows: [['open', 'fixed', 'base'], ['parse', 'abstract', SUB.cls], ['shouldValidate', 'hook', validates ? 'base default' : SUB.cls], ['validate', 'fixed', validates ? 'base' : 'skipped'], ['save', 'fixed', 'base'], ['afterImport', 'hook', kind === 'trusted' ? SUB.cls : 'base (empty)']], hl: { 1: 'sel' } }]));
        return frames;
      }
    },
    examples: [
      { title: 'Tea vs Coffee (the classic)', html: `<p><code>prepareRecipe()</code> = boilWater → <b>brew()</b> → pourInCup → <b>addCondiments()</b> if <code>customerWantsCondiments()</code>. Tea brews by steeping, coffee by dripping; a "black coffee" subclass overrides the hook to return false. Two abstract steps, one hook, one fixed order.</p>`, code: `abstract class Beverage {
    final void prepare() { boil(); brew(); pour(); if (wantsExtras()) addExtras(); }
    private void boil() { System.out.println("boil water"); }
    private void pour() { System.out.println("pour into cup"); }
    protected abstract void brew();
    protected abstract void addExtras();
    protected boolean wantsExtras() { return true; }      // hook
}
class Tea extends Beverage {
    protected void brew() { System.out.println("steep tea bag"); }
    protected void addExtras() { System.out.println("add lemon"); }
}
class BlackCoffee extends Beverage {
    protected void brew() { System.out.println("drip coffee"); }
    protected void addExtras() { System.out.println("add milk"); }
    @Override protected boolean wantsExtras() { return false; }
}` },
      { title: 'AbstractList: write 2 methods, get 30', html: `<p>Extend <code>AbstractList&lt;E&gt;</code> and implement only <code>get(int)</code> and <code>size()</code>. You instantly get <code>iterator()</code>, <code>contains()</code>, <code>indexOf()</code>, <code>equals()</code>, <code>hashCode()</code>, <code>subList()</code>, streams… all template methods in the base calling your two primitives.</p>`, code: `List<Integer> squares = new AbstractList<Integer>() {
    public Integer get(int i) { return i * i; }
    public int size() { return 5; }
};
System.out.println(squares + " contains 9? " + squares.contains(9));` },
      { title: 'HttpServlet.service()', html: `<p>The servlet container calls <code>service(req, res)</code> (template method). It reads the HTTP method and calls <code>doGet</code>, <code>doPost</code>, <code>doPut</code>… which you override. Default implementations return 405 Method Not Allowed — they are hooks with a safe default.</p>` },
      { title: 'Template Method vs Strategy for the same problem', html: `<p>The importer could instead be <code>Importer(Parser parser)</code> with a <code>Parser</code> strategy. Pick <b>Template Method</b> when the steps share lots of protected state with the skeleton and the variation is fixed per class. Pick <b>Strategy</b> when you need to mix and match at runtime (CSV parser + no validation + S3 saver), when steps are reusable elsewhere, or when you want to avoid deep inheritance. Many teams start with Template Method and refactor to strategies as combinations multiply.</p>` }
    ],
    deepDive: `<p><b>Make the template method <code>final</code></b>, otherwise a subclass can override it and silently skip validation or resource cleanup — the whole guarantee disappears. Make fixed steps <code>private</code> (or <code>final</code>), primitives <code>protected abstract</code>, and hooks <code>protected</code> with safe defaults.</p>
<p><b>Fragile base class problem:</b> subclasses depend on <i>when</i> and <i>how often</i> the base calls their steps. Changing the skeleton (e.g. calling <code>parse()</code> twice, or calling a hook before fields are initialised) can break subclasses you never saw. Never call overridable methods from a constructor: the subclass's fields are not initialised yet.</p>
<p><b>Inheritance limits:</b> Java has single inheritance; a class that already extends something cannot also extend your template. Combinatorial variation (3 formats × 2 validation modes × 2 destinations) explodes into 12 subclasses — the signal to switch to Strategy/composition. A functional middle ground: a template method that accepts lambdas for steps (<code>importFile(content, parser, afterHook)</code>), like Spring's <code>JdbcTemplate</code> + <code>RowMapper</code> callback.</p>
<p><b>Liskov:</b> a subclass must respect the contract of each step (e.g. <code>parse</code> returns a non-null list). Document step contracts on the abstract methods. <b>Testing:</b> test the skeleton once with a tiny test subclass that records which steps were called in which order; test each subclass's steps directly.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI often generates near-duplicate classes ("write a JSON importer like this CSV importer") — fast, but you end up with copy-pasted skeletons. Ask instead: "Extract the shared workflow into an abstract base with a final template method; keep only parse() in subclasses." AI is good at this mechanical refactor and at finding duplicated sequences across files.</p>
<p><b>In LLM pipelines</b> the template is everywhere: <i>build prompt → call model → parse output → validate → retry on failure → log</i>. Base "chain" classes in agent frameworks fix this skeleton and let you override <code>buildPrompt</code> and <code>parse</code>. Validation and retry policy must stay in the fixed part so nobody skips them.</p>
<p><b>Where AI goes wrong:</b> forgets <code>final</code>, calls abstract methods from constructors, or creates a template for two classes that share one line. <b>What you own:</b> deciding inheritance vs composition and protecting invariants in the skeleton.</p>`,
    problems: [{
      title: 'Report Exporter: CSV, HTML and Markdown', level: 'Easy', tags: ['template method', 'dry'], companies: ['Microsoft', 'Salesforce', 'Zoho'],
      statement: `<p>Export a list of <code>Sale(region, amount)</code> as text in three formats. Every export must: (1) write a header, (2) write one line per sale <b>sorted by amount descending</b>, (3) write a footer with the total, and (4) <b>escape</b> special characters in region names. CSV, HTML table and Markdown table differ only in how header, row and footer look. Make the shared workflow impossible to skip.</p>`,
      constraints: `Up to 10<sup>5</sup> sales. Amounts are non-negative longs. Region names may contain commas, &lt; or |.`,
      example: `<p>Sales: (North, 300), (South, 500). CSV output:<br><code>region,amount</code><br><code>South,500</code><br><code>North,300</code><br><code>TOTAL,800</code><br>Sorted descending, total in the footer — the same <b>order of steps</b> for every format; only the formatting differs.</p>`,
      brute: { why: `<p>Three independent classes each copy the sort, the loop, the total computation and the escaping. A bug in sorting (e.g. ascending) is fixed in CSV but forgotten in HTML; the Markdown version forgets escaping entirely. The skeleton exists three times.</p>`, code: `class NaiveCsvExport {
    String export(List<long[]> rows, List<String> regions) {
        StringBuilder sb = new StringBuilder("region,amount\\n");
        long total = 0;
        for (int i = 0; i < rows.size(); i++) {       // forgot to sort!
            sb.append(regions.get(i)).append(',').append(rows.get(i)[0]).append('\\n');
            total += rows.get(i)[0];
        }
        return sb.append("TOTAL,").append(total).toString();
    }
}
// NaiveHtmlExport and NaiveMarkdownExport: the same loop pasted twice more, with different bugs.` },
      mcq: { q: 'Which method of the base exporter should be declared final?', options: ['export() — the template method that fixes the order of steps', 'row() — the formatting of a line', 'escape() — every format escapes differently', 'None; final is bad practice'], answer: 0, explain: 'The template method must be final so subclasses cannot reorder or skip sorting, totals or escaping. Format-specific pieces are the overridable steps.' },
      hints: [`<p>Hint 1: Write down the steps every format performs. What differs? Only header text, row text, footer text and the escape rule.</p>`, `<p>Hint 2: Abstract class <code>ReportExporter</code> with <code>public final String export(List&lt;Sale&gt;)</code> and protected abstract <code>header()</code>, <code>row(region, amount)</code>, <code>footer(total)</code>, plus a hook <code>escape(String)</code>.</p>`, `<p>Hint 3: Sort a <b>copy</b> (don't mutate the caller's list). Recipe: copy+sort → header → for each: row(escape(region), amount) → footer(total). CSV escape quotes fields containing commas; HTML escapes &amp;lt;; Markdown escapes |.</p>`],
      solution: {
        approach: `<p>Put the workflow (copy, sort descending, header, escaped rows, total footer) in a <code>final export()</code> method of an abstract base. Subclasses implement three tiny formatting steps and override the <code>escape</code> hook. Every format now gets sorting, totals and escaping for free and cannot skip them. Adding JSON export = one class with three short methods.</p>`,
        code: `record Sale(String region, long amount) {}

abstract class ReportExporter {
    public final String export(List<Sale> sales) {
        List<Sale> sorted = new ArrayList<>(sales);                       // never mutate input
        sorted.sort(Comparator.comparingLong(Sale::amount).reversed());   // shared rule
        StringBuilder sb = new StringBuilder(header());
        long total = 0;
        for (Sale s : sorted) {
            sb.append(row(escape(s.region()), s.amount()));
            total += s.amount();
        }
        return sb.append(footer(total)).toString();
    }
    protected abstract String header();
    protected abstract String row(String region, long amount);
    protected abstract String footer(long total);
    protected String escape(String s) { return s; }                      // hook
}

class CsvExporter extends ReportExporter {
    protected String header() { return "region,amount\\n"; }
    protected String row(String r, long a) { return r + "," + a + "\\n"; }
    protected String footer(long t) { return "TOTAL," + t + "\\n"; }
    @Override protected String escape(String s) {
        return s.contains(",") || s.contains("\\"") ? "\\"" + s.replace("\\"", "\\"\\"") + "\\"" : s;
    }
}
class HtmlExporter extends ReportExporter {
    protected String header() { return "<table><tr><th>region</th><th>amount</th></tr>\\n"; }
    protected String row(String r, long a) { return "<tr><td>" + r + "</td><td>" + a + "</td></tr>\\n"; }
    protected String footer(long t) { return "<tr><td>TOTAL</td><td>" + t + "</td></tr></table>\\n"; }
    @Override protected String escape(String s) { return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"); }
}
class MarkdownExporter extends ReportExporter {
    protected String header() { return "| region | amount |\\n|---|---|\\n"; }
    protected String row(String r, long a) { return "| " + r + " | " + a + " |\\n"; }
    protected String footer(long t) { return "| **TOTAL** | " + t + " |\\n"; }
    @Override protected String escape(String s) { return s.replace("|", "\\\\|"); }
}

class ExportDemo {
    public static void main(String[] args) {
        List<Sale> sales = List.of(new Sale("North", 300), new Sale("South, East", 500), new Sale("A<B|C", 50));
        for (ReportExporter e : List.of(new CsvExporter(), new HtmlExporter(), new MarkdownExporter()))
            System.out.println(e.export(sales));
    }
}`,
        complexity: `<p>O(N log N) for the sort, O(N) for writing. The skeleton exists once; each format is ~4 short methods.</p>`,
        followUps: ['Stream 10<sup>8</sup> rows without holding them in memory — what changes in the template? (write to a Writer, require pre-sorted input or external sort)', 'Allow mixing any format with any sort order at runtime — would you keep Template Method?', 'How would you test that every subclass gets sorting for free?']
      }
    }]
  });

  /* ======================= TOPIC 6: CHAIN OF RESPONSIBILITY ======================= */
  topics.push({
    title: 'Chain of Responsibility: Pass It Along Until Someone Handles It',
    analogy: `<p>Call a <b>customer support line</b>. The bot tries first. If it cannot help, you go to a level-1 agent; if they cannot, to a specialist; then to a manager. You (the caller) do not choose who solves it — the request <b>walks down a line of handlers</b> until one can deal with it. Office <b>expense approvals</b> work the same: your team lead can approve up to ₹1,000, a manager up to ₹10,000, a director up to ₹50,000; bigger bills go further up.</p>`,
    explain: `<p><b>Chain of Responsibility (CoR) in one line:</b> link handler objects into a chain; send the request to the first one; each handler either <b>handles it</b> or <b>passes it to the next</b>. The sender does not know which handler will act.</p>
${H.table(['Role', 'Job', 'Expense example'], [
  ['<b>Handler</b> (abstract)', 'Has a <code>next</code> link and <code>handle(request)</code>', '<code>Approver</code>'],
  ['<b>Concrete handlers</b>', 'Decide: handle, pass on, or both', '<code>TeamLead</code>, <code>Manager</code>, <code>Director</code>, <code>CFO</code>'],
  ['<b>Client</b>', 'Builds the chain once and sends requests to its head', 'expense service']
])}
<p><b>The naive way:</b> <code>if (amount &lt;= 1000) teamLead.approve(); else if (amount &lt;= 10000) manager.approve(); else if …</code> in the expense service. Approval limits, the order of approvers and special rules ("travel expenses skip the manager") are all hard-coded in one method. Reorganisation (add a "Senior Manager" level) = edit and redeploy that method. ${H.c('r', 'The sender knows every receiver and the routing rules.')}</p>
<p><b>With CoR:</b> each approver only knows its own limit and its <code>next</code>. The chain is assembled in one place (config) and can be re-ordered or extended without touching handlers.</p>
<p><b>Two flavours you must name in interviews:</b></p>
<ul>
<li>${H.c('b', 'Pure CoR (first one wins)')} — exactly one handler handles the request and the walk stops: approvals, support escalation, ATM note dispensing, event bubbling to the first interested UI element.</li>
<li>${H.c('p', 'Pipeline / filter chain (everyone may act)')} — each handler does its part and calls <code>next</code>; any can <b>short-circuit</b> (reject): servlet filters, Spring Security filter chain, Express/Koa middleware, logging frameworks passing a log record to multiple appenders.</li>
</ul>`,
    clues: [
      '"<b>Escalate</b> to the next level if the current one cannot handle it" / "approval hierarchy" → CoR.',
      '"A request passes through a series of <b>checks / filters / middleware</b> (auth, rate limit, validation, logging)" → filter chain.',
      '"The <b>order of processing steps should be configurable</b>" / "add a new check without changing others".',
      '"Sender should not know who handles the request" → decouple sender and receivers.',
      'Machine-coding: ATM cash dispenser (2000/500/200/100 notes), logger with levels (DEBUG→INFO→ERROR), support ticket routing, discount rule chains, spam filters, HTTP middleware.',
      'Code smell: a long <code>if/else if</code> where each branch is "can <i>this</i> one deal with it?" → each branch becomes a handler.'
    ],
    code: [{ lang: 'java', title: 'Approval chain (first handler that can approve wins)', code: `record Expense(String employee, long amount, String category) {}

abstract class Approver {
    private Approver next;
    private final String title;
    protected Approver(String title) { this.title = title; }

    // Returns 'next' so chains can be built fluently: a.linkTo(b).linkTo(c)
    Approver linkTo(Approver next) { this.next = next; return next; }

    // The walking logic lives ONCE in the base class.
    final String handle(Expense e) {
        if (canApprove(e)) return title + " approved " + e.amount() + " for " + e.employee();
        if (next == null) return "REJECTED: nobody can approve " + e.amount();
        return next.handle(e);
    }
    protected abstract boolean canApprove(Expense e);
}

class TeamLead extends Approver {
    TeamLead() { super("TeamLead"); }
    protected boolean canApprove(Expense e) { return e.amount() <= 1_000; }
}
class Manager extends Approver {
    Manager() { super("Manager"); }
    protected boolean canApprove(Expense e) { return e.amount() <= 10_000; }
}
class Director extends Approver {
    Director() { super("Director"); }
    // Special rule lives with the handler that owns it, not in a central if/else.
    protected boolean canApprove(Expense e) {
        return e.amount() <= 50_000 || (e.category().equals("TRAINING") && e.amount() <= 80_000);
    }
}
class Cfo extends Approver {
    Cfo() { super("CFO"); }
    protected boolean canApprove(Expense e) { return e.amount() <= 200_000; }
}

class ApprovalDemo {
    public static void main(String[] args) {
        Approver head = new TeamLead();
        head.linkTo(new Manager()).linkTo(new Director()).linkTo(new Cfo());   // assembled once
        for (long amt : new long[]{500, 7_500, 70_000, 999_999})
            System.out.println(head.handle(new Expense("asha", amt, amt == 70_000 ? "TRAINING" : "TRAVEL")));
    }
}` }, { lang: 'java', title: 'Middleware pipeline (every handler may act, any may stop)', code: `record Request(String path, String token, String ip) {}
record Response(int status, String body) {}

// A middleware receives the request and a "next" function it MAY call.
@FunctionalInterface
interface Middleware { Response handle(Request r, Function<Request, Response> next); }

class Pipeline {
    private final List<Middleware> chain = new ArrayList<>();
    private final Function<Request, Response> endpoint;
    Pipeline(Function<Request, Response> endpoint) { this.endpoint = endpoint; }
    Pipeline use(Middleware m) { chain.add(m); return this; }

    Response handle(Request r) { return call(0, r); }
    private Response call(int i, Request r) {
        if (i == chain.size()) return endpoint.apply(r);                // end of chain: real handler
        return chain.get(i).handle(r, req -> call(i + 1, req));         // give it a 'next'
    }

    public static void main(String[] args) {
        Map<String, Integer> hits = new HashMap<>();
        Pipeline p = new Pipeline(r -> new Response(200, "orders for " + r.token()))
            .use((r, next) -> {                                          // logging: before AND after
                long t0 = System.nanoTime();
                Response res = next.apply(r);
                System.out.println(r.path() + " -> " + res.status() + " in " + (System.nanoTime() - t0) / 1000 + "us");
                return res;
            })
            .use((r, next) -> r.token() == null ? new Response(401, "login first") : next.apply(r))   // auth
            .use((r, next) -> hits.merge(r.ip(), 1, Integer::sum) > 2 ? new Response(429, "slow down") : next.apply(r));
        for (int i = 0; i < 4; i++) System.out.println(p.handle(new Request("/orders", i == 0 ? null : "asha", "1.2.3.4")).body());
    }
}` }],
    codeTitle: ['Pure chain: approvals', 'Filter chain: middleware'],
    viz: {
      title: 'Chain of Responsibility: an expense walking up the approval chain',
      input: '500 7500 120000 999999',
      inputLabel: 'Expense amounts (space separated, up to 6)',
      gen: function (input) {
        var amts = tokens(input, /[\s,]+/, 6, 'Example: 500 7500 120000').map(function (x) {
          var v = Number(x); if (isNaN(v) || v <= 0 || v > 1e9) throw new Error('Amounts must be positive numbers'); return v;
        });
        var H_ = [{ id: 'TL', name: 'TeamLead', lim: 1000 }, { id: 'MG', name: 'Manager', lim: 10000 }, { id: 'DR', name: 'Director', lim: 50000 }, { id: 'CF', name: 'CFO', lim: 200000 }];
        var nodes = [B('RQ', 'Expense request', 8, 30)].concat(H_.map(function (h, i) { return B(h.id, h.name + ' (≤' + h.lim.toLocaleString('en-US') + ')', 28 + i * 20, 30); })).concat([B('RJ', 'end of chain → REJECT', 88, 62)]);
        var edges = [['RQ', 'TL', 'handle()'], ['TL', 'MG', 'next'], ['MG', 'DR', 'next'], ['DR', 'CF', 'next'], ['CF', 'RJ', 'null']];
        var frames = [], summary = [];
        frames.push(F('<b>Structure.</b> Each approver holds a <code>next</code> link and only knows <b>its own limit</b>. The client sends every expense to the <b>head</b> (TeamLead). Nobody — not even the client — has an if/else listing all approvers.',
          [G('The chain (built once from config)', nodes, edges, { h: 70, hl: { TL: 'sel' } }), { type: 'list', label: 'linked handlers', values: H_.map(function (h) { return h.name; }) }]));
        amts.forEach(function (a) {
          var hl = { RQ: 'cur' }, ehl = { 'RQ-TL': 'cur' }, tags = {};
          frames.push(F('New request: <b>₹' + a.toLocaleString('en-US') + '</b>. The client calls <code>head.handle(expense)</code> — it has no idea who will approve.', [G('Request enters the chain', nodes, edges, { h: 70, hl: hl, ehl: ehl }), VARS('request', { amount: a })]));
          var handled = false, prev = 'RQ';
          for (var i = 0; i < H_.length; i++) {
            var h = H_[i];
            var h2 = clone(hl), e2 = clone(ehl);
            e2[prev + '-' + h.id] = 'cur'; h2[h.id] = 'cur';
            if (a <= h.lim) {
              h2[h.id] = 'ok'; e2[prev + '-' + h.id] = 'ok'; tags[h.id] = 'APPROVED';
              frames.push(F('<b>' + h.name + '</b>: ₹' + a.toLocaleString('en-US') + ' ≤ ' + h.lim.toLocaleString('en-US') + ' → ' + H.c('g', 'I can handle it.') + ' Approved, and the walk <b>stops here</b>. Handlers after it are never even asked.',
                [G('Handled', nodes, edges, { h: 70, hl: h2, ehl: e2, tags: clone(tags) }), VARS('request', { amount: a, approvedBy: h.name, hops: i + 1 }, { approvedBy: 'ok' })]));
              summary.push(['₹' + a.toLocaleString('en-US'), h.name, String(i + 1)]);
              handled = true; break;
            }
            tags[h.id] = 'pass';
            frames.push(F('<b>' + h.name + '</b>: ₹' + a.toLocaleString('en-US') + ' &gt; my limit ' + h.lim.toLocaleString('en-US') + ' → not mine, call <code>next.handle(e)</code>.',
              [G('Passing along', nodes, edges, { h: 70, hl: h2, ehl: e2, tags: clone(tags) }), VARS('request', { amount: a, at: h.name, hops: i + 1 })]));
            hl[h.id] = 'done'; ehl[prev + '-' + h.id] = 'done'; prev = h.id;
          }
          if (!handled) {
            var h3 = clone(hl); h3.RJ = 'bad'; var e3 = clone(ehl); e3['CF-RJ'] = 'bad';
            frames.push(F('CFO passed it on, but <code>next == null</code>: the request ' + H.c('r', 'fell off the end of the chain') + '. Always decide what happens then (reject, log, default handler) — an unhandled request silently disappearing is a classic CoR bug.',
              [G('Unhandled', nodes, edges, { h: 70, hl: h3, ehl: e3, tags: { RJ: 'REJECTED' } }), VARS('request', { amount: a, result: 'REJECTED' }, { result: 'bad' })]));
            summary.push(['₹' + a.toLocaleString('en-US'), 'nobody (rejected)', String(H_.length)]);
          }
        });
        frames.push(F('Summary. Small requests stop early (cheap); big ones travel further. To add a "Senior Manager (≤25,000)" we would create one class and link it between Manager and Director — no other code changes.',
          [{ type: 'table', label: 'Who handled what', columns: ['Amount', 'Handled by', 'Hops'], rows: summary, hl: {} }]));
        return frames;
      }
    },
    examples: [
      { title: 'Logger with levels', html: `<p>Handlers: <code>ConsoleLogger(DEBUG)</code> → <code>FileLogger(INFO)</code> → <code>AlertLogger(ERROR)</code>. Here it is a <b>pipeline</b>: an ERROR message is written by <i>all three</i> (each handles if level ≥ its threshold, then passes on). A DEBUG message is only printed to console. Log4j/Logback appenders and logger hierarchies follow this idea (and LLD 12 builds a full logging framework).</p>` },
      { title: 'Servlet filters and Spring Security', html: `<p>Every HTTP request passes through <code>FilterChain.doFilter()</code>: CORS → authentication → authorization → CSRF → your controller. A filter can stop the chain (return 401) or modify the request/response. Spring Security is literally a configurable chain of ~15 filters; adding a custom JWT filter means inserting a handler at the right position.</p>` },
      { title: 'Discount rules: first match or stack them?', html: `<p>Checkout runs <code>EmployeeDiscount → CouponDiscount → LoyaltyDiscount</code>. If the business says "only the best single discount applies", it is first-match (or evaluate all and pick max). If "discounts stack", it is a pipeline where each one reduces the price and passes it on. Same chain object, different semantics — clarify in the interview!</p>`, code: `List<UnaryOperator<Double>> rules = List.of(p -> p * 0.9, p -> p - 50, p -> Math.max(p, 100));
double price = 1000;
for (UnaryOperator<Double> r : rules) price = r.apply(price);   // stacking pipeline
System.out.println(price);   // 850.0` },
      { title: 'Event bubbling in UIs', html: `<p>Click a button inside a card inside a page: the click goes to the button first; if it does not handle it (no listener or does not stop propagation) it bubbles to the card, then the page, then the document. The DOM event model is a chain of responsibility along the parent links.</p>` }
    ],
    deepDive: `<p><b>Guarantee of handling:</b> CoR does not guarantee anyone handles the request. Put a <b>terminal default handler</b> at the end (reject/log/404) and make "unhandled" an explicit result, not a <code>null</code>.</p>
<p><b>Building the chain:</b> do it in one place (factory, DI configuration, Spring <code>@Order</code>) so ordering is visible and testable. Avoid each handler creating its own <code>next</code> — that hard-codes the chain again. Guard against <b>cycles</b> (A → B → A) when chains are configurable: validate on build.</p>
<p><b>Recursion vs loop:</b> a recursive <code>next.handle()</code> uses one stack frame per handler — fine for 10 handlers, risky for 10,000 (StackOverflowError). A list-based pipeline (iterate an <code>ArrayList&lt;Handler&gt;</code> with an index) avoids deep stacks and makes re-ordering trivial.</p>
<p><b>Performance:</b> the average cost is the number of hops; put the most common handler first, or index requests by type (Map from type to handler) when the chain becomes long and the decision is a simple key lookup — at that point a dispatch table beats a chain.</p>
<p><b>Pre/post processing:</b> in the middleware style, code before <code>next.apply()</code> runs on the way in, code after runs on the way out (timing, response headers, transaction commit/rollback). This "onion" model is Express/Koa/ASP.NET middleware and Netty's <code>ChannelPipeline</code>. <b>Thread-safety:</b> handlers are shared across requests, so keep them stateless or use thread-safe counters (e.g. a rate limiter's <code>ConcurrentHashMap</code>).</p>`,
    aiEra: `<p><b>What AI changes:</b> AI-powered systems are full of chains: <i>guardrail → PII redaction → cache lookup → cheap model → escalate to expensive model → human review</i>. That is CoR with escalation: try the cheapest handler first, pass on only what it cannot handle confidently. Model routers and fallback chains (primary provider → backup provider) are the same pattern.</p>
<p><b>Use AI as a partner:</b> ask it to generate the chain's test matrix ("for each handler, a request it must handle, one it must pass, and the unhandled case"). <b>Where AI goes wrong:</b> it often hard-codes the chain inside handlers, forgets the end-of-chain case, or mixes first-match and pipeline semantics. <b>What you own:</b> deciding the semantics (stop vs continue), ordering, the default handler, and observability (log which handler acted).</p>`,
    problems: [{
      title: 'ATM Cash Dispenser', level: 'Medium', tags: ['chain of responsibility'], companies: ['Amazon', 'NCR', 'Flipkart'],
      statement: `<p>An ATM holds notes of ₹2000, ₹500, ₹200 and ₹100 with limited counts. <code>withdraw(amount)</code> must dispense using the <b>largest notes first</b>, respecting available counts, and return the note breakdown. If the exact amount cannot be made, dispense <b>nothing</b> and report failure. New denominations (₹50) should be addable without editing existing dispensers.</p>`,
      constraints: `Amount 1 – 10<sup>6</sup>. Note counts 0 – 10<sup>4</sup>. Greedy largest-first is the bank's policy (these denominations make greedy correct when stock is unlimited; with limited stock we must check and roll back).`,
      example: `<p>Stock: 2000×1, 500×3, 200×5, 100×2. withdraw(3700) → ${H.c('b', '2000×1')} (1700 left) → ${H.c('b', '500×3')} (200 left) → ${H.c('b', '200×1')} (0 left). Output {2000=1, 500=3, 200=1}. withdraw(50) → ${H.c('r', 'fail')}, nothing dispensed.</p>`,
      brute: { why: `<p>One method with a hard-coded block per denomination: compute count for 2000, subtract, then 500, then 200, then 100. Adding ₹50 means editing this method; checking stock and rolling back is copy-pasted per block; and stock is decremented before we know the whole amount can be made.</p>`, code: `class NaiveAtm {
    int c2000 = 1, c500 = 3, c200 = 5, c100 = 2;
    String withdraw(int amt) {
        int n2000 = Math.min(amt / 2000, c2000); amt -= n2000 * 2000; c2000 -= n2000;   // mutates early!
        int n500 = Math.min(amt / 500, c500);    amt -= n500 * 500;   c500 -= n500;
        int n200 = Math.min(amt / 200, c200);    amt -= n200 * 200;   c200 -= n200;
        int n100 = Math.min(amt / 100, c100);    amt -= n100 * 100;   c100 -= n100;
        if (amt != 0) return "FAIL (and stock is already wrong!)";
        return n2000 + "x2000 " + n500 + "x500 " + n200 + "x200 " + n100 + "x100";
    }
}` },
      mcq: { q: 'withdraw(50) cannot be made from 100+ notes. When should stock be decremented?', options: ['Only after the whole chain confirms the remainder reached 0 (plan first, commit after)', 'Each handler decrements immediately as it goes', 'Before the chain starts', 'Never; the ATM recounts nightly'], answer: 0, explain: 'Two-phase: handlers build a plan (how many notes each), and only if the remainder is 0 do we commit. Otherwise a failed withdrawal would leak notes.' },
      hints: [`<p>Hint 1: Each denomination is a handler: "take as many of my notes as I can, pass the remainder to the next".</p>`, `<p>Hint 2: Pass a mutable <b>plan</b> (Map denomination → count) along the chain instead of touching stock directly. The last handler (or the ATM) checks remainder == 0.</p>`, `<p>Hint 3: Commit = each handler subtracts its planned count. Keep denominations sorted descending when building the chain. Synchronize withdraw (two customers, one ATM is rare but stock must stay consistent).</p>`],
      solution: {
        approach: `<p>Each <code>NoteDispenser</code> owns one denomination and its stock, and links to the next smaller one. <code>plan(remaining, plan)</code> takes <code>min(remaining / value, stock)</code> notes, records it in the plan, and passes the remainder down. The ATM calls the head; if the final remainder is not 0, it discards the plan (nothing changed). Otherwise it calls <code>commit(plan)</code> down the chain. Adding ₹50 = new dispenser linked at the end.</p>`,
        code: `class NoteDispenser {
    final int value; private int stock; private NoteDispenser next;
    NoteDispenser(int value, int stock) { this.value = value; this.stock = stock; }
    NoteDispenser linkTo(NoteDispenser n) { this.next = n; return n; }

    // Phase 1: plan only, no side effects. Returns the remainder nobody could serve.
    int plan(int remaining, Map<Integer, Integer> plan) {
        int take = Math.min(remaining / value, stock);
        if (take > 0) plan.put(value, take);
        int left = remaining - take * value;
        return (next == null || left == 0) ? left : next.plan(left, plan);
    }
    // Phase 2: apply the plan along the chain.
    void commit(Map<Integer, Integer> plan) {
        stock -= plan.getOrDefault(value, 0);
        if (next != null) next.commit(plan);
    }
    int stock() { return stock; }
}

class Atm {
    private final NoteDispenser head;
    Atm(NoteDispenser head) { this.head = head; }

    synchronized Optional<Map<Integer, Integer>> withdraw(int amount) {
        if (amount <= 0) return Optional.empty();
        Map<Integer, Integer> plan = new LinkedHashMap<>();
        int left = head.plan(amount, plan);
        if (left != 0) return Optional.empty();       // cannot make exact amount: nothing dispensed
        head.commit(plan);
        return Optional.of(plan);
    }

    public static void main(String[] args) {
        NoteDispenser d2000 = new NoteDispenser(2000, 1);
        d2000.linkTo(new NoteDispenser(500, 3)).linkTo(new NoteDispenser(200, 5)).linkTo(new NoteDispenser(100, 2));
        Atm atm = new Atm(d2000);
        System.out.println(atm.withdraw(3700));   // Optional[{2000=1, 500=3, 200=1}]
        System.out.println(atm.withdraw(50));     // Optional.empty
        System.out.println(atm.withdraw(1000));   // 2000s and 500s are gone: {200=4, 100=2}
    }
}`,
        complexity: `<p>O(D) per withdrawal, D = number of denominations. No stock changes on failure.</p>`,
        followUps: ['Greedy fails with limited stock: 600 with stock 500×1, 200×3 → greedy takes 500 and gets stuck at 100. How would you fix it? (try fewer large notes: bounded backtracking / DP)', 'How would you add ₹50 notes?', 'Should the dispenser chain or the ATM own the policy "max 40 notes per withdrawal"?']
      }
    }]
  });

  /* ======================= TOPIC 7: ITERATOR ======================= */
  topics.push({
    title: 'Iterator: Walk Any Collection Without Knowing Its Insides',
    analogy: `<p>A <b>TV remote</b> has "next channel" and "previous channel" buttons. You do not know (or care) whether channels come from cable, satellite or the internet, or how they are stored — you just press <b>next</b>. A <b>music playlist</b> is the same: "next song" works whether the playlist is in order, shuffled or on repeat. The remote button is an <b>iterator</b>: a uniform way to go through items one by one.</p>`,
    explain: `<p><b>Iterator in one line:</b> give a collection a separate object that walks over its elements one at a time through a tiny interface — <code>hasNext()</code> and <code>next()</code> — so code using the collection never depends on how it is stored (array, linked list, tree, hash table, database cursor, network pages).</p>
${H.table(['Role', 'Java type', 'Job'], [
  ['<b>Aggregate</b>', '<code>Iterable&lt;T&gt;</code>', 'Has <code>iterator()</code> → enables the for-each loop'],
  ['<b>Iterator</b>', '<code>Iterator&lt;T&gt;</code>', '<code>hasNext()</code>, <code>next()</code>, optional <code>remove()</code>; remembers <i>where we are</i>'],
  ['<b>Concrete iterator</b>', 'your class', 'Knows the internal structure: an index, a node pointer, a stack for trees, a page token']
])}
<p><b>The naive way:</b> expose the internals: <code>playlist.getSongsArray()</code> and let callers write <code>for (int i = 0; …)</code>. Now every caller depends on "it is an array". Switching to a linked list or adding shuffle mode breaks all of them. For a tree, every caller must write their own recursive traversal (and gets it wrong). ${H.c('r', 'Traversal logic is duplicated and the data structure can never change.')}</p>
<p><b>With Iterator:</b> the collection hands out iterators; callers write <code>for (Song s : playlist)</code>. The collection is free to change its storage, and can offer several traversal orders (<code>inOrder()</code>, <code>levelOrder()</code>, <code>shuffled()</code>) — each is just another iterator. Multiple iterators can walk the same collection independently because the "cursor" lives in the iterator, not the collection.</p>
<p><b>Lazy power:</b> an iterator computes the next element only when asked. A BST iterator holds just O(height) nodes on a stack instead of copying N nodes into a list. Paged API iterators fetch page 2 only when page 1 is used up. Infinite sequences (IDs, Fibonacci) are possible.</p>`,
    clues: [
      '"Design an iterator for…" (BST, nested list, zigzag of two lists, peeking iterator, flatten 2D vector) → classic LeetCode iterator questions; aim for O(1) amortised <code>next()</code> and O(h) memory.',
      '"Traverse a custom collection <b>without exposing its internal representation</b>" → Iterable + Iterator.',
      '"Support <b>multiple traversal orders</b>" (in-order/pre-order, shuffle/repeat) → one iterator class per order.',
      '"Data is too big to load at once" / "paginated API" / "stream records from a file" → lazy iterator.',
      '"Modify the collection while iterating" → fail-fast iterators and <code>ConcurrentModificationException</code>, or <code>iterator.remove()</code>.',
      'Machine-coding: playlist (shuffle/repeat), file system walker, social feed paging, database cursor, menu traversal (with Composite).'
    ],
    code: [{ lang: 'java', title: 'Custom Iterable playlist with fail-fast iterator and two orders', code: `record Song(String title) {}

class Playlist implements Iterable<Song> {
    private Song[] songs = new Song[2];      // internal storage: hidden from callers
    private int size, modCount;              // modCount detects changes during iteration

    void add(Song s) {
        if (size == songs.length) songs = Arrays.copyOf(songs, size * 2);
        songs[size++] = s;
        modCount++;
    }

    @Override public Iterator<Song> iterator() { return new InOrder(); }

    // A second traversal order is just another iterator: callers do not change.
    Iterable<Song> shuffled(long seed) {
        return () -> {
            List<Integer> idx = new ArrayList<>();
            for (int i = 0; i < size; i++) idx.add(i);
            Collections.shuffle(idx, new Random(seed));
            Iterator<Integer> it = idx.iterator();
            return new Iterator<Song>() {
                public boolean hasNext() { return it.hasNext(); }
                public Song next() { return songs[it.next()]; }
            };
        };
    }

    private class InOrder implements Iterator<Song> {
        private int cursor = 0;                          // the "where am I" lives HERE
        private final int expectedMod = modCount;
        public boolean hasNext() { return cursor < size; }
        public Song next() {
            if (modCount != expectedMod) throw new ConcurrentModificationException();
            if (!hasNext()) throw new NoSuchElementException();
            return songs[cursor++];
        }
    }

    public static void main(String[] args) {
        Playlist p = new Playlist();
        for (String t : List.of("Intro", "Blue", "Rain")) p.add(new Song(t));
        for (Song s : p) System.out.print(s.title() + " ");          // for-each uses iterator()
        System.out.println();
        for (Song s : p.shuffled(42)) System.out.print(s.title() + " ");
        System.out.println();
        try { for (Song s : p) p.add(new Song("Oops")); }            // modify while iterating
        catch (ConcurrentModificationException e) { System.out.println("fail-fast: CME"); }
    }
}` }],
    codeTitle: ['Iterable playlist'],
    viz: {
      title: 'Lazy BST in-order iterator with an explicit stack',
      input: '8 4 12 2 6 10 14 1 3',
      inputLabel: 'Tree in level order (heap layout, "null" for missing, up to 15 values)',
      gen: function (input) {
        var t = tokens(input, /[\s,]+/, 15, 'Example: 8 4 12 2 6 10 14');
        var arr = t.map(function (x) { if (/^null$/i.test(x)) return null; var v = Number(x); if (isNaN(v)) throw new Error('Use numbers or null'); return v; });
        if (arr[0] === null) throw new Error('Root cannot be null');
        var L = function (i) { var c = 2 * i + 1; return c < arr.length && arr[c] !== null ? c : -1; };
        var R = function (i) { var c = 2 * i + 2; return c < arr.length && arr[c] !== null ? c : -1; };
        for (var k = 1; k < arr.length; k++) if (arr[k] !== null && arr[Math.floor((k - 1) / 2)] === null) throw new Error('Node at position ' + k + ' has a null parent');
        var code = 'BSTIterator(TreeNode root) { pushLeft(root); }\nvoid pushLeft(TreeNode n) {\n  while (n != null) { stack.push(n); n = n.left; }\n}\nboolean hasNext() { return !stack.isEmpty(); }\nint next() {\n  TreeNode n = stack.pop();\n  pushLeft(n.right);\n  return n.val;\n}';
        var stack = [], out = [], frames = [], visited = {};
        var snap = function (narr, hlTree, codeHl, extraHlStack) {
          var hs = {}; if (extraHlStack !== undefined) hs[extraHlStack] = 'cur';
          var hlt = clone(visited); for (var q in hlTree) hlt[q] = hlTree[q];
          stack.forEach(function (i) { if (!hlt[i]) hlt[i] = 'win'; });
          frames.push(F(narr, [{ type: 'tree', label: 'BST (blue = on stack, faded = already returned)', arr: arr, hl: hlt },
            { type: 'stack', label: 'iterator stack (top = next smallest)', items: stack.map(function (i) { return arr[i]; }), hl: hs },
            { type: 'array', label: 'values returned so far', values: out.length ? out.slice() : ['—'] },
            CODE('BSTIterator', code, codeHl)]));
        };
        var pushLeft = function (i, why) {
          while (i >= 0) {
            stack.push(i);
            var h = {}; h[i] = 'cur';
            snap(why + ' push <b>' + arr[i] + '</b>, then go to its left child' + (L(i) < 0 ? ' — none, stop.' : '.'), h, { 3: 'cur' }, stack.length - 1);
            i = L(i);
          }
        };
        snap('Constructor. Instead of copying all ' + arr.filter(function (x) { return x !== null; }).length + ' nodes into a list (O(N) memory), we keep only the <b>path of left children</b> on a stack: at most O(height) nodes.', {}, { 1: 'cur' });
        pushLeft(0, 'pushLeft(root):');
        var guard = 0;
        while (stack.length && guard++ < 20) {
          snap('<code>hasNext()</code> → stack not empty → <b>true</b>. The top of the stack is always the smallest value not yet returned.', {}, { 5: 'cur' }, stack.length - 1);
          var n = stack.pop();
          out.push(arr[n]);
          var h1 = {}; h1[n] = 'ok';
          snap('<code>next()</code>: pop <b>' + arr[n] + '</b> and return it. ' + (R(n) >= 0 ? 'It has a right child (' + arr[R(n)] + '), so everything in that right subtree comes next — pushLeft(right).' : 'No right child, nothing to push; the next value is already on top of the stack.'), h1, { 7: 'ok', 9: 'ok' });
          visited[n] = 'done';
          if (R(n) >= 0) pushLeft(R(n), 'pushLeft(' + arr[R(n)] + '):');
        }
        snap('<code>hasNext()</code> → stack empty → <b>false</b>. Output is sorted: ' + out.join(', ') + '. Each node was pushed and popped exactly once, so <code>next()</code> is <b>O(1) amortised</b> and memory is O(h).', {}, { 5: 'sel' });
        return frames;
      }
    },
    examples: [
      { title: 'for-each is the Iterator pattern', html: `<p><code>for (String s : list)</code> compiles to <code>Iterator&lt;String&gt; it = list.iterator(); while (it.hasNext()) { String s = it.next(); … }</code>. Any class implementing <code>Iterable</code> gets the loop syntax. That is why the same loop works over <code>ArrayList</code>, <code>HashSet</code>, <code>TreeMap.keySet()</code> and your own classes.</p>` },
      { title: 'Removing while iterating — the right way', html: `<p>Calling <code>list.remove(x)</code> inside a for-each throws <code>ConcurrentModificationException</code> on the next step (fail-fast: the iterator sees modCount changed). Use <code>iterator.remove()</code> or <code>removeIf</code>. Concurrent collections (<code>ConcurrentHashMap</code>, <code>CopyOnWriteArrayList</code>) give <b>weakly consistent / snapshot</b> iterators that never throw CME.</p>`, code: `List<Integer> nums = new ArrayList<>(List.of(1, 2, 3, 4, 5, 6));
Iterator<Integer> it = nums.iterator();
while (it.hasNext()) if (it.next() % 2 == 0) it.remove();   // safe removal
System.out.println(nums);                                   // [1, 3, 5]
nums.removeIf(x -> x > 3);                                  // even simpler
System.out.println(nums);                                   // [1, 3]` },
      { title: 'Paginated API iterator', html: `<p>A REST API returns 100 orders per page with a <code>nextPageToken</code>. Wrap it in an <code>Iterator&lt;Order&gt;</code>: <code>hasNext()</code> checks the local buffer; when it is empty and a token exists, fetch the next page. Callers just loop over orders; they never see tokens, and pages are fetched lazily — stop early and you never download the rest. AWS and Google SDKs ship exactly these "paginators".</p>` },
      { title: 'Internal vs external iteration', html: `<p><b>External</b> (Iterator): the caller drives — call <code>next()</code> when it wants, can stop, can interleave two iterators (merge two sorted lists). <b>Internal</b> (<code>forEach</code>, Streams): the collection drives and calls your lambda for each element — less control, but the library can parallelise (<code>parallelStream</code>) and optimise. <code>Spliterator</code> is Java's iterator designed for splitting work across threads.</p>` }
    ],
    deepDive: `<p><b>Iterator contract details:</b> <code>next()</code> must throw <code>NoSuchElementException</code> when exhausted (not return null); <code>hasNext()</code> must be idempotent (calling it twice must not skip an element) — a common bug when <code>hasNext()</code> advances state. If <code>hasNext()</code> needs to look ahead (filtering iterator, flatten nested list), cache the looked-ahead element in a field.</p>
<p><b>Fail-fast vs fail-safe:</b> <code>ArrayList</code>/<code>HashMap</code> iterators compare a <code>modCount</code> snapshot and throw CME on structural change — a best-effort bug detector, <i>not</i> a thread-safety guarantee. <code>CopyOnWriteArrayList</code> iterates a frozen snapshot; <code>ConcurrentHashMap</code> iterators are weakly consistent (may or may not reflect updates, never throw).</p>
<p><b>Memory & complexity:</b> a lazy tree iterator uses O(h) memory and O(1) amortised time per <code>next()</code> (each node pushed and popped once) versus O(N) for flattening up front. For a balanced tree h = log N; for a degenerate tree h = N — mention it.</p>
<p><b>Resource-backed iterators</b> (DB cursors, file lines) must be closed: implement <code>AutoCloseable</code> or expose a <code>Stream</code> with <code>onClose</code> (<code>Files.lines</code> must be used in try-with-resources). <b>Iterator + Composite:</b> iterating a tree of menus/folders uniformly is the textbook combo. <b>Generators</b> in Python/JS (<code>yield</code>) are iterators written as functions — Java needs explicit state machines, which is exactly what the stack in the BST iterator is.</p>`,
    aiEra: `<p><b>What AI changes:</b> LLM APIs stream tokens and agent frameworks stream events — consumed through iterators/async iterators. Paginated tool outputs for agents (search results, DB rows) should be wrapped in lazy iterators so the agent fetches only what it needs, saving tokens and latency.</p>
<p><b>Use AI as a partner:</b> "Write property tests that compare my BST iterator's output with a recursive in-order traversal on 1,000 random trees." <b>Where AI goes wrong:</b> generated iterators often flatten everything into a list (O(N) memory — fails the follow-up), make <code>hasNext()</code> non-idempotent, return null instead of throwing, or forget CME semantics. <b>What you own:</b> the lazy design, the complexity argument (amortised O(1)), and resource cleanup.</p>`,
    problems: [{
      title: 'Binary Search Tree Iterator', level: 'Medium', tags: ['iterator', 'stack', 'bst'], companies: ['Meta', 'Google', 'Microsoft', 'LinkedIn'],
      statement: `<p>Implement <code>BSTIterator</code> over a binary search tree: constructor takes the root; <code>next()</code> returns the next smallest number; <code>hasNext()</code> says whether one exists. Calls are interleaved arbitrarily. Target: <code>next()</code> and <code>hasNext()</code> in O(1) amortised time and <b>O(h)</b> memory, where h is the tree height.</p>`,
      constraints: `1 ≤ nodes ≤ 10<sup>5</sup>, 0 ≤ val ≤ 10<sup>6</sup>, at most 10<sup>5</sup> calls. <code>next()</code> is only called when <code>hasNext()</code> is true.`,
      example: `<p>Tree [7, 3, 15, null, null, 9, 20]. Calls: next→${H.c('g', '3')}, next→${H.c('g', '7')}, hasNext→true, next→${H.c('g', '9')}, hasNext→true, next→${H.c('g', '15')}, next→${H.c('g', '20')}, hasNext→${H.c('r', 'false')}. Values come out sorted because in-order traversal of a BST is sorted.</p>`,
      brute: { why: `<p>Do a full in-order traversal in the constructor and store every value in a list; <code>next()</code> returns list[i++]. Simple and O(1) per call, but uses <b>O(N) memory</b> and does O(N) work up front even if the caller only wants the first 3 values. Fails the follow-up "the tree has 10<sup>9</sup> nodes on disk".</p>`, code: `class FlatBSTIterator {
    private final List<Integer> vals = new ArrayList<>();
    private int i = 0;
    FlatBSTIterator(TreeNode root) { inorder(root); }        // O(N) time and memory up front
    private void inorder(TreeNode n) {
        if (n == null) return;
        inorder(n.left); vals.add(n.val); inorder(n.right);
    }
    int next() { return vals.get(i++); }
    boolean hasNext() { return i < vals.size(); }
}` },
      mcq: { q: 'Why is next() O(1) amortised even though it may push several nodes?', options: ['Every node is pushed once and popped once over the whole iteration, so N calls do O(N) total work', 'Because the stack is small', 'Because the tree is balanced', 'It is actually O(log N) worst case per call, and that is the same'], answer: 0, explain: 'Total pushes = N, total pops = N across all calls. A single call may push h nodes, but averaged over N calls the cost is constant.' },
      hints: [`<p>Hint 1: Simulate the recursive in-order traversal yourself; what the recursion keeps on the call stack, keep on an explicit stack.</p>`, `<p>Hint 2: The smallest unreturned value is always on top of a stack containing the "left spine" of what remains. Helper <code>pushLeft(node)</code>: push node and go left until null.</p>`, `<p>Hint 3: Constructor: pushLeft(root). next(): pop n; pushLeft(n.right); return n.val. hasNext(): !stack.isEmpty(). Use ArrayDeque, not the legacy Stack class.</p>`],
      solution: {
        approach: `<p>Keep an explicit stack that mirrors the paused recursion of an in-order traversal. Initially push the left spine of the root. Each <code>next()</code> pops the top (the smallest remaining), then pushes the left spine of its right subtree — exactly the nodes that come next in sorted order. Each node is pushed and popped once, giving O(1) amortised per call and O(h) memory. Implementing <code>Iterator&lt;Integer&gt;</code> lets callers use it with standard Java tooling.</p>`,
        code: `class BSTIterator implements Iterator<Integer> {
    private final Deque<TreeNode> stack = new ArrayDeque<>();

    BSTIterator(TreeNode root) { pushLeft(root); }

    private void pushLeft(TreeNode n) {
        while (n != null) { stack.push(n); n = n.left; }
    }

    @Override public boolean hasNext() { return !stack.isEmpty(); }   // idempotent: no side effects

    @Override public Integer next() {
        if (stack.isEmpty()) throw new NoSuchElementException();
        TreeNode n = stack.pop();
        pushLeft(n.right);                  // the right subtree's smallest comes next
        return n.val;
    }

    public static void main(String[] args) {
        TreeNode root = new TreeNode(7, new TreeNode(3), new TreeNode(15, new TreeNode(9), new TreeNode(20)));
        BSTIterator it = new BSTIterator(root);
        StringBuilder sb = new StringBuilder();
        while (it.hasNext()) sb.append(it.next()).append(' ');
        System.out.println(sb.toString().trim());   // 3 7 9 15 20
    }
}`,
        complexity: `<p>Time: O(1) amortised per <code>next()</code> (O(h) worst case for a single call); <code>hasNext()</code> O(1). Memory: O(h) — O(log N) balanced, O(N) for a skewed tree.</p>`,
        followUps: ['Add a peek() method without consuming the value', 'Iterate in descending order (mirror: push right spine)', 'Support prev() as well (bidirectional) — what extra state do you need?']
      }
    }]
  });

  /* ======================= TOPIC 8: MEDIATOR ======================= */
  topics.push({
    title: 'Mediator: One Hub Instead of Everyone Talking to Everyone',
    analogy: `<p>Planes near an airport never radio <i>each other</i> to decide who lands first. They all talk to the <b>air traffic control tower</b>, and the tower coordinates. With 30 planes, imagine the chaos if each plane had to negotiate with the other 29! A <b>WhatsApp group</b> is the same: you send one message to the group, and the group server delivers it to everyone — you do not hold a connection to every member's phone.</p>`,
    explain: `<p><b>Mediator in one line:</b> objects that need to cooperate (<b>colleagues</b>) do not reference each other; they only talk to a central <b>mediator</b>, which contains the coordination rules and forwards messages.</p>
${H.table(['Role', 'Job', 'Chat example'], [
  ['<b>Mediator</b> (interface)', 'Receives events from colleagues, decides who reacts', '<code>ChatMediator.send(from, msg)</code>'],
  ['<b>Concrete mediator</b>', 'Holds references to all colleagues + the coordination rules', '<code>ChatRoom</code> (mute list, direct messages, history)'],
  ['<b>Colleagues</b>', 'Know only the mediator', '<code>User</code>']
])}
<p><b>The naive way:</b> each user holds a list of all other users and calls <code>other.receive(msg)</code> directly. With N users that is <b>N × (N−1)</b> references. Add a rule "muted users cannot post" → copy it into every user. Add a new user → update every existing user's list. ${H.c('r', 'A tangled mesh: every object depends on every other.')}</p>
${H.table(['Users N', 'Mesh links N(N−1)/2', 'Hub links N'], [['4', '6', '4'], ['10', '45', '10'], ['100', '4,950', '100']])}
<p><b>With Mediator:</b> each user has <b>one</b> reference (to the room). Rules (muting, @direct messages, rate limits, history) live in one class. Users are reusable in other rooms. The trade-off: the mediator can grow into a "god object" if you dump unrelated logic into it.</p>
<p>Real places: UI dialogs (a form "mediator" enables the Submit button only when fields are valid — fields do not know each other), air traffic control, chat servers, an auction house coordinating bidders, a <b>smart-home hub</b>, an <b>event bus</b> inside an app, and MVC controllers coordinating views and models. In Java, <code>ExecutorService</code> mediates between task submitters and worker threads.</p>`,
    clues: [
      '"Many objects need to <b>coordinate</b> / interact, and the interactions are complex" → centralise them in a mediator.',
      '"Chat room", "group", "auction house", "air traffic control", "control tower", "smart-home hub" → Mediator by name.',
      '"Changing one component forces changes in many others because they reference each other" → mesh → hub.',
      '"UI widgets depend on each other (checkbox enables a textbox, dropdown filters another dropdown)" → dialog mediator.',
      'Contrast question: "<b>Observer vs Mediator</b>?" → Observer = one-to-many broadcast, subject does not know the logic; Mediator = many-to-many with coordination logic in the hub.',
      'Machine-coding: chat application, ride-matching (driver ↔ rider via dispatcher), meeting-room booking coordinator, multiplayer game lobby.'
    ],
    code: [{ lang: 'java', title: 'Chat room mediator with direct messages and muting', code: `interface ChatMediator {
    void join(User u);
    void leave(User u);
    void send(User from, String text);
}

class User {
    final String name;
    private final ChatMediator room;           // the ONLY reference a user holds
    final List<String> inbox = new ArrayList<>();
    User(String name, ChatMediator room) { this.name = name; this.room = room; }
    void say(String text) { room.send(this, text); }
    void receive(String from, String text) { inbox.add(from + ": " + text); }
}

class ChatRoom implements ChatMediator {
    private final Map<String, User> members = new LinkedHashMap<>();
    private final Set<String> muted = new HashSet<>();
    private final List<String> history = new ArrayList<>();

    public void join(User u)  { members.put(u.name, u); broadcast("system", u.name + " joined", null); }
    public void leave(User u) { members.remove(u.name); broadcast("system", u.name + " left", null); }
    void mute(String name)    { muted.add(name); }

    // All coordination rules live here, in ONE place.
    public void send(User from, String text) {
        if (!members.containsKey(from.name)) return;                  // not in the room
        if (muted.contains(from.name)) { from.receive("system", "you are muted"); return; }
        history.add(from.name + ": " + text);
        if (text.startsWith("@")) {                                   // direct message rule
            String to = text.substring(1, text.indexOf(' ') > 0 ? text.indexOf(' ') : text.length());
            User target = members.get(to);
            if (target != null) target.receive(from.name + " (private)", text);
            else from.receive("system", "no user " + to);
            return;
        }
        broadcast(from.name, text, from);
    }
    private void broadcast(String from, String text, User except) {
        for (User u : members.values()) if (u != except) u.receive(from, text);
    }

    public static void main(String[] args) {
        ChatRoom room = new ChatRoom();
        User a = new User("alice", room), b = new User("bob", room), c = new User("carol", room);
        room.join(a); room.join(b); room.join(c);
        a.say("hi all");
        b.say("@carol lunch?");
        room.mute("alice");
        a.say("spam spam");
        System.out.println("bob:   " + b.inbox);
        System.out.println("carol: " + c.inbox);
        System.out.println("alice: " + a.inbox);
    }
}` }],
    codeTitle: ['Chat room mediator'],
    viz: {
      title: 'Mediator: mesh vs hub, then messages routed through the chat room',
      input: 'alice: hi all; bob: @carol lunch?; dave joins; carol: sure; mute bob; bob: hello?',
      inputLabel: 'Events separated by ; — "name: text", "name: @to text", "name joins", "name leaves", "mute name" (names: alice, bob, carol, dave, eve)',
      gen: function (input) {
        var ev = tokens(input, ';', 10, 'Example: alice: hi; bob: @carol hey; dave joins');
        var POS = { alice: [12, 8], bob: [88, 8], carol: [12, 62], dave: [88, 62], eve: [50, 70] };
        var members = ['alice', 'bob', 'carol'], muted = {}, frames = [];
        var uNodes = function (list) { return list.map(function (n) { return B(n, n, POS[n][0], POS[n][1]); }); };
        var hub = function () { return [B('ROOM', 'ChatRoom (mediator)', 50, 36)].concat(uNodes(members)); };
        var hubEdges = function () { var e = []; members.forEach(function (n) { e.push([n, 'ROOM']); }); return e; };
        // mesh comparison
        var all4 = ['alice', 'bob', 'carol', 'dave'], mesh = [];
        for (var i = 0; i < all4.length; i++) for (var j = i + 1; j < all4.length; j++) mesh.push([all4[i], all4[j]]);
        frames.push(F('<b>Without a mediator</b> every user references every other user: 4 users → ' + mesh.length + ' links (N(N−1)/2). Add a 5th user and every existing user must learn about them. Rules like muting must be copied into each user.',
          [G('Mesh: everyone knows everyone', uNodes(all4), mesh, { h: 70, undirected: true, ehl: paint(mesh, 'bad') }), VARS('coupling', { users: 4, links: mesh.length }, { links: 'bad' })]));
        var hubAll = [B('ROOM', 'ChatRoom (mediator)', 50, 36)].concat(uNodes(all4)), hubAllE = all4.map(function (n) { return [n, 'ROOM']; });
        frames.push(F('<b>With a mediator</b> each user knows only the room: 4 users → 4 links (N). The room holds the coordination rules (who receives what, muting, @direct messages).',
          [G('Hub: everyone knows only the mediator', hubAll, hubAllE, { h: 76, hl: { ROOM: 'sel' }, ehl: paint(hubAllE, 'ok') }), VARS('coupling', { users: 4, links: 4 }, { links: 'ok' })]));
        frames.push(F('Our room starts with <b>' + members.join(', ') + '</b>. Let us play the events.', [G('ChatRoom', hub(), hubEdges(), { h: 76, hl: { ROOM: 'sel' } }), { type: 'list', label: 'members', values: members.slice() }]));
        ev.forEach(function (raw) {
          var m;
          if ((m = /^(\w+)\s+(joins|leaves)$/i.exec(raw))) {
            var who = m[1].toLowerCase(); if (!POS[who]) throw new Error('Unknown user "' + who + '". Use alice, bob, carol, dave or eve');
            if (m[2].toLowerCase() === 'joins') { if (members.indexOf(who) < 0) members.push(who); }
            else members = members.filter(function (x) { return x !== who; });
            var hj = { ROOM: 'cur' }; hj[who] = m[2].toLowerCase() === 'joins' ? 'ok' : 'bad';
            frames.push(F('<b>' + who + '</b> ' + m[2].toLowerCase() + '. Only the <b>mediator</b> updates its member map — no other user changes. ' + H.c('g', 'Adding a colleague costs one link.'),
              [G('Membership change', hub().concat(members.indexOf(who) < 0 ? [B(who, who, POS[who][0], POS[who][1])] : []), hubEdges(), { h: 76, hl: hj }), { type: 'list', label: 'members', values: members.slice() }]));
            return;
          }
          if ((m = /^mute\s+(\w+)$/i.exec(raw))) {
            var mu = m[1].toLowerCase(); muted[mu] = true;
            var hm = { ROOM: 'cur' }; hm[mu] = 'bad';
            frames.push(F('Moderator calls <code>room.mute("' + mu + '")</code>. The rule is stored <b>once</b>, in the mediator. Users do not need to know who is muted.',
              [G('Rule added to mediator', hub(), hubEdges(), { h: 76, hl: hm, tags: (function () { var t = {}; t[mu] = 'muted'; return t; })() }), { type: 'set', label: 'muted', items: Object.keys(muted) }]));
            return;
          }
          if ((m = /^(\w+)\s*:\s*(.+)$/.exec(raw))) {
            var from = m[1].toLowerCase(), text = m[2];
            if (!POS[from]) throw new Error('Unknown user "' + from + '"');
            if (members.indexOf(from) < 0) {
              frames.push(F('<b>' + from + '</b> is not in the room, so the mediator ignores the message.', [G('Ignored', hub(), hubEdges(), { h: 76, hl: { ROOM: 'bad' } })]));
              return;
            }
            var hs = { ROOM: 'cur' }; hs[from] = 'cur'; var es = {}; es[from + '-ROOM'] = 'cur';
            frames.push(F('<b>' + from + '</b> calls <code>room.send(this, "' + esc(text) + '")</code>. The user does not know who else is in the room — it only talks to the mediator.',
              [G('Colleague → mediator', hub(), hubEdges(), { h: 76, hl: hs, ehl: es }), VARS('message', { from: from, text: text })]));
            if (muted[from]) {
              var hb = { ROOM: 'bad' }; hb[from] = 'bad';
              frames.push(F('Mediator rule: <b>' + from + '</b> is muted → message dropped, sender gets "you are muted". ' + H.c('r', 'Nobody else is touched.'), [G('Blocked by rule', hub(), hubEdges(), { h: 76, hl: hb })]));
              return;
            }
            var targets;
            var dm = /^@(\w+)/.exec(text);
            if (dm) {
              var to = dm[1].toLowerCase();
              targets = members.indexOf(to) >= 0 ? [to] : [];
              if (!targets.length) {
                frames.push(F('Direct message to <b>' + to + '</b>, but they are not a member → mediator replies "no user ' + to + '".', [G('Unknown recipient', hub(), hubEdges(), { h: 76, hl: { ROOM: 'bad' } })]));
                return;
              }
            } else targets = members.filter(function (x) { return x !== from; });
            var hd = { ROOM: 'cur' }, ed = {}, tg = {};
            hd[from] = 'done';
            targets.forEach(function (tname) { hd[tname] = 'ok'; ed[tname + '-ROOM'] = 'ok'; tg[tname] = 'got it'; });
            frames.push(F('Mediator decides recipients: ' + (dm ? '<b>@' + dm[1] + '</b> rule → only ' + targets[0] : 'broadcast to everyone except the sender → ' + targets.join(', ')) + '. Arrows light up for each delivery (<code>user.receive(...)</code>).',
              [G('Mediator → recipients', hub(), hubEdges(), { h: 76, hl: hd, ehl: ed, tags: tg }), VARS('routing', { rule: dm ? 'direct' : 'broadcast', recipients: targets.length })]));
            return;
          }
          throw new Error('Cannot read "' + raw + '". Use "name: text", "name joins", "name leaves" or "mute name"');
        });
        frames.push(F('All routing and rules (broadcast, @direct, mute, membership) lived in <b>one class</b>. Users stayed tiny and reusable. Watch out: if the mediator keeps absorbing unrelated features, it becomes a god object — split it by concern.', [G('Final room', hub(), hubEdges(), { h: 76, hl: { ROOM: 'sel' } }), { type: 'list', label: 'members', values: members.slice() }]));
        return frames;
      }
    },
    examples: [
      { title: 'Sign-up form dialog', html: `<p>Widgets: email field, password field, "I accept terms" checkbox, Submit button. Rule: Submit is enabled only when email is valid, password ≥ 8 chars and the box is ticked. Without a mediator, each widget would need references to the others. With a <code>SignupDialog</code> mediator, each widget calls <code>dialog.changed(this)</code> and the dialog re-evaluates the rule and enables/disables Submit.</p>`, code: `class SignupDialog {
    String email = ""; String password = ""; boolean accepted; boolean submitEnabled;
    void changed() {   // every widget calls this; the rule lives in one place
        submitEnabled = email.contains("@") && password.length() >= 8 && accepted;
    }
}
SignupDialog d = new SignupDialog();
d.email = "a@b.com"; d.changed();
d.password = "secret123"; d.changed();
d.accepted = true; d.changed();
System.out.println("submit enabled? " + d.submitEnabled);` },
      { title: 'Ride matching dispatcher', html: `<p>Riders and drivers never contact each other directly at first. The <b>dispatcher</b> receives "need a ride" and "I am available" events, applies matching rules (nearest driver, rating, surge) and introduces a pair. Swapping the matching algorithm touches only the dispatcher (which might hold a Strategy for it — patterns combine).</p>` },
      { title: 'Observer vs Mediator side by side', html: `<p><b>Observer:</b> a stock ticker broadcasts "price changed"; it does not decide anything about who should react or how. <b>Mediator:</b> the control tower receives "plane 7 wants to land", <i>checks</i> runway state, <i>tells</i> plane 7 to land and plane 9 to circle. A mediator is often <i>implemented with</i> observer-style notifications, but its point is the coordination logic in the middle.</p>` },
      { title: 'Event bus inside an application', html: `<p>Modules publish events to an in-app bus (Guava EventBus, Spring <code>ApplicationEventPublisher</code>) and subscribe to the types they care about. Modules no longer import each other — the bus mediates. Downside: control flow becomes implicit ("who handles this event?"), so keep event names explicit and log them.</p>` }
    ],
    deepDive: `<p><b>God-object risk:</b> the mediator concentrates complexity. Keep it about <i>coordination</i> only; push domain logic into colleagues or into strategies the mediator uses (e.g. <code>MatchingStrategy</code> inside the dispatcher). Several small mediators (one per dialog/room) beat one global one.</p>
<p><b>Memory and lifecycle:</b> the mediator holds strong references to all colleagues — remove them on leave/close or you leak (same as Observer). If colleagues are created by the mediator, it can own their lifecycle.</p>
<p><b>Concurrency:</b> a chat room receives messages from many threads. Either make the mediator single-threaded (an actor: one thread consumes a message queue — this also guarantees message order) or use concurrent collections and avoid calling colleagues while holding a lock (they may call back → deadlock). The actor model (Akka, Erlang) is essentially mediators that process one message at a time.</p>
<p><b>Distributed version:</b> at scale the mediator becomes a service (chat server, matching service, orchestrator). Then you add persistence, delivery acknowledgements, fan-out workers and presence. Orchestration-style sagas (a central coordinator telling services what to do) are Mediator; choreography-style sagas (services reacting to each other's events) are Observer/pub-sub.</p>
<p><b>Testing:</b> colleagues are tested with a fake mediator that records calls; the mediator is tested with fake colleagues — both are simple because neither knows the concrete other.</p>`,
    aiEra: `<p><b>What AI changes:</b> multi-agent systems face the mesh-vs-hub decision directly. Letting N agents chat freely with each other gets chaotic and expensive (N² conversations, loops). Most production setups use an <b>orchestrator/supervisor agent</b> — a mediator — that receives results, decides who acts next, and enforces budgets and stop conditions. MCP hosts play a similar role between a model and many tool servers.</p>
<p><b>Where AI goes wrong:</b> generated code often lets components call each other directly "because it was quicker", or stuffs all business rules into one 2,000-line coordinator. <b>What you own:</b> drawing the interaction graph, deciding which rules belong in the hub, keeping it thin, and choosing in-process vs service-level mediation.</p>`,
    problems: [{
      title: 'Air Traffic Control Tower', level: 'Medium', tags: ['mediator', 'queue'], companies: ['Boeing', 'Airbus', 'Honeywell', 'Amazon'],
      statement: `<p>An airport has <b>R runways</b>. Planes call <code>tower.requestLanding(plane)</code>. If a runway is free, the tower assigns it and tells the plane to land; otherwise the plane is told to <b>hold</b> and is queued (emergency planes go to the front). When a plane calls <code>tower.landed(plane)</code>, its runway is freed and the tower immediately clears the next waiting plane. Planes must never reference each other.</p>`,
      constraints: `1 ≤ R ≤ 10, up to 10<sup>4</sup> planes. FIFO among normal planes; emergencies before all normal planes (FIFO among emergencies).`,
      example: `<p>R = 1. A requests → ${H.c('g', 'A lands on runway 0')}. B requests → ${H.c('y', 'B holds')}. EMERGENCY E requests → ${H.c('y', 'E holds, queued before B')}. A landed → runway 0 freed → ${H.c('g', 'E lands')}. E landed → ${H.c('g', 'B lands')}.</p>`,
      brute: { why: `<p>Each plane holds a list of all other planes and, before landing, asks each one "are you on the runway?" and "were you waiting before me?". That is O(N) messages per request and N² references overall; emergency priority must be coded in every plane; two planes can both decide the runway is free at the same moment (race).</p>`, code: `class NaivePlane {
    final String id; boolean onRunway, waiting; final List<NaivePlane> others = new ArrayList<>();
    NaivePlane(String id) { this.id = id; }
    boolean tryLand() {
        for (NaivePlane p : others) if (p.onRunway) { waiting = true; return false; }   // asks everyone
        for (NaivePlane p : others) if (p.waiting) { waiting = true; return false; }    // fairness? priority?
        onRunway = true; waiting = false; return true;     // two planes can do this at once
    }
}` },
      mcq: { q: 'Which object should decide that an emergency plane jumps the queue?', options: ['The tower (mediator) — it owns the queue and runway rules', 'Each plane, by checking the others', 'The runway object', 'The emergency plane itself, by landing anyway'], answer: 0, explain: 'Coordination rules belong to the mediator. Planes only report events (request, landed) and obey instructions.' },
      hints: [`<p>Hint 1: Planes know only the tower. The tower knows runways (free/occupied) and a waiting queue.</p>`, `<p>Hint 2: Two deques (emergency, normal) or a PriorityQueue keyed by (priority, arrival sequence). An array of runway owners, null = free.</p>`, `<p>Hint 3: <code>landed()</code> frees the runway then calls a private <code>dispatchNext()</code>. Make tower methods <code>synchronized</code> so two planes cannot grab the same runway. Recipe: request → free runway? assign : enqueue; landed → free → dispatch.</p>`],
      solution: {
        approach: `<p>The <code>Tower</code> is the mediator: it owns runway occupancy and two FIFO queues (emergency first). Planes are colleagues that only call <code>requestLanding</code> / <code>landed</code> and receive instructions via <code>clearToLand(runway)</code> or <code>hold()</code>. All rules — priority, fairness, runway assignment — live in the tower, in synchronized methods, so there are no races and planes never reference each other.</p>`,
        code: `class Plane {
    final String id; final boolean emergency;
    Plane(String id, boolean emergency) { this.id = id; this.emergency = emergency; }
    void clearToLand(int runway) { System.out.println(id + ": landing on runway " + runway); }
    void hold() { System.out.println(id + ": holding pattern"); }
}

class Tower {
    private final Plane[] runways;                     // null = free
    private final Deque<Plane> emergencyQ = new ArrayDeque<>(), normalQ = new ArrayDeque<>();
    Tower(int r) { runways = new Plane[r]; }

    synchronized void requestLanding(Plane p) {
        int free = freeRunway();
        if (free >= 0) { assign(free, p); return; }
        (p.emergency ? emergencyQ : normalQ).addLast(p);
        p.hold();
    }

    synchronized void landed(Plane p) {
        for (int i = 0; i < runways.length; i++) {
            if (runways[i] == p) {
                runways[i] = null;
                System.out.println("tower: runway " + i + " free");
                dispatchNext(i);
                return;
            }
        }
        throw new IllegalStateException(p.id + " was not on a runway");
    }

    private void dispatchNext(int runway) {
        Plane next = !emergencyQ.isEmpty() ? emergencyQ.pollFirst() : normalQ.pollFirst();
        if (next != null) assign(runway, next);
    }
    private int freeRunway() {
        for (int i = 0; i < runways.length; i++) if (runways[i] == null) return i;
        return -1;
    }
    private void assign(int i, Plane p) { runways[i] = p; p.clearToLand(i); }

    public static void main(String[] args) {
        Tower t = new Tower(1);
        Plane a = new Plane("A", false), b = new Plane("B", false), e = new Plane("E", true);
        t.requestLanding(a);
        t.requestLanding(b);
        t.requestLanding(e);
        t.landed(a);      // E lands before B
        t.landed(e);      // then B
    }
}`,
        complexity: `<p>request/landed: O(R) to scan runways (R ≤ 10) + O(1) queue ops. Memory O(R + waiting planes).</p>`,
        followUps: ['Planes also take off from the same runways — how do you mix takeoff and landing queues fairly?', 'How would you notify planes asynchronously (they are remote)?', 'Add a rule: heavy planes need a 2-minute gap — where does it live?']
      }
    }]
  });

  /* ======================= TOPIC 9: MEMENTO ======================= */
  topics.push({
    title: 'Memento: Save a Snapshot, Restore It Later',
    analogy: `<p>A <b>video game save point</b>: before the boss fight you save; if you lose, you reload exactly where you were — health, gold, position. The save file is <b>sealed</b>: the "Load Game" menu can store and list your saves, but it cannot edit your gold. Or think of <b>Ctrl+Z in Photoshop</b> after a blur filter: you cannot "un-blur" mathematically, so the app simply goes back to the picture saved just before.</p>`,
    explain: `<p><b>Memento in one line:</b> let an object (the <b>originator</b>) produce a sealed snapshot of its internal state (the <b>memento</b>), let someone else (the <b>caretaker</b>) keep those snapshots, and later hand one back to the originator to restore — <b>without exposing the object's private fields</b> to anyone.</p>
${H.table(['Role', 'Job', 'Game example'], [
  ['<b>Originator</b>', 'Creates a memento of itself (<code>save()</code>) and restores from one (<code>restore(m)</code>)', '<code>Game</code> (hp, gold, level, inventory)'],
  ['<b>Memento</b>', 'An immutable, opaque snapshot; only the originator can read it', '<code>Game.Snapshot</code>'],
  ['<b>Caretaker</b>', 'Stores mementos (stack, list, map of named saves); never looks inside', '<code>SaveSlots</code> / undo history']
])}
<p><b>The naive way:</b> make every field public (or add getters <i>and</i> setters for all of them) so a "SaveManager" can copy them out and write them back. Now encapsulation is gone: any class can set <code>gold = 999999</code>. Every new field must be remembered in the SaveManager too. And a classic bug: copying a <code>List</code> <i>reference</i> instead of the list itself — later changes to the inventory silently change the "saved" copy. ${H.c('r', 'Leaky, fragile, and the snapshot is not really a snapshot.')}</p>
<p><b>With Memento:</b> the originator itself decides what to capture (deep-copying mutable parts) and how to restore it. The caretaker holds opaque objects. Add a field? Only the originator changes.</p>
<p><b>Memento vs Command for undo:</b> Command stores the <i>operation</i> and reverses it (cheap, needs an inverse). Memento stores the <i>state</i> and jumps back (works for anything, costs memory). Editors often combine them: commands for typing, mementos for "apply filter" or as periodic checkpoints.</p>`,
    clues: [
      '"<b>Undo</b>" where operations are hard to reverse (filters, complex transformations, game moves) → Memento snapshots.',
      '"<b>Save / checkpoint / restore</b>", "rollback to a previous version", "snapshot" → Memento.',
      '"Without exposing internal state / without breaking encapsulation" → that phrase is the Memento signature.',
      '"Transactions: begin, change things, then commit or <b>rollback</b>" → snapshot at begin, restore on rollback.',
      'Machine-coding: text editor history, drawing app, game save slots, form draft autosave, configuration rollback, in-memory KV store with transactions.',
      'Follow-up "the state is huge" → incremental/delta snapshots, copy-on-write, or switch to Command (store operations instead of states).'
    ],
    code: [{ lang: 'java', title: 'Game with sealed snapshots and a caretaker', code: `class Game {
    private int hp = 100, gold = 0, level = 1;
    private final List<String> inventory = new ArrayList<>();

    void play(int damage, int loot, String item) {
        hp = Math.max(0, hp - damage); gold += loot;
        if (item != null) inventory.add(item);
        if (gold >= 100) { level++; gold -= 100; }
    }

    // MEMENTO: nested, immutable, fields private. Outside code can hold it but not read it.
    static final class Snapshot {
        private final int hp, gold, level;
        private final List<String> inventory;           // deep copy, see save()
        private final String label;
        private Snapshot(int hp, int gold, int level, List<String> inv, String label) {
            this.hp = hp; this.gold = gold; this.level = level; this.inventory = inv; this.label = label;
        }
        String label() { return label; }               // only harmless metadata is visible
    }

    Snapshot save(String label) {
        return new Snapshot(hp, gold, level, List.copyOf(inventory), label);   // copy, not reference!
    }
    void restore(Snapshot s) {
        hp = s.hp; gold = s.gold; level = s.level;     // Game can read Snapshot's private fields
        inventory.clear(); inventory.addAll(s.inventory);
    }
    @Override public String toString() { return "hp=" + hp + " gold=" + gold + " lvl=" + level + " inv=" + inventory; }
}

// CARETAKER: stores snapshots, never inspects or edits them.
class SaveSlots {
    private final Deque<Game.Snapshot> history = new ArrayDeque<>();
    private final int max;
    SaveSlots(int max) { this.max = max; }
    void push(Game.Snapshot s) { history.push(s); if (history.size() > max) history.removeLast(); }
    Optional<Game.Snapshot> pop() { return Optional.ofNullable(history.poll()); }
    List<String> labels() { return history.stream().map(Game.Snapshot::label).toList(); }
}

class MementoDemo {
    public static void main(String[] args) {
        Game g = new Game();
        SaveSlots slots = new SaveSlots(3);
        g.play(10, 60, "sword");
        slots.push(g.save("before cave"));
        g.play(70, 50, "shield");
        slots.push(g.save("before boss"));
        g.play(90, 0, null);                       // boss fight goes badly
        System.out.println("now:      " + g);
        slots.pop().ifPresent(g::restore);
        System.out.println("reloaded: " + g);
        slots.pop().ifPresent(g::restore);
        System.out.println("reloaded: " + g + " remaining saves " + slots.labels());
    }
}` }],
    codeTitle: ['Memento with caretaker'],
    viz: {
      title: 'Memento: saving and restoring sealed snapshots',
      input: 'set hp=100; set gold=10; save; set hp=40; add sword; save; set hp=0; restore; restore; restore',
      inputLabel: 'Actions separated by ; (set hp=N | set gold=N | add ITEM | save | restore)',
      gen: function (input) {
        var acts = tokens(input, ';', 14, 'Example: set hp=50; save; set hp=0; restore');
        var st = { hp: 100, gold: 0, inventory: [] }, stack = [], frames = [], n = 0;
        var nodes = [B('ORG', 'Game (originator)', 15, 30), B('MEM', 'Snapshot (memento)', 50, 30), B('CT', 'SaveSlots (caretaker)', 85, 30), B('CL', 'Player / UI', 50, 6)];
        var edges = [['ORG', 'MEM', 'save() creates'], ['CT', 'MEM', 'holds (opaque)'], ['CL', 'ORG', 'play'], ['CL', 'CT', 'push/pop']];
        var view = function () { return { hp: st.hp, gold: st.gold, inventory: st.inventory.length ? st.inventory.join(',') : '(empty)' }; };
        var stk = function (hl) { return STACK('Caretaker stack (contents sealed)', stack.map(function (s) { return '#' + s.n + ' sealed'; }), hl || {}); };
        frames.push(F('<b>Structure.</b> The originator (Game) is the <i>only</i> class that can read a Snapshot\'s fields. The caretaker stores snapshots like sealed envelopes — it knows "#1", "#2", nothing more. This is how Memento keeps <b>encapsulation</b>.',
          [G('Memento roles', nodes, edges, { h: 60, hl: { ORG: 'sel', MEM: 'sel' } }), VARS('Game private state', view()), stk()]));
        acts.forEach(function (a) {
          var m;
          if ((m = /^set\s+(hp|gold)\s*=\s*(-?\d+)$/i.exec(a))) {
            var k = m[1].toLowerCase(), v = parseInt(m[2], 10);
            if (Math.abs(v) > 1e6) throw new Error('Keep numbers small');
            st[k] = v; var hv = {}; hv[k] = 'cur';
            frames.push(F('Gameplay changes <b>' + k + '</b> to ' + v + '. Only the live object changes; saved snapshots are untouched.', [G('Playing', nodes, edges, { h: 60, hl: { ORG: 'cur', CL: 'cur' }, ehl: { 'CL-ORG': 'cur' } }), VARS('Game private state', view(), hv), stk()]));
          } else if ((m = /^add\s+(\w+)$/i.exec(a))) {
            st.inventory = st.inventory.concat([m[1]]);
            frames.push(F('Picked up <b>' + esc(m[1]) + '</b>. Inventory is a mutable list — this is why <code>save()</code> must <b>copy</b> it, not store the same reference.', [G('Playing', nodes, edges, { h: 60, hl: { ORG: 'cur' }, ehl: { 'CL-ORG': 'cur' } }), VARS('Game private state', view(), { inventory: 'cur' }), stk()]));
          } else if (/^save$/i.test(a)) {
            n++;
            stack.push({ n: n, hp: st.hp, gold: st.gold, inventory: st.inventory.slice() });
            var hs = {}; hs[stack.length - 1] = 'ok';
            frames.push(F('<code>slots.push(game.save())</code>: Game copies its private state (deep-copying the inventory) into <b>Snapshot #' + n + '</b>, and the caretaker pushes it. The caretaker cannot see hp=' + st.hp + ' — only "#' + n + '".',
              [G('save()', nodes, edges, { h: 60, hl: { ORG: 'cur', MEM: 'ok', CT: 'ok' }, ehl: { 'ORG-MEM': 'ok', 'CT-MEM': 'ok', 'CL-CT': 'cur' } }), VARS('Game private state', view()), stk(hs),
                VARS('inside Snapshot #' + n + ' (only Game can read)', { hp: st.hp, gold: st.gold, inventory: st.inventory.length ? st.inventory.join(',') : '(empty)' })]));
          } else if (/^restore$/i.test(a)) {
            if (!stack.length) {
              frames.push(F('<code>slots.pop()</code> returns <b>Optional.empty()</b> — no saves left. Nothing is restored; always handle this case.', [G('nothing to restore', nodes, edges, { h: 60, hl: { CT: 'bad' } }), VARS('Game private state', view()), stk()]));
              return;
            }
            var before = stack.slice(), s = stack.pop();
            var hb = {}; hb[before.length - 1] = 'cur';
            st = { hp: s.hp, gold: s.gold, inventory: s.inventory.slice() };
            frames.push(F('<code>slots.pop().ifPresent(game::restore)</code>: the caretaker hands back <b>Snapshot #' + s.n + '</b>; Game opens it and overwrites its own fields. hp is back to ' + s.hp + '. ' + H.c('g', 'No public setters were needed.'),
              [G('restore()', nodes, edges, { h: 60, hl: { ORG: 'ok', MEM: 'cur', CT: 'cur' }, ehl: { 'CL-CT': 'cur', 'ORG-MEM': 'cur' } }), VARS('Game private state', view(), { hp: 'ok', gold: 'ok', inventory: 'ok' }), STACK('Caretaker stack (before pop)', before.map(function (x) { return '#' + x.n + ' sealed'; }), hb)]));
          } else throw new Error('Cannot read "' + a + '". Use set hp=N, set gold=N, add ITEM, save or restore');
        });
        frames.push(F('Finished. Memory cost = one full snapshot per save — fine for small objects, expensive for big documents (then use deltas, copy-on-write, or Command).', [G('Memento roles', nodes, edges, { h: 60, hl: { ORG: 'sel' } }), VARS('Game private state', view()), stk()]));
        return frames;
      }
    },
    examples: [
      { title: 'The shallow-copy bug', html: `<p>If <code>save()</code> stores <code>this.inventory</code> (the same list object), then adding "shield" after saving also changes the snapshot — restore brings back the shield you should have lost. Always copy mutable fields (<code>List.copyOf</code>, defensive copies, or keep state immutable to begin with).</p>`, code: `List<String> live = new ArrayList<>(List.of("sword"));
List<String> badSnapshot = live;                 // same object!
List<String> goodSnapshot = List.copyOf(live);   // independent copy
live.add("shield");
System.out.println("bad: " + badSnapshot + "  good: " + goodSnapshot);   // bad: [sword, shield]  good: [sword]` },
      { title: 'Form draft autosave', html: `<p>A long job-application form saves a memento every 30 s to local storage. If the browser crashes, the form restores the last memento. The autosave timer (caretaker) does not understand the form's fields; it stores whatever opaque blob <code>form.snapshot()</code> returns (often serialized JSON).</p>` },
      { title: 'Immutable state makes Memento free', html: `<p>If the originator's state is an immutable record (<code>record Board(List&lt;String&gt; cells, int turn)</code> built with copies), then "saving" is just keeping a reference to the current state object — it can never change. Redux in frontend apps, persistent data structures in functional languages and Git commits all work this way: <b>history = list of immutable states</b>, with structural sharing to save memory.</p>` },
      { title: 'Transactions: snapshot on BEGIN', html: `<p>An in-memory key-value store supports <code>BEGIN</code> / <code>ROLLBACK</code> / <code>COMMIT</code>. Simplest correct design: on BEGIN push a memento (copy of the map) on a stack; ROLLBACK pops and restores; COMMIT discards the top. Cost: O(size of map) per BEGIN. Optimised design (Hard practice problem): store only the <i>changed keys' old values</i> — a delta memento.</p>` }
    ],
    deepDive: `<p><b>Narrow vs wide interface:</b> GoF says the memento offers a <i>wide</i> interface to the originator (read all state) and a <i>narrow</i> one to everyone else (nothing, or a label/timestamp). In Java: nested class with private fields (the outer class can access them), or package-private access with originator and memento in the same package, or an opaque serialized byte array.</p>
<p><b>Memory strategies:</b> (1) full snapshots — simple, O(state) per save; (2) <b>deltas</b> — store only what changed since the previous memento; restore by applying deltas backwards; (3) <b>copy-on-write / persistent structures</b> — unchanged parts are shared between snapshots; (4) cap the number of mementos (ring buffer) or thin them out over time (keep every save from the last minute, one per minute for the last hour…).</p>
<p><b>Serialization & versioning:</b> mementos written to disk (save files, autosave) outlive code versions. Add a version number and a migration path; never use raw Java serialization of internal classes for long-term storage — prefer explicit formats (JSON/Protobuf).</p>
<p><b>Consistency:</b> taking a snapshot while another thread mutates the originator gives a torn state. Synchronize <code>save()</code>/<code>restore()</code> with mutators, or snapshot immutable state atomically (swap an <code>AtomicReference&lt;State&gt;</code>). Databases solve this at scale with MVCC snapshots and point-in-time recovery — the same idea.</p>
<p><b>Restore side effects:</b> restoring fields does not undo external effects (emails sent, payments made). Memento rolls back <i>in-memory state only</i> — say this explicitly in interviews.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI coding agents need checkpoints. Tools like Claude Code snapshot files before edits so you can rewind; agent frameworks persist the conversation/graph state after each step (a memento) so a run can resume or be "time-travelled" back to a previous step for debugging. Same pattern: opaque snapshots, a caretaker (checkpointer), restore on demand.</p>
<p><b>Use AI as a partner:</b> ask for a test that saves, mutates every field (including nested collections), restores, and asserts deep equality — it catches shallow-copy bugs instantly. <b>Where AI goes wrong:</b> generates public getters/setters for everything, stores references to mutable lists, forgets the empty-history case. <b>What you own:</b> deciding snapshot vs command, memory budget, and what "restore" cannot undo.</p>`,
    problems: [{
      title: 'Game Checkpoints with Named Slots', level: 'Easy', tags: ['memento', 'encapsulation'], companies: ['EA', 'Ubisoft', 'Zynga'],
      statement: `<p>A <code>Player</code> has health, position (x, y) and an inventory list. Implement <code>CheckpointManager</code> supporting <code>save(name)</code>, <code>load(name)</code> and <code>list()</code>, with at most <b>3 named slots</b> (saving a 4th evicts the oldest). Loading a missing slot fails safely. The manager must <b>not</b> be able to read or modify the player's fields, and later changes to the player must not affect saved slots.</p>`,
      constraints: `Inventory up to 100 items. Names are unique; saving to an existing name overwrites it (and makes it the newest).`,
      example: `<p>hp=100 at (0,0) inv=[map] → save("start"). Move to (5,2), pick "key", hp=60 → save("door"). hp=0 → load("door") → ${H.c('g', 'hp=60 at (5,2) inv=[map,key]')}. load("start") → ${H.c('g', 'hp=100 at (0,0) inv=[map]')}. load("boss") → ${H.c('r', 'false, nothing changes')}.</p>`,
      brute: { why: `<p>The manager reads public fields of <code>Player</code> and stores them in parallel maps, then writes them back. Encapsulation is broken (anyone can set hp), every new player field must be added to the manager, and the inventory map stores the <b>same list reference</b> — picking up items after saving corrupts the save.</p>`, code: `class OpenPlayer { public int hp = 100, x, y; public List<String> inv = new ArrayList<>(); }
class NaiveCheckpoints {
    final Map<String, int[]> nums = new HashMap<>();
    final Map<String, List<String>> invs = new HashMap<>();
    void save(String name, OpenPlayer p) {
        nums.put(name, new int[]{p.hp, p.x, p.y});
        invs.put(name, p.inv);                     // BUG: same list object, not a copy
    }
    void load(String name, OpenPlayer p) {
        int[] v = nums.get(name);                  // NPE if missing
        p.hp = v[0]; p.x = v[1]; p.y = v[2]; p.inv = invs.get(name);
    }
}` },
      mcq: { q: 'Where should the code that copies the inventory list live?', options: ['In Player.save() — the originator decides how to snapshot itself', 'In CheckpointManager.save()', 'In the inventory item class', 'Nowhere; references are fine'], answer: 0, explain: 'Only the originator knows its internals and which parts are mutable; it builds a self-contained memento. The caretaker just stores it.' },
      hints: [`<p>Hint 1: Player creates a <code>Player.Memento</code> (nested, private fields) and has <code>restore(Memento)</code>.</p>`, `<p>Hint 2: Caretaker = <code>LinkedHashMap&lt;String, Player.Memento&gt;</code>. Re-inserting a name: remove then put so it becomes newest. Evict the first entry when size &gt; 3.</p>`, `<p>Hint 3: Copy the inventory with <code>List.copyOf</code> on save and copy again on restore (so the player cannot mutate the memento's list). <code>load</code> returns boolean for missing slots.</p>`],
      solution: {
        approach: `<p>Player is the originator: <code>createMemento()</code> returns an immutable nested <code>Memento</code> with private fields and a defensive copy of the inventory; <code>restore(m)</code> copies everything back. The caretaker <code>CheckpointManager</code> keeps a <code>LinkedHashMap</code> in insertion order to evict the oldest slot. It only ever handles <code>Player.Memento</code> as an opaque value — no access to hp or position.</p>`,
        code: `class Player {
    private int hp = 100, x, y;
    private final List<String> inventory = new ArrayList<>();

    void move(int dx, int dy) { x += dx; y += dy; }
    void damage(int d) { hp = Math.max(0, hp - d); }
    void pick(String item) { inventory.add(item); }
    @Override public String toString() { return "hp=" + hp + " at (" + x + "," + y + ") inv=" + inventory; }

    static final class Memento {
        private final int hp, x, y; private final List<String> inventory;
        private Memento(int hp, int x, int y, List<String> inv) { this.hp = hp; this.x = x; this.y = y; this.inventory = inv; }
    }
    Memento createMemento() { return new Memento(hp, x, y, List.copyOf(inventory)); }
    void restore(Memento m) {
        hp = m.hp; x = m.x; y = m.y;
        inventory.clear(); inventory.addAll(m.inventory);
    }
}

class CheckpointManager {
    private static final int MAX = 3;
    private final LinkedHashMap<String, Player.Memento> slots = new LinkedHashMap<>();

    void save(String name, Player p) {
        slots.remove(name);                            // overwrite => becomes newest
        slots.put(name, p.createMemento());
        if (slots.size() > MAX) {
            String oldest = slots.keySet().iterator().next();
            slots.remove(oldest);
        }
    }
    boolean load(String name, Player p) {
        Player.Memento m = slots.get(name);
        if (m == null) return false;
        p.restore(m);
        return true;
    }
    List<String> list() { return new ArrayList<>(slots.keySet()); }

    public static void main(String[] args) {
        Player p = new Player(); p.pick("map");
        CheckpointManager cm = new CheckpointManager();
        cm.save("start", p);
        p.move(5, 2); p.pick("key"); p.damage(40);
        cm.save("door", p);
        p.damage(100);
        cm.load("door", p);  System.out.println(p);    // hp=60 at (5,2) inv=[map, key]
        cm.load("start", p); System.out.println(p);    // hp=100 at (0,0) inv=[map]
        System.out.println(cm.load("boss", p) + " " + cm.list());
    }
}`,
        complexity: `<p>save: O(inventory size) for the copy; load: O(inventory size); list: O(slots). Memory O(slots × state size).</p>`,
        followUps: ['Persist slots to disk across game versions — what would you add? (version field + migration)', 'The world map is 50 MB — how do you avoid copying it per save? (deltas / immutable chunks)', 'Add autosave every 5 minutes without blocking the game thread']
      }
    }]
  });

  /* ======================= TOPIC 10: VISITOR ======================= */
  topics.push({
    title: 'Visitor: Add New Operations Without Touching the Classes',
    analogy: `<p>A <b>house</b> has a kitchen, bedrooms and a garden. Different experts <i>visit</i> it: an <b>electrician</b> checks the wiring in each room, a <b>painter</b> quotes for each wall, a <b>tax assessor</b> values each room. The rooms never change to accommodate a new expert — each expert brings their own know-how for "what to do in a kitchen" and "what to do in a garden". The room just says "come in" (<i>accept</i>), and the visitor does its job there.</p>`,
    explain: `<p><b>Visitor in one line:</b> when you have a <b>stable set of element classes</b> (e.g. expression nodes, file-system entries, shapes) but keep adding <b>new operations</b> over them (evaluate, print, export, validate, compute size), put each operation in its own <b>visitor class</b> with one <code>visitX</code> method per element type. Each element has a single <code>accept(visitor)</code> method that calls back the right <code>visitX</code>.</p>
${H.table(['Role', 'Job', 'Expression example'], [
  ['<b>Element</b> (interface)', '<code>accept(Visitor v)</code>', '<code>Expr</code>'],
  ['<b>Concrete elements</b>', '<code>accept</code> calls <code>v.visitMe(this)</code>', '<code>Num</code>, <code>Add</code>, <code>Sub</code>, <code>Mul</code>'],
  ['<b>Visitor</b> (interface)', 'One method per element type', '<code>visitNum</code>, <code>visitAdd</code>, <code>visitSub</code>, <code>visitMul</code>'],
  ['<b>Concrete visitors</b>', 'One operation each', '<code>EvalVisitor</code>, <code>PrintVisitor</code>, <code>CountVisitor</code>']
])}
<p><b>The naive way:</b> either (a) add a method for every operation to every class (<code>eval()</code>, <code>print()</code>, <code>toJson()</code>, <code>typeCheck()</code>…) so node classes bloat with unrelated concerns and each new operation edits every class; or (b) write <code>if (e instanceof Add) … else if (e instanceof Mul) …</code> in each operation, and when a new node type appears you silently forget one of the ten instanceof chains. ${H.c('r', 'Operations are scattered or unchecked.')}</p>
<p><b>Why <code>accept</code>? Double dispatch.</b> Java picks an overloaded method by the <i>compile-time</i> type. Given <code>Expr e</code>, calling <code>visitor.visit(e)</code> cannot know e is an <code>Add</code>. So we bounce: <code>e.accept(v)</code> dispatches on the <b>element's runtime type</b> (first dispatch), and inside <code>Add.accept</code> the call <code>v.visitAdd(this)</code> dispatches on the <b>visitor's runtime type</b> (second dispatch). Two virtual calls = the exact (element, operation) pair.</p>
<p><b>The trade-off (say it in interviews):</b> Visitor makes <b>adding operations easy</b> (new class) but <b>adding element types hard</b> (every visitor needs a new method). Use it when types are stable and operations grow — compilers (AST passes), document exporters, file-system tools. Modern Java 21 offers a lighter alternative: <b>sealed interfaces + pattern-matching switch</b>, where the compiler checks exhaustiveness.</p>`,
    clues: [
      '"Perform <b>many different operations</b> over a <b>fixed hierarchy</b> of objects" (AST, shapes, file system, insurance products) → Visitor.',
      '"Add new operations <b>without modifying the element classes</b>" → Visitor by definition.',
      '"Export the same structure as JSON, XML and PDF", "compute area, perimeter and draw for all shapes" → one visitor per output/operation.',
      'Code with repeated <code>instanceof</code> ladders over the same set of classes → Visitor or sealed + switch.',
      '"Compiler / interpreter / linter / query planner" questions → tree walked by visitors (type checker, optimiser, code generator).',
      'Warning clue: "new element types are added every week" → Visitor is the <i>wrong</i> choice; prefer polymorphic methods on the elements.'
    ],
    code: [{ lang: 'java', title: 'Classic Visitor with double dispatch and generic results', code: `interface ExprVisitor<R> {
    R visitNum(Num n);
    R visitAdd(Add a);
    R visitSub(Sub s);
    R visitMul(Mul m);
}

interface Expr { <R> R accept(ExprVisitor<R> v); }

// Each accept() is one line: "visitor, here is me, with my exact type".
record Num(int value) implements Expr { public <R> R accept(ExprVisitor<R> v) { return v.visitNum(this); } }
record Add(Expr l, Expr r) implements Expr { public <R> R accept(ExprVisitor<R> v) { return v.visitAdd(this); } }
record Sub(Expr l, Expr r) implements Expr { public <R> R accept(ExprVisitor<R> v) { return v.visitSub(this); } }
record Mul(Expr l, Expr r) implements Expr { public <R> R accept(ExprVisitor<R> v) { return v.visitMul(this); } }

// Operation 1: evaluate
class EvalVisitor implements ExprVisitor<Integer> {
    public Integer visitNum(Num n) { return n.value(); }
    public Integer visitAdd(Add a) { return a.l().accept(this) + a.r().accept(this); }
    public Integer visitSub(Sub s) { return s.l().accept(this) - s.r().accept(this); }
    public Integer visitMul(Mul m) { return m.l().accept(this) * m.r().accept(this); }
}
// Operation 2: pretty-print. Added later, ZERO changes to Num/Add/Sub/Mul.
class PrintVisitor implements ExprVisitor<String> {
    public String visitNum(Num n) { return String.valueOf(n.value()); }
    public String visitAdd(Add a) { return "(" + a.l().accept(this) + " + " + a.r().accept(this) + ")"; }
    public String visitSub(Sub s) { return "(" + s.l().accept(this) + " - " + s.r().accept(this) + ")"; }
    public String visitMul(Mul m) { return a(m.l()) + " * " + a(m.r()); }
    private String a(Expr e) { return e.accept(this); }
}
// Operation 3: count nodes by type (a visitor can also accumulate state)
class CountVisitor implements ExprVisitor<Void> {
    final Map<String, Integer> counts = new TreeMap<>();
    private Void bump(String k) { counts.merge(k, 1, Integer::sum); return null; }
    public Void visitNum(Num n) { return bump("Num"); }
    public Void visitAdd(Add a) { a.l().accept(this); a.r().accept(this); return bump("Add"); }
    public Void visitSub(Sub s) { s.l().accept(this); s.r().accept(this); return bump("Sub"); }
    public Void visitMul(Mul m) { m.l().accept(this); m.r().accept(this); return bump("Mul"); }
}

class VisitorDemo {
    public static void main(String[] args) {
        Expr e = new Mul(new Add(new Num(2), new Num(3)), new Sub(new Num(7), new Num(4)));   // (2+3)*(7-4)
        System.out.println(e.accept(new PrintVisitor()) + " = " + e.accept(new EvalVisitor()));
        CountVisitor c = new CountVisitor();
        e.accept(c);
        System.out.println(c.counts);
    }
}` }, { lang: 'java', title: 'Java 21 alternative: sealed types + pattern-matching switch', code: `// The compiler knows ALL subtypes of a sealed interface, so the switch must be exhaustive.
sealed interface Shape permits Circle, Rect, Triangle {}
record Circle(double r) implements Shape {}
record Rect(double w, double h) implements Shape {}
record Triangle(double b, double h) implements Shape {}

class ShapeOps {
    // Each "visitor" is just a function with a switch. No accept() boilerplate.
    static double area(Shape s) {
        return switch (s) {
            case Circle c   -> Math.PI * c.r() * c.r();
            case Rect r     -> r.w() * r.h();
            case Triangle t -> 0.5 * t.b() * t.h();
        };   // add a new Shape and this stops compiling until you handle it: safe!
    }
    static String svg(Shape s) {
        return switch (s) {
            case Circle c   -> "<circle r='" + c.r() + "'/>";
            case Rect r     -> "<rect width='" + r.w() + "' height='" + r.h() + "'/>";
            case Triangle t -> "<polygon base='" + t.b() + "'/>";
        };
    }
    public static void main(String[] args) {
        List<Shape> shapes = List.of(new Circle(1), new Rect(2, 3), new Triangle(4, 5));
        for (Shape s : shapes) System.out.printf("%.2f %s%n", area(s), svg(s));
    }
}` }],
    codeTitle: ['Classic Visitor', 'Sealed + switch (modern alternative)'],
    viz: {
      title: 'Visitor: double dispatch walking (2+3)*(7-4)',
      input: 'eval',
      inputLabel: 'Visitor to run: eval | print | count',
      gen: function (input) {
        var kind = pick(input, { eval: 'eval', print: 'print', count: 'count' }, 'Type eval, print or count');
        var arr = ['*', '+', '-', 2, 3, 7, 4];
        var TYPE = { '*': 'Mul', '+': 'Add', '-': 'Sub' };
        var VIS = { eval: 'EvalVisitor', print: 'PrintVisitor', count: 'CountVisitor' }[kind];
        var frames = [], res = {}, calls = [], counts = {}, done = {};
        var nodes = [B('EL', '«Expr» accept(v)', 25, 8), B('NUM', 'Num', 8, 34), B('ADD', 'Add', 25, 34), B('MUL', 'Mul', 42, 34), B('VI', '«ExprVisitor»', 78, 8), B('EV', 'EvalVisitor', 62, 34), B('PV', 'PrintVisitor', 80, 34), B('CV', 'CountVisitor', 96, 34)];
        var edges = [['NUM', 'EL'], ['ADD', 'EL'], ['MUL', 'EL'], ['EV', 'VI'], ['PV', 'VI'], ['CV', 'VI'], ['EL', 'VI', 'accept(v) → v.visitX(this)']];
        var vid = { eval: 'EV', print: 'PV', count: 'CV' }[kind];
        var sh = { EL: 'sel', VI: 'sel' }; sh[vid] = 'cur';
        frames.push(F('<b>Two hierarchies.</b> Left: the stable element classes (Expr nodes). Right: operations as visitors. Each element\'s <code>accept(v)</code> is one line: <code>return v.visitMe(this);</code>. We will run <b>' + VIS + '</b> over the tree.',
          [G('Elements and visitors', nodes, edges, { h: 50, hl: sh }), { type: 'tree', label: 'Expression tree: (2 + 3) * (7 - 4)', arr: arr }]));
        var walk = function (i, depth) {
          var v = arr[i], isOp = typeof v === 'string', t = isOp ? TYPE[v] : 'Num';
          var h = clone(done); h[i] = 'cur';
          calls.push(t + '.accept');
          frames.push(F('Call <code>node.accept(' + VIS + ')</code> on <b>' + v + '</b>. Dispatch #1 (on the element): the runtime type is <b>' + t + '</b>, so <code>' + t + '.accept</code> runs and immediately calls <code>v.visit' + t + '(this)</code> — dispatch #2 (on the visitor) picks <b>' + VIS + '.visit' + t + '</b>.',
            [{ type: 'tree', label: 'Expression tree', arr: arr, hl: h }, STACK('call stack', calls.slice(), (function () { var x = {}; x[calls.length - 1] = 'cur'; return x; })()), CODE(t + '.accept', 'public <R> R accept(ExprVisitor<R> v) {\n  return v.visit' + t + '(this);\n}', { 2: 'cur' })]));
          var out;
          if (isOp) {
            var a = walk(2 * i + 1, depth + 1), b = walk(2 * i + 2, depth + 1);
            if (kind === 'eval') out = v === '+' ? a + b : v === '-' ? a - b : a * b;
            else if (kind === 'print') out = v === '*' ? a + ' * ' + b : '(' + a + ' ' + v + ' ' + b + ')';
            else { counts[t] = (counts[t] || 0) + 1; out = null; }
          } else {
            if (kind === 'eval') out = v; else if (kind === 'print') out = String(v); else { counts.Num = (counts.Num || 0) + 1; out = null; }
          }
          calls.pop();
          res[i] = out; done[i] = 'ok';
          var h2 = clone(done); h2[i] = 'sel';
          var vals = kind === 'count' ? clone(counts) : (function () { var o = {}; o['result of ' + v] = out; return o; })();
          frames.push(F(VIS + '.visit' + t + '(' + v + ') ' + (isOp ? 'already visited both children (each via <code>child.accept(this)</code>) and ' : '') +
            (kind === 'eval' ? 'returns <b>' + out + '</b>.' : kind === 'print' ? 'returns <b>"' + out + '"</b>.' : 'increments the counter for <b>' + t + '</b> (this visitor accumulates state instead of returning).'),
            [{ type: 'tree', label: 'Expression tree (green = finished)', arr: arr, hl: h2 }, STACK('call stack', calls.length ? calls.slice() : ['(empty)']), VARS(kind === 'count' ? 'CountVisitor.counts' : 'returned value', vals, {})]));
          return out;
        };
        var result = walk(0, 0);
        frames.push(F('Done. ' + (kind === 'eval' ? 'Value = <b>' + result + '</b>.' : kind === 'print' ? 'Printed: <b>' + result + '</b>.' : 'Counts: ' + JSON.stringify(counts) + '.') + ' Adding a 4th operation (e.g. <code>ToJsonVisitor</code>) = one new class; Num/Add/Sub/Mul never change. But adding a new node type (Div) would force a new method into <b>every</b> visitor — the Visitor trade-off.',
          [G('Elements and visitors', nodes, edges, { h: 50, hl: sh }), { type: 'table', label: 'Visitor trade-off', columns: ['Change', 'Cost with Visitor'], rows: [['New operation', '1 new class'], ['New element type', 'edit every visitor']], hl: { 0: 'sel' } }]));
        return frames;
      }
    },
    examples: [
      { title: 'Compilers and linters', html: `<p><code>javac</code>'s annotation processing API (<code>ElementVisitor</code>, <code>TypeVisitor</code>), ANTLR-generated parse-tree visitors and Java's <code>FileVisitor</code> all use this pattern. A compiler has a fixed set of AST node types and many passes: name resolution, type checking, constant folding, code generation — each pass is a visitor.</p>` },
      { title: 'Files.walkFileTree — a JDK visitor', html: `<p>The JDK walks a directory tree and calls your <code>FileVisitor</code> at each event: <code>preVisitDirectory</code>, <code>visitFile</code>, <code>visitFileFailed</code>, <code>postVisitDirectory</code>. Counting files, deleting a tree or copying it are different visitors over the same walk.</p>`, code: `import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
Path dir = Files.createTempDirectory("demo");
Files.writeString(dir.resolve("a.txt"), "hello");
Files.writeString(dir.resolve("b.log"), "world!");
long[] total = {0};
Files.walkFileTree(dir, new SimpleFileVisitor<Path>() {
    @Override public FileVisitResult visitFile(Path f, BasicFileAttributes attrs) {
        total[0] += attrs.size();
        return FileVisitResult.CONTINUE;
    }
});
System.out.println("bytes = " + total[0]);   // 11` },
      { title: 'Insurance / tax over product types', html: `<p>A cart contains <code>Book</code>, <code>Electronics</code> and <code>Food</code>. Finance asks for tax, logistics for shipping weight, marketing for loyalty points — three visitors. Each visitor keeps its rules together (all tax rules in <code>TaxVisitor</code>) instead of spreading <code>tax()</code>, <code>shippingWeight()</code>, <code>points()</code> across every product class.</p>` },
      { title: 'Choosing: polymorphism vs Visitor vs sealed switch', html: `<p><b>Methods on elements</b> (plain polymorphism): best when <i>types</i> are added often and operations are few and core to the type. <b>Visitor</b>: best when types are stable and operations are many and owned by different teams. <b>Sealed + switch</b> (Java 21): same benefits as Visitor with far less code and compiler-checked exhaustiveness, but the operation logic sits in functions rather than objects (harder to pass around state or swap at runtime). This is the "expression problem" — no option makes both directions free.</p>` }
    ],
    deepDive: `<p><b>Double dispatch explained precisely:</b> Java does <i>single dispatch</i> on the receiver's runtime type and <i>static</i> overload resolution on argument types. <code>visitor.visit(expr)</code> with overloads <code>visit(Add)</code>/<code>visit(Mul)</code> would fail to compile (or pick <code>visit(Expr)</code>) because <code>expr</code> is statically <code>Expr</code>. <code>accept</code> converts the element's runtime type into a static type inside its own class (<code>this</code> is <code>Add</code> there), so the right overload is chosen at compile time in each <code>accept</code>.</p>
<p><b>Who traverses?</b> Options: the visitor (as in EvalVisitor recursing into children — flexible, e.g. short-circuiting), the elements' <code>accept</code> (always visits children — uniform, but less control), or an external iterator. Pick one and be consistent, or you visit nodes twice.</p>
<p><b>Encapsulation cost:</b> visitors need access to element data, so elements often expose getters they would otherwise hide. Records make this explicit and acceptable for data-centric trees.</p>
<p><b>Acyclic / default visitors:</b> to soften "new type breaks all visitors", provide an abstract base visitor with default implementations (e.g. <code>visitDiv</code> falls back to <code>visitDefault</code>) — but then the compiler no longer forces you to handle new types. Sealed + exhaustive switch keeps the safety; with <code>default</code> branches you lose it again.</p>
<p><b>Generic return types</b> (<code>ExprVisitor&lt;R&gt;</code>) avoid mutable accumulator fields and make visitors reusable and thread-safe; use <code>Void</code> visitors for side-effect passes. <b>Performance:</b> two virtual calls per node — negligible; deep trees may need an explicit stack instead of recursion.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI is great at generating the boilerplate that made Visitor painful (one <code>accept</code> per class, one <code>visitX</code> per type) — but in Java 21 you should often ask it for the <b>sealed interface + switch</b> version instead, which is shorter and compiler-checked. AI tools that transform code (codemods, refactoring agents) themselves walk ASTs with visitors (e.g. JavaParser, OpenRewrite recipes) — knowing the pattern helps you review those recipes.</p>
<p><b>Where AI goes wrong:</b> it writes <code>instanceof</code> ladders with a silent <code>else</code>, uses overloads expecting runtime dispatch (the classic double-dispatch misunderstanding), or adds a <code>default</code> branch that hides unhandled new types. <b>What you own:</b> deciding which axis (types or operations) will change, and choosing polymorphism, Visitor or sealed switch accordingly.</p>`,
    problems: [{
      title: 'File System Analyzer (size, search, tree print)', level: 'Hard', tags: ['visitor', 'composite'], companies: ['Dropbox', 'Google', 'Box'],
      statement: `<p>A file system has <code>FileNode(name, sizeBytes)</code> and <code>DirNode(name, children)</code>. Product keeps asking for new operations: <b>total size</b>, <b>find all files with extension X</b>, <b>print an indented tree</b>, and next month "largest file", "count empty directories". Design so each new operation is a new class and the node classes never change. Every operation must handle nested directories of any depth.</p>`,
      constraints: `Up to 10<sup>5</sup> nodes, depth up to 100. The set of node types (file, directory) is stable; operations grow.`,
      example: `<p>root/{ a.txt(100), docs/{ b.md(50), c.txt(25) }, empty/{} }<br>size → ${H.c('g', '175')}; find ".txt" → ${H.c('g', '[root/a.txt, root/docs/c.txt]')}; tree print → root, ··a.txt, ··docs, ····b.md, ····c.txt, ··empty. Three operations, same two node classes.</p>`,
      brute: { why: `<p>Each operation is a static method with <code>if (n instanceof FileNode) … else if (n instanceof DirNode) …</code> and its own recursion. Five operations = five copies of the type check and traversal; adding a <code>SymlinkNode</code> means hunting through all of them — and forgetting one compiles fine and silently returns wrong results (the <code>else</code> swallows it).</p>`, code: `class NaiveFs {
    record FileN(String name, long size) {}
    record DirN(String name, List<Object> kids) {}
    static long size(Object n) {
        if (n instanceof FileN f) return f.size();
        else if (n instanceof DirN d) { long s = 0; for (Object k : d.kids()) s += size(k); return s; }
        return 0;                                   // silently ignores unknown types
    }
    static void find(Object n, String ext, List<String> out) {
        if (n instanceof FileN f) { if (f.name().endsWith(ext)) out.add(f.name()); }
        else if (n instanceof DirN d) for (Object k : d.kids()) find(k, ext, out);   // traversal copy #2
    }
}` },
      mcq: { q: 'Next quarter a new node type SymlinkNode is added. What is the cost with the Visitor design?', options: ['Add visitSymlink to the visitor interface; every existing visitor must implement it (the compiler lists them)', 'Nothing changes', 'Only the SymlinkNode class is added', 'All file and dir classes must change'], answer: 0, explain: 'Visitor makes new operations cheap and new element types expensive — but the compiler points to every visitor that must be updated, unlike instanceof chains that fail silently.' },
      hints: [`<p>Hint 1: Nodes are stable, operations grow → Visitor. Nodes get <code>accept(FsVisitor v)</code>; the visitor has <code>visitFile</code> and <code>visitDir</code>.</p>`, `<p>Hint 2: Let the visitor control traversal in <code>visitDir</code> (loop over children calling <code>child.accept(this)</code>), so each visitor can track depth or path, or stop early.</p>`, `<p>Hint 3: Track the current path with a <code>Deque&lt;String&gt;</code> (push on enter dir, pop on exit). Size visitor accumulates a long; find visitor collects paths; print visitor uses depth for indentation.</p>`],
      solution: {
        approach: `<p>Node classes (<code>FileNode</code>, <code>DirNode</code>) implement <code>FsNode.accept(FsVisitor)</code>. Each operation is a visitor: <code>SizeVisitor</code> sums file sizes; <code>FindVisitor</code> tracks the current path with a deque and collects matches; <code>TreePrinter</code> tracks depth. Visitors drive traversal in <code>visitDir</code>, so they share no traversal bugs with each other and can add path/depth tracking. Adding "largest file" is one more ~10-line class; node classes are untouched.</p>`,
        code: `interface FsVisitor { void visitFile(FileNode f); void visitDir(DirNode d); }
interface FsNode { String name(); void accept(FsVisitor v); }

record FileNode(String name, long size) implements FsNode {
    public void accept(FsVisitor v) { v.visitFile(this); }
}
record DirNode(String name, List<FsNode> children) implements FsNode {
    public void accept(FsVisitor v) { v.visitDir(this); }
}

class SizeVisitor implements FsVisitor {
    long total;
    public void visitFile(FileNode f) { total += f.size(); }
    public void visitDir(DirNode d) { for (FsNode c : d.children()) c.accept(this); }
}

class FindVisitor implements FsVisitor {
    private final String ext; private final Deque<String> path = new ArrayDeque<>();
    final List<String> found = new ArrayList<>();
    FindVisitor(String ext) { this.ext = ext; }
    public void visitFile(FileNode f) {
        if (f.name().endsWith(ext)) found.add(String.join("/", path) + "/" + f.name());
    }
    public void visitDir(DirNode d) {
        path.addLast(d.name());
        for (FsNode c : d.children()) c.accept(this);
        path.removeLast();
    }
}

class TreePrinter implements FsVisitor {
    private int depth; final StringBuilder out = new StringBuilder();
    public void visitFile(FileNode f) { out.append("  ".repeat(depth)).append(f.name()).append(" (").append(f.size()).append(")\\n"); }
    public void visitDir(DirNode d) {
        out.append("  ".repeat(depth)).append(d.name()).append("/\\n");
        depth++;
        for (FsNode c : d.children()) c.accept(this);
        depth--;
    }
}

class FsDemo {
    public static void main(String[] args) {
        FsNode root = new DirNode("root", List.of(
            new FileNode("a.txt", 100),
            new DirNode("docs", List.of(new FileNode("b.md", 50), new FileNode("c.txt", 25))),
            new DirNode("empty", List.of())));
        SizeVisitor size = new SizeVisitor(); root.accept(size);
        FindVisitor find = new FindVisitor(".txt"); root.accept(find);
        TreePrinter tp = new TreePrinter(); root.accept(tp);
        System.out.println(size.total + " " + find.found);
        System.out.print(tp.out);
    }
}`,
        complexity: `<p>Each visitor is O(N) time over N nodes; extra space O(depth) for recursion/path. New operation = 1 class; node classes unchanged.</p>`,
        followUps: ['Depth can be 10<sup>5</sup> (deep nesting) — how do you avoid StackOverflowError? (explicit stack traversal)', 'Rewrite with a sealed interface + switch. What do you gain and lose?', 'Run SizeVisitor in parallel over huge directories (ForkJoin, per-subtree visitors merged)']
      }
    }]
  });

  /* ======================= TOPIC 11: CHOOSING & COMBINING ======================= */
  var PATTERN_CLUES = [
    { p: 'Strategy', k: ['algorithm', 'strategy', 'interchangeable', 'pricing', 'payment method', 'sort by', 'different ways', 'pluggable', 'policy', 'fare', 'discount', 'route', 'at runtime', 'choose'] },
    { p: 'Observer', k: ['notify', 'subscribe', 'subscriber', 'listener', 'alert', 'broadcast', 'follow', 'event', 'publish', 'whenever', 'channels'] },
    { p: 'Command', k: ['undo', 'redo', 'queue', 'macro', 'schedule', 'replay', 'button', 'job', 'retry', 'audit', 'history of actions'] },
    { p: 'State', k: ['state', 'status', 'lifecycle', 'mode', 'transition', 'phase', 'vending', 'cannot', 'once', 'after it is'] },
    { p: 'Template Method', k: ['same steps', 'skeleton', 'workflow', 'order of steps', 'hook', 'duplicate', 'recipe', 'common steps', 'every report', 'formats'] },
    { p: 'Chain of Responsibility', k: ['escalate', 'approve', 'approval', 'chain', 'middleware', 'filter', 'handler', 'pipeline', 'fallback', 'next level', 'limit'] },
    { p: 'Iterator', k: ['iterate', 'traverse', 'next', 'cursor', 'pagination', 'page', 'without exposing', 'one by one', 'walk through', 'collection'] },
    { p: 'Mediator', k: ['coordinate', 'chat room', 'tower', 'hub', 'central', 'many-to-many', 'group', 'dispatcher', 'talk to each other', 'interact'] },
    { p: 'Memento', k: ['snapshot', 'checkpoint', 'restore', 'save state', 'rollback', 'revert', 'save point', 'previous version'] },
    { p: 'Visitor', k: ['operations over', 'export', 'ast', 'new operations', 'without changing', 'double dispatch', 'compiler', 'every node', 'tax and shipping', 'element'] }
  ];
  topics.push({
    title: 'Which Pattern Fits? Choosing, Comparing and Combining',
    analogy: `<p>A <b>mechanic's toolbox</b> has ten tools. A good mechanic does not ask "how can I use the torque wrench today?" — they look at the problem (a loose bolt, a stuck nut) and the right tool picks itself. Requirements in an LLD interview contain <b>tell-tale words</b> the same way a symptom points a doctor to a diagnosis: "undo" → Command/Memento, "notify" → Observer, "status" → State.</p>`,
    explain: `<p><b>The one-page cheat sheet.</b> Every behavioral pattern answers one question about <i>who decides</i> and <i>who talks to whom</i>:</p>
${H.table(['Pattern', 'Problem it solves', 'Tell-tale words', 'Key Java shape'], [
  ['Strategy', 'Many ways to do one job, picked at runtime', 'pricing rules, payment methods, "pluggable"', 'context holds an interface; client sets it'],
  ['Observer', 'One change, many interested parties', 'notify, subscribe, alert, follow', 'subject keeps List&lt;Listener&gt;'],
  ['Command', 'Treat an action as data', 'undo/redo, queue, macro, log, retry', 'execute()/undo() + invoker stacks'],
  ['State', 'Behaviour depends on current mode', 'status, lifecycle, "cannot X after Y"', 'context delegates to state; states switch it'],
  ['Template Method', 'Same steps, a few differ', 'workflow, skeleton, duplicated sequence', 'final method in abstract base + hooks'],
  ['Chain of Resp.', 'Who handles it? pass it along', 'approval, escalate, middleware, filter', 'handler with next link'],
  ['Iterator', 'Walk a collection without its insides', 'traverse, next, paging, cursor', 'Iterable + hasNext()/next()'],
  ['Mediator', 'Many objects coordinate', 'chat room, tower, hub, dispatcher', 'colleagues know only the mediator'],
  ['Memento', 'Save and restore state privately', 'snapshot, checkpoint, rollback', 'originator creates opaque snapshot; caretaker stores'],
  ['Visitor', 'New operations over a fixed type set', 'export, AST, compute X for every element', 'accept(v) → v.visitX(this); or sealed + switch']
])}
<p><b>Look-alike pairs</b> interviewers love to ask about:</p>
<ul>
<li><b>Strategy vs State</b> — same class diagram. Strategy: the <i>client</i> chooses, strategies are independent. State: <i>states</i> switch the context to the next state.</li>
<li><b>Observer vs Mediator</b> — Observer broadcasts one-to-many without logic; Mediator coordinates many-to-many <i>with</i> rules in the middle.</li>
<li><b>Command vs Memento</b> for undo — Command reverses the <i>operation</i> (small, needs an inverse); Memento restores the <i>state</i> (works for anything, uses memory).</li>
<li><b>Template Method vs Strategy</b> — inheritance with a fixed skeleton vs composition swappable at runtime.</li>
<li><b>Chain of Responsibility vs Decorator</b> — both link objects; a chain may <i>stop</i> and is about <i>who handles</i>; a decorator always forwards and <i>adds</i> behaviour.</li>
<li><b>Iterator vs Visitor</b> — Iterator gives you elements one by one; Visitor brings an operation to each element (often while iterating).</li>
</ul>
<p><b>The golden rule:</b> start with the simplest code. Introduce a pattern when you can name the <b>axis of change</b> it protects ("pricing rules change monthly"). Patterns without a reason are over-engineering — interviewers penalise that too.</p>`,
    clues: [
      'Listen for verbs: <b>notify</b> → Observer, <b>undo</b> → Command/Memento, <b>escalate/approve</b> → Chain, <b>traverse</b> → Iterator, <b>coordinate</b> → Mediator.',
      'Listen for nouns: <b>status / lifecycle</b> → State, <b>rule / policy / algorithm</b> → Strategy, <b>snapshot / checkpoint</b> → Memento, <b>AST / export formats</b> → Visitor.',
      '"Same steps but X differs" → Template Method (or Strategy if X must change at runtime).',
      '"Easy to add new <b>types</b>" → polymorphism/Strategy; "easy to add new <b>operations</b> over fixed types" → Visitor.',
      'Machine-coding rounds almost always combine 2–4 patterns: e.g. Elevator = State + Strategy (scheduling) + Observer (displays) + Command (requests).',
      'If the requirement has none of these signals, the right answer is often "no pattern — a simple class is enough", said with a reason.'
    ],
    code: [{ lang: 'java', title: 'Patterns combined: order workflow (State + Observer + Strategy + Command)', code: `// Strategy: how shipping cost is computed
interface ShippingPolicy { long cost(long weightGrams); }

// Observer: who hears about status changes
interface OrderEvents { void statusChanged(String orderId, String from, String to); }

// State: what each action means in each status (table-driven to stay short)
enum Status {
    NEW, PAID, SHIPPED, CANCELLED;
    Status on(String action) {
        return switch (this) {
            case NEW -> switch (action) { case "pay" -> PAID; case "cancel" -> CANCELLED; default -> null; };
            case PAID -> switch (action) { case "ship" -> SHIPPED; case "cancel" -> CANCELLED; default -> null; };
            default -> null;                                   // SHIPPED, CANCELLED: terminal here
        };
    }
}

class OrderWorkflow {
    private final String id; private Status status = Status.NEW;
    private final ShippingPolicy shipping;
    private final List<OrderEvents> listeners = new CopyOnWriteArrayList<>();
    private final Deque<Runnable> undoLog = new ArrayDeque<>();          // Command: reversible steps

    OrderWorkflow(String id, ShippingPolicy shipping) { this.id = id; this.shipping = shipping; }
    void subscribe(OrderEvents l) { listeners.add(l); }

    synchronized void act(String action) {
        Status next = status.on(action);
        if (next == null) throw new IllegalStateException("cannot " + action + " in " + status);
        Status prev = status;
        status = next;
        undoLog.push(() -> status = prev);                                 // command to revert
        listeners.forEach(l -> l.statusChanged(id, prev.name(), next.name()));
    }
    synchronized void undo() { if (!undoLog.isEmpty()) undoLog.pop().run(); }
    long quote(long grams) { return shipping.cost(grams); }
    Status status() { return status; }

    public static void main(String[] args) {
        OrderWorkflow o = new OrderWorkflow("A1", g -> 40 + g / 100);         // strategy as lambda
        o.subscribe((id, f, t) -> System.out.println("email: " + id + " " + f + " -> " + t));
        o.subscribe((id, f, t) -> System.out.println("analytics: " + t));
        o.act("pay"); o.act("ship");
        try { o.act("cancel"); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }
        o.undo();
        System.out.println(o.status() + ", shipping quote " + o.quote(2500));
    }
}` }],
    codeTitle: ['Combining patterns'],
    viz: {
      title: 'Clue detector: which pattern does this requirement hint at?',
      input: 'When an order ships, notify the customer by email and SMS, and let new channels subscribe later',
      inputLabel: 'Type a requirement sentence (try: "support undo and redo", "expense needs approval by the next level")',
      gen: function (input) {
        var text = String(input === undefined ? '' : input).toLowerCase().replace(/\s+/g, ' ').trim();
        if (text.length < 8) throw new Error('Type a requirement sentence of at least 8 characters');
        if (text.length > 300) throw new Error('Keep it under 300 characters');
        var frames = [], scores = [], rows = [];
        frames.push(F('Requirement: <i>"' + esc(text) + '"</i>. We scan it for the tell-tale words of each of the 10 behavioral patterns — the same mental scan you do in an interview before drawing any class.',
          [TXT('<b>Requirement:</b> ' + esc(text), 'Input'), { type: 'bars', label: 'scores so far', values: PATTERN_CLUES.map(function () { return 0; }), idxLabels: PATTERN_CLUES.map(function (c) { return c.p.split(' ')[0]; }) }]));
        PATTERN_CLUES.forEach(function (c, i) {
          var hits = c.k.filter(function (w) { return text.indexOf(w) >= 0; });
          scores.push(hits.length);
          rows.push([c.p, hits.length ? hits.join(', ') : '—', String(hits.length)]);
          var hl = {}; hl[i] = hits.length ? 'ok' : 'cur';
          var th = {}; th[rows.length - 1] = hits.length ? 'sel' : '';
          frames.push(F('<b>' + c.p + '</b>: looking for ' + c.k.slice(0, 6).map(function (w) { return '"' + w + '"'; }).join(', ') + '… → ' + (hits.length ? H.c('g', hits.length + ' clue(s): ' + hits.join(', ')) : H.c('m', 'no clue words')) + '.',
            [{ type: 'bars', label: 'clue score per pattern', values: scores.concat(PATTERN_CLUES.slice(i + 1).map(function () { return 0; })), hl: hl, idxLabels: PATTERN_CLUES.map(function (c2) { return c2.p.split(' ')[0]; }) },
              { type: 'table', label: 'Evidence', columns: ['Pattern', 'Clues found', 'Score'], rows: rows.slice(), hl: th }]));
        });
        var best = Math.max.apply(null, scores);
        var winners = PATTERN_CLUES.filter(function (c, i) { return scores[i] === best && best > 0; }).map(function (c) { return c.p; });
        var hlb = {}; scores.forEach(function (s, i) { if (s === best && best > 0) hlb[i] = 'sel'; });
        var advice = best === 0 ? 'No strong signal. Ask clarifying questions ("will this vary?", "who needs to know?", "can it be undone?") — and remember that no pattern is a valid answer.'
          : winners.length > 1 ? 'Tie between <b>' + winners.join(' and ') + '</b>: real designs often <b>combine</b> them. Decide which one owns which part (e.g. Observer for "notify", Strategy for "which channel").'
          : 'Strongest signal: <b>' + winners[0] + '</b>. Confirm it by naming the axis of change it protects, then sketch its class diagram.';
        frames.push(F('Verdict. ' + advice + ' Keyword matching is only a first hint — always check the <b>intent</b> (who decides, who changes, who talks to whom).',
          [{ type: 'bars', label: 'final scores', values: scores, hl: hlb, idxLabels: PATTERN_CLUES.map(function (c) { return c.p.split(' ')[0]; }) },
            VARS('suggestion', { pick: winners.length ? winners.join(' + ') : 'clarify first', topScore: best }, { pick: 'sel' })]));
        return frames;
      }
    },
    examples: [
      { title: 'Elevator system: four patterns at once', html: `<p><b>State</b> for each car (Idle, MovingUp, MovingDown, DoorsOpen, Maintenance). <b>Strategy</b> for the scheduling algorithm (nearest car, SCAN/LOOK, zone-based) so it can be swapped. <b>Observer</b> so floor displays and the monitoring dashboard update on every move. <b>Command</b> for requests (hall call, car call) queued and possibly cancelled. Naming this combination clearly is often the difference between a "hire" and a "strong hire".</p>` },
      { title: 'Notification service', html: `<p>Producers publish events (<b>Observer</b>/pub-sub). Each user's preferred channel is a <b>Strategy</b> (push/SMS/email). If push fails, fall back SMS → email (<b>Chain of Responsibility</b>). Rendering each message follows the same steps per channel — load template, fill, localise, send — <b>Template Method</b>. You will build this in the Hard practice set.</p>` },
      { title: 'Text editor', html: `<p>Typing and formatting are <b>Commands</b> with undo/redo; expensive filters use <b>Memento</b> snapshots; the document is a tree walked by an <b>Iterator</b> for search and by <b>Visitors</b> for export (HTML, PDF, word count); the editor UI's toolbar, ruler and status bar coordinate through a <b>Mediator</b>; spell-check runs as an <b>Observer</b> of document changes.</p>` },
      { title: 'When the answer is "no pattern"', html: `<p>"Compute the GST on an invoice (single fixed 18% rule)." A Strategy interface with one implementation adds files and indirection with no benefit. Write a method, keep it tested, and say: "If more tax regimes appear, I would extract a TaxStrategy — the refactor is mechanical." That sentence shows judgement, which is what the interviewer is grading.</p>` }
    ],
    deepDive: `<p><b>Patterns as responses to change:</b> each behavioral pattern isolates one axis — Strategy (algorithm), State (mode), Observer (set of listeners), Command (when/whether an action runs), Chain (who handles), Iterator (traversal order), Mediator (interaction rules), Memento (history), Template Method (varying steps), Visitor (operations). Ask "what will change most often?" and isolate exactly that.</p>
<p><b>Language features have absorbed patterns:</b> lambdas make Strategy, Command and Observer one-liners; <code>Iterable</code>/streams are built-in Iterator; records + sealed interfaces + pattern-matching <code>switch</code> replace much of Visitor; enums with abstract methods give compact State/Strategy. In interviews, show the classic structure first (it communicates intent), then mention the idiomatic modern shortcut.</p>
<p><b>Costs to state honestly:</b> more classes and indirection (harder to follow control flow — especially Observer and Mediator, where "who reacts?" is implicit), memory (Memento, Command histories), and inheritance coupling (Template Method). Good engineers mention the cost alongside the benefit.</p>
<p><b>Testing angle:</b> every pattern here improves testability by isolating behaviour behind an interface — strategies, states, handlers and visitors can each be unit-tested alone; contexts are tested with fakes. This is a strong argument to use in interviews.</p>
<p><b>Scaling up:</b> in-process patterns have distributed twins — Observer → pub/sub (Kafka, SNS), Command → message queues and event sourcing, Mediator → orchestrators/sagas, Chain → API gateway filter chains, State → workflow engines (Temporal, Step Functions), Memento → snapshots/point-in-time recovery. Mentioning the twin shows you can connect LLD to HLD.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating pattern boilerplate is now nearly free, so the scarce skill is <b>choosing</b> — and defending the choice. A good workflow: describe the requirement and the axis of change to an assistant, ask for two alternative designs (e.g. State classes vs enum table) with trade-offs, then decide yourself.</p>
<p><b>AI systems themselves are built from these patterns:</b> tool calls are Commands; model routing is Strategy; guardrail stacks are Chains; streaming callbacks are Observers; supervisor agents are Mediators; checkpointers are Mementos; agent graphs are State machines. Recognising them lets you read agent frameworks quickly.</p>
<p><b>Where AI goes wrong:</b> pattern-stuffing (five patterns for a CRUD screen), or the opposite — a 300-line if/else ladder because it mirrors the prompt literally. <b>What you own:</b> the judgement call, the naming, and explaining "why this pattern, why not the alternative" out loud.</p>`
  });

  /* ======================= PRACTICE: EASY ======================= */
  practice.push({
    title: 'Sort Employees by Pluggable Criteria', level: 'Easy', tags: ['strategy', 'comparator'], companies: ['Amazon', 'Infosys', 'TCS'],
    statement: `<p>An HR screen has a dropdown "Sort by": <b>salary</b> (high → low), <b>name</b> (A → Z), <b>joined</b> (oldest first), <b>dept-then-salary</b> (dept A → Z, then salary high → low). Implement <code>EmployeeSorter.sort(List&lt;Employee&gt;, String key)</code>. More sort options will be added by other teams; they must not edit your sorting code. Unknown keys must fail with a clear message.</p>`,
    constraints: `Up to 10<sup>5</sup> employees. Sorting must be stable and O(N log N). Do not mutate the caller's list.`,
    example: `<p>[(Asha, ENG, 90, 2019), (Ben, OPS, 70, 2017), (Cy, ENG, 95, 2021)]<br>key = "salary" → ${H.c('g', 'Cy, Asha, Ben')}; key = "dept-then-salary" → ${H.c('g', 'Cy, Asha (ENG), Ben (OPS)')}; key = "age" → ${H.c('r', 'IllegalArgumentException: unknown sort key age')}.</p>`,
    brute: { why: `<p>A switch on the key with a hand-written bubble sort inside each case: four copies of an O(N²) loop, a new option means editing the switch, and a typo in one comparison only shows up for that option. The sorting <i>algorithm</i> and the <i>ordering rule</i> are welded together.</p>`, code: `class NaiveSorter {
    record Emp(String name, String dept, int salary, int joined) {}
    static void sort(List<Emp> a, String key) {
        for (int i = 0; i < a.size(); i++)
            for (int j = 0; j + 1 < a.size() - i; j++) {
                boolean swap;
                switch (key) {                                  // rule mixed into the algorithm
                    case "salary" -> swap = a.get(j).salary() < a.get(j + 1).salary();
                    case "name" -> swap = a.get(j).name().compareTo(a.get(j + 1).name()) > 0;
                    default -> swap = false;                    // unknown keys silently ignored
                }
                if (swap) { Emp t = a.get(j); a.set(j, a.get(j + 1)); a.set(j + 1, t); }
            }
    }
}` },
    mcq: { q: 'In Collections.sort(list, comparator), which part is the Strategy?', options: ['The Comparator', 'The List', 'The sort algorithm (TimSort)', 'The Employee class'], answer: 0, explain: 'The sorting algorithm is the fixed context; the comparator is the interchangeable rule plugged into it.' },
    hints: [`<p>Hint 1: Separate "how to sort" (library TimSort, stable, O(N log N)) from "what order" (a Comparator).</p>`, `<p>Hint 2: A <code>Map&lt;String, Comparator&lt;Employee&gt;&gt;</code> registry; other teams call <code>register(key, comparator)</code>.</p>`, `<p>Hint 3: Build comparators with <code>Comparator.comparing(...).thenComparing(...)</code> and <code>.reversed()</code>; copy the list before sorting; throw on unknown keys.</p>`],
    solution: {
      approach: `<p>The sort algorithm is fixed (List.sort, stable TimSort). Each ordering rule is a <code>Comparator</code> strategy stored in a registry keyed by the dropdown value. New options are added by registering, not by editing. Composite orders use <code>thenComparing</code>. The input list is copied so callers are not surprised.</p>`,
      code: `record Employee(String name, String dept, int salary, LocalDate joined) {}

class EmployeeSorter {
    private final Map<String, Comparator<Employee>> strategies = new HashMap<>();

    EmployeeSorter() {
        register("salary", Comparator.comparingInt(Employee::salary).reversed());
        register("name", Comparator.comparing(Employee::name));
        register("joined", Comparator.comparing(Employee::joined));
        register("dept-then-salary", Comparator.comparing(Employee::dept)
                .thenComparing(Comparator.comparingInt(Employee::salary).reversed()));
    }

    void register(String key, Comparator<Employee> c) { strategies.put(key, Objects.requireNonNull(c)); }

    List<Employee> sort(List<Employee> input, String key) {
        Comparator<Employee> c = strategies.get(key);
        if (c == null) throw new IllegalArgumentException("unknown sort key " + key);
        List<Employee> copy = new ArrayList<>(input);
        copy.sort(c);                                   // stable O(N log N)
        return copy;
    }

    public static void main(String[] args) {
        List<Employee> es = List.of(new Employee("Asha", "ENG", 90, LocalDate.of(2019, 1, 1)),
                new Employee("Ben", "OPS", 70, LocalDate.of(2017, 5, 1)),
                new Employee("Cy", "ENG", 95, LocalDate.of(2021, 3, 1)));
        EmployeeSorter s = new EmployeeSorter();
        s.sort(es, "dept-then-salary").forEach(e -> System.out.print(e.name() + " "));
        System.out.println();
        s.register("name-desc", Comparator.comparing(Employee::name).reversed());   // added by another team
        s.sort(es, "name-desc").forEach(e -> System.out.print(e.name() + " "));
    }
}`,
      complexity: `<p>O(N log N) time, O(N) extra space for the copy. Registering a strategy: O(1).</p>`,
      followUps: ['Let users combine any two keys at runtime (compose comparators)', 'How would you expose the available keys to the UI?']
    }
  });

  practice.push({
    title: 'Traffic Light Controller', level: 'Easy', tags: ['state'], companies: ['Siemens', 'Bosch', 'Uber'],
    statement: `<p>A traffic light cycles <b>RED (30s) → GREEN (25s) → YELLOW (5s) → RED</b>. Events: <code>timerExpired()</code> moves to the next colour; <code>pedestrianButton()</code> during GREEN switches immediately to YELLOW (ignored in other states); <code>emergency()</code> from any state goes to <b>FLASHING_RED</b>; <code>resume()</code> from FLASHING_RED goes to RED (ignored elsewhere). Expose <code>color()</code> and <code>duration()</code> of the current state.</p>`,
    constraints: `Single light, events come from one controller thread. Adding a new state (e.g. GREEN_ARROW) should touch only the states that lead to it.`,
    example: `<p>Start RED → timer → ${H.c('g', 'GREEN')} → pedestrian → ${H.c('y', 'YELLOW')} → timer → ${H.c('r', 'RED')} → emergency → ${H.c('r', 'FLASHING_RED')} → timer → stays FLASHING_RED → resume → ${H.c('r', 'RED')}.</p>`,
    brute: { why: `<p>A colour string plus a switch inside each of the four event methods. 4 states × 4 events = 16 cases spread across 4 methods; a new state means editing all four; an unhandled case silently does nothing or does the wrong thing.</p>`, code: `class NaiveLight {
    String color = "RED";
    void timerExpired() {
        switch (color) {
            case "RED" -> color = "GREEN";
            case "GREEN" -> color = "YELLOW";
            case "YELLOW" -> color = "RED";
            default -> { }
        }
    }
    void pedestrianButton() { if (color.equals("GREEN")) color = "YELLOW"; }
    void emergency() { color = "FLASHING_RED"; }
    void resume() { if (color.equals("FLASHING_RED")) color = "RED"; }
    // duration()? another switch...
}` },
    mcq: { q: 'Which state class should handle pedestrianButton() by changing to YELLOW?', options: ['GREEN only; other states inherit a "do nothing" default', 'Every state, with an if inside', 'The controller, with a switch', 'YELLOW'], answer: 0, explain: 'Only the state where the event matters overrides it. Defaults make other states ignore it safely.' },
    hints: [`<p>Hint 1: Each colour is a state with its own duration and its own reaction to each event.</p>`, `<p>Hint 2: An <code>enum Light</code> with constant-specific bodies is a compact State pattern: each constant overrides <code>onTimer()</code> etc. and returns the next state.</p>`, `<p>Hint 3: Default methods return <code>this</code> (ignore). <code>emergency()</code> is the same for all → implement once in the enum, not per constant.</p>`],
    solution: {
      approach: `<p>Use an enum as a compact State pattern: each constant knows its duration and overrides only the events it reacts to, returning the next state. Shared behaviour (emergency → FLASHING_RED) lives once in the enum body. The controller holds the current state and assigns whatever the state returns.</p>`,
      code: `enum Light {
    RED(30)    { Light onTimer() { return GREEN; } },
    GREEN(25)  { Light onTimer() { return YELLOW; } Light onPedestrian() { return YELLOW; } },
    YELLOW(5)  { Light onTimer() { return RED; } },
    FLASHING_RED(0) { Light onTimer() { return this; } Light onResume() { return RED; } };

    final int seconds;
    Light(int seconds) { this.seconds = seconds; }
    abstract Light onTimer();
    Light onPedestrian() { return this; }            // default: ignore
    Light onResume() { return this; }                // default: ignore
    Light onEmergency() { return FLASHING_RED; }     // same for every state
}

class TrafficController {
    private Light state = Light.RED;
    void timerExpired()     { state = state.onTimer(); }
    void pedestrianButton() { state = state.onPedestrian(); }
    void emergency()        { state = state.onEmergency(); }
    void resume()           { state = state.onResume(); }
    String color() { return state.name(); }
    int duration() { return state.seconds; }

    public static void main(String[] args) {
        TrafficController t = new TrafficController();
        t.timerExpired(); t.pedestrianButton(); System.out.print(t.color() + " ");   // YELLOW
        t.timerExpired(); t.emergency(); t.timerExpired(); System.out.print(t.color() + " ");
        t.resume(); System.out.println(t.color() + " " + t.duration() + "s");       // RED 30s
    }
}`,
      complexity: `<p>O(1) per event, O(1) memory. New state = new enum constant + overrides in states that lead to it.</p>`,
      followUps: ['Drive it with a real ScheduledExecutorService timer — where does scheduling live?', 'Two lights at an intersection must never both be GREEN — which pattern coordinates them? (Mediator)']
    }
  });

  practice.push({
    title: 'Peeking Iterator', level: 'Easy', tags: ['iterator', 'design'], companies: ['Google', 'Apple', 'Yahoo'],
    statement: `<p>Wrap an existing <code>Iterator&lt;Integer&gt;</code> in a <code>PeekingIterator</code> that supports <code>peek()</code> (return the next element without advancing), <code>next()</code> and <code>hasNext()</code>. You may not copy the whole underlying sequence (it may be huge or infinite).</p>`,
    constraints: `Up to 10<sup>6</sup> calls. All operations O(1). <code>next()</code>/<code>peek()</code> on an exhausted iterator throw <code>NoSuchElementException</code>.`,
    example: `<p>Underlying [1, 2, 3]: next → ${H.c('g', '1')}, peek → ${H.c('b', '2')}, next → ${H.c('g', '2')} (same value peek showed), next → ${H.c('g', '3')}, hasNext → ${H.c('r', 'false')}.</p>`,
    brute: { why: `<p>Drain the whole underlying iterator into a list in the constructor and keep an index. Peek is trivial, but memory becomes O(N), startup O(N), and it never terminates on an infinite stream (e.g. an iterator over a live event feed).</p>`, code: `class CopyingPeekingIterator {
    private final List<Integer> all = new ArrayList<>();
    private int i;
    CopyingPeekingIterator(Iterator<Integer> it) { while (it.hasNext()) all.add(it.next()); }   // O(N), hangs if infinite
    Integer peek() { return all.get(i); }
    Integer next() { return all.get(i++); }
    boolean hasNext() { return i < all.size(); }
}` },
    mcq: { q: 'What extra state does a lazy PeekingIterator need?', options: ['One cached "next" element plus a flag saying whether it is valid', 'A copy of all remaining elements', 'A stack', 'Nothing; call next() twice'], answer: 0, explain: 'Look ahead by exactly one element and remember it; next() returns the cached value and refills the cache.' },
    hints: [`<p>Hint 1: To peek you must take the element from the underlying iterator early — so remember it.</p>`, `<p>Hint 2: Fields: <code>Integer nextVal</code> and <code>boolean hasPeeked</code> (null can be a valid element, so do not use null as "empty").</p>`, `<p>Hint 3: peek(): if not cached, cache it. next(): if cached, return and clear; else delegate. hasNext(): cached || underlying.hasNext().</p>`],
    solution: {
      approach: `<p>Keep a one-element look-ahead buffer. <code>peek()</code> fills the buffer if empty and returns it without consuming; <code>next()</code> returns the buffer if filled (and clears it) or delegates to the wrapped iterator. A separate boolean distinguishes "no buffered element" from "buffered null". Implementing <code>Iterator&lt;T&gt;</code> generically makes it reusable. This is also a Decorator over an Iterator.</p>`,
      code: `class PeekingIterator<T> implements Iterator<T> {
    private final Iterator<T> it;
    private T buffered;
    private boolean hasBuffered;

    PeekingIterator(Iterator<T> it) { this.it = it; }

    T peek() {
        if (!hasBuffered) {
            if (!it.hasNext()) throw new NoSuchElementException();
            buffered = it.next();
            hasBuffered = true;
        }
        return buffered;
    }

    @Override public T next() {
        if (hasBuffered) { hasBuffered = false; T v = buffered; buffered = null; return v; }
        return it.next();                       // throws NoSuchElementException when exhausted
    }

    @Override public boolean hasNext() { return hasBuffered || it.hasNext(); }

    public static void main(String[] args) {
        PeekingIterator<Integer> p = new PeekingIterator<>(List.of(1, 2, 3).iterator());
        System.out.println(p.next() + " " + p.peek() + " " + p.next() + " " + p.next() + " " + p.hasNext());
    }
}`,
      complexity: `<p>O(1) time per call, O(1) extra memory.</p>`,
      followUps: ['Generalise to peek(k) — look k ahead (use a small deque)', 'Use it to merge K sorted iterators with a heap']
    }
  });

  practice.push({
    title: 'Smart Light Remote with Undo', level: 'Easy', tags: ['command', 'undo'], companies: ['Amazon', 'Google', 'Philips'],
    statement: `<p>A remote has numbered slots. Each slot can be programmed with an action on a <code>Light</code> (brightness 0–100): <b>On</b> (100), <b>Off</b> (0), <b>Dim(level)</b>. <code>press(slot)</code> runs the action; <code>undo()</code> reverts the <b>most recent</b> press, restoring the exact previous brightness (multiple undos go further back). Slots can be re-programmed at runtime. The remote must not know what a light is.</p>`,
    constraints: `Up to 10 slots, history up to 100 presses (drop the oldest beyond that). Pressing an empty slot does nothing and is not recorded.`,
    example: `<p>Slot0=On, Slot1=Dim(30), Slot2=Off. press(0) → 100. press(1) → 30. press(2) → 0. undo → ${H.c('g', '30')}. undo → ${H.c('g', '100')}. undo → ${H.c('g', '0')} (initial). undo → ${H.c('m', 'nothing')}.</p>`,
    brute: { why: `<p>The remote stores slot numbers in an int array and switches on the button id to call <code>light.on()</code>, <code>light.dim(30)</code>… It remembers only <code>lastButton</code>, so undo is a second switch that guesses the previous brightness (wrong after Dim → Dim) and supports only one level of undo. The remote is welded to the Light class.</p>`, code: `class NaiveRemote {
    int brightness, lastButton = -1;
    void press(int button) {
        lastButton = button;
        switch (button) { case 0 -> brightness = 100; case 1 -> brightness = 30; case 2 -> brightness = 0; default -> { } }
    }
    void undo() {                                 // guesses: wrong after two dims, only one level
        switch (lastButton) { case 0 -> brightness = 0; case 1 -> brightness = 100; case 2 -> brightness = 100; default -> { } }
        lastButton = -1;
    }
}` },
    mcq: { q: 'Dim(30) is pressed twice in a row, then undo twice. What must each command store to undo correctly?', options: ['The brightness just before it executed', 'The brightness it sets (30)', 'Nothing; Dim undoes to 100', 'The slot number'], answer: 0, explain: 'Undo restores the previous value. Each command instance must capture it at execute time, so every press needs its own command record.' },
    hints: [`<p>Hint 1: Make <code>interface Command { void execute(); void undo(); }</code>. The remote holds <code>Command[] slots</code>.</p>`, `<p>Hint 2: A slot holds a command <i>template</i>; each press must record its own "previous brightness". Either create a fresh command per press (a Supplier in the slot) or let the history store (command, previous value) pairs.</p>`, `<p>Hint 3: A <code>SetBrightness(light, target)</code> command covers On/Off/Dim. Bounded <code>ArrayDeque</code> for history.</p>`],
    solution: {
      approach: `<p>Slots hold <code>Supplier&lt;Command&gt;</code> factories so every press creates a fresh command object that captures the brightness before it runs. The remote (invoker) executes it and pushes it on a bounded history. Undo pops and calls <code>undo()</code>. The remote only knows the <code>Command</code> interface, so slots can control fans or TVs tomorrow.</p>`,
      code: `class Light {
    private int brightness;
    void set(int b) { brightness = Math.max(0, Math.min(100, b)); }
    int get() { return brightness; }
}

interface Command { void execute(); void undo(); }

class SetBrightness implements Command {
    private final Light light; private final int target; private int previous;
    SetBrightness(Light light, int target) { this.light = light; this.target = target; }
    public void execute() { previous = light.get(); light.set(target); }
    public void undo() { light.set(previous); }
}

class Remote {
    private final List<Supplier<Command>> slots = new ArrayList<>(Collections.nCopies(10, null));
    private final Deque<Command> history = new ArrayDeque<>();

    void program(int slot, Supplier<Command> factory) { slots.set(slot, factory); }

    void press(int slot) {
        Supplier<Command> f = slots.get(slot);
        if (f == null) return;                       // empty slot: no-op, not recorded
        Command c = f.get();                         // fresh command per press
        c.execute();
        history.push(c);
        if (history.size() > 100) history.removeLast();
    }
    boolean undo() {
        Command c = history.poll();
        if (c == null) return false;
        c.undo();
        return true;
    }

    public static void main(String[] args) {
        Light l = new Light();
        Remote r = new Remote();
        r.program(0, () -> new SetBrightness(l, 100));
        r.program(1, () -> new SetBrightness(l, 30));
        r.program(2, () -> new SetBrightness(l, 0));
        r.press(0); r.press(1); r.press(2);
        StringBuilder sb = new StringBuilder();
        while (r.undo()) sb.append(l.get()).append(' ');
        System.out.println(sb.toString().trim());    // 30 100 0
    }
}`,
      complexity: `<p>press/undo O(1); memory O(history size) — bounded at 100.</p>`,
      followUps: ['Add a "Party mode" macro slot that runs several commands and undoes them together', 'Add redo']
    }
  });

  /* ======================= PRACTICE: MEDIUM ======================= */
  practice.push({
    title: 'Logger with Levels and Handler Chain', level: 'Medium', tags: ['chain of responsibility', 'logging'], companies: ['Microsoft', 'Atlassian', 'Uber'],
    statement: `<p>Build a <code>Logger</code> with levels <b>DEBUG &lt; INFO &lt; WARN &lt; ERROR</b>. Output goes through a chain of handlers: <code>ConsoleHandler</code> (min DEBUG), <code>FileHandler</code> (min INFO, keeps lines in memory for the test), <code>PagerHandler</code> (min ERROR, pages on-call). Every handler whose minimum level is met writes the message, then passes it on (pipeline semantics). Handlers can be added/reordered by configuration. One failing handler must not stop the others.</p>`,
    constraints: `Up to 10<sup>6</sup> log calls; handlers are shared across threads. Messages below every handler's level should cost almost nothing.`,
    example: `<p>log(DEBUG, "cache miss") → ${H.c('b', 'console only')}. log(WARN, "slow query") → ${H.c('b', 'console + file')}. log(ERROR, "db down") → ${H.c('r', 'console + file + pager')}.</p>`,
    brute: { why: `<p>A single <code>log()</code> method with <code>if (level &gt;= INFO) writeFile(); if (level == ERROR) page();</code>. Adding a Slack handler or changing thresholds edits the logger; a pager exception aborts the log call; and handlers cannot be configured per environment.</p>`, code: `class NaiveLogger {
    final List<String> file = new ArrayList<>();
    void log(int level, String msg) {         // 0=DEBUG 1=INFO 2=WARN 3=ERROR
        System.out.println(msg);
        if (level >= 1) file.add(msg);
        if (level >= 3) throw new RuntimeException("pager down");   // breaks everything after it
    }
}` },
    mcq: { q: 'In this logger, why does every handler call next even after handling?', options: ['Pipeline semantics: several handlers may each act on the same message', 'Because the first handler cannot write', 'To save memory', 'It is a bug; CoR must stop at the first handler'], answer: 0, explain: 'Chain of Responsibility has two flavours. Approvals stop at the first handler; logging is a filter pipeline where many handlers act.' },
    hints: [`<p>Hint 1: <code>enum Level</code> with ordinal comparison. Abstract <code>LogHandler</code> with <code>minLevel</code>, <code>next</code>, and a final <code>handle()</code>.</p>`, `<p>Hint 2: <code>handle()</code>: if level ≥ min, try { write } catch (RuntimeException) { record failure }; then if next != null, next.handle().</p>`, `<p>Hint 3: Cheap filtering: the Logger can store the lowest min level of the chain and return early. Use a thread-safe list for the file handler.</p>`],
    solution: {
      approach: `<p>Each handler is a link with its own minimum level. The base class fixes the walking logic (Template Method inside CoR): check level → write (isolated in try/catch) → forward. The logger only knows the head of the chain plus a pre-computed global minimum, so messages that no handler wants are dropped in O(1). Chains are assembled by configuration code.</p>`,
      code: `enum Level { DEBUG, INFO, WARN, ERROR }

abstract class LogHandler {
    private final Level min; private LogHandler next;
    LogHandler(Level min) { this.min = min; }
    LogHandler then(LogHandler n) { this.next = n; return n; }
    Level min() { return next == null ? min : (min.compareTo(next.min()) < 0 ? min : next.min()); }

    final void handle(Level level, String msg) {
        if (level.compareTo(min) >= 0) {
            try { write(level, msg); }
            catch (RuntimeException e) { System.err.println(getClass().getSimpleName() + " failed: " + e.getMessage()); }
        }
        if (next != null) next.handle(level, msg);           // pipeline: always forward
    }
    protected abstract void write(Level level, String msg);
}

class ConsoleHandler extends LogHandler {
    ConsoleHandler() { super(Level.DEBUG); }
    protected void write(Level l, String m) { System.out.println("[console] " + l + " " + m); }
}
class FileHandler extends LogHandler {
    final List<String> lines = new CopyOnWriteArrayList<>();
    FileHandler() { super(Level.INFO); }
    protected void write(Level l, String m) { lines.add(l + " " + m); }
}
class PagerHandler extends LogHandler {
    PagerHandler() { super(Level.ERROR); }
    protected void write(Level l, String m) { System.out.println("[pager] waking on-call: " + m); }
}

class Logger {
    private final LogHandler head; private final Level min;
    Logger(LogHandler head) { this.head = head; this.min = head.min(); }
    void log(Level level, String msg) {
        if (level.compareTo(min) < 0) return;                // nobody wants it: O(1) drop
        head.handle(level, msg);
    }

    public static void main(String[] args) {
        ConsoleHandler console = new ConsoleHandler();
        FileHandler file = new FileHandler();
        console.then(file).then(new PagerHandler());
        Logger log = new Logger(console);
        log.log(Level.DEBUG, "cache miss");
        log.log(Level.WARN, "slow query");
        log.log(Level.ERROR, "db down");
        System.out.println("file has " + file.lines);
    }
}`,
      complexity: `<p>O(H) per message for H handlers; O(1) for messages below the global minimum.</p>`,
      followUps: ['Make writing asynchronous so a slow file system does not block callers (queue + background thread)', 'Add per-package log levels (logger hierarchy)']
    }
  });

  practice.push({
    title: 'Typed Event Bus', level: 'Medium', tags: ['observer', 'pub-sub', 'generics'], companies: ['Google', 'Spotify', 'Swiggy'],
    statement: `<p>Implement an in-process <code>EventBus</code>: <code>subscribe(Class&lt;T&gt; type, Consumer&lt;T&gt; handler)</code> returns a handle to unsubscribe; <code>publish(Object event)</code> delivers the event to every handler subscribed to the event's class <b>or any of its supertypes/interfaces</b> (a handler for <code>OrderEvent</code> also receives <code>OrderShipped</code>). A handler that throws must not prevent delivery to others; return the number of handlers that succeeded.</p>`,
    constraints: `Up to 10<sup>4</sup> subscriptions, many publishes per second from multiple threads; subscriptions change rarely.`,
    example: `<p>subscribe(OrderEvent → audit), subscribe(OrderShipped → sms), subscribe(Object → debugLog). publish(new OrderShipped("A1")) → ${H.c('g', 'audit, sms and debugLog')} all run (3). publish(new UserSignedUp("u7")) → ${H.c('g', 'debugLog only')} (1).</p>`,
    brute: { why: `<p>One <code>publish(String type, Object payload)</code> with a switch on the type string calling services directly. No compile-time type safety (payload casts), publishers know every consumer, and hierarchy-based subscriptions ("all order events") are impossible without listing every subtype.</p>`, code: `class NaiveBus {
    void publish(String type, Object payload) {
        switch (type) {
            case "ORDER_SHIPPED" -> { System.out.println("audit " + payload); System.out.println("sms " + payload); }
            case "USER_SIGNED_UP" -> System.out.println("welcome " + payload);
            default -> System.out.println("unknown " + type);   // every new event edits this
        }
    }
}` },
    mcq: { q: 'How do you find every handler that should receive an OrderShipped event?', options: ['Walk its class, superclasses and interfaces, and collect the handlers registered for each', 'Only look up OrderShipped.class', 'Call every handler and let it check instanceof', 'Use the event name string'], answer: 0, explain: 'Subscriptions keyed by type; delivery resolves the event type hierarchy (cache it per class for speed).' },
    hints: [`<p>Hint 1: <code>Map&lt;Class&lt;?&gt;, List&lt;Consumer&lt;Object&gt;&gt;&gt;</code> — store handlers wrapped so the bus can call them with an Object after a safe cast.</p>`, `<p>Hint 2: Collect all supertypes with a BFS over <code>getSuperclass()</code> and <code>getInterfaces()</code>; cache the result in a <code>ConcurrentHashMap&lt;Class, List&lt;Class&gt;&gt;</code>.</p>`, `<p>Hint 3: Use <code>CopyOnWriteArrayList</code> for handler lists; wrap each call in try/catch; unsubscribe handle removes the exact wrapper.</p>`],
    solution: {
      approach: `<p>An Observer keyed by type. Subscriptions are stored per <code>Class</code> in thread-safe lists; each typed handler is wrapped in a <code>Consumer&lt;Object&gt;</code> that casts with <code>type.cast</code>. On publish, the bus resolves the event's type hierarchy once (cached), gathers handlers from every type in it, and invokes each in isolation. The unsubscribe handle removes the exact wrapper instance.</p>`,
      code: `interface OrderEvent { String orderId(); }
record OrderShipped(String orderId) implements OrderEvent {}
record UserSignedUp(String userId) {}

class EventBus {
    private final Map<Class<?>, List<Consumer<Object>>> handlers = new ConcurrentHashMap<>();
    private final Map<Class<?>, List<Class<?>>> hierarchyCache = new ConcurrentHashMap<>();

    <T> Runnable subscribe(Class<T> type, Consumer<? super T> handler) {
        Consumer<Object> wrapper = o -> handler.accept(type.cast(o));
        handlers.computeIfAbsent(type, k -> new CopyOnWriteArrayList<>()).add(wrapper);
        return () -> handlers.getOrDefault(type, List.of()).remove(wrapper);
    }

    int publish(Object event) {
        int ok = 0;
        for (Class<?> t : hierarchy(event.getClass())) {
            for (Consumer<Object> h : handlers.getOrDefault(t, List.of())) {
                try { h.accept(event); ok++; }
                catch (RuntimeException e) { System.out.println("handler failed: " + e.getMessage()); }
            }
        }
        return ok;
    }

    private List<Class<?>> hierarchy(Class<?> c) {
        return hierarchyCache.computeIfAbsent(c, k -> {
            List<Class<?>> out = new ArrayList<>();
            Deque<Class<?>> q = new ArrayDeque<>(List.of(k));
            Set<Class<?>> seen = new HashSet<>();
            while (!q.isEmpty()) {
                Class<?> x = q.poll();
                if (x == null || !seen.add(x)) continue;
                out.add(x);
                if (x.getSuperclass() != null) q.add(x.getSuperclass());
                q.addAll(Arrays.asList(x.getInterfaces()));
            }
            return out;
        });
    }

    public static void main(String[] args) {
        EventBus bus = new EventBus();
        bus.subscribe(OrderEvent.class, e -> System.out.println("audit " + e.orderId()));
        Runnable sms = bus.subscribe(OrderShipped.class, e -> System.out.println("sms: " + e.orderId() + " shipped"));
        bus.subscribe(Object.class, e -> System.out.println("debug " + e));
        System.out.println(bus.publish(new OrderShipped("A1")) + " handlers");
        sms.run();
        System.out.println(bus.publish(new OrderShipped("A2")) + " handlers");
        System.out.println(bus.publish(new UserSignedUp("u7")) + " handlers");
    }
}`,
      complexity: `<p>publish: O(T + H) where T = types in the hierarchy (cached) and H = matching handlers. subscribe/unsubscribe: O(H) copy-on-write.</p>`,
      followUps: ['Deliver asynchronously with ordering per event type', 'Add dead-event handling (no subscribers)', 'Prevent memory leaks from forgotten subscriptions']
    }
  });

  practice.push({
    title: 'Flatten Nested List Iterator', level: 'Medium', tags: ['iterator', 'stack'], companies: ['Meta', 'LinkedIn', 'Airbnb', 'Netflix'],
    statement: `<p>Given a nested list such as <code>[[1,1],2,[1,[4,[6]]]]</code>, implement an iterator that returns the integers in order: 1, 1, 2, 1, 4, 6. Elements are <code>NestedInteger</code>s: each is either an integer or a list of NestedIntegers. Lists may be empty at any depth (<code>[[],[[]],3]</code> → 3). Iterate lazily: do not flatten everything in the constructor.</p>`,
    constraints: `Up to 10<sup>5</sup> integers, nesting depth up to 10<sup>4</sup>. <code>hasNext()</code> must be safe to call repeatedly.`,
    example: `<p>[[1,1],2,[1,[4,[6]]]] → ${H.c('g', '1 1 2 1 4 6')}. [[],[[]],3] → ${H.c('g', '3')} — empty lists produce nothing, so hasNext() must <b>skip</b> them before answering.</p>`,
    brute: { why: `<p>Recursively flatten the whole structure into a list in the constructor. Simple, but O(N) memory and work up front, and a depth-10<sup>4</sup> recursion risks StackOverflowError. Callers who need only the first element still pay for all.</p>`, code: `interface NI { boolean isInteger(); Integer getInteger(); List<NI> getList(); }
class FlattenAll {
    private final List<Integer> out = new ArrayList<>(); private int i;
    FlattenAll(List<NI> list) { add(list); }
    private void add(List<NI> l) { for (NI x : l) if (x.isInteger()) out.add(x.getInteger()); else add(x.getList()); }  // deep recursion
    boolean hasNext() { return i < out.size(); }
    Integer next() { return out.get(i++); }
}` },
    mcq: { q: 'Why must hasNext() do work (not just check a stack is non-empty)?', options: ['Because the stack may hold only empty lists, so we must unpack until an integer is on top', 'Because next() is slow', 'Because Java requires it', 'It must not do work'], answer: 0, explain: 'hasNext() advances past empty lists and unpacks nested lists until an integer is ready (or nothing remains). It must be idempotent, so it only prepares and never consumes the integer.' },
    hints: [`<p>Hint 1: Keep a stack of iterators (one per open list), like a paused DFS.</p>`, `<p>Hint 2: In hasNext(): look at the top iterator; if exhausted pop it; if its next element is a list, push that list's iterator; if it is an integer, cache it and return true.</p>`, `<p>Hint 3: Use a cached <code>Integer nextVal</code> to make hasNext idempotent; next() calls hasNext(), returns and clears the cache.</p>`],
    solution: {
      approach: `<p>Simulate DFS with a stack of <code>Iterator&lt;NestedInteger&gt;</code>. <code>hasNext()</code> repeatedly inspects the top iterator: pop it when exhausted, descend (push a new iterator) when the next element is a list, and stop when it finds an integer, which it caches. <code>next()</code> returns the cached integer. Memory is O(depth); each element is touched once, so operations are O(1) amortised and no recursion is used.</p>`,
      code: `interface NestedInteger {
    boolean isInteger();
    Integer getInteger();
    List<NestedInteger> getList();
    static NestedInteger of(int v) { return new NestedImpl(v, null); }
    static NestedInteger of(NestedInteger... xs) { return new NestedImpl(null, List.of(xs)); }
}
record NestedImpl(Integer value, List<NestedInteger> list) implements NestedInteger {
    public boolean isInteger() { return value != null; }
    public Integer getInteger() { return value; }
    public List<NestedInteger> getList() { return list; }
}

class NestedIterator implements Iterator<Integer> {
    private final Deque<Iterator<NestedInteger>> stack = new ArrayDeque<>();
    private Integer nextVal;                       // cached look-ahead

    NestedIterator(List<NestedInteger> list) { stack.push(list.iterator()); }

    @Override public boolean hasNext() {
        while (nextVal == null && !stack.isEmpty()) {
            Iterator<NestedInteger> top = stack.peek();
            if (!top.hasNext()) { stack.pop(); continue; }
            NestedInteger x = top.next();
            if (x.isInteger()) nextVal = x.getInteger();
            else stack.push(x.getList().iterator());      // descend lazily
        }
        return nextVal != null;
    }

    @Override public Integer next() {
        if (!hasNext()) throw new NoSuchElementException();
        Integer v = nextVal; nextVal = null; return v;
    }

    public static void main(String[] args) {
        List<NestedInteger> in = List.of(NestedInteger.of(NestedInteger.of(1), NestedInteger.of(1)), NestedInteger.of(2),
                NestedInteger.of(NestedInteger.of(1), NestedInteger.of(NestedInteger.of(4), NestedInteger.of(NestedInteger.of(6)))));
        NestedIterator it = new NestedIterator(in);
        StringBuilder sb = new StringBuilder();
        while (it.hasNext()) sb.append(it.next()).append(' ');
        System.out.println(sb.toString().trim());   // 1 1 2 1 4 6
        System.out.println(new NestedIterator(List.of(NestedInteger.of(), NestedInteger.of(NestedInteger.of()), NestedInteger.of(3))).next());
    }
}`,
      complexity: `<p>O(1) amortised per call (each element and list is visited once); O(depth) memory.</p>`,
      followUps: ['Support remove()', 'Return elements in reverse order lazily', 'Make it work for a structure that is streamed from disk']
    }
  });

  practice.push({
    title: 'Media Player State Machine', level: 'Medium', tags: ['state'], companies: ['Spotify', 'Netflix', 'Apple'],
    statement: `<p>A <code>MediaPlayer</code> plays one track of length L seconds. States: <b>Stopped</b>, <b>Playing</b>, <b>Paused</b>. <code>play()</code>: Stopped → Playing from 0; Paused → Playing from the saved position; Playing → no-op. <code>pause()</code>: Playing → Paused; otherwise no-op. <code>stop()</code>: any → Stopped, position 0. <code>tick(s)</code>: only in Playing, advances the position; reaching L moves to Stopped (track ended) and fires an <code>onFinished</code> callback. Return a status line after each action.</p>`,
    constraints: `L ≤ 10<sup>4</sup> s, up to 10<sup>5</sup> actions. Adding a <b>Buffering</b> state later must not require editing unrelated states.`,
    example: `<p>L=10. play → Playing@0. tick 4 → Playing@4. pause → Paused@4. tick 3 → ${H.c('m', 'Paused@4 (time frozen)')}. play → Playing@4. tick 7 → ${H.c('g', 'Stopped@0, finished fired')}.</p>`,
    brute: { why: `<p>Two booleans <code>playing</code> and <code>paused</code> and if/else in every method. Invalid combinations (both true) become possible, <code>tick</code> must remember to check both flags, and Buffering would add a third boolean and 8 combinations.</p>`, code: `class NaivePlayer {
    boolean playing, paused; int pos; final int len;
    NaivePlayer(int len) { this.len = len; }
    void play() { if (paused) { paused = false; playing = true; } else if (!playing) { pos = 0; playing = true; } }
    void pause() { if (playing) { playing = false; paused = true; } }
    void stop() { playing = false; paused = false; pos = 0; }
    void tick(int s) { if (playing && !paused) { pos += s; if (pos >= len) stop(); } }   // flags can drift
}` },
    mcq: { q: 'Where does "time does not advance while paused" live in the State design?', options: ['PausedState.tick() is a no-op (inherited default)', 'In MediaPlayer.tick() with an if', 'In the UI', 'In the track object'], answer: 0, explain: 'Each state defines its own reaction; Paused simply does not override tick, so the default does nothing.' },
    hints: [`<p>Hint 1: Context = player (position, length, callback). States = Stopped, Playing, Paused.</p>`, `<p>Hint 2: <code>interface PlayerState</code> with default no-op methods returning <code>this</code>; each state overrides only its meaningful events and returns the next state.</p>`, `<p>Hint 3: Playing.tick: pos += s; if pos ≥ len → pos = 0, fire callback, return Stopped. Keep the state singletons stateless; data stays in the context.</p>`],
    solution: {
      approach: `<p>State objects are stateless singletons that receive the context and return the next state; the context (player) keeps position, length and the finished callback. Defaults return <code>this</code>, which encodes "ignored" for every event a state does not handle. The player's public methods are one-line delegations plus a status string.</p>`,
      code: `interface PlayerState {
    String name();
    default PlayerState play(MediaPlayer p)  { return this; }
    default PlayerState pause(MediaPlayer p) { return this; }
    default PlayerState tick(MediaPlayer p, int s) { return this; }
    default PlayerState stop(MediaPlayer p)  { p.position = 0; return Stopped.I; }
}
final class Stopped implements PlayerState {
    static final Stopped I = new Stopped();
    public String name() { return "Stopped"; }
    public PlayerState play(MediaPlayer p) { p.position = 0; return Playing.I; }
}
final class Playing implements PlayerState {
    static final Playing I = new Playing();
    public String name() { return "Playing"; }
    public PlayerState pause(MediaPlayer p) { return Paused.I; }
    public PlayerState tick(MediaPlayer p, int s) {
        p.position += s;
        if (p.position >= p.length) { p.position = 0; p.onFinished.run(); return Stopped.I; }
        return this;
    }
}
final class Paused implements PlayerState {
    static final Paused I = new Paused();
    public String name() { return "Paused"; }
    public PlayerState play(MediaPlayer p) { return Playing.I; }     // resume from saved position
}

class MediaPlayer {
    int position; final int length; final Runnable onFinished;
    private PlayerState state = Stopped.I;
    MediaPlayer(int length, Runnable onFinished) { this.length = length; this.onFinished = onFinished; }
    String play()       { state = state.play(this); return status(); }
    String pause()      { state = state.pause(this); return status(); }
    String stop()       { state = state.stop(this); return status(); }
    String tick(int s)  { state = state.tick(this, s); return status(); }
    String status() { return state.name() + "@" + position; }

    public static void main(String[] args) {
        MediaPlayer m = new MediaPlayer(10, () -> System.out.println("finished!"));
        System.out.println(String.join(" ", m.play(), m.tick(4), m.pause(), m.tick(3), m.play(), m.tick(7)));
    }
}`,
      complexity: `<p>O(1) per action, O(1) memory. A Buffering state = one class + overrides in Playing (to enter it) — Stopped and Paused are untouched.</p>`,
      followUps: ['Add a playlist: when a track finishes, auto-play the next (who owns that rule?)', 'Notify UI widgets of state changes (Observer)']
    }
  });

  practice.push({
    title: 'Shopping Cart: Tax and Shipping Visitors', level: 'Medium', tags: ['visitor'], companies: ['Flipkart', 'Amazon', 'Walmart'],
    statement: `<p>A cart contains <code>Book(price, grams)</code>, <code>Electronics(price, grams, fragile)</code> and <code>Grocery(price, grams, perishable)</code>. Implement two operations as visitors: <b>tax</b> (books 0%, electronics 18%, grocery 5%) and <b>shipping</b> (₹10 per 500 g or part thereof; +₹50 if fragile; +₹30 if perishable). Finance will later add "loyalty points" and "import duty" — the item classes must not change for that.</p>`,
    constraints: `Up to 10<sup>4</sup> items. Money in paise (long) to avoid floating-point errors. Item types are stable.`,
    example: `<p>Book(50000, 400) + Electronics(200000, 1200, fragile) + Grocery(10000, 900, perishable).<br>Tax = 0 + 36000 + 500 = ${H.c('g', '36500 paise')}. Shipping = 1000 + (3000 + 5000) + (2000 + 3000) = ${H.c('g', '14000 paise')} (1200 g → 3 blocks of 500 g; 900 g → 2 blocks).</p>`,
    brute: { why: `<p>Each operation is a method with <code>if (item instanceof Book) … else if (item instanceof Electronics) …</code>. Tax, shipping, points and duty each repeat the same ladder; adding a new item type compiles fine even when one ladder forgets it.</p>`, code: `class NaiveCart {
    record Item(String kind, long price, int grams) {}
    long tax(List<Item> items) {
        long t = 0;
        for (Item i : items) {
            if (i.kind().equals("BOOK")) t += 0;
            else if (i.kind().equals("ELEC")) t += i.price() * 18 / 100;
            else if (i.kind().equals("GROCERY")) t += i.price() * 5 / 100;
        }
        return t;   // shipping(), points(), duty() repeat this ladder...
    }
}` },
    mcq: { q: 'Finance adds "loyalty points" next sprint. With Visitor, what do you write?', options: ['One new class LoyaltyVisitor; item classes untouched', 'A points() method in each item class', 'A new instanceof ladder', 'A new item type'], answer: 0, explain: 'New operations over stable types are exactly what Visitor makes cheap.' },
    hints: [`<p>Hint 1: <code>interface CartItem { &lt;R&gt; R accept(CartVisitor&lt;R&gt; v); }</code> and a visitor with <code>visitBook</code>, <code>visitElectronics</code>, <code>visitGrocery</code>.</p>`, `<p>Hint 2: Each visitor returns the amount for one item; the cart sums <code>item.accept(visitor)</code> over all items.</p>`, `<p>Hint 3: Blocks of 500 g "or part thereof" = <code>(grams + 499) / 500</code>. Keep all money in long paise.</p>`],
    solution: {
      approach: `<p>Item records are the stable element hierarchy with one-line <code>accept</code> methods. Each business operation is a <code>CartVisitor&lt;Long&gt;</code> that returns the amount for one item; a generic <code>Cart.total(visitor)</code> sums over items. All tax rules sit together in <code>TaxVisitor</code> and all shipping rules in <code>ShippingVisitor</code>, which is how finance and logistics teams want to own them.</p>`,
      code: `interface CartVisitor<R> {
    R visitBook(Book b);
    R visitElectronics(Electronics e);
    R visitGrocery(Grocery g);
}
interface CartItem { <R> R accept(CartVisitor<R> v); }

record Book(long price, int grams) implements CartItem { public <R> R accept(CartVisitor<R> v) { return v.visitBook(this); } }
record Electronics(long price, int grams, boolean fragile) implements CartItem { public <R> R accept(CartVisitor<R> v) { return v.visitElectronics(this); } }
record Grocery(long price, int grams, boolean perishable) implements CartItem { public <R> R accept(CartVisitor<R> v) { return v.visitGrocery(this); } }

class TaxVisitor implements CartVisitor<Long> {
    public Long visitBook(Book b) { return 0L; }
    public Long visitElectronics(Electronics e) { return e.price() * 18 / 100; }
    public Long visitGrocery(Grocery g) { return g.price() * 5 / 100; }
}
class ShippingVisitor implements CartVisitor<Long> {
    private static long base(int grams) { return 1000L * ((grams + 499) / 500); }   // ₹10 per 500 g block
    public Long visitBook(Book b) { return base(b.grams()); }
    public Long visitElectronics(Electronics e) { return base(e.grams()) + (e.fragile() ? 5000 : 0); }
    public Long visitGrocery(Grocery g) { return base(g.grams()) + (g.perishable() ? 3000 : 0); }
}

class Cart {
    private final List<CartItem> items = new ArrayList<>();
    void add(CartItem i) { items.add(i); }
    long total(CartVisitor<Long> v) {
        long sum = 0;
        for (CartItem i : items) sum += i.accept(v);
        return sum;
    }

    public static void main(String[] args) {
        Cart c = new Cart();
        c.add(new Book(50_000, 400));
        c.add(new Electronics(200_000, 1200, true));
        c.add(new Grocery(10_000, 900, true));
        System.out.println("tax=" + c.total(new TaxVisitor()) + " shipping=" + c.total(new ShippingVisitor()));   // 36500 14000
    }
}`,
      complexity: `<p>O(N) per visitor run. New operation: one class. New item type: one method in every visitor (compiler-enforced).</p>`,
      followUps: ['Rewrite with a sealed interface and switch — compare the amount of code', 'Tax rules differ by state/country — combine Visitor with a Strategy per region']
    }
  });

  practice.push({
    title: 'Payment Processing Template', level: 'Medium', tags: ['template method', 'hooks'], companies: ['Razorpay', 'Stripe', 'PayPal'],
    statement: `<p>Every payment method follows: <b>validate amount</b> → <b>fraud check</b> (optional per method) → <b>debit</b> (method-specific) → <b>apply fee</b> (method-specific, default 0) → <b>write receipt</b>. Card: 2% fee, always fraud-checked (reject amounts &gt; ₹1,00,000). UPI: no fee, fraud check only above ₹2,000. Wallet: no fraud check, fails if wallet balance is insufficient. The order of steps must be enforced for all methods, including ones added later.</p>`,
    constraints: `Amounts in paise (long) &gt; 0. Fraud and debit failures must return a failed result, never throw to the caller.`,
    example: `<p>Card ₹500 → ${H.c('g', 'OK, fee ₹10')}. UPI ₹1,500 → ${H.c('g', 'OK, fraud check skipped')}. Card ₹2,00,000 → ${H.c('r', 'FRAUD_REJECTED')}. Wallet ₹900 with balance ₹800 → ${H.c('r', 'DEBIT_FAILED')}.</p>`,
    brute: { why: `<p>Three classes each implementing the full flow. One forgets amount validation, another writes the receipt before the debit succeeds, and a compliance change ("log every fraud decision") must be applied three times. The <i>order of steps</i> is a business rule but nobody enforces it.</p>`, code: `class NaiveCardPayment {
    String pay(long amt) {
        String receipt = "receipt " + amt;              // written BEFORE debit: wrong order
        if (amt > 10_000_000) return "FRAUD_REJECTED";
        System.out.println("debit card " + amt);
        return receipt + " fee " + amt * 2 / 100;       // forgot to validate amt > 0
    }
}
// NaiveUpiPayment, NaiveWalletPayment: same flow pasted with different mistakes.` },
    mcq: { q: 'UPI wants to skip fraud checks for small amounts. How should it express that?', options: ['Override a hook like needsFraudCheck(amount) that the template calls', 'Override the whole pay() method', 'Add an if in the base class for UPI', 'Catch the fraud exception'], answer: 0, explain: 'Hooks let subclasses switch optional steps on/off while the base keeps the order and the mandatory steps.' },
    hints: [`<p>Hint 1: <code>public final PaymentResult pay(long amount)</code> in an abstract <code>PaymentProcessor</code>.</p>`, `<p>Hint 2: Abstract: <code>debit(amount)</code> returning boolean. Hooks: <code>needsFraudCheck(amount)</code> (default true), <code>fee(amount)</code> (default 0).</p>`, `<p>Hint 3: Shared private steps: validate, fraudCheck (limit rule), receipt. Return a record <code>PaymentResult(status, fee)</code> with an enum status.</p>`],
    solution: {
      approach: `<p>The base class fixes the flow in a <code>final pay()</code>: validate → (hook) fraud check → abstract debit → (hook) fee → receipt. Mandatory steps are private, so no subclass can skip them; optional behaviour is expressed through hooks with safe defaults. A new payment method is a small subclass, and a compliance change to the flow is made once.</p>`,
      code: `enum PayStatus { OK, INVALID_AMOUNT, FRAUD_REJECTED, DEBIT_FAILED }
record PaymentResult(PayStatus status, long fee) {}

abstract class PaymentProcessor {
    public final PaymentResult pay(long amount) {
        if (amount <= 0) return new PaymentResult(PayStatus.INVALID_AMOUNT, 0);
        if (needsFraudCheck(amount) && !fraudCheck(amount)) return new PaymentResult(PayStatus.FRAUD_REJECTED, 0);
        if (!debit(amount)) return new PaymentResult(PayStatus.DEBIT_FAILED, 0);
        long fee = fee(amount);
        writeReceipt(amount, fee);
        return new PaymentResult(PayStatus.OK, fee);
    }
    protected abstract boolean debit(long amount);
    protected boolean needsFraudCheck(long amount) { return true; }   // hook
    protected long fee(long amount) { return 0; }                     // hook
    private boolean fraudCheck(long amount) { return amount <= 10_000_000; }   // ₹1,00,000 in paise
    private void writeReceipt(long amount, long fee) {
        System.out.println(getClass().getSimpleName() + " receipt: " + amount + " fee " + fee);
    }
}

class CardPayment extends PaymentProcessor {
    protected boolean debit(long amount) { return true; }             // call card network
    @Override protected long fee(long amount) { return amount * 2 / 100; }
}
class UpiPayment extends PaymentProcessor {
    protected boolean debit(long amount) { return true; }
    @Override protected boolean needsFraudCheck(long amount) { return amount > 200_000; }
}
class WalletPayment extends PaymentProcessor {
    private long balance;
    WalletPayment(long balance) { this.balance = balance; }
    protected boolean debit(long amount) {
        if (amount > balance) return false;
        balance -= amount; return true;
    }
    @Override protected boolean needsFraudCheck(long amount) { return false; }
}

class PayDemo {
    public static void main(String[] args) {
        System.out.println(new CardPayment().pay(50_000));
        System.out.println(new UpiPayment().pay(150_000));
        System.out.println(new CardPayment().pay(20_000_000));
        System.out.println(new WalletPayment(80_000).pay(90_000));
    }
}`,
      complexity: `<p>O(1) per payment. New method = one subclass with 1–3 small overrides.</p>`,
      followUps: ['Fraud checking should call a pluggable ML service — would you make it a Strategy injected into the base?', 'Make debit + receipt atomic (what if receipt writing fails?)']
    }
  });

  /* ======================= PRACTICE: HARD ======================= */
  practice.push({
    title: 'Transactional Key-Value Store (Nested BEGIN/ROLLBACK/COMMIT)', level: 'Hard', tags: ['memento', 'command', 'undo log'], companies: ['Stripe', 'Coinbase', 'Databricks', 'Google'],
    statement: `<p>Implement an in-memory store with <code>set(k, v)</code>, <code>get(k)</code> (null if missing), <code>delete(k)</code>, <code>begin()</code>, <code>rollback()</code> and <code>commit()</code>. Transactions <b>nest</b>: rollback undoes only the innermost open transaction; commit merges the innermost into its parent (or makes changes permanent if it is the outermost). rollback/commit with no open transaction return false. <code>begin()</code> must be O(1) — copying the whole map is not allowed.</p>`,
    constraints: `Up to 10<sup>6</sup> keys and 10<sup>5</sup> operations; nesting depth up to 10<sup>3</sup>. get/set/delete O(1) average.`,
    example: `<p>set a=10 · begin · set a=20 · begin · delete a · get a → ${H.c('m', 'null')} · rollback · get a → ${H.c('g', '20')} · commit · get a → ${H.c('g', '20')} · rollback → ${H.c('r', 'false (no open txn)')}.</p>`,
    brute: { why: `<p>On <code>begin()</code> push a <b>full copy</b> of the map (a full memento); rollback pops and restores it. Correct and simple, but begin is O(N): with 10<sup>6</sup> keys and frequent short transactions, you copy millions of entries to change one. Memory explodes with nesting.</p>`, code: `class CopyingStore {
    private Map<String, String> data = new HashMap<>();
    private final Deque<Map<String, String>> snapshots = new ArrayDeque<>();
    void set(String k, String v) { data.put(k, v); }
    String get(String k) { return data.get(k); }
    void begin() { snapshots.push(new HashMap<>(data)); }          // O(N) every time
    boolean rollback() { if (snapshots.isEmpty()) return false; data = snapshots.pop(); return true; }
    boolean commit() { if (snapshots.isEmpty()) return false; snapshots.pop(); return true; }
}` },
    mcq: { q: 'Inside one transaction, key a is set three times. What should the undo log keep for a?', options: ['Only its value before the FIRST change in this transaction', 'All three old values', 'Only the latest value', 'Nothing; rollback re-reads the database'], answer: 0, explain: 'Rollback must restore the state at begin(); the first old value is all that is needed. Recording it once per key per transaction keeps the log O(keys touched).' },
    hints: [`<p>Hint 1: A <b>delta memento</b>: each transaction keeps a <code>Map&lt;key, oldValue&gt;</code> recorded the first time it touches a key. A sentinel marks "key did not exist".</p>`, `<p>Hint 2: rollback: for each entry, restore the old value (or remove the key if the sentinel). commit: merge the child log into the parent with <code>putIfAbsent</code> (the parent's older value wins); if outermost, just drop it.</p>`, `<p>Hint 3: Use <code>Optional</code> or a private static final Object ABSENT as the sentinel. Stack of logs = <code>Deque&lt;Map&lt;String,Object&gt;&gt;</code>.</p>`],
    solution: {
      approach: `<p>Store data in one live map and keep a stack of <b>undo logs</b>, one per open transaction (a delta memento). Before the first modification of a key within the innermost transaction, record its previous value (or ABSENT). <b>rollback</b> replays that log into the live map and pops it. <b>commit</b> pops the log and merges it into the parent's log with <code>putIfAbsent</code>, so the parent can still roll back to its own begin state; at the outermost level the log is simply discarded. begin is O(1); rollback/commit cost O(keys touched).</p>`,
      code: `class TxStore {
    private static final Object ABSENT = new Object();
    private final Map<String, String> data = new HashMap<>();
    private final Deque<Map<String, Object>> logs = new ArrayDeque<>();

    String get(String k) { return data.get(k); }

    void set(String k, String v) { remember(k); data.put(k, v); }
    void delete(String k) { remember(k); data.remove(k); }

    private void remember(String k) {
        Map<String, Object> log = logs.peek();
        if (log != null && !log.containsKey(k)) log.put(k, data.containsKey(k) ? data.get(k) : ABSENT);
    }

    void begin() { logs.push(new HashMap<>()); }                       // O(1)

    boolean rollback() {
        Map<String, Object> log = logs.poll();
        if (log == null) return false;
        for (Map.Entry<String, Object> e : log.entrySet()) {
            if (e.getValue() == ABSENT) data.remove(e.getKey());
            else data.put(e.getKey(), (String) e.getValue());
        }
        return true;
    }

    boolean commit() {
        Map<String, Object> log = logs.poll();
        if (log == null) return false;
        Map<String, Object> parent = logs.peek();
        if (parent != null) log.forEach(parent::putIfAbsent);         // parent keeps its OLDER value
        return true;
    }

    public static void main(String[] args) {
        TxStore s = new TxStore();
        s.set("a", "10");
        s.begin(); s.set("a", "20");
        s.begin(); s.delete("a"); s.set("b", "1");
        System.out.println(s.get("a") + " " + s.get("b"));   // null 1
        s.rollback();
        System.out.println(s.get("a") + " " + s.get("b"));   // 20 null
        s.commit();
        System.out.println(s.get("a") + " " + s.rollback()); // 20 false
        s.begin(); s.set("a", "30"); s.begin(); s.set("a", "40"); s.commit(); s.rollback();
        System.out.println(s.get("a"));                      // 20 (outer rollback undoes both)
    }
}`,
      complexity: `<p>get/set/delete O(1) average; begin O(1); rollback/commit O(keys touched in that transaction). Memory O(total keys touched across open transactions).</p>`,
      followUps: ['Add count(value) in O(1) that also respects rollback (maintain a value→count map, logged the same way)', 'Make it thread-safe with snapshot isolation (MVCC)', 'Persist with a write-ahead log for crash recovery']
    }
  });

  practice.push({
    title: 'HTTP Middleware Pipeline with Ordering and Error Handling', level: 'Hard', tags: ['chain of responsibility', 'middleware'], companies: ['Cloudflare', 'Netflix', 'Shopify'],
    statement: `<p>Build a <code>Server</code> where middlewares are registered with an <b>order number</b> (lower runs first, ties by registration order). Each middleware receives the request and a <code>next</code> function; it may modify the request, short-circuit with its own response, call next and then modify the response (add headers). Required middlewares: <b>ErrorBoundary</b> (outermost; converts any exception into 500), <b>Auth</b> (401 without a token), <b>RateLimit</b> (429 after N requests per client), <b>Timing</b> (adds an <code>X-Time-Us</code> header). The final handler routes to an endpoint.</p>`,
    constraints: `Up to 20 middlewares; requests from many threads; middlewares must be stateless or thread-safe. Build the chain once, not per request.`,
    example: `<p>No token → ${H.c('r', '401')} (endpoint never runs). Token, 3rd request with limit 2 → ${H.c('r', '429')}. Token, endpoint throws → ${H.c('r', '500 from ErrorBoundary')}. Normal → ${H.c('g', '200 with X-Time-Us header')}.</p>`,
    brute: { why: `<p>One giant <code>handle()</code> with sequential if-blocks: try { if (!token) return 401; if (rate…) return 429; long t = …; resp = route(); resp.header(…) } catch … Every new concern edits it; ordering is implicit in code position; post-processing (headers) and short-circuits interleave confusingly; nothing can be reused in another service.</p>`, code: `class NaiveServer {
    final Map<String, Integer> hits = new HashMap<>();
    String handle(String token, String client, String path) {
        try {
            if (token == null) return "401";
            if (hits.merge(client, 1, Integer::sum) > 2) return "429";   // not thread-safe either
            long t0 = System.nanoTime();
            if (path.equals("/boom")) throw new IllegalStateException("bug");
            String body = "200 " + path;
            return body + " X-Time-Us=" + (System.nanoTime() - t0) / 1000;
        } catch (RuntimeException e) { return "500"; }
    }
}` },
    mcq: { q: 'Why must ErrorBoundary be the OUTERMOST middleware?', options: ['So exceptions thrown by any inner middleware or the endpoint propagate up into its try/catch', 'Because it is the fastest', 'So it runs after the response is sent', 'Order does not matter'], answer: 0, explain: 'In the onion model, a middleware can only catch exceptions from what runs inside its next() call. Outermost = wraps everything.' },
    hints: [`<p>Hint 1: <code>interface Middleware { Response handle(Request r, Function&lt;Request, Response&gt; next); }</code>. Store (order, seq, middleware) and sort once.</p>`, `<p>Hint 2: Pre-compose the chain into a single <code>Function&lt;Request, Response&gt;</code> by folding from the innermost: <code>f = r -&gt; m.handle(r, inner)</code>.</p>`, `<p>Hint 3: Responses with headers: an immutable record with a <code>withHeader</code> method. RateLimit uses <code>ConcurrentHashMap.merge</code>. Mark the chain "built" and rebuild if a middleware is added later.</p>`],
    solution: {
      approach: `<p>Middlewares are Chain-of-Responsibility handlers in the onion style. Registration stores them with (order, sequence). <code>build()</code> sorts them and folds from the innermost outward, producing one composed function — so per-request cost is just the calls themselves, with no list walking or allocation for the chain. Each middleware decides to short-circuit, delegate, or post-process. The ErrorBoundary has the lowest order so its try/catch wraps everything. Rate limiting uses a concurrent map so the shared middleware is thread-safe.</p>`,
      code: `record Req(String path, String token, String client) {}
record Resp(int status, String body, Map<String, String> headers) {
    Resp(int status, String body) { this(status, body, Map.of()); }
    Resp withHeader(String k, String v) {
        Map<String, String> h = new LinkedHashMap<>(headers); h.put(k, v);
        return new Resp(status, body, Collections.unmodifiableMap(h));
    }
}
@FunctionalInterface interface Mw { Resp handle(Req r, Function<Req, Resp> next); }

class Server {
    private record Entry(int order, int seq, Mw mw) {}
    private final List<Entry> entries = new ArrayList<>();
    private final Function<Req, Resp> endpoint;
    private volatile Function<Req, Resp> chain;

    Server(Function<Req, Resp> endpoint) { this.endpoint = endpoint; }

    synchronized Server use(int order, Mw mw) { entries.add(new Entry(order, entries.size(), mw)); chain = null; return this; }

    private synchronized Function<Req, Resp> build() {
        if (chain != null) return chain;
        List<Entry> sorted = new ArrayList<>(entries);
        sorted.sort(Comparator.comparingInt(Entry::order).thenComparingInt(Entry::seq));
        Function<Req, Resp> f = endpoint;
        for (int i = sorted.size() - 1; i >= 0; i--) {          // fold innermost -> outermost
            Mw m = sorted.get(i).mw(); Function<Req, Resp> inner = f;
            f = r -> m.handle(r, inner);
        }
        return chain = f;
    }

    Resp handle(Req r) { Function<Req, Resp> c = chain; return (c != null ? c : build()).apply(r); }

    public static void main(String[] args) {
        Map<String, Integer> hits = new ConcurrentHashMap<>();
        Server s = new Server(r -> {
            if (r.path().equals("/boom")) throw new IllegalStateException("endpoint bug");
            return new Resp(200, "ok " + r.path());
        });
        s.use(30, (r, next) -> hits.merge(r.client(), 1, Integer::sum) > 2 ? new Resp(429, "slow down") : next.apply(r))
         .use(20, (r, next) -> r.token() == null ? new Resp(401, "login") : next.apply(r))
         .use(0, (r, next) -> { try { return next.apply(r); } catch (RuntimeException e) { return new Resp(500, "error: " + e.getMessage()); } })
         .use(10, (r, next) -> { long t = System.nanoTime(); Resp res = next.apply(r); return res.withHeader("X-Time-Us", String.valueOf((System.nanoTime() - t) / 1000)); });
        System.out.println(s.handle(new Req("/a", null, "c1")).status());          // 401
        System.out.println(s.handle(new Req("/a", "t", "c1")).headers().keySet()); // 200 + [X-Time-Us]
        System.out.println(s.handle(new Req("/boom", "t", "c2")).status());       // 500
        s.handle(new Req("/a", "t", "c1"));
        System.out.println(s.handle(new Req("/a", "t", "c1")).status());          // 429
    }
}`,
      complexity: `<p>Build: O(M log M) once. Per request: O(M) middleware calls, zero chain allocation. Rate limiter O(1) per request.</p>`,
      followUps: ['Make per-route middleware (only /admin needs an extra role check)', 'Add async (CompletableFuture) middlewares without blocking threads', 'How does this map to Servlet filters / Spring Security?']
    }
  });

  practice.push({
    title: 'Notification Dispatcher (Observer + Strategy + Chain Fallback)', level: 'Hard', tags: ['observer', 'strategy', 'chain of responsibility', 'machine coding'], companies: ['Swiggy', 'Uber', 'Airbnb', 'Amazon'],
    statement: `<p>Services publish domain events (e.g. <code>ORDER_SHIPPED</code>, <code>PAYMENT_FAILED</code>). Users subscribe to event types. Each user has an ordered list of preferred channels (e.g. PUSH → SMS → EMAIL). When an event is published, every subscribed user must be notified through the <b>first channel that succeeds</b> (a channel may fail: no device token, SMS gateway down). Record a delivery log (user, event, channel or FAILED). New channels (WhatsApp) and new event types must be addable without modifying the dispatcher.</p>`,
    constraints: `Up to 10<sup>5</sup> users, 50 event types. Publishing for one type must not scan users of other types. Channel implementations may throw; treat that as failure.`,
    example: `<p>Asha subscribes ORDER_SHIPPED with [PUSH, SMS]; Ben with [SMS, EMAIL]. SMS gateway is down. publish(ORDER_SHIPPED) → Asha: ${H.c('g', 'PUSH ok')}; Ben: SMS ${H.c('r', 'fails')} → ${H.c('g', 'EMAIL ok')}. If all channels fail → log ${H.c('r', 'FAILED')} for retry later.</p>`,
    brute: { why: `<p>A dispatcher with a switch over event types and, inside, nested if/else per user preference: <code>if (pref == "PUSH") { if (!push(u)) { if (second == "SMS") … } }</code>. Fallback depth is hard-coded, channels are concrete calls, all users are scanned for each event, and adding WhatsApp touches every branch.</p>`, code: `class NaiveDispatcher {
    record U(String name, String type, String first, String second) {}
    final List<U> users = new ArrayList<>();
    boolean send(String channel, U u) { return !channel.equals("SMS"); }           // pretend SMS is down
    void publish(String type) {
        for (U u : users) {                                                          // scans everyone
            if (!u.type().equals(type)) continue;
            if (u.first().equals("PUSH")) { if (!send("PUSH", u) && u.second().equals("EMAIL")) send("EMAIL", u); }
            else if (u.first().equals("SMS")) { if (!send("SMS", u) && u.second().equals("EMAIL")) send("EMAIL", u); }
            // fallback depth fixed at 2, WhatsApp = more branches
        }
    }
}` },
    mcq: { q: 'Which pattern decides "try PUSH, then SMS, then EMAIL until one works"?', options: ['Chain of Responsibility built per user from their preference list', 'Observer', 'Visitor', 'Memento'], answer: 0, explain: 'Each channel handler either succeeds (stops) or passes to the next. Observer decides WHO hears the event; Strategy encapsulates HOW each channel sends; the chain decides WHICH channel ends up delivering.' },
    hints: [`<p>Hint 1: Three questions, three patterns: who receives (Observer, keyed by event type), how a channel sends (Strategy: <code>Channel.send(user, msg)</code>), which channel wins (Chain: try in order until success).</p>`, `<p>Hint 2: Registry <code>Map&lt;String, Channel&gt;</code> lets new channels plug in by name. Subscriptions: <code>Map&lt;EventType, List&lt;Subscription&gt;&gt;</code> where a subscription holds the user and their ordered channel names.</p>`, `<p>Hint 3: The fallback loop catches exceptions per channel; log the winning channel or FAILED. Use concurrent collections; deliver asynchronously in production (mention it).</p>`],
    solution: {
      approach: `<p><b>Observer:</b> the dispatcher keeps subscriptions per event type, so publish touches only interested users. <b>Strategy:</b> each channel implements <code>Channel</code> and is registered by name — WhatsApp is a new class plus one <code>register</code> call. <b>Chain of Responsibility:</b> for each user, channels are tried in the user's preference order; a channel that returns false or throws passes the job to the next; the first success stops the chain. Every attempt result goes to a delivery log for retries and analytics.</p>`,
      code: `record Event(String type, String payload) {}
record Delivery(String user, String eventType, String channel) {}

interface Channel { boolean send(String user, String message); }

class NotificationDispatcher {
    private record Subscription(String user, List<String> channelOrder) {}
    private final Map<String, Channel> channels = new ConcurrentHashMap<>();
    private final Map<String, List<Subscription>> subs = new ConcurrentHashMap<>();
    final List<Delivery> log = new CopyOnWriteArrayList<>();

    void registerChannel(String name, Channel c) { channels.put(name, c); }           // Strategy registry

    void subscribe(String user, String eventType, List<String> channelOrder) {      // Observer
        subs.computeIfAbsent(eventType, k -> new CopyOnWriteArrayList<>()).add(new Subscription(user, List.copyOf(channelOrder)));
    }

    void publish(Event e) {
        for (Subscription s : subs.getOrDefault(e.type(), List.of())) {
            String winner = deliver(s, "[" + e.type() + "] " + e.payload());
            log.add(new Delivery(s.user(), e.type(), winner));
        }
    }

    // Chain of Responsibility: first channel that succeeds handles it.
    private String deliver(Subscription s, String msg) {
        for (String name : s.channelOrder()) {
            Channel c = channels.get(name);
            if (c == null) continue;                                   // unknown channel: skip
            try { if (c.send(s.user(), msg)) return name; }
            catch (RuntimeException ex) { System.out.println(name + " threw for " + s.user() + ": " + ex.getMessage()); }
        }
        return "FAILED";
    }

    public static void main(String[] args) {
        NotificationDispatcher d = new NotificationDispatcher();
        d.registerChannel("PUSH", (u, m) -> { if (u.equals("ben")) return false; System.out.println("push  -> " + u + " " + m); return true; });
        d.registerChannel("SMS", (u, m) -> { throw new IllegalStateException("gateway down"); });
        d.registerChannel("EMAIL", (u, m) -> { System.out.println("email -> " + u + " " + m); return true; });
        d.subscribe("asha", "ORDER_SHIPPED", List.of("PUSH", "SMS"));
        d.subscribe("ben", "ORDER_SHIPPED", List.of("SMS", "EMAIL"));
        d.subscribe("cy", "ORDER_SHIPPED", List.of("SMS"));
        d.publish(new Event("ORDER_SHIPPED", "A1 is on the way"));
        d.publish(new Event("PAYMENT_FAILED", "nobody subscribed"));
        d.log.forEach(System.out::println);
    }
}`,
      complexity: `<p>publish: O(S × C) where S = subscribers of that event type and C = channels tried per user (small). Subscribe O(S) copy-on-write. Memory O(subscriptions + log).</p>`,
      followUps: ['Retry FAILED deliveries with exponential backoff (a Command queue)', 'Quiet hours per user — which pattern/where?', 'Scale out: Kafka topics per event type, consumer groups per channel']
    }
  });

  practice.push({
    title: 'Spreadsheet Recalculation with Dependency Observers', level: 'Hard', tags: ['observer', 'graph', 'topological sort'], companies: ['Microsoft', 'Google', 'Airtable'],
    statement: `<p>Cells are named like <code>A1</code>. <code>setValue(cell, number)</code> stores a number; <code>setSum(cell, refs...)</code> makes the cell a formula equal to the sum of the referenced cells (missing cells count as 0). Whenever a cell changes, every cell that depends on it (directly or indirectly) must update automatically — each dependent recomputed <b>exactly once</b>, after all of its inputs. A formula that would create a cycle (A1 = B1, B1 = A1) must be rejected and leave the sheet unchanged.</p>`,
    constraints: `Up to 10<sup>4</sup> cells, each formula up to 50 refs. Recalculation after a change must touch only affected cells.`,
    example: `<p>A1=2, A2=3, B1=SUM(A1,A2) → 5, C1=SUM(B1,A1) → 7. setValue(A1, 10) → ${H.c('g', 'B1=13, then C1=23')} (C1 recomputed once, after B1). setSum(A1, C1) → ${H.c('r', 'rejected: cycle A1 → C1 → A1')}.</p>`,
    brute: { why: `<p>On every change, recompute <b>every</b> formula cell, repeating passes until nothing changes. That wastes work on unrelated cells, recomputes some cells many times, may show inconsistent intermediate values ("glitches") to listeners, and loops forever on a cycle.</p>`, code: `class NaiveSheet {
    final Map<String, Double> val = new HashMap<>();
    final Map<String, List<String>> formula = new HashMap<>();
    void recalcAll() {
        boolean changed = true;
        while (changed) {                                   // infinite loop if there is a cycle
            changed = false;
            for (var e : formula.entrySet()) {              // touches every formula, every pass
                double s = 0;
                for (String r : e.getValue()) s += val.getOrDefault(r, 0.0);
                if (!Objects.equals(val.put(e.getKey(), s), s)) changed = true;
            }
        }
    }
}` },
    mcq: { q: 'C1 depends on B1 and A1; B1 depends on A1. A1 changes. Why recompute in topological order?', options: ['So C1 is computed once, after B1 has its new value (no glitch, no double work)', 'Because alphabetical order is required', 'To detect cycles', 'It does not matter'], answer: 0, explain: 'Naive observer push would update C1 when A1 changes (with stale B1) and again when B1 changes. Topological order over the affected subgraph computes each cell once with fresh inputs.' },
    hints: [`<p>Hint 1: Each cell keeps its <b>inputs</b> (refs) and its <b>observers</b> (dependents). Changing a cell notifies its dependents — Observer — but do it in a batch.</p>`, `<p>Hint 2: On change: collect all affected cells by DFS/BFS over dependents; then Kahn's topological sort restricted to that set (in-degree = number of affected inputs); recompute in that order.</p>`, `<p>Hint 3: Cycle check before installing a formula: DFS from each ref along <i>inputs</i>; if you reach the target cell, reject. When replacing a formula, remove the cell from its old inputs' dependent sets.</p>`],
    solution: {
      approach: `<p>Model the sheet as a dependency graph. Every cell stores its inputs and its dependents (observers). Installing a formula first checks for cycles by searching from each new input through inputs for the target cell; if found, nothing changes. Otherwise old edges are removed and new ones added. Any change triggers a <b>batched</b> notification: gather the affected set (all transitive dependents), order it topologically with Kahn's algorithm restricted to that set, and recompute each cell once. This gives glitch-free, minimal recalculation — the same idea used by Excel and reactive UI frameworks.</p>`,
      code: `class Sheet {
    private final Map<String, Double> value = new HashMap<>();
    private final Map<String, List<String>> inputs = new HashMap<>();      // formula refs
    private final Map<String, Set<String>> dependents = new HashMap<>();   // observers

    double get(String c) { return value.getOrDefault(c, 0.0); }

    void setValue(String cell, double v) {
        detach(cell);
        value.put(cell, v);
        propagate(cell);
    }

    boolean setSum(String cell, String... refs) {
        for (String r : refs) if (reaches(r, cell)) return false;         // would create a cycle
        detach(cell);
        inputs.put(cell, List.of(refs));
        for (String r : refs) dependents.computeIfAbsent(r, k -> new HashSet<>()).add(cell);
        value.put(cell, compute(cell));
        propagate(cell);
        return true;
    }

    private void detach(String cell) {
        List<String> old = inputs.remove(cell);
        if (old != null) for (String r : old) dependents.getOrDefault(r, new HashSet<>()).remove(cell);
    }

    // DFS along inputs: does 'from' (transitively) read 'target'?
    private boolean reaches(String from, String target) {
        Deque<String> st = new ArrayDeque<>(List.of(from)); Set<String> seen = new HashSet<>();
        while (!st.isEmpty()) {
            String c = st.pop();
            if (c.equals(target)) return true;
            if (seen.add(c)) st.addAll(inputs.getOrDefault(c, List.of()));
        }
        return false;
    }

    private double compute(String cell) {
        double s = 0;
        for (String r : inputs.get(cell)) s += get(r);
        return s;
    }

    // Batched observer notification: each affected cell recomputed once, inputs first.
    private void propagate(String changed) {
        Set<String> affected = new LinkedHashSet<>();
        Deque<String> q = new ArrayDeque<>(dependents.getOrDefault(changed, Set.of()));
        while (!q.isEmpty()) { String c = q.poll(); if (affected.add(c)) q.addAll(dependents.getOrDefault(c, Set.of())); }
        Map<String, Integer> indeg = new HashMap<>();
        for (String c : affected) {
            int d = 0;
            for (String r : inputs.get(c)) if (affected.contains(r)) d++;
            indeg.put(c, d);
        }
        Deque<String> ready = new ArrayDeque<>();
        indeg.forEach((c, d) -> { if (d == 0) ready.add(c); });
        while (!ready.isEmpty()) {
            String c = ready.poll();
            value.put(c, compute(c));
            System.out.println("  recompute " + c + " = " + get(c));
            for (String dep : dependents.getOrDefault(c, Set.of()))
                if (affected.contains(dep) && indeg.merge(dep, -1, Integer::sum) == 0) ready.add(dep);
        }
    }

    public static void main(String[] args) {
        Sheet s = new Sheet();
        s.setValue("A1", 2); s.setValue("A2", 3);
        s.setSum("B1", "A1", "A2");
        s.setSum("C1", "B1", "A1");
        System.out.println("set A1 = 10:");
        s.setValue("A1", 10);
        System.out.println("B1=" + s.get("B1") + " C1=" + s.get("C1"));        // 13.0 23.0
        System.out.println("cycle accepted? " + s.setSum("A1", "C1"));         // false
        System.out.println("A1 still " + s.get("A1"));
    }
}`,
      complexity: `<p>Change: O(V<sub>a</sub> + E<sub>a</sub>) over the affected subgraph only. Cycle check: O(V + E) worst case over the inputs reachable from the new refs. Memory O(cells + references).</p>`,
      followUps: ['Support other functions (MIN, AVG, IF) — Strategy per function or a Visitor over a formula AST?', 'Undo for cell edits (Command storing old value or old formula)', 'Recalculate in parallel: which cells can run concurrently? (same topological level)']
    }
  });

  /* ======================= QUIZ ======================= */
  quiz.push(
    { q: 'A checkout must support flat, percentage and festive discounts, chosen by marketing at runtime. Which pattern fits best?', options: ['Strategy', 'Observer', 'Memento', 'Iterator'], answer: 0, explain: 'Interchangeable algorithms behind one interface, selected at runtime, is the definition of Strategy.' },
    { q: 'Strategy and State have the same class diagram. What is the key difference?', options: ['In State, the state objects themselves trigger transitions to the next state; in Strategy the client chooses', 'State uses inheritance, Strategy uses interfaces', 'Strategy cannot be changed at runtime', 'State has no context object'], answer: 0, explain: 'Who switches the object is the tell: client-driven = Strategy; self-driven transitions = State.' },
    { q: 'In a text editor, after undoing two steps the user types a new character. What happens to the redo stack?', options: ['It is cleared', 'It is kept so redo still works', 'Its top element is executed', 'It is merged into the undo stack'], answer: 0, explain: 'The new action creates a new history branch; old redo entries refer to a future that no longer exists and could corrupt the document.' },
    { q: 'An observer throws an exception while being notified. What should a robust subject do?', options: ['Catch it per observer, log it, and continue notifying the others', 'Stop notifying and rethrow', 'Unsubscribe every observer', 'Retry forever'], answer: 0, explain: 'Failure isolation: one broken listener must not prevent delivery to the rest.' },
    { q: 'Why is the template method usually declared <code>final</code>?', options: ['So subclasses cannot change the order of steps or skip mandatory ones', 'For performance', 'Because abstract methods require it', 'To allow multiple inheritance'], answer: 0, explain: 'The template method is the guarantee of the algorithm skeleton; overriding it would defeat the pattern.' },
    { q: 'An expense of ₹9,99,999 passes TeamLead, Manager, Director and CFO without anyone approving. Which design element prevents it from silently disappearing?', options: ['A terminal default handler / explicit "unhandled" result at the end of the chain', 'A larger limit for the CFO', 'Making the chain circular', 'Observer notifications'], answer: 0, explain: 'Chain of Responsibility does not guarantee handling; you must define what happens at the end of the chain.' },
    { q: 'A BST iterator using an explicit stack has which complexity per next() call?', options: ['O(1) amortised, O(h) memory', 'O(N) per call', 'O(log N) memory always, O(N) time', 'O(1) worst case, O(N) memory'], answer: 0, explain: 'Each node is pushed and popped exactly once over the whole traversal; the stack holds at most one root-to-leaf path.' },
    { q: 'Ten UI widgets each enable/disable others based on their values. What pattern reduces their N×N coupling?', options: ['Mediator (a dialog object coordinating the widgets)', 'Iterator', 'Template Method', 'Memento'], answer: 0, explain: 'Colleagues talk only to the mediator, which holds the interaction rules in one place.' },
    { q: 'In the Memento pattern, who is allowed to read the snapshot\'s internal fields?', options: ['Only the originator that created it', 'The caretaker', 'Any class in the application', 'Nobody, not even the originator'], answer: 0, explain: 'The caretaker stores mementos opaquely; only the originator reads them back during restore — this preserves encapsulation.' },
    { q: 'Why does Visitor need an <code>accept(visitor)</code> method on each element?', options: ['To achieve double dispatch: pick the method by both the element\'s and the visitor\'s runtime types', 'To make elements serializable', 'Because Java has no interfaces', 'To iterate children in order'], answer: 0, explain: 'Java overload resolution uses static types; accept() lets each element call the correctly typed visitX(this).' },
    { q: 'Visitor makes which kind of change cheap?', options: ['Adding a new operation over existing element types', 'Adding a new element type', 'Renaming element classes', 'Changing the traversal order of a list'], answer: 0, explain: 'New operation = one new visitor class. New element type = a new method in every visitor (the expression problem).' },
    { q: 'You need undo for an "apply Gaussian blur" action that cannot be mathematically reversed. Best choice?', options: ['Take a Memento (snapshot) before applying, restore it on undo', 'A Command whose undo() applies "un-blur"', 'Observer', 'Chain of Responsibility'], answer: 0, explain: 'Non-invertible operations need state snapshots; Command-style inverse operations only work when an inverse exists.' },
    { q: 'Calling <code>list.remove(x)</code> inside a for-each over an ArrayList typically causes…', options: ['ConcurrentModificationException from the fail-fast iterator', 'Silent success', 'A compile error', 'An infinite loop'], answer: 0, explain: 'The iterator detects a structural modification via modCount. Use iterator.remove() or removeIf().' },
    { q: 'Which pairing of pattern and JDK/framework example is correct?', options: ['Runnable submitted to an ExecutorService — Command', 'Comparator — Observer', 'AbstractList — Mediator', 'Servlet FilterChain — Memento'], answer: 0, explain: 'Runnable is a command object executed by an invoker (executor). Comparator is Strategy, AbstractList is Template Method, FilterChain is Chain of Responsibility.' }
  );

  /* ======================= INTERVIEW ======================= */
  interview.push(
    { q: 'What are behavioral design patterns, and how do they differ from creational and structural ones?', level: 'B', a: `<p><b>Creational</b> patterns are about <i>creating</i> objects (Factory, Builder, Singleton). <b>Structural</b> patterns are about <i>composing</i> objects into bigger structures (Adapter, Decorator, Composite). <b>Behavioral</b> patterns are about <i>communication and responsibility at runtime</i>: who decides, who notifies whom, how a request travels, how actions are stored or undone. The GoF list has 11 (the ten in this module plus Interpreter). In interviews they show up as requirements: "pluggable pricing" (Strategy), "notify subscribers" (Observer), "undo" (Command/Memento), "order lifecycle" (State).</p>`, followUps: ['Name one behavioral pattern you used in a real project and why', 'Which behavioral pattern is built into Java\'s for-each loop?'] },
    { q: 'Strategy vs State — they look identical. How do you explain the difference?', level: 'I', a: `<p>Both have a context holding a reference to an interface with several implementations. <b>Strategy</b>: the <i>client</i> picks an algorithm and the strategies are independent and unaware of each other (payment methods, sort orders). <b>State</b>: the object's behaviour changes with its internal mode, and <i>the states themselves</i> decide the next state (PaidState.ship() moves the order to Shipped). Clues: State has transitions and illegal actions; Strategy has interchangeable, equally valid choices. A vending machine is State; its pricing algorithm could be a Strategy inside it.</p>`, followUps: ['Can a State object hold a Strategy?', 'When would you use an enum transition table instead of State classes?'] },
    { q: 'Design undo/redo for a text editor. Which pattern(s) and data structures?', level: 'I', a: `<p>Use <b>Command</b>: each edit is an object with <code>execute()</code>/<code>undo()</code> that stores only what it needs (position, inserted text, deleted text). An invoker keeps two stacks: run → execute, push on undo stack, <b>clear redo</b>; undo → pop, undo(), push on redo; redo → pop, execute(), push on undo. Coalesce consecutive keystrokes into one command (merge within a time window) and wrap multi-step operations in a MacroCommand. Cap history length. For non-invertible operations (filters, reformat-all) store a <b>Memento</b> snapshot inside the command. For collaborative editing, positions must be transformed (OT/CRDT).</p>`, followUps: ['How much memory does your design use for a 50 MB document?', 'How do you implement "undo typing" as a single step for a whole word?'] },
    { q: 'What problems can Observer cause in production, and how do you mitigate them?', level: 'A', a: `<p>(1) <b>Memory leaks</b> from forgotten subscriptions (lapsed listeners) — return closeable subscription handles, tie them to lifecycles, or use weak references carefully. (2) <b>Concurrency</b> — mutating the list while notifying (CME) → CopyOnWriteArrayList; never notify while holding a lock (deadlock with re-entrant callbacks). (3) <b>Failure isolation</b> — wrap each callback in try/catch. (4) <b>Slow observers</b> block the subject — deliver asynchronously via executors/queues, with back-pressure. (5) <b>Cascades/re-entrancy</b> — an observer changing the subject triggers nested notifications; queue events. (6) <b>Ordering</b> — never rely on notification order. (7) Hard-to-follow control flow — log events and name them clearly.</p>`, followUps: ['How does java.util.concurrent.Flow add back-pressure?', 'When do you move from in-process Observer to Kafka?'] },
    { q: 'Explain Chain of Responsibility with two real examples that use different semantics.', level: 'I', a: `<p>Handlers are linked; a request is passed along until handled. <b>First-match semantics</b>: expense approval (TeamLead ≤ ₹1k → Manager ≤ ₹10k → Director …) or ATM note dispensing — once someone handles it, the walk stops. <b>Pipeline semantics</b>: servlet filters / Express middleware / logging appenders — each handler does its part and calls next; any may short-circuit (401, 429). Key design points: build the chain in one place (config/DI), define what happens at the end (default handler), keep handlers stateless/thread-safe, and prefer a list-based pipeline over deep recursion for long chains.</p>`, followUps: ['How is CoR different from Decorator?', 'Where must an error-handling middleware sit and why?'] },
    { q: 'When would you choose Template Method over Strategy, and vice versa?', level: 'I', a: `<p><b>Template Method</b> (inheritance): the algorithm skeleton is fixed and owned by a base class; subclasses override a few steps; the variation is chosen at compile time by picking the subclass. Good when steps share lots of protected state and the family is small and stable (importers, servlets, AbstractList). <b>Strategy</b> (composition): the varying step is an object passed in and swappable at runtime; strategies can be mixed and reused, and you avoid deep hierarchies and the fragile base class problem. If variations multiply combinatorially (format × validation × destination), Template Method explodes into many subclasses — switch to strategies. Many designs combine them: a final template method that delegates a step to an injected strategy.</p>`, followUps: ['What is the Hollywood Principle?', 'Why should you never call overridable methods from a constructor?'] },
    { q: 'How would you implement an iterator over a binary search tree that uses less than O(N) memory?', level: 'I', a: `<p>Simulate in-order traversal with an explicit stack. Constructor pushes the left spine of the root. <code>next()</code> pops the top (the smallest unvisited value), then pushes the left spine of its right child, and returns the value. <code>hasNext()</code> is just "stack not empty" — idempotent. Memory is O(h) (log N if balanced) and <code>next()</code> is O(1) amortised because every node is pushed and popped exactly once. Implement <code>Iterator&lt;Integer&gt;</code>, throw NoSuchElementException when exhausted, and mention fail-fast behaviour if the tree is mutated during iteration.</p>`, followUps: ['How would you support prev()?', 'How would you make it fail-fast on concurrent modification?'] },
    { q: 'Observer vs Mediator vs Pub/Sub — what is the difference?', level: 'A', a: `<p><b>Observer</b>: a subject keeps direct references to observers and broadcasts changes one-to-many; it contains no coordination logic. <b>Mediator</b>: many colleagues talk only to a central object that contains the <i>rules</i> of their interaction (chat room routing, control tower assigning runways) — many-to-many with logic in the hub. <b>Pub/Sub</b>: publishers and subscribers are fully decoupled by a broker and topics; they do not know each other at all, and the broker can persist, replay and distribute across machines (Kafka, SNS). A mediator is often implemented using observer-style callbacks; pub/sub is Observer scaled out with a broker in between.</p>`, followUps: ['Orchestration vs choreography in sagas — which pattern is which?', 'How do you prevent a mediator becoming a god object?'] },
    { q: 'Memento vs Command for undo — trade-offs?', level: 'A', a: `<p><b>Command</b> stores the operation and its inverse data (inserted text, previous value): memory proportional to the edit, fast, but every operation needs a correct inverse and positions can go stale. <b>Memento</b> stores the state itself: works for any operation including non-invertible ones, simple to reason about, but memory proportional to the state per snapshot — mitigated by deltas, copy-on-write or immutable/persistent data structures with structural sharing. Real systems combine them: command log for fine-grained undo plus periodic snapshots (checkpoints) to bound replay time — exactly how databases combine a WAL with checkpoints and how event sourcing uses snapshots.</p>`, followUps: ['How do you keep a memento from leaking private state?', 'What does restore NOT undo?'] },
    { q: 'Explain double dispatch and why the Visitor pattern needs accept().', level: 'A', a: `<p>Java selects <i>overloaded</i> methods at compile time using static argument types, and selects <i>overridden</i> methods at runtime using only the receiver's type (single dispatch). With <code>Expr e = new Add(...)</code>, calling <code>visitor.visit(e)</code> cannot select <code>visit(Add)</code>. Visitor bounces: <code>e.accept(v)</code> dispatches on the element's runtime type; inside <code>Add.accept</code>, <code>this</code> is statically an <code>Add</code>, so <code>v.visitAdd(this)</code> is chosen, and that call dispatches on the visitor's runtime type. Two virtual calls select the (element, operation) pair. Java 21 sealed interfaces with pattern-matching switch achieve the same with compiler-checked exhaustiveness and no accept boilerplate.</p>`, followUps: ['What is the expression problem?', 'When would you still prefer classic Visitor over sealed + switch?'] },
    { q: 'Design an order lifecycle (NEW → PAID → SHIPPED → DELIVERED, cancellable before shipping) so that illegal transitions are impossible and concurrent requests are safe.', level: 'A', a: `<p>Draw the state diagram first. Implement State: an <code>OrderState</code> interface whose default methods throw IllegalStateException; each state overrides only legal events and returns/sets the next state, with entry actions (charge, refund, notify). Terminal states override nothing. Concurrency: in memory, synchronize transitions; in a database, use a conditional update — <code>UPDATE orders SET status='PAID', version=version+1 WHERE id=? AND status='NEW' AND version=?</code> — and treat 0 rows as a lost race. Persist the state name, rebuild the state object on load. Publish an event per transition (Observer) for emails/analytics, and keep an audit log of transitions.</p>`, followUps: ['How would you add ON_HOLD reachable from PAID?', 'How do you handle a payment webhook arriving twice?'] },
    { q: 'You are given a 400-line method full of if/else on a "type" field. How do you decide which behavioral pattern (if any) to refactor to?', level: 'E', a: `<p>First ask <b>what varies and who decides</b>. If branches choose <i>how to compute</i> something and the type is chosen by the caller → Strategy (registry map). If branches depend on the object's <i>current status</i> and change it → State. If branches ask "can this branch handle it, else try the next" → Chain of Responsibility. If the same ladder over the same <i>types</i> appears in many operations → Visitor or sealed + switch. If branches differ only in a few steps of a shared sequence → Template Method. Then refactor safely: characterisation tests first, extract one branch at a time behind the interface, keep behaviour identical, and stop when the axis of change is isolated — do not add patterns where variation is not real.</p>`, followUps: ['How do you make this refactor safe with no tests?', 'When is a switch statement the better design?'] },
    { q: 'How do behavioral patterns appear in AI/LLM applications and agent frameworks?', level: 'E', a: `<p><b>Command</b>: model tool calls are requests reified as data (name + JSON args) that the host validates, executes, logs and can undo. <b>Strategy</b>: model routing (cheap vs smart model), retrieval method, chunking policy. <b>Chain of Responsibility</b>: guardrail pipelines and fallback chains (cache → small model → large model → human). <b>Observer</b>: streaming token callbacks and tracing hooks. <b>State</b>: agent graphs (plan → act → observe → done) with persisted current state for resumption. <b>Mediator</b>: a supervisor/orchestrator agent coordinating worker agents. <b>Memento</b>: checkpointers that snapshot agent state for time-travel debugging and rollback of file edits. Naming these lets you reason about reliability: idempotent tool commands, bounded chains, terminal states and human approval gates.</p>`, followUps: ['How would you make agent tool calls safely undoable?', 'Why do agent frameworks model agents as explicit state graphs?'] },
    { q: 'Implement Observer in Java today: what would you use instead of java.util.Observable?', level: 'I', a: `<p><code>Observable</code> is deprecated since Java 9: it is a class (forcing inheritance), its notification order and thread-safety are unspecified, and <code>setChanged()</code> is awkward. Today: define a small functional interface (<code>PriceListener</code>) so observers can be lambdas; keep them in a <code>CopyOnWriteArrayList</code>; return an <code>AutoCloseable</code> handle from <code>subscribe</code>; isolate failures per observer; deliver asynchronously with an <code>Executor</code> when observers do I/O. For streams with back-pressure use <code>java.util.concurrent.Flow</code> / Reactor / RxJava; in Spring, <code>ApplicationEventPublisher</code> + <code>@EventListener</code>; for JavaBeans properties, <code>PropertyChangeSupport</code>.</p>`, followUps: ['What is back-pressure and when do you need it?', 'How do you test that an observer was notified exactly once?'] }
  );

  /* Spread correct answers across positions (all MCQs are authored with the right answer first). */
  function rotateMcq(q, k) {
    if (!q || !q.options) return;
    var n = q.options.length; k = k % n;
    if (!k || q.answer !== 0) return;
    var out = [];
    for (var j = 0; j < n; j++) out.push(q.options[(j - k + n) % n]);
    q.options = out; q.answer = k;
  }
  var mcqSeq = 0;
  quiz.forEach(function (q) { rotateMcq(q, (mcqSeq++ * 3 + 1)); });
  topics.forEach(function (t) { (t.problems || []).forEach(function (p) { rotateMcq(p.mcq, (mcqSeq++ * 3 + 1)); }); });
  practice.forEach(function (p) { rotateMcq(p.mcq, (mcqSeq++ * 3 + 1)); });

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
