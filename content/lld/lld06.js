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
  // python / TypeScript / C++ versions of the Java code panes, keyed by the exact Java text (registered where each pane is built)
  var ALTS = {};
  function mkAlt(py, ts, cpp, maps) {
    maps = maps || {};
    return { python: { code: py, map: maps.python || {} }, js: { lang: 'ts', code: ts, map: maps.ts || {} }, cpp: { code: cpp, map: maps.cpp || {} } };
  }
  function CODE(label, code, hl, alt) { return { type: 'code', label: label, lang: 'java', code: code, hl: hl || {}, alt: alt || ALTS[code] }; }
  function acceptAlt(t) {
    var snake = t.toLowerCase();
    return mkAlt('def accept(self, v):\n    return v.visit_' + snake + '(self)', 'accept<R>(v: ExprVisitor<R>): R {\n  return v.visit' + t + '(this);\n}', 'int accept(ExprVisitor& v) const override {\n  return v.visit' + t + '(*this);\n}');
  }
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
<p><b>Functions as strategies:</b> if the strategy interface has one method, a strategy can simply be a function. Java (a functional interface): <code>new Checkout(amt -&gt; amt * 0.9)</code>; Python: <code>Checkout(lambda amt: amt * 0.9)</code>; TypeScript: <code>new Checkout(amt =&gt; amt * 0.9)</code>; C++: <code>Checkout([](double amt) { return amt * 0.9; })</code> over a <code>std::function</code>. You already use this daily — Java's <code>Comparator</code>, Python's <code>sorted(key=...)</code> and JavaScript's <code>array.sort(compareFn)</code> are all strategies plugged into a sort that stays fixed.</p>`,
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
            System.out.println(r.name() + " -> " + String.format("%.2f", c.total(1000)));
        }
        c.setStrategy(amount -> amount - 50);              // a lambda is a strategy too
        System.out.println("Lambda -> " + String.format("%.2f", c.total(1000)));
    }
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from typing import Callable


# 1) The "socket": every discount rule must provide this one method.
class DiscountStrategy(ABC):
    @abstractmethod
    def apply(self, amount: float) -> float:  # returns the amount AFTER discount
        ...

    def name(self) -> str:
        return type(self).__name__


# 2) One small class per rule. Adding a rule never edits an old one.
class NoDiscount(DiscountStrategy):
    def apply(self, amount: float) -> float:
        return amount


class FlatOff(DiscountStrategy):
    def __init__(self, off: float, min_order: float):
        self._off, self._min_order = off, min_order

    def apply(self, amount: float) -> float:
        return amount - self._off if amount >= self._min_order else amount


class PercentOff(DiscountStrategy):
    def __init__(self, pct: float):
        self._pct = pct

    def apply(self, amount: float) -> float:
        return amount * (1 - self._pct / 100.0)


class FestiveCap(DiscountStrategy):  # 20% off, but at most 300
    def apply(self, amount: float) -> float:
        return amount - min(amount * 0.20, 300)


class FunctionStrategy(DiscountStrategy):  # wraps any function, like a Java lambda
    def __init__(self, fn: Callable[[float], float]):
        self._fn = fn

    def apply(self, amount: float) -> float:
        return self._fn(amount)


# 3) The context: uses a strategy, never asks "which one are you?"
class Checkout:
    def __init__(self):
        self._strategy: DiscountStrategy = NoDiscount()

    def set_strategy(self, s: DiscountStrategy) -> None:
        if s is None:
            raise ValueError("strategy required")
        self._strategy = s

    def total(self, cart_amount: float) -> float:
        after = self._strategy.apply(cart_amount)
        return round(after, 2)  # money rounding lives in ONE place


if __name__ == "__main__":
    c = Checkout()
    rules = [NoDiscount(), FlatOff(100, 500), PercentOff(10), FestiveCap()]
    for r in rules:
        c.set_strategy(r)  # swap at runtime
        print(f"{r.name()} -> {c.total(1000):.2f}")
    c.set_strategy(FunctionStrategy(lambda amount: amount - 50))  # a function is a strategy too
    print(f"Lambda -> {c.total(1000):.2f}")` },
          { lang: 'ts', code: `// 1) The "socket": every discount rule must provide this one method.
interface DiscountStrategy {
  apply(amount: number): number; // returns the amount AFTER discount
  name(): string;
}

// 2) One small class per rule. Adding a rule never edits an old one.
abstract class BaseStrategy implements DiscountStrategy {
  abstract apply(amount: number): number;
  name(): string { return this.constructor.name; }
}

class NoDiscount extends BaseStrategy {
  apply(amount: number): number { return amount; }
}

class FlatOff extends BaseStrategy {
  constructor(private readonly off: number, private readonly minOrder: number) { super(); }
  apply(amount: number): number { return amount >= this.minOrder ? amount - this.off : amount; }
}

class PercentOff extends BaseStrategy {
  constructor(private readonly pct: number) { super(); }
  apply(amount: number): number { return amount * (1 - this.pct / 100); }
}

class FestiveCap extends BaseStrategy { // 20% off, but at most 300
  apply(amount: number): number { return amount - Math.min(amount * 0.2, 300); }
}

// 3) The context: uses a strategy, never asks "which one are you?"
class Checkout {
  private strategy: DiscountStrategy = new NoDiscount();
  setStrategy(s: DiscountStrategy): void { this.strategy = s; }
  total(cartAmount: number): number {
    const after = this.strategy.apply(cartAmount);
    return Math.round(after * 100) / 100; // money rounding lives in ONE place
  }
}

const c = new Checkout();
const rules: DiscountStrategy[] = [new NoDiscount(), new FlatOff(100, 500), new PercentOff(10), new FestiveCap()];
for (const r of rules) {
  c.setStrategy(r); // swap at runtime
  console.log(\`\${r.name()} -> \${c.total(1000).toFixed(2)}\`);
}
c.setStrategy({ apply: (amount) => amount - 50, name: () => "Lambda" }); // an object literal is a strategy too
console.log(\`Lambda -> \${c.total(1000).toFixed(2)}\`);` },
          { lang: 'cpp', code: `// 1) The "socket": every discount rule must provide this one method.
class DiscountStrategy {
public:
    virtual ~DiscountStrategy() = default;
    virtual double apply(double amount) const = 0;  // returns the amount AFTER discount
    virtual string name() const = 0;
};

// 2) One small class per rule. Adding a rule never edits an old one.
class NoDiscount : public DiscountStrategy {
public:
    double apply(double amount) const override { return amount; }
    string name() const override { return "NoDiscount"; }
};
class FlatOff : public DiscountStrategy {
public:
    FlatOff(double off, double minOrder) : off(off), minOrder(minOrder) {}
    double apply(double amount) const override { return amount >= minOrder ? amount - off : amount; }
    string name() const override { return "FlatOff"; }
private:
    double off, minOrder;
};
class PercentOff : public DiscountStrategy {
public:
    explicit PercentOff(double pct) : pct(pct) {}
    double apply(double amount) const override { return amount * (1 - pct / 100.0); }
    string name() const override { return "PercentOff"; }
private:
    double pct;
};
class FestiveCap : public DiscountStrategy {  // 20% off, but at most 300
public:
    double apply(double amount) const override { return amount - min(amount * 0.20, 300.0); }
    string name() const override { return "FestiveCap"; }
};
class LambdaStrategy : public DiscountStrategy {  // wraps any callable
public:
    LambdaStrategy(string name, function<double(double)> fn) : label(std::move(name)), fn(std::move(fn)) {}
    double apply(double amount) const override { return fn(amount); }
    string name() const override { return label; }
private:
    string label;
    function<double(double)> fn;
};

// 3) The context: uses a strategy, never asks "which one are you?"
class Checkout {
public:
    void setStrategy(shared_ptr<const DiscountStrategy> s) {
        if (!s) throw invalid_argument("strategy required");
        strategy = std::move(s);
    }
    double total(double cartAmount) const {
        double after = strategy->apply(cartAmount);
        return round(after * 100) / 100.0;  // money rounding lives in ONE place
    }
private:
    shared_ptr<const DiscountStrategy> strategy = make_shared<NoDiscount>();
};

int main() {
    Checkout c;
    vector<shared_ptr<const DiscountStrategy>> rules = {
        make_shared<NoDiscount>(), make_shared<FlatOff>(100, 500),
        make_shared<PercentOff>(10), make_shared<FestiveCap>()};
    cout << fixed << setprecision(2);
    for (const auto& r : rules) {
        c.setStrategy(r);  // swap at runtime
        cout << r->name() << " -> " << c.total(1000) << "\\n";
    }
    c.setStrategy(make_shared<LambdaStrategy>("Lambda", [](double amount) { return amount - 50; }));  // a lambda is a strategy too
    cout << "Lambda -> " << c.total(1000) << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

// 1) The "socket": every discount rule must provide this one method.
interface IDiscountStrategy {
    double Apply(double amount);           // returns the amount AFTER discount
}
static class DiscountStrategyExt {
    public static string Name(this IDiscountStrategy s) { return s.GetType().Name; }
}

// 2) One small class per rule. Adding a rule never edits an old one.
class NoDiscount : IDiscountStrategy {
    public double Apply(double amount) { return amount; }
}
class FlatOff : IDiscountStrategy {
    private readonly double off, minOrder;
    public FlatOff(double off, double minOrder) { this.off = off; this.minOrder = minOrder; }
    public double Apply(double amount) { return amount >= minOrder ? amount - off : amount; }
}
class PercentOff : IDiscountStrategy {
    private readonly double pct;
    public PercentOff(double pct) { this.pct = pct; }
    public double Apply(double amount) { return amount * (1 - pct / 100.0); }
}
class FestiveCap : IDiscountStrategy {            // 20% off, but at most 300
    public double Apply(double amount) { return amount - Math.Min(amount * 0.20, 300); }
}
sealed class LambdaDiscount : IDiscountStrategy {  // a delegate is a strategy too
    private readonly Func<double, double> f; public LambdaDiscount(Func<double, double> f) { this.f = f; }
    public double Apply(double amount) { return f(amount); }
}

// 3) The context: uses a strategy, never asks "which one are you?"
class Checkout {
    private IDiscountStrategy strategy = new NoDiscount();
    public void SetStrategy(IDiscountStrategy s) { if (s == null) throw new ArgumentNullException("s"); strategy = s; }
    public double Total(double cartAmount) {
        double after = strategy.Apply(cartAmount);
        return Math.Round(after * 100, MidpointRounding.AwayFromZero) / 100.0;   // money rounding lives in ONE place
    }
}

class Program {
    static void Main() {
        Checkout c = new Checkout();
        List<IDiscountStrategy> rules = new List<IDiscountStrategy> { new NoDiscount(), new FlatOff(100, 500),
                                               new PercentOff(10), new FestiveCap() };
        foreach (IDiscountStrategy r in rules) {
            c.SetStrategy(r);                              // swap at runtime
            Console.WriteLine(r.Name() + " -> " + c.Total(1000).ToString("F2"));
        }
        c.SetStrategy(new LambdaDiscount(amount => amount - 50));
        Console.WriteLine("Lambda -> " + c.Total(1000).ToString("F2"));
    }
}` }
        ] }, { lang: 'java', title: 'Strategy registry: pick by key without if/else', code: `// When the strategy is chosen by a string (config, request param), use a Map, not a switch.
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
        for (ShippingSpeed s : ShippingSpeed.values()) System.out.println(s + " 2kg = " + String.format("%.2f", calc.cost(s, 2)));
    }
}`, alt: [
          { lang: 'python', code: `from enum import Enum, auto
from typing import Callable


# When the strategy is chosen by a string (config, request param), use a dict, not an if/elif ladder.
class ShippingSpeed(Enum):
    STANDARD = auto()
    EXPRESS = auto()
    SAME_DAY = auto()


class ShippingCalculator:
    def __init__(self):
        self._rules: dict[ShippingSpeed, Callable[[float], float]] = {
            ShippingSpeed.STANDARD: lambda kg: 40 + 10 * kg,
            ShippingSpeed.EXPRESS: lambda kg: 90 + 15 * kg,
            ShippingSpeed.SAME_DAY: lambda kg: 150 + 25 * kg,
        }

    # New speed? Add one enum member + one dict entry. No function body grows.
    def cost(self, speed: ShippingSpeed, kg: float) -> float:
        rule = self._rules.get(speed)
        if rule is None:
            raise ValueError(f"No rule for {speed.name}")
        return rule(kg)


if __name__ == "__main__":
    calc = ShippingCalculator()
    for s in ShippingSpeed:
        print(f"{s.name} 2kg = {calc.cost(s, 2):.2f}")` },
          { lang: 'ts', code: `// When the strategy is chosen by a string (config, request param), use a Map, not a switch.
type ShippingSpeed = "STANDARD" | "EXPRESS" | "SAME_DAY";

class ShippingCalculator {
  private readonly rules = new Map<ShippingSpeed, (kg: number) => number>([
    ["STANDARD", (kg) => 40 + 10 * kg],
    ["EXPRESS", (kg) => 90 + 15 * kg],
    ["SAME_DAY", (kg) => 150 + 25 * kg],
  ]);

  // New speed? Add one union member + one entry. No function body grows.
  cost(speed: ShippingSpeed, kg: number): number {
    const rule = this.rules.get(speed);
    if (rule === undefined) throw new Error(\`No rule for \${speed}\`);
    return rule(kg);
  }
}

const calc = new ShippingCalculator();
const speeds: ShippingSpeed[] = ["STANDARD", "EXPRESS", "SAME_DAY"];
for (const s of speeds) console.log(\`\${s} 2kg = \${calc.cost(s, 2).toFixed(2)}\`);` },
          { lang: 'cpp', code: `// When the strategy is chosen by a string (config, request param), use a map, not a switch.
enum class ShippingSpeed { STANDARD, EXPRESS, SAME_DAY };

string name(ShippingSpeed s) {
    switch (s) {
        case ShippingSpeed::STANDARD: return "STANDARD";
        case ShippingSpeed::EXPRESS: return "EXPRESS";
        case ShippingSpeed::SAME_DAY: return "SAME_DAY";
    }
    return "?";
}

class ShippingCalculator {
public:
    ShippingCalculator() {
        rules[ShippingSpeed::STANDARD] = [](double kg) { return 40 + 10 * kg; };
        rules[ShippingSpeed::EXPRESS] = [](double kg) { return 90 + 15 * kg; };
        rules[ShippingSpeed::SAME_DAY] = [](double kg) { return 150 + 25 * kg; };
    }

    // New speed? Add one enum constant + one entry. No function body grows.
    double cost(ShippingSpeed speed, double kg) const {
        auto it = rules.find(speed);
        if (it == rules.end()) throw invalid_argument("No rule for " + name(speed));
        return it->second(kg);
    }

private:
    map<ShippingSpeed, function<double(double)>> rules;
};

int main() {
    ShippingCalculator calc;
    cout << fixed << setprecision(2);
    for (ShippingSpeed s : {ShippingSpeed::STANDARD, ShippingSpeed::EXPRESS, ShippingSpeed::SAME_DAY})
        cout << name(s) << " 2kg = " << calc.cost(s, 2) << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

// When the strategy is chosen by a key (config, request param), use a Dictionary, not a switch.
enum ShippingSpeed { STANDARD, EXPRESS, SAME_DAY }

class ShippingCalculator {
    private readonly Dictionary<ShippingSpeed, Func<double, double>> rules = new Dictionary<ShippingSpeed, Func<double, double>>();

    public ShippingCalculator() {
        rules[ShippingSpeed.STANDARD] = kg => 40 + 10 * kg;
        rules[ShippingSpeed.EXPRESS] = kg => 90 + 15 * kg;
        rules[ShippingSpeed.SAME_DAY] = kg => 150 + 25 * kg;
    }

    // New speed? Add one enum constant + one entry. No method body grows.
    public double Cost(ShippingSpeed speed, double kg) {
        Func<double, double> rule;
        if (!rules.TryGetValue(speed, out rule)) throw new ArgumentException("No rule for " + speed);
        return rule(kg);
    }
}

class Program {
    static void Main() {
        ShippingCalculator calc = new ShippingCalculator();
        foreach (ShippingSpeed s in Enum.GetValues(typeof(ShippingSpeed))) Console.WriteLine(s + " 2kg = " + calc.Cost(s, 2).ToString("F2"));
    }
}` }
        ] }],
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
        ALTS[naive] = mkAlt(`def total(type, a):
    if type == "NONE": return a
    elif type == "FLAT": return a - 100 if a >= 500 else a
    elif type == "PERCENT": return a * 0.9
    elif type == "FESTIVE": return a - min(a * 0.2, 300)
    # every new rule = edit THIS method again
    raise ValueError(type)`, `total(type: string, a: number): number {
  if (type === "NONE") return a;
  else if (type === "FLAT") return a >= 500 ? a - 100 : a;
  else if (type === "PERCENT") return a * 0.9;
  else if (type === "FESTIVE") return a - Math.min(a * 0.2, 300);
  // every new rule = edit THIS method again
  throw new Error(type);
}`, `double total(const string& type, double a) {
  if (type == "NONE") return a;
  else if (type == "FLAT") return a >= 500 ? a - 100 : a;
  else if (type == "PERCENT") return a * 0.9;
  else if (type == "FESTIVE") return a - min(a * 0.2, 300.0);
  // every new rule = edit THIS method again
  throw invalid_argument(type);
}`);
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
          frames.push(F('Step ' + (i + 1) + 'b: <code>checkout.total(' + amt + ')</code> calls <code>strategy.apply(' + amt + ')</code>. The virtual call lands in <b>' + d.cls + '</b> (' + d.rule + '). Result: <b>₹' + after + '</b>.',
            [G('Runtime call path', nodes, edges, { h: 70, hl: hl2, ehl: eh2 }),
              VARS('Result', { before: amt, after: after, saved: Math.round((amt - after) * 100) / 100 }, { after: 'ok' }),
              CODE('What runs', 'double total(double a) {\n  double after = strategy.apply(a);\n  return round(after);\n}', { 2: 'ok' }, mkAlt('def total(self, a):\n    after = self.strategy.apply(a)\n    return round(after)', 'total(a: number): number {\n  const after = this.strategy.apply(a);\n  return round(after);\n}', 'double total(double a) {\n  double after = strategy->apply(a);\n  return round(after);\n}'))]));
          cur = d.cls;
        });
        frames.push(F('Summary: the <b>same</b> Checkout code produced ' + results.length + ' different answers just by plugging in different strategies. Adding a 5th rule = one new class; Checkout is ' + H.c('g', 'closed for modification, open for extension') + '.',
          [{ type: 'table', label: 'Strategy results for ₹' + amt, columns: ['Strategy', 'Rule', 'Before', 'After'], rows: results, hl: {} }]));
        return frames;
      }
    },
    examples: [
      { title: 'Comparator is a Strategy you already use', html: `<p><code>Collections.sort(list, comparator)</code>: the sort algorithm (context) is fixed; <b>how to compare two items</b> is the strategy. Sorting employees by salary, then by name, then by joining date needs zero changes to the sort code — just different comparators.</p>`, code: { lang: 'java', code: `record Emp(String name, int salary) {}
List<Emp> emps = new ArrayList<>(List.of(new Emp("Asha", 90), new Emp("Ben", 70), new Emp("Cy", 80)));
emps.sort(Comparator.comparingInt(Emp::salary));          // strategy 1
System.out.println(emps);
emps.sort(Comparator.comparing(Emp::name).reversed());    // strategy 2
System.out.println(emps);`, alt: [
          { lang: 'python', code: `from dataclasses import dataclass


@dataclass(frozen=True)
class Emp:
    name: str
    salary: int


emps = [Emp("Asha", 90), Emp("Ben", 70), Emp("Cy", 80)]
emps.sort(key=lambda e: e.salary)  # strategy 1
print(emps)
emps.sort(key=lambda e: e.name, reverse=True)  # strategy 2
print(emps)` },
          { lang: 'ts', code: `interface Emp { readonly name: string; readonly salary: number; }

const emps: Emp[] = [{ name: "Asha", salary: 90 }, { name: "Ben", salary: 70 }, { name: "Cy", salary: 80 }];
emps.sort((a, b) => a.salary - b.salary); // strategy 1
console.log(emps);
emps.sort((a, b) => b.name.localeCompare(a.name)); // strategy 2
console.log(emps);` },
          { lang: 'cpp', code: `struct Emp { string name; int salary; };

vector<Emp> emps = {{"Asha", 90}, {"Ben", 70}, {"Cy", 80}};
ranges::sort(emps, {}, &Emp::salary);                 // strategy 1
for (auto& e : emps) cout << e.name << ":" << e.salary << " ";
cout << "\\n";
ranges::sort(emps, greater<>(), &Emp::name);          // strategy 2
for (auto& e : emps) cout << e.name << ":" << e.salary << " ";
cout << "\\n";` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

sealed class Emp {
    public readonly string Name; public readonly int Salary;
    public Emp(string name, int salary) { Name = name; Salary = salary; }
    public override string ToString() { return "Emp[name=" + Name + ", salary=" + Salary + "]"; }
}
class Program {
    static void Main() {
        List<Emp> emps = new List<Emp> { new Emp("Asha", 90), new Emp("Ben", 70), new Emp("Cy", 80) };
        emps.Sort((a, b) => a.Salary.CompareTo(b.Salary));                        // strategy 1
        Console.WriteLine("[" + string.Join(", ", emps) + "]");
        emps.Sort((a, b) => string.CompareOrdinal(b.Name, a.Name));               // strategy 2
        Console.WriteLine("[" + string.Join(", ", emps) + "]");
    }
}` }
        ] } },
      { title: 'Payment methods at checkout', html: `<p>Card, UPI, Wallet, Net-banking all "pay an amount" but each talks to a different gateway with different fees and retries. A <code>PaymentStrategy</code> interface with <code>pay(Order)</code> lets the order service stay identical while finance adds "Buy Now Pay Later" next quarter as a brand-new class. Combine with a <b>factory/registry</b> that maps <code>"UPI"</code> → <code>UpiPayment</code> so the controller never writes if/else.</p>` },
      { title: 'Splitwise split types', html: `<p>An expense can be split <b>EQUAL</b>, <b>EXACT</b> amounts or by <b>PERCENT</b>. Each is a <code>SplitStrategy.split(total, participants)</code> returning a map of user → share, plus its own validation (percent must add to 100, exact must add to total). Interviewers love this because the validation rules are different per strategy — exactly the code that would otherwise turn into a tangle of if/else.</p>`, code: { lang: 'java', code: `interface SplitStrategy { Map<String, Double> split(double total, List<String> users); }
SplitStrategy equal = (total, users) -> {
    Map<String, Double> m = new LinkedHashMap<>();
    for (String u : users) m.put(u, total / users.size());
    return m;
};
System.out.println(equal.split(300, List.of("A", "B", "C")));   // {A=100.0, B=100.0, C=100.0}`, alt: [
          { lang: 'python', code: `from typing import Callable

SplitStrategy = Callable[[float, list[str]], dict[str, float]]


def equal(total: float, users: list[str]) -> dict[str, float]:
    return {u: total / len(users) for u in users}


split: SplitStrategy = equal
print(split(300, ["A", "B", "C"]))  # {'A': 100.0, 'B': 100.0, 'C': 100.0}` },
          { lang: 'ts', code: `type SplitStrategy = (total: number, users: string[]) => Map<string, number>;

const equal: SplitStrategy = (total, users) => new Map(users.map((u) => [u, total / users.length]));
console.log(equal(300, ["A", "B", "C"])); // Map(3) { 'A' => 100, 'B' => 100, 'C' => 100 }` },
          { lang: 'cpp', code: `using SplitStrategy = function<map<string, double>(double, const vector<string>&)>;

SplitStrategy equal = [](double total, const vector<string>& users) {
    map<string, double> m;
    for (const string& u : users) m[u] = total / users.size();
    return m;
};
for (auto& [user, share] : equal(300, {"A", "B", "C"})) cout << user << "=" << share << " ";  // A=100 B=100 C=100
cout << "\\n";` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

interface ISplitStrategy { Dictionary<string, double> Split(double total, List<string> users); }
sealed class EqualSplit : ISplitStrategy {
    public Dictionary<string, double> Split(double total, List<string> users) {
        Dictionary<string, double> m = new Dictionary<string, double>();
        foreach (string u in users) m[u] = total / users.Count;
        return m;
    }
}
class Program {
    static void Main() {
        ISplitStrategy equal = new EqualSplit();
        var shares = equal.Split(300, new List<string> { "A", "B", "C" });
        Console.WriteLine("{" + string.Join(", ", shares.Select(kv => kv.Key + "=" + kv.Value.ToString("0.0"))) + "}");   // {A=100.0, B=100.0, C=100.0}
    }
}` }
        ] } },
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
      brute: { why: `<p>A single method with <code>if (type == NORMAL) … else if (type == SURGE) …</code>. Each new type edits the same method (breaks Open/Closed), surge needs an extra parameter that NORMAL and POOL ignore, and the method cannot be tested per fare type. After 10 fare types it is a 150-line method everyone is scared to touch.</p>`, code: { lang: 'java', code: `class NaiveFareCalculator {
    double fare(String type, double km, double min, double surge) {
        double normal = 50 + 12 * km + 1 * min;
        if (type.equals("NORMAL")) return normal;
        else if (type.equals("SURGE")) return normal * surge;   // surge param unused by others
        else if (type.equals("POOL")) return normal * 0.7;
        // NIGHT, AIRPORT, RENTAL... every month we edit this method again
        throw new IllegalArgumentException("Unknown fare type " + type);
    }
}`, alt: [
                { lang: 'python', code: `
class NaiveFareCalculator:
    def fare(self, type, km, minutes, surge):
        normal = 50 + 12 * km + 1 * minutes
        if type == "NORMAL": return normal
        elif type == "SURGE": return normal * surge   # surge param unused by others
        elif type == "POOL": return normal * 0.7
        # NIGHT, AIRPORT, RENTAL... every month we edit this method again
        raise ValueError("Unknown fare type " + type)` },
                { lang: 'ts', code: `
class NaiveFareCalculator {
    fare(type: string, km: number, min: number, surge: number): number {
        const normal = 50 + 12 * km + 1 * min;
        if (type === "NORMAL") return normal;
        else if (type === "SURGE") return normal * surge;   // surge param unused by others
        else if (type === "POOL") return normal * 0.7;
        // NIGHT, AIRPORT, RENTAL... every month we edit this method again
        throw new Error("Unknown fare type " + type);
    }
}` },
                { lang: 'cpp', code: `
class NaiveFareCalculator {
public:
    double fare(const string& type, double km, double min, double surge) {
        double normal = 50 + 12 * km + 1 * min;
        if (type == "NORMAL") return normal;
        else if (type == "SURGE") return normal * surge;   // surge param unused by others
        else if (type == "POOL") return normal * 0.7;
        // NIGHT, AIRPORT, RENTAL... every month we edit this method again
        throw invalid_argument("Unknown fare type " + type);
    }
};` },
  { lang: 'csharp', code: `
using System;

class NaiveFareCalculator {
    public double Fare(string type, double km, double min, double surge) {
        double normal = 50 + 12 * km + 1 * min;
        if (type == "NORMAL") return normal;
        else if (type == "SURGE") return normal * surge;   // surge param unused by others
        else if (type == "POOL") return normal * 0.7;
        // NIGHT, AIRPORT, RENTAL... every month we edit this method again
        throw new ArgumentException("Unknown fare type " + type);
    }
}` }
              ] } },
      mcq: { q: 'Product says "a new fare type AIRPORT (flat 200 + 15/km) launches next week". With Strategy, what changes?', options: ['Add one class AirportFare implements FareStrategy; FareCalculator untouched', 'Add another else-if in FareCalculator', 'Subclass FareCalculator', 'Change the Ride class'], answer: 0, explain: 'Strategy makes new behaviour an addition, not a modification. The context only knows the interface.' },
      hints: [`<p>Hint 1: What varies is the <b>formula</b>; what stays the same is "take a ride, return a fare, round it". Put the varying part behind an interface.</p>`, `<p>Hint 2: <code>interface FareStrategy { double fare(Ride r); }</code>. SURGE can <b>wrap</b> another strategy (NORMAL) and multiply, so its multiplier lives in its own constructor — no unused parameters.</p>`, `<p>Hint 3: Validate negative distance once in the context. Recipe: Ride record → strategy classes → <code>FareCalculator(FareStrategy)</code> with <code>setStrategy</code> → round in one place.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "NORMAL  190.00\nSURGE   285.00\nPOOL    133.00\nPOOL    67.62\nAIRPORT 350.00\nrejected: negative ride\nrejected: surge 1.0-5.0\n" }] },
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
        System.out.println("NORMAL  " + String.format("%.2f", calc.calculate(ride)));
        calc.setStrategy(new SurgeFare(normal, 1.5));
        System.out.println("SURGE   " + String.format("%.2f", calc.calculate(ride)));
        calc.setStrategy(new PoolFare(normal));
        System.out.println("POOL    " + String.format("%.2f", calc.calculate(ride)));
        System.out.println("POOL    " + String.format("%.2f", calc.calculate(new Ride(3.3, 7))));
        calc.setStrategy(new AirportFare());
        System.out.println("AIRPORT " + String.format("%.2f", calc.calculate(ride)));
        try { calc.calculate(new Ride(-1, 5)); }
        catch (IllegalArgumentException e) { System.out.println("rejected: " + e.getMessage()); }
        try { new SurgeFare(normal, 6.0); }
        catch (IllegalArgumentException e) { System.out.println("rejected: " + e.getMessage()); }
    }
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class Ride:
    km: float
    minutes: float


class FareStrategy(ABC):
    @abstractmethod
    def fare(self, ride: Ride) -> float: ...


class NormalFare(FareStrategy):
    def fare(self, ride: Ride) -> float:
        return 50 + 12 * ride.km + 1 * ride.minutes


class SurgeFare(FareStrategy):
    def __init__(self, base: FareStrategy, multiplier: float):
        if not 1.0 <= multiplier <= 5.0:
            raise ValueError("surge 1.0-5.0")
        self._base = base
        self._multiplier = multiplier

    def fare(self, ride: Ride) -> float:
        return self._base.fare(ride) * self._multiplier


class PoolFare(FareStrategy):
    def __init__(self, base: FareStrategy):
        self._base = base

    def fare(self, ride: Ride) -> float:
        return self._base.fare(ride) * 0.7


class AirportFare(FareStrategy):  # added later: zero edits elsewhere
    def fare(self, ride: Ride) -> float:
        return 200 + 15 * ride.km


class FareCalculator:
    def __init__(self, strategy: FareStrategy):
        self._strategy = strategy

    def set_strategy(self, strategy: FareStrategy) -> None:
        self._strategy = strategy

    def calculate(self, ride: Ride) -> float:
        if ride.km < 0 or ride.minutes < 0:
            raise ValueError("negative ride")
        return round(self._strategy.fare(ride), 2)


if __name__ == "__main__":
    ride = Ride(10, 20)
    normal = NormalFare()
    calc = FareCalculator(normal)
    print(f"NORMAL  {calc.calculate(ride):.2f}")
    calc.set_strategy(SurgeFare(normal, 1.5))
    print(f"SURGE   {calc.calculate(ride):.2f}")
    calc.set_strategy(PoolFare(normal))
    print(f"POOL    {calc.calculate(ride):.2f}")
    print(f"POOL    {calc.calculate(Ride(3.3, 7)):.2f}")
    calc.set_strategy(AirportFare())
    print(f"AIRPORT {calc.calculate(ride):.2f}")
    try:
        calc.calculate(Ride(-1, 5))
    except ValueError as e:
        print("rejected:", e)
    try:
        SurgeFare(normal, 6.0)
    except ValueError as e:
        print("rejected:", e)` },
          { lang: 'ts', code: `interface Ride { readonly km: number; readonly minutes: number; }

interface FareStrategy { fare(ride: Ride): number; }

class NormalFare implements FareStrategy {
  fare(r: Ride): number { return 50 + 12 * r.km + 1 * r.minutes; }
}

class SurgeFare implements FareStrategy {
  constructor(private readonly base: FareStrategy, private readonly multiplier: number) {
    if (multiplier < 1.0 || multiplier > 5.0) throw new Error("surge 1.0-5.0");
  }
  fare(r: Ride): number { return this.base.fare(r) * this.multiplier; }
}

class PoolFare implements FareStrategy {
  constructor(private readonly base: FareStrategy) {}
  fare(r: Ride): number { return this.base.fare(r) * 0.7; }
}

class AirportFare implements FareStrategy { // added later: zero edits elsewhere
  fare(r: Ride): number { return 200 + 15 * r.km; }
}

class FareCalculator {
  constructor(private strategy: FareStrategy) {}
  setStrategy(s: FareStrategy): void { this.strategy = s; }
  calculate(r: Ride): number {
    if (r.km < 0 || r.minutes < 0) throw new Error("negative ride");
    return Math.round(this.strategy.fare(r) * 100) / 100;
  }
}

const ride: Ride = { km: 10, minutes: 20 };
const normal = new NormalFare();
const calc = new FareCalculator(normal);
console.log("NORMAL  " + calc.calculate(ride).toFixed(2));
calc.setStrategy(new SurgeFare(normal, 1.5));
console.log("SURGE   " + calc.calculate(ride).toFixed(2));
calc.setStrategy(new PoolFare(normal));
console.log("POOL    " + calc.calculate(ride).toFixed(2));
console.log("POOL    " + calc.calculate({ km: 3.3, minutes: 7 }).toFixed(2));
calc.setStrategy(new AirportFare());
console.log("AIRPORT " + calc.calculate(ride).toFixed(2));
try { calc.calculate({ km: -1, minutes: 5 }); }
catch (e) { console.log("rejected: " + (e as Error).message); }
try { new SurgeFare(normal, 6.0); }
catch (e) { console.log("rejected: " + (e as Error).message); }` },
          { lang: 'cpp', code: `struct Ride { double km; double minutes; };

class FareStrategy {
public:
    virtual ~FareStrategy() = default;
    virtual double fare(const Ride& r) const = 0;
};

class NormalFare : public FareStrategy {
public:
    double fare(const Ride& r) const override { return 50 + 12 * r.km + 1 * r.minutes; }
};

class SurgeFare : public FareStrategy {
    shared_ptr<const FareStrategy> base;
    double multiplier;
public:
    SurgeFare(shared_ptr<const FareStrategy> base, double multiplier)
        : base(std::move(base)), multiplier(multiplier) {
        if (multiplier < 1.0 || multiplier > 5.0) throw invalid_argument("surge 1.0-5.0");
    }
    double fare(const Ride& r) const override { return base->fare(r) * multiplier; }
};

class PoolFare : public FareStrategy {
    shared_ptr<const FareStrategy> base;
public:
    explicit PoolFare(shared_ptr<const FareStrategy> base) : base(std::move(base)) {}
    double fare(const Ride& r) const override { return base->fare(r) * 0.7; }
};

class AirportFare : public FareStrategy {  // added later: zero edits elsewhere
public:
    double fare(const Ride& r) const override { return 200 + 15 * r.km; }
};

class FareCalculator {
    shared_ptr<const FareStrategy> strategy;
public:
    explicit FareCalculator(shared_ptr<const FareStrategy> s) : strategy(std::move(s)) {}
    void setStrategy(shared_ptr<const FareStrategy> s) { strategy = std::move(s); }
    double calculate(const Ride& r) const {
        if (r.km < 0 || r.minutes < 0) throw invalid_argument("negative ride");
        return round(strategy->fare(r) * 100) / 100.0;
    }
};

string money(double v) {
    ostringstream os;
    os << fixed << setprecision(2) << v;
    return os.str();
}

int main() {
    Ride ride{10, 20};
    auto normal = make_shared<NormalFare>();
    FareCalculator calc(normal);
    cout << "NORMAL  " << money(calc.calculate(ride)) << "\\n";
    calc.setStrategy(make_shared<SurgeFare>(normal, 1.5));
    cout << "SURGE   " << money(calc.calculate(ride)) << "\\n";
    calc.setStrategy(make_shared<PoolFare>(normal));
    cout << "POOL    " << money(calc.calculate(ride)) << "\\n";
    cout << "POOL    " << money(calc.calculate(Ride{3.3, 7})) << "\\n";
    calc.setStrategy(make_shared<AirportFare>());
    cout << "AIRPORT " << money(calc.calculate(ride)) << "\\n";
    try { calc.calculate(Ride{-1, 5}); }
    catch (const invalid_argument& e) { cout << "rejected: " << e.what() << "\\n"; }
    try { SurgeFare bad(normal, 6.0); }
    catch (const invalid_argument& e) { cout << "rejected: " << e.what() << "\\n"; }
}` },
  { lang: 'csharp', code: `
using System;

sealed class Ride {
    public readonly double Km, Minutes;
    public Ride(double km, double minutes) { Km = km; Minutes = minutes; }
}

interface IFareStrategy { double Fare(Ride r); }

class NormalFare : IFareStrategy {
    public double Fare(Ride r) { return 50 + 12 * r.Km + 1 * r.Minutes; }
}
class SurgeFare : IFareStrategy {
    private readonly IFareStrategy baseFare; private readonly double multiplier;
    public SurgeFare(IFareStrategy baseFare, double multiplier) {
        if (multiplier < 1.0 || multiplier > 5.0) throw new ArgumentException("surge 1.0-5.0");
        this.baseFare = baseFare; this.multiplier = multiplier;
    }
    public double Fare(Ride r) { return baseFare.Fare(r) * multiplier; }
}
class PoolFare : IFareStrategy {
    private readonly IFareStrategy baseFare;
    public PoolFare(IFareStrategy baseFare) { this.baseFare = baseFare; }
    public double Fare(Ride r) { return baseFare.Fare(r) * 0.7; }
}
class AirportFare : IFareStrategy {          // added later: zero edits elsewhere
    public double Fare(Ride r) { return 200 + 15 * r.Km; }
}

class FareCalculator {
    private IFareStrategy strategy;
    public FareCalculator(IFareStrategy s) { strategy = s; }
    public void SetStrategy(IFareStrategy s) { strategy = s; }
    public double Calculate(Ride r) {
        if (r.Km < 0 || r.Minutes < 0) throw new ArgumentException("negative ride");
        return Math.Round(strategy.Fare(r) * 100, MidpointRounding.AwayFromZero) / 100.0;
    }
}

class Program {
    static void Main() {
        Ride ride = new Ride(10, 20);
        IFareStrategy normal = new NormalFare();
        FareCalculator calc = new FareCalculator(normal);
        Console.WriteLine("NORMAL  " + calc.Calculate(ride).ToString("F2"));
        calc.SetStrategy(new SurgeFare(normal, 1.5));
        Console.WriteLine("SURGE   " + calc.Calculate(ride).ToString("F2"));
        calc.SetStrategy(new PoolFare(normal));
        Console.WriteLine("POOL    " + calc.Calculate(ride).ToString("F2"));
        Console.WriteLine("POOL    " + calc.Calculate(new Ride(3.3, 7)).ToString("F2"));
        calc.SetStrategy(new AirportFare());
        Console.WriteLine("AIRPORT " + calc.Calculate(ride).ToString("F2"));
        try { calc.Calculate(new Ride(-1, 5)); }
        catch (ArgumentException e) { Console.WriteLine("rejected: " + e.Message); }
        try { new SurgeFare(normal, 6.0); }
        catch (ArgumentException e) { Console.WriteLine("rejected: " + e.Message); }
    }
}` }
        ],
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
    public void onPrice(String s, double o, double n) { System.out.println(String.format("[app] %s now %.2f", s, n)); }
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
        t.subscribe((s, o, n) -> System.out.println(String.format("[dashboard] plot %s=%.2f", s, n)));
        t.setPrice("TCS", 100);
        t.setPrice("TCS", 104);      // app, email (4%), dashboard
        email.close();               // unsubscribe
        t.setPrice("TCS", 97);       // app, dashboard only
    }
}`, alt: [
          { lang: 'python', code: `from typing import Callable, Protocol


# The observer contract: one callback. Any function with this shape qualifies.
class PriceObserver(Protocol):
    def __call__(self, symbol: str, old_price: float, new_price: float) -> None: ...


class Subscription:
    """Returned by subscribe(): close() (or a \`with\` block) unsubscribes, so nothing leaks."""

    def __init__(self, cancel: Callable[[], None]):
        self._cancel = cancel

    def close(self) -> None:
        self._cancel()

    def __enter__(self) -> "Subscription":
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()


class StockTicker:
    def __init__(self):
        self._observers: list[PriceObserver] = []
        self._prices: dict[str, float] = {}

    def subscribe(self, o: PriceObserver) -> Subscription:
        self._observers.append(o)
        return Subscription(lambda: self._observers.remove(o) if o in self._observers else None)

    def set_price(self, symbol: str, new_price: float) -> None:
        old = self._prices.get(symbol)
        self._prices[symbol] = new_price
        if old is not None and old == new_price:  # no change, no noise
            return
        self._notify_all(symbol, new_price if old is None else old, new_price)

    def _notify_all(self, s: str, old_p: float, new_p: float) -> None:
        for o in list(self._observers):  # copy: safe if observers (un)subscribe while we notify
            try:
                o(s, old_p, new_p)  # push model: data travels with the call
            except Exception as e:  # one broken observer must not stop the others
                print("observer failed:", e)


class MobileApp:
    def __call__(self, s: str, o: float, n: float) -> None:
        print(f"[app] {s} now {n:.2f}")


class EmailAlert:
    def __init__(self, threshold_pct: float):
        self._threshold_pct = threshold_pct

    def __call__(self, s: str, o: float, n: float) -> None:
        change = abs(n - o) / o * 100
        if change >= self._threshold_pct:
            print(f"[email] {s} moved {change:.1f}%")


if __name__ == "__main__":
    t = StockTicker()
    t.subscribe(MobileApp())
    email = t.subscribe(EmailAlert(3))
    t.subscribe(lambda s, o, n: print(f"[dashboard] plot {s}={n:.2f}"))
    t.set_price("TCS", 100)
    t.set_price("TCS", 104)  # app, email (4%), dashboard
    email.close()  # unsubscribe
    t.set_price("TCS", 97)  # app, dashboard only` },
          { lang: 'ts', code: `// The observer contract: one callback. Any function with this shape qualifies.
type PriceObserver = (symbol: string, oldPrice: number, newPrice: number) => void;

interface Subscription { close(): void; }

class StockTicker {
  private observers: PriceObserver[] = [];
  private readonly prices = new Map<string, number>();

  // Returning a Subscription makes unsubscribing easy and leak-proof.
  subscribe(o: PriceObserver): Subscription {
    this.observers = [...this.observers, o]; // copy-on-write: safe if observers (un)subscribe mid-notification
    return { close: () => { this.observers = this.observers.filter((x) => x !== o); } };
  }

  setPrice(symbol: string, newPrice: number): void {
    const old = this.prices.get(symbol);
    this.prices.set(symbol, newPrice);
    if (old !== undefined && old === newPrice) return; // no change, no noise
    this.notifyAll(symbol, old ?? newPrice, newPrice);
  }

  private notifyAll(s: string, oldP: number, newP: number): void {
    for (const o of this.observers) {
      try {
        o(s, oldP, newP); // push model: data travels with the call
      } catch (e) { // one broken observer must not stop the others
        console.log("observer failed: " + (e as Error).message);
      }
    }
  }
}

class MobileApp {
  readonly onPrice: PriceObserver = (s, _o, n) => console.log(\`[app] \${s} now \${n.toFixed(2)}\`);
}

class EmailAlert {
  constructor(private readonly thresholdPct: number) {}
  readonly onPrice: PriceObserver = (s, o, n) => {
    const change = (Math.abs(n - o) / o) * 100;
    if (change >= this.thresholdPct) console.log(\`[email] \${s} moved \${change.toFixed(1)}%\`);
  };
}

const t = new StockTicker();
t.subscribe(new MobileApp().onPrice);
const email = t.subscribe(new EmailAlert(3).onPrice);
t.subscribe((s, _o, n) => console.log(\`[dashboard] plot \${s}=\${n.toFixed(2)}\`));
t.setPrice("TCS", 100);
t.setPrice("TCS", 104); // app, email (4%), dashboard
email.close(); // unsubscribe
t.setPrice("TCS", 97); // app, dashboard only` },
          { lang: 'cpp', code: `// The observer contract: one callback. A lambda can implement it.
using PriceObserver = function<void(const string& symbol, double oldPrice, double newPrice)>;

class StockTicker {
public:
    // The returned handle unsubscribes; calling it twice is harmless.
    function<void()> subscribe(PriceObserver o) {
        size_t id = nextId++;
        observers.push_back({id, std::move(o)});
        return [this, id] {
            observers.erase(remove_if(observers.begin(), observers.end(), [id](auto& e) { return e.id == id; }),
                            observers.end());
        };
    }

    void setPrice(const string& symbol, double newPrice) {
        auto it = prices.find(symbol);
        bool known = it != prices.end();
        double old = known ? it->second : newPrice;
        prices[symbol] = newPrice;
        if (known && old == newPrice) return;  // no change, no noise
        notifyAll(symbol, old, newPrice);
    }

private:
    struct Entry { size_t id; PriceObserver fn; };

    void notifyAll(const string& s, double oldP, double newP) {
        auto snapshot = observers;  // copy: safe if observers (un)subscribe while we notify
        for (auto& e : snapshot) {
            try {
                e.fn(s, oldP, newP);  // push model: data travels with the call
            } catch (const exception& ex) {  // one broken observer must not stop the others
                cout << "observer failed: " << ex.what() << "\\n";
            }
        }
    }

    vector<Entry> observers;
    map<string, double> prices;
    size_t nextId = 0;
};

struct MobileApp {
    void operator()(const string& s, double, double n) const { cout << "[app] " << s << " now " << fixed << setprecision(2) << n << "\\n"; }
};

struct EmailAlert {
    double thresholdPct;
    void operator()(const string& s, double o, double n) const {
        double change = abs(n - o) / o * 100;
        if (change >= thresholdPct) cout << "[email] " << s << " moved " << fixed << setprecision(1) << change << "%\\n";
    }
};

int main() {
    StockTicker t;
    t.subscribe(MobileApp{});
    auto email = t.subscribe(EmailAlert{3});
    t.subscribe([](const string& s, double, double n) {
        cout << "[dashboard] plot " << s << "=" << fixed << setprecision(2) << n << "\\n";
    });
    t.setPrice("TCS", 100);
    t.setPrice("TCS", 104);  // app, email (4%), dashboard
    email();                 // unsubscribe
    t.setPrice("TCS", 97);   // app, dashboard only
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

// The observer contract: one callback. A delegate implements it.
delegate void PriceObserver(string symbol, double oldPrice, double newPrice);

class StockTicker {
    // Copy-on-iterate: safe if observers (un)subscribe while we are notifying.
    private readonly List<PriceObserver> observers = new List<PriceObserver>();
    private readonly object gate = new object();
    private readonly Dictionary<string, double> prices = new Dictionary<string, double>();

    // Returning an IDisposable "subscription" makes unsubscribing easy and leak-proof.
    public IDisposable Subscribe(PriceObserver o) {
        lock (gate) observers.Add(o);
        return new Subscription(() => { lock (gate) observers.Remove(o); });
    }

    public void SetPrice(string symbol, double newPrice) {
        double old; bool had = prices.TryGetValue(symbol, out old);
        prices[symbol] = newPrice;
        if (had && old == newPrice) return;                   // no change, no noise
        NotifyAllObservers(symbol, had ? old : newPrice, newPrice);
    }

    private void NotifyAllObservers(string s, double oldP, double newP) {
        PriceObserver[] snapshot; lock (gate) snapshot = observers.ToArray();
        foreach (PriceObserver o in snapshot) {
            try {
                o(s, oldP, newP);                              // push model: data travels with the call
            } catch (Exception e) {                            // one broken observer must not stop the others
                Console.WriteLine("observer failed: " + e.Message);
            }
        }
    }

    private sealed class Subscription : IDisposable {
        private readonly Action dispose; public Subscription(Action dispose) { this.dispose = dispose; }
        public void Dispose() { dispose(); }
    }
}

class MobileApp {
    public void OnPrice(string s, double o, double n) { Console.WriteLine("[app] " + s + " now " + n.ToString("F2")); }
}
class EmailAlert {
    private readonly double thresholdPct;
    public EmailAlert(double thresholdPct) { this.thresholdPct = thresholdPct; }
    public void OnPrice(string s, double o, double n) {
        double change = Math.Abs(n - o) / o * 100;
        if (change >= thresholdPct) Console.WriteLine("[email] " + s + " moved " + change.ToString("F1") + "%");
    }
}

class Program {
    static void Main() {
        StockTicker t = new StockTicker();
        t.Subscribe(new MobileApp().OnPrice);
        IDisposable email = t.Subscribe(new EmailAlert(3).OnPrice);
        t.Subscribe((s, o, n) => Console.WriteLine("[dashboard] plot " + s + "=" + n.ToString("F2")));
        t.SetPrice("TCS", 100);
        t.SetPrice("TCS", 104);      // app, email (4%), dashboard
        email.Dispose();             // unsubscribe
        t.SetPrice("TCS", 97);       // app, dashboard only
    }
}` }
        ] }],
    codeTitle: ['Observer with unsubscribe handles'],
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
      { title: 'Order status updates in e-commerce', html: `<p>When an order becomes <b>SHIPPED</b>: send SMS, send email, update loyalty points, notify the warehouse dashboard. With Observer, <code>Order.setStatus()</code> publishes an <code>OrderShipped</code> event and four listeners react. Next quarter adding "WhatsApp message" is one new listener class.</p>`, code: { lang: 'java', code: `interface OrderListener { void onStatus(String orderId, String status); }
List<OrderListener> listeners = new ArrayList<>();
listeners.add((id, st) -> System.out.println("SMS: order " + id + " is " + st));
listeners.add((id, st) -> System.out.println("Loyalty: +10 points for " + id));
for (OrderListener l : listeners) l.onStatus("A42", "SHIPPED");`, alt: [
          { lang: 'python', code: `from typing import Callable

OrderListener = Callable[[str, str], None]  # (order_id, status)
listeners: list[OrderListener] = []
listeners.append(lambda id, st: print(f"SMS: order {id} is {st}"))
listeners.append(lambda id, st: print(f"Loyalty: +10 points for {id}"))
for listener in listeners:
    listener("A42", "SHIPPED")` },
          { lang: 'ts', code: `type OrderListener = (orderId: string, status: string) => void;
const listeners: OrderListener[] = [];
listeners.push((id, st) => console.log(\`SMS: order \${id} is \${st}\`));
listeners.push((id) => console.log(\`Loyalty: +10 points for \${id}\`));
for (const l of listeners) l("A42", "SHIPPED");` },
          { lang: 'cpp', code: `using OrderListener = function<void(const string& orderId, const string& status)>;
vector<OrderListener> listeners;
listeners.push_back([](const string& id, const string& st) { cout << "SMS: order " << id << " is " << st << "\\n"; });
listeners.push_back([](const string& id, const string&) { cout << "Loyalty: +10 points for " << id << "\\n"; });
for (auto& l : listeners) l("A42", "SHIPPED");` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

delegate void OrderListener(string orderId, string status);
class Program {
    static void Main() {
        List<OrderListener> listeners = new List<OrderListener>();
        listeners.Add((id, st) => Console.WriteLine("SMS: order " + id + " is " + st));
        listeners.Add((id, st) => Console.WriteLine("Loyalty: +10 points for " + id));
        foreach (OrderListener l in listeners) l("A42", "SHIPPED");
    }
}` }
        ] } },
      { title: 'Auction: notify all other bidders', html: `<p>Each bidder subscribes to an <code>Auction</code>. When Asha bids ₹500, the auction notifies everyone <i>except</i> Asha that the highest bid changed. Note the design decision: the subject can filter (skip the sender) — or each observer can ignore its own event. Discuss which is cleaner (subject-side filtering keeps observers dumb).</p>` },
      { title: 'Observer vs Pub/Sub broker', html: `<p>In-process Observer: subject holds direct references; delivery is a method call; if the process dies, events are lost. <b>Pub/Sub</b> (Kafka, Redis Pub/Sub, SNS): publisher and subscribers do not know each other at all — a <b>broker</b> sits between them, events can be persisted, replayed, delivered across machines. Same idea, different scale. Say this in interviews to show you know the boundary.</p>` }
    ],
    deepDive: `<p><b>The lapsed listener problem:</b> the subject's list holds strong references, so an observer that forgot to unsubscribe can never be garbage collected (a classic Android/Swing memory leak). Fixes: return an <code>AutoCloseable</code> subscription and use try-with-resources or lifecycle hooks; or store <code>WeakReference</code> observers (but then lambdas with no other reference vanish instantly — surprising!).</p>
<p><b>Concurrency:</b> iterating an <code>ArrayList</code> while an observer unsubscribes inside its callback throws <code>ConcurrentModificationException</code>. <code>CopyOnWriteArrayList</code> gives a snapshot iterator — perfect when reads (notifications) vastly outnumber writes (subscriptions). Never call observers while holding a lock: an observer may call back into the subject and deadlock.</p>
<p><b>Failure isolation and ordering:</b> one observer throwing must not stop the rest — wrap each call. Notification order is the list order; <b>never</b> let correctness depend on it. Slow observers block the subject in a synchronous design — move to async delivery (an <code>ExecutorService</code> per observer, or a queue) when observers do I/O.</p>
<p><b>Re-entrancy and cascades:</b> an observer that changes the subject triggers another notification while the first is still in progress → infinite loops or inconsistent views. Guard with a "notifying" flag or queue events.</p>
<p><b>Library history:</b> Java's <code>java.util.Observable</code> was deprecated in Java 9 (it is a class, not an interface, and its notification order and thread-safety were unspecified). Use your own interface, <code>PropertyChangeSupport</code> (JavaBeans), <code>java.util.concurrent.Flow</code> (Reactive Streams with <b>back-pressure</b>), or frameworks (Spring events, RxJava, Project Reactor). Python has no built-in Observer (use a list of callables or a signals library such as <code>blinker</code>); JavaScript has <code>EventTarget</code> and Node's <code>EventEmitter</code>; C++ code usually keeps a list of <code>std::function</code> callbacks or uses Boost.Signals2 / Qt signals.</p>`,
    aiEra: `<p><b>What AI changes:</b> asking an assistant "add an email notification when stock changes" usually yields a direct call inside <code>setPrice()</code>. Recognise the one-to-many smell and steer it: "Refactor to an Observer with a <code>PriceObserver</code> interface and <code>CopyOnWriteArrayList</code>, keep subscriptions closeable." AI is great at producing the listener boilerplate and the tests that assert each observer got called once.</p>
<p><b>Agents are event-driven:</b> tool results, streaming tokens and human-in-the-loop approvals are all delivered via callbacks/observers (e.g. streaming handlers that fire per token). LLM observability tools hook into frameworks as observers to log every model call.</p>
<p><b>Where AI goes wrong:</b> forgets unsubscribe (leaks), iterates a plain <code>ArrayList</code> while mutating it, lets one exception kill the loop, or calls observers inside a <code>synchronized</code> block. <b>What you own:</b> sync vs async delivery, failure isolation, ordering guarantees, and when to graduate to a real broker.</p>`,
    problems: [{
      title: 'Stock Price Alert System', level: 'Medium', tags: ['observer', 'notifications'], companies: ['Zerodha', 'Robinhood', 'Bloomberg'],
      statement: `<p>Build <code>StockMarket</code> where users subscribe to a stock symbol with a rule: "alert me when price goes <b>above X</b>" or "<b>below Y</b>". When <code>updatePrice(symbol, price)</code> is called, every matching subscriber of <b>that symbol only</b> is notified once per crossing (not on every tick while it stays above). Users can unsubscribe. Channels (push/SMS/email) must be pluggable.</p>`,
      constraints: `Up to 10<sup>4</sup> symbols, 10<sup>5</sup> subscriptions. Updates are frequent; subscriptions are rare. Updates for one symbol must not touch subscribers of other symbols.`,
      example: `<p>Asha: TCS above 4000 (push). Ben: TCS below 3500 (SMS).<br>update TCS 3900 → nobody. update TCS 4050 → ${H.c('g', 'Asha alerted')} (crossed above). update TCS 4100 → ${H.c('m', 'nobody')} (still above, no new crossing). update TCS 3400 → ${H.c('g', 'Ben alerted')}.</p>`,
      brute: { why: `<p>The market keeps one global list and, on every update, loops over <b>all</b> 10<sup>5</sup> subscriptions checking symbol and rule, and calls <code>smsService.send()</code> / <code>emailService.send()</code> directly with an if/else on channel. Wasted work: scanning unrelated symbols; coupling: adding WhatsApp edits the market; bug: alerts fire on every tick above the threshold.</p>`, code: { lang: 'java', code: `class NaiveMarket {
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
}`, alt: [
                { lang: 'python', code: `
from dataclasses import dataclass

@dataclass
class Sub:
    user: str
    symbol: str
    above: float
    below: float
    channel: str

class NaiveMarket:
    def __init__(self): self._subs = []
    def add(self, s): self._subs.append(s)
    def update_price(self, symbol, price):
        for s in self._subs:                                     # scans every symbol's subs
            if s.symbol != symbol: continue
            hit = price > s.above or price < s.below             # fires on EVERY tick
            if not hit: continue
            if s.channel == "SMS": print("SMS to " + s.user)
            elif s.channel == "EMAIL": print("EMAIL to " + s.user)
            else: print("PUSH to " + s.user)                    # new channel = edit here` },
                { lang: 'ts', code: `
interface Sub { user: string; symbol: string; above: number; below: number; channel: string }

class NaiveMarket {
    private readonly subs: Sub[] = [];
    add(s: Sub): void { this.subs.push(s); }
    updatePrice(symbol: string, price: number): void {
        for (const s of this.subs) {                              // scans every symbol's subs
            if (s.symbol !== symbol) continue;
            const hit = price > s.above || price < s.below;       // fires on EVERY tick
            if (!hit) continue;
            if (s.channel === "SMS") console.log("SMS to " + s.user);
            else if (s.channel === "EMAIL") console.log("EMAIL to " + s.user);
            else console.log("PUSH to " + s.user);                // new channel = edit here
        }
    }
}` },
                { lang: 'cpp', code: `
struct Sub { string user, symbol; double above, below; string channel; };

class NaiveMarket {
    vector<Sub> subs;
public:
    void add(const Sub& s) { subs.push_back(s); }
    void updatePrice(const string& symbol, double price) {
        for (auto& s : subs) {                                     // scans every symbol's subs
            if (s.symbol != symbol) continue;
            bool hit = price > s.above || price < s.below;         // fires on EVERY tick
            if (!hit) continue;
            if (s.channel == "SMS") cout << "SMS to " << s.user << "\\n";
            else if (s.channel == "EMAIL") cout << "EMAIL to " << s.user << "\\n";
            else cout << "PUSH to " << s.user << "\\n";            // new channel = edit here
        }
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class NaiveMarket {
    public sealed class Sub {
        public readonly string User, Symbol, Channel; public readonly double Above, Below;
        public Sub(string user, string symbol, double above, double below, string channel) { User = user; Symbol = symbol; Above = above; Below = below; Channel = channel; }
    }
    private readonly List<Sub> subs = new List<Sub>();
    public void Add(Sub s) { subs.Add(s); }
    public void UpdatePrice(string symbol, double price) {
        foreach (Sub s in subs) {                                   // scans every symbol's subs
            if (s.Symbol != symbol) continue;
            bool hit = price > s.Above || price < s.Below;          // fires on EVERY tick
            if (!hit) continue;
            if (s.Channel == "SMS") Console.WriteLine("SMS to " + s.User);
            else if (s.Channel == "EMAIL") Console.WriteLine("EMAIL to " + s.User);
            else Console.WriteLine("PUSH to " + s.User);           // new channel = edit here
        }
    }
}` }
              ] } },
      mcq: { q: 'How do you make sure an update to INFY never scans TCS subscribers?', options: ['Map&lt;String symbol, List&lt;Observer&gt;&gt; — one subject list per symbol', 'Sort the global list', 'Use a Set instead of a List', 'Notify everyone and let them filter'], answer: 0, explain: 'Partition observers by topic (symbol). Each update only walks its own list — like per-topic subscriptions in a pub/sub system.' },
      hints: [`<p>Hint 1: Each subscription is an <b>observer</b> with its own rule and its own memory of "was I already triggered?" (edge detection = notify on crossing only).</p>`, `<p>Hint 2: <code>Map&lt;String, List&lt;PriceAlert&gt;&gt;</code> keyed by symbol, values in <code>CopyOnWriteArrayList</code>. Channel is a separate <code>Notifier</code> interface (a strategy) injected into the alert.</p>`, `<p>Hint 3: Rule "above X": fire when <code>prev ≤ X &lt; now</code>. Store <code>lastPrice</code> per symbol. Return a handle from subscribe so the user can unsubscribe. Recipe: subscribe → map.computeIfAbsent(symbol) → add; update → get list → for each: alert.onPrice(prev, now).</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "PUSH asha: TCS is ABOVE 4000.00 (now 4050.00)\nSMS  ben: TCS is BELOW 3500.00 (now 3400.00)\nlistener failed: boom\nlistener failed: boom\nPUSH cy: INFY is ABOVE 1500.00 (now 1600.00)\n" }] },
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
        if (crossed) notifier.send(user, String.format("%s is %s %.2f (now %.2f)", symbol, dir, level, now));
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
        // a broken listener must not stop the others
        mkt.subscribe("INFY", (s, prev, now) -> { throw new IllegalStateException("boom"); });
        mkt.subscribe("INFY", new PriceAlert("cy", PriceAlert.Dir.ABOVE, 1500, push));
        mkt.updatePrice("INFY", 1400);
        mkt.updatePrice("INFY", 1600);
    }
}`, alt: [
          { lang: 'python', code: `import threading
from collections import defaultdict
from enum import Enum
from typing import Callable, Protocol

Notifier = Callable[[str, str], None]


class PriceListener(Protocol):
    def on_price(self, symbol: str, prev: float, now: float) -> None: ...


class Dir(Enum):
    ABOVE = "ABOVE"
    BELOW = "BELOW"


class PriceAlert:
    def __init__(self, user: str, direction: Dir, level: float, notifier: Notifier):
        self._user, self._dir, self._level, self._notifier = user, direction, level, notifier

    def on_price(self, symbol: str, prev: float, now: float) -> None:
        if self._dir is Dir.ABOVE:
            crossed = prev <= self._level < now
        else:
            crossed = now < self._level <= prev
        if crossed:
            self._notifier(self._user, f"{symbol} is {self._dir.value} {self._level:.2f} (now {now:.2f})")


class StockMarket:
    def __init__(self):
        self._lock = threading.Lock()
        self._by_symbol: dict[str, list[PriceListener]] = defaultdict(list)
        self._last_price: dict[str, float] = {}

    def subscribe(self, symbol: str, listener: PriceListener) -> Callable[[], None]:
        with self._lock:
            self._by_symbol[symbol].append(listener)

        def unsubscribe() -> None:  # unsubscribe handle
            with self._lock:
                if listener in self._by_symbol[symbol]:
                    self._by_symbol[symbol].remove(listener)

        return unsubscribe

    def update_price(self, symbol: str, now: float) -> None:
        with self._lock:
            prev = self._last_price.get(symbol, now)
            self._last_price[symbol] = now
            listeners = list(self._by_symbol.get(symbol, []))  # snapshot: only THIS symbol
        for listener in listeners:
            try:
                listener.on_price(symbol, prev, now)
            except Exception as e:
                print("listener failed:", e)


class BrokenListener:
    def on_price(self, symbol: str, prev: float, now: float) -> None:
        raise RuntimeError("boom")


if __name__ == "__main__":
    push: Notifier = lambda u, m: print(f"PUSH {u}: {m}")
    sms: Notifier = lambda u, m: print(f"SMS  {u}: {m}")
    mkt = StockMarket()
    mkt.subscribe("TCS", PriceAlert("asha", Dir.ABOVE, 4000, push))
    ben = mkt.subscribe("TCS", PriceAlert("ben", Dir.BELOW, 3500, sms))
    for p in (3900, 4050, 4100, 3400):
        mkt.update_price("TCS", p)
    ben()  # ben unsubscribes
    mkt.update_price("TCS", 3600)
    mkt.update_price("TCS", 3300)  # nobody: asha's rule is ABOVE, ben left
    # a broken listener must not stop the others
    mkt.subscribe("INFY", BrokenListener())
    mkt.subscribe("INFY", PriceAlert("cy", Dir.ABOVE, 1500, push))
    mkt.update_price("INFY", 1400)
    mkt.update_price("INFY", 1600)` },
          { lang: 'ts', code: `type Notifier = (user: string, msg: string) => void;

interface PriceListener { onPrice(symbol: string, prev: number, now: number): void; }

type Dir = "ABOVE" | "BELOW";

class PriceAlert implements PriceListener {
  constructor(
    private readonly user: string,
    private readonly dir: Dir,
    private readonly level: number,
    private readonly notifier: Notifier,
  ) {}

  onPrice(symbol: string, prev: number, now: number): void {
    const crossed = this.dir === "ABOVE"
      ? prev <= this.level && now > this.level
      : prev >= this.level && now < this.level;
    if (crossed) {
      this.notifier(this.user, \`\${symbol} is \${this.dir} \${this.level.toFixed(2)} (now \${now.toFixed(2)})\`);
    }
  }
}

class StockMarket {
  private readonly bySymbol = new Map<string, PriceListener[]>();
  private readonly lastPrice = new Map<string, number>();

  subscribe(symbol: string, l: PriceListener): () => void {
    const list = this.bySymbol.get(symbol) ?? [];
    this.bySymbol.set(symbol, [...list, l]); // copy-on-write keeps running loops safe
    return () => { // unsubscribe handle
      this.bySymbol.set(symbol, (this.bySymbol.get(symbol) ?? []).filter((x) => x !== l));
    };
  }

  updatePrice(symbol: string, now: number): void {
    const prev = this.lastPrice.get(symbol) ?? now;
    this.lastPrice.set(symbol, now);
    for (const l of this.bySymbol.get(symbol) ?? []) { // only THIS symbol
      try { l.onPrice(symbol, prev, now); }
      catch (e) { console.log("listener failed: " + (e as Error).message); }
    }
  }
}

const push: Notifier = (u, m) => console.log(\`PUSH \${u}: \${m}\`);
const sms: Notifier = (u, m) => console.log(\`SMS  \${u}: \${m}\`);
const mkt = new StockMarket();
mkt.subscribe("TCS", new PriceAlert("asha", "ABOVE", 4000, push));
const ben = mkt.subscribe("TCS", new PriceAlert("ben", "BELOW", 3500, sms));
for (const p of [3900, 4050, 4100, 3400]) mkt.updatePrice("TCS", p);
ben(); // ben unsubscribes
mkt.updatePrice("TCS", 3600);
mkt.updatePrice("TCS", 3300); // nobody: asha's rule is ABOVE, ben left
// a broken listener must not stop the others
mkt.subscribe("INFY", { onPrice: () => { throw new Error("boom"); } });
mkt.subscribe("INFY", new PriceAlert("cy", "ABOVE", 1500, push));
mkt.updatePrice("INFY", 1400);
mkt.updatePrice("INFY", 1600);` },
          { lang: 'cpp', code: `using Notifier = function<void(const string&, const string&)>;

class PriceListener {
public:
    virtual ~PriceListener() = default;
    virtual void onPrice(const string& symbol, double prev, double now) = 0;
};

string fixed2(double v) {
    ostringstream os;
    os << fixed << setprecision(2) << v;
    return os.str();
}

class PriceAlert : public PriceListener {
public:
    enum class Dir { ABOVE, BELOW };
    PriceAlert(string user, Dir dir, double level, Notifier notifier)
        : user(std::move(user)), dir(dir), level(level), notifier(std::move(notifier)) {}
    void onPrice(const string& symbol, double prev, double now) override {
        bool crossed = dir == Dir::ABOVE ? (prev <= level && now > level)
                                         : (prev >= level && now < level);
        if (crossed)
            notifier(user, symbol + " is " + (dir == Dir::ABOVE ? "ABOVE " : "BELOW ") + fixed2(level) +
                               " (now " + fixed2(now) + ")");
    }
private:
    string user; Dir dir; double level; Notifier notifier;
};

class StockMarket {
    using Listeners = vector<shared_ptr<PriceListener>>;
    map<string, Listeners> bySymbol;
    map<string, double> lastPrice;
public:
    function<void()> subscribe(const string& symbol, shared_ptr<PriceListener> l) {
        bySymbol[symbol].push_back(l);
        return [this, symbol, l] {  // unsubscribe handle
            auto& v = bySymbol[symbol];
            v.erase(remove(v.begin(), v.end(), l), v.end());
        };
    }
    void updatePrice(const string& symbol, double now) {
        auto it = lastPrice.find(symbol);
        double prev = it == lastPrice.end() ? now : it->second;
        lastPrice[symbol] = now;
        Listeners snapshot = bySymbol[symbol];  // only THIS symbol; safe if a listener unsubscribes
        for (auto& l : snapshot) {
            try { l->onPrice(symbol, prev, now); }
            catch (const exception& e) { cout << "listener failed: " << e.what() << "\\n"; }
        }
    }
};

class BrokenListener : public PriceListener {
public:
    void onPrice(const string&, double, double) override { throw runtime_error("boom"); }
};

int main() {
    Notifier push = [](const string& u, const string& m) { cout << "PUSH " << u << ": " << m << "\\n"; };
    Notifier sms = [](const string& u, const string& m) { cout << "SMS  " << u << ": " << m << "\\n"; };
    StockMarket mkt;
    mkt.subscribe("TCS", make_shared<PriceAlert>("asha", PriceAlert::Dir::ABOVE, 4000, push));
    auto ben = mkt.subscribe("TCS", make_shared<PriceAlert>("ben", PriceAlert::Dir::BELOW, 3500, sms));
    for (double p : {3900.0, 4050.0, 4100.0, 3400.0}) mkt.updatePrice("TCS", p);
    ben();  // ben unsubscribes
    mkt.updatePrice("TCS", 3600);
    mkt.updatePrice("TCS", 3300);  // nobody: asha's rule is ABOVE, ben left
    // a broken listener must not stop the others
    mkt.subscribe("INFY", make_shared<BrokenListener>());
    mkt.subscribe("INFY", make_shared<PriceAlert>("cy", PriceAlert::Dir::ABOVE, 1500, push));
    mkt.updatePrice("INFY", 1400);
    mkt.updatePrice("INFY", 1600);
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;

delegate void Notifier(string user, string msg);

interface IPriceListener { void OnPrice(string symbol, double prev, double now); }
sealed class LambdaListener : IPriceListener {
    private readonly Action<string, double, double> f; public LambdaListener(Action<string, double, double> f) { this.f = f; }
    public void OnPrice(string symbol, double prev, double now) { f(symbol, prev, now); }
}

class PriceAlert : IPriceListener {
    public enum Dir { ABOVE, BELOW }
    private readonly string user; private readonly Dir dir; private readonly double level; private readonly Notifier notifier;
    public PriceAlert(string user, Dir dir, double level, Notifier notifier) {
        this.user = user; this.dir = dir; this.level = level; this.notifier = notifier;
    }
    public void OnPrice(string symbol, double prev, double now) {
        bool crossed = dir == Dir.ABOVE ? (prev <= level && now > level) : (prev >= level && now < level);
        if (crossed) notifier(user, symbol + " is " + dir + " " + level.ToString("F2") + " (now " + now.ToString("F2") + ")");
    }
}

class StockMarket {
    private readonly ConcurrentDictionary<string, List<IPriceListener>> bySymbol = new ConcurrentDictionary<string, List<IPriceListener>>();
    private readonly ConcurrentDictionary<string, double> lastPrice = new ConcurrentDictionary<string, double>();
    private readonly object gate = new object();

    public Action Subscribe(string symbol, IPriceListener l) {
        lock (gate) bySymbol.GetOrAdd(symbol, k => new List<IPriceListener>()).Add(l);
        return () => { List<IPriceListener> ls; if (bySymbol.TryGetValue(symbol, out ls)) lock (gate) ls.Remove(l); };   // unsubscribe handle
    }

    public void UpdatePrice(string symbol, double now) {
        double prevVal; bool had = lastPrice.TryGetValue(symbol, out prevVal);
        lastPrice[symbol] = now;
        double prev = had ? prevVal : now;
        List<IPriceListener> ls; IPriceListener[] snapshot;
        if (!bySymbol.TryGetValue(symbol, out ls)) return;
        lock (gate) snapshot = ls.ToArray();                        // copy-on-iterate
        foreach (IPriceListener l in snapshot) {                    // only THIS symbol
            try { l.OnPrice(symbol, prev, now); }
            catch (Exception e) { Console.WriteLine("listener failed: " + e.Message); }
        }
    }
}

class Program {
    static void Main() {
        Notifier push = (u, m) => Console.WriteLine("PUSH " + u + ": " + m);
        Notifier sms = (u, m) => Console.WriteLine("SMS  " + u + ": " + m);
        StockMarket mkt = new StockMarket();
        mkt.Subscribe("TCS", new PriceAlert("asha", PriceAlert.Dir.ABOVE, 4000, push));
        Action ben = mkt.Subscribe("TCS", new PriceAlert("ben", PriceAlert.Dir.BELOW, 3500, sms));
        foreach (double p in new double[] { 3900, 4050, 4100, 3400 }) mkt.UpdatePrice("TCS", p);
        ben();                           // ben unsubscribes
        mkt.UpdatePrice("TCS", 3600);
        mkt.UpdatePrice("TCS", 3300);    // nobody: asha's rule is ABOVE, ben left
        // a broken listener must not stop the others
        mkt.Subscribe("INFY", new LambdaListener((s, prev, now) => { throw new InvalidOperationException("boom"); }));
        mkt.Subscribe("INFY", new PriceAlert("cy", PriceAlert.Dir.ABOVE, 1500, push));
        mkt.UpdatePrice("INFY", 1400);
        mkt.UpdatePrice("INFY", 1600);
    }
}` }
        ],
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
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from collections import deque


# Receiver: knows HOW to edit text. Knows nothing about undo.
class Document:
    def __init__(self):
        self._text = ""

    def insert(self, pos: int, s: str) -> None:
        self._text = self._text[:pos] + s + self._text[pos:]

    def delete(self, pos: int, length: int) -> str:  # returns what was removed
        gone = self._text[pos:pos + length]
        self._text = self._text[:pos] + self._text[pos + length:]
        return gone

    def __len__(self) -> int:
        return len(self._text)

    def __str__(self) -> str:
        return self._text


class EditCommand(ABC):
    @abstractmethod
    def execute(self) -> None: ...

    @abstractmethod
    def undo(self) -> None: ...


# Each command stores exactly what it needs to reverse itself (not the whole document).
class InsertText(EditCommand):
    def __init__(self, doc: Document, s: str):
        self._doc, self._s, self._pos = doc, s, 0

    def execute(self) -> None:
        self._pos = len(self._doc)
        self._doc.insert(self._pos, self._s)

    def undo(self) -> None:
        self._doc.delete(self._pos, len(self._s))


class DeleteLast(EditCommand):
    def __init__(self, doc: Document, n: int):
        self._doc, self._n, self._removed, self._pos = doc, n, "", 0

    def execute(self) -> None:
        k = min(self._n, len(self._doc))
        self._pos = len(self._doc) - k
        self._removed = self._doc.delete(self._pos, k)  # remember the deleted text for undo

    def undo(self) -> None:
        self._doc.insert(self._pos, self._removed)


# Invoker: runs commands and keeps history. It never looks inside a command.
class CommandManager:
    def __init__(self, limit: int):
        self._undo: deque[EditCommand] = deque(maxlen=limit)  # bounded history: drops the oldest
        self._redo: list[EditCommand] = []

    def run(self, c: EditCommand) -> None:
        c.execute()
        self._undo.append(c)
        self._redo.clear()  # a new action kills the old "future"

    def undo(self) -> bool:
        if not self._undo:
            return False
        c = self._undo.pop()
        c.undo()
        self._redo.append(c)
        return True

    def redo(self) -> bool:
        if not self._redo:
            return False
        c = self._redo.pop()
        c.execute()
        self._undo.append(c)
        return True


if __name__ == "__main__":
    doc = Document()
    cm = CommandManager(100)
    cm.run(InsertText(doc, "Hello"))
    cm.run(InsertText(doc, " World"))
    cm.run(DeleteLast(doc, 3))
    print(doc)  # Hello Wo
    cm.undo(); print(doc)  # Hello World
    cm.undo(); print(doc)  # Hello
    cm.redo(); print(doc)  # Hello World` },
          { lang: 'ts', code: `// Receiver: knows HOW to edit text. Knows nothing about undo.
// (Named Doc because Document is a built-in DOM type.)
class Doc {
  private text = "";
  insert(pos: number, s: string): void { this.text = this.text.slice(0, pos) + s + this.text.slice(pos); }
  delete(pos: number, len: number): string { // returns what was removed
    const gone = this.text.slice(pos, pos + len);
    this.text = this.text.slice(0, pos) + this.text.slice(pos + len);
    return gone;
  }
  get length(): number { return this.text.length; }
  toString(): string { return this.text; }
}

interface EditCommand {
  execute(): void;
  undo(): void;
}

// Each command stores exactly what it needs to reverse itself (not the whole document).
class InsertText implements EditCommand {
  private pos = 0;
  constructor(private readonly doc: Doc, private readonly s: string) {}
  execute(): void { this.pos = this.doc.length; this.doc.insert(this.pos, this.s); }
  undo(): void { this.doc.delete(this.pos, this.s.length); }
}

class DeleteLast implements EditCommand {
  private removed = "";
  private pos = 0;
  constructor(private readonly doc: Doc, private readonly n: number) {}
  execute(): void {
    const k = Math.min(this.n, this.doc.length);
    this.pos = this.doc.length - k;
    this.removed = this.doc.delete(this.pos, k); // remember the deleted text for undo
  }
  undo(): void { this.doc.insert(this.pos, this.removed); }
}

// Invoker: runs commands and keeps history. It never looks inside a command.
class CommandManager {
  private readonly undoStack: EditCommand[] = [];
  private readonly redoStack: EditCommand[] = [];
  constructor(private readonly limit: number) {}

  run(c: EditCommand): void {
    c.execute();
    this.undoStack.push(c);
    if (this.undoStack.length > this.limit) this.undoStack.shift(); // bounded history: drop the oldest
    this.redoStack.length = 0; // a new action kills the old "future"
  }
  undo(): boolean {
    const c = this.undoStack.pop();
    if (c === undefined) return false;
    c.undo();
    this.redoStack.push(c);
    return true;
  }
  redo(): boolean {
    const c = this.redoStack.pop();
    if (c === undefined) return false;
    c.execute();
    this.undoStack.push(c);
    return true;
  }
}

const doc = new Doc();
const cm = new CommandManager(100);
cm.run(new InsertText(doc, "Hello"));
cm.run(new InsertText(doc, " World"));
cm.run(new DeleteLast(doc, 3));
console.log(String(doc)); // Hello Wo
cm.undo(); console.log(String(doc)); // Hello World
cm.undo(); console.log(String(doc)); // Hello
cm.redo(); console.log(String(doc)); // Hello World` },
          { lang: 'cpp', code: `// Receiver: knows HOW to edit text. Knows nothing about undo.
class Document {
public:
    void insert(size_t pos, const string& s) { text.insert(pos, s); }
    string erase(size_t pos, size_t len) {  // returns what was removed
        string gone = text.substr(pos, len);
        text.erase(pos, len);
        return gone;
    }
    size_t length() const { return text.size(); }
    const string& str() const { return text; }
private:
    string text;
};

class EditCommand {
public:
    virtual ~EditCommand() = default;
    virtual void execute() = 0;
    virtual void undo() = 0;
};

// Each command stores exactly what it needs to reverse itself (not the whole document).
class InsertText : public EditCommand {
public:
    InsertText(Document& doc, string s) : doc(doc), s(std::move(s)) {}
    void execute() override { pos = doc.length(); doc.insert(pos, s); }
    void undo() override { doc.erase(pos, s.size()); }
private:
    Document& doc; string s; size_t pos = 0;
};
class DeleteLast : public EditCommand {
public:
    DeleteLast(Document& doc, size_t n) : doc(doc), n(n) {}
    void execute() override {
        size_t k = min(n, doc.length());
        pos = doc.length() - k;
        removed = doc.erase(pos, k);  // remember the deleted text for undo
    }
    void undo() override { doc.insert(pos, removed); }
private:
    Document& doc; size_t n; string removed; size_t pos = 0;
};

// Invoker: runs commands and keeps history. It never looks inside a command.
class CommandManager {
public:
    explicit CommandManager(size_t limit) : limit(limit) {}

    void run(unique_ptr<EditCommand> c) {
        c->execute();
        undoStack.push_back(std::move(c));
        if (undoStack.size() > limit) undoStack.pop_front();  // bounded history: drop the oldest
        redoStack.clear();  // a new action kills the old "future"
    }
    bool undo() {
        if (undoStack.empty()) return false;
        auto c = std::move(undoStack.back());
        undoStack.pop_back();
        c->undo();
        redoStack.push_back(std::move(c));
        return true;
    }
    bool redo() {
        if (redoStack.empty()) return false;
        auto c = std::move(redoStack.back());
        redoStack.pop_back();
        c->execute();
        undoStack.push_back(std::move(c));
        return true;
    }
private:
    deque<unique_ptr<EditCommand>> undoStack;
    vector<unique_ptr<EditCommand>> redoStack;
    size_t limit;
};

int main() {
    Document doc;
    CommandManager cm(100);
    cm.run(make_unique<InsertText>(doc, "Hello"));
    cm.run(make_unique<InsertText>(doc, " World"));
    cm.run(make_unique<DeleteLast>(doc, 3));
    cout << doc.str() << "\\n";  // Hello Wo
    cm.undo(); cout << doc.str() << "\\n";  // Hello World
    cm.undo(); cout << doc.str() << "\\n";  // Hello
    cm.redo(); cout << doc.str() << "\\n";  // Hello World
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Text;

// Receiver: knows HOW to edit text. Knows nothing about undo.
class Document {
    private readonly StringBuilder text = new StringBuilder();
    public void Insert(int pos, string s) { text.Insert(pos, s); }
    public string Delete(int pos, int len) {                  // returns what was removed
        string gone = text.ToString(pos, len);
        text.Remove(pos, len);
        return gone;
    }
    public int Length { get { return text.Length; } }
    public override string ToString() { return text.ToString(); }
}

interface IEditCommand {
    void Execute();
    void Undo();
}

// Each command stores exactly what it needs to reverse itself (not the whole document).
class InsertText : IEditCommand {
    private readonly Document doc; private readonly string s; private int pos;
    public InsertText(Document doc, string s) { this.doc = doc; this.s = s; }
    public void Execute() { pos = doc.Length; doc.Insert(pos, s); }
    public void Undo() { doc.Delete(pos, s.Length); }
}
class DeleteLast : IEditCommand {
    private readonly Document doc; private readonly int n; private string removed = ""; private int pos;
    public DeleteLast(Document doc, int n) { this.doc = doc; this.n = n; }
    public void Execute() {
        int k = Math.Min(n, doc.Length);
        pos = doc.Length - k;
        removed = doc.Delete(pos, k);                  // remember the deleted text for undo
    }
    public void Undo() { doc.Insert(pos, removed); }
}

// Invoker: runs commands and keeps history. It never looks inside a command.
class CommandManager {
    private readonly LinkedList<IEditCommand> undo = new LinkedList<IEditCommand>();   // front = newest
    private readonly Stack<IEditCommand> redo = new Stack<IEditCommand>();
    private readonly int limit;
    public CommandManager(int limit) { this.limit = limit; }

    public void Run(IEditCommand c) {
        c.Execute();
        undo.AddFirst(c);
        if (undo.Count > limit) undo.RemoveLast();     // bounded history: drop the oldest
        redo.Clear();                                  // a new action kills the old "future"
    }
    public bool Undo() {
        if (undo.Count == 0) return false;
        IEditCommand c = undo.First.Value; undo.RemoveFirst(); c.Undo(); redo.Push(c); return true;
    }
    public bool Redo() {
        if (redo.Count == 0) return false;
        IEditCommand c = redo.Pop(); c.Execute(); undo.AddFirst(c); return true;
    }
}

class Program {
    static void Main() {
        Document doc = new Document();
        CommandManager cm = new CommandManager(100);
        cm.Run(new InsertText(doc, "Hello"));
        cm.Run(new InsertText(doc, " World"));
        cm.Run(new DeleteLast(doc, 3));
        Console.WriteLine(doc);   // Hello Wo
        cm.Undo(); Console.WriteLine(doc);   // Hello World
        cm.Undo(); Console.WriteLine(doc);   // Hello
        cm.Redo(); Console.WriteLine(doc);   // Hello World
    }
}` }
        ] }, { lang: 'java', title: 'Commands as jobs: queue, macro and log', code: `// Runnable IS the Command pattern without undo. An executor is an invoker with a queue.
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

        ExecutorService pool = Executors.newSingleThreadExecutor();   // one worker: jobs run in queue order
        while (!queue.isEmpty()) pool.submit(queue.poll());   // the invoker does not know what jobs do
        pool.shutdown();
        pool.awaitTermination(1, TimeUnit.SECONDS);
        System.out.println(auditLog.size() + " actions ran: " + auditLog);
    }
}`, alt: [
          { lang: 'python', code: `import queue
from concurrent.futures import ThreadPoolExecutor
from typing import Callable

# A plain callable IS the Command pattern without undo. An executor is an invoker with a queue.
audit_log: list[str] = []
jobs: "queue.Queue[Callable[[], None]]" = queue.Queue()

jobs.put(lambda: audit_log.append("resize image 42"))
jobs.put(lambda: audit_log.append("send welcome email to asha"))

# Macro = a command made of commands (Composite + Command)
steps: list[Callable[[], None]] = [lambda: audit_log.append("lights off"), lambda: audit_log.append("lock door")]


def good_night() -> None:
    for step in steps:
        step()


jobs.put(good_night)

with ThreadPoolExecutor(max_workers=1) as pool:  # one worker: jobs run in queue order
    while not jobs.empty():
        pool.submit(jobs.get())  # the invoker does not know what jobs do
# leaving the \`with\` block waits for every job to finish
print(f"{len(audit_log)} actions ran: [{', '.join(audit_log)}]")` },
          { lang: 'ts', code: `// A plain function IS the Command pattern without undo. A job queue is an invoker.
type Job = () => void;

const auditLog: string[] = [];
const queue: Job[] = [];

queue.push(() => auditLog.push("resize image 42"));
queue.push(() => auditLog.push("send welcome email to asha"));

// Macro = a command made of commands (Composite + Command)
const steps: Job[] = [() => auditLog.push("lights off"), () => auditLog.push("lock door")];
const goodNight: Job = () => steps.forEach((step) => step());
queue.push(goodNight);

// One worker drains the queue in order; each job runs in its own turn of the event loop.
async function drain(): Promise<void> {
  for (let job = queue.shift(); job !== undefined; job = queue.shift()) {
    await Promise.resolve().then(job); // the invoker does not know what jobs do
  }
}

drain().then(() => console.log(\`\${auditLog.length} actions ran: [\${auditLog.join(", ")}]\`));` },
          { lang: 'cpp', code: `// A callable IS the Command pattern without undo. A worker thread draining a queue is an invoker.
int main() {
    vector<string> auditLog;
    queue<function<void()>> jobs;

    jobs.push([&] { auditLog.push_back("resize image 42"); });
    jobs.push([&] { auditLog.push_back("send welcome email to asha"); });

    // Macro = a command made of commands (Composite + Command)
    vector<function<void()>> steps = {[&] { auditLog.push_back("lights off"); }, [&] { auditLog.push_back("lock door"); }};
    jobs.push([steps] { for (const auto& step : steps) step(); });

    {
        jthread worker([&] {  // one worker: jobs run in queue order
            while (!jobs.empty()) {
                auto job = std::move(jobs.front());
                jobs.pop();
                job();  // the invoker does not know what jobs do
            }
        });
    }  // leaving the scope joins the thread

    cout << auditLog.size() << " actions ran: [";
    for (size_t i = 0; i < auditLog.size(); i++) cout << (i ? ", " : "") << auditLog[i];
    cout << "]\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

// An Action IS the Command pattern without undo. A task queue drained by one worker is an invoker.
class Program {
    static void Main() {
        List<string> auditLog = new List<string>();
        Queue<Action> queue = new Queue<Action>();

        queue.Enqueue(() => auditLog.Add("resize image 42"));
        queue.Enqueue(() => auditLog.Add("send welcome email to asha"));

        // Macro = a command made of commands (Composite + Command)
        List<Action> steps = new List<Action> { () => auditLog.Add("lights off"), () => auditLog.Add("lock door") };
        Action goodNight = () => steps.ForEach(s => s());
        queue.Enqueue(goodNight);

        Task worker = Task.Run(() => {                        // one worker: jobs run in queue order
            while (queue.Count > 0) queue.Dequeue()();        // the invoker does not know what jobs do
        });
        worker.Wait();
        Console.WriteLine(auditLog.Count + " actions ran: [" + string.Join(", ", auditLog) + "]");
    }
}` }
        ] }],
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
      { title: 'Thread pools and schedulers', html: `<p><code>executor.submit(() -&gt; resize(img))</code>: your lambda is a command object. The executor (invoker) queues it, picks a thread and calls <code>run()</code>, with zero knowledge of image resizing. <code>ScheduledExecutorService</code> is the same with a time delay. Message queues (SQS, RabbitMQ) are this idea across machines: the message is a serialized command.</p>`, code: { lang: 'java', code: `ScheduledExecutorService ses = Executors.newSingleThreadScheduledExecutor();
Runnable reminder = () -> System.out.println("Drink water!");   // command object
ses.schedule(reminder, 10, TimeUnit.MILLISECONDS);
ses.shutdown();
ses.awaitTermination(1, TimeUnit.SECONDS);`, alt: [
          { lang: 'python', code: `import threading

reminder = lambda: print("Drink water!")  # command object
timer = threading.Timer(0.01, reminder)  # run once after 10 ms
timer.start()
timer.join()` },
          { lang: 'ts', code: `const reminder = (): void => console.log("Drink water!"); // command object
setTimeout(reminder, 10); // run once after 10 ms` },
          { lang: 'cpp', code: `auto reminder = [] { cout << "Drink water!\\n"; };  // command object
auto later = async(launch::async, [reminder] {
    this_thread::sleep_for(chrono::milliseconds(10));  // run once after 10 ms
    reminder();
});
later.get();` },
  { lang: 'csharp', code: `
using System;
using System.Threading;

class Program {
    static void Main() {
        ManualResetEventSlim done = new ManualResetEventSlim(false);
        TimerCallback reminder = _ => { Console.WriteLine("Drink water!"); done.Set(); };   // command object
        using (Timer timer = new Timer(reminder, null, 10, Timeout.Infinite)) {
            done.Wait(1000);
        }
    }
}` }
        ] } },
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
      brute: { why: `<p>Keep a list of strings like <code>"TRANSFER A B 70"</code> and in <code>undoLast()</code> parse the string and switch on the operation name to reverse it. Every new operation edits both the "do" switch and the "undo" switch; parsing is fragile; failed operations accidentally get logged because logging happens before the balance check.</p>`, code: { lang: 'java', code: `class NaiveBank {
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
}`, alt: [
                { lang: 'python', code: `
class NaiveBank:
    def __init__(self):
        self.bal = {}
        self.log = []
    def op(self, type, a, b, amt):
        self.log.append(f"{type} {a} {b} {amt}")          # logged even if it fails!
        if type == "DEP": self.bal[a] = self.bal.get(a, 0) + amt
        elif type == "WD": self.bal[a] = self.bal.get(a, 0) - amt     # no funds check
        elif type == "TR":
            self.bal[a] = self.bal.get(a, 0) - amt
            self.bal[b] = self.bal.get(b, 0) + amt
    def undo_last(self):
        p = self.log.pop().split(" ")
        amt = int(p[3])
        if p[0] == "DEP": self.bal[p[1]] -= amt           # second switch to maintain
        elif p[0] == "WD": self.bal[p[1]] += amt
        elif p[0] == "TR":
            self.bal[p[1]] += amt
            self.bal[p[2]] -= amt` },
                { lang: 'ts', code: `
class NaiveBank {
    readonly bal = new Map<string, number>();
    readonly log: string[] = [];
    private add(k: string, d: number): void { this.bal.set(k, (this.bal.get(k) ?? 0) + d); }
    op(type: string, a: string, b: string, amt: number): void {
        this.log.push(type + " " + a + " " + b + " " + amt);          // logged even if it fails!
        if (type === "DEP") this.add(a, amt);
        else if (type === "WD") this.add(a, -amt);                     // no funds check
        else if (type === "TR") { this.add(a, -amt); this.add(b, amt); }
    }
    undoLast(): void {
        const p = this.log.pop()!.split(" ");
        const amt = parseInt(p[3]);
        if (p[0] === "DEP") this.add(p[1], -amt);                      // second switch to maintain
        else if (p[0] === "WD") this.add(p[1], amt);
        else if (p[0] === "TR") { this.add(p[1], amt); this.add(p[2], -amt); }
    }
}` },
                { lang: 'cpp', code: `
class NaiveBank {
    unordered_map<string, long long> bal;
    vector<string> log;
public:
    void op(const string& type, const string& a, const string& b, long long amt) {
        log.push_back(type + " " + a + " " + b + " " + to_string(amt));          // logged even if it fails!
        if (type == "DEP") bal[a] += amt;
        else if (type == "WD") bal[a] -= amt;                                    // no funds check
        else if (type == "TR") { bal[a] -= amt; bal[b] += amt; }
    }
    void undoLast() {
        stringstream ss(log.back()); log.pop_back();
        string t, a, b; long long amt;
        ss >> t >> a >> b >> amt;
        if (t == "DEP") bal[a] -= amt;                                           // second switch to maintain
        else if (t == "WD") bal[a] += amt;
        else if (t == "TR") { bal[a] += amt; bal[b] -= amt; }
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class NaiveBank {
    public readonly Dictionary<string, long> Bal = new Dictionary<string, long>();
    public readonly Stack<string> Log = new Stack<string>();
    void Add(string k, long d) { long v; Bal.TryGetValue(k, out v); Bal[k] = v + d; }
    public void Op(string type, string a, string b, long amt) {
        Log.Push(type + " " + a + " " + b + " " + amt);          // logged even if it fails!
        if (type == "DEP") Add(a, amt);
        else if (type == "WD") Add(a, -amt);                     // no funds check
        else if (type == "TR") { Add(a, -amt); Add(b, amt); }
    }
    public void UndoLast() {
        string[] p = Log.Pop().Split(' ');
        long amt = long.Parse(p[3]);
        if (p[0] == "DEP") Add(p[1], -amt);                      // second switch to maintain
        else if (p[0] == "WD") Add(p[1], amt);
        else if (p[0] == "TR") { Add(p[1], amt); Add(p[2], -amt); }
    }
}` }
              ] } },
      mcq: { q: 'withdraw(A, 50) fails because A has only 30. What should the invoker do?', options: ['Not push it onto the undo stack — execute() reports failure first', 'Push it and let undo add 50 back', 'Push it and mark it failed', 'Throw away the entire history'], answer: 0, explain: 'Only successful commands belong in history; undoing a failed withdraw would create money. Have execute() return a boolean (or throw) and push only on success.' },
      hints: [`<p>Hint 1: Each operation becomes an object that knows how to <code>execute()</code> and <code>undo()</code> itself. The bank (invoker) just keeps a stack.</p>`, `<p>Hint 2: <code>interface BankCommand { boolean execute(); void undo(); String describe(); }</code>. Transfer can <b>reuse</b> withdraw + deposit internally, and undo them in reverse order.</p>`, `<p>Hint 3: Push to history only when <code>execute()</code> returns true. Undo on an empty stack returns false. Recipe: Account receiver with deposit/withdraw(returns boolean) → three command classes → Bank.run(cmd) / undoLast().</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "FAILED: withdraw 50 from A\n[transfer 70 A->B, deposit 5 to B] A=30 B=75\nafter undo A=100 B=0\nFAILED: transfer 500 A->B\n[] A=100 B=0\nundo on empty: false\n" }] },
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
        bank.run(new TransferCommand(a, b, 500));        // fails, nothing moves
        System.out.println(bank.history() + " A=" + a.balance() + " B=" + b.balance());
        System.out.println("undo on empty: " + bank.undoLast());
    }
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from collections import deque


class Account:
    def __init__(self, id: str, balance: int):
        self.id = id
        self._balance = balance

    def deposit(self, amt: int) -> None:
        self._balance += amt

    def withdraw(self, amt: int) -> bool:
        if amt > self._balance:  # receiver guards its own invariant
            return False
        self._balance -= amt
        return True

    @property
    def balance(self) -> int:
        return self._balance


class BankCommand(ABC):
    @abstractmethod
    def execute(self) -> bool: ...

    @abstractmethod
    def undo(self) -> None: ...

    @abstractmethod
    def describe(self) -> str: ...


class DepositCommand(BankCommand):
    def __init__(self, acc: Account, amt: int):
        self._acc, self._amt = acc, amt

    def execute(self) -> bool:
        self._acc.deposit(self._amt)
        return True

    def undo(self) -> None:
        self._acc.withdraw(self._amt)

    def describe(self) -> str:
        return f"deposit {self._amt} to {self._acc.id}"


class WithdrawCommand(BankCommand):
    def __init__(self, acc: Account, amt: int):
        self._acc, self._amt = acc, amt

    def execute(self) -> bool:
        return self._acc.withdraw(self._amt)

    def undo(self) -> None:
        self._acc.deposit(self._amt)

    def describe(self) -> str:
        return f"withdraw {self._amt} from {self._acc.id}"


class TransferCommand(BankCommand):
    def __init__(self, src: Account, dst: Account, amt: int):
        self._out = WithdrawCommand(src, amt)
        self._in = DepositCommand(dst, amt)
        self._text = f"transfer {amt} {src.id}->{dst.id}"

    def execute(self) -> bool:
        if not self._out.execute():
            return False
        self._in.execute()
        return True

    def undo(self) -> None:  # reverse order
        self._in.undo()
        self._out.undo()

    def describe(self) -> str:
        return self._text


class Bank:
    def __init__(self):
        self._history: deque[BankCommand] = deque()

    def run(self, cmd: BankCommand) -> bool:
        if not cmd.execute():
            print("FAILED:", cmd.describe())
            return False
        self._history.append(cmd)
        return True

    def undo_last(self) -> bool:
        if not self._history:
            return False
        self._history.pop().undo()
        return True

    def history(self) -> list[str]:
        return [c.describe() for c in self._history]


def show(bank: Bank) -> str:
    return "[" + ", ".join(bank.history()) + "]"


if __name__ == "__main__":
    a, b = Account("A", 100), Account("B", 0)
    bank = Bank()
    bank.run(TransferCommand(a, b, 70))
    bank.run(WithdrawCommand(a, 50))  # fails, not recorded
    bank.run(DepositCommand(b, 5))
    print(f"{show(bank)} A={a.balance} B={b.balance}")
    bank.undo_last()
    bank.undo_last()
    print(f"after undo A={a.balance} B={b.balance}")  # A=100 B=0
    bank.run(TransferCommand(a, b, 500))  # fails, nothing moves
    print(f"{show(bank)} A={a.balance} B={b.balance}")
    print("undo on empty:", str(bank.undo_last()).lower())` },
          { lang: 'ts', code: `class Account {
  constructor(readonly id: string, private _balance: number) {}
  deposit(amt: number): void { this._balance += amt; }
  withdraw(amt: number): boolean {
    if (amt > this._balance) return false; // receiver guards its own invariant
    this._balance -= amt;
    return true;
  }
  get balance(): number { return this._balance; }
}

interface BankCommand {
  execute(): boolean;
  undo(): void;
  describe(): string;
}

class DepositCommand implements BankCommand {
  constructor(private readonly acc: Account, private readonly amt: number) {}
  execute(): boolean { this.acc.deposit(this.amt); return true; }
  undo(): void { this.acc.withdraw(this.amt); }
  describe(): string { return \`deposit \${this.amt} to \${this.acc.id}\`; }
}

class WithdrawCommand implements BankCommand {
  constructor(private readonly acc: Account, private readonly amt: number) {}
  execute(): boolean { return this.acc.withdraw(this.amt); }
  undo(): void { this.acc.deposit(this.amt); }
  describe(): string { return \`withdraw \${this.amt} from \${this.acc.id}\`; }
}

class TransferCommand implements BankCommand {
  private readonly out: BankCommand;
  private readonly in: BankCommand;
  private readonly text: string;
  constructor(from: Account, to: Account, amt: number) {
    this.out = new WithdrawCommand(from, amt);
    this.in = new DepositCommand(to, amt);
    this.text = \`transfer \${amt} \${from.id}->\${to.id}\`;
  }
  execute(): boolean {
    if (!this.out.execute()) return false;
    this.in.execute();
    return true;
  }
  undo(): void { this.in.undo(); this.out.undo(); } // reverse order
  describe(): string { return this.text; }
}

class Bank {
  private readonly stack: BankCommand[] = [];
  run(c: BankCommand): boolean {
    if (!c.execute()) { console.log("FAILED: " + c.describe()); return false; }
    this.stack.push(c);
    return true;
  }
  undoLast(): boolean {
    const c = this.stack.pop();
    if (!c) return false;
    c.undo();
    return true;
  }
  history(): string[] { return this.stack.map((c) => c.describe()); }
}

const show = (bank: Bank): string => "[" + bank.history().join(", ") + "]";

const a = new Account("A", 100), b = new Account("B", 0);
const bank = new Bank();
bank.run(new TransferCommand(a, b, 70));
bank.run(new WithdrawCommand(a, 50)); // fails, not recorded
bank.run(new DepositCommand(b, 5));
console.log(\`\${show(bank)} A=\${a.balance} B=\${b.balance}\`);
bank.undoLast(); bank.undoLast();
console.log(\`after undo A=\${a.balance} B=\${b.balance}\`); // A=100 B=0
bank.run(new TransferCommand(a, b, 500)); // fails, nothing moves
console.log(\`\${show(bank)} A=\${a.balance} B=\${b.balance}\`);
console.log("undo on empty: " + bank.undoLast());` },
          { lang: 'cpp', code: `class Account {
public:
    Account(string id, long long balance) : id_(std::move(id)), balance_(balance) {}
    const string& id() const { return id_; }
    void deposit(long long amt) { balance_ += amt; }
    bool withdraw(long long amt) {
        if (amt > balance_) return false;  // receiver guards its own invariant
        balance_ -= amt;
        return true;
    }
    long long balance() const { return balance_; }
private:
    string id_;
    long long balance_;
};

class BankCommand {
public:
    virtual ~BankCommand() = default;
    virtual bool execute() = 0;
    virtual void undo() = 0;
    virtual string describe() const = 0;
};

class DepositCommand : public BankCommand {
public:
    DepositCommand(Account& acc, long long amt) : acc(acc), amt(amt) {}
    bool execute() override { acc.deposit(amt); return true; }
    void undo() override { acc.withdraw(amt); }
    string describe() const override { return "deposit " + to_string(amt) + " to " + acc.id(); }
private:
    Account& acc; long long amt;
};

class WithdrawCommand : public BankCommand {
public:
    WithdrawCommand(Account& acc, long long amt) : acc(acc), amt(amt) {}
    bool execute() override { return acc.withdraw(amt); }
    void undo() override { acc.deposit(amt); }
    string describe() const override { return "withdraw " + to_string(amt) + " from " + acc.id(); }
private:
    Account& acc; long long amt;
};

class TransferCommand : public BankCommand {
public:
    TransferCommand(Account& from, Account& to, long long amt)
        : out(from, amt), in(to, amt),
          text("transfer " + to_string(amt) + " " + from.id() + "->" + to.id()) {}
    bool execute() override {
        if (!out.execute()) return false;
        in.execute();
        return true;
    }
    void undo() override { in.undo(); out.undo(); }  // reverse order
    string describe() const override { return text; }
private:
    WithdrawCommand out; DepositCommand in; string text;
};

class Bank {
public:
    bool run(unique_ptr<BankCommand> c) {
        if (!c->execute()) { cout << "FAILED: " << c->describe() << "\\n"; return false; }
        history_.push_back(std::move(c));
        return true;
    }
    bool undoLast() {
        if (history_.empty()) return false;
        history_.back()->undo();
        history_.pop_back();
        return true;
    }
    string history() const {
        string s = "[";
        for (size_t i = 0; i < history_.size(); i++) s += (i ? ", " : "") + history_[i]->describe();
        return s + "]";
    }
private:
    vector<unique_ptr<BankCommand>> history_;
};

int main() {
    Account a("A", 100), b("B", 0);
    Bank bank;
    bank.run(make_unique<TransferCommand>(a, b, 70));
    bank.run(make_unique<WithdrawCommand>(a, 50));  // fails, not recorded
    bank.run(make_unique<DepositCommand>(b, 5));
    cout << bank.history() << " A=" << a.balance() << " B=" << b.balance() << "\\n";
    bank.undoLast(); bank.undoLast();
    cout << "after undo A=" << a.balance() << " B=" << b.balance() << "\\n";  // A=100 B=0
    bank.run(make_unique<TransferCommand>(a, b, 500));  // fails, nothing moves
    cout << bank.history() << " A=" << a.balance() << " B=" << b.balance() << "\\n";
    cout << "undo on empty: " << boolalpha << bank.undoLast() << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

class Account {
    public readonly string Id; private long balance;
    public Account(string id, long balance) { Id = id; this.balance = balance; }
    public void Deposit(long amt) { balance += amt; }
    public bool Withdraw(long amt) {
        if (amt > balance) return false;          // receiver guards its own invariant
        balance -= amt; return true;
    }
    public long Balance { get { return balance; } }
}

interface IBankCommand { bool Execute(); void Undo(); string Describe(); }

class DepositCommand : IBankCommand {
    private readonly Account acc; private readonly long amt;
    public DepositCommand(Account acc, long amt) { this.acc = acc; this.amt = amt; }
    public bool Execute() { acc.Deposit(amt); return true; }
    public void Undo() { acc.Withdraw(amt); }
    public string Describe() { return "deposit " + amt + " to " + acc.Id; }
}
class WithdrawCommand : IBankCommand {
    private readonly Account acc; private readonly long amt;
    public WithdrawCommand(Account acc, long amt) { this.acc = acc; this.amt = amt; }
    public bool Execute() { return acc.Withdraw(amt); }
    public void Undo() { acc.Deposit(amt); }
    public string Describe() { return "withdraw " + amt + " from " + acc.Id; }
}
class TransferCommand : IBankCommand {
    private readonly IBankCommand outCmd, inCmd; private readonly string text;
    public TransferCommand(Account from, Account to, long amt) {
        outCmd = new WithdrawCommand(from, amt); inCmd = new DepositCommand(to, amt);
        text = "transfer " + amt + " " + from.Id + "->" + to.Id;
    }
    public bool Execute() { if (!outCmd.Execute()) return false; inCmd.Execute(); return true; }
    public void Undo() { inCmd.Undo(); outCmd.Undo(); }               // reverse order
    public string Describe() { return text; }
}

class Bank {
    private readonly Stack<IBankCommand> history = new Stack<IBankCommand>();
    public bool Run(IBankCommand c) {
        if (!c.Execute()) { Console.WriteLine("FAILED: " + c.Describe()); return false; }
        history.Push(c);
        return true;
    }
    public bool UndoLast() {
        if (history.Count == 0) return false;
        history.Pop().Undo();
        return true;
    }
    public List<string> History() {
        return history.Reverse().Select(c => c.Describe()).ToList();   // oldest first
    }
}

class Program {
    static void Main() {
        Account a = new Account("A", 100), b = new Account("B", 0);
        Bank bank = new Bank();
        bank.Run(new TransferCommand(a, b, 70));
        bank.Run(new WithdrawCommand(a, 50));            // fails, not recorded
        bank.Run(new DepositCommand(b, 5));
        Console.WriteLine("[" + string.Join(", ", bank.History()) + "] A=" + a.Balance + " B=" + b.Balance);
        bank.UndoLast(); bank.UndoLast();
        Console.WriteLine("after undo A=" + a.Balance + " B=" + b.Balance);   // A=100 B=0
        bank.Run(new TransferCommand(a, b, 500));        // fails, nothing moves
        Console.WriteLine("[" + string.Join(", ", bank.History()) + "] A=" + a.Balance + " B=" + b.Balance);
        Console.WriteLine("undo on empty: " + bank.UndoLast().ToString().ToLower());
    }
}` }
        ],
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
}`, alt: [
          { lang: 'python', code: `import threading


class OrderState:
    """Default = illegal. Each state overrides only what it allows. Unknown actions fail loudly."""
    name = "?"

    def pay(self, o: "Order") -> None:
        self._illegal("pay")

    def ship(self, o: "Order") -> None:
        self._illegal("ship")

    def deliver(self, o: "Order") -> None:
        self._illegal("deliver")

    def cancel(self, o: "Order") -> None:
        self._illegal("cancel")

    def _illegal(self, action: str) -> None:
        raise RuntimeError(f"Cannot {action} when order is {self.name}")


# States hold no per-order data, so ONE instance of each can be shared by all orders.
class NewState(OrderState):
    name = "NEW"

    def pay(self, o):
        print("charging card")
        o.set_state(PAID)

    def cancel(self, o):
        o.set_state(CANCELLED)


class PaidState(OrderState):
    name = "PAID"

    def ship(self, o):
        print("handing to courier")
        o.set_state(SHIPPED)

    def cancel(self, o):
        print("refunding")
        o.set_state(CANCELLED)


class ShippedState(OrderState):
    name = "SHIPPED"  # cancel not allowed: the default raises

    def deliver(self, o):
        o.set_state(DELIVERED)


class DeliveredState(OrderState):
    name = "DELIVERED"  # terminal state


class CancelledState(OrderState):
    name = "CANCELLED"  # terminal state


NEW, PAID, SHIPPED, DELIVERED, CANCELLED = NewState(), PaidState(), ShippedState(), DeliveredState(), CancelledState()


class Order:
    def __init__(self):
        self._state: OrderState = NEW
        self._audit: list[str] = []
        self._lock = threading.RLock()

    def set_state(self, nxt: OrderState) -> None:
        self._audit.append(f"{self._state.name} -> {nxt.name}")
        self._state = nxt

    # Every public action is a one-line delegation. The lock = one transition at a time.
    def pay(self) -> None:
        with self._lock:
            self._state.pay(self)

    def ship(self) -> None:
        with self._lock:
            self._state.ship(self)

    def deliver(self) -> None:
        with self._lock:
            self._state.deliver(self)

    def cancel(self) -> None:
        with self._lock:
            self._state.cancel(self)

    def status(self) -> str:
        return self._state.name

    def audit(self) -> list[str]:
        return self._audit


if __name__ == "__main__":
    o = Order()
    o.pay()
    o.ship()
    try:
        o.cancel()
    except RuntimeError as e:
        print(e)
    o.deliver()
    print(o.status(), "[" + ", ".join(o.audit()) + "]")` },
          { lang: 'ts', code: `// Default = illegal. Each state overrides only what it allows. Unknown actions fail loudly.
abstract class OrderState {
  abstract readonly name: string;
  pay(_o: Order): void { this.illegal("pay"); }
  ship(_o: Order): void { this.illegal("ship"); }
  deliver(_o: Order): void { this.illegal("deliver"); }
  cancel(_o: Order): void { this.illegal("cancel"); }
  private illegal(action: string): never {
    throw new Error(\`Cannot \${action} when order is \${this.name}\`);
  }
}

// States hold no per-order data, so ONE instance of each can be shared by all orders.
class NewState extends OrderState {
  readonly name = "NEW";
  override pay(o: Order): void { console.log("charging card"); o.setState(PAID); }
  override cancel(o: Order): void { o.setState(CANCELLED); }
}
class PaidState extends OrderState {
  readonly name = "PAID";
  override ship(o: Order): void { console.log("handing to courier"); o.setState(SHIPPED); }
  override cancel(o: Order): void { console.log("refunding"); o.setState(CANCELLED); }
}
class ShippedState extends OrderState {
  readonly name = "SHIPPED"; // cancel not allowed: the default throws
  override deliver(o: Order): void { o.setState(DELIVERED); }
}
class DeliveredState extends OrderState { readonly name = "DELIVERED"; } // terminal state
class CancelledState extends OrderState { readonly name = "CANCELLED"; } // terminal state

const NEW = new NewState(), PAID = new PaidState(), SHIPPED = new ShippedState();
const DELIVERED = new DeliveredState(), CANCELLED = new CancelledState();

class Order {
  private state: OrderState = NEW;
  private readonly trail: string[] = [];
  setState(next: OrderState): void { this.trail.push(\`\${this.state.name} -> \${next.name}\`); this.state = next; }
  // Every public action is a one-line delegation (JavaScript is single-threaded: no lock needed).
  pay(): void { this.state.pay(this); }
  ship(): void { this.state.ship(this); }
  deliver(): void { this.state.deliver(this); }
  cancel(): void { this.state.cancel(this); }
  status(): string { return this.state.name; }
  audit(): readonly string[] { return this.trail; }
}

const o = new Order();
o.pay(); o.ship();
try { o.cancel(); } catch (e) { console.log((e as Error).message); }
o.deliver();
console.log(o.status() + " [" + o.audit().join(", ") + "]");` },
          { lang: 'cpp', code: `class Order;

class OrderState {
public:
    virtual ~OrderState() = default;
    virtual string name() const = 0;
    // Default = illegal. Each state overrides only what it allows. Unknown actions fail loudly.
    virtual void pay(Order&) const { illegal("pay"); }
    virtual void ship(Order&) const { illegal("ship"); }
    virtual void deliver(Order&) const { illegal("deliver"); }
    virtual void cancel(Order&) const { illegal("cancel"); }
private:
    [[noreturn]] void illegal(const string& action) const {
        throw logic_error("Cannot " + action + " when order is " + name());
    }
};

// States hold no per-order data, so ONE instance of each can be shared by all orders.
const OrderState* newState();
const OrderState* paidState();
const OrderState* shippedState();
const OrderState* deliveredState();
const OrderState* cancelledState();

class Order {
public:
    void setState(const OrderState* next) { audit_.push_back(state->name() + " -> " + next->name()); state = next; }
    // Every public action is a one-line delegation. The mutex = one transition at a time.
    void pay() { lock_guard g(m); state->pay(*this); }
    void ship() { lock_guard g(m); state->ship(*this); }
    void deliver() { lock_guard g(m); state->deliver(*this); }
    void cancel() { lock_guard g(m); state->cancel(*this); }
    string status() const { return state->name(); }
    const vector<string>& audit() const { return audit_; }
private:
    const OrderState* state = newState();  // non-owning: the states are shared singletons
    vector<string> audit_;
    recursive_mutex m;
};

class NewState : public OrderState {
public:
    string name() const override { return "NEW"; }
    void pay(Order& o) const override { cout << "charging card\\n"; o.setState(paidState()); }
    void cancel(Order& o) const override { o.setState(cancelledState()); }
};
class PaidState : public OrderState {
public:
    string name() const override { return "PAID"; }
    void ship(Order& o) const override { cout << "handing to courier\\n"; o.setState(shippedState()); }
    void cancel(Order& o) const override { cout << "refunding\\n"; o.setState(cancelledState()); }
};
class ShippedState : public OrderState {
public:
    string name() const override { return "SHIPPED"; }  // cancel not allowed: the default throws
    void deliver(Order& o) const override { o.setState(deliveredState()); }
};
class DeliveredState : public OrderState {
public:
    string name() const override { return "DELIVERED"; }  // terminal state
};
class CancelledState : public OrderState {
public:
    string name() const override { return "CANCELLED"; }  // terminal state
};

const OrderState* newState() { static const NewState s; return &s; }
const OrderState* paidState() { static const PaidState s; return &s; }
const OrderState* shippedState() { static const ShippedState s; return &s; }
const OrderState* deliveredState() { static const DeliveredState s; return &s; }
const OrderState* cancelledState() { static const CancelledState s; return &s; }

int main() {
    Order o;
    o.pay(); o.ship();
    try { o.cancel(); } catch (const logic_error& e) { cout << e.what() << "\\n"; }
    o.deliver();
    string trail;
    for (const auto& line : o.audit()) trail += (trail.empty() ? "" : ", ") + line;
    cout << o.status() << " [" << trail << "]\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

// Base class: every action is illegal by default. Each state overrides only what it allows.
abstract class OrderState {
    public virtual void Pay(Order o)     { Illegal("pay"); }
    public virtual void Ship(Order o)    { Illegal("ship"); }
    public virtual void Deliver(Order o) { Illegal("deliver"); }
    public virtual void Cancel(Order o)  { Illegal("cancel"); }
    public abstract string Name { get; }
    private void Illegal(string action) {
        throw new InvalidOperationException("Cannot " + action + " when order is " + Name);
    }
}

// States hold no per-order data, so ONE instance of each can be shared by all orders.
sealed class NewState : OrderState {
    public static readonly NewState I = new NewState();
    public override void Pay(Order o)    { Console.WriteLine("charging card"); o.SetState(PaidState.I); }
    public override void Cancel(Order o) { o.SetState(CancelledState.I); }
    public override string Name { get { return "NEW"; } }
}
sealed class PaidState : OrderState {
    public static readonly PaidState I = new PaidState();
    public override void Ship(Order o)   { Console.WriteLine("handing to courier"); o.SetState(ShippedState.I); }
    public override void Cancel(Order o) { Console.WriteLine("refunding"); o.SetState(CancelledState.I); }
    public override string Name { get { return "PAID"; } }
}
sealed class ShippedState : OrderState {
    public static readonly ShippedState I = new ShippedState();
    public override void Deliver(Order o) { o.SetState(DeliveredState.I); }
    public override string Name { get { return "SHIPPED"; } }        // cancel not allowed: default throws
}
sealed class DeliveredState : OrderState {
    public static readonly DeliveredState I = new DeliveredState();
    public override string Name { get { return "DELIVERED"; } }      // terminal state
}
sealed class CancelledState : OrderState {
    public static readonly CancelledState I = new CancelledState();
    public override string Name { get { return "CANCELLED"; } }      // terminal state
}

class Order {
    private OrderState state = NewState.I;
    private readonly List<string> audit = new List<string>();
    private readonly object gate = new object();
    public void SetState(OrderState next) { audit.Add(state.Name + " -> " + next.Name); state = next; }
    // Every public action is a one-line delegation. lock = one transition at a time.
    public void Pay()     { lock (gate) state.Pay(this); }
    public void Ship()    { lock (gate) state.Ship(this); }
    public void Deliver() { lock (gate) state.Deliver(this); }
    public void Cancel()  { lock (gate) state.Cancel(this); }
    public string Status { get { return state.Name; } }
    public List<string> Audit { get { return audit; } }
}

class Program {
    static void Main() {
        Order o = new Order();
        o.Pay(); o.Ship();
        try { o.Cancel(); } catch (InvalidOperationException e) { Console.WriteLine(e.Message); }
        o.Deliver();
        Console.WriteLine(o.Status + " [" + string.Join(", ", o.Audit) + "]");
    }
}` }
        ] }, { lang: 'java', title: 'Table-driven alternative: enum + transition map', code: `// When states have little behaviour (just "which event leads where"), a table is simpler than classes.
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
}`, alt: [
          { lang: 'python', code: `from enum import Enum, auto


# When states have little behaviour (just "which event leads where"), a table is simpler than classes.
class Light(Enum):
    RED = auto()
    GREEN = auto()
    YELLOW = auto()


class Event(Enum):
    TIMER = auto()
    EMERGENCY = auto()


class TrafficLight:
    _T: dict[Light, dict[Event, Light]] = {
        Light.RED: {Event.TIMER: Light.GREEN, Event.EMERGENCY: Light.RED},
        Light.GREEN: {Event.TIMER: Light.YELLOW, Event.EMERGENCY: Light.RED},
        Light.YELLOW: {Event.TIMER: Light.RED, Event.EMERGENCY: Light.RED},
    }

    def __init__(self):
        self._current = Light.RED

    def fire(self, e: Event) -> Light:
        nxt = self._T[self._current].get(e)
        if nxt is None:
            raise RuntimeError(f"{e.name} not allowed in {self._current.name}")
        self._current = nxt
        return self._current


if __name__ == "__main__":
    tl = TrafficLight()
    print(" ".join(tl.fire(Event.TIMER).name for _ in range(4)), tl.fire(Event.EMERGENCY).name)` },
          { lang: 'ts', code: `// When states have little behaviour (just "which event leads where"), a table is simpler than classes.
type Light = "RED" | "GREEN" | "YELLOW";
type Trigger = "TIMER" | "EMERGENCY"; // not called Event: that is a built-in DOM type

const TABLE: Record<Light, Record<Trigger, Light>> = {
  RED: { TIMER: "GREEN", EMERGENCY: "RED" },
  GREEN: { TIMER: "YELLOW", EMERGENCY: "RED" },
  YELLOW: { TIMER: "RED", EMERGENCY: "RED" },
};

class TrafficLight {
  private current: Light = "RED";

  fire(e: Trigger): Light {
    const next = TABLE[this.current][e];
    if (next === undefined) throw new Error(\`\${e} not allowed in \${this.current}\`);
    this.current = next;
    return this.current;
  }
}

const tl = new TrafficLight();
const seen: Light[] = [];
for (let i = 0; i < 4; i++) seen.push(tl.fire("TIMER"));
console.log(seen.join(" ") + " " + tl.fire("EMERGENCY"));` },
          { lang: 'cpp', code: `// When states have little behaviour (just "which event leads where"), a table is simpler than classes.
enum class Light { RED, GREEN, YELLOW };
enum class Event { TIMER, EMERGENCY };

string name(Light l) {
    switch (l) {
        case Light::RED: return "RED";
        case Light::GREEN: return "GREEN";
        case Light::YELLOW: return "YELLOW";
    }
    return "?";
}
string name(Event e) { return e == Event::TIMER ? "TIMER" : "EMERGENCY"; }

class TrafficLight {
public:
    Light fire(Event e) {
        auto row = table.at(current);
        auto it = row.find(e);
        if (it == row.end()) throw logic_error(name(e) + " not allowed in " + name(current));
        return current = it->second;
    }

private:
    const map<Light, map<Event, Light>> table = {
        {Light::RED,    {{Event::TIMER, Light::GREEN},  {Event::EMERGENCY, Light::RED}}},
        {Light::GREEN,  {{Event::TIMER, Light::YELLOW}, {Event::EMERGENCY, Light::RED}}},
        {Light::YELLOW, {{Event::TIMER, Light::RED},    {Event::EMERGENCY, Light::RED}}},
    };
    Light current = Light::RED;
};

int main() {
    TrafficLight tl;
    string line;
    for (int i = 0; i < 4; i++) line += name(tl.fire(Event::TIMER)) + " ";
    cout << line << name(tl.fire(Event::EMERGENCY)) << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

// When states have little behaviour (just "which event leads where"), a table is simpler than classes.
enum Light { RED, GREEN, YELLOW }
enum Event { TIMER, EMERGENCY }

class TrafficLight {
    private static readonly Dictionary<Light, Dictionary<Event, Light>> T = new Dictionary<Light, Dictionary<Event, Light>> {
        { Light.RED,    new Dictionary<Event, Light> { { Event.TIMER, Light.GREEN },  { Event.EMERGENCY, Light.RED } } },
        { Light.GREEN,  new Dictionary<Event, Light> { { Event.TIMER, Light.YELLOW }, { Event.EMERGENCY, Light.RED } } },
        { Light.YELLOW, new Dictionary<Event, Light> { { Event.TIMER, Light.RED },    { Event.EMERGENCY, Light.RED } } } };
    private Light current = Light.RED;

    public Light Fire(Event e) {
        Light next;
        if (!T[current].TryGetValue(e, out next)) throw new InvalidOperationException(e + " not allowed in " + current);
        current = next;
        return current;
    }
}

class Program {
    static void Main() {
        TrafficLight tl = new TrafficLight();
        for (int i = 0; i < 4; i++) Console.Write(tl.Fire(Event.TIMER) + " ");
        Console.WriteLine(tl.Fire(Event.EMERGENCY));
    }
}` }
        ] }],
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
        ALTS[code] = mkAlt(`class Order:
    def __init__(self): self.state = NewState.I
    def pay(self):     self.state.pay(self)
    def ship(self):    self.state.ship(self)
    def deliver(self): self.state.deliver(self)
    def cancel(self):  self.state.cancel(self)`, `class Order {
  state: OrderState = NewState.I;
  pay(): void     { this.state.pay(this); }
  ship(): void    { this.state.ship(this); }
  deliver(): void { this.state.deliver(this); }
  cancel(): void  { this.state.cancel(this); }
}`, `class Order {
public:
  OrderState* state = &NewState::I;
  void pay()     { state->pay(*this); }
  void ship()    { state->ship(*this); }
  void deliver() { state->deliver(*this); }
  void cancel()  { state->cancel(*this); }
};`);
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
          frames.push(F('Event <b>' + e + '()</b> arrives. The Order does <i>not</i> check its status — it calls <code>state.' + e + '(this)</code>, so the call dispatches to <b>' + CLS[cur] + '.' + e + '()</b>.',
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
      { title: 'Media player: play / pause / stop', html: `<p>States: <b>Stopped</b>, <b>Playing</b>, <b>Paused</b>. The <i>play</i> button in Stopped starts from 0:00; in Paused it resumes from the saved position; in Playing it does nothing. With State, each meaning lives in its own class instead of <code>if (playing) … else if (paused) …</code> in every button handler.</p>`, code: { lang: 'java', code: `interface PlayerState { PlayerState play(); PlayerState pause(); }
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
s = s.play();`, alt: [
          { lang: 'python', code: `class Playing:
    def play(self):
        return self

    def pause(self):
        print("pause at 1:23")
        return PAUSED


class Paused:
    def play(self):
        print("resume")
        return PLAYING

    def pause(self):
        return self


PLAYING, PAUSED = Playing(), Paused()  # each state hands back the next one
s = PLAYING
s = s.pause()
s = s.play()` },
          { lang: 'ts', code: `interface PlayerState { play(): PlayerState; pause(): PlayerState; }

const playing: PlayerState = {
  play: () => playing,
  pause: () => { console.log("pause at 1:23"); return paused; },
};
const paused: PlayerState = {
  play: () => { console.log("resume"); return playing; },
  pause: () => paused,
};

let s = playing; // each state hands back the next one
s = s.pause();
s = s.play();` },
          { lang: 'cpp', code: `struct PlayerState {
    virtual ~PlayerState() = default;
    virtual PlayerState* play() = 0;
    virtual PlayerState* pause() = 0;
};
static PlayerState* holder[1];  // lets the two states point at each other
static struct Paused : PlayerState {
    PlayerState* play() override { cout << "resume\\n"; return holder[0]; }
    PlayerState* pause() override { return this; }
} paused;
static struct Playing : PlayerState {
    PlayerState* play() override { return this; }
    PlayerState* pause() override { cout << "pause at 1:23\\n"; return &paused; }
} playing;
holder[0] = &playing;
PlayerState* s = holder[0];
s = s->pause();
s = s->play();` },
  { lang: 'csharp', code: `
using System;

interface IPlayerState { IPlayerState Play(); IPlayerState Pause(); }
sealed class Paused : IPlayerState {
    public IPlayerState Play() { Console.WriteLine("resume"); return new Playing(); }
    public IPlayerState Pause() { return this; }
}
sealed class Playing : IPlayerState {
    public IPlayerState Play() { return this; }
    public IPlayerState Pause() { Console.WriteLine("pause at 1:23"); return new Paused(); }
}
class Program {
    static void Main() {
        IPlayerState s = new Playing();
        s = s.Pause();
        s = s.Play();
    }
}` }
        ] } },
      { title: 'Vending machine (classic interview)', html: `<p>States: <b>Idle</b> → (insert coin) → <b>HasMoney</b> → (select item) → <b>Dispensing</b> → <b>Idle</b>, plus <b>SoldOut</b>. "Select item" in Idle says "insert money first"; in HasMoney it checks price and stock; in SoldOut it refunds. The machine (context) also holds data (inventory, balance) that states read and update. Full design comes in LLD 9.</p>` },
      { title: 'TCP connection', html: `<p>The TCP specification (RFC 793, replaced by RFC 9293 in 2022) literally defines TCP as a state machine: CLOSED, LISTEN, SYN_SENT, SYN_RECEIVED, ESTABLISHED, FIN_WAIT, TIME_WAIT… The same segment (e.g. a FIN) means different things in different states. The original GoF book used <code>TCPConnection</code> as its State example.</p>` },
      { title: 'State vs plain enum switch: when is a switch fine?', html: `<p>If there are 3 states, 2 events and almost no behaviour per state (only "next state"), an <b>enum + transition table</b> (second code tab) is clearer than 3 classes. Use full State classes when states have <b>real behaviour</b> (charging, refunding, timers, messages) or the number of states grows. With sealed types or unions plus an exhaustive switch (Java 21 sealed interfaces, TypeScript unions with a <code>never</code> check, C++ <code>enum class</code> with <code>-Wswitch</code>), the compiler can also check that every state is handled.</p>` }
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
      brute: { why: `<p>An enum field plus a <code>switch</code> inside <code>publish</code>, <code>reject</code>, <code>expire</code> and <code>edit</code>. That is 3 states × 4 methods = 12 branches spread over 4 methods. Adding Archived means editing all four switches; a missed <code>default</code> silently allows illegal transitions.</p>`, code: { lang: 'java', code: `class NaiveDocument {
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
}`, alt: [
                { lang: 'python', code: `
from enum import Enum

class NaiveDocument:
    class S(Enum): DRAFT = 0; MODERATION = 1; PUBLISHED = 2
    def __init__(self): self.s = NaiveDocument.S.DRAFT; self.text = ""
    def publish(self, admin):
        S = NaiveDocument.S
        if self.s == S.DRAFT: self.s = S.PUBLISHED if admin else S.MODERATION
        elif self.s == S.MODERATION:
            if admin: self.s = S.PUBLISHED
            else: raise RuntimeError("admin only")
    def reject(self):
        if self.s == NaiveDocument.S.MODERATION: self.s = NaiveDocument.S.DRAFT
        else: raise RuntimeError()
    def expire(self):
        if self.s == NaiveDocument.S.PUBLISHED: self.s = NaiveDocument.S.DRAFT
        else: raise RuntimeError()
    def edit(self, t):
        if self.s == NaiveDocument.S.DRAFT: self.text = t
        else: raise RuntimeError()
    # adding ARCHIVED = touch every method above` },
                { lang: 'ts', code: `
class NaiveDocument {
    static S = { DRAFT: 0, MODERATION: 1, PUBLISHED: 2 } as const;
    s: number = NaiveDocument.S.DRAFT; text = "";
    publish(admin: boolean): void {
        const S = NaiveDocument.S;
        switch (this.s) {
            case S.DRAFT: this.s = admin ? S.PUBLISHED : S.MODERATION; break;
            case S.MODERATION: if (admin) this.s = S.PUBLISHED; else throw new Error("admin only"); break;
            case S.PUBLISHED: break;
        }
    }
    reject(): void { if (this.s === NaiveDocument.S.MODERATION) this.s = NaiveDocument.S.DRAFT; else throw new Error(); }
    expire(): void { if (this.s === NaiveDocument.S.PUBLISHED) this.s = NaiveDocument.S.DRAFT; else throw new Error(); }
    edit(t: string): void { if (this.s === NaiveDocument.S.DRAFT) this.text = t; else throw new Error(); }
    // adding ARCHIVED = touch every method above
}` },
                { lang: 'cpp', code: `
class NaiveDocument {
    enum S { DRAFT, MODERATION, PUBLISHED };
    S s = DRAFT; string text;
public:
    void publish(bool admin) {
        switch (s) {
            case DRAFT: s = admin ? PUBLISHED : MODERATION; break;
            case MODERATION: if (admin) s = PUBLISHED; else throw runtime_error("admin only"); break;
            case PUBLISHED: break;
        }
    }
    void reject() { if (s == MODERATION) s = DRAFT; else throw runtime_error(""); }
    void expire() { if (s == PUBLISHED) s = DRAFT; else throw runtime_error(""); }
    void edit(const string& t) { if (s == DRAFT) text = t; else throw runtime_error(""); }
    // adding ARCHIVED = touch every method above
};` },
  { lang: 'csharp', code: `
using System;

class NaiveDocument {
    public enum S { DRAFT, MODERATION, PUBLISHED }
    public S State = S.DRAFT; public string Text = "";
    public void Publish(bool admin) {
        switch (State) {
            case S.DRAFT: State = admin ? S.PUBLISHED : S.MODERATION; break;
            case S.MODERATION: if (admin) State = S.PUBLISHED; else throw new InvalidOperationException("admin only"); break;
            case S.PUBLISHED: break;
        }
    }
    public void Reject() { if (State == S.MODERATION) State = S.DRAFT; else throw new InvalidOperationException(); }
    public void Expire() { if (State == S.PUBLISHED) State = S.DRAFT; else throw new InvalidOperationException(); }
    public void Edit(string t) { if (State == S.DRAFT) Text = t; else throw new InvalidOperationException(); }
    // adding ARCHIVED = touch every method above
}` }
              ] } },
      mcq: { q: 'In the State pattern, where does the rule "only admins may publish from Moderation" live?', options: ['Inside ModerationState.publish()', 'Inside Document.publish() with an if', 'In the User class', 'In a global validator'], answer: 0, explain: 'All rules of a state live in that state class. Document.publish() just delegates.' },
      hints: [`<p>Hint 1: List the states and, for each, what every method does. That table <i>is</i> your class list.</p>`, `<p>Hint 2: <code>interface DocState</code> with default methods that throw; each state overrides only legal actions. States return or set the next state.</p>`, `<p>Hint 3: <code>edit()</code> is allowed only in Draft → <code>DraftState</code> overrides edit; others inherit the throwing default. Mark Document methods <code>synchronized</code>. Recipe: record User(name, admin) → DocState interface → 3 singletons → Document delegates.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "Moderation\nOnly an admin can publish from Moderation\nDraft\nPublished\nCannot edit in Published\nDraft\nCannot reject in Draft\n" }] },
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
        d.expire();                              System.out.println(d.state());   // Draft
        try { d.reject(); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }
    }
}`, alt: [
          { lang: 'python', code: `import threading
from dataclasses import dataclass


@dataclass(frozen=True)
class User:
    name: str
    admin: bool


class DocState:
    """Every transition is illegal unless a concrete state overrides it."""
    name = "?"

    def publish(self, doc: "Document", user: User) -> "DocState":
        raise self._no("publish")

    def reject(self, doc: "Document") -> "DocState":
        raise self._no("reject")

    def expire(self, doc: "Document") -> "DocState":
        raise self._no("expire")

    def edit(self, doc: "Document", text: str) -> None:
        raise self._no("edit")

    def _no(self, what: str) -> RuntimeError:
        return RuntimeError(f"Cannot {what} in {self.name}")


class Draft(DocState):
    name = "Draft"

    def publish(self, doc, user):
        return PUBLISHED if user.admin else MODERATION

    def edit(self, doc, text):
        doc.text = text


class Moderation(DocState):
    name = "Moderation"

    def publish(self, doc, user):
        if not user.admin:
            raise RuntimeError("Only an admin can publish from Moderation")
        return PUBLISHED

    def reject(self, doc):
        return DRAFT


class Published(DocState):
    name = "Published"

    def publish(self, doc, user):
        return self  # no-op

    def expire(self, doc):
        return DRAFT


DRAFT, MODERATION, PUBLISHED = Draft(), Moderation(), Published()  # stateless, so shared


class Document:
    def __init__(self):
        self._state: DocState = DRAFT
        self.text = ""
        self._lock = threading.Lock()

    def publish(self, user: User) -> None:
        with self._lock:
            self._state = self._state.publish(self, user)

    def reject(self) -> None:
        with self._lock:
            self._state = self._state.reject(self)

    def expire(self) -> None:
        with self._lock:
            self._state = self._state.expire(self)

    def edit(self, text: str) -> None:
        with self._lock:
            self._state.edit(self, text)

    @property
    def state(self) -> str:
        return self._state.name


if __name__ == "__main__":
    author, admin = User("ria", False), User("root", True)
    d = Document()
    d.edit("hello")
    d.publish(author)
    print(d.state)  # Moderation
    try:
        d.publish(author)
    except RuntimeError as e:
        print(e)
    d.reject()
    print(d.state)  # Draft
    d.publish(admin)
    print(d.state)  # Published
    try:
        d.edit("x")
    except RuntimeError as e:
        print(e)
    d.expire()
    print(d.state)  # Draft
    try:
        d.reject()
    except RuntimeError as e:
        print(e)` },
          { lang: 'ts', code: `interface User { readonly name: string; readonly admin: boolean; }

interface DocState {
  readonly name: string;
  publish(d: Doc, u: User): DocState;
  reject(d: Doc): DocState;
  expire(d: Doc): DocState;
  edit(d: Doc, text: string): void;
}

// Every transition is illegal unless a concrete state overrides it.
abstract class BaseState implements DocState {
  abstract readonly name: string;
  publish(_d: Doc, _u: User): DocState { throw this.no("publish"); }
  reject(_d: Doc): DocState { throw this.no("reject"); }
  expire(_d: Doc): DocState { throw this.no("expire"); }
  edit(_d: Doc, _text: string): void { throw this.no("edit"); }
  private no(what: string): Error { return new Error(\`Cannot \${what} in \${this.name}\`); }
}

class Draft extends BaseState {
  readonly name = "Draft";
  publish(_d: Doc, u: User): DocState { return u.admin ? PUBLISHED : MODERATION; }
  edit(d: Doc, text: string): void { d.text = text; }
}

class Moderation extends BaseState {
  readonly name = "Moderation";
  publish(_d: Doc, u: User): DocState {
    if (!u.admin) throw new Error("Only an admin can publish from Moderation");
    return PUBLISHED;
  }
  reject(_d: Doc): DocState { return DRAFT; }
}

class Published extends BaseState {
  readonly name = "Published";
  publish(_d: Doc, _u: User): DocState { return this; } // no-op
  expire(_d: Doc): DocState { return DRAFT; }
}

const DRAFT = new Draft(), MODERATION = new Moderation(), PUBLISHED = new Published(); // stateless, so shared

// Named Doc because Document is a built-in DOM type.
class Doc {
  text = "";
  private current: DocState = DRAFT;
  publish(u: User): void { this.current = this.current.publish(this, u); }
  reject(): void { this.current = this.current.reject(this); }
  expire(): void { this.current = this.current.expire(this); }
  edit(text: string): void { this.current.edit(this, text); }
  get state(): string { return this.current.name; }
}

function attempt(action: () => void): void {
  try { action(); } catch (e) { console.log((e as Error).message); }
}

const author: User = { name: "ria", admin: false }, admin: User = { name: "root", admin: true };
const d = new Doc();
d.edit("hello");
d.publish(author); console.log(d.state); // Moderation
attempt(() => d.publish(author));
d.reject(); console.log(d.state); // Draft
d.publish(admin); console.log(d.state); // Published
attempt(() => d.edit("x"));
d.expire(); console.log(d.state); // Draft
attempt(() => d.reject());` },
          { lang: 'cpp', code: `struct User { string name; bool admin; };

class Document;

class DocState {
public:
    virtual ~DocState() = default;
    virtual string name() const = 0;
    // Every transition is illegal unless a concrete state overrides it.
    virtual const DocState* publish(Document&, const User&) const { throw no("publish"); }
    virtual const DocState* reject(Document&) const { throw no("reject"); }
    virtual const DocState* expire(Document&) const { throw no("expire"); }
    virtual void edit(Document&, const string&) const { throw no("edit"); }
protected:
    runtime_error no(const string& what) const { return runtime_error("Cannot " + what + " in " + name()); }
};

const DocState* draft();
const DocState* moderation();
const DocState* published();

class Document {
public:
    void setText(const string& t) { text = t; }
    void publish(const User& u) { state_ = state_->publish(*this, u); }
    void reject() { state_ = state_->reject(*this); }
    void expire() { state_ = state_->expire(*this); }
    void edit(const string& t) { state_->edit(*this, t); }
    string state() const { return state_->name(); }
private:
    const DocState* state_ = draft();  // non-owning: the states are shared singletons
    string text;
};

class Draft : public DocState {
public:
    string name() const override { return "Draft"; }
    const DocState* publish(Document&, const User& u) const override { return u.admin ? published() : moderation(); }
    void edit(Document& d, const string& text) const override { d.setText(text); }
};
class Moderation : public DocState {
public:
    string name() const override { return "Moderation"; }
    const DocState* publish(Document&, const User& u) const override {
        if (!u.admin) throw runtime_error("Only an admin can publish from Moderation");
        return published();
    }
    const DocState* reject(Document&) const override { return draft(); }
};
class Published : public DocState {
public:
    string name() const override { return "Published"; }
    const DocState* publish(Document&, const User&) const override { return this; }  // no-op
    const DocState* expire(Document&) const override { return draft(); }
};

const DocState* draft() { static const Draft s; return &s; }
const DocState* moderation() { static const Moderation s; return &s; }
const DocState* published() { static const Published s; return &s; }

void attempt(const function<void()>& action) {
    try { action(); } catch (const runtime_error& e) { cout << e.what() << "\\n"; }
}

int main() {
    User author{"ria", false}, admin{"root", true};
    Document d;
    d.edit("hello");
    d.publish(author); cout << d.state() << "\\n";  // Moderation
    attempt([&] { d.publish(author); });
    d.reject(); cout << d.state() << "\\n";  // Draft
    d.publish(admin); cout << d.state() << "\\n";  // Published
    attempt([&] { d.edit("x"); });
    d.expire(); cout << d.state() << "\\n";  // Draft
    attempt([&] { d.reject(); });
}` },
  { lang: 'csharp', code: `
using System;

sealed class User {
    public readonly string Name; public readonly bool Admin;
    public User(string name, bool admin) { Name = name; Admin = admin; }
}

abstract class DocState {
    public abstract string Name { get; }
    public virtual DocState Publish(Document d, User u) { throw No("publish"); }
    public virtual DocState Reject(Document d)          { throw No("reject"); }
    public virtual DocState Expire(Document d)          { throw No("expire"); }
    public virtual void Edit(Document d, string text)   { throw No("edit"); }
    private InvalidOperationException No(string what) { return new InvalidOperationException("Cannot " + what + " in " + Name); }
}

sealed class Draft : DocState {
    public static readonly Draft I = new Draft();
    public override string Name { get { return "Draft"; } }
    public override DocState Publish(Document d, User u) { return u.Admin ? (DocState)Published.I : Moderation.I; }
    public override void Edit(Document d, string text) { d.SetText(text); }
}
sealed class Moderation : DocState {
    public static readonly Moderation I = new Moderation();
    public override string Name { get { return "Moderation"; } }
    public override DocState Publish(Document d, User u) {
        if (!u.Admin) throw new InvalidOperationException("Only an admin can publish from Moderation");
        return Published.I;
    }
    public override DocState Reject(Document d) { return Draft.I; }
}
sealed class Published : DocState {
    public static readonly Published I = new Published();
    public override string Name { get { return "Published"; } }
    public override DocState Publish(Document d, User u) { return this; }     // no-op
    public override DocState Expire(Document d) { return Draft.I; }
}

class Document {
    private DocState state = Draft.I;
    private string text = "";
    private readonly object gate = new object();
    public void SetText(string t) { text = t; }
    public void Publish(User u) { lock (gate) state = state.Publish(this, u); }
    public void Reject()        { lock (gate) state = state.Reject(this); }
    public void Expire()        { lock (gate) state = state.Expire(this); }
    public void Edit(string t)  { lock (gate) state.Edit(this, t); }
    public string State { get { return state.Name; } }
}

class Program {
    static void Main() {
        User author = new User("ria", false), admin = new User("root", true);
        Document d = new Document();
        d.Edit("hello");
        d.Publish(author);                       Console.WriteLine(d.State);   // Moderation
        try { d.Publish(author); } catch (InvalidOperationException e) { Console.WriteLine(e.Message); }
        d.Reject();                              Console.WriteLine(d.State);   // Draft
        d.Publish(admin);                        Console.WriteLine(d.State);   // Published
        try { d.Edit("x"); } catch (InvalidOperationException e) { Console.WriteLine(e.Message); }
        d.Expire();                              Console.WriteLine(d.State);   // Draft
        try { d.Reject(); } catch (InvalidOperationException e) { Console.WriteLine(e.Message); }
    }
}` }
        ],
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
<p>You see it in standard libraries and frameworks: Java's <code>AbstractList</code> (implement <code>get</code> and <code>size</code>, get the whole List API), <code>InputStream.read(byte[])</code> built on the abstract <code>read()</code>, <code>HttpServlet.service()</code> dispatching to <code>doGet</code>/<code>doPost</code>, JUnit's <code>@BeforeEach</code> → test → <code>@AfterEach</code> lifecycle, Spring's <code>JdbcTemplate</code> (a callback-based cousin). Python's <code>collections.abc.Sequence</code> works the same way (implement <code>__getitem__</code> and <code>__len__</code>, inherit <code>__contains__</code>, <code>index</code> and <code>__iter__</code>), and <code>unittest.TestCase</code> runs <code>setUp</code> → test → <code>tearDown</code>.</p>`,
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
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import final


@dataclass(frozen=True)
class Row:
    name: str
    age: int


class DataImporter(ABC):
    # The TEMPLATE METHOD: marked final, so subclasses should not change the order of steps.
    @final
    def import_file(self, file_name: str, content: str) -> int:
        print("open", file_name)  # fixed step
        rows = self.parse(content)  # abstract step: must override
        if self.should_validate():  # hook decides whether to validate
            rows = self._validate(rows)
        self._save(rows)  # fixed step
        self.after_import(len(rows))  # hook: empty by default
        return len(rows)

    @abstractmethod
    def parse(self, content: str) -> list[Row]:  # every format is different
        ...

    def should_validate(self) -> bool:  # hook with a sensible default
        return True

    def after_import(self, count: int) -> None:  # hook: do nothing by default
        pass

    def _validate(self, rows: list[Row]) -> list[Row]:  # shared rule, written once
        return [r for r in rows if 0 <= r.age < 150 and r.name.strip()]

    def _save(self, rows: list[Row]) -> None:  # shared, e.g. batched DB insert
        print(f"saving {len(rows)} rows in one batch")


class CsvImporter(DataImporter):
    def parse(self, content: str) -> list[Row]:
        out = []
        for line in content.split("\\n"):
            name, age = line.split(",")
            out.append(Row(name.strip(), int(age.strip())))
        return out


class TrustedFeedImporter(DataImporter):  # already-clean partner feed
    def parse(self, content: str) -> list[Row]:
        return [Row(k, int(v)) for k, v in (part.split("=") for part in content.split(";"))]

    def should_validate(self) -> bool:  # override hook
        return False

    def after_import(self, count: int) -> None:
        print("ping partner: got", count)


if __name__ == "__main__":
    print(CsvImporter().import_file("users.csv", "asha, 31\\nben, -4\\ncy, 22"))
    print(TrustedFeedImporter().import_file("feed.txt", "dee=40;eli=29"))` },
          { lang: 'ts', code: `interface Row { readonly name: string; readonly age: number; }

abstract class DataImporter {
  // The TEMPLATE METHOD: one fixed order of steps. Subclasses fill in the blanks, never reorder them.
  importFile(fileName: string, content: string): number {
    console.log("open " + fileName); // fixed step
    let rows = this.parse(content); // abstract step: must override
    if (this.shouldValidate()) rows = this.validate(rows); // hook decides whether to validate
    this.save(rows); // fixed step
    this.afterImport(rows.length); // hook: empty by default
    return rows.length;
  }

  protected abstract parse(content: string): Row[]; // every format is different

  protected shouldValidate(): boolean { return true; } // hook with a sensible default
  protected afterImport(_count: number): void {} // hook: do nothing by default

  private validate(rows: Row[]): Row[] { // shared rule, written once
    return rows.filter((r) => r.age >= 0 && r.age < 150 && r.name.trim() !== "");
  }
  private save(rows: Row[]): void { // shared, e.g. batched DB insert
    console.log(\`saving \${rows.length} rows in one batch\`);
  }
}

class CsvImporter extends DataImporter {
  protected parse(content: string): Row[] {
    return content.split("\\n").map((line) => {
      const [name, age] = line.split(",");
      return { name: name.trim(), age: Number(age.trim()) };
    });
  }
}

class TrustedFeedImporter extends DataImporter { // already-clean partner feed
  protected parse(content: string): Row[] {
    return content.split(";").map((part) => {
      const [name, age] = part.split("=");
      return { name, age: Number(age) };
    });
  }
  protected override shouldValidate(): boolean { return false; } // override hook
  protected override afterImport(n: number): void { console.log("ping partner: got " + n); }
}

console.log(new CsvImporter().importFile("users.csv", "asha, 31\\nben, -4\\ncy, 22"));
console.log(new TrustedFeedImporter().importFile("feed.txt", "dee=40;eli=29"));` },
          { lang: 'cpp', code: `struct Row { string name; int age; };

string trim(const string& s) {
    size_t a = s.find_first_not_of(" \\t"), b = s.find_last_not_of(" \\t");
    return a == string::npos ? "" : s.substr(a, b - a + 1);
}

vector<string> splitOn(const string& s, char sep) {
    vector<string> parts;
    stringstream ss(s);
    for (string p; getline(ss, p, sep);) parts.push_back(p);
    return parts;
}

class DataImporter {
public:
    virtual ~DataImporter() = default;

    // The TEMPLATE METHOD: non-virtual, so subclasses cannot change the order of steps.
    int importFile(const string& fileName, const string& content) {
        cout << "open " << fileName << "\\n";                 // fixed step
        vector<Row> rows = parse(content);                    // abstract step: must override
        if (shouldValidate()) rows = validate(rows);          // hook decides whether to validate
        save(rows);                                           // fixed step
        afterImport(rows.size());                             // hook: empty by default
        return int(rows.size());
    }

protected:
    virtual vector<Row> parse(const string& content) = 0;    // every format is different

    virtual bool shouldValidate() const { return true; }     // hook with a sensible default
    virtual void afterImport(size_t) {}                      // hook: do nothing by default

private:
    vector<Row> validate(const vector<Row>& rows) const {    // shared rule, written once
        vector<Row> ok;
        for (const Row& r : rows)
            if (r.age >= 0 && r.age < 150 && !trim(r.name).empty()) ok.push_back(r);
        return ok;
    }
    void save(const vector<Row>& rows) const {               // shared, e.g. batched DB insert
        cout << "saving " << rows.size() << " rows in one batch\\n";
    }
};

class CsvImporter : public DataImporter {
protected:
    vector<Row> parse(const string& content) override {
        vector<Row> out;
        for (const string& line : splitOn(content, '\\n')) {
            auto p = splitOn(line, ',');
            out.push_back({trim(p[0]), stoi(trim(p[1]))});
        }
        return out;
    }
};

class TrustedFeedImporter : public DataImporter {  // already-clean partner feed
protected:
    vector<Row> parse(const string& content) override {
        vector<Row> out;
        for (const string& part : splitOn(content, ';')) {
            auto kv = splitOn(part, '=');
            out.push_back({kv[0], stoi(kv[1])});
        }
        return out;
    }
    bool shouldValidate() const override { return false; }  // override hook
    void afterImport(size_t n) override { cout << "ping partner: got " << n << "\\n"; }
};

int main() {
    cout << CsvImporter().importFile("users.csv", "asha, 31\\nben, -4\\ncy, 22") << "\\n";
    cout << TrustedFeedImporter().importFile("feed.txt", "dee=40;eli=29") << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

sealed class Row {
    public readonly string Name; public readonly int Age;
    public Row(string name, int age) { Name = name; Age = age; }
}

abstract class DataImporter {
    // The TEMPLATE METHOD: not virtual, so subclasses cannot change the order of steps.
    public int ImportFile(string fileName, string content) {
        Console.WriteLine("open " + fileName);               // fixed step
        List<Row> rows = Parse(content);                     // abstract step: must override
        if (ShouldValidate()) rows = Validate(rows);         // hook decides whether to validate
        Save(rows);                                          // fixed step
        AfterImport(rows.Count);                             // hook: empty by default
        return rows.Count;
    }

    protected abstract List<Row> Parse(string content);      // every format is different

    protected virtual bool ShouldValidate() { return true; } // hook with a sensible default
    protected virtual void AfterImport(int count) { }        // hook: do nothing by default

    private List<Row> Validate(List<Row> rows) {             // shared rule, written once
        List<Row> ok = new List<Row>();
        foreach (Row r in rows) if (r.Age >= 0 && r.Age < 150 && !string.IsNullOrWhiteSpace(r.Name)) ok.Add(r);
        return ok;
    }
    private void Save(List<Row> rows) {                      // shared, e.g. batched DB insert
        Console.WriteLine("saving " + rows.Count + " rows in one batch");
    }
}

class CsvImporter : DataImporter {
    protected override List<Row> Parse(string content) {
        List<Row> result = new List<Row>();
        foreach (string line in content.Split('\\n')) {
            string[] p = line.Split(',');
            result.Add(new Row(p[0].Trim(), int.Parse(p[1].Trim())));
        }
        return result;
    }
}

class TrustedFeedImporter : DataImporter {                   // already-clean partner feed
    protected override List<Row> Parse(string content) {
        List<Row> result = new List<Row>();
        foreach (string part in content.Split(';')) {
            string[] kv = part.Split('=');
            result.Add(new Row(kv[0], int.Parse(kv[1])));
        }
        return result;
    }
    protected override bool ShouldValidate() { return false; }               // override hook
    protected override void AfterImport(int n) { Console.WriteLine("ping partner: got " + n); }
}

class Program {
    static void Main() {
        Console.WriteLine(new CsvImporter().ImportFile("users.csv", "asha, 31\\nben, -4\\ncy, 22"));
        Console.WriteLine(new TrustedFeedImporter().ImportFile("feed.txt", "dee=40;eli=29"));
    }
}` }
        ] }],
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
        ALTS[code] = mkAlt(`def import_file(self, f, c):      # not meant to be overridden
    self.open(f)                      # fixed
    rows = self.parse(c)              # abstract
    if self.should_validate():        # hook
        rows = self.validate(rows)    # fixed
    self.save(rows)                   # fixed
    self.after_import(len(rows))      # hook
    return len(rows)`, `importFile(f: string, c: string): number {   // no subclass should override this
  this.open(f);                        // fixed
  const rows = this.parse(c);          // abstract
  if (this.shouldValidate())           // hook
    rows = this.validate(rows);        // fixed
  this.save(rows);                     // fixed
  this.afterImport(rows.length);       // hook
  return rows.length;
}`, `int importFile(const string& f, const string& c) {   // non-virtual: subclasses cannot override
  open(f);                        // fixed
  auto rows = parse(c);           // abstract
  if (shouldValidate())           // hook
    rows = validate(rows);        // fixed
  save(rows);                     // fixed
  afterImport(rows.size());       // hook
  return rows.size();
}`);
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
        step(3, SUB.id, '<b>Abstract step</b> <code>parse(c)</code>: the base calls it, but the call dispatches to <b>' + SUB.cls + '.parse()</b>. "Don\'t call us, we\'ll call you" — the parent calls the child.', [{ type: 'array', label: 'parsed rows', values: parsed }], 'ok');
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
      { title: 'Tea vs Coffee (the classic)', html: `<p><code>prepareRecipe()</code> = boilWater → <b>brew()</b> → pourInCup → <b>addCondiments()</b> if <code>customerWantsCondiments()</code>. Tea brews by steeping, coffee by dripping; a "black coffee" subclass overrides the hook to return false. Two abstract steps, one hook, one fixed order.</p>`, code: { lang: 'java', code: `abstract class Beverage {
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
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from typing import final


class Beverage(ABC):
    @final
    def prepare(self) -> None:
        self._boil()
        self.brew()
        self._pour()
        if self.wants_extras():
            self.add_extras()

    def _boil(self) -> None:
        print("boil water")

    def _pour(self) -> None:
        print("pour into cup")

    @abstractmethod
    def brew(self) -> None: ...

    @abstractmethod
    def add_extras(self) -> None: ...

    def wants_extras(self) -> bool:  # hook
        return True


class Tea(Beverage):
    def brew(self) -> None:
        print("steep tea bag")

    def add_extras(self) -> None:
        print("add lemon")


class BlackCoffee(Beverage):
    def brew(self) -> None:
        print("drip coffee")

    def add_extras(self) -> None:
        print("add milk")

    def wants_extras(self) -> bool:
        return False` },
          { lang: 'ts', code: `abstract class Beverage {
  prepare(): void { this.boil(); this.brew(); this.pour(); if (this.wantsExtras()) this.addExtras(); }
  private boil(): void { console.log("boil water"); }
  private pour(): void { console.log("pour into cup"); }
  protected abstract brew(): void;
  protected abstract addExtras(): void;
  protected wantsExtras(): boolean { return true; } // hook
}

class Tea extends Beverage {
  protected brew(): void { console.log("steep tea bag"); }
  protected addExtras(): void { console.log("add lemon"); }
}

class BlackCoffee extends Beverage {
  protected brew(): void { console.log("drip coffee"); }
  protected addExtras(): void { console.log("add milk"); }
  protected override wantsExtras(): boolean { return false; }
}` },
          { lang: 'cpp', code: `class Beverage {
public:
    virtual ~Beverage() = default;
    void prepare() { boil(); brew(); pour(); if (wantsExtras()) addExtras(); }  // non-virtual: the template
protected:
    virtual void brew() = 0;
    virtual void addExtras() = 0;
    virtual bool wantsExtras() const { return true; }  // hook
private:
    void boil() const { cout << "boil water\\n"; }
    void pour() const { cout << "pour into cup\\n"; }
};

class Tea : public Beverage {
protected:
    void brew() override { cout << "steep tea bag\\n"; }
    void addExtras() override { cout << "add lemon\\n"; }
};

class BlackCoffee : public Beverage {
protected:
    void brew() override { cout << "drip coffee\\n"; }
    void addExtras() override { cout << "add milk\\n"; }
    bool wantsExtras() const override { return false; }
};` },
  { lang: 'csharp', code: `
using System;

abstract class Beverage {
    public void Prepare() { Boil(); Brew(); Pour(); if (WantsExtras()) AddExtras(); }
    private void Boil() { Console.WriteLine("boil water"); }
    private void Pour() { Console.WriteLine("pour into cup"); }
    protected abstract void Brew();
    protected abstract void AddExtras();
    protected virtual bool WantsExtras() { return true; }      // hook
}
class Tea : Beverage {
    protected override void Brew() { Console.WriteLine("steep tea bag"); }
    protected override void AddExtras() { Console.WriteLine("add lemon"); }
}
class BlackCoffee : Beverage {
    protected override void Brew() { Console.WriteLine("drip coffee"); }
    protected override void AddExtras() { Console.WriteLine("add milk"); }
    protected override bool WantsExtras() { return false; }
}` }
        ] } },
      { title: 'AbstractList: write 2 methods, get 30', html: `<p>Extend <code>AbstractList&lt;E&gt;</code> and implement only <code>get(int)</code> and <code>size()</code>. You instantly get <code>iterator()</code>, <code>contains()</code>, <code>indexOf()</code>, <code>equals()</code>, <code>hashCode()</code>, <code>subList()</code>, streams… all template methods in the base calling your two primitives.</p>`, code: { lang: 'java', code: `List<Integer> squares = new AbstractList<Integer>() {
    public Integer get(int i) { return i * i; }
    public int size() { return 5; }
};
System.out.println(squares + " contains 9? " + squares.contains(9));`, alt: [
          { lang: 'python', code: `from collections.abc import Sequence


class Squares(Sequence):  # write __getitem__ and __len__, get the rest from the base class
    def __getitem__(self, i: int) -> int:
        if not 0 <= i < len(self):
            raise IndexError(i)
        return i * i

    def __len__(self) -> int:
        return 5


squares = Squares()
print(f"{list(squares)} contains 9? {str(9 in squares).lower()}")` },
          { lang: 'ts', code: `// JavaScript has no AbstractList, so write the small base class once: two primitives, many methods.
abstract class AbstractList<T> {
  abstract get(i: number): T;
  abstract size(): number;
  *[Symbol.iterator](): Generator<T> { for (let i = 0; i < this.size(); i++) yield this.get(i); }
  contains(x: T): boolean { for (const v of this) if (v === x) return true; return false; }
  toString(): string { return "[" + [...this].join(", ") + "]"; }
}

const squares = new (class extends AbstractList<number> {
  get(i: number): number { return i * i; }
  size(): number { return 5; }
})();
console.log(\`\${squares} contains 9? \${squares.contains(9)}\`);` },
          { lang: 'cpp', code: `// A lazy view plays the AbstractList role: define the element rule once, reuse every algorithm.
auto squares = views::iota(0, 5) | views::transform([](int i) { return i * i; });
cout << "[";
for (int v : squares) cout << (v ? ", " : "") << v;
cout << "] contains 9? " << boolalpha << (ranges::find(squares, 9) != squares.end()) << "\\n";` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

class Program {
    static void Main() {
        // Enumerable.Range + Select is a lazy, read-only list: the framework supplies iteration and
        // search, you supply only "what is element i".
        IEnumerable<int> squares = Enumerable.Range(0, 5).Select(i => i * i);
        Console.WriteLine("[" + string.Join(", ", squares) + "] contains 9? " + squares.Contains(9).ToString().ToLower());
    }
}` }
        ] } },
      { title: 'HttpServlet.service()', html: `<p>The servlet container calls <code>service(req, res)</code> (template method). It reads the HTTP method and calls <code>doGet</code>, <code>doPost</code>, <code>doPut</code>… which you override. Default implementations return 405 Method Not Allowed — they are hooks with a safe default.</p>` },
      { title: 'Template Method vs Strategy for the same problem', html: `<p>The importer could instead be <code>Importer(Parser parser)</code> with a <code>Parser</code> strategy. Pick <b>Template Method</b> when the steps share lots of protected state with the skeleton and the variation is fixed per class. Pick <b>Strategy</b> when you need to mix and match at runtime (CSV parser + no validation + S3 saver), when steps are reusable elsewhere, or when you want to avoid deep inheritance. Many teams start with Template Method and refactor to strategies as combinations multiply.</p>` }
    ],
    deepDive: `<p><b>Make the template method <code>final</code></b>, otherwise a subclass can override it and silently skip validation or resource cleanup — the whole guarantee disappears. Make fixed steps <code>private</code> (or <code>final</code>), primitives <code>protected abstract</code>, and hooks <code>protected</code> with safe defaults.</p>
<p><b>Fragile base class problem:</b> subclasses depend on <i>when</i> and <i>how often</i> the base calls their steps. Changing the skeleton (e.g. calling <code>parse()</code> twice, or calling a hook before fields are initialised) can break subclasses you never saw. Never call overridable methods from a constructor: the subclass's fields are not initialised yet.</p>
<p><b>Inheritance limits:</b> in Java and TypeScript a class has a single parent, so a class that already extends something cannot also extend your template (Python and C++ allow multiple inheritance, with their own diamond problems). Combinatorial variation (3 formats × 2 validation modes × 2 destinations) explodes into 12 subclasses — the signal to switch to Strategy/composition. A functional middle ground: a template method that accepts lambdas for steps (<code>importFile(content, parser, afterHook)</code>), like Spring's <code>JdbcTemplate</code> + <code>RowMapper</code> callback.</p>
<p><b>Liskov:</b> a subclass must respect the contract of each step (e.g. <code>parse</code> returns a non-null list). Document step contracts on the abstract methods. <b>Testing:</b> test the skeleton once with a tiny test subclass that records which steps were called in which order; test each subclass's steps directly.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI often generates near-duplicate classes ("write a JSON importer like this CSV importer") — fast, but you end up with copy-pasted skeletons. Ask instead: "Extract the shared workflow into an abstract base with a final template method; keep only parse() in subclasses." AI is good at this mechanical refactor and at finding duplicated sequences across files.</p>
<p><b>In LLM pipelines</b> the template is everywhere: <i>build prompt → call model → parse output → validate → retry on failure → log</i>. Base "chain" classes in agent frameworks fix this skeleton and let you override <code>buildPrompt</code> and <code>parse</code>. Validation and retry policy must stay in the fixed part so nobody skips them.</p>
<p><b>Where AI goes wrong:</b> forgets <code>final</code>, calls abstract methods from constructors, or creates a template for two classes that share one line. <b>What you own:</b> deciding inheritance vs composition and protecting invariants in the skeleton.</p>`,
    problems: [{
      title: 'Report Exporter: CSV, HTML and Markdown', level: 'Easy', tags: ['template method', 'dry'], companies: ['Microsoft', 'Salesforce', 'Zoho'],
      statement: `<p>Export a list of <code>Sale(region, amount)</code> as text in three formats. Every export must: (1) write a header, (2) write one line per sale <b>sorted by amount descending</b>, (3) write a footer with the total, and (4) <b>escape</b> special characters in region names. CSV, HTML table and Markdown table differ only in how header, row and footer look. Make the shared workflow impossible to skip.</p>`,
      constraints: `Up to 10<sup>5</sup> sales. Amounts are non-negative longs. Region names may contain commas, &lt; or |.`,
      example: `<p>Sales: (North, 300), (South, 500). CSV output:<br><code>region,amount</code><br><code>South,500</code><br><code>North,300</code><br><code>TOTAL,800</code><br>Sorted descending, total in the footer — the same <b>order of steps</b> for every format; only the formatting differs.</p>`,
      brute: { why: `<p>Three independent classes each copy the sort, the loop, the total computation and the escaping. A bug in sorting (e.g. ascending) is fixed in CSV but forgotten in HTML; the Markdown version forgets escaping entirely. The skeleton exists three times.</p>`, code: { lang: 'java', code: `class NaiveCsvExport {
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
// NaiveHtmlExport and NaiveMarkdownExport: the same loop pasted twice more, with different bugs.`, alt: [
                { lang: 'python', code: `
class NaiveCsvExport:
    def export(self, rows, regions):
        sb = "region,amount\\n"
        total = 0
        for i in range(len(rows)):       # forgot to sort!
            sb += regions[i] + "," + str(rows[i][0]) + "\\n"
            total += rows[i][0]
        return sb + "TOTAL," + str(total)
# NaiveHtmlExport and NaiveMarkdownExport: the same loop pasted twice more, with different bugs.` },
                { lang: 'ts', code: `
class NaiveCsvExport {
    export(rows: number[][], regions: string[]): string {
        let sb = "region,amount\\n";
        let total = 0;
        for (let i = 0; i < rows.length; i++) {       // forgot to sort!
            sb += regions[i] + "," + rows[i][0] + "\\n";
            total += rows[i][0];
        }
        return sb + "TOTAL," + total;
    }
}
// NaiveHtmlExport and NaiveMarkdownExport: the same loop pasted twice more, with different bugs.` },
                { lang: 'cpp', code: `
class NaiveCsvExport {
public:
    string exportRows(const vector<vector<long long>>& rows, const vector<string>& regions) {
        string sb = "region,amount\\n";
        long long total = 0;
        for (size_t i = 0; i < rows.size(); i++) {       // forgot to sort!
            sb += regions[i] + "," + to_string(rows[i][0]) + "\\n";
            total += rows[i][0];
        }
        return sb + "TOTAL," + to_string(total);
    }
};
// NaiveHtmlExport and NaiveMarkdownExport: the same loop pasted twice more, with different bugs.` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Text;

class NaiveCsvExport {
    public string Export(List<long[]> rows, List<string> regions) {
        StringBuilder sb = new StringBuilder("region,amount\\n");
        long total = 0;
        for (int i = 0; i < rows.Count; i++) {        // forgot to sort!
            sb.Append(regions[i]).Append(',').Append(rows[i][0]).Append('\\n');
            total += rows[i][0];
        }
        return sb.Append("TOTAL,").Append(total).ToString();
    }
}
// NaiveHtmlExport and NaiveMarkdownExport: the same loop pasted twice more, with different bugs.` }
              ] } },
      mcq: { q: 'Which method of the base exporter should be declared final?', options: ['export() — the template method that fixes the order of steps', 'row() — the formatting of a line', 'escape() — every format escapes differently', 'None; final is bad practice'], answer: 0, explain: 'The template method must be final so subclasses cannot reorder or skip sorting, totals or escaping. Format-specific pieces are the overridable steps.' },
      hints: [`<p>Hint 1: Write down the steps every format performs. What differs? Only header text, row text, footer text and the escape rule.</p>`, `<p>Hint 2: Abstract class <code>ReportExporter</code> with <code>public final String export(List&lt;Sale&gt;)</code> and protected abstract <code>header()</code>, <code>row(region, amount)</code>, <code>footer(total)</code>, plus a hook <code>escape(String)</code>.</p>`, `<p>Hint 3: Sort a <b>copy</b> (don't mutate the caller's list). Recipe: copy+sort → header → for each: row(escape(region), amount) → footer(total). CSV escape quotes fields containing commas; HTML escapes &amp;lt;; Markdown escapes |.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "region,amount\n\"South, East\",500\nNorth,300\nA<B|C,50\nTOTAL,850\n<table><tr><th>region</th><th>amount</th></tr>\n<tr><td>South, East</td><td>500</td></tr>\n<tr><td>North</td><td>300</td></tr>\n<tr><td>A&lt;B|C</td><td>50</td></tr>\n<tr><td>TOTAL</td><td>850</td></tr></table>\n| region | amount |\n|---|---|\n| South, East | 500 |\n| North | 300 |\n| A<B\\|C | 50 |\n| **TOTAL** | 850 |\nregion,amount\n\"say \"\"hi\"\"\",7\nTOTAL,7\nregion,amount\nTOTAL,0\n" }] },
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
            System.out.print(e.export(sales));
        System.out.print(new CsvExporter().export(List.of(new Sale("say \\"hi\\"", 7))));   // quote doubling
        System.out.print(new CsvExporter().export(List.of()));                          // empty input
    }
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import final


@dataclass(frozen=True)
class Sale:
    region: str
    amount: int


class ReportExporter(ABC):
    @final
    def export(self, sales: list[Sale]) -> str:  # the template method: fixed order of steps
        ordered = sorted(sales, key=lambda s: s.amount, reverse=True)  # never mutates the input
        out = [self.header()]
        total = 0
        for s in ordered:
            out.append(self.row(self.escape(s.region), s.amount))
            total += s.amount
        out.append(self.footer(total))
        return "".join(out)

    @abstractmethod
    def header(self) -> str: ...

    @abstractmethod
    def row(self, region: str, amount: int) -> str: ...

    @abstractmethod
    def footer(self, total: int) -> str: ...

    def escape(self, s: str) -> str:  # hook
        return s


class CsvExporter(ReportExporter):
    def header(self) -> str:
        return "region,amount\\n"

    def row(self, region: str, amount: int) -> str:
        return f"{region},{amount}\\n"

    def footer(self, total: int) -> str:
        return f"TOTAL,{total}\\n"

    def escape(self, s: str) -> str:
        if "," in s or '"' in s:
            return '"' + s.replace('"', '""') + '"'
        return s


class HtmlExporter(ReportExporter):
    def header(self) -> str:
        return "<table><tr><th>region</th><th>amount</th></tr>\\n"

    def row(self, region: str, amount: int) -> str:
        return f"<tr><td>{region}</td><td>{amount}</td></tr>\\n"

    def footer(self, total: int) -> str:
        return f"<tr><td>TOTAL</td><td>{total}</td></tr></table>\\n"

    def escape(self, s: str) -> str:
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


class MarkdownExporter(ReportExporter):
    def header(self) -> str:
        return "| region | amount |\\n|---|---|\\n"

    def row(self, region: str, amount: int) -> str:
        return f"| {region} | {amount} |\\n"

    def footer(self, total: int) -> str:
        return f"| **TOTAL** | {total} |\\n"

    def escape(self, s: str) -> str:
        return s.replace("|", "\\\\|")


if __name__ == "__main__":
    sales = [Sale("North", 300), Sale("South, East", 500), Sale("A<B|C", 50)]
    for e in (CsvExporter(), HtmlExporter(), MarkdownExporter()):
        print(e.export(sales), end="")
    print(CsvExporter().export([Sale('say "hi"', 7)]), end="")  # quote doubling
    print(CsvExporter().export([]), end="")  # empty input` },
          { lang: 'ts', code: `interface Sale { readonly region: string; readonly amount: number; }

abstract class ReportExporter {
  // The template method: fixed order of steps. Subclasses must not override it.
  export(sales: readonly Sale[]): string {
    const sorted = [...sales].sort((a, b) => b.amount - a.amount); // never mutate the input
    let out = this.header();
    let total = 0;
    for (const s of sorted) {
      out += this.row(this.escape(s.region), s.amount);
      total += s.amount;
    }
    return out + this.footer(total);
  }
  protected abstract header(): string;
  protected abstract row(region: string, amount: number): string;
  protected abstract footer(total: number): string;
  protected escape(s: string): string { return s; } // hook
}

class CsvExporter extends ReportExporter {
  protected header(): string { return "region,amount\\n"; }
  protected row(r: string, a: number): string { return \`\${r},\${a}\\n\`; }
  protected footer(t: number): string { return \`TOTAL,\${t}\\n\`; }
  protected override escape(s: string): string {
    return s.includes(",") || s.includes('"') ? \`"\${s.replaceAll('"', '""')}"\` : s;
  }
}

class HtmlExporter extends ReportExporter {
  protected header(): string { return "<table><tr><th>region</th><th>amount</th></tr>\\n"; }
  protected row(r: string, a: number): string { return \`<tr><td>\${r}</td><td>\${a}</td></tr>\\n\`; }
  protected footer(t: number): string { return \`<tr><td>TOTAL</td><td>\${t}</td></tr></table>\\n\`; }
  protected override escape(s: string): string {
    return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }
}

class MarkdownExporter extends ReportExporter {
  protected header(): string { return "| region | amount |\\n|---|---|\\n"; }
  protected row(r: string, a: number): string { return \`| \${r} | \${a} |\\n\`; }
  protected footer(t: number): string { return \`| **TOTAL** | \${t} |\\n\`; }
  protected override escape(s: string): string { return s.replaceAll("|", "\\\\|"); }
}

const sales: Sale[] = [
  { region: "North", amount: 300 },
  { region: "South, East", amount: 500 },
  { region: "A<B|C", amount: 50 },
];
const show = (report: string): void => console.log(report.trimEnd()); // reports already end with a newline
for (const e of [new CsvExporter(), new HtmlExporter(), new MarkdownExporter()]) show(e.export(sales));
show(new CsvExporter().export([{ region: 'say "hi"', amount: 7 }])); // quote doubling
show(new CsvExporter().export([])); // empty input` },
          { lang: 'cpp', code: `struct Sale { string region; long long amount; };

class ReportExporter {
public:
    virtual ~ReportExporter() = default;
    // The template method: fixed order of steps (named exportReport because \`export\` is a C++20 keyword).
    string exportReport(vector<Sale> sales) const {  // taken by value: the caller's list is never mutated
        ranges::sort(sales, greater<>(), &Sale::amount);
        string out = header();
        long long total = 0;
        for (const Sale& s : sales) {
            out += row(escape(s.region), s.amount);
            total += s.amount;
        }
        return out + footer(total);
    }
protected:
    virtual string header() const = 0;
    virtual string row(const string& region, long long amount) const = 0;
    virtual string footer(long long total) const = 0;
    virtual string escape(const string& s) const { return s; }  // hook
};

string replaceAll(string s, const string& from, const string& to) {
    for (size_t at = 0; (at = s.find(from, at)) != string::npos; at += to.size()) s.replace(at, from.size(), to);
    return s;
}

class CsvExporter : public ReportExporter {
protected:
    string header() const override { return "region,amount\\n"; }
    string row(const string& r, long long a) const override { return r + "," + to_string(a) + "\\n"; }
    string footer(long long t) const override { return "TOTAL," + to_string(t) + "\\n"; }
    string escape(const string& s) const override {
        if (s.find(',') == string::npos && s.find('"') == string::npos) return s;
        return "\\"" + replaceAll(s, "\\"", "\\"\\"") + "\\"";
    }
};

class HtmlExporter : public ReportExporter {
protected:
    string header() const override { return "<table><tr><th>region</th><th>amount</th></tr>\\n"; }
    string row(const string& r, long long a) const override { return "<tr><td>" + r + "</td><td>" + to_string(a) + "</td></tr>\\n"; }
    string footer(long long t) const override { return "<tr><td>TOTAL</td><td>" + to_string(t) + "</td></tr></table>\\n"; }
    string escape(const string& s) const override {
        return replaceAll(replaceAll(replaceAll(s, "&", "&amp;"), "<", "&lt;"), ">", "&gt;");
    }
};

class MarkdownExporter : public ReportExporter {
protected:
    string header() const override { return "| region | amount |\\n|---|---|\\n"; }
    string row(const string& r, long long a) const override { return "| " + r + " | " + to_string(a) + " |\\n"; }
    string footer(long long t) const override { return "| **TOTAL** | " + to_string(t) + " |\\n"; }
    string escape(const string& s) const override { return replaceAll(s, "|", "\\\\|"); }
};

int main() {
    vector<Sale> sales = {{"North", 300}, {"South, East", 500}, {"A<B|C", 50}};
    vector<unique_ptr<ReportExporter>> exporters;
    exporters.push_back(make_unique<CsvExporter>());
    exporters.push_back(make_unique<HtmlExporter>());
    exporters.push_back(make_unique<MarkdownExporter>());
    for (const auto& e : exporters) cout << e->exportReport(sales);
    cout << CsvExporter().exportReport({{"say \\"hi\\"", 7}});  // quote doubling
    cout << CsvExporter().exportReport({});                  // empty input
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

sealed class Sale {
    public readonly string Region; public readonly long Amount;
    public Sale(string region, long amount) { Region = region; Amount = amount; }
}

abstract class ReportExporter {
    public string Export(List<Sale> sales) {                                    // the template method
        List<Sale> sorted = sales.OrderByDescending(s => s.Amount).ToList();   // never mutate input; shared rule
        StringBuilder sb = new StringBuilder(Header());
        long total = 0;
        foreach (Sale s in sorted) {
            sb.Append(Row(Escape(s.Region), s.Amount));
            total += s.Amount;
        }
        return sb.Append(Footer(total)).ToString();
    }
    protected abstract string Header();
    protected abstract string Row(string region, long amount);
    protected abstract string Footer(long total);
    protected virtual string Escape(string s) { return s; }                   // hook
}

class CsvExporter : ReportExporter {
    protected override string Header() { return "region,amount\\n"; }
    protected override string Row(string r, long a) { return r + "," + a + "\\n"; }
    protected override string Footer(long t) { return "TOTAL," + t + "\\n"; }
    protected override string Escape(string s) {
        return s.Contains(",") || s.Contains("\\"") ? "\\"" + s.Replace("\\"", "\\"\\"") + "\\"" : s;
    }
}
class HtmlExporter : ReportExporter {
    protected override string Header() { return "<table><tr><th>region</th><th>amount</th></tr>\\n"; }
    protected override string Row(string r, long a) { return "<tr><td>" + r + "</td><td>" + a + "</td></tr>\\n"; }
    protected override string Footer(long t) { return "<tr><td>TOTAL</td><td>" + t + "</td></tr></table>\\n"; }
    protected override string Escape(string s) { return s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;"); }
}
class MarkdownExporter : ReportExporter {
    protected override string Header() { return "| region | amount |\\n|---|---|\\n"; }
    protected override string Row(string r, long a) { return "| " + r + " | " + a + " |\\n"; }
    protected override string Footer(long t) { return "| **TOTAL** | " + t + " |\\n"; }
    protected override string Escape(string s) { return s.Replace("|", "\\\\|"); }
}

class Program {
    static void Main() {
        List<Sale> sales = new List<Sale> { new Sale("North", 300), new Sale("South, East", 500), new Sale("A<B|C", 50) };
        foreach (ReportExporter e in new ReportExporter[] { new CsvExporter(), new HtmlExporter(), new MarkdownExporter() })
            Console.Write(e.Export(sales));
        Console.Write(new CsvExporter().Export(new List<Sale> { new Sale("say \\"hi\\"", 7) }));   // quote doubling
        Console.Write(new CsvExporter().Export(new List<Sale>()));                              // empty input
    }
}` }
        ],
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
}`, alt: [
          { lang: 'python', code: `from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import final


@dataclass(frozen=True)
class Expense:
    employee: str
    amount: int
    category: str


class Approver(ABC):
    def __init__(self, title: str):
        self._title = title
        self._next: Approver | None = None

    # Returns \`nxt\` so chains can be built fluently: a.link_to(b).link_to(c)
    def link_to(self, nxt: Approver) -> Approver:
        self._next = nxt
        return nxt

    # The walking logic lives ONCE in the base class.
    @final
    def handle(self, e: Expense) -> str:
        if self.can_approve(e):
            return f"{self._title} approved {e.amount} for {e.employee}"
        if self._next is None:
            return f"REJECTED: nobody can approve {e.amount}"
        return self._next.handle(e)

    @abstractmethod
    def can_approve(self, e: Expense) -> bool: ...


class TeamLead(Approver):
    def __init__(self):
        super().__init__("TeamLead")

    def can_approve(self, e: Expense) -> bool:
        return e.amount <= 1_000


class Manager(Approver):
    def __init__(self):
        super().__init__("Manager")

    def can_approve(self, e: Expense) -> bool:
        return e.amount <= 10_000


class Director(Approver):
    def __init__(self):
        super().__init__("Director")

    # Special rule lives with the handler that owns it, not in a central if/else.
    def can_approve(self, e: Expense) -> bool:
        return e.amount <= 50_000 or (e.category == "TRAINING" and e.amount <= 80_000)


class Cfo(Approver):
    def __init__(self):
        super().__init__("CFO")

    def can_approve(self, e: Expense) -> bool:
        return e.amount <= 200_000


if __name__ == "__main__":
    head = TeamLead()
    head.link_to(Manager()).link_to(Director()).link_to(Cfo())  # assembled once
    for amt in (500, 7_500, 70_000, 999_999):
        print(head.handle(Expense("asha", amt, "TRAINING" if amt == 70_000 else "TRAVEL")))` },
          { lang: 'ts', code: `interface Expense { readonly employee: string; readonly amount: number; readonly category: string; }

abstract class Approver {
  private next: Approver | null = null;

  protected constructor(private readonly title: string) {}

  // Returns \`next\` so chains can be built fluently: a.linkTo(b).linkTo(c)
  linkTo(next: Approver): Approver {
    this.next = next;
    return next;
  }

  // The walking logic lives ONCE in the base class.
  handle(e: Expense): string {
    if (this.canApprove(e)) return \`\${this.title} approved \${e.amount} for \${e.employee}\`;
    if (this.next === null) return \`REJECTED: nobody can approve \${e.amount}\`;
    return this.next.handle(e);
  }

  protected abstract canApprove(e: Expense): boolean;
}

class TeamLead extends Approver {
  constructor() { super("TeamLead"); }
  protected canApprove(e: Expense): boolean { return e.amount <= 1_000; }
}
class Manager extends Approver {
  constructor() { super("Manager"); }
  protected canApprove(e: Expense): boolean { return e.amount <= 10_000; }
}
class Director extends Approver {
  constructor() { super("Director"); }
  // Special rule lives with the handler that owns it, not in a central if/else.
  protected canApprove(e: Expense): boolean {
    return e.amount <= 50_000 || (e.category === "TRAINING" && e.amount <= 80_000);
  }
}
class Cfo extends Approver {
  constructor() { super("CFO"); }
  protected canApprove(e: Expense): boolean { return e.amount <= 200_000; }
}

const head = new TeamLead();
head.linkTo(new Manager()).linkTo(new Director()).linkTo(new Cfo()); // assembled once
for (const amt of [500, 7_500, 70_000, 999_999]) {
  console.log(head.handle({ employee: "asha", amount: amt, category: amt === 70_000 ? "TRAINING" : "TRAVEL" }));
}` },
          { lang: 'cpp', code: `struct Expense { string employee; long long amount; string category; };

class Approver {
public:
    virtual ~Approver() = default;

    // Returns the new link so chains can be built fluently: a.linkTo(b).linkTo(c). The chain owns its links.
    Approver& linkTo(unique_ptr<Approver> n) {
        next = std::move(n);
        return *next;
    }

    // The walking logic lives ONCE in the base class.
    string handle(const Expense& e) const {
        if (canApprove(e)) return title + " approved " + to_string(e.amount) + " for " + e.employee;
        if (!next) return "REJECTED: nobody can approve " + to_string(e.amount);
        return next->handle(e);
    }

protected:
    explicit Approver(string title) : title(std::move(title)) {}
    virtual bool canApprove(const Expense& e) const = 0;

private:
    string title;
    unique_ptr<Approver> next;
};

class TeamLead : public Approver {
public:
    TeamLead() : Approver("TeamLead") {}
protected:
    bool canApprove(const Expense& e) const override { return e.amount <= 1'000; }
};
class Manager : public Approver {
public:
    Manager() : Approver("Manager") {}
protected:
    bool canApprove(const Expense& e) const override { return e.amount <= 10'000; }
};
class Director : public Approver {
public:
    Director() : Approver("Director") {}
protected:
    // Special rule lives with the handler that owns it, not in a central if/else.
    bool canApprove(const Expense& e) const override {
        return e.amount <= 50'000 || (e.category == "TRAINING" && e.amount <= 80'000);
    }
};
class Cfo : public Approver {
public:
    Cfo() : Approver("CFO") {}
protected:
    bool canApprove(const Expense& e) const override { return e.amount <= 200'000; }
};

int main() {
    TeamLead head;
    head.linkTo(make_unique<Manager>()).linkTo(make_unique<Director>()).linkTo(make_unique<Cfo>());  // assembled once
    for (long long amt : {500LL, 7'500LL, 70'000LL, 999'999LL})
        cout << head.handle({"asha", amt, amt == 70'000 ? "TRAINING" : "TRAVEL"}) << "\\n";
}` },
  { lang: 'csharp', code: `
using System;

sealed class Expense {
    public readonly string Employee, Category; public readonly long Amount;
    public Expense(string employee, long amount, string category) { Employee = employee; Amount = amount; Category = category; }
}

abstract class Approver {
    private Approver next;
    private readonly string title;
    protected Approver(string title) { this.title = title; }

    // Returns 'next' so chains can be built fluently: a.LinkTo(b).LinkTo(c)
    public Approver LinkTo(Approver next) { this.next = next; return next; }

    // The walking logic lives ONCE in the base class.
    public string Handle(Expense e) {
        if (CanApprove(e)) return title + " approved " + e.Amount + " for " + e.Employee;
        if (next == null) return "REJECTED: nobody can approve " + e.Amount;
        return next.Handle(e);
    }
    protected abstract bool CanApprove(Expense e);
}

class TeamLead : Approver {
    public TeamLead() : base("TeamLead") { }
    protected override bool CanApprove(Expense e) { return e.Amount <= 1000; }
}
class Manager : Approver {
    public Manager() : base("Manager") { }
    protected override bool CanApprove(Expense e) { return e.Amount <= 10000; }
}
class Director : Approver {
    public Director() : base("Director") { }
    // Special rule lives with the handler that owns it, not in a central if/else.
    protected override bool CanApprove(Expense e) {
        return e.Amount <= 50000 || (e.Category == "TRAINING" && e.Amount <= 80000);
    }
}
class Cfo : Approver {
    public Cfo() : base("CFO") { }
    protected override bool CanApprove(Expense e) { return e.Amount <= 200000; }
}

class Program {
    static void Main() {
        Approver head = new TeamLead();
        head.LinkTo(new Manager()).LinkTo(new Director()).LinkTo(new Cfo());   // assembled once
        foreach (long amt in new long[] { 500, 7500, 70000, 999999 })
            Console.WriteLine(head.Handle(new Expense("asha", amt, amt == 70000 ? "TRAINING" : "TRAVEL")));
    }
}` }
        ] }, { lang: 'java', title: 'Middleware pipeline (every handler may act, any may stop)', code: `record Request(String path, String token, String ip) {}
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
                Response res = next.apply(r);
                System.out.println(r.path() + " -> " + res.status());
                return res;
            })
            .use((r, next) -> r.token() == null ? new Response(401, "login first") : next.apply(r))   // auth
            .use((r, next) -> hits.merge(r.ip(), 1, Integer::sum) > 2 ? new Response(429, "slow down") : next.apply(r));
        for (int i = 0; i < 4; i++) System.out.println(p.handle(new Request("/orders", i == 0 ? null : "asha", "1.2.3.4")).body());
    }
}`, alt: [
          { lang: 'python', code: `from dataclasses import dataclass
from typing import Callable, Optional


@dataclass(frozen=True)
class Request:
    path: str
    token: Optional[str]
    ip: str


@dataclass(frozen=True)
class Response:
    status: int
    body: str


Handler = Callable[[Request], Response]
# A middleware receives the request and a "next" function it MAY call.
Middleware = Callable[[Request, Handler], Response]


class Pipeline:
    def __init__(self, endpoint: Handler):
        self._chain: list[Middleware] = []
        self._endpoint = endpoint

    def use(self, m: Middleware) -> "Pipeline":
        self._chain.append(m)
        return self

    def handle(self, r: Request) -> Response:
        return self._call(0, r)

    def _call(self, i: int, r: Request) -> Response:
        if i == len(self._chain):
            return self._endpoint(r)  # end of chain: real handler
        return self._chain[i](r, lambda req: self._call(i + 1, req))  # give it a 'next'


if __name__ == "__main__":
    hits: dict[str, int] = {}

    def logging(r: Request, nxt: Handler) -> Response:  # before AND after
        res = nxt(r)
        print(f"{r.path} -> {res.status}")
        return res

    def auth(r: Request, nxt: Handler) -> Response:
        return Response(401, "login first") if r.token is None else nxt(r)

    def rate_limit(r: Request, nxt: Handler) -> Response:
        hits[r.ip] = hits.get(r.ip, 0) + 1
        return Response(429, "slow down") if hits[r.ip] > 2 else nxt(r)

    p = Pipeline(lambda r: Response(200, f"orders for {r.token}")).use(logging).use(auth).use(rate_limit)
    for i in range(4):
        print(p.handle(Request("/orders", None if i == 0 else "asha", "1.2.3.4")).body)` },
          { lang: 'ts', code: `// (Named ApiRequest/ApiResponse because Request and Response are built-in types.)
interface ApiRequest { readonly path: string; readonly token: string | null; readonly ip: string; }
interface ApiResponse { readonly status: number; readonly body: string; }

type Handler = (r: ApiRequest) => ApiResponse;
// A middleware receives the request and a "next" function it MAY call.
type Middleware = (r: ApiRequest, next: Handler) => ApiResponse;

class Pipeline {
  private readonly chain: Middleware[] = [];
  constructor(private readonly endpoint: Handler) {}

  use(m: Middleware): this {
    this.chain.push(m);
    return this;
  }

  handle(r: ApiRequest): ApiResponse { return this.call(0, r); }

  private call(i: number, r: ApiRequest): ApiResponse {
    if (i === this.chain.length) return this.endpoint(r); // end of chain: real handler
    return this.chain[i](r, (req) => this.call(i + 1, req)); // give it a 'next'
  }
}

const hits = new Map<string, number>();
const p = new Pipeline((r) => ({ status: 200, body: \`orders for \${r.token}\` }))
  .use((r, next) => { // logging: before AND after
    const res = next(r);
    console.log(\`\${r.path} -> \${res.status}\`);
    return res;
  })
  .use((r, next) => (r.token === null ? { status: 401, body: "login first" } : next(r))) // auth
  .use((r, next) => {
    const n = (hits.get(r.ip) ?? 0) + 1;
    hits.set(r.ip, n);
    return n > 2 ? { status: 429, body: "slow down" } : next(r);
  });
for (let i = 0; i < 4; i++) console.log(p.handle({ path: "/orders", token: i === 0 ? null : "asha", ip: "1.2.3.4" }).body);` },
          { lang: 'cpp', code: `struct Request { string path; optional<string> token; string ip; };
struct Response { int status; string body; };

using Handler = function<Response(const Request&)>;
// A middleware receives the request and a "next" function it MAY call.
using Middleware = function<Response(const Request&, const Handler&)>;

class Pipeline {
public:
    explicit Pipeline(Handler endpoint) : endpoint(std::move(endpoint)) {}

    Pipeline& use(Middleware m) {
        chain.push_back(std::move(m));
        return *this;
    }

    Response handle(const Request& r) const { return call(0, r); }

private:
    Response call(size_t i, const Request& r) const {
        if (i == chain.size()) return endpoint(r);  // end of chain: real handler
        return chain[i](r, [this, i](const Request& req) { return call(i + 1, req); });  // give it a 'next'
    }

    vector<Middleware> chain;
    Handler endpoint;
};

int main() {
    map<string, int> hits;
    Pipeline p([](const Request& r) { return Response{200, "orders for " + *r.token}; });
    p.use([](const Request& r, const Handler& next) {  // logging: before AND after
         Response res = next(r);
         cout << r.path << " -> " << res.status << "\\n";
         return res;
     })
     .use([](const Request& r, const Handler& next) {  // auth
         return r.token ? next(r) : Response{401, "login first"};
     })
     .use([&hits](const Request& r, const Handler& next) {
         return ++hits[r.ip] > 2 ? Response{429, "slow down"} : next(r);
     });
    for (int i = 0; i < 4; i++)
        cout << p.handle({"/orders", i == 0 ? nullopt : optional<string>("asha"), "1.2.3.4"}).body << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

sealed class Request {
    public readonly string Path, Token, Ip;
    public Request(string path, string token, string ip) { Path = path; Token = token; Ip = ip; }
}
sealed class Response {
    public readonly int Status; public readonly string Body;
    public Response(int status, string body) { Status = status; Body = body; }
}

// A middleware receives the request and a "next" function it MAY call.
delegate Response Middleware(Request r, Func<Request, Response> next);

class Pipeline {
    private readonly List<Middleware> chain = new List<Middleware>();
    private readonly Func<Request, Response> endpoint;
    public Pipeline(Func<Request, Response> endpoint) { this.endpoint = endpoint; }
    public Pipeline Use(Middleware m) { chain.Add(m); return this; }

    public Response Handle(Request r) { return Call(0, r); }
    private Response Call(int i, Request r) {
        if (i == chain.Count) return endpoint(r);                       // end of chain: real handler
        return chain[i](r, req => Call(i + 1, req));                    // give it a 'next'
    }
}

class Program {
    static void Main() {
        Dictionary<string, int> hits = new Dictionary<string, int>();
        Pipeline p = new Pipeline(r => new Response(200, "orders for " + r.Token))
            .Use((r, next) => {                                          // logging: before AND after
                Response res = next(r);
                Console.WriteLine(r.Path + " -> " + res.Status);
                return res;
            })
            .Use((r, next) => r.Token == null ? new Response(401, "login first") : next(r))   // auth
            .Use((r, next) => { int n; hits.TryGetValue(r.Ip, out n); hits[r.Ip] = ++n; return n > 2 ? new Response(429, "slow down") : next(r); });
        for (int i = 0; i < 4; i++) Console.WriteLine(p.Handle(new Request("/orders", i == 0 ? null : "asha", "1.2.3.4")).Body);
    }
}` }
        ] }],
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
      { title: 'Discount rules: first match or stack them?', html: `<p>Checkout runs <code>EmployeeDiscount → CouponDiscount → LoyaltyDiscount</code>. If the business says "only the best single discount applies", it is first-match (or evaluate all and pick max). If "discounts stack", it is a pipeline where each one reduces the price and passes it on. Same chain object, different semantics — clarify in the interview!</p>`, code: { lang: 'java', code: `List<UnaryOperator<Double>> rules = List.of(p -> p * 0.9, p -> p - 50, p -> Math.max(p, 100));
double price = 1000;
for (UnaryOperator<Double> r : rules) price = r.apply(price);   // stacking pipeline
System.out.println(String.format("%.2f", price));   // 850.00`, alt: [
          { lang: 'python', code: `from typing import Callable

rules: list[Callable[[float], float]] = [lambda p: p * 0.9, lambda p: p - 50, lambda p: max(p, 100)]
price = 1000.0
for rule in rules:
    price = rule(price)  # stacking pipeline
print(f"{price:.2f}")  # 850.00` },
          { lang: 'ts', code: `const rules: ((p: number) => number)[] = [(p) => p * 0.9, (p) => p - 50, (p) => Math.max(p, 100)];
let price = 1000;
for (const rule of rules) price = rule(price); // stacking pipeline
console.log(price.toFixed(2)); // 850.00` },
          { lang: 'cpp', code: `vector<function<double(double)>> rules = {
    [](double p) { return p * 0.9; }, [](double p) { return p - 50; }, [](double p) { return max(p, 100.0); }};
double price = 1000;
for (auto& rule : rules) price = rule(price);  // stacking pipeline
cout << fixed << setprecision(2) << price << "\\n";  // 850.00` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class Program {
    static void Main() {
        List<Func<double, double>> rules = new List<Func<double, double>> { p => p * 0.9, p => p - 50, p => Math.Max(p, 100) };
        double price = 1000;
        foreach (Func<double, double> r in rules) price = r(price);   // stacking pipeline
        Console.WriteLine(price.ToString("F2"));   // 850.00
    }
}` }
        ] } },
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
      brute: { why: `<p>One method with a hard-coded block per denomination: compute count for 2000, subtract, then 500, then 200, then 100. Adding ₹50 means editing this method; checking stock and rolling back is copy-pasted per block; and stock is decremented before we know the whole amount can be made.</p>`, code: { lang: 'java', code: `class NaiveAtm {
    int c2000 = 1, c500 = 3, c200 = 5, c100 = 2;
    String withdraw(int amt) {
        int n2000 = Math.min(amt / 2000, c2000); amt -= n2000 * 2000; c2000 -= n2000;   // mutates early!
        int n500 = Math.min(amt / 500, c500);    amt -= n500 * 500;   c500 -= n500;
        int n200 = Math.min(amt / 200, c200);    amt -= n200 * 200;   c200 -= n200;
        int n100 = Math.min(amt / 100, c100);    amt -= n100 * 100;   c100 -= n100;
        if (amt != 0) return "FAIL (and stock is already wrong!)";
        return n2000 + "x2000 " + n500 + "x500 " + n200 + "x200 " + n100 + "x100";
    }
}`, alt: [
                { lang: 'python', code: `
class NaiveAtm:
    def __init__(self): self.c2000, self.c500, self.c200, self.c100 = 1, 3, 5, 2
    def withdraw(self, amt):
        n2000 = min(amt // 2000, self.c2000); amt -= n2000 * 2000; self.c2000 -= n2000   # mutates early!
        n500 = min(amt // 500, self.c500);    amt -= n500 * 500;   self.c500 -= n500
        n200 = min(amt // 200, self.c200);    amt -= n200 * 200;   self.c200 -= n200
        n100 = min(amt // 100, self.c100);    amt -= n100 * 100;   self.c100 -= n100
        if amt != 0: return "FAIL (and stock is already wrong!)"
        return f"{n2000}x2000 {n500}x500 {n200}x200 {n100}x100"` },
                { lang: 'ts', code: `
class NaiveAtm {
    c2000 = 1; c500 = 3; c200 = 5; c100 = 2;
    withdraw(amt: number): string {
        const n2000 = Math.min(Math.floor(amt / 2000), this.c2000); amt -= n2000 * 2000; this.c2000 -= n2000;   // mutates early!
        const n500 = Math.min(Math.floor(amt / 500), this.c500);    amt -= n500 * 500;   this.c500 -= n500;
        const n200 = Math.min(Math.floor(amt / 200), this.c200);    amt -= n200 * 200;   this.c200 -= n200;
        const n100 = Math.min(Math.floor(amt / 100), this.c100);    amt -= n100 * 100;   this.c100 -= n100;
        if (amt !== 0) return "FAIL (and stock is already wrong!)";
        return n2000 + "x2000 " + n500 + "x500 " + n200 + "x200 " + n100 + "x100";
    }
}` },
                { lang: 'cpp', code: `
class NaiveAtm {
    int c2000 = 1, c500 = 3, c200 = 5, c100 = 2;
public:
    string withdraw(int amt) {
        int n2000 = min(amt / 2000, c2000); amt -= n2000 * 2000; c2000 -= n2000;   // mutates early!
        int n500 = min(amt / 500, c500);    amt -= n500 * 500;   c500 -= n500;
        int n200 = min(amt / 200, c200);    amt -= n200 * 200;   c200 -= n200;
        int n100 = min(amt / 100, c100);    amt -= n100 * 100;   c100 -= n100;
        if (amt != 0) return "FAIL (and stock is already wrong!)";
        return to_string(n2000) + "x2000 " + to_string(n500) + "x500 " + to_string(n200) + "x200 " + to_string(n100) + "x100";
    }
};` },
  { lang: 'csharp', code: `
using System;

class NaiveAtm {
    int c2000 = 1, c500 = 3, c200 = 5, c100 = 2;
    public string Withdraw(int amt) {
        int n2000 = Math.Min(amt / 2000, c2000); amt -= n2000 * 2000; c2000 -= n2000;   // mutates early!
        int n500 = Math.Min(amt / 500, c500);    amt -= n500 * 500;   c500 -= n500;
        int n200 = Math.Min(amt / 200, c200);    amt -= n200 * 200;   c200 -= n200;
        int n100 = Math.Min(amt / 100, c100);    amt -= n100 * 100;   c100 -= n100;
        if (amt != 0) return "FAIL (and stock is already wrong!)";
        return n2000 + "x2000 " + n500 + "x500 " + n200 + "x200 " + n100 + "x100";
    }
}` }
              ] } },
      mcq: { q: 'withdraw(50) cannot be made from 100+ notes. When should stock be decremented?', options: ['Only after the whole chain confirms the remainder reached 0 (plan first, commit after)', 'Each handler decrements immediately as it goes', 'Before the chain starts', 'Never; the ATM recounts nightly'], answer: 0, explain: 'Two-phase: handlers build a plan (how many notes each), and only if the remainder is 0 do we commit. Otherwise a failed withdrawal would leak notes.' },
      hints: [`<p>Hint 1: Each denomination is a handler: "take as many of my notes as I can, pass the remainder to the next".</p>`, `<p>Hint 2: Pass a mutable <b>plan</b> (Map denomination → count) along the chain instead of touching stock directly. The last handler (or the ATM) checks remainder == 0.</p>`, `<p>Hint 3: Commit = each handler subtracts its planned count. Keep denominations sorted descending when building the chain. Synchronize withdraw (two customers, one ATM is rare but stock must stay consistent).</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "3700 -> 2000x1 500x3 200x1\n50 -> refused\n9999 -> refused\n1000 -> 200x4 100x2\n0 -> refused\n100 -> refused\n" }] },
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

    static String describe(Atm atm, int amount) {
        Optional<Map<Integer, Integer>> r = atm.withdraw(amount);
        if (r.isEmpty()) return amount + " -> refused";
        return amount + " -> " + r.get().entrySet().stream()
                .map(e -> e.getKey() + "x" + e.getValue()).collect(Collectors.joining(" "));
    }

    public static void main(String[] args) {
        NoteDispenser d2000 = new NoteDispenser(2000, 1);
        d2000.linkTo(new NoteDispenser(500, 3)).linkTo(new NoteDispenser(200, 5)).linkTo(new NoteDispenser(100, 2));
        Atm atm = new Atm(d2000);
        System.out.println(describe(atm, 3700));
        System.out.println(describe(atm, 50));      // no note combination: refused
        System.out.println(describe(atm, 9999));    // plans a lot, then fails: stock must be untouched
        System.out.println(describe(atm, 1000));    // 2000s and 500s are gone: {200=4, 100=2}
        System.out.println(describe(atm, 0));
        System.out.println(describe(atm, 100));     // out of 100s
    }
}`, alt: [
          { lang: 'python', code: `from __future__ import annotations


class NoteDispenser:
    def __init__(self, value: int, stock: int):
        self.value = value
        self._stock = stock
        self._next: NoteDispenser | None = None

    def link_to(self, nxt: NoteDispenser) -> NoteDispenser:
        self._next = nxt
        return nxt

    def plan(self, remaining: int, plan: dict[int, int]) -> int:
        """Phase 1: plan only, no side effects. Returns the remainder nobody could serve."""
        take = min(remaining // self.value, self._stock)
        if take > 0:
            plan[self.value] = take
        left = remaining - take * self.value
        return left if self._next is None or left == 0 else self._next.plan(left, plan)

    def commit(self, plan: dict[int, int]) -> None:
        """Phase 2: apply the plan along the chain."""
        self._stock -= plan.get(self.value, 0)
        if self._next is not None:
            self._next.commit(plan)

    @property
    def stock(self) -> int:
        return self._stock


class Atm:
    def __init__(self, head: NoteDispenser):
        self._head = head

    def withdraw(self, amount: int) -> dict[int, int] | None:
        if amount <= 0:
            return None
        plan: dict[int, int] = {}
        if self._head.plan(amount, plan) != 0:  # cannot make exact amount: nothing dispensed
            return None
        self._head.commit(plan)
        return plan


def describe(atm: Atm, amount: int) -> str:
    result = atm.withdraw(amount)
    if result is None:
        return f"{amount} -> refused"
    return f"{amount} -> " + " ".join(f"{v}x{n}" for v, n in result.items())


if __name__ == "__main__":
    d2000 = NoteDispenser(2000, 1)
    d2000.link_to(NoteDispenser(500, 3)).link_to(NoteDispenser(200, 5)).link_to(NoteDispenser(100, 2))
    atm = Atm(d2000)
    print(describe(atm, 3700))
    print(describe(atm, 50))  # no note combination: refused
    print(describe(atm, 9999))  # plans a lot, then fails: stock must be untouched
    print(describe(atm, 1000))  # 2000s and 500s are gone: {200=4, 100=2}
    print(describe(atm, 0))
    print(describe(atm, 100))  # out of 100s` },
          { lang: 'ts', code: `class NoteDispenser {
  private next: NoteDispenser | null = null;

  constructor(readonly value: number, private stock: number) {}

  linkTo(n: NoteDispenser): NoteDispenser {
    this.next = n;
    return n;
  }

  // Phase 1: plan only, no side effects. Returns the remainder nobody could serve.
  plan(remaining: number, plan: Map<number, number>): number {
    const take = Math.min(Math.floor(remaining / this.value), this.stock);
    if (take > 0) plan.set(this.value, take);
    const left = remaining - take * this.value;
    return this.next === null || left === 0 ? left : this.next.plan(left, plan);
  }

  // Phase 2: apply the plan along the chain.
  commit(plan: Map<number, number>): void {
    this.stock -= plan.get(this.value) ?? 0;
    this.next?.commit(plan);
  }

  get remaining(): number { return this.stock; }
}

class Atm {
  constructor(private readonly head: NoteDispenser) {}

  withdraw(amount: number): Map<number, number> | undefined {
    if (amount <= 0) return undefined;
    const plan = new Map<number, number>();
    if (this.head.plan(amount, plan) !== 0) return undefined; // cannot make exact amount: nothing dispensed
    this.head.commit(plan);
    return plan;
  }
}

function describe(atm: Atm, amount: number): string {
  const r = atm.withdraw(amount);
  if (r === undefined) return \`\${amount} -> refused\`;
  return \`\${amount} -> \` + [...r].map(([v, n]) => \`\${v}x\${n}\`).join(" ");
}

const d2000 = new NoteDispenser(2000, 1);
d2000.linkTo(new NoteDispenser(500, 3)).linkTo(new NoteDispenser(200, 5)).linkTo(new NoteDispenser(100, 2));
const atm = new Atm(d2000);
console.log(describe(atm, 3700));
console.log(describe(atm, 50)); // no note combination: refused
console.log(describe(atm, 9999)); // plans a lot, then fails: stock must be untouched
console.log(describe(atm, 1000)); // 2000s and 500s are gone: {200=4, 100=2}
console.log(describe(atm, 0));
console.log(describe(atm, 100)); // out of 100s` },
          { lang: 'cpp', code: `using Plan = vector<pair<int, int>>;  // (note value, count), largest note first

class NoteDispenser {
public:
    NoteDispenser(int value, int stock) : value(value), stock_(stock) {}

    NoteDispenser& linkTo(unique_ptr<NoteDispenser> n) {  // the chain owns its links
        next = std::move(n);
        return *next;
    }

    // Phase 1: plan only, no side effects. Returns the remainder nobody could serve.
    int plan(int remaining, Plan& plan) const {
        int take = min(remaining / value, stock_);
        if (take > 0) plan.emplace_back(value, take);
        int left = remaining - take * value;
        return (!next || left == 0) ? left : next->plan(left, plan);
    }

    // Phase 2: apply the plan along the chain.
    void commit(const Plan& plan) {
        for (auto& [v, n] : plan) if (v == value) stock_ -= n;
        if (next) next->commit(plan);
    }

    int stock() const { return stock_; }

private:
    int value;
    int stock_;
    unique_ptr<NoteDispenser> next;
};

class Atm {
public:
    explicit Atm(NoteDispenser& head) : head(head) {}

    optional<Plan> withdraw(int amount) {
        if (amount <= 0) return nullopt;
        Plan plan;
        if (head.plan(amount, plan) != 0) return nullopt;  // cannot make exact amount: nothing dispensed
        head.commit(plan);
        return plan;
    }

private:
    NoteDispenser& head;
};

string describe(Atm& atm, int amount) {
    auto r = atm.withdraw(amount);
    string s = to_string(amount) + " -> ";
    if (!r) return s + "refused";
    for (size_t i = 0; i < r->size(); i++)
        s += (i ? " " : "") + to_string((*r)[i].first) + "x" + to_string((*r)[i].second);
    return s;
}

int main() {
    NoteDispenser d2000(2000, 1);
    d2000.linkTo(make_unique<NoteDispenser>(500, 3))
         .linkTo(make_unique<NoteDispenser>(200, 5))
         .linkTo(make_unique<NoteDispenser>(100, 2));
    Atm atm(d2000);
    cout << describe(atm, 3700) << "\\n";
    cout << describe(atm, 50) << "\\n";    // no note combination: refused
    cout << describe(atm, 9999) << "\\n";  // plans a lot, then fails: stock must be untouched
    cout << describe(atm, 1000) << "\\n";  // 2000s and 500s are gone: {200=4, 100=2}
    cout << describe(atm, 0) << "\\n";
    cout << describe(atm, 100) << "\\n";   // out of 100s
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

class NoteDispenser {
    public readonly int Value; private int stock; private NoteDispenser next;
    public NoteDispenser(int value, int stock) { Value = value; this.stock = stock; }
    public NoteDispenser LinkTo(NoteDispenser n) { next = n; return n; }

    // Phase 1: plan only, no side effects. Returns the remainder nobody could serve.
    public int Plan(int remaining, List<KeyValuePair<int, int>> plan) {
        int take = Math.Min(remaining / Value, stock);
        if (take > 0) plan.Add(new KeyValuePair<int, int>(Value, take));
        int left = remaining - take * Value;
        return (next == null || left == 0) ? left : next.Plan(left, plan);
    }
    // Phase 2: apply the plan along the chain.
    public void Commit(List<KeyValuePair<int, int>> plan) {
        foreach (var e in plan) if (e.Key == Value) stock -= e.Value;
        if (next != null) next.Commit(plan);
    }
    public int Stock { get { return stock; } }
}

class Atm {
    private readonly NoteDispenser head;
    private readonly object gate = new object();
    public Atm(NoteDispenser head) { this.head = head; }

    public List<KeyValuePair<int, int>> Withdraw(int amount) {        // null = refused, nothing dispensed
        lock (gate) {
            if (amount <= 0) return null;
            List<KeyValuePair<int, int>> plan = new List<KeyValuePair<int, int>>();
            int left = head.Plan(amount, plan);
            if (left != 0) return null;                   // cannot make exact amount: nothing dispensed
            head.Commit(plan);
            return plan;
        }
    }

    public static string Describe(Atm atm, int amount) {
        List<KeyValuePair<int, int>> r = atm.Withdraw(amount);
        if (r == null) return amount + " -> refused";
        return amount + " -> " + string.Join(" ", r.Select(e => e.Key + "x" + e.Value));
    }
}

class Program {
    static void Main() {
        NoteDispenser d2000 = new NoteDispenser(2000, 1);
        d2000.LinkTo(new NoteDispenser(500, 3)).LinkTo(new NoteDispenser(200, 5)).LinkTo(new NoteDispenser(100, 2));
        Atm atm = new Atm(d2000);
        Console.WriteLine(Atm.Describe(atm, 3700));
        Console.WriteLine(Atm.Describe(atm, 50));      // no note combination: refused
        Console.WriteLine(Atm.Describe(atm, 9999));    // plans a lot, then fails: stock must be untouched
        Console.WriteLine(Atm.Describe(atm, 1000));    // 2000s and 500s are gone: {200=4, 100=2}
        Console.WriteLine(Atm.Describe(atm, 0));
        Console.WriteLine(Atm.Describe(atm, 100));     // out of 100s
    }
}` }
        ],
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
${H.table(['Role', 'Java type', 'Python / TypeScript / C++', 'Job'], [
  ['<b>Aggregate</b>', '<code>Iterable&lt;T&gt;</code>', '<code>__iter__</code> / <code>[Symbol.iterator]()</code> / <code>begin()</code> + <code>end()</code>', 'Has <code>iterator()</code> → enables the for-each loop'],
  ['<b>Iterator</b>', '<code>Iterator&lt;T&gt;</code>', '<code>__next__</code> (raises <code>StopIteration</code>) / <code>next()</code> returning <code>{ done, value }</code> / <code>operator*</code>, <code>operator++</code>, <code>operator!=</code>', '<code>hasNext()</code>, <code>next()</code>, optional <code>remove()</code>; remembers <i>where we are</i>'],
  ['<b>Concrete iterator</b>', 'your class', 'a class, or a generator function', 'Knows the internal structure: an index, a node pointer, a stack for trees, a page token']
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
    Iterable<Song> reversed() {
        return () -> new Iterator<Song>() {
            private int cursor = size - 1;
            public boolean hasNext() { return cursor >= 0; }
            public Song next() { return songs[cursor--]; }
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
}

class PlaylistDemo {
    public static void main(String[] args) {
        Playlist p = new Playlist();
        for (String t : List.of("Intro", "Blue", "Rain")) p.add(new Song(t));
        for (Song s : p) System.out.print(s.title() + " ");          // for-each uses iterator()
        System.out.println();
        for (Song s : p.reversed()) System.out.print(s.title() + " ");
        System.out.println();
        try { for (Song s : p) p.add(new Song("Oops")); }            // modify while iterating
        catch (ConcurrentModificationException e) { System.out.println("fail-fast: CME"); }
    }
}`, alt: [
          { lang: 'python', code: `from dataclasses import dataclass
from typing import Iterator


@dataclass(frozen=True)
class Song:
    title: str


class ConcurrentModification(RuntimeError):
    pass


class Playlist:
    def __init__(self):
        self._songs: list[Song] = []  # internal storage: hidden from callers
        self._mod_count = 0  # detects changes during iteration

    def add(self, s: Song) -> None:
        self._songs.append(s)
        self._mod_count += 1

    def __iter__(self) -> Iterator[Song]:  # for-each calls this; the cursor lives in the generator
        cursor = 0
        expected_mod = self._mod_count
        while cursor < len(self._songs):
            if self._mod_count != expected_mod:
                raise ConcurrentModification()
            yield self._songs[cursor]
            cursor += 1

    # A second traversal order is just another iterator: callers do not change.
    def reversed(self) -> Iterator[Song]:
        for i in range(len(self._songs) - 1, -1, -1):
            yield self._songs[i]


if __name__ == "__main__":
    p = Playlist()
    for t in ("Intro", "Blue", "Rain"):
        p.add(Song(t))
    print(" ".join(s.title for s in p))  # for-each uses __iter__
    print(" ".join(s.title for s in p.reversed()))
    try:
        for s in p:
            p.add(Song("Oops"))  # modify while iterating
    except ConcurrentModification:
        print("fail-fast: CME")` },
          { lang: 'ts', code: `interface Song { readonly title: string; }

class ConcurrentModificationError extends Error {}

class Playlist implements Iterable<Song> {
  private songs: Song[] = []; // internal storage: hidden from callers
  private modCount = 0; // detects changes during iteration

  add(s: Song): void {
    this.songs.push(s);
    this.modCount++;
  }

  [Symbol.iterator](): Iterator<Song> { // for-of calls this; the cursor lives HERE
    let cursor = 0;
    const expectedMod = this.modCount;
    return {
      next: (): IteratorResult<Song> => {
        if (cursor >= this.songs.length) return { done: true, value: undefined };
        if (this.modCount !== expectedMod) throw new ConcurrentModificationError();
        return { done: false, value: this.songs[cursor++] };
      },
    };
  }

  // A second traversal order is just another iterator: callers do not change.
  reversed(): Iterable<Song> {
    const songs = this.songs;
    return {
      *[Symbol.iterator]() { for (let i = songs.length - 1; i >= 0; i--) yield songs[i]; },
    };
  }
}

const p = new Playlist();
for (const t of ["Intro", "Blue", "Rain"]) p.add({ title: t });
console.log([...p].map((s) => s.title).join(" ")); // for-of uses [Symbol.iterator]
console.log([...p.reversed()].map((s) => s.title).join(" "));
try {
  for (const _s of p) p.add({ title: "Oops" }); // modify while iterating
} catch (e) {
  if (e instanceof ConcurrentModificationError) console.log("fail-fast: CME");
}` },
          { lang: 'cpp', code: `struct Song { string title; };

struct ConcurrentModification : runtime_error {
    ConcurrentModification() : runtime_error("playlist changed while iterating") {}
};

class Playlist {
public:
    void add(Song s) {
        songs.push_back(std::move(s));  // internal storage: hidden from callers
        modCount++;                     // detects changes during iteration
    }

    // The iterator keeps its own cursor, so range-for works on a Playlist.
    class Iterator {
    public:
        Iterator(const Playlist& p, size_t cursor) : list(&p), cursor(cursor), expectedMod(p.modCount) {}
        const Song& operator*() const {
            if (list->modCount != expectedMod) throw ConcurrentModification();  // fail-fast
            return list->songs[cursor];
        }
        Iterator& operator++() { ++cursor; return *this; }
        bool operator!=(const Iterator& o) const { return cursor != o.cursor; }
    private:
        const Playlist* list;
        size_t cursor;
        size_t expectedMod;
    };
    Iterator begin() const { return Iterator(*this, 0); }
    Iterator end() const { return Iterator(*this, songs.size()); }

    // A second traversal order is just another view: callers do not change.
    auto reversed() const { return songs | views::reverse; }

private:
    vector<Song> songs;
    size_t modCount = 0;
};

int main() {
    Playlist p;
    for (const char* t : {"Intro", "Blue", "Rain"}) p.add({t});
    for (const Song& s : p) cout << s.title << " ";  // range-for uses begin()/end()
    cout << "\\n";
    for (const Song& s : p.reversed()) cout << s.title << " ";
    cout << "\\n";
    try {
        for (const Song& s : p) { (void)s; p.add({"Oops"}); }  // modify while iterating
    } catch (const ConcurrentModification&) {
        cout << "fail-fast: CME\\n";
    }
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections;
using System.Collections.Generic;

sealed class Song { public readonly string Title; public Song(string title) { Title = title; } }

class Playlist : IEnumerable<Song> {
    private Song[] songs = new Song[2];       // internal storage: hidden from callers
    private int size, modCount;               // modCount detects changes during iteration

    public void Add(Song s) {
        if (size == songs.Length) Array.Resize(ref songs, size * 2);
        songs[size++] = s;
        modCount++;
    }

    public IEnumerator<Song> GetEnumerator() { return new InOrder(this); }
    IEnumerator IEnumerable.GetEnumerator() { return GetEnumerator(); }

    // A second traversal order is just another enumerator: callers do not change.
    public IEnumerable<Song> Reversed() {
        for (int cursor = size - 1; cursor >= 0; cursor--) yield return songs[cursor];
    }

    private sealed class InOrder : IEnumerator<Song> {
        private readonly Playlist p; private int cursor = -1;         // the "where am I" lives HERE
        private readonly int expectedMod;
        public InOrder(Playlist p) { this.p = p; expectedMod = p.modCount; }
        public bool MoveNext() {
            if (p.modCount != expectedMod) throw new InvalidOperationException("collection was modified");
            return ++cursor < p.size;
        }
        public Song Current { get { return p.songs[cursor]; } }
        object IEnumerator.Current { get { return Current; } }
        public void Reset() { cursor = -1; }
        public void Dispose() { }
    }
}

class Program {
    static void Main() {
        Playlist p = new Playlist();
        foreach (string t in new[] { "Intro", "Blue", "Rain" }) p.Add(new Song(t));
        foreach (Song s in p) Console.Write(s.Title + " ");           // foreach uses GetEnumerator()
        Console.WriteLine();
        foreach (Song s in p.Reversed()) Console.Write(s.Title + " ");
        Console.WriteLine();
        try { foreach (Song s in p) p.Add(new Song("Oops")); }        // modify while iterating
        catch (InvalidOperationException) { Console.WriteLine("fail-fast: collection was modified"); }
    }
}` }
        ] }],
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
        ALTS[code] = mkAlt(`def __init__(self, root): self._push_left(root)
def _push_left(self, n):
    while n is not None: self._stack.append(n); n = n.left

def has_next(self): return len(self._stack) > 0
def next(self):
    n = self._stack.pop()
    self._push_left(n.right)
    return n.val`, `constructor(root: TreeNode | null) { this.pushLeft(root); }
private pushLeft(n: TreeNode | null): void {
  while (n !== null) { this.stack.push(n); n = n.left; }
}
hasNext(): boolean { return this.stack.length > 0; }
next(): number {
  const n = this.stack.pop()!;
  this.pushLeft(n.right);
  return n.val;
}`, `BSTIterator(TreeNode* root) { pushLeft(root); }
void pushLeft(TreeNode* n) {
  while (n != nullptr) { stack.push(n); n = n->left; }
}
bool hasNext() { return !stack.empty(); }
int next() {
  TreeNode* n = stack.top(); stack.pop();
  pushLeft(n->right);
  return n->val;
}`);
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
      { title: 'Removing while iterating — the right way', html: `<p>Calling <code>list.remove(x)</code> inside a for-each throws <code>ConcurrentModificationException</code> on the next step (fail-fast: the iterator sees modCount changed). Use <code>iterator.remove()</code> or <code>removeIf</code>. Concurrent collections (<code>ConcurrentHashMap</code>, <code>CopyOnWriteArrayList</code>) give <b>weakly consistent / snapshot</b> iterators that never throw CME.</p>`, code: { lang: 'java', code: `List<Integer> nums = new ArrayList<>(List.of(1, 2, 3, 4, 5, 6));
Iterator<Integer> it = nums.iterator();
while (it.hasNext()) if (it.next() % 2 == 0) it.remove();   // safe removal
System.out.println(nums);                                   // [1, 3, 5]
nums.removeIf(x -> x > 3);                                  // even simpler
System.out.println(nums);                                   // [1, 3]`, alt: [
          { lang: 'python', code: `nums = [1, 2, 3, 4, 5, 6]
nums[:] = [x for x in nums if x % 2 != 0]  # safe removal: build the survivors, then swap them in
print(nums)  # [1, 3, 5]
nums[:] = [x for x in nums if x <= 3]  # the removeIf equivalent
print(nums)  # [1, 3]` },
          { lang: 'ts', code: `let nums = [1, 2, 3, 4, 5, 6];
nums = nums.filter((x) => x % 2 !== 0); // safe removal: never splice() inside a for-of over the same array
console.log(nums); // [ 1, 3, 5 ]
nums = nums.filter((x) => x <= 3); // the removeIf equivalent
console.log(nums); // [ 1, 3 ]` },
          { lang: 'cpp', code: `vector<int> nums = {1, 2, 3, 4, 5, 6};
nums.erase(remove_if(nums.begin(), nums.end(), [](int x) { return x % 2 == 0; }), nums.end());  // erase-remove idiom
for (int x : nums) cout << x << " ";  // 1 3 5
cout << "\\n";
erase_if(nums, [](int x) { return x > 3; });  // C++20: the removeIf equivalent
for (int x : nums) cout << x << " ";  // 1 3
cout << "\\n";` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class Program {
    static void Main() {
        List<int> nums = new List<int> { 1, 2, 3, 4, 5, 6 };
        for (int i = nums.Count - 1; i >= 0; i--) if (nums[i] % 2 == 0) nums.RemoveAt(i);   // safe removal: walk backwards
        Console.WriteLine("[" + string.Join(", ", nums) + "]");                             // [1, 3, 5]
        nums.RemoveAll(x => x > 3);                                                          // even simpler
        Console.WriteLine("[" + string.Join(", ", nums) + "]");                             // [1, 3]
    }
}` }
        ] } },
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
      brute: { why: `<p>Do a full in-order traversal in the constructor and store every value in a list; <code>next()</code> returns list[i++]. Simple and O(1) per call, but uses <b>O(N) memory</b> and does O(N) work up front even if the caller only wants the first 3 values. Fails the follow-up "the tree has 10<sup>9</sup> nodes on disk".</p>`, code: { lang: 'java', code: `class FlatBSTIterator {
    private final List<Integer> vals = new ArrayList<>();
    private int i = 0;
    FlatBSTIterator(TreeNode root) { inorder(root); }        // O(N) time and memory up front
    private void inorder(TreeNode n) {
        if (n == null) return;
        inorder(n.left); vals.add(n.val); inorder(n.right);
    }
    int next() { return vals.get(i++); }
    boolean hasNext() { return i < vals.size(); }
}`, alt: [
                { lang: 'python', code: `
class FlatBSTIterator:
    def __init__(self, root):
        self._vals = []
        self._i = 0
        self._inorder(root)        # O(N) time and memory up front
    def _inorder(self, n):
        if n is None: return
        self._inorder(n.left); self._vals.append(n.val); self._inorder(n.right)
    def next(self):
        self._i += 1
        return self._vals[self._i - 1]
    def has_next(self): return self._i < len(self._vals)` },
                { lang: 'ts', code: `
class FlatBSTIterator {
    private readonly vals: number[] = [];
    private i = 0;
    constructor(root: TreeNode | null) { this.inorder(root); }        // O(N) time and memory up front
    private inorder(n: TreeNode | null): void {
        if (n === null) return;
        this.inorder(n.left); this.vals.push(n.val); this.inorder(n.right);
    }
    next(): number { return this.vals[this.i++]; }
    hasNext(): boolean { return this.i < this.vals.length; }
}` },
                { lang: 'cpp', code: `
class FlatBSTIterator {
    vector<int> vals;
    int i = 0;
    void inorder(TreeNode* n) {
        if (n == nullptr) return;
        inorder(n->left); vals.push_back(n->val); inorder(n->right);
    }
public:
    FlatBSTIterator(TreeNode* root) { inorder(root); }        // O(N) time and memory up front
    int next() { return vals[i++]; }
    bool hasNext() { return i < (int)vals.size(); }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class TreeNode { public int val; public TreeNode left, right; public TreeNode(int v) { val = v; } }

class FlatBSTIterator {
    private readonly List<int> vals = new List<int>();
    private int i = 0;
    public FlatBSTIterator(TreeNode root) { Inorder(root); }        // O(N) time and memory up front
    private void Inorder(TreeNode n) {
        if (n == null) return;
        Inorder(n.left); vals.Add(n.val); Inorder(n.right);
    }
    public int Next() { return vals[i++]; }
    public bool HasNext() { return i < vals.Count; }
}` }
              ] } },
      mcq: { q: 'Why is next() O(1) amortised even though it may push several nodes?', options: ['Every node is pushed once and popped once over the whole iteration, so N calls do O(N) total work', 'Because the stack is small', 'Because the tree is balanced', 'It is actually O(log N) worst case per call, and that is the same'], answer: 0, explain: 'Total pushes = N, total pops = N across all calls. A single call may push h nodes, but averaged over N calls the cost is constant.' },
      hints: [`<p>Hint 1: Simulate the recursive in-order traversal yourself; what the recursion keeps on the call stack, keep on an explicit stack.</p>`, `<p>Hint 2: The smallest unreturned value is always on top of a stack containing the "left spine" of what remains. Helper <code>pushLeft(node)</code>: push node and go left until null.</p>`, `<p>Hint 3: Constructor: pushLeft(root). next(): pop n; pushLeft(n.right); return n.val. hasNext(): !stack.isEmpty(). Use ArrayDeque, not the legacy Stack class.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "3 7 9 15 20\nerror: exhausted\nempty tree hasNext: false\n1 true true 2 3 false\n" }] },
      solution: {
        approach: `<p>Keep an explicit stack that mirrors the paused recursion of an in-order traversal. Initially push the left spine of the root. Each <code>next()</code> pops the top (the smallest remaining), then pushes the left spine of its right subtree — exactly the nodes that come next in sorted order. Each node is pushed and popped once, giving O(1) amortised per call and O(h) memory. Implementing the language's iterator protocol (<code>Iterator&lt;Integer&gt;</code> in Java, <code>__iter__</code>/<code>__next__</code> in Python, <code>[Symbol.iterator]</code> in TypeScript) lets callers use it with the standard loops.</p>`,
        code: `class TreeNode {
    int val; TreeNode left, right;
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
}

class BSTIterator implements Iterator<Integer> {
    private final Deque<TreeNode> stack = new ArrayDeque<>();

    BSTIterator(TreeNode root) { pushLeft(root); }

    private void pushLeft(TreeNode n) {
        while (n != null) { stack.push(n); n = n.left; }
    }

    @Override public boolean hasNext() { return !stack.isEmpty(); }   // idempotent: no side effects

    @Override public Integer next() {
        if (stack.isEmpty()) throw new NoSuchElementException("exhausted");
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
        try { it.next(); } catch (NoSuchElementException e) { System.out.println("error: " + e.getMessage()); }
        System.out.println("empty tree hasNext: " + new BSTIterator(null).hasNext());
        BSTIterator chain = new BSTIterator(new TreeNode(3, new TreeNode(2, new TreeNode(1), null), null));   // left chain
        System.out.println(chain.next() + " " + chain.hasNext() + " " + chain.hasNext() + " " + chain.next() + " " + chain.next() + " " + chain.hasNext());
    }
}`, alt: [
          { lang: 'python', code: `from __future__ import annotations

from dataclasses import dataclass


@dataclass
class TreeNode:
    val: int
    left: TreeNode | None = None
    right: TreeNode | None = None


class BSTIterator:
    def __init__(self, root: TreeNode | None):
        self._stack: list[TreeNode] = []
        self._push_left(root)

    def _push_left(self, node: TreeNode | None) -> None:
        while node is not None:
            self._stack.append(node)
            node = node.left

    def has_next(self) -> bool:  # idempotent: no side effects
        return bool(self._stack)

    def next(self) -> int:
        if not self._stack:
            raise StopIteration("exhausted")
        node = self._stack.pop()
        self._push_left(node.right)  # the right subtree's smallest comes next
        return node.val

    # Python's own protocol on top: \`for v in BSTIterator(root)\` works too.
    def __iter__(self) -> BSTIterator:
        return self

    def __next__(self) -> int:
        return self.next()


if __name__ == "__main__":
    root = TreeNode(7, TreeNode(3), TreeNode(15, TreeNode(9), TreeNode(20)))
    it = BSTIterator(root)
    values = []
    while it.has_next():
        values.append(str(it.next()))
    print(" ".join(values))  # 3 7 9 15 20
    try:
        it.next()
    except StopIteration as e:
        print("error:", e)
    print("empty tree hasNext:", str(BSTIterator(None).has_next()).lower())
    chain = BSTIterator(TreeNode(3, TreeNode(2, TreeNode(1), None), None))  # left chain
    first = chain.next()
    print(first, str(chain.has_next()).lower(), str(chain.has_next()).lower(), chain.next(), chain.next(), str(chain.has_next()).lower())` },
          { lang: 'ts', code: `class TreeNode {
  constructor(
    public val: number,
    public left: TreeNode | null = null,
    public right: TreeNode | null = null,
  ) {}
}

class BSTIterator {
  private readonly stack: TreeNode[] = [];

  constructor(root: TreeNode | null) { this.pushLeft(root); }

  private pushLeft(node: TreeNode | null): void {
    while (node !== null) { this.stack.push(node); node = node.left; }
  }

  hasNext(): boolean { return this.stack.length > 0; } // idempotent: no side effects

  next(): number {
    const node = this.stack.pop();
    if (node === undefined) throw new Error("exhausted");
    this.pushLeft(node.right); // the right subtree's smallest comes next
    return node.val;
  }

  // JavaScript's own protocol on top: \`for (const v of new BSTIterator(root))\` works too.
  *[Symbol.iterator](): Generator<number> {
    while (this.hasNext()) yield this.next();
  }
}

const root = new TreeNode(7, new TreeNode(3), new TreeNode(15, new TreeNode(9), new TreeNode(20)));
const it = new BSTIterator(root);
const values: number[] = [];
while (it.hasNext()) values.push(it.next());
console.log(values.join(" ")); // 3 7 9 15 20
try { it.next(); } catch (e) { console.log("error: " + (e as Error).message); }
console.log("empty tree hasNext: " + new BSTIterator(null).hasNext());
const chain = new BSTIterator(new TreeNode(3, new TreeNode(2, new TreeNode(1), null), null)); // left chain
const first = chain.next();
console.log(\`\${first} \${chain.hasNext()} \${chain.hasNext()} \${chain.next()} \${chain.next()} \${chain.hasNext()}\`);` },
          { lang: 'cpp', code: `struct TreeNode {
    int val;
    unique_ptr<TreeNode> left, right;  // each node owns its children
    explicit TreeNode(int val, unique_ptr<TreeNode> left = nullptr, unique_ptr<TreeNode> right = nullptr)
        : val(val), left(std::move(left)), right(std::move(right)) {}
};

class BSTIterator {
public:
    explicit BSTIterator(const TreeNode* root) { pushLeft(root); }

    bool hasNext() const { return !stack.empty(); }  // idempotent: no side effects

    int next() {
        if (stack.empty()) throw out_of_range("exhausted");
        const TreeNode* n = stack.back();
        stack.pop_back();
        pushLeft(n->right.get());  // the right subtree's smallest comes next
        return n->val;
    }

private:
    void pushLeft(const TreeNode* n) {
        for (; n; n = n->left.get()) stack.push_back(n);
    }
    vector<const TreeNode*> stack;  // non-owning: the tree outlives the iterator
};

int main() {
    auto root = make_unique<TreeNode>(7, make_unique<TreeNode>(3),
        make_unique<TreeNode>(15, make_unique<TreeNode>(9), make_unique<TreeNode>(20)));
    BSTIterator it(root.get());
    string line;
    while (it.hasNext()) line += (line.empty() ? "" : " ") + to_string(it.next());
    cout << line << "\\n";  // 3 7 9 15 20
    try { it.next(); } catch (const out_of_range& e) { cout << "error: " << e.what() << "\\n"; }
    cout << boolalpha << "empty tree hasNext: " << BSTIterator(nullptr).hasNext() << "\\n";
    auto chainRoot = make_unique<TreeNode>(3, make_unique<TreeNode>(2, make_unique<TreeNode>(1)));  // left chain
    BSTIterator chain(chainRoot.get());
    int first = chain.next();
    bool h1 = chain.hasNext(), h2 = chain.hasNext();
    int second = chain.next(), third = chain.next();
    cout << first << " " << h1 << " " << h2 << " " << second << " " << third << " " << chain.hasNext() << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Text;

class TreeNode {
    public int val; public TreeNode left, right;
    public TreeNode(int val) { this.val = val; }
    public TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
}

class BSTIterator {
    private readonly Stack<TreeNode> stack = new Stack<TreeNode>();

    public BSTIterator(TreeNode root) { PushLeft(root); }

    private void PushLeft(TreeNode n) {
        while (n != null) { stack.Push(n); n = n.left; }
    }

    public bool HasNext() { return stack.Count > 0; }   // idempotent: no side effects

    public int Next() {
        if (stack.Count == 0) throw new InvalidOperationException("exhausted");
        TreeNode n = stack.Pop();
        PushLeft(n.right);                  // the right subtree's smallest comes next
        return n.val;
    }
}

class Program {
    static string B(bool b) { return b.ToString().ToLower(); }
    static void Main() {
        TreeNode root = new TreeNode(7, new TreeNode(3), new TreeNode(15, new TreeNode(9), new TreeNode(20)));
        BSTIterator it = new BSTIterator(root);
        StringBuilder sb = new StringBuilder();
        while (it.HasNext()) sb.Append(it.Next()).Append(' ');
        Console.WriteLine(sb.ToString().Trim());   // 3 7 9 15 20
        try { it.Next(); } catch (InvalidOperationException e) { Console.WriteLine("error: " + e.Message); }
        Console.WriteLine("empty tree hasNext: " + B(new BSTIterator(null).HasNext()));
        BSTIterator chain = new BSTIterator(new TreeNode(3, new TreeNode(2, new TreeNode(1), null), null));   // left chain
        Console.WriteLine(chain.Next() + " " + B(chain.HasNext()) + " " + B(chain.HasNext()) + " " + chain.Next() + " " + chain.Next() + " " + B(chain.HasNext()));
    }
}` }
        ],
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
        b.say("@dave hey");                                  // unknown recipient
        room.leave(c);
        c.say("anyone?");                                    // left the room: ignored
        System.out.println("bob:   " + b.inbox);
        System.out.println("carol: " + c.inbox);
        System.out.println("alice: " + a.inbox);
    }
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod


class ChatMediator(ABC):
    @abstractmethod
    def join(self, u: "User") -> None: ...

    @abstractmethod
    def leave(self, u: "User") -> None: ...

    @abstractmethod
    def send(self, sender: "User", text: str) -> None: ...


class User:
    def __init__(self, name: str, room: ChatMediator):
        self.name = name
        self._room = room  # the ONLY reference a user holds
        self.inbox: list[str] = []

    def say(self, text: str) -> None:
        self._room.send(self, text)

    def receive(self, sender: str, text: str) -> None:
        self.inbox.append(f"{sender}: {text}")


class ChatRoom(ChatMediator):
    def __init__(self):
        self._members: dict[str, User] = {}
        self._muted: set[str] = set()
        self._history: list[str] = []

    def join(self, u: User) -> None:
        self._members[u.name] = u
        self._broadcast("system", f"{u.name} joined", None)

    def leave(self, u: User) -> None:
        self._members.pop(u.name, None)
        self._broadcast("system", f"{u.name} left", None)

    def mute(self, name: str) -> None:
        self._muted.add(name)

    # All coordination rules live here, in ONE place.
    def send(self, sender: User, text: str) -> None:
        if sender.name not in self._members:  # not in the room
            return
        if sender.name in self._muted:
            sender.receive("system", "you are muted")
            return
        self._history.append(f"{sender.name}: {text}")
        if text.startswith("@"):  # direct message rule
            to = text[1:].split(" ", 1)[0]
            target = self._members.get(to)
            if target is not None:
                target.receive(f"{sender.name} (private)", text)
            else:
                sender.receive("system", f"no user {to}")
            return
        self._broadcast(sender.name, text, sender)

    def _broadcast(self, sender: str, text: str, except_user: User | None) -> None:
        for u in self._members.values():
            if u is not except_user:
                u.receive(sender, text)


def show(items: list[str]) -> str:
    return "[" + ", ".join(items) + "]"


if __name__ == "__main__":
    room = ChatRoom()
    a, b, c = User("alice", room), User("bob", room), User("carol", room)
    room.join(a); room.join(b); room.join(c)
    a.say("hi all")
    b.say("@carol lunch?")
    room.mute("alice")
    a.say("spam spam")
    b.say("@dave hey")  # unknown recipient
    room.leave(c)
    c.say("anyone?")  # left the room: ignored
    print("bob:  ", show(b.inbox))
    print("carol:", show(c.inbox))
    print("alice:", show(a.inbox))` },
          { lang: 'ts', code: `interface ChatMediator {
  join(u: User): void;
  leave(u: User): void;
  send(from: User, text: string): void;
}

class User {
  readonly inbox: string[] = [];
  // the ONLY reference a user holds is the mediator
  constructor(readonly name: string, private readonly room: ChatMediator) {}
  say(text: string): void { this.room.send(this, text); }
  receive(from: string, text: string): void { this.inbox.push(\`\${from}: \${text}\`); }
}

class ChatRoom implements ChatMediator {
  private readonly members = new Map<string, User>();
  private readonly muted = new Set<string>();
  private readonly history: string[] = [];

  join(u: User): void { this.members.set(u.name, u); this.broadcast("system", \`\${u.name} joined\`, null); }
  leave(u: User): void { this.members.delete(u.name); this.broadcast("system", \`\${u.name} left\`, null); }
  mute(name: string): void { this.muted.add(name); }

  // All coordination rules live here, in ONE place.
  send(from: User, text: string): void {
    if (!this.members.has(from.name)) return; // not in the room
    if (this.muted.has(from.name)) { from.receive("system", "you are muted"); return; }
    this.history.push(\`\${from.name}: \${text}\`);
    if (text.startsWith("@")) { // direct message rule
      const to = text.slice(1).split(" ")[0];
      const target = this.members.get(to);
      if (target !== undefined) target.receive(\`\${from.name} (private)\`, text);
      else from.receive("system", \`no user \${to}\`);
      return;
    }
    this.broadcast(from.name, text, from);
  }

  private broadcast(from: string, text: string, except: User | null): void {
    for (const u of this.members.values()) if (u !== except) u.receive(from, text);
  }
}

const show = (items: string[]): string => "[" + items.join(", ") + "]";

const room = new ChatRoom();
const a = new User("alice", room), b = new User("bob", room), c = new User("carol", room);
room.join(a); room.join(b); room.join(c);
a.say("hi all");
b.say("@carol lunch?");
room.mute("alice");
a.say("spam spam");
b.say("@dave hey"); // unknown recipient
room.leave(c);
c.say("anyone?"); // left the room: ignored
console.log("bob:  ", show(b.inbox));
console.log("carol:", show(c.inbox));
console.log("alice:", show(a.inbox));` },
          { lang: 'cpp', code: `class User;

class ChatMediator {
public:
    virtual ~ChatMediator() = default;
    virtual void join(User& u) = 0;
    virtual void leave(User& u) = 0;
    virtual void send(User& from, const string& text) = 0;
};

class User {
public:
    User(string name, ChatMediator& room) : name_(std::move(name)), room(room) {}  // the ONLY reference a user holds
    const string& name() const { return name_; }
    void say(const string& text) { room.send(*this, text); }
    void receive(const string& from, const string& text) { inbox_.push_back(from + ": " + text); }
    const vector<string>& inbox() const { return inbox_; }
private:
    string name_;
    ChatMediator& room;
    vector<string> inbox_;
};

class ChatRoom : public ChatMediator {
public:
    void join(User& u) override { members.push_back(&u); broadcast("system", u.name() + " joined", nullptr); }
    void leave(User& u) override {
        members.erase(remove(members.begin(), members.end(), &u), members.end());
        broadcast("system", u.name() + " left", nullptr);
    }
    void mute(const string& name) { muted.insert(name); }

    // All coordination rules live here, in ONE place.
    void send(User& from, const string& text) override {
        if (find(members.begin(), members.end(), &from) == members.end()) return;  // not in the room
        if (muted.count(from.name())) { from.receive("system", "you are muted"); return; }
        history.push_back(from.name() + ": " + text);
        if (text.starts_with('@')) {  // direct message rule
            string to = text.substr(1, text.find(' ') == string::npos ? string::npos : text.find(' ') - 1);
            User* target = find_user(to);
            if (target) target->receive(from.name() + " (private)", text);
            else from.receive("system", "no user " + to);
            return;
        }
        broadcast(from.name(), text, &from);
    }

private:
    User* find_user(const string& name) {
        for (User* u : members) if (u->name() == name) return u;
        return nullptr;
    }
    void broadcast(const string& from, const string& text, const User* except) {
        for (User* u : members) if (u != except) u->receive(from, text);
    }

    vector<User*> members;  // non-owning, in join order
    set<string> muted;
    vector<string> history;
};

string show(const vector<string>& items) {
    string s = "[";
    for (size_t i = 0; i < items.size(); i++) s += (i ? ", " : "") + items[i];
    return s + "]";
}

int main() {
    ChatRoom room;
    User a("alice", room), b("bob", room), c("carol", room);
    room.join(a); room.join(b); room.join(c);
    a.say("hi all");
    b.say("@carol lunch?");
    room.mute("alice");
    a.say("spam spam");
    b.say("@dave hey");  // unknown recipient
    room.leave(c);
    c.say("anyone?");  // left the room: ignored
    cout << "bob:   " << show(b.inbox()) << "\\n";
    cout << "carol: " << show(c.inbox()) << "\\n";
    cout << "alice: " << show(a.inbox()) << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

interface IChatMediator {
    void Join(User u);
    void Leave(User u);
    void Send(User from, string text);
}

class User {
    public readonly string Name;
    private readonly IChatMediator room;        // the ONLY reference a user holds
    public readonly List<string> Inbox = new List<string>();
    public User(string name, IChatMediator room) { Name = name; this.room = room; }
    public void Say(string text) { room.Send(this, text); }
    public void Receive(string from, string text) { Inbox.Add(from + ": " + text); }
}

class ChatRoom : IChatMediator {
    private readonly List<User> members = new List<User>();            // insertion order kept
    private readonly HashSet<string> muted = new HashSet<string>();
    private readonly List<string> history = new List<string>();

    private User Find(string name) { return members.Find(u => u.Name == name); }

    public void Join(User u)  { members.Add(u); Broadcast("system", u.Name + " joined", null); }
    public void Leave(User u) { members.Remove(u); Broadcast("system", u.Name + " left", null); }
    public void Mute(string name) { muted.Add(name); }

    // All coordination rules live here, in ONE place.
    public void Send(User from, string text) {
        if (!members.Contains(from)) return;                           // not in the room
        if (muted.Contains(from.Name)) { from.Receive("system", "you are muted"); return; }
        history.Add(from.Name + ": " + text);
        if (text.StartsWith("@")) {                                    // direct message rule
            int sp = text.IndexOf(' ');
            string to = text.Substring(1, (sp > 0 ? sp : text.Length) - 1);
            User target = Find(to);
            if (target != null) target.Receive(from.Name + " (private)", text);
            else from.Receive("system", "no user " + to);
            return;
        }
        Broadcast(from.Name, text, from);
    }
    private void Broadcast(string from, string text, User except) {
        foreach (User u in members) if (u != except) u.Receive(from, text);
    }
}

class Program {
    static string Show(List<string> l) { return "[" + string.Join(", ", l) + "]"; }
    static void Main() {
        ChatRoom room = new ChatRoom();
        User a = new User("alice", room), b = new User("bob", room), c = new User("carol", room);
        room.Join(a); room.Join(b); room.Join(c);
        a.Say("hi all");
        b.Say("@carol lunch?");
        room.Mute("alice");
        a.Say("spam spam");
        b.Say("@dave hey");                                  // unknown recipient
        room.Leave(c);
        c.Say("anyone?");                                    // left the room: ignored
        Console.WriteLine("bob:   " + Show(b.Inbox));
        Console.WriteLine("carol: " + Show(c.Inbox));
        Console.WriteLine("alice: " + Show(a.Inbox));
    }
}` }
        ] }],
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
      { title: 'Sign-up form dialog', html: `<p>Widgets: email field, password field, "I accept terms" checkbox, Submit button. Rule: Submit is enabled only when email is valid, password ≥ 8 chars and the box is ticked. Without a mediator, each widget would need references to the others. With a <code>SignupDialog</code> mediator, each widget calls <code>dialog.changed(this)</code> and the dialog re-evaluates the rule and enables/disables Submit.</p>`, code: { lang: 'java', code: `class SignupDialog {
    String email = ""; String password = ""; boolean accepted; boolean submitEnabled;
    void changed() {   // every widget calls this; the rule lives in one place
        submitEnabled = email.contains("@") && password.length() >= 8 && accepted;
    }
}
SignupDialog d = new SignupDialog();
d.email = "a@b.com"; d.changed();
d.password = "secret123"; d.changed();
d.accepted = true; d.changed();
System.out.println("submit enabled? " + d.submitEnabled);`, alt: [
          { lang: 'python', code: `class SignupDialog:
    def __init__(self):
        self.email = ""
        self.password = ""
        self.accepted = False
        self.submit_enabled = False

    def changed(self) -> None:  # every widget calls this; the rule lives in one place
        self.submit_enabled = "@" in self.email and len(self.password) >= 8 and self.accepted


d = SignupDialog()
d.email = "a@b.com"; d.changed()
d.password = "secret123"; d.changed()
d.accepted = True; d.changed()
print("submit enabled?", str(d.submit_enabled).lower())` },
          { lang: 'ts', code: `class SignupDialog {
  email = "";
  password = "";
  accepted = false;
  submitEnabled = false;
  changed(): void { // every widget calls this; the rule lives in one place
    this.submitEnabled = this.email.includes("@") && this.password.length >= 8 && this.accepted;
  }
}

const d = new SignupDialog();
d.email = "a@b.com"; d.changed();
d.password = "secret123"; d.changed();
d.accepted = true; d.changed();
console.log("submit enabled? " + d.submitEnabled);` },
          { lang: 'cpp', code: `struct SignupDialog {
    string email, password;
    bool accepted = false, submitEnabled = false;
    void changed() {  // every widget calls this; the rule lives in one place
        submitEnabled = email.find('@') != string::npos && password.size() >= 8 && accepted;
    }
};
SignupDialog d;
d.email = "a@b.com"; d.changed();
d.password = "secret123"; d.changed();
d.accepted = true; d.changed();
cout << "submit enabled? " << boolalpha << d.submitEnabled << "\\n";` },
  { lang: 'csharp', code: `
using System;

class SignupDialog {
    public string Email = ""; public string Password = ""; public bool Accepted; public bool SubmitEnabled;
    public void Changed() {   // every widget calls this; the rule lives in one place
        SubmitEnabled = Email.Contains("@") && Password.Length >= 8 && Accepted;
    }
}
class Program {
    static void Main() {
        SignupDialog d = new SignupDialog();
        d.Email = "a@b.com"; d.Changed();
        d.Password = "secret123"; d.Changed();
        d.Accepted = true; d.Changed();
        Console.WriteLine("submit enabled? " + d.SubmitEnabled.ToString().ToLower());
    }
}` }
        ] } },
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
      brute: { why: `<p>Each plane holds a list of all other planes and, before landing, asks each one "are you on the runway?" and "were you waiting before me?". That is O(N) messages per request and N² references overall; emergency priority must be coded in every plane; two planes can both decide the runway is free at the same moment (race).</p>`, code: { lang: 'java', code: `class NaivePlane {
    final String id; boolean onRunway, waiting; final List<NaivePlane> others = new ArrayList<>();
    NaivePlane(String id) { this.id = id; }
    boolean tryLand() {
        for (NaivePlane p : others) if (p.onRunway) { waiting = true; return false; }   // asks everyone
        for (NaivePlane p : others) if (p.waiting) { waiting = true; return false; }    // fairness? priority?
        onRunway = true; waiting = false; return true;     // two planes can do this at once
    }
}`, alt: [
                { lang: 'python', code: `
class NaivePlane:
    def __init__(self, id):
        self.id = id
        self.on_runway = self.waiting = False
        self.others = []
    def try_land(self):
        for p in self.others:
            if p.on_runway: self.waiting = True; return False   # asks everyone
        for p in self.others:
            if p.waiting: self.waiting = True; return False     # fairness? priority?
        self.on_runway = True; self.waiting = False; return True   # two planes can do this at once` },
                { lang: 'ts', code: `
class NaivePlane {
    onRunway = false; waiting = false; readonly others: NaivePlane[] = [];
    constructor(readonly id: string) {}
    tryLand(): boolean {
        for (const p of this.others) if (p.onRunway) { this.waiting = true; return false; }   // asks everyone
        for (const p of this.others) if (p.waiting) { this.waiting = true; return false; }    // fairness? priority?
        this.onRunway = true; this.waiting = false; return true;     // two planes can do this at once
    }
}` },
                { lang: 'cpp', code: `
class NaivePlane {
public:
    string id; bool onRunway = false, waiting = false; vector<NaivePlane*> others;
    NaivePlane(string id) : id(id) {}
    bool tryLand() {
        for (NaivePlane* p : others) if (p->onRunway) { waiting = true; return false; }   // asks everyone
        for (NaivePlane* p : others) if (p->waiting) { waiting = true; return false; }    // fairness? priority?
        onRunway = true; waiting = false; return true;     // two planes can do this at once
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class NaivePlane {
    public readonly string Id; public bool OnRunway, Waiting; public readonly List<NaivePlane> Others = new List<NaivePlane>();
    public NaivePlane(string id) { Id = id; }
    public bool TryLand() {
        foreach (NaivePlane p in Others) if (p.OnRunway) { Waiting = true; return false; }   // asks everyone
        foreach (NaivePlane p in Others) if (p.Waiting) { Waiting = true; return false; }    // fairness? priority?
        OnRunway = true; Waiting = false; return true;     // two planes can do this at once
    }
}` }
              ] } },
      mcq: { q: 'Which object should decide that an emergency plane jumps the queue?', options: ['The tower (mediator) — it owns the queue and runway rules', 'Each plane, by checking the others', 'The runway object', 'The emergency plane itself, by landing anyway'], answer: 0, explain: 'Coordination rules belong to the mediator. Planes only report events (request, landed) and obey instructions.' },
      hints: [`<p>Hint 1: Planes know only the tower. The tower knows runways (free/occupied) and a waiting queue.</p>`, `<p>Hint 2: Two deques (emergency, normal) or a PriorityQueue keyed by (priority, arrival sequence). An array of runway owners, null = free.</p>`, `<p>Hint 3: <code>landed()</code> frees the runway then calls a private <code>dispatchNext()</code>. Make tower methods <code>synchronized</code> so two planes cannot grab the same runway. Recipe: request → free runway? assign : enqueue; landed → free → dispatch.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "A: landing on runway 0\nB: holding pattern\nE: holding pattern\ntower: runway 0 free\nE: landing on runway 0\ntower: runway 0 free\nB: landing on runway 0\ntower: runway 0 free\nerror: A was not on a runway\n" }] },
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
        t.landed(b);      // nobody waiting: runway stays free
        try { t.landed(a); } catch (IllegalStateException ex) { System.out.println("error: " + ex.getMessage()); }
    }
}`, alt: [
          { lang: 'python', code: `from collections import deque
from dataclasses import dataclass
import threading


@dataclass(frozen=True)
class Plane:
    id: str
    emergency: bool = False

    def clear_to_land(self, runway: int) -> None:
        print(f"{self.id}: landing on runway {runway}")

    def hold(self) -> None:
        print(f"{self.id}: holding pattern")


class Tower:
    """The mediator: planes only ever talk to the tower, never to each other."""

    def __init__(self, runways: int):
        self._runways: list[Plane | None] = [None] * runways  # None = free
        self._emergency_q: deque[Plane] = deque()
        self._normal_q: deque[Plane] = deque()
        self._lock = threading.Lock()

    def request_landing(self, plane: Plane) -> None:
        with self._lock:
            free = self._free_runway()
            if free >= 0:
                self._assign(free, plane)
                return
            (self._emergency_q if plane.emergency else self._normal_q).append(plane)
            plane.hold()

    def landed(self, plane: Plane) -> None:
        with self._lock:
            for i, on_runway in enumerate(self._runways):
                if on_runway == plane:
                    self._runways[i] = None
                    print(f"tower: runway {i} free")
                    self._dispatch_next(i)
                    return
            raise RuntimeError(f"{plane.id} was not on a runway")

    def _dispatch_next(self, runway: int) -> None:
        queue = self._emergency_q or self._normal_q
        if queue:
            self._assign(runway, queue.popleft())

    def _free_runway(self) -> int:
        return next((i for i, p in enumerate(self._runways) if p is None), -1)

    def _assign(self, i: int, plane: Plane) -> None:
        self._runways[i] = plane
        plane.clear_to_land(i)


if __name__ == "__main__":
    t = Tower(1)
    a, b, e = Plane("A"), Plane("B"), Plane("E", emergency=True)
    t.request_landing(a)
    t.request_landing(b)
    t.request_landing(e)
    t.landed(a)  # E lands before B
    t.landed(e)  # then B
    t.landed(b)  # nobody waiting: runway stays free
    try:
        t.landed(a)
    except RuntimeError as ex:
        print("error:", ex)` },
          { lang: 'ts', code: `class Plane {
  constructor(readonly id: string, readonly emergency: boolean = false) {}
  clearToLand(runway: number): void { console.log(\`\${this.id}: landing on runway \${runway}\`); }
  hold(): void { console.log(\`\${this.id}: holding pattern\`); }
}

// The mediator: planes only ever talk to the tower, never to each other.
class Tower {
  private readonly runways: (Plane | null)[]; // null = free
  private readonly emergencyQ: Plane[] = [];
  private readonly normalQ: Plane[] = [];

  constructor(runwayCount: number) { this.runways = new Array<Plane | null>(runwayCount).fill(null); }

  requestLanding(p: Plane): void {
    const free = this.runways.indexOf(null);
    if (free >= 0) { this.assign(free, p); return; }
    (p.emergency ? this.emergencyQ : this.normalQ).push(p);
    p.hold();
  }

  landed(p: Plane): void {
    const i = this.runways.indexOf(p);
    if (i < 0) throw new Error(\`\${p.id} was not on a runway\`);
    this.runways[i] = null;
    console.log(\`tower: runway \${i} free\`);
    this.dispatchNext(i);
  }

  private dispatchNext(runway: number): void {
    const next = this.emergencyQ.shift() ?? this.normalQ.shift();
    if (next !== undefined) this.assign(runway, next);
  }

  private assign(i: number, p: Plane): void {
    this.runways[i] = p;
    p.clearToLand(i);
  }
}

const t = new Tower(1);
const a = new Plane("A"), b = new Plane("B"), e = new Plane("E", true);
t.requestLanding(a);
t.requestLanding(b);
t.requestLanding(e);
t.landed(a); // E lands before B
t.landed(e); // then B
t.landed(b); // nobody waiting: runway stays free
try { t.landed(a); } catch (ex) { console.log("error: " + (ex as Error).message); }` },
          { lang: 'cpp', code: `class Plane {
public:
    Plane(string id, bool emergency = false) : id_(std::move(id)), emergency_(emergency) {}
    const string& id() const { return id_; }
    bool emergency() const { return emergency_; }
    void clearToLand(int runway) const { cout << id_ << ": landing on runway " << runway << "\\n"; }
    void hold() const { cout << id_ << ": holding pattern\\n"; }
private:
    string id_;
    bool emergency_;
};

// The mediator: planes only ever talk to the tower, never to each other.
class Tower {
public:
    explicit Tower(int runways) : runways_(runways, nullptr) {}

    void requestLanding(Plane& p) {
        int free = freeRunway();
        if (free >= 0) { assign(free, p); return; }
        (p.emergency() ? emergencyQ : normalQ).push_back(&p);
        p.hold();
    }

    void landed(Plane& p) {
        auto it = find(runways_.begin(), runways_.end(), &p);
        if (it == runways_.end()) throw runtime_error(p.id() + " was not on a runway");
        int i = int(it - runways_.begin());
        *it = nullptr;
        cout << "tower: runway " << i << " free\\n";
        dispatchNext(i);
    }

private:
    void dispatchNext(int runway) {
        deque<Plane*>& q = !emergencyQ.empty() ? emergencyQ : normalQ;
        if (q.empty()) return;
        Plane* next = q.front();
        q.pop_front();
        assign(runway, *next);
    }
    int freeRunway() const {
        auto it = find(runways_.begin(), runways_.end(), nullptr);
        return it == runways_.end() ? -1 : int(it - runways_.begin());
    }
    void assign(int i, Plane& p) { runways_[i] = &p; p.clearToLand(i); }

    vector<Plane*> runways_;  // non-owning; nullptr = free
    deque<Plane*> emergencyQ, normalQ;
};

int main() {
    Tower t(1);
    Plane a("A"), b("B"), e("E", true);
    t.requestLanding(a);
    t.requestLanding(b);
    t.requestLanding(e);
    t.landed(a);  // E lands before B
    t.landed(e);  // then B
    t.landed(b);  // nobody waiting: runway stays free
    try { t.landed(a); } catch (const runtime_error& ex) { cout << "error: " << ex.what() << "\\n"; }
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class Plane {
    public readonly string Id; public readonly bool Emergency;
    public Plane(string id, bool emergency) { Id = id; Emergency = emergency; }
    public void ClearToLand(int runway) { Console.WriteLine(Id + ": landing on runway " + runway); }
    public void Hold() { Console.WriteLine(Id + ": holding pattern"); }
}

class Tower {
    private readonly Plane[] runways;                     // null = free
    private readonly Queue<Plane> emergencyQ = new Queue<Plane>(), normalQ = new Queue<Plane>();
    private readonly object gate = new object();
    public Tower(int r) { runways = new Plane[r]; }

    public void RequestLanding(Plane p) {
        lock (gate) {
            int free = FreeRunway();
            if (free >= 0) { Assign(free, p); return; }
            (p.Emergency ? emergencyQ : normalQ).Enqueue(p);
            p.Hold();
        }
    }

    public void Landed(Plane p) {
        lock (gate) {
            for (int i = 0; i < runways.Length; i++) {
                if (runways[i] == p) {
                    runways[i] = null;
                    Console.WriteLine("tower: runway " + i + " free");
                    DispatchNext(i);
                    return;
                }
            }
            throw new InvalidOperationException(p.Id + " was not on a runway");
        }
    }

    private void DispatchNext(int runway) {
        Plane next = emergencyQ.Count > 0 ? emergencyQ.Dequeue() : normalQ.Count > 0 ? normalQ.Dequeue() : null;
        if (next != null) Assign(runway, next);
    }
    private int FreeRunway() {
        for (int i = 0; i < runways.Length; i++) if (runways[i] == null) return i;
        return -1;
    }
    private void Assign(int i, Plane p) { runways[i] = p; p.ClearToLand(i); }
}

class Program {
    static void Main() {
        Tower t = new Tower(1);
        Plane a = new Plane("A", false), b = new Plane("B", false), e = new Plane("E", true);
        t.RequestLanding(a);
        t.RequestLanding(b);
        t.RequestLanding(e);
        t.Landed(a);      // E lands before B
        t.Landed(e);      // then B
        t.Landed(b);      // nobody waiting: runway stays free
        try { t.Landed(a); } catch (InvalidOperationException ex) { Console.WriteLine("error: " + ex.Message); }
    }
}` }
        ],
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
}`, alt: [
          { lang: 'python', code: `from __future__ import annotations

from dataclasses import dataclass
from collections import deque
from typing import Optional


class Game:
    def __init__(self):
        self._hp, self._gold, self._level = 100, 0, 1
        self._inventory: list[str] = []

    def play(self, damage: int, loot: int, item: Optional[str]) -> None:
        self._hp = max(0, self._hp - damage)
        self._gold += loot
        if item is not None:
            self._inventory.append(item)
        if self._gold >= 100:
            self._level += 1
            self._gold -= 100

    # MEMENTO: frozen, underscore fields, tuple inventory. Outside code can hold it but should not read it.
    @dataclass(frozen=True)
    class Snapshot:
        _hp: int
        _gold: int
        _level: int
        _inventory: tuple[str, ...]  # a copy, see save()
        label: str  # only harmless metadata is meant to be read

    def save(self, label: str) -> Game.Snapshot:
        return Game.Snapshot(self._hp, self._gold, self._level, tuple(self._inventory), label)  # copy, not reference!

    def restore(self, s: Game.Snapshot) -> None:
        self._hp, self._gold, self._level = s._hp, s._gold, s._level  # Game reads Snapshot's private fields
        self._inventory = list(s._inventory)

    def __str__(self) -> str:
        return f"hp={self._hp} gold={self._gold} lvl={self._level} inv=[{', '.join(self._inventory)}]"


# CARETAKER: stores snapshots, never inspects or edits them.
class SaveSlots:
    def __init__(self, max_slots: int):
        self._history: deque[Game.Snapshot] = deque(maxlen=max_slots)  # drops the oldest

    def push(self, s: Game.Snapshot) -> None:
        self._history.append(s)

    def pop(self) -> Optional[Game.Snapshot]:
        return self._history.pop() if self._history else None

    def labels(self) -> list[str]:
        return [s.label for s in reversed(self._history)]


if __name__ == "__main__":
    g = Game()
    slots = SaveSlots(3)
    g.play(10, 60, "sword")
    slots.push(g.save("before cave"))
    g.play(70, 50, "shield")
    slots.push(g.save("before boss"))
    g.play(90, 0, None)  # boss fight goes badly
    print("now:     ", g)
    if (s := slots.pop()) is not None:
        g.restore(s)
    print("reloaded:", g)
    if (s := slots.pop()) is not None:
        g.restore(s)
    print("reloaded:", g, "remaining saves", "[" + ", ".join(slots.labels()) + "]")` },
          { lang: 'ts', code: `// MEMENTO: an opaque token. Outside code can hold it but cannot read it.
declare const sealed: unique symbol;
interface Snapshot { readonly [sealed]: true; readonly label: string; } // only harmless metadata is visible

interface GameState { hp: number; gold: number; level: number; inventory: readonly string[]; }

class Game {
  private static readonly vault = new WeakMap<Snapshot, GameState>(); // only Game can open a Snapshot
  private hp = 100;
  private gold = 0;
  private level = 1;
  private readonly inventory: string[] = [];

  play(damage: number, loot: number, item: string | null): void {
    this.hp = Math.max(0, this.hp - damage);
    this.gold += loot;
    if (item !== null) this.inventory.push(item);
    if (this.gold >= 100) { this.level++; this.gold -= 100; }
  }

  save(label: string): Snapshot {
    const snap = { label } as Snapshot;
    Game.vault.set(snap, { hp: this.hp, gold: this.gold, level: this.level, inventory: [...this.inventory] }); // copy, not reference!
    return snap;
  }

  restore(s: Snapshot): void {
    const st = Game.vault.get(s);
    if (st === undefined) throw new Error("foreign snapshot");
    this.hp = st.hp; this.gold = st.gold; this.level = st.level;
    this.inventory.length = 0;
    this.inventory.push(...st.inventory);
  }

  toString(): string { return \`hp=\${this.hp} gold=\${this.gold} lvl=\${this.level} inv=[\${this.inventory.join(", ")}]\`; }
}

// CARETAKER: stores snapshots, never inspects or edits them.
class SaveSlots {
  private readonly history: Snapshot[] = [];
  constructor(private readonly max: number) {}
  push(s: Snapshot): void {
    this.history.push(s);
    if (this.history.length > this.max) this.history.shift(); // drop the oldest
  }
  pop(): Snapshot | undefined { return this.history.pop(); }
  labels(): string[] { return this.history.map((s) => s.label).reverse(); }
}

const g = new Game();
const slots = new SaveSlots(3);
g.play(10, 60, "sword");
slots.push(g.save("before cave"));
g.play(70, 50, "shield");
slots.push(g.save("before boss"));
g.play(90, 0, null); // boss fight goes badly
console.log("now:      " + g);
let s = slots.pop();
if (s) g.restore(s);
console.log("reloaded: " + g);
s = slots.pop();
if (s) g.restore(s);
console.log("reloaded: " + g + " remaining saves [" + slots.labels().join(", ") + "]");` },
          { lang: 'cpp', code: `class Game {
public:
    void play(int damage, int loot, const optional<string>& item) {
        hp = max(0, hp - damage);
        gold += loot;
        if (item) inventory.push_back(*item);
        if (gold >= 100) { level++; gold -= 100; }
    }

    // MEMENTO: nested, immutable, constructor and fields private. Outside code can hold it but not read it.
    class Snapshot {
        friend class Game;
    public:
        const string& label() const { return label_; }  // only harmless metadata is visible
    private:
        Snapshot(int hp, int gold, int level, vector<string> inv, string label)
            : hp(hp), gold(gold), level(level), inventory(std::move(inv)), label_(std::move(label)) {}
        int hp, gold, level;
        vector<string> inventory;  // a copy, see save()
        string label_;
    };

    Snapshot save(string label) const { return Snapshot(hp, gold, level, inventory, std::move(label)); }  // copy, not reference!
    void restore(const Snapshot& s) {
        hp = s.hp; gold = s.gold; level = s.level;  // Game can read Snapshot's private fields
        inventory = s.inventory;
    }

    string str() const {
        string inv;
        for (size_t i = 0; i < inventory.size(); i++) inv += (i ? ", " : "") + inventory[i];
        return "hp=" + to_string(hp) + " gold=" + to_string(gold) + " lvl=" + to_string(level) + " inv=[" + inv + "]";
    }

private:
    int hp = 100, gold = 0, level = 1;
    vector<string> inventory;
};

// CARETAKER: stores snapshots, never inspects or edits them.
class SaveSlots {
public:
    explicit SaveSlots(size_t max) : max(max) {}
    void push(Game::Snapshot s) {
        history.push_back(std::move(s));
        if (history.size() > max) history.pop_front();  // drop the oldest
    }
    optional<Game::Snapshot> pop() {
        if (history.empty()) return nullopt;
        Game::Snapshot s = std::move(history.back());
        history.pop_back();
        return s;
    }
    string labels() const {
        string out = "[";
        for (size_t i = history.size(); i-- > 0;) out += history[i].label() + (i ? ", " : "");
        return out + "]";
    }
private:
    deque<Game::Snapshot> history;
    size_t max;
};

int main() {
    Game g;
    SaveSlots slots(3);
    g.play(10, 60, "sword");
    slots.push(g.save("before cave"));
    g.play(70, 50, "shield");
    slots.push(g.save("before boss"));
    g.play(90, 0, nullopt);  // boss fight goes badly
    cout << "now:      " << g.str() << "\\n";
    if (auto s = slots.pop()) g.restore(*s);
    cout << "reloaded: " << g.str() << "\\n";
    if (auto s = slots.pop()) g.restore(*s);
    cout << "reloaded: " << g.str() << " remaining saves " << slots.labels() << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

class Game {
    private int hp = 100, gold = 0, level = 1;
    private readonly List<string> inventory = new List<string>();

    public void Play(int damage, int loot, string item) {
        hp = Math.Max(0, hp - damage); gold += loot;
        if (item != null) inventory.Add(item);
        if (gold >= 100) { level++; gold -= 100; }
    }

    // MEMENTO: nested, immutable, fields private. Outside code can hold it but not read it.
    public sealed class Snapshot {
        private readonly int hp, gold, level;
        private readonly List<string> inventory;        // deep copy, see Save()
        private readonly string label;
        internal Snapshot(int hp, int gold, int level, List<string> inv, string label) {
            this.hp = hp; this.gold = gold; this.level = level; inventory = inv; this.label = label;
        }
        public string Label { get { return label; } }   // only harmless metadata is visible
        internal void RestoreInto(Game g) {             // only Game can read the private fields, through this door
            g.hp = hp; g.gold = gold; g.level = level;
            g.inventory.Clear(); g.inventory.AddRange(inventory);
        }
    }

    public Snapshot Save(string label) {
        return new Snapshot(hp, gold, level, new List<string>(inventory), label);   // copy, not reference!
    }
    public void Restore(Snapshot s) { s.RestoreInto(this); }
    public override string ToString() { return "hp=" + hp + " gold=" + gold + " lvl=" + level + " inv=[" + string.Join(", ", inventory) + "]"; }
}

// CARETAKER: stores snapshots, never inspects or edits them.
class SaveSlots {
    private readonly LinkedList<Game.Snapshot> history = new LinkedList<Game.Snapshot>();   // front = newest
    private readonly int max;
    public SaveSlots(int max) { this.max = max; }
    public void Push(Game.Snapshot s) { history.AddFirst(s); if (history.Count > max) history.RemoveLast(); }
    public Game.Snapshot Pop() { if (history.Count == 0) return null; Game.Snapshot s = history.First.Value; history.RemoveFirst(); return s; }
    public List<string> Labels() { return history.Select(s => s.Label).ToList(); }
}

class Program {
    static void Main() {
        Game g = new Game();
        SaveSlots slots = new SaveSlots(3);
        g.Play(10, 60, "sword");
        slots.Push(g.Save("before cave"));
        g.Play(70, 50, "shield");
        slots.Push(g.Save("before boss"));
        g.Play(90, 0, null);                       // boss fight goes badly
        Console.WriteLine("now:      " + g);
        Game.Snapshot s1 = slots.Pop(); if (s1 != null) g.Restore(s1);
        Console.WriteLine("reloaded: " + g);
        Game.Snapshot s2 = slots.Pop(); if (s2 != null) g.Restore(s2);
        Console.WriteLine("reloaded: " + g + " remaining saves [" + string.Join(", ", slots.Labels()) + "]");
    }
}` }
        ] }],
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
      { title: 'The shallow-copy bug', html: `<p>If <code>save()</code> stores <code>this.inventory</code> (the same list object), then adding "shield" after saving also changes the snapshot — restore brings back the shield you should have lost. Always copy mutable fields (<code>List.copyOf</code>, defensive copies, or keep state immutable to begin with).</p>`, code: { lang: 'java', code: `List<String> live = new ArrayList<>(List.of("sword"));
List<String> badSnapshot = live;                 // same object!
List<String> goodSnapshot = List.copyOf(live);   // independent copy
live.add("shield");
System.out.println("bad: " + badSnapshot + "  good: " + goodSnapshot);   // bad: [sword, shield]  good: [sword]`, alt: [
          { lang: 'python', code: `live = ["sword"]
bad_snapshot = live  # same object!
good_snapshot = list(live)  # independent copy
live.append("shield")
print(f"bad: {bad_snapshot}  good: {good_snapshot}")  # bad: ['sword', 'shield']  good: ['sword']` },
          { lang: 'ts', code: `const live: string[] = ["sword"];
const badSnapshot = live; // same object!
const goodSnapshot = [...live]; // independent copy
live.push("shield");
console.log("bad:", badSnapshot, " good:", goodSnapshot); // bad: [ 'sword', 'shield' ]  good: [ 'sword' ]` },
          { lang: 'cpp', code: `vector<string> live = {"sword"};
vector<string>& badSnapshot = live;  // same object!
vector<string> goodSnapshot = live;  // independent copy
live.push_back("shield");
auto show = [](const vector<string>& v) {
    string s = "[";
    for (size_t i = 0; i < v.size(); i++) s += (i ? ", " : "") + v[i];
    return s + "]";
};
cout << "bad: " << show(badSnapshot) << "  good: " << show(goodSnapshot) << "\\n";  // bad: [sword, shield]  good: [sword]` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class Program {
    static void Main() {
        List<string> live = new List<string> { "sword" };
        List<string> badSnapshot = live;                        // same object!
        List<string> goodSnapshot = new List<string>(live);     // independent copy
        live.Add("shield");
        Console.WriteLine("bad: [" + string.Join(", ", badSnapshot) + "]  good: [" + string.Join(", ", goodSnapshot) + "]");   // bad: [sword, shield]  good: [sword]
    }
}` }
        ] } },
      { title: 'Form draft autosave', html: `<p>A long job-application form saves a memento every 30 s to local storage. If the browser crashes, the form restores the last memento. The autosave timer (caretaker) does not understand the form's fields; it stores whatever opaque blob <code>form.snapshot()</code> returns (often serialized JSON).</p>` },
      { title: 'Immutable state makes Memento free', html: `<p>If the originator's state is an immutable record (<code>record Board(List&lt;String&gt; cells, int turn)</code> built with copies), then "saving" is just keeping a reference to the current state object — it can never change. Redux in frontend apps, persistent data structures in functional languages and Git commits all work this way: <b>history = list of immutable states</b>, with structural sharing to save memory.</p>` },
      { title: 'Transactions: snapshot on BEGIN', html: `<p>An in-memory key-value store supports <code>BEGIN</code> / <code>ROLLBACK</code> / <code>COMMIT</code>. Simplest correct design: on BEGIN push a memento (copy of the map) on a stack; ROLLBACK pops and restores; COMMIT discards the top. Cost: O(size of map) per BEGIN. Optimised design (Hard practice problem): store only the <i>changed keys' old values</i> — a delta memento.</p>` }
    ],
    deepDive: `<p><b>Narrow vs wide interface:</b> GoF says the memento offers a <i>wide</i> interface to the originator (read all state) and a <i>narrow</i> one to everyone else (nothing, or a label/timestamp). In Java: nested class with private fields (the outer class can access them), or package-private access with originator and memento in the same package. In C++: a nested class with private members and <code>friend class Originator</code>. In Python (no real privacy): a frozen dataclass with underscore-named fields. In TypeScript: an opaque token whose contents sit in a private <code>WeakMap</code> inside the originator. In any language: an opaque serialized byte array.</p>
<p><b>Memory strategies:</b> (1) full snapshots — simple, O(state) per save; (2) <b>deltas</b> — store only what changed since the previous memento; restore by applying deltas backwards; (3) <b>copy-on-write / persistent structures</b> — unchanged parts are shared between snapshots; (4) cap the number of mementos (ring buffer) or thin them out over time (keep every save from the last minute, one per minute for the last hour…).</p>
<p><b>Serialization & versioning:</b> mementos written to disk (save files, autosave) outlive code versions. Add a version number and a migration path; never use raw language-native serialization of internal classes (Java serialization, Python <code>pickle</code>) for long-term storage — prefer explicit formats (JSON/Protobuf).</p>
<p><b>Consistency:</b> taking a snapshot while another thread mutates the originator gives a torn state. Synchronize <code>save()</code>/<code>restore()</code> with mutators, or snapshot immutable state atomically (swap an <code>AtomicReference&lt;State&gt;</code>). Databases solve this at scale with MVCC snapshots and point-in-time recovery — the same idea.</p>
<p><b>Restore side effects:</b> restoring fields does not undo external effects (emails sent, payments made). Memento rolls back <i>in-memory state only</i> — say this explicitly in interviews.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI coding agents need checkpoints. Tools like Claude Code snapshot files before edits so you can rewind; agent frameworks persist the conversation/graph state after each step (a memento) so a run can resume or be "time-travelled" back to a previous step for debugging. Same pattern: opaque snapshots, a caretaker (checkpointer), restore on demand.</p>
<p><b>Use AI as a partner:</b> ask for a test that saves, mutates every field (including nested collections), restores, and asserts deep equality — it catches shallow-copy bugs instantly. <b>Where AI goes wrong:</b> generates public getters/setters for everything, stores references to mutable lists, forgets the empty-history case. <b>What you own:</b> deciding snapshot vs command, memory budget, and what "restore" cannot undo.</p>`,
    problems: [{
      title: 'Game Checkpoints with Named Slots', level: 'Easy', tags: ['memento', 'encapsulation'], companies: ['EA', 'Ubisoft', 'Zynga'],
      statement: `<p>A <code>Player</code> has health, position (x, y) and an inventory list. Implement <code>CheckpointManager</code> supporting <code>save(name)</code>, <code>load(name)</code> and <code>list()</code>, with at most <b>3 named slots</b> (saving a 4th evicts the oldest). Loading a missing slot fails safely. The manager must <b>not</b> be able to read or modify the player's fields, and later changes to the player must not affect saved slots.</p>`,
      constraints: `Inventory up to 100 items. Names are unique; saving to an existing name overwrites it (and makes it the newest).`,
      example: `<p>hp=100 at (0,0) inv=[map] → save("start"). Move to (5,2), pick "key", hp=60 → save("door"). hp=0 → load("door") → ${H.c('g', 'hp=60 at (5,2) inv=[map,key]')}. load("start") → ${H.c('g', 'hp=100 at (0,0) inv=[map]')}. load("boss") → ${H.c('r', 'false, nothing changes')}.</p>`,
      brute: { why: `<p>The manager reads public fields of <code>Player</code> and stores them in parallel maps, then writes them back. Encapsulation is broken (anyone can set hp), every new player field must be added to the manager, and the inventory map stores the <b>same list reference</b> — picking up items after saving corrupts the save.</p>`, code: { lang: 'java', code: `class OpenPlayer { public int hp = 100, x, y; public List<String> inv = new ArrayList<>(); }
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
}`, alt: [
                { lang: 'python', code: `
class OpenPlayer:
    def __init__(self):
        self.hp, self.x, self.y = 100, 0, 0
        self.inv = []

class NaiveCheckpoints:
    def __init__(self):
        self.nums = {}
        self.invs = {}
    def save(self, name, p):
        self.nums[name] = [p.hp, p.x, p.y]
        self.invs[name] = p.inv                    # BUG: same list object, not a copy
    def load(self, name, p):
        v = self.nums[name]                        # KeyError if missing
        p.hp, p.x, p.y = v[0], v[1], v[2]; p.inv = self.invs[name]` },
                { lang: 'ts', code: `
class OpenPlayer { hp = 100; x = 0; y = 0; inv: string[] = []; }
class NaiveCheckpoints {
    readonly nums = new Map<string, number[]>();
    readonly invs = new Map<string, string[]>();
    save(name: string, p: OpenPlayer): void {
        this.nums.set(name, [p.hp, p.x, p.y]);
        this.invs.set(name, p.inv);                     // BUG: same array object, not a copy
    }
    load(name: string, p: OpenPlayer): void {
        const v = this.nums.get(name)!;                 // TypeError if missing
        p.hp = v[0]; p.x = v[1]; p.y = v[2]; p.inv = this.invs.get(name)!;
    }
}` },
                { lang: 'cpp', code: `
struct OpenPlayer { int hp = 100, x = 0, y = 0; shared_ptr<vector<string>> inv = make_shared<vector<string>>(); };
class NaiveCheckpoints {
    unordered_map<string, array<int, 3>> nums;
    unordered_map<string, shared_ptr<vector<string>>> invs;
public:
    void save(const string& name, OpenPlayer& p) {
        nums[name] = {p.hp, p.x, p.y};
        invs[name] = p.inv;                     // BUG: same list object, not a copy
    }
    void load(const string& name, OpenPlayer& p) {
        auto v = nums.at(name);                 // throws if missing
        p.hp = v[0]; p.x = v[1]; p.y = v[2]; p.inv = invs.at(name);
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class OpenPlayer { public int Hp = 100, X, Y; public List<string> Inv = new List<string>(); }
class NaiveCheckpoints {
    readonly Dictionary<string, int[]> nums = new Dictionary<string, int[]>();
    readonly Dictionary<string, List<string>> invs = new Dictionary<string, List<string>>();
    public void Save(string name, OpenPlayer p) {
        nums[name] = new[] { p.Hp, p.X, p.Y };
        invs[name] = p.Inv;                        // BUG: same list object, not a copy
    }
    public void Load(string name, OpenPlayer p) {
        int[] v = nums[name];                      // throws if missing
        p.Hp = v[0]; p.X = v[1]; p.Y = v[2]; p.Inv = invs[name];
    }
}` }
              ] } },
      mcq: { q: 'Where should the code that copies the inventory list live?', options: ['In Player.save() — the originator decides how to snapshot itself', 'In CheckpointManager.save()', 'In the inventory item class', 'Nowhere; references are fine'], answer: 0, explain: 'Only the originator knows its internals and which parts are mutable; it builds a self-contained memento. The caretaker just stores it.' },
      hints: [`<p>Hint 1: Player creates a <code>Player.Memento</code> (nested, private fields) and has <code>restore(Memento)</code>.</p>`, `<p>Hint 2: Caretaker = <code>LinkedHashMap&lt;String, Player.Memento&gt;</code>. Re-inserting a name: remove then put so it becomes newest. Evict the first entry when size &gt; 3.</p>`, `<p>Hint 3: Copy the inventory with <code>List.copyOf</code> on save and copy again on restore (so the player cannot mutate the memento's list). <code>load</code> returns boolean for missing slots.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "hp=60 at (5,2) inv=[map,key]\nhp=100 at (0,0) inv=[map]\nfalse [start, door]\n[door, c1, c2]\nhp=100 at (0,0) inv=[map]\n[c1, c2, door] false\n" }] },
      solution: {
        approach: `<p>Player is the originator: <code>createMemento()</code> returns an immutable nested <code>Memento</code> with private fields and a defensive copy of the inventory; <code>restore(m)</code> copies everything back. The caretaker <code>CheckpointManager</code> keeps a <code>LinkedHashMap</code> in insertion order to evict the oldest slot. It only ever handles <code>Player.Memento</code> as an opaque value — no access to hp or position.</p>`,
        code: `class Player {
    private int hp = 100, x, y;
    private final List<String> inventory = new ArrayList<>();

    void move(int dx, int dy) { x += dx; y += dy; }
    void damage(int d) { hp = Math.max(0, hp - d); }
    void pick(String item) { inventory.add(item); }
    @Override public String toString() { return "hp=" + hp + " at (" + x + "," + y + ") inv=[" + String.join(",", inventory) + "]"; }

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
        cm.load("door", p);  System.out.println(p);    // hp=60 at (5,2) inv=[map,key]
        cm.load("start", p); System.out.println(p);    // hp=100 at (0,0) inv=[map]
        System.out.println(cm.load("boss", p) + " " + cm.list());
        cm.save("c1", p); cm.save("c2", p);            // 4th slot evicts the oldest ("start")
        System.out.println(cm.list());
        p.pick("gem"); cm.load("c1", p);               // the save was a copy: no gem
        System.out.println(p);
        cm.save("door", p);                            // overwrite => newest
        System.out.println(cm.list() + " " + cm.load("start", p));
    }
}`, alt: [
          { lang: 'python', code: `from __future__ import annotations

from dataclasses import dataclass


class Player:
    def __init__(self):
        self._hp = 100
        self._x = 0
        self._y = 0
        self._inventory: list[str] = []

    def move(self, dx: int, dy: int) -> None:
        self._x += dx
        self._y += dy

    def damage(self, d: int) -> None:
        self._hp = max(0, self._hp - d)

    def pick(self, item: str) -> None:
        self._inventory.append(item)

    def __str__(self) -> str:
        return f"hp={self._hp} at ({self._x},{self._y}) inv=[{','.join(self._inventory)}]"

    @dataclass(frozen=True)
    class Memento:
        """Opaque snapshot: frozen, and the inventory is a tuple, so nobody can change it later."""
        _hp: int
        _x: int
        _y: int
        _inventory: tuple[str, ...]

    def create_memento(self) -> Player.Memento:
        return Player.Memento(self._hp, self._x, self._y, tuple(self._inventory))

    def restore(self, m: Player.Memento) -> None:
        self._hp, self._x, self._y = m._hp, m._x, m._y
        self._inventory = list(m._inventory)


class CheckpointManager:
    MAX = 3

    def __init__(self):
        self._slots: dict[str, Player.Memento] = {}  # dicts keep insertion order

    def save(self, name: str, p: Player) -> None:
        self._slots.pop(name, None)  # overwrite => becomes newest
        self._slots[name] = p.create_memento()
        if len(self._slots) > self.MAX:
            del self._slots[next(iter(self._slots))]  # evict the oldest

    def load(self, name: str, p: Player) -> bool:
        m = self._slots.get(name)
        if m is None:
            return False
        p.restore(m)
        return True

    def list(self) -> list[str]:
        return [*self._slots]


def show(names: list[str]) -> str:
    return "[" + ", ".join(names) + "]"


if __name__ == "__main__":
    p = Player()
    p.pick("map")
    cm = CheckpointManager()
    cm.save("start", p)
    p.move(5, 2)
    p.pick("key")
    p.damage(40)
    cm.save("door", p)
    p.damage(100)
    cm.load("door", p)
    print(p)  # hp=60 at (5,2) inv=[map,key]
    cm.load("start", p)
    print(p)  # hp=100 at (0,0) inv=[map]
    print(str(cm.load("boss", p)).lower(), show(cm.list()))
    cm.save("c1", p)
    cm.save("c2", p)  # 4th slot evicts the oldest ("start")
    print(show(cm.list()))
    p.pick("gem")
    cm.load("c1", p)  # the save was a copy: no gem
    print(p)
    cm.save("door", p)  # overwrite => newest
    print(show(cm.list()), str(cm.load("start", p)).lower())` },
          { lang: 'ts', code: `// Opaque token: the manager can hold a Memento but cannot see inside it.
declare const sealed: unique symbol;
interface Memento { readonly [sealed]: true; }

interface Snapshot { readonly hp: number; readonly x: number; readonly y: number; readonly inventory: readonly string[]; }

class Player {
  private static readonly vault = new WeakMap<Memento, Snapshot>(); // only Player can read it
  private hp = 100;
  private x = 0;
  private y = 0;
  private inventory: string[] = [];

  move(dx: number, dy: number): void { this.x += dx; this.y += dy; }
  damage(d: number): void { this.hp = Math.max(0, this.hp - d); }
  pick(item: string): void { this.inventory.push(item); }
  toString(): string { return \`hp=\${this.hp} at (\${this.x},\${this.y}) inv=[\${this.inventory.join(",")}]\`; }

  createMemento(): Memento {
    const m = {} as Memento;
    Player.vault.set(m, { hp: this.hp, x: this.x, y: this.y, inventory: [...this.inventory] });
    return m;
  }

  restore(m: Memento): void {
    const s = Player.vault.get(m);
    if (s === undefined) throw new Error("foreign memento");
    this.hp = s.hp; this.x = s.x; this.y = s.y;
    this.inventory = [...s.inventory];
  }
}

class CheckpointManager {
  private static readonly MAX = 3;
  private readonly slots = new Map<string, Memento>(); // Map keeps insertion order

  save(name: string, p: Player): void {
    this.slots.delete(name); // overwrite => becomes newest
    this.slots.set(name, p.createMemento());
    if (this.slots.size > CheckpointManager.MAX) {
      const oldest = this.slots.keys().next().value as string;
      this.slots.delete(oldest);
    }
  }

  load(name: string, p: Player): boolean {
    const m = this.slots.get(name);
    if (m === undefined) return false;
    p.restore(m);
    return true;
  }

  list(): string[] { return [...this.slots.keys()]; }
}

const show = (names: string[]): string => "[" + names.join(", ") + "]";

const p = new Player(); p.pick("map");
const cm = new CheckpointManager();
cm.save("start", p);
p.move(5, 2); p.pick("key"); p.damage(40);
cm.save("door", p);
p.damage(100);
cm.load("door", p); console.log(String(p)); // hp=60 at (5,2) inv=[map,key]
cm.load("start", p); console.log(String(p)); // hp=100 at (0,0) inv=[map]
console.log(cm.load("boss", p) + " " + show(cm.list()));
cm.save("c1", p); cm.save("c2", p); // 4th slot evicts the oldest ("start")
console.log(show(cm.list()));
p.pick("gem"); cm.load("c1", p); // the save was a copy: no gem
console.log(String(p));
cm.save("door", p); // overwrite => newest
console.log(show(cm.list()) + " " + cm.load("start", p));` },
          { lang: 'cpp', code: `class Player {
public:
    class Memento {  // opaque: only Player can read or build one
        friend class Player;
        Memento(int hp, int x, int y, vector<string> inv) : hp(hp), x(x), y(y), inventory(std::move(inv)) {}
        int hp, x, y;
        vector<string> inventory;
    };

    void move(int dx, int dy) { x += dx; y += dy; }
    void damage(int d) { hp = max(0, hp - d); }
    void pick(const string& item) { inventory.push_back(item); }
    string str() const {
        string s = "hp=" + to_string(hp) + " at (" + to_string(x) + "," + to_string(y) + ") inv=[";
        for (size_t i = 0; i < inventory.size(); i++) s += (i ? "," : "") + inventory[i];
        return s + "]";
    }

    Memento createMemento() const { return Memento(hp, x, y, inventory); }  // vector is copied
    void restore(const Memento& m) { hp = m.hp; x = m.x; y = m.y; inventory = m.inventory; }

private:
    int hp = 100, x = 0, y = 0;
    vector<string> inventory;
};

class CheckpointManager {
public:
    void save(const string& name, const Player& p) {
        slots.erase(remove_if(slots.begin(), slots.end(), [&](auto& s) { return s.first == name; }), slots.end());
        slots.emplace_back(name, p.createMemento());  // overwrite => becomes newest
        if (slots.size() > MAX) slots.erase(slots.begin());  // evict the oldest
    }
    bool load(const string& name, Player& p) const {
        for (const auto& [n, m] : slots)
            if (n == name) { p.restore(m); return true; }
        return false;
    }
    vector<string> list() const {
        vector<string> names;
        for (const auto& s : slots) names.push_back(s.first);
        return names;
    }
private:
    static constexpr size_t MAX = 3;
    vector<pair<string, Player::Memento>> slots;  // oldest first
};

string show(const vector<string>& names) {
    string s = "[";
    for (size_t i = 0; i < names.size(); i++) s += (i ? ", " : "") + names[i];
    return s + "]";
}

int main() {
    Player p; p.pick("map");
    CheckpointManager cm;
    cm.save("start", p);
    p.move(5, 2); p.pick("key"); p.damage(40);
    cm.save("door", p);
    p.damage(100);
    cm.load("door", p); cout << p.str() << "\\n";  // hp=60 at (5,2) inv=[map,key]
    cm.load("start", p); cout << p.str() << "\\n";  // hp=100 at (0,0) inv=[map]
    bool found = cm.load("boss", p);
    cout << boolalpha << found << " " << show(cm.list()) << "\\n";
    cm.save("c1", p); cm.save("c2", p);  // 4th slot evicts the oldest ("start")
    cout << show(cm.list()) << "\\n";
    p.pick("gem"); cm.load("c1", p);  // the save was a copy: no gem
    cout << p.str() << "\\n";
    cm.save("door", p);  // overwrite => newest
    string names = show(cm.list());
    cout << names << " " << cm.load("start", p) << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

class Player {
    private int hp = 100, x, y;
    private readonly List<string> inventory = new List<string>();

    public void Move(int dx, int dy) { x += dx; y += dy; }
    public void Damage(int d) { hp = Math.Max(0, hp - d); }
    public void Pick(string item) { inventory.Add(item); }
    public override string ToString() { return "hp=" + hp + " at (" + x + "," + y + ") inv=[" + string.Join(",", inventory) + "]"; }

    public sealed class Memento {
        private readonly int hp, x, y; private readonly List<string> inventory;
        internal Memento(int hp, int x, int y, List<string> inv) { this.hp = hp; this.x = x; this.y = y; inventory = inv; }
        internal void RestoreInto(Player p) {
            p.hp = hp; p.x = x; p.y = y;
            p.inventory.Clear(); p.inventory.AddRange(inventory);
        }
    }
    public Memento CreateMemento() { return new Memento(hp, x, y, new List<string>(inventory)); }
    public void Restore(Memento m) { m.RestoreInto(this); }
}

class CheckpointManager {
    private const int Max = 3;
    private readonly List<KeyValuePair<string, Player.Memento>> slots = new List<KeyValuePair<string, Player.Memento>>();   // oldest first

    public void Save(string name, Player p) {
        slots.RemoveAll(s => s.Key == name);           // overwrite => becomes newest
        slots.Add(new KeyValuePair<string, Player.Memento>(name, p.CreateMemento()));
        if (slots.Count > Max) slots.RemoveAt(0);      // evict the oldest
    }
    public bool Load(string name, Player p) {
        int i = slots.FindIndex(s => s.Key == name);
        if (i < 0) return false;
        p.Restore(slots[i].Value);
        return true;
    }
    public List<string> List() { return slots.Select(s => s.Key).ToList(); }
}

class Program {
    static string Show(List<string> l) { return "[" + string.Join(", ", l) + "]"; }
    static void Main() {
        Player p = new Player(); p.Pick("map");
        CheckpointManager cm = new CheckpointManager();
        cm.Save("start", p);
        p.Move(5, 2); p.Pick("key"); p.Damage(40);
        cm.Save("door", p);
        p.Damage(100);
        cm.Load("door", p);  Console.WriteLine(p);    // hp=60 at (5,2) inv=[map,key]
        cm.Load("start", p); Console.WriteLine(p);    // hp=100 at (0,0) inv=[map]
        Console.WriteLine(cm.Load("boss", p).ToString().ToLower() + " " + Show(cm.List()));
        cm.Save("c1", p); cm.Save("c2", p);           // 4th slot evicts the oldest ("start")
        Console.WriteLine(Show(cm.List()));
        p.Pick("gem"); cm.Load("c1", p);              // the save was a copy: no gem
        Console.WriteLine(p);
        cm.Save("door", p);                           // overwrite => newest
        Console.WriteLine(Show(cm.List()) + " " + cm.Load("start", p).ToString().ToLower());
    }
}` }
        ],
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
<p><b>Why <code>accept</code>? Double dispatch.</b> Java and C++ pick an overloaded method by the <i>compile-time</i> type (Python and JavaScript have no overloading by type at all). Given <code>Expr e</code>, calling <code>visitor.visit(e)</code> cannot know e is an <code>Add</code>. So we bounce: <code>e.accept(v)</code> dispatches on the <b>element's runtime type</b> (first dispatch), and inside <code>Add.accept</code> the call <code>v.visitAdd(this)</code> dispatches on the <b>visitor's runtime type</b> (second dispatch). Two virtual calls = the exact (element, operation) pair.</p>
<p><b>The trade-off (say it in interviews):</b> Visitor makes <b>adding operations easy</b> (new class) but <b>adding element types hard</b> (every visitor needs a new method). Use it when types are stable and operations grow — compilers (AST passes), document exporters, file-system tools. Modern languages offer a lighter alternative: <b>sealed interfaces + pattern-matching switch</b> (Java 21), <code>match</code> on dataclasses (Python), discriminated unions (TypeScript) or <code>std::variant</code> + <code>std::visit</code> (C++), where the compiler or type checker verifies exhaustiveness.</p>`,
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
}`, alt: [
          { lang: 'python', code: `from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Generic, TypeVar

R = TypeVar("R")


class ExprVisitor(ABC, Generic[R]):
    @abstractmethod
    def visit_num(self, n: Num) -> R: ...

    @abstractmethod
    def visit_add(self, a: Add) -> R: ...

    @abstractmethod
    def visit_sub(self, s: Sub) -> R: ...

    @abstractmethod
    def visit_mul(self, m: Mul) -> R: ...


class Expr(ABC):
    @abstractmethod
    def accept(self, v: ExprVisitor[R]) -> R: ...


# Each accept() is one line: "visitor, here is me, with my exact type".
@dataclass(frozen=True)
class Num(Expr):
    value: int

    def accept(self, v: ExprVisitor[R]) -> R:
        return v.visit_num(self)


@dataclass(frozen=True)
class Add(Expr):
    l: Expr
    r: Expr

    def accept(self, v: ExprVisitor[R]) -> R:
        return v.visit_add(self)


@dataclass(frozen=True)
class Sub(Expr):
    l: Expr
    r: Expr

    def accept(self, v: ExprVisitor[R]) -> R:
        return v.visit_sub(self)


@dataclass(frozen=True)
class Mul(Expr):
    l: Expr
    r: Expr

    def accept(self, v: ExprVisitor[R]) -> R:
        return v.visit_mul(self)


# Operation 1: evaluate
class EvalVisitor(ExprVisitor[int]):
    def visit_num(self, n: Num) -> int:
        return n.value

    def visit_add(self, a: Add) -> int:
        return a.l.accept(self) + a.r.accept(self)

    def visit_sub(self, s: Sub) -> int:
        return s.l.accept(self) - s.r.accept(self)

    def visit_mul(self, m: Mul) -> int:
        return m.l.accept(self) * m.r.accept(self)


# Operation 2: pretty-print. Added later, ZERO changes to Num/Add/Sub/Mul.
class PrintVisitor(ExprVisitor[str]):
    def visit_num(self, n: Num) -> str:
        return str(n.value)

    def visit_add(self, a: Add) -> str:
        return f"({a.l.accept(self)} + {a.r.accept(self)})"

    def visit_sub(self, s: Sub) -> str:
        return f"({s.l.accept(self)} - {s.r.accept(self)})"

    def visit_mul(self, m: Mul) -> str:
        return f"{m.l.accept(self)} * {m.r.accept(self)}"


# Operation 3: count nodes by type (a visitor can also accumulate state)
class CountVisitor(ExprVisitor[None]):
    def __init__(self):
        self.counts: dict[str, int] = {}

    def _bump(self, k: str) -> None:
        self.counts[k] = self.counts.get(k, 0) + 1

    def visit_num(self, n: Num) -> None:
        self._bump("Num")

    def visit_add(self, a: Add) -> None:
        a.l.accept(self); a.r.accept(self); self._bump("Add")

    def visit_sub(self, s: Sub) -> None:
        s.l.accept(self); s.r.accept(self); self._bump("Sub")

    def visit_mul(self, m: Mul) -> None:
        m.l.accept(self); m.r.accept(self); self._bump("Mul")


if __name__ == "__main__":
    e = Mul(Add(Num(2), Num(3)), Sub(Num(7), Num(4)))  # (2+3)*(7-4)
    print(f"{e.accept(PrintVisitor())} = {e.accept(EvalVisitor())}")
    c = CountVisitor()
    e.accept(c)
    print("{" + ", ".join(f"{k}={c.counts[k]}" for k in sorted(c.counts)) + "}")` },
          { lang: 'ts', code: `interface ExprVisitor<R> {
  visitNum(n: Num): R;
  visitAdd(a: Add): R;
  visitSub(s: Sub): R;
  visitMul(m: Mul): R;
}

interface Expr { accept<R>(v: ExprVisitor<R>): R; }

// Each accept() is one line: "visitor, here is me, with my exact type".
class Num implements Expr {
  constructor(readonly value: number) {}
  accept<R>(v: ExprVisitor<R>): R { return v.visitNum(this); }
}
class Add implements Expr {
  constructor(readonly l: Expr, readonly r: Expr) {}
  accept<R>(v: ExprVisitor<R>): R { return v.visitAdd(this); }
}
class Sub implements Expr {
  constructor(readonly l: Expr, readonly r: Expr) {}
  accept<R>(v: ExprVisitor<R>): R { return v.visitSub(this); }
}
class Mul implements Expr {
  constructor(readonly l: Expr, readonly r: Expr) {}
  accept<R>(v: ExprVisitor<R>): R { return v.visitMul(this); }
}

// Operation 1: evaluate
class EvalVisitor implements ExprVisitor<number> {
  visitNum(n: Num): number { return n.value; }
  visitAdd(a: Add): number { return a.l.accept(this) + a.r.accept(this); }
  visitSub(s: Sub): number { return s.l.accept(this) - s.r.accept(this); }
  visitMul(m: Mul): number { return m.l.accept(this) * m.r.accept(this); }
}

// Operation 2: pretty-print. Added later, ZERO changes to Num/Add/Sub/Mul.
class PrintVisitor implements ExprVisitor<string> {
  visitNum(n: Num): string { return String(n.value); }
  visitAdd(a: Add): string { return \`(\${a.l.accept(this)} + \${a.r.accept(this)})\`; }
  visitSub(s: Sub): string { return \`(\${s.l.accept(this)} - \${s.r.accept(this)})\`; }
  visitMul(m: Mul): string { return \`\${m.l.accept(this)} * \${m.r.accept(this)}\`; }
}

// Operation 3: count nodes by type (a visitor can also accumulate state)
class CountVisitor implements ExprVisitor<void> {
  readonly counts = new Map<string, number>();
  private bump(k: string): void { this.counts.set(k, (this.counts.get(k) ?? 0) + 1); }
  visitNum(_n: Num): void { this.bump("Num"); }
  visitAdd(a: Add): void { a.l.accept(this); a.r.accept(this); this.bump("Add"); }
  visitSub(s: Sub): void { s.l.accept(this); s.r.accept(this); this.bump("Sub"); }
  visitMul(m: Mul): void { m.l.accept(this); m.r.accept(this); this.bump("Mul"); }
}

const e: Expr = new Mul(new Add(new Num(2), new Num(3)), new Sub(new Num(7), new Num(4))); // (2+3)*(7-4)
console.log(\`\${e.accept(new PrintVisitor())} = \${e.accept(new EvalVisitor())}\`);
const c = new CountVisitor();
e.accept(c);
console.log("{" + [...c.counts].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => \`\${k}=\${v}\`).join(", ") + "}");` },
          { lang: 'cpp', code: `// The closed set of node types is a std::variant, and std::visit is the visitor:
// the compiler rejects a visitor that forgets a node type, and there is no accept() boilerplate.
struct Expr;
using ExprPtr = unique_ptr<Expr>;

struct Num { int value; };
struct Add { ExprPtr l, r; };
struct Sub { ExprPtr l, r; };
struct Mul { ExprPtr l, r; };
struct Expr { variant<Num, Add, Sub, Mul> node; };

template <class T, class... Args>
ExprPtr make(Args&&... args) { return make_unique<Expr>(Expr{T{std::forward<Args>(args)...}}); }

// Operation 1: evaluate
struct EvalVisitor {
    int operator()(const Num& n) const { return n.value; }
    int operator()(const Add& a) const { return eval(*a.l) + eval(*a.r); }
    int operator()(const Sub& s) const { return eval(*s.l) - eval(*s.r); }
    int operator()(const Mul& m) const { return eval(*m.l) * eval(*m.r); }
    int eval(const Expr& e) const { return visit(*this, e.node); }
};

// Operation 2: pretty-print. Added later, ZERO changes to Num/Add/Sub/Mul.
struct PrintVisitor {
    string operator()(const Num& n) const { return to_string(n.value); }
    string operator()(const Add& a) const { return "(" + print(*a.l) + " + " + print(*a.r) + ")"; }
    string operator()(const Sub& s) const { return "(" + print(*s.l) + " - " + print(*s.r) + ")"; }
    string operator()(const Mul& m) const { return print(*m.l) + " * " + print(*m.r); }
    string print(const Expr& e) const { return visit(*this, e.node); }
};

// Operation 3: count nodes by type (a visitor can also accumulate state)
struct CountVisitor {
    map<string, int> counts;  // ordered, so the output is sorted by name
    void operator()(const Num&) { counts["Num"]++; }
    void operator()(const Add& a) { walk(*a.l); walk(*a.r); counts["Add"]++; }
    void operator()(const Sub& s) { walk(*s.l); walk(*s.r); counts["Sub"]++; }
    void operator()(const Mul& m) { walk(*m.l); walk(*m.r); counts["Mul"]++; }
    void walk(const Expr& e) { visit(*this, e.node); }
};

int main() {
    ExprPtr e = make<Mul>(make<Add>(make<Num>(2), make<Num>(3)),
                          make<Sub>(make<Num>(7), make<Num>(4)));  // (2+3)*(7-4)
    cout << PrintVisitor().print(*e) << " = " << EvalVisitor().eval(*e) << "\\n";
    CountVisitor c;
    c.walk(*e);
    string out = "{";
    for (auto it = c.counts.begin(); it != c.counts.end(); ++it) out += (it == c.counts.begin() ? "" : ", ") + it->first + "=" + to_string(it->second);
    cout << out << "}\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

interface IExprVisitor<R> {
    R VisitNum(Num n);
    R VisitAdd(Add a);
    R VisitSub(Sub s);
    R VisitMul(Mul m);
}

interface IExpr { R Accept<R>(IExprVisitor<R> v); }

// Each Accept() is one line: "visitor, here is me, with my exact type".
sealed class Num : IExpr { public readonly int Value; public Num(int value) { Value = value; } public R Accept<R>(IExprVisitor<R> v) { return v.VisitNum(this); } }
sealed class Add : IExpr { public readonly IExpr L, R; public Add(IExpr l, IExpr r) { L = l; R = r; } public TR Accept<TR>(IExprVisitor<TR> v) { return v.VisitAdd(this); } }
sealed class Sub : IExpr { public readonly IExpr L, R; public Sub(IExpr l, IExpr r) { L = l; R = r; } public TR Accept<TR>(IExprVisitor<TR> v) { return v.VisitSub(this); } }
sealed class Mul : IExpr { public readonly IExpr L, R; public Mul(IExpr l, IExpr r) { L = l; R = r; } public TR Accept<TR>(IExprVisitor<TR> v) { return v.VisitMul(this); } }

// Operation 1: evaluate
class EvalVisitor : IExprVisitor<int> {
    public int VisitNum(Num n) { return n.Value; }
    public int VisitAdd(Add a) { return a.L.Accept(this) + a.R.Accept(this); }
    public int VisitSub(Sub s) { return s.L.Accept(this) - s.R.Accept(this); }
    public int VisitMul(Mul m) { return m.L.Accept(this) * m.R.Accept(this); }
}
// Operation 2: pretty-print. Added later, ZERO changes to Num/Add/Sub/Mul.
class PrintVisitor : IExprVisitor<string> {
    public string VisitNum(Num n) { return n.Value.ToString(); }
    public string VisitAdd(Add a) { return "(" + a.L.Accept(this) + " + " + a.R.Accept(this) + ")"; }
    public string VisitSub(Sub s) { return "(" + s.L.Accept(this) + " - " + s.R.Accept(this) + ")"; }
    public string VisitMul(Mul m) { return A(m.L) + " * " + A(m.R); }
    private string A(IExpr e) { return e.Accept(this); }
}
// Operation 3: count nodes by type (a visitor can also accumulate state)
class CountVisitor : IExprVisitor<bool> {
    public readonly SortedDictionary<string, int> Counts = new SortedDictionary<string, int>(StringComparer.Ordinal);
    private bool Bump(string k) { int n; Counts.TryGetValue(k, out n); Counts[k] = n + 1; return true; }
    public bool VisitNum(Num n) { return Bump("Num"); }
    public bool VisitAdd(Add a) { a.L.Accept(this); a.R.Accept(this); return Bump("Add"); }
    public bool VisitSub(Sub s) { s.L.Accept(this); s.R.Accept(this); return Bump("Sub"); }
    public bool VisitMul(Mul m) { m.L.Accept(this); m.R.Accept(this); return Bump("Mul"); }
}

class Program {
    static void Main() {
        IExpr e = new Mul(new Add(new Num(2), new Num(3)), new Sub(new Num(7), new Num(4)));   // (2+3)*(7-4)
        Console.WriteLine(e.Accept(new PrintVisitor()) + " = " + e.Accept(new EvalVisitor()));
        CountVisitor c = new CountVisitor();
        e.Accept(c);
        Console.WriteLine("{" + string.Join(", ", c.Counts.Select(kv => kv.Key + "=" + kv.Value)) + "}");
    }
}` }
        ] }, { lang: 'java', title: 'Java 21 alternative: sealed types + pattern-matching switch', code: `// The compiler knows ALL subtypes of a sealed interface, so the switch must be exhaustive.
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
            case Circle c   -> String.format("<circle r='%.1f'/>", c.r());
            case Rect r     -> String.format("<rect width='%.1f' height='%.1f'/>", r.w(), r.h());
            case Triangle t -> String.format("<polygon base='%.1f'/>", t.b());
        };
    }
    public static void main(String[] args) {
        List<Shape> shapes = List.of(new Circle(1), new Rect(2, 3), new Triangle(4, 5));
        for (Shape s : shapes) System.out.printf("%.2f %s%n", area(s), svg(s));
    }
}`, alt: [
          { lang: 'python', code: `import math
from dataclasses import dataclass


# The type checker knows ALL members of this union, so an exhaustive match is checkable.
@dataclass(frozen=True)
class Circle:
    r: float


@dataclass(frozen=True)
class Rect:
    w: float
    h: float


@dataclass(frozen=True)
class Triangle:
    b: float
    h: float


Shape = Circle | Rect | Triangle


# Each "visitor" is just a function with a match. No accept() boilerplate.
def area(s: Shape) -> float:
    match s:
        case Circle(r):
            return math.pi * r * r
        case Rect(w, h):
            return w * h
        case Triangle(b, h):
            return 0.5 * b * h  # add a new Shape and mypy/pyright flag the missing case


def svg(s: Shape) -> str:
    match s:
        case Circle(r):
            return f"<circle r='{r:.1f}'/>"
        case Rect(w, h):
            return f"<rect width='{w:.1f}' height='{h:.1f}'/>"
        case Triangle(b):
            return f"<polygon base='{b:.1f}'/>"


if __name__ == "__main__":
    shapes: list[Shape] = [Circle(1), Rect(2, 3), Triangle(4, 5)]
    for s in shapes:
        print(f"{area(s):.2f} {svg(s)}")` },
          { lang: 'ts', code: `// A discriminated union: the compiler knows ALL variants, so the switch must be exhaustive.
type Shape =
  | { kind: "circle"; r: number }
  | { kind: "rect"; w: number; h: number }
  | { kind: "triangle"; b: number; h: number };

// Each "visitor" is just a function with a switch. No accept() boilerplate.
function area(s: Shape): number {
  switch (s.kind) {
    case "circle": return Math.PI * s.r * s.r;
    case "rect": return s.w * s.h;
    case "triangle": return 0.5 * s.b * s.h;
    default: { const unreachable: never = s; return unreachable; } // a new Shape stops compiling here: safe!
  }
}

function svg(s: Shape): string {
  switch (s.kind) {
    case "circle": return \`<circle r='\${s.r.toFixed(1)}'/>\`;
    case "rect": return \`<rect width='\${s.w.toFixed(1)}' height='\${s.h.toFixed(1)}'/>\`;
    case "triangle": return \`<polygon base='\${s.b.toFixed(1)}'/>\`;
    default: { const unreachable: never = s; return unreachable; }
  }
}

const shapes: Shape[] = [{ kind: "circle", r: 1 }, { kind: "rect", w: 2, h: 3 }, { kind: "triangle", b: 4, h: 5 }];
for (const s of shapes) console.log(\`\${area(s).toFixed(2)} \${svg(s)}\`);` },
          { lang: 'cpp', code: `// std::variant is the closed set of shapes; std::visit with a lambda per case is the exhaustive switch.
struct Circle { double r; };
struct Rect { double w, h; };
struct Triangle { double b, h; };
using Shape = variant<Circle, Rect, Triangle>;

template <class... Fs> struct Overloaded : Fs... { using Fs::operator()...; };

// Each "visitor" is just a function with a visit. No accept() boilerplate.
double area(const Shape& s) {
    return visit(Overloaded{
        [](const Circle& c) { return numbers::pi * c.r * c.r; },
        [](const Rect& r) { return r.w * r.h; },
        [](const Triangle& t) { return 0.5 * t.b * t.h; },  // drop a case and this stops compiling: safe!
    }, s);
}

string fixed1(double v) {
    ostringstream os;
    os << fixed << setprecision(1) << v;
    return os.str();
}

string svg(const Shape& s) {
    return visit(Overloaded{
        [](const Circle& c) { return "<circle r='" + fixed1(c.r) + "'/>"; },
        [](const Rect& r) { return "<rect width='" + fixed1(r.w) + "' height='" + fixed1(r.h) + "'/>"; },
        [](const Triangle& t) { return "<polygon base='" + fixed1(t.b) + "'/>"; },
    }, s);
}

int main() {
    vector<Shape> shapes = {Circle{1}, Rect{2, 3}, Triangle{4, 5}};
    cout << fixed << setprecision(2);
    for (const Shape& s : shapes) cout << area(s) << " " << svg(s) << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

// A closed set of variants: the base constructor is private, so only the nested classes can derive.
abstract class Shape {
    private Shape() { }
    public sealed class Circle : Shape { public readonly double R; public Circle(double r) { R = r; } }
    public sealed class Rect : Shape { public readonly double W, H; public Rect(double w, double h) { W = w; H = h; } }
    public sealed class Triangle : Shape { public readonly double B, H; public Triangle(double b, double h) { B = b; H = h; } }
}

static class ShapeOps {
    // Each "visitor" is just a function with a type test per variant. No Accept() boilerplate.
    public static double Area(Shape s) {
        if (s is Shape.Circle c) return Math.PI * c.R * c.R;
        if (s is Shape.Rect r) return r.W * r.H;
        if (s is Shape.Triangle t) return 0.5 * t.B * t.H;
        throw new ArgumentException("unknown shape");   // unreachable: the set of variants is closed
    }
    public static string Svg(Shape s) {
        if (s is Shape.Circle c) return "<circle r='" + c.R.ToString("F1") + "'/>";
        if (s is Shape.Rect r) return "<rect width='" + r.W.ToString("F1") + "' height='" + r.H.ToString("F1") + "'/>";
        if (s is Shape.Triangle t) return "<polygon base='" + t.B.ToString("F1") + "'/>";
        throw new ArgumentException("unknown shape");
    }
}

class Program {
    static void Main() {
        List<Shape> shapes = new List<Shape> { new Shape.Circle(1), new Shape.Rect(2, 3), new Shape.Triangle(4, 5) };
        foreach (Shape s in shapes) Console.WriteLine(ShapeOps.Area(s).ToString("F2") + " " + ShapeOps.Svg(s));
    }
}` }
        ] }],
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
            [{ type: 'tree', label: 'Expression tree', arr: arr, hl: h }, STACK('call stack', calls.slice(), (function () { var x = {}; x[calls.length - 1] = 'cur'; return x; })()), CODE(t + '.accept', 'public <R> R accept(ExprVisitor<R> v) {\n  return v.visit' + t + '(this);\n}', { 2: 'cur' }, acceptAlt(t))]));
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
      { title: 'Files.walkFileTree — a JDK visitor', html: `<p>The JDK walks a directory tree and calls your <code>FileVisitor</code> at each event: <code>preVisitDirectory</code>, <code>visitFile</code>, <code>visitFileFailed</code>, <code>postVisitDirectory</code>. Counting files, deleting a tree or copying it are different visitors over the same walk.</p>`, code: { lang: 'java', code: `import java.nio.file.*;
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
System.out.println("bytes = " + total[0]);   // 11`, alt: [
          { lang: 'python', code: `import os
import tempfile

with tempfile.TemporaryDirectory() as folder:
    with open(os.path.join(folder, "a.txt"), "w") as f:
        f.write("hello")
    with open(os.path.join(folder, "b.log"), "w") as f:
        f.write("world!")
    total = 0
    for root, _dirs, files in os.walk(folder):  # os.walk is the library's tree walker
        for name in files:
            total += os.path.getsize(os.path.join(root, name))
    print("bytes =", total)  # 11` },
          { lang: 'ts', code: `import { mkdtempSync, writeFileSync, readdirSync, statSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "demo-"));
writeFileSync(join(dir, "a.txt"), "hello");
writeFileSync(join(dir, "b.log"), "world!");
let total = 0;
for (const name of readdirSync(dir, { recursive: true }) as string[]) { // the library walks the tree for us
  total += statSync(join(dir, name)).size;
}
console.log("bytes =", total); // 11
rmSync(dir, { recursive: true });` },
          { lang: 'cpp', code: `namespace fs = filesystem;
fs::path dir = fs::temp_directory_path() / "demo_tree";
fs::create_directories(dir);
ofstream(dir / "a.txt") << "hello";
ofstream(dir / "b.log") << "world!";
uintmax_t total = 0;
for (const auto& entry : fs::recursive_directory_iterator(dir))  // the library walks the tree for us
    if (entry.is_regular_file()) total += entry.file_size();
cout << "bytes = " << total << "\\n";  // 11
fs::remove_all(dir);` },
  { lang: 'csharp', code: `
using System;
using System.IO;

class Program {
    static void Main() {
        string dir = Path.Combine(Path.GetTempPath(), "demo-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(dir);
        File.WriteAllText(Path.Combine(dir, "a.txt"), "hello");
        File.WriteAllText(Path.Combine(dir, "b.log"), "world!");
        long total = 0;
        foreach (FileInfo f in new DirectoryInfo(dir).EnumerateFiles("*", SearchOption.AllDirectories)) total += f.Length;   // the framework walks, we visit
        Console.WriteLine("bytes = " + total);   // 11
        Directory.Delete(dir, true);
    }
}` }
        ] } },
      { title: 'Insurance / tax over product types', html: `<p>A cart contains <code>Book</code>, <code>Electronics</code> and <code>Food</code>. Finance asks for tax, logistics for shipping weight, marketing for loyalty points — three visitors. Each visitor keeps its rules together (all tax rules in <code>TaxVisitor</code>) instead of spreading <code>tax()</code>, <code>shippingWeight()</code>, <code>points()</code> across every product class.</p>` },
      { title: 'Choosing: polymorphism vs Visitor vs sealed switch', html: `<p><b>Methods on elements</b> (plain polymorphism): best when <i>types</i> are added often and operations are few and core to the type. <b>Visitor</b>: best when types are stable and operations are many and owned by different teams. <b>Sealed type + switch</b> (Java 21 sealed interfaces, TypeScript unions, C++ <code>std::variant</code>, Python <code>match</code>): same benefits as Visitor with far less code and compiler-checked exhaustiveness, but the operation logic sits in functions rather than objects (harder to pass around state or swap at runtime). This is the "expression problem" — no option makes both directions free.</p>` }
    ],
    deepDive: `<p><b>Double dispatch explained precisely:</b> Java and C++ do <i>single dispatch</i> on the receiver's runtime type and <i>static</i> overload resolution on argument types. <code>visitor.visit(expr)</code> with overloads <code>visit(Add)</code>/<code>visit(Mul)</code> would fail to compile (or pick <code>visit(Expr)</code>) because <code>expr</code> is statically <code>Expr</code>. <code>accept</code> converts the element's runtime type into a static type inside its own class (<code>this</code> is <code>Add</code> there), so the right overload is chosen at compile time in each <code>accept</code>.</p>
<p><b>Who traverses?</b> Options: the visitor (as in EvalVisitor recursing into children — flexible, e.g. short-circuiting), the elements' <code>accept</code> (always visits children — uniform, but less control), or an external iterator. Pick one and be consistent, or you visit nodes twice.</p>
<p><b>Encapsulation cost:</b> visitors need access to element data, so elements often expose getters they would otherwise hide. Records make this explicit and acceptable for data-centric trees.</p>
<p><b>Acyclic / default visitors:</b> to soften "new type breaks all visitors", provide an abstract base visitor with default implementations (e.g. <code>visitDiv</code> falls back to <code>visitDefault</code>) — but then the compiler no longer forces you to handle new types. Sealed + exhaustive switch keeps the safety; with <code>default</code> branches you lose it again.</p>
<p><b>Generic return types</b> (<code>ExprVisitor&lt;R&gt;</code>) avoid mutable accumulator fields and make visitors reusable and thread-safe; use <code>Void</code> visitors for side-effect passes. <b>Performance:</b> two virtual calls per node — negligible; deep trees may need an explicit stack instead of recursion.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI is great at generating the boilerplate that made Visitor painful (one <code>accept</code> per class, one <code>visitX</code> per type) — but in modern Java, Python, TypeScript and C++ you should often ask it for the <b>sealed type / union + switch</b> version instead, which is shorter and compiler-checked. AI tools that transform code (codemods, refactoring agents) themselves walk ASTs with visitors (e.g. JavaParser, OpenRewrite recipes) — knowing the pattern helps you review those recipes.</p>
<p><b>Where AI goes wrong:</b> it writes <code>instanceof</code> ladders with a silent <code>else</code>, uses overloads expecting runtime dispatch (the classic double-dispatch misunderstanding), or adds a <code>default</code> branch that hides unhandled new types. <b>What you own:</b> deciding which axis (types or operations) will change, and choosing polymorphism, Visitor or sealed switch accordingly.</p>`,
    problems: [{
      title: 'File System Analyzer (size, search, tree print)', level: 'Hard', tags: ['visitor', 'composite'], companies: ['Dropbox', 'Google', 'Box'],
      statement: `<p>A file system has <code>FileNode(name, sizeBytes)</code> and <code>DirNode(name, children)</code>. Product keeps asking for new operations: <b>total size</b>, <b>find all files with extension X</b>, <b>print an indented tree</b>, and next month "largest file", "count empty directories". Design so each new operation is a new class and the node classes never change. Every operation must handle nested directories of any depth.</p>`,
      constraints: `Up to 10<sup>5</sup> nodes, depth up to 100. The set of node types (file, directory) is stable; operations grow.`,
      example: `<p>root/{ a.txt(100), docs/{ b.md(50), c.txt(25) }, empty/{} }<br>size → ${H.c('g', '175')}; find ".txt" → ${H.c('g', '[root/a.txt, root/docs/c.txt]')}; tree print → root, ··a.txt, ··docs, ····b.md, ····c.txt, ··empty. Three operations, same two node classes.</p>`,
      brute: { why: `<p>Each operation is a static function with a type-check ladder (<code>if (n instanceof FileNode) … else if (n instanceof DirNode) …</code>, or <code>isinstance</code> in Python) and its own recursion. Five operations = five copies of the type check and traversal; adding a <code>SymlinkNode</code> means hunting through all of them — and forgetting one compiles fine and silently returns wrong results (the <code>else</code> swallows it).</p>`, code: { lang: 'java', code: `class NaiveFs {
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
}`, alt: [
                { lang: 'python', code: `
from dataclasses import dataclass, field

@dataclass
class FileN:
    name: str
    size: int

@dataclass
class DirN:
    name: str
    kids: list = field(default_factory=list)

class NaiveFs:
    @staticmethod
    def size(n):
        if isinstance(n, FileN): return n.size
        elif isinstance(n, DirN):
            s = 0
            for k in n.kids: s += NaiveFs.size(k)
            return s
        return 0                                    # silently ignores unknown types

    @staticmethod
    def find(n, ext, out):
        if isinstance(n, FileN):
            if n.name.endswith(ext): out.append(n.name)
        elif isinstance(n, DirN):
            for k in n.kids: NaiveFs.find(k, ext, out)   # traversal copy #2` },
                { lang: 'ts', code: `
class FileN { constructor(readonly name: string, readonly size: number) {} }
class DirN { constructor(readonly name: string, readonly kids: (FileN | DirN)[]) {} }
class NaiveFs {
    static size(n: unknown): number {
        if (n instanceof FileN) return n.size;
        else if (n instanceof DirN) { let s = 0; for (const k of n.kids) s += NaiveFs.size(k); return s; }
        return 0;                                   // silently ignores unknown types
    }
    static find(n: unknown, ext: string, out: string[]): void {
        if (n instanceof FileN) { if (n.name.endsWith(ext)) out.push(n.name); }
        else if (n instanceof DirN) for (const k of n.kids) NaiveFs.find(k, ext, out);   // traversal copy #2
    }
}` },
                { lang: 'cpp', code: `
struct Node { virtual ~Node() = default; };
struct FileN : Node { string name; long long size; FileN(string n, long long s) : name(n), size(s) {} };
struct DirN : Node { string name; vector<Node*> kids; DirN(string n) : name(n) {} };
struct NaiveFs {
    static long long size(Node* n) {
        if (auto* f = dynamic_cast<FileN*>(n)) return f->size;
        else if (auto* d = dynamic_cast<DirN*>(n)) { long long s = 0; for (Node* k : d->kids) s += size(k); return s; }
        return 0;                                   // silently ignores unknown types
    }
    static void find(Node* n, const string& ext, vector<string>& out) {
        if (auto* f = dynamic_cast<FileN*>(n)) { if (f->name.ends_with(ext)) out.push_back(f->name); }
        else if (auto* d = dynamic_cast<DirN*>(n)) for (Node* k : d->kids) find(k, ext, out);   // traversal copy #2
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

static class NaiveFs {
    public sealed class FileN { public readonly string Name; public readonly long Size; public FileN(string name, long size) { Name = name; Size = size; } }
    public sealed class DirN { public readonly string Name; public readonly List<object> Kids; public DirN(string name, List<object> kids) { Name = name; Kids = kids; } }
    public static long Size(object n) {
        if (n is FileN f) return f.Size;
        else if (n is DirN d) { long s = 0; foreach (object k in d.Kids) s += Size(k); return s; }
        return 0;                                   // silently ignores unknown types
    }
    public static void Find(object n, string ext, List<string> result) {
        if (n is FileN f) { if (f.Name.EndsWith(ext)) result.Add(f.Name); }
        else if (n is DirN d) foreach (object k in d.Kids) Find(k, ext, result);   // traversal copy #2
    }
}` }
              ] } },
      mcq: { q: 'Next quarter a new node type SymlinkNode is added. What is the cost with the Visitor design?', options: ['Add visitSymlink to the visitor interface; every existing visitor must implement it (the compiler lists them)', 'Nothing changes', 'Only the SymlinkNode class is added', 'All file and dir classes must change'], answer: 0, explain: 'Visitor makes new operations cheap and new element types expensive — but the compiler points to every visitor that must be updated, unlike instanceof chains that fail silently.' },
      hints: [`<p>Hint 1: Nodes are stable, operations grow → Visitor. Nodes get <code>accept(FsVisitor v)</code>; the visitor has <code>visitFile</code> and <code>visitDir</code>.</p>`, `<p>Hint 2: Let the visitor control traversal in <code>visitDir</code> (loop over children calling <code>child.accept(this)</code>), so each visitor can track depth or path, or stop early.</p>`, `<p>Hint 3: Track the current path with a <code>Deque&lt;String&gt;</code> (push on enter dir, pop on exit). Size visitor accumulates a long; find visitor collects paths; print visitor uses depth for indentation.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "175 [root/a.txt, root/docs/c.txt]\nroot/\n  a.txt (100)\n  docs/\n    b.md (50)\n    c.txt (25)\n  empty/\n0 [] [solo.txt]\n" }] },
      solution: {
        approach: `<p>Node classes (<code>FileNode</code>, <code>DirNode</code>) implement <code>FsNode.accept(FsVisitor)</code>. Each operation is a visitor: <code>SizeVisitor</code> sums file sizes; <code>FindVisitor</code> tracks the current path with a stack and collects matches (a file at the root is reported by its bare name); <code>TreePrinter</code> tracks depth. Visitors drive traversal in <code>visitDir</code>, so they share no traversal bugs with each other and can add path/depth tracking. Adding "largest file" is one more ~10-line class; node classes are untouched.</p>`,
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
        if (f.name().endsWith(ext)) found.add(path.isEmpty() ? f.name() : String.join("/", path) + "/" + f.name());
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
        FsNode empty = new DirNode("void", List.of()), solo = new FileNode("solo.txt", 7);
        SizeVisitor s2 = new SizeVisitor(); empty.accept(s2);
        FindVisitor f2 = new FindVisitor(".txt"); empty.accept(f2);
        FindVisitor f3 = new FindVisitor(".txt"); solo.accept(f3);
        System.out.println(s2.total + " " + f2.found + " " + f3.found);
    }
}`, alt: [
          { lang: 'python', code: `from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


class FsVisitor(ABC):
    @abstractmethod
    def visit_file(self, f: FileNode) -> None: ...

    @abstractmethod
    def visit_dir(self, d: DirNode) -> None: ...


class FsNode(ABC):
    name: str

    @abstractmethod
    def accept(self, v: FsVisitor) -> None: ...


@dataclass(frozen=True)
class FileNode(FsNode):
    name: str
    size: int

    def accept(self, v: FsVisitor) -> None:  # double dispatch: the node picks the visitor method
        v.visit_file(self)


@dataclass(frozen=True)
class DirNode(FsNode):
    name: str
    children: tuple[FsNode, ...] = ()

    def accept(self, v: FsVisitor) -> None:
        v.visit_dir(self)


class SizeVisitor(FsVisitor):
    def __init__(self):
        self.total = 0

    def visit_file(self, f: FileNode) -> None:
        self.total += f.size

    def visit_dir(self, d: DirNode) -> None:
        for c in d.children:
            c.accept(self)


class FindVisitor(FsVisitor):
    def __init__(self, ext: str):
        self._ext = ext
        self._path: list[str] = []
        self.found: list[str] = []

    def visit_file(self, f: FileNode) -> None:
        if f.name.endswith(self._ext):
            self.found.append("/".join([*self._path, f.name]))

    def visit_dir(self, d: DirNode) -> None:
        self._path.append(d.name)
        for c in d.children:
            c.accept(self)
        self._path.pop()


class TreePrinter(FsVisitor):
    def __init__(self):
        self._depth = 0
        self.lines: list[str] = []

    def visit_file(self, f: FileNode) -> None:
        self.lines.append("  " * self._depth + f"{f.name} ({f.size})")

    def visit_dir(self, d: DirNode) -> None:
        self.lines.append("  " * self._depth + d.name + "/")
        self._depth += 1
        for c in d.children:
            c.accept(self)
        self._depth -= 1


def show(names: list[str]) -> str:
    return "[" + ", ".join(names) + "]"


if __name__ == "__main__":
    root = DirNode("root", (
        FileNode("a.txt", 100),
        DirNode("docs", (FileNode("b.md", 50), FileNode("c.txt", 25))),
        DirNode("empty"),
    ))
    size = SizeVisitor()
    root.accept(size)
    find = FindVisitor(".txt")
    root.accept(find)
    tp = TreePrinter()
    root.accept(tp)
    print(size.total, show(find.found))
    print("\\n".join(tp.lines))
    empty, solo = DirNode("void"), FileNode("solo.txt", 7)
    s2, f2, f3 = SizeVisitor(), FindVisitor(".txt"), FindVisitor(".txt")
    empty.accept(s2)
    empty.accept(f2)
    solo.accept(f3)
    print(s2.total, show(f2.found), show(f3.found))` },
          { lang: 'ts', code: `interface FsVisitor {
  visitFile(f: FileNode): void;
  visitDir(d: DirNode): void;
}

interface FsNode {
  readonly name: string;
  accept(v: FsVisitor): void;
}

class FileNode implements FsNode {
  constructor(readonly name: string, readonly size: number) {}
  accept(v: FsVisitor): void { v.visitFile(this); } // double dispatch: the node picks the visitor method
}

class DirNode implements FsNode {
  constructor(readonly name: string, readonly children: readonly FsNode[] = []) {}
  accept(v: FsVisitor): void { v.visitDir(this); }
}

class SizeVisitor implements FsVisitor {
  total = 0;
  visitFile(f: FileNode): void { this.total += f.size; }
  visitDir(d: DirNode): void { for (const c of d.children) c.accept(this); }
}

class FindVisitor implements FsVisitor {
  private readonly path: string[] = [];
  readonly found: string[] = [];
  constructor(private readonly ext: string) {}
  visitFile(f: FileNode): void {
    if (f.name.endsWith(this.ext)) this.found.push([...this.path, f.name].join("/"));
  }
  visitDir(d: DirNode): void {
    this.path.push(d.name);
    for (const c of d.children) c.accept(this);
    this.path.pop();
  }
}

class TreePrinter implements FsVisitor {
  private depth = 0;
  readonly lines: string[] = [];
  visitFile(f: FileNode): void { this.lines.push("  ".repeat(this.depth) + \`\${f.name} (\${f.size})\`); }
  visitDir(d: DirNode): void {
    this.lines.push("  ".repeat(this.depth) + d.name + "/");
    this.depth++;
    for (const c of d.children) c.accept(this);
    this.depth--;
  }
}

const show = (names: string[]): string => "[" + names.join(", ") + "]";

const root = new DirNode("root", [
  new FileNode("a.txt", 100),
  new DirNode("docs", [new FileNode("b.md", 50), new FileNode("c.txt", 25)]),
  new DirNode("empty"),
]);
const size = new SizeVisitor(); root.accept(size);
const find = new FindVisitor(".txt"); root.accept(find);
const tp = new TreePrinter(); root.accept(tp);
console.log(size.total + " " + show(find.found));
console.log(tp.lines.join("\\n"));
const empty = new DirNode("void"), solo = new FileNode("solo.txt", 7);
const s2 = new SizeVisitor(), f2 = new FindVisitor(".txt"), f3 = new FindVisitor(".txt");
empty.accept(s2); empty.accept(f2); solo.accept(f3);
console.log(\`\${s2.total} \${show(f2.found)} \${show(f3.found)}\`);` },
          { lang: 'cpp', code: `class FileNode;
class DirNode;

class FsVisitor {
public:
    virtual ~FsVisitor() = default;
    virtual void visitFile(const FileNode& f) = 0;
    virtual void visitDir(const DirNode& d) = 0;
};

class FsNode {
public:
    virtual ~FsNode() = default;
    virtual void accept(FsVisitor& v) const = 0;
};

class FileNode : public FsNode {
public:
    FileNode(string name, long long size) : name_(std::move(name)), size_(size) {}
    const string& name() const { return name_; }
    long long size() const { return size_; }
    void accept(FsVisitor& v) const override { v.visitFile(*this); }  // double dispatch
private:
    string name_;
    long long size_;
};

class DirNode : public FsNode {
public:
    DirNode(string name, vector<unique_ptr<FsNode>> children = {})
        : name_(std::move(name)), children_(std::move(children)) {}
    const string& name() const { return name_; }
    const vector<unique_ptr<FsNode>>& children() const { return children_; }
    void accept(FsVisitor& v) const override { v.visitDir(*this); }
private:
    string name_;
    vector<unique_ptr<FsNode>> children_;  // the directory owns its subtree
};

class SizeVisitor : public FsVisitor {
public:
    long long total = 0;
    void visitFile(const FileNode& f) override { total += f.size(); }
    void visitDir(const DirNode& d) override { for (const auto& c : d.children()) c->accept(*this); }
};

class FindVisitor : public FsVisitor {
public:
    explicit FindVisitor(string ext) : ext(std::move(ext)) {}
    vector<string> found;
    void visitFile(const FileNode& f) override {
        const string& n = f.name();
        if (n.size() >= ext.size() && n.compare(n.size() - ext.size(), ext.size(), ext) == 0) {
            string full;
            for (const string& part : path) full += part + "/";
            found.push_back(full + n);
        }
    }
    void visitDir(const DirNode& d) override {
        path.push_back(d.name());
        for (const auto& c : d.children()) c->accept(*this);
        path.pop_back();
    }
private:
    string ext;
    vector<string> path;
};

class TreePrinter : public FsVisitor {
public:
    string out;
    void visitFile(const FileNode& f) override { out += string(depth * 2, ' ') + f.name() + " (" + to_string(f.size()) + ")\\n"; }
    void visitDir(const DirNode& d) override {
        out += string(depth * 2, ' ') + d.name() + "/\\n";
        depth++;
        for (const auto& c : d.children()) c->accept(*this);
        depth--;
    }
private:
    int depth = 0;
};

template <class... Nodes>
unique_ptr<DirNode> dir(string name, Nodes... kids) {
    vector<unique_ptr<FsNode>> children;
    (children.push_back(std::move(kids)), ...);
    return make_unique<DirNode>(std::move(name), std::move(children));
}

string show(const vector<string>& names) {
    string s = "[";
    for (size_t i = 0; i < names.size(); i++) s += (i ? ", " : "") + names[i];
    return s + "]";
}

int main() {
    auto root = dir("root",
        make_unique<FileNode>("a.txt", 100),
        dir("docs", make_unique<FileNode>("b.md", 50), make_unique<FileNode>("c.txt", 25)),
        dir("empty"));
    SizeVisitor size; root->accept(size);
    FindVisitor find(".txt"); root->accept(find);
    TreePrinter tp; root->accept(tp);
    cout << size.total << " " << show(find.found) << "\\n";
    cout << tp.out;
    auto empty = dir("void");
    FileNode solo("solo.txt", 7);
    SizeVisitor s2; FindVisitor f2(".txt"), f3(".txt");
    empty->accept(s2); empty->accept(f2); solo.accept(f3);
    cout << s2.total << " " << show(f2.found) << " " << show(f3.found) << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Text;

interface IFsVisitor { void VisitFile(FileNode f); void VisitDir(DirNode d); }
interface IFsNode { string Name { get; } void Accept(IFsVisitor v); }

sealed class FileNode : IFsNode {
    private readonly string name; public readonly long Size;
    public FileNode(string name, long size) { this.name = name; Size = size; }
    public string Name { get { return name; } }
    public void Accept(IFsVisitor v) { v.VisitFile(this); }
}
sealed class DirNode : IFsNode {
    private readonly string name; public readonly List<IFsNode> Children;
    public DirNode(string name, List<IFsNode> children) { this.name = name; Children = children; }
    public string Name { get { return name; } }
    public void Accept(IFsVisitor v) { v.VisitDir(this); }
}

class SizeVisitor : IFsVisitor {
    public long Total;
    public void VisitFile(FileNode f) { Total += f.Size; }
    public void VisitDir(DirNode d) { foreach (IFsNode c in d.Children) c.Accept(this); }
}

class FindVisitor : IFsVisitor {
    private readonly string ext; private readonly List<string> path = new List<string>();
    public readonly List<string> Found = new List<string>();
    public FindVisitor(string ext) { this.ext = ext; }
    public void VisitFile(FileNode f) {
        if (f.Name.EndsWith(ext)) Found.Add(path.Count == 0 ? f.Name : string.Join("/", path) + "/" + f.Name);
    }
    public void VisitDir(DirNode d) {
        path.Add(d.Name);
        foreach (IFsNode c in d.Children) c.Accept(this);
        path.RemoveAt(path.Count - 1);
    }
}

class TreePrinter : IFsVisitor {
    private int depth; public readonly StringBuilder Out = new StringBuilder();
    public void VisitFile(FileNode f) { Out.Append(new string(' ', 2 * depth)).Append(f.Name).Append(" (").Append(f.Size).Append(")\\n"); }
    public void VisitDir(DirNode d) {
        Out.Append(new string(' ', 2 * depth)).Append(d.Name).Append("/\\n");
        depth++;
        foreach (IFsNode c in d.Children) c.Accept(this);
        depth--;
    }
}

class Program {
    static string Show(List<string> l) { return "[" + string.Join(", ", l) + "]"; }
    static void Main() {
        IFsNode root = new DirNode("root", new List<IFsNode> {
            new FileNode("a.txt", 100),
            new DirNode("docs", new List<IFsNode> { new FileNode("b.md", 50), new FileNode("c.txt", 25) }),
            new DirNode("empty", new List<IFsNode>()) });
        SizeVisitor size = new SizeVisitor(); root.Accept(size);
        FindVisitor find = new FindVisitor(".txt"); root.Accept(find);
        TreePrinter tp = new TreePrinter(); root.Accept(tp);
        Console.WriteLine(size.Total + " " + Show(find.Found));
        Console.Write(tp.Out);
        IFsNode empty = new DirNode("void", new List<IFsNode>()), solo = new FileNode("solo.txt", 7);
        SizeVisitor s2 = new SizeVisitor(); empty.Accept(s2);
        FindVisitor f2 = new FindVisitor(".txt"); empty.Accept(f2);
        FindVisitor f3 = new FindVisitor(".txt"); solo.Accept(f3);
        Console.WriteLine(s2.Total + " " + Show(f2.Found) + " " + Show(f3.Found));
    }
}` }
        ],
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
${H.table(['Pattern', 'Problem it solves', 'Tell-tale words', 'Key shape'], [
  ['Strategy', 'Many ways to do one job, picked at runtime', 'pricing rules, payment methods, "pluggable"', 'context holds an interface; client sets it'],
  ['Observer', 'One change, many interested parties', 'notify, subscribe, alert, follow', 'subject keeps List&lt;Listener&gt;'],
  ['Command', 'Treat an action as data', 'undo/redo, queue, macro, log, retry', 'execute()/undo() + invoker stacks'],
  ['State', 'Behaviour depends on current mode', 'status, lifecycle, "cannot X after Y"', 'context delegates to state; states switch it'],
  ['Template Method', 'Same steps, a few differ', 'workflow, skeleton, duplicated sequence', 'final method in abstract base + hooks'],
  ['Chain of Resp.', 'Who handles it? pass it along', 'approval, escalate, middleware, filter', 'handler with next link'],
  ['Iterator', 'Walk a collection without its insides', 'traverse, next, paging, cursor', 'Iterable + hasNext()/next()'],
  ['Mediator', 'Many objects coordinate', 'chat room, tower, hub, dispatcher', 'colleagues know only the mediator'],
  ['Memento', 'Save and restore state privately', 'snapshot, checkpoint, rollback', 'originator creates opaque snapshot; caretaker stores'],
  ['Visitor', 'New operations over a fixed type set', 'export, AST, compute X for every element', 'accept(v) → v.visitX(this); or sealed type / union + switch']
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
}`, alt: [
          { lang: 'python', code: `import threading
from enum import Enum, auto
from typing import Callable, Optional


# Strategy: how shipping cost is computed
ShippingPolicy = Callable[[int], int]  # weight in grams -> cost

# Observer: who hears about status changes
OrderEvents = Callable[[str, str, str], None]  # (order_id, from, to)


# State: what each action means in each status (table-driven to stay short)
class Status(Enum):
    NEW = auto()
    PAID = auto()
    SHIPPED = auto()
    CANCELLED = auto()

    def on(self, action: str) -> Optional["Status"]:
        match self, action:
            case Status.NEW, "pay":
                return Status.PAID
            case Status.NEW, "cancel":
                return Status.CANCELLED
            case Status.PAID, "ship":
                return Status.SHIPPED
            case Status.PAID, "cancel":
                return Status.CANCELLED
            case _:
                return None  # SHIPPED, CANCELLED: terminal here


class OrderWorkflow:
    def __init__(self, order_id: str, shipping: ShippingPolicy):
        self._id = order_id
        self._status = Status.NEW
        self._shipping = shipping
        self._listeners: list[OrderEvents] = []
        self._undo_log: list[Callable[[], None]] = []  # Command: reversible steps
        self._lock = threading.RLock()

    def subscribe(self, listener: OrderEvents) -> None:
        self._listeners.append(listener)

    def act(self, action: str) -> None:
        with self._lock:
            nxt = self._status.on(action)
            if nxt is None:
                raise RuntimeError(f"cannot {action} in {self._status.name}")
            prev = self._status
            self._status = nxt
            self._undo_log.append(lambda: setattr(self, "_status", prev))  # command to revert
            for listener in list(self._listeners):
                listener(self._id, prev.name, nxt.name)

    def undo(self) -> None:
        with self._lock:
            if self._undo_log:
                self._undo_log.pop()()

    def quote(self, grams: int) -> int:
        return self._shipping(grams)

    @property
    def status(self) -> Status:
        return self._status


if __name__ == "__main__":
    o = OrderWorkflow("A1", lambda g: 40 + g // 100)  # strategy as a function
    o.subscribe(lambda id, f, t: print(f"email: {id} {f} -> {t}"))
    o.subscribe(lambda id, f, t: print(f"analytics: {t}"))
    o.act("pay")
    o.act("ship")
    try:
        o.act("cancel")
    except RuntimeError as e:
        print(e)
    o.undo()
    print(f"{o.status.name}, shipping quote {o.quote(2500)}")` },
          { lang: 'ts', code: `// Strategy: how shipping cost is computed
type ShippingPolicy = (weightGrams: number) => number;

// Observer: who hears about status changes
type OrderEvents = (orderId: string, from: Status, to: Status) => void;

// State: what each action means in each status (table-driven to stay short)
type Status = "NEW" | "PAID" | "SHIPPED" | "CANCELLED";
const TRANSITIONS: Record<Status, Partial<Record<string, Status>>> = {
  NEW: { pay: "PAID", cancel: "CANCELLED" },
  PAID: { ship: "SHIPPED", cancel: "CANCELLED" },
  SHIPPED: {}, // terminal here
  CANCELLED: {}, // terminal here
};

class OrderWorkflow {
  private status: Status = "NEW";
  private readonly listeners: OrderEvents[] = [];
  private readonly undoLog: (() => void)[] = []; // Command: reversible steps

  constructor(private readonly id: string, private readonly shipping: ShippingPolicy) {}

  subscribe(l: OrderEvents): void { this.listeners.push(l); }

  act(action: string): void {
    const next = TRANSITIONS[this.status][action];
    if (next === undefined) throw new Error(\`cannot \${action} in \${this.status}\`);
    const prev = this.status;
    this.status = next;
    this.undoLog.push(() => { this.status = prev; }); // command to revert
    for (const l of this.listeners) l(this.id, prev, next);
  }

  undo(): void { this.undoLog.pop()?.(); }
  quote(grams: number): number { return this.shipping(grams); }
  currentStatus(): Status { return this.status; }
}

const o = new OrderWorkflow("A1", (g) => 40 + Math.floor(g / 100)); // strategy as a function
o.subscribe((id, f, t) => console.log(\`email: \${id} \${f} -> \${t}\`));
o.subscribe((_id, _f, t) => console.log(\`analytics: \${t}\`));
o.act("pay"); o.act("ship");
try { o.act("cancel"); } catch (e) { console.log((e as Error).message); }
o.undo();
console.log(\`\${o.currentStatus()}, shipping quote \${o.quote(2500)}\`);` },
          { lang: 'cpp', code: `// Strategy: how shipping cost is computed
using ShippingPolicy = function<long long(long long weightGrams)>;

// State: what each action means in each status (table-driven to stay short)
enum class Status { NEW, PAID, SHIPPED, CANCELLED };

string name(Status s) {
    switch (s) {
        case Status::NEW: return "NEW";
        case Status::PAID: return "PAID";
        case Status::SHIPPED: return "SHIPPED";
        case Status::CANCELLED: return "CANCELLED";
    }
    return "?";
}

optional<Status> on(Status s, const string& action) {
    if (s == Status::NEW && action == "pay") return Status::PAID;
    if (s == Status::NEW && action == "cancel") return Status::CANCELLED;
    if (s == Status::PAID && action == "ship") return Status::SHIPPED;
    if (s == Status::PAID && action == "cancel") return Status::CANCELLED;
    return nullopt;  // SHIPPED, CANCELLED: terminal here
}

// Observer: who hears about status changes
using OrderEvents = function<void(const string& orderId, const string& from, const string& to)>;

class OrderWorkflow {
public:
    OrderWorkflow(string id, ShippingPolicy shipping) : id(std::move(id)), shipping(std::move(shipping)) {}

    void subscribe(OrderEvents l) { listeners.push_back(std::move(l)); }

    void act(const string& action) {
        lock_guard g(m);
        auto next = on(status_, action);
        if (!next) throw logic_error("cannot " + action + " in " + name(status_));
        Status prev = status_;
        status_ = *next;
        undoLog.push_back([this, prev] { status_ = prev; });  // command to revert
        for (auto& l : listeners) l(id, name(prev), name(*next));
    }

    void undo() {
        lock_guard g(m);
        if (undoLog.empty()) return;
        auto step = std::move(undoLog.back());
        undoLog.pop_back();
        step();
    }

    long long quote(long long grams) const { return shipping(grams); }
    Status status() const { return status_; }

private:
    string id;
    Status status_ = Status::NEW;
    ShippingPolicy shipping;
    vector<OrderEvents> listeners;
    vector<function<void()>> undoLog;  // Command: reversible steps
    recursive_mutex m;
};

int main() {
    OrderWorkflow o("A1", [](long long g) { return 40 + g / 100; });  // strategy as a lambda
    o.subscribe([](const string& id, const string& f, const string& t) { cout << "email: " << id << " " << f << " -> " << t << "\\n"; });
    o.subscribe([](const string&, const string&, const string& t) { cout << "analytics: " << t << "\\n"; });
    o.act("pay"); o.act("ship");
    try { o.act("cancel"); } catch (const logic_error& e) { cout << e.what() << "\\n"; }
    o.undo();
    cout << name(o.status()) << ", shipping quote " << o.quote(2500) << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

// Strategy: how shipping cost is computed
delegate long ShippingPolicy(long weightGrams);

// Observer: who hears about status changes
delegate void OrderEvents(string orderId, string from, string to);

// State: what each action means in each status (table-driven to stay short)
enum Status { NEW, PAID, SHIPPED, CANCELLED }
static class StatusExt {
    public static Status? On(this Status s, string action) {
        switch (s) {
            case Status.NEW: return action == "pay" ? Status.PAID : action == "cancel" ? Status.CANCELLED : (Status?)null;
            case Status.PAID: return action == "ship" ? Status.SHIPPED : action == "cancel" ? Status.CANCELLED : (Status?)null;
            default: return null;                                  // SHIPPED, CANCELLED: terminal here
        }
    }
}

class OrderWorkflow {
    private readonly string id; private Status status = Status.NEW;
    private readonly ShippingPolicy shipping;
    private readonly List<OrderEvents> listeners = new List<OrderEvents>();
    private readonly Stack<Action> undoLog = new Stack<Action>();          // Command: reversible steps
    private readonly object gate = new object();

    public OrderWorkflow(string id, ShippingPolicy shipping) { this.id = id; this.shipping = shipping; }
    public void Subscribe(OrderEvents l) { lock (gate) listeners.Add(l); }

    public void Act(string action) {
        lock (gate) {
            Status? next = status.On(action);
            if (next == null) throw new InvalidOperationException("cannot " + action + " in " + status);
            Status prev = status;
            status = next.Value;
            undoLog.Push(() => status = prev);                                 // command to revert
            foreach (OrderEvents l in listeners.ToArray()) l(id, prev.ToString(), next.Value.ToString());
        }
    }
    public void Undo() { lock (gate) { if (undoLog.Count > 0) undoLog.Pop()(); } }
    public long Quote(long grams) { return shipping(grams); }
    public Status CurrentStatus { get { return status; } }
}

class Program {
    static void Main() {
        OrderWorkflow o = new OrderWorkflow("A1", g => 40 + g / 100);         // strategy as lambda
        o.Subscribe((id, f, t) => Console.WriteLine("email: " + id + " " + f + " -> " + t));
        o.Subscribe((id, f, t) => Console.WriteLine("analytics: " + t));
        o.Act("pay"); o.Act("ship");
        try { o.Act("cancel"); } catch (InvalidOperationException e) { Console.WriteLine(e.Message); }
        o.Undo();
        Console.WriteLine(o.CurrentStatus + ", shipping quote " + o.Quote(2500));
    }
}` }
        ] }],
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
    example: `<p>[(Asha, ENG, 90, 2019), (Ben, OPS, 70, 2017), (Cy, ENG, 95, 2021)]<br>key = "salary" → ${H.c('g', 'Cy, Asha, Ben')}; key = "dept-then-salary" → ${H.c('g', 'Cy, Asha (ENG), Ben (OPS)')}; key = "age" → ${H.c('r', 'invalid-argument error: unknown sort key age')}.</p>`,
    brute: { why: `<p>A switch on the key with a hand-written bubble sort inside each case: four copies of an O(N²) loop, a new option means editing the switch, and a typo in one comparison only shows up for that option. The sorting <i>algorithm</i> and the <i>ordering rule</i> are welded together.</p>`, code: { lang: 'java', code: `class NaiveSorter {
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
}`, alt: [
              { lang: 'python', code: `
from dataclasses import dataclass

@dataclass
class Emp:
    name: str
    dept: str
    salary: int
    joined: int

class NaiveSorter:
    @staticmethod
    def sort(a, key):
        for i in range(len(a)):
            for j in range(len(a) - i - 1):
                if key == "salary": swap = a[j].salary < a[j + 1].salary      # rule mixed into the algorithm
                elif key == "name": swap = a[j].name > a[j + 1].name
                else: swap = False                                            # unknown keys silently ignored
                if swap: a[j], a[j + 1] = a[j + 1], a[j]` },
              { lang: 'ts', code: `
interface Emp { name: string; dept: string; salary: number; joined: number }

class NaiveSorter {
    static sort(a: Emp[], key: string): void {
        for (let i = 0; i < a.length; i++)
            for (let j = 0; j + 1 < a.length - i; j++) {
                let swap: boolean;
                switch (key) {                                  // rule mixed into the algorithm
                    case "salary": swap = a[j].salary < a[j + 1].salary; break;
                    case "name": swap = a[j].name > a[j + 1].name; break;
                    default: swap = false;                      // unknown keys silently ignored
                }
                if (swap) { const t = a[j]; a[j] = a[j + 1]; a[j + 1] = t; }
            }
    }
};` },
              { lang: 'cpp', code: `
struct Emp { string name, dept; int salary, joined; };

struct NaiveSorter {
    static void sort(vector<Emp>& a, const string& key) {
        for (size_t i = 0; i < a.size(); i++)
            for (size_t j = 0; j + 1 < a.size() - i; j++) {
                bool swp;
                if (key == "salary") swp = a[j].salary < a[j + 1].salary;      // rule mixed into the algorithm
                else if (key == "name") swp = a[j].name > a[j + 1].name;
                else swp = false;                                              // unknown keys silently ignored
                if (swp) swap(a[j], a[j + 1]);
            }
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

static class NaiveSorter {
    public sealed class Emp {
        public readonly string Name, Dept; public readonly int Salary, Joined;
        public Emp(string name, string dept, int salary, int joined) { Name = name; Dept = dept; Salary = salary; Joined = joined; }
    }
    public static void Sort(List<Emp> a, string key) {
        for (int i = 0; i < a.Count; i++)
            for (int j = 0; j + 1 < a.Count - i; j++) {
                bool swap;
                switch (key) {                                  // rule mixed into the algorithm
                    case "salary": swap = a[j].Salary < a[j + 1].Salary; break;
                    case "name": swap = string.CompareOrdinal(a[j].Name, a[j + 1].Name) > 0; break;
                    default: swap = false; break;               // unknown keys silently ignored
                }
                if (swap) { Emp t = a[j]; a[j] = a[j + 1]; a[j + 1] = t; }
            }
    }
}` }
            ] } },
    mcq: { q: 'In a sort that takes a comparison rule (Collections.sort(list, comparator), sorted(list, key=...), array.sort(compareFn)), which part is the Strategy?', options: ['The Comparator', 'The List', 'The sort algorithm (TimSort)', 'The Employee class'], answer: 0, explain: 'The sorting algorithm is the fixed context; the comparator is the interchangeable rule plugged into it.' },
    hints: [`<p>Hint 1: Separate "how to sort" (library TimSort, stable, O(N log N)) from "what order" (a Comparator).</p>`, `<p>Hint 2: A <code>Map&lt;String, Comparator&lt;Employee&gt;&gt;</code> registry; other teams call <code>register(key, comparator)</code>.</p>`, `<p>Hint 3: Build comparators with <code>Comparator.comparing(...).thenComparing(...)</code> and <code>.reversed()</code>; copy the list before sorting; throw on unknown keys.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "dept-then-salary: Cy Asha Ben\njoined: Ben Asha Cy\nname-desc: Cy Ben Asha\nsalary tie: Asha Dee\ninput untouched: Asha Ben Cy\nerror: unknown sort key age\n" }] },
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

    static String names(List<Employee> list) {
        return list.stream().map(Employee::name).collect(Collectors.joining(" "));
    }

    public static void main(String[] args) {
        List<Employee> es = List.of(new Employee("Asha", "ENG", 90, LocalDate.of(2019, 1, 1)),
                new Employee("Ben", "OPS", 70, LocalDate.of(2017, 5, 1)),
                new Employee("Cy", "ENG", 95, LocalDate.of(2021, 3, 1)));
        EmployeeSorter s = new EmployeeSorter();
        System.out.println("dept-then-salary: " + names(s.sort(es, "dept-then-salary")));
        System.out.println("joined: " + names(s.sort(es, "joined")));
        s.register("name-desc", Comparator.comparing(Employee::name).reversed());   // added by another team
        System.out.println("name-desc: " + names(s.sort(es, "name-desc")));
        List<Employee> tied = List.of(es.get(0), new Employee("Dee", "OPS", 90, LocalDate.of(2020, 2, 2)));
        System.out.println("salary tie: " + names(s.sort(tied, "salary")));          // stable: input order kept
        System.out.println("input untouched: " + names(es));
        try { s.sort(es, "age"); }
        catch (IllegalArgumentException e) { System.out.println("error: " + e.getMessage()); }
    }
}`, alt: [
          { lang: 'python', code: `from dataclasses import dataclass
from datetime import date
from typing import Any, Callable


@dataclass(frozen=True)
class Employee:
    name: str
    dept: str
    salary: int
    joined: date


@dataclass(frozen=True)
class SortRule:
    """A strategy: how to build the sort key, and whether to reverse."""
    key: Callable[[Employee], Any]
    reverse: bool = False


class EmployeeSorter:
    def __init__(self):
        self._strategies: dict[str, SortRule] = {}
        self.register("salary", lambda e: e.salary, reverse=True)
        self.register("name", lambda e: e.name)
        self.register("joined", lambda e: e.joined)
        self.register("dept-then-salary", lambda e: (e.dept, -e.salary))

    def register(self, key: str, sort_key: Callable[[Employee], Any], reverse: bool = False) -> None:
        self._strategies[key] = SortRule(sort_key, reverse)

    def sort(self, employees: list[Employee], key: str) -> list[Employee]:
        rule = self._strategies.get(key)
        if rule is None:
            raise ValueError(f"unknown sort key {key}")
        return sorted(employees, key=rule.key, reverse=rule.reverse)  # stable, new list, input untouched


def names(employees: list[Employee]) -> str:
    return " ".join(e.name for e in employees)


if __name__ == "__main__":
    es = [Employee("Asha", "ENG", 90, date(2019, 1, 1)),
          Employee("Ben", "OPS", 70, date(2017, 5, 1)),
          Employee("Cy", "ENG", 95, date(2021, 3, 1))]
    s = EmployeeSorter()
    print("dept-then-salary:", names(s.sort(es, "dept-then-salary")))
    print("joined:", names(s.sort(es, "joined")))
    s.register("name-desc", lambda e: e.name, reverse=True)  # added by another team
    print("name-desc:", names(s.sort(es, "name-desc")))
    tied = [es[0], Employee("Dee", "OPS", 90, date(2020, 2, 2))]
    print("salary tie:", names(s.sort(tied, "salary")))  # stable: input order kept
    print("input untouched:", names(es))
    try:
        s.sort(es, "age")
    except ValueError as e:
        print("error:", e)` },
          { lang: 'ts', code: `interface Employee {
  readonly name: string;
  readonly dept: string;
  readonly salary: number;
  readonly joined: Date;
}

type Comparator<T> = (a: T, b: T) => number;

class EmployeeSorter {
  private readonly strategies = new Map<string, Comparator<Employee>>();

  constructor() {
    this.register("salary", (a, b) => b.salary - a.salary);
    this.register("name", (a, b) => a.name.localeCompare(b.name));
    this.register("joined", (a, b) => a.joined.getTime() - b.joined.getTime());
    this.register("dept-then-salary", (a, b) => a.dept.localeCompare(b.dept) || b.salary - a.salary);
  }

  register(key: string, c: Comparator<Employee>): void { this.strategies.set(key, c); }

  sort(input: readonly Employee[], key: string): Employee[] {
    const c = this.strategies.get(key);
    if (c === undefined) throw new Error(\`unknown sort key \${key}\`);
    return [...input].sort(c); // copy first; Array.sort is stable
  }
}

const names = (list: readonly Employee[]): string => list.map((e) => e.name).join(" ");
const day = (iso: string): Date => new Date(iso + "T00:00:00Z");

const es: Employee[] = [
  { name: "Asha", dept: "ENG", salary: 90, joined: day("2019-01-01") },
  { name: "Ben", dept: "OPS", salary: 70, joined: day("2017-05-01") },
  { name: "Cy", dept: "ENG", salary: 95, joined: day("2021-03-01") },
];
const s = new EmployeeSorter();
console.log("dept-then-salary: " + names(s.sort(es, "dept-then-salary")));
console.log("joined: " + names(s.sort(es, "joined")));
s.register("name-desc", (a, b) => b.name.localeCompare(a.name)); // added by another team
console.log("name-desc: " + names(s.sort(es, "name-desc")));
const tied: Employee[] = [es[0], { name: "Dee", dept: "OPS", salary: 90, joined: day("2020-02-02") }];
console.log("salary tie: " + names(s.sort(tied, "salary"))); // stable: input order kept
console.log("input untouched: " + names(es));
try { s.sort(es, "age"); }
catch (e) { console.log("error: " + (e as Error).message); }` },
          { lang: 'cpp', code: `struct Employee {
    string name;
    string dept;
    int salary;
    chrono::year_month_day joined;
};

using Comparator = function<bool(const Employee&, const Employee&)>;  // "a goes before b"

class EmployeeSorter {
public:
    EmployeeSorter() {
        registerRule("salary", [](auto& a, auto& b) { return a.salary > b.salary; });
        registerRule("name", [](auto& a, auto& b) { return a.name < b.name; });
        registerRule("joined", [](auto& a, auto& b) { return a.joined < b.joined; });
        registerRule("dept-then-salary", [](auto& a, auto& b) {
            return a.dept != b.dept ? a.dept < b.dept : a.salary > b.salary;
        });
    }

    void registerRule(const string& key, Comparator c) { strategies[key] = std::move(c); }

    vector<Employee> sort(vector<Employee> input, const string& key) const {  // by value: caller's list untouched
        auto it = strategies.find(key);
        if (it == strategies.end()) throw invalid_argument("unknown sort key " + key);
        stable_sort(input.begin(), input.end(), it->second);  // stable O(N log N)
        return input;
    }

private:
    map<string, Comparator> strategies;
};

string names(const vector<Employee>& list) {
    string s;
    for (size_t i = 0; i < list.size(); i++) s += (i ? " " : "") + list[i].name;
    return s;
}

int main() {
    using namespace chrono;
    vector<Employee> es = {{"Asha", "ENG", 90, 2019y / 1 / 1},
                           {"Ben", "OPS", 70, 2017y / 5 / 1},
                           {"Cy", "ENG", 95, 2021y / 3 / 1}};
    EmployeeSorter s;
    cout << "dept-then-salary: " << names(s.sort(es, "dept-then-salary")) << "\\n";
    cout << "joined: " << names(s.sort(es, "joined")) << "\\n";
    s.registerRule("name-desc", [](auto& a, auto& b) { return a.name > b.name; });  // added by another team
    cout << "name-desc: " << names(s.sort(es, "name-desc")) << "\\n";
    vector<Employee> tied = {es[0], {"Dee", "OPS", 90, 2020y / 2 / 2}};
    cout << "salary tie: " << names(s.sort(tied, "salary")) << "\\n";  // stable: input order kept
    cout << "input untouched: " << names(es) << "\\n";
    try { s.sort(es, "age"); }
    catch (const invalid_argument& e) { cout << "error: " << e.what() << "\\n"; }
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

sealed class Employee {
    public readonly string Name, Dept; public readonly int Salary; public readonly DateTime Joined;
    public Employee(string name, string dept, int salary, DateTime joined) { Name = name; Dept = dept; Salary = salary; Joined = joined; }
}

class EmployeeSorter {
    private readonly Dictionary<string, Comparison<Employee>> strategies = new Dictionary<string, Comparison<Employee>>();

    public EmployeeSorter() {
        Register("salary", (a, b) => b.Salary.CompareTo(a.Salary));
        Register("name", (a, b) => string.CompareOrdinal(a.Name, b.Name));
        Register("joined", (a, b) => a.Joined.CompareTo(b.Joined));
        Register("dept-then-salary", (a, b) => { int c = string.CompareOrdinal(a.Dept, b.Dept); return c != 0 ? c : b.Salary.CompareTo(a.Salary); });
    }

    public void Register(string key, Comparison<Employee> c) { if (c == null) throw new ArgumentNullException("c"); strategies[key] = c; }

    public List<Employee> Sort(List<Employee> input, string key) {
        Comparison<Employee> c;
        if (!strategies.TryGetValue(key, out c)) throw new ArgumentException("unknown sort key " + key);
        Comparer<Employee> cmp = Comparer<Employee>.Create(c);
        return input.OrderBy(e => e, cmp).ToList();     // OrderBy is a stable O(N log N) sort; input untouched
    }

    public static string Names(List<Employee> list) {
        return string.Join(" ", list.Select(e => e.Name));
    }
}

class Program {
    static void Main() {
        List<Employee> es = new List<Employee> { new Employee("Asha", "ENG", 90, new DateTime(2019, 1, 1)),
                new Employee("Ben", "OPS", 70, new DateTime(2017, 5, 1)),
                new Employee("Cy", "ENG", 95, new DateTime(2021, 3, 1)) };
        EmployeeSorter s = new EmployeeSorter();
        Console.WriteLine("dept-then-salary: " + EmployeeSorter.Names(s.Sort(es, "dept-then-salary")));
        Console.WriteLine("joined: " + EmployeeSorter.Names(s.Sort(es, "joined")));
        s.Register("name-desc", (a, b) => string.CompareOrdinal(b.Name, a.Name));   // added by another team
        Console.WriteLine("name-desc: " + EmployeeSorter.Names(s.Sort(es, "name-desc")));
        List<Employee> tied = new List<Employee> { es[0], new Employee("Dee", "OPS", 90, new DateTime(2020, 2, 2)) };
        Console.WriteLine("salary tie: " + EmployeeSorter.Names(s.Sort(tied, "salary")));          // stable: input order kept
        Console.WriteLine("input untouched: " + EmployeeSorter.Names(es));
        try { s.Sort(es, "age"); }
        catch (ArgumentException e) { Console.WriteLine("error: " + e.Message); }
    }
}` }
        ],
      complexity: `<p>O(N log N) time, O(N) extra space for the copy. Registering a strategy: O(1).</p>`,
      followUps: ['Let users combine any two keys at runtime (compose comparators)', 'How would you expose the available keys to the UI?']
    }
  });

  practice.push({
    title: 'Traffic Light Controller', level: 'Easy', tags: ['state'], companies: ['Siemens', 'Bosch', 'Uber'],
    statement: `<p>A traffic light cycles <b>RED (30s) → GREEN (25s) → YELLOW (5s) → RED</b>. Events: <code>timerExpired()</code> moves to the next colour; <code>pedestrianButton()</code> during GREEN switches immediately to YELLOW (ignored in other states); <code>emergency()</code> from any state goes to <b>FLASHING_RED</b>; <code>resume()</code> from FLASHING_RED goes to RED (ignored elsewhere). Expose <code>color()</code> and <code>duration()</code> of the current state.</p>`,
    constraints: `Single light, events come from one controller thread. Adding a new state (e.g. GREEN_ARROW) should touch only the states that lead to it.`,
    example: `<p>Start RED → timer → ${H.c('g', 'GREEN')} → pedestrian → ${H.c('y', 'YELLOW')} → timer → ${H.c('r', 'RED')} → emergency → ${H.c('r', 'FLASHING_RED')} → timer → stays FLASHING_RED → resume → ${H.c('r', 'RED')}.</p>`,
    brute: { why: `<p>A colour string plus a switch inside each of the four event methods. 4 states × 4 events = 16 cases spread across 4 methods; a new state means editing all four; an unhandled case silently does nothing or does the wrong thing.</p>`, code: { lang: 'java', code: `class NaiveLight {
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
}`, alt: [
              { lang: 'python', code: `
class NaiveLight:
    def __init__(self): self.color = "RED"
    def timer_expired(self):
        match self.color:
            case "RED": self.color = "GREEN"
            case "GREEN": self.color = "YELLOW"
            case "YELLOW": self.color = "RED"
    def pedestrian_button(self):
        if self.color == "GREEN": self.color = "YELLOW"
    def emergency(self): self.color = "FLASHING_RED"
    def resume(self):
        if self.color == "FLASHING_RED": self.color = "RED"
    # duration()? another switch...` },
              { lang: 'ts', code: `
class NaiveLight {
    color = "RED";
    timerExpired(): void {
        switch (this.color) {
            case "RED": this.color = "GREEN"; break;
            case "GREEN": this.color = "YELLOW"; break;
            case "YELLOW": this.color = "RED"; break;
            default: break;
        }
    }
    pedestrianButton(): void { if (this.color === "GREEN") this.color = "YELLOW"; }
    emergency(): void { this.color = "FLASHING_RED"; }
    resume(): void { if (this.color === "FLASHING_RED") this.color = "RED"; }
    // duration()? another switch...
}` },
              { lang: 'cpp', code: `
class NaiveLight {
    string color = "RED";
public:
    void timerExpired() {
        if (color == "RED") color = "GREEN";
        else if (color == "GREEN") color = "YELLOW";
        else if (color == "YELLOW") color = "RED";
    }
    void pedestrianButton() { if (color == "GREEN") color = "YELLOW"; }
    void emergency() { color = "FLASHING_RED"; }
    void resume() { if (color == "FLASHING_RED") color = "RED"; }
    // duration()? another switch...
};` },
  { lang: 'csharp', code: `
using System;

class NaiveLight {
    public string Color = "RED";
    public void TimerExpired() {
        switch (Color) {
            case "RED": Color = "GREEN"; break;
            case "GREEN": Color = "YELLOW"; break;
            case "YELLOW": Color = "RED"; break;
            default: break;
        }
    }
    public void PedestrianButton() { if (Color == "GREEN") Color = "YELLOW"; }
    public void Emergency() { Color = "FLASHING_RED"; }
    public void Resume() { if (Color == "FLASHING_RED") Color = "RED"; }
    // Duration()? another switch...
}` }
            ] } },
    mcq: { q: 'Which state class should handle pedestrianButton() by changing to YELLOW?', options: ['GREEN only; other states inherit a "do nothing" default', 'Every state, with an if inside', 'The controller, with a switch', 'YELLOW'], answer: 0, explain: 'Only the state where the event matters overrides it. Defaults make other states ignore it safely.' },
    hints: [`<p>Hint 1: Each colour is a state with its own duration and its own reaction to each event.</p>`, `<p>Hint 2: An <code>enum Light</code> with constant-specific bodies is a compact State pattern: each constant overrides <code>onTimer()</code> etc. and returns the next state.</p>`, `<p>Hint 3: Default methods return <code>this</code> (ignore). <code>emergency()</code> is the same for all → implement once in the enum, not per constant.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "RED 30s\nGREEN 25s\nYELLOW 5s\nYELLOW 5s\nRED 30s\nRED 30s\nFLASHING_RED 0s\nFLASHING_RED 0s\nRED 30s\nRED 30s\n" }] },
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

    String show() { return color() + " " + duration() + "s"; }

    public static void main(String[] args) {
        TrafficController t = new TrafficController();
        System.out.println(t.show());                                          // RED 30s
        t.timerExpired();       System.out.println(t.show());                  // GREEN 25s
        t.pedestrianButton();   System.out.println(t.show());                  // YELLOW 5s
        t.pedestrianButton();   System.out.println(t.show());                  // ignored
        t.timerExpired();       System.out.println(t.show());                  // RED 30s
        t.pedestrianButton();   System.out.println(t.show());                  // ignored
        t.emergency();          System.out.println(t.show());                  // FLASHING_RED 0s
        t.timerExpired();       System.out.println(t.show());                  // stays
        t.resume();             System.out.println(t.show());                  // RED 30s
        t.resume();             System.out.println(t.show());                  // ignored
    }
}`, alt: [
          { lang: 'python', code: `from enum import Enum


class Light(Enum):
    RED = 30
    GREEN = 25
    YELLOW = 5
    FLASHING_RED = 0

    @property
    def seconds(self) -> int:
        return self.value

    def on_timer(self) -> "Light":
        match self:
            case Light.RED:
                return Light.GREEN
            case Light.GREEN:
                return Light.YELLOW
            case Light.YELLOW:
                return Light.RED
            case Light.FLASHING_RED:
                return self

    def on_pedestrian(self) -> "Light":
        return Light.YELLOW if self is Light.GREEN else self  # default: ignore

    def on_resume(self) -> "Light":
        return Light.RED if self is Light.FLASHING_RED else self  # default: ignore

    def on_emergency(self) -> "Light":
        return Light.FLASHING_RED  # same for every state


class TrafficController:
    def __init__(self):
        self._state = Light.RED

    def timer_expired(self) -> None:
        self._state = self._state.on_timer()

    def pedestrian_button(self) -> None:
        self._state = self._state.on_pedestrian()

    def emergency(self) -> None:
        self._state = self._state.on_emergency()

    def resume(self) -> None:
        self._state = self._state.on_resume()

    def color(self) -> str:
        return self._state.name

    def duration(self) -> int:
        return self._state.seconds

    def show(self) -> str:
        return f"{self.color()} {self.duration()}s"


if __name__ == "__main__":
    t = TrafficController()
    print(t.show())  # RED 30s
    t.timer_expired(); print(t.show())  # GREEN 25s
    t.pedestrian_button(); print(t.show())  # YELLOW 5s
    t.pedestrian_button(); print(t.show())  # ignored
    t.timer_expired(); print(t.show())  # RED 30s
    t.pedestrian_button(); print(t.show())  # ignored
    t.emergency(); print(t.show())  # FLASHING_RED 0s
    t.timer_expired(); print(t.show())  # stays
    t.resume(); print(t.show())  # RED 30s
    t.resume(); print(t.show())  # ignored` },
          { lang: 'ts', code: `type Light = "RED" | "GREEN" | "YELLOW" | "FLASHING_RED";

const SECONDS: Record<Light, number> = { RED: 30, GREEN: 25, YELLOW: 5, FLASHING_RED: 0 };

// switch on a union: the compiler flags a state that is not handled (the \`never\` check).
function onTimer(s: Light): Light {
  switch (s) {
    case "RED": return "GREEN";
    case "GREEN": return "YELLOW";
    case "YELLOW": return "RED";
    case "FLASHING_RED": return s;
    default: { const unreachable: never = s; return unreachable; }
  }
}
const onPedestrian = (s: Light): Light => (s === "GREEN" ? "YELLOW" : s); // default: ignore
const onResume = (s: Light): Light => (s === "FLASHING_RED" ? "RED" : s); // default: ignore
const onEmergency = (_s: Light): Light => "FLASHING_RED"; // same for every state

class TrafficController {
  private state: Light = "RED";
  timerExpired(): void { this.state = onTimer(this.state); }
  pedestrianButton(): void { this.state = onPedestrian(this.state); }
  emergency(): void { this.state = onEmergency(this.state); }
  resume(): void { this.state = onResume(this.state); }
  color(): string { return this.state; }
  duration(): number { return SECONDS[this.state]; }
  show(): string { return \`\${this.color()} \${this.duration()}s\`; }
}

const t = new TrafficController();
console.log(t.show()); // RED 30s
t.timerExpired(); console.log(t.show()); // GREEN 25s
t.pedestrianButton(); console.log(t.show()); // YELLOW 5s
t.pedestrianButton(); console.log(t.show()); // ignored
t.timerExpired(); console.log(t.show()); // RED 30s
t.pedestrianButton(); console.log(t.show()); // ignored
t.emergency(); console.log(t.show()); // FLASHING_RED 0s
t.timerExpired(); console.log(t.show()); // stays
t.resume(); console.log(t.show()); // RED 30s
t.resume(); console.log(t.show()); // ignored` },
          { lang: 'cpp', code: `enum class Light { RED, GREEN, YELLOW, FLASHING_RED };

string name(Light s) {
    switch (s) {
        case Light::RED: return "RED";
        case Light::GREEN: return "GREEN";
        case Light::YELLOW: return "YELLOW";
        case Light::FLASHING_RED: return "FLASHING_RED";
    }
    return "?";
}

int seconds(Light s) {
    switch (s) {
        case Light::RED: return 30;
        case Light::GREEN: return 25;
        case Light::YELLOW: return 5;
        case Light::FLASHING_RED: return 0;
    }
    return 0;
}

// No default branch: with -Wswitch the compiler flags a state that is not handled.
Light onTimer(Light s) {
    switch (s) {
        case Light::RED: return Light::GREEN;
        case Light::GREEN: return Light::YELLOW;
        case Light::YELLOW: return Light::RED;
        case Light::FLASHING_RED: return s;
    }
    return s;
}
Light onPedestrian(Light s) { return s == Light::GREEN ? Light::YELLOW : s; }       // default: ignore
Light onResume(Light s) { return s == Light::FLASHING_RED ? Light::RED : s; }       // default: ignore
Light onEmergency(Light) { return Light::FLASHING_RED; }                            // same for every state

class TrafficController {
public:
    void timerExpired() { state = onTimer(state); }
    void pedestrianButton() { state = onPedestrian(state); }
    void emergency() { state = onEmergency(state); }
    void resume() { state = onResume(state); }
    string color() const { return name(state); }
    int duration() const { return seconds(state); }
    string show() const { return color() + " " + to_string(duration()) + "s"; }
private:
    Light state = Light::RED;
};

int main() {
    TrafficController t;
    cout << t.show() << "\\n";  // RED 30s
    t.timerExpired(); cout << t.show() << "\\n";  // GREEN 25s
    t.pedestrianButton(); cout << t.show() << "\\n";  // YELLOW 5s
    t.pedestrianButton(); cout << t.show() << "\\n";  // ignored
    t.timerExpired(); cout << t.show() << "\\n";  // RED 30s
    t.pedestrianButton(); cout << t.show() << "\\n";  // ignored
    t.emergency(); cout << t.show() << "\\n";  // FLASHING_RED 0s
    t.timerExpired(); cout << t.show() << "\\n";  // stays
    t.resume(); cout << t.show() << "\\n";  // RED 30s
    t.resume(); cout << t.show() << "\\n";  // ignored
}` },
  { lang: 'csharp', code: `
using System;

// A type-safe enum: one subclass per state, a fixed set of shared instances.
abstract class Light {
    public static readonly Light RED = new RedLight(), GREEN = new GreenLight(), YELLOW = new YellowLight(), FLASHING_RED = new FlashingRedLight();

    public readonly int Seconds;
    private readonly string name;
    private Light(string name, int seconds) { this.name = name; Seconds = seconds; }
    public string Name { get { return name; } }
    public abstract Light OnTimer();
    public virtual Light OnPedestrian() { return this; }        // default: ignore
    public virtual Light OnResume() { return this; }            // default: ignore
    public Light OnEmergency() { return FLASHING_RED; }         // same for every state

    private sealed class RedLight : Light { public RedLight() : base("RED", 30) { } public override Light OnTimer() { return GREEN; } }
    private sealed class GreenLight : Light {
        public GreenLight() : base("GREEN", 25) { }
        public override Light OnTimer() { return YELLOW; } public override Light OnPedestrian() { return YELLOW; }
    }
    private sealed class YellowLight : Light { public YellowLight() : base("YELLOW", 5) { } public override Light OnTimer() { return RED; } }
    private sealed class FlashingRedLight : Light {
        public FlashingRedLight() : base("FLASHING_RED", 0) { }
        public override Light OnTimer() { return this; } public override Light OnResume() { return RED; }
    }
}

class TrafficController {
    private Light state = Light.RED;
    public void TimerExpired()     { state = state.OnTimer(); }
    public void PedestrianButton() { state = state.OnPedestrian(); }
    public void Emergency()        { state = state.OnEmergency(); }
    public void Resume()           { state = state.OnResume(); }
    public string Color() { return state.Name; }
    public int Duration() { return state.Seconds; }

    public string Show() { return Color() + " " + Duration() + "s"; }
}

class Program {
    static void Main() {
        TrafficController t = new TrafficController();
        Console.WriteLine(t.Show());                                           // RED 30s
        t.TimerExpired();       Console.WriteLine(t.Show());                   // GREEN 25s
        t.PedestrianButton();   Console.WriteLine(t.Show());                   // YELLOW 5s
        t.PedestrianButton();   Console.WriteLine(t.Show());                   // ignored
        t.TimerExpired();       Console.WriteLine(t.Show());                   // RED 30s
        t.PedestrianButton();   Console.WriteLine(t.Show());                   // ignored
        t.Emergency();          Console.WriteLine(t.Show());                   // FLASHING_RED 0s
        t.TimerExpired();       Console.WriteLine(t.Show());                   // stays
        t.Resume();             Console.WriteLine(t.Show());                   // RED 30s
        t.Resume();             Console.WriteLine(t.Show());                   // ignored
    }
}` }
        ],
      complexity: `<p>O(1) per event, O(1) memory. New state = new enum constant + overrides in states that lead to it.</p>`,
      followUps: ['Drive it with a real timer (a scheduled executor, threading.Timer, setTimeout) — where does scheduling live?', 'Two lights at an intersection must never both be GREEN — which pattern coordinates them? (Mediator)']
    }
  });

  practice.push({
    title: 'Peeking Iterator', level: 'Easy', tags: ['iterator', 'design'], companies: ['Google', 'Apple', 'Yahoo'],
    statement: `<p>Wrap an existing <code>Iterator&lt;Integer&gt;</code> in a <code>PeekingIterator</code> that supports <code>peek()</code> (return the next element without advancing), <code>next()</code> and <code>hasNext()</code>. You may not copy the whole underlying sequence (it may be huge or infinite).</p>`,
    constraints: `Up to 10<sup>6</sup> calls. All operations O(1). <code>next()</code>/<code>peek()</code> on an exhausted iterator throw <code>NoSuchElementException</code>.`,
    example: `<p>Underlying [1, 2, 3]: next → ${H.c('g', '1')}, peek → ${H.c('b', '2')}, next → ${H.c('g', '2')} (same value peek showed), next → ${H.c('g', '3')}, hasNext → ${H.c('r', 'false')}.</p>`,
    brute: { why: `<p>Drain the whole underlying iterator into a list in the constructor and keep an index. Peek is trivial, but memory becomes O(N), startup O(N), and it never terminates on an infinite stream (e.g. an iterator over a live event feed).</p>`, code: { lang: 'java', code: `class CopyingPeekingIterator {
    private final List<Integer> all = new ArrayList<>();
    private int i;
    CopyingPeekingIterator(Iterator<Integer> it) { while (it.hasNext()) all.add(it.next()); }   // O(N), hangs if infinite
    Integer peek() { return all.get(i); }
    Integer next() { return all.get(i++); }
    boolean hasNext() { return i < all.size(); }
}`, alt: [
              { lang: 'python', code: `
class CopyingPeekingIterator:
    def __init__(self, it):
        self._all = list(it)        # O(N), hangs if infinite
        self._i = 0
    def peek(self): return self._all[self._i]
    def next(self):
        self._i += 1
        return self._all[self._i - 1]
    def has_next(self): return self._i < len(self._all)` },
              { lang: 'ts', code: `
class CopyingPeekingIterator {
    private readonly all: number[] = [];
    private i = 0;
    constructor(it: Iterator<number>) {   // O(N), hangs if infinite
        for (let r = it.next(); !r.done; r = it.next()) this.all.push(r.value);
    }
    peek(): number { return this.all[this.i]; }
    next(): number { return this.all[this.i++]; }
    hasNext(): boolean { return this.i < this.all.length; }
}` },
              { lang: 'cpp', code: `
class CopyingPeekingIterator {
    vector<int> all;
    size_t i = 0;
public:
    CopyingPeekingIterator(function<optional<int>()> next) {   // O(N), hangs if infinite
        while (auto v = next()) all.push_back(*v);
    }
    int peek() { return all[i]; }
    int next() { return all[i++]; }
    bool hasNext() { return i < all.size(); }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class CopyingPeekingIterator {
    private readonly List<int> all = new List<int>();
    private int i;
    public CopyingPeekingIterator(IEnumerator<int> it) { while (it.MoveNext()) all.Add(it.Current); }   // O(N), hangs if infinite
    public int Peek() { return all[i]; }
    public int Next() { return all[i++]; }
    public bool HasNext() { return i < all.Count; }
}` }
            ] } },
    mcq: { q: 'What extra state does a lazy PeekingIterator need?', options: ['One cached "next" element plus a flag saying whether it is valid', 'A copy of all remaining elements', 'A stack', 'Nothing; call next() twice'], answer: 0, explain: 'Look ahead by exactly one element and remember it; next() returns the cached value and refills the cache.' },
    hints: [`<p>Hint 1: To peek you must take the element from the underlying iterator early — so remember it.</p>`, `<p>Hint 2: Fields: <code>Integer nextVal</code> and <code>boolean hasPeeked</code> (null can be a valid element, so do not use null as "empty").</p>`, `<p>Hint 3: peek(): if not cached, cache it. next(): if cached, return and clear; else delegate. hasNext(): cached || underlying.hasNext().</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "1 2 2 3 false\npeek: exhausted\nnext: exhausted\nx x x false\nfalse\n" }] },
      solution: {
      approach: `<p>Keep a one-element look-ahead buffer. <code>peek()</code> fills the buffer if empty and returns it without consuming; <code>next()</code> returns the buffer if filled (and clears it) or delegates to the wrapped iterator. A separate boolean distinguishes "no buffered element" from "buffered null". Implementing <code>Iterator&lt;T&gt;</code> generically makes it reusable. This is also a Decorator over an Iterator.</p>`,
      code: `class PeekingIterator<T> implements Iterator<T> {
    private final Iterator<T> it;
    private T buffered;
    private boolean hasBuffered;

    PeekingIterator(Iterator<T> it) { this.it = it; }

    T peek() {
        if (!hasBuffered) {
            if (!it.hasNext()) throw new NoSuchElementException("exhausted");
            buffered = it.next();
            hasBuffered = true;
        }
        return buffered;
    }

    @Override public T next() {
        if (hasBuffered) { hasBuffered = false; T v = buffered; buffered = null; return v; }
        if (!it.hasNext()) throw new NoSuchElementException("exhausted");
        return it.next();
    }

    @Override public boolean hasNext() { return hasBuffered || it.hasNext(); }

    public static void main(String[] args) {
        PeekingIterator<Integer> p = new PeekingIterator<>(List.of(1, 2, 3).iterator());
        System.out.println(p.next() + " " + p.peek() + " " + p.next() + " " + p.next() + " " + p.hasNext());
        try { p.peek(); } catch (NoSuchElementException e) { System.out.println("peek: " + e.getMessage()); }
        try { p.next(); } catch (NoSuchElementException e) { System.out.println("next: " + e.getMessage()); }
        PeekingIterator<String> one = new PeekingIterator<>(List.of("x").iterator());
        System.out.println(one.peek() + " " + one.peek() + " " + one.next() + " " + one.hasNext());   // peek does not consume
        System.out.println(new PeekingIterator<>(List.<Integer>of().iterator()).hasNext());
    }
}`, alt: [
          { lang: 'python', code: `from typing import Generic, Iterator, TypeVar

T = TypeVar("T")
_EMPTY = object()  # marks "nothing buffered" (None could be a real element)


class PeekingIterator(Generic[T]):
    def __init__(self, it: Iterator[T]):
        self._it = it
        self._buffered = _EMPTY

    def peek(self) -> T:
        if self._buffered is _EMPTY:
            try:
                self._buffered = next(self._it)
            except StopIteration:
                raise StopIteration("exhausted") from None
        return self._buffered  # type: ignore[return-value]

    def next(self) -> T:
        value = self.peek()  # fills the buffer, or raises when exhausted
        self._buffered = _EMPTY
        return value

    def has_next(self) -> bool:
        if self._buffered is not _EMPTY:
            return True
        try:
            self._buffered = next(self._it)
            return True
        except StopIteration:
            return False

    def __iter__(self) -> "PeekingIterator[T]":
        return self

    def __next__(self) -> T:
        return self.next()


if __name__ == "__main__":
    p = PeekingIterator(iter([1, 2, 3]))
    a = p.next(); b = p.peek(); c = p.next(); d = p.next()
    print(a, b, c, d, str(p.has_next()).lower())
    for action in (p.peek, p.next):
        try:
            action()
        except StopIteration as e:
            print(f"{action.__name__}: {e}")
    one = PeekingIterator(iter(["x"]))
    x1 = one.peek(); x2 = one.peek(); x3 = one.next()
    print(x1, x2, x3, str(one.has_next()).lower())  # peek does not consume
    print(str(PeekingIterator(iter([])).has_next()).lower())` },
          { lang: 'ts', code: `class PeekingIterator<T> {
  private buffered: IteratorResult<T> | null = null; // one element of look-ahead

  constructor(private readonly it: Iterator<T>) {}

  private fill(): IteratorResult<T> {
    if (this.buffered === null) this.buffered = this.it.next();
    return this.buffered;
  }

  peek(): T {
    const r = this.fill();
    if (r.done) throw new Error("exhausted");
    return r.value;
  }

  next(): T {
    const value = this.peek(); // fills the buffer, or throws when exhausted
    this.buffered = null;
    return value;
  }

  hasNext(): boolean { return !this.fill().done; }
}

const p = new PeekingIterator([1, 2, 3][Symbol.iterator]());
const a = p.next(), b = p.peek(), c = p.next(), d = p.next();
console.log(\`\${a} \${b} \${c} \${d} \${p.hasNext()}\`);
try { p.peek(); } catch (e) { console.log("peek: " + (e as Error).message); }
try { p.next(); } catch (e) { console.log("next: " + (e as Error).message); }
const one = new PeekingIterator(["x"][Symbol.iterator]());
const x1 = one.peek(), x2 = one.peek(), x3 = one.next();
console.log(\`\${x1} \${x2} \${x3} \${one.hasNext()}\`); // peek does not consume
console.log(new PeekingIterator([][Symbol.iterator]()).hasNext());` },
          { lang: 'cpp', code: `template <class T>
class PeekingIterator {
public:
    // \`pull\` hands out the next element, or nullopt when the source is finished.
    explicit PeekingIterator(function<optional<T>()> pull) : pull(std::move(pull)) {}

    const T& peek() {
        if (!buffered) {
            buffered = pull();
            if (!buffered) throw out_of_range("exhausted");
        }
        return *buffered;
    }

    T next() {
        T value = peek();  // fills the buffer, or throws when exhausted
        buffered.reset();
        return value;
    }

    bool hasNext() {
        if (!buffered) buffered = pull();
        return buffered.has_value();
    }

private:
    function<optional<T>()> pull;
    optional<T> buffered;
};

template <class T>
PeekingIterator<T> over(vector<T> items) {  // adapt a vector into a pull source
    auto data = make_shared<vector<T>>(std::move(items));
    auto pos = make_shared<size_t>(0);
    return PeekingIterator<T>([data, pos]() -> optional<T> {
        if (*pos == data->size()) return nullopt;
        return (*data)[(*pos)++];
    });
}

int main() {
    auto p = over<int>({1, 2, 3});
    int a = p.next(), b = p.peek(), c = p.next(), d = p.next();
    cout << boolalpha << a << " " << b << " " << c << " " << d << " " << p.hasNext() << "\\n";
    try { p.peek(); } catch (const out_of_range& e) { cout << "peek: " << e.what() << "\\n"; }
    try { p.next(); } catch (const out_of_range& e) { cout << "next: " << e.what() << "\\n"; }
    auto one = over<string>({"x"});
    string x1 = one.peek(), x2 = one.peek(), x3 = one.next();
    cout << x1 << " " << x2 << " " << x3 << " " << one.hasNext() << "\\n";  // peek does not consume
    cout << over<int>({}).hasNext() << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class PeekingIterator<T> {
    private readonly IEnumerator<T> it;
    private T buffered;
    private bool hasBuffered, exhausted;

    public PeekingIterator(IEnumerator<T> it) { this.it = it; }

    private bool Advance() {                       // pull one element into the buffer
        if (exhausted) return false;
        if (it.MoveNext()) { buffered = it.Current; hasBuffered = true; return true; }
        exhausted = true; return false;
    }

    public T Peek() {
        if (!hasBuffered && !Advance()) throw new InvalidOperationException("exhausted");
        return buffered;
    }

    public T Next() {
        if (!hasBuffered && !Advance()) throw new InvalidOperationException("exhausted");
        hasBuffered = false; T v = buffered; buffered = default(T); return v;
    }

    public bool HasNext() { return hasBuffered || Advance(); }
}

class Program {
    static string B(bool b) { return b.ToString().ToLower(); }
    static void Main() {
        PeekingIterator<int> p = new PeekingIterator<int>(new List<int> { 1, 2, 3 }.GetEnumerator());
        Console.WriteLine(p.Next() + " " + p.Peek() + " " + p.Next() + " " + p.Next() + " " + B(p.HasNext()));
        try { p.Peek(); } catch (InvalidOperationException e) { Console.WriteLine("peek: " + e.Message); }
        try { p.Next(); } catch (InvalidOperationException e) { Console.WriteLine("next: " + e.Message); }
        PeekingIterator<string> one = new PeekingIterator<string>(new List<string> { "x" }.GetEnumerator());
        Console.WriteLine(one.Peek() + " " + one.Peek() + " " + one.Next() + " " + B(one.HasNext()));   // peek does not consume
        Console.WriteLine(B(new PeekingIterator<int>(new List<int>().GetEnumerator()).HasNext()));
    }
}` }
        ],
      complexity: `<p>O(1) time per call, O(1) extra memory.</p>`,
      followUps: ['Generalise to peek(k) — look k ahead (use a small deque)', 'Use it to merge K sorted iterators with a heap']
    }
  });

  practice.push({
    title: 'Smart Light Remote with Undo', level: 'Easy', tags: ['command', 'undo'], companies: ['Amazon', 'Google', 'Philips'],
    statement: `<p>A remote has numbered slots. Each slot can be programmed with an action on a <code>Light</code> (brightness 0–100): <b>On</b> (100), <b>Off</b> (0), <b>Dim(level)</b>. <code>press(slot)</code> runs the action; <code>undo()</code> reverts the <b>most recent</b> press, restoring the exact previous brightness (multiple undos go further back). Slots can be re-programmed at runtime. The remote must not know what a light is.</p>`,
    constraints: `Up to 10 slots, history up to 100 presses (drop the oldest beyond that). Pressing an empty slot does nothing and is not recorded.`,
    example: `<p>Slot0=On, Slot1=Dim(30), Slot2=Off. press(0) → 100. press(1) → 30. press(2) → 0. undo → ${H.c('g', '30')}. undo → ${H.c('g', '100')}. undo → ${H.c('g', '0')} (initial). undo → ${H.c('m', 'nothing')}.</p>`,
    brute: { why: `<p>The remote stores slot numbers in an int array and switches on the button id to call <code>light.on()</code>, <code>light.dim(30)</code>… It remembers only <code>lastButton</code>, so undo is a second switch that guesses the previous brightness (wrong after Dim → Dim) and supports only one level of undo. The remote is welded to the Light class.</p>`, code: { lang: 'java', code: `class NaiveRemote {
    int brightness, lastButton = -1;
    void press(int button) {
        lastButton = button;
        switch (button) { case 0 -> brightness = 100; case 1 -> brightness = 30; case 2 -> brightness = 0; default -> { } }
    }
    void undo() {                                 // guesses: wrong after two dims, only one level
        switch (lastButton) { case 0 -> brightness = 0; case 1 -> brightness = 100; case 2 -> brightness = 100; default -> { } }
        lastButton = -1;
    }
}`, alt: [
              { lang: 'python', code: `
class NaiveRemote:
    def __init__(self): self.brightness = 0; self.last_button = -1
    def press(self, button):
        self.last_button = button
        match button:
            case 0: self.brightness = 100
            case 1: self.brightness = 30
            case 2: self.brightness = 0
    def undo(self):                                 # guesses: wrong after two dims, only one level
        match self.last_button:
            case 0: self.brightness = 0
            case 1: self.brightness = 100
            case 2: self.brightness = 100
        self.last_button = -1` },
              { lang: 'ts', code: `
class NaiveRemote {
    brightness = 0; lastButton = -1;
    press(button: number): void {
        this.lastButton = button;
        switch (button) { case 0: this.brightness = 100; break; case 1: this.brightness = 30; break; case 2: this.brightness = 0; break; }
    }
    undo(): void {                                 // guesses: wrong after two dims, only one level
        switch (this.lastButton) { case 0: this.brightness = 0; break; case 1: this.brightness = 100; break; case 2: this.brightness = 100; break; }
        this.lastButton = -1;
    }
}` },
              { lang: 'cpp', code: `
class NaiveRemote {
public:
    int brightness = 0, lastButton = -1;
    void press(int button) {
        lastButton = button;
        switch (button) { case 0: brightness = 100; break; case 1: brightness = 30; break; case 2: brightness = 0; break; }
    }
    void undo() {                                 // guesses: wrong after two dims, only one level
        switch (lastButton) { case 0: brightness = 0; break; case 1: brightness = 100; break; case 2: brightness = 100; break; }
        lastButton = -1;
    }
};` },
  { lang: 'csharp', code: `
using System;

class NaiveRemote {
    public int Brightness, LastButton = -1;
    public void Press(int button) {
        LastButton = button;
        switch (button) { case 0: Brightness = 100; break; case 1: Brightness = 30; break; case 2: Brightness = 0; break; default: break; }
    }
    public void Undo() {                          // guesses: wrong after two dims, only one level
        switch (LastButton) { case 0: Brightness = 0; break; case 1: Brightness = 100; break; case 2: Brightness = 100; break; default: break; }
        LastButton = -1;
    }
}` }
            ] } },
    mcq: { q: 'Dim(30) is pressed twice in a row, then undo twice. What must each command store to undo correctly?', options: ['The brightness just before it executed', 'The brightness it sets (30)', 'Nothing; Dim undoes to 100', 'The slot number'], answer: 0, explain: 'Undo restores the previous value. Each command instance must capture it at execute time, so every press needs its own command record.' },
    hints: [`<p>Hint 1: Make <code>interface Command { void execute(); void undo(); }</code>. The remote holds <code>Command[] slots</code>.</p>`, `<p>Hint 2: A slot holds a command <i>template</i>; each press must record its own "previous brightness". Either create a fresh command per press (a Supplier in the slot) or let the history store (command, previous value) pairs.</p>`, `<p>Hint 3: A <code>SetBrightness(light, target)</code> command covers On/Off/Dim. Bounded <code>ArrayDeque</code> for history.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "30 100 0\nempty slot recorded: false\nclamped 100\nrestored 0\nhistory kept 100\n" }] },
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
        r.press(5);                                  // empty slot: no-op, not recorded
        System.out.println("empty slot recorded: " + r.undo());
        r.program(3, () -> new SetBrightness(l, 150));
        r.press(3);
        System.out.println("clamped " + l.get());    // Light clamps to 100
        r.undo();
        System.out.println("restored " + l.get());   // exact previous value: 0
        for (int i = 0; i < 105; i++) r.press(i % 2);
        int undone = 0;
        while (r.undo()) undone++;
        System.out.println("history kept " + undone); // oldest 5 dropped
    }
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from collections import deque
from typing import Callable, Optional


class Light:
    def __init__(self):
        self._brightness = 0

    def set(self, b: int) -> None:
        self._brightness = max(0, min(100, b))

    def get(self) -> int:
        return self._brightness


class Command(ABC):
    @abstractmethod
    def execute(self) -> None: ...

    @abstractmethod
    def undo(self) -> None: ...


class SetBrightness(Command):
    def __init__(self, light: Light, target: int):
        self._light, self._target = light, target
        self._previous = 0

    def execute(self) -> None:
        self._previous = self._light.get()
        self._light.set(self._target)

    def undo(self) -> None:
        self._light.set(self._previous)


class Remote:
    def __init__(self):
        self._slots: list[Optional[Callable[[], Command]]] = [None] * 10
        self._history: deque[Command] = deque(maxlen=100)  # drops the oldest on overflow

    def program(self, slot: int, factory: Callable[[], Command]) -> None:
        self._slots[slot] = factory

    def press(self, slot: int) -> None:
        factory = self._slots[slot]
        if factory is None:  # empty slot: no-op, not recorded
            return
        cmd = factory()  # fresh command per press
        cmd.execute()
        self._history.append(cmd)

    def undo(self) -> bool:
        if not self._history:
            return False
        self._history.pop().undo()
        return True


if __name__ == "__main__":
    light = Light()
    r = Remote()
    r.program(0, lambda: SetBrightness(light, 100))
    r.program(1, lambda: SetBrightness(light, 30))
    r.program(2, lambda: SetBrightness(light, 0))
    r.press(0); r.press(1); r.press(2)
    seen = []
    while r.undo():
        seen.append(str(light.get()))
    print(" ".join(seen))  # 30 100 0
    r.press(5)  # empty slot: no-op, not recorded
    print("empty slot recorded:", str(r.undo()).lower())
    r.program(3, lambda: SetBrightness(light, 150))
    r.press(3)
    print("clamped", light.get())  # Light clamps to 100
    r.undo()
    print("restored", light.get())  # exact previous value: 0
    for i in range(105):
        r.press(i % 2)
    undone = 0
    while r.undo():
        undone += 1
    print("history kept", undone)  # oldest 5 dropped` },
          { lang: 'ts', code: `class Light {
  private brightness = 0;
  set(b: number): void { this.brightness = Math.max(0, Math.min(100, b)); }
  get(): number { return this.brightness; }
}

interface Command { execute(): void; undo(): void; }

class SetBrightness implements Command {
  private previous = 0;
  constructor(private readonly light: Light, private readonly target: number) {}
  execute(): void { this.previous = this.light.get(); this.light.set(this.target); }
  undo(): void { this.light.set(this.previous); }
}

class Remote {
  private static readonly MAX_HISTORY = 100;
  private readonly slots: (() => Command)[] = new Array(10); // holes = empty slots
  private readonly history: Command[] = [];

  program(slot: number, factory: () => Command): void { this.slots[slot] = factory; }

  press(slot: number): void {
    const factory = this.slots[slot];
    if (factory === undefined) return; // empty slot: no-op, not recorded
    const c = factory(); // fresh command per press
    c.execute();
    this.history.push(c);
    if (this.history.length > Remote.MAX_HISTORY) this.history.shift(); // drop the oldest
  }

  undo(): boolean {
    const c = this.history.pop();
    if (c === undefined) return false;
    c.undo();
    return true;
  }
}

const light = new Light();
const r = new Remote();
r.program(0, () => new SetBrightness(light, 100));
r.program(1, () => new SetBrightness(light, 30));
r.program(2, () => new SetBrightness(light, 0));
r.press(0); r.press(1); r.press(2);
const seen: number[] = [];
while (r.undo()) seen.push(light.get());
console.log(seen.join(" ")); // 30 100 0
r.press(5); // empty slot: no-op, not recorded
console.log("empty slot recorded: " + r.undo());
r.program(3, () => new SetBrightness(light, 150));
r.press(3);
console.log("clamped " + light.get()); // Light clamps to 100
r.undo();
console.log("restored " + light.get()); // exact previous value: 0
for (let i = 0; i < 105; i++) r.press(i % 2);
let undone = 0;
while (r.undo()) undone++;
console.log("history kept " + undone); // oldest 5 dropped` },
          { lang: 'cpp', code: `class Light {
public:
    void set(int b) { brightness = max(0, min(100, b)); }
    int get() const { return brightness; }
private:
    int brightness = 0;
};

class Command {
public:
    virtual ~Command() = default;
    virtual void execute() = 0;
    virtual void undo() = 0;
};

class SetBrightness : public Command {
public:
    SetBrightness(Light& light, int target) : light(light), target(target) {}
    void execute() override { previous = light.get(); light.set(target); }
    void undo() override { light.set(previous); }
private:
    Light& light;
    int target;
    int previous = 0;
};

class Remote {
public:
    using Factory = function<unique_ptr<Command>()>;

    void program(size_t slot, Factory factory) { slots.at(slot) = std::move(factory); }

    void press(size_t slot) {
        const Factory& factory = slots.at(slot);
        if (!factory) return;  // empty slot: no-op, not recorded
        auto c = factory();    // fresh command per press
        c->execute();
        history.push_back(std::move(c));
        if (history.size() > MAX_HISTORY) history.pop_front();  // drop the oldest
    }

    bool undo() {
        if (history.empty()) return false;
        history.back()->undo();
        history.pop_back();
        return true;
    }

private:
    static constexpr size_t MAX_HISTORY = 100;
    vector<Factory> slots = vector<Factory>(10);
    deque<unique_ptr<Command>> history;
};

int main() {
    Light light;
    Remote r;
    r.program(0, [&] { return make_unique<SetBrightness>(light, 100); });
    r.program(1, [&] { return make_unique<SetBrightness>(light, 30); });
    r.program(2, [&] { return make_unique<SetBrightness>(light, 0); });
    r.press(0); r.press(1); r.press(2);
    string seen;
    while (r.undo()) seen += (seen.empty() ? "" : " ") + to_string(light.get());
    cout << seen << "\\n";  // 30 100 0
    r.press(5);  // empty slot: no-op, not recorded
    cout << boolalpha << "empty slot recorded: " << r.undo() << "\\n";
    r.program(3, [&] { return make_unique<SetBrightness>(light, 150); });
    r.press(3);
    cout << "clamped " << light.get() << "\\n";  // Light clamps to 100
    r.undo();
    cout << "restored " << light.get() << "\\n";  // exact previous value: 0
    for (int i = 0; i < 105; i++) r.press(i % 2);
    int undone = 0;
    while (r.undo()) undone++;
    cout << "history kept " << undone << "\\n";  // oldest 5 dropped
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Text;

class Light {
    private int brightness;
    public void Set(int b) { brightness = Math.Max(0, Math.Min(100, b)); }
    public int Get() { return brightness; }
}

interface ICommand { void Execute(); void Undo(); }

class SetBrightness : ICommand {
    private readonly Light light; private readonly int target; private int previous;
    public SetBrightness(Light light, int target) { this.light = light; this.target = target; }
    public void Execute() { previous = light.Get(); light.Set(target); }
    public void Undo() { light.Set(previous); }
}

class Remote {
    private readonly Func<ICommand>[] slots = new Func<ICommand>[10];
    private readonly LinkedList<ICommand> history = new LinkedList<ICommand>();   // front = newest

    public void Program(int slot, Func<ICommand> factory) { slots[slot] = factory; }

    public void Press(int slot) {
        Func<ICommand> f = slots[slot];
        if (f == null) return;                       // empty slot: no-op, not recorded
        ICommand c = f();                            // fresh command per press
        c.Execute();
        history.AddFirst(c);
        if (history.Count > 100) history.RemoveLast();
    }
    public bool Undo() {
        if (history.Count == 0) return false;
        ICommand c = history.First.Value; history.RemoveFirst();
        c.Undo();
        return true;
    }
}

class Program {
    static void Main() {
        Light l = new Light();
        Remote r = new Remote();
        r.Program(0, () => new SetBrightness(l, 100));
        r.Program(1, () => new SetBrightness(l, 30));
        r.Program(2, () => new SetBrightness(l, 0));
        r.Press(0); r.Press(1); r.Press(2);
        StringBuilder sb = new StringBuilder();
        while (r.Undo()) sb.Append(l.Get()).Append(' ');
        Console.WriteLine(sb.ToString().Trim());     // 30 100 0
        r.Press(5);                                  // empty slot: no-op, not recorded
        Console.WriteLine("empty slot recorded: " + r.Undo().ToString().ToLower());
        r.Program(3, () => new SetBrightness(l, 150));
        r.Press(3);
        Console.WriteLine("clamped " + l.Get());     // Light clamps to 100
        r.Undo();
        Console.WriteLine("restored " + l.Get());    // exact previous value: 0
        for (int i = 0; i < 105; i++) r.Press(i % 2);
        int undone = 0;
        while (r.Undo()) undone++;
        Console.WriteLine("history kept " + undone); // oldest 5 dropped
    }
}` }
        ],
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
    brute: { why: `<p>A single <code>log()</code> method with <code>if (level &gt;= INFO) writeFile(); if (level == ERROR) page();</code>. Adding a Slack handler or changing thresholds edits the logger; a pager exception aborts the log call; and handlers cannot be configured per environment.</p>`, code: { lang: 'java', code: `class NaiveLogger {
    final List<String> file = new ArrayList<>();
    void log(int level, String msg) {         // 0=DEBUG 1=INFO 2=WARN 3=ERROR
        System.out.println(msg);
        if (level >= 1) file.add(msg);
        if (level >= 3) throw new RuntimeException("pager down");   // breaks everything after it
    }
}`, alt: [
              { lang: 'python', code: `
class NaiveLogger:
    def __init__(self): self.file = []
    def log(self, level, msg):         # 0=DEBUG 1=INFO 2=WARN 3=ERROR
        print(msg)
        if level >= 1: self.file.append(msg)
        if level >= 3: raise RuntimeError("pager down")   # breaks everything after it` },
              { lang: 'ts', code: `
class NaiveLogger {
    readonly file: string[] = [];
    log(level: number, msg: string): void {         // 0=DEBUG 1=INFO 2=WARN 3=ERROR
        console.log(msg);
        if (level >= 1) this.file.push(msg);
        if (level >= 3) throw new Error("pager down");   // breaks everything after it
    }
}` },
              { lang: 'cpp', code: `
class NaiveLogger {
public:
    vector<string> file;
    void log(int level, const string& msg) {         // 0=DEBUG 1=INFO 2=WARN 3=ERROR
        cout << msg << "\\n";
        if (level >= 1) file.push_back(msg);
        if (level >= 3) throw runtime_error("pager down");   // breaks everything after it
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class NaiveLogger {
    public readonly List<string> File = new List<string>();
    public void Log(int level, string msg) {         // 0=DEBUG 1=INFO 2=WARN 3=ERROR
        Console.WriteLine(msg);
        if (level >= 1) File.Add(msg);
        if (level >= 3) throw new Exception("pager down");   // breaks everything after it
    }
}` }
            ] } },
    mcq: { q: 'In this logger, why does every handler call next even after handling?', options: ['Pipeline semantics: several handlers may each act on the same message', 'Because the first handler cannot write', 'To save memory', 'It is a bug; CoR must stop at the first handler'], answer: 0, explain: 'Chain of Responsibility has two flavours. Approvals stop at the first handler; logging is a filter pipeline where many handlers act.' },
    hints: [`<p>Hint 1: <code>enum Level</code> with ordinal comparison. Abstract <code>LogHandler</code> with <code>minLevel</code>, <code>next</code>, and a final <code>handle()</code>.</p>`, `<p>Hint 2: <code>handle()</code>: if level ≥ min, try { write } catch (RuntimeException) { record failure }; then if next != null, next.handle().</p>`, `<p>Hint 3: Cheap filtering: the Logger can store the lowest min level of the chain and return early. Use a thread-safe list for the file handler.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "[console] DEBUG cache miss\n[console] WARN slow query\n[console] ERROR db down\n[pager] waking on-call: db down\nfile has [WARN slow query, ERROR db down]\nBrokenHandler failed: disk full\n[pager] waking on-call: x\nfile2 has [ERROR x]\nfile2 has [ERROR x]\n" }] },
      solution: {
      approach: `<p>Each handler is a link with its own minimum level. The base class fixes the walking logic (Template Method inside CoR): check level → write (isolated in try/catch) → forward. The logger only knows the head of the chain plus a pre-computed global minimum, so messages that no handler wants are dropped in O(1). Chains are assembled by configuration code before the logger is built, because the minimum is computed once when the logger is created.</p>`,
      code: `enum Level { DEBUG, INFO, WARN, ERROR }

abstract class LogHandler {
    private final Level min; private LogHandler next;
    LogHandler(Level min) { this.min = min; }
    LogHandler then(LogHandler n) { this.next = n; return n; }
    Level min() { return next == null ? min : (min.compareTo(next.min()) < 0 ? min : next.min()); }

    final void handle(Level level, String msg) {
        if (level.compareTo(min) >= 0) {
            try { write(level, msg); }
            catch (RuntimeException e) { System.out.println(getClass().getSimpleName() + " failed: " + e.getMessage()); }
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

class BrokenHandler extends LogHandler {
    BrokenHandler() { super(Level.INFO); }
    protected void write(Level l, String m) { throw new IllegalStateException("disk full"); }
}

class Logger {
    private final LogHandler head; private final Level min;
    Logger(LogHandler head) { this.head = head; this.min = head.min(); }   // build the chain first, then the Logger
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
        // a failing handler must not stop the rest of the pipeline
        FileHandler file2 = new FileHandler();
        file2.then(new BrokenHandler()).then(new PagerHandler());
        new Logger(file2).log(Level.ERROR, "x");
        System.out.println("file2 has " + file2.lines);
        // nobody wants DEBUG here: dropped before any handler runs
        new Logger(file2).log(Level.DEBUG, "ignored");
        System.out.println("file2 has " + file2.lines);
    }
}`, alt: [
          { lang: 'python', code: `from __future__ import annotations

import threading
from abc import ABC, abstractmethod
from enum import IntEnum


class Level(IntEnum):  # ordered, so DEBUG < INFO < WARN < ERROR
    DEBUG = 0
    INFO = 1
    WARN = 2
    ERROR = 3


class LogHandler(ABC):
    def __init__(self, minimum: Level):
        self._min = minimum
        self._next: LogHandler | None = None

    def then(self, nxt: LogHandler) -> LogHandler:
        self._next = nxt
        return nxt

    def min(self) -> Level:
        return self._min if self._next is None else min(self._min, self._next.min())

    def handle(self, level: Level, msg: str) -> None:  # fixed walking logic: do not override
        if level >= self._min:
            try:
                self.write(level, msg)
            except Exception as e:
                print(f"{type(self).__name__} failed: {e}")
        if self._next is not None:
            self._next.handle(level, msg)  # pipeline: always forward

    @abstractmethod
    def write(self, level: Level, msg: str) -> None: ...


class ConsoleHandler(LogHandler):
    def __init__(self):
        super().__init__(Level.DEBUG)

    def write(self, level: Level, msg: str) -> None:
        print(f"[console] {level.name} {msg}")


class FileHandler(LogHandler):
    def __init__(self):
        super().__init__(Level.INFO)
        self.lines: list[str] = []
        self._lock = threading.Lock()

    def write(self, level: Level, msg: str) -> None:
        with self._lock:
            self.lines.append(f"{level.name} {msg}")


class PagerHandler(LogHandler):
    def __init__(self):
        super().__init__(Level.ERROR)

    def write(self, level: Level, msg: str) -> None:
        print(f"[pager] waking on-call: {msg}")


class BrokenHandler(LogHandler):
    def __init__(self):
        super().__init__(Level.INFO)

    def write(self, level: Level, msg: str) -> None:
        raise RuntimeError("disk full")


class Logger:
    def __init__(self, head: LogHandler):  # build the chain first, then the Logger
        self._head = head
        self._min = head.min()

    def log(self, level: Level, msg: str) -> None:
        if level < self._min:  # nobody wants it: O(1) drop
            return
        self._head.handle(level, msg)


def show(lines: list[str]) -> str:
    return "[" + ", ".join(lines) + "]"


if __name__ == "__main__":
    console = ConsoleHandler()
    file = FileHandler()
    console.then(file).then(PagerHandler())
    log = Logger(console)
    log.log(Level.DEBUG, "cache miss")
    log.log(Level.WARN, "slow query")
    log.log(Level.ERROR, "db down")
    print("file has", show(file.lines))
    # a failing handler must not stop the rest of the pipeline
    file2 = FileHandler()
    file2.then(BrokenHandler()).then(PagerHandler())
    Logger(file2).log(Level.ERROR, "x")
    print("file2 has", show(file2.lines))
    # nobody wants DEBUG here: dropped before any handler runs
    Logger(file2).log(Level.DEBUG, "ignored")
    print("file2 has", show(file2.lines))` },
          { lang: 'ts', code: `enum Level { DEBUG, INFO, WARN, ERROR }

abstract class LogHandler {
  private next: LogHandler | null = null;

  constructor(private readonly minLevel: Level) {}

  then(n: LogHandler): LogHandler {
    this.next = n;
    return n;
  }

  min(): Level {
    return this.next === null ? this.minLevel : Math.min(this.minLevel, this.next.min());
  }

  // Fixed walking logic: subclasses implement write() only.
  handle(level: Level, msg: string): void {
    if (level >= this.minLevel) {
      try { this.write(level, msg); }
      catch (e) { console.log(\`\${this.constructor.name} failed: \${(e as Error).message}\`); }
    }
    this.next?.handle(level, msg); // pipeline: always forward
  }

  protected abstract write(level: Level, msg: string): void;
}

class ConsoleHandler extends LogHandler {
  constructor() { super(Level.DEBUG); }
  protected write(l: Level, m: string): void { console.log(\`[console] \${Level[l]} \${m}\`); }
}

class FileHandler extends LogHandler {
  readonly lines: string[] = [];
  constructor() { super(Level.INFO); }
  protected write(l: Level, m: string): void { this.lines.push(\`\${Level[l]} \${m}\`); }
}

class PagerHandler extends LogHandler {
  constructor() { super(Level.ERROR); }
  protected write(_l: Level, m: string): void { console.log(\`[pager] waking on-call: \${m}\`); }
}

class BrokenHandler extends LogHandler {
  constructor() { super(Level.INFO); }
  protected write(_l: Level, _m: string): void { throw new Error("disk full"); }
}

class Logger {
  private readonly min: Level;
  constructor(private readonly head: LogHandler) { this.min = head.min(); } // build the chain first, then the Logger
  log(level: Level, msg: string): void {
    if (level < this.min) return; // nobody wants it: O(1) drop
    this.head.handle(level, msg);
  }
}

const show = (lines: string[]): string => "[" + lines.join(", ") + "]";

const consoleH = new ConsoleHandler();
const file = new FileHandler();
consoleH.then(file).then(new PagerHandler());
const log = new Logger(consoleH);
log.log(Level.DEBUG, "cache miss");
log.log(Level.WARN, "slow query");
log.log(Level.ERROR, "db down");
console.log("file has " + show(file.lines));
// a failing handler must not stop the rest of the pipeline
const file2 = new FileHandler();
file2.then(new BrokenHandler()).then(new PagerHandler());
new Logger(file2).log(Level.ERROR, "x");
console.log("file2 has " + show(file2.lines));
// nobody wants DEBUG here: dropped before any handler runs
new Logger(file2).log(Level.DEBUG, "ignored");
console.log("file2 has " + show(file2.lines));` },
          { lang: 'cpp', code: `enum class Level { DEBUG, INFO, WARN, ERROR };

string toString(Level l) {
    static const char* names[] = {"DEBUG", "INFO", "WARN", "ERROR"};
    return names[static_cast<int>(l)];
}

class LogHandler {
public:
    explicit LogHandler(Level minimum) : minLevel(minimum) {}
    virtual ~LogHandler() = default;

    LogHandler& then(unique_ptr<LogHandler> n) {  // the chain owns its links
        next = std::move(n);
        return *next;
    }

    Level min() const { return next ? std::min(minLevel, next->min()) : minLevel; }

    // Fixed walking logic: subclasses implement write() and name() only.
    void handle(Level level, const string& msg) {
        if (level >= minLevel) {
            try { write(level, msg); }
            catch (const exception& e) { cout << name() << " failed: " << e.what() << "\\n"; }
        }
        if (next) next->handle(level, msg);  // pipeline: always forward
    }

protected:
    virtual void write(Level level, const string& msg) = 0;
    virtual string name() const = 0;

private:
    Level minLevel;
    unique_ptr<LogHandler> next;
};

class ConsoleHandler : public LogHandler {
public:
    ConsoleHandler() : LogHandler(Level::DEBUG) {}
protected:
    void write(Level l, const string& m) override { cout << "[console] " << toString(l) << " " << m << "\\n"; }
    string name() const override { return "ConsoleHandler"; }
};

class FileHandler : public LogHandler {
public:
    FileHandler() : LogHandler(Level::INFO) {}
    vector<string> lines;
protected:
    void write(Level l, const string& m) override { lines.push_back(toString(l) + " " + m); }
    string name() const override { return "FileHandler"; }
};

class PagerHandler : public LogHandler {
public:
    PagerHandler() : LogHandler(Level::ERROR) {}
protected:
    void write(Level, const string& m) override { cout << "[pager] waking on-call: " << m << "\\n"; }
    string name() const override { return "PagerHandler"; }
};

class BrokenHandler : public LogHandler {
public:
    BrokenHandler() : LogHandler(Level::INFO) {}
protected:
    void write(Level, const string&) override { throw runtime_error("disk full"); }
    string name() const override { return "BrokenHandler"; }
};

class Logger {
public:
    explicit Logger(LogHandler& head) : head(head), min(head.min()) {}  // build the chain first, then the Logger
    void log(Level level, const string& msg) {
        if (level < min) return;  // nobody wants it: O(1) drop
        head.handle(level, msg);
    }
private:
    LogHandler& head;
    Level min;
};

string show(const vector<string>& lines) {
    string s = "[";
    for (size_t i = 0; i < lines.size(); i++) s += (i ? ", " : "") + lines[i];
    return s + "]";
}

int main() {
    ConsoleHandler console;
    auto file = make_unique<FileHandler>();
    FileHandler& fileRef = *file;
    console.then(std::move(file)).then(make_unique<PagerHandler>());
    Logger log(console);
    log.log(Level::DEBUG, "cache miss");
    log.log(Level::WARN, "slow query");
    log.log(Level::ERROR, "db down");
    cout << "file has " << show(fileRef.lines) << "\\n";
    // a failing handler must not stop the rest of the pipeline
    FileHandler file2;
    file2.then(make_unique<BrokenHandler>()).then(make_unique<PagerHandler>());
    Logger(file2).log(Level::ERROR, "x");
    cout << "file2 has " << show(file2.lines) << "\\n";
    // nobody wants DEBUG here: dropped before any handler runs
    Logger(file2).log(Level::DEBUG, "ignored");
    cout << "file2 has " << show(file2.lines) << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

enum Level { DEBUG, INFO, WARN, ERROR }

abstract class LogHandler {
    private readonly Level min; private LogHandler next;
    protected LogHandler(Level min) { this.min = min; }
    public LogHandler Then(LogHandler n) { next = n; return n; }
    public Level Min() { return next == null ? min : (min < next.Min() ? min : next.Min()); }

    public void Handle(Level level, string msg) {
        if (level >= min) {
            try { Write(level, msg); }
            catch (Exception e) { Console.WriteLine(GetType().Name + " failed: " + e.Message); }
        }
        if (next != null) next.Handle(level, msg);           // pipeline: always forward
    }
    protected abstract void Write(Level level, string msg);
}

class ConsoleHandler : LogHandler {
    public ConsoleHandler() : base(Level.DEBUG) { }
    protected override void Write(Level l, string m) { Console.WriteLine("[console] " + l + " " + m); }
}
class FileHandler : LogHandler {
    public readonly List<string> Lines = new List<string>();
    public FileHandler() : base(Level.INFO) { }
    protected override void Write(Level l, string m) { lock (Lines) Lines.Add(l + " " + m); }
}
class PagerHandler : LogHandler {
    public PagerHandler() : base(Level.ERROR) { }
    protected override void Write(Level l, string m) { Console.WriteLine("[pager] waking on-call: " + m); }
}

class BrokenHandler : LogHandler {
    public BrokenHandler() : base(Level.INFO) { }
    protected override void Write(Level l, string m) { throw new InvalidOperationException("disk full"); }
}

class Logger {
    private readonly LogHandler head; private readonly Level min;
    public Logger(LogHandler head) { this.head = head; min = head.Min(); }   // build the chain first, then the Logger
    public void Log(Level level, string msg) {
        if (level < min) return;                             // nobody wants it: O(1) drop
        head.Handle(level, msg);
    }
}

class Program {
    static string Show(List<string> l) { return "[" + string.Join(", ", l) + "]"; }
    static void Main() {
        ConsoleHandler console = new ConsoleHandler();
        FileHandler file = new FileHandler();
        console.Then(file).Then(new PagerHandler());
        Logger log = new Logger(console);
        log.Log(Level.DEBUG, "cache miss");
        log.Log(Level.WARN, "slow query");
        log.Log(Level.ERROR, "db down");
        Console.WriteLine("file has " + Show(file.Lines));
        // a failing handler must not stop the rest of the pipeline
        FileHandler file2 = new FileHandler();
        file2.Then(new BrokenHandler()).Then(new PagerHandler());
        new Logger(file2).Log(Level.ERROR, "x");
        Console.WriteLine("file2 has " + Show(file2.Lines));
        // nobody wants DEBUG here: dropped before any handler runs
        new Logger(file2).Log(Level.DEBUG, "ignored");
        Console.WriteLine("file2 has " + Show(file2.Lines));
    }
}` }
        ],
      complexity: `<p>O(H) per message for H handlers; O(1) for messages below the global minimum.</p>`,
      followUps: ['Make writing asynchronous so a slow file system does not block callers (queue + background thread)', 'Add per-package log levels (logger hierarchy)']
    }
  });

  practice.push({
    title: 'Typed Event Bus', level: 'Medium', tags: ['observer', 'pub-sub', 'generics'], companies: ['Google', 'Spotify', 'Swiggy'],
    statement: `<p>Implement an in-process <code>EventBus</code>: <code>subscribe(Class&lt;T&gt; type, Consumer&lt;T&gt; handler)</code> returns a handle to unsubscribe; <code>publish(Object event)</code> delivers the event to every handler subscribed to the event's class <b>or any of its supertypes/interfaces</b> (a handler for <code>OrderEvent</code> also receives <code>OrderShipped</code>). A handler that throws must not prevent delivery to others; return the number of handlers that succeeded.</p>`,
    constraints: `Up to 10<sup>4</sup> subscriptions, many publishes per second from multiple threads; subscriptions change rarely.`,
    example: `<p>subscribe(OrderEvent → audit), subscribe(OrderShipped → sms), subscribe(Object → debugLog). publish(new OrderShipped("A1")) → ${H.c('g', 'audit, sms and debugLog')} all run (3). publish(new UserSignedUp("u7")) → ${H.c('g', 'debugLog only')} (1).</p>`,
    brute: { why: `<p>One <code>publish(String type, Object payload)</code> with a switch on the type string calling services directly. No compile-time type safety (payload casts), publishers know every consumer, and hierarchy-based subscriptions ("all order events") are impossible without listing every subtype.</p>`, code: { lang: 'java', code: `class NaiveBus {
    void publish(String type, Object payload) {
        switch (type) {
            case "ORDER_SHIPPED" -> { System.out.println("audit " + payload); System.out.println("sms " + payload); }
            case "USER_SIGNED_UP" -> System.out.println("welcome " + payload);
            default -> System.out.println("unknown " + type);   // every new event edits this
        }
    }
}`, alt: [
              { lang: 'python', code: `
class NaiveBus:
    def publish(self, type, payload):
        match type:
            case "ORDER_SHIPPED": print("audit", payload); print("sms", payload)
            case "USER_SIGNED_UP": print("welcome", payload)
            case _: print("unknown", type)   # every new event edits this` },
              { lang: 'ts', code: `
class NaiveBus {
    publish(type: string, payload: unknown): void {
        switch (type) {
            case "ORDER_SHIPPED": console.log("audit " + payload); console.log("sms " + payload); break;
            case "USER_SIGNED_UP": console.log("welcome " + payload); break;
            default: console.log("unknown " + type);   // every new event edits this
        }
    }
}` },
              { lang: 'cpp', code: `
class NaiveBus {
public:
    void publish(const string& type, const string& payload) {
        if (type == "ORDER_SHIPPED") { cout << "audit " << payload << "\\n"; cout << "sms " << payload << "\\n"; }
        else if (type == "USER_SIGNED_UP") cout << "welcome " << payload << "\\n";
        else cout << "unknown " << type << "\\n";   // every new event edits this
    }
};` },
  { lang: 'csharp', code: `
using System;

class NaiveBus {
    public void Publish(string type, object payload) {
        switch (type) {
            case "ORDER_SHIPPED": Console.WriteLine("audit " + payload); Console.WriteLine("sms " + payload); break;
            case "USER_SIGNED_UP": Console.WriteLine("welcome " + payload); break;
            default: Console.WriteLine("unknown " + type); break;   // every new event edits this
        }
    }
}` }
            ] } },
    mcq: { q: 'How do you find every handler that should receive an OrderShipped event?', options: ['Walk its class, superclasses and interfaces, and collect the handlers registered for each', 'Only look up OrderShipped.class', 'Call every handler and let it check instanceof', 'Use the event name string'], answer: 0, explain: 'Subscriptions keyed by type; delivery resolves the event type hierarchy (cache it per class for speed).' },
    hints: [`<p>Hint 1: <code>Map&lt;Class&lt;?&gt;, List&lt;Consumer&lt;Object&gt;&gt;&gt;</code> — store handlers wrapped so the bus can call them with an Object after a safe cast.</p>`, `<p>Hint 2: Collect all supertypes with a BFS over <code>getSuperclass()</code> and <code>getInterfaces()</code>; cache the result in a <code>ConcurrentHashMap&lt;Class, List&lt;Class&gt;&gt;</code>.</p>`, `<p>Hint 3: Use <code>CopyOnWriteArrayList</code> for handler lists; wrap each call in try/catch; unsubscribe handle removes the exact wrapper.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "sms: A1 shipped\naudit A1\ndebug OrderShipped\n3 handlers\naudit A2\ndebug OrderShipped\n2 handlers\ndebug UserSignedUp\n1 handlers\nhandler failed: mail down\nwelcome u8\ndebug UserSignedUp\n2 handlers\n" }] },
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
        Runnable sms = bus.subscribe(OrderShipped.class, e -> System.out.println("sms: " + e.orderId() + " shipped"));
        bus.subscribe(OrderEvent.class, e -> System.out.println("audit " + e.orderId()));
        bus.subscribe(Object.class, e -> System.out.println("debug " + e.getClass().getSimpleName()));
        System.out.println(bus.publish(new OrderShipped("A1")) + " handlers");
        sms.run();
        System.out.println(bus.publish(new OrderShipped("A2")) + " handlers");
        System.out.println(bus.publish(new UserSignedUp("u7")) + " handlers");
        EventBus bus2 = new EventBus();
        bus2.subscribe(UserSignedUp.class, e -> { throw new IllegalStateException("mail down"); });
        bus2.subscribe(UserSignedUp.class, e -> System.out.println("welcome " + e.userId()));
        bus2.subscribe(Object.class, e -> System.out.println("debug " + e.getClass().getSimpleName()));
        System.out.println(bus2.publish(new UserSignedUp("u8")) + " handlers");   // the broken handler is not counted
    }
}`, alt: [
          { lang: 'python', code: `import threading
from abc import ABC
from collections import defaultdict
from dataclasses import dataclass
from typing import Callable, TypeVar

T = TypeVar("T")


class OrderEvent(ABC):
    order_id: str


@dataclass(frozen=True)
class OrderShipped(OrderEvent):
    order_id: str


@dataclass(frozen=True)
class UserSignedUp:
    user_id: str


class EventBus:
    def __init__(self):
        self._handlers: dict[type, list[Callable[[object], None]]] = defaultdict(list)
        self._lock = threading.Lock()

    def subscribe(self, event_type: type[T], handler: Callable[[T], None]) -> Callable[[], None]:
        with self._lock:
            self._handlers[event_type].append(handler)  # type: ignore[arg-type]

        def unsubscribe() -> None:
            with self._lock:
                if handler in self._handlers[event_type]:
                    self._handlers[event_type].remove(handler)  # type: ignore[arg-type]

        return unsubscribe

    def publish(self, event: object) -> int:
        ok = 0
        for t in type(event).__mro__:  # the class, its parents, ..., object: most specific first
            with self._lock:
                snapshot = list(self._handlers.get(t, []))
            for h in snapshot:
                try:
                    h(event)
                    ok += 1
                except Exception as e:
                    print("handler failed:", e)
        return ok


def fail(message: str) -> None:
    raise RuntimeError(message)


if __name__ == "__main__":
    bus = EventBus()
    sms = bus.subscribe(OrderShipped, lambda e: print(f"sms: {e.order_id} shipped"))
    bus.subscribe(OrderEvent, lambda e: print(f"audit {e.order_id}"))
    bus.subscribe(object, lambda e: print("debug", type(e).__name__))
    print(bus.publish(OrderShipped("A1")), "handlers")
    sms()
    print(bus.publish(OrderShipped("A2")), "handlers")
    print(bus.publish(UserSignedUp("u7")), "handlers")
    bus2 = EventBus()
    bus2.subscribe(UserSignedUp, lambda e: fail("mail down"))
    bus2.subscribe(UserSignedUp, lambda e: print(f"welcome {e.user_id}"))
    bus2.subscribe(object, lambda e: print("debug", type(e).__name__))
    print(bus2.publish(UserSignedUp("u8")), "handlers")  # the broken handler is not counted` },
          { lang: 'ts', code: `abstract class OrderEvent {
  abstract readonly orderId: string;
}

class OrderShipped extends OrderEvent {
  constructor(readonly orderId: string) { super(); }
}

class UserSignedUp {
  constructor(readonly userId: string) {}
}

type EventType<T> = abstract new (...args: never[]) => T;

class EventBus {
  private readonly handlers = new Map<Function, ((e: never) => void)[]>();

  subscribe<T extends object>(type: EventType<T>, handler: (e: T) => void): () => void {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), handler]); // copy-on-write
    return () => {
      this.handlers.set(type, (this.handlers.get(type) ?? []).filter((h) => h !== handler));
    };
  }

  publish(event: object): number {
    let ok = 0;
    // the prototype chain is the class hierarchy: the class, its parents, ..., Object
    for (let p: object | null = Object.getPrototypeOf(event); p !== null; p = Object.getPrototypeOf(p)) {
      for (const h of this.handlers.get(p.constructor) ?? []) {
        try { (h as (e: object) => void)(event); ok++; }
        catch (e) { console.log("handler failed: " + (e as Error).message); }
      }
    }
    return ok;
  }
}

const bus = new EventBus();
const sms = bus.subscribe(OrderShipped, (e) => console.log(\`sms: \${e.orderId} shipped\`));
bus.subscribe(OrderEvent, (e) => console.log(\`audit \${e.orderId}\`));
bus.subscribe(Object, (e) => console.log("debug " + e.constructor.name));
console.log(bus.publish(new OrderShipped("A1")) + " handlers");
sms();
console.log(bus.publish(new OrderShipped("A2")) + " handlers");
console.log(bus.publish(new UserSignedUp("u7")) + " handlers");
const bus2 = new EventBus();
bus2.subscribe(UserSignedUp, () => { throw new Error("mail down"); });
bus2.subscribe(UserSignedUp, (e) => console.log(\`welcome \${e.userId}\`));
bus2.subscribe(Object, (e) => console.log("debug " + e.constructor.name));
console.log(bus2.publish(new UserSignedUp("u8")) + " handlers"); // the broken handler is not counted` },
          { lang: 'cpp', code: `// Events share one polymorphic base (C++ has no "Object"), so dynamic_cast can ask "is this event a T?".
struct Event {
    virtual ~Event() = default;
    virtual string kind() const = 0;
};

struct OrderEvent : Event {
    virtual const string& orderId() const = 0;
};

struct OrderShipped : OrderEvent {
    explicit OrderShipped(string id) : id(std::move(id)) {}
    const string& orderId() const override { return id; }
    string kind() const override { return "OrderShipped"; }
    string id;
};

struct UserSignedUp : Event {
    explicit UserSignedUp(string id) : userId(std::move(id)) {}
    string kind() const override { return "UserSignedUp"; }
    string userId;
};

class EventBus {
public:
    // Returns an unsubscribe handle. Handlers run in subscription order (Java runs the most specific type first).
    template <class T>
    function<void()> subscribe(function<void(const T&)> handler) {
        size_t id = nextId++;
        handlers.push_back({id, [handler](const Event& e) {
            const T* typed = dynamic_cast<const T*>(&e);  // T or any of its subtypes matches
            if (typed) handler(*typed);
            return typed != nullptr;
        }});
        return [this, id] {
            handlers.erase(remove_if(handlers.begin(), handlers.end(), [id](auto& h) { return h.id == id; }), handlers.end());
        };
    }

    int publish(const Event& event) {
        int ok = 0;
        auto snapshot = handlers;  // safe if a handler unsubscribes
        for (auto& h : snapshot) {
            try { if (h.matchAndRun(event)) ok++; }
            catch (const exception& e) { cout << "handler failed: " << e.what() << "\\n"; }
        }
        return ok;
    }

private:
    struct Entry { size_t id; function<bool(const Event&)> matchAndRun; };
    vector<Entry> handlers;
    size_t nextId = 0;
};

int main() {
    EventBus bus;
    auto sms = bus.subscribe<OrderShipped>([](const OrderShipped& e) { cout << "sms: " << e.orderId() << " shipped\\n"; });
    bus.subscribe<OrderEvent>([](const OrderEvent& e) { cout << "audit " << e.orderId() << "\\n"; });
    bus.subscribe<Event>([](const Event& e) { cout << "debug " << e.kind() << "\\n"; });
    cout << bus.publish(OrderShipped("A1")) << " handlers\\n";
    sms();
    cout << bus.publish(OrderShipped("A2")) << " handlers\\n";
    cout << bus.publish(UserSignedUp("u7")) << " handlers\\n";
    EventBus bus2;
    bus2.subscribe<UserSignedUp>([](const UserSignedUp&) { throw runtime_error("mail down"); });
    bus2.subscribe<UserSignedUp>([](const UserSignedUp& e) { cout << "welcome " << e.userId << "\\n"; });
    bus2.subscribe<Event>([](const Event& e) { cout << "debug " << e.kind() << "\\n"; });
    cout << bus2.publish(UserSignedUp("u8")) << " handlers\\n";  // the broken handler is not counted
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;

interface IOrderEvent { string OrderId { get; } }
sealed class OrderShipped : IOrderEvent { private readonly string id; public OrderShipped(string orderId) { id = orderId; } public string OrderId { get { return id; } } }
sealed class UserSignedUp { public readonly string UserId; public UserSignedUp(string userId) { UserId = userId; } }

class EventBus {
    private readonly ConcurrentDictionary<Type, List<Action<object>>> handlers = new ConcurrentDictionary<Type, List<Action<object>>>();
    private readonly ConcurrentDictionary<Type, List<Type>> hierarchyCache = new ConcurrentDictionary<Type, List<Type>>();
    private readonly object gate = new object();

    public Action Subscribe<T>(Action<T> handler) {
        Type type = typeof(T);
        Action<object> wrapper = o => handler((T)o);
        lock (gate) handlers.GetOrAdd(type, k => new List<Action<object>>()).Add(wrapper);
        return () => { List<Action<object>> hs; if (handlers.TryGetValue(type, out hs)) lock (gate) hs.Remove(wrapper); };
    }

    public int Publish(object evt) {
        int ok = 0;
        foreach (Type t in Hierarchy(evt.GetType())) {
            List<Action<object>> hs; Action<object>[] snapshot;
            if (!handlers.TryGetValue(t, out hs)) continue;
            lock (gate) snapshot = hs.ToArray();
            foreach (Action<object> h in snapshot) {
                try { h(evt); ok++; }
                catch (Exception e) { Console.WriteLine("handler failed: " + e.Message); }
            }
        }
        return ok;
    }

    private List<Type> Hierarchy(Type c) {
        return hierarchyCache.GetOrAdd(c, k => {
            List<Type> result = new List<Type>();
            Queue<Type> q = new Queue<Type>(); q.Enqueue(k);
            HashSet<Type> seen = new HashSet<Type>();
            while (q.Count > 0) {
                Type x = q.Dequeue();
                if (x == null || !seen.Add(x)) continue;
                result.Add(x);
                foreach (Type i in x.GetInterfaces()) q.Enqueue(i);      // interfaces first, then the base type: most specific handlers run first
                if (x.BaseType != null) q.Enqueue(x.BaseType);
            }
            return result;
        });
    }
}

class Program {
    static void Main() {
        EventBus bus = new EventBus();
        Action sms = bus.Subscribe<OrderShipped>(e => Console.WriteLine("sms: " + e.OrderId + " shipped"));
        bus.Subscribe<IOrderEvent>(e => Console.WriteLine("audit " + e.OrderId));
        bus.Subscribe<object>(e => Console.WriteLine("debug " + e.GetType().Name));
        Console.WriteLine(bus.Publish(new OrderShipped("A1")) + " handlers");
        sms();
        Console.WriteLine(bus.Publish(new OrderShipped("A2")) + " handlers");
        Console.WriteLine(bus.Publish(new UserSignedUp("u7")) + " handlers");
        EventBus bus2 = new EventBus();
        bus2.Subscribe<UserSignedUp>(e => { throw new InvalidOperationException("mail down"); });
        bus2.Subscribe<UserSignedUp>(e => Console.WriteLine("welcome " + e.UserId));
        bus2.Subscribe<object>(e => Console.WriteLine("debug " + e.GetType().Name));
        Console.WriteLine(bus2.Publish(new UserSignedUp("u8")) + " handlers");   // the broken handler is not counted
    }
}` }
        ],
      complexity: `<p>publish: O(T + H) where T = types in the hierarchy (cached) and H = matching handlers. subscribe/unsubscribe: O(H) copy-on-write.</p>`,
      followUps: ['Deliver asynchronously with ordering per event type', 'Add dead-event handling (no subscribers)', 'Prevent memory leaks from forgotten subscriptions']
    }
  });

  practice.push({
    title: 'Flatten Nested List Iterator', level: 'Medium', tags: ['iterator', 'stack'], companies: ['Meta', 'LinkedIn', 'Airbnb', 'Netflix'],
    statement: `<p>Given a nested list such as <code>[[1,1],2,[1,[4,[6]]]]</code>, implement an iterator that returns the integers in order: 1, 1, 2, 1, 4, 6. Elements are <code>NestedInteger</code>s: each is either an integer or a list of NestedIntegers. Lists may be empty at any depth (<code>[[],[[]],3]</code> → 3). Iterate lazily: do not flatten everything in the constructor.</p>`,
    constraints: `Up to 10<sup>5</sup> integers, nesting depth up to 10<sup>4</sup>. <code>hasNext()</code> must be safe to call repeatedly.`,
    example: `<p>[[1,1],2,[1,[4,[6]]]] → ${H.c('g', '1 1 2 1 4 6')}. [[],[[]],3] → ${H.c('g', '3')} — empty lists produce nothing, so hasNext() must <b>skip</b> them before answering.</p>`,
    brute: { why: `<p>Recursively flatten the whole structure into a list in the constructor. Simple, but O(N) memory and work up front, and a depth-10<sup>4</sup> recursion risks StackOverflowError. Callers who need only the first element still pay for all.</p>`, code: { lang: 'java', code: `interface NI { boolean isInteger(); Integer getInteger(); List<NI> getList(); }
class FlattenAll {
    private final List<Integer> out = new ArrayList<>(); private int i;
    FlattenAll(List<NI> list) { add(list); }
    private void add(List<NI> l) { for (NI x : l) if (x.isInteger()) out.add(x.getInteger()); else add(x.getList()); }  // deep recursion
    boolean hasNext() { return i < out.size(); }
    Integer next() { return out.get(i++); }
}`, alt: [
              { lang: 'python', code: `
class NI:
    def is_integer(self): raise NotImplementedError
    def get_integer(self): raise NotImplementedError
    def get_list(self): raise NotImplementedError

class FlattenAll:
    def __init__(self, lst):
        self._out = []
        self._i = 0
        self._add(lst)
    def _add(self, l):
        for x in l:
            if x.is_integer(): self._out.append(x.get_integer())
            else: self._add(x.get_list())      # deep recursion
    def has_next(self): return self._i < len(self._out)
    def next(self):
        self._i += 1
        return self._out[self._i - 1]` },
              { lang: 'ts', code: `
interface NI { isInteger(): boolean; getInteger(): number; getList(): NI[]; }
class FlattenAll {
    private readonly out: number[] = []; private i = 0;
    constructor(list: NI[]) { this.add(list); }
    private add(l: NI[]): void { for (const x of l) if (x.isInteger()) this.out.push(x.getInteger()); else this.add(x.getList()); }  // deep recursion
    hasNext(): boolean { return this.i < this.out.length; }
    next(): number { return this.out[this.i++]; }
}` },
              { lang: 'cpp', code: `
struct NI { virtual bool isInteger() = 0; virtual int getInteger() = 0; virtual vector<NI*> getList() = 0; virtual ~NI() = default; };
class FlattenAll {
    vector<int> out; int i = 0;
    void add(const vector<NI*>& l) { for (NI* x : l) { if (x->isInteger()) out.push_back(x->getInteger()); else add(x->getList()); } }  // deep recursion
public:
    FlattenAll(const vector<NI*>& list) { add(list); }
    bool hasNext() { return i < (int)out.size(); }
    int next() { return out[i++]; }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

interface INI { bool IsInteger(); int GetInteger(); List<INI> GetList(); }
class FlattenAll {
    private readonly List<int> all = new List<int>(); private int i;
    public FlattenAll(List<INI> list) { Add(list); }
    private void Add(List<INI> l) { foreach (INI x in l) if (x.IsInteger()) all.Add(x.GetInteger()); else Add(x.GetList()); }  // deep recursion
    public bool HasNext() { return i < all.Count; }
    public int Next() { return all[i++]; }
}` }
            ] } },
    mcq: { q: 'Why must hasNext() do work (not just check a stack is non-empty)?', options: ['Because the stack may hold only empty lists, so we must unpack until an integer is on top', 'Because next() is slow', 'Because the language requires it', 'It must not do work'], answer: 0, explain: 'hasNext() advances past empty lists and unpacks nested lists until an integer is ready (or nothing remains). It must be idempotent, so it only prepares and never consumes the integer.' },
    hints: [`<p>Hint 1: Keep a stack of iterators (one per open list), like a paused DFS.</p>`, `<p>Hint 2: In hasNext(): look at the top iterator; if exhausted pop it; if its next element is a list, push that list's iterator; if it is an integer, cache it and return true.</p>`, `<p>Hint 3: Use a cached <code>Integer nextVal</code> to make hasNext idempotent; next() calls hasNext(), returns and clears the cache.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "1 1 2 1 4 6\n3\nfalse false\nerror: exhausted\ndeep 42\n" }] },
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
        if (!hasNext()) throw new NoSuchElementException("exhausted");
        Integer v = nextVal; nextVal = null; return v;
    }

    public static void main(String[] args) {
        List<NestedInteger> in = List.of(NestedInteger.of(NestedInteger.of(1), NestedInteger.of(1)), NestedInteger.of(2),
                NestedInteger.of(NestedInteger.of(1), NestedInteger.of(NestedInteger.of(4), NestedInteger.of(NestedInteger.of(6)))));
        NestedIterator it = new NestedIterator(in);
        StringBuilder sb = new StringBuilder();
        while (it.hasNext()) sb.append(it.next()).append(' ');
        System.out.println(sb.toString().trim());   // 1 1 2 1 4 6
        System.out.println(new NestedIterator(List.of(NestedInteger.of(), NestedInteger.of(NestedInteger.of()), NestedInteger.of(3))).next());   // 3
        NestedIterator empty = new NestedIterator(List.of(NestedInteger.of(), NestedInteger.of(NestedInteger.of())));
        System.out.println(empty.hasNext() + " " + empty.hasNext());   // false false: repeated calls are safe
        try { empty.next(); } catch (NoSuchElementException e) { System.out.println("error: " + e.getMessage()); }
        NestedInteger deep = NestedInteger.of(42);
        for (int i = 0; i < 5000; i++) deep = NestedInteger.of(deep);   // 5000 levels, no recursion
        System.out.println("deep " + new NestedIterator(List.of(deep)).next());
    }
}`, alt: [
          { lang: 'python', code: `from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


class NestedInteger(ABC):
    @abstractmethod
    def is_integer(self) -> bool: ...

    @abstractmethod
    def get_integer(self) -> int | None: ...

    @abstractmethod
    def get_list(self) -> list[NestedInteger]: ...


@dataclass(frozen=True)
class NestedImpl(NestedInteger):
    value: int | None = None
    items: tuple[NestedInteger, ...] = ()

    def is_integer(self) -> bool:
        return self.value is not None

    def get_integer(self) -> int | None:
        return self.value

    def get_list(self) -> list[NestedInteger]:
        return list(self.items)


def of_int(v: int) -> NestedInteger:  # Java overloads of(int)
    return NestedImpl(value=v)


def of_list(*xs: NestedInteger) -> NestedInteger:  # ... and of(NestedInteger...)
    return NestedImpl(items=xs)


class NestedIterator:
    def __init__(self, items: list[NestedInteger]):
        self._stack = [iter(items)]  # one iterator per open list
        self._next_val: int | None = None  # cached look-ahead

    def has_next(self) -> bool:
        while self._next_val is None and self._stack:
            top = self._stack[-1]
            x = next(top, None)
            if x is None:
                self._stack.pop()
            elif x.is_integer():
                self._next_val = x.get_integer()
            else:
                self._stack.append(iter(x.get_list()))  # descend lazily
        return self._next_val is not None

    def next(self) -> int:
        if not self.has_next():
            raise StopIteration("exhausted")
        v = self._next_val
        self._next_val = None
        return v  # type: ignore[return-value]

    def __iter__(self) -> NestedIterator:
        return self

    def __next__(self) -> int:
        return self.next()


if __name__ == "__main__":
    data = [of_list(of_int(1), of_int(1)), of_int(2),
            of_list(of_int(1), of_list(of_int(4), of_list(of_int(6))))]
    print(" ".join(str(v) for v in NestedIterator(data)))  # 1 1 2 1 4 6
    print(NestedIterator([of_list(), of_list(of_list()), of_int(3)]).next())  # 3
    empty = NestedIterator([of_list(), of_list(of_list())])
    print(str(empty.has_next()).lower(), str(empty.has_next()).lower())  # false false: repeated calls are safe
    try:
        empty.next()
    except StopIteration as e:
        print("error:", e)
    deep = of_int(42)
    for _ in range(5000):
        deep = of_list(deep)  # 5000 levels, no recursion
    print("deep", NestedIterator([deep]).next())` },
          { lang: 'ts', code: `interface NestedInteger {
  isInteger(): boolean;
  getInteger(): number | null;
  getList(): readonly NestedInteger[];
}

class NestedImpl implements NestedInteger {
  constructor(private readonly value: number | null, private readonly list: readonly NestedInteger[]) {}
  isInteger(): boolean { return this.value !== null; }
  getInteger(): number | null { return this.value; }
  getList(): readonly NestedInteger[] { return this.list; }
}

const ofInt = (v: number): NestedInteger => new NestedImpl(v, []); // Java overloads of(int)
const ofList = (...xs: NestedInteger[]): NestedInteger => new NestedImpl(null, xs); // ... and of(NestedInteger...)

class NestedIterator {
  private readonly stack: Iterator<NestedInteger>[] = []; // one iterator per open list
  private nextVal: number | null = null; // cached look-ahead

  constructor(list: readonly NestedInteger[]) { this.stack.push(list[Symbol.iterator]()); }

  hasNext(): boolean {
    while (this.nextVal === null && this.stack.length > 0) {
      const r = this.stack[this.stack.length - 1].next();
      if (r.done) this.stack.pop();
      else if (r.value.isInteger()) this.nextVal = r.value.getInteger();
      else this.stack.push(r.value.getList()[Symbol.iterator]()); // descend lazily
    }
    return this.nextVal !== null;
  }

  next(): number {
    if (!this.hasNext()) throw new Error("exhausted");
    const v = this.nextVal as number;
    this.nextVal = null;
    return v;
  }
}

const input = [ofList(ofInt(1), ofInt(1)), ofInt(2), ofList(ofInt(1), ofList(ofInt(4), ofList(ofInt(6))))];
const it = new NestedIterator(input);
const out: number[] = [];
while (it.hasNext()) out.push(it.next());
console.log(out.join(" ")); // 1 1 2 1 4 6
console.log(new NestedIterator([ofList(), ofList(ofList()), ofInt(3)]).next()); // 3
const empty = new NestedIterator([ofList(), ofList(ofList())]);
console.log(\`\${empty.hasNext()} \${empty.hasNext()}\`); // false false: repeated calls are safe
try { empty.next(); } catch (e) { console.log("error: " + (e as Error).message); }
let deep = ofInt(42);
for (let i = 0; i < 5000; i++) deep = ofList(deep); // 5000 levels, no recursion
console.log("deep " + new NestedIterator([deep]).next());` },
          { lang: 'cpp', code: `class NestedInteger;
using Nested = shared_ptr<const NestedInteger>;

class NestedInteger {
public:
    virtual ~NestedInteger() = default;
    virtual bool isInteger() const = 0;
    virtual int getInteger() const = 0;
    virtual const vector<Nested>& getList() const = 0;
};

class IntValue : public NestedInteger {
public:
    explicit IntValue(int v) : value(v) {}
    bool isInteger() const override { return true; }
    int getInteger() const override { return value; }
    const vector<Nested>& getList() const override { throw logic_error("not a list"); }
private:
    int value;
};

class ListValue : public NestedInteger {
public:
    explicit ListValue(vector<Nested> items) : items(std::move(items)) {}
    bool isInteger() const override { return false; }
    int getInteger() const override { throw logic_error("not an integer"); }
    const vector<Nested>& getList() const override { return items; }
private:
    vector<Nested> items;
};

Nested ofInt(int v) { return make_shared<IntValue>(v); }                                  // Java overloads of(int)
Nested ofList(vector<Nested> xs = {}) { return make_shared<ListValue>(std::move(xs)); }     // ... and of(NestedInteger...)

class NestedIterator {
public:
    explicit NestedIterator(vector<Nested> list) : root(std::move(list)) {
        stack.push_back({root.begin(), root.end()});
    }

    bool hasNext() {
        while (!nextVal && !stack.empty()) {
            auto& [cur, end] = stack.back();
            if (cur == end) { stack.pop_back(); continue; }
            const Nested& x = *cur++;
            if (x->isInteger()) nextVal = x->getInteger();
            else stack.push_back({x->getList().begin(), x->getList().end()});  // descend lazily
        }
        return nextVal.has_value();
    }

    int next() {
        if (!hasNext()) throw out_of_range("exhausted");
        int v = *nextVal;
        nextVal.reset();
        return v;
    }

private:
    using Range = pair<vector<Nested>::const_iterator, vector<Nested>::const_iterator>;
    vector<Nested> root;  // keeps the whole tree alive; the stack holds non-owning positions
    vector<Range> stack;  // one range per open list
    optional<int> nextVal;  // cached look-ahead
};

int main() {
    vector<Nested> in = {ofList({ofInt(1), ofInt(1)}), ofInt(2),
                         ofList({ofInt(1), ofList({ofInt(4), ofList({ofInt(6)})})})};
    NestedIterator it(in);
    string line;
    while (it.hasNext()) line += (line.empty() ? "" : " ") + to_string(it.next());
    cout << line << "\\n";  // 1 1 2 1 4 6
    cout << NestedIterator({ofList(), ofList({ofList()}), ofInt(3)}).next() << "\\n";  // 3
    NestedIterator empty({ofList(), ofList({ofList()})});
    bool a = empty.hasNext(), b = empty.hasNext();
    cout << boolalpha << a << " " << b << "\\n";  // false false: repeated calls are safe
    try { empty.next(); } catch (const out_of_range& e) { cout << "error: " << e.what() << "\\n"; }
    Nested deep = ofInt(42);
    for (int i = 0; i < 5000; i++) deep = ofList({deep});  // 5000 levels, no recursion
    cout << "deep " << NestedIterator({deep}).next() << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Text;

interface INestedInteger {
    bool IsInteger();
    int GetInteger();
    List<INestedInteger> GetList();
}
static class Nested {
    public static INestedInteger Of(int v) { return new NestedImpl(v, null); }
    public static INestedInteger Of(params INestedInteger[] xs) { return new NestedImpl(null, new List<INestedInteger>(xs)); }
}
sealed class NestedImpl : INestedInteger {
    private readonly int? value; private readonly List<INestedInteger> list;
    public NestedImpl(int? value, List<INestedInteger> list) { this.value = value; this.list = list; }
    public bool IsInteger() { return value != null; }
    public int GetInteger() { return value.Value; }
    public List<INestedInteger> GetList() { return list; }
}

class NestedIterator {
    private readonly Stack<IEnumerator<INestedInteger>> stack = new Stack<IEnumerator<INestedInteger>>();
    private int? nextVal;                           // cached look-ahead

    public NestedIterator(List<INestedInteger> list) { stack.Push(list.GetEnumerator()); }

    public bool HasNext() {
        while (nextVal == null && stack.Count > 0) {
            IEnumerator<INestedInteger> top = stack.Peek();
            if (!top.MoveNext()) { stack.Pop(); continue; }
            INestedInteger x = top.Current;
            if (x.IsInteger()) nextVal = x.GetInteger();
            else stack.Push(x.GetList().GetEnumerator());      // descend lazily
        }
        return nextVal != null;
    }

    public int Next() {
        if (!HasNext()) throw new InvalidOperationException("exhausted");
        int v = nextVal.Value; nextVal = null; return v;
    }
}

class Program {
    static void Main() {
        List<INestedInteger> input = new List<INestedInteger> { Nested.Of(Nested.Of(1), Nested.Of(1)), Nested.Of(2),
                Nested.Of(Nested.Of(1), Nested.Of(Nested.Of(4), Nested.Of(Nested.Of(6)))) };
        NestedIterator it = new NestedIterator(input);
        StringBuilder sb = new StringBuilder();
        while (it.HasNext()) sb.Append(it.Next()).Append(' ');
        Console.WriteLine(sb.ToString().Trim());   // 1 1 2 1 4 6
        Console.WriteLine(new NestedIterator(new List<INestedInteger> { Nested.Of(), Nested.Of(Nested.Of()), Nested.Of(3) }).Next());   // 3
        NestedIterator empty = new NestedIterator(new List<INestedInteger> { Nested.Of(), Nested.Of(Nested.Of()) });
        Console.WriteLine(empty.HasNext().ToString().ToLower() + " " + empty.HasNext().ToString().ToLower());   // false false: repeated calls are safe
        try { empty.Next(); } catch (InvalidOperationException e) { Console.WriteLine("error: " + e.Message); }
        INestedInteger deep = Nested.Of(42);
        for (int i = 0; i < 5000; i++) deep = Nested.Of(deep);   // 5000 levels, no recursion
        Console.WriteLine("deep " + new NestedIterator(new List<INestedInteger> { deep }).Next());
    }
}` }
        ],
      complexity: `<p>O(1) amortised per call (each element and list is visited once); O(depth) memory.</p>`,
      followUps: ['Support remove()', 'Return elements in reverse order lazily', 'Make it work for a structure that is streamed from disk']
    }
  });

  practice.push({
    title: 'Media Player State Machine', level: 'Medium', tags: ['state'], companies: ['Spotify', 'Netflix', 'Apple'],
    statement: `<p>A <code>MediaPlayer</code> plays one track of length L seconds. States: <b>Stopped</b>, <b>Playing</b>, <b>Paused</b>. <code>play()</code>: Stopped → Playing from 0; Paused → Playing from the saved position; Playing → no-op. <code>pause()</code>: Playing → Paused; otherwise no-op. <code>stop()</code>: any → Stopped, position 0. <code>tick(s)</code>: only in Playing, advances the position; reaching L moves to Stopped (track ended) and fires an <code>onFinished</code> callback. Return a status line after each action.</p>`,
    constraints: `L ≤ 10<sup>4</sup> s, up to 10<sup>5</sup> actions. Adding a <b>Buffering</b> state later must not require editing unrelated states.`,
    example: `<p>L=10. play → Playing@0. tick 4 → Playing@4. pause → Paused@4. tick 3 → ${H.c('m', 'Paused@4 (time frozen)')}. play → Playing@4. tick 7 → ${H.c('g', 'Stopped@0, finished fired')}.</p>`,
    brute: { why: `<p>Two booleans <code>playing</code> and <code>paused</code> and if/else in every method. Invalid combinations (both true) become possible, <code>tick</code> must remember to check both flags, and Buffering would add a third boolean and 8 combinations.</p>`, code: { lang: 'java', code: `class NaivePlayer {
    boolean playing, paused; int pos; final int len;
    NaivePlayer(int len) { this.len = len; }
    void play() { if (paused) { paused = false; playing = true; } else if (!playing) { pos = 0; playing = true; } }
    void pause() { if (playing) { playing = false; paused = true; } }
    void stop() { playing = false; paused = false; pos = 0; }
    void tick(int s) { if (playing && !paused) { pos += s; if (pos >= len) stop(); } }   // flags can drift
}`, alt: [
              { lang: 'python', code: `
class NaivePlayer:
    def __init__(self, length):
        self.playing = self.paused = False
        self.pos = 0
        self.len = length
    def play(self):
        if self.paused: self.paused = False; self.playing = True
        elif not self.playing: self.pos = 0; self.playing = True
    def pause(self):
        if self.playing: self.playing = False; self.paused = True
    def stop(self): self.playing = False; self.paused = False; self.pos = 0
    def tick(self, s):
        if self.playing and not self.paused:     # flags can drift
            self.pos += s
            if self.pos >= self.len: self.stop()` },
              { lang: 'ts', code: `
class NaivePlayer {
    playing = false; paused = false; pos = 0;
    constructor(readonly len: number) {}
    play(): void { if (this.paused) { this.paused = false; this.playing = true; } else if (!this.playing) { this.pos = 0; this.playing = true; } }
    pause(): void { if (this.playing) { this.playing = false; this.paused = true; } }
    stop(): void { this.playing = false; this.paused = false; this.pos = 0; }
    tick(s: number): void { if (this.playing && !this.paused) { this.pos += s; if (this.pos >= this.len) this.stop(); } }   // flags can drift
}` },
              { lang: 'cpp', code: `
class NaivePlayer {
    bool playing = false, paused = false; int pos = 0; const int len;
public:
    NaivePlayer(int len) : len(len) {}
    void play() { if (paused) { paused = false; playing = true; } else if (!playing) { pos = 0; playing = true; } }
    void pause() { if (playing) { playing = false; paused = true; } }
    void stop() { playing = false; paused = false; pos = 0; }
    void tick(int s) { if (playing && !paused) { pos += s; if (pos >= len) stop(); } }   // flags can drift
};` },
  { lang: 'csharp', code: `
using System;

class NaivePlayer {
    public bool Playing, Paused; public int Pos; public readonly int Len;
    public NaivePlayer(int len) { Len = len; }
    public void Play() { if (Paused) { Paused = false; Playing = true; } else if (!Playing) { Pos = 0; Playing = true; } }
    public void Pause() { if (Playing) { Playing = false; Paused = true; } }
    public void Stop() { Playing = false; Paused = false; Pos = 0; }
    public void Tick(int s) { if (Playing && !Paused) { Pos += s; if (Pos >= Len) Stop(); } }   // flags can drift
}` }
            ] } },
    mcq: { q: 'Where does "time does not advance while paused" live in the State design?', options: ['PausedState.tick() is a no-op (inherited default)', 'In MediaPlayer.tick() with an if', 'In the UI', 'In the track object'], answer: 0, explain: 'Each state defines its own reaction; Paused simply does not override tick, so the default does nothing.' },
    hints: [`<p>Hint 1: Context = player (position, length, callback). States = Stopped, Playing, Paused.</p>`, `<p>Hint 2: <code>interface PlayerState</code> with default no-op methods returning <code>this</code>; each state overrides only its meaningful events and returns the next state.</p>`, `<p>Hint 3: Playing.tick: pos += s; if pos ≥ len → pos = 0, fire callback, return Stopped. Keep the state singletons stateless; data stays in the context.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "Playing@0\nPlaying@4\nPaused@4\nPaused@4\nPlaying@4\nPlaying@4\nfinished!\nStopped@0\nStopped@0\nStopped@0\nPlaying@0\nPlaying@2\nStopped@0\n" }] },
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
        System.out.println(m.play());       // Playing@0
        System.out.println(m.tick(4));      // Playing@4
        System.out.println(m.pause());      // Paused@4
        System.out.println(m.tick(3));      // Paused@4: time is frozen
        System.out.println(m.play());       // Playing@4: resumes
        System.out.println(m.play());       // Playing@4: no-op
        System.out.println(m.tick(7));      // finished! then Stopped@0
        System.out.println(m.pause());      // Stopped@0: ignored
        System.out.println(m.tick(1));      // Stopped@0: ignored
        System.out.println(m.play());       // Playing@0
        System.out.println(m.tick(2));      // Playing@2
        System.out.println(m.stop());       // Stopped@0
    }
}`, alt: [
          { lang: 'python', code: `from typing import Callable


class PlayerState:
    """Default behaviour: ignore the event. Concrete states override what they handle."""
    name = "?"

    def play(self, p: "MediaPlayer") -> "PlayerState":
        return self

    def pause(self, p: "MediaPlayer") -> "PlayerState":
        return self

    def tick(self, p: "MediaPlayer", seconds: int) -> "PlayerState":
        return self

    def stop(self, p: "MediaPlayer") -> "PlayerState":
        p.position = 0
        return STOPPED


class Stopped(PlayerState):
    name = "Stopped"

    def play(self, p):
        p.position = 0
        return PLAYING


class Playing(PlayerState):
    name = "Playing"

    def pause(self, p):
        return PAUSED

    def tick(self, p, seconds):
        p.position += seconds
        if p.position >= p.length:
            p.position = 0
            p.on_finished()
            return STOPPED
        return self


class Paused(PlayerState):
    name = "Paused"

    def play(self, p):
        return PLAYING  # resume from saved position


STOPPED, PLAYING, PAUSED = Stopped(), Playing(), Paused()  # stateless, so shared


class MediaPlayer:
    def __init__(self, length: int, on_finished: Callable[[], None]):
        self.position = 0
        self.length = length
        self.on_finished = on_finished
        self._state: PlayerState = STOPPED

    def play(self) -> str:
        self._state = self._state.play(self)
        return self.status()

    def pause(self) -> str:
        self._state = self._state.pause(self)
        return self.status()

    def stop(self) -> str:
        self._state = self._state.stop(self)
        return self.status()

    def tick(self, seconds: int) -> str:
        self._state = self._state.tick(self, seconds)
        return self.status()

    def status(self) -> str:
        return f"{self._state.name}@{self.position}"


if __name__ == "__main__":
    m = MediaPlayer(10, lambda: print("finished!"))
    print(m.play())  # Playing@0
    print(m.tick(4))  # Playing@4
    print(m.pause())  # Paused@4
    print(m.tick(3))  # Paused@4: time is frozen
    print(m.play())  # Playing@4: resumes
    print(m.play())  # Playing@4: no-op
    print(m.tick(7))  # finished! then Stopped@0
    print(m.pause())  # Stopped@0: ignored
    print(m.tick(1))  # Stopped@0: ignored
    print(m.play())  # Playing@0
    print(m.tick(2))  # Playing@2
    print(m.stop())  # Stopped@0` },
          { lang: 'ts', code: `interface PlayerState {
  readonly name: string;
  play(p: MediaPlayer): PlayerState;
  pause(p: MediaPlayer): PlayerState;
  tick(p: MediaPlayer, seconds: number): PlayerState;
  stop(p: MediaPlayer): PlayerState;
}

// Default behaviour: ignore the event. Concrete states override what they handle.
abstract class BaseState implements PlayerState {
  abstract readonly name: string;
  play(_p: MediaPlayer): PlayerState { return this; }
  pause(_p: MediaPlayer): PlayerState { return this; }
  tick(_p: MediaPlayer, _seconds: number): PlayerState { return this; }
  stop(p: MediaPlayer): PlayerState { p.position = 0; return STOPPED; }
}

class Stopped extends BaseState {
  readonly name = "Stopped";
  play(p: MediaPlayer): PlayerState { p.position = 0; return PLAYING; }
}

class Playing extends BaseState {
  readonly name = "Playing";
  pause(_p: MediaPlayer): PlayerState { return PAUSED; }
  tick(p: MediaPlayer, seconds: number): PlayerState {
    p.position += seconds;
    if (p.position >= p.length) { p.position = 0; p.onFinished(); return STOPPED; }
    return this;
  }
}

class Paused extends BaseState {
  readonly name = "Paused";
  play(_p: MediaPlayer): PlayerState { return PLAYING; } // resume from saved position
}

const STOPPED = new Stopped(), PLAYING = new Playing(), PAUSED = new Paused(); // stateless, so shared

class MediaPlayer {
  position = 0;
  private state: PlayerState = STOPPED;
  constructor(readonly length: number, readonly onFinished: () => void) {}
  play(): string { this.state = this.state.play(this); return this.status(); }
  pause(): string { this.state = this.state.pause(this); return this.status(); }
  stop(): string { this.state = this.state.stop(this); return this.status(); }
  tick(s: number): string { this.state = this.state.tick(this, s); return this.status(); }
  status(): string { return \`\${this.state.name}@\${this.position}\`; }
}

const m = new MediaPlayer(10, () => console.log("finished!"));
console.log(m.play()); // Playing@0
console.log(m.tick(4)); // Playing@4
console.log(m.pause()); // Paused@4
console.log(m.tick(3)); // Paused@4: time is frozen
console.log(m.play()); // Playing@4: resumes
console.log(m.play()); // Playing@4: no-op
console.log(m.tick(7)); // finished! then Stopped@0
console.log(m.pause()); // Stopped@0: ignored
console.log(m.tick(1)); // Stopped@0: ignored
console.log(m.play()); // Playing@0
console.log(m.tick(2)); // Playing@2
console.log(m.stop()); // Stopped@0` },
          { lang: 'cpp', code: `class MediaPlayer;

class PlayerState {
public:
    virtual ~PlayerState() = default;
    virtual string name() const = 0;
    // Default behaviour: ignore the event. Concrete states override what they handle.
    virtual const PlayerState* play(MediaPlayer&) const { return this; }
    virtual const PlayerState* pause(MediaPlayer&) const { return this; }
    virtual const PlayerState* tick(MediaPlayer&, int) const { return this; }
    virtual const PlayerState* stop(MediaPlayer& p) const;
};

const PlayerState* stopped();
const PlayerState* playing();
const PlayerState* paused();

class MediaPlayer {
public:
    int position = 0;
    const int length;
    const function<void()> onFinished;

    MediaPlayer(int length, function<void()> onFinished) : length(length), onFinished(std::move(onFinished)) {}
    string play() { state = state->play(*this); return status(); }
    string pause() { state = state->pause(*this); return status(); }
    string stop() { state = state->stop(*this); return status(); }
    string tick(int s) { state = state->tick(*this, s); return status(); }
    string status() const { return state->name() + "@" + to_string(position); }

private:
    const PlayerState* state = stopped();  // non-owning: the states are shared singletons
};

const PlayerState* PlayerState::stop(MediaPlayer& p) const { p.position = 0; return stopped(); }

class Stopped : public PlayerState {
public:
    string name() const override { return "Stopped"; }
    const PlayerState* play(MediaPlayer& p) const override { p.position = 0; return playing(); }
};
class Playing : public PlayerState {
public:
    string name() const override { return "Playing"; }
    const PlayerState* pause(MediaPlayer&) const override { return paused(); }
    const PlayerState* tick(MediaPlayer& p, int s) const override {
        p.position += s;
        if (p.position >= p.length) { p.position = 0; p.onFinished(); return stopped(); }
        return this;
    }
};
class Paused : public PlayerState {
public:
    string name() const override { return "Paused"; }
    const PlayerState* play(MediaPlayer&) const override { return playing(); }  // resume from saved position
};

const PlayerState* stopped() { static const Stopped s; return &s; }
const PlayerState* playing() { static const Playing s; return &s; }
const PlayerState* paused() { static const Paused s; return &s; }

int main() {
    MediaPlayer m(10, [] { cout << "finished!\\n"; });
    cout << m.play() << "\\n";   // Playing@0
    cout << m.tick(4) << "\\n";  // Playing@4
    cout << m.pause() << "\\n";  // Paused@4
    cout << m.tick(3) << "\\n";  // Paused@4: time is frozen
    cout << m.play() << "\\n";   // Playing@4: resumes
    cout << m.play() << "\\n";   // Playing@4: no-op
    cout << m.tick(7) << "\\n";  // finished! then Stopped@0
    cout << m.pause() << "\\n";  // Stopped@0: ignored
    cout << m.tick(1) << "\\n";  // Stopped@0: ignored
    cout << m.play() << "\\n";   // Playing@0
    cout << m.tick(2) << "\\n";  // Playing@2
    cout << m.stop() << "\\n";   // Stopped@0
}` },
  { lang: 'csharp', code: `
using System;

abstract class PlayerState {
    public abstract string Name { get; }
    public virtual PlayerState Play(MediaPlayer p)  { return this; }
    public virtual PlayerState Pause(MediaPlayer p) { return this; }
    public virtual PlayerState Tick(MediaPlayer p, int s) { return this; }
    public virtual PlayerState Stop(MediaPlayer p)  { p.Position = 0; return Stopped.I; }
}
sealed class Stopped : PlayerState {
    public static readonly Stopped I = new Stopped();
    public override string Name { get { return "Stopped"; } }
    public override PlayerState Play(MediaPlayer p) { p.Position = 0; return Playing.I; }
}
sealed class Playing : PlayerState {
    public static readonly Playing I = new Playing();
    public override string Name { get { return "Playing"; } }
    public override PlayerState Pause(MediaPlayer p) { return Paused.I; }
    public override PlayerState Tick(MediaPlayer p, int s) {
        p.Position += s;
        if (p.Position >= p.Length) { p.Position = 0; p.OnFinished(); return Stopped.I; }
        return this;
    }
}
sealed class Paused : PlayerState {
    public static readonly Paused I = new Paused();
    public override string Name { get { return "Paused"; } }
    public override PlayerState Play(MediaPlayer p) { return Playing.I; }     // resume from saved position
}

class MediaPlayer {
    public int Position; public readonly int Length; public readonly Action OnFinished;
    private PlayerState state = Stopped.I;
    public MediaPlayer(int length, Action onFinished) { Length = length; OnFinished = onFinished; }
    public string Play()       { state = state.Play(this); return Status(); }
    public string Pause()      { state = state.Pause(this); return Status(); }
    public string Stop()       { state = state.Stop(this); return Status(); }
    public string Tick(int s)  { state = state.Tick(this, s); return Status(); }
    public string Status() { return state.Name + "@" + Position; }
}

class Program {
    static void Main() {
        MediaPlayer m = new MediaPlayer(10, () => Console.WriteLine("finished!"));
        Console.WriteLine(m.Play());       // Playing@0
        Console.WriteLine(m.Tick(4));      // Playing@4
        Console.WriteLine(m.Pause());      // Paused@4
        Console.WriteLine(m.Tick(3));      // Paused@4: time is frozen
        Console.WriteLine(m.Play());       // Playing@4: resumes
        Console.WriteLine(m.Play());       // Playing@4: no-op
        Console.WriteLine(m.Tick(7));      // finished! then Stopped@0
        Console.WriteLine(m.Pause());      // Stopped@0: ignored
        Console.WriteLine(m.Tick(1));      // Stopped@0: ignored
        Console.WriteLine(m.Play());       // Playing@0
        Console.WriteLine(m.Tick(2));      // Playing@2
        Console.WriteLine(m.Stop());       // Stopped@0
    }
}` }
        ],
      complexity: `<p>O(1) per action, O(1) memory. A Buffering state = one class + overrides in Playing (to enter it) — Stopped and Paused are untouched.</p>`,
      followUps: ['Add a playlist: when a track finishes, auto-play the next (who owns that rule?)', 'Notify UI widgets of state changes (Observer)']
    }
  });

  practice.push({
    title: 'Shopping Cart: Tax and Shipping Visitors', level: 'Medium', tags: ['visitor'], companies: ['Flipkart', 'Amazon', 'Walmart'],
    statement: `<p>A cart contains <code>Book(price, grams)</code>, <code>Electronics(price, grams, fragile)</code> and <code>Grocery(price, grams, perishable)</code>. Implement two operations as visitors: <b>tax</b> (books 0%, electronics 18%, grocery 5%) and <b>shipping</b> (₹10 per 500 g or part thereof; +₹50 if fragile; +₹30 if perishable). Finance will later add "loyalty points" and "import duty" — the item classes must not change for that.</p>`,
    constraints: `Up to 10<sup>4</sup> items. Money in paise (long) to avoid floating-point errors. Item types are stable.`,
    example: `<p>Book(50000, 400) + Electronics(200000, 1200, fragile) + Grocery(10000, 900, perishable).<br>Tax = 0 + 36000 + 500 = ${H.c('g', '36500 paise')}. Shipping = 1000 + (3000 + 5000) + (2000 + 3000) = ${H.c('g', '14000 paise')} (1200 g → 3 blocks of 500 g; 900 g → 2 blocks).</p>`,
    brute: { why: `<p>Each operation is a method with a type-check ladder (<code>if (item instanceof Book) … else if (item instanceof Electronics) …</code>, or <code>isinstance</code> in Python). Tax, shipping, points and duty each repeat the same ladder; adding a new item type compiles fine even when one ladder forgets it.</p>`, code: { lang: 'java', code: `class NaiveCart {
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
}`, alt: [
              { lang: 'python', code: `
from dataclasses import dataclass

@dataclass
class Item:
    kind: str
    price: int
    grams: int

class NaiveCart:
    def tax(self, items):
        t = 0
        for i in items:
            if i.kind == "BOOK": t += 0
            elif i.kind == "ELEC": t += i.price * 18 // 100
            elif i.kind == "GROCERY": t += i.price * 5 // 100
        return t   # shipping(), points(), duty() repeat this ladder...` },
              { lang: 'ts', code: `
interface Item { kind: string; price: number; grams: number }

class NaiveCart {
    tax(items: Item[]): number {
        let t = 0;
        for (const i of items) {
            if (i.kind === "BOOK") t += 0;
            else if (i.kind === "ELEC") t += Math.floor(i.price * 18 / 100);
            else if (i.kind === "GROCERY") t += Math.floor(i.price * 5 / 100);
        }
        return t;   // shipping(), points(), duty() repeat this ladder...
    }
}` },
              { lang: 'cpp', code: `
struct Item { string kind; long long price; int grams; };

class NaiveCart {
public:
    long long tax(const vector<Item>& items) {
        long long t = 0;
        for (auto& i : items) {
            if (i.kind == "BOOK") t += 0;
            else if (i.kind == "ELEC") t += i.price * 18 / 100;
            else if (i.kind == "GROCERY") t += i.price * 5 / 100;
        }
        return t;   // shipping(), points(), duty() repeat this ladder...
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class NaiveCart {
    public sealed class Item { public readonly string Kind; public readonly long Price; public readonly int Grams; public Item(string kind, long price, int grams) { Kind = kind; Price = price; Grams = grams; } }
    public long Tax(List<Item> items) {
        long t = 0;
        foreach (Item i in items) {
            if (i.Kind == "BOOK") t += 0;
            else if (i.Kind == "ELEC") t += i.Price * 18 / 100;
            else if (i.Kind == "GROCERY") t += i.Price * 5 / 100;
        }
        return t;   // Shipping(), Points(), Duty() repeat this ladder...
    }
}` }
            ] } },
    mcq: { q: 'Finance adds "loyalty points" next sprint. With Visitor, what do you write?', options: ['One new class LoyaltyVisitor; item classes untouched', 'A points() method in each item class', 'A new instanceof ladder', 'A new item type'], answer: 0, explain: 'New operations over stable types are exactly what Visitor makes cheap.' },
    hints: [`<p>Hint 1: <code>interface CartItem { &lt;R&gt; R accept(CartVisitor&lt;R&gt; v); }</code> and a visitor with <code>visitBook</code>, <code>visitElectronics</code>, <code>visitGrocery</code>.</p>`, `<p>Hint 2: Each visitor returns the amount for one item; the cart sums <code>item.accept(visitor)</code> over all items.</p>`, `<p>Hint 3: Blocks of 500 g "or part thereof" = <code>(grams + 499) / 500</code>. Keep all money in long paise.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "tax=36500 shipping=14000\ntax=9 shipping=4000\ntax=0 shipping=0\n" }] },
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
        Cart edge = new Cart();
        edge.add(new Book(1_000, 500));          // exactly one 500 g block
        edge.add(new Book(1_000, 501));          // 1 g over: two blocks
        edge.add(new Grocery(199, 1, false));    // 5% of 199 = 9 (integer paise)
        System.out.println("tax=" + edge.total(new TaxVisitor()) + " shipping=" + edge.total(new ShippingVisitor()));   // 9 4000
        Cart empty = new Cart();
        System.out.println("tax=" + empty.total(new TaxVisitor()) + " shipping=" + empty.total(new ShippingVisitor()));   // 0 0
    }
}`, alt: [
          { lang: 'python', code: `from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Generic, TypeVar

R = TypeVar("R")


class CartVisitor(ABC, Generic[R]):
    @abstractmethod
    def visit_book(self, b: Book) -> R: ...

    @abstractmethod
    def visit_electronics(self, e: Electronics) -> R: ...

    @abstractmethod
    def visit_grocery(self, g: Grocery) -> R: ...


class CartItem(ABC):
    @abstractmethod
    def accept(self, v: CartVisitor[R]) -> R: ...


@dataclass(frozen=True)
class Book(CartItem):
    price: int
    grams: int

    def accept(self, v: CartVisitor[R]) -> R:
        return v.visit_book(self)


@dataclass(frozen=True)
class Electronics(CartItem):
    price: int
    grams: int
    fragile: bool

    def accept(self, v: CartVisitor[R]) -> R:
        return v.visit_electronics(self)


@dataclass(frozen=True)
class Grocery(CartItem):
    price: int
    grams: int
    perishable: bool

    def accept(self, v: CartVisitor[R]) -> R:
        return v.visit_grocery(self)


class TaxVisitor(CartVisitor[int]):
    def visit_book(self, b: Book) -> int:
        return 0

    def visit_electronics(self, e: Electronics) -> int:
        return e.price * 18 // 100

    def visit_grocery(self, g: Grocery) -> int:
        return g.price * 5 // 100


class ShippingVisitor(CartVisitor[int]):
    @staticmethod
    def _base(grams: int) -> int:
        return 1000 * ((grams + 499) // 500)  # Rs 10 per 500 g block

    def visit_book(self, b: Book) -> int:
        return self._base(b.grams)

    def visit_electronics(self, e: Electronics) -> int:
        return self._base(e.grams) + (5000 if e.fragile else 0)

    def visit_grocery(self, g: Grocery) -> int:
        return self._base(g.grams) + (3000 if g.perishable else 0)


class Cart:
    def __init__(self):
        self._items: list[CartItem] = []

    def add(self, item: CartItem) -> None:
        self._items.append(item)

    def total(self, v: CartVisitor[int]) -> int:
        return sum(item.accept(v) for item in self._items)


def report(c: Cart) -> str:
    return f"tax={c.total(TaxVisitor())} shipping={c.total(ShippingVisitor())}"


if __name__ == "__main__":
    c = Cart()
    c.add(Book(50_000, 400))
    c.add(Electronics(200_000, 1200, True))
    c.add(Grocery(10_000, 900, True))
    print(report(c))  # 36500 14000
    edge = Cart()
    edge.add(Book(1_000, 500))  # exactly one 500 g block
    edge.add(Book(1_000, 501))  # 1 g over: two blocks
    edge.add(Grocery(199, 1, False))  # 5% of 199 = 9 (integer paise)
    print(report(edge))  # 9 4000
    print(report(Cart()))  # 0 0` },
          { lang: 'ts', code: `interface CartVisitor<R> {
  visitBook(b: Book): R;
  visitElectronics(e: Electronics): R;
  visitGrocery(g: Grocery): R;
}

interface CartItem {
  accept<R>(v: CartVisitor<R>): R;
}

class Book implements CartItem {
  constructor(readonly price: number, readonly grams: number) {}
  accept<R>(v: CartVisitor<R>): R { return v.visitBook(this); }
}

class Electronics implements CartItem {
  constructor(readonly price: number, readonly grams: number, readonly fragile: boolean) {}
  accept<R>(v: CartVisitor<R>): R { return v.visitElectronics(this); }
}

class Grocery implements CartItem {
  constructor(readonly price: number, readonly grams: number, readonly perishable: boolean) {}
  accept<R>(v: CartVisitor<R>): R { return v.visitGrocery(this); }
}

class TaxVisitor implements CartVisitor<number> {
  visitBook(_b: Book): number { return 0; }
  visitElectronics(e: Electronics): number { return Math.floor((e.price * 18) / 100); }
  visitGrocery(g: Grocery): number { return Math.floor((g.price * 5) / 100); }
}

class ShippingVisitor implements CartVisitor<number> {
  private static base(grams: number): number { return 1000 * Math.floor((grams + 499) / 500); } // Rs 10 per 500 g block
  visitBook(b: Book): number { return ShippingVisitor.base(b.grams); }
  visitElectronics(e: Electronics): number { return ShippingVisitor.base(e.grams) + (e.fragile ? 5000 : 0); }
  visitGrocery(g: Grocery): number { return ShippingVisitor.base(g.grams) + (g.perishable ? 3000 : 0); }
}

class Cart {
  private readonly items: CartItem[] = [];
  add(i: CartItem): void { this.items.push(i); }
  total(v: CartVisitor<number>): number {
    return this.items.reduce((sum, i) => sum + i.accept(v), 0);
  }
}

const report = (c: Cart): string => \`tax=\${c.total(new TaxVisitor())} shipping=\${c.total(new ShippingVisitor())}\`;

const c = new Cart();
c.add(new Book(50_000, 400));
c.add(new Electronics(200_000, 1200, true));
c.add(new Grocery(10_000, 900, true));
console.log(report(c)); // 36500 14000
const edge = new Cart();
edge.add(new Book(1_000, 500)); // exactly one 500 g block
edge.add(new Book(1_000, 501)); // 1 g over: two blocks
edge.add(new Grocery(199, 1, false)); // 5% of 199 = 9 (integer paise)
console.log(report(edge)); // 9 4000
console.log(report(new Cart())); // 0 0` },
          { lang: 'cpp', code: `struct Book { long long price; int grams; };
struct Electronics { long long price; int grams; bool fragile; };
struct Grocery { long long price; int grams; bool perishable; };

// The closed set of item types is a std::variant; std::visit is the visitor,
// and the compiler rejects a visitor that forgets one of the types.
using CartItem = variant<Book, Electronics, Grocery>;

struct TaxVisitor {
    long long operator()(const Book&) const { return 0; }
    long long operator()(const Electronics& e) const { return e.price * 18 / 100; }
    long long operator()(const Grocery& g) const { return g.price * 5 / 100; }
};

struct ShippingVisitor {
    static long long base(int grams) { return 1000LL * ((grams + 499) / 500); }  // Rs 10 per 500 g block
    long long operator()(const Book& b) const { return base(b.grams); }
    long long operator()(const Electronics& e) const { return base(e.grams) + (e.fragile ? 5000 : 0); }
    long long operator()(const Grocery& g) const { return base(g.grams) + (g.perishable ? 3000 : 0); }
};

class Cart {
public:
    void add(CartItem i) { items.push_back(std::move(i)); }
    template <class Visitor>
    long long total(const Visitor& v) const {
        long long sum = 0;
        for (const CartItem& i : items) sum += visit(v, i);
        return sum;
    }
private:
    vector<CartItem> items;
};

string report(const Cart& c) {
    return "tax=" + to_string(c.total(TaxVisitor{})) + " shipping=" + to_string(c.total(ShippingVisitor{}));
}

int main() {
    Cart c;
    c.add(Book{50'000, 400});
    c.add(Electronics{200'000, 1200, true});
    c.add(Grocery{10'000, 900, true});
    cout << report(c) << "\\n";  // 36500 14000
    Cart edge;
    edge.add(Book{1'000, 500});  // exactly one 500 g block
    edge.add(Book{1'000, 501});  // 1 g over: two blocks
    edge.add(Grocery{199, 1, false});  // 5% of 199 = 9 (integer paise)
    cout << report(edge) << "\\n";  // 9 4000
    cout << report(Cart{}) << "\\n";  // 0 0
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

interface ICartVisitor<R> {
    R VisitBook(Book b);
    R VisitElectronics(Electronics e);
    R VisitGrocery(Grocery g);
}
interface ICartItem { R Accept<R>(ICartVisitor<R> v); }

sealed class Book : ICartItem {
    public readonly long Price; public readonly int Grams;
    public Book(long price, int grams) { Price = price; Grams = grams; }
    public R Accept<R>(ICartVisitor<R> v) { return v.VisitBook(this); }
}
sealed class Electronics : ICartItem {
    public readonly long Price; public readonly int Grams; public readonly bool Fragile;
    public Electronics(long price, int grams, bool fragile) { Price = price; Grams = grams; Fragile = fragile; }
    public R Accept<R>(ICartVisitor<R> v) { return v.VisitElectronics(this); }
}
sealed class Grocery : ICartItem {
    public readonly long Price; public readonly int Grams; public readonly bool Perishable;
    public Grocery(long price, int grams, bool perishable) { Price = price; Grams = grams; Perishable = perishable; }
    public R Accept<R>(ICartVisitor<R> v) { return v.VisitGrocery(this); }
}

class TaxVisitor : ICartVisitor<long> {
    public long VisitBook(Book b) { return 0L; }
    public long VisitElectronics(Electronics e) { return e.Price * 18 / 100; }
    public long VisitGrocery(Grocery g) { return g.Price * 5 / 100; }
}
class ShippingVisitor : ICartVisitor<long> {
    private static long Base(int grams) { return 1000L * ((grams + 499) / 500); }   // ₹10 per 500 g block
    public long VisitBook(Book b) { return Base(b.Grams); }
    public long VisitElectronics(Electronics e) { return Base(e.Grams) + (e.Fragile ? 5000 : 0); }
    public long VisitGrocery(Grocery g) { return Base(g.Grams) + (g.Perishable ? 3000 : 0); }
}

class Cart {
    private readonly List<ICartItem> items = new List<ICartItem>();
    public void Add(ICartItem i) { items.Add(i); }
    public long Total(ICartVisitor<long> v) {
        long sum = 0;
        foreach (ICartItem i in items) sum += i.Accept(v);
        return sum;
    }
}

class Program {
    static void Main() {
        Cart c = new Cart();
        c.Add(new Book(50000, 400));
        c.Add(new Electronics(200000, 1200, true));
        c.Add(new Grocery(10000, 900, true));
        Console.WriteLine("tax=" + c.Total(new TaxVisitor()) + " shipping=" + c.Total(new ShippingVisitor()));   // 36500 14000
        Cart edge = new Cart();
        edge.Add(new Book(1000, 500));          // exactly one 500 g block
        edge.Add(new Book(1000, 501));          // 1 g over: two blocks
        edge.Add(new Grocery(199, 1, false));   // 5% of 199 = 9 (integer paise)
        Console.WriteLine("tax=" + edge.Total(new TaxVisitor()) + " shipping=" + edge.Total(new ShippingVisitor()));   // 9 4000
        Cart empty = new Cart();
        Console.WriteLine("tax=" + empty.Total(new TaxVisitor()) + " shipping=" + empty.Total(new ShippingVisitor()));   // 0 0
    }
}` }
        ],
      complexity: `<p>O(N) per visitor run. New operation: one class. New item type: one method in every visitor (compiler-enforced).</p>`,
      followUps: ['Rewrite with a sealed interface and switch — compare the amount of code', 'Tax rules differ by state/country — combine Visitor with a Strategy per region']
    }
  });

  practice.push({
    title: 'Payment Processing Template', level: 'Medium', tags: ['template method', 'hooks'], companies: ['Razorpay', 'Stripe', 'PayPal'],
    statement: `<p>Every payment method follows: <b>validate amount</b> → <b>fraud check</b> (optional per method) → <b>debit</b> (method-specific) → <b>apply fee</b> (method-specific, default 0) → <b>write receipt</b>. Card: 2% fee, always fraud-checked (reject amounts &gt; ₹1,00,000). UPI: no fee, fraud check only above ₹2,000. Wallet: no fraud check, fails if wallet balance is insufficient. The order of steps must be enforced for all methods, including ones added later.</p>`,
    constraints: `Amounts in paise (long) &gt; 0. Fraud and debit failures must return a failed result, never throw to the caller.`,
    example: `<p>Card ₹500 → ${H.c('g', 'OK, fee ₹10')}. UPI ₹1,500 → ${H.c('g', 'OK, fraud check skipped')}. Card ₹2,00,000 → ${H.c('r', 'FRAUD_REJECTED')}. Wallet ₹900 with balance ₹800 → ${H.c('r', 'DEBIT_FAILED')}.</p>`,
    brute: { why: `<p>Three classes each implementing the full flow. One forgets amount validation, another writes the receipt before the debit succeeds, and a compliance change ("log every fraud decision") must be applied three times. The <i>order of steps</i> is a business rule but nobody enforces it.</p>`, code: { lang: 'java', code: `class NaiveCardPayment {
    String pay(long amt) {
        String receipt = "receipt " + amt;              // written BEFORE debit: wrong order
        if (amt > 10_000_000) return "FRAUD_REJECTED";
        System.out.println("debit card " + amt);
        return receipt + " fee " + amt * 2 / 100;       // forgot to validate amt > 0
    }
}
// NaiveUpiPayment, NaiveWalletPayment: same flow pasted with different mistakes.`, alt: [
              { lang: 'python', code: `
class NaiveCardPayment:
    def pay(self, amt):
        receipt = f"receipt {amt}"              # written BEFORE debit: wrong order
        if amt > 10_000_000: return "FRAUD_REJECTED"
        print("debit card", amt)
        return f"{receipt} fee {amt * 2 // 100}"       # forgot to validate amt > 0
# NaiveUpiPayment, NaiveWalletPayment: same flow pasted with different mistakes.` },
              { lang: 'ts', code: `
class NaiveCardPayment {
    pay(amt: number): string {
        const receipt = "receipt " + amt;              // written BEFORE debit: wrong order
        if (amt > 10_000_000) return "FRAUD_REJECTED";
        console.log("debit card " + amt);
        return receipt + " fee " + Math.floor(amt * 2 / 100);       // forgot to validate amt > 0
    }
}
// NaiveUpiPayment, NaiveWalletPayment: same flow pasted with different mistakes.` },
              { lang: 'cpp', code: `
class NaiveCardPayment {
public:
    string pay(long long amt) {
        string receipt = "receipt " + to_string(amt);              // written BEFORE debit: wrong order
        if (amt > 10000000) return "FRAUD_REJECTED";
        cout << "debit card " << amt << "\\n";
        return receipt + " fee " + to_string(amt * 2 / 100);       // forgot to validate amt > 0
    }
};
// NaiveUpiPayment, NaiveWalletPayment: same flow pasted with different mistakes.` },
  { lang: 'csharp', code: `
using System;

class NaiveCardPayment {
    public string Pay(long amt) {
        string receipt = "receipt " + amt;              // written BEFORE debit: wrong order
        if (amt > 10000000) return "FRAUD_REJECTED";
        Console.WriteLine("debit card " + amt);
        return receipt + " fee " + amt * 2 / 100;       // forgot to validate amt > 0
    }
}
// NaiveUpiPayment, NaiveWalletPayment: same flow pasted with different mistakes.` }
            ] } },
    mcq: { q: 'UPI wants to skip fraud checks for small amounts. How should it express that?', options: ['Override a hook like needsFraudCheck(amount) that the template calls', 'Override the whole pay() method', 'Add an if in the base class for UPI', 'Catch the fraud exception'], answer: 0, explain: 'Hooks let subclasses switch optional steps on/off while the base keeps the order and the mandatory steps.' },
    hints: [`<p>Hint 1: <code>public final PaymentResult pay(long amount)</code> in an abstract <code>PaymentProcessor</code>.</p>`, `<p>Hint 2: Abstract: <code>debit(amount)</code> returning boolean. Hooks: <code>needsFraudCheck(amount)</code> (default true), <code>fee(amount)</code> (default 0).</p>`, `<p>Hint 3: Shared private steps: validate, fraudCheck (limit rule), receipt. Return a record <code>PaymentResult(status, fee)</code> with an enum status.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "receipt: 50000 fee 1000\ncard 50000: OK fee 1000\nreceipt: 150000 fee 0\nupi 150000: OK fee 0\nupi 20000000: FRAUD_REJECTED fee 0\ncard 20000000: FRAUD_REJECTED fee 0\nwallet 90000: DEBIT_FAILED fee 0\nreceipt: 50000 fee 0\nwallet 50000: OK fee 0\nwallet 50000: DEBIT_FAILED fee 0\ncard 0: INVALID_AMOUNT fee 0\nflaky 1000: DEBIT_FAILED fee 0\n" }] },
      solution: {
      approach: `<p>The base class fixes the flow in a <code>pay()</code> that subclasses cannot override (<code>final</code> in Java, non-virtual in C++, <code>@final</code> in Python): validate → (hook) fraud check → abstract debit → (hook) fee → receipt. A gateway that throws inside <code>debit</code> is turned into <code>DEBIT_FAILED</code>, so the caller never sees an exception. Mandatory steps are private, so no subclass can skip them; optional behaviour is expressed through hooks with safe defaults. A new payment method is a small subclass, and a compliance change to the flow is made once.</p>`,
      code: `enum PayStatus { OK, INVALID_AMOUNT, FRAUD_REJECTED, DEBIT_FAILED }
record PaymentResult(PayStatus status, long fee) {}

abstract class PaymentProcessor {
    public final PaymentResult pay(long amount) {
        if (amount <= 0) return new PaymentResult(PayStatus.INVALID_AMOUNT, 0);
        if (needsFraudCheck(amount) && !fraudCheck(amount)) return new PaymentResult(PayStatus.FRAUD_REJECTED, 0);
        boolean debited;
        try { debited = debit(amount); }
        catch (RuntimeException e) { debited = false; }                   // a crashing gateway is a failed debit, never an exception to the caller
        if (!debited) return new PaymentResult(PayStatus.DEBIT_FAILED, 0);
        long fee = fee(amount);
        writeReceipt(amount, fee);
        return new PaymentResult(PayStatus.OK, fee);
    }
    protected abstract boolean debit(long amount);
    protected boolean needsFraudCheck(long amount) { return true; }   // hook
    protected long fee(long amount) { return 0; }                     // hook
    private boolean fraudCheck(long amount) { return amount <= 10_000_000; }   // ₹1,00,000 in paise
    private void writeReceipt(long amount, long fee) {
        System.out.println("receipt: " + amount + " fee " + fee);
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

class FlakyPayment extends PaymentProcessor {
    protected boolean debit(long amount) { throw new IllegalStateException("gateway down"); }
}

class PayDemo {
    static void show(String label, long amount, PaymentResult r) {
        System.out.println(label + " " + amount + ": " + r.status() + " fee " + r.fee());
    }

    public static void main(String[] args) {
        show("card", 50_000, new CardPayment().pay(50_000));
        show("upi", 150_000, new UpiPayment().pay(150_000));            // below the UPI fraud threshold: check skipped
        show("upi", 20_000_000, new UpiPayment().pay(20_000_000));      // above it: fraud check applies and fails
        show("card", 20_000_000, new CardPayment().pay(20_000_000));
        WalletPayment wallet = new WalletPayment(80_000);
        show("wallet", 90_000, wallet.pay(90_000));
        show("wallet", 50_000, wallet.pay(50_000));
        show("wallet", 50_000, wallet.pay(50_000));                      // only 30,000 left
        show("card", 0, new CardPayment().pay(0));
        show("flaky", 1_000, new FlakyPayment().pay(1_000));
    }
}`, alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum, auto
from typing import final


class PayStatus(Enum):
    OK = auto()
    INVALID_AMOUNT = auto()
    FRAUD_REJECTED = auto()
    DEBIT_FAILED = auto()


@dataclass(frozen=True)
class PaymentResult:
    status: PayStatus
    fee: int


class PaymentProcessor(ABC):
    @final
    def pay(self, amount: int) -> PaymentResult:  # the template method: order of steps is fixed
        if amount <= 0:
            return PaymentResult(PayStatus.INVALID_AMOUNT, 0)
        if self.needs_fraud_check(amount) and not self._fraud_check(amount):
            return PaymentResult(PayStatus.FRAUD_REJECTED, 0)
        try:
            debited = self.debit(amount)
        except Exception:  # a crashing gateway is a failed debit, never an exception to the caller
            debited = False
        if not debited:
            return PaymentResult(PayStatus.DEBIT_FAILED, 0)
        fee = self.fee(amount)
        self._write_receipt(amount, fee)
        return PaymentResult(PayStatus.OK, fee)

    @abstractmethod
    def debit(self, amount: int) -> bool: ...

    def needs_fraud_check(self, amount: int) -> bool:  # hook
        return True

    def fee(self, amount: int) -> int:  # hook
        return 0

    def _fraud_check(self, amount: int) -> bool:
        return amount <= 10_000_000  # Rs 1,00,000 in paise

    def _write_receipt(self, amount: int, fee: int) -> None:
        print(f"receipt: {amount} fee {fee}")


class CardPayment(PaymentProcessor):
    def debit(self, amount: int) -> bool:
        return True  # call card network

    def fee(self, amount: int) -> int:
        return amount * 2 // 100


class UpiPayment(PaymentProcessor):
    def debit(self, amount: int) -> bool:
        return True

    def needs_fraud_check(self, amount: int) -> bool:
        return amount > 200_000


class WalletPayment(PaymentProcessor):
    def __init__(self, balance: int):
        self._balance = balance

    def debit(self, amount: int) -> bool:
        if amount > self._balance:
            return False
        self._balance -= amount
        return True

    def needs_fraud_check(self, amount: int) -> bool:
        return False


class FlakyPayment(PaymentProcessor):
    def debit(self, amount: int) -> bool:
        raise RuntimeError("gateway down")


def show(label: str, amount: int, r: PaymentResult) -> None:
    print(f"{label} {amount}: {r.status.name} fee {r.fee}")


if __name__ == "__main__":
    show("card", 50_000, CardPayment().pay(50_000))
    show("upi", 150_000, UpiPayment().pay(150_000))  # below the UPI fraud threshold: check skipped
    show("upi", 20_000_000, UpiPayment().pay(20_000_000))  # above it: fraud check applies and fails
    show("card", 20_000_000, CardPayment().pay(20_000_000))
    wallet = WalletPayment(80_000)
    show("wallet", 90_000, wallet.pay(90_000))
    show("wallet", 50_000, wallet.pay(50_000))
    show("wallet", 50_000, wallet.pay(50_000))  # only 30,000 left
    show("card", 0, CardPayment().pay(0))
    show("flaky", 1_000, FlakyPayment().pay(1_000))` },
          { lang: 'ts', code: `enum PayStatus { OK, INVALID_AMOUNT, FRAUD_REJECTED, DEBIT_FAILED }

interface PaymentResult { readonly status: PayStatus; readonly fee: number; }

abstract class PaymentProcessor {
  // The template method: order of steps is fixed. Subclasses must not override it.
  pay(amount: number): PaymentResult {
    if (amount <= 0) return { status: PayStatus.INVALID_AMOUNT, fee: 0 };
    if (this.needsFraudCheck(amount) && !this.fraudCheck(amount)) return { status: PayStatus.FRAUD_REJECTED, fee: 0 };
    let debited: boolean;
    try { debited = this.debit(amount); }
    catch { debited = false; } // a crashing gateway is a failed debit, never an exception to the caller
    if (!debited) return { status: PayStatus.DEBIT_FAILED, fee: 0 };
    const fee = this.fee(amount);
    this.writeReceipt(amount, fee);
    return { status: PayStatus.OK, fee };
  }

  protected abstract debit(amount: number): boolean;
  protected needsFraudCheck(_amount: number): boolean { return true; } // hook
  protected fee(_amount: number): number { return 0; } // hook
  private fraudCheck(amount: number): boolean { return amount <= 10_000_000; } // Rs 1,00,000 in paise
  private writeReceipt(amount: number, fee: number): void { console.log(\`receipt: \${amount} fee \${fee}\`); }
}

class CardPayment extends PaymentProcessor {
  protected debit(_amount: number): boolean { return true; } // call card network
  protected override fee(amount: number): number { return Math.floor((amount * 2) / 100); }
}

class UpiPayment extends PaymentProcessor {
  protected debit(_amount: number): boolean { return true; }
  protected override needsFraudCheck(amount: number): boolean { return amount > 200_000; }
}

class WalletPayment extends PaymentProcessor {
  constructor(private balance: number) { super(); }
  protected debit(amount: number): boolean {
    if (amount > this.balance) return false;
    this.balance -= amount;
    return true;
  }
  protected override needsFraudCheck(_amount: number): boolean { return false; }
}

class FlakyPayment extends PaymentProcessor {
  protected debit(_amount: number): boolean { throw new Error("gateway down"); }
}

function show(label: string, amount: number, r: PaymentResult): void {
  console.log(\`\${label} \${amount}: \${PayStatus[r.status]} fee \${r.fee}\`);
}

show("card", 50_000, new CardPayment().pay(50_000));
show("upi", 150_000, new UpiPayment().pay(150_000)); // below the UPI fraud threshold: check skipped
show("upi", 20_000_000, new UpiPayment().pay(20_000_000)); // above it: fraud check applies and fails
show("card", 20_000_000, new CardPayment().pay(20_000_000));
const wallet = new WalletPayment(80_000);
show("wallet", 90_000, wallet.pay(90_000));
show("wallet", 50_000, wallet.pay(50_000));
show("wallet", 50_000, wallet.pay(50_000)); // only 30,000 left
show("card", 0, new CardPayment().pay(0));
show("flaky", 1_000, new FlakyPayment().pay(1_000));` },
          { lang: 'cpp', code: `enum class PayStatus { OK, INVALID_AMOUNT, FRAUD_REJECTED, DEBIT_FAILED };

string name(PayStatus s) {
    switch (s) {
        case PayStatus::OK: return "OK";
        case PayStatus::INVALID_AMOUNT: return "INVALID_AMOUNT";
        case PayStatus::FRAUD_REJECTED: return "FRAUD_REJECTED";
        case PayStatus::DEBIT_FAILED: return "DEBIT_FAILED";
    }
    return "?";
}

struct PaymentResult { PayStatus status; long long fee; };

class PaymentProcessor {
public:
    virtual ~PaymentProcessor() = default;

    // The template method: non-virtual, so the order of steps cannot be overridden.
    PaymentResult pay(long long amount) {
        if (amount <= 0) return {PayStatus::INVALID_AMOUNT, 0};
        if (needsFraudCheck(amount) && !fraudCheck(amount)) return {PayStatus::FRAUD_REJECTED, 0};
        bool debited;
        try { debited = debit(amount); }
        catch (const exception&) { debited = false; }  // a crashing gateway is a failed debit, never an exception to the caller
        if (!debited) return {PayStatus::DEBIT_FAILED, 0};
        long long f = fee(amount);
        writeReceipt(amount, f);
        return {PayStatus::OK, f};
    }

protected:
    virtual bool debit(long long amount) = 0;
    virtual bool needsFraudCheck(long long) const { return true; }  // hook
    virtual long long fee(long long) const { return 0; }            // hook

private:
    bool fraudCheck(long long amount) const { return amount <= 10'000'000; }  // Rs 1,00,000 in paise
    void writeReceipt(long long amount, long long f) const { cout << "receipt: " << amount << " fee " << f << "\\n"; }
};

class CardPayment : public PaymentProcessor {
protected:
    bool debit(long long) override { return true; }  // call card network
    long long fee(long long amount) const override { return amount * 2 / 100; }
};

class UpiPayment : public PaymentProcessor {
protected:
    bool debit(long long) override { return true; }
    bool needsFraudCheck(long long amount) const override { return amount > 200'000; }
};

class WalletPayment : public PaymentProcessor {
public:
    explicit WalletPayment(long long balance) : balance(balance) {}
protected:
    bool debit(long long amount) override {
        if (amount > balance) return false;
        balance -= amount;
        return true;
    }
    bool needsFraudCheck(long long) const override { return false; }
private:
    long long balance;
};

class FlakyPayment : public PaymentProcessor {
protected:
    bool debit(long long) override { throw runtime_error("gateway down"); }
};

void show(const string& label, long long amount, const PaymentResult& r) {
    cout << label << " " << amount << ": " << name(r.status) << " fee " << r.fee << "\\n";
}

int main() {
    show("card", 50'000, CardPayment().pay(50'000));
    show("upi", 150'000, UpiPayment().pay(150'000));            // below the UPI fraud threshold: check skipped
    show("upi", 20'000'000, UpiPayment().pay(20'000'000));      // above it: fraud check applies and fails
    show("card", 20'000'000, CardPayment().pay(20'000'000));
    WalletPayment wallet(80'000);
    show("wallet", 90'000, wallet.pay(90'000));
    show("wallet", 50'000, wallet.pay(50'000));
    show("wallet", 50'000, wallet.pay(50'000));                  // only 30,000 left
    show("card", 0, CardPayment().pay(0));
    show("flaky", 1'000, FlakyPayment().pay(1'000));
}` },
  { lang: 'csharp', code: `
using System;

enum PayStatus { OK, INVALID_AMOUNT, FRAUD_REJECTED, DEBIT_FAILED }
sealed class PaymentResult {
    public readonly PayStatus Status; public readonly long Fee;
    public PaymentResult(PayStatus status, long fee) { Status = status; Fee = fee; }
}

abstract class PaymentProcessor {
    public PaymentResult Pay(long amount) {                                 // the template method: fixed order
        if (amount <= 0) return new PaymentResult(PayStatus.INVALID_AMOUNT, 0);
        if (NeedsFraudCheck(amount) && !FraudCheck(amount)) return new PaymentResult(PayStatus.FRAUD_REJECTED, 0);
        bool debited;
        try { debited = Debit(amount); }
        catch (Exception) { debited = false; }                             // a crashing gateway is a failed debit, never an exception to the caller
        if (!debited) return new PaymentResult(PayStatus.DEBIT_FAILED, 0);
        long fee = Fee(amount);
        WriteReceipt(amount, fee);
        return new PaymentResult(PayStatus.OK, fee);
    }
    protected abstract bool Debit(long amount);
    protected virtual bool NeedsFraudCheck(long amount) { return true; }   // hook
    protected virtual long Fee(long amount) { return 0; }                  // hook
    private bool FraudCheck(long amount) { return amount <= 10000000; }    // ₹1,00,000 in paise
    private void WriteReceipt(long amount, long fee) {
        Console.WriteLine("receipt: " + amount + " fee " + fee);
    }
}

class CardPayment : PaymentProcessor {
    protected override bool Debit(long amount) { return true; }            // call card network
    protected override long Fee(long amount) { return amount * 2 / 100; }
}
class UpiPayment : PaymentProcessor {
    protected override bool Debit(long amount) { return true; }
    protected override bool NeedsFraudCheck(long amount) { return amount > 200000; }
}
class WalletPayment : PaymentProcessor {
    private long balance;
    public WalletPayment(long balance) { this.balance = balance; }
    protected override bool Debit(long amount) {
        if (amount > balance) return false;
        balance -= amount; return true;
    }
    protected override bool NeedsFraudCheck(long amount) { return false; }
}

class FlakyPayment : PaymentProcessor {
    protected override bool Debit(long amount) { throw new InvalidOperationException("gateway down"); }
}

class Program {
    static void Show(string label, long amount, PaymentResult r) {
        Console.WriteLine(label + " " + amount + ": " + r.Status + " fee " + r.Fee);
    }

    static void Main() {
        Show("card", 50000, new CardPayment().Pay(50000));
        Show("upi", 150000, new UpiPayment().Pay(150000));              // below the UPI fraud threshold: check skipped
        Show("upi", 20000000, new UpiPayment().Pay(20000000));          // above it: fraud check applies and fails
        Show("card", 20000000, new CardPayment().Pay(20000000));
        WalletPayment wallet = new WalletPayment(80000);
        Show("wallet", 90000, wallet.Pay(90000));
        Show("wallet", 50000, wallet.Pay(50000));
        Show("wallet", 50000, wallet.Pay(50000));                        // only 30,000 left
        Show("card", 0, new CardPayment().Pay(0));
        Show("flaky", 1000, new FlakyPayment().Pay(1000));
    }
}` }
        ],
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
    brute: { why: `<p>On <code>begin()</code> push a <b>full copy</b> of the map (a full memento); rollback pops and restores it. Correct and simple, but begin is O(N): with 10<sup>6</sup> keys and frequent short transactions, you copy millions of entries to change one. Memory explodes with nesting.</p>`, code: { lang: 'java', code: `class CopyingStore {
    private Map<String, String> data = new HashMap<>();
    private final Deque<Map<String, String>> snapshots = new ArrayDeque<>();
    void set(String k, String v) { data.put(k, v); }
    String get(String k) { return data.get(k); }
    void begin() { snapshots.push(new HashMap<>(data)); }          // O(N) every time
    boolean rollback() { if (snapshots.isEmpty()) return false; data = snapshots.pop(); return true; }
    boolean commit() { if (snapshots.isEmpty()) return false; snapshots.pop(); return true; }
}`, alt: [
              { lang: 'python', code: `
class CopyingStore:
    def __init__(self):
        self._data = {}
        self._snapshots = []
    def set(self, k, v): self._data[k] = v
    def get(self, k): return self._data.get(k)
    def begin(self): self._snapshots.append(dict(self._data))          # O(N) every time
    def rollback(self):
        if not self._snapshots: return False
        self._data = self._snapshots.pop(); return True
    def commit(self):
        if not self._snapshots: return False
        self._snapshots.pop(); return True` },
              { lang: 'ts', code: `
class CopyingStore {
    private data = new Map<string, string>();
    private readonly snapshots: Map<string, string>[] = [];
    set(k: string, v: string): void { this.data.set(k, v); }
    get(k: string): string | undefined { return this.data.get(k); }
    begin(): void { this.snapshots.push(new Map(this.data)); }          // O(N) every time
    rollback(): boolean { if (this.snapshots.length === 0) return false; this.data = this.snapshots.pop()!; return true; }
    commit(): boolean { if (this.snapshots.length === 0) return false; this.snapshots.pop(); return true; }
}` },
              { lang: 'cpp', code: `
class CopyingStore {
    unordered_map<string, string> data;
    vector<unordered_map<string, string>> snapshots;
public:
    void set(const string& k, const string& v) { data[k] = v; }
    optional<string> get(const string& k) { auto it = data.find(k); return it == data.end() ? nullopt : optional<string>(it->second); }
    void begin() { snapshots.push_back(data); }          // O(N) every time
    bool rollback() { if (snapshots.empty()) return false; data = snapshots.back(); snapshots.pop_back(); return true; }
    bool commit() { if (snapshots.empty()) return false; snapshots.pop_back(); return true; }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class CopyingStore {
    private Dictionary<string, string> data = new Dictionary<string, string>();
    private readonly Stack<Dictionary<string, string>> snapshots = new Stack<Dictionary<string, string>>();
    public void Set(string k, string v) { data[k] = v; }
    public string Get(string k) { string v; return data.TryGetValue(k, out v) ? v : null; }
    public void Begin() { snapshots.Push(new Dictionary<string, string>(data)); }   // O(N) every time
    public bool Rollback() { if (snapshots.Count == 0) return false; data = snapshots.Pop(); return true; }
    public bool Commit() { if (snapshots.Count == 0) return false; snapshots.Pop(); return true; }
}` }
            ] } },
    mcq: { q: 'Inside one transaction, key a is set three times. What should the undo log keep for a?', options: ['Only its value before the FIRST change in this transaction', 'All three old values', 'Only the latest value', 'Nothing; rollback re-reads the database'], answer: 0, explain: 'Rollback must restore the state at begin(); the first old value is all that is needed. Recording it once per key per transaction keeps the log O(keys touched).' },
    hints: [`<p>Hint 1: A <b>delta memento</b>: each transaction keeps a <code>Map&lt;key, oldValue&gt;</code> recorded the first time it touches a key. A sentinel marks "key did not exist".</p>`, `<p>Hint 2: rollback: for each entry, restore the old value (or remove the key if the sentinel). commit: merge the child log into the parent with <code>putIfAbsent</code> (the parent's older value wins); if outermost, just drop it.</p>`, `<p>Hint 3: Use <code>Optional</code> or a private static final Object ABSENT as the sentinel. Stack of logs = <code>Deque&lt;Map&lt;String,Object&gt;&gt;</code>.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "null 1\n20 null\n20 false\n20\nfalse\nnull null\n5\n" }] },
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
        System.out.println(s.commit());                      // false: no open transaction
        s.begin(); s.delete("zzz"); s.set("c", "7"); s.rollback();
        System.out.println(s.get("zzz") + " " + s.get("c")); // null null
        s.begin(); s.set("a", "5"); s.begin(); s.set("a", "6"); s.rollback(); s.commit();
        System.out.println(s.get("a"));                      // 5: inner rollback keeps the outer change
    }
}`, alt: [
          { lang: 'python', code: `_ABSENT = object()  # "the key did not exist" (None could be a real stored value)


class TxStore:
    def __init__(self):
        self._data: dict[str, str] = {}
        self._logs: list[dict[str, object]] = []  # one undo log per open transaction

    def get(self, k: str) -> str | None:
        return self._data.get(k)

    def set(self, k: str, v: str) -> None:
        self._remember(k)
        self._data[k] = v

    def delete(self, k: str) -> None:
        self._remember(k)
        self._data.pop(k, None)

    def _remember(self, k: str) -> None:
        if self._logs and k not in self._logs[-1]:
            self._logs[-1][k] = self._data.get(k, _ABSENT)  # first touch in this transaction only

    def begin(self) -> None:  # O(1)
        self._logs.append({})

    def rollback(self) -> bool:
        if not self._logs:
            return False
        for k, old in self._logs.pop().items():
            if old is _ABSENT:
                self._data.pop(k, None)
            else:
                self._data[k] = old  # type: ignore[assignment]
        return True

    def commit(self) -> bool:
        if not self._logs:
            return False
        log = self._logs.pop()
        if self._logs:
            for k, old in log.items():
                self._logs[-1].setdefault(k, old)  # parent keeps its OLDER value
        return True


def show(v: object) -> str:
    return "null" if v is None else str(v).lower() if isinstance(v, bool) else str(v)


if __name__ == "__main__":
    s = TxStore()
    s.set("a", "10")
    s.begin(); s.set("a", "20")
    s.begin(); s.delete("a"); s.set("b", "1")
    print(show(s.get("a")), show(s.get("b")))  # null 1
    s.rollback()
    print(show(s.get("a")), show(s.get("b")))  # 20 null
    s.commit()
    print(show(s.get("a")), show(s.rollback()))  # 20 false
    s.begin(); s.set("a", "30"); s.begin(); s.set("a", "40"); s.commit(); s.rollback()
    print(show(s.get("a")))  # 20 (outer rollback undoes both)
    print(show(s.commit()))  # false: no open transaction
    s.begin(); s.delete("zzz"); s.set("c", "7"); s.rollback()
    print(show(s.get("zzz")), show(s.get("c")))  # null null
    s.begin(); s.set("a", "5"); s.begin(); s.set("a", "6"); s.rollback(); s.commit()
    print(show(s.get("a")))  # 5: inner rollback keeps the outer change` },
          { lang: 'ts', code: `const ABSENT = Symbol("absent"); // "the key did not exist" (undefined could be confused with a missing entry)

class TxStore {
  private readonly data = new Map<string, string>();
  private readonly logs: Map<string, string | typeof ABSENT>[] = []; // one undo log per open transaction

  get(k: string): string | null { return this.data.get(k) ?? null; }

  set(k: string, v: string): void { this.remember(k); this.data.set(k, v); }

  delete(k: string): void { this.remember(k); this.data.delete(k); }

  private remember(k: string): void {
    const log = this.logs[this.logs.length - 1];
    if (log !== undefined && !log.has(k)) log.set(k, this.data.get(k) ?? ABSENT); // first touch in this transaction only
  }

  begin(): void { this.logs.push(new Map()); } // O(1)

  rollback(): boolean {
    const log = this.logs.pop();
    if (log === undefined) return false;
    for (const [k, old] of log) {
      if (old === ABSENT) this.data.delete(k);
      else this.data.set(k, old);
    }
    return true;
  }

  commit(): boolean {
    const log = this.logs.pop();
    if (log === undefined) return false;
    const parent = this.logs[this.logs.length - 1];
    if (parent !== undefined) {
      for (const [k, old] of log) if (!parent.has(k)) parent.set(k, old); // parent keeps its OLDER value
    }
    return true;
  }
}

const s = new TxStore();
s.set("a", "10");
s.begin(); s.set("a", "20");
s.begin(); s.delete("a"); s.set("b", "1");
console.log(\`\${s.get("a")} \${s.get("b")}\`); // null 1
s.rollback();
console.log(\`\${s.get("a")} \${s.get("b")}\`); // 20 null
s.commit();
console.log(\`\${s.get("a")} \${s.rollback()}\`); // 20 false
s.begin(); s.set("a", "30"); s.begin(); s.set("a", "40"); s.commit(); s.rollback();
console.log(\`\${s.get("a")}\`); // 20 (outer rollback undoes both)
console.log(\`\${s.commit()}\`); // false: no open transaction
s.begin(); s.delete("zzz"); s.set("c", "7"); s.rollback();
console.log(\`\${s.get("zzz")} \${s.get("c")}\`); // null null
s.begin(); s.set("a", "5"); s.begin(); s.set("a", "6"); s.rollback(); s.commit();
console.log(\`\${s.get("a")}\`); // 5: inner rollback keeps the outer change` },
          { lang: 'cpp', code: `class TxStore {
public:
    optional<string> get(const string& k) const {
        auto it = data.find(k);
        return it == data.end() ? nullopt : optional<string>(it->second);
    }

    void set(const string& k, const string& v) { remember(k); data[k] = v; }
    void del(const string& k) { remember(k); data.erase(k); }  // \`delete\` is a C++ keyword

    void begin() { logs.emplace_back(); }  // O(1)

    bool rollback() {
        if (logs.empty()) return false;
        for (auto& [k, old] : logs.back()) {
            if (old) data[k] = *old;
            else data.erase(k);
        }
        logs.pop_back();
        return true;
    }

    bool commit() {
        if (logs.empty()) return false;
        auto log = std::move(logs.back());
        logs.pop_back();
        if (!logs.empty())
            for (auto& [k, old] : log) logs.back().try_emplace(k, old);  // parent keeps its OLDER value
        return true;
    }

private:
    using UndoLog = unordered_map<string, optional<string>>;  // nullopt = the key did not exist

    void remember(const string& k) {
        if (logs.empty()) return;
        auto it = data.find(k);
        logs.back().try_emplace(k, it == data.end() ? nullopt : optional<string>(it->second));  // first touch only
    }

    unordered_map<string, string> data;
    vector<UndoLog> logs;  // one undo log per open transaction
};

string show(const optional<string>& v) { return v ? *v : "null"; }

int main() {
    TxStore s;
    s.set("a", "10");
    s.begin(); s.set("a", "20");
    s.begin(); s.del("a"); s.set("b", "1");
    cout << show(s.get("a")) << " " << show(s.get("b")) << "\\n";  // null 1
    s.rollback();
    cout << show(s.get("a")) << " " << show(s.get("b")) << "\\n";  // 20 null
    s.commit();
    string a = show(s.get("a"));
    cout << boolalpha << a << " " << s.rollback() << "\\n";  // 20 false
    s.begin(); s.set("a", "30"); s.begin(); s.set("a", "40"); s.commit(); s.rollback();
    cout << show(s.get("a")) << "\\n";  // 20 (outer rollback undoes both)
    cout << s.commit() << "\\n";  // false: no open transaction
    s.begin(); s.del("zzz"); s.set("c", "7"); s.rollback();
    cout << show(s.get("zzz")) << " " << show(s.get("c")) << "\\n";  // null null
    s.begin(); s.set("a", "5"); s.begin(); s.set("a", "6"); s.rollback(); s.commit();
    cout << show(s.get("a")) << "\\n";  // 5: inner rollback keeps the outer change
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class TxStore {
    private static readonly object Absent = new object();
    private readonly Dictionary<string, string> data = new Dictionary<string, string>();
    private readonly Stack<Dictionary<string, object>> logs = new Stack<Dictionary<string, object>>();

    public string Get(string k) { string v; return data.TryGetValue(k, out v) ? v : null; }

    public void Set(string k, string v) { Remember(k); data[k] = v; }
    public void Delete(string k) { Remember(k); data.Remove(k); }

    private void Remember(string k) {
        if (logs.Count == 0) return;
        Dictionary<string, object> log = logs.Peek();
        if (!log.ContainsKey(k)) log[k] = data.ContainsKey(k) ? (object)data[k] : Absent;
    }

    public void Begin() { logs.Push(new Dictionary<string, object>()); }           // O(1)

    public bool Rollback() {
        if (logs.Count == 0) return false;
        Dictionary<string, object> log = logs.Pop();
        foreach (var e in log) {
            if (e.Value == Absent) data.Remove(e.Key);
            else data[e.Key] = (string)e.Value;
        }
        return true;
    }

    public bool Commit() {
        if (logs.Count == 0) return false;
        Dictionary<string, object> log = logs.Pop();
        if (logs.Count > 0) {
            Dictionary<string, object> parent = logs.Peek();
            foreach (var e in log) if (!parent.ContainsKey(e.Key)) parent[e.Key] = e.Value;   // parent keeps its OLDER value
        }
        return true;
    }
}

class Program {
    static string S(string v) { return v ?? "null"; }
    static string B(bool b) { return b.ToString().ToLower(); }
    static void Main() {
        TxStore s = new TxStore();
        s.Set("a", "10");
        s.Begin(); s.Set("a", "20");
        s.Begin(); s.Delete("a"); s.Set("b", "1");
        Console.WriteLine(S(s.Get("a")) + " " + S(s.Get("b")));   // null 1
        s.Rollback();
        Console.WriteLine(S(s.Get("a")) + " " + S(s.Get("b")));   // 20 null
        s.Commit();
        Console.WriteLine(S(s.Get("a")) + " " + B(s.Rollback())); // 20 false
        s.Begin(); s.Set("a", "30"); s.Begin(); s.Set("a", "40"); s.Commit(); s.Rollback();
        Console.WriteLine(S(s.Get("a")));                         // 20 (outer rollback undoes both)
        Console.WriteLine(B(s.Commit()));                         // false: no open transaction
        s.Begin(); s.Delete("zzz"); s.Set("c", "7"); s.Rollback();
        Console.WriteLine(S(s.Get("zzz")) + " " + S(s.Get("c"))); // null null
        s.Begin(); s.Set("a", "5"); s.Begin(); s.Set("a", "6"); s.Rollback(); s.Commit();
        Console.WriteLine(S(s.Get("a")));                         // 5: inner rollback keeps the outer change
    }
}` }
        ],
      complexity: `<p>get/set/delete O(1) average; begin O(1); rollback/commit O(keys touched in that transaction). Memory O(total keys touched across open transactions).</p>`,
      followUps: ['Add count(value) in O(1) that also respects rollback (maintain a value→count map, logged the same way)', 'Make it thread-safe with snapshot isolation (MVCC)', 'Persist with a write-ahead log for crash recovery']
    }
  });

  practice.push({
    title: 'HTTP Middleware Pipeline with Ordering and Error Handling', level: 'Hard', tags: ['chain of responsibility', 'middleware'], companies: ['Cloudflare', 'Netflix', 'Shopify'],
    statement: `<p>Build a <code>Server</code> where middlewares are registered with an <b>order number</b> (lower runs first, ties by registration order). Each middleware receives the request and a <code>next</code> function; it may modify the request, short-circuit with its own response, call next and then modify the response (add headers). Required middlewares: <b>ErrorBoundary</b> (outermost; converts any exception into 500), <b>Auth</b> (401 without a token), <b>RateLimit</b> (429 after N requests per client), <b>Timing</b> (adds an <code>X-Time-Us</code> header). The final handler routes to an endpoint.</p>`,
    constraints: `Up to 20 middlewares; requests from many threads; middlewares must be stateless or thread-safe. Build the chain once, not per request.`,
    example: `<p>No token → ${H.c('r', '401')} (endpoint never runs). Token, 3rd request with limit 2 → ${H.c('r', '429')}. Token, endpoint throws → ${H.c('r', '500 from ErrorBoundary')}. Normal → ${H.c('g', '200 with X-Time-Us header')}.</p>`,
    brute: { why: `<p>One giant <code>handle()</code> with sequential if-blocks: try { if (!token) return 401; if (rate…) return 429; long t = …; resp = route(); resp.header(…) } catch … Every new concern edits it; ordering is implicit in code position; post-processing (headers) and short-circuits interleave confusingly; nothing can be reused in another service.</p>`, code: { lang: 'java', code: `class NaiveServer {
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
}`, alt: [
              { lang: 'python', code: `
import time

class NaiveServer:
    def __init__(self): self.hits = {}
    def handle(self, token, client, path):
        try:
            if token is None: return "401"
            self.hits[client] = self.hits.get(client, 0) + 1
            if self.hits[client] > 2: return "429"   # not thread-safe either
            t0 = time.perf_counter()
            if path == "/boom": raise RuntimeError("bug")
            body = "200 " + path
            return body + " X-Time-Us=" + str(int((time.perf_counter() - t0) * 1e6))
        except RuntimeError:
            return "500"` },
              { lang: 'ts', code: `
class NaiveServer {
    readonly hits = new Map<string, number>();
    handle(token: string | null, client: string, path: string): string {
        try {
            if (token === null) return "401";
            const n = (this.hits.get(client) ?? 0) + 1;
            this.hits.set(client, n);
            if (n > 2) return "429";   // not safe under concurrent requests either
            const t0 = performance.now();
            if (path === "/boom") throw new Error("bug");
            const body = "200 " + path;
            return body + " X-Time-Us=" + Math.floor((performance.now() - t0) * 1000);
        } catch (e) { return "500"; }
    }
}` },
              { lang: 'cpp', code: `
class NaiveServer {
    unordered_map<string, int> hits;
public:
    string handle(const string* token, const string& client, const string& path) {
        try {
            if (token == nullptr) return "401";
            if (++hits[client] > 2) return "429";   // not thread-safe either
            auto t0 = chrono::steady_clock::now();
            if (path == "/boom") throw runtime_error("bug");
            string body = "200 " + path;
            return body + " X-Time-Us=" + to_string(chrono::duration_cast<chrono::microseconds>(chrono::steady_clock::now() - t0).count());
        } catch (const runtime_error&) { return "500"; }
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Diagnostics;

class NaiveServer {
    readonly Dictionary<string, int> hits = new Dictionary<string, int>();
    public string Handle(string token, string client, string path) {
        try {
            if (token == null) return "401";
            int n; hits.TryGetValue(client, out n); hits[client] = ++n;
            if (n > 2) return "429";                                       // not thread-safe either
            Stopwatch sw = Stopwatch.StartNew();
            if (path == "/boom") throw new InvalidOperationException("bug");
            string body = "200 " + path;
            return body + " X-Time-Us=" + sw.Elapsed.Ticks / 10;
        } catch (Exception) { return "500"; }
    }
}` }
            ] } },
    mcq: { q: 'Why must ErrorBoundary be the OUTERMOST middleware?', options: ['So exceptions thrown by any inner middleware or the endpoint propagate up into its try/catch', 'Because it is the fastest', 'So it runs after the response is sent', 'Order does not matter'], answer: 0, explain: 'In the onion model, a middleware can only catch exceptions from what runs inside its next() call. Outermost = wraps everything.' },
    hints: [`<p>Hint 1: <code>interface Middleware { Response handle(Request r, Function&lt;Request, Response&gt; next); }</code>. Store (order, seq, middleware) and sort once.</p>`, `<p>Hint 2: Pre-compose the chain into a single <code>Function&lt;Request, Response&gt;</code> by folding from the innermost: <code>f = r -&gt; m.handle(r, inner)</code>.</p>`, `<p>Hint 3: Responses with headers: an immutable record with a <code>withHeader</code> method. RateLimit uses <code>ConcurrentHashMap.merge</code>. Mark the chain "built" and rebuild if a middleware is added later.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "401 login headers=[X-Time-Us]\n200 ok /a headers=[X-Time-Us]\n500 error: endpoint bug headers=[]\n200 ok /a headers=[X-Time-Us]\n429 slow down headers=[X-Time-Us]\n200 /CAB headers=[]\n" }] },
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

record Entry(int order, int seq, Mw mw) {}

class Server {
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

    static String show(Resp r) {
        return r.status() + " " + r.body() + " headers=[" + String.join(",", r.headers().keySet()) + "]";
    }

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
        System.out.println(show(s.handle(new Req("/a", null, "c1"))));   // 401: Auth stops it, Timing still wraps it
        System.out.println(show(s.handle(new Req("/a", "t", "c1"))));    // 200
        System.out.println(show(s.handle(new Req("/boom", "t", "c2")))); // 500 from the error boundary
        System.out.println(show(s.handle(new Req("/a", "t", "c1"))));    // 200 (2nd counted request)
        System.out.println(show(s.handle(new Req("/a", "t", "c1"))));    // 429 (3rd)
        // equal order numbers keep registration order; lower numbers run first
        Server t = new Server(r -> new Resp(200, r.path()));
        t.use(5, (r, next) -> next.apply(new Req(r.path() + "A", r.token(), r.client())))
         .use(5, (r, next) -> next.apply(new Req(r.path() + "B", r.token(), r.client())))
         .use(1, (r, next) -> next.apply(new Req(r.path() + "C", r.token(), r.client())));
        System.out.println(show(t.handle(new Req("/", null, "c"))));     // /CAB
    }
}`, alt: [
          { lang: 'python', code: `import threading
import time
from dataclasses import dataclass, field, replace
from typing import Callable, Optional


@dataclass(frozen=True)
class Req:
    path: str
    token: Optional[str]
    client: str


@dataclass(frozen=True)
class Resp:
    status: int
    body: str
    headers: dict[str, str] = field(default_factory=dict)

    def with_header(self, k: str, v: str) -> "Resp":
        return replace(self, headers={**self.headers, k: v})  # new object, old one untouched


Handler = Callable[[Req], Resp]
Mw = Callable[[Req, Handler], Resp]  # (request, next) -> response


def _wrap(mw: Mw, inner: Handler) -> Handler:
    return lambda r: mw(r, inner)  # a helper, so each closure keeps its own mw/inner


class Server:
    def __init__(self, endpoint: Handler):
        self._endpoint = endpoint
        self._entries: list[tuple[int, int, Mw]] = []  # (order, registration sequence, middleware)
        self._chain: Optional[Handler] = None
        self._lock = threading.Lock()

    def use(self, order: int, mw: Mw) -> "Server":
        with self._lock:
            self._entries.append((order, len(self._entries), mw))
            self._chain = None
        return self

    def _build(self) -> Handler:
        with self._lock:
            if self._chain is None:
                f = self._endpoint
                for _, _, mw in sorted(self._entries, key=lambda e: (e[0], e[1]), reverse=True):  # fold innermost -> outermost
                    f = _wrap(mw, f)
                self._chain = f
            return self._chain

    def handle(self, r: Req) -> Resp:
        return (self._chain or self._build())(r)


def show(r: Resp) -> str:
    return f"{r.status} {r.body} headers=[{','.join(r.headers)}]"


if __name__ == "__main__":
    hits: dict[str, int] = {}

    def endpoint(r: Req) -> Resp:
        if r.path == "/boom":
            raise RuntimeError("endpoint bug")
        return Resp(200, "ok " + r.path)

    def rate_limit(r: Req, nxt: Handler) -> Resp:
        hits[r.client] = hits.get(r.client, 0) + 1
        return Resp(429, "slow down") if hits[r.client] > 2 else nxt(r)

    def auth(r: Req, nxt: Handler) -> Resp:
        return Resp(401, "login") if r.token is None else nxt(r)

    def error_boundary(r: Req, nxt: Handler) -> Resp:
        try:
            return nxt(r)
        except Exception as e:
            return Resp(500, f"error: {e}")

    def timing(r: Req, nxt: Handler) -> Resp:
        t = time.perf_counter_ns()
        res = nxt(r)
        return res.with_header("X-Time-Us", str((time.perf_counter_ns() - t) // 1000))

    s = Server(endpoint)
    s.use(30, rate_limit).use(20, auth).use(0, error_boundary).use(10, timing)
    print(show(s.handle(Req("/a", None, "c1"))))  # 401: Auth stops it, Timing still wraps it
    print(show(s.handle(Req("/a", "t", "c1"))))  # 200
    print(show(s.handle(Req("/boom", "t", "c2"))))  # 500 from the error boundary
    print(show(s.handle(Req("/a", "t", "c1"))))  # 200 (2nd counted request)
    print(show(s.handle(Req("/a", "t", "c1"))))  # 429 (3rd)
    # equal order numbers keep registration order; lower numbers run first
    def append(letter: str) -> Mw:
        return lambda r, nxt: nxt(replace(r, path=r.path + letter))

    t = Server(lambda r: Resp(200, r.path))
    t.use(5, append("A")).use(5, append("B")).use(1, append("C"))
    print(show(t.handle(Req("/", None, "c"))))  # /CAB` },
          { lang: 'ts', code: `interface Req { readonly path: string; readonly token: string | null; readonly client: string; }

class Resp {
  constructor(
    readonly status: number,
    readonly body: string,
    readonly headers: ReadonlyMap<string, string> = new Map(),
  ) {}
  withHeader(k: string, v: string): Resp {
    return new Resp(this.status, this.body, new Map(this.headers).set(k, v)); // new object, old one untouched
  }
}

type Handler = (r: Req) => Resp;
type Mw = (r: Req, next: Handler) => Resp;

class Server {
  private readonly entries: { order: number; seq: number; mw: Mw }[] = [];
  private chain: Handler | null = null;

  constructor(private readonly endpoint: Handler) {}

  use(order: number, mw: Mw): this {
    this.entries.push({ order, seq: this.entries.length, mw });
    this.chain = null;
    return this;
  }

  private build(): Handler {
    const sorted = [...this.entries].sort((a, b) => a.order - b.order || a.seq - b.seq);
    let f: Handler = this.endpoint;
    for (let i = sorted.length - 1; i >= 0; i--) { // fold innermost -> outermost
      const { mw } = sorted[i];
      const inner = f;
      f = (r) => mw(r, inner);
    }
    return (this.chain = f);
  }

  handle(r: Req): Resp { return (this.chain ?? this.build())(r); }
}

const show = (r: Resp): string => \`\${r.status} \${r.body} headers=[\${[...r.headers.keys()].join(",")}]\`;

const hits = new Map<string, number>();
const s = new Server((r) => {
  if (r.path === "/boom") throw new Error("endpoint bug");
  return new Resp(200, "ok " + r.path);
});
s.use(30, (r, next) => {
  const n = (hits.get(r.client) ?? 0) + 1;
  hits.set(r.client, n);
  return n > 2 ? new Resp(429, "slow down") : next(r);
})
  .use(20, (r, next) => (r.token === null ? new Resp(401, "login") : next(r)))
  .use(0, (r, next) => {
    try { return next(r); }
    catch (e) { return new Resp(500, "error: " + (e as Error).message); }
  })
  .use(10, (r, next) => {
    const t = Date.now();
    return next(r).withHeader("X-Time-Us", String((Date.now() - t) * 1000)); // ms clock, reported in microseconds
  });
console.log(show(s.handle({ path: "/a", token: null, client: "c1" }))); // 401: Auth stops it, Timing still wraps it
console.log(show(s.handle({ path: "/a", token: "t", client: "c1" }))); // 200
console.log(show(s.handle({ path: "/boom", token: "t", client: "c2" }))); // 500 from the error boundary
console.log(show(s.handle({ path: "/a", token: "t", client: "c1" }))); // 200 (2nd counted request)
console.log(show(s.handle({ path: "/a", token: "t", client: "c1" }))); // 429 (3rd)
// equal order numbers keep registration order; lower numbers run first
const append = (letter: string): Mw => (r, next) => next({ ...r, path: r.path + letter });
const t = new Server((r) => new Resp(200, r.path));
t.use(5, append("A")).use(5, append("B")).use(1, append("C"));
console.log(show(t.handle({ path: "/", token: null, client: "c" }))); // /CAB` },
          { lang: 'cpp', code: `struct Req { string path; optional<string> token; string client; };

struct Resp {
    int status;
    string body;
    map<string, string> headers;
    Resp withHeader(const string& k, const string& v) const {  // copy: the original is untouched
        Resp copy = *this;
        copy.headers[k] = v;
        return copy;
    }
};

using Handler = function<Resp(const Req&)>;
using Mw = function<Resp(const Req&, const Handler&)>;  // (request, next) -> response

class Server {
public:
    explicit Server(Handler endpoint) : endpoint(std::move(endpoint)) {}

    Server& use(int order, Mw mw) {
        entries.push_back({order, int(entries.size()), std::move(mw)});
        chain = nullptr;
        return *this;
    }

    Resp handle(const Req& r) {
        if (!chain) chain = build();
        return chain(r);
    }

private:
    struct Entry { int order; int seq; Mw mw; };

    Handler build() const {
        vector<Entry> sorted = entries;
        sort(sorted.begin(), sorted.end(), [](const Entry& a, const Entry& b) {
            return tie(a.order, a.seq) < tie(b.order, b.seq);
        });
        Handler f = endpoint;
        for (auto it = sorted.rbegin(); it != sorted.rend(); ++it)  // fold innermost -> outermost
            f = [mw = it->mw, inner = f](const Req& r) { return mw(r, inner); };
        return f;
    }

    Handler endpoint;
    vector<Entry> entries;
    Handler chain;
};

string show(const Resp& r) {
    string keys;
    for (const auto& [k, v] : r.headers) keys += (keys.empty() ? "" : ",") + k;
    return to_string(r.status) + " " + r.body + " headers=[" + keys + "]";
}

Mw append(char letter) {
    return [letter](const Req& r, const Handler& next) {
        Req changed = r;
        changed.path += letter;
        return next(changed);
    };
}

int main() {
    map<string, int> hits;
    Server s([](const Req& r) {
        if (r.path == "/boom") throw runtime_error("endpoint bug");
        return Resp{200, "ok " + r.path, {}};
    });
    s.use(30, [&](const Req& r, const Handler& next) {
         return ++hits[r.client] > 2 ? Resp{429, "slow down", {}} : next(r);
     })
     .use(20, [](const Req& r, const Handler& next) { return r.token ? next(r) : Resp{401, "login", {}}; })
     .use(0, [](const Req& r, const Handler& next) {
         try { return next(r); }
         catch (const exception& e) { return Resp{500, string("error: ") + e.what(), {}}; }
     })
     .use(10, [](const Req& r, const Handler& next) {
         auto t = chrono::steady_clock::now();
         Resp res = next(r);
         auto us = chrono::duration_cast<chrono::microseconds>(chrono::steady_clock::now() - t).count();
         return res.withHeader("X-Time-Us", to_string(us));
     });
    cout << show(s.handle({"/a", nullopt, "c1"})) << "\\n";  // 401: Auth stops it, Timing still wraps it
    cout << show(s.handle({"/a", "t", "c1"})) << "\\n";      // 200
    cout << show(s.handle({"/boom", "t", "c2"})) << "\\n";   // 500 from the error boundary
    cout << show(s.handle({"/a", "t", "c1"})) << "\\n";      // 200 (2nd counted request)
    cout << show(s.handle({"/a", "t", "c1"})) << "\\n";      // 429 (3rd)
    // equal order numbers keep registration order; lower numbers run first
    Server t([](const Req& r) { return Resp{200, r.path, {}}; });
    t.use(5, append('A')).use(5, append('B')).use(1, append('C'));
    cout << show(t.handle({"/", nullopt, "c"})) << "\\n";  // /CAB
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;

sealed class Req {
    public readonly string Path, Token, Client;
    public Req(string path, string token, string client) { Path = path; Token = token; Client = client; }
}
sealed class Resp {
    public readonly int Status; public readonly string Body; public readonly IReadOnlyList<KeyValuePair<string, string>> Headers;
    public Resp(int status, string body) : this(status, body, new List<KeyValuePair<string, string>>()) { }
    private Resp(int status, string body, List<KeyValuePair<string, string>> headers) { Status = status; Body = body; Headers = headers; }
    public Resp WithHeader(string k, string v) {
        List<KeyValuePair<string, string>> h = new List<KeyValuePair<string, string>>(Headers); h.Add(new KeyValuePair<string, string>(k, v));
        return new Resp(Status, Body, h);
    }
}
delegate Resp Mw(Req r, Func<Req, Resp> next);

sealed class Entry {
    public readonly int Order, Seq; public readonly Mw Mw;
    public Entry(int order, int seq, Mw mw) { Order = order; Seq = seq; Mw = mw; }
}

class Server {
    private readonly List<Entry> entries = new List<Entry>();
    private readonly Func<Req, Resp> endpoint;
    private volatile Func<Req, Resp> chain;
    private readonly object gate = new object();

    public Server(Func<Req, Resp> endpoint) { this.endpoint = endpoint; }

    public Server Use(int order, Mw mw) { lock (gate) { entries.Add(new Entry(order, entries.Count, mw)); chain = null; } return this; }

    private Func<Req, Resp> Build() {
        lock (gate) {
            if (chain != null) return chain;
            List<Entry> sorted = entries.OrderBy(e => e.Order).ThenBy(e => e.Seq).ToList();
            Func<Req, Resp> f = endpoint;
            for (int i = sorted.Count - 1; i >= 0; i--) {          // fold innermost -> outermost
                Mw m = sorted[i].Mw; Func<Req, Resp> inner = f;
                f = r => m(r, inner);
            }
            return chain = f;
        }
    }

    public Resp Handle(Req r) { Func<Req, Resp> c = chain; return (c ?? Build())(r); }

    public static string Show(Resp r) {
        return r.Status + " " + r.Body + " headers=[" + string.Join(",", r.Headers.Select(h => h.Key)) + "]";
    }
}

class Program {
    static void Main() {
        ConcurrentDictionary<string, int> hits = new ConcurrentDictionary<string, int>();
        Server s = new Server(r => {
            if (r.Path == "/boom") throw new InvalidOperationException("endpoint bug");
            return new Resp(200, "ok " + r.Path);
        });
        s.Use(30, (r, next) => hits.AddOrUpdate(r.Client, 1, (k, n) => n + 1) > 2 ? new Resp(429, "slow down") : next(r))
         .Use(20, (r, next) => r.Token == null ? new Resp(401, "login") : next(r))
         .Use(0, (r, next) => { try { return next(r); } catch (Exception e) { return new Resp(500, "error: " + e.Message); } })
         .Use(10, (r, next) => { Stopwatch sw = Stopwatch.StartNew(); Resp res = next(r); return res.WithHeader("X-Time-Us", (sw.Elapsed.Ticks / 10).ToString()); });
        Console.WriteLine(Server.Show(s.Handle(new Req("/a", null, "c1"))));   // 401: Auth stops it, Timing still wraps it
        Console.WriteLine(Server.Show(s.Handle(new Req("/a", "t", "c1"))));    // 200
        Console.WriteLine(Server.Show(s.Handle(new Req("/boom", "t", "c2")))); // 500 from the error boundary
        Console.WriteLine(Server.Show(s.Handle(new Req("/a", "t", "c1"))));    // 200 (2nd counted request)
        Console.WriteLine(Server.Show(s.Handle(new Req("/a", "t", "c1"))));    // 429 (3rd)
        // equal order numbers keep registration order; lower numbers run first
        Server t = new Server(r => new Resp(200, r.Path));
        t.Use(5, (r, next) => next(new Req(r.Path + "A", r.Token, r.Client)))
         .Use(5, (r, next) => next(new Req(r.Path + "B", r.Token, r.Client)))
         .Use(1, (r, next) => next(new Req(r.Path + "C", r.Token, r.Client)));
        Console.WriteLine(Server.Show(t.Handle(new Req("/", null, "c"))));     // /CAB
    }
}` }
        ],
      complexity: `<p>Build: O(M log M) once. Per request: O(M) middleware calls, zero chain allocation. Rate limiter O(1) per request.</p>`,
      followUps: ['Make per-route middleware (only /admin needs an extra role check)', 'Add async (CompletableFuture) middlewares without blocking threads', 'How does this map to Servlet filters / Spring Security?']
    }
  });

  practice.push({
    title: 'Notification Dispatcher (Observer + Strategy + Chain Fallback)', level: 'Hard', tags: ['observer', 'strategy', 'chain of responsibility', 'machine coding'], companies: ['Swiggy', 'Uber', 'Airbnb', 'Amazon'],
    statement: `<p>Services publish domain events (e.g. <code>ORDER_SHIPPED</code>, <code>PAYMENT_FAILED</code>). Users subscribe to event types. Each user has an ordered list of preferred channels (e.g. PUSH → SMS → EMAIL). When an event is published, every subscribed user must be notified through the <b>first channel that succeeds</b> (a channel may fail: no device token, SMS gateway down). Record a delivery log (user, event, channel or FAILED). New channels (WhatsApp) and new event types must be addable without modifying the dispatcher.</p>`,
    constraints: `Up to 10<sup>5</sup> users, 50 event types. Publishing for one type must not scan users of other types. Channel implementations may throw; treat that as failure.`,
    example: `<p>Asha subscribes ORDER_SHIPPED with [PUSH, SMS]; Ben with [SMS, EMAIL]. SMS gateway is down. publish(ORDER_SHIPPED) → Asha: ${H.c('g', 'PUSH ok')}; Ben: SMS ${H.c('r', 'fails')} → ${H.c('g', 'EMAIL ok')}. If all channels fail → log ${H.c('r', 'FAILED')} for retry later.</p>`,
    brute: { why: `<p>A dispatcher with a switch over event types and, inside, nested if/else per user preference: <code>if (pref == "PUSH") { if (!push(u)) { if (second == "SMS") … } }</code>. Fallback depth is hard-coded, channels are concrete calls, all users are scanned for each event, and adding WhatsApp touches every branch.</p>`, code: { lang: 'java', code: `class NaiveDispatcher {
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
}`, alt: [
              { lang: 'python', code: `
class U:
    def __init__(self, name, type, first, second): self.name, self.type, self.first, self.second = name, type, first, second

class NaiveDispatcher:
    def __init__(self): self.users = []
    def send(self, channel, u): return channel != "SMS"           # pretend SMS is down
    def publish(self, type):
        for u in self.users:                                       # scans everyone
            if u.type != type: continue
            if u.first == "PUSH":
                if not self.send("PUSH", u) and u.second == "EMAIL": self.send("EMAIL", u)
            elif u.first == "SMS":
                if not self.send("SMS", u) and u.second == "EMAIL": self.send("EMAIL", u)
            # fallback depth fixed at 2, WhatsApp = more branches` },
              { lang: 'ts', code: `
interface U { name: string; type: string; first: string; second: string }

class NaiveDispatcher {
    readonly users: U[] = [];
    send(channel: string, u: U): boolean { return channel !== "SMS"; }           // pretend SMS is down
    publish(type: string): void {
        for (const u of this.users) {                                            // scans everyone
            if (u.type !== type) continue;
            if (u.first === "PUSH") { if (!this.send("PUSH", u) && u.second === "EMAIL") this.send("EMAIL", u); }
            else if (u.first === "SMS") { if (!this.send("SMS", u) && u.second === "EMAIL") this.send("EMAIL", u); }
            // fallback depth fixed at 2, WhatsApp = more branches
        }
    }
}` },
              { lang: 'cpp', code: `
struct U { string name, type, first, second; };

class NaiveDispatcher {
public:
    vector<U> users;
    bool send(const string& channel, const U& u) { return channel != "SMS"; }           // pretend SMS is down
    void publish(const string& type) {
        for (auto& u : users) {                                                          // scans everyone
            if (u.type != type) continue;
            if (u.first == "PUSH") { if (!send("PUSH", u) && u.second == "EMAIL") send("EMAIL", u); }
            else if (u.first == "SMS") { if (!send("SMS", u) && u.second == "EMAIL") send("EMAIL", u); }
            // fallback depth fixed at 2, WhatsApp = more branches
        }
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class NaiveDispatcher {
    public sealed class U { public readonly string Name, Type, First, Second; public U(string name, string type, string first, string second) { Name = name; Type = type; First = first; Second = second; } }
    public readonly List<U> Users = new List<U>();
    bool Send(string channel, U u) { return channel != "SMS"; }                      // pretend SMS is down
    public void Publish(string type) {
        foreach (U u in Users) {                                                     // scans everyone
            if (u.Type != type) continue;
            if (u.First == "PUSH") { if (!Send("PUSH", u) && u.Second == "EMAIL") Send("EMAIL", u); }
            else if (u.First == "SMS") { if (!Send("SMS", u) && u.Second == "EMAIL") Send("EMAIL", u); }
            // fallback depth fixed at 2, WhatsApp = more branches
        }
    }
}` }
            ] } },
    mcq: { q: 'Which pattern decides "try PUSH, then SMS, then EMAIL until one works"?', options: ['Chain of Responsibility built per user from their preference list', 'Observer', 'Visitor', 'Memento'], answer: 0, explain: 'Each channel handler either succeeds (stops) or passes to the next. Observer decides WHO hears the event; Strategy encapsulates HOW each channel sends; the chain decides WHICH channel ends up delivering.' },
    hints: [`<p>Hint 1: Three questions, three patterns: who receives (Observer, keyed by event type), how a channel sends (Strategy: <code>Channel.send(user, msg)</code>), which channel wins (Chain: try in order until success).</p>`, `<p>Hint 2: Registry <code>Map&lt;String, Channel&gt;</code> lets new channels plug in by name. Subscriptions: <code>Map&lt;EventType, List&lt;Subscription&gt;&gt;</code> where a subscription holds the user and their ordered channel names.</p>`, `<p>Hint 3: The fallback loop catches exceptions per channel; log the winning channel or FAILED. Use concurrent collections; deliver asynchronously in production (mention it).</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "push  -> asha [ORDER_SHIPPED] A1 is on the way\nSMS threw for ben: gateway down\nemail -> ben [ORDER_SHIPPED] A1 is on the way\nSMS threw for cy: gateway down\nemail -> ben [PAYMENT_FAILED] card declined\nemail -> dan [PAYMENT_FAILED] card declined\nasha ORDER_SHIPPED PUSH\nben ORDER_SHIPPED EMAIL\ncy ORDER_SHIPPED FAILED\nben PAYMENT_FAILED EMAIL\ndan PAYMENT_FAILED EMAIL\n" }] },
      solution: {
      approach: `<p><b>Observer:</b> the dispatcher keeps subscriptions per event type, so publish touches only interested users. <b>Strategy:</b> each channel implements <code>Channel</code> and is registered by name — WhatsApp is a new class plus one <code>register</code> call. <b>Chain of Responsibility:</b> for each user, channels are tried in the user's preference order; a channel that returns false or throws passes the job to the next; the first success stops the chain. Every attempt result goes to a delivery log for retries and analytics.</p>`,
      code: `record Event(String type, String payload) {}
record Delivery(String user, String eventType, String channel) {}

interface Channel { boolean send(String user, String message); }

record Subscription(String user, List<String> channelOrder) {}

class NotificationDispatcher {
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
        d.publish(new Event("PAYMENT_FAILED", "nobody subscribed"));      // no subscribers: nothing happens
        d.subscribe("ben", "PAYMENT_FAILED", List.of("PUSH", "EMAIL"));  // PUSH returns false for ben
        d.subscribe("dan", "PAYMENT_FAILED", List.of("FAX", "EMAIL"));   // FAX is not registered: skipped
        d.publish(new Event("PAYMENT_FAILED", "card declined"));
        d.log.forEach(x -> System.out.println(x.user() + " " + x.eventType() + " " + x.channel()));
    }
}`, alt: [
          { lang: 'python', code: `from dataclasses import dataclass
from typing import Callable

Channel = Callable[[str, str], bool]  # (user, message) -> delivered?


@dataclass(frozen=True)
class Event:
    type: str
    payload: str


@dataclass(frozen=True)
class Delivery:
    user: str
    event_type: str
    channel: str


@dataclass(frozen=True)
class Subscription:
    user: str
    channel_order: tuple[str, ...]


class NotificationDispatcher:
    def __init__(self):
        self._channels: dict[str, Channel] = {}
        self._subs: dict[str, list[Subscription]] = {}
        self.log: list[Delivery] = []

    def register_channel(self, name: str, channel: Channel) -> None:  # Strategy registry
        self._channels[name] = channel

    def subscribe(self, user: str, event_type: str, channel_order: list[str]) -> None:  # Observer
        self._subs.setdefault(event_type, []).append(Subscription(user, tuple(channel_order)))

    def publish(self, e: Event) -> None:
        for s in list(self._subs.get(e.type, [])):
            winner = self._deliver(s, f"[{e.type}] {e.payload}")
            self.log.append(Delivery(s.user, e.type, winner))

    # Chain of Responsibility: first channel that succeeds handles it.
    def _deliver(self, s: Subscription, msg: str) -> str:
        for name in s.channel_order:
            channel = self._channels.get(name)
            if channel is None:  # unknown channel: skip
                continue
            try:
                if channel(s.user, msg):
                    return name
            except Exception as ex:
                print(f"{name} threw for {s.user}: {ex}")
        return "FAILED"


def push(user: str, msg: str) -> bool:
    if user == "ben":
        return False
    print(f"push  -> {user} {msg}")
    return True


def sms(user: str, msg: str) -> bool:
    raise RuntimeError("gateway down")


def email(user: str, msg: str) -> bool:
    print(f"email -> {user} {msg}")
    return True


if __name__ == "__main__":
    d = NotificationDispatcher()
    d.register_channel("PUSH", push)
    d.register_channel("SMS", sms)
    d.register_channel("EMAIL", email)
    d.subscribe("asha", "ORDER_SHIPPED", ["PUSH", "SMS"])
    d.subscribe("ben", "ORDER_SHIPPED", ["SMS", "EMAIL"])
    d.subscribe("cy", "ORDER_SHIPPED", ["SMS"])
    d.publish(Event("ORDER_SHIPPED", "A1 is on the way"))
    d.publish(Event("PAYMENT_FAILED", "nobody subscribed"))  # no subscribers: nothing happens
    d.subscribe("ben", "PAYMENT_FAILED", ["PUSH", "EMAIL"])  # PUSH returns False for ben
    d.subscribe("dan", "PAYMENT_FAILED", ["FAX", "EMAIL"])  # FAX is not registered: skipped
    d.publish(Event("PAYMENT_FAILED", "card declined"))
    for x in d.log:
        print(x.user, x.event_type, x.channel)` },
          { lang: 'ts', code: `// Named DomainEvent because Event is a built-in DOM type.
interface DomainEvent { readonly type: string; readonly payload: string; }
interface Delivery { readonly user: string; readonly eventType: string; readonly channel: string; }
interface Subscription { readonly user: string; readonly channelOrder: readonly string[]; }

type Channel = (user: string, message: string) => boolean; // delivered?

class NotificationDispatcher {
  private readonly channels = new Map<string, Channel>();
  private readonly subs = new Map<string, Subscription[]>();
  readonly log: Delivery[] = [];

  registerChannel(name: string, c: Channel): void { this.channels.set(name, c); } // Strategy registry

  subscribe(user: string, eventType: string, channelOrder: readonly string[]): void { // Observer
    const list = this.subs.get(eventType) ?? [];
    list.push({ user, channelOrder: [...channelOrder] });
    this.subs.set(eventType, list);
  }

  publish(e: DomainEvent): void {
    for (const s of [...(this.subs.get(e.type) ?? [])]) {
      const winner = this.deliver(s, \`[\${e.type}] \${e.payload}\`);
      this.log.push({ user: s.user, eventType: e.type, channel: winner });
    }
  }

  // Chain of Responsibility: first channel that succeeds handles it.
  private deliver(s: Subscription, msg: string): string {
    for (const name of s.channelOrder) {
      const c = this.channels.get(name);
      if (c === undefined) continue; // unknown channel: skip
      try { if (c(s.user, msg)) return name; }
      catch (ex) { console.log(\`\${name} threw for \${s.user}: \${(ex as Error).message}\`); }
    }
    return "FAILED";
  }
}

const d = new NotificationDispatcher();
d.registerChannel("PUSH", (u, m) => {
  if (u === "ben") return false;
  console.log(\`push  -> \${u} \${m}\`);
  return true;
});
d.registerChannel("SMS", () => { throw new Error("gateway down"); });
d.registerChannel("EMAIL", (u, m) => { console.log(\`email -> \${u} \${m}\`); return true; });
d.subscribe("asha", "ORDER_SHIPPED", ["PUSH", "SMS"]);
d.subscribe("ben", "ORDER_SHIPPED", ["SMS", "EMAIL"]);
d.subscribe("cy", "ORDER_SHIPPED", ["SMS"]);
d.publish({ type: "ORDER_SHIPPED", payload: "A1 is on the way" });
d.publish({ type: "PAYMENT_FAILED", payload: "nobody subscribed" }); // no subscribers: nothing happens
d.subscribe("ben", "PAYMENT_FAILED", ["PUSH", "EMAIL"]); // PUSH returns false for ben
d.subscribe("dan", "PAYMENT_FAILED", ["FAX", "EMAIL"]); // FAX is not registered: skipped
d.publish({ type: "PAYMENT_FAILED", payload: "card declined" });
for (const x of d.log) console.log(\`\${x.user} \${x.eventType} \${x.channel}\`);` },
          { lang: 'cpp', code: `struct Event { string type; string payload; };
struct Delivery { string user; string eventType; string channel; };

using Channel = function<bool(const string& user, const string& message)>;  // delivered?

class NotificationDispatcher {
public:
    vector<Delivery> log;

    void registerChannel(const string& name, Channel c) { channels[name] = std::move(c); }  // Strategy registry

    void subscribe(const string& user, const string& eventType, vector<string> channelOrder) {  // Observer
        subs[eventType].push_back({user, std::move(channelOrder)});
    }

    void publish(const Event& e) {
        auto it = subs.find(e.type);
        if (it == subs.end()) return;
        for (const Subscription& s : vector<Subscription>(it->second)) {  // iterate a copy
            string winner = deliver(s, "[" + e.type + "] " + e.payload);
            log.push_back({s.user, e.type, winner});
        }
    }

private:
    struct Subscription { string user; vector<string> channelOrder; };

    // Chain of Responsibility: first channel that succeeds handles it.
    string deliver(const Subscription& s, const string& msg) {
        for (const string& name : s.channelOrder) {
            auto it = channels.find(name);
            if (it == channels.end()) continue;  // unknown channel: skip
            try { if (it->second(s.user, msg)) return name; }
            catch (const exception& ex) { cout << name << " threw for " << s.user << ": " << ex.what() << "\\n"; }
        }
        return "FAILED";
    }

    map<string, Channel> channels;
    map<string, vector<Subscription>> subs;
};

int main() {
    NotificationDispatcher d;
    d.registerChannel("PUSH", [](const string& u, const string& m) {
        if (u == "ben") return false;
        cout << "push  -> " << u << " " << m << "\\n";
        return true;
    });
    d.registerChannel("SMS", [](const string&, const string&) -> bool { throw runtime_error("gateway down"); });
    d.registerChannel("EMAIL", [](const string& u, const string& m) {
        cout << "email -> " << u << " " << m << "\\n";
        return true;
    });
    d.subscribe("asha", "ORDER_SHIPPED", {"PUSH", "SMS"});
    d.subscribe("ben", "ORDER_SHIPPED", {"SMS", "EMAIL"});
    d.subscribe("cy", "ORDER_SHIPPED", {"SMS"});
    d.publish({"ORDER_SHIPPED", "A1 is on the way"});
    d.publish({"PAYMENT_FAILED", "nobody subscribed"});      // no subscribers: nothing happens
    d.subscribe("ben", "PAYMENT_FAILED", {"PUSH", "EMAIL"});  // PUSH returns false for ben
    d.subscribe("dan", "PAYMENT_FAILED", {"FAX", "EMAIL"});   // FAX is not registered: skipped
    d.publish({"PAYMENT_FAILED", "card declined"});
    for (const auto& x : d.log) cout << x.user << " " << x.eventType << " " << x.channel << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;

sealed class Event { public readonly string Type, Payload; public Event(string type, string payload) { Type = type; Payload = payload; } }
sealed class Delivery {
    public readonly string User, EventType, Channel;
    public Delivery(string user, string eventType, string channel) { User = user; EventType = eventType; Channel = channel; }
}

delegate bool Channel(string user, string message);

sealed class Subscription {
    public readonly string User; public readonly IReadOnlyList<string> ChannelOrder;
    public Subscription(string user, List<string> channelOrder) { User = user; ChannelOrder = new List<string>(channelOrder).AsReadOnly(); }
}

class NotificationDispatcher {
    private readonly ConcurrentDictionary<string, Channel> channels = new ConcurrentDictionary<string, Channel>();
    private readonly ConcurrentDictionary<string, List<Subscription>> subs = new ConcurrentDictionary<string, List<Subscription>>();
    private readonly object gate = new object();
    public readonly List<Delivery> Log = new List<Delivery>();

    public void RegisterChannel(string name, Channel c) { channels[name] = c; }           // Strategy registry

    public void Subscribe(string user, string eventType, List<string> channelOrder) {     // Observer
        lock (gate) subs.GetOrAdd(eventType, k => new List<Subscription>()).Add(new Subscription(user, channelOrder));
    }

    public void Publish(Event e) {
        List<Subscription> list; Subscription[] snapshot;
        if (!subs.TryGetValue(e.Type, out list)) return;
        lock (gate) snapshot = list.ToArray();
        foreach (Subscription s in snapshot) {
            string winner = Deliver(s, "[" + e.Type + "] " + e.Payload);
            lock (gate) Log.Add(new Delivery(s.User, e.Type, winner));
        }
    }

    // Chain of Responsibility: first channel that succeeds handles it.
    private string Deliver(Subscription s, string msg) {
        foreach (string name in s.ChannelOrder) {
            Channel c;
            if (!channels.TryGetValue(name, out c)) continue;              // unknown channel: skip
            try { if (c(s.User, msg)) return name; }
            catch (Exception ex) { Console.WriteLine(name + " threw for " + s.User + ": " + ex.Message); }
        }
        return "FAILED";
    }
}

class Program {
    static List<string> L(params string[] s) { return new List<string>(s); }
    static void Main() {
        NotificationDispatcher d = new NotificationDispatcher();
        d.RegisterChannel("PUSH", (u, m) => { if (u == "ben") return false; Console.WriteLine("push  -> " + u + " " + m); return true; });
        d.RegisterChannel("SMS", (u, m) => { throw new InvalidOperationException("gateway down"); });
        d.RegisterChannel("EMAIL", (u, m) => { Console.WriteLine("email -> " + u + " " + m); return true; });
        d.Subscribe("asha", "ORDER_SHIPPED", L("PUSH", "SMS"));
        d.Subscribe("ben", "ORDER_SHIPPED", L("SMS", "EMAIL"));
        d.Subscribe("cy", "ORDER_SHIPPED", L("SMS"));
        d.Publish(new Event("ORDER_SHIPPED", "A1 is on the way"));
        d.Publish(new Event("PAYMENT_FAILED", "nobody subscribed"));      // no subscribers: nothing happens
        d.Subscribe("ben", "PAYMENT_FAILED", L("PUSH", "EMAIL"));          // PUSH returns false for ben
        d.Subscribe("dan", "PAYMENT_FAILED", L("FAX", "EMAIL"));           // FAX is not registered: skipped
        d.Publish(new Event("PAYMENT_FAILED", "card declined"));
        foreach (Delivery x in d.Log) Console.WriteLine(x.User + " " + x.EventType + " " + x.Channel);
    }
}` }
        ],
      complexity: `<p>publish: O(S × C) where S = subscribers of that event type and C = channels tried per user (small). Subscribe O(S) copy-on-write. Memory O(subscriptions + log).</p>`,
      followUps: ['Retry FAILED deliveries with exponential backoff (a Command queue)', 'Quiet hours per user — which pattern/where?', 'Scale out: Kafka topics per event type, consumer groups per channel']
    }
  });

  practice.push({
    title: 'Spreadsheet Recalculation with Dependency Observers', level: 'Hard', tags: ['observer', 'graph', 'topological sort'], companies: ['Microsoft', 'Google', 'Airtable'],
    statement: `<p>Cells are named like <code>A1</code>. <code>setValue(cell, number)</code> stores a number; <code>setSum(cell, refs...)</code> makes the cell a formula equal to the sum of the referenced cells (missing cells count as 0). Whenever a cell changes, every cell that depends on it (directly or indirectly) must update automatically — each dependent recomputed <b>exactly once</b>, after all of its inputs. A formula that would create a cycle (A1 = B1, B1 = A1) must be rejected and leave the sheet unchanged.</p>`,
    constraints: `Up to 10<sup>4</sup> cells, each formula up to 50 refs. Recalculation after a change must touch only affected cells.`,
    example: `<p>A1=2, A2=3, B1=SUM(A1,A2) → 5, C1=SUM(B1,A1) → 7. setValue(A1, 10) → ${H.c('g', 'B1=13, then C1=23')} (C1 recomputed once, after B1). setSum(A1, C1) → ${H.c('r', 'rejected: cycle A1 → C1 → A1')}.</p>`,
    brute: { why: `<p>On every change, recompute <b>every</b> formula cell, repeating passes until nothing changes. That wastes work on unrelated cells, recomputes some cells many times, may show inconsistent intermediate values ("glitches") to listeners, and loops forever on a cycle.</p>`, code: { lang: 'java', code: `class NaiveSheet {
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
}`, alt: [
              { lang: 'python', code: `
class NaiveSheet:
    def __init__(self):
        self.val = {}
        self.formula = {}
    def recalc_all(self):
        changed = True
        while changed:                                   # infinite loop if there is a cycle
            changed = False
            for key, refs in self.formula.items():       # touches every formula, every pass
                s = 0.0
                for r in refs: s += self.val.get(r, 0.0)
                if self.val.get(key) != s:
                    self.val[key] = s
                    changed = True` },
              { lang: 'ts', code: `
class NaiveSheet {
    readonly val = new Map<string, number>();
    readonly formula = new Map<string, string[]>();
    recalcAll(): void {
        let changed = true;
        while (changed) {                                   // infinite loop if there is a cycle
            changed = false;
            for (const [key, refs] of this.formula) {       // touches every formula, every pass
                let s = 0;
                for (const r of refs) s += this.val.get(r) ?? 0;
                if (this.val.get(key) !== s) { this.val.set(key, s); changed = true; }
            }
        }
    }
}` },
              { lang: 'cpp', code: `
class NaiveSheet {
public:
    unordered_map<string, double> val;
    unordered_map<string, vector<string>> formula;
    void recalcAll() {
        bool changed = true;
        while (changed) {                                   // infinite loop if there is a cycle
            changed = false;
            for (auto& [key, refs] : formula) {             // touches every formula, every pass
                double s = 0;
                for (auto& r : refs) s += val.count(r) ? val[r] : 0.0;
                if (!val.count(key) || val[key] != s) { val[key] = s; changed = true; }
            }
        }
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class NaiveSheet {
    public readonly Dictionary<string, double> Val = new Dictionary<string, double>();
    public readonly Dictionary<string, List<string>> Formula = new Dictionary<string, List<string>>();
    public void RecalcAll() {
        bool changed = true;
        while (changed) {                                   // infinite loop if there is a cycle
            changed = false;
            foreach (var e in Formula) {                    // touches every formula, every pass
                double s = 0;
                foreach (string r in e.Value) { double v; Val.TryGetValue(r, out v); s += v; }
                double old; bool had = Val.TryGetValue(e.Key, out old);
                Val[e.Key] = s;
                if (!had || old != s) changed = true;
            }
        }
    }
}` }
            ] } },
    mcq: { q: 'C1 depends on B1 and A1; B1 depends on A1. A1 changes. Why recompute in topological order?', options: ['So C1 is computed once, after B1 has its new value (no glitch, no double work)', 'Because alphabetical order is required', 'To detect cycles', 'It does not matter'], answer: 0, explain: 'Naive observer push would update C1 when A1 changes (with stale B1) and again when B1 changes. Topological order over the affected subgraph computes each cell once with fresh inputs.' },
    hints: [`<p>Hint 1: Each cell keeps its <b>inputs</b> (refs) and its <b>observers</b> (dependents). Changing a cell notifies its dependents — Observer — but do it in a batch.</p>`, `<p>Hint 2: On change: collect all affected cells by DFS/BFS over dependents; then Kahn's topological sort restricted to that set (in-degree = number of affected inputs); recompute in that order.</p>`, `<p>Hint 3: Cycle check before installing a formula: DFS from each ref along <i>inputs</i>; if you reach the target cell, reject. When replacing a formula, remove the cell from its old inputs' dependent sets.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "set A1 = 10:\nrecompute B1 = 13.00\nrecompute C1 = 23.00\nB1=13.00 C1=23.00\ncycle accepted? false\nA1 still 10.00\nset A1 = 1:\nrecompute B1 = 4.00\nrecompute B2 = 1.00\nrecompute C1 = 5.00\nrecompute D1 = 5.00\nself-reference accepted? false\nB2 still 1.00\nE1=0.00\nrecompute E1 = 4.00\nE1=4.00\n" }] },
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
        PriorityQueue<String> ready = new PriorityQueue<>();               // alphabetical: same order on every run
        indeg.forEach((c, d) -> { if (d == 0) ready.add(c); });
        while (!ready.isEmpty()) {
            String c = ready.poll();
            value.put(c, compute(c));
            System.out.println(String.format("  recompute %s = %.2f", c, get(c)));
            for (String dep : dependents.getOrDefault(c, Set.of()))
                if (affected.contains(dep) && indeg.merge(dep, -1, Integer::sum) == 0) ready.add(dep);
        }
    }

    static String f(double v) { return String.format("%.2f", v); }

    public static void main(String[] args) {
        Sheet s = new Sheet();
        s.setValue("A1", 2); s.setValue("A2", 3);
        s.setSum("B1", "A1", "A2");
        s.setSum("C1", "B1", "A1");
        System.out.println("set A1 = 10:");
        s.setValue("A1", 10);
        System.out.println("B1=" + f(s.get("B1")) + " C1=" + f(s.get("C1")));        // 13.00 23.00
        System.out.println("cycle accepted? " + s.setSum("A1", "C1"));              // false
        System.out.println("A1 still " + f(s.get("A1")));
        s.setSum("B2", "A1");
        s.setSum("D1", "B1", "B2");                                                  // diamond: A1 -> B1/B2 -> D1
        System.out.println("set A1 = 1:");
        s.setValue("A1", 1);                                                         // D1 recomputed once, after B1 and B2
        System.out.println("self-reference accepted? " + s.setSum("B2", "B2"));     // false
        System.out.println("B2 still " + f(s.get("B2")));
        s.setSum("E1", "Z9");                                                        // missing cell counts as 0
        System.out.println("E1=" + f(s.get("E1")));
        s.setValue("Z9", 4);
        System.out.println("E1=" + f(s.get("E1")));
    }
}`, alt: [
          { lang: 'python', code: `import heapq
from collections import defaultdict


class Sheet:
    def __init__(self):
        self._value: dict[str, float] = {}
        self._inputs: dict[str, list[str]] = {}  # formula refs
        self._dependents: dict[str, set[str]] = defaultdict(set)  # observers

    def get(self, cell: str) -> float:
        return self._value.get(cell, 0.0)

    def set_value(self, cell: str, v: float) -> None:
        self._detach(cell)
        self._value[cell] = v
        self._propagate(cell)

    def set_sum(self, cell: str, *refs: str) -> bool:
        if any(self._reaches(r, cell) for r in refs):  # would create a cycle
            return False
        self._detach(cell)
        self._inputs[cell] = list(refs)
        for r in refs:
            self._dependents[r].add(cell)
        self._value[cell] = self._compute(cell)
        self._propagate(cell)
        return True

    def _detach(self, cell: str) -> None:
        for r in self._inputs.pop(cell, []):
            self._dependents[r].discard(cell)

    def _reaches(self, start: str, target: str) -> bool:
        """DFS along inputs: does \`start\` (transitively) read \`target\`?"""
        stack, seen = [start], set()
        while stack:
            c = stack.pop()
            if c == target:
                return True
            if c not in seen:
                seen.add(c)
                stack.extend(self._inputs.get(c, []))
        return False

    def _compute(self, cell: str) -> float:
        return sum(self.get(r) for r in self._inputs[cell])

    def _propagate(self, changed: str) -> None:
        """Batched observer notification: each affected cell recomputed once, inputs first."""
        affected: set[str] = set()
        queue = list(self._dependents.get(changed, ()))
        while queue:
            c = queue.pop()
            if c not in affected:
                affected.add(c)
                queue.extend(self._dependents.get(c, ()))
        indeg = {c: sum(1 for r in self._inputs[c] if r in affected) for c in affected}
        ready = [c for c, d in indeg.items() if d == 0]
        heapq.heapify(ready)  # alphabetical: same order on every run
        while ready:
            c = heapq.heappop(ready)
            self._value[c] = self._compute(c)
            print(f"  recompute {c} = {self.get(c):.2f}")
            for dep in self._dependents.get(c, ()):
                if dep in affected:
                    indeg[dep] -= 1
                    if indeg[dep] == 0:
                        heapq.heappush(ready, dep)


if __name__ == "__main__":
    s = Sheet()
    s.set_value("A1", 2)
    s.set_value("A2", 3)
    s.set_sum("B1", "A1", "A2")
    s.set_sum("C1", "B1", "A1")
    print("set A1 = 10:")
    s.set_value("A1", 10)
    print(f"B1={s.get('B1'):.2f} C1={s.get('C1'):.2f}")  # 13.00 23.00
    print("cycle accepted?", str(s.set_sum("A1", "C1")).lower())  # false
    print(f"A1 still {s.get('A1'):.2f}")
    s.set_sum("B2", "A1")
    s.set_sum("D1", "B1", "B2")  # diamond: A1 -> B1/B2 -> D1
    print("set A1 = 1:")
    s.set_value("A1", 1)  # D1 recomputed once, after B1 and B2
    print("self-reference accepted?", str(s.set_sum("B2", "B2")).lower())  # false
    print(f"B2 still {s.get('B2'):.2f}")
    s.set_sum("E1", "Z9")  # missing cell counts as 0
    print(f"E1={s.get('E1'):.2f}")
    s.set_value("Z9", 4)
    print(f"E1={s.get('E1'):.2f}")` },
          { lang: 'ts', code: `// A tiny binary min-heap (JavaScript has none built in).
class MinHeap<T> {
  private readonly a: T[] = [];
  constructor(private readonly less: (x: T, y: T) => boolean) {}
  get size(): number { return this.a.length; }
  push(v: T): void {
    const a = this.a;
    a.push(v);
    for (let i = a.length - 1; i > 0;) {
      const p = (i - 1) >> 1;
      if (!this.less(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop(): T {
    const a = this.a;
    const top = a[0];
    const last = a.pop() as T;
    if (a.length > 0) {
      a[0] = last;
      for (let i = 0;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.less(a[l], a[m])) m = l;
        if (r < a.length && this.less(a[r], a[m])) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

class Sheet {
  private readonly value = new Map<string, number>();
  private readonly inputs = new Map<string, string[]>(); // formula refs
  private readonly dependents = new Map<string, Set<string>>(); // observers

  get(c: string): number { return this.value.get(c) ?? 0; }

  setValue(cell: string, v: number): void {
    this.detach(cell);
    this.value.set(cell, v);
    this.propagate(cell);
  }

  setSum(cell: string, ...refs: string[]): boolean {
    if (refs.some((r) => this.reaches(r, cell))) return false; // would create a cycle
    this.detach(cell);
    this.inputs.set(cell, refs);
    for (const r of refs) {
      if (!this.dependents.has(r)) this.dependents.set(r, new Set());
      this.dependents.get(r)!.add(cell);
    }
    this.value.set(cell, this.compute(cell));
    this.propagate(cell);
    return true;
  }

  private detach(cell: string): void {
    for (const r of this.inputs.get(cell) ?? []) this.dependents.get(r)?.delete(cell);
    this.inputs.delete(cell);
  }

  // DFS along inputs: does \`from\` (transitively) read \`target\`?
  private reaches(from: string, target: string): boolean {
    const stack = [from];
    const seen = new Set<string>();
    while (stack.length > 0) {
      const c = stack.pop() as string;
      if (c === target) return true;
      if (!seen.has(c)) { seen.add(c); stack.push(...(this.inputs.get(c) ?? [])); }
    }
    return false;
  }

  private compute(cell: string): number {
    return (this.inputs.get(cell) ?? []).reduce((s, r) => s + this.get(r), 0);
  }

  // Batched observer notification: each affected cell recomputed once, inputs first.
  private propagate(changed: string): void {
    const affected = new Set<string>();
    const queue = [...(this.dependents.get(changed) ?? [])];
    while (queue.length > 0) {
      const c = queue.pop() as string;
      if (!affected.has(c)) { affected.add(c); queue.push(...(this.dependents.get(c) ?? [])); }
    }
    const indeg = new Map<string, number>();
    for (const c of affected) indeg.set(c, (this.inputs.get(c) ?? []).filter((r) => affected.has(r)).length);
    const ready = new MinHeap<string>((x, y) => x < y); // alphabetical: same order on every run
    for (const [c, d] of indeg) if (d === 0) ready.push(c);
    while (ready.size > 0) {
      const c = ready.pop();
      this.value.set(c, this.compute(c));
      console.log(\`  recompute \${c} = \${this.get(c).toFixed(2)}\`);
      for (const dep of this.dependents.get(c) ?? []) {
        if (!affected.has(dep)) continue;
        const left = (indeg.get(dep) as number) - 1;
        indeg.set(dep, left);
        if (left === 0) ready.push(dep);
      }
    }
  }
}

const s = new Sheet();
s.setValue("A1", 2); s.setValue("A2", 3);
s.setSum("B1", "A1", "A2");
s.setSum("C1", "B1", "A1");
console.log("set A1 = 10:");
s.setValue("A1", 10);
console.log(\`B1=\${s.get("B1").toFixed(2)} C1=\${s.get("C1").toFixed(2)}\`); // 13.00 23.00
console.log("cycle accepted? " + s.setSum("A1", "C1")); // false
console.log(\`A1 still \${s.get("A1").toFixed(2)}\`);
s.setSum("B2", "A1");
s.setSum("D1", "B1", "B2"); // diamond: A1 -> B1/B2 -> D1
console.log("set A1 = 1:");
s.setValue("A1", 1); // D1 recomputed once, after B1 and B2
console.log("self-reference accepted? " + s.setSum("B2", "B2")); // false
console.log(\`B2 still \${s.get("B2").toFixed(2)}\`);
s.setSum("E1", "Z9"); // missing cell counts as 0
console.log(\`E1=\${s.get("E1").toFixed(2)}\`);
s.setValue("Z9", 4);
console.log(\`E1=\${s.get("E1").toFixed(2)}\`);` },
          { lang: 'cpp', code: `class Sheet {
public:
    double get(const string& c) const {
        auto it = value.find(c);
        return it == value.end() ? 0.0 : it->second;
    }

    void setValue(const string& cell, double v) {
        detach(cell);
        value[cell] = v;
        propagate(cell);
    }

    bool setSum(const string& cell, const vector<string>& refs) {
        for (const string& r : refs)
            if (reaches(r, cell)) return false;  // would create a cycle
        detach(cell);
        inputs[cell] = refs;
        for (const string& r : refs) dependents[r].insert(cell);
        value[cell] = compute(cell);
        propagate(cell);
        return true;
    }

private:
    void detach(const string& cell) {
        auto it = inputs.find(cell);
        if (it == inputs.end()) return;
        for (const string& r : it->second) dependents[r].erase(cell);
        inputs.erase(it);
    }

    // DFS along inputs: does \`from\` (transitively) read \`target\`?
    bool reaches(const string& from, const string& target) const {
        vector<string> stack{from};
        unordered_set<string> seen;
        while (!stack.empty()) {
            string c = stack.back();
            stack.pop_back();
            if (c == target) return true;
            if (!seen.insert(c).second) continue;
            auto it = inputs.find(c);
            if (it != inputs.end()) stack.insert(stack.end(), it->second.begin(), it->second.end());
        }
        return false;
    }

    double compute(const string& cell) const {
        double s = 0;
        for (const string& r : inputs.at(cell)) s += get(r);
        return s;
    }

    // Batched observer notification: each affected cell recomputed once, inputs first.
    void propagate(const string& changed) {
        unordered_set<string> affected;
        vector<string> queue(dependents[changed].begin(), dependents[changed].end());
        while (!queue.empty()) {
            string c = queue.back();
            queue.pop_back();
            if (!affected.insert(c).second) continue;
            queue.insert(queue.end(), dependents[c].begin(), dependents[c].end());
        }
        unordered_map<string, int> indeg;
        for (const string& c : affected) {
            int d = 0;
            for (const string& r : inputs.at(c)) d += affected.count(r);
            indeg[c] = d;
        }
        priority_queue<string, vector<string>, greater<>> ready;  // alphabetical: same order on every run
        for (auto& [c, d] : indeg) if (d == 0) ready.push(c);
        while (!ready.empty()) {
            string c = ready.top();
            ready.pop();
            value[c] = compute(c);
            cout << "  recompute " << c << " = " << fixed << setprecision(2) << get(c) << "\\n";
            for (const string& dep : dependents[c])
                if (affected.count(dep) && --indeg[dep] == 0) ready.push(dep);
        }
    }

    unordered_map<string, double> value;
    unordered_map<string, vector<string>> inputs;                 // formula refs
    unordered_map<string, unordered_set<string>> dependents;      // observers
};

string f2(double v) {
    ostringstream os;
    os << fixed << setprecision(2) << v;
    return os.str();
}

int main() {
    Sheet s;
    s.setValue("A1", 2); s.setValue("A2", 3);
    s.setSum("B1", {"A1", "A2"});
    s.setSum("C1", {"B1", "A1"});
    cout << "set A1 = 10:\\n";
    s.setValue("A1", 10);
    cout << "B1=" << f2(s.get("B1")) << " C1=" << f2(s.get("C1")) << "\\n";  // 13.00 23.00
    cout << boolalpha << "cycle accepted? " << s.setSum("A1", {"C1"}) << "\\n";  // false
    cout << "A1 still " << f2(s.get("A1")) << "\\n";
    s.setSum("B2", {"A1"});
    s.setSum("D1", {"B1", "B2"});  // diamond: A1 -> B1/B2 -> D1
    cout << "set A1 = 1:\\n";
    s.setValue("A1", 1);  // D1 recomputed once, after B1 and B2
    cout << "self-reference accepted? " << s.setSum("B2", {"B2"}) << "\\n";  // false
    cout << "B2 still " << f2(s.get("B2")) << "\\n";
    s.setSum("E1", {"Z9"});  // missing cell counts as 0
    cout << "E1=" << f2(s.get("E1")) << "\\n";
    s.setValue("Z9", 4);
    cout << "E1=" << f2(s.get("E1")) << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

class Sheet {
    private readonly Dictionary<string, double> value = new Dictionary<string, double>();
    private readonly Dictionary<string, List<string>> inputs = new Dictionary<string, List<string>>();         // formula refs
    private readonly Dictionary<string, HashSet<string>> dependents = new Dictionary<string, HashSet<string>>();   // observers

    public double Get(string c) { double v; return value.TryGetValue(c, out v) ? v : 0.0; }

    private HashSet<string> DependentsOf(string c) { HashSet<string> s; return dependents.TryGetValue(c, out s) ? s : new HashSet<string>(); }

    public void SetValue(string cell, double v) {
        Detach(cell);
        value[cell] = v;
        Propagate(cell);
    }

    public bool SetSum(string cell, params string[] refs) {
        foreach (string r in refs) if (Reaches(r, cell)) return false;          // would create a cycle
        Detach(cell);
        inputs[cell] = new List<string>(refs);
        foreach (string r in refs) { HashSet<string> d; if (!dependents.TryGetValue(r, out d)) { d = new HashSet<string>(); dependents[r] = d; } d.Add(cell); }
        value[cell] = Compute(cell);
        Propagate(cell);
        return true;
    }

    private void Detach(string cell) {
        List<string> old;
        if (inputs.TryGetValue(cell, out old)) { inputs.Remove(cell); foreach (string r in old) DependentsOf(r).Remove(cell); }
    }

    // DFS along inputs: does 'from' (transitively) read 'target'?
    private bool Reaches(string from, string target) {
        Stack<string> st = new Stack<string>(); st.Push(from); HashSet<string> seen = new HashSet<string>();
        while (st.Count > 0) {
            string c = st.Pop();
            if (c == target) return true;
            List<string> ins;
            if (seen.Add(c) && inputs.TryGetValue(c, out ins)) foreach (string i in ins) st.Push(i);
        }
        return false;
    }

    private double Compute(string cell) {
        double s = 0;
        foreach (string r in inputs[cell]) s += Get(r);
        return s;
    }

    // Batched observer notification: each affected cell recomputed once, inputs first.
    private void Propagate(string changed) {
        List<string> affected = new List<string>(); HashSet<string> affectedSet = new HashSet<string>();
        Queue<string> q = new Queue<string>(DependentsOf(changed));
        while (q.Count > 0) { string c = q.Dequeue(); if (affectedSet.Add(c)) { affected.Add(c); foreach (string d in DependentsOf(c)) q.Enqueue(d); } }
        Dictionary<string, int> indeg = new Dictionary<string, int>();
        foreach (string c in affected) {
            int d = 0;
            foreach (string r in inputs[c]) if (affectedSet.Contains(r)) d++;
            indeg[c] = d;
        }
        SortedSet<string> ready = new SortedSet<string>(StringComparer.Ordinal);      // alphabetical: same order on every run
        foreach (var kv in indeg) if (kv.Value == 0) ready.Add(kv.Key);
        while (ready.Count > 0) {
            string c = ready.Min; ready.Remove(c);
            value[c] = Compute(c);
            Console.WriteLine("  recompute " + c + " = " + Get(c).ToString("F2"));
            foreach (string dep in DependentsOf(c))
                if (affectedSet.Contains(dep) && --indeg[dep] == 0) ready.Add(dep);
        }
    }
}

class Program {
    static string F(double v) { return v.ToString("F2"); }
    static string B(bool b) { return b.ToString().ToLower(); }

    static void Main() {
        Sheet s = new Sheet();
        s.SetValue("A1", 2); s.SetValue("A2", 3);
        s.SetSum("B1", "A1", "A2");
        s.SetSum("C1", "B1", "A1");
        Console.WriteLine("set A1 = 10:");
        s.SetValue("A1", 10);
        Console.WriteLine("B1=" + F(s.Get("B1")) + " C1=" + F(s.Get("C1")));        // 13.00 23.00
        Console.WriteLine("cycle accepted? " + B(s.SetSum("A1", "C1")));            // false
        Console.WriteLine("A1 still " + F(s.Get("A1")));
        s.SetSum("B2", "A1");
        s.SetSum("D1", "B1", "B2");                                                  // diamond: A1 -> B1/B2 -> D1
        Console.WriteLine("set A1 = 1:");
        s.SetValue("A1", 1);                                                         // D1 recomputed once, after B1 and B2
        Console.WriteLine("self-reference accepted? " + B(s.SetSum("B2", "B2")));   // false
        Console.WriteLine("B2 still " + F(s.Get("B2")));
        s.SetSum("E1", "Z9");                                                        // missing cell counts as 0
        Console.WriteLine("E1=" + F(s.Get("E1")));
        s.SetValue("Z9", 4);
        Console.WriteLine("E1=" + F(s.Get("E1")));
    }
}` }
        ],
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
    { q: 'Why is the template method usually declared <code>final</code> (non-virtual in C++)?', options: ['So subclasses cannot change the order of steps or skip mandatory ones', 'For performance', 'Because abstract methods require it', 'To allow multiple inheritance'], answer: 0, explain: 'The template method is the guarantee of the algorithm skeleton; overriding it would defeat the pattern.' },
    { q: 'An expense of ₹9,99,999 passes TeamLead, Manager, Director and CFO without anyone approving. Which design element prevents it from silently disappearing?', options: ['A terminal default handler / explicit "unhandled" result at the end of the chain', 'A larger limit for the CFO', 'Making the chain circular', 'Observer notifications'], answer: 0, explain: 'Chain of Responsibility does not guarantee handling; you must define what happens at the end of the chain.' },
    { q: 'A BST iterator using an explicit stack has which complexity per next() call?', options: ['O(1) amortised, O(h) memory', 'O(N) per call', 'O(log N) memory always, O(N) time', 'O(1) worst case, O(N) memory'], answer: 0, explain: 'Each node is pushed and popped exactly once over the whole traversal; the stack holds at most one root-to-leaf path.' },
    { q: 'Ten UI widgets each enable/disable others based on their values. What pattern reduces their N×N coupling?', options: ['Mediator (a dialog object coordinating the widgets)', 'Iterator', 'Template Method', 'Memento'], answer: 0, explain: 'Colleagues talk only to the mediator, which holds the interaction rules in one place.' },
    { q: 'In the Memento pattern, who is allowed to read the snapshot\'s internal fields?', options: ['Only the originator that created it', 'The caretaker', 'Any class in the application', 'Nobody, not even the originator'], answer: 0, explain: 'The caretaker stores mementos opaquely; only the originator reads them back during restore — this preserves encapsulation.' },
    { q: 'Why does Visitor need an <code>accept(visitor)</code> method on each element?', options: ['To achieve double dispatch: pick the method by both the element\'s and the visitor\'s runtime types', 'To make elements serializable', 'Because the language has no interfaces', 'To iterate children in order'], answer: 0, explain: 'Overload resolution (Java, C++) uses static types; accept() lets each element call the correctly typed visitX(this).' },
    { q: 'Visitor makes which kind of change cheap?', options: ['Adding a new operation over existing element types', 'Adding a new element type', 'Renaming element classes', 'Changing the traversal order of a list'], answer: 0, explain: 'New operation = one new visitor class. New element type = a new method in every visitor (the expression problem).' },
    { q: 'You need undo for an "apply Gaussian blur" action that cannot be mathematically reversed. Best choice?', options: ['Take a Memento (snapshot) before applying, restore it on undo', 'A Command whose undo() applies "un-blur"', 'Observer', 'Chain of Responsibility'], answer: 0, explain: 'Non-invertible operations need state snapshots; Command-style inverse operations only work when an inverse exists.' },
    { q: 'Calling <code>list.remove(x)</code> inside a for-each over an ArrayList typically causes…', options: ['ConcurrentModificationException from the fail-fast iterator', 'Silent success', 'A compile error', 'An infinite loop'], answer: 0, explain: 'The iterator detects a structural modification via modCount. Use iterator.remove() or removeIf().' },
    { q: 'Which pairing of pattern and JDK/framework example is correct?', options: ['Runnable submitted to an ExecutorService — Command', 'Comparator — Observer', 'AbstractList — Mediator', 'Servlet FilterChain — Memento'], answer: 0, explain: 'Runnable is a command object executed by an invoker (executor). Comparator is Strategy, AbstractList is Template Method, FilterChain is Chain of Responsibility.' }
  );

  /* ======================= INTERVIEW ======================= */
  interview.push(
    { q: 'What are behavioral design patterns, and how do they differ from creational and structural ones?', level: 'B', a: `<p><b>Creational</b> patterns are about <i>creating</i> objects (Factory, Builder, Singleton). <b>Structural</b> patterns are about <i>composing</i> objects into bigger structures (Adapter, Decorator, Composite). <b>Behavioral</b> patterns are about <i>communication and responsibility at runtime</i>: who decides, who notifies whom, how a request travels, how actions are stored or undone. The GoF list has 11 (the ten in this module plus Interpreter). In interviews they show up as requirements: "pluggable pricing" (Strategy), "notify subscribers" (Observer), "undo" (Command/Memento), "order lifecycle" (State).</p>`, followUps: ['Name one behavioral pattern you used in a real project and why', 'Which behavioral pattern is built into the for-each loop?'] },
    { q: 'Strategy vs State — they look identical. How do you explain the difference?', level: 'I', a: `<p>Both have a context holding a reference to an interface with several implementations. <b>Strategy</b>: the <i>client</i> picks an algorithm and the strategies are independent and unaware of each other (payment methods, sort orders). <b>State</b>: the object's behaviour changes with its internal mode, and <i>the states themselves</i> decide the next state (PaidState.ship() moves the order to Shipped). Clues: State has transitions and illegal actions; Strategy has interchangeable, equally valid choices. A vending machine is State; its pricing algorithm could be a Strategy inside it.</p>`, followUps: ['Can a State object hold a Strategy?', 'When would you use an enum transition table instead of State classes?'] },
    { q: 'Design undo/redo for a text editor. Which pattern(s) and data structures?', level: 'I', a: `<p>Use <b>Command</b>: each edit is an object with <code>execute()</code>/<code>undo()</code> that stores only what it needs (position, inserted text, deleted text). An invoker keeps two stacks: run → execute, push on undo stack, <b>clear redo</b>; undo → pop, undo(), push on redo; redo → pop, execute(), push on undo. Coalesce consecutive keystrokes into one command (merge within a time window) and wrap multi-step operations in a MacroCommand. Cap history length. For non-invertible operations (filters, reformat-all) store a <b>Memento</b> snapshot inside the command. For collaborative editing, positions must be transformed (OT/CRDT).</p>`, followUps: ['How much memory does your design use for a 50 MB document?', 'How do you implement "undo typing" as a single step for a whole word?'] },
    { q: 'What problems can Observer cause in production, and how do you mitigate them?', level: 'A', a: `<p>(1) <b>Memory leaks</b> from forgotten subscriptions (lapsed listeners) — return closeable subscription handles, tie them to lifecycles, or use weak references carefully. (2) <b>Concurrency</b> — mutating the list while notifying (CME) → CopyOnWriteArrayList; never notify while holding a lock (deadlock with re-entrant callbacks). (3) <b>Failure isolation</b> — wrap each callback in try/catch. (4) <b>Slow observers</b> block the subject — deliver asynchronously via executors/queues, with back-pressure. (5) <b>Cascades/re-entrancy</b> — an observer changing the subject triggers nested notifications; queue events. (6) <b>Ordering</b> — never rely on notification order. (7) Hard-to-follow control flow — log events and name them clearly.</p>`, followUps: ['How does java.util.concurrent.Flow add back-pressure?', 'When do you move from in-process Observer to Kafka?'] },
    { q: 'Explain Chain of Responsibility with two real examples that use different semantics.', level: 'I', a: `<p>Handlers are linked; a request is passed along until handled. <b>First-match semantics</b>: expense approval (TeamLead ≤ ₹1k → Manager ≤ ₹10k → Director …) or ATM note dispensing — once someone handles it, the walk stops. <b>Pipeline semantics</b>: servlet filters / Express middleware / logging appenders — each handler does its part and calls next; any may short-circuit (401, 429). Key design points: build the chain in one place (config/DI), define what happens at the end (default handler), keep handlers stateless/thread-safe, and prefer a list-based pipeline over deep recursion for long chains.</p>`, followUps: ['How is CoR different from Decorator?', 'Where must an error-handling middleware sit and why?'] },
    { q: 'When would you choose Template Method over Strategy, and vice versa?', level: 'I', a: `<p><b>Template Method</b> (inheritance): the algorithm skeleton is fixed and owned by a base class; subclasses override a few steps; the variation is chosen at compile time by picking the subclass. Good when steps share lots of protected state and the family is small and stable (importers, servlets, AbstractList). <b>Strategy</b> (composition): the varying step is an object passed in and swappable at runtime; strategies can be mixed and reused, and you avoid deep hierarchies and the fragile base class problem. If variations multiply combinatorially (format × validation × destination), Template Method explodes into many subclasses — switch to strategies. Many designs combine them: a final template method that delegates a step to an injected strategy.</p>`, followUps: ['What is the Hollywood Principle?', 'Why should you never call overridable methods from a constructor?'] },
    { q: 'How would you implement an iterator over a binary search tree that uses less than O(N) memory?', level: 'I', a: `<p>Simulate in-order traversal with an explicit stack. Constructor pushes the left spine of the root. <code>next()</code> pops the top (the smallest unvisited value), then pushes the left spine of its right child, and returns the value. <code>hasNext()</code> is just "stack not empty" — idempotent. Memory is O(h) (log N if balanced) and <code>next()</code> is O(1) amortised because every node is pushed and popped exactly once. Implement <code>Iterator&lt;Integer&gt;</code>, throw NoSuchElementException when exhausted, and mention fail-fast behaviour if the tree is mutated during iteration.</p>`, followUps: ['How would you support prev()?', 'How would you make it fail-fast on concurrent modification?'] },
    { q: 'Observer vs Mediator vs Pub/Sub — what is the difference?', level: 'A', a: `<p><b>Observer</b>: a subject keeps direct references to observers and broadcasts changes one-to-many; it contains no coordination logic. <b>Mediator</b>: many colleagues talk only to a central object that contains the <i>rules</i> of their interaction (chat room routing, control tower assigning runways) — many-to-many with logic in the hub. <b>Pub/Sub</b>: publishers and subscribers are fully decoupled by a broker and topics; they do not know each other at all, and the broker can persist, replay and distribute across machines (Kafka, SNS). A mediator is often implemented using observer-style callbacks; pub/sub is Observer scaled out with a broker in between.</p>`, followUps: ['Orchestration vs choreography in sagas — which pattern is which?', 'How do you prevent a mediator becoming a god object?'] },
    { q: 'Memento vs Command for undo — trade-offs?', level: 'A', a: `<p><b>Command</b> stores the operation and its inverse data (inserted text, previous value): memory proportional to the edit, fast, but every operation needs a correct inverse and positions can go stale. <b>Memento</b> stores the state itself: works for any operation including non-invertible ones, simple to reason about, but memory proportional to the state per snapshot — mitigated by deltas, copy-on-write or immutable/persistent data structures with structural sharing. Real systems combine them: command log for fine-grained undo plus periodic snapshots (checkpoints) to bound replay time — exactly how databases combine a WAL with checkpoints and how event sourcing uses snapshots.</p>`, followUps: ['How do you keep a memento from leaking private state?', 'What does restore NOT undo?'] },
    { q: 'Explain double dispatch and why the Visitor pattern needs accept().', level: 'A', a: `<p>Java and C++ select <i>overloaded</i> methods at compile time using static argument types, and select <i>overridden</i> methods at runtime using only the receiver's type (single dispatch). With <code>Expr e = new Add(...)</code>, calling <code>visitor.visit(e)</code> cannot select <code>visit(Add)</code>. Visitor bounces: <code>e.accept(v)</code> dispatches on the element's runtime type; inside <code>Add.accept</code>, <code>this</code> is statically an <code>Add</code>, so <code>v.visitAdd(this)</code> is chosen, and that call dispatches on the visitor's runtime type. Two virtual calls select the (element, operation) pair. Sealed types or unions with pattern matching (Java 21, TypeScript, Python <code>match</code>, C++ <code>std::variant</code>) achieve the same with checked exhaustiveness and no accept boilerplate.</p>`, followUps: ['What is the expression problem?', 'When would you still prefer classic Visitor over sealed + switch?'] },
    { q: 'Design an order lifecycle (NEW → PAID → SHIPPED → DELIVERED, cancellable before shipping) so that illegal transitions are impossible and concurrent requests are safe.', level: 'A', a: `<p>Draw the state diagram first. Implement State: an <code>OrderState</code> interface whose default methods throw IllegalStateException; each state overrides only legal events and returns/sets the next state, with entry actions (charge, refund, notify). Terminal states override nothing. Concurrency: in memory, synchronize transitions; in a database, use a conditional update — <code>UPDATE orders SET status='PAID', version=version+1 WHERE id=? AND status='NEW' AND version=?</code> — and treat 0 rows as a lost race. Persist the state name, rebuild the state object on load. Publish an event per transition (Observer) for emails/analytics, and keep an audit log of transitions.</p>`, followUps: ['How would you add ON_HOLD reachable from PAID?', 'How do you handle a payment webhook arriving twice?'] },
    { q: 'You are given a 400-line method full of if/else on a "type" field. How do you decide which behavioral pattern (if any) to refactor to?', level: 'E', a: `<p>First ask <b>what varies and who decides</b>. If branches choose <i>how to compute</i> something and the type is chosen by the caller → Strategy (registry map). If branches depend on the object's <i>current status</i> and change it → State. If branches ask "can this branch handle it, else try the next" → Chain of Responsibility. If the same ladder over the same <i>types</i> appears in many operations → Visitor or sealed + switch. If branches differ only in a few steps of a shared sequence → Template Method. Then refactor safely: characterisation tests first, extract one branch at a time behind the interface, keep behaviour identical, and stop when the axis of change is isolated — do not add patterns where variation is not real.</p>`, followUps: ['How do you make this refactor safe with no tests?', 'When is a switch statement the better design?'] },
    { q: 'How do behavioral patterns appear in AI/LLM applications and agent frameworks?', level: 'E', a: `<p><b>Command</b>: model tool calls are requests reified as data (name + JSON args) that the host validates, executes, logs and can undo. <b>Strategy</b>: model routing (cheap vs smart model), retrieval method, chunking policy. <b>Chain of Responsibility</b>: guardrail pipelines and fallback chains (cache → small model → large model → human). <b>Observer</b>: streaming token callbacks and tracing hooks. <b>State</b>: agent graphs (plan → act → observe → done) with persisted current state for resumption. <b>Mediator</b>: a supervisor/orchestrator agent coordinating worker agents. <b>Memento</b>: checkpointers that snapshot agent state for time-travel debugging and rollback of file edits. Naming these lets you reason about reliability: idempotent tool commands, bounded chains, terminal states and human approval gates.</p>`, followUps: ['How would you make agent tool calls safely undoable?', 'Why do agent frameworks model agents as explicit state graphs?'] },
    { q: 'Implement Observer in Java today: what would you use instead of java.util.Observable?', level: 'I', a: `<p><code>Observable</code> is deprecated since Java 9: it is a class (forcing inheritance), its notification order and thread-safety are unspecified, and <code>setChanged()</code> is awkward. Today: define a small functional interface (<code>PriceListener</code>) so observers can be lambdas; keep them in a <code>CopyOnWriteArrayList</code>; return an <code>AutoCloseable</code> handle from <code>subscribe</code>; isolate failures per observer; deliver asynchronously with an <code>Executor</code> when observers do I/O. For streams with back-pressure use <code>java.util.concurrent.Flow</code> / Reactor / RxJava; in Spring, <code>ApplicationEventPublisher</code> + <code>@EventListener</code>; for JavaBeans properties, <code>PropertyChangeSupport</code>. In Python keep a list of callables; in TypeScript a copy-on-write array of functions with a closing handle; in C++ a vector of <code>std::function</code> with an id-based unsubscribe.</p>`, followUps: ['What is back-pressure and when do you need it?', 'How do you test that an observer was notified exactly once?'] }
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
<p>Every pattern follows the same path: a real-life analogy first, then the naive if/else design and <i>why it hurts</i>, then the pattern's class diagram and a <b>step-by-step animation of it running</b> (notifications fanning out, state machines moving, requests walking down a chain, undo stacks pushing and popping), then compilable code in Java with Python, TypeScript and C++ tabs on every block (records, lambdas, sealed types and their equivalents), worked examples, expert deep dives and how AI tools change the job. The module ends with a "which pattern fits?" clue detector, 14 practice problems, a quiz and interview questions.</p>`,
    goals: [
      'Recognise from the wording of a requirement which behavioral pattern fits (and when none is needed)',
      'Implement all 10 behavioral patterns in idiomatic, thread-aware Java, Python, TypeScript or C++ — interfaces, lambdas, records, sealed types or their equivalents',
      'Replace if/else and switch-on-type ladders with Strategy, State, Chain of Responsibility or Visitor and explain the trade-off',
      'Build undo/redo with Command and Memento, and explain the difference between the two',
      'Tell apart look-alike patterns: Strategy vs State, Observer vs Mediator, Command vs Memento, Template Method vs Strategy',
      'Combine patterns in machine-coding rounds (notification service, workflow engine, middleware pipeline, transactional store)'
    ],
    prereqs: `LLD 2 (SOLID Principles) — especially Open/Closed and Dependency Inversion; LLD 4–5 (Creational and Structural patterns) helpful; comfortable Java: interfaces, abstract classes, generics, lambdas.`,
    hours: 16,
    langNotes: {
      java: `<p><b>Interfaces, lambdas, records.</b> A one-method interface (<code>FareStrategy</code>, <code>PriceListener</code>, <code>Mw</code>) is a functional interface, so a lambda is a strategy, listener or middleware; keep abstract classes for a fixed skeleton (Template Method with a <code>final</code> method) or shared state. Records give immutable events, results and mementos with <code>equals</code>/<code>hashCode</code> for free; plain classes compare by identity, which is what unsubscribe-by-reference needs. <b>Sealed interfaces</b> plus a pattern-matching <code>switch</code> are the exhaustive alternative to Visitor and to a state table.</p><p><b>Concurrency and traps.</b> Observers live in a <code>CopyOnWriteArrayList</code> so (un)subscribing during a notification is safe; guard state transitions with <code>synchronized</code>. A <code>for-each</code> over an <code>ArrayList</code> is fail-fast (<code>ConcurrentModificationException</code>): remove through the iterator or <code>removeIf</code>. A private nested class is how Memento hides its fields from the caretaker. Undo stacks are <code>Deque</code>s; <code>HashMap</code> iteration order is unspecified, so sort when output must be reproducible.</p>`,
      python: `<p><b>Protocols, callables, dataclasses.</b> Use <code>abc.ABC</code> with <code>@abstractmethod</code> for a nominal interface and <code>typing.Protocol</code> (or a plain <code>Callable</code>) when any object with the right shape should fit; a function or lambda is already a Strategy, Observer or Middleware. <code>@dataclass(frozen=True)</code> gives immutable events and mementos with value <code>__eq__</code> and <code>__hash__</code>; for a listener handle compare by identity, because <code>list.remove</code> removes the first <i>equal</i> item. <code>typing.final</code> and underscore names are conventions only, so Template Method and Memento rely on discipline, and the type checker (mypy, pyright) enforces exhaustive <code>match</code> over a union.</p><p><b>Traps.</b> There is no method overloading, so Visitor uses distinct names (<code>visit_add</code>). A generator is the shortest Iterator, and <code>deque(maxlen=n)</code> is a bounded undo history. Python has no <code>final</code> keyword for methods and no private; the GIL does not make a check-then-set sequence atomic, so wrap state transitions in a <code>Lock</code>. Recursion stops at 1000 frames, which is why the nested-list and tree iterators use an explicit stack. Format money with <code>f"{x:.2f}"</code>, and <code>round()</code> rounds half to even.</p>`,
      js: `<p><b>TypeScript.</b> <b>Interfaces are erased and types are structural</b>, so an object literal or arrow function with the right shape is a Strategy, Observer or Middleware, and a fake in a test. Use an <code>abstract class</code> for Template Method (there is no <code>final</code>; document the template method instead) and a <b>discriminated union</b> with a <code>never</code> check for exhaustive Visitor and State switches. <code>readonly</code> and <code>Object.freeze</code> give shallow immutability; <code>private</code> is compile-time only (use <code>#field</code> or a module-level <code>WeakMap</code> for a truly opaque Memento).</p><p><b>Traps.</b> The runtime is single-threaded, so no locks are needed, but <code>await</code> lets other code run between steps: copy the listener array before notifying (copy-on-write) so a handler that unsubscribes does not skip a neighbour. <code>Map</code> and <code>Set</code> keep insertion order; <code>Array.sort</code> is stable but sorts strings unless you pass a comparator; <code>shift()</code> on a long queue is O(n). Do not name a class <code>Event</code>, <code>Request</code>, <code>Response</code> or <code>Document</code> in a script file: they clash with DOM types. There is no built-in heap, so the spreadsheet recalculation carries a small <code>MinHeap</code>. Money: <code>toFixed(2)</code>, integers exact to 2<sup>53</sup>.</p>`,
      cpp: `<p><b>Abstract bases and ownership.</b> An interface is a class of pure virtual functions with a <b>virtual destructor</b>; mark overrides <code>override</code>. Template Method is the non-virtual interface idiom: a public non-virtual <code>pay()</code> calls private or protected virtual steps, so a subclass cannot reorder them. Strategies and callbacks are <code>std::function</code> or lambdas. Ownership is explicit: a chain or command history owns its elements through <code>std::unique_ptr</code>, a shared strategy is a <code>std::shared_ptr&lt;const T&gt;</code>, and Mediator colleagues, runway planes or a Memento originator are non-owning references or pointers that must outlive the user.</p><p><b>Value types and traps.</b> <code>std::variant</code> + <code>std::visit</code> is the Visitor for a closed set of types, and <code>enum class</code> with a <code>switch</code> and no <code>default</code> lets <code>-Wswitch</code> catch a missing state. A Memento is a nested class with private members and <code>friend class Originator</code>. <code>delete</code>, <code>new</code> and <code>export</code> are keywords, so the code names them <code>del</code> and <code>exportReport</code>. Copy a listener list before notifying so a callback can unsubscribe; erasing from a vector while iterating invalidates iterators (use erase-remove or <code>std::erase_if</code>). A very long <code>unique_ptr</code> chain is destroyed recursively, so build chains of thousands of links as a vector.</p>`
    },
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
