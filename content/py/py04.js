(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared visualizer helpers (py04) ---------- */
  function cp(code, line, cls, label) {
    var hl = {};
    if (line) hl[line] = cls || 'cur';
    return { type: 'code', label: label || 'Python code (current line highlighted)', lang: 'python', code: code, hl: hl };
  }
  function vp(vals, hlKeys, cls, label) {
    var hl = {};
    if (hlKeys) String(hlKeys).split(',').forEach(function (k) { hl[k] = cls || 'ok'; });
    return { type: 'vars', label: label || 'Local variables in this call', vals: vals, hl: hl };
  }
  function mp(label, obj, hlKey, cls) {
    var entries = Object.keys(obj).map(function (k) { return [k, obj[k]]; });
    var hl = {};
    if (hlKey !== undefined && hlKey !== null) hl[hlKey] = cls || 'ok';
    return { type: 'map', label: label, entries: entries, hl: hl };
  }
  function tx(html, label) { return { type: 'text', label: label, html: html }; }
  function fr(narr, parts) { return { narr: narr, parts: parts }; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function q(s) { return "'" + s + "'"; }
  function copy(o) { var r = {}; Object.keys(o).forEach(function (k) { r[k] = o[k]; }); return r; }
  function ident(s) {
    var t = String(s).toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!t || /^[0-9]/.test(t)) t = 'obj_' + t;
    return t;
  }

  /* ================= TOPIC 1: classes, __init__, self ================= */
  topics.push({
    title: 'Classes, Objects, __init__ and self',
    analogy: `<p>A <b>class</b> is a <b>cookie cutter</b>; each <b>object</b> is a cookie. One cutter, many cookies — each cookie can get its own sprinkles (its own data), but all share the same shape (the same methods). <code>__init__</code> is the moment you decorate a fresh cookie, and <code>self</code> is your finger pointing at "<i>this</i> cookie right here" so the sprinkles land on the right one.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> So far you have kept related data in loose variables or dicts: <code>name = 'Rex'</code>, <code>age = 3</code>. A <b>class</b> lets you bundle <b>data</b> (attributes) and the <b>actions</b> on that data (methods) into one new type. Each value you create from the class is an <b>object</b> (also called an <b>instance</b>).</p>
<pre>class Dog:                         # 1. the blueprint
    def __init__(self, name, age):  # 2. runs once per new object
        self.name = name            #    store data ON this object
        self.age = age

    def bark(self):                 # 3. a method = function inside a class
        return self.name + ' says Woof!'

rex = Dog('Rex', 3)                 # 4. make an object (an instance)
print(rex.bark())                   # Rex says Woof!</pre>
<p><b>What happens when you write <code>Dog('Rex', 3)</code>?</b></p>
${H.table(['Step', 'What Python does', 'Plain English'], [
  ['1', '<code>Dog.__new__(Dog)</code>', 'make a brand-new, <b>empty</b> object of type Dog'],
  ['2', '<code>Dog.__init__(obj, \'Rex\', 3)</code>', 'call your setup method with <code>self</code> = that new object'],
  ['3', '<code>self.name = name</code>', 'stick a label <code>name</code> on <b>this</b> object'],
  ['4', 'return the object', 'the variable <code>rex</code> now points at it']
])}
<p><b>self is not magic, it is just the first parameter.</b> When you call <code>rex.bark()</code>, Python quietly rewrites it as <code>Dog.bark(rex)</code>. So inside <code>bark</code>, <code>self</code> <i>is</i> <code>rex</code>. The name <code>self</code> is only a convention, but everyone uses it, so you should too.</p>
<p><b>__init__ is an initializer, not a constructor.</b> The object already exists when <code>__init__</code> runs; its job is to fill it in. It must return <code>None</code> (returning anything else is a <code>TypeError</code>).</p>
<p><b>Every object has its own notebook</b>: <code>rex.__dict__</code> is a dict of that object's attributes, e.g. <code>{'name': 'Rex', 'age': 3}</code>. You can also call <code>vars(rex)</code> to see it.</p>
<p><b>Naming conventions:</b> classes use <code>CapWords</code> (<code>BankAccount</code>), methods and attributes use <code>snake_case</code>. A leading underscore <code>_balance</code> means "internal, please don't touch" — Python does not enforce privacy; it trusts you ("we are all consenting adults").</p>`,
    clues: [
      '"design a class that…" / "implement the <code>X</code> class with methods…" (LeetCode design problems: MinStack, LRUCache) → constructor sets up state in <code>__init__</code>, each operation is a method using <code>self</code>',
      '"each user/account/order has its own …" → that data belongs on <code>self</code> (an instance attribute set in <code>__init__</code>)',
      '"bundle data and behaviour together" / "model a real-world entity" → a class, not a loose dict + functions',
      '"<code>TypeError: … takes 1 positional argument but 2 were given</code>" → you forgot <code>self</code> in the method definition',
      '"what is the difference between <code>__new__</code> and <code>__init__</code>?" → create vs initialise',
      '"<code>AttributeError: \'Dog\' object has no attribute \'name\'</code>" → attribute was never assigned on <code>self</code> (typo, or assigned to a local variable instead)'
    ],
    code: [{ lang: 'python', run: true, title: 'A complete small class (runnable)', code: `class Dog:
    """A dog with a name and an age."""

    def __init__(self, name, age):
        # __init__ runs automatically right after the object is created.
        # 'self' is the brand-new object; we attach data to it.
        self.name = name
        self.age = age

    def bark(self):
        # self lets the method reach THIS dog's data
        return self.name + ' says Woof!'

    def birthday(self):
        self.age += 1          # change this object's own state
        return self.age


rex = Dog('Rex', 3)
bella = Dog('Bella', 5)

print(rex.bark())                  # Rex says Woof!
print(bella.bark())                # Bella says Woof!
print(rex.birthday())              # 4  (only rex changed)
print(bella.age)                   # 5
print(vars(rex))                   # {'name': 'Rex', 'age': 4}
print(type(rex).__name__, isinstance(rex, Dog))   # Dog True

# obj.method() is shorthand for Class.method(obj):
print(Dog.bark(bella))             # Bella says Woof!` }],
    codeTitle: ['Classes, __init__ and self'],
    viz: {
      title: 'Watch Dog(...) build objects step by step',
      input: 'Rex 3, Bella 5',
      inputLabel: 'Dogs to create: name age, name age (max 3)',
      gen: function (input) {
        var specs = String(input).split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
        if (!specs.length) throw new Error('Enter dogs like: Rex 3, Bella 5');
        if (specs.length > 3) throw new Error('Use at most 3 dogs');
        var dogs = specs.map(function (s) {
          var p = s.split(/\s+/);
          if (p.length !== 2 || !/^[A-Za-z][A-Za-z0-9_]*$/.test(p[0]) || !/^\d{1,3}$/.test(p[1])) throw new Error('Each dog must be: Name age (e.g. Rex 3)');
          return { name: p[0], age: parseInt(p[1], 10), v: ident(p[0]) };
        });
        var base = ['class Dog:', '    def __init__(self, name, age):', '        self.name = name', '        self.age = age', '', '    def bark(self):', "        return self.name + ' says Woof!'", ''];
        var lines = base.slice();
        dogs.forEach(function (d) { lines.push(d.v + ' = Dog(' + q(d.name) + ', ' + d.age + ')'); });
        lines.push('print(' + dogs[0].v + '.bark())');
        var code = lines.join('\n');
        var frames = [];
        var nodes = [{ id: 'C', label: 'Dog (class)', x: 85, y: 30, shape: 'box' }];
        var edges = [];
        var made = [];
        function graph(hl, ehl, tags) {
          return { type: 'graph', label: 'Names → objects → class', directed: true, height: 60, nodes: nodes.slice(), edges: edges.slice(), hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
        }
        frames.push(fr('Python runs the <b>class body once</b>. It creates a <b>class object</b> called <code>Dog</code> and stores the two functions <code>__init__</code> and <code>bark</code> inside it. No dogs exist yet — we only have the cookie cutter.', [
          cp(code, 1), graph({ C: 'ok' }), mp('Dog.__dict__ (shared by every Dog)', { __init__: 'function', bark: 'function' })
        ]));
        dogs.forEach(function (d, i) {
          var line = base.length + 1 + i;
          var oid = 'O' + i, vid = 'V' + i, y = 10 + i * 20;
          nodes.push({ id: oid, label: 'Dog object #' + (i + 1), x: 50, y: y, shape: 'box' });
          edges.push([oid, 'C', '__class__']);
          var hl = {}; hl[oid] = 'cur';
          var eh = {}; eh[oid + '-C'] = 'cur';
          frames.push(fr('Line ' + line + ': <code>Dog(' + q(d.name) + ', ' + d.age + ')</code>. Step 1 — Python calls <code>__new__</code> and gets a brand-new <b>empty</b> object. It already knows its class (<code>__class__</code> arrow) but has <b>no data yet</b>.', [
            cp(code, line), graph(hl, eh), mp('object #' + (i + 1) + ' .__dict__ (its own notebook)', {})
          ]));
          frames.push(fr('Step 2 — Python calls <code>Dog.__init__(obj, ' + q(d.name) + ', ' + d.age + ')</code>. The new object is passed in as <b>self</b> automatically; you only typed the other two arguments.', [
            cp(code, 2), graph(hl), vp({ self: 'Dog object #' + (i + 1), name: q(d.name), age: d.age }, 'self', 'cur'),
            { type: 'stack', label: 'Call stack', items: ['<module>', 'Dog.__init__(self, name, age)'], hl: { 1: 'cur' } }
          ]));
          var dict1 = { name: q(d.name) };
          frames.push(fr('<code>self.name = name</code> writes the key <code>name</code> into <b>this object\'s</b> own <code>__dict__</code>. A plain <code>name = name</code> would only change a local variable and be lost.', [
            cp(code, 3), graph(hl), vp({ self: 'Dog object #' + (i + 1), name: q(d.name), age: d.age }, 'name'), mp('object #' + (i + 1) + ' .__dict__', dict1, 'name')
          ]));
          var dict2 = { name: q(d.name), age: d.age };
          frames.push(fr('<code>self.age = age</code> adds a second key. The object now holds its own data, independent of every other Dog.', [
            cp(code, 4), graph(hl), mp('object #' + (i + 1) + ' .__dict__', dict2, 'age')
          ]));
          nodes.push({ id: vid, label: d.v, x: 12, y: y });
          edges.push([vid, oid]);
          made.push(d);
          var hl2 = {}; hl2[vid] = 'ok'; hl2[oid] = 'ok';
          var eh2 = {}; eh2[vid + '-' + oid] = 'ok';
          frames.push(fr('<code>__init__</code> finishes (it returns <code>None</code>), and <code>Dog(...)</code> hands back the finished object. The name <code>' + d.v + '</code> is now <b>bound</b> to it — a variable is just a name tag pointing at an object.', [
            cp(code, line, 'ok'), graph(hl2, eh2), mp(d.v + '.__dict__', dict2)
          ]));
        });
        var d0 = dogs[0];
        var hl3 = { V0: 'cur', O0: 'cur', C: 'sel' };
        frames.push(fr('<code>' + d0.v + '.bark()</code>: Python does not find <code>bark</code> in the object\'s dict, so it looks in the <b>class</b>, finds the function, and calls <code>Dog.bark(' + d0.v + ')</code> — so <code>self</code> is <code>' + d0.v + '</code>.', [
          cp(code, 6), graph(hl3, { 'O0-C': 'cur' }), vp({ self: d0.v }, 'self', 'cur')
        ]));
        frames.push(fr('<code>self.name</code> reads <code>' + q(d0.name) + '</code> from <b>this</b> object, so the output is <b>' + esc(d0.name) + ' says Woof!</b>. Same method, different objects → different results.', [
          cp(code, 7, 'ok'), tx('<b>Output:</b> <span class="c-g">' + esc(d0.name) + ' says Woof!</span>'), graph({ O0: 'ok' })
        ]));
        return frames;
      }
    },
    examples: [
      { title: 'Two objects, two separate notebooks', html: `<p>Changing one object never touches another. Each instance has its own <code>__dict__</code>, so <code>a.count += 1</code> only bumps <code>a</code>.</p>`, code: { lang: 'python', run: true, code: `class Counter:
    def __init__(self):
        self.count = 0

    def tick(self):
        self.count += 1

a = Counter()
b = Counter()
a.tick(); a.tick(); b.tick()
print(a.count, b.count)     # 2 1
print(vars(a), vars(b))     # {'count': 2} {'count': 1}` } },
      { title: 'Forgetting self — the classic beginner error', html: `<p>If you write <code>def greet():</code> inside a class, calling <code>p.greet()</code> still passes the object in, so Python complains "takes 0 positional arguments but 1 was given". The fix is always: add <code>self</code> as the first parameter.</p>`, code: { lang: 'python', run: true, code: `class Person:
    def __init__(self, name):
        self.name = name

    def greet():                     # BUG: no self
        return 'hi'

p = Person('Asha')
try:
    p.greet()
except TypeError as e:
    print('TypeError:', e)

# Another classic: assigning to a local instead of self
class Broken:
    def __init__(self, x):
        x = x                        # does nothing useful!

try:
    print(Broken(5).x)
except AttributeError as e:
    print('AttributeError:', e)` } },
      { title: 'A class models a real thing: a bank account', html: `<p>State (<code>owner</code>, <code>balance</code>) lives on <code>self</code>; rules (no overdraft, no negative deposits) live in methods. This is <b>encapsulation</b>: callers use the methods instead of poking the balance directly.</p>`, code: { lang: 'python', run: true, code: `class BankAccount:
    def __init__(self, owner, balance=0):
        if balance < 0:
            raise ValueError('opening balance cannot be negative')
        self.owner = owner
        self._balance = balance      # leading _ = internal by convention

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError('deposit must be positive')
        self._balance += amount
        return self._balance

    def withdraw(self, amount):
        if amount > self._balance:
            raise ValueError('insufficient funds')
        self._balance -= amount
        return self._balance

    def balance(self):
        return self._balance

acct = BankAccount('Asha', 100)
acct.deposit(50)
acct.withdraw(30)
print(acct.owner, acct.balance())    # Asha 120
try:
    acct.withdraw(1000)
except ValueError as e:
    print('Refused:', e)` } },
      { title: 'Printing objects nicely with __str__ (preview)', html: `<p>By default <code>print(rex)</code> shows something like <code>&lt;__main__.Dog object at 0x7f…&gt;</code>. Defining <code>__str__</code> (for humans) and <code>__repr__</code> (for developers) fixes that. Full dunder-method coverage comes in Module 8.</p>`, code: { lang: 'python', run: true, code: `class Dog:
    def __init__(self, name):
        self.name = name

    def __repr__(self):
        return f'Dog({self.name!r})'

    def __str__(self):
        return f'a dog called {self.name}'

d = Dog('Rex')
print(d)          # a dog called Rex   (uses __str__)
print([d])        # [Dog('Rex')]       (containers use __repr__)` } }
    ],
    deepDive: `<p>🟣 <b>Classes are objects too.</b> <code>class Dog:</code> is an executable statement: Python runs the body once, collects the names defined in it into a namespace, and calls the metaclass <code>type('Dog', (object,), namespace)</code> to build a <b>class object</b>. That is why <code>type(Dog)</code> is <code>type</code> and why you can pass classes around like any value (factories, registries).</p>
<p><b><code>__new__</code> vs <code>__init__</code>.</b> <code>Dog('Rex')</code> calls <code>type.__call__</code>, which runs <code>Dog.__new__(Dog, 'Rex')</code> (allocate) and then, if the result is an instance of Dog, <code>obj.__init__('Rex')</code> (initialise). You override <code>__new__</code> only for immutable types (subclassing <code>int</code>/<code>str</code>/<code>tuple</code>), singletons or caching — interviewers like this distinction.</p>
<p><b>Methods are plain functions stored on the class.</b> <code>Dog.__dict__['bark']</code> is an ordinary function. Accessing <code>rex.bark</code> triggers the function's descriptor <code>__get__</code>, which creates a <b>bound method</b> object remembering <code>__self__ = rex</code> and <code>__func__ = bark</code>. That is the entire secret of <code>self</code>.</p>
<p><b>Memory reality.</b> Every instance carries a <code>__dict__</code>. Since CPython 3.11/3.12, instances of the same class share key layout ("split/inlined dicts"), which makes many small objects cheaper; <code>__slots__</code> (Module 8) removes the dict entirely for millions of objects.</p>
<p><b>Privacy is a convention.</b> <code>_x</code> = internal; <code>__x</code> (two leading underscores, no trailing) triggers <b>name mangling</b> to <code>_ClassName__x</code> to avoid accidental clashes in subclasses — it is not security. Pythonic code exposes plain attributes and switches to <code>@property</code> later if validation is needed, instead of Java-style <code>get_x()/set_x()</code> boilerplate.</p>
<p><b>Edge cases:</b> attributes can be added to an instance anywhere (<code>rex.color = 'brown'</code>), which is flexible but makes typos silently create new attributes — linters and type checkers (mypy/pyright) catch this when attributes are declared in <code>__init__</code>.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants generate a working class in seconds, often with type hints and docstrings. The skill shifts from typing boilerplate to <b>deciding what deserves to be a class</b> and reviewing what was generated.</p>
<p><b>Use AI as a partner:</b> prompts like <code>Model a library loan system: list the classes, their attributes and methods as a table before writing code</code>, or <code>Turn this dict-based code into a class and explain each attribute you put on self</code>.</p>
<p><b>Where AI goes wrong:</b> Java-style getters/setters for every field, classes that only hold one method (should be a function), mutable default arguments in <code>__init__</code> (<code>def __init__(self, items=[])</code>), forgetting to validate inputs, or putting state in class attributes by mistake (next topic).</p>
<p><b>What you must still own:</b> explaining <code>self</code> and the <code>__new__</code>/<code>__init__</code> split out loud in an interview, spotting shared-state bugs, and choosing between a plain class, a <code>@dataclass</code> and a dict for simple records.</p>`,
    problems: [{
      title: 'Design a Rectangle Class', level: 'Easy', tags: ['class', '__init__', 'methods'], companies: ['Infosys', 'TCS', 'Accenture'],
      statement: `<p>Write a class <code>Rectangle</code> created as <code>Rectangle(width, height)</code>. It must provide methods <code>area()</code>, <code>perimeter()</code>, <code>is_square()</code> and <code>scale(factor)</code> (which multiplies both sides in place and returns <code>self</code> so calls can chain). Reject non-positive sizes with <code>ValueError</code>.</p>`,
      constraints: `0 &lt; width, height ≤ 10<sup>6</sup>; factor &gt; 0`,
      example: `<p><code>r = Rectangle(3, 4)</code> → <code>r.area()</code> = ${H.c('g', '12')}, <code>r.perimeter()</code> = ${H.c('g', '14')}, <code>r.is_square()</code> = ${H.c('r', 'False')}. <code>r.scale(2).area()</code> = ${H.c('g', '48')} because sides become 6 and 8 and the method returned the same object.</p>`,
      brute: { why: `<p>The "no class" version keeps width and height in separate variables and passes them to every function. It works, but every caller must remember the pair, nothing stops a negative width, and there is no single place for the rules — exactly the mess classes fix.</p>`, code: `def area(w, h):
    return w * h

def perimeter(w, h):
    return 2 * (w + h)

w, h = 3, 4
print(area(w, h), perimeter(w, h))` },
      mcq: { q: 'Where should width and height be stored so each rectangle keeps its own size?', options: ['On <code>self</code> inside <code>__init__</code>', 'As class attributes', 'As global variables', 'As default arguments'], answer: 0, explain: 'Per-object data lives on the instance: <code>self.width = width</code>. Class attributes would be shared by every rectangle.' },
      hints: [`<p>Everything a rectangle "knows" (its width and height) goes on <code>self</code> in <code>__init__</code>; everything it "does" becomes a method.</p>`, `<p>Validate in <code>__init__</code> before assigning: <code>if width &lt;= 0 or height &lt;= 0: raise ValueError(...)</code>.</p>`, `<p>For chaining, <code>scale</code> updates <code>self.width</code> and <code>self.height</code> and ends with <code>return self</code>. <code>is_square</code> just compares the two sides.</p>`],
      tests: {
        sig: 'string -> string',
        fn: 't_run',
        cases: [
          [
            [
              'r = Rectangle(3, 4)\n' +
                'result = [r.area(), r.perimeter(), r.is_square()]'
            ],
            [12, 14, false]
          ],
          [['r = Rectangle(3, 4)\nresult = r.scale(2).area()'], 48],
          [['r = Rectangle(3, 4)\nresult = r.scale(2) is r'], true],
          [['result = Rectangle(5, 5).is_square()'], true],
          [['result = Rectangle(-1, 2)'], '!ValueError'],
          [['result = Rectangle(0, 5)'], '!ValueError'],
          [['result = Rectangle(5, 0)'], '!ValueError'],
          [['result = Rectangle(2, -3)'], '!ValueError'],
          [['result = Rectangle(3, 4).scale(0)'], '!ValueError'],
          [['result = Rectangle(3, 4).scale(-2)'], '!ValueError'],
          [['result = Rectangle(10**6, 10**6).area()'], 1000000000000],
          [['result = Rectangle(1.5, 2).area()'], 3],
          [['result = Rectangle(4, 6).scale(0.5).perimeter()'], 10],
          [['result = Rectangle(1, 1).scale(2).scale(3).area()'], 36],
          [['r = Rectangle(2, 3)\nr.scale(2)\nresult = [r.width, r.height]'], [4, 6]],
          [['result = Rectangle(1, 2).is_square()'], false],
          [['result = Rectangle(7, 7).perimeter()'], 28]
        ],
        harness: {
          python: 'def t_run(src):\n' +
            '    ns = dict(globals())\n' +
            '    try:\n' +
            '        exec(src, ns)\n' +
            '        return ns[\'result\']\n' +
            '    except Exception as e:\n' +
            '        return \'!\' + type(e).__name__'
        }
      },
      solution: {
        approach: `<p>Store validated sides on <code>self</code>. Each method reads them through <code>self</code>. Returning <code>self</code> from a mutating method enables fluent chaining (<code>r.scale(2).area()</code>).</p>`,
        code: { lang: 'python', run: true, code: `class Rectangle:
    def __init__(self, width, height):
        if width <= 0 or height <= 0:
            raise ValueError('sides must be positive')
        self.width = width
        self.height = height

    def area(self):
        return self.width * self.height

    def perimeter(self):
        return 2 * (self.width + self.height)

    def is_square(self):
        return self.width == self.height

    def scale(self, factor):
        if factor <= 0:
            raise ValueError('factor must be positive')
        self.width *= factor
        self.height *= factor
        return self                      # allows r.scale(2).area()

r = Rectangle(3, 4)
print(r.area(), r.perimeter(), r.is_square())   # 12 14 False
print(r.scale(2).area())                        # 48
print(Rectangle(5, 5).is_square())              # True
try:
    Rectangle(-1, 2)
except ValueError as e:
    print('ValueError:', e)` },
        dry: { head: ['call', 'self.width', 'self.height', 'returns'], rows: [['Rectangle(3, 4)', '3', '4', 'new object'], ['r.area()', '3', '4', '12'], ['r.perimeter()', '3', '4', '14'], ['r.scale(2)', '6', '8', 'r (same object)'], ['.area()', '6', '8', '<span class="c-g">48</span>']] },
        complexity: `<p>Every method is O(1) time and the object uses O(1) space (two numbers plus the instance dict).</p>`,
        followUps: ['Add a <code>Square</code> subclass that takes one side (see inheritance topic).', 'Make <code>__eq__</code> so two rectangles with the same sides compare equal.', 'Should <code>scale</code> mutate or return a new Rectangle? Discuss immutability.']
      }
    }]
  });

  /* ================= TOPIC 2: instance vs class attributes ================= */
  topics.push({
    title: 'Instance vs Class Attributes and the Attribute Lookup Chain',
    analogy: `<p>Think of an <b>office</b>. Each employee has a <b>personal desk drawer</b> (instance attributes: their own name, their own stapler). The office also has a <b>shared notice board</b> (class attributes: office address, Wi-Fi password). When you need something, you check <b>your drawer first</b>; if it is not there, you look at the <b>notice board</b>. If you pin your own note in your drawer with the same title, you stop seeing the board's version — but everyone else still sees the board.</p>`,
    explain: `<p>🟢 <b>Two places data can live.</b></p>
${H.table(['', 'Instance attribute', 'Class attribute'], [
  ['Where is it written?', '<code>self.name = ...</code> (usually in <code>__init__</code>)', 'directly in the class body: <code>species = \'dog\'</code>'],
  ['Who owns it?', 'one object (stored in <code>obj.__dict__</code>)', 'the class (stored in <code>Dog.__dict__</code>), <b>shared</b> by all objects'],
  ['Typical use', 'per-object state: name, balance, position', 'constants, defaults, counters, registries'],
  ['Change it with', '<code>obj.attr = v</code>', '<code>Dog.attr = v</code> (or <code>type(self).attr = v</code>)']
])}
<pre>class Dog:
    species = 'canis familiaris'   # class attribute (shared)

    def __init__(self, name):
        self.name = name           # instance attribute (own)</pre>
<p><b>The lookup rule for <code>obj.attr</code> (reading):</b></p>
<ol><li>Look in the object's own <code>__dict__</code>.</li><li>Not there? Look in its class <code>type(obj).__dict__</code>.</li><li>Not there? Walk up the parent classes (inheritance) all the way to <code>object</code>.</li><li>Still not found → <code>AttributeError</code>.</li></ol>
<p><b>The writing rule is different and surprises everyone:</b> <code>obj.attr = value</code> <b>always writes into the object's own <code>__dict__</code></b>. It never changes the class. So <code>bella.species = 'wolf'</code> creates a new instance attribute that <b>shadows</b> (hides) the class one — only for bella.</p>
${H.kv([['rex.__dict__', "{'name': 'Rex'}"], ['bella.__dict__', "{'name': 'Bella', 'species': 'wolf'}"], ['Dog.__dict__', "{'species': 'canis familiaris', ...}"]], { label: 'After bella.species = \'wolf\'', hl: { 'bella.__dict__': 'y' } })}
<p><b>Two famous traps:</b></p>
<ul><li><b>Counter trap:</b> <code>self.count += 1</code> means <code>self.count = self.count + 1</code>: it <i>reads</i> the class value, then <i>writes</i> a new instance attribute. The class counter never moves. Use <code>Dog.count += 1</code> or <code>type(self).count += 1</code>.</li>
<li><b>Shared mutable trap:</b> a class attribute <code>tricks = []</code> is <b>one list for every dog</b>. <code>rex.tricks.append('roll')</code> does not assign anything — it finds the shared list and mutates it, so bella "learns" the trick too. Create mutable per-object data in <code>__init__</code>: <code>self.tricks = []</code>.</li></ul>`,
    clues: [
      '"shared by all instances" / "count how many objects were created" / "global config for every object" → class attribute (update it via the class name)',
      '"each object has its own…" → instance attribute in <code>__init__</code>',
      '"why does changing one object change the other?" → mutable class attribute (shared list/dict)',
      '"predict the output" with <code>obj.x = …</code> after <code>Class.x = …</code> → shadowing: instance dict wins on reads',
      '"<code>self.count += 1</code> but the class counter stays 0" → the read-then-write-to-instance trap',
      '"default value that a few objects override" → class attribute as a default, instance attribute as the override'
    ],
    code: [{ lang: 'python', run: true, title: 'Shadowing, counters and the shared-list trap (runnable)', code: `class Dog:
    species = 'canis familiaris'    # class attribute: shared default
    count = 0                       # class attribute: counter
    tricks = []                     # TRAP: one list shared by all dogs

    def __init__(self, name):
        self.name = name            # instance attribute
        Dog.count += 1              # update the CLASS, not self

rex, bella = Dog('Rex'), Dog('Bella')
print(rex.species, bella.species)          # both read the class value

bella.species = 'wolf'                     # writes into bella.__dict__ only
print(rex.species, bella.species)          # canis familiaris wolf
print(vars(bella))                         # {'name': 'Bella', 'species': 'wolf'}

Dog.species = 'dog'                        # change the class value
print(rex.species, bella.species)          # dog wolf  (bella is shadowed)

del bella.species                          # remove the shadow
print(bella.species)                       # dog

print('created:', Dog.count)               # created: 2

rex.tricks.append('roll')                  # mutates the SHARED list
print(bella.tricks)                        # ['roll']  <- surprise!
print(rex.tricks is bella.tricks is Dog.tricks)   # True` }],
    codeTitle: ['Class vs instance attributes'],
    viz: {
      title: 'Attribute lookup: instance dict → class dict → object',
      input: "rex.species; rex.name; bella.species = 'wolf'; bella.species; rex.species; Dog.species = 'dog'; rex.species; rex.tricks.append('roll'); bella.tricks; rex.color",
      inputLabel: 'Statements separated by ; (objects: rex, bella, Dog). Forms: x.a · x.a = v · x.a += v · del x.a · x.a.append(v)',
      gen: function (input) {
        var stmts = String(input).split(';').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
        if (!stmts.length) throw new Error("Enter statements like: rex.species; bella.species = 'wolf'");
        if (stmts.length > 12) throw new Error('Use at most 12 statements');
        var lists = [];
        var D = { rex: { name: "'Rex'" }, bella: { name: "'Bella'" }, Dog: { species: "'canis familiaris'", tricks: { ref: 0 } } };
        lists.push([]);
        function show(v) {
          if (v && typeof v === 'object' && v.ref !== undefined) return '[' + lists[v.ref].join(', ') + ']  (list #' + (v.ref + 1) + ')';
          return String(v);
        }
        function parseLit(t) {
          t = String(t).trim();
          if (/^-?\d+$/.test(t)) return parseInt(t, 10);
          if (/^'[^']*'$/.test(t) || /^"[^"]*"$/.test(t)) return "'" + t.slice(1, -1) + "'";
          if (/^\[.*\]$/.test(t)) {
            var inner = t.slice(1, -1).trim();
            var items = inner ? inner.split(',').map(function (x) { return String(parseLit(x)); }) : [];
            lists.push(items);
            return { ref: lists.length - 1 };
          }
          throw new Error('Values must be numbers, quoted strings or simple lists, e.g. 5, \'wolf\', [\'sit\']');
        }
        function dictPart(name, hlKey, cls) {
          var o = {};
          Object.keys(D[name]).forEach(function (k) { o[k] = show(D[name][k]); });
          return mp(name === 'Dog' ? 'Dog.__dict__ (class, shared)' : name + '.__dict__ (instance, own)', o, hlKey, cls);
        }
        var nodes = [
          { id: 'rex', label: 'rex (instance)', x: 15, y: 12, shape: 'box' },
          { id: 'bella', label: 'bella (instance)', x: 15, y: 46, shape: 'box' },
          { id: 'Dog', label: 'Dog (class)', x: 52, y: 29, shape: 'box' },
          { id: 'object', label: 'object (root)', x: 86, y: 29, shape: 'box' }
        ];
        var edges = [['rex', 'Dog', '__class__'], ['bella', 'Dog', '__class__'], ['Dog', 'object', 'base']];
        function g(hl, ehl, tags) { return { type: 'graph', label: 'Where Python looks', directed: true, height: 58, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
        function dicts(hlObj, key, cls) {
          return ['rex', 'bella', 'Dog'].map(function (n) { return dictPart(n, n === hlObj ? key : null, cls); });
        }
        var frames = [];
        frames.push(fr('Setup: <code>class Dog</code> has class attributes <code>species</code> and <code>tricks = []</code> (one shared list). <code>rex</code> and <code>bella</code> each store only their own <code>name</code>.', [g({ Dog: 'sel' })].concat(dicts())));
        var log = [];
        function lookup(obj, attr, stmt) {
          var chain = obj === 'Dog' ? ['Dog', 'object'] : [obj, 'Dog', 'object'];
          for (var i = 0; i < chain.length; i++) {
            var where = chain[i];
            var hl = {}; hl[where] = 'cur';
            var eh = {};
            if (i > 0) eh[chain[i - 1] + '-' + where] = 'cur';
            if (where === 'object') {
              frames.push(fr('<code>' + esc(stmt) + '</code>: not in any dict so far. Last stop is <code>object</code>, the root of every class — it has no <code>' + esc(attr) + '</code> either.', [g({ object: 'bad' }, eh)].concat(dicts())));
              return null;
            }
            var has = Object.prototype.hasOwnProperty.call(D[where], attr);
            if (has) {
              hl[where] = 'ok';
              frames.push(fr('<code>' + esc(stmt) + '</code>: look in <b>' + where + '.__dict__</b> → <span class="c-g">found</span> <code>' + esc(attr) + ' = ' + esc(show(D[where][attr])) + '</code>.' + (where === 'Dog' && obj !== 'Dog' ? ' The object had no own copy, so the <b>class value</b> is used.' : (obj !== 'Dog' ? ' The object\'s own value wins (nothing further is checked).' : '')), [g(hl, eh)].concat(dicts(where, attr, 'ok'))));
              return { where: where, v: D[where][attr] };
            }
            frames.push(fr('<code>' + esc(stmt) + '</code>: look in <b>' + where + '.__dict__</b> → no key <code>' + esc(attr) + '</code>. Move one step up the chain.', [g(hl, eh)].concat(dicts())));
          }
          return null;
        }
        stmts.forEach(function (s) {
          var m;
          if ((m = s.match(/^(rex|bella|Dog)\.(\w+)\.append\((.+)\)$/))) {
            var r = lookup(m[1], m[2], s);
            if (!r) { log.push([s, 'AttributeError']); frames.push(fr('<span class="c-r">AttributeError</span> — there is nothing to append to.', [g()].concat(dicts()))); return; }
            if (!(r.v && r.v.ref !== undefined)) { log.push([s, 'AttributeError: no append']); frames.push(fr('<span class="c-r">AttributeError</span>: that value is not a list, it has no <code>.append</code>.', [g()].concat(dicts()))); return; }
            lists[r.v.ref].push(String(parseLit(m[3])));
            log.push([s, 'mutated list #' + (r.v.ref + 1)]);
            frames.push(fr('<code>.append</code> <b>mutates</b> the list it found in <b>' + r.where + '.__dict__</b>. No assignment happened, so nothing was written to <code>' + m[1] + '.__dict__</code>.' + (r.where === 'Dog' ? ' <span class="c-r">Every Dog shares this list — they all see the change!</span>' : ''), [g((function () { var h = {}; h[r.where] = 'bad'; return h; })())].concat(dicts(r.where, m[2], 'bad'))));
            return;
          }
          if ((m = s.match(/^(rex|bella|Dog)\.(\w+)\s*\+=\s*(.+)$/))) {
            var r2 = lookup(m[1], m[2], s);
            if (!r2) { log.push([s, 'AttributeError']); frames.push(fr('<span class="c-r">AttributeError</span>: <code>+=</code> must read the old value first, and there is none.', [g()].concat(dicts()))); return; }
            var add = parseLit(m[3]);
            if (r2.v && r2.v.ref !== undefined) {
              if (!(add && add.ref !== undefined)) throw new Error('For a list, use += with a list, e.g. rex.tricks += [\'sit\']');
              lists[r2.v.ref] = lists[r2.v.ref].concat(lists[add.ref]);
              D[m[1]][m[2]] = { ref: r2.v.ref };
              log.push([s, 'list #' + (r2.v.ref + 1) + ' extended + rebound on ' + m[1]]);
              frames.push(fr('For lists, <code>+=</code> extends the <b>same list in place</b> and <i>then</i> assigns it to <code>' + m[1] + '.__dict__</code>. Both things happen — the shared list changed for everyone.', [g()].concat(dicts(m[1], m[2], 'bad'))));
            } else {
              if (typeof r2.v !== 'number' || typeof add !== 'number') throw new Error('+= in this simulator works on numbers or lists');
              D[m[1]][m[2]] = r2.v + add;
              log.push([s, m[1] + '.' + m[2] + ' = ' + (r2.v + add)]);
              frames.push(fr('<code>' + esc(s) + '</code> means <code>' + m[1] + '.' + m[2] + ' = ' + m[1] + '.' + m[2] + ' + ' + add + '</code>: it <b>read</b> ' + r2.v + ' from <b>' + r2.where + '</b> but <b>writes</b> ' + (r2.v + add) + ' into <b>' + m[1] + '.__dict__</b>.' + (r2.where !== m[1] ? ' <span class="c-r">The class value did not change — classic counter trap.</span>' : ''), [g()].concat(dicts(m[1], m[2], 'ok'))));
            }
            return;
          }
          if ((m = s.match(/^(rex|bella|Dog)\.(\w+)\s*=\s*(.+)$/))) {
            var v = parseLit(m[3]);
            var shadow = m[1] !== 'Dog' && !Object.prototype.hasOwnProperty.call(D[m[1]], m[2]) && Object.prototype.hasOwnProperty.call(D.Dog, m[2]);
            D[m[1]][m[2]] = v;
            log.push([s, 'wrote into ' + m[1] + '.__dict__']);
            var hh = {}; hh[m[1]] = 'ok';
            frames.push(fr('Assignment <code>' + esc(s) + '</code> <b>always writes into ' + m[1] + '.__dict__</b> — it never walks the chain.' + (shadow ? ' Now <code>' + m[1] + '.' + m[2] + '</code> <b>shadows</b> the class attribute for ' + m[1] + ' only.' : '') + (m[1] === 'Dog' ? ' Every instance <i>without its own copy</i> will now see the new value.' : ''), [g(hh)].concat(dicts(m[1], m[2], 'ok'))));
            return;
          }
          if ((m = s.match(/^del\s+(rex|bella|Dog)\.(\w+)$/))) {
            if (!Object.prototype.hasOwnProperty.call(D[m[1]], m[2])) {
              log.push([s, 'AttributeError']);
              frames.push(fr('<code>' + esc(s) + '</code>: <code>del</code> only removes from <b>' + m[1] + '.__dict__</b> itself, and the key is not there → <span class="c-r">AttributeError</span> (it will not delete the class copy for you).', [g()].concat(dicts())));
              return;
            }
            delete D[m[1]][m[2]];
            log.push([s, 'removed from ' + m[1] + '.__dict__']);
            frames.push(fr('<code>' + esc(s) + '</code> removes the key from <b>' + m[1] + '.__dict__</b>. If the class still has one, reads fall back to it again.', [g()].concat(dicts())));
            return;
          }
          if ((m = s.match(/^(rex|bella|Dog)\.(\w+)$/))) {
            var r3 = lookup(m[1], m[2], s);
            if (!r3) {
              log.push([s, 'AttributeError']);
              frames.push(fr('<span class="c-r">AttributeError: ' + (m[1] === 'Dog' ? 'type object \'Dog\'' : '\'Dog\' object') + ' has no attribute \'' + esc(m[2]) + '\'</span>.', [g()].concat(dicts())));
            } else log.push([s, show(r3.v) + '  (from ' + r3.where + ')']);
            return;
          }
          throw new Error('Could not understand "' + s + '". Use rex/bella/Dog with: x.a, x.a = v, x.a += v, del x.a, x.a.append(v)');
        });
        frames.push(fr('Summary of every statement. Reads walk <b>instance → class → object</b>; writes and <code>del</code> touch <b>only the dict you named</b>; mutating methods change the object wherever it was found.', [
          { type: 'table', label: 'Results', columns: ['statement', 'result'], rows: log, hl: {} }
        ].concat(dicts())));
        return frames;
      }
    },
    examples: [
      { title: 'Counting objects the right way', html: `<p><code>self.count += 1</code> creates an instance attribute and leaves the class counter at 0. Updating through the class (or <code>type(self)</code>, which also works correctly for subclasses) fixes it.</p>`, code: { lang: 'python', run: true, code: `class Wrong:
    count = 0
    def __init__(self):
        self.count += 1          # reads class 0, writes instance 1

class Right:
    count = 0
    def __init__(self):
        type(self).count += 1    # updates the class attribute

for _ in range(3):
    w = Wrong()
    r = Right()
print(Wrong.count, w.count)    # 0 1
print(Right.count, r.count)    # 3 3` } },
      { title: 'Fixing the shared mutable default', html: `<p>Move the list into <code>__init__</code> so each object gets a fresh one. The same bug appears with mutable default <i>arguments</i> (<code>def __init__(self, items=[])</code>) — use <code>None</code> and create the list inside.</p>`, code: { lang: 'python', run: true, code: `class Student:
    def __init__(self, name, courses=None):
        self.name = name
        self.courses = [] if courses is None else list(courses)   # own list

a = Student('Asha')
b = Student('Ben')
a.courses.append('Math')
print(a.courses, b.courses)          # ['Math'] []
print(a.courses is b.courses)        # False` } },
      { title: 'Class attribute as an overridable default', html: `<p>A class attribute is a perfect <b>default</b>: every object reads it until one object sets its own. Changing the class later updates all objects that have not overridden it.</p>`, code: { lang: 'python', run: true, code: `class Button:
    color = 'grey'               # default for every button

    def __init__(self, label):
        self.label = label

ok, cancel = Button('OK'), Button('Cancel')
ok.color = 'green'               # override for one object
print(ok.color, cancel.color)    # green grey
Button.color = 'blue'            # change the default
print(ok.color, cancel.color)    # green blue
print('color' in vars(ok), 'color' in vars(cancel))   # True False` } }
    ],
    deepDive: `<p>🟣 <b>The real lookup algorithm</b> (<code>object.__getattribute__</code>) is slightly richer than "instance then class": (1) find the attribute on the type by walking the <b>MRO</b>; (2) if that is a <b>data descriptor</b> (defines <code>__set__</code>/<code>__delete__</code>, e.g. <code>property</code>), it wins even over the instance dict; (3) else check <code>obj.__dict__</code>; (4) else use the type's attribute (calling <code>__get__</code> if it is a non-data descriptor like a function → bound method); (5) else <code>__getattr__</code> if defined; else <code>AttributeError</code>. This is why a <code>@property</code> cannot be shadowed by an instance attribute but a method can.</p>
<p><b>Class <code>__dict__</code> is a read-only <code>mappingproxy</code></b>: you must write <code>Dog.x = 1</code> or <code>setattr(Dog, 'x', 1)</code>, not <code>Dog.__dict__['x'] = 1</code>. Changing a class attribute invalidates CPython's per-type attribute cache (version tags), which is cheap but is one reason hot code avoids mutating classes at runtime.</p>
<p><b>Subclasses and counters:</b> <code>type(self).count += 1</code> inside a base class gives each subclass its own counter the first time it runs (it reads the inherited value and writes onto the subclass). Use <code>Base.count += 1</code> for one global total. Interviewers love this distinction.</p>
<p><b>Performance:</b> instance attribute reads are dictionary-like lookups optimised by inline caches (CPython 3.11+ specialising interpreter: <code>LOAD_ATTR_INSTANCE_VALUE</code>), and class-attribute reads hit the type cache — both effectively O(1). Thread safety: <code>Dog.count += 1</code> is a read-modify-write and is <b>not atomic</b> across threads; use a lock (Module 10).</p>
<p><b>Constants:</b> write class-level constants in <code>UPPER_CASE</code> and annotate with <code>typing.ClassVar</code> or <code>Final</code> so type checkers know they are not per-instance fields (matters for dataclasses too).</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> code assistants happily write <code>items = []</code> at class level when "sketching" a class, because it looks tidy. Reviewing for <b>accidental shared state</b> is now a core human skill.</p>
<p><b>Use AI as a partner:</b> <code>List every class attribute in this file and tell me whether any is mutable and shared by instances</code>, or <code>Write 5 predict-the-output puzzles about shadowing class attributes, answers hidden</code>.</p>
<p><b>Where AI goes wrong:</b> confusing "static variable" from Java with Python class attributes (assuming <code>self.x = ...</code> updates the static), using <code>self.counter += 1</code> for global counts, and claiming that <code>del obj.attr</code> will delete a class attribute.</p>
<p><b>What you must still own:</b> drawing the <b>instance → class → base</b> chain from memory, predicting outputs in a live round, and spotting a shared mutable in a code review before it becomes a production bug (e.g. per-request data leaking between users in a web server).</p>`,
    problems: [{
      title: 'Ticket Machine: Count Objects and Give Unique Numbers', level: 'Easy', tags: ['class attribute', 'counter'], companies: ['Amazon', 'Wipro'],
      statement: `<p>Create a class <code>Ticket</code>. Every new ticket gets a unique, increasing <code>number</code> starting at 1, and the class keeps a total <code>Ticket.issued</code>. Also add a class attribute <code>PREFIX = 'TKT'</code> and a method <code>code()</code> returning e.g. <code>'TKT-0003'</code>. Changing <code>Ticket.PREFIX</code> must affect all existing tickets that have not overridden it.</p>`,
      constraints: `Up to 10<sup>6</sup> tickets; numbers never reused.`,
      example: `<p><code>a, b, c = Ticket(), Ticket(), Ticket()</code> → <code>c.code()</code> = ${H.c('g', "'TKT-0003'")}, <code>Ticket.issued</code> = ${H.c('g', '3')}. After <code>Ticket.PREFIX = 'VIP'</code>, <code>a.code()</code> = ${H.c('b', "'VIP-0001'")} because <code>a</code> has no own PREFIX, so the class value is read.</p>`,
      brute: { why: `<p>A global variable counter works but lives outside the class (anyone can reset it), and using <code>self.issued += 1</code> silently creates per-object counters stuck at 1 — the bug this problem is really testing.</p>`, code: `issued = 0

class Ticket:
    def __init__(self):
        global issued
        issued += 1
        self.number = issued

t1, t2 = Ticket(), Ticket()
print(t2.number, issued)` },
      mcq: { q: 'Which line correctly bumps the shared total inside <code>__init__</code>?', options: ['<code>Ticket.issued += 1</code>', '<code>self.issued += 1</code>', '<code>issued += 1</code>', '<code>self.__class__.issued = 1</code>'], answer: 0, explain: '<code>self.issued += 1</code> writes a new instance attribute; a bare <code>issued</code> is an undefined local. Writing through the class updates the shared value.' },
      hints: [`<p>The running total belongs to the <b>class</b> (shared). Each ticket's own number belongs to <b>self</b>.</p>`, `<p>In <code>__init__</code>: increment <code>Ticket.issued</code> first, then copy it to <code>self.number</code>.</p>`, `<p>For the code, read <code>self.PREFIX</code> (lookup falls back to the class) and format with <code>f'{self.PREFIX}-{self.number:04d}'</code>.</p>`],
      tests: {
        sig: 'string -> string',
        fn: 't_run',
        cases: [
          [
            [
              'Ticket.issued = 0\n' +
                'Ticket.PREFIX = \'TKT\'\n' +
                'a, b, c = Ticket(), Ticket(), Ticket()\n' +
                'result = [c.code(), Ticket.issued]'
            ],
            ['TKT-0003', 3]
          ],
          [
            [
              'Ticket.issued = 0\n' +
                'Ticket.PREFIX = \'TKT\'\n' +
                'a, b, c = Ticket(), Ticket(), Ticket()\n' +
                'Ticket.PREFIX = \'VIP\'\n' +
                'result = a.code()'
            ],
            'VIP-0001'
          ],
          [
            [
              'Ticket.issued = 0\n' +
                'Ticket.PREFIX = \'TKT\'\n' +
                'a, b, c = Ticket(), Ticket(), Ticket()\n' +
                'b.PREFIX = \'STAFF\'\n' +
                'result = [b.code(), c.code()]'
            ],
            ['STAFF-0002', 'TKT-0003']
          ],
          [
            [
              'Ticket.issued = 0\n' +
                'Ticket.PREFIX = \'TKT\'\n' +
                'a, b, c = Ticket(), Ticket(), Ticket()\n' +
                'Ticket.PREFIX = \'VIP\'\n' +
                'b.PREFIX = \'STAFF\'\n' +
                'result = [a.code(), b.code(), c.code()]'
            ],
            ['VIP-0001', 'STAFF-0002', 'VIP-0003']
          ],
          [
            [
              'Ticket.issued = 0\n' +
                'Ticket.PREFIX = \'TKT\'\n' +
                'result = Ticket.issued'
            ],
            0
          ],
          [
            [
              'Ticket.issued = 0\n' +
                'Ticket.PREFIX = \'TKT\'\n' +
                't = Ticket()\n' +
                'result = [t.number, t.code()]'
            ],
            [1, 'TKT-0001']
          ],
          [
            [
              'Ticket.issued = 0\n' +
                'Ticket.PREFIX = \'TKT\'\n' +
                'ts = [Ticket() for _ in range(5)]\n' +
                'result = [t.number for t in ts]'
            ],
            [1, 2, 3, 4, 5]
          ],
          [
            [
              'Ticket.issued = 0\n' +
                'Ticket.PREFIX = \'TKT\'\n' +
                'for i in range(1000000):\n' +
                '    t = Ticket()\n' +
                'result = [t.number, Ticket.issued, t.code()]'
            ],
            [1000000, 1000000, 'TKT-1000000']
          ],
          [
            [
              'Ticket.issued = 0\n' +
                'Ticket.PREFIX = \'TKT\'\n' +
                'a = Ticket()\n' +
                'b = Ticket()\n' +
                'result = [a.number, b.number, \'number\' in vars(a), \'issued\' in vars(a)]'
            ],
            [1, 2, true, false]
          ],
          [
            [
              'Ticket.issued = 0\n' +
                'Ticket.PREFIX = \'TKT\'\n' +
                'Ticket()\n' +
                'Ticket()\n' +
                'Ticket.issued = 0\n' +
                'result = \'unused\''
            ],
            'unused'
          ],
          [
            [
              'Ticket.issued = 0\n' +
                'Ticket.PREFIX = \'TKT\'\n' +
                '[Ticket() for _ in range(9999)]\n' +
                'result = [Ticket().code(), Ticket().code()]'
            ],
            ['TKT-10000', 'TKT-10001']
          ]
        ],
        harness: {
          python: 'def t_run(src):\n' +
            '    ns = dict(globals())\n' +
            '    try:\n' +
            '        exec(src, ns)\n' +
            '        return ns[\'result\']\n' +
            '    except Exception as e:\n' +
            '        return \'!\' + type(e).__name__'
        }
      },
      solution: {
        approach: `<p>Class attribute <code>issued</code> is the shared counter; it is updated through the class name. Each object snapshots the current value into its own <code>self.number</code>. <code>PREFIX</code> stays a class attribute read through <code>self</code>, so it acts as a shared, overridable default.</p>`,
        code: { lang: 'python', run: true, code: `class Ticket:
    PREFIX = 'TKT'        # shared default
    issued = 0            # shared counter

    def __init__(self):
        Ticket.issued += 1            # update the class, not the instance
        self.number = Ticket.issued   # snapshot for this ticket

    def code(self):
        return f'{self.PREFIX}-{self.number:04d}'

a, b, c = Ticket(), Ticket(), Ticket()
print(c.code(), Ticket.issued)      # TKT-0003 3
Ticket.PREFIX = 'VIP'
print(a.code())                     # VIP-0001
b.PREFIX = 'STAFF'                  # instance override
print(b.code(), c.code())           # STAFF-0002 VIP-0003` },
        dry: { head: ['statement', 'Ticket.issued', 'self.number', 'note'], rows: [['a = Ticket()', '1', '1', 'class counter bumped'], ['b = Ticket()', '2', '2', ''], ['c = Ticket()', '3', '3', ''], ["Ticket.PREFIX = 'VIP'", '3', '—', 'all non-overridden tickets see VIP'], ["b.PREFIX = 'STAFF'", '3', '—', '<span class="c-y">b now shadows PREFIX</span>']] },
        complexity: `<p>O(1) per ticket creation and per <code>code()</code> call; O(1) shared memory for the counter.</p>`,
        followUps: ['Make it thread-safe with a <code>threading.Lock</code>.', 'What changes if a subclass <code>VipTicket</code> should have its own separate counter? (hint: <code>type(self).issued</code>)', 'Use <code>itertools.count()</code> as the class-level number source.']
      }
    }]
  });

  /* ================= TOPIC 3: methods and bound methods ================= */
  topics.push({
    title: 'Methods: Instance Methods, Bound Methods and Methods Calling Methods',
    analogy: `<p>A <b>TV remote</b> has buttons (methods). Pressing "volume up" on <b>your</b> remote changes <b>your</b> TV, not the neighbour's — the remote is already paired with one TV. A <b>bound method</b> is exactly that: a button already paired with one object. <code>self</code> is the pairing.</p>`,
    explain: `<p>🟢 <b>A method is a function that lives inside a class</b> and receives the object as its first argument. Methods are how an object <b>does</b> things with its own data.</p>
<p><b>The one rule that explains everything:</b></p>
${H.table(['You write', 'Python actually runs'], [['<code>acct.deposit(50)</code>', '<code>BankAccount.deposit(acct, 50)</code>'], ['<code>rex.bark()</code>', '<code>Dog.bark(rex)</code>'], ['<code>"hi".upper()</code>', '<code>str.upper("hi")</code>']])}
<p><b>Kinds of instance methods you will write:</b></p>
<ul>
<li><b>Queries</b> — read state, return an answer, change nothing: <code>acct.balance()</code>, <code>rect.area()</code>.</li>
<li><b>Commands</b> — change state: <code>acct.deposit(50)</code>. Usually return <code>None</code> (like <code>list.append</code>) or <code>self</code> for chaining.</li>
<li><b>Helpers</b> — internal steps, named with a leading underscore: <code>self._log(...)</code>. Methods call each other <b>through <code>self</code></b>; a bare <code>_log(...)</code> would be a <code>NameError</code>.</li>
<li><b>Methods that take another object</b> of the same class: <code>a.transfer_to(b, 30)</code> — inside, <code>self</code> is <code>a</code> and <code>other</code> is <code>b</code>.</li>
</ul>
<p><b>Bound methods are real objects.</b> <code>f = acct.deposit</code> does <i>not</i> call anything; it creates a bound method that remembers <code>acct</code>. Later <code>f(10)</code> deposits into <code>acct</code>. That is why you can pass <code>obj.method</code> as a callback, e.g. <code>button.on_click(self.save)</code> or <code>sorted(words, key=str.lower)</code>.</p>
<p><b>Common mistakes:</b> forgetting the parentheses (<code>acct.balance</code> prints <code>&lt;bound method …&gt;</code> instead of the number), forgetting <code>self.</code> when calling a sibling method, and defining a method without <code>self</code>.</p>`,
    clues: [
      '"implement the methods <code>push</code>, <code>pop</code>, <code>top</code>, <code>getMin</code>" (design questions) → each operation is an instance method sharing state through <code>self</code>',
      '"pass a method as a callback / key function" → bound method (<code>obj.method</code> without parentheses)',
      '"output shows <code>&lt;bound method …&gt;</code>" → you forgot to call the method',
      '"<code>NameError: name \'helper\' is not defined</code>" inside a class → call it as <code>self.helper()</code>',
      '"support chaining like <code>q.add(1).add(2)</code>" → command methods return <code>self</code>',
      '"each operation must be O(1)" in a design problem → keep extra bookkeeping attributes on <code>self</code> (e.g. a min-stack)'
    ],
    code: [{ lang: 'python', run: true, title: 'Methods, helpers and bound methods (runnable)', code: `class BankAccount:
    def __init__(self, owner):
        self.owner = owner
        self.balance = 0
        self.history = []

    def _log(self, kind, amount):            # helper method (internal)
        self.history.append((kind, amount))

    def deposit(self, amount):               # command
        if amount <= 0:
            raise ValueError('must be positive')
        self.balance += amount
        self._log('dep', amount)              # call a sibling via self
        return self                           # allow chaining

    def withdraw(self, amount):
        if amount > self.balance:
            raise ValueError('insufficient funds')
        self.balance -= amount
        self._log('wd', amount)
        return self

    def transfer_to(self, other, amount):     # works with another object
        self.withdraw(amount)
        other.deposit(amount)

a, b = BankAccount('Asha'), BankAccount('Ben')
a.deposit(100).withdraw(30)                  # chaining
a.transfer_to(b, 20)
print(a.balance, b.balance)                  # 50 20
print(a.history)                             # [('dep', 100), ('wd', 30), ('wd', 20)]

f = b.deposit                                # bound method object, not a call
print(f)                                     # <bound method BankAccount.deposit of ...>
f(5)
print(b.balance)                             # 25
print(f.__self__ is b, f.__func__ is BankAccount.deposit)   # True True` }],
    codeTitle: ['Instance methods in action'],
    viz: {
      title: 'What really happens on acct.deposit(...) / acct.withdraw(...)',
      input: 'deposit 100, withdraw 30, withdraw 500, deposit -5',
      inputLabel: 'Operations: deposit N or withdraw N, comma separated (max 5)',
      gen: function (input) {
        var ops = String(input).split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
        if (!ops.length) throw new Error('Enter operations like: deposit 100, withdraw 30');
        if (ops.length > 5) throw new Error('Use at most 5 operations');
        ops = ops.map(function (o) {
          var m = o.match(/^(deposit|withdraw)\s+(-?\d{1,6})$/);
          if (!m) throw new Error('Each operation must look like: deposit 100 or withdraw 30');
          return { kind: m[1], amt: parseInt(m[2], 10) };
        });
        var base = ['class BankAccount:', '    def __init__(self, owner):', '        self.owner = owner', '        self.balance = 0', '        self.history = []', '',
          '    def _log(self, kind, amount):', '        self.history.append((kind, amount))', '',
          '    def deposit(self, amount):', '        if amount <= 0:', "            raise ValueError('must be positive')", '        self.balance += amount', "        self._log('dep', amount)", '',
          '    def withdraw(self, amount):', '        if amount > self.balance:', "            raise ValueError('insufficient funds')", '        self.balance -= amount', "        self._log('wd', amount)", '',
          "acct = BankAccount('Asha')"];
        var bal = 0, hist = [], frames = [];
        function code(callLine) { return base.concat([callLine]).join('\n'); }
        function state(hk, cls) { return mp('acct.__dict__', { owner: "'Asha'", balance: bal, history: '[' + hist.join(', ') + ']' }, hk, cls); }
        frames.push(fr('<code>acct = BankAccount(\'Asha\')</code> creates the object: <code>balance = 0</code>, empty <code>history</code>. All methods live once in the class; the data lives on <code>acct</code>.', [cp(code('# (operations follow)'), 22, 'ok'), state()]));
        ops.forEach(function (op) {
          var call = 'acct.' + op.kind + '(' + op.amt + ')';
          var cd = code(call);
          var defLine = op.kind === 'deposit' ? 10 : 16;
          frames.push(fr('<code>' + call + '</code>: Python finds <code>' + op.kind + '</code> on the class and binds it to <code>acct</code>. The call becomes <code>BankAccount.' + op.kind + '(acct, ' + op.amt + ')</code> — that hidden first argument is <b>self</b>.', [
            cp(cd, 23), { type: 'table', label: 'Rewrite', columns: ['you wrote', 'Python runs'], rows: [[call, 'BankAccount.' + op.kind + '(acct, ' + op.amt + ')']], hl: { 0: 'cur' } },
            { type: 'stack', label: 'Call stack', items: ['<module>', 'BankAccount.' + op.kind + '(self=acct, amount=' + op.amt + ')'], hl: { 1: 'cur' } }
          ]));
          var bad = op.kind === 'deposit' ? op.amt <= 0 : op.amt > bal;
          var cond = op.kind === 'deposit' ? 'amount &lt;= 0 → ' + op.amt + ' &lt;= 0' : 'amount &gt; self.balance → ' + op.amt + ' &gt; ' + bal;
          frames.push(fr('Guard check: <code>' + cond + '</code> is <b>' + (bad ? 'True' : 'False') + '</b>. ' + (bad ? 'The method refuses.' : 'Safe to continue.') + ' Notice <code>self.balance</code> reads <b>this</b> account\'s data.', [
            cp(cd, defLine + 1, bad ? 'bad' : 'cur'), vp({ self: 'acct', amount: op.amt, 'self.balance': bal }, bad ? 'amount' : '', bad ? 'bad' : 'ok'), state()
          ]));
          if (bad) {
            frames.push(fr('<span class="c-r">raise ValueError(' + (op.kind === 'deposit' ? "'must be positive'" : "'insufficient funds'") + ')</span>. The method stops; <b>no state changed</b> — validating before mutating keeps the object consistent.', [
              cp(cd, defLine + 2, 'bad'), state(), { type: 'stack', label: 'Call stack (unwinding)', items: ['<module>  ← ValueError'], hl: { 0: 'bad' } }
            ]));
            return;
          }
          bal = op.kind === 'deposit' ? bal + op.amt : bal - op.amt;
          frames.push(fr('<code>self.balance ' + (op.kind === 'deposit' ? '+=' : '-=') + ' amount</code> updates the object: balance is now <b>' + bal + '</b>.', [
            cp(cd, defLine + 3, 'ok'), state('balance', 'ok')
          ]));
          hist.push("('" + (op.kind === 'deposit' ? 'dep' : 'wd') + "', " + op.amt + ')');
          frames.push(fr('The method calls a sibling: <code>self._log(...)</code>. Again <code>self</code> is passed along automatically, so the helper writes to the <b>same</b> object\'s history. The call stack is now 3 deep.', [
            cp(cd, 8, 'cur'), { type: 'stack', label: 'Call stack', items: ['<module>', 'BankAccount.' + op.kind + '(self=acct, ...)', 'BankAccount._log(self=acct, ...)'], hl: { 2: 'cur' } }, state('history', 'ok')
          ]));
        });
        frames.push(fr('Done. Final balance <b>' + bal + '</b>. Every call went through the same class functions; only the object passed as <code>self</code> decides whose data changes.', [state('balance', 'sel'), tx('History: <code>' + esc('[' + hist.join(', ') + ']') + '</code>')]));
        return frames;
      }
    },
    examples: [
      { title: 'Calling the method through the class', html: `<p><code>obj.method(x)</code> and <code>Class.method(obj, x)</code> are the same call. Seeing this once removes all mystery around <code>self</code>.</p>`, code: { lang: 'python', run: true, code: `class Greeter:
    def __init__(self, greeting):
        self.greeting = greeting

    def greet(self, name):
        return f'{self.greeting}, {name}!'

g = Greeter('Hello')
print(g.greet('Asha'))                 # Hello, Asha!
print(Greeter.greet(g, 'Asha'))        # Hello, Asha!  (same thing)
print('python'.upper(), str.upper('python'))   # PYTHON PYTHON` } },
      { title: 'Bound methods as callbacks and keys', html: `<p>A bound method remembers its object, so you can hand it to <code>map</code>, <code>sorted</code>, threads or GUI buttons. An <i>unbound</i> class function like <code>str.lower</code> takes the object as its argument.</p>`, code: { lang: 'python', run: true, code: `class Tally:
    def __init__(self):
        self.total = 0

    def add(self, x):
        self.total += x

t = Tally()
for f in [t.add, t.add, t.add]:
    f(10)
print(t.total)                                   # 30

list(map(t.add, [1, 2, 3]))                      # bound method as a function
print(t.total)                                   # 36

words = ['banana', 'Apple', 'cherry']
print(sorted(words, key=str.lower))              # ['Apple', 'banana', 'cherry']` } },
      { title: 'Forgetting the parentheses', html: `<p><code>acct.balance_of</code> (no parentheses) gives you the method object itself, which is always truthy — so <code>if acct.is_empty:</code> is <b>always</b> True. A very common silent bug.</p>`, code: { lang: 'python', run: true, code: `class Box:
    def __init__(self, items):
        self.items = items

    def is_empty(self):
        return len(self.items) == 0

b = Box([1, 2])
print(b.is_empty)          # <bound method Box.is_empty of ...>
print(bool(b.is_empty))    # True  <- bug if used in an if!
print(b.is_empty())        # False <- correct` } }
    ],
    deepDive: `<p>🟣 <b>How binding works: functions are descriptors.</b> Every Python function has a <code>__get__</code> method. When you access <code>acct.deposit</code>, attribute lookup finds the function in <code>BankAccount.__dict__</code> and calls <code>deposit.__get__(acct, BankAccount)</code>, which returns a <code>method</code> object with <code>__self__ = acct</code> and <code>__func__ = deposit</code>. Calling it prepends <code>__self__</code> to the arguments. That is all <code>self</code> is.</p>
<p><b>Speed:</b> creating a bound method object on every access sounds costly, so CPython optimises the common <code>obj.meth(args)</code> pattern with the <code>LOAD_ATTR</code> (method variant) + <code>CALL</code> bytecodes that skip allocating the bound method entirely. In very hot loops people still cache <code>append = result.append</code> to save the lookup — measure before doing this (Module 13).</p>
<p><b>Identity gotcha:</b> <code>acct.deposit is acct.deposit</code> is <b>False</b> (two fresh bound-method objects) while <code>acct.deposit == acct.deposit</code> is True. This matters when you register a callback and later try to unregister it with <code>is</code>.</p>
<p><b>Command-query separation:</b> methods that mutate should usually return <code>None</code> (Python's built-ins follow this: <code>list.sort()</code> returns None, <code>sorted()</code> returns a new list) so nobody confuses "changed in place" with "made a copy". Returning <code>self</code> for fluent APIs is fine but be consistent.</p>
<p><b>Memory leak edge case:</b> a bound method keeps its object alive. Storing <code>self.handler</code> in a global registry can keep objects from being garbage collected; <code>weakref.WeakMethod</code> exists exactly for this.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI writes method bodies quickly, so design-round interviews (MinStack, LRU, Twitter feed) now test <b>which state you keep on self</b> and why each method is O(1) — not typing speed.</p>
<p><b>Use AI as a partner:</b> <code>Here is my class; for each method say whether it is a query or a command and whether it keeps the object valid if it raises</code>; or <code>Generate a sequence of 20 random operations and expected results to test my MinStack</code>.</p>
<p><b>Where AI goes wrong:</b> mutating state <i>before</i> validating (object left half-updated when an exception fires), calling helpers without <code>self.</code>, returning inconsistent types (sometimes <code>self</code>, sometimes <code>None</code>), and recomputing aggregates (like a minimum) in O(n) inside a method that must be O(1).</p>
<p><b>What you must still own:</b> explaining the <code>obj.m(x) → Class.m(obj, x)</code> rewrite, choosing the invariants your object maintains, and walking an interviewer through a dry run of state after each method call.</p>`,
    problems: [{
      title: 'Min Stack (LeetCode 155)', level: 'Medium', tags: ['design', 'stack', 'methods'], companies: ['Amazon', 'Google', 'Bloomberg', 'Microsoft'],
      statement: `<p>Design a class <code>MinStack</code> supporting <code>push(val)</code>, <code>pop()</code>, <code>top()</code> and <code>get_min()</code> — <b>all in O(1) time</b>. <code>get_min()</code> returns the smallest element currently in the stack.</p>`,
      constraints: `−2<sup>31</sup> ≤ val ≤ 2<sup>31</sup>−1; pop/top/get_min are only called on a non-empty stack; up to 3·10<sup>4</sup> calls.`,
      example: `<p>push(5), push(3), push(7), get_min() → ${H.c('g', '3')}; pop() removes 7; pop() removes 3; get_min() → ${H.c('g', '5')}. The minimum must "remember" what it was <b>before</b> 3 arrived.</p>`,
      brute: { why: `<p>Keep one list and compute <code>min(self.items)</code> on every <code>get_min()</code>. Correct, but O(n) per call → with 3·10<sup>4</sup> calls that is up to ~10<sup>9</sup> comparisons in the worst case and it fails the O(1) requirement.</p>`, code: `class MinStackSlow:
    def __init__(self):
        self.items = []

    def push(self, val):
        self.items.append(val)

    def pop(self):
        self.items.pop()

    def top(self):
        return self.items[-1]

    def get_min(self):
        return min(self.items)       # O(n) every time

s = MinStackSlow()
for v in [5, 3, 7]:
    s.push(v)
print(s.get_min())` },
      mcq: { q: 'What extra state lets <code>get_min()</code> be O(1) even after pops?', options: ['A second stack storing the minimum <i>at each depth</i>', 'A single variable holding the current minimum', 'A sorted copy of the stack', 'A set of all values'], answer: 0, explain: 'One variable cannot recover the previous minimum after a pop. Storing the min-so-far alongside each element (or in a parallel stack) gives it back in O(1).' },
      hints: [`<p>The minimum only changes when you push or pop, and after a pop it must go back to <b>exactly</b> the value it had before that push.</p>`, `<p>Keep two lists on <code>self</code>: <code>items</code> and <code>mins</code>, where <code>mins[i]</code> = minimum of <code>items[0..i]</code>.</p>`, `<p>push: append val and <code>min(val, mins[-1])</code> (or val if empty). pop: pop both. top: <code>items[-1]</code>. get_min: <code>mins[-1]</code>.</p>`],
      tests: {
        sig: 'string -> string',
        fn: 't_run',
        cases: [
          [
            [
              's = MinStack()\n' +
                'for v in [5, 3, 7]:\n' +
                '    s.push(v)\n' +
                'r = [s.get_min()]\n' +
                's.pop(); s.pop()\n' +
                'r += [s.get_min(), s.top()]\n' +
                'result = r'
            ],
            [3, 5, 5]
          ],
          [
            [
              's = MinStack()\n' +
                's.push(-2); s.push(0); s.push(-3)\n' +
                'r = [s.get_min()]\n' +
                's.pop()\n' +
                'r += [s.top(), s.get_min()]\n' +
                'result = r'
            ],
            [-3, 0, -2]
          ],
          [
            [
              's = MinStack()\n' +
                'for v in [2, 2, 1, 1]:\n' +
                '    s.push(v)\n' +
                'r = []\n' +
                'for _ in range(3):\n' +
                '    r.append(s.get_min())\n' +
                '    s.pop()\n' +
                'r.append(s.get_min())\n' +
                'result = r'
            ],
            [1, 1, 2, 2]
          ],
          [
            [
              's = MinStack()\n' +
                's.push(-2**31); s.push(2**31 - 1)\n' +
                'result = [s.get_min(), s.top()]'
            ],
            [-2147483648, 2147483647]
          ],
          [
            [
              's = MinStack()\n' +
                's.push(1); s.pop(); s.push(5)\n' +
                'result = [s.get_min(), s.top()]'
            ],
            [5, 5]
          ],
          [
            [
              's = MinStack()\n' +
                'for v in range(30000):\n' +
                '    s.push(v)\n' +
                'for _ in range(29999):\n' +
                '    s.pop()\n' +
                'result = [s.get_min(), s.top()]'
            ],
            [0, 0]
          ],
          [
            [
              's = MinStack()\n' +
                'for v in range(30000, 0, -1):\n' +
                '    s.push(v)\n' +
                'for _ in range(10):\n' +
                '    s.pop()\n' +
                'result = [s.get_min(), s.top()]'
            ],
            [11, 11]
          ],
          [['s = MinStack()\ns.push(0)\nresult = [s.get_min(), s.top()]'], [0, 0]],
          [
            [
              's = MinStack()\n' +
                'for v in [3, 1, 2]:\n' +
                '    s.push(v)\n' +
                'r = []\n' +
                'for _ in range(3):\n' +
                '    r.append([s.top(), s.get_min()])\n' +
                '    s.pop()\n' +
                'result = r'
            ],
            [[2, 1], [1, 1], [3, 3]]
          ],
          [
            [
              'a, b = MinStack(), MinStack()\n' +
                'a.push(1)\n' +
                'b.push(9)\n' +
                'result = [a.get_min(), b.get_min()]'
            ],
            [1, 9]
          ],
          [
            [
              's = MinStack()\n' +
                'for v in [4, 4, 4]:\n' +
                '    s.push(v)\n' +
                's.pop()\n' +
                'result = s.get_min()'
            ],
            4
          ]
        ],
        harness: {
          python: 'def t_run(src):\n' +
            '    ns = dict(globals())\n' +
            '    try:\n' +
            '        exec(src, ns)\n' +
            '        return ns[\'result\']\n' +
            '    except Exception as e:\n' +
            '        return \'!\' + type(e).__name__'
        }
      },
      solution: {
        approach: `<p>Maintain an <b>invariant</b>: <code>self.mins[-1]</code> is always the minimum of everything in the stack. Each method touches only the ends of two lists, so every operation is O(1). This is classic "keep extra bookkeeping on self".</p>`,
        code: { lang: 'python', run: true, code: `class MinStack:
    def __init__(self):
        self.items = []          # the actual stack
        self.mins = []           # mins[i] = min(items[0..i])

    def push(self, val):
        self.items.append(val)
        current = val if not self.mins else min(val, self.mins[-1])
        self.mins.append(current)

    def pop(self):
        self.mins.pop()
        return self.items.pop()

    def top(self):
        return self.items[-1]

    def get_min(self):
        return self.mins[-1]

s = MinStack()
for v in [5, 3, 7]:
    s.push(v)
print(s.get_min())     # 3
s.pop(); s.pop()
print(s.get_min())     # 5
print(s.top())         # 5` },
        dry: { head: ['op', 'items', 'mins', 'answer'], rows: [['push 5', '[5]', '[5]', ''], ['push 3', '[5, 3]', '[5, 3]', ''], ['push 7', '[5, 3, 7]', '[5, 3, 3]', ''], ['get_min', '[5, 3, 7]', '[5, 3, 3]', '<span class="c-g">3</span>'], ['pop, pop', '[5]', '[5]', ''], ['get_min', '[5]', '[5]', '<span class="c-g">5</span>']] },
        complexity: `<p>Every method O(1) time; O(n) extra space for <code>mins</code>. Space-optimised variant: push to <code>mins</code> only when <code>val &lt;= mins[-1]</code>, pop from it only when the popped value equals <code>mins[-1]</code>.</p>`,
        followUps: ['Implement the space-optimised version (careful with duplicates: use &lt;=).', 'Store (value, current_min) tuples in a single list instead.', 'Add <code>get_max()</code> too.']
      }
    }]
  });

  /* ================= TOPIC 4: inheritance and super() ================= */
  var H4 = {
    order: { Animal: ['Animal', 'object'], Dog: ['Dog', 'Animal', 'object'], Puppy: ['Puppy', 'Dog', 'Animal', 'object'], Cat: ['Cat', 'Animal', 'object'] },
    dicts: {
      object: ['__init__', '__str__', '__repr__', '__eq__'],
      Animal: ['__init__', 'speak', 'describe', 'eat'],
      Dog: ['__init__', 'speak', 'fetch'],
      Puppy: ['speak'],
      Cat: ['speak']
    },
    nodes: [
      { id: 'object', label: 'object', x: 50, y: 7, shape: 'box' },
      { id: 'Animal', label: 'Animal', x: 50, y: 22, shape: 'box' },
      { id: 'Dog', label: 'Dog(Animal)', x: 28, y: 38, shape: 'box' },
      { id: 'Cat', label: 'Cat(Animal)', x: 74, y: 38, shape: 'box' },
      { id: 'Puppy', label: 'Puppy(Dog)', x: 28, y: 54, shape: 'box' }
    ],
    edges: [['Animal', 'object', 'base'], ['Dog', 'Animal', 'base'], ['Cat', 'Animal', 'base'], ['Puppy', 'Dog', 'base']]
  };
  var H4CODE = ['class Animal:', '    def __init__(self, name):', '        self.name = name', '    def speak(self):', "        return '...'", '    def describe(self):', "        return f'{self.name} says {self.speak()}'", '    def eat(self):', "        return f'{self.name} is eating'", '',
    'class Dog(Animal):', '    def __init__(self, name, breed):', '        super().__init__(name)', '        self.breed = breed', '    def speak(self):', "        return 'Woof'", '    def fetch(self):', "        return f'{self.name} fetches!'", '',
    'class Puppy(Dog):', '    def speak(self):', "        return super().speak() + ' (squeaky)'", '',
    'class Cat(Animal):', '    def speak(self):', "        return 'Meow'"].join('\n');

  topics.push({
    title: 'Inheritance, Overriding and super()',
    analogy: `<p>A <b>family recipe book</b>. Grandma's book (the <b>parent class</b>) has a curry recipe. Your mum copies the book (the <b>child class</b>) and changes one recipe — more chilli (<b>overriding</b>). For the dal she writes "do grandma's dal, <i>then</i> add lemon" — that "do grandma's version first" is <code>super()</code>. Any recipe mum didn't touch, she just reads from grandma's book.</p>`,
    explain: `<p>🟢 <b>Inheritance = "is-a" reuse.</b> <code>class Dog(Animal):</code> says "a Dog <b>is an</b> Animal". Dog automatically gets every method and class attribute of Animal, and can add new ones or replace (<b>override</b>) existing ones.</p>
<pre>class Animal:
    def __init__(self, name):
        self.name = name
    def speak(self):
        return '...'
    def describe(self):
        return f'{self.name} says {self.speak()}'

class Dog(Animal):                 # Dog inherits from Animal
    def __init__(self, name, breed):
        super().__init__(name)     # let Animal set up its part
        self.breed = breed         # then add Dog's own part
    def speak(self):               # override
        return 'Woof'</pre>
<p><b>Three things a child can do with a parent method:</b></p>
${H.table(['Choice', 'How', 'Effect'], [['Inherit', 'do nothing', 'parent version is used'], ['Override', 'define a method with the same name', 'child version replaces it'], ['Extend', 'override and call <code>super().method(...)</code> inside', 'parent work + extra child work']])}
<p><b>Dynamic dispatch:</b> <code>describe()</code> is written in Animal, but it calls <code>self.speak()</code>. When <code>self</code> is a Dog, lookup starts at <b>Dog</b>, so you get <code>'Rex says Woof'</code>. The parent "calls down" into the child's override — this is the heart of polymorphism.</p>
<p><b>super()</b> means "the next class after mine in the lookup order". Most common use: <code>super().__init__(...)</code> so the parent can initialise its own attributes. <b>If you override <code>__init__</code> and forget to call super, the parent's attributes never get created</b> → <code>AttributeError</code> later.</p>
<p><b>Checking types:</b> <code>isinstance(rex, Animal)</code> is True (a Dog is an Animal); <code>issubclass(Dog, Animal)</code> is True; <code>type(rex) is Animal</code> is False. Prefer <code>isinstance</code>. Every class ultimately inherits from <code>object</code>.</p>
<p><b>Lookup order</b> for <code>Puppy</code>: <code>Puppy → Dog → Animal → object</code>. See it with <code>Puppy.__mro__</code> (Method Resolution Order). With multiple parents (<code>class C(A, B)</code>), Python uses the <b>C3</b> algorithm — covered fully in Module 8.</p>
<p><b>Inheritance vs composition:</b> use inheritance only for a true "is-a" relationship. If something just <b>has</b> or <b>uses</b> another thing (a Car <i>has an</i> Engine), store it as an attribute instead (composition). "Favour composition over inheritance" is a classic interview line.</p>`,
    clues: [
      '"X is a kind of Y" / "all shapes/employees/vehicles share …, but each computes … differently" → base class + subclasses overriding a method',
      '"reuse the parent\'s setup and add more" → override <code>__init__</code> and call <code>super().__init__(...)</code> first',
      '"<code>AttributeError</code> on an attribute the parent sets" → child <code>__init__</code> forgot <code>super().__init__()</code>',
      '"predict the output" where a parent method calls <code>self.something()</code> → dynamic dispatch: lookup starts at the actual object\'s class',
      '"has-a" wording (car has an engine, order has items) → composition, not inheritance',
      '"<code>class C(A, B)</code>" or "diamond" → MRO / C3 linearization; <code>super()</code> follows the MRO, not just "the parent"'
    ],
    code: [{ lang: 'python', run: true, title: 'Inherit, override, extend (runnable)', code: `class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        return '...'

    def describe(self):
        # written once in the parent; self.speak() dispatches to the child
        return f'{self.name} says {self.speak()}'

    def eat(self):
        return f'{self.name} is eating'


class Dog(Animal):
    def __init__(self, name, breed):
        super().__init__(name)        # parent sets self.name
        self.breed = breed            # child adds self.breed

    def speak(self):                  # override
        return 'Woof'

    def fetch(self):                  # new method
        return f'{self.name} fetches!'


class Puppy(Dog):
    def speak(self):                  # extend: reuse Dog's version
        return super().speak() + ' (squeaky)'


class Cat(Animal):
    def speak(self):
        return 'Meow'


for pet in [Dog('Rex', 'Lab'), Puppy('Bit', 'Beagle'), Cat('Tom')]:
    print(pet.describe())
# Rex says Woof / Bit says Woof (squeaky) / Tom says Meow

p = Puppy('Bit', 'Beagle')
print(p.eat(), '|', p.fetch(), '|', p.breed)    # inherited from 2 levels
print([c.__name__ for c in Puppy.__mro__])     # ['Puppy', 'Dog', 'Animal', 'object']
print(isinstance(p, Animal), issubclass(Cat, Dog))   # True False` }],
    codeTitle: ['Inheritance and super()'],
    viz: [{
      title: 'Method lookup walks up the class tree (MRO)',
      input: 'Puppy describe',
      inputLabel: 'Class and method, e.g. Puppy describe · Cat fetch · Dog eat (classes: Animal, Dog, Puppy, Cat)',
      gen: function (input) {
        var p = String(input).trim().split(/\s+/);
        if (p.length !== 2 || !H4.order[p[0]] || !/^[A-Za-z_]\w*$/.test(p[1])) throw new Error('Type a class (Animal, Dog, Puppy, Cat) and a method name, e.g. Puppy describe');
        var cls = p[0], meth = p[1], mro = H4.order[cls], frames = [];
        var names = { Animal: 'Generic', Dog: 'Rex', Puppy: 'Bit', Cat: 'Tom' };
        function graph(hl, ehl, tags) { return { type: 'graph', label: 'Class tree (arrows point to the parent)', directed: true, height: 62, nodes: H4.nodes, edges: H4.edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
        function dictOf(c, hk, cl) { return { type: 'set', label: c + '.__dict__ (methods defined right here)', items: H4.dicts[c].slice(), hl: hk ? (function () { var h = {}; h[hk] = cl; return h; })() : {} }; }
        function mroPart(idx, cl) { var h = {}; if (idx >= 0) h[idx] = cl; return { type: 'array', label: cls + '.__mro__ (search order)', values: mro.slice(), hl: h, showIdx: true }; }
        function walk(name, from, why) {
          for (var i = from; i < mro.length; i++) {
            var c = mro[i], has = H4.dicts[c].indexOf(name) >= 0, hl = {}, tags = {};
            hl[c] = has ? 'ok' : 'cur';
            tags[c] = has ? 'found ' + name : 'no ' + name;
            var eh = {};
            if (i > from) eh[mro[i - 1] + '-' + c] = 'cur';
            frames.push(fr((why ? why + ' ' : '') + 'Look for <code>' + esc(name) + '</code> in <b>' + c + '</b> … ' + (has ? '<span class="c-g">found it</span> — stop searching.' : 'not defined here, move to the next class in the MRO.'), [graph(hl, eh, tags), mroPart(i, has ? 'ok' : 'cur'), dictOf(c, has ? name : null, 'ok')]));
            why = '';
            if (has) return { cls: c, idx: i };
          }
          return null;
        }
        frames.push(fr('We call <code>' + names[cls].toLowerCase() + '.' + esc(meth) + '()</code> on a <b>' + cls + '</b> object. Python searches the classes in <b>' + cls + '.__mro__</b> order: <code>' + mro.join(' → ') + '</code>. The object itself only holds data, never methods.', [graph((function () { var h = {}; h[cls] = 'sel'; return h; })()), mroPart(-1), cp(H4CODE, 0)]));
        var r = walk(meth, 0, '');
        if (!r) {
          frames.push(fr('<span class="c-r">AttributeError: \'' + cls + '\' object has no attribute \'' + esc(meth) + '\'</span>. ' + (meth === 'fetch' && cls === 'Cat' ? 'fetch lives in Dog, which is a <i>sibling</i> branch — Cat never looks there. Inheritance only flows <b>up</b> the tree.' : 'The search reached <code>object</code> without finding it.'), [graph({ object: 'bad' }), mroPart(mro.length - 1, 'bad')]));
          return frames;
        }
        var spk = function (c) { return c === 'Puppy' ? 'Woof (squeaky)' : c === 'Dog' ? 'Woof' : c === 'Cat' ? 'Meow' : '...'; };
        var nm = names[cls];
        var result;
        if (meth === 'describe') {
          frames.push(fr('<code>describe</code> came from <b>Animal</b>, but <code>self</code> is still the <b>' + cls + '</b> object. Inside it runs <code>self.speak()</code> — and that lookup starts again at <b>' + cls + '</b>, not at Animal. This is <b>dynamic dispatch</b>.', [cp(H4CODE, 7, 'cur'), vp({ self: cls + ' object', 'self.name': "'" + nm + "'" }, 'self', 'cur'), graph({ Animal: 'ok' })]));
          var r2 = walk('speak', 0, 'Now <code>self.speak()</code>:');
          if (r2.cls === 'Puppy') {
            frames.push(fr('Puppy.speak runs <code>super().speak()</code>. <b>super()</b> means "continue the search from the class <i>after</i> Puppy in the MRO" — that is Dog.', [cp(H4CODE, 22, 'cur'), mroPart(1, 'win')]));
            walk('speak', 1, 'super().speak():');
            frames.push(fr('Dog.speak returns <code>\'Woof\'</code>; Puppy adds <code>\' (squeaky)\'</code>. Extend = parent result + child extra.', [cp(H4CODE, 22, 'ok'), tx('<code>\'Woof\' + \' (squeaky)\'</code> → <b>\'Woof (squeaky)\'</b>')]));
          }
          result = nm + ' says ' + spk(cls);
        } else if (meth === 'speak') {
          if (r.cls === 'Puppy') {
            frames.push(fr('Puppy.speak calls <code>super().speak()</code> — search continues from <b>Dog</b>, the next class in the MRO after Puppy.', [cp(H4CODE, 22, 'cur'), mroPart(1, 'win')]));
            walk('speak', 1, 'super().speak():');
          }
          result = spk(cls);
        } else if (meth === 'fetch') result = nm + ' fetches!';
        else if (meth === 'eat') result = nm + ' is eating';
        else if (meth === '__init__') result = 'None (runs ' + r.cls + '.__init__)';
        else result = '(built-in object.' + meth + ' result)';
        frames.push(fr('Result: <b>' + esc(result) + '</b>. The method was found in <b>' + r.cls + '</b> at position ' + r.idx + ' of the MRO.', [graph((function () { var h = {}; h[r.cls] = 'sel'; return h; })()), tx('<code>' + names[cls].toLowerCase() + '.' + esc(meth) + '()</code> → <span class="c-g">' + esc(result) + '</span>')]));
        return frames;
      }
    }, {
      title: 'super().__init__ chain: building Puppy(\'Bit\', \'Beagle\')',
      gen: function () {
        var code = ['class Animal:', '    def __init__(self, name):', '        self.name = name', '',
          'class Dog(Animal):', '    def __init__(self, name, breed):', '        super().__init__(name)', '        self.breed = breed', '',
          'class Puppy(Dog):', '    pass                    # no __init__ of its own', '',
          "bit = Puppy('Bit', 'Beagle')", 'print(bit.name, bit.breed)', '',
          'class BadDog(Animal):', '    def __init__(self, name, breed):', '        self.breed = breed   # forgot super().__init__!', '',
          "bad = BadDog('Max', 'Pug')", 'print(bad.name)          # AttributeError'].join('\n');
        var F = [];
        F.push(fr('<code>Puppy(\'Bit\', \'Beagle\')</code>: Python makes an empty Puppy object and looks up <code>__init__</code>. Puppy defines none, so the MRO search finds <b>Dog.__init__</b>.', [cp(code, 13), { type: 'array', label: 'Puppy.__mro__', values: ['Puppy', 'Dog', 'Animal', 'object'], hl: { 0: 'cur', 1: 'ok' } }, mp('bit.__dict__', {})]));
        F.push(fr('Dog.__init__ runs with <code>self</code> = the Puppy object (not a Dog object — <code>self</code> is always the real object).', [cp(code, 6), { type: 'stack', label: 'Call stack', items: ['<module>', 'Dog.__init__(self=bit, name, breed)'], hl: { 1: 'cur' } }, vp({ self: 'Puppy object', name: "'Bit'", breed: "'Beagle'" }, 'self', 'cur')]));
        F.push(fr('<code>super().__init__(name)</code>: super() inside Dog means "next after Dog in <b>type(self).__mro__</b>" → <b>Animal</b>. Animal.__init__ is pushed on the call stack.', [cp(code, 7), { type: 'stack', label: 'Call stack', items: ['<module>', 'Dog.__init__(self=bit, ...)', 'Animal.__init__(self=bit, name)'], hl: { 2: 'cur' } }, { type: 'array', label: 'Puppy.__mro__', values: ['Puppy', 'Dog', 'Animal', 'object'], hl: { 1: 'done', 2: 'cur' } }]));
        F.push(fr('Animal sets its part: <code>self.name = name</code>. The parent owns the logic for its own attributes — the child doesn\'t copy-paste it.', [cp(code, 3, 'ok'), mp('bit.__dict__', { name: "'Bit'" }, 'name')]));
        F.push(fr('Animal.__init__ returns; back in Dog.__init__ the next line adds the child\'s part: <code>self.breed = breed</code>.', [cp(code, 8, 'ok'), { type: 'stack', label: 'Call stack', items: ['<module>', 'Dog.__init__(self=bit, ...)'], hl: { 1: 'cur' } }, mp('bit.__dict__', { name: "'Bit'", breed: "'Beagle'" }, 'breed')]));
        F.push(fr('Done: <code>bit</code> has both attributes. Output <b>Bit Beagle</b>.', [cp(code, 14, 'ok'), mp('bit.__dict__', { name: "'Bit'", breed: "'Beagle'" }), tx('Output: <span class="c-g">Bit Beagle</span>')]));
        F.push(fr('Now the bug: <b>BadDog.__init__</b> overrides the parent\'s but never calls <code>super().__init__(name)</code>. Animal\'s setup is <b>skipped completely</b>.', [cp(code, 18, 'bad'), mp('bad.__dict__', { breed: "'Pug'" })]));
        F.push(fr('<code>bad.name</code> → lookup: instance dict (no) → BadDog (no) → Animal (no class attribute <code>name</code>) → object (no) → <span class="c-r">AttributeError: \'BadDog\' object has no attribute \'name\'</span>. Rule: <b>when you override __init__, call super().__init__</b>.', [cp(code, 21, 'bad'), tx('<span class="c-r">AttributeError</span> — the parent never got to run its setup.')]));
        return F;
      }
    }],
    examples: [
      { title: 'Square is-a Rectangle (reuse via super)', html: `<p>The child only changes how it is built; all other methods are inherited unchanged.</p>`, code: { lang: 'python', run: true, code: `class Rectangle:
    def __init__(self, w, h):
        self.w, self.h = w, h

    def area(self):
        return self.w * self.h

    def __repr__(self):
        return f'{type(self).__name__}({self.w}x{self.h})'

class Square(Rectangle):
    def __init__(self, side):
        super().__init__(side, side)    # reuse parent setup

s = Square(4)
print(s, s.area())                    # Square(4x4) 16
print(isinstance(s, Rectangle))       # True` } },
      { title: 'The parent calls the child (template method)', html: `<p>The base class fixes the <b>steps</b>; subclasses fill in one step. <code>self.body()</code> inside the parent dispatches to whichever subclass the object really is.</p>`, code: { lang: 'python', run: true, code: `class Report:
    def render(self):                       # the fixed recipe
        return '\\n'.join(['== ' + self.title() + ' ==', self.body(), '-- end --'])

    def title(self):
        return 'Report'

    def body(self):
        raise NotImplementedError('subclasses must provide body()')

class SalesReport(Report):
    def title(self):
        return 'Sales'

    def body(self):
        return 'Total: 42 orders'

print(SalesReport().render())
try:
    Report().render()
except NotImplementedError as e:
    print('NotImplementedError:', e)` } },
      { title: 'Composition instead of inheritance', html: `<p>A car <b>has an</b> engine; it is not <b>an</b> engine. Store the engine as an attribute and <b>delegate</b> to it. You can swap engines at runtime, which inheritance can't do.</p>`, code: { lang: 'python', run: true, code: `class PetrolEngine:
    def start(self):
        return 'vroom'

class ElectricEngine:
    def start(self):
        return 'hmmm'

class Car:
    def __init__(self, engine):
        self.engine = engine            # has-a

    def start(self):
        return 'Car: ' + self.engine.start()   # delegate

car = Car(PetrolEngine())
print(car.start())                    # Car: vroom
car.engine = ElectricEngine()         # swap behaviour at runtime
print(car.start())                    # Car: hmmm` } },
      { title: 'Extending built-in types', html: `<p>You can inherit from built-ins like <code>dict</code> or <code>list</code>, but some built-in methods (e.g. <code>dict.update</code>) do not call your overridden <code>__setitem__</code>. For safe customisation prefer <code>collections.UserDict</code>.</p>`, code: { lang: 'python', run: true, code: `from collections import UserDict

class LowerDict(UserDict):
    def __setitem__(self, key, value):
        super().__setitem__(key.lower(), value)

class LowerDictBad(dict):
    def __setitem__(self, key, value):
        super().__setitem__(key.lower(), value)

good, bad = LowerDict(), LowerDictBad()
good['A'] = 1; bad['A'] = 1
good.update({'B': 2}); bad.update({'B': 2})
print(dict(good))    # {'a': 1, 'b': 2}
print(bad)           # {'a': 1, 'B': 2}  <- update bypassed the override` } }
    ],
    deepDive: `<p>🟣 <b>MRO and C3.</b> Every class has <code>__mro__</code>, a tuple computed once at class creation by the <b>C3 linearization</b>: children come before parents, and the order of bases in <code>class C(A, B)</code> is preserved. If no consistent order exists, class creation fails with <code>TypeError: Cannot create a consistent method resolution order</code>.</p>
<p><b>super() is not "my parent".</b> Zero-argument <code>super()</code> is compiled into <code>super(__class__, self)</code> (the compiler injects a hidden <code>__class__</code> cell). It returns a proxy that searches <code>type(self).__mro__</code> <b>starting after <code>__class__</code></b>. In a diamond (<code>D(B, C)</code>, both inheriting <code>A</code>), <code>super()</code> inside B can call <b>C</b> — a sibling — which is why <b>cooperative</b> multiple inheritance requires every class to call <code>super()</code> and accept <code>**kwargs</code>.</p>
<p><b>Overriding and Liskov:</b> a subclass should be usable anywhere the parent is (Liskov Substitution Principle). The textbook violation is <code>Square(Rectangle)</code> with a <code>set_width</code> that also changes height — code expecting independent sides breaks. Immutable shapes avoid the problem.</p>
<p><b>Calling the parent explicitly</b> (<code>Animal.__init__(self, name)</code>) works in single inheritance but breaks cooperative chains in diamonds (a base may run twice). Use <code>super()</code>.</p>
<p><b>Hooks:</b> <code>__init_subclass__(cls, **kw)</code> runs on the parent whenever a subclass is defined — used for plugin registries and validation without metaclasses. <b>Performance:</b> deep hierarchies do not slow lookups noticeably because CPython caches method lookups per type (type attribute cache) — the real cost of deep inheritance is cognitive, not CPU.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants love generating deep class hierarchies (AbstractBaseManagerFactory…). Your value is pushing back: <b>is this really is-a?</b> Would a function, composition, or a Protocol be simpler?</p>
<p><b>Use AI as a partner:</b> <code>Draw the MRO for these classes and explain where each super() call goes</code>; <code>Refactor this inheritance tree into composition and list the trade-offs</code>; <code>Find any subclass that breaks Liskov substitution</code>.</p>
<p><b>Where AI goes wrong:</b> forgetting <code>super().__init__()</code> in generated subclasses, mixing explicit <code>Parent.__init__(self)</code> calls with <code>super()</code> in multiple inheritance (double initialisation), subclassing <code>dict</code> and overriding <code>__setitem__</code> expecting <code>update()</code> to respect it.</p>
<p><b>What you must still own:</b> tracing <code>self.method()</code> calls from a parent into a child override during an output-prediction round, and explaining "favour composition over inheritance" with a concrete example.</p>`,
    problems: [{
      title: 'Payroll: Employee, Manager and Intern', level: 'Medium', tags: ['inheritance', 'super', 'override'], companies: ['Amazon', 'Goldman Sachs', 'Flipkart'],
      statement: `<p>Model a payroll. <code>Employee(name, salary)</code> has <code>monthly_pay()</code> = salary / 12 rounded to 2 decimals and <code>describe()</code> = <code>'&lt;name&gt; (&lt;Role&gt;): &lt;pay&gt;'</code> where Role is the class name. <code>Manager(name, salary, reports)</code> adds a list of reports and gets <code>+100 per report</code> per month. <code>Intern(name, stipend)</code> has a flat monthly stipend. Write the classes with <b>no duplicated logic</b>, then print every employee's description.</p>`,
      constraints: `0 ≤ salary ≤ 10<sup>7</sup>; a manager has 0–50 reports.`,
      example: `<p><code>Employee('Asha', 120000)</code> → ${H.c('g', "'Asha (Employee): 10000.0'")}; <code>Manager('Ben', 240000, [asha, cy])</code> → 20000 + 2×100 = ${H.c('g', "'Ben (Manager): 20200.0'")}; <code>Intern('Cy', 1500)</code> → ${H.c('g', "'Cy (Intern): 1500'")}. <code>describe</code> is written once in Employee and works for all three because it calls <code>self.monthly_pay()</code>.</p>`,
      brute: { why: `<p>Three unrelated classes, each with its own copy of <code>describe()</code> and name handling. Any format change must be made in three places, and nothing guarantees all "employees" share the same interface.</p>`, code: `class Employee:
    def __init__(self, name, salary):
        self.name, self.salary = name, salary
    def describe(self):
        return f'{self.name} (Employee): {round(self.salary / 12, 2)}'

class Manager:
    def __init__(self, name, salary, reports):
        self.name, self.salary, self.reports = name, salary, reports
    def describe(self):                       # duplicated logic
        pay = round(self.salary / 12, 2) + 100 * len(self.reports)
        return f'{self.name} (Manager): {pay}'

print(Manager('Ben', 240000, []).describe())` },
      mcq: { q: 'Where should <code>describe()</code> live so it works for Manager and Intern without copies?', options: ['In Employee, calling <code>self.monthly_pay()</code> and <code>type(self).__name__</code>', 'In each subclass', 'In a global function with if/elif on the type', 'In Manager only'], answer: 0, explain: 'Write the shared recipe once in the base class; dynamic dispatch on <code>self.monthly_pay()</code> picks each subclass\'s pay rule.' },
      hints: [`<p>What differs between roles is <b>only the pay rule</b> (and the constructor arguments). Everything else is shared.</p>`, `<p>Manager: <code>super().__init__(name, salary)</code>, then store reports; override <code>monthly_pay</code> as <code>super().monthly_pay() + 100 * len(self.reports)</code>.</p>`, `<p>Intern: call <code>super().__init__(name, 0)</code>, store the stipend, override <code>monthly_pay</code> to return it. <code>describe</code> in the base uses <code>type(self).__name__</code> for the role.</p>`],
      tests: {
        sig: 'string -> string',
        fn: 't_run',
        cases: [
          [['result = Employee(\'Asha\', 120000).describe()'], 'Asha (Employee): 10000.0'],
          [
            [
              'asha = Employee(\'Asha\', 120000)\n' +
                'cy = Intern(\'Cy\', 1500)\n' +
                'result = Manager(\'Ben\', 240000, [asha, cy]).describe()'
            ],
            'Ben (Manager): 20200.0'
          ],
          [['result = Intern(\'Cy\', 1500).describe()'], 'Cy (Intern): 1500'],
          [['result = Employee(\'X\', 100000).monthly_pay()'], 8333.33],
          [['result = Employee(\'Z\', 0).monthly_pay()'], 0],
          [
            [
              'asha = Employee(\'Asha\', 120000)\n' +
                'cy = Intern(\'Cy\', 1500)\n' +
                'ben = Manager(\'Ben\', 240000, [asha, cy])\n' +
                'result = sum(p.monthly_pay() for p in [asha, ben, cy])'
            ],
            31700
          ],
          [['result = Manager(\'M\', 60000).describe()'], 'M (Manager): 5000.0'],
          [['result = Manager(\'Big\', 12, [Employee(\'e\', 1)] * 50).monthly_pay()'], 5001],
          [['result = [issubclass(Manager, Employee), issubclass(Intern, Employee)]'], [true, true]],
          [['result = [\'describe\' not in vars(Manager), \'describe\' not in vars(Intern)]'], [true, true]],
          [
            [
              'm1 = Manager(\'a\', 0)\n' +
                'm1.reports.append(1)\n' +
                'result = Manager(\'b\', 0).reports'
            ],
            []
          ],
          [['result = Employee(\'R\', 10).describe()'], 'R (Employee): 0.83'],
          [['result = Employee(\'Rich\', 10**7).monthly_pay()'], 833333.33],
          [
            [
              'reports = [Employee(\'e\', 1)]\n' +
                'm = Manager(\'m\', 0, reports)\n' +
                'reports.append(Employee(\'f\', 1))\n' +
                'result = len(m.reports)'
            ],
            1
          ],
          [
            ['result = [type(p).__name__ for p in [Employee(\'a\', 1), Manager(\'b\', 1), Intern(\'c\', 1)]]'],
            ['Employee', 'Manager', 'Intern']
          ],
          [['result = Intern(\'Flat\', 0).monthly_pay()'], 0]
        ],
        harness: {
          python: 'def t_run(src):\n' +
            '    ns = dict(globals())\n' +
            '    try:\n' +
            '        exec(src, ns)\n' +
            '        return ns[\'result\']\n' +
            '    except Exception as e:\n' +
            '        return \'!\' + type(e).__name__'
        }
      },
      solution: {
        approach: `<p>Put the shared contract (<code>name</code>, <code>monthly_pay</code>, <code>describe</code>) in <code>Employee</code>. Subclasses call <code>super().__init__</code> for shared setup and override only <code>monthly_pay</code>. <code>Manager</code> <b>extends</b> the parent rule via <code>super().monthly_pay()</code>; <code>Intern</code> <b>replaces</b> it.</p>`,
        code: { lang: 'python', run: true, code: `class Employee:
    def __init__(self, name, salary):
        self.name = name
        self.salary = salary

    def monthly_pay(self):
        return round(self.salary / 12, 2)

    def describe(self):
        # written once; works for every subclass via dynamic dispatch
        return f'{self.name} ({type(self).__name__}): {self.monthly_pay()}'


class Manager(Employee):
    BONUS_PER_REPORT = 100

    def __init__(self, name, salary, reports=None):
        super().__init__(name, salary)
        self.reports = list(reports or [])

    def monthly_pay(self):                       # extend parent rule
        return super().monthly_pay() + self.BONUS_PER_REPORT * len(self.reports)


class Intern(Employee):
    def __init__(self, name, stipend):
        super().__init__(name, 0)
        self.stipend = stipend

    def monthly_pay(self):                       # replace parent rule
        return self.stipend


asha = Employee('Asha', 120000)
cy = Intern('Cy', 1500)
ben = Manager('Ben', 240000, [asha, cy])
for person in [asha, ben, cy]:
    print(person.describe())
print(sum(p.monthly_pay() for p in [asha, ben, cy]))   # 31700.0` },
        dry: { head: ['object', 'monthly_pay found in', 'computation', 'describe()'], rows: [['asha', 'Employee', '120000/12', 'Asha (Employee): 10000.0'], ['ben', 'Manager → super()', '20000.0 + 100×2', 'Ben (Manager): 20200.0'], ['cy', 'Intern', 'stipend', 'Cy (Intern): 1500']] },
        complexity: `<p>O(1) per pay computation (plus O(1) <code>len</code>); total payroll O(n) over n employees.</p>`,
        followUps: ['Add a <code>Director(Manager)</code> with a stock bonus — which methods change?', 'Should a Manager hold Employee objects or IDs? Discuss composition and memory.', 'Make <code>Employee</code> abstract so <code>monthly_pay</code> must be defined (abc module).']
      }
    }]
  });

  /* ================= TOPIC 5: polymorphism and duck typing ================= */
  topics.push({
    title: 'Polymorphism and Duck Typing',
    analogy: `<p>A <b>universal phone charger port</b>: the wall socket doesn't care if you plug in a phone, a speaker or a toothbrush — anything with the right plug works. That is <b>duck typing</b>: "If it walks like a duck and quacks like a duck, treat it as a duck." Python asks <i>"can you do this?"</i>, not <i>"what family are you from?"</i></p>`,
    explain: `<p>🟢 <b>Polymorphism</b> ("many shapes") means <b>one piece of code works with many types</b> because each type responds to the same message in its own way.</p>
<pre>for shape in [Circle(1), Square(2), Triangle(3, 4)]:
    print(shape.area())          # each class computes area its own way</pre>
<p><b>Two flavours in Python:</b></p>
${H.table(['Flavour', 'Needs a shared parent?', 'Example'], [['Inheritance polymorphism', 'yes — subclasses override a base method', '<code>Animal.speak</code> overridden by Dog, Cat'], ['Duck typing', '<b>no</b> — any object with the right method works', 'anything with <code>.read()</code> is "file-like"; anything with <code>__iter__</code> works in a <code>for</code> loop']])}
<p><b>You already use duck typing every day:</b> <code>len()</code> works on str, list, dict, set and <b>your own class</b> if it defines <code>__len__</code>. <code>for x in thing</code> works on anything iterable. <code>+</code> means add for numbers and join for strings and lists. <code>print(obj)</code> works for anything with <code>__str__</code>.</p>
<p><b>Two styles of "can you do this?":</b></p>
<ul><li><b>EAFP</b> — "Easier to Ask Forgiveness than Permission": just call it and catch the error. <code>try: thing.speak() except AttributeError: ...</code> — the Pythonic default.</li>
<li><b>LBYL</b> — "Look Before You Leap": <code>if hasattr(thing, 'speak'):</code>. Fine for simple checks, but can race (the state can change between the check and the use) and duplicates work.</li></ul>
<p><b>What to avoid:</b> long <code>if type(x) == Circle: … elif type(x) == Square: …</code> ladders. Every new type forces you to edit that ladder. Put the behaviour <b>in the class</b> and just call the method — new types plug in without touching old code (the Open/Closed principle).</p>
<p><b>When you want a guarantee:</b> an abstract base class (<code>abc.ABC</code> + <code>@abstractmethod</code>) refuses to create objects that forgot to implement a method; <code>typing.Protocol</code> lets type checkers verify duck typing <b>without</b> inheritance.</p>`,
    clues: [
      '"handle many kinds of X the same way" / "add new types without changing existing code" → polymorphism: common method name, each class implements it',
      '"works with any object that has a <code>.read()</code> / <code>.area()</code> / <code>__len__</code>" → duck typing (don\'t check the type)',
      '"<code>if isinstance(…)</code> / <code>type(x) ==</code> ladder" in a code review → replace with a method on each class',
      '"try / except AttributeError vs hasattr" → EAFP vs LBYL',
      '"make my class work with <code>len()</code> / <code>for</code> / <code>+</code>" → implement the protocol dunder methods (<code>__len__</code>, <code>__iter__</code>, <code>__add__</code>)',
      '"enforce that every subclass implements <code>area()</code>" → <code>abc.ABC</code> + <code>@abstractmethod</code>, or a <code>typing.Protocol</code> for static checks'
    ],
    code: [{ lang: 'python', run: true, title: 'Inheritance polymorphism, duck typing and protocols (runnable)', code: `import math
from abc import ABC, abstractmethod


class Shape(ABC):                       # abstract base: a promise
    @abstractmethod
    def area(self):
        """Return the area of the shape."""

    def describe(self):
        return f'{type(self).__name__} with area {self.area():.2f}'


class Circle(Shape):
    def __init__(self, r):
        self.r = r

    def area(self):
        return math.pi * self.r ** 2


class Square(Shape):
    def __init__(self, s):
        self.s = s

    def area(self):
        return self.s ** 2


class Sticker:                          # NOT a Shape, but has area()
    def area(self):
        return 2.5


def total_area(things):
    # duck typing: we only need .area()
    return sum(t.area() for t in things)


shapes = [Circle(1), Square(2)]
for s in shapes:
    print(s.describe())
print(round(total_area(shapes + [Sticker()]), 2))   # 9.64

try:
    Shape()                             # abstract: cannot instantiate
except TypeError as e:
    print('TypeError:', e)


class Playlist:                         # plugs into len() and for-loops
    def __init__(self, songs):
        self.songs = list(songs)

    def __len__(self):
        return len(self.songs)

    def __iter__(self):
        return iter(self.songs)


p = Playlist(['intro', 'chorus'])
print(len(p), [s.upper() for s in p])  # 2 ['INTRO', 'CHORUS']` }],
    codeTitle: ['Polymorphism in Python'],
    viz: {
      title: 'One loop, many types: duck typing with EAFP',
      input: 'Duck, Robot, Person, Rock',
      inputLabel: 'Objects to loop over (Duck, Robot, Person, Rock, Parrot), max 6',
      gen: function (input) {
        var kinds = { Duck: 'Quack', Robot: 'Beep boop', Person: 'Hello', Parrot: 'Polly wants a cracker', Rock: null };
        var items = String(input).split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
        if (!items.length) throw new Error('Enter class names like: Duck, Robot, Rock');
        if (items.length > 6) throw new Error('Use at most 6 objects');
        items.forEach(function (it) { if (!Object.prototype.hasOwnProperty.call(kinds, it)) throw new Error('Unknown class "' + it + '". Use Duck, Robot, Person, Rock or Parrot'); });
        var code = ['class Duck:', "    def speak(self): return 'Quack'", 'class Robot:', "    def speak(self): return 'Beep boop'", 'class Person:', "    def speak(self): return 'Hello'", 'class Parrot:', "    def speak(self): return 'Polly wants a cracker'", 'class Rock:', '    pass                  # no speak()', '',
          'def make_it_talk(thing):', '    try:', '        return thing.speak()', '    except AttributeError:', "        return f\"{type(thing).__name__} can't speak\"", '',
          'for thing in [' + items.map(function (x) { return x + '()'; }).join(', ') + ']:', '    print(make_it_talk(thing))'].join('\n');
        var frames = [], out = [];
        var table = function (hlRow) { return { type: 'table', label: 'Which classes have speak()?', columns: ['class', 'speak() defined?', 'inherits from'], rows: ['Duck', 'Robot', 'Person', 'Parrot', 'Rock'].map(function (k) { return [k, kinds[k] ? 'yes' : 'no', 'object only']; }), hl: hlRow !== undefined ? (function () { var h = {}; h[hlRow] = kinds[['Duck', 'Robot', 'Person', 'Parrot', 'Rock'][hlRow]] ? 'ok' : 'bad'; return h; })() : {} }; };
        frames.push(fr('Five <b>unrelated</b> classes — no shared parent except <code>object</code>. <code>make_it_talk</code> never checks the type; it just <b>tries</b> to call <code>.speak()</code>. That is duck typing + EAFP.', [cp(code, 12), table()]));
        items.forEach(function (it, i) {
          var row = ['Duck', 'Robot', 'Person', 'Parrot', 'Rock'].indexOf(it);
          var arrHl = {}; arrHl[i] = 'cur';
          frames.push(fr('Loop step ' + (i + 1) + ': <code>thing</code> is a <b>' + it + '</b> object. Call <code>make_it_talk(thing)</code>.', [cp(code, 18), { type: 'array', label: 'objects in the list', values: items.map(function (x) { return x + '()'; }), hl: arrHl, showIdx: true }, vp({ thing: it + ' object' }, 'thing', 'cur')]));
          if (kinds[it]) {
            frames.push(fr('<code>thing.speak()</code>: Python looks up <code>speak</code> on <b>' + it + '</b> — it exists, so it runs. Nobody asked "are you an Animal?" — only "can you speak?"', [cp(code, 14, 'ok'), table(row)]));
            out.push(kinds[it]);
          } else {
            frames.push(fr('<code>thing.speak()</code>: lookup on <b>Rock</b> → Rock → object → not found → <span class="c-r">AttributeError</span> is raised…', [cp(code, 14, 'bad'), table(row)]));
            frames.push(fr('…and caught by <code>except AttributeError</code>. We "asked forgiveness" instead of checking first. The function returns a friendly message.', [cp(code, 16, 'cur'), table(row)]));
            out.push(it + " can't speak");
          }
          frames.push(fr('Printed: <b>' + esc(out[out.length - 1]) + '</b>', [{ type: 'queue', label: 'Output so far', items: out.slice(), frontLabel: 'first', backLabel: 'latest', hl: (function () { var h = {}; h[out.length - 1] = kinds[it] ? 'ok' : 'bad'; return h; })() }]));
        });
        frames.push(fr('Same loop, ' + items.length + ' objects, different behaviour each time — <b>polymorphism</b>. To support a new talking class you add the class; <code>make_it_talk</code> never changes.', [{ type: 'queue', label: 'Final output', items: out.slice(), frontLabel: 'first', backLabel: 'last' }, tx('<b>LBYL version:</b> <code>if hasattr(thing, \'speak\'): …</code> — works too, but checks twice and can be fooled if the attribute exists but is not callable.')]));
        return frames;
      }
    },
    examples: [
      { title: 'Replace the type-check ladder with polymorphism', html: `<p>The "before" version must be edited for every new shape. The "after" version never changes — each class carries its own <code>area</code>.</p>`, code: { lang: 'python', run: true, code: `# BEFORE: type ladder (fragile)
def area_before(shape):
    kind, size = shape
    if kind == 'square':
        return size * size
    elif kind == 'circle':
        return 3.14159 * size * size
    raise ValueError('unknown shape')

# AFTER: each class knows its own area
class Sq:
    def __init__(self, s): self.s = s
    def area(self): return self.s * self.s

class Ci:
    def __init__(self, r): self.r = r
    def area(self): return 3.14159 * self.r * self.r

print(area_before(('square', 3)))
print([round(x.area(), 2) for x in [Sq(3), Ci(1)]])   # [9, 3.14]` } },
      { title: 'File-like objects: duck typing in the standard library', html: `<p>Functions that "read from a file" usually only call <code>.read()</code> or iterate lines, so an in-memory <code>io.StringIO</code> works perfectly — great for tests without touching the disk.</p>`, code: { lang: 'python', run: true, code: `import io

def count_words(f):
    # works with ANY object that can be iterated line by line
    return sum(len(line.split()) for line in f)

fake_file = io.StringIO('hello world\\nduck typing rocks\\n')
print(count_words(fake_file))           # 5
print(count_words(['a b', 'c']))        # 3  (a list of strings also works!)` } },
      { title: 'EAFP vs LBYL side by side', html: `<p>Both give the same answer here, but EAFP does one lookup and handles weird cases (like a key disappearing between check and use) correctly. Use LBYL when the failure is common and cheap to test.</p>`, code: { lang: 'python', run: true, code: `config = {'host': 'localhost'}

# LBYL: look before you leap
if 'port' in config:
    port = config['port']
else:
    port = 8080

# EAFP: easier to ask forgiveness than permission
try:
    port2 = config['port']
except KeyError:
    port2 = 8080

print(port, port2)                      # 8080 8080
print(config.get('port', 8080))         # the idiomatic shortcut` } },
      { title: 'Operators are polymorphic too', html: `<p><code>+</code> calls <code>__add__</code> on the left operand. Defining it lets your class work with <code>+</code> and even <code>sum()</code> (with a start value).</p>`, code: { lang: 'python', run: true, code: `class Money:
    def __init__(self, cents):
        self.cents = cents

    def __add__(self, other):
        return Money(self.cents + other.cents)

    def __repr__(self):
        return f'Money({self.cents})'

print(1 + 2, 'ab' + 'cd', [1] + [2])           # 3 abcd [1, 2]
print(Money(150) + Money(275))                  # Money(425)
print(sum([Money(1), Money(2)], Money(0)))      # Money(3)` } }
    ],
    deepDive: `<p>🟣 <b>Protocols are how Python's built-ins dispatch.</b> <code>len(x)</code> calls <code>type(x).__len__(x)</code>; <code>for</code> calls <code>iter(x)</code>, which tries <code>__iter__</code> and falls back to the old <code>__getitem__</code> sequence protocol; truthiness tries <code>__bool__</code> then <code>__len__</code>. Note special methods are looked up on the <b>type</b>, not the instance — setting <code>obj.__len__ = …</code> does nothing for <code>len(obj)</code>.</p>
<p><b>Binary operators</b> use a double dispatch dance: <code>a + b</code> tries <code>a.__add__(b)</code>; if it returns <code>NotImplemented</code> (the singleton, not the exception), Python tries <code>b.__radd__(a)</code>. Returning <code>NotImplemented</code> for unsupported types is how well-behaved classes cooperate.</p>
<p><b>Static vs dynamic duck typing.</b> <code>typing.Protocol</code> (PEP 544) gives <b>structural</b> typing: <code>class HasArea(Protocol): def area(self) -&gt; float: ...</code> — any class with a matching <code>area</code> satisfies it for mypy/pyright, no inheritance needed. Add <code>@runtime_checkable</code> to allow <code>isinstance</code> (it only checks method <b>names</b>, not signatures). ABCs are <b>nominal</b>: you inherit or <code>register</code>.</p>
<p><b>Single dispatch on argument type:</b> when behaviour must depend on the type of an <i>argument</i> you don't own (e.g. serialising int vs list), use <code>functools.singledispatch</code> instead of an isinstance ladder. <code>match</code> statements with class patterns (<code>case Circle(r=r):</code>) are another modern, readable option.</p>
<p><b>EAFP caveat:</b> keep the <code>try</code> block tiny. <code>try: return thing.speak() except AttributeError</code> also swallows an AttributeError raised <b>inside</b> <code>speak()</code> — a real bug hidden as "can't speak". Production code often does <code>method = getattr(thing, 'speak', None)</code> then calls it outside the try.</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> AI-generated code often reaches for <code>isinstance</code> chains because they are explicit and easy to generate. Refactoring them into polymorphic methods or Protocols is a high-value human review step.</p>
<p><b>Use AI as a partner:</b> <code>Convert this isinstance ladder into polymorphic classes and show the diff</code>; <code>Write a typing.Protocol for everything my function calls on its argument</code>; <code>Give me 3 objects that are file-like enough for this function and one that is not</code>.</p>
<p><b>Where AI goes wrong:</b> wrapping huge blocks in <code>try/except AttributeError</code> (hiding real bugs), using <code>hasattr</code> then calling a non-callable attribute, claiming <code>runtime_checkable</code> Protocols verify signatures, and inventing ABC base classes for code that only ever has one implementation.</p>
<p><b>What you must still own:</b> explaining duck typing vs static typing trade-offs, choosing EAFP vs LBYL per situation, and designing interfaces small enough that new types can plug in — this is how plugin systems and AI tool registries (each tool exposes the same <code>run()</code> method) are built.</p>`,
    problems: [{
      title: 'Total Area of Mixed Shapes', level: 'Medium', tags: ['polymorphism', 'duck typing', 'abc'], companies: ['Microsoft', 'Adobe', 'Zoho'],
      statement: `<p>Create an abstract <code>Shape</code> with an abstract <code>area()</code> and a concrete <code>perimeter()</code> that subclasses must also override (raise <code>NotImplementedError</code> in the base). Implement <code>Circle(r)</code>, <code>Rect(w, h)</code> and <code>Triangle(a, b, c)</code> (Heron's formula). Write <code>total_area(items)</code> that sums <code>area()</code> for <b>any</b> object that has it (including non-Shape objects) and <b>skips</b> objects without an <code>area</code> method. Round results to 2 decimals.</p>`,
      constraints: `Up to 10<sup>5</sup> items; sides positive and triangles valid.`,
      example: `<p><code>[Circle(1), Rect(2, 3), Triangle(3, 4, 5), 'hello', Sticker()]</code> where <code>Sticker().area()</code> returns 1 → 3.14 + 6 + 6 + 1 = ${H.c('g', '16.14')}. <code>'hello'</code> has no <code>area</code> so it is skipped, not crashed on.</p>`,
      brute: { why: `<p>An <code>isinstance</code> ladder computing each formula in one big function. It cannot handle <code>Sticker</code> (unknown type) and must be edited for every new shape — the opposite of polymorphism.</p>`, code: `import math

def total_area_ladder(items):
    total = 0
    for it in items:
        if isinstance(it, tuple) and it[0] == 'circle':
            total += math.pi * it[1] ** 2
        elif isinstance(it, tuple) and it[0] == 'rect':
            total += it[1] * it[2]
    return round(total, 2)

print(total_area_ladder([('circle', 1), ('rect', 2, 3)]))` },
      mcq: { q: 'How should <code>total_area</code> treat <code>\'hello\'</code> in the list?', options: ['Look up <code>area</code> with <code>getattr(item, \'area\', None)</code> and skip if missing', 'Check <code>isinstance(item, Shape)</code> only', 'Let it crash', 'Convert it to a Shape'], answer: 0, explain: 'Duck typing: we care whether it <i>can</i> compute an area. <code>isinstance(item, Shape)</code> would wrongly skip <code>Sticker</code>.' },
      hints: [`<p>Each shape owns its formula → put <code>area()</code> in each class; the summing function should not know any formulas.</p>`, `<p>Use <code>abc.ABC</code> and <code>@abstractmethod</code> on <code>area</code> so a forgotten implementation fails at construction time.</p>`, `<p>In <code>total_area</code>: <code>fn = getattr(item, 'area', None)</code>; if <code>callable(fn)</code> add <code>fn()</code>. Heron: <code>s = (a+b+c)/2</code>, area = <code>√(s(s−a)(s−b)(s−c))</code>.</p>`],
      tests: {
        sig: 'string -> string',
        fn: 't_run',
        cases: [
          [
            [
              'items = [Circle(1), Rect(2, 3), Triangle(3, 4, 5), \'hello\', Sticker()]\n' +
                'result = total_area(items)'
            ],
            16.14
          ],
          [['result = total_area([])'], 0],
          [['result = total_area([\'a\', 5, None])'], 0],
          [
            ['result = [round(s.perimeter(), 2) for s in [Circle(1), Rect(2, 3), Triangle(3, 4, 5)]]'],
            [6.28, 10, 12]
          ],
          [['result = Shape()'], '!TypeError'],
          [
            [
              'class P(Shape):\n' +
                '    def area(self):\n' +
                '        return 1\n' +
                'result = P().perimeter()'
            ],
            '!NotImplementedError'
          ],
          [
            [
              'class Q(Shape):\n' +
                '    def perimeter(self):\n' +
                '        return 1\n' +
                'result = Q()'
            ],
            '!TypeError'
          ],
          [['result = Triangle(3, 4, 5).area()'], 6],
          [['result = Triangle(5, 5, 6).area()'], 12],
          [['result = total_area([Rect(1, 1)] * 100000)'], 100000],
          [['result = total_area([Circle(10**4)])'], 314159265.36],
          [
            [
              'class Weird:\n' +
                '    area = 5\n' +
                'result = total_area([Weird(), Rect(2, 2)])'
            ],
            4
          ],
          [['result = total_area([Circle(1)] * 3)'], 9.42],
          [['result = [isinstance(Circle(1), Shape), isinstance(Sticker(), Shape)]'], [true, false]],
          [['result = total_area([Rect(2, 3), Rect(1, 1)])'], 7],
          [['result = Circle(2).area() == math.pi * 4'], true]
        ],
        harness: {
          python: 'def t_run(src):\n' +
            '    ns = dict(globals())\n' +
            '    try:\n' +
            '        exec(src, ns)\n' +
            '        return ns[\'result\']\n' +
            '    except Exception as e:\n' +
            '        return \'!\' + type(e).__name__'
        }
      },
      solution: {
        approach: `<p>Abstract base defines the contract, subclasses implement formulas (inheritance polymorphism). <code>total_area</code> uses duck typing with <code>getattr</code> so any object with a callable <code>area</code> participates — and the try-free lookup avoids swallowing real errors raised inside <code>area()</code>.</p>`,
        code: { lang: 'python', run: true, code: `import math
from abc import ABC, abstractmethod


class Shape(ABC):
    @abstractmethod
    def area(self):
        """Return the area of the shape."""

    def perimeter(self):
        raise NotImplementedError(f'{type(self).__name__} must implement perimeter()')


class Circle(Shape):
    def __init__(self, r):
        self.r = r
    def area(self):
        return math.pi * self.r ** 2
    def perimeter(self):
        return 2 * math.pi * self.r


class Rect(Shape):
    def __init__(self, w, h):
        self.w, self.h = w, h
    def area(self):
        return self.w * self.h
    def perimeter(self):
        return 2 * (self.w + self.h)


class Triangle(Shape):
    def __init__(self, a, b, c):
        self.a, self.b, self.c = a, b, c
    def area(self):
        s = (self.a + self.b + self.c) / 2          # Heron's formula
        return math.sqrt(s * (s - self.a) * (s - self.b) * (s - self.c))
    def perimeter(self):
        return self.a + self.b + self.c


class Sticker:                                       # not a Shape at all
    def area(self):
        return 1


def total_area(items):
    total = 0
    for item in items:
        fn = getattr(item, 'area', None)             # duck typing
        if callable(fn):
            total += fn()
    return round(total, 2)


items = [Circle(1), Rect(2, 3), Triangle(3, 4, 5), 'hello', Sticker()]
print(total_area(items))                             # 16.14
print([round(s.perimeter(), 2) for s in items[:3]])  # [6.28, 10, 12]` },
        dry: { head: ['item', 'has callable area?', 'area()', 'running total'], rows: [['Circle(1)', 'yes', '3.1416', '3.1416'], ['Rect(2,3)', 'yes', '6', '9.1416'], ['Triangle(3,4,5)', 'yes', '6.0', '15.1416'], ["'hello'", '<span class="c-r">no → skip</span>', '—', '15.1416'], ['Sticker()', 'yes', '1', '<span class="c-g">16.14</span> (rounded)']] },
        complexity: `<p>O(n) time over n items, O(1) extra space.</p>`,
        followUps: ['Write a <code>typing.Protocol</code> <code>HasArea</code> and annotate <code>total_area(items: Iterable[HasArea])</code>.', 'Sort shapes by area using <code>key=lambda s: s.area()</code>.', 'What if <code>area()</code> itself raises AttributeError internally — why is getattr safer than try/except here?']
      }
    }]
  });

  /* ================= TOPIC 6: @staticmethod and @classmethod ================= */
  topics.push({
    title: '@staticmethod and @classmethod (Alternate Constructors and Utilities)',
    analogy: `<p>Think of a <b>car factory</b>. A normal method is something <b>one car</b> does ("honk"). A <b>@classmethod</b> is something the <b>factory</b> does — like "build a car from this order form"; if the factory is the <i>Sports</i> branch, you get a sports car. A <b>@staticmethod</b> is the <b>calculator on the factory wall</b>: handy and kept there for convenience, but it doesn't need to know about any car or which factory it's in.</p>`,
    explain: `<p>🟢 <b>Three kinds of methods</b> — the only difference is <b>what Python passes in automatically as the first argument</b>.</p>
${H.table(['Kind', 'Decorator', 'Auto first argument', 'Can use', 'Typical use'], [
  ['Instance method', '(none)', '<code>self</code> = the object', 'object data + class data', 'almost everything'],
  ['Class method', '<code>@classmethod</code>', '<code>cls</code> = the class it was called on', 'class data, can create new objects', 'alternate constructors, class-wide counters/registries'],
  ['Static method', '<code>@staticmethod</code>', '<b>nothing</b>', 'only its own arguments', 'helper/validation logic that belongs with the class']
])}
<pre>class Date:
    def __init__(self, year, month, day):
        self.year, self.month, self.day = year, month, day

    @classmethod
    def from_string(cls, text):          # '2026-10-14' → Date
        y, m, d = map(int, text.split('-'))
        return cls(y, m, d)              # cls, not Date!

    @staticmethod
    def is_leap(year):                   # pure helper, no self/cls
        return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)

d = Date.from_string('2026-10-14')
print(Date.is_leap(2024))                # True</pre>
<p><b>Alternate constructors</b> are the #1 use of <code>@classmethod</code>. Python only allows one <code>__init__</code>, so extra "ways to build" an object become class methods named <code>from_…</code>. You already know some: <code>dict.fromkeys(...)</code>, <code>datetime.fromisoformat(...)</code>, <code>int.from_bytes(...)</code>.</p>
<p><b>Why <code>cls(...)</code> and not <code>Date(...)</code>?</b> Because class methods are inherited. If <code>EuroDate(Date)</code> calls <code>EuroDate.from_string(...)</code>, then <code>cls</code> is <b>EuroDate</b>, so you get a EuroDate back. Hard-coding <code>Date(...)</code> would quietly return the wrong type.</p>
<p><b>Static methods</b> are just plain functions placed in the class for organisation. They can't see <code>self</code> or <code>cls</code>. Ask yourself: "does this logic belong with the class conceptually?" If not, a normal module-level function is perfectly Pythonic.</p>
<p><b>Calling:</b> both kinds can be called on the class (<code>Date.is_leap(2024)</code>) <b>or</b> on an instance (<code>d.is_leap(2024)</code>) — with a class method, <code>cls</code> is then <code>type(d)</code>.</p>`,
    clues: [
      '"create an object from a string / dict / file / JSON row" / "multiple ways to construct" → <code>@classmethod</code> alternate constructor named <code>from_…</code>',
      '"factory method should also work for subclasses" → <code>@classmethod</code> returning <code>cls(...)</code>',
      '"utility that doesn\'t need object or class state" (validation, unit conversion) → <code>@staticmethod</code> (or a module-level function)',
      '"count all instances / keep a registry for the class" → class method operating on <code>cls</code> attributes',
      '"difference between staticmethod and classmethod?" → what gets passed: nothing vs the class',
      '"Python has no constructor overloading" → default arguments, or class-method alternate constructors'
    ],
    code: [{ lang: 'python', run: true, title: 'All three method kinds together (runnable)', code: `class Pizza:
    _made = 0                                   # class-level counter

    def __init__(self, toppings):
        self.toppings = list(toppings)
        Pizza._made += 1                        # one shared counter

    # ---- instance method: needs one pizza
    def describe(self):
        return f'{type(self).__name__} with {", ".join(self.toppings) or "nothing"}'

    # ---- class methods: alternate constructors + class-wide info
    @classmethod
    def margherita(cls):
        return cls(['tomato', 'mozzarella'])

    @classmethod
    def from_csv(cls, text):
        return cls(t.strip() for t in text.split(',') if t.strip())

    @classmethod
    def made(cls):
        return cls._made

    # ---- static method: plain helper, no self or cls
    @staticmethod
    def price(n_toppings, base=200, per=40):
        return base + per * n_toppings


class VeganPizza(Pizza):
    pass


p1 = Pizza.margherita()
p2 = Pizza.from_csv('olive, onion , ,corn')
v = VeganPizza.margherita()          # cls is VeganPizza!

print(p1.describe())                 # Pizza with tomato, mozzarella
print(p2.describe())                 # Pizza with olive, onion, corn
print(v.describe())                  # VeganPizza with tomato, mozzarella
print(Pizza.price(3), p1.price(2))   # 320 280 (callable on class or instance)
print(Pizza.made(), VeganPizza.made())   # 3 3  (cls reads the shared counter)` }],
    codeTitle: ['instance vs class vs static methods'],
    viz: {
      title: 'Date.from_string vs EuroDate.from_string: what cls really is',
      input: '2026-10-14',
      inputLabel: 'Date text YYYY-MM-DD (try 2024-02-29, 2026-02-29, 2026-13-01)',
      gen: function (input) {
        var t = String(input).trim();
        var mm = t.match(/^(\d{1,4})-(\d{1,2})-(\d{1,2})$/);
        if (!mm) throw new Error('Use the format YYYY-MM-DD, e.g. 2026-10-14');
        var y = parseInt(mm[1], 10), m = parseInt(mm[2], 10), d = parseInt(mm[3], 10);
        var L = ['class Date:', '    def __init__(self, year, month, day):', '        self.year, self.month, self.day = year, month, day', '',
          '    @classmethod', '    def from_string(cls, text):', "        y, m, d = map(int, text.split('-'))", '        if not cls.is_valid(y, m, d):', "            raise ValueError('bad date: ' + text)", '        return cls(y, m, d)', '',
          '    @staticmethod', '    def is_valid(y, m, d):', '        if not 1 <= m <= 12:', '            return False', '        leap = y % 4 == 0 and (y % 100 != 0 or y % 400 == 0)', '        days = [31, 29 if leap else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]', '        return 1 <= d <= days[m - 1]', '',
          '    def show(self):', "        return f'{self.day:02d}/{self.month:02d}/{self.year}'", '',
          'class EuroDate(Date):', '    def show(self):', "        return f'{self.day}.{self.month}.{self.year}'", '',
          "d = Date.from_string('" + t + "')", "e = EuroDate.from_string('" + t + "')", 'print(d.show(), e.show())'];
        var code = L.join('\n');
        function ln(s) { for (var i = 0; i < L.length; i++) if (L[i].indexOf(s) >= 0) return i + 1; return 0; }
        var F = [];
        var kinds = { type: 'table', label: 'The three method kinds', columns: ['method', 'kind', 'auto first arg'], rows: [['from_string', '@classmethod', 'cls'], ['is_valid', '@staticmethod', '(none)'], ['show', 'instance', 'self']], hl: {} };
        F.push(fr('Three kinds of methods in one class. Watch what Python passes in <b>automatically</b> each time.', [cp(code, 0), kinds]));
        var leap = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
        var days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        var valid = m >= 1 && m <= 12 && d >= 1 && d <= days[m - 1];
        ['Date', 'EuroDate'].forEach(function (C, idx) {
          if (idx === 1 && !valid) return;
          var callLine = ln(C === 'Date' ? 'd = Date.from_string' : 'e = EuroDate.from_string');
          var k2 = JSON.parse(JSON.stringify(kinds)); k2.hl = { 0: 'cur' };
          F.push(fr('<code>' + C + '.from_string(\'' + esc(t) + '\')</code>: <code>from_string</code> is a <b>@classmethod</b>' + (C === 'EuroDate' ? ' — <b>inherited</b> from Date' : '') + ', so Python passes <b>the class it was called on</b> as <code>cls</code>. Here <code>cls = ' + C + '</code>.', [cp(code, callLine), vp({ cls: C, text: "'" + t + "'" }, 'cls', 'cur'), k2]));
          if (idx === 0) {
            F.push(fr('Split the text and convert: <code>y, m, d = ' + y + ', ' + m + ', ' + d + '</code>.', [cp(code, ln("map(int")), vp({ cls: C, y: y, m: m, d: d }, 'y,m,d', 'ok')]));
            var k3 = JSON.parse(JSON.stringify(kinds)); k3.hl = { 1: 'cur' };
            F.push(fr('<code>cls.is_valid(y, m, d)</code>: a <b>@staticmethod</b> gets <b>no</b> self and <b>no</b> cls — only the three numbers we pass. It is a pure helper that lives in the class for organisation.', [cp(code, ln('def is_valid')), vp({ y: y, m: m, d: d }, '', ''), k3]));
            if (!(m >= 1 && m <= 12)) {
              F.push(fr('Month check <code>1 &lt;= ' + m + ' &lt;= 12</code> is <b>False</b> → returns False.', [cp(code, ln('return False'), 'bad')]));
            } else {
              F.push(fr('Month OK. Leap year? <code>' + y + ' % 4 == 0 and (…)</code> → <b>' + (leap ? 'True' : 'False') + '</b>, so February has ' + days[1] + ' days.', [cp(code, ln('leap = ')), vp({ leap: leap ? 'True' : 'False', 'days[m-1]': days[m - 1] }, 'leap', 'cur')]));
              F.push(fr('<code>1 &lt;= ' + d + ' &lt;= ' + days[m - 1] + '</code> → <b>' + (valid ? 'True' : 'False') + '</b>.', [cp(code, ln('return 1 <= d'), valid ? 'ok' : 'bad')]));
            }
            if (!valid) {
              F.push(fr('<span class="c-r">raise ValueError(\'bad date: ' + esc(t) + '\')</span>. Validation lives in one static helper, so every constructor that uses it rejects bad input the same way. The EuroDate line never runs.', [cp(code, ln('raise ValueError'), 'bad'), tx('Try <code>2024-02-29</code> (leap year) or <code>2026-10-14</code>.')]));
              F.push(fr('Takeaway: the <b>class method</b> parsed, the <b>static method</b> validated, and no object was ever created for invalid input.', [kinds]));
              return;
            }
          } else {
            F.push(fr('Same parsing and the same static validation (valid ✔). The only difference is <code>cls</code>.', [cp(code, ln('if not cls.is_valid'), 'ok'), vp({ cls: C }, 'cls', 'sel')]));
          }
          F.push(fr('<code>return cls(y, m, d)</code> → since <code>cls = ' + C + '</code>, this is <code>' + C + '(' + y + ', ' + m + ', ' + d + ')</code>. It runs <code>__init__</code> and returns a <b>' + C + '</b> object.', [cp(code, ln('return cls(y, m, d)'), 'ok'), mp((idx ? 'e' : 'd') + '.__dict__  (type: ' + C + ')', { year: y, month: m, day: d })]));
        });
        if (!valid) return F;
        var pad = function (n) { return (n < 10 ? '0' : '') + n; };
        var o1 = pad(d) + '/' + pad(m) + '/' + y, o2 = d + '.' + m + '.' + y;
        F.push(fr('<code>d.show()</code> uses Date.show; <code>e.show()</code> finds EuroDate\'s override. Output: <b>' + o1 + ' ' + o2 + '</b>.', [cp(code, L.length, 'ok'), tx('<span class="c-g">' + o1 + ' ' + o2 + '</span>')]));
        F.push(fr('Why not <code>@staticmethod</code> + <code>return Date(y, m, d)</code>? Then <code>EuroDate.from_string(...)</code> would build a <b>plain Date</b> and print <code>' + o1 + '</code> — the subclass is silently lost. Class methods know <i>which class</i> called them.', [{ type: 'table', label: 'Factory style comparison', columns: ['factory written as', 'EuroDate.from_string(...) returns', 'e.show()'], rows: [['@classmethod → cls(...)', 'EuroDate object', o2], ['@staticmethod → Date(...)', 'Date object (wrong!)', o1]], hl: { 0: 'ok', 1: 'bad' } }]));
        return F;
      }
    },
    examples: [
      { title: 'Alternate constructors from different data sources', html: `<p>One <code>__init__</code> stays simple; each <code>from_…</code> class method adapts a different input format.</p>`, code: { lang: 'python', run: true, code: `import json

class User:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    @classmethod
    def from_dict(cls, data):
        return cls(data['name'], int(data['age']))

    @classmethod
    def from_json(cls, text):
        return cls.from_dict(json.loads(text))      # reuse the other factory

    @classmethod
    def from_csv_row(cls, row):
        name, age = row.split(',')
        return cls(name.strip(), int(age))

    def __repr__(self):
        return f'User({self.name!r}, {self.age})'

print(User.from_dict({'name': 'Asha', 'age': '31'}))
print(User.from_json('{"name": "Ben", "age": 25}'))
print(User.from_csv_row('Cy, 40'))` } },
      { title: 'Static method as a validation helper', html: `<p>A static method needs no object, so you can call it <b>before</b> creating one — perfect for validation used by both <code>__init__</code> and setters.</p>`, code: { lang: 'python', run: true, code: `class Email:
    def __init__(self, address):
        if not Email.is_valid(address):
            raise ValueError(f'invalid email: {address}')
        self.address = address.lower()

    @staticmethod
    def is_valid(address):
        name, sep, domain = address.partition('@')
        return bool(name) and sep == '@' and '.' in domain

print(Email.is_valid('a@b.com'), Email.is_valid('nope'))   # True False
print(Email('Asha@Example.com').address)                  # asha@example.com
try:
    Email('bad-address')
except ValueError as e:
    print(e)` } },
      { title: 'Class method for a class-wide registry', html: `<p>Class methods receive <code>cls</code>, so they can read and change class-level state. Here every subclass registers itself and a factory creates objects by name.</p>`, code: { lang: 'python', run: true, code: `class Notifier:
    registry = {}

    @classmethod
    def register(cls, name):
        def deco(sub):
            cls.registry[name] = sub
            return sub
        return deco

    @classmethod
    def create(cls, name):
        return cls.registry[name]()

@Notifier.register('email')
class EmailNotifier(Notifier):
    def send(self, msg): return 'email: ' + msg

@Notifier.register('sms')
class SmsNotifier(Notifier):
    def send(self, msg): return 'sms: ' + msg

for kind in ['sms', 'email']:
    print(Notifier.create(kind).send('hi'))
print(sorted(Notifier.registry))     # ['email', 'sms']` } }
    ],
    deepDive: `<p>🟣 <b>They are descriptors.</b> <code>@staticmethod</code> wraps a function in a <code>staticmethod</code> object whose <code>__get__</code> returns the raw function (no binding). <code>@classmethod</code> wraps it in a <code>classmethod</code> object whose <code>__get__(obj, owner)</code> returns a method bound to <code>owner</code> (the class), whether you access it through the class or an instance. Instance methods bind to the instance. Same machinery, three different binding rules.</p>
<p><b>Version notes:</b> since Python 3.10 static methods are directly callable even as raw objects inside the class body and copy <code>__doc__</code>/<code>__name__</code> (they behave like <code>functools.wraps</code>). Chaining <code>@classmethod</code> over <code>@property</code> ("class properties") was added in 3.9, deprecated in 3.11 and <b>removed in 3.13</b> — use a metaclass property or a plain class method instead.</p>
<p><b>Inheritance subtleties:</b> a class method called through a subclass gets the subclass as <code>cls</code>, so <code>cls._made += 1</code> creates a separate counter on that subclass the first time (same read-then-write rule as instance attributes). For one shared counter write <code>Base._made += 1</code> explicitly.</p>
<p><b>Typing alternate constructors:</b> annotate with <code>typing.Self</code> (3.11+): <code>def from_string(cls, text: str) -&gt; Self:</code> so type checkers know <code>EuroDate.from_string</code> returns <code>EuroDate</code>.</p>
<p><b>Staticmethod vs module function:</b> Python (unlike Java) has free functions, so many style guides prefer a module-level function unless the helper is clearly part of the class's API or needs to be overridden in subclasses (static methods <i>can</i> be overridden and called via <code>self.helper()</code>, which picks the subclass version).</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> generated code frequently marks things <code>@staticmethod</code> by reflex ("doesn't use self") or writes factories that hard-code the class name. These compile and pass simple tests, then break when someone subclasses.</p>
<p><b>Use AI as a partner:</b> <code>Find factory methods in this codebase that return a hard-coded class instead of cls</code>; <code>Suggest alternate constructors for this class given these input formats</code>; <code>Add typing.Self annotations to all class-method constructors</code>.</p>
<p><b>Where AI goes wrong:</b> mixing up <code>cls</code> and <code>self</code>, using <code>@staticmethod</code> where class state is needed (then reaching for the global class name), suggesting the removed class-property pattern (<code>@classmethod @property</code>) on Python 3.13, and over-using static methods that should be plain functions.</p>
<p><b>What you must still own:</b> the one-sentence answer interviewers want — "instance gets self, classmethod gets cls (great for alternate constructors that respect subclasses), staticmethod gets nothing (a namespaced helper)" — plus a concrete example like <code>datetime.fromisoformat</code>.</p>`,
    problems: [{
      title: 'Temperature with Alternate Constructors', level: 'Medium', tags: ['classmethod', 'staticmethod', 'factory'], companies: ['Google', 'Swiggy', 'Uber'],
      statement: `<p>Build a <code>Temperature</code> class that stores degrees <b>Celsius</b>. Provide class-method constructors <code>from_fahrenheit(f)</code> and <code>from_kelvin(k)</code>, static helpers <code>c_to_f(c)</code> and <code>f_to_c(f)</code>, an instance method <code>to_fahrenheit()</code>, and reject temperatures below absolute zero (−273.15 °C) with <code>ValueError</code>. A subclass <code>BodyTemperature</code> must get <code>BodyTemperature</code> objects from the inherited constructors.</p>`,
      constraints: `Inputs are floats; round displayed values to 2 decimals.`,
      example: `<p><code>Temperature.from_fahrenheit(212).celsius</code> → ${H.c('g', '100.0')}; <code>Temperature.from_kelvin(0).celsius</code> → ${H.c('g', '-273.15')}; <code>Temperature.from_kelvin(-1)</code> → ${H.c('r', 'ValueError')}; <code>type(BodyTemperature.from_fahrenheit(98.6)).__name__</code> → ${H.c('b', "'BodyTemperature'")} because the factory used <code>cls</code>.</p>`,
      brute: { why: `<p>A single <code>__init__(self, value, unit)</code> with an <code>if unit == 'F' … elif unit == 'K'</code> chain. It works but mixes parsing with construction, grows with every unit, and typos in the unit string only fail at runtime.</p>`, code: `class TemperatureLadder:
    def __init__(self, value, unit='C'):
        if unit == 'C':
            self.celsius = value
        elif unit == 'F':
            self.celsius = (value - 32) * 5 / 9
        elif unit == 'K':
            self.celsius = value - 273.15
        else:
            raise ValueError('unknown unit')

print(TemperatureLadder(212, 'F').celsius)` },
      mcq: { q: 'Why must <code>from_fahrenheit</code> end with <code>return cls(c)</code> instead of <code>return Temperature(c)</code>?', options: ['So subclasses calling it get an instance of the subclass', 'Because <code>Temperature</code> is not defined inside the class', 'It is faster', 'Static methods cannot create objects'], answer: 0, explain: '<code>cls</code> is whichever class the method was called on. Hard-coding the base class breaks <code>BodyTemperature.from_fahrenheit</code>.' },
      hints: [`<p><code>__init__</code> only ever takes Celsius — one canonical representation. Every other unit is converted <b>before</b> calling it.</p>`, `<p>Conversions are pure math with no object needed → <code>@staticmethod</code>. Building an object from another unit → <code>@classmethod</code> that calls <code>cls(...)</code>.</p>`, `<p>Validate in <code>__init__</code> (<code>if celsius &lt; -273.15: raise ValueError</code>) so all constructors share the check. Kelvin: c = k − 273.15; F→C: (f − 32) × 5/9.</p>`],
      tests: {
        sig: 'string -> string',
        fn: 't_run',
        cases: [
          [['result = Temperature.from_fahrenheit(212).celsius'], 100],
          [['result = Temperature.from_kelvin(0).celsius'], -273.15],
          [['result = Temperature.from_kelvin(-1)'], '!ValueError'],
          [['result = type(BodyTemperature.from_fahrenheit(98.6)).__name__'], 'BodyTemperature'],
          [['result = Temperature(-273.16)'], '!ValueError'],
          [['result = Temperature(-273.15).celsius'], -273.15],
          [['result = Temperature.c_to_f(100)'], 212],
          [['result = Temperature.f_to_c(32)'], 0],
          [['result = Temperature(37).to_fahrenheit()'], 98.6],
          [['result = Temperature.from_fahrenheit(98.6).celsius'], 37],
          [['result = Temperature.from_fahrenheit(-459.67).celsius'], -273.15],
          [['result = Temperature.from_fahrenheit(-460)'], '!ValueError'],
          [['result = repr(BodyTemperature.from_fahrenheit(101.3))'], 'BodyTemperature(38.5)'],
          [
            [
              'result = [BodyTemperature(38.5).has_fever(), BodyTemperature(37.9).has_fever(), BodyTemperature(38.0).has_fever()]'
            ],
            [true, false, true]
          ],
          [['result = BodyTemperature.from_kelvin(310.15).celsius'], 37],
          [['result = type(Temperature.from_kelvin(300)).__name__'], 'Temperature'],
          [['result = Temperature(36.6667).celsius'], 36.67],
          [['result = Temperature(0).to_fahrenheit()'], 32],
          [['result = Temperature(100).c_to_f(0)'], 32],
          [['result = repr(Temperature.from_fahrenheit(212))'], 'Temperature(100.0)']
        ],
        harness: {
          python: 'def t_run(src):\n' +
            '    ns = dict(globals())\n' +
            '    try:\n' +
            '        exec(src, ns)\n' +
            '        return ns[\'result\']\n' +
            '    except Exception as e:\n' +
            '        return \'!\' + type(e).__name__'
        }
      },
      solution: {
        approach: `<p>Keep one canonical unit in <code>__init__</code> with validation. Static methods do unit math; class methods convert then delegate to <code>cls(...)</code>, so validation runs once and subclasses are preserved.</p>`,
        code: { lang: 'python', run: true, code: `class Temperature:
    ABSOLUTE_ZERO_C = -273.15

    def __init__(self, celsius):
        if celsius < self.ABSOLUTE_ZERO_C:
            raise ValueError(f'below absolute zero: {celsius}')
        self.celsius = round(celsius, 2)

    # --- static helpers: pure conversions
    @staticmethod
    def c_to_f(c):
        return c * 9 / 5 + 32

    @staticmethod
    def f_to_c(f):
        return (f - 32) * 5 / 9

    # --- alternate constructors
    @classmethod
    def from_fahrenheit(cls, f):
        return cls(cls.f_to_c(f))

    @classmethod
    def from_kelvin(cls, k):
        return cls(k + cls.ABSOLUTE_ZERO_C)

    # --- instance method
    def to_fahrenheit(self):
        return round(self.c_to_f(self.celsius), 2)

    def __repr__(self):
        return f'{type(self).__name__}({self.celsius})'


class BodyTemperature(Temperature):
    def has_fever(self):
        return self.celsius >= 38.0


print(Temperature.from_fahrenheit(212))          # Temperature(100.0)
print(Temperature.from_kelvin(0))                # Temperature(-273.15)
b = BodyTemperature.from_fahrenheit(101.3)
print(b, b.has_fever(), b.to_fahrenheit())       # BodyTemperature(38.5) True 101.3
try:
    Temperature.from_kelvin(-1)
except ValueError as e:
    print('ValueError:', e)` },
        dry: { head: ['call', 'cls', 'converted °C', 'result'], rows: [['Temperature.from_fahrenheit(212)', 'Temperature', '100.0', 'Temperature(100.0)'], ['Temperature.from_kelvin(0)', 'Temperature', '-273.15', 'Temperature(-273.15)'], ['BodyTemperature.from_fahrenheit(101.3)', '<span class="c-b">BodyTemperature</span>', '38.5', 'BodyTemperature(38.5)'], ['Temperature.from_kelvin(-1)', 'Temperature', '-274.15', '<span class="c-r">ValueError</span>']] },
        complexity: `<p>All operations O(1) time and space.</p>`,
        followUps: ['Annotate the factories with <code>typing.Self</code>.', 'Add <code>__eq__</code> and <code>__lt__</code> so temperatures can be compared and sorted.', 'Should <code>c_to_f</code> be a module-level function instead? Argue both sides.']
      }
    }]
  });

  /* ================= PRACTICE: Easy ================= */
  practice.push({
    title: 'Point Class with Distance', level: 'Easy', tags: ['class', '__init__', 'methods'], companies: ['TCS', 'Cognizant', 'Capgemini'],
    statement: `<p>Write a class <code>Point</code> created as <code>Point(x, y)</code> with methods <code>distance_to(other)</code> (Euclidean distance to another Point), <code>move(dx, dy)</code> (shifts the point in place) and a <code>__repr__</code> that returns <code>'Point(x, y)'</code>. Then, given a list of points, return the one closest to the origin.</p>`,
    constraints: `|x|, |y| ≤ 10<sup>4</sup>; 1 ≤ number of points ≤ 10<sup>5</sup>.`,
    example: `<p><code>Point(3, 4).distance_to(Point(0, 0))</code> → ${H.c('g', '5.0')} (the 3-4-5 triangle). Closest to origin among <code>[Point(3, 4), Point(1, 1), Point(-2, 0)]</code> → ${H.c('g', 'Point(1, 1)')} with distance √2 ≈ 1.41.</p>`,
    brute: { why: `<p>Tuples and free functions: <code>dist(p, q)</code> on <code>(x, y)</code> tuples. Fine for tiny scripts, but tuples can't be moved in place, have no readable printing, and nothing ties the operations to the data.</p>`, code: `import math

def dist(p, q):
    return math.sqrt((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2)

pts = [(3, 4), (1, 1), (-2, 0)]
print(min(pts, key=lambda p: dist(p, (0, 0))))` },
    mcq: { q: 'Inside <code>distance_to(self, other)</code>, how do you read the other point\'s x?', options: ['<code>other.x</code>', '<code>self.other.x</code>', '<code>Point.x</code>', '<code>x</code>'], answer: 0, explain: '<code>other</code> is just another Point object passed as an argument; its data is reached with <code>other.x</code>, exactly like <code>self.x</code> for the current object.' },
    hints: [`<p>Store <code>x</code> and <code>y</code> on <code>self</code> in <code>__init__</code>. A method can receive another object of the same class as a normal parameter.</p>`, `<p><code>math.hypot(self.x - other.x, self.y - other.y)</code> computes the distance safely.</p>`, `<p>For the closest point: <code>min(points, key=lambda p: p.distance_to(origin))</code> where <code>origin = Point(0, 0)</code>.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [['result = Point(3, 4).distance_to(Point(0, 0))'], 5],
        [
          [
            'pts = [Point(3, 4), Point(1, 1), Point(-2, 0)]\n' +
              'result = repr(closest_to_origin(pts))'
          ],
          'Point(1, 1)'
        ],
        [
          [
            'pts = [Point(3, 4), Point(1, 1), Point(-2, 0)]\n' +
              'pts[1].move(5, 5)\n' +
              'result = [repr(pts[1]), repr(closest_to_origin(pts))]'
          ],
          ['Point(6, 6)', 'Point(-2, 0)']
        ],
        [['result = Point(0, 0).distance_to(Point(0, 0))'], 0],
        [['result = repr(Point(-2, 0))'], 'Point(-2, 0)'],
        [['result = Point(1, 1).distance_to(Point(4, 5))'], 5],
        [['result = Point(4, 5).distance_to(Point(1, 1))'], 5],
        [['result = abs(Point(1, 1).distance_to(Point(0, 0)) - 2 ** 0.5) < 1e-12'], true],
        [['p = Point(1, 2)\np.move(-1, -2)\nresult = repr(p)'], 'Point(0, 0)'],
        [
          [
            'a, b = Point(1, 1), Point(-1, -1)\n' +
              'result = closest_to_origin([a, b]) is a'
          ],
          true
        ],
        [['result = repr(closest_to_origin([Point(5, 5)]))'], 'Point(5, 5)'],
        [
          [
            'pts = [Point(i % 10000, 5) for i in range(1, 100000)] + [Point(0, 0)]\n' +
              'result = repr(closest_to_origin(pts))'
          ],
          'Point(0, 0)'
        ],
        [['result = repr(Point(1.5, -2.5))'], 'Point(1.5, -2.5)'],
        [
          ['result = Point(10**4, 10**4).distance_to(Point(-10**4, -10**4)) - 2 * 10**4 * 2 ** 0.5 < 1e-6'],
          true
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>Data on <code>self</code>, behaviour in methods; a method can work with a second object (<code>other</code>). <code>min</code> with a key reuses the method for the search.</p>`,
      code: { lang: 'python', run: true, code: `import math

class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def distance_to(self, other):
        return math.hypot(self.x - other.x, self.y - other.y)

    def move(self, dx, dy):
        self.x += dx
        self.y += dy

    def __repr__(self):
        return f'Point({self.x}, {self.y})'

def closest_to_origin(points):
    origin = Point(0, 0)
    return min(points, key=lambda p: p.distance_to(origin))

print(Point(3, 4).distance_to(Point(0, 0)))             # 5.0
pts = [Point(3, 4), Point(1, 1), Point(-2, 0)]
print(closest_to_origin(pts))                            # Point(1, 1)
pts[1].move(5, 5)
print(pts[1], closest_to_origin(pts))                    # Point(6, 6) Point(-2, 0)` },
      dry: { head: ['point', 'distance to origin', 'best so far'], rows: [['Point(3, 4)', '5.0', 'Point(3, 4)'], ['Point(1, 1)', '1.414', 'Point(1, 1)'], ['Point(-2, 0)', '2.0', '<span class="c-g">Point(1, 1)</span>']] },
      complexity: `<p>Each distance O(1); finding the closest is O(n) time, O(1) extra space.</p>`,
      followUps: ['Return the k closest points (heapq.nsmallest).', 'Make Point immutable and return a new Point from <code>move</code>.']
    }
  });

  practice.push({
    title: 'Predict the Output: Shadowing a Class Attribute', level: 'Easy', tags: ['predict output', 'class attribute'], companies: ['Infosys', 'Amazon'],
    statement: `<p>What does this program print? Explain each line.</p>
<pre>class Car:
    wheels = 4

a, b = Car(), Car()
a.wheels = 3
print(a.wheels, b.wheels, Car.wheels)
Car.wheels = 6
print(a.wheels, b.wheels, Car.wheels)
del a.wheels
print(a.wheels)</pre>`,
    constraints: `Pure reasoning; no input.`,
    example: `<p>Expected output:<br>${H.c('g', '3 4 4')}<br>${H.c('g', '3 6 6')}<br>${H.c('g', '6')}</p>`,
    brute: { why: `<p>The naive guess is "<code>a.wheels = 3</code> changes the class", giving <code>3 3 3</code>. That ignores the rule that assignment through an instance writes only into that instance's <code>__dict__</code>. Running the code is the honest check:</p>`, code: `class Car:
    wheels = 4

a, b = Car(), Car()
a.wheels = 3
print(a.wheels, b.wheels, Car.wheels)
Car.wheels = 6
print(a.wheels, b.wheels, Car.wheels)
del a.wheels
print(a.wheels)` },
    mcq: { q: 'After <code>a.wheels = 3</code>, where does the value 3 live?', options: ['In <code>a.__dict__</code> only', 'In <code>Car.__dict__</code>', 'In both', 'Nowhere, it raises an error'], answer: 0, explain: 'Instance assignment always writes to the instance dict, creating a shadow of the class attribute for that object only.' },
    hints: [`<p>Reading <code>obj.attr</code>: instance dict first, then class. Writing <code>obj.attr = v</code>: always the instance dict.</p>`, `<p>After <code>Car.wheels = 6</code>, only objects <b>without</b> their own <code>wheels</code> see 6.</p>`, `<p><code>del a.wheels</code> removes the shadow, so reads fall back to the class again.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: '3 4 4\n3 6 6\n6\n{} {}' }] },
    solution: {
      approach: `<p>Track the three dictionaries: <code>a.__dict__</code>, <code>b.__dict__</code>, <code>Car.__dict__</code>. Apply "read: instance → class; write/del: the named dict only".</p>`,
      code: { lang: 'python', run: true, code: `class Car:
    wheels = 4

a, b = Car(), Car()
a.wheels = 3                               # a.__dict__ = {'wheels': 3}
print(a.wheels, b.wheels, Car.wheels)      # 3 4 4
Car.wheels = 6                             # class value changes
print(a.wheels, b.wheels, Car.wheels)      # 3 6 6  (a is still shadowed)
del a.wheels                               # remove the shadow
print(a.wheels)                            # 6
print(vars(a), vars(b))                    # {} {}` },
      dry: { head: ['statement', 'a.__dict__', 'Car.wheels', 'printed'], rows: [['a.wheels = 3', "{'wheels': 3}", '4', ''], ['print(...)', "{'wheels': 3}", '4', '3 4 4'], ['Car.wheels = 6', "{'wheels': 3}", '6', ''], ['print(...)', "{'wheels': 3}", '6', '3 6 6'], ['del a.wheels; print', '{}', '6', '<span class="c-g">6</span>']] },
      complexity: `<p>Not applicable (reasoning exercise); each attribute access is O(1).</p>`,
      followUps: ['What would <code>del b.wheels</code> do? (AttributeError — b has no own copy.)', 'What does <code>Car.__dict__[\'wheels\']</code> show after each step?']
    }
  });

  practice.push({
    title: 'Predict the Output: isinstance, issubclass and type', level: 'Easy', tags: ['predict output', 'inheritance'], companies: ['Microsoft', 'Accenture'],
    statement: `<p>Predict every printed value.</p>
<pre>class Vehicle: pass
class Car(Vehicle): pass
class Truck(Vehicle): pass

c = Car()
print(isinstance(c, Car), isinstance(c, Vehicle), isinstance(c, Truck))
print(type(c) == Vehicle, type(c).__name__)
print(issubclass(Car, Vehicle), issubclass(Vehicle, Car), issubclass(Car, Car))
print(isinstance(c, object), isinstance(Car, type))</pre>`,
    constraints: `Pure reasoning.`,
    example: `<p>${H.c('g', 'True True False')}<br>${H.c('g', 'False Car')}<br>${H.c('g', 'True False True')}<br>${H.c('g', 'True True')}</p><p>A Car <b>is a</b> Vehicle, but its exact type is Car. Every class is its own subclass, everything is an <code>object</code>, and classes themselves are instances of <code>type</code>.</p>`,
    brute: { why: `<p>Guessing that <code>type(c) == Vehicle</code> is True (confusing "exact type" with "is-a"), or that <code>issubclass(Car, Car)</code> is False. Run it to check:</p>`, code: `class Vehicle: pass
class Car(Vehicle): pass
class Truck(Vehicle): pass

c = Car()
print(isinstance(c, Car), isinstance(c, Vehicle), isinstance(c, Truck))
print(type(c) == Vehicle, type(c).__name__)
print(issubclass(Car, Vehicle), issubclass(Vehicle, Car), issubclass(Car, Car))
print(isinstance(c, object), isinstance(Car, type))` },
    mcq: { q: 'Which check respects inheritance (a Car counts as a Vehicle)?', options: ['<code>isinstance(c, Vehicle)</code>', '<code>type(c) == Vehicle</code>', '<code>type(c) is Vehicle</code>', '<code>c.__class__ == Vehicle</code>'], answer: 0, explain: '<code>isinstance</code> walks the MRO. <code>type(...)</code> comparisons check the exact class only.' },
    hints: [`<p><code>isinstance(obj, C)</code> is True if C appears anywhere in <code>type(obj).__mro__</code>.</p>`, `<p><code>type(obj)</code> is the exact class — no inheritance considered.</p>`, `<p><code>issubclass(C, C)</code> is True by definition; every class inherits from <code>object</code>, and every class is an instance of <code>type</code>.</p>`],
    tests: {
      io: true,
      cases: [
        {
          stdin: '',
          stdout: '[\'Car\', \'Vehicle\', \'object\']\n' +
            'True True False\n' +
            'False Car\n' +
            'True False True\n' +
            'True True\n' +
            'True'
        }
      ]
    },
    solution: {
      approach: `<p>Write down <code>Car.__mro__ = (Car, Vehicle, object)</code>. <code>isinstance</code>/<code>issubclass</code> are membership tests in that tuple; <code>type()</code> is the first element only.</p>`,
      code: { lang: 'python', run: true, code: `class Vehicle: pass
class Car(Vehicle): pass
class Truck(Vehicle): pass

c = Car()
print([k.__name__ for k in Car.__mro__])           # ['Car', 'Vehicle', 'object']
print(isinstance(c, Car), isinstance(c, Vehicle), isinstance(c, Truck))   # True True False
print(type(c) == Vehicle, type(c).__name__)        # False Car
print(issubclass(Car, Vehicle), issubclass(Vehicle, Car), issubclass(Car, Car))  # True False True
print(isinstance(c, object), isinstance(Car, type))   # True True
print(isinstance(c, (Truck, Car)))                 # True (tuple = any of)` },
      dry: { head: ['expression', 'reasoning', 'value'], rows: [['isinstance(c, Vehicle)', 'Vehicle in Car.__mro__', 'True'], ['type(c) == Vehicle', 'exact type is Car', 'False'], ['issubclass(Vehicle, Car)', 'Car not in Vehicle.__mro__', 'False'], ['isinstance(Car, type)', 'classes are objects of type', 'True']] },
      complexity: `<p>isinstance is O(length of MRO) — effectively O(1) for normal hierarchies.</p>`,
      followUps: ['When is <code>type(x) is C</code> actually the right check? (e.g. exact-type equality in <code>__eq__</code>)', 'How do ABCs make <code>isinstance(x, collections.abc.Sized)</code> work without inheritance?']
    }
  });

  practice.push({
    title: 'Design a Stack Class', level: 'Easy', tags: ['design', 'stack', 'methods'], companies: ['Amazon', 'Oracle', 'Zoho'],
    statement: `<p>Implement a class <code>Stack</code> with methods <code>push(x)</code>, <code>pop()</code>, <code>peek()</code>, <code>is_empty()</code> and <code>size()</code>. <code>pop</code> and <code>peek</code> on an empty stack must raise <code>IndexError('empty stack')</code>. Then use it to check whether a bracket string like <code>'({[]})'</code> is balanced.</p>`,
    constraints: `Up to 10<sup>5</sup> operations; bracket string length ≤ 10<sup>4</sup>.`,
    example: `<p><code>'({[]})'</code> → ${H.c('g', 'True')}; <code>'(]'</code> → ${H.c('r', 'False')} because <code>]</code> does not match the most recent opener <code>(</code>; <code>'(('</code> → ${H.c('r', 'False')} (stack not empty at the end).</p>`,
    brute: { why: `<p>Repeatedly deleting <code>'()'</code>, <code>'[]'</code>, <code>'{}'</code> pairs with <code>str.replace</code> until nothing changes. Correct but O(n²) and teaches nothing about encapsulating state in a class.</p>`, code: `def balanced_brute(s):
    prev = None
    while prev != s:
        prev = s
        s = s.replace('()', '').replace('[]', '').replace('{}', '')
    return s == ''

print(balanced_brute('({[]})'), balanced_brute('(]'))` },
    mcq: { q: 'Why wrap a Python list in a Stack class at all?', options: ['To expose only stack operations and give clear errors', 'Because lists cannot append', 'To make it faster than a list', 'Python requires it'], answer: 0, explain: 'Encapsulation: callers can only push/pop/peek, so nobody inserts into the middle by accident, and errors are meaningful.' },
    hints: [`<p>Keep a private list <code>self._items</code>. The top of the stack is the end of the list (<code>append</code>/<code>pop</code> are O(1)).</p>`, `<p>Check <code>if not self._items: raise IndexError('empty stack')</code> in <code>pop</code> and <code>peek</code>.</p>`, `<p>Brackets: push openers; on a closer, the stack must be non-empty and its top must be the matching opener. At the end the stack must be empty.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [['result = [balanced(\'({[]})\'), balanced(\'(]\'), balanced(\'((\')]'], [true, false, false]],
        [
          [
            'result = [balanced(\'\'), balanced(\')\'), balanced(\'a(b)c\'), balanced(\'([)]\'), balanced(\'{[()()]}\'), balanced(\'}{\')]'
          ],
          [true, false, true, false, true, false]
        ],
        [
          [
            'result = [balanced(\'(\' * 5000 + \')\' * 5000), balanced(\'(\' * 10000), balanced(\'()\' * 5000)]'
          ],
          [true, false, true]
        ],
        [['result = Stack().pop()'], '!IndexError'],
        [['result = Stack().peek()'], '!IndexError'],
        [
          [
            'try:\n' +
              '    Stack().pop()\n' +
              'except IndexError as e:\n' +
              '    result = str(e)'
          ],
          'empty stack'
        ],
        [
          [
            'try:\n' +
              '    Stack().peek()\n' +
              'except IndexError as e:\n' +
              '    result = str(e)'
          ],
          'empty stack'
        ],
        [
          [
            's = Stack()\n' +
              'r = [s.is_empty(), s.size()]\n' +
              's.push(1); s.push(2)\n' +
              'r += [s.is_empty(), s.size(), s.peek(), s.pop(), s.size(), s.pop(), s.is_empty()]\n' +
              'result = r'
          ],
          [true, 0, false, 2, 2, 2, 1, 1, true]
        ],
        [
          [
            's = Stack()\n' +
              'for i in range(100000):\n' +
              '    s.push(i)\n' +
              'r = [s.size(), s.peek()]\n' +
              'for _ in range(100000):\n' +
              '    s.pop()\n' +
              'result = r + [s.is_empty()]'
          ],
          [100000, 99999, true]
        ],
        [
          [
            's = Stack()\n' +
              's.push(None); s.push([1])\n' +
              'result = [s.pop(), s.pop(), s.is_empty()]'
          ],
          [[1], null, true]
        ],
        [
          [
            'a, b = Stack(), Stack()\n' +
              'a.push(1)\n' +
              'result = [a.size(), b.size()]'
          ],
          [1, 0]
        ],
        [['result = balanced(\'[{(<>)}]\')'], true],
        [['result = balanced(\'(((((\')'], false],
        [['result = balanced(\'abc\')'], true]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>The class hides the list and exposes a tiny API. The bracket checker only uses that API, which makes the logic read like the algorithm description.</p>`,
      code: { lang: 'python', run: true, code: `class Stack:
    def __init__(self):
        self._items = []

    def push(self, x):
        self._items.append(x)

    def pop(self):
        if not self._items:
            raise IndexError('empty stack')
        return self._items.pop()

    def peek(self):
        if not self._items:
            raise IndexError('empty stack')
        return self._items[-1]

    def is_empty(self):
        return not self._items

    def size(self):
        return len(self._items)


def balanced(s):
    pairs = {')': '(', ']': '[', '}': '{'}
    st = Stack()
    for ch in s:
        if ch in '([{':
            st.push(ch)
        elif ch in pairs:
            if st.is_empty() or st.pop() != pairs[ch]:
                return False
    return st.is_empty()

print(balanced('({[]})'), balanced('(]'), balanced('(('))   # True False False
try:
    Stack().pop()
except IndexError as e:
    print('IndexError:', e)` },
      dry: { head: ['char', 'action', 'stack after'], rows: [['(', 'push', '('], ['{', 'push', '( {'], ['[', 'push', '( { ['], [']', 'pop [ ✔', '( {'], ['}', 'pop { ✔', '('], [')', 'pop ( ✔', 'empty → <span class="c-g">True</span>']] },
      complexity: `<p>Every stack operation O(1) amortised; bracket check O(n) time, O(n) space.</p>`,
      followUps: ['Add <code>__len__</code> and <code>__bool__</code> so <code>len(st)</code> and <code>if st:</code> work.', 'Return the index of the first unmatched bracket.']
    }
  });

  /* ================= PRACTICE: Medium ================= */
  practice.push({
    title: 'Predict the Output: The Shared List Bug', level: 'Medium', tags: ['predict output', 'mutable class attribute', 'debugging'], companies: ['Google', 'Atlassian'],
    statement: `<p>Predict the output, then fix the class so each team has its own members.</p>
<pre>class Team:
    members = []
    def __init__(self, name):
        self.name = name
    def add(self, person):
        self.members.append(person)

red, blue = Team('red'), Team('blue')
red.add('Asha')
blue.add('Ben')
print(red.members, blue.members)
blue.members = ['Cy']
blue.add('Dee')
print(red.members, blue.members, Team.members)</pre>`,
    constraints: `Pure reasoning + a fix.`,
    example: `<p>${H.c('r', "['Asha', 'Ben'] ['Asha', 'Ben']")}<br>${H.c('r', "['Asha', 'Ben'] ['Cy', 'Dee'] ['Asha', 'Ben']")}</p><p>Both teams append to the <b>one class-level list</b>. Then <code>blue.members = ['Cy']</code> gives blue its <b>own</b> list (an assignment), so from then on blue is separate while red still uses the shared one.</p>`,
    brute: { why: `<p>The tempting "fix" is to copy the list on every read or to reset <code>Team.members = []</code> in <code>__init__</code> — which wipes every other team's data whenever a new team is created. The real fix is to stop sharing.</p>`, code: `class TeamBadFix:
    members = []
    def __init__(self, name):
        self.name = name
        TeamBadFix.members = []          # wipes everyone's data!
    def add(self, person):
        self.members.append(person)

r = TeamBadFix('red'); r.add('Asha')
b = TeamBadFix('blue')
print(r.members)                         # ['Asha'] - but Team.members is now a new list` },
    mcq: { q: 'Why does <code>red.add(\'Asha\')</code> also show up in <code>blue.members</code>?', options: ['<code>append</code> mutates the list found on the class, shared by all instances', 'Python copies attributes between instances', 'Because both were created on the same line', '<code>self</code> refers to the class here'], answer: 0, explain: 'Lookup finds <code>members</code> on the class; <code>.append</code> mutates that single list object. No instance attribute is ever created.' },
    hints: [`<p>Mutation (<code>.append</code>) never creates an instance attribute; assignment (<code>=</code>) does.</p>`, `<p>Trace three objects: the class list, red's dict, blue's dict. After <code>blue.members = ['Cy']</code>, blue's dict has its own list.</p>`, `<p>Fix: create <code>self.members = []</code> in <code>__init__</code> and delete the class attribute.</p>`],
    tests: {
      io: true,
      cases: [
        {
          stdin: '',
          stdout: '[\'Asha\', \'Ben\'] [\'Asha\', \'Ben\']\n' +
            '[\'Asha\', \'Ben\'] [\'Cy\', \'Dee\'] [\'Asha\', \'Ben\']\n' +
            '[\'Asha\'] [\'Ben\']'
        }
      ]
    },
    solution: {
      approach: `<p>Explain the shared list, then move mutable state into <code>__init__</code>. Rule of thumb: <b>class attributes should be immutable</b> (numbers, strings, tuples, frozensets) unless sharing is the explicit goal.</p>`,
      code: { lang: 'python', run: true, code: `class Team:
    members = []
    def __init__(self, name):
        self.name = name
    def add(self, person):
        self.members.append(person)

red, blue = Team('red'), Team('blue')
red.add('Asha')
blue.add('Ben')
print(red.members, blue.members)                 # ['Asha', 'Ben'] ['Asha', 'Ben']
blue.members = ['Cy']                            # blue gets its OWN list
blue.add('Dee')
print(red.members, blue.members, Team.members)   # ['Asha', 'Ben'] ['Cy', 'Dee'] ['Asha', 'Ben']


class FixedTeam:
    def __init__(self, name, members=None):
        self.name = name
        self.members = list(members) if members else []   # one list per team

    def add(self, person):
        self.members.append(person)

r, b = FixedTeam('red'), FixedTeam('blue')
r.add('Asha'); b.add('Ben')
print(r.members, b.members)                      # ['Asha'] ['Ben']` },
      dry: { head: ['statement', 'Team.members', 'blue.__dict__ members'], rows: [["red.add('Asha')", "['Asha']", '—'], ["blue.add('Ben')", "['Asha', 'Ben']", '—'], ["blue.members = ['Cy']", "['Asha', 'Ben']", "['Cy']"], ["blue.add('Dee')", "['Asha', 'Ben']", "<span class=\"c-g\">['Cy', 'Dee']</span>"]] },
      complexity: `<p>O(1) per add in both versions; the fix costs one small list per instance.</p>`,
      followUps: ['Find the same bug with a mutable default argument (<code>def __init__(self, members=[])</code>).', 'How would a linter (ruff rule RUF012) or a dataclass catch this?']
    }
  });

  practice.push({
    title: 'Predict the Output: Order of super().__init__ Calls', level: 'Medium', tags: ['predict output', 'super', 'inheritance'], companies: ['Meta', 'Salesforce'],
    statement: `<p>What does this print, in what order?</p>
<pre>class A:
    def __init__(self):
        print('A start')
        self.tag = 'A'
        print('A end')

class B(A):
    def __init__(self):
        print('B start')
        super().__init__()
        self.tag += 'B'
        print('B end')

class C(B):
    def __init__(self):
        print('C start')
        super().__init__()
        self.tag += 'C'
        print('C end')

print(C().tag)</pre>`,
    constraints: `Pure reasoning.`,
    example: `<p>${H.c('g', 'C start, B start, A start, A end, B end, C end, ABC')} (one per line). Each <code>__init__</code> prints its "start", then <b>pauses</b> inside <code>super().__init__()</code> until the parent finishes — like nested function calls on a stack.</p>`,
    brute: { why: `<p>The common wrong answer is "A first" (thinking parents always run before children) or "C start, C end, B…" (forgetting that <code>super().__init__()</code> is a normal call that must finish before the next line). Run it to see the nesting:</p>`, code: `class A:
    def __init__(self):
        print('A start'); self.tag = 'A'; print('A end')

class B(A):
    def __init__(self):
        print('B start'); super().__init__(); self.tag += 'B'; print('B end')

class C(B):
    def __init__(self):
        print('C start'); super().__init__(); self.tag += 'C'; print('C end')

print(C().tag)` },
    mcq: { q: 'Why is <code>tag</code> equal to <code>\'ABC\'</code> and not <code>\'CBA\'</code>?', options: ['Each child appends after its parent\'s <code>__init__</code> has returned', 'Python sorts attribute strings', 'A runs last', 'super() reverses the order'], answer: 0, explain: 'A sets <code>\'A\'</code> first (deepest call), then B appends B after super returns, then C appends C.' },
    hints: [`<p><code>super().__init__()</code> is an ordinary function call: the current method waits until it returns.</p>`, `<p>Draw the call stack: C.__init__ → B.__init__ → A.__init__. "start" lines print on the way down, "end" lines on the way up.</p>`, `<p>The attribute is created by the deepest call (A) and extended on the way back up (B, then C).</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: 'C start\nB start\nA start\nA end\nB end\nC end\nABC' }] },
    solution: {
      approach: `<p>Treat it as nested calls. Down: C start, B start, A start. Up: A end, B end (tag 'AB'), C end (tag 'ABC').</p>`,
      code: { lang: 'python', run: true, code: `class A:
    def __init__(self):
        print('A start')
        self.tag = 'A'
        print('A end')

class B(A):
    def __init__(self):
        print('B start')
        super().__init__()          # waits for A to finish
        self.tag += 'B'
        print('B end')

class C(B):
    def __init__(self):
        print('C start')
        super().__init__()          # waits for B (and A) to finish
        self.tag += 'C'
        print('C end')

print(C().tag)
# C start / B start / A start / A end / B end / C end / ABC` },
      dry: { head: ['call stack', 'printed', 'self.tag'], rows: [['C', 'C start', '—'], ['C → B', 'B start', '—'], ['C → B → A', 'A start, A end', "'A'"], ['C → B', 'B end', "'AB'"], ['C', 'C end', "<span class=\"c-g\">'ABC'</span>"]] },
      complexity: `<p>O(depth of hierarchy) calls.</p>`,
      followUps: ['What prints if B forgets to call <code>super().__init__()</code>? (AttributeError on <code>self.tag += \'B\'</code>)', 'Move each <code>super()</code> call to the end of its method — what changes?']
    }
  });

  practice.push({
    title: 'Implement Queue using Stacks (LeetCode 232)', level: 'Medium', tags: ['design', 'queue', 'amortized'], companies: ['Amazon', 'Microsoft', 'Bloomberg', 'Apple'],
    statement: `<p>Implement a FIFO queue class <code>MyQueue</code> using only two stacks (Python lists used with <code>append</code>/<code>pop</code> only). Methods: <code>push(x)</code>, <code>pop()</code>, <code>peek()</code>, <code>empty()</code>. Each operation must be <b>amortised O(1)</b>.</p>`,
    constraints: `1 ≤ x ≤ 9; at most 100 calls (LeetCode) — design for 10<sup>6</sup>; pop/peek only on non-empty queue.`,
    example: `<p>push(1), push(2), peek() → ${H.c('g', '1')}, pop() → ${H.c('g', '1')}, empty() → ${H.c('r', 'False')}. The oldest element must come out first even though stacks give the newest.</p>`,
    brute: { why: `<p>On every <code>pop</code>, move all elements to a second stack, pop, then move everything back. Each pop costs O(n) → O(n²) for n operations.</p>`, code: `class MyQueueSlow:
    def __init__(self):
        self.s = []

    def push(self, x):
        self.s.append(x)

    def pop(self):
        tmp = []
        while self.s:
            tmp.append(self.s.pop())
        val = tmp.pop()
        while tmp:
            self.s.append(tmp.pop())
        return val

q = MyQueueSlow(); q.push(1); q.push(2)
print(q.pop())` },
    mcq: { q: 'When should elements move from the <i>in</i> stack to the <i>out</i> stack?', options: ['Only when the out stack is empty', 'On every push', 'On every pop, always', 'Never'], answer: 0, explain: 'Moving only when <code>out</code> is empty means each element is moved at most once → amortised O(1).' },
    hints: [`<p>Keep two lists on <code>self</code>: <code>inbox</code> for pushes and <code>outbox</code> for pops.</p>`, `<p>Reversing a stack into another stack turns newest-first into oldest-first.</p>`, `<p>In <code>pop</code>/<code>peek</code>: if <code>outbox</code> is empty, move everything from <code>inbox</code>; then use <code>outbox[-1]</code>. <code>empty()</code> = both empty.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'q = MyQueue()\n' +
              'q.push(1); q.push(2)\n' +
              'result = [q.peek(), q.pop(), q.empty()]'
          ],
          [1, 1, false]
        ],
        [
          [
            'q = MyQueue()\n' +
              'q.push(1); q.push(2)\n' +
              'q.pop()\n' +
              'q.push(3)\n' +
              'result = [q.pop(), q.pop(), q.empty()]'
          ],
          [2, 3, true]
        ],
        [['result = MyQueue().empty()'], true],
        [
          [
            'q = MyQueue()\n' +
              'q.push(1); q.push(2); q.pop(); q.push(3)\n' +
              'result = [q.peek(), q.pop(), q.pop(), q.empty()]'
          ],
          [2, 2, 3, true]
        ],
        [
          [
            'q = MyQueue()\n' +
              'q.push(7)\n' +
              'result = [q.empty(), q.peek(), q.empty(), q.pop(), q.empty()]'
          ],
          [false, 7, false, 7, true]
        ],
        [
          [
            'q = MyQueue()\n' +
              'for i in range(1, 6):\n' +
              '    q.push(i)\n' +
              'result = [q.pop() for _ in range(5)]'
          ],
          [1, 2, 3, 4, 5]
        ],
        [
          [
            'q = MyQueue()\n' +
              'for i in range(10**6):\n' +
              '    q.push(i)\n' +
              'result = all(q.pop() == i for i in range(10**6)) and q.empty()'
          ],
          true
        ],
        [
          [
            'q = MyQueue()\n' +
              'r = []\n' +
              'for i in range(1000):\n' +
              '    q.push(i); q.push(i + 1000)\n' +
              '    r.append(q.pop())\n' +
              'result = [len(r), r[:4], r[-1], q.empty()]'
          ],
          [1000, [0, 1000, 1, 1001], 1499, false]
        ],
        [
          [
            'q = MyQueue()\n' +
              'q.push(1)\n' +
              'q.pop()\n' +
              'q.push(2)\n' +
              'result = [q.peek(), q.empty()]'
          ],
          [2, false]
        ],
        [
          [
            'a, b = MyQueue(), MyQueue()\n' +
              'a.push(1)\n' +
              'result = [a.empty(), b.empty()]'
          ],
          [false, true]
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>Two-stack queue with lazy transfer. Each element is pushed to inbox once, moved once, popped once → total O(n) for n operations, amortised O(1) each. A private helper method <code>_shift</code> keeps the logic in one place.</p>`,
      code: { lang: 'python', run: true, code: `class MyQueue:
    def __init__(self):
        self.inbox = []
        self.outbox = []

    def push(self, x):
        self.inbox.append(x)

    def _shift(self):
        if not self.outbox:                 # move only when needed
            while self.inbox:
                self.outbox.append(self.inbox.pop())

    def pop(self):
        self._shift()
        return self.outbox.pop()

    def peek(self):
        self._shift()
        return self.outbox[-1]

    def empty(self):
        return not self.inbox and not self.outbox

q = MyQueue()
q.push(1); q.push(2)
print(q.peek(), q.pop(), q.empty())   # 1 1 False
q.push(3)
print(q.pop(), q.pop(), q.empty())    # 2 3 True` },
      dry: { head: ['op', 'inbox', 'outbox', 'returns'], rows: [['push 1', '[1]', '[]', ''], ['push 2', '[1, 2]', '[]', ''], ['peek', '[]', '[2, 1]', '1'], ['pop', '[]', '[2]', '1'], ['push 3', '[3]', '[2]', ''], ['pop', '[3]', '[]', '<span class="c-g">2</span>']] },
      complexity: `<p>Amortised O(1) per operation; O(n) space.</p>`,
      followUps: ['Implement a stack using queues (LeetCode 225).', 'Why is <code>collections.deque</code> the right tool in real Python code?']
    }
  });

  practice.push({
    title: 'Design Hit Counter (LeetCode 362)', level: 'Medium', tags: ['design', 'queue', 'sliding window'], companies: ['Dropbox', 'Google', 'Amazon', 'Uber'],
    statement: `<p>Design a class <code>HitCounter</code> that counts hits in the <b>past 5 minutes</b> (300 seconds). <code>hit(timestamp)</code> records a hit; <code>get_hits(timestamp)</code> returns how many hits happened in the window <code>(timestamp − 300, timestamp]</code>. Timestamps arrive in non-decreasing order (seconds).</p>`,
    constraints: `1 ≤ timestamp ≤ 2·10<sup>9</sup>; up to 300 calls on LeetCode — design for millions of hits per minute.`,
    example: `<p>hit(1), hit(2), hit(3), get_hits(4) → ${H.c('g', '3')}; hit(300), get_hits(300) → ${H.c('g', '4')}; get_hits(301) → ${H.c('g', '3')} because the hit at time 1 is now older than 300 seconds (301 − 300 = 1 is outside the window).</p>`,
    brute: { why: `<p>Store every timestamp forever in a list and count with a full scan on each query: O(total hits) per <code>get_hits</code>, and memory grows without bound.</p>`, code: `class HitCounterSlow:
    def __init__(self):
        self.hits = []

    def hit(self, t):
        self.hits.append(t)

    def get_hits(self, t):
        return sum(1 for h in self.hits if h > t - 300)

c = HitCounterSlow()
for t in [1, 2, 3]:
    c.hit(t)
print(c.get_hits(4))` },
    mcq: { q: 'Since timestamps only increase, which structure lets us drop expired hits cheaply?', options: ['A deque — pop old hits from the left', 'A set', 'A sorted list with insort on every hit', 'A dict keyed by hit count'], answer: 0, explain: 'Expired hits are always the oldest ones, at the front. <code>deque.popleft()</code> is O(1).' },
    hints: [`<p>The window slides forward only; the oldest hits expire first → FIFO.</p>`, `<p>Keep <code>self.q = deque()</code>. In both methods, first call a helper <code>_evict(t)</code> that pops from the left while <code>q[0] &lt;= t - 300</code>.</p>`, `<p>For huge hit rates store <code>[timestamp, count]</code> pairs and increment the last pair when the timestamp repeats, so memory is ≤ 300 entries.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'c = HitCounter()\n' +
              'for t in [1, 2, 3]:\n' +
              '    c.hit(t)\n' +
              'r = [c.get_hits(4)]\n' +
              'c.hit(300)\n' +
              'r += [c.get_hits(300), c.get_hits(301)]\n' +
              'result = r'
          ],
          [3, 4, 3]
        ],
        [
          [
            'c = HitCounter()\n' +
              'c.hit(1)\n' +
              'result = [c.get_hits(300), c.get_hits(301)]'
          ],
          [1, 0]
        ],
        [
          [
            'c = HitCounter()\n' +
              'for _ in range(3):\n' +
              '    c.hit(5)\n' +
              'result = [c.get_hits(5), c.get_hits(304), c.get_hits(305)]'
          ],
          [3, 3, 0]
        ],
        [['result = HitCounter().get_hits(100)'], 0],
        [
          [
            'c = HitCounter()\n' +
              'for i in range(1, 1000001):\n' +
              '    c.hit(i)\n' +
              'result = c.get_hits(1000000)'
          ],
          300
        ],
        [
          [
            'c = HitCounter()\n' +
              'for _ in range(10**6):\n' +
              '    c.hit(7)\n' +
              'result = [c.get_hits(7), c.get_hits(306), c.get_hits(307)]'
          ],
          [1000000, 1000000, 0]
        ],
        [
          [
            'c = HitCounter()\n' +
              'c.hit(2 * 10**9)\n' +
              'result = [c.get_hits(2 * 10**9), c.get_hits(2 * 10**9 + 299), c.get_hits(2 * 10**9 + 300)]'
          ],
          [1, 1, 0]
        ],
        [
          [
            'c = HitCounter()\n' +
              'c.hit(1); c.hit(100); c.hit(200)\n' +
              'result = [c.get_hits(300), c.get_hits(301), c.get_hits(400), c.get_hits(500)]'
          ],
          [3, 2, 1, 0]
        ],
        [
          [
            'c = HitCounter()\n' +
              'c.hit(10)\n' +
              'c.hit(10)\n' +
              'c.hit(11)\n' +
              'result = [c.get_hits(310), c.get_hits(311)]'
          ],
          [1, 0]
        ],
        [
          [
            'a, b = HitCounter(), HitCounter()\n' +
              'a.hit(1)\n' +
              'result = [a.get_hits(1), b.get_hits(1)]'
          ],
          [1, 0]
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>Deque of <code>[time, count]</code> buckets plus a running total on <code>self</code>. Evicting a bucket subtracts its count. Each bucket is added and removed once → amortised O(1); memory ≤ 300 buckets.</p>`,
      code: { lang: 'python', run: true, code: `from collections import deque

class HitCounter:
    WINDOW = 300

    def __init__(self):
        self.q = deque()      # [timestamp, count] buckets, oldest at left
        self.total = 0

    def _evict(self, t):
        while self.q and self.q[0][0] <= t - self.WINDOW:
            self.total -= self.q.popleft()[1]

    def hit(self, t):
        self._evict(t)
        if self.q and self.q[-1][0] == t:
            self.q[-1][1] += 1                # same second: bump bucket
        else:
            self.q.append([t, 1])
        self.total += 1

    def get_hits(self, t):
        self._evict(t)
        return self.total

c = HitCounter()
for t in [1, 2, 3]:
    c.hit(t)
print(c.get_hits(4))       # 3
c.hit(300)
print(c.get_hits(300))     # 4
print(c.get_hits(301))     # 3` },
      dry: { head: ['call', 'buckets after', 'total', 'returns'], rows: [['hit 1,2,3', '[1,1] [2,1] [3,1]', '3', ''], ['get_hits 4', 'same', '3', '3'], ['hit 300', '+ [300,1]', '4', ''], ['get_hits 300', 'same (1 &gt; 0)', '4', '4'], ['get_hits 301', 'evict [1,1]', '3', '<span class="c-g">3</span>']] },
      complexity: `<p>Amortised O(1) per call; O(min(hits, 300)) memory with buckets.</p>`,
      followUps: ['Make it thread-safe for concurrent hits.', 'Support out-of-order timestamps (circular array of 300 slots indexed by t % 300).', 'Distributed version: per-node counters merged by a coordinator.']
    }
  });

  practice.push({
    title: 'Account Hierarchy: Savings and Checking', level: 'Medium', tags: ['inheritance', 'super', 'polymorphism', 'template method'], companies: ['JPMorgan', 'Goldman Sachs', 'PayPal'],
    statement: `<p>Build <code>Account(owner, balance)</code> with <code>deposit</code> and <code>withdraw</code>. Subclasses: <code>SavingsAccount</code> must keep a minimum balance of 500 and has <code>add_interest(rate)</code>; <code>CheckingAccount(owner, balance, overdraft=1000)</code> may go negative down to <code>-overdraft</code>. A failed withdrawal raises <code>ValueError</code> and changes nothing. Then process a list of <code>(account, 'withdraw' | 'deposit', amount)</code> transactions and report which ones failed — without any <code>isinstance</code> checks.</p>`,
    constraints: `Amounts are positive integers ≤ 10<sup>7</sup>; up to 10<sup>5</sup> transactions.`,
    example: `<p>Savings(1000).withdraw(600) → ${H.c('r', 'fails')} (would leave 400 &lt; 500). Checking(100).withdraw(900) → ${H.c('g', 'ok')}, balance −800. Checking(-800).withdraw(300) → ${H.c('r', 'fails')} (−1100 is beyond the 1000 overdraft).</p>`,
    brute: { why: `<p>One <code>Account</code> class with a <code>kind</code> string and an if/elif in <code>withdraw</code> for every account type. Adding a "student account" means editing the core class — fragile and untestable in isolation. Or: each subclass copy-pastes the whole <code>withdraw</code>, duplicating the "subtract and log" part.</p>`, code: `class AccountLadder:
    def __init__(self, kind, balance):
        self.kind, self.balance = kind, balance

    def withdraw(self, amt):
        if self.kind == 'savings' and self.balance - amt < 500:
            raise ValueError('min balance')
        elif self.kind == 'checking' and self.balance - amt < -1000:
            raise ValueError('overdraft')
        self.balance -= amt

a = AccountLadder('savings', 1000)
a.withdraw(100)
print(a.balance)` },
    mcq: { q: 'What is the cleanest single thing for subclasses to override?', options: ['A small hook like <code>_floor()</code> (lowest allowed balance) used by the base <code>withdraw</code>', 'The entire <code>withdraw</code> method in each subclass', '<code>__init__</code> only', 'Nothing — use isinstance in withdraw'], answer: 0, explain: 'Template method: the base class owns the algorithm (validate → subtract → log); subclasses only supply the rule that differs.' },
    hints: [`<p>What actually differs between account types? Only the <b>lowest allowed balance</b> after a withdrawal.</p>`, `<p>Base <code>withdraw</code>: <code>if self.balance - amount &lt; self._floor(): raise ValueError(...)</code>. Base <code>_floor</code> returns 0; Savings returns <code>self.MIN_BALANCE</code>; Checking returns <code>-self.overdraft</code>.</p>`, `<p>Checking needs an extra constructor argument → <code>super().__init__(owner, balance)</code> then <code>self.overdraft = overdraft</code>. Process transactions with <code>getattr(acct, kind)(amount)</code> inside try/except ValueError.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            's = SavingsAccount(\'A\', 1000)\n' +
              'result = exc = None\n' +
              'try:\n' +
              '    s.withdraw(600)\n' +
              '    result = \'ok\'\n' +
              'except ValueError:\n' +
              '    result = \'fail\''
          ],
          'fail'
        ],
        [
          [
            's = SavingsAccount(\'A\', 1000)\n' +
              'try:\n' +
              '    s.withdraw(600)\n' +
              'except ValueError:\n' +
              '    pass\n' +
              'result = s.balance'
          ],
          1000
        ],
        [
          [
            'try:\n' +
              '    c = CheckingAccount(\'B\', 100)\n' +
              '    c.withdraw(900)\n' +
              '    result = \'ok\'\n' +
              'except ValueError:\n' +
              '    result = \'fail\'\n' +
              'result = [result, c.balance]'
          ],
          ['ok', -800]
        ],
        [
          [
            'try:\n' +
              '    c = CheckingAccount(\'B\', -800)\n' +
              '    c.withdraw(300)\n' +
              '    result = \'ok\'\n' +
              'except ValueError:\n' +
              '    result = \'fail\''
          ],
          'fail'
        ],
        [
          [
            's = SavingsAccount(\'A\', 1000)\n' +
              'c = CheckingAccount(\'B\', 100)\n' +
              'txs = [(s, \'withdraw\', 600), (c, \'withdraw\', 900), (c, \'withdraw\', 300), (s, \'deposit\', 50)]\n' +
              'f = process(txs)\n' +
              'result = [[i for i, _ in f], s.balance, c.balance]'
          ],
          [[0, 2], 1050, -800]
        ],
        [
          [
            's = SavingsAccount(\'A\', 1000)\n' +
              's.add_interest(0.05)\n' +
              'result = s.balance'
          ],
          1050
        ],
        [
          [
            's = SavingsAccount(\'A\', 1050)\n' +
              's.add_interest(0.05)\n' +
              'result = s.balance'
          ],
          1102.5
        ],
        [
          [
            'try:\n' +
              '    s = SavingsAccount(\'A\', 1000)\n' +
              '    s.withdraw(500)\n' +
              '    result = \'ok\'\n' +
              'except ValueError:\n' +
              '    result = \'fail\'\n' +
              'result = [result, s.balance]'
          ],
          ['ok', 500]
        ],
        [
          [
            'try:\n' +
              '    s = SavingsAccount(\'A\', 1000)\n' +
              '    s.withdraw(501)\n' +
              '    result = \'ok\'\n' +
              'except ValueError:\n' +
              '    result = \'fail\''
          ],
          'fail'
        ],
        [
          [
            'try:\n' +
              '    c = CheckingAccount(\'B\', 0)\n' +
              '    c.withdraw(1000)\n' +
              '    result = \'ok\'\n' +
              'except ValueError:\n' +
              '    result = \'fail\'\n' +
              'result = [result, c.balance]'
          ],
          ['ok', -1000]
        ],
        [
          [
            'try:\n' +
              '    c = CheckingAccount(\'B\', 0)\n' +
              '    c.withdraw(1001)\n' +
              '    result = \'ok\'\n' +
              'except ValueError:\n' +
              '    result = \'fail\''
          ],
          'fail'
        ],
        [
          [
            'try:\n' +
              '    c = CheckingAccount(\'B\', 0, 50)\n' +
              '    c.withdraw(51)\n' +
              '    result = \'ok\'\n' +
              'except ValueError:\n' +
              '    result = \'fail\''
          ],
          'fail'
        ],
        [
          [
            'try:\n' +
              '    c = CheckingAccount(\'B\', 0, 50)\n' +
              '    c.withdraw(50)\n' +
              '    result = \'ok\'\n' +
              'except ValueError:\n' +
              '    result = \'fail\'\n' +
              'result = [result, c.balance]'
          ],
          ['ok', -50]
        ],
        [
          [
            'try:\n' +
              '    a = Account(\'x\', 10)\n' +
              '    a.withdraw(11)\n' +
              '    result = \'ok\'\n' +
              'except ValueError:\n' +
              '    result = \'fail\''
          ],
          'fail'
        ],
        [
          [
            'try:\n' +
              '    a = Account(\'x\', 10)\n' +
              '    a.withdraw(10)\n' +
              '    result = \'ok\'\n' +
              'except ValueError:\n' +
              '    result = \'fail\'\n' +
              'result = [result, a.balance]'
          ],
          ['ok', 0]
        ],
        [
          [
            'try:\n' +
              '    Account(\'x\', 10).withdraw(0)\n' +
              '    result = \'ok\'\n' +
              'except ValueError:\n' +
              '    result = \'fail\''
          ],
          'fail'
        ],
        [
          [
            'try:\n' +
              '    Account(\'x\', 10).deposit(-5)\n' +
              '    result = \'ok\'\n' +
              'except ValueError:\n' +
              '    result = \'fail\''
          ],
          'fail'
        ],
        [
          [
            'try:\n' +
              '    Account(\'x\', 10).deposit(0)\n' +
              '    result = \'ok\'\n' +
              'except ValueError:\n' +
              '    result = \'fail\''
          ],
          'fail'
        ],
        [['a = Account(\'x\')\na.deposit(5)\nresult = a.balance'], 5],
        [
          [
            'a = Account(\'x\', 0)\n' +
              'txs = [(a, \'deposit\', 1)] * 100000 + [(a, \'withdraw\', 2)] * 50000\n' +
              'f = process(txs)\n' +
              'result = [len(f), a.balance, 0]'
          ],
          [0, 0, 0]
        ],
        [
          [
            'c = CheckingAccount(\'B\', 0)\n' +
              'result = [isinstance(c, Account), c.overdraft]'
          ],
          [true, 1000]
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>Template method + polymorphic hook. The base class implements <code>withdraw</code> once and asks <code>self._floor()</code> for the limit; dynamic dispatch picks each subclass's rule. The processor treats every account the same way.</p>`,
      code: { lang: 'python', run: true, code: `class Account:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance

    def _floor(self):                     # hook: lowest allowed balance
        return 0

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError('deposit must be positive')
        self.balance += amount

    def withdraw(self, amount):
        if amount <= 0:
            raise ValueError('withdrawal must be positive')
        if self.balance - amount < self._floor():
            raise ValueError(f'{type(self).__name__}: limit {self._floor()} reached')
        self.balance -= amount


class SavingsAccount(Account):
    MIN_BALANCE = 500

    def _floor(self):
        return self.MIN_BALANCE

    def add_interest(self, rate):
        self.balance = round(self.balance * (1 + rate), 2)


class CheckingAccount(Account):
    def __init__(self, owner, balance=0, overdraft=1000):
        super().__init__(owner, balance)
        self.overdraft = overdraft

    def _floor(self):
        return -self.overdraft


def process(transactions):
    failed = []
    for i, (acct, kind, amount) in enumerate(transactions):
        try:
            getattr(acct, kind)(amount)          # polymorphic call
        except ValueError as e:
            failed.append((i, str(e)))
    return failed

s = SavingsAccount('Asha', 1000)
c = CheckingAccount('Ben', 100)
txs = [(s, 'withdraw', 600), (c, 'withdraw', 900), (c, 'withdraw', 300), (s, 'deposit', 50)]
print(process(txs))
print(s.balance, c.balance)       # 1050 -800
s.add_interest(0.05)
print(s.balance)                  # 1102.5` },
      dry: { head: ['#', 'transaction', '_floor()', 'result', 'balance'], rows: [['0', 'savings withdraw 600', '500', '<span class="c-r">fail</span> (400 &lt; 500)', '1000'], ['1', 'checking withdraw 900', '-1000', 'ok', '-800'], ['2', 'checking withdraw 300', '-1000', '<span class="c-r">fail</span> (-1100)', '-800'], ['3', 'savings deposit 50', '—', 'ok', '1050']] },
      complexity: `<p>O(1) per transaction, O(n) for the batch; O(failures) extra space.</p>`,
      followUps: ['Use <code>decimal.Decimal</code> instead of floats for money — why?', 'Add a monthly fee for checking accounts without touching <code>Account</code>.', 'Make transfers atomic across two accounts.']
    }
  });

  practice.push({
    title: 'Inventory with Alternate Constructors', level: 'Medium', tags: ['classmethod', 'staticmethod', 'composition'], companies: ['Flipkart', 'Shopify', 'Walmart'],
    statement: `<p>Write <code>Product(sku, name, price, qty)</code> with a static validator <code>Product.valid_sku(s)</code> (format: 3 uppercase letters, a dash, 4 digits, e.g. <code>ABC-1234</code>) and a class-method constructor <code>Product.from_csv(line)</code> parsing <code>'ABC-1234,Pen,12.5,40'</code>. Then write <code>Inventory</code> (composition: it <b>has</b> products) with <code>add(product)</code>, <code>remove(sku, n)</code>, <code>total_value()</code> and <code>low_stock(threshold)</code> returning SKUs sorted alphabetically.</p>`,
    constraints: `Up to 10<sup>5</sup> products; prices ≥ 0; quantities ≥ 0 integers.`,
    example: `<p>Load <code>'ABC-1234,Pen,12.5,40'</code> and <code>'XYZ-0001,Book,300,2'</code> → total value ${H.c('g', '12.5×40 + 300×2 = 1100.0')}; <code>low_stock(5)</code> → ${H.c('g', "['XYZ-0001']")}. <code>'bad,Pen,1,1'</code> → ${H.c('r', 'ValueError')} from the static validator.</p>`,
    brute: { why: `<p>Keep products as raw dicts parsed inline wherever needed and validate SKUs with ad-hoc string checks in several places. Parsing rules end up duplicated and inconsistent; a subclass (e.g. <code>PerishableProduct</code>) can't reuse the parser.</p>`, code: `rows = ['ABC-1234,Pen,12.5,40', 'XYZ-0001,Book,300,2']
products = []
for r in rows:
    sku, name, price, qty = r.split(',')
    products.append({'sku': sku, 'name': name, 'price': float(price), 'qty': int(qty)})
print(sum(p['price'] * p['qty'] for p in products))` },
    mcq: { q: 'Which decorator fits <code>valid_sku</code>, which needs neither an object nor the class?', options: ['<code>@staticmethod</code>', '<code>@classmethod</code>', 'No decorator (instance method)', '<code>@property</code>'], answer: 0, explain: 'It is a pure function of its argument that belongs with Product conceptually — a static method. <code>from_csv</code> builds objects, so it is a class method returning <code>cls(...)</code>.' },
    hints: [`<p>Put all validation in <code>__init__</code> (calling the static validator) so every constructor path is checked.</p>`, `<p><code>from_csv</code>: split on commas, convert types, then <code>return cls(sku, name, float(price), int(qty))</code>.</p>`, `<p>Inventory stores <code>self.items = {}</code> keyed by SKU. <code>low_stock</code>: <code>sorted(s for s, p in self.items.items() if p.qty &lt; threshold)</code>. Use <code>re.fullmatch(r'[A-Z]{3}-[0-9]{4}', s)</code>.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'inv = Inventory()\n' +
              'for line in [\'ABC-1234,Pen,12.5,40\', \'XYZ-0001,Book,300,2\']:\n' +
              '    inv.add(Product.from_csv(line))\n' +
              'result = [inv.total_value(), inv.low_stock(5)]'
          ],
          [1100, ['XYZ-0001']]
        ],
        [
          [
            'inv = Inventory()\n' +
              'for line in [\'ABC-1234,Pen,12.5,40\', \'XYZ-0001,Book,300,2\']:\n' +
              '    inv.add(Product.from_csv(line))\n' +
              'inv.remove(\'ABC-1234\', 38)\n' +
              'result = inv.low_stock(5)'
          ],
          ['ABC-1234', 'XYZ-0001']
        ],
        [['result = Product.from_csv(\'bad,Pen,1,1\')'], '!ValueError'],
        [
          [
            'result = [Product.valid_sku(s) for s in [\'ABC-1234\', \'abc-1234\', \'ABC-123\', \'ABC-12345\', \'AB-1234\', \'\', \'ABC1234\', \'ABC-12a4\', \' ABC-1234\']]'
          ],
          [true, false, false, false, false, false, false, false, false]
        ],
        [
          [
            'p = Product.from_csv(\' ABC-1234 , Pen , 12.5 , 40 \')\n' +
              'result = [p.sku, p.name, p.price, p.qty]'
          ],
          ['ABC-1234', 'Pen', 12.5, 40]
        ],
        [['result = Product(\'ABC-1234\', \'x\', -1, 1)'], '!ValueError'],
        [['result = Product(\'ABC-1234\', \'x\', 1, -1)'], '!ValueError'],
        [
          [
            'inv = Inventory()\n' +
              'inv.add(Product(\'ABC-1234\', \'Pen\', 2, 5))\n' +
              'result = inv.remove(\'ABC-1234\', 6)'
          ],
          '!ValueError'
        ],
        [
          [
            'inv = Inventory()\n' +
              'inv.add(Product(\'ABC-1234\', \'Pen\', 2, 5))\n' +
              'inv.add(Product(\'ABC-1234\', \'Pen\', 2, 5))\n' +
              'result = [inv.total_value(), inv.items[\'ABC-1234\'].qty]'
          ],
          [20, 10]
        ],
        [
          [
            'inv = Inventory()\n' +
              'inv.add(Product(\'ABC-1234\', \'Pen\', 2, 5))\n' +
              'result = [inv.low_stock(5), inv.low_stock(6)]'
          ],
          [[], ['ABC-1234']]
        ],
        [['result = Inventory().total_value()'], 0],
        [
          [
            'inv = Inventory()\n' +
              'for s in [\'ZZZ-0001\', \'AAA-0002\', \'MMM-0003\']:\n' +
              '    inv.add(Product(s, \'n\', 1, 1))\n' +
              'result = inv.low_stock(10)'
          ],
          ['AAA-0002', 'MMM-0003', 'ZZZ-0001']
        ],
        [
          [
            'inv = Inventory()\n' +
              'for i in range(100000):\n' +
              '    inv.add(Product(chr(65 + i // 10000) + \'AA-\' + \'%04d\' % (i % 10000), \'n\', 2.0, 3))\n' +
              'result = [inv.total_value(), len(inv.low_stock(4)), inv.low_stock(4)[0], inv.low_stock(4)[-1]]'
          ],
          [600000, 100000, 'AAA-0000', 'JAA-9999']
        ],
        [
          [
            'inv = Inventory()\n' +
              'inv.add(Product(\'ABC-1234\', \'Pen\', 1.5, 2))\n' +
              'inv.remove(\'ABC-1234\', 2)\n' +
              'result = [inv.items[\'ABC-1234\'].qty, inv.total_value(), inv.low_stock(1)]'
          ],
          [0, 0, ['ABC-1234']]
        ],
        [
          [
            'p = Product.from_csv(\'ABC-0001,Cap,0,0\')\n' +
              'result = [p.price, p.qty, p.value()]'
          ],
          [0, 0, 0]
        ],
        [['result = type(Product.from_csv(\'ABC-0001,Cap,1,1\')).__name__'], 'Product']
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>Product = data + validation; one canonical <code>__init__</code>; a static validator and a class-method parser. Inventory composes products in a dict for O(1) lookup by SKU.</p>`,
      code: { lang: 'python', run: true, code: `import re

class Product:
    SKU_PATTERN = re.compile(r'[A-Z]{3}-[0-9]{4}')

    def __init__(self, sku, name, price, qty):
        if not Product.valid_sku(sku):
            raise ValueError(f'bad sku: {sku!r}')
        if price < 0 or qty < 0:
            raise ValueError('price and qty must be non-negative')
        self.sku, self.name, self.price, self.qty = sku, name, price, qty

    @staticmethod
    def valid_sku(s):
        return bool(Product.SKU_PATTERN.fullmatch(s))

    @classmethod
    def from_csv(cls, line):
        sku, name, price, qty = (part.strip() for part in line.split(','))
        return cls(sku, name, float(price), int(qty))

    def value(self):
        return self.price * self.qty


class Inventory:
    def __init__(self):
        self.items = {}                       # sku -> Product (has-a)

    def add(self, product):
        if product.sku in self.items:
            self.items[product.sku].qty += product.qty
        else:
            self.items[product.sku] = product

    def remove(self, sku, n):
        p = self.items[sku]
        if n > p.qty:
            raise ValueError('not enough stock')
        p.qty -= n

    def total_value(self):
        return sum(p.value() for p in self.items.values())

    def low_stock(self, threshold):
        return sorted(s for s, p in self.items.items() if p.qty < threshold)


inv = Inventory()
for line in ['ABC-1234,Pen,12.5,40', 'XYZ-0001,Book,300,2']:
    inv.add(Product.from_csv(line))
print(inv.total_value())          # 1100.0
print(inv.low_stock(5))           # ['XYZ-0001']
inv.remove('ABC-1234', 38)
print(inv.low_stock(5))           # ['ABC-1234', 'XYZ-0001']
try:
    Product.from_csv('bad,Pen,1,1')
except ValueError as e:
    print('ValueError:', e)` },
      dry: { head: ['step', 'items', 'total_value', 'low_stock(5)'], rows: [['add Pen×40', 'ABC-1234', '500.0', '[]'], ['add Book×2', 'ABC-1234, XYZ-0001', '1100.0', "['XYZ-0001']"], ['remove Pen 38', 'Pen qty 2', '625.0', "['ABC-1234', 'XYZ-0001']"]] },
      complexity: `<p>add/remove O(1); total_value O(n); low_stock O(n log n) for sorting the result.</p>`,
      followUps: ['Add <code>Product.from_dict</code> and make it reuse <code>from_csv</code>\'s validation.', 'Create <code>PerishableProduct</code> with an expiry date — does <code>from_csv</code> still work?', 'Use a <code>@dataclass</code> for Product and compare the code size.']
    }
  });

  /* ================= PRACTICE: Hard ================= */
  practice.push({
    title: 'Predict the Output: classmethod Counters and Overridden staticmethods', level: 'Hard', tags: ['predict output', 'classmethod', 'staticmethod', 'class attribute'], companies: ['Google', 'Jane Street'],
    statement: `<p>Predict the output exactly.</p>
<pre>class Shape:
    count = 0

    @classmethod
    def create(cls):
        cls.count += 1
        return cls()

    @staticmethod
    def kind():
        return 'shape'

    def describe(self):
        return f'{type(self).__name__}:{self.kind()}'

class Circle(Shape):
    @staticmethod
    def kind():
        return 'round'

Shape.create(); Circle.create(); Circle.create()
print(Shape.count, Circle.count)
Shape.count = 10
print(Circle.count)
print(Circle.create().describe(), Shape().describe())
print(Shape.count, Circle.count)</pre>`,
    constraints: `Pure reasoning.`,
    example: `<p>${H.c('g', '1 3')}<br>${H.c('g', '3')}<br>${H.c('g', 'Circle:round Shape:shape')}<br>${H.c('g', '10 4')}</p><p>The first <code>Circle.create()</code> reads the <b>inherited</b> <code>count</code> (1) and writes 2 onto <b>Circle</b> — from then on Circle has its own counter, disconnected from Shape's.</p>`,
    brute: { why: `<p>The naive model "there is one <code>count</code>" predicts <code>3 3</code>, then <code>10</code>, then <code>11 11</code>. It misses that <code>cls.count += 1</code> is read-from-wherever-found, write-onto-<code>cls</code>. Run it:</p>`, code: `class Shape:
    count = 0
    @classmethod
    def create(cls):
        cls.count += 1
        return cls()
    @staticmethod
    def kind():
        return 'shape'
    def describe(self):
        return f'{type(self).__name__}:{self.kind()}'

class Circle(Shape):
    @staticmethod
    def kind():
        return 'round'

Shape.create(); Circle.create(); Circle.create()
print(Shape.count, Circle.count)
Shape.count = 10
print(Circle.count)
print(Circle.create().describe(), Shape().describe())
print(Shape.count, Circle.count)` },
    mcq: { q: 'After the first <code>Circle.create()</code>, where does <code>count</code> live?', options: ['Both <code>Shape.__dict__</code> (1) and <code>Circle.__dict__</code> (2)', 'Only in Shape (2)', 'Only in Circle (2)', 'In the Circle instance'], answer: 0, explain: '<code>cls.count += 1</code> with <code>cls = Circle</code> reads Shape\'s 1 through inheritance, then assigns 2 to <code>Circle.count</code>, creating a new class attribute on the subclass.' },
    hints: [`<p>Augmented assignment on a class attribute behaves exactly like on an instance: read via lookup, write onto the object named on the left (<code>cls</code>).</p>`, `<p>Keep a table of <code>Shape.__dict__['count']</code> and <code>Circle.__dict__.get('count')</code> after every statement.</p>`, `<p><code>self.kind()</code> inside <code>describe</code> looks up <code>kind</code> starting at <code>type(self)</code>, so Circle's overridden static method is used for Circle objects.</p>`],
    tests: { io: true, cases: [{ stdin: '', stdout: '1 3\n3\nCircle:round Shape:shape\n10 4\nTrue' }] },
    solution: {
      approach: `<p>Track both class dicts. Shape.create → Shape.count 1. Circle.create → reads 1, writes Circle.count 2. Again → 3. Setting Shape.count = 10 doesn't touch Circle's own 3. Next Circle.create → 4. Static methods are looked up through the instance's class, so overriding works.</p>`,
      code: { lang: 'python', run: true, code: `class Shape:
    count = 0

    @classmethod
    def create(cls):
        cls.count += 1                 # read (maybe inherited), write onto cls
        return cls()

    @staticmethod
    def kind():
        return 'shape'

    def describe(self):
        return f'{type(self).__name__}:{self.kind()}'

class Circle(Shape):
    @staticmethod
    def kind():
        return 'round'

Shape.create(); Circle.create(); Circle.create()
print(Shape.count, Circle.count)                      # 1 3
Shape.count = 10
print(Circle.count)                                   # 3
print(Circle.create().describe(), Shape().describe()) # Circle:round Shape:shape
print(Shape.count, Circle.count)                      # 10 4
print('count' in Circle.__dict__)                     # True  (its own copy)` },
      dry: { head: ['statement', "Shape.__dict__['count']", "Circle.__dict__['count']"], rows: [['Shape.create()', '1', '—'], ['Circle.create()', '1', '2 (read 1 from Shape)'], ['Circle.create()', '1', '3'], ['Shape.count = 10', '10', '3'], ['Circle.create()', '10', '<span class="c-g">4</span>']] },
      complexity: `<p>Reasoning exercise; each access O(1).</p>`,
      followUps: ['Rewrite <code>create</code> so all subclasses share one total (<code>Shape.count += 1</code>).', 'Rewrite so each subclass has an independent counter starting at 0 even if the parent already counted (<code>__init_subclass__</code> setting <code>cls.count = 0</code>).']
    }
  });

  practice.push({
    title: 'Cooperative Mixins and super() in a Diamond', level: 'Hard', tags: ['multiple inheritance', 'MRO', 'super', 'mixins'], companies: ['Meta', 'Stripe', 'Instagram'],
    statement: `<p>A <code>Model</code> must run three save steps — validation, logging and caching — each written as a separate <b>mixin</b> class that inherits from <code>Base</code>. <code>Model(ValidateMixin, LogMixin, CacheMixin)</code> calling <code>save()</code> must run <b>every</b> mixin's step exactly once, in MRO order, and <code>Base.save</code> exactly once at the end. Return the list of steps executed. Also explain what goes wrong if a mixin calls its parent explicitly (<code>Base.save(self)</code>) instead of <code>super().save()</code>.</p>`,
    constraints: `Any number of mixins; each must work no matter which other mixins are combined with it.`,
    example: `<p><code>Model().save()</code> → ${H.c('g', "['validate', 'log', 'cache', 'base']")}; <code>Model.__mro__</code> → ${H.c('b', 'Model, ValidateMixin, LogMixin, CacheMixin, Base, object')}. Inside <code>LogMixin.save</code>, <code>super()</code> points to <b>CacheMixin</b> (a sibling, not LogMixin's parent!) because super follows the <b>object's</b> MRO.</p>`,
    brute: { why: `<p>Each mixin calls <code>Base.save(self)</code> directly and the model calls each mixin explicitly. Every explicit parent call re-runs Base, so <code>'base'</code> executes three times (and in real code, three database writes). It also hard-wires the order into the model.</p>`, code: `class Base:
    def save(self, log):
        log.append('base')

class LogMixin(Base):
    def save(self, log):
        log.append('log')
        Base.save(self, log)          # explicit parent call

class CacheMixin(Base):
    def save(self, log):
        log.append('cache')
        Base.save(self, log)

class Model(LogMixin, CacheMixin):
    def save(self, log):
        LogMixin.save(self, log)
        CacheMixin.save(self, log)

steps = []
Model().save(steps)
print(steps)        # ['log', 'base', 'cache', 'base'] - base twice!` },
    mcq: { q: 'In <code>class Model(ValidateMixin, LogMixin, CacheMixin)</code>, what does <code>super()</code> inside <code>LogMixin.save</code> resolve to when called on a Model?', options: ['<code>CacheMixin</code> — the next class in <code>Model.__mro__</code>', '<code>Base</code> — LogMixin\'s declared parent', '<code>ValidateMixin</code>', '<code>object</code>'], answer: 0, explain: 'super() uses <code>type(self).__mro__</code> and continues after the class it is written in. For a Model object that is CacheMixin.' },
    hints: [`<p>Every class in the chain must call <code>super().save(...)</code> — that is the "cooperative" contract. Only the final <code>Base</code> stops the chain.</p>`, `<p>C3 linearization for <code>Model(V, L, C)</code> with all three inheriting <code>Base</code>: Model, V, L, C, Base, object — children before parents, left-to-right order kept.</p>`, `<p>Pass shared state (the steps list, or <code>**kwargs</code> in <code>__init__</code>) through the chain so mixins don't need to know about each other.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [['result = Model().save()'], ['validate', 'log', 'cache', 'base']],
        [
          ['result = [c.__name__ for c in Model.__mro__]'],
          ['Model', 'ValidateMixin', 'LogMixin', 'CacheMixin', 'Base', 'object']
        ],
        [
          [
            'class CachedOnly(CacheMixin):\n' +
              '    pass\n' +
              'result = CachedOnly().save([])'
          ],
          ['cache', 'base']
        ],
        [
          [
            'class M2(CacheMixin, ValidateMixin):\n' +
              '    pass\n' +
              'result = M2().save([])'
          ],
          ['cache', 'validate', 'base']
        ],
        [['result = Base().save([])'], ['base']],
        [
          [
            'steps = Model().save()\n' +
              'result = [steps.count(\'base\'), steps.count(\'log\'), steps.count(\'validate\'), steps.count(\'cache\'), len(steps)]'
          ],
          [1, 1, 1, 1, 4]
        ],
        [['s = []\nresult = Model().save(s) is s'], true],
        [
          [
            'class M3(LogMixin, ValidateMixin, CacheMixin):\n' +
              '    pass\n' +
              'result = M3().save([])'
          ],
          ['log', 'validate', 'cache', 'base']
        ],
        [
          [
            'class Lone(LogMixin):\n' +
              '    pass\n' +
              'result = Lone().save([\'start\'])'
          ],
          ['start', 'log', 'base']
        ],
        [
          [
            'mixins = []\n' +
              'for i in range(50):\n' +
              '    k = type(\'M%d\' % i, (Base,), {})\n' +
              '    k.save = lambda self, steps, i=i, k=k: super(k, self).save(steps + [i])\n' +
              '    mixins.append(k)\n' +
              'Big = type(\'Big\', tuple(mixins), {})\n' +
              'result = Big().save([])'
          ],
          [
            0,
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            12,
            13,
            14,
            15,
            16,
            17,
            18,
            19,
            20,
            21,
            22,
            23,
            24,
            25,
            26,
            27,
            28,
            29,
            30,
            31,
            32,
            33,
            34,
            35,
            36,
            37,
            38,
            39,
            40,
            41,
            42,
            43,
            44,
            45,
            46,
            47,
            48,
            49,
            'base'
          ]
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>Cooperative multiple inheritance: each mixin does its step then delegates with <code>super().save(steps)</code>. Python's C3 MRO puts Base after all mixins, so each runs once. The same mixins work in any combination because none hard-codes who comes next.</p>`,
      code: { lang: 'python', run: true, code: `class Base:
    def save(self, steps):
        steps.append('base')          # end of the chain: no super() call
        return steps


class ValidateMixin(Base):
    def save(self, steps):
        steps.append('validate')
        return super().save(steps)


class LogMixin(Base):
    def save(self, steps):
        steps.append('log')
        return super().save(steps)    # next in the OBJECT's MRO


class CacheMixin(Base):
    def save(self, steps):
        steps.append('cache')
        return super().save(steps)


class Model(ValidateMixin, LogMixin, CacheMixin):
    def save(self, steps=None):
        return super().save([] if steps is None else steps)


print([c.__name__ for c in Model.__mro__])
print(Model().save())             # ['validate', 'log', 'cache', 'base']


class CachedOnly(CacheMixin):     # same mixin, different combination
    pass

print(CachedOnly().save([]))      # ['cache', 'base']` },
      dry: { head: ['running', 'super() resolves to', 'steps'], rows: [['Model.save', 'ValidateMixin', '[]'], ['ValidateMixin.save', 'LogMixin', "['validate']"], ['LogMixin.save', '<span class="c-b">CacheMixin (sibling!)</span>', "['validate', 'log']"], ['CacheMixin.save', 'Base', "['validate', 'log', 'cache']"], ['Base.save', '(stops)', "<span class=\"c-g\">[..., 'base']</span>"]] },
      complexity: `<p>O(k) calls for k classes in the MRO; MRO is computed once at class creation.</p>`,
      followUps: ['Do the same for <code>__init__</code> where each mixin takes its own keyword argument (<code>def __init__(self, *, ttl=60, **kw): super().__init__(**kw)</code>).', 'What error do you get with <code>class Bad(Base, LogMixin)</code> and why? (inconsistent MRO)', 'When are mixins better than composition, and when worse?']
    }
  });

  practice.push({
    title: 'Text Editor with Undo / Redo (Command Pattern)', level: 'Hard', tags: ['design', 'polymorphism', 'stack', 'command pattern'], companies: ['Microsoft', 'Adobe', 'Google', 'Notion'],
    statement: `<p>Design an <code>Editor</code> holding a text string with operations <code>insert(pos, s)</code>, <code>delete(pos, n)</code>, <code>undo()</code> and <code>redo()</code>. Each edit must be an object of a <b>command class</b> (<code>Insert</code>, <code>Delete</code>) with polymorphic <code>apply(text)</code> and <code>revert(text)</code> methods. A new edit clears the redo history. <code>undo</code>/<code>redo</code> with empty history do nothing and return the current text.</p>`,
    constraints: `Up to 10<sup>4</sup> operations; text length ≤ 10<sup>5</sup>; positions are valid.`,
    example: `<p>insert(0, 'hello') → 'hello'; insert(5, ' world') → 'hello world'; delete(0, 6) → 'world'; undo → ${H.c('g', "'hello world'")}; undo → ${H.c('g', "'hello'")}; redo → ${H.c('g', "'hello world'")}; insert(0, '>> ') → '>> hello world' and the redo stack is cleared, so redo → ${H.c('b', "'>> hello world'")} (no change).</p>`,
    brute: { why: `<p>Snapshot the <b>entire text</b> before every operation and push it on an undo stack. Simple and correct, but memory is O(ops × text length) — 10<sup>4</sup> edits on a 10<sup>5</sup>-char document is up to 10<sup>9</sup> characters stored.</p>`, code: `class SnapshotEditor:
    def __init__(self):
        self.text = ''
        self.undo_stack, self.redo_stack = [], []

    def _edit(self, new_text):
        self.undo_stack.append(self.text)     # full copy every time
        self.redo_stack.clear()
        self.text = new_text

    def insert(self, pos, s):
        self._edit(self.text[:pos] + s + self.text[pos:])

    def undo(self):
        if self.undo_stack:
            self.redo_stack.append(self.text)
            self.text = self.undo_stack.pop()
        return self.text

e = SnapshotEditor(); e.insert(0, 'hi'); e.insert(2, '!')
print(e.undo())` },
    mcq: { q: 'What must a <code>Delete</code> command remember so it can be reverted?', options: ['The position and the exact text it removed', 'Only the number of characters', 'A full copy of the document', 'Nothing'], answer: 0, explain: 'Revert re-inserts the removed characters at the same position, so the command captures them during <code>apply</code>.' },
    hints: [`<p>Each command class stores just enough to undo itself: Insert(pos, s); Delete(pos, n) plus the removed text captured when applied.</p>`, `<p>The editor keeps two stacks of command objects. Edit: <code>text = cmd.apply(text)</code>, push to undo, clear redo. Undo: pop, <code>text = cmd.revert(text)</code>, push to redo. Redo: pop from redo and apply again.</p>`, `<p>The editor never checks command types — it just calls <code>apply</code>/<code>revert</code> (polymorphism), so adding a <code>Replace</code> command needs no editor changes.</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            'e = Editor()\n' +
              'e.insert(0, \'hello\'); e.insert(5, \' world\')\n' +
              'r = [e.delete(0, 6), e.undo(), e.undo(), e.redo(), e.insert(0, \'>> \'), e.redo()]\n' +
              'result = r'
          ],
          ['world', 'hello world', 'hello', 'hello world', '>> hello world', '>> hello world']
        ],
        [['e = Editor()\nresult = [e.undo(), e.redo(), e.text]'], ['', '', '']],
        [
          [
            'e = Editor()\n' +
              'e.insert(0, \'ac\')\n' +
              'result = [e.insert(1, \'b\'), e.undo(), e.redo()]'
          ],
          ['abc', 'ac', 'abc']
        ],
        [
          [
            'e = Editor()\n' +
              'e.insert(0, \'abcdef\')\n' +
              'result = [e.delete(1, 3), e.undo(), e.redo(), e.undo()]'
          ],
          ['aef', 'abcdef', 'aef', 'abcdef']
        ],
        [
          [
            'e = Editor()\n' +
              'e.insert(0, \'x\')\n' +
              'e.undo()\n' +
              'result = [e.undo(), e.undo(), e.redo(), e.redo(), e.redo()]'
          ],
          ['', '', 'x', 'x', 'x']
        ],
        [
          [
            'e = Editor()\n' +
              'e.insert(0, \'a\'); e.insert(1, \'b\'); e.undo(); e.insert(1, \'c\')\n' +
              'result = [e.text, e.redo(), e.undo(), e.undo(), e.undo()]'
          ],
          ['ac', 'ac', 'a', '', '']
        ],
        [
          [
            'e = Editor()\n' +
              'e.insert(0, \'x\' * 100000)\n' +
              'e.delete(50000, 10)\n' +
              'r = [len(e.text), len(e.undo()), len(e.redo())]\n' +
              'result = r'
          ],
          [99990, 100000, 99990]
        ],
        [
          [
            'e = Editor()\n' +
              'for i in range(10000):\n' +
              '    e.insert(len(e.text), \'a\')\n' +
              'r = [len(e.text)]\n' +
              'for i in range(10000):\n' +
              '    e.undo()\n' +
              'result = r + [e.text, len(e.redo())]'
          ],
          [10000, '', 1]
        ],
        [
          [
            'result = [Insert(0, \'ab\').apply(\'xy\'), Insert(0, \'ab\').revert(\'abxy\'), Insert(1, \'Q\').apply(\'ab\')]'
          ],
          ['abxy', 'xy', 'aQb']
        ],
        [
          [
            'd = Delete(1, 2)\n' +
              'after = d.apply(\'abcd\')\n' +
              'result = [after, d.revert(after)]'
          ],
          ['ad', 'abcd']
        ],
        [['result = [issubclass(Insert, Command), issubclass(Delete, Command)]'], [true, true]],
        [
          [
            'e = Editor()\n' +
              'e.insert(0, \'ab\')\n' +
              'e.delete(0, 1)\n' +
              'e.delete(0, 1)\n' +
              'result = [e.text, e.undo(), e.undo(), e.undo(), e.undo()]'
          ],
          ['', 'b', 'ab', '', '']
        ],
        [
          [
            'a, b = Editor(), Editor()\n' +
              'a.insert(0, \'z\')\n' +
              'result = [a.text, b.text]'
          ],
          ['z', '']
        ]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>Command pattern: each edit is an object with <code>apply</code> and <code>revert</code>. Memory per edit is proportional to the edited text only, not the whole document. Polymorphism keeps the editor closed for modification but open for new command types.</p>`,
      code: { lang: 'python', run: true, code: `class Command:
    def apply(self, text):
        raise NotImplementedError

    def revert(self, text):
        raise NotImplementedError


class Insert(Command):
    def __init__(self, pos, s):
        self.pos, self.s = pos, s

    def apply(self, text):
        return text[:self.pos] + self.s + text[self.pos:]

    def revert(self, text):
        return text[:self.pos] + text[self.pos + len(self.s):]


class Delete(Command):
    def __init__(self, pos, n):
        self.pos, self.n = pos, n
        self.removed = ''

    def apply(self, text):
        self.removed = text[self.pos:self.pos + self.n]     # remember for undo
        return text[:self.pos] + text[self.pos + self.n:]

    def revert(self, text):
        return text[:self.pos] + self.removed + text[self.pos:]


class Editor:
    def __init__(self):
        self.text = ''
        self._undo, self._redo = [], []

    def _run(self, cmd):
        self.text = cmd.apply(self.text)
        self._undo.append(cmd)
        self._redo.clear()                 # new edit kills redo history
        return self.text

    def insert(self, pos, s):
        return self._run(Insert(pos, s))

    def delete(self, pos, n):
        return self._run(Delete(pos, n))

    def undo(self):
        if self._undo:
            cmd = self._undo.pop()
            self.text = cmd.revert(self.text)
            self._redo.append(cmd)
        return self.text

    def redo(self):
        if self._redo:
            cmd = self._redo.pop()
            self.text = cmd.apply(self.text)
            self._undo.append(cmd)
        return self.text


e = Editor()
e.insert(0, 'hello'); e.insert(5, ' world')
print(e.delete(0, 6))            # world
print(e.undo())                  # hello world
print(e.undo())                  # hello
print(e.redo())                  # hello world
print(e.insert(0, '>> '))        # >> hello world
print(e.redo())                  # >> hello world  (redo cleared)` },
      dry: { head: ['op', 'text', 'undo stack', 'redo stack'], rows: [['insert 0 hello', 'hello', '[Ins]', '[]'], ['insert 5 " world"', 'hello world', '[Ins, Ins]', '[]'], ['delete 0 6', 'world', '[Ins, Ins, Del]', '[]'], ['undo', 'hello world', '[Ins, Ins]', '[Del]'], ['undo', 'hello', '[Ins]', '[Del, Ins]'], ['redo', 'hello world', '[Ins, Ins]', '[Del]'], ['insert 0 "&gt;&gt; "', '&gt;&gt; hello world', '[Ins, Ins, Ins]', '<span class="c-r">[] cleared</span>']] },
      complexity: `<p>Each command O(L) for string slicing (L = text length; a rope or gap buffer makes it O(log L)); memory O(total edited characters) instead of O(ops × L).</p>`,
      followUps: ['Merge consecutive single-character inserts into one command (how real editors group typing).', 'Add a <code>Replace</code> command — prove the Editor needs no change.', 'Limit undo history to the last 100 commands with <code>deque(maxlen=100)</code>.']
    }
  });

  practice.push({
    title: 'Expression Tree with Polymorphic Nodes (LeetCode 1628)', level: 'Hard', tags: ['polymorphism', 'tree', 'stack', 'classmethod'], companies: ['Amazon', 'Google', 'Microsoft'],
    statement: `<p>Given a <b>postfix</b> token list like <code>['3', '4', '+', '2', '*', '7', '/']</code>, build an expression tree and evaluate it. Design it with polymorphism: an abstract <code>Node</code> with <code>evaluate()</code> and <code>to_infix()</code>; a <code>Num</code> leaf; and one subclass per operator (<code>Add</code>, <code>Sub</code>, <code>Mul</code>, <code>Div</code>) — <b>no if/elif on the operator inside evaluate</b>. Provide a class-method factory <code>Node.from_postfix(tokens)</code>. Division truncates toward zero.</p>`,
    constraints: `1 ≤ tokens ≤ 10<sup>4</sup>; valid postfix; no division by zero; intermediate values fit in 64-bit integers.`,
    example: `<p><code>['3', '4', '+', '2', '*', '7', '/']</code> → infix ${H.c('b', '(((3 + 4) * 2) / 7)')} → value ${H.c('g', '2')} because (3+4)·2 = 14 and 14 / 7 = 2.</p>`,
    brute: { why: `<p>Evaluate the postfix directly with a stack and a big if/elif on the operator. Fine for a one-off value, but the interview follow-up ("add a modulo operator without touching evaluate", "also print the infix form") forces edits to the same function every time.</p>`, code: `def eval_postfix(tokens):
    st = []
    for t in tokens:
        if t in '+-*/':
            b, a = st.pop(), st.pop()
            if t == '+': st.append(a + b)
            elif t == '-': st.append(a - b)
            elif t == '*': st.append(a * b)
            else: st.append(int(a / b))
        else:
            st.append(int(t))
    return st[0]

print(eval_postfix(['3', '4', '+', '2', '*', '7', '/']))` },
    mcq: { q: 'How does the factory choose which operator class to build without an if/elif ladder?', options: ['A class-level dict mapping symbol → subclass, e.g. <code>{\'+\': Add}</code>', 'isinstance checks on the token', 'eval() on the token', 'One generic class with a symbol attribute and if/elif in evaluate'], answer: 0, explain: 'Classes are objects, so they can be stored in a dict. Looking up <code>OPS[token]</code> and calling it constructs the right node.' },
    hints: [`<p>Leaf: <code>Num.evaluate()</code> returns its value. Binary node base class stores <code>left</code>/<code>right</code>; each subclass defines only <code>symbol</code> and a tiny <code>combine(a, b)</code>.</p>`, `<p>Put <code>evaluate()</code> once in the binary base: <code>return self.combine(self.left.evaluate(), self.right.evaluate())</code> — recursion + dynamic dispatch.</p>`, `<p>Factory: scan tokens with a stack; on an operator pop right then left and push <code>OPS[tok](left, right)</code>; on a number push <code>Num(int(tok))</code>. Truncate division with <code>int(a / b)</code> (or a sign-safe integer version for huge numbers).</p>`],
    tests: {
      sig: 'string -> string',
      fn: 't_run',
      cases: [
        [
          [
            't = Node.from_postfix([\'3\', \'4\', \'+\', \'2\', \'*\', \'7\', \'/\'])\n' +
              'result = [t.to_infix(), t.evaluate()]'
          ],
          ['(((3 + 4) * 2) / 7)', 2]
        ],
        [['result = Node.from_postfix([\'7\', \'-2\', \'/\']).evaluate()'], -3],
        [['result = Node.from_postfix([\'-7\', \'2\', \'/\']).evaluate()'], -3],
        [['result = Node.from_postfix([\'7\', \'2\', \'/\']).evaluate()'], 3],
        [['result = Node.from_postfix([\'-8\', \'-2\', \'/\']).evaluate()'], 4],
        [
          [
            't = Node.from_postfix([\'5\'])\n' +
              'result = [t.to_infix(), t.evaluate()]'
          ],
          ['5', 5]
        ],
        [
          [
            't = Node.from_postfix([\'2\', \'3\', \'+\', \'4\', \'*\'])\n' +
              'result = [t.to_infix(), t.evaluate()]'
          ],
          ['((2 + 3) * 4)', 20]
        ],
        [['result = Node.from_postfix([\'3\', \'5\', \'-\']).evaluate()'], -2],
        [['result = Node.from_postfix([\'0\', \'5\', \'-\']).to_infix()'], '(0 - 5)'],
        [
          ['result = Node.from_postfix([\'9223372036854775807\', \'2\', \'/\']).evaluate()'],
          '4611686018427387903'
        ],
        [['result = Node.from_postfix([\'1\', \'2\'])'], '!ValueError'],
        [['result = Node.from_postfix([\'1\', \'+\'])'], '!IndexError'],
        [['result = Node()'], '!TypeError'],
        [['result = isinstance(Node.from_postfix([\'1\', \'2\', \'*\']), Node)'], true],
        [['result = Node.from_postfix([\'1\'] + [\'1\', \'+\'] * 4999).evaluate()'], 5000],
        [['result = Node.from_postfix([\'1\'] * 5000 + [\'+\'] * 4999).evaluate()'], 5000],
        [['result = len(Node.from_postfix([\'1\'] + [\'1\', \'+\'] * 4999).to_infix())'], 29995],
        [['result = Node.from_postfix([\'-3\', \'4\', \'*\', \'5\', \'-\']).evaluate()'], -17],
        [['result = Node.from_postfix([\'10\', \'3\', \'/\', \'3\', \'*\']).evaluate()'], 9]
      ],
      harness: {
        python: 'def t_run(src):\n' +
          '    ns = dict(globals())\n' +
          '    try:\n' +
          '        exec(src, ns)\n' +
          '        return ns[\'result\']\n' +
          '    except Exception as e:\n' +
          '        return \'!\' + type(e).__name__'
      }
    },
    solution: {
      approach: `<p>Composite + polymorphism. <code>BinOp</code> implements the shared recursion; subclasses only provide <code>symbol</code> and <code>combine</code>. A class-level registry maps symbols to classes so the <code>@classmethod</code> factory stays closed to modification — adding <code>Mod</code> is one new class plus a registry line.</p>`,
      code: { lang: 'python', run: true, code: `import sys
from abc import ABC, abstractmethod

# a left-deep tree built from 10**4 tokens is ~5000 levels deep
sys.setrecursionlimit(max(sys.getrecursionlimit(), 20000))


class Node(ABC):
    @abstractmethod
    def evaluate(self):
        """Return the integer value of this subtree."""

    @abstractmethod
    def to_infix(self):
        """Return a fully parenthesised string."""

    @classmethod
    def from_postfix(cls, tokens):
        stack = []
        for tok in tokens:
            if tok in BinOp.OPS:
                right, left = stack.pop(), stack.pop()
                stack.append(BinOp.OPS[tok](left, right))
            else:
                stack.append(Num(int(tok)))
        if len(stack) != 1:
            raise ValueError('invalid postfix expression')
        return stack[0]


class Num(Node):
    def __init__(self, value):
        self.value = value

    def evaluate(self):
        return self.value

    def to_infix(self):
        return str(self.value)


class BinOp(Node):
    OPS = {}                     # symbol -> subclass (filled below)
    symbol = '?'

    def __init__(self, left, right):
        self.left, self.right = left, right

    def evaluate(self):          # written once for every operator
        return self.combine(self.left.evaluate(), self.right.evaluate())

    def to_infix(self):
        return f'({self.left.to_infix()} {self.symbol} {self.right.to_infix()})'

    def combine(self, a, b):
        raise NotImplementedError


class Add(BinOp):
    symbol = '+'
    def combine(self, a, b): return a + b

class Sub(BinOp):
    symbol = '-'
    def combine(self, a, b): return a - b

class Mul(BinOp):
    symbol = '*'
    def combine(self, a, b): return a * b

class Div(BinOp):
    symbol = '/'
    def combine(self, a, b):
        q = abs(a) // abs(b)                 # exact integer math
        return q if (a >= 0) == (b >= 0) else -q   # truncate toward zero

for op_cls in (Add, Sub, Mul, Div):
    BinOp.OPS[op_cls.symbol] = op_cls


tree = Node.from_postfix(['3', '4', '+', '2', '*', '7', '/'])
print(tree.to_infix())            # (((3 + 4) * 2) / 7)
print(tree.evaluate())            # 2
print(Node.from_postfix(['7', '-2', '/']).evaluate())   # -3  (toward zero)` },
      dry: { head: ['token', 'action', 'stack (infix view)'], rows: [['3', 'push Num', '[3]'], ['4', 'push Num', '[3, 4]'], ['+', 'Add(3, 4)', '[(3 + 4)]'], ['2', 'push Num', '[(3 + 4), 2]'], ['*', 'Mul', '[((3 + 4) * 2)]'], ['7', 'push Num', '[((3 + 4) * 2), 7]'], ['/', 'Div → evaluate 14 / 7', '<span class="c-g">2</span>']] },
      complexity: `<p>Building O(n); evaluate and to_infix O(n) time, O(h) recursion depth (h = tree height; very deep trees may need an iterative evaluator or a higher recursion limit).</p>`,
      followUps: ['Add a <code>Pow</code> operator — what code changes?', 'Use <code>__init_subclass__</code> so operator classes register themselves automatically.', 'Simplify the tree (constant folding, <code>x * 1 → x</code>) with another polymorphic method.']
    }
  });

  /* ================= QUIZ ================= */
  quiz.push(
    { q: 'What does Python actually execute for <code>acct.deposit(50)</code>?', options: ['<code>BankAccount.deposit(acct, 50)</code>', '<code>deposit(50)</code>', '<code>BankAccount.deposit(50)</code>', '<code>acct.__init__(50)</code>'], answer: 0, explain: 'The instance is passed automatically as the first argument, which the method names <code>self</code>.' },
    { q: 'What is the job of <code>__init__</code>?', options: ['Initialise an object that already exists', 'Allocate memory for the object', 'Return the new object', 'Delete the object'], answer: 0, explain: '<code>__new__</code> creates the object; <code>__init__</code> fills in its attributes and must return <code>None</code>.' },
    { q: '<code>class A: x = []</code>. After <code>a1, a2 = A(), A()</code> and <code>a1.x.append(1)</code>, what is <code>a2.x</code>?', options: ['<code>[1]</code>', '<code>[]</code>', 'AttributeError', '<code>None</code>'], answer: 0, explain: 'There is one list on the class; <code>append</code> mutates it and every instance sees the change.' },
    { q: '<code>class A: n = 0</code>. Inside a method, <code>self.n += 1</code> runs once on object <code>a</code>. What are <code>A.n</code> and <code>a.n</code>?', options: ['0 and 1', '1 and 1', '1 and 0', '0 and 0'], answer: 0, explain: 'It reads the class value 0, then writes 1 into <code>a.__dict__</code>. The class attribute is untouched.' },
    { q: 'A child class overrides <code>__init__</code> but never calls <code>super().__init__()</code>. What happens?', options: ['Attributes set by the parent\'s <code>__init__</code> never exist on the object', 'Python calls the parent automatically', 'A SyntaxError', 'The child cannot be instantiated'], answer: 0, explain: 'Python does not chain constructors automatically. Missing parent attributes surface later as <code>AttributeError</code>.' },
    { q: 'In <code>class Puppy(Dog)</code>, <code>Animal.describe</code> calls <code>self.speak()</code>. For a Puppy object, where does the lookup of <code>speak</code> start?', options: ['Puppy', 'Animal', 'Dog', 'object'], answer: 0, explain: 'Lookup always starts at <code>type(self)</code> — dynamic dispatch — even when the calling method was defined in a parent.' },
    { q: 'What does a <code>@classmethod</code> receive as its first argument when called as <code>EuroDate.from_string(...)</code> and the method is defined in parent <code>Date</code>?', options: ['<code>EuroDate</code>', '<code>Date</code>', 'Nothing', 'A EuroDate instance'], answer: 0, explain: '<code>cls</code> is the class the method was called on, which is why factories should return <code>cls(...)</code>.' },
    { q: 'Which statement about <code>@staticmethod</code> is true?', options: ['It receives neither the instance nor the class automatically', 'It receives the class as <code>cls</code>', 'It cannot be called on an instance', 'It cannot be overridden in subclasses'], answer: 0, explain: 'A static method is a plain function stored in the class namespace. It can be called on the class or an instance and can be overridden.' },
    { q: 'Which best describes duck typing?', options: ['Code relies on an object having the needed methods, not on its declared type', 'All classes must inherit from a common base', 'Types are checked at compile time', 'Objects are converted to the needed type automatically'], answer: 0, explain: '"If it quacks like a duck…" — Python cares what an object can do, e.g. anything with <code>.read()</code> is file-like.' },
    { q: 'What prints? <code>class A: pass</code> / <code>class B(A): pass</code> / <code>print(type(B()) == A, isinstance(B(), A))</code>', options: ['<code>False True</code>', '<code>True True</code>', '<code>False False</code>', '<code>True False</code>'], answer: 0, explain: '<code>type()</code> gives the exact class (B); <code>isinstance</code> respects inheritance.' },
    { q: 'For <code>class D(B, C)</code> where B and C both inherit from A, what is <code>D.__mro__</code>?', options: ['D, B, C, A, object', 'D, B, A, C, object', 'D, C, B, A, object', 'D, A, B, C, object'], answer: 0, explain: 'C3 linearization keeps children before parents and preserves the left-to-right base order, so A comes after both B and C.' },
    { q: 'Which is the more Pythonic way to call an optional method that might not exist?', options: ['EAFP: <code>try: obj.close() except AttributeError: …</code> (or <code>getattr(obj, \'close\', None)</code>)', 'Check <code>type(obj).__name__</code> against a list of class names', 'Wrap all code in a bare <code>except:</code>', 'Use <code>isinstance(obj, object)</code>'], answer: 0, explain: 'Python favours EAFP and small duck-typed checks; type-name comparisons are brittle and bare excepts hide bugs.' },
    { q: '<code>f = acct.deposit</code> (no parentheses). What is <code>f</code>?', options: ['A bound method that remembers <code>acct</code>', 'The result of calling deposit', 'The plain function from the class', 'None'], answer: 0, explain: 'Accessing a function through an instance creates a bound method; <code>f(10)</code> later deposits into <code>acct</code>.' }
  );

  /* ================= INTERVIEW ================= */
  interview.push(
    { q: 'What is <code>self</code> in Python, and why do we have to write it explicitly?', level: 'B', a: `<p><code>self</code> is simply the first parameter of an instance method; Python passes the instance into it automatically, because <code>obj.method(x)</code> is translated into <code>Class.method(obj, x)</code>. The name is a convention, not a keyword. Python makes it explicit ("explicit is better than implicit") so that inside a method it's always clear which names are object attributes (<code>self.balance</code>) versus locals (<code>balance</code>). Mechanically, functions are descriptors: accessing <code>obj.method</code> calls <code>function.__get__(obj, type(obj))</code>, producing a bound method that prepends <code>obj</code> to the arguments.</p>`, followUps: ['What error do you get if you forget <code>self</code> in a method definition?', 'Could you name it <code>this</code>? Should you?'] },
    { q: 'Explain the difference between <code>__new__</code> and <code>__init__</code>.', level: 'I', a: `<p><code>Cls(args)</code> calls <code>type.__call__</code>, which first runs <code>Cls.__new__(Cls, args)</code> — a static method that <b>creates and returns</b> the new object — and then, if that object is an instance of <code>Cls</code>, runs <code>obj.__init__(args)</code> to <b>initialise</b> it. <code>__init__</code> must return <code>None</code>. You override <code>__new__</code> rarely: when subclassing immutable types (<code>int</code>, <code>str</code>, <code>tuple</code>) where the value must be set at creation, for singletons/instance caching, or in metaclasses. Everyday classes only need <code>__init__</code>.</p>`, followUps: ['Write a subclass of <code>str</code> that always stores uppercase text.', 'What happens if <code>__new__</code> returns an object of a different class?'] },
    { q: 'What is the difference between class attributes and instance attributes? Give a bug caused by mixing them up.', level: 'B', a: `<p>Instance attributes live in each object's <code>__dict__</code> (set via <code>self.x = …</code>) and are per-object. Class attributes live in the class's <code>__dict__</code> and are shared by all instances. Reading <code>obj.x</code> checks the instance first, then the class, then parents; writing <code>obj.x = …</code> always writes to the instance and can <b>shadow</b> the class attribute. Classic bugs: (1) a mutable class attribute like <code>items = []</code> shared by every object, so one object's append shows up in all; (2) <code>self.count += 1</code> meant to bump a class counter, which instead creates an instance attribute and leaves the class value unchanged.</p>`, followUps: ['How would you count instances correctly, including per-subclass counts?', 'Why is a class attribute fine for constants like <code>MAX_SIZE = 100</code>?'] },
    { q: 'Walk me through how Python resolves <code>obj.attr</code>.', level: 'A', a: `<p><code>object.__getattribute__</code>: (1) search <code>type(obj).__mro__</code> for <code>attr</code>; if found and it is a <b>data descriptor</b> (has <code>__set__</code> or <code>__delete__</code>, like <code>property</code>), call its <code>__get__</code> and return — it beats the instance dict. (2) Otherwise, if <code>attr</code> is in <code>obj.__dict__</code>, return it. (3) Otherwise, if the class attribute is a non-data descriptor (e.g. a function), return <code>__get__(obj, type)</code> — a bound method; else return the class attribute as is. (4) If nothing is found, call <code>__getattr__</code> if defined, else raise <code>AttributeError</code>. CPython caches type lookups so this is effectively O(1).</p>`, followUps: ['Why can an instance attribute shadow a method but not a property?', 'Difference between <code>__getattr__</code> and <code>__getattribute__</code>?'] },
    { q: 'What does <code>super()</code> actually do? Is it "call my parent"?', level: 'A', a: `<p>Not exactly. Zero-argument <code>super()</code> is <code>super(__class__, self)</code>, where <code>__class__</code> is the class the method is defined in. It returns a proxy that looks up attributes in <code>type(self).__mro__</code> <b>starting after <code>__class__</code></b>. In single inheritance that is the parent; in multiple inheritance it can be a <b>sibling</b>. Example: <code>class D(B, C)</code> with B and C inheriting A — <code>super()</code> inside B, for a D instance, resolves to C. That is what makes cooperative multiple inheritance work: if every class calls <code>super()</code>, each class in the MRO runs exactly once.</p>`, followUps: ['Why is calling <code>Parent.__init__(self)</code> explicitly risky in a diamond?', 'How do you pass different keyword arguments through a cooperative <code>__init__</code> chain?'] },
    { q: 'What is the MRO and how is it computed?', level: 'I', a: `<p>The Method Resolution Order is the ordered list of classes Python searches for attributes, stored in <code>Cls.__mro__</code>. Python 3 computes it with <b>C3 linearization</b>: the MRO of a class is the class itself followed by a merge of its parents' MROs and the list of parents, always picking the first head that does not appear in the tail of any other list. This guarantees children come before parents, base order is preserved left to right, and each class appears once. If no consistent order exists (e.g. <code>class X(A, B)</code> and <code>class Y(B, A)</code> then <code>class Z(X, Y)</code>), class creation raises <code>TypeError</code>.</p>`, followUps: ['Compute the MRO for <code>class D(B, C)</code> where B(A), C(A).', 'Why did Python move away from depth-first lookup?'] },
    { q: 'Compare <code>@staticmethod</code>, <code>@classmethod</code> and instance methods. When do you use each?', level: 'B', a: `<p>Instance methods get <code>self</code> and work with one object's data — the default. Class methods get <code>cls</code>, the class they were called on; use them for <b>alternate constructors</b> (<code>from_string</code>, <code>from_dict</code>, like <code>datetime.fromisoformat</code>) and class-wide state such as registries — returning <code>cls(...)</code> means subclasses get instances of themselves. Static methods get nothing automatically; they are plain functions kept in the class namespace for organisation, e.g. validation helpers. If a static helper doesn't conceptually belong to the class, a module-level function is equally Pythonic.</p>`, followUps: ['Why is <code>return Date(...)</code> inside a factory a bug?', 'How would you type-annotate a classmethod factory? (<code>typing.Self</code>)'] },
    { q: 'What is duck typing? How does it compare with inheritance-based polymorphism and static typing?', level: 'I', a: `<p>Duck typing means code depends on behaviour, not declared type: if an object has the method you call, it works. <code>len()</code> works on anything with <code>__len__</code>; a function reading "a file" works with <code>io.StringIO</code>. Inheritance polymorphism requires a shared base class; duck typing doesn't, which makes Python flexible and tests easy (fakes need no base). The cost is that mistakes surface at runtime. Modern Python gets both worlds with <code>typing.Protocol</code> (structural typing checked by mypy/pyright) and <code>abc.ABC</code> when you want instantiation-time enforcement.</p>`, followUps: ['What is EAFP vs LBYL, and when is LBYL better?', 'What does <code>@runtime_checkable</code> check — and not check?'] },
    { q: 'When would you choose composition over inheritance?', level: 'I', a: `<p>Use inheritance only for a genuine, stable "is-a" relationship where the subclass can substitute for the parent everywhere (Liskov). Use composition ("has-a") when an object merely <b>uses</b> another: a Car has an Engine, an Order has LineItems, a Service has a Repository. Composition lets you swap parts at runtime (inject a fake engine in tests), avoids fragile deep hierarchies and the "gorilla holding the banana and the whole jungle" problem, and keeps classes small. In practice: inherit from frameworks' base classes or ABCs when required; otherwise prefer composing small objects and delegating.</p>`, followUps: ['Give an example where inheritance breaks Liskov substitution (Square/Rectangle).', 'How do mixins fit into this picture?'] },
    { q: 'Python has no private members. How do you encapsulate data?', level: 'B', a: `<p>By convention: a single leading underscore (<code>_balance</code>) means "internal, don't touch" — tools and IDEs respect it, and <code>from module import *</code> skips such names. Double leading underscore (<code>__balance</code>) triggers <b>name mangling</b> to <code>_ClassName__balance</code>, which prevents accidental clashes in subclasses but is not security. Real encapsulation comes from exposing a small set of methods that keep invariants (validate before mutating), and from <code>@property</code> when you need computed or validated attribute access without changing the public API. "We're all consenting adults here."</p>`, followUps: ['What does <code>obj.__balance</code> raise from outside the class, and how could you still read it?', 'When would you switch a plain attribute to a property?'] },
    { q: 'Design question: implement a MinStack where every operation is O(1). Explain your class design.', level: 'I', a: `<p>State on <code>self</code>: <code>items</code> (the stack) and <code>mins</code>, where <code>mins[i]</code> is the minimum of <code>items[0..i]</code>. <code>push(v)</code> appends v and <code>min(v, mins[-1])</code>; <code>pop</code> pops both; <code>top</code> returns <code>items[-1]</code>; <code>get_min</code> returns <code>mins[-1]</code>. The class maintains an invariant (<code>mins[-1]</code> is the true minimum) that every method preserves, so all operations are O(1) and memory O(n). Optimisation: push to <code>mins</code> only when <code>v &lt;= mins[-1]</code> and pop it only when the popped value equals it (use &lt;= to handle duplicates).</p>`, followUps: ['Can you do it with O(1) extra space? (store encoded differences)', 'How would you make it thread-safe?'] },
    { q: 'Predict and explain: <code>class P: def hi(self): return "P"</code>, <code>class C(P): def hi(self): return "C" + super().hi()</code>, then <code>C.hi = lambda self: "X"</code>; what is <code>C().hi()</code>?', level: 'A', a: `<p>It returns <code>'X'</code>. Methods are just function objects stored in the class's dict, and classes are mutable at runtime: assigning <code>C.hi = lambda self: 'X'</code> replaces the entry in <code>C.__dict__</code>. Lookup for <code>C().hi</code> finds the lambda first, binds it (lambdas are functions, hence descriptors) and calls it. Note that this lambda can't use zero-argument <code>super()</code> — that needs the compiler-injected <code>__class__</code> cell, which only exists for functions defined inside a class body. This is monkey-patching: useful in tests (<code>unittest.mock.patch.object</code>), risky in production.</p>`, followUps: ['What would <code>P.hi = …</code> change for C objects?', 'Why does <code>super()</code> fail with "RuntimeError: super(): __class__ cell not found" in some cases?'] },
    { q: 'How do abstract base classes work in Python, and how are they different from a Protocol?', level: 'A', a: `<p>An ABC subclasses <code>abc.ABC</code> (metaclass <code>ABCMeta</code>) and marks methods with <code>@abstractmethod</code>. Its <code>__abstractmethods__</code> set is computed at class creation; trying to instantiate a class with any remaining abstract methods raises <code>TypeError</code>. That is <b>nominal</b> typing: a class conforms by inheriting (or via <code>ABC.register</code>). A <code>typing.Protocol</code> is <b>structural</b>: any class with matching method signatures conforms for static type checkers, with no inheritance required; <code>@runtime_checkable</code> enables <code>isinstance</code> but only checks that the attribute names exist. Use ABCs for frameworks that need shared behaviour + enforcement; Protocols to describe "anything that has <code>.read()</code>".</p>`, followUps: ['Can an abstract method have an implementation? How would subclasses use it?', 'How do <code>collections.abc</code> classes like <code>Iterable</code> recognise classes that never inherited from them? (<code>__subclasshook__</code>)'] },
    { q: 'An AI assistant generated a class hierarchy for your feature. What do you check in review?', level: 'E', a: `<p>(1) <b>Need:</b> does each class earn its existence, or would functions / a dataclass / a dict do? (2) <b>Shared state:</b> any mutable class attributes or mutable default arguments? (3) <b>Constructors:</b> every overriding <code>__init__</code> calls <code>super().__init__</code>; factories return <code>cls(...)</code>, not a hard-coded class. (4) <b>Relationships:</b> is each inheritance a real is-a that obeys Liskov, or should it be composition? Any multiple inheritance mixing explicit parent calls with <code>super()</code>? (5) <b>Invariants:</b> methods validate before mutating so exceptions leave objects consistent. (6) <b>Pythonic style:</b> no Java-style getters/setters, <code>isinstance</code> ladders replaced by polymorphism, type hints with <code>Self</code>/<code>Protocol</code> where helpful. Then I ask the AI for adversarial tests for each point and run them.</p>`, followUps: ['Which linters/type-checker rules catch some of these automatically (e.g. ruff RUF012, mypy)?', 'How would you explain the refactor to the teammate who accepted the AI suggestion?'] }
  );

  /* Vary the position of the correct option (deterministic rotation). */
  function rotate(q, shift) {
    var n = q.options.length, s = shift % n;
    if (!s) return;
    q.options = q.options.slice(s).concat(q.options.slice(0, s));
    q.answer = (q.answer - s + n) % n;
  }
  quiz.forEach(function (q, i) { rotate(q, i * 3 + 1); });
  var mcqK = 0;
  topics.forEach(function (t) { (t.problems || []).forEach(function (p) { rotate(p.mcq, mcqK * 2 + 1); mcqK++; }); });
  practice.forEach(function (p) { rotate(p.mcq, mcqK * 2 + 1); mcqK++; });

  registerModule({
    id: 'py04',
    title: 'OOP Basics in Python',
    lang: 'python',
    intro: `<p>Until now your programs were <b>data</b> (variables, lists, dicts) plus <b>functions</b> that act on it. Object-oriented programming bundles the two: a <b>class</b> is a blueprint, and each <b>object</b> carries its own data together with the methods that know how to use it. Almost every Python library you will touch — from <code>datetime</code> to web frameworks and AI SDKs — hands you objects, and design rounds (MinStack, LRU cache, parking lot, bank system) are really "write a good class" questions.</p>
<p>In this module you will build classes with <code>__init__</code> and <code>self</code>, see exactly where attributes live (and the shared-state traps that bite even seniors), master methods and bound methods, reuse code with inheritance and <code>super()</code>, write flexible code with polymorphism and duck typing, and choose correctly between instance, <code>@classmethod</code> and <code>@staticmethod</code>. Every topic has a step-by-step visualizer — watch Python build objects, walk the lookup chain and follow <code>super()</code> calls — plus runnable examples, predict-the-output puzzles and interview questions.</p>`,
    goals: [
      'Write classes with <code>__init__</code>, instance attributes and methods, and explain exactly what <code>self</code> is (<code>obj.m(x)</code> → <code>Class.m(obj, x)</code>)',
      'Predict any class-vs-instance attribute puzzle by tracing the <b>instance → class → parents</b> lookup chain, and avoid shared mutable class attributes and the <code>self.count += 1</code> trap',
      'Use inheritance to inherit, override and extend behaviour with <code>super()</code>, read an MRO, and decide between inheritance and composition',
      'Replace <code>isinstance</code> ladders with polymorphism and duck typing (EAFP), and enforce interfaces with <code>abc.ABC</code> when needed',
      'Choose between instance methods, <code>@classmethod</code> alternate constructors and <code>@staticmethod</code> helpers, and solve OOP design problems like MinStack, Hit Counter and Undo/Redo'
    ],
    prereqs: `Python Module 1 (Setup, Syntax, Types &amp; I/O), Module 2 (Control Flow, Functions &amp; Core Collections) and Module 3 (Strings, Files, Modules &amp; Packages). You should be comfortable writing functions, using lists/dicts and reading tracebacks.`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
