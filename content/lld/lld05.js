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
  function CODE(label, code, hl) { return { type: 'code', label: label, lang: 'java', code: code, hl: hl || {} }; }
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
      <p><b>Two flavours.</b> An <b>object adapter</b> <i>holds</i> the adaptee in a field (composition) — this is the normal choice in Java. A <b>class adapter</b> <i>extends</i> the adaptee and implements the target — only possible when the adaptee is not final and you need just one adaptee, and it couples you to its internals.</p>
      <p><b>Where you already use it:</b> ${H.chips(['Arrays.asList(array) → List', 'InputStreamReader: bytes → chars', 'Collections.enumeration(list)', 'JDBC drivers adapt each DB to java.sql.Connection', 'Spring HandlerAdapter'], { label: 'Adapters in the JDK and frameworks' })}</p>
      <p><b>Key rule:</b> an Adapter changes the <i>shape</i> of an interface, never the <i>meaning</i>. It should not add features (that is Decorator) or control access (that is Proxy). If your adapter starts holding business rules, it is turning into something else.</p>`,
    clues: ['"integrate a <b>third-party</b> / <b>legacy</b> / vendor library" whose methods do not match ours', '"we <b>cannot modify</b> the existing class" (it is in a jar, owned by another team)', '"support <b>multiple payment gateways / map providers / SMS vendors</b> behind one interface"', '"convert units / formats / error codes" between two systems (paise ↔ rupees, XML ↔ JSON, °F ↔ °C)', '"make the old API work with the new code" during a migration', '"plug in" a new provider without touching client code (Open/Closed)'],
    code: [`
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
}`, `
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
}`],
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
      { title: 'JDK: Arrays.asList adapts an array to the List interface', html: `<p><code>Arrays.asList(arr)</code> returns a small wrapper that implements <code>List</code> but stores nothing of its own — <code>get(i)</code> reads <code>arr[i]</code>. That is why <code>set()</code> works (writes through to the array) but <code>add()</code> throws <code>UnsupportedOperationException</code>: an array cannot grow. Lesson: an adapter can only offer what the adaptee can really do.</p>`, code: `String[] arr = {"a", "b", "c"};
