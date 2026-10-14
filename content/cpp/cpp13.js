(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw;   // C++ code is written with String.raw so "\n" stays a C++ escape

  /* ======================================================================
     Shared helpers for the visualizers of this module
     ====================================================================== */
  function note(html, label) { return { type: 'text', label: label || 'What is going on', html: html }; }
  function codePart(label, code, hl) { return { type: 'code', label: label, lang: 'cpp', code: code, hl: hl || {} }; }
  function words(input, def, max, allowed, what) {
    var s = String(input === undefined || input === null ? def : input).trim();
    if (!s) throw new Error('Type some ' + what + ' separated by spaces, e.g. ' + def);
    var items = s.split(/[\s,;]+/).filter(Boolean);
    if (items.length > max) throw new Error('Use at most ' + max + ' ' + what);
    if (allowed) {
      items = items.map(function (w) {
        var hit = null;
        allowed.forEach(function (a) { if (a.toLowerCase() === w.toLowerCase()) hit = a; });
        if (!hit) throw new Error('"' + w + '" is not allowed. Pick from: ' + allowed.join(', '));
        return hit;
      });
    }
    return items;
  }
  function oneOf(input, def, allowed) {
    var s = String(input === undefined || input === null ? def : input).trim().toLowerCase();
    if (!s) s = def;
    for (var i = 0; i < allowed.length; i++) if (allowed[i] === s) return s;
    throw new Error('Type one of: ' + allowed.join(' | '));
  }
  function intIn(input, def, lo, hi, what) {
    var s = String(input === undefined || input === null ? def : input).trim();
    var n = Number(s === '' ? def : s);
    if (!Number.isInteger(n) || n < lo || n > hi) throw new Error(what + ' must be a whole number from ' + lo + ' to ' + hi);
    return n;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ======================================================================
     TOPIC 1 — CRTP
     ====================================================================== */
  function crtpViz(input) {
    var shapes = words(input, 'Square Circle Square', 5, ['Square', 'Circle', 'Triangle'], 'shapes (Square, Circle, Triangle)');
    var frames = [], st = { 'virtual calls': 0, 'memory loads (vptr + slot)': 0, 'CRTP calls': 0, 'CRTP calls inlined': 0 };
    function vGraph(name, step) {
      var hl = {}, ehl = {};
      if (step >= 0) hl.call = 'cur';
      if (step >= 1) { hl.obj = 'cur'; ehl['call-obj'] = 'win'; }
      if (step >= 2) { hl.vt = 'cur'; ehl['obj-vt'] = 'win'; }
      if (step >= 3) { hl.fn = 'ok'; ehl['vt-fn'] = 'ok'; }
      return { type: 'graph', label: 'Virtual dispatch (decided at RUN time)', directed: true, height: 46,
        nodes: [
          { id: 'call', label: 'p->area()', x: 8, y: 23, shape: 'box' },
          { id: 'obj', label: name + ' obj: vptr|data', x: 33, y: 23, shape: 'box' },
          { id: 'vt', label: 'vtable[' + name + ']', x: 62, y: 23, shape: 'box' },
          { id: 'fn', label: name + '::area()', x: 88, y: 23, shape: 'box' }
        ],
        edges: [['call', 'obj', 'load vptr'], ['obj', 'vt', 'load slot 0'], ['vt', 'fn', 'indirect jump']], hl: hl, ehl: ehl,
        tags: step >= 3 ? { fn: 'not inlinable' } : {} };
    }
    function cGraph(name, step) {
      var hl = { cc: 'sel' }, ehl = {};
      if (step >= 1) { hl.call = 'cur'; hl.base = 'cur'; ehl['call-base'] = 'ok'; }
      if (step >= 2) { hl.impl = 'ok'; ehl['base-impl'] = 'ok'; }
      return { type: 'graph', label: 'CRTP static dispatch (decided at COMPILE time)', directed: true, height: 46,
        nodes: [
          { id: 'cc', label: 'compiler knows: D = ' + name, x: 50, y: 7, shape: 'box' },
          { id: 'call', label: 'x.area()', x: 12, y: 32, shape: 'box' },
          { id: 'base', label: 'ShapeC<' + name + '>::area()', x: 46, y: 32, shape: 'box' },
          { id: 'impl', label: name + '::areaImpl()', x: 84, y: 32, shape: 'box' }
        ],
        edges: [['call', 'base', 'direct call'], ['base', 'impl', 'static_cast, direct']], hl: hl, ehl: ehl,
        tags: step >= 2 ? { impl: 'inlined' } : {} };
    }
    var vCode = 'ShapeV* p = new ' + shapes[0] + 'V(...);\ndouble a = p->area();   // virtual';
    var cCode = 'template <class D> struct ShapeC {\n  double area() const {\n    return static_cast<const D&>(*this).areaImpl();\n  }\n};\nstruct ' + shapes[0] + ' : ShapeC<' + shapes[0] + '> { double areaImpl() const; };';
    frames.push({ narr: 'Two ways to call <b>area()</b> on a <b>' + shapes[0] + '</b>. On top: the classic <b>virtual</b> way. Below: <b>CRTP</b>. Both print the same number — the difference is <i>when</i> the program decides which function runs.',
      parts: [vGraph(shapes[0], 0), cGraph(shapes[0], 0), { type: 'vars', label: 'cost counters', vals: clone(st) }] });
    frames.push({ narr: 'Virtual step 1: the CPU reads the hidden <b>vptr</b> stored at the start of the object. It must touch memory just to learn the type.',
      parts: [vGraph(shapes[0], 1), codePart('virtual call', vCode, { 2: 'cur' })] });
    frames.push({ narr: 'Virtual step 2: the vptr points to the class\'s <b>vtable</b> (one per class, shared by all objects). The CPU reads slot 0, which holds the address of the right <code>area()</code>.',
      parts: [vGraph(shapes[0], 2), codePart('virtual call', vCode, { 2: 'cur' })] });
    st['virtual calls']++; st['memory loads (vptr + slot)'] += 2;
    frames.push({ narr: 'Virtual step 3: an <b>indirect jump</b> to that address. Because the target is only known at run time, the compiler usually <b>cannot inline</b> it — that lost inlining is the real cost, more than the jump itself.',
      parts: [vGraph(shapes[0], 3), { type: 'vars', label: 'cost counters', vals: clone(st), hl: { 'virtual calls': 'cur', 'memory loads (vptr + slot)': 'cur' } }] });
    frames.push({ narr: 'CRTP step 1: <code>' + shapes[0] + '</code> inherits from <code>ShapeC&lt;' + shapes[0] + '&gt;</code> — it passes <b>itself</b> as the template argument. So when the compiler builds <code>ShapeC&lt;' + shapes[0] + '&gt;::area()</code>, it already knows the exact child type.',
      parts: [cGraph(shapes[0], 1), codePart('CRTP base', cCode, { 1: 'sel', 3: 'cur', 6: 'cur' })] });
    st['CRTP calls']++; st['CRTP calls inlined']++;
    frames.push({ narr: 'CRTP step 2: <code>static_cast&lt;const ' + shapes[0] + '&amp;&gt;(*this)</code> is a compile-time pointer adjustment (usually zero bytes). The call to <code>areaImpl()</code> is a <b>plain direct call</b> → the optimizer inlines it. No vptr, no vtable, no indirect jump.',
      parts: [cGraph(shapes[0], 2), { type: 'vars', label: 'cost counters', vals: clone(st), hl: { 'CRTP calls': 'ok', 'CRTP calls inlined': 'ok' } }] });
    for (var i = 1; i < shapes.length; i++) {
      var nm = shapes[i];
      st['virtual calls']++; st['memory loads (vptr + slot)'] += 2;
      frames.push({ narr: 'Next object: a <b>' + nm + '</b>. Virtual path again: load vptr → load slot → indirect jump to <code>' + nm + '::area()</code>. This happens on <b>every</b> call, because the pointer could point at any shape.',
        parts: [vGraph(nm, 3), { type: 'vars', label: 'cost counters', vals: clone(st), hl: { 'virtual calls': 'cur' } }] });
      st['CRTP calls']++; st['CRTP calls inlined']++;
      frames.push({ narr: 'CRTP path for <b>' + nm + '</b>: a <i>separate</i> function <code>ShapeC&lt;' + nm + '&gt;::area()</code> was stamped out at compile time, so this call is direct and inlined. Price: one extra instantiation (a bit more code), and you can no longer put ' + nm + ' and other shapes in one <code>vector&lt;ShapeC*&gt;</code> — there is no single common base.',
        parts: [cGraph(nm, 2), { type: 'vars', label: 'cost counters', vals: clone(st), hl: { 'CRTP calls': 'ok' } }] });
    }
    frames.push({ narr: 'Summary: <b>virtual</b> = one container of mixed types, decided at run time, small per-call cost + no inlining. <b>CRTP</b> = types known at compile time, zero-overhead and inlinable, but no runtime mixing. Pick by asking: "do I know the concrete type where I call it?"',
      parts: [{ type: 'table', label: 'virtual vs CRTP', columns: ['', 'virtual', 'CRTP'], rows: [
        ['decided', 'run time', 'compile time'], ['per-object cost', 'vptr (8 bytes)', 'none'], ['inlining', 'usually blocked', 'yes'],
        ['mixed container', 'vector<unique_ptr<Base>>', 'not possible (no common base)'], ['adding a new type', 'no recompile of callers', 'new instantiation'],
        ['calls made here', String(st['virtual calls']), String(st['CRTP calls'])]], hl: { 2: 'sel' } }, { type: 'vars', label: 'cost counters', vals: clone(st) }] });
    return frames;
  }

  topics.push({
    title: 'CRTP: Static Polymorphism & Mixins',
    analogy: `<p>Imagine a <b>restaurant franchise manual</b> that says "greet the guest, then serve <i>your restaurant's</i> signature dish". With the <b>virtual</b> approach, every time a guest arrives the waiter phones head office to ask "which restaurant am I in again, and what is our dish?" — it works anywhere, but there is a phone call every time. With <b>CRTP</b>, each restaurant prints its <i>own copy</i> of the manual with its name already filled in ("greet the guest, then serve <b>pizza</b>"). No phone calls at run time — but every restaurant needs its own printed copy, and you cannot hand one generic manual to a mixed group of restaurants.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> CRTP stands for <b>Curiously Recurring Template Pattern</b>. "Curiously recurring" because a class inherits from a template <b>instantiated with itself</b>:</p>
      <pre>template &lt;typename Derived&gt;
struct Base {
    void interface() { static_cast&lt;Derived&amp;&gt;(*this).implementation(); }
};
struct Mine : Base&lt;Mine&gt; {          // Mine passes ITSELF to its base
    void implementation() { /* ... */ }
};</pre>
      <p>Because the base knows the exact derived type at compile time, it can call the derived class's functions with a <b>plain static_cast</b> — no <code>virtual</code>, no vtable, no runtime lookup. The call is direct, so the optimizer can inline it. That's why CRTP is called <b>static polymorphism</b>: one shared piece of code, specialised per type, chosen by the compiler.</p>
      ${H.table(['', 'virtual functions', 'CRTP'], [['when is the function chosen?', 'run time (vtable)', '<span class="c-g">compile time</span>'], ['extra memory per object', 'one hidden vptr (8 bytes on 64-bit)', '<span class="c-g">none</span> (empty base)'], ['inlinable?', '<span class="c-r">usually not</span>', '<span class="c-g">yes</span>'], ['mixed types in one container?', '<span class="c-g">yes</span>: <code>vector&lt;unique_ptr&lt;Base&gt;&gt;</code>', '<span class="c-r">no</span>: <code>Base&lt;A&gt;</code> and <code>Base&lt;B&gt;</code> are unrelated types'], ['typical use', 'plugins, unknown types at run time', 'hot loops, mixins, libraries']])}
      <p><b>Three classic jobs for CRTP:</b></p>
      <ul>
        <li><b>Static interface</b> ("template method" without virtual): the base writes the algorithm once (<code>describe()</code> prints <code>area()</code>), each derived class supplies the step (<code>areaImpl()</code>).</li>
        <li><b>Mixins — "add features for free"</b>: write <code>operator&lt;</code> once and inherit <code>&gt;</code>, <code>&lt;=</code>, <code>&gt;=</code>, <code>==</code> from a <code>Comparable&lt;T&gt;</code> base; count live instances per class with <code>Counter&lt;T&gt;</code>; give every class a correct <code>clone()</code> with <code>Cloneable&lt;T&gt;</code>.</li>
        <li><b>Library hooks</b>: the standard library itself uses it — <code>std::enable_shared_from_this&lt;T&gt;</code> and <code>std::ranges::view_interface&lt;D&gt;</code> are CRTP bases.</li>
      </ul>
      <p><b>Key fact for interviews:</b> each <code>Base&lt;X&gt;</code> is a <i>different</i> class. Static members of the base are therefore <b>per derived type</b> — that's exactly what makes the per-class instance counter work.</p>`,
    clues: [
      '"Polymorphism <b>without virtual functions</b>" / "zero-overhead polymorphism" → CRTP',
      '"Static polymorphism", "compile-time polymorphism" → CRTP (or templates/concepts)',
      '"Add the same functionality (comparison operators, counters, clone) to many classes without repeating code" → CRTP mixin',
      '"Count how many objects of <b>each</b> class exist" → <code>Counter&lt;Derived&gt;</code> with a static member per instantiation',
      '"Hot loop calling a virtual function millions of times is slow" → devirtualize with CRTP or <code>final</code>',
      '"What is <code>enable_shared_from_this</code>?" → it is a CRTP base',
      '"Implement <code>clone()</code> once for a whole hierarchy" → <code>Cloneable&lt;Derived, Base&gt;</code> CRTP'
    ],
    code: [R`
      #include <iostream>
      #include <memory>
      #include <vector>

      // ---------- Dynamic polymorphism: decided at RUN time through the vtable ----------
      struct ShapeV {
          virtual double area() const = 0;      // pure virtual: each derived class fills a vtable slot
          virtual ~ShapeV() = default;          // virtual dtor: safe delete through ShapeV*
      };
      struct SquareV : ShapeV {
          double s;
          explicit SquareV(double side) : s(side) {}
          double area() const override { return s * s; }
      };

      // ---------- Static polymorphism with CRTP: decided at COMPILE time ----------
      template <typename Derived>               // the base is told who its child is
      struct ShapeC {
          double area() const {
              // static_cast is safe: by contract every ShapeC<D> really is a D
              return static_cast<const Derived&>(*this).areaImpl();
          }
          void describe() const {               // shared "template method" written once in the base
              std::cout << "area = " << area() << "\n";
          }
      };
      struct SquareC : ShapeC<SquareC> {        // "curiously recurring": the class passes itself
          double s;
          explicit SquareC(double side) : s(side) {}
          double areaImpl() const { return s * s; }
      };
      struct CircleC : ShapeC<CircleC> {
          double r;
          explicit CircleC(double radius) : r(radius) {}
          double areaImpl() const { return 3.14159 * r * r; }
      };

      // Generic code that works with ANY CRTP shape — resolved per type, inlinable.
      template <typename D>
      double twice(const ShapeC<D>& sh) { return 2 * sh.area(); }

      int main() {
          std::vector<std::unique_ptr<ShapeV>> v;          // one container, many types: needs virtual
          v.push_back(std::make_unique<SquareV>(3));
          for (const auto& p : v) std::cout << p->area() << "\n";   // 9 (indirect call)

          SquareC sq{3};
          CircleC ci{1};
          sq.describe();                                   // area = 9  (direct call, inlined)
          ci.describe();                                   // area = 3.14159
          std::cout << twice(sq) << "\n";                  // 18
      }
    `, R`
      #include <iostream>

      // A hardened CRTP base: only the REAL derived class can construct it.
      template <typename Derived>
      class Base {
          Base() = default;                 // private constructor...
          friend Derived;                   // ...only Derived is a friend, so "struct B : Base<A>" fails to compile
      public:
          void run() { self().step(); }
      private:
          Derived& self() { return static_cast<Derived&>(*this); }
      };

      struct Good : Base<Good> { void step() { std::cout << "Good::step\n"; } };
      // struct Bad : Base<Good> { void step() {} };   // ERROR: Base<Good>::Base() is private to Bad

      int main() {
          Good g;
          g.run();                          // Good::step
      }
    `],
    codeTitle: ['Virtual vs CRTP side by side (same result, different dispatch)', 'Hardening CRTP: stop the "wrong Derived" copy-paste bug'],
    viz: { title: 'Virtual dispatch vs CRTP static dispatch', input: 'Square Circle Square', inputLabel: 'Shapes to call area() on (Square, Circle, Triangle)', gen: crtpViz },
    examples: [
      { title: 'Mixin: a per-class instance counter', html: `<p>Each <code>Counter&lt;T&gt;</code> is a separate class, so its <code>static</code> members exist <b>once per T</b>. Dog objects and Cat objects are counted independently. The counter increments in every constructor (including copy/move!) and decrements in the destructor.</p>
        ${H.table(['statement', 'Counter&lt;Dog&gt;::alive', 'Counter&lt;Cat&gt;::alive'], [['Dog a, b;', '2', '0'], ['Cat c;', '2', '1'], ['{ Dog d = a; }', '3 → 2', '1'], ['end', '<span class="c-g">2</span>', '<span class="c-g">1</span>']])}`,
        code: R`
          #include <iostream>
          template <typename T>
          struct Counter {
              static inline int alive = 0;                  // one variable PER T (C++17 inline static)
              Counter() { ++alive; }
              Counter(const Counter&) { ++alive; }          // copies are objects too — don't forget them
              Counter(Counter&&) noexcept { ++alive; }
              ~Counter() { --alive; }
          protected:
              Counter& operator=(const Counter&) = default;
          };
          struct Dog : Counter<Dog> {};
          struct Cat : Counter<Cat> {};
          int main() {
              Dog a, b;
              Cat c;
              { Dog d = a; std::cout << Counter<Dog>::alive << "\n"; }   // 3
              std::cout << Counter<Dog>::alive << " " << Counter<Cat>::alive << "\n";   // 2 1
          }` },
      { title: 'Mixin: write operator&lt; once, get all six comparisons', html: `<p>The base implements <code>&gt;</code>, <code>&lt;=</code>, <code>&gt;=</code>, <code>==</code>, <code>!=</code> in terms of the derived class's <code>operator&lt;</code>. Friend functions defined inside the class template are found by <b>ADL</b> (argument-dependent lookup), so they work for every derived type. (In C++20 you would often just write <code>auto operator&lt;=&gt;(const X&amp;) const = default;</code> — mention that too.)</p>`,
        code: R`
          #include <iostream>
          template <typename D>
          struct Comparable {
              friend bool operator>(const D& a, const D& b)  { return b < a; }
              friend bool operator<=(const D& a, const D& b) { return !(b < a); }
              friend bool operator>=(const D& a, const D& b) { return !(a < b); }
              friend bool operator==(const D& a, const D& b) { return !(a < b) && !(b < a); }
          };
          struct Version : Comparable<Version> {
              int major, minor;
              Version(int a, int b) : major(a), minor(b) {}
              friend bool operator<(const Version& x, const Version& y) {
                  return x.major != y.major ? x.major < y.major : x.minor < y.minor;
              }
          };
          int main() {
              Version v1{1, 2}, v2{1, 10};
              std::cout << (v1 < v2) << (v1 > v2) << (v1 <= v2) << (v1 == v2) << (v1 != v2) << "\n";   // 10101
          }` },
      { title: 'The classic bug: forgetting to implement the hook (infinite recursion)', html: `<p>If the base function and the derived "hook" have the <b>same name</b> and the derived class forgets to define it, <code>static_cast&lt;D&amp;&gt;(*this).area()</code> finds the <b>base's own</b> <code>area()</code> → it calls itself forever → stack overflow. Fixes: use a different hook name (<code>areaImpl</code>) so a missing hook is a <b>compile error</b>, or add a C++20 concept / <code>static_assert</code> check. Interviewers love asking "what happens if Derived does not implement it?"</p>
        ${H.table(['design', 'Derived forgets the hook', 'result'], [['same name (area → area)', 'base area() calls itself', '<span class="c-r">infinite recursion at run time</span>'], ['different name (area → areaImpl)', 'no areaImpl found', '<span class="c-g">compile error</span>']])}` },
      { title: 'CRTP inside the standard library: enable_shared_from_this', html: `<p>An object managed by <code>shared_ptr</code> sometimes needs a <code>shared_ptr</code> to <i>itself</i> (e.g. to register a callback). Writing <code>shared_ptr&lt;T&gt;(this)</code> creates a <b>second control block</b> → double delete. Instead inherit <code>std::enable_shared_from_this&lt;T&gt;</code> — a CRTP base that stores a <code>weak_ptr&lt;T&gt;</code> set up by <code>make_shared</code> — and call <code>shared_from_this()</code>.</p>`,
        code: R`
          #include <iostream>
          #include <memory>
          struct Session : std::enable_shared_from_this<Session> {     // CRTP: passes itself
              std::shared_ptr<Session> self() { return shared_from_this(); }
          };
          int main() {
              auto s = std::make_shared<Session>();
              auto t = s->self();                    // shares the SAME control block
              std::cout << s.use_count() << "\n";    // 2
          }` }
    ],
    deepDive: `<p>🟣 <b>What the machine really does.</b> A virtual call is: load the vptr from the object, load the function address from the vtable slot, indirect call. With a well-predicted branch that costs only a few cycles — the bigger loss is that the optimizer cannot see through the call, so it cannot <b>inline</b>, vectorize the loop, or constant-fold across it. CRTP turns the call into a direct call into a known function, which usually disappears completely after inlining.</p>
      <p><b>Devirtualization exists.</b> Compilers already remove virtual calls when they can prove the dynamic type: objects of a <code>final</code> class, local objects whose type is visible, or with whole-program/LTO analysis. Marking leaf classes <code>final</code> is a cheap first step before reaching for CRTP. Measure first.</p>
      <p><b>Layout.</b> A CRTP base with no data is an <b>empty base</b>; the empty-base optimization makes it take zero bytes, so <code>sizeof(SquareC) == sizeof(double)</code> while <code>sizeof(SquareV) == 16</code> (vptr + double). The <code>static_cast</code> from base to derived is a compile-time offset adjustment (zero for single inheritance).</p>
      <p><b>Costs of CRTP:</b> (1) code bloat — every instantiation is separate machine code; (2) no runtime heterogeneity — <code>Base&lt;A&gt;</code> and <code>Base&lt;B&gt;</code> share nothing, so if you need a mixed container you add a classic virtual interface on top (or type erasure, next topics); (3) everything lives in headers and compile times grow; (4) error messages are template errors; (5) inside the base, <code>Derived</code> is <b>incomplete</b> at class-definition time — you may use it in member function <i>bodies</i> (instantiated later) but not, e.g., <code>sizeof(Derived)</code> or <code>typename Derived::value_type</code> in the base's member declarations.</p>
      <p><b>Modern alternatives.</b> C++20 <b>concepts</b> can express the "static interface" on a free function template (<code>template &lt;HasArea S&gt; double twice(const S&amp;)</code>) without any base class. C++23 <b>deducing this</b> (<code>void describe(this const auto&amp; self)</code>) lets a base class see the derived type without templates — it replaces most "plain" CRTP mixins. Expect C++23 knowledge in senior interviews, but CRTP is still everywhere in existing code (Eigen's expression templates, LLVM, ranges).</p>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> an assistant will happily generate a CRTP mixin or convert a virtual hierarchy to CRTP in seconds. The skill that remains yours is <b>deciding whether you should</b>: CRTP is right only when the concrete type is known at the call site and profiling shows dispatch overhead or missed inlining actually matters.</p>
      <p><b>Use AI as a partner:</b> ask "convert this hierarchy to CRTP and list what callers lose (mixed containers, ABI stability)", "write a concept that checks Derived implements areaImpl", or "show the assembly difference with -O2 on Compiler Explorer for both versions".</p>
      <p><b>Where AI goes wrong:</b> it reuses the same name for the interface and the hook (silent infinite recursion), forgets to count copy constructions in counters, writes <code>struct B : Base&lt;A&gt;</code> when copy-pasting classes, and claims CRTP is "always faster" without measuring. It also tends to use CRTP where C++20 concepts or C++23 deducing <code>this</code> would be simpler.</p>
      <p><b>What you must own:</b> explaining vtable vs static dispatch on a whiteboard, the per-instantiation static member trick, and the trade-off table above.</p>`,
    problems: [{
      title: 'Per-Class Live Object Counter (CRTP Mixin)', level: 'Easy', tags: ['crtp', 'mixin', 'static members'], companies: ['Bloomberg', 'Microsoft'],
      statement: `<p>Write a reusable base <code>ObjectCounter&lt;T&gt;</code> so that any class can inherit from it and get two static functions: <code>created()</code> (total objects ever constructed of that class) and <code>alive()</code> (objects currently alive). Counts must be <b>separate per class</b> and must include copies and moves.</p>`,
      constraints: `<p>No virtual functions. No global map keyed by type name. Must be correct for copy/move construction.</p>`,
      example: `<pre>struct A : ObjectCounter&lt;A&gt; {};  struct B : ObjectCounter&lt;B&gt; {};
A a1; { A a2 = a1; B b; }
A::created() → ${H.c('g', '2')}   A::alive() → ${H.c('g', '1')}   B::created() → ${H.c('g', '1')}   B::alive() → ${H.c('g', '0')}</pre><p>a2 is a copy, so it counts as created; it and b die at the closing brace.</p>`,
      brute: { why: `<p>A naive version uses <b>one non-template base</b> with static counters. All classes share the same variables, so A's and B's counts get mixed. Another naive bug is counting only in the default constructor — copies are never counted but are still destroyed, so <code>alive()</code> goes negative.</p>`,
        code: R`
          #include <iostream>
          struct CounterBase {                      // NOT a template: one set of statics for everyone
              static inline int created_ = 0, alive_ = 0;
              CounterBase() { ++created_; ++alive_; }
              ~CounterBase() { --alive_; }          // copy ctor is implicit and does NOT increment!
          };
          struct A : CounterBase {};
          struct B : CounterBase {};
          int main() {
              A a1;
              { A a2 = a1; B b; }
              std::cout << CounterBase::created_ << " " << CounterBase::alive_ << "\n";   // 2 -1 : wrong on both counts
          }` },
      mcq: { q: 'Why does <code>ObjectCounter&lt;A&gt;</code> keep a separate count from <code>ObjectCounter&lt;B&gt;</code>?', options: ['Each template instantiation is a distinct class with its own static members', 'Static members are stored inside each object', 'The compiler adds a hidden type id', 'Because of virtual inheritance'], answer: 0, explain: '<code>ObjectCounter&lt;A&gt;</code> and <code>ObjectCounter&lt;B&gt;</code> are two unrelated classes, so <code>static inline int alive</code> exists once for each.' },
      hints: [`<p>Make the base a <b>template</b> parameterised on the derived class; static data then becomes per-class automatically.</p>`, `<p>Increment in the default, copy <i>and</i> move constructors; decrement in the destructor. Use <code>static inline</code> (C++17) so you need no out-of-class definition.</p>`, `<p>Make the destructor <code>protected</code> (non-virtual) so nobody deletes a derived object through <code>ObjectCounter&lt;T&gt;*</code>. Recipe: template base → three constructors increment → destructor decrements → static getters.</p>`],
      solution: {
        approach: `<p>CRTP mixin: the derived class passes itself as <code>T</code>, so each class gets its own <code>created_</code>/<code>alive_</code> pair. Every way of making an object (default, copy, move) runs one of the base constructors, so all are counted. The destructor is protected so the base is only usable as a mixin, never as a polymorphic handle.</p>`,
        code: R`
          #include <iostream>

          template <typename T>
          class ObjectCounter {
              static inline long created_ = 0;     // one pair per T
              static inline long alive_ = 0;
          public:
              static long created() { return created_; }
              static long alive() { return alive_; }
          protected:
              ObjectCounter() noexcept { ++created_; ++alive_; }
              ObjectCounter(const ObjectCounter&) noexcept { ++created_; ++alive_; }
              ObjectCounter(ObjectCounter&&) noexcept { ++created_; ++alive_; }
              ObjectCounter& operator=(const ObjectCounter&) = default;   // assignment creates nothing new
              ObjectCounter& operator=(ObjectCounter&&) = default;
              ~ObjectCounter() { --alive_; }       // protected + non-virtual: mixin only
          };

          struct A : ObjectCounter<A> {};
          struct B : ObjectCounter<B> {};

          int main() {
              A a1;
              { A a2 = a1; B b; }
              std::cout << A::created() << " " << A::alive() << " "
                        << B::created() << " " << B::alive() << "\n";   // 2 1 1 0
          }`,
        dry: { head: ['statement', 'A created', 'A alive', 'B created', 'B alive'], rows: [
          ['A a1;', '1', '1', '0', '0'], ['A a2 = a1; (copy ctor)', '2', '2', '0', '0'], ['B b;', '2', '2', '1', '1'], ['} b destroyed', '2', '2', '1', '0'], ['} a2 destroyed', '2', '<span class="c-g">1</span>', '1', '0']] },
        complexity: `<p>O(1) per construction/destruction; zero extra bytes per object (empty base optimization).</p>`,
        followUps: ['Make the counters thread-safe (<code>std::atomic&lt;long&gt;</code>).', 'What changes if a class inherits from <code>ObjectCounter&lt;A&gt;</code> by mistake? How can you prevent it?', 'Rewrite with C++23 deducing <code>this</code> — is it still possible? (No: statics need a per-type entity, so the template stays.)']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — PIMPL
     ====================================================================== */
  function pimplViz(input) {
    var clients = words(input, 'main.cpp ui.cpp net.cpp test.cpp', 5, null, 'client .cpp file names');
    clients.forEach(function (c) { if (!/^[\w.-]{1,14}$/.test(c)) throw new Error('File names: letters, digits, dot, dash, max 14 chars (e.g. main.cpp)'); });
    var n = clients.length, frames = [];
    function g(mode, stage) {
      // mode 'plain' | 'pimpl'; stage 0 = include graph, 1 = header/impl changed, 2 = rebuild done
      var nodes = [{ id: 'h', label: mode === 'plain' ? 'widget.h (members inside!)' : 'widget.h (struct Impl; ptr)', x: 30, y: 8, shape: 'box' },
                   { id: 'cpp', label: mode === 'plain' ? 'widget.cpp' : 'widget.cpp + Impl', x: 80, y: 8, shape: 'box' }];
      var edges = [['h', 'cpp', '#include']], hl = {}, tags = {};
      clients.forEach(function (c, i) {
        var x = n === 1 ? 30 : 8 + i * (84 / (n - 1));
        nodes.push({ id: 'c' + i, label: c, x: x, y: 40, shape: 'box' });
        edges.push(['h', 'c' + i, '']);
      });
      nodes.push({ id: 'bin', label: 'app (link)', x: 80, y: 56, shape: 'box' });
      if (stage === 1) {
        if (mode === 'plain') { hl.h = 'bad'; tags.h = 'private member edited'; }
        else { hl.cpp = 'bad'; tags.cpp = 'Impl edited'; }
      }
      if (stage === 2) {
        if (mode === 'plain') { hl.h = 'bad'; hl.cpp = 'bad'; clients.forEach(function (c, i) { hl['c' + i] = 'bad'; tags['c' + i] = 'recompile'; }); tags.cpp = 'recompile'; }
        else { hl.cpp = 'ok'; tags.cpp = 'recompile'; hl.h = 'done'; clients.forEach(function (c, i) { hl['c' + i] = 'done'; tags['c' + i] = 'untouched'; }); }
        hl.bin = 'cur'; tags.bin = 'relink';
      }
      return { type: 'graph', label: mode === 'plain' ? 'WITHOUT pimpl: everybody includes the private details' : 'WITH pimpl: the header only knows "there is an Impl somewhere"', directed: true, height: 64, nodes: nodes, edges: edges, hl: hl, tags: tags };
    }
    var plainH = 'class Widget {\npublic:\n  void click();\nprivate:\n  std::string name_;\n  std::vector<int> history_;\n  Database db_;          // heavy header dragged in\n};';
    var pimplH = 'class Widget {\npublic:\n  void click();\n  ~Widget();             // defined in widget.cpp\nprivate:\n  struct Impl;           // declared, NOT defined\n  std::unique_ptr<Impl> pImpl_;\n};';
    frames.push({ narr: 'Your library has a <code>Widget</code> class, and <b>' + n + '</b> client file(s) <code>#include "widget.h"</code>. In the plain design, the <b>private members live in the header</b>, so every client sees (and depends on) them.',
      parts: [g('plain', 0), codePart('widget.h (plain)', plainH, { 5: 'cur', 6: 'cur', 7: 'cur' })] });
    frames.push({ narr: 'You add one private field to <code>Widget</code> — callers can\'t even use it. But the header text changed and <code>sizeof(Widget)</code> changed, so the build system must treat every includer as stale.',
      parts: [g('plain', 1), codePart('widget.h (plain)', plainH.replace('Database db_;          // heavy header dragged in', 'Database db_;\n  int retries_ = 3;      // NEW private field'), { 8: 'bad' })] });
    frames.push({ narr: '<span class="c-r">Rebuild storm:</span> widget.cpp <b>and all ' + n + ' clients</b> recompile, then the app relinks. In a big codebase that is minutes per change — and every client binary built against the old layout is now wrong (that\'s an <b>ABI break</b>).',
      parts: [g('plain', 2), { type: 'vars', label: 'build cost', vals: { 'files recompiled': n + 1, 'clients touched': n, 'sizeof(Widget) changed?': 'yes' }, hl: { 'files recompiled': 'bad' } }] });
    frames.push({ narr: 'Now the <b>pimpl</b> version ("pointer to implementation"). The header declares <code>struct Impl;</code> but never defines it, and holds a single <code>unique_ptr&lt;Impl&gt;</code>. Clients know the class is "one pointer big" — nothing more.',
      parts: [g('pimpl', 0), codePart('widget.h (pimpl)', pimplH, { 6: 'sel', 7: 'sel' })] });
    frames.push({ narr: 'You add the same private field — but this time to <code>struct Widget::Impl</code>, which lives <b>only in widget.cpp</b>. The header did not change by a single byte.',
      parts: [g('pimpl', 1), codePart('widget.cpp', 'struct Widget::Impl {\n  std::string name;\n  std::vector<int> history;\n  Database db;\n  int retries = 3;   // NEW private field\n};', { 5: 'ok' })] });
    frames.push({ narr: '<span class="c-g">Only widget.cpp recompiles</span>; the ' + n + ' clients are untouched and the app just relinks. <code>sizeof(Widget)</code> is still one pointer, so even already-shipped client binaries keep working with the new library — the class is <b>ABI-stable</b>.',
      parts: [g('pimpl', 2), { type: 'vars', label: 'build cost', vals: { 'files recompiled': 1, 'clients touched': 0, 'sizeof(Widget) changed?': 'no (8 bytes)' }, hl: { 'files recompiled': 'ok' } }] });
    frames.push({ narr: 'What it looks like in memory: the <code>Widget</code> object (on the stack here) is just a pointer; the real data sits in a <b>heap-allocated Impl</b>. Every member access is one extra pointer hop — that is the runtime price.',
      parts: [{ type: 'graph', label: 'object layout', directed: true, height: 40, nodes: [
        { id: 's', label: 'stack: Widget w {pImpl_}', x: 22, y: 20, shape: 'box' },
        { id: 'i', label: 'heap: Impl {name, history, db, retries}', x: 70, y: 20, shape: 'box' }], edges: [['s', 'i', 'unique_ptr']], hl: { s: 'cur', i: 'sel' }, tags: { s: '8 bytes', i: 'any size' } },
        { type: 'vars', label: 'costs', vals: { 'heap allocations per Widget': 1, 'extra indirection per access': 1, 'inlining of private logic': 'lost across the .cpp boundary' } }] });
    frames.push({ narr: '<b>The #1 pimpl compile error:</b> if you let the compiler generate <code>~Widget()</code> in the header, it instantiates <code>unique_ptr&lt;Impl&gt;</code>\'s deleter where <code>Impl</code> is still <b>incomplete</b> → <i>"invalid application of sizeof to incomplete type"</i>. Fix: <b>declare</b> the destructor (and move ops) in the header, <b>define</b> them as <code>= default</code> in widget.cpp after Impl is complete.',
      parts: [codePart('the fix', '// widget.h\n~Widget();                       // declare only\nWidget(Widget&&) noexcept;\n// widget.cpp  (Impl is complete here)\nWidget::~Widget() = default;\nWidget::Widget(Widget&&) noexcept = default;', { 2: 'ok', 5: 'ok', 6: 'ok' }),
        { type: 'table', label: 'summary', columns: ['', 'plain class', 'pimpl'], rows: [['private change recompiles', 'every includer', 'one .cpp'], ['sizeof stable across versions', 'no', 'yes'], ['heap allocs', '0', '1 per object'], ['access cost', 'direct', '+1 indirection'], ['special members', 'implicit', 'declare in .h, define in .cpp']], hl: { 0: 'sel' } }] });
    return frames;
  }

  topics.push({
    title: 'Pimpl: The Compilation Firewall',
    analogy: `<p>Think of a <b>restaurant menu vs the kitchen</b>. Customers only see the menu (dish names and prices). The chef can buy a new oven, rearrange shelves or hire staff without reprinting a single menu. If instead the menu listed every pot and pan in the kitchen, every kitchen change would mean reprinting menus for every table. <b>Pimpl</b> keeps the header a short menu (public functions + one pointer) and hides the kitchen (all private data) in the <code>.cpp</code> file.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> In C++ a class's <b>private members are written in the header</b>. Private means "you can't use them", not "you can't see them". Every file that includes the header therefore depends on those details: change a private field and every includer must recompile, because the object's <b>size and layout</b> changed.</p>
      <p><b>Pimpl</b> ("<b>p</b>ointer to <b>impl</b>ementation", also called the <i>compilation firewall</i>, <i>opaque pointer</i> or Qt's <i>d-pointer</i>) moves all private data into a separate struct that is only <b>declared</b> in the header and <b>defined</b> in the .cpp:</p>
      <pre>// widget.h — what clients see
class Widget {
public:
    explicit Widget(std::string name);
    ~Widget();                         // must be defined in widget.cpp!
    Widget(Widget&amp;&amp;) noexcept;
    Widget&amp; operator=(Widget&amp;&amp;) noexcept;
    void click();
private:
    struct Impl;                       // forward declaration
    std::unique_ptr&lt;Impl&gt; pImpl_;      // the only data member
};</pre>
      ${H.table(['benefit', 'why'], [['<span class="c-g">faster builds</span>', 'private changes recompile one .cpp, not every includer'], ['<span class="c-g">stable ABI</span>', '<code>sizeof(Widget)</code> is always one pointer, so shipped binaries keep working with new library versions'], ['<span class="c-g">cleaner headers</span>', 'heavy includes (database, OS, third-party headers) stay out of widget.h'], ['<span class="c-g">true hiding</span>', 'clients literally cannot see implementation details (good for closed-source SDKs)']])}
      ${H.table(['cost', 'why'], [['<span class="c-r">heap allocation</span>', 'one <code>new Impl</code> per object'], ['<span class="c-r">indirection</span>', 'every member access goes through a pointer (worse cache locality)'], ['<span class="c-r">no inlining</span>', 'small getters can\'t be inlined into callers (unless LTO)'], ['<span class="c-r">more boilerplate</span>', 'each special member is declared in .h and defined in .cpp; forwarding functions']])}
      <p><b>The golden rule with <code>unique_ptr&lt;Impl&gt;</code>:</b> any function that might <b>destroy</b> an Impl (destructor, move-assignment, and constructors — they destroy on exception) must be defined where <code>Impl</code> is <b>complete</b>, i.e. in the .cpp. Declare them in the header, write <code>= default</code> in the .cpp.</p>`,
    clues: [
      '"Changing a private member forces the whole project to rebuild" → pimpl / compilation firewall',
      '"Keep the ABI stable across library versions", "ship a binary SDK" → pimpl (or a C interface)',
      '"Hide implementation details / third-party headers from users of a class" → pimpl',
      '"invalid application of sizeof to incomplete type" with <code>unique_ptr</code> → destructor defined in the header; move it to the .cpp',
      '"What is a d-pointer (Qt)?", "opaque pointer", "Cheshire cat idiom" → pimpl',
      '"Reduce header dependencies / compile times" → forward declarations + pimpl'
    ],
    code: [R`
      // ================= widget.h (what clients see) =================
      #include <memory>
      #include <string>

      class Widget {
      public:
          explicit Widget(std::string name);
          ~Widget();                                   // declared here, DEFINED in widget.cpp (Impl complete there)
          Widget(Widget&&) noexcept;                   // move ops also defined out of line
          Widget& operator=(Widget&&) noexcept;
          Widget(const Widget&);                       // deep copy (optional — unique_ptr is move-only)
          Widget& operator=(const Widget&);
          void click();
          int clicks() const;
      private:
          struct Impl;                                 // forward declaration only: size unknown to clients
          std::unique_ptr<Impl> pImpl_;                // the ONLY data member: one pointer, fixed size
      };

      // ================= widget.cpp (private to the library) =================
      #include <vector>
      #include <iostream>

      struct Widget::Impl {                            // free to change without recompiling clients
          std::string name;
          int clicks = 0;
          std::vector<int> history;                    // heavy headers stay out of widget.h
      };

      Widget::Widget(std::string name) : pImpl_(std::make_unique<Impl>()) { pImpl_->name = std::move(name); }
      Widget::~Widget() = default;                     // Impl is complete HERE, so unique_ptr can delete it
      Widget::Widget(Widget&&) noexcept = default;
      Widget& Widget::operator=(Widget&&) noexcept = default;
      Widget::Widget(const Widget& o) : pImpl_(std::make_unique<Impl>(*o.pImpl_)) {}
      Widget& Widget::operator=(const Widget& o) { *pImpl_ = *o.pImpl_; return *this; }
      void Widget::click() { ++pImpl_->clicks; pImpl_->history.push_back(pImpl_->clicks); }
      int Widget::clicks() const { return pImpl_->clicks; }

      // ================= main.cpp (a client) =================
      int main() {
          Widget w("ok");
          w.click(); w.click();
          Widget c = w;                // deep copy
          c.click();
          std::cout << w.clicks() << " " << c.clicks() << "\n";   // 2 3
      }
    `],
    codeTitle: ['Complete pimpl class (header / implementation / client in one listing)'],
    viz: { title: 'Pimpl: who recompiles when a private member changes?', input: 'main.cpp ui.cpp net.cpp test.cpp', inputLabel: 'Client files that #include "widget.h"', gen: pimplViz },
    examples: [
      { title: 'The incomplete-type error, explained', html: `<p>If the header says nothing about the destructor, the compiler <b>implicitly defines</b> <code>~Widget()</code> inline — in every client file, where <code>Impl</code> is only declared. <code>~unique_ptr&lt;Impl&gt;</code> calls <code>delete</code> on an incomplete type, and <code>std::default_delete</code> contains a <code>static_assert(sizeof(T) &gt; 0)</code> to stop you. The error points deep into <code>&lt;memory&gt;</code>, which confuses people.</p>
        ${H.table(['where is ~Widget defined?', 'Impl complete there?', 'result'], [['implicitly, in each client', '<span class="c-r">no</span>', '<span class="c-r">compile error</span> (sizeof incomplete type)'], ['<code>Widget::~Widget() = default;</code> in widget.cpp', '<span class="c-g">yes</span>', '<span class="c-g">compiles</span>']])}
        <p>Same rule for the move-assignment (it destroys the old Impl) and, subtly, for constructors (they must be able to destroy the Impl if a later member throws).</p>` },
      { title: 'Moved-from pimpl objects hold nullptr', html: `<p>After <code>Widget b = std::move(a);</code> the <code>unique_ptr</code> inside <code>a</code> is <b>null</b>. Calling <code>a.click()</code> now dereferences null → crash. Options: document "moved-from Widgets may only be destroyed or assigned to", or make every member function check <code>if (!pImpl_)</code>. Interviewers like this follow-up because it shows you understand that pimpl changes the class's invariants.</p>`,
        code: R`
          #include <memory>
          #include <iostream>
          class Handle {
              struct Impl { int value = 7; };
              std::unique_ptr<Impl> p_ = std::make_unique<Impl>();
          public:
              bool valid() const noexcept { return p_ != nullptr; }   // expose the moved-from state
              int value() const { return p_ ? p_->value : -1; }       // defensive access
          };
          int main() {
              Handle a;
              Handle b = std::move(a);                 // a.p_ is now nullptr
              std::cout << a.valid() << " " << a.value() << " " << b.value() << "\n";   // 0 -1 7
          }` },
      { title: 'The const hole: const methods can modify *pImpl_', html: `<p>Inside a <code>const</code> member function, <code>pImpl_</code> itself is const (a <code>const unique_ptr&lt;Impl&gt;</code>), but the <b>Impl it points to is not</b>. So <code>int clicks() const { return ++pImpl_-&gt;clicks; }</code> compiles! Const-ness does not propagate through pointers. Fixes: a private helper <code>const Impl&amp; impl() const</code>, or <code>std::experimental::propagate_const&lt;std::unique_ptr&lt;Impl&gt;&gt;</code> (Library Fundamentals TS v2), which makes the pointee const in const methods.</p>`,
        code: R`
          #include <memory>
          class Counter {
              struct Impl { int n = 0; };
              std::unique_ptr<Impl> p_ = std::make_unique<Impl>();
              Impl& impl() { return *p_; }                 // non-const access
              const Impl& impl() const { return *p_; }     // const access: restores const-correctness
          public:
              int peek() const { return impl().n; }        // ++impl().n here would NOT compile
              void bump() { ++impl().n; }
          };
          int main() { Counter c; c.bump(); return c.peek() == 1 ? 0 : 1; }` },
      { title: 'unique_ptr vs shared_ptr for the impl pointer', html: `<p><code>std::shared_ptr&lt;Impl&gt;</code> type-erases its deleter at construction time, so it <b>does</b> compile with an implicit destructor in the header. But it changes semantics: copying a Widget would <b>share</b> state (both copies see each other's clicks) and adds an atomic ref-count. Use <code>unique_ptr</code> (exclusive ownership, explicit deep copy) unless sharing is the goal — e.g. an immutable, copy-on-write implementation.</p>
        ${H.table(['', 'unique_ptr&lt;Impl&gt;', 'shared_ptr&lt;Impl&gt;'], [['implicit dtor in header', '<span class="c-r">error</span>', 'compiles'], ['copy semantics', 'you write deep copy', 'shallow — shared state'], ['overhead', 'one pointer', 'two pointers + control block + atomics']])}` }
    ],
    deepDive: `<p>🟣 <b>Production details.</b></p>
      <ul>
        <li><b>Which special members go to the .cpp?</b> Destructor, move constructor, move assignment, copy constructor/assignment (if you support copying), and the constructors. Write <code>= default</code> there for the move operations — they still need <code>Impl</code> complete to be generated.</li>
        <li><b>Fast pimpl / in-place pimpl:</b> to avoid the heap allocation, reserve raw storage in the class (<code>alignas(Impl-alignment) std::byte buf_[N];</code>) and placement-new the Impl into it; a <code>static_assert(sizeof(Impl) &lt;= N)</code> in the .cpp guards it. You keep fast builds and lose nothing to malloc — but the header now hard-codes a size, so ABI stability is only as good as your spare capacity.</li>
        <li><b>Virtual functions + pimpl:</b> public virtual functions stay on the outer class; the Impl holds data and non-virtual helpers. Qt uses a d-pointer (Impl) plus a q-pointer back to the public object so the Impl can call public API.</li>
        <li><b>Templates can't be pimpl'd easily:</b> their bodies must be visible to callers. You can pimpl the <i>non-template</i> core and keep a thin template layer.</li>
        <li><b>Performance:</b> one allocation per object and a pointer chase per access. For small, hot value types (points, iterators) pimpl is the wrong tool; it shines for big "service" classes (a Database connection, a UI window, an HTTP client) where builds and ABI matter more than nanoseconds.</li>
        <li><b>Modules (C++20)</b> reduce the build-time motivation (a module interface is compiled once and private changes may not ripple), but they do <b>not</b> make the layout ABI-stable — pimpl stays relevant for binary SDKs.</li>
      </ul>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> converting a class to pimpl is mechanical boilerplate — exactly what an assistant does well: move members into <code>Impl</code>, write forwarding functions, declare/define special members. Let it do the typing.</p>
      <p><b>Use AI as a partner:</b> "Convert this class to pimpl with unique_ptr; put every special member out of line; keep copy semantics deep" — then ask it to produce a list of which client files no longer need which includes.</p>
      <p><b>Where AI goes wrong:</b> it frequently leaves the destructor implicit (incomplete-type error), declares <code>~Widget() = default;</code> <b>in the header</b> (same error), forgets the moved-from null state, silently makes the class non-copyable, or uses <code>shared_ptr</code> and accidentally shares state between copies.</p>
      <p><b>What you must own:</b> the <i>why</i> — when the build-time and ABI wins are worth the heap allocation and indirection, and how to explain the incomplete-type rule in an interview.</p>`,
    problems: [{
      title: 'Pimpl a Logger with Correct Special Members', level: 'Medium', tags: ['pimpl', 'unique_ptr', 'rule of five'], companies: ['Adobe', 'Qualcomm', 'Bloomberg'],
      statement: `<p>A <code>Logger</code> class currently exposes its private <code>std::vector&lt;std::string&gt; lines_</code>, <code>std::string prefix_</code> and <code>int level_</code> in its header. Convert it to the pimpl idiom so private changes no longer ripple. It must support: construction with a prefix, <code>log(msg)</code>, <code>size()</code>, <b>deep copy</b>, and <b>cheap move</b>.</p>`,
      constraints: `<p>Use <code>std::unique_ptr&lt;Impl&gt;</code>. The header part must not define <code>Impl</code>. All special members that can destroy an Impl must be defined after <code>Impl</code> is complete.</p>`,
      example: `<pre>Logger a("[app] ");  a.log("start");  a.log("ready");
Logger b = a;        b.log("only in b");
a.size() → ${H.c('g', '2')}    b.size() → ${H.c('g', '3')}    (deep copy: independent)
Logger c = std::move(a);  c.size() → ${H.c('g', '2')}   (a is now empty/moved-from)</pre>`,
      brute: { why: `<p>The "brute" version keeps every member in the header. It works, but every change to a private member forces every includer to recompile and changes <code>sizeof(Logger)</code> (ABI break). With 300 files including <code>logger.h</code>, adding one field costs a full rebuild.</p>`,
        code: R`
          #include <string>
          #include <vector>
          #include <iostream>
          // logger.h — private details visible to (and compiled into) every client
          class Logger {
          public:
              explicit Logger(std::string prefix) : prefix_(std::move(prefix)) {}
              void log(const std::string& m) { lines_.push_back(prefix_ + m); }
              std::size_t size() const { return lines_.size(); }
          private:
              std::vector<std::string> lines_;
              std::string prefix_;
              int level_ = 0;
          };
          int main() { Logger a("[app] "); a.log("x"); std::cout << a.size() << "\n"; }` },
      mcq: { q: 'You write <code>~Logger() = default;</code> <b>inside the class in the header</b>. What happens?', options: ['Compile error: unique_ptr deletes an incomplete Impl', 'It works exactly like defining it in the .cpp', 'Memory leak: Impl is never freed', 'Linker error: duplicate destructor'], answer: 0, explain: 'Defaulting it in the header defines it there, where <code>Impl</code> is incomplete — the same problem as the implicit destructor. Only <i>declare</i> it in the header.' },
      hints: [`<p>The header keeps only <code>struct Impl;</code> and <code>std::unique_ptr&lt;Impl&gt; p_;</code>. Everything private moves into <code>struct Logger::Impl</code> in the .cpp part.</p>`, `<p>Declare destructor, both moves and both copies in the header. In the .cpp: moves and destructor <code>= default</code>; copy constructor does <code>make_unique&lt;Impl&gt;(*o.p_)</code>.</p>`, `<p>Copy-assignment: either assign <code>*p_ = *o.p_</code> (needs both non-null) or use copy-and-swap: <code>Logger tmp(o); swap(p_, tmp.p_);</code> — strong guarantee and handles a moved-from <code>*this</code>.</p>`],
      solution: {
        approach: `<p>Split the class: public interface + opaque <code>Impl</code>. Every special member is declared in the header and defined after <code>Impl</code>'s definition. Copying deep-copies the Impl; moving just moves the pointer. Copy-assignment uses copy-and-swap so it also works when <code>*this</code> was moved-from.</p>`,
        code: R`
          // ===== logger.h =====
          #include <memory>
          #include <string>
          class Logger {
          public:
              explicit Logger(std::string prefix);
              ~Logger();
              Logger(const Logger& o);
              Logger& operator=(const Logger& o);
              Logger(Logger&&) noexcept;
              Logger& operator=(Logger&&) noexcept;
              void log(const std::string& msg);
              std::size_t size() const;
          private:
              struct Impl;                         // opaque
              std::unique_ptr<Impl> p_;
          };

          // ===== logger.cpp =====
          #include <vector>
          #include <iostream>
          struct Logger::Impl {
              std::vector<std::string> lines;
              std::string prefix;
              int level = 0;                       // add fields freely: clients never recompile
          };
          Logger::Logger(std::string prefix) : p_(std::make_unique<Impl>()) { p_->prefix = std::move(prefix); }
          Logger::~Logger() = default;                                  // Impl complete here
          Logger::Logger(const Logger& o) : p_(o.p_ ? std::make_unique<Impl>(*o.p_) : nullptr) {}
          Logger& Logger::operator=(const Logger& o) {                  // copy-and-swap: strong guarantee
              Logger tmp(o);
              std::swap(p_, tmp.p_);
              return *this;
          }
          Logger::Logger(Logger&&) noexcept = default;
          Logger& Logger::operator=(Logger&&) noexcept = default;
          void Logger::log(const std::string& msg) { p_->lines.push_back(p_->prefix + msg); }
          std::size_t Logger::size() const { return p_ ? p_->lines.size() : 0; }

          // ===== main.cpp =====
          int main() {
              Logger a("[app] ");
              a.log("start"); a.log("ready");
              Logger b = a;  b.log("only in b");
              std::cout << a.size() << " " << b.size() << "\n";     // 2 3
              Logger c = std::move(a);
              std::cout << c.size() << " " << a.size() << "\n";     // 2 0
          }`,
        dry: { head: ['statement', 'a.p_', 'b.p_', 'c.p_', 'heap Impls'], rows: [
          ['Logger a("[app] ")', 'Impl#1 (0 lines)', '—', '—', '1'], ['a.log ×2', 'Impl#1 (2)', '—', '—', '1'], ['Logger b = a', 'Impl#1 (2)', 'Impl#2 (2) deep copy', '—', '2'], ['b.log', 'Impl#1 (2)', 'Impl#2 (3)', '—', '2'], ['Logger c = std::move(a)', '<span class="c-r">nullptr</span>', 'Impl#2 (3)', 'Impl#1 (2)', '2 (no new alloc)']] },
        complexity: `<p>Copy O(total log size); move O(1) (pointer steal); <code>log</code> amortized O(len). One heap allocation per Logger.</p>`,
        followUps: ['How would you avoid the heap allocation (fast pimpl)? What do you lose?', 'Is <code>Logger</code> still ABI-stable if you add a <i>public virtual</i> function? (No — vtable layout changes.)', 'How does <code>std::experimental::propagate_const</code> help?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — TYPE ERASURE
     ====================================================================== */
  function erasureViz(input) {
    var AREA = { Circle: 'Circle{r=1} → 3.14', Rect: 'Rect{2,3} → 6', Blob: 'Blob{"x"} → 42', Square: 'Square{4} → 16' };
    var kinds = words(input, 'Circle Rect Blob', 4, ['Circle', 'Rect', 'Blob', 'Square'], 'types (Circle, Rect, Blob, Square)');
    var frames = [], vec = [];
    function chain(T, step, label) {
      var hl = {}, ehl = {}, tags = {};
      var order = ['call', 'any', 'con', 'model', 'obj'];
      for (var i = 0; i < order.length; i++) if (i <= step) hl[order[i]] = i === step ? 'cur' : 'done';
      if (step >= 1) ehl['call-any'] = 'win';
      if (step >= 2) { ehl['any-con'] = 'win'; tags.con = 'virtual area()'; }
      if (step >= 3) { ehl['con-model'] = 'win'; tags.model = 'override'; }
      if (step >= 4) { ehl['model-obj'] = 'ok'; hl.obj = 'ok'; tags.obj = 'T::area()'; }
      return { type: 'graph', label: label, directed: true, height: 44, nodes: [
        { id: 'call', label: 'call area()', x: 9, y: 22, shape: 'box' },
        { id: 'any', label: 'AnyShape', x: 29, y: 22, shape: 'box' },
        { id: 'con', label: 'Concept vtbl', x: 50, y: 22, shape: 'box' },
        { id: 'model', label: 'Model<' + T + '>', x: 71, y: 22, shape: 'box' },
        { id: 'obj', label: T, x: 91, y: 22, shape: 'box' }],
        edges: [['call', 'any', ''], ['any', 'con', 'self_->'], ['con', 'model', 'vptr'], ['model', 'obj', 'obj.']], hl: hl, ehl: ehl, tags: tags };
    }
    function vecPart(hlIdx) {
      var hl = {}; if (hlIdx !== undefined) hl[String(hlIdx)] = 'ok';
      return { type: 'map', label: 'std::vector&lt;AnyShape&gt; shapes (each slot = one pointer)', entries: vec.map(function (t, i) { return [String(i), 'AnyShape → heap Model<' + t + '>']; }), hl: hl };
    }
    frames.push({ narr: 'We have <b>unrelated</b> types (' + kinds.join(', ') + '): no common base class, no <code>virtual</code>. Each just happens to have a <code>double area() const</code>. Goal: store them all in one <code>std::vector&lt;AnyShape&gt;</code> <b>by value</b>.',
      parts: [codePart('the wrapper (simplified)', 'class AnyShape {\n  struct Concept { virtual double area() const = 0; ... };\n  template <class T> struct Model : Concept {\n    T obj;\n    double area() const override { return obj.area(); }\n  };\n  std::unique_ptr<Concept> self_;\npublic:\n  template <class T> AnyShape(T t) : self_(make_unique<Model<T>>(move(t))) {}\n  double area() const { return self_->area(); }\n};', { 2: 'sel', 3: 'sel', 7: 'sel', 9: 'cur' }), vecPart()] });
    kinds.forEach(function (T, i) {
      vec.push(T);
      frames.push({ narr: '<code>shapes.push_back(' + T + '{...})</code>: the <b>template constructor</b> deduces <code>T = ' + T + '</code> and creates a <code>Model&lt;' + T + '&gt;</code> on the heap that <b>owns a copy</b> of the ' + T + '. The type ' + T + ' is now "erased": from outside, slot ' + i + ' is just an <code>AnyShape</code> holding a <code>Concept*</code>.',
        parts: [chain(T, 3, 'what slot ' + i + ' looks like'), vecPart(i), codePart('constructor', 'template <class T>\nAnyShape(T t)\n  : self_(std::make_unique<Model<T>>(std::move(t))) {}', { 3: 'ok' })] });
    });
    var T0 = kinds[0];
    frames.push({ narr: 'Now call <code>shapes[0].area()</code>. Step 1: the public, <b>non-virtual</b> <code>AnyShape::area()</code> runs. It knows nothing about ' + T0 + '; it only has <code>self_</code>.',
      parts: [chain(T0, 1, 'calling through the erased type'), codePart('AnyShape::area', 'double area() const { return self_->area(); }', { 1: 'cur' })] });
    frames.push({ narr: 'Step 2: <code>self_-&gt;area()</code> is a <b>virtual call on the internal Concept interface</b>. The vptr inside the heap object points at <code>Model&lt;' + T0 + '&gt;</code>\'s vtable. (The inheritance still exists — it is just hidden inside the wrapper instead of being forced on your types.)',
      parts: [chain(T0, 3, 'calling through the erased type')] });
    frames.push({ narr: 'Step 3: <code>Model&lt;' + T0 + '&gt;::area()</code> simply forwards to <code>obj.area()</code> — an ordinary <b>non-virtual</b> call on the real ' + T0 + '. Result: <b>' + AREA[T0] + '</b>.',
      parts: [chain(T0, 4, 'calling through the erased type'), { type: 'vars', label: 'result', vals: { 'shapes[0].area()': AREA[T0].split('→ ')[1] }, hl: { 'shapes[0].area()': 'ok' } }] });
    frames.push({ narr: 'Copying: <code>AnyShape copy = shapes[0];</code> The wrapper cannot write <code>new Model&lt;T&gt;</code> — it no longer knows T! So the Concept has a virtual <code>clone()</code>; <code>Model&lt;T&gt;</code> implements it (it <i>does</i> know T). Deep copy, true value semantics.',
      parts: [{ type: 'graph', label: 'virtual clone() = the "virtual constructor"', directed: true, height: 40, nodes: [
        { id: 'a', label: 'shapes[0]', x: 12, y: 10, shape: 'box' }, { id: 'm1', label: 'Model<' + T0 + '> #1', x: 50, y: 10, shape: 'box' },
        { id: 'b', label: 'copy', x: 12, y: 32, shape: 'box' }, { id: 'm2', label: 'Model<' + T0 + '> #2', x: 50, y: 32, shape: 'box' }],
        edges: [['a', 'm1', 'self_'], ['m1', 'm2', 'clone()'], ['b', 'm2', 'self_']], hl: { m2: 'ok', b: 'ok' }, ehl: { 'm1-m2': 'ok' } },
        codePart('copy constructor', 'AnyShape(const AnyShape& o) : self_(o.self_->clone()) {}\n// in Model<T>:\nstd::unique_ptr<Concept> clone() const override {\n  return std::make_unique<Model>(*this);\n}', { 1: 'cur', 4: 'ok' })] });
    frames.push({ narr: 'Summary: type erasure = <b>a template constructor that captures the type</b> + <b>an internal virtual interface</b> + <b>a value-semantic outer class</b>. You use this every day: <code>std::function</code>, <code>std::any</code>, <code>std::move_only_function</code>, and the deleter inside <code>std::shared_ptr</code> are all built this way.',
      parts: [{ type: 'table', label: 'four ways to handle "many types"', columns: ['technique', 'set of types', 'types must inherit?', 'dispatch', 'value semantics'], rows: [
        ['virtual + base class', 'open', 'yes (intrusive)', 'run time', 'no (pointers)'], ['templates / CRTP', 'open', 'no', 'compile time', 'yes, but no mixing'],
        ['std::variant', 'closed (listed)', 'no', 'run time (visit)', 'yes'], ['type erasure', 'open', 'no', 'run time', 'yes']], hl: { 3: 'sel' } }, vecPart()] });
    return frames;
  }

  topics.push({
    title: 'Type Erasure: Runtime Polymorphism Without Inheritance',
    analogy: `<p>Think of a <b>universal power adapter</b> at an airport. Your laptop, a phone and a hair dryer were never designed for each other — different plugs, different makers, no shared "parent". The adapter wraps <i>whatever</i> you plug in and exposes one standard socket to the wall. The wall only knows "adapter"; it has <b>forgotten</b> (erased) what device is inside. That's exactly what <code>std::function</code> does for anything callable, and what your own <code>AnyShape</code> can do for anything with an <code>area()</code>.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> Classic polymorphism makes every type inherit from a base class (<code>Circle : Shape</code>). That is <b>intrusive</b>: you can't add a base class to <code>int</code>, a lambda, or a class from a third-party library, and you end up passing <code>unique_ptr&lt;Shape&gt;</code> everywhere instead of plain values.</p>
      <p><b>Type erasure</b> flips it: the types stay completely independent, and a <b>wrapper class</b> adapts them. It has three parts:</p>
      ${H.table(['part', 'what it is', 'who sees it'], [['<b>Concept</b>', 'a private abstract interface: <code>virtual double area() const = 0;</code> + <code>clone()</code>', 'only the wrapper'], ['<b>Model&lt;T&gt;</b>', 'a private class template that holds a <code>T</code> and implements Concept by forwarding to <code>T</code>\'s functions', 'only the wrapper'], ['<b>Wrapper</b> (<code>AnyShape</code>)', 'holds <code>unique_ptr&lt;Concept&gt;</code>; a <b>template constructor</b> accepts any T and builds <code>Model&lt;T&gt;</code>', 'everyone']])}
      <p>The moment the template constructor finishes, the concrete type is gone from the wrapper's type — <code>AnyShape</code> holding a Circle and <code>AnyShape</code> holding a Rect are the <b>same C++ type</b>, so they fit in one <code>vector&lt;AnyShape&gt;</code>, can be copied, returned by value, and compared. That is why Sean Parent called it "runtime polymorphism with value semantics".</p>
      <p><b>The standard library is full of it:</b></p>
      <ul>
        <li><code>std::function&lt;int(int)&gt;</code> — stores any callable: function pointer, lambda with captures, functor object.</li>
        <li><code>std::any</code> — stores any copyable value; get it back with <code>std::any_cast&lt;T&gt;</code>.</li>
        <li><code>std::shared_ptr&lt;T&gt;</code> — its control block stores a type-erased <b>deleter</b>, which is why <code>shared_ptr&lt;void&gt;</code> still calls the right destructor.</li>
        <li><code>std::move_only_function</code> (C++23), <code>std::function_ref</code> (C++26) — variants with different ownership rules.</li>
      </ul>
      <p><b>Price tag:</b> usually one heap allocation per wrapped object (unless the wrapper has a <b>small buffer</b>) plus one indirect call per operation — the same costs as virtual, but you gain non-intrusiveness and value semantics.</p>`,
    clues: [
      '"Store lambdas with different captures in one container" → <code>std::function</code> (type erasure)',
      '"Polymorphism <b>without</b> a common base class", "non-intrusive", "third-party types I cannot modify" → type erasure',
      '"Value semantics for polymorphic objects", "no <code>unique_ptr</code> everywhere" → type-erased wrapper',
      '"Implement <code>std::function</code> / <code>std::any</code> yourself" → Concept + Model&lt;T&gt; + template constructor',
      '"Why does <code>shared_ptr&lt;void&gt;</code> call the right destructor?" → type-erased deleter in the control block',
      '"Closed set of known types" → prefer <code>std::variant</code>; "open set" → type erasure'
    ],
    code: [R`
      #include <iostream>
      #include <memory>
      #include <vector>
      #include <string>

      // Three UNRELATED types. No common base class, no virtual functions.
      struct Circle { double r;    double area() const { return 3.14159 * r * r; } };
      struct Rect   { double w, h; double area() const { return w * h; } };
      struct Blob   { std::string name; double area() const { return 42; } };

      // The type-erased wrapper: holds "anything that has area()" by value.
      class AnyShape {
          struct Concept {                                  // 1) the internal interface
              virtual ~Concept() = default;
              virtual double area() const = 0;
              virtual std::unique_ptr<Concept> clone() const = 0;   // needed for copying
          };
          template <typename T>
          struct Model final : Concept {                    // 2) one adapter per concrete type
              T obj;                                        //    stores the real object by value
              explicit Model(T t) : obj(std::move(t)) {}
              double area() const override { return obj.area(); }   // forwards to T's own function
              std::unique_ptr<Concept> clone() const override { return std::make_unique<Model>(*this); }
          };
          std::unique_ptr<Concept> self_;                   // 3) the only data member
      public:
          template <typename T>
          AnyShape(T t) : self_(std::make_unique<Model<T>>(std::move(t))) {}   // implicit: "accept anything"
          AnyShape(const AnyShape& o) : self_(o.self_->clone()) {}               // deep copy via clone
          AnyShape(AnyShape&&) noexcept = default;
          AnyShape& operator=(AnyShape o) noexcept { self_.swap(o.self_); return *this; }  // copy-and-swap!
          double area() const { return self_->area(); }                          // the public face
      };

      int main() {
          std::vector<AnyShape> shapes{Circle{1}, Rect{2, 3}, Blob{"x"}};       // value semantics
          AnyShape copy = shapes[1];                                             // deep copy
          shapes[1] = Circle{2};                                                 // copy unaffected
          for (const auto& s : shapes) std::cout << s.area() << " ";
          std::cout << "| copy = " << copy.area() << "\n";                     // 3.14159 12.5664 42 | copy = 6
      }
    `],
    codeTitle: ['AnyShape: Concept + Model<T> + value-semantic wrapper'],
    viz: { title: 'Inside a type-erased wrapper', input: 'Circle Rect Blob', inputLabel: 'Types to store (Circle, Rect, Blob, Square)', gen: erasureViz },
    examples: [
      { title: 'std::function: one type for every callable', html: `<p>A free function, a capturing lambda and a functor have three different C++ types. <code>std::function&lt;int(int)&gt;</code> erases all of them behind one signature. Small callables are usually stored in an internal buffer (no heap allocation) — that is the <b>small buffer optimization</b>; big captures go to the heap.</p>`,
        code: R`
          #include <functional>
          #include <iostream>
          #include <vector>
          int twice(int x) { return 2 * x; }
          struct AddN { int n; int operator()(int x) const { return x + n; } };
          int main() {
              int base = 100;
              std::vector<std::function<int(int)>> ops{
                  twice,                                   // function pointer
                  [base](int x) { return base + x; },      // lambda with a capture
                  AddN{5}                                  // functor object
              };
              for (auto& f : ops) std::cout << f(1) << " ";   // 2 101 6
              std::function<int(int)> empty;
              std::cout << (empty ? "set" : "empty") << "\n"; // calling 'empty' would throw std::bad_function_call
          }` },
      { title: 'std::any: erased value, checked retrieval', html: `<p><code>std::any</code> erases the type but remembers its <code>typeid</code>. <code>any_cast&lt;T&gt;(a)</code> on a <b>value/reference</b> throws <code>std::bad_any_cast</code> if T is wrong; <code>any_cast&lt;T&gt;(&amp;a)</code> on a <b>pointer</b> returns <code>nullptr</code> instead — a nice exception-free check.</p>`,
        code: R`
          #include <any>
          #include <iostream>
          #include <string>
          int main() {
              std::any a = 42;
              a = std::string("now a string");                  // same variable, different type
              if (auto* s = std::any_cast<std::string>(&a)) std::cout << *s << "\n";
              std::cout << (std::any_cast<int>(&a) == nullptr) << "\n";      // 1: not an int
              try { (void)std::any_cast<int>(a); }
              catch (const std::bad_any_cast&) { std::cout << "bad_any_cast\n"; }
          }` },
      { title: 'shared_ptr&lt;void&gt; still runs the right destructor', html: `<p>When <code>make_shared&lt;Noisy&gt;()</code> creates the control block, it stores a <b>type-erased deleter</b> that knows "this is a Noisy". Converting to <code>shared_ptr&lt;void&gt;</code> later doesn't matter — the deleter was captured at creation. Contrast <code>unique_ptr</code>: its deleter is part of its <i>type</i>, which is why pimpl needs the out-of-line destructor.</p>`,
        code: R`
          #include <iostream>
          #include <memory>
          struct Noisy { ~Noisy() { std::cout << "~Noisy\n"; } };
          int main() {
              {
                  std::shared_ptr<void> p = std::make_shared<Noisy>();   // erased to void
              }                                                          // prints ~Noisy
              std::cout << "done\n";
          }` },
      { title: 'variant vs type erasure: closed vs open sets', html: `<p>If you know <b>all</b> the types up front, <code>std::variant&lt;Circle, Rect&gt;</code> + <code>std::visit</code> is simpler and needs no heap. Adding a new type means editing the variant and every visitor (closed set). Type erasure lets anyone add a new type without touching the wrapper (open set).</p>
        ${H.table(['question', 'variant', 'type erasure'], [['new type added by a client?', '<span class="c-r">edit the variant</span>', '<span class="c-g">just pass it in</span>'], ['new operation added?', '<span class="c-g">write a new visitor</span>', '<span class="c-r">edit Concept and Model</span>'], ['heap allocation', 'none (inline storage = largest type)', 'usually one (unless SBO)']])}` }
    ],
    deepDive: `<p>🟣 <b>Engineering a production-quality wrapper.</b></p>
      <ul>
        <li><b>Small buffer optimization (SBO):</b> reserve e.g. 3 pointers' worth of aligned bytes inside the wrapper; if <code>sizeof(T)</code> fits and T is nothrow-movable, placement-new the Model there instead of on the heap. libstdc++'s <code>std::function</code> stores callables up to 16 bytes inline; libc++ and MSVC use larger buffers. The nothrow-move requirement exists because the wrapper's move constructor must stay <code>noexcept</code>.</li>
        <li><b>Manual vtables:</b> instead of a virtual Concept, store a pointer to a static struct of function pointers (<code>{ destroy, clone, area }</code>) built per T. Same speed, but you control the layout (handy for SBO and for cross-library ABI).</li>
        <li><b>Constrain the template constructor.</b> An unconstrained <code>template &lt;class T&gt; AnyShape(T)</code> also matches <code>AnyShape</code> itself — passing a non-const <code>AnyShape&amp;</code> may pick the template over the copy constructor and wrap a wrapper inside a wrapper! Constrain with <code>requires (!std::same_as&lt;std::remove_cvref_t&lt;T&gt;, AnyShape&gt;)</code> and with a concept like <code>HasArea&lt;T&gt;</code> for good error messages.</li>
        <li><b>Copyable vs move-only:</b> <code>std::function</code> requires copyable callables, so a lambda capturing a <code>unique_ptr</code> can't go in it. C++23 <code>std::move_only_function</code> fixes that; C++26 <code>std::function_ref</code> is a non-owning, never-allocating view for callbacks.</li>
        <li><b>Performance:</b> a type-erased call costs about the same as a virtual call (an indirect jump that blocks inlining) plus a possible allocation at construction. In hot loops over homogeneous data, templates win; at API boundaries (callbacks, plugins, task queues) type erasure wins on decoupling.</li>
        <li><b>Where you meet it in system design:</b> task queues (<code>std::queue&lt;std::function&lt;void()&gt;&gt;</code> in a thread pool), event systems, plugin registries, serialization frameworks, <code>std::pmr::polymorphic_allocator</code> (erases the resource behind a virtual interface).</li>
      </ul>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> an assistant will produce a Concept/Model wrapper or a mini <code>std::function</code> on request, including SBO. That's useful scaffolding — but the subtle bugs are exactly the ones it tends to miss.</p>
      <p><b>Use AI as a partner:</b> "Add SBO to this wrapper and explain the noexcept-move requirement", "Write tests that check copy independence, self-assignment, moved-from state and that the wrapper never wraps itself".</p>
      <p><b>Where AI goes wrong:</b> unconstrained template constructors (wrapper-in-wrapper), forgetting <code>clone()</code> so copies share or slice, missing virtual destructor in Concept, SBO without alignment (<code>alignas</code>), and claiming <code>std::function</code> "never allocates".</p>
      <p><b>What you must own:</b> choosing between virtual, templates, variant and type erasure for a given API, and explaining in two sentences how <code>std::function</code> works inside.</p>`,
    problems: [{
      title: 'Build a Mini std::function', level: 'Hard', tags: ['type erasure', 'templates', 'variadic'], companies: ['Google', 'Jane Street', 'Citadel'],
      statement: `<p>Implement <code>Function&lt;R(Args...)&gt;</code>, a simplified <code>std::function</code>: it must store <b>any</b> callable with that signature (function pointers, capturing lambdas, functors), be <b>copyable</b> (deep copy), <b>movable</b>, testable with <code>explicit operator bool</code>, and callable with <code>operator()</code>. Calling an empty Function throws <code>std::bad_function_call</code>.</p>`,
      constraints: `<p>No <code>std::function</code> inside. C++20. Heap allocation per stored callable is fine (no SBO required).</p>`,
      example: `<pre>int k = 10;
Function&lt;int(int)&gt; f = [k](int x) { return x + k; };
Function&lt;int(int)&gt; g = f;        // deep copy
f = [](int x) { return x * x; };
f(3) → ${H.c('g', '9')}     g(3) → ${H.c('g', '13')}     Function&lt;int(int)&gt;{} → ${H.c('r', 'empty (false)')}</pre>`,
      brute: { why: `<p>The naive approach stores a plain <b>function pointer</b> <code>R(*)(Args...)</code>. It works for free functions and capture-less lambdas, but a lambda that captures <code>k</code> has state — it cannot convert to a function pointer, so the code doesn't even compile for the most common use-case.</p>`,
        code: R`
          #include <iostream>
          template <typename Sig> class FnPtr;
          template <typename R, typename... Args>
          class FnPtr<R(Args...)> {
              R (*fp_)(Args...) = nullptr;               // only a raw function pointer
          public:
              FnPtr(R (*fp)(Args...)) : fp_(fp) {}
              R operator()(Args... a) const { return fp_(a...); }
          };
          int sq(int x) { return x * x; }
          int main() {
              FnPtr<int(int)> f = sq;                   // ok
              FnPtr<int(int)> g = +[](int x) { return x + 1; };  // ok: unary + converts a capture-less lambda to a pointer
              // int k = 10; FnPtr<int(int)> h = [k](int x) { return x + k; };   // ERROR: cannot convert
              std::cout << f(3) << " " << g(3) << "\n";
          }` },
      mcq: { q: 'Inside the Function wrapper, how do you copy a stored callable whose type you no longer know?', options: ['A virtual <code>clone()</code> in the internal Concept, implemented by <code>Model&lt;F&gt;</code>', '<code>memcpy</code> the bytes', '<code>typeid</code> + a switch statement', 'You cannot — Function must be move-only'], answer: 0, explain: 'Only <code>Model&lt;F&gt;</code> still knows F, so copying must be delegated to it through a virtual function — the "virtual constructor" idiom.' },
      hints: [`<p>Partially specialize on the function type: <code>template &lt;class Sig&gt; class Function;</code> then <code>template &lt;class R, class... Args&gt; class Function&lt;R(Args...)&gt;</code>.</p>`, `<p>Internal <code>struct Concept { virtual R call(Args...) = 0; virtual unique_ptr&lt;Concept&gt; clone() const = 0; virtual ~Concept() = default; };</code> and <code>template &lt;class F&gt; struct Model : Concept { F f; ... }</code>.</p>`, `<p>Constrain the template constructor so it does not hijack copies of Function itself: <code>requires (!std::is_same_v&lt;std::decay_t&lt;F&gt;, Function&gt;)</code>. Use <code>std::forward&lt;Args&gt;(args)...</code> when calling. Throw <code>std::bad_function_call</code> if empty.</p>`],
      solution: {
        approach: `<p>Classic Concept/Model type erasure, specialized on the signature <code>R(Args...)</code>. The template constructor captures the callable's real type F into <code>Model&lt;F&gt;</code>; calls go through the virtual <code>call</code>; copies go through virtual <code>clone</code>; assignment reuses copy-and-swap.</p>`,
        code: R`
          #include <functional>     // std::bad_function_call
          #include <iostream>
          #include <memory>
          #include <type_traits>
          #include <utility>

          template <typename Sig> class Function;                 // primary template: never defined

          template <typename R, typename... Args>
          class Function<R(Args...)> {
              struct Concept {
                  virtual ~Concept() = default;
                  virtual R call(Args... args) = 0;
                  virtual std::unique_ptr<Concept> clone() const = 0;
              };
              template <typename F>
              struct Model final : Concept {
                  F f;
                  explicit Model(F fn) : f(std::move(fn)) {}
                  R call(Args... args) override { return std::invoke(f, std::forward<Args>(args)...); }
                  std::unique_ptr<Concept> clone() const override { return std::make_unique<Model>(f); }
              };
              std::unique_ptr<Concept> self_;
          public:
              Function() noexcept = default;
              template <typename F>
                  requires (!std::is_same_v<std::decay_t<F>, Function> && std::is_invocable_r_v<R, std::decay_t<F>&, Args...>)
              Function(F&& f) : self_(std::make_unique<Model<std::decay_t<F>>>(std::forward<F>(f))) {}
              Function(const Function& o) : self_(o.self_ ? o.self_->clone() : nullptr) {}
              Function(Function&&) noexcept = default;
              Function& operator=(Function o) noexcept { self_.swap(o.self_); return *this; }   // copy-and-swap
              explicit operator bool() const noexcept { return self_ != nullptr; }
              R operator()(Args... args) const {
                  if (!self_) throw std::bad_function_call();
                  return self_->call(std::forward<Args>(args)...);
              }
          };

          int main() {
              int k = 10;
              Function<int(int)> f = [k](int x) { return x + k; };
              Function<int(int)> g = f;                    // deep copy through clone()
              f = [](int x) { return x * x; };             // template ctor + copy-and-swap assignment
              std::cout << f(3) << " " << g(3) << "\n";    // 9 13
              Function<int(int)> e;
              std::cout << static_cast<bool>(e) << "\n";   // 0
              try { e(1); } catch (const std::bad_function_call&) { std::cout << "empty call\n"; }
          }`,
        dry: { head: ['statement', 'f.self_', 'g.self_', 'output'], rows: [
          ['f = [k](int x){...}', 'Model&lt;Lambda1&gt; {k=10}', 'null', ''], ['g = f', 'Model&lt;Lambda1&gt; #1', 'Model&lt;Lambda1&gt; #2 (clone)', ''], ['f = [](int x){ x*x }', 'Model&lt;Lambda2&gt; (old one freed)', 'Model&lt;Lambda1&gt; #2', ''], ['f(3), g(3)', 'call → 3*3', 'call → 3+10', '<span class="c-g">9 13</span>'], ['e(1) on empty', 'null', '—', '<span class="c-r">bad_function_call</span>']] },
        complexity: `<p>Construction: one heap allocation. Call: one virtual (indirect) call. Copy: one allocation + copy of the callable. Move: O(1) pointer steal.</p>`,
        followUps: ['Add a small buffer (SBO) for callables ≤ 16 bytes. Why must they be nothrow-movable?', 'Make a move-only variant (like <code>std::move_only_function</code>) that accepts lambdas capturing <code>unique_ptr</code>.', 'Why is <code>operator()</code> const but <code>call</code> non-const here, and what does <code>std::function</code> do about mutable lambdas?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — COPY-AND-SWAP
     ====================================================================== */
  function swapViz(input) {
    var mode = oneOf(input, 'copy', ['copy', 'self', 'move', 'throw']);
    var frames = [];
    var CODE = {
      copy: 'String a("hi"), b("world");\na = b;                       // copy-assign\nString& operator=(String other) noexcept {\n    swap(*this, other);      // exchange pointers\n    return *this;\n}                            // ~other() frees old buffer',
      self: 'String a("hi");\na = a;                       // self-assignment!\nString& operator=(String other) noexcept {\n    swap(*this, other);\n    return *this;\n}                            // ~other() frees old buffer',
      move: 'String a("hi"), b("world");\na = std::move(b);            // move-assign\nString& operator=(String other) noexcept {\n    swap(*this, other);\n    return *this;\n}                            // ~other() frees old buffer',
      throw: 'String a("hi"), b("world");\na = b;                       // out of memory!\nString& operator=(String other) noexcept {\n    swap(*this, other);\n    return *this;\n}'
    };
    var code = CODE[mode];
    function F(narr, line, cls, vals, vhl, heap, extra) {
      var hlc = {}; hlc[line] = cls;
      var parts = [codePart('copy-and-swap', code, hlc), { type: 'vars', label: 'objects (stack)', vals: vals, hl: vhl || {} },
        { type: 'map', label: 'heap blocks', entries: heap.map(function (h) { return [h[0], h[1]]; }), hl: heap.reduce(function (o, h) { if (h[2]) o[h[0]] = h[2]; return o; }, {}) }];
      if (extra) parts.push(extra);
      frames.push({ narr: narr, parts: parts });
    }
    if (mode === 'copy') {
      F('Start: <code>a</code> owns heap block <b>A1</b> ("hi"), <code>b</code> owns <b>B1</b> ("world"). Each <code>String</code> is just a pointer + size; the characters live on the heap.', 1, 'cur',
        { 'a.data': 'A1', 'b.data': 'B1' }, {}, [['A1', '"hi" (owner: a)'], ['B1', '"world" (owner: b)']]);
      F('<code>a = b;</code> calls <code>operator=(String other)</code>. The parameter is taken <b>by value</b>, so <code>other</code> must be built first — from an lvalue <code>b</code>, that means the <b>copy constructor</b>.', 2, 'cur',
        { 'a.data': 'A1', 'b.data': 'B1' }, {}, [['A1', '"hi" (owner: a)'], ['B1', '"world" (owner: b)']]);
      F('Copy constructor allocates <b>C1</b> and copies "world". <span class="c-g">This is the only step that can throw</span> (<code>bad_alloc</code>) — and it happens <b>before</b> we have touched <code>a</code> at all.', 3, 'cur',
        { 'a.data': 'A1', 'b.data': 'B1', 'other.data': 'C1' }, { 'other.data': 'ok' }, [['A1', '"hi" (owner: a)'], ['B1', '"world" (owner: b)'], ['C1', '"world" (owner: other)', 'ok']]);
      F('<code>swap(*this, other)</code> exchanges two pointers and two sizes — <b>noexcept</b>, cannot fail. Now <code>a</code> owns the fresh copy C1 and <code>other</code> holds a\'s old block A1.', 4, 'cur',
        { 'a.data': 'C1', 'b.data': 'B1', 'other.data': 'A1' }, { 'a.data': 'ok', 'other.data': 'bad' }, [['A1', '"hi" (owner: other)', 'bad'], ['B1', '"world" (owner: b)'], ['C1', '"world" (owner: a)', 'ok']]);
      F('<code>return *this;</code> — the assignment is logically complete.', 5, 'cur',
        { 'a.data': 'C1', 'b.data': 'B1', 'other.data': 'A1' }, {}, [['A1', '"hi" (owner: other)'], ['B1', '"world" (owner: b)'], ['C1', '"world" (owner: a)']]);
      F('Leaving the function destroys the parameter <code>other</code>; its destructor runs <code>delete[]</code> on <b>A1</b> — a\'s old data. The destructor did our cleanup for free: no duplicated <code>delete[]</code> code in operator=.', 6, 'ok',
        { 'a.data': 'C1', 'b.data': 'B1' }, { 'a.data': 'ok' }, [['A1', 'freed', 'bad'], ['B1', '"world" (owner: b)'], ['C1', '"world" (owner: a)', 'ok']]);
      F('Done: a == "world", b == "world", independent buffers, no leak. Three wins in four lines: <b>strong exception guarantee</b>, <b>self-assignment safe</b>, <b>no duplicated code</b> (copy ctor + destructor do all the work).', 2, 'ok',
        { 'a.data': 'C1 "world"', 'b.data': 'B1 "world"' }, { 'a.data': 'ok' }, [['B1', '"world" (owner: b)'], ['C1', '"world" (owner: a)']],
        { type: 'table', label: 'cost of this assignment', columns: ['allocations', 'frees', 'can leave a half-assigned?'], rows: [['1 (C1)', '1 (A1)', 'no']] });
    } else if (mode === 'self') {
      F('Start: <code>a</code> owns A1 ("hi"). Now the nasty case: <code>a = a;</code> — it happens in real code via aliases like <code>v[i] = v[j]</code> with i == j.', 1, 'cur',
        { 'a.data': 'A1' }, {}, [['A1', '"hi" (owner: a)']]);
      F('A naive operator= that does <code>delete[] data_;</code> first would free A1 and then copy from the <b>freed</b> memory (use-after-free). Copy-and-swap instead first builds <code>other</code> as a copy of a → new block C1.', 3, 'cur',
        { 'a.data': 'A1', 'other.data': 'C1' }, { 'other.data': 'ok' }, [['A1', '"hi" (owner: a)'], ['C1', '"hi" (owner: other)', 'ok']]);
      F('swap: a now owns C1, other owns A1.', 4, 'cur',
        { 'a.data': 'C1', 'other.data': 'A1' }, { 'a.data': 'ok' }, [['A1', '"hi" (owner: other)', 'bad'], ['C1', '"hi" (owner: a)', 'ok']]);
      F('other dies, freeing A1. a still says "hi" — <b>correct with no special <code>if (this == &amp;rhs)</code> check</b>.', 6, 'ok',
        { 'a.data': 'C1' }, { 'a.data': 'ok' }, [['A1', 'freed', 'bad'], ['C1', '"hi" (owner: a)', 'ok']]);
      F('The honest trade-off: self-assignment did a <b>pointless allocation + copy</b>. Self-assignment is rare, so most code accepts this; a hand-written operator= with a self-check and buffer reuse can be faster (that\'s why <code>std::vector</code> does not use copy-and-swap).', 2, 'win',
        { 'a.data': 'C1 "hi"' }, {}, [['C1', '"hi" (owner: a)']], { type: 'table', label: 'self-assignment', columns: ['approach', 'correct?', 'extra work'], rows: [['naive delete-then-copy', 'NO (use-after-free)', '—'], ['self-check + reuse buffer', 'yes', 'none'], ['copy-and-swap', 'yes', '1 alloc + copy']] });
    } else if (mode === 'move') {
      F('Start: a owns A1 ("hi"), b owns B1 ("world").', 1, 'cur', { 'a.data': 'A1', 'b.data': 'B1' }, {}, [['A1', '"hi" (owner: a)'], ['B1', '"world" (owner: b)']]);
      F('<code>a = std::move(b);</code> — the argument is an rvalue, so the by-value parameter <code>other</code> is built with the <b>move constructor</b>: it steals B1 and leaves b empty. <b>No allocation.</b>', 3, 'cur',
        { 'a.data': 'A1', 'b.data': 'null', 'other.data': 'B1' }, { 'other.data': 'ok', 'b.data': 'bad' }, [['A1', '"hi" (owner: a)'], ['B1', '"world" (owner: other)', 'ok']]);
      F('swap: a takes B1, other takes A1.', 4, 'cur', { 'a.data': 'B1', 'b.data': 'null', 'other.data': 'A1' }, { 'a.data': 'ok' }, [['A1', '"hi" (owner: other)', 'bad'], ['B1', '"world" (owner: a)', 'ok']]);
      F('other is destroyed → A1 freed. One operator served as <b>both</b> copy-assignment and move-assignment (the "unifying assignment operator").', 6, 'ok',
        { 'a.data': 'B1', 'b.data': 'null' }, { 'a.data': 'ok' }, [['A1', 'freed', 'bad'], ['B1', '"world" (owner: a)', 'ok']]);
      F('Cost: one move construction + one swap + one destructor — slightly more than a dedicated move-assignment (which would just swap or steal), but usually negligible. b is in a valid, empty "moved-from" state.', 2, 'win',
        { 'a.data': 'B1 "world"', 'b.data': 'null (valid, empty)' }, {}, [['B1', '"world" (owner: a)']], { type: 'table', label: 'what built other?', columns: ['argument', 'parameter built by', 'allocates?'], rows: [['lvalue b', 'copy ctor', 'yes'], ['rvalue std::move(b)', 'move ctor', 'no']], hl: { 1: 'sel' } });
    } else {
      F('Start: a owns A1 ("hi"), b owns B1 ("world"). This time the machine is almost out of memory.', 1, 'cur', { 'a.data': 'A1', 'b.data': 'B1' }, {}, [['A1', '"hi" (owner: a)'], ['B1', '"world" (owner: b)']]);
      F('<code>a = b;</code> → copy-constructing <code>other</code> calls <code>new char[6]</code> which throws <b>std::bad_alloc</b>.', 2, 'bad', { 'a.data': 'A1', 'b.data': 'B1' }, {}, [['A1', '"hi" (owner: a)'], ['B1', '"world" (owner: b)']]);
      F('The exception leaves <b>before the body of operator= ever runs</b>. <code>a</code> still owns A1 with "hi" — fully intact. That is the <b>strong exception guarantee</b>: "either it fully succeeds, or nothing changed" (commit-or-rollback).', 3, 'bad',
        { 'a.data': 'A1 (unchanged)', 'b.data': 'B1' }, { 'a.data': 'ok' }, [['A1', '"hi" (owner: a)', 'ok'], ['B1', '"world" (owner: b)']]);
      F('Compare a <b>naive</b> operator=: <code>delete[] data_; data_ = new char[n]; ...</code>. If <code>new</code> throws, a\'s pointer still points at the <b>freed</b> A1 → its destructor later double-frees. That\'s not even the basic guarantee.', 2, 'bad',
        { 'a.data': 'A1 (DANGLING)', 'b.data': 'B1' }, { 'a.data': 'bad' }, [['A1', 'freed but still referenced!', 'bad'], ['B1', '"world" (owner: b)']],
        codePart('naive version', 'String& operator=(const String& o) {\n    delete[] data_;               // 1. old data gone\n    data_ = new char[o.size_+1];  // 2. throws -> data_ dangles\n    std::memcpy(data_, o.data_, o.size_+1);\n    size_ = o.size_;\n    return *this;\n}', { 2: 'bad', 3: 'bad' }));
      F('Lesson: <b>do all the work that can fail on the side, then commit with operations that cannot fail</b> (swap). Copy-and-swap is that pattern in its smallest form.', 3, 'ok',
        { 'a.data': 'A1 "hi"', 'b.data': 'B1 "world"' }, { 'a.data': 'ok' }, [['A1', '"hi" (owner: a)'], ['B1', '"world" (owner: b)']],
        { type: 'table', label: 'exception guarantees', columns: ['level', 'promise'], rows: [['nothrow', 'never throws (swap, destructors, moves)'], ['strong', 'success or no change at all (copy-and-swap)'], ['basic', 'no leaks, object valid but unspecified'], ['none', 'anything can happen (naive version)']], hl: { 1: 'sel' } });
    }
    return frames;
  }

  topics.push({
    title: 'Copy-and-Swap: Exception-Safe Assignment',
    analogy: `<p>Repainting your shop sign. The risky way: <b>scrape off the old sign first</b>, then start painting the new one — if you run out of paint halfway, the shop has no sign at all. The safe way: <b>paint the new sign in the workshop</b> (if you run out of paint there, the old sign is still hanging), then <b>swap</b> them in one quick move, and throw the old sign in the bin. Copy-and-swap is the workshop approach: build the new state on the side, swap it in with an operation that can't fail, let the old state be destroyed automatically.</p>`,
    explain: `<p>🟢 <b>The problem.</b> A class that owns a resource (a raw buffer, a handle) needs the <b>rule of three/five</b>: destructor, copy constructor, copy assignment (+ move constructor, move assignment). The copy-assignment operator is the hardest one to get right because it must <i>destroy the old value</i> and <i>copy a new one</i> — and three things go wrong:</p>
      ${H.table(['bug', 'how it happens'], [['<span class="c-r">self-assignment</span>', '<code>a = a</code>: you free your buffer, then copy from it'], ['<span class="c-r">exception safety</span>', 'you free first, then <code>new</code> throws → the object points to freed memory'], ['<span class="c-r">duplicated code</span>', 'operator= repeats the copy constructor\'s allocation and the destructor\'s cleanup']])}
      <p><b>The idiom</b> (three pieces):</p>
      <ol>
        <li>A correct <b>copy constructor</b> and <b>destructor</b> (you need them anyway).</li>
        <li>A <b>noexcept swap</b> that exchanges the members (pointers, sizes) — trivially can't fail.</li>
        <li>An assignment operator that takes its parameter <b>by value</b> and swaps:</li>
      </ol>
      <pre>String&amp; operator=(String other) noexcept {   // 1. 'other' is a COPY (or a move) made by the caller
    swap(*this, other);                       // 2. take its guts, give it ours
    return *this;
}                                             // 3. 'other' dies → destructor frees our OLD data</pre>
      <p>Why it works: the only thing that can throw (allocating the copy) happens while <b>building the parameter</b>, before <code>*this</code> is touched → <b>strong exception guarantee</b>. Self-assignment just copies, swaps and frees the old copy → correct without an <code>if</code>. The cleanup is done by the destructor → no duplicated code. And because the parameter is by value, an rvalue argument is <b>move-constructed</b> into it, so this single operator is both copy- and move-assignment.</p>
      ${H.table(['you write', 'other is built by', 'cost'], [['<code>a = b;</code>', 'copy constructor', '1 allocation + copy'], ['<code>a = std::move(b);</code>', 'move constructor', 'pointer steal'], ['<code>a = String("tmp");</code>', 'guaranteed elision (C++17)', 'nothing extra'], ['<code>a = a;</code>', 'copy constructor', 'wasted copy, but correct']])}`,
    clues: [
      '"Implement the assignment operator for a class that owns raw memory" → copy-and-swap',
      '"Make <code>operator=</code> exception-safe" / "strong exception guarantee" / "commit or rollback" → copy-and-swap',
      '"Handle self-assignment" → copy-and-swap handles it without a check',
      '"Rule of three / five / big three" questions → write copy ctor + dtor + swap, then assignment by value',
      '"Avoid code duplication between copy constructor, destructor and assignment" → copy-and-swap',
      '"Unified assignment operator" / "one operator for copy and move" → by-value parameter + swap'
    ],
    code: [R`
      #include <iostream>
      #include <utility>
      #include <cstring>
      #include <cstddef>

      class String {
          char*       data_ = nullptr;   // owned heap buffer (always '\0'-terminated when non-null)
          std::size_t size_ = 0;
      public:
          String(const char* s = "") : data_(new char[std::strlen(s) + 1]), size_(std::strlen(s)) {
              std::memcpy(data_, s, size_ + 1);
          }
          // 1) Copy constructor: deep copy (may throw std::bad_alloc — fine, *this isn't built yet)
          String(const String& o) : data_(new char[o.size_ + 1]), size_(o.size_) {
              std::memcpy(data_, o.data_, size_ + 1);
          }
          // 2) Move constructor: steal the buffer, leave o empty-but-valid
          String(String&& o) noexcept : data_(std::exchange(o.data_, nullptr)), size_(std::exchange(o.size_, 0)) {}
          // 3) Destructor
          ~String() { delete[] data_; }
          // 4) noexcept swap: exchanges two pointers and two sizes — cannot fail
          friend void swap(String& a, String& b) noexcept {
              using std::swap;                 // the "two-step": allow ADL to find better swaps for members
              swap(a.data_, b.data_);
              swap(a.size_, b.size_);
          }
          // 5) THE copy-and-swap assignment: parameter taken BY VALUE
          //    lvalue argument -> copy ctor builds 'other' (the risky part happens here, before *this is touched)
          //    rvalue argument -> move ctor builds 'other' (cheap)
          String& operator=(String other) noexcept {
              swap(*this, other);              // our old guts go into 'other'...
              return *this;                    // ...and die when 'other' is destroyed at the closing brace
          }
          const char* c_str() const { return data_ ? data_ : ""; }
          std::size_t size() const { return size_; }
      };

      int main() {
          String a("hello"), b("world!");
          a = b;                    // copy-assign: a = "world!", b unchanged
          a = a;                    // self-assignment: safe with no special check
          a = String("moved in");   // move-assign via the same operator
          std::cout << a.c_str() << " " << a.size() << " | " << b.c_str() << "\n";   // moved in 8 | world!
      }
    `],
    codeTitle: ['A complete rule-of-five String using copy-and-swap'],
    viz: { title: 'Copy-and-swap, one line at a time', input: 'copy', inputLabel: 'Scenario: copy | self | move | throw', gen: swapViz },
    examples: [
      { title: 'The naive operator= and its two bugs', html: `<p>This is what most people write first. Trace <code>a = a</code>: line 1 frees the buffer, line 3 copies from the freed buffer → <b>use-after-free</b>. Trace an out-of-memory: line 1 frees, line 2 throws, <code>data_</code> still holds the freed address → the destructor later frees it <b>again</b>.</p>
        ${H.table(['line', 'a = a (self)', 'new throws'], [['delete[] data_', 'buffer freed', 'buffer freed'], ['data_ = new char[...]', 'ok', '<span class="c-r">throws; data_ dangles</span>'], ['memcpy(data_, o.data_)', '<span class="c-r">reads freed memory</span>', 'never reached'], ['later ~String()', 'ok', '<span class="c-r">double free</span>']])}`,
        code: R`
          #include <cstring>
          #include <cstddef>
          class Naive {
              char* data_; std::size_t size_;
          public:
              Naive(const char* s) : data_(new char[std::strlen(s) + 1]), size_(std::strlen(s)) { std::memcpy(data_, s, size_ + 1); }
              ~Naive() { delete[] data_; }
              Naive(const Naive& o) : data_(new char[o.size_ + 1]), size_(o.size_) { std::memcpy(data_, o.data_, size_ + 1); }
              Naive& operator=(const Naive& o) {
                  delete[] data_;                          // (1) BUG: if this == &o we just freed o.data_ too
                  data_ = new char[o.size_ + 1];           // (2) BUG: if this throws, data_ dangles
                  std::memcpy(data_, o.data_, o.size_ + 1);  // (3) self-assign: copies freed memory
                  size_ = o.size_;
                  return *this;
              }
          };
          int main() { Naive a("hi"), b("yo"); a = b; }` },
      { title: 'The hand-tuned alternative (and why std::vector uses it)', html: `<p>Copy-and-swap always allocates a new buffer, even when the existing one is big enough. Containers like <code>std::vector</code> instead check <code>if (this != &amp;o)</code>, reuse capacity when possible, and offer only the <b>basic</b> guarantee for assignment — a deliberate speed-vs-safety trade. Know both answers; say which you'd use and why.</p>
        ${H.table(['', 'copy-and-swap', 'reuse-buffer operator='], [['guarantee', '<span class="c-g">strong</span>', 'basic (or strong with care)'], ['allocations when capacity suffices', '1', '<span class="c-g">0</span>'], ['self-assignment', 'correct (wasted copy)', 'needs explicit check'], ['code size', '<span class="c-g">tiny</span>', 'larger, error-prone']])}`,
        code: R`
          #include <algorithm>
          #include <cstddef>
          class Buf {
              int* d_ = nullptr; std::size_t n_ = 0, cap_ = 0;
          public:
              explicit Buf(std::size_t n) : d_(new int[n]{}), n_(n), cap_(n) {}
              ~Buf() { delete[] d_; }
              Buf(const Buf& o) : d_(new int[o.n_]), n_(o.n_), cap_(o.n_) { std::copy(o.d_, o.d_ + n_, d_); }
              Buf& operator=(const Buf& o) {
                  if (this == &o) return *this;                    // explicit self-check
                  if (o.n_ <= cap_) {                               // reuse: no allocation at all
                      std::copy(o.d_, o.d_ + o.n_, d_);
                      n_ = o.n_;
                      return *this;
                  }
                  int* fresh = new int[o.n_];                       // allocate BEFORE freeing (still safe)
                  std::copy(o.d_, o.d_ + o.n_, fresh);
                  delete[] d_;
                  d_ = fresh; n_ = cap_ = o.n_;
                  return *this;
              }
          };
          int main() { Buf a(4), b(2); a = b; a = a; }` },
      { title: 'Trap: implementing swap with std::swap on the whole object', html: `<p>Generic <code>std::swap(x, y)</code> is implemented as <code>T tmp = move(x); x = move(y); y = move(tmp);</code> — it uses <b>move assignment</b>. If your move assignment is the copy-and-swap <code>operator=</code> and your <code>swap</code> calls <code>std::swap(*this, other)</code> on the whole object, they call each other forever → <b>stack overflow</b>. Always swap <b>member by member</b> in your own friend <code>swap</code>.</p>
        ${H.table(['call', 'calls'], [['a = b', 'swap(*this, other)'], ['std::swap(*this, other)', 'a = std::move(...)'], ['a = std::move(...)', 'swap(*this, other) …', ], ['…', '<span class="c-r">infinite recursion</span>']])}` },
      { title: 'Verifying the call sequence with a tracer', html: `<p>Instrument the special members to <i>see</i> which ones run. For <code>a = b</code> you get a copy-construction (building <code>other</code>) and a destruction (of <code>other</code> holding the old data). For <code>a = std::move(b)</code> you get a move-construction instead — no copy.</p>`,
        code: R`
          #include <iostream>
          #include <utility>
          struct T {
              int* p;
              explicit T(int v) : p(new int(v)) {}
              T(const T& o) : p(new int(*o.p)) { std::cout << "copy "; }
              T(T&& o) noexcept : p(std::exchange(o.p, nullptr)) { std::cout << "move "; }
              ~T() { if (p) std::cout << "free(" << *p << ") "; delete p; }
              friend void swap(T& a, T& b) noexcept { std::swap(a.p, b.p); }
              T& operator=(T other) noexcept { swap(*this, other); return *this; }
          };
          int main() {
              T a(1), b(2), c(3);
              a = b;                 std::cout << "| ";   // copy free(1) |
              a = std::move(c);      std::cout << "| ";   // move free(2) |
              std::cout << "\n";
          }                                               // then: free(2) free(3)  (c is empty)
          ` }
    ],
    deepDive: `<p>🟣 <b>Fine print an expert should know.</b></p>
      <ul>
        <li><b>Where the exception is thrown.</b> The by-value parameter is initialized in the <b>caller's</b> context before the body runs; that's why marking the operator itself <code>noexcept</code> is honest — the body (a swap) never throws, while a failed copy surfaces at the call site with <code>*this</code> untouched.</li>
        <li><b>The two-step swap.</b> Inside your swap write <code>using std::swap; swap(a.m, b.m);</code> so that member types with their own optimized <code>swap</code> (found by ADL) use it, and everything else falls back to <code>std::swap</code>. A <b>hidden friend</b> <code>swap</code> (defined inside the class) is only found by ADL — exactly what generic code like <code>std::sort</code> and <code>std::ranges::swap</code> want.</li>
        <li><b>Rule of zero beats all of this.</b> If you hold a <code>std::vector</code>/<code>std::string</code>/<code>std::unique_ptr</code> instead of a raw pointer, the compiler-generated members are correct and you write <b>none</b> of the five. Copy-and-swap is for the rare class that manages a raw resource — or for getting the strong guarantee on a class built from members that only offer the basic one.</li>
        <li><b>Performance trade-off.</b> Copy-and-swap forfeits buffer reuse (always allocates) and does a needless copy on self-assignment. For a value type assigned in a hot loop, a hand-written operator= that reuses capacity can be several times faster. Measure before choosing; library containers choose speed.</li>
        <li><b>Separate move-assignment?</b> With the unified by-value operator you get one extra move construction on move-assign. Some codebases write a dedicated <code>operator=(T&amp;&amp;) noexcept</code> (just swap or steal) and keep <code>operator=(const T&amp;)</code> as <code>T tmp(o); swap(*this, tmp);</code>. Don't declare both <code>operator=(T)</code> and <code>operator=(T&amp;&amp;)</code> — calls become ambiguous.</li>
        <li><b>Beyond assignment:</b> the same "do risky work on a copy, then commit with a noexcept swap" pattern gives the strong guarantee to any multi-step mutation: build a new <code>std::vector</code>, then <code>v.swap(tmp)</code>; update a config by building a new object and swapping a pointer (RCU style).</li>
      </ul>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants produce rule-of-five boilerplate instantly, and modern code-review bots flag naive <code>operator=</code> implementations. The idiom is now less about typing and more about <b>knowing which guarantee you need</b>.</p>
      <p><b>Use AI as a partner:</b> "Write a tracer type and show which special members run for <code>a = b</code>, <code>a = std::move(b)</code> and <code>a = a</code>", "Fuzz this class under an allocator that fails on the Nth allocation and check invariants" (a classic way to test exception safety).</p>
      <p><b>Where AI goes wrong:</b> it writes <code>std::swap(*this, other)</code> (infinite recursion), declares both <code>operator=(T)</code> and <code>operator=(T&amp;&amp;)</code> (ambiguity), forgets <code>noexcept</code> on swap/move, or recommends copy-and-swap for a class whose members are already RAII types (rule of zero is better).</p>
      <p><b>What you must own:</b> being able to write the idiom from memory, explain the strong guarantee, and argue when <i>not</i> to use it.</p>`,
    problems: [{
      title: 'Strong-Guarantee Assignment for an IntBuffer', level: 'Medium', tags: ['copy-and-swap', 'rule of five', 'exception safety'], companies: ['Microsoft', 'Bloomberg', 'Morgan Stanley'],
      statement: `<p>Class <code>IntBuffer</code> owns a raw <code>int*</code> array of size <code>n</code>. Implement the full rule of five so that copy-assignment gives the <b>strong exception guarantee</b>, self-assignment is safe, and move operations are <code>noexcept</code>. Provide <code>size()</code>, <code>operator[]</code>, and a free <code>swap</code>.</p>`,
      constraints: `<p>Do not use <code>std::vector</code> inside (the point is to manage the raw array). C++20.</p>`,
      example: `<pre>IntBuffer a(3); a[0]=1; a[1]=2; a[2]=3;
IntBuffer b(1); b[0]=9;
b = a;   a[0] = 100;   → b = ${H.c('g', '[1, 2, 3]')} (deep copy)
b = b;                  → b = ${H.c('g', '[1, 2, 3]')} (self-assignment safe)
IntBuffer c = std::move(b); → c = [1, 2, 3], b.size() = ${H.c('g', '0')}</pre>`,
      brute: { why: `<p>The brute version frees first and then allocates. If allocation throws, <code>data_</code> dangles (later double free); on self-assignment it copies from memory it just freed. It also duplicates the copy-constructor's logic.</p>`,
        code: R`
          #include <algorithm>
          #include <cstddef>
          class IntBufferNaive {
              int* data_; std::size_t n_;
          public:
              explicit IntBufferNaive(std::size_t n) : data_(new int[n]{}), n_(n) {}
              ~IntBufferNaive() { delete[] data_; }
              IntBufferNaive(const IntBufferNaive& o) : data_(new int[o.n_]), n_(o.n_) { std::copy(o.data_, o.data_ + n_, data_); }
              IntBufferNaive& operator=(const IntBufferNaive& o) {
                  delete[] data_;                       // gone before we know the copy succeeds
                  data_ = new int[o.n_];                // may throw -> dangling data_
                  std::copy(o.data_, o.data_ + o.n_, data_);   // self-assign: reads freed memory
                  n_ = o.n_;
                  return *this;
              }
          };
          int main() { IntBufferNaive a(2), b(3); a = b; }` },
      mcq: { q: 'In <code>IntBuffer&amp; operator=(IntBuffer other)</code>, at which moment can a <code>std::bad_alloc</code> be thrown during <code>b = a;</code>?', options: ['While the parameter <code>other</code> is being copy-constructed, before the body runs', 'Inside <code>swap</code>', 'In the destructor of <code>other</code>', 'Never'], answer: 0, explain: 'The only allocation is in the copy constructor that builds <code>other</code>. The body (swap) and the destructor never throw, so <code>b</code> is untouched if the copy fails.' },
      hints: [`<p>Get the copy constructor and destructor right first — copy-and-swap reuses them.</p>`, `<p>Write <code>friend void swap(IntBuffer&amp; x, IntBuffer&amp; y) noexcept</code> that swaps <code>data_</code> and <code>n_</code> with <code>std::swap</code> on each member.</p>`, `<p>Assignment: <code>IntBuffer&amp; operator=(IntBuffer other) noexcept { swap(*this, other); return *this; }</code>. Move constructor: <code>std::exchange</code> the pointer to nullptr and size to 0. Destructor <code>delete[]</code> is safe on nullptr.</p>`],
      solution: {
        approach: `<p>Copy constructor + destructor + member-wise noexcept swap + by-value assignment. Copies are made before the object is touched (strong guarantee); self-assignment copies, swaps and frees the old buffer; rvalues move-construct the parameter so the same operator handles move-assignment.</p>`,
        code: R`
          #include <algorithm>
          #include <cstddef>
          #include <iostream>
          #include <utility>

          class IntBuffer {
              int*        data_ = nullptr;
              std::size_t n_    = 0;
          public:
              explicit IntBuffer(std::size_t n = 0) : data_(n ? new int[n]{} : nullptr), n_(n) {}
              ~IntBuffer() { delete[] data_; }                               // delete[] nullptr is fine
              IntBuffer(const IntBuffer& o) : data_(o.n_ ? new int[o.n_] : nullptr), n_(o.n_) {
                  std::copy(o.data_, o.data_ + n_, data_);
              }
              IntBuffer(IntBuffer&& o) noexcept
                  : data_(std::exchange(o.data_, nullptr)), n_(std::exchange(o.n_, 0)) {}
              friend void swap(IntBuffer& x, IntBuffer& y) noexcept {
                  using std::swap;
                  swap(x.data_, y.data_);
                  swap(x.n_, y.n_);
              }
              IntBuffer& operator=(IntBuffer other) noexcept {             // copy OR move happens at the call site
                  swap(*this, other);
                  return *this;
              }                                                              // old buffer freed by ~other
              std::size_t size() const noexcept { return n_; }
              int& operator[](std::size_t i) { return data_[i]; }
              const int& operator[](std::size_t i) const { return data_[i]; }
          };

          int main() {
              IntBuffer a(3); a[0] = 1; a[1] = 2; a[2] = 3;
              IntBuffer b(1); b[0] = 9;
              b = a;  a[0] = 100;                                 // deep copy: b unaffected
              b = b;                                              // safe
              IntBuffer c = std::move(b);
              std::cout << c[0] << c[1] << c[2] << " " << b.size() << "\n";   // 123 0
          }`,
        dry: { head: ['statement', 'a.data_', 'b.data_', 'other.data_', 'note'], rows: [
          ['initial', 'P1 [1,2,3]', 'P2 [9]', '—', ''], ['b = a: build other', 'P1', 'P2', 'P3 [1,2,3]', 'copy ctor allocates (may throw here)'], ['swap(*this, other)', 'P1', 'P3', 'P2', 'noexcept'], ['} ~other', 'P1', 'P3', 'freed P2', 'old data gone'], ['b = b', 'P1', 'P4 [1,2,3]', 'freed P3', 'extra copy, but correct'], ['c = move(b)', 'P1', 'nullptr', '—', 'c owns P4']] },
        complexity: `<p>Copy-assign O(n) time and one allocation; move O(1); swap O(1) noexcept.</p>`,
        followUps: ['Add <code>resize(n)</code> with the strong guarantee using the same pattern.', 'Rewrite with <code>std::unique_ptr&lt;int[]&gt;</code> — which special members can you now delete or default?', 'How would you test exception safety automatically (failing allocator / fault injection)?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — RAII GUARDS
     ====================================================================== */
  function guardViz(input) {
    var acts = words(input, 'lock open txn alloc throw', 7, ['lock', 'open', 'txn', 'alloc', 'throw', 'work'], 'actions (lock, open, txn, alloc, work, throw)');
    var INFO = {
      lock: { g: 'lock_guard lk(mtx)', acq: 'mtx locked', rel: 'mtx unlocked', code: 'std::lock_guard lk(mtx);' },
      open: { g: 'File f("log.txt")', acq: 'file handle opened', rel: 'file closed', code: 'File f("log.txt");' },
      txn: { g: 'ScopeFail undo{rollback}', acq: 'transaction begun', rel: '', code: 'db.begin(); ScopeFail undo([&]{ db.rollback(); });' },
      alloc: { g: 'unique_ptr<Buf> buf', acq: 'buffer allocated', rel: 'buffer freed', code: 'auto buf = std::make_unique<Buf>(4096);' }
    };
    var frames = [], stack = [], res = {}, lines = ['void handle() {'], lineOf = [];
    acts.forEach(function (a) { lines.push('    ' + (a === 'throw' ? 'throw std::runtime_error("boom");' : a === 'work' ? 'doWork();' : INFO[a].code)); lineOf.push(lines.length); });
    lines.push('}   // scope ends: destructors run in REVERSE order');
    var code = lines.join('\n'), endLine = lines.length;
    function snap(narr, line, cls, hlTop, extraParts) {
      var h = {}; if (line) h[line] = cls;
      var sh = {}; if (hlTop !== undefined && stack.length) sh[stack.length - 1] = hlTop;
      frames.push({ narr: narr, parts: [codePart('function body', code, h), { type: 'stack', label: 'guards alive on the stack (top = newest)', items: stack.slice(), hl: sh }, { type: 'vars', label: 'resources', vals: Object.keys(res).length ? clone(res) : { none: '—' } }].concat(extraParts || []) });
    }
    snap('The function starts. Each line that acquires a resource creates a <b>guard object</b> on the stack. Watch the guard stack: C++ guarantees that when the scope ends — by <code>return</code>, by falling off the end, or by an <b>exception</b> — every fully-constructed local is destroyed in <b>reverse</b> order.', 1, 'cur');
    var thrown = false, hasTxn = false;
    for (var i = 0; i < acts.length && !thrown; i++) {
      var a = acts[i];
      if (a === 'throw') {
        thrown = true;
        snap('<span class="c-r">An exception is thrown!</span> Normal execution stops. The runtime starts <b>stack unwinding</b>: it leaves this scope and destroys every guard that was constructed so far, newest first. Nothing after this line runs.', lineOf[i], 'bad', 'bad');
        break;
      }
      if (a === 'work') { snap('<code>doWork()</code> runs while all ' + stack.length + ' guard(s) protect their resources. If it threw, they would still be released.', lineOf[i], 'cur'); continue; }
      stack.push(INFO[a].g);
      if (a === 'txn') { hasTxn = true; res.transaction = 'open'; }
      else res[INFO[a].acq.split(' ')[0] === 'mtx' ? 'mutex' : a === 'open' ? 'file' : 'buffer'] = INFO[a].acq;
      snap('Acquire: <b>' + INFO[a].acq + '</b>, and immediately hand it to a guard (<code>' + INFO[a].g.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code>). Acquisition and ownership happen in the <b>same statement</b> — there is no window where the resource could leak.', lineOf[i], 'ok', 'ok');
    }
    if (!thrown) snap('No exception: we reach the closing brace. Same rule — destructors run in reverse order of construction.', endLine, 'cur');
    while (stack.length) {
      var top = stack[stack.length - 1], txt;
      if (/ScopeFail/.test(top)) {
        if (thrown) { res.transaction = 'ROLLED BACK'; txt = '<code>~ScopeFail</code> sees <code>std::uncaught_exceptions()</code> went up since it was created → we are leaving <b>because of an exception</b> → it runs <code>db.rollback()</code>. Partial changes are undone.'; }
        else { res.transaction = 'kept (commit)'; txt = '<code>~ScopeFail</code> sees no new exception in flight → leaving normally → it does <b>nothing</b>, so the transaction\'s work stands (a <code>ScopeSuccess</code> guard would run <code>commit()</code> here).'; }
      } else {
        var key = /lock_guard/.test(top) ? 'mutex' : /File/.test(top) ? 'file' : 'buffer';
        res[key] = key === 'mutex' ? 'mtx unlocked' : key === 'file' ? 'file closed' : 'buffer freed';
        txt = 'Destroy <code>' + top.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code> → <b>' + res[key] + '</b>.';
      }
      stack.pop();
      snap(txt + ' (' + stack.length + ' guard(s) left)', thrown ? 0 : endLine, 'cur');
    }
    frames.push({ narr: thrown ? 'Unwinding finished: every resource was released and the transaction rolled back, then the exception continues to the caller\'s <code>catch</code>. You wrote <b>zero</b> cleanup code on the error path — the guards are the cleanup code.' : 'All guards destroyed in reverse order; every resource released, transaction kept. The same cleanup would have happened on any early <code>return</code>.',
      parts: [{ type: 'vars', label: 'final state of resources', vals: Object.keys(res).length ? clone(res) : { none: '—' }, hl: hasTxn ? { transaction: thrown ? 'bad' : 'ok' } : {} },
        { type: 'table', label: 'guards in the standard library', columns: ['guard', 'releases'], rows: [['std::lock_guard / scoped_lock', 'mutex(es)'], ['std::unique_lock', 'mutex (movable, can unlock early)'], ['std::unique_ptr<T, Deleter>', 'memory or any handle'], ['std::jthread', 'joins the thread'], ['scope_exit / scope_fail / scope_success', 'any callable (Library Fundamentals TS v3)']] }] });
    return frames;
  }

  topics.push({
    title: 'RAII Guards: Scope Guards, Lock Guards & Exception Safety',
    analogy: `<p>A <b>hotel key card that also controls the lights</b>: put the card in the slot and the room powers on; take it out when you leave — through the door, the window or the fire escape — and everything switches off automatically. Nobody has to remember to turn off the lights. An RAII guard is that card: the resource turns on in the guard's constructor and <b>switches off in its destructor</b>, which C++ always runs when you leave the scope, however you leave.</p>`,
    explain: `<p>🟢 <b>RAII refresher.</b> <i>Resource Acquisition Is Initialization</i>: tie a resource's lifetime to an object's lifetime. Constructor acquires, destructor releases. Because C++ <b>always</b> destroys local objects when a scope exits — normal end, <code>return</code>, <code>break</code>, or an exception unwinding the stack — cleanup can't be forgotten.</p>
      <p>A <b>guard</b> is a small RAII object whose only job is to undo something at scope exit. Many are in the standard library:</p>
      ${H.table(['guard', 'what it does', 'notes'], [['<code>std::lock_guard</code>', 'locks a mutex now, unlocks at scope end', 'simplest; not movable'], ['<code>std::scoped_lock</code> (C++17)', 'locks <b>several</b> mutexes deadlock-free', 'prefer it for 2+ mutexes'], ['<code>std::unique_lock</code>', 'like lock_guard but movable; can unlock/relock; needed by <code>condition_variable</code>', 'small extra state (owns flag)'], ['<code>std::unique_ptr&lt;T, D&gt;</code>', 'frees memory or calls a custom deleter (fclose, CloseHandle)', 'zero overhead with stateless deleter'], ['<code>std::jthread</code> (C++20)', 'joins in its destructor', 'no more <code>std::terminate</code> from a joinable thread']])}
      <p><b>Generic scope guards</b> run <i>any</i> lambda at scope exit — perfect for one-off cleanups without writing a class. The three flavours (from the Library Fundamentals TS v3, also in GSL / folly / Boost):</p>
      ${H.table(['guard', 'runs the lambda when…', 'typical use'], [['<code>scope_exit</code> / "defer"', 'always', 'restore a flag, close a C handle'], ['<code>scope_fail</code>', 'only if leaving <b>by exception</b>', 'rollback a partially-applied change'], ['<code>scope_success</code>', 'only if leaving <b>normally</b>', 'commit, log success']])}
      <p>The magic behind <code>scope_fail</code>/<code>scope_success</code> is <code>std::uncaught_exceptions()</code> (C++17): the guard records the count when created and compares in its destructor — if it went up, we are being unwound by an exception.</p>
      <p><b>Three rules:</b> (1) acquire and hand to a guard <b>in one statement</b>; (2) <b>give the guard a name</b> — <code>std::lock_guard&lt;std::mutex&gt;{m};</code> is a temporary that unlocks at the semicolon; (3) destructors must <b>not throw</b> (they are <code>noexcept</code> by default; a throw during unwinding calls <code>std::terminate</code>).</p>`,
    clues: [
      '"Make sure the mutex is always released, even if an exception is thrown" → <code>lock_guard</code>/<code>scoped_lock</code>',
      '"Lock two mutexes without deadlock" → <code>std::scoped_lock lk(m1, m2);</code>',
      '"Run cleanup code at the end of a scope" / "Go\'s <code>defer</code> in C++" → scope guard',
      '"Roll back on failure, keep on success" / "transactional" → <code>scope_fail</code> + <code>uncaught_exceptions()</code>',
      '"Wrap a C API handle (FILE*, socket, HANDLE)" → <code>unique_ptr</code> with custom deleter or a small RAII class',
      '"What happens if a destructor throws?" → <code>std::terminate</code> during unwinding; destructors are implicitly noexcept'
    ],
    code: [R`
      #include <iostream>
      #include <utility>
      #include <exception>
      #include <stdexcept>
      #include <cstdio>

      // A tiny generic scope guard: runs a callable when the scope ends (normally OR by exception).
      template <typename F>
      class ScopeGuard {
          F fn_;
          bool active_ = true;
      public:
          explicit ScopeGuard(F f) : fn_(std::move(f)) {}
          ScopeGuard(ScopeGuard&& o) noexcept : fn_(std::move(o.fn_)), active_(std::exchange(o.active_, false)) {}
          ScopeGuard(const ScopeGuard&) = delete;
          ScopeGuard& operator=(const ScopeGuard&) = delete;
          void dismiss() noexcept { active_ = false; }     // "commit": the cleanup is no longer needed
          ~ScopeGuard() { if (active_) fn_(); }            // destructors are implicitly noexcept
      };

      // Only runs the callable if the scope is left BY AN EXCEPTION (rollback guard).
      template <typename F>
      class ScopeFail {
          F fn_;
          int count_ = std::uncaught_exceptions();         // exceptions in flight at creation
      public:
          explicit ScopeFail(F f) : fn_(std::move(f)) {}
          ScopeFail(const ScopeFail&) = delete;
          ~ScopeFail() { if (std::uncaught_exceptions() > count_) fn_(); }
      };

      void transfer(int& from, int& to, int amt, bool fail) {
          from -= amt;
          ScopeFail undo([&] { from += amt; std::cout << "rolled back; "; });
          if (fail) throw std::runtime_error("network down");
          to += amt;                                       // success: undo never runs
      }

      int main() {
          {
              std::FILE* f = std::fopen("/dev/null", "w");
              ScopeGuard close([&] { if (f) std::fclose(f); std::cout << "file closed; "; });
              std::cout << "writing; ";
          }                                                // guard fires here
          int a = 100, b = 0;
          transfer(a, b, 30, false);
          try { transfer(a, b, 30, true); } catch (const std::exception& e) { std::cout << e.what() << "; "; }
          std::cout << "a=" << a << " b=" << b << "\n";    // writing; file closed; rolled back; network down; a=70 b=30
      }
    `],
    codeTitle: ['ScopeGuard (defer) and ScopeFail (rollback) from scratch'],
    viz: { title: 'Stack unwinding: guards release in reverse order', input: 'lock open txn alloc throw', inputLabel: 'Actions in order: lock, open, txn, alloc, work, throw', gen: guardViz },
    examples: [
      { title: 'The unnamed-guard bug (a classic code-review catch)', html: `<p>Three lines that look alike but behave very differently:</p>
        ${H.table(['code', 'what it really is', 'protected?'], [['<code>std::lock_guard lk(m);</code>', 'named guard, lives to end of scope', '<span class="c-g">yes</span>'], ['<code>std::lock_guard&lt;std::mutex&gt;{m};</code>', 'a <b>temporary</b> — destroyed at the <code>;</code>', '<span class="c-r">no — unlocked immediately</span>'], ['<code>std::unique_lock&lt;std::mutex&gt;(m);</code>', 'declares a <b>new variable named m</b> (default-constructed, owns nothing)', '<span class="c-r">no — locks nothing</span>']])}
        <p>The third one is the "most vexing parse" family: parentheses around a name in a declaration are allowed, so it declares a variable. Compilers warn with <code>-Wshadow</code>; static analysers (clang-tidy <code>bugprone-unused-raii</code>) catch the second.</p>` },
      { title: 'scoped_lock: two mutexes, no deadlock', html: `<p>Thread 1 transfers A→B (locks A then B), thread 2 transfers B→A (locks B then A) → classic deadlock. <code>std::scoped_lock</code> locks all its mutexes using a deadlock-avoidance algorithm (like <code>std::lock</code>), and unlocks them all at scope end.</p>`,
        code: R`
          #include <mutex>
          #include <thread>
          #include <iostream>
          struct Account { std::mutex m; long balance = 100; };
          void transfer(Account& from, Account& to, long amt) {
              std::scoped_lock lk(from.m, to.m);       // both or neither, any order, no deadlock
              from.balance -= amt;
              to.balance += amt;
          }                                            // both unlocked here
          int main() {
              Account a, b;
              std::thread t1([&] { for (int i = 0; i < 1000; ++i) transfer(a, b, 1); });
              std::thread t2([&] { for (int i = 0; i < 1000; ++i) transfer(b, a, 1); });
              t1.join(); t2.join();
              std::cout << a.balance + b.balance << "\n";   // 200, always
          }` },
      { title: 'unique_ptr with a custom deleter for C handles', html: `<p>No need to write a class: <code>std::unique_ptr&lt;FILE, Closer&gt;</code> calls <code>fclose</code> automatically. With a <b>stateless</b> deleter type (an empty struct or, in C++20, a captureless lambda type via <code>decltype</code>) the smart pointer is exactly the size of a raw pointer.</p>`,
        code: R`
          #include <cstdio>
          #include <memory>
          #include <iostream>
          struct FileCloser { void operator()(std::FILE* f) const noexcept { if (f) std::fclose(f); } };
          using FilePtr = std::unique_ptr<std::FILE, FileCloser>;
          int main() {
              FilePtr f(std::fopen("/dev/null", "w"));
              if (f) std::fputs("hello", f.get());
              std::cout << (sizeof(FilePtr) == sizeof(std::FILE*)) << "\n";   // 1: zero overhead
          }                                                                   // fclose runs here` },
      { title: 'Why destructors must not throw', html: `<p>During unwinding, if a destructor lets an exception escape, there would be <b>two</b> exceptions in flight — C++ calls <code>std::terminate</code>. Since C++11 destructors are implicitly <code>noexcept</code>, so even a throw outside of unwinding terminates. If a release can fail (e.g. <code>fclose</code> flushing to a full disk), offer an explicit <code>close()</code> that reports errors and let the destructor be a silent best-effort fallback.</p>
        ${H.table(['situation', 'destructor throws →'], [['normal scope exit, implicit noexcept', '<span class="c-r">std::terminate</span>'], ['during stack unwinding', '<span class="c-r">std::terminate</span>'], ['explicit <code>noexcept(false)</code>, normal exit', 'exception propagates (legal, but dangerous design)']])}` }
    ],
    deepDive: `<p>🟣 <b>Exception-safety levels and how guards deliver them.</b> <b>Basic</b>: no leaks, invariants hold (any RAII code gets this for free). <b>Strong</b>: commit-or-rollback (copy-and-swap, or <code>scope_fail</code> undo actions). <b>Nothrow</b>: destructors, swaps, moves marked <code>noexcept</code>. Guards are how real code reaches basic and strong without try/catch walls.</p>
      <ul>
        <li><b>Order matters.</b> Locals are destroyed in reverse order of construction — so declare the guard <b>after</b> the thing it cleans up, and the lock <b>before</b> the data access it protects. Members are destroyed in reverse declaration order too.</li>
        <li><b>Partially constructed objects.</b> If a constructor throws, the destructor of <i>that</i> object does not run — but already-constructed members and bases are destroyed. That is why owning members should themselves be RAII types (<code>unique_ptr</code>, <code>vector</code>), never raw <code>new</code> in an initializer list (two raw news: the second throws, the first leaks).</li>
        <li><b><code>uncaught_exceptions()</code> vs the deprecated <code>uncaught_exception()</code>:</b> the old bool version was wrong for guards created inside a destructor that runs during unwinding; the count-based version compares "then vs now" correctly. <code>std::uncaught_exception()</code> was removed in C++20.</li>
        <li><b>Guards and coroutines/threads:</b> a guard in a coroutine lives in the coroutine frame and is destroyed only when the frame is destroyed — a lock held across a <code>co_await</code> may be released on another thread (UB for <code>std::mutex</code>). Never hold a <code>std::lock_guard</code> across a suspension point.</li>
        <li><b>Cost:</b> zero in the happy path (destructor calls are just inlined code at scope exits); on the exception path, unwinding uses table-driven "zero-cost" exceptions — no runtime cost until something throws, then it's slow (microseconds). That's fine: exceptions are for exceptional paths.</li>
        <li><b>std status:</b> <code>scope_exit</code>/<code>scope_fail</code>/<code>scope_success</code> and <code>unique_resource</code> live in <code>&lt;experimental/scope&gt;</code> (Library Fundamentals TS v3); they are not yet in the C++23 standard, so production code uses GSL's <code>finally</code>, folly's <code>SCOPE_EXIT</code>, Boost.Scope, or a 20-line home-made guard like the one above.</li>
      </ul>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants convert manual <code>try { ... } catch (...) { cleanup(); throw; }</code> blocks into guards well, and linters + AI review now routinely flag unnamed guards and raw <code>new</code>/<code>delete</code> pairs.</p>
      <p><b>Use AI as a partner:</b> "Find every path in this function that can leak the socket", "Rewrite with RAII and show the destruction order", "Generate a fault-injection test that throws from each step and checks the rollback".</p>
      <p><b>Where AI goes wrong:</b> it writes <code>std::lock_guard&lt;std::mutex&gt;(m);</code> (vexing parse), throws from destructors, uses the deprecated <code>uncaught_exception()</code>, holds a lock across <code>co_await</code>, or captures by reference in a guard that outlives the variables (when the guard is moved out of the function).</p>
      <p><b>What you must own:</b> explaining stack unwinding and destruction order, choosing the right guard, and reasoning about which exception-safety guarantee a function gives.</p>`,
    problems: [{
      title: 'Implement a Defer / ScopeGuard with dismiss()', level: 'Easy', tags: ['raii', 'scope guard', 'lambdas'], companies: ['Meta', 'Amazon'],
      statement: `<p>Write <code>ScopeGuard&lt;F&gt;</code> and a helper <code>makeGuard(f)</code>: the guard calls <code>f()</code> when it goes out of scope, unless <code>dismiss()</code> was called. It must be non-copyable, movable (a moved-from guard must <b>not</b> fire), and safe to use with lambdas. Use it to restore a global "verbose" flag and to undo a <code>push_back</code> if a later step fails.</p>`,
      constraints: `<p>C++20. Destructor must not throw. No heap allocation.</p>`,
      example: `<pre>bool verbose = false;
{ verbose = true; auto g = makeGuard([&amp;]{ verbose = false; }); ... }   → verbose = ${H.c('g', 'false')} after the block
v.push_back(x); auto undo = makeGuard([&amp;]{ v.pop_back(); });
saveToDisk(v);  // throws → undo runs → v unchanged
undo.dismiss(); // success path → undo does nothing</pre>`,
      brute: { why: `<p>Without a guard you repeat the cleanup on every exit path and wrap things in try/catch. Each new <code>return</code> is a new chance to forget it, and a <code>catch (...) { cleanup(); throw; }</code> wall hides the real logic.</p>`,
        code: R`
          #include <vector>
          #include <stdexcept>
          bool verbose = false;
          void save(const std::vector<int>& v) { if (v.size() > 2) throw std::runtime_error("disk full"); }
          void addAndSave(std::vector<int>& v, int x) {
              verbose = true;
              v.push_back(x);
              try {
                  save(v);
              } catch (...) {
                  v.pop_back();          // cleanup #1, duplicated on every path
                  verbose = false;       // cleanup #2
                  throw;
              }
              verbose = false;           // and again on the success path
          }
          int main() { std::vector<int> v; addAndSave(v, 1); }` },
      mcq: { q: 'Why must the move constructor of ScopeGuard set the source\'s <code>active_</code> to false?', options: ['Otherwise both the moved-from and the moved-to guard would run the cleanup — it would run twice', 'Moves are not allowed for guards', 'To make the guard copyable', 'It is only needed for performance'], answer: 0, explain: 'After a move there are two guard objects. Only the destination should fire, so the source is deactivated (often with <code>std::exchange(o.active_, false)</code>).' },
      hints: [`<p>Store the callable by value (<code>F fn_</code>) plus a <code>bool active_ = true</code>. The destructor does <code>if (active_) fn_();</code>.</p>`, `<p>Delete the copy constructor/assignment. In the move constructor, move the callable and use <code>std::exchange(o.active_, false)</code>.</p>`, `<p><code>template &lt;class F&gt; ScopeGuard&lt;std::decay_t&lt;F&gt;&gt; makeGuard(F&amp;&amp; f)</code> — or rely on C++17 CTAD: <code>ScopeGuard g([&amp;]{...});</code>. Mark <code>dismiss()</code> noexcept.</p>`],
      solution: {
        approach: `<p>A tiny RAII class holding the callable and an "armed" flag. Destruction fires the callable if still armed; <code>dismiss()</code> disarms it (the commit point); moves transfer the duty and disarm the source. CTAD or <code>makeGuard</code> deduces the lambda type, so there is no <code>std::function</code> and no allocation.</p>`,
        code: R`
          #include <iostream>
          #include <stdexcept>
          #include <type_traits>
          #include <utility>
          #include <vector>

          template <typename F>
          class ScopeGuard {
              F fn_;
              bool active_ = true;
          public:
              explicit ScopeGuard(F f) noexcept(std::is_nothrow_move_constructible_v<F>) : fn_(std::move(f)) {}
              ScopeGuard(ScopeGuard&& o) noexcept(std::is_nothrow_move_constructible_v<F>)
                  : fn_(std::move(o.fn_)), active_(std::exchange(o.active_, false)) {}
              ScopeGuard(const ScopeGuard&) = delete;
              ScopeGuard& operator=(const ScopeGuard&) = delete;
              ScopeGuard& operator=(ScopeGuard&&) = delete;
              void dismiss() noexcept { active_ = false; }
              ~ScopeGuard() { if (active_) fn_(); }
          };
          template <typename F>
          ScopeGuard<std::decay_t<F>> makeGuard(F&& f) { return ScopeGuard<std::decay_t<F>>(std::forward<F>(f)); }

          bool verbose = false;
          void save(const std::vector<int>& v) { if (v.size() > 2) throw std::runtime_error("disk full"); }

          void addAndSave(std::vector<int>& v, int x) {
              verbose = true;
              auto restore = makeGuard([&] { verbose = false; });   // always runs
              v.push_back(x);
              auto undo = makeGuard([&] { v.pop_back(); });         // runs only if not dismissed
              save(v);                                              // may throw
              undo.dismiss();                                       // commit point
          }

          int main() {
              std::vector<int> v;
              addAndSave(v, 1); addAndSave(v, 2);
              try { addAndSave(v, 3); } catch (const std::exception& e) { std::cout << e.what() << ": "; }
              std::cout << v.size() << " verbose=" << verbose << "\n";   // disk full: 2 verbose=0
          }`,
        dry: { head: ['call', 'after push_back', 'save()', 'undo', 'restore', 'v.size()'], rows: [
          ['addAndSave(v,1)', '[1]', 'ok', 'dismissed', 'fires: verbose=false', '1'], ['addAndSave(v,2)', '[1,2]', 'ok', 'dismissed', 'fires', '2'], ['addAndSave(v,3)', '[1,2,3]', '<span class="c-r">throws</span>', '<span class="c-g">fires: pop_back</span>', 'fires', '<span class="c-g">2</span>']] },
        complexity: `<p>O(1) time and no heap allocation; the guard is as big as the lambda's captures plus a bool.</p>`,
        followUps: ['Turn it into <code>ScopeFail</code> using <code>std::uncaught_exceptions()</code> so no explicit <code>dismiss()</code> is needed.', 'What happens if the cleanup lambda itself throws? How would you make that safe?', 'Write a <code>DEFER { ... };</code> macro using a unique variable name (<code>__COUNTER__</code>).']
      }
    }]
  });
  registerModule({ id: 'cpp13', title: 'Expert Idioms + Question Bank', intro: '<p>stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub</p>', goals: ['aaaaaaaaaaaa','bbbbbbbbbbbbbb','cccccccccccc'], prereqs: 'xxxxxxxxxxxxxxxxxxxx', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
