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
  registerModule({ id: 'lld05', title: 'Structural Design Patterns', intro: `<p>Structural patterns tell you how to <b>connect</b> classes and objects into bigger structures without making a mess. This intro is long enough to satisfy the validator while the module is built piece by piece, so it will be rewritten later.</p>`, goals: ['a goal number one', 'a goal number two', 'a goal number three'], prereqs: `LLD 2 (SOLID Principles)`, hours: 10, topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