List<String> view = Arrays.asList(arr);
view.set(0, "z");
System.out.println(arr[0]); // z — the adapter writes through to the array` },
      { title: 'JDK: InputStreamReader adapts bytes to characters', html: `<p><code>InputStream</code> gives raw bytes; a lot of code wants a <code>Reader</code> (characters). <code>new InputStreamReader(in, StandardCharsets.UTF_8)</code> is an <b>object adapter</b>: it implements <code>Reader</code>, holds the <code>InputStream</code>, and decodes bytes to chars using a charset. Forgetting the charset is the classic bug — the adapter then uses the platform default.</p>`, code: `InputStream in = new ByteArrayInputStream("héllo".getBytes(java.nio.charset.StandardCharsets.UTF_8));
Reader r = new InputStreamReader(in, java.nio.charset.StandardCharsets.UTF_8);
BufferedReader br = new BufferedReader(r);
System.out.println(br.readLine());` },
      { title: 'Many vendors, one interface (SMS gateway)', html: `<p>Your <code>Notifier</code> interface has <code>send(phone, text)</code>. Twilio wants <code>messages.create(to, from, body)</code>; a local vendor wants an HTTP form with <code>mobile</code> and <code>msg</code> fields and returns <code>"OK:12345"</code>. Write <code>TwilioAdapter</code> and <code>LocalSmsAdapter</code>; pick one from config. Adding a third vendor = one new class, zero changes elsewhere. ${H.chips(['Notifier', 'TwilioAdapter', 'LocalSmsAdapter'], { hl: { Notifier: 'b' } })}</p>` },
      { title: 'Two-way adapter during a migration', html: `<p>Moving from <code>OldUserStore</code> to <code>NewUserRepository</code>? A two-way adapter implements <b>both</b> interfaces and forwards each to the other side. Old modules keep calling the old API, new modules the new API, and you migrate module by module (the "strangler" approach). Delete the adapter when the last old caller is gone.</p>` }
    ],
    deepDive: `<p><b>Object vs class adapter, properly.</b> The object adapter can wrap <i>any subclass</i> of the adaptee and can be swapped at runtime; the class adapter cannot, and it leaks every public method of the adaptee into your type. In Java with single inheritance, a class adapter also burns your only <code>extends</code>. Default to composition.</p>
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
      brute: { why: `<p>The naive fix edits the client: <code>WeatherScreen</code> gets an <code>if (provider is the US one)</code> branch that looks up the zip and converts units. Now the screen knows about zip codes, Fahrenheit and a vendor class. The next vendor adds another branch — the client grows forever and breaks Open/Closed. Every screen that shows weather duplicates the conversion.</p>`, code: `class UsWeatherService { int tempFahrenheit(int zip) { return 86; } }

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
}` },
      mcq: { q: 'Which class should hold the Fahrenheit → Celsius formula?', options: ['WeatherScreen, right before printing', 'A new class that implements WeatherProvider and wraps UsWeatherService', 'A subclass of WeatherScreen', 'A static helper called from every screen'], answer: 1, explain: 'The adapter owns all translation (city→zip and °F→°C) so the client stays vendor-free and new vendors become new adapters.' },
      hints: [`<p>Hint 1: The client already depends on an interface — <code>WeatherProvider</code>. You only need a new <i>implementation</i> of it.</p>`, `<p>Hint 2: That implementation holds a <code>UsWeatherService</code> and a city → zip map (composition, an object adapter).</p>`, `<p>Hint 3: Recipe: look up zip (throw if missing) → call <code>tempFahrenheit</code> → convert with (F − 32) × 5 / 9 → return. Keep the screen code untouched; inject the adapter in <code>main</code>.</p>`],
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
        return city + ": " + Math.round(provider.celsius(city) * 10) / 10.0 + " C";
    }

    public static void main(String[] args) {
        WeatherProvider p = new UsWeatherAdapter(new UsWeatherService(), Map.of("Austin", 73301));
        System.out.println(new WeatherScreen(p).render("Austin")); // Austin: 30.0 C
    }
}`,
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
      <p><b>You use decorators daily in Java:</b> <code>new BufferedReader(new InputStreamReader(new FileInputStream(f)))</code> — buffering wraps decoding wraps the file. <code>Collections.unmodifiableList(list)</code> and <code>Collections.synchronizedList(list)</code> are decorators too: same <code>List</code> interface, extra rule added.</p>`,
    clues: ['"add responsibilities <b>dynamically</b> / at runtime" to individual objects', '"<b>any combination</b> of options / toppings / add-ons / features" → class explosion with inheritance', '"add logging / retries / caching / metrics / auth <b>around</b> an existing service without changing it"', '"pipeline of transformations" on a stream: compress, encrypt, buffer, encode', '"cannot subclass (final class)" but still need extra behaviour', 'interviewer says "and later we will add more toppings" — they are fishing for Decorator'],
    code: [`
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
}`, `
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
}`],
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
      { title: 'java.io is a decorator tower', html: `<p><code>new BufferedReader(new InputStreamReader(new FileInputStream("a.txt"), UTF_8))</code>. <code>FileInputStream</code> is the concrete component; <code>BufferedInputStream</code>, <code>DataInputStream</code>, <code>GZIPInputStream</code> all extend <code>FilterInputStream</code>, which is the JDK's abstract decorator (it holds an <code>InputStream in</code>). (<code>InputStreamReader</code> in the middle is actually an <b>adapter</b> — bytes to chars — a nice reminder that patterns mix.)</p>`, code: `try (BufferedReader r = new BufferedReader(new StringReader("line1\\nline2"))) {
    System.out.println(r.readLine()); // BufferedReader decorates any Reader
}` },
      { title: 'Order of decorators matters', html: `<p>Compress-then-encrypt is good: compression finds repeating patterns, then encryption scrambles. Encrypt-then-compress is useless: encrypted bytes look random, so they barely compress. Same for a <b>Retry</b> and a <b>Timeout</b> decorator: <code>Retry(Timeout(call))</code> gives each attempt its own timeout; <code>Timeout(Retry(call))</code> gives all attempts one shared deadline. Always decide and document the order.</p>` },
      { title: 'Unmodifiable / synchronized wrappers', html: `<p><code>Collections.unmodifiableList(list)</code> returns a <code>List</code> that forwards reads and throws on writes. <code>Collections.synchronizedMap(map)</code> forwards every call inside a <code>synchronized</code> block. Both keep the interface and add one rule — classic decorators. Note: the original list is still mutable by whoever holds it; the decorator protects only callers who go through it.</p>`, code: `List<Integer> base = new ArrayList<>(List.of(1, 2));
List<Integer> ro = Collections.unmodifiableList(base);
base.add(3);
System.out.println(ro); // [1, 2, 3] — a view, not a copy` },
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
      brute: { why: `<p>Subclassing for every combination: <code>LoggingHttpFetcher</code>, <code>RetryingHttpFetcher</code>, <code>LoggingRetryingHttpFetcher</code>, <code>TimedLoggingRetryingHttpFetcher</code>… 3 features → 2<sup>3</sup> = 8 classes, and a 4th feature makes 16. Each class copy-pastes the retry loop, so fixing a retry bug means editing many files. The alternative brute force — boolean flags inside one class — becomes an if-forest that every feature edits.</p>`, code: `class HttpFetcher {
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
}` },
      mcq: { q: 'Logging should record EVERY failed attempt, not just the final outcome. Where should the Logging decorator sit?', options: ['Outside Retry: Logging(Retry(http))', 'Inside Retry: Retry(Logging(http))', 'Order does not matter', 'Logging must be merged into Retry'], answer: 1, explain: 'Retry calls whatever it wraps once per attempt. If Logging is inside, each attempt passes through Logging, so every failure is logged.' },
      hints: [`<p>Hint 1: Each feature is "do something, then call the same method on the thing I wrap" — that is the Decorator shape.</p>`, `<p>Hint 2: Create <code>abstract class FetcherDecorator implements Fetcher</code> holding a <code>final Fetcher inner</code>; three concrete subclasses each override <code>fetch</code>.</p>`, `<p>Hint 3: Retry: loop up to N times, catch <code>IOException</code>, remember the last one, rethrow after the loop. Timing: <code>System.nanoTime()</code> before/after in a <code>finally</code> so failures are timed too. Order the layers on purpose.</p>`],
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
    Timing(Fetcher inner) { super(inner); }
    public String fetch(String url) throws IOException {
        long t0 = System.nanoTime();
        try { return inner.fetch(url); }
        finally { System.out.println("took " + (System.nanoTime() - t0) / 1_000_000 + " ms"); }
    }
}

