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
        alt: [{ lang: 'python', code: `class Coffee:\n    SIZES = {"S", "M", "L"}\n    # Python has no overloading: default arguments play the role of chained constructors\n    def __init__(self, size="M", shots=1, milk="none"):\n        if size not in Coffee.SIZES:\n            raise ValueError(f"bad size {size}")\n        if not 1 <= shots <= 4:\n            raise ValueError("shots must be 1..4")\n        self.size, self.shots, self.milk = size, shots, milk\n    def __repr__(self):\n        return f"{self.size} / {self.shots} shot(s) / {self.milk}"\n\nprint(Coffee(), Coffee("L"), Coffee("S", 2, "oat"))\ntry:\n    Coffee("XL")\nexcept ValueError as e:\n    print(e)`, run: true }],
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
        alt: [{ lang: 'python', code: `class Point:\n    def __init__(self, x, y):\n        self.x, self.y = x, y      # self is Python's explicit 'this'\n    def translate(self, dx, dy):\n        self.x += dx; self.y += dy\n        return self\n    def distance_to(self, o):\n        import math\n        return math.hypot(self.x - o.x, self.y - o.y)\n    def __repr__(self):\n        return f"({self.x}, {self.y})"\n\np = Point(1, 2).translate(2, 2).translate(-1, 0)\nprint(p, p.distance_to(Point(5, 8)))`, run: true }],
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
        alt: [{ lang: 'python', code: `# Python analogue: class body runs once (like static init), __init__ per object\nclass Shop:\n    customers = 0\n    print("S: open, customers=", customers)\n    customers = 100\n    def __init__(self, name=None):\n        Shop.customers += 1\n        self.visit = Shop.customers\n        print("I: visit", self.visit)\n        print("C: welcome #", self.visit)\n        if name:\n            print("C2:", name)\n\nShop(); Shop("VIP"); print("customers=", Shop.customers)\n# Note: unlike Java, Python runs the class body when the class statement executes, not lazily.`, run: true }],
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
        alt: [{ lang: 'python', code: `class Inventory:\n    def __init__(self):\n        self._items = []          # leading underscore = "private by convention" (Python has no access modifiers)\n    def add(self, item):\n        if not item or not item.strip():\n            raise ValueError("item required")\n        self._items.append(item)\n    def get(self, i):\n        return self._items[i]\n    def size(self):\n        return len(self._items)\n    def items(self):\n        return list(self._items)  # defensive copy\n\ninv = Inventory(); inv.add("pen"); inv.add("book")\nsnap = inv.items(); snap[0] = "HACKED"\nprint(inv.get(0), inv.size())`, run: true }],
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
    constraints: `Use F = C × 9/5 + 32. Inputs within ±10<sup>6</sup>.`,
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
  practice.forEach(function (p, i) { rotate(p.mcq, i * 2 + 1); });
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
