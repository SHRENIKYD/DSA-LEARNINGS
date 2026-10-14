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

  registerModule({ id: 'java08', title: 'Generics', lang: 'java', intro: `<p>stub</p>`, goals: [], prereqs: `x`, hours: 12, topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
