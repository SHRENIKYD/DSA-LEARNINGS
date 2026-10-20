(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- shared helpers for prose + visualizers ---------------- */
  // C('List<T>') → inline code with < > escaped; P(`...`) → escaped code block inside prose.
  function C(s) { return '<code>' + H.esc(s) + '</code>'; }
  function P(s) { return '<pre><code>' + H.esc(String(s).replace(/^\n+/, '').replace(/\s+$/, '')) + '</code></pre>'; }
  function J(lines) { return lines.join('\n'); }
  function esc(s) { return H.esc(s); }
  function note(label, html) { return { type: 'text', label: label, html: html }; }
  function out(text) {
    return { type: 'text', label: 'Console output', html: text ? '<code>' + esc(text).replace(/\n/g, '<br>') + '</code>' : '<span class="c-m">(nothing printed yet)</span>' };
  }
  function bx(id, label, x, y, w) { var n = { id: id, label: label, x: x, y: y, shape: 'box' }; if (w) n.w = w; return n; }
  /* step = { l: line | [lines], cls, v: {vars}, hv, vl, out, extra: [parts], narr } */
  function codeFrames(code, steps, label) {
    return steps.map(function (s) {
      var hl = {};
      [].concat(s.l === undefined ? [] : s.l).forEach(function (n) { hl[n] = s.cls || 'cur'; });
      var parts = [{ type: 'code', label: label || 'Source (highlighted line = what runs now)', lang: 'java', code: code, hl: hl }];
      if (s.v) parts.push({ type: 'vars', label: s.vl || 'Variables', vals: s.v, hl: s.hv || {} });
      if (s.out !== undefined) parts.push(out(s.out));
      (s.extra || []).forEach(function (p) { parts.push(p); });
      return { narr: s.narr, parts: parts };
    });
  }
  /* ======================================================================
     TOPIC 1 — Records
     ====================================================================== */
  topics.push({
    title: 'Records: Data Carriers Done Right (Java 16+)',
    analogy: `<p>Think of a <b>laminated ID card</b>. The office prints your name and date of birth on it <b>once</b>, laminates it, and hands it over. Anyone can <b>read</b> it, nobody can <b>scribble</b> on it, and if two cards have exactly the same printing, the guard treats them as the <b>same card</b>. You never had to write instructions for "how to read the name" or "how to compare two cards" — the printing office does that for every card automatically. A Java <b>record</b> is that laminated card: you list the fields, Java prints the constructor, the getters, ${C('equals')}, ${C('hashCode')} and ${C('toString')} for you.</p>`,
    explain: `<p>A <b>record</b> is a class whose whole job is to <b>carry data</b>. You declare the data (the <b>components</b>) in the header, and the compiler writes the boring parts. It became a standard feature in <b>Java 16</b> (JEP 395) and is everywhere in Java 17/21 code.</p>
<h4>1. The pain before records</h4>
${P(`
// ~40 lines for "a point with x and y"
final class Point {
    private final int x, y;
    Point(int x, int y) { this.x = x; this.y = y; }
    int getX() { return x; }
    int getY() { return y; }
    @Override public boolean equals(Object o) { ... compare x and y ... }
    @Override public int hashCode() { return Objects.hash(x, y); }
    @Override public String toString() { return "Point[x=" + x + ", y=" + y + "]"; }
}`)}
<h4>2. The same thing as a record — one line</h4>
${P(`record Point(int x, int y) { }`)}
<p>From that one line the compiler generates:</p>
${H.table(['Generated member', 'What it looks like', 'Note'], [
  ['private final fields', C('private final int x; private final int y;'), 'one per component, always final'],
  ['canonical constructor', C('Point(int x, int y)'), 'parameters in header order'],
  ['accessors', C('int x()  int y()'), H.c('y', 'NOT getX() — the name is the component name')],
  ['equals', C('p1.equals(p2)'), 'true if same record class and every component equal'],
  ['hashCode', C('p.hashCode()'), 'consistent with equals'],
  ['toString', C('Point[x=1, y=2]'), 'class name + component names and values']
])}
<h4>3. What a record is NOT allowed to do</h4>
<ul>
<li>It is implicitly ${C('final')} — nobody can extend it — and it already extends ${C('java.lang.Record')}, so it cannot extend another class. It <b>can</b> implement interfaces.</li>
<li>No extra <b>instance</b> fields. All state lives in the header. ${C('static')} fields and methods are fine.</li>
<li>Fields are ${C('final')}: there are no setters. To "change" a record you make a new one (a <b>wither</b>: ${C('p.withX(5)')} returning ${C('new Point(5, y)')}).</li>
</ul>
<h4>4. Compact constructor — validate and normalize</h4>
<p>You often want rules ("lo must be ≤ hi", "email must be lower-case"). Write a <b>compact constructor</b>: just the record name, no parameter list. The parameters are in scope; Java assigns the fields <b>after</b> your code runs, so you may also <b>re-assign the parameters</b> to normalize them.</p>
${P(`
record Range(int lo, int hi) {
    Range {                                       // compact canonical constructor
        if (lo > hi) throw new IllegalArgumentException("lo > hi");
    }                                             // this.lo = lo; this.hi = hi;  ← added by javac
}
record Email(String value) {
    Email { value = value.strip().toLowerCase(); }  // normalize BEFORE the field is set
}`)}
<p>Extra (non-canonical) constructors are allowed but must start with ${C('this(...)')} so that every object goes through the canonical one — your validation can never be skipped.</p>
<h4>5. Shallow immutability — the classic trap</h4>
<p>A record's fields are final, but if a field points at a <b>mutable</b> object (a ${C('List')}, an array), the object itself can still change. Fix: copy it in the compact constructor with ${C('List.copyOf(...)')} (which also makes it unmodifiable).</p>
${H.table(['Component type', 'Safe as-is?', 'Fix'], [['int, String, LocalDate, another record', H.c('g', 'yes'), '—'], ['List / Set / Map', H.c('r', 'no'), C('members = List.copyOf(members);')], ['array (int[])', H.c('r', 'no — and equals compares the array by reference!'), 'prefer List, or clone + override equals']])}
<h4>6. Where records shine</h4>
<ul><li>DTOs / API request and response objects, events, messages.</li><li>Map keys and Set elements (correct equals/hashCode for free).</li><li>Returning several values from a method (${C('record MinMax(int min, int max)')} — even declared <b>locally</b> inside the method).</li><li>The leaves of a <b>sealed hierarchy</b> used with <b>pattern matching</b> (next topics).</li></ul>`,
    clues: [
      '"immutable data class", "value object", "DTO" → record',
      '"reduce boilerplate of equals/hashCode/toString" → record (or know why not Lombok)',
      '"validate fields on construction" → compact constructor',
      '"return two values from a method" → local record',
      '"use as HashMap key" → record gives correct equals/hashCode automatically',
      '"the record contains a List and someone mutated it" → shallow immutability, defensive List.copyOf',
      '"why can\'t a JPA entity be a record?" → no no-arg constructor, fields final, needs proxies'
    ],
    code: [`
import java.util.*;

record Range(int lo, int hi) {
    Range {                                        // compact canonical constructor
        if (lo > hi) throw new IllegalArgumentException("lo > hi: " + lo + " > " + hi);
    }                                              // fields are assigned after this body
    int length() { return hi - lo; }               // records may have normal methods
    static Range of(int a, int b) {                // static factories are fine too
        return new Range(Math.min(a, b), Math.max(a, b));
    }
    Range withHi(int newHi) { return new Range(lo, newHi); }   // "wither": copy with a change
}

record Team(String name, List<String> members) {
    Team {
        Objects.requireNonNull(name, "name");
        members = List.copyOf(members);            // defensive + unmodifiable copy
    }
}

class RecordDemo {
    public static void main(String[] args) {
        Range r = new Range(2, 7);
        System.out.println(r);                     // Range[lo=2, hi=7]
        System.out.println(r.lo() + " " + r.length()); // 2 5   (accessor is lo(), not getLo())
        System.out.println(r.equals(new Range(2, 7))); // true  (component-wise)
        System.out.println(Range.of(9, 1));        // Range[lo=1, hi=9]
        System.out.println(r.withHi(10));          // Range[lo=2, hi=10]

        List<String> src = new ArrayList<>(List.of("asha"));
        Team t = new Team("core", src);
        src.add("ben");                            // does NOT leak into the record
        System.out.println(t.members());           // [asha]
    }
}`],
    codeTitle: ['Records: compact constructor, factory, wither, defensive copy'],
    viz: {
      title: 'What happens inside new Range(lo, hi)',
      input: '2 7',
      inputLabel: 'lo hi (two integers, try "5 3" to see validation fail)',
      gen: function (input) {
        var p = String(input || '').trim().split(/[\s,]+/).map(Number);
        if (p.length !== 2 || p.some(isNaN)) throw new Error('Enter two integers like "2 7"');
        var lo = Math.trunc(p[0]), hi = Math.trunc(p[1]);
        if (Math.abs(lo) > 100000 || Math.abs(hi) > 100000) throw new Error('Keep numbers between -100000 and 100000');
        var code = J([
          'record Range(int lo, int hi) {',
          '    Range {                       // compact constructor',
          '        if (lo > hi)',
          '            throw new IllegalArgumentException("lo > hi");',
          '    }                             // javac adds: this.lo = lo; this.hi = hi;',
          '    int length() { return hi - lo; }',
          '}',
          'Range r = new Range(' + lo + ', ' + hi + ');',
          'System.out.println(r.lo() + " " + r.length());',
          'System.out.println(r.equals(new Range(' + lo + ', ' + hi + ')));',
          'System.out.println(r);'
        ]);
        var gen = H.table(['member javac generated', 'signature'], [['fields', 'private final int lo, hi'], ['canonical ctor', 'Range(int lo, int hi)'], ['accessors', 'lo(), hi()'], ['equals / hashCode / toString', 'component-based']]);
        var steps = [
          { l: 1, narr: 'The header <b>(int lo, int hi)</b> is the whole data definition. From it javac generates fields, constructor, accessors, equals, hashCode and toString.', extra: [note('Generated for you', gen)] },
          { l: 8, narr: 'We call the <b>canonical constructor</b> with lo=' + lo + ', hi=' + hi + '. Every record object must pass through it.', v: { 'param lo': lo, 'param hi': hi, 'this.lo': '(unset)', 'this.hi': '(unset)' }, hv: { 'param lo': 'cur', 'param hi': 'cur' } },
          { l: 2, narr: 'We enter the <b>compact constructor</b>. The parameters are visible, but the fields are <b>not assigned yet</b>. That is why you can still normalize the parameters here.', v: { 'param lo': lo, 'param hi': hi, 'this.lo': '(unset)', 'this.hi': '(unset)' } },
          { l: 3, cls: lo > hi ? 'bad' : 'ok', narr: 'Validation: is <b>' + lo + ' &gt; ' + hi + '</b>? ' + (lo > hi ? '<span class="c-r">Yes — the object must not be created.</span>' : '<span class="c-g">No — the values are valid.</span>'), v: { 'lo > hi': String(lo > hi) }, hv: { 'lo > hi': lo > hi ? 'bad' : 'ok' } }
        ];
        if (lo > hi) {
          steps.push({ l: 4, cls: 'bad', narr: 'We throw. Because the field assignment happens <b>after</b> the body, no half-built Range ever exists. Callers can never get an invalid range.', out: 'Exception in thread "main" java.lang.IllegalArgumentException: lo > hi' });
          steps.push({ l: 8, cls: 'bad', narr: 'The <code>new</code> expression fails, so <b>r</b> is never assigned. This is the big win of putting rules in the compact constructor: one place, no way around it (other constructors must call <code>this(...)</code>).', out: 'Exception in thread "main" java.lang.IllegalArgumentException: lo > hi' });
          return codeFrames(code, steps);
        }
        var len = hi - lo;
        steps.push({ l: 5, cls: 'ok', narr: 'End of the compact body: javac\'s hidden code runs <b>this.lo = lo; this.hi = hi;</b>. The fields are final from now on.', v: { 'this.lo': lo, 'this.hi': hi }, hv: { 'this.lo': 'ok', 'this.hi': 'ok' } });
        steps.push({ l: 9, narr: 'Accessors are named after the components: <b>r.lo()</b> (not getLo()). <b>length()</b> is our own method: ' + hi + ' − ' + lo + ' = ' + len + '.', v: { 'this.lo': lo, 'this.hi': hi, 'r.length()': len }, hv: { 'r.length()': 'sel' }, out: lo + ' ' + len });
        steps.push({ l: 10, narr: 'Generated <b>equals</b>: same record class? lo equal? hi equal? All yes → <b>true</b>, even though these are two different objects in memory.', v: { 'r == other': 'false (2 objects)', 'r.equals(other)': 'true' }, hv: { 'r.equals(other)': 'ok' }, out: lo + ' ' + len + '\ntrue' });
        steps.push({ l: 11, cls: 'ok', narr: 'Generated <b>toString</b>: ClassName[comp=value, ...]. Great for logs and debugging, free of charge.', out: lo + ' ' + len + '\ntrue\nRange[lo=' + lo + ', hi=' + hi + ']' });
        return codeFrames(code, steps);
      }
    },
    examples: [
      { title: 'Record as a HashMap key (grid coordinates)', html: `<p>Because ${C('equals')} and ${C('hashCode')} are component-based, two separately created ${C('Cell(1, 2)')} objects find the same map entry. With a plain class (no equals override) the lookup would return ${H.c('r', 'null')}.</p>`, code: `
import java.util.*;

record Cell(int row, int col) { }

class GridDemo {
    public static void main(String[] args) {
        Map<Cell, Character> board = new HashMap<>();
        board.put(new Cell(1, 2), 'X');
        System.out.println(board.get(new Cell(1, 2)));   // X  (a different but EQUAL key)
        System.out.println(board.containsKey(new Cell(2, 1))); // false
    }
}` },
      { title: 'Local record to return two values from a stream', html: `<p>A record can be declared <b>inside a method</b>. Perfect for an intermediate "tuple" in a stream pipeline — no need for ${C('Map.Entry')} or an ${C('Object[]')}. Local records are implicitly static, so they cannot capture local variables.</p>`, code: `
import java.util.*;
import java.util.stream.*;

class TopScorer {
    public static void main(String[] args) {
        record Score(String name, int points) { }          // local record
        List<Score> scores = Stream.of("asha:91", "ben:78", "chen:95")
            .map(s -> s.split(":"))
            .map(p -> new Score(p[0], Integer.parseInt(p[1])))
            .toList();
        Score best = Collections.max(scores, Comparator.comparingInt(Score::points));
        System.out.println(best);           // Score[name=chen, points=95]
    }
}` },
      { title: 'The array component trap', html: `<p>${C('record Bag(int[] items)')}: ${C('equals')} compares the <b>array reference</b>, not contents, and callers can still change the array. Two bags with the same numbers are ${H.c('r', 'not equal')}. Prefer ${C('List<Integer>')} + ${C('List.copyOf')}, or override ${C('equals')}/${C('hashCode')} with ${C('Arrays.equals')}/${C('Arrays.hashCode')}.</p>`, code: `
record Bag(int[] items) { }

class BagDemo {
    public static void main(String[] args) {
        int[] a = {1, 2};
        Bag b1 = new Bag(a), b2 = new Bag(new int[]{1, 2});
        System.out.println(b1.equals(b2));   // false — arrays compared by reference
        a[0] = 99;                            // mutates the "immutable" record
        System.out.println(b1.items()[0]);   // 99
    }
}` },
      { title: 'Generic record + wither', html: `<p>Records can be generic: ${C('record Pair<A, B>(A first, B second)')}. Because fields are final, "changing" means returning a new record. This is exactly the style used by immutable domain models and by functional code.</p>`, code: `
record Pair<A, B>(A first, B second) {
    Pair<A, B> withFirst(A newFirst) { return new Pair<>(newFirst, second); }
    Pair<B, A> swap() { return new Pair<>(second, first); }
}

class PairDemo {
    public static void main(String[] args) {
        var p = new Pair<>("age", 30);
        System.out.println(p.swap());            // Pair[first=30, second=age]
        System.out.println(p.withFirst("years")); // Pair[first=years, second=30]
    }
}` }
    ],
    deepDive: `<p><b>Bytecode reality.</b> javac does <b>not</b> emit hand-written loops for ${C('equals')}/${C('hashCode')}/${C('toString')}. It emits an <b>invokedynamic</b> call whose bootstrap method is ${C('java.lang.runtime.ObjectMethods.bootstrap')}. On first call the JVM builds an optimized method handle chain for that record — so the class file stays tiny and the JIT can inline the result. Run ${C('javap -c -p Range.class')} to see it.</p>
<p><b>equals precision.</b> For primitive components the spec compares as if by the wrapper's ${C('compare')}: so a record holding ${C('Double.NaN')} <b>equals</b> another NaN record (true), while ${C('0.0')} and ${C('-0.0')} are <b>not</b> equal — the opposite of ${C('==')}. Reference components use ${C('Objects.equals')}. The exact ${C('hashCode')} formula is <i>unspecified</i> — never persist it.</p>
<p><b>Reflection & serialization.</b> ${C('Class.isRecord()')} and ${C('getRecordComponents()')} expose the components in declaration order (Jackson, Gson 2.10+, and JDBC mappers use this). Record <b>serialization</b> is special: Java deserializes a record by calling the <b>canonical constructor</b>, so your validation runs — unlike normal classes, where deserialization bypasses constructors (a classic security hole). Record fields cannot be changed with ${C('Field.set')} even after ${C('setAccessible(true)')} (they are "trusted final").</p>
<p><b>Constraints you will be asked about:</b> no instance initializers; no explicit field declarations except static; accessor overrides must be public with the exact return type; the canonical constructor must be at least as accessible as the record; nested records are implicitly ${C('static')}. Records are <b>not</b> JPA entities (Hibernate needs a no-arg constructor, mutable fields and subclass proxies) but are perfect for <b>projections</b> and DTOs.</p>
<p><b>Future:</b> Project Valhalla's <i>value classes</i> aim to drop object identity so record-like objects can be flattened in arrays and stored without headers. Records are the stepping stone, and <b>deconstruction</b> via record patterns (Java 21) is the other half of the story.</p>`,
    aiEra: `<p><b>What AI changes:</b> converting a 60-line POJO into a record, or generating DTO records from a JSON sample, is now a one-prompt job. Copilot-style tools autocomplete compact constructors well.</p>
<p><b>Use AI as a partner:</b> <code>Convert these 12 DTO classes to records; keep validation in compact constructors; add List.copyOf for collection components; list any class that should NOT become a record and why.</code> The last clause is the important one.</p>
<p><b>Where AI goes wrong:</b> it happily turns JPA ${C('@Entity')} classes into records (breaks Hibernate), keeps calling ${C('getX()')} accessors (compile errors), forgets defensive copies of lists/arrays, and sometimes puts validation in an extra constructor that the canonical path skips. It also writes ${C('this.x = x')} inside a compact constructor, which does not compile.</p>
<p><b>What you must still own:</b> deciding identity vs value semantics, knowing the shallow-immutability trap, explaining why serialization through the canonical constructor is safer, and spotting when a "data class" actually has behaviour and invariants that need a real class.</p>`,
    problems: [{
      title: 'Build a Validated Money Record',
      level: 'Easy', tags: ['record', 'compact constructor', 'immutability'], companies: ['Stripe', 'Goldman Sachs', 'Amazon'],
      statement: `<p>Create ${C('record Money(long cents, String currency)')} that: (1) rejects ${C('null')} currency and negative cents; (2) normalizes the currency (trim + upper-case) and requires exactly 3 letters; (3) has ${C('plus(Money)')} that throws if currencies differ; (4) has ${C('times(int k)')}; (5) has ${C('static Money of(String text)')} parsing ${C('"12.5 usd"')}; (6) prints as ${C('12.50 USD')}. Use ${C('long')} cents, never ${C('double')}.</p>`,
      constraints: `Amounts up to 10<sup>15</sup> cents; overflow must throw (use ${C('Math.addExact')}/${C('multiplyExact')}).`,
      example: `<p>${C('Money.of("12.5 usd")')} → ${H.c('g', '12.50 USD')}; ${C('.plus(Money.of("0.75 USD"))')} → ${H.c('g', '13.25 USD')}; ${C('.times(3)')} → ${H.c('g', '37.50 USD')}; ${C('.plus(Money.of("1 EUR"))')} → ${H.c('r', 'IllegalArgumentException: USD vs EUR')}. Why: the compact constructor upper-cased "usd" before the field was set, so both sides say USD.</p>`,
      brute: { why: `<p>A mutable class with public ${C('double')} fields: anyone can set ${C('amount = -5')}, ${C('0.1 + 0.2')} gives ${C('0.30000000000000004')}, equals/hashCode are missing so two equal amounts are not equal in a ${C('Set')}, and validation lives in a setter that can be bypassed.</p>`, code: `
class MoneyBad {
    public double amount;          // floating point money: rounding errors
    public String currency;        // anyone can change it at any time
    MoneyBad(double amount, String currency) { this.amount = amount; this.currency = currency; }
    public static void main(String[] args) {
        MoneyBad m = new MoneyBad(0.1, "usd");
        m.amount += 0.2;
        System.out.println(m.amount);                                  // 0.30000000000000004
        System.out.println(new MoneyBad(1, "USD").equals(new MoneyBad(1, "USD"))); // false
    }
}` },
      mcq: { q: 'Where should "currency must be 3 upper-case letters" be enforced so that no Money can ever be built without it?', options: ['In the compact canonical constructor', 'In a static factory only', 'In the accessor currency()', 'In toString()'], answer: 0, explain: 'Every constructor of a record must end up calling the canonical one, so a check there cannot be bypassed. A factory can be bypassed by calling new Money(...) directly.' },
      hints: [`<p>Hint 1: in a compact constructor you may <b>re-assign the parameter</b> (${C('currency = currency.strip().toUpperCase();')}) — the field gets the normalized value because assignment happens after your code.</p>`, `<p>Hint 2: store money as an integer number of cents (${C('long')}). Parsing "12.5": split on ".", pad the fraction to 2 digits ("5" → "50").</p>`, `<p>Hint 3: edge cases — null currency (${C('Objects.requireNonNull')}), "us" (2 letters), negative cents, overflow on plus/times. Recipe: validate → normalize → let javac assign; operations return <b>new</b> Money objects.</p>`],
      tests: { sig: 'string[] -> string[]', fn: 'chk', harness: { java: `
class Check {
  static String[] chk(String[] ops) {
    Money cur = null; String msg = "";
    List<String> out = new ArrayList<>();
    for (String op : ops) {
      String[] p = op.split(":", 3);
      try {
        switch (p[0]) {
          case "of": cur = Money.of(p[1]); out.add(cur.toString()); break;
          case "plus": cur = cur.plus(Money.of(p[1])); out.add(cur.toString()); break;
          case "plusNew": cur = cur.plus(new Money(Long.parseLong(p[1]), p[2])); out.add(cur.toString()); break;
          case "times": cur = cur.times(Integer.parseInt(p[1])); out.add(cur.toString()); break;
          case "new": cur = new Money(Long.parseLong(p[1]), p[2]); out.add(cur.toString()); break;
          case "newNull": new Money(5, null); out.add("created"); break;
          case "eqnew": out.add(String.valueOf(cur.equals(new Money(Long.parseLong(p[1]), p[2])))); break;
          case "msg": out.add(msg); break;
        }
      } catch (RuntimeException e) { msg = String.valueOf(e.getMessage()); out.add(e.getClass().getSimpleName()); }
    }
    return out.toArray(new String[0]);
  }
}` }, cases: [
          [[['of:12.5 usd', 'times:3']], ['12.50 USD', '37.50 USD']],
          [[['of:12.5 usd', 'plus:0.75 USD']], ['12.50 USD', '13.25 USD']],
          [[['of:12.5 usd', 'plus:1 EUR', 'msg']], ['12.50 USD', 'IllegalArgumentException', 'USD vs EUR']],
          [[['of:5 usd', 'eqnew:500: usd']], ['5.00 USD', 'true']],
          [[['new:-1:usd', 'new:100:us', 'new:100:usd1', 'newNull', 'new:0:eur']], ['IllegalArgumentException', 'IllegalArgumentException', 'IllegalArgumentException', 'NullPointerException', '0.00 EUR']],
          [[['of:0.05 usd', 'of:7 EUR', 'of:0 usd', 'of:  3.4   gbp ']], ['0.05 USD', '7.00 EUR', '0.00 USD', '3.40 GBP']],
          [[['new:1000000000000000:usd', 'times:2147483647']], ['10000000000000.00 USD', 'ArithmeticException']],
          [[['new:9223372036854775807:usd', 'plusNew:1:usd']], ['92233720368547758.07 USD', 'ArithmeticException']],
          [[['of:3 usd', 'times:0', 'of:3 usd', 'times:-1']], ['3.00 USD', '0.00 USD', '3.00 USD', 'IllegalArgumentException']]
        ] },
      solution: {
        approach: `<p>Make the record the single source of truth. The compact constructor normalizes the currency and checks all invariants, so every Money — whether made by ${C('new')}, ${C('of')}, ${C('plus')} or ${C('times')} — is valid. Arithmetic uses exact long operations and returns new objects (immutability). ${C('toString')} is overridden for a friendly format.</p>`,
        code: `
import java.util.*;

record Money(long cents, String currency) {
    Money {
        Objects.requireNonNull(currency, "currency");
        currency = currency.strip().toUpperCase();          // normalize before field assignment
        if (!currency.matches("[A-Z]{3}")) throw new IllegalArgumentException("bad currency: " + currency);
        if (cents < 0) throw new IllegalArgumentException("negative: " + cents);
    }

    Money(String currency) { this(0, currency); }           // extra ctor must delegate with this(...)

    static Money of(String text) {                          // "12.5 usd" -> 1250 cents, USD
        String[] parts = text.trim().split("\\\\s+");
        String[] units = parts[0].split("\\\\.");
        long cents = Long.parseLong(units[0]) * 100;
        if (units.length > 1) cents += Long.parseLong((units[1] + "0").substring(0, 2));
        return new Money(cents, parts[1]);
    }

    Money plus(Money other) {
        if (!currency.equals(other.currency)) throw new IllegalArgumentException(currency + " vs " + other.currency);
        return new Money(Math.addExact(cents, other.cents), currency);
    }

    Money times(int k) { return new Money(Math.multiplyExact(cents, k), currency); }

    @Override public String toString() { return String.format("%d.%02d %s", cents / 100, cents % 100, currency); }

    public static void main(String[] args) {
        Money m = Money.of("12.5 usd");
        System.out.println(m);                                // 12.50 USD
        System.out.println(m.plus(Money.of("0.75 USD")));     // 13.25 USD
        System.out.println(m.times(3));                       // 37.50 USD
        System.out.println(m.equals(new Money(1250, "usd"))); // true (normalized)
        try { m.plus(Money.of("1 EUR")); }
        catch (IllegalArgumentException e) { System.out.println(e.getMessage()); } // USD vs EUR
    }
}`,
        dry: { head: ['call', 'cents', 'currency param → field', 'result'], rows: [['Money.of("12.5 usd")', '1200 + 50 = 1250', '"usd" → "USD"', '12.50 USD'], ['plus(of("0.75 USD"))', '1250 + 75 = 1325', 'USD = USD ✓', '13.25 USD'], ['times(3)', '1250 × 3 = 3750', 'USD', '37.50 USD'], ['plus(of("1 EUR"))', '—', 'USD ≠ EUR', H.c('r', 'IllegalArgumentException')]] },
        complexity: `<p>Every operation is O(1) time and O(1) extra space (one new small object). Records add no runtime overhead compared to a hand-written final class.</p>`,
        followUps: ['Add <code>Comparable&lt;Money&gt;</code> that refuses to compare different currencies.', 'Support currencies with 0 or 3 decimal places (JPY, BHD) using <code>java.util.Currency.getDefaultFractionDigits()</code>.', 'Why is <code>BigDecimal</code> with scale 2 an alternative, and why must you not use <code>new BigDecimal(0.1)</code>?']
      }
    }]
  });
  /* ======================================================================
     TOPIC 2 — Sealed classes & interfaces
     ====================================================================== */
  topics.push({
    title: 'Sealed Classes & Interfaces: Closed Hierarchies (Java 17)',
    analogy: `<p>A private party has a <b>printed guest list at the door</b>. Only the names on the list get in as direct guests. Each guest then decides about their own plus-ones: some come alone (<b>final</b>), some bring only the people on <i>their</i> own list (<b>sealed</b>), and one generous guest says "anyone I bring is welcome" (<b>non-sealed</b>). Because the host knows the full list, the caterer can prepare <b>exactly</b> the right number of plates — no "just in case" plates. In Java, the guest list is ${C('permits')}, and the caterer is the compiler checking that your ${C('switch')} covers every case with <b>no default</b>.</p>`,
    explain: `<p>Normally any class can extend a non-final class and any class can implement an interface — hierarchies are <b>open</b>. Sometimes you want the opposite: "a Shape is a Circle, a Square or a Rect — <b>nothing else, ever</b>". A <b>sealed</b> type lets you write that down (Java 17, JEP 409).</p>
<h4>1. Syntax</h4>
${P(`
sealed interface Shape permits Circle, Square, Rect { }   // the guest list

record Circle(double r)            implements Shape { }   // records are implicitly final
record Square(double side)         implements Shape { }
non-sealed class Rect              implements Shape { }   // re-opens this branch`)}
<h4>2. The three-way rule for every permitted subclass</h4>
${H.table(['Subclass modifier', 'Meaning', 'Typical use'], [
  [C('final'), 'nobody may extend me', 'leaf types (records are final automatically)'],
  [C('sealed ... permits ...'), 'only MY list may extend me', 'a sub-family, e.g. sealed Vehicle → sealed Truck → Van, Lorry'],
  [C('non-sealed'), 'anyone may extend me again', 'an escape hatch for plugin authors']
])}
<p>Forgetting to pick one is a compile error: <i>"sealed, non-sealed or final modifiers expected"</i>.</p>
<h4>3. Where may permitted subclasses live?</h4>
<ul><li>In a <b>named module</b>: anywhere in the same module.</li><li>On the classpath (unnamed module): in the <b>same package</b>.</li><li>If all subclasses are in the <b>same source file</b>, you may leave out ${C('permits')}; the compiler infers the list.</li></ul>
<h4>4. The real payoff: exhaustive switch without default</h4>
${P(`
static double area(Shape s) {
    return switch (s) {                        // no default needed!
        case Circle c  -> Math.PI * c.r() * c.r();
        case Square q  -> q.side() * q.side();
        case Rect r    -> r.width() * r.height();
    };
}`)}
<p>Add a new ${C('Triangle')} to the permits list and <b>every switch without a default stops compiling</b>, pointing you at each place you must update. A ${C('default')} branch would silently swallow the new case — so with sealed types, <b>leaving out default is a feature</b>.</p>
<h4>5. Enum vs sealed — when to pick which</h4>
${H.table(['', 'enum', 'sealed interface + records'], [['Fixed set of…', 'instances (RED, GREEN)', 'types (Circle, Square)'], ['Different data per case?', H.c('r', 'no — all constants share the same fields'), H.c('g', 'yes — each record has its own components')], ['Many instances per case?', 'no, one per constant', 'yes, unlimited'], ['Exhaustive switch?', 'yes', 'yes']])}
<p>Sealed interface + records = an <b>algebraic data type</b> (ADT): a "sum" (one of several kinds) of "products" (each kind carries fields). Functional languages (Kotlin sealed classes, Scala, Rust enums, TypeScript unions) have had this for years; Java 17+21 finally brings it with full pattern matching.</p>`,
    clues: [
      '"a value can be one of a fixed set of kinds, each with different data" → sealed interface + records',
      '"compiler should tell me every place to update when a new case is added" → sealed + switch with no default',
      '"replace the Visitor pattern" → sealed hierarchy + pattern-matching switch',
      '"model success or failure without exceptions" → sealed Result (Ok / Err)',
      '"restrict who can implement my public interface" → sealed (not just package-private tricks)',
      '"enum where each constant needs different fields" → that is a sealed hierarchy',
      '"state machine with states carrying data" → sealed State permits Idle, Running(pid), Failed(reason)'
    ],
    code: [`
sealed interface Shape permits Circle, Square, Rect { }
record Circle(double r) implements Shape { }
record Square(double side) implements Shape { }
record Rect(double w, double h) implements Shape { }

class Shapes {
    // Exhaustive: the compiler knows these are the ONLY three Shapes.
    static double area(Shape s) {
        return switch (s) {
            case Circle c -> Math.PI * c.r() * c.r();
            case Square q -> q.side() * q.side();
            case Rect r   -> r.w() * r.h();
        };                                   // no default: adding a 4th shape breaks this on purpose
    }

    public static void main(String[] args) {
        System.out.println(area(new Square(3)));      // 9.0
        System.out.println(area(new Rect(2, 5)));     // 10.0
        System.out.println(Shape.class.isSealed());   // true
        System.out.println(java.util.Arrays.toString(Shape.class.getPermittedSubclasses()));
    }
}`, `
// A three-level hierarchy showing final / sealed / non-sealed
sealed interface Vehicle permits Car, Truck, Bike { }
final class Car implements Vehicle { }                     // leaf
abstract sealed class Truck implements Vehicle permits Van, Lorry { } // abstract: no plain Truck objects
final class Van extends Truck { }
final class Lorry extends Truck { }
non-sealed class Bike implements Vehicle { }               // re-opened
class EBike extends Bike { }                               // allowed: Bike is non-sealed

class VehicleDemo {
    static String kind(Vehicle v) {
        return switch (v) {
            case Car c   -> "car";
            case Van x   -> "van";
            case Lorry l -> "lorry";
            case Bike b  -> "bike (" + b.getClass().getSimpleName() + ")";   // covers EBike too
        };
    }
    public static void main(String[] args) {
        System.out.println(kind(new Lorry()));  // lorry
        System.out.println(kind(new EBike()));  // bike (EBike)
    }
}`],
    codeTitle: ['Sealed interface + records + exhaustive switch', 'final vs sealed vs non-sealed in one hierarchy'],
    viz: {
      title: 'Building a sealed hierarchy and watching the compiler check it',
      gen: function () {
        var nodes = [bx('V', 'sealed Vehicle', 50, 8), bx('C', 'final Car', 14, 32), bx('T', 'sealed Truck', 50, 32), bx('B', 'non-sealed Bike', 86, 32), bx('VA', 'final Van', 38, 56), bx('LO', 'final Lorry', 62, 56), bx('EB', 'EBike', 86, 56), bx('BO', 'Boat ?', 14, 56)];
        var allE = [['C', 'V', 'implements'], ['T', 'V', 'implements'], ['B', 'V', 'implements'], ['VA', 'T', 'extends'], ['LO', 'T', 'extends'], ['EB', 'B', 'extends']];
        function g(n, e, hl, ehl, tags) { return { type: 'graph', label: 'Type hierarchy', directed: true, height: 66, nodes: n, edges: e, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
        var sw = J(['return switch (v) {', '    case Car c   -> "car";', '    case Van x   -> "van";', '    case Lorry l -> "lorry";', '    case Bike b  -> "bike";', '};']);
        return [
          { narr: 'Start with the parent: <b>sealed interface Vehicle permits Car, Truck, Bike</b>. This is the guest list. The compiler writes it into the class file as a <b>PermittedSubclasses</b> attribute.', parts: [g(nodes.slice(0, 1), [], { V: 'cur' }, {}, { V: 'permits Car, Truck, Bike' })] },
          { narr: 'Each permitted child must choose: <b>final</b>, <b>sealed</b> or <b>non-sealed</b>. Car is <b>final</b> — the branch ends here.', parts: [g(nodes.slice(0, 2), allE.slice(0, 1), { C: 'ok' }, { 'C-V': 'ok' })] },
          { narr: 'Truck is <b>abstract sealed</b> with its own list (Van, Lorry). So the family stays closed two levels deep. (If Truck were concrete, a plain <code>new Truck()</code> would be a fourth possibility the switch must cover.)', parts: [g(nodes.slice(0, 2).concat([nodes[3 - 1], nodes[4], nodes[5]]), allE.slice(0, 2).concat(allE.slice(3, 5)), { T: 'cur', VA: 'ok', LO: 'ok' }, { 'VA-T': 'ok', 'LO-T': 'ok' }, { T: 'permits Van, Lorry' })] },
          { narr: 'Bike is <b>non-sealed</b>: it re-opens its branch. Anyone may now write <b>class EBike extends Bike</b>. The compiler still knows "every Vehicle is a Car, a Truck or a Bike".', parts: [g(nodes.slice(0, 7), allE, { B: 'win', EB: 'ok' }, { 'EB-B': 'ok' }, { B: 'open again' })] },
          { narr: 'Someone tries <b>class Boat implements Vehicle</b>. Boat is not on the list → <span class="c-r">compile error: class is not allowed to extend sealed class</span>. Even a hand-made class file would be rejected by the JVM at load time (IncompatibleClassChangeError).', parts: [g(nodes, allE.concat([['BO', 'V', 'denied']]), { BO: 'bad' }, { 'BO-V': 'bad' }, { BO: 'not permitted' })] },
          { narr: 'Now the switch. The compiler lists the leaves it must see: Car, Van, Lorry, Bike (Bike also covers EBike). Each case ticks one off.', parts: [g(nodes.slice(0, 7), allE, { C: 'ok', VA: 'ok', LO: 'ok', B: 'ok' }), { type: 'code', label: 'switch with no default', lang: 'java', code: sw, hl: { 2: 'ok', 3: 'ok', 4: 'ok', 5: 'ok' } }, { type: 'table', label: 'Exhaustiveness check', columns: ['required', 'covered by'], rows: [['Car', 'case Car'], ['Truck', 'case Van + case Lorry (Truck is abstract sealed)'], ['Bike', 'case Bike']] }] },
          { narr: 'All covered → <span class="c-g">compiles with no default</span>. Behind the scenes javac still adds a hidden default that throws <b>MatchException</b> in case a new class appears at runtime from a separately compiled jar.', parts: [{ type: 'code', label: 'switch with no default', lang: 'java', code: sw, hl: { 1: 'ok', 6: 'ok' } }, note('Why no default is good', 'If you add <b>Scooter</b> to the permits list, this switch <span class="c-r">stops compiling</span> and points at itself. With a <code>default</code> it would silently treat Scooter as "something else".')] },
          { narr: 'Change the permits list to add <b>Scooter</b>: the switch now fails with <span class="c-r">"the switch expression does not cover all possible input values"</span>. The compiler just found your missing business logic for you.', parts: [g(nodes.slice(0, 7).concat([bx('S', 'final Scooter', 14, 56)]), allE.concat([['S', 'V', 'implements']]), { S: 'bad' }, { 'S-V': 'bad' }, { S: 'not handled' }), { type: 'code', label: 'switch with no default', lang: 'java', code: sw, hl: { 1: 'bad' } }] }
        ];
      }
    },
    examples: [
      { title: 'Result type instead of exceptions', html: `<p>A sealed ${C('Result<T>')} with two records ${C('Ok')} and ${C('Err')} forces callers to handle both outcomes — the compiler refuses a switch that only handles ${C('Ok')}. Popular for parsing, validation and calls to flaky services.</p>`, code: `
import java.util.function.*;

sealed interface Result<T> permits Ok, Err {
    static <T> Result<T> of(Supplier<T> work) {
        try { return new Ok<>(work.get()); }
        catch (RuntimeException e) { return new Err<>(e.getMessage()); }
    }
    default <R> Result<R> map(Function<? super T, ? extends R> f) {
        return switch (this) {
            case Ok<T>(T v)          -> new Ok<>(f.apply(v));
            case Err<T>(String msg)  -> new Err<>(msg);
        };
    }
}
record Ok<T>(T value) implements Result<T> { }
record Err<T>(String message) implements Result<T> { }

class ResultDemo {
    public static void main(String[] args) {
        System.out.println(Result.of(() -> Integer.parseInt("42")).map(x -> x * 2));  // Ok[value=84]
        System.out.println(Result.of(() -> Integer.parseInt("4x2")).map(x -> x * 2)); // Err[message=For input string: "4x2"]
    }
}` },
      { title: 'A state machine whose states carry data', html: `<p>An enum cannot say "Running has a pid, Failed has a reason". A sealed interface can. The transition function is an exhaustive switch, so adding a ${C('Paused')} state shows you every transition to update.</p>`, code: `
sealed interface JobState permits Queued, Running, Done, Failed { }
record Queued() implements JobState { }
record Running(long pid) implements JobState { }
record Done(int exitCode) implements JobState { }
record Failed(String reason) implements JobState { }

class Jobs {
    static String label(JobState s) {
        return switch (s) {
            case Queued q            -> "waiting";
            case Running r           -> "running as pid " + r.pid();
            case Done d when d.exitCode() == 0 -> "success";
            case Done d              -> "finished with code " + d.exitCode();
            case Failed f            -> "failed: " + f.reason();
        };
    }
    public static void main(String[] args) {
        System.out.println(label(new Running(4242)));   // running as pid 4242
        System.out.println(label(new Done(3)));         // finished with code 3
    }
}` },
      { title: 'Sealed classes are checked by reflection and the JVM too', html: `<p>${C('Class.isSealed()')} and ${C('getPermittedSubclasses()')} expose the list at runtime (frameworks such as Jackson use this for polymorphic JSON). The check is not only in javac: the JVM refuses to load a class that extends a sealed type without being permitted.</p>`, code: `
import java.util.*;

sealed interface Animal permits Dog, Cat { }
final class Dog implements Animal { }
final class Cat implements Animal { }

class SealedReflect {
    public static void main(String[] args) {
        System.out.println(Animal.class.isSealed());                       // true
        for (Class<?> c : Animal.class.getPermittedSubclasses())
            System.out.println(c.getSimpleName());                         // Dog, Cat
        System.out.println(Dog.class.isSealed());                          // false (final)
    }
}` }
    ],
    deepDive: `<p><b>Class-file level.</b> A sealed class carries a <b>PermittedSubclasses</b> attribute. When the JVM loads a subclass it checks the parent's list and, if missing, throws ${C('IncompatibleClassChangeError')}. So sealing is a real runtime guarantee, not just a compiler courtesy — unlike package-private constructors, it also blocks reflection and bytecode generators.</p>
<p><b>Separate compilation and MatchException.</b> Exhaustiveness is decided when <i>your</i> switch is compiled. If a library later adds a permitted subclass and you do not recompile, the hidden default javac inserted throws ${C('MatchException')} (Java 21). Since JEP 441 an exhaustive enum switch also throws ${C('MatchException')} instead of the old ${C('IncompatibleClassChangeError')}.</p>
<p><b>Rules people forget:</b> (0) if a sealed parent is a <b>concrete</b> class, a plain ${C('new Truck()')} is also a possible value, so a switch must cover ${C('Truck')} itself — make the parent ${C('abstract')} when only the children make sense; (1) a permitted subclass must <b>directly</b> extend/implement the sealed type; (2) lambdas and anonymous classes cannot implement a sealed interface (they have no name to list); (3) in the unnamed module everything must share a package; (4) ${C('non-sealed')} is the only hyphenated keyword in Java; (5) a sealed interface's generic parameter flows to records: ${C('record Ok<T>(T v) implements Result<T>')}.</p>
<p><b>Design trade-off — the expression problem.</b> Classic OOP (abstract method per subclass) makes adding <b>new types</b> easy but adding <b>new operations</b> hard (touch every class). Sealed + pattern matching flips it: adding a <b>new operation</b> is one new method with a switch; adding a <b>new type</b> forces you to update every switch (and the compiler lists them). Pick sealed when the set of kinds is stable and operations grow (ASTs, protocol messages, payment states). Keep open polymorphism for plugin-style extensibility.</p>
<p><b>Visitor pattern.</b> Before Java 21 you needed a Visitor (double dispatch) to get compiler-checked handling of every subtype. Sealed + switch patterns give the same safety with far less code and no ${C('accept')} boilerplate.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants can scan a codebase and propose "this ${C('instanceof')} chain over 5 subclasses should be a sealed hierarchy with an exhaustive switch" — a refactor that used to take a day of careful reading.</p>
<p><b>Use AI as a partner:</b> <code>List every class that implements PaymentEvent, propose a sealed hierarchy (records where possible), and show every switch/if-chain that would become exhaustive. Do not add default branches.</code></p>
<p><b>Where AI goes wrong:</b> it adds ${C('default ->')} "for safety", destroying the main benefit; it forgets that permitted classes must be in the same package (classpath) or module; it seals types that third parties are supposed to implement (breaking API users); it writes ${C('permits')} on a record (records cannot be sealed parents — they are final).</p>
<p><b>What you must still own:</b> deciding whether a hierarchy should be closed (stable domain) or open (extension point), API evolution plans (adding a subtype is a breaking change for exhaustive switches in client code), and explaining the expression-problem trade-off in a design review.</p>`,
    problems: [{
      title: 'Expression Tree Evaluator with a Sealed AST',
      level: 'Medium', tags: ['sealed', 'records', 'pattern matching', 'recursion'], companies: ['Google', 'JetBrains', 'Uber'],
      statement: `<p>Model arithmetic expressions as ${C('sealed interface Expr permits Num, Add, Mul, Neg')} with records ${C('Num(int value)')}, ${C('Add(Expr left, Expr right)')}, ${C('Mul(Expr left, Expr right)')}, ${C('Neg(Expr inner)')}. Write ${C('int eval(Expr e)')} and ${C('String show(Expr e)')} using an <b>exhaustive switch with no default</b>.</p>`,
      constraints: `Tree depth ≤ 1000; values fit in int; no ${C('instanceof')} chains, no ${C('default')} branch.`,
      example: `<p>${C('Mul(Add(Num 2, Num 3), Neg(Num 4))')} → show = ${H.c('b', '(2 + 3) * -4')}, eval = ${H.c('g', '-20')}. Why: Add gives 5, Neg gives −4, Mul gives 5 × −4.</p>`,
      brute: { why: `<p>The pre-Java-17 way: an open interface and an ${C('instanceof')} + cast chain ending in ${C('throw new IllegalStateException()')}. It compiles even if you forget a case, and nobody notices until a ${C('Neg')} reaches production.</p>`, code: `
interface Node { }
class NumNode implements Node { int v; NumNode(int v) { this.v = v; } }
class AddNode implements Node { Node l, r; AddNode(Node l, Node r) { this.l = l; this.r = r; } }
class NegNode implements Node { Node in; NegNode(Node in) { this.in = in; } }

class OldEval {
    static int eval(Node n) {
        if (n instanceof NumNode) return ((NumNode) n).v;
        if (n instanceof AddNode) { AddNode a = (AddNode) n; return eval(a.l) + eval(a.r); }
        // forgot NegNode — still compiles!
        throw new IllegalStateException("unknown node " + n);
    }
    public static void main(String[] args) {
        System.out.println(eval(new AddNode(new NumNode(2), new NumNode(3))));  // 5
        System.out.println(eval(new NegNode(new NumNode(1))));                   // throws at runtime
    }
}` },
      mcq: { q: 'You add a new record Div to the permits list. What happens to eval() that has no default?', options: ['It stops compiling until you add a Div case', 'It compiles and throws at runtime for Div', 'It silently returns 0', 'Java falls back to the first case'], answer: 0, explain: 'The switch is no longer exhaustive over the sealed type, so javac reports an error at exactly the places that need updating. That is the whole point of sealed + no default.' },
      hints: [`<p>Hint 1: the shape of the data (a closed set of node kinds) is exactly what sealed + records describe. Each record holds its children as ${C('Expr')}.</p>`, `<p>Hint 2: use <b>record patterns</b> to pull children out: ${C('case Add(Expr l, Expr r) -> eval(l) + eval(r)')}. Recursion follows the tree shape.</p>`, `<p>Hint 3: base case is ${C('Num')}. For ${C('show')}, wrap Add in parentheses so precedence is preserved. Recipe: one case per record; recurse on children; combine.</p>`],
      tests: { sig: 'string -> string[]', fn: 'chk', harness: { java: `
class Check {
  static String[] toks; static int pos;
  static Expr parse() {
    String t = toks[pos++];
    if (!t.equals("(")) return new Num(Integer.parseInt(t));
    String op = toks[pos++];
    Expr r;
    if (op.equals("neg")) r = new Neg(parse());
    else { Expr a = parse(); Expr b = parse(); r = op.equals("+") ? new Add(a, b) : new Mul(a, b); }
    pos++;
    return r;
  }
  static String[] chk(String s) {
    toks = s.replace("(", " ( ").replace(")", " ) ").trim().split("\\\\s+"); pos = 0;
    Expr e = parse();
    return new String[]{ Calc.show(e), String.valueOf(Calc.eval(e)) };
  }
}` }, cases: [
          [['(* (+ 2 3) (neg 4))'], ['(2 + 3) * -4', '-20']],
          [['7'], ['7', '7']],
          [['(neg (neg 5))'], ['--5', '5']],
          [['(+ 1 (+ 2 3))'], ['(1 + (2 + 3))', '6']],
          [['(* 2147483647 2)'], ['2147483647 * 2', '-2']],
          [['(neg -3)'], ['--3', '3']],
          [['(* (* 2 3) 4)'], ['2 * 3 * 4', '24']],
          [['(+ (neg 1) (* 2 (+ 3 4)))'], ['(-1 + 2 * (3 + 4))', '13']],
          [[{ $concat: [{ $rep: '(neg ', n: 1000 }, '1', { $rep: ')', n: 1000 }] }], [{ $concat: [{ $rep: '-', n: 1000 }, '1'] }, '1']]
        ] },
      solution: {
        approach: `<p>The sealed interface fixes the set of node kinds; each record carries exactly its children. Both operations are a single exhaustive switch using record patterns, so the compiler guarantees every node type is handled and future additions are flagged.</p>`,
        code: `
sealed interface Expr permits Num, Add, Mul, Neg { }
record Num(int value) implements Expr { }
record Add(Expr left, Expr right) implements Expr { }
record Mul(Expr left, Expr right) implements Expr { }
record Neg(Expr inner) implements Expr { }

class Calc {
    static int eval(Expr e) {
        return switch (e) {
            case Num n               -> n.value();                 // base case
            case Add(Expr l, Expr r) -> eval(l) + eval(r);         // record pattern deconstructs
            case Mul(Expr l, Expr r) -> eval(l) * eval(r);
            case Neg(Expr in)        -> -eval(in);
        };                                                         // exhaustive, no default
    }

    static String show(Expr e) {
        return switch (e) {
            case Num(int v)        -> String.valueOf(v);
            case Add(var l, var r) -> "(" + show(l) + " + " + show(r) + ")";
            case Mul(var l, var r) -> show(l) + " * " + show(r);
            case Neg(var in)       -> "-" + show(in);
        };
    }

    public static void main(String[] args) {
        Expr e = new Mul(new Add(new Num(2), new Num(3)), new Neg(new Num(4)));
        System.out.println(show(e) + " = " + eval(e));   // (2 + 3) * -4 = -20
    }
}`,
        dry: { head: ['call', 'matched case', 'returns'], rows: [['eval(Mul(..))', 'Mul(l, r)', 'eval(l) * eval(r)'], ['eval(Add(2,3))', 'Add(l, r)', '2 + 3 = 5'], ['eval(Num 2), eval(Num 3)', 'Num n', '2, 3'], ['eval(Neg(Num 4))', 'Neg(in)', '-4'], ['back in Mul', '—', H.c('g', '5 × −4 = −20')]] },
        complexity: `<p>O(n) time for n nodes (each visited once) and O(depth) stack. Pattern-matching switch on a sealed type compiles to an ${C('invokedynamic')} type-switch, roughly as cheap as an instanceof chain.</p>`,
        followUps: ['Add <code>Div</code> and return a <code>Result</code> instead of throwing on divide-by-zero.', 'Write <code>simplify(Expr)</code> using nested patterns: <code>Add(Num(0), var x)</code> → x (see practice).', 'How would you implement this with the Visitor pattern, and what does sealed save you?']
      }
    }]
  });
  /* ======================================================================
     TOPIC 3 — Pattern matching: instanceof, switch expressions, switch patterns, record patterns
     ====================================================================== */
  topics.push({
    title: 'Pattern Matching: instanceof, Switch Expressions, Switch & Record Patterns (Java 16–21)',
    analogy: `<p>Picture the <b>sorting belt at a post office</b>. Each parcel slides past a row of checkers. The first checker asks "is this a <b>letter</b>?" — if yes, it opens it and reads the address in one move. The next asks "is it a <b>box</b> heavier than 20 kg?" (a <b>guard</b>). The last checker catches "anything else". Old Java made you do three moves per parcel — check the type, <b>cast</b> it, then pull out the fields. Pattern matching does all three in <b>one</b>: ${C('case Box(var weight, var address) when weight > 20 ->')} — test, cast and unpack at once.</p>`,
    explain: `<p>Pattern matching arrived in small steps. You need all of them for Java 21 interviews.</p>
<h4>1. Pattern matching for instanceof (Java 16)</h4>
${P(`
// old: test, then cast, then use
if (obj instanceof String) { String s = (String) obj; System.out.println(s.length()); }
// new: test + cast + bind in one go
if (obj instanceof String s) { System.out.println(s.length()); }
if (obj instanceof String s && s.length() > 3) { ... }   // s usable after &&
if (!(obj instanceof String s)) return;                     // "flow scoping"
System.out.println(s.length());                             // s is definitely a String here`)}
<p>${C('s')} only exists where the compiler is <b>sure</b> the test passed. With ${C('||')} it is not sure, so ${C('obj instanceof String s || s.isEmpty()')} does not compile. ${C('null instanceof X')} is always ${C('false')} — never an exception.</p>
<h4>2. Switch expressions (Java 14)</h4>
${P(`
int letters = switch (day) {
    case "SAT", "SUN" -> 0;                        // several labels, arrow = no fall-through
    case "MON" -> {
        int base = 10;
        yield base * 2;                            // yield returns a value from a block
    }
    default -> day.length();
};`)}
${H.table(['Old switch statement', 'Arrow switch / switch expression'], [['falls through to the next case unless you break', H.c('g', 'never falls through')], ['is a statement — cannot produce a value', 'can be an <b>expression</b> that returns a value'], ['missing cases silently do nothing', 'switch <b>expressions</b> must be exhaustive'], ['one label per case', C('case A, B, C ->')]])}
<h4>3. Pattern matching for switch (Java 21)</h4>
<p>Now the case labels can be <b>type patterns</b>, with optional <b>guards</b> (${C('when')}) and an explicit ${C('case null')}:</p>
${P(`
String describe(Object o) {
    return switch (o) {
        case null                 -> "nothing";            // otherwise: NullPointerException
        case Integer i when i > 100 -> "big number";         // guard
        case Integer i            -> "number " + i;
        case String s             -> "text of length " + s.length();
        default                   -> "something else";
    };
}`)}
<h4>4. Record patterns (Java 21) — deconstruct while you match</h4>
${P(`
record Point(int x, int y) { }
record Line(Point a, Point b) { }

if (obj instanceof Point(int x, int y)) System.out.println(x + y);
switch (line) {
    case Line(Point(var x1, var y1), Point(var x2, var y2)) when x1 == x2 -> "vertical";
    case Line(Point a, Point b) -> "other";               // nested patterns, var allowed
}`)}
<h4>5. The four rules the compiler enforces</h4>
${H.table(['Rule', 'What it means', 'Error you will see'], [
  ['<b>Exhaustive</b>', 'a pattern switch (statement or expression) must cover every possible value: default, or all subtypes of a sealed type', '"does not cover all possible input values"'],
  ['<b>Dominance</b>', 'a broader pattern above a narrower one makes the narrow one unreachable (CharSequence before String; unguarded Integer before guarded Integer; default before a pattern)', '"this case label is dominated by a preceding case label"'],
  ['<b>Null</b>', 'without <code>case null</code> a switch on null throws NPE (as always); <code>case null, default -&gt;</code> combines them', 'NullPointerException at runtime'],
  ['<b>Order matters</b>', 'cases are tried top to bottom; the first match wins; guards run only if the type matches', '—']
])}
<p><b>Not in Java 21 (without preview):</b> unnamed patterns ${C('_')} (final in Java 22) and primitive type patterns like ${C('case int i')} (preview in 23+). Stick to named variables or ${C('var')}.</p>`,
    clues: [
      '"long if-else chain of instanceof + casts" → switch with type patterns',
      '"handle each subtype differently, compiler must check all are handled" → sealed + pattern switch, no default',
      '"extract fields of nested records in one step" → record patterns (Java 21)',
      '"special-case a value within a type (negative, empty, zero)" → guard: case X x when ...',
      '"switch must also handle null" → case null (else NPE)',
      '"forgot a break, two cases ran" → use arrow syntax (no fall-through)',
      '"return a value from a switch" → switch expression + yield for blocks'
    ],
    code: [`
import java.util.*;

record Circle(double r) { }
record Rect(double w, double h) { }

class Describe {
    static String describe(Object o) {
        return switch (o) {
            case null                                 -> "nothing";
            case Circle(double r) when r == 0         -> "a dot";
            case Circle(double r)                     -> "circle r=" + r;
            case Rect(double w, double h) when w == h -> "square " + w;
            case Rect(double w, double h)             -> "rect " + w + "x" + h;
            case String s                             -> "text of length " + s.length();
            case Integer i when i > 100               -> "big number";
            case Integer i                            -> "number " + i;
            default                                   -> "unknown " + o.getClass().getSimpleName();
        };
    }

    public static void main(String[] args) {
        for (Object o : Arrays.asList(new Circle(0), new Rect(3, 3), null, true, 7, "hey", new Rect(2, 5)))
            System.out.println(describe(o));
        // a dot / square 3.0 / nothing / unknown Boolean / number 7 / text of length 3 / rect 2.0x5.0
    }
}`, `
class SwitchExpressions {
    enum Day { MON, TUE, WED, THU, FRI, SAT, SUN }

    static int workHours(Day d) {
        return switch (d) {                 // exhaustive over the enum: no default needed
            case SAT, SUN -> 0;
            case FRI -> {
                int base = 8;
                yield base - 2;             // yield: value of a block case
            }
            case MON, TUE, WED, THU -> 8;
        };
    }

    public static void main(String[] args) {
        System.out.println(workHours(Day.FRI));   // 6
        Object o = "pattern";
        if (o instanceof String s && s.length() > 3) System.out.println(s.toUpperCase()); // PATTERN
        if (!(o instanceof Integer n)) System.out.println("not an Integer");               // flow scoping
    }
}`],
    codeTitle: ['Type patterns, record patterns, guards, case null', 'Switch expressions, yield, instanceof patterns'],
    viz: {
      title: 'Step through a pattern-matching switch',
      input: 'Rect 3 3',
      inputLabel: 'Value: Circle r | Rect w h | an integer | "text" | true | null',
      gen: function (input) {
        var raw = String(input === undefined ? '' : input).trim();
        if (!raw.length) throw new Error('Type a value, e.g. Circle 2, Rect 3 4, 150, "hi", true, null');
        if (raw.length > 40) throw new Error('Keep the value short (≤ 40 chars)');
        function jd(x) { return Number.isInteger(x) ? x + '.0' : String(x); }
        var v, m;
        if (raw === 'null') v = { t: 'null' };
        else if ((m = raw.match(/^circle\s+(-?\d+(\.\d+)?)$/i))) v = { t: 'Circle', r: Number(m[1]) };
        else if ((m = raw.match(/^rect\s+(-?\d+(\.\d+)?)\s+(-?\d+(\.\d+)?)$/i))) v = { t: 'Rect', w: Number(m[1]), h: Number(m[3]) };
        else if (/^-?\d+$/.test(raw)) { var n = Number(raw); if (Math.abs(n) > 2147483647) throw new Error('Integer must fit in an int'); v = { t: 'Integer', i: n }; }
        else if (raw === 'true' || raw === 'false') v = { t: 'Boolean', b: raw };
        else v = { t: 'String', s: raw.replace(/^"|"$/g, '') };
        var code = J([
          'static String describe(Object o) {',
          '    return switch (o) {',
          '        case null                     -> "nothing";',
          '        case Circle(double r) when r == 0 -> "a dot";',
          '        case Circle(double r)         -> "circle r=" + r;',
          '        case Rect(double w, double h) when w == h -> "square " + w;',
          '        case Rect(double w, double h) -> "rect " + w + "x" + h;',
          '        case String s                 -> "text of length " + s.length();',
          '        case Integer i when i > 100   -> "big number";',
          '        case Integer i                -> "number " + i;',
          '        default                       -> "unknown " + o.getClass().getSimpleName();',
          '    };',
          '}'
        ]);
        var shown = v.t === 'null' ? 'null' : v.t === 'Circle' ? 'Circle[r=' + jd(v.r) + ']' : v.t === 'Rect' ? 'Rect[w=' + jd(v.w) + ', h=' + jd(v.h) + ']' : v.t === 'String' ? '"' + v.s + '"' : v.t === 'Integer' ? String(v.i) : v.b;
        var cases = [
          { l: 3, type: 'null', test: function () { return true; }, res: function () { return 'nothing'; }, bind: {} },
          { l: 4, type: 'Circle', guard: 'r == 0', test: function () { return v.r === 0; }, res: function () { return 'a dot'; }, bind: function () { return { r: jd(v.r) }; } },
          { l: 5, type: 'Circle', test: function () { return true; }, res: function () { return 'circle r=' + jd(v.r); }, bind: function () { return { r: jd(v.r) }; } },
          { l: 6, type: 'Rect', guard: 'w == h', test: function () { return v.w === v.h; }, res: function () { return 'square ' + jd(v.w); }, bind: function () { return { w: jd(v.w), h: jd(v.h) }; } },
          { l: 7, type: 'Rect', test: function () { return true; }, res: function () { return 'rect ' + jd(v.w) + 'x' + jd(v.h); }, bind: function () { return { w: jd(v.w), h: jd(v.h) }; } },
          { l: 8, type: 'String', test: function () { return true; }, res: function () { return 'text of length ' + v.s.length; }, bind: function () { return { s: '"' + v.s + '"' }; } },
          { l: 9, type: 'Integer', guard: 'i > 100', test: function () { return v.i > 100; }, res: function () { return 'big number'; }, bind: function () { return { i: v.i }; } },
          { l: 10, type: 'Integer', test: function () { return true; }, res: function () { return 'number ' + v.i; }, bind: function () { return { i: v.i }; } },
          { l: 11, type: '*', test: function () { return true; }, res: function () { return 'unknown ' + v.t; }, bind: function () { return {}; } }
        ];
        var steps = [{ l: [1, 2], narr: 'We call <b>describe(' + esc(shown) + ')</b>. The runtime type of o is <b>' + v.t + '</b>. Cases are checked <b>top to bottom</b>; the first one that matches wins.', v: { o: shown, 'runtime type': v.t } }];
        for (var k = 0; k < cases.length; k++) {
          var c = cases[k];
          var typeOk = c.type === '*' ? v.t !== 'null' : c.type === v.t;
          if (!typeOk) {
            steps.push({ l: c.l, cls: 'done', narr: c.type === 'null' ? 'Is o <b>null</b>? No → skip. (Without this case, a null would throw NullPointerException.)' : 'Is o a <b>' + c.type + '</b>? No (it is ' + v.t + ') → skip this case without evaluating its guard.', v: { o: shown, 'runtime type': v.t } });
            continue;
          }
          var b = typeof c.bind === 'function' ? c.bind() : {};
          var vals = { o: shown }; Object.keys(b).forEach(function (key) { vals[key] = b[key]; });
          if (c.guard) {
            var pass = c.test();
            vals['when ' + c.guard] = String(pass);
            var hv = {}; hv['when ' + c.guard] = pass ? 'ok' : 'bad';
            if (!pass) { steps.push({ l: c.l, cls: 'bad', narr: 'Type matches, so the pattern <b>binds</b> ' + Object.keys(b).join(', ') + '. Then the guard <b>' + c.guard + '</b> is false → this case does not apply, keep going.', v: vals, hv: hv }); continue; }
            steps.push({ l: c.l, cls: 'ok', narr: 'Type matches, variables bound, and the guard <b>' + c.guard + '</b> is true → <span class="c-g">this case wins</span>.', v: vals, hv: hv });
          } else {
            steps.push({ l: c.l, cls: 'ok', narr: c.type === 'null' ? 'o <b>is null</b> → <span class="c-g">case null wins</span>.' : c.type === '*' ? 'Nothing above matched a <b>' + v.t + '</b>, so <b>default</b> catches it. It must be last: a default above a pattern would "dominate" it (compile error).' : 'Type matches' + (Object.keys(b).length ? ' and the record/type pattern binds <b>' + Object.keys(b).join(', ') + '</b> for us — no cast, no accessor calls' : '') + ' → <span class="c-g">this case wins</span>.', v: vals });
          }
          var r = c.res();
          steps.push({ l: c.l, cls: 'sel', narr: 'The arrow expression is evaluated and becomes the value of the whole <b>switch expression</b>. No fall-through: later cases are never looked at.', v: vals, out: r });
          steps.push({ l: [12, 13], cls: 'done', narr: 'Method returns <b>"' + esc(r) + '"</b>. Try other inputs: <b>Circle 0</b>, <b>Rect 2 5</b>, <b>150</b>, <b>"hi"</b>, <b>true</b>, <b>null</b>.', out: r, extra: [note('How it really runs', 'javac compiles a pattern switch to an <b>invokedynamic</b> call to <code>SwitchBootstraps.typeSwitch</code>, which jumps straight to the first candidate case by type, then re-checks guards. Semantics are still "first match top to bottom".')] });
          break;
        }
        return codeFrames(code, steps);
      }
    },
    examples: [
      { title: 'Flow scoping: early return makes the variable live afterwards', html: `<p>After ${C('if (!(o instanceof String s)) return ...;')} the compiler knows the rest of the method only runs when ${C('o')} is a String, so ${C('s')} stays in scope. This keeps validation code flat instead of nested.</p>`, code: `
class FlowScope {
    static int safeLength(Object o) {
        if (!(o instanceof String s)) return -1;   // not a String → leave early
        return s.strip().length();                  // s is in scope here
    }
    public static void main(String[] args) {
        System.out.println(safeLength("  hi  "));  // 2
        System.out.println(safeLength(42));        // -1
        System.out.println(safeLength(null));      // -1 (null instanceof anything is false)
    }
}` },
      { title: 'Nested record patterns + guards classify a line', html: `<p>One case can match a ${C('Line')}, unpack both ${C('Point')}s and test their coordinates. Order matters: the most specific guarded cases come first, the unguarded catch-all last (otherwise: dominance error).</p>`, code: `
record Point(int x, int y) { }
record Line(Point a, Point b) { }

class Lines {
    static String kind(Line l) {
        return switch (l) {
            case Line(Point(var x1, var y1), Point(var x2, var y2)) when x1 == x2 && y1 == y2 -> "point";
            case Line(Point(var x1, var y1), Point(var x2, var y2)) when x1 == x2 -> "vertical";
            case Line(Point(var x1, var y1), Point(var x2, var y2)) when y1 == y2 -> "horizontal";
            case Line(Point a, Point b) -> "diagonal";
        };
    }
    public static void main(String[] args) {
        System.out.println(kind(new Line(new Point(1, 2), new Point(1, 9))));  // vertical
        System.out.println(kind(new Line(new Point(0, 0), new Point(3, 4))));  // diagonal
    }
}` },
      { title: 'Old fall-through bug vs arrow switch', html: `<p>Classic statement switch: forgetting ${C('break')} runs the next case too. The arrow form makes that impossible. Output of the old version for ${C('"SAT"')}: ${H.c('r', 'weekend weekday')}.</p>`, code: `
class FallThrough {
    public static void main(String[] args) {
        String day = "SAT";
        switch (day) {                   // old style
            case "SAT":
            case "SUN":
                System.out.print("weekend ");     // no break!
            default:
                System.out.println("weekday");    // also runs: fall-through
        }
        switch (day) {                   // arrow style: exactly one branch runs
            case "SAT", "SUN" -> System.out.println("weekend");
            default -> System.out.println("weekday");
        }
    }
}` },
      { title: 'case null, default and the NPE trap', html: `<p>A switch whose selector is ${C('null')} throws ${C('NullPointerException')} unless there is a ${C('case null')}. ${C('case null, default ->')} handles "null or anything else" in one arm, and it must be the <b>last</b> arm.</p>`, code: `
class NullSwitch {
    static String kind(Object o) {
        return switch (o) {
            case Integer i -> "int";
            case String s  -> "string";
            case null, default -> "null or other";
        };
    }
    public static void main(String[] args) {
        System.out.println(kind(null));   // null or other
        Object n = null;
        try {
            switch (n) { case String s -> System.out.println(s); default -> System.out.println("d"); }
        } catch (NullPointerException e) {
            System.out.println("NPE: no case null");
        }
    }
}` }
    ],
    deepDive: `<p><b>How javac compiles it.</b> A pattern switch becomes an ${C('invokedynamic')} to ${C('java.lang.runtime.SwitchBootstraps.typeSwitch')}, passing the case labels as static arguments. The bootstrap returns an index of the first case whose <b>type</b> matches (starting from a restart index); javac then evaluates the guard and, if it fails, calls the switch again starting after that case. Record patterns compile to accessor calls (${C('r.x()')}), so a <b>side-effecting accessor runs during matching</b>. If an accessor throws, Java 21 wraps it in ${C('MatchException')}.</p>
<p><b>Exhaustiveness is a compile-time proof</b>, and the compiler adds a synthetic default that throws ${C('MatchException')} for the "impossible" case (a new subclass from a separately compiled jar). For nested record patterns, exhaustiveness is computed component by component: ${C('case Pair(A a, A b)')} + ${C('case Pair(A a, B b)')} + ${C('case Pair(B b, var x)')} is exhaustive for a sealed ${C('A|B')}.</p>
<p><b>Generic record patterns infer type arguments:</b> ${C('if (box instanceof Box(var s))')} with ${C('Box<String>')} infers ${C('Box<String>')}. You cannot pattern-match on a reified generic (${C('case List<String> l')} is an unchecked error unless the selector type already guarantees it), because of erasure.</p>
<p><b>null semantics:</b> ${C('instanceof')} never matches null; a <b>type pattern</b> in a record component <b>does</b> match a null component only if it is "total" for that component type (${C('var')} or the declared type), e.g. ${C('Box(var s)')} matches ${C('new Box(null)')}, but ${C('Box(String s)')} on a ${C('Box<Object>')} does not.</p>
<p><b>Performance:</b> after warm-up the JIT turns typeSwitch into type-profiled branches — comparable to an instanceof chain, and often faster than a Visitor's two virtual calls. A string/enum switch still uses hashCode + lookupswitch/tableswitch.</p>
<p><b>Version map for interviews:</b> switch expressions 14 · instanceof patterns 16 · sealed 17 · switch patterns + record patterns 21 · unnamed ${C('_')} 22 · primitive patterns preview 23+.</p>`,
    aiEra: `<p><b>What AI changes:</b> IDE assistants and OpenRewrite-style recipes can mechanically turn ${C('instanceof')}+cast chains and old fall-through switches into pattern switches across a whole repo.</p>
<p><b>Use AI as a partner:</b> <code>Rewrite this if/else instanceof chain as a Java 21 pattern switch. Keep the exact behaviour for null. Order cases so no case is dominated. Do not use preview features.</code> Then ask it for edge inputs (null, subclass instances, boundary guard values) and run them.</p>
<p><b>Where AI goes wrong:</b> uses ${C('_')} unnamed patterns or ${C('case int i')} (not in Java 21 without preview), drops the ${C('case null')} that the old code implicitly handled (${C('instanceof')} was null-safe, a switch is not!), places a guarded case after its unguarded twin (dominance error), or adds ${C('default')} to a sealed switch.</p>
<p><b>What you must still own:</b> knowing that switching on null throws, reasoning about case order and dominance, choosing guards vs nested patterns for readability, and recognising when pattern matching is replacing what should be ordinary polymorphism (a method on the type).</p>`,
    problems: [{
      title: 'Universal Pretty-Printer with a Pattern Switch',
      level: 'Medium', tags: ['pattern matching', 'guards', 'recursion', 'null handling'], companies: ['Atlassian', 'Microsoft', 'Flipkart'],
      statement: `<p>Write ${C('String fmt(Object o)')} using <b>one</b> switch expression: ${C('null')} → ${C('null')}; negative ${C('Integer')} → in parentheses, e.g. ${C('(5)')}; other Integer as is; ${C('Double')} → 2 decimals; blank String → ${C('<blank>')}; other String → quoted; ${C('int[]')} → ${C('[1, 2]')}; ${C('List')} → recursively formatted items; ${C('Map')} → ${C('{k: v}')} recursively; anything else → ${C('toString()')}.</p>`,
      constraints: `Nesting depth ≤ 50; Java 21, no preview features, no explicit casts.`,
      example: `<p>${C('fmt(Arrays.asList(1, -5, "hi", " ", null, 2.5, new int[]{1,2}, List.of(3)))')} → ${H.c('g', '[1, (5), "hi", &lt;blank&gt;, null, 2.50, [1, 2], [3]]')}. Why: the List case maps fmt over every element; each element then hits its own case.</p>`,
      brute: { why: `<p>An ${C('if/else')} chain with ${C('instanceof')} and casts. It works but is long, the order of checks is easy to get wrong, and it is easy to forget ${C('null')} or put ${C('Object')} before ${C('String')} with no compiler warning.</p>`, code: `
import java.util.*;

class FmtOld {
    static String fmt(Object o) {
        if (o == null) return "null";
        if (o instanceof Integer) {
            Integer i = (Integer) o;
            return i < 0 ? "(" + Math.abs((long) i) + ")" : String.valueOf(i);
        }
        if (o instanceof String) {
            String s = (String) o;
            return s.isBlank() ? "<blank>" : "\\"" + s + "\\"";
        }
        if (o instanceof List) {
            StringBuilder sb = new StringBuilder("[");
            for (Object x : (List<?>) o) { if (sb.length() > 1) sb.append(", "); sb.append(fmt(x)); }
            return sb.append("]").toString();
        }
        return String.valueOf(o);
    }
    public static void main(String[] args) { System.out.println(fmt(Arrays.asList(1, -5, "x"))); }
}` },
      mcq: { q: 'Where must <code>case String s when s.isBlank()</code> go relative to <code>case String s</code>?', options: ['Before it — otherwise it is dominated and will not compile', 'After it — guards are checked last', 'Anywhere — order does not matter in pattern switches', 'It must be inside the String case as an if'], answer: 0, explain: 'Cases are tried top to bottom. An unguarded String pattern above would match every String first, so javac reports the guarded one as dominated.' },
      hints: [`<p>Hint 1: one ${C('switch (o)')} with type patterns. Use ${C('case null')} first, otherwise a null element throws NPE.</p>`, `<p>Hint 2: guards handle the special values: ${C('case Integer i when i < 0')} and ${C('case String s when s.isBlank()')} go <b>before</b> their unguarded twins. Arrays are types too: ${C('case int[] a')}.</p>`, `<p>Hint 3: for List/Map recurse with streams and ${C('Collectors.joining(", ", "[", "]")')}. Use ${C('Math.abs((long) i)')} so ${C('Integer.MIN_VALUE')} does not stay negative. ${C('default')} goes last.</p>`],
      tests: { sig: 'string -> string', fn: 'chk', harness: { java: `
class Check {
  static String chk(String kind) {
    String[] p = kind.split(":", 2);
    Object o;
    switch (p[0]) {
      case "int": o = Integer.valueOf(p[1]); break;
      case "double": o = Double.valueOf(p[1]); break;
      case "str": o = p.length > 1 ? p[1] : ""; break;
      case "null": o = null; break;
      case "ints": o = p.length > 1 && !p[1].isEmpty() ? Arrays.stream(p[1].split(",")).mapToInt(Integer::parseInt).toArray() : new int[0]; break;
      case "list": o = Arrays.asList(1, -5, "hi", " ", null, 2.5, new int[]{ 1, 2 }, List.of(3)); break;
      case "map": o = new TreeMap<>(Map.of("k", 1)); break;
      case "mapNested": { Map<String, Object> m = new LinkedHashMap<>(); m.put("a", List.of(-1, "x")); m.put("b", new LinkedHashMap<>(Map.of(2, 2.0))); o = m; break; }
      case "emptyList": o = List.of(); break;
      case "emptyMap": o = Map.of(); break;
      case "bool": o = Boolean.TRUE; break;
      case "char": o = 'x'; break;
      case "long": o = Long.valueOf(p[1]); break;
      case "deep": { Object x = 1; for (int i = 0; i < Integer.parseInt(p[1]); i++) x = List.of(x); o = x; break; }
      default: o = new StringBuilder("sb");
    }
    return Fmt.fmt(o);
  }
}` }, cases: [
          [['int:5'], '5'],
          [['int:-5'], '(5)'],
          [['int:0'], '0'],
          [['int:-2147483648'], '(2147483648)'],
          [['double:2.5'], '2.50'],
          [['double:0'], '0.00'],
          [['double:-3.14159'], '-3.14'],
          [['double:1e10'], '10000000000.00'],
          [['str:hi'], '"hi"'],
          [['str'], '<blank>'],
          [['str:   '], '<blank>'],
          [['null'], 'null'],
          [['ints:1,2'], '[1, 2]'],
          [['ints'], '[]'],
          [['list'], '[1, (5), "hi", <blank>, null, 2.50, [1, 2], [3]]'],
          [['map'], '{"k": 1}'],
          [['mapNested'], '{"a": [(1), "x"], "b": {2: 2.00}}'],
          [['emptyList'], '[]'],
          [['emptyMap'], '{}'],
          [['bool'], 'true'],
          [['char'], 'x'],
          [['long:-5'], '-5'],
          [['other'], 'sb'],
          [['deep:50'], '[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[1]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]']
        ] },
      tests: { sig: 'string -> string', fn: 'chk', harness: { java: `
class Check {
  static String chk(String kind) {
    String[] p = kind.split(":", 2);
    Object o;
    switch (p[0]) {
      case "int": o = Integer.valueOf(p[1]); break;
      case "double": o = Double.valueOf(p[1]); break;
      case "str": o = p.length > 1 ? p[1] : ""; break;
      case "null": o = null; break;
      case "ints": o = p.length > 1 && !p[1].isEmpty() ? Arrays.stream(p[1].split(",")).mapToInt(Integer::parseInt).toArray() : new int[0]; break;
      case "list": o = Arrays.asList(1, -5, "hi", " ", null, 2.5, new int[]{ 1, 2 }, List.of(3)); break;
      case "map": o = new TreeMap<>(Map.of("k", 1)); break;
      case "mapNested": { Map<String, Object> m = new LinkedHashMap<>(); m.put("a", List.of(-1, "x")); m.put("b", new LinkedHashMap<>(Map.of(2, 2.0))); o = m; break; }
      case "emptyList": o = List.of(); break;
      case "emptyMap": o = Map.of(); break;
      case "bool": o = Boolean.TRUE; break;
      case "char": o = 'x'; break;
      case "long": o = Long.valueOf(p[1]); break;
      case "deep": { Object x = 1; for (int i = 0; i < Integer.parseInt(p[1]); i++) x = List.of(x); o = x; break; }
      default: o = new StringBuilder("sb");
    }
    return Fmt.fmt(o);
  }
}` }, cases: [
          [['int:5'], '5'],
          [['int:-5'], '(5)'],
          [['int:0'], '0'],
          [['int:-2147483648'], '(2147483648)'],
          [['double:2.5'], '2.50'],
          [['double:0'], '0.00'],
          [['double:-3.14159'], '-3.14'],
          [['double:1e10'], '10000000000.00'],
          [['str:hi'], '"hi"'],
          [['str'], '<blank>'],
          [['str:   '], '<blank>'],
          [['null'], 'null'],
          [['ints:1,2'], '[1, 2]'],
          [['ints'], '[]'],
          [['list'], '[1, (5), "hi", <blank>, null, 2.50, [1, 2], [3]]'],
          [['map'], '{"k": 1}'],
          [['mapNested'], '{"a": [(1), "x"], "b": {2: 2.00}}'],
          [['emptyList'], '[]'],
          [['emptyMap'], '{}'],
          [['bool'], 'true'],
          [['char'], 'x'],
          [['long:-5'], '-5'],
          [['other'], 'sb'],
          [['deep:50'], '[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[1]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]']
        ] },
      solution: {
        approach: `<p>Turn the specification into an ordered list of cases: null, guarded specials, plain types, containers (recursive), default. The compiler checks dominance and that the switch expression is exhaustive (the default makes it so).</p>`,
        code: `
import java.util.*;
import java.util.stream.*;

class Fmt {
    static String fmt(Object o) {
        return switch (o) {
            case null                        -> "null";
            case Integer i when i < 0        -> "(" + Math.abs((long) i) + ")";   // long: MIN_VALUE safe
            case Integer i                   -> String.valueOf(i);
            case Double d                    -> String.format("%.2f", d);
            case String s when s.isBlank()   -> "<blank>";
            case String s                    -> "\\"" + s + "\\"";
            case int[] arr                   -> Arrays.toString(arr);
            case List<?> list                -> list.stream().map(Fmt::fmt)
                                                     .collect(Collectors.joining(", ", "[", "]"));
            case Map<?, ?> map               -> map.entrySet().stream()
                                                     .map(e -> fmt(e.getKey()) + ": " + fmt(e.getValue()))
                                                     .collect(Collectors.joining(", ", "{", "}"));
            default                          -> o.toString();
        };
    }

    public static void main(String[] args) {
        System.out.println(fmt(Arrays.asList(1, -5, "hi", " ", null, 2.5, new int[]{1, 2}, List.of(3))));
        // [1, (5), "hi", <blank>, null, 2.50, [1, 2], [3]]
        System.out.println(fmt(new TreeMap<>(Map.of("k", 1))));   // {"k": 1}
    }
}`,
        dry: { head: ['element', 'first matching case', 'output'], rows: [['1', 'Integer i (guard i &lt; 0 false)', '1'], ['-5', 'Integer i when i &lt; 0', '(5)'], ['" "', 'String s when s.isBlank()', '&lt;blank&gt;'], ['null', 'case null', 'null'], ['2.5', 'Double d', '2.50'], ['int[]{1,2}', 'int[] arr', '[1, 2]']] },
        complexity: `<p>O(total elements) time across the whole nested structure; O(depth) recursion stack. Each switch dispatch is O(1) amortized after JIT warm-up.</p>`,
        followUps: ['Add cycle detection for a list that contains itself.', 'Change it to produce valid JSON (escape quotes, no single-quotes).', 'Replace Object with a sealed JsonValue hierarchy so default disappears.']
      }
    }]
  });
  /* ======================================================================
     TOPIC 4 — Text blocks + the small modern wins (var, helpful NPEs, Sequenced Collections, toList…)
     ====================================================================== */
  topics.push({
    title: 'Text Blocks & the Small Modern Wins (var, Helpful NPEs, Sequenced Collections)',
    analogy: `<p>Writing JSON or SQL in an old Java string was like <b>dictating a letter over the phone</b>: "open quote, curly brace, backslash-n, plus, open quote, space, space…". A <b>text block</b> is like <b>pasting a photo of the letter</b>: you paste it exactly as it looks, and Java neatly trims the margin you used to line it up with your code — like a photo app auto-cropping the white border. The other small features in this topic are the "quality of life" tools in a renovated kitchen: nothing dramatic alone, but together they make daily cooking much faster.</p>`,
    explain: `<h4>1. Text blocks (Java 15)</h4>
${P(`
// before
String json = "{\\n" +
              "  \\"name\\": \\"Asha\\",\\n" +
              "  \\"age\\": 30\\n" +
              "}\\n";
// after
String json = """
    {
      "name": "Asha",
      "age": 30
    }
    """;`)}
<p>Rules in plain words:</p>
<ol>
<li>The opening ${C('"""')} must be followed by a <b>new line</b>. Content starts on the next line.</li>
<li><b>Incidental indentation</b> is removed: Java finds the <b>smallest</b> leading-space count over all non-blank lines <b>and the closing ${C('"""')} line</b>, and strips that many spaces from every line. Indentation <i>inside</i> your JSON (the extra 2 spaces) survives.</li>
<li>Trailing spaces on each line are <b>removed</b>. Line endings become ${C('\\n')} on every OS.</li>
<li>If the closing ${C('"""')} is on its own line, the string ends with a newline; put it right after the last word to avoid that.</li>
<li>Move the closing ${C('"""')} <b>left</b> to keep some indentation on purpose.</li>
<li>Escapes still work, plus two new ones: ${C('\\s')} = one space that is never stripped, and ${C('\\')} at line end = "join with the next line" (no newline).</li>
<li>No interpolation: use ${C('"...%s...".formatted(x)')}. (String Templates were a preview in 21/22 and were <b>withdrawn</b> in JDK 23 — do not use them.)</li>
</ol>
<h4>2. var — local type inference (Java 10)</h4>
${P(`
var users = new HashMap<String, List<Integer>>();   // type is HashMap<String, List<Integer>>
for (var e : users.entrySet()) { ... }              // great for long generic types`)}
${H.table(['Allowed', 'Not allowed'], [['local variables with an initializer', 'fields, method parameters, return types'], ['for / for-each / try-with-resources variables', C('var x;') + ' (no initializer) or ' + C('var x = null;')], ['lambda parameters (Java 11) — to add annotations', C('var f = () -> 1;') + ' (lambda needs a target type)'], ['', C('var a = {1, 2};') + ' (array initializer)']])}
<p>${C('var')} is <b>not</b> dynamic typing — the type is fixed at compile time. Trap: ${C('var list = new ArrayList<>();')} infers ${C('ArrayList<Object>')}.</p>
<h4>3. Helpful NullPointerExceptions (Java 14+, on by default since 15)</h4>
<p>Instead of a bare NPE, the JVM tells you <b>which</b> part was null: <i>Cannot invoke "Address.city()" because the return value of "User.address()" is null</i>. Huge for chained calls.</p>
<h4>4. Collections & Streams upgrades</h4>
${H.table(['Feature', 'Version', 'Example'], [
  ['Immutable factories', '9', C('List.of(1, 2), Map.of("a", 1)') + ' — reject nulls'],
  ['Collectors.teeing', '12', 'two collectors at once, then merge'],
  [C('Stream.toList()'), '16', H.c('y', 'unmodifiable') + ' — unlike ' + C('collect(Collectors.toList())')],
  ['<b>Sequenced collections</b>', '21', C('getFirst() getLast() addFirst() removeLast() reversed()') + ' on List, Deque, LinkedHashSet, LinkedHashMap (' + C('firstEntry() putFirst()') + ')'],
  ['String helpers', '11–15', C('isBlank strip lines repeat indent transform formatted stripIndent')],
  [C('Math.clamp, StringBuilder.repeat'), '21', C('Math.clamp(15, 0, 10)') + ' → 10']
])}
<p>Sequenced collections fix an old annoyance: getting the last element of a ${C('LinkedHashSet')} used to need iterating the whole set; now it is ${C('set.getLast()')}.</p>`,
    clues: [
      '"embed JSON / SQL / HTML in Java code" → text block + formatted()',
      '"string has unexpected leading spaces / trailing newline" → closing delimiter position, incidental whitespace',
      '"keep a trailing space in a text block" → \\s escape',
      '"get first/last element of LinkedHashSet / LinkedHashMap" → Java 21 SequencedCollection',
      '"UnsupportedOperationException after stream" → Stream.toList() is unmodifiable',
      '"long generic type repeated on both sides" → var (locals only)',
      '"which link in a.b().c().d() was null?" → helpful NPE message'
    ],
    code: [String.raw`
import java.util.*;
import java.util.stream.*;

class ModernBits {
    public static void main(String[] args) {
        String sql = """
            SELECT id, name
            FROM users
            WHERE city = '%s'
              AND age > %d
            """.formatted("Pune", 30);        // no interpolation in Java 21: use formatted()
        System.out.print(sql);                // inner 2-space indent of AND survives

        String oneLine = """
            Hello, \
            world!\s""";                      // \ joins lines, \s keeps a trailing space
        System.out.println("[" + oneLine + "]");   // [Hello, world! ]

        var map = new LinkedHashMap<String, Integer>();   // var: type inferred
        map.put("b", 2);
        map.put("a", 1);
        map.putFirst("z", 0);                              // Java 21 SequencedMap
        System.out.println(map.firstEntry() + " " + map.lastEntry() + " " + map.reversed());
        // z=0 a=1 {a=1, b=2, z=0}

        List<Integer> nums = Stream.of(3, 1, 2).toList();   // unmodifiable!
        try { nums.add(4); } catch (UnsupportedOperationException e) { System.out.println("toList() is read-only"); }
        System.out.println(nums.reversed() + " " + nums.getLast());   // [2, 1, 3] 2
    }
}`],
    codeTitle: ['Text blocks, formatted, var, Sequenced Collections, toList'],
    viz: {
      title: 'How Java strips incidental indentation from a text block',
      input: '12',
      inputLabel: 'Column of the closing """ (0–20). Content lines start at column 12.',
      gen: function (input) {
        var c = Number(String(input || '').trim());
        if (!Number.isInteger(c) || c < 0 || c > 20) throw new Error('Enter a whole number 0–20 (the column of the closing """)');
        var sp = function (n) { return new Array(n + 1).join(' '); };
        var dot = function (s) { return esc(s).replace(/ /g, '<span class="c-m">·</span>'); };
        var pd = function (s) { return String(s).replace(/ /g, '·'); };   // plain text for table cells (escaped by the renderer)
        var content = [{ ind: 12, txt: '{', tr: 0 }, { ind: 14, txt: '"name": "Asha",', tr: 0 }, { ind: 14, txt: '"age": 30', tr: 3 }, { ind: 12, txt: '}', tr: 0 }];
        var src = ['        String json = """'].concat(content.map(function (l) { return sp(l.ind) + l.txt + sp(l.tr); })).concat([sp(c) + '""";']);
        var code = J(src);
        var rows0 = content.map(function (l, i) { return [String(i + 2), String(l.ind), pd(sp(l.ind) + l.txt + sp(l.tr))]; });
        rows0.push([String(content.length + 2), String(c), pd(sp(c)) + '"""   ← closing line counts!']);
        var min = Math.min(12, c);
        var hlMin = {}; rows0.forEach(function (r, i) { if (Number(r[1]) === min) hlMin[i] = 'sel'; });
        var after = content.map(function (l) { return sp(l.ind - min) + l.txt + sp(l.tr); });
        var trimmed = after.map(function (s) { return s.replace(/\s+$/, ''); });
        var finalStr = trimmed.join('\n') + '\n';
        var frames = [];
        frames.push({ narr: 'This is the text block <b>as typed</b> in the source file. It is indented to line up with the code. The closing <b>"""</b> sits at column <b>' + c + '</b>.', parts: [{ type: 'code', label: 'Source file', lang: 'java', code: code, hl: { 1: 'cur' } }, note('Rule 1', 'Content starts on the line <b>after</b> the opening <code>"""</code>. That first line break is not part of the string.')] });
        frames.push({ narr: 'Step 1: count leading spaces on every non-blank content line <b>and on the closing-delimiter line</b>. (· = space.)', parts: [{ type: 'table', label: 'Leading whitespace per line', columns: ['src line', 'leading spaces', 'line (· = space)'], rows: rows0 }] });
        frames.push({ narr: 'Step 2: the <b>minimum</b> is <b>' + min + '</b>' + (c < 12 ? ' — the closing """ is further left than the content, so it decides. That is how you <b>keep</b> indentation on purpose.' : c > 12 ? ' — the closing """ is further right, so the content lines decide.' : ' — content and closing """ agree.') + ' This amount is "incidental" (it only existed to line up with your code).', parts: [{ type: 'table', label: 'Leading whitespace per line', columns: ['src line', 'leading spaces', 'line (· = space)'], rows: rows0, hl: hlMin }, { type: 'vars', label: 'Computed', vals: { 'min indent': min }, hl: { 'min indent': 'sel' } }] });
        frames.push({ narr: 'Step 3: remove <b>' + min + '</b> spaces from the start of every line. The 2 extra spaces before "name" and "age" are <b>essential</b> indentation and stay.', parts: [{ type: 'table', label: 'After stripping ' + min + ' leading spaces', columns: ['line', 'text (· = space)'], rows: after.map(function (s, i) { return [String(i + 1), pd(s)]; }), hl: { 1: 'ok', 2: 'ok' } }] });
        frames.push({ narr: 'Step 4: strip <b>trailing</b> whitespace on every line. Line 3 had 3 invisible trailing spaces after <b>30</b> — they are gone. (Want to keep one? End the line with <b>\\s</b>.)', parts: [{ type: 'table', label: 'After stripping trailing spaces', columns: ['line', 'text (· = space)'], rows: trimmed.map(function (s, i) { return [String(i + 1), pd(s)]; }), hl: { 2: 'bad' } }] });
        frames.push({ narr: 'Step 5: normalize line endings to <b>\\n</b> (even if the file was saved with Windows \\r\\n) and only <b>then</b> process escapes like \\n, \\t, \\", \\s and \\&lt;newline&gt;. Escapes are interpreted last so they never affect the indentation maths.', parts: [{ type: 'array', label: 'lines joined with \\n', values: trimmed.map(function (s) { return s.replace(/ /g, '·') + '⏎'; }) }] });
        frames.push({ narr: 'Result: the closing """ is on its own line, so the string <b>ends with a newline</b>. Total length = <b>' + finalStr.length + '</b> characters.', parts: [{ type: 'text', label: 'Final String value', html: '<code>' + trimmed.map(function (s) { return dot(s); }).join('<span class="c-b">\\n</span><br>') + '<span class="c-b">\\n</span></code>' }, { type: 'vars', label: 'Facts', vals: { 'json.length()': finalStr.length, 'ends with \\n': 'true', 'min indent removed': min }, hl: { 'json.length()': 'sel' } }] });
        frames.push({ narr: 'Try other columns: <b>8</b> keeps 4 spaces of indentation on every line; <b>16</b> behaves exactly like 12 (content decides). Put the """ right after <b>}</b> to drop the final newline.', parts: [{ type: 'table', label: 'Closing delimiter column → effect', columns: ['column', 'min indent', 'first line becomes'], rows: [[String(Math.max(0, c - 4)), String(Math.min(12, Math.max(0, c - 4))), pd(sp(12 - Math.min(12, Math.max(0, c - 4))) + '{')], [String(c), String(min), pd(sp(12 - min) + '{')], [String(c + 4), String(Math.min(12, c + 4)), pd(sp(12 - Math.min(12, c + 4)) + '{')]], hl: { 1: 'sel' } }] });
        return frames;
      }
    },
    examples: [
      { title: 'Keep indentation on purpose by moving the closing delimiter left', html: `<p>Content at column 8, closing ${C('"""')} at column 4 → minimum is 4, so every line keeps 4 spaces. Output (· = space): ${C('····one')}, ${C('····two')}.</p>`, code: String.raw`
class Indent {
    public static void main(String[] args) {
        String s = """
                one
                two
            """;                       // closing delimiter 4 columns to the left
        System.out.print(s.replace(" ", "."));   // ....one / ....two
    }
}` },
      { title: 'Escape sequences unique to text blocks', html: `<p>${C('\\')} at the end of a line glues it to the next line — great for long log messages that must be one line. ${C('\\s')} is a single space that survives trailing-space stripping (useful for fixed-width output). Three quotes inside the text need one escaped quote: ${C('\\"""')}.</p>`, code: String.raw`
class Escapes {
    public static void main(String[] args) {
        String msg = """
            Payment failed for order 42 \
            because the card was declined.""";
        System.out.println(msg);              // one single line
        String padded = """
            name\s\s
            age\s""";
        System.out.println(padded.replace(" ", "_"));   // name__ / age_
        String quotes = """
            He said \"""wow\""" """;
        System.out.println(quotes);           // He said """wow"""
    }
}` },
      { title: 'Helpful NPE message points at the exact null', html: `<p>Running this prints: ${C('Cannot invoke "Address.city()" because the return value of "User.address()" is null')} (class names may be prefixed by the outer class). Before Java 14 you only got a line number, and with three calls on one line you had to guess.</p>`, code: `
record Address(String city) { }
record User(String name, Address address) { }

class HelpfulNpe {
    public static void main(String[] args) {
        User u = new User("asha", null);
        try {
            System.out.println(u.address().city().length());
        } catch (NullPointerException e) {
            System.out.println(e.getMessage());
        }
    }
}` },
      { title: 'Sequenced collections: one API for "first" and "last"', html: `<p>Before Java 21: ${C('list.get(list.size() - 1)')}, ${C('deque.peekLast()')}, iterate a whole ${C('LinkedHashSet')}… Now every ordered collection shares ${C('getFirst/getLast/addFirst/addLast/removeFirst/removeLast/reversed')}. ${C('reversed()')} is a <b>view</b>, not a copy.</p>`, code: `
import java.util.*;

class Sequenced {
    public static void main(String[] args) {
        List<Integer> list = new ArrayList<>(List.of(1, 2, 3));
        list.addFirst(0);
        list.removeLast();
        System.out.println(list + " " + list.reversed());       // [0, 1, 2] [2, 1, 0]
        var set = new LinkedHashSet<>(List.of("b", "a", "c"));
        System.out.println(set.getFirst() + set.getLast());      // bc
        List<Integer> view = list.reversed();
        list.add(9);
        System.out.println(view);                                // [9, 2, 1, 0] — a live view
    }
}` }
    ],
    deepDive: `<p><b>Text blocks are a compile-time feature.</b> javac performs the three steps — line-terminator normalization, incidental-whitespace stripping (the algorithm of ${C('String.stripIndent()')}), then escape translation (${C('String.translateEscapes()')}) — and stores an ordinary constant in the class file. So text blocks are <b>interned</b> like any literal: ${C('"""\\n    hi"""')} has the same value as ${C('"hi"')} and ${C('==')} is true. Tabs count as one whitespace character each, so mixing tabs and spaces gives surprising results; configure your editor to use spaces.</p>
<p><b>Blank lines</b> in the middle do not influence the minimum (they become empty lines), but the <b>closing-delimiter line always does</b>, even though it is blank. That is the one rule people get wrong.</p>
<p><b>var and inference:</b> ${C('var')} uses the type of the initializer exactly — including non-denotable types like anonymous classes and intersection types, which is why ${C('var')} can sometimes do things explicit types cannot (calling a method declared only in an anonymous class). It is a <i>reserved type name</i>, not a keyword: ${C('int var = 3;')} still compiles.</p>
<p><b>Helpful NPEs</b> are computed lazily by analysing the bytecode at the moment ${C('getMessage()')} is called, so they cost nothing until used. Local variable names appear only if compiled with ${C('-g')}; otherwise you see ${C('"<local1>"')}.</p>
<p><b>SequencedCollection</b> (JEP 431) inserted new interfaces into the hierarchy: ${C('SequencedCollection')} ⊃ ${C('List')}, ${C('Deque')}, ${C('SequencedSet')} (⊃ ${C('LinkedHashSet')}, ${C('SortedSet')}), and ${C('SequencedMap')} (⊃ ${C('LinkedHashMap')}, ${C('SortedMap')}). Adding default methods like ${C('getFirst')} caused rare source incompatibilities with classes that already defined ${C('getFirst()')} with a different return type (e.g. some Kotlin collections) — a nice example of why evolving popular interfaces is hard.</p>
<p><b>Stream.toList() vs Collectors.toList():</b> the former returns an unmodifiable list that <b>allows nulls</b> (unlike ${C('List.of')}); the latter makes no guarantee but is an ${C('ArrayList')} in practice. ${C('Collectors.toUnmodifiableList()')} rejects nulls.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI is great at producing multi-line SQL, JSON fixtures and prompt templates — and text blocks are the natural home for them. LLM prompt templates inside Java services (Spring AI, LangChain4j) are almost always text blocks + ${C('formatted()')}.</p>
<p><b>Use AI as a partner:</b> <code>Convert these concatenated SQL strings to text blocks with formatted(); keep exactly the same resulting string (show a test that asserts equality).</code> Asking for the equality test catches whitespace changes.</p>
<p><b>Where AI goes wrong:</b> uses String Templates (${C('STR."..."')}) which never became final and are gone in JDK 23+; puts content on the same line as the opening ${C('"""')} (compile error); forgets that the trailing newline changes equality in tests; builds SQL via ${C('formatted()')} with user input — <b>SQL injection</b>. Use ${C('PreparedStatement')} parameters for values; text blocks only for the query shape.</p>
<p><b>What you must still own:</b> knowing the exact whitespace rules (tests compare strings byte-for-byte), security of templating, and which "modern" API is actually available in the Java version your team runs.</p>`,
    problems: [{
      title: 'Re-implement the Text Block Indentation Algorithm',
      level: 'Medium', tags: ['strings', 'text blocks', 'algorithm'], companies: ['Oracle', 'JetBrains', 'Adobe'],
      statement: `<p>Write ${C('String strip(String raw)')} that behaves like ${C('String.stripIndent()')}: split into lines (the last line counts even if blank, and an input ending in ${C('\\n')} has an empty last line), compute the minimum leading whitespace over non-blank lines plus the last line, remove it from every line, remove trailing whitespace, blank lines become empty, and join with ${C('\\n')}.</p>`,
      constraints: `Input length ≤ 10<sup>5</sup>; whitespace = spaces or tabs (each counts as 1); O(n) time.`,
      example: `<p>Input (· = space): ${C('····{⏎······"a": 1···⏎····}⏎····')} → ${H.c('g', '{⏎··"a": 1⏎}⏎')}. Why: min indent is 4 (the last line "····" counts), trailing spaces after 1 are dropped, and the blank last line becomes empty, giving a final newline.</p>`,
      brute: { why: `<p>Naive: strip each line on its own with ${C('strip()')}. That destroys the <b>essential</b> indentation (the nested "a" loses its 2 spaces) and ignores the closing-line rule.</p>`, code: `
class StripNaive {
    static String strip(String raw) {
        StringBuilder sb = new StringBuilder();
        for (String line : raw.split("\\n", -1)) {
            if (sb.length() > 0) sb.append('\\n');
            sb.append(line.strip());          // loses relative indentation!
        }
        return sb.toString();
    }
    public static void main(String[] args) {
        System.out.println(strip("    {\\n      \\"a\\": 1\\n    }"));   // {  "a": 1 } on separate lines, no indent
    }
}` },
      mcq: { q: 'A text block\'s content lines start at column 10 and the closing """ is at column 6. How many spaces does each content line keep?', options: ['4', '0', '6', '10'], answer: 0, explain: 'The closing delimiter line counts towards the minimum: min(10, 6) = 6 spaces are stripped, so 10 − 6 = 4 remain.' },
      hints: [`<p>Hint 1: two passes. Pass 1 finds the minimum indentation; pass 2 builds the output. Use ${C('raw.split("\\n", -1)')} so a trailing empty line is kept.</p>`, `<p>Hint 2: skip blank lines when computing the minimum <b>except the last line</b>. Leading whitespace = ${C('line.length() - line.stripLeading().length()')}.</p>`, `<p>Hint 3: blank lines become ${C('""')}; others become ${C('line.substring(min).stripTrailing()')}. Edge: all-blank input → min 0. Compare with ${C('raw.stripIndent()')} to test.</p>`],
      tests: { sig: 'string -> string', fn: 'strip', cases: [
          [['    {\n      "a": 1   \n    }\n    '], '{\n  "a": 1\n}\n'],
          [['      x\n    y\n  '], '    x\n  y\n'],
          [['  a\n  b\n'], '  a\n  b\n'],
          [['  a\n\n    b  '], 'a\n\n  b'],
          [[''], ''],
          [['   '], ''],
          [['\ta\n\t\tb'], 'a\n\tb'],
          [['a\nb'], 'a\nb'],
          [['\n\n'], '\n\n'],
          [['x  \ny\t'], 'x\ny'],
          [[{ $concat: [{ $rep: '  a\n', n: 20000 }, '  '] }], { $rep: 'a\n', n: 20000 }]
        ] },
      solution: {
        approach: `<p>Exactly the JLS algorithm: (1) split keeping the last line; (2) min over significant lines (non-blank or last); (3) cut that prefix, trim the end, blank → empty; (4) join with "\\n". Validate against the JDK's own ${C('stripIndent')} on many inputs.</p>`,
        code: `
class StripIndent {
    static String strip(String raw) {
        String[] lines = raw.split("\\n", -1);               // -1 keeps a trailing empty line
        int min = Integer.MAX_VALUE;
        for (int i = 0; i < lines.length; i++) {
            String l = lines[i];
            boolean last = i == lines.length - 1;
            if (l.isBlank() && !last) continue;              // blank lines don't count…
            int lead = l.length() - l.stripLeading().length();
            min = Math.min(min, lead);                       // …but the last line always does
        }
        if (min == Integer.MAX_VALUE) min = 0;
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < lines.length; i++) {
            String l = lines[i];
            sb.append(l.isBlank() ? "" : l.substring(Math.min(min, l.length())).stripTrailing());
            if (i < lines.length - 1) sb.append('\\n');
        }
        return sb.toString();
    }

    public static void main(String[] args) {
        String[] tests = { "    {\\n      \\"a\\": 1   \\n    }\\n    ", "      x\\n    y\\n  ", "  a\\n  b\\n", "  a\\n\\n    b  " };
        for (String t : tests)
            System.out.println(strip(t).equals(t.stripIndent()));   // true x4
    }
}`,
        dry: { head: ['line', 'raw (· = space)', 'counts for min?', 'output'], rows: [['0', '····{', 'yes (4)', '{'], ['1', '······"a": 1···', 'yes (6)', '··"a": 1'], ['2', '····}', 'yes (4)', '}'], ['3 (last)', '····', 'yes — last line (4)', '"" (blank)'], ['result', 'min = 4', '—', H.c('g', '{⏎··"a": 1⏎}⏎')]] },
        complexity: `<p>O(n) time over the characters (two passes), O(n) extra space for the output. ${C('split')} uses a fast path for single-char regexes.</p>`,
        followUps: ['Also normalize \\r\\n and \\r line endings first, like javac does.', 'Implement translateEscapes for \\n, \\t, \\s and \\&lt;newline&gt;.', 'Why does the closing-delimiter line count, from a language-design point of view?']
      }
    }]
  });
  /* ======================================================================
     TOPIC 5 — Reflection, dynamic proxies & method handles
     ====================================================================== */
  topics.push({
    title: 'Reflection: Inspecting & Invoking Code at Runtime',
    analogy: `<p>Normally your code is a <b>guest</b> in a building: it uses the doors it was told about at compile time. <b>Reflection</b> is a visit to the <b>building-management office</b>: you can pull out the blueprint of any room (the ${C('Class')} object), list every door and safe (methods and fields), and with the <b>master key</b> (${C('setAccessible(true)')}) open even locked ones. Frameworks like Spring, Jackson, JUnit and Hibernate live in that office. But a gated community (a <b>module</b> that does not "open" its packages) can refuse your master key — and walking through the office is always slower than using the front door.</p>`,
    explain: `<p><b>Reflection</b> = code that looks at, and uses, other code <b>by name, at runtime</b>, without knowing the types at compile time. It lives in ${C('java.lang.Class')} and ${C('java.lang.reflect.*')}.</p>
<h4>1. Getting a Class object (three ways)</h4>
${P(`
Class<String> a = String.class;                 // compile-time known type
Class<?> b = "hi".getClass();                    // from an object (runtime type)
Class<?> c = Class.forName("java.util.ArrayList"); // from a String name (loads + initializes)`)}
<h4>2. Looking inside</h4>
${H.table(['Method', 'Returns', 'Includes private?', 'Includes inherited?'], [
  [C('getFields() / getMethods()'), 'public members', H.c('r', 'no'), H.c('g', 'yes (from superclasses & interfaces)')],
  [C('getDeclaredFields() / getDeclaredMethods()'), 'members written in THIS class', H.c('g', 'yes'), H.c('r', 'no')],
  [C('getConstructors() / getDeclaredConstructors()'), 'constructors', 'same rule', 'constructors are never inherited'],
  [C('getRecordComponents()'), 'record components in order', '—', '—'],
  [C('getPermittedSubclasses()'), 'sealed list', '—', '—']
])}
<p>Interview favourite: ${C('Greeter.class.getMethod("toString")')} works (public, inherited from Object) but ${C('getDeclaredMethod("toString")')} throws ${C('NoSuchMethodException')} unless Greeter overrides it.</p>
<h4>3. Using what you found</h4>
${P(`
Object g = Class.forName("Greeter").getDeclaredConstructor().newInstance(); // create
Method m = g.getClass().getDeclaredMethod("secret", String.class);           // find by name + param types
m.setAccessible(true);                                                       // bypass "private"
Object result = m.invoke(g, "Asha");                                         // call (null target for static)
Field f = g.getClass().getDeclaredField("count");
f.setAccessible(true);
f.set(g, 42);                                                                // write a private field`)}
<h4>4. The exceptions you must recognise</h4>
${H.table(['Exception', 'When'], [[C('ClassNotFoundException'), 'forName with a wrong name'], [C('NoSuchMethodException / NoSuchFieldException'), 'wrong name or parameter types (int.class ≠ Integer.class!)'], [C('IllegalAccessException'), 'not accessible and you did not call setAccessible — or writing a final field of a record'], [C('InvocationTargetException'), H.c('y', 'the invoked method itself threw') + ' — the real exception is ' + C('getCause()')], [C('InaccessibleObjectException'), 'setAccessible on a package the owning module does not open (e.g. String.value in java.base)']])}
<h4>5. Dynamic proxies — fake an interface at runtime</h4>
<p>${C('Proxy.newProxyInstance(loader, interfaces, handler)')} creates a class on the fly that implements the interfaces; every call goes to your ${C('InvocationHandler')}. That is how Spring adds ${C('@Transactional')} behaviour to interface beans, how Retrofit/Feign turn an interface into HTTP calls, and how simple mocking works. JDK proxies only work for <b>interfaces</b>; for classes, frameworks generate subclasses with ByteBuddy/CGLIB.</p>
<h4>6. When to use it (and when not)</h4>
<ul><li>${H.c('g', 'Yes:')} frameworks, serializers, test tools, plugin loading, annotation-driven configuration.</li><li>${H.c('r', 'No:')} ordinary business logic. You lose compile-time checks, refactoring safety, and speed. If you can write ${C('obj.method()')}, do that.</li></ul>`,
    clues: [
      '"call a method whose name comes from config / a string" → reflection (Method.invoke) or MethodHandle',
      '"how does Spring / Jackson / JUnit find my annotated methods?" → reflection over getDeclaredMethods + annotations',
      '"add logging / timing / transactions without touching the class" → dynamic proxy (interfaces) or bytecode subclass',
      '"InvocationTargetException in the logs" → look at getCause(), the real error',
      '"InaccessibleObjectException after upgrading to Java 17" → strong encapsulation; need --add-opens or a proper API',
      '"generic type information is erased… but I need List&lt;String&gt; from a field" → getGenericType() keeps signature generics',
      '"reflection is slow in a hot loop" → cache Method objects, or use MethodHandle / LambdaMetafactory'
    ],
    code: [`
import java.lang.reflect.*;
import java.util.*;

class Greeter {
    public String title = "Ms";
    private int count = 0;
    public String greet(String name) { count++; return "Hello, " + name; }
    private String secret(String name) { return "psst " + name; }
    public void boom() { throw new IllegalStateException("kaboom"); }
}

class ReflectDemo {
    public static void main(String[] args) throws Exception {
        Class<?> c = Class.forName("Greeter");                       // by name (no package here)
        Object g = c.getDeclaredConstructor().newInstance();          // like new Greeter()

        Method greet = c.getMethod("greet", String.class);            // public lookup
        System.out.println(greet.invoke(g, "Asha"));                  // Hello, Asha

        Method secret = c.getDeclaredMethod("secret", String.class);  // private needs "Declared"
        secret.setAccessible(true);                                   // same module → allowed
        System.out.println(secret.invoke(g, "Ben"));                  // psst Ben

        Field count = c.getDeclaredField("count");
        count.setAccessible(true);
        System.out.println(count.get(g));                              // 1 (greet ran once)

        try {
            c.getMethod("boom").invoke(g);
        } catch (InvocationTargetException e) {                        // wrapper!
            System.out.println("real cause: " + e.getCause());         // IllegalStateException: kaboom
        }

        for (Field f : c.getDeclaredFields())
            System.out.println(Modifier.toString(f.getModifiers()) + " " + f.getType().getSimpleName() + " " + f.getName());
    }
}`, `
import java.lang.reflect.*;
import java.util.*;

interface Calc { int add(int a, int b); int mul(int a, int b); }

class ProxyDemo {
    @SuppressWarnings("unchecked")
    static <T> T logging(T target, Class<T> iface) {
        InvocationHandler h = (proxy, method, args) -> {
            long t0 = System.nanoTime();
            Object result = method.invoke(target, args);          // forward to the real object
            System.out.println(method.getName() + Arrays.toString(args) + " = " + result
                + " in " + (System.nanoTime() - t0) / 1000 + " us");
            return result;
        };
        return (T) Proxy.newProxyInstance(iface.getClassLoader(), new Class<?>[]{iface}, h);
    }

    public static void main(String[] args) {
        Calc real = new Calc() {
            public int add(int a, int b) { return a + b; }
            public int mul(int a, int b) { return a * b; }
        };
        Calc calc = logging(real, Calc.class);
        calc.add(2, 3);     // add[2, 3] = 5 in .. us
        calc.mul(4, 5);     // mul[4, 5] = 20 in .. us
        System.out.println(calc.getClass().getSimpleName());   // $Proxy0 (generated at runtime)
    }
}`],
    codeTitle: ['Core reflection: forName, getMethod vs getDeclaredMethod, invoke, fields', 'Dynamic proxy: logging decorator without touching the class'],
    viz: {
      title: 'Reflection lookup flow: getMethod → getDeclaredMethod → setAccessible → invoke',
      input: 'secret',
      inputLabel: 'Method name to call: greet | secret | toString | boom | nope',
      gen: function (input) {
        var name = String(input || '').trim();
        if (!/^[A-Za-z_]\w{0,30}$/.test(name)) throw new Error('Enter a Java method name like greet, secret, toString, boom or nope');
        var methods = { greet: { pub: true, decl: true, ret: '"Hello, Asha"' }, secret: { pub: false, decl: true, ret: '"psst Asha"' }, toString: { pub: true, decl: false, inh: true, ret: '"Greeter@1b6d3586"' }, boom: { pub: true, decl: true, thr: 'IllegalStateException: kaboom' } };
        var info = methods[name];
        var args = name === 'toString' ? '' : ', String.class';
        var callArgs = name === 'toString' ? '' : ', "Asha"';
        var nodes = [bx('U', 'your code', 12, 12), bx('C', 'Class<Greeter>', 12, 46), bx('PUB', 'getMethod()', 44, 18), bx('DEC', 'getDeclaredMethod()', 44, 64), bx('M', 'Method ' + name, 80, 40)];
        var base = { PUB: 'public + inherited', DEC: 'this class only, any access' };
        function g(hl, ehl, tags, extraNodes, extraEdges) {
          var t = { PUB: base.PUB, DEC: base.DEC }; Object.keys(tags || {}).forEach(function (k) { t[k] = tags[k]; });
          return { type: 'graph', label: 'Lookup path', directed: true, height: 84, nodes: nodes.concat(extraNodes || []), edges: [['U', 'C'], ['C', 'PUB'], ['C', 'DEC'], ['PUB', 'M'], ['DEC', 'M']].concat(extraEdges || []), hl: hl || {}, ehl: ehl || {}, tags: t };
        }
        var table = { type: 'table', label: 'Methods Greeter can see', columns: ['method', 'modifier', 'declared in', 'getMethod finds?', 'getDeclaredMethod finds?'], rows: [['greet(String)', 'public', 'Greeter', 'yes', 'yes'], ['secret(String)', 'private', 'Greeter', 'NO', 'yes'], ['boom()', 'public', 'Greeter', 'yes', 'yes'], ['toString()', 'public', 'Object', 'yes (inherited)', 'NO']], hl: {} };
        var idx = { greet: 0, secret: 1, boom: 2, toString: 3 }[name];
        if (idx !== undefined) table.hl[idx] = 'cur';
        var frames = [];
        frames.push({ narr: 'Step 1: get the <b>Class object</b> — the runtime blueprint of Greeter. Every loaded class has exactly one per class loader.', parts: [g({ U: 'cur', C: 'ok' }, { 'U-C': 'ok' }), { type: 'code', label: 'Code', lang: 'java', code: 'Class<?> c = Greeter.class;\nObject g = c.getDeclaredConstructor().newInstance();', hl: { 1: 'cur' } }] });
        frames.push({ narr: 'Step 2: try <b>c.getMethod("' + esc(name) + '"' + esc(args) + ')</b>. It searches <b>public</b> methods of Greeter and all its supertypes.', parts: [g({ C: 'ok', PUB: 'cur' }, { 'C-PUB': 'cur' }), table] });
        if (!info) {
          frames.push({ narr: 'No public method called <b>' + esc(name) + '</b> → <span class="c-r">NoSuchMethodException</span>. Common real causes: a typo, wrong parameter types (<b>int.class</b> vs <b>Integer.class</b>), or the method is private.', parts: [g({ PUB: 'bad' }, { 'C-PUB': 'bad' }, { PUB: 'not found' }), out('java.lang.NoSuchMethodException: Greeter.' + name + '(java.lang.String)')] });
          frames.push({ narr: 'Fallback: <b>getDeclaredMethod</b> also fails — it is not declared in Greeter either. Reflection errors appear only at <b>runtime</b>; the compiler could not warn you. That is the price of calling by name.', parts: [g({ PUB: 'bad', DEC: 'bad' }, { 'C-PUB': 'bad', 'C-DEC': 'bad' }, { DEC: 'not found' }), out('java.lang.NoSuchMethodException: Greeter.' + name + '(java.lang.String)')] });
          return frames;
        }
        var path = info.pub ? 'PUB' : 'DEC';
        if (!info.pub) {
          frames.push({ narr: '<b>' + name + '</b> is <b>private</b>, so getMethod does not see it → NoSuchMethodException. We switch to <b>getDeclaredMethod</b>, which lists every method written in Greeter, whatever its access.', parts: [g({ PUB: 'bad', DEC: 'cur' }, { 'C-PUB': 'bad', 'C-DEC': 'cur' }, { PUB: 'NoSuchMethod' }), table] });
        }
        frames.push({ narr: 'Found: a <b>Method</b> object for ' + name + (info.inh ? ' — declared in <b>java.lang.Object</b>, reached because getMethod includes inherited methods. (getDeclaredMethod("toString") would have failed!)' : '.') + ' Cache this object: lookups are the expensive part.', parts: [g({ M: 'ok' }, (function () { var e = {}; e['C-' + path] = 'ok'; e[path + '-M'] = 'ok'; return e; })(), { M: info.pub ? 'public' : 'private' })] });
        if (!info.pub) {
          frames.push({ narr: 'Step 3: <b>m.setAccessible(true)</b>. Greeter is in the same (unnamed) module as us, so the JVM allows it. For a JDK class like String.value it would throw <span class="c-r">InaccessibleObjectException</span> because java.base does not <b>open</b> java.lang to us.', parts: [g({ M: 'ok' }, {}, { M: 'accessible' }, [bx('MOD', 'module check ✓', 80, 72)], [['M', 'MOD']]), { type: 'code', label: 'Code', lang: 'java', code: 'Method m = c.getDeclaredMethod("' + name + '", String.class);\nm.setAccessible(true);   // suppress Java language access checks', hl: { 2: 'ok' } }] });
        }
        frames.push({ narr: 'Step 4: <b>m.invoke(g' + esc(callArgs) + ')</b>. Arguments are passed as Object[] (primitives get boxed), the target is <b>g</b> (it would be <b>null</b> for a static method).', parts: [g({ M: 'cur' }, {}, {}, [bx('T', 'target object g', 80, 72)], [['M', 'T', 'invoke']]), { type: 'vars', label: 'invoke call', vals: { target: 'g (Greeter)', args: name === 'toString' ? '[]' : '["Asha"]' } }] });
        if (info.thr) {
          frames.push({ narr: 'The method itself throws. Reflection <b>wraps</b> it: you catch <span class="c-r">InvocationTargetException</span>, and the real problem is <b>e.getCause()</b>. Logging only the wrapper is a classic debugging trap.', parts: [g({ M: 'bad' }, {}, { M: 'threw' }), out('java.lang.reflect.InvocationTargetException\nCaused by: java.lang.' + info.thr)] });
        } else {
          frames.push({ narr: 'Result comes back as <b>Object</b> — cast it yourself. Result: <b>' + esc(info.ret) + '</b>. ' + (name === 'toString' ? 'The default Object.toString prints class name @ hash.' : ''), parts: [g({ M: 'ok' }, {}, { M: 'returned' }), out(info.ret.replace(/"/g, ''))] });
        }
        frames.push({ narr: 'Recap: lookup by <b>name + parameter types</b> → access check → invoke with boxing → unwrap result or cause. Try <b>greet</b>, <b>secret</b>, <b>toString</b>, <b>boom</b> and a wrong name like <b>nope</b>.', parts: [{ type: 'table', label: 'Cost per step (rough, after JIT warm-up)', columns: ['step', 'cost', 'tip'], rows: [['Class.forName', 'class loading (once)', 'cache the Class'], ['getDeclaredMethod', 'search + copy of Method', 'cache the Method'], ['setAccessible', 'once', 'needs open package'], ['invoke', 'a few ns (JDK 18+ uses method handles)', 'MethodHandle for hot paths']] }] });
        return frames;
      }
    },
    examples: [
      { title: 'getFields vs getDeclaredFields (output question)', html: `<p>${C('Greeter extends Base')}; Base has ${C('public int pub')} and ${C('protected int prot')}; Greeter has ${C('public title')}, ${C('private count')}, ${C('private static GREETING')}, package-private ${C('names')}. Output: ${H.c('b', '[title, pub]')} then ${H.c('b', '[title, count, GREETING, names]')}. getFields = public incl. inherited; getDeclaredFields = this class only, any access, statics included. (Order is not guaranteed by the spec, but HotSpot usually returns declaration order.)</p>`, code: `
import java.lang.reflect.*;
import java.util.*;

class Base { public int pub = 1; protected int prot = 2; }
class Greeter2 extends Base {
    public String title = "Ms";
    private int count = 0;
    private static final String GREETING = "Hello";
    List<String> names = new ArrayList<>();
}

class FieldsDemo {
    public static void main(String[] args) throws Exception {
        System.out.println(Arrays.stream(Greeter2.class.getFields()).map(Field::getName).toList());
        System.out.println(Arrays.stream(Greeter2.class.getDeclaredFields()).map(Field::getName).toList());
        System.out.println(Greeter2.class.getDeclaredField("names").getGenericType()); // java.util.List<java.lang.String>
    }
}` },
      { title: 'Strong encapsulation: Java 17 says no', html: `<p>Before Java 9 any code could ${C('setAccessible(true)')} on JDK internals. Since Java 16/17 the JDK is strongly encapsulated: this throws ${C('InaccessibleObjectException')} with the message <i>module java.base does not "opens java.lang" to unnamed module</i>. The escape hatch is a JVM flag ${C('--add-opens java.base/java.lang=ALL-UNNAMED')} — treat it as technical debt.</p>`, code: `
import java.lang.reflect.*;

class Encapsulation {
    public static void main(String[] args) throws Exception {
        Field value = String.class.getDeclaredField("value");    // finding it is fine
        try {
            value.setAccessible(true);                            // opening it is not
        } catch (InaccessibleObjectException e) {
            System.out.println(e.getMessage());
        }
    }
}` },
      { title: 'MethodHandles: the faster, type-checked cousin', html: `<p>A ${C('MethodHandle')} is looked up once with an access check at <b>lookup</b> time (not at every call), and ${C('invokeExact')} is type-checked and inlinable by the JIT. Since JDK 18 core reflection itself is built on method handles (JEP 416).</p>`, code: `
import java.lang.invoke.*;

class Handles {
    String greet(String n) { return "Hello, " + n; }

    public static void main(String[] args) throws Throwable {
        MethodHandle mh = MethodHandles.lookup()
            .findVirtual(Handles.class, "greet", MethodType.methodType(String.class, String.class));
        String r = (String) mh.invokeExact(new Handles(), "Bo");   // exact types: (Handles,String)String
        System.out.println(r);                                     // Hello, Bo
    }
}` },
      { title: 'Records and final fields resist reflection', html: `<p>Record fields are "trusted final": even after ${C('setAccessible(true)')}, ${C('Field.set')} throws ${C('IllegalAccessException')}. You can still read them, and ${C('getRecordComponents()')} gives names, types and accessor ${C('Method')}s in declaration order — the basis of record-aware JSON libraries.</p>`, code: `
import java.lang.reflect.*;

record P(int x, String y) { }

class RecordReflect {
    public static void main(String[] args) throws Exception {
        for (RecordComponent rc : P.class.getRecordComponents())
            System.out.println(rc.getType() + " " + rc.getName() + " = " + rc.getAccessor().invoke(new P(1, "b")));
        Field fx = P.class.getDeclaredField("x");
        fx.setAccessible(true);
        try { fx.set(new P(1, "a"), 9); }
        catch (IllegalAccessException e) { System.out.println("cannot modify record field"); }
    }
}` }
    ],
    deepDive: `<p><b>Performance history.</b> Old HotSpot implemented ${C('Method.invoke')} via a JNI "native accessor" for the first ~15 calls, then generated bytecode ("inflation"). JDK 18 (JEP 416) re-implemented core reflection on top of ${C('MethodHandle')}s; a ${C('Method')} held in a ${C('static final')} field can now be inlined almost like a direct call. Still, every call boxes primitives into an ${C('Object[]')}, checks argument types, and catches/wraps exceptions — measure with JMH before using it in a hot loop. The fastest dynamic option is ${C('LambdaMetafactory')} turning a handle into a real lambda (what frameworks like Jackson Afterburner/Blackbird do).</p>
<p><b>Class.forName subtleties.</b> The one-arg form <b>initializes</b> the class (runs static blocks) using the caller's class loader; ${C('forName(name, false, loader)')} loads without initializing. ${C('Foo.class')} does <b>not</b> initialize Foo. In app servers and plugin systems, use the <b>thread context class loader</b> or an explicit loader, or you get ClassNotFoundException for classes that clearly exist.</p>
<p><b>Generics and erasure.</b> Object instances do not know their type arguments (${C('new ArrayList<String>().getClass()')} is just ArrayList), but <b>signatures</b> keep them: ${C('Field.getGenericType()')}, ${C('Method.getGenericReturnType()')} and ${C('Class.getGenericSuperclass()')} return ${C('ParameterizedType')}. That is why "super type tokens" (${C('new TypeReference<List<User>>() {}')} in Jackson) work: the anonymous subclass records the type argument in its superclass signature.</p>
<p><b>Modules and access.</b> Accessibility now has two layers: Java language access (public/private) which ${C('setAccessible')} can suppress, and <b>module</b> access (exports/opens) which it cannot override. Frameworks need ${C('opens')} in ${C('module-info.java')} for deep reflection on your entities. ${C('MethodHandles.privateLookupIn')} is the modern way to get private access when a module grants it.</p>
<p><b>Security & maintainability.</b> Reflection bypasses invariants (writing private fields), breaks on renames (strings are not refactored), confuses static analysis and GraalVM native-image (needs reflection config). Reflection-free alternatives: annotation processors that generate code at compile time (Dagger, MapStruct, Micronaut) — next topic.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI can write a reflective utility (object mapper, test helper) in seconds, and explain stack traces full of ${C('InvocationTargetException')} and ${C('$Proxy')} frames.</p>
<p><b>Use AI as a partner:</b> <code>Here is an InvocationTargetException stack trace from Spring. Find the root cause frame and explain which proxy/advice layer is in between.</code> Or: <code>Rewrite this reflective mapper with MethodHandles and cache the lookups; add a JMH benchmark comparing both.</code></p>
<p><b>Where AI goes wrong:</b> suggests ${C('--illegal-access=permit')} (removed in Java 17) or blanket ${C('--add-opens')}; uses deprecated ${C('Class.newInstance()')}; looks up ${C('Method')} objects inside a hot loop; uses reflection for something a simple interface or lambda would do; and forgets that ${C('getDeclaredFields')} does not include superclass fields.</p>
<p><b>What you must still own:</b> judging whether reflection is justified at all, the module/encapsulation model, the performance and native-image implications, and the security impact of letting strings from config choose which code runs.</p>`,
    problems: [{
      title: 'Reflective Object-to-Map Dumper (classes and records)',
      level: 'Medium', tags: ['reflection', 'records', 'inheritance'], companies: ['Amazon', 'Salesforce', 'Thoughtworks'],
      statement: `<p>Write ${C('Map<String, Object> toMap(Object o)')}: for a <b>record</b>, return its components in declaration order (use ${C('getRecordComponents')} and the accessors); for a normal class, return every <b>non-static</b> field including private ones and those of <b>superclasses</b> (superclass fields first), stopping at ${C('Object')}.</p>`,
      constraints: `Classes are in your own module (setAccessible allowed). Hierarchy depth ≤ 10. Insertion order must be preserved.`,
      example: `<p>${C('class Base { public int pub = 1; protected int prot = 2; }')}, ${C('class Greeter extends Base { title="Ms", private count=1, static GREETING, names=[] }')} → ${H.c('g', '{pub=1, prot=2, title=Ms, count=1, names=[]}')}. ${C('new P(1, "b")')} (record) → ${H.c('g', '{x=1, y=b}')}. Why: static GREETING is skipped; Base comes first.</p>`,
      brute: { why: `<p>Using only ${C('getFields()')}: it sees <b>public</b> fields only (misses private count and protected prot), and calling ${C('getDeclaredFields()')} on the runtime class alone misses everything declared in superclasses. Both silently drop data.</p>`, code: `
import java.lang.reflect.*;
import java.util.*;

class DumpNaive {
    static Map<String, Object> toMap(Object o) throws IllegalAccessException {
        Map<String, Object> out = new LinkedHashMap<>();
        for (Field f : o.getClass().getFields()) out.put(f.getName(), f.get(o));   // public only!
        return out;
    }
    public static void main(String[] args) throws Exception {
        System.out.println(toMap(new java.awt.Point(1, 2)));   // {x=1, y=2} works only because x,y are public
    }
}` },
      mcq: { q: 'Which call returns a private field declared in the superclass?', options: ['<code>getSuperclass().getDeclaredFields()</code>', '<code>getFields()</code> on the subclass', '<code>getDeclaredFields()</code> on the subclass', 'None — private fields are not inherited so reflection cannot see them'], answer: 0, explain: 'getDeclaredFields only covers the class it is called on, and getFields only public members. Walk the getSuperclass() chain and call getDeclaredFields at each level.' },
      hints: [`<p>Hint 1: branch on ${C('c.isRecord()')}. For records, ${C('rc.getAccessor().invoke(o)')} reads each component without touching private fields.</p>`, `<p>Hint 2: for classes, walk ${C('for (k = c; k != Object.class; k = k.getSuperclass())')} and push onto the <b>front</b> of a deque so the topmost superclass comes first.</p>`, `<p>Hint 3: skip ${C('Modifier.isStatic(f.getModifiers())')}; call ${C('f.setAccessible(true)')} before ${C('f.get(o)')}; use ${C('LinkedHashMap')} to keep order. Synthetic fields (e.g. ${C('this$0')} of inner classes) can be skipped with ${C('f.isSynthetic()')}.</p>`],
      tests: { sig: 'string -> string', fn: 'chk', harness: { java: `
class Animal { private String name = "rex"; int legs = 4; }
class Dog extends Animal { boolean good = true; static int COUNT = 9; transient int t = 1; }
class Empty { }
class NullField { String s = null; int n = 3; }
class Outer { class In { int v = 5; } }
class LA { int a = 1; }
class LB extends LA { int b = 2; }
class LC extends LB { int c = 3; }
class L0 { int f0 = 0; } class L1 extends L0 { int f1 = 1; } class L2 extends L1 { int f2 = 2; } class L3 extends L2 { int f3 = 3; }
class L4 extends L3 { int f4 = 4; } class L5 extends L4 { int f5 = 5; } class L6 extends L5 { int f6 = 6; } class L7 extends L6 { int f7 = 7; }
class L8 extends L7 { int f8 = 8; } class L9 extends L8 { int f9 = 9; }
record EmptyRec() { }
record Rec(int a, List<String> b) { }
class Check {
  static String chk(String kind) throws Exception {
    Object o;
    switch (kind) {
      case "greeter": o = new Dumper.Greeter(); break;
      case "record": o = new Dumper.P(1, "b"); break;
      case "dog": o = new Dog(); break;
      case "empty": o = new Empty(); break;
      case "null": o = new NullField(); break;
      case "inner": o = new Outer().new In(); break;
      case "three": o = new LC(); break;
      case "depth10": o = new L9(); break;
      case "emptyRecord": o = new EmptyRec(); break;
      default: o = new Rec(2, List.of("x", "y"));
    }
    return Dumper.toMap(o).toString();
  }
}` }, cases: [
          [['greeter'], '{pub=1, prot=2, title=Ms, count=1, names=[]}'],
          [['record'], '{x=1, y=b}'],
          [['dog'], '{name=rex, legs=4, good=true, t=1}'],
          [['empty'], '{}'],
          [['null'], '{s=null, n=3}'],
          [['inner'], '{v=5}'],
          [['three'], '{a=1, b=2, c=3}'],
          [['depth10'], '{f0=0, f1=1, f2=2, f3=3, f4=4, f5=5, f6=6, f7=7, f8=8, f9=9}'],
          [['emptyRecord'], '{}'],
          [['rec'], '{a=2, b=[x, y]}']
        ] },
      tests: { sig: 'string -> string', fn: 'chk', harness: { java: `
class Animal { private String name = "rex"; int legs = 4; }
class Dog extends Animal { boolean good = true; static int COUNT = 9; transient int t = 1; }
class Empty { }
class NullField { String s = null; int n = 3; }
class Outer { class In { int v = 5; } }
class LA { int a = 1; }
class LB extends LA { int b = 2; }
class LC extends LB { int c = 3; }
class L0 { int f0 = 0; } class L1 extends L0 { int f1 = 1; } class L2 extends L1 { int f2 = 2; } class L3 extends L2 { int f3 = 3; }
class L4 extends L3 { int f4 = 4; } class L5 extends L4 { int f5 = 5; } class L6 extends L5 { int f6 = 6; } class L7 extends L6 { int f7 = 7; }
class L8 extends L7 { int f8 = 8; } class L9 extends L8 { int f9 = 9; }
record EmptyRec() { }
record Rec(int a, List<String> b) { }
class Check {
  static String chk(String kind) throws Exception {
    Object o;
    switch (kind) {
      case "greeter": o = new Dumper.Greeter(); break;
      case "record": o = new Dumper.P(1, "b"); break;
      case "dog": o = new Dog(); break;
      case "empty": o = new Empty(); break;
      case "null": o = new NullField(); break;
      case "inner": o = new Outer().new In(); break;
      case "three": o = new LC(); break;
      case "depth10": o = new L9(); break;
      case "emptyRecord": o = new EmptyRec(); break;
      default: o = new Rec(2, List.of("x", "y"));
    }
    return Dumper.toMap(o).toString();
  }
}` }, cases: [
          [['greeter'], '{pub=1, prot=2, title=Ms, count=1, names=[]}'],
          [['record'], '{x=1, y=b}'],
          [['dog'], '{name=rex, legs=4, good=true, t=1}'],
          [['empty'], '{}'],
          [['null'], '{s=null, n=3}'],
          [['inner'], '{v=5}'],
          [['three'], '{a=1, b=2, c=3}'],
          [['depth10'], '{f0=0, f1=1, f2=2, f3=3, f4=4, f5=5, f6=6, f7=7, f8=8, f9=9}'],
          [['emptyRecord'], '{}'],
          [['rec'], '{a=2, b=[x, y]}']
        ] },
      solution: {
        approach: `<p>Two strategies behind one method: records via their components (the public, stable API); plain classes via a superclass walk with declared fields. Collect the class chain top-down first so parent fields appear first, then read each non-static, non-synthetic field after opening it.</p>`,
        code: `
import java.lang.reflect.*;
import java.util.*;

class Dumper {
    static Map<String, Object> toMap(Object o) throws ReflectiveOperationException {
        Map<String, Object> out = new LinkedHashMap<>();
        Class<?> c = o.getClass();
        if (c.isRecord()) {                                           // records: use components
            for (RecordComponent rc : c.getRecordComponents())
                out.put(rc.getName(), rc.getAccessor().invoke(o));
            return out;
        }
        Deque<Class<?>> chain = new ArrayDeque<>();
        for (Class<?> k = c; k != null && k != Object.class; k = k.getSuperclass())
            chain.addFirst(k);                                        // topmost superclass first
        for (Class<?> k : chain) {
            for (Field f : k.getDeclaredFields()) {
                if (Modifier.isStatic(f.getModifiers()) || f.isSynthetic()) continue;
                f.setAccessible(true);                                // private/protected
                out.put(f.getName(), f.get(o));
            }
        }
        return out;
    }

    static class Base { public int pub = 1; protected int prot = 2; }
    static class Greeter extends Base {
        public String title = "Ms";
        private int count = 1;
        private static final String GREETING = "Hello";
        List<String> names = new ArrayList<>();
    }
    record P(int x, String y) { }

    public static void main(String[] args) throws Exception {
        System.out.println(toMap(new Greeter()));   // {pub=1, prot=2, title=Ms, count=1, names=[]}
        System.out.println(toMap(new P(1, "b")));   // {x=1, y=b}
    }
}`,
        dry: { head: ['step', 'class / member', 'action', 'map so far'], rows: [['chain', 'Greeter → Base → Object', 'addFirst: [Base, Greeter]', '{}'], ['Base', 'pub, prot', 'setAccessible + get', '{pub=1, prot=2}'], ['Greeter', 'title, count', 'read (count is private)', '{…, title=Ms, count=1}'], ['Greeter', 'GREETING', H.c('r', 'skip: static'), 'unchanged'], ['Greeter', 'names', 'read', '{…, names=[]}']] },
        complexity: `<p>O(F) reflective reads for F fields across the hierarchy; reflection lookups dominate. Cache the per-class ${C('Field[]')} list (e.g. in a ${C('ClassValue')}) if you call it often.</p>`,
        followUps: ['Make it recursive for nested objects, with cycle detection (IdentityHashMap).', 'Cache per-class metadata with <code>ClassValue&lt;List&lt;Field&gt;&gt;</code>.', 'How would a compile-time annotation processor generate the same code without reflection?']
      }
    }]
  });
  /* ======================================================================
     TOPIC 6 — Annotations & annotation processors
     ====================================================================== */
  topics.push({
    title: 'Annotations & Annotation Processors',
    analogy: `<p>Think of <b>sticky notes</b> on a printed report. A note on its own does nothing — it is just information. What matters is <b>who reads it and when</b>. Some notes are only for the writer and are peeled off before printing (${C('SOURCE')} retention: ${C('@Override')}). Some get printed into the archive copy but nobody looks at them later (${C('CLASS')}, the default!). Some stay readable for the office staff every day (${C('RUNTIME')}: Spring, JUnit, Jackson read them via reflection). An <b>annotation processor</b> is a proofreader who reads the notes <b>while the report is being printed</b> and adds brand-new pages (generated source files) — Lombok, MapStruct and Dagger are such proofreaders.</p>`,
    explain: `<p>An <b>annotation</b> is metadata attached to code: ${C('@Something(key = value)')}. By itself it changes nothing; a <b>tool</b> (the compiler, a processor, or a framework using reflection) gives it meaning.</p>
<h4>1. Built-in annotations you must know</h4>
${H.table(['Annotation', 'What it does'], [[C('@Override'), 'compile error if the method does not really override/implement anything (catches typos like ' + C('equals(Point p)') + ')'], [C('@Deprecated(since = "9", forRemoval = true)'), 'warns callers; forRemoval makes it a stronger warning'], [C('@SuppressWarnings("unchecked")'), 'silences specific compiler warnings in a small scope'], [C('@FunctionalInterface'), 'compile error if the interface has ≠ 1 abstract method'], [C('@SafeVarargs'), 'promise that a generic varargs method does not pollute the heap']])}
<h4>2. Declaring your own</h4>
${P(`
@Retention(RetentionPolicy.RUNTIME)       // keep it until runtime so reflection can see it
@Target(ElementType.METHOD)               // may only be placed on methods
public @interface Test {
    String name() default "";             // "elements" look like methods
    Class<? extends Throwable> expected() default None.class;
}
@Test(expected = ArithmeticException.class) void divideByZero() { ... }`)}
<p>Element types are limited to: primitives, ${C('String')}, ${C('Class')}, enums, other annotations, and 1-D arrays of those. Values must be <b>compile-time constants</b> (no ${C('null')}!). If the only element is called ${C('value')}, you may write ${C('@Audited("x")')} instead of ${C('@Audited(value = "x")')}.</p>
<h4>3. Meta-annotations (annotations on annotations)</h4>
${H.table(['Meta-annotation', 'Options / meaning'], [
  [C('@Retention'), C('SOURCE') + ' (dropped by javac) · ' + C('CLASS') + ' (in .class, invisible to reflection — ' + H.c('y', 'the default') + ') · ' + C('RUNTIME') + ' (visible to reflection)'],
  [C('@Target'), 'TYPE, FIELD, METHOD, PARAMETER, CONSTRUCTOR, LOCAL_VARIABLE, ANNOTATION_TYPE, PACKAGE, TYPE_PARAMETER, TYPE_USE, MODULE, RECORD_COMPONENT'],
  [C('@Inherited'), 'a <b>class</b> annotation is also reported on subclasses (not for interfaces, not for methods)'],
  [C('@Repeatable(Container.class)'), 'allow the same annotation several times; Java wraps them in the container'],
  [C('@Documented'), 'appear in Javadoc']
])}
<h4>4. Reading annotations at runtime</h4>
${P(`
for (Method m : MyTests.class.getDeclaredMethods()) {
    Test t = m.getAnnotation(Test.class);        // null if absent (or not RUNTIME!)
    if (t != null) { ... run it ... }
}`)}
<h4>5. Annotation processors — code that runs inside javac</h4>
<p>A processor extends ${C('AbstractProcessor')}. javac calls ${C('process(...)')} in <b>rounds</b>: round 1 sees your source; any files the processor generates are compiled in round 2 (and may trigger processors again); it stops when a round produces nothing new. A processor can <b>read</b> the program structure (${C('javax.lang.model')}), <b>report errors</b> with source positions (${C('Messager')}), and <b>generate new files</b> (${C('Filer')}). It <b>cannot modify existing classes</b> through the public API — Lombok does that by hacking javac's internal AST, which is why it breaks on some JDK upgrades.</p>
${H.table(['Approach', 'When it runs', 'Examples', 'Trade-off'], [['Runtime reflection', 'app start / every call', 'Spring, JUnit, Jackson, Hibernate', 'flexible; slower start-up; errors at runtime'], ['Annotation processing', 'compile time', 'Dagger, MapStruct, Micronaut, AutoValue, JPA metamodel', 'fast start, errors at compile time, debuggable generated code; more build setup']])}
<p><b>Version note:</b> javac discovers processors on the classpath via ${C('META-INF/services/javax.annotation.processing.Processor')}. JDK 21 prints a note when that happens implicitly; since <b>JDK 23 implicit processing is off by default</b> — configure processors explicitly (${C('-processorpath')}, Maven ${C('annotationProcessorPaths')}, Gradle ${C('annotationProcessor')}).</p>`,
    clues: [
      '"how does @Test / @Autowired / @GetMapping work?" → RUNTIME annotation + reflection scan',
      '"my custom annotation is always null at runtime" → missing @Retention(RUNTIME) (default is CLASS)',
      '"generate boilerplate at compile time, no reflection" → annotation processor (Filer)',
      '"fail the build if an annotation is used wrongly" → processor + Messager.printMessage(ERROR)',
      '"the same annotation twice on one method" → @Repeatable + container',
      '"annotation on the superclass should apply to subclasses" → @Inherited (class-level only)',
      '"fast start-up / GraalVM native image" → prefer compile-time processing over runtime reflection'
    ],
    code: [`
import java.lang.annotation.*;
import java.lang.reflect.*;
import java.util.*;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
@interface Check {
    String value() default "";                 // "value" allows @Check("desc")
    int priority() default 5;
}

class Health {
    @Check(value = "database reachable", priority = 1) boolean db() { return true; }
    @Check("disk space") boolean disk() { return false; }
    @Check boolean cache() { return true; }
    boolean notACheck() { return false; }      // ignored: no annotation
}

class CheckRunner {
    public static void main(String[] args) throws Exception {
        Health h = new Health();
        List<Method> checks = new ArrayList<>();
        for (Method m : Health.class.getDeclaredMethods())
            if (m.isAnnotationPresent(Check.class)) checks.add(m);
        checks.sort(Comparator.comparingInt((Method m) -> m.getAnnotation(Check.class).priority())
                              .thenComparing(Method::getName));
        for (Method m : checks) {
            Check c = m.getAnnotation(Check.class);
            String label = c.value().isEmpty() ? m.getName() : c.value();
            System.out.println("[p" + c.priority() + "] " + label + ": " + (((Boolean) m.invoke(h)) ? "OK" : "FAIL"));
        }
        // [p1] database reachable: OK / [p5] cache: OK / [p5] disk space: FAIL
    }
}`, `
import java.io.*;
import java.lang.annotation.*;
import java.util.*;
import javax.annotation.processing.*;
import javax.lang.model.SourceVersion;
import javax.lang.model.element.*;
import javax.tools.Diagnostic;

@Retention(RetentionPolicy.SOURCE)            // only the compiler needs it
@Target(ElementType.TYPE)
@interface FieldNames { }

// Generates  final class UserFields { static final String NAME = "name"; ... }
// for every class/record annotated with @FieldNames — at COMPILE time.
@SupportedAnnotationTypes("FieldNames")
@SupportedSourceVersion(SourceVersion.RELEASE_21)
public class FieldNamesProcessor extends AbstractProcessor {
    @Override
    public boolean process(Set<? extends TypeElement> annotations, RoundEnvironment round) {
        for (Element e : round.getElementsAnnotatedWith(FieldNames.class)) {
            if (e.getKind() != ElementKind.CLASS && e.getKind() != ElementKind.RECORD) {
                processingEnv.getMessager().printMessage(Diagnostic.Kind.ERROR,
                        "@FieldNames only on classes/records", e);           // build fails, points at e
                continue;
            }
            TypeElement type = (TypeElement) e;
            String name = type.getSimpleName() + "Fields";
            StringBuilder src = new StringBuilder("final class " + name + " {\\n");
            for (Element m : type.getEnclosedElements()) {
                if (m.getKind() == ElementKind.FIELD && !m.getModifiers().contains(Modifier.STATIC)) {
                    String f = m.getSimpleName().toString();
                    src.append("    static final String ").append(f.toUpperCase())
                       .append(" = \\"").append(f).append("\\";\\n");
                }
            }
            src.append("    private ").append(name).append("() { }\\n}\\n");
            try (Writer w = processingEnv.getFiler().createSourceFile(name, type).openWriter()) {
                w.write(src.toString());                                    // compiled in the next round
            } catch (IOException ex) {
                processingEnv.getMessager().printMessage(Diagnostic.Kind.ERROR, ex.toString(), e);
            }
        }
        return true;                                                        // we claim @FieldNames
    }
}
// Use:  javac -processorpath out -processor FieldNamesProcessor User.java
//       @FieldNames record User(String name, int age) { }   →   UserFields.NAME == "name"`],
    codeTitle: ['Runtime annotation + reflection: a tiny health-check runner', 'Compile-time annotation processor that generates a source file'],
    viz: {
      title: 'Life of an annotation: from source to javac rounds to runtime reflection',
      gen: function () {
        var N = [bx('SRC', 'User.java', 13, 12), bx('JC', 'javac: parse', 38, 12), bx('R1', 'round 1', 62, 12), bx('GEN', 'UserFields.java', 86, 12), bx('R2', 'round 2', 62, 40), bx('CLS', '.class files', 38, 40), bx('JVM', 'JVM loads class', 13, 40), bx('REF', 'getAnnotation()', 13, 68)];
        var E = [['SRC', 'JC'], ['JC', 'R1'], ['R1', 'GEN', 'Filer'], ['GEN', 'R2'], ['R2', 'CLS'], ['CLS', 'JVM'], ['JVM', 'REF']];
        function g(hl, ehl, tags) { return { type: 'graph', label: 'Pipeline', directed: true, height: 78, nodes: N, edges: E, hl: hl, ehl: ehl || {}, tags: tags || {} }; }
        var ret = function (hl) { return { type: 'table', label: 'Which annotations survive where', columns: ['annotation', 'retention', 'in source', 'in .class', 'via reflection'], rows: [['@FieldNames', 'SOURCE', 'yes', 'no', 'no'], ['@Override', 'SOURCE', 'yes', 'no', 'no'], ['@NoRetention (none given)', 'CLASS (default)', 'yes', 'yes, invisible', 'no → null'], ['@Check / @Test', 'RUNTIME', 'yes', 'yes, visible', 'yes']], hl: hl || {} }; };
        var src = J(['@FieldNames                    // SOURCE retention', 'record User(String name, int age) {', '    @Override public String toString() { return name; }', '}']);
        return [
          { narr: 'We write <b>User.java</b> with a <b>@FieldNames</b> annotation. Annotations are just metadata — nothing happens until a tool reads them.', parts: [g({ SRC: 'cur' }), { type: 'code', label: 'User.java', lang: 'java', code: src, hl: { 1: 'cur' } }] },
          { narr: 'javac parses the file and builds a model of every element (types, fields, methods). <b>@Override</b> is checked right here: if toString did not override anything, compilation would fail.', parts: [g({ SRC: 'done', JC: 'cur' }, { 'SRC-JC': 'ok' }), { type: 'code', label: 'User.java', lang: 'java', code: src, hl: { 3: 'ok' } }] },
          { narr: '<b>Round 1</b>: javac asks each registered processor "do you handle any of these annotations?". FieldNamesProcessor claims @FieldNames and gets the annotated element: the record User.', parts: [g({ JC: 'done', R1: 'cur' }, { 'JC-R1': 'ok' }, { R1: 'process(...)' }), { type: 'vars', label: 'RoundEnvironment', vals: { 'annotated with @FieldNames': 'User (RECORD)', 'fields found': 'name, age' } }] },
          { narr: 'The processor writes a <b>new source file</b> through the Filer. It cannot edit User.java — only add new files (or report errors with Messager).', parts: [g({ R1: 'ok', GEN: 'cur' }, { 'R1-GEN': 'ok' }, { GEN: 'generated' }), { type: 'code', label: 'generated: UserFields.java', lang: 'java', code: J(['final class UserFields {', '    static final String NAME = "name";', '    static final String AGE = "age";', '    private UserFields() { }', '}']), hl: { 2: 'ok', 3: 'ok' } }] },
          { narr: '<b>Round 2</b>: the generated file is parsed and processors run again on it (nothing new to do). A round that generates nothing ends processing. Then javac type-checks everything, so your code can use <b>UserFields.NAME</b>.', parts: [g({ GEN: 'done', R2: 'cur' }, { 'GEN-R2': 'ok' }, { R2: 'no new files → stop' })] },
          { narr: 'Bytecode is written. <b>SOURCE</b> annotations (@FieldNames, @Override) are dropped. <b>CLASS</b> ones are stored as RuntimeInvisibleAnnotations. <b>RUNTIME</b> ones as RuntimeVisibleAnnotations.', parts: [g({ R2: 'done', CLS: 'cur' }, { 'R2-CLS': 'ok' }), ret({ 0: 'bad', 1: 'bad' })] },
          { narr: 'At runtime the JVM loads the class. Only <b>RUNTIME</b> annotations are turned into objects (dynamic proxies implementing your @interface) when reflection asks for them.', parts: [g({ CLS: 'done', JVM: 'cur' }, { 'CLS-JVM': 'ok' }), ret({ 3: 'ok' })] },
          { narr: '<b>m.getAnnotation(Check.class)</b> returns an object for RUNTIME annotations and <span class="c-r">null</span> for everything else — the #1 "my annotation does not work" bug is a missing <b>@Retention(RUNTIME)</b>.', parts: [g({ JVM: 'done', REF: 'cur' }, { 'JVM-REF': 'ok' }), ret({ 2: 'bad', 3: 'ok' }), out('getAnnotation(Check.class)        → @Check(value="disk space", priority=5)\ngetAnnotation(NoRetention.class)  → null')] }
        ];
      }
    },
    examples: [
      { title: 'The default-retention trap (output question)', html: `<p>${C('@interface NoRetention {}')} has no ${C('@Retention')}, so it defaults to ${C('CLASS')}: stored in the class file but invisible to reflection. Output: ${H.c('r', 'null')}. Add ${C('@Retention(RetentionPolicy.RUNTIME)')} to fix.</p>`, code: `
import java.lang.annotation.*;
import java.lang.reflect.*;

@interface NoRetention { }
@Retention(RetentionPolicy.RUNTIME) @interface Visible { }

class RetentionDemo {
    @NoRetention @Visible void m() { }
    public static void main(String[] args) throws Exception {
        Method m = RetentionDemo.class.getDeclaredMethod("m");
        System.out.println(m.getAnnotation(NoRetention.class));   // null
        System.out.println(m.getAnnotation(Visible.class) != null); // true
    }
}` },
      { title: '@Repeatable: getAnnotation vs getAnnotationsByType', html: `<p>Two ${C('@Schedule')}s on one method are stored inside the container ${C('@Schedules')}. So ${C('getAnnotation(Schedule.class)')} returns ${H.c('r', 'null')} (there is no direct one!), while ${C('getAnnotationsByType(Schedule.class)')} looks through the container and returns ${H.c('g', '2')}. With a single ${C('@Schedule')} both work.</p>`, code: `
import java.lang.annotation.*;
import java.lang.reflect.*;

@Retention(RetentionPolicy.RUNTIME) @Repeatable(Schedules.class) @interface Schedule { String cron(); }
@Retention(RetentionPolicy.RUNTIME) @interface Schedules { Schedule[] value(); }

class Jobs {
    @Schedule(cron = "0 9 * * *") @Schedule(cron = "0 18 * * *") void report() { }
    public static void main(String[] args) throws Exception {
        Method r = Jobs.class.getDeclaredMethod("report");
        System.out.println(r.getAnnotation(Schedule.class));                 // null
        System.out.println(r.getAnnotationsByType(Schedule.class).length);    // 2
        System.out.println(r.getAnnotation(Schedules.class) != null);         // true
    }
}` },
      { title: '@Inherited works on classes only', html: `<p>${C('@Audited("parent")')} on ${C('Parent')} with ${C('@Inherited')}: ${C('Child.class.getAnnotation(Audited.class)')} finds it (${H.c('g', '"parent"')}), but ${C('getDeclaredAnnotation')} does not (${H.c('r', 'null')}) because it was not written on Child. @Inherited is ignored for interfaces and for method annotations — overriding methods do not inherit annotations.</p>`, code: `
import java.lang.annotation.*;

@Retention(RetentionPolicy.RUNTIME) @Inherited @interface Audited { String value(); }

@Audited("parent") class Parent { }
class Child extends Parent { }

class InheritedDemo {
    public static void main(String[] args) {
        System.out.println(Child.class.getAnnotation(Audited.class).value());   // parent
        System.out.println(Child.class.getDeclaredAnnotation(Audited.class));   // null
    }
}` },
      { title: '@Override catches a classic equals bug', html: `<p>${C('public boolean equals(Point p)')} <b>overloads</b> instead of overriding ${C('equals(Object)')}. HashSet calls ${C('equals(Object)')}, so duplicates sneak in. Adding ${C('@Override')} turns the silent bug into a compile error: <i>method does not override or implement a method from a supertype</i>.</p>`, code: `
import java.util.*;

class Pt {
    final int x;
    Pt(int x) { this.x = x; }
    public boolean equals(Pt p) { return p != null && p.x == x; }   // overload, not override!
    @Override public int hashCode() { return x; }
    public static void main(String[] args) {
        Set<Pt> s = new HashSet<>(List.of(new Pt(1)));
        s.add(new Pt(1));
        System.out.println(s.size());   // 2 — the "equal" point was added again
    }
}` }
    ],
    deepDive: `<p><b>What an annotation object really is.</b> An ${C('@interface')} compiles to an interface extending ${C('java.lang.annotation.Annotation')}. When you call ${C('getAnnotation')}, the JDK parses the class-file attribute and returns a <b>dynamic proxy</b> implementing your interface (${C('AnnotationInvocationHandler')}); ${C('equals')}/${C('hashCode')}/${C('toString')} are defined by the spec. Results are cached per Class/Method, so repeated lookups are cheap-ish, but scanning thousands of classes at startup is what makes Spring Boot apps slow to start — hence classpath indexes, AOT processing (Spring 6) and compile-time DI (Micronaut, Dagger, Quarkus build steps).</p>
<p><b>Type annotations (Java 8, ${C('TYPE_USE')}).</b> Annotations can sit on any <b>use</b> of a type: ${C('List<@NonNull String>')}, ${C('(@Nullable Object) x')}, ${C('String @NonNull []')}. The JDK ignores them; checkers like the <b>Checker Framework</b>, NullAway and JSpecify-aware IDEs turn them into compile-time null-safety. JSpecify 1.0 (2024) standardised ${C('@Nullable')}/${C('@NullMarked')} across tools.</p>
<p><b>Processor rules of the road:</b> processors must be deterministic and must not rely on file order; return ${C('true')} only for annotations you own; use ${C('Elements')}/${C('Types')} utilities instead of reflection (the classes being compiled do not exist yet as ${C('Class')} objects!); support incremental builds (Gradle "isolating"/"aggregating" processors). Generated code should be readable — it is debuggable in the IDE, which is a big advantage over runtime bytecode generation.</p>
<p><b>Element values are constants.</b> Because values live in the class file's constant pool, you cannot write ${C('@Check(priority = computePriority())')} or ${C('= null')}; that is why APIs use sentinel defaults like ${C('""')} or a marker class ${C('None.class')}.</p>
<p><b>Compile-time vs runtime is a real architecture decision</b>: reflection-heavy frameworks give flexibility and late binding; processor-based ones give fast startup, smaller memory, earlier errors and GraalVM-friendliness. Modern Java (Quarkus, Micronaut, Spring AOT, Helidon) moves work to build time.</p>`,
    aiEra: `<p><b>What AI changes:</b> writing a custom annotation + reflection scanner or a JavaPoet-based processor used to be niche knowledge; assistants now scaffold both. They also explain unfamiliar framework annotations instantly (${C('@Transactional(propagation = REQUIRES_NEW)')}).</p>
<p><b>Use AI as a partner:</b> <code>Write an annotation processor for @Builder on records that generates a builder class. Include a compile-testing unit test (google compile-testing) that asserts the generated source and an error for non-records.</code></p>
<p><b>Where AI goes wrong:</b> forgets ${C('@Retention(RUNTIME)')}; uses ${C('Class.forName')} inside a processor (classes are not compiled yet); claims processors can modify existing classes (only Lombok-style hacks can); invents annotation attributes that do not exist in a framework version; and stacks annotations whose combined semantics conflict (e.g. ${C('@Transactional')} on a private method — ignored by Spring's proxy).</p>
<p><b>What you must still own:</b> choosing compile-time vs runtime processing, understanding proxy-based annotation semantics (self-invocation bypasses ${C('@Transactional')}), build configuration for processors (JDK 23+ needs explicit setup), and reviewing generated code for correctness and security.</p>`,
    problems: [{
      title: 'Write a Mini JUnit: @Test with expected Exceptions',
      level: 'Medium', tags: ['annotations', 'reflection', 'exceptions'], companies: ['Google', 'Atlassian', 'Zoho'],
      statement: `<p>Define ${C('@Test')} with an optional ${C('expected')} exception class. Write ${C('run(Class<?> c)')} that creates a <b>fresh instance per test</b>, runs every ${C('@Test')} method (sorted by name for deterministic output), and prints ${C('PASS name')} or ${C('FAIL name: reason')}, then a summary line. A test with ${C('expected')} passes only if it throws that exception type (or a subclass).</p>`,
      constraints: `Test methods are no-arg instance methods; up to 1000 tests; never let one failing test stop the others.`,
      example: `<p>Tests: ${C('adds')} (ok), ${C('broken')} (throws AssertionError), ${C('divZero')} (expected ArithmeticException, throws it), ${C('noThrow')} (expected ArithmeticException, throws nothing) → ${H.c('g', 'PASS adds')}, ${H.c('r', 'FAIL broken: java.lang.AssertionError: 2*2 should be 5')}, ${H.c('g', 'PASS divZero')}, ${H.c('r', 'FAIL noThrow: expected ArithmeticException')}, ${H.c('b', '2 passed, 2 failed')}.</p>`,
      brute: { why: `<p>Hard-coding the test list in ${C('main')}: every new test needs a manual edit, forgetting one means it never runs, and one exception stops the whole run. Discovery by annotation removes all three problems.</p>`, code: `
class ManualRunner {
    static void adds() { if (1 + 1 != 2) throw new AssertionError(); }
    static void broken() { if (2 * 2 != 5) throw new AssertionError("2*2 should be 5"); }
    public static void main(String[] args) {
        adds();      System.out.println("PASS adds");
        broken();    System.out.println("PASS broken");   // never reached: exception kills the run
    }
}` },
      mcq: { q: 'A test method throws ArithmeticException when called via Method.invoke. What does your runner actually catch?', options: ['InvocationTargetException whose getCause() is the ArithmeticException', 'ArithmeticException directly', 'IllegalAccessException', 'Nothing — invoke swallows exceptions'], answer: 0, explain: 'Reflection wraps any exception thrown by the target method in InvocationTargetException. Compare e.getCause() against expected().' },
      hints: [`<p>Hint 1: ${C('@Retention(RUNTIME)')} + ${C('@Target(METHOD)')}. For "no expected exception" use a private marker class as the default, because annotation defaults cannot be ${C('null')}.</p>`, `<p>Hint 2: loop over ${C('getDeclaredMethods()')}, sort by name, skip methods without the annotation; new instance per test via ${C('getDeclaredConstructor().newInstance()')}.</p>`, `<p>Hint 3: four outcomes — returns normally (pass unless expected set), throws (unwrap ${C('InvocationTargetException')}; pass if ${C('expected().isInstance(cause)')}). Count and print the summary.</p>`],
      tests: { sig: 'string -> string', fn: 'chk', harness: { java: `
class AllPass { @Test void a() { } @Test void b() { } }
class SubclassExpected { @Test(expected = RuntimeException.class) void x() { throw new IllegalStateException("s"); } }
class WrongException { @Test(expected = ArithmeticException.class) void x() { throw new NullPointerException("npe"); } }
class FreshState { int n; @Test void a() { n++; if (n != 1) throw new AssertionError("state leaked"); } @Test void b() { n++; if (n != 1) throw new AssertionError("state leaked"); } }
class NoTests { void helper() { } }
class Sorted { @Test void zeta() { } @Test void alpha() { } @Test void mid() { throw new AssertionError("m"); } }
class ManyTests {
  @Test void t01() { } @Test void t02() { } @Test void t03() { } @Test void t04() { } @Test void t05() { } @Test void t06() { }
  @Test void t07() { } @Test void t08() { } @Test void t09() { } @Test void t10() { } @Test void t11() { throw new AssertionError("x"); } @Test void t12() { }
}
class Check {
  static String chk(String kind) throws Exception {
    PrintStream old = System.out;
    ByteArrayOutputStream buf = new ByteArrayOutputStream();
    System.setOut(new PrintStream(buf, true));
    try {
      Class<?> c;
      switch (kind) {
        case "calc": c = CalcTests.class; break;
        case "allpass": c = AllPass.class; break;
        case "subclass": c = SubclassExpected.class; break;
        case "wrong": c = WrongException.class; break;
        case "fresh": c = FreshState.class; break;
        case "none": c = NoTests.class; break;
        case "sorted": c = Sorted.class; break;
        default: c = ManyTests.class;
      }
      MiniJUnit.run(c);
    } finally { System.setOut(old); }
    return buf.toString().trim().replace("\\n", "|");
  }
}` }, cases: [
          [['calc'], 'PASS adds|FAIL broken: java.lang.AssertionError: 2*2 should be 5|PASS divZero|FAIL noThrow: expected ArithmeticException|2 passed, 2 failed'],
          [['allpass'], 'PASS a|PASS b|2 passed, 0 failed'],
          [['subclass'], 'PASS x|1 passed, 0 failed'],
          [['wrong'], 'FAIL x: java.lang.NullPointerException: npe|0 passed, 1 failed'],
          [['fresh'], 'PASS a|PASS b|2 passed, 0 failed'],
          [['none'], '0 passed, 0 failed'],
          [['sorted'], 'PASS alpha|FAIL mid: java.lang.AssertionError: m|PASS zeta|2 passed, 1 failed'],
          [['many'], 'PASS t01|PASS t02|PASS t03|PASS t04|PASS t05|PASS t06|PASS t07|PASS t08|PASS t09|PASS t10|FAIL t11: java.lang.AssertionError: x|PASS t12|11 passed, 1 failed']
        ] },
      solution: {
        approach: `<p>The annotation carries the test metadata; reflection discovers and invokes the methods. Each test is isolated (fresh instance, its own try/catch) so failures do not cascade. Expected-exception logic compares the <b>unwrapped</b> cause against the annotation's class.</p>`,
        code: `
import java.lang.annotation.*;
import java.lang.reflect.*;
import java.util.*;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
@interface Test {
    Class<? extends Throwable> expected() default None.class;
    final class None extends Throwable { private None() { } }   // marker: "no exception expected"
}

class CalcTests {
    @Test void adds() { if (1 + 1 != 2) throw new AssertionError("1+1"); }
    @Test void broken() { if (2 * 2 != 5) throw new AssertionError("2*2 should be 5"); }
    @Test(expected = ArithmeticException.class) void divZero() { int z = 0; System.out.println(1 / z); }
    @Test(expected = ArithmeticException.class) void noThrow() { }
    void helper() { throw new IllegalStateException("never run: not a test"); }
}

class MiniJUnit {
    static void run(Class<?> c) throws ReflectiveOperationException {
        int pass = 0, fail = 0;
        Method[] methods = c.getDeclaredMethods();
        Arrays.sort(methods, Comparator.comparing(Method::getName));     // deterministic order
        for (Method m : methods) {
            Test t = m.getAnnotation(Test.class);
            if (t == null) continue;
            Object instance = c.getDeclaredConstructor().newInstance();   // fresh state per test
            boolean expectsThrow = t.expected() != Test.None.class;
            try {
                m.invoke(instance);
                if (expectsThrow) { fail++; System.out.println("FAIL " + m.getName() + ": expected " + t.expected().getSimpleName()); }
                else { pass++; System.out.println("PASS " + m.getName()); }
            } catch (InvocationTargetException e) {
                Throwable cause = e.getCause();                            // the real exception
                if (expectsThrow && t.expected().isInstance(cause)) { pass++; System.out.println("PASS " + m.getName()); }
                else { fail++; System.out.println("FAIL " + m.getName() + ": " + cause); }
            }
        }
        System.out.println(pass + " passed, " + fail + " failed");
    }

    public static void main(String[] args) throws Exception {
        run(CalcTests.class);
    }
}`,
        dry: { head: ['method (sorted)', '@Test?', 'what happened', 'verdict'], rows: [['adds', 'yes', 'returned normally', H.c('g', 'PASS')], ['broken', 'yes', 'ITE → AssertionError', H.c('r', 'FAIL')], ['divZero', 'yes, expected Arithmetic', 'ITE → ArithmeticException ✓', H.c('g', 'PASS')], ['helper', 'no', 'skipped', '—'], ['noThrow', 'yes, expected Arithmetic', 'returned normally', H.c('r', 'FAIL')]] },
        complexity: `<p>O(M log M) to sort M methods plus the cost of the tests. Reflection overhead per test is microseconds — negligible next to the test bodies.</p>`,
        followUps: ['Add <code>@BeforeEach</code>/<code>@AfterEach</code> support.', 'Run tests in parallel with virtual threads; what must be thread-safe?', 'Add a <code>timeout()</code> element and enforce it with a Future.']
      }
    }]
  });
  /* ======================================================================
     TOPIC 7 — JPMS: the Java Platform Module System
     ====================================================================== */
  topics.push({
    title: 'JPMS Modules: module-info, exports/opens, ServiceLoader & jlink',
    analogy: `<p>The old <b>classpath</b> is a huge <b>open-plan hall</b>: every jar dumps its furniture in the same room, anyone can sit on any chair (every ${C('public')} class is usable by everyone), and if two jars bring a chair with the same name, whichever is closer to the door wins — the famous <b>JAR hell</b>. The <b>module system</b> turns the hall into an <b>apartment building</b>. Each flat (module) has a <b>name plate</b>, a list of the flats it <b>visits</b> (${C('requires')}), the rooms guests may <b>walk into</b> (${C('exports')}), and the rooms where an <b>inspector with a master key</b> may look inside drawers (${C('opens')}, for reflection). If a flat you depend on is missing, the building manager refuses to open the building in the morning — you find out at <b>startup</b>, not at 3 a.m.</p>`,
    explain: `<p><b>JPMS</b> (Java 9, Project Jigsaw) adds a level above packages: a <b>module</b> is a named group of packages with a descriptor, ${C('module-info.java')}, at its source root.</p>
${P(`
module com.shop.orders {
    requires com.shop.common;                  // I need this module (compile + run)
    requires transitive com.shop.money;        // ...and whoever reads ME also reads money
    requires static lombok;                    // compile-time only, optional at runtime

    exports com.shop.orders.api;               // public types here are usable by others
    exports com.shop.orders.spi to com.shop.billing;   // qualified: only for billing

    opens com.shop.orders.model to com.fasterxml.jackson.databind;   // deep reflection allowed

    uses com.shop.payments.PaymentProvider;    // I look up implementations at runtime
    provides com.shop.payments.PaymentProvider
        with com.shop.orders.CardProvider;     // I supply one
}`)}
<h4>1. The two big promises</h4>
<ul><li><b>Reliable configuration:</b> the JVM resolves the whole module graph at startup. Missing module, two modules with the same package (<b>split package</b>), or a cycle → it refuses to start, with a clear message.</li>
<li><b>Strong encapsulation:</b> ${C('public')} is no longer "public to the world". A public class in a package that is <b>not exported</b> is invisible to other modules: <i>package com.shop.common.internal is not visible</i>.</li></ul>
<h4>2. exports vs opens — the most asked question</h4>
${H.table(['', 'exports p', 'opens p', 'neither'], [['Compile against public types', H.c('g', 'yes'), H.c('r', 'no'), H.c('r', 'no')], ['Use public members at runtime', H.c('g', 'yes'), 'via reflection only', H.c('r', 'no')], ['Reflect on private members (setAccessible)', H.c('r', 'no'), H.c('g', 'yes'), H.c('r', 'no')], ['Typical for', 'your API', 'entities/DTOs for Jackson, Hibernate, Spring', 'internals']])}
<p>${C('open module m { ... }')} opens <b>every</b> package for reflection — handy for apps full of framework-managed classes.</p>
<h4>3. Classpath vs module path — mixing old and new</h4>
${H.table(['Where the jar is', 'Becomes', 'Reads', 'Exports'], [['classpath', 'part of the single <b>unnamed module</b>', 'every module', 'everything (to other unnamed code)'], ['module path, has module-info', '<b>named (explicit) module</b>', 'only what it requires', 'only what it exports'], ['module path, no module-info', '<b>automatic module</b> (name from ' + C('Automatic-Module-Name') + ' or file name)', 'every module', 'every package']])}
<p>Named modules <b>cannot</b> read the unnamed module (classpath). That is why migration goes bottom-up or uses automatic modules as a bridge.</p>
<h4>4. Tools you should know</h4>
${H.table(['Command', 'Purpose'], [[C('java --list-modules'), 'modules in this JDK (java.base, java.sql, …)'], [C('java --describe-module java.sql'), 'see its exports/requires (java.sql requires transitive java.logging!)'], [C('jdeps --print-module-deps app.jar'), 'which JDK modules your app really needs'], [C('jlink --add-modules java.base,java.sql --output rt'), 'build a <b>custom small runtime</b> (great for containers)'], [C('--add-opens / --add-exports'), 'escape hatches on the command line (technical debt)']])}
<p><b>Reality check (2026):</b> most applications still run on the classpath, but <i>every</i> Java app is affected by JPMS because the <b>JDK itself</b> is modular and strongly encapsulated (since Java 17 there is no ${C('--illegal-access')} switch). Libraries publish ${C('Automatic-Module-Name')} or full descriptors; jlink-built slim runtimes are common in Docker images.</p>`,
    clues: [
      '"package X is not visible" at compile time → module does not export it',
      '"InaccessibleObjectException ... does not opens" → reflection needs opens (Jackson/Hibernate on entities)',
      '"JAR hell, two versions of the same class" → split packages; modules forbid them',
      '"make the Docker image / runtime smaller" → jdeps + jlink custom runtime',
      '"plugins discovered at runtime without hard dependencies" → ServiceLoader + uses/provides',
      '"my API returns a type from another module, callers can\'t compile" → requires transitive',
      '"optional dependency only needed at compile time (annotations)" → requires static'
    ],
    code: [{ lang: 'java', check: false, title: 'module-info.java files (separate compilation units, not compilable as a snippet)', code: `
// src/com.shop.common/module-info.java
module com.shop.common {
    exports com.shop.common.api;            // com.shop.common.internal stays hidden
}

// src/com.shop.app/module-info.java
module com.shop.app {
    requires com.shop.common;
    requires java.sql;                      // brings java.logging + java.xml transitively
    opens com.shop.app.model to com.fasterxml.jackson.databind;
    uses com.shop.common.api.PaymentProvider;
}

// Build & run with the module path:
//   javac -d out --module-source-path src -m com.shop.app,com.shop.common
//   java  -p out -m com.shop.app/com.shop.app.Main
//   jlink -p out --add-modules com.shop.app --launcher shop=com.shop.app/com.shop.app.Main --output shop-rt` }, `
import java.util.*;

class ModuleInspector {
    public static void main(String[] args) {
        Module base = String.class.getModule();
        System.out.println(base.getName() + " named=" + base.isNamed());          // java.base named=true
        System.out.println(ModuleInspector.class.getModule().isNamed());          // false: classpath = unnamed module
        System.out.println(base.isExported("java.lang"));                          // true
        System.out.println(base.isExported("jdk.internal.misc"));                  // false: JDK internal
        System.out.println(base.isOpen("java.lang"));                              // false: no deep reflection

        Module sql = ModuleLayer.boot().findModule("java.sql").orElseThrow();
        sql.getDescriptor().requires().stream()
           .map(r -> r.name() + " " + r.modifiers())
           .sorted()
           .forEach(System.out::println);
        // java.base [MANDATED] / java.logging [TRANSITIVE] / java.transaction.xa [TRANSITIVE] / java.xml [TRANSITIVE]
    }
}`],
    codeTitle: ['module-info.java + build commands', 'Inspecting modules at runtime with the Module API'],
    viz: {
      title: 'Module resolution and the three kinds of access failure',
      gen: function () {
        var N = [bx('APP', 'com.shop.app', 16, 12), bx('COM', 'com.shop.common', 56, 12), bx('API', 'pkg: ...common.api', 40, 42), bx('INT', 'pkg: ...common.internal', 76, 42), bx('BASE', 'java.base', 16, 68), bx('JACK', 'jackson.databind', 66, 68), bx('MOD', 'pkg: ...app.model', 16, 42)];
        function g(hl, edges, ehl, tags) { return { type: 'graph', label: 'Module graph', directed: true, height: 78, nodes: N, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
        var base = [['APP', 'COM', 'requires'], ['APP', 'BASE', 'implicit'], ['COM', 'API', 'exports'], ['COM', 'INT'], ['APP', 'MOD']];
        var mi = J(['module com.shop.app {', '    requires com.shop.common;', '    opens com.shop.app.model to jackson.databind;', '}', 'module com.shop.common {', '    exports com.shop.common.api;', '}']);
        return [
          { narr: 'Startup: the JVM reads every <b>module-info.class</b> on the module path. com.shop.app <b>requires</b> com.shop.common; every module implicitly requires <b>java.base</b>.', parts: [g({ APP: 'cur' }, base.slice(0, 2), { 'APP-COM': 'cur', 'APP-BASE': 'ok' }), { type: 'code', label: 'Descriptors', lang: 'java', code: mi, hl: { 1: 'cur', 2: 'cur' } }] },
          { narr: '<b>Resolution</b> builds the readability graph. If com.shop.common were missing you would get, before main() runs: <span class="c-r">Module com.shop.common not found, required by com.shop.app</span>. Reliable configuration!', parts: [g({ APP: 'ok', COM: 'ok', BASE: 'ok' }, base.slice(0, 2), { 'APP-COM': 'ok', 'APP-BASE': 'ok' }, { COM: 'resolved' }), { type: 'table', label: 'Resolution checks', columns: ['check', 'result'], rows: [['all required modules present', 'yes'], ['no two modules export/contain the same package', 'yes'], ['no cycles in requires', 'yes']] }] },
          { narr: 'com.shop.common <b>exports</b> only <b>com.shop.common.api</b>. The internal package is still full of <b>public</b> classes, but they are public <i>inside the module only</i>.', parts: [g({ API: 'ok', INT: 'bad' }, base, { 'COM-API': 'ok' }, { API: 'exported', INT: 'hidden' }), { type: 'code', label: 'Descriptors', lang: 'java', code: mi, hl: { 6: 'ok' } }] },
          { narr: 'Failure 1 — <b>compile time</b>: app code mentions <b>com.shop.common.internal.Secret</b>.', parts: [g({ INT: 'bad', APP: 'cur' }, base.concat([['APP', 'INT', 'uses Secret?']]), { 'APP-INT': 'bad' }), out('error: package com.shop.common.internal is not visible\n  (package com.shop.common.internal is declared in module com.shop.common, which does not export it)')] },
          { narr: 'Failure 2 — <b>reflection on a non-exported package</b>: Class.forName works, but calling even a public method fails with IllegalAccessException.', parts: [g({ INT: 'bad' }, base.concat([['APP', 'INT', 'reflection']]), { 'APP-INT': 'bad' }), out('IllegalAccessException: class com.shop.app.Main (in module com.shop.app) cannot access class com.shop.common.internal.Secret (in module com.shop.common) because module com.shop.common does not export com.shop.common.internal to module com.shop.app')] },
          { narr: 'Failure 3 — <b>deep reflection</b> (setAccessible on a private field) needs <b>opens</b>, not exports.', parts: [g({ INT: 'bad' }, base.concat([['APP', 'INT', 'setAccessible']]), { 'APP-INT': 'bad' }), out('InaccessibleObjectException: Unable to make field private java.lang.String com.shop.common.internal.Secret.hidden accessible: module com.shop.common does not "opens com.shop.common.internal" to module com.shop.app')] },
          { narr: 'The fix for frameworks: com.shop.app <b>opens com.shop.app.model to jackson.databind</b>. Jackson may now read private fields of your DTOs — and nobody else may.', parts: [g({ MOD: 'ok', JACK: 'ok' }, base.concat([['JACK', 'MOD', 'deep reflection ✓']]), { 'JACK-MOD': 'ok' }, { MOD: 'opened to jackson' }), { type: 'code', label: 'Descriptors', lang: 'java', code: mi, hl: { 3: 'ok' } }] },
          { narr: 'Bonus: because the graph is explicit, <b>jlink</b> can copy only the needed modules into a custom runtime image — often 40–60 MB instead of a 300+ MB full JDK.', parts: [{ type: 'bars', label: 'Runtime size (MB, typical)', values: [320, 58, 45], idxLabels: ['full JDK', 'jlink app', 'jlink + --strip-debug'], hl: { 2: 'ok' } }, out('jlink -p out --add-modules com.shop.app --strip-debug --no-header-files --no-man-pages --output shop-rt')] }
        ];
      }
    },
    examples: [
      { title: 'ServiceLoader: plugins without compile-time dependencies', html: `<p>The consumer says ${C('uses PaymentProvider')}; a provider module says ${C('provides PaymentProvider with CardProvider')}. ${C('ServiceLoader.load(PaymentProvider.class)')} then finds every implementation on the module path (on the classpath, it reads ${C('META-INF/services/<interface name>')} files). Swap a jar, get a new payment method — no code change.</p>`, code: `
import java.util.*;

interface PaymentProvider {
    String name();
    String pay(long cents);
}

class PluginHost {
    public static void main(String[] args) {
        List<PaymentProvider> found = new ArrayList<>();
        ServiceLoader.load(PaymentProvider.class).forEach(found::add);   // discovered at runtime
        System.out.println("plugins found: " + found.size());           // 0 here: no provider jars
        PaymentProvider p = found.stream()
            .filter(x -> x.name().equals("card"))
            .findFirst()
            .orElse(new PaymentProvider() {                              // built-in fallback
                public String name() { return "cash"; }
                public String pay(long cents) { return "paid " + cents + " in cash"; }
            });
        System.out.println(p.pay(500));                                  // paid 500 in cash
    }
}` },
      { title: 'requires transitive: why java.sql drags in java.logging', html: `<p>${C('java.sql.Driver.getParentLogger()')} returns a ${C('java.util.logging.Logger')}. If ${C('java.sql')} only did ${C('requires java.logging')}, your module would compile against ${C('Driver')} but could not name ${C('Logger')}. So ${C('java.sql')} declares ${C('requires transitive java.logging')}: anyone who reads java.sql automatically reads java.logging. Rule: if a type from module B appears in <b>your exported API</b>, require B <b>transitively</b>.</p>` },
      { title: 'Split packages are forbidden', html: `<p>Two modules both containing package ${C('com.acme.util')} → startup fails with <i>Module X contains package com.acme.util, module Y exports package com.acme.util to X</i>. On the classpath the same situation silently picks one class — the source of countless "works on my machine" bugs. Old libraries that split ${C('javax.annotation')} across jars were a famous migration pain.</p>` },
      { title: 'Reading a module at runtime', html: `<p>${C('getModule()')} works for any class. Classes from the classpath report an <b>unnamed</b> module (${C('getName()')} is ${C('null')}). Output: ${H.c('b', 'java.base true false null')}.</p>`, code: `
class WhichModule {
    public static void main(String[] args) {
        Module base = String.class.getModule();
        Module mine = WhichModule.class.getModule();
        System.out.println(base.getName() + " " + base.isNamed() + " " + mine.isNamed() + " " + mine.getName());
    }
}` }
    ],
    deepDive: `<p><b>Readability vs accessibility.</b> Two separate checks: module A must <b>read</b> module B (via requires, transitive requires, or ${C('--add-reads')}), and B must <b>export</b> (or open) the package to A. Only then do normal public/protected rules apply. ${C('setAccessible(true)')} can only suppress the <i>language</i> check, never the module check — that needs ${C('opens')}.</p>
<p><b>Layers and class loaders.</b> Modules live in a ${C('ModuleLayer')}; the boot layer is created at startup from the module path. Application servers/plugin systems can create child layers with their own configuration — the module system's answer to OSGi-style isolation (though without versions: JPMS deliberately does <b>not</b> solve version selection; Maven/Gradle still pick versions).</p>
<p><b>Automatic modules are a bridge, not a destination.</b> Their names come from the jar's ${C('Automatic-Module-Name')} manifest entry or are derived from the file name (${C('guava-33.0.jar')} → ${C('guava')}); a library that later picks a different real module name breaks everyone who required the derived name. That is why library authors were asked to reserve a name early.</p>
<p><b>Services under the hood.</b> ${C('ServiceLoader')} is lazy: it instantiates providers on iteration; providers can expose a ${C('public static provider()')} method instead of a public constructor. ${C('stream()')} gives ${C('Provider')} handles so you can filter by type without instantiating.</p>
<p><b>Startup & images.</b> Because the graph is known, ${C('jlink')} can apply plugins (strip debug info, compress, generate CDS archives) and build a minimal runtime. Combined with CDS/AppCDS (and Project Leyden's AOT cache in JDK 24+), modular images start faster. ${C('jdeps --ignore-missing-deps --print-module-deps')} is the practical first step for any Docker image diet.</p>
<p><b>Why most apps stay on the classpath:</b> frameworks rely heavily on reflection over application classes, many libraries lack descriptors, and build tools/test frameworks add friction (patching test classes into modules with ${C('--patch-module')}). The pragmatic 2026 stance: understand JPMS deeply because the JDK and libraries use it; modularize your own app when you need strong internal boundaries, jlink images, or you ship a library.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants can draft ${C('module-info.java')} files from ${C('jdeps')} output and translate cryptic module errors into plain explanations. They are good at producing the jlink/jdeps command lines for a Dockerfile.</p>
<p><b>Use AI as a partner:</b> <code>Here is jdeps output and the list of packages Jackson/Hibernate touch. Propose module-info.java with the minimum exports and qualified opens, and list which flags I would need if I stayed on the classpath.</code></p>
<p><b>Where AI goes wrong:</b> answers every InaccessibleObjectException with ${C('--add-opens java.base/java.lang=ALL-UNNAMED')} (hiding a real dependency on JDK internals), writes ${C('opens')} where ${C('exports')} is needed or vice versa, invents module names for libraries (check the jar's real ${C('Automatic-Module-Name')}), and forgets ${C('requires transitive')} for types exposed in APIs.</p>
<p><b>What you must still own:</b> drawing the module boundaries (that is architecture, not syntax), deciding when modularization is worth it, and keeping the escape-hatch flags under control in production launch scripts.</p>`,
    problems: [{
      title: 'Pluggable Exporters with ServiceLoader-style Discovery',
      level: 'Hard', tags: ['JPMS', 'ServiceLoader', 'plugin architecture', 'interfaces'], companies: ['Oracle', 'Red Hat', 'SAP'],
      statement: `<p>Design a report-export plugin system. Define ${C('interface Exporter { String format(); String export(List<Map<String, Object>> rows); }')}. Write a ${C('Registry')} that (1) loads exporters via ${C('ServiceLoader')}, (2) also accepts built-in exporters (CSV and JSON), (3) rejects duplicate format names, and (4) exports by format name, throwing a helpful error listing available formats when one is missing. Write the matching ${C('module-info.java')} lines in your explanation.</p>`,
      constraints: `No compile-time dependency from the host on any plugin class. Format names are case-insensitive. Up to 100 plugins.`,
      example: `<p>rows = ${C('[{id=1, name=Asha}, {id=2, name=Ben}]')}. ${C('export("csv")')} → ${H.c('g', 'id,name⏎1,Asha⏎2,Ben')}; ${C('export("JSON")')} → ${H.c('g', '[{"id":1,"name":"Asha"},{"id":2,"name":"Ben"}]')}; ${C('export("xml")')} → ${H.c('r', 'IllegalArgumentException: no exporter for xml, available: [csv, json]')}.</p>`,
      brute: { why: `<p>A ${C('switch')} over format names in the host that ${C('new')}s each exporter class. Every new format means editing and redeploying the host, and the host must depend on every plugin jar at compile time — the opposite of a plugin system.</p>`, code: `
import java.util.*;

class HardWiredExport {
    static String export(String format, List<Map<String, Object>> rows) {
        switch (format) {
            case "csv":  return "csv of " + rows.size() + " rows";     // new CsvExporter()...
            case "json": return "json of " + rows.size() + " rows";    // new JsonExporter()...
            default: throw new IllegalArgumentException(format);         // XML? edit & redeploy
        }
    }
    public static void main(String[] args) { System.out.println(export("csv", List.of(Map.of("id", 1)))); }
}` },
      mcq: { q: 'In a modular app, what does the host module declare to discover Exporter implementations at runtime?', options: ['<code>uses com.app.Exporter;</code>', '<code>requires com.plugins.xml;</code>', '<code>opens com.app to com.plugins.xml;</code>', '<code>exports com.plugins.xml;</code>'], answer: 0, explain: 'The consumer declares uses; each provider module declares provides Exporter with Impl. The host never requires the plugin modules, so plugins can be added by dropping jars on the module path.' },
      hints: [`<p>Hint 1: the interface lives in an API package the host <b>exports</b>; plugins ${C('requires')} the API module and ${C('provides')} implementations. The host only ${C('uses')} the interface.</p>`, `<p>Hint 2: build a ${C('Map<String, Exporter>')} keyed by lower-cased format; fill it from ${C('ServiceLoader.load(Exporter.class)')} plus built-ins; use ${C('putIfAbsent')} to detect duplicates.</p>`, `<p>Hint 3: error message should list ${C('new TreeSet<>(map.keySet())')}. CSV: header from the first row's keys (use LinkedHashMap rows for order). JSON: quote strings, leave numbers bare.</p>`],
      tests: { sig: 'string string string -> string', fn: 'chk', harness: { java: `
class YamlExporter implements Exporter {
  public String format() { return "YAML"; }
  public String export(List<Map<String, Object>> rows) { return "yaml:" + rows.size(); }
}
class CsvUpper implements Exporter {
  public String format() { return "CSV"; }
  public String export(List<Map<String, Object>> rows) { return "x"; }
}
class Check {
  static String chk(String builtins, String request, String rowsKind) {
    List<Map<String, Object>> rows = new ArrayList<>();
    if (rowsKind.equals("two")) {
      Map<String, Object> a = new LinkedHashMap<>(); a.put("id", 1); a.put("name", "Asha"); rows.add(a);
      Map<String, Object> b = new LinkedHashMap<>(); b.put("id", 2); b.put("name", "Ben"); rows.add(b);
    } else if (rowsKind.equals("mixed")) {
      Map<String, Object> a = new LinkedHashMap<>(); a.put("id", 1); a.put("ok", true); a.put("name", "A"); rows.add(a);
    }
    List<Exporter> list = new ArrayList<>();
    for (String b : builtins.split(",")) {
      switch (b) {
        case "csv": list.add(new CsvExporter()); break;
        case "json": list.add(new JsonExporter()); break;
        case "yaml": list.add(new YamlExporter()); break;
        default: list.add(new CsvUpper());
      }
    }
    try { return new Registry(list.toArray(new Exporter[0])).export(request, rows); }
    catch (RuntimeException e) { return e.getClass().getSimpleName() + ": " + e.getMessage(); }
  }
}` }, cases: [
          [['csv,json', 'csv', 'two'], 'id,name\n1,Asha\n2,Ben'],
          [['csv,json', 'JSON', 'two'], '[{"id":1,"name":"Asha"},{"id":2,"name":"Ben"}]'],
          [['csv,json', 'xml', 'two'], 'IllegalArgumentException: no exporter for xml, available: [csv, json]'],
          [['csv,csv', 'csv', 'two'], 'IllegalStateException: duplicate exporter for csv'],
          [['csv,json', 'CSV', 'two'], 'id,name\n1,Asha\n2,Ben'],
          [['csv,json,yaml', 'Yaml', 'two'], 'yaml:2'],
          [['csv,json', 'csv', 'empty'], ''],
          [['csv,json', 'json', 'empty'], '[]'],
          [['csv,json', 'json', 'mixed'], '[{"id":1,"ok":true,"name":"A"}]'],
          [['csv,json', 'csv', 'mixed'], 'id,ok,name\n1,true,A'],
          [['csv,json,yaml', 'xml', 'two'], 'IllegalArgumentException: no exporter for xml, available: [csv, json, yaml]'],
          [['csv,upper', 'csv', 'two'], 'IllegalStateException: duplicate exporter for csv']
        ] },
      solution: {
        approach: `<p>Inversion of dependencies: the host owns the <b>interface</b>, plugins own the <b>implementations</b>, and ${C('ServiceLoader')} connects them at runtime. Module descriptors: API module ${C('exports com.app.export.api;')}; host ${C('uses com.app.export.api.Exporter;')}; each plugin ${C('requires com.app.export.api; provides com.app.export.api.Exporter with com.plugins.xml.XmlExporter;')}. The registry merges discovered and built-in exporters, enforcing unique names.</p>`,
        code: `
import java.util.*;
import java.util.stream.*;

interface Exporter {
    String format();
    String export(List<Map<String, Object>> rows);
}

class CsvExporter implements Exporter {
    public String format() { return "csv"; }
    public String export(List<Map<String, Object>> rows) {
        if (rows.isEmpty()) return "";
        List<String> cols = new ArrayList<>(rows.get(0).keySet());
        StringBuilder sb = new StringBuilder(String.join(",", cols));
        for (Map<String, Object> r : rows)
            sb.append('\\n').append(cols.stream().map(c -> String.valueOf(r.get(c))).collect(Collectors.joining(",")));
        return sb.toString();
    }
}

class JsonExporter implements Exporter {
    public String format() { return "json"; }
    private static String val(Object v) { return v instanceof Number || v instanceof Boolean ? String.valueOf(v) : "\\"" + v + "\\""; }
    public String export(List<Map<String, Object>> rows) {
        return rows.stream()
            .map(r -> r.entrySet().stream().map(e -> "\\"" + e.getKey() + "\\":" + val(e.getValue()))
                        .collect(Collectors.joining(",", "{", "}")))
            .collect(Collectors.joining(",", "[", "]"));
    }
}

class Registry {
    private final Map<String, Exporter> byFormat = new HashMap<>();

    Registry(Exporter... builtIns) {
        for (Exporter e : ServiceLoader.load(Exporter.class)) register(e);   // plugins (module path / META-INF/services)
        for (Exporter e : builtIns) register(e);
    }

    private void register(Exporter e) {
        String key = e.format().toLowerCase(Locale.ROOT);
        if (byFormat.putIfAbsent(key, e) != null)
            throw new IllegalStateException("duplicate exporter for " + key);
    }

    String export(String format, List<Map<String, Object>> rows) {
        Exporter e = byFormat.get(format.toLowerCase(Locale.ROOT));
        if (e == null)
            throw new IllegalArgumentException("no exporter for " + format + ", available: " + new TreeSet<>(byFormat.keySet()));
        return e.export(rows);
    }

    public static void main(String[] args) {
        Registry reg = new Registry(new CsvExporter(), new JsonExporter());
        List<Map<String, Object>> rows = new ArrayList<>();
        Map<String, Object> a = new LinkedHashMap<>(); a.put("id", 1); a.put("name", "Asha"); rows.add(a);
        Map<String, Object> b = new LinkedHashMap<>(); b.put("id", 2); b.put("name", "Ben");  rows.add(b);
        System.out.println(reg.export("csv", rows));    // id,name / 1,Asha / 2,Ben
        System.out.println(reg.export("JSON", rows));   // [{"id":1,"name":"Asha"},{"id":2,"name":"Ben"}]
        try { reg.export("xml", rows); }
        catch (IllegalArgumentException ex) { System.out.println(ex.getMessage()); }   // no exporter for xml, available: [csv, json]
    }
}`,
        dry: { head: ['step', 'action', 'byFormat'], rows: [['ServiceLoader', '0 plugins on path', '{}'], ['register(CsvExporter)', 'key "csv", new', '{csv}'], ['register(JsonExporter)', 'key "json", new', '{csv, json}'], ['export("JSON")', 'lower-case → "json" found', 'JSON string'], ['export("xml")', 'not found', H.c('r', 'error listing [csv, json]')]] },
        complexity: `<p>Registration O(P) for P exporters; lookup O(1) average. Export is O(rows × columns). ServiceLoader instantiation is lazy and happens once at startup.</p>`,
        followUps: ['Use <code>ServiceLoader.stream()</code> to filter providers by an annotation before instantiating them.', 'Load plugins from a directory at runtime with a new <code>ModuleLayer</code>.', 'How would you version the Exporter interface without breaking old plugins? (default methods)']
      }
    }]
  });
  /* ======================================================================
     TOPIC 8 — JMH benchmarking
     ====================================================================== */
  topics.push({
    title: 'JMH: Benchmarking Java Without Fooling Yourself',
    analogy: `<p>You want to know how fast a sprinter is. If you start the stopwatch while she is still <b>tying her shoes</b>, the time is terrible (that is the JVM <b>warming up</b>). If nobody stands at the finish line, a clever runner might <b>skip the race entirely</b> — the JIT compiler does exactly that with work whose result nobody uses (<b>dead-code elimination</b>). If you only time <b>one</b> race on <b>one</b> day, wind and mood decide the result (noise; you need <b>forks</b> and <b>iterations</b>). <b>JMH</b> is the professional race official: it handles warm-up laps, makes sure someone watches the finish line (${C('Blackhole')}), repeats the race on fresh tracks (forks) and reports the time <b>with an error bar</b>.</p>`,
    explain: `<p><b>JMH</b> (Java Microbenchmark Harness) is the OpenJDK project for measuring small pieces of Java code. Interviewers ask about it because the naive approach almost always gives wrong numbers.</p>
<h4>1. Why the naive stopwatch lies</h4>
${P(`
long t0 = System.nanoTime();
for (int i = 0; i < 1_000_000; i++) Math.log(i);   // result unused!
System.out.println((System.nanoTime() - t0) / 1_000_000 + " ns/op");`)}
${H.table(['Trap', 'What really happens', 'Effect on numbers'], [
  ['<b>JIT warm-up</b>', 'code starts interpreted, then C1, then optimized C2 (tiered compilation)', 'early runs 10–100× slower'],
  ['<b>Dead-code elimination</b>', 'result never used → C2 removes the call', H.c('r', 'impossibly fast (~0 ns)')],
  ['<b>Constant folding</b>', 'inputs are compile-time constants → answer pre-computed', 'too fast'],
  ['<b>Loop optimizations</b>', 'your measuring loop gets unrolled/hoisted/vectorized', 'per-op time is not what you think'],
  ['<b>OSR</b>', 'a long loop in main() is compiled mid-flight (on-stack replacement) — different code than normal calls', 'unrepresentative'],
  ['<b>Profile pollution</b>', 'benchmark B runs in the same JVM after A and inherits A\'s type profile', 'B looks slower than it is'],
  ['<b>Noise</b>', 'GC, CPU frequency scaling, other processes', 'big run-to-run variance']
])}
<h4>2. A correct JMH benchmark</h4>
${P(`
@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.NANOSECONDS)
@Warmup(iterations = 5, time = 1)       // let the JIT finish its work
@Measurement(iterations = 5, time = 1)
@Fork(3)                                 // 3 fresh JVMs → no profile pollution, see variance
@State(Scope.Thread)
public class LogBench {
    double x;                            // a FIELD, not a constant → no constant folding
    @Setup public void setup() { x = Math.random() * 1000 + 1; }

    @Benchmark public double log() { return Math.log(x); }   // RETURN it → JMH consumes it
}`)}
<h4>3. The annotations in one table</h4>
${H.table(['Annotation', 'Meaning'], [[C('@Benchmark'), 'the method to measure (JMH calls it in its own optimised loop — do not write your own loop)'], [C('@State(Scope.Thread | Benchmark | Group)'), 'a class holding inputs; per thread or shared'], [C('@Setup / @TearDown(Level.Trial | Iteration | Invocation)'), 'prepare data outside the measured time (Invocation level adds overhead — avoid for tiny ops)'], [C('@Param({"10", "1000"})'), 'run the benchmark for each value (input sizes)'], [C('@BenchmarkMode'), 'Throughput (ops/s), AverageTime, SampleTime (percentiles), SingleShotTime (cold start)'], [C('Blackhole.consume(x)'), 'when you produce several values: "someone watches the finish line"']])}
<h4>4. Running and reading the result</h4>
${P(`
mvn archetype:generate -DarchetypeGroupId=org.openjdk.jmh -DarchetypeArtifactId=jmh-java-benchmark-archetype
mvn package && java -jar target/benchmarks.jar LogBench -prof gc

Benchmark       Mode  Cnt   Score   Error  Units
LogBench.log    avgt   15  12.431 ± 0.218  ns/op`)}
<p><b>Score ± Error</b> is the mean and the 99.9% confidence interval. If two benchmarks' intervals overlap, you <b>cannot</b> claim one is faster. ${C('-prof gc')} adds allocation rate (bytes/op) — often more important than the time.</p>
<h4>5. Golden rules</h4>
<ol><li>Never benchmark in ${C('main()')} with nanoTime for anything below milliseconds.</li><li>Return the result or use a Blackhole.</li><li>Read inputs from ${C('@State')} fields, not constants.</li><li>Fork at least once (default 5 in recent JMH); warm up.</li><li>Measure what production does (realistic sizes via ${C('@Param')}, realistic data).</li><li>Explain the result (profilers: ${C('-prof gc')}, ${C('-prof perfasm')}, async-profiler) before believing it.</li></ol>`,
    clues: [
      '"is A faster than B?" with tiny operations → microbenchmark with JMH, not nanoTime',
      '"benchmark shows 0.3 ns per call" → dead-code elimination or constant folding',
      '"first run slow, later runs fast" → JIT warm-up / tiered compilation',
      '"results differ every run" → forks, more iterations, look at the error column',
      '"compare across input sizes" → @Param',
      '"how much does it allocate?" → -prof gc (gc.alloc.rate.norm)',
      '"cold start / serverless latency" → Mode.SingleShotTime (no warm-up)'
    ],
    code: [{ lang: 'java', check: false, title: 'A complete JMH benchmark (needs the org.openjdk.jmh dependency)', code: `
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.*;
import org.openjdk.jmh.annotations.*;
import org.openjdk.jmh.infra.Blackhole;

@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.MICROSECONDS)
@Warmup(iterations = 5, time = 1)
@Measurement(iterations = 5, time = 1)
@Fork(value = 2, jvmArgsAppend = "-XX:+UseG1GC")
@State(Scope.Thread)
public class SumBench {

    @Param({"100", "10000", "1000000"})     // run each benchmark for every size
    int size;

    int[] data;
    List<Integer> boxed;

    @Setup(Level.Trial)                      // NOT measured
    public void setup() {
        Random r = new Random(42);           // fixed seed → reproducible data
        data = r.ints(size, 0, 1000).toArray();
        boxed = Arrays.stream(data).boxed().collect(Collectors.toList());
    }

    @Benchmark
    public long forLoop() {                  // returning the value prevents dead-code elimination
        long s = 0;
        for (int v : data) s += v;
        return s;
    }

    @Benchmark
    public long intStream() { return Arrays.stream(data).asLongStream().sum(); }

    @Benchmark
    public long boxedStream() { return boxed.stream().mapToLong(Integer::longValue).sum(); }

    @Benchmark
    public void twoResults(Blackhole bh) {   // more than one result → Blackhole
        bh.consume(data.length);
        bh.consume(boxed.size());
    }
}
// Run: java -jar target/benchmarks.jar SumBench -prof gc` }, `
// The WRONG way (compiles and runs, but the numbers mean very little).
class NaiveBench {
    public static void main(String[] args) {
        for (int round = 1; round <= 5; round++) {
            long t0 = System.nanoTime();
            for (int i = 1; i <= 1_000_000; i++) {
                Math.log(i);                               // result discarded → may be eliminated
            }
            long ns = System.nanoTime() - t0;
            System.out.println("round " + round + ": " + (ns / 1_000_000.0) + " ns/op");
        }
        // Typical: round 1 is much slower (interpreter/C1), later rounds can approach 0 (DCE).
    }
}`],
    codeTitle: ['Correct: JMH with @State, @Param, @Setup, Blackhole', 'Incorrect: hand-rolled nanoTime loop (for comparison)'],
    viz: {
      title: 'Why a naive benchmark lies — and what JMH does about it',
      gen: function () {
        var warm = [950, 610, 220, 140, 31, 12.6, 12.4, 12.5];
        var labels = warm.map(function (_, i) { return 'it' + (i + 1); });
        return [
          { narr: 'We time <b>Math.log(x)</b> 8 times in one JVM. The first iterations run in the <b>interpreter</b> — roughly 100× slower than the final code.', parts: [{ type: 'bars', label: 'ns/op per iteration', values: warm.slice(0, 2), idxLabels: labels.slice(0, 2), hl: { 0: 'bad', 1: 'bad' } }, { type: 'table', label: 'Tier', columns: ['iterations', 'execution mode'], rows: [['1–2', 'interpreter (tier 0)']], hl: { 0: 'cur' } }] },
          { narr: 'Hot methods are compiled by <b>C1</b> (quick compiler with profiling) — faster, but still collecting statistics.', parts: [{ type: 'bars', label: 'ns/op per iteration', values: warm.slice(0, 4), idxLabels: labels.slice(0, 4), hl: { 2: 'cur', 3: 'cur' } }, { type: 'table', label: 'Tier', columns: ['iterations', 'execution mode'], rows: [['1–2', 'interpreter (tier 0)'], ['3–4', 'C1 with profiling (tier 3)']], hl: { 1: 'cur' } }] },
          { narr: 'Then <b>C2</b> recompiles using the profile: inlining, escape analysis, intrinsics (Math.log becomes a CPU-specific routine). Numbers settle at ~12.5 ns. Only these iterations describe steady state — that is why JMH has <b>@Warmup</b>.', parts: [{ type: 'bars', label: 'ns/op per iteration', values: warm, idxLabels: labels, hl: { 5: 'ok', 6: 'ok', 7: 'ok' } }, { type: 'table', label: 'Tier', columns: ['iterations', 'execution mode'], rows: [['1–2', 'interpreter (tier 0)'], ['3–4', 'C1 with profiling (tier 3)'], ['5', 'compiling…'], ['6–8', 'C2 optimized (tier 4) ← measure here']], hl: { 3: 'ok' } }] },
          { narr: 'Trap: the result of Math.log is <b>never used</b>. C2 proves the call has no side effects and <b>deletes it</b>. Your loop now measures an empty loop: <span class="c-r">0.3 ns/op</span>, faster than one CPU cycle per log. Impossible numbers = dead-code elimination.', parts: [{ type: 'bars', label: 'ns/op', values: [12.5, 0.3], idxLabels: ['real cost', 'naive (result unused)'], hl: { 1: 'bad' } }, { type: 'code', label: 'What C2 effectively runs', lang: 'java', code: 'for (int i = 0; i < n; i++) {\n    // Math.log(i);   ← removed: result unused, no side effects\n}', hl: { 2: 'bad' } }] },
          { narr: 'Second trap: <b>constant folding</b>. <code>Math.log(42.0)</code> with a literal can be computed once by the compiler. JMH fix: read inputs from a non-final <b>@State field</b>.', parts: [{ type: 'table', label: 'Same benchmark, three ways', columns: ['code', 'measured', 'why'], rows: [['Math.log(i); (unused)', '0.3 ns', 'dead code eliminated'], ['return Math.log(42.0);', '0.4 ns', 'constant folded'], ['return Math.log(state.x);', '12.5 ns', 'real work, result consumed']], hl: { 0: 'bad', 1: 'bad', 2: 'ok' } }] },
          { narr: '<b>Fix:</b> return the value (JMH feeds it to an implicit Blackhole) or call <code>bh.consume(v)</code>. The Blackhole is cheap but opaque to the JIT, so the work must really happen.', parts: [{ type: 'code', label: 'JMH version', lang: 'java', code: '@State(Scope.Thread)\npublic class LogBench {\n    double x = 42.0;          // field, not a constant\n    @Benchmark\n    public double log() {\n        return Math.log(x);   // returned → consumed\n    }\n}', hl: { 3: 'ok', 6: 'ok' } }] },
          { narr: 'Third trap: <b>noise and profile pollution</b>. JMH runs each benchmark in several <b>forked JVMs</b>. Here fork 2 got a slower result (another process was busy). The final score is the mean with a 99.9% <b>confidence interval</b>.', parts: [{ type: 'bars', label: 'score per fork (ns/op)', values: [12.4, 13.1, 12.5], idxLabels: ['fork 1', 'fork 2', 'fork 3'], hl: { 1: 'cur' } }, out('Benchmark     Mode  Cnt   Score   Error  Units\nLogBench.log  avgt   15  12.667 ± 0.412  ns/op')] },
          { narr: 'Reading results: A = 12.7 ± 0.4, B = 12.9 ± 0.5 → intervals <b>overlap</b>, so "B is slower" is <span class="c-r">not supported</span>. A = 12.7 ± 0.4 vs C = 48.0 ± 1.1 → a real 3.8× difference. Always explain the difference with a profiler before acting on it.', parts: [{ type: 'table', label: 'Comparing benchmarks', columns: ['benchmark', 'score ± error (ns/op)', 'conclusion'], rows: [['A: log(x)', '12.7 ± 0.4', 'baseline'], ['B: log(x) variant', '12.9 ± 0.5', 'no measurable difference'], ['C: BigDecimal version', '48.0 ± 1.1', 'really ~3.8× slower']], hl: { 1: 'win', 2: 'sel' } }] }
        ];
      }
    },
    examples: [
      { title: 'Dead-code elimination in a hand-written benchmark', html: `<p>The naive loop above often prints a slow first round and then numbers close to 0 ns/op. Nobody uses the result of ${C('Math.log')}, so C2 removes it. JMH's rule: <b>return</b> what you compute, or ${C('bh.consume')} it.</p>`, code: `
class DceDemo {
    static double sink;                                  // poor man's blackhole
    public static void main(String[] args) {
        for (int round = 1; round <= 3; round++) {
            long t0 = System.nanoTime();
            double acc = 0;
            for (int i = 1; i <= 2_000_000; i++) acc += Math.log(i);   // result USED
            sink = acc;                                  // escapes → cannot be eliminated
            System.out.printf("round %d: %.2f ns/op%n", round, (System.nanoTime() - t0) / 2_000_000.0);
        }
        // Better than nothing, but still OSR-compiled loop code: use JMH for real decisions.
    }
}` },
      { title: '@Param reveals where the crossover is', html: `<p>Comparing ${C('ArrayList')} vs ${C('LinkedList')} "get middle element" with ${C('@Param({"10","1000","100000"})')}: at 10 elements both are a few ns; at 100 000 LinkedList is thousands of times slower (O(n) walk + cache misses). One size would have hidden this. Always benchmark at production-like sizes.</p>`, code: { lang: 'java', check: false, code: `
import java.util.*;
import org.openjdk.jmh.annotations.*;

@State(Scope.Benchmark)
public class GetMiddle {
    @Param({"10", "1000", "100000"}) int n;
    List<Integer> array, linked;
    @Setup public void setup() {
        array = new ArrayList<>(); linked = new LinkedList<>();
        for (int i = 0; i < n; i++) { array.add(i); linked.add(i); }
    }
    @Benchmark public Integer arrayList()  { return array.get(n / 2); }
    @Benchmark public Integer linkedList() { return linked.get(n / 2); }
}` } },
      { title: 'Allocation matters: -prof gc', html: `<p>String concatenation in a loop vs ${C('StringBuilder')}: with ${C('-prof gc')} JMH prints ${C('gc.alloc.rate.norm')} in bytes per operation. Concatenating 100 short strings with ${C('+=')} allocates O(n²) bytes; the builder allocates O(n). Lower allocation means fewer GC cycles under load — often a bigger win in production than the raw ns/op.</p>`, code: { lang: 'java', check: false, code: `
import org.openjdk.jmh.annotations.*;

@State(Scope.Thread)
public class Concat {
    @Param({"100"}) int n;
    @Benchmark public String plus()    { String s = ""; for (int i = 0; i < n; i++) s += i; return s; }
    @Benchmark public String builder() { StringBuilder b = new StringBuilder(); for (int i = 0; i < n; i++) b.append(i); return b.toString(); }
}
// java -jar benchmarks.jar Concat -prof gc   → compare gc.alloc.rate.norm (B/op)` } },
      { title: 'Cold start: SingleShotTime', html: `<p>For CLI tools, serverless functions and first-request latency, the <b>warm</b> number is irrelevant. ${C('@BenchmarkMode(Mode.SingleShotTime)')} with ${C('@Warmup(iterations = 0)')} and many forks measures the very first call in a fresh JVM — this is where CDS archives, AOT caches (Project Leyden) and GraalVM native image shine.</p>` }
    ],
    deepDive: `<p><b>How JMH defeats the optimizer.</b> JMH generates a harness class per benchmark: it calls your method in a loop whose iteration count it controls, reads ${C('@State')} fields through indirections the JIT cannot constant-fold, and passes results to a ${C('Blackhole')} whose implementation makes the value "escape" cheaply (or, with ${C('-Djmh.blackhole.mode=COMPILER')} on JDK 17+, uses a JIT intrinsic that is truly zero-cost). Timing happens around batches, not single calls, so timer overhead (≈15–30 ns for nanoTime) is amortized.</p>
<p><b>Tiered compilation recap.</b> Tier 0 interpreter → tier 3 C1 with full profiling → tier 4 C2 using the profile (inlining, escape analysis, loop unrolling, vectorization, intrinsics). A method may also be <b>deoptimized</b> when an assumption breaks (a new subclass is loaded, an uncommon branch is taken) — which is why benchmarks with "polluted" type profiles (megamorphic call sites) behave differently from isolated ones, and why JMH forks.</p>
<p><b>Statistics.</b> JMH reports the mean and a confidence interval assuming roughly normal iteration scores; with SampleTime you get percentiles (p50, p99, p99.99) — the right view for latency SLOs. A tiny error with a few forks may still hide bimodal behaviour; plot the raw iteration data (${C('-rf json')}) when in doubt.</p>
<p><b>Microbenchmarks vs real systems.</b> A 3× gain in a 20 ns method is irrelevant if the request spends 40 ms in the database. Use profilers (async-profiler, JFR) to find hot spots <b>first</b>, then microbenchmark only those. Macro-level load tests (Gatling, k6) verify the end-to-end effect. Also beware environment differences: laptop thermal throttling, turbo boost, containers with CPU quotas, and JDK version (results can change between JDK 17, 21 and 25).</p>
<p><b>Common JMH mistakes:</b> loops inside ${C('@Benchmark')} (JIT optimizes across iterations), ${C('Level.Invocation')} setup for nanosecond ops (setup overhead dominates), sharing mutable state in ${C('Scope.Benchmark')} with multiple threads (false sharing, contention), benchmarking with assertions disabled vs enabled inconsistently, and comparing numbers from different machines.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes JMH boilerplate (archetype, @State, @Param) in seconds and can propose benchmark matrices. It can also summarize a JMH JSON result into a readable comparison.</p>
<p><b>Use AI as a partner:</b> <code>Review this JMH benchmark for dead-code elimination, constant folding, setup-in-measurement and shared-state issues; explain each risk before rewriting it.</code> And: <code>Given these JMH results with errors, which differences are statistically meaningful?</code></p>
<p><b>Where AI goes wrong:</b> it frequently writes ${C('System.nanoTime()')} benchmarks when asked "which is faster", declares winners from overlapping error bars, puts loops inside ${C('@Benchmark')} methods, uses ${C('final')} constant inputs, and confidently quotes performance numbers it never measured. Treat any AI performance claim as a <b>hypothesis</b> to benchmark.</p>
<p><b>What you must still own:</b> deciding whether a microbenchmark is even the right tool, designing realistic inputs, interpreting results with JIT knowledge, and connecting them to a production metric (latency percentiles, throughput, allocation, cost).</p>`,
    problems: [{
      title: 'Fix a Lying Benchmark',
      level: 'Hard', tags: ['JMH', 'JIT', 'performance', 'benchmarking'], companies: ['Netflix', 'LinkedIn', 'Jane Street'],
      statement: `<p>A teammate claims "${C('String.format')} is 10× slower than ${C('StringBuilder')}" using the hand-written benchmark below. Identify <b>every</b> methodological bug and rewrite it as a correct JMH benchmark that compares both approaches for realistic inputs.</p>`,
      constraints: `Use JMH annotations only (no manual timing). Include warm-up, forks, state-based inputs and result consumption. Report average time in ns/op and allocation.`,
      example: `<p>One run of the naive code printed ${H.c('r', 'format: 1742 ns, builder: 183 ns')}; another JVM or more iterations can show the builder collapsing toward ${H.c('r', '~0 ns')} once C2 eliminates the unused String. Neither number is trustworthy: both include interpreter time. A correct JMH run (illustrative) gives ${H.c('g', 'format ≈ 180 ± 6 ns/op, builder ≈ 25 ± 1 ns/op')} — a real ~7× gap, measured with error bars.</p>`,
      brute: { why: `<p>The original: (1) format is timed first while the JVM is cold; (2) the builder's result is never used, so C2 can delete it; (3) inputs are literals → constant folding; (4) one run, no forks, no error bars; (5) both loops in one method share an OSR-compiled frame and a polluted profile.</p>`, code: `
class LyingBench {
    public static void main(String[] args) {
        int n = 100_000;
        long t0 = System.nanoTime();
        for (int i = 0; i < n; i++) {
            String s = String.format("%s-%d", "order", 42);        // cold JVM, constant inputs
        }
        long t1 = System.nanoTime();
        for (int i = 0; i < n; i++) {
            String s = new StringBuilder().append("order").append('-').append(42).toString();  // result unused
        }
        long t2 = System.nanoTime();
        System.out.println("format: " + (t1 - t0) / n + " ns, builder: " + (t2 - t1) / n + " ns");
    }
}` },
      mcq: { q: 'The builder loop reports 3 ns/op for building a 8-char String. The most likely explanation is…', options: ['Dead-code elimination: the unused result let C2 remove most of the work', 'StringBuilder is a JVM intrinsic that costs nothing', 'nanoTime has 3 ns resolution', 'The CPU cached the string'], answer: 0, explain: 'Allocating and filling a String cannot take 3 ns. When the result never escapes, escape analysis + DCE can remove the allocation and the copying.' },
      hints: [`<p>Hint 1: list the five sins — cold start, unused result, constant inputs, single run, shared method/OSR. Each maps to one JMH feature.</p>`, `<p>Hint 2: put ${C('prefix')} and ${C('id')} in a ${C('@State(Scope.Thread)')} class with ${C('@Setup')} (e.g. random id), and make each approach its own ${C('@Benchmark')} method that <b>returns</b> the String.</p>`, `<p>Hint 3: add ${C('@Warmup')}, ${C('@Measurement')}, ${C('@Fork(3)')}, ${C('Mode.AverageTime')} in ns, and run with ${C('-prof gc')}. Add a third variant (${C('prefix + "-" + id')}, which uses invokedynamic StringConcatFactory) for completeness.</p>`],
      tests: { skip: 'needs the JMH harness (org.openjdk.jmh) and its annotation processor, which a plain JVM process does not have; the answer is a benchmark class, not a function with checkable output' },
      solution: {
        approach: `<p>Map every flaw to a JMH mechanism: warm-up iterations for JIT tiers; returning values for DCE; @State fields set in @Setup for constant folding; forks + measurement iterations for noise and profile isolation; separate @Benchmark methods so each gets its own compiled code. Add ${C('-prof gc')} because allocation explains most of the gap (format parses the pattern and allocates a Formatter).</p>`,
        code: { lang: 'java', check: false, code: `
import java.util.Random;
import java.util.concurrent.TimeUnit;
import org.openjdk.jmh.annotations.*;

@BenchmarkMode(Mode.AverageTime)
@OutputTimeUnit(TimeUnit.NANOSECONDS)
@Warmup(iterations = 5, time = 1)            // fix 1: JIT reaches C2 before we measure
@Measurement(iterations = 5, time = 1)
@Fork(3)                                     // fix 4 + 5: fresh JVMs, separate profiles, error bars
@State(Scope.Thread)
public class FormatBench {
    String prefix;
    int id;

    @Setup(Level.Trial)
    public void setup() {                    // fix 3: values unknown to the JIT → no constant folding
        prefix = "order";
        id = new Random().nextInt(1_000_000);
    }

    @Benchmark
    public String format() {                 // fix 2: returned → consumed by JMH's Blackhole
        return String.format("%s-%d", prefix, id);
    }

    @Benchmark
    public String builder() {
        return new StringBuilder().append(prefix).append('-').append(id).toString();
    }

    @Benchmark
    public String concat() {                 // javac → invokedynamic StringConcatFactory
        return prefix + "-" + id;
    }
}
// java -jar target/benchmarks.jar FormatBench -prof gc
// Benchmark            Mode  Cnt    Score   Error   Units
// FormatBench.builder  avgt   15   24.9 ±   0.8   ns/op
// FormatBench.concat   avgt   15   19.7 ±   0.6   ns/op
// FormatBench.format   avgt   15  181.3 ±   5.9   ns/op   (numbers are illustrative; measure on your machine)` },
        dry: { head: ['bug in naive code', 'symptom', 'JMH fix'], rows: [['format timed first on a cold JVM', 'format looks far slower', '@Warmup'], ['builder result unused', '3 ns/op (impossible)', 'return the String'], ['literal inputs', 'work pre-computed', '@State fields + @Setup'], ['single run', 'no idea of variance', '@Fork(3) + Score ± Error'], ['both loops in one main()', 'OSR + shared profile', 'separate @Benchmark methods']] },
        complexity: `<p>Benchmark run time ≈ forks × (warm-up + measurement) × benchmarks = 3 × 10 s × 3 ≈ 90 s. Each measured operation is O(length of output string).</p>`,
        followUps: ['Why is <code>prefix + "-" + id</code> fast since JDK 9? (StringConcatFactory picks an optimal strategy at link time)', 'How would you benchmark throughput under 8 threads? (@Threads(8), Mode.Throughput, Scope.Thread state)', 'When does a 7× microbenchmark win not matter in production?']
      }
    }]
  });
  /* ======================================================================
     TOPIC 9 — The tricky output-prediction question bank
     ====================================================================== */
  var PUZZLES = [
    { name: 'Integer cache', code: J(['Integer a = 127, b = 127;', 'Integer c = 128, d = 128;', 'System.out.println(a == b);', 'System.out.println(c == d);', 'System.out.println(c.equals(d));']), steps: [
      { l: 1, narr: '<b>Integer a = 127</b> is autoboxing: javac writes <b>Integer.valueOf(127)</b>. valueOf returns a <b>cached</b> object for −128..127, so a and b point to the <b>same</b> object.', v: { a: 'Integer@cache[127]', b: 'Integer@cache[127]' }, hv: { a: 'ok', b: 'ok' } },
      { l: 2, narr: '128 is outside the cache → valueOf creates a <b>new</b> Integer each time. c and d are two different objects with equal values.', v: { a: 'Integer@cache[127]', b: 'Integer@cache[127]', c: 'Integer@1 (128)', d: 'Integer@2 (128)' }, hv: { c: 'cur', d: 'cur' } },
      { l: 3, cls: 'ok', narr: '<b>==</b> on objects compares <b>references</b>. Same cached object → <b>true</b>.', out: 'true' },
      { l: 4, cls: 'bad', narr: 'Two different objects → <b>false</b>, even though both hold 128. This is the #1 Java output question.', out: 'true\nfalse' },
      { l: 5, cls: 'ok', narr: '<b>equals</b> compares values → <b>true</b>. Rule: never compare wrapper objects with ==. (The upper bound can be raised with -XX:AutoBoxCacheMax, so == "working" is never guaranteed.)', out: 'true\nfalse\ntrue' }
    ] },
    { name: 'String + char arithmetic', code: J(['System.out.println(1 + 2 + "3" + 4 + 5);', "System.out.println('a' + 'b' + \"c\");", "System.out.println(\"c\" + 'a' + 'b');", "System.out.println(1 + 2 + '3');"]), steps: [
      { l: 1, narr: '<b>+</b> is evaluated <b>left to right</b>. 1 + 2 = <b>3</b> (both ints → addition). Then 3 + "3" → a String is involved → concatenation "33".', v: { step1: '1 + 2 = 3', step2: '3 + "3" = "33"' } },
      { l: 1, cls: 'ok', narr: 'Once the left side is a String, every further + is concatenation: "33" + 4 = "334", + 5 = <b>"3345"</b> (not 39!).', v: { step3: '"33" + 4 = "334"', step4: '"334" + 5 = "3345"' }, hv: { step4: 'ok' }, out: '3345' },
      { l: 2, cls: 'bad', narr: "<b>'a' + 'b'</b>: two chars are promoted to <b>int</b> (97 + 98 = 195) — no String yet! Then 195 + \"c\" = <b>\"195c\"</b>.", v: { "'a'": 97, "'b'": 98, sum: 195 }, hv: { sum: 'bad' }, out: '3345\n195c' },
      { l: 3, cls: 'ok', narr: 'Starting with a String changes everything: "c" + \'a\' = "ca", + \'b\' = <b>"cab"</b>.', out: '3345\n195c\ncab' },
      { l: 4, cls: 'bad', narr: "1 + 2 = 3, then 3 + '3' = 3 + <b>51</b> (the char code of '3') = <b>54</b>.", v: { "'3' as int": 51 }, out: '3345\n195c\ncab\n54' }
    ] },
    { name: 'finally vs return', code: J(['static int f() {', '    int x = 1;', '    try { return x; }', '    finally { x = 99; }', '}', 'static int g() {', '    try { return 1; }', '    finally { return 2; }', '}', 'System.out.println(f() + " " + g());']), steps: [
      { l: [2, 3], narr: 'In f(), <b>return x</b> evaluates x (1) and <b>saves that value</b> in a hidden slot before running finally.', v: { x: 1, 'saved return value': 1 }, hv: { 'saved return value': 'cur' } },
      { l: 4, narr: 'finally sets x = 99, but the saved return value is a <b>copy</b> of the int — it does not change. (For a mutable object, changes to the object WOULD be visible.)', v: { x: 99, 'saved return value': 1 }, hv: { x: 'bad', 'saved return value': 'ok' } },
      { l: 5, cls: 'ok', narr: 'f() returns <b>1</b>.', v: { 'f()': 1 } },
      { l: 7, narr: 'In g(), <b>return 1</b> saves 1 and starts leaving the method…', v: { 'saved return value': 1 } },
      { l: 8, cls: 'bad', narr: '…but finally executes <b>return 2</b>, which <b>replaces</b> the pending return (it would even swallow an exception!). javac warns: "finally clause cannot complete normally".', v: { 'saved return value': 2 }, hv: { 'saved return value': 'bad' } },
      { l: 10, cls: 'sel', narr: 'Output <b>1 2</b>. Rule: never return from finally.', out: '1 2' }
    ] },
    { name: 'i = i++', code: J(['int i = 0;', 'i = i++;', 'int x = 5;', 'x = x++ + ++x;', 'System.out.println(i + " " + x);']), steps: [
      { l: 1, narr: 'i starts at 0.', v: { i: 0 } },
      { l: 2, narr: '<b>i++</b> evaluates to the <b>old</b> value (0) and then increments i to 1…', v: { i: 1, 'value of i++': 0 }, hv: { i: 'cur' } },
      { l: 2, cls: 'bad', narr: '…then the assignment <b>i = 0</b> runs <b>last</b>, overwriting the increment. i is 0 again.', v: { i: 0 }, hv: { i: 'bad' } },
      { l: 4, narr: 'x = 5. Left operand <b>x++</b> → value 5, x becomes 6. Right operand <b>++x</b> → x becomes 7, value 7. Operands are evaluated <b>left to right</b>.', v: { 'x++ (value)': 5, 'x after x++': 6, '++x (value)': 7 } },
      { l: 4, cls: 'ok', narr: '5 + 7 = 12 is assigned to x.', v: { x: 12 }, hv: { x: 'ok' } },
      { l: 5, cls: 'sel', narr: 'Output <b>0 12</b>.', out: '0 12' }
    ] },
    { name: 'Initialization order', code: J(['class A {', '    static { print("A-static "); }', '    { print("A-init "); }', '    A() { print("A() "); show(); }', '    void show() { print("A.show "); }', '}', 'class B extends A {', '    static { print("B-static "); }', '    int x = 7;', '    { print("B-init(x=" + x + ") "); }', '    B() { super(); print("B() "); }', '    void show() { print("B.show(x=" + x + ") "); }', '}', 'new B(); new B();']), steps: [
      { l: 14, narr: '<b>new B()</b>: B must be <b>initialized</b> first, and a class initializes its <b>superclass first</b>.', v: { 'A loaded': 'no', 'B loaded': 'no' } },
      { l: 2, narr: 'A\'s static block runs (once per class loader, ever).', out: 'A-static' },
      { l: 8, narr: 'Then B\'s static block.', out: 'A-static B-static' },
      { l: 11, narr: 'Memory for the B object is allocated with <b>default values</b> (x = 0). B() starts and immediately calls <b>super()</b>.', v: { 'this.x': 0 }, hv: { 'this.x': 'cur' }, out: 'A-static B-static' },
      { l: 3, narr: 'Inside A(): A\'s instance initializers run first (they are copied into the start of every A constructor, after super()).', v: { 'this.x': 0 }, out: 'A-static B-static A-init' },
      { l: 4, narr: 'A() prints and calls <b>show()</b>. The object is a B, so the <b>overriding</b> B.show runs (dynamic dispatch works even in constructors).', v: { 'this.x': 0 }, out: 'A-static B-static A-init A()' },
      { l: 12, cls: 'bad', narr: 'B.show reads x — but B\'s field initializers have <b>not run yet</b>. x is still the default <b>0</b>. Classic trap: never call overridable methods from a constructor.', v: { 'this.x': 0 }, hv: { 'this.x': 'bad' }, out: 'A-static B-static A-init A() B.show(x=0)' },
      { l: [9, 10], narr: 'Back in B(): after super() returns, B\'s field initializers and instance blocks run <b>in textual order</b>: x = 7, then the block prints it.', v: { 'this.x': 7 }, hv: { 'this.x': 'ok' }, out: 'A-static B-static A-init A() B.show(x=0) B-init(x=7)' },
      { l: 11, narr: 'Finally the rest of the B() body.', out: 'A-static B-static A-init A() B.show(x=0) B-init(x=7) B()' },
      { l: 14, cls: 'sel', narr: 'Second <b>new B()</b>: classes are already initialized — <b>no static blocks</b> this time.', out: 'A-static B-static A-init A() B.show(x=0) B-init(x=7) B()\nA-init A() B.show(x=0) B-init(x=7) B()' }
    ] },
    { name: 'Overload resolution', code: J(['static void m(Object o) { print("Object"); }', 'static void m(String s) { print("String"); }', 'static void n(long x)    { print("long"); }', 'static void n(Integer x) { print("Integer"); }', 'static void n(int... x)  { print("varargs"); }', 'm(null);', 'n(5);']), steps: [
      { l: 6, narr: '<b>m(null)</b>: null fits both Object and String. Java picks the <b>most specific</b> applicable method: String is a subtype of Object → <b>m(String)</b>.', v: { candidates: 'm(Object), m(String)', chosen: 'm(String)' }, hv: { chosen: 'ok' }, out: 'String' },
      { l: 7, narr: '<b>n(5)</b> — 5 is an int. Overload resolution runs in <b>3 phases</b>. Phase 1: no boxing, no varargs, but <b>widening</b> is allowed.', v: { phase: 1, rule: 'widening only' } },
      { l: 3, cls: 'ok', narr: 'int → long is a widening conversion, so <b>n(long)</b> is applicable in phase 1 and wins. Boxing (phase 2) and varargs (phase 3) are never even considered.', v: { phase: 1, chosen: 'n(long)' }, hv: { chosen: 'ok' }, out: 'String\nlong' },
      { l: [4, 5], cls: 'done', narr: 'If n(long) did not exist: phase 2 (boxing) → n(Integer). If only n(int...) existed: phase 3. Order: <b>widening &gt; boxing &gt; varargs</b> (old code must keep behaving the same after Java 5 added boxing).', out: 'String\nlong' }
    ] },
    { name: 'Ternary promotion & unboxing NPE', code: J(['Object o = true ? 1 : 2.0;', 'System.out.println(o);', 'Integer n = null;', 'int y = true ? n : 0;']), steps: [
      { l: 1, narr: 'A ternary with an <b>int</b> and a <b>double</b> branch has type <b>double</b> (binary numeric promotion), even though the true branch is chosen.', v: { 'type of ?:': 'double', value: '1.0' }, hv: { 'type of ?:': 'cur' } },
      { l: 2, cls: 'bad', narr: 'So it prints <b>1.0</b>, not 1.', out: '1.0' },
      { l: 4, narr: 'Branches are <b>Integer</b> and <b>int</b> → the ternary type is <b>int</b>, so the chosen Integer is <b>unboxed</b>: n.intValue()…', v: { n: 'null', 'type of ?:': 'int' }, hv: { n: 'bad' } },
      { l: 4, cls: 'bad', narr: '…on null → <span class="c-r">NullPointerException</span>. Fix: make both branches Integer (<code>Integer y = flag ? n : Integer.valueOf(0)</code>).', out: '1.0\nException in thread "main" java.lang.NullPointerException' }
    ] },
    { name: 'remove(int) vs remove(Object)', code: J(['List<Integer> list = new ArrayList<>(List.of(1, 2, 3));', 'list.remove(1);', 'System.out.println(list);', 'list.remove(Integer.valueOf(1));', 'System.out.println(list);']), steps: [
      { l: 1, narr: 'list = [1, 2, 3].', extra: [{ type: 'array', label: 'list', values: [1, 2, 3] }] },
      { l: 2, cls: 'bad', narr: 'List has <b>remove(int index)</b> and <b>remove(Object o)</b>. The argument 1 is an int → phase 1 (no boxing) finds remove(int) → removes <b>index 1</b> (the value 2).', extra: [{ type: 'array', label: 'list', values: [1, 2, 3], hl: { 1: 'bad' } }] },
      { l: 3, narr: 'Prints [1, 3].', out: '[1, 3]', extra: [{ type: 'array', label: 'list', values: [1, 3] }] },
      { l: 4, cls: 'ok', narr: 'With an explicit <b>Integer</b> object, remove(Object) is chosen → removes the <b>value</b> 1.', extra: [{ type: 'array', label: 'list', values: [1, 3], hl: { 0: 'bad' } }] },
      { l: 5, cls: 'sel', narr: 'Prints [3].', out: '[1, 3]\n[3]', extra: [{ type: 'array', label: 'list', values: [3] }] }
    ] }
  ];

  topics.push({
    title: 'Output-Prediction Question Bank: The Classic Java Traps',
    analogy: `<p>Output questions are like <b>magic tricks</b>. The audience (you) watches the obvious hand while the trick happens in the other hand: a hidden cache, a silent type promotion, an evaluation order rule. Once someone shows you where the other hand is, you can never be fooled by that trick again. This topic is the <b>magician's handbook</b> — every trick, the hidden hand, and the one-line rule that exposes it.</p>`,
    explain: `<p>Interviewers love "what does this print?" because the answer tests whether you know the <b>language rules</b>, not just the APIs. Almost every trick falls into one of these families:</p>
${H.table(['Family', 'Hidden rule', 'Classic example'], [
  ['Identity vs equality', C('==') + ' compares references; caches make some references equal', C('Integer 127 == 127') + ' true, 128 false; string pool'],
  ['Type promotion', 'byte/short/char → int in arithmetic; mixed ternary branches promote', C("'a' + 'b'") + ' = 195; ' + C('true ? 1 : 2.0') + ' prints 1.0'],
  ['Evaluation order', 'operands left → right; assignment last; finally runs after return value is saved', C('i = i++') + ' leaves i unchanged'],
  ['Overflow & precision', 'int wraps silently; doubles are binary fractions', C('Math.abs(Integer.MIN_VALUE)') + ' &lt; 0; ' + C('0.1 + 0.2 != 0.3')],
  ['Overload resolution', 'compile-time, most specific, widening &gt; boxing &gt; varargs', C('m(null)') + ' picks String; ' + C('list.remove(1)') + ' removes by index'],
  ['Dispatch & hiding', 'instance methods dispatch at runtime; fields and static methods do not', C('Parent p = new Child(); p.name') + ' is Parent\'s'],
  ['Initialization order', 'static (parent → child, once) → instance (parent → child) → constructor bodies', 'overridden method called from constructor sees default 0/null'],
  ['Collections traps', 'views, immutability, fail-fast iterators', C('Arrays.asList(int[])') + ' has size 1; ' + C('toList()') + ' unmodifiable'],
  ['Modern Java traps', 'switch on null, record equals with arrays, lazy streams', C('switch (null)') + ' NPE without case null']
])}
<h4>A method for any output question (do this out loud)</h4>
<ol>
<li><b>Types first:</b> write the static type of every expression (int? long? Integer? String?). Most tricks die here.</li>
<li><b>Compile-time decisions:</b> which overload? is it a compile-time constant (interned)? does it even compile?</li>
<li><b>Runtime order:</b> left-to-right operands, then assignment; class init before instance; finally after return-value capture.</li>
<li><b>Track state in a table</b> (variables, console) line by line — exactly what the visualizer does.</li>
<li><b>Check the edges:</b> null, overflow, caches (−128..127), NaN/−0.0, empty collections.</li>
</ol>
<p>The visualizer below steps through eight classic puzzles. The examples give 18 more, each with the exact output and the rule. The quiz and practice problems add many more.</p>`,
    clues: [
      '"What is the output of the following code?" → types first, then evaluation order, then state table',
      'wrapper objects compared with == → Integer cache (−128..127)',
      'chars added together before any String → int arithmetic',
      'return inside try with a finally → return value captured first; return in finally overrides',
      'constructor calls an overridable method → subclass fields still default',
      'overloads differing by int/long/Integer/varargs or Object/String with null → resolution phases',
      'Integer.MIN_VALUE, Math.abs, casts to byte → overflow / two\'s complement'
    ],
    code: [`
import java.util.*;

class OutputBank {
    static int f() { int x = 1; try { return x; } finally { x = 99; } }
    @SuppressWarnings("finally")
    static int g() { try { return 1; } finally { return 2; } }

    public static void main(String[] args) {
        Integer a = 127, b = 127, c = 128, d = 128;
        System.out.println((a == b) + " " + (c == d) + " " + c.equals(d)); // true false true
        System.out.println(1 + 2 + "3" + 4 + 5);                          // 3345
        System.out.println('a' + 'b' + "c");                               // 195c
        System.out.println(f() + " " + g());                               // 1 2
        int i = 0; i = i++;
        System.out.println(i);                                             // 0
        System.out.println(Math.abs(Integer.MIN_VALUE));                   // -2147483648
        System.out.println(0.1 + 0.2);                                     // 0.30000000000000004
        System.out.println((byte) 200);                                    // -56
        System.out.println(true ? 1 : 2.0);                                // 1.0
        List<Integer> list = new ArrayList<>(List.of(1, 2, 3));
        list.remove(1);
        System.out.println(list);                                          // [1, 3]
        System.out.println(Arrays.asList(new int[]{1, 2, 3}).size());      // 1
        System.out.println(-7 / 2 + " " + -7 % 2 + " " + Math.floorMod(-7, 2)); // -3 -1 1
    }
}`],
    codeTitle: ['A dozen classics in one program (outputs in comments, all verified)'],
    viz: {
      title: 'Step through classic output puzzles',
      input: '1',
      inputLabel: 'Puzzle number 1–8: 1 Integer cache · 2 String+char · 3 finally · 4 i=i++ · 5 init order · 6 overloads · 7 ternary · 8 remove()',
      gen: function (input) {
        var k = Number(String(input || '').trim());
        if (!Number.isInteger(k) || k < 1 || k > PUZZLES.length) throw new Error('Enter a puzzle number from 1 to ' + PUZZLES.length);
        var pz = PUZZLES[k - 1];
        var steps = [{ narr: 'Puzzle ' + k + ': <b>' + pz.name + '</b>. Predict the output before stepping! Method: types first → compile-time choices → runtime order → track state.', out: '' }].concat(pz.steps);
        return codeFrames(pz.code, steps, 'Puzzle ' + k + ' — ' + pz.name);
      }
    },
    examples: [
      { title: '1. String pool and compile-time constants', html: `<p>Output: ${H.c('b', 'true false true true')}. ${C('"a" + "b"')} is a <b>compile-time constant</b> → folded to "ab" and interned. ${C('aa + "b"')} uses a variable → new String at runtime. Making it ${C('final String fa = "a"')} turns it back into a constant. ${C('intern()')} returns the pooled instance.</p>`, code: `
class Pool {
    public static void main(String[] args) {
        String s1 = "ab";
        String aa = "a";
        final String fa = "a";
        System.out.println((s1 == "a" + "b") + " " + (s1 == aa + "b") + " " + (s1 == fa + "b") + " " + (s1 == (aa + "b").intern()));
    }
}` },
      { title: '2. Overflow you do not see', html: `<p>Output: ${H.c('b', '-2147483648 / -2147483648 / -2 4294967294 / 1 4294967296')}. ${C('Math.abs(MIN_VALUE)')} has no positive int to return. ${C('Integer.MAX_VALUE * 2')} overflows in <b>int</b> before widening to long; ${C('2L')} makes it long arithmetic. Shift distances are masked: ${C('1 << 32')} is ${C('1 << 0')}.</p>`, code: `
class Overflow {
    public static void main(String[] args) {
        System.out.println(Math.abs(Integer.MIN_VALUE));
        System.out.println(Integer.MAX_VALUE + 1);
        long wrong = Integer.MAX_VALUE * 2, right = Integer.MAX_VALUE * 2L;
        System.out.println(wrong + " " + right);
        System.out.println((1 << 32) + " " + (1L << 32));
    }
}` },
      { title: '3. Floating point surprises', html: `<p>Output: ${H.c('b', '0.30000000000000004 / false / true / false / -2 3 / Infinity / -0.0')}. Doubles are binary fractions; ${C('0.1f + 0.2f == 0.3f')} happens to round to the same float. NaN is not equal to itself with ${C('==')}. ${C('Math.round')} rounds half <b>up</b> (towards +∞): −2.5 → −2. Division by ${C('0.0')} is Infinity, not an exception.</p>`, code: `
class Floats {
    public static void main(String[] args) {
        System.out.println(0.1 + 0.2);
        System.out.println(0.1 + 0.2 == 0.3);
        System.out.println(0.1f + 0.2f == 0.3f);
        System.out.println(Double.NaN == Double.NaN);
        System.out.println(Math.round(-2.5) + " " + Math.round(2.5));
        System.out.println(1 / 0.0);
        System.out.println(Math.min(-0.0, 0.0));
    }
}` },
      { title: '4. Narrowing casts and literals', html: `<p>Output: ${H.c('b', '-56 -128 / 8 16 2 / 3 -3 0 2147483647')}. ${C('(byte) 200')} keeps the low 8 bits (200 − 256). A leading ${C('0')} means <b>octal</b>. Casting doubles to int truncates toward zero, NaN becomes 0, and too-large values clamp to MAX_VALUE.</p>`, code: `
class Casts {
    public static void main(String[] args) {
        System.out.println((byte) 200 + " " + (byte) 128);
        System.out.println(010 + " " + 0x10 + " " + 0b10);
        System.out.println((int) 3.99 + " " + (int) -3.99 + " " + (int) Double.NaN + " " + (int) 1e20);
    }
}` },
      { title: '5. Integer division and negative modulo', html: `<p>Output: ${H.c('b', '-3 -1 1 -4 / 10 / 2.0')}. Java's ${C('/')} truncates toward zero and ${C('%')} takes the sign of the dividend. Use ${C('Math.floorMod')} for "always positive" bucket indexes (hash tables, clock arithmetic). ${C('10 / 4')} is int division <b>before</b> assignment to a double.</p>`, code: `
class Division {
    public static void main(String[] args) {
        System.out.println(-7 / 2 + " " + -7 % 2 + " " + Math.floorMod(-7, 2) + " " + Math.floorDiv(-7, 2));
        System.out.println(10 / 3 * 3 + 10 % 3);
        double d = 10 / 4;
        System.out.println(d);
    }
}` },
      { title: '6. Static methods and fields do not override', html: `<p>Output: ${H.c('b', 'parent Parent.s child')}. Fields and static methods are resolved by the <b>static type</b> of the reference (${C('Parent')}) — this is <b>hiding</b>, not overriding. Only instance methods dispatch on the runtime object.</p>`, code: `
class Parent { String name = "parent"; static String s() { return "Parent.s"; } }
class Child extends Parent { String name = "child"; static String s() { return "Child.s"; } }

class Hiding {
    @SuppressWarnings("static-access")
    public static void main(String[] args) {
        Parent p = new Child();
        System.out.println(p.name + " " + p.s() + " " + ((Child) p).name);
    }
}` },
      { title: '7. Arrays.asList traps', html: `<p>Output: ${H.c('b', '1 3 / UOE / [9, 2, 3]')}. ${C('Arrays.asList(int[])')} sees <b>one</b> element (the array) because generics cannot hold primitives. The returned list is a fixed-size <b>view</b> over the array: ${C('add')} throws, ${C('set')} works (and writes through to the array).</p>`, code: `
import java.util.*;

class AsList {
    public static void main(String[] args) {
        System.out.println(Arrays.asList(new int[]{1, 2, 3}).size() + " " + Arrays.asList(new Integer[]{1, 2, 3}).size());
        try { Arrays.asList(1, 2, 3).add(4); } catch (UnsupportedOperationException e) { System.out.println("UOE"); }
        List<Integer> view = Arrays.asList(1, 2, 3);
        view.set(0, 9);
        System.out.println(view);
    }
}` },
      { title: '8. The HashSet<Short> puzzle', html: `<p>Output: ${H.c('b', '100')}. ${C('i - 1')} is an <b>int</b> expression, so ${C('remove(i - 1)')} boxes to ${C('Integer')}, and an Integer never equals a Short. Nothing is ever removed. (From <i>Java Puzzlers</i>; still a favourite.)</p>`, code: `
import java.util.*;

class ShortSet {
    public static void main(String[] args) {
        Set<Short> s = new HashSet<>();
        for (short i = 0; i < 100; i++) {
            s.add(i);
            s.remove(i - 1);        // removes an Integer — never present
        }
        System.out.println(s.size());
    }
}` },
      { title: '9. Fail-fast iterator: sometimes no exception!', html: `<p>Output: ${H.c('b', 'CME / [a, c]')}. Removing ${C('"a"')} inside a for-each triggers ${C('ConcurrentModificationException')} on the next ${C('next()')}. Removing the <b>second-to-last</b> element (${C('"b"')}) makes ${C('hasNext()')} return false (size shrank to the cursor), so the loop ends silently and the bug hides. Use ${C('removeIf')} or an explicit ${C('Iterator.remove()')}.</p>`, code: `
import java.util.*;

class FailFast {
    public static void main(String[] args) {
        List<String> a = new ArrayList<>(List.of("a", "b", "c"));
        try { for (String s : a) if (s.equals("a")) a.remove(s); }
        catch (ConcurrentModificationException e) { System.out.println("CME"); }
        List<String> b = new ArrayList<>(List.of("a", "b", "c"));
        for (String s : b) if (s.equals("b")) b.remove(s);
        System.out.println(b);
    }
}` },
      { title: '10. String methods return new Strings', html: `<p>Output: ${H.c('b', 'hello / nullx / ab / 2 4')}. ${C('toUpperCase()')} returns a new String — ignoring the result changes nothing. ${C('null + "x"')} is "nullx". ${C('println(char[])')} prints the characters (special overload), but ${C('"x" + chars')} would print ${C('[C@hash')}. ${C('split')} drops trailing empty strings unless you pass a negative limit.</p>`, code: `
class Strings {
    public static void main(String[] args) {
        String s = "hello";
        s.toUpperCase();
        System.out.println(s);
        String n = null;
        System.out.println(n + "x");
        char[] chars = {'a', 'b'};
        System.out.println(chars);
        System.out.println("a,b,,".split(",").length + " " + "a,b,,".split(",", -1).length);
    }
}` },
      { title: '11. String.valueOf(null) picks the char[] overload', html: `<p>Output: ${H.c('b', 'NPE / null')}. ${C('String.valueOf(null)')} — the most specific overload for a null literal is ${C('valueOf(char[])')} (char[] is more specific than Object), which dereferences the array → NPE. Casting to ${C('Object')} selects ${C('valueOf(Object)')}, which prints "null".</p>`, code: `
class ValueOfNull {
    public static void main(String[] args) {
        try { System.out.println(String.valueOf((char[]) null)); }
        catch (NullPointerException e) { System.out.println("NPE"); }
        System.out.println(String.valueOf((Object) null));
    }
}` },
      { title: '12. Evaluation order with arrays and compound assignment', html: `<p>Output: ${H.c('b', '[2, 2, 3] / [12, 2, 3] 1 / 32')}. In ${C('arr[j] = j = 2')} the array index is evaluated <b>first</b> (j is 0), then the right side. In ${C('arr[k++] = arr[k] + 10')} the left index uses k = 0 and increments k before the right side reads ${C('arr[1]')}. ${C('y += y++ + ++y')} is ${C('y = 10 + (10 + 12)')}.</p>`, code: `
import java.util.*;

class EvalOrder {
    public static void main(String[] args) {
        int[] arr = {1, 2, 3};
        int j = 0;
        arr[j] = j = 2;
        System.out.println(Arrays.toString(arr));
        int[] arr2 = {1, 2, 3};
        int k = 0;
        arr2[k++] = arr2[k] + 10;
        System.out.println(Arrays.toString(arr2) + " " + k);
        int y = 10;
        y += y++ + ++y;
        System.out.println(y);
    }
}` },
      { title: '13. Static forward reference via a method', html: `<p>Output: ${H.c('b', '0 5')}. Static initializers run in <b>textual order</b>. When ${C('x = getY()')} runs, ${C('y')} has not been assigned yet, so it is still the default 0. (A direct ${C('static int x = y;')} would be a compile error "illegal forward reference" — calling a method sneaks past that check.)</p>`, code: `
class Fwd {
    static int x = getY();
    static int y = 5;
    static int getY() { return y; }
    public static void main(String[] args) {
        System.out.println(Fwd.x + " " + Fwd.y);
    }
}` },
      { title: '14. Wrapper equals across types', html: `<p>Output: ${H.c('b', 'false true / false true true')}. ${C('Integer.equals(Long)')} is false — different classes, even with the same value. ${C('Long.equals(1)')} boxes 1 to Integer → false; ${C('L == 1')} unboxes and compares numerically → true. Common bug: ${C('map.get(1)')} on a ${C('Map<Long, V>')} returns null.</p>`, code: `
class WrapperEquals {
    public static void main(String[] args) {
        Integer i = 10; Long l = 10L;
        System.out.println(i.equals(l) + " " + (i.longValue() == l));
        Long L = 1L;
        System.out.println(L.equals(1) + " " + L.equals(1L) + " " + (L == 1));
    }
}` },
      { title: '15. Lazy streams: who prints what, and when', html: `<p>Output: ${H.c('b', 'ma fa ea mb fb eb / 3 / 1233')}. Streams process elements <b>one at a time</b> through the whole pipeline (vertical), not stage by stage. Since Java 9, ${C('count()')} may skip the pipeline when the size is known — the ${C('peek')} never runs! Adding a ${C('filter')} makes the size unknown, so peek runs.</p>`, code: `
import java.util.stream.*;

class LazyStreams {
    public static void main(String[] args) {
        Stream.of("a", "b")
              .map(s -> { System.out.print("m" + s + " "); return s; })
              .filter(s -> { System.out.print("f" + s + " "); return true; })
              .forEach(s -> System.out.print("e" + s + " "));
        System.out.println();
        System.out.println(Stream.of(1, 2, 3).peek(System.out::print).count());
        System.out.println(Stream.of(1, 2, 3).filter(x -> true).peek(System.out::print).count());
    }
}` },
      { title: '16. Modern Java traps (records, switch, immutable lists)', html: `<p>Output: ${H.c('b', 'false / NPE switch / UOE / NPE contains / [3, 2, 1]')}. A record with an array component compares the array by <b>reference</b>. A switch on null throws without ${C('case null')}. ${C('Stream.toList()')} is unmodifiable. ${C('List.of(...).contains(null)')} throws NPE (immutable collections reject null even in queries). ${C('reversed()')} is Java 21.</p>`, code: `
import java.util.*;
import java.util.stream.*;

record Arr(int[] a) { }

class ModernTraps {
    public static void main(String[] args) {
        System.out.println(new Arr(new int[]{1}).equals(new Arr(new int[]{1})));
        Object o = null;
        try { switch (o) { case String s -> System.out.println(s); default -> System.out.println("d"); } }
        catch (NullPointerException e) { System.out.println("NPE switch"); }
        try { Stream.of(1, 2).toList().add(3); } catch (UnsupportedOperationException e) { System.out.println("UOE"); }
        try { List.of(1, 2).contains(null); } catch (NullPointerException e) { System.out.println("NPE contains"); }
        System.out.println(List.of(1, 2, 3).reversed());
    }
}` },
      { title: '17. Labeled break and continue', html: `<p>Output: ${H.c('b', '00 10')}. ${C('continue outer')} skips to the next <b>outer</b> iteration as soon as b reaches 1, so only b = 0 prints for each a. When a = 2, ${C('break outer')} leaves both loops before printing.</p>`, code: `
class Labels {
    public static void main(String[] args) {
        outer:
        for (int a = 0; a < 3; a++) {
            for (int b = 0; b < 3; b++) {
                if (b == 1) continue outer;
                if (a == 2) break outer;
                System.out.print(a + "" + b + " ");
            }
        }
        System.out.println();
    }
}` },
      { title: '18. Unicode and case mapping', html: `<p>Output: ${H.c('b', 'STRASSE 6 7 / 4 2')}. Upper-casing can <b>change length</b> (ß → SS), so never assume ${C('s.toUpperCase().length() == s.length()')}. ${C('trim()')} only removes chars ≤ U+0020; ${C('strip()')} removes all Unicode whitespace (here the em space U+2003).</p>`, code: `
class Unicode {
    public static void main(String[] args) {
        System.out.println("straße".toUpperCase() + " " + "straße".length() + " " + "straße".toUpperCase().length());
        String em = "\\u2003hi\\u2003";
        System.out.println(em.trim().length() + " " + em.strip().length());
    }
}` }
    ],
    deepDive: `<p><b>Where the rules live.</b> Nearly every output trick is a sentence in the Java Language Specification: §5.6 numeric promotion (why ${C("'a' + 'b'")} is an int), §15.7 evaluation order (operands left to right, "fully evaluate the left operand of an assignment first"), §15.12.2 overload resolution in three phases, §15.25 conditional expression typing (the table that makes ${C('true ? 1 : 2.0')} a double and unboxes ${C('Integer')}/${C('int')} mixes), §12.4 class initialization (superclass first, textual order, exactly once), §14.20.2 try/finally (a ${C('return')} in finally discards the pending return or exception), and §15.28 constant expressions (which strings are interned at compile time).</p>
<p><b>Caches are an implementation contract.</b> ${C('Integer.valueOf')} must cache −128..127 (JLS §5.1.7 boxing), the high bound is configurable (${C('-XX:AutoBoxCacheMax')} / ${C('java.lang.Integer.IntegerCache.high')}). ${C('Short')}, ${C('Byte')}, ${C('Character')} (0..127), ${C('Long')} also cache; ${C('Float')}/${C('Double')} never do. Value classes (Valhalla) will eventually make ${C('==')} on such values compare state — another reason never to rely on identity of wrappers.</p>
<p><b>Why ${C('i = i++')} is 0 in bytecode:</b> ${C('iload_1')} (push 0), ${C('iinc 1, 1')} (local becomes 1), ${C('istore_1')} (store the pushed 0). Reading ${C('javap -c')} output is the ultimate tiebreaker for any evaluation-order argument in an interview.</p>
<p><b>Initialization corner cases:</b> referencing a ${C('static final')} compile-time constant does <b>not</b> trigger class initialization (it is inlined); ${C('Foo.class')} and array creation ${C('new Foo[3]')} do not either; ${C('Class.forName("Foo")')} does. An exception in a static initializer becomes ${C('ExceptionInInitializerError')} the first time and ${C('NoClassDefFoundError')} on every later attempt — a real production mystery.</p>
<p><b>Strings in modern JDKs:</b> concatenation with ${C('+')} compiles to ${C('invokedynamic')} (StringConcatFactory, JDK 9+); compact strings store Latin-1 text in 1 byte per char (JDK 9+); the string pool lives on the heap (since JDK 7) and is a fixed-size hashtable (${C('-XX:StringTableSize')}). None of these change outputs, but they come up as follow-ups.</p>`,
    aiEra: `<p><b>What AI changes:</b> an LLM will answer most textbook output questions instantly — so interviewers increasingly ask you to <b>explain</b> the rule, modify the snippet live ("what if c were 127?", "what if the field were final?"), or present novel combinations. Memorizing outputs is worth less; owning the rules is worth more.</p>
<p><b>Use AI as a partner:</b> <code>Generate 10 new Java 21 output-prediction puzzles mixing evaluation order and boxing. Do not show answers.</code> Solve them, then run them (jshell!) — never trust the AI's own answers to these; models confidently get ternary typing, overload phases and stream laziness wrong.</p>
<p><b>Where AI goes wrong:</b> claims ${C('Integer 128 == 128')} is "sometimes true depending on JVM" without explaining the cache flag, says ${C('0.1f + 0.2f == 0.3f')} is false by analogy with doubles (it is true), forgets the Java 9 ${C('count()')} short-circuit, and invents outputs for code that does not even compile (dominance errors, forward references).</p>
<p><b>What you must still own:</b> the step-by-step method (types → compile-time → runtime order → state table), the ability to verify with ${C('jshell')}/${C('javap')}, and turning each trap into a code-review rule your team follows (no ${C('==')} on wrappers, no overridable calls in constructors, no return in finally).</p>`,
    problems: [{
      title: 'Predict the Output: Static, Instance and Constructor Order',
      level: 'Hard', tags: ['initialization order', 'inheritance', 'polymorphism', 'output prediction'], companies: ['Goldman Sachs', 'Morgan Stanley', 'Oracle', 'TCS'],
      statement: `<p>Predict the exact output of ${C('new B(); new B();')} for the classes below, then fix the design so ${C('show()')} never observes a half-built object.</p>${P(`
class A {
    static { print("A-static "); }
    { print("A-init "); }
    A() { print("A() "); show(); }
    void show() { print("A.show "); }
}
class B extends A {
    static { print("B-static "); }
    int x = 7;
    { print("B-init(x=" + x + ") "); }
    B() { super(); print("B() "); }
    @Override void show() { print("B.show(x=" + x + ") "); }
}`)}`,
      constraints: `Assume ${C('print')} is ${C('System.out.print')} and each ${C('new B()')} is followed by a newline. Single class loader.`,
      example: `<p>Line 1: ${H.c('g', 'A-static B-static A-init A() B.show(x=0) B-init(x=7) B()')}<br>Line 2: ${H.c('g', 'A-init A() B.show(x=0) B-init(x=7) B()')}<br>Why: statics once (parent first); then for each object: A's initializers + A() body (which dispatches to B.show while x is still 0), then B's initializers in textual order, then B() body.</p>`,
      brute: { why: `<p>The tempting wrong answer reads top to bottom: "A-static A-init A() A.show B-static…". It ignores three rules: <b>all</b> static init of the hierarchy happens before any instance work, ${C('show()')} dispatches to <b>B</b>'s override, and B's field initializer (x = 7) runs only <b>after</b> ${C('super()')} returns.</p>`, code: `
class GuessTopToBottom {
    public static void main(String[] args) {
        // The naive "read the source top to bottom" prediction — WRONG:
        System.out.println("A-static A-init A() A.show B-static B-init(x=7) B()");
    }
}` },
      mcq: { q: 'What value of x does B.show() print during the FIRST construction?', options: ['0', '7', 'It does not compile', 'It throws NullPointerException'], answer: 0, explain: 'The object memory starts zeroed. A() runs before B\'s field initializers, and show() is dispatched to B (runtime type), so it reads the default 0.' },
      hints: [`<p>Hint 1: split the work into <b>class initialization</b> (static, once, superclass first) and <b>object construction</b> (every ${C('new')}).</p>`, `<p>Hint 2: a constructor body runs as: ${C('super(...)')} → this class's field initializers and instance blocks (textual order) → rest of the body.</p>`, `<p>Hint 3: virtual dispatch works inside constructors — ${C('show()')} in A() calls B.show. B's ${C('x')} is still 0. Fix: make ${C('show')} ${C('private')}/${C('final')}, or call it after construction (factory method).</p>`],
      tests: { io: true, cases: [
          { stdin: '', stdout: 'A-static B-static A-init A() B.show(x=0) B-init(x=7) B()\nA-init A() B.show(x=0) B-init(x=7) B()\nSafeA() SafeB.show(x=7)' }
        ] },
      solution: {
        approach: `<p>Run the JLS algorithm: (1) initialize A then B (static blocks, once); (2) for each ${C('new B()')}: allocate with defaults → B() → super() → A's instance init → A() body → (dynamic) B.show sees x = 0 → back in B: x = 7, instance block → B() body. The fix is to never call overridable methods from a constructor: make the call a ${C('private')} helper or move it to a factory that calls ${C('show()')} after ${C('new')} completes.</p>`,
        code: `
class A {
    static { System.out.print("A-static "); }
    { System.out.print("A-init "); }
    A() { System.out.print("A() "); show(); }
    void show() { System.out.print("A.show "); }
}
class B extends A {
    static { System.out.print("B-static "); }
    int x = 7;
    { System.out.print("B-init(x=" + x + ") "); }
    B() { super(); System.out.print("B() "); }
    @Override void show() { System.out.print("B.show(x=" + x + ") "); }
}

// The fix: construction never calls overridable code; a factory calls it afterwards.
class SafeA {
    SafeA() { System.out.print("SafeA() "); }
    void show() { System.out.print("SafeA.show "); }
    static <T extends SafeA> T create(java.util.function.Supplier<T> ctor) {
        T obj = ctor.get();          // fully constructed first
        obj.show();                  // then call the overridable method
        return obj;
    }
}
class SafeB extends SafeA {
    int x = 7;
    @Override void show() { System.out.print("SafeB.show(x=" + x + ") "); }
}

class InitOrder {
    public static void main(String[] args) {
        new B(); System.out.println();   // A-static B-static A-init A() B.show(x=0) B-init(x=7) B()
        new B(); System.out.println();   // A-init A() B.show(x=0) B-init(x=7) B()
        SafeA.create(SafeB::new);        // SafeA() SafeB.show(x=7)
        System.out.println();
    }
}`,
        dry: { head: ['step', 'what runs', 'x', 'printed so far'], rows: [['1', 'A static block', '—', 'A-static'], ['2', 'B static block', '—', '… B-static'], ['3', 'alloc B, B() → super() → A instance block', '0', '… A-init'], ['4', 'A() body → show() dispatches to B', '0', '… A() B.show(x=0)'], ['5', 'B field init x = 7, B instance block', '7', '… B-init(x=7)'], ['6', 'B() body', '7', '… B()'], ['7', 'second new B(): steps 3–6 only', '0 → 7', 'A-init A() B.show(x=0) B-init(x=7) B()']] },
        complexity: `<p>O(1) — the point is semantics, not cost. Class initialization happens once per class loader; it is also thread-safe (the JVM holds an init lock), which is why the "holder class" singleton idiom works.</p>`,
        followUps: ['What prints if x is <code>final int x = 7;</code>? (B.show(x=7): a final field with a constant initializer is a constant variable, inlined at compile time — but <code>final Integer x = 7</code> would still print null)', 'What if <code>show()</code> in A is <code>private</code>?', 'When does <code>ExceptionInInitializerError</code> turn into <code>NoClassDefFoundError</code>?']
      }
    }]
  });
  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Predict the Output: Concatenation, char Math & Compound Assignment',
    level: 'Easy', tags: ['output prediction', 'type promotion', 'strings'], companies: ['TCS', 'Infosys', 'Accenture', 'Amazon'],
    statement: `<p>Without running it, write down the 7 lines this program prints. Then explain each in one sentence.</p>${P(`
char c = 'A';
System.out.println(c + 1);
System.out.println((char) (c + 1));
System.out.println("" + c + 1);
c += 1;
System.out.println(c);
System.out.println('1' + 2);
System.out.println(10 + 20 + "30" + 40 + 50);
short s = 1;
s += 1;
System.out.println(s);`)}`,
    constraints: `Java 21. 'A' = 65, '1' = 49.`,
    example: `<p>Answer: ${H.c('g', '66 · B · A1 · B · 51 · 30304050 · 2')}. Why line 6: 10 + 20 = 30 first (ints), then every + after the String "30" concatenates.</p>`,
    brute: { why: `<p>Reading it "like maths" gives ${H.c('r', 'B, B, B, B, 3, 150, 2')} — it assumes chars stay chars and that + is always addition. Both are wrong: arithmetic on char/short/byte promotes to <b>int</b>, and + becomes concatenation as soon as one operand is a String (evaluated left to right).</p>`, code: `
class ConcatPuzzle {
    public static void main(String[] args) {
        char c = 'A';
        System.out.println(c + 1);
        System.out.println((char) (c + 1));
        System.out.println("" + c + 1);
        c += 1;
        System.out.println(c);
        System.out.println('1' + 2);
        System.out.println(10 + 20 + "30" + 40 + 50);
        short s = 1;
        s += 1;
        System.out.println(s);
    }
}` },
    mcq: { q: 'Why does <code>s += 1</code> compile for a short while <code>s = s + 1</code> does not?', options: ['Compound assignment includes an implicit cast back to the variable type', 'short + int is a short', 'The compiler optimizes += to ++', 'It is a bug in javac'], answer: 0, explain: 'JLS 15.26.2: E1 op= E2 means E1 = (T)((E1) op (E2)). s + 1 alone is an int, which cannot be assigned to short without a cast.' },
    hints: [`<p>Hint 1: write the <b>type</b> of every sub-expression. ${C("c + 1")} is int; ${C('"" + c')} is String.</p>`, `<p>Hint 2: ${C('+')} is left-associative. Group from the left: ${C('((10 + 20) + "30") + 40')}…</p>`, `<p>Hint 3: compound assignments (${C('+=')}) cast back to the left type; ${C('println(char)')} prints a character, ${C('println(int)')} a number.</p>`],
    tests: { io: true, cases: [
        { stdin: '', stdout: '66\nB\nA1\nB\n51\n30304050\n2' }
      ] },
    solution: {
      approach: `<p>Apply two rules: <b>binary numeric promotion</b> (char/short/byte operands become int) and <b>left-to-right string conversion</b> (+ with a String operand concatenates). Compound assignment hides a narrowing cast.</p>`,
      code: `
class ConcatAnswer {
    public static void main(String[] args) {
        char c = 'A';
        System.out.println(c + 1);                     // 66      char promoted to int
        System.out.println((char) (c + 1));            // B       cast back to char
        System.out.println("" + c + 1);                // A1      String first → concatenation
        c += 1;                                        //         compound: c = (char) (c + 1)
        System.out.println(c);                         // B
        System.out.println('1' + 2);                   // 51      '1' is 49
        System.out.println(10 + 20 + "30" + 40 + 50);  // 30304050
        short s = 1;
        s += 1;                                        //         s = (short) (s + 1)
        System.out.println(s);                         // 2
    }
}`,
      dry: { head: ['line', 'static type', 'value'], rows: [['c + 1', 'int', '66'], ['(char)(c + 1)', 'char', 'B'], ['"" + c + 1', 'String', 'A1'], ["'1' + 2", 'int', '51'], ['10 + 20 + "30" + 40 + 50', 'String', '"30" → "3030" → "303040" → "30304050"']] },
      complexity: `<p>O(1). The skill tested is the type system, not algorithms.</p>`,
      followUps: ['What does <code>System.out.println(\'a\' + \'b\' + "c")</code> print? (195c)', 'What does <code>char d = \'A\' + 1;</code> do — compile error or B? (B: constant expression fits in char)']
    }
  });

  practice.push({
    title: 'Refactor a Mutable POJO into a Validated Record',
    level: 'Easy', tags: ['records', 'immutability', 'compact constructor'], companies: ['Microsoft', 'Walmart', 'PayPal'],
    statement: `<p>Replace the mutable ${C('PointBean')} (getters, setters, no equals) with ${C('record Point(double x, double y)')} that: rejects NaN/infinite coordinates, offers ${C('Point.ORIGIN')}, ${C('distanceTo(Point)')}, a wither ${C('withX(double)')}, and works correctly as a ${C('HashSet')} element.</p>`,
    constraints: `Coordinates are finite doubles; at most 10<sup>6</sup> points in a set.`,
    example: `<p>${C('new Point(3, 4).distanceTo(Point.ORIGIN)')} → ${H.c('g', '5.0')}; ${C('Set.of(new Point(1,2))')} contains ${C('new Point(1,2)')} → ${H.c('g', 'true')}; ${C('new Point(Double.NaN, 0)')} → ${H.c('r', 'IllegalArgumentException')}.</p>`,
    brute: { why: `<p>The bean has setters (anyone can move a point that is already a key in a HashSet — its hash bucket becomes wrong), no ${C('equals')}/${C('hashCode')} (two equal points are different set elements), and no validation.</p>`, code: `
import java.util.*;

class PointBean {
    private double x, y;
    PointBean(double x, double y) { this.x = x; this.y = y; }
    double getX() { return x; }
    void setX(double x) { this.x = x; }
    public static void main(String[] args) {
        Set<PointBean> set = new HashSet<>();
        set.add(new PointBean(1, 2));
        System.out.println(set.contains(new PointBean(1, 2)));   // false: no equals/hashCode
    }
}` },
    mcq: { q: 'Where does the NaN check go so that Point.ORIGIN, withX and new Point all respect it?', options: ['The compact canonical constructor', 'The accessor x()', 'A separate validate() method callers must remember', 'toString()'], answer: 0, explain: 'All creation paths — new, withX (which calls new), static constants — go through the canonical constructor.' },
    hints: [`<p>Hint 1: ${C('Double.isFinite(x)')} is false for NaN and ±Infinity.</p>`, `<p>Hint 2: a static field is allowed in a record: ${C('static final Point ORIGIN = new Point(0, 0);')}.</p>`, `<p>Hint 3: ${C('Math.hypot(dx, dy)')} computes the distance without overflow. The wither returns ${C('new Point(newX, y)')}.</p>`],
    tests: { sig: 'string string -> string[]', fn: 'chk', harness: { java: `
class Check {
  static String[] chk(String xs, String ys) {
    double x = Double.parseDouble(xs), y = Double.parseDouble(ys);
    try {
      Point p = new Point(x, y);
      Set<Point> set = new HashSet<>(Set.of(p));
      return new String[]{ p.toString(), String.valueOf(p.distanceTo(Point.ORIGIN)), String.valueOf(set.contains(new Point(x, y))), p.withX(9).toString() };
    } catch (IllegalArgumentException e) { return new String[]{ "IAE" }; }
  }
}` }, cases: [
        [['3', '4'], ['Point[x=3.0, y=4.0]', '5.0', 'true', 'Point[x=9.0, y=4.0]']],
        [['1', '2'], ['Point[x=1.0, y=2.0]', '2.23606797749979', 'true', 'Point[x=9.0, y=2.0]']],
        [['NaN', '0'], ['IAE']],
        [['0', 'Infinity'], ['IAE']],
        [['-Infinity', '1'], ['IAE']],
        [['0', '0'], ['Point[x=0.0, y=0.0]', '0.0', 'true', 'Point[x=9.0, y=0.0]']],
        [['-0.0', '0'], ['Point[x=-0.0, y=0.0]', '0.0', 'true', 'Point[x=9.0, y=0.0]']],
        [['1e308', '1e308'], ['Point[x=1.0E308, y=1.0E308]', '1.4142135623730951E308', 'true', 'Point[x=9.0, y=1.0E308]']],
        [['-3', '-4'], ['Point[x=-3.0, y=-4.0]', '5.0', 'true', 'Point[x=9.0, y=-4.0]']]
      ] },
    solution: {
      approach: `<p>The record gives value semantics (equals/hashCode/toString) and immutability for free; the compact constructor enforces the finite-coordinate invariant on every creation path.</p>`,
      code: `
import java.util.*;

record Point(double x, double y) {
    static final Point ORIGIN = new Point(0, 0);

    Point {
        if (!Double.isFinite(x) || !Double.isFinite(y))
            throw new IllegalArgumentException("coordinates must be finite: " + x + ", " + y);
    }

    double distanceTo(Point o) { return Math.hypot(x - o.x, y - o.y); }

    Point withX(double newX) { return new Point(newX, y); }

    public static void main(String[] args) {
        System.out.println(new Point(3, 4).distanceTo(ORIGIN));        // 5.0
        Set<Point> set = new HashSet<>(Set.of(new Point(1, 2)));
        System.out.println(set.contains(new Point(1, 2)));            // true
        System.out.println(new Point(1, 2).withX(9));                 // Point[x=9.0, y=2.0]
        try { new Point(Double.NaN, 0); }
        catch (IllegalArgumentException e) { System.out.println(e.getMessage()); } // coordinates must be finite: NaN, 0.0
    }
}`,
      dry: { head: ['call', 'check', 'result'], rows: [['new Point(3, 4)', 'finite ✓', 'Point[x=3.0, y=4.0]'], ['distanceTo(ORIGIN)', 'hypot(3, 4)', '5.0'], ['set.contains(new Point(1, 2))', 'equals by components', 'true'], ['new Point(NaN, 0)', 'isFinite(NaN) = false', H.c('r', 'IllegalArgumentException')]] },
      complexity: `<p>O(1) per operation; HashSet lookups are O(1) average thanks to the generated hashCode.</p>`,
      followUps: ['Should <code>Point(0.0, 0.0)</code> equal <code>Point(-0.0, 0.0)</code>? (Record equals says no — Double.compare semantics.)', 'Add <code>Comparable&lt;Point&gt;</code> ordering by distance from the origin.']
    }
  });

  practice.push({
    title: 'Predict the Output: Wrapper Caches, equals and Map Keys',
    level: 'Easy', tags: ['output prediction', 'autoboxing', 'Integer cache'], companies: ['Infosys', 'Capgemini', 'Goldman Sachs'],
    statement: `<p>What does each line print?</p>${P(`
Integer a = 100, b = 100;
Integer c = 1000, d = 1000;
System.out.println(a == b);
System.out.println(c == d);
System.out.println(c.equals(d));
Integer e = 1000; int f = 1000;
System.out.println(e == f);
Long l = 100L;
System.out.println(l.equals(100));
System.out.println(l == 100);
Map<Long, String> m = Map.of(1L, "one");
System.out.println(m.get(1) + " " + m.get(1L));`)}`,
    constraints: `Default JVM settings (Integer cache −128..127).`,
    example: `<p>Answer: ${H.c('g', 'true · false · true · true · false · true · null one')}. The surprising ones: ${C('e == f')} is true because one side is a primitive (the Integer is unboxed); ${C('l.equals(100)')} is false because 100 boxes to an <b>Integer</b>, not a Long.</p>`,
    brute: { why: `<p>Assuming "== compares values" gives all trues; assuming "== on objects is always false" gets ${C('a == b')} and ${C('e == f')} wrong. You need the exact rules: cache range, unboxing when a primitive is involved, and equals requiring the same wrapper class.</p>`, code: `
import java.util.*;

class WrapperPuzzle {
    public static void main(String[] args) {
        Integer a = 100, b = 100;
        Integer c = 1000, d = 1000;
        System.out.println(a == b);
        System.out.println(c == d);
        System.out.println(c.equals(d));
        Integer e = 1000; int f = 1000;
        System.out.println(e == f);
        Long l = 100L;
        System.out.println(l.equals(100));
        System.out.println(l == 100);
        Map<Long, String> m = Map.of(1L, "one");
        System.out.println(m.get(1) + " " + m.get(1L));
    }
}` },
    mcq: { q: '<code>map.get(1)</code> on a <code>Map&lt;Long, String&gt;</code> returns null because…', options: ['1 is boxed to Integer, and Integer.equals(Long) is false', 'Map.of maps are empty', 'get() needs a cast', 'Long keys are compared by identity'], answer: 0, explain: 'get takes Object, so the int literal is boxed to Integer. Integer(1).equals(Long(1)) is false, so no key matches. Write map.get(1L).' },
    hints: [`<p>Hint 1: ${C('Integer x = 100')} is ${C('Integer.valueOf(100)')} — cached for −128..127.</p>`, `<p>Hint 2: if one operand of ${C('==')} is a primitive, the other is <b>unboxed</b> and values are compared.</p>`, `<p>Hint 3: wrapper ${C('equals')} first checks the <b>class</b>: ${C('Long.equals(Integer)')} is always false.</p>`],
    tests: { io: true, cases: [
        { stdin: '', stdout: 'true\nfalse\ntrue\ntrue\nfalse\ntrue\nnull one' }
      ] },
    solution: {
      approach: `<p>Classify each comparison: reference vs reference (identity — depends on cache), reference vs primitive (unboxing — value), equals (same class + same value).</p>`,
      code: `
import java.util.*;

class WrapperAnswer {
    public static void main(String[] args) {
        Integer a = 100, b = 100;
        Integer c = 1000, d = 1000;
        System.out.println(a == b);          // true   same cached object
        System.out.println(c == d);          // false  two objects
        System.out.println(c.equals(d));     // true   values equal
        Integer e = 1000; int f = 1000;
        System.out.println(e == f);          // true   e unboxed, int comparison
        Long l = 100L;
        System.out.println(l.equals(100));   // false  100 → Integer, different class
        System.out.println(l == 100);        // true   l unboxed, numeric comparison
        Map<Long, String> m = Map.of(1L, "one");
        System.out.println(m.get(1) + " " + m.get(1L));   // null one
    }
}`,
      dry: { head: ['expression', 'kind', 'result'], rows: [['a == b (100)', 'ref == ref, cached', 'true'], ['c == d (1000)', 'ref == ref, not cached', 'false'], ['e == f', 'ref == prim → unbox', 'true'], ['l.equals(100)', 'Long vs Integer', 'false'], ['m.get(1)', 'Integer key lookup', 'null']] },
      complexity: `<p>O(1) per comparison; the cost to watch is boxing in hot loops (allocations outside the cache range).</p>`,
      followUps: ['Which wrapper types cache values, and which never do? (Byte, Short, Integer, Long, Character 0..127, Boolean; Float/Double never)', 'How would a static-analysis rule catch <code>==</code> on wrappers? (Error Prone ReferenceEquality, Sonar S4973)']
    }
  });

  practice.push({
    title: 'Render a Receipt with a Text Block and formatted()',
    level: 'Easy', tags: ['text blocks', 'String.format', 'records'], companies: ['Swiggy', 'Shopify', 'Square'],
    statement: `<p>Given ${C('record Item(String name, int qty, long unitCents)')}, write ${C('String receipt(int orderNo, List<Item> items)')} that returns exactly:</p>${P(`
RECEIPT #42
------------------------
Coffee      x2      7.00
Muffin      x1      3.25
------------------------
TOTAL              10.25`)}<p>Use a text block for the frame and ${C('formatted()')} for the values. Money is in cents (long).</p>`,
    constraints: `Item names ≤ 10 chars; up to 100 items; output lines must have no trailing spaces and end with a newline.`,
    example: `<p>Items Coffee×2 @ 350, Muffin×1 @ 325 → line totals 700 and 325, total 1025 → ${H.c('g', '10.25')}. Why the layout works: ${C('%-10s')} pads the name to 10 chars, ${C('%8s')} right-aligns the money.</p>`,
    brute: { why: `<p>Building the string with ${C('"RECEIPT #" + n + "\\n" + "----" + ...')}: hard to read, easy to miss a ${C('\\n')}, and money computed with ${C('double')} (${C('3.5 * 2')}) eventually prints values like 10.249999.</p>`, code: `
import java.util.*;

class ReceiptBad {
    public static void main(String[] args) {
        double total = 0;
        String s = "RECEIPT #" + 42 + "\\n" + "-----" + "\\n";
        s += "Coffee x2 " + (3.5 * 2) + "\\n";       // 7.0 (one decimal)
        total += 3.5 * 2 + 3.25;
        s += "TOTAL " + total;                        // no trailing newline, no alignment
        System.out.println(s);
    }
}` },
    mcq: { q: 'Your text block ends with the closing """ on its own line. What does that mean for the result?', options: ['The string ends with a newline', 'The string has no newline at the end', 'It is a compile error', 'A trailing space is added'], answer: 0, explain: 'The last content line is followed by a line terminator before the closing delimiter line, so the value ends with \\n.' },
    hints: [`<p>Hint 1: format one money value with a helper: ${C('String.format("%d.%02d", c / 100, c % 100)')}.</p>`, `<p>Hint 2: build the item lines with a stream and ${C('Collectors.joining("\\n")')}; plug them into a text block template with ${C('%s')} placeholders.</p>`, `<p>Hint 3: the template's own lines must not have trailing spaces; use ${C('"%-10s  x%d  %8s"')} for each item and ${C('"%-16s%8s"')} for TOTAL.</p>`],
    tests: { sig: 'int string[] -> string', fn: 'chk', harness: { java: `
class Check {
  static String chk(int orderNo, String[] rows) {
    List<Item> items = new ArrayList<>();
    for (String r : rows) { String[] p = r.split(","); items.add(new Item(p[0], Integer.parseInt(p[1]), Long.parseLong(p[2]))); }
    try { return Receipt.receipt(orderNo, items); } catch (ArithmeticException e) { return "ArithmeticException"; }
  }
}` }, cases: [
        [[42, ['Coffee,2,350', 'Muffin,1,325']], 'RECEIPT #42\n------------------------\nCoffee      x2      7.00\nMuffin      x1      3.25\n------------------------\nTOTAL              10.25\n'],
        [[1, ['Gum,1,5']], 'RECEIPT #1\n------------------------\nGum         x1      0.05\n------------------------\nTOTAL               0.05\n'],
        [[7, ['ABCDEFGHIJ,3,99999999999']], 'RECEIPT #7\n------------------------\nABCDEFGHIJ  x3  2999999999.97\n------------------------\nTOTAL           2999999999.97\n'],
        [[9, ['a,1,100', 'b,2,250', 'c,10,1']], 'RECEIPT #9\n------------------------\na           x1      1.00\nb           x2      5.00\nc           x10      0.10\n------------------------\nTOTAL               6.10\n'],
        [[3, ['Big,2,5000000000000000000']], 'ArithmeticException'],
        [[5, ['Zero,3,0']], 'RECEIPT #5\n------------------------\nZero        x3      0.00\n------------------------\nTOTAL               0.00\n'],
        [[100, { $rep: 'Pen,1,100', n: 100 }], 'RECEIPT #100\n------------------------\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\nPen         x1      1.00\n------------------------\nTOTAL             100.00\n']
      ] },
    solution: {
      approach: `<p>Separate <b>layout</b> (a text block template, readable as-is) from <b>data</b> (formatted item lines and totals). Keep money in long cents and format only at the edge.</p>`,
      code: String.raw`
import java.util.*;
import java.util.stream.*;

record Item(String name, int qty, long unitCents) {
    long totalCents() { return Math.multiplyExact(unitCents, qty); }
}

class Receipt {
    static String money(long cents) { return String.format("%d.%02d", cents / 100, cents % 100); }

    static String receipt(int orderNo, List<Item> items) {
        String lines = items.stream()
            .map(i -> "%-10s  x%d  %8s".formatted(i.name(), i.qty(), money(i.totalCents())))
            .collect(Collectors.joining("\n"));
        long total = items.stream().mapToLong(Item::totalCents).sum();
        return """
            RECEIPT #%d
            ------------------------
            %s
            ------------------------
            %-16s%8s
            """.formatted(orderNo, lines, "TOTAL", money(total));
    }

    public static void main(String[] args) {
        System.out.print(receipt(42, List.of(new Item("Coffee", 2, 350), new Item("Muffin", 1, 325))));
    }
}`,
      dry: { head: ['item', 'qty × unit', 'line total', 'formatted line'], rows: [['Coffee', '2 × 350', '700', 'Coffee      x2      7.00'], ['Muffin', '1 × 325', '325', 'Muffin      x1      3.25'], ['TOTAL', '—', '1025', 'TOTAL              10.25']] },
      complexity: `<p>O(n) for n items; the text block itself is a compile-time constant.</p>`,
      followUps: ['Support currencies with different fraction digits.', 'Why must you never use formatted() to build SQL with user input?']
    }
  });

  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'Predict the Output: finally, try-with-resources & Suppressed Exceptions',
    level: 'Medium', tags: ['output prediction', 'exceptions', 'try-with-resources'], companies: ['Oracle', 'SAP', 'Morgan Stanley'],
    statement: `<p>Predict every printed line, in order.</p>${P(`
record Res(String name) implements AutoCloseable {
    public void close() {
        System.out.println("close " + name);
        throw new IllegalStateException("close " + name);
    }
}
static String t() {
    try { throw new RuntimeException("boom"); }
    finally { return "finally wins"; }
}
// main:
System.out.println(t());
try (var a = new Res("A"); var b = new Res("B")) {
    System.out.println("body");
    throw new RuntimeException("body");
} catch (Exception e) {
    System.out.println(e.getMessage() + " suppressed=" + e.getSuppressed().length + " " + e.getSuppressed()[0].getMessage());
} finally {
    System.out.println("finally");
}`)}`,
    constraints: `Java 21 semantics.`,
    example: `<p>Answer: ${H.c('g', 'finally wins · body · close B · close A · body suppressed=2 close B · finally')}. Why: resources close in <b>reverse</b> order, <b>before</b> catch runs; close exceptions are attached as suppressed to the body exception.</p>`,
    brute: { why: `<p>Common wrong guesses: "the RuntimeException('boom') propagates" (a return in finally <b>discards</b> it), "close A then close B" (reverse order of declaration), "catch runs before close" (resources are closed first), and "the close exception replaces the body exception" (that was the old try/finally behaviour that try-with-resources fixed).</p>`, code: `
record Res(String name) implements AutoCloseable {
    public void close() {
        System.out.println("close " + name);
        throw new IllegalStateException("close " + name);
    }
}

class TwrPuzzle {
    @SuppressWarnings("finally")
    static String t() {
        try { throw new RuntimeException("boom"); }
        finally { return "finally wins"; }
    }
    public static void main(String[] args) {
        System.out.println(t());
        try (var a = new Res("A"); var b = new Res("B")) {
            System.out.println("body");
            throw new RuntimeException("body");
        } catch (Exception e) {
            System.out.println(e.getMessage() + " suppressed=" + e.getSuppressed().length + " " + e.getSuppressed()[0].getMessage());
        } finally {
            System.out.println("finally");
        }
    }
}` },
    mcq: { q: 'In try-with-resources, the body throws X and close() throws Y. What does the catch block receive?', options: ['X, with Y in X.getSuppressed()', 'Y, with X lost', 'Y, with X as its cause', 'Both, as two separate catches'], answer: 0, explain: 'The primary exception is the one from the body; exceptions thrown while closing are added via addSuppressed so no information is lost.' },
    hints: [`<p>Hint 1: a ${C('return')} (or ${C('throw')}) in finally <b>replaces</b> whatever was in flight — exceptions included.</p>`, `<p>Hint 2: try-with-resources ≈ nested try/finally blocks, innermost resource (declared last) closed first.</p>`, `<p>Hint 3: order is body → close B → close A → catch → finally. Suppressed array order follows close order.</p>`],
    tests: { io: true, cases: [
        { stdin: '', stdout: 'finally wins\nbody\nclose B\nclose A\nbody suppressed=2 close B\nfinally' }
      ] },
    solution: {
      approach: `<p>Desugar the statement: resources are closed in reverse order inside an implicit finally, and their exceptions are added to the primary exception with ${C('addSuppressed')}. Only then does your ${C('catch')} see the primary exception, and your ${C('finally')} runs last.</p>`,
      code: `
record Res(String name) implements AutoCloseable {
    public void close() {
        System.out.println("close " + name);
        throw new IllegalStateException("close " + name);
    }
}

class TwrAnswer {
    @SuppressWarnings("finally")
    static String t() {
        try { throw new RuntimeException("boom"); }
        finally { return "finally wins"; }              // discards "boom" — never do this
    }
    public static void main(String[] args) {
        System.out.println(t());                            // finally wins
        try (var a = new Res("A"); var b = new Res("B")) {
            System.out.println("body");                     // body
            throw new RuntimeException("body");
        } catch (Exception e) {                             // after: close B, close A
            System.out.println(e.getMessage() + " suppressed=" + e.getSuppressed().length
                + " " + e.getSuppressed()[0].getMessage()); // body suppressed=2 close B
        } finally {
            System.out.println("finally");                  // finally
        }
    }
}`,
      dry: { head: ['step', 'printed', 'exception state'], rows: [['t()', 'finally wins', '"boom" discarded'], ['body', 'body', 'primary = RuntimeException("body")'], ['close b', 'close B', 'suppressed += close B'], ['close a', 'close A', 'suppressed += close A'], ['catch', 'body suppressed=2 close B', 'handled'], ['finally', 'finally', '—']] },
      complexity: `<p>O(1) work; the lesson is ordering: body, closes in reverse declaration order, catch, finally.</p>`,
      followUps: ['What if the resource initializer of b throws? (a is still closed; b never opened)', 'Why is <code>try (var x = ...)</code> with a null resource allowed? (close is skipped for null)']
    }
  });

  practice.push({
    title: 'Shipping Cost Calculator over a Sealed Parcel Hierarchy',
    level: 'Medium', tags: ['sealed', 'records', 'pattern matching', 'guards'], companies: ['Amazon', 'FedEx', 'Delhivery'],
    statement: `<p>Model ${C('sealed interface Parcel permits Letter, Box, Pallet')} with ${C('Letter(int grams)')}, ${C('Box(double kg, boolean fragile)')}, ${C('Pallet(int boxes)')}. Pricing (in cents): letter ≤ 20 g → 50; heavier letters → 50 + 25 per extra started 20 g; box → 500 + 200 per started kg, ×1.5 if fragile (rounded up); pallet → 1500 per box, but 10% off for ≥ 10 boxes; invalid values (≤ 0) → ${C('IllegalArgumentException')} from the record. Write ${C('long cost(Parcel p)')} with one exhaustive switch, no default.</p>`,
    constraints: `grams ≤ 2000, kg ≤ 50, boxes ≤ 1000. Long cents, no floating-point money except the fragile multiplier (use integer maths).`,
    example: `<p>${C('Letter(15)')} → ${H.c('g', '50')}; ${C('Letter(45)')} → 50 + 2×25 = ${H.c('g', '100')}; ${C('Box(2.5, false)')} → 500 + 3×200 = ${H.c('g', '1100')}; ${C('Box(2.5, true)')} → ceil(1100 × 1.5) = ${H.c('g', '1650')}; ${C('Pallet(10)')} → 15000 − 10% = ${H.c('g', '13500')}.</p>`,
    brute: { why: `<p>A ${C('String type')} field plus nullable ${C('grams')}/${C('kg')}/${C('boxes')} fields and an if-chain on the type string. Typos in "Leter" compile, unused fields are null or 0, and adding a new parcel kind does not force anyone to update the price logic.</p>`, code: `
class ParcelBad {
    String type; int grams; double kg; boolean fragile; int boxes;
    static long cost(ParcelBad p) {
        if (p.type.equals("letter")) return p.grams <= 20 ? 50 : 50 + 25L * ((p.grams - 1) / 20);
        if (p.type.equals("box")) return 500 + 200L * (long) Math.ceil(p.kg);
        return 0;   // pallet forgotten, typo-ed types silently cost 0
    }
    public static void main(String[] args) {
        ParcelBad p = new ParcelBad(); p.type = "pallet"; p.boxes = 3;
        System.out.println(cost(p));   // 0 — a silent bug
    }
}` },
    mcq: { q: 'Which pair of cases must come in this order?', options: ['<code>case Letter l when l.grams() &lt;= 20</code> before <code>case Letter l</code>', '<code>case Box b</code> before <code>case Letter l</code>', '<code>case Pallet p</code> must be last', 'Order never matters with sealed types'], answer: 0, explain: 'An unguarded Letter case would dominate the guarded one (compile error). Different record types can be in any order relative to each other.' },
    hints: [`<p>Hint 1: "per started 20 g above 20 g" = ${C('(grams - 20 + 19) / 20')} extra units; "per started kg" = ${C('(long) Math.ceil(kg)')}.</p>`, `<p>Hint 2: fragile ×1.5 rounded up in integers: ${C('(base * 3 + 1) / 2')}. Use record patterns with guards: ${C('case Box(double kg, boolean fragile) when fragile')}.</p>`, `<p>Hint 3: put validation in each record's compact constructor; the switch then only prices valid parcels.</p>`],
    tests: { sig: 'string double bool -> string', fn: 'chk', harness: { java: `
class Check {
  static String chk(String type, double v, boolean fragile) {
    try {
      Parcel p = type.equals("letter") ? new Letter((int) v) : type.equals("box") ? new Box(v, fragile) : new Pallet((int) v);
      return String.valueOf(Shipping.cost(p));
    } catch (IllegalArgumentException e) { return "IAE"; }
  }
}` }, cases: [
        [['letter', 15, false], '50'],
        [['letter', 20, false], '50'],
        [['letter', 21, false], '75'],
        [['letter', 45, false], '100'],
        [['letter', 2000, false], '2525'],
        [['letter', 0, false], 'IAE'],
        [['letter', -5, false], 'IAE'],
        [['box', 2.5, false], '1100'],
        [['box', 2.5, true], '1650'],
        [['box', 1, false], '700'],
        [['box', 1.0001, false], '900'],
        [['box', 0.5, true], '1050'],
        [['box', 50, true], '15750'],
        [['box', 0, false], 'IAE'],
        [['box', -1, true], 'IAE'],
        [['pallet', 1, false], '1500'],
        [['pallet', 9, false], '13500'],
        [['pallet', 10, false], '13500'],
        [['pallet', 11, false], '14850'],
        [['pallet', 1000, false], '1350000'],
        [['pallet', 0, false], 'IAE']
      ] },
    solution: {
      approach: `<p>Sealed interface + records make the parcel kinds a closed set; each record validates itself. A single exhaustive switch with guards prices them, and the compiler will flag the switch if someone adds ${C('Envelope')} later.</p>`,
      code: `
sealed interface Parcel permits Letter, Box, Pallet { }
record Letter(int grams) implements Parcel {
    Letter { if (grams <= 0) throw new IllegalArgumentException("grams must be > 0"); }
}
record Box(double kg, boolean fragile) implements Parcel {
    Box { if (!(kg > 0)) throw new IllegalArgumentException("kg must be > 0"); }
}
record Pallet(int boxes) implements Parcel {
    Pallet { if (boxes <= 0) throw new IllegalArgumentException("boxes must be > 0"); }
}

class Shipping {
    static long boxBase(double kg) { return 500 + 200L * (long) Math.ceil(kg); }

    static long cost(Parcel p) {
        return switch (p) {
            case Letter l when l.grams() <= 20         -> 50;
            case Letter l                              -> 50 + 25L * ((l.grams() - 20 + 19) / 20);
            case Box(double kg, boolean fragile) when fragile -> (boxBase(kg) * 3 + 1) / 2;   // ×1.5, round up
            case Box(double kg, boolean fragile)       -> boxBase(kg);
            case Pallet(int n) when n >= 10            -> 1500L * n * 9 / 10;
            case Pallet(int n)                         -> 1500L * n;
        };
    }

    public static void main(String[] args) {
        System.out.println(cost(new Letter(15)));         // 50
        System.out.println(cost(new Letter(45)));         // 100
        System.out.println(cost(new Box(2.5, false)));    // 1100
        System.out.println(cost(new Box(2.5, true)));     // 1650
        System.out.println(cost(new Pallet(10)));         // 13500
        try { new Pallet(0); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }
    }
}`,
      dry: { head: ['parcel', 'matching case', 'calculation', 'cents'], rows: [['Letter(15)', 'Letter when ≤ 20', '—', '50'], ['Letter(45)', 'Letter', '50 + 25 × ⌈25/20⌉ = 50 + 50', '100'], ['Box(2.5, false)', 'Box', '500 + 200 × 3', '1100'], ['Box(2.5, true)', 'Box when fragile', '(1100 × 3 + 1) / 2', '1650'], ['Pallet(10)', 'Pallet when ≥ 10', '15000 × 0.9', '13500']] },
      complexity: `<p>O(1) per parcel: one type switch plus constant-time arithmetic.</p>`,
      followUps: ['Add <code>Envelope</code> to the permits list — what does the compiler say?', 'Move prices into a config record so the switch only describes structure.']
    }
  });

  practice.push({
    title: 'Vending Machine as a Sealed State Machine (Pattern Matching on Pairs)',
    level: 'Medium', tags: ['sealed', 'record patterns', 'state machine', 'exhaustiveness'], companies: ['Uber', 'Zomato', 'Booking.com'],
    statement: `<p>States: ${C('Idle()')}, ${C('HasMoney(int cents)')}, ${C('Dispensed(String item, int change)')}. Events: ${C('Insert(int cents)')}, ${C('Select(String item)')}, ${C('Cancel()')}. Prices: cola 150, chips 100. Write ${C('State next(State s, Event e)')} as <b>one</b> switch over ${C('record Step(State s, Event e)')} using nested record patterns, with no ${C('default')}. Rules: Idle+Insert → HasMoney; HasMoney+Insert → add; HasMoney+Select (enough money) → Dispensed(item, change); not enough → stay; HasMoney+Cancel → Idle; Dispensed+Insert → HasMoney (next customer); everything else → Idle (or stay Idle).</p>`,
    constraints: `Unknown items cost ${C('Integer.MAX_VALUE')} (never affordable). No nulls.`,
    example: `<p>Insert 100 → ${H.c('b', 'HasMoney[cents=100]')}; Select cola → ${H.c('b', 'HasMoney[cents=100]')} (not enough); Insert 100 → ${H.c('b', 'HasMoney[cents=200]')}; Select cola → ${H.c('g', 'Dispensed[item=cola, change=50]')}; Cancel → ${H.c('b', 'Idle[]')}.</p>`,
    brute: { why: `<p>An ${C('enum State')} plus separate mutable fields (${C('money')}, ${C('item')}) and nested ${C('if (state == ...)')} blocks. Data that belongs to one state (change) leaks into others, impossible combinations are representable, and the compiler cannot tell you about unhandled (state, event) pairs.</p>`, code: `
class VendingBad {
    enum S { IDLE, HAS_MONEY, DISPENSED }
    S state = S.IDLE; int money; String item;      // fields meaningful only in some states
    void on(String event, int amount) {
        if (state == S.IDLE && event.equals("insert")) { state = S.HAS_MONEY; money = amount; }
        else if (state == S.HAS_MONEY && event.equals("insert")) money += amount;
        // select/cancel forgotten: compiles anyway
    }
    public static void main(String[] args) {
        VendingBad v = new VendingBad();
        v.on("insert", 100); v.on("cancel", 0);
        System.out.println(v.state + " " + v.money);   // HAS_MONEY 100 — cancel ignored
    }
}` },
    mcq: { q: 'Why switch over a Step(state, event) record instead of nesting two switches?', options: ['Nested record patterns let the compiler check exhaustiveness over every (state, event) combination in one place', 'It is faster at runtime', 'Nested switches are not allowed in Java 21', 'Records cannot be used inside a switch otherwise'], answer: 0, explain: 'case Step(HasMoney(var m), Select(var item)) reads like the transition table, and javac verifies that every combination of the two sealed hierarchies is covered.' },
    hints: [`<p>Hint 1: two sealed interfaces (State, Event) with records, plus ${C('record Step(State s, Event e)')}.</p>`, `<p>Hint 2: specific cases first, then broader ones: ${C('case Step(HasMoney(var m), Select(var item)) when price(item) <= m')} before the unguarded one.</p>`, `<p>Hint 3: catch-alls per state keep it exhaustive without default: ${C('case Step(Idle i, var e) -> i')}, ${C('case Step(Dispensed d, var e) -> new Idle()')}.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'chk', harness: { java: `
class Check {
  static String[] chk(String[] events) {
    State s = new Idle();
    List<String> out = new ArrayList<>();
    for (String ev : events) {
      String[] p = ev.split(":");
      Event e = p[0].equals("i") ? new Insert(Integer.parseInt(p[1])) : p[0].equals("s") ? new Select(p[1]) : new Cancel();
      s = Vending.next(s, e);
      out.add(s.toString());
    }
    return out.toArray(new String[0]);
  }
}` }, cases: [
        [[['i:100', 's:cola', 'i:100', 's:cola', 'c']], ['HasMoney[cents=100]', 'HasMoney[cents=100]', 'HasMoney[cents=200]', 'Dispensed[item=cola, change=50]', 'Idle[]']],
        [[['s:cola', 'c', 'i:5']], ['Idle[]', 'Idle[]', 'HasMoney[cents=5]']],
        [[['i:100', 's:gum']], ['HasMoney[cents=100]', 'HasMoney[cents=100]']],
        [[['i:100', 's:chips']], ['HasMoney[cents=100]', 'Dispensed[item=chips, change=0]']],
        [[['i:100', 's:chips', 'i:25']], ['HasMoney[cents=100]', 'Dispensed[item=chips, change=0]', 'HasMoney[cents=25]']],
        [[['i:150', 's:cola', 's:cola']], ['HasMoney[cents=150]', 'Dispensed[item=cola, change=0]', 'Idle[]']],
        [[['i:150', 's:cola', 'c']], ['HasMoney[cents=150]', 'Dispensed[item=cola, change=0]', 'Idle[]']],
        [[['i:50', 'i:50', 'i:50', 's:cola']], ['HasMoney[cents=50]', 'HasMoney[cents=100]', 'HasMoney[cents=150]', 'Dispensed[item=cola, change=0]']],
        [[['i:1000000', 's:cola']], ['HasMoney[cents=1000000]', 'Dispensed[item=cola, change=999850]']],
        [[['i:100', 'c', 'c']], ['HasMoney[cents=100]', 'Idle[]', 'Idle[]']]
      ] },
    solution: {
      approach: `<p>Encode states and events as sealed record hierarchies; each state carries only its own data. The transition function pattern-matches on the pair, listing specific transitions first and per-state catch-alls last, so javac proves every combination is handled.</p>`,
      code: `
import java.util.*;

sealed interface State permits Idle, HasMoney, Dispensed { }
record Idle() implements State { }
record HasMoney(int cents) implements State { }
record Dispensed(String item, int change) implements State { }

sealed interface Event permits Insert, Select, Cancel { }
record Insert(int cents) implements Event { }
record Select(String item) implements Event { }
record Cancel() implements Event { }

record Step(State s, Event e) { }

class Vending {
    static final Map<String, Integer> PRICES = Map.of("cola", 150, "chips", 100);
    static int price(String item) { return PRICES.getOrDefault(item, Integer.MAX_VALUE); }

    static State next(State s, Event e) {
        return switch (new Step(s, e)) {
            case Step(Idle i, Insert(int c))                       -> new HasMoney(c);
            case Step(Idle i, var other)                           -> i;
            case Step(HasMoney(int m), Insert(int c))              -> new HasMoney(m + c);
            case Step(HasMoney(int m), Select(String item)) when price(item) <= m
                                                                   -> new Dispensed(item, m - price(item));
            case Step(HasMoney(int m), Select(String item))        -> new HasMoney(m);
            case Step(HasMoney(int m), Cancel c)                   -> new Idle();
            case Step(Dispensed d, Insert(int c))                  -> new HasMoney(c);
            case Step(Dispensed d, var other)                      -> new Idle();
        };
    }

    public static void main(String[] args) {
        State s = new Idle();
        for (Event e : List.of(new Insert(100), new Select("cola"), new Insert(100), new Select("cola"), new Cancel())) {
            s = next(s, e);
            System.out.println(e + " -> " + s);
        }
    }
}`,
      dry: { head: ['state', 'event', 'case', 'new state'], rows: [['Idle', 'Insert(100)', 'Step(Idle, Insert)', 'HasMoney(100)'], ['HasMoney(100)', 'Select(cola)', 'guard 150 ≤ 100 false → unguarded', 'HasMoney(100)'], ['HasMoney(100)', 'Insert(100)', 'Step(HasMoney, Insert)', 'HasMoney(200)'], ['HasMoney(200)', 'Select(cola)', 'guard true', 'Dispensed(cola, 50)'], ['Dispensed', 'Cancel', 'Step(Dispensed, var)', 'Idle']] },
      complexity: `<p>O(1) per event. The switch compiles to type tests plus accessor calls.</p>`,
      followUps: ['Add a <code>Refill</code> event — which cases does the compiler make you add?', 'Make next() return a record of (newState, List&lt;Effect&gt;) so side effects (refund, beep) are data too.']
    }
  });

  practice.push({
    title: 'Predict the Output: The Overload Resolution Gauntlet',
    level: 'Medium', tags: ['output prediction', 'overloading', 'boxing', 'varargs'], companies: ['Oracle', 'Adobe', 'Deutsche Bank'],
    statement: `<p>Predict all 8 lines.</p>${P(`
static void a(long x)    { print("a-long"); }
static void a(Integer x) { print("a-Integer"); }
static void a(Object x)  { print("a-Object"); }
static void a(int... x)  { print("a-varargs"); }
static void b(Object o)  { print("b-Object"); }
static void b(int... x)  { print("b-varargs"); }
static void c(double d)  { print("c-double"); }
static void c(Long l)    { print("c-Long"); }
static void d(char[] cs) { print("d-char[]"); }
static void d(Object o)  { print("d-Object"); }

a(5); a(5L); a(Integer.valueOf(5)); a("s"); a(); b(5); c(5); d(null);`)}`,
    constraints: `Each call compiles. (Bonus: which extra overload would make <code>d(null)</code> ambiguous?)`,
    example: `<p>Answer: ${H.c('g', 'a-long · a-long · a-Integer · a-Object · a-varargs · b-Object · c-double · d-char[]')}. ${C('b(5)')} picks Object because <b>boxing (phase 2) beats varargs (phase 3)</b>; ${C('c(5)')} widens int → double rather than boxing to Long (int never boxes to Long anyway).</p>`,
    brute: { why: `<p>Guessing "the closest-looking type" fails: ${C('a(5)')} looks like it should pick Integer (5 is "an integer"), and ${C('b(5)')} looks like it should pick ${C('int...')}. The JLS uses strict phases, not resemblance.</p>`, code: `
class OverloadPuzzle {
    static void a(long x)    { System.out.println("a-long"); }
    static void a(Integer x) { System.out.println("a-Integer"); }
    static void a(Object x)  { System.out.println("a-Object"); }
    static void a(int... x)  { System.out.println("a-varargs"); }
    static void b(Object o)  { System.out.println("b-Object"); }
    static void b(int... x)  { System.out.println("b-varargs"); }
    static void c(double d)  { System.out.println("c-double"); }
    static void c(Long l)    { System.out.println("c-Long"); }
    static void d(char[] cs) { System.out.println("d-char[]"); }
    static void d(Object o)  { System.out.println("d-Object"); }
    public static void main(String[] args) {
        a(5); a(5L); a(Integer.valueOf(5)); a("s"); a(); b(5); c(5); d(null);
    }
}` },
    mcq: { q: 'Adding <code>static void d(String s)</code> makes <code>d(null)</code>…', options: ['a compile error: ambiguous (neither char[] nor String is more specific)', 'call d(String)', 'call d(char[])', 'call d(Object)'], answer: 0, explain: 'null is applicable to all three; char[] and String are unrelated types, so there is no single most specific method.' },
    hints: [`<p>Hint 1: phase 1 = exact/widening only (no boxing, no varargs); phase 2 = boxing allowed; phase 3 = varargs. Stop at the first phase that finds something.</p>`, `<p>Hint 2: within a phase choose the <b>most specific</b> method (its parameter type is a subtype / narrower primitive of the others).</p>`, `<p>Hint 3: ${C('a()')} with zero arguments can only match varargs. ${C('null')} matches every reference type; ${C('char[]')} is more specific than ${C('Object')}.</p>`],
    tests: { io: true, cases: [
        { stdin: '', stdout: 'a-long\na-long\na-Integer\na-Object\na-varargs\nb-Object\nc-double\nd-char[]' }
      ] },
    solution: {
      approach: `<p>Run the three phases per call and pick the most specific method in the first successful phase.</p>`,
      code: `
class OverloadAnswer {
    static void a(long x)    { System.out.println("a-long"); }
    static void a(Integer x) { System.out.println("a-Integer"); }
    static void a(Object x)  { System.out.println("a-Object"); }
    static void a(int... x)  { System.out.println("a-varargs"); }
    static void b(Object o)  { System.out.println("b-Object"); }
    static void b(int... x)  { System.out.println("b-varargs"); }
    static void c(double d)  { System.out.println("c-double"); }
    static void c(Long l)    { System.out.println("c-Long"); }
    static void d(char[] cs) { System.out.println("d-char[]"); }
    static void d(Object o)  { System.out.println("d-Object"); }
    public static void main(String[] args) {
        a(5);                    // a-long     phase 1: int → long widening
        a(5L);                   // a-long     exact match
        a(Integer.valueOf(5));   // a-Integer  exact reference type (more specific than Object)
        a("s");                  // a-Object   only Object fits
        a();                     // a-varargs  only varargs takes 0 args
        b(5);                    // b-Object   phase 2 (boxing to Integer → Object) beats phase 3
        c(5);                    // c-double   phase 1 widening; int cannot box to Long
        d(null);                 // d-char[]   char[] more specific than Object
    }
}`,
      dry: { head: ['call', 'phase that succeeds', 'candidates there', 'chosen'], rows: [['a(5)', '1 (widening)', 'a(long)', 'a-long'], ['a(Integer.valueOf(5))', '1', 'a(Integer), a(Object)', 'a-Integer'], ['b(5)', '2 (boxing)', 'b(Object)', 'b-Object'], ['c(5)', '1', 'c(double)', 'c-double'], ['d(null)', '1', 'd(char[]), d(Object)', 'd-char[]']] },
      complexity: `<p>O(1) — resolution happens at compile time; at runtime the call is a fixed invokestatic.</p>`,
      followUps: ['Why does <code>String.valueOf(null)</code> throw NPE? (picks valueOf(char[]))', 'Why did Java 5 put boxing and varargs in later phases? (backward compatibility with pre-5 overloads)']
    }
  });

  practice.push({
    title: 'Annotation-Driven Validator for Records',
    level: 'Medium', tags: ['annotations', 'reflection', 'records', 'validation'], companies: ['Red Hat', 'Intuit', 'Freshworks'],
    statement: `<p>Create runtime annotations ${C('@NotBlank')} (for String components) and ${C('@Range(min, max)')} (for int components), target ${C('RECORD_COMPONENT')}. Write ${C('List<String> validate(Record r)')} returning messages like ${C('"age: 200 not in [0, 150]"')} and ${C('"name: must not be blank"')}, in component order. Do it generically with reflection — no code specific to one record.</p>`,
    constraints: `Only records; components may be null (null String is "blank"). Up to 50 components.`,
    example: `<p>${C('record Signup(@NotBlank String name, @Range(min = 0, max = 150) int age, String note)')}: ${C('new Signup(" ", 200, null)')} → ${H.c('r', '[name: must not be blank, age: 200 not in [0, 150]]')}; ${C('new Signup("Asha", 30, null)')} → ${H.c('g', '[]')}. ${C('note')} has no annotations, so null is fine.</p>`,
    brute: { why: `<p>Hand-written checks in every record's constructor: duplicated logic, inconsistent messages, and nothing reusable for the 200 other DTOs. Declarative annotations + one generic validator is the Jakarta Bean Validation idea in miniature.</p>`, code: `
record SignupManual(String name, int age) {
    SignupManual {
        if (name == null || name.isBlank()) throw new IllegalArgumentException("name blank");
        if (age < 0 || age > 150) throw new IllegalArgumentException("age range");   // repeated in every DTO
    }
    public static void main(String[] args) {
        try { new SignupManual(" ", 200); }
        catch (IllegalArgumentException e) { System.out.println(e.getMessage()); }  // only the FIRST problem
    }
}` },
    mcq: { q: 'You put <code>@Target(ElementType.RECORD_COMPONENT)</code> on @Range. Where can reflection find it?', options: ['On <code>getRecordComponents()[i]</code> only — it is not propagated to the field or accessor', 'On the private field only', 'On the accessor method only', 'Nowhere — records drop annotations'], answer: 0, explain: 'Annotations on record components propagate to fields/accessors/parameters only if their @Target allows those element kinds. With RECORD_COMPONENT only, they stay on the component.' },
    hints: [`<p>Hint 1: ${C('@Retention(RUNTIME) @Target(ElementType.RECORD_COMPONENT)')} for both annotations.</p>`, `<p>Hint 2: loop ${C('r.getClass().getRecordComponents()')}, read the value via ${C('rc.getAccessor().invoke(r)')}, then check ${C('rc.getAnnotation(...)')}.</p>`, `<p>Hint 3: collect <b>all</b> violations instead of throwing at the first, so the user can fix everything at once.</p>`],
    tests: { sig: 'string string int string -> string', fn: 'chk', harness: { java: `
record Order2(@Range(min = 1, max = 3) int q, @NotBlank String label, @NotBlank String other) { }
class Check {
  static String chk(String kind, String name, int age, String note) throws Exception {
    Record r = kind.equals("signup") ? new Signup(name, age, note) : new Order2(age, name, note);
    return String.valueOf(Validator.validate(r));
  }
}` }, cases: [
        [['signup', ' ', 200, null], '[name: must not be blank, age: 200 not in [0, 150]]'],
        [['signup', 'Asha', 30, null], '[]'],
        [['signup', null, 0, 'x'], '[name: must not be blank]'],
        [['signup', 'A', -1, ''], '[age: -1 not in [0, 150]]'],
        [['signup', 'A', 150, null], '[]'],
        [['signup', 'A', 0, null], '[]'],
        [['signup', 'A', 151, null], '[age: 151 not in [0, 150]]'],
        [['signup', '', 2147483647, 'n'], '[name: must not be blank, age: 2147483647 not in [0, 150]]'],
        [['order', 'ok', 0, ' '], '[q: 0 not in [1, 3], other: must not be blank]'],
        [['order', 'ok', 3, 'fine'], '[]']
      ] },
    solution: {
      approach: `<p>Annotations declare the rules on the data; one reflective validator enforces them for any record. Collect violations in component order for helpful error messages.</p>`,
      code: `
import java.lang.annotation.*;
import java.lang.reflect.*;
import java.util.*;

@Retention(RetentionPolicy.RUNTIME) @Target(ElementType.RECORD_COMPONENT) @interface NotBlank { }
@Retention(RetentionPolicy.RUNTIME) @Target(ElementType.RECORD_COMPONENT) @interface Range { int min(); int max(); }

record Signup(@NotBlank String name, @Range(min = 0, max = 150) int age, String note) { }

class Validator {
    static List<String> validate(Record r) throws ReflectiveOperationException {
        List<String> errors = new ArrayList<>();
        for (RecordComponent rc : r.getClass().getRecordComponents()) {
            Object value = rc.getAccessor().invoke(r);
            if (rc.isAnnotationPresent(NotBlank.class) && (value == null || value.toString().isBlank()))
                errors.add(rc.getName() + ": must not be blank");
            Range range = rc.getAnnotation(Range.class);
            if (range != null && value instanceof Integer i && (i < range.min() || i > range.max()))
                errors.add(rc.getName() + ": " + i + " not in [" + range.min() + ", " + range.max() + "]");
        }
        return errors;
    }

    public static void main(String[] args) throws Exception {
        System.out.println(validate(new Signup(" ", 200, null)));   // [name: must not be blank, age: 200 not in [0, 150]]
        System.out.println(validate(new Signup("Asha", 30, null))); // []
    }
}`,
      dry: { head: ['component', 'value', 'annotations', 'violation'], rows: [['name', '" "', '@NotBlank', 'must not be blank'], ['age', '200', '@Range(0, 150)', '200 not in [0, 150]'], ['note', 'null', 'none', '—']] },
      complexity: `<p>O(C) reflective calls for C components. Cache the component list and annotations per class (ClassValue) for hot paths.</p>`,
      followUps: ['Run validate automatically from the compact constructor — what is the trade-off?', 'How does Jakarta Bean Validation (Hibernate Validator) do the same at scale?']
    }
  });

  practice.push({
    title: 'Predict the Output: Lazy Streams, findFirst and Optional.orElse',
    level: 'Medium', tags: ['output prediction', 'streams', 'Optional', 'laziness'], companies: ['Google', 'Walmart', 'Paytm'],
    statement: `<p>Predict the 4 printed lines.</p>${P(`
List<String> log = new ArrayList<>();
Optional<String> first = Stream.of("apple", "banana", "cherry")
    .filter(s -> { log.add("f:" + s); return s.contains("an"); })
    .map(s -> { log.add("m:" + s); return s.toUpperCase(); })
    .findFirst();
System.out.println(first.get() + " " + log);
System.out.println(Optional.of("x").orElse(expensive()));     // expensive() prints "computing"
System.out.println(Stream.iterate(1, x -> x * 2).limit(5).toList());`)}`,
    constraints: `${C('expensive()')} prints "computing" and returns "fallback".`,
    example: `<p>Answer: ${H.c('g', 'BANANA [f:apple, f:banana, m:banana] · computing · x · [1, 2, 4, 8, 16]')}. Streams are lazy and process elements one by one; findFirst short-circuits, so "cherry" is never touched. ${C('orElse')}'s argument is evaluated <b>before</b> the call, even when the Optional is present.</p>`,
    brute: { why: `<p>The "stage by stage" mental model (filter everything, then map everything) predicts ${C('[f:apple, f:banana, f:cherry, m:banana]')}. And reading ${C('orElse(expensive())')} as "only if empty" misses that Java evaluates arguments eagerly.</p>`, code: `
import java.util.*;
import java.util.stream.*;

class LazyPuzzle {
    static String expensive() { System.out.println("computing"); return "fallback"; }
    public static void main(String[] args) {
        List<String> log = new ArrayList<>();
        Optional<String> first = Stream.of("apple", "banana", "cherry")
            .filter(s -> { log.add("f:" + s); return s.contains("an"); })
            .map(s -> { log.add("m:" + s); return s.toUpperCase(); })
            .findFirst();
        System.out.println(first.get() + " " + log);
        System.out.println(Optional.of("x").orElse(expensive()));
        System.out.println(Stream.iterate(1, x -> x * 2).limit(5).toList());
    }
}` },
    mcq: { q: 'How do you avoid calling expensive() when the Optional already has a value?', options: ['<code>orElseGet(LazyPuzzle::expensive)</code>', '<code>orElse(null)</code>', '<code>get()</code>', 'Wrap it in <code>Optional.of</code>'], answer: 0, explain: 'orElseGet takes a Supplier and calls it only when the Optional is empty.' },
    hints: [`<p>Hint 1: picture one element at a time travelling down the pipeline (vertical processing).</p>`, `<p>Hint 2: ${C('findFirst')} is a short-circuiting terminal operation — it stops pulling after the first element that reaches it.</p>`, `<p>Hint 3: method arguments are evaluated before the method runs; ${C('orElse(x)')} always computes x. ${C('Stream.iterate')} is infinite — ${C('limit')} makes it finite.</p>`],
    tests: { io: true, cases: [
        { stdin: '', stdout: 'BANANA [f:apple, f:banana, m:banana]\ncomputing\nx\nx\n[1, 2, 4, 8, 16]' }
      ] },
    solution: {
      approach: `<p>Trace element by element: apple → filter false; banana → filter true → map → findFirst done. Then apply Java's eager argument evaluation to orElse.</p>`,
      code: `
import java.util.*;
import java.util.stream.*;

class LazyAnswer {
    static String expensive() { System.out.println("computing"); return "fallback"; }
    public static void main(String[] args) {
        List<String> log = new ArrayList<>();
        Optional<String> first = Stream.of("apple", "banana", "cherry")
            .filter(s -> { log.add("f:" + s); return s.contains("an"); })
            .map(s -> { log.add("m:" + s); return s.toUpperCase(); })
            .findFirst();                                          // stops after banana
        System.out.println(first.get() + " " + log);              // BANANA [f:apple, f:banana, m:banana]
        System.out.println(Optional.of("x").orElse(expensive()));  // computing  then  x
        System.out.println(Optional.of("x").orElseGet(LazyAnswer::expensive)); // x (no computing)
        System.out.println(Stream.iterate(1, x -> x * 2).limit(5).toList());  // [1, 2, 4, 8, 16]
    }
}`,
      dry: { head: ['element', 'filter', 'map', 'findFirst'], rows: [['apple', 'f:apple → false', '—', 'keep pulling'], ['banana', 'f:banana → true', 'm:banana → BANANA', H.c('g', 'done')], ['cherry', 'never evaluated', '—', '—']] },
      complexity: `<p>O(k) where k is the index of the first match; laziness is what makes infinite streams usable.</p>`,
      followUps: ['What changes with <code>.sorted()</code> before filter? (sorted is a barrier: it must consume everything)', 'Why can <code>count()</code> skip peek() since Java 9?']
    }
  });
  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'Algebraic Simplifier with Nested Record Patterns',
    level: 'Hard', tags: ['sealed', 'record patterns', 'recursion', 'rewriting'], companies: ['Google', 'JetBrains', 'Databricks'],
    statement: `<p>Given ${C('sealed interface Expr permits Num, Var, Add, Mul, Neg')}, write ${C('Expr simplify(Expr e)')} that simplifies bottom-up using these rules until no rule applies at each node: constant folding (${C('Add(Num a, Num b)')} → ${C('Num(a+b)')}, same for Mul), ${C('x + 0 = 0 + x = x')}, ${C('x * 1 = 1 * x = x')}, ${C('x * 0 = 0 * x = 0')}, ${C('-(Num v) = Num(-v)')}, ${C('-(-x) = x')}. Also write ${C('show(Expr)')}.</p>`,
    constraints: `Tree size ≤ 10<sup>4</sup>, depth ≤ 500. No instanceof chains; use nested record patterns and guards.`,
    example: `<p>${C('Add(Mul(Var x, Num 1), Neg(Neg(Mul(Num 0, Var y))))')} → children first: ${C('Mul(x,1)')} → x; ${C('Mul(0,y)')} → 0; ${C('Neg(Neg(0))')} → 0; then ${C('Add(x, 0)')} → ${H.c('g', 'x')}. And ${C('Mul(Add(Num 2, Num 3), Var z)')} → ${H.c('g', '(5 * z)')}.</p>`,
    brute: { why: `<p>Top-down, one pass, instanceof + casts: ${C('if (e instanceof Add a && a.right() instanceof Num n && n.value() == 0) return a.left();')} — misses opportunities that only appear after children are simplified (e.g. ${C('Add(x, Mul(0, y))')}), and grows into an unreadable maze.</p>`, code: `
sealed interface E permits N, V, A { }
record N(int v) implements E { }
record V(String name) implements E { }
record A(E l, E r) implements E { }

class NaiveSimplify {
    static E simplify(E e) {                                   // single top-down check only
        if (e instanceof A a && a.r() instanceof N n && n.v() == 0) return a.l();
        return e;
    }
    public static void main(String[] args) {
        E e = new A(new V("x"), new A(new N(0), new N(0)));    // x + (0 + 0)
        System.out.println(simplify(e));                       // unchanged: inner sum not simplified first
    }
}` },
    mcq: { q: 'Why simplify the children BEFORE applying rules to the parent?', options: ['Rules like x + 0 only become visible after the child (0 * y) has been reduced to 0', 'It is required by switch syntax', 'Top-down is not allowed with records', 'To avoid stack overflow'], answer: 0, explain: 'Bottom-up rewriting normalizes subtrees first, so each parent sees the simplest possible children and a single rule pass per node is enough for these rules.' },
    hints: [`<p>Hint 1: split into two functions: ${C('simplify')} rebuilds the node from simplified children; ${C('rewrite')} applies one rule at the root.</p>`, `<p>Hint 2: nested patterns read like the rules: ${C('case Add(var x, Num(int z)) when z == 0 -> x')}; ${C('case Neg(Neg(var x)) -> x')}.</p>`, `<p>Hint 3: put constant folding (${C('Add(Num a, Num b)')}) first; it is unguarded but more specific than ${C('Add(Num z, var x)')}, so no dominance error. End with ${C('default -> e')}.</p>`],
    tests: { sig: 'string -> string[]', fn: 'chk', harness: { java: `
class Check {
  static String[] toks; static int pos;
  static Expr parse() {
    String t = toks[pos++];
    if (!t.equals("(")) return Character.isLetter(t.charAt(0)) ? new Var(t) : new Num(Integer.parseInt(t));
    String op = toks[pos++];
    Expr r;
    if (op.equals("neg")) r = new Neg(parse());
    else { Expr a = parse(); Expr b = parse(); r = op.equals("+") ? new Add(a, b) : new Mul(a, b); }
    pos++;
    return r;
  }
  static String[] chk(String s) {
    toks = s.replace("(", " ( ").replace(")", " ) ").trim().split("\\\\s+"); pos = 0;
    Expr e = parse();
    return new String[]{ Simplifier.show(e), Simplifier.show(Simplifier.simplify(e)) };
  }
}` }, cases: [
        [['(+ (* x 1) (neg (neg (* 0 y))))'], ['((x * 1) + --(0 * y))', 'x']],
        [['(* (+ 2 3) z)'], ['((2 + 3) * z)', '(5 * z)']],
        [['(+ x 0)'], ['(x + 0)', 'x']],
        [['(+ 0 x)'], ['(0 + x)', 'x']],
        [['(* 1 x)'], ['(1 * x)', 'x']],
        [['(* x 0)'], ['(x * 0)', '0']],
        [['(* x 1)'], ['(x * 1)', 'x']],
        [['(neg 5)'], ['-5', '-5']],
        [['(neg (neg x))'], ['--x', 'x']],
        [['(neg -3)'], ['--3', '3']],
        [['(+ x y)'], ['(x + y)', '(x + y)']],
        [['(* (+ 1 2) (+ 3 4))'], ['((1 + 2) * (3 + 4))', '21']],
        [['(+ (+ x 0) (+ 0 y))'], ['((x + 0) + (0 + y))', '(x + y)']],
        [['(* 0 (+ x y))'], ['(0 * (x + y))', '0']],
        [['(neg (+ 1 2))'], ['-(1 + 2)', '-3']],
        [['(neg (neg (neg x)))'], ['---x', '-x']],
        [['(* (neg 1) x)'], ['(-1 * x)', '(-1 * x)']],
        [['(+ 2147483647 1)'], ['(2147483647 + 1)', '-2147483648']],
        [[{ $concat: [{ $rep: '(neg ', n: 500 }, 'x', { $rep: ')', n: 500 }] }], [{ $concat: [{ $rep: '-', n: 500 }, 'x'] }, 'x']],
        [[{ $concat: [{ $rep: '(+ ', n: 500 }, 'x', { $rep: ' 0)', n: 500 }] }], [{ $concat: [{ $rep: '(', n: 500 }, 'x', { $rep: ' + 0)', n: 500 }] }, 'x']]
      ] },
    solution: {
      approach: `<p>Bottom-up rewriting: simplify children recursively, rebuild the node, then match the rebuilt node against an ordered list of algebraic rules written as nested record patterns. Because children are already normal, a single rewrite per node suffices for this rule set.</p>`,
      code: `
sealed interface Expr permits Num, Var, Add, Mul, Neg { }
record Num(int value) implements Expr { }
record Var(String name) implements Expr { }
record Add(Expr l, Expr r) implements Expr { }
record Mul(Expr l, Expr r) implements Expr { }
record Neg(Expr e) implements Expr { }

class Simplifier {
    static Expr simplify(Expr e) {
        Expr rebuilt = switch (e) {                         // 1) children first
            case Num n           -> n;
            case Var v           -> v;
            case Add(var l, var r) -> new Add(simplify(l), simplify(r));
            case Mul(var l, var r) -> new Mul(simplify(l), simplify(r));
            case Neg(var x)        -> new Neg(simplify(x));
        };
        return rewrite(rebuilt);                            // 2) then rules at the root
    }

    static Expr rewrite(Expr e) {
        return switch (e) {
            case Add(Num(int a), Num(int b))            -> new Num(a + b);   // constant folding
            case Mul(Num(int a), Num(int b))            -> new Num(a * b);
            case Add(Num(int z), var x) when z == 0     -> x;
            case Add(var x, Num(int z)) when z == 0     -> x;
            case Mul(Num(int z), var x) when z == 0     -> new Num(0);
            case Mul(var x, Num(int z)) when z == 0     -> new Num(0);
            case Mul(Num(int one), var x) when one == 1 -> x;
            case Mul(var x, Num(int one)) when one == 1 -> x;
            case Neg(Num(int v))                        -> new Num(-v);
            case Neg(Neg(var x))                        -> x;
            default                                     -> e;
        };
    }

    static String show(Expr e) {
        return switch (e) {
            case Num(int v)        -> String.valueOf(v);
            case Var(String n)     -> n;
            case Add(var l, var r) -> "(" + show(l) + " + " + show(r) + ")";
            case Mul(var l, var r) -> "(" + show(l) + " * " + show(r) + ")";
            case Neg(var x)        -> "-" + show(x);
        };
    }

    public static void main(String[] args) {
        Expr e1 = new Add(new Mul(new Var("x"), new Num(1)), new Neg(new Neg(new Mul(new Num(0), new Var("y")))));
        System.out.println(show(e1) + "  =>  " + show(simplify(e1)));   // ((x * 1) + --(0 * y))  =>  x
        Expr e2 = new Mul(new Add(new Num(2), new Num(3)), new Var("z"));
        System.out.println(show(e2) + "  =>  " + show(simplify(e2)));   // ((2 + 3) * z)  =>  (5 * z)
    }
}`,
      dry: { head: ['node (bottom-up)', 'children after simplify', 'rule', 'result'], rows: [['Mul(x, 1)', 'x, 1', 'x * 1', 'x'], ['Mul(0, y)', '0, y', '0 * x', '0'], ['Neg(0)', '0', 'Neg(Num v)', '0'], ['Neg(Neg(...))', 'Neg(0) → 0', 'Neg(Num v)', '0'], ['Add(x, 0)', 'x, 0', 'x + 0', H.c('g', 'x')]] },
      complexity: `<p>O(n) nodes visited, each rewrite O(1); O(depth) recursion. Allocation of rebuilt nodes is O(n) — fine for records (cheap, often scalar-replaced by escape analysis).</p>`,
      followUps: ['Add <code>x + x → 2 * x</code> — why might it need a fixed-point loop?', 'Collect like terms with a Map&lt;String, Integer&gt; of coefficients.', 'How would you make simplify stack-safe for depth 10<sup>6</sup>?']
    }
  });

  practice.push({
    title: 'Retry & Timing Decorator with a Dynamic Proxy + Annotations',
    level: 'Hard', tags: ['dynamic proxy', 'annotations', 'reflection', 'resilience'], companies: ['Netflix', 'Amazon', 'Razorpay'],
    statement: `<p>Write ${C('static <T> T resilient(T target, Class<T> iface)')} that returns a proxy. For interface methods annotated ${C('@Retry(times = n)')}, the proxy retries up to n attempts when the target throws, then rethrows the <b>original</b> exception (not ${C('InvocationTargetException')}). Every call logs ${C('name attempt k')} on failure. Methods without ${C('@Retry')} are called once.</p>`,
    constraints: `Only interfaces (JDK proxies). ${C('Object')} methods (toString/equals/hashCode) must still work. No external libraries.`,
    example: `<p>A ${C('flaky()')} that fails twice then returns "ok", annotated ${C('@Retry(times = 3)')}: prints ${H.c('y', 'flaky failed attempt 1 · flaky failed attempt 2')}, returns ${H.c('g', 'ok')}. With ${C('times = 2')} it throws ${H.c('r', 'IllegalStateException: down')} (unwrapped).</p>`,
    brute: { why: `<p>Copy-pasting a retry loop into every method of every client class: duplicated, inconsistent and easy to forget. A proxy applies the policy declaratively — the same idea as Spring Retry / Resilience4j annotations.</p>`, code: `
class ManualRetry {
    static int calls = 0;
    static String flaky() { if (++calls < 3) throw new IllegalStateException("down"); return "ok"; }
    public static void main(String[] args) {
        String r = null;
        for (int attempt = 1; attempt <= 3; attempt++) {          // repeated at every call site...
            try { r = flaky(); break; }
            catch (IllegalStateException e) { System.out.println("attempt " + attempt + " failed"); }
        }
        System.out.println(r);
    }
}` },
    mcq: { q: 'Inside the InvocationHandler, method.invoke(target, args) throws InvocationTargetException. What should the proxy rethrow to callers?', options: ['e.getCause() — the target\'s real exception', 'The InvocationTargetException itself', 'A new RuntimeException wrapping it', 'Nothing; return null'], answer: 0, explain: 'Callers of the interface expect the interface method\'s own exceptions. Rethrowing the wrapper leaks reflection details (and a checked wrapper would become UndeclaredThrowableException).' },
    hints: [`<p>Hint 1: ${C('@Retention(RUNTIME) @Target(METHOD) @interface Retry { int times() default 3; }')}. The ${C('Method')} passed to the handler is the <b>interface</b> method, so read the annotation from it.</p>`, `<p>Hint 2: loop attempts; ${C('try { return method.invoke(target, args); } catch (InvocationTargetException e) { last = e.getCause(); }')}.</p>`, `<p>Hint 3: if ${C('method.getDeclaringClass() == Object.class')}, just invoke once. After the loop, ${C('throw last')} — the handler's ${C('invoke')} is declared ${C('throws Throwable')}, so checked exceptions declared on the interface pass through.</p>`],
    tests: { sig: 'string int -> string[]', fn: 'chk', harness: { java: `
class Check {
  static class Impl implements Inventory {
    int calls, failures;
    Impl(int failures) { this.failures = failures; }
    public String flaky() { if (calls++ < failures) throw new IllegalStateException("down"); return "ok"; }
    public String alwaysDown() { calls++; throw new IllegalStateException("down"); }
    public String stable() { if (calls++ < failures) throw new IllegalStateException("blip"); return "stable"; }
    public String toString() { return "impl-obj"; }
  }
  static String[] chk(String kind, int failures) {
    Impl real = new Impl(failures);
    Inventory inv = Resilience.resilient(real, Inventory.class);
    String out;
    try {
      switch (kind) {
        case "flaky": out = inv.flaky(); break;
        case "alwaysDown": out = inv.alwaysDown(); break;
        case "stable": out = inv.stable(); break;
        case "toString": out = inv.toString(); break;
        default: out = String.valueOf(inv.hashCode() == real.hashCode());
      }
    } catch (Throwable t) { out = t.getClass().getSimpleName() + ":" + t.getMessage(); }
    return new String[]{ out, String.valueOf(real.calls) };
  }
}` }, cases: [
        [['flaky', 0], ['ok', '1']],
        [['flaky', 1], ['ok', '2']],
        [['flaky', 2], ['ok', '3']],
        [['flaky', 3], ['IllegalStateException:down', '3']],
        [['alwaysDown', 0], ['IllegalStateException:down', '2']],
        [['stable', 0], ['stable', '1']],
        [['stable', 1], ['IllegalStateException:blip', '1']],
        [['toString', 0], ['impl-obj', '0']],
        [['hashCode', 0], ['true', '0']]
      ] },
    solution: {
      approach: `<p>Separate the cross-cutting policy (retry) from business code: the annotation marks <b>which</b> methods, the proxy implements <b>how</b>. Unwrap reflection's InvocationTargetException so callers see the original failure.</p>`,
      code: `
import java.lang.annotation.*;
import java.lang.reflect.*;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
@interface Retry { int times() default 3; }

interface Inventory {
    @Retry(times = 3) String flaky();
    @Retry(times = 2) String alwaysDown();
    String stable();
}

class Resilience {
    @SuppressWarnings("unchecked")
    static <T> T resilient(T target, Class<T> iface) {
        InvocationHandler h = (proxy, method, args) -> {
            Retry retry = method.getAnnotation(Retry.class);
            int attempts = (retry == null || method.getDeclaringClass() == Object.class) ? 1 : Math.max(1, retry.times());
            Throwable last = null;
            for (int k = 1; k <= attempts; k++) {
                try {
                    return method.invoke(target, args);
                } catch (InvocationTargetException e) {
                    last = e.getCause();                                   // the real failure
                    System.out.println(method.getName() + " failed attempt " + k);
                }
            }
            throw last;                                                     // original exception
        };
        return (T) Proxy.newProxyInstance(iface.getClassLoader(), new Class<?>[]{iface}, h);
    }

    public static void main(String[] args) {
        Inventory real = new Inventory() {
            int calls = 0;
            public String flaky() { if (++calls < 3) throw new IllegalStateException("down"); return "ok"; }
            public String alwaysDown() { throw new IllegalStateException("down"); }
            public String stable() { return "stable"; }
        };
        Inventory inv = resilient(real, Inventory.class);
        System.out.println(inv.flaky());          // flaky failed attempt 1 / flaky failed attempt 2 / ok
        System.out.println(inv.stable());         // stable
        try { inv.alwaysDown(); }
        catch (IllegalStateException e) { System.out.println("gave up: " + e.getMessage()); }  // after 2 attempts
    }
}`,
      dry: { head: ['call', 'attempt', 'target result', 'proxy action'], rows: [['flaky()', '1', 'throws down', 'log, retry'], ['flaky()', '2', 'throws down', 'log, retry'], ['flaky()', '3', '"ok"', H.c('g', 'return ok')], ['alwaysDown()', '1, 2', 'throws twice', H.c('r', 'rethrow IllegalStateException')], ['stable()', '1', '"stable"', 'no @Retry → single call']] },
      complexity: `<p>O(times) invocations per call in the worst case. Proxy dispatch adds a reflective call (~tens of ns) — negligible next to remote calls being retried.</p>`,
      followUps: ['Add exponential backoff with jitter; why jitter? (thundering herd)', 'Only retry on specific exception types: <code>Class&lt;? extends Throwable&gt;[] on()</code>.', 'Why does Spring\'s @Retryable not work when a bean calls its own method? (self-invocation bypasses the proxy)']
    }
  });

  practice.push({
    title: 'Tiny JSON Serializer for Records, Sealed Types and Collections',
    level: 'Hard', tags: ['reflection', 'records', 'pattern matching', 'sealed', 'recursion'], companies: ['Stripe', 'Atlassian', 'Postman'],
    statement: `<p>Write ${C('String toJson(Object o)')} supporting: null, String (escape ${C('"')} and ${C('\\')}), Number, Boolean, enums (as names), ${C('Collection')} → array, ${C('Map')} → object (keys via toString), and any <b>record</b> → object of its components in order. If the record implements a <b>sealed</b> interface, add a first field ${C('"type": "<SimpleName>"')} so the JSON can be deserialized polymorphically. Anything else → ${C('IllegalArgumentException')}.</p>`,
    constraints: `Depth ≤ 100, no cycles. Use one pattern-matching switch plus record reflection. Output has no spaces.`,
    example: `<p>${C('new Order(7, List.of(new Card("4242"), new Cash()), Map.of("gift", true), Status.PAID)')} → ${H.c('g', '{"id":7,"payments":[{"type":"Card","last4":"4242"},{"type":"Cash"}],"flags":{"gift":true},"status":"PAID"}')}.</p>`,
    brute: { why: `<p>A hand-written ${C('toJson()')} method on every class: dozens of nearly identical methods, each with its own escaping bugs, that silently go stale when a field is added. A generic reflective serializer (what Jackson does) uses the record's own description of its data.</p>`, code: `
import java.util.*;

record Item2(String name, int qty) {
    String toJson() { return "{\\"name\\":\\"" + name + "\\",\\"qty\\":" + qty + "}"; }  // no escaping, manual per type
}

class ManualJson {
    public static void main(String[] args) {
        System.out.println(new Item2("say \\"hi\\"", 2).toJson());   // broken JSON: quotes not escaped
    }
}` },
    mcq: { q: 'Which case label catches every record regardless of its type?', options: ['<code>case Record r</code>', '<code>case Object o when o.getClass().isRecord()</code> only', '<code>case record r</code>', 'Records cannot be matched generically'], answer: 0, explain: 'Every record class extends java.lang.Record, so a type pattern on Record matches all of them; then getRecordComponents() describes the fields.' },
    hints: [`<p>Hint 1: order cases from specific to general: null, String, Number, Boolean, Enum, Collection, Map, Record, default.</p>`, `<p>Hint 2: for records: ${C('for (RecordComponent rc : r.getClass().getRecordComponents())')} → ${C('"\\"" + rc.getName() + "\\":" + toJson(rc.getAccessor().invoke(r))')}.</p>`, `<p>Hint 3: sealed discriminator: ${C('Arrays.stream(r.getClass().getInterfaces()).anyMatch(Class::isSealed)')}. Reflection throws checked exceptions — wrap them in an unchecked one inside the stream.</p>`],
    tests: { sig: 'string -> string', fn: 'chk', harness: { java: `
class Check {
  static String chk(String kind) {
    Object o;
    switch (kind) {
      case "order": o = new Order(7, List.of(new Card("4242"), new Cash()), Map.of("gift", true), Status.PAID); break;
      case "quotes": o = List.of("say \\"hi\\"", 1.5); break;
      case "null": o = null; break;
      case "backslash": o = "a\\\\b"; break;
      case "enum": o = Status.NEW; break;
      case "emptyList": o = List.of(); break;
      case "emptyMap": o = Map.of(); break;
      case "cash": o = new Cash(); break;
      case "card": o = new Card("1"); break;
      case "intKey": o = Map.of(1, "a"); break;
      case "nestedList": o = List.of(List.of(1, 2), List.of()); break;
      case "bool": o = Arrays.asList(true, false, null); break;
      case "long": o = 9007199254740993L; break;
      case "deep": { Object x = 1; for (int i = 0; i < 100; i++) x = List.of(x); o = x; break; }
      case "ordered": { Map<String, Object> m = new LinkedHashMap<>(); m.put("b", 1); m.put("a", List.of("x")); o = m; break; }
      default: o = new Object();
    }
    try { return Json.toJson(o); } catch (IllegalArgumentException e) { return "IAE"; }
  }
}` }, cases: [
        [['order'], '{"id":7,"payments":[{"type":"Card","last4":"4242"},{"type":"Cash"}],"flags":{"gift":true},"status":"PAID"}'],
        [['quotes'], '["say \\"hi\\"",1.5]'],
        [['null'], 'null'],
        [['backslash'], '"a\\\\b"'],
        [['enum'], '"NEW"'],
        [['emptyList'], '[]'],
        [['emptyMap'], '{}'],
        [['cash'], '{"type":"Cash"}'],
        [['card'], '{"type":"Card","last4":"1"}'],
        [['intKey'], '{"1":"a"}'],
        [['nestedList'], '[[1,2],[]]'],
        [['bool'], '[true,false,null]'],
        [['long'], '9007199254740993'],
        [['ordered'], '{"b":1,"a":["x"]}'],
        [['deep'], '[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[[1]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]]'],
        [['object'], 'IAE']
      ] },
    solution: {
      approach: `<p>One recursive pattern switch handles the JSON value kinds; records are serialized generically from their component metadata, and the sealed-parent check adds a discriminator. Escaping is centralized in one ${C('quote')} helper.</p>`,
      code: `
import java.lang.reflect.*;
import java.util.*;
import java.util.stream.*;

sealed interface Payment permits Card, Cash { }
record Card(String last4) implements Payment { }
record Cash() implements Payment { }
enum Status { NEW, PAID }
record Order(int id, List<Payment> payments, Map<String, Object> flags, Status status) { }

class Json {
    static String quote(String s) {
        return "\\"" + s.replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\"") + "\\"";
    }

    static String toJson(Object o) {
        return switch (o) {
            case null              -> "null";
            case String s          -> quote(s);
            case Number n          -> n.toString();
            case Boolean b         -> b.toString();
            case Enum<?> e         -> quote(e.name());
            case Collection<?> c   -> c.stream().map(Json::toJson).collect(Collectors.joining(",", "[", "]"));
            case Map<?, ?> m       -> m.entrySet().stream()
                                        .map(e -> quote(String.valueOf(e.getKey())) + ":" + toJson(e.getValue()))
                                        .collect(Collectors.joining(",", "{", "}"));
            case Record r          -> record(r);
            default                -> throw new IllegalArgumentException("unsupported: " + o.getClass());
        };
    }

    private static String record(Record r) {
        List<String> fields = new ArrayList<>();
        boolean sealedParent = Arrays.stream(r.getClass().getInterfaces()).anyMatch(Class::isSealed);
        if (sealedParent) fields.add(quote("type") + ":" + quote(r.getClass().getSimpleName()));
        for (RecordComponent rc : r.getClass().getRecordComponents()) {
            try {
                fields.add(quote(rc.getName()) + ":" + toJson(rc.getAccessor().invoke(r)));
            } catch (ReflectiveOperationException e) {
                throw new IllegalStateException(e);
            }
        }
        return fields.stream().collect(Collectors.joining(",", "{", "}"));
    }

    public static void main(String[] args) {
        Order o = new Order(7, List.of(new Card("4242"), new Cash()), Map.of("gift", true), Status.PAID);
        System.out.println(toJson(o));
        // {"id":7,"payments":[{"type":"Card","last4":"4242"},{"type":"Cash"}],"flags":{"gift":true},"status":"PAID"}
        System.out.println(toJson(List.of("say \\"hi\\"", 1.5)));   // ["say \\"hi\\"",1.5]
    }
}`,
      dry: { head: ['value', 'case', 'output'], rows: [['Order (record)', 'Record r', '{"id":…}'], ['7', 'Number', '7'], ['List of payments', 'Collection', '[…]'], ['Card("4242")', 'Record + sealed parent', '{"type":"Card","last4":"4242"}'], ['Status.PAID', 'Enum', '"PAID"']] },
      complexity: `<p>O(total size of the object graph). Reflection lookups per record type can be cached (ClassValue) to make repeated serialization fast.</p>`,
      followUps: ['Detect cycles with an IdentityHashMap-based visited set.', 'Escape control characters (\\n, \\t, \\u0000–\\u001F) per RFC 8259.', 'Write the reverse: fromJson for sealed types using the "type" field and getPermittedSubclasses().']
    }
  });

  practice.push({
    title: 'Predict the Output: Class Initialization Triggers and Failures',
    level: 'Hard', tags: ['output prediction', 'class loading', 'static init', 'errors'], companies: ['Oracle', 'Morgan Stanley', 'Atlassian'],
    statement: `<p>Predict every line. Note which accesses trigger class initialization.</p>${P(`
class Config {
    static { System.out.println("Config init"); }
    static final int CONST = 42;          // compile-time constant
    static final Integer BOXED = 7;       // NOT a compile-time constant
}
class Broken { static int v = Integer.parseInt("oops"); }

System.out.println(Config.CONST);
Config[] arr = new Config[3];
System.out.println(arr.length);
System.out.println(Config.BOXED);
try { System.out.println(Broken.v); }
catch (ExceptionInInitializerError e) { System.out.println("EIIE cause: " + e.getCause()); }
try { System.out.println(Broken.v); }
catch (NoClassDefFoundError e) { System.out.println("NCDFE: " + e.getMessage()); }`)}`,
    constraints: `HotSpot, Java 21, single class loader.`,
    example: `<p>Answer: ${H.c('g', '42 · 3 · Config init · 7 · EIIE cause: java.lang.NumberFormatException: For input string: "oops" · NCDFE: Could not initialize class Broken')}. ${C('Config.CONST')} is inlined by javac (no init); creating an array of Config does not initialize Config; ${C('Config.BOXED')} does.</p>`,
    brute: { why: `<p>The naive model "a class initializes when you first mention it" predicts "Config init" before 42. It also predicts the second ${C('Broken.v')} access retries the initializer (it does not — the class is marked <b>erroneous</b> forever).</p>`, code: `
class Config {
    static { System.out.println("Config init"); }
    static final int CONST = 42;
    static final Integer BOXED = 7;
}
class Broken { static int v = Integer.parseInt("oops"); }

class InitTriggers {
    public static void main(String[] args) {
        System.out.println(Config.CONST);
        Config[] arr = new Config[3];
        System.out.println(arr.length);
        System.out.println(Config.BOXED);
        try { System.out.println(Broken.v); }
        catch (ExceptionInInitializerError e) { System.out.println("EIIE cause: " + e.getCause()); }
        try { System.out.println(Broken.v); }
        catch (NoClassDefFoundError e) { System.out.println("NCDFE: " + e.getMessage()); }
    }
}` },
    mcq: { q: 'In production you see NoClassDefFoundError: Could not initialize class X, but X.class is in the jar. What should you look for?', options: ['An earlier ExceptionInInitializerError for X in the logs (the real cause)', 'A missing jar on the classpath', 'A corrupted class file', 'A JIT bug'], answer: 0, explain: 'After a static initializer fails once, every later use throws NoClassDefFoundError. The root cause is the first failure (often in another thread, minutes earlier). JDK 17+ attaches it as the cause.' },
    hints: [`<p>Hint 1: initialization triggers (JLS 12.4.1): ${C('new')}, static method call, read/write of a static field that is <b>not a constant variable</b>, ${C('Class.forName')}, subclass init.</p>`, `<p>Hint 2: ${C('static final int CONST = 42')} is a constant variable → its value is copied into the caller's bytecode. ${C('Integer BOXED')} is not (not primitive/String).</p>`, `<p>Hint 3: a static initializer that throws → first access: ${C('ExceptionInInitializerError')}; later accesses: ${C('NoClassDefFoundError')}.</p>`],
    tests: { io: true, cases: [
        { stdin: '', stdout: '42\n3\nConfig init\n7\nEIIE cause: java.lang.NumberFormatException: For input string: "oops"\nNCDFE: Could not initialize class Broken' }
      ] },
    solution: {
      approach: `<p>Check each access against the JLS list of initialization triggers, remember constant inlining, and the "erroneous state" rule after a failed initializer.</p>`,
      code: `
class Config {
    static { System.out.println("Config init"); }
    static final int CONST = 42;
    static final Integer BOXED = 7;
}
class Broken { static int v = Integer.parseInt("oops"); }

class InitTriggersAnswer {
    public static void main(String[] args) {
        System.out.println(Config.CONST);     // 42            inlined constant: Config NOT initialized
        Config[] arr = new Config[3];         //               array creation: no init
        System.out.println(arr.length);       // 3
        System.out.println(Config.BOXED);     // Config init / 7   real static field read → init
        try { System.out.println(Broken.v); }
        catch (ExceptionInInitializerError e) { System.out.println("EIIE cause: " + e.getCause()); }
        // EIIE cause: java.lang.NumberFormatException: For input string: "oops"
        try { System.out.println(Broken.v); }
        catch (NoClassDefFoundError e) { System.out.println("NCDFE: " + e.getMessage()); }
        // NCDFE: Could not initialize class Broken
    }
}`,
      dry: { head: ['access', 'initializes?', 'printed'], rows: [['Config.CONST', 'no (constant inlined)', '42'], ['new Config[3]', 'no', '3'], ['Config.BOXED', H.c('y', 'yes'), 'Config init, 7'], ['Broken.v (1st)', 'yes → throws', 'EIIE cause: NumberFormatException…'], ['Broken.v (2nd)', 'erroneous state', 'NCDFE: Could not initialize class Broken']] },
      complexity: `<p>O(1). Note the security/robustness lesson: never do fallible work (parsing config, network) in static initializers.</p>`,
      followUps: ['Does <code>Config.class</code> initialize Config? (No.)', 'Why does the lazy holder singleton idiom rely on these rules?', 'How do you recover from an erroneous class without restarting? (a new class loader)']
    }
  });

  practice.push({
    title: 'Build a Mini Dependency-Injection Container with Reflection',
    level: 'Hard', tags: ['reflection', 'annotations', 'graphs', 'dependency injection'], companies: ['Spring (Broadcom)', 'Google', 'Uber'],
    statement: `<p>Write ${C('class Container')} with ${C('bind(Class<I> iface, Class<? extends I> impl)')} and ${C('<T> T get(Class<T> type)')}. ${C('get')} resolves the implementation, picks its constructor (the one annotated ${C('@Inject')}, or the only constructor), recursively gets every parameter, creates the object once and caches it (<b>singleton</b> scope). Detect cycles and report the path, e.g. ${C('cycle: A -> B -> A')}.</p>`,
    constraints: `Up to 1000 types; only constructor injection; interfaces need a binding (else a clear error).`,
    example: `<p>${C('OrderService(Repo repo, Clock clock)')}, ${C('Repo')} bound to ${C('MemRepo')}, ${C('Clock')} has a no-arg constructor → ${C('get(OrderService.class)')} creates Clock, MemRepo, then OrderService, and a second ${C('get')} returns the <b>same</b> instance. ${C('A(B b)')} + ${C('B(A a)')} → ${H.c('r', 'IllegalStateException: cycle: A -> B -> A')}.</p>`,
    brute: { why: `<p>Wiring by hand in ${C('main')} (${C('new OrderService(new MemRepo(), new Clock())')}) is fine for 3 classes but turns into hundreds of lines for real apps, must be manually reordered when constructors change, and accidentally creates duplicates of things that should be singletons.</p>`, code: `
class ManualWiring {
    static class Clock { }
    static class MemRepo { }
    static class OrderService { OrderService(MemRepo r, Clock c) { } }
    public static void main(String[] args) {
        OrderService a = new OrderService(new MemRepo(), new Clock());
        OrderService b = new OrderService(new MemRepo(), new Clock());   // a second, separate repo!
        System.out.println(a == b);   // false — no singleton scope
    }
}` },
    mcq: { q: 'Which data structure detects A → B → A while resolving?', options: ['A stack/ordered set of types currently being constructed (the DFS path)', 'The singleton cache', 'A queue of pending types (BFS)', 'A count of constructor parameters'], answer: 0, explain: 'Resolution is a depth-first traversal of the dependency graph. If a type appears again while it is still on the current path, there is a cycle — exactly DFS back-edge detection.' },
    hints: [`<p>Hint 1: maps: ${C('bindings: Class -> Class')}, ${C('singletons: Class -> Object')}; plus a ${C('LinkedHashSet<Class<?>> resolving')} for the current path.</p>`, `<p>Hint 2: constructor choice: ${C('getDeclaredConstructors()')}, prefer the ${C('@Inject')}-annotated one, else require exactly one. Resolve ${C('ctor.getParameterTypes()')} recursively, then ${C('newInstance(args)')}.</p>`, `<p>Hint 3: if ${C('resolving')} already contains the type, build the message from the path plus the type. Remove the type from the path in a ${C('finally')}. Interfaces without bindings → error.</p>`],
    tests: { sig: 'string -> string', fn: 'chk', harness: { java: `
class CycX { CycX(CycY y) { } } class CycY { CycY(CycZ z) { } } class CycZ { CycZ(CycX x) { } }
class Selfie { Selfie(Selfie s) { } }
class TwoCtors { TwoCtors() { } TwoCtors(String s) { } }
abstract class AbstractRepo implements Repo { }
class S1 { final Clock c; S1(Clock c) { this.c = c; } }
class S2 { final Clock c; S2(Clock c) { this.c = c; } }
class Check {
  static String chk(String kind) {
    Container c = new Container();
    try {
      switch (kind) {
        case "order": {
          c.bind(Repo.class, MemRepo.class);
          OrderService s = c.get(OrderService.class);
          return s.describe(7) + " " + (s == c.get(OrderService.class));
        }
        case "cycle": return String.valueOf(c.get(A.class));
        case "cycle3": return String.valueOf(c.get(CycX.class));
        case "selfCycle": return String.valueOf(c.get(Selfie.class));
        case "unbound": return String.valueOf(c.get(Repo.class));
        case "abstract": c.bind(Repo.class, AbstractRepo.class); return String.valueOf(c.get(Repo.class));
        case "ambiguous": return String.valueOf(c.get(TwoCtors.class));
        case "shared": return String.valueOf(c.get(S1.class).c == c.get(S2.class).c);
        case "recovers": {
          try { c.get(A.class); } catch (IllegalStateException e) { }
          return c.get(Clock.class) != null ? "ok" : "null";
        }
        default: return c.get(Clock.class).now() + "";
      }
    } catch (IllegalStateException e) { return "ISE: " + e.getMessage(); }
  }
}` }, cases: [
        [['order'], 'order-7 @ 1700000000 true'],
        [['cycle'], 'ISE: cycle: A -> B -> A'],
        [['cycle3'], 'ISE: cycle: CycX -> CycY -> CycZ -> CycX'],
        [['selfCycle'], 'ISE: cycle: Selfie -> Selfie'],
        [['unbound'], 'ISE: no binding for Repo'],
        [['abstract'], 'ISE: no binding for Repo'],
        [['ambiguous'], 'ISE: TwoCtors: annotate exactly one constructor with @Inject'],
        [['shared'], 'true'],
        [['recovers'], 'ok'],
        [['noArg'], '1700000000']
      ] },
    solution: {
      approach: `<p>Dependency resolution is DFS over the constructor-parameter graph: post-order creation (dependencies first), memoization for singleton scope, and back-edge detection on the current path for cycles. Reflection supplies the edges (constructor parameter types) and the instantiation.</p>`,
      code: `
import java.lang.annotation.*;
import java.lang.reflect.*;
import java.util.*;
import java.util.stream.*;

@Retention(RetentionPolicy.RUNTIME) @Target(ElementType.CONSTRUCTOR) @interface Inject { }

class Container {
    private final Map<Class<?>, Class<?>> bindings = new HashMap<>();
    private final Map<Class<?>, Object> singletons = new HashMap<>();
    private final LinkedHashSet<Class<?>> resolving = new LinkedHashSet<>();   // current DFS path

    <I> Container bind(Class<I> iface, Class<? extends I> impl) { bindings.put(iface, impl); return this; }

    <T> T get(Class<T> type) {
        Object existing = singletons.get(type);
        if (existing != null) return type.cast(existing);
        if (!resolving.add(type)) {
            String path = Stream.concat(resolving.stream(), Stream.of(type))
                .dropWhile(c -> c != type).map(Class::getSimpleName).collect(Collectors.joining(" -> "));
            throw new IllegalStateException("cycle: " + path);
        }
        try {
            Class<?> impl = bindings.getOrDefault(type, type);
            if (impl.isInterface() || Modifier.isAbstract(impl.getModifiers()))
                throw new IllegalStateException("no binding for " + type.getSimpleName());
            Constructor<?> ctor = pickConstructor(impl);
            Object[] args = Arrays.stream(ctor.getParameterTypes()).map(this::get).toArray();
            ctor.setAccessible(true);
            Object instance = ctor.newInstance(args);
            singletons.put(type, instance);
            return type.cast(instance);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("cannot create " + type.getSimpleName(), e);
        } finally {
            resolving.remove(type);
        }
    }

    private static Constructor<?> pickConstructor(Class<?> impl) {
        Constructor<?>[] all = impl.getDeclaredConstructors();
        List<Constructor<?>> marked = Arrays.stream(all).filter(c -> c.isAnnotationPresent(Inject.class)).toList();
        if (marked.size() == 1) return marked.get(0);
        if (all.length == 1) return all[0];
        throw new IllegalStateException(impl.getSimpleName() + ": annotate exactly one constructor with @Inject");
    }
}

interface Repo { String find(int id); }
class MemRepo implements Repo { public String find(int id) { return "order-" + id; } }
class Clock { long now() { return 1_700_000_000L; } }
class OrderService {
    final Repo repo; final Clock clock;
    @Inject OrderService(Repo repo, Clock clock) { this.repo = repo; this.clock = clock; }
    OrderService() { this(null, null); }                      // ignored: not @Inject
    String describe(int id) { return repo.find(id) + " @ " + clock.now(); }
}
class A { A(B b) { } }
class B { B(A a) { } }

class DiDemo {
    public static void main(String[] args) {
        Container c = new Container().bind(Repo.class, MemRepo.class);
        OrderService s1 = c.get(OrderService.class);
        System.out.println(s1.describe(7));                    // order-7 @ 1700000000
        System.out.println(s1 == c.get(OrderService.class));   // true (singleton)
        try { c.get(A.class); }
        catch (IllegalStateException e) { System.out.println(e.getMessage()); }   // cycle: A -> B -> A
    }
}`,
      dry: { head: ['call', 'path (resolving)', 'action', 'cache'], rows: [['get(OrderService)', '[OrderService]', '@Inject ctor(Repo, Clock)', '{}'], ['get(Repo)', '[OrderService, Repo]', 'binding → MemRepo, no-arg', '{Repo}'], ['get(Clock)', '[OrderService, Clock]', 'no-arg', '{Repo, Clock}'], ['back in OrderService', '[OrderService]', 'newInstance(repo, clock)', '{…, OrderService}'], ['get(A) → get(B) → get(A)', '[A, B] + A', H.c('r', 'cycle: A -> B -> A'), 'unchanged']] },
      complexity: `<p>O(V + E) over the dependency graph (each type created once, each constructor parameter resolved once thanks to the cache). Reflection cost is paid once per type at startup.</p>`,
      followUps: ['Add prototype scope (new instance each time) via an annotation on the class.', 'Support Provider&lt;T&gt; parameters to break legitimate cycles lazily.', 'How do Dagger/Micronaut do the same at compile time with annotation processors, and why does that start faster?']
    }
  });
  /* ======================================================================
     QUIZ — concepts + output prediction (all outputs verified on JDK 21)
     ====================================================================== */
  quiz.push(
    { q: `What does this print?<br><code>Integer x = 127, y = 127, p = 128, q = 128;<br>System.out.println((x == y) + " " + (p == q));</code>`, options: ['true false', 'true true', 'false false', 'false true'], answer: 0, explain: 'Autoboxing uses Integer.valueOf, which caches −128..127. x and y share one cached object; p and q are two different objects, and == compares references.' },
    { q: `What does <code>System.out.println(1 + 2 + "3" + 4 * 5);</code> print?`, options: ['3320', '12320', '33 20', '3345'], answer: 0, explain: '* binds tighter than +, so 4 * 5 = 20 first. Then left to right: 1 + 2 = 3, 3 + "3" = "33", "33" + 20 = "3320".' },
    { q: `<code>static String t() { try { return "try"; } finally { System.out.print("finally "); } }</code><br>What does <code>System.out.println(t());</code> print?`, options: ['finally try', 'try finally', 'try', 'finally'], answer: 0, explain: 'The return value "try" is captured, then finally runs (printing "finally "), then the method returns and println prints "try".' },
    { q: `<code>record P(int x) { P { x = Math.abs(x); } }</code> — what is <code>new P(-5).x()</code>?`, options: ['5', '-5', 'Compile error: cannot assign to x', '0'], answer: 0, explain: 'In a compact constructor x is the parameter; reassigning it is allowed, and the (normalized) parameter is assigned to the field after the body runs.' },
    { q: `Which of these is NOT allowed inside a record body?`, options: ['An instance field <code>private int cache;</code>', 'A static field', 'An instance method', 'Implementing an interface method'], answer: 0, explain: 'All instance state must be declared in the record header. Static fields, methods and interface implementations are fine.' },
    { q: `A pattern switch over <code>Object o</code> has <code>case Integer i -&gt; ...</code> followed by <code>case Integer i when i &gt; 0 -&gt; ...</code>. What happens?`, options: ['Compile error: the second label is dominated', 'It compiles; positive ints go to the second case', 'It compiles; the guard is ignored', 'Runtime MatchException'], answer: 0, explain: 'The unguarded Integer pattern above matches every Integer, so the guarded one could never run. javac reports "this case label is dominated by a preceding case label".' },
    { q: `<code>Object o = null; switch (o) { case String s -&gt; print("s"); default -&gt; print("d"); }</code> prints…`, options: ['Nothing — it throws NullPointerException', 'd', 's', 'null'], answer: 0, explain: 'Without an explicit case null, switch keeps its traditional behaviour and throws NPE for a null selector. default does not catch null.' },
    { q: `<code>String s = """<br>&nbsp;&nbsp;&nbsp;&nbsp;hi<br>&nbsp;&nbsp;&nbsp;&nbsp;""";</code> — what is <code>s.length()</code>?`, options: ['3', '2', '7', '6'], answer: 0, explain: 'Incidental indentation (4) is removed, giving "hi" followed by a newline because the closing delimiter is on its own line: "hi\\n" has length 3.' },
    { q: `What does <code>System.out.println(Stream.of(1, 2, 3).peek(System.out::print).count());</code> print on Java 9+?`, options: ['3', '1233', '123', '1 2 3 3'], answer: 0, explain: 'The stream size is known from the source and nothing changes it, so count() can be computed without traversing the pipeline — peek never runs.' },
    { q: `<code>Object o = true ? 1 : 2.0; System.out.println(o);</code> prints…`, options: ['1.0', '1', '2.0', 'Compile error'], answer: 0, explain: 'The conditional has int and double operands, so its type is double (binary numeric promotion). The chosen value 1 becomes 1.0, then is boxed to Double.' },
    { q: `What does <code>System.out.println((int) 'a' + 1 + "" + 'a' + 1);</code> print?`, options: ['98a1', '97a1', '98981', 'a1a1'], answer: 0, explain: '(int) \'a\' = 97, + 1 = 98 (int arithmetic). Then 98 + "" = "98", + \'a\' = "98a", + 1 = "98a1".' },
    { q: `<code>String a = "a"; String b = a + "b"; System.out.println(b == "ab");</code>`, options: ['false', 'true', 'Compile error', 'Depends on the JIT'], answer: 0, explain: 'a is not a compile-time constant (not final), so a + "b" is computed at runtime into a new String object. With final String a, it would be folded and interned → true.' },
    { q: `What do <code>Math.round(-1.5)</code> and <code>Math.round(1.5)</code> return?`, options: ['-1 and 2', '-2 and 2', '-1 and 1', '-2 and 1'], answer: 0, explain: 'Math.round is floor(x + 0.5): −1.5 + 0.5 = −1.0 → −1; 1.5 + 0.5 = 2.0 → 2. It rounds half towards positive infinity.' },
    { q: `You call <code>Greeter.class.getMethod("secret", String.class)</code> on a <b>private</b> method. Result?`, options: ['NoSuchMethodException — getMethod only sees public methods', 'It returns the Method; invoke then fails', 'IllegalAccessException', 'InaccessibleObjectException'], answer: 0, explain: 'getMethod searches public members (including inherited). Use getDeclaredMethod for private ones, then setAccessible(true).' },
    { q: `A custom annotation is declared without <code>@Retention</code>. What does <code>method.getAnnotation(MyAnno.class)</code> return at runtime?`, options: ['null — the default retention is CLASS', 'The annotation proxy', 'It throws AnnotationFormatError', 'Depends on -parameters'], answer: 0, explain: 'Default retention is CLASS: stored in the class file but not visible to reflection. Add @Retention(RetentionPolicy.RUNTIME).' },
    { q: `Jackson must read <b>private</b> fields of DTOs in package <code>com.app.dto</code> of your named module. Which directive?`, options: ['<code>opens com.app.dto to com.fasterxml.jackson.databind;</code>', '<code>exports com.app.dto;</code>', '<code>requires com.fasterxml.jackson.databind;</code> only', '<code>uses com.app.dto;</code>'], answer: 0, explain: 'exports allows compile-time and public access; deep reflection on private members needs opens (qualified to the framework is best).' },
    { q: `What does <code>requires transitive java.logging;</code> inside module java.sql mean for your module that requires java.sql?`, options: ['Your module automatically reads java.logging too', 'java.logging becomes optional', 'java.sql exports java.logging packages as its own', 'Nothing unless you also require java.logging'], answer: 0, explain: 'Implied readability: anyone reading java.sql also reads java.logging, because java.sql\'s API exposes java.util.logging.Logger.' },
    { q: `A hand-written benchmark reports <b>0.3 ns/op</b> for <code>Math.log(i)</code> whose result is never used. Most likely cause?`, options: ['Dead-code elimination by the JIT', 'Math.log is a free CPU instruction', 'The timer resolution is too fine', 'GC was disabled'], answer: 0, explain: 'A side-effect-free call whose result is unused can be removed by C2. JMH prevents this by consuming returned values with a Blackhole.' },
    { q: `In JMH, two benchmarks score 12.7 ± 0.4 ns/op and 12.9 ± 0.5 ns/op. The correct conclusion is…`, options: ['No statistically meaningful difference', 'The second is 1.6% slower', 'The first is faster', 'Rerun without forks'], answer: 0, explain: 'The confidence intervals overlap, so the data does not support a difference. Investigate with more forks/iterations or a profiler before claiming anything.' },
    { q: `<code>var list = new ArrayList&lt;&gt;();</code> — what is the static type of <code>list</code>?`, options: ['ArrayList&lt;Object&gt;', 'List&lt;?&gt;', 'ArrayList (raw type)', 'It does not compile'], answer: 0, explain: 'With var there is no target type for the diamond, so inference falls back to Object: ArrayList&lt;Object&gt;. Write new ArrayList&lt;String&gt;() when using var.' },
    { q: `Which Java 21 feature lets you write <code>list.getLast()</code> and <code>map.firstEntry()</code> on a LinkedHashMap?`, options: ['Sequenced Collections (JEP 431)', 'Record patterns', 'Virtual threads', 'String templates'], answer: 0, explain: 'SequencedCollection / SequencedSet / SequencedMap added getFirst/getLast/addFirst/addLast/removeFirst/removeLast/reversed (and firstEntry/putFirst for maps).' },
    { q: `Which of these is available in standard Java 21 <b>without</b> --enable-preview?`, options: ['Record patterns in switch', 'Unnamed variables <code>_</code>', 'String templates <code>STR."..."</code>', 'Primitive type patterns <code>case int i</code>'], answer: 0, explain: 'Record and switch patterns were finalized in 21. Unnamed variables were final in 22, string templates were previewed and withdrawn, primitive patterns are preview in 23+.' }
  );

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push(
    { level: 'B', q: 'What is a Java record, and when should you NOT use one?', a: `<p>A record (Java 16+) is a <b>transparent, immutable data carrier</b>: you declare components in the header and javac generates private final fields, the canonical constructor, accessors named after the components (${C('x()')}, not ${C('getX()')}), and component-based ${C('equals')}, ${C('hashCode')} and ${C('toString')}. Records are implicitly final, extend ${C('java.lang.Record')}, cannot declare instance fields, but can have static members, methods, compact constructors for validation, and implement interfaces.</p><p><b>Do not use</b> a record when the object needs mutable state or identity (JPA entities need a no-arg constructor, mutable fields and proxies), when you must hide the internal representation (accessors expose every component), or when you need inheritance from another class. Also beware shallow immutability: copy mutable components with ${C('List.copyOf')}.</p>`, followUps: ['How does record serialization differ from normal class serialization?', 'How are equals/hashCode implemented in bytecode? (invokedynamic + ObjectMethods)', 'Can a record have a generic type parameter?'] },
    { level: 'I', q: 'Explain canonical, compact and non-canonical constructors in records.', a: `<p>The <b>canonical</b> constructor has exactly the component list as parameters; javac generates it if you do not. A <b>compact</b> constructor is a canonical constructor written without the parameter list: ${C('Range { if (lo > hi) throw ...; }')}. Its body runs first and the fields are assigned <b>after</b> it, so you can validate and also <b>reassign the parameters</b> to normalize (${C('name = name.strip();')}); writing ${C('this.lo = ...')} inside it is a compile error. Any <b>other</b> constructor must start with ${C('this(...)')}, delegating to the canonical one, which guarantees every instance passes the same validation. Deserialization also goes through the canonical constructor.</p>`, followUps: ['Why does javac forbid assigning this.x in a compact constructor?', 'How would you add a static factory with caching for a record?'] },
    { level: 'I', q: 'What are sealed classes and why were they added?', a: `<p>A sealed class or interface restricts which classes may directly extend/implement it: ${C('sealed interface Shape permits Circle, Square')}. Each permitted subclass must be ${C('final')}, ${C('sealed')} (with its own list) or ${C('non-sealed')} (reopens the branch). Permitted classes live in the same module (or package, on the classpath). The JVM enforces it at class-load time via the PermittedSubclasses attribute.</p><p>Why: to model <b>closed domains</b> (algebraic data types) — a value is exactly one of a known set of kinds. Combined with pattern matching, the compiler can check that a switch handles every kind without a default, and adding a new kind turns every incomplete switch into a compile error. It also lets library authors expose a public interface without letting users implement it.</p>`, followUps: ['When would you choose an enum instead?', 'What happens at runtime if a new subclass appears from a separately compiled jar? (MatchException)', 'Why is a concrete sealed parent a trap for exhaustiveness?'] },
    { level: 'A', q: 'How does pattern matching for switch work in Java 21? Cover exhaustiveness, dominance, guards and null.', a: `<p>Case labels can be type patterns (${C('case String s')}), record patterns (${C('case Point(int x, int y)')}, nestable, with ${C('var')}), optionally guarded with ${C('when')}. Cases are tried top to bottom and the first match wins. <b>Exhaustiveness:</b> pattern switches (statements and expressions) must cover every possible value — via ${C('default')} or by covering all permitted subtypes of a sealed type. <b>Dominance:</b> a case that can never be reached because an earlier unguarded pattern covers it (CharSequence before String, default before patterns) is a compile error. <b>Null:</b> a null selector throws NPE unless there is ${C('case null')} (or ${C('case null, default')}).</p><p>Implementation: javac emits ${C('invokedynamic')} to ${C('SwitchBootstraps.typeSwitch')}, which returns the index of the first type-matching case from a restart index; failed guards restart after that case. A synthetic default throws ${C('MatchException')} if the hierarchy changed after compilation.</p>`, followUps: ['How do record-pattern accessors behave if they throw?', 'Why are primitive patterns not in Java 21?', 'Compare with Kotlin when / Scala match.'] },
    { level: 'B', q: 'Explain the text block rules that matter in practice.', a: `<p>Text blocks (Java 15) start with ${C('"""')} followed by a newline. javac then: normalizes line endings to ${C('\\n')}; removes <b>incidental indentation</b> — the minimum leading whitespace across non-blank lines <b>and the closing delimiter line</b>; strips trailing whitespace per line; and finally interprets escapes. If the closing ${C('"""')} is on its own line the string ends with a newline. Moving the closing delimiter left keeps indentation. New escapes: ${C('\\s')} (a space that survives stripping) and ${C('\\')} at end of line (join lines). There is no interpolation in Java 21 — use ${C('formatted()')}; string templates were previewed and withdrawn. The result is an ordinary interned constant.</p>`, followUps: ['How do you put """ inside a text block?', 'Why must you not use formatted() for SQL with user input?'] },
    { level: 'I', q: 'getMethods vs getDeclaredMethods, and what is InvocationTargetException?', a: `<p>${C('getMethods()')} returns <b>public</b> methods including inherited ones (from superclasses and interfaces); ${C('getDeclaredMethods()')} returns methods declared in <b>that class only</b>, of any access level, excluding inherited ones. Same pattern for fields and constructors. To call a private method you use ${C('getDeclaredMethod')} + ${C('setAccessible(true)')} (allowed only if the package is open to you under JPMS).</p><p>${C('Method.invoke')} wraps any exception thrown <b>by the invoked method</b> in ${C('InvocationTargetException')}; the real exception is ${C('getCause()')}. Logging only the wrapper hides the root cause — a classic production debugging trap. ${C('IllegalAccessException')} instead means the access check failed.</p>`, followUps: ['How expensive is reflection after JDK 18 (JEP 416)?', 'Why might getDeclaredFields return fields in a different order?'] },
    { level: 'A', q: 'How do dynamic proxies work, and why does @Transactional sometimes "not work" in Spring?', a: `<p>${C('Proxy.newProxyInstance(loader, interfaces, handler)')} generates a class at runtime that implements the given interfaces; every call is routed to ${C('InvocationHandler.invoke(proxy, method, args)')}, where you can add behaviour and forward to the real object. JDK proxies only support interfaces; for classes, frameworks generate subclasses with ByteBuddy/CGLIB.</p><p>Spring applies ${C('@Transactional')}, ${C('@Cacheable')}, ${C('@Async')} by wrapping the bean in such a proxy. The annotation is honoured only when the call goes <b>through the proxy</b>. A method calling another annotated method on ${C('this')} (self-invocation) bypasses the proxy, as do private/final methods with subclass proxies — so no transaction starts. Fixes: move the method to another bean, inject the proxy, or use AspectJ weaving.</p>`, followUps: ['What is UndeclaredThrowableException?', 'How does Mockito create mocks for classes?'] },
    { level: 'I', q: 'Explain annotation retention policies and the meta-annotations.', a: `<p>${C('@Retention')}: ${C('SOURCE')} — discarded by javac (e.g. ${C('@Override')}, Lombok annotations); ${C('CLASS')} — written to the class file but not visible via reflection (<b>the default</b>, used by bytecode tools); ${C('RUNTIME')} — readable via reflection (Spring, JUnit, Jackson). ${C('@Target')} limits placement (TYPE, METHOD, FIELD, PARAMETER, TYPE_USE, RECORD_COMPONENT…). ${C('@Inherited')} makes a <b>class</b> annotation visible on subclasses (not interfaces, not methods). ${C('@Repeatable')} allows repeats, stored in a container annotation — so ${C('getAnnotation')} returns null when repeated and you must use ${C('getAnnotationsByType')}. ${C('@Documented')} includes it in Javadoc. Element values must be compile-time constants, never null.</p>`, followUps: ['How do annotations on record components propagate to fields and accessors?', 'What does a RUNTIME annotation instance look like in memory? (a proxy)'] },
    { level: 'A', q: 'How do annotation processors work and what are their limits?', a: `<p>A processor (subclass of ${C('AbstractProcessor')}) runs <b>inside javac</b>. javac calls ${C('process(annotations, roundEnv)')} in rounds: round 1 sees your sources; files generated through the ${C('Filer')} are parsed in the next round and may trigger processors again; processing ends when a round produces nothing new. Processors inspect code through ${C('javax.lang.model')} (Elements, TypeMirrors — not ${C('Class')} objects, since the code is not compiled yet), report errors with source positions via ${C('Messager')}, and generate new source/resource files.</p><p>Limits: the public API cannot modify existing classes (Lombok does so by patching javac internals, which is why it can break on JDK upgrades); processors must be deterministic and incremental-build friendly. Discovery: ${C('-processorpath')} or ${C('META-INF/services')}; since JDK 23 implicit discovery is disabled by default. Examples: Dagger, MapStruct, Micronaut, AutoValue, JPA metamodel generators.</p>`, followUps: ['Compile-time generation vs runtime reflection: trade-offs?', 'How would you test a processor? (compile-testing)'] },
    { level: 'A', q: 'Explain JPMS: exports vs opens, requires transitive/static, and unnamed vs automatic modules.', a: `<p>A module declares ${C('requires')} (dependencies, checked at startup — reliable configuration) and what it exposes. ${C('exports p')}: other modules can compile against and use public types of p. ${C('opens p')}: other modules may use deep reflection (private members) on p at runtime, but not compile against it; ${C('open module')} opens everything. Both can be qualified with ${C('to m')}. ${C('requires transitive m')} gives implied readability to your consumers (needed when your API exposes m's types); ${C('requires static m')} is compile-time only (optional at runtime). ${C('uses')}/${C('provides ... with')} wire ServiceLoader.</p><p>Jars on the classpath form the single <b>unnamed module</b> (reads everything, cannot be required by named modules). A plain jar on the module path becomes an <b>automatic module</b> named from ${C('Automatic-Module-Name')} or its file name; it reads every module and exports every package — a migration bridge. Split packages across modules are forbidden.</p>`, followUps: ['How does jlink use the module graph?', 'Why do most apps still run on the classpath?'] },
    { level: 'E', q: 'After upgrading from Java 8 to 17, the app fails with InaccessibleObjectException. What happened and how do you fix it properly?', a: `<p>Java 9 modularized the JDK and Java 16/17 made <b>strong encapsulation</b> the default (JEP 396/403): the ${C('--illegal-access')} switch is gone, so code (often an old library) that calls ${C('setAccessible(true)')} on JDK internals — e.g. ${C('java.lang.String.value')}, ${C('sun.misc')} internals, ${C('java.util')} private fields — now fails. Proper fix, in order: (1) identify the caller from the stack trace / ${C('jdeps --jdk-internals')}; (2) upgrade the library (most fixed this years ago); (3) replace internal usage with supported APIs (VarHandles, MethodHandles.privateLookupIn on your own classes, ${C('java.util.HexFormat')} etc.); (4) only as a temporary, documented stop-gap add a narrow ${C('--add-opens module/package=ALL-UNNAMED')} for the specific package, tracked as tech debt. Never blanket-open everything.</p>`, followUps: ['What does jdeps --jdk-internals report?', 'How is sun.misc.Unsafe being phased out? (JEP 471/498 memory-access methods)'] },
    { level: 'E', q: 'How do you write a trustworthy microbenchmark in Java?', a: `<p>Use <b>JMH</b>, never a hand-rolled ${C('nanoTime')} loop. Key points: warm-up iterations so the JIT reaches C2 steady state; several <b>forks</b> to avoid profile pollution and to observe variance; inputs held in ${C('@State')} fields (set in ${C('@Setup')}) to defeat constant folding; <b>return</b> results or use ${C('Blackhole.consume')} to defeat dead-code elimination; no loops inside ${C('@Benchmark')}; ${C('@Param')} for realistic sizes; choose the mode that matches the question (throughput, average time, SampleTime for percentiles, SingleShotTime for cold start). Read Score ± Error and treat overlapping intervals as "no difference". Then <b>explain</b> the number with ${C('-prof gc')} (allocation), ${C('-prof perfasm')}/async-profiler, and confirm it matters in an end-to-end test.</p>`, followUps: ['What is OSR and why does it distort main()-based benchmarks?', 'When is SingleShotTime the right mode?'] },
    { level: 'E', q: 'A teammate shows a benchmark: the new code is 2× faster. How do you decide whether to merge it?', a: `<p>First validate the measurement: is it JMH with warm-up, forks, consumed results and realistic inputs? Do the error bars separate? Is the speedup explained by a mechanism (fewer allocations in ${C('-prof gc')}, a removed lock, better locality in perfasm) rather than an artefact (DCE, constant folding, a different data distribution)? Then check relevance: how much of the request latency or CPU does this code account for in production profiles (JFR/async-profiler)? A 2× win on 0.1% of CPU is noise. Consider costs: readability, maintenance, JDK-version sensitivity, behaviour on other hardware. Finally validate end-to-end (load test or canary metrics: p99 latency, throughput, GC). Merge when the improvement is real, relevant and the complexity is justified.</p>`, followUps: ['How would you detect performance regressions in CI?', 'How do containers with CPU limits distort benchmarks?'] },
    { level: 'I', q: 'Why is Integer 127 == 127 true but 128 == 128 false, and how do you prevent bugs from it?', a: `<p>Autoboxing calls ${C('Integer.valueOf')}, which returns cached instances for −128..127 (required by the JLS; the upper bound is configurable with ${C('-XX:AutoBoxCacheMax')}). ${C('==')} on two ${C('Integer')} references compares identity, so cached values look equal and larger values do not. If one operand is a primitive, the other is unboxed and values are compared — another source of confusion (and NPEs if the wrapper is null). Prevention: compare wrappers with ${C('equals')}/${C('Objects.equals')} or unbox explicitly, prefer primitives in hot code, enable static analysis rules (Error Prone ReferenceEquality, Sonar), and be careful with ${C('Map<Long, V>.get(int)')} which boxes to Integer and never matches.</p>`, followUps: ['Which other wrappers cache values?', 'How will Valhalla value classes change == for such types?'] },
    { level: 'A', q: 'Walk through class and object initialization order, including the common pitfalls.', a: `<p>Class initialization (once per class loader, thread-safe): superclass first, then static field initializers and static blocks in <b>textual order</b>. Triggers: ${C('new')}, static method call, non-constant static field access, ${C('Class.forName')}, subclass initialization — but not compile-time constants (inlined), array creation, or ${C('Foo.class')}. Object creation: memory zeroed → constructor → ${C('super(...)')} chain runs first → this class's field initializers and instance blocks in textual order → rest of the constructor body.</p><p>Pitfalls: calling an <b>overridable method from a constructor</b> runs subclass code before subclass fields are initialized (sees 0/null); static forward references via methods read default values; a throwing static initializer gives ${C('ExceptionInInitializerError')} once and ${C('NoClassDefFoundError: Could not initialize class')} forever after; heavy work in static init slows startup and complicates testing.</p>`, followUps: ['Why is the holder-class singleton thread-safe without locks?', 'What is a constant variable per the JLS?'] },
    { level: 'E', q: 'Sealed types + pattern matching vs classic polymorphism vs the Visitor pattern: how do you choose?', a: `<p>This is the <b>expression problem</b>. Classic polymorphism (an abstract method implemented per subclass) makes adding <b>new types</b> cheap (one new class) but adding <b>new operations</b> expensive (touch every class). Sealed hierarchies with exhaustive pattern switches flip it: adding a new <b>operation</b> is one method with a switch, while adding a new <b>type</b> forces updates to every switch — but the compiler lists them all, so it is safe. Visitor achieves compiler-checked operations in older Java at the cost of double-dispatch boilerplate; sealed + switch replaces it.</p><p>Choose sealed + patterns for stable, closed domains where operations multiply (ASTs, protocol messages, events, results, state machines). Choose polymorphism for open extension points (plugins, strategies supplied by users) and when behaviour naturally belongs to the type. Mixed designs are common: sealed data + a few polymorphic methods on the interface.</p>`, followUps: ['How do you evolve a sealed hierarchy in a public library without breaking clients?', 'Where does data-oriented programming fit with records?'] },
    { level: 'I', q: 'What changed with Sequenced Collections in Java 21, and why does it matter?', a: `<p>JEP 431 added interfaces ${C('SequencedCollection')}, ${C('SequencedSet')} and ${C('SequencedMap')} for collections with a defined encounter order: List, Deque, LinkedHashSet, SortedSet, LinkedHashMap, SortedMap. They provide uniform ${C('getFirst/getLast/addFirst/addLast/removeFirst/removeLast')} and ${C('reversed()')} (a live view); maps get ${C('firstEntry/lastEntry/pollFirstEntry/putFirst/putLast/sequencedKeySet')}. Before, "last element" meant ${C('list.get(list.size() - 1)')}, ${C('deque.peekLast()')}, or iterating a whole LinkedHashSet. It makes APIs able to say "I need ordered" in the type system. A caveat: adding default methods to core interfaces caused rare source incompatibilities with existing subclasses that had conflicting ${C('getFirst')}/${C('reversed')} signatures.</p>`, followUps: ['Is reversed() a copy or a view?', 'What happens if you call addFirst on an unmodifiable List.of?'] }
  );
  /* Spread correct answers across positions (authored with the correct option first). */
  function rotate(m, k) {
    var n = m.options.length; k = k % n;
    if (!k) return;
    m.options = m.options.slice(k).concat(m.options.slice(0, k));
    m.answer = (m.answer - k + n) % n;
  }
  quiz.forEach(function (q, i) { rotate(q, i * 3 + 1); });
  var mcqIdx = 0;
  topics.forEach(function (t) { (t.problems || []).forEach(function (p) { rotate(p.mcq, mcqIdx++ * 3 + 2); }); });
  practice.forEach(function (p) { rotate(p.mcq, mcqIdx++ * 3 + 2); });

  registerModule({
    id: 'java14',
    title: 'Modern & Expert Java + Output Question Bank',
    lang: 'java',
    intro: `<p>This is the finishing school of the Java track. First you learn the <b>modern language</b> that Java 17–21 code bases are written in: <b>records</b> for data, <b>sealed</b> hierarchies for closed domains, <b>pattern matching</b> (instanceof, switch expressions, switch and record patterns) to take that data apart safely, <b>text blocks</b> and the small everyday upgrades (var, helpful NPEs, Sequenced Collections). Then you go under the hood of the tools frameworks are built on: <b>reflection</b> and dynamic proxies, <b>annotations</b> and compile-time <b>annotation processors</b>, and the <b>module system</b> (JPMS) that made the JDK strongly encapsulated. You learn to measure performance honestly with <b>JMH</b> instead of fooling yourself with ${C('System.nanoTime')}.</p>
<p>The module ends with a large <b>output-prediction bank</b> — the "what does this print?" questions interviewers love — organised by the hidden rule behind each trick, with a step-through visualizer, 18 worked puzzles, predict-the-output practice problems and a quiz. Every output in this module was verified on JDK 21, and every Java 21 snippet compiles without preview features.</p>`,
    goals: [
      'Model data with records (compact constructors, defensive copies, withers) and closed domains with sealed interfaces, and explain when each is the wrong tool',
      'Write Java 21 pattern-matching switches with record patterns, guards and case null, and reason about exhaustiveness, dominance and MatchException',
      'Use reflection, dynamic proxies and MethodHandles correctly — and explain InvocationTargetException, strong encapsulation and the performance cost',
      'Create runtime annotations read by reflection and a compile-time annotation processor that generates code',
      'Write module-info.java with exports/opens/requires transitive/uses/provides and fix "package is not visible" and InaccessibleObjectException errors',
      'Design a JMH benchmark that avoids warm-up, dead-code elimination, constant folding and noise traps, and read Score ± Error properly',
      'Answer any output-prediction question by working through types → compile-time choices → runtime order → state table'
    ],
    prereqs: `Java modules 1–13 of this track, especially Java 4 (OOP Pillars), Java 5 (Strings, Wrappers, equals/hashCode), Java 8 (Generics), Java 9 (Lambdas &amp; Streams) and Java 13 (JVM Internals — JIT and class loading). A JDK 21 installation (or newer) and jshell for trying the puzzles.`,
    hours: 22,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
