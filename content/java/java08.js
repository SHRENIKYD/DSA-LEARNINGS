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
        return frames.concat(codeFrames(genCode, g, 'Generic code (List<String>)'));
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
      title: 'Build a Type-Safe Generic Stack<E>',
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

  registerModule({ id: 'java08', title: 'Generics', lang: 'java', intro: `<p>stub</p>`, goals: [], prereqs: `x`, hours: 12, topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