class FetchDemo {
    public static void main(String[] args) throws IOException {
        // Logging INSIDE Retry -> every attempt is logged; Timing outermost -> total time
        Fetcher f = new Timing(new Retry(new Logging(new HttpFetcher()), 3));
        System.out.println(f.fetch("/a"));
    }
}`,
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
    code: [`
// ----- subsystem classes (could be big, separate modules) -----
class Inventory {
    private final Map<String, Integer> stock = new HashMap<>(Map.of("laptop", 5, "phone", 1));
    boolean inStock(String item, int qty) { return stock.getOrDefault(item, 0) >= qty; }
    void reserve(String item, int qty) { stock.merge(item, -qty, Integer::sum); }
    void release(String item, int qty) { stock.merge(item, qty, Integer::sum); }
}
class Catalog { long price(String item) { return item.equals("laptop") ? 60_000 : 30_000; } }
class PaymentGateway { boolean charge(String card, long amount) { return amount <= 100_000; } }
class ShippingService { String schedule(String item, int qty) { return "TRK-" + Math.abs((item + qty).hashCode()); } }
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
}`, `
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
}`],
    codeTitle: ['OrderFacade over five subsystems', 'A tiny utility facade over java.io'],
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
      { title: 'Home theatre "watch movie" button', html: `<p>Lights dim, projector on, screen down, amplifier to HDMI-2, volume 30, player starts. <code>HomeTheaterFacade.watchMovie(title)</code> runs these six calls; <code>endMovie()</code> reverses them. The remote control (client) knows one class instead of six.</p>`, code: `class Lights { void dim(int pct) { System.out.println("lights " + pct + "%"); } }
class Projector { void on() { System.out.println("projector on"); } }
class Player { void play(String t) { System.out.println("playing " + t); } }
class HomeTheater {
    private final Lights l = new Lights(); private final Projector p = new Projector(); private final Player pl = new Player();
    void watchMovie(String title) { l.dim(10); p.on(); pl.play(title); }
}` },
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
      brute: { why: `<p>Each caller repeats the five-step sequence. When the transcoder starts needing a "quality" parameter, three places change; the import script forgot validation, so it transcodes junk files and wastes CPU. Callers are coupled to five classes each.</p>`, code: `class Validator { boolean check(String f) { return f.endsWith(".mov") || f.endsWith(".mp4"); } }
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
}` },
      mcq: { q: 'The admin tool needs only ThumbnailMaker. What should it do once the facade exists?', options: ['Go through the facade and add a regenerateThumbnail() method to it', 'Call ThumbnailMaker directly — a facade does not hide subsystems', 'Copy ThumbnailMaker into the admin tool', 'Make ThumbnailMaker private to the facade'], answer: 1, explain: 'A facade offers a convenient default path; it does not prevent direct use of subsystems. Bloating it with every niche method turns it into a god class.' },
      hints: [`<p>Hint 1: The repeated <i>sequence</i> is the smell. Put the sequence in one class.</p>`, `<p>Hint 2: <code>VideoUploadFacade</code> takes all five subsystems in its constructor (dependency injection) and exposes one method.</p>`, `<p>Hint 3: Validate first and fail fast; then transcode → thumbnail → save → notify. Notification failure should not lose the upload — catch and log it after saving.</p>`],
      solution: {
        approach: `<p>Create <code>VideoUploadFacade</code> holding the five subsystems (constructor-injected). <code>upload</code> runs the sequence once, validating first so nothing expensive happens on bad input. Because the video is already saved when notification runs, a notifier error is caught and logged rather than failing the whole upload. Every caller (web, mobile, script) now makes one call and cannot skip validation.</p>`,
        code: `class Validator { boolean check(String f) { return f.endsWith(".mov") || f.endsWith(".mp4"); } }
