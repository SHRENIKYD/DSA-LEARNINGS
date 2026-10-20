(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ----------------------------------------------------------------------
     Shared visualizer helpers for this module.
     A "step" describes one moment of a running Java program:
       l  : line number(s) to highlight in the code panel (1-based)
       c  : highlight class for those lines (default 'cur')
       n  : narration (HTML)
       cs : call stack (bottom -> top) as strings
       v  : STACK local variables {name: value}, vh: highlight map
       fr : name of the stack frame shown in the vars label
       h  : HEAP objects [[address, contents]], hh: highlight map
       st : static area (class-level fields) {name: value}, sh: highlight map
       o  : console output so far (plain text)
       t  : extra free HTML note
     ---------------------------------------------------------------------- */
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function steps(code, list, opt) {
    opt = opt || {};
    return list.map(function (s) {
      var parts = [], hl = {};
      if (s.l) (Array.isArray(s.l) ? s.l : [s.l]).forEach(function (x) { hl[x] = s.c || 'cur'; });
      parts.push({ type: 'code', label: opt.codeLabel || 'Program (highlighted = running now)', lang: 'java', code: code, hl: hl });
      if (s.cs) {
        var chl = {}; chl[s.cs.length - 1] = 'cur';
        parts.push({ type: 'stack', label: 'Call stack (top = method running now)', items: s.cs.slice(), hl: chl });
      }
      if (s.v) parts.push({ type: 'vars', label: 'STACK: local variables of ' + (s.fr || 'main()'), vals: s.v, hl: s.vh || {} });
      if (s.st) parts.push({ type: 'vars', label: 'STATIC area: one copy per class', vals: s.st, hl: s.sh || {} });
      if (s.h) parts.push({ type: 'map', label: 'HEAP: objects (address &rarr; fields)', entries: s.h.map(function (e) { return [e[0], e[1]]; }), hl: s.hh || {} });
      if (s.o !== undefined) parts.push({ type: 'text', label: 'Console output so far', html: '<pre>' + (s.o === '' ? '(nothing printed yet)' : esc(s.o)) + '</pre>' });
      if (s.t) parts.push({ type: 'text', html: s.t });
      return { narr: s.n, parts: parts };
    });
  }
  function clampInt(input, def, lo, hi, hint) {
    var raw = String(input === undefined || input === null ? def : input).trim();
    if (raw === '') raw = String(def);
    if (!/^-?\d+$/.test(raw)) throw new Error(hint);
    var n = parseInt(raw, 10);
    if (n < lo || n > hi) throw new Error(hint);
    return n;
  }

  /* ======================================================================
     TOPIC 1: Defining classes and creating objects
     ====================================================================== */
  var T1_CODE = [
    'class Dog {',
    '    String name;          // field: every Dog has its own name',
    '    int age;              // field: every Dog has its own age',
    '    void bark() {         // method: something a Dog can do',
    '        System.out.println(name + " says Woof");',
    '    }',
    '}',
    'public class Main {',
    '    public static void main(String[] args) {',
    '        Dog d = new Dog();',
    '        d.name = "Rex";',
    '        d.age = 3;',
    '        d.bark();',
    '    }',
    '}'
  ].join('\n');

  topics.push({
    title: 'Defining Classes & Creating Objects',
    analogy: `<p>A <b>class</b> is a <b>cookie cutter</b>; an <b>object</b> is a <b>cookie</b>. The cutter decides the shape (every cookie has chocolate chips and a size), but each cookie is a real, separate thing you can eat. You can stamp out 100 cookies with one cutter, and biting one cookie does not change the others. In Java, the class says <i>"every Dog has a name and an age and can bark"</i>; each <code>new Dog()</code> stamps out one real dog in memory with its <b>own</b> name and age.</p>`,
    explain: `<p>Until now you probably wrote everything inside <code>main</code>. That works for 20 lines, but real programs model <b>things</b>: users, orders, bank accounts, game characters. A <b>class</b> lets you bundle the <b>data</b> about a thing together with the <b>actions</b> it can do.</p>
<h4>1. The three parts of a class</h4>
${H.table(['Part', 'Plain meaning', 'Example in a Dog class'], [
  ['<b>Fields</b> (instance variables)', 'what each object <i>knows</i> (its data)', '<code>String name; int age;</code>'],
  ['<b>Methods</b>', 'what each object can <i>do</i>', '<code>void bark() { ... }</code>'],
  ['<b>Constructors</b>', 'the setup code that runs when an object is born (next topic)', '<code>Dog(String name) { ... }</code>']
])}
<h4>2. Creating an object with <code>new</code></h4>
<p><code>Dog d = new Dog();</code> does three jobs, read right-to-left:</p>
<ol>
<li><code>new Dog()</code>: Java grabs a fresh chunk of memory on the <b>heap</b> big enough for one Dog and sets every field to a default value.</li>
<li>The constructor runs (even if you did not write one, Java gives you an empty one).</li>
<li>The <b>address</b> of that new object (a <b>reference</b>) is stored in the variable <code>d</code>.</li>
</ol>
<p>Then you use the <b>dot operator</b> to reach inside: <code>d.name = "Rex"</code> writes a field, <code>d.bark()</code> calls a method on that specific dog.</p>
<h4>3. Default values: fields vs local variables</h4>
<p>Fields are <b>always</b> given a starting value automatically. Local variables (inside a method) are <b>not</b>: reading one before you assign it is a compile error.</p>
${H.table(['Field type', 'Default value'], [
  ['<code>byte, short, int, long</code>', '<code>0</code>'], ['<code>float, double</code>', '<code>0.0</code>'],
  ['<code>boolean</code>', '<code>false</code>'], ['<code>char</code>', "<code>'\\u0000'</code> (the invisible NUL character)"],
  ['any object type (<code>String</code>, <code>Dog</code>, arrays...)', '<code>null</code> (points to nothing)']
])}
<h4>4. One class, many objects</h4>
<p>Each object has its <b>own copy</b> of every (non-static) field. Changing <code>rex.age</code> does not touch <code>bella.age</code>. The <b>methods</b>, however, are stored only once per class: every Dog shares the same <code>bark()</code> code, and the method knows which dog called it through a hidden reference called <code>this</code> (topic 4).</p>
${H.kv([['rex (#101)', 'name="Rex", age=3'], ['bella (#102)', 'name="Bella", age=5']], { label: 'Heap after two new Dog()', hl: { 'rex (#101)': 'g', 'bella (#102)': 'b' } })}
<h4>5. File rules you must know</h4>
<ul>
<li>A <code>.java</code> file may hold many classes, but at most <b>one</b> <code>public</code> top-level class, and the file must be named after it (<code>Main.java</code> for <code>public class Main</code>).</li>
<li><code>javac Main.java</code> produces one <code>.class</code> file <b>per class</b> (<code>Dog.class</code>, <code>Main.class</code>).</li>
<li>Naming convention: classes in <code>PascalCase</code> (nouns: <code>BankAccount</code>), fields and methods in <code>camelCase</code> (<code>balance</code>, <code>deposit()</code>).</li>
</ul>`,
    clues: [
      '"Model a real-world entity" / "design a class for a Book, Car, Account" → fields for state, methods for behaviour',
      '"What is the default value of an uninitialized field?" → 0 / false / null, but locals have none',
      '"Difference between a class and an object" → blueprint vs instance; one class, many objects',
      '"How many objects are created?" → count the <code>new</code> keywords (plus string literals/boxing in trickier questions)',
      '"Why does this print null?" → a reference field was never assigned, so it kept its default null',
      '"Variable might not have been initialized" compile error → you read a LOCAL variable before assigning it'
    ],
    code: [`
      // Dog.java + Main.java shown in one file for clarity
      class Dog {
          String name;     // instance field, default null
          int age;         // instance field, default 0

          void bark() {
              // 'name' here means "the name of the dog this method was called on"
              System.out.println(name + " (age " + age + ") says Woof");
          }

          void haveBirthday() {
              age++;       // changes only THIS dog's age
          }
      }

      public class Main {
          public static void main(String[] args) {
              Dog rex = new Dog();      // object #1 on the heap
              rex.name = "Rex";
              rex.age = 3;

              Dog bella = new Dog();    // object #2, completely separate
              bella.name = "Bella";
              bella.age = 5;

              rex.haveBirthday();       // only Rex gets older
              rex.bark();               // Rex (age 4) says Woof
              bella.bark();             // Bella (age 5) says Woof

              Dog blank = new Dog();    // nobody set its fields
              blank.bark();             // null (age 0) says Woof
          }
      }`],
    codeTitle: ['Two dogs, one class: each object owns its own fields'],
    viz: [
      {
        title: 'What happens in memory when you write new Dog()',
        gen: function () {
          return steps(T1_CODE, [
            { l: [1, 7], n: 'The class <b>Dog</b> is only a <b>blueprint</b>. Nothing exists in memory for dogs yet: no name, no age. Defining a class creates zero objects.', cs: [], v: {}, h: [], o: '' },
            { l: 9, n: 'The JVM calls <code>main</code>. A <b>stack frame</b> is pushed: a small private notepad for main\'s local variables (only <code>args</code> so far).', cs: ['main(args)'], v: { args: 'ref to String[0]' }, h: [], o: '' },
            { l: 10, n: '<code>new Dog()</code> allocates a Dog object on the <b>heap</b> (say at address #101). Every field gets its <b>default value</b>: name = null, age = 0.', cs: ['main(args)'], v: { args: 'ref to String[0]' }, h: [['#101 Dog', 'name=null, age=0']], hh: { '#101 Dog': 'ok' }, o: '' },
            { l: 10, n: 'The <b>address</b> #101 is stored in the local variable <code>d</code>. The variable lives on the stack; the object lives on the heap. <code>d</code> is a <b>remote control</b> pointing at the dog.', cs: ['main(args)'], v: { args: 'ref to String[0]', d: '→ #101' }, vh: { d: 'ok' }, h: [['#101 Dog', 'name=null, age=0']], o: '' },
            { l: 11, n: '<code>d.name = "Rex"</code>: follow the arrow in <code>d</code> to #101, then write its <code>name</code> field.', cs: ['main(args)'], v: { args: 'ref to String[0]', d: '→ #101' }, h: [['#101 Dog', 'name="Rex", age=0']], hh: { '#101 Dog': 'cur' }, o: '' },
            { l: 12, n: '<code>d.age = 3</code>: same idea, write the <code>age</code> field of the object at #101.', cs: ['main(args)'], v: { args: 'ref to String[0]', d: '→ #101' }, h: [['#101 Dog', 'name="Rex", age=3']], hh: { '#101 Dog': 'cur' }, o: '' },
            { l: 13, n: '<code>d.bark()</code> pushes a new frame for <code>bark</code>. Java secretly passes the reference #101 as <code>this</code>, so the method knows <i>which</i> dog is barking.', cs: ['main(args)', 'Dog.bark() this=#101'], v: { 'this': '→ #101' }, vh: { 'this': 'sel' }, fr: 'bark()', h: [['#101 Dog', 'name="Rex", age=3']], o: '' },
            { l: 5, n: 'Inside <code>bark</code>, <code>name</code> means <code>this.name</code>, which is "Rex". The line prints.', cs: ['main(args)', 'Dog.bark() this=#101'], v: { 'this': '→ #101' }, fr: 'bark()', h: [['#101 Dog', 'name="Rex", age=3']], hh: { '#101 Dog': 'sel' }, o: 'Rex says Woof' },
            { l: 14, n: '<code>bark</code> returns, its frame is popped. When <code>main</code> ends, <code>d</code> disappears too. The Dog at #101 is now <b>unreachable</b>, so the garbage collector may reclaim it later.', cs: [], v: {}, h: [['#101 Dog', 'name="Rex", age=3 (unreachable)']], hh: { '#101 Dog': 'done' }, o: 'Rex says Woof' }
          ]);
        }
      },
      {
        title: 'Stamp out many objects from one class',
        input: 'Rex, Bella, Max',
        inputLabel: 'Dog names (comma separated, 1 to 6)',
        gen: function (input) {
          var names = String(input === undefined ? 'Rex, Bella, Max' : input).split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
          if (!names.length || names.length > 6) throw new Error('Enter 1 to 6 names separated by commas, e.g. Rex, Bella');
          if (names.some(function (s) { return !/^[A-Za-z][A-Za-z0-9]{0,11}$/.test(s); })) throw new Error('Names must be letters/digits, starting with a letter, max 12 chars');
          var lines = ['class Dog { String name; int age; }', 'public class Main {', '    public static void main(String[] args) {'];
          names.forEach(function (nm, i) {
            lines.push('        Dog d' + i + ' = new Dog();');
            lines.push('        d' + i + '.name = "' + nm + '"; d' + i + '.age = ' + (i + 1) + ';');
          });
          lines.push('        System.out.println("Dogs created: ' + names.length + '");');
          lines.push('    }', '}');
          var code = lines.join('\n'), list = [], vars = {}, heap = [];
          list.push({ l: 1, n: 'One class definition. It is the cookie cutter: it describes the fields but creates <b>no objects</b>.', v: {}, h: [], o: '' });
          names.forEach(function (nm, i) {
            var addr = '#' + (101 + i) + ' Dog';
            heap.push([addr, 'name=null, age=0']);
            vars['d' + i] = '→ #' + (101 + i);
            var hh = {}; hh[addr] = 'ok'; var vh = {}; vh['d' + i] = 'ok';
            list.push({ l: 4 + i * 2, n: '<code>new Dog()</code> number ' + (i + 1) + ': a brand-new object at #' + (101 + i) + ' with default fields. Its address goes into <code>d' + i + '</code>.', v: JSON.parse(JSON.stringify(vars)), vh: vh, h: heap.map(function (e) { return e.slice(); }), hh: hh, o: '' });
            heap[i] = [addr, 'name="' + nm + '", age=' + (i + 1)];
            var hh2 = {}; hh2[addr] = 'cur';
            list.push({ l: 5 + i * 2, n: 'Set the fields of <b>this</b> object only. The other ' + (names.length - 1) + ' dog(s) are untouched: each object has its own copy of <code>name</code> and <code>age</code>.', v: JSON.parse(JSON.stringify(vars)), h: heap.map(function (e) { return e.slice(); }), hh: hh2, o: '' });
          });
          list.push({ l: 4 + names.length * 2, n: 'Count the <code>new</code> keywords: <b>' + names.length + '</b> objects exist, one class. (String literals like "' + names[0] + '" are separate String objects in the string pool, a detail for java05.)', v: JSON.parse(JSON.stringify(vars)), h: heap.map(function (e) { return e.slice(); }), o: 'Dogs created: ' + names.length });
          return steps(code, list);
        }
      }
    ],
    examples: [
      { title: 'Default values in action', html: `<p>Fields that you never assign still have a value. A fresh <code>Student</code> prints <code>null 0 false 0.0</code>. This is why forgetting to set a field gives you <code>null</code> (or a <code>NullPointerException</code> later) instead of a compile error.</p>`, code: `
        class Student {
            String name; int marks; boolean passed; double gpa;
        }
        class Demo {
            public static void main(String[] args) {
                Student s = new Student();
                System.out.println(s.name + " " + s.marks + " " + s.passed + " " + s.gpa); // null 0 false 0.0
            }
        }` },
      { title: 'Locals get NO default (compile error)', html: `<p>Fields get defaults; <b>local variables do not</b>. Java refuses to compile code that might read a local before it is assigned. This is a deliberate safety feature: a local's value is always something you chose.</p>`, code: `
        class LocalDemo {
            int field;                 // OK: defaults to 0
            void show() {
                int local;             // declared, not assigned
                // System.out.println(local);   // ERROR: variable local might not have been initialized
                local = 10;            // assign first...
                System.out.println(local + field);  // ...then read: prints 10
            }
        }` },
      { title: 'Methods operate on the object you call them on', html: `<p>Two counters share the same <code>increment()</code> code but each keeps its own <code>count</code>. Calling <code>a.increment()</code> three times and <code>b.increment()</code> once gives <b>a=3, b=1</b>.</p>
${H.table(['call', 'a.count', 'b.count'], [['start', '0', '0'], ['a.increment() ×3', '3', '0'], ['b.increment()', '3', '1']])}`, code: `
        class Counter {
            int count;
            void increment() { count++; }
        }
        class CounterDemo {
            public static void main(String[] args) {
                Counter a = new Counter(), b = new Counter();
                a.increment(); a.increment(); a.increment();
                b.increment();
                System.out.println("a=" + a.count + " b=" + b.count); // a=3 b=1
            }
        }` },
      { title: 'Calling a method on null', html: `<p><code>Dog d = null; d.bark();</code> compiles fine (the type is Dog) but crashes at runtime with <code>NullPointerException</code>, because there is no object at the end of the arrow. Since Java 14, <b>helpful NPE messages</b> tell you exactly which reference was null: <i>Cannot invoke "Dog.bark()" because "d" is null</i>.</p>` }
    ],
    deepDive: `<p><b>What an object really looks like in HotSpot (64-bit JVM).</b> Every object starts with a <b>header</b>: a <i>mark word</i> (8 bytes: identity hash code, lock state, GC age bits) plus a <i>class pointer</i> (4 bytes with compressed class pointers, the default). Then come the fields, and the whole thing is padded to a multiple of 8 bytes. So <code>new Object()</code> costs 16 bytes, and a Dog with a reference and an int is 12 + 4 + 4 = 20, padded to <b>24 bytes</b>. JDK 25 made <b>compact object headers</b> (JEP 519) a product feature (<code>-XX:+UseCompactObjectHeaders</code>), shrinking headers to 8 bytes, which saves real memory in services holding millions of small objects.</p>
<p><b>Field layout is not source order.</b> The JVM may reorder fields (longs/doubles first, then ints, then shorts/chars, bytes/booleans, then references) to reduce padding. Never rely on declaration order for memory layout; use the JOL tool (<code>org.openjdk.jol</code>) to inspect it.</p>
<p><b>Allocation is cheap.</b> Each thread has a <b>TLAB</b> (thread-local allocation buffer), so <code>new</code> is usually just a pointer bump of a few nanoseconds. And with <b>escape analysis</b>, the JIT can remove an allocation entirely if the object never leaves the method (scalar replacement: fields become plain local variables). "Objects are slow, avoid new" is mostly a myth today; <i>retaining</i> too many objects is what hurts (GC pressure, cache misses).</p>
<p><b>Edge cases:</b> methods are not copied per object (they live once in class metadata, in Metaspace); a class with no fields still produces objects with a 12 to 16 byte header; and <code>new</code> on an abstract class or interface is a compile error (except via an anonymous class, which actually creates a subclass).</p>`,
    aiEra: `<p><b>What AI changes:</b> any assistant will happily generate a 40-line POJO with fields, getters, setters, <code>equals</code>, <code>hashCode</code> and <code>toString</code> in a second. Typing classes is no longer the skill; <b>deciding what a class should be</b> is. Which data belongs together? Which methods belong to the object versus a service? Is this a <code>record</code> (pure data) or a class with behaviour?</p>
<p><b>Use AI as a partner:</b> ask <code>"Here is my domain: a library lends books to members. Propose classes with fields and 2 behaviours each; explain why each field lives where it does."</code> Then critique its answer. Ask it to <i>draw the heap</i> after a snippet: <code>"Show stack and heap after line 3 as a table"</code>, and check it against your own trace.</p>
<p><b>Where AI goes wrong:</b> generating setters for every field by reflex (breaking encapsulation), making everything <code>public</code>, confusing fields with locals when explaining defaults, and claiming wrong object sizes. <b>What you must still own:</b> explaining what <code>new</code> does step by step, predicting defaults, counting objects, and spotting a missing initialisation in a code review in seconds.</p>`,
    problems: [{
      title: 'Build a Rectangle Class',
      level: 'Easy', tags: ['class design', 'fields', 'methods'], companies: ['TCS', 'Infosys', 'Accenture'],
      statement: `<p>Create a class <code>Rectangle</code> with fields <code>width</code> and <code>height</code> (both <code>double</code>) and these methods:</p>
<ul><li><code>area()</code> returns width × height</li><li><code>perimeter()</code> returns 2 × (width + height)</li><li><code>isSquare()</code> returns true when width equals height</li><li><code>scale(double f)</code> multiplies both sides by <code>f</code> (changes this rectangle)</li></ul>
<p>In <code>main</code>, create a 3 × 4 rectangle, print its area and perimeter, scale it by 2 and print the new area.</p>`,
      constraints: `0 &lt; width, height ≤ 10<sup>6</sup>; scale factor &gt; 0`,
      example: `<p>Input: width = ${H.c('b', '3')}, height = ${H.c('b', '4')}</p><p>Output: <code>area=12.0 perimeter=14.0 square=false</code> then <code>after scale(2): area=48.0</code>. Why? 3×4 = 12, 2×(3+4) = 14, after scaling sides are 6 and 8 so the area becomes ${H.c('g', '48 (= 4 × the old area)')}.</p>`,
      brute: {
        why: `<p>The "no classes" way stores widths and heights in two separate variables or parallel arrays and passes them to static helper functions. It works, but nothing ties a width to its height: one wrong index and you compute the area of half of one rectangle and half of another. Every new shape operation needs both numbers passed around by hand.</p>`,
        code: `
        class RectNoClass {
            static double area(double w, double h) { return w * h; }
            static double perimeter(double w, double h) { return 2 * (w + h); }
            public static void main(String[] args) {
                double[] widths = {3, 5};
                double[] heights = {4, 5};
                // easy to mix up: area(widths[0], heights[1]) compiles but is wrong
                System.out.println(area(widths[0], heights[0]) + " " + perimeter(widths[0], heights[0]));
            }
        }`
      },
      mcq: { q: 'Where should the <code>area()</code> logic live?', options: ['Inside Rectangle, because it only needs the rectangle\'s own fields', 'In main, because main runs first', 'In a separate static utility class always', 'It does not matter at all'], answer: 0, explain: 'Behaviour that uses only an object\'s own data belongs on that object. This is the heart of object-oriented design: data and the code that works on it travel together.' },
      hints: [
        `<p>Hint 1: Two fields describe a rectangle completely. Every method only needs <code>width</code> and <code>height</code>, which the object already owns, so none of them needs parameters except <code>scale</code>.</p>`,
        `<p>Hint 2: <code>scale</code> returns <code>void</code> because it <b>changes</b> the object in place; the others return a computed value and change nothing.</p>`,
        `<p>Hint 3: Comparing doubles with <code>==</code> is fine here because we compare exact stored values, but for computed values you would use a tolerance like <code>Math.abs(a - b) &lt; 1e-9</code>. Recipe: declare fields → write 4 methods → in main create, set, print, scale, print.</p>`
      ],
      tests: { sig: 'double double double -> double[]', fn: 'rectCheck', cmp: 'float',
        harness: { java: `class Check { static double[] rectCheck(double w, double h, double f) { Rectangle r = new Rectangle(); r.width = w; r.height = h; double a = r.area(), p = r.perimeter(); double sq = r.isSquare() ? 1 : 0; r.scale(f); return new double[]{a, p, sq, r.area(), r.perimeter(), r.width, r.height}; } }`, python: `def rect_check(w, h, f):
    r = Rectangle(w, h)
    a, p = r.area(), r.perimeter()
    sq = 1 if r.is_square() else 0
    r.scale(f)
    return [a, p, sq, r.area(), r.perimeter(), r.width, r.height]
` }, cases: [
        [[3,4,2],[12,14,0,48,28,6,8]],
        [[5,5,1],[25,20,1,25,20,5,5]],
        [[1000000,1000000,2],[1000000000000,4000000,1,4000000000000,8000000,2000000,2000000]],
        [[0.5,0.25,0.1],[0.125,1.5,0,0.0012500000000000002,0.15000000000000002,0.05,0.025]],
        [[2.5,2.5,3],[6.25,10,1,56.25,30,7.5,7.5]],
        [[10,20,1.5],[200,60,0,450,90,15,30]],
        [[1,1000000,0.001],[1000000,2000002,0,1,2000.002,0.001,1000]],
        [[0.001,0.001,1000],[0.000001,0.004,1,1,4,1,1]],
        [[7,3,1],[21,20,0,21,20,7,3]],
        [[1000000,1,1000000],[1000000,2000002,0,1000000000000000000,2000002000000,1000000000000,1000000]],
        [[1.5,1.5,0.5],[2.25,6,1,0.5625,3,0.75,0.75]],
        [[4,9,0.25],[36,26,0,2.25,6.5,1,2.25]]
      ] },
      solution: {
        approach: `<p>Put the two numbers into one object so they can never get separated, then add methods that read those fields. <code>scale</code> mutates the object; the rest are pure queries. In the next topic you will replace the manual field setting with a constructor.</p>`,
        code: `
        class Rectangle {
            double width;
            double height;

            double area() { return width * height; }

            double perimeter() { return 2 * (width + height); }

            boolean isSquare() { return width == height; }

            void scale(double f) {
                width *= f;      // changes THIS rectangle's width
                height *= f;
            }
        }

        public class Main {
            public static void main(String[] args) {
                Rectangle r = new Rectangle();
                r.width = 3;
                r.height = 4;
                System.out.println("area=" + r.area() + " perimeter=" + r.perimeter() + " square=" + r.isSquare());
                r.scale(2);
                System.out.println("after scale(2): area=" + r.area());
            }
        }`,
        alt: [{ lang: 'python', code: `class Rectangle:\n    def __init__(self, w, h):\n        self.width, self.height = w, h\n    def area(self):\n        return self.width * self.height\n    def perimeter(self):\n        return 2 * (self.width + self.height)\n    def is_square(self):\n        return self.width == self.height\n    def scale(self, f):\n        self.width *= f\n        self.height *= f\n\nr = Rectangle(3, 4)\nprint(r.area(), r.perimeter(), r.is_square())\nr.scale(2)\nprint(r.area())`, run: true }],
        dry: { head: ['step', 'width', 'height', 'printed'], rows: [
          ['new Rectangle()', '0.0', '0.0', '-'],
          ['set fields', '3.0', '4.0', '-'],
          ['area(), perimeter(), isSquare()', '3.0', '4.0', 'area=12.0 perimeter=14.0 square=false'],
          ['scale(2)', '6.0', '8.0', '-'],
          ['area()', '6.0', '8.0', '<span class="c-g">after scale(2): area=48.0</span>']
        ] },
        complexity: `<p>Every method is O(1) time and O(1) extra space. Each Rectangle object uses about 32 bytes on a typical 64-bit JVM (12-byte header + two 8-byte doubles = 28, padded to a multiple of 8).</p>`,
        followUps: ['Add a constructor so a Rectangle can never exist with width 0', 'Should scale() return a NEW rectangle instead (immutability)? What are the trade-offs?', 'Add a static method that compares two rectangles by area']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2: References, stack vs heap, aliasing, null, pass-by-value
     ====================================================================== */
  var T2_CODE = [
    'class Box { int v; Box(int v) { this.v = v; } }',
    'public class Main {',
    '    static void reassign(Box b) { b = new Box(99); }',
    '    static void mutate(Box b)   { b.v = 42; }',
    '    public static void main(String[] args) {',
    '        Box x = new Box(1);',
    '        Box y = x;',
    '        y.v = 5;',
    '        System.out.println(x.v + " " + (x == y));',
    '        reassign(x);',
    '        System.out.println(x.v);',
    '        mutate(x);',
    '        System.out.println(x.v);',
    '        y = null;',
    '        x = null;',
    '    }',
    '}'
  ].join('\n');

  topics.push({
    title: 'References: Stack vs Heap, Aliasing, null & Pass-by-Value',
    analogy: `<p>An object is a <b>TV</b>; a reference variable is a <b>remote control</b> for it. <code>Box y = x;</code> does not buy a second TV. It buys a <b>second remote</b> tuned to the same TV, so pressing "volume up" on either remote changes the one TV. Setting a remote to <code>null</code> is holding a remote that is paired to nothing: press a button and you get a <code>NullPointerException</code>. When every remote for a TV is thrown away, nobody can ever watch it again, and the garbage collector quietly carries it to the dump.</p>`,
    explain: `<p>This is the single most important mental model in Java, and the source of most "predict the output" questions. Learn it once, carefully.</p>
<h4>1. Two kinds of variables</h4>
${H.table(['Kind', 'Examples', 'The variable holds...'], [
  ['<b>Primitive</b>', '<code>int, long, double, boolean, char, byte, short, float</code>', 'the <b>value itself</b> (the number 5)'],
  ['<b>Reference</b>', '<code>String, Dog, int[], List&lt;Integer&gt;</code>, anything made by a class', 'an <b>address</b> (an arrow) pointing at an object on the heap, or <code>null</code>']
])}
<h4>2. Stack vs heap, in plain words</h4>
<ul>
<li>The <b>stack</b> is each thread's notepad of <b>method calls</b>. Every call pushes a <b>frame</b> holding its parameters and local variables. When the method returns, the frame is thrown away instantly. Fast, small, automatic.</li>
<li>The <b>heap</b> is the big shared warehouse where <b>every object</b> lives (anything made with <code>new</code>, including arrays). Objects stay there as long as something can still reach them; the <b>garbage collector</b> (GC) cleans up the rest.</li>
</ul>
<p>So in <code>Dog d = new Dog();</code> the variable <code>d</code> (8 bytes or less, an address) is on the stack, and the Dog object is on the heap. Fields of an object live <b>inside the object</b>, on the heap, even when they are primitives.</p>
<h4>3. Assignment copies the arrow, not the object (aliasing)</h4>
${H.kv([['x', '→ #101'], ['y', '→ #101'], ['#101 Box', 'v = 5']], { label: 'after Box y = x; y.v = 5;', hl: { x: 'b', y: 'b', '#101 Box': 'g' } })}
<p>Two variables, one object. They are <b>aliases</b>. A change through <code>y</code> is visible through <code>x</code>. To get a real second object you must call <code>new</code> again (or a copy constructor / copy method).</p>
<h4>4. <code>==</code> on references compares addresses</h4>
<p><code>x == y</code> asks "do these two remotes point at the <b>same TV</b>?", not "do the TVs look alike?". Two separate boxes both holding 5 are <code>!=</code>. Content comparison is the job of <code>equals()</code> (covered deeply in java05).</p>
<h4>5. Java is ALWAYS pass-by-value</h4>
<p>When you call a method, Java <b>copies</b> each argument into the parameter. For a primitive, it copies the number. For a reference, it copies the <b>arrow</b>. Consequences you must be able to explain:</p>
${H.table(['Inside the method you...', 'Does the caller see it?', 'Why'], [
  ['change a field: <code>b.v = 42</code>', '<span class="c-g">YES</span>', 'both arrows point at the same object'],
  ['reassign the parameter: <code>b = new Box(99)</code>', '<span class="c-r">NO</span>', 'you only moved the method\'s private copy of the arrow'],
  ['change a primitive parameter: <code>n++</code>', '<span class="c-r">NO</span>', 'you changed a copy of the number']
])}
<p>That is why a classic <code>swap(Box a, Box b)</code> that reassigns the parameters does nothing for the caller. Java has no pass-by-reference (no C++ <code>&amp;</code> parameters).</p>
<h4>6. <code>null</code> and garbage</h4>
<p><code>null</code> means "this reference points at nothing". Using the dot on null throws <code>NullPointerException</code>. An object becomes <b>eligible for garbage collection</b> when <b>no live reference chain</b> from a GC root (local variables of running methods, static fields, active threads) can reach it. You cannot force collection; <code>System.gc()</code> is only a hint.</p>`,
    clues: [
      '"Predict the output" with <code>Box y = x;</code> then a change through y → aliasing, both print the new value',
      '"Is Java pass-by-value or pass-by-reference?" → always by value; the value of a reference is an address',
      '"Write a swap method for two objects" → reassigning parameters cannot work; swap the fields or return a new pair',
      '"How many objects are eligible for GC after line N?" → draw arrows, count heap objects no root can reach',
      '"Why did my method change the caller\'s list but not replace it?" → mutate vs reassign',
      '"<code>==</code> returns false even though the fields are equal" → reference comparison, need equals()'
    ],
    code: [`
      class Box {
          int v;
          Box(int v) { this.v = v; }
      }

      public class ReferenceDemo {
          static void reassign(Box b) {
              b = new Box(99);     // moves ONLY the local copy of the arrow
              b.v = 100;           // changes the NEW box, which nobody outside can see
          }

          static void mutate(Box b) {
              b.v = 42;            // follows the copied arrow to the SAME object
          }

          static void bump(int n) {
              n++;                 // changes a copy of the number
          }

          public static void main(String[] args) {
              Box x = new Box(1);
              Box y = x;                     // alias: same object
              y.v = 5;
              System.out.println(x.v + " " + (x == y));    // 5 true

              reassign(x);
              System.out.println(x.v);       // 5  (reassignment invisible)
              mutate(x);
              System.out.println(x.v);       // 42 (mutation visible)

              int n = 7;
              bump(n);
              System.out.println(n);         // 7

              Box z = new Box(42);
              System.out.println(x == z);    // false: different objects, same content
          }
      }`],
    codeTitle: ['Aliasing, mutate vs reassign, == on references'],
    viz: [
      {
        title: 'Stack frames, heap objects and arrows: step by step',
        gen: function () {
          return steps(T2_CODE, [
            { l: 5, n: '<code>main</code> starts: one frame on the stack, no objects on the heap yet (ignoring <code>args</code>).', cs: ['main'], v: {}, h: [], o: '' },
            { l: 6, n: '<code>new Box(1)</code> creates an object at #101 on the heap. The <b>variable</b> <code>x</code> on the stack holds its address.', cs: ['main'], v: { x: '→ #101' }, vh: { x: 'ok' }, h: [['#101 Box', 'v=1']], hh: { '#101 Box': 'ok' }, o: '' },
            { l: 7, n: '<code>Box y = x</code> copies the <b>arrow</b>, not the object. Now two variables point to the same Box: they are <b>aliases</b>.', cs: ['main'], v: { x: '→ #101', y: '→ #101' }, vh: { y: 'ok' }, h: [['#101 Box', 'v=1']], o: '' },
            { l: 8, n: '<code>y.v = 5</code> follows y\'s arrow to #101 and changes it. x points there too, so x "sees" the change.', cs: ['main'], v: { x: '→ #101', y: '→ #101' }, h: [['#101 Box', 'v=5']], hh: { '#101 Box': 'cur' }, o: '' },
            { l: 9, n: '<code>x.v</code> is 5 and <code>x == y</code> compares <b>addresses</b>: #101 == #101, so true.', cs: ['main'], v: { x: '→ #101', y: '→ #101' }, h: [['#101 Box', 'v=5']], o: '5 true' },
            { l: 10, n: 'Calling <code>reassign(x)</code> pushes a new frame. The parameter <code>b</code> gets a <b>copy</b> of x\'s arrow (#101). Pass-by-value!', cs: ['main', 'reassign(b)'], fr: 'reassign()', v: { b: '→ #101 (copy)' }, vh: { b: 'ok' }, h: [['#101 Box', 'v=5']], o: '5 true' },
            { l: 3, n: '<code>b = new Box(99)</code> makes object #102 and moves <b>only b\'s</b> arrow. main\'s <code>x</code> still points to #101.', cs: ['main', 'reassign(b)'], fr: 'reassign()', v: { b: '→ #102' }, vh: { b: 'cur' }, h: [['#101 Box', 'v=5'], ['#102 Box', 'v=99']], hh: { '#102 Box': 'ok' }, o: '5 true' },
            { l: 11, n: 'reassign returns; its frame (and b) vanish. #102 has no arrows left: it is <b>garbage</b>. x.v is still 5.', cs: ['main'], v: { x: '→ #101', y: '→ #101' }, h: [['#101 Box', 'v=5'], ['#102 Box', 'v=99 (unreachable)']], hh: { '#102 Box': 'bad' }, o: '5 true\n5' },
            { l: 12, n: '<code>mutate(x)</code>: again b gets a copy of the arrow #101...', cs: ['main', 'mutate(b)'], fr: 'mutate()', v: { b: '→ #101 (copy)' }, h: [['#101 Box', 'v=5'], ['#102 Box', 'v=99 (unreachable)']], hh: { '#102 Box': 'bad' }, o: '5 true\n5' },
            { l: 4, n: '...and <code>b.v = 42</code> follows it to the <b>same</b> object #101. This change survives the return.', cs: ['main', 'mutate(b)'], fr: 'mutate()', v: { b: '→ #101 (copy)' }, h: [['#101 Box', 'v=42'], ['#102 Box', 'v=99 (unreachable)']], hh: { '#101 Box': 'cur', '#102 Box': 'bad' }, o: '5 true\n5' },
            { l: 13, n: 'Back in main: x.v is now 42. Rule: <b>mutating</b> through a parameter is visible, <b>reassigning</b> it is not.', cs: ['main'], v: { x: '→ #101', y: '→ #101' }, h: [['#101 Box', 'v=42']], o: '5 true\n5\n42' },
            { l: 14, n: '<code>y = null</code>: y points nowhere. #101 is still reachable through x, so it is <b>not</b> garbage yet.', cs: ['main'], v: { x: '→ #101', y: 'null' }, vh: { y: 'bad' }, h: [['#101 Box', 'v=42']], o: '5 true\n5\n42' },
            { l: 15, n: '<code>x = null</code>: the last arrow is gone. #101 is now <b>eligible for GC</b>. The GC decides when to actually free it.', cs: ['main'], v: { x: 'null', y: 'null' }, vh: { x: 'bad' }, h: [['#101 Box', 'v=42 (eligible for GC)']], hh: { '#101 Box': 'bad' }, o: '5 true\n5\n42' }
          ]);
        }
      },
      {
        title: 'Reference playground: who can still reach each object?',
        input: 'a=new; b=a; c=new; a=null; b=c; d=new; d=null',
        inputLabel: 'Operations separated by ; (x=new, x=y, x=null; variables a..f)',
        gen: function (input) {
          var src = String(input === undefined ? 'a=new; b=a; c=new; a=null; b=c; d=new; d=null' : input);
          var ops = src.split(';').map(function (s) { return s.replace(/\s+/g, ''); }).filter(function (s) { return s.length; });
          if (ops.length < 1 || ops.length > 12) throw new Error('Use 1 to 12 operations like a=new; b=a; a=null');
          var vars = {}, objs = [], frames = [], codeLines = [];
          ops.forEach(function (op) {
            var m = /^([a-f])=(new|null|[a-f])$/.exec(op);
            if (!m) throw new Error('Bad operation "' + op + '". Allowed: x=new, x=y, x=null with variables a..f');
            codeLines.push(m[2] === 'new' ? 'Box ' + m[1] + ' = new Box();' : m[1] + ' = ' + m[2] + ';');
          });
          var code = codeLines.join('\n');
          function snapshot(i, narr, changed, freed) {
            var vals = {}, vh = {};
            Object.keys(vars).sort().forEach(function (k) { vals[k] = vars[k] === null ? 'null' : '→ #' + vars[k]; });
            if (changed) vh[changed] = vars[changed] === null ? 'bad' : 'ok';
            var entries = [], hl = {};
            objs.forEach(function (id) {
              var holders = Object.keys(vars).filter(function (k) { return vars[k] === id; });
              var key = '#' + id;
              entries.push([key, holders.length ? 'reachable via ' + holders.join(', ') : 'GARBAGE (no arrows)']);
              hl[key] = holders.length ? (freed === id ? 'cur' : 'ok') : 'bad';
            });
            var lineHl = {}; if (i >= 0) lineHl[i + 1] = 'cur';
            frames.push({ narr: narr, parts: [
              { type: 'code', label: 'Your operations', lang: 'java', code: code, hl: lineHl },
              { type: 'vars', label: 'STACK: reference variables', vals: vals, hl: vh },
              { type: 'map', label: 'HEAP: objects and who points at them', entries: entries, hl: hl }
            ] });
          }
          snapshot(-1, 'Start: no variables, no objects. Each step either creates an object, copies an arrow, or clears an arrow.', null, null);
          var next = 101;
          ops.forEach(function (op, i) {
            var m = /^([a-f])=(new|null|[a-f])$/.exec(op), lhs = m[1], rhs = m[2], narr;
            var before = vars[lhs];
            if (rhs === 'new') { objs.push(next); vars[lhs] = next; narr = '<code>' + lhs + ' = new Box()</code> creates object #' + next + ' and points ' + lhs + ' at it.'; next++; }
            else if (rhs === 'null') { vars[lhs] = null; narr = '<code>' + lhs + ' = null</code> removes ' + lhs + '\'s arrow. The object itself is not touched.'; }
            else {
              if (!(rhs in vars)) throw new Error('Variable ' + rhs + ' used before it was assigned (step ' + (i + 1) + ')');
              vars[lhs] = vars[rhs]; narr = '<code>' + lhs + ' = ' + rhs + '</code> copies the <b>arrow</b>: ' + lhs + ' now points wherever ' + rhs + ' points (' + (vars[rhs] === null ? 'nowhere' : '#' + vars[rhs]) + '). No new object.';
            }
            if (before !== undefined && before !== null) {
              var still = Object.keys(vars).some(function (k) { return vars[k] === before; });
              if (!still) narr += ' <span class="c-r">Object #' + before + ' just lost its last arrow: eligible for garbage collection.</span>';
            }
            snapshot(i, narr, lhs, null);
          });
          var garbage = objs.filter(function (id) { return !Object.keys(vars).some(function (k) { return vars[k] === id; }); });
          if (ops.length < 2) snapshot(ops.length - 1, 'Tip: add more operations (for example <code>b=a; a=null</code>) to watch arrows move and objects become garbage. Rule: an object is collectable only when <b>no</b> variable can reach it.', null, null);
          snapshot(ops.length - 1, 'Final count: <b>' + objs.length + '</b> object(s) created, <b>' + garbage.length + '</b> eligible for GC' + (garbage.length ? ' (' + garbage.map(function (g) { return '#' + g; }).join(', ') + ')' : '') + '. This is exactly how you answer "how many objects are eligible for GC?" questions.', null, null);
          return frames;
        }
      }
    ],
    examples: [
      { title: 'Arrays are objects too', html: `<p><code>int[] a = {1, 2, 3}; int[] b = a; b[0] = 99;</code> → <code>a[0]</code> is <b>99</b>. Arrays live on the heap; <code>b = a</code> copies the arrow. To copy the contents use <code>a.clone()</code> or <code>Arrays.copyOf(a, a.length)</code>.</p>
${H.arr([99, 2, 3], { label: 'a and b (same array)', hl: { 0: 'r' } })}`, code: `
        int[] a = {1, 2, 3};
        int[] b = a;            // alias
        int[] c = a.clone();    // real copy
        b[0] = 99;
        System.out.println(a[0] + " " + c[0]);   // 99 1` },
      { title: 'A method that empties a list vs one that replaces it', html: `<p><code>clearIt(list)</code> calls <code>list.clear()</code>: the caller\'s list becomes empty (mutation). <code>replaceIt(list)</code> does <code>list = new ArrayList&lt;&gt;()</code>: the caller still has the full list (reassignment of a copied arrow).</p>`, code: `
        class ListDemo {
            static void clearIt(List<Integer> list) { list.clear(); }
            static void replaceIt(List<Integer> list) { list = new ArrayList<>(); }
            public static void main(String[] args) {
                List<Integer> nums = new ArrayList<>(List.of(1, 2, 3));
                replaceIt(nums);
                System.out.println(nums);   // [1, 2, 3]
                clearIt(nums);
                System.out.println(nums);   // []
            }
        }` },
      { title: 'Counting GC-eligible objects', html: `<p>Trace: <code>A p = new A(); A q = new A(); A r = p; p = q; q = null;</code>. Objects: #1 (first new) is reached by r; #2 is reached by p. <b>Zero</b> objects are eligible. Now add <code>r = null;</code> → #1 has no arrows → <b>one</b> eligible. Always count arrows, never variables.</p>
${H.table(['after', 'p', 'q', 'r', 'eligible'], [['p=q', '#2', '#2', '#1', '0'], ['q=null', '#2', 'null', '#1', '0'], ['r=null', '#2', 'null', 'null', '<span class="c-r">#1</span>']])}` },
      { title: 'Islands of isolation', html: `<p>Two objects that point at <b>each other</b> but are unreachable from any root are still garbage. Java\'s GC traces from roots (it is not reference counting), so cycles are collected fine. <code>a.partner = b; b.partner = a; a = null; b = null;</code> → both eligible.</p>` }
    ],
    deepDive: `<p><b>What a reference really is.</b> On HotSpot 64-bit with heaps under about 32 GB, references are <b>compressed oops</b>: 32-bit offsets that the JVM shifts and adds to a heap base, so a reference field costs 4 bytes, not 8. Above 32 GB compression turns off and every reference doubles in size, which is why people say "a 31 GB heap can hold more than a 33 GB heap".</p>
<p><b>Stack vs heap is a model, not a promise.</b> The language spec only says objects have lifetimes and locals belong to frames. The JIT's <b>escape analysis</b> may put an object's fields directly into registers if the object never escapes the method; conversely, local variables captured by a lambda are copied into a heap object. Java (unlike C#) has no user-defined stack types yet; <b>Project Valhalla</b> value classes (JEP 401, still evolving through early-access and preview builds as of 2026) aim to give "codes like a class, works like an int" objects without identity, which can be flattened into arrays and fields.</p>
<p><b>Identity.</b> Every normal object has an identity: <code>==</code> compares it, <code>synchronized</code> locks on it, <code>System.identityHashCode</code> exposes a hash of it. Identity is why two Boxes with equal contents are still different.</p>
<p><b>GC roots</b> include: locals and operand-stack slots of live frames in all threads, static fields of loaded classes, JNI references, and monitors held. "Unreachable" is decided by tracing from these roots. Common leak: an object stays reachable from a <b>static collection</b> or cache you forgot to clear, so the GC is not allowed to collect it even though your code never uses it again.</p>
<p><b>Pass-by-value proof:</b> if Java passed by reference, <code>reassign(x)</code> would change main\'s <code>x</code>. It never does, for any type. String "seems" special only because it is immutable: you cannot mutate it, so every "change" is a reassignment.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants can explain aliasing well when asked directly, but in generated code they introduce aliasing bugs silently: returning an internal mutable list from a getter, storing a caller\'s array without copying it, or "cloning" with <code>b = a</code>. These bugs pass simple tests and fail weeks later when two parts of the system mutate the same object.</p>
<p><b>Use AI as a partner:</b> paste a snippet and ask <code>"Draw the stack and heap after each line as a table and count objects eligible for GC"</code>, then compare with your own trace. Ask it to <code>"find every place this class exposes or stores a mutable reference it does not own"</code> during reviews.</p>
<p><b>Where AI goes wrong:</b> saying "objects are passed by reference in Java" (a very common wrong phrase in training data), or claiming <code>System.gc()</code> frees memory immediately. <b>What you must still own:</b> drawing arrows by hand under interview pressure, explaining pass-by-value precisely ("the reference is passed by value"), and reasoning about who else can see an object before you mutate it, which matters even more when AI writes half your code.</p>`,
    problems: [{
      title: 'Predict the Output: The Swap That Does Not Swap',
      level: 'Easy', tags: ['references', 'pass-by-value', 'output prediction'], companies: ['Amazon', 'Wipro', 'Capgemini'],
      statement: `<p>Predict the three output lines, then write <code>swapContents(Point a, Point b)</code> that really swaps the two points as the caller sees them.</p>
<pre>class Point { int x, y; Point(int x, int y) { this.x = x; this.y = y; } }

static void swap(Point a, Point b) { Point t = a; a = b; b = t; }
static void shift(Point p) { p.x += 10; p = new Point(0, 0); p.y += 10; }

Point p1 = new Point(1, 1), p2 = new Point(2, 2);
swap(p1, p2);
System.out.println(p1.x + " " + p2.x);
shift(p1);
System.out.println(p1.x + " " + p1.y);
Point p3 = p1; p3.y = 7;
System.out.println(p1.y + " " + (p1 == p3) + " " + (p1 == new Point(11, 7)));</pre>`,
      constraints: `Do not change the method signatures of swap/shift when predicting. swapContents must return void.`,
      example: `<p>Output:</p><pre>1 2\n11 1\n7 true false</pre><p>${H.c('r', 'swap')} only shuffled its own copies of the arrows. ${H.c('g', 'shift')} changed x through the shared arrow (visible) and then moved its private arrow to a new point (invisible). p3 is an alias of p1, but a brand-new Point is a different object, so <code>==</code> is false.</p>`,
      brute: {
        why: `<p>The naive swap reassigns the parameters. Because Java copies each argument\'s arrow into the parameter, the method only rearranges its own private copies; main\'s p1 and p2 never move. No amount of reassignment inside a method can change which object a caller\'s variable points to.</p>`,
        code: `
        class SwapBroken {
            static class Point { int x, y; Point(int x, int y) { this.x = x; this.y = y; } }
            static void swap(Point a, Point b) {
                Point t = a;   // t -> p1's object
                a = b;         // local a -> p2's object
                b = t;         // local b -> p1's object; caller sees nothing
            }
            public static void main(String[] args) {
                Point p1 = new Point(1, 1), p2 = new Point(2, 2);
                swap(p1, p2);
                System.out.println(p1.x + " " + p2.x);   // 1 2
            }
        }`
      },
      mcq: { q: 'Which change inside a method can the caller observe?', options: ['Changing a field of the object the parameter points to', 'Assigning a new object to the parameter', 'Setting the parameter to null', 'Incrementing an int parameter'], answer: 0, explain: 'Only mutation of the shared object travels back. Every form of reassignment changes only the method\'s private copy.' },
      hints: [
        `<p>Hint 1: Draw two boxes on the heap and arrows from p1 and p2. When a method is called, draw <b>new</b> arrows for its parameters starting at the same objects.</p>`,
        `<p>Hint 2: Reassigning a parameter moves only its own arrow. Writing <code>a.x = ...</code> changes the object at the end of the arrow, which the caller can see.</p>`,
        `<p>Hint 3: To swap for real, swap the <b>contents</b>: save a.x and a.y in temporaries, copy b\'s fields into a, then the temporaries into b. Edge case: if a and b are the same object, the swap must still leave it unchanged (it does).</p>`
      ],
      tests: { sig: 'int int int int -> int[]', fn: 'swChk',
        harness: { java: `class Check { static int[] swChk(int x1, int y1, int x2, int y2) { SwapFixed.Point a = new SwapFixed.Point(x1, y1), b = new SwapFixed.Point(x2, y2); SwapFixed.swapContents(a, b); return new int[]{a.x, a.y, b.x, b.y}; } }`, python: `def sw_chk(x1, y1, x2, y2):
    a, b = Point(x1, y1), Point(x2, y2)
    swap_contents(a, b)
    return [a.x, a.y, b.x, b.y]
` }, cases: [
        [[1,1,2,2],[2,2,1,1]],
        [[1,2,3,4],[3,4,1,2]],
        [[0,0,0,0],[0,0,0,0]],
        [[5,5,5,5],[5,5,5,5]],
        [[-1,-2,3,4],[3,4,-1,-2]],
        [[2147483647,-2147483648,-2147483648,2147483647],[-2147483648,2147483647,2147483647,-2147483648]],
        [[7,0,0,7],[0,7,7,0]],
        [[10,20,10,30],[10,30,10,20]],
        [[-5,-5,-6,-6],[-6,-6,-5,-5]]
      ] },
      solution: {
        approach: `<p>Trace the arrows: swap does nothing visible (1 2); shift mutates x through the shared arrow (+10 → 11) then reassigns its local copy, so y stays 1; p3 aliases p1 so <code>p1.y</code> becomes 7, <code>p1 == p3</code> is true, and a new Point is a different identity (false). For a working swap, mutate both objects\' fields instead of moving arrows.</p>`,
        code: `
        class SwapFixed {
            static class Point { int x, y; Point(int x, int y) { this.x = x; this.y = y; } }

            // Swaps the CONTENTS, which the caller can observe
            static void swapContents(Point a, Point b) {
                int tx = a.x, ty = a.y;
                a.x = b.x; a.y = b.y;
                b.x = tx;  b.y = ty;
            }

            public static void main(String[] args) {
                Point p1 = new Point(1, 1), p2 = new Point(2, 2);
                swapContents(p1, p2);
                System.out.println(p1.x + " " + p2.x);   // 2 1
            }
        }`,
        alt: [{ lang: 'python', code: `class Point:\n    def __init__(self, x, y):\n        self.x, self.y = x, y\n\ndef swap(a, b):\n    a, b = b, a          # rebinding locals: caller unaffected (same rule as Java)\n\ndef swap_contents(a, b):\n    a.x, b.x = b.x, a.x\n    a.y, b.y = b.y, a.y\n\np1, p2 = Point(1, 1), Point(2, 2)\nswap(p1, p2); print(p1.x, p2.x)\nswap_contents(p1, p2); print(p1.x, p2.x)`, run: true }],
        dry: { head: ['line', 'p1 →', 'p2 →', 'objects', 'printed'], rows: [
          ['create', '#1', '#2', '#1(1,1) #2(2,2)', '-'],
          ['swap(p1,p2)', '#1', '#2', 'unchanged', '<span class="c-r">1 2</span>'],
          ['shift(p1): p.x+=10', '#1', '#2', '#1(11,1)', '-'],
          ['shift: p=new, p.y+=10', '#1', '#2', '#3(0,10) is garbage after return', '11 1'],
          ['p3=p1; p3.y=7', '#1 (p3 too)', '#2', '#1(11,7)', '<span class="c-g">7 true false</span>']
        ] },
        complexity: `<p>O(1) time and O(1) extra space for every method; the lesson is about semantics, not speed.</p>`,
        followUps: ['Rewrite swap to return a new Point[] pair. Is that cleaner?', 'How would this behave with immutable points (records)?', 'Why does a String parameter never seem to change after a method "modifies" it?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3: Constructors, overloading and chaining with this(...)
     ====================================================================== */
  var T3_CODE = [
    'class Pizza {',
    '    String size; String crust; int toppings;',
    '    Pizza() {',
    '        this("medium");',
    '    }',
    '    Pizza(String size) {',
    '        this(size, "thin");',
    '    }',
    '    Pizza(String size, String crust) {',
    '        this(size, crust, 0);',
    '    }',
    '    Pizza(String size, String crust, int toppings) {',
    '        super();                 // Object() runs first',
    '        this.size = size;',
    '        this.crust = crust;',
    '        this.toppings = toppings;',
    '    }',
    '}'
  ].join('\n');

  topics.push({
    title: 'Constructors & Constructor Chaining',
    analogy: `<p>A constructor is the <b>setup checklist at a car factory</b>: before a new car rolls out, someone fills the tank, sets the seats and installs the key. You cannot drive a half-built car. <b>Constructor chaining</b> is the factory saying: <i>"the basic model is just the deluxe model with default options"</i>. Instead of writing three separate checklists, the basic checklist says "go run the deluxe checklist with these defaults", so every car goes through the <b>one</b> master checklist.</p>`,
    explain: `<p>Setting fields by hand after <code>new</code> (like <code>r.width = 3</code>) is fragile: someone will forget, and you get half-built objects. A <b>constructor</b> is special code that runs automatically every time an object is created, so the object starts life <b>complete and valid</b>.</p>
<h4>1. Rules of a constructor</h4>
<ul>
<li>Same name as the class, <b>no return type</b> (not even <code>void</code>).</li>
<li>Runs once per <code>new</code>, right after memory is allocated and zeroed.</li>
<li>Can take parameters, can be overloaded, can have any access modifier (<code>private</code> constructors are common).</li>
<li>Is <b>not</b> inherited and is <b>not</b> a member method: you cannot call <code>obj.Dog()</code>.</li>
</ul>
<p><b>Trap:</b> <code>void Dog() { }</code> compiles, but it is an ordinary <b>method</b> named Dog, not a constructor. It will never run on <code>new Dog()</code>.</p>
<h4>2. The default constructor (and how it disappears)</h4>
${H.table(['You write', 'Compiler adds', 'new X() compiles?'], [
  ['<code>class A { }</code>', '<code>A() { super(); }</code> (same access as the class)', '<span class="c-g">yes</span>'],
  ['<code>class B { B(int n) { } }</code>', '<b>nothing</b>', '<span class="c-r">no: "constructor B in class B cannot be applied"</span>'],
  ['<code>class C { C() { } C(int n) { } }</code>', 'nothing needed', '<span class="c-g">yes</span>']
])}
<p>The moment you write <b>any</b> constructor, the free no-arg one is gone. Frameworks such as JPA and Jackson often need a no-arg constructor, so this bites real projects.</p>
<h4>3. Overloading constructors</h4>
<p>Like methods, constructors can be overloaded by <b>parameter list</b> (number, types, order). Java picks one at compile time from the arguments you pass.</p>
<h4>4. Chaining with <code>this(...)</code></h4>
<p>Overloaded constructors usually repeat the same work. Instead, let the short ones <b>delegate</b> to the most complete one:</p>
${H.table(['Call', 'Delegates to', 'Final values'], [
  ['<code>new Pizza()</code>', '<code>this("medium")</code>', 'medium, thin, 0'],
  ['<code>new Pizza("large")</code>', '<code>this("large", "thin")</code>', 'large, thin, 0'],
  ['<code>new Pizza("small", "thick")</code>', '<code>this("small", "thick", 0)</code>', 'small, thick, 0']
])}
<p>Rules for <code>this(...)</code>: it can only appear in a constructor; it must be the <b>first statement</b> (Java 21; see the deep dive for the Java 25 relaxation); you cannot use both <code>this(...)</code> and <code>super(...)</code> in the same constructor; and a cycle (<code>A()</code> calls <code>A(int)</code> which calls <code>A()</code>) is a compile error: "recursive constructor invocation".</p>
<h4>5. <code>super(...)</code>: the parent is built first</h4>
<p>Every constructor begins by building the parent part of the object. If you do not write <code>this(...)</code> or <code>super(...)</code>, the compiler inserts <code>super();</code> for you. That is why a class whose parent has <b>no</b> no-arg constructor must call <code>super(args)</code> explicitly. (Inheritance itself is java04; here you only need "parent first".)</p>
<h4>6. Validate in the constructor</h4>
<p>A constructor is the perfect gatekeeper: check arguments and <code>throw new IllegalArgumentException(...)</code> if they are bad. If the constructor throws, the caller never receives a reference, so an invalid object can never be used. With chaining you validate in <b>one</b> place.</p>
<h4>7. Other constructor patterns</h4>
<ul>
<li><b>Copy constructor:</b> <code>Point(Point other) { this(other.x, other.y); }</code> makes a real, independent copy.</li>
<li><b>Private constructor:</b> stops outsiders from calling <code>new</code> (utility classes, singletons, factories).</li>
<li><b>Static factory method:</b> <code>Color.of(255, 0, 0)</code> or <code>Duration.ofMinutes(5)</code>: a named method that returns an instance, can cache, and can return a subtype.</li>
<li><b>Builder:</b> when there are many optional parameters (the "telescoping constructor" smell), use a builder: <code>new Pizza.Builder().size("large").cheese(true).build()</code>.</li>
</ul>`,
    clues: [
      '"Constructor X in class Y cannot be applied to given types" → you wrote a parameterised constructor, so the default no-arg one vanished',
      '"Avoid duplicate initialisation code across overloaded constructors" → chain them with this(...) to one master constructor',
      '"call to this must be first statement in constructor" → the chaining rule (pre-Java 25 syntax)',
      '"Object must never be in an invalid state" → validate in the constructor and throw IllegalArgumentException',
      '"Many optional parameters" / "telescoping constructors" → builder pattern or static factories',
      '"Does a constructor have a return type? Can it be private/static/final?" → no return type; private yes; static/final/abstract no'
    ],
    code: [`
      class Account {
          private final String id;      // final: must be set exactly once, in every constructor path
          private final String owner;
          private long balancePaise;

          // Master constructor: the ONLY place that validates and assigns
          Account(String id, String owner, long openingBalancePaise) {
              if (id == null || id.isBlank()) throw new IllegalArgumentException("id required");
              if (owner == null || owner.isBlank()) throw new IllegalArgumentException("owner required");
              if (openingBalancePaise < 0) throw new IllegalArgumentException("balance cannot be negative");
              this.id = id;
              this.owner = owner;
              this.balancePaise = openingBalancePaise;
          }

          // Convenience constructor: delegates, no duplicated logic
          Account(String id, String owner) {
              this(id, owner, 0);
          }

          // Copy constructor: an independent copy with a new id
          Account(String newId, Account other) {
              this(newId, other.owner, other.balancePaise);
          }

          // Static factory with a descriptive name
          static Account withWelcomeBonus(String id, String owner) {
              return new Account(id, owner, 10_000);   // 100 rupees
          }

          @Override
          public String toString() { return id + ":" + owner + ":" + balancePaise; }
      }

      public class Main {
          public static void main(String[] args) {
              System.out.println(new Account("A1", "Asha"));                    // A1:Asha:0
              System.out.println(Account.withWelcomeBonus("A2", "Ben"));       // A2:Ben:10000
              System.out.println(new Account("A3", new Account("A1", "Asha", 500))); // A3:Asha:500
              try {
                  new Account("A4", "", 50);
              } catch (IllegalArgumentException e) {
                  System.out.println("rejected: " + e.getMessage());           // rejected: owner required
              }
          }
      }`],
    codeTitle: ['One master constructor, delegating overloads, copy constructor, static factory'],
    viz: [
      {
        title: 'Constructor chain: watch this(...) climb and unwind',
        input: '0',
        inputLabel: 'Which constructor does main call? number of arguments: 0, 1, 2 or 3',
        gen: function (input) {
          var k = clampInt(input, 0, 0, 3, 'Enter 0, 1, 2 or 3 (the number of arguments passed to new Pizza(...))');
          var calls = ['new Pizza()', 'new Pizza("large")', 'new Pizza("large", "thick")', 'new Pizza("large", "thick", 3)'];
          var sig = ['Pizza()', 'Pizza(size)', 'Pizza(size, crust)', 'Pizza(size, crust, toppings)'];
          var startLine = [3, 6, 9, 12], callLine = [4, 7, 10];
          var size = k === 0 ? 'medium' : 'large', crust = k >= 2 ? 'thick' : 'thin', top = k === 3 ? 3 : 0;
          var list = [], cs = [];
          list.push({ l: [], n: 'main runs <code>' + calls[k] + '</code>. First, memory for the object is allocated and zeroed: size=null, crust=null, toppings=0. Then Java picks the constructor whose parameter list matches the arguments: <b>' + sig[k] + '</b>.', cs: ['main'], h: [['#201 Pizza', 'size=null, crust=null, toppings=0']], hh: { '#201 Pizza': 'ok' } });
          for (var i = k; i < 3; i++) {
            cs.push(sig[i]);
            list.push({ l: startLine[i], n: 'Enter <b>' + sig[i] + '</b>. It does not set fields itself...', cs: ['main'].concat(cs), h: [['#201 Pizza', 'size=null, crust=null, toppings=0']] });
            list.push({ l: callLine[i], n: '...its <b>first statement</b> is <code>this(...)</code>: delegate to the next, more complete constructor, filling in a default (' + ['size "medium"', 'crust "thin"', 'toppings 0'][i] + '). The same object #201 is passed along.', cs: ['main'].concat(cs), h: [['#201 Pizza', 'size=null, crust=null, toppings=0']] });
          }
          cs.push(sig[3]);
          list.push({ l: 12, n: 'The <b>master constructor</b> is reached. Everyone ends up here, so validation and assignments live in exactly one place.', cs: ['main'].concat(cs), h: [['#201 Pizza', 'size=null, crust=null, toppings=0']] });
          list.push({ l: 13, n: '<code>super()</code>: the parent (Object) part is initialised first. Only the constructor at the end of the this(...) chain calls super, so the parent is built <b>exactly once</b>.', cs: ['main'].concat(cs).concat(['Object()']), h: [['#201 Pizza', 'size=null, crust=null, toppings=0']] });
          list.push({ l: [14, 15, 16], n: 'Assign the fields: size="' + size + '", crust="' + crust + '", toppings=' + top + '.', cs: ['main'].concat(cs), h: [['#201 Pizza', 'size="' + size + '", crust="' + crust + '", toppings=' + top]], hh: { '#201 Pizza': 'cur' } });
          for (var j = cs.length - 1; j >= 1; j--) {
            var popped = cs.pop();
            list.push({ l: callLine[k + cs.length - 1], c: 'done', n: '<b>' + popped + '</b> finishes and returns to <b>' + cs[cs.length - 1] + '</b>, which has nothing left to do after its this(...) call.', cs: ['main'].concat(cs), h: [['#201 Pizza', 'size="' + size + '", crust="' + crust + '", toppings=' + top]] });
          }
          list.push({ l: [], n: 'The outermost constructor returns and <code>new</code> hands main the reference. Result: <b>' + size + ' / ' + crust + ' / ' + top + '</b>. Chain length: ' + (4 - k) + ' constructor(s), one object.', cs: ['main'], v: { p: '→ #201' }, vh: { p: 'ok' }, h: [['#201 Pizza', 'size="' + size + '", crust="' + crust + '", toppings=' + top]], hh: { '#201 Pizza': 'sel' } });
          return steps(T3_CODE, list);
        }
      },
      {
        title: 'The vanishing default constructor',
        gen: function () {
          var f = [];
          function frame(narr, code, hl, note) {
            f.push({ narr: narr, parts: [{ type: 'code', label: 'What you wrote', lang: 'java', code: code, hl: hl }, { type: 'text', label: 'What the compiler does', html: note }] });
          }
          frame('Case 1: a class with <b>no constructor at all</b>.', 'class Cat {\n    String name;\n}\n\nCat c = new Cat();   // OK', { 1: 'cur' }, 'The compiler silently adds <code>Cat() { super(); }</code>, the <b>default constructor</b>. It has the same access modifier as the class.');
          frame('So <code>new Cat()</code> compiles and runs: name is null.', 'class Cat {\n    String name;\n    Cat() { super(); }   // added by javac, invisible in source\n}\n\nCat c = new Cat();   // OK', { 3: 'ok', 6: 'ok' }, '<span class="c-g">Compiles.</span> You can see it with <code>javap -c Cat</code>: there is a <code>Cat()</code> that calls <code>Object.&lt;init&gt;</code>.');
          frame('Case 2: you add a constructor that takes a name...', 'class Cat {\n    String name;\n    Cat(String name) { this.name = name; }\n}\n\nCat c = new Cat();   // ???', { 3: 'cur' }, 'Because you wrote <b>a</b> constructor, the compiler adds <b>nothing</b>. The free no-arg one is gone.');
          frame('...and now the old line breaks.', 'class Cat {\n    String name;\n    Cat(String name) { this.name = name; }\n}\n\nCat c = new Cat();   // ERROR', { 6: 'bad' }, '<span class="c-r">error: constructor Cat in class Cat cannot be applied to given types; required: String, found: no arguments</span>');
          frame('Fix: declare the no-arg constructor yourself, ideally chaining to the main one.', 'class Cat {\n    String name;\n    Cat() { this("Unnamed"); }\n    Cat(String name) { this.name = name; }\n}\n\nCat c = new Cat();   // OK, name = "Unnamed"', { 3: 'ok', 7: 'ok' }, '<span class="c-g">Compiles.</span> Now both <code>new Cat()</code> and <code>new Cat("Tom")</code> work and share one assignment path.');
          frame('Trap: a "constructor" with a return type is just a method.', 'class Cat {\n    String name;\n    void Cat() { name = "Tom"; }   // a METHOD named Cat!\n}\n\nCat c = new Cat();\nSystem.out.println(c.name);   // null', { 3: 'bad', 7: 'bad' }, 'Because of <code>void</code>, this is an ordinary method that happens to share the class name. The default constructor is still generated, the method never runs on <code>new</code>, and the output is <b>null</b>.');
          return f;
        }
      }
    ],
    examples: [
      { title: 'Telescoping constructors (the smell) vs a builder', html: `<p>When a class has 6 optional settings, you end up with constructors like <code>Pizza(size)</code>, <code>Pizza(size, crust)</code>, <code>Pizza(size, crust, cheese)</code>... and calls like <code>new Pizza("L", "thin", true, false, 2, true)</code> that nobody can read. A <b>builder</b> names each option:</p>`, code: `
        class Pizza {
            private final String size; private final boolean extraCheese; private final int olives;
            private Pizza(Builder b) { size = b.size; extraCheese = b.extraCheese; olives = b.olives; }
            static class Builder {
                private String size = "medium"; private boolean extraCheese; private int olives;
                Builder size(String s) { size = s; return this; }
                Builder extraCheese(boolean c) { extraCheese = c; return this; }
                Builder olives(int n) { olives = n; return this; }
                Pizza build() { return new Pizza(this); }
            }
            @Override public String toString() { return size + " cheese=" + extraCheese + " olives=" + olives; }
            public static void main(String[] args) {
                System.out.println(new Pizza.Builder().size("large").olives(5).build()); // large cheese=false olives=5
            }
        }` },
      { title: 'final fields must be assigned on every path', html: `<p>A <code>final</code> field without an initializer must be assigned <b>exactly once</b> in every constructor. If one overloaded constructor forgets, you get <i>"variable id might not have been initialized"</i>. Chaining to a master constructor guarantees every path assigns it.</p>`, code: `
        class User {
            private final String id;
            private final String name;
            User(String id, String name) { this.id = id; this.name = name; }
            User(String id) { this(id, "guest"); }   // assigns via the master constructor
            // User() { }   // would NOT compile: id and name never assigned
        }` },
      { title: 'Which constructor runs? (overload resolution)', html: `<p>Given <code>Num(int x)</code>, <code>Num(long x)</code> and <code>Num(Integer x)</code>, the call <code>new Num(5)</code> picks <b>int</b> (exact match). <code>new Num(5L)</code> picks <b>long</b>. If only <code>Num(long)</code> and <code>Num(Integer)</code> existed, <code>new Num(5)</code> would pick <b>long</b>: widening beats boxing.</p>
${H.table(['Phase', 'Allowed conversions'], [['1', 'exact / widening (int → long)'], ['2', 'boxing / unboxing (int → Integer)'], ['3', 'varargs']])}` },
      { title: 'Constructor that throws: no object escapes', html: `<p><code>Temperature t = new Temperature(-500);</code> with a check for "below absolute zero" throws <code>IllegalArgumentException</code>. The assignment to <code>t</code> never happens, so nobody can use the half-built object. This "fail fast" style keeps bugs near their cause.</p>`, code: `
        class Temperature {
            final double kelvin;
            Temperature(double kelvin) {
                if (kelvin < 0) throw new IllegalArgumentException("below absolute zero: " + kelvin);
                this.kelvin = kelvin;
            }
        }` }
    ],
    deepDive: `<p><b>Constructors in bytecode.</b> Every constructor compiles to a method named <code>&lt;init&gt;</code>. <code>new Dog("Rex")</code> becomes three instructions: <code>new</code> (allocate, zeroed), <code>dup</code>, <code>invokespecial Dog.&lt;init&gt;(String)</code>. The verifier ensures no method is called on the object (apart from field writes to its own class) until a superclass <code>&lt;init&gt;</code> has run, which is the bytecode-level reason for "super first".</p>
<p><b>Flexible constructor bodies (JDK 25, JEP 513, final).</b> Since Java 25 you may put statements <b>before</b> <code>this(...)</code> or <code>super(...)</code>, e.g. validate arguments or compute a value, as long as that "prologue" does not read <code>this</code> or call instance methods. It may even assign this class\'s own fields before calling super, which lets a subclass set fields that an overridden method called by the parent constructor will see. In Java 21 (the most common LTS in interviews) <code>this(...)</code>/<code>super(...)</code> must still be the very first statement, and people work around it with static helper methods: <code>super(validate(x))</code>.</p>
<p><b>Instance initializers and chaining.</b> Field initializers and <code>{ }</code> blocks are copied by javac into every constructor that calls <code>super(...)</code> (explicitly or implicitly), right after the super call, and <b>not</b> into constructors that start with <code>this(...)</code>. That is why they run exactly once per object no matter which overload you call (topic 6).</p>
<p><b>Production reality.</b> JPA/Hibernate require a no-arg constructor (can be <code>protected</code>) because they create objects by reflection and then fill fields. Jackson can use parameterised constructors with <code>@JsonCreator</code> or records. Dependency injection frameworks (Spring) prefer <b>constructor injection</b>: dependencies are <code>final</code>, the object is complete after construction, and tests can call the constructor directly. Records generate a canonical constructor and let you add validation in a <b>compact constructor</b>: <code>record Range(int lo, int hi) { Range { if (lo &gt; hi) throw new IllegalArgumentException(); } }</code>.</p>
<p><b>Do not leak <code>this</code> or start threads in a constructor</b>: another thread may see the object before its fields are set (topic 4). And keep constructors cheap; do I/O in a factory method instead.</p>`,
    aiEra: `<p><b>What AI changes:</b> IDEs and assistants generate constructors, builders and Lombok annotations (<code>@AllArgsConstructor</code>, <code>@Builder</code>) instantly. The thinking that remains yours: <b>which invariants must hold from birth</b>, which fields are <code>final</code>, and whether you need a builder, a factory, or simply a record.</p>
<p><b>Use AI as a partner:</b> <code>"Here is my class. List every way a caller could create an invalid instance, then refactor so all constructors chain to one validating constructor."</code> Or: <code>"Convert these 5 telescoping constructors to a builder and show the call-site diff."</code></p>
<p><b>Where AI goes wrong:</b> duplicating validation in each overload instead of chaining; generating a no-arg constructor "for frameworks" that leaves <code>final</code>-intended fields unset (so it drops <code>final</code>); putting statements before <code>this(...)</code> (valid only on Java 25+, an error on Java 21); and mixing Lombok with hand-written constructors so two paths exist. <b>What you must still own:</b> knowing the default-constructor rule, the chaining rules and the exact order of super/initializers/body, because those are classic interview probes and real debugging skills.</p>`,
    problems: [{
      title: 'Coffee Order: Remove Duplicated Constructor Logic',
      level: 'Medium', tags: ['constructors', 'this()', 'validation'], companies: ['Amazon', 'Flipkart', 'Swiggy'],
      statement: `<p>A <code>Coffee</code> has <code>size</code> ("S", "M" or "L"), <code>shots</code> (1 to 4) and <code>milk</code> (any non-empty string, "none" allowed). Callers need four ways to create one:</p>
<ul><li><code>new Coffee()</code> → M, 1, none</li><li><code>new Coffee(size)</code> → size, 1, none</li><li><code>new Coffee(size, shots)</code> → size, shots, none</li><li><code>new Coffee(size, shots, milk)</code></li></ul>
<p>Invalid values must throw <code>IllegalArgumentException</code>. The validation and assignments must exist in <b>exactly one</b> place.</p>`,
      constraints: `Fields must be <code>final</code>. No setters. Java 21 syntax.`,
      example: `<p><code>new Coffee("L")</code> → ${H.c('g', 'L / 1 shot / none')}. <code>new Coffee("XL")</code> → ${H.c('r', 'IllegalArgumentException: bad size XL')}. <code>new Coffee("S", 9)</code> → ${H.c('r', 'IllegalArgumentException: shots must be 1..4')}. Why? Every overload funnels into the 3-arg constructor, which checks before assigning.</p>`,
      brute: {
        why: `<p>Writing four independent constructors means copying the checks and assignments four times. When the business adds size "XL" you must remember to update four places; miss one and <code>new Coffee("XL")</code> works while <code>new Coffee("XL", 2)</code> throws. Duplicated constructor bodies are a classic source of inconsistent objects.</p>`,
        code: `
        class CoffeeBrute {
            final String size; final int shots; final String milk;
            CoffeeBrute() { size = "M"; shots = 1; milk = "none"; }
            CoffeeBrute(String size) {
                if (!size.equals("S") && !size.equals("M") && !size.equals("L")) throw new IllegalArgumentException("bad size " + size);
                this.size = size; this.shots = 1; this.milk = "none";
            }
            CoffeeBrute(String size, int shots) {
                if (!size.equals("S") && !size.equals("M") && !size.equals("L")) throw new IllegalArgumentException("bad size " + size);
                if (shots < 1 || shots > 4) throw new IllegalArgumentException("shots must be 1..4");
                this.size = size; this.shots = shots; this.milk = "none";
            }
            CoffeeBrute(String size, int shots, String milk) {
                if (!size.equals("S") && !size.equals("M") && !size.equals("L")) throw new IllegalArgumentException("bad size " + size);
                if (shots < 1 || shots > 4) throw new IllegalArgumentException("shots must be 1..4");
                this.size = size; this.shots = shots; this.milk = milk;   // forgot the milk check here!
            }
        }`
      },
      mcq: { q: 'Which constructor should hold the validation?', options: ['The one with the most parameters, and the others chain to it with this(...)', 'The no-arg one, and the others call it first', 'Each one separately, to be safe', 'None: validate in a setter'], answer: 0, explain: 'The fullest constructor sees every value. Short constructors only fill in defaults and delegate, so every path is validated once. Chaining to the no-arg one cannot work because it cannot receive the caller\'s values (and final fields could not be reassigned).' },
      hints: [
        `<p>Hint 1: Only one constructor can see all three values: the 3-argument one. Make it the "master" that validates and assigns.</p>`,
        `<p>Hint 2: Each shorter constructor is one line: <code>this(...)</code> with defaults for the missing values. Remember: in Java 21, <code>this(...)</code> must be the first statement.</p>`,
        `<p>Hint 3: Check <code>null</code> before calling methods on the size string; use <code>switch</code> or a <code>Set.of("S","M","L").contains(size)</code>. Because fields are final, the compiler will itself prove every path assigns each field exactly once.</p>`
      ],
      tests: { sig: 'int string int string -> string', fn: 'coffeeCheck',
        harness: { java: `class Check { static String coffeeCheck(int k, String size, int shots, String milk) { try { Coffee c = k == 0 ? new Coffee() : k == 1 ? new Coffee(size) : k == 2 ? new Coffee(size, shots) : new Coffee(size, shots, milk); return c.toString(); } catch (IllegalArgumentException e) { return "IAE: " + e.getMessage(); } } }`, python: `def coffee_check(k, size, shots, milk):
    try:
        if k == 0: c = Coffee()
        elif k == 1: c = Coffee(size)
        elif k == 2: c = Coffee(size, shots)
        else: c = Coffee(size, shots, milk)
        return repr(c)
    except ValueError as e:
        return "IAE: " + str(e)
` }, cases: [
        [[0,"",0,""],"M / 1 shot(s) / none"],
        [[1,"L",0,""],"L / 1 shot(s) / none"],
        [[1,"XL",0,""],"IAE: bad size XL"],
        [[2,"S",9,""],"IAE: shots must be 1..4"],
        [[3,"S",2,"oat"],"S / 2 shot(s) / oat"],
        [[2,"M",4,""],"M / 4 shot(s) / none"],
        [[2,"M",5,""],"IAE: shots must be 1..4"],
        [[2,"M",0,""],"IAE: shots must be 1..4"],
        [[2,"M",1,""],"M / 1 shot(s) / none"],
        [[2,"M",-1,""],"IAE: shots must be 1..4"],
        [[3,"L",3,""],"IAE: milk required"],
        [[3,"L",3,"   "],"IAE: milk required"],
        [[3,"S",1,"whole milk"],"S / 1 shot(s) / whole milk"],
        [[1,"s",0,""],"IAE: bad size s"],
        [[1,"",0,""],"IAE: bad size "],
        [[3,"Q",9,""],"IAE: bad size Q"],
        [[3,"M",4,"almond"],"M / 4 shot(s) / almond"],
        [[3,"XL",4,"x"],"IAE: bad size XL"],
        [[3,"M",2147483647,"x"],"IAE: shots must be 1..4"],
        [[2,"L",-2147483648,""],"IAE: shots must be 1..4"]
      ] },
      solution: {
        approach: `<p>Make the 3-argument constructor the single source of truth: it validates size, shots and milk, then assigns the final fields. The 0, 1 and 2 argument constructors each delegate with <code>this(...)</code>, supplying defaults. Adding "XL" later means editing one set, and a missed check is impossible because there is only one.</p>`,
        code: `
        class Coffee {
            private static final Set<String> SIZES = Set.of("S", "M", "L");
            private final String size;
            private final int shots;
            private final String milk;

            Coffee() { this("M"); }                          // defaults: M
            Coffee(String size) { this(size, 1); }           // default shots
            Coffee(String size, int shots) { this(size, shots, "none"); }   // default milk

            // Master constructor: the ONLY place with checks and assignments
            Coffee(String size, int shots, String milk) {
                if (size == null || !SIZES.contains(size)) throw new IllegalArgumentException("bad size " + size);
                if (shots < 1 || shots > 4) throw new IllegalArgumentException("shots must be 1..4");
                if (milk == null || milk.isBlank()) throw new IllegalArgumentException("milk required");
                this.size = size;
                this.shots = shots;
                this.milk = milk;
            }

            @Override
            public String toString() { return size + " / " + shots + " shot(s) / " + milk; }

            public static void main(String[] args) {
                System.out.println(new Coffee());            // M / 1 shot(s) / none
                System.out.println(new Coffee("L"));         // L / 1 shot(s) / none
                System.out.println(new Coffee("S", 2, "oat")); // S / 2 shot(s) / oat
                try { new Coffee("XL"); } catch (IllegalArgumentException e) { System.out.println(e.getMessage()); } // bad size XL
            }
        }`,
        alt: [{ lang: 'python', code: `class Coffee:\n    SIZES = {"S", "M", "L"}\n    # Python has no overloading: default arguments play the role of chained constructors\n    def __init__(self, size="M", shots=1, milk="none"):\n        if size not in Coffee.SIZES:\n            raise ValueError(f"bad size {size}")\n        if not 1 <= shots <= 4:\n            raise ValueError("shots must be 1..4")\n        if not milk.strip():\n            raise ValueError("milk required")\n        self.size, self.shots, self.milk = size, shots, milk\n    def __repr__(self):\n        return f"{self.size} / {self.shots} shot(s) / {self.milk}"\n\nprint(Coffee(), Coffee("L"), Coffee("S", 2, "oat"))\ntry:\n    Coffee("XL")\nexcept ValueError as e:\n    print(e)`, run: true }],
        dry: { head: ['call', 'chain', 'checks', 'result'], rows: [
          ['new Coffee()', 'Coffee() → Coffee("M") → Coffee("M",1) → Coffee("M",1,"none")', 'all pass', 'M / 1 / none'],
          ['new Coffee("L")', 'Coffee("L") → Coffee("L",1) → Coffee("L",1,"none")', 'all pass', 'L / 1 / none'],
          ['new Coffee("XL")', 'Coffee("XL") → Coffee("XL",1) → Coffee("XL",1,"none")', '<span class="c-r">size fails</span>', 'IllegalArgumentException'],
          ['new Coffee("S",9)', 'Coffee("S",9) → Coffee("S",9,"none")', '<span class="c-r">shots fails</span>', 'IllegalArgumentException']
        ] },
        complexity: `<p>O(1) per construction (a Set.of lookup is constant time). Chaining adds a couple of extra method frames, which the JIT inlines; there is no measurable cost.</p>`,
        followUps: ['Add a size "XL": how many lines change now?', 'Replace the four constructors with a builder. When is that worth it?', 'Turn Coffee into a record with a compact constructor']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4: The this keyword
     ====================================================================== */
  var T4_CODE = [
    'class Student {',
    '    String name;',
    '    int marks;',
    '    Student(String name, int marks) {',
    '        name = name;          // BUG: parameter = parameter',
    '        this.marks = marks;   // field = parameter',
    '    }',
    '}',
    'Student s = new Student("Asha", 91);',
    'System.out.println(s.name + " " + s.marks);'
  ].join('\n');

  topics.push({
    title: 'The this Keyword',
    analogy: `<p>In a group chat, when you write <b>"me"</b>, everyone knows it means <i>whoever typed the message</i>. The same word "me" refers to different people depending on who says it. <code>this</code> is an object saying <b>"me"</b>: inside a method, <code>this</code> means <i>the very object the method was called on</i>. When <code>rex.bark()</code> runs, <code>this</code> is Rex; when <code>bella.bark()</code> runs, the same code says <code>this</code> and means Bella.</p>`,
    explain: `<p>Every instance method and constructor receives a hidden extra parameter: a reference to the current object. Its name is <code>this</code>. You have been using it all along without typing it: inside a method, a plain <code>name</code> really means <code>this.name</code> whenever no local variable called <code>name</code> exists.</p>
<h4>The five jobs of <code>this</code></h4>
${H.table(['Job', 'Code', 'Why'], [
  ['1. Separate a field from a parameter with the same name', '<code>this.name = name;</code>', 'the parameter <b>shadows</b> (hides) the field'],
  ['2. Call another constructor', '<code>this("medium", 0);</code>', 'constructor chaining (previous topic)'],
  ['3. Return the current object', '<code>return this;</code>', 'enables fluent chains: <code>sb.append("a").append("b")</code>'],
  ['4. Pass the current object somewhere', '<code>registry.add(this);</code>', 'let another object know about me'],
  ['5. Reach the outer object from an inner class', '<code>Outer.this.count</code>', 'inner class has two "me"s']
])}
<h4>1. Shadowing, the bug everyone writes once</h4>
<p>Inside <code>Student(String name, int marks)</code>, the word <code>name</code> means the <b>parameter</b>, because the closest declaration wins. So <code>name = name;</code> copies the parameter into itself and leaves the field at its default <code>null</code>. It compiles without error (IDEs warn). <code>this.name = name;</code> says "the field of this object gets the parameter".</p>
${H.table(['Expression inside the constructor', 'Refers to'], [['<code>name</code>', 'the parameter (closest scope)'], ['<code>this.name</code>', 'the field of the object being built']])}
<h4>2. Fluent methods with <code>return this</code></h4>
<p>If a method changes the object and returns <code>this</code>, callers can chain calls on one line: <code>cart.add("pen").add("book").checkout()</code>. Every call returns the <b>same</b> object, so no copies are made. <code>StringBuilder</code>, builders, and many configuration APIs work this way.</p>
<h4>3. Where <code>this</code> does NOT exist</h4>
<ul>
<li><b>Static methods</b> (including <code>main</code>) belong to the class, not to an object, so there is no "me". Using <code>this</code> there is a compile error: <i>non-static variable this cannot be referenced from a static context</i>.</li>
<li>You can never assign to it: <code>this = other;</code> is a compile error. <code>this</code> is never <code>null</code> inside an instance method.</li>
</ul>
<h4>4. <code>this</code> in lambdas vs anonymous classes</h4>
<p>Inside a <b>lambda</b>, <code>this</code> means the enclosing object (lambdas do not create a new "me"). Inside an <b>anonymous class</b>, <code>this</code> means the anonymous object itself; use <code>Outer.this</code> to reach the enclosing one.</p>
<h4>5. Passing <code>this</code> safely</h4>
<p>Passing <code>this</code> to others is normal in methods (<code>button.addListener(this)</code>), but doing it <b>inside a constructor</b> lets the outside world see an object whose constructor has not finished: <b>this-escape</b>. Prefer a static factory that constructs fully, then registers.</p>`,
    clues: [
      '"Why is my field null even though I pass the value in the constructor?" → shadowing: name = name instead of this.name = name',
      '"Support method chaining" / "fluent API" / "builder" → mutate then <code>return this</code>',
      '"non-static variable this cannot be referenced from a static context" → using this (or a field) inside main/static method',
      '"Access the outer class field from an inner class with the same name" → <code>Outer.this.field</code>',
      '"Object published before construction finished" / "this escape" → never hand out this or start threads in a constructor',
      '"Compare this object with another of the same class" → <code>this.x == other.x</code>, often in equals/compareTo'
    ],
    code: [`
      class Counter {
          private int count;
          private final String label;

          Counter(String label) {
              this.label = label;              // job 1: field vs parameter
          }

          Counter increment() {
              this.count++;                    // 'this.' is optional here (no shadowing)
              return this;                     // job 3: return me for chaining
          }

          Counter add(int count) {
              this.count += count;             // here 'this.' is REQUIRED: the parameter shadows the field
              return this;
          }

          boolean isBiggerThan(Counter other) {
              return this.count > other.count; // 'this' vs another object of the same class
          }

          void registerWith(List<Counter> registry) {
              registry.add(this);              // job 4: hand myself to someone else
          }

          @Override
          public String toString() { return label + "=" + count; }
      }

      public class Main {
          public static void main(String[] args) {
              Counter a = new Counter("a").increment().increment().add(10);   // fluent chain on ONE object
              Counter b = new Counter("b").add(5);
              List<Counter> all = new ArrayList<>();
              a.registerWith(all);
              b.registerWith(all);
              System.out.println(all + " " + a.isBiggerThan(b));   // [a=12, b=5] true
              // System.out.println(this);  // ERROR: no 'this' in static main
          }
      }`, `
      class Outer {
          int value = 1;
          class Inner {
              int value = 2;
              void show() {
                  int value = 3;
                  System.out.println(value);            // 3  local
                  System.out.println(this.value);       // 2  Inner's field
                  System.out.println(Outer.this.value); // 1  enclosing Outer's field
              }
          }
          public static void main(String[] args) {
              Outer o = new Outer();
              Outer.Inner in = o.new Inner();
              in.show();
          }
      }`],
    codeTitle: ['this for shadowing, chaining, comparing and registering', 'Three different "value"s: local, this, Outer.this'],
    viz: [
      {
        title: 'The shadowing bug: name = name',
        gen: function () {
          return steps(T4_CODE, [
            { l: 9, n: '<code>new Student("Asha", 91)</code>: the object is allocated at #301 with defaults (name=null, marks=0).', v: { s: '(not yet assigned)' }, h: [['#301 Student', 'name=null, marks=0']], hh: { '#301 Student': 'ok' }, o: '' },
            { l: 4, n: 'The constructor frame gets <b>three</b> slots: the hidden <code>this</code> (&rarr; #301) plus the parameters <code>name</code> and <code>marks</code>. Note: a parameter named <code>name</code> now <b>shadows</b> the field <code>name</code>.', fr: 'Student(name, marks)', v: { 'this': '→ #301', name: '"Asha"', marks: 91 }, vh: { 'this': 'sel' }, h: [['#301 Student', 'name=null, marks=0']], o: '' },
            { l: 5, c: 'bad', n: '<code>name = name;</code> Both sides resolve to the closest declaration: the <b>parameter</b>. It copies "Asha" into itself. The field on the heap is never touched!', fr: 'Student(name, marks)', v: { 'this': '→ #301', name: '"Asha"', marks: 91 }, vh: { name: 'bad' }, h: [['#301 Student', 'name=null, marks=0']], hh: { '#301 Student': 'bad' }, o: '' },
            { l: 6, c: 'ok', n: '<code>this.marks = marks;</code> The left side follows <code>this</code> to #301 and writes the <b>field</b>; the right side is the parameter. This one works.', fr: 'Student(name, marks)', v: { 'this': '→ #301', name: '"Asha"', marks: 91 }, vh: { 'this': 'ok' }, h: [['#301 Student', 'name=null, marks=91']], hh: { '#301 Student': 'cur' }, o: '' },
            { l: 9, n: 'The constructor returns; its frame (with the parameter "Asha") is discarded. The only place "Asha" was stored is gone. <code>s</code> now points at #301.', v: { s: '→ #301' }, vh: { s: 'ok' }, h: [['#301 Student', 'name=null, marks=91']], o: '' },
            { l: 10, c: 'bad', n: 'Output: <b>null 91</b>. The fix is one word: <code>this.name = name;</code>. Turn on the IDE/compiler lint "assignment to itself" and it will flag this instantly.', v: { s: '→ #301' }, h: [['#301 Student', 'name=null, marks=91']], hh: { '#301 Student': 'bad' }, o: 'null 91' }
          ]);
        }
      },
      {
        title: 'return this: one object, a chain of calls',
        input: 'add 5, times 3, minus 2, times 10',
        inputLabel: 'Operations: add N / minus N / times N, comma separated (max 8)',
        gen: function (input) {
          var raw = String(input === undefined ? 'add 5, times 3, minus 2, times 10' : input).split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(function (s) { return s; });
          if (!raw.length || raw.length > 8) throw new Error('Give 1 to 8 operations, e.g. add 5, times 3');
          var ops = raw.map(function (s) {
            var m = /^(add|minus|times)\s+(-?\d{1,4})$/.exec(s);
            if (!m) throw new Error('Bad operation "' + s + '". Use add N, minus N or times N (N up to 4 digits)');
            return { op: m[1], n: parseInt(m[2], 10) };
          });
          var chain = 'new Calc()' + ops.map(function (o) { return '.' + o.op + '(' + o.n + ')'; }).join('');
          var code = ['class Calc {', '    private long value;', '    Calc add(long n)   { value += n; return this; }', '    Calc minus(long n) { value -= n; return this; }', '    Calc times(long n) { value *= n; return this; }', '    long result() { return value; }', '}', 'long r = ' + chain + '.result();'].join('\n');
          var line = { add: 3, minus: 4, times: 5 }, v = 0, list = [];
          list.push({ l: 8, n: 'Evaluate left to right. First <code>new Calc()</code> creates ONE object at #401 with value 0.', v: { 'current reference': '#401' }, h: [['#401 Calc', 'value=0']], hh: { '#401 Calc': 'ok' }, o: '' });
          ops.forEach(function (o) {
            var before = v;
            v = o.op === 'add' ? v + o.n : o.op === 'minus' ? v - o.n : v * o.n;
            list.push({ l: line[o.op], n: '<code>.' + o.op + '(' + o.n + ')</code> runs with <code>this</code> = #401. value: ' + before + ' &rarr; <b>' + v + '</b>. Then <code>return this</code> hands back the <b>same</b> reference #401, so the next call in the chain targets the same object.', fr: o.op + '()', v: { 'this': '→ #401', n: o.n, 'returns': '#401 (this)' }, vh: { 'returns': 'sel' }, h: [['#401 Calc', 'value=' + v]], hh: { '#401 Calc': 'cur' }, o: '' });
          });
          if (ops.length < 2) list.push({ l: 8, n: 'Only one call so far. Add more operations to see the chain grow: every call still targets the same object #401, because each method returns <code>this</code>.', v: { 'current reference': '#401' }, h: [['#401 Calc', 'value=' + v]], o: '' });
          list.push({ l: [6, 8], n: '<code>.result()</code> reads the field. No copies were made along the way: ' + ops.length + ' method calls, <b>1</b> object. r = <b>' + v + '</b>.', v: { r: v }, vh: { r: 'ok' }, h: [['#401 Calc', 'value=' + v]], hh: { '#401 Calc': 'sel' }, o: 'r = ' + v });
          return steps(code, list);
        }
      }
    ],
    examples: [
      { title: 'this is the same object, seen from inside', html: `<p>Print <code>this</code> inside a method and the variable outside: they show the same identity hash. That proves <code>this</code> is not a copy, it is the caller\'s object.</p>`, code: `
        class Me {
            void whoAmI() { System.out.println("inside:  " + System.identityHashCode(this)); }
            public static void main(String[] args) {
                Me m = new Me();
                System.out.println("outside: " + System.identityHashCode(m));
                m.whoAmI();   // same number as "outside"
            }
        }` },
      { title: 'Static context has no this', html: `<p>A very common beginner error: writing <code>count++</code> directly in <code>main</code> when <code>count</code> is an instance field. <code>main</code> is static: there is no current object, so there is no <code>this.count</code>. Fix: create an object and use it, or make the field static if it truly belongs to the class.</p>`, code: `
        class Game {
            int score;                       // instance field
            public static void main(String[] args) {
                // score++;                  // ERROR: non-static variable score cannot be referenced from a static context
                Game g = new Game();
                g.score++;                   // OK: we now have an object
                System.out.println(g.score); // 1
            }
        }` },
      { title: 'this inside a lambda vs anonymous class', html: `<p>Lambda bodies share the enclosing <code>this</code>; anonymous classes introduce their own. Output below: <code>Host</code> then <code>anon</code>.</p>`, code: `
        class Host {
            @Override public String toString() { return "Host"; }
            void demo() {
                Runnable lambda = () -> System.out.println(this);          // the Host
                Runnable anon = new Runnable() {
                    @Override public void run() { System.out.println(this); } // the anonymous object
                    @Override public String toString() { return "anon"; }
                };
                lambda.run();
                anon.run();
            }
            public static void main(String[] args) { new Host().demo(); }
        }` },
      { title: 'this-escape: a listener sees a half-built object', html: `<p>If a constructor calls <code>bus.register(this)</code> before setting its fields, and the bus immediately calls back (or another thread does), the callback sees <code>null</code>/0 fields. Since JDK 21, <code>javac -Xlint:this-escape</code> warns about this. Fix: register from a static factory after construction.</p>`, code: `
        class Listener {
            private final String name;
            private Listener(String name) { this.name = name; }      // no escape here
            static Listener create(String name, List<Listener> bus) {
                Listener l = new Listener(name);   // fully constructed first
                bus.add(l);                        // then published
                return l;
            }
        }` }
    ],
    deepDive: `<p><b>Where <code>this</code> lives.</b> In bytecode, every instance method and constructor receives the receiver object in <b>local variable slot 0</b>; parameters start at slot 1. <code>this.name</code> compiles to <code>aload_0</code> + <code>getfield</code>. Static methods have no slot-0 receiver, which is exactly why <code>this</code> is illegal there. That is also why calling an instance method on <code>null</code> throws NPE: the receiver is null-checked at the call (<code>invokevirtual</code>).</p>
<p><b>Name resolution order.</b> For a simple name, Java looks in: the innermost block (locals, parameters), then the fields of the current class (and inherited ones), then enclosing classes, then static imports. A local or parameter <b>shadows</b> a field; a field in an inner class shadows an outer field; <code>this.</code> and <code>Outer.this.</code> let you jump past the shadowing.</p>
<p><b>this-escape and the Java Memory Model.</b> Fields are only guaranteed visible to other threads after construction if they are <code>final</code> and <code>this</code> did not escape during construction (JLS 17.5 "final field semantics"). If you leak <code>this</code> early (register a listener, start a thread, put it in a static map), another thread can see default values even for final fields. JDK 21 added the <code>this-escape</code> lint to catch the common case where a constructor calls an overridable method or passes <code>this</code> to unknown code.</p>
<p><b>Fluent APIs: mutable vs immutable.</b> <code>return this</code> mutates and returns the same object (StringBuilder, builders). Immutable fluent APIs (<code>String.trim().toUpperCase()</code>, <code>LocalDate.plusDays(1)</code>) return <b>new</b> objects; forgetting to use the return value (<code>date.plusDays(1);</code> alone) is a classic bug, and modern tools flag it with <code>@CheckReturnValue</code>.</p>
<p><b>equals idiom.</b> <code>if (this == o) return true;</code> is the first line of most <code>equals</code> methods: a cheap identity shortcut before comparing fields.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated constructors almost always use <code>this.x = x</code> correctly, so the classic shadowing bug now shows up mainly in hand-edited code or after an AI renames a parameter during refactoring. Meanwhile AI loves generating fluent builders; you must decide whether the fluent object should be mutable (<code>return this</code>) or immutable (return a new copy).</p>
<p><b>Use AI as a partner:</b> <code>"Find every place in this class where a parameter shadows a field and the field is not assigned"</code>, or <code>"Does any constructor here let 'this' escape? Show the line and a safe refactor."</code> Ask it to explain <code>this</code> in a lambda vs an anonymous class, then verify with the tiny program above.</p>
<p><b>Where AI goes wrong:</b> suggesting <code>this</code> inside a static helper it just extracted; registering listeners in constructors (this-escape) in UI and event-bus code; and mixing up which object <code>this</code> refers to inside nested anonymous classes. <b>What you must still own:</b> name resolution and shadowing rules, the static-context rule, and recognising this-escape, which is a real concurrency bug, not just style.</p>`,
    problems: [{
      title: 'Fluent Point: Fix Shadowing and Enable Chaining',
      level: 'Easy', tags: ['this', 'fluent API', 'shadowing'], companies: ['Zoho', 'Paytm', 'Oracle'],
      statement: `<p>A teammate wrote this class and is confused because every point prints as <code>(0, 0)</code> and chaining does not compile:</p>
<pre>class Point {
    int x, y;
    Point(int x, int y) { x = x; y = y; }
    void translate(int dx, int dy) { x += dx; y += dy; }
}
new Point(1, 2).translate(2, 2).translate(-1, 0);   // does not compile</pre>
<p>Fix the class so that the constructor stores its values, <code>translate</code> can be chained, and add <code>boolean sameAs(Point other)</code> and <code>double distanceTo(Point other)</code>.</p>`,
      constraints: `Coordinates fit in int. Use <code>this</code> where it is required and explain where it is optional.`,
      example: `<p><code>new Point(1, 2).translate(2, 2).translate(-1, 0)</code> → ${H.c('g', '(2, 4)')}. Why? (1,2) + (2,2) = (3,4), then + (-1,0) = (2,4), all on the <b>same</b> object because translate returns <code>this</code>. <code>distanceTo(new Point(5, 8))</code> → √(3² + 4²) = ${H.c('g', '5.0')}.</p>`,
      brute: {
        why: `<p>The original constructor assigns each parameter to itself (shadowing), so fields stay 0. And <code>translate</code> returns <code>void</code>, so <code>.translate(...)</code> cannot be called on its result. Making a fresh Point after every move would "work" but wastes objects and still leaves the constructor bug.</p>`,
        code: `
        class PointBroken {
            int x, y;
            PointBroken(int x, int y) { x = x; y = y; }        // fields stay 0
            void translate(int dx, int dy) { x += dx; y += dy; }  // void: no chaining
            public static void main(String[] args) {
                PointBroken p = new PointBroken(1, 2);
                p.translate(2, 2);
                p.translate(-1, 0);
                System.out.println("(" + p.x + ", " + p.y + ")");  // prints (1, 2): it started from (0, 0), not (1, 2)
            }
        }`
      },
      mcq: { q: 'Why does <code>x = x;</code> in the constructor leave the field at 0?', options: ['Both sides mean the parameter, which shadows the field', 'ints cannot be assigned in constructors', 'The field is final', 'The JVM ignores constructor assignments'], answer: 0, explain: 'The closest declaration wins. Inside the constructor, x is the parameter; this.x is the field.' },
      hints: [
        `<p>Hint 1: Inside the constructor there are two different things called x. Which one does a bare <code>x</code> refer to? Use <code>this.x</code> for the field.</p>`,
        `<p>Hint 2: For chaining, <code>translate</code> must return a Point. Which Point? The one it was called on: <code>return this;</code></p>`,
        `<p>Hint 3: In <code>sameAs</code> and <code>distanceTo</code> there is no shadowing, so <code>this.</code> is optional, but writing <code>this.x - other.x</code> reads clearly. Use <code>Math.hypot(dx, dy)</code> for distance (avoids overflow of dx*dx with large ints).</p>`
      ],
      tests: { sig: 'int int int int int int int int -> double[]', fn: 'ptCheck', cmp: 'float',
        harness: { java: `class Check { static double[] ptCheck(int x, int y, int dx1, int dy1, int dx2, int dy2, int ox, int oy) { Point p = new Point(x, y); Point q = p.translate(dx1, dy1).translate(dx2, dy2); Point o = new Point(ox, oy); return new double[]{q.x, q.y, q.distanceTo(o), q.sameAs(o) ? 1 : 0, q == p ? 1 : 0}; } }`, python: `def pt_check(x, y, dx1, dy1, dx2, dy2, ox, oy):
    p = Point(x, y)
    q = p.translate(dx1, dy1).translate(dx2, dy2)
    o = Point(ox, oy)
    return [q.x, q.y, q.distance_to(o), 1 if q.same_as(o) else 0, 1 if q is p else 0]
` }, cases: [
        [[1,2,2,2,-1,0,5,8],[2,4,5,0,1]],
        [[0,0,0,0,0,0,0,0],[0,0,0,1,1]],
        [[0,0,3,4,0,0,0,0],[3,4,5,0,1]],
        [[1,1,1,1,1,1,3,3],[3,3,0,1,1]],
        [[-5,-5,5,5,0,0,0,0],[0,0,0,1,1]],
        [[0,0,1,0,0,1,1,1],[1,1,0,1,1]],
        [[1000000,1000000,-1000000,-1000000,0,0,0,0],[0,0,0,1,1]],
        [[2147483647,2147483647,0,0,0,0,-2147483648,-2147483648],[2147483647,2147483647,6074000998.537887,0,1]],
        [[-2147483648,0,0,0,0,0,2147483647,0],[-2147483648,0,4294967295,0,1]],
        [[3,4,0,0,0,0,3,5],[3,4,1,0,1]],
        [[-3,4,6,-8,0,0,3,-4],[3,-4,0,1,1]]
      ] },
      solution: {
        approach: `<p>Use <code>this.x = x</code> to separate field from parameter. Make translate return <code>this</code> after mutating so calls chain on one object. Comparison methods read <code>this</code>\'s fields and the other point\'s fields.</p>`,
        code: `
        class Point {
            int x, y;

            Point(int x, int y) {
                this.x = x;              // REQUIRED: parameter shadows the field
                this.y = y;
            }

            Point translate(int dx, int dy) {
                x += dx;                 // no shadowing: same as this.x += dx
                y += dy;
                return this;             // hand back the same object for chaining
            }

            boolean sameAs(Point other) {
                return other != null && this.x == other.x && this.y == other.y;
            }

            double distanceTo(Point other) {
                return Math.hypot((double) this.x - other.x, (double) this.y - other.y);
            }

            @Override
            public String toString() { return "(" + x + ", " + y + ")"; }

            public static void main(String[] args) {
                Point p = new Point(1, 2).translate(2, 2).translate(-1, 0);
                System.out.println(p);                              // (2, 4)
                System.out.println(p.distanceTo(new Point(5, 8)));  // 5.0
                System.out.println(p.sameAs(new Point(2, 4)));      // true
            }
        }`,
        alt: [{ lang: 'python', code: `class Point:\n    def __init__(self, x, y):\n        self.x, self.y = x, y      # self is Python's explicit 'this'\n    def translate(self, dx, dy):\n        self.x += dx; self.y += dy\n        return self\n    def same_as(self, o):\n        return o is not None and self.x == o.x and self.y == o.y\n    def distance_to(self, o):\n        import math\n        return math.hypot(self.x - o.x, self.y - o.y)\n    def __repr__(self):\n        return f"({self.x}, {self.y})"\n\np = Point(1, 2).translate(2, 2).translate(-1, 0)\nprint(p, p.distance_to(Point(5, 8)))`, run: true }],
        dry: { head: ['call', 'this →', 'x', 'y', 'returns'], rows: [
          ['new Point(1, 2)', '#1', '1', '2', 'ref #1'],
          ['.translate(2, 2)', '#1', '3', '4', 'this (#1)'],
          ['.translate(-1, 0)', '#1', '2', '4', 'this (#1)'],
          ['.distanceTo((5,8))', '#1', '2', '4', '<span class="c-g">hypot(-3,-4) = 5.0</span>']
        ] },
        complexity: `<p>All methods O(1). Chaining creates no extra objects: one Point for the whole chain.</p>`,
        followUps: ['Make Point immutable: translate returns a NEW point. How does the chain change?', 'Replace sameAs with a proper equals/hashCode pair', 'Why is Math.hypot safer than Math.sqrt(dx*dx + dy*dy) with ints?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5: static fields, static methods, static blocks
     ====================================================================== */
  var T5_CLASS_INIT = [
    'class Config {',
    '    static final int MAX = 10;                 // compile-time constant',
    '    static Map<String, String> settings = new HashMap<>();',
    '    static {                                   // static block',
    '        System.out.println("Config loading...");',
    '        settings.put("env", "prod");',
    '    }',
    '    static String get(String k) { return settings.get(k); }',
    '}',
    '// main:',
    'System.out.println("start");',
    'System.out.println(Config.MAX);            // constant',
    'Config[] arr = new Config[3];              // array type',
    'System.out.println(Config.get("env"));     // static method',
    'System.out.println(Config.get("env"));     // again'
  ].join('\n');

  topics.push({
    title: 'static: Fields, Methods & Blocks',
    analogy: `<p>Think of a classroom. Each student has their <b>own notebook</b> (instance fields): writing in yours does not change mine. But there is <b>one whiteboard</b> on the wall that belongs to the classroom itself (static fields): everyone sees the same board, and if one student writes "Test on Friday", everybody sees it. The whiteboard exists even when no students are in the room. The <b>static block</b> is the janitor who sets up the whiteboard once, the very first time the room is opened.</p>`,
    explain: `<p><code>static</code> means <b>"belongs to the class, not to any one object"</b>. Everything else (no <code>static</code>) is an <b>instance</b> member: one per object.</p>
<h4>1. Instance vs static at a glance</h4>
${H.table(['', 'Instance member', 'static member'], [
  ['How many copies?', 'one per object', '<b>one per class</b> (shared by all objects)'],
  ['Exists when?', 'after <code>new</code>', 'as soon as the class is initialised, even with zero objects'],
  ['How to access', '<code>obj.field</code>, <code>obj.method()</code>', '<code>ClassName.field</code>, <code>ClassName.method()</code>'],
  ['Has <code>this</code>?', 'yes', '<b>no</b>'],
  ['Typical use', 'state of one thing (my balance)', 'counters, constants, caches, utility functions, factories']
])}
<h4>2. Static fields: one shared copy</h4>
<p><code>static int count;</code> in a <code>Ticket</code> class is <b>one</b> variable for all tickets. Increment it in the constructor and it counts how many tickets were ever created. Constants are written <code>static final</code> in UPPER_SNAKE_CASE: <code>static final double GST_RATE = 0.18;</code></p>
<h4>3. Static methods: no object needed</h4>
<p><code>Math.max(3, 7)</code>, <code>Integer.parseInt("42")</code>, <code>Arrays.sort(a)</code>: you never create a Math object. A static method:</p>
<ul>
<li>can use static fields and call other static methods directly;</li>
<li><b>cannot</b> use instance fields or <code>this</code> directly (whose fields would they be?). It can, of course, use an object you pass in or create: <code>obj.field</code>;</li>
<li>cannot be <b>overridden</b>. A subclass method with the same signature <b>hides</b> it, and the call is picked by the <b>compile-time type</b> (java04 goes deeper).</li>
</ul>
<p><code>main</code> is static so the JVM can call it without creating an object first.</p>
<h4>4. Static blocks: one-time setup</h4>
<p>A <code>static { ... }</code> block runs <b>once</b>, when the class is <b>initialised</b> (its first active use), together with static field initializers, top to bottom in source order. Use it when a static field needs more than one expression to set up, such as filling a lookup table.</p>
<h4>5. When does a class get initialised?</h4>
${H.table(['Action', 'Initialises the class?'], [
  ['<code>new Config()</code>', '<span class="c-g">yes</span>'],
  ['calling a static method <code>Config.get()</code>', '<span class="c-g">yes</span>'],
  ['reading/writing a non-constant static field', '<span class="c-g">yes</span>'],
  ['initialising a subclass', '<span class="c-g">yes</span> (parent first)'],
  ['reading a compile-time constant <code>static final int MAX = 10</code>', '<span class="c-r">no</span> (value is copied into the caller at compile time)'],
  ['creating an array <code>new Config[3]</code>', '<span class="c-r">no</span>'],
  ['<code>Kid.p</code> where <code>p</code> is declared in Parent', 'only <b>Parent</b>, not Kid']
])}
<h4>6. Static is powerful and dangerous</h4>
<p>A static mutable field is a <b>global variable</b>: any code anywhere can change it, tests leak state into each other, and multiple threads can corrupt it (<code>count++</code> is not atomic). Use static for constants, pure helper functions and carefully guarded shared resources. Keep mutable state in objects.</p>`,
    clues: [
      '"Count how many objects have been created" / "generate unique sequential IDs" → static counter incremented in the constructor',
      '"Utility/helper class" (like Math) → private constructor + static methods',
      '"non-static method cannot be referenced from a static context" → calling an instance method from main without an object',
      '"Load configuration once" / "precompute a lookup table" → static block or static final field',
      '"Can we override a static method?" → no, it is hidden; resolved by the reference\'s compile-time type',
      '"Why does Class.forName(\'com.mysql...Driver\') register the driver?" → it triggers the class\'s static initializer'
    ],
    code: [`
      class Ticket {
          // ---- class-level (static): ONE copy shared by every Ticket ----
          static final String PREFIX = "TKT-";       // constant
          private static int nextNumber = 1001;       // shared counter
          private static int issued;                  // how many tickets exist

          // ---- per-object (instance): every Ticket has its own ----
          private final String code;
          private final String passenger;

          Ticket(String passenger) {
              this.passenger = passenger;
              this.code = PREFIX + nextNumber++;      // read shared value, then bump it for the next ticket
              issued++;
          }

          static int issuedCount() {                  // static: no 'this', only static data
              return issued;
              // return passenger;   // ERROR: non-static variable passenger cannot be referenced from a static context
          }

          String describe() {                         // instance method can use BOTH kinds
              return code + " for " + passenger + " (" + issued + " issued so far)";
          }
      }

      public class Main {
          public static void main(String[] args) {
              System.out.println(Ticket.issuedCount());                 // 0: no object needed
              Ticket a = new Ticket("Asha");
              Ticket b = new Ticket("Ben");
              System.out.println(a.describe());   // TKT-1001 for Asha (2 issued so far)
              System.out.println(b.describe());   // TKT-1002 for Ben (2 issued so far)
              System.out.println(Ticket.issuedCount());                 // 2
          }
      }`, `
      // A proper utility class: static methods only, cannot be instantiated
      final class MathUtils {
          private MathUtils() {                        // blocks 'new MathUtils()'
              throw new AssertionError("no instances");
          }

          static final Map<Character, Integer> ROMAN;  // filled once in a static block
          static {
              Map<Character, Integer> m = new HashMap<>();
              m.put('I', 1); m.put('V', 5); m.put('X', 10); m.put('L', 50);
              m.put('C', 100); m.put('D', 500); m.put('M', 1000);
              ROMAN = Collections.unmodifiableMap(m);  // freeze it
          }

          static int gcd(int a, int b) { return b == 0 ? Math.abs(a) : gcd(b, a % b); }

          static int romanToInt(String s) {
              int total = 0;
              for (int i = 0; i < s.length(); i++) {
                  int v = ROMAN.get(s.charAt(i));
                  boolean smallerBeforeBigger = i + 1 < s.length() && v < ROMAN.get(s.charAt(i + 1));
                  total += smallerBeforeBigger ? -v : v;
              }
              return total;
          }

          public static void main(String[] args) {
              System.out.println(gcd(84, 36) + " " + romanToInt("MCMXCIV"));   // 12 1994
          }
      }`],
    codeTitle: ['Static counter + constant + static method next to instance members', 'Utility class: private constructor, static block, static methods'],
    viz: [
      {
        title: 'One shared counter, many objects',
        input: '4',
        inputLabel: 'How many Tickets to create? (1 to 6)',
        gen: function (input) {
          var n = clampInt(input, 4, 1, 6, 'Enter a whole number from 1 to 6');
          var code = ['class Ticket {', '    static int nextId = 1001;   // ONE copy, in the class', '    static int issued = 0;      // ONE copy, in the class', '    final int id;               // one per object', '    Ticket() {', '        id = nextId++;', '        issued++;', '    }', '}', 'for (int i = 0; i < ' + n + '; i++) list.add(new Ticket());', 'System.out.println(Ticket.issued);'].join('\n');
          var list = [], heap = [], nextId = 1001, issued = 0;
          list.push({ l: [2, 3], n: 'The class is initialised on first use. Its static fields are created <b>once</b>, outside any object: nextId = 1001, issued = 0. There are still <b>zero</b> Ticket objects.', st: { 'Ticket.nextId': nextId, 'Ticket.issued': issued }, sh: { 'Ticket.nextId': 'ok', 'Ticket.issued': 'ok' }, h: [], o: '' });
          for (var i = 0; i < n; i++) {
            var addr = '#' + (501 + i) + ' Ticket';
            heap.push([addr, 'id=0']);
            var hh = {}; hh[addr] = 'ok';
            list.push({ l: 10, n: 'Iteration ' + (i + 1) + ': <code>new Ticket()</code> creates object ' + addr.split(' ')[0] + '. It gets its own <code>id</code> field (default 0), but <b>no copy</b> of nextId or issued.', st: { 'Ticket.nextId': nextId, 'Ticket.issued': issued }, h: heap.map(function (e) { return e.slice(); }), hh: hh, o: '' });
            var got = nextId; nextId++;
            heap[i] = [addr, 'id=' + got];
            var hh2 = {}; hh2[addr] = 'cur';
            list.push({ l: 6, n: '<code>id = nextId++</code>: read the <b>shared</b> value ' + got + ' into this object\'s id, then bump the shared counter to ' + nextId + '. Every object sees that bump.', st: { 'Ticket.nextId': nextId, 'Ticket.issued': issued }, sh: { 'Ticket.nextId': 'cur' }, h: heap.map(function (e) { return e.slice(); }), hh: hh2, o: '' });
            issued++;
            list.push({ l: 7, n: '<code>issued++</code> updates the one shared counter: ' + issued + ' ticket(s) so far.', st: { 'Ticket.nextId': nextId, 'Ticket.issued': issued }, sh: { 'Ticket.issued': 'cur' }, h: heap.map(function (e) { return e.slice(); }), o: '' });
          }
          list.push({ l: 11, n: 'Read the static field through the <b>class name</b>. ' + n + ' objects, each with a unique id, and still exactly <b>one</b> nextId and one issued. (If two threads did this at once, <code>nextId++</code> could hand out duplicates: use <code>AtomicInteger</code>.)', st: { 'Ticket.nextId': nextId, 'Ticket.issued': issued }, sh: { 'Ticket.issued': 'sel' }, h: heap.map(function (e) { return e.slice(); }), o: String(issued) });
          return steps(code, list);
        }
      },
      {
        title: 'When does the static block run? (class initialisation triggers)',
        gen: function () {
          var notInit = { 'Config initialised?': 'no' }, init = { 'Config initialised?': 'YES', 'Config.settings': '{env=prod}' };
          return steps(T5_CLASS_INIT, [
            { l: 11, n: 'main prints "start". Config has not been touched, so it is <b>not initialised</b>: its static block has not run.', st: notInit, o: 'start' },
            { l: 12, n: '<code>Config.MAX</code> is a <b>compile-time constant</b> (static final primitive with a constant value). javac copied the number 10 straight into main\'s bytecode, so Config is <b>still not initialised</b>.', st: notInit, sh: { 'Config initialised?': 'cur' }, o: 'start\n10' },
            { l: 13, n: '<code>new Config[3]</code> creates an <b>array</b> object of 3 null slots. That is not a use of Config itself: <b>no</b> initialisation.', st: notInit, h: [['#601 Config[]', '[null, null, null]']], o: 'start\n10' },
            { l: 14, n: 'Calling a <b>static method</b> is an active use. Before <code>get</code> runs, the JVM initialises Config...', st: notInit, sh: { 'Config initialised?': 'cur' }, h: [['#601 Config[]', '[null, null, null]']], o: 'start\n10' },
            { l: [3, 4, 5, 6], n: '...running static initializers <b>top to bottom</b>: create the HashMap (line 3), then the static block prints and fills it. This happens <b>exactly once</b>, guarded by a JVM lock so it is thread-safe.', st: init, sh: { 'Config initialised?': 'ok', 'Config.settings': 'ok' }, h: [['#601 Config[]', '[null, null, null]'], ['#602 HashMap', '{env=prod}']], hh: { '#602 HashMap': 'ok' }, o: 'start\n10\nConfig loading...' },
            { l: [8, 14], n: 'Now <code>get("env")</code> runs and returns "prod".', st: init, h: [['#601 Config[]', '[null, null, null]'], ['#602 HashMap', '{env=prod}']], o: 'start\n10\nConfig loading...\nprod' },
            { l: 15, n: 'Second call: the class is already initialised, so the static block does <b>not</b> run again. Final output has "Config loading..." only once.', st: init, sh: { 'Config initialised?': 'done' }, h: [['#601 Config[]', '[null, null, null]'], ['#602 HashMap', '{env=prod}']], o: 'start\n10\nConfig loading...\nprod\nprod' }
          ]);
        }
      }
    ],
    examples: [
      { title: 'Calling a static method through a null reference', html: `<p>Static calls are bound to the <b>class</b> at compile time, so <code>Util u = null; u.hello();</code> prints <b>hello static</b> with no NullPointerException. It compiles (with a warning: "static method should be accessed in a static way"). Interviewers love this one. Never write it in real code: always use <code>Util.hello()</code>.</p>`, code: `
        class Util {
            static void hello() { System.out.println("hello static"); }
            public static void main(String[] args) {
                Util u = null;
                u.hello();          // hello static (no NPE)
            }
        }` },
      { title: 'Static vs instance counter side by side', html: `<p>Each object increments both counters in its constructor. After three objects, every object\'s <code>instanceCount</code> is <b>1</b> (each started from its own 0) but the shared <code>staticCount</code> is <b>3</b>.</p>
${H.table(['object', 'instanceCount', 'staticCount (shared)'], [['#1', '1', '1 → 2 → 3'], ['#2', '1', 'same variable'], ['#3', '1', 'same variable']])}`, code: `
        class Both {
            static int staticCount;
            int instanceCount;
            Both() { staticCount++; instanceCount++; }
            public static void main(String[] args) {
                Both a = new Both(), b = new Both(), c = new Both();
                System.out.println(a.instanceCount + " " + c.instanceCount + " " + Both.staticCount); // 1 1 3
            }
        }` },
      { title: 'Thread-safe static counter', html: `<p><code>nextId++</code> is three steps (read, add, write). Two threads can read the same value and hand out the same id. For shared counters use <code>AtomicInteger</code> (lock-free compare-and-swap) or <code>synchronized</code>.</p>`, code: `
        class IdGen {
            private static final AtomicInteger NEXT = new AtomicInteger(1);
            static int nextId() { return NEXT.getAndIncrement(); }   // safe under concurrency
        }` },
      { title: 'Static import', html: `<p><code>import static java.lang.Math.*;</code> lets you write <code>sqrt(x)</code> and <code>PI</code> without the <code>Math.</code> prefix. Handy in maths-heavy code and tests (<code>assertEquals</code>), but overuse hides where names come from.</p>`, code: `
        import static java.lang.Math.PI;
        import static java.lang.Math.sqrt;
        class Circle {
            static double area(double r) { return PI * r * r; }
            static double sideOfEqualSquare(double r) { return sqrt(area(r)); }
        }` }
    ],
    deepDive: `<p><b>Where statics live.</b> Since JDK 8, class metadata (method bytecode, field layout, constant pool) lives in <b>Metaspace</b> (native memory), while static field <b>values</b> live inside the class\'s <code>java.lang.Class</code> mirror object on the <b>heap</b>. So a <code>static List</code> holding millions of objects is ordinary heap that the GC can never free while the class is loaded: the #1 classic Java memory leak (static caches, static listener lists).</p>
<p><b>Class initialisation is lazy and thread-safe.</b> The JVM runs <code>&lt;clinit&gt;</code> (all static initializers and static blocks, in textual order) on first active use, holding a per-class initialisation lock (JLS 12.4.2). Other threads wanting the class wait until it finishes. This guarantee powers the <b>initialisation-on-demand holder</b> singleton: <code>private static class Holder { static final Service INSTANCE = new Service(); }</code> creates the instance lazily, exactly once, with no explicit locking. The flip side: two classes whose static initializers wait on each other from two threads can <b>deadlock</b>, and if <code>&lt;clinit&gt;</code> throws, the class is marked erroneous: the first access gets <code>ExceptionInInitializerError</code>, later ones get <code>NoClassDefFoundError</code>.</p>
<p><b>Constants are inlined.</b> A <code>static final</code> primitive or String initialised with a constant expression is copied into every class that uses it at compile time. If you change the constant in a library and do not recompile the callers, they keep the <b>old value</b>. That is a real production gotcha with shared constant JARs.</p>
<p><b>Static methods and dispatch.</b> Static calls compile to <code>invokestatic</code>, bound at compile time, which is why they cannot be overridden and why a null receiver does not matter. The JIT inlines them easily. "Static hiding" means <code>Parent p = new Child(); p.staticMethod()</code> calls Parent\'s version.</p>
<p><b>Design view.</b> Static state makes unit tests order-dependent and blocks dependency injection. Modern code keeps statics to constants, pure functions, and factories, and passes collaborators through constructors.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants reach for <code>static</code> whenever a compile error says "cannot be referenced from a static context", because making everything static silences it. That "fix" turns per-object state into global state. Recognise that pattern instantly in AI-suggested diffs.</p>
<p><b>Use AI as a partner:</b> <code>"List all static mutable fields in this codebase, and for each say whether it is thread-safe and whether it can leak memory."</code> Or ask it to convert a static-heavy utility into an injectable service with an interface, so it can be mocked in tests.</p>
<p><b>Where AI goes wrong:</b> generating <code>static int counter; counter++</code> in multithreaded servers; double-checked locking singletons without <code>volatile</code>; caches in <code>static HashMap</code> with no eviction (memory leak); claiming static fields live in "PermGen" (gone since Java 8). <b>What you must still own:</b> the instance-vs-static mental model, the class initialisation triggers (classic output questions), and the judgement to keep mutable state out of statics.</p>`,
    problems: [{
      title: 'Unique Order IDs with a Static Counter',
      level: 'Easy', tags: ['static', 'counter', 'class design'], companies: ['Amazon', 'Zomato', 'Uber'],
      statement: `<p>Every <code>Order</code> must receive a unique, sequential id starting at <b>1</b> when it is created, and the class must report how many orders exist via <code>Order.count()</code> without needing any Order object. Also expose a constant <code>Order.MAX_ITEMS = 50</code>, and reject orders with more items.</p>`,
      constraints: `Single-threaded for now. Ids never repeat and never go backwards. <code>count()</code> must be callable before any order exists.`,
      example: `<p>Create orders with 3, 7 and 2 items → ids ${H.c('g', '1, 2, 3')}; <code>Order.count()</code> → ${H.c('g', '3')}. Creating one with 60 items → ${H.c('r', 'IllegalArgumentException')} and the count stays 3 (the id counter must not be consumed by a rejected order).</p>`,
      brute: {
        why: `<p>Putting the counter in an <b>instance</b> field gives every new object its own fresh counter starting at 0, so every order gets id 1. The counter must be shared by all orders, which is exactly what <code>static</code> means. Also, incrementing before validating would burn ids on rejected orders.</p>`,
        code: `
        class OrderBroken {
            private int counter = 0;          // instance field: a NEW counter per object
            final int id;
            OrderBroken(int items) {
                counter++;
                id = counter;                 // always 1
            }
            public static void main(String[] args) {
                System.out.println(new OrderBroken(3).id + " " + new OrderBroken(7).id);   // 1 1
            }
        }`
      },
      mcq: { q: 'Where should the counter that hands out ids live?', options: ['In a private static field of Order', 'In an instance field of each Order', 'In a local variable in the constructor', 'In main'], answer: 0, explain: 'All orders must share one counter, so it must be a class-level (static) field. Instance fields are per object; locals die when the constructor returns.' },
      hints: [
        `<p>Hint 1: Ask "how many copies of this variable should exist?" The id: one per order (instance). The next-id counter: one for the whole class (static).</p>`,
        `<p>Hint 2: <code>count()</code> must work without an object, so it is a <code>static</code> method that returns a static field.</p>`,
        `<p>Hint 3: Validate first, then take the id: <code>if (items &gt; MAX_ITEMS) throw ...; id = ++created;</code>. That way a rejected order consumes nothing. Make the counter private so no one can reset it from outside.</p>`
      ],
      tests: { sig: 'int[] -> string', fn: 'orderCheck',
        harness: { java: `class Check { static Class<?> fresh(String n) throws Exception { return new java.net.URLClassLoader(new java.net.URL[]{ new java.io.File(System.getProperty("java.class.path")).toURI().toURL() }, null).loadClass(n); } static String orderCheck(int[] items) throws Exception { Class<?> c = fresh("Order"); java.lang.reflect.Constructor<?> k = c.getDeclaredConstructor(int.class); k.setAccessible(true); java.lang.reflect.Method id = c.getDeclaredMethod("id"); id.setAccessible(true); java.lang.reflect.Method cnt = c.getDeclaredMethod("count"); cnt.setAccessible(true); java.lang.reflect.Field mx = c.getDeclaredField("MAX_ITEMS"); mx.setAccessible(true); StringBuilder sb = new StringBuilder(); for (int n : items) { if (sb.length() > 0) sb.append(','); try { sb.append(id.invoke(k.newInstance(n))); } catch (java.lang.reflect.InvocationTargetException e) { sb.append(e.getCause() instanceof IllegalArgumentException ? "R" : "?"); } } return "max=" + mx.get(null) + " ids=" + sb + " count=" + cnt.invoke(null); } }`, python: `def order_check(items):
    Order._created = 0
    ids = []
    for n in items:
        try:
            ids.append(str(Order(n).id))
        except ValueError:
            ids.append("R")
    return "max=%d ids=%s count=%d" % (Order.MAX_ITEMS, ",".join(ids), Order.count())
` }, cases: [
        [[[3,7,2,60]],"max=50 ids=1,2,3,R count=3"],
        [[[]],"max=50 ids= count=0"],
        [[[1]],"max=50 ids=1 count=1"],
        [[[50]],"max=50 ids=1 count=1"],
        [[[0]],"max=50 ids=R count=0"],
        [[[51]],"max=50 ids=R count=0"],
        [[[-1,5,51,5,0,5]],"max=50 ids=R,1,R,2,R,3 count=3"],
        [[[2147483647,-2147483648]],"max=50 ids=R,R count=0"],
        [[[1,50,51,0,25]],"max=50 ids=1,2,R,R,3 count=3"],
        [[{"$rep":1,"n":10000}],"max=50 ids=1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,256,257,258,259,260,261,262,263,264,265,266,267,268,269,270,271,272,273,274,275,276,277,278,279,280,281,282,283,284,285,286,287,288,289,290,291,292,293,294,295,296,297,298,299,300,301,302,303,304,305,306,307,308,309,310,311,312,313,314,315,316,317,318,319,320,321,322,323,324,325,326,327,328,329,330,331,332,333,334,335,336,337,338,339,340,341,342,343,344,345,346,347,348,349,350,351,352,353,354,355,356,357,358,359,360,361,362,363,364,365,366,367,368,369,370,371,372,373,374,375,376,377,378,379,380,381,382,383,384,385,386,387,388,389,390,391,392,393,394,395,396,397,398,399,400,401,402,403,404,405,406,407,408,409,410,411,412,413,414,415,416,417,418,419,420,421,422,423,424,425,426,427,428,429,430,431,432,433,434,435,436,437,438,439,440,441,442,443,444,445,446,447,448,449,450,451,452,453,454,455,456,457,458,459,460,461,462,463,464,465,466,467,468,469,470,471,472,473,474,475,476,477,478,479,480,481,482,483,484,485,486,487,488,489,490,491,492,493,494,495,496,497,498,499,500,501,502,503,504,505,506,507,508,509,510,511,512,513,514,515,516,517,518,519,520,521,522,523,524,525,526,527,528,529,530,531,532,533,534,535,536,537,538,539,540,541,542,543,544,545,546,547,548,549,550,551,552,553,554,555,556,557,558,559,560,561,562,563,564,565,566,567,568,569,570,571,572,573,574,575,576,577,578,579,580,581,582,583,584,585,586,587,588,589,590,591,592,593,594,595,596,597,598,599,600,601,602,603,604,605,606,607,608,609,610,611,612,613,614,615,616,617,618,619,620,621,622,623,624,625,626,627,628,629,630,631,632,633,634,635,636,637,638,639,640,641,642,643,644,645,646,647,648,649,650,651,652,653,654,655,656,657,658,659,660,661,662,663,664,665,666,667,668,669,670,671,672,673,674,675,676,677,678,679,680,681,682,683,684,685,686,687,688,689,690,691,692,693,694,695,696,697,698,699,700,701,702,703,704,705,706,707,708,709,710,711,712,713,714,715,716,717,718,719,720,721,722,723,724,725,726,727,728,729,730,731,732,733,734,735,736,737,738,739,740,741,742,743,744,745,746,747,748,749,750,751,752,753,754,755,756,757,758,759,760,761,762,763,764,765,766,767,768,769,770,771,772,773,774,775,776,777,778,779,780,781,782,783,784,785,786,787,788,789,790,791,792,793,794,795,796,797,798,799,800,801,802,803,804,805,806,807,808,809,810,811,812,813,814,815,816,817,818,819,820,821,822,823,824,825,826,827,828,829,830,831,832,833,834,835,836,837,838,839,840,841,842,843,844,845,846,847,848,849,850,851,852,853,854,855,856,857,858,859,860,861,862,863,864,865,866,867,868,869,870,871,872,873,874,875,876,877,878,879,880,881,882,883,884,885,886,887,888,889,890,891,892,893,894,895,896,897,898,899,900,901,902,903,904,905,906,907,908,909,910,911,912,913,914,915,916,917,918,919,920,921,922,923,924,925,926,927,928,929,930,931,932,933,934,935,936,937,938,939,940,941,942,943,944,945,946,947,948,949,950,951,952,953,954,955,956,957,958,959,960,961,962,963,964,965,966,967,968,969,970,971,972,973,974,975,976,977,978,979,980,981,982,983,984,985,986,987,988,989,990,991,992,993,994,995,996,997,998,999,1000,1001,1002,1003,1004,1005,1006,1007,1008,1009,1010,1011,1012,1013,1014,1015,1016,1017,1018,1019,1020,1021,1022,1023,1024,1025,1026,1027,1028,1029,1030,1031,1032,1033,1034,1035,1036,1037,1038,1039,1040,1041,1042,1043,1044,1045,1046,1047,1048,1049,1050,1051,1052,1053,1054,1055,1056,1057,1058,1059,1060,1061,1062,1063,1064,1065,1066,1067,1068,1069,1070,1071,1072,1073,1074,1075,1076,1077,1078,1079,1080,1081,1082,1083,1084,1085,1086,1087,1088,1089,1090,1091,1092,1093,1094,1095,1096,1097,1098,1099,1100,1101,1102,1103,1104,1105,1106,1107,1108,1109,1110,1111,1112,1113,1114,1115,1116,1117,1118,1119,1120,1121,1122,1123,1124,1125,1126,1127,1128,1129,1130,1131,1132,1133,1134,1135,1136,1137,1138,1139,1140,1141,1142,1143,1144,1145,1146,1147,1148,1149,1150,1151,1152,1153,1154,1155,1156,1157,1158,1159,1160,1161,1162,1163,1164,1165,1166,1167,1168,1169,1170,1171,1172,1173,1174,1175,1176,1177,1178,1179,1180,1181,1182,1183,1184,1185,1186,1187,1188,1189,1190,1191,1192,1193,1194,1195,1196,1197,1198,1199,1200,1201,1202,1203,1204,1205,1206,1207,1208,1209,1210,1211,1212,1213,1214,1215,1216,1217,1218,1219,1220,1221,1222,1223,1224,1225,1226,1227,1228,1229,1230,1231,1232,1233,1234,1235,1236,1237,1238,1239,1240,1241,1242,1243,1244,1245,1246,1247,1248,1249,1250,1251,1252,1253,1254,1255,1256,1257,1258,1259,1260,1261,1262,1263,1264,1265,1266,1267,1268,1269,1270,1271,1272,1273,1274,1275,1276,1277,1278,1279,1280,1281,1282,1283,1284,1285,1286,1287,1288,1289,1290,1291,1292,1293,1294,1295,1296,1297,1298,1299,1300,1301,1302,1303,1304,1305,1306,1307,1308,1309,1310,1311,1312,1313,1314,1315,1316,1317,1318,1319,1320,1321,1322,1323,1324,1325,1326,1327,1328,1329,1330,1331,1332,1333,1334,1335,1336,1337,1338,1339,1340,1341,1342,1343,1344,1345,1346,1347,1348,1349,1350,1351,1352,1353,1354,1355,1356,1357,1358,1359,1360,1361,1362,1363,1364,1365,1366,1367,1368,1369,1370,1371,1372,1373,1374,1375,1376,1377,1378,1379,1380,1381,1382,1383,1384,1385,1386,1387,1388,1389,1390,1391,1392,1393,1394,1395,1396,1397,1398,1399,1400,1401,1402,1403,1404,1405,1406,1407,1408,1409,1410,1411,1412,1413,1414,1415,1416,1417,1418,1419,1420,1421,1422,1423,1424,1425,1426,1427,1428,1429,1430,1431,1432,1433,1434,1435,1436,1437,1438,1439,1440,1441,1442,1443,1444,1445,1446,1447,1448,1449,1450,1451,1452,1453,1454,1455,1456,1457,1458,1459,1460,1461,1462,1463,1464,1465,1466,1467,1468,1469,1470,1471,1472,1473,1474,1475,1476,1477,1478,1479,1480,1481,1482,1483,1484,1485,1486,1487,1488,1489,1490,1491,1492,1493,1494,1495,1496,1497,1498,1499,1500,1501,1502,1503,1504,1505,1506,1507,1508,1509,1510,1511,1512,1513,1514,1515,1516,1517,1518,1519,1520,1521,1522,1523,1524,1525,1526,1527,1528,1529,1530,1531,1532,1533,1534,1535,1536,1537,1538,1539,1540,1541,1542,1543,1544,1545,1546,1547,1548,1549,1550,1551,1552,1553,1554,1555,1556,1557,1558,1559,1560,1561,1562,1563,1564,1565,1566,1567,1568,1569,1570,1571,1572,1573,1574,1575,1576,1577,1578,1579,1580,1581,1582,1583,1584,1585,1586,1587,1588,1589,1590,1591,1592,1593,1594,1595,1596,1597,1598,1599,1600,1601,1602,1603,1604,1605,1606,1607,1608,1609,1610,1611,1612,1613,1614,1615,1616,1617,1618,1619,1620,1621,1622,1623,1624,1625,1626,1627,1628,1629,1630,1631,1632,1633,1634,1635,1636,1637,1638,1639,1640,1641,1642,1643,1644,1645,1646,1647,1648,1649,1650,1651,1652,1653,1654,1655,1656,1657,1658,1659,1660,1661,1662,1663,1664,1665,1666,1667,1668,1669,1670,1671,1672,1673,1674,1675,1676,1677,1678,1679,1680,1681,1682,1683,1684,1685,1686,1687,1688,1689,1690,1691,1692,1693,1694,1695,1696,1697,1698,1699,1700,1701,1702,1703,1704,1705,1706,1707,1708,1709,1710,1711,1712,1713,1714,1715,1716,1717,1718,1719,1720,1721,1722,1723,1724,1725,1726,1727,1728,1729,1730,1731,1732,1733,1734,1735,1736,1737,1738,1739,1740,1741,1742,1743,1744,1745,1746,1747,1748,1749,1750,1751,1752,1753,1754,1755,1756,1757,1758,1759,1760,1761,1762,1763,1764,1765,1766,1767,1768,1769,1770,1771,1772,1773,1774,1775,1776,1777,1778,1779,1780,1781,1782,1783,1784,1785,1786,1787,1788,1789,1790,1791,1792,1793,1794,1795,1796,1797,1798,1799,1800,1801,1802,1803,1804,1805,1806,1807,1808,1809,1810,1811,1812,1813,1814,1815,1816,1817,1818,1819,1820,1821,1822,1823,1824,1825,1826,1827,1828,1829,1830,1831,1832,1833,1834,1835,1836,1837,1838,1839,1840,1841,1842,1843,1844,1845,1846,1847,1848,1849,1850,1851,1852,1853,1854,1855,1856,1857,1858,1859,1860,1861,1862,1863,1864,1865,1866,1867,1868,1869,1870,1871,1872,1873,1874,1875,1876,1877,1878,1879,1880,1881,1882,1883,1884,1885,1886,1887,1888,1889,1890,1891,1892,1893,1894,1895,1896,1897,1898,1899,1900,1901,1902,1903,1904,1905,1906,1907,1908,1909,1910,1911,1912,1913,1914,1915,1916,1917,1918,1919,1920,1921,1922,1923,1924,1925,1926,1927,1928,1929,1930,1931,1932,1933,1934,1935,1936,1937,1938,1939,1940,1941,1942,1943,1944,1945,1946,1947,1948,1949,1950,1951,1952,1953,1954,1955,1956,1957,1958,1959,1960,1961,1962,1963,1964,1965,1966,1967,1968,1969,1970,1971,1972,1973,1974,1975,1976,1977,1978,1979,1980,1981,1982,1983,1984,1985,1986,1987,1988,1989,1990,1991,1992,1993,1994,1995,1996,1997,1998,1999,2000,2001,2002,2003,2004,2005,2006,2007,2008,2009,2010,2011,2012,2013,2014,2015,2016,2017,2018,2019,2020,2021,2022,2023,2024,2025,2026,2027,2028,2029,2030,2031,2032,2033,2034,2035,2036,2037,2038,2039,2040,2041,2042,2043,2044,2045,2046,2047,2048,2049,2050,2051,2052,2053,2054,2055,2056,2057,2058,2059,2060,2061,2062,2063,2064,2065,2066,2067,2068,2069,2070,2071,2072,2073,2074,2075,2076,2077,2078,2079,2080,2081,2082,2083,2084,2085,2086,2087,2088,2089,2090,2091,2092,2093,2094,2095,2096,2097,2098,2099,2100,2101,2102,2103,2104,2105,2106,2107,2108,2109,2110,2111,2112,2113,2114,2115,2116,2117,2118,2119,2120,2121,2122,2123,2124,2125,2126,2127,2128,2129,2130,2131,2132,2133,2134,2135,2136,2137,2138,2139,2140,2141,2142,2143,2144,2145,2146,2147,2148,2149,2150,2151,2152,2153,2154,2155,2156,2157,2158,2159,2160,2161,2162,2163,2164,2165,2166,2167,2168,2169,2170,2171,2172,2173,2174,2175,2176,2177,2178,2179,2180,2181,2182,2183,2184,2185,2186,2187,2188,2189,2190,2191,2192,2193,2194,2195,2196,2197,2198,2199,2200,2201,2202,2203,2204,2205,2206,2207,2208,2209,2210,2211,2212,2213,2214,2215,2216,2217,2218,2219,2220,2221,2222,2223,2224,2225,2226,2227,2228,2229,2230,2231,2232,2233,2234,2235,2236,2237,2238,2239,2240,2241,2242,2243,2244,2245,2246,2247,2248,2249,2250,2251,2252,2253,2254,2255,2256,2257,2258,2259,2260,2261,2262,2263,2264,2265,2266,2267,2268,2269,2270,2271,2272,2273,2274,2275,2276,2277,2278,2279,2280,2281,2282,2283,2284,2285,2286,2287,2288,2289,2290,2291,2292,2293,2294,2295,2296,2297,2298,2299,2300,2301,2302,2303,2304,2305,2306,2307,2308,2309,2310,2311,2312,2313,2314,2315,2316,2317,2318,2319,2320,2321,2322,2323,2324,2325,2326,2327,2328,2329,2330,2331,2332,2333,2334,2335,2336,2337,2338,2339,2340,2341,2342,2343,2344,2345,2346,2347,2348,2349,2350,2351,2352,2353,2354,2355,2356,2357,2358,2359,2360,2361,2362,2363,2364,2365,2366,2367,2368,2369,2370,2371,2372,2373,2374,2375,2376,2377,2378,2379,2380,2381,2382,2383,2384,2385,2386,2387,2388,2389,2390,2391,2392,2393,2394,2395,2396,2397,2398,2399,2400,2401,2402,2403,2404,2405,2406,2407,2408,2409,2410,2411,2412,2413,2414,2415,2416,2417,2418,2419,2420,2421,2422,2423,2424,2425,2426,2427,2428,2429,2430,2431,2432,2433,2434,2435,2436,2437,2438,2439,2440,2441,2442,2443,2444,2445,2446,2447,2448,2449,2450,2451,2452,2453,2454,2455,2456,2457,2458,2459,2460,2461,2462,2463,2464,2465,2466,2467,2468,2469,2470,2471,2472,2473,2474,2475,2476,2477,2478,2479,2480,2481,2482,2483,2484,2485,2486,2487,2488,2489,2490,2491,2492,2493,2494,2495,2496,2497,2498,2499,2500,2501,2502,2503,2504,2505,2506,2507,2508,2509,2510,2511,2512,2513,2514,2515,2516,2517,2518,2519,2520,2521,2522,2523,2524,2525,2526,2527,2528,2529,2530,2531,2532,2533,2534,2535,2536,2537,2538,2539,2540,2541,2542,2543,2544,2545,2546,2547,2548,2549,2550,2551,2552,2553,2554,2555,2556,2557,2558,2559,2560,2561,2562,2563,2564,2565,2566,2567,2568,2569,2570,2571,2572,2573,2574,2575,2576,2577,2578,2579,2580,2581,2582,2583,2584,2585,2586,2587,2588,2589,2590,2591,2592,2593,2594,2595,2596,2597,2598,2599,2600,2601,2602,2603,2604,2605,2606,2607,2608,2609,2610,2611,2612,2613,2614,2615,2616,2617,2618,2619,2620,2621,2622,2623,2624,2625,2626,2627,2628,2629,2630,2631,2632,2633,2634,2635,2636,2637,2638,2639,2640,2641,2642,2643,2644,2645,2646,2647,2648,2649,2650,2651,2652,2653,2654,2655,2656,2657,2658,2659,2660,2661,2662,2663,2664,2665,2666,2667,2668,2669,2670,2671,2672,2673,2674,2675,2676,2677,2678,2679,2680,2681,2682,2683,2684,2685,2686,2687,2688,2689,2690,2691,2692,2693,2694,2695,2696,2697,2698,2699,2700,2701,2702,2703,2704,2705,2706,2707,2708,2709,2710,2711,2712,2713,2714,2715,2716,2717,2718,2719,2720,2721,2722,2723,2724,2725,2726,2727,2728,2729,2730,2731,2732,2733,2734,2735,2736,2737,2738,2739,2740,2741,2742,2743,2744,2745,2746,2747,2748,2749,2750,2751,2752,2753,2754,2755,2756,2757,2758,2759,2760,2761,2762,2763,2764,2765,2766,2767,2768,2769,2770,2771,2772,2773,2774,2775,2776,2777,2778,2779,2780,2781,2782,2783,2784,2785,2786,2787,2788,2789,2790,2791,2792,2793,2794,2795,2796,2797,2798,2799,2800,2801,2802,2803,2804,2805,2806,2807,2808,2809,2810,2811,2812,2813,2814,2815,2816,2817,2818,2819,2820,2821,2822,2823,2824,2825,2826,2827,2828,2829,2830,2831,2832,2833,2834,2835,2836,2837,2838,2839,2840,2841,2842,2843,2844,2845,2846,2847,2848,2849,2850,2851,2852,2853,2854,2855,2856,2857,2858,2859,2860,2861,2862,2863,2864,2865,2866,2867,2868,2869,2870,2871,2872,2873,2874,2875,2876,2877,2878,2879,2880,2881,2882,2883,2884,2885,2886,2887,2888,2889,2890,2891,2892,2893,2894,2895,2896,2897,2898,2899,2900,2901,2902,2903,2904,2905,2906,2907,2908,2909,2910,2911,2912,2913,2914,2915,2916,2917,2918,2919,2920,2921,2922,2923,2924,2925,2926,2927,2928,2929,2930,2931,2932,2933,2934,2935,2936,2937,2938,2939,2940,2941,2942,2943,2944,2945,2946,2947,2948,2949,2950,2951,2952,2953,2954,2955,2956,2957,2958,2959,2960,2961,2962,2963,2964,2965,2966,2967,2968,2969,2970,2971,2972,2973,2974,2975,2976,2977,2978,2979,2980,2981,2982,2983,2984,2985,2986,2987,2988,2989,2990,2991,2992,2993,2994,2995,2996,2997,2998,2999,3000,3001,3002,3003,3004,3005,3006,3007,3008,3009,3010,3011,3012,3013,3014,3015,3016,3017,3018,3019,3020,3021,3022,3023,3024,3025,3026,3027,3028,3029,3030,3031,3032,3033,3034,3035,3036,3037,3038,3039,3040,3041,3042,3043,3044,3045,3046,3047,3048,3049,3050,3051,3052,3053,3054,3055,3056,3057,3058,3059,3060,3061,3062,3063,3064,3065,3066,3067,3068,3069,3070,3071,3072,3073,3074,3075,3076,3077,3078,3079,3080,3081,3082,3083,3084,3085,3086,3087,3088,3089,3090,3091,3092,3093,3094,3095,3096,3097,3098,3099,3100,3101,3102,3103,3104,3105,3106,3107,3108,3109,3110,3111,3112,3113,3114,3115,3116,3117,3118,3119,3120,3121,3122,3123,3124,3125,3126,3127,3128,3129,3130,3131,3132,3133,3134,3135,3136,3137,3138,3139,3140,3141,3142,3143,3144,3145,3146,3147,3148,3149,3150,3151,3152,3153,3154,3155,3156,3157,3158,3159,3160,3161,3162,3163,3164,3165,3166,3167,3168,3169,3170,3171,3172,3173,3174,3175,3176,3177,3178,3179,3180,3181,3182,3183,3184,3185,3186,3187,3188,3189,3190,3191,3192,3193,3194,3195,3196,3197,3198,3199,3200,3201,3202,3203,3204,3205,3206,3207,3208,3209,3210,3211,3212,3213,3214,3215,3216,3217,3218,3219,3220,3221,3222,3223,3224,3225,3226,3227,3228,3229,3230,3231,3232,3233,3234,3235,3236,3237,3238,3239,3240,3241,3242,3243,3244,3245,3246,3247,3248,3249,3250,3251,3252,3253,3254,3255,3256,3257,3258,3259,3260,3261,3262,3263,3264,3265,3266,3267,3268,3269,3270,3271,3272,3273,3274,3275,3276,3277,3278,3279,3280,3281,3282,3283,3284,3285,3286,3287,3288,3289,3290,3291,3292,3293,3294,3295,3296,3297,3298,3299,3300,3301,3302,3303,3304,3305,3306,3307,3308,3309,3310,3311,3312,3313,3314,3315,3316,3317,3318,3319,3320,3321,3322,3323,3324,3325,3326,3327,3328,3329,3330,3331,3332,3333,3334,3335,3336,3337,3338,3339,3340,3341,3342,3343,3344,3345,3346,3347,3348,3349,3350,3351,3352,3353,3354,3355,3356,3357,3358,3359,3360,3361,3362,3363,3364,3365,3366,3367,3368,3369,3370,3371,3372,3373,3374,3375,3376,3377,3378,3379,3380,3381,3382,3383,3384,3385,3386,3387,3388,3389,3390,3391,3392,3393,3394,3395,3396,3397,3398,3399,3400,3401,3402,3403,3404,3405,3406,3407,3408,3409,3410,3411,3412,3413,3414,3415,3416,3417,3418,3419,3420,3421,3422,3423,3424,3425,3426,3427,3428,3429,3430,3431,3432,3433,3434,3435,3436,3437,3438,3439,3440,3441,3442,3443,3444,3445,3446,3447,3448,3449,3450,3451,3452,3453,3454,3455,3456,3457,3458,3459,3460,3461,3462,3463,3464,3465,3466,3467,3468,3469,3470,3471,3472,3473,3474,3475,3476,3477,3478,3479,3480,3481,3482,3483,3484,3485,3486,3487,3488,3489,3490,3491,3492,3493,3494,3495,3496,3497,3498,3499,3500,3501,3502,3503,3504,3505,3506,3507,3508,3509,3510,3511,3512,3513,3514,3515,3516,3517,3518,3519,3520,3521,3522,3523,3524,3525,3526,3527,3528,3529,3530,3531,3532,3533,3534,3535,3536,3537,3538,3539,3540,3541,3542,3543,3544,3545,3546,3547,3548,3549,3550,3551,3552,3553,3554,3555,3556,3557,3558,3559,3560,3561,3562,3563,3564,3565,3566,3567,3568,3569,3570,3571,3572,3573,3574,3575,3576,3577,3578,3579,3580,3581,3582,3583,3584,3585,3586,3587,3588,3589,3590,3591,3592,3593,3594,3595,3596,3597,3598,3599,3600,3601,3602,3603,3604,3605,3606,3607,3608,3609,3610,3611,3612,3613,3614,3615,3616,3617,3618,3619,3620,3621,3622,3623,3624,3625,3626,3627,3628,3629,3630,3631,3632,3633,3634,3635,3636,3637,3638,3639,3640,3641,3642,3643,3644,3645,3646,3647,3648,3649,3650,3651,3652,3653,3654,3655,3656,3657,3658,3659,3660,3661,3662,3663,3664,3665,3666,3667,3668,3669,3670,3671,3672,3673,3674,3675,3676,3677,3678,3679,3680,3681,3682,3683,3684,3685,3686,3687,3688,3689,3690,3691,3692,3693,3694,3695,3696,3697,3698,3699,3700,3701,3702,3703,3704,3705,3706,3707,3708,3709,3710,3711,3712,3713,3714,3715,3716,3717,3718,3719,3720,3721,3722,3723,3724,3725,3726,3727,3728,3729,3730,3731,3732,3733,3734,3735,3736,3737,3738,3739,3740,3741,3742,3743,3744,3745,3746,3747,3748,3749,3750,3751,3752,3753,3754,3755,3756,3757,3758,3759,3760,3761,3762,3763,3764,3765,3766,3767,3768,3769,3770,3771,3772,3773,3774,3775,3776,3777,3778,3779,3780,3781,3782,3783,3784,3785,3786,3787,3788,3789,3790,3791,3792,3793,3794,3795,3796,3797,3798,3799,3800,3801,3802,3803,3804,3805,3806,3807,3808,3809,3810,3811,3812,3813,3814,3815,3816,3817,3818,3819,3820,3821,3822,3823,3824,3825,3826,3827,3828,3829,3830,3831,3832,3833,3834,3835,3836,3837,3838,3839,3840,3841,3842,3843,3844,3845,3846,3847,3848,3849,3850,3851,3852,3853,3854,3855,3856,3857,3858,3859,3860,3861,3862,3863,3864,3865,3866,3867,3868,3869,3870,3871,3872,3873,3874,3875,3876,3877,3878,3879,3880,3881,3882,3883,3884,3885,3886,3887,3888,3889,3890,3891,3892,3893,3894,3895,3896,3897,3898,3899,3900,3901,3902,3903,3904,3905,3906,3907,3908,3909,3910,3911,3912,3913,3914,3915,3916,3917,3918,3919,3920,3921,3922,3923,3924,3925,3926,3927,3928,3929,3930,3931,3932,3933,3934,3935,3936,3937,3938,3939,3940,3941,3942,3943,3944,3945,3946,3947,3948,3949,3950,3951,3952,3953,3954,3955,3956,3957,3958,3959,3960,3961,3962,3963,3964,3965,3966,3967,3968,3969,3970,3971,3972,3973,3974,3975,3976,3977,3978,3979,3980,3981,3982,3983,3984,3985,3986,3987,3988,3989,3990,3991,3992,3993,3994,3995,3996,3997,3998,3999,4000,4001,4002,4003,4004,4005,4006,4007,4008,4009,4010,4011,4012,4013,4014,4015,4016,4017,4018,4019,4020,4021,4022,4023,4024,4025,4026,4027,4028,4029,4030,4031,4032,4033,4034,4035,4036,4037,4038,4039,4040,4041,4042,4043,4044,4045,4046,4047,4048,4049,4050,4051,4052,4053,4054,4055,4056,4057,4058,4059,4060,4061,4062,4063,4064,4065,4066,4067,4068,4069,4070,4071,4072,4073,4074,4075,4076,4077,4078,4079,4080,4081,4082,4083,4084,4085,4086,4087,4088,4089,4090,4091,4092,4093,4094,4095,4096,4097,4098,4099,4100,4101,4102,4103,4104,4105,4106,4107,4108,4109,4110,4111,4112,4113,4114,4115,4116,4117,4118,4119,4120,4121,4122,4123,4124,4125,4126,4127,4128,4129,4130,4131,4132,4133,4134,4135,4136,4137,4138,4139,4140,4141,4142,4143,4144,4145,4146,4147,4148,4149,4150,4151,4152,4153,4154,4155,4156,4157,4158,4159,4160,4161,4162,4163,4164,4165,4166,4167,4168,4169,4170,4171,4172,4173,4174,4175,4176,4177,4178,4179,4180,4181,4182,4183,4184,4185,4186,4187,4188,4189,4190,4191,4192,4193,4194,4195,4196,4197,4198,4199,4200,4201,4202,4203,4204,4205,4206,4207,4208,4209,4210,4211,4212,4213,4214,4215,4216,4217,4218,4219,4220,4221,4222,4223,4224,4225,4226,4227,4228,4229,4230,4231,4232,4233,4234,4235,4236,4237,4238,4239,4240,4241,4242,4243,4244,4245,4246,4247,4248,4249,4250,4251,4252,4253,4254,4255,4256,4257,4258,4259,4260,4261,4262,4263,4264,4265,4266,4267,4268,4269,4270,4271,4272,4273,4274,4275,4276,4277,4278,4279,4280,4281,4282,4283,4284,4285,4286,4287,4288,4289,4290,4291,4292,4293,4294,4295,4296,4297,4298,4299,4300,4301,4302,4303,4304,4305,4306,4307,4308,4309,4310,4311,4312,4313,4314,4315,4316,4317,4318,4319,4320,4321,4322,4323,4324,4325,4326,4327,4328,4329,4330,4331,4332,4333,4334,4335,4336,4337,4338,4339,4340,4341,4342,4343,4344,4345,4346,4347,4348,4349,4350,4351,4352,4353,4354,4355,4356,4357,4358,4359,4360,4361,4362,4363,4364,4365,4366,4367,4368,4369,4370,4371,4372,4373,4374,4375,4376,4377,4378,4379,4380,4381,4382,4383,4384,4385,4386,4387,4388,4389,4390,4391,4392,4393,4394,4395,4396,4397,4398,4399,4400,4401,4402,4403,4404,4405,4406,4407,4408,4409,4410,4411,4412,4413,4414,4415,4416,4417,4418,4419,4420,4421,4422,4423,4424,4425,4426,4427,4428,4429,4430,4431,4432,4433,4434,4435,4436,4437,4438,4439,4440,4441,4442,4443,4444,4445,4446,4447,4448,4449,4450,4451,4452,4453,4454,4455,4456,4457,4458,4459,4460,4461,4462,4463,4464,4465,4466,4467,4468,4469,4470,4471,4472,4473,4474,4475,4476,4477,4478,4479,4480,4481,4482,4483,4484,4485,4486,4487,4488,4489,4490,4491,4492,4493,4494,4495,4496,4497,4498,4499,4500,4501,4502,4503,4504,4505,4506,4507,4508,4509,4510,4511,4512,4513,4514,4515,4516,4517,4518,4519,4520,4521,4522,4523,4524,4525,4526,4527,4528,4529,4530,4531,4532,4533,4534,4535,4536,4537,4538,4539,4540,4541,4542,4543,4544,4545,4546,4547,4548,4549,4550,4551,4552,4553,4554,4555,4556,4557,4558,4559,4560,4561,4562,4563,4564,4565,4566,4567,4568,4569,4570,4571,4572,4573,4574,4575,4576,4577,4578,4579,4580,4581,4582,4583,4584,4585,4586,4587,4588,4589,4590,4591,4592,4593,4594,4595,4596,4597,4598,4599,4600,4601,4602,4603,4604,4605,4606,4607,4608,4609,4610,4611,4612,4613,4614,4615,4616,4617,4618,4619,4620,4621,4622,4623,4624,4625,4626,4627,4628,4629,4630,4631,4632,4633,4634,4635,4636,4637,4638,4639,4640,4641,4642,4643,4644,4645,4646,4647,4648,4649,4650,4651,4652,4653,4654,4655,4656,4657,4658,4659,4660,4661,4662,4663,4664,4665,4666,4667,4668,4669,4670,4671,4672,4673,4674,4675,4676,4677,4678,4679,4680,4681,4682,4683,4684,4685,4686,4687,4688,4689,4690,4691,4692,4693,4694,4695,4696,4697,4698,4699,4700,4701,4702,4703,4704,4705,4706,4707,4708,4709,4710,4711,4712,4713,4714,4715,4716,4717,4718,4719,4720,4721,4722,4723,4724,4725,4726,4727,4728,4729,4730,4731,4732,4733,4734,4735,4736,4737,4738,4739,4740,4741,4742,4743,4744,4745,4746,4747,4748,4749,4750,4751,4752,4753,4754,4755,4756,4757,4758,4759,4760,4761,4762,4763,4764,4765,4766,4767,4768,4769,4770,4771,4772,4773,4774,4775,4776,4777,4778,4779,4780,4781,4782,4783,4784,4785,4786,4787,4788,4789,4790,4791,4792,4793,4794,4795,4796,4797,4798,4799,4800,4801,4802,4803,4804,4805,4806,4807,4808,4809,4810,4811,4812,4813,4814,4815,4816,4817,4818,4819,4820,4821,4822,4823,4824,4825,4826,4827,4828,4829,4830,4831,4832,4833,4834,4835,4836,4837,4838,4839,4840,4841,4842,4843,4844,4845,4846,4847,4848,4849,4850,4851,4852,4853,4854,4855,4856,4857,4858,4859,4860,4861,4862,4863,4864,4865,4866,4867,4868,4869,4870,4871,4872,4873,4874,4875,4876,4877,4878,4879,4880,4881,4882,4883,4884,4885,4886,4887,4888,4889,4890,4891,4892,4893,4894,4895,4896,4897,4898,4899,4900,4901,4902,4903,4904,4905,4906,4907,4908,4909,4910,4911,4912,4913,4914,4915,4916,4917,4918,4919,4920,4921,4922,4923,4924,4925,4926,4927,4928,4929,4930,4931,4932,4933,4934,4935,4936,4937,4938,4939,4940,4941,4942,4943,4944,4945,4946,4947,4948,4949,4950,4951,4952,4953,4954,4955,4956,4957,4958,4959,4960,4961,4962,4963,4964,4965,4966,4967,4968,4969,4970,4971,4972,4973,4974,4975,4976,4977,4978,4979,4980,4981,4982,4983,4984,4985,4986,4987,4988,4989,4990,4991,4992,4993,4994,4995,4996,4997,4998,4999,5000,5001,5002,5003,5004,5005,5006,5007,5008,5009,5010,5011,5012,5013,5014,5015,5016,5017,5018,5019,5020,5021,5022,5023,5024,5025,5026,5027,5028,5029,5030,5031,5032,5033,5034,5035,5036,5037,5038,5039,5040,5041,5042,5043,5044,5045,5046,5047,5048,5049,5050,5051,5052,5053,5054,5055,5056,5057,5058,5059,5060,5061,5062,5063,5064,5065,5066,5067,5068,5069,5070,5071,5072,5073,5074,5075,5076,5077,5078,5079,5080,5081,5082,5083,5084,5085,5086,5087,5088,5089,5090,5091,5092,5093,5094,5095,5096,5097,5098,5099,5100,5101,5102,5103,5104,5105,5106,5107,5108,5109,5110,5111,5112,5113,5114,5115,5116,5117,5118,5119,5120,5121,5122,5123,5124,5125,5126,5127,5128,5129,5130,5131,5132,5133,5134,5135,5136,5137,5138,5139,5140,5141,5142,5143,5144,5145,5146,5147,5148,5149,5150,5151,5152,5153,5154,5155,5156,5157,5158,5159,5160,5161,5162,5163,5164,5165,5166,5167,5168,5169,5170,5171,5172,5173,5174,5175,5176,5177,5178,5179,5180,5181,5182,5183,5184,5185,5186,5187,5188,5189,5190,5191,5192,5193,5194,5195,5196,5197,5198,5199,5200,5201,5202,5203,5204,5205,5206,5207,5208,5209,5210,5211,5212,5213,5214,5215,5216,5217,5218,5219,5220,5221,5222,5223,5224,5225,5226,5227,5228,5229,5230,5231,5232,5233,5234,5235,5236,5237,5238,5239,5240,5241,5242,5243,5244,5245,5246,5247,5248,5249,5250,5251,5252,5253,5254,5255,5256,5257,5258,5259,5260,5261,5262,5263,5264,5265,5266,5267,5268,5269,5270,5271,5272,5273,5274,5275,5276,5277,5278,5279,5280,5281,5282,5283,5284,5285,5286,5287,5288,5289,5290,5291,5292,5293,5294,5295,5296,5297,5298,5299,5300,5301,5302,5303,5304,5305,5306,5307,5308,5309,5310,5311,5312,5313,5314,5315,5316,5317,5318,5319,5320,5321,5322,5323,5324,5325,5326,5327,5328,5329,5330,5331,5332,5333,5334,5335,5336,5337,5338,5339,5340,5341,5342,5343,5344,5345,5346,5347,5348,5349,5350,5351,5352,5353,5354,5355,5356,5357,5358,5359,5360,5361,5362,5363,5364,5365,5366,5367,5368,5369,5370,5371,5372,5373,5374,5375,5376,5377,5378,5379,5380,5381,5382,5383,5384,5385,5386,5387,5388,5389,5390,5391,5392,5393,5394,5395,5396,5397,5398,5399,5400,5401,5402,5403,5404,5405,5406,5407,5408,5409,5410,5411,5412,5413,5414,5415,5416,5417,5418,5419,5420,5421,5422,5423,5424,5425,5426,5427,5428,5429,5430,5431,5432,5433,5434,5435,5436,5437,5438,5439,5440,5441,5442,5443,5444,5445,5446,5447,5448,5449,5450,5451,5452,5453,5454,5455,5456,5457,5458,5459,5460,5461,5462,5463,5464,5465,5466,5467,5468,5469,5470,5471,5472,5473,5474,5475,5476,5477,5478,5479,5480,5481,5482,5483,5484,5485,5486,5487,5488,5489,5490,5491,5492,5493,5494,5495,5496,5497,5498,5499,5500,5501,5502,5503,5504,5505,5506,5507,5508,5509,5510,5511,5512,5513,5514,5515,5516,5517,5518,5519,5520,5521,5522,5523,5524,5525,5526,5527,5528,5529,5530,5531,5532,5533,5534,5535,5536,5537,5538,5539,5540,5541,5542,5543,5544,5545,5546,5547,5548,5549,5550,5551,5552,5553,5554,5555,5556,5557,5558,5559,5560,5561,5562,5563,5564,5565,5566,5567,5568,5569,5570,5571,5572,5573,5574,5575,5576,5577,5578,5579,5580,5581,5582,5583,5584,5585,5586,5587,5588,5589,5590,5591,5592,5593,5594,5595,5596,5597,5598,5599,5600,5601,5602,5603,5604,5605,5606,5607,5608,5609,5610,5611,5612,5613,5614,5615,5616,5617,5618,5619,5620,5621,5622,5623,5624,5625,5626,5627,5628,5629,5630,5631,5632,5633,5634,5635,5636,5637,5638,5639,5640,5641,5642,5643,5644,5645,5646,5647,5648,5649,5650,5651,5652,5653,5654,5655,5656,5657,5658,5659,5660,5661,5662,5663,5664,5665,5666,5667,5668,5669,5670,5671,5672,5673,5674,5675,5676,5677,5678,5679,5680,5681,5682,5683,5684,5685,5686,5687,5688,5689,5690,5691,5692,5693,5694,5695,5696,5697,5698,5699,5700,5701,5702,5703,5704,5705,5706,5707,5708,5709,5710,5711,5712,5713,5714,5715,5716,5717,5718,5719,5720,5721,5722,5723,5724,5725,5726,5727,5728,5729,5730,5731,5732,5733,5734,5735,5736,5737,5738,5739,5740,5741,5742,5743,5744,5745,5746,5747,5748,5749,5750,5751,5752,5753,5754,5755,5756,5757,5758,5759,5760,5761,5762,5763,5764,5765,5766,5767,5768,5769,5770,5771,5772,5773,5774,5775,5776,5777,5778,5779,5780,5781,5782,5783,5784,5785,5786,5787,5788,5789,5790,5791,5792,5793,5794,5795,5796,5797,5798,5799,5800,5801,5802,5803,5804,5805,5806,5807,5808,5809,5810,5811,5812,5813,5814,5815,5816,5817,5818,5819,5820,5821,5822,5823,5824,5825,5826,5827,5828,5829,5830,5831,5832,5833,5834,5835,5836,5837,5838,5839,5840,5841,5842,5843,5844,5845,5846,5847,5848,5849,5850,5851,5852,5853,5854,5855,5856,5857,5858,5859,5860,5861,5862,5863,5864,5865,5866,5867,5868,5869,5870,5871,5872,5873,5874,5875,5876,5877,5878,5879,5880,5881,5882,5883,5884,5885,5886,5887,5888,5889,5890,5891,5892,5893,5894,5895,5896,5897,5898,5899,5900,5901,5902,5903,5904,5905,5906,5907,5908,5909,5910,5911,5912,5913,5914,5915,5916,5917,5918,5919,5920,5921,5922,5923,5924,5925,5926,5927,5928,5929,5930,5931,5932,5933,5934,5935,5936,5937,5938,5939,5940,5941,5942,5943,5944,5945,5946,5947,5948,5949,5950,5951,5952,5953,5954,5955,5956,5957,5958,5959,5960,5961,5962,5963,5964,5965,5966,5967,5968,5969,5970,5971,5972,5973,5974,5975,5976,5977,5978,5979,5980,5981,5982,5983,5984,5985,5986,5987,5988,5989,5990,5991,5992,5993,5994,5995,5996,5997,5998,5999,6000,6001,6002,6003,6004,6005,6006,6007,6008,6009,6010,6011,6012,6013,6014,6015,6016,6017,6018,6019,6020,6021,6022,6023,6024,6025,6026,6027,6028,6029,6030,6031,6032,6033,6034,6035,6036,6037,6038,6039,6040,6041,6042,6043,6044,6045,6046,6047,6048,6049,6050,6051,6052,6053,6054,6055,6056,6057,6058,6059,6060,6061,6062,6063,6064,6065,6066,6067,6068,6069,6070,6071,6072,6073,6074,6075,6076,6077,6078,6079,6080,6081,6082,6083,6084,6085,6086,6087,6088,6089,6090,6091,6092,6093,6094,6095,6096,6097,6098,6099,6100,6101,6102,6103,6104,6105,6106,6107,6108,6109,6110,6111,6112,6113,6114,6115,6116,6117,6118,6119,6120,6121,6122,6123,6124,6125,6126,6127,6128,6129,6130,6131,6132,6133,6134,6135,6136,6137,6138,6139,6140,6141,6142,6143,6144,6145,6146,6147,6148,6149,6150,6151,6152,6153,6154,6155,6156,6157,6158,6159,6160,6161,6162,6163,6164,6165,6166,6167,6168,6169,6170,6171,6172,6173,6174,6175,6176,6177,6178,6179,6180,6181,6182,6183,6184,6185,6186,6187,6188,6189,6190,6191,6192,6193,6194,6195,6196,6197,6198,6199,6200,6201,6202,6203,6204,6205,6206,6207,6208,6209,6210,6211,6212,6213,6214,6215,6216,6217,6218,6219,6220,6221,6222,6223,6224,6225,6226,6227,6228,6229,6230,6231,6232,6233,6234,6235,6236,6237,6238,6239,6240,6241,6242,6243,6244,6245,6246,6247,6248,6249,6250,6251,6252,6253,6254,6255,6256,6257,6258,6259,6260,6261,6262,6263,6264,6265,6266,6267,6268,6269,6270,6271,6272,6273,6274,6275,6276,6277,6278,6279,6280,6281,6282,6283,6284,6285,6286,6287,6288,6289,6290,6291,6292,6293,6294,6295,6296,6297,6298,6299,6300,6301,6302,6303,6304,6305,6306,6307,6308,6309,6310,6311,6312,6313,6314,6315,6316,6317,6318,6319,6320,6321,6322,6323,6324,6325,6326,6327,6328,6329,6330,6331,6332,6333,6334,6335,6336,6337,6338,6339,6340,6341,6342,6343,6344,6345,6346,6347,6348,6349,6350,6351,6352,6353,6354,6355,6356,6357,6358,6359,6360,6361,6362,6363,6364,6365,6366,6367,6368,6369,6370,6371,6372,6373,6374,6375,6376,6377,6378,6379,6380,6381,6382,6383,6384,6385,6386,6387,6388,6389,6390,6391,6392,6393,6394,6395,6396,6397,6398,6399,6400,6401,6402,6403,6404,6405,6406,6407,6408,6409,6410,6411,6412,6413,6414,6415,6416,6417,6418,6419,6420,6421,6422,6423,6424,6425,6426,6427,6428,6429,6430,6431,6432,6433,6434,6435,6436,6437,6438,6439,6440,6441,6442,6443,6444,6445,6446,6447,6448,6449,6450,6451,6452,6453,6454,6455,6456,6457,6458,6459,6460,6461,6462,6463,6464,6465,6466,6467,6468,6469,6470,6471,6472,6473,6474,6475,6476,6477,6478,6479,6480,6481,6482,6483,6484,6485,6486,6487,6488,6489,6490,6491,6492,6493,6494,6495,6496,6497,6498,6499,6500,6501,6502,6503,6504,6505,6506,6507,6508,6509,6510,6511,6512,6513,6514,6515,6516,6517,6518,6519,6520,6521,6522,6523,6524,6525,6526,6527,6528,6529,6530,6531,6532,6533,6534,6535,6536,6537,6538,6539,6540,6541,6542,6543,6544,6545,6546,6547,6548,6549,6550,6551,6552,6553,6554,6555,6556,6557,6558,6559,6560,6561,6562,6563,6564,6565,6566,6567,6568,6569,6570,6571,6572,6573,6574,6575,6576,6577,6578,6579,6580,6581,6582,6583,6584,6585,6586,6587,6588,6589,6590,6591,6592,6593,6594,6595,6596,6597,6598,6599,6600,6601,6602,6603,6604,6605,6606,6607,6608,6609,6610,6611,6612,6613,6614,6615,6616,6617,6618,6619,6620,6621,6622,6623,6624,6625,6626,6627,6628,6629,6630,6631,6632,6633,6634,6635,6636,6637,6638,6639,6640,6641,6642,6643,6644,6645,6646,6647,6648,6649,6650,6651,6652,6653,6654,6655,6656,6657,6658,6659,6660,6661,6662,6663,6664,6665,6666,6667,6668,6669,6670,6671,6672,6673,6674,6675,6676,6677,6678,6679,6680,6681,6682,6683,6684,6685,6686,6687,6688,6689,6690,6691,6692,6693,6694,6695,6696,6697,6698,6699,6700,6701,6702,6703,6704,6705,6706,6707,6708,6709,6710,6711,6712,6713,6714,6715,6716,6717,6718,6719,6720,6721,6722,6723,6724,6725,6726,6727,6728,6729,6730,6731,6732,6733,6734,6735,6736,6737,6738,6739,6740,6741,6742,6743,6744,6745,6746,6747,6748,6749,6750,6751,6752,6753,6754,6755,6756,6757,6758,6759,6760,6761,6762,6763,6764,6765,6766,6767,6768,6769,6770,6771,6772,6773,6774,6775,6776,6777,6778,6779,6780,6781,6782,6783,6784,6785,6786,6787,6788,6789,6790,6791,6792,6793,6794,6795,6796,6797,6798,6799,6800,6801,6802,6803,6804,6805,6806,6807,6808,6809,6810,6811,6812,6813,6814,6815,6816,6817,6818,6819,6820,6821,6822,6823,6824,6825,6826,6827,6828,6829,6830,6831,6832,6833,6834,6835,6836,6837,6838,6839,6840,6841,6842,6843,6844,6845,6846,6847,6848,6849,6850,6851,6852,6853,6854,6855,6856,6857,6858,6859,6860,6861,6862,6863,6864,6865,6866,6867,6868,6869,6870,6871,6872,6873,6874,6875,6876,6877,6878,6879,6880,6881,6882,6883,6884,6885,6886,6887,6888,6889,6890,6891,6892,6893,6894,6895,6896,6897,6898,6899,6900,6901,6902,6903,6904,6905,6906,6907,6908,6909,6910,6911,6912,6913,6914,6915,6916,6917,6918,6919,6920,6921,6922,6923,6924,6925,6926,6927,6928,6929,6930,6931,6932,6933,6934,6935,6936,6937,6938,6939,6940,6941,6942,6943,6944,6945,6946,6947,6948,6949,6950,6951,6952,6953,6954,6955,6956,6957,6958,6959,6960,6961,6962,6963,6964,6965,6966,6967,6968,6969,6970,6971,6972,6973,6974,6975,6976,6977,6978,6979,6980,6981,6982,6983,6984,6985,6986,6987,6988,6989,6990,6991,6992,6993,6994,6995,6996,6997,6998,6999,7000,7001,7002,7003,7004,7005,7006,7007,7008,7009,7010,7011,7012,7013,7014,7015,7016,7017,7018,7019,7020,7021,7022,7023,7024,7025,7026,7027,7028,7029,7030,7031,7032,7033,7034,7035,7036,7037,7038,7039,7040,7041,7042,7043,7044,7045,7046,7047,7048,7049,7050,7051,7052,7053,7054,7055,7056,7057,7058,7059,7060,7061,7062,7063,7064,7065,7066,7067,7068,7069,7070,7071,7072,7073,7074,7075,7076,7077,7078,7079,7080,7081,7082,7083,7084,7085,7086,7087,7088,7089,7090,7091,7092,7093,7094,7095,7096,7097,7098,7099,7100,7101,7102,7103,7104,7105,7106,7107,7108,7109,7110,7111,7112,7113,7114,7115,7116,7117,7118,7119,7120,7121,7122,7123,7124,7125,7126,7127,7128,7129,7130,7131,7132,7133,7134,7135,7136,7137,7138,7139,7140,7141,7142,7143,7144,7145,7146,7147,7148,7149,7150,7151,7152,7153,7154,7155,7156,7157,7158,7159,7160,7161,7162,7163,7164,7165,7166,7167,7168,7169,7170,7171,7172,7173,7174,7175,7176,7177,7178,7179,7180,7181,7182,7183,7184,7185,7186,7187,7188,7189,7190,7191,7192,7193,7194,7195,7196,7197,7198,7199,7200,7201,7202,7203,7204,7205,7206,7207,7208,7209,7210,7211,7212,7213,7214,7215,7216,7217,7218,7219,7220,7221,7222,7223,7224,7225,7226,7227,7228,7229,7230,7231,7232,7233,7234,7235,7236,7237,7238,7239,7240,7241,7242,7243,7244,7245,7246,7247,7248,7249,7250,7251,7252,7253,7254,7255,7256,7257,7258,7259,7260,7261,7262,7263,7264,7265,7266,7267,7268,7269,7270,7271,7272,7273,7274,7275,7276,7277,7278,7279,7280,7281,7282,7283,7284,7285,7286,7287,7288,7289,7290,7291,7292,7293,7294,7295,7296,7297,7298,7299,7300,7301,7302,7303,7304,7305,7306,7307,7308,7309,7310,7311,7312,7313,7314,7315,7316,7317,7318,7319,7320,7321,7322,7323,7324,7325,7326,7327,7328,7329,7330,7331,7332,7333,7334,7335,7336,7337,7338,7339,7340,7341,7342,7343,7344,7345,7346,7347,7348,7349,7350,7351,7352,7353,7354,7355,7356,7357,7358,7359,7360,7361,7362,7363,7364,7365,7366,7367,7368,7369,7370,7371,7372,7373,7374,7375,7376,7377,7378,7379,7380,7381,7382,7383,7384,7385,7386,7387,7388,7389,7390,7391,7392,7393,7394,7395,7396,7397,7398,7399,7400,7401,7402,7403,7404,7405,7406,7407,7408,7409,7410,7411,7412,7413,7414,7415,7416,7417,7418,7419,7420,7421,7422,7423,7424,7425,7426,7427,7428,7429,7430,7431,7432,7433,7434,7435,7436,7437,7438,7439,7440,7441,7442,7443,7444,7445,7446,7447,7448,7449,7450,7451,7452,7453,7454,7455,7456,7457,7458,7459,7460,7461,7462,7463,7464,7465,7466,7467,7468,7469,7470,7471,7472,7473,7474,7475,7476,7477,7478,7479,7480,7481,7482,7483,7484,7485,7486,7487,7488,7489,7490,7491,7492,7493,7494,7495,7496,7497,7498,7499,7500,7501,7502,7503,7504,7505,7506,7507,7508,7509,7510,7511,7512,7513,7514,7515,7516,7517,7518,7519,7520,7521,7522,7523,7524,7525,7526,7527,7528,7529,7530,7531,7532,7533,7534,7535,7536,7537,7538,7539,7540,7541,7542,7543,7544,7545,7546,7547,7548,7549,7550,7551,7552,7553,7554,7555,7556,7557,7558,7559,7560,7561,7562,7563,7564,7565,7566,7567,7568,7569,7570,7571,7572,7573,7574,7575,7576,7577,7578,7579,7580,7581,7582,7583,7584,7585,7586,7587,7588,7589,7590,7591,7592,7593,7594,7595,7596,7597,7598,7599,7600,7601,7602,7603,7604,7605,7606,7607,7608,7609,7610,7611,7612,7613,7614,7615,7616,7617,7618,7619,7620,7621,7622,7623,7624,7625,7626,7627,7628,7629,7630,7631,7632,7633,7634,7635,7636,7637,7638,7639,7640,7641,7642,7643,7644,7645,7646,7647,7648,7649,7650,7651,7652,7653,7654,7655,7656,7657,7658,7659,7660,7661,7662,7663,7664,7665,7666,7667,7668,7669,7670,7671,7672,7673,7674,7675,7676,7677,7678,7679,7680,7681,7682,7683,7684,7685,7686,7687,7688,7689,7690,7691,7692,7693,7694,7695,7696,7697,7698,7699,7700,7701,7702,7703,7704,7705,7706,7707,7708,7709,7710,7711,7712,7713,7714,7715,7716,7717,7718,7719,7720,7721,7722,7723,7724,7725,7726,7727,7728,7729,7730,7731,7732,7733,7734,7735,7736,7737,7738,7739,7740,7741,7742,7743,7744,7745,7746,7747,7748,7749,7750,7751,7752,7753,7754,7755,7756,7757,7758,7759,7760,7761,7762,7763,7764,7765,7766,7767,7768,7769,7770,7771,7772,7773,7774,7775,7776,7777,7778,7779,7780,7781,7782,7783,7784,7785,7786,7787,7788,7789,7790,7791,7792,7793,7794,7795,7796,7797,7798,7799,7800,7801,7802,7803,7804,7805,7806,7807,7808,7809,7810,7811,7812,7813,7814,7815,7816,7817,7818,7819,7820,7821,7822,7823,7824,7825,7826,7827,7828,7829,7830,7831,7832,7833,7834,7835,7836,7837,7838,7839,7840,7841,7842,7843,7844,7845,7846,7847,7848,7849,7850,7851,7852,7853,7854,7855,7856,7857,7858,7859,7860,7861,7862,7863,7864,7865,7866,7867,7868,7869,7870,7871,7872,7873,7874,7875,7876,7877,7878,7879,7880,7881,7882,7883,7884,7885,7886,7887,7888,7889,7890,7891,7892,7893,7894,7895,7896,7897,7898,7899,7900,7901,7902,7903,7904,7905,7906,7907,7908,7909,7910,7911,7912,7913,7914,7915,7916,7917,7918,7919,7920,7921,7922,7923,7924,7925,7926,7927,7928,7929,7930,7931,7932,7933,7934,7935,7936,7937,7938,7939,7940,7941,7942,7943,7944,7945,7946,7947,7948,7949,7950,7951,7952,7953,7954,7955,7956,7957,7958,7959,7960,7961,7962,7963,7964,7965,7966,7967,7968,7969,7970,7971,7972,7973,7974,7975,7976,7977,7978,7979,7980,7981,7982,7983,7984,7985,7986,7987,7988,7989,7990,7991,7992,7993,7994,7995,7996,7997,7998,7999,8000,8001,8002,8003,8004,8005,8006,8007,8008,8009,8010,8011,8012,8013,8014,8015,8016,8017,8018,8019,8020,8021,8022,8023,8024,8025,8026,8027,8028,8029,8030,8031,8032,8033,8034,8035,8036,8037,8038,8039,8040,8041,8042,8043,8044,8045,8046,8047,8048,8049,8050,8051,8052,8053,8054,8055,8056,8057,8058,8059,8060,8061,8062,8063,8064,8065,8066,8067,8068,8069,8070,8071,8072,8073,8074,8075,8076,8077,8078,8079,8080,8081,8082,8083,8084,8085,8086,8087,8088,8089,8090,8091,8092,8093,8094,8095,8096,8097,8098,8099,8100,8101,8102,8103,8104,8105,8106,8107,8108,8109,8110,8111,8112,8113,8114,8115,8116,8117,8118,8119,8120,8121,8122,8123,8124,8125,8126,8127,8128,8129,8130,8131,8132,8133,8134,8135,8136,8137,8138,8139,8140,8141,8142,8143,8144,8145,8146,8147,8148,8149,8150,8151,8152,8153,8154,8155,8156,8157,8158,8159,8160,8161,8162,8163,8164,8165,8166,8167,8168,8169,8170,8171,8172,8173,8174,8175,8176,8177,8178,8179,8180,8181,8182,8183,8184,8185,8186,8187,8188,8189,8190,8191,8192,8193,8194,8195,8196,8197,8198,8199,8200,8201,8202,8203,8204,8205,8206,8207,8208,8209,8210,8211,8212,8213,8214,8215,8216,8217,8218,8219,8220,8221,8222,8223,8224,8225,8226,8227,8228,8229,8230,8231,8232,8233,8234,8235,8236,8237,8238,8239,8240,8241,8242,8243,8244,8245,8246,8247,8248,8249,8250,8251,8252,8253,8254,8255,8256,8257,8258,8259,8260,8261,8262,8263,8264,8265,8266,8267,8268,8269,8270,8271,8272,8273,8274,8275,8276,8277,8278,8279,8280,8281,8282,8283,8284,8285,8286,8287,8288,8289,8290,8291,8292,8293,8294,8295,8296,8297,8298,8299,8300,8301,8302,8303,8304,8305,8306,8307,8308,8309,8310,8311,8312,8313,8314,8315,8316,8317,8318,8319,8320,8321,8322,8323,8324,8325,8326,8327,8328,8329,8330,8331,8332,8333,8334,8335,8336,8337,8338,8339,8340,8341,8342,8343,8344,8345,8346,8347,8348,8349,8350,8351,8352,8353,8354,8355,8356,8357,8358,8359,8360,8361,8362,8363,8364,8365,8366,8367,8368,8369,8370,8371,8372,8373,8374,8375,8376,8377,8378,8379,8380,8381,8382,8383,8384,8385,8386,8387,8388,8389,8390,8391,8392,8393,8394,8395,8396,8397,8398,8399,8400,8401,8402,8403,8404,8405,8406,8407,8408,8409,8410,8411,8412,8413,8414,8415,8416,8417,8418,8419,8420,8421,8422,8423,8424,8425,8426,8427,8428,8429,8430,8431,8432,8433,8434,8435,8436,8437,8438,8439,8440,8441,8442,8443,8444,8445,8446,8447,8448,8449,8450,8451,8452,8453,8454,8455,8456,8457,8458,8459,8460,8461,8462,8463,8464,8465,8466,8467,8468,8469,8470,8471,8472,8473,8474,8475,8476,8477,8478,8479,8480,8481,8482,8483,8484,8485,8486,8487,8488,8489,8490,8491,8492,8493,8494,8495,8496,8497,8498,8499,8500,8501,8502,8503,8504,8505,8506,8507,8508,8509,8510,8511,8512,8513,8514,8515,8516,8517,8518,8519,8520,8521,8522,8523,8524,8525,8526,8527,8528,8529,8530,8531,8532,8533,8534,8535,8536,8537,8538,8539,8540,8541,8542,8543,8544,8545,8546,8547,8548,8549,8550,8551,8552,8553,8554,8555,8556,8557,8558,8559,8560,8561,8562,8563,8564,8565,8566,8567,8568,8569,8570,8571,8572,8573,8574,8575,8576,8577,8578,8579,8580,8581,8582,8583,8584,8585,8586,8587,8588,8589,8590,8591,8592,8593,8594,8595,8596,8597,8598,8599,8600,8601,8602,8603,8604,8605,8606,8607,8608,8609,8610,8611,8612,8613,8614,8615,8616,8617,8618,8619,8620,8621,8622,8623,8624,8625,8626,8627,8628,8629,8630,8631,8632,8633,8634,8635,8636,8637,8638,8639,8640,8641,8642,8643,8644,8645,8646,8647,8648,8649,8650,8651,8652,8653,8654,8655,8656,8657,8658,8659,8660,8661,8662,8663,8664,8665,8666,8667,8668,8669,8670,8671,8672,8673,8674,8675,8676,8677,8678,8679,8680,8681,8682,8683,8684,8685,8686,8687,8688,8689,8690,8691,8692,8693,8694,8695,8696,8697,8698,8699,8700,8701,8702,8703,8704,8705,8706,8707,8708,8709,8710,8711,8712,8713,8714,8715,8716,8717,8718,8719,8720,8721,8722,8723,8724,8725,8726,8727,8728,8729,8730,8731,8732,8733,8734,8735,8736,8737,8738,8739,8740,8741,8742,8743,8744,8745,8746,8747,8748,8749,8750,8751,8752,8753,8754,8755,8756,8757,8758,8759,8760,8761,8762,8763,8764,8765,8766,8767,8768,8769,8770,8771,8772,8773,8774,8775,8776,8777,8778,8779,8780,8781,8782,8783,8784,8785,8786,8787,8788,8789,8790,8791,8792,8793,8794,8795,8796,8797,8798,8799,8800,8801,8802,8803,8804,8805,8806,8807,8808,8809,8810,8811,8812,8813,8814,8815,8816,8817,8818,8819,8820,8821,8822,8823,8824,8825,8826,8827,8828,8829,8830,8831,8832,8833,8834,8835,8836,8837,8838,8839,8840,8841,8842,8843,8844,8845,8846,8847,8848,8849,8850,8851,8852,8853,8854,8855,8856,8857,8858,8859,8860,8861,8862,8863,8864,8865,8866,8867,8868,8869,8870,8871,8872,8873,8874,8875,8876,8877,8878,8879,8880,8881,8882,8883,8884,8885,8886,8887,8888,8889,8890,8891,8892,8893,8894,8895,8896,8897,8898,8899,8900,8901,8902,8903,8904,8905,8906,8907,8908,8909,8910,8911,8912,8913,8914,8915,8916,8917,8918,8919,8920,8921,8922,8923,8924,8925,8926,8927,8928,8929,8930,8931,8932,8933,8934,8935,8936,8937,8938,8939,8940,8941,8942,8943,8944,8945,8946,8947,8948,8949,8950,8951,8952,8953,8954,8955,8956,8957,8958,8959,8960,8961,8962,8963,8964,8965,8966,8967,8968,8969,8970,8971,8972,8973,8974,8975,8976,8977,8978,8979,8980,8981,8982,8983,8984,8985,8986,8987,8988,8989,8990,8991,8992,8993,8994,8995,8996,8997,8998,8999,9000,9001,9002,9003,9004,9005,9006,9007,9008,9009,9010,9011,9012,9013,9014,9015,9016,9017,9018,9019,9020,9021,9022,9023,9024,9025,9026,9027,9028,9029,9030,9031,9032,9033,9034,9035,9036,9037,9038,9039,9040,9041,9042,9043,9044,9045,9046,9047,9048,9049,9050,9051,9052,9053,9054,9055,9056,9057,9058,9059,9060,9061,9062,9063,9064,9065,9066,9067,9068,9069,9070,9071,9072,9073,9074,9075,9076,9077,9078,9079,9080,9081,9082,9083,9084,9085,9086,9087,9088,9089,9090,9091,9092,9093,9094,9095,9096,9097,9098,9099,9100,9101,9102,9103,9104,9105,9106,9107,9108,9109,9110,9111,9112,9113,9114,9115,9116,9117,9118,9119,9120,9121,9122,9123,9124,9125,9126,9127,9128,9129,9130,9131,9132,9133,9134,9135,9136,9137,9138,9139,9140,9141,9142,9143,9144,9145,9146,9147,9148,9149,9150,9151,9152,9153,9154,9155,9156,9157,9158,9159,9160,9161,9162,9163,9164,9165,9166,9167,9168,9169,9170,9171,9172,9173,9174,9175,9176,9177,9178,9179,9180,9181,9182,9183,9184,9185,9186,9187,9188,9189,9190,9191,9192,9193,9194,9195,9196,9197,9198,9199,9200,9201,9202,9203,9204,9205,9206,9207,9208,9209,9210,9211,9212,9213,9214,9215,9216,9217,9218,9219,9220,9221,9222,9223,9224,9225,9226,9227,9228,9229,9230,9231,9232,9233,9234,9235,9236,9237,9238,9239,9240,9241,9242,9243,9244,9245,9246,9247,9248,9249,9250,9251,9252,9253,9254,9255,9256,9257,9258,9259,9260,9261,9262,9263,9264,9265,9266,9267,9268,9269,9270,9271,9272,9273,9274,9275,9276,9277,9278,9279,9280,9281,9282,9283,9284,9285,9286,9287,9288,9289,9290,9291,9292,9293,9294,9295,9296,9297,9298,9299,9300,9301,9302,9303,9304,9305,9306,9307,9308,9309,9310,9311,9312,9313,9314,9315,9316,9317,9318,9319,9320,9321,9322,9323,9324,9325,9326,9327,9328,9329,9330,9331,9332,9333,9334,9335,9336,9337,9338,9339,9340,9341,9342,9343,9344,9345,9346,9347,9348,9349,9350,9351,9352,9353,9354,9355,9356,9357,9358,9359,9360,9361,9362,9363,9364,9365,9366,9367,9368,9369,9370,9371,9372,9373,9374,9375,9376,9377,9378,9379,9380,9381,9382,9383,9384,9385,9386,9387,9388,9389,9390,9391,9392,9393,9394,9395,9396,9397,9398,9399,9400,9401,9402,9403,9404,9405,9406,9407,9408,9409,9410,9411,9412,9413,9414,9415,9416,9417,9418,9419,9420,9421,9422,9423,9424,9425,9426,9427,9428,9429,9430,9431,9432,9433,9434,9435,9436,9437,9438,9439,9440,9441,9442,9443,9444,9445,9446,9447,9448,9449,9450,9451,9452,9453,9454,9455,9456,9457,9458,9459,9460,9461,9462,9463,9464,9465,9466,9467,9468,9469,9470,9471,9472,9473,9474,9475,9476,9477,9478,9479,9480,9481,9482,9483,9484,9485,9486,9487,9488,9489,9490,9491,9492,9493,9494,9495,9496,9497,9498,9499,9500,9501,9502,9503,9504,9505,9506,9507,9508,9509,9510,9511,9512,9513,9514,9515,9516,9517,9518,9519,9520,9521,9522,9523,9524,9525,9526,9527,9528,9529,9530,9531,9532,9533,9534,9535,9536,9537,9538,9539,9540,9541,9542,9543,9544,9545,9546,9547,9548,9549,9550,9551,9552,9553,9554,9555,9556,9557,9558,9559,9560,9561,9562,9563,9564,9565,9566,9567,9568,9569,9570,9571,9572,9573,9574,9575,9576,9577,9578,9579,9580,9581,9582,9583,9584,9585,9586,9587,9588,9589,9590,9591,9592,9593,9594,9595,9596,9597,9598,9599,9600,9601,9602,9603,9604,9605,9606,9607,9608,9609,9610,9611,9612,9613,9614,9615,9616,9617,9618,9619,9620,9621,9622,9623,9624,9625,9626,9627,9628,9629,9630,9631,9632,9633,9634,9635,9636,9637,9638,9639,9640,9641,9642,9643,9644,9645,9646,9647,9648,9649,9650,9651,9652,9653,9654,9655,9656,9657,9658,9659,9660,9661,9662,9663,9664,9665,9666,9667,9668,9669,9670,9671,9672,9673,9674,9675,9676,9677,9678,9679,9680,9681,9682,9683,9684,9685,9686,9687,9688,9689,9690,9691,9692,9693,9694,9695,9696,9697,9698,9699,9700,9701,9702,9703,9704,9705,9706,9707,9708,9709,9710,9711,9712,9713,9714,9715,9716,9717,9718,9719,9720,9721,9722,9723,9724,9725,9726,9727,9728,9729,9730,9731,9732,9733,9734,9735,9736,9737,9738,9739,9740,9741,9742,9743,9744,9745,9746,9747,9748,9749,9750,9751,9752,9753,9754,9755,9756,9757,9758,9759,9760,9761,9762,9763,9764,9765,9766,9767,9768,9769,9770,9771,9772,9773,9774,9775,9776,9777,9778,9779,9780,9781,9782,9783,9784,9785,9786,9787,9788,9789,9790,9791,9792,9793,9794,9795,9796,9797,9798,9799,9800,9801,9802,9803,9804,9805,9806,9807,9808,9809,9810,9811,9812,9813,9814,9815,9816,9817,9818,9819,9820,9821,9822,9823,9824,9825,9826,9827,9828,9829,9830,9831,9832,9833,9834,9835,9836,9837,9838,9839,9840,9841,9842,9843,9844,9845,9846,9847,9848,9849,9850,9851,9852,9853,9854,9855,9856,9857,9858,9859,9860,9861,9862,9863,9864,9865,9866,9867,9868,9869,9870,9871,9872,9873,9874,9875,9876,9877,9878,9879,9880,9881,9882,9883,9884,9885,9886,9887,9888,9889,9890,9891,9892,9893,9894,9895,9896,9897,9898,9899,9900,9901,9902,9903,9904,9905,9906,9907,9908,9909,9910,9911,9912,9913,9914,9915,9916,9917,9918,9919,9920,9921,9922,9923,9924,9925,9926,9927,9928,9929,9930,9931,9932,9933,9934,9935,9936,9937,9938,9939,9940,9941,9942,9943,9944,9945,9946,9947,9948,9949,9950,9951,9952,9953,9954,9955,9956,9957,9958,9959,9960,9961,9962,9963,9964,9965,9966,9967,9968,9969,9970,9971,9972,9973,9974,9975,9976,9977,9978,9979,9980,9981,9982,9983,9984,9985,9986,9987,9988,9989,9990,9991,9992,9993,9994,9995,9996,9997,9998,9999,10000 count=10000"],
        [[{"$concat":[{"$rep":60,"n":1000},[5],{"$rep":60,"n":1000},[5]]}],"max=50 ids=R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,1,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,R,2 count=2"]
      ] },
      solution: {
        approach: `<p>A private static counter shared by all orders; the constructor validates, then increments it and copies the new value into the final instance field <code>id</code>. A static method exposes the count; a <code>static final</code> constant expresses the limit.</p>`,
        code: `
        class Order {
            static final int MAX_ITEMS = 50;     // constant, shared
            private static int created = 0;      // ONE counter for the whole class

            private final int id;                // one per order
            private final int items;

            Order(int items) {
                if (items < 1 || items > MAX_ITEMS) throw new IllegalArgumentException("items must be 1.." + MAX_ITEMS);
                this.items = items;
                this.id = ++created;             // validated first, so rejected orders burn no id
            }

            static int count() { return created; }   // callable with zero objects
            int id() { return id; }

            public static void main(String[] args) {
                System.out.println(Order.count());                     // 0
                Order a = new Order(3), b = new Order(7), c = new Order(2);
                System.out.println(a.id() + " " + b.id() + " " + c.id()); // 1 2 3
                try { new Order(60); } catch (IllegalArgumentException e) { System.out.println("rejected"); }
                System.out.println(Order.count());                     // 3
            }
        }`,
        alt: [{ lang: 'python', code: `class Order:\n    MAX_ITEMS = 50\n    _created = 0          # class attribute = Java static field\n\n    def __init__(self, items):\n        if not 1 <= items <= Order.MAX_ITEMS:\n            raise ValueError("bad items")\n        Order._created += 1\n        self.id = Order._created\n\n    @staticmethod\n    def count():\n        return Order._created\n\nprint(Order.count())\na, b, c = Order(3), Order(7), Order(2)\nprint(a.id, b.id, c.id, Order.count())`, run: true }],
        dry: { head: ['action', 'Order.created (static)', 'new object id', 'output'], rows: [
          ['Order.count()', '0', '-', '0'],
          ['new Order(3)', '1', '1', '-'],
          ['new Order(7)', '2', '2', '-'],
          ['new Order(2)', '3', '3', '1 2 3'],
          ['new Order(60)', '3 (unchanged)', '<span class="c-r">throws</span>', 'rejected'],
          ['Order.count()', '3', '-', '<span class="c-g">3</span>']
        ] },
        complexity: `<p>O(1) time per order and O(1) extra space for the counter. For multithreaded use, switch to <code>AtomicInteger.incrementAndGet()</code>; for distributed systems, ids come from a database sequence or a Snowflake-style generator instead.</p>`,
        followUps: ['Make it thread-safe. Why is ++created not atomic?', 'What happens to ids after the JVM restarts?', 'How would you test this class if another test already created orders?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6: Initialization order
     ====================================================================== */
  var T6_AB = [
    'class A {',
    '    static { System.out.print("A-static "); }',
    '    { System.out.print("A-instance "); }',
    '    A() { System.out.print("A-ctor "); }',
    '}',
    'class B extends A {',
    '    static { System.out.print("B-static "); }',
    '    { System.out.print("B-instance "); }',
    '    B() { System.out.print("B-ctor "); }',
    '}',
    '// main:',
    'new B();'
  ].join('\n');
  var T6_COUNTER = [
    'class Counter {',
    '    static Counter INSTANCE = new Counter();',
    '    static int a;',
    '    static int b = 0;',
    '    Counter() { a++; b++; }',
    '}',
    '// main:',
    'System.out.println(Counter.a + " " + Counter.b);'
  ].join('\n');

  topics.push({
    title: 'Initialization Order: static, instance, constructor',
    analogy: `<p>Opening a new branch of a restaurant chain happens in two stages. <b>Once per chain</b>: the head office writes the recipe book and sets up the supply contracts (static initialisation). That happens one time, before the first branch opens. <b>Once per branch</b>: build the walls first (the parent part), then install the standard fittings every branch gets (field initializers and instance blocks, in the order on the checklist), and finally do the branch-specific touches (the constructor body). You never paint the walls before they are built, and you never write the recipe book twice.</p>`,
    explain: `<p>"What is printed, and in what order?" is one of the most common Java interview questions. It looks scary, but it follows a short list of rules. Learn the rules, then trace.</p>
<h4>Phase 1: class initialisation (once per class, on first active use)</h4>
<ol>
<li>All static fields first get their <b>default</b> values (0, false, null). This is called <i>preparation</i>.</li>
<li>If the class has a parent that is not yet initialised, the <b>parent is initialised first</b> (all the way up to Object).</li>
<li>Then the class\'s <b>static field initializers and static blocks run, top to bottom</b>, in the order they appear in the source file.</li>
</ol>
<h4>Phase 2: object creation (every <code>new</code>)</h4>
<ol>
<li>Memory is allocated; <b>all instance fields are set to defaults</b>.</li>
<li>The chosen constructor starts. If it begins with <code>this(...)</code>, jump to that constructor (repeat).</li>
<li>The constructor that does not begin with <code>this(...)</code> calls <code>super(...)</code> (explicitly or implicitly): the <b>parent part is built completely first</b> (its initializers + its constructor body).</li>
<li>Back in this class: <b>instance field initializers and instance blocks <code>{ }</code> run, top to bottom</b>.</li>
<li>The <b>rest of the constructor body</b> runs (and then the bodies of any constructors that delegated with <code>this(...)</code>, innermost first).</li>
</ol>
<h4>The classic puzzle</h4>
${H.table(['Step', 'Printed', 'Rule'], [
  ['first <code>new B()</code>: init class A', 'A-static', 'parent class first'],
  ['init class B', 'B-static', 'then child class'],
  ['B() → super() → A part', 'A-instance A-ctor', 'parent part of the object first; instance block before ctor body'],
  ['back in B', 'B-instance B-ctor', 'child initializers, then child body'],
  ['second <code>new B()</code>', 'A-instance A-ctor B-instance B-ctor', '<b>no static lines</b>: classes are initialised only once']
])}
<h4>Instance blocks vs field initializers</h4>
<p>They are equal partners: javac merges them in <b>source order</b> into each constructor, right after the <code>super()</code> call. So <code>int a = 10; { print(a); } int b = 20;</code> prints 10 and, if you peek at <code>this.b</code> inside the block, sees <b>0</b> because b\'s initializer has not run yet. (Reading plain <code>b</code> there is a compile error: <i>illegal forward reference</i>.)</p>
<h4>The two traps that catch seniors</h4>
<ul>
<li><b>Static field order matters.</b> If a static field creates an instance <i>before</i> later static fields are initialised, the constructor sees defaults, and later initializers may overwrite what the constructor did. (See the Counter visualizer: prints <b>1 0</b>.)</li>
<li><b>Calling an overridable method from a constructor.</b> The parent constructor runs <b>before</b> the child\'s field initializers, so an overridden method called from the parent constructor sees the child\'s fields as <b>null/0</b>. Exception: <code>final</code> fields initialised with compile-time constants are inlined and look "already set".</li>
</ul>`,
    clues: [
      '"What is the output?" with static blocks, instance blocks and constructors across a parent and child class → static (parent, child) once; then per object: parent init + ctor, child init + ctor',
      'A static field assigned with <code>new ThisClass()</code> above other static fields → the constructor runs while later statics are still default',
      '"Why is this field null when the parent constructor calls my overridden method?" → parent constructor runs before child field initializers',
      '"illegal forward reference" → a field initializer or block reads a field declared later by its simple name',
      'Constructor uses <code>this(...)</code> → instance initializers still run exactly once, in the constructor that calls super',
      '"Does the static block run if I only access a constant?" → no, compile-time constants do not trigger class initialisation'
    ],
    code: [`
      class Base {
          static { System.out.println("1. Base static block"); }
          { System.out.println("3. Base instance block"); }
          Base() {
              System.out.println("4. Base constructor body");
              hello();                                   // DANGER: overridable call in a constructor
          }
          void hello() { System.out.println("Base.hello"); }
      }

      class Child extends Base {
          static { System.out.println("2. Child static block"); }
          private String name = "Kid";                    // runs AFTER Base() finishes
          private final int age = 7;                      // compile-time constant: inlined
          { System.out.println("6. Child instance block, name=" + name); }

          Child() {
              super();                                    // implicit anyway
              System.out.println("7. Child constructor body");
          }

          @Override
          void hello() { System.out.println("5. Child.hello sees name=" + name + " age=" + age); }
      }

      public class Main {
          public static void main(String[] args) {
              new Child();
              // 1. Base static block
              // 2. Child static block
              // 3. Base instance block
              // 4. Base constructor body
              // 5. Child.hello sees name=null age=7
              // 6. Child instance block, name=Kid
              // 7. Child constructor body
          }
      }`],
    codeTitle: ['The full order, including the overridable-call trap (numbers = print order)'],
    viz: [
      {
        title: 'Parent and child: static once, instance every time',
        input: '2',
        inputLabel: 'How many times does main call new B()? (1 to 3)',
        gen: function (input) {
          var n = clampInt(input, 2, 1, 3, 'Enter 1, 2 or 3');
          var out = '', list = [];
          var st = { 'A initialised?': 'no', 'B initialised?': 'no' };
          function S() { return JSON.parse(JSON.stringify(st)); }
          for (var k = 1; k <= n; k++) {
            var first = k === 1;
            list.push({ l: 12, n: 'Call #' + k + ': <code>new B()</code>. ' + (first ? 'B is used for the first time, so classes must be initialised before any object can exist.' : 'Both classes are <b>already initialised</b>: no static blocks this time.'), cs: ['main'], st: S(), o: out });
            if (first) {
              st['A initialised?'] = 'YES'; out += 'A-static ';
              list.push({ l: 2, c: 'ok', n: 'B extends A, so the <b>parent class A is initialised first</b>: its static block runs.', cs: ['main', '<clinit> A'], st: S(), sh: { 'A initialised?': 'ok' }, o: out });
              st['B initialised?'] = 'YES'; out += 'B-static ';
              list.push({ l: 7, c: 'ok', n: 'Now class B\'s static block runs. Static work is <b>finished forever</b> for both classes.', cs: ['main', '<clinit> B'], st: S(), sh: { 'B initialised?': 'ok' }, o: out });
            }
            var addr = '#' + (700 + k) + ' B';
            var heap = [[addr, 'allocated, fields zeroed']];
            list.push({ l: 9, n: 'Memory for object ' + addr.split(' ')[0] + ' is allocated and zeroed; the <b>B()</b> constructor is entered. Its invisible first line is <code>super()</code>...', cs: ['main', 'B()'], st: S(), h: heap, o: out });
            list.push({ l: 4, n: '...so we jump into <b>A()</b>, which itself first calls <code>Object()</code> (does nothing visible). The parent part must be complete before the child part starts.', cs: ['main', 'B()', 'A()'], st: S(), h: heap, o: out });
            out += 'A-instance ';
            list.push({ l: 3, c: 'ok', n: 'Right after <code>super()</code> returns inside A(), <b>A\'s instance initializers</b> run: the instance block prints.', cs: ['main', 'B()', 'A()'], st: S(), h: heap, o: out });
            out += 'A-ctor ';
            list.push({ l: 4, c: 'ok', n: 'Then the <b>rest of A\'s constructor body</b> runs. The A part of the object is done.', cs: ['main', 'B()', 'A()'], st: S(), h: heap, o: out });
            out += 'B-instance ';
            list.push({ l: 8, c: 'ok', n: 'Back in B(), right after its <code>super()</code>: <b>B\'s instance initializers</b> run.', cs: ['main', 'B()'], st: S(), h: heap, o: out });
            out += 'B-ctor ';
            list.push({ l: 9, c: 'ok', n: 'Finally the <b>rest of B\'s constructor body</b>. Object ' + addr.split(' ')[0] + ' is fully built and its reference is returned to main.', cs: ['main', 'B()'], st: S(), h: [[addr, 'fully constructed']], hh: (function () { var o = {}; o[addr] = 'ok'; return o; })(), o: out });
            out += '\n';
          }
          list.push({ l: [], n: 'Pattern: static lines appear <b>once</b> (parent then child); every object prints <b>A-instance A-ctor B-instance B-ctor</b> (parent part fully, then child part).', st: S(), o: out });
          return steps(T6_AB, list);
        }
      },
      {
        title: 'The static order puzzle: why it prints "1 0"',
        gen: function () {
          return steps(T6_COUNTER, [
            { l: 8, n: 'main touches <code>Counter.a</code>: an active use, so class Counter must be initialised first.', st: { 'Counter.INSTANCE': '(class not prepared)', 'Counter.a': '-', 'Counter.b': '-' }, o: '' },
            { l: [2, 3, 4], n: '<b>Preparation</b>: every static field gets its default value. INSTANCE = null, a = 0, b = 0. No code has run yet.', st: { 'Counter.INSTANCE': 'null', 'Counter.a': 0, 'Counter.b': 0 }, sh: { 'Counter.a': 'ok', 'Counter.b': 'ok' }, o: '' },
            { l: 2, n: 'Now static initializers run <b>top to bottom</b>. The first one is <code>new Counter()</code>: it creates an object <b>while the class is still being initialised</b>.', st: { 'Counter.INSTANCE': 'null', 'Counter.a': 0, 'Counter.b': 0 }, h: [['#801 Counter', '(no instance fields)']], hh: { '#801 Counter': 'ok' }, o: '' },
            { l: 5, n: 'The constructor runs: <code>a++</code> and <code>b++</code>. Both go from 0 to 1.', cs: ['<clinit> Counter', 'Counter()'], st: { 'Counter.INSTANCE': 'null', 'Counter.a': 1, 'Counter.b': 1 }, sh: { 'Counter.a': 'cur', 'Counter.b': 'cur' }, h: [['#801 Counter', '(no instance fields)']], o: '' },
            { l: 2, n: 'The constructor returns and INSTANCE gets the reference.', st: { 'Counter.INSTANCE': '→ #801', 'Counter.a': 1, 'Counter.b': 1 }, sh: { 'Counter.INSTANCE': 'ok' }, h: [['#801 Counter', '(no instance fields)']], o: '' },
            { l: 3, n: '<code>static int a;</code> has <b>no initializer</b>, so there is nothing to run. a keeps the value 1.', st: { 'Counter.INSTANCE': '→ #801', 'Counter.a': 1, 'Counter.b': 1 }, sh: { 'Counter.a': 'ok' }, h: [['#801 Counter', '(no instance fields)']], o: '' },
            { l: 4, c: 'bad', n: '<code>static int b = 0;</code> <b>does</b> have an initializer, and it runs now, <b>overwriting</b> the 1 the constructor wrote. b becomes 0 again!', st: { 'Counter.INSTANCE': '→ #801', 'Counter.a': 1, 'Counter.b': 0 }, sh: { 'Counter.b': 'bad' }, h: [['#801 Counter', '(no instance fields)']], o: '' },
            { l: 8, n: 'Initialisation complete. The print shows <b>1 0</b>. Lesson: an explicit "= 0" is not harmless when an earlier static initializer already changed the field. Put self-instantiating statics (singletons) <b>last</b>, or use a holder class.', st: { 'Counter.INSTANCE': '→ #801', 'Counter.a': 1, 'Counter.b': 0 }, h: [['#801 Counter', '(no instance fields)']], o: '1 0' }
          ]);
        }
      }
    ],
    examples: [
      { title: 'Field initializers and instance blocks interleave in source order', html: `<p>Field a (=10), then the block, then field b (=20), then the constructor body. Inside the block, <code>this.b</code> is still <b>0</b>. Run it twice: the same 4 lines repeat, the static lines do not.</p>
${H.table(['#', 'Printed'], [['1', 'static field s1'], ['2', 'static block'], ['3', 'field a'], ['4', 'instance block a=10 b=0'], ['5', 'field b'], ['6', 'constructor body a=10 b=20']])}`, code: `
        class Demo {
            static int s1 = log("static field s1", 1);
            static { log("static block", 0); }
            int a = log("field a", 10);
            { log("instance block a=" + a + " b=" + this.b, 0); }   // plain 'b' would be an illegal forward reference
            int b = log("field b", 20);
            Demo() { log("constructor body a=" + a + " b=" + b, 0); }
            static int log(String what, int v) { System.out.println(what); return v; }
        }` },
      { title: 'Where main lives changes the first line', html: `<p>If <code>main</code> is <b>inside</b> the class with the static block, the JVM must initialise that class <b>before</b> it can call main, so the static block prints <b>before</b> anything in main. If main is in another class, main\'s first print comes first.</p>`, code: `
        class Launcher {
            static { System.out.println("static block"); }
            public static void main(String[] args) {
                System.out.println("main");     // prints AFTER "static block"
            }
        }` },
      { title: 'Forward references: illegal by name, legal through a method', html: `<p><code>static int x = y + 1; static int y = 5;</code> does not compile (illegal forward reference). But <code>static int x = getY() + 1;</code> with <code>getY()</code> returning y compiles and gives <b>x = 1</b>, because y is still 0 when x is initialised. Same with <code>Fwd2.y + 1</code> (a qualified name is allowed).</p>`, code: `
        class Fwd {
            static int x = getY() + 1;   // y is still 0 here
            static int y = 5;
            static int getY() { return y; }
            public static void main(String[] args) {
                System.out.println(x + " " + y);   // 1 5
            }
        }` },
      { title: 'this(...) does not run initializers twice', html: `<p><code>Shop(String name) { this(); ... }</code>: the instance block runs once, inside the path through <code>Shop()</code> (which calls super). Then <code>Shop()</code>\'s body finishes, then the rest of <code>Shop(String)</code>. Trace in the guided problem below.</p>` }
    ],
    deepDive: `<p><b>What javac generates.</b> All static field initializers and static blocks are concatenated, in source order, into one hidden method <code>&lt;clinit&gt;</code>. All instance field initializers and instance blocks are concatenated, in source order, and <b>copied into each constructor</b> (<code>&lt;init&gt;</code>) that calls <code>super(...)</code>, immediately after that call. Constructors that start with <code>this(...)</code> do not get a copy. You can see this with <code>javap -c -p MyClass</code>.</p>
<p><b>The JVM\'s loading pipeline:</b> <i>loading</i> (find bytes, create the Class) → <i>linking</i>: <i>verification</i> (bytecode is safe), <i>preparation</i> (static fields get default values), <i>resolution</i> (symbolic references, often lazily) → <i>initialisation</i> (run <code>&lt;clinit&gt;</code>). Loading can happen early; initialisation happens only on <b>first active use</b>: <code>new</code>, static method call, non-constant static field access, reflection like <code>Class.forName(name)</code> (which initialises by default), subclass initialisation, or being the main class. Interfaces are initialised only when their own non-constant static fields are used or a default method forces it.</p>
<p><b>Recursive initialisation.</b> If, during A\'s <code>&lt;clinit&gt;</code>, code touches A again on the same thread, the JVM does not wait or re-run; it lets you see A in its half-initialised state. That is the Counter puzzle, and the cause of real bugs in static singletons that depend on other statics. Across two threads, mutually dependent static initializers can deadlock.</p>
<p><b>Overridable calls in constructors</b> are flagged by Effective Java (Item 19) and by JDK 21\'s <code>-Xlint:this-escape</code>. Java 25\'s flexible constructor bodies let a subclass assign its fields <i>before</i> <code>super(...)</code>, which finally gives a clean fix for "the parent constructor calls my override too early".</p>
<p><b>Exceptions.</b> An exception in a static initializer becomes <code>ExceptionInInitializerError</code>; the class is then unusable (<code>NoClassDefFoundError</code> on later access). An exception in an instance initializer is allowed only if every constructor declares it (for checked exceptions).</p>`,
    aiEra: `<p><b>What AI changes:</b> large models can usually solve textbook initialisation puzzles, but they slip on the subtle ones: compile-time constants that do not trigger initialisation, <code>this(...)</code> not re-running initializers, the "1 0" Counter case, and final constant fields looking initialised during the parent constructor. Interviewers know this and use exactly these variations to check real understanding.</p>
<p><b>Use AI as a partner:</b> ask it to generate <i>new</i> puzzles: <code>"Write 5 tricky Java initialization-order questions with a parent/child class and static fields; do not give answers."</code> Solve them by hand, then run them. When debugging a mysterious null in production, ask: <code>"Which constructor in this hierarchy calls an overridable method?"</code></p>
<p><b>Where AI goes wrong:</b> claiming static blocks run "when the JVM starts" (they run on first active use), or that instance blocks run before the parent constructor. <b>What you must still own:</b> the two-phase model and the ability to trace any snippet line by line with confidence. Treat the compiler and a 10-second run as the final judge, not the chat answer.</p>`,
    problems: [{
      title: 'Predict the Output: Shop Opening Day',
      level: 'Medium', tags: ['initialization order', 'static block', 'instance block', 'output prediction'], companies: ['Infosys', 'Cognizant', 'Goldman Sachs'],
      statement: `<p>Predict every line printed by this program.</p>
<pre>class Shop {
    static int customers = 0;
    int visit;
    static { System.out.println("S: open, customers=" + customers); customers = 100; }
    { visit = ++customers; System.out.println("I: visit " + visit); }
    Shop() { System.out.println("C: welcome #" + visit); }
    Shop(String name) { this(); System.out.println("C2: " + name); }
}
public class Main {
    public static void main(String[] args) {
        System.out.println("main starts");
        new Shop();
        new Shop("VIP");
        System.out.println("customers=" + Shop.customers);
    }
}</pre>`,
      constraints: `Assume a single thread. main is in class Main, not in Shop.`,
      example: `<p>Expected output:</p><pre>main starts\nS: open, customers=0\nI: visit 101\nC: welcome #101\nI: visit 102\nC: welcome #102\nC2: VIP\ncustomers=102</pre><p>Why? ${H.c('b', 'Shop')} is initialised only when first used (after "main starts"). The static block sees 0 then sets 100. Each object runs the instance block ${H.c('g', 'once')}, even <code>Shop("VIP")</code>, which delegates with this().</p>`,
      brute: {
        why: `<p>The naive approach reads the class top to bottom as if it were a script, or assumes static blocks run "at program start". That predicts "S: open" before "main starts", or the instance block running twice for <code>Shop("VIP")</code> (once per constructor). Both are wrong: initialisation is lazy, and instance initializers are only copied into constructors that call super.</p>`,
        code: `
        // The WRONG mental model, written out as comments next to the real program
        class ShopNaive {
            static int customers = 0;
            int visit;
            static { System.out.println("S: open, customers=" + customers); customers = 100; } // naive: "runs at JVM start"
            { visit = ++customers; System.out.println("I: visit " + visit); }                  // naive: "runs once per constructor"
            ShopNaive() { System.out.println("C: welcome #" + visit); }
            ShopNaive(String name) { this(); System.out.println("C2: " + name); }             // naive: block runs here AND in ShopNaive()
        }`
      },
      mcq: { q: 'How many times does the instance block run for <code>new Shop("VIP")</code>?', options: ['Once', 'Twice (once per constructor involved)', 'Zero, because this() skips it', 'It depends on the JIT'], answer: 0, explain: 'javac copies instance initializers only into constructors that call super(...). Shop(String) starts with this(), so it has no copy; Shop() has one. Result: exactly once per object.' },
      hints: [
        `<p>Hint 1: When is class Shop first actively used? Not before "main starts": main lives in Main. The first <code>new Shop()</code> triggers initialisation.</p>`,
        `<p>Hint 2: Per object the order is: super() (Object) → instance block → constructor body. For <code>Shop("VIP")</code>: this() → [super → block → Shop() body] → rest of Shop(String) body.</p>`,
        `<p>Hint 3: Track the static <code>customers</code> in a table: 0 at preparation, 0 at the static block\'s print, 100 after it, then ++ before each "I:" line. Two objects → 102.</p>`
      ],
      tests: { io: true, cases: [
        { stdin: "", stdout: "main starts\nS: open, customers=0\nI: visit 101\nC: welcome #101\nI: visit 102\nC: welcome #102\nC2: VIP\ncustomers=102" }
      ] },
      solution: {
        approach: `<p>Trace the two phases. Phase 1 happens once, at the first <code>new Shop()</code>: static field initializer (customers = 0), then the static block (prints 0, sets 100). Phase 2 for each object: instance block (++customers, print) then constructor body. For the second object, <code>Shop(String)</code> delegates to <code>Shop()</code>, which runs the instance block and its body, then control returns to print "C2: VIP".</p>`,
        code: `
        class Shop {
            static int customers = 0;
            int visit;
            static { System.out.println("S: open, customers=" + customers); customers = 100; }
            { visit = ++customers; System.out.println("I: visit " + visit); }
            Shop() { System.out.println("C: welcome #" + visit); }
            Shop(String name) { this(); System.out.println("C2: " + name); }
        }

        public class Main {
            public static void main(String[] args) {
                System.out.println("main starts");     // main starts
                new Shop();                            // S: open, customers=0 / I: visit 101 / C: welcome #101
                new Shop("VIP");                       // I: visit 102 / C: welcome #102 / C2: VIP
                System.out.println("customers=" + Shop.customers);   // customers=102
            }
        }`,
        alt: [{ lang: 'python', code: `# Python analogue: the class body runs once (like a static initializer), __init__ runs per object\nprint("main starts")   # Java prints this first; Python runs a class body when the class statement executes, not lazily\nclass Shop:\n    customers = 0\n    print("S: open, customers=" + str(customers))\n    customers = 100\n    def __init__(self, name=None):\n        Shop.customers += 1\n        self.visit = Shop.customers\n        print("I: visit " + str(self.visit))\n        print("C: welcome #" + str(self.visit))\n        if name:\n            print("C2: " + name)\n\nShop()\nShop("VIP")\nprint("customers=" + str(Shop.customers))`, run: true }],
        dry: { head: ['event', 'customers', 'visit (this obj)', 'printed'], rows: [
          ['main starts', '(Shop not initialised)', '-', 'main starts'],
          ['new Shop(): preparation + static init', '0 → 100', '-', 'S: open, customers=0'],
          ['obj#1 instance block', '101', '101', 'I: visit 101'],
          ['obj#1 Shop() body', '101', '101', 'C: welcome #101'],
          ['obj#2 Shop("VIP") → this() → block', '102', '102', 'I: visit 102'],
          ['obj#2 Shop() body, then Shop(String) body', '102', '102', 'C: welcome #102 / C2: VIP'],
          ['final print', '102', '-', '<span class="c-g">customers=102</span>']
        ] },
        complexity: `<p>O(1) work per object. The real "cost" is reasoning: two phases, each with a fixed order. Static work happens once per class loader, no matter how many objects you create.</p>`,
        followUps: ['Move main into Shop. What changes in the first two lines?', 'Make customers a compile-time constant read from main. Does the static block run?', 'Add a parent class with its own static and instance blocks and re-trace']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7: Access modifiers and packages
     ====================================================================== */
  topics.push({
    title: 'Access Modifiers & Packages',
    analogy: `<p>Think of an apartment building. Your <b>bedroom diary</b> is <code>private</code>: only you read it. The <b>shared laundry room</b> is package-private (no keyword): anyone living in <i>this building</i> (package) can use it, outsiders cannot. The <b>family recipe book</b> is <code>protected</code>: your building neighbours can read it, and so can your <i>children</i> even if they move to another building. The <b>lobby notice board</b> is <code>public</code>: anyone from the street can read it. The building itself, with its street address <i>com.acme.shop</i>, is the <b>package</b>: it groups related flats and gives each one a unique full address.</p>`,
    explain: `<p>Access modifiers answer one question: <b>"who is allowed to see this?"</b> Packages answer: <b>"which group does this class belong to, and what is its full name?"</b> Together they let you hide the messy insides of your code and expose only a small, safe surface.</p>
<h4>1. The four access levels</h4>
${H.table(['Modifier', 'Same class', 'Same package', 'Subclass in another package', 'Anywhere'], [
  ['<code>private</code>', '<span class="c-g">✔</span>', '<span class="c-r">✘</span>', '<span class="c-r">✘</span>', '<span class="c-r">✘</span>'],
  ['<i>(none)</i> package-private', '<span class="c-g">✔</span>', '<span class="c-g">✔</span>', '<span class="c-r">✘</span>', '<span class="c-r">✘</span>'],
  ['<code>protected</code>', '<span class="c-g">✔</span>', '<span class="c-g">✔</span>', '<span class="c-y">✔ via inheritance</span>', '<span class="c-r">✘</span>'],
  ['<code>public</code>', '<span class="c-g">✔</span>', '<span class="c-g">✔</span>', '<span class="c-g">✔</span>', '<span class="c-g">✔</span>']
])}
<p>Each row is a superset of the row above. Memorise it as <b>private &lt; default &lt; protected &lt; public</b>.</p>
<h4>2. Where each modifier can go</h4>
<ul>
<li><b>Top-level classes</b>: only <code>public</code> or package-private. A <code>private</code> or <code>protected</code> top-level class does not compile. At most one public top-level class per file, and the file must be named after it.</li>
<li><b>Fields, methods, constructors, nested classes</b>: all four.</li>
<li><b>Local variables</b>: none (they are already visible only inside their block).</li>
</ul>
<h4>3. Encapsulation in one rule</h4>
<p><b>Fields private, behaviour public</b>. Instead of letting anyone write <code>account.balance = -500</code>, make <code>balance</code> private and offer <code>deposit()</code>/<code>withdraw()</code> that check the rules. Then you can change the internals later (store paise in a <code>long</code> instead of rupees in a <code>double</code>) without breaking callers. Default to the <b>most restrictive</b> level that works, and widen only when needed.</p>
<h4>4. The protected subtlety</h4>
<p>In a subclass that lives in a <b>different</b> package, you can use an inherited protected member on <code>this</code> (or on references of your own subclass type), but <b>not</b> on an arbitrary object of the parent type: inside <code>class Savings extends Account</code> (other package), <code>this.audit()</code> compiles, but <code>new Account().audit()</code> does not. Also remember protected includes <b>package</b> access, so it is wider than many people think.</p>
<h4>5. Packages</h4>
<ul>
<li>First line of the file: <code>package com.acme.shop;</code>. The full class name becomes <code>com.acme.shop.Cart</code> (its <b>fully qualified name</b>).</li>
<li>Convention: reverse domain name, all lowercase (<code>com.google.common.collect</code>), so names never collide worldwide.</li>
<li>The folder must match: <code>src/com/acme/shop/Cart.java</code>, compiled to <code>out/com/acme/shop/Cart.class</code>.</li>
<li><code>import com.acme.shop.Cart;</code> (single type) or <code>import com.acme.shop.*;</code> (all types in that package, <b>not</b> its sub-packages). <code>java.lang</code> (String, Math, System...) is imported automatically; classes in your own package need no import.</li>
<li>Name clash (<code>java.util.Date</code> and <code>java.sql.Date</code>)? Import one and write the other\'s fully qualified name.</li>
<li>Sub-packages are <b>not</b> special: <code>com.acme</code> and <code>com.acme.util</code> are as unrelated as two random packages for access purposes.</li>
<li>Avoid the <b>default (unnamed) package</b>: classes in it cannot be imported by classes in named packages.</li>
</ul>
<h4>6. Compile and run with packages</h4>
<p><code>javac -d out src/com/acme/shop/*.java</code> creates the folder tree under <code>out</code>. Run with the fully qualified name: <code>java -cp out com.acme.shop.Main</code> (not a file path, no <code>.class</code>).</p>`,
    clues: [
      '"Hide implementation details" / "prevent invalid state" → private fields, public validated methods (encapsulation)',
      '"Accessible only to classes in the same package" → no modifier (package-private)',
      '"Accessible to subclasses even in other packages" → protected (remember it also opens the package)',
      '"Can a top-level class be private?" → no: only public or package-private',
      '"Error: class X is public, should be declared in a file named X.java" → file name and public class must match',
      '"Two classes with the same name from different libraries" → packages + fully qualified names',
      '"Could not find or load main class" with packages → run with the FQN from the classpath root: java -cp out com.acme.Main'
    ],
    code: [`
      // File: src/com/acme/bank/Account.java
      package com.acme.bank;

      public class Account {
          private long balancePaise;             // private: only Account touches it directly
          String branchCode = "BLR01";           // package-private: com.acme.bank classes only
          protected final String owner;          // subclasses (any package) + this package
          public static final int MAX_DAILY_WITHDRAWALS = 5;   // anyone

          public Account(String owner) { this.owner = owner; }

          public void deposit(long paise) {
              if (paise <= 0) throw new IllegalArgumentException("deposit must be positive");
              balancePaise += paise;
          }

          public boolean withdraw(long paise) {
              if (paise <= 0 || paise > balancePaise) return false;   // rule enforced in ONE place
              balancePaise -= paise;
              return true;
          }

          public long balance() { return balancePaise; }   // read-only view, no setter

          protected void audit(String msg) { System.out.println("[audit " + owner + "] " + msg); }

          private void recalcInterest() { /* internal detail, free to change any time */ }
      }`, { lang: 'java', check: false, title: 'Another package: what compiles and what does not (needs the two-file package layout)', code: `
      // File: src/com/acme/app/Savings.java
      package com.acme.app;

      import com.acme.bank.Account;

      public class Savings extends Account {
          public Savings(String owner) { super(owner); }

          void monthEnd() {
              audit("month end for " + owner);    // OK: protected, inherited, used on 'this'
              deposit(100);                       // OK: public
              // balancePaise += 100;             // ERROR: private in Account
              // System.out.println(branchCode);  // ERROR: package-private, different package
              Account other = new Account("Zed");
              // other.audit("x");                // ERROR: protected access only through Savings references
          }
      }` }, { lang: 'bash', title: 'Compile and run a packaged program', code: `
      # Folder layout must mirror the package names
      # src/com/acme/bank/Account.java
      # src/com/acme/app/Savings.java
      # src/com/acme/app/Main.java

      javac -d out $(find src -name "*.java")    # -d creates out/com/acme/... for you
      java -cp out com.acme.app.Main              # fully qualified class name, no .class, no slashes

      # Single-file shortcut (Java 11+): compile in memory and run
      java src/com/acme/app/Hello.java` }],
    codeTitle: ['All four modifiers in one class', 'Access rules seen from a subclass in another package', 'javac -d and java -cp with packages'],
    viz: [
      {
        title: 'Access checker: who can see the member?',
        input: 'protected',
        inputLabel: 'Modifier to test: private, default, protected or public',
        gen: function (input) {
          var mod = String(input === undefined ? 'protected' : input).trim().toLowerCase();
          if (mod === 'package-private' || mod === 'none' || mod === '') mod = 'default';
          var levels = ['private', 'default', 'protected', 'public'];
          var rank = levels.indexOf(mod);
          if (rank < 0) throw new Error('Type one of: private, default, protected, public');
          var decl = (mod === 'default' ? '' : mod + ' ') + 'int secret;';
          var who = [
            { id: 'T', label: 'Teller (same pkg)', need: 1, why: 'same package <code>com.acme.bank</code>' },
            { id: 'S', label: 'Savings extends Account (other pkg)', need: 2, why: 'a <b>subclass</b> in another package, using the inherited member on itself' },
            { id: 'P', label: 'App (other pkg)', need: 3, why: 'an unrelated class in another package' }
          ];
          var nodes = [
            { id: 'A', label: 'Account: ' + decl, x: 30, y: 12, shape: 'box', w: 40 },
            { id: 'T', label: 'Teller', x: 12, y: 50, shape: 'box', w: 20 },
            { id: 'S', label: 'Savings extends Account', x: 50, y: 50, shape: 'box', w: 30 },
            { id: 'P', label: 'App', x: 86, y: 50, shape: 'box', w: 18 }
          ];
          var tags = { A: 'com.acme.bank', T: 'com.acme.bank', S: 'com.acme.app', P: 'com.acme.app' };
          var frames = [], ehl = {}, hl = { A: 'sel' }, rows = [];
          var code = 'package com.acme.bank;\npublic class Account {\n    ' + decl + '\n    void self() { secret++; }   // inside Account itself\n}';
          function push(narr, lineHl) {
            frames.push({ narr: narr, parts: [
              { type: 'code', label: 'The member under test', lang: 'java', code: code, hl: lineHl || { 3: 'cur' } },
              { type: 'graph', label: 'Packages and classes (arrow = tries to read secret)', directed: true, height: 62, nodes: nodes, edges: [['T', 'A'], ['S', 'A'], ['P', 'A']], hl: JSON.parse(JSON.stringify(hl)), ehl: JSON.parse(JSON.stringify(ehl)), tags: tags },
              { type: 'table', label: 'Access results so far', columns: ['From', 'Compiles?'], rows: rows.map(function (r) { return r.slice(); }) }
            ] });
          }
          push('The member is declared <b>' + (mod === 'default' ? 'with no modifier (package-private)' : mod) + '</b>. Let\'s test four places that try to use it.');
          rows.push(['Account itself', 'yes']);
          push('<b>Inside Account itself</b>: every access level, even private, is visible to its own class. <span class="c-g">Compiles.</span>', { 4: 'ok' });
          who.forEach(function (w) {
            var ok = rank >= w.need;
            hl[w.id] = ok ? 'ok' : 'bad';
            ehl[w.id + '-A'] = ok ? 'ok' : 'bad';
            rows.push([w.label, ok ? 'yes' : 'NO']);
            push('From <b>' + w.label + '</b>: ' + w.why + '. Needs at least <b>' + levels[w.need] + '</b>; we have <b>' + mod + '</b> &rarr; ' + (ok ? '<span class="c-g">compiles</span>.' : '<span class="c-r">compile error: secret has ' + mod + ' access in Account</span>.'));
          });
          var count = 1 + who.filter(function (w) { return rank >= w.need; }).length;
          push('Summary for <b>' + mod + '</b>: visible from ' + count + ' of 4 places. Try the other modifiers: each level adds exactly one more column of access (private &lt; default &lt; protected &lt; public).');
          return frames;
        }
      },
      {
        title: 'From package name to folder to running program',
        gen: function () {
          var src = 'package com.acme.shop;           // 1. declares the package\n\nimport java.util.List;           // 2. imports (java.lang is automatic)\nimport com.acme.util.Money;\n\npublic class Main {              // 3. public class => file Main.java\n    public static void main(String[] args) {\n        Money m = new Money(500);\n        System.out.println(List.of(m));\n    }\n}';
          function fr(narr, hl, cmd, table) {
            var parts = [{ type: 'code', label: 'src/com/acme/shop/Main.java', lang: 'java', code: src, hl: hl }];
            if (cmd) parts.push({ type: 'code', label: 'Terminal', lang: 'bash', code: cmd, hl: { 1: 'cur' } });
            if (table) parts.push({ type: 'table', label: 'Name → place on disk', columns: table[0], rows: table[1] });
            return { narr: narr, parts: parts };
          }
          var map1 = [['Thing', 'Value'], [['package', 'com.acme.shop'], ['simple name', 'Main'], ['fully qualified name', 'com.acme.shop.Main']]];
          var map2 = [['Source file', 'Compiled to'], [['src/com/acme/shop/Main.java', 'out/com/acme/shop/Main.class'], ['src/com/acme/util/Money.java', 'out/com/acme/util/Money.class']]];
          return [
            fr('Line 1, <code>package com.acme.shop;</code>, must be the first statement (only comments before it). It gives every class in this file the prefix <b>com.acme.shop</b>.', { 1: 'cur' }, null, map1),
            fr('The class is <code>public</code>, so the file <b>must</b> be named <code>Main.java</code>, and by convention it sits in the folder <code>src/com/acme/shop/</code>: one folder per dot.', { 6: 'cur' }, null, map1),
            fr('Imports are just <b>shortcuts for names</b>. <code>import com.acme.util.Money;</code> lets you write <code>Money</code> instead of <code>com.acme.util.Money</code>. They do not copy or load code, and they cost nothing at runtime.', { 3: 'ok', 4: 'ok', 8: 'cur' }),
            fr('Compile with <code>-d out</code>: javac writes each .class file into a folder tree that mirrors the package names.', {}, 'javac -d out src/com/acme/util/Money.java src/com/acme/shop/Main.java', map2),
            fr('Run with the <b>classpath root</b> (<code>-cp out</code>) and the <b>fully qualified name</b>. The JVM turns dots into folders: com.acme.shop.Main → out/com/acme/shop/Main.class.', { 7: 'cur' }, 'java -cp out com.acme.shop.Main', map2),
            fr('Common mistakes: <code>java out/com/acme/shop/Main</code> (a path, not a class name) or <code>cd out/com/acme/shop; java Main</code> (wrong root). Both give <span class="c-r">Error: Could not find or load main class</span>.', {}, 'java out/com/acme/shop/Main     # WRONG: path instead of class name', null)
          ];
        }
      }
    ],
    examples: [
      { title: 'Encapsulation saves you during a refactor', html: `<p>Version 1 stores <code>double balance</code> in rupees. Rounding errors appear, so version 2 stores <code>long paise</code>. Because the field was <b>private</b> and callers used <code>deposit()</code>/<code>balance()</code>, nothing outside the class changes. If the field had been public, every caller in the codebase would break.</p>`, code: `
        class Wallet {
            private long paise;                                   // v2 internal representation
            public void depositRupees(double rupees) { paise += Math.round(rupees * 100); }
            public double balanceRupees() { return paise / 100.0; }   // same public API as v1
        }` },
      { title: 'Getter that leaks a mutable array (and the fix)', html: `<p>A private field is not truly private if a getter returns the <b>same array or list</b>: the caller can modify your internals. Return a copy, or an unmodifiable view.</p>`, code: `
        class Team {
            private final List<String> members = new ArrayList<>();
            public void add(String m) { members.add(m); }
            public List<String> leakyMembers() { return members; }                 // caller can clear() it!
            public List<String> members() { return List.copyOf(members); }           // safe snapshot
        }` },
      { title: 'Two Date classes: import one, fully qualify the other', html: `<p>Both <code>java.util</code> and <code>java.sql</code> have a class named <code>Date</code>. Importing both with single-type imports is a compile error. Import one, use the full name for the other.</p>`, code: `
        import java.util.Date;
        class Dates {
            Date utilDate = new Date();                                        // java.util.Date
            java.sql.Date sqlDate = java.sql.Date.valueOf("2026-01-15");      // fully qualified
        }` },
      { title: 'Package-private as an internal API', html: `<p>Libraries keep helper classes package-private so users cannot depend on them. For example, a <code>Parser</code> class is public, while its <code>Tokenizer</code> helper has no modifier: code in the same package can use it, the rest of the world cannot, and the library can rewrite it freely. JPMS modules (java14) add a coarser layer on top: only <code>exports</code>ed packages are visible outside the module, even for public classes.</p>`, code: `
        // package com.acme.parse;
        public class Parser {
            public List<String> parse(String s) { return new Tokenizer(s).tokens(); }
        }
        class Tokenizer {                       // package-private: invisible outside com.acme.parse
            private final String s;
            Tokenizer(String s) { this.s = s; }
            List<String> tokens() { return Arrays.asList(s.trim().split("\\\\s+")); }
        }` }
    ],
    deepDive: `<p><b>Access is checked twice.</b> javac rejects illegal access at compile time, and the JVM checks again when it links a class (an <code>IllegalAccessError</code> appears if you compile against one version of a library and run against another where a member became private). Reflection can bypass checks with <code>setAccessible(true)</code>, but since Java 16/17 strong encapsulation of JDK internals (JEP 396, JEP 403) blocks that for JDK packages unless you <code>--add-opens</code>.</p>
<p><b>Private and nested classes.</b> A nested class can read its outer class\'s private members and vice versa. Before Java 11 javac generated hidden "access$000" bridge methods for this; Java 11 introduced <b>nestmates</b> (JEP 181) so the JVM itself allows private access within a nest, with no bridges.</p>
<p><b>Overriding and access.</b> An override may not <b>reduce</b> visibility (a public method cannot be overridden as protected), because code using the parent type would break. Private methods are not inherited, so a same-named method in a subclass is a brand-new method, not an override.</p>
<p><b>Packages are not hierarchical for access.</b> <code>com.acme</code> cannot see package-private members of <code>com.acme.internal</code>. Split packages (the same package in two JARs) used to work on the classpath but are forbidden between named modules in JPMS.</p>
<p><b>Modern Java (2025+).</b> JDK 25 finalised <b>compact source files and instance main methods</b> (JEP 512): a file can contain just <code>void main() { IO.println("hi"); }</code>, placed in an implicit unnamed class, great for learning and scripts. JDK 25 also finalised <b>module import declarations</b> (JEP 511): <code>import module java.base;</code> imports every exported package of a module at once. Interviews on Java 21 still expect the classic <code>public static void main(String[] args)</code> and explicit imports.</p>
<p><b>Design guidance:</b> minimise accessibility (Effective Java Item 15), keep public classes\' fields private (Item 16), make classes package-private unless they are part of the API, and use <code>final</code> classes or sealed hierarchies to control extension.</p>`,
    aiEra: `<p><b>What AI changes:</b> code generators tend to make everything <code>public</code> (it always compiles), add getters and setters for every field, and return internal collections directly. The result compiles and passes tests, but has no encapsulation: any part of the system can put the object into an invalid state.</p>
<p><b>Use AI as a partner:</b> <code>"Reduce every member in this package to the narrowest access level that still compiles; list each change and why."</code> or <code>"Find getters that return mutable internal state and fix them with defensive copies."</code> Ask it to explain a "Could not find or load main class" error with your exact folder tree.</p>
<p><b>Where AI goes wrong:</b> mixing up protected and package-private (forgetting protected includes the package), claiming sub-packages can see parent package-private members, suggesting <code>setAccessible(true)</code> hacks that fail on modern JDKs, and inventing wrong <code>java -cp</code> commands. <b>What you must still own:</b> the 4×4 access table, the protected subtlety, how packages map to folders and class names, and the design judgement of what should be public at all.</p>`,
    problems: [{
      title: 'Encapsulate a Leaky Inventory',
      level: 'Medium', tags: ['access modifiers', 'encapsulation', 'defensive copy'], companies: ['Microsoft', 'Walmart', 'Atlassian'],
      statement: `<p>This class is used across a large codebase and bugs keep appearing (negative sizes, items vanishing, crashes):</p>
<pre>public class Inventory {
    public String[] items = new String[10];
    public int size;
}</pre>
<p>Rewrite it so that callers can only: <code>add(String item)</code> (non-blank, grows automatically), <code>get(int index)</code> (bounds-checked), <code>size()</code>, and <code>items()</code> (a snapshot that cannot affect the inventory). No caller may ever put the object into an invalid state.</p>`,
      constraints: `Up to 10<sup>6</sup> adds; amortised O(1) add; O(1) get.`,
      example: `<p>add("pen"), add("book") → size ${H.c('g', '2')}. <code>String[] snap = inv.items(); snap[0] = "HACKED";</code> → <code>inv.get(0)</code> is still ${H.c('g', '"pen"')}. <code>inv.get(5)</code> → ${H.c('r', 'IndexOutOfBoundsException')}. Why? Fields are private, and items() returns a copy.</p>`,
      brute: {
        why: `<p>With public fields, any caller can write <code>inv.size = -3</code>, <code>inv.items = null</code>, or overwrite slots beyond <code>size</code>. Adding "validation" by asking every caller to check before writing never works: one forgotten check corrupts the object. And returning the internal array (even from a getter) lets callers mutate it.</p>`,
        code: `
        class InventoryLeaky {
            public String[] items = new String[10];
            public int size;
            public static void main(String[] args) {
                InventoryLeaky inv = new InventoryLeaky();
                inv.items[inv.size++] = "pen";
                inv.size = -3;               // nothing stops this
                inv.items = null;            // or this: the next add crashes with NullPointerException
                System.out.println(inv.size);
            }
        }`
      },
      mcq: { q: 'Which change alone guarantees callers cannot corrupt <code>size</code>?', options: ['Make size private and change it only inside add()', 'Add a comment "do not modify"', 'Make size final', 'Make the class final'], answer: 0, explain: 'Only access control enforces the rule. final would stop add() from updating it too; a final class only prevents subclassing.' },
      hints: [
        `<p>Hint 1: Make both fields <code>private</code>. Now the only way to change them is through methods you write, so the rules live in one place.</p>`,
        `<p>Hint 2: In <code>add</code>, validate the item, grow the array with <code>Arrays.copyOf(items, items.length * 2)</code> when full, then store and increment size.</p>`,
        `<p>Hint 3: <code>items()</code> must return <code>Arrays.copyOf(items, size)</code>, a fresh array of exactly the used part, so callers can mutate it freely. Use <code>Objects.checkIndex(index, size)</code> in <code>get</code> to throw on bad indexes.</p>`
      ],
      tests: { sig: 'string[] int -> string', fn: 'invCheck',
        harness: { java: `class Check { static String invCheck(String[] items, int idx) { Inventory v = new Inventory(); int rej = 0; for (String s : items) { try { v.add(s); } catch (IllegalArgumentException e) { rej++; } } String[] snap = v.items(); if (snap.length > 0) snap[0] = "HACKED"; String g; try { g = v.get(idx); } catch (IndexOutOfBoundsException e) { g = "IOOBE"; } boolean intact = v.size() == 0 || !"HACKED".equals(v.get(0)); return "size=" + v.size() + " rejected=" + rej + " snap=" + snap.length + " get=" + g + " copy=" + intact; } }`, python: `def inv_check(items, idx):
    v = Inventory()
    rej = 0
    for s in items:
        try:
            v.add(s)
        except ValueError:
            rej += 1
    snap = v.items()
    if snap:
        snap[0] = "HACKED"
    try:
        g = v.get(idx)
    except IndexError:
        g = "IOOBE"
    intact = v.size() == 0 or v.get(0) != "HACKED"
    return "size=%d rejected=%d snap=%d get=%s copy=%s" % (v.size(), rej, len(snap), g, "true" if intact else "false")
` }, cases: [
        [[["pen","book"],0],"size=2 rejected=0 snap=2 get=pen copy=true"],
        [[["pen","book"],5],"size=2 rejected=0 snap=2 get=IOOBE copy=true"],
        [[[],0],"size=0 rejected=0 snap=0 get=IOOBE copy=true"],
        [[["a"],-1],"size=1 rejected=0 snap=1 get=IOOBE copy=true"],
        [[["a",""," ","b"],1],"size=2 rejected=2 snap=2 get=b copy=true"],
        [[["x"],0],"size=1 rejected=0 snap=1 get=x copy=true"],
        [[["a","b"],2],"size=2 rejected=0 snap=2 get=IOOBE copy=true"],
        [[["a","b","c","d","e","f","g","h","i","j"],9],"size=10 rejected=0 snap=10 get=j copy=true"],
        [[["a","b","c","d","e","f","g","h","i","j","k"],10],"size=11 rejected=0 snap=11 get=k copy=true"],
        [[["a","b","c","d","e","f","g","h","i","j","k"],11],"size=11 rejected=0 snap=11 get=IOOBE copy=true"],
        [[["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v"],21],"size=22 rejected=0 snap=22 get=v copy=true"],
        [[[null,"a"],0],"size=1 rejected=1 snap=1 get=a copy=true"],
        [[["\t","a"],0],"size=1 rejected=1 snap=1 get=a copy=true"],
        [[{"$rep":"x","n":1000000},999999],"size=1000000 rejected=0 snap=1000000 get=x copy=true"],
        [[{"$rep":"x","n":1000000},1000000],"size=1000000 rejected=0 snap=1000000 get=IOOBE copy=true"]
      ] },
      solution: {
        approach: `<p>Private fields + public methods that enforce the invariants (0 ≤ size ≤ items.length, no null/blank items in 0..size-1). Doubling growth gives amortised O(1) adds. Defensive copying on the way out stops aliasing: the caller gets their own array, not ours.</p>`,
        code: `
        public class Inventory {
            private String[] items = new String[10];
            private int size;                                   // invariant: 0 <= size <= items.length

            public void add(String item) {
                if (item == null || item.isBlank()) throw new IllegalArgumentException("item required");
                if (size == items.length) items = Arrays.copyOf(items, items.length * 2);   // grow
                items[size++] = item;
            }

            public String get(int index) {
                Objects.checkIndex(index, size);                // throws IndexOutOfBoundsException
                return items[index];
            }

            public int size() { return size; }

            public String[] items() { return Arrays.copyOf(items, size); }   // defensive copy

            public static void main(String[] args) {
                Inventory inv = new Inventory();
                inv.add("pen");
                inv.add("book");
                String[] snap = inv.items();
                snap[0] = "HACKED";                             // only changes the copy
                System.out.println(inv.get(0) + " " + inv.size());   // pen 2
                try { inv.get(5); } catch (IndexOutOfBoundsException e) { System.out.println("bad index"); }
            }
        }`,
        alt: [{ lang: 'python', code: `class Inventory:\n    def __init__(self):\n        self._items = []          # leading underscore = "private by convention" (Python has no access modifiers)\n    def add(self, item):\n        if not item or not item.strip():\n            raise ValueError("item required")\n        self._items.append(item)\n    def get(self, i):\n        if not 0 <= i < len(self._items):\n            raise IndexError(i)\n        return self._items[i]\n    def size(self):\n        return len(self._items)\n    def items(self):\n        return list(self._items)  # defensive copy\n\ninv = Inventory(); inv.add("pen"); inv.add("book")\nsnap = inv.items(); snap[0] = "HACKED"\nprint(inv.get(0), inv.size())`, run: true }],
        dry: { head: ['operation', 'items (internal)', 'size', 'result'], rows: [
          ['add("pen")', '[pen, null ×9]', '1', '-'],
          ['add("book")', '[pen, book, null ×8]', '2', '-'],
          ['snap = items(); snap[0]="HACKED"', 'unchanged [pen, book, ...]', '2', 'snap = [HACKED, book]'],
          ['get(0)', '-', '2', '<span class="c-g">pen</span>'],
          ['get(5)', '-', '2', '<span class="c-r">IndexOutOfBoundsException</span>'],
          ['inv.size = -3 (from outside)', '-', '-', '<span class="c-r">compile error: size has private access</span>']
        ] },
        complexity: `<p>add: amortised O(1) (doubling); get and size: O(1); items(): O(size) for the copy. Extra space O(n). In real code you would wrap an <code>ArrayList</code> and return <code>List.copyOf</code>.</p>`,
        followUps: ['Return an unmodifiable view instead of a copy. What is the trade-off?', 'Should Inventory be final? Why might subclassing break the invariant?', 'Make add() thread-safe without making get() slow']
      }
    }]
  });

  /* ======================================================================
     PRACTICE (Easy → Medium → Hard)
     ====================================================================== */
  practice.push({
    title: 'Book Class with Constructor and toString',
    level: 'Easy', tags: ['class design', 'constructor', 'toString'], companies: ['TCS', 'Infosys'],
    statement: `<p>Create a <code>Book</code> class with private fields <code>title</code>, <code>author</code> and <code>pages</code>. Provide a constructor that rejects blank title/author and non-positive pages, a method <code>isLong()</code> (true when pages &gt; 300), and <code>toString()</code> returning <code>"Title by Author (N pages)"</code>.</p>`,
    constraints: `1 ≤ pages ≤ 10<sup>5</sup>; title and author non-blank.`,
    example: `<p><code>new Book("Clean Code", "Robert Martin", 464)</code> → <code>toString()</code> = ${H.c('g', '"Clean Code by Robert Martin (464 pages)"')}, <code>isLong()</code> = ${H.c('g', 'true')} because 464 &gt; 300. <code>new Book("", "X", 10)</code> → ${H.c('r', 'IllegalArgumentException')}.</p>`,
    brute: {
      why: `<p>Without a constructor, callers create an empty Book and set public fields one by one. Nothing stops a Book with a null title or −5 pages, and printing the object shows something like <code>Book@1b6d3586</code> (class name + hash) because <code>toString()</code> was not overridden.</p>`,
      code: `
      class BookBrute {
          public String title, author;
          public int pages;
          public static void main(String[] args) {
              BookBrute b = new BookBrute();
              b.pages = -5;                      // invalid, but allowed
              System.out.println(b);             // BookBrute@<hash>: unreadable
          }
      }`
    },
    mcq: { q: 'What does <code>System.out.println(book)</code> call behind the scenes?', options: ['book.toString()', 'book.print()', 'book.hashCode() only', 'Nothing: it prints the fields automatically'], answer: 0, explain: 'println(Object) calls String.valueOf(obj), which calls obj.toString(). Object\'s default prints ClassName@hexHash, so override it.' },
    hints: [
      `<p>Hint 1: The constructor is the gatekeeper: validate all three arguments before assigning, and throw IllegalArgumentException with a clear message.</p>`,
      `<p>Hint 2: Make fields <code>private final</code>: a book\'s title never changes after creation, and nobody outside can corrupt it.</p>`,
      `<p>Hint 3: Override <code>public String toString()</code> with <code>@Override</code> so the compiler checks the signature. Use string concatenation or <code>String.format</code>.</p>`
    ],
    tests: { sig: 'string string int -> string', fn: 'bookCheck',
      harness: { java: `class Check { static String bookCheck(String t, String a, int p) { try { Book b = new Book(t, a, p); return b + " long=" + b.isLong(); } catch (IllegalArgumentException e) { return "IAE"; } } }` }, cases: [
      [["Clean Code","Robert Martin",464],"Clean Code by Robert Martin (464 pages) long=true"],
      [["","X",10],"IAE"],
      [["T","A",1],"T by A (1 pages) long=false"],
      [["T","A",300],"T by A (300 pages) long=false"],
      [["T","A",301],"T by A (301 pages) long=true"],
      [["T","A",0],"IAE"],
      [["T","A",-5],"IAE"],
      [["T","  ",10],"IAE"],
      [[" ","A",10],"IAE"],
      [["T","",10],"IAE"],
      [["T","A",100000],"T by A (100000 pages) long=true"],
      [["A Tale of Two Cities","Charles Dickens",489],"A Tale of Two Cities by Charles Dickens (489 pages) long=true"]
    ] },
    solution: {
      approach: `<p>Private final fields, one validating constructor, a tiny query method and an overridden toString. This is the template for most value-like classes before you learn records.</p>`,
      code: `
      class Book {
          private final String title;
          private final String author;
          private final int pages;

          Book(String title, String author, int pages) {
              if (title == null || title.isBlank()) throw new IllegalArgumentException("title required");
              if (author == null || author.isBlank()) throw new IllegalArgumentException("author required");
              if (pages <= 0) throw new IllegalArgumentException("pages must be positive");
              this.title = title;
              this.author = author;
              this.pages = pages;
          }

          boolean isLong() { return pages > 300; }

          @Override
          public String toString() { return title + " by " + author + " (" + pages + " pages)"; }

          public static void main(String[] args) {
              Book b = new Book("Clean Code", "Robert Martin", 464);
              System.out.println(b + " long=" + b.isLong());
          }
      }`,
      dry: { head: ['call', 'checks', 'result'], rows: [['new Book("Clean Code", "Robert Martin", 464)', 'all pass', 'object created'], ['b.isLong()', '464 &gt; 300', 'true'], ['new Book("", "X", 10)', '<span class="c-r">title blank</span>', 'IllegalArgumentException']] },
      complexity: `<p>O(1) for everything except toString, which is O(length of the strings).</p>`,
      followUps: ['Turn Book into a record. What do you gain and lose?', 'Add equals/hashCode so two books with the same title and author are equal']
    }
  });

  practice.push({
    title: 'Predict the Output: Default Field Values',
    level: 'Easy', tags: ['default values', 'output prediction'], companies: ['Accenture', 'Capgemini'],
    statement: `<p>What does this print?</p>
<pre>class Def { int i; boolean f; String s; double d; long l; }
Def d = new Def();
System.out.println(d.i + " " + d.f + " " + d.s + " " + d.d + " " + d.l);</pre>
<p>Then explain why the same idea with <b>local</b> variables does not compile.</p>`,
    constraints: `Standard Java 21.`,
    example: `<p>Output: ${H.c('g', '0 false null 0.0 0')}. Fields are zero-initialised when the object is allocated: numbers 0 (double prints as 0.0), boolean false, references null. Locals have no defaults, so <code>int x; print(x);</code> is a ${H.c('r', 'compile error')}.</p>`,
    brute: {
      why: `<p>Guessing "garbage values" (as in C) or "compile error" for fields is the common wrong answer. In Java, the JVM always zeroes fresh object memory, so fields have predictable defaults; only locals must be definitely assigned before use.</p>`,
      code: `
      class DefGuess {
          int i; boolean f; String s; double d; long l;
          public static void main(String[] args) {
              DefGuess d = new DefGuess();
              // Wrong guess: "random garbage" like in C. Java zeroes all fields.
              System.out.println(d.i + " " + d.f + " " + d.s + " " + d.d + " " + d.l);
          }
      }`
    },
    mcq: { q: 'What is the default value of a <code>char</code> field?', options: ["'\\u0000' (code 0)", "' ' (a space)", "'0' (the digit zero)", 'null'], answer: 0, explain: 'char is numeric under the hood; its default is the character with code 0, which prints as an invisible character.' },
    hints: [
      `<p>Hint 1: Separate fields (part of an object on the heap) from locals (part of a stack frame). Only fields get automatic defaults.</p>`,
      `<p>Hint 2: Numeric defaults are 0 of their type: double 0.0, long 0. boolean is false. Any reference type, including String, is null.</p>`,
      `<p>Hint 3: String concatenation turns null into the text "null", so printing a null String field does not crash; calling a method on it (<code>d.s.length()</code>) would throw NullPointerException.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: "", stdout: "0 false null 0.0 0\n0" }
    ] },
    solution: {
      approach: `<p>Object allocation zeroes all instance fields, so the line prints each type\'s default. The compiler\'s "definite assignment" analysis forbids reading locals before assignment, which is why locals need explicit initial values.</p>`,
      code: `
      class Def {
          int i; boolean f; String s; double d; long l;
          public static void main(String[] args) {
              Def d = new Def();
              System.out.println(d.i + " " + d.f + " " + d.s + " " + d.d + " " + d.l);   // 0 false null 0.0 0
              int local = 0;               // locals MUST be assigned before use
              System.out.println(local);   // 0
          }
      }`,
      dry: { head: ['field', 'type', 'default', 'printed as'], rows: [['i', 'int', '0', '0'], ['f', 'boolean', 'false', 'false'], ['s', 'String', 'null', 'null'], ['d', 'double', '0.0', '0.0'], ['l', 'long', '0L', '0']] },
      complexity: `<p>O(1). The interesting cost is conceptual: zeroing is done by the allocator (often in bulk for a TLAB), so defaults are essentially free.</p>`,
      followUps: ['What about static fields? (same defaults)', 'What about array elements of new int[3] and new String[3]?']
    }
  });

  practice.push({
    title: 'Predict the Output: Three Cups',
    level: 'Easy', tags: ['references', 'aliasing', 'garbage collection'], companies: ['Amazon', 'Wipro'],
    statement: `<p>Predict both lines, and say how many objects are eligible for garbage collection at the end of main.</p>
<pre>class Cup { int ml; Cup(int ml) { this.ml = ml; } }

Cup a = new Cup(100);
Cup b = a;
Cup c = new Cup(100);
b.ml += 50;
System.out.println(a.ml + " " + (a == b) + " " + (a == c));
c = b;
c.ml = 0;
System.out.println(a.ml + " " + b.ml);</pre>`,
    constraints: `Count objects created with <code>new</code> only.`,
    example: `<p>Output:</p><pre>150 true false\n0 0</pre><p>a and b are ${H.c('b', 'aliases')} of cup #1; c is a different cup #2 with equal contents, so <code>==</code> is false. After <code>c = b</code>, all three point to #1, so <code>c.ml = 0</code> changes what a and b see. Cup #2 has no arrows left: ${H.c('r', '1 object eligible for GC')}.</p>`,
    brute: {
      why: `<p>Treating variables as boxes that hold their own copy of a cup ("b = a copies the cup") predicts <code>100 true false</code> or <code>100 150</code>. In Java, object variables hold arrows; assignment copies arrows. Only drawing arrows gives the right answer.</p>`,
      code: `
      class CupsWrongModel {
          public static void main(String[] args) {
              // Wrong model: pretend each variable has its own copy (like primitives)
              int a = 100, b = a, c = 100;
              b += 50;
              System.out.println(a + " " + (a == b) + " " + (a == c));   // 100 false true: NOT what objects do
          }
      }`
    },
    mcq: { q: 'After <code>c = b;</code> which cup does c point to?', options: ['The cup created first (#1)', 'The cup created second (#2)', 'A new copy of #1', 'null'], answer: 0, explain: 'b points at #1 (it was assigned from a), and assignment copies that arrow into c.' },
    hints: [
      `<p>Hint 1: Draw two cups on the heap (#1 for the first new, #2 for the second) and three arrows from a, b, c.</p>`,
      `<p>Hint 2: <code>==</code> on objects compares arrows (identity). Equal contents in different objects is still false.</p>`,
      `<p>Hint 3: For GC, at the end check each cup: does any variable still point at it? Cup #2 lost its only arrow at <code>c = b</code>.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: "", stdout: "150 true false\n0 0" }
    ] },
    solution: {
      approach: `<p>Trace arrows: a,b → #1; c → #2. b.ml += 50 changes #1 to 150. Print 150, true (same object), false (different objects). Then c → #1, set #1 to 0; a.ml and b.ml both read #1 → 0 0. Cup #2 is unreachable: 1 eligible object.</p>`,
      code: `
      class Cups {
          static class Cup { int ml; Cup(int ml) { this.ml = ml; } }
          public static void main(String[] args) {
              Cup a = new Cup(100);      // #1
              Cup b = a;                 // alias of #1
              Cup c = new Cup(100);      // #2
              b.ml += 50;                // #1 = 150
              System.out.println(a.ml + " " + (a == b) + " " + (a == c));   // 150 true false
              c = b;                     // #2 loses its last arrow
              c.ml = 0;                  // #1 = 0
              System.out.println(a.ml + " " + b.ml);                        // 0 0
          }
      }`,
      dry: { head: ['after', 'a', 'b', 'c', '#1.ml', '#2.ml'], rows: [['c = new Cup(100)', '#1', '#1', '#2', '100', '100'], ['b.ml += 50', '#1', '#1', '#2', '150', '100'], ['c = b', '#1', '#1', '#1', '150', '100 (unreachable)'], ['c.ml = 0', '#1', '#1', '#1', '0', '-']] },
      complexity: `<p>O(1). Two objects created, one eligible for GC at the end.</p>`,
      followUps: ['Add Cup d = c; c = null; How many are eligible now?', 'How would you compare cups by content? (equals)']
    }
  });

  practice.push({
    title: 'Temperature Utility Class',
    level: 'Easy', tags: ['static methods', 'private constructor', 'constants'], companies: ['Oracle', 'SAP'],
    statement: `<p>Write a utility class <code>Temperatures</code> with static methods <code>cToF(double c)</code>, <code>fToC(double f)</code> and <code>isFreezingC(double c)</code>, and a constant <code>ABSOLUTE_ZERO_C = -273.15</code>. Conversions below absolute zero must throw. Nobody should be able to create a <code>Temperatures</code> object.</p>`,
    constraints: `Use F = C × 9/5 + 32. <code>isFreezingC(c)</code> is true when c ≤ 0. A conversion whose Celsius result is below ABSOLUTE_ZERO_C throws IllegalArgumentException. Inputs within ±10<sup>6</sup>.`,
    example: `<p><code>Temperatures.cToF(100)</code> → ${H.c('g', '212.0')}; <code>fToC(32)</code> → ${H.c('g', '0.0')}; <code>isFreezingC(-3)</code> → ${H.c('g', 'true')}; <code>new Temperatures()</code> → ${H.c('r', 'compile error (private constructor)')}.</p>`,
    brute: {
      why: `<p>Writing these as instance methods forces callers to do <code>new Temperatures().cToF(100)</code>: a pointless object per call, and nothing communicates that the class has no state. Leaving the default constructor public also lets people instantiate a class that should be a pure toolbox.</p>`,
      code: `
      class TemperaturesBrute {
          double cToF(double c) { return c * 9 / 5 + 32; }        // instance method, no state used
          public static void main(String[] args) {
              System.out.println(new TemperaturesBrute().cToF(100));   // object created just to call a function
          }
      }`
    },
    mcq: { q: 'Why make the constructor private in a utility class?', options: ['To prevent creating pointless instances', 'To make methods faster', 'Because static methods require it', 'To allow inheritance'], answer: 0, explain: 'All behaviour is static, so instances are meaningless. A private constructor (often throwing AssertionError) makes that explicit and also prevents subclassing.' },
    hints: [
      `<p>Hint 1: The methods use only their parameters, no fields: a strong sign they should be <code>static</code>.</p>`,
      `<p>Hint 2: Declare <code>static final double ABSOLUTE_ZERO_C = -273.15;</code> and use it in the validation.</p>`,
      `<p>Hint 3: Add <code>private Temperatures() { throw new AssertionError(); }</code> and mark the class <code>final</code>. Beware integer division: write <code>9.0 / 5</code> or keep a double on the left.</p>`
    ],
    tests: { sig: 'double double -> double[]', fn: 'tempCheck', cmp: 'float',
      harness: { java: `class Check { static double[] tempCheck(double c, double f) { double a, b; try { a = Temperatures.cToF(c); } catch (IllegalArgumentException e) { a = -1e18; } try { b = Temperatures.fToC(f); } catch (IllegalArgumentException e) { b = -1e18; } return new double[]{a, b, Temperatures.isFreezingC(c) ? 1 : 0, Temperatures.ABSOLUTE_ZERO_C}; } }` }, cases: [
      [[100,32],[212,0,0,-273.15]],
      [[-3,212],[26.6,100,1,-273.15]],
      [[0,0],[32,-17.77777777777778,1,-273.15]],
      [[1,50],[33.8,10,0,-273.15]],
      [[-273.15,-459.67],[-459.66999999999996,-273.15,1,-273.15]],
      [[-273.16,-459.68],[-1000000000000000000,-1000000000000000000,1,-273.15]],
      [[-300,-500],[-1000000000000000000,-1000000000000000000,1,-273.15]],
      [[1000000,1000000],[1800032,555537.7777777778,0,-273.15]],
      [[-40,-40],[-40,-40,1,-273.15]],
      [[37,98.6],[98.6,37,0,-273.15]],
      [[0.1,32.1],[32.18,0.055555555555556344,0,-273.15]],
      [[-0.1,31.9],[31.82,-0.055555555555556344,1,-273.15]],
      [[-273,-459.4],[-459.4,-273,1,-273.15]],
      [[20,68],[68,20,0,-273.15]]
    ] },
    solution: {
      approach: `<p>A final class with a private constructor, a public constant, and pure static functions that validate input. Callers write <code>Temperatures.cToF(x)</code>, just like <code>Math.max</code>.</p>`,
      code: `
      final class Temperatures {
          static final double ABSOLUTE_ZERO_C = -273.15;

          private Temperatures() { throw new AssertionError("utility class"); }

          static double cToF(double c) {
              if (c < ABSOLUTE_ZERO_C) throw new IllegalArgumentException("below absolute zero: " + c);
              return c * 9.0 / 5.0 + 32.0;
          }

          static double fToC(double f) {
              double c = (f - 32.0) * 5.0 / 9.0;
              if (c < ABSOLUTE_ZERO_C) throw new IllegalArgumentException("below absolute zero: " + f + "F");
              return c;
          }

          static boolean isFreezingC(double c) { return c <= 0.0; }

          public static void main(String[] args) {
              System.out.println(cToF(100) + " " + fToC(32) + " " + isFreezingC(-3));   // 212.0 0.0 true
          }
      }`,
      dry: { head: ['call', 'computation', 'result'], rows: [['cToF(100)', '100 × 9/5 + 32', '212.0'], ['fToC(32)', '(32 − 32) × 5/9', '0.0'], ['cToF(-300)', '-300 &lt; -273.15', '<span class="c-r">throws</span>']] },
      complexity: `<p>O(1) per call, no allocation.</p>`,
      followUps: ['Why does c * 9 / 5 work with a double c but break with an int c?', 'Would an enum TemperatureUnit with methods be a better design?']
    }
  });

  practice.push({
    title: 'Predict the Output: What Survives a Method Call?',
    level: 'Medium', tags: ['pass-by-value', 'String immutability', 'output prediction'], companies: ['Goldman Sachs', 'Morgan Stanley', 'Amazon'],
    statement: `<p>Predict the output.</p>
<pre>static void change(int n, int[] arr, StringBuilder sb, String s) {
    n = 99;
    arr[0] = 99;
    sb.append("!");
    s = s + "!";
    arr = new int[]{-1};
}
int n = 1; int[] arr = {1};
StringBuilder sb = new StringBuilder("hi"); String s = "hi";
change(n, arr, sb, s);
System.out.println(n + " " + arr[0] + " " + sb + " " + s);</pre>`,
    constraints: `Single thread.`,
    example: `<p>Output: ${H.c('g', '1 99 hi! hi')}. n: copy of a primitive changed (invisible). arr[0]: mutation through a shared arrow (visible); the later <code>arr = new int[]{-1}</code> only moves the local arrow. sb: mutated (visible). s: <code>s + "!"</code> builds a <b>new</b> String and reassigns the local copy (invisible).</p>`,
    brute: {
      why: `<p>The "objects are passed by reference" mental model predicts <code>1 -1 hi! hi!</code>: it thinks reassigning arr and s inside the method changes the caller. Java copies every argument (the number or the arrow), so only <b>mutations</b> of shared objects travel back.</p>`,
      code: `
      class WrongModel {
          // If Java were pass-by-reference (it is NOT), the caller would see arr = {-1} and s = "hi!".
          public static void main(String[] args) {
              System.out.println("1 -1 hi! hi!   <- wrong prediction");
          }
      }`
    },
    mcq: { q: 'Why does <code>s</code> stay "hi"?', options: ['Strings are immutable, so s + "!" creates a new String and only the local copy of the reference is reassigned', 'Strings are passed by value as copies of the characters', 'The compiler optimises the line away', 'StringBuilder and String share a buffer'], answer: 0, explain: 'You cannot mutate a String. Every "change" is a new object, and assigning it to a parameter only changes the method\'s own copy of the reference.' },
    hints: [
      `<p>Hint 1: For each parameter ask one question: did the method <b>mutate the shared object</b> or <b>reassign its local copy</b>?</p>`,
      `<p>Hint 2: Order matters for arr: the mutation <code>arr[0] = 99</code> happens on the caller\'s array <b>before</b> the local arrow is moved to a new array.</p>`,
      `<p>Hint 3: String has no mutating methods. <code>s + "!"</code> always returns a new String. StringBuilder.append mutates the same builder.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: "", stdout: "1 99 hi! hi" }
    ] },
    solution: {
      approach: `<p>Classify each line: n = 99 (reassign primitive copy, invisible); arr[0] = 99 (mutate shared array, visible); sb.append (mutate shared builder, visible); s = s + "!" (new String, reassign local, invisible); arr = new int[] (reassign local, invisible). Result: 1 99 hi! hi.</p>`,
      code: `
      class PassByValue {
          static void change(int n, int[] arr, StringBuilder sb, String s) {
              n = 99;                  // local copy of a number
              arr[0] = 99;             // mutates the caller's array
              sb.append("!");          // mutates the caller's builder
              s = s + "!";             // new String, local reassignment
              arr = new int[]{-1};     // local reassignment
          }
          public static void main(String[] args) {
              int n = 1; int[] arr = {1};
              StringBuilder sb = new StringBuilder("hi"); String s = "hi";
              change(n, arr, sb, s);
              System.out.println(n + " " + arr[0] + " " + sb + " " + s);   // 1 99 hi! hi
          }
      }`,
      dry: { head: ['line in change()', 'kind', 'caller sees?'], rows: [['n = 99', 'reassign primitive copy', 'no'], ['arr[0] = 99', 'mutate shared array', '<span class="c-g">yes</span>'], ['sb.append("!")', 'mutate shared builder', '<span class="c-g">yes</span>'], ['s = s + "!"', 'new String + reassign', 'no'], ['arr = new int[]{-1}', 'reassign local', 'no']] },
      complexity: `<p>O(1) apart from the string concatenation (O(length)).</p>`,
      followUps: ['How would you return two changed values from a method in Java? (record, array, holder object)', 'What if change() received a List and called list = List.of()?']
    }
  });

  practice.push({
    title: 'Deep-Copy Constructor for a Playlist',
    level: 'Medium', tags: ['copy constructor', 'defensive copy', 'references'], companies: ['Spotify', 'Adobe', 'Microsoft'],
    statement: `<p>A <code>Playlist</code> has a <code>name</code> and a <code>List&lt;String&gt; songs</code>. Write:</p>
<ul><li><code>Playlist(String name, List&lt;String&gt; songs)</code> that does not keep a reference to the caller\'s list,</li><li>a copy constructor <code>Playlist(Playlist other, String newName)</code> producing an independent copy,</li><li><code>add(String song)</code> and <code>songs()</code> returning a read-only view.</li></ul>
<p>Changing the original after copying must not affect the copy, and vice versa.</p>`,
    constraints: `Up to 10<sup>5</sup> songs. Songs are Strings (immutable).`,
    example: `<p>p1 = ("Road", [A, B]); p2 = new Playlist(p1, "Road copy"); p1.add("C") → p1 songs ${H.c('g', '[A, B, C]')}, p2 songs ${H.c('g', '[A, B]')}. Also: the caller\'s original list passed to the constructor can be changed later without affecting p1.</p>`,
    brute: {
      why: `<p>A "shallow" copy constructor that does <code>this.songs = other.songs</code> copies the arrow, so both playlists share one list: adding to one adds to the other. The same happens if the first constructor stores the caller\'s list directly.</p>`,
      code: `
      class PlaylistShallow {
          String name; List<String> songs;
          PlaylistShallow(String name, List<String> songs) { this.name = name; this.songs = songs; }  // stores caller's list
          PlaylistShallow(PlaylistShallow other, String newName) { this(newName, other.songs); }     // shares the list!
          public static void main(String[] args) {
              PlaylistShallow p1 = new PlaylistShallow("Road", new ArrayList<>(List.of("A", "B")));
              PlaylistShallow p2 = new PlaylistShallow(p1, "Road copy");
              p1.songs.add("C");
              System.out.println(p2.songs);   // [A, B, C]  <- bug
          }
      }`
    },
    mcq: { q: 'Why is copying the list enough here, without copying each song?', options: ['Strings are immutable, so sharing them is safe', 'Lists copy elements deeply by default', 'Because songs are stored on the stack', 'It is not enough; each String must be cloned'], answer: 0, explain: 'A deep copy is only needed for mutable elements. Shared immutable objects cannot change under you, so a new list holding the same String references is an independent copy.' },
    hints: [
      `<p>Hint 1: Both constructors receive a list they do not own. Wrap it: <code>new ArrayList&lt;&gt;(songs)</code> makes a new list with the same elements.</p>`,
      `<p>Hint 2: Chain the copy constructor to the main one: <code>this(newName, other.songs)</code>. The main constructor already copies, so the copy is independent.</p>`,
      `<p>Hint 3: For the getter, return <code>Collections.unmodifiableList(songs)</code> (a view) or <code>List.copyOf(songs)</code> (a snapshot) so callers cannot modify internals.</p>`
    ],
    tests: { sig: 'list<string> string -> string', fn: 'plCheck',
      harness: { java: `class Check { static String f(List<String> l) { return l.size() <= 10 ? l.toString() : "n=" + l.size() + " last=" + l.get(l.size() - 1); } static String plCheck(List<String> songs, String add) { List<String> mine = new ArrayList<>(songs); Playlist p1 = new Playlist("Road", mine); Playlist p2 = new Playlist(p1, "Road copy"); p1.add(add); mine.add("Z"); p2.add("Q"); boolean ro; try { p1.songs().add("X"); ro = false; } catch (UnsupportedOperationException e) { ro = true; } return f(p1.songs()) + " " + f(p2.songs()) + " ro=" + ro; } }` }, cases: [
      [[["A","B"],"C"],"[A, B, C] [A, B, Q] ro=true"],
      [[[],"A"],"[A] [Q] ro=true"],
      [[["A"],"B"],"[A, B] [A, Q] ro=true"],
      [[["A","A","A"],"A"],"[A, A, A, A] [A, A, A, Q] ro=true"],
      [[["one","two","three","four"],"five"],"[one, two, three, four, five] [one, two, three, four, Q] ro=true"],
      [[["a","b","c","d","e","f","g","h","i"],"j"],"[a, b, c, d, e, f, g, h, i, j] [a, b, c, d, e, f, g, h, i, Q] ro=true"],
      [[["a","b","c","d","e","f","g","h","i","j"],"k"],"n=11 last=k n=11 last=Q ro=true"],
      [[{"$rep":"s","n":100000},"new"],"n=100001 last=new n=100001 last=Q ro=true"],
      [[{"$rep":"s","n":99999},"x"],"n=100000 last=x n=100000 last=Q ro=true"]
    ] },
    solution: {
      approach: `<p>Copy on the way in (constructor) and protect on the way out (getter). The copy constructor delegates to the main constructor, so copying logic exists once. Because the elements are immutable Strings, a new list is a full independent copy.</p>`,
      code: `
      class Playlist {
          private final String name;
          private final List<String> songs;

          Playlist(String name, List<String> songs) {
              this.name = Objects.requireNonNull(name);
              this.songs = new ArrayList<>(songs);          // defensive copy IN
          }

          Playlist(Playlist other, String newName) {
              this(newName, other.songs);                   // reuses the copying constructor
          }

          void add(String song) { songs.add(Objects.requireNonNull(song)); }

          List<String> songs() { return Collections.unmodifiableList(songs); }   // protected view OUT

          public static void main(String[] args) {
              List<String> mine = new ArrayList<>(List.of("A", "B"));
              Playlist p1 = new Playlist("Road", mine);
              Playlist p2 = new Playlist(p1, "Road copy");
              p1.add("C");
              mine.add("Z");                                 // caller's list: no effect on p1
              System.out.println(p1.songs() + " " + p2.songs());   // [A, B, C] [A, B]
          }
      }`,
      dry: { head: ['step', 'p1.songs', 'p2.songs', 'mine'], rows: [['p1 = new Playlist("Road", mine)', '[A, B] (own list)', '-', '[A, B]'], ['p2 = copy of p1', '[A, B]', '[A, B] (own list)', '[A, B]'], ['p1.add("C")', '[A, B, C]', '[A, B]', '[A, B]'], ['mine.add("Z")', '[A, B, C]', '[A, B]', '[A, B, Z]']] },
      complexity: `<p>Constructors O(n) to copy n songs; add amortised O(1); songs() O(1) for the view.</p>`,
      followUps: ['If songs were mutable Song objects, what extra work is needed?', 'Why might clone() be a worse choice than a copy constructor? (Effective Java Item 13)']
    }
  });

  practice.push({
    title: 'Predict the Output: Counting Through a Constructor Chain',
    level: 'Medium', tags: ['static', 'this()', 'output prediction'], companies: ['Infosys', 'Barclays'],
    statement: `<p>Predict the output.</p>
<pre>class Node {
    static int created = 0;
    int id;
    Node() { this(-1); created++; }
    Node(int id) { this.id = id; created++; }
}
Node p = new Node();
Node q = new Node(5);
System.out.println(p.id + " " + q.id + " " + Node.created);</pre>`,
    constraints: `Single thread.`,
    example: `<p>Output: ${H.c('g', '-1 5 3')}. Two objects, but <b>three</b> increments: <code>new Node()</code> runs <code>Node(int)</code> (created++) and then the rest of <code>Node()</code> (created++ again). The counter counts <b>constructor executions</b>, not objects.</p>`,
    brute: {
      why: `<p>"Two <code>new</code> keywords, so created = 2" ignores that a delegating constructor runs its own body after the delegated one finishes. Any side effect placed in both constructors of a chain happens twice for the short path.</p>`,
      code: `
      class NodeGuess {
          public static void main(String[] args) {
              int newKeywords = 2;
              System.out.println("-1 5 " + newKeywords + "   <- wrong: counts objects, not constructor bodies");
          }
      }`
    },
    mcq: { q: 'Where should <code>created++</code> go so it counts objects exactly?', options: ['Only in the master constructor Node(int)', 'Only in Node()', 'In both constructors', 'In a static block'], answer: 0, explain: 'Every construction path ends in Node(int), and it runs once per object. A static block runs once per class, not per object.' },
    hints: [
      `<p>Hint 1: Expand <code>new Node()</code> into the actual sequence of constructor bodies: Node() calls this(-1) first...</p>`,
      `<p>Hint 2: After <code>Node(int)</code> returns, control comes back to <code>Node()</code>, which still has <code>created++</code> left to run.</p>`,
      `<p>Hint 3: Count: path 1 (new Node()) = 2 increments, path 2 (new Node(5)) = 1 increment → 3. ids: -1 and 5.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: "", stdout: "-1 5 2" }
    ] },
    solution: {
      approach: `<p>Trace each <code>new</code> as a call stack. <code>new Node()</code>: Node() → Node(-1): id = -1, created = 1 → back in Node(): created = 2. <code>new Node(5)</code>: id = 5, created = 3. Print -1 5 3. Fix: keep side effects only in the master constructor.</p>`,
      code: `
      class NodeFixed {
          static int created = 0;
          int id;
          NodeFixed() { this(-1); }                        // no side effect here
          NodeFixed(int id) { this.id = id; created++; }    // the only increment
          public static void main(String[] args) {
              NodeFixed p = new NodeFixed();
              NodeFixed q = new NodeFixed(5);
              System.out.println(p.id + " " + q.id + " " + created);   // -1 5 2
          }
      }`,
      dry: { head: ['event', 'id', 'created'], rows: [['new Node() → Node(-1) body', '-1', '1'], ['back in Node() body', '-1', '2'], ['new Node(5) → Node(5) body', '5', '3'], ['print', '-', '<span class="c-g">-1 5 3</span>']] },
      complexity: `<p>O(1). The bug class (double side effects in constructor chains) is common in logging, metrics and registration code.</p>`,
      followUps: ['Where would an instance initializer block with created++ run, and how many times?', 'Make created thread-safe']
    }
  });

  practice.push({
    title: 'Fluent Email Builder',
    level: 'Medium', tags: ['this', 'fluent API', 'builder', 'validation'], companies: ['Google', 'Atlassian', 'Freshworks'],
    statement: `<p>Write <code>Email.Builder</code> so callers can write:</p>
<pre>Email e = new Email.Builder()
    .to("asha@x.com").to("ben@x.com")
    .subject("Hi").body("Lunch?")
    .build();</pre>
<p><code>to</code> can be called many times; <code>build()</code> must throw if there is no recipient or no subject. <code>Email</code> itself must be immutable (no setters, private constructor).</p>`,
    constraints: `Up to 100 recipients; recipient strings contain "@".`,
    example: `<p>The chain above builds an Email whose <code>toString()</code> is ${H.c('g', '"To: [asha@x.com, ben@x.com] | Subject: Hi | Lunch?"')}. <code>new Email.Builder().body("x").build()</code> → ${H.c('r', 'IllegalStateException: at least one recipient')}. Why? Every setter returns <code>this</code> (the same builder), and only build() creates the Email after checking.</p>`,
    brute: {
      why: `<p>A constructor <code>Email(List to, String subject, String body, String cc, ...)</code> with many parameters is unreadable and easy to call with arguments swapped (two Strings next to each other). Mutable setters on Email itself allow half-built emails to be sent.</p>`,
      code: `
      class EmailBrute {
          String to, subject, body;
          void setTo(String t) { to = t; }          // returns void: no chaining
          void setSubject(String s) { subject = s; }
          void setBody(String b) { body = b; }
          public static void main(String[] args) {
              EmailBrute e = new EmailBrute();
              e.setBody("Lunch?");                   // forgot recipient and subject: still "valid"
              System.out.println(e.to + " " + e.subject);   // null null
          }
      }`
    },
    mcq: { q: 'What must each builder method return to allow chaining?', options: ['this (the same Builder)', 'a new Builder each time', 'void', 'the Email'], answer: 0, explain: 'Returning this lets the next call target the same builder. Returning new builders works only if they copy all state (immutable builders), which is more costly and easy to get wrong.' },
    hints: [
      `<p>Hint 1: Put a <code>static class Builder</code> inside Email with mutable fields and methods that set a field and <code>return this;</code>.</p>`,
      `<p>Hint 2: Email gets a <code>private</code> constructor taking the Builder, copying values into <code>private final</code> fields (copy the recipient list!).</p>`,
      `<p>Hint 3: <code>build()</code> validates (non-empty recipients, non-blank subject), then calls <code>new Email(this)</code>. Validate each address in <code>to()</code> too, so errors point at the bad call.</p>`
    ],
    tests: { sig: 'list<string> string string -> string', fn: 'emailCheck',
      harness: { java: `class Check { static String emailCheck(List<String> to, String subject, String body) { Email.Builder b = new Email.Builder(); try { for (String t : to) b.to(t); b.subject(subject).body(body); Email e = b.build(); b.to("late@x.com"); return e.toString(); } catch (IllegalArgumentException e) { return "IAE"; } catch (IllegalStateException e) { return "ISE: " + e.getMessage(); } } }` }, cases: [
      [[["asha@x.com","ben@x.com"],"Hi","Lunch?"],"To: [asha@x.com, ben@x.com] | Subject: Hi | Lunch?"],
      [[[],"Hi","x"],"ISE: at least one recipient"],
      [[["a@x.com"],"","x"],"ISE: subject required"],
      [[["a@x.com"],"   ","x"],"ISE: subject required"],
      [[["nobody"],"Hi","x"],"IAE"],
      [[["a@x.com"],"S",""],"To: [a@x.com] | Subject: S | "],
      [[["a@x.com","a@x.com"],"dup","b"],"To: [a@x.com, a@x.com] | Subject: dup | b"],
      [[["a@x.com","bad"],"S","b"],"IAE"],
      [[[],"",""],"ISE: at least one recipient"],
      [[["@"],"S","b"],"To: [@] | Subject: S | b"],
      [[{"$rep":"u@x.com","n":100},"Many","b"],"To: [u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com, u@x.com] | Subject: Many | b"]
    ] },
    solution: {
      approach: `<p>Builder pattern: a mutable helper with fluent methods returning <code>this</code>; a final immutable product created only by <code>build()</code> after validation. The private constructor guarantees the only way to get an Email is through validation.</p>`,
      code: `
      final class Email {
          private final List<String> to;
          private final String subject;
          private final String body;

          private Email(Builder b) {
              this.to = List.copyOf(b.to);          // immutable snapshot
              this.subject = b.subject;
              this.body = b.body;
          }

          @Override
          public String toString() { return "To: " + to + " | Subject: " + subject + " | " + body; }

          static final class Builder {
              private final List<String> to = new ArrayList<>();
              private String subject;
              private String body = "";

              Builder to(String address) {
                  if (address == null || !address.contains("@")) throw new IllegalArgumentException("bad address: " + address);
                  to.add(address);
                  return this;                       // same builder, so calls chain
              }
              Builder subject(String subject) { this.subject = subject; return this; }
              Builder body(String body) { this.body = Objects.requireNonNull(body); return this; }

              Email build() {
                  if (to.isEmpty()) throw new IllegalStateException("at least one recipient");
                  if (subject == null || subject.isBlank()) throw new IllegalStateException("subject required");
                  return new Email(this);
              }
          }

          public static void main(String[] args) {
              Email e = new Email.Builder().to("asha@x.com").to("ben@x.com").subject("Hi").body("Lunch?").build();
              System.out.println(e);
          }
      }`,
      dry: { head: ['call', 'builder state', 'returns'], rows: [['new Builder()', 'to=[], subject=null', 'builder #1'], ['.to("asha@x.com")', 'to=[asha]', 'this (#1)'], ['.to("ben@x.com")', 'to=[asha, ben]', 'this (#1)'], ['.subject("Hi").body("Lunch?")', 'subject=Hi, body=Lunch?', 'this (#1)'], ['.build()', 'checks pass', '<span class="c-g">new Email</span>']] },
      complexity: `<p>Each fluent call O(1) amortised; build() O(r) to copy r recipients.</p>`,
      followUps: ['Make the builder reusable: does building twice share any mutable state?', 'How does Lombok @Builder generate this?', 'Compare with a record plus a static factory']
    }
  });

  practice.push({
    title: 'Immutable Money Value Class',
    level: 'Medium', tags: ['immutability', 'constructors', 'static factory', 'equals'], companies: ['Stripe', 'PayPal', 'Razorpay'],
    statement: `<p>Design <code>Money</code> with a currency code (e.g. "INR") and an amount in minor units (<code>long</code> paise/cents). Requirements: immutable; created via <code>Money.of(String currency, long minor)</code>; <code>plus(Money)</code> and <code>minus(Money)</code> return <b>new</b> objects and throw on currency mismatch; <code>equals</code>/<code>hashCode</code> by value; <code>toString</code> like <code>"INR 12.50"</code>.</p>`,
    constraints: `Amount within ±10<sup>15</sup>; detect overflow with <code>Math.addExact</code>.`,
    example: `<p><code>Money.of("INR", 1250).plus(Money.of("INR", 250))</code> → ${H.c('g', 'INR 15.00')}, and the original is still ${H.c('g', 'INR 12.50')}. <code>Money.of("INR", 100).plus(Money.of("USD", 100))</code> → ${H.c('r', 'IllegalArgumentException')}. <code>Money.of("INR", 5).equals(Money.of("INR", 5))</code> → ${H.c('g', 'true')}.</p>`,
    brute: {
      why: `<p>A mutable Money with <code>double amount</code> and an <code>add()</code> that changes itself causes two classic bugs: rounding errors (0.1 + 0.2 ≠ 0.3 in binary floating point) and aliasing (two orders sharing one Money object both change when one adds tax).</p>`,
      code: `
      class MoneyBrute {
          String currency; double amount;
          MoneyBrute(String c, double a) { currency = c; amount = a; }
          void add(MoneyBrute o) { amount += o.amount; }      // mutates shared objects, ignores currency
          public static void main(String[] args) {
              MoneyBrute price = new MoneyBrute("INR", 0.1);
              MoneyBrute same = price;                          // alias
              price.add(new MoneyBrute("USD", 0.2));            // wrong currency accepted
              System.out.println(same.amount);                  // 0.30000000000000004
          }
      }`
    },
    mcq: { q: 'Why store money as a long count of minor units instead of a double?', options: ['Binary floating point cannot represent most decimal fractions exactly', 'long uses less memory', 'double cannot be negative', 'equals does not work on doubles'], answer: 0, explain: '0.1 has no exact binary representation, so sums drift. Integers of paise/cents are exact; BigDecimal is the other correct option.' },
    hints: [
      `<p>Hint 1: Immutable recipe: <code>final</code> class, <code>private final</code> fields, no setters, every "change" returns a new object.</p>`,
      `<p>Hint 2: A private constructor + <code>static Money of(...)</code> factory lets you validate (non-null, 3-letter currency) and later add caching without changing callers.</p>`,
      `<p>Hint 3: Use <code>Math.addExact</code> to throw on overflow, compare currencies with <code>equals</code> (not ==), and build toString with <code>Math.abs(minor) % 100</code> padded to two digits (careful with negatives).</p>`
    ],
    tests: { sig: 'string long string long string -> string', fn: 'moneyCheck',
      harness: { java: `class Check { static String moneyCheck(String c1, long m1, String c2, long m2, String op) { try { Money a = Money.of(c1, m1), b = Money.of(c2, m2); String r; switch (op) { case "plus": r = a.plus(b).toString(); break; case "minus": r = a.minus(b).toString(); break; case "equals": r = a.equals(b) + " " + (!a.equals(b) || a.hashCode() == b.hashCode()); break; default: r = a.toString(); } return r + " | a=" + a + " b=" + b; } catch (IllegalArgumentException e) { return "IAE"; } catch (ArithmeticException e) { return "ArithmeticException"; } } }` }, cases: [
      [["INR",1250,"INR",250,"plus"],"INR 15.00 | a=INR 12.50 b=INR 2.50"],
      [["INR",100,"USD",100,"plus"],"IAE"],
      [["INR",5,"INR",5,"equals"],"true true | a=INR 0.05 b=INR 0.05"],
      [["INR",5,"USD",5,"equals"],"false true | a=INR 0.05 b=USD 0.05"],
      [["INR",5,"INR",6,"equals"],"false true | a=INR 0.05 b=INR 0.06"],
      [["INR",1250,"INR",250,"minus"],"INR 10.00 | a=INR 12.50 b=INR 2.50"],
      [["INR",250,"INR",1250,"minus"],"INR -10.00 | a=INR 2.50 b=INR 12.50"],
      [["INR",100,"USD",100,"minus"],"IAE"],
      [["INR",0,"INR",0,"plus"],"INR 0.00 | a=INR 0.00 b=INR 0.00"],
      [["USD",-5,"USD",0,"toString"],"USD -0.05 | a=USD -0.05 b=USD 0.00"],
      [["USD",99,"USD",1,"plus"],"USD 1.00 | a=USD 0.99 b=USD 0.01"],
      [["USD",-100,"USD",-1,"minus"],"USD -0.99 | a=USD -1.00 b=USD -0.01"],
      [["EUR",1000000000000000,"EUR",1000000000000000,"plus"],"EUR 20000000000000.00 | a=EUR 10000000000000.00 b=EUR 10000000000000.00"],
      [["EUR",-1000000000000000,"EUR",1000000000000000,"minus"],"EUR -20000000000000.00 | a=EUR -10000000000000.00 b=EUR 10000000000000.00"],
      [["EUR","9223372036854775807","EUR",1,"plus"],"ArithmeticException"],
      [["EUR","-9223372036854775807","EUR",2,"minus"],"ArithmeticException"],
      [["EUR",7,"EUR",0,"toString"],"EUR 0.07 | a=EUR 0.07 b=EUR 0.00"],
      [["GBP",100,"GBP",100,"equals"],"true true | a=GBP 1.00 b=GBP 1.00"],
      [["GBP",100,"GBP",100,"plus"],"GBP 2.00 | a=GBP 1.00 b=GBP 1.00"]
    ] },
    solution: {
      approach: `<p>Make Money a value object: immutable, validated at creation by a static factory, arithmetic returning new instances, equality by value. Immutability removes the aliasing bug entirely: sharing a Money is always safe.</p>`,
      code: `
      final class Money {
          private final String currency;
          private final long minor;                       // paise / cents

          private Money(String currency, long minor) {
              this.currency = currency;
              this.minor = minor;
          }

          static Money of(String currency, long minor) {
              if (currency == null || !currency.matches("[A-Z]{3}")) throw new IllegalArgumentException("bad currency " + currency);
              return new Money(currency, minor);
          }

          Money plus(Money other) {
              requireSameCurrency(other);
              return new Money(currency, Math.addExact(minor, other.minor));       // new object
          }

          Money minus(Money other) {
              requireSameCurrency(other);
              return new Money(currency, Math.subtractExact(minor, other.minor));
          }

          private void requireSameCurrency(Money other) {
              if (!this.currency.equals(other.currency)) throw new IllegalArgumentException(currency + " vs " + other.currency);
          }

          @Override
          public boolean equals(Object o) {
              if (this == o) return true;
              if (!(o instanceof Money m)) return false;
              return minor == m.minor && currency.equals(m.currency);
          }

          @Override
          public int hashCode() { return Objects.hash(currency, minor); }

          @Override
          public String toString() {
              String sign = minor < 0 ? "-" : "";
              long abs = Math.abs(minor);
              return currency + " " + sign + (abs / 100) + "." + String.format("%02d", abs % 100);
          }

          public static void main(String[] args) {
              Money a = Money.of("INR", 1250);
              Money b = a.plus(Money.of("INR", 250));
              System.out.println(a + " | " + b + " | " + Money.of("INR", 5).equals(Money.of("INR", 5)));   // INR 12.50 | INR 15.00 | true
          }
      }`,
      dry: { head: ['expression', 'objects', 'result'], rows: [['a = of("INR",1250)', 'a(INR,1250)', 'INR 12.50'], ['b = a.plus(of("INR",250))', 'a unchanged, new b(INR,1500)', 'INR 15.00'], ['of("INR",100).plus(of("USD",100))', '-', '<span class="c-r">IllegalArgumentException</span>'], ['of("INR",5).equals(of("INR",5))', 'two objects, same value', '<span class="c-g">true</span>']] },
      complexity: `<p>All operations O(1). Each arithmetic op allocates one small object, which escape analysis often removes in hot loops.</p>`,
      followUps: ['Implement Money as a record. What do you get for free?', 'How would you split an amount into 3 parts without losing a paisa?', 'Should Money.of cache common values like Integer.valueOf does?']
    }
  });

  practice.push({
    title: 'Predict the Output: main Inside the Class',
    level: 'Medium', tags: ['initialization order', 'static block', 'output prediction'], companies: ['Cognizant', 'HCL', 'JP Morgan'],
    statement: `<p>Predict the output of running <code>java Init</code>.</p>
<pre>public class Init {
    static { System.out.println("static 1"); }
    int x = print("field x");
    { System.out.println("instance block"); }
    Init() { System.out.println("ctor"); }
    static { System.out.println("static 2"); }
    static int print(String s) { System.out.println(s); return 1; }
    public static void main(String[] args) {
        System.out.println("main");
        new Init();
    }
}</pre>`,
    constraints: `Run as the main class.`,
    example: `<p>Output:</p><pre>static 1\nstatic 2\nmain\nfield x\ninstance block\nctor</pre><p>The JVM must initialise ${H.c('b', 'Init')} before calling its static main, so ${H.c('g', 'both static blocks run first')} (in source order, even though "static 2" is written after the constructor). Then main prints, then the object is built: field initializer, instance block (source order), constructor body.</p>`,
    brute: {
      why: `<p>Reading the file top to bottom predicts "static 1, field x, instance block, ctor, static 2, main". Wrong twice: instance initializers run only when an object is created, and all static initializers run together, before main.</p>`,
      code: `
      class InitTopToBottomGuess {
          public static void main(String[] args) {
              System.out.println("static 1\\nfield x\\ninstance block\\nctor\\nstatic 2\\nmain   <- wrong guess");
          }
      }`
    },
    mcq: { q: 'Where would "static 2" print if main were in a different class that does <code>new Init()</code> after printing "main"?', options: ['After "main", together with "static 1"', 'Before "main"', 'After "ctor"', 'Never'], answer: 0, explain: 'Then Init is initialised lazily at new Init(), so main\'s line comes first, followed by static 1, static 2, field x, instance block, ctor.' },
    hints: [
      `<p>Hint 1: Running <code>java Init</code> means calling a static method of Init, which is an active use: class initialisation happens before main starts.</p>`,
      `<p>Hint 2: Static initializers run as one group in source order, no matter where they sit relative to constructors and methods.</p>`,
      `<p>Hint 3: Instance initializers (field x, the instance block) run per object, in source order, before the constructor body.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: "", stdout: "static 1\nstatic 2\nmain\nfield x\ninstance block\nctor" }
    ] },
    solution: {
      approach: `<p>Phase 1 (class init, before main): static 1, static 2. Then main body: "main". Phase 2 (new Init()): field x (initializer calls print), instance block, ctor.</p>`,
      code: `
      class Init {
          static { System.out.println("static 1"); }
          int x = print("field x");
          { System.out.println("instance block"); }
          Init() { System.out.println("ctor"); }
          static { System.out.println("static 2"); }
          static int print(String s) { System.out.println(s); return 1; }
          public static void main(String[] args) {
              System.out.println("main");
              new Init();
          }
          // Output: static 1 / static 2 / main / field x / instance block / ctor
      }`,
      dry: { head: ['phase', 'what runs', 'printed'], rows: [['class init', 'static block 1', 'static 1'], ['class init', 'static block 2', 'static 2'], ['main', 'println', 'main'], ['new Init()', 'field x initializer', 'field x'], ['new Init()', 'instance block', 'instance block'], ['new Init()', 'constructor body', 'ctor']] },
      complexity: `<p>O(1). Remember: static work once per class, instance work once per object.</p>`,
      followUps: ['Call new Init() twice. Which lines repeat?', 'What if the instance block threw a RuntimeException?']
    }
  });

  practice.push({
    title: 'Predict the Output: The Overridden Method Called Too Early',
    level: 'Hard', tags: ['initialization order', 'constructors', 'overriding', 'output prediction'], companies: ['Google', 'Uber', 'Oracle'],
    statement: `<p>Predict both lines. Then fix the design so the parent never sees a half-built child.</p>
<pre>class Base {
    Base() { System.out.println("Base sees: " + describe()); }
    String describe() { return "base"; }
}
class Child extends Base {
    private String name = "Kid";
    private final int age = 7;
    private final int born;
    Child() { super(); born = 2019; System.out.println("Child sees: " + describe()); }
    @Override String describe() { return name + "/" + age + "/" + born; }
}
new Child();</pre>`,
    constraints: `Java 21 semantics.`,
    example: `<p>Output:</p><pre>Base sees: null/7/0\nChild sees: Kid/7/2019</pre><p>During <code>Base()</code>, Child\'s initializers have not run: ${H.c('r', 'name is null')}, ${H.c('r', 'born is 0')}. But ${H.c('g', 'age prints 7')}: a final field initialised with a compile-time constant is inlined by javac, so describe() reads the constant, not the field.</p>`,
    brute: {
      why: `<p>The "fields are set as declared" intuition predicts <code>Base sees: Kid/7/2019</code>. But the parent constructor runs <b>before</b> the child\'s field initializers and constructor body, and virtual dispatch still calls the child\'s override. Calling overridable methods from constructors exposes uninitialised state.</p>`,
      code: `
      class BaseBad {
          BaseBad() { System.out.println("Base sees: " + describe()); }   // overridable call in constructor
          String describe() { return "base"; }
      }
      class ChildBad extends BaseBad {
          private String name = "Kid";
          @Override String describe() { return name.toUpperCase(); }      // NullPointerException during BaseBad()!
      }`
    },
    mcq: { q: 'Why does <code>age</code> print 7 even inside Base()?', options: ['It is a final field with a constant initializer, so javac inlines the value 7', 'final fields are initialised before super()', 'The JIT reorders it', 'Because int fields default to 7'], answer: 0, explain: 'A final primitive/String field initialised with a constant expression is a constant variable; reads of it compile to the literal. born is final too but assigned in the constructor, so it reads 0.' },
    hints: [
      `<p>Hint 1: Order for new Child(): allocate (all fields default) → Child() → super() → Base() body (calls describe) → Child initializers (name = "Kid") → rest of Child() (born = 2019).</p>`,
      `<p>Hint 2: Virtual dispatch works even during construction: Base() calling describe() runs Child.describe().</p>`,
      `<p>Hint 3: Fix: never call overridable methods from constructors. Make describe() <code>private</code> or <code>final</code> in Base, or move the printing into a separate <code>init()</code>/factory method called after construction.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: "", stdout: "ready: Kid/2019" }
    ] },
    solution: {
      approach: `<p>Trace: Base() runs with Child fields at defaults (name null, born 0) except the inlined constant age = 7 → "null/7/0". Then name = "Kid", born = 2019, and Child() prints "Kid/7/2019". The fix uses a static factory so the "announce" step happens after the object is fully constructed.</p>`,
      code: `
      class SafeBase {
          SafeBase() { }                                    // no overridable calls
          String describe() { return "base"; }
          final void announce() { System.out.println("ready: " + describe()); }
      }
      class SafeChild extends SafeBase {
          private final String name;
          private final int born;
          private SafeChild(String name, int born) { this.name = name; this.born = born; }
          static SafeChild create(String name, int born) {
              SafeChild c = new SafeChild(name, born);      // fully constructed first
              c.announce();                                 // then call overridable behaviour
              return c;
          }
          @Override String describe() { return name + "/" + born; }
          public static void main(String[] args) {
              SafeChild.create("Kid", 2019);                // ready: Kid/2019
          }
      }`,
      dry: { head: ['step', 'name', 'age (as read)', 'born', 'printed'], rows: [['allocate Child', 'null', '7 (constant)', '0', '-'], ['Base() calls describe()', 'null', '7', '0', 'Base sees: null/7/0'], ['Child initializers', '"Kid"', '7', '0', '-'], ['born = 2019', '"Kid"', '7', '2019', '-'], ['Child() prints', '"Kid"', '7', '2019', '<span class="c-g">Child sees: Kid/7/2019</span>']] },
      complexity: `<p>O(1). The cost of the bug is correctness: NPEs or wrong defaults that only appear in subclasses, often in framework code.</p>`,
      followUps: ['How does Java 25\'s flexible constructor body let Child assign name before super()?', 'Which javac lint warns about this pattern?', 'Does the same trap exist with abstract methods called from an abstract class constructor?']
    }
  });

  practice.push({
    title: 'Thread-Safe Lazy Singleton (Holder Idiom)',
    level: 'Hard', tags: ['static', 'class initialization', 'singleton', 'concurrency'], companies: ['Amazon', 'Microsoft', 'Goldman Sachs'],
    statement: `<p>Implement a <code>ConfigService</code> singleton that is created <b>lazily</b> (only when first requested), exactly <b>once</b> even if 100 threads ask at the same moment, and without paying for a lock on every <code>getInstance()</code> call. Its constructor is expensive (loads settings). Explain why your solution is thread-safe.</p>`,
    constraints: `No external libraries. Java 21. getInstance() is called millions of times per second.`,
    example: `<p>Two threads calling <code>ConfigService.getInstance()</code> at the same time both receive ${H.c('g', 'the same object')}; "loading config" prints ${H.c('g', 'exactly once')}. If nobody ever calls getInstance(), the config is ${H.c('g', 'never loaded')}.</p>`,
    brute: {
      why: `<p>The naive lazy check <code>if (instance == null) instance = new ConfigService();</code> is a race: two threads can both see null and create two instances (and, without volatile, one thread may even see a partially constructed object). Making the whole method <code>synchronized</code> fixes it but takes a lock on every call forever.</p>`,
      code: `
      class ConfigServiceRacy {
          private static ConfigServiceRacy instance;
          private ConfigServiceRacy() { System.out.println("loading config"); }
          static ConfigServiceRacy getInstance() {
              if (instance == null) {                 // two threads can both pass this check
                  instance = new ConfigServiceRacy(); // ...and create two instances
              }
              return instance;
          }
      }`
    },
    mcq: { q: 'What makes the holder idiom thread-safe without explicit locks?', options: ['The JVM initialises a class exactly once under an internal lock, on first use', 'static fields are always volatile', 'Nested classes run on a single thread', 'The JIT removes races automatically'], answer: 0, explain: 'JLS 12.4.2 guarantees class initialisation happens once, with other threads blocking until it completes, and establishes happens-before for the initialised statics. Holder is initialised only when getInstance() first touches it.' },
    hints: [
      `<p>Hint 1: Static initialisation is lazy (first active use) and the JVM makes it thread-safe. Can you make the singleton a static field of a class that is touched only by getInstance()?</p>`,
      `<p>Hint 2: A private static nested class <code>Holder</code> with <code>static final ConfigService INSTANCE = new ConfigService();</code> is initialised only when <code>Holder.INSTANCE</code> is first read.</p>`,
      `<p>Hint 3: After initialisation, getInstance() is a plain static field read: no lock, easily inlined. Alternative: a single-element enum (also serialization-safe). Double-checked locking needs <code>volatile</code>; the holder does not.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: "", stdout: "loading config\ndistinct instances: 1" }
    ] },
    solution: {
      approach: `<p>Initialisation-on-demand holder: the outer class does not create the instance; a private nested class holds it in a static final field. The first call to getInstance() triggers Holder\'s class initialisation, which the JVM performs once under its own lock. Later calls just read a final static field.</p>`,
      code: `
      final class ConfigService {
          private final Map<String, String> settings;

          private ConfigService() {
              System.out.println("loading config");        // expensive work, happens once
              Map<String, String> m = new HashMap<>();
              m.put("env", "prod");
              settings = Collections.unmodifiableMap(m);
          }

          private static final class Holder {
              static final ConfigService INSTANCE = new ConfigService();   // runs on Holder's first use
          }

          static ConfigService getInstance() { return Holder.INSTANCE; }   // no lock after init

          String get(String key) { return settings.get(key); }

          public static void main(String[] args) throws Exception {
              ExecutorService pool = Executors.newFixedThreadPool(8);
              List<Future<ConfigService>> results = new ArrayList<>();
              for (int i = 0; i < 100; i++) results.add(pool.submit(ConfigService::getInstance));
              Set<ConfigService> distinct = Collections.newSetFromMap(new IdentityHashMap<>());
              for (Future<ConfigService> f : results) distinct.add(f.get());
              pool.shutdown();
              System.out.println("distinct instances: " + distinct.size());   // 1 (and "loading config" printed once)
          }
      }`,
      alt: [{ lang: 'java', code: `
      enum ConfigEnum {
          INSTANCE;                                  // created during enum class initialisation, once
          private final Map<String, String> settings = Map.of("env", "prod");
          String get(String key) { return settings.get(key); }
      }` }],
      dry: { head: ['event', 'Holder initialised?', 'instances', 'lock taken?'], rows: [['class ConfigService loaded', 'no', '0', 'no'], ['T1 and T2 call getInstance()', 'T1 starts init, T2 waits', '0 → 1', 'JVM init lock (once)'], ['init finishes', 'yes', '1', 'released'], ['next million calls', 'yes', '1', '<span class="c-g">no</span>']] },
      complexity: `<p>First call: cost of the constructor. Every later call: O(1), a static final read with no synchronisation, which the JIT can treat as a constant.</p>`,
      followUps: ['Write double-checked locking correctly. Why is volatile required?', 'Why do many teams avoid singletons and use dependency injection instead?', 'How can reflection or serialization break a class-based singleton, and why does enum resist that?']
    }
  });

  practice.push({
    title: 'Predict the Output: The Singleton Born Too Early',
    level: 'Hard', tags: ['static initialization order', 'constants', 'output prediction'], companies: ['Google', 'Jane Street', 'Morgan Stanley'],
    statement: `<p>Predict the output, explain it, and fix it.</p>
<pre>class Elvis {
    static final Elvis INSTANCE = new Elvis();
    private static final int BIRTH_YEAR = 1935;
    private static final int CURRENT = Integer.parseInt("2026");
    final int age;
    Elvis() { age = CURRENT - BIRTH_YEAR; }
}
System.out.println(Elvis.INSTANCE.age);</pre>`,
    constraints: `Java 21; single thread.`,
    example: `<p>Output: ${H.c('r', '-1935')}. INSTANCE is created by the <b>first</b> static initializer, when CURRENT is still its default ${H.c('r', '0')} (its initializer has not run yet). BIRTH_YEAR is a ${H.c('g', 'compile-time constant')}, so it is inlined as 1935 regardless of order. 0 − 1935 = −1935.</p>`,
    brute: {
      why: `<p>Assuming "all static finals are set before anything uses them" predicts 91. But static initializers run strictly top to bottom, and only true constant expressions are inlined. <code>Integer.parseInt("2026")</code> is a method call, so CURRENT is a normal static field that is still 0 when the constructor reads it.</p>`,
      code: `
      class ElvisGuess {
          public static void main(String[] args) {
              System.out.println(2026 - 1935 + "   <- wrong: assumes CURRENT is ready when INSTANCE is built");
          }
      }`
    },
    mcq: { q: 'Which change alone makes it print 91?', options: ['Move the INSTANCE declaration below CURRENT', 'Make age static', 'Remove final from BIRTH_YEAR', 'Make the constructor private'], answer: 0, explain: 'Static initializers run in source order. Declaring INSTANCE last means CURRENT is already 2026 when the constructor runs. (Removing final from BIRTH_YEAR would make it 0 too.)' },
    hints: [
      `<p>Hint 1: List the static fields with their state at <b>preparation</b>: INSTANCE null, CURRENT 0. BIRTH_YEAR is a constant variable: reads are replaced by 1935 at compile time.</p>`,
      `<p>Hint 2: Run static initializers top to bottom. The very first one calls the constructor. What is CURRENT at that moment?</p>`,
      `<p>Hint 3: Fix options: declare INSTANCE last, compute the age lazily in a method, or use a holder class so the instance is created after Elvis is fully initialised.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: "", stdout: "91" }
    ] },
    solution: {
      approach: `<p>Static initializers execute in textual order. The constructor runs during the first one, reading CURRENT (still 0) and the inlined constant 1935, so age = −1935. Moving INSTANCE below all fields it depends on fixes the order; a holder class removes the dependency on declaration order altogether.</p>`,
      code: `
      class ElvisFixed {
          private static final int BIRTH_YEAR = 1935;
          private static final int CURRENT = Integer.parseInt("2026");
          static final ElvisFixed INSTANCE = new ElvisFixed();   // declared AFTER its dependencies
          final int age;
          private ElvisFixed() { age = CURRENT - BIRTH_YEAR; }
          public static void main(String[] args) {
              System.out.println(ElvisFixed.INSTANCE.age);        // 91
          }
      }`,
      dry: { head: ['step', 'INSTANCE', 'CURRENT', 'BIRTH_YEAR (as read)', 'age'], rows: [['preparation', 'null', '0', '1935 (inlined)', '-'], ['INSTANCE = new Elvis()', 'building', '0', '1935', '0 − 1935 = -1935'], ['CURRENT = parseInt("2026")', 'set', '2026', '1935', '-1935 (already computed)'], ['print', '-', '-', '-', '<span class="c-r">-1935</span>']] },
      complexity: `<p>O(1). This is a "Java Puzzlers"-style classic: the lesson is that static initialisation order is textual and constants are special.</p>`,
      followUps: ['What would happen if CURRENT were an Integer (boxed) initialised with 2026? (Hint: unboxing null)', 'Why is BIRTH_YEAR immune to the ordering problem?']
    }
  });

  practice.push({
    title: 'Cached Color Instances: Private Constructor + Static Factory',
    level: 'Hard', tags: ['static factory', 'private constructor', 'flyweight', 'static map'], companies: ['Adobe', 'Figma', 'Canva'],
    statement: `<p>A drawing app creates millions of <code>Color</code> objects, but only a few thousand distinct colours exist. Design an immutable <code>Color</code> whose instances are obtained only via <code>Color.of(r, g, b)</code>, which returns the <b>same</b> instance for the same components (so <code>Color.of(255,0,0) == Color.of(255,0,0)</code> is true). Also expose <code>Color.RED</code> and <code>Color.distinctCount()</code>. Components must be 0..255.</p>`,
    constraints: `Up to 10<sup>7</sup> calls to of(); at most 2<sup>24</sup> distinct colours; must be safe if called from several threads.`,
    example: `<p><code>Color.of(255, 0, 0) == Color.RED</code> → ${H.c('g', 'true')} (same cached object). <code>Color.of(10, 20, 30) == Color.of(10, 20, 30)</code> → ${H.c('g', 'true')}. <code>Color.of(300, 0, 0)</code> → ${H.c('r', 'IllegalArgumentException')}. After those calls, distinctCount() is ${H.c('g', '2')}.</p>`,
    brute: {
      why: `<p>A public constructor means every call allocates a new object: millions of identical colours waste memory and GC time, and <code>==</code> comparisons fail between equal colours. You cannot add caching later without changing every <code>new Color(...)</code> call site, which is exactly why static factories exist.</p>`,
      code: `
      class ColorBrute {
          final int r, g, b;
          ColorBrute(int r, int g, int b) { this.r = r; this.g = g; this.b = b; }
          public static void main(String[] args) {
              List<ColorBrute> pixels = new ArrayList<>();
              for (int i = 0; i < 1_000_000; i++) pixels.add(new ColorBrute(255, 0, 0));   // 1M identical objects
              System.out.println(pixels.get(0) == pixels.get(1));                          // false
          }
      }`
    },
    mcq: { q: 'Why must Color be immutable for this cache to be safe?', options: ['Callers share instances; if one could change its components, every other user of that colour would change too', 'Immutable objects are allocated on the stack', 'ConcurrentHashMap only stores immutable values', 'It is required for static methods'], answer: 0, explain: 'Caching means sharing. Shared mutable objects are aliasing bugs waiting to happen; immutable ones can be shared freely, across threads too.' },
    hints: [
      `<p>Hint 1: Make the constructor <code>private</code> so <code>of()</code> is the only way in. Pack the three components into one int key: <code>(r &lt;&lt; 16) | (g &lt;&lt; 8) | b</code>.</p>`,
      `<p>Hint 2: Keep a <code>private static final ConcurrentHashMap&lt;Integer, Color&gt;</code> cache and use <code>computeIfAbsent(key, k -&gt; new Color(r, g, b))</code>, which is atomic per key.</p>`,
      `<p>Hint 3: Static field order matters: declare the CACHE <b>before</b> <code>RED = of(255, 0, 0)</code>, otherwise RED\'s initializer runs while CACHE is still null (NullPointerException inside class initialisation).</p>`
    ],
    tests: { sig: 'int[][] -> string', fn: 'colorCheck',
      harness: { java: `class Check { static Class<?> fresh(String n) throws Exception { return new java.net.URLClassLoader(new java.net.URL[]{ new java.io.File(System.getProperty("java.class.path")).toURI().toURL() }, null).loadClass(n); } static String colorCheck(int[][] calls) throws Exception { Class<?> c = fresh("Color"); final java.lang.reflect.Method of = c.getDeclaredMethod("of", int.class, int.class, int.class); of.setAccessible(true); java.lang.reflect.Method dc = c.getDeclaredMethod("distinctCount"); dc.setAccessible(true); java.lang.reflect.Field red = c.getDeclaredField("RED"); red.setAccessible(true); List<Object> seen = new ArrayList<>(); StringBuilder sb = new StringBuilder(); for (int[] t : calls) { if (sb.length() > 0) sb.append(','); Object r; try { r = of.invoke(null, t[0], t[1], t[2]); } catch (java.lang.reflect.InvocationTargetException e) { sb.append(e.getCause() instanceof IllegalArgumentException ? "IAE" : "?"); continue; } int idx = -1; for (int i = 0; i < seen.size(); i++) if (seen.get(i) == r) { idx = i; break; } if (idx < 0) { seen.add(r); idx = seen.size() - 1; } sb.append(idx); } boolean isRed = of.invoke(null, 255, 0, 0) == red.get(null); int before = (Integer) dc.invoke(null); ExecutorService ex = Executors.newFixedThreadPool(8); List<Future<Object>> fs = new ArrayList<>(); for (int i = 0; i < 8; i++) fs.add(ex.submit(() -> { Object o = null; for (int k = 0; k < 500; k++) o = of.invoke(null, 7, 7, 7); return o; })); Object first = fs.get(0).get(); boolean same = true; for (Future<Object> f : fs) same &= f.get() == first; ex.shutdown(); int after = (Integer) dc.invoke(null); return sb + " red=" + isRed + " distinct=" + before + " threads=" + same + " delta=" + (after - before); } }` }, cases: [
      [[[[255,0,0],[10,20,30],[10,20,30]]],"0,1,1 red=true distinct=2 threads=true delta=1"],
      [[[[300,0,0]]],"IAE red=true distinct=1 threads=true delta=1"],
      [[[]]," red=true distinct=1 threads=true delta=1"],
      [[[[0,0,0],[0,0,0],[0,0,1]]],"0,0,1 red=true distinct=3 threads=true delta=1"],
      [[[[255,0,0],[255,0,0]]],"0,0 red=true distinct=1 threads=true delta=1"],
      [[[[0,0,-1]]],"IAE red=true distinct=1 threads=true delta=1"],
      [[[[256,256,256],[255,255,255],[255,255,255]]],"IAE,0,0 red=true distinct=2 threads=true delta=1"],
      [[[[1,2,3],[3,2,1],[2,1,3],[1,2,3]]],"0,1,2,0 red=true distinct=4 threads=true delta=1"],
      [[[[0,256,0]]],"IAE red=true distinct=1 threads=true delta=1"],
      [[[[-1,0,0],[0,0,0]]],"IAE,0 red=true distinct=2 threads=true delta=1"],
      [[[[0,0,5],[1,7,5],[2,14,5],[3,21,5],[4,28,5],[5,35,5],[6,42,5],[7,49,5],[8,56,5],[9,63,5],[10,70,5],[11,77,5],[12,84,5],[13,91,5],[14,98,5],[15,105,5],[16,112,5],[17,119,5],[18,126,5],[19,133,5],[20,140,5],[21,147,5],[22,154,5],[23,161,5],[24,168,5],[25,175,5],[26,182,5],[27,189,5],[28,196,5],[29,203,5],[30,210,5],[31,217,5],[32,224,5],[33,231,5],[34,238,5],[35,245,5],[36,252,5],[37,3,5],[38,10,5],[39,17,5],[40,24,5],[41,31,5],[42,38,5],[43,45,5],[44,52,5],[45,59,5],[46,66,5],[47,73,5],[48,80,5],[49,87,5],[50,94,5],[51,101,5],[52,108,5],[53,115,5],[54,122,5],[55,129,5],[56,136,5],[57,143,5],[58,150,5],[59,157,5],[60,164,5],[61,171,5],[62,178,5],[63,185,5],[64,192,5],[65,199,5],[66,206,5],[67,213,5],[68,220,5],[69,227,5],[70,234,5],[71,241,5],[72,248,5],[73,255,5],[74,6,5],[75,13,5],[76,20,5],[77,27,5],[78,34,5],[79,41,5],[80,48,5],[81,55,5],[82,62,5],[83,69,5],[84,76,5],[85,83,5],[86,90,5],[87,97,5],[88,104,5],[89,111,5],[90,118,5],[91,125,5],[92,132,5],[93,139,5],[94,146,5],[95,153,5],[96,160,5],[97,167,5],[98,174,5],[99,181,5],[100,188,5],[101,195,5],[102,202,5],[103,209,5],[104,216,5],[105,223,5],[106,230,5],[107,237,5],[108,244,5],[109,251,5],[110,2,5],[111,9,5],[112,16,5],[113,23,5],[114,30,5],[115,37,5],[116,44,5],[117,51,5],[118,58,5],[119,65,5],[120,72,5],[121,79,5],[122,86,5],[123,93,5],[124,100,5],[125,107,5],[126,114,5],[127,121,5],[128,128,5],[129,135,5],[130,142,5],[131,149,5],[132,156,5],[133,163,5],[134,170,5],[135,177,5],[136,184,5],[137,191,5],[138,198,5],[139,205,5],[140,212,5],[141,219,5],[142,226,5],[143,233,5],[144,240,5],[145,247,5],[146,254,5],[147,5,5],[148,12,5],[149,19,5],[150,26,5],[151,33,5],[152,40,5],[153,47,5],[154,54,5],[155,61,5],[156,68,5],[157,75,5],[158,82,5],[159,89,5],[160,96,5],[161,103,5],[162,110,5],[163,117,5],[164,124,5],[165,131,5],[166,138,5],[167,145,5],[168,152,5],[169,159,5],[170,166,5],[171,173,5],[172,180,5],[173,187,5],[174,194,5],[175,201,5],[176,208,5],[177,215,5],[178,222,5],[179,229,5],[180,236,5],[181,243,5],[182,250,5],[183,1,5],[184,8,5],[185,15,5],[186,22,5],[187,29,5],[188,36,5],[189,43,5],[190,50,5],[191,57,5],[192,64,5],[193,71,5],[194,78,5],[195,85,5],[196,92,5],[197,99,5],[198,106,5],[199,113,5],[200,120,5],[201,127,5],[202,134,5],[203,141,5],[204,148,5],[205,155,5],[206,162,5],[207,169,5],[208,176,5],[209,183,5],[210,190,5],[211,197,5],[212,204,5],[213,211,5],[214,218,5],[215,225,5],[216,232,5],[217,239,5],[218,246,5],[219,253,5],[220,4,5],[221,11,5],[222,18,5],[223,25,5],[224,32,5],[225,39,5],[226,46,5],[227,53,5],[228,60,5],[229,67,5],[230,74,5],[231,81,5],[232,88,5],[233,95,5],[234,102,5],[235,109,5],[236,116,5],[237,123,5],[238,130,5],[239,137,5],[240,144,5],[241,151,5],[242,158,5],[243,165,5],[244,172,5],[245,179,5],[246,186,5],[247,193,5],[248,200,5],[249,207,5],[250,214,5],[251,221,5],[252,228,5],[253,235,5],[254,242,5],[255,249,5],[0,0,5],[1,7,5],[2,14,5],[3,21,5],[4,28,5],[5,35,5],[6,42,5],[7,49,5],[8,56,5],[9,63,5],[10,70,5],[11,77,5],[12,84,5],[13,91,5],[14,98,5],[15,105,5],[16,112,5],[17,119,5],[18,126,5],[19,133,5],[20,140,5],[21,147,5],[22,154,5],[23,161,5],[24,168,5],[25,175,5],[26,182,5],[27,189,5],[28,196,5],[29,203,5],[30,210,5],[31,217,5],[32,224,5],[33,231,5],[34,238,5],[35,245,5],[36,252,5],[37,3,5],[38,10,5],[39,17,5],[40,24,5],[41,31,5],[42,38,5],[43,45,5]]],"0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133,134,135,136,137,138,139,140,141,142,143,144,145,146,147,148,149,150,151,152,153,154,155,156,157,158,159,160,161,162,163,164,165,166,167,168,169,170,171,172,173,174,175,176,177,178,179,180,181,182,183,184,185,186,187,188,189,190,191,192,193,194,195,196,197,198,199,200,201,202,203,204,205,206,207,208,209,210,211,212,213,214,215,216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,232,233,234,235,236,237,238,239,240,241,242,243,244,245,246,247,248,249,250,251,252,253,254,255,0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43 red=true distinct=257 threads=true delta=1"],
      [[{"$rep":[12,34,56],"n":1000}],"0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0 red=true distinct=2 threads=true delta=1"]
    ] },
    solution: {
      approach: `<p>Flyweight via static factory: a private constructor, an immutable final class, a static concurrent cache keyed by the packed RGB value, and constants defined after the cache. <code>computeIfAbsent</code> guarantees one instance per key even under concurrency, so identity comparison works for equal colours.</p>`,
      code: `
      final class Color {
          // ORDER MATTERS: the cache must be initialised before any constant calls of()
          private static final ConcurrentHashMap<Integer, Color> CACHE = new ConcurrentHashMap<>();
          static final Color RED = of(255, 0, 0);

          private final int r, g, b;

          private Color(int r, int g, int b) { this.r = r; this.g = g; this.b = b; }

          static Color of(int r, int g, int b) {
              check(r); check(g); check(b);
              int key = (r << 16) | (g << 8) | b;                    // unique 24-bit key
              return CACHE.computeIfAbsent(key, k -> new Color(r, g, b));
          }

          private static void check(int c) {
              if (c < 0 || c > 255) throw new IllegalArgumentException("component out of range: " + c);
          }

          static int distinctCount() { return CACHE.size(); }

          @Override
          public String toString() { return "rgb(" + r + "," + g + "," + b + ")"; }

          public static void main(String[] args) {
              System.out.println(Color.of(255, 0, 0) == Color.RED);              // true
              System.out.println(Color.of(10, 20, 30) == Color.of(10, 20, 30));  // true
              System.out.println(Color.distinctCount());                          // 2
          }
      }`,
      dry: { head: ['call', 'key', 'cache before', 'action', 'returns'], rows: [['class init: RED = of(255,0,0)', '0xFF0000', '{}', 'create + store', 'Color#1'], ['of(255,0,0)', '0xFF0000', '{FF0000}', 'hit', 'Color#1 (same as RED)'], ['of(10,20,30)', '0x0A141E', '{FF0000}', 'create + store', 'Color#2'], ['of(10,20,30)', '0x0A141E', '{FF0000, 0A141E}', 'hit', 'Color#2'], ['of(300,0,0)', '-', '-', '<span class="c-r">throws</span>', '-']] },
      complexity: `<p>of(): O(1) average (hash lookup); memory O(distinct colours) instead of O(calls). Note the cache never shrinks; for unbounded key spaces you would need weak references or an eviction policy (e.g. a bounded cache library).</p>`,
      followUps: ['Integer.valueOf caches -128..127. How is that similar?', 'What breaks if you swap the order of CACHE and RED?', 'When would you prefer equals() over relying on == even with a cache?']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: 'How many objects does <code>Dog a = new Dog(); Dog b = a; Dog c = b;</code> create?', options: ['1', '2', '3', '0'], answer: 0, explain: 'Only <code>new</code> creates objects. The other two lines copy the reference, so a, b and c all point to the same Dog.' },
    { q: 'What is printed? <code>class P { int n; } ... P p = new P(); System.out.println(p.n);</code>', options: ['0', 'Compile error: n not initialized', 'null', 'A random value'], answer: 0, explain: 'Fields get default values (0 for int). Only local variables must be assigned before use.' },
    { q: 'You add <code>Car(String model)</code> to a class that had no constructors. What happens to <code>new Car()</code> elsewhere?', options: ['Compile error: the default no-arg constructor is no longer generated', 'It still works; Java always keeps a no-arg constructor', 'It works but model is null', 'Runtime exception'], answer: 0, explain: 'The compiler adds a default constructor only when the class declares none. Declare Car() yourself if you need it.' },
    { q: 'Which statement about <code>this(...)</code> is true in Java 21?', options: ['It must be the first statement of a constructor', 'It can be called from any method', 'It can be combined with super(...) in the same constructor', 'It creates a second object'], answer: 0, explain: 'this(...) delegates to another constructor of the same object and must come first (Java 25 relaxes this with flexible constructor bodies). You cannot have both this(...) and super(...).' },
    { q: 'Inside <code>Student(String name) { name = name; }</code>, what happens to the field <code>name</code>?', options: ['It stays null: the parameter is assigned to itself', 'It is set to the argument', 'Compile error', 'It becomes an empty string'], answer: 0, explain: 'The parameter shadows the field. Use this.name = name to target the field.' },
    { q: 'Java passes object arguments to methods...', options: ['by value: the reference is copied', 'by reference: the variable itself is shared', 'by cloning the object', 'by value for Strings and by reference for other objects'], answer: 0, explain: 'Java is always pass-by-value. For objects the value is a reference, so mutations are visible to the caller, but reassigning the parameter is not.' },
    { q: 'What does <code>Util u = null; u.hello();</code> do if <code>hello</code> is a <b>static</b> method?', options: ['Calls hello() normally: static calls are bound to the class', 'Throws NullPointerException', 'Compile error', 'Calls nothing silently'], answer: 0, explain: 'Static methods are resolved by the compile-time type; the reference value is ignored (the compiler warns). Never write this in real code.' },
    { q: 'Which access triggers class initialisation (running static blocks)?', options: ['Calling a static method of the class', 'Reading a static final int constant like MAX = 10', 'Creating an array new Config[5]', 'Declaring a variable Config c;'], answer: 0, explain: 'Static method calls, new, non-constant static field access, subclass initialisation and reflection initialise a class. Constants are inlined, arrays and declarations do not count.' },
    { q: 'For <code>new B()</code> where B extends A, and both have static blocks, instance blocks and constructors, the first time — which order is correct?', options: ['A-static, B-static, A-instance, A-ctor, B-instance, B-ctor', 'B-static, A-static, B-instance, B-ctor, A-instance, A-ctor', 'A-static, A-instance, A-ctor, B-static, B-instance, B-ctor', 'A-static, B-static, B-instance, A-instance, A-ctor, B-ctor'], answer: 0, explain: 'Classes initialise parent first. Then per object, the parent part (initializers + constructor body) is built before the child part.' },
    { q: 'Which top-level class declaration compiles?', options: ['<code>class Helper { }</code> in Main.java', '<code>private class Helper { }</code>', '<code>protected class Helper { }</code>', '<code>public class Helper { }</code> in Main.java'], answer: 0, explain: 'Top-level classes can be public or package-private only, and a public class must live in a file with its name.' },
    { q: 'A member with <b>no access modifier</b> is visible to...', options: ['classes in the same package only', 'subclasses anywhere', 'everyone', 'only the declaring class'], answer: 0, explain: 'No modifier means package-private. Unlike protected, it does not extend to subclasses in other packages.' },
    { q: '<code>import java.util.*;</code> lets you use which class without qualification?', options: ['java.util.ArrayList', 'java.util.concurrent.ConcurrentHashMap', 'java.util.function.Function', 'All three'], answer: 0, explain: 'A wildcard import covers the types of one package, not its sub-packages. java.util.concurrent and java.util.function need their own imports.' },
    { q: 'What prints? <code>static int a = f(); static int b = 5; static int f() { return b * 2; }</code> then <code>System.out.println(a);</code>', options: ['0', '10', 'Compile error: illegal forward reference', '5'], answer: 0, explain: 'Initializers run top to bottom. When a is initialised, b is still 0, so f() returns 0. Going through a method avoids the forward-reference compile error.' }
  );

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push(
    { q: 'What is the difference between a class and an object?', level: 'B', a: `<p>A <b>class</b> is a blueprint: it declares what data (fields) and behaviour (methods, constructors) its instances will have. It exists once, as compiled code and metadata. An <b>object</b> is a concrete instance created at runtime with <code>new</code>: a block of heap memory holding its own copy of every instance field, plus a header pointing back to its class. One class can have any number of objects; changing one object\'s fields does not affect the others. Analogy: cookie cutter vs cookies.</p>`, followUps: ['Where are methods stored: per object or per class?', 'How many objects does a line with two new keywords and one string literal create?'] },
    { q: 'Explain what happens, step by step, when you write <code>Dog d = new Dog("Rex");</code>', level: 'B', a: `<p>(1) If Dog is not initialised yet, the JVM loads, links and initialises it (static initializers run once). (2) Memory for a Dog is allocated on the heap (usually a fast TLAB pointer bump) and every field is set to its default (0/false/null). (3) The matching constructor runs: first <code>super(...)</code> up the chain to Object, then Dog\'s field initializers and instance blocks in source order, then the rest of the constructor body. (4) The reference to the fully built object is returned and stored in the local variable <code>d</code>, which lives in main\'s stack frame.</p>`, followUps: ['Can the JIT avoid the heap allocation? (escape analysis)', 'What if the constructor throws an exception?'] },
    { q: 'Is Java pass-by-value or pass-by-reference? Prove it.', level: 'B', a: `<p>Always <b>pass-by-value</b>. For primitives the value is the number; for objects the value is the <b>reference</b> (an address). Proof: a method that does <code>param = new Box(99)</code> never changes which object the caller\'s variable points to, and a swap(a, b) that reassigns parameters has no effect on the caller. What people mistake for pass-by-reference is mutation: <code>param.value = 42</code> follows the copied reference to the same shared object, so the caller observes the change. Java has no equivalent of C++ reference parameters.</p>`, followUps: ['Why does a String parameter look like it is passed by value "differently"?', 'How would you return two values from a method?'] },
    { q: 'What is the default constructor, and when does the compiler NOT provide it?', level: 'B', a: `<p>If a class declares <b>no constructors at all</b>, javac generates a no-arg constructor with the same access as the class, whose body just calls <code>super()</code>. As soon as you declare <b>any</b> constructor (even one with parameters), no default is generated, so <code>new X()</code> stops compiling unless you write <code>X()</code> yourself. A related trap: if the parent class has no no-arg constructor, a subclass\'s implicit <code>super()</code> fails, so the subclass must call <code>super(args)</code> explicitly. Frameworks like JPA need a no-arg constructor (it may be protected).</p>`, followUps: ['Is the default constructor the same as a no-arg constructor you write?', 'What access modifier does the generated constructor get?'] },
    { q: 'What is constructor chaining? What are the rules for <code>this()</code> and <code>super()</code>?', level: 'I', a: `<p>Chaining means one constructor delegates to another: <code>this(...)</code> to another constructor of the same class, <code>super(...)</code> to a parent constructor. It keeps validation and assignments in one master constructor. Rules (Java 21): the call must be the <b>first statement</b>; a constructor can have <b>either</b> this(...) or super(...), not both; if neither is written, <code>super()</code> is inserted; cyclic this(...) calls are a compile error; arguments cannot reference instance fields or methods (only parameters, statics, constants). Java 25 (JEP 513) allows statements before the call as long as they do not use <code>this</code>.</p>`, followUps: ['Why can\'t you use an instance method to compute an argument to this(...)?', 'Do instance initializers run once or twice when this(...) is used?'] },
    { q: 'What are all the uses of the <code>this</code> keyword?', level: 'B', a: `<p>(1) Refer to the current object\'s fields when a parameter or local shadows them: <code>this.name = name</code>. (2) Call another constructor: <code>this(...)</code>. (3) Return the current object for fluent chaining: <code>return this</code>. (4) Pass the current object to other methods: <code>listener.register(this)</code>. (5) From an inner class, reach the enclosing instance with <code>Outer.this</code>. <code>this</code> does not exist in static contexts, is never null inside an instance method, and cannot be reassigned. In lambdas it means the enclosing instance; in anonymous classes it means the anonymous object.</p>`, followUps: ['What is "this escape" and why is it dangerous?', 'How is this passed at the bytecode level? (slot 0)'] },
    { q: 'What does <code>static</code> mean for fields, methods and blocks?', level: 'B', a: `<p>Static members belong to the <b>class</b>, not to instances. A static field has exactly one copy shared by all objects (per class loader), accessible as <code>ClassName.field</code> even with no objects. A static method has no <code>this</code>, so it can use only static members directly (or objects passed in); it is bound at compile time and cannot be overridden, only hidden. A static block runs once during class initialisation, in source order with static field initializers. Typical uses: constants, counters, factories, caches, pure utility functions. Static mutable state is global state: hard to test and not thread-safe by default.</p>`, followUps: ['Can a static method access an instance field through an object reference?', 'Where are static fields stored since Java 8?'] },
    { q: 'Can we override static methods? Can we overload them? What is method hiding?', level: 'I', a: `<p>Static methods can be <b>overloaded</b> (same name, different parameters) like any method. They cannot be <b>overridden</b>: if a subclass declares a static method with the same signature, it <b>hides</b> the parent\'s. The call is resolved by the <b>compile-time type</b> of the reference: <code>Parent p = new Child(); p.staticMethod()</code> calls Parent\'s version, unlike instance methods which use the runtime type. Adding <code>@Override</code> to a static method is a compile error. An instance method cannot hide a static one or vice versa (compile error).</p>`, followUps: ['Why can main be overloaded but the JVM only calls one?', 'What happens if you call a static method through a null reference?'] },
    { q: 'Describe the complete initialization order for a class hierarchy.', level: 'I', a: `<p><b>Class initialisation (once, on first active use):</b> parent class first; within a class, static fields get defaults, then static initializers and static blocks run top to bottom. <b>Object creation (each new):</b> allocate and zero all fields; enter the constructor; follow any this(...) chain; call super(...) so the parent part is built entirely (its initializers then its constructor body); then this class\'s instance field initializers and instance blocks top to bottom; then the remaining constructor body (and the bodies of delegating constructors, innermost first). Consequences: an overridable method called from the parent constructor sees child fields at defaults, and a static field that instantiates the class before later statics are set sees defaults.</p>`, followUps: ['When does a static block NOT run even though the class is referenced?', 'What is the output when main is inside the class with the static block?'] },
    { q: 'What are the four access levels in Java, and what does protected really mean?', level: 'I', a: `<p><code>private</code>: only the declaring top-level class (including its nested classes). Package-private (no keyword): any class in the same package. <code>protected</code>: same package <b>plus</b> subclasses in other packages, but in another package only through inheritance, i.e. on <code>this</code> or references of the subclass type, not on arbitrary parent-type objects. <code>public</code>: everywhere (subject to JPMS module exports). Top-level classes may only be public or package-private. Overrides may widen but not narrow access. Rule of thumb: use the narrowest level that works; protected is often wider than intended because it opens the whole package.</p>`, followUps: ['Can a subclass in another package call a protected method on a different instance of the parent class?', 'How do JPMS modules change what public means?'] },
    { q: 'What is encapsulation, and is a class with private fields and public getters/setters for all of them encapsulated?', level: 'I', a: `<p>Encapsulation means hiding internal state and exposing <b>behaviour that preserves invariants</b>, so the object can never be put into an invalid state and its internals can change without breaking callers. Private fields with a public getter and setter for every field are only <b>syntactically</b> encapsulated: setters let anyone set any value, and getters that return mutable internals (lists, arrays, dates) let callers modify state behind your back. Real encapsulation: validate in constructors and operations (<code>withdraw</code> instead of <code>setBalance</code>), make fields final where possible, return defensive copies or unmodifiable views, and expose as little as possible.</p>`, followUps: ['How does immutability make encapsulation easier?', 'What is a defensive copy and when is it needed on input as well as output?'] },
    { q: 'How do packages work, and why do I get "Could not find or load main class"?', level: 'I', a: `<p>A package is a namespace and an access boundary. <code>package com.acme.shop;</code> makes the class\'s fully qualified name <code>com.acme.shop.Main</code>, and by convention (enforced for the classpath lookup) the class file must be at <code>&lt;classpath-root&gt;/com/acme/shop/Main.class</code>. Compile with <code>javac -d out ...</code> to create that tree, and run with <code>java -cp out com.acme.shop.Main</code>. The error usually means you passed a path instead of a fully qualified name, ran from inside the package folder, used the wrong classpath root, or the package declaration does not match the folder.</p>`, followUps: ['Does import load classes or affect performance?', 'Why can\'t a class in a named package import a class from the default package?'] },
    { q: 'How would you implement a thread-safe singleton, and which way do you prefer?', level: 'A', a: `<p>Options: (1) <b>Eager</b> <code>static final</code> instance: simple and thread-safe via class initialisation, but created at first use of the class. (2) <b>Holder idiom</b>: a private static nested class holds the instance; the JVM initialises it lazily and exactly once under its class-init lock; no synchronisation afterwards. (3) <b>Enum singleton</b>: <code>enum Service { INSTANCE; }</code>, also safe against reflection and serialization attacks. (4) <b>Double-checked locking</b> with a <code>volatile</code> field: correct since Java 5 but easy to get wrong. I prefer enum or holder, and in application code I prefer dependency injection with a single managed instance over a static singleton, because static singletons hide dependencies and hurt testability.</p>`, followUps: ['Why does double-checked locking need volatile?', 'How can serialization create a second instance of a class-based singleton?'] },
    { q: 'What is "this escape" during construction, and how can it break even final fields?', level: 'A', a: `<p>This escape happens when a constructor publishes <code>this</code> before it finishes: registering itself as a listener, starting a thread with itself as the Runnable, storing itself in a static collection, or calling an overridable method. Other code or threads can then observe the object with default values. The Java Memory Model\'s final-field guarantee (other threads see correctly initialised final fields without synchronisation) only holds if <code>this</code> does not escape during construction. Fixes: construct fully, then publish from a static factory; do not start threads in constructors; avoid overridable calls in constructors. JDK 21\'s <code>javac -Xlint:this-escape</code> warns about many cases.</p>`, followUps: ['Why is starting a thread in a constructor considered bad practice?', 'How does safe publication through a volatile or final field work?'] },
    { q: 'When is a class initialised? Name cases where it is NOT initialised even though it appears in code.', level: 'E', a: `<p>A class is initialised on its first <b>active use</b>: <code>new</code>, invoking a static method, reading or writing a non-constant static field, reflective calls such as <code>Class.forName(name)</code> (initialises by default), initialisation of a subclass, or being the main class. NOT initialised by: reading a compile-time constant (<code>static final int X = 10</code> or a String constant, which is inlined into the caller), creating an array of the type, declaring a variable of the type, <code>Foo.class</code> literals, <code>ClassLoader.loadClass</code>, or accessing an inherited static field through a subclass (only the declaring class initialises). Interfaces initialise only when their own non-constant statics are used (or a default method forces it). If a static initializer throws, you get ExceptionInInitializerError and later NoClassDefFoundError.</p>`, followUps: ['Why can changing a constant in a library JAR not take effect until callers are recompiled?', 'How can two classes deadlock during static initialisation?'] }
  );

  /* Deterministically rotate MCQ options so the correct answer is not always in the same position. */
  function rotate(m, k) {
    if (!m || !m.options) return;
    var n = m.options.length, s = k % n;
    if (!s) return;
    m.options = m.options.slice(s).concat(m.options.slice(0, s));
    m.answer = (m.answer - s + n) % n;
  }
  quiz.forEach(function (q, i) { rotate(q, i * 3 + 1); });
  practice.forEach(function (p, i) { rotate(p.mcq, i * 3 + 2); });
  topics.forEach(function (t, i) { (t.problems || []).forEach(function (p, j) { rotate(p.mcq, i + j + 2); }); });

  registerModule({
    id: 'java03',
    title: 'Classes, Objects, Constructors, static & this',
    intro: `<p>This is the module where Java stops being "a main method with some loops" and becomes <b>object-oriented</b>. You will learn to design your own types (classes), stamp out objects with <code>new</code>, and, most importantly, build an exact mental picture of what lives on the <b>stack</b> and what lives on the <b>heap</b>: the key to every aliasing bug and every "predict the output" interview question.</p>
<p>We then go deep on <b>constructors</b> (default constructors, overloading, chaining with <code>this(...)</code>), the many jobs of <b>this</b>, the class-level world of <b>static</b> fields, methods and blocks, the precise <b>initialization order</b> that interviewers love to test, and finally <b>access modifiers and packages</b>, which turn a pile of classes into a well-encapsulated program. Every topic has a step-by-step visualizer showing code, call stack, stack variables and heap objects, plus worked examples, guided problems and an output-prediction practice set.</p>`,
    goals: [
      'Draw the stack and heap for any snippet: count objects, spot aliases, and say which objects are eligible for garbage collection',
      'Explain precisely why Java is pass-by-value, and predict what a method can and cannot change for its caller',
      'Write classes with validating constructors chained through <code>this(...)</code>, and know exactly when the default constructor exists',
      'Use <code>this</code> correctly for shadowing, fluent APIs and passing the current object, and avoid this-escape',
      'Choose between static and instance members, know when static blocks run, and build counters, utility classes and thread-safe singletons',
      'Predict the output of any initialization-order puzzle (static vs instance blocks, parent vs child, constants, self-instantiating statics)',
      'Apply the four access levels and packages to encapsulate state, and compile/run packaged code with javac -d and java -cp'
    ],
    prereqs: `Java 1 (JDK/JVM basics, primitive types, operators) and Java 2 (control flow, methods, arrays, basic Strings). You should be comfortable writing and running a <code>main</code> method and calling static methods.`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
