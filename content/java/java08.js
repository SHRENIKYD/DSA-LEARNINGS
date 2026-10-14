(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------------- shared helpers for prose + visualizers ---------------- */
  // C('List<T>') → inline code with < > escaped; P(`...`) → escaped code block for prose.
  function C(s) { return '<code>' + H.esc(s) + '</code>'; }
  function P(s) { return '<pre><code>' + H.esc(String(s).replace(/^\n+/, '').replace(/\s+$/, '')) + '</code></pre>'; }
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function esc(s) { return H.esc(s); }
  function note(label, html) { return { type: 'text', label: label, html: html }; }
  function out(text) {
    return { type: 'text', label: 'Console / compiler output', html: text ? '<code>' + esc(text).replace(/\n/g, '<br>') + '</code>' : '<span class="c-m">(nothing yet)</span>' };
  }
  /* step = { l: line | [lines], cls, v: {vars}, hv, vl, out, extra: [parts], narr } */
  function codeFrames(code, steps, label) {
    return steps.map(function (s) {
      var hl = {};
      [].concat(s.l === undefined ? [] : s.l).forEach(function (n) { hl[n] = s.cls || 'cur'; });
      var parts = [{ type: 'code', label: label || 'Source (highlighted line = what we are looking at)', lang: 'java', code: code, hl: hl }];
      if (s.v) parts.push({ type: 'vars', label: s.vl || 'Variables / heap', vals: s.v, hl: s.hv || {} });
      if (s.out !== undefined) parts.push(out(s.out));
      (s.extra || []).forEach(function (p) { parts.push(p); });
      return { narr: s.narr, parts: parts };
    });
  }
  /* Two code panes side by side: what you wrote vs what javac emits after erasure. */
  function srcVsErased(src, erased, steps) {
    return steps.map(function (s) {
      var h1 = {}, h2 = {};
      [].concat(s.a || []).forEach(function (n) { h1[n] = s.cls || 'cur'; });
      [].concat(s.b || []).forEach(function (n) { h2[n] = s.cls2 || s.cls || 'cur'; });
      var parts = [
        { type: 'code', label: 'What you write (source, compile-time view)', lang: 'java', code: src, hl: h1 },
        { type: 'code', label: 'What runs (after type erasure, roughly what javac emits)', lang: 'java', code: erased, hl: h2 }
      ];
      (s.extra || []).forEach(function (p) { parts.push(p); });
      return { narr: s.narr, parts: parts };
    });
  }

  /* ======================================================================
     TOPIC 1 — Why generics exist + generic classes, interfaces & records
     ====================================================================== */
  topics.push({
    title: 'Why Generics? Generic Classes, Interfaces & Records',
    analogy: `<p>Think of <b>labelled storage jars</b> in a kitchen. Before generics, Java gave you plain unlabeled jars (a raw ${C('List')} that holds "Object"). You could drop sugar, salt or a battery into the same jar, and you only found out it was salt when you tasted your tea — at <b>runtime</b>, in front of the customer. Generics let you write a label on the jar: ${C('Jar<Sugar>')}. Now the kitchen inspector (the <b>compiler</b>) stops anyone putting salt in the sugar jar <b>before</b> the café even opens. The jar itself is the same glass jar either way — the label is a promise checked at build time.</p>`,
    explain: `<p><b>Generics</b> let you write a class or method <b>once</b> and use it with many types, while the compiler still checks every use. The type becomes a <b>parameter</b> — just like a method takes a value parameter, a generic class takes a <b>type parameter</b>.</p>
<h4>1. Life before generics (Java 1.4 and earlier)</h4>
${P(`
List names = new ArrayList();      // holds Object — anything goes
names.add("asha");
names.add(42);                      // compiles fine… a bug waiting
String s = (String) names.get(1);   // ClassCastException at RUNTIME`)}
<p>Two pains: you had to <b>cast</b> on every read, and wrong types were caught <b>late</b> (at runtime, maybe in production).</p>
<h4>2. With generics (Java 5+)</h4>
${P(`
List<String> names = new ArrayList<>();
names.add("asha");
names.add(42);                      // ❌ compile error: int cannot be converted to String
String s = names.get(0);            // ✅ no cast needed`)}
${H.table(['', 'Raw / Object', 'Generic'], [['Type checked when?', H.c('r', 'runtime (cast)'), H.c('g', 'compile time')], ['Casts in your code', 'everywhere', 'none'], ['Bug found by', 'your user', 'the compiler'], ['Speed at runtime', 'same', 'same (the casts still happen, javac inserts them)']])}
<h4>3. Writing your own generic class</h4>
${P(`
class Box<T> {            // T = type parameter (a placeholder name)
    private T value;
    void set(T v) { value = v; }
    T get()       { return value; }
}
Box<String> b = new Box<>();   // String = type argument; <> = "diamond" (Java 7+)`)}
<p><b>Vocabulary</b> (interviewers check this): in ${C('class Box<T>')}, ${C('T')} is the <b>type parameter</b>. In ${C('Box<String>')}, ${C('String')} is the <b>type argument</b> and ${C('Box<String>')} is a <b>parameterized type</b>. ${C('Box')} alone (no angle brackets) is the <b>raw type</b>.</p>
<h4>4. Naming conventions</h4>
${H.table(['Letter', 'Means', 'Seen in'], [['T', 'Type (any)', C('Optional<T>')], ['E', 'Element', C('List<E>')], ['K, V', 'Key, Value', C('Map<K, V>')], ['R', 'Result', C('Function<T, R>')], ['N', 'Number', 'numeric utilities'], ['S, U', '2nd, 3rd type', C('BiFunction<T, U, R>')]])}
<h4>5. Generic interfaces, records and subclasses</h4>
<ul><li>Interfaces: ${C('interface Repository<T, ID> { Optional<T> findById(ID id); }')}</li>
<li>Records (Java 16+): ${C('record Pair<A, B>(A first, B second) {}')}</li>
<li>Implement with a <b>fixed</b> type (${C('class UserRepo implements Repository<User, Long>')}) or <b>stay generic</b> (${C('class MemoryRepo<T, ID> implements Repository<T, ID>')}).</li></ul>
<h4>6. Three rules beginners trip on</h4>
<ol><li><b>No primitives</b> as type arguments: ${C('List<int>')} ❌ → use ${C('List<Integer>')} (autoboxing does the wrapping).</li>
<li><b>No T in static members</b>: ${C('static T cache;')} ❌ — static belongs to the class, but each object can have a different T.</li>
<li><b>Generics are a compile-time feature.</b> At runtime ${C('Box<String>')} and ${C('Box<Integer>')} are the same class ${C('Box')} (this is <b>type erasure</b>, Topic 5).</li></ol>`,
    clues: ['"type-safe container / collection that works for any type"', '"remove the casts" or "ClassCastException in production" in a legacy code review', '"what is the difference between List, List&lt;Object&gt; and List&lt;?&gt;?" (opens with raw vs parameterized)', '"design a generic cache / repository / Result / Pair class"', '"why can\'t I write List&lt;int&gt;?" → type arguments must be reference types', '"diamond operator" / "type argument vs type parameter" vocabulary questions'],
    code: [`
// A tiny generic container + a generic interface + a generic record (all compile on Java 21)
import java.util.*;

interface Repository<T, ID> {                 // generic interface: two type parameters
    void save(ID id, T item);
    Optional<T> findById(ID id);
}

class MemoryRepo<T, ID> implements Repository<T, ID> {   // stays generic
    private final Map<ID, T> store = new HashMap<>();     // diamond: javac infers <ID, T>
    public void save(ID id, T item) { store.put(id, item); }
    public Optional<T> findById(ID id) { return Optional.ofNullable(store.get(id)); }
}

record Pair<A, B>(A first, B second) {        // generic record
    Pair<B, A> swap() { return new Pair<>(second, first); }
}

public class GenericsIntro {
    public static void main(String[] args) {
        Repository<String, Integer> users = new MemoryRepo<>();
        users.save(1, "asha");
        users.save(2, "ben");
        String name = users.findById(2).orElse("?");  // no cast anywhere
        System.out.println(name);                      // ben

        Pair<String, Integer> p = new Pair<>("age", 30);
        Pair<Integer, String> q = p.swap();
        System.out.println(q);                         // Pair[first=30, second=age]
    }
}`, `
// Same container written the pre-Java-5 way: compiles, but the bug only shows at runtime
import java.util.*;

public class BeforeGenerics {
    public static void main(String[] args) {
        List names = new ArrayList();        // raw type: element type is Object
        names.add("asha");
        names.add(42);                       // compiler only WARNS (unchecked)
        try {
            for (Object o : names) {
                String s = (String) o;       // manual cast on every read
                System.out.println(s.toUpperCase());
            }
        } catch (ClassCastException e) {
            System.out.println("Boom at runtime: " + e.getMessage());
        }
    }
}`],
    codeTitle: ['Generic interface, class and record', 'The raw, pre-generics way (for contrast)'],
    viz: [{
      title: 'Raw list vs List<String>: when is the bug caught?',
      input: '"apple", 42, "kiwi"',
      inputLabel: 'Items to add (quoted text = String, plain number = Integer, 1.5 = Double)',
      gen: function (input) {
        var raw = String(input || '').trim();
        if (!raw) throw new Error('Enter items like: "apple", 42, "kiwi"');
        var toks = raw.match(/"[^"]*"|-?\d+\.\d+|-?\d+/g);
        var leftover = raw.replace(/"[^"]*"|-?\d+\.\d+|-?\d+/g, '').replace(/[\s,]/g, '');
        if (!toks || leftover.length) throw new Error('Use quoted words and numbers separated by commas, e.g. "apple", 42, "kiwi"');
        if (toks.length > 7) throw new Error('Use at most 7 items');
        var items = toks.map(function (t) {
          if (t.charAt(0) === '"') return { src: t, type: 'String', val: t.slice(1, -1) };
          if (t.indexOf('.') >= 0) return { src: t, type: 'Double', val: t };
          return { src: t, type: 'Integer', val: t };
        });
        var rawCode = 'List names = new ArrayList();   // raw: holds Object\n' +
          items.map(function (it) { return 'names.add(' + it.src + ');'; }).join('\n') +
          '\nfor (Object o : names) {\n    String s = (String) o;       // manual cast\n    System.out.println(s.toUpperCase());\n}';
        var n = items.length, castLine = n + 3, printLine = n + 4, loopLine = n + 2;
        var steps = [{ l: 1, v: { names: '[]' }, out: '', narr: 'A <b>raw</b> list. Its element type is just <code>Object</code>, so the compiler has nothing to check against.' }];
        var heap = [];
        items.forEach(function (it, i) {
          heap.push(it.src + ' (' + it.type + ')');
          steps.push({ l: i + 2, cls: it.type === 'String' ? 'ok' : 'cur', v: { names: '[' + heap.join(', ') + ']' }, hv: { names: it.type === 'String' ? 'ok' : 'bad' }, out: '',
            narr: 'Add <code>' + esc(it.src) + '</code> (a ' + it.type + '). ' + (it.type === 'String' ? 'Fine.' : '<span class="c-y">The compiler accepts it anyway</span> — an Integer IS an Object. Only an "unchecked" warning, which people ignore.') });
        });
        var printed = '', crashed = false;
        for (var i = 0; i < n; i++) {
          var it = items[i];
          steps.push({ l: loopLine, v: { o: it.src + ' (' + it.type + ')' }, out: printed, narr: 'Loop picks element ' + i + ': <code>' + esc(it.src) + '</code>.' });
          if (it.type !== 'String') {
            steps.push({ l: castLine, cls: 'bad', v: { o: it.src + ' (' + it.type + ')' }, hv: { o: 'bad' }, out: printed + 'Exception in thread "main" java.lang.ClassCastException: class java.lang.' + it.type + ' cannot be cast to class java.lang.String',
              narr: '<span class="c-r">ClassCastException at runtime!</span> The cast <code>(String) o</code> fails. The bug was written on line ' + (i + 2) + ' but explodes here, later — in production this could be hours later and in another file.' });
            crashed = true; break;
          }
          printed += it.val.toUpperCase() + '\n';
          steps.push({ l: [castLine, printLine], cls: 'ok', v: { o: it.src + ' (String)', s: '"' + it.val + '"' }, out: printed, narr: 'Cast succeeds, print <b>' + esc(it.val.toUpperCase()) + '</b>.' });
        }
        if (!crashed) steps.push({ l: printLine + 1, cls: 'ok', v: { names: '[' + heap.join(', ') + ']' }, out: printed, narr: 'All items were Strings, so the raw version happened to work. It was <b>luck</b>, not safety — nothing stopped a wrong type.' });
        var frames = codeFrames(rawCode, steps, 'Pre-generics code (raw List)');
        var genCode = 'List<String> names = new ArrayList<>();\n' +
          items.map(function (it) { return 'names.add(' + it.src + ');'; }).join('\n') +
          '\nfor (String s : names) {          // no cast\n    System.out.println(s.toUpperCase());\n}';
        var errs = [], g = [{ l: 1, cls: 'ok', v: { 'element type': 'String' }, hv: { 'element type': 'ok' }, out: '', narr: 'Now the same code with a <b>label on the jar</b>: <code>List&lt;String&gt;</code>. The diamond <code>&lt;&gt;</code> lets javac copy <code>String</code> into the right side.' }];
        items.forEach(function (it, i) {
          if (it.type !== 'String') errs.push('Main.java:' + (i + 2) + ': error: incompatible types: ' + (it.type === 'Integer' ? 'int' : 'double') + ' cannot be converted to String');
          g.push({ l: i + 2, cls: it.type === 'String' ? 'ok' : 'bad', v: { 'element type': 'String', 'argument type': it.type }, hv: { 'argument type': it.type === 'String' ? 'ok' : 'bad' }, out: errs.join('\n'),
            narr: it.type === 'String' ? '<code>add(String)</code> gets a String — accepted.' : '<span class="c-r">Compile error.</span> <code>add</code> now takes a <code>String</code>, so <code>' + esc(it.src) + '</code> is rejected <b>before the program can even run</b>.' });
        });
        g.push({ l: [n + 2, n + 3], cls: errs.length ? 'done' : 'ok', v: { 'compile errors': errs.length }, hv: { 'compile errors': errs.length ? 'bad' : 'ok' }, out: errs.length ? errs.join('\n') + '\n' + errs.length + ' error(s) — fix them, then run' : 'Compiles cleanly. No cast needed in the loop.',
          narr: errs.length ? 'Summary: the <b>same mistake</b> moved from a runtime crash to a compile error you see in your editor. That is the whole point of generics.' : 'Every item was a String, so it compiles and runs. Try adding <code>42</code> to the input to see the compiler catch it.' });
        return frames.concat(codeFrames(genCode, g, 'Generic code (List&lt;String&gt;)'));
      }
    }, {
      title: 'Plug a type argument into Box<T>',
      input: 'String',
      inputLabel: 'Type argument for T (e.g. String, Integer, LocalDate, List<String>, or try int)',
      gen: function (input) {
        var t = String(input || '').trim();
        var prim = { int: 'Integer', long: 'Long', double: 'Double', boolean: 'Boolean', char: 'Character', float: 'Float', short: 'Short', byte: 'Byte' };
        if (!/^[A-Za-z_][A-Za-z0-9_]*(<[A-Za-z0-9_<>, ?]+>)?(\[\])?$/.test(t) || t.length > 40) throw new Error('Enter a type name like String, Integer or List<String>');
        var frames = [];
        var tmpl = 'class Box<T> {\n    private T value;\n    void set(T v) { value = v; }\n    T get() { return value; }\n}';
        frames.push({ narr: 'The <b>template</b>. <code>T</code> is a placeholder (type parameter). Nothing is decided yet; this class works for any reference type.', parts: [{ type: 'code', label: 'Generic class', lang: 'java', code: tmpl, hl: { 1: 'cur', 2: 'cur', 3: 'cur', 4: 'cur' } }] });
        if (prim[t]) {
          frames.push({ narr: '<span class="c-r"><code>Box&lt;' + t + '&gt;</code> does not compile</span>: type arguments must be <b>reference types</b> (objects). Java uses the wrapper <code>' + prim[t] + '</code> instead, and autoboxing converts <code>' + t + '</code> values for you.', parts: [{ type: 'code', label: 'Your declaration', lang: 'java', code: 'Box<' + t + '> b = new Box<>();   // error: unexpected type, required: reference, found: ' + t, hl: { 1: 'bad' } }, out('error: unexpected type\n  required: reference\n  found:    ' + t)] });
          t = prim[t];
        }
        var sub = tmpl.replace('class Box<T>', 'class Box<' + t + '>   // compile-time view').replace(/\bT\b/g, t);
        frames.push({ narr: 'You write <code>Box&lt;' + esc(t) + '&gt; b = new Box&lt;&gt;();</code>. The diamond <code>&lt;&gt;</code> means "javac, copy the type argument from the left".', parts: [{ type: 'code', label: 'Declaration', lang: 'java', code: 'Box<' + t + '> b = new Box<>();', hl: { 1: 'ok' } }, { type: 'vars', label: 'Type checker sees', vals: { T: t }, hl: { T: 'ok' } }] });
        frames.push({ narr: 'For <b>type checking</b>, the compiler pretends every <code>T</code> is now <code>' + esc(t) + '</code>. Think "find and replace" — but only in the compiler\'s head.', parts: [{ type: 'code', label: 'How the compiler checks your uses', lang: 'java', code: sub, hl: { 2: 'ok', 3: 'ok', 4: 'ok' } }] });
        frames.push({ narr: '<code>b.set(x)</code> is only allowed if <code>x</code> is a <code>' + esc(t) + '</code> (or a subtype). Passing anything else is a <b>compile error</b>.', parts: [{ type: 'code', label: 'Using it', lang: 'java', code: 'b.set(someValue);   // must be a ' + t + '\nb.set(new Object()); // error: Object cannot be converted to ' + t, hl: { 1: 'ok', 2: 'bad' } }] });
        frames.push({ narr: '<code>b.get()</code> returns <code>' + esc(t) + '</code>, so you assign it with <b>no cast</b>.', parts: [{ type: 'code', label: 'Reading', lang: 'java', code: t + ' v = b.get();   // no cast in YOUR code', hl: { 1: 'ok' } }] });
        frames.push({ narr: 'Plot twist (preview of Topic 5): after compiling, the class file has <b>no</b> <code>' + esc(t) + '</code> in it. <code>T</code> is <b>erased</b> to <code>Object</code>, and javac quietly inserts the cast at your call site.', parts: [
          { type: 'code', label: 'After erasure (one class for ALL type arguments)', lang: 'java', code: 'class Box {\n    private Object value;\n    void set(Object v) { value = v; }\n    Object get() { return value; }\n}', hl: { 2: 'sel', 3: 'sel', 4: 'sel' } },
          { type: 'code', label: 'Your call site after erasure', lang: 'java', code: t.replace(/<.*>/, '') + ' v = (' + t.replace(/<.*>/, '') + ') b.get();   // cast added by javac (checkcast)', hl: { 1: 'sel' } }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Generic record + swap: types flow through', html: `<p>A record can be generic. ${C('swap()')} returns ${C('Pair<B, A>')} — the compiler tracks that the types flipped, so the caller needs no casts.</p>
${H.table(['Expression', 'Static type'], [[C('new Pair<>("x", 1)'), C('Pair<String, Integer>')], [C('p.swap()'), C('Pair<Integer, String>')], [C('p.swap().first()'), C('Integer')]])}`, code: `
record Pair<A, B>(A first, B second) {
    Pair<B, A> swap() { return new Pair<>(second, first); }
}
class PairDemo {
    public static void main(String[] args) {
        Pair<String, Integer> p = new Pair<>("x", 1);
        Integer n = p.swap().first();     // no cast: compiler knows it is Integer
        System.out.println(n + 1);        // 2
    }
}` },
      { title: 'Does this compile? Static fields cannot use T', html: `${P(`
class Cache<T> {
    static T last;                    // ❌ error: non-static type variable T cannot be referenced from a static context
    static <U> U echo(U u) { return u; }   // ✅ a static GENERIC METHOD declares its own type parameter
}`)}<p><b>Why:</b> there is only <b>one</b> copy of a static field, shared by ${C('Cache<String>')} and ${C('Cache<Integer>')}. Which T would it be? Static methods that need a type parameter declare their <b>own</b> (Topic 2).</p>`, code: `
class Cache<T> {
    private T last;                                   // instance field: fine
    static <U> U echo(U u) { return u; }              // static generic method: fine
    void put(T t) { last = t; }
    T last() { return last; }
}` },
      { title: 'Two ways to implement a generic interface', html: `<p>Pick a concrete type when the class only makes sense for one type; stay generic when it is reusable.</p>
${H.table(['Declaration', 'What it means'], [[C('class Celsius implements Comparable<Celsius>'), 'fixed: compareTo takes a Celsius'], [C('class Sorted<T extends Comparable<T>> implements Iterable<T>'), 'generic: works for any comparable T'], [C('class Bad implements Comparable'), H.c('r', 'raw: compareTo(Object) — needs casts, avoid')]])}`, code: `
class Celsius implements Comparable<Celsius> {
    final double deg;
    Celsius(double deg) { this.deg = deg; }
    @Override public int compareTo(Celsius o) { return Double.compare(deg, o.deg); } // typed parameter
}` },
      { title: 'Predict the output: the diamond is not "Object"', html: `<p>A frequent beginner guess is that ${C('new ArrayList<>()')} creates a list of Object. It does not — the diamond <b>infers</b> the type argument from the target. Both lines below create exactly the same thing.</p>`, code: `
List<String> a = new ArrayList<String>();   // explicit (pre-Java 7 style)
List<String> b = new ArrayList<>();         // diamond: javac infers <String>
b.add("hi");
System.out.println(b.get(0).length());     // 2 — get() is typed String, so .length() compiles` }
    ],
    deepDive: `<p><b>History.</b> Generics arrived in Java 5 (2004) via JSR 14, designed by Gilad Bracha, Martin Odersky, Neal Gafter and others. The hard requirement was <b>migration compatibility</b>: old compiled libraries and new generic code had to run together on the same JVM. That single requirement explains erasure, raw types and almost every "weird" rule in this module.</p>
<p><b>Cost model.</b> Generic code runs at the same speed as hand-written Object code: one class file, and javac inserts ${C('checkcast')} instructions where you read a T. The JIT frequently removes those casts once it proves the type. The real cost is <b>boxing</b>: ${C('List<Integer>')} stores pointers to Integer objects (16 bytes each on a typical 64-bit JVM with compressed oops) instead of 4-byte ints, plus poor cache locality. Hot numeric code uses ${C('int[]')}, ${C('IntStream')}, or primitive collections (Eclipse Collections, fastutil).</p>
<p><b>Project Valhalla.</b> The OpenJDK project is working on value classes and, later, generics over primitives/value types (so a ${C('List<int>')}-like type could store flat data). Value classes have been available as preview builds, but as of standard Java 21/25 you still cannot write ${C('List<int>')} — know the direction, do not claim it is shipped.</p>
<p><b>Generic records and sealed types</b> combine well: ${C('sealed interface Result<T> permits Ok, Err')} with ${C('record Ok<T>(T value) implements Result<T>')} gives you a typed success/failure value, and Java 21 record patterns can deconstruct it in a ${C('switch')}.</p>
<p><b>Diamond details.</b> Java 7 added ${C('<>')}; Java 9 allowed it with anonymous classes when the inferred type is denotable. ${C('var list = new ArrayList<>();')} infers ${C('ArrayList<Object>')} — legal but usually a mistake, because there is no target type to infer from.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants generate generic containers, repositories and DTOs in seconds, and IDEs flag raw types with a quick-fix. Writing ${C('class Box<T>')} is no longer the skill.</p>
<p><b>Use AI as a partner:</b> paste a legacy class full of ${C('(String) list.get(i)')} casts and ask <code>"Generify this class; list every place where the types are ambiguous and ask me before choosing"</code>. Ask for a table of "type parameter vs type argument vs raw type" for your own code to check your vocabulary.</p>
<p><b>Where AI goes wrong:</b> it happily writes ${C('var x = new ArrayList<>()')} (silently ${C('ArrayList<Object>')}), suggests ${C('List<int>')} in pseudo-Java, adds ${C('@SuppressWarnings("unchecked")')} to whole classes to make warnings disappear, or invents a static field of type T.</p>
<p><b>What you must still own:</b> deciding <b>what</b> should be a type parameter (too many parameters make APIs unreadable), explaining compile-time vs runtime checking, and spotting raw types in code review — warnings are the only alarm bell, and AI-generated diffs often hide them.</p>`,
    problems: [{
      title: 'Build a Type-Safe Generic Stack&lt;E&gt;',
      level: 'Easy', tags: ['generic class', 'stack', 'type safety'], companies: ['Amazon', 'Infosys', 'Wipro'],
      statement: `<p>Write a generic class ${C('Stack<E>')} backed by an ${C('ArrayList<E>')} with ${C('push(E)')}, ${C('E pop()')}, ${C('E peek()')}, ${C('boolean isEmpty()')} and ${C('int size()')}. ${C('pop')}/${C('peek')} on an empty stack must throw ${C('NoSuchElementException')}. Using it with Strings must need <b>no casts</b>, and pushing an Integer into a ${C('Stack<String>')} must be a <b>compile error</b>.</p>`,
      constraints: `Up to 10<sup>6</sup> operations; each operation O(1) amortized.`,
      example: `<p>${C('push("a"), push("b"), peek(), pop(), pop(), isEmpty()')} → ${H.c('g', '"b", "b", "a", true')}. Then ${C('pop()')} → ${H.c('r', 'NoSuchElementException')}. <code>s.push(5)</code> on a ${C('Stack<String>')} → ${H.c('r', 'compile error')}.</p>`,
      brute: { why: `<p>The pre-generics version stores ${C('Object')}. It "works", but every caller must cast (${C('(String) s.pop()')}) and nothing stops someone pushing an Integer — the error only shows up later as a ClassCastException far away from the real bug.</p>`, code: `
class ObjectStack {
    private final java.util.ArrayList<Object> items = new java.util.ArrayList<>();
    void push(Object o) { items.add(o); }
    Object pop() { return items.remove(items.size() - 1); }   // caller must cast
    public static void main(String[] args) {
        ObjectStack s = new ObjectStack();
        s.push("a");
        s.push(5);                         // accepted silently
        String top = (String) s.pop();     // ClassCastException at runtime
        System.out.println(top);
    }
}` },
      mcq: { q: 'Where should the element type of the stack be declared so that push and pop both use it?', options: ['As a type parameter on the class: <code>class Stack&lt;E&gt;</code>', 'As a type parameter on each method: <code>&lt;E&gt; void push(E e)</code>', 'As <code>Object</code> with casts', 'As a static field of type E'], answer: 0, explain: 'A class-level type parameter ties all instance methods to the SAME E. Separate method-level parameters would be unrelated: push could take a String and pop return an Integer.' },
      hints: [`<p>Hint 1: the stack only needs one type — the element type. Put it on the class: ${C('class Stack<E>')}, and use E in every method signature.</p>`, `<p>Hint 2: an ${C('ArrayList<E>')} already gives O(1) amortized add/remove at the end. The top of the stack is the last index.</p>`, `<p>Hint 3: edge case — empty stack. Check ${C('isEmpty()')} and throw ${C('NoSuchElementException')} with a clear message. Recipe: push → add at end; pop → check, then remove(size − 1); peek → check, then get(size − 1).</p>`],
      solution: {
        approach: `<p>Declare ${C('E')} once on the class; every method shares it. The compiler substitutes ${C('String')} for ${C('E')} when checking a ${C('Stack<String>')}, so wrong pushes fail to compile and pops need no cast.</p>`,
        code: `
import java.util.*;

class Stack<E> {
    private final ArrayList<E> items = new ArrayList<>();

    void push(E e) { items.add(e); }                       // O(1) amortized

    E pop() {
        if (items.isEmpty()) throw new NoSuchElementException("stack is empty");
        return items.remove(items.size() - 1);             // remove last = top
    }

    E peek() {
        if (items.isEmpty()) throw new NoSuchElementException("stack is empty");
        return items.get(items.size() - 1);
    }

    boolean isEmpty() { return items.isEmpty(); }
    int size() { return items.size(); }

    public static void main(String[] args) {
        Stack<String> s = new Stack<>();
        s.push("a");
        s.push("b");
        // s.push(5);                    // does not compile: int cannot be converted to String
        System.out.println(s.peek());    // b
        System.out.println(s.pop());     // b
        System.out.println(s.pop());     // a
        System.out.println(s.isEmpty()); // true
        Stack<Integer> nums = new Stack<>();
        nums.push(7);                    // autoboxing int → Integer
        int top = nums.pop();            // auto-unboxing Integer → int
        System.out.println(top + 1);     // 8
    }
}`,
        dry: { head: ['operation', 'items (bottom → top)', 'returns'], rows: [['push("a")', '[a]', '—'], ['push("b")', '[a, b]', '—'], ['peek()', '[a, b]', '"b"'], ['pop()', '[a]', '"b"'], ['pop()', '[]', '"a"'], ['pop()', '[]', H.c('r', 'NoSuchElementException')]] },
        complexity: `<p>push/pop/peek O(1) amortized (ArrayList grows by 1.5× occasionally), space O(n). Generics add zero runtime cost: erasure turns E into Object and inserts a cast at the caller.</p>`,
        followUps: ['Make the stack iterable from top to bottom by implementing <code>Iterable&lt;E&gt;</code>.', 'Why is <code>java.util.Stack</code> discouraged? (synchronized Vector subclass — use <code>ArrayDeque</code>)', 'Add <code>pushAll(Iterable&lt;? extends E&gt;)</code> — why the wildcard? (Topic 4)']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — Generic methods & type inference
     ====================================================================== */
  topics.push({
    title: 'Generic Methods & Type Inference',
    analogy: `<p>A <b>generic class</b> is like a labelled jar you buy once and keep. A <b>generic method</b> is like a <b>vending machine slot that adapts to each coin</b>: every time you call it, it looks at what you put in and decides the type <i>for that one call</i>. ${C('pick("a", "b")')} works with Strings now and ${C('pick(1, 2)')} with Integers a second later — the same method, no jar needed. The machine works out the type itself (<b>type inference</b>), but you can also tell it explicitly, like pressing a button instead of letting it guess (<b>type witness</b>).</p>`,
    explain: `<p>A <b>generic method</b> declares its own type parameters, written in angle brackets <b>before the return type</b>. It can live in any class, generic or not, and can be static.</p>
${P(`
//      ┌ type parameter list   ┌ return type uses T
static <T> T firstOrDefault(List<T> list, T fallback) {
    return list.isEmpty() ? fallback : list.get(0);
}`)}
<h4>1. Calling it — inference does the work</h4>
${P(`
String s = firstOrDefault(List.of("x", "y"), "none");   // T inferred = String
Integer n = firstOrDefault(List.of(), 0);               // T inferred = Integer`)}
<p>javac looks at the <b>arguments</b> (and, since Java 8, the <b>target type</b> on the left of ${C('=')}) and picks a T that makes everything fit. You almost never write the type yourself.</p>
<h4>2. Explicit type witness (when inference needs help)</h4>
${P(`
List<String> empty = Collections.<String>emptyList();   // witness goes after the dot
Util.<Number>pick(1, 2.5);                              // force T = Number
// <String>emptyList();   ❌ a bare witness needs a qualifier: this.<T>m() or ClassName.<T>m()`)}
<h4>3. Mixed arguments → the "common supertype"</h4>
<p>${C('pick("x", 1)')} with ${C('<T> T pick(T a, T b)')} still compiles! T becomes the <b>least upper bound</b> of String and Integer — an <b>intersection type</b> like ${C('Object & Serializable & Comparable<…> & Constable & ConstantDesc')}. You cannot write that type, but ${C('var')} can hold it. Generics do not stop "mixed" calls; they only stop calls where <b>no</b> type fits.</p>
${H.table(['Call', 'Inferred T'], [[C('pick("a", "b")'), 'String'], [C('pick(1, 2)'), 'Integer (boxed)'], [C('pick(1, 2.5)'), 'Number &amp; Comparable&lt;…&gt; &amp; …'], [C('List<Number> l = Arrays.asList(1, 2.5)'), H.c('g', 'Number (target typing wins)')], [C('Util.<String>pick("a", 1)'), H.c('r', 'compile error — 1 is not a String')]])}
<h4>4. Generic methods inside generic classes</h4>
${P(`
class Box<T> {
    T value;
    <R> Box<R> map(Function<T, R> f) {      // R is NEW, local to this method
        Box<R> out = new Box<>(); out.value = f.apply(value); return out;
    }
}`)}
<p>${C('T')} comes from the object; ${C('R')} is decided per call. <b>Trap:</b> writing ${C('<T> void put(T t)')} inside ${C('class Box<T>')} declares a <b>second, unrelated T</b> that hides the class's T — a bug the compiler only warns about in some IDEs.</p>
<h4>5. Where inference gives up</h4>
<p>Inference flows <b>into</b> a call from its target, but not backwards through a chained call. ${C('Comparator.comparing(p -> p.name()).reversed()')} fails: when javac types ${C('comparing(...)')} it has no target (the target belongs to ${C('reversed()')}), so ${C('p')} becomes ${C('Object')} and ${C('p.name()')} does not exist. Fix with a method reference ${C('Person::name')} or a typed lambda ${C('(Person p) -> p.name()')}.</p>`,
    clues: ['"write a utility that works for any type" in a static helper class → static generic method', '"swap / reverse / find max in an array of any type"', 'a compile error mentioning "inference variable T has incompatible bounds/equality constraints"', '"Collections.emptyList() returns List&lt;Object&gt; in my ternary" → needs a type witness or target type', '"comparing(...).reversed() does not compile" → inference does not flow through method chains', 'the type appears in BOTH a parameter and the return type → type parameter, not wildcard'],
    code: [`
import java.util.*;
import java.util.function.*;

final class Util {
    private Util() {}

    // T is decided per call
    static <T> T firstOrDefault(List<T> list, T fallback) {
        return list.isEmpty() ? fallback : list.get(0);
    }

    // Two type parameters: the result type R can differ from the input type T
    static <T, R> List<R> mapAll(List<T> in, Function<T, R> f) {
        List<R> out = new ArrayList<>(in.size());
        for (T t : in) out.add(f.apply(t));
        return out;
    }

    // Generic method on arrays: works for any reference type (not int[]!)
    static <T> void swap(T[] a, int i, int j) {
        T tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }

    static <T> T pick(T a, T b) { return b; }

    public static void main(String[] args) {
        System.out.println(firstOrDefault(List.of("x", "y"), "none"));   // x
        System.out.println(firstOrDefault(List.<Integer>of(), -1));       // -1
        System.out.println(mapAll(List.of("hi", "hello"), String::length)); // [2, 5]

        String[] names = {"a", "b", "c"};
        swap(names, 0, 2);
        System.out.println(Arrays.toString(names));                      // [c, b, a]

        var mixed = pick("x", 1);           // T = intersection of String & Integer supertypes
        System.out.println(mixed.getClass().getSimpleName());           // Integer
        List<String> empty = Collections.<String>emptyList();           // explicit type witness
        System.out.println(empty.size());                               // 0
    }
}`],
    codeTitle: ['Static generic methods, multiple type parameters and a type witness'],
    viz: {
      title: 'Watch javac infer T for Arrays.asList(...)',
      input: '1, 2.5, 7',
      inputLabel: 'Arguments (quoted text = String, 5 = Integer, 5L = Long, 2.5 = Double, null)',
      gen: function (input) {
        var raw = String(input || '').trim();
        if (!raw) throw new Error('Enter arguments like: 1, 2.5, "a"');
        var re = /"[^"]*"|-?\d+\.\d+|-?\d+L|-?\d+|null/g;
        var toks = raw.match(re);
        if (!toks || raw.replace(re, '').replace(/[\s,]/g, '').length) throw new Error('Use values like 1, 5L, 2.5, "text" or null separated by commas');
        if (toks.length > 6) throw new Error('Use at most 6 arguments');
        var args = toks.map(function (t) {
          if (t === 'null') return { src: t, type: 'null', note: 'null fits ANY reference type, so it adds no constraint' };
          if (t.charAt(0) === '"') return { src: t, type: 'String', note: 'a String literal' };
          if (/L$/.test(t)) return { src: t, type: 'Long', note: 'a long literal, boxed to Long' };
          if (t.indexOf('.') >= 0) return { src: t, type: 'Double', note: 'a double literal, boxed to Double' };
          return { src: t, type: 'Integer', note: 'an int literal, boxed to Integer (generics need objects)' };
        });
        var NUM = { Integer: 1, Long: 1, Double: 1 };
        var types = []; args.forEach(function (a) { if (a.type !== 'null' && types.indexOf(a.type) < 0) types.push(a.type); });
        var lub, lubNote;
        if (!types.length) { lub = 'Object'; lubNote = 'Only nulls: nothing constrains T, so javac falls back to its bound, Object.'; }
        else if (types.length === 1) { lub = types[0]; lubNote = 'Every argument is a ' + types[0] + ', so T = ' + types[0] + '. Easy case.'; }
        else if (types.every(function (t) { return NUM[t]; })) { lub = 'Number & Comparable<…> & Constable & ConstantDesc'; lubNote = 'Different number types. Their closest shared supertypes are Number plus the interfaces they all implement, so T is an <b>intersection type</b>.'; }
        else { lub = 'Object & Serializable & Comparable<…> & Constable & ConstantDesc'; lubNote = 'A String mixed with numbers: the only shared supertypes are Object and a few interfaces (Serializable, Comparable, and the Java 12+ constant interfaces).'; }
        var code = 'public static <T> List<T> asList(T... a)   // in java.util.Arrays\n\nvar list = Arrays.asList(' + toks.join(', ') + ');';
        var frames = [];
        frames.push({ narr: 'The method declares <code>&lt;T&gt;</code>. Each call gets its own T. javac must find a T so that <b>every argument is a T</b>.', parts: [{ type: 'code', label: 'Signature and call', lang: 'java', code: code, hl: { 1: 'cur', 3: 'cur' } }, { type: 'vars', label: 'Inference state', vals: { T: '?' } }] });
        var cons = [];
        args.forEach(function (a, i) {
          if (a.type !== 'null') cons.push(a.type + ' <: T');
          frames.push({ narr: 'Argument ' + (i + 1) + ': <code>' + esc(a.src) + '</code> is ' + a.note + '. ' + (a.type === 'null' ? '' : 'Constraint added: <b>' + a.type + ' must be a subtype of T</b>.'), parts: [
            { type: 'code', label: 'Signature and call', lang: 'java', code: code, hl: { 3: 'cur' } },
            { type: 'table', label: 'Constraints collected so far', columns: ['#', 'argument', 'type', 'constraint'], rows: args.slice(0, i + 1).map(function (x, k) { return [k + 1, x.src, x.type, x.type === 'null' ? '(none)' : x.type + ' <: T']; }), hl: one(i, 'cur') }] });
        });
        frames.push({ narr: lubNote + ' javac picks the <b>least upper bound</b> (lub): the most specific type that is a supertype of all of them.', parts: [
          { type: 'vars', label: 'Inference result (no target type, because of var)', vals: { T: lub, 'list type': 'List<' + lub + '>' }, hl: { T: 'sel' } },
          { type: 'graph', label: 'Supertypes shared by the argument types', directed: true, height: 50, nodes: [{ id: 'O', label: 'Object', x: 50, y: 6, shape: 'box' }, { id: 'N', label: 'Number', x: 25, y: 24, shape: 'box' }, { id: 'C', label: 'Comparable', x: 75, y: 24, shape: 'box' }, { id: 'I', label: 'Integer', x: 12, y: 44, shape: 'box' }, { id: 'D', label: 'Double', x: 38, y: 44, shape: 'box' }, { id: 'S', label: 'String', x: 75, y: 44, shape: 'box' }],
            edges: [['I', 'N'], ['D', 'N'], ['N', 'O'], ['I', 'C'], ['D', 'C'], ['S', 'C'], ['S', 'O']], hl: (function () { var h = {}; if (types.indexOf('Integer') >= 0) h.I = 'cur'; if (types.indexOf('Double') >= 0) h.D = 'cur'; if (types.indexOf('String') >= 0) h.S = 'cur'; if (/^Number/.test(lub)) h.N = 'sel'; if (/^Object/.test(lub)) h.O = 'sel'; if (types.length > 1) h.C = 'sel'; if (types.length === 1 && h[types[0].charAt(0)]) h[types[0].charAt(0)] = 'sel'; return h; })() }] });
        var targets = ['String', 'Integer', 'Number', 'CharSequence', 'Object'];
        function fits(t, target) {
          if (t === 'null' || target === 'Object' || t === target) return true;
          if (target === 'Number') return !!NUM[t];
          if (target === 'CharSequence') return t === 'String';
          return false;
        }
        var rows = [];
        targets.forEach(function (tg, i) {
          var ok = args.every(function (a) { return fits(a.type, tg); });
          rows.push(['List<' + tg + '> list = Arrays.asList(...)', ok ? 'compiles, T = ' + tg : 'error: incompatible types']);
          frames.push({ narr: 'Now give the call a <b>target type</b> <code>List&lt;' + tg + '&gt;</code>. Since Java 8, javac uses the target too: T = ' + tg + ' works only if every argument is a ' + tg + '. ' + (ok ? '<span class="c-g">Yes → compiles.</span>' : '<span class="c-r">No → compile error.</span>') + ' (Generics are <b>invariant</b>, so a <code>List&lt;Integer&gt;</code> result could never be assigned to <code>List&lt;Number&gt;</code> afterwards — inference picking T = Number directly is what saves you.)',
            parts: [{ type: 'table', label: 'Target typing', columns: ['declaration', 'result'], rows: rows.slice(), hl: one(i, ok ? 'ok' : 'bad') }] });
        });
        frames.push({ narr: 'Takeaway: T is chosen <b>per call</b> from the arguments AND the target. With <code>var</code> there is no target, so you get the lub (sometimes an ugly intersection type). With a declared target you usually get exactly the type you asked for.', parts: [{ type: 'table', label: 'Summary', columns: ['declaration', 'result'], rows: rows.concat([['var list = Arrays.asList(...)', 'T = ' + lub]]), hl: one(rows.length, 'sel') }] });
        return frames;
      }
    },
    examples: [
      { title: 'Predict the output: one method, three different Ts', html: `<p>Each call infers its own T. The last line passes a String and an Integer — it still compiles (T = an intersection type) and returns the second argument.</p>
${H.table(['Call', 'T', 'Prints'], [[C('pick("a", "b")'), 'String', 'b'], [C('pick(1, 2)'), 'Integer', '2'], [C('pick("a", 2)'), 'Object &amp; Serializable &amp; …', '2']])}`, code: `
class PickDemo {
    static <T> T pick(T a, T b) { return b; }
    public static void main(String[] args) {
        System.out.println(pick("a", "b"));   // b
        System.out.println(pick(1, 2));       // 2
        System.out.println(pick("a", 2));     // 2  (compiles — T is a common supertype)
        // String s = pick("a", 2);           // does not compile: the intersection type is not a String
    }
}` },
      { title: 'Does this compile? comparing(...).reversed()', html: `${P(`
Comparator<Person> c1 = Comparator.comparing(p -> p.name()).reversed();          // ❌ p is Object
Comparator<Person> c2 = Comparator.comparing(Person::name).reversed();           // ✅
Comparator<Person> c3 = Comparator.comparing((Person p) -> p.name()).reversed(); // ✅`)}
<p><b>Why c1 fails:</b> the target type ${C('Comparator<Person>')} belongs to the <b>last</b> call (${C('reversed()')}). When javac infers ${C('comparing')}'s T it has no target, so the implicit lambda parameter defaults to ${C('Object')}. A method reference or explicitly typed lambda carries the type itself.</p>`, code: `
record Person(String name, int age) {}
class ComparingDemo {
    public static void main(String[] args) {
        List<Person> people = new ArrayList<>(List.of(new Person("asha", 30), new Person("ben", 25)));
        people.sort(Comparator.comparing(Person::name).reversed());          // method ref carries the type
        System.out.println(people.get(0).name());                            // ben
        people.sort(Comparator.comparing((Person p) -> p.age()).reversed()); // typed lambda also works
        System.out.println(people.get(0).name());                            // asha
    }
}` },
      { title: 'The shadowing trap: a method-level T hides the class T', html: `<p>Inside ${C('class Holder<T>')}, the method ${C('<T> void set(T t)')} declares a <b>new</b> T. So ${C('h.set(42)')} compiles even on a ${C('Holder<String>')}, and assigning to the field needs an unchecked cast. Fix: delete the method's ${C('<T>')}.</p>
${H.table(['Signature', 'Which T?', 'h.set(42) on Holder&lt;String&gt;'], [[C('void set(T t)'), 'class T (String)', H.c('g', 'compile error — good')], [C('<T> void set(T t)'), 'a NEW method T', H.c('r', 'compiles — bug')]])}`, code: `
class Holder<T> {
    private Object value;
    <T> void setBuggy(T t) { value = t; }   // this T shadows the class T!
    void set(T t) { value = t; }            // correct: uses the class T
    public static void main(String[] args) {
        Holder<String> h = new Holder<>();
        h.setBuggy(42);                      // compiles — the method's own T = Integer
        // h.set(42);                        // does not compile: int cannot be converted to String
        System.out.println(h.value);         // 42
    }
}` },
      { title: 'Ternary + emptyList(): when a witness is needed', html: `<p>On old compilers (Java 7) ${C('return flag ? list : Collections.emptyList();')} inferred ${C('List<Object>')} and failed. Java 8+ treats a ternary of generic calls as a <b>poly expression</b> and pushes the return type in, so it compiles today. You still see ${C('Collections.<String>emptyList()')} in older code bases — and you still need a witness when there is no target at all, e.g. ${C('Collections.<String>emptyList().stream()')}.</p>`, code: `
class EmptyDemo {
    static List<String> names(boolean flag, List<String> list) {
        return flag ? list : Collections.emptyList();      // fine on Java 8+
    }
    public static void main(String[] args) {
        System.out.println(names(false, List.of("a")));    // []
        long n = Collections.<String>emptyList().stream().filter(s -> s.isEmpty()).count();
        System.out.println(n);                             // 0
    }
}` }
    ],
    deepDive: `<p><b>How inference works (JLS chapter 18).</b> javac creates <b>inference variables</b> (α for T), collects <b>bounds</b> from each argument (${C('Integer <: α')}), from the target (${C('α <: Number')}), and from declared bounds, then <b>resolves</b>: if an α has proper lower bounds it takes their <b>lub</b>; otherwise the glb of its upper bounds. Java 8 rewrote this to support lambdas and poly expressions (method invocations, ternaries, lambdas whose type depends on the target).</p>
<p><b>Intersection types and lub.</b> ${C('lub(Integer, String)')} is computed from the erased supertypes both share, then re-parameterized; it can be recursive (${C('Comparable<? extends Comparable<? extends …>>')}), which is why error messages sometimes print infinite-looking types. ${C('var')} can store a non-denotable type — handy, but it leaks confusing types into code review.</p>
<p><b>Wildcard vs type parameter.</b> Effective Java Item 31: if a type parameter appears <b>only once</b> in a method signature, replace it with a wildcard (${C('static void printAll(List<?> l)')}). If it links two places — a parameter and the return type, or two parameters — it must be a type parameter (${C('<T> T first(List<T> l)')}).</p>
<p><b>Generic constructors</b> exist (${C('<S> Foo(S seed)')}) and combine with class parameters: ${C('new <String>Foo<Integer>("x")')}. You will rarely write them; ${C('java.util')} uses them almost nowhere.</p>
<p><b>Performance.</b> Inference happens only at compile time; very deep chains of generic lambdas can slow compilation (javac spends seconds in inference on some stream-heavy files) but never runtime.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI writes generic helpers (${C('mapAll')}, ${C('groupBy')}, ${C('retry<T>')}) instantly, and modern IDEs show inferred types as inline hints, so you rarely guess what T became.</p>
<p><b>Use AI as a partner:</b> when you hit "inference variable T has incompatible bounds", paste the error and ask <code>"Explain each bound javac collected and which argument produced it"</code>. Ask it to propose the <b>minimal</b> fix (method ref, typed lambda, witness) rather than a cast.</p>
<p><b>Where AI goes wrong:</b> it "fixes" inference errors with ${C('(List) x')} raw casts or ${C('@SuppressWarnings')}; it writes ${C('<T>')} on methods inside generic classes (shadowing); it puts a type parameter where a wildcard is cleaner, or vice-versa.</p>
<p><b>What you must still own:</b> reading javac inference errors, knowing the per-call nature of method type parameters, and designing signatures that infer nicely at call sites — API ergonomics is a human design decision that reviewers judge.</p>`,
    problems: [{
      title: 'Generic mode(): Most Frequent Element of Any Type',
      level: 'Easy', tags: ['generic method', 'hashmap', 'counting'], companies: ['Google', 'Flipkart', 'Accenture'],
      statement: `<p>Write a <b>static generic method</b> ${C('static <T> T mode(List<T> items)')} that returns the element that appears most often. If several elements tie, return the one that appeared <b>first</b> in the list. Throw ${C('IllegalArgumentException')} for an empty list. It must work for Strings, Integers, records — any type with proper ${C('equals')}/${C('hashCode')}.</p>`,
      constraints: `1 ≤ n ≤ 10<sup>5</sup>; elements may include <code>null</code> (treat null as a value).`,
      example: `<p>${C('mode(List.of("b", "a", "b", "a", "c"))')} → ${H.c('g', '"b"')} — "b" and "a" both appear twice; "b" appeared first. ${C('mode(List.of(3, 1, 1))')} → ${H.c('g', '1')}.</p>`,
      brute: { why: `<p>For each element, count how many times it appears by scanning the whole list again: O(n<sup>2</sup>). With n = 10<sup>5</sup> that is 10<sup>10</sup> comparisons — far too slow.</p>`, code: `
class ModeBrute {
    static <T> T mode(List<T> items) {
        if (items.isEmpty()) throw new IllegalArgumentException("empty");
        T best = items.get(0);
        int bestCount = 0;
        for (T x : items) {
            int c = 0;
            for (T y : items) if (Objects.equals(x, y)) c++;   // rescans every time
            if (c > bestCount) { bestCount = c; best = x; }    // strict > keeps the first on ties
        }
        return best;
    }
}` },
      mcq: { q: 'Which map gives O(n) counting AND remembers first-appearance order for tie-breaking?', options: ['<code>TreeMap&lt;T, Integer&gt;</code>', '<code>LinkedHashMap&lt;T, Integer&gt;</code>', '<code>HashMap&lt;T, Integer&gt;</code> then sort keys', '<code>IdentityHashMap&lt;T, Integer&gt;</code>'], answer: 1, explain: 'LinkedHashMap keeps insertion order with O(1) operations. TreeMap needs T to be Comparable (not every T is) and is O(log n); IdentityHashMap compares with == so equal Strings built separately would count separately.' },
      hints: [`<p>Hint 1: the type only matters in two places — the list element and the return value. One type parameter ${C('<T>')} on the method links them.</p>`, `<p>Hint 2: count with ${C('Map<T, Integer>')} and ${C('merge(x, 1, Integer::sum)')}. A ${C('LinkedHashMap')} iterates keys in first-seen order, which solves ties for free.</p>`, `<p>Hint 3: edge cases — empty list (throw), null elements (HashMap allows one null key), all distinct (answer = first). Recipe: count → walk entries in order → keep the first entry with a strictly greater count.</p>`],
      solution: {
        approach: `<p>One pass to count in a ${C('LinkedHashMap')}, one pass over its entries (insertion order) keeping the entry with the strictly larger count. T is inferred at each call site, so the same method serves every type.</p>`,
        code: `
import java.util.*;

class Mode {
    static <T> T mode(List<T> items) {
        if (items.isEmpty()) throw new IllegalArgumentException("empty list");
        Map<T, Integer> counts = new LinkedHashMap<>();        // keeps first-seen order
        for (T x : items) counts.merge(x, 1, Integer::sum);    // works with a null key too
        T best = null;
        int bestCount = 0;
        for (Map.Entry<T, Integer> e : counts.entrySet()) {
            if (e.getValue() > bestCount) {                    // strict > → earliest wins ties
                bestCount = e.getValue();
                best = e.getKey();
            }
        }
        return best;
    }

    record Point(int x, int y) {}                              // records get equals/hashCode free

    public static void main(String[] args) {
        System.out.println(mode(List.of("b", "a", "b", "a", "c")));                  // b
        System.out.println(mode(List.of(3, 1, 1)));                                  // 1
        System.out.println(mode(List.of(new Point(1, 2), new Point(0, 0), new Point(1, 2)))); // Point[x=1, y=2]
        String s = mode(List.of("x"));                         // T = String, no cast
        System.out.println(s);                                 // x
    }
}`,
        dry: { head: ['step', 'element', 'counts (insertion order)', 'best / bestCount'], rows: [['count', '"b"', '{b=1}', '—'], ['count', '"a"', '{b=1, a=1}', '—'], ['count', '"b"', '{b=2, a=1}', '—'], ['count', '"a"', '{b=2, a=2}', '—'], ['count', '"c"', '{b=2, a=2, c=1}', '—'], ['scan', 'b=2', '', 'b / 2'], ['scan', 'a=2', '', 'b / 2 (2 &gt; 2 is false)'], ['scan', 'c=1', '', H.c('g', 'b / 2 → return "b"')]] },
        complexity: `<p>O(n) expected time (hash lookups), O(k) extra space for k distinct elements. Generics add no runtime cost.</p>`,
        followUps: ['Return all modes as a <code>List&lt;T&gt;</code>.', 'Change the signature to accept <code>Collection&lt;? extends T&gt;</code> — what does the wildcard buy you?', 'Do it with streams: <code>groupingBy(identity(), LinkedHashMap::new, counting())</code>.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — Bounded type parameters
     ====================================================================== */
  topics.push({
    title: 'Bounded Type Parameters: extends, Multiple Bounds & Recursive Bounds',
    analogy: `<p>A job advert that says "<b>any person</b>" can be answered by anyone — but then you cannot ask them to drive the delivery van. An advert for "<b>any person WITH a driving licence</b>" is narrower, and in return you are <b>allowed to hand them the keys</b>. A bound works the same way: ${C('<T>')} accepts every type but lets you call only ${C('Object')} methods on it; ${C('<T extends Comparable<T>>')} accepts fewer types, and in return you may call ${C('compareTo')}. "Licence <b>and</b> forklift certificate" is a multiple bound: ${C('<T extends Number & Comparable<T>>')}.</p>`,
    explain: `<p>An unbounded ${C('T')} could be anything, so the compiler only lets you use the methods every object has (${C('equals')}, ${C('hashCode')}, ${C('toString')}). A <b>bound</b> narrows what T may be, and <b>unlocks</b> the methods of the bound.</p>
<h4>1. Upper bound with extends</h4>
${P(`
static <T> T max(T a, T b) { return a.compareTo(b) > 0 ? a : b; }        // ❌ cannot find symbol: compareTo
static <T extends Comparable<T>> T max(T a, T b) {                        // ✅
    return a.compareTo(b) >= 0 ? a : b;
}
max(3, 9);          // 9      (Integer implements Comparable<Integer>)
max("kiwi", "fig"); // "kiwi"
max(new Object(), new Object()); // ❌ Object is not Comparable`)}
<p>In a bound, ${C('extends')} means "is a subtype of" — it is used for <b>both</b> classes and interfaces (there is no ${C('implements')} in a bound).</p>
<h4>2. Bounds on classes</h4>
${P(`
class Stats<N extends Number> {
    private final List<N> data = new ArrayList<>();
    void add(N n) { data.add(n); }
    double mean() { return data.stream().mapToDouble(Number::doubleValue).average().orElse(0); }
}
Stats<Integer> ok;     // ✅
Stats<String> bad;     // ❌ type argument String is not within bounds of type-variable N`)}
<h4>3. Multiple bounds with &amp;</h4>
<p>${C('<T extends Number & Comparable<T>>')}: T must be a Number <b>and</b> comparable to itself. Rules: at most <b>one class</b>, and it must come <b>first</b>; any number of interfaces after it. ${C('<T extends Comparable<T> & Number>')} is a compile error ("interface expected here").</p>
${H.table(['Bound', 'Integer', 'String', 'BigDecimal', 'AtomicInteger'], [['T extends Number', H.c('g', '✓'), H.c('r', '✗'), H.c('g', '✓'), H.c('g', '✓')], ['T extends Comparable&lt;T&gt;', H.c('g', '✓'), H.c('g', '✓'), H.c('g', '✓'), H.c('r', '✗ not Comparable')], ['T extends Number &amp; Comparable&lt;T&gt;', H.c('g', '✓'), H.c('r', '✗'), H.c('g', '✓'), H.c('r', '✗')]])}
<h4>4. Recursive bounds and the "? super T" upgrade</h4>
<p>${C('<T extends Comparable<T>>')} mentions T inside its own bound — a <b>recursive bound</b>: "T can be compared with T". It breaks for subclasses: if ${C('Fruit implements Comparable<Fruit>')} and ${C('Apple extends Fruit')}, then Apple is a ${C('Comparable<Fruit>')}, <b>not</b> a ${C('Comparable<Apple>')}. Same for ${C('LocalDate')}, which implements ${C('Comparable<ChronoLocalDate>')}. The fix used all over the JDK:</p>
${P(`
static <T extends Comparable<? super T>> T max(List<T> list)   // "T can be compared with T or with a supertype of T"`)}
<h4>5. No lower bounds on type parameters</h4>
<p>${C('<T super Integer>')} does <b>not</b> exist. ${C('super')} is only allowed on <b>wildcards</b> (${C('? super Integer')}, Topic 4).</p>`,
    clues: ['"find the max / min / sort for any comparable type" → <code>T extends Comparable&lt;? super T&gt;</code>', '"works for any numeric type" (sum, average, statistics) → <code>T extends Number</code>', 'compile error "cannot find symbol compareTo/doubleValue on T" → add a bound', '"type argument X is not within bounds of type-variable T" in an error message', 'a hierarchy where only the parent implements Comparable (Fruit/Apple, LocalDate) → you need <code>? super T</code> in the bound', '"fluent builder that subclasses can extend" → recursive (self) bound <code>B extends Builder&lt;B&gt;</code>'],
    code: [`
import java.util.*;
import java.math.*;
import java.time.*;

class Bounds {
    // Upper bound unlocks compareTo; "? super T" lets subclasses of a Comparable parent work too
    static <T extends Comparable<? super T>> T max(List<T> list) {
        if (list.isEmpty()) throw new NoSuchElementException("empty");
        T best = list.get(0);
        for (T t : list) if (t.compareTo(best) > 0) best = t;
        return best;
    }

    // Number bound unlocks doubleValue()
    static <N extends Number> double sum(List<N> nums) {
        double s = 0;
        for (N n : nums) s += n.doubleValue();
        return s;
    }

    // Multiple bounds: a class first, then interfaces
    static <T extends Number & Comparable<T>> T larger(T a, T b) {
        System.out.println("as double: " + a.doubleValue() + " vs " + b.doubleValue()); // Number method
        return a.compareTo(b) >= 0 ? a : b;                                             // Comparable method
    }

    public static void main(String[] args) {
        System.out.println(max(List.of(3, 9, 4)));                                    // 9
        System.out.println(max(List.of("fig", "kiwi", "apple")));                     // kiwi
        System.out.println(max(List.of(LocalDate.of(2024, 5, 1), LocalDate.of(2025, 1, 1)))); // 2025-01-01
        System.out.println(sum(List.of(1, 2, 3)) + " " + sum(List.of(1.5, 2.5)));      // 6.0 4.0
        System.out.println(larger(new BigDecimal("1.5"), new BigDecimal("2")));       // prints the doubles, then 2
    }
}`],
    codeTitle: ['Upper bound, Number bound and multiple bounds'],
    viz: [{
      title: 'Step through a bounded max()',
      input: '4 9 2 9 7',
      inputLabel: 'Integers (space separated, up to 10)',
      gen: function (input) {
        var a = String(input || '').trim().split(/[\s,]+/).map(Number);
        if (!a.length || a.some(function (x) { return isNaN(x) || x !== Math.floor(x); })) throw new Error('Enter whole numbers separated by spaces, e.g. 4 9 2');
        if (a.length > 10) throw new Error('Use at most 10 numbers');
        var code = 'static <T extends Comparable<? super T>> T max(List<T> list) {\n    T best = list.get(0);\n    for (T t : list)\n        if (t.compareTo(best) > 0)\n            best = t;\n    return best;\n}';
        var frames = [];
        frames.push({ narr: 'Call <code>max(List.of(' + a.join(', ') + '))</code>. javac infers <b>T = Integer</b> and checks the bound: Integer implements <code>Comparable&lt;Integer&gt;</code>, and Integer is a "super or same" of Integer → <span class="c-g">bound satisfied</span>.', parts: [
          { type: 'code', label: 'Bounded generic method', lang: 'java', code: code, hl: { 1: 'ok' } },
          { type: 'table', label: 'Bound check at compile time', columns: ['question', 'answer'], rows: [['T inferred as', 'Integer'], ['Integer implements', 'Comparable<Integer>'], ['Is Integer a supertype-or-same of T?', 'yes → compiles']], hl: { 2: 'ok' } }] });
        var best = a[0];
        frames.push({ narr: 'Start with the first element as the best so far: <b>' + best + '</b>.', parts: [{ type: 'code', label: 'Bounded generic method', lang: 'java', code: code, hl: { 2: 'cur' } }, { type: 'array', label: 'list', values: a, hl: { 0: 'sel' }, ptr: { 0: 'best' } }, { type: 'vars', vals: { best: best }, hl: { best: 'sel' } }] });
        var bi = 0;
        for (var i = 0; i < a.length; i++) {
          var c = a[i] > best ? 1 : a[i] < best ? -1 : 0;
          var hl = {}; hl[i] = 'cur'; hl[bi] = 'sel';
          var ptr = {}; ptr[i] = 't';
          if (bi !== i) ptr[bi] = 'best';
          frames.push({ narr: '<code>t.compareTo(best)</code> = <code>' + a[i] + '.compareTo(' + best + ')</code> → <b>' + c + '</b>. This call is legal <b>only because of the bound</b>: the compiler knows every T has compareTo. ' + (c > 0 ? 'Positive → new best.' : 'Not positive → keep ' + best + (c === 0 ? ' (ties keep the earlier element).' : '.')),
            parts: [{ type: 'code', label: 'Bounded generic method', lang: 'java', code: code, hl: c > 0 ? { 4: 'ok', 5: 'ok' } : { 4: 'cur' } }, { type: 'array', label: 'list', values: a, hl: hl, ptr: ptr }, { type: 'vars', vals: { t: a[i], best: c > 0 ? a[i] : best, 'compareTo result': c }, hl: { 'compareTo result': c > 0 ? 'ok' : 'cur' } }] });
          if (c > 0) { best = a[i]; bi = i; }
        }
        frames.push({ narr: 'Return <b>' + best + '</b>. After erasure the method signature becomes <code>Comparable max(List)</code> — T erases to its <b>first bound</b> (Comparable), not Object — and the call site gets a <code>checkcast Integer</code>.', parts: [{ type: 'code', label: 'Bounded generic method', lang: 'java', code: code, hl: { 6: 'ok' } }, { type: 'array', label: 'list', values: a, hl: one(bi, 'sel') }, { type: 'code', label: 'Erased signature', lang: 'java', code: 'static Comparable max(List list)   // T → Comparable (first bound)', hl: { 1: 'sel' } }] });
        return frames;
      }
    }, {
      title: 'Bound checker: which type arguments fit?',
      gen: function () {
        var rows = [
          ['T extends Number', 'Integer', '✓', 'Integer extends Number'],
          ['T extends Number', 'String', '✗', 'String is not a Number'],
          ['T extends Comparable<T>', 'String', '✓', 'String implements Comparable<String>'],
          ['T extends Comparable<T>', 'Apple (Fruit implements Comparable<Fruit>)', '✗', 'Apple is Comparable<Fruit>, not Comparable<Apple>'],
          ['T extends Comparable<? super T>', 'Apple', '✓', 'Fruit is a supertype of Apple → accepted'],
          ['T extends Comparable<T>', 'LocalDate', '✗', 'LocalDate implements Comparable<ChronoLocalDate>'],
          ['T extends Comparable<? super T>', 'LocalDate', '✓', 'ChronoLocalDate is a supertype of LocalDate'],
          ['T extends Number & Comparable<T>', 'BigDecimal', '✓', 'a Number AND Comparable<BigDecimal>'],
          ['T extends Number & Comparable<T>', 'AtomicInteger', '✗', 'a Number but NOT Comparable']
        ];
        var narr = [
          'Simple class bound: Integer is a subclass of Number, so <code>Stats&lt;Integer&gt;</code> compiles and you can call <code>doubleValue()</code>.',
          'String is not a Number — <span class="c-r">"type argument String is not within bounds of type-variable N"</span>.',
          'Recursive bound: "T can be compared with T". String compares with String → fits.',
          '<span class="c-r">The classic trap.</span> Only the parent Fruit implements Comparable. Apple inherits <code>compareTo(Fruit)</code>, so Apple is a <code>Comparable&lt;Fruit&gt;</code>. The strict bound wants <code>Comparable&lt;Apple&gt;</code> → rejected.',
          'Loosen the bound with a wildcard: "T can be compared with T <b>or a supertype of T</b>". Fruit is a supertype of Apple → <span class="c-g">accepted</span>. This is why <code>Collections.sort</code> and <code>max</code> use <code>? super T</code>.',
          'A real JDK case: LocalDate implements <code>Comparable&lt;ChronoLocalDate&gt;</code> (its interface parent). The strict bound rejects <code>List&lt;LocalDate&gt;</code>!',
          'With <code>? super T</code> LocalDate fits, because ChronoLocalDate is a supertype of LocalDate.',
          'Multiple bounds: BigDecimal extends Number and implements <code>Comparable&lt;BigDecimal&gt;</code> → both conditions hold.',
          'AtomicInteger is a Number but deliberately not Comparable (its value changes), so the second bound fails.'
        ];
        return rows.map(function (r, i) {
          return { narr: narr[i], parts: [{ type: 'table', label: 'Does the type argument satisfy the bound?', columns: ['bound', 'type argument', 'fits?', 'why'], rows: rows.slice(0, i + 1), hl: one(i, r[2] === '✓' ? 'ok' : 'bad') }] };
        });
      }
    }],
    examples: [
      { title: 'Does this compile? Calling a method the bound does not promise', html: `${P(`
static <T> double half(T x) { return x.doubleValue() / 2; }                 // ❌ cannot find symbol doubleValue()
static <T extends Number> double half(T x) { return x.doubleValue() / 2; }  // ✅`)}
<p>Without a bound, T is only known to be an Object. The bound is a promise the compiler can rely on — and every caller must keep it: ${C('half("10")')} becomes a compile error.</p>`, code: `
class Half {
    static <T extends Number> double half(T x) { return x.doubleValue() / 2; }
    public static void main(String[] args) {
        System.out.println(half(10));       // 5.0  (Integer)
        System.out.println(half(3.0f));     // 1.5  (Float)
        // System.out.println(half("10")); // does not compile: String is not a Number
    }
}` },
      { title: 'Fruit and Apple: why the JDK writes Comparable&lt;? super T&gt;', html: `<p>Only ${C('Fruit')} implements ${C('Comparable<Fruit>')}. With the strict bound, ${C('maxStrict(apples)')} fails with "inference variable T has incompatible equality constraints Fruit, Apple". With ${C('? super T')} it compiles and returns an Apple — no cast.</p>
${H.table(['Method', 'maxStrict(List&lt;Apple&gt;)', 'maxFlex(List&lt;Apple&gt;)'], [['Bound', C('T extends Comparable<T>'), C('T extends Comparable<? super T>')], ['Result', H.c('r', 'compile error'), H.c('g', 'Apple9')]])}`, code: `
class Fruit implements Comparable<Fruit> {
    final int weight;
    Fruit(int weight) { this.weight = weight; }
    public int compareTo(Fruit o) { return Integer.compare(weight, o.weight); }
    public String toString() { return getClass().getSimpleName() + weight; }
}
class Apple extends Fruit { Apple(int w) { super(w); } }

class FruitDemo {
    static <T extends Comparable<? super T>> T maxFlex(List<T> list) {
        T best = list.get(0);
        for (T t : list) if (t.compareTo(best) > 0) best = t;
        return best;
    }
    public static void main(String[] args) {
        List<Apple> apples = List.of(new Apple(3), new Apple(9));
        Apple heaviest = maxFlex(apples);          // T = Apple; Apple is Comparable<Fruit>, Fruit super Apple ✓
        System.out.println(heaviest);              // Apple9
        System.out.println(Collections.max(apples)); // Apple9 — the JDK uses the same trick
    }
}` },
      { title: 'Does this compile? Order of multiple bounds', html: `${P(`
<T extends Comparable<T> & Number> void f(T t)   // ❌ interface expected here
<T extends Number & Comparable<T>> void f(T t)   // ✅ class first, then interfaces
<T extends Number & Integer> void f(T t)         // ❌ only ONE class allowed (and Integer is final anyway)`)}
<p>Why the rule? Erasure replaces T with its <b>first</b> bound, and a JVM type can extend only one class. Putting the class first keeps the erased signature sensible.</p>`, code: `
class MultiBound {
    static <T extends Number & Comparable<T>> T clampToZero(T value, T zero) {
        return value.compareTo(zero) < 0 ? zero : value;  // compareTo from Comparable
    }
    public static void main(String[] args) {
        System.out.println(clampToZero(-5, 0));           // 0
        System.out.println(clampToZero(2.5, 0.0));        // 2.5
    }
}` },
      { title: 'Self-bounded types: Enum&lt;E extends Enum&lt;E&gt;&gt; and fluent builders', html: `<p>${C('java.lang.Enum')} is declared ${C('class Enum<E extends Enum<E>>')}. That recursive bound makes ${C('compareTo(E)')} accept only the <b>same</b> enum type. The same trick ("curiously recurring template pattern") gives builders a ${C('self()')} method so subclass setters can be chained without casts.</p>`, code: `
abstract class Builder<B extends Builder<B>> {
    String name;
    B name(String n) { this.name = n; return self(); }   // returns the SUBCLASS type
    abstract B self();
}
class CarBuilder extends Builder<CarBuilder> {
    int wheels;
    CarBuilder wheels(int w) { this.wheels = w; return this; }
    CarBuilder self() { return this; }
    public static void main(String[] args) {
        CarBuilder b = new CarBuilder().name("mini").wheels(4);   // name() returns CarBuilder → chain works
        System.out.println(b.name + " " + b.wheels);              // mini 4
    }
}` }
    ],
    deepDive: `<p><b>Erasure of bounded parameters.</b> A type parameter erases to its <b>leftmost bound</b>: ${C('<T extends Number>')} → ${C('Number')}, ${C('<T extends Comparable<T>>')} → ${C('Comparable')}, unbounded → ${C('Object')}. That is why ${C('Collections.max')} is declared ${C('<T extends Object & Comparable<? super T>> T max(Collection<? extends T> coll)')}: the redundant ${C('Object &')} makes the erased return type ${C('Object')}, which matches the <b>pre-Java-5 binary signature</b>. Changing it to Comparable would have broken every compiled caller. Interviewers love this one.</p>
<p><b>Calls on additional bounds.</b> For ${C('<T extends Number & Comparable<T>>')}, the erased parameter type is ${C('Number')}. When you call ${C('t.compareTo(x)')}, javac inserts a ${C('checkcast Comparable')} before ${C('invokeinterface')}. Order affects bytecode, not semantics.</p>
<p><b>Bounds are checked at compile time only.</b> At runtime nothing verifies ${C('T extends Number')} — if someone uses a raw type to sneak a String in, you get a ClassCastException at the first hidden cast.</p>
<p><b>F-bounded polymorphism</b> (${C('B extends Builder<B>')}) lets a supertype refer to "my concrete subtype". It does not stop ${C('class Evil extends Builder<CarBuilder>')}, so the abstract ${C('self()')} method is still needed. Java has no "self type" keyword.</p>
<p><b>Design guidance.</b> Bound as loosely as the method needs (just ${C('Comparable<? super T>')}, not your own interface hierarchy). Prefer a ${C('Comparator<? super T>')} parameter overload for types without natural ordering — the JDK pairs ${C('sort(List<T>)')} with ${C('sort(List<T>, Comparator<? super T>)')} for exactly this reason.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI tools write bounded signatures quickly and can explain a scary inference error in plain words, which used to take a senior engineer.</p>
<p><b>Use AI as a partner:</b> ask <code>"Tighten or loosen this generic bound; show a caller that compiles with the new signature but failed with the old one"</code> — that forces a concrete test case like the Fruit/Apple or LocalDate example. Ask it to check binary compatibility if the method is part of a published library.</p>
<p><b>Where AI goes wrong:</b> it writes the strict ${C('T extends Comparable<T>')} (fails on LocalDate and subclass hierarchies), invents ${C('<T super X>')} (illegal), orders multiple bounds wrongly, or adds a bound that is not needed and makes the API harder to call.</p>
<p><b>What you must still own:</b> knowing that erasure uses the first bound (and why ${C('Collections.max')} has ${C('Object &')}), choosing between a bound and a ${C('Comparator')} parameter, and testing signatures with real subtype hierarchies before publishing them.</p>`,
    problems: [{
      title: 'Generic clamp() for Anything Comparable',
      level: 'Medium', tags: ['bounded type', 'Comparable', 'generic method'], companies: ['Microsoft', 'Uber', 'Zoho'],
      statement: `<p>Write ${C('static <T extends Comparable<? super T>> T clamp(T value, T lo, T hi)')} that returns ${C('lo')} if value is below lo, ${C('hi')} if above hi, otherwise value. Throw ${C('IllegalArgumentException')} if ${C('lo > hi')}. It must work for Integers, Strings, ${C('LocalDate')} and subclasses of a Comparable parent (e.g. Apple extends Fruit).</p>`,
      constraints: `Arguments are non-null; comparisons follow each type's natural ordering.`,
      example: `<p>${C('clamp(15, 0, 10)')} → ${H.c('g', '10')}; ${C('clamp("m", "a", "k")')} → ${H.c('g', '"k"')} (alphabetical); ${C('clamp(2020-01-01, 2021-01-01, 2022-01-01)')} → ${H.c('g', '2021-01-01')}; ${C('clamp(5, 9, 1)')} → ${H.c('r', 'IllegalArgumentException')}.</p>`,
      brute: { why: `<p>The naive way writes one overload per type — ${C('clamp(int,…)')}, ${C('clamp(String,…)')}, ${C('clamp(LocalDate,…)')} — copying the same logic each time. Or it takes ${C('Comparable')} raw, which compiles with warnings, returns ${C('Comparable')} (callers must cast) and accepts mismatched types like ${C('clamp(5, "a", "z")')} until it crashes at runtime.</p>`, code: `
class ClampRaw {
    @SuppressWarnings({"rawtypes", "unchecked"})
    static Comparable clamp(Comparable v, Comparable lo, Comparable hi) {
        if (v.compareTo(lo) < 0) return lo;     // unchecked call on a raw type
        if (v.compareTo(hi) > 0) return hi;
        return v;
    }
    public static void main(String[] args) {
        Integer x = (Integer) clamp(15, 0, 10);  // cast needed
        System.out.println(x);                   // 10
        // clamp(5, "a", "z") compiles too — and throws ClassCastException at runtime
    }
}` },
      mcq: { q: 'Why is <code>T extends Comparable&lt;? super T&gt;</code> better here than <code>T extends Comparable&lt;T&gt;</code>?', options: ['It is faster at runtime', 'It accepts types whose compareTo is inherited from a supertype, like LocalDate or Apple extends Fruit', 'It allows null arguments', 'It lets you pass mixed types like Integer and String'], answer: 1, explain: 'LocalDate implements Comparable&lt;ChronoLocalDate&gt;; Apple inherits Comparable&lt;Fruit&gt;. The strict bound demands Comparable&lt;T&gt; exactly and rejects them. Runtime speed is identical — erasure produces the same bytecode.' },
      hints: [`<p>Hint 1: you need ${C('compareTo')} on T, so T needs a bound. The question already mentions subclasses of a Comparable parent — that is the "? super T" clue.</p>`, `<p>Hint 2: validate first: ${C('if (lo.compareTo(hi) > 0) throw …')}. Then two comparisons: below lo? above hi?</p>`, `<p>Hint 3: edge cases — value equal to lo or hi returns value (either is fine, but be consistent); lo == hi always returns lo. Recipe: check range → if value &lt; lo return lo → if value &gt; hi return hi → return value.</p>`],
      solution: {
        approach: `<p>A single bounded generic method. The bound guarantees ${C('compareTo')}; ${C('? super T')} widens it to inherited comparisons. All three parameters and the return share one T, so ${C('clamp(5, "a", "z")')} is a compile error and the caller never casts.</p>`,
        code: `
import java.time.*;

class Clamp {
    static <T extends Comparable<? super T>> T clamp(T value, T lo, T hi) {
        if (lo.compareTo(hi) > 0) throw new IllegalArgumentException("lo > hi: " + lo + " > " + hi);
        if (value.compareTo(lo) < 0) return lo;    // below the range
        if (value.compareTo(hi) > 0) return hi;    // above the range
        return value;                              // inside (inclusive)
    }

    public static void main(String[] args) {
        System.out.println(clamp(15, 0, 10));                       // 10
        System.out.println(clamp(-3, 0, 10));                       // 0
        System.out.println(clamp("m", "a", "k"));                   // k
        LocalDate d = clamp(LocalDate.of(2020, 1, 1), LocalDate.of(2021, 1, 1), LocalDate.of(2022, 1, 1));
        System.out.println(d);                                      // 2021-01-01 (works thanks to ? super T)
        // clamp(5, "a", "z");                                      // does not compile: no single T fits
        try { clamp(5, 9, 1); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); } // lo > hi: 9 > 1
    }
}`,
        dry: { head: ['call', 'T', 'lo vs hi', 'value vs lo', 'value vs hi', 'result'], rows: [['clamp(15, 0, 10)', 'Integer', 'ok', '15 &gt; 0', '15 &gt; 10', H.c('g', '10')], ['clamp(-3, 0, 10)', 'Integer', 'ok', '-3 &lt; 0', '—', H.c('g', '0')], ['clamp("m","a","k")', 'String', 'ok', '"m" &gt; "a"', '"m" &gt; "k"', H.c('g', '"k"')], ['clamp(5, 9, 1)', 'Integer', H.c('r', '9 &gt; 1'), '—', '—', H.c('r', 'IllegalArgumentException')]] },
        complexity: `<p>O(1): at most three ${C('compareTo')} calls. No allocation besides autoboxing of int literals.</p>`,
        followUps: ['Add an overload taking a <code>Comparator&lt;? super T&gt;</code> for types without natural order.', 'Java 21 added <code>Math.clamp</code> for primitives — why does it not cover generic types?', 'Why does the erased signature of this method use <code>Comparable</code> rather than <code>Object</code>?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — Wildcards, invariance and PECS
     ====================================================================== */
  topics.push({
    title: 'Wildcards: ?, ? extends, ? super and PECS',
    analogy: `<p>Picture three kinds of <b>boxes at a recycling centre</b>. A box labelled "<b>some kind of fruit</b>" (${C('? extends Fruit')}): you can safely <b>take</b> things out and call them fruit, but you may <b>not put</b> an apple in — it might be the banana box. A box labelled "<b>apples, or anything more general</b>" (${C('? super Apple')}) — it could be the apple box, the fruit box or the everything box: you can always <b>put</b> an apple in, but when you pull something out you only know it is "a thing". A box labelled just "<b>?</b>" — you know nothing: look, count, empty it, but do not add. That is the whole of <b>PECS</b>: the box you <b>take from</b> (a Producer) uses <b>Extends</b>; the box you <b>put into</b> (a Consumer) uses <b>Super</b>.</p>`,
    explain: `<h4>1. The surprise: List&lt;Integer&gt; is NOT a List&lt;Number&gt;</h4>
<p>Integer is a Number, so beginners expect ${C('List<Number> nums = new ArrayList<Integer>();')} to compile. It does not — generics are <b>invariant</b>. If it were allowed, this would happen:</p>
${P(`
List<Integer> ints = new ArrayList<>();
List<Number> nums = ints;      // ❌ pretend this compiled…
nums.add(3.14);                // …a Double inside a list of Integers!
Integer i = ints.get(0);       // ClassCastException`)}
<p>Arrays <b>are</b> covariant (${C('Object[] o = new String[1];')} compiles) and pay for it at runtime with ${C('ArrayStoreException')}. Generics chose compile-time safety instead.</p>
<h4>2. Wildcards give back flexibility, safely</h4>
${H.table(['Declaration', 'Accepts', 'Read gives', 'Can add'], [[C('List<Number>'), 'only List&lt;Number&gt;', 'Number', 'Number, Integer, Double…'], [C('List<? extends Number>'), 'List&lt;Number&gt;, List&lt;Integer&gt;, List&lt;Double&gt;', H.c('g', 'Number'), H.c('r', 'nothing (only null)')], [C('List<? super Integer>'), 'List&lt;Integer&gt;, List&lt;Number&gt;, List&lt;Object&gt;', H.c('y', 'Object only'), H.c('g', 'Integer')], [C('List<?>'), 'any List', 'Object', H.c('r', 'only null')]])}
<h4>3. PECS — Producer Extends, Consumer Super</h4>
<p>Ask of each parameter: "does my method <b>take values out</b> of it (it <b>produces</b> for me) or <b>put values in</b> (it <b>consumes</b> from me)?"</p>
${P(`
// src PRODUCES Ts → extends;  dest CONSUMES Ts → super
static <T> void copy(List<? super T> dest, List<? extends T> src) {
    for (T t : src) dest.add(t);
}
List<Integer> ints = List.of(1, 2);
List<Object> sink = new ArrayList<>();
copy(sink, ints);           // ✅ T = Integer; Object is "super", Integer is "extends"`)}
<p>The JDK is full of it: ${C('Collection.addAll(Collection<? extends E>)')}, ${C('Iterable.forEach(Consumer<? super T>)')}, ${C('List.sort(Comparator<? super E>)')}, ${C('Stream.map(Function<? super T, ? extends R>)')}. Note the Function: its <b>input</b> is consumed (super), its <b>output</b> produced (extends).</p>
<h4>4. Unbounded ? — "I do not care about the type"</h4>
<p>${C('static int countNulls(Collection<?> c)')} works for every collection. You can read (as Object), ${C('size()')}, ${C('clear()')}, ${C('remove(Object)')} — but not ${C('add(x)')}, because nobody knows the element type.</p>
<h4>5. Rules of thumb</h4>
<ul><li>Use wildcards on <b>parameters</b> of APIs; avoid them in <b>return types</b> (they force callers to deal with them).</li>
<li>If a parameter is both read from and written to, use an exact type (${C('List<T>')}).</li>
<li>If the type appears once, a wildcard is cleaner than a type parameter.</li></ul>`,
    clues: ['"why can\'t I pass a List&lt;Integer&gt; to a method taking List&lt;Number&gt;?" → invariance → <code>? extends</code>', '"write sum() that works for List&lt;Integer&gt; and List&lt;Double&gt;" → producer → <code>? extends Number</code>', '"add elements into a list that could be List&lt;Number&gt; or List&lt;Object&gt;" → consumer → <code>? super</code>', '"explain PECS" / "explain the signature of Collections.copy or Stream.map"', 'compile error mentioning <code>capture#1 of ?</code> → wildcard capture; use a private generic helper', '"difference between List, List&lt;Object&gt; and List&lt;?&gt;"'],
    code: [`
import java.util.*;
import java.util.function.*;

class Pecs {
    // PRODUCER: we only read Numbers out → ? extends
    static double sum(Collection<? extends Number> nums) {
        double s = 0;
        for (Number n : nums) s += n.doubleValue();
        return s;
    }

    // CONSUMER: we only put Integers in → ? super
    static void fillSquares(List<? super Integer> out, int n) {
        for (int i = 1; i <= n; i++) out.add(i * i);
    }

    // Both: src produces, dst consumes, the predicate consumes Ts (it takes them as input)
    static <T> void copyIf(Collection<? extends T> src, Predicate<? super T> keep, Collection<? super T> dst) {
        for (T t : src) if (keep.test(t)) dst.add(t);
    }

    // Unbounded: type does not matter at all
    static int countNulls(Collection<?> c) {
        int k = 0;
        for (Object o : c) if (o == null) k++;
        return k;
    }

    public static void main(String[] args) {
        List<Integer> ints = List.of(1, 2, 3);
        List<Double> doubles = List.of(1.5, 2.5);
        System.out.println(sum(ints) + " " + sum(doubles));   // 6.0 4.0

        List<Number> numbers = new ArrayList<>();
        List<Object> objects = new ArrayList<>();
        fillSquares(numbers, 3);                               // List<Number> is a List<? super Integer>
        fillSquares(objects, 2);                               // so is List<Object>
        System.out.println(numbers + " " + objects);           // [1, 4, 9] [1, 4]

        Predicate<Number> big = n -> n.doubleValue() > 1;      // a Predicate<Number> can judge Integers
        copyIf(ints, big, objects);                            // T = Integer
        System.out.println(objects);                           // [1, 4, 2, 3]
        System.out.println(countNulls(Arrays.asList("a", null, "b"))); // 1
    }
}`],
    codeTitle: ['Producer extends, consumer super, unbounded ?'],
    viz: [{
      title: 'PECS playground: what can you do with this list?',
      input: '? extends Number',
      inputLabel: 'Element type of list x: try ? extends Number, ? super Integer, ?, Number, Integer, ? extends Integer, ? super Number',
      gen: function (input) {
        var s = String(input || '').trim().replace(/\s+/g, ' ');
        var T = ['Object', 'Number', 'Integer', 'Double', 'String'];
        var m = s.match(/^\?(?: (extends|super) (Object|Number|Integer|Double|String))?$/);
        var kind, B;
        if (m) { kind = m[1] || 'any'; B = m[2] || 'Object'; }
        else if (T.indexOf(s) >= 0) { kind = 'exact'; B = s; }
        else throw new Error('Use one of: Number, Integer, ? extends Number, ? super Integer, ? (types allowed: Object, Number, Integer, Double, String)');
        function sub(a, b) { return a === b || b === 'Object' || (b === 'Number' && (a === 'Integer' || a === 'Double')); }
        var decl = 'List<' + s + '> x';
        var rows = [], frames = [];
        function canAssign(X) { return kind === 'exact' ? X === B : kind === 'extends' ? sub(X, B) : kind === 'super' ? sub(B, X) : true; }
        var readT = (kind === 'exact' || kind === 'extends') ? B : 'Object';
        function canWrite(W) { if (W === 'null') return true; return (kind === 'exact' || kind === 'super') ? sub(W, B) : false; }
        function hierHl() {
          var h = {};
          T.forEach(function (X) { h[X] = canAssign(X) ? 'ok' : 'done'; });
          return h;
        }
        var graph = { type: 'graph', label: 'Which List&lt;X&gt; can be assigned to x? (green = allowed)', directed: true, height: 48, nodes: [
          { id: 'Object', label: 'Object', x: 50, y: 6, shape: 'box' }, { id: 'Number', label: 'Number', x: 30, y: 24, shape: 'box' }, { id: 'String', label: 'String', x: 75, y: 24, shape: 'box' },
          { id: 'Integer', label: 'Integer', x: 15, y: 42, shape: 'box' }, { id: 'Double', label: 'Double', x: 45, y: 42, shape: 'box' }],
          edges: [['Number', 'Object'], ['String', 'Object'], ['Integer', 'Number'], ['Double', 'Number']], hl: hierHl() };
        var meaning = kind === 'exact' ? 'exactly <code>List&lt;' + B + '&gt;</code> — nothing else (invariance)' : kind === 'extends' ? 'a list of <b>some</b> type that is ' + B + ' or a subtype of it — we do not know which' : kind === 'super' ? 'a list of <b>some</b> type that is ' + B + ' or a supertype of it — we do not know which' : 'a list of <b>some</b> unknown type';
        frames.push({ narr: '<code>' + esc(decl) + '</code> means: x points to ' + meaning + '. Let\'s test assignments, reads and writes one by one.', parts: [{ type: 'code', label: 'Declaration', lang: 'java', code: decl + ';', hl: { 1: 'cur' } }, graph] });
        T.forEach(function (X) {
          var ok = canAssign(X);
          rows.push(['x = new ArrayList<' + X + '>()', ok ? '✓ compiles' : '✗ error']);
          var why = kind === 'exact' ? (ok ? 'Exact match.' : 'Generics are <b>invariant</b>: List&lt;' + X + '&gt; is not a List&lt;' + B + '&gt; even if ' + X + ' and ' + B + ' are related.') : kind === 'extends' ? (ok ? X + ' is ' + B + ' or a subtype → fits "? extends ' + B + '".' : X + ' is not a subtype of ' + B + '.') : kind === 'super' ? (ok ? X + ' is ' + B + ' or a supertype → fits "? super ' + B + '".' : X + ' is not a supertype of ' + B + '.') : 'An unbounded ? accepts a list of anything.';
          frames.push({ narr: '<b>Assign</b> a <code>List&lt;' + X + '&gt;</code>: ' + why, parts: [{ type: 'table', label: 'Operations on ' + esc(decl), columns: ['operation', 'result'], rows: rows.slice(), hl: one(rows.length - 1, ok ? 'ok' : 'bad') }, graph] });
        });
        ['Number', 'Object', 'Integer'].forEach(function (V) {
          var ok = sub(readT, V);
          rows.push([V + ' v = x.get(0)', ok ? '✓ compiles' : '✗ error']);
          var why = kind === 'super' || kind === 'any' ? 'Reading gives only <b>Object</b>: the real list could be a List&lt;Object&gt; holding anything. ' : 'Reading gives <b>' + readT + '</b>: whatever list x really is, every element IS-A ' + readT + '. ';
          frames.push({ narr: '<b>Read</b> into a ' + V + ': ' + why + (ok ? 'Assigning ' + readT + ' to ' + V + ' is fine.' : readT + ' is not a ' + V + ' → compile error (you would need a cast).'), parts: [{ type: 'table', label: 'Operations on ' + esc(decl), columns: ['operation', 'result'], rows: rows.slice(), hl: one(rows.length - 1, ok ? 'ok' : 'bad') }] });
        });
        [['Integer', 'x.add(1)'], ['Double', 'x.add(2.5)'], ['Object', 'x.add(new Object())'], ['null', 'x.add(null)']].forEach(function (w) {
          var ok = canWrite(w[0]);
          rows.push([w[1], ok ? '✓ compiles' : '✗ error']);
          var why = w[0] === 'null' ? '<code>null</code> belongs to every reference type, so it is always allowed.' : kind === 'extends' || kind === 'any' ? 'The real list might be a List&lt;' + (B === 'Integer' ? 'Integer' : 'Double') + '&gt; or anything else that fits — the compiler cannot prove the ' + w[0] + ' belongs, so <b>every add is rejected</b>. This is the "producer" side: read-only.' : ok ? 'Whatever the real list is (List&lt;' + B + '&gt; or a supertype), it can hold a ' + B + ', and ' + w[0] + ' is a ' + B + '. This is the "consumer" side.' : w[0] + ' is not a ' + B + ', so it might not fit the real list.';
          frames.push({ narr: '<b>Write</b> <code>' + esc(w[1]) + '</code>: ' + why, parts: [{ type: 'table', label: 'Operations on ' + esc(decl), columns: ['operation', 'result'], rows: rows.slice(), hl: one(rows.length - 1, ok ? 'ok' : 'bad') }] });
        });
        var verdict = kind === 'extends' ? 'a <b>Producer</b>: great to read from, useless to write to → use <code>extends</code> for inputs you read.' : kind === 'super' ? 'a <b>Consumer</b>: great to write ' + B + 's into, reads give Object → use <code>super</code> for outputs you fill.' : kind === 'any' ? 'read-only as Object; use it when the type truly does not matter (size, print, clear).' : 'both readable and writable, but only for exactly one type — the least flexible for callers.';
        frames.push({ narr: 'Verdict for <code>' + esc(decl) + '</code>: ' + verdict + ' Try another declaration in the input box to compare.', parts: [{ type: 'table', label: 'Summary for ' + esc(decl), columns: ['operation', 'result'], rows: rows, hl: (function () { var h = {}; rows.forEach(function (r, i) { h[i] = r[1].charAt(0) === '✓' ? 'ok' : 'bad'; }); return h; })() }, graph] });
        return frames;
      }
    }, {
      title: 'Arrays are covariant, generics are invariant',
      gen: function () {
        var code = 'Object[] objs = new String[2];      // compiles: arrays are covariant\nobjs[0] = "hi";                       // fine\nobjs[1] = 42;                         // compiles… ArrayStoreException at runtime\n\nList<Object> list = new ArrayList<String>(); // compile error: invariant\nList<? extends Object> ok = new ArrayList<String>(); // fine, but read-only';
        return codeFrames(code, [
          { l: 1, v: { 'objs (static type)': 'Object[]', 'real array': 'String[2]' }, hv: { 'real array': 'cur' }, narr: 'Arrays are <b>covariant</b>: a <code>String[]</code> IS-A <code>Object[]</code>. The array object remembers its real element type at runtime (arrays are <b>reified</b>).' },
          { l: 2, cls: 'ok', v: { 'objs[0]': '"hi"', 'real array': 'String[2]' }, narr: 'Storing a String: the JVM checks the real element type (String) — OK.' },
          { l: 3, cls: 'bad', v: { 'objs[1]': '42 ✗', 'real array': 'String[2]' }, hv: { 'objs[1]': 'bad' }, out: 'Exception in thread "main" java.lang.ArrayStoreException: java.lang.Integer', narr: 'The compiler allows it (static type is Object[]). At runtime the JVM checks every store and throws <span class="c-r">ArrayStoreException</span>. Safety, but <b>late</b>.' },
          { l: 5, cls: 'bad', v: { list: 'not created' }, out: 'error: incompatible types: ArrayList<String> cannot be converted to List<Object>', narr: 'Generics refuse the same trick at <b>compile time</b>. They have to: after erasure the list does not know it holds Strings, so there would be no runtime check to save you.' },
          { l: 6, cls: 'ok', v: { ok: 'ArrayList<String>' }, hv: { ok: 'ok' }, out: '', narr: 'If you need "a list of something that is an Object" use a wildcard. You get covariance for <b>reading</b>, and the compiler blocks <b>writing</b> — the safe half of what arrays give you.' }
        ], 'Arrays vs generics');
      }
    }],
    examples: [
      { title: 'Predict: which of these four calls compile?', html: `<p>Method: ${C('static double sum(List<Number> nums)')} (no wildcard).</p>
${H.table(['Call', 'Compiles?', 'Why'], [[C('sum(new ArrayList<Number>())'), H.c('g', 'yes'), 'exact match'], [C('sum(List.of(1, 2))'), H.c('g', 'yes'), 'target typing: List.of infers T = Number'], [C('List<Integer> li = List.of(1, 2); sum(li)'), H.c('r', 'no'), 'List&lt;Integer&gt; is not a List&lt;Number&gt;'], [C('sum(li) with sum(List<? extends Number>)'), H.c('g', 'yes'), 'wildcard fixes it']])}
<p>Note the sneaky second row: a <b>freshly created</b> list can adapt to the target; a variable that already has type ${C('List<Integer>')} cannot.</p>`, code: `
class SumDemo {
    static double sumExact(List<Number> nums) { double s = 0; for (Number n : nums) s += n.doubleValue(); return s; }
    static double sumAny(List<? extends Number> nums) { double s = 0; for (Number n : nums) s += n.doubleValue(); return s; }
    public static void main(String[] args) {
        System.out.println(sumExact(List.of(1, 2)));   // 3.0 — List.of inferred List<Number>
        List<Integer> li = List.of(1, 2);
        // sumExact(li);                              // does not compile
        System.out.println(sumAny(li));                // 3.0
    }
}` },
      { title: 'Does this compile? Adding to ? extends', html: `${P(`
List<? extends Number> nums = new ArrayList<Integer>();
nums.add(1);        // ❌ capture#1 of ? extends Number cannot accept int
nums.add(null);     // ✅ the only thing you can add
Number n = nums.get(0);   // ✅ reading is fine`)}
<p>The error message talks about <b>capture#1 of ? extends Number</b>: javac gives the unknown type a temporary name ("capture") and refuses any value it cannot prove belongs to it. Even ${C('add(1)')} is rejected, because the real list could be a ${C('List<Double>')}.</p>`, code: `
List<? extends Number> nums = new ArrayList<>(List.of(1, 2));
nums.add(null);                       // allowed
Number first = nums.get(0);           // reading as Number is allowed
nums.remove(0);                       // removing is allowed (remove takes an index/Object)
System.out.println(first + " " + nums); // 1 [2, null]` },
      { title: 'Wildcard capture: swap on a List&lt;?&gt;', html: `<p>${C('void swap(List<?> l, int i, int j) { l.set(i, l.get(j)); }')} fails — ${C('l.get(j)')} returns "capture of ?", and ${C('set')} will not accept it because javac cannot prove the two captures are the same type. The standard fix (used by ${C('Collections.swap')}) is a <b>private generic helper</b> that gives the unknown type a name:</p>`, code: `
class Swapper {
    public static void swap(List<?> list, int i, int j) {   // nice public API: any list
        swapHelper(list, i, j);                             // javac "captures" ? as T
    }
    private static <T> void swapHelper(List<T> list, int i, int j) {
        T tmp = list.get(i);
        list.set(i, list.get(j));
        list.set(j, tmp);
    }
    public static void main(String[] args) {
        List<String> s = new ArrayList<>(List.of("a", "b", "c"));
        swap(s, 0, 2);
        System.out.println(s);   // [c, b, a]
    }
}` },
      { title: 'Reading a JDK signature with PECS glasses', html: `${P(`
<R> Stream<R> map(Function<? super T, ? extends R> mapper)          // Stream<T>
static <T> void sort(List<T> list, Comparator<? super T> c)          // Collections
static <T> boolean addAll(Collection<? super T> c, T... elements)    // Collections
<U> CompletableFuture<U> thenApply(Function<? super T, ? extends U> fn)`)}
${H.table(['Parameter', 'Role', 'Lets you pass'], [['Function&lt;? super T, …&gt;', 'consumes T (input)', 'a Function&lt;Object, …&gt; on a Stream&lt;String&gt;'], ['Function&lt;…, ? extends R&gt;', 'produces R (output)', 'a function returning Integer when R = Number'], ['Comparator&lt;? super T&gt;', 'consumes T', 'one Comparator&lt;Number&gt; for List&lt;Integer&gt; and List&lt;Double&gt;'], ['Collection&lt;? super T&gt;', 'consumes T', 'add Strings into a Collection&lt;Object&gt;']])}`, code: `
Comparator<Number> byValue = Comparator.comparingDouble(Number::doubleValue);
List<Integer> ints = new ArrayList<>(List.of(3, 1, 2));
List<Double> dbls = new ArrayList<>(List.of(2.5, 0.5));
ints.sort(byValue);                 // Comparator<? super Integer> accepts Comparator<Number>
dbls.sort(byValue);                 // and the same comparator works for Doubles
Collection<Object> bag = new ArrayList<>();
Collections.addAll(bag, "a", "b");  // Collection<? super String>
System.out.println(ints + " " + dbls + " " + bag); // [1, 2, 3] [0.5, 2.5] [a, b]` }
    ],
    deepDive: `<p><b>Subtyping lattice.</b> For a fixed generic class: ${C('List<Integer>')} &lt;: ${C('List<? extends Integer>')} &lt;: ${C('List<? extends Number>')} &lt;: ${C('List<?>')}, and ${C('List<Number>')} &lt;: ${C('List<? super Integer>')} &lt;: ${C('List<?>')}. Also ${C('ArrayList<? extends Number>')} &lt;: ${C('List<? extends Number>')}. Wildcard types are <b>use-site variance</b> — the caller decides per variable. Kotlin and C# put variance on the declaration instead (${C('out T')} / ${C('in T')}); Scala uses ${C('+T')}/${C('-T')}.</p>
<p><b>Capture conversion</b> (JLS 5.1.10). Every time an expression of wildcard type is used, javac replaces each ${C('?')} with a fresh type variable ${C('CAP#1')} whose bounds come from the wildcard and the declared parameter bound. Two reads of the same variable get <b>different</b> captures, which is why ${C('l.set(i, l.get(j))')} fails and a helper method fixes it.</p>
<p><b>Why ? super lets you write.</b> For ${C('List<? super Integer>')}, ${C('CAP#1')} has lower bound Integer, so ${C('add(CAP#1)')} accepts any Integer (Integer &lt;: CAP#1). Reads return CAP#1 whose only known upper bound is Object.</p>
<p><b>Wildcards in return types</b> (${C('List<? extends Animal> getAnimals()')}) leak capture into every caller; Effective Java advises against it except when the return is intentionally read-only. ${C('Collections.unmodifiableList(List<? extends T>)')} returns ${C('List<T>')} for exactly this reason.</p>
<p><b>Nested wildcards.</b> ${C('List<List<? extends Number>>')} is <b>not</b> a supertype of ${C('List<List<Integer>>')} — wildcard flexibility applies only at the top level. You would need ${C('List<? extends List<? extends Number>>')}.</p>
<p><b>Unsoundness footnote.</b> Java's type system has known unsound corners (Amin &amp; Tate, 2016 — null + wildcard bounds), but they need contrived code; in practice, if code compiles without unchecked warnings it is heap-safe.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants can generate PECS-correct signatures, and many will even explain them — but they often produce the <i>exact-type</i> version first, because most training code does.</p>
<p><b>Use AI as a partner:</b> ask <code>"For each parameter of this method, is it a producer, consumer or both? Rewrite the signature with PECS and give me one call that only compiles after the change"</code>. Paste "capture#1 of ?" errors and ask for the helper-method fix.</p>
<p><b>Where AI goes wrong:</b> it puts ${C('? extends')} on a list it then tries to ${C('add')} to, returns wildcard types from public APIs, confuses ${C('List<?>')} with raw ${C('List')}, or "fixes" capture errors with unchecked casts.</p>
<p><b>What you must still own:</b> the PECS decision for every public API you design (it affects every caller for years), reading JDK signatures fluently in interviews, and recognising when flexibility is not worth the complexity — internal code can often just use ${C('List<T>')}.</p>`,
    problems: [{
      title: 'PECS-Correct copyIf(src, filter, dst)',
      level: 'Medium', tags: ['wildcards', 'PECS', 'generic method'], companies: ['Amazon', 'Goldman Sachs', 'Atlassian'],
      statement: `<p>Write ${C('copyIf(src, keep, dst)')} that copies every element of ${C('src')} for which ${C('keep.test(e)')} is true into ${C('dst')}, and returns how many were copied. The signature must be <b>maximally flexible</b>: this call must compile —</p>
${P(`
List<Integer> ints = List.of(1, 5, 8, 2);
Predicate<Number> big = n -> n.doubleValue() > 4;   // judges any Number
List<Object> out = new ArrayList<>();
int k = copyIf(ints, big, out);                       // must compile, k = 2, out = [5, 8]`)}`,
      constraints: `0 ≤ |src| ≤ 10<sup>6</sup>; dst is mutable; no casts and no unchecked warnings allowed.`,
      example: `<p>src = [1, 5, 8, 2], keep = "&gt; 4" → ${H.c('g', 'dst = [5, 8], returns 2')}. Order of src is preserved.</p>`,
      brute: { why: `<p>The "obvious" signature ${C('<T> int copyIf(List<T> src, Predicate<T> keep, List<T> dst)')} forces all three types to be <b>identical</b>. With src ${C('List<Integer>')}, keep ${C('Predicate<Number>')} and dst ${C('List<Object>')} there is no single T, so the call does not compile and the user has to copy lists or write adapters.</p>`, code: `
class CopyStrict {
    static <T> int copyIf(List<T> src, java.util.function.Predicate<T> keep, List<T> dst) {
        int k = 0;
        for (T t : src) if (keep.test(t)) { dst.add(t); k++; }
        return k;
    }
    public static void main(String[] args) {
        List<Integer> ints = List.of(1, 5, 8, 2);
        List<Integer> out = new ArrayList<>();
        System.out.println(copyIf(ints, n -> n > 4, out) + " " + out); // 2 [5, 8] — works only when all types match
    }
}` },
      mcq: { q: 'The filter <code>keep</code> receives elements of type T as input. Which wildcard should its type use?', options: ['<code>Predicate&lt;? extends T&gt;</code>', '<code>Predicate&lt;? super T&gt;</code>', '<code>Predicate&lt;?&gt;</code>', '<code>Predicate&lt;T&gt;</code> — wildcards do not apply to functional interfaces'], answer: 1, explain: 'The predicate CONSUMES Ts (they are its input), so it is a consumer → super. A Predicate&lt;Number&gt; or Predicate&lt;Object&gt; can safely judge Integers.' },
      hints: [`<p>Hint 1: classify each parameter. ${C('src')} — you only read from it (producer). ${C('dst')} — you only add to it (consumer). ${C('keep')} — it takes Ts as input (consumer).</p>`, `<p>Hint 2: Producer Extends, Consumer Super: ${C('Collection<? extends T> src')}, ${C('Predicate<? super T> keep')}, ${C('Collection<? super T> dst')}. Using ${C('Collection')} instead of ${C('List')} also lets callers pass a Set.</p>`, `<p>Hint 3: inside the loop the element type is T, so ${C('keep.test(t)')} and ${C('dst.add(t)')} both type-check. Edge cases: empty src → return 0; dst same object as src → ConcurrentModificationException risk (document or forbid).</p>`],
      solution: {
        approach: `<p>Apply PECS to all three parameters. T is inferred as Integer (from src); ${C('Predicate<Number>')} fits ${C('Predicate<? super Integer>')} and ${C('List<Object>')} fits ${C('Collection<? super Integer>')}.</p>`,
        code: `
import java.util.*;
import java.util.function.*;

class CopyIf {
    static <T> int copyIf(Collection<? extends T> src, Predicate<? super T> keep, Collection<? super T> dst) {
        int copied = 0;
        for (T t : src) {                 // reading from a producer: each element is a T
            if (keep.test(t)) {           // the predicate accepts T (or something more general)
                dst.add(t);               // writing T into a consumer: always safe
                copied++;
            }
        }
        return copied;
    }

    public static void main(String[] args) {
        List<Integer> ints = List.of(1, 5, 8, 2);
        Predicate<Number> big = n -> n.doubleValue() > 4;
        List<Object> out = new ArrayList<>();
        int k = copyIf(ints, big, out);
        System.out.println(k + " " + out);                     // 2 [5, 8]

        Set<CharSequence> words = new TreeSet<>(Comparator.comparing(CharSequence::toString));
        copyIf(List.of("a", "bb", "ccc"), s -> s.length() > 1, words); // T = String
        System.out.println(words);                             // [bb, ccc]
    }
}`,
        dry: { head: ['t (T = Integer)', 'keep.test(t) — Predicate&lt;Number&gt;', 'dst (List&lt;Object&gt;)', 'copied'], rows: [['1', '1 &gt; 4 → false', '[]', '0'], ['5', '5 &gt; 4 → true', '[5]', '1'], ['8', '8 &gt; 4 → true', '[5, 8]', '2'], ['2', '2 &gt; 4 → false', '[5, 8]', H.c('g', '2 → return')]] },
        complexity: `<p>O(n) predicate calls and adds; O(1) extra space. Wildcards are compile-time only — the bytecode is identical to the strict version.</p>`,
        followUps: ['Return the destination itself so calls can be chained — what should the return type be? (a type parameter <code>&lt;C extends Collection&lt;? super T&gt;&gt; C</code>)', 'Write the same with streams: <code>src.stream().filter(keep).forEach(dst::add)</code> — which wildcards does Stream.filter use?', 'Why would <code>List&lt;? extends T&gt; dst</code> be useless here?']
      }
    }]
  });

  registerModule({ id: 'java08', title: 'Generics', lang: 'java', intro: `<p>stub</p>`, goals: [], prereqs: `x`, hours: 12, topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