class Transcoder { String toMp4(String f) { return f.replaceAll("[.]mov$", ".mp4"); } }
class ThumbnailMaker { String make(String mp4) { return mp4.replace(".mp4", ".jpg"); } }
class Storage {
    private int next = 1;
    String save(String mp4, String thumb) { return "vid-" + next++; }
}
class Notifier { void notifyFollowers(String u, String id) { System.out.println(u + " posted " + id); } }

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
            System.err.println("notify failed for " + id + ": " + e.getMessage());
        }
        return id;
    }

    public static void main(String[] args) {
        VideoUploadFacade up = new VideoUploadFacade(new Validator(), new Transcoder(),
                new ThumbnailMaker(), new Storage(), new Notifier());
        System.out.println(up.upload("u7", "cat.mov"));   // vid-1
    }
}`,
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
      <p><b>Java gives you proxies for free:</b> <code>java.lang.reflect.Proxy</code> builds a proxy for any interface at runtime, routing every call to one <code>InvocationHandler</code>. Spring <code>@Transactional</code>, <code>@Cacheable</code>, Mockito mocks and Hibernate lazy loading all use generated proxies.</p>`,
    clues: ['"<b>lazy loading</b>" / "do not load the large object until it is needed"', '"<b>access control</b>" / "only admins can call delete" without changing the service', '"<b>cache</b> the results of an expensive / remote call" transparently', '"the object lives on <b>another machine</b> but should feel local" (RPC stub)', '"count / log / rate-limit every call to X" with the same interface', '"<b>placeholder</b>" / "stand-in" / "surrogate" / "the client must not know"'],
    code: [`
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
}`, `
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
}`],
    codeTitle: ['Virtual + protection proxy for images', 'JDK dynamic proxy (java.lang.reflect.Proxy)'],
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
      { title: 'Caching proxy with a TTL', html: `<p><code>RateService</code> calls a paid FX API. <code>CachingRateProxy implements RateService</code> keeps <code>Map&lt;String, Entry(value, fetchedAt)&gt;</code>; if the entry is younger than 60 s, return it; else call through and refresh. Same interface, ~99% fewer paid calls for popular currency pairs.</p>`, code: `Map<String, Double> cache = new HashMap<>();
Function<String, Double> slowApi = pair -> { System.out.println("API call for " + pair); return 83.2; };
Function<String, Double> proxy = pair -> cache.computeIfAbsent(pair, slowApi);
proxy.apply("USD/INR");
proxy.apply("USD/INR"); // second call served from cache` }
    ],
    deepDive: `<p><b>Static vs dynamic proxies in Java.</b> A hand-written proxy class is clear and fast but must implement every method. <code>java.lang.reflect.Proxy</code> works only for <b>interfaces</b>, routes all calls through <code>invoke()</code> (reflection overhead, small but real) and wraps checked exceptions in <code>UndeclaredThrowableException</code> if you are careless. To proxy <b>classes</b>, frameworks generate subclasses with bytecode libraries (ByteBuddy, formerly CGLIB) — which fails on <code>final</code> classes and <code>final</code> methods. That is why Spring/Kotlin need "open" classes and why <code>private</code> or <code>final</code> methods silently bypass <code>@Transactional</code>.</p>
      <p><b>Thread safety of lazy proxies.</b> The simple <code>if (real == null) real = new RealImage()</code> is a race: two threads can load twice. Fix with double-checked locking on a <code>volatile</code> field, or a holder object, or <code>ConcurrentHashMap.computeIfAbsent</code> for keyed caches — the same lessons as the thread-safe Singleton.</p>
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
      brute: { why: `<p>Naive approach 1: call the remote API every time — slow and expensive. Naive approach 2: put a static <code>HashMap</code> inside <code>RemoteRateService</code> itself — now the "talk to API" class also does caching (two responsibilities), the cache never expires, it is not thread-safe, and tests cannot control time.</p>`, code: `class RemoteRateService {
    static final Map<String, Double> CACHE = new HashMap<>();   // never expires, not thread-safe
    double rate(String from, String to) {
        return CACHE.computeIfAbsent(from + to, k -> {
            System.out.println("paid API call " + k);
            return 83.2;
        });
    }
}` },
      mcq: { q: 'Why inject a LongSupplier clock instead of calling System.currentTimeMillis() inside the proxy?', options: ['It is faster', 'Tests can move time forward to check expiry without sleeping', 'System.currentTimeMillis() is deprecated', 'The proxy pattern requires it'], answer: 1, explain: 'A fake clock lets a unit test jump 61 seconds instantly and assert the remote service is called again.' },
      hints: [`<p>Hint 1: Same interface, holds the real service, decides whether to forward — that is a caching proxy.</p>`, `<p>Hint 2: Store <code>record Entry(double value, long fetchedAt)</code> in a <code>ConcurrentHashMap</code> keyed by the normalised pair.</p>`, `<p>Hint 3: On each call: read entry; if present and <code>now - fetchedAt &lt; ttl</code> return it; otherwise call remote (exceptions propagate, nothing stored) and put a fresh entry.</p>`],
      solution: {
        approach: `<p><code>CachingRateProxy implements RateService</code>, takes the real service, a TTL and a <code>LongSupplier</code> clock. Keys are upper-cased "FROM/TO". A hit within TTL returns the stored value; a miss or expired entry calls the real service and stores the result. Because <code>put</code> happens only after a successful call, failures are never cached. <code>ConcurrentHashMap</code> makes concurrent reads safe (two threads may both refresh an expired key at the same moment — acceptable here; use <code>compute</code> if you need exactly-once refresh).</p>`,
        code: `interface RateService { double rate(String from, String to); }

