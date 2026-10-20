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
      tests: { sig: 'string[] -> string[]', fn: 'run', harness: { java: `
class Check {
  static String[] run(String[] ops) {
    Stack<String> s = new Stack<>();
    List<String> out = new ArrayList<>();
    for (String op : ops) {
      try {
        if (op.startsWith("push:")) s.push(op.substring(5));
        else if (op.equals("pop")) out.add(s.pop());
        else if (op.equals("peek")) out.add(s.peek());
        else if (op.equals("isEmpty")) out.add(String.valueOf(s.isEmpty()));
        else if (op.equals("size")) out.add(String.valueOf(s.size()));
      } catch (Exception e) { out.add(e.getClass().getSimpleName()); }
    }
    return out.toArray(new String[0]);
  }
}` }, cases: [
          [[['push:a', 'push:b', 'peek', 'pop', 'pop', 'isEmpty', 'pop']], ['b', 'b', 'a', 'true', 'NoSuchElementException']],
          [[['isEmpty', 'size', 'pop', 'peek']], ['true', '0', 'NoSuchElementException', 'NoSuchElementException']],
          [[['push:x', 'push:x', 'push:x', 'size', 'pop', 'size']], ['3', 'x', '2']],
          [[['push:', 'isEmpty', 'peek', 'size']], ['false', '', '1']],
          [[['push:1', 'push:2', 'pop', 'push:3', 'peek', 'pop', 'pop', 'pop']], ['2', '3', '3', '1', 'NoSuchElementException']],
          [[['push:a', 'pop', 'isEmpty', 'peek']], ['a', 'true', 'NoSuchElementException']],
          [[{ $concat: [{ $rep: 'push:k', n: 200000 }, ['size', 'peek']] }], ['200000', 'k']],
          [[{ $concat: [{ $rep: 'push:k', n: 100000 }, { $rep: 'pop', n: 100000 }, ['isEmpty', 'size']] }], { $concat: [{ $rep: 'k', n: 100000 }, ['true', '0']] }]
        ] },
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
      tests: { sig: 'list<string> -> string', fn: 'run', harness: { java: `
class Check {
  static String run(List<String> items) {
    try { return String.valueOf(Mode.mode(items)); }
    catch (IllegalArgumentException e) { return "IAE"; }
  }
}` }, cases: [
          [[['b', 'a', 'b', 'a', 'c']], 'b'],
          [[['3', '1', '1']], '1'],
          [[[]], 'IAE'],
          [[['x']], 'x'],
          [[['a', 'b']], 'a'],
          [[['b', 'a', 'a', 'b']], 'b'],
          [[[null, 'a', null]], 'null'],
          [[['a', null, 'a', null]], 'a'],
          [[{ $concat: [{ $rep: 'a', n: 50000 }, { $rep: 'b', n: 50000 }] }], 'a'],
          [[{ $concat: [['a'], { $rep: 'b', n: 100000 }] }], 'b']
        ] },
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
        if (!String(input || '').trim()) throw new Error('Enter whole numbers separated by spaces, e.g. 4 9 2');
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
      tests: { sig: 'string string string string -> string', fn: 'run', harness: { java: `
class Check {
  static class Fr implements Comparable<Fr> {
    final int w; Fr(int w) { this.w = w; }
    public int compareTo(Fr o) { return Integer.compare(w, o.w); }
    public String toString() { return getClass().getSimpleName() + w; }
  }
  static class Ap extends Fr { Ap(int w) { super(w); } }
  static String run(String kind, String v, String lo, String hi) {
    try {
      switch (kind) {
        case "int": return String.valueOf(Clamp.clamp(Integer.parseInt(v), Integer.parseInt(lo), Integer.parseInt(hi)));
        case "str": return Clamp.clamp(v, lo, hi);
        case "date": return String.valueOf(Clamp.clamp(LocalDate.parse(v), LocalDate.parse(lo), LocalDate.parse(hi)));
        default: return String.valueOf(Clamp.clamp(new Ap(Integer.parseInt(v)), new Ap(Integer.parseInt(lo)), new Ap(Integer.parseInt(hi))));
      }
    } catch (IllegalArgumentException e) { return "IAE"; }
  }
}` }, cases: [
          [['int', '15', '0', '10'], '10'],
          [['int', '-3', '0', '10'], '0'],
          [['int', '5', '0', '10'], '5'],
          [['int', '0', '0', '10'], '0'],
          [['int', '10', '0', '10'], '10'],
          [['int', '7', '7', '7'], '7'],
          [['int', '5', '9', '1'], 'IAE'],
          [['int', '-2147483648', '-5', '5'], '-5'],
          [['int', '2147483647', '-5', '2147483646'], '2147483646'],
          [['str', 'm', 'a', 'k'], 'k'],
          [['str', 'apple', 'b', 'k'], 'b'],
          [['str', 'cat', 'b', 'k'], 'cat'],
          [['str', 'z', 'k', 'a'], 'IAE'],
          [['date', '2020-01-01', '2021-01-01', '2022-01-01'], '2021-01-01'],
          [['date', '2030-05-05', '2021-01-01', '2022-01-01'], '2022-01-01'],
          [['fruit', '3', '5', '9'], 'Ap5'],
          [['fruit', '6', '5', '9'], 'Ap6'],
          [['fruit', '6', '9', '5'], 'IAE']
        ] },
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
      tests: { sig: 'int[] int[] int -> int[]', fn: 'run', harness: { java: `
class Check {
  static int[] run(int[] src, int[] existing, int t) {
    List<Integer> ints = new ArrayList<>(); for (int x : src) ints.add(x);
    Predicate<Number> big = n -> n.doubleValue() > t;
    List<Object> out = new ArrayList<>(); for (int x : existing) out.add(x);
    int k = CopyIf.copyIf(ints, big, out);
    int[] r = new int[out.size() + 1]; r[0] = k;
    for (int i = 0; i < out.size(); i++) r[i + 1] = (Integer) out.get(i);
    return r;
  }
}` }, cases: [
          [[[1, 5, 8, 2], [], 4], [2, 5, 8]],
          [[[], [], 0], [0]],
          [[[1, 2, 3], [], 10], [0]],
          [[[3, 3, 3], [], 0], [3, 3, 3, 3]],
          [[[-5, -1, 0], [], -2], [2, -1, 0]],
          [[[5, 1], [9], 4], [1, 9, 5]],
          [[[4, 4, 5], [], 4], [1, 5]],
          [[{ $range: [0, 100000] }, [], 99989], { $concat: [[10], { $range: [99990, 100000] }] }]
        ] },
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

  /* ======================================================================
     TOPIC 5 — Type erasure and its consequences
     ====================================================================== */
  topics.push({
    title: 'Type Erasure: What Survives to Runtime (and What Does Not)',
    analogy: `<p>Think of a <b>parcel sorting centre</b>. At the front desk (compile time) a strict clerk reads every label — "<i>fragile glass, this way up, for Asha</i>" — and refuses parcels whose label does not match the form. Once accepted, the labels are <b>peeled off</b> and every parcel becomes a plain brown box on the conveyor belt (runtime). The belt still works perfectly, but if someone later asks a box "<i>are you glass for Asha?</i>" the box cannot answer — that is why ${C('instanceof List<String>')} is impossible. And if someone sneaks a box in through the back door (a raw type), nobody notices until a customer opens it and finds a brick: a ${C('ClassCastException')} far from where the mistake happened.</p>`,
    explain: `<p><b>Type erasure</b> means: generics are checked by the compiler and then <b>removed</b>. The JVM runs the same bytecode it ran before Java 5. javac does three things:</p>
<ol><li><b>Replace</b> every type parameter with its bound — ${C('T')} → ${C('Object')}, ${C('T extends Number')} → ${C('Number')} (the first bound).</li>
<li><b>Insert casts</b> (${C('checkcast')} instructions) where your code reads a T into a concrete type.</li>
<li><b>Generate bridge methods</b> so overriding still works after the types are erased.</li></ol>
${P(`
// You write                                  // The JVM sees (roughly)
List<String> list = new ArrayList<>();        List list = new ArrayList();
list.add("hi");                               list.add("hi");
String s = list.get(0);                       String s = (String) list.get(0);`)}
<h4>Consequences — the famous "you cannot" list</h4>
${H.table(['You cannot…', 'Because…', 'Do this instead'], [[C('new T()'), 'T is unknown at runtime', 'pass a ' + C('Supplier<T>') + ' or ' + C('Class<T>')], [C('new T[n]') + ', ' + C('new List<String>[n]'), 'arrays must know their element type at runtime', C('Object[]') + ' + cast, ' + C('Array.newInstance') + ', ' + C('IntFunction<T[]>')], [C('x instanceof List<String>'), 'the runtime object has no &lt;String&gt;', C('x instanceof List<?>') + ' then check elements'], [C('List<String>.class'), 'only one Class object exists: ' + C('List.class'), 'a ' + C('Class<T>') + ' token or a TypeReference'], [C('void f(List<String>)') + ' + ' + C('void f(List<Integer>)'), 'both erase to ' + C('f(List)') + ' — "name clash: same erasure"', 'different method names'], [C('static T field'), 'one static per class, not per T', 'instance field, or a Map keyed by Class'], [C('catch (T e)') + ', ' + C('class Oops<T> extends Exception'), 'catch needs a runtime type', 'non-generic exception classes'], [C('List<int>'), 'erasure needs Object-compatible types', C('List<Integer>') + ' or ' + C('int[]')]])}
<h4>Reifiable vs non-reifiable</h4>
<p>A type is <b>reifiable</b> if its full information exists at runtime: primitives, non-generic classes (${C('String')}), raw types (${C('List')}), unbounded wildcards (${C('List<?>')}) and arrays of these. ${C('List<String>')}, ${C('T')} and ${C('List<? extends Number>')} are <b>non-reifiable</b>.</p>
<h4>The unchecked cast that does not check</h4>
${P(`
@SuppressWarnings("unchecked")
static <T> T unsafeCast(Object o) { return (T) o; }   // erased to (Object) o — checks NOTHING
Object  ok  = unsafeCast(42);   // no exception at all
String  bad = unsafeCast(42);   // ClassCastException HERE, at the caller's hidden checkcast`)}
<p>${C('(T) o')} compiles to nothing. The real cast happens later, wherever a concrete type is needed — often in someone else's code. That is <b>heap pollution</b> (more in Topic 6).</p>`,
    clues: ['"what is type erasure and why did Java choose it?" (classic intermediate/senior question)', '"why can\'t I do new T() / new T[] / instanceof List&lt;String&gt;?"', 'error "name clash: … have the same erasure"', '"ClassCastException on a line with no cast" → hidden checkcast from erasure', '"how do Jackson / Gson deserialize List&lt;User&gt;?" → super type tokens / TypeReference', '"what is a bridge method?" / javap shows a synthetic method you did not write'],
    code: [`
import java.util.*;
import java.util.function.*;
import java.lang.reflect.*;

class ErasureDemo {
    List<String> names = new ArrayList<>();          // field's generic type is kept in the class file

    // Workaround for "new T()": ask the caller for a factory
    static <T> List<T> fill(int n, Supplier<T> factory) {
        List<T> out = new ArrayList<>();
        for (int i = 0; i < n; i++) out.add(factory.get());
        return out;
    }

    // Workaround for "instanceof T": a Class<T> token checks at runtime for real
    static <T> List<T> onlyOfType(List<?> mixed, Class<T> type) {
        List<T> out = new ArrayList<>();
        for (Object o : mixed) if (type.isInstance(o)) out.add(type.cast(o));   // checked cast
        return out;
    }

    public static void main(String[] args) throws Exception {
        List<String> a = new ArrayList<>();
        List<Integer> b = new ArrayList<>();
        System.out.println(a.getClass() == b.getClass());          // true — one runtime class
        System.out.println(a.getClass().getName());                // java.util.ArrayList

        Object o = a;
        System.out.println(o instanceof List<?>);                  // true  (List<String> is not allowed here)

        System.out.println(fill(2, StringBuilder::new).size());    // 2
        System.out.println(onlyOfType(List.of(1, "x", 2.5, "y"), String.class)); // [x, y]

        Field f = ErasureDemo.class.getDeclaredField("names");
        System.out.println(f.getType());          // interface java.util.List      (erased)
        System.out.println(f.getGenericType());   // java.util.List<java.lang.String> (Signature attribute)
    }
}`],
    codeTitle: ['Erasure in action and the standard workarounds'],
    viz: [{
      title: 'Source vs erased view of a bounded generic class',
      gen: function () {
        var src = 'class Box<T extends Comparable<T>> {\n    private T value;\n    Box(T v) { value = v; }\n    T get() { return value; }\n    boolean bigger(T other) { return value.compareTo(other) > 0; }\n}\nBox<String> b = new Box<>("kiwi");\nString s = b.get();\nboolean big = b.bigger("fig");';
        var era = 'class Box {\n    private Comparable value;\n    Box(Comparable v) { value = v; }\n    Comparable get() { return value; }\n    boolean bigger(Comparable other) { return value.compareTo(other) > 0; }\n}\nBox b = new Box("kiwi");\nString s = (String) b.get();      // checkcast inserted by javac\nboolean big = b.bigger("fig");';
        return srcVsErased(src, era, [
          { a: 1, b: 1, narr: 'The type parameter list <code>&lt;T extends Comparable&lt;T&gt;&gt;</code> disappears from the class. There is exactly <b>one</b> <code>Box</code> class at runtime, whatever T is.' },
          { a: 2, b: 2, cls: 'sel', narr: 'Every <code>T</code> becomes its <b>first bound</b>: <code>Comparable</code>. (Without a bound it would be <code>Object</code>.)' },
          { a: [3, 4], b: [3, 4], cls: 'sel', narr: 'Constructor and getter: parameter and return types are erased the same way. The method descriptor in the class file is <code>get()Ljava/lang/Comparable;</code>.' },
          { a: 5, b: 5, cls: 'ok', narr: '<code>value.compareTo(other)</code> compiles in the source because of the bound; after erasure it is a normal interface call on <code>Comparable</code>.' },
          { a: 7, b: 7, narr: 'At the use site, <code>Box&lt;String&gt;</code> becomes plain <code>Box</code>. The diamond and the type argument leave no trace in the bytecode of this line.' },
          { a: 8, b: 8, cls: 'ok', cls2: 'sel', narr: '<b>The hidden cast.</b> <code>get()</code> really returns Comparable, so javac inserts <code>checkcast String</code>. Your source has no cast, yet a ClassCastException can be thrown <b>on this line</b> if the box was polluted.', extra: [note('javap -c (excerpt)', '<code>invokevirtual Box.get:()Ljava/lang/Comparable;<br>checkcast java/lang/String<br>astore_2</code>')] },
          { a: 9, b: 9, narr: 'Passing <code>"fig"</code>: compile-time check against T = String; at runtime it is just a Comparable argument. No cast needed for arguments.' },
          { a: [1, 7, 8], b: [1, 7, 8], cls: 'done', cls2: 'sel', narr: 'Summary: checks happen in the source view (left), the program runs in the erased view (right). The only runtime traces of generics are the <b>casts</b> and some <b>metadata</b> (Signature attributes) that reflection can read.', extra: [{ type: 'table', label: 'Erasure rules', columns: ['declared', 'erases to'], rows: [['T', 'Object'], ['T extends Number', 'Number'], ['T extends Number & Comparable<T>', 'Number (first bound)'], ['List<String>', 'List'], ['T[]', 'Object[] (or bound[])']] }] }
        ]);
      }
    }, {
      title: 'Bridge methods: how overriding survives erasure',
      gen: function () {
        var src = 'class Node<T> {\n    T data;\n    void setData(T d) { data = d; }\n}\nclass IntNode extends Node<Integer> {\n    @Override void setData(Integer d) { super.setData(d); }\n}\nNode<Integer> n = new IntNode();\nn.setData(5);\nNode raw = n;\nraw.setData("hello");';
        var era = 'class Node {\n    Object data;\n    void setData(Object d) { data = d; }\n}\nclass IntNode extends Node {\n    void setData(Integer d) { super.setData(d); }\n    /* synthetic bridge */ void setData(Object d) { setData((Integer) d); }\n}\nNode n = new IntNode();\nn.setData(5);   // invokevirtual Node.setData(Object)\nNode raw = n;\nraw.setData("hello");';
        return srcVsErased(src, era, [
          { a: 3, b: 3, narr: 'After erasure <code>Node.setData(T)</code> becomes <code>setData(Object)</code>.' },
          { a: 6, b: 6, narr: '<code>IntNode.setData(Integer)</code> keeps its Integer parameter. Problem: <code>setData(Integer)</code> and <code>setData(Object)</code> are <b>different signatures</b> to the JVM — it is an overload, not an override!' },
          { a: 6, b: 7, cls: 'ok', narr: 'So javac generates a <b>synthetic bridge method</b> <code>setData(Object)</code> in IntNode that casts and forwards. Now the JVM override works. (Reflection: <code>Method.isBridge() == true</code>.)' },
          { a: 9, b: [10, 7, 6], cls: 'ok', narr: '<code>n.setData(5)</code> compiles to a call of <code>Node.setData(Object)</code>. Dynamic dispatch finds IntNode\'s bridge, which casts 5 to Integer and calls the real method.', extra: [{ type: 'stack', label: 'Call stack', items: ['main', 'IntNode.setData(Object)  [bridge]', 'IntNode.setData(Integer)'], hl: { 2: 'cur' } }] },
          { a: 11, b: [12, 7], cls: 'bad', narr: 'Through a raw reference, <code>raw.setData("hello")</code> compiles (with a warning). The bridge runs <code>(Integer) "hello"</code> → <span class="c-r">ClassCastException inside a method you never wrote</span>. The bridge is also what keeps the heap safe here.', extra: [{ type: 'stack', label: 'Call stack', items: ['main', 'IntNode.setData(Object)  [bridge] ✗ CCE'], hl: { 1: 'bad' } }, out('java.lang.ClassCastException: class java.lang.String cannot be cast to class java.lang.Integer')] },
          { a: [5, 6], b: [5, 6, 7], cls: 'sel', narr: 'Bridges also appear for <b>covariant return types</b> and for classes like <code>String implements Comparable&lt;String&gt;</code>: String has a synthetic <code>compareTo(Object)</code> that casts and calls <code>compareTo(String)</code>.' }
        ]);
      }
    }, {
      title: 'Is this type reifiable? (what you may do with it at runtime)',
      input: 'List<String>',
      inputLabel: 'A type, e.g. List<String>, List<?>, String[], List<?>[], Map<String,Integer>, int, T, ArrayList',
      gen: function (input) {
        var t = String(input || '').replace(/\s+/g, '');
        if (!t || t.length > 50 || !/^[A-Za-z_][A-Za-z0-9_<>,?\[\]]*$/.test(t)) throw new Error('Enter a Java type like List<String>, List<?>, String[] or int');
        var depth = 0;
        for (var i = 0; i < t.length; i++) { if (t[i] === '<') depth++; if (t[i] === '>') depth--; if (depth < 0) break; }
        if (depth !== 0) throw new Error('Angle brackets do not balance — try List<String>');
        var dims = 0, base = t;
        while (/\[\]$/.test(base)) { base = base.slice(0, -2); dims++; }
        var prims = ['int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short'];
        var reason, reif, kind;
        var lt = base.indexOf('<');
        var name = lt < 0 ? base : base.slice(0, lt);
        var args = lt < 0 ? '' : base.slice(lt + 1, -1);
        if (prims.indexOf(base) >= 0) { reif = true; kind = 'primitive'; reason = 'Primitives are always fully known at runtime.'; }
        else if (/^[A-Z]$/.test(base)) { reif = false; kind = 'type variable'; reason = 'A type variable like ' + base + ' is erased to its bound — the runtime does not know what it was.'; }
        else if (lt < 0) { reif = true; kind = 'plain class / raw type'; reason = name + ' has no type arguments, so nothing was erased (if ' + name + ' is generic, this is its raw type).'; }
        else if (args.split(',').every(function (x) { return x === '?'; })) { reif = true; kind = 'unbounded wildcard'; reason = 'All type arguments are unbounded <code>?</code> — that claims nothing that erasure removed, so it is reifiable.'; }
        else { reif = false; kind = 'parameterized type'; reason = 'The arguments <code>&lt;' + esc(args) + '&gt;</code> are erased at runtime, so the JVM cannot check them.'; }
        var shown = t;
        var frames = [];
        frames.push({ narr: 'Type: <code>' + esc(shown) + '</code>' + (dims ? ' — an array (' + dims + 'D) of <code>' + esc(base) + '</code>. An array is reifiable exactly when its element type is.' : '.'), parts: [{ type: 'vars', label: 'Parsed', vals: { type: shown, 'element / base': base, 'array dims': dims, kind: kind }, hl: { kind: 'cur' } }] });
        frames.push({ narr: reason + ' → <b>' + (reif ? '<span class="c-g">reifiable</span>' : '<span class="c-r">NOT reifiable</span>') + '</b>.', parts: [{ type: 'vars', label: 'Verdict', vals: { type: shown, reifiable: reif ? 'yes' : 'no' }, hl: { reifiable: reif ? 'ok' : 'bad' } }, { type: 'table', label: 'Reifiable types', columns: ['kind', 'examples', 'reifiable?'], rows: [['primitive', 'int, double', 'yes'], ['non-generic class', 'String, Integer', 'yes'], ['raw type', 'List, Map', 'yes'], ['unbounded wildcard', 'List<?>, Map<?,?>', 'yes'], ['array of reifiable', 'String[], List<?>[]', 'yes'], ['parameterized', 'List<String>, List<? extends Number>', 'no'], ['type variable', 'T, E', 'no']], hl: one(kind === 'primitive' ? 0 : kind === 'plain class / raw type' ? 1 : kind === 'unbounded wildcard' ? 3 : kind === 'type variable' ? 6 : 5, reif ? 'ok' : 'bad') }] });
        var isPrim = prims.indexOf(base) >= 0 && !dims;
        var inst = isPrim ? 'n/a for primitives' : reif ? 'allowed' : (kind === 'parameterized type' ? 'error (unless the cast would be safe, Java 16+)' : 'error');
        frames.push({ narr: '<code>obj instanceof ' + esc(shown) + '</code>: ' + (isPrim ? 'primitives are not objects, so instanceof does not apply.' : reif ? '<span class="c-g">allowed</span> — the JVM can check it.' : '<span class="c-r">not allowed</span> in general: "Object cannot be safely cast to ' + esc(shown) + '". (Java 16+ accepts it only when the static type already guarantees the arguments, e.g. a <code>List&lt;String&gt;</code> variable tested against <code>ArrayList&lt;String&gt;</code>.)'), parts: [{ type: 'code', label: 'instanceof', lang: 'java', code: 'if (obj instanceof ' + shown + ') { }', hl: { 1: isPrim ? 'done' : reif ? 'ok' : 'bad' } }, { type: 'vars', vals: { instanceof: inst }, hl: { instanceof: reif && !isPrim ? 'ok' : 'bad' } }] });
        var arrOk = reif;
        frames.push({ narr: '<code>new ' + esc(base) + '[10]</code>: ' + (arrOk ? '<span class="c-g">allowed</span> — the array can record its element type.' : '<span class="c-r">"generic array creation" error</span> — an array must store its exact element type at runtime, and this one was erased (Topic 6).'), parts: [{ type: 'code', label: 'Array creation', lang: 'java', code: 'Object arr = new ' + base + '[10' + ']' + '[]'.repeat(dims) + ';', hl: { 1: arrOk ? 'ok' : 'bad' } }] });
        var lit = (lt < 0) ? 'allowed (' + shown + '.class)' : 'error: only the raw ' + name + '.class exists';
        if (kind === 'type variable') lit = 'error: T.class does not exist — pass a Class<T> token';
        frames.push({ narr: 'Class literal <code>' + esc(shown) + '.class</code>: ' + esc(lit) + '. There is one <code>Class</code> object per runtime class, never per parameterization.', parts: [{ type: 'vars', label: 'Class literal', vals: { literal: shown + '.class', result: lit }, hl: { result: lt < 0 && kind !== 'type variable' ? 'ok' : 'bad' } }] });
        frames.push({ narr: 'Summary for <code>' + esc(shown) + '</code>. Try <code>List&lt;?&gt;[]</code> (allowed!), <code>T</code>, or <code>Map&lt;String,Integer&gt;</code>.', parts: [{ type: 'table', label: 'What you can do at runtime', columns: ['operation', 'result'], rows: [['reifiable', reif ? 'yes' : 'no'], ['instanceof', inst], ['new X[n]', arrOk ? 'allowed' : 'generic array creation error'], ['X.class', lit]], hl: { 0: reif ? 'ok' : 'bad' } }] });
        return frames;
      }
    }],
    examples: [
      { title: 'Predict the output: getClass() and erasure', html: `<p>All parameterizations share one runtime class. Even ${C('List.of')} implementations are chosen by size, not by type argument.</p>
${H.table(['Expression', 'Prints'], [[C('new ArrayList<String>().getClass() == new ArrayList<Integer>().getClass()'), H.c('g', 'true')], [C('new ArrayList<String>().getClass().getName()'), 'java.util.ArrayList'], [C('new ArrayList<String>() instanceof ArrayList<?>'), 'true']])}`, code: `
System.out.println(new ArrayList<String>().getClass() == new ArrayList<Integer>().getClass()); // true
System.out.println(new ArrayList<String>().getClass().getName());                          // java.util.ArrayList
Object o = new ArrayList<String>();
System.out.println(o instanceof ArrayList<?>);                                             // true` },
      { title: 'Does this compile? Overloads with the same erasure', html: `${P(`
class Printer {
    void print(List<String> s)  { }
    void print(List<Integer> i) { }   // ❌ name clash: print(List<Integer>) and print(List<String>) have the same erasure
}`)}
<p>Both erase to ${C('print(List)')} — the JVM could not tell them apart. Use different names (${C('printNames')}, ${C('printIds')}). Note: overloads that differ by <b>return type</b> only are not allowed either, generic or not.</p>`, code: `
class Printer {
    void printNames(List<String> names) { names.forEach(n -> System.out.println("name " + n)); }
    void printIds(List<Integer> ids)    { ids.forEach(i -> System.out.println("id " + i)); }
    public static void main(String[] args) {
        new Printer().printNames(List.of("asha"));   // name asha
        new Printer().printIds(List.of(7));          // id 7
    }
}` },
      { title: 'Predict where the ClassCastException is thrown', html: `<p>${C('unsafeCast')} returns ${C('(T) o')}, which erases to a no-op. The exception happens at the caller's <b>hidden checkcast</b> — and only if the caller needs a concrete type.</p>
${H.table(['Line', 'Exception?', 'Why'], [[C('Object a = unsafeCast(42);'), H.c('g', 'no'), 'T inferred as Object → no cast inserted'], [C('Integer b = unsafeCast(42);'), H.c('g', 'no'), 'checkcast Integer succeeds'], [C('String c = unsafeCast(42);'), H.c('r', 'yes, on THIS line'), 'checkcast String fails — not inside unsafeCast']])}`, code: `
class UnsafeCast {
    @SuppressWarnings("unchecked")
    static <T> T unsafeCast(Object o) { return (T) o; }   // compiles to just "return o"
    public static void main(String[] args) {
        Object a = unsafeCast(42);
        Integer b = unsafeCast(42);
        System.out.println(a + " " + b);                   // 42 42
        try {
            String c = unsafeCast(42);                    // CCE thrown here, at the caller
        } catch (ClassCastException e) {
            System.out.println("CCE at the call site");
        }
    }
}` },
      { title: 'Super type tokens: how Jackson reads List&lt;User&gt;', html: `<p>Erasure removes type arguments from <b>objects</b>, but the class file keeps them for <b>declarations</b> (fields, method signatures, superclasses) in Signature attributes. An anonymous subclass ${C('new TypeRef<List<String>>() {}')} records ${C('List<String>')} as its generic superclass — reflection can read it back. Jackson's ${C('TypeReference')}, Gson's ${C('TypeToken')} and Spring's ${C('ParameterizedTypeReference')} all use this trick.</p>`, code: `
import java.lang.reflect.*;

abstract class TypeRef<T> {
    final Type type;
    protected TypeRef() {
        // getGenericSuperclass() returns TypeRef<List<String>> for the anonymous subclass below
        type = ((ParameterizedType) getClass().getGenericSuperclass()).getActualTypeArguments()[0];
    }
}
class TokenDemo {
    public static void main(String[] args) {
        TypeRef<List<String>> ref = new TypeRef<List<String>>() {};   // note the {} — an anonymous subclass
        System.out.println(ref.type);   // java.util.List<java.lang.String>
    }
}` }
    ],
    deepDive: `<p><b>Why erasure?</b> Migration compatibility (2004): millions of lines of pre-generic code and compiled libraries had to keep working, and a generic ${C('ArrayList')} had to be the <b>same class</b> as the old one so old and new code could pass lists to each other. C# (2005) chose <b>reified</b> generics and created a separate ${C('System.Collections.Generic')} namespace instead — runtime type info and value-type specialization, at the cost of a split library.</p>
<p><b>What actually survives.</b> The class file keeps a ${C('Signature')} attribute for classes, fields and methods, readable through ${C('getGenericType()')}, ${C('getGenericReturnType()')}, ${C('getGenericSuperclass()')} and ${C('getTypeParameters()')}. Local variables keep generic info only in the optional LocalVariableTypeTable (debug info). <b>Objects</b> keep nothing: an ArrayList instance does not know its E.</p>
<p><b>Bridge methods</b> are flagged ${C('ACC_BRIDGE | ACC_SYNTHETIC')}. They appear when (1) a subclass overrides a generic method with a concrete parameter type, (2) a class implements a generic interface (${C('Comparable<String>')} → ${C('compareTo(Object)')}), and (3) covariant return types. Stack traces sometimes show them as an extra frame on the same line number.</p>
<p><b>Java 16+ instanceof refinement.</b> ${C('list instanceof ArrayList<String> al')} compiles when ${C('list')} is statically a ${C('List<String>')}, because the check is then provably safe (JEP 394). ${C('obj instanceof List<String>')} on an ${C('Object')} still fails.</p>
<p><b>Performance reality.</b> ${C('checkcast')} is very cheap and often eliminated by the JIT through type profiling. The real erasure costs are design-level: boxing, inability to specialise, and API workarounds (Class tokens, factories). Project Valhalla's goal of specialized generics targets exactly these.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI can decompile and annotate bytecode (${C('javap -c')}) in seconds, which makes erasure, hidden casts and bridge methods easy to <i>see</i> instead of memorise.</p>
<p><b>Use AI as a partner:</b> paste a stack trace with a ClassCastException on a line without a cast and ask <code>"Which hidden checkcast threw this, and where could the wrong element have entered the collection?"</code>. Ask for a "source vs erased" rewrite of a class to check your understanding.</p>
<p><b>Where AI goes wrong:</b> generated code tries ${C('new T()')}, ${C('T.class')} or ${C('instanceof List<String>')}; suggests ${C('getClass()')} to tell ${C('List<String>')} from ${C('List<Integer>')}; or "fixes" deserialization of ${C('List<User>')} by passing ${C('List.class')} (which silently yields a list of ${C('LinkedHashMap')}s in Jackson).</p>
<p><b>What you must still own:</b> explaining the erasure trade-off (compatibility vs reification) in interviews, knowing which operations need runtime types, and choosing the right workaround — ${C('Class<T>')}, ${C('Supplier<T>')}, or a type token — for your API.</p>`,
    problems: [{
      title: 'Type-Safe Heterogeneous Container (Class&lt;T&gt; keys)',
      level: 'Medium', tags: ['type erasure', 'Class token', 'map'], companies: ['Google', 'Oracle', 'LinkedIn'],
      statement: `<p>Build ${C('Favorites')}: a container that stores <b>one favourite value per type</b>, e.g. a favourite String, a favourite Integer and a favourite ${C('Class')}. API: ${C('<T> void put(Class<T> type, T value)')} and ${C('<T> T get(Class<T> type)')}. Reads must need <b>no casts</b> at the call site, and a malicious raw call like ${C('((Class) Integer.class)')} with a String value must fail <b>immediately in put</b>, not later.</p>`,
      constraints: `Up to 10<sup>5</sup> operations; get of a missing type returns null; null type → NullPointerException.`,
      example: `<p>${C('put(String.class, "Java"); put(Integer.class, 0xcafe);')} then ${C('get(String.class)')} → ${H.c('g', '"Java"')}, ${C('get(Integer.class)')} → ${H.c('g', '51966')}, ${C('get(Double.class)')} → ${H.c('m', 'null')}.</p>`,
      brute: { why: `<p>A ${C('Map<String, Object>')} keyed by type name: every read needs a manual cast, nothing ties the key to the value type, and a wrong value only explodes when someone casts it later — the exact problem erasure creates.</p>`, code: `
class FavoritesBrute {
    private final Map<String, Object> m = new HashMap<>();
    void put(String typeName, Object v) { m.put(typeName, v); }
    Object get(String typeName) { return m.get(typeName); }
    public static void main(String[] args) {
        FavoritesBrute f = new FavoritesBrute();
        f.put("String", 42);                       // wrong value — accepted
        try {
            String s = (String) f.get("String");   // fails later, at the reader
            System.out.println(s);
        } catch (ClassCastException e) {
            System.out.println("late failure");
        }
    }
}` },
      mcq: { q: 'Why does <code>get</code> use <code>type.cast(obj)</code> rather than <code>(T) obj</code>?', options: ['They are identical after compilation', '<code>(T) obj</code> is erased to a no-op, while <code>Class.cast</code> performs a real runtime check', '<code>(T) obj</code> does not compile', '<code>Class.cast</code> is faster'], answer: 1, explain: 'Because of erasure, (T) obj checks nothing and only produces an unchecked warning. Class.cast uses the reified Class object to check isInstance and throws ClassCastException on the spot — no warning and no heap pollution.' },
      hints: [`<p>Hint 1: erasure means you cannot ask "what is T?" at runtime — but a ${C('Class<T>')} object <b>is</b> runtime information, and its type parameter links it to T at compile time.</p>`, `<p>Hint 2: store values in a ${C('Map<Class<?>, Object>')}. The map itself is untyped inside; the public generic methods restore type safety at the boundary.</p>`, `<p>Hint 3: in ${C('get')}, return ${C('type.cast(map.get(type))')}. In ${C('put')}, store ${C('type.cast(value)')} so a raw-type attack fails right there. ${C('Objects.requireNonNull(type)')} for the null key.</p>`],
      tests: { sig: 'string[] -> string[]', fn: 'run', harness: { java: `
class Check {
  @SuppressWarnings({"rawtypes", "unchecked"})
  static String[] run(String[] ops) {
    Favorites f = new Favorites();
    List<String> out = new ArrayList<>();
    for (String op : ops) {
      try {
        if (op.startsWith("putS:")) f.put(String.class, op.substring(5));
        else if (op.startsWith("putI:")) f.put(Integer.class, Integer.parseInt(op.substring(5)));
        else if (op.equals("putClass")) f.put(Class.class, Favorites.class);
        else if (op.equals("getS")) out.add(String.valueOf(f.get(String.class)));
        else if (op.equals("getI")) out.add(String.valueOf(f.get(Integer.class)));
        else if (op.equals("getD")) out.add(String.valueOf(f.get(Double.class)));
        else if (op.equals("getClass")) out.add(((Class<?>) f.get(Class.class)).getSimpleName());
        else if (op.equals("rawAttack")) { f.put((Class) Integer.class, "not a number"); out.add("accepted"); }
        else if (op.equals("nullType")) { f.put(null, "x"); out.add("accepted"); }
      } catch (Exception e) { out.add(e.getClass().getSimpleName()); }
    }
    return out.toArray(new String[0]);
  }
}` }, cases: [
          [[['putS:Java', 'putI:51966', 'putClass', 'getS', 'getI', 'getClass', 'getD']], ['Java', '51966', 'Favorites', 'null']],
          [[['getS', 'getI']], ['null', 'null']],
          [[['putS:a', 'putS:b', 'getS']], ['b']],
          [[['putI:5', 'rawAttack', 'getI']], ['ClassCastException', '5']],
          [[['nullType']], ['NullPointerException']],
          [[['putS:', 'getS', 'getD']], ['', 'null']],
          [[['putI:-1', 'putI:0', 'getI']], ['0']],
          [[{ $concat: [{ $rep: 'putS:z', n: 100000 }, ['getS']] }], ['z']]
        ] },
      solution: {
        approach: `<p>Use the ${C('Class')} object as both the <b>key</b> and the <b>runtime type check</b>. The generic signatures tie ${C('Class<T>')} to ${C('T')} at compile time; ${C('Class.cast')} enforces it at runtime, defeating raw-type tricks. This is Effective Java Item 33.</p>`,
        code: `
import java.util.*;

class Favorites {
    private final Map<Class<?>, Object> favorites = new HashMap<>();

    <T> void put(Class<T> type, T value) {
        Objects.requireNonNull(type, "type");
        favorites.put(type, type.cast(value));   // dynamic check: stops raw-type abuse right here
    }

    <T> T get(Class<T> type) {
        return type.cast(favorites.get(type));   // checked cast, no unchecked warning; null passes through
    }

    @SuppressWarnings({"rawtypes", "unchecked"})
    public static void main(String[] args) {
        Favorites f = new Favorites();
        f.put(String.class, "Java");
        f.put(Integer.class, 0xcafe);
        f.put(Class.class, Favorites.class);
        String s = f.get(String.class);                  // no cast at the call site
        int n = f.get(Integer.class);
        System.out.println(s + " " + n + " " + f.get(Class.class).getSimpleName()); // Java 51966 Favorites
        System.out.println(f.get(Double.class));         // null
        try {
            f.put((Class) Integer.class, "not a number");  // raw-type attack
        } catch (ClassCastException e) {
            System.out.println("rejected in put");      // fails immediately
        }
    }
}`,
        dry: { head: ['call', 'map after', 'returns / effect'], rows: [['put(String.class, "Java")', '{String=Java}', 'cast ok'], ['put(Integer.class, 51966)', '{String=Java, Integer=51966}', 'cast ok'], ['get(String.class)', 'unchanged', '"Java" (typed String)'], ['get(Double.class)', 'unchanged', 'null'], ['put((Class) Integer.class, "x")', 'unchanged', H.c('r', 'ClassCastException in put')]] },
        complexity: `<p>O(1) expected per operation (HashMap); O(k) space for k types. ${C('Class.cast')} is a cheap isInstance check.</p>`,
        followUps: ['Why can this container not store a favourite <code>List&lt;String&gt;</code> separately from a <code>List&lt;Integer&gt;</code>? (both keys are List.class — use a TypeRef key)', 'Restrict keys to subtypes of an annotation type with a bounded token: <code>Class&lt;? extends Annotation&gt;</code>.', 'Make it thread-safe — is <code>ConcurrentHashMap</code> enough?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — Generic arrays, varargs heap pollution & raw types
     ====================================================================== */
  topics.push({
    title: 'Generic Arrays, Heap Pollution & Raw Types',
    analogy: `<p>An <b>array</b> is like an egg tray stamped "<b>EGGS ONLY</b>" at the factory — the stamp travels with the tray, and a guard checks every item you put in (the runtime ${C('ArrayStoreException')}). A <b>generic list</b> is a tray whose label was checked at the shop counter and then torn off (erasure). Try to make "an egg tray stamped with a label that will be torn off" (${C('new T[]')}) and Java refuses — it cannot stamp a type it will not know. A <b>raw type</b> is the old unlabeled tray from before labels existed: everything fits, and the warning sticker ("unchecked") is the only thing between you and a rotten surprise. When a wrong item sneaks into a labelled tray through such a back door, the tray is <b>polluted</b>: it looks fine until somebody reaches in expecting an egg.</p>`,
    explain: `<h4>1. Why new T[n] and new List&lt;String&gt;[n] are illegal</h4>
<p>Arrays are <b>reified</b> (they know their element type at runtime) and <b>covariant</b>. Generics are <b>erased</b> and <b>invariant</b>. Mixing them would break safety:</p>
${P(`
List<String>[] lsa = new List<String>[1];  // ❌ "generic array creation" — suppose it compiled…
Object[] oa = lsa;                          // fine: arrays are covariant
oa[0] = List.of(42);                        // runtime sees only "List" → no ArrayStoreException!
String s = lsa[0].get(0);                   // ClassCastException, far away`)}
<p>What <b>is</b> allowed: ${C('new List<?>[10]')} (unbounded wildcard = reifiable), and arrays of non-generic types.</p>
<h4>2. How real generic containers store elements</h4>
${H.table(['Technique', 'Example', 'Notes'], [['Object[] + cast on read', C('Object[] data; E get(i) { return (E) data[i]; }'), H.c('g', 'what ArrayList does — safest')], ['(E[]) new Object[n]', C('E[] data = (E[]) new Object[n];'), H.c('y', 'fine internally; NEVER return it as E[]')], ['Array.newInstance', C('(T[]) Array.newInstance(type, n)'), 'real T[] — needs a Class&lt;T&gt;'], ['Generator', C('list.toArray(String[]::new)'), 'Java 11+, clean and typed']])}
<h4>3. Varargs + generics = hidden generic array</h4>
<p>${C('static <T> List<T> listOf(T... xs)')} — calling it creates an array of T behind the scenes, so javac warns "<b>possible heap pollution</b>". If the method only <b>reads</b> the array and never lets it escape, it is safe; say so with ${C('@SafeVarargs')} (allowed on static, final and private methods and constructors). ${C('List.of')}, ${C('Arrays.asList')} and ${C('Stream.of')} carry it.</p>
<h4>4. Raw types</h4>
<p>A <b>raw type</b> is a generic type used without type arguments: ${C('List')}, ${C('Map')}, ${C('Comparable')}. They exist only so pre-2004 code still compiles. Using one <b>switches off generic checking</b> for that expression:</p>
${H.table(['', C('List') + ' (raw)', C('List<Object>'), C('List<?>')], [['Accepts a List&lt;String&gt;?', H.c('g', 'yes'), H.c('r', 'no (invariant)'), H.c('g', 'yes')], ['add("x")?', H.c('y', 'yes, unchecked warning'), H.c('g', 'yes, safe'), H.c('r', 'no')], ['get(0) gives', 'Object', 'Object', 'Object'], ['Type-safe?', H.c('r', 'NO'), H.c('g', 'yes'), H.c('g', 'yes')]])}
<p><b>Surprising rule:</b> using a raw type erases <b>all</b> generics in its members — even ones that have nothing to do with T. If ${C('class Box<T>')} has ${C('List<String> names()')}, then on a raw ${C('Box')} it returns a raw ${C('List')}, and ${C('String s = rawBox.names().get(0)')} does <b>not compile</b>.</p>
<p><b>Legit raw uses:</b> class literals (${C('List.class')}) and old APIs. ${C('x instanceof List')} works but ${C('x instanceof List<?>')} says the same thing more clearly.</p>`,
    clues: ['"generic array creation" compile error, or "how does ArrayList store E internally?"', '"Possible heap pollution from parameterized vararg type" warning → @SafeVarargs (only if truly safe)', '"ClassCastException: [Ljava.lang.Object; cannot be cast to [Ljava.lang.String;" → an (E[]) array escaped', '"legacy code with List list = new ArrayList()" / "what is a raw type and why avoid it?"', '"difference between List, List&lt;Object&gt;, List&lt;?&gt;" (very common interview question)', '"find where the wrong element entered the collection" → Collections.checkedList'],
    code: [`
import java.util.*;
import java.util.function.*;
import java.lang.reflect.Array;

class GenericArrays {
    // 1) ArrayList-style: Object[] storage, cast on the way out
    static final class Bag<E> {
        private Object[] data = new Object[2];
        private int size;
        void add(E e) {
            if (size == data.length) data = Arrays.copyOf(data, size * 2);
            data[size++] = e;
        }
        @SuppressWarnings("unchecked")      // safe: only E values are ever stored by add(E)
        E get(int i) { Objects.checkIndex(i, size); return (E) data[i]; }
        // 2) Typed array out: let the caller supply the array constructor
        E[] toArray(IntFunction<E[]> gen) {
            E[] out = gen.apply(size);
            for (int i = 0; i < size; i++) out[i] = get(i);
            return out;
        }
    }

    // 3) Real T[] via reflection, using a Class<T> token
    @SuppressWarnings("unchecked")
    static <T> T[] newArray(Class<T> type, int n) { return (T[]) Array.newInstance(type, n); }

    // 4) Safe generic varargs: only reads the array, never stores into it or leaks it
    @SafeVarargs
    static <T> List<T> listOf(T... items) { return new ArrayList<>(Arrays.asList(items)); }

    public static void main(String[] args) {
        Bag<String> bag = new Bag<>();
        bag.add("a"); bag.add("b"); bag.add("c");             // grows from 2 to 4
        String[] arr = bag.toArray(String[]::new);            // a REAL String[]
        System.out.println(arr.getClass().getSimpleName() + " " + Arrays.toString(arr)); // String[] [a, b, c]

        Integer[] nums = newArray(Integer.class, 3);
        System.out.println(nums.getClass().getSimpleName() + " " + nums.length);        // Integer[] 3

        List<?>[] buckets = new List<?>[2];                   // allowed: List<?> is reifiable
        buckets[0] = List.of(1, 2);
        buckets[1] = List.of("x");
        System.out.println(Arrays.toString(buckets));          // [[1, 2], [x]]
        System.out.println(listOf("p", "q"));                  // [p, q]
    }
}`],
    codeTitle: ['Four safe ways to deal with arrays of a generic type'],
    viz: [{
      title: 'Heap pollution: the time bomb in a raw alias',
      gen: function () {
        var code = 'List<String> names = new ArrayList<>(List.of("asha"));\nList raw = names;                  // raw alias: warning only\nraw.add(42);                       // unchecked: Integer sneaks in\nSystem.out.println(names.size());  // no error yet\nfor (String n : names)             // hidden checkcast String\n    System.out.println(n.toUpperCase());';
        function heap(vals, hl) { return { type: 'array', label: 'The ONE ArrayList object on the heap (names and raw both point here)', values: vals, hl: hl || {} }; }
        var f = codeFrames(code, [
          { l: 1, cls: 'ok', v: { names: 'List<String> → #1' }, extra: [heap(['"asha"'])], narr: 'A normal, type-checked <code>List&lt;String&gt;</code> with one element.' },
          { l: 2, cls: 'cur', v: { names: 'List<String> → #1', raw: 'List (raw) → #1' }, hv: { raw: 'bad' }, extra: [heap(['"asha"'])], narr: 'A <b>raw</b> variable points to the same object. The compiler only warns. Both variables now share one list.' },
          { l: 3, cls: 'bad', v: { names: 'List<String> → #1', raw: 'List (raw) → #1' }, extra: [heap(['"asha"', '42 (Integer)'], { 1: 'r' })], narr: '<span class="c-r">Heap pollution.</span> Through the raw alias, <code>add(Object)</code> accepts an Integer. The <b>list object itself cannot object</b> — after erasure it is just an array of Objects.' },
          { l: 4, cls: 'cur', v: { 'names.size()': 2 }, out: '2', extra: [heap(['"asha"', '42 (Integer)'], { 1: 'r' })], narr: 'Still no error! <code>size()</code> does not look at element types. The bomb is planted but silent — in real systems this might sit in a cache for hours.' },
          { l: [5, 6], cls: 'ok', v: { n: '"asha"' }, out: '2\nASHA', extra: [heap(['"asha"', '42 (Integer)'], { 0: 'g', 1: 'r' })], narr: 'The loop reads element 0 with a hidden <code>checkcast String</code> → fine, prints ASHA.' },
          { l: 5, cls: 'bad', v: { n: '42 ✗' }, hv: { n: 'bad' }, out: '2\nASHA\nException in thread "main" java.lang.ClassCastException: class java.lang.Integer cannot be cast to class java.lang.String', extra: [heap(['"asha"', '42 (Integer)'], { 0: 'm', 1: 'r' })], narr: '<span class="c-r">Boom — on line 5</span>, a line with no visible cast, two lines after the real bug (line 3). That distance is what makes heap pollution so painful to debug.' }
        ], 'Polluting a List&lt;String&gt;');
        var code2 = 'List<String> names = Collections.checkedList(new ArrayList<>(), String.class);\nList raw = names;\nraw.add(42);                       // fails RIGHT HERE';
        return f.concat(codeFrames(code2, [
          { l: 1, cls: 'ok', v: { names: 'checked List<String>' }, narr: 'Debugging tip: wrap the list in <code>Collections.checkedList(..., String.class)</code>. It keeps a <b>Class token</b> and checks every insertion at runtime.' },
          { l: 3, cls: 'bad', v: { names: 'checked List<String>' }, out: 'java.lang.ClassCastException: Attempt to insert class java.lang.Integer element into collection with element type class java.lang.String', narr: 'Now the exception points at the <b>real culprit line</b>. Use it temporarily to hunt pollution, then fix the raw type.' }
        ], 'Catching pollution at the source'));
      }
    }, {
      title: 'Why an (E[]) array must never escape',
      gen: function () {
        var code = 'class ToyList<E> {\n    E[] items = (E[]) new Object[4];   // real type: Object[]\n    int n;\n    void add(E e) { items[n++] = e; }\n    E get(int i) { return items[i]; }\n    E[] toArray() { return Arrays.copyOf(items, n); }\n}\nToyList<String> t = new ToyList<>();\nt.add("hi");\nString s = t.get(0);\nString[] arr = t.toArray();';
        return codeFrames(code, [
          { l: 2, cls: 'cur', v: { 'static type of items': 'E[]', 'runtime class': 'Object[]' }, hv: { 'runtime class': 'bad' }, narr: '<code>new E[4]</code> is illegal, so people write <code>(E[]) new Object[4]</code>. Unchecked warning. The variable says E[], but the <b>real array is an Object[]</b> — and arrays never forget their real type.' },
          { l: [8, 9], cls: 'ok', v: { 'runtime class': 'Object[]', 'items[0]': '"hi"' }, narr: 'Inside the class, everything is erased to Object[], so storing "hi" works.' },
          { l: [5, 10], cls: 'ok', v: { s: '"hi"' }, hv: { s: 'ok' }, narr: '<code>get</code> returns one element; the caller\'s hidden <code>checkcast String</code> checks the <b>element</b> → fine.' },
          { l: [6, 11], cls: 'bad', v: { 'returned array class': 'Object[]', 'caller expects': 'String[]' }, hv: { 'returned array class': 'bad' }, out: 'java.lang.ClassCastException: class [Ljava.lang.Object; cannot be cast to class [Ljava.lang.String;', narr: '<span class="c-r">ClassCastException.</span> <code>toArray()</code> returns the Object[] itself; the caller\'s hidden cast checks the <b>array</b> type, and an Object[] is not a String[] — even though every element is a String.' },
          { l: 6, cls: 'ok', v: { fix: 'E[] toArray(IntFunction<E[]> gen)' }, hv: { fix: 'ok' }, narr: 'Fix: let the caller create the array (<code>t.toArray(String[]::new)</code>), or take a <code>Class&lt;E&gt;</code> and use <code>Array.newInstance</code>, or just return a <code>List&lt;E&gt;</code>. Rule: an <code>(E[])</code> array may live <b>inside</b> the class, never outside.' }
        ], 'The (E[]) new Object[] trick');
      }
    }, {
      title: 'Raw List vs List<Object> vs List<?>',
      gen: function () {
        var rows = [
          ['List x = new ArrayList<String>()', '✓ (unchecked)', '✗ invariant', '✓'],
          ['x.add("hi")', '✓ (unchecked)', '✓', '✗'],
          ['x.add(42)', '✓ (unchecked)', '✓', '✗'],
          ['Object o = x.get(0)', '✓', '✓', '✓'],
          ['String s = x.get(0)', '✗ (Object)', '✗ (Object)', '✗ (Object)'],
          ['x.add(null)', '✓', '✓', '✓'],
          ['Type safe overall?', '✗ NO', '✓ yes', '✓ yes']
        ];
        var narr = [
          'Assigning a <code>List&lt;String&gt;</code>: raw accepts with a warning; <code>List&lt;Object&gt;</code> refuses (invariance); <code>List&lt;?&gt;</code> accepts safely.',
          'Adding a String: raw allows it unchecked; <code>List&lt;Object&gt;</code> is happy; <code>List&lt;?&gt;</code> refuses because the real element type is unknown.',
          'Adding an Integer: with the raw type this <b>pollutes</b> a list that is really a <code>List&lt;String&gt;</code>. <code>List&lt;Object&gt;</code> is fine because it really is a list of anything.',
          'Reading as Object works everywhere.',
          'Reading as String needs a cast in all three — none of them knows the elements are Strings.',
          'null is a member of every type, so all three accept it.',
          'Verdict: <code>List&lt;?&gt;</code> = "a list of something, read-only"; <code>List&lt;Object&gt;</code> = "a list that holds anything"; raw <code>List</code> = "no checking at all" — avoid in new code.'
        ];
        return rows.map(function (r, i) {
          return { narr: narr[i], parts: [{ type: 'table', label: 'Same operation on three declarations of x', columns: ['operation', 'List (raw)', 'List<Object>', 'List<?>'], rows: rows.slice(0, i + 1), hl: one(i, 'cur') }] };
        });
      }
    }],
    examples: [
      { title: 'Does this compile? Five array declarations', html: `${H.table(['Code', 'Compiles?', 'Reason'], [[C('T[] a = new T[10];'), H.c('r', 'no'), 'generic array creation'], [C('List<String>[] a = new List<String>[10];'), H.c('r', 'no'), 'generic array creation'], [C('List<?>[] a = new List<?>[10];'), H.c('g', 'yes'), 'unbounded wildcard is reifiable'], [C('List<String>[] a = new List[10];'), H.c('y', 'yes, unchecked warning'), 'raw array assigned to a generic array type'], [C('T[] a = (T[]) new Object[10];'), H.c('y', 'yes, unchecked warning'), 'safe only if the array never escapes']])}`, code: `
class ArrayDecls<T> {
    List<?>[] wild = new List<?>[10];                 // fine
    @SuppressWarnings("unchecked")
    List<String>[] rawMade = new List[10];            // compiles with an unchecked warning
    @SuppressWarnings("unchecked")
    T[] internal = (T[]) new Object[10];              // compiles; keep it private
}` },
      { title: 'Predict: the pickTwo varargs trap (Effective Java Item 32)', html: `<p>${C('toArray(T... args)')} just returns its varargs array. Inside the generic ${C('pickTwo')}, T is erased, so the compiler builds an <b>Object[]</b> for the call. The caller's hidden cast to ${C('String[]')} then fails.</p>
${H.table(['Call', 'Array created', 'Result'], [[C('String[] a = toArray("x", "y")'), 'String[] (T known = String at this site)', H.c('g', 'works')], [C('String[] b = pickTwo("a", "b", "c")'), 'Object[] (inside pickTwo T is erased)', H.c('r', 'ClassCastException')]])}`, code: `
class PickTwo {
    @SafeVarargs                              // a LIE here: the array escapes via return
    static <T> T[] toArray(T... args) { return args; }
    static <T> T[] pickTwo(T a, T b, T c) { return toArray(a, b); }
    public static void main(String[] args) {
        String[] ok = toArray("x", "y");
        System.out.println(ok.length);        // 2
        try {
            String[] bad = pickTwo("a", "b", "c");
            System.out.println(bad.length);
        } catch (ClassCastException e) {
            System.out.println("CCE: Object[] is not a String[]");
        }
    }
}` },
      { title: 'Does this compile? A raw type erases unrelated generics', html: `<p>${C('names()')} returns ${C('List<String>')} and has nothing to do with T — yet through a raw ${C('Box')} it returns a raw ${C('List')}.</p>
${P(`
Box raw = new Box<Integer>();
String s = raw.names().get(0);     // ❌ incompatible types: Object cannot be converted to String
Box<?> wild = new Box<Integer>();
String t = wild.names().get(0);    // ✅ wildcard keeps member signatures intact`)}`, code: `
class Box<T> {
    List<String> names() { return List.of("asha"); }
    public static void main(String[] args) {
        Box<?> wild = new Box<Integer>();
        String t = wild.names().get(0);   // compiles: Box<?> is not raw
        System.out.println(t);            // asha
    }
}` },
      { title: 'Migrating a raw-type method safely', html: `<p>Legacy: ${C('static double total(List prices)')} with casts inside. Modern: decide the role (producer → ${C('? extends Number')}), delete casts, compile with ${C('-Xlint:unchecked -Werror')} so new raw uses fail the build.</p>
${H.table(['Step', 'Action'], [['1', 'Turn on -Xlint:unchecked and count warnings'], ['2', 'Generify leaf utilities first (they have no generic callers)'], ['3', 'Replace raw parameters with wildcards (PECS)'], ['4', 'Put @SuppressWarnings on the smallest scope with a comment proving safety'], ['5', 'Add -Werror once warnings reach zero']])}`, code: `
class Prices {
    // before: static double total(List prices) { ... (Number) prices.get(i) ... }
    static double total(List<? extends Number> prices) {
        double sum = 0;
        for (Number p : prices) sum += p.doubleValue();   // no casts
        return sum;
    }
    public static void main(String[] args) {
        System.out.println(total(List.of(10, 2.5)));      // 12.5
    }
}` }
    ],
    deepDive: `<p><b>Heap pollution</b> (JLS 4.12.2): a variable of a parameterized type refers to an object that is not of that type. Sources: raw types, unchecked casts, generic varargs, mixing compiled code from different versions, and reflection/deserialization. The Java guarantee is: <b>if the whole program compiles without unchecked warnings, there is no heap pollution</b>. Every ${C('@SuppressWarnings("unchecked")')} is a promise you personally sign.</p>
<p><b>@SafeVarargs contract.</b> Safe means the method (1) does not <b>store</b> anything into the varargs array, and (2) does not let a <b>reference to the array escape</b> (return it, store it in a field, pass it to code that might). Passing it to another ${C('@SafeVarargs')} method or using only its contents (like ${C('Arrays.asList')} reading them) is fine. Since Java 9 it is allowed on private instance methods too; it is not allowed on overridable methods because subclasses could break the promise.</p>
<p><b>How the JDK does it.</b> ${C('ArrayList')} keeps ${C('transient Object[] elementData')} and casts in ${C('elementData(int)')}. ${C('Arrays.copyOf(T[] original, int n)')} uses ${C('original.getClass()')} to make a correctly-typed array, which is why ${C('list.toArray(new String[0])')} works. Java 11 added ${C('Collection.toArray(IntFunction<T[]>)')}. Passing a zero-length array is as fast or faster than a presized one on modern JVMs (Shipilëv's benchmark).</p>
<p><b>Collections.checkedList / checkedMap</b> hold a ${C('Class')} token and type-check each insertion — a debugging aid with a small runtime cost; Guava and modern code bases rarely ship with them permanently.</p>
<p><b>Raw types in the JLS.</b> The spec says raw types are for compatibility only and "it is possible that future versions … will disallow the use of raw types". Static analysers (Error Prone ${C('RawTypes')}, Sonar S3740) flag them; many companies compile with ${C('-Werror')}.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI can mass-migrate raw types and explain each unchecked warning. Large-scale refactors that took weeks (generifying a legacy module) now take an afternoon — if someone checks the result.</p>
<p><b>Use AI as a partner:</b> <code>"List every unchecked warning in this file, classify each as provably safe / needs redesign, and propose the smallest @SuppressWarnings scope with a justification comment"</code>. Ask it to write a test that would expose heap pollution (insert through a raw alias, then read).</p>
<p><b>Where AI goes wrong:</b> it sprinkles ${C('@SuppressWarnings("unchecked")')} on whole classes, adds ${C('@SafeVarargs')} to methods that return the array, writes ${C('(T[]) new Object[n]')} and exposes it, or "fixes" generic array errors with raw arrays.</p>
<p><b>What you must still own:</b> the safety proof behind every suppression, the rule "no unchecked warnings ⇒ no heap pollution", and the judgement to prefer ${C('List<E>')} over ${C('E[]')} in APIs (Effective Java Item 28).</p>`,
    problems: [{
      title: 'Generic Growable Array DynArray&lt;E&gt;',
      level: 'Medium', tags: ['generic arrays', 'erasure', 'amortized'], companies: ['Adobe', 'Samsung', 'Oracle'],
      statement: `<p>Implement ${C('DynArray<E>')} with ${C('add(E)')}, ${C('E get(int)')}, ${C('E set(int, E)')}, ${C('int size()')} and ${C('E[] toArray(IntFunction<E[]> gen)')}. Start with capacity 2 and double when full. You may not use any ${C('java.util')} collection internally. Your public API must never return an ${C('Object[]')} disguised as ${C('E[]')}, and the class must compile with at most one, justified, unchecked suppression.</p>`,
      constraints: `Up to 10<sup>6</sup> adds; get/set O(1); add amortized O(1); index out of range → IndexOutOfBoundsException.`,
      example: `<p>add a, b, c → capacity 2 → 4 (one resize). ${C('get(1)')} → ${H.c('g', '"b"')}. ${C('toArray(String[]::new)')} → ${H.c('g', 'a real String[] [a, b, c]')}. ${C('get(3)')} → ${H.c('r', 'IndexOutOfBoundsException')}.</p>`,
      brute: { why: `<p>The naive version declares ${C('E[] data = (E[]) new Object[2]')} and returns ${C('data')} (or a copy of it) from ${C('toArray()')}. It compiles with a warning and appears to work, until a caller writes ${C('String[] s = d.toArray()')} and gets ${C('ClassCastException: [Ljava.lang.Object; cannot be cast to [Ljava.lang.String;')}. It also grows by +1, making n adds cost O(n<sup>2</sup>) copying.</p>`, code: `
class DynArrayNaive<E> {
    @SuppressWarnings("unchecked")
    private E[] data = (E[]) new Object[2];
    private int size;
    void add(E e) {
        if (size == data.length) data = Arrays.copyOf(data, size + 1);   // +1 growth: O(n^2) total
        data[size++] = e;
    }
    E[] toArray() { return Arrays.copyOf(data, size); }                    // leaks an Object[] as E[]
    public static void main(String[] args) {
        DynArrayNaive<String> d = new DynArrayNaive<>();
        d.add("a");
        try { String[] s = d.toArray(); System.out.println(s.length); }
        catch (ClassCastException e) { System.out.println("CCE: Object[] escaped"); }
    }
}` },
      mcq: { q: 'Which storage choice keeps the unchecked cast in exactly one, provably safe place?', options: ['<code>E[] data = (E[]) new Object[n]</code> and return it from toArray', '<code>Object[] data</code> plus a single <code>(E)</code> cast inside a private elementAt(i)', '<code>new E[n]</code>', 'A raw <code>Object[]</code> and make callers cast'], answer: 1, explain: 'Only add/set write into data, and both take an E — so every slot provably holds an E and the (E) cast in one private helper is safe. new E[n] does not compile; returning (E[]) arrays causes CCE at callers.' },
      hints: [`<p>Hint 1: you cannot write ${C('new E[n]')}. Store elements in a plain ${C('Object[]')} — that is what ArrayList does.</p>`, `<p>Hint 2: put the one unchecked cast in a private ${C('E elementAt(int i)')} with ${C('@SuppressWarnings("unchecked")')} and a comment: "only E values are ever stored". Double capacity with ${C('Arrays.copyOf(data, data.length * 2)')}.</p>`, `<p>Hint 3: for ${C('toArray')}, let the caller build the real array: ${C('E[] out = gen.apply(size)')} then copy. Check indices with ${C('Objects.checkIndex(i, size)')}. Recipe: grow if full → store → size++.</p>`],
      tests: { sig: 'string[] -> string[]', fn: 'run', harness: { java: `
class Check {
  static String[] run(String[] ops) {
    DynArray<String> d = new DynArray<>();
    List<String> out = new ArrayList<>();
    for (String op : ops) {
      try {
        if (op.startsWith("add:")) d.add(op.substring(4));
        else if (op.startsWith("get:")) out.add(d.get(Integer.parseInt(op.substring(4))));
        else if (op.startsWith("set:")) { String[] p = op.split(":", 3); out.add(d.set(Integer.parseInt(p[1]), p[2])); }
        else if (op.equals("size")) out.add(String.valueOf(d.size()));
        else if (op.equals("toArray")) { String[] a = d.toArray(String[]::new); out.add(a.getClass().getSimpleName() + " " + Arrays.toString(a)); }
      } catch (Exception e) { out.add(e.getClass().getSimpleName()); }
    }
    return out.toArray(new String[0]);
  }
}` }, cases: [
          [[['add:a', 'add:b', 'add:c', 'get:1', 'set:0:z', 'toArray', 'get:3']], ['b', 'a', 'String[] [z, b, c]', 'IndexOutOfBoundsException']],
          [[['size', 'toArray', 'get:0']], ['0', 'String[] []', 'IndexOutOfBoundsException']],
          [[['add:x', 'get:-1', 'get:0', 'size']], ['IndexOutOfBoundsException', 'x', '1']],
          [[['add:a', 'add:b', 'add:c', 'add:d', 'add:e', 'size', 'get:4', 'get:2']], ['5', 'e', 'c']],
          [[['add:q', 'set:1:w', 'set:0:w', 'get:0']], ['IndexOutOfBoundsException', 'q', 'w']],
          [[['add:d', 'add:d', 'add:d', 'toArray']], ['String[] [d, d, d]']],
          [[{ $concat: [{ $rep: 'add:x', n: 1000000 }, ['size', 'get:999999', 'get:1000000']] }], ['1000000', 'x', 'IndexOutOfBoundsException']]
        ] },
      solution: {
        approach: `<p>Object[] storage, doubling growth, a single private unchecked cast whose safety follows from the fact that only ${C('add(E)')} and ${C('set(int, E)')} write to the array. Typed arrays leave only through a caller-supplied generator, so the runtime array class is always right.</p>`,
        code: `
import java.util.*;
import java.util.function.*;

class DynArray<E> {
    private Object[] data = new Object[2];
    private int size;

    void add(E e) {
        if (size == data.length) data = Arrays.copyOf(data, data.length * 2);  // amortized O(1)
        data[size++] = e;
    }

    E get(int i) {
        Objects.checkIndex(i, size);
        return elementAt(i);
    }

    E set(int i, E e) {
        Objects.checkIndex(i, size);
        E old = elementAt(i);
        data[i] = e;
        return old;
    }

    int size() { return size; }

    E[] toArray(IntFunction<E[]> gen) {
        E[] out = gen.apply(size);              // caller creates a REAL E[] (e.g. String[]::new)
        for (int i = 0; i < size; i++) out[i] = elementAt(i);
        return out;
    }

    @SuppressWarnings("unchecked")              // safe: add/set are the only writers and both take an E
    private E elementAt(int i) { return (E) data[i]; }

    public static void main(String[] args) {
        DynArray<String> d = new DynArray<>();
        d.add("a"); d.add("b"); d.add("c");       // capacity 2 → 4
        System.out.println(d.get(1));             // b
        System.out.println(d.set(0, "z"));        // a
        String[] arr = d.toArray(String[]::new);
        System.out.println(arr.getClass().getSimpleName() + " " + Arrays.toString(arr)); // String[] [z, b, c]
        try { d.get(3); } catch (IndexOutOfBoundsException e) { System.out.println("out of range"); }
    }
}`,
        dry: { head: ['operation', 'capacity', 'size', 'data (Object[])', 'note'], rows: [['add("a")', '2', '1', '[a, _]', ''], ['add("b")', '2', '2', '[a, b]', 'now full'], ['add("c")', H.c('y', '4'), '3', '[a, b, c, _]', 'copyOf doubled'], ['get(1)', '4', '3', 'unchanged', '"b" via (E) cast'], ['toArray(String[]::new)', '4', '3', 'unchanged', H.c('g', 'new String[3] filled')]] },
        complexity: `<p>get/set O(1); add amortized O(1) (doubling copies 1 + 2 + 4 + … &lt; 2n elements in total); toArray O(n). Space O(capacity) ≤ 2n.</p>`,
        followUps: ['Implement <code>Iterable&lt;E&gt;</code> with a fail-fast iterator (modCount).', 'Add a constructor taking <code>Class&lt;E&gt;</code> and a no-arg <code>E[] toArray()</code> using <code>Array.newInstance</code>.', 'Why does <code>ArrayList.toArray()</code> (no args) return <code>Object[]</code> rather than <code>E[]</code>?']
      }
    }]
  });

  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Generic Pair: swap() and mapFirst()',
    level: 'Easy', tags: ['generic record', 'type parameters', 'Function'], companies: ['TCS', 'Cognizant', 'Amazon'],
    statement: `<p>Create a generic record ${C('Pair<A, B>')} with a method ${C('swap()')} returning ${C('Pair<B, A>')} and a method ${C('mapFirst(f)')} that applies a function to the first value and returns a new pair whose first type is the function's result type. ${C('new Pair<>("age", 30).mapFirst(String::length)')} must have static type ${C('Pair<Integer, Integer>')}.</p>`,
    constraints: `Values may be null (records allow it). No casts in caller code.`,
    example: `<p>${C('new Pair<>("age", 30).swap()')} → ${H.c('g', 'Pair[first=30, second=age]')} of type ${C('Pair<Integer, String>')}. ${C('mapFirst(String::length)')} → ${H.c('g', 'Pair[first=3, second=30]')}.</p>`,
    brute: { why: `<p>An ${C('Object')}-based pair needs casts on every read and loses the information that the types swapped. ${C('(Integer) p.swap().first')} compiles even when it is wrong and fails only at runtime.</p>`, code: `
class ObjPair {
    final Object first, second;
    ObjPair(Object f, Object s) { first = f; second = s; }
    ObjPair swap() { return new ObjPair(second, first); }
    public static void main(String[] args) {
        ObjPair p = new ObjPair("age", 30).swap();
        Integer n = (Integer) p.first;      // manual cast, unchecked by the compiler
        System.out.println(n);              // 30
    }
}` },
    mcq: { q: 'What should the signature of mapFirst be?', options: ['<code>Pair&lt;A, B&gt; mapFirst(Function&lt;A, A&gt; f)</code>', '<code>&lt;C&gt; Pair&lt;C, B&gt; mapFirst(Function&lt;? super A, ? extends C&gt; f)</code>', '<code>Pair&lt;Object, B&gt; mapFirst(Function f)</code>', '<code>&lt;A&gt; Pair&lt;A, B&gt; mapFirst(Function&lt;A, A&gt; f)</code>'], answer: 1, explain: 'A new method-level type parameter C lets the first type change. PECS: the function consumes an A (super) and produces a C (extends). Option 4 shadows the record\'s A.' },
    hints: [`<p>Hint 1: the record header declares both type parameters once: ${C('record Pair<A, B>(A first, B second)')}. ${C('swap')} simply returns ${C('new Pair<>(second, first)')} — the diamond infers ${C('<B, A>')}.</p>`, `<p>Hint 2: ${C('mapFirst')} changes the first type, so it needs its <b>own</b> type parameter: ${C('<C> Pair<C, B> mapFirst(...)')}.</p>`, `<p>Hint 3: make the function parameter flexible with PECS: ${C('Function<? super A, ? extends C>')}. Then ${C('return new Pair<>(f.apply(first), second);')}.</p>`],
    tests: { sig: 'string string -> string[]', fn: 'run', harness: { java: `
class Check {
  static String[] run(String a, String b) {
    Pair<String, String> p = new Pair<>(a, b);
    Pair<String, String> s = p.swap();
    String m;
    try { m = String.valueOf(p.mapFirst(String::length)); } catch (NullPointerException e) { m = "NPE"; }
    return new String[]{ String.valueOf(p.swap()), m, String.valueOf(s.swap().equals(p)) };
  }
}` }, cases: [
        [['age', '30'], ['Pair[first=30, second=age]', 'Pair[first=3, second=30]', 'true']],
        [['', ''], ['Pair[first=, second=]', 'Pair[first=0, second=]', 'true']],
        [['x', null], ['Pair[first=null, second=x]', 'Pair[first=1, second=null]', 'true']],
        [[null, 'y'], ['Pair[first=y, second=null]', 'NPE', 'true']],
        [[null, null], ['Pair[first=null, second=null]', 'NPE', 'true']],
        [['hello', 'world'], ['Pair[first=world, second=hello]', 'Pair[first=5, second=world]', 'true']],
        [[{ $rep: 'a', n: 100000 }, 'b'], ['Pair[first=b, second=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa]', 'Pair[first=100000, second=b]', 'true']]
      ] },
    solution: {
      approach: `<p>Class-level parameters A and B describe the pair; a method-level parameter C describes the new first type. The compiler tracks every change, so callers never cast.</p>`,
      code: `
import java.util.function.*;

record Pair<A, B>(A first, B second) {
    Pair<B, A> swap() { return new Pair<>(second, first); }

    <C> Pair<C, B> mapFirst(Function<? super A, ? extends C> f) {
        return new Pair<>(f.apply(first), second);
    }

    public static void main(String[] args) {
        Pair<String, Integer> p = new Pair<>("age", 30);
        Pair<Integer, String> s = p.swap();
        Pair<Integer, Integer> m = p.mapFirst(String::length);
        System.out.println(s);                              // Pair[first=30, second=age]
        System.out.println(m);                              // Pair[first=3, second=30]
        System.out.println(m.first() + m.second());         // 33 — both Integers, no cast
    }
}`,
      dry: { head: ['expression', 'static type', 'value'], rows: [['p', 'Pair&lt;String, Integer&gt;', '(age, 30)'], ['p.swap()', 'Pair&lt;Integer, String&gt;', '(30, age)'], ['p.mapFirst(String::length)', 'Pair&lt;Integer, Integer&gt;', '(3, 30)']] },
      complexity: `<p>O(1) per call; one small record allocation.</p>`,
      followUps: ['Add <code>mapSecond</code> and a general <code>map(Function, Function)</code>.', 'Why is a <code>Pair</code> class often discouraged in public APIs? (meaningless names — prefer a named record)']
    }
  });

  practice.push({
    title: 'Fix the Signature: Sum Any List of Numbers',
    level: 'Easy', tags: ['wildcards', 'invariance', 'does it compile'], companies: ['Infosys', 'Capgemini', 'Paytm'],
    statement: `<p>A teammate wrote ${C('static double sum(List<Number> nums)')}. These calls fail to compile: ${C('sum(listOfIntegers)')}, ${C('sum(listOfDoubles)')}. Fix <b>only the signature</b> so that ${C('List<Integer>')}, ${C('List<Double>')}, ${C('List<Number>')} and ${C('Set<Long>')} all work, with no casts and no warnings.</p>`,
    constraints: `Up to 10<sup>6</sup> elements; elements are non-null.`,
    example: `<p>${C('sum(List.of(1, 2, 3))')} → ${H.c('g', '6.0')}; ${C('sum(Set.of(10L))')} → ${H.c('g', '10.0')}. Before the fix: ${H.c('r', 'incompatible types: List&lt;Integer&gt; cannot be converted to List&lt;Number&gt;')}.</p>`,
    brute: { why: `<p>Copying into a new ${C('List<Number>')} at every call site compiles, but it allocates a whole new list (O(n) extra memory) and spreads boilerplate everywhere — it treats the symptom (invariance) instead of fixing the API.</p>`, code: `
class SumCopy {
    static double sum(List<Number> nums) {
        double s = 0;
        for (Number n : nums) s += n.doubleValue();
        return s;
    }
    public static void main(String[] args) {
        List<Integer> ints = List.of(1, 2, 3);
        System.out.println(sum(new ArrayList<Number>(ints)));   // 6.0 — works, but copies every time
    }
}` },
    mcq: { q: 'Why does <code>sum(List&lt;Integer&gt;)</code> fail with the original signature?', options: ['Integer cannot be unboxed', 'Generics are invariant: List&lt;Integer&gt; is not a subtype of List&lt;Number&gt;', 'The method is static', 'List.of returns an immutable list'], answer: 1, explain: 'Even though Integer is a Number, List&lt;Integer&gt; and List&lt;Number&gt; are unrelated types. Otherwise you could add a Double to a list of Integers through the List&lt;Number&gt; reference.' },
    hints: [`<p>Hint 1: the method only <b>reads</b> numbers out of the collection — the collection is a <b>producer</b>.</p>`, `<p>Hint 2: Producer Extends → ${C('? extends Number')}. To accept a Set too, widen ${C('List')} to ${C('Collection')} (or ${C('Iterable')}).</p>`, `<p>Hint 3: final signature: ${C('static double sum(Collection<? extends Number> nums)')}. Inside, each element is still a ${C('Number')}, so ${C('doubleValue()')} works unchanged.</p>`],
    tests: { sig: 'int[] -> double[]', fn: 'run', cmp: 'float', harness: { java: `
class Check {
  static double[] run(int[] a) {
    List<Integer> li = new ArrayList<>(); List<Double> ld = new ArrayList<>(); Set<Long> sl = new HashSet<>(); List<Number> ln = new ArrayList<>();
    for (int x : a) { li.add(x); ld.add((double) x); sl.add((long) x); ln.add(x); }
    return new double[]{ SumFixed.sum(li), SumFixed.sum(ld), SumFixed.sum(sl), SumFixed.sum(ln) };
  }
}` }, cases: [
        [[[1, 2, 3]], [6, 6, 6, 6]],
        [[[]], [0, 0, 0, 0]],
        [[[1, 1, 2]], [4, 4, 3, 4]],
        [[[-5, 5, 0]], [0, 0, 0, 0]],
        [[[-7]], [-7, -7, -7, -7]],
        [[[2147483647, 2147483647]], [4294967294, 4294967294, 2147483647, 4294967294]],
        [[{ $range: [0, 100000] }], [4999950000, 4999950000, 4999950000, 4999950000]]
      ] },
    solution: {
      approach: `<p>Replace the exact type with an upper-bounded wildcard and the most general collection interface the method needs. The body does not change at all.</p>`,
      code: `
import java.util.*;

class SumFixed {
    static double sum(Collection<? extends Number> nums) {
        double s = 0;
        for (Number n : nums) s += n.doubleValue();   // reading as Number is safe
        return s;
    }
    public static void main(String[] args) {
        System.out.println(sum(List.of(1, 2, 3)));           // 6.0
        System.out.println(sum(List.of(1.5, 2.5)));          // 4.0
        System.out.println(sum(new ArrayList<Number>(List.of(1, 2.5)))); // 3.5
        System.out.println(sum(Set.of(10L)));                // 10.0
    }
}`,
      complexity: `<p>O(n) time, O(1) extra space (no copying).</p>`,
      followUps: ['Why might summing large longs as doubles lose precision? Return <code>BigDecimal</code> instead.', 'Could you write it as <code>&lt;N extends Number&gt; double sum(Collection&lt;N&gt;)</code>? Which is preferred and why?']
    }
  });

  practice.push({
    title: 'Generic countIf with a Predicate',
    level: 'Easy', tags: ['generic method', 'PECS', 'Predicate'], companies: ['Flipkart', 'Swiggy', 'Microsoft'],
    statement: `<p>Write ${C('countIf(items, test)')} returning how many items satisfy ${C('test')}. It must accept any ${C('Iterable')} and a predicate written for the element type <b>or any supertype</b> — e.g. count Integers with a ${C('Predicate<Number>')} or a ${C('Predicate<Object>')}.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>6</sup>; the predicate never throws.`,
    example: `<p>${C('countIf(List.of(1, 5, 8), (Number n) -> n.intValue() > 4)')} → ${H.c('g', '2')}; ${C('countIf(Set.of("a", "bb"), Objects::nonNull)')} → ${H.c('g', '2')}.</p>`,
    brute: { why: `<p>Writing ${C('countIfInts')}, ${C('countIfStrings')}, … one per type duplicates logic. Using ${C('Predicate<T>')} exactly also rejects perfectly good general predicates (${C('Predicate<Object>')}), forcing callers to write adapters.</p>`, code: `
class CountInts {
    static int countIfInts(List<Integer> items, java.util.function.Predicate<Integer> test) {
        int c = 0;
        for (Integer x : items) if (test.test(x)) c++;
        return c;
    }
    public static void main(String[] args) {
        System.out.println(countIfInts(List.of(1, 5, 8), x -> x > 4));   // 2 — but only for Integers
    }
}` },
    mcq: { q: 'The predicate receives elements as input. Which type is most flexible and still safe?', options: ['<code>Predicate&lt;T&gt;</code>', '<code>Predicate&lt;? extends T&gt;</code>', '<code>Predicate&lt;? super T&gt;</code>', '<code>Predicate&lt;Object&gt;</code>'], answer: 2, explain: 'A predicate consumes Ts → Consumer Super. ? extends T would make test(t) impossible to call (you cannot pass a T to something expecting an unknown subtype). Predicate&lt;Object&gt; alone would reject Predicate&lt;Integer&gt;.' },
    hints: [`<p>Hint 1: one type parameter ${C('<T>')} links the elements and the predicate.</p>`, `<p>Hint 2: items are read (producer → ${C('Iterable<? extends T>')}); the predicate takes T as input (consumer → ${C('Predicate<? super T>')}).</p>`, `<p>Hint 3: loop with ${C('for (T t : items)')}, increment when ${C('test.test(t)')}. An empty iterable returns 0 naturally.</p>`],
    tests: { sig: 'int[] int -> int[]', fn: 'run', harness: { java: `
class Check {
  static int[] run(int[] a, int t) {
    List<Integer> li = new ArrayList<>(); Set<Integer> si = new HashSet<>();
    for (int x : a) { li.add(x); si.add(x); }
    Predicate<Number> big = n -> n.intValue() > t;
    Predicate<Object> any = o -> o != null;
    return new int[]{ CountIf.countIf(li, big), CountIf.countIf(si, any), CountIf.countIf(List.<String>of(), s -> true), CountIf.countIf(li, (Number n) -> n.intValue() == t) };
  }
}` }, cases: [
        [[[1, 5, 8], 4], [2, 3, 0, 0]],
        [[[], 0], [0, 0, 0, 0]],
        [[[4, 4, 4], 4], [0, 1, 0, 3]],
        [[[-3, -1, 0], -2], [2, 3, 0, 0]],
        [[[7], 7], [0, 1, 0, 1]],
        [[[1, 2, 2, 3, 3, 3], 2], [3, 3, 0, 2]],
        [[{ $range: [0, 1000000] }, 499999], [500000, 1000000, 0, 1]]
      ] },
    solution: {
      approach: `<p>PECS on both parameters. T is inferred from the items; any predicate on T or a supertype is accepted.</p>`,
      code: `
import java.util.*;
import java.util.function.*;

class CountIf {
    static <T> int countIf(Iterable<? extends T> items, Predicate<? super T> test) {
        int count = 0;
        for (T t : items) if (test.test(t)) count++;
        return count;
    }
    public static void main(String[] args) {
        Predicate<Number> big = n -> n.intValue() > 4;
        System.out.println(countIf(List.of(1, 5, 8), big));            // 2
        System.out.println(countIf(Set.of("a", "bb"), Objects::nonNull)); // 2
        System.out.println(countIf(List.<String>of(), s -> true));     // 0
    }
}`,
      complexity: `<p>O(n) time, O(1) space.</p>`,
      followUps: ['Write it with streams: <code>StreamSupport.stream(items.spliterator(), false).filter(test).count()</code>.', 'Overload for arrays: <code>&lt;T&gt; int countIf(T[] a, Predicate&lt;? super T&gt; p)</code> — why does it not accept <code>int[]</code>?']
    }
  });

  practice.push({
    title: 'Generic indexOf for Arrays (and why int[] is rejected)',
    level: 'Easy', tags: ['generic method', 'arrays', 'equals'], companies: ['Wipro', 'HCL', 'Oracle'],
    statement: `<p>Write ${C('static <T> int indexOf(T[] arr, T key)')} returning the first index whose element equals ${C('key')} (null-safe), or -1. Then explain why ${C('indexOf(new int[]{1, 2}, 2)')} does not compile and provide an overload that handles ${C('int[]')}.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>6</sup>; elements and key may be null.`,
    example: `<p>${C('indexOf(new String[]{"a", null, "c"}, null)')} → ${H.c('g', '1')}; ${C('indexOf(new Integer[]{4, 2}, 2)')} → ${H.c('g', '1')}; ${C('indexOf(new int[]{1, 2}, 2)')} with only the generic version → ${H.c('r', 'compile error')}.</p>`,
    brute: { why: `<p>Using ${C('==')} compares references: ${C('new String("a") == "a"')} is false, and Integers outside the cache (-128..127) compare unequal. Using ${C('arr[i].equals(key)')} crashes with NullPointerException on null elements.</p>`, code: `
class IndexOfBroken {
    static <T> int indexOf(T[] arr, T key) {
        for (int i = 0; i < arr.length; i++) if (arr[i] == key) return i;   // reference comparison: wrong
        return -1;
    }
    public static void main(String[] args) {
        Integer[] a = {1000, 2000};
        System.out.println(indexOf(a, 2000));   // -1 (autoboxing makes a different Integer object)
    }
}` },
    mcq: { q: 'Why can T not be inferred as int for <code>indexOf(new int[]{1, 2}, 2)</code>?', options: ['int[] is not an array', 'Type arguments must be reference types; int[] is not a T[] for any reference T', 'Because 2 is a literal', 'Because arrays are covariant'], answer: 1, explain: 'T[] means "array of some reference type". int is primitive, so int[] can never match T[]. (T itself could be int[] for a parameter of type T, but not here.) Primitive arrays need their own overloads — exactly why java.util.Arrays has 9 versions of sort.' },
    hints: [`<p>Hint 1: use ${C('Objects.equals(a, b)')} — it handles nulls on either side and calls ${C('equals')} otherwise.</p>`, `<p>Hint 2: generics never cover primitives; ${C('T[]')} cannot be ${C('int[]')}. Write a separate overload ${C('static int indexOf(int[] arr, int key)')} that uses ${C('==')} (correct for primitives).</p>`, `<p>Hint 3: overload resolution picks the int[] version for ${C('int[]')} arguments and the generic one for object arrays. Return -1 when not found; empty arrays return -1.</p>`],
    tests: { sig: 'string string[] string -> int', fn: 'run', harness: { java: `
class Check {
  static int run(String kind, String[] a, String key) {
    if (kind.equals("str")) return IndexOf.indexOf(a, key);
    if (kind.equals("Integer")) {
      Integer[] arr = new Integer[a.length];
      for (int i = 0; i < a.length; i++) arr[i] = a[i] == null ? null : Integer.valueOf(a[i]);
      return IndexOf.indexOf(arr, key == null ? null : Integer.valueOf(key));
    }
    int[] arr = new int[a.length];
    for (int i = 0; i < a.length; i++) arr[i] = Integer.parseInt(a[i]);
    return IndexOf.indexOf(arr, Integer.parseInt(key));
  }
}` }, cases: [
        [['str', ['a', null, 'c'], null], 1],
        [['Integer', ['1000', '2000'], '2000'], 1],
        [['int', ['1', '2'], '2'], 1],
        [['str', [], 'x'], -1],
        [['str', ['a', 'b', 'a'], 'a'], 0],
        [['str', ['a', 'b'], 'z'], -1],
        [['Integer', [null, '4'], null], 0],
        [['int', ['-1', '0', '-1'], '-1'], 0],
        [['int', ['5'], '6'], -1],
        [['str', { $concat: [{ $rep: 'a', n: 100000 }, ['b']] }, 'b'], 100000],
        [['int', { $concat: [{ $rep: '0', n: 100000 }, ['7']] }, '7'], 100000]
      ] },
    solution: {
      approach: `<p>Generic version with ${C('Objects.equals')} for any object array; a primitive overload for ${C('int[]')}. This mirrors ${C('java.util.Arrays')}, which repeats methods per primitive type because of erasure.</p>`,
      code: `
import java.util.*;

class IndexOf {
    static <T> int indexOf(T[] arr, T key) {
        for (int i = 0; i < arr.length; i++) if (Objects.equals(arr[i], key)) return i;
        return -1;
    }
    static int indexOf(int[] arr, int key) {          // primitives need their own overload
        for (int i = 0; i < arr.length; i++) if (arr[i] == key) return i;
        return -1;
    }
    public static void main(String[] args) {
        System.out.println(indexOf(new String[]{"a", null, "c"}, null));  // 1
        System.out.println(indexOf(new Integer[]{1000, 2000}, 2000));      // 1 (equals, not ==)
        System.out.println(indexOf(new int[]{1, 2}, 2));                   // 1 (int[] overload)
        System.out.println(indexOf(new String[]{}, "x"));                  // -1
    }
}`,
      complexity: `<p>O(n) time, O(1) space.</p>`,
      followUps: ['Why does <code>indexOf(new Integer[]{1}, "1")</code> compile? (T inferred as a common supertype) — how would you make it a compile error?', 'Add a <code>Comparator</code>-based binary search variant for sorted arrays.']
    }
  });

  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'maxBy with a Comparator (PECS on both sides)',
    level: 'Medium', tags: ['PECS', 'Comparator', 'Optional'], companies: ['Amazon', 'Walmart', 'PhonePe'],
    statement: `<p>Write ${C('maxBy(items, cmp)')} returning an ${C('Optional')} of the largest element according to ${C('cmp')} (first one wins ties). It must accept ${C('List<Integer>')} with a ${C('Comparator<Number>')}, and the result must be typed by the <b>caller's</b> choice: ${C('Optional<Integer> r = maxBy(ints, byDouble);')}.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>6</sup>; empty input → Optional.empty().`,
    example: `<p>ints = [3, 9, 4, 9], cmp = compare by doubleValue → ${H.c('g', 'Optional[9]')} (the first 9). Empty list → ${H.c('m', 'Optional.empty')}.</p>`,
    brute: { why: `<p>Sorting a copy and taking the last element works but is O(n log n) time and O(n) extra space for an O(n) problem, and ${C('sort')} is stable so "first wins ties" needs care. A signature with ${C('Comparator<T>')} rejects the ${C('Comparator<Number>')}.</p>`, code: `
class MaxBySort {
    static <T> Optional<T> maxBy(List<T> items, Comparator<T> cmp) {
        if (items.isEmpty()) return Optional.empty();
        List<T> copy = new ArrayList<>(items);
        copy.sort(cmp.reversed());                   // O(n log n), stable → first max ends up first
        return Optional.of(copy.get(0));
    }
    public static void main(String[] args) {
        System.out.println(maxBy(List.of(3, 9, 4), Comparator.naturalOrder())); // Optional[9]
    }
}` },
    mcq: { q: 'Which signature compiles for <code>Optional&lt;Integer&gt; r = maxBy(ints, Comparator&lt;Number&gt;)</code>?', options: ['<code>&lt;T&gt; Optional&lt;T&gt; maxBy(Iterable&lt;T&gt;, Comparator&lt;T&gt;)</code>', '<code>&lt;T&gt; Optional&lt;T&gt; maxBy(Iterable&lt;? extends T&gt;, Comparator&lt;? super T&gt;)</code>', '<code>Optional&lt;?&gt; maxBy(Iterable&lt;?&gt;, Comparator&lt;?&gt;)</code>', '<code>&lt;T&gt; Optional&lt;? extends T&gt; maxBy(...)</code>'], answer: 1, explain: 'T is inferred as Integer (from the target and items); Comparator&lt;Number&gt; is a Comparator&lt;? super Integer&gt;. Option 1 forces T = Number and Integer at once. Wildcard return types (option 4) burden every caller.' },
    hints: [`<p>Hint 1: one pass, keep ${C('best')}; replace only when ${C('cmp.compare(x, best) > 0')} (strictly), so the first max wins.</p>`, `<p>Hint 2: items produce Ts → ${C('Iterable<? extends T>')}; the comparator consumes Ts → ${C('Comparator<? super T>')}. Return ${C('Optional<T>')} with no wildcard.</p>`, `<p>Hint 3: handle empty with an iterator: if ${C('!it.hasNext()')} return empty; otherwise seed best with the first element and continue.</p>`],
    tests: { sig: 'string string[] -> string', fn: 'run', harness: { java: `
class Check {
  static String run(String kind, String[] a) {
    if (kind.equals("len")) return MaxBy.maxBy(Arrays.asList(a), Comparator.comparingInt(String::length)).orElse("none");
    Comparator<Number> byDouble = Comparator.comparingDouble(Number::doubleValue);
    List<Integer> ints = new ArrayList<>();
    for (String s : a) ints.add(Integer.valueOf(s));
    Optional<Integer> r = MaxBy.maxBy(ints, byDouble);
    return r.isPresent() ? String.valueOf(r.get()) : "none";
  }
}` }, cases: [
        [['num', ['3', '9', '4', '9']], '9'],
        [['num', []], 'none'],
        [['len', ['kiwi', 'fig', 'banana']], 'banana'],
        [['len', ['aa', 'bb', 'c']], 'aa'],
        [['len', ['cc', 'aa']], 'cc'],
        [['len', []], 'none'],
        [['num', ['-5', '-9']], '-5'],
        [['num', ['0']], '0'],
        [['num', ['2147483647', '-2147483648']], '2147483647'],
        [['len', { $concat: [{ $rep: 'a', n: 100000 }, ['bb']] }], 'bb']
      ] },
    solution: {
      approach: `<p>Single pass with an iterator, PECS on both parameters, a plain ${C('Optional<T>')} return — the same shape as ${C('Collections.max(Collection<? extends T>, Comparator<? super T>)')}.</p>`,
      code: `
import java.util.*;

class MaxBy {
    static <T> Optional<T> maxBy(Iterable<? extends T> items, Comparator<? super T> cmp) {
        Iterator<? extends T> it = items.iterator();
        if (!it.hasNext()) return Optional.empty();
        T best = it.next();
        while (it.hasNext()) {
            T x = it.next();
            if (cmp.compare(x, best) > 0) best = x;      // strict: first max wins ties
        }
        return Optional.ofNullable(best);
    }
    public static void main(String[] args) {
        Comparator<Number> byDouble = Comparator.comparingDouble(Number::doubleValue);
        List<Integer> ints = List.of(3, 9, 4, 9);
        Optional<Integer> r = maxBy(ints, byDouble);       // T = Integer
        System.out.println(r);                              // Optional[9]
        System.out.println(maxBy(List.<Integer>of(), byDouble)); // Optional.empty
        System.out.println(maxBy(List.of("kiwi", "fig", "banana"), Comparator.comparingInt(String::length))); // Optional[banana]
    }
}`,
      dry: { head: ['x', 'compare(x, best)', 'best'], rows: [['3 (seed)', '—', '3'], ['9', '&gt; 0', '9'], ['4', '&lt; 0', '9'], ['9', '0 (tie)', '9 (first kept)']] },
      complexity: `<p>O(n) time, O(1) space.</p>`,
      followUps: ['Return both min and max in one pass (a record <code>MinMax&lt;T&gt;</code>).', 'Why does <code>Collections.max</code> throw on empty input while <code>Stream.max</code> returns Optional?']
    }
  });

  practice.push({
    title: 'Reverse a List&lt;?&gt; In Place (Wildcard Capture)',
    level: 'Medium', tags: ['wildcard capture', 'helper method', 'two pointers'], companies: ['Google', 'Bloomberg', 'Zoho'],
    statement: `<p>Implement ${C('public static void reverse(List<?> list)')} that reverses any list in place. The public signature must stay ${C('List<?>')} (callers should not care about the type). A direct implementation fails with "${C('capture#1 of ?')}" errors — fix it without unchecked casts or raw types.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>6</sup>; the list supports set(); O(1) extra space.`,
    example: `<p>[a, b, c, d] → ${H.c('g', '[d, c, b, a]')}; [1, 2, 3] → ${H.c('g', '[3, 2, 1]')}; [] → ${H.c('m', '[]')}.</p>`,
    brute: { why: `<p>The direct version ${C('Object tmp = list.get(i); list.set(i, list.get(j));')} does not compile: ${C('set')} expects "capture of ?", which no Object value can match. The tempting raw-type fix (${C('List raw = list')}) compiles with warnings and disables all checks.</p>`, code: `
class ReverseRaw {
    @SuppressWarnings({"rawtypes", "unchecked"})
    static void reverse(List<?> list) {
        List raw = list;                            // works, but throws away type checking
        for (int i = 0, j = raw.size() - 1; i < j; i++, j--) {
            Object tmp = raw.get(i);
            raw.set(i, raw.get(j));
            raw.set(j, tmp);
        }
    }
    public static void main(String[] args) {
        List<String> s = new ArrayList<>(List.of("a", "b", "c"));
        reverse(s);
        System.out.println(s);                      // [c, b, a]
    }
}` },
    mcq: { q: 'What does the private helper <code>&lt;T&gt; void rev(List&lt;T&gt; l)</code> achieve?', options: ['It makes the method faster', 'Calling it from reverse(List&lt;?&gt;) lets javac capture the unknown type and NAME it T, so get/set type-check', 'It converts the list to a raw type', 'It copies the list'], answer: 1, explain: 'Capture conversion turns ? into a fresh type variable; passing the list to a generic method binds T to that captured type. Inside, get returns T and set accepts T — fully type-safe, no warnings. Collections.reverse and Collections.swap use exactly this trick.' },
    hints: [`<p>Hint 1: inside a method taking ${C('List<?>')} you can read (Object) but not write. Inside a method taking ${C('List<T>')} you can do both with T.</p>`, `<p>Hint 2: keep the public ${C('List<?>')} method and delegate to ${C('private static <T> void reverseHelper(List<T> list)')}.</p>`, `<p>Hint 3: two pointers i = 0, j = n − 1; swap via a ${C('T tmp')}; stop when i ≥ j. Works for empty and single-element lists.</p>`],
    tests: { sig: 'int[] int -> string[]', fn: 'run', harness: { java: `
class Check {
  static String[] run(int[] a, int kind) {
    List<Object> list;
    if (kind == 0) { list = new ArrayList<>(); for (int x : a) list.add(x); }
    else if (kind == 1) { list = new LinkedList<>(); for (int x : a) list.add(x); }
    else if (kind == 2) { Object[] arr = new Object[a.length]; for (int i = 0; i < a.length; i++) arr[i] = a[i]; list = Arrays.asList(arr); }
    else { list = new ArrayList<>(); for (int x : a) list.add("s" + x); }
    Reverse.reverse(list);
    String[] out = new String[list.size()];
    for (int i = 0; i < out.length; i++) out[i] = String.valueOf(list.get(i));
    return out;
  }
}` }, cases: [
        [[[1, 2, 3], 0], ['3', '2', '1']],
        [[[], 0], []],
        [[[7], 0], ['7']],
        [[[1, 2], 0], ['2', '1']],
        [[[1, 2, 3, 4], 3], ['s4', 's3', 's2', 's1']],
        [[[1, 1, 2, 2], 1], ['2', '2', '1', '1']],
        [[[-1, 0, 5], 2], ['5', '0', '-1']],
        [[{ $range: [0, 100000] }, 0], { $range: [99999, -1, -1] }]
      ] },
    solution: {
      approach: `<p>Wildcard-capture helper: the public API stays simple, the private generic method gives the captured type a name so swaps type-check.</p>`,
      code: `
import java.util.*;

class Reverse {
    public static void reverse(List<?> list) {
        reverseHelper(list);                      // ? captured as T
    }
    private static <T> void reverseHelper(List<T> list) {
        for (int i = 0, j = list.size() - 1; i < j; i++, j--) {
            T tmp = list.get(i);
            list.set(i, list.get(j));
            list.set(j, tmp);
        }
    }
    public static void main(String[] args) {
        List<String> s = new ArrayList<>(List.of("a", "b", "c", "d"));
        reverse(s);
        System.out.println(s);                    // [d, c, b, a]
        List<Integer> n = new ArrayList<>(List.of(1, 2, 3));
        reverse(n);
        System.out.println(n);                    // [3, 2, 1]
    }
}`,
      dry: { head: ['i', 'j', 'list'], rows: [['0', '3', '[d, b, c, a]'], ['1', '2', '[d, c, b, a]'], ['2', '1', 'stop (i ≥ j)']] },
      complexity: `<p>O(n) time for random-access lists, O(1) extra space. For a LinkedList, get/set are O(n) each → use a ListIterator pair (as Collections.reverse does).</p>`,
      followUps: ['Rewrite using two ListIterators so LinkedList is O(n).', 'Why can you call <code>list.clear()</code> and <code>list.remove(0)</code> on a <code>List&lt;?&gt;</code> but not <code>add</code>?']
    }
  });

  practice.push({
    title: 'Generic LRU Cache&lt;K, V&gt;',
    level: 'Medium', tags: ['generic class', 'LinkedHashMap', 'design'], companies: ['Amazon', 'Microsoft', 'Uber'],
    statement: `<p>Implement ${C('LruCache<K, V>')} with a fixed capacity: ${C('V get(K key)')} (null if missing, marks the key as recently used) and ${C('void put(K key, V value)')} (evicts the least-recently-used entry when full). Add ${C('V getOrLoad(K key, Function<? super K, ? extends V> loader)')} that computes and caches a missing value.</p>`,
    constraints: `1 ≤ capacity ≤ 10<sup>5</sup>; up to 10<sup>6</sup> operations; each O(1) average.`,
    example: `<p>capacity 2: put(1,"a"), put(2,"b"), get(1), put(3,"c") → key ${H.c('r', '2 evicted')} (1 was used more recently). get(2) → ${H.c('m', 'null')}.</p>`,
    brute: { why: `<p>A ${C('HashMap')} plus a ${C('List')} of keys in usage order: moving a key to the end needs ${C('list.remove(key)')}, an O(n) scan, so each get/put is O(n). A raw ${C('Map')} would also force casts on every get.</p>`, code: `
class LruSlow<K, V> {
    private final int cap;
    private final Map<K, V> map = new HashMap<>();
    private final List<K> order = new ArrayList<>();     // most recent at the end
    LruSlow(int cap) { this.cap = cap; }
    V get(K k) {
        if (!map.containsKey(k)) return null;
        order.remove(k); order.add(k);                   // O(n)
        return map.get(k);
    }
    void put(K k, V v) {
        if (map.containsKey(k)) order.remove(k);
        else if (map.size() == cap) map.remove(order.remove(0));
        order.add(k); map.put(k, v);
    }
}` },
    mcq: { q: 'Which LinkedHashMap constructor flag makes iteration order follow ACCESS rather than insertion?', options: ['<code>new LinkedHashMap&lt;&gt;(16, 0.75f, false)</code>', '<code>new LinkedHashMap&lt;&gt;(16, 0.75f, true)</code>', '<code>new LinkedHashMap&lt;&gt;(true)</code>', 'It always uses access order'], answer: 1, explain: 'The third argument accessOrder = true moves an entry to the end on every get/put. Combined with overriding removeEldestEntry, it gives an O(1) LRU cache.' },
    hints: [`<p>Hint 1: ${C('LinkedHashMap')} with ${C('accessOrder = true')} keeps entries from least- to most-recently used.</p>`, `<p>Hint 2: subclass it (anonymous class with diamond is fine since Java 9) and override ${C('removeEldestEntry(Map.Entry<K, V> eldest)')} to return ${C('size() > capacity')}.</p>`, `<p>Hint 3: ${C('getOrLoad')} → ${C('map.computeIfAbsent(key, loader)')} — its parameter type is exactly ${C('Function<? super K, ? extends V>')}. Note: a loader returning null caches nothing.</p>`],
    tests: { sig: 'int string[] -> string[]', fn: 'run', harness: { java: `
class Check {
  static String[] run(int cap, String[] ops) {
    List<String> out = new ArrayList<>();
    LruCache<Integer, String> c;
    try { c = new LruCache<>(cap); } catch (IllegalArgumentException e) { return new String[]{ "IAE" }; }
    int[] loads = {0};
    Function<Object, String> loader = k -> { loads[0]++; return "loaded:" + k; };
    for (String op : ops) {
      if (op.startsWith("put:")) { String[] p = op.split(":", 3); c.put(Integer.parseInt(p[1]), p[2]); }
      else if (op.startsWith("get:")) out.add(String.valueOf(c.get(Integer.parseInt(op.substring(4)))));
      else if (op.startsWith("load:")) out.add(c.getOrLoad(Integer.parseInt(op.substring(5)), loader));
      else if (op.startsWith("fill:")) { int n = Integer.parseInt(op.substring(5)); for (int i = 0; i < n; i++) c.put(i, "v"); }
      else if (op.equals("loads")) out.add(String.valueOf(loads[0]));
      else if (op.equals("show")) out.add(c.toString());
    }
    return out.toArray(new String[0]);
  }
}` }, cases: [
        [[2, ['put:1:a', 'put:2:b', 'get:1', 'put:3:c', 'show', 'get:2', 'load:7', 'show']], ['a', '{1=a, 3=c}', 'null', 'loaded:7', '{3=c, 7=loaded:7}']],
        [[0, []], ['IAE']],
        [[1, ['put:1:a', 'put:2:b', 'get:1', 'get:2']], ['null', 'b']],
        [[2, ['put:1:a', 'put:2:b', 'put:1:z', 'put:3:c', 'show']], ['{1=z, 3=c}']],
        [[2, ['put:1:a', 'load:1', 'load:1', 'loads', 'load:2', 'loads', 'show']], ['a', 'a', '0', 'loaded:2', '1', '{1=a, 2=loaded:2}']],
        [[3, ['get:1', 'show']], ['null', '{}']],
        [[2, ['load:1', 'load:2', 'load:3', 'show', 'loads']], ['loaded:1', 'loaded:2', 'loaded:3', '{2=loaded:2, 3=loaded:3}', '3']],
        [[3, ['fill:200000', 'show']], ['{199997=v, 199998=v, 199999=v}']]
      ] },
    solution: {
      approach: `<p>Two type parameters K and V on the class flow into an access-ordered LinkedHashMap. The loader uses the JDK's own PECS shape.</p>`,
      code: `
import java.util.*;
import java.util.function.*;

class LruCache<K, V> {
    private final Map<K, V> map;

    LruCache(int capacity) {
        if (capacity < 1) throw new IllegalArgumentException("capacity must be >= 1");
        this.map = new LinkedHashMap<>(16, 0.75f, true) {          // diamond + anonymous class (Java 9+)
            @Override protected boolean removeEldestEntry(Map.Entry<K, V> eldest) {
                return size() > capacity;                           // evict LRU after an insert
            }
        };
    }

    V get(K key) { return map.get(key); }                           // marks as recently used
    void put(K key, V value) { map.put(key, value); }
    V getOrLoad(K key, Function<? super K, ? extends V> loader) { return map.computeIfAbsent(key, loader); }
    @Override public String toString() { return map.toString(); }

    public static void main(String[] args) {
        LruCache<Integer, String> c = new LruCache<>(2);
        c.put(1, "a");
        c.put(2, "b");
        c.get(1);                                  // 1 is now most recent
        c.put(3, "c");                             // evicts 2
        System.out.println(c);                     // {1=a, 3=c}
        System.out.println(c.get(2));              // null
        Function<Object, String> describe = k -> "loaded:" + k;   // a Function<Object, …> works too
        System.out.println(c.getOrLoad(7, describe)); // loaded:7
        System.out.println(c);                     // {3=c, 7=loaded:7}
    }
}`,
      dry: { head: ['operation', 'map (LRU → MRU)', 'evicted'], rows: [['put(1,a)', '{1=a}', '—'], ['put(2,b)', '{1=a, 2=b}', '—'], ['get(1)', '{2=b, 1=a}', '—'], ['put(3,c)', '{1=a, 3=c}', H.c('r', '2')], ['getOrLoad(7)', '{3=c, 7=loaded:7}', H.c('r', '1')]] },
      complexity: `<p>O(1) average for get/put/getOrLoad; O(capacity) space.</p>`,
      followUps: ['Make it thread-safe — why is <code>Collections.synchronizedMap</code> around an access-ordered map tricky? (get mutates)', 'Production alternative: Caffeine — what does it do better (W-TinyLFU, async loading)?']
    }
  });

  practice.push({
    title: 'Generic Binary Search over a Sorted List',
    level: 'Medium', tags: ['bounded type', 'binary search', 'Comparable'], companies: ['Google', 'Adobe', 'Goldman Sachs'],
    statement: `<p>Write ${C('static <T extends Comparable<? super T>> int search(List<? extends T> list, T key)')} that returns an index of ${C('key')} in an ascending list, or ${C('-(insertionPoint) - 1')} if absent (same contract as ${C('Collections.binarySearch')}). It must work for ${C('List<LocalDate>')} and for a list of Apples where only Fruit is Comparable.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>6</sup>; list is random-access and sorted; no nulls.`,
    example: `<p>[2, 5, 8, 12], key 8 → ${H.c('g', '2')}; key 6 → insertion point 2 → ${H.c('y', '-3')}; key 1 → ${H.c('y', '-1')}; key 20 → ${H.c('y', '-5')}.</p>`,
    brute: { why: `<p>A linear scan is O(n) — 10<sup>6</sup> comparisons per lookup instead of about 20. Declaring ${C('<T extends Comparable<T>>')} also rejects ${C('LocalDate')} (Comparable&lt;ChronoLocalDate&gt;).</p>`, code: `
class LinearSearch {
    static <T extends Comparable<? super T>> int search(List<? extends T> list, T key) {
        for (int i = 0; i < list.size(); i++) {
            int c = list.get(i).compareTo(key);
            if (c == 0) return i;
            if (c > 0) return -i - 1;          // passed the spot where key would be
        }
        return -list.size() - 1;
    }
}` },
    mcq: { q: 'Why does the middle computation use <code>(lo + hi) &gt;&gt;&gt; 1</code>?', options: ['It is required by generics', 'It avoids int overflow when lo + hi exceeds Integer.MAX_VALUE', 'It rounds up', 'It is faster than division only on ARM'], answer: 1, explain: 'lo + hi can overflow for huge lists, making mid negative (the famous 2006 JDK binarySearch bug). The unsigned shift treats the sum as unsigned. lo + (hi - lo) / 2 also works.' },
    hints: [`<p>Hint 1: the bound lets you call ${C('compareTo')} on elements; ${C('? super T')} admits LocalDate and Apple; ${C('List<? extends T>')} lets a ${C('List<Apple>')} be searched with a ${C('Fruit')}-typed key (T = Fruit) too.</p>`, `<p>Hint 2: classic loop: lo = 0, hi = n − 1; mid = ${C('(lo + hi) >>> 1')}; compare ${C('list.get(mid).compareTo(key)')}.</p>`, `<p>Hint 3: when the loop ends, ${C('lo')} is the insertion point → return ${C('-(lo + 1)')}. Empty list → -1.</p>`],
    tests: { sig: 'string int[] int -> int', fn: 'run', cmp: 'oneOf', harness: { java: `
class Check {
  static class Fr implements Comparable<Fr> {
    final int w; Fr(int w) { this.w = w; }
    public int compareTo(Fr o) { return Integer.compare(w, o.w); }
  }
  static class Ap extends Fr { Ap(int w) { super(w); } }
  static int run(String kind, int[] a, int key) {
    if (kind.equals("int")) {
      List<Integer> l = new ArrayList<>(); for (int x : a) l.add(x);
      return GenericSearch.search(l, key);
    }
    if (kind.equals("date")) {
      List<LocalDate> l = new ArrayList<>(); for (int x : a) l.add(LocalDate.of(2020, 1, 1).plusDays(x));
      return GenericSearch.search(l, LocalDate.of(2020, 1, 1).plusDays(key));
    }
    List<Ap> l = new ArrayList<>(); for (int x : a) l.add(new Ap(x));
    return GenericSearch.search(l, new Ap(key));
  }
}` }, cases: [
        [['int', [2, 5, 8, 12], 8], [2]],
        [['int', [2, 5, 8, 12], 6], [-3]],
        [['int', [2, 5, 8, 12], 1], [-1]],
        [['int', [2, 5, 8, 12], 20], [-5]],
        [['int', [], 3], [-1]],
        [['int', [5], 5], [0]],
        [['int', [5], 3], [-1]],
        [['int', [5], 7], [-2]],
        [['int', [-9, -3, 0, 4], -3], [1]],
        [['int', [1, 2, 2, 2, 3], 2], [1, 2, 3]],
        [['date', [0, 517], 517], [1]],
        [['date', [0, 517], 100], [-2]],
        [['fruit', [1, 4, 9], 9], [2]],
        [['fruit', [1, 4, 9], 0], [-1]],
        [['int', { $range: [0, 1000000] }, 777777], [777777]],
        [['int', { $range: [0, 1000000] }, -5], [-1]],
        [['int', { $range: [0, 1000000] }, 1000000], [-1000001]],
        [['int', { $range: [0, 2000000000, 1000] }, 1999999000], [1999999]]
      ] },
    solution: {
      approach: `<p>Standard binary search; the generic bound mirrors ${C('Collections.binarySearch(List<? extends Comparable<? super T>>, T)')}.</p>`,
      code: `
import java.util.*;
import java.time.*;

class GenericSearch {
    static <T extends Comparable<? super T>> int search(List<? extends T> list, T key) {
        int lo = 0, hi = list.size() - 1;
        while (lo <= hi) {
            int mid = (lo + hi) >>> 1;                 // overflow-safe midpoint
            int c = list.get(mid).compareTo(key);      // element is a T → has compareTo
            if (c < 0) lo = mid + 1;
            else if (c > 0) hi = mid - 1;
            else return mid;
        }
        return -(lo + 1);                              // lo = insertion point
    }
    public static void main(String[] args) {
        List<Integer> a = List.of(2, 5, 8, 12);
        System.out.println(search(a, 8) + " " + search(a, 6) + " " + search(a, 1) + " " + search(a, 20)); // 2 -3 -1 -5
        List<LocalDate> d = List.of(LocalDate.of(2024, 1, 1), LocalDate.of(2025, 6, 1));
        System.out.println(search(d, LocalDate.of(2025, 6, 1)));   // 1
    }
}`,
      dry: { head: ['lo', 'hi', 'mid', 'list[mid] vs 6', 'action'], rows: [['0', '3', '1', '5 &lt; 6', 'lo = 2'], ['2', '3', '2', '8 &gt; 6', 'hi = 1'], ['2', '1', '—', '—', 'return -(2+1) = -3']] },
      complexity: `<p>O(log n) comparisons on random-access lists; O(1) space.</p>`,
      followUps: ['Add a Comparator overload <code>search(List&lt;? extends T&gt;, T, Comparator&lt;? super T&gt;)</code>.', 'Return the FIRST occurrence when duplicates exist (lower bound).']
    }
  });

  practice.push({
    title: 'Merge Two Sorted Lists of Any Comparable Type',
    level: 'Medium', tags: ['bounded type', 'two pointers', 'PECS'], companies: ['Meta', 'Atlassian', 'Intuit'],
    statement: `<p>Write ${C('merge(a, b)')} that merges two ascending lists into a new ascending ${C('List<T>')} (stable: on ties, elements of ${C('a')} come first). It must merge a ${C('List<Apple>')} with a ${C('List<Banana>')} into a ${C('List<Fruit>')} when only ${C('Fruit')} implements ${C('Comparable<Fruit>')}.</p>`,
    constraints: `0 ≤ |a|, |b| ≤ 10<sup>6</sup>; both sorted; no nulls.`,
    example: `<p>[1, 4, 9] + [2, 4, 10] → ${H.c('g', '[1, 2, 4(a), 4(b), 9, 10]')}. Apples(3, 8) + Bananas(5) → ${H.c('g', '[Apple3, Banana5, Apple8]')} typed ${C('List<Fruit>')}.</p>`,
    brute: { why: `<p>Concatenating then sorting is O((n + m) log(n + m)) instead of O(n + m), and with ${C('List<T> a, List<T> b')} you cannot pass a List&lt;Apple&gt; and a List&lt;Banana&gt; together — invariance forces T to be both.</p>`, code: `
class MergeSort {
    static <T extends Comparable<? super T>> List<T> merge(List<T> a, List<T> b) {
        List<T> out = new ArrayList<>(a);
        out.addAll(b);
        Collections.sort(out);            // O(N log N), and both lists must be exactly List<T>
        return out;
    }
}` },
    mcq: { q: 'For <code>merge(apples, bananas)</code> to return <code>List&lt;Fruit&gt;</code>, which parameter types are needed?', options: ['<code>List&lt;T&gt; a, List&lt;T&gt; b</code>', '<code>List&lt;? extends T&gt; a, List&lt;? extends T&gt; b</code>', '<code>List&lt;? super T&gt; a, List&lt;? super T&gt; b</code>', '<code>List&lt;?&gt; a, List&lt;?&gt; b</code>'], answer: 1, explain: 'Both inputs only produce elements → extends. T is then inferred as Fruit, a common supertype, and the result is List&lt;Fruit&gt;. With List&lt;?&gt; you could not compare or return typed elements.' },
    hints: [`<p>Hint 1: two pointers i over a, j over b; append the smaller; then append the leftovers.</p>`, `<p>Hint 2: signature ${C('<T extends Comparable<? super T>> List<T> merge(List<? extends T> a, List<? extends T> b)')}. Elements read from either list are Ts, so ${C('x.compareTo(y)')} type-checks.</p>`, `<p>Hint 3: stability: take from a when ${C('a.get(i).compareTo(b.get(j)) <= 0')}. Presize the output: ${C('new ArrayList<>(a.size() + b.size())')}.</p>`],
    tests: { sig: 'string int[] int[] -> string[]', fn: 'run', harness: { java: `
class Check {
  static String[] run(String kind, int[] a, int[] b) {
    List<String> out = new ArrayList<>();
    if (kind.equals("int") || kind.equals("intbig")) {
      List<Integer> x = new ArrayList<>(), y = new ArrayList<>();
      for (int v : a) x.add(v);
      for (int v : b) y.add(v);
      if (kind.equals("intbig")) {
        List<Integer> m = MergeLists.merge(x, y);
        boolean sorted = true;
        for (int i = 1; i < m.size(); i++) if (m.get(i - 1) > m.get(i)) sorted = false;
        return new String[]{ String.valueOf(m.size()), String.valueOf(sorted), String.valueOf(m.get(0)), String.valueOf(m.get(m.size() - 1)) };
      }
      for (Integer v : MergeLists.merge(x, y)) out.add(String.valueOf(v));
    } else {
      List<Apple> x = new ArrayList<>(); List<Banana> y = new ArrayList<>();
      for (int v : a) x.add(new Apple(v));
      for (int v : b) y.add(new Banana(v));
      List<Fruit> m = MergeLists.merge(x, y);
      for (Fruit f : m) out.add(f.toString());
    }
    return out.toArray(new String[0]);
  }
}` }, cases: [
        [['int', [1, 4, 9], [2, 4, 10]], ['1', '2', '4', '4', '9', '10']],
        [['fruit', [3, 8], [5]], ['Apple3', 'Banana5', 'Apple8']],
        [['fruit', [4], [4]], ['Apple4', 'Banana4']],
        [['fruit', [4, 4], [4, 4]], ['Apple4', 'Apple4', 'Banana4', 'Banana4']],
        [['int', [], []], []],
        [['int', [], [1, 2]], ['1', '2']],
        [['int', [-3, 0], []], ['-3', '0']],
        [['int', [1, 2, 3], [7, 8]], ['1', '2', '3', '7', '8']],
        [['int', [7, 8], [1, 2, 3]], ['1', '2', '3', '7', '8']],
        [['intbig', { $range: [0, 200000, 2] }, { $range: [1, 200001, 2] }], ['200000', 'true', '0', '199999']]
      ] },
    solution: {
      approach: `<p>Linear two-pointer merge, producers declared with ${C('? extends T')} so the caller (or inference) can pick a common supertype.</p>`,
      code: `
import java.util.*;

class Fruit implements Comparable<Fruit> {
    final int w;
    Fruit(int w) { this.w = w; }
    public int compareTo(Fruit o) { return Integer.compare(w, o.w); }
    public String toString() { return getClass().getSimpleName() + w; }
}
class Apple extends Fruit { Apple(int w) { super(w); } }
class Banana extends Fruit { Banana(int w) { super(w); } }

class MergeLists {
    static <T extends Comparable<? super T>> List<T> merge(List<? extends T> a, List<? extends T> b) {
        List<T> out = new ArrayList<>(a.size() + b.size());
        int i = 0, j = 0;
        while (i < a.size() && j < b.size()) {
            if (a.get(i).compareTo(b.get(j)) <= 0) out.add(a.get(i++));   // <= keeps it stable
            else out.add(b.get(j++));
        }
        while (i < a.size()) out.add(a.get(i++));
        while (j < b.size()) out.add(b.get(j++));
        return out;
    }
    public static void main(String[] args) {
        System.out.println(merge(List.of(1, 4, 9), List.of(2, 4, 10)));        // [1, 2, 4, 4, 9, 10]
        List<Fruit> mixed = merge(List.of(new Apple(3), new Apple(8)), List.of(new Banana(5)));
        System.out.println(mixed);                                             // [Apple3, Banana5, Apple8]
    }
}`,
      dry: { head: ['i', 'j', 'compare', 'out'], rows: [['0', '0', 'Apple3 ≤ Banana5', '[Apple3]'], ['1', '0', 'Apple8 &gt; Banana5', '[Apple3, Banana5]'], ['1', '1', 'b exhausted', '[Apple3, Banana5, Apple8]']] },
      complexity: `<p>O(n + m) time, O(n + m) space for the output.</p>`,
      followUps: ['Merge k sorted lists with a <code>PriorityQueue</code> — what is the generic type of the heap entries?', 'Make it lazy: return an <code>Iterator&lt;T&gt;</code> instead of a list.']
    }
  });

  practice.push({
    title: 'Generic groupBy with a Key Extractor',
    level: 'Medium', tags: ['generic method', 'Function', 'HashMap'], companies: ['Swiggy', 'Salesforce', 'ServiceNow'],
    statement: `<p>Write ${C('groupBy(items, keyFn)')} returning ${C('Map<K, List<T>>')} that groups items by ${C('keyFn(item)')}, preserving item order inside each group and first-seen order of keys. It must accept a key function declared on a supertype (e.g. ${C('Function<Object, Integer>')} hashing anything) and one returning a subtype of K.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>6</sup>; keys may repeat; keyFn never returns null.`,
    example: `<p>words ["apple", "bob", "avocado", "cat"], key = length → ${H.c('g', '{5=[apple], 3=[bob, cat], 7=[avocado]}')}.</p>`,
    brute: { why: `<p>Collect the distinct keys first, then for each key scan all items again: O(n · k). With many distinct keys this approaches O(n<sup>2</sup>). A raw ${C('Map')} would also lose the element type.</p>`, code: `
class GroupSlow {
    static <T, K> Map<K, List<T>> groupBy(List<T> items, java.util.function.Function<T, K> f) {
        Map<K, List<T>> out = new LinkedHashMap<>();
        for (T t : items) out.putIfAbsent(f.apply(t), new ArrayList<>());
        for (K k : out.keySet())
            for (T t : items) if (f.apply(t).equals(k)) out.get(k).add(t);   // rescans per key
        return out;
    }
}` },
    mcq: { q: 'Which parameter type for keyFn is most flexible while still letting the result be <code>Map&lt;K, List&lt;T&gt;&gt;</code>?', options: ['<code>Function&lt;T, K&gt;</code>', '<code>Function&lt;? super T, ? extends K&gt;</code>', '<code>Function&lt;? extends T, ? super K&gt;</code>', '<code>Function&lt;?, ?&gt;</code>'], answer: 1, explain: 'The function consumes Ts (super) and produces Ks (extends) — the exact shape of Collectors.groupingBy(Function&lt;? super T, ? extends K&gt;).' },
    hints: [`<p>Hint 1: one pass with ${C('computeIfAbsent(key, k -> new ArrayList<>())')}.</p>`, `<p>Hint 2: ${C('LinkedHashMap')} keeps first-seen key order. Signature: ${C('<T, K> Map<K, List<T>> groupBy(Iterable<? extends T> items, Function<? super T, ? extends K> keyFn)')}.</p>`, `<p>Hint 3: inside the loop, ${C('K k = keyFn.apply(t)')} compiles because ${C('? extends K')} is a K. Add t to the group list. Empty input → empty map.</p>`],
    tests: { sig: 'string string[] -> string', fn: 'run', harness: { java: `
class Check {
  static String run(String kind, String[] a) {
    if (kind.equals("len")) {
      Map<Integer, List<String>> m = GroupBy.groupBy(Arrays.asList(a), String::length);
      return m.toString();
    }
    List<Integer> ints = new ArrayList<>();
    for (String s : a) ints.add(Integer.valueOf(s));
    Function<Object, Integer> bucket = o -> Math.floorMod(o.hashCode(), 2);
    Map<Integer, List<Integer>> m = GroupBy.groupBy(ints, bucket);
    return m.toString();
  }
}` }, cases: [
        [['len', ['apple', 'bob', 'avocado', 'cat']], '{5=[apple], 3=[bob, cat], 7=[avocado]}'],
        [['parity', ['1', '2', '3', '4']], '{1=[1, 3], 0=[2, 4]}'],
        [['len', []], '{}'],
        [['len', ['a']], '{1=[a]}'],
        [['len', ['', 'b', '', 'cc']], '{0=[, ], 1=[b], 2=[cc]}'],
        [['parity', ['-3', '-2', '0']], '{1=[-3], 0=[-2, 0]}'],
        [['parity', ['2', '2', '2']], '{0=[2, 2, 2]}'],
        [['len', ['bb', 'a', 'cc', 'b', 'dd']], '{2=[bb, cc, dd], 1=[a, b]}']
      ] },
    solution: {
      approach: `<p>Single pass, PECS on the function, insertion-ordered map. Equivalent to ${C('stream.collect(groupingBy(keyFn, LinkedHashMap::new, toList()))')}.</p>`,
      code: `
import java.util.*;
import java.util.function.*;

class GroupBy {
    static <T, K> Map<K, List<T>> groupBy(Iterable<? extends T> items, Function<? super T, ? extends K> keyFn) {
        Map<K, List<T>> out = new LinkedHashMap<>();
        for (T t : items) {
            K k = keyFn.apply(t);
            out.computeIfAbsent(k, x -> new ArrayList<>()).add(t);
        }
        return out;
    }
    public static void main(String[] args) {
        List<String> words = List.of("apple", "bob", "avocado", "cat");
        Map<Integer, List<String>> byLen = groupBy(words, String::length);
        System.out.println(byLen);                                  // {5=[apple], 3=[bob, cat], 7=[avocado]}
        Function<Object, Integer> bucket = o -> Math.floorMod(o.hashCode(), 2);
        Map<Integer, List<Integer>> parity = groupBy(List.of(1, 2, 3, 4), bucket);   // Function<Object, …> accepted
        System.out.println(parity);                                 // {1=[1, 3], 0=[2, 4]}
    }
}`,
      complexity: `<p>O(n) expected time, O(n) space.</p>`,
      followUps: ['Add a downstream reducer: <code>&lt;T, K, R&gt; Map&lt;K, R&gt; groupBy(…, Function&lt;? super List&lt;T&gt;, ? extends R&gt;)</code>.', 'Make the map type caller-chosen with a <code>Supplier&lt;M&gt;</code> where <code>M extends Map&lt;K, List&lt;T&gt;&gt;</code>.']
    }
  });

  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'Generic Binary Min-Heap with Comparator or Natural Order',
    level: 'Hard', tags: ['generic class', 'heap', 'bounded factory', 'Object[] storage'], companies: ['Google', 'Amazon', 'Citadel'],
    statement: `<p>Implement ${C('MinHeap<E>')} with ${C('offer(E)')}, ${C('E poll()')}, ${C('E peek()')}, ${C('int size()')}. Two ways to create one: ${C('new MinHeap<>(comparator)')} for any E, and a static factory ${C('MinHeap.natural()')} that must <b>only compile</b> for types with a natural order (${C('MinHeap.<Object>natural()')} must be a compile error, unlike ${C('java.util.PriorityQueue')}, which accepts it and fails at runtime).</p>`,
    constraints: `Up to 10<sup>6</sup> operations; offer/poll O(log n); no java.util collections inside; null elements rejected.`,
    example: `<p>natural heap: offer 5, 1, 4, 1 → poll ${H.c('g', '1')}, ${H.c('g', '1')}, ${H.c('g', '4')}, ${H.c('g', '5')}. With ${C('Comparator.comparing(String::length)')}: offer "ccc", "a", "bb" → poll ${H.c('g', '"a"')}.</p>`,
    brute: { why: `<p>A sorted array with insertion is O(n) per offer; a linear scan for the min is O(n) per poll. And copying PriorityQueue's design (cast every element to ${C('Comparable')} at runtime when no comparator is given) moves a type error from compile time to a ClassCastException in production.</p>`, code: `
class SlowMinHeap<E> {
    private final List<E> items = new ArrayList<>();
    private final Comparator<? super E> cmp;
    SlowMinHeap(Comparator<? super E> cmp) { this.cmp = cmp; }
    void offer(E e) { items.add(e); }
    E poll() {                                    // O(n) scan every time
        if (items.isEmpty()) return null;
        int best = 0;
        for (int i = 1; i < items.size(); i++) if (cmp.compare(items.get(i), items.get(best)) < 0) best = i;
        return items.remove(best);
    }
}` },
    mcq: { q: 'How can the factory guarantee at COMPILE time that E has a natural order?', options: ['Check <code>instanceof Comparable</code> in the constructor', 'Declare it as <code>static &lt;E extends Comparable&lt;? super E&gt;&gt; MinHeap&lt;E&gt; natural()</code> and pass <code>Comparator.naturalOrder()</code>', 'Use a raw Comparable cast', 'It is impossible because of erasure'], answer: 1, explain: 'A bounded type parameter on the static factory restricts which E callers may choose. Comparator.naturalOrder() has the same bound, so no unchecked cast is needed anywhere. Erasure does not matter — the check is a compile-time one.' },
    hints: [`<p>Hint 1: store elements in ${C('Object[]')} (as in Topic 6) with one private ${C('@SuppressWarnings("unchecked") E at(int i)')}. Children of i are 2i + 1 and 2i + 2; parent is (i − 1) / 2.</p>`, `<p>Hint 2: keep a ${C('Comparator<? super E>')} field (consumer of Es → super). The factory ${C('static <E extends Comparable<? super E>> MinHeap<E> natural()')} returns ${C('new MinHeap<>(Comparator.naturalOrder())')}.</p>`, `<p>Hint 3: offer → append, sift up while smaller than parent. poll → save root, move last to root, null out the old last slot (avoid memory leaks), sift down choosing the smaller child. Grow with ${C('Arrays.copyOf')} doubling.</p>`],
    tests: { sig: 'string string[] -> string[]', fn: 'run', harness: { java: `
class Check {
  static String[] run(String kind, String[] ops) {
    List<String> out = new ArrayList<>();
    MinHeap<Integer> h = MinHeap.natural();
    MinHeap<String> s = new MinHeap<>(Comparator.comparing(String::length));
    boolean str = kind.equals("len");
    for (String op : ops) {
      try {
        if (op.startsWith("offer:")) { String v = op.substring(6); if (str) s.offer(v.equals("null") ? null : v); else h.offer(Integer.valueOf(v)); }
        else if (op.equals("poll")) out.add(String.valueOf(str ? s.poll() : h.poll()));
        else if (op.equals("peek")) out.add(String.valueOf(str ? s.peek() : h.peek()));
        else if (op.equals("size")) out.add(String.valueOf(str ? s.size() : h.size()));
        else if (op.startsWith("sort:")) {
          int n = Integer.parseInt(op.substring(5)); long x = 12345; int prev = Integer.MIN_VALUE; boolean ok = true;
          for (int i = 0; i < n; i++) { x = (x * 1103515245L + 12345L) % 2147483648L; h.offer((int) (x % 1000)); }
          for (int i = 0; i < n; i++) { int v = h.poll(); if (v < prev) ok = false; prev = v; }
          out.add(ok && h.size() == 0 ? "sorted" : "bad");
        }
      } catch (Exception e) { out.add(e.getClass().getSimpleName()); }
    }
    return out.toArray(new String[0]);
  }
}` }, cases: [
        [['nat', ['offer:5', 'offer:1', 'offer:4', 'offer:1', 'poll', 'poll', 'poll', 'poll', 'poll']], ['1', '1', '4', '5', 'null']],
        [['len', ['offer:ccc', 'offer:a', 'offer:bb', 'poll', 'peek', 'size']], ['a', 'bb', '2']],
        [['nat', ['peek', 'poll', 'size']], ['null', 'null', '0']],
        [['nat', ['offer:-5', 'offer:0', 'offer:-9', 'peek', 'poll', 'poll', 'poll']], ['-9', '-9', '-5', '0']],
        [['len', ['offer:null', 'size']], ['NullPointerException', '0']],
        [['nat', ['offer:3', 'offer:3', 'offer:3', 'poll', 'size']], ['3', '2']],
        [['nat', ['offer:2147483647', 'offer:-2147483648', 'poll', 'poll']], ['-2147483648', '2147483647']],
        [['nat', { $concat: [{ $rep: 'offer:7', n: 20 }, ['size']] }], ['20']],
        [['nat', ['sort:200000']], ['sorted']]
      ] },
    solution: {
      approach: `<p>Array-backed binary heap, comparator-driven. The bounded static factory moves "is this type comparable?" from a runtime ClassCastException (PriorityQueue's behaviour) to a compile error.</p>`,
      code: `
import java.util.*;

class MinHeap<E> {
    private Object[] heap = new Object[8];
    private int size;
    private final Comparator<? super E> cmp;

    MinHeap(Comparator<? super E> cmp) { this.cmp = Objects.requireNonNull(cmp); }

    static <E extends Comparable<? super E>> MinHeap<E> natural() {
        return new MinHeap<>(Comparator.naturalOrder());     // compile-time guarantee, no casts
    }

    void offer(E e) {
        Objects.requireNonNull(e);
        if (size == heap.length) heap = Arrays.copyOf(heap, size * 2);
        heap[size] = e;
        siftUp(size++);
    }

    E peek() { return size == 0 ? null : at(0); }

    E poll() {
        if (size == 0) return null;
        E root = at(0);
        heap[0] = heap[--size];
        heap[size] = null;                                   // let GC reclaim it
        if (size > 0) siftDown(0);
        return root;
    }

    int size() { return size; }

    private void siftUp(int i) {
        while (i > 0) {
            int p = (i - 1) / 2;
            if (cmp.compare(at(i), at(p)) >= 0) break;
            swap(i, p);
            i = p;
        }
    }

    private void siftDown(int i) {
        while (true) {
            int l = 2 * i + 1, r = l + 1, m = i;
            if (l < size && cmp.compare(at(l), at(m)) < 0) m = l;
            if (r < size && cmp.compare(at(r), at(m)) < 0) m = r;
            if (m == i) return;
            swap(i, m);
            i = m;
        }
    }

    private void swap(int a, int b) { Object t = heap[a]; heap[a] = heap[b]; heap[b] = t; }

    @SuppressWarnings("unchecked")                           // safe: only offer(E) writes elements
    private E at(int i) { return (E) heap[i]; }

    public static void main(String[] args) {
        MinHeap<Integer> h = MinHeap.natural();
        for (int x : new int[]{5, 1, 4, 1}) h.offer(x);
        StringBuilder sb = new StringBuilder();
        while (h.size() > 0) sb.append(h.poll()).append(' ');
        System.out.println(sb.toString().trim());            // 1 1 4 5

        MinHeap<String> byLen = new MinHeap<>(Comparator.comparing(String::length));
        byLen.offer("ccc"); byLen.offer("a"); byLen.offer("bb");
        System.out.println(byLen.poll());                    // a
        // MinHeap<Object> bad = MinHeap.natural();          // does not compile: Object is not Comparable
    }
}`,
      dry: { head: ['operation', 'heap array', 'note'], rows: [['offer 5', '[5]', ''], ['offer 1', '[1, 5]', '1 &lt; 5 → sift up'], ['offer 4', '[1, 5, 4]', '4 ≥ 1 → stay'], ['offer 1', '[1, 1, 4, 5]', '1 &lt; 5 → swap, 1 ≥ 1 → stop'], ['poll', '[1, 5, 4]', 'returns 1; last (5) to root, sift down'], ['poll', '[4, 5]', 'returns 1']] },
      complexity: `<p>offer/poll O(log n), peek O(1), space O(n). Doubling growth keeps offer amortized O(log n).</p>`,
      followUps: ['Add <code>static &lt;E&gt; MinHeap&lt;E&gt; heapify(Collection&lt;? extends E&gt;, Comparator&lt;? super E&gt;)</code> in O(n).', 'Why does <code>java.util.PriorityQueue</code> accept non-Comparable elements at compile time? (one class, two constructors, pre-generics design)', 'Make it a max-heap without new code — <code>cmp.reversed()</code>.']
    }
  });

  practice.push({
    title: 'Type-Safe Event Bus with Class Tokens',
    level: 'Hard', tags: ['Class token', 'Consumer', 'PECS', 'reflection'], companies: ['Uber', 'LinkedIn', 'Atlassian'],
    statement: `<p>Build ${C('EventBus')} with ${C('<E> void subscribe(Class<E> type, Consumer<? super E> handler)')} and ${C('int publish(Object event)')}. Publishing delivers the event to handlers registered for its exact class, every superclass, and every interface it implements (each handler at most once), returning the number of deliveries. No unchecked casts, no raw types, and a handler must receive a correctly typed event.</p>`,
    constraints: `Up to 10<sup>4</sup> subscriptions and 10<sup>6</sup> publishes; single-threaded.`,
    example: `<p>${C('interface Event')}, ${C('record OrderPlaced(String id) implements Event')}. Subscribe handlers for OrderPlaced, Event and Object; ${C('publish(new OrderPlaced("A1"))')} → ${H.c('g', '3 deliveries')}; ${C('publish("hello")')} → ${H.c('g', '1')} (only the Object handler).</p>`,
    brute: { why: `<p>A ${C('Map<Class<?>, List<Consumer>>')} with raw consumers compiles (with warnings) and calls ${C('handler.accept(event)')} without any check — a handler for OrderPlaced registered under the wrong key receives a String and crashes inside user code. Exact-class lookup only also misses supertype subscribers.</p>`, code: `
class RawBus {
    private final Map<Class<?>, List<java.util.function.Consumer>> handlers = new HashMap<>();
    @SuppressWarnings("rawtypes")
    void subscribe(Class<?> type, java.util.function.Consumer h) { handlers.computeIfAbsent(type, k -> new ArrayList<>()).add(h); }
    @SuppressWarnings("unchecked")
    void publish(Object e) {
        for (java.util.function.Consumer h : handlers.getOrDefault(e.getClass(), List.of())) h.accept(e); // exact class only, unchecked
    }
}` },
    mcq: { q: 'How can handlers of different event types live in ONE map without unchecked casts?', options: ['Store <code>Consumer&lt;?&gt;</code> and cast on dispatch', 'Wrap each handler at subscribe time as <code>Consumer&lt;Object&gt;</code>: <code>o -&gt; handler.accept(type.cast(o))</code>', 'Use a raw Consumer', 'Use one map per event type created with reflection'], answer: 1, explain: 'At subscribe time you still know E and have the Class&lt;E&gt; token. type.cast performs a real runtime check and returns an E, so the wrapper is a fully type-safe Consumer&lt;Object&gt;.' },
    hints: [`<p>Hint 1: the ${C('Class<E>')} parameter both keys the map and carries runtime type info. ${C('Consumer<? super E>')} lets a ${C('Consumer<Event>')} subscribe to OrderPlaced.</p>`, `<p>Hint 2: store ${C('Map<Class<?>, List<Consumer<Object>>>')}; on subscribe add ${C('o -> handler.accept(type.cast(o))')}.</p>`, `<p>Hint 3: on publish, collect supertypes with a BFS over ${C('getSuperclass()')} and ${C('getInterfaces()')} into a ${C('LinkedHashSet<Class<?>>')} (visits each type once), then call each type's handlers.</p>`],
    tests: { sig: 'string[] -> string[]', fn: 'run', harness: { java: `
class Check {
  static String[] run(String[] ops) {
    EventBus bus = new EventBus();
    List<String> log = new ArrayList<>(), out = new ArrayList<>();
    for (String op : ops) {
      if (op.equals("sub:order")) bus.subscribe(OrderPlaced.class, e -> log.add("order " + e.id()));
      else if (op.equals("sub:event")) { Consumer<Event> audit = e -> log.add("audit " + e.getClass().getSimpleName()); bus.subscribe(Event.class, audit); }
      else if (op.equals("sub:orderAudit")) { Consumer<Event> audit = e -> log.add("audit " + e.getClass().getSimpleName()); bus.subscribe(OrderPlaced.class, audit); }
      else if (op.equals("sub:object")) bus.subscribe(Object.class, o -> log.add("any " + o));
      else if (op.equals("sub:string")) bus.subscribe(String.class, s -> log.add("str " + s.length()));
      else if (op.startsWith("pub:order:")) out.add(String.valueOf(bus.publish(new OrderPlaced(op.substring(10)))));
      else if (op.startsWith("pub:str:")) out.add(String.valueOf(bus.publish(op.substring(8))));
      else if (op.equals("pub:int")) out.add(String.valueOf(bus.publish(42)));
      else if (op.equals("log")) out.add(log.toString());
      else if (op.equals("clear")) log.clear();
    }
    return out.toArray(new String[0]);
  }
}` }, cases: [
        [[['sub:order', 'sub:orderAudit', 'sub:object', 'pub:order:A1', 'pub:str:hello', 'log']], ['3', '1', '[order A1, audit OrderPlaced, any OrderPlaced[id=A1], any hello]']],
        [[['pub:order:A1', 'pub:str:x', 'pub:int']], ['0', '0', '0']],
        [[['sub:object', 'pub:int', 'log']], ['1', '[any 42]']],
        [[['sub:event', 'pub:order:B', 'pub:str:s', 'log']], ['1', '0', '[audit OrderPlaced]']],
        [[['sub:order', 'sub:order', 'pub:order:Z', 'log']], ['2', '[order Z, order Z]']],
        [[['sub:string', 'sub:object', 'pub:str:abc', 'log']], ['2', '[str 3, any abc]']],
        [[['sub:object', 'sub:event', 'sub:order', 'pub:order:1', 'log']], ['3', '[order 1, audit OrderPlaced, any OrderPlaced[id=1]]']],
        [[{ $concat: [{ $rep: 'sub:object', n: 5000 }, ['pub:str:q']] }], ['5000']]
      ] },
    solution: {
      approach: `<p>Type tokens + adapter lambdas: type safety is checked once at subscribe (compile time) and enforced by ${C('Class.cast')} at dispatch (runtime). Supertype dispatch uses a BFS over the class hierarchy.</p>`,
      code: `
import java.util.*;
import java.util.function.*;

interface Event {}
record OrderPlaced(String id) implements Event {}

class EventBus {
    private final Map<Class<?>, List<Consumer<Object>>> handlers = new HashMap<>();

    <E> void subscribe(Class<E> type, Consumer<? super E> handler) {
        Objects.requireNonNull(handler);
        handlers.computeIfAbsent(type, k -> new ArrayList<>())
                .add(o -> handler.accept(type.cast(o)));          // checked adapter, no warnings
    }

    int publish(Object event) {
        int delivered = 0;
        for (Class<?> t : supertypes(event.getClass())) {
            for (Consumer<Object> h : handlers.getOrDefault(t, List.of())) {
                h.accept(event);
                delivered++;
            }
        }
        return delivered;
    }

    private static Set<Class<?>> supertypes(Class<?> start) {
        Set<Class<?>> seen = new LinkedHashSet<>();
        Deque<Class<?>> pending = new ArrayDeque<>(List.of(start));
        while (!pending.isEmpty()) {
            Class<?> c = pending.poll();
            if (!seen.add(c)) continue;
            if (c.getSuperclass() != null) pending.add(c.getSuperclass());
            pending.addAll(Arrays.asList(c.getInterfaces()));
        }
        return seen;
    }

    public static void main(String[] args) {
        EventBus bus = new EventBus();
        List<String> log = new ArrayList<>();
        bus.subscribe(OrderPlaced.class, e -> log.add("order " + e.id()));   // e is typed OrderPlaced
        Consumer<Event> audit = e -> log.add("audit " + e.getClass().getSimpleName());
        bus.subscribe(OrderPlaced.class, audit);                            // Consumer<? super OrderPlaced>
        bus.subscribe(Object.class, o -> log.add("any " + o));
        System.out.println(bus.publish(new OrderPlaced("A1")));             // 3
        System.out.println(bus.publish("hello"));                           // 1
        System.out.println(log);
    }
}`,
      dry: { head: ['publish', 'supertypes visited', 'handlers fired'], rows: [['OrderPlaced("A1")', 'OrderPlaced, Record, Event, Object', 'order A1, audit OrderPlaced, any OrderPlaced[id=A1]'], ['"hello"', 'String, Object, Serializable, Comparable, CharSequence, Constable, ConstantDesc', 'any hello']] },
      complexity: `<p>publish: O(S + H) where S = number of supertypes (small, cacheable per class) and H = handlers fired. subscribe O(1) amortized. Space O(total handlers).</p>`,
      followUps: ['Cache <code>supertypes</code> per class in a <code>ClassValue</code> or <code>ConcurrentHashMap</code>.', 'Make it thread-safe with <code>CopyOnWriteArrayList</code> handler lists — why is that a good fit?', 'How would you support generic events like <code>Changed&lt;User&gt;</code> vs <code>Changed&lt;Order&gt;</code>? (erasure → TypeRef keys)']
    }
  });

  practice.push({
    title: 'Self-Bounded Builder Hierarchy (Pizza / Calzone)',
    level: 'Hard', tags: ['recursive bound', 'builder pattern', 'covariant return'], companies: ['Microsoft', 'JPMorgan', 'Booking.com'],
    statement: `<p>Design an abstract ${C('Pizza')} with a nested abstract ${C('Builder')} that adds toppings, and two subclasses — ${C('NyPizza')} (required size) and ${C('Calzone')} (optional ${C('sauceInside()')}). This chain must compile with <b>no casts</b>: ${C('new Calzone.Builder().addTopping(HAM).sauceInside().build()')} — note that ${C('addTopping')} is declared in the parent builder but must return the <b>child</b> builder type, and ${C('build()')} must return the concrete pizza type.</p>`,
    constraints: `Toppings are an enum; builders are single-use; build() copies state defensively.`,
    example: `<p>${C('new NyPizza.Builder(SMALL).addTopping(ONION).addTopping(HAM).build()')} → ${H.c('g', 'NyPizza SMALL [HAM, ONION]')}; ${C('new Calzone.Builder().addTopping(HAM).sauceInside().build()')} → ${H.c('g', 'Calzone sauceInside=true [HAM]')}.</p>`,
    brute: { why: `<p>With a non-generic parent builder, ${C('addTopping')} returns ${C('Pizza.Builder')}, so ${C('.sauceInside()')} is not visible after it — callers must cast ${C('((Calzone.Builder) b.addTopping(HAM)).sauceInside()')} or call methods in a fixed order. Every new subclass multiplies the casts.</p>`, code: `
class PlainPizza {
    static class Builder {
        final List<String> toppings = new ArrayList<>();
        Builder addTopping(String t) { toppings.add(t); return this; }   // returns the PARENT type
    }
    static class CalzoneBuilder extends Builder {
        boolean sauceInside;
        CalzoneBuilder sauceInside() { sauceInside = true; return this; }
    }
    public static void main(String[] args) {
        CalzoneBuilder b = (CalzoneBuilder) new CalzoneBuilder().addTopping("ham");   // cast needed
        b.sauceInside();
        System.out.println(b.toppings + " " + b.sauceInside);                        // [ham] true
    }
}` },
    mcq: { q: 'What does the recursive bound in <code>abstract static class Builder&lt;T extends Builder&lt;T&gt;&gt;</code> provide?', options: ['Runtime type checks on toppings', 'A way for parent methods to return the concrete subclass builder type T via an abstract self() method', 'Thread safety', 'Automatic implementation of build()'], answer: 1, explain: 'Each subclass declares itself as T (Calzone.Builder extends Pizza.Builder&lt;Calzone.Builder&gt;), so addTopping returns T = Calzone.Builder and chaining continues with subclass methods. Java has no self type, so self() returns this with the right static type.' },
    hints: [`<p>Hint 1: parent builder declaration: ${C('abstract static class Builder<T extends Builder<T>>')} with ${C('protected abstract T self();')}. Parent setters ${C('return self();')}.</p>`, `<p>Hint 2: each subclass: ${C('static class Builder extends Pizza.Builder<Builder>')} with ${C('self() { return this; }')} and a <b>covariant</b> ${C('NyPizza build()')} (overrides ${C('abstract Pizza build()')}).</p>`, `<p>Hint 3: the Pizza constructor takes ${C('Builder<?> builder')} and copies ${C('builder.toppings.clone()')} (EnumSet) so later builder changes do not leak into built pizzas.</p>`],
    tests: { sig: 'string string[] -> string[]', fn: 'run', harness: { java: `
class Check {
  static String[] run(String kind, String[] tops) {
    try {
      if (kind.startsWith("ny:")) {
        NyPizza.Builder b = new NyPizza.Builder(NyPizza.Size.valueOf(kind.substring(3)));
        for (String t : tops) b.addTopping(t.equals("null") ? null : Pizza.Topping.valueOf(t));
        NyPizza first = b.build();
        b.addTopping(Pizza.Topping.PEPPER);
        return new String[]{ first.toString(), b.build().toString() };
      }
      Calzone.Builder b = new Calzone.Builder();
      for (String t : tops) b.addTopping(Pizza.Topping.valueOf(t));
      if (kind.equals("calzone+sauce")) return new String[]{ b.sauceInside().build().toString() };
      return new String[]{ b.build().toString() };
    } catch (NullPointerException e) { return new String[]{ "NPE" }; }
  }
}` }, cases: [
        [['ny:SMALL', ['ONION', 'HAM']], ['NyPizza SMALL [HAM, ONION]', 'NyPizza SMALL [HAM, ONION, PEPPER]']],
        [['calzone+sauce', ['HAM']], ['Calzone sauceInside=true [HAM]']],
        [['calzone', []], ['Calzone sauceInside=false []']],
        [['calzone', ['HAM', 'HAM', 'HAM']], ['Calzone sauceInside=false [HAM]']],
        [['ny:LARGE', []], ['NyPizza LARGE []', 'NyPizza LARGE [PEPPER]']],
        [['ny:MEDIUM', ['PEPPER', 'MUSHROOM', 'ONION', 'HAM']], ['NyPizza MEDIUM [HAM, MUSHROOM, ONION, PEPPER]', 'NyPizza MEDIUM [HAM, MUSHROOM, ONION, PEPPER]']],
        [['ny:SMALL', ['null']], ['NPE']],
        [['calzone+sauce', ['PEPPER', 'ONION']], ['Calzone sauceInside=true [ONION, PEPPER]']]
      ] },
    solution: {
      approach: `<p>Simulated self-type via a recursive bound (Effective Java Item 2). Parent methods return T; subclasses bind T to themselves; build() uses covariant return types — which javac implements with bridge methods.</p>`,
      code: `
import java.util.*;

abstract class Pizza {
    enum Topping { HAM, MUSHROOM, ONION, PEPPER }
    final Set<Topping> toppings;

    abstract static class Builder<T extends Builder<T>> {
        EnumSet<Topping> toppings = EnumSet.noneOf(Topping.class);
        T addTopping(Topping t) {
            toppings.add(Objects.requireNonNull(t));
            return self();                       // returns the SUBCLASS builder type
        }
        abstract Pizza build();                  // subclasses override with a covariant return
        protected abstract T self();
    }

    Pizza(Builder<?> builder) { toppings = builder.toppings.clone(); }   // defensive copy
}

class NyPizza extends Pizza {
    enum Size { SMALL, MEDIUM, LARGE }
    final Size size;

    static class Builder extends Pizza.Builder<Builder> {
        private final Size size;
        Builder(Size size) { this.size = Objects.requireNonNull(size); }
        @Override NyPizza build() { return new NyPizza(this); }
        @Override protected Builder self() { return this; }
    }

    private NyPizza(Builder b) { super(b); size = b.size; }
    @Override public String toString() { return "NyPizza " + size + " " + toppings; }
}

class Calzone extends Pizza {
    final boolean sauceInside;

    static class Builder extends Pizza.Builder<Builder> {
        private boolean sauceInside = false;
        Builder sauceInside() { sauceInside = true; return this; }
        @Override Calzone build() { return new Calzone(this); }
        @Override protected Builder self() { return this; }
    }

    private Calzone(Builder b) { super(b); sauceInside = b.sauceInside; }
    @Override public String toString() { return "Calzone sauceInside=" + sauceInside + " " + toppings; }

    public static void main(String[] args) {
        NyPizza ny = new NyPizza.Builder(NyPizza.Size.SMALL)
                .addTopping(Topping.ONION).addTopping(Topping.HAM).build();     // build() returns NyPizza
        Calzone cz = new Calzone.Builder()
                .addTopping(Topping.HAM).sauceInside().build();                 // no casts anywhere
        System.out.println(ny);   // NyPizza SMALL [HAM, ONION]
        System.out.println(cz);   // Calzone sauceInside=true [HAM]
    }
}`,
      dry: { head: ['call', 'static type returned', 'state'], rows: [['new Calzone.Builder()', 'Calzone.Builder', 'toppings {}'], ['.addTopping(HAM)', 'Calzone.Builder (T)', 'toppings {HAM}'], ['.sauceInside()', 'Calzone.Builder', 'sauceInside = true'], ['.build()', 'Calzone (covariant)', 'Calzone sauceInside=true [HAM]']] },
      complexity: `<p>O(1) per builder call; build() copies the topping set (EnumSet copy is O(1) — a bit vector).</p>`,
      followUps: ['What stops <code>class Evil extends Pizza.Builder&lt;NyPizza.Builder&gt;</code>? (nothing — that is why self() is abstract)', 'Compare with Lombok <code>@SuperBuilder</code> — what does it generate?', 'How do Java records change the builder trade-off?']
    }
  });

  practice.push({
    title: 'Sealed Result&lt;T&gt; with map, flatMap and Generic orElseThrow',
    level: 'Hard', tags: ['sealed interface', 'generic records', 'PECS', 'pattern matching', 'generic exceptions'], companies: ['Stripe', 'Goldman Sachs', 'Atlassian'],
    statement: `<p>Create ${C('sealed interface Result<T>')} with records ${C('Ok<T>(T value)')} and ${C('Err<T>(Exception error)')}. Provide ${C('static <T> Result<T> of(Callable<? extends T>)')}, ${C('map')}, ${C('flatMap')}, ${C('orElse')}, and ${C('orElseThrow(mapper)')} that throws an exception type chosen by the caller <b>and declared generically</b> (so a checked exception must be caught, but an unchecked one need not be). Use Java 21 pattern matching; no casts.</p>`,
    constraints: `Java 21; all methods are default/static methods on the interface; no unchecked warnings.`,
    example: `<p>${C('of(() -> Integer.parseInt("21")).map(n -> n * 2)')} → ${H.c('g', 'Ok[value=42]')}. ${C('of(() -> Integer.parseInt("x2")).orElse(-1)')} → ${H.c('g', '-1')}. ${C('bad.orElseThrow(e -> new IllegalStateException("bad input", e))')} → ${H.c('r', 'IllegalStateException caused by NumberFormatException')}.</p>`,
    brute: { why: `<p>Returning ${C('null')} or throwing raw exceptions from every step forces try/catch blocks at each call and loses the original cause. An Object-based result (${C('Object value; Exception error;')}) needs casts and lets callers read the value of a failure by mistake.</p>`, code: `
class NaiveParse {
    static Integer parseOrNull(String s) {
        try { return Integer.parseInt(s); } catch (NumberFormatException e) { return null; }   // cause lost
    }
    public static void main(String[] args) {
        Integer n = parseOrNull("x2");
        System.out.println(n == null ? "failed (why?)" : String.valueOf(n * 2));
    }
}` },
    mcq: { q: 'Why is <code>orElseThrow</code> declared as <code>&lt;X extends Throwable&gt; T orElseThrow(Function&lt;? super Exception, ? extends X&gt; f) throws X</code>?', options: ['Because generic exceptions cannot be caught', 'So the compiler infers X from the caller\'s lambda: checked exceptions must be handled, unchecked ones need not be', 'To erase the exception type', 'It is required by sealed interfaces'], answer: 1, explain: 'A type parameter may appear in a throws clause. When the mapper returns IllegalStateException, X = IllegalStateException (unchecked) and callers need no try/catch; returning IOException would force handling. Optional.orElseThrow(Supplier&lt;? extends X&gt;) uses the same idea.' },
    hints: [`<p>Hint 1: generic records implement the sealed interface: ${C('record Ok<T>(T value) implements Result<T>')}. A switch over ${C('this')} with ${C('case Ok<T>(T v)')} and ${C('case Err<T>(Exception e)')} is exhaustive — no default needed.</p>`, `<p>Hint 2: ${C('map(Function<? super T, ? extends R> f)')} → on Ok wrap ${C('of(() -> f.apply(v))')} (so exceptions in f become Err); on Err return ${C('new Err<>(e)')} (a new Err with the new type parameter R).</p>`, `<p>Hint 3: ${C('flatMap(Function<? super T, ? extends Result<? extends R>> f)')} — unwrap the inner result with a nested switch to convert ${C('Result<? extends R>')} into ${C('Result<R>')}. For orElseThrow, a switch case may itself ${C('throw toThrow.apply(e)')}.</p>`],
    tests: { sig: 'string -> string[]', fn: 'run', harness: { java: `
class Check {
  static String d(Result<?> r) {
    return r instanceof Result.Ok<?> o ? "Ok:" + o.value() : "Err:" + ((Result.Err<?>) r).error().getClass().getSimpleName();
  }
  static String[] run(String s) {
    Result<Integer> parsed = Result.of(() -> Integer.parseInt(s));
    Result<Integer> doubled = parsed.map(n -> n * 2);
    Result<Double> inv = parsed.flatMap(n -> n == 0 ? new Result.Err<Double>(new ArithmeticException("zero")) : new Result.Ok<>(1.0 / n));
    String thrown;
    try { thrown = String.valueOf(doubled.orElseThrow(e -> new IllegalStateException("bad input", e))); }
    catch (IllegalStateException e) { thrown = e.getMessage() + " <- " + e.getCause().getClass().getSimpleName(); }
    Result<Integer> boom = parsed.map(n -> 10 / n);
    return new String[]{ d(doubled), String.valueOf(doubled.orElse(-1)), String.valueOf(inv.orElse(Double.NaN)), thrown, d(boom) };
  }
}` }, cases: [
        [['21'], ['Ok:42', '42', '0.047619047619047616', '42', 'Ok:0']],
        [['x2'], ['Err:NumberFormatException', '-1', 'NaN', 'bad input <- NumberFormatException', 'Err:NumberFormatException']],
        [['4'], ['Ok:8', '8', '0.25', '8', 'Ok:2']],
        [['0'], ['Ok:0', '0', 'NaN', '0', 'Err:ArithmeticException']],
        [['-8'], ['Ok:-16', '-16', '-0.125', '-16', 'Ok:-1']],
        [[''], ['Err:NumberFormatException', '-1', 'NaN', 'bad input <- NumberFormatException', 'Err:NumberFormatException']],
        [['2147483647'], ['Ok:-2', '-2', '4.656612875245797E-10', '-2', 'Ok:0']],
        [['-2147483648'], ['Ok:0', '0', '-4.656612873077393E-10', '0', 'Ok:0']]
      ] },
    solution: {
      approach: `<p>A sealed sum type of two generic records. Pattern-matching switches make every operation exhaustive and cast-free; PECS on every function parameter; a type parameter in the throws clause gives caller-chosen exceptions.</p>`,
      code: `
import java.util.*;
import java.util.function.*;
import java.util.concurrent.*;

sealed interface Result<T> permits Result.Ok, Result.Err {
    record Ok<T>(T value) implements Result<T> {}
    record Err<T>(Exception error) implements Result<T> {}

    static <T> Result<T> of(Callable<? extends T> action) {
        try { return new Ok<>(action.call()); }
        catch (Exception e) { return new Err<>(e); }
    }

    default <R> Result<R> map(Function<? super T, ? extends R> f) {
        return switch (this) {
            case Ok<T>(T v) -> Result.of(() -> f.apply(v));      // exceptions inside f become Err
            case Err<T>(Exception e) -> new Err<>(e);           // same error, new type parameter
        };
    }

    default <R> Result<R> flatMap(Function<? super T, ? extends Result<? extends R>> f) {
        return switch (this) {
            case Ok<T>(T v) -> {
                Result<? extends R> next = f.apply(v);
                yield switch (next) {                           // widen Result<? extends R> to Result<R>
                    case Ok<? extends R>(var r) -> new Ok<R>(r);
                    case Err<? extends R>(var e) -> new Err<R>(e);
                };
            }
            case Err<T>(Exception e) -> new Err<>(e);
        };
    }

    default T orElse(T fallback) {
        return this instanceof Ok<T>(T v) ? v : fallback;
    }

    default <X extends Throwable> T orElseThrow(Function<? super Exception, ? extends X> toThrow) throws X {
        return switch (this) {
            case Ok<T>(T v) -> v;
            case Err<T>(Exception e) -> throw toThrow.apply(e);
        };
    }
}

class ResultDemo {
    static Result<Integer> parse(String s) { return Result.of(() -> Integer.parseInt(s)); }

    public static void main(String[] args) {
        Result<Integer> ok = parse("21").map(n -> n * 2);
        Result<Integer> bad = parse("x2").map(n -> n * 2);
        System.out.println(ok);                                   // Ok[value=42]
        System.out.println(bad.orElse(-1));                       // -1
        Result<Double> inv = parse("4").flatMap(n -> n == 0
                ? new Result.Err<Double>(new ArithmeticException("zero"))
                : new Result.Ok<>(1.0 / n));
        System.out.println(inv.orElse(Double.NaN));               // 0.25
        try {
            bad.orElseThrow(e -> new IllegalStateException("bad input", e));   // unchecked: no throws needed
        } catch (IllegalStateException e) {
            System.out.println(e.getMessage() + " <- " + e.getCause().getClass().getSimpleName()); // bad input <- NumberFormatException
        }
        int v = ok.orElseThrow(IllegalArgumentException::new);    // X = IllegalArgumentException
        System.out.println(v);                                    // 42
    }
}`,
      dry: { head: ['expression', 'variant', 'value / error'], rows: [['parse("21")', 'Ok&lt;Integer&gt;', '21'], ['.map(n -&gt; n * 2)', 'Ok&lt;Integer&gt;', '42'], ['parse("x2")', 'Err&lt;Integer&gt;', 'NumberFormatException'], ['.map(n -&gt; n * 2)', 'Err&lt;Integer&gt;', 'same exception (f never runs)'], ['parse("4").flatMap(1.0 / n)', 'Ok&lt;Double&gt;', '0.25']] },
      complexity: `<p>O(1) per operation plus the cost of the user functions; each step allocates one small record.</p>`,
      followUps: ['Add <code>recover(Function&lt;? super Exception, ? extends T&gt;)</code>.', 'Why can\'t <code>Err</code> be generic in the exception type, e.g. <code>Err&lt;T, E extends Exception&gt;</code>, and still be caught by type? (catch needs reifiable types)', 'Compare with <code>CompletableFuture.thenApply / thenCompose</code> — same PECS shapes.']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push({ q: `In ${C('class Box<T>')} and ${C('Box<String> b')}, what are T and String called?`, options: ['T = type argument, String = type parameter', 'T = type parameter, String = type argument', 'Both are type variables', 'T = raw type, String = parameterized type'], answer: 1, explain: `${C('T')} is the placeholder declared by the class (type parameter); ${C('String')} is what you plug in (type argument). ${C('Box<String>')} is a parameterized type and plain ${C('Box')} is the raw type.` });
  quiz.push({ q: `Does ${C('List<Number> nums = new ArrayList<Integer>();')} compile?`, options: ['Yes, Integer is a Number', 'No — generics are invariant', 'Yes, but with an unchecked warning', 'Only with the diamond operator'], answer: 1, explain: `List&lt;Integer&gt; is not a subtype of List&lt;Number&gt;. If it were, ${C('nums.add(3.14)')} would put a Double into a list of Integers. Use ${C('List<? extends Number>')} for read-only flexibility.` });
  quiz.push({ q: `What can you add to a ${C('List<? extends Number>')}?`, options: ['Any Number', 'Integers only', 'Only null', 'Anything, with a warning'], answer: 2, explain: 'The real list might be a List&lt;Double&gt;, List&lt;Integer&gt; or List&lt;BigDecimal&gt;; the compiler cannot prove any particular Number fits, so only null (a member of every reference type) is allowed. Reading gives Number.' });
  quiz.push({ q: `Reading from a ${C('List<? super Integer>')} with ${C('x = list.get(0)')} — what is the most specific type x can be declared with (no cast)?`, options: ['Integer', 'Number', 'Object', 'Comparable&lt;Integer&gt;'], answer: 2, explain: 'The list could be a List&lt;Object&gt; holding anything, so only Object is guaranteed. ? super is for writing (consumers), not reading.' });
  quiz.push({ q: `What does ${C('<T extends Number & Comparable<T>>')} erase to?`, options: ['Object', 'Number', 'Comparable', 'Number &amp; Comparable'], answer: 1, explain: 'A type variable erases to its leftmost bound. That is why the class (if any) must come first in a multiple bound, and why Collections.max uses <code>T extends Object &amp; Comparable&lt;? super T&gt;</code> to keep an Object return type.' });
  quiz.push({ q: `Predict the output: ${C('System.out.println(new ArrayList<String>().getClass() == new ArrayList<Integer>().getClass());')}`, options: ['true', 'false', 'Compile error', 'ClassCastException'], answer: 0, explain: 'After erasure there is exactly one runtime class, java.util.ArrayList, for every parameterization.' });
  quiz.push({ q: 'Which line compiles?', options: [`${C('T[] a = new T[10];')}`, `${C('List<String>[] a = new List<String>[10];')}`, `${C('List<?>[] a = new List<?>[10];')}`, `${C('if (o instanceof List<String>)')} with ${C('Object o')}`], answer: 2, explain: 'List&lt;?&gt; is reifiable (an unbounded wildcard claims nothing erasure removed), so arrays of it are allowed. The others need runtime type information that erasure deleted.' });
  quiz.push({ q: `Why does ${C('Comparator.comparing(p -> p.name()).reversed()')} fail to compile for a ${C('Comparator<Person>')} target?`, options: ['reversed() does not exist', 'Inference has no target type for comparing(...) inside a chain, so p is typed Object', 'Lambdas cannot be used with comparing', 'Person must implement Comparable'], answer: 1, explain: 'The target type belongs to the last call in the chain. Use <code>comparing(Person::name)</code> or a typed lambda <code>(Person p) -&gt; p.name()</code>.' });
  quiz.push({ q: `${C('static <T> T unsafeCast(Object o) { return (T) o; }')} — where is the ClassCastException thrown for ${C('String s = unsafeCast(42);')}?`, options: ['Inside unsafeCast, at (T) o', 'At the caller, on the assignment line (hidden checkcast)', 'Never', 'At class loading'], answer: 1, explain: '(T) o erases to (Object) o — a no-op. javac inserts checkcast String where the result is assigned to a String, so the exception appears at the call site.' });
  quiz.push({ q: 'Which is the correct PECS signature for copying from src to dest?', options: [`${C('<T> void copy(List<? extends T> dest, List<? super T> src)')}`, `${C('<T> void copy(List<? super T> dest, List<? extends T> src)')}`, `${C('<T> void copy(List<T> dest, List<T> src)')}`, `${C('void copy(List<?> dest, List<?> src)')}`], answer: 1, explain: 'src produces Ts → extends; dest consumes Ts → super. This is exactly java.util.Collections.copy.' });
  quiz.push({ q: `Does this compile? ${C('class P { void f(List<String> a) {} void f(List<Integer> b) {} }')}`, options: ['Yes, they are overloads', 'No — name clash: both methods have the same erasure f(List)', 'Yes, but calls are ambiguous', 'No — List cannot be a parameter type'], answer: 1, explain: 'After erasure both are f(List), which the JVM cannot distinguish.' });
  quiz.push({ q: `${C('@SafeVarargs')} is a correct annotation for which method?`, options: [`${C('static <T> T[] toArray(T... a) { return a; }')}`, `${C('static <T> List<T> listOf(T... a) { return new ArrayList<>(Arrays.asList(a)); }')}`, `${C('static <T> void store(T... a) { Object[] o = a; o[0] = 1; }')}`, 'Any public overridable instance method'], answer: 1, explain: 'listOf only reads the array contents and does not let the array escape. Returning the array (option 1) or storing into it (option 3) causes heap pollution; @SafeVarargs is not allowed on overridable methods.' });
  quiz.push({ q: `What does a raw ${C('Box')} do to the method ${C('List<String> names()')} declared in ${C('class Box<T>')}?`, options: ['Nothing — names() has no T', 'Its return type becomes raw List, so names().get(0) is an Object', 'It becomes List&lt;Object&gt;', 'It becomes List&lt;?&gt;'], answer: 1, explain: 'Using a raw type erases ALL generic information in its members, even unrelated to T. Use Box&lt;?&gt; to keep member signatures.' });

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push({ level: 'B', q: 'What problem do generics solve? Show before and after.', a: `<p>They move type errors from <b>runtime</b> to <b>compile time</b> and remove casts. Before Java 5, ${C('List list = new ArrayList(); list.add(42); String s = (String) list.get(0);')} compiled and failed with ClassCastException at runtime. With ${C('List<String>')} the ${C('add(42)')} is a compile error and ${C('get')} needs no cast. They also make APIs self-documenting (${C('Map<UserId, Order>')} says what it holds) and let you write one algorithm (${C('Collections.sort')}) for every type — with no runtime cost, because the casts javac inserts are the same casts you used to write by hand.</p>`, followUps: ['Are generics slower than Object-based code?', 'Why can\'t you write List&lt;int&gt;?'] });
  interview.push({ level: 'B', q: 'Explain type parameter, type argument, parameterized type, raw type and the diamond operator.', a: `<p>In ${C('class Box<T>')}, ${C('T')} is the <b>type parameter</b>. In ${C('Box<String>')}, ${C('String')} is the <b>type argument</b> and ${C('Box<String>')} the <b>parameterized type</b>. ${C('Box')} with no brackets is the <b>raw type</b>, kept only for pre-Java-5 compatibility. The <b>diamond</b> ${C('new Box<>()')} (Java 7) asks javac to infer the type arguments from the target; Java 9 allowed it with anonymous classes. With ${C('var b = new Box<>()')} there is no target, so T becomes Object — usually a mistake.</p>`, followUps: ['What naming conventions do type parameters follow?', 'Can a static method use the class type parameter?'] });
  interview.push({ level: 'I', q: 'Why is List&lt;Integer&gt; not a List&lt;Number&gt;? How do arrays differ?', a: `<p>Generics are <b>invariant</b>. If ${C('List<Integer>')} were a ${C('List<Number>')}, you could write ${C('List<Number> n = ints; n.add(2.5);')} and corrupt the integer list; erasure means there would be no runtime check to stop it. Arrays are <b>covariant</b> (${C('Object[] o = new String[1]')} compiles) but they are <b>reified</b>, so every store is checked and a wrong one throws ${C('ArrayStoreException')} at runtime. Generics chose compile-time safety; wildcards (${C('? extends')} / ${C('? super')}) give back safe, one-directional flexibility.</p>`, followUps: ['Which is better: a runtime check or a compile-time one?', 'What is List&lt;? extends Number&gt; a supertype of?'] });
  interview.push({ level: 'I', q: 'Explain PECS with a real JDK signature.', a: `<p><b>Producer Extends, Consumer Super</b> (Josh Bloch). If a parameter <b>gives</b> you Ts, declare it ${C('? extends T')}; if it <b>takes</b> Ts from you, declare it ${C('? super T')}; if both, use exact ${C('T')}. Example: ${C('Collections.copy(List<? super T> dest, List<? extends T> src)')} — you can copy a ${C('List<Integer>')} into a ${C('List<Number>')} or ${C('List<Object>')}. ${C('Stream.map(Function<? super T, ? extends R>)')}: the function consumes T (super) and produces R (extends). ${C('List.sort(Comparator<? super E>)')}: one ${C('Comparator<Number>')} sorts both Integer and Double lists.</p>`, followUps: ['Why should wildcards not appear in return types?', 'What does "capture#1 of ?" mean in an error message?'] });
  interview.push({ level: 'I', q: 'What is the difference between List, List&lt;Object&gt; and List&lt;?&gt;?', a: `<p>${C('List')} (raw) turns off generic checking: it accepts any list and lets you add anything with only an unchecked warning — the source of heap pollution. ${C('List<Object>')} is a real list of anything: you can add any object, but because of invariance you <b>cannot</b> pass a ${C('List<String>')} to it. ${C('List<?>')} means "a list of some specific but unknown type": you can pass any list, read elements as Object, call size/clear/remove, but you can add only null. Use ${C('List<?>')} for "I don't care about the type" read-only parameters, ${C('List<Object>')} for genuinely heterogeneous lists, and raw ${C('List')} never in new code.</p>`, followUps: ['Can you call list.clear() on a List&lt;?&gt;?', 'Is List&lt;?&gt; reifiable?'] });
  interview.push({ level: 'I', q: 'What is type erasure and what are its consequences?', a: `<p>javac checks generic types, then <b>erases</b> them: type variables become their first bound (or Object), casts are inserted where values are read, and bridge methods are generated to keep overriding working. One class file serves every parameterization. Consequences: no ${C('new T()')}, no ${C('new T[]')} / ${C('new List<String>[]')}, no ${C('instanceof List<String>')}, no ${C('List<String>.class')}, no overloads differing only by type arguments ("same erasure"), no static fields of type T, no generic exception classes or ${C('catch (T e)')}, no primitives as type arguments, and unchecked casts ${C('(T) x')} check nothing. Workarounds: ${C('Supplier<T>')}, ${C('Class<T>')} tokens, ${C('IntFunction<T[]>')}, super type tokens.</p>`, followUps: ['Why did Java choose erasure while C# chose reification?', 'What generic information is still available via reflection?'] });
  interview.push({ level: 'I', q: 'When do you use a bounded type parameter vs a wildcard?', a: `<p>Use a <b>type parameter</b> when the type links several places — two parameters, or a parameter and the return type: ${C('<T extends Comparable<? super T>> T max(Collection<? extends T> c)')} must return the same T it read. Use a <b>wildcard</b> when the type appears once and you only need to read or write: ${C('double sum(Collection<? extends Number> c)')}. Effective Java Item 31: "if a type parameter appears only once in a method declaration, replace it with a wildcard". Bounds unlock methods (${C('compareTo')}, ${C('doubleValue')}); wildcards add caller flexibility.</p>`, followUps: ['Can a type parameter have a lower bound (super)?', 'Why must the class come first in a multiple bound?'] });
  interview.push({ level: 'A', q: 'Why is Collections.max declared as &lt;T extends Object &amp; Comparable&lt;? super T&gt;&gt; T max(Collection&lt;? extends T&gt;)?', a: `<p>Three reasons. (1) ${C('Comparable<? super T>')}: types like ${C('LocalDate')} (which is ${C('Comparable<ChronoLocalDate>')}) or ${C('Apple extends Fruit implements Comparable<Fruit>')} are not ${C('Comparable<T>')} of themselves, yet comparing them is valid. (2) ${C('Collection<? extends T>')}: the collection only produces Ts, so a ${C('List<Apple>')} can return a Fruit-typed max if the caller wants. (3) ${C('Object &')}: erasure uses the first bound, so the erased signature is ${C('Object max(Collection)')} — exactly the pre-Java-5 binary signature. Without it, the erased return type would be Comparable, breaking every previously compiled caller.</p>`, followUps: ['Show a call that fails with T extends Comparable&lt;T&gt;.', 'What is binary compatibility and why does the JDK care so much?'] });
  interview.push({ level: 'A', q: 'What is a bridge method? When does javac create one?', a: `<p>A synthetic method javac adds so that overriding still works after erasure. If ${C('class IntNode extends Node<Integer>')} overrides ${C('setData(Integer)')}, the erased parent method is ${C('setData(Object)')} — a different JVM signature. javac generates ${C('setData(Object o) { setData((Integer) o); }')} in IntNode, flagged ACC_BRIDGE | ACC_SYNTHETIC. They appear for generic overrides, for implementing generic interfaces (${C('String.compareTo(Object)')}), and for covariant return types. Observable effects: ${C('Method.isBridge()')}, an extra frame in some stack traces, and a ClassCastException inside the bridge when a raw caller passes the wrong type.</p>`, followUps: ['How would you see bridge methods with javap?', 'Do bridge methods affect performance?'] });
  interview.push({ level: 'A', q: 'What is heap pollution? How do you prevent and debug it?', a: `<p>Heap pollution is when a variable of a parameterized type points to an object that is not of that type — e.g. an Integer inside a ${C('List<String>')}, smuggled in via a raw alias, an unchecked cast, or generic varargs. It surfaces later as a ClassCastException on a line with no visible cast (a hidden checkcast). Prevention: no raw types, compile with ${C('-Xlint:unchecked -Werror')}, keep every ${C('@SuppressWarnings("unchecked")')} on the smallest scope with a written proof, use ${C('@SafeVarargs')} only when the array is neither written nor leaked. Debugging: wrap the collection with ${C('Collections.checkedList(list, String.class)')} so the bad insertion fails at its source.</p>`, followUps: ['Why is (T[]) new Object[n] safe inside ArrayList but not when returned?', 'What does the JLS guarantee if there are no unchecked warnings?'] });
  interview.push({ level: 'A', q: 'How can you create an instance or an array of a type parameter T?', a: `<p>Not directly — T is erased. Options: (1) take a ${C('Supplier<T>')} and call ${C('get()')} (cleanest, works with constructors via ${C('Foo::new')}); (2) take a ${C('Class<T>')} and call ${C('type.getDeclaredConstructor().newInstance()')} (reflection, checked exceptions, needs a no-arg constructor); (3) for arrays, take an ${C('IntFunction<T[]>')} (${C('String[]::new')}, as ${C('Collection.toArray')} does since Java 11) or use ${C('(T[]) Array.newInstance(type, n)')}; (4) inside a container, store ${C('Object[]')} and cast elements on read, like ArrayList. Never return an ${C('(T[]) new Object[n]')} to callers — it causes "[Ljava.lang.Object; cannot be cast to [Ljava.lang.String;".</p>`, followUps: ['How does Arrays.copyOf create a correctly typed array?', 'What is a super type token and when do you need one?'] });
  interview.push({ level: 'A', q: 'How do JSON libraries deserialize List&lt;User&gt; if generics are erased?', a: `<p>Erasure removes type arguments from <b>objects</b>, but the class file keeps them for <b>declarations</b> in Signature attributes. Jackson's ${C('new TypeReference<List<User>>() {}')} creates an anonymous subclass whose generic superclass is ${C('TypeReference<List<User>>')}; ${C('getClass().getGenericSuperclass()')} returns a ${C('ParameterizedType')} with ${C('List<User>')} as its argument (Gson's TypeToken and Spring's ParameterizedTypeReference do the same). Passing ${C('List.class')} instead loses the element type, and Jackson silently produces a list of LinkedHashMap — a common production bug.</p>`, followUps: ['Why are the braces {} essential?', 'Where else does reflection read generic signatures? (DI frameworks, field.getGenericType)'] });
  interview.push({ level: 'E', q: 'Design a type-safe heterogeneous container. What are its limits?', a: `<p>Parameterize the <b>key</b> instead of the container: ${C('<T> void put(Class<T> type, T value)')}, ${C('<T> T get(Class<T> type)')}, backed by ${C('Map<Class<?>, Object>')}. ${C('type.cast(...)')} gives a real runtime check (unlike an unchecked ${C('(T)')} cast), and casting in ${C('put')} stops raw-type abuse at the source. Limits: ${C('Class')} objects are reifiable, so you cannot have separate keys for ${C('List<String>')} and ${C('List<Integer>')} (both are ${C('List.class')}); solve that with TypeRef/TypeToken keys. Real uses: Spring's ApplicationContext ${C('getBean(Class<T>)')}, annotation lookup ${C('getAnnotation(Class<A>)')}, typed attribute maps in Netty (${C('AttributeKey<T>')}).</p>`, followUps: ['Restrict keys to a family with a bounded token Class&lt;? extends Annotation&gt;.', 'Make it thread-safe and discuss memory leaks with class loaders.'] });
  interview.push({ level: 'E', q: 'Compare Java generics with C#, Kotlin and C++ templates. What might Project Valhalla change?', a: `<p><b>Java</b>: erased, use-site variance (wildcards), one shared class, no primitives. <b>C#</b>: reified — ${C('List<int>')} is specialized, ${C('typeof(T)')} and ${C('new T()')} work, declaration-site variance (${C('in')}/${C('out')}) on interfaces. <b>Kotlin</b>: runs on the JVM so still erased, but adds declaration-site variance (${C('out T')}) and ${C('reified')} type parameters for inline functions. <b>C++ templates</b>: compile-time code generation per instantiation — zero-cost and very powerful (concepts in C++20), but code bloat and error messages are the price. <b>Valhalla</b> brings value classes (identity-free, flattenable objects) and aims later at generics over primitives/values so a list of ints could be stored flat; it is being delivered in stages, so in standard Java 21/25 you still box.</p>`, followUps: ['What would reified generics have broken in 2004?', 'How do Kotlin reified type parameters work despite erasure? (inlining)'] });

  registerModule({
    id: 'java08',
    title: 'Generics',
    lang: 'java',
    intro: `<p>Generics are the reason ${C('List<String>')} refuses an Integer, ${C('Map.get')} needs no cast, and ${C('Collections.sort')} works for every type. This module takes you from writing your first ${C('class Box<T>')} to reading JDK signatures like ${C('<T extends Object & Comparable<? super T>> T max(Collection<? extends T> coll)')} without fear.</p>
<p>You will learn <b>generic classes, interfaces and records</b>, <b>generic methods and type inference</b>, <b>bounded types</b> (including multiple and recursive bounds), <b>wildcards and PECS</b>, <b>type erasure</b> and every restriction it causes, and the dark corners: <b>generic arrays, varargs heap pollution and raw types</b>. Each topic starts with an everyday analogy, then interactive visualizers — a PECS playground, a javac inference walk-through, a source-vs-erased bytecode view, bridge-method dispatch, a "is this type reifiable?" checker — followed by "does this compile?" and "predict the output" examples, an expert deep dive and an AI-era section. Generics questions are a staple of intermediate and senior Java interviews precisely because they test whether you understand <i>compile time vs runtime</i>.</p>`,
    goals: [
      'Write generic classes, interfaces, records and methods, and explain type parameter vs type argument vs raw type',
      'Predict what javac infers for a generic call (including intersection types and target typing) and fix inference failures with method refs, typed lambdas or type witnesses',
      'Choose bounds correctly — <code>T extends Number</code>, multiple bounds, and <code>T extends Comparable&lt;? super T&gt;</code> — and explain why the JDK uses them',
      'Apply PECS to design flexible APIs, use wildcard capture helpers, and explain List vs List&lt;Object&gt; vs List&lt;?&gt;',
      'Explain type erasure, bridge methods, reifiable types and every "you cannot" rule, with the standard workaround for each',
      'Store generic data in arrays safely, use @SafeVarargs correctly, and detect and prevent heap pollution from raw types'
    ],
    prereqs: `Java 5 (Strings, Wrapper Classes, equals &amp; hashCode — autoboxing and Comparable/Comparator) and Java 7 (Collections Framework in Practice — List, Set, Map, Queue). Java 4 (OOP Pillars) for inheritance and interfaces.`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
