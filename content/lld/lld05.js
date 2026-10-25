(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- tiny helpers shared by every visualizer in this module ---------- */
  // a class / interface / object box for class and call-flow diagrams
  function B(id, label, x, y) { return { id: id, label: label, x: x, y: y, shape: 'box' }; }
  // a directed diagram: edge [u, v, label] means "u calls / holds / uses v"
  function G(label, nodes, edges, o) {
    o = o || {};
    return { type: 'graph', label: label, directed: true, height: o.h || 60, nodes: nodes, edges: edges, hl: o.hl || {}, ehl: o.ehl || {}, tags: o.tags || {} };
  }
  // python / TypeScript / C++ versions of the Java code panes, keyed by the exact Java text (filled in near the end of this file)
  var ALTS = {};
  function mkAlt(py, ts, cpp, maps) {
    maps = maps || {};
    return { python: { code: py, map: maps.python || {} }, js: { lang: 'ts', code: ts, map: maps.ts || {} }, cpp: { code: cpp, map: maps.cpp || {} } };
  }
  function CODE(label, code, hl, alt) { return { type: 'code', label: label, lang: 'java', code: code, hl: hl || {}, alt: alt || ALTS[code] }; }
  function TXT(html, label) { var p = { type: 'text', html: html }; if (label) p.label = label; return p; }
  function VARS(label, vals, hl) { return { type: 'vars', label: label, vals: vals, hl: hl || {} }; }
  function F(narr, parts) { return { narr: narr, parts: parts }; }
  function one(k, v) { var r = {}; r[k] = v; return r; }
  function many(keys, v) { var r = {}; keys.forEach(function (k) { r[k] = v; }); return r; }
  function words(input, hint, max) {
    var w = String(input === undefined ? '' : input).trim().split(/[\s,]+/).filter(function (s) { return s.length; });
    if (!w.length) throw new Error(hint);
    if (w.length > max) throw new Error('Use at most ' + max + ' items. ' + hint);
    return w;
  }
  /* =====================================================================
     TOPIC 1 — ADAPTER
     ===================================================================== */
  var ADAPTER_CODE = 'BigDecimal rupees = amount;                 // 1 what Checkout gives us\n' +
    'long paise = rupees.movePointRight(2)       // 2 translate units\n' +
    '                   .longValueExact();\n' +
    'String ref = "ORD-" + orderId;              // 4 translate naming\n' +
    'String code = bank.makeTransfer(ref, paise, "INR"); // 5 call adaptee\n' +
    'return switch (code) {                      // 6 translate the answer\n' +
    '  case "00" -> PaymentResult.SUCCESS;\n' +
    '  case "51" -> PaymentResult.DECLINED;\n' +
    '  default   -> PaymentResult.ERROR; };';

  topics.push({
    title: 'Adapter — Make Two Interfaces Talk',
    analogy: `<p>You fly from India to London with your laptop charger. The UK socket has three square pins; your plug has round ones. You do <b>not</b> rewire the hotel wall and you do <b>not</b> cut open your charger. You buy a small <b>travel adapter</b>: one side fits the wall, the other side fits your plug. Electricity flows exactly as before.</p>
      <p>The <b>Adapter pattern</b> is that travel plug for code: a small class that sits between <i>your code</i> (which expects one interface) and <i>someone else's class</i> (which offers a different one) and translates between them.</p>`,
    explain: `<p><b>The problem.</b> Your app already talks to things through an interface you designed — say <code>PaymentProcessor.pay(orderId, amount)</code>. Then the business signs with a bank whose SDK looks completely different: <code>makeTransfer(reference, amountInPaise, currency)</code> that returns a string code like <code>"00"</code>. You cannot change the bank's SDK (it is a jar from a vendor) and you do not want to sprinkle bank-specific code all over your checkout.</p>
      <p><b>The fix.</b> Write one new class that <i>implements your interface</i> and <i>holds the vendor object inside</i>. Every call is translated on the way in (rupees → paise, orderId → reference) and the answer is translated on the way out (<code>"00"</code> → <code>SUCCESS</code>).</p>
      ${H.table(['Role', 'In our example', 'Who owns it?'], [
        ['<b>Target</b> — the interface the client wants', '<code>PaymentProcessor</code>', 'you'],
        ['<b>Client</b> — code that uses the Target', '<code>Checkout</code>', 'you'],
        ['<b>Adaptee</b> — the useful class with the wrong shape', '<code>LegacyBankApi</code>', H.c('r', 'vendor / legacy — cannot change')],
        ['<b>Adapter</b> — implements Target, wraps Adaptee', '<code>LegacyBankAdapter</code>', H.c('g', 'you — the only new class')]
      ])}
      <p><b>Two flavours.</b> An <b>object adapter</b> <i>holds</i> the adaptee in a field (composition) — this is the normal choice in every language. A <b>class adapter</b> <i>extends</i> the adaptee and implements the target — only possible when the adaptee is not final and you need just one adaptee, and it couples you to its internals.</p>
      <p><b>Where you already use it:</b> ${H.chips(['Arrays.asList(array) → List', 'InputStreamReader: bytes → chars', 'Collections.enumeration(list)', 'JDBC drivers adapt each DB to java.sql.Connection', 'Spring HandlerAdapter'], { label: 'Adapters in the JDK and frameworks' })}</p>
      <p><b>Key rule:</b> an Adapter changes the <i>shape</i> of an interface, never the <i>meaning</i>. It should not add features (that is Decorator) or control access (that is Proxy). If your adapter starts holding business rules, it is turning into something else.</p>`,
    clues: ['"integrate a <b>third-party</b> / <b>legacy</b> / vendor library" whose methods do not match ours', '"we <b>cannot modify</b> the existing class" (it is in a jar, owned by another team)', '"support <b>multiple payment gateways / map providers / SMS vendors</b> behind one interface"', '"convert units / formats / error codes" between two systems (paise ↔ rupees, XML ↔ JSON, °F ↔ °C)', '"make the old API work with the new code" during a migration', '"plug in" a new provider without touching client code (Open/Closed)'],
    code: [{ lang: 'java', title: 'Object adapter (the default choice)', code: `
// ---------- Target: the interface OUR code is written against ----------
interface PaymentProcessor {
    PaymentResult pay(String orderId, BigDecimal amountInRupees);
}

enum PaymentResult { SUCCESS, DECLINED, ERROR }

// ---------- Adaptee: vendor SDK we cannot edit ----------
class LegacyBankApi {
    /** amount in paise, returns an ISO-8583 style response code. */
    String makeTransfer(String reference, long amountPaise, String currency) {
        if (amountPaise <= 0) return "13";                  // invalid amount
        return amountPaise > 10_000_000L ? "51" : "00";     // 51 = insufficient funds
    }
}

// ---------- Object Adapter: implements Target, HAS-A Adaptee ----------
class LegacyBankAdapter implements PaymentProcessor {
    private final LegacyBankApi bank;

    LegacyBankAdapter(LegacyBankApi bank) { this.bank = bank; }

    @Override
    public PaymentResult pay(String orderId, BigDecimal amountInRupees) {
        long paise = amountInRupees.movePointRight(2).longValueExact(); // units in
        String code = bank.makeTransfer("ORD-" + orderId, paise, "INR");  // delegate
        return switch (code) {                                           // answer out
            case "00" -> PaymentResult.SUCCESS;
            case "51" -> PaymentResult.DECLINED;
            default -> PaymentResult.ERROR;
        };
    }
}

// ---------- Client: knows ONLY the Target interface ----------
class Checkout {
    private final PaymentProcessor processor;
    Checkout(PaymentProcessor processor) { this.processor = processor; }

    void complete(String orderId, BigDecimal amount) {
        System.out.println("Order " + orderId + ": " + processor.pay(orderId, amount));
    }

    public static void main(String[] args) {
        Checkout checkout = new Checkout(new LegacyBankAdapter(new LegacyBankApi()));
        checkout.complete("42", new BigDecimal("499.99"));   // SUCCESS
        checkout.complete("43", new BigDecimal("250000.00")); // DECLINED
    }
}`,
      alt: [
        { lang: 'python', code: `from abc import ABC, abstractmethod
from decimal import Decimal
from enum import Enum


class PaymentResult(Enum):
    SUCCESS = "SUCCESS"
    DECLINED = "DECLINED"
    ERROR = "ERROR"


# ---------- Target: the interface OUR code is written against ----------
class PaymentProcessor(ABC):
    @abstractmethod
    def pay(self, order_id: str, amount_in_rupees: Decimal) -> PaymentResult: ...


# ---------- Adaptee: vendor SDK we cannot edit ----------
class LegacyBankApi:
    def make_transfer(self, reference: str, amount_paise: int, currency: str) -> str:
        """amount in paise, returns an ISO-8583 style response code."""
        if amount_paise <= 0:
            return "13"  # invalid amount
        return "51" if amount_paise > 10_000_000 else "00"  # 51 = insufficient funds


# ---------- Object Adapter: implements Target, HAS-A Adaptee ----------
class LegacyBankAdapter(PaymentProcessor):
    def __init__(self, bank: LegacyBankApi) -> None:
        self._bank = bank

    def pay(self, order_id: str, amount_in_rupees: Decimal) -> PaymentResult:
        paise_exact = amount_in_rupees.scaleb(2)  # units in
        if paise_exact != paise_exact.to_integral_value():
            raise ArithmeticError("fractional paise")
        code = self._bank.make_transfer(f"ORD-{order_id}", int(paise_exact), "INR")  # delegate
        match code:  # answer out
            case "00":
                return PaymentResult.SUCCESS
            case "51":
                return PaymentResult.DECLINED
            case _:
                return PaymentResult.ERROR


# ---------- Client: knows ONLY the Target interface ----------
class Checkout:
    def __init__(self, processor: PaymentProcessor) -> None:
        self._processor = processor

    def complete(self, order_id: str, amount: Decimal) -> None:
        print(f"Order {order_id}: {self._processor.pay(order_id, amount).name}")


if __name__ == "__main__":
    checkout = Checkout(LegacyBankAdapter(LegacyBankApi()))
    checkout.complete("42", Decimal("499.99"))  # SUCCESS
    checkout.complete("43", Decimal("250000.00"))  # DECLINED` },
        { lang: 'ts', code: `// ---------- Target: the interface OUR code is written against ----------
type PaymentResult = "SUCCESS" | "DECLINED" | "ERROR";

interface PaymentProcessor {
  pay(orderId: string, amountInRupees: number): PaymentResult;
}

// ---------- Adaptee: vendor SDK we cannot edit ----------
class LegacyBankApi {
  /** amount in paise, returns an ISO-8583 style response code. */
  makeTransfer(_reference: string, amountPaise: number, _currency: string): string {
    if (amountPaise <= 0) return "13"; // invalid amount
    return amountPaise > 10_000_000 ? "51" : "00"; // 51 = insufficient funds
  }
}

// ---------- Object Adapter: implements Target, HAS-A Adaptee ----------
class LegacyBankAdapter implements PaymentProcessor {
  constructor(private readonly bank: LegacyBankApi) {}

  pay(orderId: string, amountInRupees: number): PaymentResult {
    const paise = Math.round(amountInRupees * 100); // units in (floats: round, or keep money as integer paise)
    const code = this.bank.makeTransfer(\`ORD-\${orderId}\`, paise, "INR"); // delegate
    switch (code) { // answer out
      case "00": return "SUCCESS";
      case "51": return "DECLINED";
      default: return "ERROR";
    }
  }
}

// ---------- Client: knows ONLY the Target interface ----------
class Checkout {
  constructor(private readonly processor: PaymentProcessor) {}

  complete(orderId: string, amount: number): void {
    console.log(\`Order \${orderId}: \${this.processor.pay(orderId, amount)}\`);
  }
}

const checkout = new Checkout(new LegacyBankAdapter(new LegacyBankApi()));
checkout.complete("42", 499.99); // SUCCESS
checkout.complete("43", 250000.0); // DECLINED` },
        { lang: 'cpp', code: `enum class PaymentResult { SUCCESS, DECLINED, ERROR };

const char* toString(PaymentResult r) {
    switch (r) {
        case PaymentResult::SUCCESS:  return "SUCCESS";
        case PaymentResult::DECLINED: return "DECLINED";
        default:                      return "ERROR";
    }
}

// ---------- Target: the interface OUR code is written against ----------
class PaymentProcessor {
public:
    virtual ~PaymentProcessor() = default;
    virtual PaymentResult pay(const string& orderId, double amountInRupees) = 0;
};

// ---------- Adaptee: vendor SDK we cannot edit ----------
class LegacyBankApi {
public:
    /** amount in paise, returns an ISO-8583 style response code. */
    string makeTransfer(const string&, long long amountPaise, const string&) const {
        if (amountPaise <= 0) return "13";                          // invalid amount
        return amountPaise > 10'000'000LL ? "51" : "00";            // 51 = insufficient funds
    }
};

// ---------- Object Adapter: implements Target, HAS-A Adaptee ----------
class LegacyBankAdapter : public PaymentProcessor {
    const LegacyBankApi& bank_;
public:
    explicit LegacyBankAdapter(const LegacyBankApi& bank) : bank_(bank) {}

    PaymentResult pay(const string& orderId, double amountInRupees) override {
        long long paise = llround(amountInRupees * 100);            // units in (doubles: round, never truncate)
        string code = bank_.makeTransfer("ORD-" + orderId, paise, "INR");   // delegate
        if (code == "00") return PaymentResult::SUCCESS;            // answer out
        if (code == "51") return PaymentResult::DECLINED;
        return PaymentResult::ERROR;
    }
};

// ---------- Client: knows ONLY the Target interface ----------
class Checkout {
    PaymentProcessor& processor_;
public:
    explicit Checkout(PaymentProcessor& processor) : processor_(processor) {}

    void complete(const string& orderId, double amount) {
        cout << "Order " << orderId << ": " << toString(processor_.pay(orderId, amount)) << "\\n";
    }
};

int main() {
    LegacyBankApi bank;
    LegacyBankAdapter adapter(bank);
    Checkout checkout(adapter);
    checkout.complete("42", 499.99);        // SUCCESS
    checkout.complete("43", 250000.00);     // DECLINED
}` },
  { lang: 'csharp', code: `
using System;

// ---------- Target: the interface OUR code is written against ----------
interface IPaymentProcessor {
    PaymentResult Pay(string orderId, decimal amountInRupees);
}

enum PaymentResult { SUCCESS, DECLINED, ERROR }

// ---------- Adaptee: vendor SDK we cannot edit ----------
class LegacyBankApi {
    /// amount in paise, returns an ISO-8583 style response code.
    public string MakeTransfer(string reference, long amountPaise, string currency) {
        if (amountPaise <= 0) return "13";                  // invalid amount
        return amountPaise > 10000000L ? "51" : "00";       // 51 = insufficient funds
    }
}

// ---------- Object Adapter: implements Target, HAS-A Adaptee ----------
class LegacyBankAdapter : IPaymentProcessor {
    private readonly LegacyBankApi bank;

    public LegacyBankAdapter(LegacyBankApi bank) { this.bank = bank; }

    public PaymentResult Pay(string orderId, decimal amountInRupees) {
        long paise = (long)(amountInRupees * 100);                          // units in
        string code = bank.MakeTransfer("ORD-" + orderId, paise, "INR");   // delegate
        switch (code) {                                                     // answer out
            case "00": return PaymentResult.SUCCESS;
            case "51": return PaymentResult.DECLINED;
            default: return PaymentResult.ERROR;
        }
    }
}

// ---------- Client: knows ONLY the Target interface ----------
class Checkout {
    private readonly IPaymentProcessor processor;
    public Checkout(IPaymentProcessor processor) { this.processor = processor; }

    public void Complete(string orderId, decimal amount) {
        Console.WriteLine("Order " + orderId + ": " + processor.Pay(orderId, amount));
    }
}

class Program {
    static void Main() {
        Checkout checkout = new Checkout(new LegacyBankAdapter(new LegacyBankApi()));
        checkout.Complete("42", 499.99m);     // SUCCESS
        checkout.Complete("43", 250000.00m);  // DECLINED
    }
}` }
      ] },
    { lang: 'java', title: 'Class adapter (inheritance) — and why it is rarer', code: `
// Class adapter: EXTENDS the adaptee instead of holding it.
// Works only if the adaptee is not final; you get exactly one adaptee, fixed at compile time.
interface Thermometer { double celsius(); }

class FahrenheitSensor {               // vendor class
    double readF() { return 98.6; }
}

class SensorClassAdapter extends FahrenheitSensor implements Thermometer {
    @Override
    public double celsius() {
        return (readF() - 32) * 5.0 / 9.0;   // inherited method, translated result
    }
}

class ClassAdapterDemo {
    public static void main(String[] args) {
        Thermometer t = new SensorClassAdapter();
        System.out.printf("%.1f C%n", t.celsius()); // 37.0 C
        // Downside: SensorClassAdapter also exposes readF() publicly — the adaptee leaks.
    }
}`,
      alt: [
        { lang: 'python', code: `from abc import ABC, abstractmethod

# Class adapter: EXTENDS the adaptee instead of holding it.
# Works only if the adaptee can be subclassed; you get exactly one adaptee, fixed when the class is written.


class Thermometer(ABC):
    @abstractmethod
    def celsius(self) -> float: ...


class FahrenheitSensor:  # vendor class
    def read_f(self) -> float:
        return 98.6


class SensorClassAdapter(FahrenheitSensor, Thermometer):
    def celsius(self) -> float:
        return (self.read_f() - 32) * 5.0 / 9.0  # inherited method, translated result


if __name__ == "__main__":
    t: Thermometer = SensorClassAdapter()
    print(f"{t.celsius():.1f} C")  # 37.0 C
    # Downside: SensorClassAdapter also exposes read_f() publicly — the adaptee leaks.` },
        { lang: 'ts', code: `// Class adapter: EXTENDS the adaptee instead of holding it.
// Works only if the adaptee can be subclassed; you get exactly one adaptee, fixed when the class is written.
interface Thermometer {
  celsius(): number;
}

class FahrenheitSensor { // vendor class
  readF(): number { return 98.6; }
}

class SensorClassAdapter extends FahrenheitSensor implements Thermometer {
  celsius(): number {
    return ((this.readF() - 32) * 5) / 9; // inherited method, translated result
  }
}

const t: Thermometer = new SensorClassAdapter();
console.log(\`\${t.celsius().toFixed(1)} C\`); // 37.0 C
// Downside: SensorClassAdapter also exposes readF() publicly — the adaptee leaks.` },
        { lang: 'cpp', code: `// Class adapter: INHERITS the adaptee instead of holding it.
// You get exactly one adaptee, fixed when the class is written.
class Thermometer {
public:
    virtual ~Thermometer() = default;
    virtual double celsius() const = 0;
};

class FahrenheitSensor {                      // vendor class
public:
    double readF() const { return 98.6; }
};

// PRIVATE inheritance: "implemented in terms of" the sensor, so readF() does NOT leak to clients.
class SensorClassAdapter : public Thermometer, private FahrenheitSensor {
public:
    double celsius() const override {
        return (readF() - 32) * 5.0 / 9.0;    // inherited method, translated result
    }
};

int main() {
    SensorClassAdapter adapter;
    const Thermometer& t = adapter;
    cout << fixed << setprecision(1) << t.celsius() << " C\\n";   // 37.0 C
    // adapter.readF();  // would not compile: C++ lets a class adapter hide the adaptee
}` },
  { lang: 'csharp', code: `
using System;

// Class adapter: EXTENDS the adaptee instead of holding it.
// Works only if the adaptee is not sealed; you get exactly one adaptee, fixed at compile time.
interface IThermometer { double Celsius(); }

class FahrenheitSensor {               // vendor class
    public double ReadF() { return 98.6; }
}

class SensorClassAdapter : FahrenheitSensor, IThermometer {
    public double Celsius() {
        return (ReadF() - 32) * 5.0 / 9.0;   // inherited method, translated result
    }
}

class Program {
    static void Main() {
        IThermometer t = new SensorClassAdapter();
        Console.WriteLine(t.Celsius().ToString("F1") + " C"); // 37.0 C
        // Downside: SensorClassAdapter also exposes ReadF() publicly — the adaptee leaks.
    }
}` }
      ] }],
    codeTitle: ['Object adapter (the default choice)', 'Class adapter (inheritance) — and why it is rarer'],
    viz: {
      title: 'One payment flowing through the adapter',
      input: '499.99',
      inputLabel: 'Amount in rupees (try 499.99, 250000, 0)',
      gen: function (input) {
        var amt = Number(String(input).trim());
        if (String(input).trim() === '' || isNaN(amt)) throw new Error('Enter an amount in rupees, e.g. 499.99');
        if (Math.abs(amt) > 1e9) throw new Error('Keep the amount below 1,000,000,000');
        var paise = Math.round(amt * 100);
        var code = paise <= 0 ? '13' : (paise > 10000000 ? '51' : '00');
        var result = code === '00' ? 'SUCCESS' : (code === '51' ? 'DECLINED' : 'ERROR');
        var nodes = [B('C', 'Checkout', 10, 32), B('T', 'PaymentProcessor', 45, 8), B('A', 'LegacyBankAdapter', 45, 50), B('X', 'LegacyBankApi', 88, 50)];
        var edges = [['C', 'T', 'uses'], ['A', 'T', 'implements'], ['C', 'A', 'pay(id, ₹)'], ['A', 'X', 'makeTransfer(ref, paise)']];
        var tags = { T: '«interface» (yours)', X: 'vendor jar (frozen)', A: 'the only new class' };
        var f = [];
        f.push(F('<b>The cast.</b> <code>Checkout</code> only knows the <b>Target</b> interface <code>PaymentProcessor</code>. The bank SDK (<b>Adaptee</b>) speaks a different language. The <b>Adapter</b> implements our interface and holds the bank object inside.',
          [G('Adapter class structure', nodes, edges, { tags: tags }), TXT('Arrows: <b>uses</b> = depends on, <b>implements</b> = is-a, the other two are runtime calls.')]));
        f.push(F('<b>The mismatch.</b> Same job, different shape: different method name, different units (rupees vs paise), different answer type (enum vs string code). Without an adapter, every caller would have to know all this.',
          [{ type: 'table', label: 'What each side speaks', columns: ['', 'Checkout expects', 'Bank offers'], rows: [['method', 'pay(orderId, amount)', 'makeTransfer(ref, paise, currency)'], ['amount', 'BigDecimal rupees', 'long paise'], ['answer', 'PaymentResult enum', 'String code "00"/"51"/"13"']], hl: { 1: 'cur', 2: 'cur' } }]));
        f.push(F('Checkout calls <code>processor.pay("42", ' + amt + ')</code>. It thinks it is talking to "a PaymentProcessor". At runtime that object is the <b>adapter</b> — Checkout never sees the bank.',
          [G('Call 1: client → adapter', nodes, edges, { hl: { C: 'cur', A: 'cur' }, ehl: { 'C-A': 'cur' }, tags: tags }), CODE('LegacyBankAdapter.pay', ADAPTER_CODE, { 1: 'cur' })]));
        f.push(F('<b>Translate the input.</b> Rupees become paise: ' + amt + ' × 100 = <b>' + paise + '</b>. <code>longValueExact()</code> would throw if fractions of a paisa slipped in — adapters are where silent unit bugs hide, so be strict here.',
          [VARS('inside the adapter', { amountInRupees: amt, paise: paise, currency: 'INR', reference: 'ORD-42' }, { paise: 'ok', reference: 'ok' }), CODE('LegacyBankAdapter.pay', ADAPTER_CODE, { 2: 'cur', 3: 'cur', 4: 'cur' })]));
        f.push(F('<b>Delegate.</b> The adapter now calls the real bank method with the bank\'s own vocabulary. The adapter does no payment logic itself — it only forwards.',
          [G('Call 2: adapter → adaptee', nodes, edges, { hl: { A: 'done', X: 'cur' }, ehl: { 'C-A': 'done', 'A-X': 'cur' }, tags: tags }), CODE('LegacyBankAdapter.pay', ADAPTER_CODE, { 5: 'cur' })]));
        f.push(F('The bank answers with its raw code <b>"' + code + '"</b>' + (code === '00' ? ' (approved).' : code === '51' ? ' (insufficient funds — over ₹1,00,000 in this toy bank).' : ' (invalid amount).'),
          [G('Adaptee replies', nodes, edges, { hl: { A: 'cur', X: code === '00' ? 'ok' : 'bad' }, ehl: { 'A-X': code === '00' ? 'ok' : 'bad' }, tags: tags }), VARS('bank reply', { code: code }, { code: code === '00' ? 'ok' : 'bad' })]));
        var rowIdx = code === '00' ? 0 : (code === '51' ? 1 : 2);
        f.push(F('<b>Translate the output.</b> The magic string becomes a type-safe enum. This mapping table is the heart of the adapter — and the first thing to unit-test.',
          [{ type: 'table', label: 'response-code mapping', columns: ['bank code', 'PaymentResult'], rows: [['"00"', 'SUCCESS'], ['"51"', 'DECLINED'], ['anything else', 'ERROR']], hl: one(rowIdx, 'sel') }, CODE('LegacyBankAdapter.pay', ADAPTER_CODE, { 6: 'cur', 7: rowIdx === 0 ? 'ok' : '', 8: rowIdx === 1 ? 'ok' : '', 9: rowIdx === 2 ? 'ok' : '' })]));
        f.push(F('Checkout receives <b>' + result + '</b> — a value from <i>its own</i> world. Swap the bank for Stripe tomorrow? Write a <code>StripeAdapter</code>; Checkout does not change a single line.',
          [G('Back to the client', nodes, edges, { hl: { C: 'sel', A: 'done', X: 'done' }, ehl: { 'C-A': 'ok', 'A-X': 'done' }, tags: tags }), VARS('Checkout sees', { result: result }, { result: 'sel' })]));
        return f;
      }
    },
    examples: [
      { title: 'JDK: Arrays.asList adapts an array to the List interface', html: `<p><code>Arrays.asList(arr)</code> returns a small wrapper that implements <code>List</code> but stores nothing of its own — <code>get(i)</code> reads <code>arr[i]</code>. That is why <code>set()</code> works (writes through to the array) but <code>add()</code> throws <code>UnsupportedOperationException</code>: an array cannot grow. Lesson: an adapter can only offer what the adaptee can really do.</p>`, code: { lang: 'java', code: `String[] arr = {"a", "b", "c"};
List<String> view = Arrays.asList(arr);
view.set(0, "z");
System.out.println(arr[0]); // z — the adapter writes through to the array`,
        alt: [
          { lang: 'python', code: `arr = bytearray(b"abc")
view = memoryview(arr)  # an adapter: a sequence-shaped VIEW over the same memory, not a copy
view[0] = ord("z")
print(chr(arr[0]))  # z — the view writes through to the underlying buffer` },
          { lang: 'ts', code: `const arr = new Uint8Array([97, 98, 99]);
const view = arr.subarray(0, 3); // a view over the same memory, not a copy
view[0] = 122;
console.log(arr[0]); // 122 ("z") — the view writes through to the underlying buffer` },
          { lang: 'cpp', code: `int main() {
    vector<string> arr = {"a", "b", "c"};
    span<string> view(arr);                     // an adapter: a bounds-aware VIEW over the same storage
    view[0] = "z";
    cout << arr[0] << "\\n";                     // z — the span writes through to the vector
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class Program {
    static void Main() {
        string[] arr = { "a", "b", "c" };
        IList<string> view = arr;          // an array IS an IList: the adapter writes through
        view[0] = "z";
        Console.WriteLine(arr[0]);         // z
    }
}` }
        ] } },
      { title: 'JDK: InputStreamReader adapts bytes to characters', html: `<p><code>InputStream</code> gives raw bytes; a lot of code wants a <code>Reader</code> (characters). <code>new InputStreamReader(in, StandardCharsets.UTF_8)</code> is an <b>object adapter</b>: it implements <code>Reader</code>, holds the <code>InputStream</code>, and decodes bytes to chars using a charset. Forgetting the charset is the classic bug — the adapter then uses the platform default (which differed by operating system before Java 18; since Java 18 the default is UTF-8, but naming the charset is still clearer).</p>`, code: { lang: 'java', code: `InputStream in = new ByteArrayInputStream("héllo".getBytes(java.nio.charset.StandardCharsets.UTF_8));
Reader r = new InputStreamReader(in, java.nio.charset.StandardCharsets.UTF_8);
BufferedReader br = new BufferedReader(r);
System.out.println(br.readLine());`,
        alt: [
          { lang: 'python', code: `import io

raw = io.BytesIO("héllo".encode("utf-8"))  # bytes
reader = io.TextIOWrapper(raw, encoding="utf-8")  # adapts bytes to characters
print(reader.readline())  # héllo` },
          { lang: 'ts', code: `const bytes = new TextEncoder().encode("héllo"); // bytes
const text = new TextDecoder("utf-8").decode(bytes); // adapts bytes to characters
console.log(text); // héllo` },
          { lang: 'cpp', code: `// std::string holds BYTES; this small adapter turns UTF-8 bytes into characters (code points)
u32string decodeUtf8(const string& bytes) {
    u32string out;
    for (size_t i = 0; i < bytes.size();) {
        unsigned char c = bytes[i];
        int extra = c >= 0xF0 ? 3 : c >= 0xE0 ? 2 : c >= 0xC0 ? 1 : 0;
        char32_t cp = extra == 0 ? c : c & (0x3F >> extra);
        for (int k = 1; k <= extra; k++) cp = cp << 6 | (bytes[i + k] & 0x3F);
        out.push_back(cp);
        i += extra + 1;
    }
    return out;
}

int main() {
    string bytes = "h\\xC3\\xA9llo";               // "héllo" as UTF-8: 6 bytes
    u32string chars = decodeUtf8(bytes);
    cout << bytes.size() << " bytes -> " << chars.size() << " characters\\n";   // 6 bytes -> 5 characters
}` },
  { lang: 'csharp', code: `
using System;
using System.IO;
using System.Text;

class Program {
    static void Main() {
        Stream input = new MemoryStream(Encoding.UTF8.GetBytes("héllo"));
        TextReader r = new StreamReader(input, Encoding.UTF8);   // adapts a byte stream to a character reader
        Console.WriteLine(r.ReadLine());
    }
}` }
        ] } },
      { title: 'Many vendors, one interface (SMS gateway)', html: `<p>Your <code>Notifier</code> interface has <code>send(phone, text)</code>. Twilio wants <code>messages.create(to, from, body)</code>; a local vendor wants an HTTP form with <code>mobile</code> and <code>msg</code> fields and returns <code>"OK:12345"</code>. Write <code>TwilioAdapter</code> and <code>LocalSmsAdapter</code>; pick one from config. Adding a third vendor = one new class, zero changes elsewhere. ${H.chips(['Notifier', 'TwilioAdapter', 'LocalSmsAdapter'], { hl: { Notifier: 'b' } })}</p>` },
      { title: 'Two-way adapter during a migration', html: `<p>Moving from <code>OldUserStore</code> to <code>NewUserRepository</code>? A two-way adapter implements <b>both</b> interfaces and forwards each to the other side. Old modules keep calling the old API, new modules the new API, and you migrate module by module (the "strangler" approach). Delete the adapter when the last old caller is gone.</p>` }
    ],
    deepDive: `<p><b>Object vs class adapter, properly.</b> The object adapter can wrap <i>any subclass</i> of the adaptee and can be swapped at runtime; the class adapter cannot, and it leaks every public method of the adaptee into your type. In languages with single inheritance (Java, TypeScript, C#) a class adapter also burns your only <code>extends</code>; Python and C++ allow several bases, but the leak and the adaptee fixed at compile time remain (C++ private inheritance hides the leak). Default to composition.</p>
      <p><b>Where adapters bite in production.</b> (1) <b>Lossy translation</b> — the adaptee may have states your target cannot express (a bank's "pending" status when your enum only has SUCCESS/FAILED). Decide explicitly: map to ERROR, add a new enum value, or throw. (2) <b>Exceptions</b> — translate vendor exceptions into your own exception types so the vendor's classes do not leak through <code>throws</code> clauses. (3) <b>Units and money</b> — use <code>BigDecimal</code> or integer minor units; never <code>double</code> for currency. (4) <b>Threading</b> — if the adaptee is not thread-safe, the adapter must document it or synchronise. (5) <b>Performance</b> — an adapter that copies a 10 MB payload into another format on every call is now your bottleneck; prefer views (like <code>Arrays.asList</code>) when possible.</p>
      <p><b>Adapter vs neighbours.</b> Adapter <i>changes the interface</i>; Decorator <i>keeps</i> the interface and adds behaviour; Proxy <i>keeps</i> the interface and controls access; Facade <i>defines a new, simpler</i> interface over many classes. In hexagonal architecture, "driven adapters" (database, email, payment) are exactly this pattern at module scale — the domain owns the port (Target), infrastructure owns the adapter.</p>`,
    aiEra: `<p><b>What AI changes:</b> writing the boilerplate of an adapter (method mapping, DTO conversion) is now nearly free — paste the vendor SDK signature and your interface and an assistant drafts the class in seconds. The hard part that remains is the <b>mapping table</b>: which vendor error codes mean "retry", which mean "declined", how rounding works.</p>
      <p><b>Use AI as a partner:</b> <code>Here is the vendor's error-code list and my PaymentResult enum. Propose a mapping, and list every code you were unsure about.</code> Then ask it to generate a parameterised JUnit test over every code. <b>Where AI goes wrong:</b> it happily maps unknown codes to SUCCESS, uses <code>double</code> for money, swallows vendor exceptions, and invents SDK methods that do not exist — always check against the real docs. <b>LLM tool calling is adapters everywhere:</b> an MCP server is literally an adapter that exposes some system (GitHub, a database) through one standard tool interface the model understands. <b>What you must still own:</b> spotting that a problem is an interface mismatch, deciding the lossy cases, and keeping vendor types out of your domain.</p>`,
    problems: [{
      title: 'Plug a Fahrenheit Weather Service into a Celsius App',
      level: 'Easy', tags: ['adapter', 'legacy integration'], companies: ['Amazon', 'Flipkart'],
      statement: `<p>Your app shows weather through the interface <code>WeatherProvider { double celsius(String city); }</code>. The data team bought a US service <code>UsWeatherService</code> with the single method <code>int tempFahrenheit(int zipCode)</code>. You may not edit <code>UsWeatherService</code>. Make the app use it without changing <code>WeatherScreen</code> (the client). A <code>Map&lt;String,Integer&gt;</code> of city → zip is provided.</p>`,
      constraints: `<p>Do not modify <code>UsWeatherService</code> or <code>WeatherScreen</code>. Unknown city → throw <code>IllegalArgumentException</code>. Round to one decimal place for display only.</p>`,
      example: `<p>City <b>"Austin"</b> → zip 73301 → service returns <b>${H.c('y', '86')}</b> °F → adapter returns <b>${H.c('g', '30.0')}</b> °C because (86 − 32) × 5 / 9 = 30.</p>`,
      brute: { why: `<p>The naive fix edits the client: <code>WeatherScreen</code> gets an <code>if (provider is the US one)</code> branch that looks up the zip and converts units. Now the screen knows about zip codes, Fahrenheit and a vendor class. The next vendor adds another branch — the client grows forever and breaks Open/Closed. Every screen that shows weather duplicates the conversion.</p>`, code: { lang: 'java', code: `class UsWeatherService { int tempFahrenheit(int zip) { return 86; } }

class WeatherScreen {
    private final UsWeatherService us = new UsWeatherService();
    private final Map<String, Integer> zips = Map.of("Austin", 73301);

    String render(String city) {
        // client is now coupled to a vendor class, zip codes AND unit math
        Integer zip = zips.get(city);
        if (zip == null) return "unknown city";
        double c = (us.tempFahrenheit(zip) - 32) * 5.0 / 9.0;
        return city + ": " + Math.round(c * 10) / 10.0 + " C";
    }
}`, alt: [
                { lang: 'python', code: `
class UsWeatherService:
    def temp_fahrenheit(self, zip): return 86

class WeatherScreen:
    def __init__(self):
        self._us = UsWeatherService()
        self._zips = {"Austin": 73301}

    def render(self, city):
        # client is now coupled to a vendor class, zip codes AND unit math
        zip = self._zips.get(city)
        if zip is None: return "unknown city"
        c = (self._us.temp_fahrenheit(zip) - 32) * 5.0 / 9.0
        return f"{city}: {round(c, 1)} C"` },
                { lang: 'ts', code: `
class UsWeatherService { tempFahrenheit(zip: number): number { return 86; } }

class WeatherScreen {
    private readonly us = new UsWeatherService();
    private readonly zips = new Map<string, number>([["Austin", 73301]]);

    render(city: string): string {
        // client is now coupled to a vendor class, zip codes AND unit math
        const zip = this.zips.get(city);
        if (zip === undefined) return "unknown city";
        const c = (this.us.tempFahrenheit(zip) - 32) * 5.0 / 9.0;
        return city + ": " + Math.round(c * 10) / 10 + " C";
    }
}` },
                { lang: 'cpp', code: `
struct UsWeatherService { int tempFahrenheit(int zip) { return 86; } };

class WeatherScreen {
    UsWeatherService us;
    map<string, int> zips = {{"Austin", 73301}};
public:
    string render(const string& city) {
        // client is now coupled to a vendor class, zip codes AND unit math
        auto it = zips.find(city);
        if (it == zips.end()) return "unknown city";
        double c = (us.tempFahrenheit(it->second) - 32) * 5.0 / 9.0;
        return city + ": " + to_string(round(c * 10) / 10.0) + " C";
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class UsWeatherService { public int TempFahrenheit(int zip) { return 86; } }

class WeatherScreen {
    private readonly UsWeatherService us = new UsWeatherService();
    private readonly Dictionary<string, int> zips = new Dictionary<string, int> { { "Austin", 73301 } };

    public string Render(string city) {
        // client is now coupled to a vendor class, zip codes AND unit math
        int zip;
        if (!zips.TryGetValue(city, out zip)) return "unknown city";
        double c = (us.TempFahrenheit(zip) - 32) * 5.0 / 9.0;
        return city + ": " + Math.Round(c * 10) / 10.0 + " C";
    }
}` }
              ] } },
      mcq: { q: 'Which class should hold the Fahrenheit → Celsius formula?', options: ['WeatherScreen, right before printing', 'A new class that implements WeatherProvider and wraps UsWeatherService', 'A subclass of WeatherScreen', 'A static helper called from every screen'], answer: 1, explain: 'The adapter owns all translation (city→zip and °F→°C) so the client stays vendor-free and new vendors become new adapters.' },
      hints: [`<p>Hint 1: The client already depends on an interface — <code>WeatherProvider</code>. You only need a new <i>implementation</i> of it.</p>`, `<p>Hint 2: That implementation holds a <code>UsWeatherService</code> and a city → zip map (composition, an object adapter).</p>`, `<p>Hint 3: Recipe: look up zip (throw if missing) → call <code>tempFahrenheit</code> → convert with (F − 32) × 5 / 9 → return. Keep the screen code untouched; inject the adapter in <code>main</code>.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "Austin: 30.0 C\nBoston: 10.0 C\nUnknown city: Paris\n" }] },
      solution: {
        approach: `<p>Create <code>UsWeatherAdapter implements WeatherProvider</code>. Its constructor takes the vendor service and the city→zip map. <code>celsius(city)</code> translates the <b>input</b> (city → zip), <b>delegates</b> to the vendor, then translates the <b>output</b> (°F → °C). The screen only ever sees <code>WeatherProvider</code>, so plugging in a second vendor later means writing a second adapter, nothing else.</p>`,
        code: `interface WeatherProvider { double celsius(String city); }

class UsWeatherService {                    // vendor: cannot change
    int tempFahrenheit(int zipCode) { return zipCode == 73301 ? 86 : 50; }
}

class UsWeatherAdapter implements WeatherProvider {
    private final UsWeatherService service;
    private final Map<String, Integer> cityToZip;

    UsWeatherAdapter(UsWeatherService service, Map<String, Integer> cityToZip) {
        this.service = service;
        this.cityToZip = Map.copyOf(cityToZip);  // defensive copy
    }

    @Override
    public double celsius(String city) {
        Integer zip = cityToZip.get(city);                       // translate input
        if (zip == null) throw new IllegalArgumentException("Unknown city: " + city);
        int f = service.tempFahrenheit(zip);                     // delegate
        return (f - 32) * 5.0 / 9.0;                             // translate output
    }
}

class WeatherScreen {                        // client: unchanged, vendor-free
    private final WeatherProvider provider;
    WeatherScreen(WeatherProvider provider) { this.provider = provider; }
    String render(String city) {
        return city + ": " + String.format("%.1f", provider.celsius(city)) + " C";
    }

    public static void main(String[] args) {
        WeatherProvider p = new UsWeatherAdapter(new UsWeatherService(), Map.of("Austin", 73301, "Boston", 2101));
        WeatherScreen screen = new WeatherScreen(p);
        System.out.println(screen.render("Austin"));   // Austin: 30.0 C
        System.out.println(screen.render("Boston"));   // Boston: 10.0 C
        try { screen.render("Paris"); }
        catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }   // Unknown city: Paris
    }
}`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod


class WeatherProvider(ABC):
    @abstractmethod
    def celsius(self, city: str) -> float: ...


class UsWeatherService:  # vendor: cannot change
    def temp_fahrenheit(self, zip_code: int) -> int:
        return 86 if zip_code == 73301 else 50


class UsWeatherAdapter(WeatherProvider):
    def __init__(self, service: UsWeatherService, city_to_zip: dict[str, int]) -> None:
        self._service = service
        self._city_to_zip = dict(city_to_zip)  # defensive copy

    def celsius(self, city: str) -> float:
        zip_code = self._city_to_zip.get(city)  # translate input
        if zip_code is None:
            raise ValueError(f"Unknown city: {city}")
        f = self._service.temp_fahrenheit(zip_code)  # delegate
        return (f - 32) * 5.0 / 9.0  # translate output


class WeatherScreen:  # client: unchanged, vendor-free
    def __init__(self, provider: WeatherProvider) -> None:
        self._provider = provider

    def render(self, city: str) -> str:
        return f"{city}: {self._provider.celsius(city):.1f} C"


if __name__ == "__main__":
    provider = UsWeatherAdapter(UsWeatherService(), {"Austin": 73301, "Boston": 2101})
    screen = WeatherScreen(provider)
    print(screen.render("Austin"))  # Austin: 30.0 C
    print(screen.render("Boston"))  # Boston: 10.0 C
    try:
        screen.render("Paris")
    except ValueError as e:
        print(e)  # Unknown city: Paris` },
          { lang: 'ts', code: `interface WeatherProvider {
  celsius(city: string): number;
}

class UsWeatherService { // vendor: cannot change
  tempFahrenheit(zipCode: number): number {
    return zipCode === 73301 ? 86 : 50;
  }
}

class UsWeatherAdapter implements WeatherProvider {
  private readonly cityToZip: ReadonlyMap<string, number>;

  constructor(private readonly service: UsWeatherService, cityToZip: Record<string, number>) {
    this.cityToZip = new Map(Object.entries(cityToZip)); // defensive copy
  }

  celsius(city: string): number {
    const zip = this.cityToZip.get(city); // translate input
    if (zip === undefined) throw new Error(\`Unknown city: \${city}\`);
    const f = this.service.tempFahrenheit(zip); // delegate
    return ((f - 32) * 5) / 9; // translate output
  }
}

class WeatherScreen { // client: unchanged, vendor-free
  constructor(private readonly provider: WeatherProvider) {}

  render(city: string): string {
    return \`\${city}: \${this.provider.celsius(city).toFixed(1)} C\`;
  }
}

const ui = new WeatherScreen(
  new UsWeatherAdapter(new UsWeatherService(), { Austin: 73301, Boston: 2101 }),
);
console.log(ui.render("Austin")); // Austin: 30.0 C
console.log(ui.render("Boston")); // Boston: 10.0 C
try {
  ui.render("Paris");
} catch (e) {
  console.log((e as Error).message); // Unknown city: Paris
}` },
          { lang: 'cpp', code: `class WeatherProvider {
public:
    virtual ~WeatherProvider() = default;
    virtual double celsius(const string& city) const = 0;
};

class UsWeatherService {                 // vendor: cannot change
public:
    int tempFahrenheit(int zipCode) const { return zipCode == 73301 ? 86 : 50; }
};

class UsWeatherAdapter : public WeatherProvider {
    const UsWeatherService& service_;
    map<string, int> cityToZip_;
public:
    UsWeatherAdapter(const UsWeatherService& service, map<string, int> cityToZip)
        : service_(service), cityToZip_(std::move(cityToZip)) {}   // own copy of the map

    double celsius(const string& city) const override {
        auto it = cityToZip_.find(city);                           // translate input
        if (it == cityToZip_.end()) throw invalid_argument("Unknown city: " + city);
        int f = service_.tempFahrenheit(it->second);               // delegate
        return (f - 32) * 5.0 / 9.0;                               // translate output
    }
};

class WeatherScreen {                    // client: unchanged, vendor-free
    const WeatherProvider& provider_;
public:
    explicit WeatherScreen(const WeatherProvider& provider) : provider_(provider) {}
    string render(const string& city) const {
        ostringstream out;
        out << city << ": " << fixed << setprecision(1) << provider_.celsius(city) << " C";
        return out.str();
    }
};

int main() {
    UsWeatherService vendor;
    UsWeatherAdapter adapter(vendor, {{"Austin", 73301}, {"Boston", 2101}});
    WeatherScreen screen(adapter);
    cout << screen.render("Austin") << "\\n";   // Austin: 30.0 C
    cout << screen.render("Boston") << "\\n";   // Boston: 10.0 C
    try {
        screen.render("Paris");
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";              // Unknown city: Paris
    }
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

interface IWeatherProvider { double Celsius(string city); }

class UsWeatherService {                    // vendor: cannot change
    public int TempFahrenheit(int zipCode) { return zipCode == 73301 ? 86 : 50; }
}

class UsWeatherAdapter : IWeatherProvider {
    private readonly UsWeatherService service;
    private readonly Dictionary<string, int> cityToZip;

    public UsWeatherAdapter(UsWeatherService service, Dictionary<string, int> cityToZip) {
        this.service = service;
        this.cityToZip = new Dictionary<string, int>(cityToZip);  // defensive copy
    }

    public double Celsius(string city) {
        int zip;
        if (!cityToZip.TryGetValue(city, out zip)) throw new ArgumentException("Unknown city: " + city);   // translate input
        int f = service.TempFahrenheit(zip);                     // delegate
        return (f - 32) * 5.0 / 9.0;                             // translate output
    }
}

class WeatherScreen {                        // client: unchanged, vendor-free
    private readonly IWeatherProvider provider;
    public WeatherScreen(IWeatherProvider provider) { this.provider = provider; }
    public string Render(string city) {
        return city + ": " + provider.Celsius(city).ToString("F1") + " C";
    }
}

class Program {
    static void Main() {
        IWeatherProvider p = new UsWeatherAdapter(new UsWeatherService(), new Dictionary<string, int> { { "Austin", 73301 }, { "Boston", 2101 } });
        WeatherScreen screen = new WeatherScreen(p);
        Console.WriteLine(screen.Render("Austin"));   // Austin: 30.0 C
        Console.WriteLine(screen.Render("Boston"));   // Boston: 10.0 C
        try { screen.Render("Paris"); }
        catch (ArgumentException e) { Console.WriteLine(e.Message); }   // Unknown city: Paris
    }
}` }
        ],
        complexity: `<p>O(1) per call (one map lookup + one delegated call). Memory O(number of cities) for the zip map. The real cost is the vendor's network call, which the adapter does not change.</p>`,
        followUps: ['Add a second provider (Kelvin-based EU service) — what changes?', 'How would you add caching without touching the adapter? (Hint: wrap it in a Proxy/Decorator.)', 'The vendor sometimes returns -999 for "sensor offline" — how should the adapter report that?']
      }
    }]
  });
  /* =====================================================================
     TOPIC 2 — DECORATOR
     ===================================================================== */
  var DECO_PRICES = { espresso: 120, houseblend: 90, decaf: 100, milk: 20, soy: 30, mocha: 35, caramel: 25, whip: 15, sugar: 5 };
  var DECO_BASES = ['espresso', 'houseblend', 'decaf'];
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  topics.push({
    title: 'Decorator — Add Features by Wrapping',
    analogy: `<p>Think of a plain phone. You slip on a <b>protective case</b>. Then you stick on a <b>pop-socket</b>. Then a <b>wallet sleeve</b>. It is still "a phone" — you hold it, call, swipe the same way — but each layer added one extra ability. You can add or remove layers in any order without buying a new phone model called "PhoneWithCaseAndSocketAndWallet".</p>
      <p>A <b>Decorator</b> is one of those layers: an object that looks exactly like the thing it wraps (same interface), does a little extra, and then passes the call inward.</p>`,
    explain: `<p><b>The problem.</b> A coffee shop sells Espresso, House Blend and Decaf, and customers can add Milk, Soy, Mocha, Caramel, Whip — in any combination, even double Mocha. If you model each combination as a subclass (<code>EspressoWithMilkAndWhip</code>…) you need 3 × 2<sup>5</sup> = <b>96 classes</b>, and every new add-on doubles that number. This is called <b>class explosion</b>.</p>
      <p><b>The fix.</b> Give everything one interface, <code>Beverage { cost(); description(); }</code>. Each add-on is a class that <b>implements Beverage</b> and <b>holds another Beverage</b> inside. Its <code>cost()</code> is "whatever the inner drink costs, plus my price". You build drinks at runtime by wrapping:</p>
      <pre>new Whip(new Caramel(new Milk(new Espresso())))</pre>
      ${H.table(['Layer (outer → inner)', 'cost() does', 'returns'], [['Whip', 'inner.cost() + 15', '<b>180</b>'], ['Caramel', 'inner.cost() + 25', '165'], ['Milk', 'inner.cost() + 20', '140'], ['Espresso (base)', 'return 120', '120']])}
      <p>So we need <b>3 + 5 = 8 classes</b> instead of 96. Each class does one thing (Single Responsibility), and new add-ons never touch old code (Open/Closed).</p>
      <p><b>Roles:</b> ${H.kv([['Component', 'the shared interface (Beverage)'], ['Concrete component', 'the real thing at the centre (Espresso)'], ['Decorator (abstract)', 'implements Component and holds a Component'], ['Concrete decorators', 'Milk, Whip… each adds one behaviour']])}</p>
      <p><b>You use decorators daily (Java shown):</b> <code>new BufferedReader(new InputStreamReader(new FileInputStream(f)))</code> — buffering wraps decoding wraps the file. <code>Collections.unmodifiableList(list)</code> and <code>Collections.synchronizedList(list)</code> are decorators too: same <code>List</code> interface, extra rule added. Python's <code>io.TextIOWrapper(io.BufferedReader(raw))</code> and Node.js stream pipelines stack the same way.</p>`,
    clues: ['"add responsibilities <b>dynamically</b> / at runtime" to individual objects', '"<b>any combination</b> of options / toppings / add-ons / features" → class explosion with inheritance', '"add logging / retries / caching / metrics / auth <b>around</b> an existing service without changing it"', '"pipeline of transformations" on a stream: compress, encrypt, buffer, encode', '"cannot subclass (final class)" but still need extra behaviour', 'interviewer says "and later we will add more toppings" — they are fishing for Decorator'],
    code: [{ lang: 'java', title: 'Coffee with add-on decorators', code: `
// Component
interface Beverage {
    String description();
    int cost();               // in rupees
}

// Concrete components — the "real" drinks at the centre
class Espresso implements Beverage {
    public String description() { return "Espresso"; }
    public int cost() { return 120; }
}
class HouseBlend implements Beverage {
    public String description() { return "House Blend"; }
    public int cost() { return 90; }
}

// Abstract decorator: IS-A Beverage and HAS-A Beverage
abstract class AddOn implements Beverage {
    protected final Beverage inner;
    protected AddOn(Beverage inner) { this.inner = Objects.requireNonNull(inner); }
}

// Concrete decorators: each adds exactly one thing, then delegates inward
class Milk extends AddOn {
    Milk(Beverage b) { super(b); }
    public String description() { return inner.description() + ", Milk"; }
    public int cost() { return inner.cost() + 20; }
}
class Caramel extends AddOn {
    Caramel(Beverage b) { super(b); }
    public String description() { return inner.description() + ", Caramel"; }
    public int cost() { return inner.cost() + 25; }
}
class Whip extends AddOn {
    Whip(Beverage b) { super(b); }
    public String description() { return inner.description() + ", Whip"; }
    public int cost() { return inner.cost() + 15; }
}

class CoffeeShop {
    public static void main(String[] args) {
        Beverage order = new Whip(new Caramel(new Milk(new Espresso())));
        System.out.println(order.description() + " = Rs " + order.cost()); // 180
        Beverage doubleMilk = new Milk(new Milk(new HouseBlend()));      // stacking twice is free
        System.out.println(doubleMilk.description() + " = Rs " + doubleMilk.cost()); // 130
    }
}`,
      alt: [
        { lang: 'python', code: `from abc import ABC, abstractmethod


# Component
class Beverage(ABC):
    @abstractmethod
    def description(self) -> str: ...

    @abstractmethod
    def cost(self) -> int: ...  # in rupees


# Concrete components — the "real" drinks at the centre
class Espresso(Beverage):
    def description(self) -> str:
        return "Espresso"

    def cost(self) -> int:
        return 120


class HouseBlend(Beverage):
    def description(self) -> str:
        return "House Blend"

    def cost(self) -> int:
        return 90


# Abstract decorator: IS-A Beverage and HAS-A Beverage
class AddOn(Beverage, ABC):
    def __init__(self, inner: Beverage) -> None:
        self._inner = inner


# Concrete decorators: each adds exactly one thing, then delegates inward
class Milk(AddOn):
    def description(self) -> str:
        return self._inner.description() + ", Milk"

    def cost(self) -> int:
        return self._inner.cost() + 20


class Caramel(AddOn):
    def description(self) -> str:
        return self._inner.description() + ", Caramel"

    def cost(self) -> int:
        return self._inner.cost() + 25


class Whip(AddOn):
    def description(self) -> str:
        return self._inner.description() + ", Whip"

    def cost(self) -> int:
        return self._inner.cost() + 15


if __name__ == "__main__":
    order = Whip(Caramel(Milk(Espresso())))
    print(f"{order.description()} = Rs {order.cost()}")  # 180
    double_milk = Milk(Milk(HouseBlend()))  # stacking twice is free
    print(f"{double_milk.description()} = Rs {double_milk.cost()}")  # 130` },
        { lang: 'ts', code: `// Component
interface Beverage {
  description(): string;
  cost(): number; // in rupees
}

// Concrete components — the "real" drinks at the centre
class Espresso implements Beverage {
  description(): string { return "Espresso"; }
  cost(): number { return 120; }
}

class HouseBlend implements Beverage {
  description(): string { return "House Blend"; }
  cost(): number { return 90; }
}

// Abstract decorator: IS-A Beverage and HAS-A Beverage
abstract class AddOn implements Beverage {
  protected constructor(protected readonly inner: Beverage) {}
  abstract description(): string;
  abstract cost(): number;
}

// Concrete decorators: each adds exactly one thing, then delegates inward
class Milk extends AddOn {
  constructor(b: Beverage) { super(b); }
  description(): string { return this.inner.description() + ", Milk"; }
  cost(): number { return this.inner.cost() + 20; }
}

class Caramel extends AddOn {
  constructor(b: Beverage) { super(b); }
  description(): string { return this.inner.description() + ", Caramel"; }
  cost(): number { return this.inner.cost() + 25; }
}

class Whip extends AddOn {
  constructor(b: Beverage) { super(b); }
  description(): string { return this.inner.description() + ", Whip"; }
  cost(): number { return this.inner.cost() + 15; }
}

const order: Beverage = new Whip(new Caramel(new Milk(new Espresso())));
console.log(\`\${order.description()} = Rs \${order.cost()}\`); // 180
const doubleMilk: Beverage = new Milk(new Milk(new HouseBlend())); // stacking twice is free
console.log(\`\${doubleMilk.description()} = Rs \${doubleMilk.cost()}\`); // 130` },
        { lang: 'cpp', code: `// Component
class Beverage {
public:
    virtual ~Beverage() = default;
    virtual string description() const = 0;
    virtual int cost() const = 0;                 // in rupees
};

// Concrete components — the "real" drinks at the centre
class Espresso : public Beverage {
public:
    string description() const override { return "Espresso"; }
    int cost() const override { return 120; }
};
class HouseBlend : public Beverage {
public:
    string description() const override { return "House Blend"; }
    int cost() const override { return 90; }
};

// Abstract decorator: IS-A Beverage and HAS-A Beverage (owns what it wraps)
class AddOn : public Beverage {
protected:
    unique_ptr<Beverage> inner_;
    explicit AddOn(unique_ptr<Beverage> inner) : inner_(std::move(inner)) {}
};

// Concrete decorators: each adds exactly one thing, then delegates inward
class Milk : public AddOn {
public:
    explicit Milk(unique_ptr<Beverage> b) : AddOn(std::move(b)) {}
    string description() const override { return inner_->description() + ", Milk"; }
    int cost() const override { return inner_->cost() + 20; }
};
class Caramel : public AddOn {
public:
    explicit Caramel(unique_ptr<Beverage> b) : AddOn(std::move(b)) {}
    string description() const override { return inner_->description() + ", Caramel"; }
    int cost() const override { return inner_->cost() + 25; }
};
class Whip : public AddOn {
public:
    explicit Whip(unique_ptr<Beverage> b) : AddOn(std::move(b)) {}
    string description() const override { return inner_->description() + ", Whip"; }
    int cost() const override { return inner_->cost() + 15; }
};

int main() {
    unique_ptr<Beverage> order = make_unique<Whip>(make_unique<Caramel>(make_unique<Milk>(make_unique<Espresso>())));
    cout << order->description() << " = Rs " << order->cost() << "\\n";           // 180
    unique_ptr<Beverage> doubleMilk = make_unique<Milk>(make_unique<Milk>(make_unique<HouseBlend>()));   // stacking twice is free
    cout << doubleMilk->description() << " = Rs " << doubleMilk->cost() << "\\n"; // 130
}` },
  { lang: 'csharp', code: `
using System;

// Component
interface IBeverage {
    string Description();
    int Cost();               // in rupees
}

// Concrete components — the "real" drinks at the centre
class Espresso : IBeverage {
    public string Description() { return "Espresso"; }
    public int Cost() { return 120; }
}
class HouseBlend : IBeverage {
    public string Description() { return "House Blend"; }
    public int Cost() { return 90; }
}

// Abstract decorator: IS-A IBeverage and HAS-A IBeverage
abstract class AddOn : IBeverage {
    protected readonly IBeverage inner;
    protected AddOn(IBeverage inner) { if (inner == null) throw new ArgumentNullException("inner"); this.inner = inner; }
    public abstract string Description();
    public abstract int Cost();
}

// Concrete decorators: each adds exactly one thing, then delegates inward
class Milk : AddOn {
    public Milk(IBeverage b) : base(b) { }
    public override string Description() { return inner.Description() + ", Milk"; }
    public override int Cost() { return inner.Cost() + 20; }
}
class Caramel : AddOn {
    public Caramel(IBeverage b) : base(b) { }
    public override string Description() { return inner.Description() + ", Caramel"; }
    public override int Cost() { return inner.Cost() + 25; }
}
class Whip : AddOn {
    public Whip(IBeverage b) : base(b) { }
    public override string Description() { return inner.Description() + ", Whip"; }
    public override int Cost() { return inner.Cost() + 15; }
}

class Program {
    static void Main() {
        IBeverage order = new Whip(new Caramel(new Milk(new Espresso())));
        Console.WriteLine(order.Description() + " = Rs " + order.Cost()); // 180
        IBeverage doubleMilk = new Milk(new Milk(new HouseBlend()));      // stacking twice is free
        Console.WriteLine(doubleMilk.Description() + " = Rs " + doubleMilk.Cost()); // 130
    }
}` }
      ] },
    { lang: 'java', title: 'Stream-style decorators (encoding + timing)', code: `
// Real-world style: decorators around a data sink (like java.io streams)
interface DataSink {
    void write(String data);
}

class ConsoleSink implements DataSink {               // concrete component
    public void write(String data) { System.out.println("stored: " + data); }
}

abstract class SinkDecorator implements DataSink {
    protected final DataSink next;
    SinkDecorator(DataSink next) { this.next = next; }
}

class Base64Encoding extends SinkDecorator {           // transforms data on the way in
    Base64Encoding(DataSink next) { super(next); }
    public void write(String data) {
        next.write(Base64.getEncoder().encodeToString(data.getBytes()));
    }
}

class Timing extends SinkDecorator {                   // cross-cutting concern
    Timing(DataSink next) { super(next); }
    public void write(String data) {
        long t0 = System.nanoTime();
        next.write(data);
        System.out.println("write took " + (System.nanoTime() - t0) / 1000 + " us");
    }
}

class SinkDemo {
    public static void main(String[] args) {
        DataSink sink = new Timing(new Base64Encoding(new ConsoleSink()));
        sink.write("hello");   // timing → encode → console
    }
}`,
      alt: [
        { lang: 'python', code: `import base64
import time
from abc import ABC, abstractmethod


# Real-world style: decorators around a data sink (like java.io streams)
class DataSink(ABC):
    @abstractmethod
    def write(self, data: str) -> None: ...


class ConsoleSink(DataSink):  # concrete component
    def write(self, data: str) -> None:
        print(f"stored: {data}")


class SinkDecorator(DataSink, ABC):
    def __init__(self, next_sink: DataSink) -> None:
        self._next = next_sink


class Base64Encoding(SinkDecorator):  # transforms data on the way in
    def write(self, data: str) -> None:
        self._next.write(base64.b64encode(data.encode()).decode())


class Timing(SinkDecorator):  # cross-cutting concern
    def write(self, data: str) -> None:
        t0 = time.perf_counter_ns()
        self._next.write(data)
        print(f"write took {(time.perf_counter_ns() - t0) // 1000} us")


if __name__ == "__main__":
    sink: DataSink = Timing(Base64Encoding(ConsoleSink()))
    sink.write("hello")  # timing → encode → console` },
        { lang: 'ts', code: `// Real-world style: decorators around a data sink (like java.io streams)
interface DataSink {
  write(data: string): void;
}

class ConsoleSink implements DataSink { // concrete component
  write(data: string): void { console.log(\`stored: \${data}\`); }
}

abstract class SinkDecorator implements DataSink {
  protected constructor(protected readonly next: DataSink) {}
  abstract write(data: string): void;
}

class Base64Encoding extends SinkDecorator { // transforms data on the way in
  constructor(next: DataSink) { super(next); }
  write(data: string): void {
    this.next.write(Buffer.from(data, "utf8").toString("base64"));
  }
}

class Timing extends SinkDecorator { // cross-cutting concern
  constructor(next: DataSink) { super(next); }
  write(data: string): void {
    const t0 = process.hrtime.bigint();
    this.next.write(data);
    console.log(\`write took \${(process.hrtime.bigint() - t0) / 1000n} us\`);
  }
}

const sink: DataSink = new Timing(new Base64Encoding(new ConsoleSink()));
sink.write("hello"); // timing → encode → console` },
        { lang: 'cpp', code: `// Real-world style: decorators around a data sink (like java.io streams)
class DataSink {
public:
    virtual ~DataSink() = default;
    virtual void write(const string& data) = 0;
};

class ConsoleSink : public DataSink {                    // concrete component
public:
    void write(const string& data) override { cout << "stored: " << data << "\\n"; }
};

class SinkDecorator : public DataSink {
protected:
    unique_ptr<DataSink> next_;
    explicit SinkDecorator(unique_ptr<DataSink> next) : next_(std::move(next)) {}
};

class Base64Encoding : public SinkDecorator {            // transforms data on the way in
    static string encode(const string& in) {
        static const char* T = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        string out;
        for (size_t i = 0; i < in.size(); i += 3) {
            unsigned n = static_cast<unsigned char>(in[i]) << 16;
            if (i + 1 < in.size()) n |= static_cast<unsigned char>(in[i + 1]) << 8;
            if (i + 2 < in.size()) n |= static_cast<unsigned char>(in[i + 2]);
            out += T[n >> 18 & 63];
            out += T[n >> 12 & 63];
            out += i + 1 < in.size() ? T[n >> 6 & 63] : '=';
            out += i + 2 < in.size() ? T[n & 63] : '=';
        }
        return out;
    }
public:
    explicit Base64Encoding(unique_ptr<DataSink> next) : SinkDecorator(std::move(next)) {}
    void write(const string& data) override { next_->write(encode(data)); }
};

class Timing : public SinkDecorator {                    // cross-cutting concern
public:
    explicit Timing(unique_ptr<DataSink> next) : SinkDecorator(std::move(next)) {}
    void write(const string& data) override {
        auto t0 = chrono::steady_clock::now();
        next_->write(data);
        auto us = chrono::duration_cast<chrono::microseconds>(chrono::steady_clock::now() - t0).count();
        cout << "write took " << us << " us\\n";
    }
};

int main() {
    unique_ptr<DataSink> sink = make_unique<Timing>(make_unique<Base64Encoding>(make_unique<ConsoleSink>()));
    sink->write("hello");   // timing → encode → console
}` },
  { lang: 'csharp', code: `
using System;
using System.Diagnostics;
using System.Text;

// Real-world style: decorators around a data sink (like System.IO streams)
interface IDataSink {
    void Write(string data);
}

class ConsoleSink : IDataSink {                        // concrete component
    public void Write(string data) { Console.WriteLine("stored: " + data); }
}

abstract class SinkDecorator : IDataSink {
    protected readonly IDataSink next;
    protected SinkDecorator(IDataSink next) { this.next = next; }
    public abstract void Write(string data);
}

class Base64Encoding : SinkDecorator {                 // transforms data on the way in
    public Base64Encoding(IDataSink next) : base(next) { }
    public override void Write(string data) {
        next.Write(Convert.ToBase64String(Encoding.UTF8.GetBytes(data)));
    }
}

class Timing : SinkDecorator {                         // cross-cutting concern
    public Timing(IDataSink next) : base(next) { }
    public override void Write(string data) {
        Stopwatch sw = Stopwatch.StartNew();
        next.Write(data);
        Console.WriteLine("write took " + sw.Elapsed.Ticks / 10 + " us");
    }
}

class Program {
    static void Main() {
        IDataSink sink = new Timing(new Base64Encoding(new ConsoleSink()));
        sink.Write("hello");   // timing → encode → console
    }
}` }
      ] }],
    codeTitle: ['Coffee with add-on decorators', 'Stream-style decorators (encoding + timing)'],
    viz: {
      title: 'Wrapping layers, then a call travelling in and out',
      input: 'Espresso Milk Caramel Whip',
      inputLabel: 'Base drink then add-ons (bases: Espresso, HouseBlend, Decaf; add-ons: Milk, Soy, Mocha, Caramel, Whip, Sugar)',
      gen: function (input) {
        var w = words(input, 'Example: Espresso Milk Caramel Whip', 7).map(function (s) { return s.toLowerCase(); });
        if (DECO_BASES.indexOf(w[0]) < 0) throw new Error('Start with a base drink: Espresso, HouseBlend or Decaf');
        for (var i = 1; i < w.length; i++) if (!DECO_PRICES[w[i]] || DECO_BASES.indexOf(w[i]) >= 0) throw new Error('Unknown add-on "' + w[i] + '". Use Milk, Soy, Mocha, Caramel, Whip, Sugar');
        var names = w.map(cap), f = [];
        var nodes = [B('BV', 'Beverage', 50, 6), B('ES', names[0], 15, 50), B('AD', 'AddOn (abstract)', 60, 32), B('D1', names.length > 1 ? names[1] : 'Milk', 45, 56), B('D2', names.length > 2 ? names[2] : 'Whip', 80, 56)];
        var edges = [['ES', 'BV', 'implements'], ['AD', 'BV', 'implements + wraps one'], ['D1', 'AD', 'extends'], ['D2', 'AD', 'extends']];
        f.push(F('<b>Structure.</b> Every piece implements <code>Beverage</code>. The abstract <code>AddOn</code> also <i>holds</i> a Beverage — that double relationship (is-a + has-a) is the whole trick: a decorator can wrap a base drink <i>or another decorator</i>.',
          [G('Decorator class structure', nodes, edges, { hl: { AD: 'sel' }, ehl: { 'AD-BV': 'sel' }, tags: { BV: '«interface»' } })]));
        var layers = [];
        for (var k = 0; k < names.length; k++) {
          layers.push(names[k] + (k === 0 ? ' (base)' : ' +' + DECO_PRICES[w[k]]));
          var expr = 'new ' + names[0] + '()';
          for (var j = 1; j <= k; j++) expr = 'new ' + names[j] + '(' + expr + ')';
          f.push(F(k === 0 ? 'Build step 1: create the real drink <b>' + names[0] + '</b> (₹' + DECO_PRICES[w[0]] + '). This is the centre of the onion.' : 'Wrap it: <code>' + expr + '</code>. The new <b>' + names[k] + '</b> object stores the previous object in its <code>inner</code> field. From outside it is still "a Beverage".',
            [{ type: 'stack', label: 'object layers (outermost on top)', items: layers.slice(), hl: one(k, 'ok') }, VARS('so far', { expression: expr, classesWritten: (k + 1) + ' (no combo classes)' })]));
        }
        var calls = [];
        for (var c = names.length - 1; c >= 0; c--) {
          calls.push(names[c] + '.cost()');
          f.push(F('Call travels <b>inward</b>: <code>' + names[c] + '.cost()</code> ' + (c > 0 ? 'cannot answer alone — it first asks its inner drink, so it pushes a new call.' : 'is the base: it knows its own price, no more wrapping.'),
            [{ type: 'stack', label: 'object layers', items: layers.slice(), hl: one(c, 'cur') }, { type: 'stack', label: 'call stack', items: calls.slice(), hl: one(calls.length - 1, 'cur') }]));
        }
        var total = 0;
        for (var r = 0; r < names.length; r++) {
          total += DECO_PRICES[w[r]];
          calls.pop();
          var hlLayers = {}; for (var q = 0; q <= r; q++) hlLayers[q] = q === r ? 'ok' : 'done';
          f.push(F('Return travels <b>outward</b>: <b>' + names[r] + '</b> ' + (r === 0 ? 'returns ₹' + total + '.' : 'adds its ₹' + DECO_PRICES[w[r]] + ' → returns ₹' + total + '.') + (r === names.length - 1 ? ' That is the final answer the client sees.' : ''),
            [{ type: 'stack', label: 'object layers', items: layers.slice(), hl: hlLayers }, { type: 'stack', label: 'call stack', items: calls.length ? calls.slice() : ['(empty)'], hl: calls.length ? one(calls.length - 1, 'cur') : {} }, VARS('running total', { total: total }, { total: r === names.length - 1 ? 'sel' : 'ok' })]));
        }
        var addOns = names.length - 1;
        f.push(F('<b>Why not inheritance?</b> With 3 bases and 6 add-ons, one subclass per combination needs 3 × 2<sup>6</sup> = 192 classes (more if doubles are allowed). Decorators need 3 + 6 = 9 — and this order used ' + addOns + ' wrapper object' + (addOns === 1 ? '' : 's') + '.',
          [{ type: 'bars', label: 'classes needed (inheritance vs decorator)', values: [192, 9], texts: ['192', '9'], idxLabels: ['subclass per combo', 'decorators'], hl: { 0: 'bad', 1: 'ok' } }]));
        return f;
      }
    },
    examples: [
      { title: 'java.io is a decorator tower', html: `<p><code>new BufferedReader(new InputStreamReader(new FileInputStream("a.txt"), UTF_8))</code>. <code>FileInputStream</code> is the concrete component; <code>BufferedInputStream</code>, <code>DataInputStream</code>, <code>GZIPInputStream</code> all extend <code>FilterInputStream</code>, which is the JDK's abstract decorator (it holds an <code>InputStream in</code>). (<code>InputStreamReader</code> in the middle is actually an <b>adapter</b> — bytes to chars — a nice reminder that patterns mix.)</p>`, code: { lang: 'java', code: `try (BufferedReader r = new BufferedReader(new StringReader("line1\\nline2"))) {
    System.out.println(r.readLine()); // BufferedReader decorates any Reader
}`,
        alt: [
          { lang: 'python', code: `import io

# TextIOWrapper decorates a BufferedReader, which decorates the raw byte stream
with io.TextIOWrapper(io.BufferedReader(io.BytesIO(b"line1\\nline2"))) as r:
    print(r.readline().rstrip("\\n"))  # line1` },
          { lang: 'ts', code: `import { createInterface } from "node:readline";
import { Readable } from "node:stream";

async function firstLine(): Promise<void> {
  // readline decorates any readable stream: same bytes in, line-by-line access added
  const reader = createInterface({ input: Readable.from(["line1\\nline2"]) });
  for await (const line of reader) {
    console.log(line); // line1
    break;
  }
  reader.close();
}

void firstLine();` },
          { lang: 'cpp', code: `int main() {
    istringstream source("line1\\nline2");       // any std::istream can be the layer below
    string line;
    getline(source, line);                      // getline adds line splitting on top of the raw stream
    cout << line << "\\n";                       // line1
}` },
  { lang: 'csharp', code: `
using System;
using System.IO;

class Program {
    static void Main() {
        using (TextReader r = new StringReader("line1\\nline2")) {
            Console.WriteLine(r.ReadLine()); // StreamReader/StringReader decorate any underlying source the same way
        }
    }
}` }
        ] } },
      { title: 'Order of decorators matters', html: `<p>Compress-then-encrypt is good: compression finds repeating patterns, then encryption scrambles. Encrypt-then-compress is useless: encrypted bytes look random, so they barely compress. Same for a <b>Retry</b> and a <b>Timeout</b> decorator: <code>Retry(Timeout(call))</code> gives each attempt its own timeout; <code>Timeout(Retry(call))</code> gives all attempts one shared deadline. Always decide and document the order.</p>` },
      { title: 'Unmodifiable / synchronized wrappers', html: `<p><code>Collections.unmodifiableList(list)</code> returns a <code>List</code> that forwards reads and throws on writes. <code>Collections.synchronizedMap(map)</code> forwards every call inside a <code>synchronized</code> block. Both keep the interface and add one rule — classic decorators. Note: the original list is still mutable by whoever holds it; the decorator protects only callers who go through it.</p>`, code: { lang: 'java', code: `List<Integer> base = new ArrayList<>(List.of(1, 2));
List<Integer> ro = Collections.unmodifiableList(base);
base.add(3);
System.out.println(ro); // [1, 2, 3] — a view, not a copy`,
        alt: [
          { lang: 'python', code: `from types import MappingProxyType

base = {"a": 1}
ro = MappingProxyType(base)  # a read-only VIEW, not a copy
base["b"] = 2
print(dict(ro))  # {'a': 1, 'b': 2} — the view sees the change; ro["c"] = 3 would raise TypeError` },
          { lang: 'ts', code: `const base: number[] = [1, 2];
const ro: readonly number[] = base; // read-only VIEW (a type-level wrapper), not a copy
base.push(3);
console.log(JSON.stringify(ro)); // [1,2,3] — a view, not a copy; ro.push(4) is a compile error` },
          { lang: 'cpp', code: `int main() {
    vector<int> base = {1, 2};
    span<const int> ro(base);                   // read-only VIEW, not a copy (build it once base has its final size)
    base[0] = 10;
    cout << ro[0] << " " << ro.size() << "\\n";  // 10 2 — a view sees later writes; ro[0] = 5 would not compile
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;

class Program {
    static void Main() {
        List<int> baseList = new List<int> { 1, 2 };
        ReadOnlyCollection<int> ro = baseList.AsReadOnly();
        baseList.Add(3);
        Console.WriteLine("[" + string.Join(", ", ro) + "]"); // [1, 2, 3] — a view, not a copy
    }
}` }
        ] } },
      { title: 'Cross-cutting concerns around a service', html: `<p><code>OrderService svc = new MetricsOrderService(new RetryingOrderService(new DbOrderService(), 3));</code> — the database class has zero logging or retry code; each concern lives in its own small class, testable alone. Frameworks generate such wrappers for you (Spring's <code>@Transactional</code>, <code>@Cacheable</code>), but they are the same idea.</p>` }
    ],
    deepDive: `<p><b>Decorator vs subclassing.</b> Inheritance adds behaviour at <i>compile time</i> to <i>every</i> instance; decorators add it at <i>runtime</i> to <i>one</i> instance, and can be stacked or repeated. The cost: many small objects, longer stack traces, and harder debugging ("which layer changed this?").</p>
      <p><b>Identity and type checks break.</b> <code>order instanceof Espresso</code> is <code>false</code> once wrapped, and <code>equals</code>/<code>hashCode</code> on decorators are rarely meaningful. Code that needs to "peek at the inner object" is a smell — the client should only use the component interface. If you must, expose a deliberate method rather than casting.</p>
      <p><b>The fat-interface trap.</b> If <code>Beverage</code> has 20 methods, every decorator must forward all 20 even when it only changes one. Fix: the abstract decorator forwards everything by default (like <code>FilterInputStream</code>), and concrete decorators override only what they change. Keep component interfaces small (Interface Segregation).</p>
      <p><b>Decorator vs Proxy vs Chain of Responsibility.</b> Structurally identical (wrap + delegate). Intent differs: decorator <i>adds</i> behaviour and is usually composed by the client; proxy <i>controls access</i> and is usually created for you (lazy load, security, remote); chain of responsibility lets a link <i>stop</i> the request. Middleware in web frameworks (servlet filters, Express middleware) is a decorator/chain hybrid.</p>
      <p><b>Functional decorators.</b> With lambdas you can decorate without classes: <code>Function&lt;Req,Res&gt; logged = req -&gt; { log(req); return inner.apply(req); }</code>. <code>Function.andThen</code> and <code>compose</code> are decorator-style composition built into the JDK.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants generate decorator classes and the forwarding boilerplate instantly, and modern frameworks already decorate for you through annotations. So the interview value shifts from <i>typing</i> the pattern to <i>reasoning</i> about it: order of layers, failure behaviour, and whether a decorator is even the right tool.</p>
      <p><b>Use AI as a partner:</b> <code>I have Retry, Timeout, CircuitBreaker and Logging decorators. For each possible order, explain what happens when the downstream hangs for 10 seconds.</code> That forces a careful analysis you can verify. <b>LLM apps are decorator stacks:</b> a raw model client is wrapped by rate-limit, retry-with-backoff, prompt-caching, guardrail (PII filter) and tracing layers — all with the same <code>complete(prompt)</code> interface. <b>Where AI goes wrong:</b> it forgets to forward one of the interface methods (silent bugs), puts state in decorators shared across threads, or proposes a giant "SmartClient" subclass instead. <b>What you must still own:</b> spotting class explosion in requirements, choosing layer order, and keeping each layer single-purpose.</p>`,
    problems: [{
      title: 'Logging, Retry and Timing Around a Flaky Fetcher',
      level: 'Medium', tags: ['decorator', 'resilience', 'cross-cutting concerns'], companies: ['Uber', 'Atlassian', 'Amazon'],
      statement: `<p>You have <code>interface Fetcher { String fetch(String url) throws IOException; }</code> and a concrete <code>HttpFetcher</code> that sometimes throws <code>IOException</code>. Product wants three optional features, enabled per call site in any combination: <b>logging</b> (print url and outcome), <b>retry</b> (up to N attempts), <b>timing</b> (print elapsed ms). Design it so <code>HttpFetcher</code> is never edited and any combination works.</p>`,
      constraints: `<p>1 ≤ N ≤ 5 attempts. Retry only on <code>IOException</code>; rethrow the last one after N failures. No feature may know about another.</p>`,
      example: `<p><code>new Timing(new Logging(new Retry(new HttpFetcher(), 3)))</code> on a fetcher that fails twice then succeeds prints: ${H.c('y', 'GET /a → ok')} then ${H.c('b', 'took 12 ms')}. Logging sees a single success because Retry is <i>inside</i> it and hid the two failures.</p>`,
      brute: { why: `<p>Subclassing for every combination: <code>LoggingHttpFetcher</code>, <code>RetryingHttpFetcher</code>, <code>LoggingRetryingHttpFetcher</code>, <code>TimedLoggingRetryingHttpFetcher</code>… 3 features → 2<sup>3</sup> = 8 classes, and a 4th feature makes 16. Each class copy-pastes the retry loop, so fixing a retry bug means editing many files. The alternative brute force — boolean flags inside one class — becomes an if-forest that every feature edits.</p>`, code: { lang: 'java', code: `class HttpFetcher {
    String fetch(String url) throws IOException { return "body of " + url; }
}

// one flag-driven god class: every new feature edits this method
class ConfigurableFetcher extends HttpFetcher {
    boolean log, retry, time; int attempts = 3;
    @Override String fetch(String url) throws IOException {
        long t0 = System.nanoTime();
        IOException last = null;
        int tries = retry ? attempts : 1;
        for (int i = 0; i < tries; i++) {
            try {
                String r = super.fetch(url);
                if (log) System.out.println("GET " + url + " ok");
                if (time) System.out.println((System.nanoTime() - t0) / 1_000_000 + " ms");
                return r;
            } catch (IOException e) { last = e; if (log) System.out.println("GET " + url + " failed"); }
        }
        throw last;
    }
}`, alt: [
                { lang: 'python', code: `
import time

class HttpFetcher:
    def fetch(self, url): return "body of " + url

# one flag-driven god class: every new feature edits this method
class ConfigurableFetcher(HttpFetcher):
    def __init__(self):
        self.log = self.retry = self.time = False
        self.attempts = 3

    def fetch(self, url):
        t0 = time.perf_counter()
        last = None
        tries = self.attempts if self.retry else 1
        for _ in range(tries):
            try:
                r = super().fetch(url)
                if self.log: print("GET " + url + " ok")
                if self.time: print(f"{int((time.perf_counter() - t0) * 1000)} ms")
                return r
            except IOError as e:
                last = e
                if self.log: print("GET " + url + " failed")
        raise last` },
                { lang: 'ts', code: `
class HttpFetcher {
    fetch(url: string): string { return "body of " + url; }
}

// one flag-driven god class: every new feature edits this method
class ConfigurableFetcher extends HttpFetcher {
    log = false; retry = false; time = false; attempts = 3;
    override fetch(url: string): string {
        const t0 = Date.now();
        let last: unknown = null;
        const tries = this.retry ? this.attempts : 1;
        for (let i = 0; i < tries; i++) {
            try {
                const r = super.fetch(url);
                if (this.log) console.log("GET " + url + " ok");
                if (this.time) console.log((Date.now() - t0) + " ms");
                return r;
            } catch (e) { last = e; if (this.log) console.log("GET " + url + " failed"); }
        }
        throw last;
    }
}` },
                { lang: 'cpp', code: `
class HttpFetcher {
public:
    virtual ~HttpFetcher() = default;
    virtual string fetch(const string& url) { return "body of " + url; }
};

// one flag-driven god class: every new feature edits this method
class ConfigurableFetcher : public HttpFetcher {
public:
    bool log = false, retry = false, time = false; int attempts = 3;
    string fetch(const string& url) override {
        auto t0 = chrono::steady_clock::now();
        exception_ptr last;
        int tries = retry ? attempts : 1;
        for (int i = 0; i < tries; i++) {
            try {
                string r = HttpFetcher::fetch(url);
                if (log) cout << "GET " << url << " ok\\n";
                if (time) cout << chrono::duration_cast<chrono::milliseconds>(chrono::steady_clock::now() - t0).count() << " ms\\n";
                return r;
            } catch (...) { last = current_exception(); if (log) cout << "GET " << url << " failed\\n"; }
        }
        rethrow_exception(last);
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Diagnostics;
using System.IO;

class HttpFetcher {
    public virtual string Fetch(string url) { return "body of " + url; }
}

// one flag-driven god class: every new feature edits this method
class ConfigurableFetcher : HttpFetcher {
    public bool Log, Retry, Time; public int Attempts = 3;
    public override string Fetch(string url) {
        Stopwatch sw = Stopwatch.StartNew();
        IOException last = null;
        int tries = Retry ? Attempts : 1;
        for (int i = 0; i < tries; i++) {
            try {
                string r = base.Fetch(url);
                if (Log) Console.WriteLine("GET " + url + " ok");
                if (Time) Console.WriteLine(sw.ElapsedMilliseconds + " ms");
                return r;
            } catch (IOException e) { last = e; if (Log) Console.WriteLine("GET " + url + " failed"); }
        }
        throw last;
    }
}` }
              ] } },
      mcq: { q: 'Logging should record EVERY failed attempt, not just the final outcome. Where should the Logging decorator sit?', options: ['Outside Retry: Logging(Retry(http))', 'Inside Retry: Retry(Logging(http))', 'Order does not matter', 'Logging must be merged into Retry'], answer: 1, explain: 'Retry calls whatever it wraps once per attempt. If Logging is inside, each attempt passes through Logging, so every failure is logged.' },
      hints: [`<p>Hint 1: Each feature is "do something, then call the same method on the thing I wrap" — that is the Decorator shape.</p>`, `<p>Hint 2: Create <code>abstract class FetcherDecorator implements Fetcher</code> holding a <code>final Fetcher inner</code>; three concrete subclasses each override <code>fetch</code>.</p>`, `<p>Hint 3: Retry: loop up to N times, catch <code>IOException</code>, remember the last one, rethrow after the loop. Timing: <code>System.nanoTime()</code> before/after in a <code>finally</code> so failures are timed too. Order the layers on purpose.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "GET /a -> timeout\nGET /a -> timeout\nGET /a -> ok\ntook 12 ms\nbody of /a\nGET /b -> timeout\nfailed: timeout\n" }] },
      solution: {
        approach: `<p>One interface, one abstract decorator, three single-purpose decorators. Each one is ~10 lines, has no idea the others exist, and can be unit-tested with a fake <code>Fetcher</code>. The client chooses the combination by wrapping — and the <b>order is a design decision</b>: Logging inside Retry logs each attempt; Timing outermost measures total time including retries.</p>`,
        code: `interface Fetcher { String fetch(String url) throws IOException; }

class HttpFetcher implements Fetcher {               // unchanged concrete component
    private int calls = 0;
    public String fetch(String url) throws IOException {
        if (++calls % 3 != 0) throw new IOException("timeout");   // flaky on purpose
        return "body of " + url;
    }
}

abstract class FetcherDecorator implements Fetcher {
    protected final Fetcher inner;
    FetcherDecorator(Fetcher inner) { this.inner = Objects.requireNonNull(inner); }
}

class Logging extends FetcherDecorator {
    Logging(Fetcher inner) { super(inner); }
    public String fetch(String url) throws IOException {
        try {
            String body = inner.fetch(url);
            System.out.println("GET " + url + " -> ok");
            return body;
        } catch (IOException e) {
            System.out.println("GET " + url + " -> " + e.getMessage());
            throw e;
        }
    }
}

class Retry extends FetcherDecorator {
    private final int maxAttempts;
    Retry(Fetcher inner, int maxAttempts) {
        super(inner);
        if (maxAttempts < 1) throw new IllegalArgumentException("maxAttempts >= 1");
        this.maxAttempts = maxAttempts;
    }
    public String fetch(String url) throws IOException {
        IOException last = null;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try { return inner.fetch(url); }
            catch (IOException e) { last = e; }   // real code: add backoff + jitter here
        }
        throw last;
    }
}

class Timing extends FetcherDecorator {
    private final LongSupplier clockMs;                 // injectable clock, so tests are deterministic
    Timing(Fetcher inner, LongSupplier clockMs) { super(inner); this.clockMs = clockMs; }
    public String fetch(String url) throws IOException {
        long t0 = clockMs.getAsLong();
        try { return inner.fetch(url); }
        finally { System.out.println("took " + (clockMs.getAsLong() - t0) + " ms"); }
    }
}

class FetchDemo {
    public static void main(String[] args) throws IOException {
        // Logging INSIDE Retry -> every attempt is logged; Timing outermost -> total time
        long[] now = {0};
        LongSupplier fakeClock = () -> now[0] += 12;      // every reading is 12 ms later
        Fetcher f = new Timing(new Retry(new Logging(new HttpFetcher()), 3), fakeClock);
        System.out.println(f.fetch("/a"));

        // Logging OUTSIDE Retry -> it sees only the final outcome; two attempts are not enough here
        Fetcher g = new Logging(new Retry(new HttpFetcher(), 2));
        try { g.fetch("/b"); }
        catch (IOException e) { System.out.println("failed: " + e.getMessage()); }
    }
}`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from typing import Callable


class Fetcher(ABC):
    @abstractmethod
    def fetch(self, url: str) -> str: ...  # raises IOError on failure


class HttpFetcher(Fetcher):  # unchanged concrete component
    def __init__(self) -> None:
        self._calls = 0

    def fetch(self, url: str) -> str:
        self._calls += 1
        if self._calls % 3 != 0:  # flaky on purpose
            raise IOError("timeout")
        return f"body of {url}"


class FetcherDecorator(Fetcher, ABC):
    def __init__(self, inner: Fetcher) -> None:
        self._inner = inner


class Logging(FetcherDecorator):
    def fetch(self, url: str) -> str:
        try:
            body = self._inner.fetch(url)
        except IOError as e:
            print(f"GET {url} -> {e}")
            raise
        print(f"GET {url} -> ok")
        return body


class Retry(FetcherDecorator):
    def __init__(self, inner: Fetcher, max_attempts: int) -> None:
        super().__init__(inner)
        if max_attempts < 1:
            raise ValueError("maxAttempts >= 1")
        self._max_attempts = max_attempts

    def fetch(self, url: str) -> str:
        last: IOError | None = None
        for _ in range(self._max_attempts):
            try:
                return self._inner.fetch(url)
            except IOError as e:  # real code: add backoff + jitter here
                last = e
        assert last is not None
        raise last


class Timing(FetcherDecorator):
    def __init__(self, inner: Fetcher, clock_ms: Callable[[], int]) -> None:
        super().__init__(inner)
        self._clock_ms = clock_ms  # injectable clock, so tests are deterministic

    def fetch(self, url: str) -> str:
        t0 = self._clock_ms()
        try:
            return self._inner.fetch(url)
        finally:
            print(f"took {self._clock_ms() - t0} ms")


if __name__ == "__main__":
    now = 0

    def fake_clock() -> int:  # every reading is 12 ms later
        global now
        now += 12
        return now

    # Logging INSIDE Retry -> every attempt is logged; Timing outermost -> total time
    f = Timing(Retry(Logging(HttpFetcher()), 3), fake_clock)
    print(f.fetch("/a"))

    # Logging OUTSIDE Retry -> it sees only the final outcome; two attempts are not enough here
    g = Logging(Retry(HttpFetcher(), 2))
    try:
        g.fetch("/b")
    except IOError as e:
        print(f"failed: {e}")` },
          { lang: 'ts', code: `class IOException extends Error {}

interface Fetcher {
  fetch(url: string): string; // throws IOException on failure
}

class HttpFetcher implements Fetcher { // unchanged concrete component
  private calls = 0;

  fetch(url: string): string {
    if (++this.calls % 3 !== 0) throw new IOException("timeout"); // flaky on purpose
    return \`body of \${url}\`;
  }
}

abstract class FetcherDecorator implements Fetcher {
  constructor(protected readonly inner: Fetcher) {}
  abstract fetch(url: string): string;
}

class Logging extends FetcherDecorator {
  fetch(url: string): string {
    try {
      const body = this.inner.fetch(url);
      console.log(\`GET \${url} -> ok\`);
      return body;
    } catch (e) {
      if (e instanceof IOException) console.log(\`GET \${url} -> \${e.message}\`);
      throw e;
    }
  }
}

class Retry extends FetcherDecorator {
  constructor(inner: Fetcher, private readonly maxAttempts: number) {
    super(inner);
    if (maxAttempts < 1) throw new Error("maxAttempts >= 1");
  }

  fetch(url: string): string {
    let last: IOException | undefined;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return this.inner.fetch(url);
      } catch (e) {
        if (!(e instanceof IOException)) throw e; // retry only on IOException
        last = e; // real code: add backoff + jitter here
      }
    }
    throw last;
  }
}

class Timing extends FetcherDecorator {
  // injectable clock, so tests are deterministic
  constructor(inner: Fetcher, private readonly clockMs: () => number) {
    super(inner);
  }

  fetch(url: string): string {
    const t0 = this.clockMs();
    try {
      return this.inner.fetch(url);
    } finally {
      console.log(\`took \${this.clockMs() - t0} ms\`);
    }
  }
}

let now = 0;
const fakeClock = (): number => (now += 12); // every reading is 12 ms later

// Logging INSIDE Retry -> every attempt is logged; Timing outermost -> total time
const f: Fetcher = new Timing(new Retry(new Logging(new HttpFetcher()), 3), fakeClock);
console.log(f.fetch("/a"));

// Logging OUTSIDE Retry -> it sees only the final outcome; two attempts are not enough here
const g: Fetcher = new Logging(new Retry(new HttpFetcher(), 2));
try {
  g.fetch("/b");
} catch (e) {
  console.log(\`failed: \${(e as Error).message}\`);
}` },
          { lang: 'cpp', code: `struct IOException : runtime_error {
    using runtime_error::runtime_error;
};

class Fetcher {
public:
    virtual ~Fetcher() = default;
    virtual string fetch(const string& url) = 0;           // throws IOException on failure
};

class HttpFetcher : public Fetcher {                       // unchanged concrete component
    int calls_ = 0;
public:
    string fetch(const string& url) override {
        if (++calls_ % 3 != 0) throw IOException("timeout");   // flaky on purpose
        return "body of " + url;
    }
};

class FetcherDecorator : public Fetcher {
protected:
    unique_ptr<Fetcher> inner_;                            // the decorator owns what it wraps
    explicit FetcherDecorator(unique_ptr<Fetcher> inner) : inner_(std::move(inner)) {}
};

class Logging : public FetcherDecorator {
public:
    explicit Logging(unique_ptr<Fetcher> inner) : FetcherDecorator(std::move(inner)) {}
    string fetch(const string& url) override {
        try {
            string body = inner_->fetch(url);
            cout << "GET " << url << " -> ok\\n";
            return body;
        } catch (const IOException& e) {
            cout << "GET " << url << " -> " << e.what() << "\\n";
            throw;
        }
    }
};

class Retry : public FetcherDecorator {
    int maxAttempts_;
public:
    Retry(unique_ptr<Fetcher> inner, int maxAttempts)
        : FetcherDecorator(std::move(inner)), maxAttempts_(maxAttempts) {
        if (maxAttempts < 1) throw invalid_argument("maxAttempts >= 1");
    }
    string fetch(const string& url) override {
        for (int attempt = 1;; attempt++) {
            try {
                return inner_->fetch(url);
            } catch (const IOException&) {                 // real code: add backoff + jitter here
                if (attempt == maxAttempts_) throw;        // rethrow the last failure
            }
        }
    }
};

class Timing : public FetcherDecorator {
    function<long long()> clockMs_;                        // injectable clock, so tests are deterministic
public:
    Timing(unique_ptr<Fetcher> inner, function<long long()> clockMs)
        : FetcherDecorator(std::move(inner)), clockMs_(std::move(clockMs)) {}
    string fetch(const string& url) override {
        long long t0 = clockMs_();
        struct Report {                                    // runs on success and on exception
            const function<long long()>& clock; long long t0;
            ~Report() { cout << "took " << clock() - t0 << " ms\\n"; }
        } report{clockMs_, t0};
        return inner_->fetch(url);
    }
};

int main() {
    long long now = 0;
    auto fakeClock = [&now] { return now += 12; };         // every reading is 12 ms later

    // Logging INSIDE Retry -> every attempt is logged; Timing outermost -> total time
    unique_ptr<Fetcher> f = make_unique<Timing>(
        make_unique<Retry>(make_unique<Logging>(make_unique<HttpFetcher>()), 3), fakeClock);
    cout << f->fetch("/a") << "\\n";

    // Logging OUTSIDE Retry -> it sees only the final outcome; two attempts are not enough here
    unique_ptr<Fetcher> g = make_unique<Logging>(make_unique<Retry>(make_unique<HttpFetcher>(), 2));
    try {
        g->fetch("/b");
    } catch (const IOException& e) {
        cout << "failed: " << e.what() << "\\n";
    }
}` },
  { lang: 'csharp', code: `
using System;
using System.IO;

interface IFetcher { string Fetch(string url); }        // throws IOException on failure

class HttpFetcher : IFetcher {                          // unchanged concrete component
    private int calls = 0;
    public string Fetch(string url) {
        if (++calls % 3 != 0) throw new IOException("timeout");   // flaky on purpose
        return "body of " + url;
    }
}

abstract class FetcherDecorator : IFetcher {
    protected readonly IFetcher inner;
    protected FetcherDecorator(IFetcher inner) { if (inner == null) throw new ArgumentNullException("inner"); this.inner = inner; }
    public abstract string Fetch(string url);
}

class Logging : FetcherDecorator {
    public Logging(IFetcher inner) : base(inner) { }
    public override string Fetch(string url) {
        try {
            string body = inner.Fetch(url);
            Console.WriteLine("GET " + url + " -> ok");
            return body;
        } catch (IOException e) {
            Console.WriteLine("GET " + url + " -> " + e.Message);
            throw;
        }
    }
}

class Retry : FetcherDecorator {
    private readonly int maxAttempts;
    public Retry(IFetcher inner, int maxAttempts) : base(inner) {
        if (maxAttempts < 1) throw new ArgumentException("maxAttempts >= 1");
        this.maxAttempts = maxAttempts;
    }
    public override string Fetch(string url) {
        IOException last = null;
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try { return inner.Fetch(url); }
            catch (IOException e) { last = e; }   // real code: add backoff + jitter here
        }
        throw last;
    }
}

class Timing : FetcherDecorator {
    private readonly Func<long> clockMs;                 // injectable clock, so tests are deterministic
    public Timing(IFetcher inner, Func<long> clockMs) : base(inner) { this.clockMs = clockMs; }
    public override string Fetch(string url) {
        long t0 = clockMs();
        try { return inner.Fetch(url); }
        finally { Console.WriteLine("took " + (clockMs() - t0) + " ms"); }
    }
}

class Program {
    static void Main() {
        // Logging INSIDE Retry -> every attempt is logged; Timing outermost -> total time
        long now = 0;
        Func<long> fakeClock = () => now += 12;      // every reading is 12 ms later
        IFetcher f = new Timing(new Retry(new Logging(new HttpFetcher()), 3), fakeClock);
        Console.WriteLine(f.Fetch("/a"));

        // Logging OUTSIDE Retry -> it sees only the final outcome; two attempts are not enough here
        IFetcher g = new Logging(new Retry(new HttpFetcher(), 2));
        try { g.Fetch("/b"); }
        catch (IOException e) { Console.WriteLine("failed: " + e.Message); }
    }
}` }
        ],
        complexity: `<p>Each decorator adds O(1) work and one stack frame per call; Retry multiplies downstream calls by up to N. Classes: 1 + F decorators instead of 2<sup>F</sup> subclasses.</p>`,
        followUps: ['Add exponential backoff with jitter to Retry without changing Logging or Timing.', 'Make Retry skip non-retryable errors (e.g. HTTP 404) — how do you signal that through the interface?', 'Rewrite the three decorators as lambdas using UnaryOperator&lt;Fetcher&gt; and compose them.']
      }
    }]
  });
  /* =====================================================================
     TOPIC 3 — FACADE
     ===================================================================== */
  var FACADE_CODE = 'Receipt placeOrder(String item, int qty, String card) {\n' +
    '  if (!inventory.inStock(item, qty)) return Receipt.outOfStock();\n' +
    '  inventory.reserve(item, qty);\n' +
    '  if (!payments.charge(card, catalog.price(item) * qty)) {\n' +
    '    inventory.release(item, qty);   // compensate\n' +
    '    return Receipt.declined(); }\n' +
    '  String tracking = shipping.schedule(item, qty);\n' +
    '  notifier.email("Order placed: " + tracking);\n' +
    '  return Receipt.ok(tracking); }';
  var FAC_STOCK = { laptop: 5, phone: 1, book: 10, watch: 3 };
  var FAC_PRICE = { laptop: 60000, phone: 30000, book: 500, watch: 15000 };

  topics.push({
    title: 'Facade — One Simple Front Door',
    analogy: `<p>You order food on a delivery app. Behind the scenes a restaurant cooks, a payment gateway charges your card, a rider is matched, a map service plans the route and an SMS service texts you updates. You touched <b>one button</b>: "Place order". The app is a <b>facade</b> — a simple front desk in front of a complicated back office.</p>
      <p>A hotel reception desk is the same: you ask the receptionist for a taxi, a wake-up call and laundry; you never call the garage, the phone system and the laundry room yourself.</p>`,
    explain: `<p><b>The problem.</b> Placing an order needs five subsystems in the right order: check stock, reserve it, charge the card, book shipping, send an email — and undo the reservation if payment fails. If every controller, CLI tool and batch job does these five calls itself, the sequence gets copy-pasted, someone forgets the "undo" step, and every caller now depends on five classes.</p>
      <p><b>The fix.</b> Create one class, <code>OrderFacade</code>, with one high-level method <code>placeOrder(item, qty, card)</code>. It knows the subsystems and the correct order; callers know only the facade.</p>
      ${H.table(['', 'Without facade', 'With facade'], [
        ['Classes each caller depends on', H.c('r', '5 (Inventory, Payment, Shipping, Notifier, Catalog)'), H.c('g', '1 (OrderFacade)')],
        ['Where the "order of steps" lives', H.c('r', 'copied into every caller'), H.c('g', 'one method')],
        ['Change Shipping API', H.c('r', 'edit every caller'), H.c('g', 'edit the facade only')]
      ])}
      <p><b>Important:</b> a facade does <b>not</b> hide or lock the subsystems. Power users can still call <code>Inventory</code> directly. It just offers a <i>convenient default path</i>. It also does not add new business behaviour of its own — it <b>coordinates</b>.</p>
      <p><b>Facade vs Adapter</b> (a favourite interview question): an Adapter makes <i>one</i> existing interface fit an interface the client <i>already expects</i>. A Facade <i>invents a new, simpler</i> interface over <i>many</i> classes. Adapter = translator; Facade = receptionist.</p>
      <p><b>Seen in the wild:</b> ${H.chips(['SLF4J LoggerFactory', 'Spring JdbcTemplate (hides Connection/Statement/ResultSet)', 'java.net.http.HttpClient.send()', 'A service layer over repositories', 'An SDK client: s3.putObject()'], { label: 'facades' })}</p>`,
    clues: ['"the client has to call many classes <b>in a specific order</b>" / "complex subsystem"', '"provide a <b>simple API</b> / one entry point / SDK" for a library', '"reduce coupling between UI/controllers and N services"', '"the same multi-step workflow is duplicated in several places"', '"layered architecture": controllers talk to a <b>service layer</b>, not to DAOs directly', '"wrap a legacy subsystem so we can replace it later"'],
    code: [{ lang: 'java', title: 'OrderFacade over five subsystems', code: `
// ----- subsystem classes (could be big, separate modules) -----
class Inventory {
    private final Map<String, Integer> stock = new HashMap<>(Map.of("laptop", 5, "phone", 1));
    boolean inStock(String item, int qty) { return stock.getOrDefault(item, 0) >= qty; }
    void reserve(String item, int qty) { stock.merge(item, -qty, Integer::sum); }
    void release(String item, int qty) { stock.merge(item, qty, Integer::sum); }
}
class Catalog { long price(String item) { return item.equals("laptop") ? 60_000 : 30_000; } }
class PaymentGateway { boolean charge(String card, long amount) { return amount <= 100_000; } }
class ShippingService { String schedule(String item, int qty) { return "TRK-" + item.charAt(0) + qty; } }
class EmailNotifier { void email(String msg) { System.out.println("email: " + msg); } }

record Receipt(String status, String tracking) {
    static Receipt ok(String t) { return new Receipt("OK", t); }
    static Receipt declined() { return new Receipt("PAYMENT_DECLINED", null); }
    static Receipt outOfStock() { return new Receipt("OUT_OF_STOCK", null); }
}

// ----- the Facade: one simple method, knows the right order -----
class OrderFacade {
    private final Inventory inventory;
    private final Catalog catalog;
    private final PaymentGateway payments;
    private final ShippingService shipping;
    private final EmailNotifier notifier;

    OrderFacade(Inventory i, Catalog c, PaymentGateway p, ShippingService s, EmailNotifier n) {
        inventory = i; catalog = c; payments = p; shipping = s; notifier = n;   // injected, testable
    }

    Receipt placeOrder(String item, int qty, String card) {
        if (!inventory.inStock(item, qty)) return Receipt.outOfStock();
        inventory.reserve(item, qty);
        if (!payments.charge(card, catalog.price(item) * qty)) {
            inventory.release(item, qty);                 // compensating action lives in ONE place
            return Receipt.declined();
        }
        String tracking = shipping.schedule(item, qty);
        notifier.email("Order placed: " + tracking);
        return Receipt.ok(tracking);
    }
}

class Shop {
    public static void main(String[] args) {
        OrderFacade shop = new OrderFacade(new Inventory(), new Catalog(), new PaymentGateway(),
                                           new ShippingService(), new EmailNotifier());
        System.out.println(shop.placeOrder("laptop", 1, "4111"));  // OK
        System.out.println(shop.placeOrder("laptop", 2, "4111"));  // PAYMENT_DECLINED
        System.out.println(shop.placeOrder("phone", 3, "4111"));   // OUT_OF_STOCK
    }
}`,
      alt: [
        { lang: 'python', code: `from dataclasses import dataclass
from typing import Optional


# ----- subsystem classes (could be big, separate modules) -----
class Inventory:
    def __init__(self) -> None:
        self._stock = {"laptop": 5, "phone": 1}

    def in_stock(self, item: str, qty: int) -> bool:
        return self._stock.get(item, 0) >= qty

    def reserve(self, item: str, qty: int) -> None:
        self._stock[item] = self._stock.get(item, 0) - qty

    def release(self, item: str, qty: int) -> None:
        self._stock[item] = self._stock.get(item, 0) + qty


class Catalog:
    def price(self, item: str) -> int:
        return 60_000 if item == "laptop" else 30_000


class PaymentGateway:
    def charge(self, card: str, amount: int) -> bool:
        return amount <= 100_000


class ShippingService:
    def schedule(self, item: str, qty: int) -> str:
        return f"TRK-{item[0]}{qty}"


class EmailNotifier:
    def email(self, msg: str) -> None:
        print(f"email: {msg}")


@dataclass(frozen=True)
class Receipt:
    status: str
    tracking: Optional[str]

    def __str__(self) -> str:
        return f"Receipt[status={self.status}, tracking={'null' if self.tracking is None else self.tracking}]"

    @staticmethod
    def ok(tracking: str) -> "Receipt":
        return Receipt("OK", tracking)

    @staticmethod
    def declined() -> "Receipt":
        return Receipt("PAYMENT_DECLINED", None)

    @staticmethod
    def out_of_stock() -> "Receipt":
        return Receipt("OUT_OF_STOCK", None)


# ----- the Facade: one simple method, knows the right order -----
class OrderFacade:
    def __init__(self, inventory: Inventory, catalog: Catalog, payments: PaymentGateway,
                 shipping: ShippingService, notifier: EmailNotifier) -> None:
        self._inventory = inventory  # injected, testable
        self._catalog = catalog
        self._payments = payments
        self._shipping = shipping
        self._notifier = notifier

    def place_order(self, item: str, qty: int, card: str) -> Receipt:
        if not self._inventory.in_stock(item, qty):
            return Receipt.out_of_stock()
        self._inventory.reserve(item, qty)
        if not self._payments.charge(card, self._catalog.price(item) * qty):
            self._inventory.release(item, qty)  # compensating action lives in ONE place
            return Receipt.declined()
        tracking = self._shipping.schedule(item, qty)
        self._notifier.email(f"Order placed: {tracking}")
        return Receipt.ok(tracking)


if __name__ == "__main__":
    shop = OrderFacade(Inventory(), Catalog(), PaymentGateway(), ShippingService(), EmailNotifier())
    print(shop.place_order("laptop", 1, "4111"))  # OK
    print(shop.place_order("laptop", 2, "4111"))  # PAYMENT_DECLINED
    print(shop.place_order("phone", 3, "4111"))  # OUT_OF_STOCK` },
        { lang: 'ts', code: `// ----- subsystem classes (could be big, separate modules) -----
class Inventory {
  private readonly stock = new Map<string, number>([["laptop", 5], ["phone", 1]]);
  inStock(item: string, qty: number): boolean { return (this.stock.get(item) ?? 0) >= qty; }
  reserve(item: string, qty: number): void { this.stock.set(item, (this.stock.get(item) ?? 0) - qty); }
  release(item: string, qty: number): void { this.stock.set(item, (this.stock.get(item) ?? 0) + qty); }
}
class Catalog { price(item: string): number { return item === "laptop" ? 60_000 : 30_000; } }
class PaymentGateway { charge(_card: string, amount: number): boolean { return amount <= 100_000; } }
class ShippingService { schedule(item: string, qty: number): string { return \`TRK-\${item[0]}\${qty}\`; } }
class EmailNotifier { email(msg: string): void { console.log(\`email: \${msg}\`); } }

interface Receipt {
  readonly status: "OK" | "PAYMENT_DECLINED" | "OUT_OF_STOCK";
  readonly tracking: string | null;
}
const show = (r: Receipt): string => \`Receipt[status=\${r.status}, tracking=\${r.tracking}]\`;

// ----- the Facade: one simple method, knows the right order -----
class OrderFacade {
  constructor(
    private readonly inventory: Inventory,
    private readonly catalog: Catalog,
    private readonly payments: PaymentGateway,
    private readonly shipping: ShippingService,
    private readonly notifier: EmailNotifier, // injected, testable
  ) {}

  placeOrder(item: string, qty: number, card: string): Receipt {
    if (!this.inventory.inStock(item, qty)) return { status: "OUT_OF_STOCK", tracking: null };
    this.inventory.reserve(item, qty);
    if (!this.payments.charge(card, this.catalog.price(item) * qty)) {
      this.inventory.release(item, qty); // compensating action lives in ONE place
      return { status: "PAYMENT_DECLINED", tracking: null };
    }
    const tracking = this.shipping.schedule(item, qty);
    this.notifier.email(\`Order placed: \${tracking}\`);
    return { status: "OK", tracking };
  }
}

const shop = new OrderFacade(new Inventory(), new Catalog(), new PaymentGateway(), new ShippingService(), new EmailNotifier());
console.log(show(shop.placeOrder("laptop", 1, "4111"))); // OK
console.log(show(shop.placeOrder("laptop", 2, "4111"))); // PAYMENT_DECLINED
console.log(show(shop.placeOrder("phone", 3, "4111"))); // OUT_OF_STOCK` },
        { lang: 'cpp', code: `// ----- subsystem classes (could be big, separate modules) -----
class Inventory {
    map<string, int> stock_{{"laptop", 5}, {"phone", 1}};
public:
    bool inStock(const string& item, int qty) const {
        auto it = stock_.find(item);
        return (it == stock_.end() ? 0 : it->second) >= qty;
    }
    void reserve(const string& item, int qty) { stock_[item] -= qty; }
    void release(const string& item, int qty) { stock_[item] += qty; }
};
class Catalog { public: long long price(const string& item) const { return item == "laptop" ? 60'000 : 30'000; } };
class PaymentGateway { public: bool charge(const string&, long long amount) const { return amount <= 100'000; } };
class ShippingService { public: string schedule(const string& item, int qty) const { return "TRK-" + item.substr(0, 1) + to_string(qty); } };
class EmailNotifier { public: void email(const string& msg) const { cout << "email: " << msg << "\\n"; } };

struct Receipt {
    string status;
    optional<string> tracking;
    string str() const { return "Receipt[status=" + status + ", tracking=" + tracking.value_or("null") + "]"; }
};

// ----- the Facade: one simple method, knows the right order -----
class OrderFacade {
    Inventory& inventory_;
    const Catalog& catalog_;
    const PaymentGateway& payments_;
    const ShippingService& shipping_;
    const EmailNotifier& notifier_;                      // injected, testable
public:
    OrderFacade(Inventory& i, const Catalog& c, const PaymentGateway& p, const ShippingService& s, const EmailNotifier& n)
        : inventory_(i), catalog_(c), payments_(p), shipping_(s), notifier_(n) {}

    Receipt placeOrder(const string& item, int qty, const string& card) {
        if (!inventory_.inStock(item, qty)) return {"OUT_OF_STOCK", nullopt};
        inventory_.reserve(item, qty);
        if (!payments_.charge(card, catalog_.price(item) * qty)) {
            inventory_.release(item, qty);               // compensating action lives in ONE place
            return {"PAYMENT_DECLINED", nullopt};
        }
        string tracking = shipping_.schedule(item, qty);
        notifier_.email("Order placed: " + tracking);
        return {"OK", tracking};
    }
};

int main() {
    Inventory inventory; Catalog catalog; PaymentGateway payments; ShippingService shipping; EmailNotifier notifier;
    OrderFacade shop(inventory, catalog, payments, shipping, notifier);
    cout << shop.placeOrder("laptop", 1, "4111").str() << "\\n";   // OK
    cout << shop.placeOrder("laptop", 2, "4111").str() << "\\n";   // PAYMENT_DECLINED
    cout << shop.placeOrder("phone", 3, "4111").str() << "\\n";    // OUT_OF_STOCK
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

// ----- subsystem classes (could be big, separate modules) -----
class Inventory {
    private readonly Dictionary<string, int> stock = new Dictionary<string, int> { { "laptop", 5 }, { "phone", 1 } };
    public bool InStock(string item, int qty) { int n; stock.TryGetValue(item, out n); return n >= qty; }
    public void Reserve(string item, int qty) { stock[item] -= qty; }
    public void Release(string item, int qty) { stock[item] += qty; }
}
class Catalog { public long Price(string item) { return item == "laptop" ? 60000 : 30000; } }
class PaymentGateway { public bool Charge(string card, long amount) { return amount <= 100000; } }
class ShippingService { public string Schedule(string item, int qty) { return "TRK-" + item[0] + qty; } }
class EmailNotifier { public void Email(string msg) { Console.WriteLine("email: " + msg); } }

sealed class Receipt {
    public readonly string Status, Tracking;
    private Receipt(string status, string tracking) { Status = status; Tracking = tracking; }
    public static Receipt Ok(string t) { return new Receipt("OK", t); }
    public static Receipt Declined() { return new Receipt("PAYMENT_DECLINED", null); }
    public static Receipt OutOfStock() { return new Receipt("OUT_OF_STOCK", null); }
    public override string ToString() { return "Receipt[status=" + Status + ", tracking=" + (Tracking ?? "null") + "]"; }
}

// ----- the Facade: one simple method, knows the right order -----
class OrderFacade {
    private readonly Inventory inventory;
    private readonly Catalog catalog;
    private readonly PaymentGateway payments;
    private readonly ShippingService shipping;
    private readonly EmailNotifier notifier;

    public OrderFacade(Inventory i, Catalog c, PaymentGateway p, ShippingService s, EmailNotifier n) {
        inventory = i; catalog = c; payments = p; shipping = s; notifier = n;   // injected, testable
    }

    public Receipt PlaceOrder(string item, int qty, string card) {
        if (!inventory.InStock(item, qty)) return Receipt.OutOfStock();
        inventory.Reserve(item, qty);
        if (!payments.Charge(card, catalog.Price(item) * qty)) {
            inventory.Release(item, qty);                 // compensating action lives in ONE place
            return Receipt.Declined();
        }
        string tracking = shipping.Schedule(item, qty);
        notifier.Email("Order placed: " + tracking);
        return Receipt.Ok(tracking);
    }
}

class Program {
    static void Main() {
        OrderFacade shop = new OrderFacade(new Inventory(), new Catalog(), new PaymentGateway(),
                                           new ShippingService(), new EmailNotifier());
        Console.WriteLine(shop.PlaceOrder("laptop", 1, "4111"));  // OK
        Console.WriteLine(shop.PlaceOrder("laptop", 2, "4111"));  // PAYMENT_DECLINED
        Console.WriteLine(shop.PlaceOrder("phone", 3, "4111"));   // OUT_OF_STOCK
    }
}` }
      ] },
    { lang: 'java', title: 'A tiny utility facade over text streams', code: `
// A facade over JDK classes: callers get "read a whole file as lines, safely" in one call
final class Files2 {
    private Files2() {}

    static List<String> readLines(String text) {
        // hides: Reader construction, buffering, loop, closing, exception wrapping
        List<String> out = new ArrayList<>();
        try (BufferedReader r = new BufferedReader(new StringReader(text))) {
            String line;
            while ((line = r.readLine()) != null) out.add(line.strip());
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return out;
    }

    public static void main(String[] args) {
        System.out.println(readLines(" a \\n b "));   // [a, b]
    }
}`,
      alt: [
        { lang: 'python', code: `import io


# A facade over stdlib classes: callers get "split text into stripped lines" in one call
def read_lines(text: str) -> list[str]:
    # hides: stream construction, iteration, closing
    with io.StringIO(text) as stream:
        return [line.strip() for line in stream]


if __name__ == "__main__":
    print("[" + ", ".join(read_lines(" a \\n b ")) + "]")  # [a, b]` },
        { lang: 'ts', code: `// A tiny facade: callers get "split text into stripped lines" in one call
// hides: the split rule (\\n and \\r\\n), trimming
function readLines(text: string): string[] {
  return text.split(/\\r?\\n/).map((line) => line.trim());
}

console.log(\`[\${readLines(" a \\n b ").join(", ")}]\`); // [a, b]` },
        { lang: 'cpp', code: `// A facade over the standard library: callers get "split text into stripped lines" in one call
vector<string> readLines(const string& text) {
    // hides: stream construction, the getline loop, trimming
    vector<string> out;
    istringstream in(text);
    for (string line; getline(in, line);) {
        size_t b = line.find_first_not_of(" \\t\\r");
        size_t e = line.find_last_not_of(" \\t\\r");
        out.push_back(b == string::npos ? "" : line.substr(b, e - b + 1));
    }
    return out;
}

int main() {
    auto lines = readLines(" a \\n b ");
    cout << "[";
    for (size_t i = 0; i < lines.size(); i++) cout << (i ? ", " : "") << lines[i];
    cout << "]\\n";                                       // [a, b]
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.IO;

// A facade over framework classes: callers get "read a whole text as lines, safely" in one call
static class Files2 {
    public static List<string> ReadLines(string text) {
        // hides: reader construction, loop, closing, exception wrapping
        List<string> result = new List<string>();
        try {
            using (StringReader r = new StringReader(text)) {
                string line;
                while ((line = r.ReadLine()) != null) result.Add(line.Trim());
            }
        } catch (IOException e) {
            throw new InvalidOperationException("read failed", e);
        }
        return result;
    }
}

class Program {
    static void Main() {
        Console.WriteLine("[" + string.Join(", ", Files2.ReadLines(" a \\n b ")) + "]");   // [a, b]
    }
}` }
      ] }],
    codeTitle: ['OrderFacade over five subsystems', 'A tiny utility facade over text streams'],
    viz: {
      title: 'placeOrder() lighting up each subsystem in order',
      input: 'laptop 1',
      inputLabel: 'item qty (items: laptop, phone, book, watch; card limit ₹1,00,000)',
      gen: function (input) {
        var w = words(input, 'Example: laptop 1', 2);
        var item = w[0].toLowerCase(), qty = Number(w[1] || 1);
        if (!FAC_STOCK.hasOwnProperty(item)) throw new Error('Item must be laptop, phone, book or watch');
        if (!(qty >= 1 && qty <= 20 && Math.floor(qty) === qty)) throw new Error('Quantity must be a whole number from 1 to 20');
        var stock = FAC_STOCK[item], amount = FAC_PRICE[item] * qty;
        var nodes = [B('U', 'Client', 8, 30), B('F', 'OrderFacade', 34, 30), B('I', 'Inventory', 75, 4), B('P', 'Payment', 75, 20), B('S', 'Shipping', 75, 38), B('N', 'Email', 75, 56)];
        var edges = [['U', 'F', 'placeOrder()'], ['F', 'I'], ['F', 'P'], ['F', 'S'], ['F', 'N']];
        var bad = [B('U', 'Controller', 8, 30), B('I', 'Inventory', 70, 4), B('P', 'Payment', 70, 20), B('S', 'Shipping', 70, 38), B('N', 'Email', 70, 56), B('K', 'CLI tool', 8, 6), B('J', 'Batch job', 8, 54)];
        var badE = [['U', 'I'], ['U', 'P'], ['U', 'S'], ['U', 'N'], ['K', 'I'], ['K', 'P'], ['K', 'S'], ['K', 'N'], ['J', 'I'], ['J', 'P'], ['J', 'S'], ['J', 'N']];
        var f = [];
        var be = {}; badE.forEach(function (e) { be[e[0] + '-' + e[1]] = 'bad'; });
        f.push(F('<b>Before:</b> three callers each talk to four subsystems = <b>12 dependencies</b>, and each caller has its own copy of "the right order" (and its own bugs, like forgetting to release stock when payment fails).',
          [G('No facade: spaghetti dependencies', bad, badE, { ehl: be })]));
        f.push(F('<b>After:</b> callers depend only on <code>OrderFacade</code>. The facade is the one place that knows the workflow. Now let us run <code>placeOrder("' + item + '", ' + qty + ')</code>.',
          [G('With facade', nodes, edges, { hl: { F: 'sel' }, tags: { F: '1 method' } }), CODE('OrderFacade.placeOrder', FACADE_CODE, { 1: 'cur' })]));
        var ok = stock >= qty;
        f.push(F('Step 1 — <b>Inventory.inStock</b>: we have ' + stock + ' ' + item + '(s), need ' + qty + '. ' + (ok ? H.c('g', 'Enough.') : H.c('r', 'Not enough → return OUT_OF_STOCK immediately. Nothing else is touched.')),
          [G('Facade → Inventory', nodes, edges, { hl: { U: 'done', F: 'cur', I: ok ? 'ok' : 'bad' }, ehl: { 'U-F': 'done', 'F-I': ok ? 'cur' : 'bad' } }), CODE('OrderFacade.placeOrder', FACADE_CODE, { 2: ok ? 'ok' : 'bad' }), VARS('state', { stock: stock, need: qty })]));
        if (!ok) {
          f.push(F('The client gets <b>OUT_OF_STOCK</b>. It never had to know Inventory exists.', [G('Result', nodes, edges, { hl: { U: 'sel' }, ehl: { 'U-F': 'bad' } }), VARS('Receipt', { status: 'OUT_OF_STOCK' }, { status: 'bad' })]));
          f.push(F('Try <code>laptop 2</code> to see the payment-failure path, or <code>book 3</code> for the happy path.', [TXT('Every path — happy, out-of-stock, declined — is coded <b>once</b>, inside the facade.')]));
          return f;
        }
        f.push(F('Step 2 — <b>Inventory.reserve</b>: hold ' + qty + ' unit(s) so nobody else buys them while we charge the card. Stock is now ' + (stock - qty) + '.',
          [G('Reserve', nodes, edges, { hl: { F: 'cur', I: 'ok' }, ehl: { 'F-I': 'ok' } }), CODE('OrderFacade.placeOrder', FACADE_CODE, { 3: 'cur' }), VARS('state', { stock: stock - qty, reserved: qty }, { reserved: 'ok' })]));
        var paid = amount <= 100000;
        f.push(F('Step 3 — <b>Payment.charge(₹' + amount + ')</b>. ' + (paid ? H.c('g', 'Approved.') : H.c('r', 'Declined: above the ₹1,00,000 card limit.')),
          [G('Facade → Payment', nodes, edges, { hl: { F: 'cur', I: 'done', P: paid ? 'ok' : 'bad' }, ehl: { 'F-I': 'done', 'F-P': paid ? 'cur' : 'bad' } }), CODE('OrderFacade.placeOrder', FACADE_CODE, { 4: paid ? 'ok' : 'bad' }), VARS('payment', { amount: amount, limit: 100000 }, { amount: paid ? 'ok' : 'bad' })]));
        if (!paid) {
          f.push(F('<b>Compensate:</b> the facade calls <code>inventory.release</code> so the stock is not lost. This "undo" step is exactly what callers forget when they orchestrate by hand.',
            [G('Undo the reservation', nodes, edges, { hl: { F: 'cur', I: 'cur', P: 'bad' }, ehl: { 'F-I': 'cur', 'F-P': 'bad' } }), CODE('OrderFacade.placeOrder', FACADE_CODE, { 5: 'cur', 6: 'bad' }), VARS('state', { stock: stock, reserved: 0 }, { stock: 'ok' })]));
          f.push(F('Client receives <b>PAYMENT_DECLINED</b>. Shipping and Email were never touched.', [G('Result', nodes, edges, { hl: { U: 'sel', S: 'done', N: 'done' }, ehl: { 'U-F': 'bad' } }), VARS('Receipt', { status: 'PAYMENT_DECLINED' }, { status: 'bad' })]));
          return f;
        }
        var trk = 'TRK-' + (1000 + amount % 9000);
        f.push(F('Step 4 — <b>Shipping.schedule</b> returns tracking id <b>' + trk + '</b>.',
          [G('Facade → Shipping', nodes, edges, { hl: { F: 'cur', P: 'done', S: 'ok' }, ehl: { 'F-P': 'done', 'F-S': 'cur' } }), CODE('OrderFacade.placeOrder', FACADE_CODE, { 7: 'cur' })]));
        f.push(F('Step 5 — <b>Email</b>: "Order placed: ' + trk + '".',
          [G('Facade → Email', nodes, edges, { hl: { F: 'cur', S: 'done', N: 'ok' }, ehl: { 'F-S': 'done', 'F-N': 'cur' } }), CODE('OrderFacade.placeOrder', FACADE_CODE, { 8: 'cur' })]));
        f.push(F('The client gets one tidy <b>Receipt(OK, ' + trk + ')</b>. Four subsystems, one call, zero subsystem knowledge in the caller.',
          [G('Done', nodes, edges, { hl: { U: 'sel', F: 'ok', I: 'done', P: 'done', S: 'done', N: 'done' }, ehl: { 'U-F': 'ok' } }), VARS('Receipt', { status: 'OK', tracking: trk }, { status: 'ok' })]));
        return f;
      }
    },
    examples: [
      { title: 'Home theatre "watch movie" button', html: `<p>Lights dim, projector on, screen down, amplifier to HDMI-2, volume 30, player starts. <code>HomeTheaterFacade.watchMovie(title)</code> runs these six calls; <code>endMovie()</code> reverses them. The remote control (client) knows one class instead of six.</p>`, code: { lang: 'java', code: `class Lights { void dim(int pct) { System.out.println("lights " + pct + "%"); } }
class Projector { void on() { System.out.println("projector on"); } }
class Player { void play(String t) { System.out.println("playing " + t); } }
class HomeTheater {
    private final Lights l = new Lights(); private final Projector p = new Projector(); private final Player pl = new Player();
    void watchMovie(String title) { l.dim(10); p.on(); pl.play(title); }
}`,
        alt: [
          { lang: 'python', code: `class Lights:
    def dim(self, pct: int) -> None:
        print(f"lights {pct}%")


class Projector:
    def on(self) -> None:
        print("projector on")


class Player:
    def play(self, title: str) -> None:
        print(f"playing {title}")


class HomeTheater:
    def __init__(self) -> None:
        self._l, self._p, self._pl = Lights(), Projector(), Player()

    def watch_movie(self, title: str) -> None:
        self._l.dim(10)
        self._p.on()
        self._pl.play(title)` },
          { lang: 'ts', code: `class Lights { dim(pct: number): void { console.log(\`lights \${pct}%\`); } }
class Projector { on(): void { console.log("projector on"); } }
class Player { play(title: string): void { console.log(\`playing \${title}\`); } }
class HomeTheater {
  private readonly l = new Lights();
  private readonly p = new Projector();
  private readonly pl = new Player();
  watchMovie(title: string): void { this.l.dim(10); this.p.on(); this.pl.play(title); }
}` },
          { lang: 'cpp', code: `class Lights { public: void dim(int pct) const { cout << "lights " << pct << "%\\n"; } };
class Projector { public: void on() const { cout << "projector on\\n"; } };
class Player { public: void play(const string& t) const { cout << "playing " << t << "\\n"; } };
class HomeTheater {
    Lights l_; Projector p_; Player pl_;
public:
    void watchMovie(const string& title) const { l_.dim(10); p_.on(); pl_.play(title); }
};` },
  { lang: 'csharp', code: `
using System;

class Lights { public void Dim(int pct) { Console.WriteLine("lights " + pct + "%"); } }
class Projector { public void On() { Console.WriteLine("projector on"); } }
class Player { public void Play(string t) { Console.WriteLine("playing " + t); } }
class HomeTheater {
    private readonly Lights l = new Lights(); private readonly Projector p = new Projector(); private readonly Player pl = new Player();
    public void WatchMovie(string title) { l.Dim(10); p.On(); pl.Play(title); }
}` }
        ] } },
      { title: 'Spring JdbcTemplate', html: `<p>Raw JDBC: get a <code>Connection</code>, create a <code>PreparedStatement</code>, bind parameters, execute, loop the <code>ResultSet</code>, close all three in the right order, translate <code>SQLException</code>. <code>jdbcTemplate.query(sql, rowMapper, args)</code> is a facade over all of it. You can still drop down to raw JDBC when you need something unusual — facades do not lock the door.</p>` },
      { title: 'Service layer = facade over repositories', html: `<p>A <code>TransferService.transfer(from, to, amount)</code> method loads two accounts, checks balances, writes two rows and an audit log inside one transaction. Controllers call the service, never the repositories. This keeps transaction boundaries and business order in one place. ${H.chips(['Controller', '→ TransferService (facade)', '→ AccountRepo, AuditRepo, TxManager'])}</p>` },
      { title: 'Facade that grew into a god class (anti-example)', html: `<p>Teams keep adding "one more convenience method" until <code>AppFacade</code> has 120 methods and imports every module. Fix: split by use case (<code>OrderFacade</code>, <code>RefundFacade</code>, <code>AccountFacade</code>). A facade should be <b>thin</b> — if it holds rules like "orders above ₹50k need approval", move those rules into a domain class.</p>` }
    ],
    deepDive: `<p><b>Facade and the Law of Demeter.</b> Callers talk to one friend instead of reaching through it (<code>order.getCustomer().getWallet().debit()</code>). This lowers coupling, which is the whole point: you can rewrite <code>ShippingService</code> without touching any caller.</p>
      <p><b>Facade vs Mediator.</b> Both sit in the middle of many classes. A facade is <i>one-directional</i>: clients call it, it calls subsystems, and subsystems do not know it exists. A mediator is <i>two-directional</i>: colleagues talk to the mediator and the mediator talks back to them, coordinating their interaction.</p>
      <p><b>Production concerns.</b> (1) <b>Partial failure</b> — once the facade spans remote services, "charge succeeded but shipping failed" needs compensation or a saga; the facade is the natural place for the orchestration, but keep it idempotent (use an order id as an idempotency key). (2) <b>Transactions</b> — in a monolith the facade method is usually the transaction boundary (<code>@Transactional</code>). (3) <b>Testability</b> — inject subsystems via the constructor (as in the code above) so tests can pass fakes; a facade that does <code>new PaymentGateway()</code> inside is hard to test. (4) <b>Versioning</b> — public SDKs are facades; keep their surface small because every public method is a promise.</p>
      <p><b>At system scale</b> the same idea is an <b>API gateway</b> or a <b>Backend-for-Frontend</b>: one endpoint for the mobile app that fans out to many microservices.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI agents are often given a <i>facade</i> on purpose. Instead of exposing 40 low-level endpoints as tools, you expose 5 task-level tools (<code>place_order</code>, <code>refund_order</code>) — fewer tools means fewer wrong calls, and the facade enforces the correct order and the undo steps the model might forget. Designing that tool surface is facade design.</p>
      <p><b>Use AI as a partner:</b> <code>Here are the 5 subsystem interfaces. Write a facade method for "place order", list every failure point, and say which earlier steps must be undone at each.</code> Then check the compensation list yourself. <b>Where AI goes wrong:</b> it creates a single giant facade for the whole app, puts business rules inside it, hard-codes <code>new</code> for every dependency (untestable), and ignores partial failure. <b>What you must still own:</b> deciding the use-case boundaries, keeping the facade thin, and designing failure handling.</p>`,
    problems: [{
      title: 'One-Call Video Upload',
      level: 'Easy', tags: ['facade', 'orchestration'], companies: ['Google', 'Netflix', 'ShareChat'],
      statement: `<p>Uploading a video requires: <code>Validator.check(file)</code>, <code>Transcoder.toMp4(file)</code>, <code>ThumbnailMaker.make(mp4)</code>, <code>Storage.save(mp4, thumb)</code> (returns a video id), and <code>Notifier.notifyFollowers(userId, id)</code>. Today the web controller, the mobile API and an import script each do these five calls themselves. Design a single entry point <code>upload(userId, file)</code> that returns the video id or throws a clear error.</p>`,
      constraints: `<p>Invalid file → <code>IllegalArgumentException</code> before any expensive work. Subsystems must stay usable directly (an admin tool re-generates thumbnails). Dependencies must be injectable for tests.</p>`,
      example: `<p><code>upload("u7", "cat.mov")</code> → check ${H.c('g', 'ok')} → "cat.mp4" → "cat.jpg" → saved as ${H.c('b', 'vid-1')} → followers notified → returns <b>vid-1</b>. <code>upload("u7", "virus.exe")</code> → ${H.c('r', 'IllegalArgumentException')} and the transcoder is never called.</p>`,
      brute: { why: `<p>Each caller repeats the five-step sequence. When the transcoder starts needing a "quality" parameter, three places change; the import script forgot validation, so it transcodes junk files and wastes CPU. Callers are coupled to five classes each.</p>`, code: { lang: 'java', code: `class Validator { boolean check(String f) { return f.endsWith(".mov") || f.endsWith(".mp4"); } }
class Transcoder { String toMp4(String f) { return f.replaceAll("[.]mov$", ".mp4"); } }
class ThumbnailMaker { String make(String mp4) { return mp4.replace(".mp4", ".jpg"); } }
class Storage { String save(String mp4, String thumb) { return "vid-1"; } }
class Notifier { void notifyFollowers(String u, String id) { System.out.println(u + " posted " + id); } }

class WebController {        // copy #1 of the workflow
    String handle(String user, String file) {
        if (!new Validator().check(file)) throw new IllegalArgumentException(file);
        String mp4 = new Transcoder().toMp4(file);
        String id = new Storage().save(mp4, new ThumbnailMaker().make(mp4));
        new Notifier().notifyFollowers(user, id);
        return id;
    }
}
class ImportScript {         // copy #2 — and it forgot validation
    String run(String user, String file) {
        String mp4 = new Transcoder().toMp4(file);
        return new Storage().save(mp4, new ThumbnailMaker().make(mp4));
    }
}`, alt: [
                { lang: 'python', code: `
import re

class Validator:
    def check(self, f): return f.endswith(".mov") or f.endswith(".mp4")
class Transcoder:
    def to_mp4(self, f): return re.sub(r"[.]mov$", ".mp4", f)
class ThumbnailMaker:
    def make(self, mp4): return mp4.replace(".mp4", ".jpg")
class Storage:
    def save(self, mp4, thumb): return "vid-1"
class Notifier:
    def notify_followers(self, u, id): print(u, "posted", id)

class WebController:        # copy #1 of the workflow
    def handle(self, user, file):
        if not Validator().check(file): raise ValueError(file)
        mp4 = Transcoder().to_mp4(file)
        id = Storage().save(mp4, ThumbnailMaker().make(mp4))
        Notifier().notify_followers(user, id)
        return id

class ImportScript:         # copy #2 — and it forgot validation
    def run(self, user, file):
        mp4 = Transcoder().to_mp4(file)
        return Storage().save(mp4, ThumbnailMaker().make(mp4))` },
                { lang: 'ts', code: `
class Validator { check(f: string): boolean { return f.endsWith(".mov") || f.endsWith(".mp4"); } }
class Transcoder { toMp4(f: string): string { return f.replace(/[.]mov$/, ".mp4"); } }
class ThumbnailMaker { make(mp4: string): string { return mp4.replace(".mp4", ".jpg"); } }
class Storage { save(mp4: string, thumb: string): string { return "vid-1"; } }
class Notifier { notifyFollowers(u: string, id: string): void { console.log(u + " posted " + id); } }

class WebController {        // copy #1 of the workflow
    handle(user: string, file: string): string {
        if (!new Validator().check(file)) throw new Error(file);
        const mp4 = new Transcoder().toMp4(file);
        const id = new Storage().save(mp4, new ThumbnailMaker().make(mp4));
        new Notifier().notifyFollowers(user, id);
        return id;
    }
}
class ImportScript {         // copy #2 — and it forgot validation
    run(user: string, file: string): string {
        const mp4 = new Transcoder().toMp4(file);
        return new Storage().save(mp4, new ThumbnailMaker().make(mp4));
    }
}` },
                { lang: 'cpp', code: `
struct Validator { bool check(const string& f) { return f.ends_with(".mov") || f.ends_with(".mp4"); } };
struct Transcoder { string toMp4(string f) { if (f.ends_with(".mov")) f = f.substr(0, f.size() - 4) + ".mp4"; return f; } };
struct ThumbnailMaker { string make(string mp4) { size_t p = mp4.find(".mp4"); if (p != string::npos) mp4.replace(p, 4, ".jpg"); return mp4; } };
struct Storage { string save(const string& mp4, const string& thumb) { return "vid-1"; } };
struct Notifier { void notifyFollowers(const string& u, const string& id) { cout << u << " posted " << id << "\\n"; } };

class WebController {        // copy #1 of the workflow
public:
    string handle(const string& user, const string& file) {
        if (!Validator().check(file)) throw invalid_argument(file);
        string mp4 = Transcoder().toMp4(file);
        string id = Storage().save(mp4, ThumbnailMaker().make(mp4));
        Notifier().notifyFollowers(user, id);
        return id;
    }
};
class ImportScript {         // copy #2 — and it forgot validation
public:
    string run(const string& user, const string& file) {
        string mp4 = Transcoder().toMp4(file);
        return Storage().save(mp4, ThumbnailMaker().make(mp4));
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Text.RegularExpressions;

class Validator { public bool Check(string f) { return f.EndsWith(".mov") || f.EndsWith(".mp4"); } }
class Transcoder { public string ToMp4(string f) { return Regex.Replace(f, "[.]mov$", ".mp4"); } }
class ThumbnailMaker { public string Make(string mp4) { return mp4.Replace(".mp4", ".jpg"); } }
class Storage { public string Save(string mp4, string thumb) { return "vid-1"; } }
class Notifier { public void NotifyFollowers(string u, string id) { Console.WriteLine(u + " posted " + id); } }

class WebController {        // copy #1 of the workflow
    public string Handle(string user, string file) {
        if (!new Validator().Check(file)) throw new ArgumentException(file);
        string mp4 = new Transcoder().ToMp4(file);
        string id = new Storage().Save(mp4, new ThumbnailMaker().Make(mp4));
        new Notifier().NotifyFollowers(user, id);
        return id;
    }
}
class ImportScript {         // copy #2 — and it forgot validation
    public string Run(string user, string file) {
        string mp4 = new Transcoder().ToMp4(file);
        return new Storage().Save(mp4, new ThumbnailMaker().Make(mp4));
    }
}` }
              ] } },
      mcq: { q: 'The admin tool needs only ThumbnailMaker. What should it do once the facade exists?', options: ['Go through the facade and add a regenerateThumbnail() method to it', 'Call ThumbnailMaker directly — a facade does not hide subsystems', 'Copy ThumbnailMaker into the admin tool', 'Make ThumbnailMaker private to the facade'], answer: 1, explain: 'A facade offers a convenient default path; it does not prevent direct use of subsystems. Bloating it with every niche method turns it into a god class.' },
      hints: [`<p>Hint 1: The repeated <i>sequence</i> is the smell. Put the sequence in one class.</p>`, `<p>Hint 2: <code>VideoUploadFacade</code> takes all five subsystems in its constructor (dependency injection) and exposes one method.</p>`, `<p>Hint 3: Validate first and fail fast; then transcode → thumbnail → save → notify. Notification failure should not lose the upload — catch and log it after saving.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "u7 posted vid-1\nvid-1\nUnsupported file: virus.exe\nnotify failed for vid-2: push service down\nvid-2\n" }] },
      solution: {
        approach: `<p>Create <code>VideoUploadFacade</code> holding the five subsystems (constructor-injected). <code>upload</code> runs the sequence once, validating first so nothing expensive happens on bad input. Because the video is already saved when notification runs, a notifier error is caught and logged rather than failing the whole upload. Every caller (web, mobile, script) now makes one call and cannot skip validation.</p>`,
        code: `class Validator { boolean check(String f) { return f.endsWith(".mov") || f.endsWith(".mp4"); } }
class Transcoder { String toMp4(String f) { return f.replaceAll("[.]mov$", ".mp4"); } }
class ThumbnailMaker { String make(String mp4) { return mp4.replace(".mp4", ".jpg"); } }
class Storage {
    private int next = 1;
    String save(String mp4, String thumb) { return "vid-" + next++; }
}
class Notifier {
    void notifyFollowers(String u, String id) {
        if (u.equals("flaky")) throw new IllegalStateException("push service down");
        System.out.println(u + " posted " + id);
    }
}

class VideoUploadFacade {
    private final Validator validator;
    private final Transcoder transcoder;
    private final ThumbnailMaker thumbs;
    private final Storage storage;
    private final Notifier notifier;

    VideoUploadFacade(Validator v, Transcoder t, ThumbnailMaker th, Storage s, Notifier n) {
        validator = v; transcoder = t; thumbs = th; storage = s; notifier = n;
    }

    String upload(String userId, String file) {
        if (!validator.check(file))                               // fail fast, cheap check first
            throw new IllegalArgumentException("Unsupported file: " + file);
        String mp4 = transcoder.toMp4(file);
        String id = storage.save(mp4, thumbs.make(mp4));
        try {
            notifier.notifyFollowers(userId, id);
        } catch (RuntimeException e) {                            // upload already succeeded
            System.out.println("notify failed for " + id + ": " + e.getMessage());
        }
        return id;
    }

    public static void main(String[] args) {
        VideoUploadFacade up = new VideoUploadFacade(new Validator(), new Transcoder(),
                new ThumbnailMaker(), new Storage(), new Notifier());
        System.out.println(up.upload("u7", "cat.mov"));   // vid-1
        try { up.upload("u7", "virus.exe"); }              // rejected before any expensive work
        catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
        System.out.println(up.upload("flaky", "dog.mp4")); // upload succeeds even if notify fails
    }
}`,
        alt: [
          { lang: 'python', code: `import re


class Validator:
    def check(self, f: str) -> bool:
        return f.endswith((".mov", ".mp4"))


class Transcoder:
    def to_mp4(self, f: str) -> str:
        return re.sub(r"\\.mov$", ".mp4", f)


class ThumbnailMaker:
    def make(self, mp4: str) -> str:
        return mp4.replace(".mp4", ".jpg")


class Storage:
    def __init__(self) -> None:
        self._next = 1

    def save(self, mp4: str, thumb: str) -> str:
        video_id = f"vid-{self._next}"
        self._next += 1
        return video_id


class Notifier:
    def notify_followers(self, user_id: str, video_id: str) -> None:
        if user_id == "flaky":
            raise RuntimeError("push service down")
        print(f"{user_id} posted {video_id}")


class VideoUploadFacade:
    def __init__(self, validator: Validator, transcoder: Transcoder, thumbs: ThumbnailMaker,
                 storage: Storage, notifier: Notifier) -> None:
        self._validator = validator
        self._transcoder = transcoder
        self._thumbs = thumbs
        self._storage = storage
        self._notifier = notifier

    def upload(self, user_id: str, file: str) -> str:
        if not self._validator.check(file):  # fail fast, cheap check first
            raise ValueError(f"Unsupported file: {file}")
        mp4 = self._transcoder.to_mp4(file)
        video_id = self._storage.save(mp4, self._thumbs.make(mp4))
        try:
            self._notifier.notify_followers(user_id, video_id)
        except RuntimeError as e:  # upload already succeeded
            print(f"notify failed for {video_id}: {e}")
        return video_id


if __name__ == "__main__":
    up = VideoUploadFacade(Validator(), Transcoder(), ThumbnailMaker(), Storage(), Notifier())
    print(up.upload("u7", "cat.mov"))  # vid-1
    try:
        up.upload("u7", "virus.exe")  # rejected before any expensive work
    except ValueError as e:
        print(e)
    print(up.upload("flaky", "dog.mp4"))  # upload succeeds even if notify fails` },
          { lang: 'ts', code: `export {}; // makes this file a module, so Storage never clashes with the DOM global of that name

class Validator {
  check(f: string): boolean {
    return f.endsWith(".mov") || f.endsWith(".mp4");
  }
}

class Transcoder {
  toMp4(f: string): string {
    return f.replace(/\\.mov$/, ".mp4");
  }
}

class ThumbnailMaker {
  make(mp4: string): string {
    return mp4.replace(".mp4", ".jpg");
  }
}

class Storage {
  private next = 1;

  save(_mp4: string, _thumb: string): string {
    return \`vid-\${this.next++}\`;
  }
}

class Notifier {
  notifyFollowers(userId: string, videoId: string): void {
    if (userId === "flaky") throw new Error("push service down");
    console.log(\`\${userId} posted \${videoId}\`);
  }
}

class VideoUploadFacade {
  constructor(
    private readonly validator: Validator,
    private readonly transcoder: Transcoder,
    private readonly thumbs: ThumbnailMaker,
    private readonly storage: Storage,
    private readonly notifier: Notifier,
  ) {}

  upload(userId: string, file: string): string {
    if (!this.validator.check(file)) throw new Error(\`Unsupported file: \${file}\`); // fail fast, cheap check first
    const mp4 = this.transcoder.toMp4(file);
    const id = this.storage.save(mp4, this.thumbs.make(mp4));
    try {
      this.notifier.notifyFollowers(userId, id);
    } catch (e) { // upload already succeeded
      console.log(\`notify failed for \${id}: \${(e as Error).message}\`);
    }
    return id;
  }
}

const up = new VideoUploadFacade(new Validator(), new Transcoder(), new ThumbnailMaker(), new Storage(), new Notifier());
console.log(up.upload("u7", "cat.mov")); // vid-1
try {
  up.upload("u7", "virus.exe"); // rejected before any expensive work
} catch (e) {
  console.log((e as Error).message);
}
console.log(up.upload("flaky", "dog.mp4")); // upload succeeds even if notify fails` },
          { lang: 'cpp', code: `class Validator {
public:
    bool check(const string& f) const {
        auto ends = [&](const string& s) { return f.size() >= s.size() && f.compare(f.size() - s.size(), s.size(), s) == 0; };
        return ends(".mov") || ends(".mp4");
    }
};

class Transcoder {
public:
    string toMp4(const string& f) const {
        const string mov = ".mov";
        if (f.size() >= mov.size() && f.compare(f.size() - mov.size(), mov.size(), mov) == 0)
            return f.substr(0, f.size() - mov.size()) + ".mp4";
        return f;
    }
};

class ThumbnailMaker {
public:
    string make(string mp4) const {
        size_t at = mp4.find(".mp4");
        if (at != string::npos) mp4.replace(at, 4, ".jpg");
        return mp4;
    }
};

class Storage {
    int next_ = 1;
public:
    string save(const string&, const string&) { return "vid-" + to_string(next_++); }
};

class Notifier {
public:
    void notifyFollowers(const string& u, const string& id) const {
        if (u == "flaky") throw runtime_error("push service down");
        cout << u << " posted " << id << "\\n";
    }
};

class VideoUploadFacade {
    const Validator& validator_;
    const Transcoder& transcoder_;
    const ThumbnailMaker& thumbs_;
    Storage& storage_;
    const Notifier& notifier_;
public:
    VideoUploadFacade(const Validator& v, const Transcoder& t, const ThumbnailMaker& th, Storage& s, const Notifier& n)
        : validator_(v), transcoder_(t), thumbs_(th), storage_(s), notifier_(n) {}

    string upload(const string& userId, const string& file) {
        if (!validator_.check(file))                             // fail fast, cheap check first
            throw invalid_argument("Unsupported file: " + file);
        string mp4 = transcoder_.toMp4(file);
        string id = storage_.save(mp4, thumbs_.make(mp4));
        try {
            notifier_.notifyFollowers(userId, id);
        } catch (const runtime_error& e) {                       // upload already succeeded
            cout << "notify failed for " << id << ": " << e.what() << "\\n";
        }
        return id;
    }
};

int main() {
    Validator validator; Transcoder transcoder; ThumbnailMaker thumbs; Storage storage; Notifier notifier;
    VideoUploadFacade up(validator, transcoder, thumbs, storage, notifier);
    cout << up.upload("u7", "cat.mov") << "\\n";                  // vid-1
    try {
        up.upload("u7", "virus.exe");                            // rejected before any expensive work
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";
    }
    cout << up.upload("flaky", "dog.mp4") << "\\n";               // upload succeeds even if notify fails
}` },
  { lang: 'csharp', code: `
using System;
using System.Text.RegularExpressions;

class Validator { public bool Check(string f) { return f.EndsWith(".mov") || f.EndsWith(".mp4"); } }
class Transcoder { public string ToMp4(string f) { return Regex.Replace(f, "[.]mov$", ".mp4"); } }
class ThumbnailMaker { public string Make(string mp4) { return mp4.Replace(".mp4", ".jpg"); } }
class Storage {
    private int next = 1;
    public string Save(string mp4, string thumb) { return "vid-" + next++; }
}
class Notifier {
    public void NotifyFollowers(string u, string id) {
        if (u == "flaky") throw new InvalidOperationException("push service down");
        Console.WriteLine(u + " posted " + id);
    }
}

class VideoUploadFacade {
    private readonly Validator validator;
    private readonly Transcoder transcoder;
    private readonly ThumbnailMaker thumbs;
    private readonly Storage storage;
    private readonly Notifier notifier;

    public VideoUploadFacade(Validator v, Transcoder t, ThumbnailMaker th, Storage s, Notifier n) {
        validator = v; transcoder = t; thumbs = th; storage = s; notifier = n;
    }

    public string Upload(string userId, string file) {
        if (!validator.Check(file))                               // fail fast, cheap check first
            throw new ArgumentException("Unsupported file: " + file);
        string mp4 = transcoder.ToMp4(file);
        string id = storage.Save(mp4, thumbs.Make(mp4));
        try {
            notifier.NotifyFollowers(userId, id);
        } catch (Exception e) {                                   // upload already succeeded
            Console.WriteLine("notify failed for " + id + ": " + e.Message);
        }
        return id;
    }
}

class Program {
    static void Main() {
        VideoUploadFacade up = new VideoUploadFacade(new Validator(), new Transcoder(),
                new ThumbnailMaker(), new Storage(), new Notifier());
        Console.WriteLine(up.Upload("u7", "cat.mov"));   // vid-1
        try { up.Upload("u7", "virus.exe"); }              // rejected before any expensive work
        catch (ArgumentException e) { Console.WriteLine(e.Message); }
        Console.WriteLine(up.Upload("flaky", "dog.mp4")); // upload succeeds even if notify fails
    }
}` }
        ],
        complexity: `<p>Same work as before (dominated by transcoding); the facade adds O(1) overhead. Coupling drops from 5 dependencies per caller to 1.</p>`,
        followUps: ['Transcoding takes 2 minutes — how would the facade change to return immediately (async job + status)?', 'Storage succeeded but the DB row failed — what compensation is needed?', 'How would you expose this facade as a single tool to an AI agent?']
      }
    }]
  });
  /* =====================================================================
     TOPIC 4 — PROXY
     ===================================================================== */
  var PROXY_CODE = 'public void display(String user) {\n' +
    '  if (!acl.canView(user, name))          // protection proxy\n' +
    '    throw new SecurityException(user);\n' +
    '  if (real == null)                      // virtual proxy: lazy\n' +
    '    real = new RealImage(name);          // slow disk load\n' +
    '  real.display(user);                    // delegate\n' +
    '}';

  topics.push({
    title: 'Proxy — A Stand-In That Controls Access',
    analogy: `<p>A celebrity does not take every call personally. Their <b>manager</b> answers first: "Who are you? Do you have an appointment? Oh, she already answered that question — here is the reply." The manager looks like the celebrity's phone number to you, but decides <i>whether</i>, <i>when</i> and <i>how</i> the call reaches the real person.</p>
      <p>Your <b>debit card</b> is another proxy: it stands in for the cash in your bank account. Same "pay" action, but the card adds a PIN check and only touches the real money when needed.</p>`,
    explain: `<p><b>The idea.</b> A <b>Proxy</b> implements the <i>same interface</i> as the real object (the "real subject") and holds a reference to it. The client cannot tell them apart. Before or after forwarding the call, the proxy can <b>check permission</b>, <b>create the real object late</b>, <b>return a cached answer</b>, <b>count / log</b>, or <b>send the call over the network</b>.</p>
      ${H.table(['Kind of proxy', 'What it controls', 'Everyday example'], [
        ['<b>Virtual</b> (lazy)', 'creates the expensive object only on first real use', 'image placeholder until you scroll to it; Hibernate lazy-loaded entities'],
        ['<b>Protection</b>', 'checks who is calling', '"only the owner may delete this document"'],
        ['<b>Caching</b>', 'returns a stored answer for repeated requests', 'currency rates cached for 60 s'],
        ['<b>Remote</b>', 'hides a network call behind a local-looking object', 'gRPC/RMI stubs, Feign clients'],
        ['<b>Smart reference / logging</b>', 'counts uses, logs, measures, releases resources', 'connection-pool handle, Spring AOP'],
      ])}
      <p><b>Roles:</b> ${H.kv([['Subject', 'the shared interface (Image)'], ['RealSubject', 'the object doing the real work (RealImage — loads 5 MB from disk)'], ['Proxy', 'same interface, holds/creates the RealSubject, adds control']])}</p>
      <p><b>Proxy vs Decorator</b> — they look identical in code (wrap + same interface + delegate). The difference is <b>intent and who builds it</b>: a decorator <i>adds features</i> and the client stacks it on purpose; a proxy <i>controls access to the same feature</i> and is usually handed to the client by a factory or framework, which may even create the real object itself. Most proxies manage the real object's <b>lifecycle</b>; decorators never do.</p>
      <p><b>Most languages can build proxies at run time:</b> Java's <code>java.lang.reflect.Proxy</code> routes every call of any interface to one <code>InvocationHandler</code>; Python intercepts attribute access with <code>__getattr__</code>; JavaScript and TypeScript have a built-in <code>Proxy</code> object; C++ has no run-time reflection, so a template wrapper does the same job at compile time. Spring <code>@Transactional</code>, <code>@Cacheable</code>, Mockito mocks and Hibernate lazy loading all use generated proxies.</p>`,
    clues: ['"<b>lazy loading</b>" / "do not load the large object until it is needed"', '"<b>access control</b>" / "only admins can call delete" without changing the service', '"<b>cache</b> the results of an expensive / remote call" transparently', '"the object lives on <b>another machine</b> but should feel local" (RPC stub)', '"count / log / rate-limit every call to X" with the same interface', '"<b>placeholder</b>" / "stand-in" / "surrogate" / "the client must not know"'],
    code: [{ lang: 'java', title: 'Virtual + protection proxy for images', code: `
interface Image { void display(String user); }

// RealSubject: expensive to create
class RealImage implements Image {
    private final String name;
    RealImage(String name) {
        this.name = name;
        System.out.println("Loading " + name + " from disk (slow)...");
    }
    public void display(String user) { System.out.println("Showing " + name + " to " + user); }
}

class AccessList {
    private final Map<String, Set<String>> allowed = new HashMap<>();
    void allow(String user, String image) { allowed.computeIfAbsent(user, k -> new HashSet<>()).add(image); }
    boolean canView(String user, String image) { return allowed.getOrDefault(user, Set.of()).contains(image); }
}

// Proxy: virtual (lazy) + protection in one
class ImageProxy implements Image {
    private final String name;
    private final AccessList acl;
    private RealImage real;            // null until first allowed use

    ImageProxy(String name, AccessList acl) { this.name = name; this.acl = acl; }

    @Override
    public void display(String user) {
        if (!acl.canView(user, name)) throw new SecurityException(user + " cannot view " + name);
        if (real == null) real = new RealImage(name);   // created lazily, exactly once
        real.display(user);
    }
}

class Gallery {
    public static void main(String[] args) {
        AccessList acl = new AccessList();
        acl.allow("asha", "beach.png");
        Image img = new ImageProxy("beach.png", acl);   // cheap: nothing loaded yet
        img.display("asha");    // loads, then shows
        img.display("asha");    // shows, no second load
        try { img.display("eve"); } catch (SecurityException e) { System.out.println("Blocked: " + e.getMessage()); }
    }
}`,
      alt: [
        { lang: 'python', code: `from abc import ABC, abstractmethod
from typing import Optional


class Image(ABC):
    @abstractmethod
    def display(self, user: str) -> None: ...


# RealSubject: expensive to create
class RealImage(Image):
    def __init__(self, name: str) -> None:
        self._name = name
        print(f"Loading {name} from disk (slow)...")

    def display(self, user: str) -> None:
        print(f"Showing {self._name} to {user}")


class AccessList:
    def __init__(self) -> None:
        self._allowed: dict[str, set[str]] = {}

    def allow(self, user: str, image: str) -> None:
        self._allowed.setdefault(user, set()).add(image)

    def can_view(self, user: str, image: str) -> bool:
        return image in self._allowed.get(user, set())


# Proxy: virtual (lazy) + protection in one
class ImageProxy(Image):
    def __init__(self, name: str, acl: AccessList) -> None:
        self._name = name
        self._acl = acl
        self._real: Optional[RealImage] = None  # None until first allowed use

    def display(self, user: str) -> None:
        if not self._acl.can_view(user, self._name):
            raise PermissionError(f"{user} cannot view {self._name}")
        if self._real is None:
            self._real = RealImage(self._name)  # created lazily, exactly once
        self._real.display(user)


if __name__ == "__main__":
    acl = AccessList()
    acl.allow("asha", "beach.png")
    img: Image = ImageProxy("beach.png", acl)  # cheap: nothing loaded yet
    img.display("asha")  # loads, then shows
    img.display("asha")  # shows, no second load
    try:
        img.display("eve")
    except PermissionError as e:
        print(f"Blocked: {e}")` },
        { lang: 'ts', code: `interface Image {
  display(user: string): void;
}

// RealSubject: expensive to create
class RealImage implements Image {
  constructor(private readonly name: string) {
    console.log(\`Loading \${name} from disk (slow)...\`);
  }
  display(user: string): void { console.log(\`Showing \${this.name} to \${user}\`); }
}

class AccessList {
  private readonly allowed = new Map<string, Set<string>>();

  allow(user: string, image: string): void {
    if (!this.allowed.has(user)) this.allowed.set(user, new Set());
    this.allowed.get(user)!.add(image);
  }

  canView(user: string, image: string): boolean {
    return this.allowed.get(user)?.has(image) ?? false;
  }
}

// Proxy: virtual (lazy) + protection in one
class ImageProxy implements Image {
  private real: RealImage | undefined; // undefined until first allowed use

  constructor(private readonly name: string, private readonly acl: AccessList) {}

  display(user: string): void {
    if (!this.acl.canView(user, this.name)) throw new Error(\`\${user} cannot view \${this.name}\`);
    this.real ??= new RealImage(this.name); // created lazily, exactly once
    this.real.display(user);
  }
}

const acl = new AccessList();
acl.allow("asha", "beach.png");
const img: Image = new ImageProxy("beach.png", acl); // cheap: nothing loaded yet
img.display("asha"); // loads, then shows
img.display("asha"); // shows, no second load
try {
  img.display("eve");
} catch (e) {
  console.log(\`Blocked: \${(e as Error).message}\`);
}` },
        { lang: 'cpp', code: `class Image {
public:
    virtual ~Image() = default;
    virtual void display(const string& user) = 0;
};

// RealSubject: expensive to create
class RealImage : public Image {
    string name_;
public:
    explicit RealImage(string name) : name_(std::move(name)) {
        cout << "Loading " << name_ << " from disk (slow)...\\n";
    }
    void display(const string& user) override { cout << "Showing " << name_ << " to " << user << "\\n"; }
};

class AccessList {
    map<string, set<string>> allowed_;
public:
    void allow(const string& user, const string& image) { allowed_[user].insert(image); }
    bool canView(const string& user, const string& image) const {
        auto it = allowed_.find(user);
        return it != allowed_.end() && it->second.count(image) > 0;
    }
};

// Proxy: virtual (lazy) + protection in one
class ImageProxy : public Image {
    string name_;
    const AccessList& acl_;
    unique_ptr<RealImage> real_;                  // null until first allowed use
public:
    ImageProxy(string name, const AccessList& acl) : name_(std::move(name)), acl_(acl) {}

    void display(const string& user) override {
        if (!acl_.canView(user, name_)) throw runtime_error(user + " cannot view " + name_);
        if (!real_) real_ = make_unique<RealImage>(name_);   // created lazily, exactly once
        real_->display(user);
    }
};

int main() {
    AccessList acl;
    acl.allow("asha", "beach.png");
    ImageProxy proxy("beach.png", acl);           // cheap: nothing loaded yet
    Image& img = proxy;
    img.display("asha");                          // loads, then shows
    img.display("asha");                          // shows, no second load
    try {
        img.display("eve");
    } catch (const runtime_error& e) {
        cout << "Blocked: " << e.what() << "\\n";
    }
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Security;

interface IImage { void Display(string user); }

// RealSubject: expensive to create
class RealImage : IImage {
    private readonly string name;
    public RealImage(string name) {
        this.name = name;
        Console.WriteLine("Loading " + name + " from disk (slow)...");
    }
    public void Display(string user) { Console.WriteLine("Showing " + name + " to " + user); }
}

class AccessList {
    private readonly Dictionary<string, HashSet<string>> allowed = new Dictionary<string, HashSet<string>>();
    public void Allow(string user, string image) {
        HashSet<string> set;
        if (!allowed.TryGetValue(user, out set)) { set = new HashSet<string>(); allowed[user] = set; }
        set.Add(image);
    }
    public bool CanView(string user, string image) { HashSet<string> set; return allowed.TryGetValue(user, out set) && set.Contains(image); }
}

// Proxy: virtual (lazy) + protection in one
class ImageProxy : IImage {
    private readonly string name;
    private readonly AccessList acl;
    private RealImage real;            // null until first allowed use

    public ImageProxy(string name, AccessList acl) { this.name = name; this.acl = acl; }

    public void Display(string user) {
        if (!acl.CanView(user, name)) throw new SecurityException(user + " cannot view " + name);
        if (real == null) real = new RealImage(name);   // created lazily, exactly once
        real.Display(user);
    }
}

class Program {
    static void Main() {
        AccessList acl = new AccessList();
        acl.Allow("asha", "beach.png");
        IImage img = new ImageProxy("beach.png", acl);   // cheap: nothing loaded yet
        img.Display("asha");    // loads, then shows
        img.Display("asha");    // shows, no second load
        try { img.Display("eve"); } catch (SecurityException e) { Console.WriteLine("Blocked: " + e.Message); }
    }
}` }
      ] },
    { lang: 'java', title: 'Dynamic proxy (Java: java.lang.reflect.Proxy)', code: `
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;

interface Calculator { int add(int a, int b); int mul(int a, int b); }

class SlowCalculator implements Calculator {
    public int add(int a, int b) { return a + b; }
    public int mul(int a, int b) { return a * b; }
}

// One handler can proxy ANY interface: here, it logs and times every method
class TimingHandler implements InvocationHandler {
    private final Object target;
    TimingHandler(Object target) { this.target = target; }

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
        long t0 = System.nanoTime();
        try {
            return method.invoke(target, args);
        } finally {
            System.out.println(method.getName() + Arrays.toString(args) + " took " + (System.nanoTime() - t0) + " ns");
        }
    }

    @SuppressWarnings("unchecked")
    static <T> T wrap(T target, Class<T> iface) {
        return (T) Proxy.newProxyInstance(iface.getClassLoader(), new Class<?>[]{iface}, new TimingHandler(target));
    }

    public static void main(String[] args) {
        Calculator c = wrap(new SlowCalculator(), Calculator.class);
        System.out.println(c.add(2, 3));   // logged + timed, client code unchanged
    }
}`,
      alt: [
        { lang: 'python', code: `import time
from abc import ABC, abstractmethod
from typing import Any, TypeVar, cast

T = TypeVar("T")


class Calculator(ABC):
    @abstractmethod
    def add(self, a: int, b: int) -> int: ...

    @abstractmethod
    def mul(self, a: int, b: int) -> int: ...


class SlowCalculator(Calculator):
    def add(self, a: int, b: int) -> int:
        return a + b

    def mul(self, a: int, b: int) -> int:
        return a * b


# One handler can proxy ANY object: __getattr__ intercepts every attribute lookup,
# and we wrap the methods so each call is logged and timed
class TimingHandler:
    def __init__(self, target: object) -> None:
        self._target = target

    def __getattr__(self, name: str) -> Any:
        attr = getattr(self._target, name)
        if not callable(attr):
            return attr

        def timed(*args: Any) -> Any:
            t0 = time.perf_counter_ns()
            try:
                return attr(*args)
            finally:
                print(f"{name}{list(args)} took {time.perf_counter_ns() - t0} ns")

        return timed


def wrap(target: T) -> T:
    return cast(T, TimingHandler(target))


if __name__ == "__main__":
    c = wrap(SlowCalculator())
    print(c.add(2, 3))  # logged + timed, client code unchanged` },
        { lang: 'ts', code: `interface Calculator {
  add(a: number, b: number): number;
  mul(a: number, b: number): number;
}

class SlowCalculator implements Calculator {
  add(a: number, b: number): number { return a + b; }
  mul(a: number, b: number): number { return a * b; }
}

// One built-in Proxy can wrap ANY object: here, it logs and times every method
function wrap<T extends object>(target: T): T {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      const value: unknown = Reflect.get(obj, prop, receiver);
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        const t0 = process.hrtime.bigint();
        try {
          return value.apply(obj, args);
        } finally {
          console.log(\`\${String(prop)}[\${args.join(", ")}] took \${process.hrtime.bigint() - t0} ns\`);
        }
      };
    },
  });
}

const c: Calculator = wrap(new SlowCalculator());
console.log(c.add(2, 3)); // logged + timed, client code unchanged` },
        { lang: 'cpp', code: `class Calculator {
public:
    virtual ~Calculator() = default;
    virtual int add(int a, int b) const = 0;
    virtual int mul(int a, int b) const = 0;
};

class SlowCalculator : public Calculator {
public:
    int add(int a, int b) const override { return a + b; }
    int mul(int a, int b) const override { return a * b; }
};

// C++ has no run-time reflection, so a template plays the "one handler for any method" role at compile time:
// call() works for every const member function of any T, and logs + times it.
template <class T>
class Timed {
    const T& target_;
public:
    explicit Timed(const T& target) : target_(target) {}

    template <class R, class... A>
    R call(const char* name, R (T::*method)(A...) const, A... args) const {
        auto t0 = chrono::steady_clock::now();
        R result = (target_.*method)(args...);
        ostringstream argList;
        const char* sep = "";
        ((argList << sep << args, sep = ", "), ...);
        auto ns = chrono::duration_cast<chrono::nanoseconds>(chrono::steady_clock::now() - t0).count();
        cout << name << "[" << argList.str() << "] took " << ns << " ns\\n";
        return result;
    }
};

int main() {
    SlowCalculator real;
    Timed<Calculator> c(real);
    cout << c.call("add", &Calculator::add, 2, 3) << "\\n";   // logged + timed, SlowCalculator unchanged
}` },
  { lang: 'csharp', code: `
using System;
using System.Diagnostics;
using System.Reflection;
using System.Runtime.Remoting.Proxies;
using System.Runtime.Remoting.Messaging;

interface ICalculator { int Add(int a, int b); int Mul(int a, int b); }

class SlowCalculator : MarshalByRefObject, ICalculator {
    public int Add(int a, int b) { return a + b; }
    public int Mul(int a, int b) { return a * b; }
}

// One RealProxy can wrap ANY MarshalByRefObject: here, it logs and times every method call
class TimingProxy : RealProxy {
    private readonly MarshalByRefObject target;
    private TimingProxy(MarshalByRefObject target) : base(target.GetType()) { this.target = target; }

    public override IMessage Invoke(IMessage msg) {
        IMethodCallMessage call = (IMethodCallMessage)msg;
        Stopwatch sw = Stopwatch.StartNew();
        try {
            object result = call.MethodBase.Invoke(target, call.Args);
            return new ReturnMessage(result, null, 0, call.LogicalCallContext, call);
        } catch (TargetInvocationException e) {
            return new ReturnMessage(e.InnerException, call);
        } finally {
            Console.WriteLine(call.MethodName + "[" + string.Join(", ", call.Args) + "] took " + sw.Elapsed.Ticks * 100 + " ns");
        }
    }

    public static T Wrap<T>(MarshalByRefObject target) {
        return (T)new TimingProxy(target).GetTransparentProxy();
    }
}

class Program {
    static void Main() {
        ICalculator c = TimingProxy.Wrap<ICalculator>(new SlowCalculator());
        Console.WriteLine(c.Add(2, 3));   // logged + timed, client code unchanged
    }
}` }
      ] }],
    codeTitle: ['Virtual + protection proxy for images', 'Dynamic proxy (Java: java.lang.reflect.Proxy)'],
    viz: {
      title: 'Proxy intercepting each request (lazy load, cache, access check)',
      input: 'img1 img2 img1 !img3 img2 img1',
      inputLabel: 'Requests in order (prefix ! = request from a user without permission)',
      gen: function (input) {
        var reqs = words(input, 'Example: img1 img2 img1 !img3', 10);
        var nodes = [B('C', 'Client', 10, 34), B('S', 'Image', 50, 6), B('P', 'ImageProxy', 45, 40), B('R', 'RealImage', 86, 40)];
        var edges = [['C', 'P', 'display()'], ['P', 'S', 'implements'], ['R', 'S', 'implements'], ['P', 'R', 'load / delegate']];
        var tagsBase = { S: '«interface»', P: 'cheap stand-in', R: 'expensive (disk)' };
        var f = [], loaded = [], loads = 0, hits = 0, denied = 0;
        f.push(F('<b>Structure.</b> Proxy and RealImage both implement <code>Image</code>, so the client holds an <code>Image</code> and never knows which one it got. The proxy creates RealImage <i>only when first needed</i> and checks permission <i>before</i> every call.',
          [G('Proxy class structure', nodes, edges, { tags: tagsBase, hl: { P: 'sel' } }), CODE('ImageProxy.display', PROXY_CODE, {})]));
        f.push(F('<b>Incoming requests</b>, in order. Each one is a plain <code>image.display(user)</code> call from the client. Watch which ones the proxy answers itself, which ones it forwards, and which ones it blocks.',
          [{ type: 'queue', label: 'requests waiting', items: reqs.slice(), hl: { 0: 'cur' }, frontLabel: 'next', backLabel: 'last' }, TXT('<b>!name</b> = request from a user without permission.')]));
        reqs.forEach(function (raw, i) {
          var deny = raw.charAt(0) === '!', name = deny ? raw.slice(1) : raw;
          if (!name) throw new Error('Empty image name after "!"');
          var mapE = loaded.map(function (n) { return [n, 'RealImage (loaded)']; });
          if (deny) {
            denied++;
            f.push(F('Request ' + (i + 1) + ': an unauthorised user asks for <b>' + name + '</b>. The proxy checks the access list <i>first</i> → ' + H.c('r', 'SecurityException') + '. The real object is never touched — not even loaded.',
              [G('Request ' + (i + 1) + ': blocked at the proxy', nodes, edges, { hl: { C: 'cur', P: 'bad' }, ehl: { 'C-P': 'bad' }, tags: tagsBase }), CODE('ImageProxy.display', PROXY_CODE, { 2: 'bad', 3: 'bad' }), { type: 'map', label: 'objects already loaded', entries: mapE.length ? mapE : [['(none)', '-']] }, VARS('counters', { diskLoads: loads, cacheHits: hits, denied: denied }, { denied: 'bad' })]));
            return;
          }
          if (loaded.indexOf(name) >= 0) {
            hits++;
            f.push(F('Request ' + (i + 1) + ': <b>' + name + '</b> again. Permission ok, and the proxy already holds the RealImage → delegate directly. ' + H.c('g', 'No disk read (~800 ms saved).'),
              [G('Request ' + (i + 1) + ': reuse', nodes, edges, { hl: { C: 'cur', P: 'ok', R: 'ok' }, ehl: { 'C-P': 'ok', 'P-R': 'ok' }, tags: tagsBase }), CODE('ImageProxy.display', PROXY_CODE, { 4: 'ok', 6: 'ok' }), { type: 'map', label: 'objects already loaded', entries: mapE, hl: one(name, 'ok') }, VARS('counters', { diskLoads: loads, cacheHits: hits, denied: denied }, { cacheHits: 'ok' })]));
            return;
          }
          f.push(F('Request ' + (i + 1) + ': <b>' + name + '</b>. Permission ok. Intercepted: <code>real == null</code>, so the proxy creates <code>new RealImage("' + name + '")</code> now — the slow disk load happens on first <i>use</i>, not at startup.',
            [G('Request ' + (i + 1) + ': lazy creation', nodes, edges, { hl: { C: 'done', P: 'cur', R: 'cur' }, ehl: { 'C-P': 'cur', 'P-R': 'cur' }, tags: tagsBase }), CODE('ImageProxy.display', PROXY_CODE, { 4: 'cur', 5: 'cur' }), { type: 'map', label: 'objects already loaded', entries: mapE.length ? mapE : [['(none)', '-']] }, VARS('counters', { diskLoads: loads, cacheHits: hits, denied: denied })]));
          loads++; loaded.push(name);
          f.push(F('RealImage for <b>' + name + '</b> is ready and stored inside the proxy. The call is forwarded and the picture is shown.',
            [G('Request ' + (i + 1) + ': forwarded', nodes, edges, { hl: { C: 'ok', P: 'done', R: 'ok' }, ehl: { 'C-P': 'ok', 'P-R': 'ok' }, tags: tagsBase }), CODE('ImageProxy.display', PROXY_CODE, { 6: 'ok' }), { type: 'map', label: 'objects already loaded', entries: loaded.map(function (n) { return [n, 'RealImage (loaded)']; }), hl: one(name, 'ok') }, VARS('counters', { diskLoads: loads, cacheHits: hits, denied: denied }, { diskLoads: 'cur' })]));
        });
        var allowed = reqs.length - denied;
        f.push(F('<b>Summary.</b> ' + reqs.length + ' requests → only <b>' + loads + '</b> disk load(s) instead of ' + allowed + ', and ' + denied + ' blocked request(s) that never reached the real object. The client code was just <code>image.display(user)</code> every time.',
          [{ type: 'bars', label: 'disk loads: no proxy vs proxy', values: [allowed, loads], texts: [String(allowed), String(loads)], idxLabels: ['no proxy', 'with proxy'], hl: { 0: 'bad', 1: 'ok' } }, VARS('final counters', { diskLoads: loads, cacheHits: hits, denied: denied }, { diskLoads: 'sel' })]));
        return f;
      }
    },
    examples: [
      { title: 'Hibernate lazy loading (virtual proxy)', html: `<p><code>order.getCustomer()</code> returns a generated subclass of <code>Customer</code> with only the id filled. The first time you call <code>getName()</code>, the proxy runs a SQL query. Famous bug: calling it after the session is closed throws <code>LazyInitializationException</code>; another famous bug: looping over 100 orders and touching each customer fires 100 queries (the <b>N+1 problem</b>).</p>` },
      { title: 'Spring @Transactional (smart proxy)', html: `<p>Spring hands your controller a proxy of <code>OrderService</code>. The proxy opens a transaction, calls the real method, then commits or rolls back. Classic trap: calling <code>this.otherTransactionalMethod()</code> from inside the same class skips the proxy (you are already "inside"), so no new transaction starts. Rule: proxies only intercept calls that come <i>through</i> them.</p>` },
      { title: 'Remote proxy: an RPC client stub', html: `<p>A gRPC or Feign client gives you <code>UserService.getUser(id)</code>. It looks local, but the proxy serialises the arguments, sends an HTTP/2 request, waits, and deserialises the answer. The danger: it <i>looks</i> cheap. Remote proxies must expose timeouts and failures honestly (checked exceptions or result types), or callers will put them in tight loops.</p>` },
      { title: 'Caching proxy with a TTL', html: `<p><code>RateService</code> calls a paid FX API. <code>CachingRateProxy implements RateService</code> keeps <code>Map&lt;String, Entry(value, fetchedAt)&gt;</code>; if the entry is younger than 60 s, return it; else call through and refresh. Same interface, ~99% fewer paid calls for popular currency pairs.</p>`, code: { lang: 'java', code: `Map<String, Double> cache = new HashMap<>();
Function<String, Double> slowApi = pair -> { System.out.println("API call for " + pair); return 83.2; };
Function<String, Double> proxy = pair -> cache.computeIfAbsent(pair, slowApi);
proxy.apply("USD/INR");
proxy.apply("USD/INR"); // second call served from cache`,
        alt: [
          { lang: 'python', code: `cache: dict[str, float] = {}


def slow_api(pair: str) -> float:
    print(f"API call for {pair}")
    return 83.2


def proxy(pair: str) -> float:
    if pair not in cache:  # only a miss reaches the slow API
        cache[pair] = slow_api(pair)
    return cache[pair]


proxy("USD/INR")
proxy("USD/INR")  # second call served from cache` },
          { lang: 'ts', code: `const cache = new Map<string, number>();
const slowApi = (pair: string): number => {
  console.log(\`API call for \${pair}\`);
  return 83.2;
};
const proxy = (pair: string): number => {
  let value = cache.get(pair);
  if (value === undefined) { // only a miss reaches the slow API
    value = slowApi(pair);
    cache.set(pair, value);
  }
  return value;
};
proxy("USD/INR");
proxy("USD/INR"); // second call served from cache` },
          { lang: 'cpp', code: `int main() {
    unordered_map<string, double> cache;
    auto slowApi = [](const string& pair) { cout << "API call for " << pair << "\\n"; return 83.2; };
    auto proxy = [&](const string& pair) {
        auto it = cache.find(pair);
        if (it == cache.end()) it = cache.emplace(pair, slowApi(pair)).first;   // only a miss reaches the slow API
        return it->second;
    };
    proxy("USD/INR");
    proxy("USD/INR");                           // second call served from cache
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class Program {
    static void Main() {
        Dictionary<string, double> cache = new Dictionary<string, double>();
        Func<string, double> slowApi = pair => { Console.WriteLine("API call for " + pair); return 83.2; };
        Func<string, double> proxy = pair => {
            double v;
            if (!cache.TryGetValue(pair, out v)) { v = slowApi(pair); cache[pair] = v; }
            return v;
        };
        proxy("USD/INR");
        proxy("USD/INR"); // second call served from cache
    }
}` }
        ] } }
    ],
    deepDive: `<p><b>Static vs dynamic proxies.</b> A hand-written proxy class is clear and fast but must implement every method. A dynamic proxy generates one for you; in Java, <code>java.lang.reflect.Proxy</code> works only for <b>interfaces</b>, routes all calls through <code>invoke()</code> (reflection overhead, small but real) and wraps checked exceptions in <code>UndeclaredThrowableException</code> if you are careless. To proxy <b>classes</b>, frameworks generate subclasses with bytecode libraries (ByteBuddy, formerly CGLIB) — which fails on <code>final</code> classes and <code>final</code> methods. That is why Spring/Kotlin need "open" classes and why <code>private</code> or <code>final</code> methods silently bypass <code>@Transactional</code>.</p>
      <p><b>Thread safety of lazy proxies.</b> The simple <code>if (real == null) real = new RealImage()</code> is a race: two threads can load twice. Fix with a lock around the load (double-checked locking on a <code>volatile</code> field in Java, a <code>threading.Lock</code> in Python, <code>std::call_once</code> or a mutex in C++; TypeScript needs nothing for a synchronous load and caches the Promise for an async one), or a holder object, or an atomic get-or-create on a concurrent map (<code>ConcurrentHashMap.computeIfAbsent</code>) for keyed caches — the same lessons as the thread-safe Singleton.</p>
      <p><b>Identity.</b> <code>proxy == real</code> is false; <code>equals</code> on generated proxies goes through the handler; <code>getClass()</code> shows a weird generated name (<code>$Proxy12</code>, <code>Customer$HibernateProxy$x</code>). Never use <code>getClass() ==</code> in <code>equals</code> for entities that may be proxied.</p>
      <p><b>Caching proxy pitfalls:</b> unbounded maps leak memory (use LRU / Caffeine), stale data needs TTL or invalidation, and caching must key on <i>every</i> input that affects the answer (including the user, for per-user data). <b>At system scale</b> the same pattern is a reverse proxy (Nginx), a CDN, a service-mesh sidecar (Envoy) — stand-ins that control access to the real server.</p>`,
    aiEra: `<p><b>What AI changes:</b> the most important proxies in AI products sit between the app and the model: an <b>LLM gateway</b> that checks the API key and budget (protection), serves repeated prompts from a semantic or exact cache (caching), logs every call for evaluation (smart reference), and forwards to whichever provider is up (remote). For tool-using agents, a <b>permission proxy</b> in front of dangerous tools ("delete_file", "send_email") asks a human before forwarding — the protection proxy is now a safety feature.</p>
      <p><b>Use AI as a partner:</b> <code>Generate a dynamic-proxy InvocationHandler that logs method name, args and latency; then list three ways it could break (final methods, self-invocation, checked exceptions).</code> <b>Where AI goes wrong:</b> it writes non-thread-safe lazy initialisation, forgets cache eviction, caches per-user data under a global key, and confuses proxy with decorator in explanations. <b>What you must still own:</b> knowing <i>which</i> kind of control is needed, the failure semantics of remote proxies, and the self-invocation trap.</p>`,
    problems: [{
      title: 'Caching Proxy with Time-To-Live for an Exchange-Rate API',
      level: 'Medium', tags: ['proxy', 'caching', 'ttl'], companies: ['Razorpay', 'Stripe', 'Wise'],
      statement: `<p><code>interface RateService { double rate(String from, String to); }</code> is implemented by <code>RemoteRateService</code>, which costs money and ~300 ms per call. Build a transparent cache in front of it: a repeated (from, to) pair within <b>ttlMillis</b> must be served without calling the remote service. Callers keep using <code>RateService</code>. Time must be injectable for tests.</p>`,
      constraints: `<p>ttlMillis ≥ 1. Pairs are case-insensitive ("usd","INR" = "USD","INR"). Thread-safe for concurrent readers. Remote failures must not be cached.</p>`,
      example: `<p>ttl = 60 000 ms. t=0 <code>rate(USD,INR)</code> → ${H.c('r', 'remote call')} → 83.2. t=10 s → ${H.c('g', 'cache hit')} 83.2. t=70 s → entry expired → ${H.c('r', 'remote call')} again. Remote calls: 2 instead of 3.</p>`,
      brute: { why: `<p>Naive approach 1: call the remote API every time — slow and expensive. Naive approach 2: put a shared static map (<code>HashMap</code> / <code>dict</code> / <code>Map</code> / <code>unordered_map</code>) inside <code>RemoteRateService</code> itself — now the "talk to API" class also does caching (two responsibilities), the cache never expires, it is not thread-safe, and tests cannot control time.</p>`, code: { lang: 'java', code: `class RemoteRateService {
    static final Map<String, Double> CACHE = new HashMap<>();   // never expires, not thread-safe
    double rate(String from, String to) {
        return CACHE.computeIfAbsent(from + to, k -> {
            System.out.println("paid API call " + k);
            return 83.2;
        });
    }
}`, alt: [
                { lang: 'python', code: `
class RemoteRateService:
    CACHE = {}   # never expires, not thread-safe
    def rate(self, frm, to):
        k = frm + to
        if k not in RemoteRateService.CACHE:
            print("paid API call " + k)
            RemoteRateService.CACHE[k] = 83.2
        return RemoteRateService.CACHE[k]` },
                { lang: 'ts', code: `
class RemoteRateService {
    static readonly CACHE = new Map<string, number>();   // never expires, shared by every caller
    rate(from: string, to: string): number {
        const k = from + to;
        if (!RemoteRateService.CACHE.has(k)) {
            console.log("paid API call " + k);
            RemoteRateService.CACHE.set(k, 83.2);
        }
        return RemoteRateService.CACHE.get(k)!;
    }
}` },
                { lang: 'cpp', code: `
class RemoteRateService {
    static inline unordered_map<string, double> CACHE;   // never expires, not thread-safe
public:
    double rate(const string& from, const string& to) {
        string k = from + to;
        if (!CACHE.count(k)) {
            cout << "paid API call " << k << "\\n";
            CACHE[k] = 83.2;
        }
        return CACHE[k];
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class RemoteRateService {
    static readonly Dictionary<string, double> Cache = new Dictionary<string, double>();   // never expires, not thread-safe
    public double Rate(string from, string to) {
        double v;
        if (!Cache.TryGetValue(from + to, out v)) {
            Console.WriteLine("paid API call " + from + to);
            v = 83.2;
            Cache[from + to] = v;
        }
        return v;
    }
}` }
              ] } },
      mcq: { q: 'Why inject a clock function (a LongSupplier in Java, a callable, a lambda) instead of calling the system clock inside the proxy?', options: ['It is faster', 'Tests can move time forward to check expiry without sleeping', 'System.currentTimeMillis() is deprecated', 'The proxy pattern requires it'], answer: 1, explain: 'A fake clock lets a unit test jump 61 seconds instantly and assert the remote service is called again.' },
      hints: [`<p>Hint 1: Same interface, holds the real service, decides whether to forward — that is a caching proxy.</p>`, `<p>Hint 2: Store an immutable entry <code>(value, fetchedAt)</code> in a thread-safe map keyed by the normalised pair (<code>ConcurrentHashMap</code> / <code>dict</code> + lock / <code>Map</code> / <code>unordered_map</code> + mutex).</p>`, `<p>Hint 3: On each call: read entry; if present and <code>now - fetchedAt &lt; ttl</code> return it; otherwise call remote (exceptions propagate, nothing stored) and put a fresh entry.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "83.2\n83.2\n83.2\nremote calls = 2\nrate failed: unknown currency XXX\nrate failed: unknown currency XXX\nremote calls = 4\n" }] },
      solution: {
        approach: `<p><code>CachingRateProxy implements RateService</code>, takes the real service, a TTL and a <code>LongSupplier</code> clock. Keys are upper-cased "FROM/TO". A hit within TTL returns the stored value; a miss or expired entry calls the real service and stores the result. Because <code>put</code> happens only after a successful call, failures are never cached. A thread-safe map (<code>ConcurrentHashMap</code>, or a <code>dict</code> or <code>unordered_map</code> behind a lock) makes concurrent reads safe (two threads may both refresh an expired key at the same moment — acceptable here; use <code>compute</code> if you need exactly-once refresh).</p>`,
        code: `interface RateService { double rate(String from, String to); }

class RemoteRateService implements RateService {
    int calls = 0;
    public double rate(String from, String to) {
        calls++;
        if (from.equals("XXX")) throw new IllegalArgumentException("unknown currency XXX");
        return from.equals("USD") && to.equals("INR") ? 83.2 : 1.0;
    }
}

class CachingRateProxy implements RateService {
    private record Entry(double value, long fetchedAt) {}

    private final RateService real;
    private final long ttlMillis;
    private final java.util.function.LongSupplier clock;
    private final Map<String, Entry> cache = new ConcurrentHashMap<>();

    CachingRateProxy(RateService real, long ttlMillis, java.util.function.LongSupplier clock) {
        if (ttlMillis < 1) throw new IllegalArgumentException("ttl >= 1");
        this.real = real; this.ttlMillis = ttlMillis; this.clock = clock;
    }

    @Override
    public double rate(String from, String to) {
        String f = from.toUpperCase(Locale.ROOT), t = to.toUpperCase(Locale.ROOT);
        String key = f + "/" + t;
        long now = clock.getAsLong();
        Entry e = cache.get(key);
        if (e != null && now - e.fetchedAt() < ttlMillis) return e.value();   // fresh hit
        double v = real.rate(f, t);              // throws -> nothing cached
        cache.put(key, new Entry(v, now));
        return v;
    }
}

class RateDemo {
    public static void main(String[] args) {
        long[] now = {0};
        RemoteRateService remote = new RemoteRateService();
        RateService rates = new CachingRateProxy(remote, 60_000, () -> now[0]);
        System.out.println(String.format("%.1f", rates.rate("usd", "inr")));                      // 83.2, remote
        now[0] = 10_000;  System.out.println(String.format("%.1f", rates.rate("USD", "INR")));   // hit
        now[0] = 70_000;  System.out.println(String.format("%.1f", rates.rate("USD", "INR")));   // expired -> remote
        System.out.println("remote calls = " + remote.calls);   // 2
        for (int i = 0; i < 2; i++) {                            // a failure is never cached
            try { rates.rate("XXX", "INR"); }
            catch (IllegalArgumentException e) { System.out.println("rate failed: " + e.getMessage()); }
        }
        System.out.println("remote calls = " + remote.calls);   // 4: both failures reached the remote
    }
}`,
        alt: [
          { lang: 'python', code: `import threading
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Callable


class RateService(ABC):
    @abstractmethod
    def rate(self, from_ccy: str, to_ccy: str) -> float: ...


class RemoteRateService(RateService):
    def __init__(self) -> None:
        self.calls = 0

    def rate(self, from_ccy: str, to_ccy: str) -> float:
        self.calls += 1
        if from_ccy == "XXX":
            raise ValueError("unknown currency XXX")
        return 83.2 if (from_ccy, to_ccy) == ("USD", "INR") else 1.0


@dataclass(frozen=True)
class _Entry:
    value: float
    fetched_at: int


class CachingRateProxy(RateService):
    def __init__(self, real: RateService, ttl_millis: int, clock: Callable[[], int]) -> None:
        if ttl_millis < 1:
            raise ValueError("ttl >= 1")
        self._real = real
        self._ttl_millis = ttl_millis
        self._clock = clock
        self._cache: dict[str, _Entry] = {}
        self._lock = threading.Lock()  # guards the dict only, never the slow remote call

    def rate(self, from_ccy: str, to_ccy: str) -> float:
        f, t = from_ccy.upper(), to_ccy.upper()
        key = f"{f}/{t}"
        now = self._clock()
        with self._lock:
            e = self._cache.get(key)
        if e is not None and now - e.fetched_at < self._ttl_millis:
            return e.value  # fresh hit
        v = self._real.rate(f, t)  # raises -> nothing cached
        with self._lock:
            self._cache[key] = _Entry(v, now)
        return v


if __name__ == "__main__":
    now = 0
    remote = RemoteRateService()
    rates = CachingRateProxy(remote, 60_000, lambda: now)
    print(f"{rates.rate('usd', 'inr'):.1f}")  # 83.2, remote
    now = 10_000
    print(f"{rates.rate('USD', 'INR'):.1f}")  # hit
    now = 70_000
    print(f"{rates.rate('USD', 'INR'):.1f}")  # expired -> remote
    print(f"remote calls = {remote.calls}")  # 2
    for _ in range(2):  # a failure is never cached
        try:
            rates.rate("XXX", "INR")
        except ValueError as e:
            print(f"rate failed: {e}")
    print(f"remote calls = {remote.calls}")  # 4: both failures reached the remote` },
          { lang: 'ts', code: `interface RateService {
  rate(from: string, to: string): number;
}

class RemoteRateService implements RateService {
  calls = 0;

  rate(from: string, to: string): number {
    this.calls++;
    if (from === "XXX") throw new Error("unknown currency XXX");
    return from === "USD" && to === "INR" ? 83.2 : 1.0;
  }
}

interface Entry {
  readonly value: number;
  readonly fetchedAt: number;
}

class CachingRateProxy implements RateService {
  private readonly cache = new Map<string, Entry>(); // JS runs one thread, so no lock is needed

  constructor(
    private readonly real: RateService,
    private readonly ttlMillis: number,
    private readonly clock: () => number,
  ) {
    if (ttlMillis < 1) throw new Error("ttl >= 1");
  }

  rate(from: string, to: string): number {
    const f = from.toUpperCase();
    const t = to.toUpperCase();
    const key = \`\${f}/\${t}\`;
    const now = this.clock();
    const e = this.cache.get(key);
    if (e !== undefined && now - e.fetchedAt < this.ttlMillis) return e.value; // fresh hit
    const v = this.real.rate(f, t); // throws -> nothing cached
    this.cache.set(key, { value: v, fetchedAt: now });
    return v;
  }
}

let now = 0;
const remote = new RemoteRateService();
const rates: RateService = new CachingRateProxy(remote, 60_000, () => now);
console.log(rates.rate("usd", "inr").toFixed(1)); // 83.2, remote
now = 10_000;
console.log(rates.rate("USD", "INR").toFixed(1)); // hit
now = 70_000;
console.log(rates.rate("USD", "INR").toFixed(1)); // expired -> remote
console.log(\`remote calls = \${remote.calls}\`); // 2
for (let i = 0; i < 2; i++) { // a failure is never cached
  try {
    rates.rate("XXX", "INR");
  } catch (e) {
    console.log(\`rate failed: \${(e as Error).message}\`);
  }
}
console.log(\`remote calls = \${remote.calls}\`); // 4: both failures reached the remote` },
          { lang: 'cpp', code: `class RateService {
public:
    virtual ~RateService() = default;
    virtual double rate(const string& from, const string& to) = 0;
};

class RemoteRateService : public RateService {
public:
    int calls = 0;
    double rate(const string& from, const string& to) override {
        calls++;
        if (from == "XXX") throw invalid_argument("unknown currency XXX");
        return from == "USD" && to == "INR" ? 83.2 : 1.0;
    }
};

class CachingRateProxy : public RateService {
    struct Entry { double value; long long fetchedAt; };

    RateService& real_;
    long long ttlMillis_;
    function<long long()> clock_;
    unordered_map<string, Entry> cache_;
    mutex mu_;                                   // guards the map only, never the slow remote call

    static string upper(string s) {
        for (char& c : s) c = static_cast<char>(toupper(static_cast<unsigned char>(c)));
        return s;
    }
public:
    CachingRateProxy(RateService& real, long long ttlMillis, function<long long()> clock)
        : real_(real), ttlMillis_(ttlMillis), clock_(std::move(clock)) {
        if (ttlMillis < 1) throw invalid_argument("ttl >= 1");
    }

    double rate(const string& from, const string& to) override {
        string f = upper(from), t = upper(to);
        string key = f + "/" + t;
        long long now = clock_();
        {
            lock_guard<mutex> lock(mu_);
            auto it = cache_.find(key);
            if (it != cache_.end() && now - it->second.fetchedAt < ttlMillis_) return it->second.value;   // fresh hit
        }
        double v = real_.rate(f, t);             // throws -> nothing cached
        lock_guard<mutex> lock(mu_);
        cache_[key] = Entry{v, now};
        return v;
    }
};

string fixed1(double v) {
    ostringstream out;
    out << fixed << setprecision(1) << v;
    return out.str();
}

int main() {
    long long now = 0;
    RemoteRateService remote;
    CachingRateProxy rates(remote, 60'000, [&now] { return now; });
    cout << fixed1(rates.rate("usd", "inr")) << "\\n";    // 83.2, remote
    now = 10'000;
    cout << fixed1(rates.rate("USD", "INR")) << "\\n";    // hit
    now = 70'000;
    cout << fixed1(rates.rate("USD", "INR")) << "\\n";    // expired -> remote
    cout << "remote calls = " << remote.calls << "\\n";   // 2
    for (int i = 0; i < 2; i++) {                        // a failure is never cached
        try {
            rates.rate("XXX", "INR");
        } catch (const invalid_argument& e) {
            cout << "rate failed: " << e.what() << "\\n";
        }
    }
    cout << "remote calls = " << remote.calls << "\\n";   // 4: both failures reached the remote
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Concurrent;

interface IRateService { double Rate(string from, string to); }

class RemoteRateService : IRateService {
    public int Calls = 0;
    public double Rate(string from, string to) {
        Calls++;
        if (from == "XXX") throw new ArgumentException("unknown currency XXX");
        return from == "USD" && to == "INR" ? 83.2 : 1.0;
    }
}

class CachingRateProxy : IRateService {
    private sealed class Entry {
        public readonly double Value; public readonly long FetchedAt;
        public Entry(double value, long fetchedAt) { Value = value; FetchedAt = fetchedAt; }
    }

    private readonly IRateService real;
    private readonly long ttlMillis;
    private readonly Func<long> clock;
    private readonly ConcurrentDictionary<string, Entry> cache = new ConcurrentDictionary<string, Entry>();

    public CachingRateProxy(IRateService real, long ttlMillis, Func<long> clock) {
        if (ttlMillis < 1) throw new ArgumentException("ttl >= 1");
        this.real = real; this.ttlMillis = ttlMillis; this.clock = clock;
    }

    public double Rate(string from, string to) {
        string f = from.ToUpperInvariant(), t = to.ToUpperInvariant();
        string key = f + "/" + t;
        long now = clock();
        Entry e;
        if (cache.TryGetValue(key, out e) && now - e.FetchedAt < ttlMillis) return e.Value;   // fresh hit
        double v = real.Rate(f, t);              // throws -> nothing cached
        cache[key] = new Entry(v, now);
        return v;
    }
}

class Program {
    static void Main() {
        long now = 0;
        RemoteRateService remote = new RemoteRateService();
        IRateService rates = new CachingRateProxy(remote, 60000, () => now);
        Console.WriteLine(rates.Rate("usd", "inr").ToString("F1"));                   // 83.2, remote
        now = 10000;  Console.WriteLine(rates.Rate("USD", "INR").ToString("F1"));     // hit
        now = 70000;  Console.WriteLine(rates.Rate("USD", "INR").ToString("F1"));     // expired -> remote
        Console.WriteLine("remote calls = " + remote.Calls);   // 2
        for (int i = 0; i < 2; i++) {                          // a failure is never cached
            try { rates.Rate("XXX", "INR"); }
            catch (ArgumentException e) { Console.WriteLine("rate failed: " + e.Message); }
        }
        Console.WriteLine("remote calls = " + remote.Calls);   // 4: both failures reached the remote
    }
}` }
        ],
        complexity: `<p>O(1) average per call. Memory O(distinct pairs) — bounded in practice (~180 currencies), otherwise add LRU eviction.</p>`,
        followUps: ['Prevent a "thundering herd" when a hot key expires and 1 000 threads miss at once.', 'Serve the stale value while refreshing in the background (stale-while-revalidate).', 'How would you add per-user rate limiting as another proxy in the chain?']
      }
    }]
  });
  /* =====================================================================
     TOPIC 5 — COMPOSITE
     ===================================================================== */
  var COMP_CODE = 'long size() {                // in Folder (composite)\n' +
    '  long total = 0;\n' +
    '  for (Node child : children)\n' +
    '    total += child.size();     // same call for file OR folder\n' +
    '  return total;\n' +
    '}\n' +
    'long size() { return bytes; } // in File (leaf)';

  topics.push({
    title: 'Composite — Treat One and Many the Same',
    analogy: `<p>Think of an army. A general gives one order: "March!" to a <b>division</b>. The division passes it to its <b>brigades</b>, brigades to <b>platoons</b>, platoons to <b>soldiers</b>. The general does not care whether the thing he is talking to is one soldier or ten thousand — he uses the same command.</p>
      <p>Your computer's folders work the same way: "what is the size of this?" works on a single file <i>and</i> on a folder, which simply asks each thing inside it the same question and adds the answers.</p>`,
    explain: `<p><b>The problem.</b> Data that naturally forms a <b>tree</b>: folders containing files and folders, menus containing items and sub-menus, a cart containing products and bundles, an org chart. Without a pattern, every operation becomes: "if it is a file do X, else if it is a folder loop over children and for each one check again…" — <code>instanceof</code> checks everywhere.</p>
      <p><b>The fix.</b> Give leaves and containers the <b>same interface</b>. A container (the <b>composite</b>) holds a list of that interface and implements each operation by delegating to its children and combining the answers. The client calls <code>root.size()</code> and recursion does the rest.</p>
      ${H.table(['Role', 'Example', 'size() does'], [['<b>Component</b> (interface)', '<code>Node</code>', 'declares size(), print()'], ['<b>Leaf</b>', '<code>File</code>', 'returns its own bytes'], ['<b>Composite</b>', '<code>Folder</code>', 'sum of children\'s size()']])}
      <p><b>Worked example.</b> ${H.kv([['root/', 'docs/ + src/'], ['docs/', 'a.txt (5) + b.pdf (20) = 25'], ['src/', 'Main.java (8) + lib/ (3 + 4) = 15'], ['root total', '25 + 15 = 40']], { hl: { 'root total': 'g' } })}</p>
      <p><b>Two design choices</b> interviewers love: (1) <b>Transparent</b> — put <code>add/remove</code> on the Component interface so clients never need to check types (but then <code>file.add()</code> must throw). (2) <b>Safe</b> — put <code>add/remove</code> only on Composite, so leaves cannot be misused (but clients need to know what they hold to add children). Modern code usually picks <b>safe</b>, often with a closed set of node types (a Java <code>sealed interface Node permits File, Folder</code>, a TypeScript union, a C++ <code>std::variant</code>).</p>
      <p><b>In the wild:</b> ${H.chips(['Swing/AWT: Container is a Component', 'Android ViewGroup / View', 'HTML DOM elements', 'JSON objects/arrays (Jackson JsonNode)', 'AST nodes in compilers', 'org charts, BOMs (bill of materials)'])}</p>`,
    clues: ['"<b>part-whole hierarchy</b>" / "tree structure" / "nested" / "contains items and groups of items"', '"treat individual objects and groups <b>uniformly</b>"', '"folders and files", "menus and sub-menus", "bundles of products", "teams of teams", "nested comments"', '"compute a total / render / search over the whole hierarchy" with one call', '"the depth of nesting is arbitrary / unknown"', 'you find yourself writing <code>if (x instanceof Group)</code> in many places'],
    code: [{ lang: 'java', title: 'File system: Folder (composite) and File (leaf)', code: `
// Component — sealed so the compiler knows every kind of node
sealed interface Node permits FileNode, Folder {
    String name();
    long size();
    void print(String indent);
}

// Leaf
record FileNode(String name, long size) implements Node {
    public void print(String indent) { System.out.println(indent + name + " (" + size + ")"); }
}

// Composite — holds children of the COMPONENT type (files or folders)
final class Folder implements Node {
    private final String name;
    private final List<Node> children = new ArrayList<>();

    Folder(String name) { this.name = name; }

    Folder add(Node child) { children.add(child); return this; }   // "safe" style: only on Folder
    public String name() { return name; }

    public long size() {
        long total = 0;
        for (Node child : children) total += child.size();   // recursion via polymorphism
        return total;
    }

    public void print(String indent) {
        System.out.println(indent + name + "/ (" + size() + ")");
        for (Node child : children) child.print(indent + "  ");
    }
}

class Explorer {
    public static void main(String[] args) {
        Folder root = new Folder("root")
            .add(new Folder("docs").add(new FileNode("a.txt", 5)).add(new FileNode("b.pdf", 20)))
            .add(new Folder("src").add(new FileNode("Main.java", 8))
                                  .add(new Folder("lib").add(new FileNode("x.jar", 3)).add(new FileNode("y.jar", 4))));
        root.print("");
        System.out.println("total = " + root.size());   // 40 — client never checks types
    }
}`,
      alt: [
        { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass


# Component — Python has no sealed types, so an abstract base class names every kind of node
class Node(ABC):
    @abstractmethod
    def name(self) -> str: ...

    @abstractmethod
    def size(self) -> int: ...

    @abstractmethod
    def print(self, indent: str) -> None: ...


# Leaf
@dataclass(frozen=True)
class FileNode(Node):
    _name: str
    _size: int

    def name(self) -> str:
        return self._name

    def size(self) -> int:
        return self._size

    def print(self, indent: str) -> None:
        print(f"{indent}{self._name} ({self._size})")


# Composite — holds children of the COMPONENT type (files or folders)
class Folder(Node):
    def __init__(self, name: str) -> None:
        self._name = name
        self._children: list[Node] = []

    def add(self, child: Node) -> "Folder":  # "safe" style: only on Folder
        self._children.append(child)
        return self

    def name(self) -> str:
        return self._name

    def size(self) -> int:
        return sum(child.size() for child in self._children)  # recursion via polymorphism

    def print(self, indent: str) -> None:
        print(f"{indent}{self._name}/ ({self.size()})")
        for child in self._children:
            child.print(indent + "  ")


if __name__ == "__main__":
    root = (
        Folder("root")
        .add(Folder("docs").add(FileNode("a.txt", 5)).add(FileNode("b.pdf", 20)))
        .add(
            Folder("src")
            .add(FileNode("Main.java", 8))
            .add(Folder("lib").add(FileNode("x.jar", 3)).add(FileNode("y.jar", 4)))
        )
    )
    root.print("")
    print(f"total = {root.size()}")  # 40 — client never checks types` },
        { lang: 'ts', code: `export {}; // makes this file a module, so our Node never merges with the DOM's Node type

// Component — every kind of node implements this interface
interface Node {
  name(): string;
  size(): number;
  print(indent: string): void;
}

// Leaf
class FileNode implements Node {
  constructor(private readonly fileName: string, private readonly bytes: number) {}
  name(): string { return this.fileName; }
  size(): number { return this.bytes; }
  print(indent: string): void { console.log(\`\${indent}\${this.fileName} (\${this.bytes})\`); }
}

// Composite — holds children of the COMPONENT type (files or folders)
class Folder implements Node {
  private readonly children: Node[] = [];

  constructor(private readonly folderName: string) {}

  add(child: Node): this { // "safe" style: only on Folder
    this.children.push(child);
    return this;
  }

  name(): string { return this.folderName; }

  size(): number {
    return this.children.reduce((total, child) => total + child.size(), 0); // recursion via polymorphism
  }

  print(indent: string): void {
    console.log(\`\${indent}\${this.folderName}/ (\${this.size()})\`);
    for (const child of this.children) child.print(indent + "  ");
  }
}

const root = new Folder("root")
  .add(new Folder("docs").add(new FileNode("a.txt", 5)).add(new FileNode("b.pdf", 20)))
  .add(new Folder("src").add(new FileNode("Main.java", 8))
    .add(new Folder("lib").add(new FileNode("x.jar", 3)).add(new FileNode("y.jar", 4))));
root.print("");
console.log(\`total = \${root.size()}\`); // 40 — client never checks types` },
        { lang: 'cpp', code: `// Component — every kind of node implements this interface
class Node {
public:
    virtual ~Node() = default;
    virtual string name() const = 0;
    virtual long long size() const = 0;
    virtual void print(const string& indent) const = 0;
};

// Leaf
class FileNode final : public Node {
    string name_;
    long long size_;
public:
    FileNode(string name, long long size) : name_(std::move(name)), size_(size) {}
    string name() const override { return name_; }
    long long size() const override { return size_; }
    void print(const string& indent) const override { cout << indent << name_ << " (" << size_ << ")\\n"; }
};

// Composite — owns children of the COMPONENT type (files or folders)
class Folder final : public Node {
    string name_;
    vector<unique_ptr<Node>> children_;
public:
    explicit Folder(string name) : name_(std::move(name)) {}

    Folder& add(unique_ptr<Node> child) {       // "safe" style: only on Folder
        children_.push_back(std::move(child));
        return *this;
    }
    string name() const override { return name_; }

    long long size() const override {
        long long total = 0;
        for (const auto& child : children_) total += child->size();   // recursion via polymorphism
        return total;
    }

    void print(const string& indent) const override {
        cout << indent << name_ << "/ (" << size() << ")\\n";
        for (const auto& child : children_) child->print(indent + "  ");
    }
};

int main() {
    auto docs = make_unique<Folder>("docs");
    docs->add(make_unique<FileNode>("a.txt", 5)).add(make_unique<FileNode>("b.pdf", 20));
    auto lib = make_unique<Folder>("lib");
    lib->add(make_unique<FileNode>("x.jar", 3)).add(make_unique<FileNode>("y.jar", 4));
    auto src = make_unique<Folder>("src");
    src->add(make_unique<FileNode>("Main.java", 8)).add(std::move(lib));
    Folder root("root");
    root.add(std::move(docs)).add(std::move(src));
    root.print("");
    cout << "total = " << root.size() << "\\n";   // 40 — client never checks types
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

// Component — every kind of node answers these
interface INode {
    string Name { get; }
    long Size();
    void Print(string indent);
}

// Leaf
sealed class FileNode : INode {
    private readonly string name; private readonly long size;
    public FileNode(string name, long size) { this.name = name; this.size = size; }
    public string Name { get { return name; } }
    public long Size() { return size; }
    public void Print(string indent) { Console.WriteLine(indent + name + " (" + size + ")"); }
}

// Composite — holds children of the COMPONENT type (files or folders)
sealed class Folder : INode {
    private readonly string name;
    private readonly List<INode> children = new List<INode>();

    public Folder(string name) { this.name = name; }

    public Folder Add(INode child) { children.Add(child); return this; }   // "safe" style: only on Folder
    public string Name { get { return name; } }

    public long Size() {
        long total = 0;
        foreach (INode child in children) total += child.Size();   // recursion via polymorphism
        return total;
    }

    public void Print(string indent) {
        Console.WriteLine(indent + name + "/ (" + Size() + ")");
        foreach (INode child in children) child.Print(indent + "  ");
    }
}

class Program {
    static void Main() {
        Folder root = new Folder("root")
            .Add(new Folder("docs").Add(new FileNode("a.txt", 5)).Add(new FileNode("b.pdf", 20)))
            .Add(new Folder("src").Add(new FileNode("Main.cs", 8))
                                  .Add(new Folder("lib").Add(new FileNode("x.dll", 3)).Add(new FileNode("y.dll", 4))));
        root.Print("");
        Console.WriteLine("total = " + root.Size());   // 40 — client never checks types
    }
}` }
      ] },
    { lang: 'java', title: 'Expression tree — composites can be operators', code: `
// Composite + interpretation: an arithmetic expression tree
interface Expr { double eval(); String show(); }

record Num(double v) implements Expr {
    public double eval() { return v; }
    public String show() { return String.valueOf(v); }
}

// a composite with ANY number of operands
record Sum(List<Expr> parts) implements Expr {
    public double eval() { return parts.stream().mapToDouble(Expr::eval).sum(); }
    public String show() { return parts.stream().map(Expr::show).collect(Collectors.joining(" + ", "(", ")")); }
}

record Product(List<Expr> parts) implements Expr {
    public double eval() { return parts.stream().mapToDouble(Expr::eval).reduce(1, (a, b) -> a * b); }
    public String show() { return parts.stream().map(Expr::show).collect(Collectors.joining(" * ", "(", ")")); }
}

class ExprDemo {
    public static void main(String[] args) {
        Expr e = new Product(List.of(new Num(2), new Sum(List.of(new Num(3), new Num(4), new Num(5)))));
        System.out.println(e.show() + " = " + e.eval());   // (2.0 * (3.0 + 4.0 + 5.0)) = 24.0
    }
}`,
      alt: [
        { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass
from math import prod


# Composite + interpretation: an arithmetic expression tree
class Expr(ABC):
    @abstractmethod
    def eval(self) -> float: ...

    @abstractmethod
    def show(self) -> str: ...


@dataclass(frozen=True)
class Num(Expr):
    v: float

    def eval(self) -> float:
        return self.v

    def show(self) -> str:
        return str(float(self.v))


# a composite with ANY number of operands
@dataclass(frozen=True)
class Sum(Expr):
    parts: tuple[Expr, ...]

    def eval(self) -> float:
        return sum(p.eval() for p in self.parts)

    def show(self) -> str:
        return "(" + " + ".join(p.show() for p in self.parts) + ")"


@dataclass(frozen=True)
class Product(Expr):
    parts: tuple[Expr, ...]

    def eval(self) -> float:
        return prod(p.eval() for p in self.parts)

    def show(self) -> str:
        return "(" + " * ".join(p.show() for p in self.parts) + ")"


if __name__ == "__main__":
    e = Product((Num(2), Sum((Num(3), Num(4), Num(5)))))
    print(f"{e.show()} = {float(e.eval())}")  # (2.0 * (3.0 + 4.0 + 5.0)) = 24.0` },
        { lang: 'ts', code: `// Composite + interpretation: an arithmetic expression tree
interface Expr {
  eval(): number;
  show(): string;
}

const fmt = (v: number): string => (Number.isInteger(v) ? v.toFixed(1) : String(v)); // 2 -> "2.0" like Java

class Num implements Expr {
  constructor(private readonly v: number) {}
  eval(): number { return this.v; }
  show(): string { return fmt(this.v); }
}

// a composite with ANY number of operands
class Sum implements Expr {
  constructor(private readonly parts: readonly Expr[]) {}
  eval(): number { return this.parts.reduce((acc, p) => acc + p.eval(), 0); }
  show(): string { return "(" + this.parts.map((p) => p.show()).join(" + ") + ")"; }
}

class Product implements Expr {
  constructor(private readonly parts: readonly Expr[]) {}
  eval(): number { return this.parts.reduce((acc, p) => acc * p.eval(), 1); }
  show(): string { return "(" + this.parts.map((p) => p.show()).join(" * ") + ")"; }
}

const e: Expr = new Product([new Num(2), new Sum([new Num(3), new Num(4), new Num(5)])]);
console.log(\`\${e.show()} = \${fmt(e.eval())}\`); // (2.0 * (3.0 + 4.0 + 5.0)) = 24.0` },
        { lang: 'cpp', code: `// Composite + interpretation: an arithmetic expression tree
class Expr {
public:
    virtual ~Expr() = default;
    virtual double eval() const = 0;
    virtual string show() const = 0;
};

string fmt(double v) {                                   // 2 -> "2.0" like Java
    ostringstream out;
    if (v == floor(v)) out << fixed << setprecision(1);
    out << v;
    return out.str();
}

class Num final : public Expr {
    double v_;
public:
    explicit Num(double v) : v_(v) {}
    double eval() const override { return v_; }
    string show() const override { return fmt(v_); }
};

// a composite with ANY number of operands: it owns them
class NaryOp : public Expr {
protected:
    vector<unique_ptr<Expr>> parts_;
    explicit NaryOp(vector<unique_ptr<Expr>> parts) : parts_(std::move(parts)) {}
    string join(const char* op) const {
        string out = "(";
        for (size_t i = 0; i < parts_.size(); i++) out += (i ? string(" ") + op + " " : "") + parts_[i]->show();
        return out + ")";
    }
};

class Sum final : public NaryOp {
public:
    explicit Sum(vector<unique_ptr<Expr>> parts) : NaryOp(std::move(parts)) {}
    double eval() const override {
        double total = 0;
        for (const auto& p : parts_) total += p->eval();
        return total;
    }
    string show() const override { return join("+"); }
};

class Product final : public NaryOp {
public:
    explicit Product(vector<unique_ptr<Expr>> parts) : NaryOp(std::move(parts)) {}
    double eval() const override {
        double total = 1;
        for (const auto& p : parts_) total *= p->eval();
        return total;
    }
    string show() const override { return join("*"); }
};

template <class T, class... Args>
unique_ptr<Expr> node(Args&&... args) { return make_unique<T>(std::forward<Args>(args)...); }

template <class... E>
vector<unique_ptr<Expr>> operands(unique_ptr<E>... items) {
    vector<unique_ptr<Expr>> v;
    (v.push_back(std::move(items)), ...);
    return v;
}

int main() {
    auto e = node<Product>(operands(node<Num>(2), node<Sum>(operands(node<Num>(3), node<Num>(4), node<Num>(5)))));
    cout << e->show() << " = " << fmt(e->eval()) << "\\n";   // (2.0 * (3.0 + 4.0 + 5.0)) = 24.0
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

// Composite + interpretation: an arithmetic expression tree
interface IExpr { double Eval(); string Show(); }

sealed class Num : IExpr {
    private readonly double v; public Num(double v) { this.v = v; }
    public double Eval() { return v; }
    public string Show() { return v.ToString("0.0"); }
}

// a composite with ANY number of operands
sealed class Sum : IExpr {
    private readonly List<IExpr> parts; public Sum(params IExpr[] parts) { this.parts = new List<IExpr>(parts); }
    public double Eval() { return parts.Sum(p => p.Eval()); }
    public string Show() { return "(" + string.Join(" + ", parts.Select(p => p.Show())) + ")"; }
}

sealed class Product : IExpr {
    private readonly List<IExpr> parts; public Product(params IExpr[] parts) { this.parts = new List<IExpr>(parts); }
    public double Eval() { return parts.Aggregate(1.0, (a, p) => a * p.Eval()); }
    public string Show() { return "(" + string.Join(" * ", parts.Select(p => p.Show())) + ")"; }
}

class Program {
    static void Main() {
        IExpr e = new Product(new Num(2), new Sum(new Num(3), new Num(4), new Num(5)));
        Console.WriteLine(e.Show() + " = " + e.Eval().ToString("0.0"));   // (2.0 * (3.0 + 4.0 + 5.0)) = 24.0
    }
}` }
      ] }],
    codeTitle: ['File system: Folder (composite) and File (leaf)', 'Expression tree — composites can be operators'],
    viz: {
      title: 'size() travelling down a folder tree and adding up on the way back',
      input: 'D D D 5 20 8 D - - - - - - 3 4',
      inputLabel: 'Level-order tree: D = folder, number = file size in KB, - = empty slot (max 15, binary-shaped for display)',
      gen: function (input) {
        var t = words(input, 'Example: D D D 5 20 8 D - - - - - - 3 4', 15).map(function (s) { return s.toUpperCase(); });
        t.forEach(function (s, i) {
          if (s !== 'D' && s !== '-' && !/^\d+$/.test(s)) throw new Error('Token "' + s + '" must be D, - or a whole number');
          if (i > 0 && s !== '-' && t[(i - 1) >> 1] !== 'D') throw new Error('Node at position ' + (i + 1) + ' has a parent that is not a folder (D)');
        });
        if (t[0] === '-') throw new Error('The root cannot be empty');
        var arr = t.map(function (s) { return s === '-' ? null : (s === 'D' ? 'dir' : s + 'KB'); });
        while (arr.length && arr[arr.length - 1] === null) arr.pop();
        var f = [], tags = {}, stack = [], hl = {}, visits = 0;
        function label(i) { return t[i] === 'D' ? 'folder#' + i : 'file#' + i; }
        function snap(narr, extraParts, ehl) {
          f.push(F(narr, [{ type: 'tree', label: 'the hierarchy (client only holds the root)', arr: arr, hl: JSON.parse(JSON.stringify(hl)), ehl: ehl || {}, tags: JSON.parse(JSON.stringify(tags)) }, { type: 'stack', label: 'recursion (call stack)', items: stack.length ? stack.slice() : ['(empty)'], hl: stack.length ? one(stack.length - 1, 'cur') : {} }].concat(extraParts || [])));
        }
        snap('Client code is just <code>root.size()</code>. It does not know (or care) that root is a folder with nested folders inside. Folders are <b>composites</b>, files are <b>leaves</b>; both answer <code>size()</code>.', [CODE('size()', COMP_CODE, {})]);
        function size(i) {
          visits++;
          stack.push(label(i) + '.size()');
          hl[i] = 'cur';
          if (t[i] !== 'D') {
            var v = Number(t[i]);
            tags[i] = '=' + v;
            snap('<b>Leaf</b> ' + label(i) + ': a file simply returns its own size, <b>' + v + ' KB</b>. No loop, no children.', [CODE('size()', COMP_CODE, { 7: 'ok' })]);
            hl[i] = 'ok'; stack.pop();
            return v;
          }
          snap('<b>Composite</b> ' + label(i) + ': start <code>total = 0</code> and ask every child the <i>same question</i>.', [CODE('size()', COMP_CODE, { 2: 'cur', 3: 'cur' })]);
          var total = 0, kids = [2 * i + 1, 2 * i + 2].filter(function (c) { return c < t.length && t[c] !== '-'; });
          kids.forEach(function (c) {
            hl[i] = 'win';
            var e = {}; e[c] = 'cur';
            snap(label(i) + ' → calls <code>size()</code> on child ' + label(c) + '.', [CODE('size()', COMP_CODE, { 4: 'cur' })], e);
            var s = size(c);
            total += s;
            hl[i] = 'cur';
            var e2 = {}; e2[c] = 'ok';
            tags[i] = 'Σ' + total;
            snap('Back in ' + label(i) + ': child returned ' + s + ', running total = <b>' + total + '</b>.', [CODE('size()', COMP_CODE, { 4: 'ok' }), VARS(label(i), { total: total }, { total: 'ok' })], e2);
          });
          if (!kids.length) { tags[i] = 'Σ0'; }
          hl[i] = i === 0 ? 'sel' : 'ok'; stack.pop();
          snap(label(i) + ' returns <b>' + total + ' KB</b>' + (kids.length ? '' : ' (empty folder)') + (i === 0 ? ' — the answer to the client\'s single call.' : ' to its parent.'), [CODE('size()', COMP_CODE, { 5: 'ok' })]);
          return total;
        }
        var ans = size(0);
        f.push(F('<b>Done:</b> total = <b>' + ans + ' KB</b>, every node visited once (' + visits + ' visits → O(n)). Notice: there was never an <code>instanceof</code> — polymorphism picked leaf or composite behaviour each time.',
          [{ type: 'tree', label: 'final sizes', arr: arr, hl: { 0: 'sel' }, tags: tags }, VARS('result', { totalKB: ans, nodesVisited: visits }, { totalKB: 'sel' })]));
        return f;
      }
    },
    examples: [
      { title: 'Menu with sub-menus', html: `<p><code>MenuComponent</code> has <code>render(depth)</code>. <code>MenuItem</code> prints its label; <code>Menu</code> prints its title and renders each child one level deeper. "Settings → Display → Brightness" works for any depth, and adding a sub-menu never changes rendering code.</p>`, code: { lang: 'java', code: `interface MenuComponent { void render(int depth); }
record MenuItem(String label) implements MenuComponent {
    public void render(int d) { System.out.println("  ".repeat(d) + "- " + label); }
}
record Menu(String title, List<MenuComponent> items) implements MenuComponent {
    public void render(int d) { System.out.println("  ".repeat(d) + title); items.forEach(i -> i.render(d + 1)); }
}`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass


class MenuComponent(ABC):
    @abstractmethod
    def render(self, depth: int) -> None: ...


@dataclass(frozen=True)
class MenuItem(MenuComponent):
    label: str

    def render(self, depth: int) -> None:
        print("  " * depth + "- " + self.label)


@dataclass(frozen=True)
class Menu(MenuComponent):
    title: str
    items: tuple[MenuComponent, ...]

    def render(self, depth: int) -> None:
        print("  " * depth + self.title)
        for item in self.items:
            item.render(depth + 1)` },
          { lang: 'ts', code: `interface MenuComponent {
  render(depth: number): void;
}

class MenuItem implements MenuComponent {
  constructor(readonly label: string) {}
  render(depth: number): void { console.log("  ".repeat(depth) + "- " + this.label); }
}

class Menu implements MenuComponent {
  constructor(readonly title: string, readonly items: readonly MenuComponent[]) {}
  render(depth: number): void {
    console.log("  ".repeat(depth) + this.title);
    this.items.forEach((i) => i.render(depth + 1));
  }
}` },
          { lang: 'cpp', code: `class MenuComponent {
public:
    virtual ~MenuComponent() = default;
    virtual void render(int depth) const = 0;
};

class MenuItem : public MenuComponent {
    string label_;
public:
    explicit MenuItem(string label) : label_(std::move(label)) {}
    void render(int depth) const override { cout << string(depth * 2, ' ') << "- " << label_ << "\\n"; }
};

class Menu : public MenuComponent {
    string title_;
    vector<unique_ptr<MenuComponent>> items_;
public:
    Menu(string title, vector<unique_ptr<MenuComponent>> items) : title_(std::move(title)), items_(std::move(items)) {}
    void render(int depth) const override {
        cout << string(depth * 2, ' ') << title_ << "\\n";
        for (const auto& i : items_) i->render(depth + 1);
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

interface IMenuComponent { void Render(int depth); }
sealed class MenuItem : IMenuComponent {
    private readonly string label; public MenuItem(string label) { this.label = label; }
    public void Render(int d) { Console.WriteLine(new string(' ', 2 * d) + "- " + label); }
}
sealed class Menu : IMenuComponent {
    private readonly string title; private readonly List<IMenuComponent> items;
    public Menu(string title, List<IMenuComponent> items) { this.title = title; this.items = items; }
    public void Render(int d) { Console.WriteLine(new string(' ', 2 * d) + title); items.ForEach(i => i.Render(d + 1)); }
}` }
        ] } },
      { title: 'Org chart: total salary of a department', html: `<p><code>Employee.cost()</code> = salary; <code>Team.cost()</code> = sum of members' cost (members are employees or sub-teams). The CFO asks <code>company.cost()</code>. Same pattern answers "headcount", "find everyone in Pune" or "print the tree".</p>` },
      { title: 'Bill of materials (BOM)', html: `<p>A bicycle = frame + 2 wheels; a wheel = rim + 32 spokes + tyre. <code>Part.weight()</code> on the bicycle walks the whole tree. Notice that composites can carry <b>quantities</b>: a composite entry "spoke × 32" multiplies its child's weight. Composite is not only "sum" — any combining rule works (max, AND, concatenation).</p>` },
      { title: 'Uniform permission check (AND over children)', html: `<p>"Can the user delete this folder?" = user can delete the folder itself <b>and</b> every child. The composite's combine step is <code>allMatch</code> instead of a sum: ${H.chips(['folder ✓', 'a.txt ✓', 'secret.pdf ✗'], { hl: { 'secret.pdf ✗': 'r' } })} → ${H.c('r', 'denied')}.</p>` }
    ],
    deepDive: `<p><b>Complexity.</b> One operation on the root visits every node once: O(n) time, O(depth) stack. Very deep trees (100 000 nested comments) can blow the call stack (about 10 000 frames in Java and JavaScript, 1 000 in Python, roughly 8 MB in C++) — switch to an explicit stack/queue iteration for production, or cache sizes in each composite and update them on add/remove (O(depth) updates instead of O(n) queries; needs parent pointers).</p>
      <p><b>Cycles.</b> If a folder can be added inside its own descendant (symlinks, a user dragging a group into itself) your recursion never ends. Guard in <code>add()</code> by walking up parent links, or track a visited set during traversal.</p>
      <p><b>Transparent vs safe</b> is a real trade-off: transparency (add/remove on Component) is what the GoF book shows, but it violates Liskov/Interface Segregation for leaves. Closed type sets with pattern matching (Java <code>sealed</code> interfaces + <code>switch</code>, TypeScript discriminated unions, C++ <code>std::variant</code> + <code>std::visit</code>) give a third option: keep the component small and let operations that truly differ use exhaustive pattern matching — the compiler errors if you add a new node type and forget a case.</p>
      <p><b>Composite + friends.</b> Iterator walks a composite; Visitor adds new operations without editing node classes; Flyweight shares identical leaves (characters in a document tree); Builder builds big composites fluently. React/Compose UI trees, DOM and ASTs are all composites. <b>Immutability</b> (records, persistent trees) makes composites thread-safe and lets you share sub-trees.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI systems are full of composites: an agent "plan" is a tree of tasks and sub-tasks; a prompt template is composed of sections and nested sections; a RAG document is chunked hierarchically (book → chapter → section → paragraph) and summaries roll up the tree exactly like <code>size()</code>. Multi-agent systems where a "manager agent" delegates to sub-agents that may delegate again are the army analogy in code.</p>
      <p><b>Use AI as a partner:</b> <code>Model nested comments as a Composite (in my language, with a closed set of node types); include a cycle guard and an iterative traversal for depth 100k.</code> Then verify the cycle guard yourself. <b>Where AI goes wrong:</b> it writes recursion with no depth or cycle protection, puts <code>add()</code> on leaves that silently do nothing, and recomputes totals on every call inside loops (O(n²)). <b>What you must still own:</b> recognising part-whole hierarchies in requirements, choosing safe vs transparent, and the performance plan for huge trees.</p>`,
    problems: [{
      title: 'Shopping Cart with Discounted Bundles',
      level: 'Medium', tags: ['composite', 'e-commerce'], companies: ['Amazon', 'Flipkart', 'Meesho'],
      statement: `<p>A cart contains <b>products</b> (name, price) and <b>bundles</b>. A bundle has a name, a discount percentage (0–50) and items — which can be products or other bundles. A bundle's price = (sum of its items' prices) × (1 − discount/100). Implement <code>price()</code> for the whole cart and a <code>describe()</code> that prints an indented tree. Prices are in paise (long); round half-up at each bundle.</p>`,
      constraints: `<p>Nesting depth ≤ 10, total items ≤ 10<sup>4</sup>. Discount outside 0–50 → <code>IllegalArgumentException</code>. A bundle cannot contain itself.</p>`,
      example: `<p>"Gaming Combo" (10% off) = Console 30 000 + "Controller Pack" (20% off: 2 × 3 000 = 6 000 → <b>4 800</b>) = 34 800 → × 0.9 = <b>${H.c('g', '31 320')}</b>. Cart = Gaming Combo + Headset 2 000 = <b>${H.c('g', '33 320')}</b>.</p>`,
      brute: { why: `<p>Keep products and bundles in separate lists, and write pricing with <code>instanceof</code> checks and a hand-written loop per nesting level. It works for one level of bundles; a bundle inside a bundle needs another loop, and every new operation (describe, count items, tax) repeats the same type checks. Adding a "gift card" item type means editing every operation.</p>`, code: { lang: 'java', code: `class Product { String name; long price; Product(String n, long p) { name = n; price = p; } }
class Bundle { String name; int discount; List<Object> items = new ArrayList<>(); }

class PriceCalculator {
    long price(List<Object> cart) {
        long total = 0;
        for (Object o : cart) {
            if (o instanceof Product p) total += p.price;
            else if (o instanceof Bundle b) {
                long sub = 0;
                for (Object inner : b.items) {
                    if (inner instanceof Product p2) sub += p2.price;
                    // a bundle inside a bundle? another nested loop... and another...
                }
                total += sub * (100 - b.discount) / 100;
            }
        }
        return total;
    }
}`, alt: [
                { lang: 'python', code: `
class Product:
    def __init__(self, n, p): self.name, self.price = n, p
class Bundle:
    def __init__(self): self.name = ""; self.discount = 0; self.items = []

class PriceCalculator:
    def price(self, cart):
        total = 0
        for o in cart:
            if isinstance(o, Product): total += o.price
            elif isinstance(o, Bundle):
                sub = 0
                for inner in o.items:
                    if isinstance(inner, Product): sub += inner.price
                    # a bundle inside a bundle? another nested loop... and another...
                total += sub * (100 - o.discount) // 100
        return total` },
                { lang: 'ts', code: `
class Product { constructor(public name: string, public price: number) {} }
class Bundle { name = ""; discount = 0; items: (Product | Bundle)[] = []; }

class PriceCalculator {
    price(cart: (Product | Bundle)[]): number {
        let total = 0;
        for (const o of cart) {
            if (o instanceof Product) total += o.price;
            else if (o instanceof Bundle) {
                let sub = 0;
                for (const inner of o.items) {
                    if (inner instanceof Product) sub += inner.price;
                    // a bundle inside a bundle? another nested loop... and another...
                }
                total += Math.floor(sub * (100 - o.discount) / 100);
            }
        }
        return total;
    }
}` },
                { lang: 'cpp', code: `
struct Item { virtual ~Item() = default; };
struct Product : Item { string name; long long price; Product(string n, long long p) : name(n), price(p) {} };
struct Bundle : Item { string name; int discount = 0; vector<Item*> items; };

class PriceCalculator {
public:
    long long price(const vector<Item*>& cart) {
        long long total = 0;
        for (Item* o : cart) {
            if (auto* p = dynamic_cast<Product*>(o)) total += p->price;
            else if (auto* b = dynamic_cast<Bundle*>(o)) {
                long long sub = 0;
                for (Item* inner : b->items) {
                    if (auto* p2 = dynamic_cast<Product*>(inner)) sub += p2->price;
                    // a bundle inside a bundle? another nested loop... and another...
                }
                total += sub * (100 - b->discount) / 100;
            }
        }
        return total;
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class Product { public string Name; public long Price; public Product(string n, long p) { Name = n; Price = p; } }
class Bundle { public string Name; public int Discount; public List<object> Items = new List<object>(); }

class PriceCalculator {
    public long Price(List<object> cart) {
        long total = 0;
        foreach (object o in cart) {
            if (o is Product p) total += p.Price;
            else if (o is Bundle b) {
                long sub = 0;
                foreach (object inner in b.Items) {
                    if (inner is Product p2) sub += p2.Price;
                    // a bundle inside a bundle? another nested loop... and another...
                }
                total += sub * (100 - b.Discount) / 100;
            }
        }
        return total;
    }
}` }
              ] } },
      mcq: { q: 'What is the type of the list inside Bundle in a clean Composite design?', options: ['List&lt;Product&gt;', 'List&lt;Bundle&gt;', 'List&lt;CartItem&gt; where CartItem is the shared interface', 'List&lt;Object&gt;'], answer: 2, explain: 'Children must be the component type so a bundle can hold products AND bundles, and the bundle just calls price() on each.' },
      hints: [`<p>Hint 1: Products and bundles must answer the same question — <code>price()</code>. Make a shared interface <code>CartItem</code>.</p>`, `<p>Hint 2: <code>Product</code> is the leaf; <code>Bundle</code> is the composite with <code>List&lt;CartItem&gt;</code>. Its <code>price()</code> sums children then applies its own discount.</p>`, `<p>Hint 3: Use long paise and compute <code>(sum * (100 - d) + 50) / 100</code> for half-up rounding. Guard against self-containment in <code>add()</code> by checking whether the new child (if a bundle) contains <code>this</code> anywhere.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "Cart (-0%): 33320\n  Gaming Combo (-10%): 31320\n    Console: 30000\n    Controller Pack (-20%): 4800\n      Controller: 3000\n      Controller: 3000\n  Headset: 2000\nTotal = 33320\ndiscount 0..50\ncycle: Controller Pack\n" }] },
      solution: {
        approach: `<p>Sealed interface <code>CartItem</code> with <code>price()</code> and <code>describe(indent)</code>. <code>Product</code> (record) returns its price. <code>Bundle</code> keeps <code>List&lt;CartItem&gt;</code>; <code>price()</code> recursively sums children and applies its discount with integer half-up rounding. <code>add()</code> rejects a child bundle that already contains this bundle (cycle). The cart itself is just a bundle with 0% discount — the client calls <code>cart.price()</code> once.</p>`,
        code: `sealed interface CartItem permits Product, Bundle {
    long price();                        // paise
    void describe(String indent);
}

record Product(String name, long price) implements CartItem {
    public void describe(String indent) { System.out.println(indent + name + ": " + price); }
}

final class Bundle implements CartItem {
    private final String name;
    private final int discountPct;
    private final List<CartItem> items = new ArrayList<>();

    Bundle(String name, int discountPct) {
        if (discountPct < 0 || discountPct > 50) throw new IllegalArgumentException("discount 0..50");
        this.name = name; this.discountPct = discountPct;
    }

    Bundle add(CartItem item) {
        if (item == this || (item instanceof Bundle b && b.contains(this)))
            throw new IllegalArgumentException("cycle: " + name);
        items.add(item);
        return this;
    }

    private boolean contains(CartItem target) {
        for (CartItem i : items)
            if (i == target || (i instanceof Bundle b && b.contains(target))) return true;
        return false;
    }

    public long price() {
        long sum = 0;
        for (CartItem i : items) sum += i.price();            // uniform call
        return (sum * (100 - discountPct) + 50) / 100;          // half-up rounding
    }

    public void describe(String indent) {
        System.out.println(indent + name + " (-" + discountPct + "%): " + price());
        for (CartItem i : items) i.describe(indent + "  ");
    }

    public static void main(String[] args) {
        Bundle pack = new Bundle("Controller Pack", 20)
            .add(new Product("Controller", 3_000)).add(new Product("Controller", 3_000));
        Bundle combo = new Bundle("Gaming Combo", 10).add(new Product("Console", 30_000)).add(pack);
        Bundle cart = new Bundle("Cart", 0).add(combo).add(new Product("Headset", 2_000));
        cart.describe("");
        System.out.println("Total = " + cart.price());          // 33320
        try { new Bundle("Bad", 60); }
        catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }       // discount 0..50
        try { pack.add(combo); }                                                          // combo already contains pack
        catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }       // cycle: Controller Pack
    }
}`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass


class CartItem(ABC):
    @abstractmethod
    def price(self) -> int: ...  # paise

    @abstractmethod
    def describe(self, indent: str) -> None: ...


@dataclass(frozen=True)
class Product(CartItem):
    name: str
    _price: int

    def price(self) -> int:
        return self._price

    def describe(self, indent: str) -> None:
        print(f"{indent}{self.name}: {self._price}")


class Bundle(CartItem):
    def __init__(self, name: str, discount_pct: int) -> None:
        if not 0 <= discount_pct <= 50:
            raise ValueError("discount 0..50")
        self._name = name
        self._discount_pct = discount_pct
        self._items: list[CartItem] = []

    def add(self, item: CartItem) -> "Bundle":
        if item is self or (isinstance(item, Bundle) and item._contains(self)):
            raise ValueError(f"cycle: {self._name}")
        self._items.append(item)
        return self

    def _contains(self, target: CartItem) -> bool:
        return any(i is target or (isinstance(i, Bundle) and i._contains(target)) for i in self._items)

    def price(self) -> int:
        total = sum(i.price() for i in self._items)  # uniform call
        return (total * (100 - self._discount_pct) + 50) // 100  # half-up rounding

    def describe(self, indent: str) -> None:
        print(f"{indent}{self._name} (-{self._discount_pct}%): {self.price()}")
        for i in self._items:
            i.describe(indent + "  ")


if __name__ == "__main__":
    pack = Bundle("Controller Pack", 20).add(Product("Controller", 3_000)).add(Product("Controller", 3_000))
    combo = Bundle("Gaming Combo", 10).add(Product("Console", 30_000)).add(pack)
    cart = Bundle("Cart", 0).add(combo).add(Product("Headset", 2_000))
    cart.describe("")
    print(f"Total = {cart.price()}")  # 33320
    try:
        Bundle("Bad", 60)
    except ValueError as e:
        print(e)  # discount 0..50
    try:
        pack.add(combo)  # combo already contains pack
    except ValueError as e:
        print(e)  # cycle: Controller Pack` },
          { lang: 'ts', code: `interface CartItem {
  price(): number; // paise
  describe(indent: string): void;
}

class Product implements CartItem {
  constructor(readonly name: string, private readonly cost: number) {}

  price(): number {
    return this.cost;
  }

  describe(indent: string): void {
    console.log(\`\${indent}\${this.name}: \${this.cost}\`);
  }
}

class Bundle implements CartItem {
  private readonly items: CartItem[] = [];

  constructor(private readonly name: string, private readonly discountPct: number) {
    if (discountPct < 0 || discountPct > 50) throw new Error("discount 0..50");
  }

  add(item: CartItem): this {
    if (item === this || (item instanceof Bundle && item.contains(this))) {
      throw new Error(\`cycle: \${this.name}\`);
    }
    this.items.push(item);
    return this;
  }

  private contains(target: CartItem): boolean {
    return this.items.some((i) => i === target || (i instanceof Bundle && i.contains(target)));
  }

  price(): number {
    const sum = this.items.reduce((acc, i) => acc + i.price(), 0); // uniform call
    return Math.floor((sum * (100 - this.discountPct) + 50) / 100); // half-up rounding
  }

  describe(indent: string): void {
    console.log(\`\${indent}\${this.name} (-\${this.discountPct}%): \${this.price()}\`);
    for (const i of this.items) i.describe(indent + "  ");
  }
}

const pack = new Bundle("Controller Pack", 20).add(new Product("Controller", 3_000)).add(new Product("Controller", 3_000));
const combo = new Bundle("Gaming Combo", 10).add(new Product("Console", 30_000)).add(pack);
const cart = new Bundle("Cart", 0).add(combo).add(new Product("Headset", 2_000));
cart.describe("");
console.log(\`Total = \${cart.price()}\`); // 33320
try {
  new Bundle("Bad", 60);
} catch (e) {
  console.log((e as Error).message); // discount 0..50
}
try {
  pack.add(combo); // combo already contains pack
} catch (e) {
  console.log((e as Error).message); // cycle: Controller Pack
}` },
          { lang: 'cpp', code: `class CartItem {
public:
    virtual ~CartItem() = default;
    virtual long long price() const = 0;                  // paise
    virtual void describe(const string& indent) const = 0;
};

class Product : public CartItem {
    string name_;
    long long price_;
public:
    Product(string name, long long price) : name_(std::move(name)), price_(price) {}
    long long price() const override { return price_; }
    void describe(const string& indent) const override { cout << indent << name_ << ": " << price_ << "\\n"; }
};

class Bundle : public CartItem {
    string name_;
    int discountPct_;
    vector<shared_ptr<CartItem>> items_;                  // items may be shared between bundles

    bool contains(const CartItem* target) const {
        for (const auto& i : items_) {
            if (i.get() == target) return true;
            auto* b = dynamic_cast<const Bundle*>(i.get());
            if (b && b->contains(target)) return true;
        }
        return false;
    }
public:
    Bundle(string name, int discountPct) : name_(std::move(name)), discountPct_(discountPct) {
        if (discountPct < 0 || discountPct > 50) throw invalid_argument("discount 0..50");
    }

    Bundle& add(shared_ptr<CartItem> item) {
        auto* b = dynamic_cast<const Bundle*>(item.get());
        if (item.get() == this || (b && b->contains(this))) throw invalid_argument("cycle: " + name_);
        items_.push_back(std::move(item));
        return *this;
    }

    long long price() const override {
        long long sum = 0;
        for (const auto& i : items_) sum += i->price();   // uniform call
        return (sum * (100 - discountPct_) + 50) / 100;   // half-up rounding
    }

    void describe(const string& indent) const override {
        cout << indent << name_ << " (-" << discountPct_ << "%): " << price() << "\\n";
        for (const auto& i : items_) i->describe(indent + "  ");
    }
};

int main() {
    auto pack = make_shared<Bundle>("Controller Pack", 20);
    pack->add(make_shared<Product>("Controller", 3'000)).add(make_shared<Product>("Controller", 3'000));
    auto combo = make_shared<Bundle>("Gaming Combo", 10);
    combo->add(make_shared<Product>("Console", 30'000)).add(pack);
    Bundle cart("Cart", 0);
    cart.add(combo).add(make_shared<Product>("Headset", 2'000));
    cart.describe("");
    cout << "Total = " << cart.price() << "\\n";           // 33320
    try {
        Bundle bad("Bad", 60);
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";                         // discount 0..50
    }
    try {
        pack->add(combo);                                 // combo already contains pack
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";                         // cycle: Controller Pack
    }
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

interface ICartItem {
    long Price();                        // paise
    void Describe(string indent);
}

sealed class Product : ICartItem {
    private readonly string name; private readonly long price;
    public Product(string name, long price) { this.name = name; this.price = price; }
    public long Price() { return price; }
    public void Describe(string indent) { Console.WriteLine(indent + name + ": " + price); }
}

sealed class Bundle : ICartItem {
    private readonly string name;
    private readonly int discountPct;
    private readonly List<ICartItem> items = new List<ICartItem>();

    public Bundle(string name, int discountPct) {
        if (discountPct < 0 || discountPct > 50) throw new ArgumentException("discount 0..50");
        this.name = name; this.discountPct = discountPct;
    }

    public Bundle Add(ICartItem item) {
        Bundle b = item as Bundle;
        if (item == this || (b != null && b.Contains(this)))
            throw new ArgumentException("cycle: " + name);
        items.Add(item);
        return this;
    }

    private bool Contains(ICartItem target) {
        foreach (ICartItem i in items) {
            Bundle b = i as Bundle;
            if (i == target || (b != null && b.Contains(target))) return true;
        }
        return false;
    }

    public long Price() {
        long sum = 0;
        foreach (ICartItem i in items) sum += i.Price();        // uniform call
        return (sum * (100 - discountPct) + 50) / 100;          // half-up rounding
    }

    public void Describe(string indent) {
        Console.WriteLine(indent + name + " (-" + discountPct + "%): " + Price());
        foreach (ICartItem i in items) i.Describe(indent + "  ");
    }
}

class Program {
    static void Main() {
        Bundle pack = new Bundle("Controller Pack", 20)
            .Add(new Product("Controller", 3000)).Add(new Product("Controller", 3000));
        Bundle combo = new Bundle("Gaming Combo", 10).Add(new Product("Console", 30000)).Add(pack);
        Bundle cart = new Bundle("Cart", 0).Add(combo).Add(new Product("Headset", 2000));
        cart.Describe("");
        Console.WriteLine("Total = " + cart.Price());          // 33320
        try { new Bundle("Bad", 60); }
        catch (ArgumentException e) { Console.WriteLine(e.Message); }       // discount 0..50
        try { pack.Add(combo); }                                              // combo already contains pack
        catch (ArgumentException e) { Console.WriteLine(e.Message); }       // cycle: Controller Pack
    }
}` }
        ],
        complexity: `<p><code>price()</code> is O(n) over all items, O(depth) stack. The cycle check in <code>add</code> is O(size of the child subtree).</p>`,
        followUps: ['Prices are requested 1 000× per second but the cart rarely changes — cache totals and invalidate upward.', 'Add tax that applies only to leaf products in some categories — which pattern helps add operations without editing classes? (Visitor)', 'Make the tree immutable and share a popular bundle across many carts.']
      }
    }]
  });
  /* =====================================================================
     TOPIC 6 — BRIDGE
     ===================================================================== */
  topics.push({
    title: 'Bridge — Split Two Things That Vary Independently',
    analogy: `<p>A TV <b>remote</b> and a <b>TV</b> are made by different teams. You can have a basic remote or a fancy voice remote; you can have a Sony, an LG or a Samsung TV. If every remote were hard-wired to one TV brand, the shop would need 2 × 3 = 6 products. Instead, remotes talk through a <b>standard signal</b> (the bridge), so any remote works with any TV, and both teams improve their side alone.</p>
      <p>Same with <b>switches and bulbs</b>: the wall switch (on/off, dimmer, smart switch) does not care if the bulb is LED, halogen or a fan — they meet at the wire.</p>`,
    explain: `<p><b>The problem: two dimensions of change.</b> You send notifications. One dimension is <i>what kind</i> of message (Alert, Reminder, Promo — each formats and prioritises differently). The other is <i>how</i> it is delivered (Email, SMS, Push). With inheritance you create a class per pair: <code>AlertEmail</code>, <code>AlertSms</code>, <code>ReminderPush</code>… That is <b>M × N</b> classes, and adding WhatsApp means writing M new classes.</p>
      ${H.table(['', 'Email', 'SMS', 'Push'], [['Alert', 'AlertEmail', 'AlertSms', 'AlertPush'], ['Reminder', 'ReminderEmail', 'ReminderSms', 'ReminderPush'], ['Promo', 'PromoEmail', 'PromoSms', 'PromoPush']])}
      <p><b>The fix.</b> Split the two dimensions into two separate hierarchies and connect them with a <b>field</b> (composition) — that field is the "bridge":</p>
      ${H.kv([['Abstraction', 'Notification — holds a Channel channel'], ['Refined abstractions', 'Alert, Reminder, Promo — the "what" (formatting, rules)'], ['Implementor (interface)', 'Channel.deliver(to, text) — the "how"'], ['Concrete implementors', 'EmailChannel, SmsChannel, PushChannel']])}
      <p>Now we need <b>M + N</b> classes (3 + 3 = 6 instead of 9; 5 + 5 = 10 instead of 25). Pairing happens at runtime: <code>new Alert(new SmsChannel())</code>. Each side grows without touching the other.</p>
      <p><b>Bridge vs Adapter vs Strategy.</b> Adapter is applied <i>after</i> two designs already exist and do not fit. Bridge is designed <i>up front</i> so that two hierarchies can vary independently. Code-wise, the implementor field looks like a Strategy; the difference is scale and intent — Bridge splits a whole class hierarchy into two, where Strategy swaps one algorithm.</p>
      <p><b>In the wild:</b> JDBC is a textbook bridge — your code uses the <code>java.sql</code> abstraction (<code>Connection</code>, <code>Statement</code>), and each driver (Postgres, MySQL) is a concrete implementor. SLF4J (API) over Logback/Log4j (implementation) is another.</p>`,
    clues: ['"<b>two (or more) dimensions</b> that vary independently": shape × renderer, message × channel, report × format, device × remote', 'class names that combine two words: <code>RedCircle, BlueSquare, PdfSalesReport</code> → <b>class explosion M × N</b>', '"must run on multiple platforms / databases / drivers"', '"switch the implementation at runtime" (e.g. change renderer or channel per user)', '"separate abstraction from implementation"', '"both sides will grow; different teams own them"'],
    code: [{ lang: 'java', title: 'Notification × Channel bridge', code: `
// ---------- Implementor side: HOW to deliver ----------
interface Channel {
    void deliver(String to, String text);
}
class EmailChannel implements Channel {
    public void deliver(String to, String text) { System.out.println("EMAIL to " + to + ": " + text); }
}
class SmsChannel implements Channel {
    public void deliver(String to, String text) {
        String sms = text.length() > 160 ? text.substring(0, 157) + "..." : text;   // SMS limit
        System.out.println("SMS to " + to + ": " + sms);
    }
}
class PushChannel implements Channel {
    public void deliver(String to, String text) { System.out.println("PUSH to device of " + to + ": " + text); }
}

// ---------- Abstraction side: WHAT we send ----------
abstract class Notification {
    protected final Channel channel;           // <-- the bridge
    protected Notification(Channel channel) { this.channel = channel; }
    abstract void send(String to, String message);
}
class Alert extends Notification {
    Alert(Channel c) { super(c); }
    void send(String to, String message) { channel.deliver(to, "[ALERT] " + message.toUpperCase()); }
}
class Reminder extends Notification {
    private final LocalTime at;
    Reminder(Channel c, LocalTime at) { super(c); this.at = at; }
    void send(String to, String message) { channel.deliver(to, "Reminder for " + at + ": " + message); }
}
class Promo extends Notification {
    Promo(Channel c) { super(c); }
    void send(String to, String message) { channel.deliver(to, message + " (reply STOP to opt out)"); }
}

class NotifyDemo {
    public static void main(String[] args) {
        new Alert(new SmsChannel()).send("+91-98xxxx", "db cpu at 95%");
        new Reminder(new PushChannel(), LocalTime.of(9, 0)).send("asha", "stand-up");
        new Promo(new EmailChannel()).send("ben@x.com", "50% off today");
        // New channel (WhatsApp)? One class. Works with all three message types immediately.
    }
}`,
      alt: [
        { lang: 'python', code: `from abc import ABC, abstractmethod
from datetime import time


# ---------- Implementor side: HOW to deliver ----------
class Channel(ABC):
    @abstractmethod
    def deliver(self, to: str, text: str) -> None: ...


class EmailChannel(Channel):
    def deliver(self, to: str, text: str) -> None:
        print(f"EMAIL to {to}: {text}")


class SmsChannel(Channel):
    def deliver(self, to: str, text: str) -> None:
        sms = text[:157] + "..." if len(text) > 160 else text  # SMS limit
        print(f"SMS to {to}: {sms}")


class PushChannel(Channel):
    def deliver(self, to: str, text: str) -> None:
        print(f"PUSH to device of {to}: {text}")


# ---------- Abstraction side: WHAT we send ----------
class Notification(ABC):
    def __init__(self, channel: Channel) -> None:
        self._channel = channel  # <-- the bridge

    @abstractmethod
    def send(self, to: str, message: str) -> None: ...


class Alert(Notification):
    def send(self, to: str, message: str) -> None:
        self._channel.deliver(to, f"[ALERT] {message.upper()}")


class Reminder(Notification):
    def __init__(self, channel: Channel, at: time) -> None:
        super().__init__(channel)
        self._at = at

    def send(self, to: str, message: str) -> None:
        self._channel.deliver(to, f"Reminder for {self._at:%H:%M}: {message}")


class Promo(Notification):
    def send(self, to: str, message: str) -> None:
        self._channel.deliver(to, f"{message} (reply STOP to opt out)")


if __name__ == "__main__":
    Alert(SmsChannel()).send("+91-98xxxx", "db cpu at 95%")
    Reminder(PushChannel(), time(9, 0)).send("asha", "stand-up")
    Promo(EmailChannel()).send("ben@x.com", "50% off today")
    # New channel (WhatsApp)? One class. Works with all three message types immediately.` },
        { lang: 'ts', code: `export {}; // makes this file a module, so our Notification never clashes with the DOM type of that name

// ---------- Implementor side: HOW to deliver ----------
interface Channel {
  deliver(to: string, text: string): void;
}

class EmailChannel implements Channel {
  deliver(to: string, text: string): void { console.log(\`EMAIL to \${to}: \${text}\`); }
}

class SmsChannel implements Channel {
  deliver(to: string, text: string): void {
    const sms = text.length > 160 ? text.slice(0, 157) + "..." : text; // SMS limit
    console.log(\`SMS to \${to}: \${sms}\`);
  }
}

class PushChannel implements Channel {
  deliver(to: string, text: string): void { console.log(\`PUSH to device of \${to}: \${text}\`); }
}

// ---------- Abstraction side: WHAT we send ----------
abstract class Notification {
  protected constructor(protected readonly channel: Channel) {} // <-- the bridge
  abstract send(to: string, message: string): void;
}

class Alert extends Notification {
  constructor(c: Channel) { super(c); }
  send(to: string, message: string): void { this.channel.deliver(to, \`[ALERT] \${message.toUpperCase()}\`); }
}

class Reminder extends Notification {
  constructor(c: Channel, private readonly hour: number, private readonly minute: number) { super(c); }
  send(to: string, message: string): void {
    const at = \`\${String(this.hour).padStart(2, "0")}:\${String(this.minute).padStart(2, "0")}\`;
    this.channel.deliver(to, \`Reminder for \${at}: \${message}\`);
  }
}

class Promo extends Notification {
  constructor(c: Channel) { super(c); }
  send(to: string, message: string): void { this.channel.deliver(to, \`\${message} (reply STOP to opt out)\`); }
}

new Alert(new SmsChannel()).send("+91-98xxxx", "db cpu at 95%");
new Reminder(new PushChannel(), 9, 0).send("asha", "stand-up");
new Promo(new EmailChannel()).send("ben@x.com", "50% off today");
// New channel (WhatsApp)? One class. Works with all three message types immediately.` },
        { lang: 'cpp', code: `// ---------- Implementor side: HOW to deliver ----------
class Channel {
public:
    virtual ~Channel() = default;
    virtual void deliver(const string& to, const string& text) const = 0;
};

class EmailChannel : public Channel {
public:
    void deliver(const string& to, const string& text) const override { cout << "EMAIL to " << to << ": " << text << "\\n"; }
};

class SmsChannel : public Channel {
public:
    void deliver(const string& to, const string& text) const override {
        string sms = text.size() > 160 ? text.substr(0, 157) + "..." : text;   // SMS limit
        cout << "SMS to " << to << ": " << sms << "\\n";
    }
};

class PushChannel : public Channel {
public:
    void deliver(const string& to, const string& text) const override { cout << "PUSH to device of " << to << ": " << text << "\\n"; }
};

// ---------- Abstraction side: WHAT we send ----------
class Notification {
protected:
    const Channel& channel_;                      // <-- the bridge
    explicit Notification(const Channel& channel) : channel_(channel) {}
public:
    virtual ~Notification() = default;
    virtual void send(const string& to, const string& message) const = 0;
};

class Alert : public Notification {
public:
    explicit Alert(const Channel& c) : Notification(c) {}
    void send(const string& to, const string& message) const override {
        string up = message;
        for (char& ch : up) ch = static_cast<char>(toupper(static_cast<unsigned char>(ch)));
        channel_.deliver(to, "[ALERT] " + up);
    }
};

class Reminder : public Notification {
    int hour_, minute_;
public:
    Reminder(const Channel& c, int hour, int minute) : Notification(c), hour_(hour), minute_(minute) {}
    void send(const string& to, const string& message) const override {
        ostringstream at;
        at << setfill('0') << setw(2) << hour_ << ":" << setw(2) << minute_;
        channel_.deliver(to, "Reminder for " + at.str() + ": " + message);
    }
};

class Promo : public Notification {
public:
    explicit Promo(const Channel& c) : Notification(c) {}
    void send(const string& to, const string& message) const override {
        channel_.deliver(to, message + " (reply STOP to opt out)");
    }
};

int main() {
    SmsChannel sms; PushChannel push; EmailChannel email;
    Alert(sms).send("+91-98xxxx", "db cpu at 95%");
    Reminder(push, 9, 0).send("asha", "stand-up");
    Promo(email).send("ben@x.com", "50% off today");
    // New channel (WhatsApp)? One class. Works with all three message types immediately.
}` },
  { lang: 'csharp', code: `
using System;

// ---------- Implementor side: HOW to deliver ----------
interface IChannel {
    void Deliver(string to, string text);
}
class EmailChannel : IChannel {
    public void Deliver(string to, string text) { Console.WriteLine("EMAIL to " + to + ": " + text); }
}
class SmsChannel : IChannel {
    public void Deliver(string to, string text) {
        string sms = text.Length > 160 ? text.Substring(0, 157) + "..." : text;   // SMS limit
        Console.WriteLine("SMS to " + to + ": " + sms);
    }
}
class PushChannel : IChannel {
    public void Deliver(string to, string text) { Console.WriteLine("PUSH to device of " + to + ": " + text); }
}

// ---------- Abstraction side: WHAT we send ----------
abstract class Notification {
    protected readonly IChannel channel;       // <-- the bridge
    protected Notification(IChannel channel) { this.channel = channel; }
    public abstract void Send(string to, string message);
}
class Alert : Notification {
    public Alert(IChannel c) : base(c) { }
    public override void Send(string to, string message) { channel.Deliver(to, "[ALERT] " + message.ToUpper()); }
}
class Reminder : Notification {
    private readonly TimeSpan at;
    public Reminder(IChannel c, TimeSpan at) : base(c) { this.at = at; }
    public override void Send(string to, string message) { channel.Deliver(to, "Reminder for " + at.ToString(@"hh\\:mm") + ": " + message); }
}
class Promo : Notification {
    public Promo(IChannel c) : base(c) { }
    public override void Send(string to, string message) { channel.Deliver(to, message + " (reply STOP to opt out)"); }
}

class Program {
    static void Main() {
        new Alert(new SmsChannel()).Send("+91-98xxxx", "db cpu at 95%");
        new Reminder(new PushChannel(), new TimeSpan(9, 0, 0)).Send("asha", "stand-up");
        new Promo(new EmailChannel()).Send("ben@x.com", "50% off today");
        // New channel (WhatsApp)? One class. Works with all three message types immediately.
    }
}` }
      ] },
    { lang: 'java', title: 'Remote × Device (the textbook bridge)', code: `
// Classic GoF shape: Remote (abstraction) x Device (implementor)
interface Device {
    boolean isOn(); void power(boolean on);
    int volume(); void setVolume(int v);
}

class Tv implements Device {
    private boolean on; private int vol = 10;
    public boolean isOn() { return on; } public void power(boolean b) { on = b; }
    public int volume() { return vol; }  public void setVolume(int v) { vol = Math.max(0, Math.min(100, v)); }
}
class Radio implements Device {
    private boolean on; private int vol = 30;
    public boolean isOn() { return on; } public void power(boolean b) { on = b; }
    public int volume() { return vol; }  public void setVolume(int v) { vol = Math.max(0, Math.min(50, v)); } // radio caps at 50
}

class Remote {
    protected final Device device;
    Remote(Device d) { device = d; }
    void togglePower() { device.power(!device.isOn()); }
    void volumeUp() { device.setVolume(device.volume() + 10); }
}
class VoiceRemote extends Remote {          // refined abstraction adds features using only Device API
    VoiceRemote(Device d) { super(d); }
    void say(String cmd) {
        if (cmd.equals("mute")) device.setVolume(0);
        else if (cmd.equals("louder")) { volumeUp(); volumeUp(); }
    }
}

class RemoteDemo {
    public static void main(String[] args) {
        VoiceRemote r = new VoiceRemote(new Radio());
        r.togglePower(); r.say("louder");
        System.out.println("radio volume = " + r.device.volume());   // 50 (capped)
    }
}`,
      alt: [
        { lang: 'python', code: `from abc import ABC, abstractmethod


# Classic GoF shape: Remote (abstraction) x Device (implementor)
class Device(ABC):
    @abstractmethod
    def is_on(self) -> bool: ...

    @abstractmethod
    def power(self, on: bool) -> None: ...

    @abstractmethod
    def volume(self) -> int: ...

    @abstractmethod
    def set_volume(self, v: int) -> None: ...


class Tv(Device):
    def __init__(self) -> None:
        self._on = False
        self._vol = 10

    def is_on(self) -> bool:
        return self._on

    def power(self, on: bool) -> None:
        self._on = on

    def volume(self) -> int:
        return self._vol

    def set_volume(self, v: int) -> None:
        self._vol = max(0, min(100, v))


class Radio(Device):
    def __init__(self) -> None:
        self._on = False
        self._vol = 30

    def is_on(self) -> bool:
        return self._on

    def power(self, on: bool) -> None:
        self._on = on

    def volume(self) -> int:
        return self._vol

    def set_volume(self, v: int) -> None:
        self._vol = max(0, min(50, v))  # radio caps at 50


class Remote:
    def __init__(self, device: Device) -> None:
        self.device = device

    def toggle_power(self) -> None:
        self.device.power(not self.device.is_on())

    def volume_up(self) -> None:
        self.device.set_volume(self.device.volume() + 10)


class VoiceRemote(Remote):  # refined abstraction adds features using only the Device API
    def say(self, cmd: str) -> None:
        if cmd == "mute":
            self.device.set_volume(0)
        elif cmd == "louder":
            self.volume_up()
            self.volume_up()


if __name__ == "__main__":
    r = VoiceRemote(Radio())
    r.toggle_power()
    r.say("louder")
    print(f"radio volume = {r.device.volume()}")  # 50 (capped)` },
        { lang: 'ts', code: `// Classic GoF shape: Remote (abstraction) x Device (implementor)
interface Device {
  isOn(): boolean;
  power(on: boolean): void;
  volume(): number;
  setVolume(v: number): void;
}

class Tv implements Device {
  private on = false;
  private vol = 10;
  isOn(): boolean { return this.on; }
  power(b: boolean): void { this.on = b; }
  volume(): number { return this.vol; }
  setVolume(v: number): void { this.vol = Math.max(0, Math.min(100, v)); }
}

class Radio implements Device {
  private on = false;
  private vol = 30;
  isOn(): boolean { return this.on; }
  power(b: boolean): void { this.on = b; }
  volume(): number { return this.vol; }
  setVolume(v: number): void { this.vol = Math.max(0, Math.min(50, v)); } // radio caps at 50
}

class Remote {
  constructor(readonly device: Device) {}
  togglePower(): void { this.device.power(!this.device.isOn()); }
  volumeUp(): void { this.device.setVolume(this.device.volume() + 10); }
}

class VoiceRemote extends Remote { // refined abstraction adds features using only the Device API
  say(cmd: string): void {
    if (cmd === "mute") this.device.setVolume(0);
    else if (cmd === "louder") { this.volumeUp(); this.volumeUp(); }
  }
}

const r = new VoiceRemote(new Radio());
r.togglePower();
r.say("louder");
console.log(\`radio volume = \${r.device.volume()}\`); // 50 (capped)` },
        { lang: 'cpp', code: `// Classic GoF shape: Remote (abstraction) x Device (implementor)
class Device {
public:
    virtual ~Device() = default;
    virtual bool isOn() const = 0;
    virtual void power(bool on) = 0;
    virtual int volume() const = 0;
    virtual void setVolume(int v) = 0;
};

class Tv : public Device {
    bool on_ = false;
    int vol_ = 10;
public:
    bool isOn() const override { return on_; }
    void power(bool b) override { on_ = b; }
    int volume() const override { return vol_; }
    void setVolume(int v) override { vol_ = max(0, min(100, v)); }
};

class Radio : public Device {
    bool on_ = false;
    int vol_ = 30;
public:
    bool isOn() const override { return on_; }
    void power(bool b) override { on_ = b; }
    int volume() const override { return vol_; }
    void setVolume(int v) override { vol_ = max(0, min(50, v)); }   // radio caps at 50
};

class Remote {
protected:
    Device& device_;
public:
    explicit Remote(Device& d) : device_(d) {}
    virtual ~Remote() = default;
    void togglePower() { device_.power(!device_.isOn()); }
    void volumeUp() { device_.setVolume(device_.volume() + 10); }
    const Device& device() const { return device_; }
};

class VoiceRemote : public Remote {              // refined abstraction adds features using only the Device API
public:
    explicit VoiceRemote(Device& d) : Remote(d) {}
    void say(const string& cmd) {
        if (cmd == "mute") device_.setVolume(0);
        else if (cmd == "louder") { volumeUp(); volumeUp(); }
    }
};

int main() {
    Radio radio;
    VoiceRemote r(radio);
    r.togglePower();
    r.say("louder");
    cout << "radio volume = " << r.device().volume() << "\\n";   // 50 (capped)
}` },
  { lang: 'csharp', code: `
using System;

// Classic GoF shape: Remote (abstraction) x Device (implementor)
interface IDevice {
    bool IsOn(); void Power(bool on);
    int Volume(); void SetVolume(int v);
}

class Tv : IDevice {
    private bool on; private int vol = 10;
    public bool IsOn() { return on; } public void Power(bool b) { on = b; }
    public int Volume() { return vol; }  public void SetVolume(int v) { vol = Math.Max(0, Math.Min(100, v)); }
}
class Radio : IDevice {
    private bool on; private int vol = 30;
    public bool IsOn() { return on; } public void Power(bool b) { on = b; }
    public int Volume() { return vol; }  public void SetVolume(int v) { vol = Math.Max(0, Math.Min(50, v)); } // radio caps at 50
}

class Remote {
    protected readonly IDevice device;
    public Remote(IDevice d) { device = d; }
    public IDevice Device { get { return device; } }
    public void TogglePower() { device.Power(!device.IsOn()); }
    public void VolumeUp() { device.SetVolume(device.Volume() + 10); }
}
class VoiceRemote : Remote {          // refined abstraction adds features using only the IDevice API
    public VoiceRemote(IDevice d) : base(d) { }
    public void Say(string cmd) {
        if (cmd == "mute") device.SetVolume(0);
        else if (cmd == "louder") { VolumeUp(); VolumeUp(); }
    }
}

class Program {
    static void Main() {
        VoiceRemote r = new VoiceRemote(new Radio());
        r.TogglePower(); r.Say("louder");
        Console.WriteLine("radio volume = " + r.Device.Volume());   // 50 (capped)
    }
}` }
      ] }],
    codeTitle: ['Notification × Channel bridge', 'Remote × Device (the textbook bridge)'],
    viz: {
      title: 'From M × N class explosion to M + N with a bridge',
      input: 'Alert Reminder Promo | Email SMS Push',
      inputLabel: 'Message types | channels (1–4 each)',
      gen: function (input) {
        var halves = String(input || '').split('|');
        if (halves.length !== 2) throw new Error('Use the form: Alert Reminder | Email SMS (a | in the middle)');
        var A = words(halves[0], 'List 1–4 message types before the |', 4), I = words(halves[1], 'List 1–4 channels after the |', 4);
        var M = A.length, N = I.length, f = [];
        var rows = A.map(function (a) { return I.map(function (c) { return a + c; }); });
        f.push(F('<b>Inheritance only:</b> one class for every (message type, channel) pair = ' + M + ' × ' + N + ' = <b>' + (M * N) + ' classes</b>. Formatting logic for "' + A[0] + '" is copy-pasted into ' + N + ' classes.',
          [{ type: 'grid', label: 'subclass per combination', rowHead: A, colHead: I, rows: rows, hl: (function () { var h = {}; for (var c = 0; c < N; c++) h['0,' + c] = 'bad'; return h; })() }, VARS('count', { classes: M * N }, { classes: 'bad' })]));
        var rows2 = A.map(function (a) { return I.map(function (c) { return a + c; }).concat([a + 'WhatsApp']); });
        var h2 = {}; for (var r = 0; r < M; r++) h2[r + ',' + N] = 'bad';
        f.push(F('Product asks for <b>WhatsApp</b>. With inheritance you must write ' + M + ' new classes (one per message type) → ' + (M * (N + 1)) + ' total. The table grows in <i>both</i> directions forever.',
          [{ type: 'grid', label: 'adding one channel', rowHead: A, colHead: I.concat(['WhatsApp']), rows: rows2, hl: h2 }, VARS('count', { classes: M * (N + 1), newClassesForOneChannel: M }, { newClassesForOneChannel: 'bad' })]));
        var nodes = [B('NT', 'Notification', 22, 6), B('CH', 'Channel', 78, 6)], edges = [['NT', 'CH', 'has-a (the bridge)']];
        A.forEach(function (a, k) { nodes.push(B('A' + k, a, 6 + k * (36 / Math.max(1, M - 1 || 1)), 50)); edges.push(['A' + k, 'NT', 'extends']); });
        I.forEach(function (c, k) { nodes.push(B('I' + k, c, 60 + k * (34 / Math.max(1, N - 1 || 1)), 50)); edges.push(['I' + k, 'CH', 'implements']); });
        if (M === 1) nodes[2].x = 22;
        if (N === 1) nodes[2 + M].x = 78;
        f.push(F('<b>Bridge:</b> split into two hierarchies. Left = <i>what</i> (abstraction), right = <i>how</i> (implementor). The only link is one field, <code>Notification.channel</code>. Classes = ' + M + ' + ' + N + ' = <b>' + (M + N) + '</b> (+2 small base types).',
          [G('Two independent hierarchies joined by one field', nodes, edges, { hl: { NT: 'sel', CH: 'sel' }, ehl: { 'NT-CH': 'sel' }, tags: { NT: 'abstraction', CH: '«interface» implementor' } })]));
        f.push(F('The saving grows fast: with 5 message types and 5 channels inheritance needs 25 classes, the bridge needs 10. Every new channel is <b>one</b> class that instantly works with every message type.',
          [{ type: 'bars', label: 'classes needed', values: [M * N, M + N, 25, 10], texts: [String(M * N), String(M + N), '25', '10'], idxLabels: ['yours: M×N', 'yours: M+N', '5×5', '5+5'], hl: { 0: 'bad', 1: 'ok', 2: 'bad', 3: 'ok' } }]));
        var rn = [B('CL', 'Client', 10, 30), B('AB', A[0], 45, 30), B('IM', I[0], 85, 30)];
        var re = [['CL', 'AB', 'send(to, msg)'], ['AB', 'IM', 'deliver(to, text)']];
        f.push(F('<b>Runtime call, step 1.</b> Client builds <code>new ' + A[0] + '(new ' + I[0] + 'Channel())</code> and calls <code>send(to, msg)</code>. The ' + A[0] + ' object runs its <i>abstraction-level</i> logic: formatting, priority, opt-out text…',
          [G('Call flow across the bridge', rn, re, { hl: { CL: 'done', AB: 'cur' }, ehl: { 'CL-AB': 'cur' } }), VARS(A[0] + ' object', { channel: I[0] + 'Channel', step: 'format message' }, { step: 'cur' })]));
        f.push(F('<b>Step 2.</b> It crosses the bridge: <code>channel.deliver(to, text)</code>. Now the <i>implementor</i> does channel-specific work (SMTP, SMS 160-char limit, push token lookup). ' + A[0] + ' has no idea which one it is.',
          [G('Call flow across the bridge', rn, re, { hl: { AB: 'done', IM: 'cur' }, ehl: { 'CL-AB': 'done', 'AB-IM': 'cur' } }), VARS(I[0] + ' object', { step: 'deliver via ' + I[0] }, { step: 'cur' })]));
        if (N > 1) {
          var rn2 = [B('CL', 'Client', 10, 30), B('AB', A[0], 45, 30), B('IM', I[1], 85, 30)];
          f.push(F('<b>Swap at runtime.</b> The user switched preference to ' + I[1] + '. Same ' + A[0] + ' class, different implementor object: <code>new ' + A[0] + '(new ' + I[1] + 'Channel())</code>. No new class, no if/else.',
            [G('Same abstraction, other implementor', rn2, re, { hl: { AB: 'ok', IM: 'ok' }, ehl: { 'CL-AB': 'ok', 'AB-IM': 'ok' } })]));
        }
        f.push(F('<b>Summary:</b> any of the ' + M + ' message types × any of the ' + N + ' channels = ' + (M * N) + ' behaviours from only ' + (M + N) + ' classes. Teams owning channels and teams owning message rules never edit each other\'s code.',
          [{ type: 'table', label: 'which side changes?', columns: ['Change request', 'Touch'], rows: [['new channel (WhatsApp)', 'right side only: 1 class'], ['new message type (Digest)', 'left side only: 1 class'], ['SMS provider API changed', 'SmsChannel only']], hl: { 0: 'ok', 1: 'ok', 2: 'ok' } }]));
        return f;
      }
    },
    examples: [
      { title: 'JDBC: the API is the abstraction, drivers are implementors', html: `<p>Your code calls <code>DriverManager.getConnection(url)</code> and uses <code>Connection</code>/<code>PreparedStatement</code>. The Postgres or MySQL driver jar provides the implementation classes. Switch databases by changing the URL and the jar — application code is untouched. Higher-level abstractions (JdbcTemplate, JPA) can be added on the left side without drivers knowing.</p>` },
      { title: 'Shapes × renderers', html: `<p><code>Shape</code> (Circle, Square) holds a <code>Renderer</code> (VectorRenderer, RasterRenderer). <code>Circle.draw()</code> calls <code>renderer.renderCircle(x, y, r)</code>. Add a <code>Triangle</code>: one class. Add an <code>SvgRenderer</code>: one class. Without the bridge: VectorCircle, RasterCircle, VectorSquare, RasterSquare…</p>`, code: { lang: 'java', code: `interface Renderer { void circle(double r); }
class VectorRenderer implements Renderer { public void circle(double r) { System.out.println("vector circle r=" + r); } }
class RasterRenderer implements Renderer { public void circle(double r) { System.out.println("pixels for circle r=" + r); } }
abstract class Shape { protected final Renderer renderer; Shape(Renderer r) { renderer = r; } abstract void draw(); }
class Circle extends Shape { private final double r; Circle(Renderer rd, double r) { super(rd); this.r = r; } void draw() { renderer.circle(r); } }`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod


class Renderer(ABC):
    @abstractmethod
    def circle(self, r: float) -> None: ...


class VectorRenderer(Renderer):
    def circle(self, r: float) -> None:
        print(f"vector circle r={r}")


class RasterRenderer(Renderer):
    def circle(self, r: float) -> None:
        print(f"pixels for circle r={r}")


class Shape(ABC):
    def __init__(self, renderer: Renderer) -> None:
        self._renderer = renderer

    @abstractmethod
    def draw(self) -> None: ...


class Circle(Shape):
    def __init__(self, renderer: Renderer, r: float) -> None:
        super().__init__(renderer)
        self._r = r

    def draw(self) -> None:
        self._renderer.circle(self._r)` },
          { lang: 'ts', code: `interface Renderer { circle(r: number): void; }
class VectorRenderer implements Renderer { circle(r: number): void { console.log(\`vector circle r=\${r}\`); } }
class RasterRenderer implements Renderer { circle(r: number): void { console.log(\`pixels for circle r=\${r}\`); } }
abstract class Shape {
  protected constructor(protected readonly renderer: Renderer) {}
  abstract draw(): void;
}
class Circle extends Shape {
  constructor(renderer: Renderer, private readonly r: number) { super(renderer); }
  draw(): void { this.renderer.circle(this.r); }
}` },
          { lang: 'cpp', code: `class Renderer {
public:
    virtual ~Renderer() = default;
    virtual void circle(double r) const = 0;
};
class VectorRenderer : public Renderer {
public:
    void circle(double r) const override { cout << "vector circle r=" << r << "\\n"; }
};
class RasterRenderer : public Renderer {
public:
    void circle(double r) const override { cout << "pixels for circle r=" << r << "\\n"; }
};
class Shape {
protected:
    const Renderer& renderer_;
    explicit Shape(const Renderer& r) : renderer_(r) {}
public:
    virtual ~Shape() = default;
    virtual void draw() const = 0;
};
class Circle : public Shape {
    double r_;
public:
    Circle(const Renderer& rd, double r) : Shape(rd), r_(r) {}
    void draw() const override { renderer_.circle(r_); }
};` },
  { lang: 'csharp', code: `
using System;

interface IRenderer { void Circle(double r); }
class VectorRenderer : IRenderer { public void Circle(double r) { Console.WriteLine("vector circle r=" + r); } }
class RasterRenderer : IRenderer { public void Circle(double r) { Console.WriteLine("pixels for circle r=" + r); } }
abstract class Shape { protected readonly IRenderer renderer; protected Shape(IRenderer r) { renderer = r; } public abstract void Draw(); }
class Circle : Shape { private readonly double r; public Circle(IRenderer rd, double r) : base(rd) { this.r = r; } public override void Draw() { renderer.Circle(r); } }` }
        ] } },
      { title: 'Cross-platform UI windows', html: `<p><code>Window</code> → <code>DialogWindow</code>, <code>IconWindow</code> (abstraction) over <code>WindowImpl</code> → <code>WindowsImpl</code>, <code>MacImpl</code>, <code>LinuxImpl</code> (implementor). The original GoF example. Today: Flutter/React Native widgets (abstraction) over platform renderers.</p>` },
      { title: 'Payment flow × gateway', html: `<p>Flows: OneTimePayment, Subscription, Refund. Gateways: Razorpay, Stripe, PayPal. <code>Subscription</code> knows about billing cycles and retries; the <code>PaymentGateway</code> implementor knows the HTTP API. Note how each gateway implementor might itself be an <b>Adapter</b> over a vendor SDK — Bridge (designed up front) and Adapter (fitting a third party) often appear together.</p>` }
    ],
    deepDive: `<p><b>Designing the implementor interface</b> is the hard part. It must be <i>primitive</i> and stable — operations every implementation can support (<code>deliver(to, text)</code>, <code>circle(r)</code>) — while the abstraction builds rich behaviour on top. If the implementor interface is too high-level, every implementor duplicates logic; if it leaks one platform's concepts (an SMS-only "sender id"), other implementors cannot satisfy it. Capability flags (<code>supportsAttachments()</code>) are a pragmatic escape hatch, but use them sparingly.</p>
      <p><b>Who wires the pair?</b> Usually a factory or DI container (<code>Notification n = factory.create(type, user.preferredChannel())</code>), sometimes an Abstract Factory that produces a matching family of implementors for one platform.</p>
      <p><b>Bridge ≈ composition over inheritance, deliberately applied.</b> Whenever a class hierarchy is about to grow along two axes, pull one axis out behind an interface. This is also how hexagonal architecture separates the domain ("what") from adapters ("how"). <b>Cost:</b> one more indirection and two hierarchies to understand; for a single dimension that will never grow, a bridge is over-engineering (YAGNI).</p>
      <p><b>Runtime switching and thread safety.</b> If the implementor can be swapped at runtime (a <code>setChannel</code> method), make the field <code>volatile</code> or immutable-replace the whole abstraction object; otherwise in-flight calls may see a half-updated state.</p>`,
    aiEra: `<p><b>What AI changes:</b> the clearest modern bridge is an <b>LLM client abstraction over providers</b>: app-level features (Summarizer, Classifier, ChatAgent — the abstraction) talk to a <code>ModelProvider</code> interface (Anthropic, OpenAI, a local model — the implementors). Product logic evolves independently of which model runs it, and you can route by cost or latency at runtime. Same for vector stores behind a <code>VectorIndex</code> interface.</p>
      <p><b>Use AI as a partner:</b> <code>My classes are named PdfSalesReport, CsvSalesReport, PdfInventoryReport… refactor into a Bridge and show the before/after class count.</code> <b>Where AI goes wrong:</b> it designs the implementor interface around the first provider's features (leaky), confuses Bridge with Adapter in explanations, and adds a bridge to a single-dimension problem. <b>What you must still own:</b> spotting the two axes of change in fuzzy requirements and designing a minimal, stable implementor interface.</p>`,
    problems: [{
      title: 'Reports × Export Formats Without Class Explosion',
      level: 'Medium', tags: ['bridge', 'composition over inheritance'], companies: ['Microsoft', 'Salesforce', 'Zoho'],
      statement: `<p>A BI tool has report types <b>SalesReport</b> (rows of region + revenue) and <b>InventoryReport</b> (rows of sku + qty), and export formats <b>CSV</b> and <b>Markdown table</b>. Next quarter adds a <b>HeadcountReport</b> and an <b>HTML</b> exporter. Design classes so each new report or format is exactly one new class, and write <code>String export()</code>.</p>`,
      constraints: `<p>Reports decide the title, columns and rows; formats decide only how a title + header + rows are written. No report class may mention CSV/Markdown.</p>`,
      example: `<p><code>new SalesReport(new CsvFormat(), data).export()</code> → ${H.c('b', '"region,revenue / North,1200 / South,900"')}. Same report with <code>new MarkdownFormat()</code> → ${H.c('g', '"| region | revenue |" …')}. 2 reports × 2 formats = 4 behaviours from 4 classes; after next quarter, 9 behaviours from 6.</p>`,
      brute: { why: `<p>One subclass per pair: <code>CsvSalesReport</code>, <code>MarkdownSalesReport</code>, <code>CsvInventoryReport</code>, <code>MarkdownInventoryReport</code>. Next quarter needs 5 more classes (3 × 3 = 9 total). Formatting code (escaping commas, pipes) is duplicated per report, so a CSV escaping bug must be fixed in every CSV class.</p>`, code: { lang: 'java', code: `class CsvSalesReport {
    String export(Map<String, Integer> revenue) {
        StringBuilder sb = new StringBuilder("region,revenue");
        revenue.forEach((r, v) -> sb.append(" / ").append(r).append(',').append(v));
        return sb.toString();
    }
}
class MarkdownSalesReport {
    String export(Map<String, Integer> revenue) {
        StringBuilder sb = new StringBuilder("| region | revenue |");
        revenue.forEach((r, v) -> sb.append(" | ").append(r).append(" | ").append(v).append(" |"));
        return sb.toString();
    }
}
// ...and the same two again for InventoryReport, with copied formatting code`, alt: [
                { lang: 'python', code: `
class CsvSalesReport:
    def export(self, revenue):
        sb = "region,revenue"
        for r, v in revenue.items(): sb += f" / {r},{v}"
        return sb

class MarkdownSalesReport:
    def export(self, revenue):
        sb = "| region | revenue |"
        for r, v in revenue.items(): sb += f" | {r} | {v} |"
        return sb
# ...and the same two again for InventoryReport, with copied formatting code` },
                { lang: 'ts', code: `
class CsvSalesReport {
    export(revenue: Map<string, number>): string {
        let sb = "region,revenue";
        revenue.forEach((v, r) => { sb += " / " + r + "," + v; });
        return sb;
    }
}
class MarkdownSalesReport {
    export(revenue: Map<string, number>): string {
        let sb = "| region | revenue |";
        revenue.forEach((v, r) => { sb += " | " + r + " | " + v + " |"; });
        return sb;
    }
}
// ...and the same two again for InventoryReport, with copied formatting code` },
                { lang: 'cpp', code: `
class CsvSalesReport {
public:
    string exportReport(const map<string, int>& revenue) {
        string sb = "region,revenue";
        for (auto& [r, v] : revenue) sb += " / " + r + "," + to_string(v);
        return sb;
    }
};
class MarkdownSalesReport {
public:
    string exportReport(const map<string, int>& revenue) {
        string sb = "| region | revenue |";
        for (auto& [r, v] : revenue) sb += " | " + r + " | " + to_string(v) + " |";
        return sb;
    }
};
// ...and the same two again for InventoryReport, with copied formatting code` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Text;

class CsvSalesReport {
    public string Export(Dictionary<string, int> revenue) {
        StringBuilder sb = new StringBuilder("region,revenue");
        foreach (var kv in revenue) sb.Append(" / ").Append(kv.Key).Append(',').Append(kv.Value);
        return sb.ToString();
    }
}
class MarkdownSalesReport {
    public string Export(Dictionary<string, int> revenue) {
        StringBuilder sb = new StringBuilder("| region | revenue |");
        foreach (var kv in revenue) sb.Append(" | ").Append(kv.Key).Append(" | ").Append(kv.Value).Append(" |");
        return sb.ToString();
    }
}
// ...and the same two again for InventoryReport, with copied formatting code` }
              ] } },
      mcq: { q: 'Which side of the bridge should own "escape commas inside a CSV cell"?', options: ['Every report class', 'The CsvFormat implementor', 'The client', 'A static utility called by reports'], answer: 1, explain: 'Escaping is a property of the output format (the "how"), so it lives in the implementor and every report gets it for free.' },
      hints: [`<p>Hint 1: Two independent axes: <i>what data</i> (report) and <i>how it is written</i> (format). Make each its own hierarchy.</p>`, `<p>Hint 2: Implementor interface <code>Format { String render(String title, List&lt;String&gt; header, List&lt;List&lt;String&gt;&gt; rows); }</code>. Abstraction <code>Report</code> holds a <code>Format</code>.</p>`, `<p>Hint 3: <code>Report.export()</code> is final: it asks subclasses for title/header/rows (template method) and passes them across the bridge. CSV escapes cells containing commas or quotes by quoting and doubling quotes.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "region,revenue / North,1200 / South,900\n## Sales | region | revenue | | North | 1200 | | South | 900 |\nsku,qty / \"SKU-1, large\",4\n## Inventory | sku | qty | | SKU-1, large | 4 |\n" }] },
      solution: {
        approach: `<p><b>Implementor:</b> <code>Format.render(title, header, rows)</code> with <code>CsvFormat</code> and <code>MarkdownFormat</code>. <b>Abstraction:</b> <code>abstract class Report</code> holding a <code>Format</code>, with a final <code>export()</code> that gathers <code>title()</code>, <code>header()</code>, <code>rows()</code> from the subclass and delegates rendering across the bridge. Adding <code>HtmlFormat</code> or <code>HeadcountReport</code> is one class each; nothing existing changes.</p>`,
        code: `interface Format {
    String render(String title, List<String> header, List<List<String>> rows);
}

class CsvFormat implements Format {
    private static String cell(String s) {
        return (s.contains(",") || s.contains("\\"")) ? "\\"" + s.replace("\\"", "\\"\\"") + "\\"" : s;
    }
    public String render(String title, List<String> header, List<List<String>> rows) {
        StringJoiner out = new StringJoiner(" / ");
        out.add(header.stream().map(CsvFormat::cell).collect(Collectors.joining(",")));
        for (List<String> r : rows) out.add(r.stream().map(CsvFormat::cell).collect(Collectors.joining(",")));
        return out.toString();
    }
}

class MarkdownFormat implements Format {
    public String render(String title, List<String> header, List<List<String>> rows) {
        StringJoiner out = new StringJoiner(" ");
        out.add("## " + title);
        out.add("| " + String.join(" | ", header) + " |");
        for (List<String> r : rows) out.add("| " + String.join(" | ", r) + " |");
        return out.toString();
    }
}

abstract class Report {
    private final Format format;                      // the bridge
    protected Report(Format format) { this.format = format; }
    protected abstract String title();
    protected abstract List<String> header();
    protected abstract List<List<String>> rows();
    public final String export() { return format.render(title(), header(), rows()); }
}

class SalesReport extends Report {
    private final Map<String, Integer> revenue;
    SalesReport(Format f, Map<String, Integer> revenue) { super(f); this.revenue = new TreeMap<>(revenue); }
    protected String title() { return "Sales"; }
    protected List<String> header() { return List.of("region", "revenue"); }
    protected List<List<String>> rows() {
        List<List<String>> r = new ArrayList<>();
        revenue.forEach((k, v) -> r.add(List.of(k, String.valueOf(v))));
        return r;
    }
}

class InventoryReport extends Report {
    private final Map<String, Integer> stock;
    InventoryReport(Format f, Map<String, Integer> stock) { super(f); this.stock = new TreeMap<>(stock); }
    protected String title() { return "Inventory"; }
    protected List<String> header() { return List.of("sku", "qty"); }
    protected List<List<String>> rows() {
        List<List<String>> r = new ArrayList<>();
        stock.forEach((k, v) -> r.add(List.of(k, String.valueOf(v))));
        return r;
    }

    public static void main(String[] args) {
        Map<String, Integer> sales = Map.of("North", 1200, "South", 900);
        System.out.println(new SalesReport(new CsvFormat(), sales).export());
        System.out.println(new SalesReport(new MarkdownFormat(), sales).export());
        System.out.println(new InventoryReport(new CsvFormat(), Map.of("SKU-1, large", 4)).export()); // escaped
        System.out.println(new InventoryReport(new MarkdownFormat(), Map.of("SKU-1, large", 4)).export());
    }
}`,
        alt: [
          { lang: 'python', code: `from abc import ABC, abstractmethod


# ---- Implementor side of the bridge ----
class Format(ABC):
    @abstractmethod
    def render(self, title: str, header: list[str], rows: list[list[str]]) -> str: ...


class CsvFormat(Format):
    @staticmethod
    def _cell(s: str) -> str:
        if "," in s or '"' in s:
            return '"' + s.replace('"', '""') + '"'
        return s

    def render(self, title: str, header: list[str], rows: list[list[str]]) -> str:
        lines = [header, *rows]
        return " / ".join(",".join(self._cell(c) for c in line) for line in lines)


class MarkdownFormat(Format):
    def render(self, title: str, header: list[str], rows: list[list[str]]) -> str:
        parts = [f"## {title}", f"| {' | '.join(header)} |"]
        parts += [f"| {' | '.join(r)} |" for r in rows]
        return " ".join(parts)


# ---- Abstraction side of the bridge ----
class Report(ABC):
    def __init__(self, fmt: Format) -> None:
        self._format = fmt  # the bridge

    @abstractmethod
    def title(self) -> str: ...

    @abstractmethod
    def header(self) -> list[str]: ...

    @abstractmethod
    def rows(self) -> list[list[str]]: ...

    def export(self) -> str:  # template method: reports decide WHAT, formats decide HOW
        return self._format.render(self.title(), self.header(), self.rows())


class SalesReport(Report):
    def __init__(self, fmt: Format, revenue: dict[str, int]) -> None:
        super().__init__(fmt)
        self._revenue = dict(sorted(revenue.items()))

    def title(self) -> str:
        return "Sales"

    def header(self) -> list[str]:
        return ["region", "revenue"]

    def rows(self) -> list[list[str]]:
        return [[k, str(v)] for k, v in self._revenue.items()]


class InventoryReport(Report):
    def __init__(self, fmt: Format, stock: dict[str, int]) -> None:
        super().__init__(fmt)
        self._stock = dict(sorted(stock.items()))

    def title(self) -> str:
        return "Inventory"

    def header(self) -> list[str]:
        return ["sku", "qty"]

    def rows(self) -> list[list[str]]:
        return [[k, str(v)] for k, v in self._stock.items()]


if __name__ == "__main__":
    sales = {"North": 1200, "South": 900}
    print(SalesReport(CsvFormat(), sales).export())
    print(SalesReport(MarkdownFormat(), sales).export())
    print(InventoryReport(CsvFormat(), {"SKU-1, large": 4}).export())  # escaped
    print(InventoryReport(MarkdownFormat(), {"SKU-1, large": 4}).export())` },
          { lang: 'ts', code: `// ---- Implementor side of the bridge ----
interface Format {
  render(title: string, header: string[], rows: string[][]): string;
}

class CsvFormat implements Format {
  private static cell(s: string): string {
    return s.includes(",") || s.includes('"') ? \`"\${s.replaceAll('"', '""')}"\` : s;
  }

  render(_title: string, header: string[], rows: string[][]): string {
    return [header, ...rows].map((line) => line.map(CsvFormat.cell).join(",")).join(" / ");
  }
}

class MarkdownFormat implements Format {
  render(title: string, header: string[], rows: string[][]): string {
    return [\`## \${title}\`, \`| \${header.join(" | ")} |\`, ...rows.map((r) => \`| \${r.join(" | ")} |\`)].join(" ");
  }
}

// ---- Abstraction side of the bridge ----
abstract class Report {
  protected constructor(private readonly format: Format) {} // the bridge

  protected abstract title(): string;
  protected abstract header(): string[];
  protected abstract rows(): string[][];

  // template method: reports decide WHAT, formats decide HOW
  export(): string {
    return this.format.render(this.title(), this.header(), this.rows());
  }
}

// Map iterates in insertion order, so sort the keys to get the same rows in every language
function sortedRows(data: Record<string, number>): string[][] {
  return Object.keys(data).sort().map((k) => [k, String(data[k])]);
}

class SalesReport extends Report {
  constructor(format: Format, private readonly revenue: Record<string, number>) {
    super(format);
  }
  protected title(): string { return "Sales"; }
  protected header(): string[] { return ["region", "revenue"]; }
  protected rows(): string[][] { return sortedRows(this.revenue); }
}

class InventoryReport extends Report {
  constructor(format: Format, private readonly stock: Record<string, number>) {
    super(format);
  }
  protected title(): string { return "Inventory"; }
  protected header(): string[] { return ["sku", "qty"]; }
  protected rows(): string[][] { return sortedRows(this.stock); }
}

const sales = { North: 1200, South: 900 };
console.log(new SalesReport(new CsvFormat(), sales).export());
console.log(new SalesReport(new MarkdownFormat(), sales).export());
console.log(new InventoryReport(new CsvFormat(), { "SKU-1, large": 4 }).export()); // escaped
console.log(new InventoryReport(new MarkdownFormat(), { "SKU-1, large": 4 }).export());` },
          { lang: 'cpp', code: `using Row = vector<string>;

// ---- Implementor side of the bridge ----
class Format {
public:
    virtual ~Format() = default;
    virtual string render(const string& title, const Row& header, const vector<Row>& rows) const = 0;
};

class CsvFormat : public Format {
    static string cell(const string& s) {
        if (s.find(',') == string::npos && s.find('"') == string::npos) return s;
        string out = "\\"";
        for (char c : s) { if (c == '"') out += '"'; out += c; }
        return out + "\\"";
    }
    static string line(const Row& r) {
        string out;
        for (size_t i = 0; i < r.size(); i++) out += (i ? "," : "") + cell(r[i]);
        return out;
    }
public:
    string render(const string&, const Row& header, const vector<Row>& rows) const override {
        string out = line(header);
        for (const Row& r : rows) out += " / " + line(r);
        return out;
    }
};

class MarkdownFormat : public Format {
    static string line(const Row& r) {
        string out = "|";
        for (const string& c : r) out += " " + c + " |";
        return out;
    }
public:
    string render(const string& title, const Row& header, const vector<Row>& rows) const override {
        string out = "## " + title + " " + line(header);
        for (const Row& r : rows) out += " " + line(r);
        return out;
    }
};

// ---- Abstraction side of the bridge ----
class Report {
    unique_ptr<Format> format_;                              // the bridge
protected:
    explicit Report(unique_ptr<Format> f) : format_(std::move(f)) {}
    virtual string title() const = 0;
    virtual Row header() const = 0;
    virtual vector<Row> rows() const = 0;
public:
    virtual ~Report() = default;
    string exportText() const { return format_->render(title(), header(), rows()); }   // template method
};

vector<Row> toRows(const map<string, int>& data) {          // std::map is already sorted by key
    vector<Row> rows;
    for (const auto& [k, v] : data) rows.push_back({k, to_string(v)});
    return rows;
}

class SalesReport : public Report {
    map<string, int> revenue_;
public:
    SalesReport(unique_ptr<Format> f, map<string, int> revenue) : Report(std::move(f)), revenue_(std::move(revenue)) {}
protected:
    string title() const override { return "Sales"; }
    Row header() const override { return {"region", "revenue"}; }
    vector<Row> rows() const override { return toRows(revenue_); }
};

class InventoryReport : public Report {
    map<string, int> stock_;
public:
    InventoryReport(unique_ptr<Format> f, map<string, int> stock) : Report(std::move(f)), stock_(std::move(stock)) {}
protected:
    string title() const override { return "Inventory"; }
    Row header() const override { return {"sku", "qty"}; }
    vector<Row> rows() const override { return toRows(stock_); }
};

int main() {
    map<string, int> sales{{"North", 1200}, {"South", 900}};
    cout << SalesReport(make_unique<CsvFormat>(), sales).exportText() << "\\n";
    cout << SalesReport(make_unique<MarkdownFormat>(), sales).exportText() << "\\n";
    cout << InventoryReport(make_unique<CsvFormat>(), {{"SKU-1, large", 4}}).exportText() << "\\n";       // escaped
    cout << InventoryReport(make_unique<MarkdownFormat>(), {{"SKU-1, large", 4}}).exportText() << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

interface IFormat {
    string Render(string title, List<string> header, List<List<string>> rows);
}

class CsvFormat : IFormat {
    private static string Cell(string s) {
        return (s.Contains(",") || s.Contains("\\"")) ? "\\"" + s.Replace("\\"", "\\"\\"") + "\\"" : s;
    }
    public string Render(string title, List<string> header, List<List<string>> rows) {
        List<string> lines = new List<string>();
        lines.Add(string.Join(",", header.Select(Cell)));
        foreach (List<string> r in rows) lines.Add(string.Join(",", r.Select(Cell)));
        return string.Join(" / ", lines);
    }
}

class MarkdownFormat : IFormat {
    public string Render(string title, List<string> header, List<List<string>> rows) {
        List<string> parts = new List<string>();
        parts.Add("## " + title);
        parts.Add("| " + string.Join(" | ", header) + " |");
        foreach (List<string> r in rows) parts.Add("| " + string.Join(" | ", r) + " |");
        return string.Join(" ", parts);
    }
}

abstract class Report {
    private readonly IFormat format;                      // the bridge
    protected Report(IFormat format) { this.format = format; }
    protected abstract string Title();
    protected abstract List<string> Header();
    protected abstract List<List<string>> Rows();
    public string Export() { return format.Render(Title(), Header(), Rows()); }
}

class SalesReport : Report {
    private readonly SortedDictionary<string, int> revenue;
    public SalesReport(IFormat f, Dictionary<string, int> revenue) : base(f) { this.revenue = new SortedDictionary<string, int>(revenue, StringComparer.Ordinal); }
    protected override string Title() { return "Sales"; }
    protected override List<string> Header() { return new List<string> { "region", "revenue" }; }
    protected override List<List<string>> Rows() {
        return revenue.Select(kv => new List<string> { kv.Key, kv.Value.ToString() }).ToList();
    }
}

class InventoryReport : Report {
    private readonly SortedDictionary<string, int> stock;
    public InventoryReport(IFormat f, Dictionary<string, int> stock) : base(f) { this.stock = new SortedDictionary<string, int>(stock, StringComparer.Ordinal); }
    protected override string Title() { return "Inventory"; }
    protected override List<string> Header() { return new List<string> { "sku", "qty" }; }
    protected override List<List<string>> Rows() {
        return stock.Select(kv => new List<string> { kv.Key, kv.Value.ToString() }).ToList();
    }
}

class Program {
    static void Main() {
        var sales = new Dictionary<string, int> { { "North", 1200 }, { "South", 900 } };
        Console.WriteLine(new SalesReport(new CsvFormat(), sales).Export());
        Console.WriteLine(new SalesReport(new MarkdownFormat(), sales).Export());
        var inv = new Dictionary<string, int> { { "SKU-1, large", 4 } };
        Console.WriteLine(new InventoryReport(new CsvFormat(), inv).Export()); // escaped
        Console.WriteLine(new InventoryReport(new MarkdownFormat(), inv).Export());
    }
}` }
        ],
        complexity: `<p>Export is O(cells). Class count M + N instead of M × N; each change touches one class.</p>`,
        followUps: ['Add HtmlFormat — which existing classes change? (None.)', 'A PDF format needs page breaks every 50 rows — does the implementor interface still fit?', 'Let the user pick the format at runtime from a dropdown — where does the wiring happen?']
      }
    }]
  });
  /* =====================================================================
     TOPIC 7 — FLYWEIGHT
     ===================================================================== */
  var FLY_CODE = 'static TreeType of(String name) {\n' +
    '  return CACHE.computeIfAbsent(name,     // look in the pool\n' +
    '      n -> new TreeType(n, loadTexture(n))); // create ONLY if missing\n' +
    '}\n' +
    'void plant(int x, int y, String kind) {\n' +
    '  trees.add(new Tree(x, y, TreeType.of(kind))); // tiny context object\n' +
    '}';

  topics.push({
    title: 'Flyweight — Share What Is Identical',
    analogy: `<p>A library owns <b>one</b> copy of each dictionary on the reference shelf. Two hundred students "use the dictionary" — they do not each get a personal printed copy. What is different for each student (which page they are on, where they sit) they keep in their own head; what is identical (the book) is <b>shared</b>.</p>
      <p>Or think of a printed newspaper: the letter "e" appears 40 000 times, but the printer has <b>one</b> "e" stamp design. Each occurrence only records <i>where</i> it is printed.</p>`,
    explain: `<p><b>The problem.</b> A game draws a forest of <b>1 000 000 trees</b>. If every tree object stores its own mesh and 2 MB texture, memory is 2 TB — impossible. But there are only <b>3 kinds</b> of tree: oak, pine, birch. Most of the data is <i>repeated</i>.</p>
      <p><b>The fix.</b> Split each object's state in two:</p>
      ${H.table(['', 'Intrinsic state', 'Extrinsic state'], [['What', 'identical for many objects', 'unique to each object'], ['Tree example', 'species name, colour, texture, mesh', 'x, y position, age'], ['Stored in', '<b>shared flyweight</b> (one per species)', 'small context object or passed in as a parameter'], ['Must be', H.c('g', 'immutable'), 'anything']])}
      <p>A <b>flyweight factory</b> (a map) hands out the shared objects: ask for "oak" → if the pool has it, return it; else create, store, return. Each tree now holds two ints and one <i>reference</i>.</p>
      ${H.kv([['Naive', '1 000 000 × ~2 MB ≈ 2 TB'], ['Flyweight', '3 × 2 MB + 1 000 000 × ~24 B ≈ 30 MB']], { label: 'memory', hl: { Flyweight: 'g', Naive: 'r' } })}
      <p><b>Rules that make it safe:</b> (1) flyweights are <b>immutable</b> — if one tree could change "oak"'s colour, every oak would change; (2) clients never call <code>new TreeType</code> directly, only the factory; (3) the extrinsic state is passed in when needed (<code>type.draw(canvas, x, y)</code>).</p>
      <p><b>Already in the standard libraries:</b> ${H.chips(['Integer.valueOf(-128..127) cache', 'String literal pool / intern()', 'Boolean.TRUE / FALSE', 'Enum constants', 'java.time.ZoneId / Charset lookups', 'Python: small ints -5..256 and sys.intern()', 'JavaScript: Symbol.for() registry'], { label: 'Built-in flyweights' })} — in Java that is why <code>Integer.valueOf(100) == Integer.valueOf(100)</code> is <code>true</code> but <code>Integer.valueOf(1000) == Integer.valueOf(1000)</code> is usually <code>false</code>.</p>`,
    clues: ['"<b>millions</b> of small objects" / "out of memory" / "memory footprint" in the constraints', '"many objects share the same data": characters with same font, trees of same species, bullets of same type, map tiles', '"the duplicated part never changes" (immutable textures, styles, configurations)', '"cache and reuse objects by key" / "interning"', '"particle system", "text editor glyphs", "chess pieces across 10 000 concurrent games"', 'a field-by-field estimate shows most bytes are repeated data'],
    code: [{ lang: 'java', title: 'Forest of trees sharing TreeType flyweights', code: `
// Flyweight: INTRINSIC, shared, immutable
record TreeType(String name, String color, byte[] texture) {
    void draw(int x, int y) {          // extrinsic state passed in
        System.out.println("draw " + name + " (" + color + ") at " + x + "," + y);
    }
}

// Flyweight factory: guarantees one TreeType per key
final class TreeTypes {
    private static final Map<String, TreeType> CACHE = new ConcurrentHashMap<>();
    private TreeTypes() {}

    static TreeType of(String name, String color) {
        return CACHE.computeIfAbsent(name + "|" + color,
            k -> new TreeType(name, color, new byte[2 * 1024 * 1024]));   // "2 MB texture" loaded once
    }
    static int poolSize() { return CACHE.size(); }
}

// Context: EXTRINSIC, one per tree, tiny
record Tree(int x, int y, TreeType type) {
    void draw() { type.draw(x, y); }
}

class Forest {
    private final List<Tree> trees = new ArrayList<>();

    void plant(int x, int y, String name, String color) {
        trees.add(new Tree(x, y, TreeTypes.of(name, color)));
    }

    public static void main(String[] args) {
        Forest f = new Forest();
        Random rnd = new Random(42);
        String[] kinds = {"oak", "pine", "birch"};
        for (int i = 0; i < 100_000; i++) f.plant(rnd.nextInt(1000), rnd.nextInt(1000), kinds[i % 3], "green");
        System.out.println(f.trees.size() + " trees share " + TreeTypes.poolSize() + " TreeType objects");
        // 100000 trees share 3 TreeType objects (≈6 MB textures instead of ≈200 GB)
    }
}`,
      alt: [
        { lang: 'python', code: `import random
from dataclasses import dataclass


# Flyweight: INTRINSIC, shared, immutable
@dataclass(frozen=True)
class TreeType:
    name: str
    color: str
    texture: bytes

    def draw(self, x: int, y: int) -> None:  # extrinsic state passed in
        print(f"draw {self.name} ({self.color}) at {x},{y}")


# Flyweight factory: guarantees one TreeType per key
class TreeTypes:
    _cache: dict[str, TreeType] = {}

    @classmethod
    def of(cls, name: str, color: str) -> TreeType:
        key = f"{name}|{color}"
        if key not in cls._cache:
            cls._cache[key] = TreeType(name, color, bytes(2 * 1024 * 1024))  # "2 MB texture" loaded once
        return cls._cache[key]

    @classmethod
    def pool_size(cls) -> int:
        return len(cls._cache)


# Context: EXTRINSIC, one per tree, tiny
@dataclass(frozen=True, slots=True)
class Tree:
    x: int
    y: int
    type: TreeType

    def draw(self) -> None:
        self.type.draw(self.x, self.y)


class Forest:
    def __init__(self) -> None:
        self.trees: list[Tree] = []

    def plant(self, x: int, y: int, name: str, color: str) -> None:
        self.trees.append(Tree(x, y, TreeTypes.of(name, color)))


if __name__ == "__main__":
    f = Forest()
    rnd = random.Random(42)
    kinds = ["oak", "pine", "birch"]
    for i in range(100_000):
        f.plant(rnd.randrange(1000), rnd.randrange(1000), kinds[i % 3], "green")
    print(f"{len(f.trees)} trees share {TreeTypes.pool_size()} TreeType objects")
    # 100000 trees share 3 TreeType objects (≈6 MB textures instead of ≈200 GB)` },
        { lang: 'ts', code: `// Flyweight: INTRINSIC, shared, immutable
class TreeType {
  constructor(readonly name: string, readonly color: string, readonly texture: Uint8Array) {}

  draw(x: number, y: number): void { // extrinsic state passed in
    console.log(\`draw \${this.name} (\${this.color}) at \${x},\${y}\`);
  }
}

// Flyweight factory: guarantees one TreeType per key
class TreeTypes {
  private static readonly CACHE = new Map<string, TreeType>();

  private constructor() {}

  static of(name: string, color: string): TreeType {
    const key = \`\${name}|\${color}\`;
    let type = TreeTypes.CACHE.get(key);
    if (type === undefined) {
      type = new TreeType(name, color, new Uint8Array(2 * 1024 * 1024)); // "2 MB texture" loaded once
      TreeTypes.CACHE.set(key, type);
    }
    return type;
  }

  static poolSize(): number { return TreeTypes.CACHE.size; }
}

// Context: EXTRINSIC, one per tree, tiny
class Tree {
  constructor(readonly x: number, readonly y: number, readonly type: TreeType) {}
  draw(): void { this.type.draw(this.x, this.y); }
}

class Forest {
  readonly trees: Tree[] = [];

  plant(x: number, y: number, name: string, color: string): void {
    this.trees.push(new Tree(x, y, TreeTypes.of(name, color)));
  }
}

const f = new Forest();
const kinds = ["oak", "pine", "birch"];
for (let i = 0; i < 100_000; i++) {
  f.plant(Math.floor(Math.random() * 1000), Math.floor(Math.random() * 1000), kinds[i % 3], "green");
}
console.log(\`\${f.trees.length} trees share \${TreeTypes.poolSize()} TreeType objects\`);
// 100000 trees share 3 TreeType objects (≈6 MB textures instead of ≈200 GB)` },
        { lang: 'cpp', code: `// Flyweight: INTRINSIC, shared, immutable
struct TreeType {
    string name;
    string color;
    vector<uint8_t> texture;

    void draw(int x, int y) const {              // extrinsic state passed in
        cout << "draw " << name << " (" << color << ") at " << x << "," << y << "\\n";
    }
};

// Flyweight factory: guarantees one TreeType per key
class TreeTypes {
    inline static unordered_map<string, unique_ptr<const TreeType>> cache_;   // the factory owns every TreeType
    inline static mutex mu_;
    TreeTypes() = delete;
public:
    static const TreeType& of(const string& name, const string& color) {
        lock_guard<mutex> lock(mu_);
        auto& slot = cache_[name + "|" + color];
        if (!slot) slot = make_unique<const TreeType>(TreeType{name, color, vector<uint8_t>(2 * 1024 * 1024)});   // "2 MB texture" loaded once
        return *slot;
    }
    static size_t poolSize() { return cache_.size(); }
};

// Context: EXTRINSIC, one per tree, tiny
struct Tree {
    int x, y;
    const TreeType* type;                        // non-owning pointer to the shared flyweight
    void draw() const { type->draw(x, y); }
};

class Forest {
public:
    vector<Tree> trees;
    void plant(int x, int y, const string& name, const string& color) {
        trees.push_back(Tree{x, y, &TreeTypes::of(name, color)});
    }
};

int main() {
    Forest f;
    mt19937 rnd(42);
    const char* kinds[] = {"oak", "pine", "birch"};
    for (int i = 0; i < 100'000; i++) f.plant(rnd() % 1000, rnd() % 1000, kinds[i % 3], "green");
    cout << f.trees.size() << " trees share " << TreeTypes::poolSize() << " TreeType objects\\n";
    // 100000 trees share 3 TreeType objects (≈6 MB textures instead of ≈200 GB)
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;

// Flyweight: INTRINSIC, shared, immutable
sealed class TreeType {
    public readonly string Name, Color; public readonly byte[] Texture;
    public TreeType(string name, string color, byte[] texture) { Name = name; Color = color; Texture = texture; }
    public void Draw(int x, int y) {          // extrinsic state passed in
        Console.WriteLine("draw " + Name + " (" + Color + ") at " + x + "," + y);
    }
}

// Flyweight factory: guarantees one TreeType per key
static class TreeTypes {
    private static readonly ConcurrentDictionary<string, TreeType> Cache = new ConcurrentDictionary<string, TreeType>();

    public static TreeType Of(string name, string color) {
        return Cache.GetOrAdd(name + "|" + color,
            k => new TreeType(name, color, new byte[2 * 1024 * 1024]));   // "2 MB texture" loaded once
    }
    public static int PoolSize { get { return Cache.Count; } }
}

// Context: EXTRINSIC, one per tree, tiny
sealed class Tree {
    public readonly int X, Y; public readonly TreeType Type;
    public Tree(int x, int y, TreeType type) { X = x; Y = y; Type = type; }
    public void Draw() { Type.Draw(X, Y); }
}

class Forest {
    public readonly List<Tree> Trees = new List<Tree>();

    public void Plant(int x, int y, string name, string color) {
        Trees.Add(new Tree(x, y, TreeTypes.Of(name, color)));
    }
}

class Program {
    static void Main() {
        Forest f = new Forest();
        Random rnd = new Random(42);
        string[] kinds = { "oak", "pine", "birch" };
        for (int i = 0; i < 100000; i++) f.Plant(rnd.Next(1000), rnd.Next(1000), kinds[i % 3], "green");
        Console.WriteLine(f.Trees.Count + " trees share " + TreeTypes.PoolSize + " TreeType objects");
        // 100000 trees share 3 TreeType objects (≈6 MB textures instead of ≈200 GB)
    }
}` }
      ] },
    { lang: 'java', title: 'Built-in flyweights: number caches and string pools', code: `
// The JDK's own flyweights
class JdkFlyweights {
    public static void main(String[] args) {
        Integer a = Integer.valueOf(127), b = Integer.valueOf(127);
        Integer c = Integer.valueOf(128), d = Integer.valueOf(128);
        System.out.println(a == b);            // true  — cached flyweight (-128..127)
        System.out.println(c == d);            // false (by default) — two separate objects
        System.out.println(c.equals(d));       // true  — always compare values with equals

        String s1 = "hello";
        String s2 = new String("hello");
        System.out.println(s1 == s2);          // false — s2 is a fresh object
        System.out.println(s1 == s2.intern()); // true  — intern() returns the pooled flyweight
    }
}`,
      alt: [
        { lang: 'python', code: `import sys

# CPython's own flyweights (an implementation detail, but a handy demo)
a, b = int("127"), int("127")
c, d = int("1000"), int("1000")
print(str(a is b).lower())  # true  — small ints (-5..256) are cached flyweights
print(str(c is d).lower())  # false — two separate objects
print(str(c == d).lower())  # true  — always compare values with ==

s1 = "hello"
s2 = "".join(["hel", "lo"])  # built at run time: a fresh object
print(str(s1 is s2).lower())  # false — s2 is not the pooled string
print(str(s1 is sys.intern(s2)).lower())  # true  — intern() returns the pooled flyweight` },
        { lang: 'ts', code: `// JavaScript compares numbers and strings by value, so there is no identity trap to demo.
// The built-in flyweight you CAN observe is the global Symbol registry: one symbol per key.
const registered: symbol[] = [Symbol.for("hello"), Symbol.for("hello")];
console.log(registered[0] === registered[1]); // true  — Symbol.for returns the shared flyweight
const fresh: symbol[] = [Symbol("hello"), Symbol("hello")];
console.log(fresh[0] === fresh[1]); // false — plain Symbol() makes a new one every time

// Objects are compared by identity, so an interning pool needs a Map:
const pool = new Map<string, { text: string }>();
const intern = (text: string): { text: string } => {
  let obj = pool.get(text);
  if (obj === undefined) {
    obj = { text };
    pool.set(text, obj);
  }
  return obj;
};
const built = ["hel", "lo"].join(""); // built at run time
console.log(intern("hello") === intern(built)); // true  — equal text, one shared object
const makeBox = (text: string): { text: string } => ({ text });
console.log(makeBox("hello") === makeBox("hello")); // false — fresh objects, no pool
console.log("hello" === built); // true  — strings themselves always compare by value` },
        { lang: 'cpp', code: `// C++ has no built-in object pool for ints or strings (they are plain values),
// so here is the flyweight idea in a dozen lines: an interning pool.
const string& intern(const string& s) {
    static unordered_set<string> pool;           // node-based: element addresses stay valid
    return *pool.insert(s).first;
}

int main() {
    int a = 127, b = 127;
    int c = 1000, d = 1000;
    cout << boolalpha;
    cout << (a == b) << "\\n";                    // true  — ints are values: equal values are equal
    cout << (&c == &d) << "\\n";                  // false — two variables are two places in memory
    cout << (c == d) << "\\n";                    // true  — compare values with ==

    string s1 = "hello";
    string s2 = string("hel") + "lo";            // built at run time: its own object
    cout << (&s1 == &s2) << "\\n";                // false — two separate strings
    cout << (&intern(s1) == &intern(s2)) << "\\n";// true  — the pool hands out one shared flyweight
}` },
  { lang: 'csharp', code: `
using System;

// The runtime's own flyweights
class Program {
    static string B(bool b) { return b.ToString().ToLower(); }
    static void Main() {
        object a = "hello", b = "hello";                 // literals are interned: one shared object
        object c = new string('h', 1) + "ello", d = new string('h', 1) + "ello";
        Console.WriteLine(B(ReferenceEquals(a, b)));    // true  — pooled flyweight
        Console.WriteLine(B(ReferenceEquals(c, d)));    // false — two separate objects built at runtime
        Console.WriteLine(B(c.Equals(d)));              // true  — always compare values with Equals
        Console.WriteLine(B(ReferenceEquals(a, string.Intern((string)c))));   // true — Intern() returns the pooled flyweight
    }
}` }
      ] }],
    codeTitle: ['Forest of trees sharing TreeType flyweights', 'Built-in flyweights: number caches and string pools'],
    viz: {
      title: 'Flyweight factory: reuse from the pool or create once',
      input: 'oak pine oak oak birch pine oak birch',
      inputLabel: 'Trees to plant, in order (any species names, max 14)',
      gen: function (input) {
        var kinds = words(input, 'Example: oak pine oak birch', 14).map(function (s) { return s.toLowerCase(); });
        var pool = [], planted = [], f = [], created = 0, reused = 0;
        f.push(F('<b>Setup.</b> Each species has heavy, identical data (≈2 MB texture). Positions are unique per tree. The factory keeps a <b>pool</b>: species → the one shared <code>TreeType</code>.',
          [{ type: 'map', label: 'flyweight pool (intrinsic, shared)', entries: [['(empty)', '-']] }, CODE('TreeTypes / Forest', FLY_CODE, {}), VARS('counters', { treesPlanted: 0, flyweightsCreated: 0, reused: 0 })]));
        kinds.forEach(function (k, i) {
          var x = (i * 37) % 100, y = (i * 53) % 100;
          var hit = pool.indexOf(k) >= 0;
          if (!hit) { pool.push(k); created++; } else reused++;
          planted.push(k);
          var entries = pool.map(function (p) { return [p, 'TreeType(' + p + ', 2 MB)']; });
          var phl = {}; for (var j = 0; j < planted.length - 1; j++) phl[j] = 'done'; phl[planted.length - 1] = hit ? 'ok' : 'cur';
          f.push(F('Plant tree #' + (i + 1) + ': <b>' + k + '</b> at (' + x + ', ' + y + '). Factory looks up "' + k + '" → ' + (hit ? H.c('g', 'found in pool — reuse the same object, zero new MB.') : H.c('y', 'not in pool — create it once (load the 2 MB texture) and store it.')) + ' The tree itself stores only x, y and a reference.',
            [{ type: 'map', label: 'flyweight pool (intrinsic, shared)', entries: entries, hl: one(k, hit ? 'ok' : 'cur') },
             { type: 'array', label: 'Tree contexts (extrinsic: x, y + pointer)', values: planted.slice(), hl: phl, showIdx: true },
             CODE('TreeTypes / Forest', FLY_CODE, hit ? { 2: 'ok', 6: 'cur' } : { 2: 'cur', 3: 'cur', 6: 'cur' }),
             VARS('counters', { treesPlanted: planted.length, flyweightsCreated: created, reused: reused }, hit ? { reused: 'ok' } : { flyweightsCreated: 'cur' })]));
        });
        var naiveMB = planted.length * 2, flyMB = created * 2;
        f.push(F('<b>Memory.</b> Naive design: every tree owns its texture = ' + planted.length + ' × 2 MB = <b>' + naiveMB + ' MB</b>. Flyweight: ' + created + ' shared textures = <b>' + flyMB + ' MB</b> + a few bytes per tree. At 1 000 000 trees and 3 species: ~2 TB vs ~30 MB.',
          [{ type: 'bars', label: 'MB of texture data', values: [naiveMB, flyMB], texts: [naiveMB + ' MB', flyMB + ' MB'], idxLabels: ['one copy per tree', 'flyweights'], hl: { 0: 'bad', 1: 'ok' } }, VARS('result', { trees: planted.length, distinctSpecies: created, savedMB: naiveMB - flyMB }, { savedMB: 'sel' })]));
        f.push(F('<b>Why immutability matters.</b> All ' + planted.filter(function (p) { return p === planted[0]; }).length + ' "' + planted[0] + '" trees point at the <i>same</i> object. If one tree could call <code>type.setColor("red")</code>, every ' + planted[0] + ' in the forest would turn red. So flyweights are records / final fields only; per-tree variety (age, health) belongs in the context object.',
          [{ type: 'array', label: 'trees pointing at the "' + planted[0] + '" flyweight', values: planted.slice(), hl: (function () { var h = {}; planted.forEach(function (p, q) { if (p === planted[0]) h[q] = 'sel'; }); return h; })() }, TXT('One shared object, many references → change it once, it changes everywhere.')]));
        return f;
      }
    },
    examples: [
      { title: 'Text editor glyphs', html: `<p>A 1 MB document has ~1 000 000 characters but maybe 6 styles (font, size, bold, colour). Store a <code>Style</code> flyweight from a factory and keep per-character only the char and a style reference — or better, run-length "style runs" (chars 0–999 use style #2). Word processors and browsers' text layout engines do exactly this.</p>` },
      { title: 'Chess server with 50 000 games', html: `<p>There are only 12 piece kinds (6 types × 2 colours). Each <code>Piece</code> flyweight holds type, colour, move rules and icon; the board stores references in an 8×8 array. Position is extrinsic — the square index. 50 000 games × 32 pieces need 12 piece objects, not 1.6 million.</p>`, code: { lang: 'java', code: `enum PieceKind { KING, QUEEN, ROOK, BISHOP, KNIGHT, PAWN }
record Piece(PieceKind kind, boolean white) {}
Map<String, Piece> pool = new HashMap<>();
Piece wk1 = pool.computeIfAbsent("KING-w", k -> new Piece(PieceKind.KING, true));
Piece wk2 = pool.computeIfAbsent("KING-w", k -> new Piece(PieceKind.KING, true));
System.out.println(wk1 == wk2); // true: one shared flyweight`,
        alt: [
          { lang: 'python', code: `from dataclasses import dataclass
from enum import Enum, auto


class PieceKind(Enum):
    KING = auto()
    QUEEN = auto()
    ROOK = auto()
    BISHOP = auto()
    KNIGHT = auto()
    PAWN = auto()


@dataclass(frozen=True)
class Piece:
    kind: PieceKind
    white: bool


pool: dict[str, Piece] = {}
wk1 = pool.setdefault("KING-w", Piece(PieceKind.KING, True))
wk2 = pool.setdefault("KING-w", Piece(PieceKind.KING, True))
print(wk1 is wk2)  # True: one shared flyweight` },
          { lang: 'ts', code: `enum PieceKind { KING, QUEEN, ROOK, BISHOP, KNIGHT, PAWN }
interface Piece { readonly kind: PieceKind; readonly white: boolean; }

const pool = new Map<string, Piece>();
const pieceOf = (key: string, make: () => Piece): Piece => {
  let p = pool.get(key);
  if (p === undefined) {
    p = make();
    pool.set(key, p);
  }
  return p;
};
const wk1 = pieceOf("KING-w", () => ({ kind: PieceKind.KING, white: true }));
const wk2 = pieceOf("KING-w", () => ({ kind: PieceKind.KING, white: true }));
console.log(wk1 === wk2); // true: one shared flyweight` },
          { lang: 'cpp', code: `enum class PieceKind { KING, QUEEN, ROOK, BISHOP, KNIGHT, PAWN };
struct Piece { PieceKind kind; bool white; };

int main() {
    unordered_map<string, shared_ptr<const Piece>> pool;
    auto pieceOf = [&](const string& key, PieceKind kind, bool white) {
        auto& slot = pool[key];
        if (!slot) slot = make_shared<const Piece>(Piece{kind, white});
        return slot;
    };
    auto wk1 = pieceOf("KING-w", PieceKind::KING, true);
    auto wk2 = pieceOf("KING-w", PieceKind::KING, true);
    cout << boolalpha << (wk1 == wk2) << "\\n";  // true: one shared flyweight
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

enum PieceKind { KING, QUEEN, ROOK, BISHOP, KNIGHT, PAWN }
sealed class Piece { public readonly PieceKind Kind; public readonly bool White; public Piece(PieceKind kind, bool white) { Kind = kind; White = white; } }
class Program {
    static void Main() {
        Dictionary<string, Piece> pool = new Dictionary<string, Piece>();
        Func<string, Func<Piece>, Piece> intern = (key, make) => { Piece p; if (!pool.TryGetValue(key, out p)) { p = make(); pool[key] = p; } return p; };
        Piece wk1 = intern("KING-w", () => new Piece(PieceKind.KING, true));
        Piece wk2 = intern("KING-w", () => new Piece(PieceKind.KING, true));
        Console.WriteLine(ReferenceEquals(wk1, wk2).ToString().ToLower()); // true: one shared flyweight
    }
}` }
        ] } },
      { title: 'Integer cache bug in the wild', html: `<p>A test compares two <code>Integer</code> user ids with <code>==</code> and passes (ids 1–100 come from the flyweight cache). In production ids exceed 127, two different objects are created, and <code>==</code> returns false — "random" bugs. Lesson: flyweight sharing is an optimisation, never a contract; compare values with <code>equals</code>.</p>` },
      { title: 'Map tiles and sprites', html: `<p>An open-world game map of 10 000 × 10 000 tiles uses maybe 200 tile types (grass, water, road…). The map is a 2D array of <b>short</b> indices into a tile-type table: 10<sup>8</sup> tiles × 2 bytes = 200 MB, versus 10<sup>8</sup> full tile objects at 40+ bytes each (4+ GB, before textures). Small indices into a shared table are the most compact flyweight of all.</p>` }
    ],
    deepDive: `<p><b>When it is worth it.</b> Flyweight trades simplicity for memory. Do it only when (1) there are <i>very many</i> objects, (2) memory is actually a problem (measure with a heap profiler), (3) most state can be made extrinsic, and (4) object identity does not matter to the program. For a few thousand objects, it is premature optimisation.</p>
      <p><b>Per-object overhead</b> makes the win bigger than it looks: a Java object has a 12–16 byte header plus alignment to 8 bytes (a CPython object is 48 bytes or more, a C++ object has no header but a virtual class adds an 8-byte vtable pointer); in Java a <code>Tree</code> record with two ints and a reference is ~24 bytes. Arrays of primitives (struct-of-arrays: <code>int[] xs, ys; short[] typeIdx</code>) can cut even that, and Project Valhalla's value classes aim to remove headers entirely.</p>
      <p><b>Factory concurrency and lifetime.</b> Make get-or-create atomic (<code>ConcurrentHashMap.computeIfAbsent</code> in Java, a lock around the <code>dict</code> in Python, a mutex in C++) so two threads cannot create two "oak" objects. An unbounded pool for user-supplied keys is a memory leak (and a DoS vector) — bound it or use weak references (<code>WeakHashMap</code>-style interning, like Guava's <code>Interners.newWeakInterner()</code>). Note that <code>String.intern()</code> moved to the regular heap in Java 7+ and the JVM can deduplicate strings automatically (G1 <code>-XX:+UseStringDeduplication</code>).</p>
      <p><b>Flyweight vs Singleton vs Object Pool.</b> Singleton = exactly one instance of a class. Flyweight = one instance <i>per distinct intrinsic value</i>, shared simultaneously and immutable. Object Pool = mutable objects <i>borrowed</i> exclusively and returned (connections, threads). Flyweights are never "returned" — everybody holds them at once.</p>`,
    aiEra: `<p><b>What AI changes:</b> memory is the bottleneck in LLM serving, and the winning tricks are flyweights. <b>Prefix / prompt caching</b> shares the KV-cache of an identical system prompt across thousands of requests instead of recomputing and storing it per request; vLLM's <b>PagedAttention</b> lets requests share identical KV blocks copy-on-write. Embedding stores deduplicate identical chunks; tokenisers intern token strings. "Intrinsic = shared prefix, extrinsic = the user's own tokens" is the same split as trees and positions.</p>
      <p><b>Use AI as a partner:</b> <code>Here is my class with 9 fields and 5 million instances. Which fields are intrinsic vs extrinsic? Estimate bytes before and after.</code> Verify with a heap dump. <b>Where AI goes wrong:</b> it suggests flyweights for small object counts, leaves setters on the shared object, uses an unsynchronised map as the pool, and forgets that user-controlled keys can grow the pool forever. <b>What you must still own:</b> the memory estimate, the intrinsic/extrinsic split, and the immutability guarantee.</p>`,
    problems: [{
      title: 'Text Editor with a Million Styled Characters',
      level: 'Medium', tags: ['flyweight', 'memory'], companies: ['Google', 'Microsoft', 'Adobe'],
      statement: `<p>Design the in-memory model for an editor document: each character has a <b>style</b> (font family, size, bold, italic, colour). Documents reach 10<sup>6</sup> characters but usually use fewer than 20 distinct styles. Support <code>append(char, font, size, bold, italic, color)</code>, <code>styleAt(i)</code>, and <code>distinctStyles()</code>. Two equal styles must be the <b>same object</b>.</p>`,
      constraints: `<p>N ≤ 10<sup>6</sup> chars. Styles are immutable. The style factory must be thread-safe. Memory per character should be a few bytes, not a full style object.</p>`,
      example: `<p>Append "Hi" in (Arial, 12, bold) and "!" in (Arial, 12, bold) → <code>styleAt(0) == styleAt(2)</code> is ${H.c('g', 'true')} and <code>distinctStyles()</code> = <b>1</b>. Naive: 3 style objects.</p>`,
      brute: { why: `<p>Each <code>Character</code> object carries its own copy of font name, size, flags and colour: an object header + fields + a reference to the font string ≈ 40+ bytes per char on a typical 64-bit runtime, plus list overhead — around 60 MB for 1 M characters, and comparing styles requires field-by-field equality checks. Most of those bytes are the same few styles repeated a million times.</p>`, code: { lang: 'java', code: `class StyledChar {
    final char ch; final String font; final int size; final boolean bold, italic; final int rgb;
    StyledChar(char ch, String font, int size, boolean bold, boolean italic, int rgb) {
        this.ch = ch; this.font = font; this.size = size; this.bold = bold; this.italic = italic; this.rgb = rgb;
    }
}
class NaiveDocument {
    final List<StyledChar> chars = new ArrayList<>();   // one fat object per character
    void append(char c, String font, int size, boolean b, boolean i, int rgb) {
        chars.add(new StyledChar(c, font, size, b, i, rgb));
    }
}`, alt: [
                { lang: 'python', code: `
class StyledChar:
    def __init__(self, ch, font, size, bold, italic, rgb):
        self.ch, self.font, self.size = ch, font, size
        self.bold, self.italic, self.rgb = bold, italic, rgb

class NaiveDocument:
    def __init__(self): self.chars = []   # one fat object per character
    def append(self, c, font, size, b, i, rgb):
        self.chars.append(StyledChar(c, font, size, b, i, rgb))` },
                { lang: 'ts', code: `
class StyledChar {
    constructor(
        readonly ch: string, readonly font: string, readonly size: number,
        readonly bold: boolean, readonly italic: boolean, readonly rgb: number,
    ) {}
}
class NaiveDocument {
    readonly chars: StyledChar[] = [];   // one fat object per character
    append(c: string, font: string, size: number, b: boolean, i: boolean, rgb: number): void {
        this.chars.push(new StyledChar(c, font, size, b, i, rgb));
    }
}` },
                { lang: 'cpp', code: `
struct StyledChar {
    char ch; string font; int size; bool bold, italic; int rgb;
    StyledChar(char ch, string font, int size, bool bold, bool italic, int rgb)
        : ch(ch), font(font), size(size), bold(bold), italic(italic), rgb(rgb) { }
};
class NaiveDocument {
public:
    vector<StyledChar> chars;   // one fat object per character
    void append(char c, const string& font, int size, bool b, bool i, int rgb) {
        chars.emplace_back(c, font, size, b, i, rgb);
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class StyledChar {
    public readonly char Ch; public readonly string Font; public readonly int Size; public readonly bool Bold, Italic; public readonly int Rgb;
    public StyledChar(char ch, string font, int size, bool bold, bool italic, int rgb) {
        Ch = ch; Font = font; Size = size; Bold = bold; Italic = italic; Rgb = rgb;
    }
}
class NaiveDocument {
    public readonly List<StyledChar> Chars = new List<StyledChar>();   // one fat object per character
    public void Append(char c, string font, int size, bool b, bool i, int rgb) {
        Chars.Add(new StyledChar(c, font, size, b, i, rgb));
    }
}` }
              ] } },
      mcq: { q: 'Which of these belongs in the shared (intrinsic) Style flyweight?', options: ['The character itself', 'Its index in the document', 'Font, size, bold, italic, colour', 'The cursor position'], answer: 2, explain: 'Formatting is identical across many characters; the character and its position are unique per occurrence (extrinsic).' },
      hints: [`<p>Hint 1: Separate "what is repeated" (style) from "what is unique" (the char, its position).</p>`, `<p>Hint 2: An immutable value type with value-based equality (Java <code>record Style(...)</code>, Python frozen dataclass, C++ struct with <code>operator&lt;=&gt;</code>) works as a map key; a thread-safe map from style to style interns them.</p>`, `<p>Hint 3: Store chars in a <code>StringBuilder</code> and a parallel list of style references (or a <code>short[]</code> of style ids). <code>append</code> = intern style → push char + reference.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "true\n1\nfalse\n2\nindex out of range\n" }] },
      solution: {
        approach: `<p><code>Style</code> is an immutable record (intrinsic). <code>StyleFactory.of(...)</code> interns styles with an atomic get-or-create (<code>ConcurrentHashMap.putIfAbsent</code> in Java, a lock around a <code>dict</code>, a mutex around a <code>map</code>), so equal styles are the identical object. The <code>Document</code> keeps characters in a <code>StringBuilder</code> (2 bytes each) and a list of style ids (indices into the factory's table) — a few bytes per character. <code>styleAt(i)</code> looks up the id; <code>distinctStyles()</code> is the table size.</p>`,
        code: `record Style(String font, int size, boolean bold, boolean italic, int rgb) {}

final class StyleFactory {
    private final ConcurrentHashMap<Style, Integer> ids = new ConcurrentHashMap<>();
    private final List<Style> table = new CopyOnWriteArrayList<>();

    synchronized int idOf(Style s) {               // intern: one id + one object per distinct style
        Integer id = ids.get(s);
        if (id != null) return id;
        table.add(s);
        ids.put(s, table.size() - 1);
        return table.size() - 1;
    }
    Style byId(int id) { return table.get(id); }
    int size() { return table.size(); }
}

class Document {
    private final StyleFactory styles = new StyleFactory();
    private final StringBuilder text = new StringBuilder();
    private short[] styleIds = new short[16];        // extrinsic: 2 bytes per char

    void append(char c, String font, int size, boolean bold, boolean italic, int rgb) {
        int id = styles.idOf(new Style(font, size, bold, italic, rgb));
        if (id > Short.MAX_VALUE) throw new IllegalStateException("too many styles");
        if (text.length() == styleIds.length) styleIds = Arrays.copyOf(styleIds, styleIds.length * 2);
        styleIds[text.length()] = (short) id;
        text.append(c);
    }

    Style styleAt(int i) {
        Objects.checkIndex(i, text.length());
        return styles.byId(styleIds[i]);              // the SAME shared object for equal styles
    }

    int distinctStyles() { return styles.size(); }

    public static void main(String[] args) {
        Document d = new Document();
        for (char c : "Hi".toCharArray()) d.append(c, "Arial", 12, true, false, 0x000000);
        d.append('!', "Arial", 12, true, false, 0x000000);
        System.out.println(d.styleAt(0) == d.styleAt(2));   // true
        System.out.println(d.distinctStyles());              // 1
        d.append('?', "Arial", 12, false, true, 0x000000);   // a second, different style
        System.out.println(d.styleAt(0) == d.styleAt(3));   // false
        System.out.println(d.distinctStyles());              // 2
        try { d.styleAt(10); }
        catch (IndexOutOfBoundsException e) { System.out.println("index out of range"); }
    }
}`,
        alt: [
          { lang: 'python', code: `import threading
from array import array
from dataclasses import dataclass


@dataclass(frozen=True)  # frozen + eq => immutable and hashable: a safe flyweight
class Style:
    font: str
    size: int
    bold: bool
    italic: bool
    rgb: int


class StyleFactory:
    def __init__(self) -> None:
        self._ids: dict[Style, int] = {}
        self._table: list[Style] = []
        self._lock = threading.Lock()

    def id_of(self, style: Style) -> int:  # intern: one id + one object per distinct style
        with self._lock:
            if style not in self._ids:
                self._ids[style] = len(self._table)
                self._table.append(style)
            return self._ids[style]

    def by_id(self, style_id: int) -> Style:
        return self._table[style_id]

    def size(self) -> int:
        return len(self._table)


class Document:
    def __init__(self) -> None:
        self._styles = StyleFactory()
        self._text: list[str] = []
        self._style_ids = array("H")  # extrinsic: 2 bytes per char

    def append(self, c: str, font: str, size: int, bold: bool, italic: bool, rgb: int) -> None:
        style_id = self._styles.id_of(Style(font, size, bold, italic, rgb))
        if style_id > 0xFFFF:
            raise RuntimeError("too many styles")
        self._style_ids.append(style_id)
        self._text.append(c)

    def style_at(self, i: int) -> Style:
        if not 0 <= i < len(self._text):
            raise IndexError(i)
        return self._styles.by_id(self._style_ids[i])  # the SAME shared object for equal styles

    def distinct_styles(self) -> int:
        return self._styles.size()


if __name__ == "__main__":
    d = Document()
    for ch in "Hi":
        d.append(ch, "Arial", 12, True, False, 0x000000)
    d.append("!", "Arial", 12, True, False, 0x000000)
    print(str(d.style_at(0) is d.style_at(2)).lower())  # true
    print(d.distinct_styles())  # 1
    d.append("?", "Arial", 12, False, True, 0x000000)  # a second, different style
    print(str(d.style_at(0) is d.style_at(3)).lower())  # false
    print(d.distinct_styles())  # 2
    try:
        d.style_at(10)
    except IndexError:
        print("index out of range")` },
          { lang: 'ts', code: `export {}; // makes this file a module, so Document never clashes with the DOM global of that name

interface Style {
  readonly font: string;
  readonly size: number;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly rgb: number;
}

class StyleFactory {
  private readonly ids = new Map<string, number>(); // objects compare by reference, so key by value
  private readonly table: Style[] = [];

  idOf(s: Style): number { // intern: one id + one object per distinct style
    const key = \`\${s.font}|\${s.size}|\${s.bold}|\${s.italic}|\${s.rgb}\`;
    let id = this.ids.get(key);
    if (id === undefined) {
      id = this.table.length;
      this.table.push(Object.freeze({ ...s }));
      this.ids.set(key, id);
    }
    return id;
  }

  byId(id: number): Style {
    return this.table[id];
  }

  size(): number {
    return this.table.length;
  }
}

class Document {
  private readonly styles = new StyleFactory();
  private length = 0;
  private styleIds = new Uint16Array(16); // extrinsic: 2 bytes per char

  append(_c: string, font: string, size: number, bold: boolean, italic: boolean, rgb: number): void {
    const id = this.styles.idOf({ font, size, bold, italic, rgb });
    if (id > 0xffff) throw new Error("too many styles");
    if (this.length === this.styleIds.length) {
      const bigger = new Uint16Array(this.styleIds.length * 2);
      bigger.set(this.styleIds);
      this.styleIds = bigger;
    }
    this.styleIds[this.length++] = id;
  }

  styleAt(i: number): Style {
    if (i < 0 || i >= this.length) throw new RangeError("index out of range");
    return this.styles.byId(this.styleIds[i]); // the SAME shared object for equal styles
  }

  distinctStyles(): number {
    return this.styles.size();
  }
}

const d = new Document();
for (const c of "Hi") d.append(c, "Arial", 12, true, false, 0x000000);
d.append("!", "Arial", 12, true, false, 0x000000);
console.log(d.styleAt(0) === d.styleAt(2)); // true
console.log(d.distinctStyles()); // 1
d.append("?", "Arial", 12, false, true, 0x000000); // a second, different style
console.log(d.styleAt(0) === d.styleAt(3)); // false
console.log(d.distinctStyles()); // 2
try {
  d.styleAt(10);
} catch (e) {
  if (e instanceof RangeError) console.log("index out of range");
}` },
          { lang: 'cpp', code: `struct Style {                                   // immutable value: no setters, only ever used through const references
    string font;
    int size;
    bool bold, italic;
    int rgb;
    auto operator<=>(const Style&) const = default;
};

class StyleFactory {
    map<Style, int> ids_;
    vector<unique_ptr<const Style>> table_;      // the factory owns every distinct style; addresses never move
    mutable mutex mu_;
public:
    int idOf(const Style& s) {                   // intern: one id + one object per distinct style
        lock_guard<mutex> lock(mu_);
        auto [it, inserted] = ids_.try_emplace(s, static_cast<int>(table_.size()));
        if (inserted) table_.push_back(make_unique<const Style>(s));
        return it->second;
    }
    const Style& byId(int id) const { return *table_[id]; }
    int size() const { return static_cast<int>(table_.size()); }
};

class Document {
    StyleFactory styles_;
    string text_;
    vector<uint16_t> styleIds_;                  // extrinsic: 2 bytes per char
public:
    void append(char c, const string& font, int size, bool bold, bool italic, int rgb) {
        int id = styles_.idOf(Style{font, size, bold, italic, rgb});
        if (id > 0xFFFF) throw runtime_error("too many styles");
        styleIds_.push_back(static_cast<uint16_t>(id));
        text_.push_back(c);
    }

    const Style& styleAt(int i) const {
        if (i < 0 || i >= static_cast<int>(text_.size())) throw out_of_range("index out of range");
        return styles_.byId(styleIds_[i]);       // the SAME shared object for equal styles
    }

    int distinctStyles() const { return styles_.size(); }
};

int main() {
    Document d;
    for (char c : string("Hi")) d.append(c, "Arial", 12, true, false, 0x000000);
    d.append('!', "Arial", 12, true, false, 0x000000);
    cout << boolalpha << (&d.styleAt(0) == &d.styleAt(2)) << "\\n";   // true
    cout << d.distinctStyles() << "\\n";                              // 1
    d.append('?', "Arial", 12, false, true, 0x000000);               // a second, different style
    cout << (&d.styleAt(0) == &d.styleAt(3)) << "\\n";                // false
    cout << d.distinctStyles() << "\\n";                              // 2
    try {
        d.styleAt(10);
    } catch (const out_of_range&) {
        cout << "index out of range\\n";
    }
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Text;

sealed class Style {                                 // value object: equal by fields, so equal styles intern to one object
    public readonly string Font; public readonly int Size; public readonly bool Bold, Italic; public readonly int Rgb;
    public Style(string font, int size, bool bold, bool italic, int rgb) { Font = font; Size = size; Bold = bold; Italic = italic; Rgb = rgb; }
    public override bool Equals(object o) {
        Style s = o as Style;
        return s != null && s.Font == Font && s.Size == Size && s.Bold == Bold && s.Italic == Italic && s.Rgb == Rgb;
    }
    public override int GetHashCode() { return Font.GetHashCode() ^ Size ^ (Bold ? 1 : 0) ^ (Italic ? 2 : 0) ^ Rgb; }
}

sealed class StyleFactory {
    private readonly Dictionary<Style, int> ids = new Dictionary<Style, int>();
    private readonly List<Style> table = new List<Style>();
    private readonly object gate = new object();

    public int IdOf(Style s) {                        // intern: one id + one object per distinct style
        lock (gate) {
            int id;
            if (ids.TryGetValue(s, out id)) return id;
            table.Add(s);
            ids[s] = table.Count - 1;
            return table.Count - 1;
        }
    }
    public Style ById(int id) { lock (gate) return table[id]; }
    public int Count { get { lock (gate) return table.Count; } }
}

class Document {
    private readonly StyleFactory styles = new StyleFactory();
    private readonly StringBuilder text = new StringBuilder();
    private short[] styleIds = new short[16];        // extrinsic: 2 bytes per char

    public void Append(char c, string font, int size, bool bold, bool italic, int rgb) {
        int id = styles.IdOf(new Style(font, size, bold, italic, rgb));
        if (id > short.MaxValue) throw new InvalidOperationException("too many styles");
        if (text.Length == styleIds.Length) Array.Resize(ref styleIds, styleIds.Length * 2);
        styleIds[text.Length] = (short)id;
        text.Append(c);
    }

    public Style StyleAt(int i) {
        if (i < 0 || i >= text.Length) throw new IndexOutOfRangeException("index " + i);
        return styles.ById(styleIds[i]);              // the SAME shared object for equal styles
    }

    public int DistinctStyles() { return styles.Count; }
}

class Program {
    static void Main() {
        Document d = new Document();
        foreach (char c in "Hi") d.Append(c, "Arial", 12, true, false, 0x000000);
        d.Append('!', "Arial", 12, true, false, 0x000000);
        Console.WriteLine(ReferenceEquals(d.StyleAt(0), d.StyleAt(2)).ToString().ToLower());   // true
        Console.WriteLine(d.DistinctStyles());                                                 // 1
        d.Append('?', "Arial", 12, false, true, 0x000000);   // a second, different style
        Console.WriteLine(ReferenceEquals(d.StyleAt(0), d.StyleAt(3)).ToString().ToLower());   // false
        Console.WriteLine(d.DistinctStyles());                                                 // 2
        try { d.StyleAt(10); }
        catch (IndexOutOfRangeException) { Console.WriteLine("index out of range"); }
    }
}` }
        ],
        complexity: `<p><code>append</code> amortised O(1); <code>styleAt</code> O(1). Memory ≈ 4 bytes/char (2 for the char, 2 for the style id) + O(distinct styles), versus ~60 bytes/char naively.</p>`,
        followUps: ['Store style runs (start index, style id) instead of one id per char — when is that better?', 'Support insert in the middle efficiently (rope / piece table) while keeping flyweight styles.', 'How would you garbage-collect styles no character uses anymore?']
      }
    }]
  });
  /* =====================================================================
     TOPIC 8 — CHOOSING THE RIGHT STRUCTURAL PATTERN
     ===================================================================== */
  var PICK_Q = [
    ['Q1', 'Wrong interface?', 'P1', 'Adapter'],
    ['Q2', 'Many classes, 1 entry?', 'P2', 'Facade'],
    ['Q3', 'Part-whole tree?', 'P3', 'Composite'],
    ['Q4', 'Two axes vary?', 'P4', 'Bridge'],
    ['Q5', 'Millions of twins?', 'P5', 'Flyweight'],
    ['Q6', 'Same API, add feature?', 'P6', 'Decorator'],
    ['Q7', 'Same API, control access?', 'P7', 'Proxy']
  ];
  var PICK_S = [
    ['Use a vendor SMS SDK (sendMsg(mobile, body) → "OK:123") through our Notifier.send(phone, text)', 0, 'The vendor class works but has the wrong method shape — translate, do not rewrite.'],
    ['Let callers stack gzip, encryption and checksums on any output stream, in any order', 5, 'Same interface (OutputStream), extra behaviour, combinable at runtime.'],
    ['Do not load a 50 MB report from S3 until the user actually opens it; also block non-owners', 6, 'Same interface, but the wrapper decides whether/when the real object is created or reached.'],
    ['Checkout needs Inventory, Pricing, Payment, Shipping, Email in order; three different callers do it today', 1, 'Hide many subsystems behind one simple use-case method.'],
    ['Total salary of any team, where teams contain people and other teams', 2, 'Part-whole hierarchy; treat a person and a team the same.'],
    ['Shapes (circle, square, star) must render on Canvas, SVG and PDF, and both lists grow', 3, 'Two independent dimensions — avoid M × N subclasses.'],
    ['A map app shows 5 million markers using 12 icon types', 4, 'Huge count of objects whose heavy data is identical — share it.']
  ];

  topics.push({
    title: 'Choosing the Right Structural Pattern',
    analogy: `<p>A carpenter's toolbox has a saw, a chisel and a plane. All three "remove wood", and a beginner grabs whichever is nearest. An expert reads the job first — "cut across", "carve a corner", "smooth a surface" — and the tool picks itself.</p>
      <p>Adapter, Decorator and Proxy are like that: in code they look <b>almost identical</b> (a class that wraps another and forwards calls). What separates them is the <b>job</b> — the intent. Read the requirement, name the job, and the pattern follows.</p>`,
    explain: `<p><b>Seven patterns, seven jobs.</b> Every structural pattern is about how objects are <i>connected</i>. Learn each one as a single sentence:</p>
      ${H.table(['Pattern', 'One-line job', 'Interface vs wrapped object', 'Telltale words'], [
        ['<b>Adapter</b>', 'make an existing class fit the interface I expect', H.c('y', 'different'), 'third-party, legacy, convert, incompatible'],
        ['<b>Decorator</b>', 'add behaviour by wrapping, stackable', H.c('g', 'same'), 'add-ons, toppings, any combination, around'],
        ['<b>Proxy</b>', 'control access to the real object', H.c('g', 'same'), 'lazy, cache, permission, remote, placeholder'],
        ['<b>Facade</b>', 'one simple entry over many classes', H.c('b', 'new, simpler'), 'simplify, orchestrate, SDK, one call'],
        ['<b>Composite</b>', 'treat one and a group alike in a tree', H.c('g', 'same for leaf and group'), 'nested, hierarchy, folder, bundle, team'],
        ['<b>Bridge</b>', 'split two dimensions into two hierarchies', 'abstraction holds implementor', 'X × Y combinations, platforms, drivers'],
        ['<b>Flyweight</b>', 'share identical heavy state between many objects', 'same', 'millions, memory, identical, intern']
      ])}
      <p><b>The three look-alikes</b> (all "wrap and delegate"):</p>
      ${H.kv([['Adapter', 'changes the shape (interface)'], ['Decorator', 'keeps the shape, changes the behaviour (adds)'], ['Proxy', 'keeps the shape and behaviour, controls access/lifecycle']])}
      <p>A quick test: <i>"If I removed the wrapper, would the client still compile?"</i> For a Decorator or Proxy, yes — it could use the real object directly (same interface). For an Adapter, no — the client cannot call the adaptee at all. And <i>"Who builds the wrapper?"</i> — decorators are usually stacked by the client; proxies are usually handed out by a factory/framework.</p>
      <p><b>Patterns combine.</b> Real designs mix them: a logging library is a <b>Facade</b> (<code>Logger.info</code>) over a <b>Bridge</b> (logger ↔ appender), where appenders can be <b>Decorated</b> (async, filtered) and grouped as a <b>Composite</b> (send to console + file). Interviewers reward naming the pattern <i>and</i> the trade-off, not reciting UML.</p>`,
    clues: ['Interviewer asks "<b>what is the difference between</b> Adapter, Decorator and Proxy?" — answer with intent + who builds it', '"design a logging framework / notification system / file system" — expect 2–3 structural patterns combined', '"<b>without modifying</b> existing classes" → a wrapping pattern; then ask: change shape, add behaviour, or control access?', '"<b>class explosion</b>" in the requirements → Decorator (optional add-ons) or Bridge (two axes)', '"<b>memory</b>" / "millions" → Flyweight; "<b>tree</b>" → Composite; "<b>simplify</b>" → Facade', 'beware over-engineering: "only one implementation, ever" → no pattern needed (YAGNI)'],
    code: [{ lang: 'java', title: 'Adapter vs Decorator vs Proxy on one interface', code: `
// Same target interface, three different INTENTS. Read the comments, not the shapes.
interface Storage { byte[] read(String key); }

class DiskStorage implements Storage {
    public byte[] read(String key) { return ("data:" + key).getBytes(); }
}

// ADAPTER: vendor class has the wrong shape; we translate.
class VendorBlobClient { String fetchBase64(String bucket, String path) { return Base64.getEncoder().encodeToString(path.getBytes()); } }
class BlobAdapter implements Storage {
    private final VendorBlobClient client; private final String bucket;
    BlobAdapter(VendorBlobClient c, String bucket) { client = c; this.bucket = bucket; }
    public byte[] read(String key) { return Base64.getDecoder().decode(client.fetchBase64(bucket, key)); }
}

// DECORATOR: same shape, ADD behaviour (decompress / checksum / log) — client stacks it.
class LoggingStorage implements Storage {
    private final Storage inner;
    LoggingStorage(Storage inner) { this.inner = inner; }
    public byte[] read(String key) {
        byte[] b = inner.read(key);
        System.out.println("read " + key + " (" + b.length + " bytes)");
        return b;
    }
}

// PROXY: same shape and behaviour, CONTROL access (permission + lazy creation).
class SecuredStorage implements Storage {
    private final java.util.function.Supplier<Storage> factory; private Storage real;
    private final Set<String> allowedPrefixes;
    SecuredStorage(java.util.function.Supplier<Storage> factory, Set<String> allowed) { this.factory = factory; this.allowedPrefixes = allowed; }
    public byte[] read(String key) {
        if (allowedPrefixes.stream().noneMatch(key::startsWith)) throw new SecurityException(key);
        if (real == null) real = factory.get();          // created on first allowed use
        return real.read(key);
    }
}

class PatternsSideBySide {
    public static void main(String[] args) {
        Storage s = new LoggingStorage(new SecuredStorage(DiskStorage::new, Set.of("public/")));
        System.out.println(new String(s.read("public/logo.png")));
        Storage blob = new LoggingStorage(new BlobAdapter(new VendorBlobClient(), "assets"));
        System.out.println(new String(blob.read("a.txt")));
    }
}`,
      alt: [
        { lang: 'python', code: `import base64
from abc import ABC, abstractmethod
from typing import Callable, Optional


# Same target interface, three different INTENTS. Read the comments, not the shapes.
class Storage(ABC):
    @abstractmethod
    def read(self, key: str) -> bytes: ...


class DiskStorage(Storage):
    def read(self, key: str) -> bytes:
        return f"data:{key}".encode()


# ADAPTER: vendor class has the wrong shape; we translate.
class VendorBlobClient:
    def fetch_base64(self, bucket: str, path: str) -> str:
        return base64.b64encode(path.encode()).decode()


class BlobAdapter(Storage):
    def __init__(self, client: VendorBlobClient, bucket: str) -> None:
        self._client = client
        self._bucket = bucket

    def read(self, key: str) -> bytes:
        return base64.b64decode(self._client.fetch_base64(self._bucket, key))


# DECORATOR: same shape, ADD behaviour (decompress / checksum / log) — client stacks it.
class LoggingStorage(Storage):
    def __init__(self, inner: Storage) -> None:
        self._inner = inner

    def read(self, key: str) -> bytes:
        b = self._inner.read(key)
        print(f"read {key} ({len(b)} bytes)")
        return b


# PROXY: same shape and behaviour, CONTROL access (permission + lazy creation).
class SecuredStorage(Storage):
    def __init__(self, factory: Callable[[], Storage], allowed_prefixes: set[str]) -> None:
        self._factory = factory
        self._allowed_prefixes = allowed_prefixes
        self._real: Optional[Storage] = None

    def read(self, key: str) -> bytes:
        if not any(key.startswith(p) for p in self._allowed_prefixes):
            raise PermissionError(key)
        if self._real is None:
            self._real = self._factory()  # created on first allowed use
        return self._real.read(key)


if __name__ == "__main__":
    s: Storage = LoggingStorage(SecuredStorage(DiskStorage, {"public/"}))
    print(s.read("public/logo.png").decode())
    blob: Storage = LoggingStorage(BlobAdapter(VendorBlobClient(), "assets"))
    print(blob.read("a.txt").decode())` },
        { lang: 'ts', code: `export {}; // makes this file a module, so our Storage never clashes with the DOM type of that name

// Same target interface, three different INTENTS. Read the comments, not the shapes.
interface Storage {
  read(key: string): Uint8Array;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

class DiskStorage implements Storage {
  read(key: string): Uint8Array { return enc.encode(\`data:\${key}\`); }
}

// ADAPTER: vendor class has the wrong shape; we translate.
class VendorBlobClient {
  fetchBase64(_bucket: string, path: string): string {
    return Buffer.from(path, "utf8").toString("base64");
  }
}

class BlobAdapter implements Storage {
  constructor(private readonly client: VendorBlobClient, private readonly bucket: string) {}
  read(key: string): Uint8Array {
    return Buffer.from(this.client.fetchBase64(this.bucket, key), "base64");
  }
}

// DECORATOR: same shape, ADD behaviour (decompress / checksum / log) — client stacks it.
class LoggingStorage implements Storage {
  constructor(private readonly inner: Storage) {}
  read(key: string): Uint8Array {
    const b = this.inner.read(key);
    console.log(\`read \${key} (\${b.length} bytes)\`);
    return b;
  }
}

// PROXY: same shape and behaviour, CONTROL access (permission + lazy creation).
class SecuredStorage implements Storage {
  private real: Storage | undefined;

  constructor(private readonly factory: () => Storage, private readonly allowedPrefixes: ReadonlySet<string>) {}

  read(key: string): Uint8Array {
    if (![...this.allowedPrefixes].some((p) => key.startsWith(p))) throw new Error(key);
    this.real ??= this.factory(); // created on first allowed use
    return this.real.read(key);
  }
}

const s: Storage = new LoggingStorage(new SecuredStorage(() => new DiskStorage(), new Set(["public/"])));
console.log(dec.decode(s.read("public/logo.png")));
const blob: Storage = new LoggingStorage(new BlobAdapter(new VendorBlobClient(), "assets"));
console.log(dec.decode(blob.read("a.txt")));` },
        { lang: 'cpp', code: `// Same target interface, three different INTENTS. Read the comments, not the shapes.
class Storage {
public:
    virtual ~Storage() = default;
    virtual string read(const string& key) = 0;     // std::string doubles as a byte buffer
};

class DiskStorage : public Storage {
public:
    string read(const string& key) override { return "data:" + key; }
};

// ADAPTER: vendor class has the wrong shape; we translate.
const string kAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

string base64Encode(const string& in) {
    string out;
    for (size_t i = 0; i < in.size(); i += 3) {
        unsigned n = static_cast<unsigned char>(in[i]) << 16;
        if (i + 1 < in.size()) n |= static_cast<unsigned char>(in[i + 1]) << 8;
        if (i + 2 < in.size()) n |= static_cast<unsigned char>(in[i + 2]);
        out += kAlphabet[n >> 18 & 63];
        out += kAlphabet[n >> 12 & 63];
        out += i + 1 < in.size() ? kAlphabet[n >> 6 & 63] : '=';
        out += i + 2 < in.size() ? kAlphabet[n & 63] : '=';
    }
    return out;
}

string base64Decode(const string& in) {
    string out;
    unsigned buf = 0;
    int bits = 0;
    for (char c : in) {
        size_t v = kAlphabet.find(c);
        if (v == string::npos) break;                // '=' padding ends the data
        buf = buf << 6 | static_cast<unsigned>(v);
        bits += 6;
        if (bits >= 8) { bits -= 8; out += static_cast<char>(buf >> bits & 0xFF); }
    }
    return out;
}

class VendorBlobClient {
public:
    string fetchBase64(const string&, const string& path) const { return base64Encode(path); }
};

class BlobAdapter : public Storage {
    const VendorBlobClient& client_;
    string bucket_;
public:
    BlobAdapter(const VendorBlobClient& c, string bucket) : client_(c), bucket_(std::move(bucket)) {}
    string read(const string& key) override { return base64Decode(client_.fetchBase64(bucket_, key)); }
};

// DECORATOR: same shape, ADD behaviour (decompress / checksum / log) — client stacks it.
class LoggingStorage : public Storage {
    unique_ptr<Storage> inner_;
public:
    explicit LoggingStorage(unique_ptr<Storage> inner) : inner_(std::move(inner)) {}
    string read(const string& key) override {
        string b = inner_->read(key);
        cout << "read " << key << " (" << b.size() << " bytes)\\n";
        return b;
    }
};

// PROXY: same shape and behaviour, CONTROL access (permission + lazy creation).
class SecuredStorage : public Storage {
    function<unique_ptr<Storage>()> factory_;
    unique_ptr<Storage> real_;
    set<string> allowedPrefixes_;
public:
    SecuredStorage(function<unique_ptr<Storage>()> factory, set<string> allowed)
        : factory_(std::move(factory)), allowedPrefixes_(std::move(allowed)) {}

    string read(const string& key) override {
        bool ok = any_of(allowedPrefixes_.begin(), allowedPrefixes_.end(),
                         [&](const string& p) { return key.rfind(p, 0) == 0; });
        if (!ok) throw runtime_error(key);
        if (!real_) real_ = factory_();              // created on first allowed use
        return real_->read(key);
    }
};

int main() {
    unique_ptr<Storage> s = make_unique<LoggingStorage>(make_unique<SecuredStorage>(
        [] { return make_unique<DiskStorage>(); }, set<string>{"public/"}));
    cout << s->read("public/logo.png") << "\\n";
    VendorBlobClient vendor;
    unique_ptr<Storage> blob = make_unique<LoggingStorage>(make_unique<BlobAdapter>(vendor, "assets"));
    cout << blob->read("a.txt") << "\\n";
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security;
using System.Text;

// Same target interface, three different INTENTS. Read the comments, not the shapes.
interface IStorage { byte[] Read(string key); }

class DiskStorage : IStorage {
    public byte[] Read(string key) { return Encoding.UTF8.GetBytes("data:" + key); }
}

// ADAPTER: vendor class has the wrong shape; we translate.
class VendorBlobClient { public string FetchBase64(string bucket, string path) { return Convert.ToBase64String(Encoding.UTF8.GetBytes(path)); } }
class BlobAdapter : IStorage {
    private readonly VendorBlobClient client; private readonly string bucket;
    public BlobAdapter(VendorBlobClient c, string bucket) { client = c; this.bucket = bucket; }
    public byte[] Read(string key) { return Convert.FromBase64String(client.FetchBase64(bucket, key)); }
}

// DECORATOR: same shape, ADD behaviour (decompress / checksum / log) — client stacks it.
class LoggingStorage : IStorage {
    private readonly IStorage inner;
    public LoggingStorage(IStorage inner) { this.inner = inner; }
    public byte[] Read(string key) {
        byte[] b = inner.Read(key);
        Console.WriteLine("read " + key + " (" + b.Length + " bytes)");
        return b;
    }
}

// PROXY: same shape and behaviour, CONTROL access (permission + lazy creation).
class SecuredStorage : IStorage {
    private readonly Func<IStorage> factory; private IStorage real;
    private readonly HashSet<string> allowedPrefixes;
    public SecuredStorage(Func<IStorage> factory, HashSet<string> allowed) { this.factory = factory; allowedPrefixes = allowed; }
    public byte[] Read(string key) {
        if (!allowedPrefixes.Any(key.StartsWith)) throw new SecurityException(key);
        if (real == null) real = factory();              // created on first allowed use
        return real.Read(key);
    }
}

class Program {
    static void Main() {
        IStorage s = new LoggingStorage(new SecuredStorage(() => new DiskStorage(), new HashSet<string> { "public/" }));
        Console.WriteLine(Encoding.UTF8.GetString(s.Read("public/logo.png")));
        IStorage blob = new LoggingStorage(new BlobAdapter(new VendorBlobClient(), "assets"));
        Console.WriteLine(Encoding.UTF8.GetString(blob.Read("a.txt")));
    }
}` }
      ] }],
    codeTitle: ['Adapter vs Decorator vs Proxy on one interface'],
    viz: {
      title: 'Decision path: which structural pattern fits?',
      input: '1 2 3 4 5 6 7',
      inputLabel: 'Scenario numbers to walk through (1–7)',
      gen: function (input) {
        var picks = words(input, 'Enter scenario numbers 1-7, e.g. 1 3 6', 7).map(Number);
        picks.forEach(function (n) { if (!(n >= 1 && n <= 7 && Math.floor(n) === n)) throw new Error('Scenarios are numbered 1 to 7'); });
        var nodes = [], edges = [];
        PICK_Q.forEach(function (q, i) {
          nodes.push(B(q[0], q[1], 28, 6 + i * 16));
          nodes.push(B(q[2], q[3], 80, 6 + i * 16));
          edges.push([q[0], q[2], 'yes']);
          if (i < PICK_Q.length - 1) edges.push([q[0], PICK_Q[i + 1][0], 'no']);
        });
        var f = [];
        f.push(F('<b>The decision ladder.</b> Ask the questions top to bottom; the first "yes" names the pattern. Order matters a little: "wrong interface?" comes first because an adapter is needed regardless of anything else, and the two "same API" questions come last because they separate the look-alikes by intent.',
          [G('Structural pattern chooser', nodes, edges, { h: 110 }), { type: 'table', label: 'scenarios', columns: ['#', 'requirement'], rows: PICK_S.map(function (s, i) { return [String(i + 1), s[0]]; }) }]));
        picks.forEach(function (n) {
          var s = PICK_S[n - 1], target = s[1], hl = {}, ehl = {};
          f.push(F('<b>Scenario ' + n + ':</b> "' + s[0] + '". Start at the top and ask each question honestly.',
            [G('Structural pattern chooser', nodes, edges, { h: 110, hl: { Q1: 'cur' } }), TXT('<b>Requirement:</b> ' + s[0], 'scenario ' + n)]));
          for (var i = 0; i < target; i++) { hl[PICK_Q[i][0]] = 'done'; ehl[PICK_Q[i][0] + '-' + PICK_Q[i + 1][0]] = 'done'; }
          hl[PICK_Q[target][0]] = 'ok'; hl[PICK_Q[target][2]] = 'sel'; ehl[PICK_Q[target][0] + '-' + PICK_Q[target][2]] = 'ok';
          f.push(F((target > 0 ? 'The first ' + target + ' question(s) are "no". ' : '') + '"' + PICK_Q[target][1] + '" → <b>yes</b>. Pattern: <b>' + PICK_Q[target][3] + '</b>. Why: ' + s[2],
            [G('Structural pattern chooser', nodes, edges, { h: 110, hl: hl, ehl: ehl, tags: one(PICK_Q[target][2], 'answer') }), VARS('verdict', { scenario: n, pattern: PICK_Q[target][3] }, { pattern: 'sel' })]));
        });
        f.push(F('<b>Cheat sheet.</b> Wrapping patterns differ by intent: Adapter changes the <i>interface</i>, Decorator adds <i>behaviour</i>, Proxy controls <i>access</i>. Facade simplifies <i>many</i> classes; Composite unifies <i>trees</i>; Bridge splits <i>two axes</i>; Flyweight shares <i>memory</i>.',
          [{ type: 'table', label: 'remember by the verb', columns: ['Pattern', 'verb'], rows: [['Adapter', 'translate'], ['Decorator', 'add'], ['Proxy', 'guard / delay / cache'], ['Facade', 'simplify'], ['Composite', 'nest'], ['Bridge', 'separate'], ['Flyweight', 'share']], hl: { 0: 'sel', 1: 'sel', 2: 'sel' } }]));
        return f;
      }
    },
    examples: [
      { title: 'Same code shape, different names: how to tell', html: `<p>Class <code>X implements Storage</code> holding a <code>Storage</code>, forwarding <code>read()</code> and adding a check before it. Is it a Decorator or a Proxy? Ask: does the check <i>add a feature</i> the caller asked for (compression → Decorator), or <i>guard access</i> to the same feature (permission, lazy, cache → Proxy)? If the wrapped field were a <i>different</i> type (<code>VendorBlobClient</code>), it would be an Adapter.</p>` },
      { title: 'Logging framework uses four patterns at once', html: `<p>${H.chips(['Facade: Logger.info(...)', 'Bridge: Logger → Appender interface', 'Composite: MultiAppender(console, file)', 'Decorator: AsyncAppender(FileAppender)'], { hl: { 'Facade: Logger.info(...)': 'b' } })} Log4j/Logback really are structured this way. Being able to point at each piece and name it is a strong interview signal.</p>` },
      { title: 'When NOT to use a pattern', html: `<p>One payment provider, no plan for a second: an <code>interface PaymentGateway</code> + adapter is cheap and fine, but a full Bridge with abstraction hierarchies is over-engineering. A list of 200 objects: Flyweight is pointless. A single optional feature that every call needs: just put it in the class. Patterns are answers to <i>forces</i> (change, scale, memory) — no force, no pattern.</p>` },
      { title: 'Decorator vs Composite — both have "a list or field of the same type"', html: `<p>A decorator wraps <b>exactly one</b> component and adds behaviour; a composite holds <b>many</b> children and combines their results. A <code>MultiAppender(List&lt;Appender&gt;)</code> that forwards each log line to all children is a Composite; an <code>AsyncAppender(Appender)</code> that queues lines for one child is a Decorator.</p>` }
    ],
    deepDive: `<p><b>Patterns as answers to forces.</b> Each structural pattern removes one kind of pain: <i>incompatibility</i> (Adapter), <i>combinatorial features</i> (Decorator), <i>access/lifecycle concerns mixed into business code</i> (Proxy), <i>coupling to many subsystems</i> (Facade), <i>type checks over hierarchies</i> (Composite), <i>M × N subclassing</i> (Bridge), <i>memory from duplication</i> (Flyweight). In an interview, name the force first ("the danger here is class explosion along two axes"), then the pattern.</p>
      <p><b>Costs you should volunteer.</b> Indirection (harder debugging, deeper stack traces), more classes, identity surprises (<code>==</code>, <code>instanceof</code>, <code>getClass()</code> on wrappers and proxies), and performance overhead per layer (usually negligible, but not for a hot inner loop or a flyweight-scale count). Frameworks hide wrappers (Spring proxies, Hibernate proxies), so knowing the patterns explains framework "magic" bugs like self-invocation and lazy-initialisation exceptions.</p>
      <p><b>Modern language tools:</b> immutable value types (Java records, Python frozen dataclasses, TypeScript <code>readonly</code>, C++ <code>const</code> members) make flyweights and composite leaves trivially safe to share; closed type sets (Java sealed interfaces, TypeScript unions, C++ <code>std::variant</code>) make composites exhaustive; lambdas turn single-method decorators and adapters into one-liners (<code>Function.andThen</code>, method references as adapters: <code>Runnable r = service::start</code>); <code>java.lang.reflect.Proxy</code> gives dynamic proxies; virtual threads change nothing structurally but make blocking proxies (remote calls) cheaper.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating the code of any of these patterns takes seconds now, so interviews and code reviews focus on <i>selection and trade-offs</i>. In AI-assisted codebases you will also <i>review</i> lots of generated wrappers — and the common failure is the wrong pattern for the force (a "Manager" god facade, a decorator that is really a proxy with hidden caching, a bridge for a single implementation).</p>
      <p><b>AI systems are built from these patterns:</b> tool adapters (MCP servers adapt APIs), guardrail decorators around model calls, LLM gateways as proxies, agent "task" facades, hierarchical plans as composites, a provider bridge (features × model vendors), and KV-cache sharing as flyweights. <b>Use AI as a partner:</b> <code>Here are the requirements. List the forces you see (change axes, memory, access control) and for each, the structural pattern and its cost. Do not write code yet.</code> <b>Where AI goes wrong:</b> naming patterns by shape instead of intent, and stacking patterns where a plain class would do. <b>What you must still own:</b> the judgment call and the ability to defend it.</p>`,
    problems: [{
      title: 'Design a Mini Logging Library (Four Patterns, One Design)',
      level: 'Hard', tags: ['facade', 'bridge', 'composite', 'decorator'], companies: ['Amazon', 'Atlassian', 'Uber', 'Microsoft'],
      statement: `<p>Build a small logging library. Callers write <code>Log.get("orders").info("placed {}", id)</code>. Requirements: (1) levels DEBUG &lt; INFO &lt; WARN &lt; ERROR with a minimum level per logger; (2) outputs ("appenders"): console and in-memory (for tests), more later; (3) send one logger to <b>several</b> appenders; (4) optional per-appender features: <b>level filter</b> and <b>prefix with timestamp</b>, combinable. Name the pattern behind each requirement.</p>`,
      constraints: `<p>Adding a new appender or a new appender feature must not edit existing classes. Callers must never see appender classes. Formatting replaces each <code>{}</code> with the next argument.</p>`,
      example: `<p><code>Log.configure("orders", Level.INFO, new Multi(new Console(), new Filtered(new Memory(), Level.WARN)))</code>. Then <code>info("placed {}", 42)</code> → ${H.c('g', 'console prints it')}, memory ${H.c('r', 'ignores it')} (below WARN). <code>error("failed {}", 7)</code> → both receive it.</p>`,
      brute: { why: `<p>One <code>Logger</code> class with a <code>switch (outputType)</code> for console/file/memory, boolean flags for timestamp and filters, and a list of output names to loop over. Every new output adds a case inside the logger; every feature adds flags checked in every case; tests cannot capture output without editing the class. It is a god class that violates Open/Closed in three directions at once.</p>`, code: { lang: 'java', code: `class Logger {
    String output = "console"; boolean timestamp; int minLevel = 1;
    final List<String> memory = new ArrayList<>();
    void log(int level, String msg) {
        if (level < minLevel) return;
        String line = timestamp ? System.currentTimeMillis() + " " + msg : msg;
        switch (output) {
            case "console" -> System.out.println(line);
            case "memory" -> memory.add(line);
            case "both" -> { System.out.println(line); memory.add(line); }
            default -> throw new IllegalStateException(output);
        }
    }
}`, alt: [
                { lang: 'python', code: `
import time

class Logger:
    def __init__(self):
        self.output = "console"; self.timestamp = False; self.min_level = 1
        self.memory = []
    def log(self, level, msg):
        if level < self.min_level: return
        line = f"{int(time.time() * 1000)} {msg}" if self.timestamp else msg
        match self.output:
            case "console": print(line)
            case "memory": self.memory.append(line)
            case "both": print(line); self.memory.append(line)
            case _: raise RuntimeError(self.output)` },
                { lang: 'ts', code: `
class Logger {
    output = "console"; timestamp = false; minLevel = 1;
    readonly memory: string[] = [];
    log(level: number, msg: string): void {
        if (level < this.minLevel) return;
        const line = this.timestamp ? Date.now() + " " + msg : msg;
        switch (this.output) {
            case "console": console.log(line); break;
            case "memory": this.memory.push(line); break;
            case "both": console.log(line); this.memory.push(line); break;
            default: throw new Error(this.output);
        }
    }
}` },
                { lang: 'cpp', code: `
class Logger {
public:
    string output = "console"; bool timestamp = false; int minLevel = 1;
    vector<string> memory;
    void log(int level, const string& msg) {
        if (level < minLevel) return;
        string line = timestamp ? to_string(time(nullptr)) + " " + msg : msg;
        if (output == "console") cout << line << "\\n";
        else if (output == "memory") memory.push_back(line);
        else if (output == "both") { cout << line << "\\n"; memory.push_back(line); }
        else throw runtime_error(output);
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class Logger {
    public string Output = "console"; public bool Timestamp; public int MinLevel = 1;
    public readonly List<string> Memory = new List<string>();
    public void Log(int level, string msg) {
        if (level < MinLevel) return;
        string line = Timestamp ? DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() + " " + msg : msg;
        switch (Output) {
            case "console": Console.WriteLine(line); break;
            case "memory": Memory.Add(line); break;
            case "both": Console.WriteLine(line); Memory.Add(line); break;
            default: throw new InvalidOperationException(Output);
        }
    }
}` }
              ] } },
      mcq: { q: '"Send one logger to several appenders, and the logger should not care how many" — which pattern?', options: ['Decorator', 'Composite (an appender that holds a list of appenders)', 'Flyweight', 'Adapter'], answer: 1, explain: 'A MultiAppender implements Appender and forwards each event to all its children — one and many treated alike.' },
      hints: [`<p>Hint 1: Map requirements to forces: simple caller API → Facade; logger vs output vary independently → Bridge (Logger holds an Appender interface); many outputs as one → Composite; optional stackable features → Decorator.</p>`, `<p>Hint 2: <code>interface Appender { void append(Level l, String logger, String msg); }</code>. Console/Memory are concrete; <code>Multi</code> holds a list; <code>Filtered</code> and <code>Timestamped</code> wrap one appender.</p>`, `<p>Hint 3: <code>Log</code> is a static facade with a thread-safe map from name to <code>Logger</code> (<code>ConcurrentHashMap</code> / <code>dict</code> + lock / <code>unordered_map</code> + mutex). <code>Logger.log</code> checks its min level, formats <code>{}</code> placeholders once, then calls its appender. Unconfigured loggers default to INFO + console.</p>`],
      tests: { io: true, cases: [{ stdin: '', stdout: "INFO [orders] placed 42\nERROR [orders] failed 7 of 9\nmemory has 1 line(s)\nERROR 2026-01-01T00:00:00Z failed 7 of 9\nWARN [payments] low stock SKU-1\nINFO [payments] literal {} stays\n" }] },
      solution: {
        approach: `<p><b>Facade:</b> static <code>Log.get(name)</code> / <code>Log.configure(...)</code> hide registry and wiring. <b>Bridge:</b> <code>Logger</code> (abstraction: levels, formatting) holds an <code>Appender</code> (implementor: where text goes) — each side grows independently. <b>Composite:</b> <code>Multi</code> is an Appender containing Appenders. <b>Decorator:</b> <code>Filtered</code> and <code>Timestamped</code> wrap one Appender and add behaviour; they stack in any order. New output = new Appender class; new feature = new decorator; callers untouched.</p>`,
        code: `enum Level { DEBUG, INFO, WARN, ERROR }

// ---- Implementor side of the bridge ----
interface Appender { void append(Level level, String logger, String message); }

class Console implements Appender {
    public void append(Level l, String lg, String m) { System.out.println(l + " [" + lg + "] " + m); }
}
class Memory implements Appender {                       // great for tests
    final List<String> lines = new CopyOnWriteArrayList<>();
    public void append(Level l, String lg, String m) { lines.add(l + " " + m); }
}

// ---- Composite: many appenders treated as one ----
class Multi implements Appender {
    private final List<Appender> children;
    Multi(Appender... children) { this.children = List.of(children); }
    public void append(Level l, String lg, String m) { for (Appender a : children) a.append(l, lg, m); }
}

// ---- Decorators: optional, stackable features ----
class Filtered implements Appender {
    private final Appender inner; private final Level min;
    Filtered(Appender inner, Level min) { this.inner = inner; this.min = min; }
    public void append(Level l, String lg, String m) { if (l.compareTo(min) >= 0) inner.append(l, lg, m); }
}
class Timestamped implements Appender {
    private final Appender inner; private final java.util.function.Supplier<Instant> clock;
    Timestamped(Appender inner, java.util.function.Supplier<Instant> clock) { this.inner = inner; this.clock = clock; }
    public void append(Level l, String lg, String m) { inner.append(l, lg, clock.get() + " " + m); }
}

// ---- Abstraction side of the bridge ----
final class Logger {
    private final String name; private volatile Level min; private volatile Appender out;
    Logger(String name, Level min, Appender out) { this.name = name; this.min = min; this.out = out; }
    void reconfigure(Level m, Appender a) { min = m; out = a; }

    void debug(String f, Object... a) { log(Level.DEBUG, f, a); }
    void info(String f, Object... a)  { log(Level.INFO, f, a); }
    void warn(String f, Object... a)  { log(Level.WARN, f, a); }
    void error(String f, Object... a) { log(Level.ERROR, f, a); }

    private void log(Level level, String fmt, Object[] args) {
        if (level.compareTo(min) < 0) return;               // cheap check before formatting
        StringBuilder sb = new StringBuilder();
        int argIdx = 0, i = 0;
        while (i < fmt.length()) {
            if (i + 1 < fmt.length() && fmt.charAt(i) == '{' && fmt.charAt(i + 1) == '}' && argIdx < args.length) {
                sb.append(args[argIdx++]); i += 2;
            } else sb.append(fmt.charAt(i++));
        }
        out.append(level, name, sb.toString());
    }
}

// ---- Facade: the only class callers know ----
final class Log {
    private static final Map<String, Logger> LOGGERS = new ConcurrentHashMap<>();
    private Log() {}
    static Logger get(String name) { return LOGGERS.computeIfAbsent(name, n -> new Logger(n, Level.INFO, new Console())); }
    static void configure(String name, Level min, Appender out) { get(name).reconfigure(min, out); }

    public static void main(String[] args) {
        Memory mem = new Memory();
        Instant fixed = Instant.parse("2026-01-01T00:00:00Z");   // fixed clock keeps the output stable
        Log.configure("orders", Level.INFO,
            new Multi(new Console(), new Filtered(new Timestamped(mem, () -> fixed), Level.WARN)));
        Logger log = Log.get("orders");
        log.debug("hidden {}", 1);          // below INFO: dropped before formatting
        log.info("placed {}", 42);          // console only
        log.error("failed {} of {}", 7, 9); // console + memory (timestamped)
        System.out.println("memory has " + mem.lines.size() + " line(s)");   // 1
        mem.lines.forEach(System.out::println);                              // ERROR 2026-01-01T00:00:00Z failed 7 of 9
        Log.get("payments").warn("low stock {}", "SKU-1");     // unconfigured: INFO + console by default
        Log.get("payments").info("literal {} stays");          // fewer args than {}: the rest is kept as is
    }
}`,
        alt: [
          { lang: 'python', code: `import threading
from abc import ABC, abstractmethod
from enum import IntEnum
from typing import Callable


class Level(IntEnum):
    DEBUG = 0
    INFO = 1
    WARN = 2
    ERROR = 3


# ---- Implementor side of the bridge ----
class Appender(ABC):
    @abstractmethod
    def append(self, level: Level, logger: str, message: str) -> None: ...


class Console(Appender):
    def append(self, level: Level, logger: str, message: str) -> None:
        print(f"{level.name} [{logger}] {message}")


class Memory(Appender):  # great for tests
    def __init__(self) -> None:
        self.lines: list[str] = []

    def append(self, level: Level, logger: str, message: str) -> None:
        self.lines.append(f"{level.name} {message}")


# ---- Composite: many appenders treated as one ----
class Multi(Appender):
    def __init__(self, *children: Appender) -> None:
        self._children = children

    def append(self, level: Level, logger: str, message: str) -> None:
        for child in self._children:
            child.append(level, logger, message)


# ---- Decorators: optional, stackable features ----
class Filtered(Appender):
    def __init__(self, inner: Appender, minimum: Level) -> None:
        self._inner = inner
        self._min = minimum

    def append(self, level: Level, logger: str, message: str) -> None:
        if level >= self._min:
            self._inner.append(level, logger, message)


class Timestamped(Appender):
    def __init__(self, inner: Appender, clock: Callable[[], str]) -> None:
        self._inner = inner
        self._clock = clock

    def append(self, level: Level, logger: str, message: str) -> None:
        self._inner.append(level, logger, f"{self._clock()} {message}")


# ---- Abstraction side of the bridge ----
class Logger:
    def __init__(self, name: str, minimum: Level, out: Appender) -> None:
        self._name = name
        self._min = minimum
        self._out = out

    def reconfigure(self, minimum: Level, out: Appender) -> None:
        self._min = minimum
        self._out = out

    def debug(self, fmt: str, *args: object) -> None:
        self._log(Level.DEBUG, fmt, args)

    def info(self, fmt: str, *args: object) -> None:
        self._log(Level.INFO, fmt, args)

    def warn(self, fmt: str, *args: object) -> None:
        self._log(Level.WARN, fmt, args)

    def error(self, fmt: str, *args: object) -> None:
        self._log(Level.ERROR, fmt, args)

    def _log(self, level: Level, fmt: str, args: tuple[object, ...]) -> None:
        if level < self._min:  # cheap check before formatting
            return
        message = fmt
        for a in args:  # replace each {} with the next argument
            message = message.replace("{}", str(a), 1)
        self._out.append(level, self._name, message)


# ---- Facade: the only class callers know ----
class Log:
    _loggers: dict[str, Logger] = {}
    _lock = threading.Lock()

    @staticmethod
    def get(name: str) -> Logger:
        with Log._lock:
            if name not in Log._loggers:
                Log._loggers[name] = Logger(name, Level.INFO, Console())
            return Log._loggers[name]

    @staticmethod
    def configure(name: str, minimum: Level, out: Appender) -> None:
        Log.get(name).reconfigure(minimum, out)


if __name__ == "__main__":
    mem = Memory()
    fixed = "2026-01-01T00:00:00Z"  # fixed clock keeps the output stable
    Log.configure("orders", Level.INFO, Multi(Console(), Filtered(Timestamped(mem, lambda: fixed), Level.WARN)))
    log = Log.get("orders")
    log.debug("hidden {}", 1)  # below INFO: dropped before formatting
    log.info("placed {}", 42)  # console only
    log.error("failed {} of {}", 7, 9)  # console + memory (timestamped)
    print(f"memory has {len(mem.lines)} line(s)")  # 1
    for line in mem.lines:
        print(line)  # ERROR 2026-01-01T00:00:00Z failed 7 of 9
    Log.get("payments").warn("low stock {}", "SKU-1")  # unconfigured: INFO + console by default
    Log.get("payments").info("literal {} stays")  # fewer args than {}: the rest is kept as is` },
          { lang: 'ts', code: `export {}; // makes this file a module, so class Console never clashes with the global Console type

enum Level { DEBUG, INFO, WARN, ERROR }

// ---- Implementor side of the bridge ----
interface Appender {
  append(level: Level, logger: string, message: string): void;
}

class Console implements Appender {
  append(level: Level, logger: string, message: string): void {
    console.log(\`\${Level[level]} [\${logger}] \${message}\`);
  }
}

class Memory implements Appender { // great for tests
  readonly lines: string[] = [];

  append(level: Level, _logger: string, message: string): void {
    this.lines.push(\`\${Level[level]} \${message}\`);
  }
}

// ---- Composite: many appenders treated as one ----
class Multi implements Appender {
  private readonly children: Appender[];

  constructor(...children: Appender[]) {
    this.children = children;
  }

  append(level: Level, logger: string, message: string): void {
    for (const child of this.children) child.append(level, logger, message);
  }
}

// ---- Decorators: optional, stackable features ----
class Filtered implements Appender {
  constructor(private readonly inner: Appender, private readonly min: Level) {}

  append(level: Level, logger: string, message: string): void {
    if (level >= this.min) this.inner.append(level, logger, message);
  }
}

class Timestamped implements Appender {
  constructor(private readonly inner: Appender, private readonly clock: () => string) {}

  append(level: Level, logger: string, message: string): void {
    this.inner.append(level, logger, \`\${this.clock()} \${message}\`);
  }
}

// ---- Abstraction side of the bridge ----
class Logger {
  constructor(private readonly name: string, private min: Level, private out: Appender) {}

  reconfigure(min: Level, out: Appender): void {
    this.min = min;
    this.out = out;
  }

  debug(fmt: string, ...args: unknown[]): void { this.log(Level.DEBUG, fmt, args); }
  info(fmt: string, ...args: unknown[]): void { this.log(Level.INFO, fmt, args); }
  warn(fmt: string, ...args: unknown[]): void { this.log(Level.WARN, fmt, args); }
  error(fmt: string, ...args: unknown[]): void { this.log(Level.ERROR, fmt, args); }

  private log(level: Level, fmt: string, args: unknown[]): void {
    if (level < this.min) return; // cheap check before formatting
    let i = 0;
    const message = fmt.replace(/\\{\\}/g, (hole) => (i < args.length ? String(args[i++]) : hole));
    this.out.append(level, this.name, message);
  }
}

// ---- Facade: the only class callers know ----
class Log {
  private static readonly loggers = new Map<string, Logger>();

  private constructor() {}

  static get(name: string): Logger {
    let logger = Log.loggers.get(name);
    if (!logger) {
      logger = new Logger(name, Level.INFO, new Console());
      Log.loggers.set(name, logger);
    }
    return logger;
  }

  static configure(name: string, min: Level, out: Appender): void {
    Log.get(name).reconfigure(min, out);
  }
}

const mem = new Memory();
const fixed = "2026-01-01T00:00:00Z"; // fixed clock keeps the output stable
Log.configure("orders", Level.INFO, new Multi(new Console(), new Filtered(new Timestamped(mem, () => fixed), Level.WARN)));
const log = Log.get("orders");
log.debug("hidden {}", 1); // below INFO: dropped before formatting
log.info("placed {}", 42); // console only
log.error("failed {} of {}", 7, 9); // console + memory (timestamped)
console.log(\`memory has \${mem.lines.length} line(s)\`); // 1
for (const line of mem.lines) console.log(line); // ERROR 2026-01-01T00:00:00Z failed 7 of 9
Log.get("payments").warn("low stock {}", "SKU-1"); // unconfigured: INFO + console by default
Log.get("payments").info("literal {} stays"); // fewer args than {}: the rest is kept as is` },
          { lang: 'cpp', code: `enum class Level { DEBUG, INFO, WARN, ERROR };

const char* levelName(Level l) {
    switch (l) {
        case Level::DEBUG: return "DEBUG";
        case Level::INFO:  return "INFO";
        case Level::WARN:  return "WARN";
        case Level::ERROR: return "ERROR";
    }
    return "?";
}

// ---- Implementor side of the bridge ----
class Appender {
public:
    virtual ~Appender() = default;
    virtual void append(Level level, const string& logger, const string& message) = 0;
};

class Console : public Appender {
public:
    void append(Level level, const string& logger, const string& message) override {
        cout << levelName(level) << " [" << logger << "] " << message << "\\n";
    }
};

class Memory : public Appender {                           // great for tests
public:
    vector<string> lines;
    void append(Level level, const string&, const string& message) override {
        lines.push_back(string(levelName(level)) + " " + message);
    }
};

// ---- Composite: many appenders treated as one ----
class Multi : public Appender {
    vector<shared_ptr<Appender>> children_;
public:
    explicit Multi(vector<shared_ptr<Appender>> children) : children_(std::move(children)) {}
    void append(Level level, const string& logger, const string& message) override {
        for (auto& c : children_) c->append(level, logger, message);
    }
};

// ---- Decorators: optional, stackable features ----
class Filtered : public Appender {
    shared_ptr<Appender> inner_;
    Level min_;
public:
    Filtered(shared_ptr<Appender> inner, Level min) : inner_(std::move(inner)), min_(min) {}
    void append(Level level, const string& logger, const string& message) override {
        if (level >= min_) inner_->append(level, logger, message);
    }
};

class Timestamped : public Appender {
    shared_ptr<Appender> inner_;
    function<string()> clock_;
public:
    Timestamped(shared_ptr<Appender> inner, function<string()> clock) : inner_(std::move(inner)), clock_(std::move(clock)) {}
    void append(Level level, const string& logger, const string& message) override {
        inner_->append(level, logger, clock_() + " " + message);
    }
};

// ---- Abstraction side of the bridge ----
class Logger {
    string name_;
    Level min_;
    shared_ptr<Appender> out_;

    void log(Level level, const string& fmt, const vector<string>& args) {
        if (level < min_) return;                          // cheap check before formatting
        string msg;
        size_t argIdx = 0;
        for (size_t i = 0; i < fmt.size();) {
            if (fmt.compare(i, 2, "{}") == 0 && argIdx < args.size()) { msg += args[argIdx++]; i += 2; }
            else msg += fmt[i++];
        }
        out_->append(level, name_, msg);
    }
    template <class... A>
    static vector<string> strs(const A&... a) {
        vector<string> v;
        ((v.push_back((ostringstream() << a).str())), ...);   // fold: one string per argument
        return v;
    }
public:
    Logger(string name, Level min, shared_ptr<Appender> out) : name_(std::move(name)), min_(min), out_(std::move(out)) {}
    void reconfigure(Level m, shared_ptr<Appender> a) { min_ = m; out_ = std::move(a); }

    template <class... A> void debug(const string& f, const A&... a) { log(Level::DEBUG, f, strs(a...)); }
    template <class... A> void info(const string& f, const A&... a)  { log(Level::INFO, f, strs(a...)); }
    template <class... A> void warn(const string& f, const A&... a)  { log(Level::WARN, f, strs(a...)); }
    template <class... A> void error(const string& f, const A&... a) { log(Level::ERROR, f, strs(a...)); }
};

// ---- Facade: the only class callers know ----
class Log {
    static inline map<string, unique_ptr<Logger>> loggers_;
    static inline mutex mu_;
    Log() = delete;
public:
    static Logger& get(const string& name) {
        lock_guard<mutex> lock(mu_);
        auto& slot = loggers_[name];
        if (!slot) slot = make_unique<Logger>(name, Level::INFO, make_shared<Console>());
        return *slot;
    }
    static void configure(const string& name, Level min, shared_ptr<Appender> out) {
        get(name).reconfigure(min, std::move(out));
    }
};

int main() {
    auto mem = make_shared<Memory>();
    const string fixed = "2026-01-01T00:00:00Z";           // fixed clock keeps the output stable
    Log::configure("orders", Level::INFO, make_shared<Multi>(vector<shared_ptr<Appender>>{
        make_shared<Console>(),
        make_shared<Filtered>(make_shared<Timestamped>(mem, [fixed] { return fixed; }), Level::WARN)}));
    Logger& log = Log::get("orders");
    log.debug("hidden {}", 1);                             // below INFO: dropped before formatting
    log.info("placed {}", 42);                             // console only
    log.error("failed {} of {}", 7, 9);                    // console + memory (timestamped)
    cout << "memory has " << mem->lines.size() << " line(s)\\n";   // 1
    for (const string& line : mem->lines) cout << line << "\\n";  // ERROR 2026-01-01T00:00:00Z failed 7 of 9
    Log::get("payments").warn("low stock {}", "SKU-1");    // unconfigured: INFO + console by default
    Log::get("payments").info("literal {} stays");         // fewer args than {}: the rest is kept as is
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Text;

enum Level { DEBUG, INFO, WARN, ERROR }

// ---- Implementor side of the bridge ----
interface IAppender { void Append(Level level, string logger, string message); }

class ConsoleAppender : IAppender {
    public void Append(Level l, string lg, string m) { Console.WriteLine(l + " [" + lg + "] " + m); }
}
class MemoryAppender : IAppender {                       // great for tests
    public readonly List<string> Lines = new List<string>();
    private readonly object gate = new object();
    public void Append(Level l, string lg, string m) { lock (gate) Lines.Add(l + " " + m); }
}

// ---- Composite: many appenders treated as one ----
class Multi : IAppender {
    private readonly List<IAppender> children;
    public Multi(params IAppender[] children) { this.children = new List<IAppender>(children); }
    public void Append(Level l, string lg, string m) { foreach (IAppender a in children) a.Append(l, lg, m); }
}

// ---- Decorators: optional, stackable features ----
class Filtered : IAppender {
    private readonly IAppender inner; private readonly Level min;
    public Filtered(IAppender inner, Level min) { this.inner = inner; this.min = min; }
    public void Append(Level l, string lg, string m) { if (l >= min) inner.Append(l, lg, m); }
}
class Timestamped : IAppender {
    private readonly IAppender inner; private readonly Func<DateTime> clock;
    public Timestamped(IAppender inner, Func<DateTime> clock) { this.inner = inner; this.clock = clock; }
    public void Append(Level l, string lg, string m) { inner.Append(l, lg, clock().ToString("yyyy-MM-ddTHH:mm:ssZ") + " " + m); }
}

// ---- Abstraction side of the bridge ----
sealed class Logger {
    private readonly string name; private volatile Level min; private volatile IAppender output;
    public Logger(string name, Level min, IAppender output) { this.name = name; this.min = min; this.output = output; }
    public void Reconfigure(Level m, IAppender a) { min = m; output = a; }

    public void Debug(string f, params object[] a) { Log(Level.DEBUG, f, a); }
    public void Info(string f, params object[] a)  { Log(Level.INFO, f, a); }
    public void Warn(string f, params object[] a)  { Log(Level.WARN, f, a); }
    public void Error(string f, params object[] a) { Log(Level.ERROR, f, a); }

    private void Log(Level level, string fmt, object[] args) {
        if (level < min) return;                             // cheap check before formatting
        StringBuilder sb = new StringBuilder();
        int argIdx = 0, i = 0;
        while (i < fmt.Length) {
            if (i + 1 < fmt.Length && fmt[i] == '{' && fmt[i + 1] == '}' && argIdx < args.Length) {
                sb.Append(args[argIdx++]); i += 2;
            } else sb.Append(fmt[i++]);
        }
        output.Append(level, name, sb.ToString());
    }
}

// ---- Facade: the only class callers know ----
static class Log {
    private static readonly ConcurrentDictionary<string, Logger> Loggers = new ConcurrentDictionary<string, Logger>();
    public static Logger Get(string name) { return Loggers.GetOrAdd(name, n => new Logger(n, Level.INFO, new ConsoleAppender())); }
    public static void Configure(string name, Level min, IAppender output) { Get(name).Reconfigure(min, output); }
}

class Program {
    static void Main() {
        MemoryAppender mem = new MemoryAppender();
        DateTime fixedTime = new DateTime(2026, 1, 1, 0, 0, 0);   // fixed clock keeps the output stable
        Log.Configure("orders", Level.INFO,
            new Multi(new ConsoleAppender(), new Filtered(new Timestamped(mem, () => fixedTime), Level.WARN)));
        Logger log = Log.Get("orders");
        log.Debug("hidden {}", 1);          // below INFO: dropped before formatting
        log.Info("placed {}", 42);          // console only
        log.Error("failed {} of {}", 7, 9); // console + memory (timestamped)
        Console.WriteLine("memory has " + mem.Lines.Count + " line(s)");   // 1
        mem.Lines.ForEach(Console.WriteLine);                               // ERROR 2026-01-01T00:00:00Z failed 7 of 9
        Log.Get("payments").Warn("low stock {}", "SKU-1");     // unconfigured: INFO + console by default
        Log.Get("payments").Info("literal {} stays");          // fewer args than {}: the rest is kept as is
    }
}` }
        ],
        complexity: `<p>Per log call: O(length of message) formatting + O(number of appenders) in the composite tree. Disabled levels cost one comparison (formatting skipped). Adding outputs/features is O(1) new classes, zero edits.</p>`,
        followUps: ['Add an AsyncAppender decorator with a bounded queue — what happens when the queue is full?', 'Support logger hierarchies ("orders.payment" inherits from "orders") — which pattern helps?', 'Avoid building the message string when the level is disabled for expensive arguments (Supplier&lt;String&gt;).']
      }
    }]
  });
  /* =====================================================================
     PRACTICE — EASY
     ===================================================================== */
  practice.push({
    title: 'Pizza Builder: Toppings Without Subclasses',
    level: 'Easy', tags: ['decorator', 'which pattern fits'], companies: ['Swiggy', 'Zomato', 'Domino\'s'],
    statement: `<p>A pizza app has bases <b>Thin</b> (₹200) and <b>Pan</b> (₹250), and toppings <b>Cheese</b> (+₹50), <b>Olives</b> (+₹30), <b>Paneer</b> (+₹70). A customer may add any toppings, any number of times ("double cheese"). Return the final <code>price()</code> and <code>description()</code>. First decide which structural pattern fits, then implement it.</p>`,
    constraints: `<p>≤ 10 toppings per pizza. New toppings will be added monthly without editing existing classes.</p>`,
    example: `<p><code>new Paneer(new Cheese(new Cheese(new Thin())))</code> → "Thin, Cheese, Cheese, Paneer" and ₹200 + 50 + 50 + 70 = <b>${H.c('g', '₹370')}</b>.</p>`,
    brute: { why: `<p>A subclass per combination (<code>ThinCheese</code>, <code>ThinCheeseOlives</code>, …) explodes to 2 × 2<sup>3</sup> = 16 classes without doubles, infinitely many with doubles. A single class with boolean flags (<code>hasCheese</code>) cannot express "double cheese" and must be edited for every new topping.</p>`, code: { lang: 'java', code: `class Pizza {
    String base = "Thin"; boolean cheese, olives, paneer;
    int price() {
        int p = base.equals("Thin") ? 200 : 250;
        if (cheese) p += 50;     // double cheese? impossible
        if (olives) p += 30;
        if (paneer) p += 70;     // new topping = edit this class
        return p;
    }
}`, alt: [
              { lang: 'python', code: `
class Pizza:
    def __init__(self):
        self.base = "Thin"
        self.cheese = self.olives = self.paneer = False
    def price(self):
        p = 200 if self.base == "Thin" else 250
        if self.cheese: p += 50     # double cheese? impossible
        if self.olives: p += 30
        if self.paneer: p += 70     # new topping = edit this class
        return p` },
              { lang: 'ts', code: `
class Pizza {
    base = "Thin"; cheese = false; olives = false; paneer = false;
    price(): number {
        let p = this.base === "Thin" ? 200 : 250;
        if (this.cheese) p += 50;     // double cheese? impossible
        if (this.olives) p += 30;
        if (this.paneer) p += 70;     // new topping = edit this class
        return p;
    }
}` },
              { lang: 'cpp', code: `
class Pizza {
public:
    string base = "Thin"; bool cheese = false, olives = false, paneer = false;
    int price() {
        int p = base == "Thin" ? 200 : 250;
        if (cheese) p += 50;     // double cheese? impossible
        if (olives) p += 30;
        if (paneer) p += 70;     // new topping = edit this class
        return p;
    }
};` },
  { lang: 'csharp', code: `
using System;

class Pizza {
    public string Base = "Thin"; public bool Cheese, Olives, Paneer;
    public int Price() {
        int p = Base == "Thin" ? 200 : 250;
        if (Cheese) p += 50;     // double cheese? impossible
        if (Olives) p += 30;
        if (Paneer) p += 70;     // new topping = edit this class
        return p;
    }
}` }
            ] } },
    mcq: { q: 'Which pattern fits "any combination of optional add-ons, added at runtime"?', options: ['Adapter', 'Decorator', 'Facade', 'Flyweight'], answer: 1, explain: 'Each topping wraps a pizza, keeps the Pizza interface and adds its price — stackable in any combination.' },
    hints: [`<p>Hint 1: "Any combination" + "add more later" = class explosion with inheritance. Wrap instead.</p>`, `<p>Hint 2: <code>interface Pizza { int price(); String description(); }</code>, bases implement it, <code>abstract class Topping implements Pizza</code> holds a <code>Pizza</code>.</p>`, `<p>Hint 3: Each topping returns <code>inner.price() + own</code> and <code>inner.description() + ", Name"</code>. Doubles are just wrapping twice.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "Thin, Cheese, Cheese, Paneer = Rs 370\nPan, Olives = Rs 280\n" }] },
    solution: {
      approach: `<p>Decorator: bases are concrete components, toppings are decorators. Every topping class is 5 lines, combinations are built at runtime, and a new topping never edits anything.</p>`,
      code: `interface Pizza { int price(); String description(); }

class Thin implements Pizza { public int price() { return 200; } public String description() { return "Thin"; } }
class Pan implements Pizza { public int price() { return 250; } public String description() { return "Pan"; } }

abstract class Topping implements Pizza {
    protected final Pizza inner;
    private final String name; private final int cost;
    Topping(Pizza inner, String name, int cost) { this.inner = inner; this.name = name; this.cost = cost; }
    public int price() { return inner.price() + cost; }
    public String description() { return inner.description() + ", " + name; }
}
class Cheese extends Topping { Cheese(Pizza p) { super(p, "Cheese", 50); } }
class Olives extends Topping { Olives(Pizza p) { super(p, "Olives", 30); } }
class Paneer extends Topping { Paneer(Pizza p) { super(p, "Paneer", 70); } }

class PizzaShop {
    public static void main(String[] args) {
        Pizza p = new Paneer(new Cheese(new Cheese(new Thin())));
        System.out.println(p.description() + " = Rs " + p.price());   // Thin, Cheese, Cheese, Paneer = Rs 370
        Pizza q = new Olives(new Pan());                              // a different base, one topping
        System.out.println(q.description() + " = Rs " + q.price());   // Pan, Olives = Rs 280
    }
}`,
      alt: [
        { lang: 'python', code: `from abc import ABC, abstractmethod


class Pizza(ABC):
    @abstractmethod
    def price(self) -> int: ...

    @abstractmethod
    def description(self) -> str: ...


class Thin(Pizza):
    def price(self) -> int:
        return 200

    def description(self) -> str:
        return "Thin"


class Pan(Pizza):
    def price(self) -> int:
        return 250

    def description(self) -> str:
        return "Pan"


class Topping(Pizza, ABC):  # decorator: IS a Pizza and HAS a Pizza
    def __init__(self, inner: Pizza, name: str, cost: int) -> None:
        self._inner = inner
        self._name = name
        self._cost = cost

    def price(self) -> int:
        return self._inner.price() + self._cost

    def description(self) -> str:
        return f"{self._inner.description()}, {self._name}"


class Cheese(Topping):
    def __init__(self, inner: Pizza) -> None:
        super().__init__(inner, "Cheese", 50)


class Olives(Topping):
    def __init__(self, inner: Pizza) -> None:
        super().__init__(inner, "Olives", 30)


class Paneer(Topping):
    def __init__(self, inner: Pizza) -> None:
        super().__init__(inner, "Paneer", 70)


if __name__ == "__main__":
    p = Paneer(Cheese(Cheese(Thin())))
    print(f"{p.description()} = Rs {p.price()}")  # Thin, Cheese, Cheese, Paneer = Rs 370
    q = Olives(Pan())  # a different base, one topping
    print(f"{q.description()} = Rs {q.price()}")  # Pan, Olives = Rs 280` },
        { lang: 'ts', code: `interface Pizza {
  price(): number;
  description(): string;
}

class Thin implements Pizza {
  price(): number { return 200; }
  description(): string { return "Thin"; }
}

class Pan implements Pizza {
  price(): number { return 250; }
  description(): string { return "Pan"; }
}

abstract class Topping implements Pizza { // decorator: IS a Pizza and HAS a Pizza
  constructor(protected readonly inner: Pizza, private readonly name: string, private readonly cost: number) {}

  price(): number {
    return this.inner.price() + this.cost;
  }

  description(): string {
    return \`\${this.inner.description()}, \${this.name}\`;
  }
}

class Cheese extends Topping { constructor(p: Pizza) { super(p, "Cheese", 50); } }
class Olives extends Topping { constructor(p: Pizza) { super(p, "Olives", 30); } }
class Paneer extends Topping { constructor(p: Pizza) { super(p, "Paneer", 70); } }

const p: Pizza = new Paneer(new Cheese(new Cheese(new Thin())));
console.log(\`\${p.description()} = Rs \${p.price()}\`); // Thin, Cheese, Cheese, Paneer = Rs 370
const q: Pizza = new Olives(new Pan()); // a different base, one topping
console.log(\`\${q.description()} = Rs \${q.price()}\`); // Pan, Olives = Rs 280` },
        { lang: 'cpp', code: `class Pizza {
public:
    virtual ~Pizza() = default;
    virtual int price() const = 0;
    virtual string description() const = 0;
};

class Thin : public Pizza {
public:
    int price() const override { return 200; }
    string description() const override { return "Thin"; }
};

class Pan : public Pizza {
public:
    int price() const override { return 250; }
    string description() const override { return "Pan"; }
};

class Topping : public Pizza {                       // decorator: IS a Pizza and HAS a Pizza
    unique_ptr<Pizza> inner_;                        // owns the pizza it wraps
    string name_;
    int cost_;
protected:
    Topping(unique_ptr<Pizza> inner, string name, int cost)
        : inner_(std::move(inner)), name_(std::move(name)), cost_(cost) {}
public:
    int price() const override { return inner_->price() + cost_; }
    string description() const override { return inner_->description() + ", " + name_; }
};

struct Cheese : Topping { explicit Cheese(unique_ptr<Pizza> p) : Topping(std::move(p), "Cheese", 50) {} };
struct Olives : Topping { explicit Olives(unique_ptr<Pizza> p) : Topping(std::move(p), "Olives", 30) {} };
struct Paneer : Topping { explicit Paneer(unique_ptr<Pizza> p) : Topping(std::move(p), "Paneer", 70) {} };

int main() {
    unique_ptr<Pizza> p = make_unique<Paneer>(make_unique<Cheese>(make_unique<Cheese>(make_unique<Thin>())));
    cout << p->description() << " = Rs " << p->price() << "\\n";   // Thin, Cheese, Cheese, Paneer = Rs 370
    unique_ptr<Pizza> q = make_unique<Olives>(make_unique<Pan>()); // a different base, one topping
    cout << q->description() << " = Rs " << q->price() << "\\n";   // Pan, Olives = Rs 280
}` },
  { lang: 'csharp', code: `
using System;

interface IPizza { int Price(); string Description(); }

class Thin : IPizza { public int Price() { return 200; } public string Description() { return "Thin"; } }
class Pan : IPizza { public int Price() { return 250; } public string Description() { return "Pan"; } }

abstract class Topping : IPizza {
    protected readonly IPizza inner;
    private readonly string name; private readonly int cost;
    protected Topping(IPizza inner, string name, int cost) { this.inner = inner; this.name = name; this.cost = cost; }
    public int Price() { return inner.Price() + cost; }
    public string Description() { return inner.Description() + ", " + name; }
}
class Cheese : Topping { public Cheese(IPizza p) : base(p, "Cheese", 50) { } }
class Olives : Topping { public Olives(IPizza p) : base(p, "Olives", 30) { } }
class Paneer : Topping { public Paneer(IPizza p) : base(p, "Paneer", 70) { } }

class Program {
    static void Main() {
        IPizza p = new Paneer(new Cheese(new Cheese(new Thin())));
        Console.WriteLine(p.Description() + " = Rs " + p.Price());   // Thin, Cheese, Cheese, Paneer = Rs 370
        IPizza q = new Olives(new Pan());                              // a different base, one topping
        Console.WriteLine(q.Description() + " = Rs " + q.Price());   // Pan, Olives = Rs 280
    }
}` }
      ],
      complexity: `<p>price() is O(k) for k toppings (one call per layer). Classes: bases + toppings, not their product.</p>`,
      followUps: ['Limit cheese to at most 2 layers — where does that rule belong?', 'Apply a 10% "combo discount" when Paneer and Olives are both present — is a decorator still the right tool?']
    }
  });

  practice.push({
    title: 'Old Rectangle API to New Shape Interface',
    level: 'Easy', tags: ['adapter', 'which pattern fits'], companies: ['Adobe', 'Autodesk'],
    statement: `<p>A drawing app's new code uses <code>interface Shape { double area(); Box bounds(); }</code> where <code>record Box(double x, double y, double w, double h)</code>. A legacy, unmodifiable class <code>LegacyRect</code> stores corners: <code>getX1(), getY1(), getX2(), getY2()</code> — and the corners may be given in any order (x2 &lt; x1 is allowed). Make legacy rectangles usable as <code>Shape</code>s.</p>`,
    constraints: `<p>Do not edit <code>LegacyRect</code>. Coordinates are doubles in [−10<sup>6</sup>, 10<sup>6</sup>].</p>`,
    example: `<p>LegacyRect(5, 8, 1, 2) → bounds = Box(x=${H.c('g', '1')}, y=${H.c('g', '2')}, w=${H.c('g', '4')}, h=${H.c('g', '6')}), area = <b>24</b>. The adapter normalises the corner order.</p>`,
    brute: { why: `<p>Converting at every call site: each place that draws a legacy rectangle computes <code>Math.min</code>/<code>Math.abs</code> itself. Some call sites forget to normalise reversed corners and get negative widths — the same bug appears in many files.</p>`, code: { lang: 'java', code: `class LegacyRect {
    private final double x1, y1, x2, y2;
    LegacyRect(double x1, double y1, double x2, double y2) { this.x1 = x1; this.y1 = y1; this.x2 = x2; this.y2 = y2; }
    double getX1() { return x1; } double getY1() { return y1; } double getX2() { return x2; } double getY2() { return y2; }
}
class Renderer {
    void draw(LegacyRect r) {
        double w = r.getX2() - r.getX1();          // negative when corners are reversed: bug
        double h = r.getY2() - r.getY1();
        System.out.println("rect " + w + "x" + h);
    }
}`, alt: [
              { lang: 'python', code: `
class LegacyRect:
    def __init__(self, x1, y1, x2, y2): self._x1, self._y1, self._x2, self._y2 = x1, y1, x2, y2
    def get_x1(self): return self._x1
    def get_y1(self): return self._y1
    def get_x2(self): return self._x2
    def get_y2(self): return self._y2

class Renderer:
    def draw(self, r):
        w = r.get_x2() - r.get_x1()          # negative when corners are reversed: bug
        h = r.get_y2() - r.get_y1()
        print(f"rect {w}x{h}")` },
              { lang: 'ts', code: `
class LegacyRect {
    constructor(private readonly x1: number, private readonly y1: number, private readonly x2: number, private readonly y2: number) {}
    getX1(): number { return this.x1; } getY1(): number { return this.y1; } getX2(): number { return this.x2; } getY2(): number { return this.y2; }
}
class Renderer {
    draw(r: LegacyRect): void {
        const w = r.getX2() - r.getX1();          // negative when corners are reversed: bug
        const h = r.getY2() - r.getY1();
        console.log("rect " + w + "x" + h);
    }
}` },
              { lang: 'cpp', code: `
class LegacyRect {
    double x1, y1, x2, y2;
public:
    LegacyRect(double x1, double y1, double x2, double y2) : x1(x1), y1(y1), x2(x2), y2(y2) { }
    double getX1() const { return x1; } double getY1() const { return y1; } double getX2() const { return x2; } double getY2() const { return y2; }
};
class Renderer {
public:
    void draw(const LegacyRect& r) {
        double w = r.getX2() - r.getX1();          // negative when corners are reversed: bug
        double h = r.getY2() - r.getY1();
        cout << "rect " << w << "x" << h << "\\n";
    }
};` },
  { lang: 'csharp', code: `
using System;

class LegacyRect {
    private readonly double x1, y1, x2, y2;
    public LegacyRect(double x1, double y1, double x2, double y2) { this.x1 = x1; this.y1 = y1; this.x2 = x2; this.y2 = y2; }
    public double GetX1() { return x1; } public double GetY1() { return y1; } public double GetX2() { return x2; } public double GetY2() { return y2; }
}
class Renderer {
    public void Draw(LegacyRect r) {
        double w = r.GetX2() - r.GetX1();          // negative when corners are reversed: bug
        double h = r.GetY2() - r.GetY1();
        Console.WriteLine("rect " + w + "x" + h);
    }
}` }
            ] } },
    mcq: { q: 'The legacy class works but has the wrong method names and coordinate model. Which pattern fits?', options: ['Bridge', 'Adapter', 'Proxy', 'Composite'], answer: 1, explain: 'Wrong interface, cannot modify the class → wrap it in an adapter that implements the expected interface.' },
    hints: [`<p>Hint 1: The client expects <code>Shape</code>; the class you have is <code>LegacyRect</code>. One new class should implement <code>Shape</code> and hold a <code>LegacyRect</code>.</p>`, `<p>Hint 2: Normalise once: x = min(x1, x2), w = |x2 − x1| (same for y).</p>`, `<p>Hint 3: area = w × h. Keep the adapter free of drawing logic — it only translates.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "x=1.0 y=2.0 w=4.0 h=6.0 area=24.0\nx=0.0 y=0.0 w=3.0 h=2.0 area=6.0\nx=3.0 y=3.0 w=0.0 h=6.0 area=0.0\n" }] },
    solution: {
      approach: `<p>Object adapter <code>LegacyRectAdapter implements Shape</code>. It translates the corner model into the (x, y, w, h) model with min/abs so reversed corners work, and computes area from that. Every client now sees a correct <code>Shape</code>.</p>`,
      code: `record Box(double x, double y, double w, double h) {}
interface Shape { double area(); Box bounds(); }

class LegacyRect {
    private final double x1, y1, x2, y2;
    LegacyRect(double x1, double y1, double x2, double y2) { this.x1 = x1; this.y1 = y1; this.x2 = x2; this.y2 = y2; }
    double getX1() { return x1; } double getY1() { return y1; } double getX2() { return x2; } double getY2() { return y2; }
}

class LegacyRectAdapter implements Shape {
    private final LegacyRect rect;
    LegacyRectAdapter(LegacyRect rect) { this.rect = Objects.requireNonNull(rect); }

    @Override public Box bounds() {
        double x = Math.min(rect.getX1(), rect.getX2());
        double y = Math.min(rect.getY1(), rect.getY2());
        return new Box(x, y, Math.abs(rect.getX2() - rect.getX1()), Math.abs(rect.getY2() - rect.getY1()));
    }

    @Override public double area() { Box b = bounds(); return b.w() * b.h(); }

    static String show(Shape s) {
        Box b = s.bounds();
        return String.format("x=%.1f y=%.1f w=%.1f h=%.1f area=%.1f", b.x(), b.y(), b.w(), b.h(), s.area());
    }

    public static void main(String[] args) {
        System.out.println(show(new LegacyRectAdapter(new LegacyRect(5, 8, 1, 2))));   // corners reversed
        System.out.println(show(new LegacyRectAdapter(new LegacyRect(0, 0, 3, 2))));   // already normal
        System.out.println(show(new LegacyRectAdapter(new LegacyRect(3, 3, 3, 9))));   // zero width
    }
}`,
      alt: [
        { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass(frozen=True)
class Box:
    x: float
    y: float
    w: float
    h: float


class Shape(ABC):
    @abstractmethod
    def area(self) -> float: ...

    @abstractmethod
    def bounds(self) -> Box: ...


class LegacyRect:  # legacy: cannot change
    def __init__(self, x1: float, y1: float, x2: float, y2: float) -> None:
        self._x1, self._y1, self._x2, self._y2 = x1, y1, x2, y2

    def get_x1(self) -> float: return self._x1
    def get_y1(self) -> float: return self._y1
    def get_x2(self) -> float: return self._x2
    def get_y2(self) -> float: return self._y2


class LegacyRectAdapter(Shape):
    def __init__(self, rect: LegacyRect) -> None:
        self._rect = rect

    def bounds(self) -> Box:
        r = self._rect
        return Box(
            min(r.get_x1(), r.get_x2()),
            min(r.get_y1(), r.get_y2()),
            abs(r.get_x2() - r.get_x1()),
            abs(r.get_y2() - r.get_y1()),
        )

    def area(self) -> float:
        b = self.bounds()
        return b.w * b.h


def show(s: Shape) -> str:
    b = s.bounds()
    return f"x={b.x:.1f} y={b.y:.1f} w={b.w:.1f} h={b.h:.1f} area={s.area():.1f}"


if __name__ == "__main__":
    print(show(LegacyRectAdapter(LegacyRect(5, 8, 1, 2))))  # corners reversed
    print(show(LegacyRectAdapter(LegacyRect(0, 0, 3, 2))))  # already normal
    print(show(LegacyRectAdapter(LegacyRect(3, 3, 3, 9))))  # zero width` },
        { lang: 'ts', code: `interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

interface Shape {
  area(): number;
  bounds(): Box;
}

class LegacyRect { // legacy: cannot change
  constructor(private readonly x1: number, private readonly y1: number,
              private readonly x2: number, private readonly y2: number) {}
  getX1(): number { return this.x1; }
  getY1(): number { return this.y1; }
  getX2(): number { return this.x2; }
  getY2(): number { return this.y2; }
}

class LegacyRectAdapter implements Shape {
  constructor(private readonly rect: LegacyRect) {}

  bounds(): Box {
    const r = this.rect;
    return {
      x: Math.min(r.getX1(), r.getX2()),
      y: Math.min(r.getY1(), r.getY2()),
      w: Math.abs(r.getX2() - r.getX1()),
      h: Math.abs(r.getY2() - r.getY1()),
    };
  }

  area(): number {
    const b = this.bounds();
    return b.w * b.h;
  }
}

function show(s: Shape): string {
  const b = s.bounds();
  return \`x=\${b.x.toFixed(1)} y=\${b.y.toFixed(1)} w=\${b.w.toFixed(1)} h=\${b.h.toFixed(1)} area=\${s.area().toFixed(1)}\`;
}

console.log(show(new LegacyRectAdapter(new LegacyRect(5, 8, 1, 2)))); // corners reversed
console.log(show(new LegacyRectAdapter(new LegacyRect(0, 0, 3, 2)))); // already normal
console.log(show(new LegacyRectAdapter(new LegacyRect(3, 3, 3, 9)))); // zero width` },
        { lang: 'cpp', code: `struct Box {
    double x, y, w, h;
};

class Shape {
public:
    virtual ~Shape() = default;
    virtual double area() const = 0;
    virtual Box bounds() const = 0;
};

class LegacyRect {                            // legacy: cannot change
    double x1_, y1_, x2_, y2_;
public:
    LegacyRect(double x1, double y1, double x2, double y2) : x1_(x1), y1_(y1), x2_(x2), y2_(y2) {}
    double getX1() const { return x1_; }
    double getY1() const { return y1_; }
    double getX2() const { return x2_; }
    double getY2() const { return y2_; }
};

class LegacyRectAdapter : public Shape {
    const LegacyRect& rect_;                  // adapts, does not own: the legacy object outlives the adapter
public:
    explicit LegacyRectAdapter(const LegacyRect& rect) : rect_(rect) {}

    Box bounds() const override {
        return {min(rect_.getX1(), rect_.getX2()), min(rect_.getY1(), rect_.getY2()),
                abs(rect_.getX2() - rect_.getX1()), abs(rect_.getY2() - rect_.getY1())};
    }

    double area() const override {
        Box b = bounds();
        return b.w * b.h;
    }
};

string show(const Shape& s) {
    Box b = s.bounds();
    ostringstream out;
    out << fixed << setprecision(1) << "x=" << b.x << " y=" << b.y << " w=" << b.w << " h=" << b.h
        << " area=" << s.area();
    return out.str();
}

int main() {
    LegacyRect reversed(5, 8, 1, 2), normal(0, 0, 3, 2), flat(3, 3, 3, 9);
    cout << show(LegacyRectAdapter(reversed)) << "\\n";   // corners reversed
    cout << show(LegacyRectAdapter(normal)) << "\\n";     // already normal
    cout << show(LegacyRectAdapter(flat)) << "\\n";       // zero width
}` },
  { lang: 'csharp', code: `
using System;

struct Box {
    public readonly double X, Y, W, H;
    public Box(double x, double y, double w, double h) { X = x; Y = y; W = w; H = h; }
}
interface IShape { double Area(); Box Bounds(); }

class LegacyRect {
    private readonly double x1, y1, x2, y2;
    public LegacyRect(double x1, double y1, double x2, double y2) { this.x1 = x1; this.y1 = y1; this.x2 = x2; this.y2 = y2; }
    public double GetX1() { return x1; } public double GetY1() { return y1; } public double GetX2() { return x2; } public double GetY2() { return y2; }
}

class LegacyRectAdapter : IShape {
    private readonly LegacyRect rect;
    public LegacyRectAdapter(LegacyRect rect) { if (rect == null) throw new ArgumentNullException("rect"); this.rect = rect; }

    public Box Bounds() {
        double x = Math.Min(rect.GetX1(), rect.GetX2());
        double y = Math.Min(rect.GetY1(), rect.GetY2());
        return new Box(x, y, Math.Abs(rect.GetX2() - rect.GetX1()), Math.Abs(rect.GetY2() - rect.GetY1()));
    }

    public double Area() { Box b = Bounds(); return b.W * b.H; }
}

class Program {
    static string Show(IShape s) {
        Box b = s.Bounds();
        return "x=" + b.X.ToString("F1") + " y=" + b.Y.ToString("F1") + " w=" + b.W.ToString("F1") + " h=" + b.H.ToString("F1") + " area=" + s.Area().ToString("F1");
    }

    static void Main() {
        Console.WriteLine(Show(new LegacyRectAdapter(new LegacyRect(5, 8, 1, 2))));   // corners reversed
        Console.WriteLine(Show(new LegacyRectAdapter(new LegacyRect(0, 0, 3, 2))));   // already normal
        Console.WriteLine(Show(new LegacyRectAdapter(new LegacyRect(3, 3, 3, 9))));   // zero width
    }
}` }
      ],
      complexity: `<p>O(1) per call, no extra memory beyond the wrapped reference.</p>`,
      followUps: ['Legacy code also needs to consume new Shapes as LegacyRects — write the reverse adapter.', 'Should the adapter cache bounds()? When would that be wrong?']
    }
  });

  practice.push({
    title: 'Smart Home "Good Night" Button',
    level: 'Easy', tags: ['facade', 'which pattern fits'], companies: ['Amazon', 'Google'],
    statement: `<p>A smart home has <code>Lights</code> (off per room), <code>Thermostat</code> (setTemp), <code>DoorLock</code> (lockAll, returns false if a door is open), <code>Alarm</code> (arm) and <code>Speaker</code> (play). The mobile app, the voice assistant and a wall button all need a "Good Night" action: all lights off, temperature 20 °C, lock doors, arm alarm (only if locking succeeded), play "Good night". Design it so the three callers share one implementation.</p>`,
    constraints: `<p>If any door is open, do not arm the alarm and return a message naming the problem. Each device class must remain usable directly.</p>`,
    example: `<p>All doors closed → ${H.c('g', '"Good night: house secured"')}. Back door open → lights off, thermostat set, ${H.c('r', '"Back door open — alarm NOT armed"')}.</p>`,
    brute: { why: `<p>Each of the three callers performs the five device calls itself. The voice assistant's copy forgets the "only arm if locked" rule and arms the alarm with a door open — a real safety bug caused by duplicated orchestration.</p>`, code: { lang: 'java', code: `class Lights { void allOff() { System.out.println("lights off"); } }
class Alarm { void arm() { System.out.println("alarm armed"); } }
class DoorLock { boolean lockAll() { return true; } }

class VoiceAssistant {
    void goodNight(Lights l, DoorLock d, Alarm a) {
        l.allOff();
        d.lockAll();     // result ignored...
        a.arm();         // ...so the alarm is armed even with a door open
    }
}`, alt: [
              { lang: 'python', code: `
class Lights:
    def all_off(self): print("lights off")
class Alarm:
    def arm(self): print("alarm armed")
class DoorLock:
    def lock_all(self): return True

class VoiceAssistant:
    def good_night(self, l, d, a):
        l.all_off()
        d.lock_all()     # result ignored...
        a.arm()          # ...so the alarm is armed even with a door open` },
              { lang: 'ts', code: `
class Lights { allOff(): void { console.log("lights off"); } }
class Alarm { arm(): void { console.log("alarm armed"); } }
class DoorLock { lockAll(): boolean { return true; } }

class VoiceAssistant {
    goodNight(l: Lights, d: DoorLock, a: Alarm): void {
        l.allOff();
        d.lockAll();     // result ignored...
        a.arm();         // ...so the alarm is armed even with a door open
    }
}` },
              { lang: 'cpp', code: `
struct Lights { void allOff() { cout << "lights off\\n"; } };
struct Alarm { void arm() { cout << "alarm armed\\n"; } };
struct DoorLock { bool lockAll() { return true; } };

class VoiceAssistant {
public:
    void goodNight(Lights& l, DoorLock& d, Alarm& a) {
        l.allOff();
        d.lockAll();     // result ignored...
        a.arm();         // ...so the alarm is armed even with a door open
    }
};` },
  { lang: 'csharp', code: `
using System;

class Lights { public void AllOff() { Console.WriteLine("lights off"); } }
class Alarm { public void Arm() { Console.WriteLine("alarm armed"); } }
class DoorLock { public bool LockAll() { return true; } }

class VoiceAssistant {
    public void GoodNight(Lights l, DoorLock d, Alarm a) {
        l.AllOff();
        d.LockAll();     // result ignored...
        a.Arm();         // ...so the alarm is armed even with a door open
    }
}` }
            ] } },
    mcq: { q: 'Five subsystems, a fixed order, three callers. Which pattern fits?', options: ['Facade', 'Decorator', 'Flyweight', 'Bridge'], answer: 0, explain: 'One simple method over many subsystems, coordinating the order and the conditional rule, is exactly a facade.' },
    hints: [`<p>Hint 1: The duplicated thing is the <i>sequence and its rule</i>. Put it behind one method.</p>`, `<p>Hint 2: <code>HomeFacade(Lights, Thermostat, DoorLock, Alarm, Speaker)</code> with <code>String goodNight()</code>.</p>`, `<p>Hint 3: Use the lock result: arm only on success; otherwise return a warning naming the open door. Keep device classes public for direct use.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "lights off\ntemp 20\nalarm armed\nsay: Good night\nGood night: house secured\nlights off\ntemp 20\nBack door open - alarm NOT armed\n" }] },
    solution: {
      approach: `<p>A <code>HomeFacade</code> receives the five devices by constructor and exposes <code>goodNight()</code>. It encodes the order and the safety rule once. All three callers call the facade; the devices remain independently usable (e.g. a "lights" screen).</p>`,
      code: `class Lights { void allOff() { System.out.println("lights off"); } }
class Thermostat { void setTemp(int c) { System.out.println("temp " + c); } }
class DoorLock {
    private final Optional<String> openDoor;
    DoorLock(Optional<String> openDoor) { this.openDoor = openDoor; }
    Optional<String> lockAll() { return openDoor; }        // empty = all locked
}
class Alarm { void arm() { System.out.println("alarm armed"); } }
class Speaker { void play(String s) { System.out.println("say: " + s); } }

class HomeFacade {
    private final Lights lights; private final Thermostat thermostat;
    private final DoorLock locks; private final Alarm alarm; private final Speaker speaker;

    HomeFacade(Lights l, Thermostat t, DoorLock d, Alarm a, Speaker s) {
        lights = l; thermostat = t; locks = d; alarm = a; speaker = s;
    }

    String goodNight() {
        lights.allOff();
        thermostat.setTemp(20);
        Optional<String> open = locks.lockAll();
        if (open.isPresent()) return open.get() + " open - alarm NOT armed";
        alarm.arm();
        speaker.play("Good night");
        return "Good night: house secured";
    }

    public static void main(String[] args) {
        System.out.println(new HomeFacade(new Lights(), new Thermostat(), new DoorLock(Optional.empty()), new Alarm(), new Speaker()).goodNight());
        System.out.println(new HomeFacade(new Lights(), new Thermostat(), new DoorLock(Optional.of("Back door")), new Alarm(), new Speaker()).goodNight());
    }
}`,
      alt: [
        { lang: 'python', code: `from typing import Optional


class Lights:
    def all_off(self) -> None:
        print("lights off")


class Thermostat:
    def set_temp(self, celsius: int) -> None:
        print(f"temp {celsius}")


class DoorLock:
    def __init__(self, open_door: Optional[str]) -> None:
        self._open_door = open_door

    def lock_all(self) -> Optional[str]:  # None = all locked
        return self._open_door


class Alarm:
    def arm(self) -> None:
        print("alarm armed")


class Speaker:
    def play(self, text: str) -> None:
        print(f"say: {text}")


class HomeFacade:
    def __init__(self, lights: Lights, thermostat: Thermostat, locks: DoorLock,
                 alarm: Alarm, speaker: Speaker) -> None:
        self._lights = lights
        self._thermostat = thermostat
        self._locks = locks
        self._alarm = alarm
        self._speaker = speaker

    def good_night(self) -> str:
        self._lights.all_off()
        self._thermostat.set_temp(20)
        open_door = self._locks.lock_all()
        if open_door is not None:
            return f"{open_door} open - alarm NOT armed"
        self._alarm.arm()
        self._speaker.play("Good night")
        return "Good night: house secured"


if __name__ == "__main__":
    print(HomeFacade(Lights(), Thermostat(), DoorLock(None), Alarm(), Speaker()).good_night())
    print(HomeFacade(Lights(), Thermostat(), DoorLock("Back door"), Alarm(), Speaker()).good_night())` },
        { lang: 'ts', code: `class Lights {
  allOff(): void { console.log("lights off"); }
}

class Thermostat {
  setTemp(c: number): void { console.log(\`temp \${c}\`); }
}

class DoorLock {
  constructor(private readonly openDoor?: string) {}

  lockAll(): string | undefined { // undefined = all locked
    return this.openDoor;
  }
}

class Alarm {
  arm(): void { console.log("alarm armed"); }
}

class Speaker {
  play(s: string): void { console.log(\`say: \${s}\`); }
}

class HomeFacade {
  constructor(
    private readonly lights: Lights,
    private readonly thermostat: Thermostat,
    private readonly locks: DoorLock,
    private readonly alarm: Alarm,
    private readonly speaker: Speaker,
  ) {}

  goodNight(): string {
    this.lights.allOff();
    this.thermostat.setTemp(20);
    const open = this.locks.lockAll();
    if (open !== undefined) return \`\${open} open - alarm NOT armed\`;
    this.alarm.arm();
    this.speaker.play("Good night");
    return "Good night: house secured";
  }
}

console.log(new HomeFacade(new Lights(), new Thermostat(), new DoorLock(), new Alarm(), new Speaker()).goodNight());
console.log(new HomeFacade(new Lights(), new Thermostat(), new DoorLock("Back door"), new Alarm(), new Speaker()).goodNight());` },
        { lang: 'cpp', code: `class Lights {
public:
    void allOff() const { cout << "lights off\\n"; }
};

class Thermostat {
public:
    void setTemp(int c) const { cout << "temp " << c << "\\n"; }
};

class DoorLock {
    optional<string> openDoor_;
public:
    explicit DoorLock(optional<string> openDoor = nullopt) : openDoor_(std::move(openDoor)) {}
    optional<string> lockAll() const { return openDoor_; }      // nullopt = all locked
};

class Alarm {
public:
    void arm() const { cout << "alarm armed\\n"; }
};

class Speaker {
public:
    void play(const string& s) const { cout << "say: " << s << "\\n"; }
};

class HomeFacade {
    const Lights& lights_;
    const Thermostat& thermostat_;
    const DoorLock& locks_;
    const Alarm& alarm_;
    const Speaker& speaker_;
public:
    HomeFacade(const Lights& l, const Thermostat& t, const DoorLock& d, const Alarm& a, const Speaker& s)
        : lights_(l), thermostat_(t), locks_(d), alarm_(a), speaker_(s) {}

    string goodNight() const {
        lights_.allOff();
        thermostat_.setTemp(20);
        if (auto open = locks_.lockAll()) return *open + " open - alarm NOT armed";
        alarm_.arm();
        speaker_.play("Good night");
        return "Good night: house secured";
    }
};

int main() {
    Lights lights; Thermostat thermostat; Alarm alarm; Speaker speaker;
    DoorLock closed, backOpen(string("Back door"));
    cout << HomeFacade(lights, thermostat, closed, alarm, speaker).goodNight() << "\\n";
    cout << HomeFacade(lights, thermostat, backOpen, alarm, speaker).goodNight() << "\\n";
}` },
  { lang: 'csharp', code: `
using System;

class Lights { public void AllOff() { Console.WriteLine("lights off"); } }
class Thermostat { public void SetTemp(int c) { Console.WriteLine("temp " + c); } }
class DoorLock {
    private readonly string openDoor;                       // null = every door can be locked
    public DoorLock(string openDoor) { this.openDoor = openDoor; }
    public string LockAll() { return openDoor; }            // null = all locked, else the door still open
}
class Alarm { public void Arm() { Console.WriteLine("alarm armed"); } }
class Speaker { public void Play(string s) { Console.WriteLine("say: " + s); } }

class HomeFacade {
    private readonly Lights lights; private readonly Thermostat thermostat;
    private readonly DoorLock locks; private readonly Alarm alarm; private readonly Speaker speaker;

    public HomeFacade(Lights l, Thermostat t, DoorLock d, Alarm a, Speaker s) {
        lights = l; thermostat = t; locks = d; alarm = a; speaker = s;
    }

    public string GoodNight() {
        lights.AllOff();
        thermostat.SetTemp(20);
        string open = locks.LockAll();
        if (open != null) return open + " open - alarm NOT armed";
        alarm.Arm();
        speaker.Play("Good night");
        return "Good night: house secured";
    }
}

class Program {
    static void Main() {
        Console.WriteLine(new HomeFacade(new Lights(), new Thermostat(), new DoorLock(null), new Alarm(), new Speaker()).GoodNight());
        Console.WriteLine(new HomeFacade(new Lights(), new Thermostat(), new DoorLock("Back door"), new Alarm(), new Speaker()).GoodNight());
    }
}` }
      ],
      complexity: `<p>O(1) device calls. Coupling: each caller depends on 1 class instead of 5.</p>`,
      followUps: ['Add "Good Morning" — new method on the same facade or a new facade?', 'A device call can time out — how should the facade report partial success?']
    }
  });

  practice.push({
    title: 'Org Chart Headcount and Payroll',
    level: 'Easy', tags: ['composite', 'which pattern fits'], companies: ['Workday', 'Rippling', 'Darwinbox'],
    statement: `<p>A company has employees (name, salary) and departments (name) that contain employees <i>and</i> sub-departments. Implement <code>headcount()</code> and <code>payroll()</code> that work on a single employee or any department, plus <code>deepest()</code> returning the maximum nesting depth (employee = 0).</p>`,
    constraints: `<p>Up to 10<sup>5</sup> people, depth ≤ 20. Salaries are long rupees. Empty departments count 0 people.</p>`,
    example: `<p>Company{ CEO 100, Eng{ Ana 50, Bo 40, Platform{ Cy 45 } } } → headcount <b>${H.c('g', '4')}</b>, payroll <b>${H.c('g', '235')}</b>, deepest = 3 (Company → Eng → Platform → Cy).</p>`,
    brute: { why: `<p>Keeping departments and employees in separate typed lists and writing <code>instanceof</code>-driven loops in a <code>PayrollService</code>. Each new question (average salary, list of managers) needs another type-checking recursion, and a third node type (contractor) breaks every one of them.</p>`, code: { lang: 'java', code: `class Emp { String name; long salary; }
class Dept { String name; List<Object> members = new ArrayList<>(); }

class PayrollService {
    long payroll(Object node) {
        if (node instanceof Emp e) return e.salary;
        long sum = 0;
        for (Object m : ((Dept) node).members) sum += payroll(m);   // casts and type checks everywhere
        return sum;
    }
}`, alt: [
              { lang: 'python', code: `
class Emp:
    def __init__(self): self.name = ""; self.salary = 0
class Dept:
    def __init__(self): self.name = ""; self.members = []

class PayrollService:
    def payroll(self, node):
        if isinstance(node, Emp): return node.salary
        total = 0
        for m in node.members: total += self.payroll(m)   # type checks everywhere
        return total` },
              { lang: 'ts', code: `
class Emp { name = ""; salary = 0; }
class Dept { name = ""; members: (Emp | Dept)[] = []; }

class PayrollService {
    payroll(node: Emp | Dept): number {
        if (node instanceof Emp) return node.salary;
        let sum = 0;
        for (const m of (node as Dept).members) sum += this.payroll(m);   // casts and type checks everywhere
        return sum;
    }
}` },
              { lang: 'cpp', code: `
struct Node { virtual ~Node() = default; };
struct Emp : Node { string name; long long salary = 0; };
struct Dept : Node { string name; vector<Node*> members; };

class PayrollService {
public:
    long long payroll(Node* node) {
        if (auto* e = dynamic_cast<Emp*>(node)) return e->salary;
        long long sum = 0;
        for (Node* m : dynamic_cast<Dept*>(node)->members) sum += payroll(m);   // casts and type checks everywhere
        return sum;
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class Emp { public string Name; public long Salary; }
class Dept { public string Name; public List<object> Members = new List<object>(); }

class PayrollService {
    public long Payroll(object node) {
        if (node is Emp e) return e.Salary;
        long sum = 0;
        foreach (object m in ((Dept)node).Members) sum += Payroll(m);   // casts and type checks everywhere
        return sum;
    }
}` }
            ] } },
    mcq: { q: 'Departments contain people AND departments, and the same questions apply to both. Which pattern?', options: ['Composite', 'Proxy', 'Adapter', 'Bridge'], answer: 0, explain: 'A part-whole tree where leaves and groups share one interface is the Composite pattern.' },
    hints: [`<p>Hint 1: Make <code>OrgUnit</code> the shared interface with all three methods.</p>`, `<p>Hint 2: <code>Employee</code> (leaf): headcount 1, payroll = salary, depth 0. <code>Department</code> (composite) aggregates over <code>List&lt;OrgUnit&gt;</code>.</p>`, `<p>Hint 3: Department depth = 1 + max(child depth). An empty department has depth 1 (it is still a level) — decide edge cases like this out loud and document them.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "4 235 3\n0 0 1\n1 100 0\n" }] },
    solution: {
      approach: `<p>Sealed <code>OrgUnit</code> with <code>headcount()</code>, <code>payroll()</code>, <code>deepest()</code>. Employee is the leaf record; Department is the composite and combines children with sum / sum / 1 + max. Client calls the same methods on any node.</p>`,
      code: `sealed interface OrgUnit permits Employee, Department {
    int headcount(); long payroll(); int deepest();
}

record Employee(String name, long salary) implements OrgUnit {
    public int headcount() { return 1; }
    public long payroll() { return salary; }
    public int deepest() { return 0; }
}

final class Department implements OrgUnit {
    private final String name;
    private final List<OrgUnit> members = new ArrayList<>();
    Department(String name, OrgUnit... ms) { this.name = name; members.addAll(List.of(ms)); }

    public int headcount() { return members.stream().mapToInt(OrgUnit::headcount).sum(); }
    public long payroll() { return members.stream().mapToLong(OrgUnit::payroll).sum(); }
    public int deepest() { return 1 + members.stream().mapToInt(OrgUnit::deepest).max().orElse(0); }

    public static void main(String[] args) {
        OrgUnit company = new Department("Company",
            new Employee("CEO", 100),
            new Department("Eng", new Employee("Ana", 50), new Employee("Bo", 40),
                new Department("Platform", new Employee("Cy", 45))));
        System.out.println(company.headcount() + " " + company.payroll() + " " + company.deepest()); // 4 235 3
        OrgUnit empty = new Department("Empty");                       // no members
        System.out.println(empty.headcount() + " " + empty.payroll() + " " + empty.deepest());       // 0 0 1
        OrgUnit solo = new Employee("CEO", 100);                       // a leaf answers the same questions
        System.out.println(solo.headcount() + " " + solo.payroll() + " " + solo.deepest());         // 1 100 0
    }
}`,
      alt: [
        { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass


class OrgUnit(ABC):
    @abstractmethod
    def headcount(self) -> int: ...

    @abstractmethod
    def payroll(self) -> int: ...

    @abstractmethod
    def deepest(self) -> int: ...


@dataclass(frozen=True)
class Employee(OrgUnit):  # leaf
    name: str
    salary: int

    def headcount(self) -> int:
        return 1

    def payroll(self) -> int:
        return self.salary

    def deepest(self) -> int:
        return 0


class Department(OrgUnit):  # composite
    def __init__(self, name: str, *members: OrgUnit) -> None:
        self._name = name
        self._members = list(members)

    def headcount(self) -> int:
        return sum(m.headcount() for m in self._members)

    def payroll(self) -> int:
        return sum(m.payroll() for m in self._members)

    def deepest(self) -> int:
        return 1 + max((m.deepest() for m in self._members), default=0)


if __name__ == "__main__":
    company = Department(
        "Company",
        Employee("CEO", 100),
        Department("Eng", Employee("Ana", 50), Employee("Bo", 40), Department("Platform", Employee("Cy", 45))),
    )
    print(company.headcount(), company.payroll(), company.deepest())  # 4 235 3
    empty = Department("Empty")  # no members
    print(empty.headcount(), empty.payroll(), empty.deepest())  # 0 0 1
    solo = Employee("CEO", 100)  # a leaf answers the same questions
    print(solo.headcount(), solo.payroll(), solo.deepest())  # 1 100 0` },
        { lang: 'ts', code: `interface OrgUnit {
  headcount(): number;
  payroll(): number;
  deepest(): number;
}

class Employee implements OrgUnit { // leaf
  constructor(readonly name: string, private readonly salary: number) {}
  headcount(): number { return 1; }
  payroll(): number { return this.salary; }
  deepest(): number { return 0; }
}

class Department implements OrgUnit { // composite
  private readonly members: OrgUnit[];

  constructor(readonly name: string, ...members: OrgUnit[]) {
    this.members = members;
  }

  headcount(): number {
    return this.members.reduce((sum, m) => sum + m.headcount(), 0);
  }

  payroll(): number {
    return this.members.reduce((sum, m) => sum + m.payroll(), 0);
  }

  deepest(): number {
    return 1 + Math.max(0, ...this.members.map((m) => m.deepest()));
  }
}

const stats = (u: OrgUnit): string => \`\${u.headcount()} \${u.payroll()} \${u.deepest()}\`;

const company = new Department(
  "Company",
  new Employee("CEO", 100),
  new Department("Eng", new Employee("Ana", 50), new Employee("Bo", 40), new Department("Platform", new Employee("Cy", 45))),
);
console.log(stats(company)); // 4 235 3
console.log(stats(new Department("Empty"))); // no members: 0 0 1
console.log(stats(new Employee("CEO", 100))); // a leaf answers the same questions: 1 100 0` },
        { lang: 'cpp', code: `class OrgUnit {
public:
    virtual ~OrgUnit() = default;
    virtual int headcount() const = 0;
    virtual long long payroll() const = 0;
    virtual int deepest() const = 0;
};

class Employee : public OrgUnit {                       // leaf
    string name_;
    long long salary_;
public:
    Employee(string name, long long salary) : name_(std::move(name)), salary_(salary) {}
    int headcount() const override { return 1; }
    long long payroll() const override { return salary_; }
    int deepest() const override { return 0; }
};

class Department : public OrgUnit {                     // composite: owns its members
    string name_;
    vector<unique_ptr<OrgUnit>> members_;
public:
    template <class... Units>
    explicit Department(string name, unique_ptr<Units>... members) : name_(std::move(name)) {
        (members_.push_back(std::move(members)), ...);
    }

    int headcount() const override {
        int sum = 0;
        for (const auto& m : members_) sum += m->headcount();
        return sum;
    }
    long long payroll() const override {
        long long sum = 0;
        for (const auto& m : members_) sum += m->payroll();
        return sum;
    }
    int deepest() const override {
        int deepest = 0;
        for (const auto& m : members_) deepest = max(deepest, m->deepest());
        return 1 + deepest;
    }
};

void print(const OrgUnit& u) { cout << u.headcount() << " " << u.payroll() << " " << u.deepest() << "\\n"; }

int main() {
    auto company = make_unique<Department>("Company",
        make_unique<Employee>("CEO", 100),
        make_unique<Department>("Eng", make_unique<Employee>("Ana", 50), make_unique<Employee>("Bo", 40),
            make_unique<Department>("Platform", make_unique<Employee>("Cy", 45))));
    print(*company);                                    // 4 235 3
    print(Department("Empty"));                         // no members: 0 0 1
    print(Employee("CEO", 100));                        // a leaf answers the same questions: 1 100 0
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

interface IOrgUnit {
    int Headcount(); long Payroll(); int Deepest();
}

sealed class Employee : IOrgUnit {
    private readonly string name; private readonly long salary;
    public Employee(string name, long salary) { this.name = name; this.salary = salary; }
    public int Headcount() { return 1; }
    public long Payroll() { return salary; }
    public int Deepest() { return 0; }
}

sealed class Department : IOrgUnit {
    private readonly string name;
    private readonly List<IOrgUnit> members = new List<IOrgUnit>();
    public Department(string name, params IOrgUnit[] ms) { this.name = name; members.AddRange(ms); }

    public int Headcount() { return members.Sum(m => m.Headcount()); }
    public long Payroll() { return members.Sum(m => m.Payroll()); }
    public int Deepest() { return 1 + (members.Count == 0 ? 0 : members.Max(m => m.Deepest())); }
}

class Program {
    static void Main() {
        IOrgUnit company = new Department("Company",
            new Employee("CEO", 100),
            new Department("Eng", new Employee("Ana", 50), new Employee("Bo", 40),
                new Department("Platform", new Employee("Cy", 45))));
        Console.WriteLine(company.Headcount() + " " + company.Payroll() + " " + company.Deepest()); // 4 235 3
        IOrgUnit empty = new Department("Empty");                       // no members
        Console.WriteLine(empty.Headcount() + " " + empty.Payroll() + " " + empty.Deepest());       // 0 0 1
        IOrgUnit solo = new Employee("CEO", 100);                       // a leaf answers the same questions
        Console.WriteLine(solo.Headcount() + " " + solo.Payroll() + " " + solo.Deepest());         // 1 100 0
    }
}` }
      ],
      complexity: `<p>Each query O(n) over all units, O(depth) recursion stack.</p>`,
      followUps: ['Payroll is queried every second — cache per department and invalidate on change.', 'Find the department with the highest average salary in one traversal.']
    }
  });
  /* =====================================================================
     PRACTICE — MEDIUM
     ===================================================================== */
  practice.push({
    title: 'Role-Based Protection Proxy for a Bank Account',
    level: 'Medium', tags: ['proxy', 'security', 'which pattern fits'], companies: ['JPMorgan', 'Goldman Sachs', 'PhonePe'],
    statement: `<p><code>interface Account { long balance(); void deposit(long amt); void withdraw(long amt); }</code> is implemented by <code>RealAccount</code> (pure business logic, no security). Rules: the <b>OWNER</b> may do everything; a <b>TELLER</b> may view balance and deposit; an <b>AUDITOR</b> may only view. Every denied attempt must be recorded in an audit log. <code>RealAccount</code> must stay free of security code.</p>`,
    constraints: `<p>Unauthorised calls throw <code>SecurityException</code> and must not reach the real account. Withdraw more than the balance → <code>IllegalStateException</code> from the real account.</p>`,
    example: `<p>Teller: <code>deposit(500)</code> ${H.c('g', 'ok')}, <code>withdraw(100)</code> ${H.c('r', 'SecurityException')}, audit log = ["TELLER denied withdraw"]. Owner: <code>withdraw(100)</code> ${H.c('g', 'ok')}.</p>`,
    brute: { why: `<p>Putting <code>if (role != OWNER) throw</code> inside every <code>RealAccount</code> method mixes security with banking logic. Tests for interest calculation now need a user context; adding a new role edits every method; and a second account type duplicates all the checks.</p>`, code: { lang: 'java', code: `enum Role { OWNER, TELLER, AUDITOR }
class RealAccount {
    private long balance; Role currentRole = Role.OWNER;      // security leaked into the domain class
    long balance() { return balance; }
    void deposit(long a) { if (currentRole == Role.AUDITOR) throw new SecurityException(); balance += a; }
    void withdraw(long a) {
        if (currentRole != Role.OWNER) throw new SecurityException();
        if (a > balance) throw new IllegalStateException("insufficient");
        balance -= a;
    }
}`, alt: [
              { lang: 'python', code: `
from enum import Enum

class Role(Enum): OWNER = 1; TELLER = 2; AUDITOR = 3

class RealAccount:
    def __init__(self):
        self._balance = 0
        self.current_role = Role.OWNER      # security leaked into the domain class
    def balance(self): return self._balance
    def deposit(self, a):
        if self.current_role == Role.AUDITOR: raise PermissionError()
        self._balance += a
    def withdraw(self, a):
        if self.current_role != Role.OWNER: raise PermissionError()
        if a > self._balance: raise RuntimeError("insufficient")
        self._balance -= a` },
              { lang: 'ts', code: `
enum Role { OWNER, TELLER, AUDITOR }
class RealAccount {
    private _balance = 0; currentRole = Role.OWNER;      // security leaked into the domain class
    balance(): number { return this._balance; }
    deposit(a: number): void { if (this.currentRole === Role.AUDITOR) throw new Error("forbidden"); this._balance += a; }
    withdraw(a: number): void {
        if (this.currentRole !== Role.OWNER) throw new Error("forbidden");
        if (a > this._balance) throw new Error("insufficient");
        this._balance -= a;
    }
}` },
              { lang: 'cpp', code: `
enum class Role { OWNER, TELLER, AUDITOR };
class RealAccount {
    long long bal = 0;
public:
    Role currentRole = Role::OWNER;      // security leaked into the domain class
    long long balance() { return bal; }
    void deposit(long long a) { if (currentRole == Role::AUDITOR) throw runtime_error("forbidden"); bal += a; }
    void withdraw(long long a) {
        if (currentRole != Role::OWNER) throw runtime_error("forbidden");
        if (a > bal) throw runtime_error("insufficient");
        bal -= a;
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Security;

enum Role { OWNER, TELLER, AUDITOR }
class RealAccount {
    private long balance; public Role CurrentRole = Role.OWNER;      // security leaked into the domain class
    public long Balance() { return balance; }
    public void Deposit(long a) { if (CurrentRole == Role.AUDITOR) throw new SecurityException(); balance += a; }
    public void Withdraw(long a) {
        if (CurrentRole != Role.OWNER) throw new SecurityException();
        if (a > balance) throw new InvalidOperationException("insufficient");
        balance -= a;
    }
}` }
            ] } },
    mcq: { q: 'Same interface, same behaviour, but calls must be checked before reaching the real object. Which pattern?', options: ['Decorator', 'Protection Proxy', 'Adapter', 'Facade'], answer: 1, explain: 'Controlling access to an object with an identical interface is the protection proxy — it adds no new feature to the account itself.' },
    hints: [`<p>Hint 1: Create <code>SecuredAccount implements Account</code> holding the real account, the caller's role, and an audit log.</p>`, `<p>Hint 2: Model permissions as data: <code>Map&lt;Role, Set&lt;Op&gt;&gt;</code> so a new role is a config change, not new code.</p>`, `<p>Hint 3: Each method: <code>check(op)</code> → if not allowed, append to audit log and throw; else delegate. Never catch business exceptions from the real account.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "blocked\n400 [TELLER denied withdraw]\n400\nAUDITOR may not DEPOSIT\ninsufficient funds\n[TELLER denied withdraw, AUDITOR denied deposit]\n" }] },
    solution: {
      approach: `<p><code>SecuredAccount</code> is a protection proxy: same <code>Account</code> interface, holds the real account, a role and an audit sink. A permission table maps role → allowed operations. Each method checks first, audits denials, and only then delegates. The real account stays pure; a factory hands clients the proxy so they cannot bypass it.</p>`,
      code: `enum Role { OWNER, TELLER, AUDITOR }
enum Op { VIEW, DEPOSIT, WITHDRAW }

interface Account { long balance(); void deposit(long amt); void withdraw(long amt); }

class RealAccount implements Account {
    private long balance;
    public synchronized long balance() { return balance; }
    public synchronized void deposit(long a) { if (a <= 0) throw new IllegalArgumentException(); balance += a; }
    public synchronized void withdraw(long a) {
        if (a > balance) throw new IllegalStateException("insufficient funds");
        balance -= a;
    }
}

class SecuredAccount implements Account {
    private static final Map<Role, Set<Op>> PERMS = Map.of(
        Role.OWNER, EnumSet.allOf(Op.class),
        Role.TELLER, EnumSet.of(Op.VIEW, Op.DEPOSIT),
        Role.AUDITOR, EnumSet.of(Op.VIEW));

    private final Account real; private final Role role; private final List<String> audit;

    SecuredAccount(Account real, Role role, List<String> audit) { this.real = real; this.role = role; this.audit = audit; }

    private void check(Op op) {
        if (!PERMS.get(role).contains(op)) {
            audit.add(role + " denied " + op.name().toLowerCase());
            throw new SecurityException(role + " may not " + op);
        }
    }
    public long balance() { check(Op.VIEW); return real.balance(); }
    public void deposit(long a) { check(Op.DEPOSIT); real.deposit(a); }
    public void withdraw(long a) { check(Op.WITHDRAW); real.withdraw(a); }

    public static void main(String[] args) {
        Account real = new RealAccount();
        List<String> audit = new ArrayList<>();
        Account teller = new SecuredAccount(real, Role.TELLER, audit);
        teller.deposit(500);
        try { teller.withdraw(100); } catch (SecurityException e) { System.out.println("blocked"); }
        new SecuredAccount(real, Role.OWNER, audit).withdraw(100);
        System.out.println(real.balance() + " " + audit);   // 400 [TELLER denied withdraw]

        Account auditor = new SecuredAccount(real, Role.AUDITOR, audit);
        System.out.println(auditor.balance());               // 400: viewing is allowed
        try { auditor.deposit(1); }
        catch (SecurityException e) { System.out.println(e.getMessage()); }   // AUDITOR may not DEPOSIT
        try { new SecuredAccount(real, Role.OWNER, audit).withdraw(1_000); }
        catch (IllegalStateException e) { System.out.println(e.getMessage()); } // insufficient funds
        System.out.println(audit);                           // [TELLER denied withdraw, AUDITOR denied deposit]
    }
}`,
      alt: [
        { lang: 'python', code: `import threading
from abc import ABC, abstractmethod
from enum import Enum, auto


class Role(Enum):
    OWNER = auto()
    TELLER = auto()
    AUDITOR = auto()


class Op(Enum):
    VIEW = auto()
    DEPOSIT = auto()
    WITHDRAW = auto()


class Account(ABC):
    @abstractmethod
    def balance(self) -> int: ...

    @abstractmethod
    def deposit(self, amt: int) -> None: ...

    @abstractmethod
    def withdraw(self, amt: int) -> None: ...


class RealAccount(Account):  # pure business logic, no security
    def __init__(self) -> None:
        self._balance = 0
        self._lock = threading.Lock()

    def balance(self) -> int:
        with self._lock:
            return self._balance

    def deposit(self, amt: int) -> None:
        if amt <= 0:
            raise ValueError("deposit must be positive")
        with self._lock:
            self._balance += amt

    def withdraw(self, amt: int) -> None:
        with self._lock:
            if amt > self._balance:
                raise RuntimeError("insufficient funds")
            self._balance -= amt


class SecuredAccount(Account):  # protection proxy: same interface, checks before delegating
    _PERMS: dict[Role, frozenset[Op]] = {
        Role.OWNER: frozenset(Op),
        Role.TELLER: frozenset({Op.VIEW, Op.DEPOSIT}),
        Role.AUDITOR: frozenset({Op.VIEW}),
    }

    def __init__(self, real: Account, role: Role, audit: list[str]) -> None:
        self._real = real
        self._role = role
        self._audit = audit

    def _check(self, op: Op) -> None:
        if op not in self._PERMS[self._role]:
            self._audit.append(f"{self._role.name} denied {op.name.lower()}")
            raise PermissionError(f"{self._role.name} may not {op.name}")

    def balance(self) -> int:
        self._check(Op.VIEW)
        return self._real.balance()

    def deposit(self, amt: int) -> None:
        self._check(Op.DEPOSIT)
        self._real.deposit(amt)

    def withdraw(self, amt: int) -> None:
        self._check(Op.WITHDRAW)
        self._real.withdraw(amt)


def show(items: list[str]) -> str:
    return "[" + ", ".join(items) + "]"


if __name__ == "__main__":
    real = RealAccount()
    audit: list[str] = []
    teller = SecuredAccount(real, Role.TELLER, audit)
    teller.deposit(500)
    try:
        teller.withdraw(100)
    except PermissionError:
        print("blocked")
    SecuredAccount(real, Role.OWNER, audit).withdraw(100)
    print(real.balance(), show(audit))  # 400 [TELLER denied withdraw]

    auditor = SecuredAccount(real, Role.AUDITOR, audit)
    print(auditor.balance())  # 400: viewing is allowed
    try:
        auditor.deposit(1)
    except PermissionError as e:
        print(e)  # AUDITOR may not DEPOSIT
    try:
        SecuredAccount(real, Role.OWNER, audit).withdraw(1_000)
    except RuntimeError as e:
        print(e)  # insufficient funds
    print(show(audit))  # [TELLER denied withdraw, AUDITOR denied deposit]` },
        { lang: 'ts', code: `enum Role { OWNER, TELLER, AUDITOR }
enum Op { VIEW, DEPOSIT, WITHDRAW }

class SecurityError extends Error {}

interface Account {
  balance(): number;
  deposit(amt: number): void;
  withdraw(amt: number): void;
}

class RealAccount implements Account { // pure business logic, no security
  private bal = 0;

  balance(): number { return this.bal; }

  deposit(amt: number): void {
    if (amt <= 0) throw new Error("deposit must be positive");
    this.bal += amt;
  }

  withdraw(amt: number): void {
    if (amt > this.bal) throw new Error("insufficient funds");
    this.bal -= amt;
  }
}

class SecuredAccount implements Account { // protection proxy: same interface, checks before delegating
  private static readonly PERMS: Record<Role, ReadonlySet<Op>> = {
    [Role.OWNER]: new Set([Op.VIEW, Op.DEPOSIT, Op.WITHDRAW]),
    [Role.TELLER]: new Set([Op.VIEW, Op.DEPOSIT]),
    [Role.AUDITOR]: new Set([Op.VIEW]),
  };

  constructor(private readonly real: Account, private readonly role: Role, private readonly audit: string[]) {}

  private check(op: Op): void {
    if (!SecuredAccount.PERMS[this.role].has(op)) {
      this.audit.push(\`\${Role[this.role]} denied \${Op[op].toLowerCase()}\`);
      throw new SecurityError(\`\${Role[this.role]} may not \${Op[op]}\`);
    }
  }

  balance(): number { this.check(Op.VIEW); return this.real.balance(); }
  deposit(amt: number): void { this.check(Op.DEPOSIT); this.real.deposit(amt); }
  withdraw(amt: number): void { this.check(Op.WITHDRAW); this.real.withdraw(amt); }
}

const show = (items: string[]): string => \`[\${items.join(", ")}]\`;

const real = new RealAccount();
const audit: string[] = [];
const teller: Account = new SecuredAccount(real, Role.TELLER, audit);
teller.deposit(500);
try {
  teller.withdraw(100);
} catch (e) {
  if (e instanceof SecurityError) console.log("blocked");
}
new SecuredAccount(real, Role.OWNER, audit).withdraw(100);
console.log(\`\${real.balance()} \${show(audit)}\`); // 400 [TELLER denied withdraw]

const auditor: Account = new SecuredAccount(real, Role.AUDITOR, audit);
console.log(auditor.balance()); // 400: viewing is allowed
try {
  auditor.deposit(1);
} catch (e) {
  console.log((e as Error).message); // AUDITOR may not DEPOSIT
}
try {
  new SecuredAccount(real, Role.OWNER, audit).withdraw(1_000);
} catch (e) {
  console.log((e as Error).message); // insufficient funds
}
console.log(show(audit)); // [TELLER denied withdraw, AUDITOR denied deposit]` },
        { lang: 'cpp', code: `enum class Role { OWNER, TELLER, AUDITOR };
enum class Op { VIEW, DEPOSIT, WITHDRAW };

const char* name(Role r) {
    switch (r) { case Role::OWNER: return "OWNER"; case Role::TELLER: return "TELLER"; default: return "AUDITOR"; }
}
const char* name(Op o) {
    switch (o) { case Op::VIEW: return "VIEW"; case Op::DEPOSIT: return "DEPOSIT"; default: return "WITHDRAW"; }
}

struct SecurityException : runtime_error {
    using runtime_error::runtime_error;
};

class Account {
public:
    virtual ~Account() = default;
    virtual long long balance() const = 0;
    virtual void deposit(long long amt) = 0;
    virtual void withdraw(long long amt) = 0;
};

class RealAccount : public Account {                    // pure business logic, no security
    long long balance_ = 0;
    mutable mutex mu_;
public:
    long long balance() const override { lock_guard<mutex> lock(mu_); return balance_; }
    void deposit(long long amt) override {
        if (amt <= 0) throw invalid_argument("deposit must be positive");
        lock_guard<mutex> lock(mu_);
        balance_ += amt;
    }
    void withdraw(long long amt) override {
        lock_guard<mutex> lock(mu_);
        if (amt > balance_) throw logic_error("insufficient funds");
        balance_ -= amt;
    }
};

class SecuredAccount : public Account {                 // protection proxy: same interface, checks before delegating
    Account& real_;
    Role role_;
    vector<string>& audit_;

    static bool allowed(Role r, Op op) {
        switch (r) {
            case Role::OWNER:   return true;
            case Role::TELLER:  return op != Op::WITHDRAW;
            case Role::AUDITOR: return op == Op::VIEW;
        }
        return false;
    }
    void check(Op op) const {
        if (allowed(role_, op)) return;
        string lower = name(op);
        for (char& c : lower) c = static_cast<char>(tolower(static_cast<unsigned char>(c)));
        audit_.push_back(string(name(role_)) + " denied " + lower);
        throw SecurityException(string(name(role_)) + " may not " + name(op));
    }
public:
    SecuredAccount(Account& real, Role role, vector<string>& audit) : real_(real), role_(role), audit_(audit) {}
    long long balance() const override { check(Op::VIEW); return real_.balance(); }
    void deposit(long long amt) override { check(Op::DEPOSIT); real_.deposit(amt); }
    void withdraw(long long amt) override { check(Op::WITHDRAW); real_.withdraw(amt); }
};

string show(const vector<string>& items) {
    string out = "[";
    for (size_t i = 0; i < items.size(); i++) out += (i ? ", " : "") + items[i];
    return out + "]";
}

int main() {
    RealAccount real;
    vector<string> audit;
    SecuredAccount teller(real, Role::TELLER, audit);
    teller.deposit(500);
    try {
        teller.withdraw(100);
    } catch (const SecurityException&) {
        cout << "blocked\\n";
    }
    SecuredAccount(real, Role::OWNER, audit).withdraw(100);
    cout << real.balance() << " " << show(audit) << "\\n";        // 400 [TELLER denied withdraw]

    SecuredAccount auditor(real, Role::AUDITOR, audit);
    cout << auditor.balance() << "\\n";                           // 400: viewing is allowed
    try {
        auditor.deposit(1);
    } catch (const SecurityException& e) {
        cout << e.what() << "\\n";                                // AUDITOR may not DEPOSIT
    }
    try {
        SecuredAccount(real, Role::OWNER, audit).withdraw(1'000);
    } catch (const logic_error& e) {
        cout << e.what() << "\\n";                                // insufficient funds
    }
    cout << show(audit) << "\\n";                                 // [TELLER denied withdraw, AUDITOR denied deposit]
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Security;

enum Role { OWNER, TELLER, AUDITOR }
enum Op { VIEW, DEPOSIT, WITHDRAW }

interface IAccount { long Balance(); void Deposit(long amt); void Withdraw(long amt); }

class RealAccount : IAccount {
    private long balance;
    private readonly object gate = new object();
    public long Balance() { lock (gate) return balance; }
    public void Deposit(long a) { lock (gate) { if (a <= 0) throw new ArgumentException(); balance += a; } }
    public void Withdraw(long a) {
        lock (gate) {
            if (a > balance) throw new InvalidOperationException("insufficient funds");
            balance -= a;
        }
    }
}

class SecuredAccount : IAccount {
    private static readonly Dictionary<Role, HashSet<Op>> Perms = new Dictionary<Role, HashSet<Op>> {
        { Role.OWNER, new HashSet<Op> { Op.VIEW, Op.DEPOSIT, Op.WITHDRAW } },
        { Role.TELLER, new HashSet<Op> { Op.VIEW, Op.DEPOSIT } },
        { Role.AUDITOR, new HashSet<Op> { Op.VIEW } } };

    private readonly IAccount real; private readonly Role role; private readonly List<string> audit;

    public SecuredAccount(IAccount real, Role role, List<string> audit) { this.real = real; this.role = role; this.audit = audit; }

    private void Check(Op op) {
        if (!Perms[role].Contains(op)) {
            audit.Add(role + " denied " + op.ToString().ToLower());
            throw new SecurityException(role + " may not " + op);
        }
    }
    public long Balance() { Check(Op.VIEW); return real.Balance(); }
    public void Deposit(long a) { Check(Op.DEPOSIT); real.Deposit(a); }
    public void Withdraw(long a) { Check(Op.WITHDRAW); real.Withdraw(a); }
}

class Program {
    static void Main() {
        IAccount real = new RealAccount();
        List<string> audit = new List<string>();
        IAccount teller = new SecuredAccount(real, Role.TELLER, audit);
        teller.Deposit(500);
        try { teller.Withdraw(100); } catch (SecurityException) { Console.WriteLine("blocked"); }
        new SecuredAccount(real, Role.OWNER, audit).Withdraw(100);
        Console.WriteLine(real.Balance() + " [" + string.Join(", ", audit) + "]");   // 400 [TELLER denied withdraw]

        IAccount auditor = new SecuredAccount(real, Role.AUDITOR, audit);
        Console.WriteLine(auditor.Balance());                // 400: viewing is allowed
        try { auditor.Deposit(1); }
        catch (SecurityException e) { Console.WriteLine(e.Message); }   // AUDITOR may not DEPOSIT
        try { new SecuredAccount(real, Role.OWNER, audit).Withdraw(1000); }
        catch (InvalidOperationException e) { Console.WriteLine(e.Message); } // insufficient funds
        Console.WriteLine("[" + string.Join(", ", audit) + "]");            // [TELLER denied withdraw, AUDITOR denied deposit]
    }
}` }
      ],
      complexity: `<p>O(1) extra per call (EnumSet lookup). Memory O(roles × ops) for the table.</p>`,
      followUps: ['Generate this proxy for any interface using java.lang.reflect.Proxy and an @RequiresRole annotation.', 'Tellers may withdraw up to ₹10 000 — where does an amount-based rule go?']
    }
  });

  practice.push({
    title: 'Rate-Limiting Proxy for a Third-Party API',
    level: 'Medium', tags: ['proxy', 'rate limiting'], companies: ['Stripe', 'Cloudflare', 'Postman'],
    statement: `<p><code>interface GeoApi { String lookup(String clientId, String ip); }</code> calls a paid vendor. Each client may make at most <b>limit</b> calls per <b>windowMillis</b> (fixed window). Excess calls must fail fast with <code>RateLimitedException</code> <i>without</i> reaching the vendor. Callers must keep using <code>GeoApi</code>. Time must be injectable.</p>`,
    constraints: `<p>limit ≥ 1, windowMillis ≥ 1. Many clients, many threads. Each client's window starts at its first call in that window.</p>`,
    example: `<p>limit = 2, window = 1000 ms. Client A at t = 0, 10 → ${H.c('g', 'allowed')}; t = 20 → ${H.c('r', 'rate limited')}; t = 1005 → new window → ${H.c('g', 'allowed')}. Client B at t = 20 → allowed (separate counter).</p>`,
    brute: { why: `<p>Adding a counter inside the vendor-calling class (or worse, in every caller) mixes throttling with business code, uses a single global counter (one noisy client blocks everyone), and with an unsynchronised map corrupts under concurrency.</p>`, code: { lang: 'java', code: `class VendorGeoApi {
    static int callsThisSecond = 0;                 // global, not per client, not thread-safe
    String lookup(String clientId, String ip) {
        if (++callsThisSecond > 2) throw new RuntimeException("limited");
        return "IN";
    }
}`, alt: [
              { lang: 'python', code: `
class VendorGeoApi:
    calls_this_second = 0                 # global, not per client, not thread-safe
    def lookup(self, client_id, ip):
        VendorGeoApi.calls_this_second += 1
        if VendorGeoApi.calls_this_second > 2: raise RuntimeError("limited")
        return "IN"` },
              { lang: 'ts', code: `
class VendorGeoApi {
    static callsThisSecond = 0;                 // global, not per client
    lookup(clientId: string, ip: string): string {
        if (++VendorGeoApi.callsThisSecond > 2) throw new Error("limited");
        return "IN";
    }
}` },
              { lang: 'cpp', code: `
class VendorGeoApi {
    static inline int callsThisSecond = 0;                 // global, not per client, not thread-safe
public:
    string lookup(const string& clientId, const string& ip) {
        if (++callsThisSecond > 2) throw runtime_error("limited");
        return "IN";
    }
};` },
  { lang: 'csharp', code: `
using System;

class VendorGeoApi {
    static int callsThisSecond = 0;                 // global, not per client, not thread-safe
    public string Lookup(string clientId, string ip) {
        if (++callsThisSecond > 2) throw new Exception("limited");
        return "IN";
    }
}` }
            ] } },
    mcq: { q: 'Why make the limiter a proxy instead of a feature of VendorGeoApi?', options: ['Proxies are faster', 'Access control is a separate concern; the vendor class stays focused and the limiter can wrap any GeoApi', 'The language requires it', 'So the vendor is called even when limited'], answer: 1, explain: 'The proxy guards access with the same interface and can be reused in front of any implementation (including a fake in tests).' },
    hints: [`<p>Hint 1: Same interface, decides whether to forward → proxy. Keep one window per client id.</p>`, `<p>Hint 2: A thread-safe map from client id to <code>Window</code> (Java <code>ConcurrentHashMap.compute</code>; a lock around a <code>dict</code> or <code>unordered_map</code> elsewhere) so the read-modify-write of each client's counter is atomic.</p>`, `<p>Hint 3: In <code>compute</code>: if no window or now − start ≥ window → new Window(now, 1); else count + 1. If the resulting count &gt; limit, throw; otherwise delegate.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "IN\nIN\nlimited: A exceeded 2/1000ms\nUS\nIN\nvendor calls = 4\nlimit and window must be >= 1\n" }] },
    solution: {
      approach: `<p><code>RateLimitingGeoApi implements GeoApi</code> holds the real API, a limit, a window length and a <code>LongSupplier</code> clock. Per client it keeps an immutable <code>Window(start, count)</code> updated atomically (Java <code>ConcurrentHashMap.compute</code>; a short lock around the map in Python and C++). Over-limit calls throw before the vendor is touched. This is a fixed-window limiter; sliding-window or token-bucket variants slot into the same proxy.</p>`,
      code: `class RateLimitedException extends RuntimeException {
    RateLimitedException(String m) { super(m); }
}
interface GeoApi { String lookup(String clientId, String ip); }

class VendorGeoApi implements GeoApi {
    int calls = 0;
    public synchronized String lookup(String clientId, String ip) { calls++; return ip.startsWith("49.") ? "IN" : "US"; }
}

class RateLimitingGeoApi implements GeoApi {
    private record Window(long start, int count) {}
    private final GeoApi real; private final int limit; private final long windowMillis;
    private final java.util.function.LongSupplier clock;
    private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

    RateLimitingGeoApi(GeoApi real, int limit, long windowMillis, java.util.function.LongSupplier clock) {
        if (limit < 1 || windowMillis < 1) throw new IllegalArgumentException("limit and window must be >= 1");
        this.real = real; this.limit = limit; this.windowMillis = windowMillis; this.clock = clock;
    }

    @Override
    public String lookup(String clientId, String ip) {
        long now = clock.getAsLong();
        Window w = windows.compute(clientId, (id, old) ->
            (old == null || now - old.start() >= windowMillis) ? new Window(now, 1) : new Window(old.start(), old.count() + 1));
        if (w.count() > limit) throw new RateLimitedException(clientId + " exceeded " + limit + "/" + windowMillis + "ms");
        return real.lookup(clientId, ip);
    }
}

class GeoDemo {
    public static void main(String[] args) {
        long[] t = {0};
        VendorGeoApi vendor = new VendorGeoApi();
        GeoApi api = new RateLimitingGeoApi(vendor, 2, 1000, () -> t[0]);
        System.out.println(api.lookup("A", "49.1.1.1"));              // IN
        t[0] = 10; System.out.println(api.lookup("A", "49.1.1.1"));   // IN
        t[0] = 20;
        try { api.lookup("A", "49.1.1.1"); }                          // third call in the window
        catch (RateLimitedException e) { System.out.println("limited: " + e.getMessage()); }
        System.out.println(api.lookup("B", "8.8.8.8"));               // US: B has its own counter
        t[0] = 1005; System.out.println(api.lookup("A", "49.1.1.1")); // IN: new window
        System.out.println("vendor calls = " + vendor.calls);         // 4: the limited call never reached it
        try { new RateLimitingGeoApi(vendor, 0, 1000, () -> t[0]); }
        catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
    }
}`,
      alt: [
        { lang: 'python', code: `import threading
from abc import ABC, abstractmethod
from typing import Callable


class RateLimitedException(Exception):
    pass


class GeoApi(ABC):
    @abstractmethod
    def lookup(self, client_id: str, ip: str) -> str: ...


class VendorGeoApi(GeoApi):
    def __init__(self) -> None:
        self.calls = 0
        self._lock = threading.Lock()

    def lookup(self, client_id: str, ip: str) -> str:
        with self._lock:
            self.calls += 1
        return "IN" if ip.startswith("49.") else "US"


class RateLimitingGeoApi(GeoApi):
    def __init__(self, real: GeoApi, limit: int, window_millis: int, clock: Callable[[], int]) -> None:
        if limit < 1 or window_millis < 1:
            raise ValueError("limit and window must be >= 1")
        self._real = real
        self._limit = limit
        self._window_millis = window_millis
        self._clock = clock
        self._windows: dict[str, tuple[int, int]] = {}  # client -> (window start, calls so far)
        self._lock = threading.Lock()

    def lookup(self, client_id: str, ip: str) -> str:
        now = self._clock()
        with self._lock:  # one short critical section per client check
            start, count = self._windows.get(client_id, (now, 0))
            if now - start >= self._window_millis:
                start, count = now, 0
            count += 1
            self._windows[client_id] = (start, count)
        if count > self._limit:
            raise RateLimitedException(f"{client_id} exceeded {self._limit}/{self._window_millis}ms")
        return self._real.lookup(client_id, ip)


if __name__ == "__main__":
    t = 0
    vendor = VendorGeoApi()
    api = RateLimitingGeoApi(vendor, 2, 1000, lambda: t)
    print(api.lookup("A", "49.1.1.1"))  # IN
    t = 10
    print(api.lookup("A", "49.1.1.1"))  # IN
    t = 20
    try:
        api.lookup("A", "49.1.1.1")  # third call in the window
    except RateLimitedException as e:
        print(f"limited: {e}")
    print(api.lookup("B", "8.8.8.8"))  # US: B has its own counter
    t = 1005
    print(api.lookup("A", "49.1.1.1"))  # IN: new window
    print(f"vendor calls = {vendor.calls}")  # 4: the limited call never reached it
    try:
        RateLimitingGeoApi(vendor, 0, 1000, lambda: t)
    except ValueError as e:
        print(e)` },
        { lang: 'ts', code: `export {}; // makes this file a module, so Window never clashes with the DOM global of that name

class RateLimitedException extends Error {}

interface GeoApi {
  lookup(clientId: string, ip: string): string;
}

class VendorGeoApi implements GeoApi {
  calls = 0;

  lookup(_clientId: string, ip: string): string {
    this.calls++;
    return ip.startsWith("49.") ? "IN" : "US";
  }
}

interface Window { readonly start: number; readonly count: number; }

class RateLimitingGeoApi implements GeoApi {
  private readonly windows = new Map<string, Window>(); // JS runs one thread, so no lock is needed

  constructor(
    private readonly real: GeoApi,
    private readonly limit: number,
    private readonly windowMillis: number,
    private readonly clock: () => number,
  ) {
    if (limit < 1 || windowMillis < 1) throw new Error("limit and window must be >= 1");
  }

  lookup(clientId: string, ip: string): string {
    const now = this.clock();
    const old = this.windows.get(clientId);
    const w: Window = old === undefined || now - old.start >= this.windowMillis
      ? { start: now, count: 1 }
      : { start: old.start, count: old.count + 1 };
    this.windows.set(clientId, w);
    if (w.count > this.limit) {
      throw new RateLimitedException(\`\${clientId} exceeded \${this.limit}/\${this.windowMillis}ms\`);
    }
    return this.real.lookup(clientId, ip);
  }
}

let t = 0;
const vendor = new VendorGeoApi();
const api: GeoApi = new RateLimitingGeoApi(vendor, 2, 1000, () => t);
console.log(api.lookup("A", "49.1.1.1")); // IN
t = 10;
console.log(api.lookup("A", "49.1.1.1")); // IN
t = 20;
try {
  api.lookup("A", "49.1.1.1"); // third call in the window
} catch (e) {
  if (e instanceof RateLimitedException) console.log(\`limited: \${e.message}\`);
}
console.log(api.lookup("B", "8.8.8.8")); // US: B has its own counter
t = 1005;
console.log(api.lookup("A", "49.1.1.1")); // IN: new window
console.log(\`vendor calls = \${vendor.calls}\`); // 4: the limited call never reached it
try {
  new RateLimitingGeoApi(vendor, 0, 1000, () => t);
} catch (e) {
  console.log((e as Error).message);
}` },
        { lang: 'cpp', code: `struct RateLimitedException : runtime_error {
    using runtime_error::runtime_error;
};

class GeoApi {
public:
    virtual ~GeoApi() = default;
    virtual string lookup(const string& clientId, const string& ip) = 0;
};

class VendorGeoApi : public GeoApi {
public:
    atomic<int> calls{0};
    string lookup(const string&, const string& ip) override {
        calls++;
        return ip.rfind("49.", 0) == 0 ? "IN" : "US";
    }
};

class RateLimitingGeoApi : public GeoApi {
    struct Window { long long start; int count; };

    GeoApi& real_;
    int limit_;
    long long windowMillis_;
    function<long long()> clock_;
    unordered_map<string, Window> windows_;
    mutex mu_;
public:
    RateLimitingGeoApi(GeoApi& real, int limit, long long windowMillis, function<long long()> clock)
        : real_(real), limit_(limit), windowMillis_(windowMillis), clock_(std::move(clock)) {
        if (limit < 1 || windowMillis < 1) throw invalid_argument("limit and window must be >= 1");
    }

    string lookup(const string& clientId, const string& ip) override {
        long long now = clock_();
        int count;
        {
            lock_guard<mutex> lock(mu_);                    // one short critical section per client check
            auto [it, fresh] = windows_.try_emplace(clientId, Window{now, 0});
            if (!fresh && now - it->second.start >= windowMillis_) it->second = Window{now, 0};
            count = ++it->second.count;
        }
        if (count > limit_)
            throw RateLimitedException(clientId + " exceeded " + to_string(limit_) + "/" + to_string(windowMillis_) + "ms");
        return real_.lookup(clientId, ip);
    }
};

int main() {
    long long t = 0;
    VendorGeoApi vendor;
    RateLimitingGeoApi api(vendor, 2, 1000, [&t] { return t; });
    cout << api.lookup("A", "49.1.1.1") << "\\n";            // IN
    t = 10;
    cout << api.lookup("A", "49.1.1.1") << "\\n";            // IN
    t = 20;
    try {
        api.lookup("A", "49.1.1.1");                        // third call in the window
    } catch (const RateLimitedException& e) {
        cout << "limited: " << e.what() << "\\n";
    }
    cout << api.lookup("B", "8.8.8.8") << "\\n";             // US: B has its own counter
    t = 1005;
    cout << api.lookup("A", "49.1.1.1") << "\\n";            // IN: new window
    cout << "vendor calls = " << vendor.calls << "\\n";      // 4: the limited call never reached it
    try {
        RateLimitingGeoApi bad(vendor, 0, 1000, [&t] { return t; });
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";
    }
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Concurrent;

class RateLimitedException : Exception {
    public RateLimitedException(string m) : base(m) { }
}
interface IGeoApi { string Lookup(string clientId, string ip); }

class VendorGeoApi : IGeoApi {
    public int Calls = 0;
    private readonly object gate = new object();
    public string Lookup(string clientId, string ip) { lock (gate) { Calls++; } return ip.StartsWith("49.") ? "IN" : "US"; }
}

class RateLimitingGeoApi : IGeoApi {
    private sealed class Window {
        public readonly long Start; public readonly int Count;
        public Window(long start, int count) { Start = start; Count = count; }
    }
    private readonly IGeoApi real; private readonly int limit; private readonly long windowMillis;
    private readonly Func<long> clock;
    private readonly ConcurrentDictionary<string, Window> windows = new ConcurrentDictionary<string, Window>();

    public RateLimitingGeoApi(IGeoApi real, int limit, long windowMillis, Func<long> clock) {
        if (limit < 1 || windowMillis < 1) throw new ArgumentException("limit and window must be >= 1");
        this.real = real; this.limit = limit; this.windowMillis = windowMillis; this.clock = clock;
    }

    public string Lookup(string clientId, string ip) {
        long now = clock();
        Window w = windows.AddOrUpdate(clientId, id => new Window(now, 1),
            (id, old) => now - old.Start >= windowMillis ? new Window(now, 1) : new Window(old.Start, old.Count + 1));
        if (w.Count > limit) throw new RateLimitedException(clientId + " exceeded " + limit + "/" + windowMillis + "ms");
        return real.Lookup(clientId, ip);
    }
}

class Program {
    static void Main() {
        long t = 0;
        VendorGeoApi vendor = new VendorGeoApi();
        IGeoApi api = new RateLimitingGeoApi(vendor, 2, 1000, () => t);
        Console.WriteLine(api.Lookup("A", "49.1.1.1"));              // IN
        t = 10; Console.WriteLine(api.Lookup("A", "49.1.1.1"));      // IN
        t = 20;
        try { api.Lookup("A", "49.1.1.1"); }                         // third call in the window
        catch (RateLimitedException e) { Console.WriteLine("limited: " + e.Message); }
        Console.WriteLine(api.Lookup("B", "8.8.8.8"));               // US: B has its own counter
        t = 1005; Console.WriteLine(api.Lookup("A", "49.1.1.1"));    // IN: new window
        Console.WriteLine("vendor calls = " + vendor.Calls);         // 4: the limited call never reached it
        try { new RateLimitingGeoApi(vendor, 0, 1000, () => t); }
        catch (ArgumentException e) { Console.WriteLine(e.Message); }
    }
}` }
      ],
      complexity: `<p>O(1) per call. Memory O(active clients) — evict idle windows periodically in production.</p>`,
      followUps: ['Fixed windows allow 2× the limit across a boundary — implement a sliding-window log or token bucket.', 'Run 10 servers behind a load balancer — where does the counter live now? (Redis INCR + EXPIRE)']
    }
  });

  practice.push({
    title: '100 000 Bullets with Flyweight Sprites',
    level: 'Medium', tags: ['flyweight', 'game dev', 'memory'], companies: ['Unity', 'EA', 'Nintendo'],
    statement: `<p>A shooter game spawns up to 100 000 bullets. Each bullet type (pistol, laser, rocket…) has a 64 KB sprite, a damage value and a colour; each bullet has its own position, velocity and remaining life. Implement <code>spawn(type, x, y, vx, vy)</code>, <code>tick()</code> (move bullets, remove dead ones) and <code>memoryEstimateBytes()</code>.</p>`,
    constraints: `<p>≤ 16 bullet types, ≤ 10<sup>5</sup> live bullets, tick must be O(live bullets). Bullet types are immutable.</p>`,
    example: `<p>Spawn 3 pistol + 2 laser bullets → <b>${H.c('g', '2')}</b> BulletType objects exist, 5 Bullet contexts. Memory estimate = 2 × 65 536 + 5 × 40 = <b>131 272 bytes</b> instead of 5 × 65 536 = 327 680 bytes (and about 6.5 GB vs about 4.1 MB at 100 000 bullets).</p>`,
    brute: { why: `<p>Each <code>Bullet</code> owns a copy of its 64 KB sprite. At 100 000 bullets that is about 6.5 GB — the game crashes, and even before that, allocating sprites every frame thrashes the garbage collector.</p>`, code: { lang: 'java', code: `class Bullet {
    final byte[] sprite = new byte[64 * 1024];   // copied per bullet!
    final int damage; double x, y, vx, vy; int life = 100;
    Bullet(int damage, double x, double y, double vx, double vy) { this.damage = damage; this.x = x; this.y = y; this.vx = vx; this.vy = vy; }
}`, alt: [
              { lang: 'python', code: `
class Bullet:
    def __init__(self, damage, x, y, vx, vy):
        self.sprite = bytearray(64 * 1024)   # copied per bullet!
        self.damage = damage
        self.x, self.y, self.vx, self.vy = x, y, vx, vy
        self.life = 100` },
              { lang: 'ts', code: `
class Bullet {
    readonly sprite = new Uint8Array(64 * 1024);   // copied per bullet!
    life = 100;
    constructor(readonly damage: number, public x: number, public y: number, public vx: number, public vy: number) {}
}` },
              { lang: 'cpp', code: `
struct Bullet {
    vector<unsigned char> sprite = vector<unsigned char>(64 * 1024);   // copied per bullet!
    int damage; double x, y, vx, vy; int life = 100;
    Bullet(int damage, double x, double y, double vx, double vy) : damage(damage), x(x), y(y), vx(vx), vy(vy) { }
};` },
  { lang: 'csharp', code: `
using System;

class Bullet {
    public readonly byte[] Sprite = new byte[64 * 1024];   // copied per bullet!
    public readonly int Damage; public double X, Y, Vx, Vy; public int Life = 100;
    public Bullet(int damage, double x, double y, double vx, double vy) { Damage = damage; X = x; Y = y; Vx = vx; Vy = vy; }
}` }
            ] } },
    mcq: { q: 'Which fields belong in the shared BulletType flyweight?', options: ['x, y', 'vx, vy, life', 'sprite, damage, colour', 'All fields'], answer: 2, explain: 'Sprite, damage and colour are identical for every bullet of a type (intrinsic). Position, velocity and life differ per bullet (extrinsic).' },
    hints: [`<p>Hint 1: Split intrinsic (per type) from extrinsic (per bullet) state.</p>`, `<p>Hint 2: <code>BulletTypeFactory</code> with an atomic get-or-create (<code>computeIfAbsent</code> in Java); <code>Bullet</code> holds a reference to its type plus mutable motion fields.</p>`, `<p>Hint 3: In <code>tick()</code> use an iterator (or swap-remove) to delete dead bullets in O(1) each. Memory estimate = types × sprite + bullets × context size.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "2 types, 5 bullets, ~131272 bytes\ntrue\n2 types, 0 bullets, ~131072 bytes\n" }] },
    solution: {
      approach: `<p><code>BulletType</code> is an immutable value (a Java record, a frozen dataclass; name, sprite, damage, colour) created once per name by a factory. <code>Bullet</code> is a small mutable context (x, y, vx, vy, life, type ref). The world keeps a list of <code>Bullet</code> (<code>ArrayList</code> / <code>list</code> / <code>Array</code> / <code>vector</code>) and removes dead bullets with swap-remove for O(1) deletion. Memory drops from bullets × 64 KB to types × 64 KB + bullets × ~40 B.</p>`,
      code: `record BulletType(String name, byte[] sprite, int damage, int rgb) {}

final class BulletTypeFactory {
    private final Map<String, BulletType> pool = new ConcurrentHashMap<>();
    BulletType get(String name) {
        return pool.computeIfAbsent(name, n -> new BulletType(n, new byte[64 * 1024],
            n.equals("rocket") ? 50 : n.equals("laser") ? 20 : 10, n.hashCode() & 0xFFFFFF));
    }
    int size() { return pool.size(); }
}

final class Bullet {                                   // extrinsic, ~40 bytes
    final BulletType type; double x, y; final double vx, vy; int life;
    Bullet(BulletType t, double x, double y, double vx, double vy) { type = t; this.x = x; this.y = y; this.vx = vx; this.vy = vy; life = 100; }
}

class BulletWorld {
    private static final int CONTEXT_BYTES = 40, SPRITE_BYTES = 64 * 1024;
    private final BulletTypeFactory types = new BulletTypeFactory();
    private final List<Bullet> live = new ArrayList<>();

    void spawn(String type, double x, double y, double vx, double vy) { live.add(new Bullet(types.get(type), x, y, vx, vy)); }

    void tick() {
        for (int i = live.size() - 1; i >= 0; i--) {
            Bullet b = live.get(i);
            b.x += b.vx; b.y += b.vy;
            if (--b.life <= 0) {                        // swap-remove: O(1)
                live.set(i, live.get(live.size() - 1));
                live.remove(live.size() - 1);
            }
        }
    }

    long memoryEstimateBytes() { return (long) types.size() * SPRITE_BYTES + (long) live.size() * CONTEXT_BYTES; }

    String report() { return types.size() + " types, " + live.size() + " bullets, ~" + memoryEstimateBytes() + " bytes"; }

    public static void main(String[] args) {
        BulletWorld w = new BulletWorld();
        for (int i = 0; i < 3; i++) w.spawn("pistol", 0, i, 1, 0);
        for (int i = 0; i < 2; i++) w.spawn("laser", 0, i, 2, 0);
        w.tick();
        System.out.println(w.report());                                   // 2 types, 5 bullets, ~131272 bytes
        System.out.println(w.live.get(0).type == w.live.get(1).type);    // true: both pistols share one BulletType
        for (int i = 1; i < 100; i++) w.tick();                          // every bullet lives 100 ticks
        System.out.println(w.report());                                   // 2 types, 0 bullets, ~131072 bytes
    }
}`,
      alt: [
        { lang: 'python', code: `import threading
import zlib
from dataclasses import dataclass


@dataclass(frozen=True)  # immutable: safe to share between every bullet
class BulletType:
    name: str
    sprite: bytes  # the big intrinsic part
    damage: int
    rgb: int


class BulletTypeFactory:
    def __init__(self) -> None:
        self._pool: dict[str, BulletType] = {}
        self._lock = threading.Lock()

    def get(self, name: str) -> BulletType:
        with self._lock:
            if name not in self._pool:
                damage = 50 if name == "rocket" else 20 if name == "laser" else 10
                self._pool[name] = BulletType(name, bytes(64 * 1024), damage, zlib.crc32(name.encode()) & 0xFFFFFF)
            return self._pool[name]

    def size(self) -> int:
        return len(self._pool)


class Bullet:  # extrinsic state only, ~40 bytes in the Java model
    __slots__ = ("type", "x", "y", "vx", "vy", "life")

    def __init__(self, type_: BulletType, x: float, y: float, vx: float, vy: float) -> None:
        self.type = type_
        self.x = x
        self.y = y
        self.vx = vx
        self.vy = vy
        self.life = 100


class BulletWorld:
    CONTEXT_BYTES = 40
    SPRITE_BYTES = 64 * 1024

    def __init__(self) -> None:
        self.types = BulletTypeFactory()
        self.live: list[Bullet] = []

    def spawn(self, type_name: str, x: float, y: float, vx: float, vy: float) -> None:
        self.live.append(Bullet(self.types.get(type_name), x, y, vx, vy))

    def tick(self) -> None:
        for i in range(len(self.live) - 1, -1, -1):
            b = self.live[i]
            b.x += b.vx
            b.y += b.vy
            b.life -= 1
            if b.life <= 0:  # swap-remove: O(1)
                self.live[i] = self.live[-1]
                self.live.pop()

    def memory_estimate_bytes(self) -> int:
        return self.types.size() * self.SPRITE_BYTES + len(self.live) * self.CONTEXT_BYTES

    def report(self) -> str:
        return f"{self.types.size()} types, {len(self.live)} bullets, ~{self.memory_estimate_bytes()} bytes"


if __name__ == "__main__":
    w = BulletWorld()
    for i in range(3):
        w.spawn("pistol", 0, i, 1, 0)
    for i in range(2):
        w.spawn("laser", 0, i, 2, 0)
    w.tick()
    print(w.report())  # 2 types, 5 bullets, ~131272 bytes
    print(str(w.live[0].type is w.live[1].type).lower())  # true: both pistols share one BulletType
    for _ in range(99):  # every bullet lives 100 ticks
        w.tick()
    print(w.report())  # 2 types, 0 bullets, ~131072 bytes` },
        { lang: 'ts', code: `interface BulletType { // immutable: safe to share between every bullet
  readonly name: string;
  readonly sprite: Uint8Array; // the big intrinsic part
  readonly damage: number;
  readonly rgb: number;
}

class BulletTypeFactory {
  private readonly pool = new Map<string, BulletType>();

  get(name: string): BulletType {
    let type = this.pool.get(name);
    if (type === undefined) {
      const damage = name === "rocket" ? 50 : name === "laser" ? 20 : 10;
      const rgb = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0) & 0xffffff; // like Java's hashCode
      type = Object.freeze({ name, sprite: new Uint8Array(64 * 1024), damage, rgb });
      this.pool.set(name, type);
    }
    return type;
  }

  size(): number {
    return this.pool.size;
  }
}

class Bullet { // extrinsic state only
  life = 100;

  constructor(readonly type: BulletType, public x: number, public y: number,
              readonly vx: number, readonly vy: number) {}
}

class BulletWorld {
  private static readonly CONTEXT_BYTES = 40;
  private static readonly SPRITE_BYTES = 64 * 1024;
  readonly types = new BulletTypeFactory();
  readonly live: Bullet[] = [];

  spawn(type: string, x: number, y: number, vx: number, vy: number): void {
    this.live.push(new Bullet(this.types.get(type), x, y, vx, vy));
  }

  tick(): void {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const b = this.live[i];
      b.x += b.vx;
      b.y += b.vy;
      if (--b.life <= 0) { // swap-remove: O(1)
        this.live[i] = this.live[this.live.length - 1];
        this.live.pop();
      }
    }
  }

  memoryEstimateBytes(): number {
    return this.types.size() * BulletWorld.SPRITE_BYTES + this.live.length * BulletWorld.CONTEXT_BYTES;
  }

  report(): string {
    return \`\${this.types.size()} types, \${this.live.length} bullets, ~\${this.memoryEstimateBytes()} bytes\`;
  }
}

const w = new BulletWorld();
for (let i = 0; i < 3; i++) w.spawn("pistol", 0, i, 1, 0);
for (let i = 0; i < 2; i++) w.spawn("laser", 0, i, 2, 0);
w.tick();
console.log(w.report()); // 2 types, 5 bullets, ~131272 bytes
console.log(w.live[0].type === w.live[1].type); // true: both pistols share one BulletType
for (let i = 1; i < 100; i++) w.tick(); // every bullet lives 100 ticks
console.log(w.report()); // 2 types, 0 bullets, ~131072 bytes` },
        { lang: 'cpp', code: `struct BulletType {                              // immutable: safe to share between every bullet
    string name;
    vector<uint8_t> sprite;                      // the big intrinsic part
    int damage;
    int rgb;
};

class BulletTypeFactory {
    unordered_map<string, unique_ptr<const BulletType>> pool_;   // the factory owns every type
    mutex mu_;
public:
    const BulletType* get(const string& name) {
        lock_guard<mutex> lock(mu_);
        auto& slot = pool_[name];
        if (!slot) {
            int damage = name == "rocket" ? 50 : name == "laser" ? 20 : 10;
            slot = make_unique<const BulletType>(BulletType{name, vector<uint8_t>(64 * 1024), damage,
                                                           static_cast<int>(hash<string>{}(name) & 0xFFFFFF)});
        }
        return slot.get();
    }
    int size() const { return static_cast<int>(pool_.size()); }
};

struct Bullet {                                  // extrinsic state only, ~40 bytes
    const BulletType* type;                      // non-owning: the factory outlives every bullet
    double x, y, vx, vy;
    int life = 100;
};

class BulletWorld {
    static constexpr long long CONTEXT_BYTES = 40, SPRITE_BYTES = 64 * 1024;
    BulletTypeFactory types_;
    vector<Bullet> live_;
public:
    void spawn(const string& type, double x, double y, double vx, double vy) {
        live_.push_back(Bullet{types_.get(type), x, y, vx, vy});
    }

    void tick() {
        for (int i = static_cast<int>(live_.size()) - 1; i >= 0; i--) {
            Bullet& b = live_[i];
            b.x += b.vx;
            b.y += b.vy;
            if (--b.life <= 0) {                 // swap-remove: O(1)
                b = live_.back();
                live_.pop_back();
            }
        }
    }

    long long memoryEstimateBytes() const { return types_.size() * SPRITE_BYTES + live_.size() * CONTEXT_BYTES; }

    string report() const {
        return to_string(types_.size()) + " types, " + to_string(live_.size()) + " bullets, ~"
             + to_string(memoryEstimateBytes()) + " bytes";
    }

    bool sameType(size_t a, size_t b) const { return live_[a].type == live_[b].type; }
};

int main() {
    BulletWorld w;
    for (int i = 0; i < 3; i++) w.spawn("pistol", 0, i, 1, 0);
    for (int i = 0; i < 2; i++) w.spawn("laser", 0, i, 2, 0);
    w.tick();
    cout << w.report() << "\\n";                  // 2 types, 5 bullets, ~131272 bytes
    cout << boolalpha << w.sameType(0, 1) << "\\n"; // true: both pistols share one BulletType
    for (int i = 1; i < 100; i++) w.tick();      // every bullet lives 100 ticks
    cout << w.report() << "\\n";                  // 2 types, 0 bullets, ~131072 bytes
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;

sealed class BulletType {
    public readonly string Name; public readonly byte[] Sprite; public readonly int Damage, Rgb;
    public BulletType(string name, byte[] sprite, int damage, int rgb) { Name = name; Sprite = sprite; Damage = damage; Rgb = rgb; }
}

sealed class BulletTypeFactory {
    private readonly ConcurrentDictionary<string, BulletType> pool = new ConcurrentDictionary<string, BulletType>();
    public BulletType Get(string name) {
        return pool.GetOrAdd(name, n => new BulletType(n, new byte[64 * 1024],
            n == "rocket" ? 50 : n == "laser" ? 20 : 10, n.GetHashCode() & 0xFFFFFF));
    }
    public int Count { get { return pool.Count; } }
}

sealed class Bullet {                                   // extrinsic, ~40 bytes
    public readonly BulletType Type; public double X, Y; public readonly double Vx, Vy; public int Life;
    public Bullet(BulletType t, double x, double y, double vx, double vy) { Type = t; X = x; Y = y; Vx = vx; Vy = vy; Life = 100; }
}

class BulletWorld {
    private const int ContextBytes = 40, SpriteBytes = 64 * 1024;
    private readonly BulletTypeFactory types = new BulletTypeFactory();
    public readonly List<Bullet> Live = new List<Bullet>();

    public void Spawn(string type, double x, double y, double vx, double vy) { Live.Add(new Bullet(types.Get(type), x, y, vx, vy)); }

    public void Tick() {
        for (int i = Live.Count - 1; i >= 0; i--) {
            Bullet b = Live[i];
            b.X += b.Vx; b.Y += b.Vy;
            if (--b.Life <= 0) {                        // swap-remove: O(1)
                Live[i] = Live[Live.Count - 1];
                Live.RemoveAt(Live.Count - 1);
            }
        }
    }

    public long MemoryEstimateBytes() { return (long)types.Count * SpriteBytes + (long)Live.Count * ContextBytes; }

    public string Report() { return types.Count + " types, " + Live.Count + " bullets, ~" + MemoryEstimateBytes() + " bytes"; }
}

class Program {
    static void Main() {
        BulletWorld w = new BulletWorld();
        for (int i = 0; i < 3; i++) w.Spawn("pistol", 0, i, 1, 0);
        for (int i = 0; i < 2; i++) w.Spawn("laser", 0, i, 2, 0);
        w.Tick();
        Console.WriteLine(w.Report());                                   // 2 types, 5 bullets, ~131272 bytes
        Console.WriteLine(ReferenceEquals(w.Live[0].Type, w.Live[1].Type).ToString().ToLower());    // true: both pistols share one BulletType
        for (int i = 1; i < 100; i++) w.Tick();                          // every bullet lives 100 ticks
        Console.WriteLine(w.Report());                                   // 2 types, 0 bullets, ~131072 bytes
    }
}` }
      ],
      complexity: `<p>spawn O(1) amortised, tick O(live bullets). Memory O(types × sprite + bullets).</p>`,
      followUps: ['Also pool Bullet objects (Object Pool) to avoid GC churn — how do Flyweight and Object Pool differ here?', 'Convert bullets to struct-of-arrays (double[] xs, ys…) — what do you gain and lose?']
    }
  });

  practice.push({
    title: 'Encode → Compress → Checksum Pipeline (Order Matters)',
    level: 'Medium', tags: ['decorator', 'streams'], companies: ['Dropbox', 'Google', 'Backblaze'],
    statement: `<p><code>interface DataStore { void write(String data); String read(); }</code> with a plain <code>MemoryStore</code>. Add stackable features: <b>Compression</b> (run-length encoding with a marker: "aaab" → "3xa1xb" — count, an 'x', then the character, so any character including digits survives), <b>Encryption</b> (simple reversible shift cipher for this exercise), and <b>Checksum</b> (append "#&lt;sum&gt;" on write, verify and strip on read, throw if corrupted). Each feature must transform on write and undo on read, and any subset in any order must round-trip.</p>`,
    constraints: `<p>Any characters (layers will feed each other digits, '#' and 'x'). Length ≤ 10<sup>5</sup>. <code>read()</code> after <code>write(s)</code> must return exactly s for every stacking order — so each layer's decode must invert its encode for <i>every</i> string.</p>`,
    example: `<p><code>new Checksum(new Encryption(new Compression(new MemoryStore())))</code>; write "aaabbb": Checksum appends ${H.c('y', '"#sum"')}, Encryption shifts the letters, Compression run-length encodes, and the store keeps the result. <code>read()</code> undoes them in exact reverse (Compression → Encryption → Checksum) and returns ${H.c('g', '"aaabbb"')}. The outer layer's write runs first and its read runs last.</p>`,
    brute: { why: `<p>A single <code>SmartStore</code> with flags <code>compress</code>, <code>encrypt</code>, <code>checksum</code> must hard-code one order of operations in write and the exact reverse in read. Supporting a different order or a new transform (Base64) means rewriting both methods; bugs where read's order does not mirror write's corrupt data silently.</p>`, code: { lang: 'java', code: `class SmartStore {
    boolean compress, encrypt; String stored = "";
    void write(String s) {
        if (encrypt) s = shift(s, 3);          // fixed order baked in
        if (compress) s = s.toUpperCase();     // placeholder transform for the flag
        stored = s;
    }
    String read() {
        String s = stored;
        if (compress) s = s.toLowerCase();
        if (encrypt) s = shift(s, -3);         // must mirror write exactly, by hand
        return s;
    }
    static String shift(String s, int k) {
        StringBuilder b = new StringBuilder();
        for (char c : s.toCharArray()) b.append((char) (c + k));
        return b.toString();
    }
}`, alt: [
              { lang: 'python', code: `
class SmartStore:
    def __init__(self):
        self.compress = self.encrypt = False
        self.stored = ""
    def write(self, s):
        if self.encrypt: s = self.shift(s, 3)          # fixed order baked in
        if self.compress: s = s.upper()                # placeholder transform for the flag
        self.stored = s
    def read(self):
        s = self.stored
        if self.compress: s = s.lower()
        if self.encrypt: s = self.shift(s, -3)         # must mirror write exactly, by hand
        return s
    @staticmethod
    def shift(s, k):
        return "".join(chr(ord(c) + k) for c in s)` },
              { lang: 'ts', code: `
class SmartStore {
    compress = false; encrypt = false; stored = "";
    write(s: string): void {
        if (this.encrypt) s = SmartStore.shift(s, 3);          // fixed order baked in
        if (this.compress) s = s.toUpperCase();                // placeholder transform for the flag
        this.stored = s;
    }
    read(): string {
        let s = this.stored;
        if (this.compress) s = s.toLowerCase();
        if (this.encrypt) s = SmartStore.shift(s, -3);         // must mirror write exactly, by hand
        return s;
    }
    static shift(s: string, k: number): string {
        let b = "";
        for (const c of s) b += String.fromCharCode(c.charCodeAt(0) + k);
        return b;
    }
}` },
              { lang: 'cpp', code: `
class SmartStore {
    string stored;
    static string shift(string s, int k) { for (char& c : s) c = (char)(c + k); return s; }
public:
    bool compress = false, encrypt = false;
    void write(string s) {
        if (encrypt) s = shift(s, 3);          // fixed order baked in
        if (compress) transform(s.begin(), s.end(), s.begin(), ::toupper);   // placeholder transform for the flag
        stored = s;
    }
    string read() {
        string s = stored;
        if (compress) transform(s.begin(), s.end(), s.begin(), ::tolower);
        if (encrypt) s = shift(s, -3);         // must mirror write exactly, by hand
        return s;
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Text;

class SmartStore {
    public bool Compress, Encrypt; public string Stored = "";
    public void Write(string s) {
        if (Encrypt) s = Shift(s, 3);          // fixed order baked in
        if (Compress) s = s.ToUpper();         // placeholder transform for the flag
        Stored = s;
    }
    public string Read() {
        string s = Stored;
        if (Compress) s = s.ToLower();
        if (Encrypt) s = Shift(s, -3);         // must mirror Write exactly, by hand
        return s;
    }
    static string Shift(string s, int k) {
        StringBuilder b = new StringBuilder();
        foreach (char c in s) b.Append((char)(c + k));
        return b.ToString();
    }
}` }
            ] } },
    mcq: { q: 'With Encryption(Compression(store)), what does the compressor see on write?', options: ['The original text', 'The encrypted text', 'The checksum', 'Nothing — compression runs on read only'], answer: 1, explain: 'The outer decorator (Encryption) transforms first and passes its output inward, so Compression receives ciphertext — which compresses badly. Order matters.' },
    hints: [`<p>Hint 1: Each feature is a decorator with two halves: transform on the way in (write) and inverse on the way out (read).</p>`, `<p>Hint 2: <code>write(s)</code> → <code>inner.write(encode(s))</code>; <code>read()</code> → <code>decode(inner.read())</code>. Wrapping automatically mirrors the order.</p>`, `<p>Hint 3: RLE decode: read digits up to the 'x' marker into a count, then repeat the single character after the marker (it may itself be a digit or an 'x'). Checksum: sum of chars mod 997; on read split at the last '#', recompute, throw <code>IllegalStateException</code> on mismatch.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "aaabbbCCz 42x#\naaabbbCCz 42x#\naaabbbCCz 42x#\n3xa1xb\ncorrupted\n" }] },
    solution: {
      approach: `<p>An abstract <code>TransformingStore</code> decorator implements <code>write</code> as <code>inner.write(encode(s))</code> and <code>read</code> as <code>decode(inner.read())</code>. Subclasses supply only <code>encode</code>/<code>decode</code>. Because each call passes through the layers in nested order, the read path is automatically the exact mirror of the write path — any order round-trips. Real-world tip: compress before encrypting, i.e. <code>Compression(Encryption(store))</code> — the outer layer runs first on write, so the plaintext is compressed and then encrypted. (Encrypted bytes look random and barely compress.)</p>`,
      code: `interface DataStore { void write(String data); String read(); }

class MemoryStore implements DataStore {
    private String data = "";
    public void write(String d) { data = d; }
    public String read() { return data; }
}

abstract class TransformingStore implements DataStore {
    protected final DataStore inner;
    TransformingStore(DataStore inner) { this.inner = inner; }
    protected abstract String encode(String s);
    protected abstract String decode(String s);
    public final void write(String s) { inner.write(encode(s)); }
    public final String read() { return decode(inner.read()); }
}

class Compression extends TransformingStore {
    Compression(DataStore d) { super(d); }
    protected String encode(String s) {
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < s.length(); ) {
            int j = i;
            while (j < s.length() && s.charAt(j) == s.charAt(i)) j++;
            b.append(j - i).append('x').append(s.charAt(i));   // count, marker, char
            i = j;
        }
        return b.toString();
    }
    protected String decode(String s) {
        StringBuilder b = new StringBuilder();
        int i = 0;
        while (i < s.length()) {
            int count = 0;
            while (s.charAt(i) != 'x') count = count * 10 + (s.charAt(i++) - '0');
            char c = s.charAt(i + 1);                    // the char right after the marker
            b.append(String.valueOf(c).repeat(count));
            i += 2;
        }
        return b.toString();
    }
}

class Encryption extends TransformingStore {           // toy cipher: shift letters by 3 (not real crypto!)
    Encryption(DataStore d) { super(d); }
    private static String shift(String s, int k) {
        StringBuilder b = new StringBuilder();
        for (char c : s.toCharArray()) {
            if (Character.isLowerCase(c)) b.append((char) ('a' + Math.floorMod(c - 'a' + k, 26)));
            else if (Character.isUpperCase(c)) b.append((char) ('A' + Math.floorMod(c - 'A' + k, 26)));
            else b.append(c);
        }
        return b.toString();
    }
    protected String encode(String s) { return shift(s, 3); }
    protected String decode(String s) { return shift(s, -3); }
}

class Checksum extends TransformingStore {
    Checksum(DataStore d) { super(d); }
    private static int sum(String s) { int x = 0; for (char c : s.toCharArray()) x = (x + c) % 997; return x; }
    protected String encode(String s) { return s + "#" + sum(s); }
    protected String decode(String s) {
        int at = s.lastIndexOf('#');
        if (at < 0) throw new IllegalStateException("missing checksum");
        String body = s.substring(0, at);
        if (sum(body) != Integer.parseInt(s.substring(at + 1))) throw new IllegalStateException("corrupted");
        return body;
    }
}

class PipelineDemo {
    public static void main(String[] args) {
        DataStore[] stacks = {
            new Checksum(new Encryption(new Compression(new MemoryStore()))),
            new Compression(new Encryption(new Checksum(new MemoryStore()))),
            new Encryption(new MemoryStore())
        };
        for (DataStore s : stacks) { s.write("aaabbbCCz 42x#"); System.out.println(s.read()); }   // round-trips x3

        MemoryStore raw = new MemoryStore();                      // peek at what a layer really stores
        new Compression(raw).write("aaab");
        System.out.println(raw.read());                            // 3xa1xb

        DataStore guarded = new Checksum(raw);
        guarded.write("hello");                                    // stored as hello#<sum>
        raw.write(raw.read().replace('h', 'j'));                   // someone flips a byte in storage
        try { guarded.read(); }
        catch (IllegalStateException e) { System.out.println(e.getMessage()); }   // corrupted
    }
}`,
      alt: [
        { lang: 'python', code: `import re
from abc import ABC, abstractmethod
from itertools import groupby


class DataStore(ABC):
    @abstractmethod
    def write(self, data: str) -> None: ...

    @abstractmethod
    def read(self) -> str: ...


class MemoryStore(DataStore):
    def __init__(self) -> None:
        self._data = ""

    def write(self, data: str) -> None:
        self._data = data

    def read(self) -> str:
        return self._data


class TransformingStore(DataStore, ABC):
    """Template: write = encode then pass down; read = take from below then decode."""

    def __init__(self, inner: DataStore) -> None:
        self._inner = inner

    @abstractmethod
    def encode(self, s: str) -> str: ...

    @abstractmethod
    def decode(self, s: str) -> str: ...

    def write(self, data: str) -> None:
        self._inner.write(self.encode(data))

    def read(self) -> str:
        return self.decode(self._inner.read())


class Compression(TransformingStore):
    def encode(self, s: str) -> str:
        return "".join(f"{len(list(run))}x{ch}" for ch, run in groupby(s))  # count, marker, char

    def decode(self, s: str) -> str:
        return re.sub(r"(\\d+)x(.)", lambda m: m.group(2) * int(m.group(1)), s, flags=re.DOTALL)


class Encryption(TransformingStore):  # toy cipher: shift letters by 3 (not real crypto!)
    _LOWER = "abcdefghijklmnopqrstuvwxyz"
    _UPPER = _LOWER.upper()

    @classmethod
    def _table(cls, k: int) -> dict[int, str]:
        rotate = lambda alphabet: alphabet[k % 26:] + alphabet[:k % 26]
        return str.maketrans(cls._LOWER + cls._UPPER, rotate(cls._LOWER) + rotate(cls._UPPER))

    def encode(self, s: str) -> str:
        return s.translate(self._table(3))

    def decode(self, s: str) -> str:
        return s.translate(self._table(-3))


class Checksum(TransformingStore):
    @staticmethod
    def _sum(s: str) -> int:
        x = 0
        for c in s:
            x = (x + ord(c)) % 997
        return x

    def encode(self, s: str) -> str:
        return f"{s}#{self._sum(s)}"

    def decode(self, s: str) -> str:
        at = s.rfind("#")
        if at < 0:
            raise RuntimeError("missing checksum")
        body = s[:at]
        if self._sum(body) != int(s[at + 1:]):
            raise RuntimeError("corrupted")
        return body


if __name__ == "__main__":
    stacks: list[DataStore] = [
        Checksum(Encryption(Compression(MemoryStore()))),
        Compression(Encryption(Checksum(MemoryStore()))),
        Encryption(MemoryStore()),
    ]
    for s in stacks:
        s.write("aaabbbCCz 42x#")
        print(s.read())  # round-trips x3

    raw = MemoryStore()  # peek at what a layer really stores
    Compression(raw).write("aaab")
    print(raw.read())  # 3xa1xb

    guarded = Checksum(raw)
    guarded.write("hello")  # stored as hello#<sum>
    raw.write(raw.read().replace("h", "j"))  # someone flips a byte in storage
    try:
        guarded.read()
    except RuntimeError as e:
        print(e)  # corrupted` },
        { lang: 'ts', code: `interface DataStore {
  write(data: string): void;
  read(): string;
}

class MemoryStore implements DataStore {
  private data = "";
  write(data: string): void { this.data = data; }
  read(): string { return this.data; }
}

// Template: write = encode then pass down; read = take from below then decode.
abstract class TransformingStore implements DataStore {
  constructor(protected readonly inner: DataStore) {}
  protected abstract encode(s: string): string;
  protected abstract decode(s: string): string;
  write(data: string): void { this.inner.write(this.encode(data)); }
  read(): string { return this.decode(this.inner.read()); }
}

class Compression extends TransformingStore {
  protected encode(s: string): string {
    return s.replace(/([\\s\\S])\\1*/g, (run, ch: string) => \`\${run.length}x\${ch}\`); // count, marker, char
  }

  protected decode(s: string): string {
    return s.replace(/(\\d+)x([\\s\\S])/g, (_m, n: string, ch: string) => ch.repeat(Number(n)));
  }
}

class Encryption extends TransformingStore { // toy cipher: shift letters by 3 (not real crypto!)
  private static shift(s: string, k: number): string {
    return s.replace(/[a-z]/gi, (c) => {
      const base = c <= "Z" ? 65 : 97;
      return String.fromCharCode(base + ((((c.charCodeAt(0) - base + k) % 26) + 26) % 26));
    });
  }
  protected encode(s: string): string { return Encryption.shift(s, 3); }
  protected decode(s: string): string { return Encryption.shift(s, -3); }
}

class Checksum extends TransformingStore {
  private static sum(s: string): number {
    let x = 0;
    for (let i = 0; i < s.length; i++) x = (x + s.charCodeAt(i)) % 997;
    return x;
  }

  protected encode(s: string): string { return \`\${s}#\${Checksum.sum(s)}\`; }

  protected decode(s: string): string {
    const at = s.lastIndexOf("#");
    if (at < 0) throw new Error("missing checksum");
    const body = s.slice(0, at);
    if (Checksum.sum(body) !== Number(s.slice(at + 1))) throw new Error("corrupted");
    return body;
  }
}

const stacks: DataStore[] = [
  new Checksum(new Encryption(new Compression(new MemoryStore()))),
  new Compression(new Encryption(new Checksum(new MemoryStore()))),
  new Encryption(new MemoryStore()),
];
for (const s of stacks) {
  s.write("aaabbbCCz 42x#");
  console.log(s.read()); // round-trips x3
}

const raw = new MemoryStore(); // peek at what a layer really stores
new Compression(raw).write("aaab");
console.log(raw.read()); // 3xa1xb

const guarded = new Checksum(raw);
guarded.write("hello"); // stored as hello#<sum>
raw.write(raw.read().replace("h", "j")); // someone flips a byte in storage
try {
  guarded.read();
} catch (e) {
  console.log((e as Error).message); // corrupted
}` },
        { lang: 'cpp', code: `class DataStore {
public:
    virtual ~DataStore() = default;
    virtual void write(const string& data) = 0;
    virtual string read() = 0;
};

class MemoryStore : public DataStore {
    string data_;
public:
    void write(const string& d) override { data_ = d; }
    string read() override { return data_; }
};

// Template: write = encode then pass down; read = take from below then decode.
class TransformingStore : public DataStore {
protected:
    unique_ptr<DataStore> inner_;
    explicit TransformingStore(unique_ptr<DataStore> inner) : inner_(std::move(inner)) {}
    virtual string encode(const string& s) const = 0;
    virtual string decode(const string& s) const = 0;
public:
    void write(const string& s) final { inner_->write(encode(s)); }
    string read() final { return decode(inner_->read()); }
};

class Compression : public TransformingStore {
public:
    explicit Compression(unique_ptr<DataStore> d) : TransformingStore(std::move(d)) {}
protected:
    string encode(const string& s) const override {
        string out;
        for (size_t i = 0; i < s.size();) {
            size_t j = i;
            while (j < s.size() && s[j] == s[i]) j++;
            out += to_string(j - i) + 'x' + s[i];                  // count, marker, char
            i = j;
        }
        return out;
    }
    string decode(const string& s) const override {
        string out;
        size_t i = 0;
        while (i < s.size()) {
            int count = 0;
            while (s[i] != 'x') count = count * 10 + (s[i++] - '0');
            out.append(count, s[i + 1]);                           // the char right after the marker
            i += 2;
        }
        return out;
    }
};

class Encryption : public TransformingStore {                      // toy cipher: shift letters by 3 (not real crypto!)
    static string shift(string s, int k) {
        for (char& c : s) {
            if (islower(static_cast<unsigned char>(c))) c = static_cast<char>('a' + ((c - 'a' + k) % 26 + 26) % 26);
            else if (isupper(static_cast<unsigned char>(c))) c = static_cast<char>('A' + ((c - 'A' + k) % 26 + 26) % 26);
        }
        return s;
    }
public:
    explicit Encryption(unique_ptr<DataStore> d) : TransformingStore(std::move(d)) {}
protected:
    string encode(const string& s) const override { return shift(s, 3); }
    string decode(const string& s) const override { return shift(s, -3); }
};

class Checksum : public TransformingStore {
    static int sum(const string& s) {
        int x = 0;
        for (unsigned char c : s) x = (x + c) % 997;
        return x;
    }
public:
    explicit Checksum(unique_ptr<DataStore> d) : TransformingStore(std::move(d)) {}
protected:
    string encode(const string& s) const override { return s + "#" + to_string(sum(s)); }
    string decode(const string& s) const override {
        size_t at = s.rfind('#');
        if (at == string::npos) throw runtime_error("missing checksum");
        string body = s.substr(0, at);
        if (sum(body) != stoi(s.substr(at + 1))) throw runtime_error("corrupted");
        return body;
    }
};

// Borrowed view: lets a decorator wrap a store that somebody else owns (decorators own what they wrap).
class StoreRef : public DataStore {
    DataStore& target_;
public:
    explicit StoreRef(DataStore& target) : target_(target) {}
    void write(const string& d) override { target_.write(d); }
    string read() override { return target_.read(); }
};

int main() {
    vector<unique_ptr<DataStore>> stacks;
    stacks.push_back(make_unique<Checksum>(make_unique<Encryption>(make_unique<Compression>(make_unique<MemoryStore>()))));
    stacks.push_back(make_unique<Compression>(make_unique<Encryption>(make_unique<Checksum>(make_unique<MemoryStore>()))));
    stacks.push_back(make_unique<Encryption>(make_unique<MemoryStore>()));
    for (auto& s : stacks) {
        s->write("aaabbbCCz 42x#");
        cout << s->read() << "\\n";                                 // round-trips x3
    }

    MemoryStore raw;                                               // peek at what a layer really stores
    Compression(make_unique<StoreRef>(raw)).write("aaab");
    cout << raw.read() << "\\n";                                    // 3xa1xb

    Checksum guarded(make_unique<StoreRef>(raw));
    guarded.write("hello");                                        // stored as hello#<sum>
    string stored = raw.read();
    stored[0] = 'j';                                               // someone flips a byte in storage
    raw.write(stored);
    try {
        guarded.read();
    } catch (const runtime_error& e) {
        cout << e.what() << "\\n";                                  // corrupted
    }
}` },
  { lang: 'csharp', code: `
using System;
using System.Text;

interface IDataStore { void Write(string data); string Read(); }

class MemoryStore : IDataStore {
    private string data = "";
    public void Write(string d) { data = d; }
    public string Read() { return data; }
}

abstract class TransformingStore : IDataStore {
    protected readonly IDataStore inner;
    protected TransformingStore(IDataStore inner) { this.inner = inner; }
    protected abstract string Encode(string s);
    protected abstract string Decode(string s);
    public void Write(string s) { inner.Write(Encode(s)); }
    public string Read() { return Decode(inner.Read()); }
}

class Compression : TransformingStore {
    public Compression(IDataStore d) : base(d) { }
    protected override string Encode(string s) {
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < s.Length; ) {
            int j = i;
            while (j < s.Length && s[j] == s[i]) j++;
            b.Append(j - i).Append('x').Append(s[i]);   // count, marker, char
            i = j;
        }
        return b.ToString();
    }
    protected override string Decode(string s) {
        StringBuilder b = new StringBuilder();
        int i = 0;
        while (i < s.Length) {
            int count = 0;
            while (s[i] != 'x') count = count * 10 + (s[i++] - '0');
            char c = s[i + 1];                           // the char right after the marker
            b.Append(new string(c, count));
            i += 2;
        }
        return b.ToString();
    }
}

class Encryption : TransformingStore {           // toy cipher: shift letters by 3 (not real crypto!)
    public Encryption(IDataStore d) : base(d) { }
    private static int Mod(int a, int m) { return ((a % m) + m) % m; }
    private static string Shift(string s, int k) {
        StringBuilder b = new StringBuilder();
        foreach (char c in s) {
            if (c >= 'a' && c <= 'z') b.Append((char)('a' + Mod(c - 'a' + k, 26)));
            else if (c >= 'A' && c <= 'Z') b.Append((char)('A' + Mod(c - 'A' + k, 26)));
            else b.Append(c);
        }
        return b.ToString();
    }
    protected override string Encode(string s) { return Shift(s, 3); }
    protected override string Decode(string s) { return Shift(s, -3); }
}

class Checksum : TransformingStore {
    public Checksum(IDataStore d) : base(d) { }
    private static int Sum(string s) { int x = 0; foreach (char c in s) x = (x + c) % 997; return x; }
    protected override string Encode(string s) { return s + "#" + Sum(s); }
    protected override string Decode(string s) {
        int at = s.LastIndexOf('#');
        if (at < 0) throw new InvalidOperationException("missing checksum");
        string body = s.Substring(0, at);
        if (Sum(body) != int.Parse(s.Substring(at + 1))) throw new InvalidOperationException("corrupted");
        return body;
    }
}

class Program {
    static void Main() {
        IDataStore[] stacks = {
            new Checksum(new Encryption(new Compression(new MemoryStore()))),
            new Compression(new Encryption(new Checksum(new MemoryStore()))),
            new Encryption(new MemoryStore())
        };
        foreach (IDataStore s in stacks) { s.Write("aaabbbCCz 42x#"); Console.WriteLine(s.Read()); }   // round-trips x3

        MemoryStore raw = new MemoryStore();                      // peek at what a layer really stores
        new Compression(raw).Write("aaab");
        Console.WriteLine(raw.Read());                            // 3xa1xb

        IDataStore guarded = new Checksum(raw);
        guarded.Write("hello");                                   // stored as hello#<sum>
        raw.Write(raw.Read().Replace('h', 'j'));                  // someone flips a byte in storage
        try { guarded.Read(); }
        catch (InvalidOperationException e) { Console.WriteLine(e.Message); }   // corrupted
    }
}` }
      ],
      complexity: `<p>Each layer is O(n) per read/write; k layers → O(k·n). Memory O(n) per intermediate string.</p>`,
      followUps: ['Streaming version: make the decorators wrap OutputStream/InputStream so 10 GB files never sit in memory.', 'Which order is best for real compression + AES-GCM encryption, and why does checksum become unnecessary with authenticated encryption?']
    }
  });

  practice.push({
    title: 'Shapes × Renderers: ASCII and SVG',
    level: 'Medium', tags: ['bridge', 'which pattern fits'], companies: ['Figma', 'Canva', 'Adobe'],
    statement: `<p>Support shapes <b>Rect(w, h)</b> and <b>Square(side)</b> and renderers <b>Ascii</b> (draws with '#') and <b>Svg</b> (returns an svg rect element string). Product will add Circle, Line and a PDF renderer later. Each shape must render with each renderer, and adding one shape or renderer must be one class.</p>`,
    constraints: `<p>1 ≤ w, h ≤ 20 for ASCII. Shapes must not contain renderer-specific code; renderers must not know shape classes.</p>`,
    example: `<p><code>new Rect(new AsciiRenderer(), 3, 2).draw()</code> → ${H.c('b', '"### / ###"')}. <code>new Square(new SvgRenderer(), 4).draw()</code> → ${H.c('g', 'rect element with width 4 and height 4')}. 2 shapes × 2 renderers from 4 classes.</p>`,
    brute: { why: `<p><code>AsciiRect</code>, <code>SvgRect</code>, <code>AsciiSquare</code>, <code>SvgSquare</code>… M × N classes. Adding PDF needs M new classes; adding Circle needs N. ASCII drawing code is duplicated in every Ascii* class.</p>`, code: { lang: 'java', code: `class AsciiRect {
    final int w, h; AsciiRect(int w, int h) { this.w = w; this.h = h; }
    String draw() { return String.join(" / ", Collections.nCopies(h, "#".repeat(w))); }
}
class AsciiSquare {
    final int s; AsciiSquare(int s) { this.s = s; }
    String draw() { return String.join(" / ", Collections.nCopies(s, "#".repeat(s))); }   // duplicated
}
class SvgRect {
    final int w, h; SvgRect(int w, int h) { this.w = w; this.h = h; }
    String draw() { return "<rect width='" + w + "' height='" + h + "'/>"; }
}`, alt: [
              { lang: 'python', code: `
class AsciiRect:
    def __init__(self, w, h): self.w, self.h = w, h
    def draw(self): return " / ".join(["#" * self.w] * self.h)

class AsciiSquare:
    def __init__(self, s): self.s = s
    def draw(self): return " / ".join(["#" * self.s] * self.s)   # duplicated

class SvgRect:
    def __init__(self, w, h): self.w, self.h = w, h
    def draw(self): return f"<rect width='{self.w}' height='{self.h}'/>"` },
              { lang: 'ts', code: `
class AsciiRect {
    constructor(readonly w: number, readonly h: number) {}
    draw(): string { return Array(this.h).fill("#".repeat(this.w)).join(" / "); }
}
class AsciiSquare {
    constructor(readonly s: number) {}
    draw(): string { return Array(this.s).fill("#".repeat(this.s)).join(" / "); }   // duplicated
}
class SvgRect {
    constructor(readonly w: number, readonly h: number) {}
    draw(): string { return "<rect width='" + this.w + "' height='" + this.h + "'/>"; }
}` },
              { lang: 'cpp', code: `
string joinRows(int rows, int cols) {
    string out;
    for (int i = 0; i < rows; i++) out += (i ? " / " : "") + string(cols, '#');
    return out;
}
struct AsciiRect {
    int w, h; AsciiRect(int w, int h) : w(w), h(h) { }
    string draw() { return joinRows(h, w); }
};
struct AsciiSquare {
    int s; AsciiSquare(int s) : s(s) { }
    string draw() { return joinRows(s, s); }   // duplicated
};
struct SvgRect {
    int w, h; SvgRect(int w, int h) : w(w), h(h) { }
    string draw() { return "<rect width='" + to_string(w) + "' height='" + to_string(h) + "'/>"; }
};` },
  { lang: 'csharp', code: `
using System;
using System.Linq;

class AsciiRect {
    public readonly int W, H; public AsciiRect(int w, int h) { W = w; H = h; }
    public string Draw() { return string.Join(" / ", Enumerable.Repeat(new string('#', W), H)); }
}
class AsciiSquare {
    public readonly int S; public AsciiSquare(int s) { S = s; }
    public string Draw() { return string.Join(" / ", Enumerable.Repeat(new string('#', S), S)); }   // duplicated
}
class SvgRect {
    public readonly int W, H; public SvgRect(int w, int h) { W = w; H = h; }
    public string Draw() { return "<rect width='" + W + "' height='" + H + "'/>"; }
}` }
            ] } },
    mcq: { q: 'Shapes and renderers both grow independently. Which pattern prevents M × N classes?', options: ['Bridge', 'Flyweight', 'Facade', 'Proxy'], answer: 0, explain: 'Bridge separates the abstraction (shape) from the implementor (renderer) and joins them by composition.' },
    hints: [`<p>Hint 1: Two axes → two hierarchies. Which side defines the primitive operations?</p>`, `<p>Hint 2: Implementor: <code>Renderer { String rect(int w, int h); }</code>. Abstraction: <code>abstract class Shape { protected final Renderer r; abstract String draw(); }</code>.</p>`, `<p>Hint 3: <code>Square.draw()</code> reuses the renderer's rect primitive — refined abstractions build on primitives instead of adding renderer methods.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "### / ###\n<rect width='4' height='4'/>\n## / ##\nascii supports 1..20\n" }] },
    solution: {
      approach: `<p>Implementor <code>Renderer</code> exposes primitives (<code>rect(w, h)</code>); <code>AsciiRenderer</code> and <code>SvgRenderer</code> implement them. Abstraction <code>Shape</code> holds a renderer; <code>Rect</code> and <code>Square</code> express themselves via the primitives. Adding Circle may need a new primitive (<code>circle(r)</code>) — that is the main cost of Bridge: the implementor interface must be designed carefully.</p>`,
      code: `interface Renderer { String rect(int w, int h); }

class AsciiRenderer implements Renderer {
    public String rect(int w, int h) {
        if (w < 1 || h < 1 || w > 20 || h > 20) throw new IllegalArgumentException("ascii supports 1..20");
        return String.join(" / ", Collections.nCopies(h, "#".repeat(w)));
    }
}
class SvgRenderer implements Renderer {
    public String rect(int w, int h) { return "<rect width='" + w + "' height='" + h + "'/>"; }
}

abstract class Shape {
    protected final Renderer renderer;              // the bridge
    protected Shape(Renderer r) { renderer = Objects.requireNonNull(r); }
    abstract String draw();
}
class Rect extends Shape {
    private final int w, h;
    Rect(Renderer r, int w, int h) { super(r); this.w = w; this.h = h; }
    String draw() { return renderer.rect(w, h); }
}
class Square extends Shape {
    private final int side;
    Square(Renderer r, int side) { super(r); this.side = side; }
    String draw() { return renderer.rect(side, side); }   // built on the same primitive
}

class BridgeDemo {
    public static void main(String[] args) {
        System.out.println(new Rect(new AsciiRenderer(), 3, 2).draw());   // ### / ###
        System.out.println(new Square(new SvgRenderer(), 4).draw());     // <rect width='4' height='4'/>
        System.out.println(new Square(new AsciiRenderer(), 2).draw());   // ## / ##
        try { new Rect(new AsciiRenderer(), 25, 2).draw(); }
        catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }   // ascii supports 1..20
    }
}`,
      alt: [
        { lang: 'python', code: `from abc import ABC, abstractmethod


# ---- Implementor side of the bridge ----
class Renderer(ABC):
    @abstractmethod
    def rect(self, w: int, h: int) -> str: ...


class AsciiRenderer(Renderer):
    def rect(self, w: int, h: int) -> str:
        if not (1 <= w <= 20 and 1 <= h <= 20):
            raise ValueError("ascii supports 1..20")
        return " / ".join(["#" * w] * h)


class SvgRenderer(Renderer):
    def rect(self, w: int, h: int) -> str:
        return f"<rect width='{w}' height='{h}'/>"


# ---- Abstraction side of the bridge ----
class Shape(ABC):
    def __init__(self, renderer: Renderer) -> None:
        self._renderer = renderer  # the bridge

    @abstractmethod
    def draw(self) -> str: ...


class Rect(Shape):
    def __init__(self, renderer: Renderer, w: int, h: int) -> None:
        super().__init__(renderer)
        self._w = w
        self._h = h

    def draw(self) -> str:
        return self._renderer.rect(self._w, self._h)


class Square(Shape):
    def __init__(self, renderer: Renderer, side: int) -> None:
        super().__init__(renderer)
        self._side = side

    def draw(self) -> str:
        return self._renderer.rect(self._side, self._side)  # built on the same primitive


if __name__ == "__main__":
    print(Rect(AsciiRenderer(), 3, 2).draw())  # ### / ###
    print(Square(SvgRenderer(), 4).draw())  # <rect width='4' height='4'/>
    print(Square(AsciiRenderer(), 2).draw())  # ## / ##
    try:
        Rect(AsciiRenderer(), 25, 2).draw()
    except ValueError as e:
        print(e)  # ascii supports 1..20` },
        { lang: 'ts', code: `// ---- Implementor side of the bridge ----
interface Renderer {
  rect(w: number, h: number): string;
}

class AsciiRenderer implements Renderer {
  rect(w: number, h: number): string {
    if (w < 1 || h < 1 || w > 20 || h > 20) throw new Error("ascii supports 1..20");
    return Array<string>(h).fill("#".repeat(w)).join(" / ");
  }
}

class SvgRenderer implements Renderer {
  rect(w: number, h: number): string {
    return \`<rect width='\${w}' height='\${h}'/>\`;
  }
}

// ---- Abstraction side of the bridge ----
abstract class Shape {
  protected constructor(protected readonly renderer: Renderer) {} // the bridge
  abstract draw(): string;
}

class Rect extends Shape {
  constructor(renderer: Renderer, private readonly w: number, private readonly h: number) {
    super(renderer);
  }
  draw(): string { return this.renderer.rect(this.w, this.h); }
}

class Square extends Shape {
  constructor(renderer: Renderer, private readonly side: number) {
    super(renderer);
  }
  draw(): string { return this.renderer.rect(this.side, this.side); } // built on the same primitive
}

console.log(new Rect(new AsciiRenderer(), 3, 2).draw()); // ### / ###
console.log(new Square(new SvgRenderer(), 4).draw()); // <rect width='4' height='4'/>
console.log(new Square(new AsciiRenderer(), 2).draw()); // ## / ##
try {
  new Rect(new AsciiRenderer(), 25, 2).draw();
} catch (e) {
  console.log((e as Error).message); // ascii supports 1..20
}` },
        { lang: 'cpp', code: `// ---- Implementor side of the bridge ----
class Renderer {
public:
    virtual ~Renderer() = default;
    virtual string rect(int w, int h) const = 0;
};

class AsciiRenderer : public Renderer {
public:
    string rect(int w, int h) const override {
        if (w < 1 || h < 1 || w > 20 || h > 20) throw invalid_argument("ascii supports 1..20");
        string out;
        for (int row = 0; row < h; row++) out += (row ? " / " : "") + string(w, '#');
        return out;
    }
};

class SvgRenderer : public Renderer {
public:
    string rect(int w, int h) const override {
        return "<rect width='" + to_string(w) + "' height='" + to_string(h) + "'/>";
    }
};

// ---- Abstraction side of the bridge ----
class Shape {
protected:
    unique_ptr<Renderer> renderer_;                       // the bridge
    explicit Shape(unique_ptr<Renderer> r) : renderer_(std::move(r)) {
        if (!renderer_) throw invalid_argument("renderer required");
    }
public:
    virtual ~Shape() = default;
    virtual string draw() const = 0;
};

class Rect : public Shape {
    int w_, h_;
public:
    Rect(unique_ptr<Renderer> r, int w, int h) : Shape(std::move(r)), w_(w), h_(h) {}
    string draw() const override { return renderer_->rect(w_, h_); }
};

class Square : public Shape {
    int side_;
public:
    Square(unique_ptr<Renderer> r, int side) : Shape(std::move(r)), side_(side) {}
    string draw() const override { return renderer_->rect(side_, side_); }   // built on the same primitive
};

int main() {
    cout << Rect(make_unique<AsciiRenderer>(), 3, 2).draw() << "\\n";    // ### / ###
    cout << Square(make_unique<SvgRenderer>(), 4).draw() << "\\n";       // <rect width='4' height='4'/>
    cout << Square(make_unique<AsciiRenderer>(), 2).draw() << "\\n";     // ## / ##
    try {
        Rect(make_unique<AsciiRenderer>(), 25, 2).draw();
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";                                       // ascii supports 1..20
    }
}` },
  { lang: 'csharp', code: `
using System;
using System.Linq;

interface IRenderer { string Rect(int w, int h); }

class AsciiRenderer : IRenderer {
    public string Rect(int w, int h) {
        if (w < 1 || h < 1 || w > 20 || h > 20) throw new ArgumentException("ascii supports 1..20");
        return string.Join(" / ", Enumerable.Repeat(new string('#', w), h));
    }
}
class SvgRenderer : IRenderer {
    public string Rect(int w, int h) { return "<rect width='" + w + "' height='" + h + "'/>"; }
}

abstract class Shape {
    protected readonly IRenderer renderer;              // the bridge
    protected Shape(IRenderer r) { if (r == null) throw new ArgumentNullException("r"); renderer = r; }
    public abstract string Draw();
}
class Rect : Shape {
    private readonly int w, h;
    public Rect(IRenderer r, int w, int h) : base(r) { this.w = w; this.h = h; }
    public override string Draw() { return renderer.Rect(w, h); }
}
class Square : Shape {
    private readonly int side;
    public Square(IRenderer r, int side) : base(r) { this.side = side; }
    public override string Draw() { return renderer.Rect(side, side); }   // built on the same primitive
}

class Program {
    static void Main() {
        Console.WriteLine(new Rect(new AsciiRenderer(), 3, 2).Draw());   // ### / ###
        Console.WriteLine(new Square(new SvgRenderer(), 4).Draw());     // <rect width='4' height='4'/>
        Console.WriteLine(new Square(new AsciiRenderer(), 2).Draw());   // ## / ##
        try { new Rect(new AsciiRenderer(), 25, 2).Draw(); }
        catch (ArgumentException e) { Console.WriteLine(e.Message); }   // ascii supports 1..20
    }
}` }
      ],
      complexity: `<p>Classes M + N; draw cost depends on the renderer (ASCII O(w·h), SVG O(1)).</p>`,
      followUps: ['Add Circle: what changes in the Renderer interface, and how do you keep old renderers compiling (default methods)?', 'Pick the renderer per user preference at runtime — who wires it?']
    }
  });

  practice.push({
    title: 'Two-Way Adapter for a Gradual Storage Migration',
    level: 'Medium', tags: ['adapter', 'migration', 'strangler'], companies: ['Shopify', 'Atlassian', 'Uber'],
    statement: `<p>Old code uses <code>interface LegacyUserStore { Map&lt;String,String&gt; load(int id); void save(int id, Map&lt;String,String&gt; fields); }</code> (fields "name", "email"). New code uses <code>interface UserRepository { Optional&lt;User&gt; find(long id); void put(User u); }</code> with <code>record User(long id, String name, String email)</code>. During a 6-month migration both kinds of callers must work against <b>one</b> underlying store (the new one). Write the adapter(s).</p>`,
    constraints: `<p>Missing user → <code>load</code> returns an empty map. Unknown legacy field names are rejected with <code>IllegalArgumentException</code>. Ids above <code>Integer.MAX_VALUE</code> are not visible to legacy callers.</p>`,
    example: `<p>New code: <code>put(User(7, "Asha", "a@x.com"))</code>. Old code: <code>load(7)</code> → ${H.c('g', '{name=Asha, email=a@x.com}')}. Old code: <code>save(8, {name: "Ben"})</code> → new code <code>find(8)</code> → ${H.c('g', 'User(8, Ben, null)')}.</p>`,
    brute: { why: `<p>Running two separate stores and syncing them with a nightly job: data is stale for up to 24 hours, writes on both sides conflict, and the "sync" becomes a second migration project. Or rewriting all old callers at once — a risky big-bang release.</p>`, code: { lang: 'java', code: `class NightlySync {
    // copies everything from the old store to the new one once a day
    void run(Map<Integer, Map<String, String>> oldStore, Map<Long, String[]> newStore) {
        oldStore.forEach((id, f) -> newStore.put((long) id, new String[]{f.get("name"), f.get("email")}));
        // writes made to newStore during the day are overwritten tonight: data loss
    }
}`, alt: [
              { lang: 'python', code: `
class NightlySync:
    # copies everything from the old store to the new one once a day
    def run(self, old_store, new_store):
        for id, f in old_store.items():
            new_store[id] = [f.get("name"), f.get("email")]
        # writes made to new_store during the day are overwritten tonight: data loss` },
              { lang: 'ts', code: `
class NightlySync {
    // copies everything from the old store to the new one once a day
    run(oldStore: Map<number, Map<string, string>>, newStore: Map<number, string[]>): void {
        oldStore.forEach((f, id) => newStore.set(id, [f.get("name")!, f.get("email")!]));
        // writes made to newStore during the day are overwritten tonight: data loss
    }
}` },
              { lang: 'cpp', code: `
class NightlySync {
public:
    // copies everything from the old store to the new one once a day
    void run(map<int, map<string, string>>& oldStore, map<long long, array<string, 2>>& newStore) {
        for (auto& [id, f] : oldStore) newStore[id] = {f["name"], f["email"]};
        // writes made to newStore during the day are overwritten tonight: data loss
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;

class NightlySync {
    // copies everything from the old store to the new one once a day
    public void Run(Dictionary<int, Dictionary<string, string>> oldStore, Dictionary<long, string[]> newStore) {
        foreach (var kv in oldStore) newStore[kv.Key] = new[] { kv.Value["name"], kv.Value["email"] };
        // writes made to newStore during the day are overwritten tonight: data loss
    }
}` }
            ] } },
    mcq: { q: 'Old callers keep calling LegacyUserStore, but data lives in UserRepository. The adapter implements which interface and wraps which?', options: ['Implements UserRepository, wraps LegacyUserStore', 'Implements LegacyUserStore, wraps UserRepository', 'Implements both, wraps nothing', 'Extends User'], answer: 1, explain: 'The target is what the client expects (LegacyUserStore); the adaptee is the real store (UserRepository).' },
    hints: [`<p>Hint 1: Old clients' target = <code>LegacyUserStore</code>; the adaptee = <code>UserRepository</code>.</p>`, `<p>Hint 2: <code>load</code>: find → convert record to map (skip nulls). <code>save</code>: validate keys, merge with existing user if present, then put.</p>`, `<p>Hint 3: Convert int ↔ long carefully; guard ids beyond int range on the legacy side. Keep the conversion in one adapter class so it is deleted in one commit when migration ends.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "{email=a@x.com, name=Asha}\nUser[id=8, name=Ben, email=null]\n{}\nUser[id=8, name=Ben, email=b@x.com]\nunknown field phone\n" }] },
    solution: {
      approach: `<p><code>LegacyStoreAdapter implements LegacyUserStore</code> and wraps the new <code>UserRepository</code>, so there is exactly one source of truth. <code>load</code> maps the record to a field map; <code>save</code> validates keys, merges partial updates onto the existing user (legacy saves may send only some fields), and writes through. New code uses the repository directly. When no old callers remain, delete the adapter (strangler pattern).</p>`,
      code: `record User(long id, String name, String email) {}

interface UserRepository { Optional<User> find(long id); void put(User u); }
interface LegacyUserStore { Map<String, String> load(int id); void save(int id, Map<String, String> fields); }

class InMemoryUserRepository implements UserRepository {
    private final Map<Long, User> rows = new ConcurrentHashMap<>();
    public Optional<User> find(long id) { return Optional.ofNullable(rows.get(id)); }
    public void put(User u) { rows.put(u.id(), u); }
}

class LegacyStoreAdapter implements LegacyUserStore {
    private static final Set<String> FIELDS = Set.of("name", "email");
    private final UserRepository repo;
    LegacyStoreAdapter(UserRepository repo) { this.repo = repo; }

    @Override
    public Map<String, String> load(int id) {
        return repo.find(id).map(u -> {
            Map<String, String> m = new HashMap<>();
            if (u.name() != null) m.put("name", u.name());
            if (u.email() != null) m.put("email", u.email());
            return m;
        }).orElseGet(HashMap::new);
    }

    @Override
    public void save(int id, Map<String, String> fields) {
        for (String k : fields.keySet())
            if (!FIELDS.contains(k)) throw new IllegalArgumentException("unknown field " + k);
        User old = repo.find(id).orElse(new User(id, null, null));
        repo.put(new User(id,
            fields.getOrDefault("name", old.name()),
            fields.getOrDefault("email", old.email())));      // partial update merges
    }

    public static void main(String[] args) {
        UserRepository repo = new InMemoryUserRepository();
        LegacyUserStore legacy = new LegacyStoreAdapter(repo);
        repo.put(new User(7, "Asha", "a@x.com"));
        System.out.println(new TreeMap<>(legacy.load(7)));    // {email=a@x.com, name=Asha}
        legacy.save(8, Map.of("name", "Ben"));
        System.out.println(repo.find(8).orElseThrow());       // User[id=8, name=Ben, email=null]
        System.out.println(legacy.load(99));                  // {}: a missing user is an empty map
        legacy.save(8, Map.of("email", "b@x.com"));           // partial update merges with what is stored
        System.out.println(repo.find(8).orElseThrow());       // User[id=8, name=Ben, email=b@x.com]
        try { legacy.save(9, Map.of("phone", "123")); }
        catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }   // unknown field phone
    }
}`,
      alt: [
        { lang: 'python', code: `from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class User:
    id: int
    name: Optional[str]
    email: Optional[str]

    def __str__(self) -> str:
        name = "null" if self.name is None else self.name
        email = "null" if self.email is None else self.email
        return f"User[id={self.id}, name={name}, email={email}]"


class UserRepository(ABC):  # the new interface
    @abstractmethod
    def find(self, user_id: int) -> Optional[User]: ...

    @abstractmethod
    def put(self, user: User) -> None: ...


class LegacyUserStore(ABC):  # the old interface
    @abstractmethod
    def load(self, user_id: int) -> dict[str, str]: ...

    @abstractmethod
    def save(self, user_id: int, fields: dict[str, str]) -> None: ...


class InMemoryUserRepository(UserRepository):
    def __init__(self) -> None:
        self._rows: dict[int, User] = {}

    def find(self, user_id: int) -> Optional[User]:
        return self._rows.get(user_id)

    def put(self, user: User) -> None:
        self._rows[user.id] = user


class LegacyStoreAdapter(LegacyUserStore):
    _FIELDS = frozenset({"name", "email"})

    def __init__(self, repo: UserRepository) -> None:
        self._repo = repo

    def load(self, user_id: int) -> dict[str, str]:
        user = self._repo.find(user_id)
        if user is None:
            return {}
        fields = {"name": user.name, "email": user.email}
        return {k: v for k, v in fields.items() if v is not None}

    def save(self, user_id: int, fields: dict[str, str]) -> None:
        for k in fields:
            if k not in self._FIELDS:
                raise ValueError(f"unknown field {k}")
        old = self._repo.find(user_id) or User(user_id, None, None)
        self._repo.put(User(user_id, fields.get("name", old.name), fields.get("email", old.email)))  # merges


def show(m: dict[str, str]) -> str:
    return "{" + ", ".join(f"{k}={v}" for k, v in sorted(m.items())) + "}"


if __name__ == "__main__":
    repo = InMemoryUserRepository()
    legacy = LegacyStoreAdapter(repo)
    repo.put(User(7, "Asha", "a@x.com"))
    print(show(legacy.load(7)))  # {email=a@x.com, name=Asha}
    legacy.save(8, {"name": "Ben"})
    print(repo.find(8))  # User[id=8, name=Ben, email=null]
    print(show(legacy.load(99)))  # {}: a missing user is an empty map
    legacy.save(8, {"email": "b@x.com"})  # partial update merges with what is stored
    print(repo.find(8))  # User[id=8, name=Ben, email=b@x.com]
    try:
        legacy.save(9, {"phone": "123"})
    except ValueError as e:
        print(e)  # unknown field phone` },
        { lang: 'ts', code: `interface User {
  readonly id: number;
  readonly name: string | null;
  readonly email: string | null;
}

interface UserRepository { // the new interface
  find(id: number): User | undefined;
  put(u: User): void;
}

type Fields = Record<string, string>;

interface LegacyUserStore { // the old interface
  load(id: number): Fields;
  save(id: number, fields: Fields): void;
}

class InMemoryUserRepository implements UserRepository {
  private readonly rows = new Map<number, User>();
  find(id: number): User | undefined { return this.rows.get(id); }
  put(u: User): void { this.rows.set(u.id, u); }
}

class LegacyStoreAdapter implements LegacyUserStore {
  private static readonly FIELDS: ReadonlySet<string> = new Set(["name", "email"]);

  constructor(private readonly repo: UserRepository) {}

  load(id: number): Fields {
    const u = this.repo.find(id);
    const out: Fields = {};
    if (u?.name != null) out.name = u.name;
    if (u?.email != null) out.email = u.email;
    return out; // {} for a missing user
  }

  save(id: number, fields: Fields): void {
    for (const k of Object.keys(fields)) {
      if (!LegacyStoreAdapter.FIELDS.has(k)) throw new Error(\`unknown field \${k}\`);
    }
    const old: User = this.repo.find(id) ?? { id, name: null, email: null };
    this.repo.put({ id, name: fields.name ?? old.name, email: fields.email ?? old.email }); // partial update merges
  }
}

const showMap = (m: Fields): string =>
  "{" + Object.keys(m).sort().map((k) => \`\${k}=\${m[k]}\`).join(", ") + "}";
const showUser = (u: User): string => \`User[id=\${u.id}, name=\${u.name}, email=\${u.email}]\`;

const repo = new InMemoryUserRepository();
const legacy: LegacyUserStore = new LegacyStoreAdapter(repo);
repo.put({ id: 7, name: "Asha", email: "a@x.com" });
console.log(showMap(legacy.load(7))); // {email=a@x.com, name=Asha}
legacy.save(8, { name: "Ben" });
console.log(showUser(repo.find(8)!)); // User[id=8, name=Ben, email=null]
console.log(showMap(legacy.load(99))); // {}: a missing user is an empty map
legacy.save(8, { email: "b@x.com" }); // partial update merges with what is stored
console.log(showUser(repo.find(8)!)); // User[id=8, name=Ben, email=b@x.com]
try {
  legacy.save(9, { phone: "123" });
} catch (e) {
  console.log((e as Error).message); // unknown field phone
}` },
        { lang: 'cpp', code: `struct User {
    long long id;
    optional<string> name, email;
};

string show(const User& u) {
    return "User[id=" + to_string(u.id) + ", name=" + u.name.value_or("null") + ", email=" + u.email.value_or("null") + "]";
}

using Fields = map<string, string>;                    // std::map is sorted by key

string show(const Fields& m) {
    string out = "{";
    for (auto it = m.begin(); it != m.end(); ++it) out += (it == m.begin() ? "" : ", ") + it->first + "=" + it->second;
    return out + "}";
}

class UserRepository {                                  // the new interface
public:
    virtual ~UserRepository() = default;
    virtual optional<User> find(long long id) const = 0;
    virtual void put(const User& u) = 0;
};

class LegacyUserStore {                                 // the old interface
public:
    virtual ~LegacyUserStore() = default;
    virtual Fields load(int id) const = 0;
    virtual void save(int id, const Fields& fields) = 0;
};

class InMemoryUserRepository : public UserRepository {
    unordered_map<long long, User> rows_;
public:
    optional<User> find(long long id) const override {
        auto it = rows_.find(id);
        return it == rows_.end() ? nullopt : optional<User>(it->second);
    }
    void put(const User& u) override { rows_[u.id] = u; }
};

class LegacyStoreAdapter : public LegacyUserStore {
    UserRepository& repo_;
public:
    explicit LegacyStoreAdapter(UserRepository& repo) : repo_(repo) {}

    Fields load(int id) const override {
        Fields out;
        if (auto u = repo_.find(id)) {
            if (u->name) out["name"] = *u->name;
            if (u->email) out["email"] = *u->email;
        }
        return out;                                     // empty for a missing user
    }

    void save(int id, const Fields& fields) override {
        for (const auto& [k, v] : fields)
            if (k != "name" && k != "email") throw invalid_argument("unknown field " + k);
        User merged = repo_.find(id).value_or(User{id, nullopt, nullopt});
        if (auto it = fields.find("name"); it != fields.end()) merged.name = it->second;      // partial update merges
        if (auto it = fields.find("email"); it != fields.end()) merged.email = it->second;
        repo_.put(merged);
    }
};

int main() {
    InMemoryUserRepository repo;
    LegacyStoreAdapter legacy(repo);
    repo.put(User{7, "Asha", "a@x.com"});
    cout << show(legacy.load(7)) << "\\n";               // {email=a@x.com, name=Asha}
    legacy.save(8, {{"name", "Ben"}});
    cout << show(*repo.find(8)) << "\\n";                // User[id=8, name=Ben, email=null]
    cout << show(legacy.load(99)) << "\\n";              // {}: a missing user is an empty map
    legacy.save(8, {{"email", "b@x.com"}});             // partial update merges with what is stored
    cout << show(*repo.find(8)) << "\\n";                // User[id=8, name=Ben, email=b@x.com]
    try {
        legacy.save(9, {{"phone", "123"}});
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";                       // unknown field phone
    }
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;

sealed class User {
    public readonly long Id; public readonly string Name, Email;
    public User(long id, string name, string email) { Id = id; Name = name; Email = email; }
    public override string ToString() { return "User[id=" + Id + ", name=" + (Name ?? "null") + ", email=" + (Email ?? "null") + "]"; }
}

interface IUserRepository { User Find(long id); void Put(User u); }                                   // Find: null when absent
interface ILegacyUserStore { Dictionary<string, string> Load(int id); void Save(int id, Dictionary<string, string> fields); }

class InMemoryUserRepository : IUserRepository {
    private readonly ConcurrentDictionary<long, User> rows = new ConcurrentDictionary<long, User>();
    public User Find(long id) { User u; return rows.TryGetValue(id, out u) ? u : null; }
    public void Put(User u) { rows[u.Id] = u; }
}

class LegacyStoreAdapter : ILegacyUserStore {
    private static readonly HashSet<string> Fields = new HashSet<string> { "name", "email" };
    private readonly IUserRepository repo;
    public LegacyStoreAdapter(IUserRepository repo) { this.repo = repo; }

    public Dictionary<string, string> Load(int id) {
        Dictionary<string, string> m = new Dictionary<string, string>();
        User u = repo.Find(id);
        if (u != null) {
            if (u.Name != null) m["name"] = u.Name;
            if (u.Email != null) m["email"] = u.Email;
        }
        return m;
    }

    public void Save(int id, Dictionary<string, string> fields) {
        foreach (string k in fields.Keys)
            if (!Fields.Contains(k)) throw new ArgumentException("unknown field " + k);
        User old = repo.Find(id) ?? new User(id, null, null);
        string name, email;
        repo.Put(new User(id,
            fields.TryGetValue("name", out name) ? name : old.Name,
            fields.TryGetValue("email", out email) ? email : old.Email));      // partial update merges
    }
}

class Program {
    static string Show(Dictionary<string, string> m) {
        return "{" + string.Join(", ", m.OrderBy(kv => kv.Key, StringComparer.Ordinal).Select(kv => kv.Key + "=" + kv.Value)) + "}";
    }
    static void Main() {
        IUserRepository repo = new InMemoryUserRepository();
        ILegacyUserStore legacy = new LegacyStoreAdapter(repo);
        repo.Put(new User(7, "Asha", "a@x.com"));
        Console.WriteLine(Show(legacy.Load(7)));                   // {email=a@x.com, name=Asha}
        legacy.Save(8, new Dictionary<string, string> { { "name", "Ben" } });
        Console.WriteLine(repo.Find(8));                           // User[id=8, name=Ben, email=null]
        Console.WriteLine(Show(legacy.Load(99)));                  // {}: a missing user is an empty map
        legacy.Save(8, new Dictionary<string, string> { { "email", "b@x.com" } });   // partial update merges with what is stored
        Console.WriteLine(repo.Find(8));                           // User[id=8, name=Ben, email=b@x.com]
        try { legacy.Save(9, new Dictionary<string, string> { { "phone", "123" } }); }
        catch (ArgumentException e) { Console.WriteLine(e.Message); }   // unknown field phone
    }
}` }
      ],
      complexity: `<p>O(1) per call plus O(fields) conversion. One source of truth, so no sync job.</p>`,
      followUps: ['Some legacy callers write fields the new model lacks ("fax") — store them, reject them, or log and drop?', 'How do you measure when it is safe to delete the adapter?']
    }
  });
  /* =====================================================================
     PRACTICE — HARD
     ===================================================================== */
  practice.push({
    title: 'Thread-Safe Lazy-Loading Entity Proxy (Mini ORM)',
    level: 'Hard', tags: ['proxy', 'lazy loading', 'concurrency'], companies: ['Oracle', 'Red Hat', 'Amazon'],
    statement: `<p>An <code>Order</code> references a <code>Customer</code>. Loading a customer costs one database query. Build a mini-ORM where <code>order.customer()</code> returns a <b>virtual proxy</b> that knows only the id; the query runs on the first call of any other method, exactly once even if 50 threads call at the same time. <code>id()</code> must never trigger a load. Proxies and real customers with the same id must be <code>equals</code>.</p>`,
    constraints: `<p>Up to 10<sup>4</sup> orders loaded per request; most screens never touch customer details. Loader may throw — the next call must retry (do not cache failures). Count queries so tests can assert them.</p>`,
    example: `<p>Load 3 orders for 2 customers. Render only order ids → ${H.c('g', '0 customer queries')}. Then 50 threads call <code>customer().name()</code> on the same proxy → ${H.c('g', 'exactly 1 query')}. Eager loading would have run ${H.c('r', '2–3 queries up front')} for nothing.</p>`,
    brute: { why: `<p>(1) Eager loading: every order fetch also loads its customer — wasted queries when the screen never shows customer data. (2) Naive lazy field: <code>if (real == null) real = load()</code> without synchronisation — two threads both see null and both query (double load), and without a memory barrier (<code>volatile</code> in Java) a thread may see a half-constructed object.</p>`, code: { lang: 'java', code: `class Customer { final long id; final String name; Customer(long id, String name) { this.id = id; this.name = name; } }
class NaiveLazyCustomer {
    private final long id; private Customer real;           // not volatile, not synchronized
    NaiveLazyCustomer(long id) { this.id = id; }
    String name() {
        if (real == null) real = new Customer(id, "loaded-" + id);   // race: may load twice
        return real.name;
    }
}`, alt: [
              { lang: 'python', code: `
class Customer:
    def __init__(self, id, name): self.id, self.name = id, name

class NaiveLazyCustomer:
    def __init__(self, id):
        self._id = id
        self._real = None           # not locked
    def name(self):
        if self._real is None: self._real = Customer(self._id, f"loaded-{self._id}")   # race: may load twice
        return self._real.name` },
              { lang: 'ts', code: `
class Customer { constructor(readonly id: number, readonly name: string) {} }
class NaiveLazyCustomer {
    private real: Customer | null = null;           // two async callers can both see null
    constructor(private readonly id: number) {}
    name(): string {
        if (this.real === null) this.real = new Customer(this.id, "loaded-" + this.id);   // race: may load twice
        return this.real.name;
    }
}` },
              { lang: 'cpp', code: `
struct Customer { long long id; string name; Customer(long long id, string name) : id(id), name(name) { } };
class NaiveLazyCustomer {
    long long id; Customer* real = nullptr;           // not atomic, not locked
public:
    NaiveLazyCustomer(long long id) : id(id) { }
    string name() {
        if (real == nullptr) real = new Customer(id, "loaded-" + to_string(id));   // race: may load twice
        return real->name;
    }
};` },
  { lang: 'csharp', code: `
using System;

class Customer { public readonly long Id; public readonly string Name; public Customer(long id, string name) { Id = id; Name = name; } }
class NaiveLazyCustomer {
    private readonly long id; private Customer real;           // not volatile, not locked
    public NaiveLazyCustomer(long id) { this.id = id; }
    public string Name() {
        if (real == null) real = new Customer(id, "loaded-" + id);   // race: may load twice
        return real.Name;
    }
}` }
            ] } },
    mcq: { q: 'Why must the proxy\'s id() NOT trigger a load?', options: ['Ids are secret', 'The proxy already knows the id; loading would defeat lazy loading for common operations like equals, hashing and building links', 'The language forbids it', 'Because ids are mutable'], answer: 1, explain: 'Many operations need only the id (map keys, equality, URLs). Loading on id() would turn every such use into a database query.' },
    hints: [`<p>Hint 1: <code>interface Customer { long id(); String name(); String email(); }</code> implemented by <code>RealCustomer</code> (record) and <code>CustomerProxy</code>.</p>`, `<p>Hint 2: Double-checked locking: a <code>volatile RealCustomer real</code> in Java (a lock plus a field in Python, <code>std::call_once</code> in C++); check without lock, then lock, check again, load, assign.</p>`, `<p>Hint 3: If the loader throws, the field stays null so the next call retries. Implement <code>equals/hashCode</code> on <code>id()</code> only, comparing against the <code>Customer</code> interface (not <code>getClass()</code>), so proxies and real objects compare equal.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "1 2 3 | queries so far = 0\ncustomer id 11, queries = 0\nCustomer#10(not loaded)\nqueries after 50 threads = 1\ntrue\ntrue\nfirst call failed: db down\ncust-99\nqueries = 2\n" }] },
    solution: {
      approach: `<p><code>CustomerProxy</code> holds the id and a loader function. <code>id()</code> returns immediately. Every other method calls <code>target()</code>, which uses double-checked locking on a <code>volatile</code> field (Java; a lock in Python, <code>std::call_once</code> in C++) to load exactly once; a loader exception propagates and leaves the field null so the next call retries. Equality is id-based against the interface. The repository counts queries for tests.</p>`,
      code: `interface Customer { long id(); String name(); String email(); }

record RealCustomer(long id, String name, String email) implements Customer {
    // equality by id only, in BOTH directions, so proxy.equals(real) and real.equals(proxy) agree
    @Override public boolean equals(Object o) { return o instanceof Customer c && c.id() == id; }
    @Override public int hashCode() { return Long.hashCode(id); }
}

class CustomerRepository {
    final AtomicInteger queries = new AtomicInteger();
    RealCustomer load(long id) {                            // pretend: SELECT * FROM customer WHERE id = ?
        queries.incrementAndGet();
        return new RealCustomer(id, "cust-" + id, id + "@shop.com");
    }
}

final class CustomerProxy implements Customer {
    private final long id;
    private final java.util.function.LongFunction<RealCustomer> loader;
    private volatile RealCustomer real;

    CustomerProxy(long id, java.util.function.LongFunction<RealCustomer> loader) { this.id = id; this.loader = loader; }

    private RealCustomer target() {
        RealCustomer r = real;                  // one volatile read on the fast path
        if (r == null) {
            synchronized (this) {
                r = real;
                if (r == null) {
                    r = loader.apply(id);       // may throw: field stays null -> retry later
                    real = r;
                }
            }
        }
        return r;
    }

    public long id() { return id; }             // never loads
    public String name() { return target().name(); }
    public String email() { return target().email(); }

    @Override public boolean equals(Object o) { return o instanceof Customer c && c.id() == id; }
    @Override public int hashCode() { return Long.hashCode(id); }
    @Override public String toString() { return real == null ? "Customer#" + id + "(not loaded)" : real.toString(); }
}

record Order(long id, Customer customer) {}

class OrmDemo {
    public static void main(String[] args) throws Exception {
        CustomerRepository repo = new CustomerRepository();
        Map<Long, Customer> identityMap = new HashMap<>();   // one proxy per customer id
        List<Order> orders = new ArrayList<>();
        long[][] rows = {{1, 10}, {2, 10}, {3, 11}};          // (orderId, customerId)
        for (long[] r : rows)
            orders.add(new Order(r[0], identityMap.computeIfAbsent(r[1], cid -> new CustomerProxy(cid, repo::load))));

        orders.forEach(o -> System.out.print(o.id() + " "));
        System.out.println("| queries so far = " + repo.queries.get());          // 0
        Customer third = orders.get(2).customer();
        System.out.println("customer id " + third.id() + ", queries = " + repo.queries.get());   // id() never loads

        Customer shared = orders.get(0).customer();
        System.out.println(shared);                                               // Customer#10(not loaded)
        ExecutorService pool = Executors.newFixedThreadPool(8);
        List<Future<String>> fs = new ArrayList<>();
        for (int i = 0; i < 50; i++) fs.add(pool.submit(shared::name));
        for (Future<String> f : fs) f.get();
        pool.shutdown();
        System.out.println("queries after 50 threads = " + repo.queries.get());  // 1
        System.out.println(shared.equals(new RealCustomer(10, "x", "y")));       // true
        System.out.println(new RealCustomer(10, "x", "y").equals(shared));       // true: equality is symmetric

        int[] attempts = {0};
        Customer flaky = new CustomerProxy(99, cid -> {
            if (attempts[0]++ == 0) throw new IllegalStateException("db down");   // first load fails
            return repo.load(cid);
        });
        try { flaky.name(); }
        catch (IllegalStateException e) { System.out.println("first call failed: " + e.getMessage()); }
        System.out.println(flaky.name());                                         // cust-99: the failure was not cached
        System.out.println("queries = " + repo.queries.get());                    // 2
    }
}`,
      alt: [
        { lang: 'python', code: `import threading
from abc import ABC, abstractmethod
from concurrent.futures import ThreadPoolExecutor
from typing import Callable, Optional


class Customer(ABC):
    @abstractmethod
    def id(self) -> int: ...

    @abstractmethod
    def name(self) -> str: ...

    @abstractmethod
    def email(self) -> str: ...

    # equality by id only, in BOTH directions, so proxy == real and real == proxy agree
    def __eq__(self, other: object) -> bool:
        return isinstance(other, Customer) and other.id() == self.id()

    def __hash__(self) -> int:
        return hash(self.id())


class RealCustomer(Customer):
    def __init__(self, id_: int, name: str, email: str) -> None:
        self._id, self._name, self._email = id_, name, email

    def id(self) -> int:
        return self._id

    def name(self) -> str:
        return self._name

    def email(self) -> str:
        return self._email

    def __str__(self) -> str:
        return f"RealCustomer[id={self._id}, name={self._name}, email={self._email}]"


class CustomerRepository:
    def __init__(self) -> None:
        self.queries = 0
        self._lock = threading.Lock()

    def load(self, id_: int) -> RealCustomer:  # pretend: SELECT * FROM customer WHERE id = ?
        with self._lock:
            self.queries += 1
        return RealCustomer(id_, f"cust-{id_}", f"{id_}@shop.com")


class CustomerProxy(Customer):  # virtual proxy: knows only the id until someone needs more
    def __init__(self, id_: int, loader: Callable[[int], RealCustomer]) -> None:
        self._id = id_
        self._loader = loader
        self._real: Optional[RealCustomer] = None
        self._lock = threading.Lock()

    def _target(self) -> RealCustomer:
        real = self._real  # fast path: no lock once loaded
        if real is None:
            with self._lock:
                if self._real is None:
                    self._real = self._loader(self._id)  # may raise: field stays None -> retry later
                real = self._real
        return real

    def id(self) -> int:  # never loads
        return self._id

    def name(self) -> str:
        return self._target().name()

    def email(self) -> str:
        return self._target().email()

    def __str__(self) -> str:
        return f"Customer#{self._id}(not loaded)" if self._real is None else str(self._real)


class Order:
    def __init__(self, id_: int, customer: Customer) -> None:
        self.id = id_
        self.customer = customer


if __name__ == "__main__":
    repo = CustomerRepository()
    identity_map: dict[int, Customer] = {}  # one proxy per customer id
    orders: list[Order] = []
    for order_id, customer_id in [(1, 10), (2, 10), (3, 11)]:
        if customer_id not in identity_map:
            identity_map[customer_id] = CustomerProxy(customer_id, repo.load)
        orders.append(Order(order_id, identity_map[customer_id]))

    print(" ".join(str(o.id) for o in orders), f"| queries so far = {repo.queries}")  # 0
    third = orders[2].customer
    print(f"customer id {third.id()}, queries = {repo.queries}")  # id() never loads

    shared = orders[0].customer
    print(shared)  # Customer#10(not loaded)
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(shared.name) for _ in range(50)]
        for f in futures:
            f.result()
    print(f"queries after 50 threads = {repo.queries}")  # 1
    print(str(shared == RealCustomer(10, "x", "y")).lower())  # true
    print(str(RealCustomer(10, "x", "y") == shared).lower())  # true: equality is symmetric

    attempts = 0

    def flaky_loader(cid: int) -> RealCustomer:
        global attempts
        attempts += 1
        if attempts == 1:
            raise RuntimeError("db down")  # first load fails
        return repo.load(cid)

    flaky = CustomerProxy(99, flaky_loader)
    try:
        flaky.name()
    except RuntimeError as e:
        print(f"first call failed: {e}")
    print(flaky.name())  # cust-99: the failure was not cached
    print(f"queries = {repo.queries}")  # 2` },
        { lang: 'ts', code: `interface Customer {
  id(): number;
  name(): string;
  email(): string;
  equals(other: Customer): boolean;
}

class RealCustomer implements Customer {
  constructor(private readonly _id: number, private readonly _name: string, private readonly _email: string) {}
  id(): number { return this._id; }
  name(): string { return this._name; }
  email(): string { return this._email; }
  // equality by id only, in BOTH directions, so proxy.equals(real) and real.equals(proxy) agree
  equals(other: Customer): boolean { return other.id() === this._id; }
  toString(): string { return \`RealCustomer[id=\${this._id}, name=\${this._name}, email=\${this._email}]\`; }
}

class CustomerRepository {
  queries = 0;

  load(id: number): RealCustomer { // pretend: SELECT * FROM customer WHERE id = ?
    this.queries++;
    return new RealCustomer(id, \`cust-\${id}\`, \`\${id}@shop.com\`);
  }
}

class CustomerProxy implements Customer { // virtual proxy: knows only the id until someone needs more
  private real: RealCustomer | undefined;

  constructor(private readonly _id: number, private readonly loader: (id: number) => RealCustomer) {}

  // JS runs one thread, so there is no race here; with an async loader you would cache the Promise instead
  private target(): RealCustomer {
    this.real ??= this.loader(this._id); // may throw: field stays undefined -> retry later
    return this.real;
  }

  id(): number { return this._id; } // never loads
  name(): string { return this.target().name(); }
  email(): string { return this.target().email(); }
  equals(other: Customer): boolean { return other.id() === this._id; }
  toString(): string { return this.real === undefined ? \`Customer#\${this._id}(not loaded)\` : this.real.toString(); }
}

interface Order {
  readonly id: number;
  readonly customer: Customer;
}

const repo = new CustomerRepository();
const identityMap = new Map<number, Customer>(); // one proxy per customer id
const orders: Order[] = [];
for (const [orderId, customerId] of [[1, 10], [2, 10], [3, 11]]) {
  let c = identityMap.get(customerId);
  if (c === undefined) {
    c = new CustomerProxy(customerId, (id) => repo.load(id));
    identityMap.set(customerId, c);
  }
  orders.push({ id: orderId, customer: c });
}

console.log(\`\${orders.map((o) => o.id).join(" ")} | queries so far = \${repo.queries}\`); // 0
const third = orders[2].customer;
console.log(\`customer id \${third.id()}, queries = \${repo.queries}\`); // id() never loads

const shared = orders[0].customer;
console.log(String(shared)); // Customer#10(not loaded)
for (let i = 0; i < 50; i++) shared.name(); // 50 callers, one load
console.log(\`queries after 50 threads = \${repo.queries}\`); // 1
console.log(shared.equals(new RealCustomer(10, "x", "y"))); // true
console.log(new RealCustomer(10, "x", "y").equals(shared)); // true: equality is symmetric

let attempts = 0;
const flaky = new CustomerProxy(99, (id) => {
  if (attempts++ === 0) throw new Error("db down"); // first load fails
  return repo.load(id);
});
try {
  flaky.name();
} catch (e) {
  console.log(\`first call failed: \${(e as Error).message}\`);
}
console.log(flaky.name()); // cust-99: the failure was not cached
console.log(\`queries = \${repo.queries}\`); // 2` },
        { lang: 'cpp', code: `class Customer {
public:
    virtual ~Customer() = default;
    virtual long long id() const = 0;
    virtual string name() const = 0;
    virtual string email() const = 0;
};

// equality by id only, for any pair of Customers, so a == b and b == a always agree
bool operator==(const Customer& a, const Customer& b) { return a.id() == b.id(); }

class RealCustomer : public Customer {
    long long id_;
    string name_, email_;
public:
    RealCustomer(long long id, string name, string email) : id_(id), name_(std::move(name)), email_(std::move(email)) {}
    long long id() const override { return id_; }
    string name() const override { return name_; }
    string email() const override { return email_; }
};

class CustomerRepository {
public:
    atomic<int> queries{0};
    unique_ptr<RealCustomer> load(long long id) {       // pretend: SELECT * FROM customer WHERE id = ?
        queries++;
        return make_unique<RealCustomer>(id, "cust-" + to_string(id), to_string(id) + "@shop.com");
    }
};

class CustomerProxy : public Customer {                 // virtual proxy: knows only the id until someone needs more
    long long id_;
    function<unique_ptr<RealCustomer>(long long)> loader_;
    mutable once_flag once_;                            // call_once: runs the loader once, retries if it throws
    mutable unique_ptr<RealCustomer> real_;
    mutable atomic<bool> loaded_{false};

    const RealCustomer& target() const {
        call_once(once_, [this] {
            real_ = loader_(id_);                       // may throw: the flag stays unset -> retry later
            loaded_ = true;
        });
        return *real_;
    }
public:
    CustomerProxy(long long id, function<unique_ptr<RealCustomer>(long long)> loader) : id_(id), loader_(std::move(loader)) {}
    long long id() const override { return id_; }       // never loads
    string name() const override { return target().name(); }
    string email() const override { return target().email(); }
    string describe() const { return loaded_ ? "Customer#" + to_string(id_) + "(loaded)" : "Customer#" + to_string(id_) + "(not loaded)"; }
};

struct Order {
    long long id;
    shared_ptr<Customer> customer;
};

int main() {
    CustomerRepository repo;
    map<long long, shared_ptr<CustomerProxy>> identityMap;           // one proxy per customer id
    vector<Order> orders;
    for (auto [orderId, customerId] : vector<pair<long long, long long>>{{1, 10}, {2, 10}, {3, 11}}) {
        auto& slot = identityMap[customerId];
        if (!slot) slot = make_shared<CustomerProxy>(customerId, [&repo](long long id) { return repo.load(id); });
        orders.push_back({orderId, slot});
    }

    for (const Order& o : orders) cout << o.id << " ";
    cout << "| queries so far = " << repo.queries << "\\n";            // 0
    cout << "customer id " << orders[2].customer->id() << ", queries = " << repo.queries << "\\n";   // id() never loads

    auto shared = identityMap[10];
    cout << shared->describe() << "\\n";                              // Customer#10(not loaded)
    vector<thread> pool;
    for (int i = 0; i < 50; i++) pool.emplace_back([&shared] { shared->name(); });
    for (thread& t : pool) t.join();
    cout << "queries after 50 threads = " << repo.queries << "\\n";   // 1
    RealCustomer real(10, "x", "y");
    cout << boolalpha << (*shared == real) << "\\n";                  // true
    cout << (real == *shared) << "\\n";                               // true: equality is symmetric

    int attempts = 0;
    CustomerProxy flaky(99, [&](long long id) -> unique_ptr<RealCustomer> {
        if (attempts++ == 0) throw runtime_error("db down");          // first load fails
        return repo.load(id);
    });
    try {
        flaky.name();
    } catch (const runtime_error& e) {
        cout << "first call failed: " << e.what() << "\\n";
    }
    cout << flaky.name() << "\\n";                                    // cust-99: the failure was not cached
    cout << "queries = " << repo.queries << "\\n";                    // 2
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

interface ICustomer { long Id { get; } string Name { get; } string Email { get; } }

sealed class RealCustomer : ICustomer {
    private readonly long id; private readonly string name, email;
    public RealCustomer(long id, string name, string email) { this.id = id; this.name = name; this.email = email; }
    public long Id { get { return id; } }
    public string Name { get { return name; } }
    public string Email { get { return email; } }
    // equality by id only, in BOTH directions, so proxy.Equals(real) and real.Equals(proxy) agree
    public override bool Equals(object o) { ICustomer c = o as ICustomer; return c != null && c.Id == id; }
    public override int GetHashCode() { return id.GetHashCode(); }
    public override string ToString() { return "RealCustomer[id=" + id + ", name=" + name + ", email=" + email + "]"; }
}

class CustomerRepository {
    private int queries;
    public int Queries { get { return queries; } }
    public RealCustomer Load(long id) {                       // pretend: SELECT * FROM customer WHERE id = ?
        Interlocked.Increment(ref queries);
        return new RealCustomer(id, "cust-" + id, id + "@shop.com");
    }
}

sealed class CustomerProxy : ICustomer {
    private readonly long id;
    private readonly Func<long, RealCustomer> loader;
    private volatile RealCustomer real;
    private readonly object gate = new object();

    public CustomerProxy(long id, Func<long, RealCustomer> loader) { this.id = id; this.loader = loader; }

    private RealCustomer Target() {
        RealCustomer r = real;                  // one volatile read on the fast path
        if (r == null) {
            lock (gate) {
                r = real;
                if (r == null) {
                    r = loader(id);             // may throw: field stays null -> retry later
                    real = r;
                }
            }
        }
        return r;
    }

    public long Id { get { return id; } }       // never loads
    public string Name { get { return Target().Name; } }
    public string Email { get { return Target().Email; } }

    public override bool Equals(object o) { ICustomer c = o as ICustomer; return c != null && c.Id == id; }
    public override int GetHashCode() { return id.GetHashCode(); }
    public override string ToString() { return real == null ? "Customer#" + id + "(not loaded)" : real.ToString(); }
}

sealed class Order {
    public readonly long Id; public readonly ICustomer Customer;
    public Order(long id, ICustomer customer) { Id = id; Customer = customer; }
}

class Program {
    static void Main() {
        CustomerRepository repo = new CustomerRepository();
        Dictionary<long, ICustomer> identityMap = new Dictionary<long, ICustomer>();   // one proxy per customer id
        List<Order> orders = new List<Order>();
        long[][] rows = { new long[] { 1, 10 }, new long[] { 2, 10 }, new long[] { 3, 11 } };   // (orderId, customerId)
        foreach (long[] r in rows) {
            ICustomer c;
            if (!identityMap.TryGetValue(r[1], out c)) { c = new CustomerProxy(r[1], repo.Load); identityMap[r[1]] = c; }
            orders.Add(new Order(r[0], c));
        }

        orders.ForEach(o => Console.Write(o.Id + " "));
        Console.WriteLine("| queries so far = " + repo.Queries);          // 0
        ICustomer third = orders[2].Customer;
        Console.WriteLine("customer id " + third.Id + ", queries = " + repo.Queries);   // Id never loads

        ICustomer shared = orders[0].Customer;
        Console.WriteLine(shared);                                          // Customer#10(not loaded)
        List<Task<string>> fs = new List<Task<string>>();
        for (int i = 0; i < 50; i++) fs.Add(Task.Run(() => shared.Name));
        Task.WaitAll(fs.ToArray());
        Console.WriteLine("queries after 50 threads = " + repo.Queries);  // 1
        Console.WriteLine(shared.Equals(new RealCustomer(10, "x", "y")).ToString().ToLower());       // true
        Console.WriteLine(new RealCustomer(10, "x", "y").Equals(shared).ToString().ToLower());       // true: equality is symmetric

        int attempts = 0;
        ICustomer flaky = new CustomerProxy(99, cid => {
            if (attempts++ == 0) throw new InvalidOperationException("db down");   // first load fails
            return repo.Load(cid);
        });
        try { string n = flaky.Name; }
        catch (InvalidOperationException e) { Console.WriteLine("first call failed: " + e.Message); }
        Console.WriteLine(flaky.Name);                                      // cust-99: the failure was not cached
        Console.WriteLine("queries = " + repo.Queries);                     // 2
    }
}` }
      ],
      complexity: `<p>First access: one query + lock; later accesses: one cheap field read, O(1). Memory: one small proxy per distinct customer (identity map).</p>`,
      followUps: ['Rendering 1 000 orders with customer names fires 1 000 queries (N+1). Add batch loading: the first proxy touched loads all pending ids in one IN (...) query.', 'What happens if the proxy is used after the database session is closed? Design the error.', 'Replace double-checked locking with a holder or a memoising Supplier — compare trade-offs.']
    }
  });

  practice.push({
    title: 'Composite File System with mkdir -p, Move and Cached Sizes',
    level: 'Hard', tags: ['composite', 'tree', 'caching'], companies: ['Google', 'Dropbox', 'Microsoft'],
    statement: `<p>Implement an in-memory file system: <code>mkdirs(path)</code> creates all missing folders; <code>write(path, bytes)</code> creates or replaces a file (parents must exist); <code>size(path)</code> returns a file's size or a folder's total; <code>move(src, dstFolder)</code> moves a file or folder; <code>find(path, suffix)</code> lists file paths under a folder ending with suffix. <code>size()</code> on the root is called very often, so it must be O(1).</p>`,
    constraints: `<p>Paths like "/a/b/c.txt". Up to 10<sup>5</sup> nodes, depth ≤ 100. Moving a folder into itself or its descendant → <code>IllegalArgumentException</code>. Name clash at destination → <code>IllegalStateException</code>.</p>`,
    example: `<p>mkdirs("/docs/old"); write("/docs/a.txt", 5); write("/docs/old/b.txt", 7) → size("/") = ${H.c('g', '12')}. move("/docs/old", "/") → size("/docs") = ${H.c('g', '5')}, size("/old") = 7, root still 12. move("/docs", "/docs") → ${H.c('r', 'IllegalArgumentException')}.</p>`,
    brute: { why: `<p>Store a flat <code>Map&lt;String path, Long size&gt;</code>. Folder size = scan every key with that prefix: O(N) per <code>size()</code> call. Moving a folder means rewriting every descendant key (O(N)) and prefix bugs appear ("/doc" matches "/docs/..."). There is no real notion of a folder, so empty folders cannot exist.</p>`, code: { lang: 'java', code: `class FlatFs {
    final Map<String, Long> files = new HashMap<>();
    long size(String path) {
        long total = 0;
        for (var e : files.entrySet()) if (e.getKey().startsWith(path)) total += e.getValue();  // O(N), and "/doc" matches "/docs"
        return total;
    }
    void move(String src, String dst) {
        Map<String, Long> moved = new HashMap<>();
        files.entrySet().removeIf(e -> {
            if (!e.getKey().startsWith(src)) return false;
            moved.put(dst + e.getKey().substring(src.lastIndexOf('/')), e.getValue());
            return true;
        });
        files.putAll(moved);
    }
}`, alt: [
              { lang: 'python', code: `
class FlatFs:
    def __init__(self): self.files = {}   # path -> size
    def size(self, path):
        total = 0
        for k, v in self.files.items():
            if k.startswith(path): total += v   # O(N), and "/doc" matches "/docs"
        return total
    def move(self, src, dst):
        moved = {}
        for k in list(self.files):
            if k.startswith(src):
                moved[dst + k[src.rfind("/"):]] = self.files.pop(k)
        self.files.update(moved)` },
              { lang: 'ts', code: `
class FlatFs {
    readonly files = new Map<string, number>();
    size(path: string): number {
        let total = 0;
        for (const [k, v] of this.files) if (k.startsWith(path)) total += v;  // O(N), and "/doc" matches "/docs"
        return total;
    }
    move(src: string, dst: string): void {
        const moved = new Map<string, number>();
        for (const [k, v] of [...this.files]) {
            if (!k.startsWith(src)) continue;
            moved.set(dst + k.substring(src.lastIndexOf("/")), v);
            this.files.delete(k);
        }
        for (const [k, v] of moved) this.files.set(k, v);
    }
}` },
              { lang: 'cpp', code: `
class FlatFs {
public:
    unordered_map<string, long long> files;
    long long size(const string& path) {
        long long total = 0;
        for (auto& [k, v] : files) if (k.rfind(path, 0) == 0) total += v;  // O(N), and "/doc" matches "/docs"
        return total;
    }
    void move(const string& src, const string& dst) {
        unordered_map<string, long long> moved;
        for (auto it = files.begin(); it != files.end(); ) {
            if (it->first.rfind(src, 0) != 0) { ++it; continue; }
            moved[dst + it->first.substr(src.rfind('/'))] = it->second;
            it = files.erase(it);
        }
        files.insert(moved.begin(), moved.end());
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

class FlatFs {
    public readonly Dictionary<string, long> Files = new Dictionary<string, long>();
    public long Size(string path) {
        long total = 0;
        foreach (var e in Files) if (e.Key.StartsWith(path)) total += e.Value;  // O(N), and "/doc" matches "/docs"
        return total;
    }
    public void Move(string src, string dst) {
        Dictionary<string, long> moved = new Dictionary<string, long>();
        foreach (string k in Files.Keys.Where(k => k.StartsWith(src)).ToList()) {
            moved[dst + k.Substring(src.LastIndexOf('/'))] = Files[k];
            Files.Remove(k);
        }
        foreach (var kv in moved) Files[kv.Key] = kv.Value;
    }
}` }
            ] } },
    mcq: { q: 'How can a composite keep size() O(1) while files change?', options: ['Recompute the whole tree on each call', 'Each folder caches its total; a change of Δ bytes is propagated up through parent pointers (O(depth))', 'Store sizes only in the root', 'Use a Flyweight for sizes'], answer: 1, explain: 'Cached aggregates plus upward propagation make reads O(1) and writes/moves O(depth).' },
    hints: [`<p>Hint 1: <code>abstract class FsNode { String name; Folder parent; abstract long size(); }</code>; <code>FileNode</code> leaf and <code>Folder</code> composite with a <code>TreeMap&lt;String, FsNode&gt;</code> of children.</p>`, `<p>Hint 2: Folder caches <code>total</code>. Helper <code>bubble(folder, delta)</code> walks parents adding delta. Write: delta = new − old size. Move: bubble(−size) from old parent, bubble(+size) at new parent.</p>`, `<p>Hint 3: Cycle check for move: walk up from the destination folder to the root; if you meet the source node, reject. Resolve paths by splitting on "/" and walking children; <code>find</code> is a DFS that builds paths.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "12\n5 7 12\n[/docs/a.txt, /old/b.txt]\nblocked: cannot move a folder into itself\n9 16\nname clash\n17\nmissing: /nope\nfile path needed\n" }] },
    solution: {
      approach: `<p>Composite tree with parent pointers. <code>FileNode</code> (leaf) stores bytes; <code>Folder</code> (composite) stores sorted children and a cached <code>total</code>. Every mutation computes a size delta and bubbles it to the root in O(depth), so <code>size()</code> on any node is O(1). Move = detach + attach with two bubbles, after a cycle check that walks up from the destination. <code>find</code> is a DFS over the composite.</p>`,
      code: `abstract class FsNode {
    final String name; Folder parent;
    FsNode(String name) { this.name = name; }
    abstract long size();
    String path() { return parent == null ? "" : parent.path() + "/" + name; }
}

final class FileNode extends FsNode {
    long bytes;
    FileNode(String name, long bytes) { super(name); this.bytes = bytes; }
    long size() { return bytes; }
}

final class Folder extends FsNode {
    final TreeMap<String, FsNode> children = new TreeMap<>();
    long total;                                          // cached aggregate
    Folder(String name) { super(name); }
    long size() { return total; }
}

class FileSystem {
    private final Folder root = new Folder("");

    private static void bubble(Folder f, long delta) { for (Folder x = f; x != null; x = x.parent) x.total += delta; }

    private static String[] parts(String path) {
        if (!path.startsWith("/")) throw new IllegalArgumentException("absolute path needed: " + path);
        return Arrays.stream(path.split("/")).filter(s -> !s.isEmpty()).toArray(String[]::new);
    }

    private FsNode resolve(String path) {
        FsNode cur = root;
        for (String p : parts(path)) {
            if (!(cur instanceof Folder f) || !f.children.containsKey(p)) throw new NoSuchElementException(path);
            cur = f.children.get(p);
        }
        return cur;
    }

    private void attach(Folder parent, FsNode child) {
        if (parent.children.containsKey(child.name)) throw new IllegalStateException("exists: " + child.name);
        parent.children.put(child.name, child);
        child.parent = parent;
        bubble(parent, child.size());
    }

    void mkdirs(String path) {
        Folder cur = root;
        for (String p : parts(path)) {
            FsNode next = cur.children.get(p);
            if (next == null) { next = new Folder(p); attach(cur, next); }
            if (!(next instanceof Folder f)) throw new IllegalStateException(p + " is a file");
            cur = f;
        }
    }

    void write(String path, long bytes) {
        String[] ps = parts(path);
        if (ps.length == 0) throw new IllegalArgumentException("file path needed");   // "/" is the root, not a file
        String parentPath = "/" + String.join("/", Arrays.copyOf(ps, ps.length - 1));
        if (!(resolve(parentPath) instanceof Folder parent)) throw new IllegalStateException("parent is a file");
        String name = ps[ps.length - 1];
        FsNode existing = parent.children.get(name);
        if (existing instanceof FileNode f) { bubble(parent, bytes - f.bytes); f.bytes = bytes; }
        else if (existing == null) attach(parent, new FileNode(name, bytes));
        else throw new IllegalStateException(name + " is a folder");
    }

    long size(String path) { return resolve(path).size(); }

    void move(String src, String dstFolder) {
        FsNode node = resolve(src);
        if (!(resolve(dstFolder) instanceof Folder dst)) throw new IllegalArgumentException("destination must be a folder");
        if (node == root) throw new IllegalArgumentException("cannot move root");
        for (Folder x = dst; x != null; x = x.parent)          // cycle check
            if (x == node) throw new IllegalArgumentException("cannot move a folder into itself");
        if (dst.children.containsKey(node.name)) throw new IllegalStateException("name clash");
        Folder old = node.parent;
        old.children.remove(node.name);
        bubble(old, -node.size());
        attach(dst, node);
    }

    List<String> find(String folder, String suffix) {
        List<String> out = new ArrayList<>();
        Deque<FsNode> stack = new ArrayDeque<>(List.of(resolve(folder)));   // iterative: safe for deep trees
        while (!stack.isEmpty()) {
            FsNode n = stack.pop();
            if (n instanceof Folder f) f.children.values().forEach(stack::push);
            else if (n.name.endsWith(suffix)) out.add(n.path());
        }
        Collections.sort(out);
        return out;
    }

    public static void main(String[] args) {
        FileSystem fs = new FileSystem();
        fs.mkdirs("/docs/old");
        fs.write("/docs/a.txt", 5);
        fs.write("/docs/old/b.txt", 7);
        System.out.println(fs.size("/"));                      // 12
        fs.move("/docs/old", "/");
        System.out.println(fs.size("/docs") + " " + fs.size("/old") + " " + fs.size("/"));  // 5 7 12
        System.out.println(fs.find("/", ".txt"));              // [/docs/a.txt, /old/b.txt]
        try { fs.move("/docs", "/docs"); } catch (IllegalArgumentException e) { System.out.println("blocked: " + e.getMessage()); }

        fs.write("/docs/a.txt", 9);                            // replace: sizes bubble up by the difference
        System.out.println(fs.size("/docs") + " " + fs.size("/"));   // 9 16
        fs.mkdirs("/docs/old");
        fs.write("/docs/old/c.txt", 1);
        try { fs.move("/old", "/docs"); } catch (IllegalStateException e) { System.out.println(e.getMessage()); }  // name clash
        System.out.println(fs.size("/"));                      // 17: the failed move changed nothing
        try { fs.size("/nope"); } catch (NoSuchElementException e) { System.out.println("missing: " + e.getMessage()); }
        try { fs.write("/", 5); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
    }
}`,
      alt: [
        { lang: 'python', code: `from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional


class FsNode(ABC):
    def __init__(self, name: str) -> None:
        self.name = name
        self.parent: Optional[Folder] = None

    @abstractmethod
    def size(self) -> int: ...

    def path(self) -> str:
        return "" if self.parent is None else f"{self.parent.path()}/{self.name}"


class FileNode(FsNode):  # leaf
    def __init__(self, name: str, nbytes: int) -> None:
        super().__init__(name)
        self.nbytes = nbytes

    def size(self) -> int:
        return self.nbytes


class Folder(FsNode):  # composite
    def __init__(self, name: str) -> None:
        super().__init__(name)
        self.children: dict[str, FsNode] = {}
        self.total = 0  # cached aggregate

    def size(self) -> int:
        return self.total


class FileSystem:
    def __init__(self) -> None:
        self._root = Folder("")

    @staticmethod
    def _bubble(folder: Optional[Folder], delta: int) -> None:
        while folder is not None:
            folder.total += delta
            folder = folder.parent

    @staticmethod
    def _parts(path: str) -> list[str]:
        if not path.startswith("/"):
            raise ValueError(f"absolute path needed: {path}")
        return [p for p in path.split("/") if p]

    def _resolve(self, path: str) -> FsNode:
        cur: FsNode = self._root
        for p in self._parts(path):
            if not isinstance(cur, Folder) or p not in cur.children:
                raise FileNotFoundError(path)
            cur = cur.children[p]
        return cur

    def _attach(self, parent: Folder, child: FsNode) -> None:
        if child.name in parent.children:
            raise RuntimeError(f"exists: {child.name}")
        parent.children[child.name] = child
        child.parent = parent
        self._bubble(parent, child.size())

    def mkdirs(self, path: str) -> None:
        cur = self._root
        for p in self._parts(path):
            nxt = cur.children.get(p)
            if nxt is None:
                nxt = Folder(p)
                self._attach(cur, nxt)
            if not isinstance(nxt, Folder):
                raise RuntimeError(f"{p} is a file")
            cur = nxt

    def write(self, path: str, nbytes: int) -> None:
        ps = self._parts(path)
        if not ps:
            raise ValueError("file path needed")  # "/" is the root, not a file
        parent = self._resolve("/" + "/".join(ps[:-1]))
        if not isinstance(parent, Folder):
            raise RuntimeError("parent is a file")
        name = ps[-1]
        existing = parent.children.get(name)
        if isinstance(existing, FileNode):
            self._bubble(parent, nbytes - existing.nbytes)
            existing.nbytes = nbytes
        elif existing is None:
            self._attach(parent, FileNode(name, nbytes))
        else:
            raise RuntimeError(f"{name} is a folder")

    def size(self, path: str) -> int:
        return self._resolve(path).size()

    def move(self, src: str, dst_folder: str) -> None:
        node = self._resolve(src)
        dst = self._resolve(dst_folder)
        if not isinstance(dst, Folder):
            raise ValueError("destination must be a folder")
        if node is self._root:
            raise ValueError("cannot move root")
        x: Optional[Folder] = dst
        while x is not None:  # cycle check
            if x is node:
                raise ValueError("cannot move a folder into itself")
            x = x.parent
        if node.name in dst.children:
            raise RuntimeError("name clash")
        old = node.parent
        assert old is not None
        del old.children[node.name]
        self._bubble(old, -node.size())
        self._attach(dst, node)

    def find(self, folder: str, suffix: str) -> list[str]:
        out: list[str] = []
        stack = [self._resolve(folder)]  # iterative: safe for deep trees
        while stack:
            n = stack.pop()
            if isinstance(n, Folder):
                stack.extend(n.children.values())
            elif n.name.endswith(suffix):
                out.append(n.path())
        return sorted(out)


def show(items: list[str]) -> str:
    return "[" + ", ".join(items) + "]"


if __name__ == "__main__":
    fs = FileSystem()
    fs.mkdirs("/docs/old")
    fs.write("/docs/a.txt", 5)
    fs.write("/docs/old/b.txt", 7)
    print(fs.size("/"))  # 12
    fs.move("/docs/old", "/")
    print(fs.size("/docs"), fs.size("/old"), fs.size("/"))  # 5 7 12
    print(show(fs.find("/", ".txt")))  # [/docs/a.txt, /old/b.txt]
    try:
        fs.move("/docs", "/docs")
    except ValueError as e:
        print(f"blocked: {e}")

    fs.write("/docs/a.txt", 9)  # replace: sizes bubble up by the difference
    print(fs.size("/docs"), fs.size("/"))  # 9 16
    fs.mkdirs("/docs/old")
    fs.write("/docs/old/c.txt", 1)
    try:
        fs.move("/old", "/docs")
    except RuntimeError as e:
        print(e)  # name clash
    print(fs.size("/"))  # 17: the failed move changed nothing
    try:
        fs.size("/nope")
    except FileNotFoundError as e:
        print(f"missing: {e}")
    try:
        fs.write("/", 5)
    except ValueError as e:
        print(e)` },
        { lang: 'ts', code: `export {}; // makes this file a module, so FileSystem never clashes with the DOM type of that name

class NoSuchElementError extends Error {}
class IllegalStateError extends Error {}

abstract class FsNode {
  parent: Folder | null = null;

  constructor(readonly name: string) {}

  abstract size(): number;

  path(): string {
    return this.parent === null ? "" : \`\${this.parent.path()}/\${this.name}\`;
  }
}

class FileNode extends FsNode { // leaf
  constructor(name: string, public bytes: number) {
    super(name);
  }
  size(): number { return this.bytes; }
}

class Folder extends FsNode { // composite
  readonly children = new Map<string, FsNode>();
  total = 0; // cached aggregate

  size(): number { return this.total; }
}

class FileSystem {
  private readonly root = new Folder("");

  private static bubble(folder: Folder | null, delta: number): void {
    for (let x = folder; x !== null; x = x.parent) x.total += delta;
  }

  private static parts(path: string): string[] {
    if (!path.startsWith("/")) throw new Error(\`absolute path needed: \${path}\`);
    return path.split("/").filter((s) => s !== "");
  }

  private resolve(path: string): FsNode {
    let cur: FsNode = this.root;
    for (const p of FileSystem.parts(path)) {
      const next: FsNode | undefined = cur instanceof Folder ? cur.children.get(p) : undefined;
      if (next === undefined) throw new NoSuchElementError(path);
      cur = next;
    }
    return cur;
  }

  private attach(parent: Folder, child: FsNode): void {
    if (parent.children.has(child.name)) throw new IllegalStateError(\`exists: \${child.name}\`);
    parent.children.set(child.name, child);
    child.parent = parent;
    FileSystem.bubble(parent, child.size());
  }

  mkdirs(path: string): void {
    let cur = this.root;
    for (const p of FileSystem.parts(path)) {
      let next = cur.children.get(p);
      if (next === undefined) {
        next = new Folder(p);
        this.attach(cur, next);
      }
      if (!(next instanceof Folder)) throw new IllegalStateError(\`\${p} is a file\`);
      cur = next;
    }
  }

  write(path: string, bytes: number): void {
    const ps = FileSystem.parts(path);
    if (ps.length === 0) throw new Error("file path needed"); // "/" is the root, not a file
    const parent = this.resolve("/" + ps.slice(0, -1).join("/"));
    if (!(parent instanceof Folder)) throw new IllegalStateError("parent is a file");
    const name = ps[ps.length - 1];
    const existing = parent.children.get(name);
    if (existing instanceof FileNode) {
      FileSystem.bubble(parent, bytes - existing.bytes);
      existing.bytes = bytes;
    } else if (existing === undefined) {
      this.attach(parent, new FileNode(name, bytes));
    } else {
      throw new IllegalStateError(\`\${name} is a folder\`);
    }
  }

  size(path: string): number {
    return this.resolve(path).size();
  }

  move(src: string, dstFolder: string): void {
    const node = this.resolve(src);
    const dst = this.resolve(dstFolder);
    if (!(dst instanceof Folder)) throw new Error("destination must be a folder");
    if (node === this.root) throw new Error("cannot move root");
    for (let x: Folder | null = dst; x !== null; x = x.parent) { // cycle check
      if (x === node) throw new Error("cannot move a folder into itself");
    }
    if (dst.children.has(node.name)) throw new IllegalStateError("name clash");
    const old = node.parent!;
    old.children.delete(node.name);
    FileSystem.bubble(old, -node.size());
    this.attach(dst, node);
  }

  find(folder: string, suffix: string): string[] {
    const out: string[] = [];
    const stack: FsNode[] = [this.resolve(folder)]; // iterative: safe for deep trees
    while (stack.length > 0) {
      const n = stack.pop()!;
      if (n instanceof Folder) stack.push(...n.children.values());
      else if (n.name.endsWith(suffix)) out.push(n.path());
    }
    return out.sort();
  }
}

const show = (items: string[]): string => \`[\${items.join(", ")}]\`;

const fs = new FileSystem();
fs.mkdirs("/docs/old");
fs.write("/docs/a.txt", 5);
fs.write("/docs/old/b.txt", 7);
console.log(fs.size("/")); // 12
fs.move("/docs/old", "/");
console.log(\`\${fs.size("/docs")} \${fs.size("/old")} \${fs.size("/")}\`); // 5 7 12
console.log(show(fs.find("/", ".txt"))); // [/docs/a.txt, /old/b.txt]
try {
  fs.move("/docs", "/docs");
} catch (e) {
  console.log(\`blocked: \${(e as Error).message}\`);
}

fs.write("/docs/a.txt", 9); // replace: sizes bubble up by the difference
console.log(\`\${fs.size("/docs")} \${fs.size("/")}\`); // 9 16
fs.mkdirs("/docs/old");
fs.write("/docs/old/c.txt", 1);
try {
  fs.move("/old", "/docs");
} catch (e) {
  if (e instanceof IllegalStateError) console.log(e.message); // name clash
}
console.log(fs.size("/")); // 17: the failed move changed nothing
try {
  fs.size("/nope");
} catch (e) {
  if (e instanceof NoSuchElementError) console.log(\`missing: \${e.message}\`);
}
try {
  fs.write("/", 5);
} catch (e) {
  console.log((e as Error).message);
}` },
        { lang: 'cpp', code: `class Folder;

class FsNode {
public:
    const string name;
    Folder* parent = nullptr;                          // non-owning back link; the parent folder owns this node
    explicit FsNode(string n) : name(std::move(n)) {}
    virtual ~FsNode() = default;
    virtual long long size() const = 0;
    string path() const;
};

class FileNode final : public FsNode {                 // leaf
public:
    long long bytes;
    FileNode(string name, long long bytes) : FsNode(std::move(name)), bytes(bytes) {}
    long long size() const override { return bytes; }
};

class Folder final : public FsNode {                   // composite
public:
    map<string, unique_ptr<FsNode>> children;
    long long total = 0;                               // cached aggregate
    explicit Folder(string name) : FsNode(std::move(name)) {}
    long long size() const override { return total; }
};

string FsNode::path() const { return parent ? parent->path() + "/" + name : ""; }

class FileSystem {
    Folder root_{""};

    static void bubble(Folder* f, long long delta) { for (; f; f = f->parent) f->total += delta; }

    static vector<string> parts(const string& path) {
        if (path.empty() || path[0] != '/') throw invalid_argument("absolute path needed: " + path);
        vector<string> out;
        istringstream in(path);
        for (string p; getline(in, p, '/');) if (!p.empty()) out.push_back(p);
        return out;
    }

    FsNode& resolve(const string& path) {
        FsNode* cur = &root_;
        for (const string& p : parts(path)) {
            auto* f = dynamic_cast<Folder*>(cur);
            if (!f) throw out_of_range(path);              // a file has no children
            auto it = f->children.find(p);
            if (it == f->children.end()) throw out_of_range(path);
            cur = it->second.get();
        }
        return *cur;
    }

    void attach(Folder& parent, unique_ptr<FsNode> child) {
        string name = child->name;
        if (parent.children.count(name)) throw runtime_error("exists: " + name);
        child->parent = &parent;
        long long sz = child->size();
        parent.children[name] = std::move(child);
        bubble(&parent, sz);
    }

public:
    void mkdirs(const string& path) {
        Folder* cur = &root_;
        for (const string& p : parts(path)) {
            auto it = cur->children.find(p);
            if (it == cur->children.end()) {
                attach(*cur, make_unique<Folder>(p));
                it = cur->children.find(p);
            }
            cur = dynamic_cast<Folder*>(it->second.get());
            if (!cur) throw runtime_error(p + " is a file");
        }
    }

    void write(const string& path, long long bytes) {
        vector<string> ps = parts(path);
        if (ps.empty()) throw invalid_argument("file path needed");   // "/" is the root, not a file
        string parentPath = "/";
        for (size_t i = 0; i + 1 < ps.size(); i++) parentPath += (i ? "/" : "") + ps[i];
        auto* parent = dynamic_cast<Folder*>(&resolve(parentPath));
        if (!parent) throw runtime_error("parent is a file");
        const string& name = ps.back();
        auto it = parent->children.find(name);
        if (it == parent->children.end()) {
            attach(*parent, make_unique<FileNode>(name, bytes));
        } else if (auto* f = dynamic_cast<FileNode*>(it->second.get())) {
            bubble(parent, bytes - f->bytes);
            f->bytes = bytes;
        } else {
            throw runtime_error(name + " is a folder");
        }
    }

    long long size(const string& path) { return resolve(path).size(); }

    void move(const string& src, const string& dstFolder) {
        FsNode& node = resolve(src);
        auto* dst = dynamic_cast<Folder*>(&resolve(dstFolder));
        if (!dst) throw invalid_argument("destination must be a folder");
        if (&node == &root_) throw invalid_argument("cannot move root");
        for (Folder* x = dst; x; x = x->parent)        // cycle check
            if (x == &node) throw invalid_argument("cannot move a folder into itself");
        if (dst->children.count(node.name)) throw runtime_error("name clash");
        Folder* old = node.parent;
        auto it = old->children.find(node.name);
        unique_ptr<FsNode> owned = std::move(it->second);
        old->children.erase(it);
        bubble(old, -owned->size());
        attach(*dst, std::move(owned));
    }

    vector<string> find(const string& folder, const string& suffix) {
        vector<string> out;
        vector<FsNode*> stack{&resolve(folder)};       // iterative: safe for deep trees
        while (!stack.empty()) {
            FsNode* n = stack.back();
            stack.pop_back();
            if (auto* f = dynamic_cast<Folder*>(n)) {
                for (auto& [childName, child] : f->children) stack.push_back(child.get());
            } else if (n->name.size() >= suffix.size() && n->name.compare(n->name.size() - suffix.size(), suffix.size(), suffix) == 0) {
                out.push_back(n->path());
            }
        }
        sort(out.begin(), out.end());
        return out;
    }
};

string show(const vector<string>& items) {
    string out = "[";
    for (size_t i = 0; i < items.size(); i++) out += (i ? ", " : "") + items[i];
    return out + "]";
}

int main() {
    FileSystem fs;
    fs.mkdirs("/docs/old");
    fs.write("/docs/a.txt", 5);
    fs.write("/docs/old/b.txt", 7);
    cout << fs.size("/") << "\\n";                                              // 12
    fs.move("/docs/old", "/");
    cout << fs.size("/docs") << " " << fs.size("/old") << " " << fs.size("/") << "\\n";   // 5 7 12
    cout << show(fs.find("/", ".txt")) << "\\n";                                // [/docs/a.txt, /old/b.txt]
    try {
        fs.move("/docs", "/docs");
    } catch (const invalid_argument& e) {
        cout << "blocked: " << e.what() << "\\n";
    }

    fs.write("/docs/a.txt", 9);                                                // replace: sizes bubble up by the difference
    cout << fs.size("/docs") << " " << fs.size("/") << "\\n";                   // 9 16
    fs.mkdirs("/docs/old");
    fs.write("/docs/old/c.txt", 1);
    try {
        fs.move("/old", "/docs");
    } catch (const runtime_error& e) {
        cout << e.what() << "\\n";                                              // name clash
    }
    cout << fs.size("/") << "\\n";                                              // 17: the failed move changed nothing
    try {
        fs.size("/nope");
    } catch (const out_of_range& e) {
        cout << "missing: " << e.what() << "\\n";
    }
    try {
        fs.write("/", 5);
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";
    }
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;

abstract class FsNode {
    public readonly string Name; public Folder Parent;
    protected FsNode(string name) { Name = name; }
    public abstract long Size();
    public string Path() { return Parent == null ? "" : Parent.Path() + "/" + Name; }
}

sealed class FileNode : FsNode {
    public long Bytes;
    public FileNode(string name, long bytes) : base(name) { Bytes = bytes; }
    public override long Size() { return Bytes; }
}

sealed class Folder : FsNode {
    public readonly SortedDictionary<string, FsNode> Children = new SortedDictionary<string, FsNode>(StringComparer.Ordinal);
    public long Total;                                   // cached aggregate
    public Folder(string name) : base(name) { }
    public override long Size() { return Total; }
}

class FileSystem {
    private readonly Folder root = new Folder("");

    private static void Bubble(Folder f, long delta) { for (Folder x = f; x != null; x = x.Parent) x.Total += delta; }

    private static string[] Parts(string path) {
        if (!path.StartsWith("/")) throw new ArgumentException("absolute path needed: " + path);
        return path.Split('/').Where(s => s.Length > 0).ToArray();
    }

    private FsNode Resolve(string path) {
        FsNode cur = root;
        foreach (string p in Parts(path)) {
            Folder f = cur as Folder;
            if (f == null || !f.Children.ContainsKey(p)) throw new KeyNotFoundException(path);
            cur = f.Children[p];
        }
        return cur;
    }

    private void Attach(Folder parent, FsNode child) {
        if (parent.Children.ContainsKey(child.Name)) throw new InvalidOperationException("exists: " + child.Name);
        parent.Children[child.Name] = child;
        child.Parent = parent;
        Bubble(parent, child.Size());
    }

    public void Mkdirs(string path) {
        Folder cur = root;
        foreach (string p in Parts(path)) {
            FsNode next; cur.Children.TryGetValue(p, out next);
            if (next == null) { next = new Folder(p); Attach(cur, next); }
            Folder f = next as Folder;
            if (f == null) throw new InvalidOperationException(p + " is a file");
            cur = f;
        }
    }

    public void Write(string path, long bytes) {
        string[] ps = Parts(path);
        if (ps.Length == 0) throw new ArgumentException("file path needed");   // "/" is the root, not a file
        string parentPath = "/" + string.Join("/", ps.Take(ps.Length - 1));
        Folder parent = Resolve(parentPath) as Folder;
        if (parent == null) throw new InvalidOperationException("parent is a file");
        string name = ps[ps.Length - 1];
        FsNode existing; parent.Children.TryGetValue(name, out existing);
        FileNode f = existing as FileNode;
        if (f != null) { Bubble(parent, bytes - f.Bytes); f.Bytes = bytes; }
        else if (existing == null) Attach(parent, new FileNode(name, bytes));
        else throw new InvalidOperationException(name + " is a folder");
    }

    public long Size(string path) { return Resolve(path).Size(); }

    public void Move(string src, string dstFolder) {
        FsNode node = Resolve(src);
        Folder dst = Resolve(dstFolder) as Folder;
        if (dst == null) throw new ArgumentException("destination must be a folder");
        if (node == root) throw new ArgumentException("cannot move root");
        for (Folder x = dst; x != null; x = x.Parent)          // cycle check
            if (x == node) throw new ArgumentException("cannot move a folder into itself");
        if (dst.Children.ContainsKey(node.Name)) throw new InvalidOperationException("name clash");
        Folder old = node.Parent;
        old.Children.Remove(node.Name);
        Bubble(old, -node.Size());
        Attach(dst, node);
    }

    public List<string> Find(string folder, string suffix) {
        List<string> result = new List<string>();
        Stack<FsNode> stack = new Stack<FsNode>();                 // iterative: safe for deep trees
        stack.Push(Resolve(folder));
        while (stack.Count > 0) {
            FsNode n = stack.Pop();
            Folder f = n as Folder;
            if (f != null) foreach (FsNode c in f.Children.Values) stack.Push(c);
            else if (n.Name.EndsWith(suffix)) result.Add(n.Path());
        }
        result.Sort(StringComparer.Ordinal);
        return result;
    }
}

class Program {
    static void Main() {
        FileSystem fs = new FileSystem();
        fs.Mkdirs("/docs/old");
        fs.Write("/docs/a.txt", 5);
        fs.Write("/docs/old/b.txt", 7);
        Console.WriteLine(fs.Size("/"));                      // 12
        fs.Move("/docs/old", "/");
        Console.WriteLine(fs.Size("/docs") + " " + fs.Size("/old") + " " + fs.Size("/"));  // 5 7 12
        Console.WriteLine("[" + string.Join(", ", fs.Find("/", ".txt")) + "]");             // [/docs/a.txt, /old/b.txt]
        try { fs.Move("/docs", "/docs"); } catch (ArgumentException e) { Console.WriteLine("blocked: " + e.Message); }

        fs.Write("/docs/a.txt", 9);                            // replace: sizes bubble up by the difference
        Console.WriteLine(fs.Size("/docs") + " " + fs.Size("/"));   // 9 16
        fs.Mkdirs("/docs/old");
        fs.Write("/docs/old/c.txt", 1);
        try { fs.Move("/old", "/docs"); } catch (InvalidOperationException e) { Console.WriteLine(e.Message); }  // name clash
        Console.WriteLine(fs.Size("/"));                      // 17: the failed move changed nothing
        try { fs.Size("/nope"); } catch (KeyNotFoundException e) { Console.WriteLine("missing: " + e.Message); }
        try { fs.Write("/", 5); } catch (ArgumentException e) { Console.WriteLine(e.Message); }
    }
}` }
      ],
      complexity: `<p>size O(1); write / mkdirs / move O(depth · log fan-out); find O(subtree size). Memory O(nodes).</p>`,
      followUps: ['Add symlinks — how do you keep size() and find() from looping forever?', 'Make it thread-safe: one global lock, per-path locks, or immutable persistent trees?', 'Support "du" output that prints each folder\'s size in sorted order without recomputation.']
    }
  });

  practice.push({
    title: 'Notification Platform: Bridge + Adapter + Decorator Together',
    level: 'Hard', tags: ['bridge', 'adapter', 'decorator', 'which pattern fits'], companies: ['Amazon', 'Twilio', 'Swiggy', 'Uber'],
    statement: `<p>Design the core of a notification platform. Message kinds: <b>OTP</b> (6 digits, expires in 5 min) and <b>Marketing</b> (must append an unsubscribe line, blocked between 21:00 and 09:00). Channels: <b>SMS</b> via a vendor SDK <code>VendorSms.push(String msisdn, String body) → int code</code> (0 = ok) and <b>Email</b> via your own client. Cross-cutting: <b>retry</b> transient channel failures up to 3 times, and <b>dedupe</b> (do not send the same text to the same recipient twice within 60 s). State which pattern solves each part and implement it.</p>`,
    constraints: `<p>New message kinds and new channels must be one class each. Vendor code cannot change. Time is injectable. Retry only on transient failures (vendor code 503).</p>`,
    example: `<p>OTP via SMS: vendor returns 503, 503, 0 → ${H.c('g', 'delivered on attempt 3')}. Same OTP again within 60 s → ${H.c('y', 'deduped, not sent')}. Marketing at 22:30 → ${H.c('r', 'blocked by quiet hours')}.</p>`,
    brute: { why: `<p>A <code>NotificationService.send(kind, channel, to, data)</code> with nested <code>switch</code> over kind and channel, the vendor SDK called inline, a retry loop copy-pasted into each channel branch and a dedupe map checked in some branches but not others. Adding WhatsApp touches every kind branch; adding a kind touches every channel branch.</p>`, code: { lang: 'java', code: `class VendorSms { int push(String msisdn, String body) { return 0; } }
class NotificationService {
    final VendorSms sms = new VendorSms();
    void send(String kind, String channel, String to, String data) {
        String text = switch (kind) {
            case "otp" -> "Your OTP is " + data;
            case "marketing" -> data + " Reply STOP to unsubscribe";
            default -> throw new IllegalArgumentException(kind);
        };
        switch (channel) {
            case "sms" -> { for (int i = 0; i < 3; i++) if (sms.push(to, text) == 0) return; }   // retry copy #1
            case "email" -> System.out.println("email " + to + ": " + text);               // no retry, no dedupe
            default -> throw new IllegalArgumentException(channel);
        }
    }
}`, alt: [
              { lang: 'python', code: `
class VendorSms:
    def push(self, msisdn, body): return 0

class NotificationService:
    def __init__(self): self.sms = VendorSms()
    def send(self, kind, channel, to, data):
        match kind:
            case "otp": text = "Your OTP is " + data
            case "marketing": text = data + " Reply STOP to unsubscribe"
            case _: raise ValueError(kind)
        match channel:
            case "sms":
                for _ in range(3):                            # retry copy #1
                    if self.sms.push(to, text) == 0: return
            case "email": print(f"email {to}: {text}")        # no retry, no dedupe
            case _: raise ValueError(channel)` },
              { lang: 'ts', code: `
class VendorSms { push(msisdn: string, body: string): number { return 0; } }
class NotificationService {
    readonly sms = new VendorSms();
    send(kind: string, channel: string, to: string, data: string): void {
        let text: string;
        switch (kind) {
            case "otp": text = "Your OTP is " + data; break;
            case "marketing": text = data + " Reply STOP to unsubscribe"; break;
            default: throw new Error(kind);
        }
        switch (channel) {
            case "sms": for (let i = 0; i < 3; i++) if (this.sms.push(to, text) === 0) return; break;   // retry copy #1
            case "email": console.log("email " + to + ": " + text); break;               // no retry, no dedupe
            default: throw new Error(channel);
        }
    }
}` },
              { lang: 'cpp', code: `
struct VendorSms { int push(const string& msisdn, const string& body) { return 0; } };
class NotificationService {
    VendorSms sms;
public:
    void send(const string& kind, const string& channel, const string& to, const string& data) {
        string text;
        if (kind == "otp") text = "Your OTP is " + data;
        else if (kind == "marketing") text = data + " Reply STOP to unsubscribe";
        else throw invalid_argument(kind);
        if (channel == "sms") { for (int i = 0; i < 3; i++) if (sms.push(to, text) == 0) return; }   // retry copy #1
        else if (channel == "email") cout << "email " << to << ": " << text << "\\n";               // no retry, no dedupe
        else throw invalid_argument(channel);
    }
};` },
  { lang: 'csharp', code: `
using System;

class VendorSms { public int Push(string msisdn, string body) { return 0; } }
class NotificationService {
    readonly VendorSms sms = new VendorSms();
    public void Send(string kind, string channel, string to, string data) {
        string text;
        switch (kind) {
            case "otp": text = "Your OTP is " + data; break;
            case "marketing": text = data + " Reply STOP to unsubscribe"; break;
            default: throw new ArgumentException(kind);
        }
        switch (channel) {
            case "sms": for (int i = 0; i < 3; i++) if (sms.Push(to, text) == 0) return; break;   // retry copy #1
            case "email": Console.WriteLine("email " + to + ": " + text); break;               // no retry, no dedupe
            default: throw new ArgumentException(channel);
        }
    }
}` }
            ] } },
    mcq: { q: 'Match the forces: kinds × channels / vendor SDK shape / retry + dedupe. Which mapping is right?', options: ['Composite / Proxy / Flyweight', 'Bridge / Adapter / Decorators on the channel', 'Facade / Bridge / Adapter', 'Decorator / Composite / Bridge'], answer: 1, explain: 'Two axes → Bridge; wrong vendor interface → Adapter; optional stackable behaviour around a channel → Decorators.' },
    hints: [`<p>Hint 1: Bridge: <code>abstract class Message</code> (OTP, Marketing) holds a <code>Channel</code> (deliver(to, text) → throws <code>TransientException</code>).</p>`, `<p>Hint 2: <code>SmsAdapter implements Channel</code> wraps <code>VendorSms</code>, mapping code 0 → ok, 503 → TransientException, others → permanent failure.</p>`, `<p>Hint 3: <code>RetryingChannel</code> and <code>DedupingChannel</code> both implement <code>Channel</code> and wrap one. Order: <code>Dedupe(Retry(SmsAdapter))</code> so a retried message is still one logical send. Quiet hours belong to the Marketing abstraction (a business rule), not to a channel.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "SMS +919800000000: Your OTP is 482913. Valid for 5 minutes.\ndeduped +919800000000\nblocked by quiet hours: a@x.com\nEMAIL a@x.com: Sale! Reply STOP to unsubscribe.\nSMS +919800000000: Your OTP is 482913. Valid for 5 minutes.\ngave up: sms busy\nOTP must be 6 digits\n" }] },
    solution: {
      approach: `<p><b>Bridge</b> separates <i>what</i> (OtpMessage, MarketingMessage — formatting and business rules like quiet hours) from <i>how</i> (<code>Channel</code>). <b>Adapter</b> (<code>SmsAdapter</code>) makes the vendor SDK a <code>Channel</code> and translates its codes into exceptions. <b>Decorators</b> (<code>RetryingChannel</code>, <code>DedupingChannel</code>) add resilience and idempotency to <i>any</i> channel. Each new kind or channel is one class; cross-cutting behaviour is configured by wrapping.</p>`,
      code: `class TransientException extends Exception { TransientException(String m) { super(m); } }

// ---------- implementor (HOW) ----------
interface Channel { void deliver(String to, String text) throws TransientException; }

class VendorSms {                                         // vendor SDK stub: cannot change (the failFirst knob is for the demo)
    private final int failFirst;
    private int calls = 0;
    VendorSms(int failFirst) { this.failFirst = failFirst; }
    int push(String msisdn, String body) { return ++calls <= failFirst ? 503 : 0; }
}

// ---------- Adapter: vendor shape -> Channel ----------
class SmsAdapter implements Channel {
    private final VendorSms vendor;
    SmsAdapter(VendorSms v) { vendor = v; }
    public void deliver(String to, String text) throws TransientException {
        int code = vendor.push(to.replace("+", ""), text);
        if (code == 503) throw new TransientException("sms busy");
        if (code != 0) throw new IllegalStateException("sms failed: " + code);
        System.out.println("SMS " + to + ": " + text);
    }
}
class EmailChannel implements Channel {
    public void deliver(String to, String text) { System.out.println("EMAIL " + to + ": " + text); }
}

// ---------- Decorators: add behaviour around any Channel ----------
class RetryingChannel implements Channel {
    private final Channel inner; private final int max;
    RetryingChannel(Channel inner, int max) { this.inner = inner; this.max = max; }
    public void deliver(String to, String text) throws TransientException {
        TransientException last = null;
        for (int i = 1; i <= max; i++) {
            try { inner.deliver(to, text); return; } catch (TransientException e) { last = e; }
        }
        throw last;
    }
}
class DedupingChannel implements Channel {
    private final Channel inner; private final java.util.function.LongSupplier clock; private final long windowMs;
    private final Map<String, Long> lastSent = new ConcurrentHashMap<>();
    DedupingChannel(Channel inner, java.util.function.LongSupplier clock, long windowMs) { this.inner = inner; this.clock = clock; this.windowMs = windowMs; }
    public void deliver(String to, String text) throws TransientException {
        String key = to + "|" + text;
        long now = clock.getAsLong();
        Long prev = lastSent.get(key);
        if (prev != null && now - prev < windowMs) { System.out.println("deduped " + to); return; }
        inner.deliver(to, text);
        lastSent.put(key, now);                            // record only after success
    }
}

// ---------- abstraction (WHAT) ----------
abstract class Message {
    protected final Channel channel;                       // the bridge
    Message(Channel c) { channel = c; }
    abstract void send(String to, LocalTime now) throws TransientException;
}
class OtpMessage extends Message {
    private final String code;
    OtpMessage(Channel c, String code) {
        super(c);
        if (!code.matches("[0-9]{6}")) throw new IllegalArgumentException("OTP must be 6 digits");
        this.code = code;
    }
    void send(String to, LocalTime now) throws TransientException {
        channel.deliver(to, "Your OTP is " + code + ". Valid for 5 minutes.");
    }
}
class MarketingMessage extends Message {
    private final String body;
    MarketingMessage(Channel c, String body) { super(c); this.body = body; }
    void send(String to, LocalTime now) throws TransientException {
        if (now.isAfter(LocalTime.of(21, 0)) || now.isBefore(LocalTime.of(9, 0))) {
            System.out.println("blocked by quiet hours: " + to);
            return;
        }
        channel.deliver(to, body + " Reply STOP to unsubscribe.");
    }
}

class NotificationDemo {
    public static void main(String[] args) throws TransientException {
        long[] t = {0};
        Channel sms = new DedupingChannel(new RetryingChannel(new SmsAdapter(new VendorSms(2)), 3), () -> t[0], 60_000);
        new OtpMessage(sms, "482913").send("+919800000000", LocalTime.NOON);   // delivered on attempt 3
        t[0] = 10_000;
        new OtpMessage(sms, "482913").send("+919800000000", LocalTime.NOON);   // deduped
        new MarketingMessage(new EmailChannel(), "Sale!").send("a@x.com", LocalTime.of(22, 30)); // blocked
        new MarketingMessage(new EmailChannel(), "Sale!").send("a@x.com", LocalTime.NOON);       // unsubscribe line added
        t[0] = 70_000;
        new OtpMessage(sms, "482913").send("+919800000000", LocalTime.NOON);   // window passed: sent again

        Channel stuck = new RetryingChannel(new SmsAdapter(new VendorSms(5)), 3);   // vendor never recovers in time
        try { new OtpMessage(stuck, "111222").send("+919811111111", LocalTime.NOON); }
        catch (TransientException e) { System.out.println("gave up: " + e.getMessage()); }
        try { new OtpMessage(sms, "12ab"); }
        catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
    }
}`,
      alt: [
        { lang: 'python', code: `import re
import threading
from abc import ABC, abstractmethod
from datetime import time
from typing import Callable


class TransientException(Exception):
    pass


# ---------- implementor (HOW) ----------
class Channel(ABC):
    @abstractmethod
    def deliver(self, to: str, text: str) -> None: ...  # may raise TransientException


class VendorSms:  # vendor SDK stub: cannot change (fail_first is a knob for the demo)
    def __init__(self, fail_first: int) -> None:
        self._fail_first = fail_first
        self._calls = 0

    def push(self, msisdn: str, body: str) -> int:
        self._calls += 1
        return 503 if self._calls <= self._fail_first else 0


# ---------- Adapter: vendor shape -> Channel ----------
class SmsAdapter(Channel):
    def __init__(self, vendor: VendorSms) -> None:
        self._vendor = vendor

    def deliver(self, to: str, text: str) -> None:
        code = self._vendor.push(to.replace("+", ""), text)
        if code == 503:
            raise TransientException("sms busy")
        if code != 0:
            raise RuntimeError(f"sms failed: {code}")
        print(f"SMS {to}: {text}")


class EmailChannel(Channel):
    def deliver(self, to: str, text: str) -> None:
        print(f"EMAIL {to}: {text}")


# ---------- Decorators: add behaviour around any Channel ----------
class RetryingChannel(Channel):
    def __init__(self, inner: Channel, max_attempts: int) -> None:
        self._inner = inner
        self._max = max_attempts

    def deliver(self, to: str, text: str) -> None:
        for attempt in range(1, self._max + 1):
            try:
                self._inner.deliver(to, text)
                return
            except TransientException:
                if attempt == self._max:
                    raise  # out of attempts: surface the last failure


class DedupingChannel(Channel):
    def __init__(self, inner: Channel, clock: Callable[[], int], window_ms: int) -> None:
        self._inner = inner
        self._clock = clock
        self._window_ms = window_ms
        self._last_sent: dict[str, int] = {}
        self._lock = threading.Lock()

    def deliver(self, to: str, text: str) -> None:
        key = f"{to}|{text}"
        now = self._clock()
        with self._lock:
            prev = self._last_sent.get(key)
        if prev is not None and now - prev < self._window_ms:
            print(f"deduped {to}")
            return
        self._inner.deliver(to, text)
        with self._lock:
            self._last_sent[key] = now  # record only after success


# ---------- abstraction (WHAT) ----------
class Message(ABC):
    def __init__(self, channel: Channel) -> None:
        self._channel = channel  # the bridge

    @abstractmethod
    def send(self, to: str, now: time) -> None: ...


class OtpMessage(Message):
    def __init__(self, channel: Channel, code: str) -> None:
        super().__init__(channel)
        if not re.fullmatch(r"[0-9]{6}", code):
            raise ValueError("OTP must be 6 digits")
        self._code = code

    def send(self, to: str, now: time) -> None:
        self._channel.deliver(to, f"Your OTP is {self._code}. Valid for 5 minutes.")


class MarketingMessage(Message):
    def __init__(self, channel: Channel, body: str) -> None:
        super().__init__(channel)
        self._body = body

    def send(self, to: str, now: time) -> None:
        if now > time(21, 0) or now < time(9, 0):
            print(f"blocked by quiet hours: {to}")
            return
        self._channel.deliver(to, f"{self._body} Reply STOP to unsubscribe.")


if __name__ == "__main__":
    t = 0
    NOON = time(12, 0)
    sms = DedupingChannel(RetryingChannel(SmsAdapter(VendorSms(2)), 3), lambda: t, 60_000)
    OtpMessage(sms, "482913").send("+919800000000", NOON)  # delivered on attempt 3
    t = 10_000
    OtpMessage(sms, "482913").send("+919800000000", NOON)  # deduped
    MarketingMessage(EmailChannel(), "Sale!").send("a@x.com", time(22, 30))  # blocked
    MarketingMessage(EmailChannel(), "Sale!").send("a@x.com", NOON)  # unsubscribe line added
    t = 70_000
    OtpMessage(sms, "482913").send("+919800000000", NOON)  # window passed: sent again

    stuck = RetryingChannel(SmsAdapter(VendorSms(5)), 3)  # vendor never recovers in time
    try:
        OtpMessage(stuck, "111222").send("+919811111111", NOON)
    except TransientException as e:
        print(f"gave up: {e}")
    try:
        OtpMessage(sms, "12ab")
    except ValueError as e:
        print(e)` },
        { lang: 'ts', code: `class TransientException extends Error {}

// ---------- implementor (HOW) ----------
interface Channel {
  deliver(to: string, text: string): void; // may throw TransientException
}

class VendorSms { // vendor SDK stub: cannot change (failFirst is a knob for the demo)
  private calls = 0;
  constructor(private readonly failFirst: number) {}
  push(_msisdn: string, _body: string): number {
    return ++this.calls <= this.failFirst ? 503 : 0;
  }
}

// ---------- Adapter: vendor shape -> Channel ----------
class SmsAdapter implements Channel {
  constructor(private readonly vendor: VendorSms) {}

  deliver(to: string, text: string): void {
    const code = this.vendor.push(to.replace("+", ""), text);
    if (code === 503) throw new TransientException("sms busy");
    if (code !== 0) throw new Error(\`sms failed: \${code}\`);
    console.log(\`SMS \${to}: \${text}\`);
  }
}

class EmailChannel implements Channel {
  deliver(to: string, text: string): void {
    console.log(\`EMAIL \${to}: \${text}\`);
  }
}

// ---------- Decorators: add behaviour around any Channel ----------
class RetryingChannel implements Channel {
  constructor(private readonly inner: Channel, private readonly max: number) {}

  deliver(to: string, text: string): void {
    for (let attempt = 1; attempt <= this.max; attempt++) {
      try {
        this.inner.deliver(to, text);
        return;
      } catch (e) {
        if (!(e instanceof TransientException) || attempt === this.max) throw e; // out of attempts: surface it
      }
    }
  }
}

class DedupingChannel implements Channel {
  private readonly lastSent = new Map<string, number>();

  constructor(private readonly inner: Channel, private readonly clock: () => number, private readonly windowMs: number) {}

  deliver(to: string, text: string): void {
    const key = \`\${to}|\${text}\`;
    const now = this.clock();
    const prev = this.lastSent.get(key);
    if (prev !== undefined && now - prev < this.windowMs) {
      console.log(\`deduped \${to}\`);
      return;
    }
    this.inner.deliver(to, text);
    this.lastSent.set(key, now); // record only after success
  }
}

// ---------- abstraction (WHAT) ----------
type Minutes = number; // time of day as minutes since midnight
const at = (h: number, m: number): Minutes => h * 60 + m;

abstract class Message {
  protected constructor(protected readonly channel: Channel) {} // the bridge
  abstract send(to: string, now: Minutes): void;
}

class OtpMessage extends Message {
  constructor(channel: Channel, private readonly code: string) {
    super(channel);
    if (!/^[0-9]{6}$/.test(code)) throw new Error("OTP must be 6 digits");
  }

  send(to: string, _now: Minutes): void {
    this.channel.deliver(to, \`Your OTP is \${this.code}. Valid for 5 minutes.\`);
  }
}

class MarketingMessage extends Message {
  constructor(channel: Channel, private readonly body: string) {
    super(channel);
  }

  send(to: string, now: Minutes): void {
    if (now > at(21, 0) || now < at(9, 0)) {
      console.log(\`blocked by quiet hours: \${to}\`);
      return;
    }
    this.channel.deliver(to, \`\${this.body} Reply STOP to unsubscribe.\`);
  }
}

let t = 0;
const NOON = at(12, 0);
const sms: Channel = new DedupingChannel(new RetryingChannel(new SmsAdapter(new VendorSms(2)), 3), () => t, 60_000);
new OtpMessage(sms, "482913").send("+919800000000", NOON); // delivered on attempt 3
t = 10_000;
new OtpMessage(sms, "482913").send("+919800000000", NOON); // deduped
new MarketingMessage(new EmailChannel(), "Sale!").send("a@x.com", at(22, 30)); // blocked
new MarketingMessage(new EmailChannel(), "Sale!").send("a@x.com", NOON); // unsubscribe line added
t = 70_000;
new OtpMessage(sms, "482913").send("+919800000000", NOON); // window passed: sent again

const stuck: Channel = new RetryingChannel(new SmsAdapter(new VendorSms(5)), 3); // vendor never recovers in time
try {
  new OtpMessage(stuck, "111222").send("+919811111111", NOON);
} catch (e) {
  if (e instanceof TransientException) console.log(\`gave up: \${e.message}\`);
}
try {
  new OtpMessage(sms, "12ab");
} catch (e) {
  console.log((e as Error).message);
}` },
        { lang: 'cpp', code: `struct TransientException : runtime_error {
    using runtime_error::runtime_error;
};

// ---------- implementor (HOW) ----------
class Channel {
public:
    virtual ~Channel() = default;
    virtual void deliver(const string& to, const string& text) = 0;    // may throw TransientException
};

class VendorSms {                                       // vendor SDK stub: cannot change (failFirst is a knob for the demo)
    int failFirst_;
    int calls_ = 0;
public:
    explicit VendorSms(int failFirst) : failFirst_(failFirst) {}
    int push(const string&, const string&) { return ++calls_ <= failFirst_ ? 503 : 0; }
};

// ---------- Adapter: vendor shape -> Channel ----------
class SmsAdapter : public Channel {
    VendorSms& vendor_;
public:
    explicit SmsAdapter(VendorSms& vendor) : vendor_(vendor) {}
    void deliver(const string& to, const string& text) override {
        string msisdn = to;
        msisdn.erase(remove(msisdn.begin(), msisdn.end(), '+'), msisdn.end());
        int code = vendor_.push(msisdn, text);
        if (code == 503) throw TransientException("sms busy");
        if (code != 0) throw runtime_error("sms failed: " + to_string(code));
        cout << "SMS " << to << ": " << text << "\\n";
    }
};

class EmailChannel : public Channel {
public:
    void deliver(const string& to, const string& text) override { cout << "EMAIL " << to << ": " << text << "\\n"; }
};

// ---------- Decorators: add behaviour around any Channel ----------
class RetryingChannel : public Channel {
    unique_ptr<Channel> inner_;
    int max_;
public:
    RetryingChannel(unique_ptr<Channel> inner, int max) : inner_(std::move(inner)), max_(max) {}
    void deliver(const string& to, const string& text) override {
        for (int attempt = 1;; attempt++) {
            try {
                inner_->deliver(to, text);
                return;
            } catch (const TransientException&) {
                if (attempt == max_) throw;                      // out of attempts: surface the last failure
            }
        }
    }
};

class DedupingChannel : public Channel {
    unique_ptr<Channel> inner_;
    function<long long()> clock_;
    long long windowMs_;
    unordered_map<string, long long> lastSent_;
    mutex mu_;
public:
    DedupingChannel(unique_ptr<Channel> inner, function<long long()> clock, long long windowMs)
        : inner_(std::move(inner)), clock_(std::move(clock)), windowMs_(windowMs) {}

    void deliver(const string& to, const string& text) override {
        string key = to + "|" + text;
        long long now = clock_();
        {
            lock_guard<mutex> lock(mu_);
            auto it = lastSent_.find(key);
            if (it != lastSent_.end() && now - it->second < windowMs_) {
                cout << "deduped " << to << "\\n";
                return;
            }
        }
        inner_->deliver(to, text);
        lock_guard<mutex> lock(mu_);
        lastSent_[key] = now;                                     // record only after success
    }
};

// ---------- abstraction (WHAT) ----------
constexpr int at(int h, int m) { return h * 60 + m; }            // time of day as minutes since midnight

class Message {
protected:
    Channel& channel_;                                           // the bridge (borrowed: channels are shared)
    explicit Message(Channel& c) : channel_(c) {}
public:
    virtual ~Message() = default;
    virtual void send(const string& to, int now) = 0;
};

class OtpMessage : public Message {
    string code_;
public:
    OtpMessage(Channel& c, string code) : Message(c), code_(std::move(code)) {
        if (!regex_match(code_, regex("[0-9]{6}"))) throw invalid_argument("OTP must be 6 digits");
    }
    void send(const string& to, int) override {
        channel_.deliver(to, "Your OTP is " + code_ + ". Valid for 5 minutes.");
    }
};

class MarketingMessage : public Message {
    string body_;
public:
    MarketingMessage(Channel& c, string body) : Message(c), body_(std::move(body)) {}
    void send(const string& to, int now) override {
        if (now > at(21, 0) || now < at(9, 0)) {
            cout << "blocked by quiet hours: " << to << "\\n";
            return;
        }
        channel_.deliver(to, body_ + " Reply STOP to unsubscribe.");
    }
};

int main() {
    long long t = 0;
    const int NOON = at(12, 0);
    VendorSms vendor(2);
    DedupingChannel sms(make_unique<RetryingChannel>(make_unique<SmsAdapter>(vendor), 3), [&t] { return t; }, 60'000);
    OtpMessage(sms, "482913").send("+919800000000", NOON);        // delivered on attempt 3
    t = 10'000;
    OtpMessage(sms, "482913").send("+919800000000", NOON);        // deduped
    EmailChannel email;
    MarketingMessage(email, "Sale!").send("a@x.com", at(22, 30)); // blocked
    MarketingMessage(email, "Sale!").send("a@x.com", NOON);       // unsubscribe line added
    t = 70'000;
    OtpMessage(sms, "482913").send("+919800000000", NOON);        // window passed: sent again

    VendorSms slowVendor(5);                                      // vendor never recovers in time
    RetryingChannel stuck(make_unique<SmsAdapter>(slowVendor), 3);
    try {
        OtpMessage(stuck, "111222").send("+919811111111", NOON);
    } catch (const TransientException& e) {
        cout << "gave up: " << e.what() << "\\n";
    }
    try {
        OtpMessage(sms, "12ab");
    } catch (const invalid_argument& e) {
        cout << e.what() << "\\n";
    }
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Concurrent;
using System.Text.RegularExpressions;

class TransientException : Exception { public TransientException(string m) : base(m) { } }

// ---------- implementor (HOW) ----------
interface IChannel { void Deliver(string to, string text); }     // throws TransientException when worth retrying

class VendorSms {                                         // vendor SDK stub: cannot change (the failFirst knob is for the demo)
    private readonly int failFirst;
    private int calls = 0;
    public VendorSms(int failFirst) { this.failFirst = failFirst; }
    public int Push(string msisdn, string body) { return ++calls <= failFirst ? 503 : 0; }
}

// ---------- Adapter: vendor shape -> IChannel ----------
class SmsAdapter : IChannel {
    private readonly VendorSms vendor;
    public SmsAdapter(VendorSms v) { vendor = v; }
    public void Deliver(string to, string text) {
        int code = vendor.Push(to.Replace("+", ""), text);
        if (code == 503) throw new TransientException("sms busy");
        if (code != 0) throw new InvalidOperationException("sms failed: " + code);
        Console.WriteLine("SMS " + to + ": " + text);
    }
}
class EmailChannel : IChannel {
    public void Deliver(string to, string text) { Console.WriteLine("EMAIL " + to + ": " + text); }
}

// ---------- Decorators: add behaviour around any IChannel ----------
class RetryingChannel : IChannel {
    private readonly IChannel inner; private readonly int max;
    public RetryingChannel(IChannel inner, int max) { this.inner = inner; this.max = max; }
    public void Deliver(string to, string text) {
        TransientException last = null;
        for (int i = 1; i <= max; i++) {
            try { inner.Deliver(to, text); return; } catch (TransientException e) { last = e; }
        }
        throw last;
    }
}
class DedupingChannel : IChannel {
    private readonly IChannel inner; private readonly Func<long> clock; private readonly long windowMs;
    private readonly ConcurrentDictionary<string, long> lastSent = new ConcurrentDictionary<string, long>();
    public DedupingChannel(IChannel inner, Func<long> clock, long windowMs) { this.inner = inner; this.clock = clock; this.windowMs = windowMs; }
    public void Deliver(string to, string text) {
        string key = to + "|" + text;
        long now = clock();
        long prev;
        if (lastSent.TryGetValue(key, out prev) && now - prev < windowMs) { Console.WriteLine("deduped " + to); return; }
        inner.Deliver(to, text);
        lastSent[key] = now;                               // record only after success
    }
}

// ---------- abstraction (WHAT) ----------
abstract class Message {
    protected readonly IChannel channel;                   // the bridge
    protected Message(IChannel c) { channel = c; }
    public abstract void Send(string to, TimeSpan now);
}
class OtpMessage : Message {
    private readonly string code;
    public OtpMessage(IChannel c, string code) : base(c) {
        if (!Regex.IsMatch(code, "^[0-9]{6}$")) throw new ArgumentException("OTP must be 6 digits");
        this.code = code;
    }
    public override void Send(string to, TimeSpan now) {
        channel.Deliver(to, "Your OTP is " + code + ". Valid for 5 minutes.");
    }
}
class MarketingMessage : Message {
    private readonly string body;
    public MarketingMessage(IChannel c, string body) : base(c) { this.body = body; }
    public override void Send(string to, TimeSpan now) {
        if (now > new TimeSpan(21, 0, 0) || now < new TimeSpan(9, 0, 0)) {
            Console.WriteLine("blocked by quiet hours: " + to);
            return;
        }
        channel.Deliver(to, body + " Reply STOP to unsubscribe.");
    }
}

class Program {
    static readonly TimeSpan Noon = new TimeSpan(12, 0, 0);
    static void Main() {
        long t = 0;
        IChannel sms = new DedupingChannel(new RetryingChannel(new SmsAdapter(new VendorSms(2)), 3), () => t, 60000);
        new OtpMessage(sms, "482913").Send("+919800000000", Noon);   // delivered on attempt 3
        t = 10000;
        new OtpMessage(sms, "482913").Send("+919800000000", Noon);   // deduped
        new MarketingMessage(new EmailChannel(), "Sale!").Send("a@x.com", new TimeSpan(22, 30, 0)); // blocked
        new MarketingMessage(new EmailChannel(), "Sale!").Send("a@x.com", Noon);                    // unsubscribe line added
        t = 70000;
        new OtpMessage(sms, "482913").Send("+919800000000", Noon);   // window passed: sent again

        IChannel stuck = new RetryingChannel(new SmsAdapter(new VendorSms(5)), 3);   // vendor never recovers in time
        try { new OtpMessage(stuck, "111222").Send("+919811111111", Noon); }
        catch (TransientException e) { Console.WriteLine("gave up: " + e.Message); }
        try { new OtpMessage(sms, "12ab"); }
        catch (ArgumentException e) { Console.WriteLine(e.Message); }
    }
}` }
      ],
      complexity: `<p>Per send: O(1) work + up to 3 channel attempts. Classes: kinds + channels + decorators (additive, not multiplicative). Dedupe memory O(distinct (recipient, text) pairs in the window) — evict old keys in production.</p>`,
      followUps: ['Dedupe across 20 servers — where does the dedupe state move, and what about the race between check and send?', 'Add a fallback: if SMS fails permanently, send the OTP by email. Which pattern is that, and where does it sit?', 'Make the quiet-hours rule depend on the recipient\'s time zone.']
    }
  });

  practice.push({
    title: 'Single-Flight Caching Proxy (Stop the Thundering Herd)',
    level: 'Hard', tags: ['proxy', 'caching', 'concurrency', 'CompletableFuture'], companies: ['Netflix', 'Meta', 'Cloudflare', 'Google'],
    statement: `<p><code>interface ProfileService { String profile(String userId); }</code> is slow (200 ms) and expensive. A celebrity's profile is requested by 10 000 threads at the same moment right after the cache entry expires. Build a caching proxy where: (1) cached values are served within TTL; (2) concurrent misses for the <b>same key</b> share <b>one</b> in-flight call (single-flight); (3) failures are delivered to all waiting callers but <b>not cached</b>; (4) different keys load in parallel.</p>`,
    constraints: `<p>Thread-safe, no global lock. TTL and clock injectable. Up to 10<sup>6</sup> distinct keys (eviction may be omitted but discuss it).</p>`,
    example: `<p>TTL 60 s. 100 threads ask for "virat" at t = 0 → ${H.c('g', '1 backend call')}, all 100 get the same value. t = 30 s → ${H.c('g', 'cache hit')}. t = 61 s → 1 new call. If that call throws, all waiters see the error and the next request ${H.c('y', 'retries')}.</p>`,
    brute: { why: `<p>A plain check-then-load cache: every thread that misses calls the backend, so an expiring hot key triggers 10 000 simultaneous calls (the thundering herd / cache stampede) and can take the backend down. Wrapping the whole proxy in one lock (<code>synchronized</code> in Java) fixes the herd but serialises <i>all</i> keys — one slow user blocks everyone.</p>`, code: { lang: 'java', code: `class HerdCache {
    final Map<String, String> cache = new ConcurrentHashMap<>();
    final java.util.function.Function<String, String> backend;
    HerdCache(java.util.function.Function<String, String> backend) { this.backend = backend; }
    String get(String key) {
        String v = cache.get(key);
        if (v == null) {                 // 10 000 threads can all reach here at once
            v = backend.apply(key);      // ...and all call the backend
            cache.put(key, v);
        }
        return v;
    }
}`, alt: [
              { lang: 'python', code: `
class HerdCache:
    def __init__(self, backend):
        self.cache = {}
        self.backend = backend
    def get(self, key):
        v = self.cache.get(key)
        if v is None:                 # 10 000 threads can all reach here at once
            v = self.backend(key)     # ...and all call the backend
            self.cache[key] = v
        return v` },
              { lang: 'ts', code: `
class HerdCache {
    readonly cache = new Map<string, string>();
    constructor(private readonly backend: (key: string) => Promise<string>) {}
    async get(key: string): Promise<string> {
        let v = this.cache.get(key);
        if (v === undefined) {           // 10 000 callers can all reach here at once
            v = await this.backend(key); // ...and all call the backend
            this.cache.set(key, v);
        }
        return v;
    }
}` },
              { lang: 'cpp', code: `
class HerdCache {
    unordered_map<string, string> cache;
    function<string(const string&)> backend;
public:
    HerdCache(function<string(const string&)> backend) : backend(backend) { }
    string get(const string& key) {
        auto it = cache.find(key);
        if (it == cache.end()) {         // 10 000 threads can all reach here at once
            string v = backend(key);     // ...and all call the backend
            it = cache.emplace(key, v).first;
        }
        return it->second;
    }
};` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Concurrent;

class HerdCache {
    readonly ConcurrentDictionary<string, string> cache = new ConcurrentDictionary<string, string>();
    readonly Func<string, string> backend;
    public HerdCache(Func<string, string> backend) { this.backend = backend; }
    public string Get(string key) {
        string v;
        if (!cache.TryGetValue(key, out v)) {   // 10 000 threads can all reach here at once
            v = backend(key);                   // ...and all call the backend
            cache[key] = v;
        }
        return v;
    }
}` }
            ] } },
    mcq: { q: 'What should the map store so that concurrent callers can wait on the same in-flight load?', options: ['The raw String value', 'A future or promise of the value (Java CompletableFuture), installed atomically in the map', 'A Thread reference', 'A boolean "loading" flag polled in a loop'], answer: 1, explain: 'The first caller atomically installs a future; everyone else finds the same future and joins it — one load, many waiters, no global lock.' },
    hints: [`<p>Hint 1: Store <code>Entry(future, loadedAt)</code> per key in a thread-safe map (Java <code>CompletableFuture</code> in a <code>ConcurrentHashMap</code>; Python <code>concurrent.futures.Future</code>; a TypeScript <code>Promise</code>; C++ <code>std::shared_future</code>).</p>`, `<p>Hint 2: Use <code>compute(key, ...)</code>: keep the existing entry if it is still loading or fresh; otherwise install a new future. Only the thread that installed it runs the backend call (outside the map's lock) and completes it.</p>`, `<p>Hint 3: On failure: <code>completeExceptionally</code> and <code>remove(key, thatEntry)</code> so the next caller retries. Callers do <code>future.join()</code> and unwrap <code>CompletionException</code>. Freshness is measured from completion time.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: "backend calls for 100 concurrent misses = 1\nafter expiry = 2\nfailed callers = 20, backend calls = 3\nnot cached: backend error, backend calls = 4\n" }] },
    solution: {
      approach: `<p><code>SingleFlightProxy implements ProfileService</code>. Map key → <code>Entry(future, loadedAt)</code>. In <code>compute</code> we decide atomically: reuse an entry that is still in flight or fresh, else install a new incomplete future and remember that <i>we</i> are the loader. The loader calls the real service outside any lock, then completes the future (and stamps the time) or completes it exceptionally and removes the entry. Every caller joins the future, so N concurrent misses cause exactly one backend call per key, while different keys proceed in parallel.</p>`,
      code: `interface ProfileService { String profile(String userId); }

class SlowProfileService implements ProfileService {
    final AtomicInteger calls = new AtomicInteger();
    public String profile(String userId) {
        calls.incrementAndGet();
        long delay = userId.equals("broken") ? 300 : 50;      // failures are slow too, so waiters pile up behind them
        try { Thread.sleep(delay); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        if (userId.equals("broken")) throw new IllegalStateException("backend error");
        return "profile:" + userId;
    }
}

class SingleFlightProxy implements ProfileService {
    private static final class Entry {
        final CompletableFuture<String> future = new CompletableFuture<>();
        volatile long loadedAt = -1;                       // -1 = still loading
    }

    private final ProfileService real;
    private final long ttlMillis;
    private final java.util.function.LongSupplier clock;
    private final ConcurrentHashMap<String, Entry> map = new ConcurrentHashMap<>();

    SingleFlightProxy(ProfileService real, long ttlMillis, java.util.function.LongSupplier clock) {
        this.real = real; this.ttlMillis = ttlMillis; this.clock = clock;
    }

    @Override
    public String profile(String userId) {
        Entry[] mine = new Entry[1];
        Entry e = map.compute(userId, (k, old) -> {
            long now = clock.getAsLong();
            boolean inFlight = old != null && old.loadedAt < 0;
            boolean fresh = old != null && old.loadedAt >= 0 && now - old.loadedAt < ttlMillis;
            if (inFlight || fresh) return old;             // join or reuse
            mine[0] = new Entry();                          // we become the single loader
            return mine[0];
        });
        if (mine[0] != null) {                              // only the loader thread runs this
            try {
                String v = real.profile(userId);
                e.loadedAt = clock.getAsLong();
                e.future.complete(v);
            } catch (RuntimeException | Error ex) {         // Error too, or the waiters would hang forever
                map.remove(userId, e);                      // failures are not cached
                e.future.completeExceptionally(ex);
            }
        }
        try {
            return e.future.join();
        } catch (CompletionException ce) {
            Throwable cause = ce.getCause();
            if (cause instanceof RuntimeException re) throw re;   // callers see the original exception
            if (cause instanceof Error err) throw err;
            throw ce;
        }
    }
}

class SingleFlightDemo {
    public static void main(String[] args) throws Exception {
        long[] t = {0};
        SlowProfileService backend = new SlowProfileService();
        ProfileService proxy = new SingleFlightProxy(backend, 60_000, () -> t[0]);
        ExecutorService pool = Executors.newFixedThreadPool(32);
        List<Future<String>> fs = new ArrayList<>();
        for (int i = 0; i < 100; i++) fs.add(pool.submit(() -> proxy.profile("virat")));
        for (Future<String> f : fs) f.get();
        System.out.println("backend calls for 100 concurrent misses = " + backend.calls.get());   // 1
        t[0] = 30_000; proxy.profile("virat");                                                   // hit
        t[0] = 61_000; proxy.profile("virat");                                                   // reload
        System.out.println("after expiry = " + backend.calls.get());                             // 2
        List<Future<String>> bad = new ArrayList<>();             // 20 callers hit a failing key together
        for (int i = 0; i < 20; i++) bad.add(pool.submit(() -> proxy.profile("broken")));
        int failed = 0;
        for (Future<String> f : bad) {
            try { f.get(); }
            catch (ExecutionException ex) { if (ex.getCause() instanceof IllegalStateException) failed++; }
        }
        System.out.println("failed callers = " + failed + ", backend calls = " + backend.calls.get());   // 20, 3
        try { proxy.profile("broken"); }                          // the failure was not cached: this retries
        catch (IllegalStateException ex) { System.out.println("not cached: " + ex.getMessage() + ", backend calls = " + backend.calls.get()); }
        pool.shutdown();
    }
}`,
      alt: [
        { lang: 'python', code: `import threading
import time
from abc import ABC, abstractmethod
from concurrent.futures import Future, ThreadPoolExecutor
from typing import Callable


class ProfileService(ABC):
    @abstractmethod
    def profile(self, user_id: str) -> str: ...


class SlowProfileService(ProfileService):
    def __init__(self) -> None:
        self.calls = 0
        self._lock = threading.Lock()

    def profile(self, user_id: str) -> str:
        with self._lock:
            self.calls += 1
        time.sleep(0.3 if user_id == "broken" else 0.05)  # failures are slow too, so waiters pile up behind them
        if user_id == "broken":
            raise RuntimeError("backend error")
        return f"profile:{user_id}"


class _Entry:
    def __init__(self) -> None:
        self.future: Future[str] = Future()
        self.loaded_at = -1  # -1 = still loading


class SingleFlightProxy(ProfileService):
    def __init__(self, real: ProfileService, ttl_millis: int, clock: Callable[[], int]) -> None:
        self._real = real
        self._ttl_millis = ttl_millis
        self._clock = clock
        self._map: dict[str, _Entry] = {}
        self._lock = threading.Lock()  # guards the dict only, never the slow backend call

    def profile(self, user_id: str) -> str:
        mine = False
        with self._lock:
            entry = self._map.get(user_id)
            now = self._clock()
            in_flight = entry is not None and entry.loaded_at < 0
            fresh = entry is not None and entry.loaded_at >= 0 and now - entry.loaded_at < self._ttl_millis
            if entry is None or not (in_flight or fresh):  # otherwise: join or reuse
                entry = self._map[user_id] = _Entry()  # we become the single loader
                mine = True
        if mine:  # only the loader thread runs this
            try:
                value = self._real.profile(user_id)
                entry.loaded_at = self._clock()
                entry.future.set_result(value)
            except Exception as ex:
                with self._lock:
                    if self._map.get(user_id) is entry:
                        del self._map[user_id]  # failures are not cached
                entry.future.set_exception(ex)
        return entry.future.result()  # waiters block here; a stored exception is re-raised for each of them


if __name__ == "__main__":
    t = 0
    backend = SlowProfileService()
    proxy = SingleFlightProxy(backend, 60_000, lambda: t)
    with ThreadPoolExecutor(max_workers=32) as pool:
        futures = [pool.submit(proxy.profile, "virat") for _ in range(100)]
        for f in futures:
            f.result()
        print(f"backend calls for 100 concurrent misses = {backend.calls}")  # 1
        t = 30_000
        proxy.profile("virat")  # hit
        t = 61_000
        proxy.profile("virat")  # reload
        print(f"after expiry = {backend.calls}")  # 2

        bad = [pool.submit(proxy.profile, "broken") for _ in range(20)]  # 20 callers hit a failing key together
        failed = sum(1 for f in bad if isinstance(f.exception(), RuntimeError))
        print(f"failed callers = {failed}, backend calls = {backend.calls}")  # 20, 3
    try:
        proxy.profile("broken")  # the failure was not cached: this retries
    except RuntimeError as ex:
        print(f"not cached: {ex}, backend calls = {backend.calls}")` },
        { lang: 'ts', code: `interface ProfileService {
  profile(userId: string): Promise<string>;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

class SlowProfileService implements ProfileService {
  calls = 0;

  async profile(userId: string): Promise<string> {
    this.calls++;
    await sleep(userId === "broken" ? 300 : 50); // failures are slow too, so waiters pile up behind them
    if (userId === "broken") throw new Error("backend error");
    return \`profile:\${userId}\`;
  }
}

interface Entry {
  loadedAt: number; // -1 = still loading
  promise: Promise<string>;
}

// JS has one thread, so single-flight means: cache the Promise, and every caller awaits the same one.
class SingleFlightProxy implements ProfileService {
  private readonly map = new Map<string, Entry>();

  constructor(
    private readonly real: ProfileService,
    private readonly ttlMillis: number,
    private readonly clock: () => number,
  ) {}

  profile(userId: string): Promise<string> {
    const now = this.clock();
    const old = this.map.get(userId);
    if (old !== undefined && (old.loadedAt < 0 || now - old.loadedAt < this.ttlMillis)) {
      return old.promise; // join the flight in progress, or reuse the fresh value
    }
    const entry: Entry = { loadedAt: -1, promise: Promise.resolve("") }; // we become the single loader
    entry.promise = this.real.profile(userId).then(
      (value) => {
        entry.loadedAt = this.clock();
        return value;
      },
      (err: unknown) => {
        if (this.map.get(userId) === entry) this.map.delete(userId); // failures are not cached
        throw err; // every waiter sees the same rejection
      },
    );
    this.map.set(userId, entry);
    return entry.promise;
  }
}

async function main(): Promise<void> {
  let t = 0;
  const backend = new SlowProfileService();
  const proxy: ProfileService = new SingleFlightProxy(backend, 60_000, () => t);

  await Promise.all(Array.from({ length: 100 }, () => proxy.profile("virat")));
  console.log(\`backend calls for 100 concurrent misses = \${backend.calls}\`); // 1
  t = 30_000;
  await proxy.profile("virat"); // hit
  t = 61_000;
  await proxy.profile("virat"); // reload
  console.log(\`after expiry = \${backend.calls}\`); // 2

  const outcomes = await Promise.allSettled(Array.from({ length: 20 }, () => proxy.profile("broken"))); // 20 callers, one failing key
  const failed = outcomes.filter((o) => o.status === "rejected").length;
  console.log(\`failed callers = \${failed}, backend calls = \${backend.calls}\`); // 20, 3
  try {
    await proxy.profile("broken"); // the failure was not cached: this retries
  } catch (e) {
    console.log(\`not cached: \${(e as Error).message}, backend calls = \${backend.calls}\`);
  }
}

void main();` },
        { lang: 'cpp', code: `class ProfileService {
public:
    virtual ~ProfileService() = default;
    virtual string profile(const string& userId) = 0;
};

class SlowProfileService : public ProfileService {
public:
    atomic<int> calls{0};
    string profile(const string& userId) override {
        calls++;
        this_thread::sleep_for(chrono::milliseconds(userId == "broken" ? 300 : 50));   // failures are slow too
        if (userId == "broken") throw runtime_error("backend error");
        return "profile:" + userId;
    }
};

class SingleFlightProxy : public ProfileService {
    struct Entry {
        promise<string> result;
        shared_future<string> future = result.get_future().share();   // every waiter gets a copy
        atomic<long long> loadedAt{-1};                                // -1 = still loading
    };

    ProfileService& real_;
    long long ttlMillis_;
    function<long long()> clock_;
    unordered_map<string, shared_ptr<Entry>> map_;
    mutex mu_;                                                          // guards the map only, never the backend call
public:
    SingleFlightProxy(ProfileService& real, long long ttlMillis, function<long long()> clock)
        : real_(real), ttlMillis_(ttlMillis), clock_(std::move(clock)) {}

    string profile(const string& userId) override {
        shared_ptr<Entry> entry;
        bool mine = false;
        {
            lock_guard<mutex> lock(mu_);
            long long now = clock_();
            auto it = map_.find(userId);
            if (it != map_.end()) {
                long long at = it->second->loadedAt;
                if (at < 0 || now - at < ttlMillis_) entry = it->second;   // join or reuse
            }
            if (!entry) {                                                  // we become the single loader
                entry = make_shared<Entry>();
                map_[userId] = entry;
                mine = true;
            }
        }
        if (mine) {                                                        // only the loader thread runs this
            try {
                string value = real_.profile(userId);
                entry->loadedAt = clock_();
                entry->result.set_value(std::move(value));
            } catch (...) {
                {
                    lock_guard<mutex> lock(mu_);
                    auto it = map_.find(userId);
                    if (it != map_.end() && it->second == entry) map_.erase(it);   // failures are not cached
                }
                entry->result.set_exception(current_exception());
            }
        }
        return entry->future.get();                                        // rethrows the stored exception for every waiter
    }
};

int main() {
    long long t = 0;
    SlowProfileService backend;
    SingleFlightProxy proxy(backend, 60'000, [&t] { return t; });

    vector<future<string>> fs;
    for (int i = 0; i < 100; i++) fs.push_back(async(launch::async, [&proxy] { return proxy.profile("virat"); }));
    for (auto& f : fs) f.get();
    cout << "backend calls for 100 concurrent misses = " << backend.calls << "\\n";   // 1
    t = 30'000; proxy.profile("virat");                                              // hit
    t = 61'000; proxy.profile("virat");                                              // reload
    cout << "after expiry = " << backend.calls << "\\n";                              // 2

    vector<future<string>> bad;                                                      // 20 callers hit a failing key together
    for (int i = 0; i < 20; i++) bad.push_back(async(launch::async, [&proxy] { return proxy.profile("broken"); }));
    int failed = 0;
    for (auto& f : bad) {
        try { f.get(); } catch (const runtime_error&) { failed++; }
    }
    cout << "failed callers = " << failed << ", backend calls = " << backend.calls << "\\n";   // 20, 3
    try {
        proxy.profile("broken");                                                     // the failure was not cached: this retries
    } catch (const runtime_error& e) {
        cout << "not cached: " << e.what() << ", backend calls = " << backend.calls << "\\n";
    }
}` },
  { lang: 'csharp', code: `
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

interface IProfileService { string Profile(string userId); }

class SlowProfileService : IProfileService {
    private int calls;
    public int Calls { get { return calls; } }
    public string Profile(string userId) {
        Interlocked.Increment(ref calls);
        int delay = userId == "broken" ? 300 : 50;      // failures are slow too, so waiters pile up behind them
        Thread.Sleep(delay);
        if (userId == "broken") throw new InvalidOperationException("backend error");
        return "profile:" + userId;
    }
}

class SingleFlightProxy : IProfileService {
    private sealed class Entry {
        public readonly TaskCompletionSource<string> Future = new TaskCompletionSource<string>();
        public volatile int LoadedAtState = -1;         // -1 = still loading
        public long LoadedAt;
    }

    private readonly IProfileService real;
    private readonly long ttlMillis;
    private readonly Func<long> clock;
    private readonly Dictionary<string, Entry> map = new Dictionary<string, Entry>();
    private readonly object gate = new object();        // guards the map only; loads run outside it

    public SingleFlightProxy(IProfileService real, long ttlMillis, Func<long> clock) {
        this.real = real; this.ttlMillis = ttlMillis; this.clock = clock;
    }

    public string Profile(string userId) {
        Entry e; bool loader = false;
        lock (gate) {
            long now = clock();
            Entry old; map.TryGetValue(userId, out old);
            bool inFlight = old != null && old.LoadedAtState < 0;
            bool fresh = old != null && old.LoadedAtState >= 0 && now - old.LoadedAt < ttlMillis;
            if (inFlight || fresh) e = old;                 // join or reuse
            else { e = new Entry(); map[userId] = e; loader = true; }   // we become the single loader
        }
        if (loader) {                                       // only the loader thread runs this
            try {
                string v = real.Profile(userId);
                e.LoadedAt = clock(); e.LoadedAtState = 0;
                e.Future.SetResult(v);
            } catch (Exception ex) {
                lock (gate) { Entry cur; if (map.TryGetValue(userId, out cur) && cur == e) map.Remove(userId); }   // failures are not cached
                e.Future.SetException(ex);
            }
        }
        try {
            return e.Future.Task.Result;
        } catch (AggregateException ae) {
            throw ae.InnerException;                        // callers see the original exception
        }
    }
}

class Program {
    // run one call per dedicated thread so every caller really is in flight at the same time
    static List<Exception> RunAll(int n, Func<string> call) {
        List<Exception> errors = new List<Exception>(); object gate = new object();
        List<Thread> threads = new List<Thread>();
        for (int i = 0; i < n; i++) {
            Thread th = new Thread(() => { try { call(); } catch (Exception e) { lock (gate) errors.Add(e); } });
            threads.Add(th);
        }
        foreach (Thread th in threads) th.Start();
        foreach (Thread th in threads) th.Join();
        return errors;
    }
    static void Main() {
        long t = 0;
        SlowProfileService backend = new SlowProfileService();
        IProfileService proxy = new SingleFlightProxy(backend, 60000, () => t);
        RunAll(100, () => proxy.Profile("virat"));
        Console.WriteLine("backend calls for 100 concurrent misses = " + backend.Calls);   // 1
        t = 30000; proxy.Profile("virat");                                                  // hit
        t = 61000; proxy.Profile("virat");                                                  // reload
        Console.WriteLine("after expiry = " + backend.Calls);                               // 2
        List<Exception> errors = RunAll(20, () => proxy.Profile("broken"));                // 20 callers hit a failing key together
        int failed = errors.Count(e => e is InvalidOperationException);
        Console.WriteLine("failed callers = " + failed + ", backend calls = " + backend.Calls);   // 20, 3
        try { proxy.Profile("broken"); }                           // the failure was not cached: this retries
        catch (InvalidOperationException ex) { Console.WriteLine("not cached: " + ex.Message + ", backend calls = " + backend.Calls); }
    }
}` }
      ],
      complexity: `<p>Hit: O(1) (one <code>compute</code> + completed-future join). Miss: one backend call per key per TTL regardless of concurrency. Memory O(keys) — add size-bounded eviction (e.g. Caffeine, which implements exactly this) in production.</p>`,
      followUps: ['Serve the stale value while one thread refreshes in the background (refresh-ahead).', 'Add a timeout so waiters do not hang forever if the loader thread dies.', 'Extend single-flight across a cluster of 50 servers (request coalescing at a shared cache tier or lease tokens).']
    }
  });
  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push(
    { q: 'Your checkout uses <code>PaymentProcessor.pay(amount)</code>. A new vendor SDK offers <code>chargeCard(cents, currency)</code> and you cannot edit it. Which pattern?', options: ['Decorator', 'Adapter', 'Bridge', 'Composite'], answer: 1, explain: 'The vendor class does the right job with the wrong interface. An adapter implements PaymentProcessor and translates calls to chargeCard.' },
    { q: 'Which statement best separates Decorator from Proxy?', options: ['Decorator changes the interface; Proxy keeps it', 'Decorator adds behaviour and is usually stacked by the client; Proxy controls access to the same behaviour and often manages the real object\'s lifecycle', 'Proxy can only be used over a network', 'There is no difference at all'], answer: 1, explain: 'Both keep the interface and delegate. Intent differs: add features (decorator) vs control access — lazy, cache, permission, remote (proxy).' },
    { q: 'A coffee app has 4 bases and 6 add-ons, and customers may combine add-ons freely. With one subclass per combination (no doubles), how many classes? With decorators?', options: ['24 vs 10', '256 vs 10', '4 × 2<sup>6</sup> = 256 vs 4 + 6 = 10', '10 vs 256'], answer: 2, explain: 'Each base can have any subset of 6 add-ons: 2<sup>6</sup> = 64 subsets × 4 bases = 256 classes. Decorators need one class per base and per add-on: 10.' },
    { q: 'What makes it safe to share a flyweight object among thousands of contexts?', options: ['It is a singleton', 'It is immutable — it holds only intrinsic state', 'It takes a lock on every method', 'It is stored in a static field'], answer: 1, explain: 'If shared state could change, a change made for one context would leak into all of them. Flyweights hold only immutable intrinsic data; per-context data stays outside.' },
    { q: '<code>Integer a = 1000, b = 1000; System.out.println(a == b);</code> prints (with default JVM settings)…', options: ['true, because of the Integer flyweight cache', 'false, because only -128..127 are cached by default', 'It does not compile', 'It throws NullPointerException'], answer: 1, explain: 'Autoboxing uses Integer.valueOf, which returns cached flyweights only for -128..127 by default. 1000 creates two separate objects, so == compares different references.' },
    { q: 'In the Composite pattern, what is the type of the children collection inside the composite?', options: ['The leaf type', 'The composite type', 'The component interface shared by leaves and composites', 'Object'], answer: 2, explain: 'Children are typed as the component so a composite can hold leaves and other composites, and it can call the same operation on each.' },
    { q: 'You have shapes (Circle, Square) and rendering engines (OpenGL, Vulkan, Metal), and both lists will grow. Which pattern keeps the class count at M + N?', options: ['Facade', 'Bridge', 'Flyweight', 'Proxy'], answer: 1, explain: 'Bridge puts shapes (abstraction) and renderers (implementor) in separate hierarchies joined by a field, so classes add instead of multiply.' },
    { q: 'A Spring bean method annotated with <code>@Transactional</code> is called from another method of the same class via <code>this.method()</code>. What happens?', options: ['A new transaction starts as usual', 'The call bypasses the Spring proxy, so no transaction behaviour is applied for that inner call', 'Spring throws an exception at startup', 'The transaction is started twice'], answer: 1, explain: 'Spring applies @Transactional through a proxy around the bean. A self-call on <code>this</code> goes straight to the real object and skips the proxy\'s interception.' },
    { q: 'Which of these is NOT a good reason to introduce a Facade?', options: ['Callers repeat the same 5-step sequence across subsystems', 'You want to hide subsystems completely so nobody can ever use them directly', 'You want to reduce how many classes each caller depends on', 'You want a stable, simple API for an SDK'], answer: 1, explain: 'A facade offers a convenient default path. It does not lock out direct access to subsystems — advanced callers may still use them.' },
    { q: '<code>new BufferedReader(new InputStreamReader(new FileInputStream(f), UTF_8))</code> contains which patterns?', options: ['Only Decorator', 'Decorator (BufferedReader) and Adapter (InputStreamReader turns bytes into chars)', 'Only Adapter', 'Composite and Proxy'], answer: 1, explain: 'BufferedReader wraps a Reader and adds buffering (decorator). InputStreamReader turns an InputStream into a Reader — a different interface (adapter).' },
    { q: 'With decorators <code>Retry(Timeout(call, 2s), 3)</code> vs <code>Timeout(Retry(call, 3), 2s)</code>, which is true?', options: ['They behave the same', 'The first gives each attempt its own 2 s timeout; the second gives all attempts one shared 2 s deadline', 'The second retries 6 times', 'The first never times out'], answer: 1, explain: 'The outer decorator controls the inner one. Retry outside means each attempt runs a fresh Timeout; Timeout outside wraps the whole retry loop in one deadline.' },
    { q: 'A game must draw 2 million grass tiles that use 8 textures. Which split is correct for Flyweight?', options: ['Texture = extrinsic, position = intrinsic', 'Texture = intrinsic (shared), position = extrinsic (per tile)', 'Both intrinsic', 'Both extrinsic'], answer: 1, explain: 'The 8 textures are identical across many tiles, so they are shared intrinsic state. Each tile\'s position is unique, so it is extrinsic state.' },
    { q: 'Which of these is a virtual proxy?', options: ['A class that turns XML into JSON', 'A placeholder that creates an expensive object only on first real use', 'A class that combines five subsystems', 'A list of children with the same interface'], answer: 1, explain: 'A virtual proxy delays creating an expensive object (big image, DB entity) until it is really needed — lazy loading.' }
  );
  /* =====================================================================
     INTERVIEW Q&A
     ===================================================================== */
  interview.push(
    { q: 'What are structural design patterns, and how are they different from creational and behavioral ones?', level: 'B',
      a: `<p><b>Creational</b> patterns are about <i>how objects are created</i> (Factory, Builder, Singleton). <b>Behavioral</b> patterns are about <i>how objects talk and share work</i> (Strategy, Observer, Command). <b>Structural</b> patterns are about <i>how classes and objects are connected</i> into bigger structures: wrapping (Adapter, Decorator, Proxy), simplifying (Facade), building trees (Composite), splitting hierarchies (Bridge) and sharing objects (Flyweight). Almost all of them prefer <b>composition</b> (holding a reference) over inheritance, which keeps the connections flexible at runtime.</p>`,
      followUps: ['Which structural pattern uses inheritance in one of its variants? (Class adapter.)', 'Name a structural pattern you have used in a real project, and why.'] },
    { q: 'Explain the Adapter pattern with a real example. Object adapter or class adapter — which do you prefer?', level: 'B',
      a: `<p>An adapter makes an existing class usable through an interface it does not implement. Example: our code depends on <code>PaymentProcessor.pay(orderId, rupees)</code>, and a bank SDK offers <code>makeTransfer(ref, paise, currency)</code> that returns string codes. <code>BankAdapter implements PaymentProcessor</code>, holds the SDK, converts rupees to paise on the way in and codes to an enum on the way out. I prefer the <b>object adapter</b> (composition): it works with final classes and any subclass of the adaptee, can be swapped at runtime, and does not leak the adaptee's public methods. In a single-inheritance language (Java, TypeScript) a class adapter uses up the only <code>extends</code>, and in every language it exposes the adaptee's API. Examples: Java's <code>Arrays.asList</code> and <code>InputStreamReader</code>, Python's <code>io.TextIOWrapper</code>, JavaScript's <code>TextDecoder</code>.</p>`,
      followUps: ['How do you handle vendor states that your enum cannot represent?', 'Where should vendor exceptions be translated?'] },
    { q: 'Decorator vs inheritance: when would you choose a decorator?', level: 'B',
      a: `<p>Choose a decorator when features are <b>optional</b>, <b>combinable</b> and decided at <b>runtime</b>, or when you cannot subclass (final class). Inheritance fixes behaviour at compile time for every instance and explodes with combinations: 3 coffees × 5 optional add-ons = 96 subclasses, versus 8 classes with decorators. Each decorator implements the same interface, holds one inner component, does its small job and delegates. Costs: many small objects, deeper stack traces, order-dependence, and identity checks (<code>instanceof</code>) on the wrapped type stop working. Examples: Java's <code>BufferedInputStream</code> and <code>Collections.unmodifiableList</code>, Python's <code>io.BufferedReader</code>, Node.js stream pipelines.</p>`,
      followUps: ['Show how decorator order changes behaviour with Retry and Timeout.', 'How does a base class such as Java\'s FilterInputStream reduce decorator boilerplate?'] },
    { q: 'Adapter, Decorator and Proxy all wrap an object and delegate. How do you tell them apart in a design review?', level: 'I',
      a: `<p>By <b>intent</b>, which shows up in the interfaces and in who builds the wrapper. <b>Adapter</b>: wrapper interface ≠ wrapped interface; it translates (the client could not use the wrapped object directly). <b>Decorator</b>: same interface; it <i>adds</i> behaviour the caller wants (compression, logging), and the client usually stacks decorators itself. <b>Proxy</b>: same interface and same behaviour; it <i>controls access</i> — lazy creation, caching, permission, remoting — and is usually handed out by a factory or framework, often managing the real object's lifecycle. A quick test: "remove the wrapper — does the client still compile?" Yes for Decorator/Proxy, no for Adapter. Then: "does it add a feature or guard an existing one?"</p>`,
      followUps: ['Is a caching wrapper a decorator or a proxy? Defend your answer.', 'Where does Chain of Responsibility fit in this family?'] },
    { q: 'What is a Facade, and how is it different from an Adapter and from a Mediator?', level: 'I',
      a: `<p>A facade is a simple, higher-level interface over a <b>set of subsystems</b>, e.g. <code>OrderFacade.placeOrder()</code> calling inventory, payment, shipping and email in the right order with compensation on failure. <b>vs Adapter:</b> an adapter converts <i>one</i> interface into another the client <i>already expects</i>; a facade <i>defines a new, simpler</i> interface over <i>many</i> classes. <b>vs Mediator:</b> a facade is one-way — subsystems do not know it exists; a mediator is two-way — colleagues send events to the mediator and it coordinates them. Good facades are thin (coordination, not business rules), constructor-injected for testability, and do not prevent direct subsystem access.</p>`,
      followUps: ['Your facade has grown to 80 methods. What do you do?', 'How is an API gateway related to the Facade pattern?'] },
    { q: 'Describe the kinds of Proxy and give a production example of each.', level: 'I',
      a: `<p><b>Virtual proxy</b> — lazy creation: Hibernate entity proxies load the row on first property access. <b>Protection proxy</b> — access checks: a wrapper that throws unless the caller has the role; Spring Security method security. <b>Remote proxy</b> — hides a network call: gRPC/Feign client stubs. <b>Caching proxy</b> — returns stored results: a TTL cache in front of an FX-rate API. <b>Smart reference / logging</b> — counting, metrics, transactions: Spring's <code>@Transactional</code> proxies. Proxies are hand-written, or generated at run time: Java's <code>java.lang.reflect.Proxy</code> (interfaces only) or bytecode libraries like ByteBuddy (subclasses; fails on final classes/methods), Python's <code>__getattr__</code>, JavaScript/TypeScript's built-in <code>Proxy</code>; C++ uses template wrappers.</p>`,
      followUps: ['Why does @Transactional not work on private methods?', 'How do you make a lazy proxy thread-safe?'] },
    { q: 'Walk me through the Composite pattern. What is the "transparent vs safe" trade-off?', level: 'I',
      a: `<p>Composite lets clients treat a single object and a group the same way in a tree. A <code>Component</code> interface (e.g. <code>size()</code>) is implemented by <b>leaves</b> (File returns its bytes) and <b>composites</b> (Folder sums its children's <code>size()</code>). The client calls <code>root.size()</code> and recursion handles any depth with no <code>instanceof</code>. <b>Transparent</b> design puts <code>add/remove</code> on the component so clients never check types — but leaves must throw on <code>add</code>, which bends Liskov. <b>Safe</b> design puts <code>add/remove</code> only on the composite — leaves cannot be misused, but the client must know it holds a composite to add children. I use the safe form with a closed set of node types (a <code>sealed</code> interface in Java, a union in TypeScript).</p>`,
      followUps: ['How do you keep size() O(1) on a huge tree?', 'How do you prevent cycles when users can move folders?'] },
    { q: 'Explain the Bridge pattern. How is it different from Strategy and from Adapter?', level: 'A',
      a: `<p>Bridge splits a class that varies along <b>two dimensions</b> into two hierarchies joined by composition: the <b>abstraction</b> (Notification → Alert, Promo) holds an <b>implementor</b> (Channel → Email, SMS). That turns M × N subclasses into M + N classes and lets both sides evolve independently, even by different teams. <b>vs Adapter:</b> Adapter is applied after the fact to make incompatible things fit; Bridge is designed up front. <b>vs Strategy:</b> the field-holding-an-interface shape is the same, but Strategy swaps one algorithm inside a class, while Bridge splits an entire hierarchy so the abstraction side has its own subclasses building on the implementor's primitive operations. JDBC (API vs drivers) is the classic real bridge.</p>`,
      followUps: ['How do you design the implementor interface so new implementations fit?', 'What does Bridge have in common with hexagonal architecture?'] },
    { q: 'What is the Flyweight pattern? Explain intrinsic vs extrinsic state with numbers.', level: 'A',
      a: `<p>Flyweight shares the identical, heavy part of many objects. <b>Intrinsic</b> state is identical across instances and immutable (a tree species' 2 MB texture and mesh); it lives in a shared flyweight from a factory/pool. <b>Extrinsic</b> state is unique per instance (x, y position); it lives in a tiny context object or is passed as a parameter. With 1 000 000 trees of 3 species: naive ≈ 1 000 000 × 2 MB ≈ 2 TB; flyweight ≈ 3 × 2 MB + 1 000 000 × ~24 B ≈ 30 MB. Requirements: flyweights must be immutable, created only via the factory (thread-safe, e.g. <code>computeIfAbsent</code>), and identity must not matter to the program. JDK examples: Integer cache, String pool, enums.</p>`,
      followUps: ['How is Flyweight different from Object Pool and Singleton?', 'How do you stop a flyweight factory from leaking memory with user-supplied keys?'] },
    { q: 'Design a logging framework. Which structural patterns would you use and where?', level: 'A',
      a: `<p><b>Facade:</b> <code>Log.get("orders").info(...)</code> hides the logger registry and wiring. <b>Bridge:</b> <code>Logger</code> (levels, formatting, names — the abstraction) holds an <code>Appender</code> interface (console, file, network — the implementor), so loggers and outputs grow independently. <b>Composite:</b> a <code>MultiAppender</code> holding a list of appenders lets one logger write to many outputs while looking like one appender. <b>Decorator:</b> <code>AsyncAppender</code>, <code>FilteredAppender</code>, <code>TimestampedAppender</code> wrap a single appender to add behaviour. Also: check the level before formatting (cheap disabled logs), use a bounded queue with a drop policy in the async decorator, and make appenders thread-safe. (Chain of Responsibility often appears for logger hierarchies.)</p>`,
      followUps: ['What happens when the async queue is full?', 'How do you support per-package log levels?'] },
    { q: 'How do you implement a thread-safe lazy-loading proxy? What can go wrong?', level: 'A',
      a: `<p>Keep the target in a field and use double-checked locking: read the field; if null, take a lock (<code>synchronized</code> in Java, <code>threading.Lock</code> in Python, a mutex or <code>std::call_once</code> in C++; JavaScript has one thread, so a plain check is enough), read again, load, assign. In Java the field must be <code>volatile</code>: it guarantees other threads see a fully constructed object; the second check prevents double loading. If the loader throws, leave the field null so a later call retries (do not cache failures). Methods that the proxy can answer itself (like <code>id()</code>) must not trigger a load. Pitfalls: <b>N+1 queries</b> when iterating over many proxies (fix with batch loading), using the proxy after its session/connection is closed, <code>equals</code> implemented with <code>getClass()</code> (fails for proxies), and frameworks that cannot proxy final classes or methods.</p>`,
      followUps: ['How would you implement batch loading for 1 000 proxies?', 'Compare double-checked locking with the holder idiom here.'] },
    { q: 'Design a caching proxy that survives a thundering herd on a hot key.', level: 'E',
      a: `<p>Store futures, not values, in a thread-safe map (Java <code>CompletableFuture</code> in a <code>ConcurrentHashMap</code>, Python <code>Future</code>, a JavaScript <code>Promise</code>, C++ <code>shared_future</code>). On a request, <code>compute</code> the entry atomically: reuse it if it is in flight or fresh; otherwise install a new incomplete future and mark this thread as the single loader. The loader calls the backend <i>outside</i> the map lock and completes the future (stamping load time) or completes it exceptionally and removes the entry so failures are not cached. All other callers <code>join()</code> the same future, so 10 000 concurrent misses cost one backend call (single-flight / request coalescing), while different keys load in parallel. Production additions: bounded size with LRU/W-TinyLFU eviction, refresh-ahead or stale-while-revalidate, timeouts for waiters, metrics on hit ratio and load latency, and per-key jitter on TTL to avoid synchronised expiry.</p>`,
      followUps: ['Extend single-flight across 50 servers.', 'How does stale-while-revalidate change user-visible latency?'] },
    { q: 'Where do structural patterns show up in AI/LLM systems you might build today?', level: 'E',
      a: `<p><b>Adapter:</b> each model provider SDK and each tool API is adapted to one internal interface; MCP servers are adapters that expose systems as standard tools. <b>Bridge:</b> features (summariser, classifier, agent) on one side, model providers on the other, so you can route by cost and latency. <b>Decorator:</b> retry-with-backoff, rate limiting, guardrails/PII redaction, tracing and prompt caching wrapped around <code>complete(prompt)</code>. <b>Proxy:</b> an LLM gateway enforcing API keys and budgets, caching, and permission proxies that require human approval before dangerous tool calls. <b>Facade:</b> a few task-level tools for agents instead of 40 raw endpoints. <b>Composite:</b> hierarchical plans and document trees for summarisation. <b>Flyweight:</b> shared prompt prefixes / KV-cache blocks across requests.</p>`,
      followUps: ['Which of these layers must run before the cache, and why (e.g. PII redaction)?', 'How would you test a guardrail decorator?'] }
  );
  /* ---- python / TypeScript / C++ versions of the Java code panes (same line numbers so hl still matches) ---- */
  ALTS[ADAPTER_CODE] = mkAlt(`rupees = amount                          # 1 what Checkout gives us
paise = int(rupees.scaleb(2))            # 2 translate units
# (a Decimal scaled by 10^2: exact whole paise)
ref = "ORD-" + str(order_id)             # 4 translate naming
code = bank.make_transfer(ref, paise, "INR") # 5 call adaptee
match code:                              # 6 translate the answer
    case "00": return PaymentResult.SUCCESS
    case "51": return PaymentResult.DECLINED
    case _:    return PaymentResult.ERROR`, `const rupees = amount;                   // 1 what Checkout gives us
const paise = Math.round(rupees * 100);    // 2 translate units
// (whole paise only: no fractions)
const ref = "ORD-" + orderId;              // 4 translate naming
const code = bank.makeTransfer(ref, paise, "INR"); // 5 call adaptee
switch (code) {                            // 6 translate the answer
  case "00": return PaymentResult.SUCCESS;
  case "51": return PaymentResult.DECLINED;
  default:   return PaymentResult.ERROR; }`, `double rupees = amount;                   // 1 what Checkout gives us
long long paise = llround(rupees * 100);   // 2 translate units
// (whole paise only: no fractions)
string ref = "ORD-" + to_string(orderId);  // 4 translate naming
string code = bank.makeTransfer(ref, paise, "INR"); // 5 call adaptee
// 6 translate the answer (a string cannot be switched on: if-chain)
if (code == "00") return PaymentResult::SUCCESS;
if (code == "51") return PaymentResult::DECLINED;
return PaymentResult::ERROR;`);
  ALTS[FACADE_CODE] = mkAlt(`def place_order(self, item, qty, card):
    if not self.inventory.in_stock(item, qty): return Receipt.out_of_stock()
    self.inventory.reserve(item, qty)
    if not self.payments.charge(card, self.catalog.price(item) * qty):
        self.inventory.release(item, qty)   # compensate
        return Receipt.declined()
    tracking = self.shipping.schedule(item, qty)
    self.notifier.email("Order placed: " + tracking)
    return Receipt.ok(tracking)`, `placeOrder(item: string, qty: number, card: string): Receipt {
  if (!this.inventory.inStock(item, qty)) return Receipt.outOfStock();
  this.inventory.reserve(item, qty);
  if (!this.payments.charge(card, this.catalog.price(item) * qty)) {
    this.inventory.release(item, qty);   // compensate
    return Receipt.declined(); }
  const tracking = this.shipping.schedule(item, qty);
  this.notifier.email("Order placed: " + tracking);
  return Receipt.ok(tracking); }`, `Receipt placeOrder(const string& item, int qty, const string& card) {
  if (!inventory.inStock(item, qty)) return Receipt::outOfStock();
  inventory.reserve(item, qty);
  if (!payments.charge(card, catalog.price(item) * qty)) {
    inventory.release(item, qty);   // compensate
    return Receipt::declined(); }
  string tracking = shipping.schedule(item, qty);
  notifier.email("Order placed: " + tracking);
  return Receipt::ok(tracking); }`);
  ALTS[PROXY_CODE] = mkAlt(`def display(self, user):
    if not self.acl.can_view(user, self.name):   # protection proxy
        raise PermissionError(user)
    if self.real is None:                        # virtual proxy: lazy
        self.real = RealImage(self.name)         # slow disk load
    self.real.display(user)                      # delegate`, `display(user: string): void {
  if (!this.acl.canView(user, this.name))   // protection proxy
    throw new Error("forbidden: " + user);
  if (this.real === null)                   // virtual proxy: lazy
    this.real = new RealImage(this.name);   // slow disk load
  this.real.display(user);                  // delegate
}`, `void display(const string& user) override {
  if (!acl.canView(user, name))          // protection proxy
    throw runtime_error(user);
  if (!real)                             // virtual proxy: lazy
    real = make_unique<RealImage>(name); // slow disk load
  real->display(user);                   // delegate
}`);
  ALTS[COMP_CODE] = mkAlt(`def size(self):                # in Folder (composite)
    total = 0
    for child in self.children:
        total += child.size()   # same call for file OR folder
    return total

def size(self): return self.bytes   # in File (leaf)`, `size(): number {                // in Folder (composite)
  let total = 0;
  for (const child of this.children)
    total += child.size();     // same call for file OR folder
  return total;
}
size(): number { return this.bytes; } // in File (leaf)`, `long long size() const override {                // in Folder (composite)
  long long total = 0;
  for (const Node* child : children)
    total += child->size();     // same call for file OR folder
  return total;
}
long long size() const override { return bytes; } // in File (leaf)`);
  ALTS[FLY_CODE] = mkAlt(`def of(name):                       # static: one TreeType per name
    if name not in CACHE:           # look in the pool
        CACHE[name] = TreeType(name, load_texture(name)) # create ONLY if missing
    return CACHE[name]
def plant(self, x, y, kind):
    self.trees.append(Tree(x, y, TreeType.of(kind))) # tiny context object`, `static of(name: string): TreeType {
  let t = CACHE.get(name);              // look in the pool
  if (t === undefined) { t = new TreeType(name, loadTexture(name)); CACHE.set(name, t); } // create ONLY if missing
  return t;
}
plant(x: number, y: number, kind: string): void {
  this.trees.push(new Tree(x, y, TreeType.of(kind))); // tiny context object
}`, `static TreeType& of(const string& name) {
  auto it = CACHE.find(name);           // look in the pool
  if (it == CACHE.end()) it = CACHE.emplace(name, TreeType(name, loadTexture(name))).first; // create ONLY if missing
  return it->second;
}
void plant(int x, int y, const string& kind) {
  trees.push_back(Tree(x, y, &TreeType::of(kind))); // tiny context object
}`);

  registerModule({
    id: 'lld05',
    title: 'Structural Design Patterns',
    intro: `<p>Creational patterns decide how objects are <i>born</i>. <b>Structural patterns</b> decide how objects are <b>connected</b>: who wraps whom, who holds whom, and what is shared. This module covers all seven classic structural patterns — <b>Adapter</b>, <b>Decorator</b>, <b>Facade</b>, <b>Proxy</b>, <b>Composite</b>, <b>Bridge</b> and <b>Flyweight</b>. For each one you get an everyday analogy first, then real code in Java, Python, TypeScript and C++ (much of it straight from the standard libraries and frameworks you already use), an animated visualizer of the class structure and of a call travelling through the wrappers, worked examples, a deep dive into production pitfalls, and an AI-era section.</p>
      <p>Interviewers rarely ask you to recite UML. They describe a situation — "integrate a vendor SDK", "toppings in any combination", "lazy-load large images", "millions of map markers" — and watch whether you <b>spot the force</b> and pick the right pattern. So the last topic, the guided problems and the practice set all train exactly that: <i>which pattern fits?</i> — then implement it, compare it with the naive design, and defend the trade-offs.</p>`,
    goals: [
      'Explain each of the 7 structural patterns in one plain sentence, with a real-world analogy and a standard-library or framework example',
      'Tell Adapter, Decorator and Proxy apart by intent (translate vs add vs control access), even though their code looks the same',
      'Spot class explosion and fix it with Decorator (optional add-ons) or Bridge (two independent dimensions)',
      'Model part-whole hierarchies with Composite, including cached aggregates and cycle protection',
      'Cut memory by orders of magnitude with Flyweight by splitting intrinsic and extrinsic state',
      'Write thread-safe lazy, caching and single-flight proxies in Java, Python, TypeScript and C++, and design facades that are thin and testable',
      'Combine several structural patterns in one design (logging library, notification platform) and justify each choice in an interview'
    ],
    prereqs: `<p>LLD 1 (OOP Modelling &amp; UML), LLD 2 (SOLID — especially Open/Closed and Dependency Inversion), LLD 3 (composition over inheritance) and LLD 4 (Creational Patterns — factories create many of the wrappers here). Comfortable Java: interfaces, abstract classes, records, generics, lambdas, and basic <code>ConcurrentHashMap</code>.</p>`,
    hours: 14,
    langNotes: {
      java: `<p><b>Interfaces, abstract classes, sealed types.</b> The Target / Component / Subject / Implementor is an <code>interface</code>; a decorator base class (<code>abstract class FetcherDecorator implements Fetcher</code>) holds the <code>final</code> inner field once so each concrete decorator is a few lines. A class adapter burns your only <code>extends</code>, so default to composition. For a composite, a <code>sealed interface</code> with <code>record</code> leaves lets <code>switch</code> be exhaustive. Put <code>@Override</code> on every implementing method.</p>
      <p><b>Equality, hashing, immutability.</b> A <code>record</code> gives value-based <code>equals</code>/<code>hashCode</code> and final fields, which is exactly what a flyweight needs; intern through a factory so <code>==</code> works, but still compare with <code>equals</code> (<code>Integer</code> is cached only for -128..127). A proxy that must equal its real object should compare by <code>id()</code> against the interface, in both classes, so <code>equals</code> stays symmetric. Wrap collections with <code>List.copyOf</code> or <code>Collections.unmodifiableList</code> (itself a decorator view).</p>
      <p><b>Concurrency and failures.</b> <code>ConcurrentHashMap.compute</code>/<code>computeIfAbsent</code> make get-or-create atomic (do not call slow code inside them); a lazy proxy uses double-checked locking on a <code>volatile</code> field; a single-flight cache stores <code>CompletableFuture</code>s. Inject time as a <code>LongSupplier</code> so tests never sleep. <code>java.lang.reflect.Proxy</code> builds a proxy for any interface; for classes you need a bytecode library, which cannot subclass <code>final</code> types. Recursion is about 10 000 frames deep, so a 100 000-level composite needs an explicit stack.</p>`,
      python: `<p><b>Interfaces and decorators.</b> Use <code>abc.ABC</code> with <code>@abstractmethod</code> for Target / Component / Implementor (a class that forgets a method cannot be instantiated), or <code>typing.Protocol</code> when any object with the right methods should fit. The GoF Decorator is a class that wraps an object of the same interface; do not confuse it with the <code>@decorator</code> syntax, which wraps functions (a good fit for retry, timing and caching around one function). There is no <code>sealed</code>: an ABC plus a <code>Union</code> type hint and <code>match</code> gives a closed set of composite nodes. Python allows several base classes, so a class adapter is possible, but it still leaks the adaptee.</p>
      <p><b>Equality, hashing, immutability.</b> <code>@dataclass(frozen=True)</code> generates <code>__eq__</code> and <code>__hash__</code> and blocks assignment, so it is the natural flyweight and value type; if you define <code>__eq__</code> by hand (a proxy equal to its real object, by id), define <code>__hash__</code> too. <code>is</code> tests identity and <code>==</code> tests value: CPython caches small ints (-5..256) and <code>sys.intern</code> pools strings, but never rely on that in code. <code>__slots__</code> shrinks the per-object context of a flyweight. Keep money in <code>Decimal</code> or integer paise.</p>
      <p><b>Dynamic proxies, threads, limits.</b> <code>__getattr__</code> intercepts attribute access, so a single proxy class can wrap any object (log, time, check permissions) in a dozen lines. Guard a shared <code>dict</code> with <code>threading.Lock</code> for the lookup only, never around the slow call; <code>concurrent.futures.Future</code> gives single-flight (one loader sets the result, everyone else calls <code>result()</code>). Exceptions map as <code>IllegalArgumentException</code> to <code>ValueError</code>, <code>IllegalStateException</code> to <code>RuntimeError</code>, <code>SecurityException</code> to <code>PermissionError</code>. The recursion limit is 1000 frames, so deep composites need an explicit stack.</p>`,
      js: `<p><b>TypeScript.</b> <b>Interfaces and structural typing.</b> An <code>interface</code> is erased at run time and types are structural: any object with the right methods fits, so a fake in a test is an object literal, and an adapter is only needed when the <i>shape</i> really differs. You cannot ask at run time "does this implement <code>Beverage</code>?", and there is no <code>sealed</code>: use a discriminated union (<code>type Node = File | Folder</code> with a <code>kind</code> tag) when you want an exhaustive <code>switch</code>. Use an <code>abstract class</code> for the shared decorator or bridge field. Class names such as <code>Node</code>, <code>Storage</code>, <code>Window</code>, <code>Notification</code>, <code>Console</code> and <code>FileSystem</code> are also DOM or Node globals, so a file that declares them starts with <code>export {};</code> to make it a module.</p>
      <p><b>Equality and immutability.</b> <code>===</code> compares objects by reference and strings and numbers by value, so a flyweight pool needs a <code>Map</code> keyed by a string built from the style fields (for example font, size, bold joined with a separator) and <code>Object.freeze</code> or <code>readonly</code> to stop mutation; the built-in flyweight you can observe is <code>Symbol.for(key)</code>. Number is a double: keep money as integer paise, and format output with <code>toFixed</code> when two languages must print the same text.</p>
      <p><b>Proxies and concurrency.</b> The built-in <code>Proxy</code> object plus <code>Reflect</code> wraps any object (get trap, wrap the functions) which is the dynamic proxy that Java needs reflection for. JavaScript runs one thread, so a synchronous lazy proxy needs no lock; with async loaders, cache the <code>Promise</code> (not the value) so every concurrent caller awaits the same one, and delete the entry on rejection so failures are not cached. Recursion is about 10 000 frames, so a very deep composite needs an explicit stack.</p>`,
      cpp: `<p><b>Interfaces and ownership.</b> An interface is a class of pure virtual functions (<code>= 0</code>) with a <b>virtual destructor</b>; mark implementations <code>override</code> and leaf classes <code>final</code>. A decorator, composite or bridge that owns what it wraps holds a <code>std::unique_ptr&lt;Interface&gt;</code> and takes it by value in the constructor (<code>std::move</code>); when one object is shared by several wrappers (a channel used by many messages, a bundle placed in two carts) take a reference to something that outlives them, or use <code>std::shared_ptr</code>. A flyweight factory owns <code>unique_ptr&lt;const T&gt;</code> values and the contexts keep plain non-owning pointers. A composite's parent pointer is a raw back link; the parent owns the child. Pass polymorphic objects by reference or pointer, never by value (slicing). Avoid names that are C++ keywords: the Java method <code>export()</code> becomes <code>exportText()</code>.</p>
      <p><b>Equality, immutability, views.</b> <code>auto operator&lt;=&gt;(const T&amp;) const = default;</code> gives a value type full comparison and makes it a <code>std::map</code> key. A proxy that must equal its real object needs a <i>free</i> <code>operator==(const Customer&amp;, const Customer&amp;)</code> on the interface so <code>a == b</code> and <code>b == a</code> agree. <code>std::span</code> is a ready-made adapter view over an array, and private inheritance makes a class adapter that does not leak the adaptee. Keep money in <code>long long</code> minor units; format doubles with <code>fixed &lt;&lt; setprecision(n)</code>.</p>
      <p><b>No reflection, threads, limits.</b> C++ cannot build a proxy for an arbitrary interface at run time; a class template (<code>Timed&lt;T&gt;::call</code> taking a member-function pointer) does the same at compile time. Guard a shared map with <code>std::mutex</code> and <code>std::lock_guard</code> for the lookup only; <code>std::call_once</code> loads once and retries if the loader throws, and <code>std::shared_future</code> gives single-flight (<code>get()</code> rethrows the stored exception in every waiter). Never read a <code>std::unordered_map</code> while another thread inserts. The stack is about 8 MB, which is comfortable for recursion on a deep tree but not unlimited.</p>`
    },
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