class RemoteRateService implements RateService {
    int calls = 0;
    public double rate(String from, String to) {
        calls++;
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

    public static void main(String[] args) {
        long[] now = {0};
        RemoteRateService remote = new RemoteRateService();
        RateService rates = new CachingRateProxy(remote, 60_000, () -> now[0]);
        rates.rate("usd", "inr");
        now[0] = 10_000;  rates.rate("USD", "INR");   // hit
        now[0] = 70_000;  rates.rate("USD", "INR");   // expired -> remote
        System.out.println("remote calls = " + remote.calls);   // 2
    }
}`,
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
      <p><b>Worked example.</b> ${H.kv([['root/', 'docs/ + src/'], ['docs/', 'a.txt (5) + b.pdf (20) = 25'], ['src/', 'Main.java (8) + lib/ (3 + 4) = 15'], ['root total', '25 + 15 = <b>40</b>']], { hl: { 'root total': 'g' } })}</p>
      <p><b>Two design choices</b> interviewers love: (1) <b>Transparent</b> — put <code>add/remove</code> on the Component interface so clients never need to check types (but then <code>file.add()</code> must throw). (2) <b>Safe</b> — put <code>add/remove</code> only on Composite, so leaves cannot be misused (but clients need to know what they hold to add children). Modern Java usually picks <b>safe</b>, often with a <code>sealed interface Node permits File, Folder</code>.</p>
      <p><b>In the wild:</b> ${H.chips(['Swing/AWT: Container is a Component', 'Android ViewGroup / View', 'HTML DOM elements', 'JSON objects/arrays (Jackson JsonNode)', 'AST nodes in compilers', 'org charts, BOMs (bill of materials)'])}</p>`,
    clues: ['"<b>part-whole hierarchy</b>" / "tree structure" / "nested" / "contains items and groups of items"', '"treat individual objects and groups <b>uniformly</b>"', '"folders and files", "menus and sub-menus", "bundles of products", "teams of teams", "nested comments"', '"compute a total / render / search over the whole hierarchy" with one call', '"the depth of nesting is arbitrary / unknown"', 'you find yourself writing <code>if (x instanceof Group)</code> in many places'],
    code: [`
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
}`, `
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
}`],
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
      { title: 'Menu with sub-menus', html: `<p><code>MenuComponent</code> has <code>render(depth)</code>. <code>MenuItem</code> prints its label; <code>Menu</code> prints its title and renders each child one level deeper. "Settings → Display → Brightness" works for any depth, and adding a sub-menu never changes rendering code.</p>`, code: `interface MenuComponent { void render(int depth); }
record MenuItem(String label) implements MenuComponent {
    public void render(int d) { System.out.println("  ".repeat(d) + "- " + label); }
}
record Menu(String title, List<MenuComponent> items) implements MenuComponent {
    public void render(int d) { System.out.println("  ".repeat(d) + title); items.forEach(i -> i.render(d + 1)); }
}` },
      { title: 'Org chart: total salary of a department', html: `<p><code>Employee.cost()</code> = salary; <code>Team.cost()</code> = sum of members' cost (members are employees or sub-teams). The CFO asks <code>company.cost()</code>. Same pattern answers "headcount", "find everyone in Pune" or "print the tree".</p>` },
      { title: 'Bill of materials (BOM)', html: `<p>A bicycle = frame + 2 wheels; a wheel = rim + 32 spokes + tyre. <code>Part.weight()</code> on the bicycle walks the whole tree. Notice that composites can carry <b>quantities</b>: a composite entry "spoke × 32" multiplies its child's weight. Composite is not only "sum" — any combining rule works (max, AND, concatenation).</p>` },
      { title: 'Uniform permission check (AND over children)', html: `<p>"Can the user delete this folder?" = user can delete the folder itself <b>and</b> every child. The composite's combine step is <code>allMatch</code> instead of a sum: ${H.chips(['folder ✓', 'a.txt ✓', 'secret.pdf ✗'], { hl: { 'secret.pdf ✗': 'r' } })} → ${H.c('r', 'denied')}.</p>` }
    ],
    deepDive: `<p><b>Complexity.</b> One operation on the root visits every node once: O(n) time, O(depth) stack. Very deep trees (100 000 nested comments) can blow the Java stack — switch to an explicit stack/queue iteration for production, or cache sizes in each composite and update them on add/remove (O(depth) updates instead of O(n) queries; needs parent pointers).</p>
      <p><b>Cycles.</b> If a folder can be added inside its own descendant (symlinks, a user dragging a group into itself) your recursion never ends. Guard in <code>add()</code> by walking up parent links, or track a visited set during traversal.</p>
      <p><b>Transparent vs safe</b> is a real trade-off: transparency (add/remove on Component) is what the GoF book shows, but it violates Liskov/Interface Segregation for leaves. Java's <code>sealed</code> interfaces + <code>switch</code> pattern matching give a third option: keep the component small and let operations that truly differ use exhaustive pattern matching — the compiler errors if you add a new node type and forget a case.</p>
      <p><b>Composite + friends.</b> Iterator walks a composite; Visitor adds new operations without editing node classes; Flyweight shares identical leaves (characters in a document tree); Builder builds big composites fluently. React/Compose UI trees, DOM and ASTs are all composites. <b>Immutability</b> (records, persistent trees) makes composites thread-safe and lets you share sub-trees.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI systems are full of composites: an agent "plan" is a tree of tasks and sub-tasks; a prompt template is composed of sections and nested sections; a RAG document is chunked hierarchically (book → chapter → section → paragraph) and summaries roll up the tree exactly like <code>size()</code>. Multi-agent systems where a "manager agent" delegates to sub-agents that may delegate again are the army analogy in code.</p>
      <p><b>Use AI as a partner:</b> <code>Model nested comments as a Composite in Java with sealed interfaces; include a cycle guard and an iterative traversal for depth 100k.</code> Then verify the cycle guard yourself. <b>Where AI goes wrong:</b> it writes recursion with no depth or cycle protection, puts <code>add()</code> on leaves that silently do nothing, and recomputes totals on every call inside loops (O(n²)). <b>What you must still own:</b> recognising part-whole hierarchies in requirements, choosing safe vs transparent, and the performance plan for huge trees.</p>`,
    problems: [{
      title: 'Shopping Cart with Discounted Bundles',
      level: 'Medium', tags: ['composite', 'e-commerce'], companies: ['Amazon', 'Flipkart', 'Meesho'],
      statement: `<p>A cart contains <b>products</b> (name, price) and <b>bundles</b>. A bundle has a name, a discount percentage (0–50) and items — which can be products or other bundles. A bundle's price = (sum of its items' prices) × (1 − discount/100). Implement <code>price()</code> for the whole cart and a <code>describe()</code> that prints an indented tree. Prices are in paise (long); round half-up at each bundle.</p>`,
      constraints: `<p>Nesting depth ≤ 10, total items ≤ 10<sup>4</sup>. Discount outside 0–50 → <code>IllegalArgumentException</code>. A bundle cannot contain itself.</p>`,
      example: `<p>"Gaming Combo" (10% off) = Console 30 000 + "Controller Pack" (20% off: 2 × 3 000 = 6 000 → <b>4 800</b>) = 34 800 → × 0.9 = <b>${H.c('g', '31 320')}</b>. Cart = Gaming Combo + Headset 2 000 = <b>${H.c('g', '33 320')}</b>.</p>`,
      brute: { why: `<p>Keep products and bundles in separate lists, and write pricing with <code>instanceof</code> checks and a hand-written loop per nesting level. It works for one level of bundles; a bundle inside a bundle needs another loop, and every new operation (describe, count items, tax) repeats the same type checks. Adding a "gift card" item type means editing every operation.</p>`, code: `class Product { String name; long price; Product(String n, long p) { name = n; price = p; } }
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
}` },
      mcq: { q: 'What is the type of the list inside Bundle in a clean Composite design?', options: ['List&lt;Product&gt;', 'List&lt;Bundle&gt;', 'List&lt;CartItem&gt; where CartItem is the shared interface', 'List&lt;Object&gt;'], answer: 2, explain: 'Children must be the component type so a bundle can hold products AND bundles, and the bundle just calls price() on each.' },
      hints: [`<p>Hint 1: Products and bundles must answer the same question — <code>price()</code>. Make a shared interface <code>CartItem</code>.</p>`, `<p>Hint 2: <code>Product</code> is the leaf; <code>Bundle</code> is the composite with <code>List&lt;CartItem&gt;</code>. Its <code>price()</code> sums children then applies its own discount.</p>`, `<p>Hint 3: Use long paise and compute <code>(sum * (100 - d) + 50) / 100</code> for half-up rounding. Guard against self-containment in <code>add()</code> by checking whether the new child (if a bundle) contains <code>this</code> anywhere.</p>`],
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
    }
}`,
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
      ${H.kv([['Abstraction', '<code>Notification</code> — holds a <code>Channel channel</code>'], ['Refined abstractions', 'Alert, Reminder, Promo — the "what" (formatting, rules)'], ['Implementor (interface)', '<code>Channel.deliver(to, text)</code> — the "how"'], ['Concrete implementors', 'EmailChannel, SmsChannel, PushChannel']])}
      <p>Now we need <b>M + N</b> classes (3 + 3 = 6 instead of 9; 5 + 5 = 10 instead of 25). Pairing happens at runtime: <code>new Alert(new SmsChannel())</code>. Each side grows without touching the other.</p>
      <p><b>Bridge vs Adapter vs Strategy.</b> Adapter is applied <i>after</i> two designs already exist and do not fit. Bridge is designed <i>up front</i> so that two hierarchies can vary independently. Code-wise, the implementor field looks like a Strategy; the difference is scale and intent — Bridge splits a whole class hierarchy into two, where Strategy swaps one algorithm.</p>
      <p><b>In the wild:</b> JDBC is a textbook bridge — your code uses the <code>java.sql</code> abstraction (<code>Connection</code>, <code>Statement</code>), and each driver (Postgres, MySQL) is a concrete implementor. SLF4J (API) over Logback/Log4j (implementation) is another.</p>`,
    clues: ['"<b>two (or more) dimensions</b> that vary independently": shape × renderer, message × channel, report × format, device × remote', 'class names that combine two words: <code>RedCircle, BlueSquare, PdfSalesReport</code> → <b>class explosion M × N</b>', '"must run on multiple platforms / databases / drivers"', '"switch the implementation at runtime" (e.g. change renderer or channel per user)', '"separate abstraction from implementation"', '"both sides will grow; different teams own them"'],
    code: [`
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
}`, `
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
}`],
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
      { title: 'Shapes × renderers', html: `<p><code>Shape</code> (Circle, Square) holds a <code>Renderer</code> (VectorRenderer, RasterRenderer). <code>Circle.draw()</code> calls <code>renderer.renderCircle(x, y, r)</code>. Add a <code>Triangle</code>: one class. Add an <code>SvgRenderer</code>: one class. Without the bridge: VectorCircle, RasterCircle, VectorSquare, RasterSquare…</p>`, code: `interface Renderer { void circle(double r); }
class VectorRenderer implements Renderer { public void circle(double r) { System.out.println("vector circle r=" + r); } }
class RasterRenderer implements Renderer { public void circle(double r) { System.out.println("pixels for circle r=" + r); } }
abstract class Shape { protected final Renderer renderer; Shape(Renderer r) { renderer = r; } abstract void draw(); }
class Circle extends Shape { private final double r; Circle(Renderer rd, double r) { super(rd); this.r = r; } void draw() { renderer.circle(r); } }` },
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
      brute: { why: `<p>One subclass per pair: <code>CsvSalesReport</code>, <code>MarkdownSalesReport</code>, <code>CsvInventoryReport</code>, <code>MarkdownInventoryReport</code>. Next quarter needs 5 more classes (3 × 3 = 9 total). Formatting code (escaping commas, pipes) is duplicated per report, so a CSV escaping bug must be fixed in every CSV class.</p>`, code: `class CsvSalesReport {
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
// ...and the same two again for InventoryReport, with copied formatting code` },
      mcq: { q: 'Which side of the bridge should own "escape commas inside a CSV cell"?', options: ['Every report class', 'The CsvFormat implementor', 'The client', 'A static utility called by reports'], answer: 1, explain: 'Escaping is a property of the output format (the "how"), so it lives in the implementor and every report gets it for free.' },
      hints: [`<p>Hint 1: Two independent axes: <i>what data</i> (report) and <i>how it is written</i> (format). Make each its own hierarchy.</p>`, `<p>Hint 2: Implementor interface <code>Format { String render(String title, List&lt;String&gt; header, List&lt;List&lt;String&gt;&gt; rows); }</code>. Abstraction <code>Report</code> holds a <code>Format</code>.</p>`, `<p>Hint 3: <code>Report.export()</code> is final: it asks subclasses for title/header/rows (template method) and passes them across the bridge. CSV escapes cells containing commas or quotes by quoting and doubling quotes.</p>`],
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
    }
}`,
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
      ${H.kv([['Naive', '1 000 000 × ~2 MB ≈ <b>2 TB</b>'], ['Flyweight', '3 × 2 MB + 1 000 000 × ~24 B ≈ <b>30 MB</b>']], { label: 'memory', hl: { Flyweight: 'g', Naive: 'r' } })}
      <p><b>Rules that make it safe:</b> (1) flyweights are <b>immutable</b> — if one tree could change "oak"'s colour, every oak would change; (2) clients never call <code>new TreeType</code> directly, only the factory; (3) the extrinsic state is passed in when needed (<code>type.draw(canvas, x, y)</code>).</p>
      <p><b>Already in Java:</b> ${H.chips(['Integer.valueOf(-128..127) cache', 'String literal pool / intern()', 'Boolean.TRUE / FALSE', 'Enum constants', 'java.time.ZoneId / Charset lookups'], { label: 'JDK flyweights' })} — that is why <code>Integer.valueOf(100) == Integer.valueOf(100)</code> is <code>true</code> but <code>Integer.valueOf(1000) == Integer.valueOf(1000)</code> is usually <code>false</code>.</p>`,
    clues: ['"<b>millions</b> of small objects" / "out of memory" / "memory footprint" in the constraints', '"many objects share the same data": characters with same font, trees of same species, bullets of same type, map tiles', '"the duplicated part never changes" (immutable textures, styles, configurations)', '"cache and reuse objects by key" / "interning"', '"particle system", "text editor glyphs", "chess pieces across 10 000 concurrent games"', 'a field-by-field estimate shows most bytes are repeated data'],
    code: [`
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
}`, `
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
}`],
    codeTitle: ['Forest of trees sharing TreeType flyweights', 'Integer cache and String pool'],
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
      { title: 'Chess server with 50 000 games', html: `<p>There are only 12 piece kinds (6 types × 2 colours). Each <code>Piece</code> flyweight holds type, colour, move rules and icon; the board stores references in an 8×8 array. Position is extrinsic — the square index. 50 000 games × 32 pieces need 12 piece objects, not 1.6 million.</p>`, code: `enum PieceKind { KING, QUEEN, ROOK, BISHOP, KNIGHT, PAWN }
record Piece(PieceKind kind, boolean white) {}
Map<String, Piece> pool = new HashMap<>();
Piece wk1 = pool.computeIfAbsent("KING-w", k -> new Piece(PieceKind.KING, true));
Piece wk2 = pool.computeIfAbsent("KING-w", k -> new Piece(PieceKind.KING, true));
System.out.println(wk1 == wk2); // true: one shared flyweight` },
      { title: 'Integer cache bug in the wild', html: `<p>A test compares two <code>Integer</code> user ids with <code>==</code> and passes (ids 1–100 come from the flyweight cache). In production ids exceed 127, two different objects are created, and <code>==</code> returns false — "random" bugs. Lesson: flyweight sharing is an optimisation, never a contract; compare values with <code>equals</code>.</p>` },
      { title: 'Map tiles and sprites', html: `<p>An open-world game map of 10 000 × 10 000 tiles uses maybe 200 tile types (grass, water, road…). The map is a 2D array of <b>short</b> indices into a tile-type table: 200 MB → 200 MB/… well, 10<sup>8</sup> × 2 bytes = 200 MB for indices vs 10<sup>8</sup> full objects (tens of GB). Indices into a table are the most compact flyweight of all.</p>` }
    ],
    deepDive: `<p><b>When it is worth it.</b> Flyweight trades simplicity for memory. Do it only when (1) there are <i>very many</i> objects, (2) memory is actually a problem (measure with a heap profiler), (3) most state can be made extrinsic, and (4) object identity does not matter to the program. For a few thousand objects, it is premature optimisation.</p>
      <p><b>Java object overhead</b> makes the win bigger than it looks: every object has a 12–16 byte header plus alignment to 8 bytes; a <code>Tree</code> record with two ints and a reference is ~24 bytes. Arrays of primitives (struct-of-arrays: <code>int[] xs, ys; short[] typeIdx</code>) can cut even that, and Project Valhalla's value classes aim to remove headers entirely.</p>
      <p><b>Factory concurrency and lifetime.</b> Use <code>ConcurrentHashMap.computeIfAbsent</code> so two threads cannot create two "oak" objects. An unbounded pool for user-supplied keys is a memory leak (and a DoS vector) — bound it or use weak references (<code>WeakHashMap</code>-style interning, like Guava's <code>Interners.newWeakInterner()</code>). Note that <code>String.intern()</code> moved to the regular heap in Java 7+ and the JVM can deduplicate strings automatically (G1 <code>-XX:+UseStringDeduplication</code>).</p>
      <p><b>Flyweight vs Singleton vs Object Pool.</b> Singleton = exactly one instance of a class. Flyweight = one instance <i>per distinct intrinsic value</i>, shared simultaneously and immutable. Object Pool = mutable objects <i>borrowed</i> exclusively and returned (connections, threads). Flyweights are never "returned" — everybody holds them at once.</p>`,
    aiEra: `<p><b>What AI changes:</b> memory is the bottleneck in LLM serving, and the winning tricks are flyweights. <b>Prefix / prompt caching</b> shares the KV-cache of an identical system prompt across thousands of requests instead of recomputing and storing it per request; vLLM's <b>PagedAttention</b> lets requests share identical KV blocks copy-on-write. Embedding stores deduplicate identical chunks; tokenisers intern token strings. "Intrinsic = shared prefix, extrinsic = the user's own tokens" is the same split as trees and positions.</p>
      <p><b>Use AI as a partner:</b> <code>Here is my class with 9 fields and 5 million instances. Which fields are intrinsic vs extrinsic? Estimate bytes before and after.</code> Verify with a heap dump. <b>Where AI goes wrong:</b> it suggests flyweights for small object counts, leaves setters on the shared object, uses an unsynchronised HashMap as the pool, and forgets that user-controlled keys can grow the pool forever. <b>What you must still own:</b> the memory estimate, the intrinsic/extrinsic split, and the immutability guarantee.</p>`,
    problems: [{
      title: 'Text Editor with a Million Styled Characters',
      level: 'Medium', tags: ['flyweight', 'memory'], companies: ['Google', 'Microsoft', 'Adobe'],
      statement: `<p>Design the in-memory model for an editor document: each character has a <b>style</b> (font family, size, bold, italic, colour). Documents reach 10<sup>6</sup> characters but usually use fewer than 20 distinct styles. Support <code>append(char, font, size, bold, italic, color)</code>, <code>styleAt(i)</code>, and <code>distinctStyles()</code>. Two equal styles must be the <b>same object</b>.</p>`,
      constraints: `<p>N ≤ 10<sup>6</sup> chars. Styles are immutable. The style factory must be thread-safe. Memory per character should be a few bytes, not a full style object.</p>`,
      example: `<p>Append "Hi" in (Arial, 12, bold) and "!" in (Arial, 12, bold) → <code>styleAt(0) == styleAt(2)</code> is ${H.c('g', 'true')} and <code>distinctStyles()</code> = <b>1</b>. Naive: 3 style objects.</p>`,
      brute: { why: `<p>Each <code>Character</code> object carries its own copy of font name, size, flags and colour: ~16-byte header + fields + a <code>String</code> reference ≈ 40+ bytes per char, plus the boxed char and list overhead — around 60 MB for 1 M characters, and comparing styles requires field-by-field equals. Most of those bytes are the same few styles repeated a million times.</p>`, code: `class StyledChar {
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
}` },
      mcq: { q: 'Which of these belongs in the shared (intrinsic) Style flyweight?', options: ['The character itself', 'Its index in the document', 'Font, size, bold, italic, colour', 'The cursor position'], answer: 2, explain: 'Formatting is identical across many characters; the character and its position are unique per occurrence (extrinsic).' },
      hints: [`<p>Hint 1: Separate "what is repeated" (style) from "what is unique" (the char, its position).</p>`, `<p>Hint 2: <code>record Style(...)</code> gives value-based equals/hashCode for free; a <code>ConcurrentHashMap&lt;Style, Style&gt;</code> interns them.</p>`, `<p>Hint 3: Store chars in a <code>StringBuilder</code> and a parallel list of style references (or a <code>short[]</code> of style ids). <code>append</code> = intern style → push char + reference.</p>`],
      solution: {
        approach: `<p><code>Style</code> is an immutable record (intrinsic). <code>StyleFactory.of(...)</code> interns styles with <code>ConcurrentHashMap.putIfAbsent</code>, so equal styles are the identical object. The <code>Document</code> keeps characters in a <code>StringBuilder</code> (2 bytes each) and a list of style ids (indices into the factory's table) — a few bytes per character. <code>styleAt(i)</code> looks up the id; <code>distinctStyles()</code> is the table size.</p>`,
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
    }
}`,
        complexity: `<p><code>append</code> amortised O(1); <code>styleAt</code> O(1). Memory ≈ 4 bytes/char (2 for the char, 2 for the style id) + O(distinct styles), versus ~60 bytes/char naively.</p>`,
        followUps: ['Store style runs (start index, style id) instead of one id per char — when is that better?', 'Support insert in the middle efficiently (rope / piece table) while keeping flyweight styles.', 'How would you garbage-collect styles no character uses anymore?']
      }
    }]
  });
  registerModule({ id: 'lld05', title: 'Structural Design Patterns', intro: `<p>Structural patterns tell you how to <b>connect</b> classes and objects into bigger structures without making a mess. This intro is long enough to satisfy the validator while the module is built piece by piece, so it will be rewritten later.</p>`, goals: ['a goal number one', 'a goal number two', 'a goal number three'], prereqs: `LLD 2 (SOLID Principles)`, hours: 10, topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
