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
      brute: { why: `<p>A naive version uses <b>one non-template base</b> with static counters. All classes share the same variables, so A's and B's counts get mixed. Another naive bug is counting only in the default constructor — copies are never counted but are still destroyed, so <code>alive()</code> drifts low and eventually goes negative.</p>`,
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
              std::cout << CounterBase::created_ << " " << CounterBase::alive_ << "\n";   // "2 0": copy never counted, A and B mixed (truth: A 2/1, B 1/0)
          }` },
      mcq: { q: 'Why does <code>ObjectCounter&lt;A&gt;</code> keep a separate count from <code>ObjectCounter&lt;B&gt;</code>?', options: ['Each template instantiation is a distinct class with its own static members', 'Static members are stored inside each object', 'The compiler adds a hidden type id', 'Because of virtual inheritance'], answer: 0, explain: '<code>ObjectCounter&lt;A&gt;</code> and <code>ObjectCounter&lt;B&gt;</code> are two unrelated classes, so <code>static inline int alive</code> exists once for each.' },
      hints: [`<p>Make the base a <b>template</b> parameterised on the derived class; static data then becomes per-class automatically.</p>`, `<p>Increment in the default, copy <i>and</i> move constructors; decrement in the destructor. Use <code>static inline</code> (C++17) so you need no out-of-class definition.</p>`, `<p>Make the destructor <code>protected</code> (non-virtual) so nobody deletes a derived object through <code>ObjectCounter&lt;T&gt;*</code>. Recipe: template base → three constructors increment → destructor decrements → static getters.</p>`],
      tests: {"io":true,"cases":[{"stdin":"","stdout":"2 1 1 0\n3 1\n4 2\n9 2\n0 0\n10 2"}]},
      solution: {
        approach: `<p>CRTP mixin: the derived class passes itself as <code>T</code>, so each class gets its own <code>created_</code>/<code>alive_</code> pair. Every way of making an object (default, copy, move) runs one of the base constructors, so all are counted. The destructor is protected so the base is only usable as a mixin, never as a polymorphic handle.</p>`,
        code: R`
          #include <vector>
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

          struct D : ObjectCounter<D> {};

          int main() {
              A a1;
              { A a2 = a1; B b; }
              std::cout << A::created() << " " << A::alive() << " "
                        << B::created() << " " << B::alive() << "\n";   // 2 1 1 0
              { A m = std::move(a1); }                                  // a move constructs a new object too
              std::cout << A::created() << " " << A::alive() << "\n";   // 3 1
              A a3;
              a3 = a1;                                                  // assignment creates nothing
              std::cout << A::created() << " " << A::alive() << "\n";   // 4 2
              { std::vector<A> v(5); }
              std::cout << A::created() << " " << A::alive() << "\n";   // 9 2
              std::cout << D::created() << " " << D::alive() << "\n";   // 0 0  (a class never instantiated)
              A();                                                      // a temporary counts, then dies
              std::cout << A::created() << " " << A::alive() << "\n";   // 10 2
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
      tests: {"io":true,"cases":[{"stdin":"","stdout":"2 3\n2 0\n3 3\n4 3\n3\n4 0\n0\n100000"}]},
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
              Logger d("[x] ");
              d = b;                                                // copy assignment
              std::cout << d.size() << " " << b.size() << "\n";     // 3 3
              d.log("z");
              std::cout << d.size() << " " << b.size() << "\n";     // 4 3  (independent)
              Logger& rb = b;
              b = rb;                                               // self-assignment is safe
              std::cout << b.size() << "\n";                        // 3
              Logger e("[e] ");
              e = std::move(d);                                     // move assignment
              std::cout << e.size() << " " << d.size() << "\n";     // 4 0
              Logger z("[z] ");
              std::cout << z.size() << "\n";                        // 0
              for (int i = 0; i < 100000; ++i) z.log("line");
              std::cout << z.size() << "\n";                        // 100000
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
      tests: {"io":true,"cases":[{"stdin":"","stdout":"9 13\n0\nempty call\n42 6\n1 2 3 3\n0 13\n2\nababab\n0 empty\n105 100"}]},
      solution: {
        approach: `<p>Classic Concept/Model type erasure, specialized on the signature <code>R(Args...)</code>. The template constructor captures the callable's real type F into <code>Model&lt;F&gt;</code>; calls go through the virtual <code>call</code>; copies go through virtual <code>clone</code>; assignment reuses copy-and-swap.</p>`,
        code: R`
          #include <array>
          #include <string>
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

          int twice(int x) { return 2 * x; }
          struct Adder { int n; int operator()(int x) const { return x + n; } };

          int main() {
              int k = 10;
              Function<int(int)> f = [k](int x) { return x + k; };
              Function<int(int)> g = f;                    // deep copy through clone()
              f = [](int x) { return x * x; };             // template ctor + copy-and-swap assignment
              std::cout << f(3) << " " << g(3) << "\n";    // 9 13
              Function<int(int)> e;
              std::cout << static_cast<bool>(e) << "\n";   // 0
              try { e(1); } catch (const std::bad_function_call&) { std::cout << "empty call\n"; }
              Function<int(int)> fp = twice;
              Function<int(int)> fa = Adder{5};
              std::cout << fp(21) << " " << fa(1) << "\n";             // 42 6
              Function<int()> ctr = [n = 0]() mutable { return ++n; };
              int c1 = ctr(), c2 = ctr();
              Function<int()> ctr2 = ctr;                              // copies the state too
              int c3 = ctr2(), c4 = ctr();
              std::cout << c1 << " " << c2 << " " << c3 << " " << c4 << "\n";   // 1 2 3 3
              Function<int(int)> m = std::move(g);
              std::cout << static_cast<bool>(g) << " " << m(3) << "\n";         // 0 13
              Function<void(int&)> inc = [](int& x) { ++x; };
              int v = 1;
              inc(v);
              std::cout << v << "\n";                                  // 2
              Function<std::string(std::string, int)> rep = [](std::string s, int n) { std::string r; while (n-- > 0) r += s; return r; };
              std::cout << rep("ab", 3) << "\n";                       // ababab
              f = Function<int(int)>{};
              std::cout << static_cast<bool>(f);
              try { f(1); } catch (const std::bad_function_call&) { std::cout << " empty\n"; }   // 0 empty
              std::array<int, 100> ones;
              ones.fill(1);
              Function<int(int)> big = [ones](int x) { int s = x; for (int y : ones) s += y; return s; };
              Function<int(int)> bigCopy = big;
              std::cout << big(5) << " " << bigCopy(0) << "\n";        // 105 100
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
      tests: {"io":true,"cases":[{"stdin":"","stdout":"123 0\n100 2 3\n0 0 0\nbad_alloc 3 3\n29999994 0\n5 2"}]},
      solution: {
        approach: `<p>Copy constructor + destructor + member-wise noexcept swap + by-value assignment. Copies are made before the object is touched (strong guarantee); self-assignment copies, swaps and frees the old buffer; rvalues move-construct the parameter so the same operator handles move-assignment.</p>`,
        code: R`
          #include <new>
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
              std::cout << a[0] << " " << a[1] << " " << a[2] << "\n";          // 100 2 3
              IntBuffer e;
              IntBuffer e2 = e;
              a = e;                                              // assigning an empty buffer
              std::cout << e.size() << " " << e2.size() << " " << a.size() << "\n";   // 0 0 0
              try { IntBuffer huge(std::size_t(1) << 60); }
              catch (const std::bad_alloc&) { std::cout << "bad_alloc "; }
              std::cout << c.size() << " " << c[2] << "\n";       // 3 3  (c untouched)
              IntBuffer big(10000000);
              for (std::size_t i = 0; i < big.size(); ++i) big[i] = static_cast<int>(i % 7);
              IntBuffer big2 = big;
              big[0] = 100;
              long long sum = 0;
              for (std::size_t i = 0; i < big2.size(); ++i) sum += big2[i];
              std::cout << sum << " " << big2[0] << "\n";         // 29999994 0
              IntBuffer x(2), y(5);
              swap(x, y);
              std::cout << x.size() << " " << y.size() << "\n";   // 5 2
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
    if (frames.length < 3) snap('Nothing had been acquired yet, so there is nothing to release — unwinding simply leaves the scope. Try <code>lock open txn throw</code> to watch guards being released in reverse order.', 0, 'cur');
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
      tests: {"io":true,"cases":[{"stdin":"","stdout":"disk full: 2 verbose=0\n1 2\n1\n1\n2\n2\nba\n3"}]},
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
              std::cout << v[0] << " " << v[1] << "\n";                  // 1 2  (the failed push was undone)
              static_assert(!std::is_copy_constructible_v<ScopeGuard<void(*)()>>);
              int fired = 0;
              { auto g = makeGuard([&] { ++fired; }); }
              std::cout << fired << "\n";                                // 1
              { auto g = makeGuard([&] { ++fired; }); g.dismiss(); }
              std::cout << fired << "\n";                                // 1
              { auto g = makeGuard([&] { ++fired; }); auto h = std::move(g); }   // the moved-from guard must not fire
              std::cout << fired << "\n";                                // 2
              { auto g = makeGuard([&] { ++fired; }); auto h = std::move(g); h.dismiss(); }
              std::cout << fired << "\n";                                // 2
              std::string order;
              { auto g1 = makeGuard([&] { order += "a"; }); auto g2 = makeGuard([&] { order += "b"; }); }
              std::cout << order << "\n";                                // ba  (reverse order of construction)
              try { auto g = makeGuard([&] { ++fired; }); throw 1; } catch (int) {}
              std::cout << fired << "\n";                                // 3
          }`,
        dry: { head: ['call', 'after push_back', 'save()', 'undo', 'restore', 'v.size()'], rows: [
          ['addAndSave(v,1)', '[1]', 'ok', 'dismissed', 'fires: verbose=false', '1'], ['addAndSave(v,2)', '[1,2]', 'ok', 'dismissed', 'fires', '2'], ['addAndSave(v,3)', '[1,2,3]', '<span class="c-r">throws</span>', '<span class="c-g">fires: pop_back</span>', 'fires', '<span class="c-g">2</span>']] },
        complexity: `<p>O(1) time and no heap allocation; the guard is as big as the lambda's captures plus a bool.</p>`,
        followUps: ['Turn it into <code>ScopeFail</code> using <code>std::uncaught_exceptions()</code> so no explicit <code>dismiss()</code> is needed.', 'What happens if the cleanup lambda itself throws? How would you make that safe?', 'Write a <code>DEFER { ... };</code> macro using a unique variable name (<code>__COUNTER__</code>).']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — COROUTINES (C++20) BASICS
     ====================================================================== */
  function coroViz(input) {
    var N = intIn(input, '3', 1, 6, 'Countdown start');
    var code = 'Generator countdown(int n) {\n    for (int i = n; i > 0; --i)\n        co_yield i;           // suspend + hand i out\n}                             // falls off end: final_suspend\n// ---- caller ----\nauto g = countdown(' + N + ');\nwhile (g.next())              // resume until next co_yield\n    std::cout << g.value();\n// g destroyed -> h.destroy()';
    var frames = [], out = '';
    function F(narr, hl, stack, frame, fhl, extra) {
      frames.push({ narr: narr, parts: [codePart('generator + caller', code, hl), { type: 'stack', label: 'thread call stack', items: stack, hl: { [stack.length - 1]: 'cur' } },
        { type: 'vars', label: 'coroutine frame (on the heap)', vals: frame, hl: fhl || {} }, { type: 'vars', label: 'output so far', vals: { stdout: out === '' ? '(nothing)' : out } }].concat(extra || []) });
    }
    F('<code>countdown(' + N + ')</code> is called. Because its body uses <code>co_yield</code>, it is a <b>coroutine</b>: the compiler allocates a <b>coroutine frame on the heap</b> (holding parameters, locals and the <code>promise</code>), builds the return object <code>Generator</code> via <code>get_return_object()</code>, then hits <code>initial_suspend()</code> → <code>suspend_always</code>: it pauses <b>before running a single line of the body</b>.',
      { 6: 'cur', 1: 'win' }, ['main()'], { n: N, i: '(not yet)', 'promise.current': 0, state: 'suspended at start' }, { state: 'cur' });
    var i = N;
    for (var k = 0; k < N; k++) {
      F((k === 0 ? 'First <code>g.next()</code> calls <code>h.resume()</code>. The coroutine body now runs <b>on top of the caller\'s stack</b> (stackless: it borrows the thread\'s stack while running). <code>i = ' + i + '</code>.' : '<code>g.next()</code> resumes the coroutine <b>exactly where it paused</b> — right after the previous <code>co_yield</code>. <code>--i</code> → i = ' + i + ', the loop test passes.'),
        { 7: 'cur', 2: 'ok' }, ['main()', 'g.next()', 'countdown (resumed)'], { n: N, i: i, 'promise.current': k === 0 ? 0 : i + 1, state: 'running' }, { i: 'ok', state: 'ok' });
      F('<code>co_yield ' + i + '</code> = <code>co_await promise.yield_value(' + i + ')</code>: the promise stores ' + i + ' and returns <code>suspend_always</code>. The coroutine <b>suspends</b>: its frame (with i = ' + i + ') stays on the heap, its stack frames are popped, and control returns to <code>next()</code>, which reports <code>!done()</code> = true.',
        { 3: 'cur' }, ['main()', 'g.next()'], { n: N, i: i, 'promise.current': i, state: 'suspended at co_yield' }, { 'promise.current': 'sel', state: 'cur' });
      out += i + ' ';
      F('Back in <code>main</code>: <code>g.value()</code> reads <code>promise.current</code> = <b>' + i + '</b> and prints it. The coroutine is frozen, holding its local <code>i</code>, until someone resumes it.',
        { 8: 'ok' }, ['main()'], { n: N, i: i, 'promise.current': i, state: 'suspended at co_yield' }, {});
      i--;
    }
    F('Resume once more: <code>--i</code> → 0, loop condition <code>i &gt; 0</code> fails, execution <b>falls off the end</b> of the body = implicit <code>co_return;</code> → <code>promise.return_void()</code> → <code>final_suspend()</code> (suspend_always) — the coroutine stops for good but its frame is kept so <code>done()</code> can be queried safely.',
      { 4: 'cur', 7: 'cur' }, ['main()', 'g.next()', 'countdown (resumed)'], { n: N, i: 0, 'promise.current': 1, state: 'final suspend (done)' }, { state: 'bad' });
    F('<code>next()</code> returns <code>!h.done()</code> = false → the while loop ends. Output so far: <b>' + out.trim() + '</b>.',
      { 7: 'bad' }, ['main()'], { n: N, i: 0, 'promise.current': 1, state: 'done' }, {});
    F('<code>g</code> goes out of scope; the <code>Generator</code> destructor calls <code>h.destroy()</code>, which runs destructors of the frame\'s locals and <b>frees the heap frame</b>. Forget this and every generator leaks its frame — the handle is a raw resource, so wrap it in RAII.',
      { 9: 'ok' }, ['main()'], { frame: 'freed' }, { frame: 'bad' },
      [{ type: 'table', label: 'what the compiler generated around your body', columns: ['hook (promise_type)', 'when'], rows: [['get_return_object()', 'right after frame allocation'], ['initial_suspend()', 'before the body (lazy vs eager)'], ['yield_value(v)', 'each co_yield v'], ['return_void() / return_value(v)', 'co_return'], ['unhandled_exception()', 'an exception escapes the body'], ['final_suspend()', 'after the body finishes']] }]);
    return frames;
  }

  topics.push({
    title: 'Coroutines (C++20) Basics: co_yield, co_await, co_return',
    analogy: `<p>Reading a <b>book with a bookmark</b>. A normal function is like reading a whole chapter in one sitting — once you stop, you start over next time. A <b>coroutine</b> is reading with a bookmark: you read until a good stopping point (<code>co_yield</code>), put the bookmark in, go do something else, and later open the book exactly where you left off, remembering everything you'd read. The bookmark + your notes are the <b>coroutine frame</b>; the person who decides when you read again is the <b>caller holding the handle</b>.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A coroutine is a function that can <b>pause</b> in the middle and later <b>resume</b> where it left off, with all its local variables intact. In C++20 any function whose body contains one of three keywords is a coroutine:</p>
      ${H.table(['keyword', 'meaning', 'used for'], [['<code>co_yield v</code>', 'pause and hand a value to the caller', 'generators / lazy sequences'], ['<code>co_await expr</code>', 'pause until something is ready (I/O, timer, another task)', 'async code that reads like sync code'], ['<code>co_return v</code>', 'finish, optionally with a result', 'tasks returning a value']])}
      <p><b>What happens under the hood:</b></p>
      <ul>
        <li>The compiler allocates a <b>coroutine frame</b> (usually on the heap) holding the parameters (copied), locals that live across suspensions, the current suspension point, and a <b>promise object</b>.</li>
        <li>The <b>return type</b> (e.g. <code>Generator</code>) must contain a nested <code>promise_type</code>. The compiler calls its hooks: <code>get_return_object</code>, <code>initial_suspend</code>, <code>yield_value</code>, <code>return_void</code>/<code>return_value</code>, <code>unhandled_exception</code>, <code>final_suspend</code>.</li>
        <li>The caller controls the coroutine through a <code>std::coroutine_handle&lt;promise_type&gt;</code>: <code>resume()</code>, <code>done()</code>, <code>destroy()</code>, <code>promise()</code>.</li>
        <li>C++20 coroutines are <b>stackless</b>: while running, they use the caller's stack; when suspended, only the frame survives. You can only suspend in the coroutine body itself, not in a function it calls.</li>
      </ul>
      <p><b>Important:</b> C++20 gives you the <b>language machinery but almost no library types</b>. You write (or import) <code>Generator</code>/<code>Task</code> yourself or use a library (cppcoro, Boost.Asio, folly::coro). C++23 adds <code>std::generator</code>; C++26 adds <code>std::execution</code> (senders/receivers) for async.</p>
      ${H.table(['', 'normal function', 'thread', 'coroutine'], [['can pause mid-way?', 'no', 'yes (blocks)', '<span class="c-g">yes (cooperatively)</span>'], ['memory per instance', 'stack frame', '~1–8 MB stack', '<span class="c-g">one heap frame (bytes to KB)</span>'], ['switch cost', '—', 'kernel context switch (µs)', '<span class="c-g">function-call-like (ns)</span>'], ['parallelism', 'no', 'yes', 'no by itself (runs on whoever resumes it)']])}`,
    clues: [
      '"Lazy sequence", "infinite stream", "produce values on demand" → generator with <code>co_yield</code>',
      '"Async code without callback hell", "await an I/O operation" → <code>co_await</code> + a Task type',
      '"What is <code>promise_type</code>?", "what is a coroutine handle?" → C++20 coroutine machinery',
      '"Stackful vs stackless coroutines" → C++20 is stackless (frame on heap, suspend only in the body)',
      '"10k concurrent connections without 10k threads" → coroutines on an event loop (Asio)',
      '"Why does my coroutine crash after the caller\'s string went away?" → reference parameter dangles across suspension'
    ],
    code: [R`
      #include <coroutine>
      #include <iostream>
      #include <exception>
      #include <utility>

      // A minimal lazy integer generator built on C++20 coroutines.
      struct Generator {
          struct promise_type {                                  // the compiler looks for this exact name
              int current = 0;                                   // last value passed to co_yield
              Generator get_return_object() {                    // called first: build the caller's handle
                  return Generator{std::coroutine_handle<promise_type>::from_promise(*this)};
              }
              std::suspend_always initial_suspend() noexcept { return {}; }   // lazy: don't run until asked
              std::suspend_always final_suspend() noexcept { return {}; }     // keep frame alive so done() works
              std::suspend_always yield_value(int v) noexcept { current = v; return {}; }  // co_yield v
              void return_void() noexcept {}                     // co_return; / falling off the end
              void unhandled_exception() { std::terminate(); }
          };
          using handle = std::coroutine_handle<promise_type>;

          explicit Generator(handle h) : h_(h) {}
          Generator(Generator&& o) noexcept : h_(std::exchange(o.h_, {})) {}
          Generator(const Generator&) = delete;
          ~Generator() { if (h_) h_.destroy(); }                 // RAII: free the coroutine frame

          bool next() { h_.resume(); return !h_.done(); }        // run until the next co_yield (or end)
          int value() const { return h_.promise().current; }
      private:
          handle h_;
      };

      Generator countdown(int from) {        // looks like a normal function, but it is a coroutine
          for (int i = from; i > 0; --i)
              co_yield i;                    // suspend here, hand i to the caller
      }                                      // falling off the end = co_return;

      Generator fib() {                      // infinite stream — fine, because it's lazy
          long a = 0, b = 1;
          while (true) { co_yield static_cast<int>(a); auto t = a + b; a = b; b = t; }
      }

      int main() {
          auto g = countdown(3);
          while (g.next()) std::cout << g.value() << " ";     // 3 2 1
          auto f = fib();
          for (int i = 0; i < 8 && f.next(); ++i) std::cout << f.value() << ",";   // 0,1,1,2,3,5,8,13,
          std::cout << "\n";
      }
    `],
    codeTitle: ['A complete minimal Generator + two coroutines'],
    viz: { title: 'A generator suspending and resuming', input: '3', inputLabel: 'Countdown start n (1 to 6)', gen: coroViz },
    examples: [
      { title: 'co_await step by step: the awaiter protocol', html: `<p><code>co_await x</code> asks the awaiter three questions: <code>await_ready()</code> — "is the result already available?" (true = don't suspend); <code>await_suspend(h)</code> — "we're suspending; here's the handle, arrange for someone to resume it" (e.g. register with an I/O reactor); <code>await_resume()</code> — "we're back; what's the value of the co_await expression?". Trace the output order below.</p>
        ${H.table(['order', 'printed', 'who'], [['1', 'start', 'coroutine body (eager: suspend_never)'], ['2', 'ready?', 'await_ready → false'], ['3', 'suspend', 'await_suspend stores the handle'], ['4', '| main runs |', 'control is back in main'], ['5', 'resume', 'main called saved.resume() → await_resume'], ['6', 'got 42', 'body continues with v = 42']])}`,
        code: R`
          #include <coroutine>
          #include <iostream>
          #include <exception>
          struct Task {
              struct promise_type {
                  Task get_return_object() { return {}; }
                  std::suspend_never initial_suspend() noexcept { return {}; }   // start running immediately
                  std::suspend_never final_suspend() noexcept { return {}; }     // free the frame at the end
                  void return_void() noexcept {}
                  void unhandled_exception() { std::terminate(); }
              };
          };
          std::coroutine_handle<> saved;                    // someone must remember how to resume us
          struct Pause {
              bool await_ready() const noexcept { std::cout << "ready? "; return false; }   // false = do suspend
              void await_suspend(std::coroutine_handle<> h) noexcept { std::cout << "suspend "; saved = h; }
              int await_resume() const noexcept { std::cout << "resume "; return 42; }      // value of co_await
          };
          Task work() {
              std::cout << "start ";
              int v = co_await Pause{};
              std::cout << "got " << v << " ";
          }
          int main() {
              work();
              std::cout << "| main runs | ";
              saved.resume();
              std::cout << "\n";       // start ready? suspend | main runs | resume got 42
          }` },
      { title: 'The #1 coroutine bug: reference parameters that dangle', html: `<p>Parameters are copied into the frame — but a <b>reference</b> parameter copies only the reference. If the caller passes a temporary (<code>words(std::string("a b c"))</code>), the temporary dies at the end of the full expression, while the lazy coroutine has not even started. When it later runs, it reads a destroyed string → <b>undefined behavior</b>. Rule: coroutine parameters should be <b>by value</b> (or the caller must guarantee lifetime).</p>
        ${H.table(['signature', 'called with a temporary', 'safe?'], [['<code>Gen words(const std::string&amp; s)</code>', 'reference to a dead temporary', '<span class="c-r">UB</span>'], ['<code>Gen words(std::string s)</code>', 'string moved into the frame', '<span class="c-g">yes</span>'], ['<code>Gen words(std::string_view s)</code>', 'view of a dead temporary', '<span class="c-r">UB</span>']])}` },
      { title: 'Making a generator range-for friendly (and C++23 std::generator)', html: `<p>Add an <code>iterator</code> whose <code>operator++</code> resumes the handle, whose <code>operator*</code> reads <code>promise().current</code>, and which compares equal to <code>std::default_sentinel</code> when <code>done()</code>. Then <code>for (int x : range(0, 10, 3))</code> just works. In C++23 the standard ships this as <code>std::generator&lt;T&gt;</code>:</p>
        <pre>std::generator&lt;int&gt; iota(int n) { for (int i = 0; i &lt; n; ++i) co_yield i; }   // C++23
for (int x : iota(5)) std::cout &lt;&lt; x;                                           // 01234</pre>
        <p>The guided problem below builds the iterator version yourself.</p>` },
      { title: 'Never hold a lock across co_await', html: `<p>A <code>std::lock_guard</code> declared before a <code>co_await</code> lives in the frame and stays locked while the coroutine is suspended — possibly for a long time, blocking every other user. Worse, if the coroutine resumes on a <b>different thread</b>, that thread unlocks a <code>std::mutex</code> it doesn't own → <b>undefined behavior</b>. Use an async mutex (<code>co_await mtx.lock()</code> style) or release before suspending.</p>
        ${H.table(['pattern', 'risk'], [['<code>std::lock_guard lk(m); co_await io();</code>', '<span class="c-r">blocks others; UB if resumed on another thread</span>'], ['<code>{ std::lock_guard lk(m); copy = data; } co_await io(copy);</code>', '<span class="c-g">lock released before suspending</span>']])}` }
    ],
    deepDive: `<p>🟣 <b>Internals and production reality.</b></p>
      <ul>
        <li><b>The transformation.</b> The compiler rewrites the body into a state machine: a frame struct (promise, params, live locals, an index of the current suspension point) plus a resume function with a <code>switch</code> on that index. <code>co_yield e</code> becomes <code>co_await promise.yield_value(e)</code>; <code>co_return e</code> calls <code>promise.return_value(e)</code> then jumps to the final suspend.</li>
        <li><b>Allocation.</b> The frame is allocated with <code>operator new</code> (customizable via <code>promise_type::operator new</code>, e.g. for pooling). Compilers can elide it (<b>HALO</b>: heap allocation elision) when the coroutine's lifetime is provably nested inside the caller — common for generators consumed in the same function, not guaranteed.</li>
        <li><b>Symmetric transfer.</b> <code>await_suspend</code> may return another <code>coroutine_handle</code> to resume next — a tail-call between coroutines that avoids stack growth in long chains of tasks awaiting tasks.</li>
        <li><b>Lazy vs eager:</b> <code>initial_suspend</code> returning <code>suspend_always</code> makes the coroutine lazy (structured, nothing runs until awaited — preferred for Tasks); <code>suspend_never</code> makes it eager. <code>final_suspend</code> returning <code>suspend_always</code> keeps the frame so the owner can read the result and then <code>destroy()</code> it; returning <code>suspend_never</code> self-destroys — then <b>nobody may touch the handle again</b>.</li>
        <li><b>Exceptions:</b> an exception escaping the body goes to <code>unhandled_exception()</code>; typical Tasks store <code>std::current_exception()</code> and rethrow it in the awaiter's <code>await_resume</code>.</li>
        <li><b>Coroutines are not threads.</b> They give concurrency (many in-flight operations) on one thread, and parallelism only if an executor resumes them on a pool. Production async C++ uses Boost.Asio (<code>co_spawn</code>, <code>awaitable&lt;T&gt;</code>), folly::coro, or libunifex/stdexec rather than hand-written promise types.</li>
      </ul>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> the promise_type boilerplate is verbose and formulaic — assistants generate a correct Generator or Task skeleton quickly, and explain compiler errors that mention <code>promise_type</code> or <code>await_suspend</code>.</p>
      <p><b>Use AI as a partner:</b> "Annotate this Task type with when each hook runs", "Convert this callback-based Asio handler into a co_await version", "Find lifetime bugs: reference params, captured <code>this</code> in coroutine lambdas, locks across co_await".</p>
      <p><b>Where AI goes wrong:</b> it forgets to <code>destroy()</code> the handle (leaks frames), destroys a self-destroying coroutine twice, uses <code>suspend_never</code> as final_suspend and then reads <code>promise()</code>, takes parameters by reference, and mixes up C++20 (no std::generator) with C++23.</p>
      <p><b>What you must own:</b> the mental model — frame on the heap, promise hooks, handle ownership, stackless suspension — so you can review generated coroutine code for lifetime bugs, which tests often miss.</p>`,
    problems: [{
      title: 'range(start, stop, step) as a Lazy Generator', level: 'Medium', tags: ['coroutines', 'generator', 'iterators'], companies: ['Google', 'Microsoft', 'Nvidia'],
      statement: `<p>Implement Python-like <code>range(start, stop, step)</code> in C++20 as a <b>coroutine generator</b> that works with range-based <code>for</code>. It must handle negative steps, return nothing when the range is empty or <code>step == 0</code>, and produce values lazily (O(1) memory even for a range of a billion numbers).</p>`,
      constraints: `<p>C++20 only (no <code>std::generator</code>). The generator type owns its coroutine handle (RAII, move-only).</p>`,
      example: `<pre>for (int x : range(0, 10, 3))  → ${H.c('g', '0 3 6 9')}
for (int x : range(5, 0, -2))  → ${H.c('g', '5 3 1')}
for (int x : range(1, 1))      → ${H.c('m', '(nothing)')}</pre>`,
      brute: { why: `<p>The eager approach fills a <code>std::vector</code> with every value first. It works for small ranges but uses O(n) memory, does all the work even if the caller stops after 3 values, and cannot express infinite sequences.</p>`,
        code: R`
          #include <vector>
          #include <iostream>
          std::vector<int> rangeEager(int start, int stop, int step = 1) {
              std::vector<int> out;
              if (step == 0) return out;
              for (int i = start; step > 0 ? i < stop : i > stop; i += step) out.push_back(i);   // O(n) memory
              return out;
          }
          int main() { for (int x : rangeEager(0, 10, 3)) std::cout << x << " "; }` },
      mcq: { q: 'In <code>begin()</code>, why do we call <code>h_.resume()</code> once before returning the iterator?', options: ['Because initial_suspend is suspend_always — the body has not produced the first value yet', 'To destroy the frame', 'To reset the coroutine to the start', 'It is not needed'], answer: 0, explain: 'A lazy coroutine stops before its first line. Resuming once runs it to the first <code>co_yield</code> so <code>*it</code> has a value (or it finishes immediately for an empty range, making <code>it == end</code>).' },
      hints: [`<p>Start from the Generator in this topic: <code>promise_type</code> with <code>current</code>, <code>yield_value</code>, lazy initial suspend, suspend_always final suspend.</p>`, `<p>Add <code>struct iterator { handle h; int operator*(); iterator&amp; operator++() { h.resume(); ... }; bool operator==(std::default_sentinel_t) const { return h.done(); } };</code> and <code>end()</code> returning <code>std::default_sentinel</code>.</p>`, `<p>Loop condition depends on the sign of step: <code>step &gt; 0 ? i &lt; stop : i &gt; stop</code>. Guard <code>step == 0</code> with <code>co_return;</code>. Make the type move-only and destroy the handle in the destructor.</p>`],
      tests: {"io":true,"cases":[{"stdin":"","stdout":"0 3 6 9 5 3 1\n[0 3 6 9]\n[]\n[0 1 2 3 4]\n[]\n[]\n[]\n[-3 -1 1]\n[10 5 0]\n[0 1000000000 2000000000]\n[0 -1000000000 -2000000000]\n[2147483646]\n[-2147483648 -2147483647 -2147483646]\n499999500000\n2"}]},
      solution: {
        approach: `<p>A move-only generator type owns the <code>coroutine_handle</code>. Its iterator resumes the coroutine on <code>++</code> and reads <code>promise().current</code> on <code>*</code>; equality with <code>default_sentinel</code> means <code>done()</code>. The coroutine body is a plain loop with <code>co_yield</code>, so values are produced one at a time.</p>`,
        code: R`
          #include <coroutine>
          #include <exception>
          #include <iostream>
          #include <iterator>
          #include <utility>

          class IntGen {
          public:
              struct promise_type {
                  int current = 0;
                  IntGen get_return_object() { return IntGen{std::coroutine_handle<promise_type>::from_promise(*this)}; }
                  std::suspend_always initial_suspend() noexcept { return {}; }
                  std::suspend_always final_suspend() noexcept { return {}; }
                  std::suspend_always yield_value(int v) noexcept { current = v; return {}; }
                  void return_void() noexcept {}
                  void unhandled_exception() { throw; }              // rethrow into whoever called resume()
              };
              using handle = std::coroutine_handle<promise_type>;

              struct iterator {
                  handle h;
                  int operator*() const { return h.promise().current; }
                  iterator& operator++() { h.resume(); return *this; }
                  bool operator==(std::default_sentinel_t) const { return !h || h.done(); }
              };

              explicit IntGen(handle h) : h_(h) {}
              IntGen(IntGen&& o) noexcept : h_(std::exchange(o.h_, {})) {}
              IntGen(const IntGen&) = delete;
              IntGen& operator=(const IntGen&) = delete;
              ~IntGen() { if (h_) h_.destroy(); }

              iterator begin() { h_.resume(); return iterator{h_}; }   // run to the first co_yield
              std::default_sentinel_t end() { return {}; }
          private:
              handle h_;
          };

          IntGen range(int start, int stop, int step = 1) {
              if (step == 0) co_return;                              // avoid an infinite loop
              for (long long i = start; step > 0 ? i < stop : i > stop; i += step)   // 64-bit: i + step cannot overflow
                  co_yield i;
          }

          void show(IntGen g) {
              std::cout << '[';
              bool first = true;
              for (int x : g) { std::cout << (first ? "" : " ") << x; first = false; }
              std::cout << "]\n";
          }

          int main() {
              for (int x : range(0, 10, 3)) std::cout << x << " ";   // 0 3 6 9
              for (int x : range(5, 0, -2)) std::cout << x << " ";   // 5 3 1
              for (int x : range(1, 1)) std::cout << x << " ";       // (nothing)
              std::cout << "\n";
              show(range(0, 10, 3));                  // [0 3 6 9]
              show(range(1, 1));                      // []
              show(range(0, 5));                      // [0 1 2 3 4]
              show(range(3, 0));                      // []   (default step 1 never reaches the stop)
              show(range(0, 3, -1));                  // []
              show(range(0, 10, 0));                  // []   (step 0)
              show(range(-3, 3, 2));                  // [-3 -1 1]
              show(range(10, -1, -5));                // [10 5 0]
              show(range(0, INT_MAX, 1000000000));    // [0 1000000000 2000000000]
              show(range(0, INT_MIN, -1000000000));   // [0 -1000000000 -2000000000]
              show(range(INT_MAX - 1, INT_MAX));      // [2147483646]
              show(range(INT_MIN, INT_MIN + 3));      // [-2147483648 -2147483647 -2147483646]
              long long sum = 0;
              for (int x : range(0, 1000000)) sum += x;
              std::cout << sum << "\n";               // 499999500000
              int seen = 0;
              for (int x : range(0, 2000000000)) { if (x == 2) break; ++seen; }   // lazy: two billion values are never built
              std::cout << seen << "\n";              // 2
          }`,
        dry: { head: ['caller action', 'coroutine does', 'i', 'promise.current', 'done()'], rows: [
          ['range(0,10,3)', 'frame created, suspended at start', '—', '0', 'false'], ['begin(): resume', 'i=0, co_yield 0', '0', '0', 'false'], ['print 0; ++it', 'i=3, co_yield 3', '3', '3', 'false'], ['print 3; ++it', 'i=6, co_yield 6', '6', '6', 'false'], ['print 6; ++it', 'i=9, co_yield 9', '9', '9', 'false'], ['print 9; ++it', 'i=12 fails test → final_suspend', '12', '9', '<span class="c-g">true → loop ends</span>']] },
        complexity: `<p>O(1) memory (one frame) regardless of range length; O(1) work per produced value; one frame allocation per range (possibly elided).</p>`,
        followUps: ['Make it a template <code>Gen&lt;T&gt;</code> and add <code>take(n)</code> and <code>filter(pred)</code> as coroutines that consume another generator.', 'What happens if the caller breaks out of the for loop early? (Destructor destroys the suspended frame — locals are destroyed properly.)', 'How would you support <code>std::ranges</code> algorithms? (Model <code>input_range</code>: add <code>value_type</code>, <code>difference_type</code>, post-increment.)']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — ABI CONCERNS
     ====================================================================== */
  function abiViz(input) {
    var mode = oneOf(input, 'add-member', ['add-member', 'reorder', 'add-virtual', 'inline', 'pimpl']);
    var S = {
      'add-member': { v1: 'struct Shape {\n  int    id;\n  double w;\n};', v2: 'struct Shape {\n  int    id;\n  double scale;   // NEW\n  double w;\n};',
        g1: [['id', '0', '4'], ['(padding)', '4', '4'], ['w', '8', '8'], ['sizeof', '—', '16']], g2: [['id', '0', '4'], ['(padding)', '4', '4'], ['scale', '8', '8'], ['w', '16', '8'], ['sizeof', '—', '24']],
        bad: { 2: 'bad' }, safe: false,
        what: 'The app was compiled with the v1 header, so it <b>baked in</b> "w is at offset 8, Shape is 16 bytes". It reads <code>s.w</code> from offset 8 — which in v2 is <code>scale</code>. Worse, the app reserves only 16 bytes on its stack for a Shape, but v2\'s constructor (inside the library) writes 24 bytes → <b>stack corruption</b>.' },
      'reorder': { v1: 'struct Shape {\n  int    id;\n  double w;\n};', v2: 'struct Shape {\n  double w;     // moved up\n  int    id;\n};',
        g1: [['id', '0', '4'], ['(padding)', '4', '4'], ['w', '8', '8'], ['sizeof', '—', '16']], g2: [['w', '0', '8'], ['id', '8', '4'], ['(padding)', '12', '4'], ['sizeof', '—', '16']],
        bad: { 0: 'bad', 1: 'bad' }, safe: false,
        what: 'Same size (16), so nothing obviously crashes — but the app reads <code>id</code> from offset 0, which is now the first 4 bytes of the double <code>w</code>. <b>Silent garbage</b>: the worst kind of bug, because tests on a freshly rebuilt machine pass.' },
      'add-virtual': { v1: 'class Shape {\npublic:\n  virtual void draw();   // slot 0\n  virtual double area(); // slot 1\n};', v2: 'class Shape {\npublic:\n  virtual void draw();   // slot 0\n  virtual void scale(double); // slot 1 NEW\n  virtual double area(); // slot 2\n};',
        g1: [['slot 0', 'draw', ''], ['slot 1', 'area', ''], ['', '', '']], g2: [['slot 0', 'draw', ''], ['slot 1', 'scale', ''], ['slot 2', 'area', '']],
        bad: { 1: 'bad' }, safe: false,
        what: 'Virtual calls are compiled to "call the function in <b>vtable slot N</b>". The app\'s <code>s.area()</code> was compiled as "call slot 1". In v2 slot 1 is <code>scale(double)</code> → the app calls the <b>wrong function</b> with the wrong arguments. Adding virtuals (except at the very end of a leaf class, and even that is risky) breaks ABI.' },
      'inline': { v1: 'inline int maxUsers() { return 100; }   // in the header', v2: 'inline int maxUsers() { return 500; }   // in the header',
        g1: [['app\'s copy', 'returns 100', 'inlined at compile time'], ['lib v1 copy', 'returns 100', '']], g2: [['app\'s copy', 'returns 100', 'still the old inlined code!'], ['lib v2 copy', 'returns 500', '']],
        bad: { 0: 'bad' }, safe: false,
        what: 'Inline functions and templates in headers are <b>compiled into the app</b>. Changing them in the library does not change the app\'s copy: app code says 100, library code says 500 — two definitions of one function in one process (an <b>ODR violation</b>). Header-only code is part of your ABI surface.' },
      'pimpl': { v1: 'class Shape {\n  struct Impl;\n  std::unique_ptr<Impl> p_;\npublic:\n  double w() const;    // exported function\n};', v2: 'class Shape {\n  struct Impl;          // Impl gained 3 fields in shape.cpp\n  std::unique_ptr<Impl> p_;\npublic:\n  double w() const;\n};',
        g1: [['p_', '0', '8'], ['sizeof', '—', '8']], g2: [['p_', '0', '8'], ['sizeof', '—', '8']],
        bad: {}, safe: true,
        what: 'The public class is still exactly one pointer; all field access happens <b>inside the library</b> through exported, non-inline functions like <code>w()</code>. The app\'s baked-in knowledge (size 8, call symbol <code>_ZNK5Shape1wEv</code>) is still true. <b>ABI preserved</b> — this is why SDKs use pimpl.' }
    }[mode];
    var frames = [];
    function graph(stage) {
      var hl = { app: 'sel' }, ehl = {}, tags = { app: 'built against v1 header' };
      if (stage === 0) { hl.l1 = 'ok'; ehl['app-l1'] = 'ok'; tags.l1 = 'matches'; }
      if (stage >= 1) { hl.l1 = 'done'; hl.l2 = S.safe ? 'ok' : 'bad'; ehl['app-l2'] = S.safe ? 'ok' : 'bad'; tags.l2 = S.safe ? 'compatible' : 'MISMATCH'; }
      return { type: 'graph', label: 'dynamic linking at run time', directed: true, height: 44, nodes: [
        { id: 'app', label: 'app (not recompiled)', x: 20, y: 22, shape: 'box' }, { id: 'l1', label: 'libshape.so v1', x: 72, y: 9, shape: 'box' }, { id: 'l2', label: 'libshape.so v2', x: 72, y: 34, shape: 'box' }],
        edges: stage === 0 ? [['app', 'l1', 'loads']] : [['app', 'l2', 'loads (upgrade)']], hl: hl, ehl: ehl, tags: tags };
    }
    var cols = mode === 'add-virtual' ? ['vtable slot', 'function', ''] : mode === 'inline' ? ['copy', 'behaviour', 'note'] : ['member', 'offset', 'size'];
    frames.push({ narr: 'An app is compiled and linked against <b>libshape v1</b>. The compiler turned every use of <code>Shape</code> into hard numbers: sizes, field offsets, vtable slot indices, mangled symbol names, inlined bodies. Those numbers are the <b>ABI</b> (Application <b>Binary</b> Interface).',
      parts: [graph(0), codePart('shape.h v1', S.v1, {}), { type: 'grid', label: 'what the app baked in (v1)', colHead: cols, rows: S.g1 }] });
    frames.push({ narr: 'The library team ships <b>v2</b> with this change. The source code (the <b>API</b>) still compiles fine for everyone — but the app is <b>not recompiled</b>; it just loads the new .so/.dll at start-up.',
      parts: [graph(1), codePart('shape.h v2', S.v2, {}), { type: 'grid', label: 'reality inside v2', colHead: cols, rows: S.g2, hl: Object.keys(S.bad).reduce(function (o, r) { o[r + ',0'] = 'bad'; o[r + ',1'] = 'bad'; o[r + ',2'] = 'bad'; return o; }, {}) }] });
    frames.push({ narr: (S.safe ? '<span class="c-g">Compatible.</span> ' : '<span class="c-r">Mismatch.</span> ') + S.what,
      parts: [{ type: 'grid', label: 'app assumes (v1)', colHead: cols, rows: S.g1 }, { type: 'grid', label: 'library does (v2)', colHead: cols, rows: S.g2, hl: Object.keys(S.bad).reduce(function (o, r) { o[r + ',0'] = 'bad'; o[r + ',1'] = 'bad'; return o; }, {}) },
        { type: 'vars', label: 'verdict', vals: { 'API compatible (recompiles)?': 'yes', 'ABI compatible (old binary works)?': S.safe ? 'yes' : 'NO' }, hl: { 'ABI compatible (old binary works)?': S.safe ? 'ok' : 'bad' } }] });
    frames.push({ narr: S.safe ? 'Rule of thumb: if the public class layout, exported symbols and inline code are unchanged, old binaries keep working. Pimpl + non-inline exported functions is the standard recipe; Qt and many SDKs promise "binary compatibility within a major version" this way.' : 'Fixes: (1) recompile everything and bump the library\'s <b>SONAME</b>/major version so old apps keep loading v1; (2) design for ABI stability up front: <b>pimpl</b>, no public data members, no new virtuals, no inline logic in headers, or a plain <b>extern "C"</b> interface with opaque handles.',
      parts: [{ type: 'table', label: 'ABI-safe vs ABI-breaking changes (for a shared library)', columns: ['change', 'ABI'], rows: [
        ['add a new non-virtual, non-inline function', 'safe'], ['add a new class / free function', 'safe'], ['change Impl behind a pimpl', 'safe'],
        ['add / remove / reorder data members of a public class', 'BREAKS'], ['add / reorder virtual functions', 'BREAKS'], ['change a function signature (even default args are ok, types are not)', 'BREAKS (different mangled name)'],
        ['change inline function / template bodies', 'BREAKS (silently, ODR)'], ['change base classes', 'BREAKS'], ['switch compiler flags (e.g. _GLIBCXX_USE_CXX11_ABI, -fpack-struct)', 'BREAKS']], hl: { 2: 'sel' } }] });
    var mangle = [['int add(int, int)', '_Z3addii'], ['double add(double, double)', '_Z3adddd'], ['void ns::Widget::click()', '_ZN2ns6Widget5clickEv'], ['void greet(const std::string&)', '_Z5greetRKNSt7__cxx1112basic_string...'], ['extern "C" int add_c(int, int)', 'add_c (no mangling)']];
    frames.push({ narr: 'One more ABI ingredient: <b>name mangling</b>. The linker only sees symbol strings; C++ encodes namespace, class, name and parameter types into them (Itanium ABI shown, used by GCC/Clang on Linux/macOS). Change a parameter type → different symbol → old binaries fail to load with "undefined symbol". <code>extern "C"</code> turns mangling off — the basis of stable plugin interfaces. Note <code>__cxx11</code> inside the std::string symbol: that is libstdc++\'s <b>dual ABI</b> tag.',
      parts: [{ type: 'table', label: 'C++ declaration → linker symbol (g++)', columns: ['declaration', 'symbol'], rows: mangle, hl: { 4: 'sel', 3: 'cur' } }] });
    return frames;
  }

  topics.push({
    title: 'ABI Concerns: Binary Compatibility, Name Mangling & Stable Interfaces',
    analogy: `<p>The <b>API</b> is the <i>shape of the plug</i> described in the manual; the <b>ABI</b> is the <i>exact wiring inside the socket</i>. Two plugs can look identical in the manual (same function names, same parameters), but if the new socket swapped the live and neutral wires, appliances built for the old socket will short-circuit — even though "nothing changed" on paper. Recompiling is like rewiring every appliance; ABI stability is promising never to swap the wires.</p>`,
    explain: `<p>🟢 <b>API vs ABI.</b> The <b>API</b> (Application Programming Interface) is what your <i>source code</i> sees: names, types, signatures. The <b>ABI</b> (Application Binary Interface) is what the <i>compiled machine code</i> relies on. If a library changes its API, your code may stop <b>compiling</b>. If it changes its ABI, already-built programs may <b>crash or silently compute garbage</b> when they load the new library — no compiler is there to warn you.</p>
      ${H.table(['part of the ABI', 'what gets baked into the caller\'s binary'], [['object layout', 'sizeof, alignment, offset of every field, padding'], ['vtable layout', 'slot index of each virtual function, position of the vptr'], ['name mangling', 'symbol strings encoding namespace/class/params (<code>_Z3addii</code>)'], ['calling convention', 'which registers hold args/return values, who cleans up the stack'], ['inline code', 'bodies of inline functions and templates compiled into the caller'], ['exceptions & RTTI', 'unwinding tables, <code>type_info</code> names, how <code>dynamic_cast</code> compares types'], ['standard library types', 'the layout of <code>std::string</code>, <code>std::vector</code>, … from <b>that</b> library version']])}
      <p><b>Why C++ is hard here:</b> C has a simple, stable ABI per platform. C++ adds classes, templates, overloading, exceptions and a big header-only standard library — much more gets compiled <i>into the user's binary</i>. On Linux/macOS, GCC and Clang share the <b>Itanium C++ ABI</b>, so they interoperate; on Windows, MSVC has its own ABI. Mixing binaries built with different standard library versions or flags (e.g. libstdc++'s <code>_GLIBCXX_USE_CXX11_ABI</code>, which switched <code>std::string</code> from copy-on-write to small-string-optimized in GCC 5) causes link errors at best, crashes at worst.</p>
      <p><b>How library authors stay ABI-stable:</b></p>
      <ul>
        <li><b>pimpl</b> — public class is one pointer; layout changes happen behind it.</li>
        <li><b>No public data members, no new virtuals, nothing important inline</b> in public headers.</li>
        <li><b><code>extern "C"</code> interfaces with opaque handles</b> (<code>typedef struct db db_t; db_t* db_open(const char*);</code>) — the most stable boundary there is; every language can call it.</li>
        <li><b>Versioning</b>: bump the shared-library <b>SONAME</b> on breaking changes; use <code>inline namespace v2</code> so incompatible versions get different mangled names (libc++ does this with <code>std::__1</code>).</li>
        <li><b>Symbol visibility</b>: compile with <code>-fvisibility=hidden</code> and export only the intended API, so internals are not accidentally part of the ABI.</li>
      </ul>`,
    clues: [
      '"Upgraded the shared library and the app crashes / reads garbage, without recompiling" → ABI break',
      '"Ship a binary-only SDK / plugin system that must work across versions or compilers" → extern "C" + opaque handles, or pimpl',
      '"undefined symbol: _ZN…" after an upgrade → mangled name changed (signature/namespace/ABI tag)',
      '"Why can\'t I pass <code>std::string</code> across a DLL boundary?" → different standard library / allocator / CRT on each side',
      '"What is name mangling?", "what does <code>extern \"C\"</code> do?" → encoding of C++ signatures into linker symbols; C linkage turns it off',
      '"Why didn\'t the committee fix X in std::unordered_map / std::regex?" → changing it would break the ABI of every existing binary'
    ],
    code: [R`
      // ======== counter_api.h : a stable C interface around a C++ class ========
      #include <cstddef>
      extern "C" {
          typedef struct counter counter_t;                  // opaque: callers never see the layout
          counter_t* counter_create(const char* name);       // returns nullptr on failure
          int        counter_add(counter_t* c, int delta);   // returns 0 on success, -1 on error
          int        counter_value(const counter_t* c);
          void       counter_destroy(counter_t* c);
      }

      // ======== counter.cpp : the C++ implementation, free to change ========
      #include <string>
      #include <new>
      #include <stdexcept>
      #include <iostream>

      struct counter {                                       // the real C++ object behind the handle
          std::string name;
          long        value = 0;
      };

      extern "C" counter_t* counter_create(const char* name) {
          try {
              return new counter{name ? name : "", 0};
          } catch (...) {                                    // exceptions must NEVER cross a C boundary
              return nullptr;
          }
      }
      extern "C" int counter_add(counter_t* c, int delta) {
          if (!c) return -1;
          try {
              if (delta < 0 && c->value + delta < 0) throw std::range_error("negative");
              c->value += delta;
              return 0;
          } catch (...) { return -1; }                       // translate to an error code
      }
      extern "C" int counter_value(const counter_t* c) { return c ? static_cast<int>(c->value) : 0; }
      extern "C" void counter_destroy(counter_t* c) { delete c; }   // allocated AND freed inside the library

      // ======== app.cpp : a client (could be C, Python ctypes, Rust FFI, ...) ========
      int main() {
          counter_t* c = counter_create("hits");
          counter_add(c, 5);
          int rc = counter_add(c, -10);                      // rejected, no exception leaks out
          std::cout << counter_value(c) << " rc=" << rc << "\n";   // 5 rc=-1
          counter_destroy(c);
      }
    `],
    codeTitle: ['An ABI-stable C facade (opaque handle + error codes) over C++'],
    viz: { title: 'What breaks when a library changes under a compiled app', input: 'add-member', inputLabel: 'Library change: add-member | reorder | add-virtual | inline | pimpl', gen: abiViz },
    examples: [
      { title: 'Name mangling and extern "C"', html: `<p>C++ allows overloads (<code>add(int,int)</code> and <code>add(double,double)</code>), so the linker symbol must encode the parameter types. Run <code>nm</code> on an object file (g++ on Linux):</p>
        ${H.table(['declaration', 'symbol'], [['<code>int add(int, int)</code>', '<code>_Z3addii</code>'], ['<code>double add(double, double)</code>', '<code>_Z3adddd</code>'], ['<code>void ns::Widget::click()</code>', '<code>_ZN2ns6Widget5clickEv</code>'], ['<code>extern "C" int add_c(int, int)</code>', '<code>add_c</code>']])}
        <p><code>c++filt _ZN2ns6Widget5clickEv</code> demangles it back. <code>extern "C"</code> gives a function C linkage: no mangling, so it can't be overloaded, but C, Python (ctypes), Rust and Go can all find it by its plain name.</p>`,
        code: R`
          #include <cstdio>
          int add(int a, int b) { return a + b; }                  // symbol _Z3addii
          double add(double a, double b) { return a + b; }         // symbol _Z3adddd
          extern "C" int add_c(int a, int b) { return a + b; }     // symbol add_c
          // extern "C" double add_c(double, double);              // ERROR: C linkage cannot be overloaded
          int main() { std::printf("%d %.1f %d\n", add(1, 2), add(1.5, 2.0), add_c(3, 4)); }   // 3 3.5 7` },
      { title: 'libstdc++ dual ABI: the std::string story', html: `<p>C++11 banned copy-on-write <code>std::string</code>. GCC 5 introduced a new SSO string <b>alongside</b> the old one, putting it in <code>namespace std::__cxx11</code> so its mangled names differ (<code>_Z5greetRKNSt7__cxx1112basic_string…</code>). Linking a library built with <code>-D_GLIBCXX_USE_CXX11_ABI=0</code> against code built with the default gives "undefined reference to <code>greet(std::__cxx11::basic_string…)</code>". Lesson: changing a std type's layout is an ABI break so painful that the committee now rejects many improvements (faster <code>unordered_map</code>, <code>std::regex</code> fixes, 128-bit <code>intmax_t</code>) purely for ABI reasons.</p>` },
      { title: 'Allocate and free on the same side of a DLL boundary', html: `<p>On Windows, each DLL may link its own C runtime with its own heap. Memory <code>new</code>-ed in <code>plugin.dll</code> and <code>delete</code>-d in <code>app.exe</code> goes to the wrong heap → heap corruption. Same for <code>std::string</code>/<code>std::vector</code> passed by value across the boundary (they free in the destructor on the other side). Rules: the library that allocates also frees (<code>counter_destroy</code>), pass plain C types / spans across, or make sure both sides use the same dynamic CRT and compiler version.</p>
        ${H.table(['pattern', 'safe?'], [['<code>Foo* p = lib_create(); lib_destroy(p);</code>', '<span class="c-g">yes</span>'], ['<code>Foo* p = lib_create(); delete p;</code> (in the app)', '<span class="c-r">no — wrong heap/allocator</span>'], ['returning <code>std::string</code> by value from a DLL built with another compiler', '<span class="c-r">no — layout and allocator may differ</span>'], ['<code>int lib_name(char* buf, size_t len)</code>', '<span class="c-g">yes</span>']])}` },
      { title: 'inline namespaces for versioning', html: `<p>An <code>inline namespace</code> is transparent for <b>source</b> code (<code>lib::version()</code> still works) but appears in the <b>mangled name</b> (<code>_ZN3lib2v27versionEv</code>). Ship v3 with <code>inline namespace v3</code> and old binaries asking for <code>…v2…</code> either find the old symbols (if you keep them) or fail loudly at load time — instead of silently calling incompatible code. libc++ uses <code>std::__1</code> this way.</p>`,
        code: R`
          #include <iostream>
          namespace lib {
              inline namespace v2 {                         // current version: transparent to callers
                  struct Config { int retries; int timeoutMs; };
                  int version() { return 2; }                 // mangled as lib::v2::version
              }
              namespace v1 {                                // old version kept for old binaries
                  struct Config { int retries; };
                  int version() { return 1; }
              }
          }
          int main() {
              lib::Config c{3, 500};                          // means lib::v2::Config
              std::cout << lib::version() << " " << lib::v1::version() << " " << c.timeoutMs << "\n";   // 2 1 500
          }` }
    ],
    deepDive: `<p>🟣 <b>Production reality.</b></p>
      <ul>
        <li><b>Who cares:</b> anyone shipping <b>shared libraries</b> or <b>binary SDKs</b> (OS vendors, Qt, game engines, database drivers, plugin hosts), and anyone whose app loads plugins compiled separately. Monorepos that rebuild everything from source (Google-style) care far less — they routinely make ABI-breaking changes because every binary is rebuilt.</li>
        <li><b>Tooling:</b> <code>abi-compliance-checker</code>/<code>abidiff</code> (libabigail) compare two builds of a library and report layout, vtable and symbol changes; run them in CI for every public library. <code>nm -C</code>, <code>objdump -T</code>, <code>readelf --dyn-syms</code> and <code>c++filt</code> inspect symbols.</li>
        <li><b>Linux mechanics:</b> a shared library has a <b>SONAME</b> (<code>libshape.so.1</code>); apps record it at link time. Bump the major number on ABI breaks so old apps keep loading <code>.so.1</code> while new apps use <code>.so.2</code>. glibc goes further with <b>symbol versioning</b> (<code>memcpy@GLIBC_2.14</code>), keeping old behaviour available forever.</li>
        <li><b>Subtle breaks:</b> changing a function from non-inline to inline (or back); adding a member with a default value (still a layout change); making a function <code>noexcept</code> (part of the type since C++17, changes mangling of function pointers); changing an enum's underlying type; changing the alignment of a member; adding a <code>[[no_unique_address]]</code> member; changing default template arguments; changing the order of base classes.</li>
        <li><b>Safe-ish changes:</b> adding new non-virtual member functions, new free functions, new classes, new enumerators at the end (if no one depends on the max value), new overloads (but beware of changing overload resolution for callers that recompile — an API change).</li>
        <li><b>Exceptions across boundaries:</b> throwing a C++ exception through a C interface or across modules built with different runtimes is undefined; always catch at the boundary and translate to error codes (as the facade above does).</li>
        <li><b>The C++ committee and ABI:</b> the 2020 "ABI: now or never" debate (P1863) ended with the committee choosing de-facto stability. That's why <code>std::unordered_map</code> keeps its node-based design and why faster designs live outside the standard (Abseil's <code>flat_hash_map</code>, Boost.Unordered).</li>
      </ul>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> assistants can generate <code>extern "C"</code> facades, ctypes/Rust FFI bindings and pimpl conversions in minutes, and they're good at decoding mangled names and linker errors you paste in.</p>
      <p><b>Use AI as a partner:</b> "List every ABI-breaking change in this header diff", "Generate a C facade with opaque handles and error codes for this class, and a Python ctypes wrapper", "Explain this undefined-symbol error (paste the mangled name)". Then confirm with <code>abidiff</code> — tools, not vibes, decide ABI compatibility.</p>
      <p><b>Where AI goes wrong:</b> it treats "it compiles" as "it's compatible", adds a virtual function in the middle of a public class, lets exceptions escape <code>extern "C"</code> functions, passes <code>std::string</code> across DLL boundaries, and frees library-allocated memory in the app.</p>
      <p><b>What you must own:</b> the API-vs-ABI distinction, the list of what's baked into a binary, and a stable-boundary design (C facade, pimpl, versioning) you can defend in a design review.</p>`,
    problems: [{
      title: 'Design an ABI-Stable C Facade for a C++ Class', level: 'Medium', tags: ['abi', 'extern C', 'opaque handle', 'exceptions'], companies: ['Apple', 'Qualcomm', 'Unity', 'Adobe'],
      statement: `<p>You maintain a C++ <code>RateLimiter</code> class (token bucket with <code>std::string name</code>, <code>double tokens</code>, <code>double ratePerSec</code>). Plugins written in C, Python (ctypes) and Rust must use it, and new library versions must not break already-compiled plugins. Design and implement a C interface: create, try-acquire, query, destroy. No C++ type or exception may cross the boundary.</p>`,
      constraints: `<p>Opaque handle; functions return error codes; the library allocates and frees its own objects; <code>extern "C"</code> linkage.</p>`,
      example: `<pre>rl_t* r = rl_create("api", /*capacity*/ 2, /*rate*/ 1.0);
rl_try_acquire(r) → ${H.c('g', '1')}   rl_try_acquire(r) → ${H.c('g', '1')}   rl_try_acquire(r) → ${H.c('r', '0')} (bucket empty)
rl_create(nullptr, -1, 0) → ${H.c('r', 'NULL')} (invalid args, no exception escapes)</pre>`,
      brute: { why: `<p>Exporting the C++ class directly bakes its layout, its <code>std::string</code> member (standard-library ABI), its mangled names and possible exceptions into every plugin. Adding one field or switching compilers breaks every plugin, and C/Python/Rust can't call it at all.</p>`,
        code: R`
          #include <string>
          #include <stdexcept>
          // Exported as-is from the shared library: layout, std::string and exceptions all leak into clients.
          class RateLimiter {
          public:
              RateLimiter(std::string name, double cap, double rate)
                  : name_(std::move(name)), cap_(cap), tokens_(cap), rate_(rate) {
                  if (cap <= 0) throw std::invalid_argument("cap");     // exception crosses the boundary!
              }
              bool tryAcquire() { if (tokens_ >= 1) { tokens_ -= 1; return true; } return false; }
          private:
              std::string name_;          // layout + std::string ABI are now part of the library's ABI
              double cap_, tokens_, rate_;
          };
          int main() { RateLimiter r("api", 2, 1); return r.tryAcquire() ? 0 : 1; }` },
      mcq: { q: 'Why must every exported function wrap its body in <code>try { ... } catch (...)</code>?', options: ['Letting a C++ exception propagate through a C interface is undefined behavior (the caller may be C, Rust, Python…)', 'To make the code faster', 'Because extern "C" functions cannot contain try blocks otherwise', 'It is only needed on Windows'], answer: 0, explain: 'C callers have no unwinding support for C++ exceptions; the boundary must translate every failure into an error code or NULL.' },
      hints: [`<p>Header: <code>typedef struct rl rl_t;</code> (incomplete type) plus four <code>extern "C"</code> functions using only C types (<code>const char*</code>, <code>double</code>, <code>int</code>).</p>`, `<p>In the .cpp, define <code>struct rl { RateLimiter impl; };</code> or put the members directly; <code>rl_create</code> does <code>new</code> inside a try/catch and returns <code>nullptr</code> on any failure.</p>`, `<p><code>rl_destroy</code> must be the only way to free (same allocator). Validate every pointer argument. Return 1/0 for acquire and −1 for errors so the C caller can distinguish.</p>`],
      tests: {"io":true,"cases":[{"stdin":"","stdout":"110 1\n3 11100 0\n11\n-1 -1\n10 0.5\n0\n1000000"}]},
      solution: {
        approach: `<p>Hide the C++ class behind an incomplete C struct. Every entry point is <code>extern "C"</code>, takes and returns only C types, validates arguments, catches all exceptions and converts them to <code>NULL</code>/<code>-1</code>. Allocation and deallocation both live in the library. The C++ class can now change freely: clients only know a pointer and four symbol names that never change.</p>`,
        code: R`
          // ===== ratelimit.h (C header, stable forever) =====
          extern "C" {
              typedef struct rl rl_t;
              rl_t* rl_create(const char* name, double capacity, double ratePerSec);   // NULL on error
              int   rl_try_acquire(rl_t* r);                                         // 1 = ok, 0 = limited, -1 = error
              double rl_tokens(const rl_t* r);                                       // -1.0 on error
              void  rl_destroy(rl_t* r);
          }

          // ===== ratelimit.cpp (C++ inside, free to evolve) =====
          #include <cstdio>
          #include <string>
          #include <stdexcept>
          #include <chrono>
          #include <iostream>

          class RateLimiter {
              std::string name_;
              double cap_, tokens_, rate_;
              std::chrono::steady_clock::time_point last_ = std::chrono::steady_clock::now();
          public:
              RateLimiter(std::string n, double cap, double rate) : name_(std::move(n)), cap_(cap), tokens_(cap), rate_(rate) {
                  if (cap <= 0 || rate < 0) throw std::invalid_argument("bad limiter parameters");
              }
              bool tryAcquire() {
                  auto now = std::chrono::steady_clock::now();
                  double secs = std::chrono::duration<double>(now - last_).count();
                  last_ = now;
                  tokens_ = std::min(cap_, tokens_ + secs * rate_);          // refill
                  if (tokens_ >= 1.0) { tokens_ -= 1.0; return true; }
                  return false;
              }
              double tokens() const { return tokens_; }
          };

          struct rl { RateLimiter impl; };                                   // the opaque type's real definition

          extern "C" rl_t* rl_create(const char* name, double capacity, double ratePerSec) {
              if (!name) return nullptr;
              try { return new rl{RateLimiter(name, capacity, ratePerSec)}; }
              catch (...) { return nullptr; }                                // no exception crosses the boundary
          }
          extern "C" int rl_try_acquire(rl_t* r) {
              if (!r) return -1;
              try { return r->impl.tryAcquire() ? 1 : 0; } catch (...) { return -1; }
          }
          extern "C" double rl_tokens(const rl_t* r) { return r ? r->impl.tokens() : -1.0; }
          extern "C" void rl_destroy(rl_t* r) { delete r; }                  // freed by the allocating side

          // ===== a client =====
          int main() {
              rl_t* r = rl_create("api", 2, 1.0);
              int a = rl_try_acquire(r), b = rl_try_acquire(r), c = rl_try_acquire(r);
              std::cout << a << b << c << " " << (rl_create(nullptr, -1, 0) == nullptr) << "\n";   // 110 1
              rl_destroy(r);

              rl_t* s = rl_create("steady", 3, 0.0);                 // rate 0: no refill, so the answers are exact
              std::cout << rl_tokens(s) << " ";                       // 3
              for (int i = 0; i < 5; ++i) std::cout << rl_try_acquire(s);   // 11100
              std::cout << " " << rl_tokens(s) << "\n";               // 0
              rl_destroy(s);
              std::cout << (rl_create("x", 0, 1) == nullptr) << (rl_create("x", 1, -1) == nullptr) << "\n";   // 11
              std::cout << rl_try_acquire(nullptr) << " " << rl_tokens(nullptr) << "\n";                    // -1 -1
              rl_destroy(nullptr);
              rl_t* frac = rl_create("frac", 1.5, 0.0);
              int f1 = rl_try_acquire(frac), f2 = rl_try_acquire(frac);
              std::cout << f1 << f2 << " " << rl_tokens(frac) << "\n";   // 10 0.5
              rl_destroy(frac);
              rl_t* half = rl_create("half", 0.5, 0.0);
              std::cout << rl_try_acquire(half) << "\n";              // 0
              rl_destroy(half);
              rl_t* big = rl_create("big", 1000000, 0.0);
              int ok = 0;
              for (int i = 0; i < 1000001; ++i) ok += rl_try_acquire(big) == 1;
              std::cout << ok << "\n";                                // 1000000
              rl_destroy(big);
          }`,
        dry: { head: ['call', 'inside the library', 'returns', 'crosses boundary'], rows: [
          ['rl_create("api", 2, 1.0)', 'new rl{RateLimiter}', 'handle', 'pointer only'], ['rl_try_acquire ×2', 'tokens 2 → 1 → 0', '1, 1', 'int'], ['rl_try_acquire', 'tokens ≈ 0 &lt; 1', '0', 'int'], ['rl_create(NULL, -1, 0)', 'name check fails', 'NULL', 'pointer only'], ['rl_destroy(r)', 'delete inside library', '—', 'nothing']] },
        complexity: `<p>O(1) per call; one allocation per limiter. The ABI surface is 4 unmangled symbols and one pointer type.</p>`,
        followUps: ['How would you add a new option later without breaking the ABI? (New function <code>rl_create2</code> or a versioned options struct with a <code>size</code> field.)', 'Write the Python ctypes binding.', 'How do you make <code>rl_try_acquire</code> thread-safe without changing the ABI?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 8 — TRICKY INTERVIEW QUESTIONS & OUTPUT PREDICTION
     ====================================================================== */
  var OUTQ = [
    { name: 'Virtual call inside a constructor', code: 'struct Base {\n  Base() { hello(); }\n  virtual void hello() { cout << "Base "; }\n};\nstruct Derived : Base {\n  Derived() { hello(); }\n  void hello() override { cout << "Derived "; }\n};\nint main() { Derived d; }',
      steps: [[9, '', '<code>Derived d;</code> — construction always starts with the <b>base</b> sub-object.'], [2, '', 'Inside <code>Base()</code> the object is <b>only a Base so far</b>: the vptr points to Base\'s vtable. Derived\'s members don\'t exist yet, so C++ refuses to dispatch to Derived.'], [3, 'Base ', 'So <code>hello()</code> resolves to <code>Base::hello</code> → prints "Base ".'], [6, '', 'Base is done; the vptr is switched to Derived\'s vtable and <code>Derived()</code>\'s body runs.'], [7, 'Base Derived ', 'Now <code>hello()</code> dispatches to <code>Derived::hello</code>. Same rule applies in destructors, in reverse.']] },
    { name: 'Default argument + virtual function', code: 'struct A {\n  virtual void f(int x = 1) { cout << "A" << x; }\n};\nstruct B : A {\n  void f(int x = 2) override { cout << "B" << x; }\n};\nint main() {\n  B b; A& r = b;\n  r.f();\n}',
      steps: [[8, '', '<code>r</code> has <b>static type</b> A&amp; but <b>dynamic type</b> B.'], [9, '', 'Default arguments are filled in at <b>compile time</b> from the <b>static</b> type → the call becomes <code>r.f(1)</code>.'], [5, 'B1', 'The function body is chosen at <b>run time</b> from the dynamic type → <code>B::f</code> runs with x = 1. Output "B1" — a mix of both! Rule: never give overriding functions different default arguments.']] },
    { name: 'Construction & destruction order', code: 'struct M { const char* n;\n  M(const char* s) : n(s) { cout << "M" << n << " "; }\n  ~M() { cout << "~M" << n << " "; } };\nstruct Base { Base() { cout << "Base "; } ~Base() { cout << "~Base "; } };\nstruct D : Base {\n  M b{"b"}; M a{"a"};\n  D() { cout << "D "; } ~D() { cout << "~D "; }\n};\nint main() { D d; }',
      steps: [[9, '', 'Order of construction: <b>bases</b> → <b>members in declaration order</b> → <b>constructor body</b>.'], [4, 'Base ', 'Base first.'], [6, 'Base Mb Ma ', 'Members in <b>declaration</b> order: b then a (the order in an initializer list would not matter).'], [7, 'Base Mb Ma D ', 'Then D\'s body.'], [7, 'Base Mb Ma D ~D ', 'At the end of main: destruction is the exact <b>reverse</b>: body first…'], [6, 'Base Mb Ma D ~D ~Ma ~Mb ', '…members in reverse declaration order…'], [4, 'Base Mb Ma D ~D ~Ma ~Mb ~Base ', '…base last.']] },
    { name: 'Object slicing', code: 'struct A { virtual string name() const { return "A"; } };\nstruct B : A { string name() const override { return "B"; } };\nvoid byVal(A a)        { cout << a.name(); }\nvoid byRef(const A& a) { cout << a.name(); }\nint main() { B b; byVal(b); byRef(b); }',
      steps: [[5, '', 'Two calls with the same B object.'], [3, 'A', '<code>byVal(A a)</code> copy-constructs a <b>new A</b> from the A-part of b: the B part is <b>sliced off</b> and the copy\'s vptr is A\'s. → "A".'], [4, 'AB', '<code>byRef</code> binds a reference to the original B → virtual dispatch works → "B". Pass polymorphic objects by reference or pointer.']] },
    { name: 'vector growth: copy or move?', code: 'struct T { T() {}\n  T(const T&) { cout << "C"; }\n  T(T&&)      { cout << "M"; } };   // not noexcept!\nint main() {\n  vector<T> v; v.reserve(1);\n  v.push_back(T());\n  v.push_back(T());\n}',
      steps: [[5, '', 'Capacity 1.'], [6, 'M', 'First push_back: the temporary is <b>moved</b> into the buffer → "M".'], [7, 'MM', 'Second push_back: no room → reallocate. libstdc++ first constructs the new element in the new buffer (moved) → "M".'], [7, 'MMC', 'Then it must relocate the old element. The move ctor is <b>not noexcept</b>, so to keep the strong guarantee vector uses <code>move_if_noexcept</code> → it <b>copies</b> → "C". Mark move constructors <code>noexcept</code> and you get "MMM".']] },
    { name: 'Template specialization vs overload', code: 'template <class T> void g(T)  { cout << "T "; }\ntemplate <> void g<int*>(int*) { cout << "spec "; }\ntemplate <class T> void g(T*) { cout << "T* "; }\nint main() { int x; g(&x); }',
      steps: [[4, '', 'Call <code>g(int*)</code>. Overload resolution only considers <b>primary templates</b>: <code>g(T)</code> and <code>g(T*)</code>.'], [2, '', 'The explicit specialization belongs to the template declared <b>before</b> it — <code>g(T)</code>. It doesn\'t take part in overload resolution itself.'], [3, 'T* ', '<code>g(T*)</code> is more specialized than <code>g(T)</code> → it wins → "T* ". The <code>spec</code> version is never used! Prefer plain overloads over function template specializations.']] },
    { name: 'mutable lambda copies', code: 'int main() {\n  auto c = [n = 0]() mutable { return ++n; };\n  auto d = c;          // copies the closure (n = 0)\n  cout << c() << c() << d();\n}',
      steps: [[2, '', 'A lambda is an object; the init-capture <code>n</code> is a data member. <code>mutable</code> lets <code>operator()</code> change it.'], [3, '', '<code>d</code> is a <b>copy</b> of the closure, with its own n = 0.'], [4, '1', 'C++17 sequences <code>&lt;&lt;</code> operands left to right. c() → 1'], [4, '12', 'c() → 2'], [4, '121', 'd() uses its own counter → 1. Output "121".']] },
    { name: 'Diamond with virtual inheritance', code: 'struct A { A() { cout << "A"; } };\nstruct B : virtual A { B() { cout << "B"; } };\nstruct C : virtual A { C() { cout << "C"; } };\nstruct D : B, C { D() { cout << "D"; } };\nint main() { D d; }',
      steps: [[5, '', 'D inherits A twice, but <b>virtually</b> → only one shared A sub-object.'], [1, 'A', 'Virtual bases are constructed <b>first</b>, by the most-derived class (D) → "A".'], [2, 'AB', 'Then non-virtual bases left to right: B (which skips its A — already built).'], [3, 'ABC', 'C (also skips A).'], [4, 'ABCD', 'Finally D\'s body. Without <code>virtual</code> you\'d get "ABACD" — two A sub-objects.']] },
    { name: 'Copy elision (C++17)', code: 'struct T {\n  T()            { cout << "ctor "; }\n  T(const T&)    { cout << "copy "; }\n  T(T&&)         { cout << "move "; }\n  ~T()           { cout << "dtor "; } };\nT make() { return T(); }\nint main() { T t = make(); }',
      steps: [[7, '', '<code>T t = make();</code> initializes t from a <b>prvalue</b>.'], [6, 'ctor ', '<code>return T();</code> is also a prvalue. Since C++17 prvalues are not "temporary objects that get copied" — they directly initialize the final target. → one "ctor ".'], [7, 'ctor ', 'No copy, no move: <b>guaranteed copy elision</b> (even if copy/move were deleted it would compile).'], [5, 'ctor dtor ', 'End of main: t destroyed. Output "ctor dtor ".']] },
    { name: 'Signed vs unsigned comparison', code: 'int main() {\n  unsigned u = 1; int i = -1;\n  cout << (i < u) << " " << (-1 < 1);\n}',
      steps: [[2, '', 'Mixed <code>int</code> and <code>unsigned int</code> in a comparison → the usual arithmetic conversions turn the int into <b>unsigned</b>.'], [3, '0', '-1 becomes 4294967295 (2<sup>32</sup> − 1), which is not &lt; 1 → false → prints 0.'], [3, '0 1', 'Both ints → normal comparison → 1. Use <code>std::cmp_less(i, u)</code> (C++20) for a mathematically correct comparison; compile with <code>-Wsign-compare</code>.']] }
  ];

  function outputViz(input) {
    var k = intIn(input, '1', 1, OUTQ.length, 'Question number');
    var q = OUTQ[k - 1], frames = [];
    frames.push({ narr: '<b>Question ' + k + ': ' + q.name + '.</b> Read the code and predict the exact output <i>before</i> stepping. (Type another number 1–' + OUTQ.length + ' in the box to switch questions.)',
      parts: [codePart('predict the output', q.code, {}), { type: 'vars', label: 'stdout', vals: { output: '(nothing yet)' } }] });
    q.steps.forEach(function (s, i) {
      var h = {}; h[s[0]] = s[1] !== (i ? q.steps[i - 1][1] : '') ? 'ok' : 'cur';
      frames.push({ narr: s[2], parts: [codePart('predict the output', q.code, h), { type: 'vars', label: 'stdout', vals: { output: s[1] === '' ? '(nothing yet)' : '"' + s[1] + '"' }, hl: s[1] !== (i ? q.steps[i - 1][1] : '') ? { output: 'ok' } : {} }] });
    });
    frames.push({ narr: 'Final answer for Q' + k + ': <b>' + H.esc(q.steps[q.steps.length - 1][1]) + '</b>. Did your prediction match? If not, the step where you diverged is the rule to memorize.',
      parts: [{ type: 'table', label: 'all questions in this visualizer', columns: ['#', 'topic', 'output'], rows: OUTQ.map(function (x, j) { return [String(j + 1), x.name, x.steps[x.steps.length - 1][1]]; }), hl: (function () { var o = {}; o[k - 1] = 'sel'; return o; })() }] });
    return frames;
  }

  topics.push({
    title: 'Tricky C++ Interview Questions & Output Prediction',
    analogy: `<p>Output-prediction questions are like <b>magic tricks</b>: the audience watches the obvious hand while the real work happens in the other one. In C++ the "other hand" is always one of a few hidden rules — the <i>static</i> type vs the <i>dynamic</i> type, the order objects are born and die, a silent conversion, a copy that was elided, or plain undefined behavior. Learn the handful of hidden hands and every trick becomes obvious.</p>`,
    explain: `<p>🟢 <b>A 7-step checklist for any "what does this print?" question:</b></p>
      <ol>
        <li><b>Is there undefined behavior?</b> Unsequenced modifications (<code>i++ + i++</code>), reading uninitialized members, dangling references, signed overflow, deleting through a non-virtual base destructor. If yes, the answer is "UB" — say so confidently.</li>
        <li><b>Lifetimes:</b> construction = virtual bases → bases (left to right) → members (<b>declaration</b> order, not initializer-list order) → body. Destruction = exact reverse. Temporaries die at the end of the full expression (unless bound to a const&amp; / &amp;&amp; local).</li>
        <li><b>Static vs dynamic type:</b> virtual calls use the dynamic type, but <b>default arguments, overload resolution, name lookup and access checks use the static type</b>. Virtual calls in constructors/destructors don't go further down than the class being built. Pass-by-value <b>slices</b>.</li>
        <li><b>Name lookup:</b> a name in a derived class <b>hides</b> all base overloads with that name (fix: <code>using Base::f;</code>).</li>
        <li><b>Overload resolution:</b> exact match &gt; promotion (<code>char→int</code>, <code>float→double</code>) &gt; conversion (<code>int→long</code>, <code>int→double</code>) &gt; user-defined; non-template beats template on a tie; specializations don't participate.</li>
        <li><b>Copies and moves:</b> prvalues are elided (C++17 guaranteed); NRVO is allowed but optional; returning a local or parameter by name moves it; <code>std::move</code> on a <code>const</code> object copies; containers copy during reallocation unless the move is <code>noexcept</code>.</li>
        <li><b>Arithmetic:</b> integer promotion (<code>char + 1</code> is an <code>int</code>), signed→unsigned in mixed comparisons, integer division truncates toward zero (<code>-7/2 == -3</code>, <code>-7%2 == -1</code>), <code>?:</code> unifies to a common type (<code>true ? 1 : 2.5</code> is the double 1).</li>
      </ol>
      <p><b>Evaluation order (C++17):</b> <code>a &lt;&lt; b &lt;&lt; c</code>, <code>a &gt;&gt; b</code>, <code>a = b</code> (right before left), <code>a[b]</code>, <code>a.b</code>, <code>a-&gt;*b</code> are sequenced; <b>function arguments</b> are still evaluated in an <b>unspecified</b> order (but not interleaved); <code>&amp;&amp;</code>, <code>||</code> and <code>,</code> are left-to-right with short-circuit.</p>
      ${H.table(['you see…', 'think…'], [['virtual call in ctor/dtor', 'no dispatch beyond the current class'], ['different default args in override', 'static type picks the default'], ['pass by value of a base type', 'slicing'], ['<code>f(double)</code> in derived, call <code>f(1)</code>', 'name hiding'], ['<code>vector&lt;T&gt;</code> + push_back + prints in copy/move', 'reallocation + noexcept'], ['<code>sizeof</code> of a class', 'padding, vptr, empty base, alignment'], ['<code>unsigned</code> anywhere in a comparison', 'signed → unsigned conversion']])}`,
    clues: [
      '"What is the output of this program?" + a class hierarchy → static vs dynamic type, ctor/dtor order, slicing',
      '"Will this compile?" → name hiding, ambiguous overloads, deleted functions, most vexing parse',
      'Print statements inside copy/move constructors → elision, NRVO, noexcept + vector reallocation',
      '<code>sizeof(...)</code> in the question → padding, alignment, vptr, empty base optimization',
      '<code>i++</code> twice in one expression, or reading a moved-from value → UB / unspecified — say it',
      'Mixed <code>int</code>/<code>unsigned</code>/<code>char</code> arithmetic → integer promotions and usual arithmetic conversions'
    ],
    code: [R`
      #include <iostream>
      #include <string>
      #include <utility>

      // A "Tracer" is the best tool for output questions: it logs every special member call.
      struct Tracer {
          std::string name;
          explicit Tracer(std::string n) : name(std::move(n)) { std::cout << "ctor(" << name << ") "; }
          Tracer(const Tracer& o) : name(o.name + "'") { std::cout << "copy(" << name << ") "; }
          Tracer(Tracer&& o) noexcept : name(std::move(o.name)) { o.name = "~"; std::cout << "move(" << name << ") "; }
          Tracer& operator=(const Tracer& o) { name = o.name + "="; std::cout << "copy=(" << name << ") "; return *this; }
          Tracer& operator=(Tracer&& o) noexcept { name = std::move(o.name); o.name = "~"; std::cout << "move=(" << name << ") "; return *this; }
          ~Tracer() { std::cout << "dtor(" << name << ") "; }
      };
      Tracer make(const char* n) { return Tracer(n); }       // prvalue: guaranteed elision
      Tracer pass(Tracer t) { return t; }                    // parameter: implicitly MOVED on return

      int main() {
          Tracer a("a");                 std::cout << "\n";  // ctor(a)
          Tracer b = a;                  std::cout << "\n";  // copy(a')
          Tracer c = make("c");          std::cout << "\n";  // ctor(c)            <- no copy, no move
          b = std::move(c);              std::cout << "\n";  // move=(c)
          Tracer d = pass(a);            std::cout << "\n";  // copy(a') move(a') dtor(~)
      }                                                      // dtor(a') dtor(~) dtor(c) dtor(a)  <- reverse order
    `],
    codeTitle: ['The Tracer: your microscope for every copy/move/elision question'],
    viz: { title: 'Predict-the-output: step through 10 classic traps', input: '1', inputLabel: 'Question number (1-10)', gen: outputViz },
    examples: [
      { title: 'Name hiding: the derived overload swallows the base one', html: `<p>Output: <b>B::f(double)</b>. Name lookup stops at the first scope that contains the name <code>f</code> — class B. <code>A::f(int)</code> is never even considered, so 1 converts to double. Add <code>using A::f;</code> inside B to bring it back (then <code>b.f(1)</code> prints <code>A::f(int)</code>).</p>`,
        code: R`
          #include <iostream>
          struct A { void f(int)    { std::cout << "A::f(int) "; } };
          struct B : A { void f(double) { std::cout << "B::f(double) "; } };
          int main() { B b; b.f(1); }          // B::f(double)` },
      { title: 'Static locals and C++17 left-to-right <<', html: `<p>Output: <b>123</b>. The static local is initialized once (thread-safely) and keeps its value between calls. Since C++17, the operands of <code>&lt;&lt;</code> are evaluated left to right, so this is <b>guaranteed</b> — before C++17 it was unspecified and "321" was a legal output.</p>`,
        code: R`
          #include <iostream>
          int f() { static int n = 0; return ++n; }
          int main() { std::cout << f() << f() << f() << "\n"; }    // 123` },
      { title: 'sizeof: padding, vptr and the empty base', html: `<p>Output on x86-64 (GCC/Clang): <b>14 8 128</b>. <code>sizeof(E)</code> = 1 (every object needs a distinct address); <code>D : E { int x; }</code> = 4 (empty base optimization); a class with a virtual function = 8 (the vptr); <code>{char; int; char}</code> = 12 (padding before the int and at the end to keep alignment 4), but reordered <code>{int; char; char}</code> = 8. Sort members by decreasing alignment.</p>
        ${H.table(['type', 'layout', 'sizeof'], [['struct E {}', '1 byte placeholder', '1'], ['struct D : E { int x; }', 'x (EBO)', '4'], ['struct V { virtual void f(); }', 'vptr', '8'], ['struct P { char c; int i; char d; }', 'c ___ iiii d ___', '12'], ['struct Q { int i; char c; char d; }', 'iiii c d __', '8']])}`,
        code: R`
          #include <iostream>
          struct E {}; struct D : E { int x; }; struct V { virtual void f() {} };
          struct P { char c; int i; char d; }; struct Q { int i; char c; char d; };
          int main() { std::cout << sizeof(E) << sizeof(D) << " " << sizeof(V) << " " << sizeof(P) << sizeof(Q) << "\n"; }   // 14 8 128` },
      { title: 'Overload resolution grab bag', html: `<p>Output: <b>int double int ptr long</b>. <code>'a'</code> → <code>int</code> by <b>promotion</b> (beats conversion to long/double). <code>1.0f</code> → <code>double</code> by promotion. <code>0</code> is an <code>int</code> literal → exact match (not the pointer!). <code>nullptr</code> → only converts to pointers. <code>1L</code> → exact match long.</p>`,
        code: R`
          #include <iostream>
          void f(int)    { std::cout << "int "; }
          void f(double) { std::cout << "double "; }
          void f(long)   { std::cout << "long "; }
          void f(char*)  { std::cout << "ptr "; }
          int main() { f('a'); f(1.0f); f(0); f(nullptr); f(1L); }   // int double int ptr long` },
      { title: 'NRVO is not guaranteed', html: `<p>Output (GCC): <b>ctor ctor move dtor dtor | dtor</b>. With two possible named return objects, the compiler can't construct "the" result in place, so it <b>moves</b> the chosen local into the return slot. With a single named local (<code>T x; return x;</code>) GCC/Clang usually elide (NRVO), but the standard only <i>allows</i> it. Only <code>return T();</code> (a prvalue) is guaranteed.</p>`,
        code: R`
          #include <iostream>
          struct T { T() { std::cout << "ctor "; } T(const T&) { std::cout << "copy "; }
                     T(T&&) { std::cout << "move "; } ~T() { std::cout << "dtor "; } };
          T make(bool b) { T x, y; if (b) return x; return y; }
          int main() { T t = make(true); std::cout << "| "; }        // ctor ctor move dtor dtor | dtor` },
      { title: 'Deleting through a base without a virtual destructor', html: `<p>Output: <b>~VD ~VB ~Base</b>. With a virtual destructor, <code>delete p</code> runs the full chain. <code>unique_ptr&lt;Base&gt;</code> holding a <code>Der</code> calls <code>delete</code> on a <code>Base*</code>: since <code>~Base</code> isn't virtual, only <code>~Base</code> runs — and formally the behavior is <b>undefined</b>. (<code>shared_ptr&lt;Base&gt;(new Der)</code> or <code>make_shared&lt;Der&gt;</code> would call <code>~Der</code>, because its deleter is type-erased at creation.)</p>`,
        code: R`
          #include <iostream>
          #include <memory>
          struct Base { ~Base() { std::cout << "~Base "; } };
          struct Der : Base { ~Der() { std::cout << "~Der "; } };
          struct VB { virtual ~VB() { std::cout << "~VB "; } };
          struct VD : VB { ~VD() override { std::cout << "~VD "; } };
          int main() {
              VB* p = new VD; delete p;                         // ~VD ~VB
              std::unique_ptr<Base> q = std::make_unique<Der>();  // UB at destruction: prints only ~Base
          }` },
      { title: 'Catch by value slices the exception', html: `<p>Output: <b>BaseDer</b>. <code>catch (Base b)</code> copy-constructs a Base from the thrown Der → sliced → <code>name()</code> says "Base". <code>catch (const Base&amp; b)</code> binds to the real exception object → "Der". Rule: <b>throw by value, catch by (const) reference</b>; rethrow with <code>throw;</code> (not <code>throw b;</code>, which slices again).</p>`,
        code: R`
          #include <iostream>
          struct Base { virtual const char* name() const { return "Base"; } virtual ~Base() = default; };
          struct Der : Base { const char* name() const override { return "Der"; } };
          int main() {
              try { throw Der(); } catch (Base b) { std::cout << b.name(); }          // Base (sliced copy)
              try { throw Der(); } catch (const Base& b) { std::cout << b.name(); }   // Der
          }` },
      { title: 'Small expressions, big surprises', html: `<p>Output: <b>1 97 -3 -1 0 66B</b> then <b>40 23 3</b>.</p>
        ${H.table(['expression', 'value', 'why'], [['<code>true ? 1 : 2.5</code>', '1 (a double)', 'common type is double; prints as 1'], ['<code>false ? 1 : \'a\'</code>', '97', 'common type int'], ['<code>-7/2</code>, <code>-7%2</code>', '-3, -1', 'division truncates toward zero'], ['<code>unsigned char c = 255; c++;</code>', '0', 'unsigned wraps modulo 256'], ['<code>\'A\' + 1</code>', '66', 'char promoted to int'], ['<code>sizeof(i++)</code>', '4, i unchanged', 'sizeof does not evaluate its operand'], ['<code>2[a]</code>', 'a[2]', '<code>a[b]</code> is <code>*(a+b)</code>, commutative'], ['<code>(1, 2, 3)</code>', '3', 'comma operator yields the last']])}`,
        code: R`
          #include <iostream>
          int main() {
              std::cout << (true ? 1 : 2.5) << " " << (false ? 1 : 'a') << " " << -7 / 2 << " " << -7 % 2;
              unsigned char c = 255; c++; std::cout << " " << int(c);
              char ch = 'A'; std::cout << " " << ch + 1 << char(ch + 1) << "\n";      // 1 97 -3 -1 0 66B
              int i = 0; std::cout << sizeof(i++) << i;
              int a[] = {1, 2, 3}; std::cout << " " << *(a + 1) << 2[a];
              int x = (1, 2, 3); std::cout << " " << x << "\n";                       // 40 23 3
          }` },
      { title: 'shared_ptr and weak_ptr counts', html: `<p>Output: <b>322</b>. p, q and r share one control block → 3 inside the block; r dies → 2; a <code>weak_ptr</code> increments the <b>weak</b> count, not <code>use_count()</code> → still 2.</p>`,
        code: R`
          #include <iostream>
          #include <memory>
          int main() {
              auto p = std::make_shared<int>(5);
              auto q = p;
              { auto r = q; std::cout << p.use_count(); }   // 3
              std::cout << p.use_count();                    // 2
              std::weak_ptr<int> w = p;
              std::cout << p.use_count() << "\n";            // 2
          }` }
    ],
    deepDive: `<p>🟣 <b>The rules behind the tricks, stated precisely.</b></p>
      <ul>
        <li><b>Virtual calls during construction/destruction</b> ([class.cdtor]): while a constructor or destructor of class X runs, the dynamic type is X. A call to a <i>pure</i> virtual function from there is UB (often "pure virtual function called" abort).</li>
        <li><b>Initialization order</b> is fixed by declaration order; compilers warn (<code>-Wreorder</code>) when the mem-initializer list is written in a different order, because <code>S(int x) : b(x), a(b + 1)</code> reads an <b>uninitialized</b> b if a is declared first.</li>
        <li><b>Copy elision:</b> since C++17 a prvalue is just "a recipe for initializing an object"; returning one or initializing from one never creates an intermediate. NRVO, elision of throw/catch copies, and elision from <code>std::move</code>'d locals are separate: optional, or (for <code>return std::move(x);</code>) actively <b>prevented</b> — don't write it.</li>
        <li><b>Implicit move on return</b> (C++11, broadened in C++20/23): <code>return local;</code> and <code>return param;</code> first try to move. That's why <code>pass(Tracer t)</code> prints <code>move</code>.</li>
        <li><b>vector reallocation</b> uses <code>std::move_if_noexcept</code>: if the move constructor may throw and a copy constructor exists, it copies to keep <code>push_back</code>'s strong guarantee. The order "construct new element, then relocate old ones" is a libstdc++ implementation detail — say "implementation-specific" if asked about exact order.</li>
        <li><b>Unspecified vs undefined vs implementation-defined:</b> argument evaluation order is <b>unspecified</b> (one of the valid orders happens); <code>sizeof(int)</code> is <b>implementation-defined</b> (documented by the compiler); <code>i = i++ + 1</code> was UB before C++17 and is now well-defined, but <code>i++ + i++</code> is still UB. Interviewers reward candidates who know which bucket an example is in.</li>
        <li><b>Tools to settle debates:</b> Compiler Explorer (godbolt.org) with <code>-O0</code> and <code>-O2</code>, C++ Insights (cppinsights.io) to see implicit conversions, generated special members and lambda classes, and <code>-fsanitize=address,undefined</code> to expose UB that "seems to work".</li>
      </ul>`,
    aiEra: `<p>🤖 <b>What AI changes:</b> "what does this print?" can be answered by pasting into an assistant or a compiler — so interviewers increasingly ask <b>why</b>, ask about UB, or hand you code where the obvious output is wrong. Your value is the reasoning, not the recall.</p>
      <p><b>Use AI as a partner:</b> generate fresh variations ("give me 5 output questions mixing slicing and default arguments, answers hidden"), then verify each with a real compiler and sanitizers — and ask the AI to explain the standard rule for each.</p>
      <p><b>Where AI goes wrong:</b> it confidently predicts outputs for UB code, assumes NRVO is guaranteed, gets pre-C++17 evaluation order wrong, mixes up which overload a literal <code>0</code> picks, and claims the specialization <code>g&lt;int*&gt;</code> is chosen in the Dimov–Abrahams example. Always run it.</p>
      <p><b>What you must own:</b> the 7-step checklist above, applied out loud, quickly. That's what the interviewer is scoring.</p>`,
    problems: [{
      title: 'Predict the Special-Member Call Sequence', level: 'Medium', tags: ['output prediction', 'copy elision', 'move semantics'], companies: ['Bloomberg', 'Optiver', 'IMC', 'Microsoft'],
      statement: `<p>Using the <code>Tracer</code> class from this topic (it logs <code>ctor</code>, <code>copy</code>, <code>move</code>, <code>copy=</code>, <code>move=</code>, <code>dtor</code>; copies append <code>'</code>; moved-from objects are renamed <code>~</code>), predict the <b>exact</b> output of the program below, line by line, then explain each call. Finally, change <b>one character</b> in <code>pass</code> so that line 5 prints one fewer special member call.</p>
        <pre>Tracer a("a");          // line 1
Tracer b = a;           // line 2
Tracer c = make("c");   // line 3   make: return Tracer(n);
b = std::move(c);       // line 4
Tracer d = pass(a);     // line 5   pass(Tracer t): return t;
}                       // end of main</pre>`,
      constraints: `<p>C++20, GCC/Clang. Assume no extra optimizations beyond what the standard guarantees, except that you must state where NRVO-style optional elision might apply.</p>`,
      example: `<pre>line 1: ${H.c('g', 'ctor(a)')}
line 3: ${H.c('g', 'ctor(c)')}           ← guaranteed elision, no move
line 5: ${H.c('y', "copy(a') move(a') dtor(~)")}</pre>`,
      brute: { why: `<p>The "brute" answer assumes every <code>=</code> and every <code>return</code> makes a copy: it predicts copies on lines 3 and 5 and a copy-assignment on line 4. It ignores guaranteed elision (prvalues), the implicit move on <code>return param;</code>, and that <code>std::move</code> selects the move-assignment.</p>`,
        code: R`
          #include <iostream>
          // The naive mental model, written out as the (wrong) prediction it produces.
          int main() {
              std::cout << "ctor(a)\n";                       // line 1  (right)
              std::cout << "copy(a')\n";                      // line 2  (right)
              std::cout << "ctor(c) copy(c') dtor(c)\n";      // line 3  WRONG: no copy since C++17
              std::cout << "copy=(c=)\n";                     // line 4  WRONG: std::move picks move=
              std::cout << "copy(a') copy(a'') dtor(a')\n";   // line 5  WRONG: return t; moves
          }` },
      mcq: { q: 'Why does <code>return t;</code> in <code>Tracer pass(Tracer t)</code> <b>move</b> instead of copy, but cannot be elided?', options: ['Returning a named parameter is an implicit-move context, but parameters live in the caller-built slot so NRVO does not apply', 'Because Tracer has a noexcept move constructor', 'Because the function is inline', 'It actually copies'], answer: 0, explain: 'C++ treats <code>return local_or_param;</code> as an rvalue first (implicit move). NRVO is only permitted for local variables, not function parameters.' },
      hints: [`<p>Lines 1–2 are ordinary construction and copy-construction. Line 3: <code>make</code> returns a <b>prvalue</b> → guaranteed elision, so only one constructor runs.</p>`, `<p>Line 4: <code>std::move(c)</code> is an xvalue → move-assignment; c\'s name becomes <code>~</code>. Line 5: <code>a</code> is copied into the by-value parameter <code>t</code>, then <code>return t;</code> implicitly moves into <code>d</code>, then <code>t</code> (now <code>~</code>) is destroyed.</p>`, `<p>End of main destroys d, c, b, a (reverse declaration order). For the one-character change, ask: which object on line 5 exists only because the parameter is <b>by value</b>? Add a single <code>&amp;</code> to the parameter so no parameter object is built; then <code>return t;</code> has to copy once into the return slot and nothing else runs.</p>`],
      tests: {"io":true,"cases":[{"stdin":"","stdout":"ctor(a)\ncopy(a')\nctor(c)\nmove=(c)\ncopy(a')\ncopy(a') move(a') dtor(~)\ndtor(a') dtor(a') dtor(~) dtor(c) dtor(a)"}]},
      solution: {
        approach: `<p>Apply the rules in order: prvalue elision (line 3), xvalue → move-assignment (line 4), parameter copy + implicit move on return + parameter destruction (line 5), reverse-order destruction at the end. For the one-character change: declare the parameter as <code>const Tracer&amp; t</code> — then <code>return t;</code> must copy once into the return slot (no parameter object exists), giving <code>copy(a')</code> only: one call instead of three (copy, move, dtor).</p>`,
        code: R`
          #include <iostream>
          #include <string>
          #include <utility>
          struct Tracer {
              std::string name;
              explicit Tracer(std::string n) : name(std::move(n)) { std::cout << "ctor(" << name << ") "; }
              Tracer(const Tracer& o) : name(o.name + "'") { std::cout << "copy(" << name << ") "; }
              Tracer(Tracer&& o) noexcept : name(std::move(o.name)) { o.name = "~"; std::cout << "move(" << name << ") "; }
              Tracer& operator=(const Tracer& o) { name = o.name + "="; std::cout << "copy=(" << name << ") "; return *this; }
              Tracer& operator=(Tracer&& o) noexcept { name = std::move(o.name); o.name = "~"; std::cout << "move=(" << name << ") "; return *this; }
              ~Tracer() { std::cout << "dtor(" << name << ") "; }
          };
          Tracer make(const char* n) { return Tracer(n); }
          Tracer pass(const Tracer& t) { return t; }       // the one-character change: '&' (plus const for clarity)
          Tracer passVal(Tracer t) { return t; }                  // by value: copy in, implicit move out

          int main() {
              Tracer a("a");                 std::cout << "\n";   // ctor(a)
              Tracer b = a;                  std::cout << "\n";   // copy(a')
              Tracer c = make("c");          std::cout << "\n";   // ctor(c)
              b = std::move(c);              std::cout << "\n";   // move=(c)
              Tracer d = pass(a);            std::cout << "\n";   // copy(a')   (was: copy(a') move(a') dtor(~))
              Tracer e = passVal(a);         std::cout << "\n";   // copy(a') move(a') dtor(~)
          }                                                       // dtor(a') dtor(a') dtor(~) dtor(c) dtor(a)                                                       // dtor(a') dtor(~) dtor(c) dtor(a)`,
        dry: { head: ['line', 'rule applied', 'output'], rows: [
          ['1', 'direct construction', 'ctor(a)'], ['2', 'copy-initialization from lvalue', "copy(a')"], ['3', 'prvalue → guaranteed elision', 'ctor(c)'], ['4', 'xvalue → move-assignment', 'move=(c)'],
          ['5 (by value)', 'copy into param, implicit move on return, param dies', "copy(a') move(a') dtor(~)"], ['5 (const&amp;)', 'copy from reference into return slot', "copy(a')"], ['}', 'reverse destruction d, c, b, a', "dtor(a') dtor(~) dtor(c) dtor(a)"]] },
        complexity: `<p>Not an algorithmic problem: the "cost" is the number of special-member calls — 3 → 1 on line 5 after the change.</p>`,
        followUps: ['What prints if <code>Tracer</code>\'s move constructor is deleted? (Line 3 still compiles — guaranteed elision needs no move.)', 'What changes if <code>make</code> is <code>Tracer x(n); return x;</code>? (Optional NRVO: usually still just ctor.)', 'Why is <code>return std::move(x);</code> a pessimization for a local x?']
      }
    }]
  });

  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Comparable Mixin: All Six Comparisons from operator<', level: 'Easy', tags: ['crtp', 'mixin', 'operators'], companies: ['Bloomberg', 'Microsoft'],
    statement: `<p>Write a CRTP base <code>Comparable&lt;D&gt;</code>. Any class that inherits from it and defines only <code>operator&lt;</code> must automatically support <code>&gt;</code>, <code>&lt;=</code>, <code>&gt;=</code>, <code>==</code> and <code>!=</code>. Show it working for a <code>Money{long cents}</code> type and a <code>Date{y, m, d}</code> type.</p>`,
    constraints: `<p>No virtual functions, no macros. Operators must be found for both <code>Money</code> and <code>Date</code> without writing them per class.</p>`,
    example: `<pre>Money{150} &gt; Money{99}   → ${H.c('g', 'true')}
Date{2024,1,5} &lt;= Date{2024,1,5} → ${H.c('g', 'true')}
Date{2024,1,5} != Date{2023,12,31} → ${H.c('g', 'true')}</pre>`,
    brute: { why: `<p>Writing all six operators by hand for every class: 5 extra functions × N classes, each a chance to get a sign or a <code>!</code> wrong, and they drift apart when the ordering rule changes.</p>`,
      code: R`
        struct Money {
            long cents;
            friend bool operator<(const Money& a, const Money& b)  { return a.cents < b.cents; }
            friend bool operator>(const Money& a, const Money& b)  { return a.cents > b.cents; }   // duplicated logic
            friend bool operator<=(const Money& a, const Money& b) { return a.cents <= b.cents; }
            friend bool operator>=(const Money& a, const Money& b) { return a.cents >= b.cents; }
            friend bool operator==(const Money& a, const Money& b) { return a.cents == b.cents; }
            friend bool operator!=(const Money& a, const Money& b) { return a.cents != b.cents; }
        };
        int main() { return Money{1} < Money{2} ? 0 : 1; }` },
    mcq: { q: 'Why are the derived operators written as <b>friend functions defined inside</b> <code>Comparable&lt;D&gt;</code>?', options: ['They become hidden friends found by ADL for D, and both operands get symmetric conversions', 'Friends are faster than members', 'Templates cannot have member operators', 'To make them virtual'], answer: 0, explain: 'A friend defined inside the class template is injected for each instantiation and found through argument-dependent lookup when a D is an argument.' },
    hints: [`<p>Everything can be expressed with <code>&lt;</code>: <code>a &gt; b</code> is <code>b &lt; a</code>; <code>a &lt;= b</code> is <code>!(b &lt; a)</code>; <code>a == b</code> is <code>!(a &lt; b) &amp;&amp; !(b &lt; a)</code>.</p>`, `<p>Make the parameters <code>const D&amp;</code> — the base knows D through the template parameter.</p>`, `<p>Each class: <code>struct Money : Comparable&lt;Money&gt; { ... friend bool operator&lt;(...) ... };</code>. Bonus: compare with C++20 <code>operator&lt;=&gt;</code> = default.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"111\n101001\n010101\n001110\n101001\n010101\n101001\n010101\n001110"}]},
    solution: {
      approach: `<p>The CRTP base defines five hidden-friend operators in terms of the derived class's <code>operator&lt;</code>. Each derived class writes only its ordering rule. (In C++20 you'd normally write <code>auto operator&lt;=&gt;(const Date&amp;) const = default;</code> — the CRTP version is the pre-C++20 idiom and a classic interview exercise.)</p>`,
      code: R`
        #include <iostream>
        #include <tuple>

        template <typename D>
        struct Comparable {
            friend bool operator>(const D& a, const D& b)  { return b < a; }
            friend bool operator<=(const D& a, const D& b) { return !(b < a); }
            friend bool operator>=(const D& a, const D& b) { return !(a < b); }
            friend bool operator==(const D& a, const D& b) { return !(a < b) && !(b < a); }
            friend bool operator!=(const D& a, const D& b) { return (a < b) || (b < a); }
        };

        struct Money : Comparable<Money> {
            long cents;
            explicit Money(long c) : cents(c) {}
            friend bool operator<(const Money& a, const Money& b) { return a.cents < b.cents; }
        };
        struct Date : Comparable<Date> {
            int y, m, d;
            Date(int yy, int mm, int dd) : y(yy), m(mm), d(dd) {}
            friend bool operator<(const Date& a, const Date& b) { return std::tie(a.y, a.m, a.d) < std::tie(b.y, b.m, b.d); }
        };

        template <class T>
        void row(const T& a, const T& b) {          // < > <= >= == !=
            std::cout << (a < b) << (a > b) << (a <= b) << (a >= b) << (a == b) << (a != b) << "\n";
        }

        int main() {
            std::cout << (Money{150} > Money{99})
                      << (Date{2024, 1, 5} <= Date{2024, 1, 5})
                      << (Date{2024, 1, 5} != Date{2023, 12, 31}) << "\n";   // 111
            row(Money{1}, Money{2});                                          // 101001
            row(Money{2}, Money{1});                                          // 010110
            row(Money{5}, Money{5});                                          // 001111
            row(Money{-5}, Money{0});                                         // 101001
            row(Date{2024, 1, 5}, Date{2023, 12, 31});                        // 010101
            row(Date{2024, 1, 5}, Date{2024, 1, 6});                          // 101001
            row(Date{2024, 2, 1}, Date{2024, 1, 31});                         // 010101
            row(Date{2000, 1, 1}, Date{2000, 1, 1});                          // 001111
        }`,
      complexity: `<p>Each derived operator calls <code>&lt;</code> once or twice: O(cost of &lt;). No runtime overhead after inlining.</p>`,
      followUps: ['Rewrite with C++20 <code>operator&lt;=&gt;</code> and explain what <code>= default</code> generates.', 'Why is <code>==</code> via two <code>&lt;</code> calls only "equivalence", not equality, for some types (e.g. case-insensitive strings)?']
    }
  });

  practice.push({
    title: 'Fix a Leaking, Self-Assignment-Unsafe operator=', level: 'Easy', tags: ['copy-and-swap', 'rule of three'], companies: ['Amazon', 'Cisco'],
    statement: `<p>The <code>Image</code> class below owns a <code>unsigned char* pixels_</code> of <code>w*h</code> bytes. Its assignment operator leaks the old buffer, breaks on <code>img = img</code>, and leaves the object half-assigned if allocation fails. Rewrite the special members using copy-and-swap.</p>`,
    constraints: `<p>Keep a raw pointer (no vector). All five special members must be correct; swap must be noexcept.</p>`,
    example: `<pre>Image a(2,2,7), b(1,1,9);
a = b;  → a is 1×1 with pixel 9, old 4-byte buffer ${H.c('g', 'freed')}
a = a;  → a ${H.c('g', 'unchanged')}, no crash</pre>`,
    brute: { why: `<p>The original code allocates a new buffer and overwrites the pointer without freeing the old one (leak). On self-assignment it is merely wasteful here, but the "fix" people usually add — <code>delete[]</code> first — turns it into a use-after-free and loses the strong guarantee.</p>`,
      code: R`
        #include <cstring>
        class Image {
            int w_, h_; unsigned char* pixels_;
        public:
            Image(int w, int h, unsigned char v) : w_(w), h_(h), pixels_(new unsigned char[w * h]) { std::memset(pixels_, v, w * h); }
            ~Image() { delete[] pixels_; }
            Image(const Image& o) : w_(o.w_), h_(o.h_), pixels_(new unsigned char[o.w_ * o.h_]) { std::memcpy(pixels_, o.pixels_, w_ * h_); }
            Image& operator=(const Image& o) {
                pixels_ = new unsigned char[o.w_ * o.h_];      // LEAK: old buffer never freed
                std::memcpy(pixels_, o.pixels_, o.w_ * o.h_);
                w_ = o.w_; h_ = o.h_;
                return *this;
            }
        };
        int main() { Image a(2, 2, 7), b(1, 1, 9); a = b; }` },
    mcq: { q: 'With <code>Image&amp; operator=(Image other)</code>, which special member frees a\'s <b>old</b> buffer after <code>a = b</code>?', options: ['The destructor of the parameter <code>other</code>, after the swap', 'The copy constructor', 'swap()', 'Nobody — it leaks'], answer: 0, explain: 'swap moves the old buffer into <code>other</code>; when the function returns, <code>other</code> is destroyed and its destructor deletes it.' },
    hints: [`<p>Keep the (correct) copy constructor and destructor; they will do all the work.</p>`, `<p>Add <code>friend void swap(Image&amp;, Image&amp;) noexcept</code> swapping w_, h_ and pixels_. Add a move constructor that steals with <code>std::exchange</code>.</p>`, `<p>Assignment: take <code>Image other</code> by value, <code>swap(*this, other); return *this;</code>.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"3 5 9\n4 7 1 1\n4 8\n0 4 8\n0 0\n16000000 200"}]},
    solution: {
      approach: `<p>Copy-and-swap: by-value parameter (copy or move happens before the body), noexcept member-wise swap, the parameter's destructor frees the old buffer. One operator handles copy and move assignment, self-assignment and exceptions.</p>`,
      code: R`
        #include <cstring>
        #include <iostream>
        #include <utility>

        class Image {
            int w_ = 0, h_ = 0;
            unsigned char* pixels_ = nullptr;
        public:
            Image(int w, int h, unsigned char v) : w_(w), h_(h), pixels_(new unsigned char[w * h]) { std::memset(pixels_, v, w * h); }
            ~Image() { delete[] pixels_; }
            Image(const Image& o) : w_(o.w_), h_(o.h_), pixels_(new unsigned char[o.w_ * o.h_]) {
                std::memcpy(pixels_, o.pixels_, w_ * h_);
            }
            Image(Image&& o) noexcept
                : w_(std::exchange(o.w_, 0)), h_(std::exchange(o.h_, 0)), pixels_(std::exchange(o.pixels_, nullptr)) {}
            friend void swap(Image& a, Image& b) noexcept {
                using std::swap;
                swap(a.w_, b.w_); swap(a.h_, b.h_); swap(a.pixels_, b.pixels_);
            }
            Image& operator=(Image other) noexcept { swap(*this, other); return *this; }
            int at(int i) const { return pixels_[i]; }
            int size() const { return w_ * h_; }
        };

        int main() {
            Image a(2, 2, 7), b(1, 1, 9);
            a = b;                                            // copy, old 4-byte buffer freed by ~other
            a = a;                                            // safe
            a = Image(3, 1, 5);                               // move path (elided temporary)
            std::cout << a.size() << " " << a.at(0) << " " << b.at(0) << "\n";   // 3 5 9
            Image p(2, 2, 7), q = p;
            q = Image(1, 1, 1);
            std::cout << p.size() << " " << p.at(0) << " " << q.size() << " " << q.at(0) << "\n";   // 4 7 1 1
            Image s(2, 2, 8);
            s = s;
            std::cout << s.size() << " " << s.at(3) << "\n";   // 4 8
            Image mv = std::move(s);
            std::cout << s.size() << " " << mv.size() << " " << mv.at(0) << "\n";   // 0 4 8
            Image z(0, 0, 1);
            Image z2 = z;
            std::cout << z.size() << " " << z2.size() << "\n";   // 0 0
            Image big(4000, 4000, 200);
            Image big2 = big;
            std::cout << big2.size() << " " << big2.at(15999999) << "\n";   // 16000000 200
        }`,
      complexity: `<p>Copy-assign O(w·h) with one allocation; move-assign O(1); swap O(1).</p>`,
      followUps: ['Run the original under <code>-fsanitize=address</code> — what does LeakSanitizer report?', 'How would <code>std::vector&lt;unsigned char&gt;</code> let you delete all five special members (rule of zero)?']
    }
  });

  practice.push({
    title: 'Move-Only FileHandle RAII Wrapper', level: 'Easy', tags: ['raii', 'move semantics', 'c api'], companies: ['Google', 'Meta'],
    statement: `<p>Write <code>FileHandle</code> wrapping a C <code>std::FILE*</code>: opens in the constructor (throws <code>std::runtime_error</code> on failure), closes in the destructor, is <b>move-only</b> (copying must not compile), offers <code>get()</code>, <code>release()</code> and <code>close()</code> (which reports whether <code>fclose</code> succeeded).</p>`,
    constraints: `<p>No double close, no leak on any path, destructor never throws.</p>`,
    example: `<pre>FileHandle f("/dev/null", "w");     → opened
FileHandle g = std::move(f);        → f.get() == ${H.c('g', 'nullptr')}, g owns it
FileHandle h = g;                   → ${H.c('r', 'compile error (copy deleted)')}
FileHandle bad("/no/such/dir/x", "r") → ${H.c('r', 'throws runtime_error')}</pre>`,
    brute: { why: `<p>Manual <code>fopen</code>/<code>fclose</code> pairs: every early return or exception between them leaks the handle, and copying the raw pointer around leads to double <code>fclose</code>.</p>`,
      code: R`
        #include <cstdio>
        #include <stdexcept>
        void process(bool fail) {
            std::FILE* f = std::fopen("/dev/null", "w");
            if (!f) return;
            if (fail) throw std::runtime_error("oops");   // LEAK: fclose never runs
            std::fclose(f);
        }
        int main() { try { process(true); } catch (...) {} }` },
    mcq: { q: 'Why should the move constructor set the source\'s pointer to <code>nullptr</code>?', options: ['So the moved-from object\'s destructor does not close the same FILE a second time', 'Because nullptr is faster', 'To make the handle copyable', 'It is optional'], answer: 0, explain: 'Both objects run their destructors; only one may own the FILE.' },
    hints: [`<p>Members: <code>std::FILE* f_ = nullptr;</code>. Delete copy constructor and copy assignment.</p>`, `<p>Move constructor: <code>f_(std::exchange(o.f_, nullptr))</code>. Move assignment: close your current file first (or swap), then steal.</p>`, `<p><code>close()</code> returns <code>std::fclose(f_) == 0</code> and sets <code>f_ = nullptr</code>; the destructor calls <code>if (f_) std::fclose(f_);</code> and ignores errors.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"1 1\ncannot open /no/such/dir/x\nabc\n11\n111\n11\n1"}]},
    solution: {
      approach: `<p>A unique-ownership RAII class: one pointer, deleted copies, stealing moves, explicit <code>close()</code> for callers who need the error code, best-effort destructor. (Equivalent: <code>std::unique_ptr&lt;FILE, Closer&gt;</code> — mention it.)</p>`,
      code: R`
        #include <type_traits>
        #include <cstdio>
        #include <iostream>
        #include <stdexcept>
        #include <string>
        #include <utility>

        class FileHandle {
            std::FILE* f_ = nullptr;
        public:
            FileHandle(const char* path, const char* mode) : f_(std::fopen(path, mode)) {
                if (!f_) throw std::runtime_error(std::string("cannot open ") + path);
            }
            ~FileHandle() { if (f_) std::fclose(f_); }               // best effort, never throws
            FileHandle(const FileHandle&) = delete;
            FileHandle& operator=(const FileHandle&) = delete;
            FileHandle(FileHandle&& o) noexcept : f_(std::exchange(o.f_, nullptr)) {}
            FileHandle& operator=(FileHandle&& o) noexcept {
                if (this != &o) { if (f_) std::fclose(f_); f_ = std::exchange(o.f_, nullptr); }
                return *this;
            }
            std::FILE* get() const noexcept { return f_; }
            std::FILE* release() noexcept { return std::exchange(f_, nullptr); }   // caller now owns it
            bool close() noexcept { if (!f_) return true; bool ok = std::fclose(f_) == 0; f_ = nullptr; return ok; }
        };

        int main() {
            FileHandle f("/dev/null", "w");
            std::fputs("hi", f.get());
            FileHandle g = std::move(f);
            std::cout << (f.get() == nullptr) << " " << g.close() << "\n";       // 1 1
            try { FileHandle bad("/no/such/dir/x", "r"); }
            catch (const std::runtime_error& e) { std::cout << e.what() << "\n"; } // cannot open /no/such/dir/x
            static_assert(!std::is_copy_constructible_v<FileHandle> && !std::is_copy_assignable_v<FileHandle>);
            { FileHandle w("/tmp/cpp13_fh.txt", "w"); std::fputs("abc\n", w.get()); }   // closed (and flushed) by the destructor
            { FileHandle r("/tmp/cpp13_fh.txt", "r"); char buf[16] = {}; std::fgets(buf, 16, r.get()); std::cout << buf; }   // abc
            FileHandle h("/tmp/cpp13_fh.txt", "r");
            std::FILE* raw = h.release();
            std::cout << (h.get() == nullptr) << (raw != nullptr) << "\n";       // 11
            std::fclose(raw);
            FileHandle k("/dev/null", "w");
            std::cout << k.close() << k.close() << (k.get() == nullptr) << "\n"; // 111 (closing twice is harmless)
            FileHandle m1("/dev/null", "w"), m2("/dev/null", "r");
            m1 = std::move(m2);                                                   // closes m1's old file
            std::cout << (m2.get() == nullptr) << (m1.get() != nullptr) << "\n"; // 11
            FileHandle& self = m1;
            m1 = std::move(self);                                                 // self-move keeps the file open
            std::cout << (m1.get() != nullptr) << "\n";                          // 1
            std::remove("/tmp/cpp13_fh.txt");
        }`,
      complexity: `<p>O(1) everything; sizeof(FileHandle) == sizeof(FILE*).</p>`,
      followUps: ['Implement the same with <code>std::unique_ptr&lt;std::FILE, decltype([](std::FILE* f){ std::fclose(f); })&gt;</code> (C++20).', 'Why is a throwing constructor the right way to report "cannot open" here?']
    }
  });

  practice.push({
    title: 'Predict the Lifetime Trace (globals, temporaries, statics)', level: 'Easy', tags: ['output prediction', 'object lifetime'], companies: ['Bloomberg', 'Qualcomm', 'Optiver'],
    statement: `<p>Predict the exact output of the program below. <code>X</code> prints <code>+id</code> when constructed and <code>-id</code> when destroyed.</p>
      <pre>X g(1);
X make(int i) { return X(i); }
int main() {
    X a(2);
    { X b(3); }
    X(4);
    static X s(5);
    const X&amp; r = make(7);
    X c(6);
    cout &lt;&lt; "| ";
}</pre>`,
    constraints: `<p>Standard C++20 semantics; one translation unit.</p>`,
    example: `<p>Answer: <code>${H.c('g', '+1 +2 +3 -3 +4 -4 +5 +7 +6 | -6 -7 -2 -5 -1')}</code></p>`,
    brute: { why: `<p>The usual wrong guess forgets that <code>X(4);</code> is a temporary that dies immediately, that <code>r</code> <b>extends</b> the lifetime of the temporary from <code>make(7)</code> to the end of main, and that statics/globals die <b>after</b> main in reverse order of construction.</p>`,
      code: R`
        #include <iostream>
        // A typical wrong prediction, printed for comparison:
        int main() { std::cout << "+1 +2 +3 -3 +4 +5 +7 -7 +6 | -6 -4 -2 -5 -1\n"; }` },
    mcq: { q: 'When is the temporary returned by <code>make(7)</code> destroyed?', options: ['At the end of main, as if it were a local declared at that point (lifetime extension)', 'At the end of the statement', 'After s(5) is destroyed', 'Never — it leaks'], answer: 0, explain: 'Binding a prvalue to a <code>const X&amp;</code> local extends the temporary\'s lifetime to the reference\'s scope; it is destroyed in reverse order with the other locals (after c, before a).' },
    hints: [`<p>Globals are constructed before main. A block <code>{ }</code> ends lifetimes immediately. An unnamed <code>X(4);</code> is destroyed at the semicolon.</p>`, `<p>Function-local statics are constructed when control first passes through them and destroyed after main returns.</p>`, `<p>Locals die in reverse order: c, then the extended temporary (7), then a. Then statics/globals in reverse order of construction: s(5) was built after g(1) → -5 then -1.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"+1 +2 +3 -3 +4 -4 +5 +7 +6 | -6 -7 -2 -5 -1"}]},
    solution: {
      approach: `<p>Walk the program with the lifetime rules: global before main; block scope; full-expression temporaries; lazy statics; lifetime extension through <code>const&amp;</code>; reverse destruction of locals at <code>}</code>; then reverse destruction of statics and globals.</p>`,
      code: R`
        #include <iostream>
        struct X {
            int id;
            X(int i) : id(i) { std::cout << "+" << id << " "; }
            ~X() { std::cout << "-" << id << " "; }
        };
        X g(1);
        X make(int i) { return X(i); }
        int main() {
            X a(2);
            { X b(3); }
            X(4);
            static X s(5);
            const X& r = make(7);
            X c(6);
            std::cout << "| ";
        }   // +1 +2 +3 -3 +4 -4 +5 +7 +6 | -6 -7 -2 -5 -1`,
      dry: { head: ['event', 'output'], rows: [['global g(1) before main', '+1'], ['X a(2)', '+2'], ['{ X b(3); }', '+3 -3'], ['X(4); temporary', '+4 -4'], ['static s(5)', '+5'], ['const X&amp; r = make(7)', '+7 (extended)'], ['X c(6)', '+6'], ['} locals reversed', '-6 -7 -2'], ['after main: statics/globals reversed', '-5 -1']] },
      complexity: `<p>Not algorithmic — it's about lifetime rules.</p>`,
      followUps: ['What changes if <code>r</code> were declared as <code>X&amp;&amp; r = make(7);</code>? (Same extension.)', 'What if <code>make</code> returned <code>const X&amp;</code> to a local? (Dangling → UB.)']
    }
  });

  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'Polymorphic clone() Once for a Whole Hierarchy (CRTP)', level: 'Medium', tags: ['crtp', 'virtual constructor', 'smart pointers'], companies: ['Bloomberg', 'Adobe', 'Autodesk'],
    statement: `<p>You have <code>std::vector&lt;std::unique_ptr&lt;Shape&gt;&gt;</code> and need to deep-copy it. Each concrete shape needs <code>std::unique_ptr&lt;Shape&gt; clone() const</code>, but writing it in 20 classes is error-prone (copy-paste a wrong type and you silently slice). Write a CRTP helper <code>Cloneable&lt;Derived, Base&gt;</code> that implements <code>clone()</code> for any derived class.</p>`,
    constraints: `<p>Shape is an abstract base with a virtual destructor. Derived classes write <b>no</b> clone code. C++20.</p>`,
    example: `<pre>vector&lt;unique_ptr&lt;Shape&gt;&gt; a; a.push_back(make_unique&lt;Circle&gt;(1)); a.push_back(make_unique&lt;Square&gt;(2));
auto b = deepCopy(a);   → b[0]->name() = ${H.c('g', '"Circle"')}, b[1]->name() = ${H.c('g', '"Square"')}, distinct objects</pre>`,
    brute: { why: `<p>Hand-written <code>clone()</code> in every class: repetitive, and the copy-paste bug <code>return std::make_unique&lt;Circle&gt;(*this);</code> inside <code>Square</code> compiles only if conversions exist — or worse, a forgotten override silently uses an intermediate base's clone and <b>slices</b>.</p>`,
      code: R`
        #include <memory>
        #include <string>
        struct Shape { virtual ~Shape() = default; virtual std::unique_ptr<Shape> clone() const = 0; virtual std::string name() const = 0; };
        struct Circle : Shape {
            double r; explicit Circle(double x) : r(x) {}
            std::unique_ptr<Shape> clone() const override { return std::make_unique<Circle>(*this); }   // repeated
            std::string name() const override { return "Circle"; }
        };
        struct Square : Shape {
            double s; explicit Square(double x) : s(x) {}
            std::unique_ptr<Shape> clone() const override { return std::make_unique<Square>(*this); }   // repeated
            std::string name() const override { return "Square"; }
        };
        int main() { Circle c(1); auto p = c.clone(); return p->name() == "Circle" ? 0 : 1; }` },
    mcq: { q: 'Inside <code>Cloneable&lt;D, Base&gt;::clone()</code>, what does <code>static_cast&lt;const D&amp;&gt;(*this)</code> give you that <code>*this</code> does not?', options: ['The full derived object, so make_unique&lt;D&gt; copies all of it (no slicing)', 'A virtual call', 'A shallow copy', 'Thread safety'], answer: 0, explain: 'In the base, <code>*this</code> has the static type of the CRTP base; casting to D lets the copy constructor of D run on the whole object.' },
    hints: [`<p><code>template &lt;class D, class Base&gt; struct Cloneable : Base { std::unique_ptr&lt;Base&gt; clone() const override { ... } };</code> — the helper sits <b>between</b> Shape and the concrete class.</p>`, `<p>Body: <code>return std::make_unique&lt;D&gt;(static_cast&lt;const D&amp;&gt;(*this));</code></p>`, `<p>Concrete classes: <code>struct Circle : Cloneable&lt;Circle, Shape&gt; { ... };</code>. Forward constructors with <code>using Base::Base;</code> if Base has constructors.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"Circle Square 1\n1 1\n0\n500 1000 2000"}]},
    solution: {
      approach: `<p>A CRTP layer inserted between the abstract base and each concrete class overrides <code>clone()</code> once, using the known derived type. Runtime polymorphism (virtual clone) and compile-time code generation (CRTP) work together: this is the "virtual constructor" idiom without the boilerplate.</p>`,
      code: R`
        #include <set>
        #include <iostream>
        #include <memory>
        #include <string>
        #include <vector>

        struct Shape {
            virtual ~Shape() = default;
            virtual std::unique_ptr<Shape> clone() const = 0;
            virtual std::string name() const = 0;
        };

        template <typename D, typename Base>
        struct Cloneable : Base {
            using Base::Base;                                   // inherit Base's constructors
            std::unique_ptr<Base> clone() const override {
                return std::make_unique<D>(static_cast<const D&>(*this));   // copies the WHOLE D
            }
        };

        struct Circle : Cloneable<Circle, Shape> {
            double r;
            explicit Circle(double x) : r(x) {}
            std::string name() const override { return "Circle"; }
        };
        struct Square : Cloneable<Square, Shape> {
            double s;
            explicit Square(double x) : s(x) {}
            std::string name() const override { return "Square"; }
        };

        std::vector<std::unique_ptr<Shape>> deepCopy(const std::vector<std::unique_ptr<Shape>>& v) {
            std::vector<std::unique_ptr<Shape>> out;
            out.reserve(v.size());
            for (const auto& p : v) out.push_back(p->clone());
            return out;
        }

        int main() {
            std::vector<std::unique_ptr<Shape>> a;
            a.push_back(std::make_unique<Circle>(1));
            a.push_back(std::make_unique<Square>(2));
            auto b = deepCopy(a);
            std::cout << b[0]->name() << " " << b[1]->name() << " " << (a[0].get() != b[0].get()) << "\n";   // Circle Square 1
            auto* c = dynamic_cast<Circle*>(b[0].get());                  // the copy is a real Circle, not a sliced Shape
            auto* s = dynamic_cast<Square*>(b[1].get());
            std::cout << (c && c->r == 1) << " " << (s && s->s == 2) << "\n";   // 1 1
            std::cout << deepCopy({}).size() << "\n";                      // 0
            std::vector<std::unique_ptr<Shape>> many;
            for (int i = 0; i < 1000; ++i) {
                if (i % 2) many.push_back(std::make_unique<Square>(i)); else many.push_back(std::make_unique<Circle>(i));
            }
            auto copy = deepCopy(many);
            std::set<const Shape*> ptrs;
            int circles = 0;
            for (std::size_t i = 0; i < copy.size(); ++i) {
                ptrs.insert(copy[i].get());
                ptrs.insert(many[i].get());
                circles += copy[i]->name() == "Circle";
            }
            std::cout << circles << " " << copy.size() << " " << ptrs.size() << "\n";   // 500 1000 2000
        }`,
      complexity: `<p>O(n) clones for a vector of n; each clone is one allocation + the derived copy constructor.</p>`,
      followUps: ['Support covariant return (<code>std::unique_ptr&lt;Circle&gt;</code>) — why can\'t smart pointers be covariant, and how do you work around it?', 'How does this interact with a three-level hierarchy (Shape → Polygon → Square)?']
    }
  });

  practice.push({
    title: 'Fluent Builder That Keeps the Derived Type (CRTP chaining)', level: 'Medium', tags: ['crtp', 'fluent interface', 'builder'], companies: ['Amazon', 'Salesforce'],
    statement: `<p>A base <code>RequestBuilder</code> has chainable setters <code>url()</code> and <code>header()</code>; a derived <code>JsonRequestBuilder</code> adds <code>json()</code>. With ordinary inheritance, <code>JsonRequestBuilder{}.url("x").json("{}")</code> fails: <code>url()</code> returns <code>RequestBuilder&amp;</code>, which has no <code>json()</code>. Fix it with CRTP so chaining keeps the most-derived type.</p>`,
    constraints: `<p>No virtual functions, no casts at the call site. The final <code>build()</code> returns a <code>std::string</code> describing the request.</p>`,
    example: `<pre>JsonRequestBuilder{}.url("/api").header("A", "1").json(R"({&quot;x&quot;:1})").build()
→ ${H.c('g', '"POST /api [A: 1] {&quot;x&quot;:1}"')}</pre>`,
    brute: { why: `<p>The non-CRTP version returns <code>RequestBuilder&amp;</code> from base setters, so after the first base call the static type "forgets" the derived class; you'd need to reorder calls (derived first) or <code>static_cast</code> at every call site.</p>`,
      code: R`
        #include <string>
        struct RequestBuilder {
            std::string u;
            RequestBuilder& url(std::string s) { u = std::move(s); return *this; }   // returns the BASE type
        };
        struct JsonRequestBuilder : RequestBuilder {
            std::string body;
            JsonRequestBuilder& json(std::string b) { body = std::move(b); return *this; }
        };
        int main() {
            JsonRequestBuilder j;
            j.json("{}").url("/api");            // works only in this order
            // j.url("/api").json("{}");         // ERROR: RequestBuilder has no member 'json'
        }` },
    mcq: { q: 'What should the base setters return in the CRTP version?', options: ['<code>Derived&amp;</code>, via <code>static_cast&lt;Derived&amp;&gt;(*this)</code>', '<code>RequestBuilder&amp;</code>', '<code>void</code>', 'A copy of the builder'], answer: 0, explain: 'Returning <code>Derived&amp;</code> keeps the full static type through the chain, so derived-only methods remain callable.' },
    hints: [`<p>Make the base a template: <code>template &lt;class Derived&gt; struct BuilderBase</code> with a private <code>Derived&amp; self()</code>.</p>`, `<p>Every base setter ends with <code>return self();</code> so its return type is <code>Derived&amp;</code>.</p>`, `<p><code>struct JsonRequestBuilder : BuilderBase&lt;JsonRequestBuilder&gt;</code>; if you also want a plain builder, write <code>struct PlainBuilder : BuilderBase&lt;PlainBuilder&gt; {};</code>.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"POST /api [A: 1] {\"x\":1}\n<POST {}>\n<GET /a >\nPOST /z [A: 1] [B: 2] {\"k\":2}\n1000"}]},
    solution: {
      approach: `<p>CRTP base parameterised on the final builder type; setters return <code>Derived&amp;</code>. The chain's static type stays the derived builder, so base and derived setters can be mixed in any order. (C++23 alternative: deducing <code>this</code> — <code>auto&amp;&amp; url(this auto&amp;&amp; self, std::string s)</code>.)</p>`,
      code: R`
        #include <type_traits>
        #include <iostream>
        #include <string>
        #include <utility>
        #include <vector>

        template <typename Derived>
        class BuilderBase {
        protected:
            std::string url_, method_ = "GET";
            std::vector<std::pair<std::string, std::string>> headers_;
            Derived& self() { return static_cast<Derived&>(*this); }
        public:
            Derived& url(std::string u) { url_ = std::move(u); return self(); }
            Derived& header(std::string k, std::string v) { headers_.emplace_back(std::move(k), std::move(v)); return self(); }
            std::string describeHead() const {
                std::string s = method_ + " " + url_;
                for (const auto& [k, v] : headers_) s += " [" + k + ": " + v + "]";
                return s;
            }
        };

        class JsonRequestBuilder : public BuilderBase<JsonRequestBuilder> {
            std::string body_;
        public:
            JsonRequestBuilder& json(std::string b) { body_ = std::move(b); method_ = "POST"; return *this; }
            std::string build() const { return describeHead() + " " + body_; }
        };

        int main() {
            std::cout << JsonRequestBuilder{}.url("/api").header("A", "1").json(R"({"x":1})").build() << "\n";
            // POST /api [A: 1] {"x":1}
            std::cout << '<' << JsonRequestBuilder{}.json("{}").build() << ">\n";                 // <POST  {}>
            std::cout << '<' << JsonRequestBuilder{}.url("/a").build() << ">\n";                  // <GET /a >
            std::cout << JsonRequestBuilder{}.header("A", "1").json(R"({"k":2})").url("/z").header("B", "2").build() << "\n";
            // POST /z [A: 1] [B: 2] {"k":2}
            static_assert(std::is_same_v<decltype(JsonRequestBuilder{}.url("x")), JsonRequestBuilder&>);
            JsonRequestBuilder many;
            for (int i = 0; i < 1000; ++i) many.header("h", std::to_string(i));
            std::string out = many.build();
            std::cout << std::count(out.begin(), out.end(), '[') << "\n";                         // 1000
        }`,
      complexity: `<p>O(total string length); zero dispatch overhead.</p>`,
      followUps: ['Rewrite with C++23 deducing this — what does it remove?', 'How would you make <code>build()</code> only callable after <code>url()</code> was set, at compile time? (Typestate builder with template flags.)']
    }
  });

  practice.push({
    title: 'Heterogeneous Printable Container via Type Erasure', level: 'Medium', tags: ['type erasure', 'value semantics'], companies: ['Google', 'Two Sigma'],
    statement: `<p>Implement <code>Printable</code>, a value type that can hold <b>any</b> object for which <code>os &lt;&lt; obj</code> works (int, std::string, a user <code>Point</code> with its own <code>operator&lt;&lt;</code>), so you can write <code>std::vector&lt;Printable&gt; v{42, std::string("hi"), Point{1,2}};</code> and print them all. Copies must be deep.</p>`,
    constraints: `<p>No common base class for the stored types; no std::any/std::function. The template constructor must not hijack copies of Printable.</p>`,
    example: `<pre>vector&lt;Printable&gt; v{42, string("hi"), Point{1,2}, 3.5};
for (auto&amp; p : v) cout &lt;&lt; p &lt;&lt; ' ';   → ${H.c('g', '42 hi (1,2) 3.5')}</pre>`,
    brute: { why: `<p>The inheritance approach requires every stored type to derive from an <code>IPrintable</code> interface — impossible for <code>int</code> and <code>std::string</code>, and it forces a vector of <code>unique_ptr</code> (no value semantics, no easy copying).</p>`,
      code: R`
        #include <iostream>
        #include <memory>
        #include <vector>
        struct IPrintable { virtual ~IPrintable() = default; virtual void print(std::ostream&) const = 0; };
        struct Point : IPrintable {                 // intrusive: Point must know about IPrintable
            int x, y; Point(int a, int b) : x(a), y(b) {}
            void print(std::ostream& os) const override { os << "(" << x << "," << y << ")"; }
        };
        int main() {
            std::vector<std::unique_ptr<IPrintable>> v;
            v.push_back(std::make_unique<Point>(1, 2));
            // v.push_back(42);                      // impossible: int can't inherit IPrintable
            for (auto& p : v) p->print(std::cout);
        }` },
    mcq: { q: 'What goes wrong if the template constructor <code>template &lt;class T&gt; Printable(T&amp;&amp; t)</code> is <b>unconstrained</b> and you copy a non-const Printable?', options: ['It is a better match than the copy constructor (T = Printable&amp;), so it wraps a Printable inside a Printable', 'Nothing', 'Compilation error always', 'It moves from the source'], answer: 0, explain: 'For a non-const lvalue, <code>T&amp;&amp;</code> with T = Printable&amp; is an exact match, beating <code>const Printable&amp;</code>. Constrain it away with requires.' },
    hints: [`<p>Concept/Model: <code>struct Concept { virtual void print(std::ostream&amp;) const = 0; virtual std::unique_ptr&lt;Concept&gt; clone() const = 0; virtual ~Concept() = default; };</code></p>`, `<p><code>template &lt;class T&gt; struct Model : Concept { T v; void print(std::ostream&amp; os) const override { os &lt;&lt; v; } ... };</code></p>`, `<p>Constrain the constructor: <code>requires (!std::same_as&lt;std::remove_cvref_t&lt;T&gt;, Printable&gt;)</code> and a concept that checks <code>os &lt;&lt; t</code> compiles. Add a <code>friend operator&lt;&lt;</code> for Printable.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"42 hi replaced 3.5 | (1,2)\n7 abc\n42 3.5\nlit 1 -5 123456789012\n48890"}]},
    solution: {
      approach: `<p>Type erasure with a constrained template constructor and a concept for good errors. Each element is a value: copying clones the model, so the vector of Printables behaves like a vector of ints.</p>`,
      code: R`
        #include <sstream>
        #include <concepts>
        #include <iostream>
        #include <memory>
        #include <ostream>
        #include <string>
        #include <type_traits>
        #include <vector>

        template <typename T>
        concept Streamable = requires(std::ostream& os, const T& t) { { os << t } -> std::same_as<std::ostream&>; };

        class Printable {
            struct Concept {
                virtual ~Concept() = default;
                virtual void print(std::ostream& os) const = 0;
                virtual std::unique_ptr<Concept> clone() const = 0;
            };
            template <typename T>
            struct Model final : Concept {
                T v;
                explicit Model(T x) : v(std::move(x)) {}
                void print(std::ostream& os) const override { os << v; }
                std::unique_ptr<Concept> clone() const override { return std::make_unique<Model>(*this); }
            };
            std::unique_ptr<Concept> self_;
        public:
            template <typename T>
                requires (!std::same_as<std::decay_t<T>, Printable> && Streamable<std::decay_t<T>>)
            Printable(T&& t) : self_(std::make_unique<Model<std::decay_t<T>>>(std::forward<T>(t))) {}
            Printable(const Printable& o) : self_(o.self_->clone()) {}
            Printable(Printable&&) noexcept = default;
            Printable& operator=(Printable o) noexcept { self_.swap(o.self_); return *this; }
            friend std::ostream& operator<<(std::ostream& os, const Printable& p) { p.self_->print(os); return os; }
        };

        struct Point { int x, y; };
        std::ostream& operator<<(std::ostream& os, const Point& p) { return os << "(" << p.x << "," << p.y << ")"; }

        int main() {
            std::vector<Printable> v{42, std::string("hi"), Point{1, 2}, 3.5};
            Printable copy = v[2];                      // non-const lvalue: copy ctor, not the template
            v[2] = std::string("replaced");
            for (const auto& p : v) std::cout << p << ' ';
            std::cout << "| " << copy << "\n";          // 42 hi replaced 3.5 | (1,2)
            Printable p1 = std::string("abc");
            Printable p2 = p1;
            p1 = 7;
            std::cout << p1 << " " << p2 << "\n";       // 7 abc
            std::vector<Printable> w = v;               // copies the whole vector deeply
            v[0] = 0;
            for (std::size_t i = 0; i < w.size(); ++i) if (i != 1 && i != 2) std::cout << w[i] << ' ';   // 42 3.5
            std::cout << "\n";
            std::cout << Printable("lit") << ' ' << Printable(true) << ' ' << Printable(-5) << ' ' << Printable(123456789012LL) << "\n";   // lit 1 -5 123456789012
            std::vector<Printable> many;
            for (int i = 0; i < 10000; ++i) many.push_back(i);
            std::ostringstream os;
            for (const auto& p : many) os << p << ' ';
            std::cout << os.str().size() << "\n";       // 48890
        }`,
      complexity: `<p>One allocation per element; printing is one virtual call each; copy O(size of stored value).</p>`,
      followUps: ['Add small buffer optimization for types up to 16 bytes.', 'Add a second operation (e.g. <code>size()</code>) — what has to change? (Concept and Model: the "expression problem".)']
    }
  });

  practice.push({
    title: 'push_back with the Strong Guarantee (move_if_noexcept)', level: 'Medium', tags: ['exception safety', 'move semantics', 'containers'], companies: ['Bloomberg', 'Jane Street', 'Microsoft'],
    statement: `<p>Implement the growth path of a mini vector <code>Vec&lt;T&gt;::emplace_back</code> so that it gives the <b>strong exception guarantee</b> like <code>std::vector</code>: if anything throws while growing, the vector is exactly as before. Relocate old elements by <b>move</b> when <code>T</code>'s move constructor is <code>noexcept</code> (or T is move-only), and by <b>copy</b> otherwise.</p>`,
    constraints: `<p>Raw storage via <code>::operator new</code>; construct with placement new; doubling growth. C++20.</p>`,
    example: `<pre>T with noexcept move   : push ×3 → relocations use ${H.c('g', 'move')}
T with throwing move   : push ×3 → relocations use ${H.c('y', 'copy')} (so a throw can't destroy old data)</pre>`,
    brute: { why: `<p>Relocating with plain <code>std::move</code> gives only the basic guarantee: if the 3rd element's move constructor throws, elements 1–2 have already been moved-from in the old buffer — the original contents are gone and cannot be restored.</p>`,
      code: R`
        #include <new>
        #include <utility>
        #include <cstddef>
        template <typename T>
        void growNaive(T*& data, std::size_t size, std::size_t& cap) {
            T* fresh = static_cast<T*>(::operator new(2 * cap * sizeof(T)));
            for (std::size_t i = 0; i < size; ++i)
                ::new (fresh + i) T(std::move(data[i]));   // if this throws at i = 2, data[0..1] are already gutted
            for (std::size_t i = 0; i < size; ++i) data[i].~T();
            ::operator delete(data);
            data = fresh; cap *= 2;
        }
        int main() { int* d = static_cast<int*>(::operator new(sizeof(int))); ::new (d) int(1); std::size_t cap = 1; growNaive(d, 1, cap); d[0] = 0; ::operator delete(d); }` },
    mcq: { q: 'What does <code>std::move_if_noexcept(x)</code> return when T has a copy constructor and a move constructor that is <b>not</b> noexcept?', options: ['<code>const T&amp;</code> — so the copy constructor is chosen', '<code>T&amp;&amp;</code> — always moves', 'It does not compile', 'A copy of x by value'], answer: 0, explain: 'It casts to an rvalue only if moving cannot throw or if T is not copyable; otherwise it yields a const lvalue reference so copying keeps the source intact.' },
    hints: [`<p>Allocate the new buffer first. Construct the <b>new element</b> there first (its arguments might refer to an old element), then relocate the old ones.</p>`, `<p>Relocate with <code>::new (fresh + i) T(std::move_if_noexcept(data_[i]))</code>, counting how many succeeded.</p>`, `<p>On any exception: destroy what you built in the new buffer (<code>std::destroy_n</code>), free it, rethrow — the old buffer is untouched. Only after full success destroy the old elements and swap in the new buffer.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"move move move | copy copy copy\ncaught size=4 live=4\nlive after=0\n5\nxxx"}]},
    solution: {
      approach: `<p>Do all fallible work in a fresh buffer; commit by pointer assignment (cannot fail). <code>move_if_noexcept</code> picks copy when a move could throw, so the old elements are never modified until the commit — the same rule <code>std::vector</code> follows (which is why you should mark move constructors <code>noexcept</code>).</p>`,
      code: R`
        #include <stdexcept>
        #include <string>
        #include <cstddef>
        #include <iostream>
        #include <memory>
        #include <new>
        #include <utility>

        template <typename T>
        class Vec {
            T* data_ = nullptr;
            std::size_t size_ = 0, cap_ = 0;
        public:
            Vec() = default;
            Vec(const Vec&) = delete;
            Vec& operator=(const Vec&) = delete;
            ~Vec() { std::destroy_n(data_, size_); ::operator delete(data_); }
            std::size_t size() const { return size_; }

            template <typename... A>
            T& emplace_back(A&&... args) {
                if (size_ < cap_) { ::new (static_cast<void*>(data_ + size_)) T(std::forward<A>(args)...); return data_[size_++]; }
                std::size_t newCap = cap_ ? 2 * cap_ : 1;
                T* fresh = static_cast<T*>(::operator new(newCap * sizeof(T)));
                try {
                    ::new (static_cast<void*>(fresh + size_)) T(std::forward<A>(args)...);   // new element first
                } catch (...) { ::operator delete(fresh); throw; }
                std::size_t i = 0;
                try {
                    for (; i < size_; ++i)
                        ::new (static_cast<void*>(fresh + i)) T(std::move_if_noexcept(data_[i]));
                } catch (...) {
                    std::destroy_n(fresh, i);                  // undo partial relocation
                    std::destroy_at(fresh + size_);            // and the new element
                    ::operator delete(fresh);
                    throw;                                     // old buffer untouched: strong guarantee
                }
                std::destroy_n(data_, size_);                  // commit: nothing below can throw
                ::operator delete(data_);
                data_ = fresh; cap_ = newCap;
                return data_[size_++];
            }
        };

        struct Safe   { Safe() = default; Safe(const Safe&) { std::cout << "copy "; } Safe(Safe&&) noexcept { std::cout << "move "; } };
        struct Unsafe { Unsafe() = default; Unsafe(const Unsafe&) { std::cout << "copy "; } Unsafe(Unsafe&&) { std::cout << "move "; } };

        struct Throwy {                                   // no move constructor: only the copy can be used, and it may throw
            static inline int live = 0, budget = 100;
            Throwy() { ++live; }
            Throwy(const Throwy&) { if (budget-- <= 0) throw std::runtime_error("copy failed"); ++live; }
            ~Throwy() { --live; }
        };

        int main() {
            Vec<Safe> a;   for (int k = 0; k < 3; ++k) a.emplace_back();   std::cout << "| ";   // move move move |
            Vec<Unsafe> b; for (int k = 0; k < 3; ++k) b.emplace_back();   std::cout << "\n";   // copy copy copy
            {
                Vec<Throwy> t;
                for (int k = 0; k < 4; ++k) t.emplace_back();              // size 4, capacity 4
                Throwy::budget = 1;                                        // the next growth may copy only one element
                try { t.emplace_back(); }
                catch (const std::runtime_error&) { std::cout << "caught size=" << t.size() << " live=" << Throwy::live << "\n"; }   // caught size=4 live=4
            }
            std::cout << "live after=" << Throwy::live << "\n";            // live after=0
            Vec<std::unique_ptr<int>> moveOnly;                            // move-only: relocated by move
            for (int k = 0; k < 5; ++k) moveOnly.emplace_back(new int(k));
            std::cout << moveOnly.size() << "\n";                          // 5
            Vec<std::string> vs;
            std::cout << vs.emplace_back(3, 'x') << "\n";                  // xxx
        }`,
      complexity: `<p>Amortized O(1) per push (doubling); a growth step is O(n) relocations. Copy-relocation for throwing moves costs more — another reason to make moves <code>noexcept</code>.</p>`,
      followUps: ['Why construct the new element before relocating? (Consider <code>v.emplace_back(v[0])</code>.)', 'What does <code>std::vector</code> do for a move-only type with a throwing move? (Moves anyway — only the basic guarantee.)', 'How do "trivially relocatable" types (P1144/P2786) speed this up?']
    }
  });

  practice.push({
    title: 'All-or-Nothing Batch Update with an Undo Log', level: 'Medium', tags: ['raii', 'scope guard', 'exception safety'], companies: ['Stripe', 'Goldman Sachs', 'Amazon'],
    statement: `<p>Implement <code>applyBatch(std::map&lt;std::string, long&gt;&amp; balances, const std::vector&lt;Op&gt;&amp; ops)</code> where <code>Op{account, delta}</code>. Any op that would make a balance negative or names an unknown account throws. The batch must be <b>all-or-nothing</b>: after an exception, <code>balances</code> is exactly as before. The map may be huge, the batch small — so don't copy the map.</p>`,
    constraints: `<p>O(k log n) for k ops on n accounts; no full copy of the map. Rollback must run automatically on any exception.</p>`,
    example: `<pre>balances = {alice: 100, bob: 50}
applyBatch(balances, {{alice,-30},{bob,+30},{bob,-200}})  → ${H.c('r', 'throws')} at op 3
balances == ${H.c('g', '{alice: 100, bob: 50}')}  (ops 1–2 rolled back)</pre>`,
    brute: { why: `<p>Applying ops in place without rollback leaves the map half-updated (alice already debited, bob credited) when op 3 fails. The other "simple" fix — copy the whole map, update the copy, then swap — is strongly exception-safe but costs O(n) per batch, too slow for millions of accounts.</p>`,
      code: R`
        #include <map>
        #include <string>
        #include <vector>
        #include <stdexcept>
        struct Op { std::string account; long delta; };
        void applyInPlace(std::map<std::string, long>& b, const std::vector<Op>& ops) {
            for (const auto& op : ops) {
                long& bal = b.at(op.account);                        // throws for unknown account
                if (bal + op.delta < 0) throw std::runtime_error("insufficient funds");
                bal += op.delta;                                     // earlier ops are NOT undone on failure
            }
        }
        int main() { std::map<std::string, long> b{{"a", 1}}; try { applyInPlace(b, {{"a", -5}}); } catch (...) {} }` },
    mcq: { q: 'Why must the undo log be replayed in <b>reverse</b> order?', options: ['Later ops may depend on the state produced by earlier ones; undoing newest-first restores each intermediate state exactly', 'For speed', 'Because std::map iterates backwards', 'Order does not matter for deltas'], answer: 0, explain: 'For pure additive deltas order happens not to matter, but for general undo actions (e.g. "set to X") only reverse replay is correct — the same reason destructors run in reverse.' },
    hints: [`<p>Keep a <code>std::vector&lt;std::pair&lt;long*, long&gt;&gt;</code> of (where, old value) for each successful change. <code>std::map</code> element addresses are stable.</p>`, `<p>Create a <code>ScopeFail</code> (based on <code>std::uncaught_exceptions()</code>) that walks the log backwards restoring old values.</p>`, `<p>Validate before mutating each op (unknown account → <code>at()</code> throws; negative → throw). Reserve the log up front so <code>push_back</code> can't throw <i>after</i> a mutation — or push the log entry <b>before</b> mutating.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"insufficient funds in bob -> 100 50\n70 80\nout_of_range 70 80\n0 80\n0 80\nrolled back 0 80\n0 0\nrolled back 1000000\napplied 1004995"}]},
    solution: {
      approach: `<p>Mutate in place but record an undo entry before each mutation; a <code>ScopeFail</code> guard replays the log in reverse only if the function exits via an exception. On success the guard does nothing. Cost is O(k log n) time and O(k) extra memory — no map copy.</p>`,
      code: R`
        #include <exception>
        #include <iostream>
        #include <map>
        #include <stdexcept>
        #include <string>
        #include <utility>
        #include <vector>

        template <typename F>
        class ScopeFail {
            F fn_;
            int count_ = std::uncaught_exceptions();
        public:
            explicit ScopeFail(F f) : fn_(std::move(f)) {}
            ScopeFail(const ScopeFail&) = delete;
            ~ScopeFail() { if (std::uncaught_exceptions() > count_) fn_(); }
        };

        struct Op { std::string account; long delta; };

        void applyBatch(std::map<std::string, long>& balances, const std::vector<Op>& ops) {
            std::vector<std::pair<long*, long>> undo;
            undo.reserve(ops.size());                                  // no allocation after mutations start
            ScopeFail rollback([&]() noexcept {
                for (auto it = undo.rbegin(); it != undo.rend(); ++it) *it->first = it->second;   // newest first
            });
            for (const auto& op : ops) {
                long& bal = balances.at(op.account);                   // throws std::out_of_range if unknown
                if (bal + op.delta < 0) throw std::runtime_error("insufficient funds in " + op.account);
                undo.emplace_back(&bal, bal);                          // record BEFORE mutating
                bal += op.delta;
            }
        }

        int main() {
            std::map<std::string, long> b{{"alice", 100}, {"bob", 50}};
            try { applyBatch(b, {{"alice", -30}, {"bob", 30}, {"bob", -200}}); }
            catch (const std::exception& e) { std::cout << e.what() << " -> "; }
            std::cout << b["alice"] << " " << b["bob"] << "\n";        // insufficient funds in bob -> 100 50
            applyBatch(b, {{"alice", -30}, {"bob", 30}});
            std::cout << b["alice"] << " " << b["bob"] << "\n";        // 70 80
            try { applyBatch(b, {{"alice", -10}, {"zed", 5}}); }
            catch (const std::out_of_range&) { std::cout << "out_of_range "; }
            std::cout << b["alice"] << " " << b["bob"] << "\n";        // out_of_range 70 80
            applyBatch(b, {{"alice", -70}});                           // exactly zero is allowed
            std::cout << b["alice"] << " " << b["bob"] << "\n";        // 0 80
            applyBatch(b, {});                                         // empty batch
            std::cout << b["alice"] << " " << b["bob"] << "\n";        // 0 80
            try { applyBatch(b, {{"bob", -50}, {"bob", -40}}); }       // same account twice
            catch (const std::runtime_error&) { std::cout << "rolled back "; }
            std::cout << b["alice"] << " " << b["bob"] << "\n";        // rolled back 0 80
            applyBatch(b, {{"bob", -30}, {"bob", -50}});
            std::cout << b["alice"] << " " << b["bob"] << "\n";        // 0 0
            std::map<std::string, long> many;
            for (int i = 0; i < 100000; ++i) many["a" + std::to_string(i)] = 10;
            std::vector<Op> ops;
            for (int i = 0; i < 999; ++i) ops.push_back({"a" + std::to_string(i), 5});
            ops.push_back({"a999", -100});
            auto total = [&] { long s = 0; for (auto& [k, v] : many) s += v; return s; };
            try { applyBatch(many, ops); } catch (const std::runtime_error&) { std::cout << "rolled back " << total() << "\n"; }   // rolled back 1000000
            ops.pop_back();
            applyBatch(many, ops);
            std::cout << "applied " << total() << "\n";                  // applied 1004995
        }`,
      complexity: `<p>O(k log n) time, O(k) extra space for k operations on n accounts.</p>`,
      followUps: ['Make it thread-safe with one mutex per account without deadlock (lock in a global order, or <code>std::scoped_lock</code>).', 'How does a database implement the same idea? (Undo log / WAL + transaction rollback.)']
    }
  });

  practice.push({
    title: 'Lazy Tokenizer Coroutine (split by delimiter)', level: 'Medium', tags: ['coroutines', 'generator', 'lifetimes'], companies: ['Google', 'Databricks'],
    statement: `<p>Write a generic <code>Generator&lt;T&gt;</code> (range-for compatible) and a coroutine <code>split(std::string text, char delim)</code> that lazily yields tokens (skipping empty ones). The caller may stop early; no token beyond what was consumed should be computed.</p>`,
    constraints: `<p>C++20. Parameters of the coroutine must be safe if the caller passes a temporary. O(1) extra memory besides the current token.</p>`,
    example: `<pre>for (auto&amp; t : split("a,,bb,ccc,", ',')) cout &lt;&lt; '[' &lt;&lt; t &lt;&lt; ']';   → ${H.c('g', '[a][bb][ccc]')}</pre>`,
    brute: { why: `<p>An eager <code>std::vector&lt;std::string&gt;</code> split builds every token before the caller sees the first one: O(total) memory and wasted work when the caller only wants the first token of a 1 GB log line.</p>`,
      code: R`
        #include <string>
        #include <vector>
        std::vector<std::string> splitEager(const std::string& s, char d) {
            std::vector<std::string> out; std::string cur;
            for (char c : s) { if (c == d) { if (!cur.empty()) out.push_back(cur); cur.clear(); } else cur += c; }
            if (!cur.empty()) out.push_back(cur);
            return out;                                  // all tokens materialized up front
        }
        int main() { return splitEager("a,b", ',').size() == 2 ? 0 : 1; }` },
    mcq: { q: 'Why is the parameter <code>std::string text</code> taken <b>by value</b> rather than <code>const std::string&amp;</code>?', options: ['The coroutine body runs later; a reference to a caller temporary would dangle — by value copies/moves it into the frame', 'By value is always faster', 'Coroutines cannot take references', 'To allow modification of the caller\'s string'], answer: 0, explain: 'Parameters are stored in the coroutine frame; only a by-value parameter keeps the data alive across suspensions.' },
    hints: [`<p>Generalize the int generator: <code>template &lt;class T&gt;</code>, store <code>std::optional&lt;T&gt; current</code> in the promise (T may not be default-constructible).</p>`, `<p>Iterator <code>operator*</code> returns <code>const T&amp;</code> to <code>*promise().current</code>; <code>operator==(std::default_sentinel_t)</code> checks <code>done()</code>.</p>`, `<p>In <code>split</code>, scan with two indices; on a delimiter, if the token is non-empty <code>co_yield text.substr(start, i - start)</code>; after the loop yield the tail if non-empty.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"[a][bb][ccc]\n1000\n<[a][bb][ccc]>\n<>\n<>\n<[abc]>\n<[a][b]>\n<[a]>\n<[the][quick][brown]>\n100000 100000"}]},
    solution: {
      approach: `<p>A reusable <code>Generator&lt;T&gt;</code> plus a coroutine that keeps the text (by value) and scan position in its frame. Each <code>++</code> resumes the scan until the next non-empty token. Breaking out of the loop destroys the frame via the generator's destructor.</p>`,
      code: R`
        #include <coroutine>
        #include <exception>
        #include <iostream>
        #include <iterator>
        #include <optional>
        #include <string>
        #include <utility>

        template <typename T>
        class Generator {
        public:
            struct promise_type {
                std::optional<T> current;
                Generator get_return_object() { return Generator{std::coroutine_handle<promise_type>::from_promise(*this)}; }
                std::suspend_always initial_suspend() noexcept { return {}; }
                std::suspend_always final_suspend() noexcept { return {}; }
                std::suspend_always yield_value(T v) { current = std::move(v); return {}; }
                void return_void() noexcept {}
                void unhandled_exception() { throw; }
            };
            using handle = std::coroutine_handle<promise_type>;
            struct iterator {
                handle h;
                const T& operator*() const { return *h.promise().current; }
                iterator& operator++() { h.resume(); return *this; }
                bool operator==(std::default_sentinel_t) const { return !h || h.done(); }
            };
            explicit Generator(handle h) : h_(h) {}
            Generator(Generator&& o) noexcept : h_(std::exchange(o.h_, {})) {}
            Generator(const Generator&) = delete;
            ~Generator() { if (h_) h_.destroy(); }
            iterator begin() { h_.resume(); return iterator{h_}; }
            std::default_sentinel_t end() { return {}; }
        private:
            handle h_;
        };

        Generator<std::string> split(std::string text, char delim) {      // by value: lives in the frame
            std::size_t start = 0;
            for (std::size_t i = 0; i <= text.size(); ++i) {
                if (i == text.size() || text[i] == delim) {
                    if (i > start) co_yield text.substr(start, i - start);
                    start = i + 1;
                }
            }
        }

        void show(Generator<std::string> g) {
            std::cout << '<';
            for (const auto& t : g) std::cout << '[' << t << ']';
            std::cout << ">\n";
        }

        int main() {
            for (const auto& t : split("a,,bb,ccc,", ',')) std::cout << '[' << t << ']';   // [a][bb][ccc]
            std::cout << "\n";
            for (const auto& t : split(std::string(1000, 'x') + ",tail", ',')) { std::cout << t.size() << "\n"; break; }   // 1000
            show(split("a,,bb,ccc,", ','));        // <[a][bb][ccc]>
            show(split("", ','));                  // <>
            show(split(",,,", ','));               // <>
            show(split("abc", ','));               // <[abc]>
            show(split("a,b", ','));               // <[a][b]>
            show(split(",a", ','));                // <[a]>
            show(split("the quick  brown", ' '));  // <[the][quick][brown]>
            std::string text;
            for (int i = 0; i < 100000; ++i) text += "x,";
            std::size_t count = 0, chars = 0;
            for (const auto& t : split(text, ',')) { ++count; chars += t.size(); }
            std::cout << count << " " << chars << "\n";   // 100000 100000
        }`,
      complexity: `<p>O(total length) over the whole iteration, O(1) work per character; memory = one frame + current token.</p>`,
      followUps: ['Yield <code>std::string_view</code> into the frame-owned text instead of copying — when is that safe for the caller?', 'Add a <code>take(n)</code> adapter coroutine.']
    }
  });

  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'Small-Buffer-Optimized Callable (InplaceFunction)', level: 'Hard', tags: ['type erasure', 'SBO', 'placement new', 'manual vtable'], companies: ['Jane Street', 'Citadel', 'HRT', 'Epic Games'],
    statement: `<p>Implement <code>SboFunction&lt;R(Args...), N&gt;</code>: a copyable, movable type-erased callable that stores callables of size ≤ N (and nothrow-movable) <b>inside</b> the object, and falls back to the heap for larger ones. Use a <b>manual vtable</b> (a static struct of function pointers per stored type) instead of virtual functions. Provide <code>isInline()</code> for testing.</p>`,
    constraints: `<p>C++20. Correct alignment; no leaks; move constructor <code>noexcept</code>; empty call throws <code>std::bad_function_call</code>.</p>`,
    example: `<pre>SboFunction&lt;int(int), 32&gt; f = [k = 1](int x) { return x + k; };      f.isInline() → ${H.c('g', 'true')}
std::array&lt;int, 64&gt; big{}; big[0] = 5;
SboFunction&lt;int(int), 32&gt; g = [big](int x) { return x + big[0]; };  g.isInline() → ${H.c('y', 'false (heap)')}
f(1) → 2,  g(1) → 6</pre>`,
    brute: { why: `<p>The plain Concept/Model approach (like the mini std::function) always heap-allocates, even for a lambda capturing one int. In a hot event loop creating millions of small callbacks, <code>malloc</code>/<code>free</code> dominate the run time.</p>`,
      code: R`
        #include <memory>
        #include <iostream>
        struct Concept { virtual ~Concept() = default; virtual int call(int) = 0; };
        template <typename F> struct Model : Concept { F f; explicit Model(F x) : f(std::move(x)) {} int call(int a) override { return f(a); } };
        int main() {
            long total = 0;
            auto inc = [](int x) { return x + 1; };                       // 1-byte lambda...
            for (int i = 0; i < 1000; ++i) {
                std::unique_ptr<Concept> p = std::make_unique<Model<decltype(inc)>>(inc);   // ...still a heap alloc every time
                total += p->call(i);
            }
            std::cout << total << "\n";
        }` },
    mcq: { q: 'Why do we only store a callable inline if it is <b>nothrow move-constructible</b>?', options: ['Moving the SboFunction must move the inline callable; for that move to be noexcept the callable\'s move must be noexcept', 'Inline storage cannot hold copyable types', 'Placement new requires noexcept', 'It saves memory'], answer: 0, explain: 'A heap-stored callable moves by stealing a pointer (never throws). An inline one must be move-constructed into the new buffer, so its move must be noexcept to keep the wrapper\'s move noexcept.' },
    hints: [`<p>Storage: <code>alignas(std::max_align_t) std::byte buf_[N];</code> holds either the callable itself or a pointer to a heap copy. A <code>const VTable* vt_</code> says which type is inside (nullptr = empty).</p>`, `<p>VTable fields: <code>call(void*, Args&amp;&amp;...)</code>, <code>destroy(void*)</code>, <code>move(void* dst, void* src)</code>, <code>copy(void* dst, const void* src)</code>, <code>bool inlined</code>. Build one <code>static constexpr VTable</code> per F with capture-less lambdas.</p>`, `<p>Helper <code>get&lt;F&gt;(void* p)</code>: inline → <code>std::launder(reinterpret_cast&lt;F*&gt;(p))</code>; heap → <code>*std::launder(reinterpret_cast&lt;F**&gt;(p))</code>. Heap move = copy the pointer; heap destroy = <code>delete</code>.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"10 2 6 0\n110110\n42 4\n2 0\n2 0\n3 3 3 3\n0 empty\n8 0"}]},
    solution: {
      approach: `<p>Type erasure where the "Concept" is a hand-built table of function pointers selected at construction. The decision inline-vs-heap is a compile-time property of F (<code>if constexpr</code>), so each table is specialized and branch-free. The wrapper's own special members just forward to the table.</p>`,
      code: R`
        #include <array>
        #include <cstddef>
        #include <functional>
        #include <iostream>
        #include <new>
        #include <type_traits>
        #include <utility>

        template <typename Sig, std::size_t N = 32> class SboFunction;

        template <typename R, typename... Args, std::size_t N>
        class SboFunction<R(Args...), N> {
            static_assert(N >= sizeof(void*), "buffer must at least hold a pointer");
            struct VTable {
                R (*call)(void*, Args&&...);
                void (*destroy)(void*) noexcept;
                void (*move)(void* dst, void* src) noexcept;        // move-construct into dst, leave src destroyed
                void (*copy)(void* dst, const void* src);
                bool inlined;
            };
            template <typename F>
            static constexpr bool fits = sizeof(F) <= N && alignof(F) <= alignof(std::max_align_t) && std::is_nothrow_move_constructible_v<F>;
            template <typename F>
            static F* get(void* p) noexcept {
                if constexpr (fits<F>) return std::launder(reinterpret_cast<F*>(p));
                else return *std::launder(reinterpret_cast<F**>(p));
            }
            template <typename F>
            static constexpr VTable table{
                [](void* p, Args&&... a) -> R { return std::invoke(*get<F>(p), std::forward<Args>(a)...); },
                [](void* p) noexcept { if constexpr (fits<F>) get<F>(p)->~F(); else delete get<F>(p); },
                [](void* dst, void* src) noexcept {
                    if constexpr (fits<F>) { ::new (dst) F(std::move(*get<F>(src))); get<F>(src)->~F(); }
                    else ::new (dst) F*(get<F>(src));                // just hand over the pointer
                },
                [](void* dst, const void* src) {
                    const F& f = *get<F>(const_cast<void*>(src));
                    if constexpr (fits<F>) ::new (dst) F(f);
                    else ::new (dst) F*(new F(f));
                },
                fits<F>
            };

            alignas(std::max_align_t) std::byte buf_[N];
            const VTable* vt_ = nullptr;

        public:
            SboFunction() noexcept = default;
            template <typename F>
                requires (!std::is_same_v<std::decay_t<F>, SboFunction> && std::is_invocable_r_v<R, std::decay_t<F>&, Args...>)
            SboFunction(F&& f) {
                using D = std::decay_t<F>;
                if constexpr (fits<D>) ::new (static_cast<void*>(buf_)) D(std::forward<F>(f));
                else ::new (static_cast<void*>(buf_)) D*(new D(std::forward<F>(f)));
                vt_ = &table<D>;
            }
            SboFunction(const SboFunction& o) { if (o.vt_) { o.vt_->copy(buf_, o.buf_); vt_ = o.vt_; } }
            SboFunction(SboFunction&& o) noexcept { if (o.vt_) { o.vt_->move(buf_, o.buf_); vt_ = std::exchange(o.vt_, nullptr); } }
            SboFunction& operator=(SboFunction o) noexcept {          // copy/move made by the caller
                reset();
                if (o.vt_) { o.vt_->move(buf_, o.buf_); vt_ = std::exchange(o.vt_, nullptr); }
                return *this;
            }
            ~SboFunction() { reset(); }
            void reset() noexcept { if (vt_) { vt_->destroy(buf_); vt_ = nullptr; } }
            bool isInline() const noexcept { return vt_ && vt_->inlined; }
            explicit operator bool() const noexcept { return vt_ != nullptr; }
            R operator()(Args... a) {
                if (!vt_) throw std::bad_function_call();
                return vt_->call(buf_, std::forward<Args>(a)...);
            }
        };

        int twice(int x) { return 2 * x; }
        struct ThrowingMove {
            int n;
            ThrowingMove(int v) : n(v) {}
            ThrowingMove(const ThrowingMove&) = default;
            ThrowingMove(ThrowingMove&& o) noexcept(false) : n(o.n) {}
            int operator()(int x) const { return x + n; }
        };
        struct Probe {
            static inline int live = 0;
            int pad = 0;
            Probe() { ++live; }
            Probe(const Probe&) { ++live; }
            Probe(Probe&&) noexcept { ++live; }
            ~Probe() { --live; }
            int operator()(int x) const { return x; }
        };
        struct BigProbe : Probe { char more[100] = {}; };

        int main() {
            SboFunction<int(int), 32> f = [k = 1](int x) { return x + k; };
            std::array<int, 64> big{}; big[0] = 5;
            SboFunction<int(int), 32> g = [big](int x) { return x + big[0]; };
            SboFunction<int(int), 32> h = g;                    // deep copy of the heap callable
            SboFunction<int(int), 32> m = std::move(f);         // inline move
            std::cout << m.isInline() << g.isInline() << " " << m(1) << " " << h(1) << " " << static_cast<bool>(f) << "\n";   // 10 2 6 0

            std::array<int, 4> a4{}; std::array<int, 8> a8{}; std::array<int, 9> a9{};
            SboFunction<int(int), 32> s16 = [a4](int x) { return x + a4[0]; };       // 16 bytes
            SboFunction<int(int), 32> s32 = [a8](int x) { return x + a8[0]; };       // exactly 32 bytes
            SboFunction<int(int), 32> s36 = [a9](int x) { return x + a9[0]; };       // 36 bytes: heap
            SboFunction<int(int), 32> fp = twice;
            SboFunction<int(int), 32> st = [](int x) { return x; };
            SboFunction<int(int), 32> tm = ThrowingMove{3};                          // may throw when moved: heap
            std::cout << s16.isInline() << s32.isInline() << s36.isInline() << fp.isInline() << st.isInline() << tm.isInline() << "\n";   // 110110
            std::cout << fp(21) << " " << tm(1) << "\n";                             // 42 4

            {
                SboFunction<int(int), 32> pa = Probe{};
                SboFunction<int(int), 32> pb = pa;
                std::cout << Probe::live << " ";                                      // 2
                SboFunction<int(int), 32> pc = std::move(pa);
                pc = pb;
            }
            std::cout << Probe::live << "\n";                                         // 0
            {
                SboFunction<int(int), 32> pa = BigProbe{};
                SboFunction<int(int), 32> pb = pa;
                std::cout << Probe::live << " ";                                      // 2
                SboFunction<int(int), 32> pc = std::move(pa);
                pc = pb;
            }
            std::cout << Probe::live << "\n";                                         // 0

            SboFunction<int(), 32> c1 = [n = 0]() mutable { return ++n; };
            c1(); c1();
            SboFunction<int(), 32> c2 = c1;
            std::cout << c2() << " " << c1() << " ";                                  // 3 3
            SboFunction<int(), 32> h1 = [n = 0, pad = std::array<int, 20>{}]() mutable { return ++n + pad[0]; };
            h1(); h1();
            SboFunction<int(), 32> h2 = h1;
            std::cout << h2() << " " << h1() << "\n";                                 // 3 3

            SboFunction<int(int), 32> e;
            std::cout << static_cast<bool>(e);
            try { e(1); } catch (const std::bad_function_call&) { std::cout << " empty\n"; }   // 0 empty
            e = [](int x) { return x * 2; };
            std::cout << e(4);
            e = SboFunction<int(int), 32>{};
            std::cout << " " << static_cast<bool>(e) << "\n";                          // 8 0
        }`,
      complexity: `<p>Small callables: zero allocations, one indirect call. Large callables: one allocation (like std::function). Moves: O(1); copies: one callable copy.</p>`,
      followUps: ['Why is <code>std::launder</code> used when reading back from the byte buffer?', 'Make a non-owning <code>FunctionRef</code> (like C++26 <code>std::function_ref</code>): just a <code>void*</code> + one function pointer.', 'Add a <code>static_assert</code> mode ("inplace only", like <code>stdext::inplace_function</code>) that refuses heap fallback.']
    }
  });

  practice.push({
    title: 'Implement a Mini std::any with any_cast', level: 'Hard', tags: ['type erasure', 'RTTI-free type id', 'templates'], companies: ['Google', 'Bloomberg', 'Nvidia'],
    statement: `<p>Implement <code>Any</code>: holds a value of any copyable type, supports copy/move/reset/<code>has_value()</code>, and <code>anyCast&lt;T&gt;</code> in two forms: pointer form returns <code>nullptr</code> on type mismatch, reference/value form throws <code>BadAnyCast</code>. Do it <b>without RTTI</b> (<code>typeid</code>): build your own per-type id.</p>`,
    constraints: `<p>C++20, compile with <code>-fno-rtti</code> in mind. <code>anyCast&lt;const int&gt;</code> should behave like <code>anyCast&lt;int&gt;</code> (strip cv-ref).</p>`,
    example: `<pre>Any a = 42;  *anyCast&lt;int&gt;(&amp;a) → ${H.c('g', '42')}   anyCast&lt;double&gt;(&amp;a) → ${H.c('r', 'nullptr')}
a = std::string("hi");  anyCast&lt;std::string&gt;(a) → ${H.c('g', '"hi"')}   anyCast&lt;int&gt;(a) → ${H.c('r', 'throws BadAnyCast')}</pre>`,
    brute: { why: `<p>A <code>void*</code> plus a hand-maintained enum tag works only for a closed list of types, needs a switch everywhere, and leaks or crashes if the wrong type is cast. A <code>std::variant</code> also needs the type list up front.</p>`,
      code: R`
        #include <string>
        enum class Tag { Int, Str };
        struct VoidAny { Tag tag; void* p; };                   // who frees p? how to copy? which types?
        int main() {
            VoidAny a{Tag::Int, new int(42)};
            int v = *static_cast<int*>(a.p);
            delete static_cast<int*>(a.p);
            return v == 42 ? 0 : 1;
        }` },
    mcq: { q: 'How can you get a unique id per type without <code>typeid</code>?', options: ['Take the address of a static variable inside a class/variable template instantiated per type', 'Use sizeof(T)', 'Hash the type name string', 'Use the vptr of T'], answer: 0, explain: 'Each template instantiation has its own static object, so <code>&amp;TypeId&lt;T&gt;::tag</code> is unique per T within a program (watch out across shared libraries).' },
    hints: [`<p><code>template &lt;class T&gt; struct TypeId { static constexpr char tag = 0; };</code> → <code>const void* id = &amp;TypeId&lt;T&gt;::tag;</code></p>`, `<p>Concept with <code>clone()</code> and <code>type()</code>; <code>Model&lt;T&gt;</code> stores the value. <code>anyCast&lt;T&gt;(Any* a)</code>: compare <code>a-&gt;self_-&gt;type()</code> with the id of <code>std::remove_cvref_t&lt;T&gt;</code>, then <code>static_cast</code> to <code>Model&lt;U&gt;*</code>.</p>`, `<p>Make <code>anyCast</code> a friend so it can see the private Model. The throwing form calls the pointer form and throws if null.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"42 1 hi 42 BadAnyCast\n01\n10\n15 0\n11\n3 4\n10\n1\n49995000"}]},
    solution: {
      approach: `<p>Type erasure (Concept/Model) plus a hand-made type id from template static addresses. The pointer cast checks the id and downcasts with <code>static_cast</code> (safe because the id proves the dynamic type) — no RTTI needed.</p>`,
      code: R`
        #include <vector>
        #include <exception>
        #include <iostream>
        #include <memory>
        #include <string>
        #include <type_traits>
        #include <utility>

        template <typename T> struct TypeId { static constexpr char tag = 0; };
        template <typename T> constexpr const void* typeIdOf() { return &TypeId<T>::tag; }

        struct BadAnyCast : std::exception { const char* what() const noexcept override { return "BadAnyCast"; } };

        class Any {
            struct Concept {
                virtual ~Concept() = default;
                virtual std::unique_ptr<Concept> clone() const = 0;
                virtual const void* type() const noexcept = 0;
            };
            template <typename T>
            struct Model final : Concept {
                T value;
                template <typename U> explicit Model(U&& u) : value(std::forward<U>(u)) {}
                std::unique_ptr<Concept> clone() const override { return std::make_unique<Model>(value); }
                const void* type() const noexcept override { return typeIdOf<T>(); }
            };
            std::unique_ptr<Concept> self_;
            template <typename T> friend T* anyCast(Any* a) noexcept;
        public:
            Any() noexcept = default;
            template <typename T> requires (!std::is_same_v<std::decay_t<T>, Any> && std::is_copy_constructible_v<std::decay_t<T>>)
            Any(T&& v) : self_(std::make_unique<Model<std::decay_t<T>>>(std::forward<T>(v))) {}
            Any(const Any& o) : self_(o.self_ ? o.self_->clone() : nullptr) {}
            Any(Any&&) noexcept = default;
            Any& operator=(Any o) noexcept { self_.swap(o.self_); return *this; }
            bool has_value() const noexcept { return self_ != nullptr; }
            void reset() noexcept { self_.reset(); }
        };

        template <typename T>
        T* anyCast(Any* a) noexcept {
            using U = std::remove_cvref_t<T>;
            if (!a || !a->self_ || a->self_->type() != typeIdOf<U>()) return nullptr;
            return &static_cast<Any::Model<U>*>(a->self_.get())->value;   // safe: id proved the type
        }
        template <typename T>
        std::remove_cvref_t<T> anyCast(Any& a) {
            if (auto* p = anyCast<T>(&a)) return *p;
            throw BadAnyCast{};
        }

        int main() {
            Any a = 42;
            std::cout << *anyCast<int>(&a) << " " << (anyCast<double>(&a) == nullptr) << " ";      // 42 1
            Any b = a;                                    // deep copy
            a = std::string("hi");
            std::cout << anyCast<std::string>(a) << " " << *anyCast<const int>(&b) << " ";        // hi 42
            try { (void)anyCast<int>(a); } catch (const BadAnyCast& e) { std::cout << e.what(); } // BadAnyCast
            std::cout << "\n";
            Any e;
            std::cout << e.has_value() << (anyCast<int>(&e) == nullptr) << "\n";                   // 01
            e = 5;
            std::cout << e.has_value();
            e.reset();
            std::cout << e.has_value() << "\n";                                                    // 10
            Any m = 10;
            *anyCast<int>(&m) += 5;                       // in-place change through the pointer form
            Any m2 = m;
            *anyCast<int>(&m2) = 0;
            std::cout << anyCast<int>(m) << " " << anyCast<int>(m2) << "\n";                       // 15 0
            Any l = 3L;
            std::cout << (anyCast<int>(&l) == nullptr) << (anyCast<long>(&l) != nullptr) << "\n";  // 11
            Any v = std::vector<int>{1, 2, 3};
            Any vc = v;
            anyCast<std::vector<int>>(&vc)->push_back(4);
            std::cout << anyCast<std::vector<int>>(&v)->size() << " " << anyCast<std::vector<int>>(&vc)->size() << "\n";   // 3 4
            Any moved = std::move(v);
            std::cout << moved.has_value() << v.has_value() << "\n";                               // 10
            std::cout << (anyCast<int>(static_cast<Any*>(nullptr)) == nullptr) << "\n";            // 1
            std::vector<Any> many;
            for (int i = 0; i < 10000; ++i) many.push_back(i);
            long long sum = 0;
            for (auto& x : many) sum += anyCast<int>(x);
            std::cout << sum << "\n";                                                              // 49995000
        }`,
      complexity: `<p>Construction/copy: one allocation; cast: one virtual call + pointer compare, O(1).</p>`,
      followUps: ['Add SBO for small trivially-copyable types (std::any implementations store ints inline).', 'Why can the template-static-address id differ across shared libraries, and how do real implementations cope?', 'Add <code>emplace&lt;T&gt;(args...)</code> and <code>in_place_type</code> construction.']
    }
  });

  practice.push({
    title: 'Expression Templates with CRTP: Fused Vector Arithmetic', level: 'Hard', tags: ['crtp', 'expression templates', 'performance'], companies: ['Jane Street', 'Two Sigma', 'Nvidia', 'MathWorks'],
    statement: `<p>With a naive <code>Vec operator+(const Vec&amp;, const Vec&amp;)</code>, <code>Vec r = a + b + c + d;</code> allocates 3 temporaries and loops 3 times. Use CRTP <b>expression templates</b> so the expression builds a lightweight tree of types, and the whole sum is computed in <b>one loop with one allocation</b> when assigned to a <code>Vec</code>. Support <code>+</code>, <code>-</code> and scalar <code>*</code>.</p>`,
    constraints: `<p>C++20. Expression nodes must be safe for the classic <code>r = a + b + c</code> usage; count allocations to prove the improvement.</p>`,
    example: `<pre>Vec a{1,2,3}, b{10,20,30}, c{100,200,300};
Vec r = a + b * 2.0 - c;   → ${H.c('g', '[-79, -158, -237]')}
allocations: naive ${H.c('r', '3 (b*2, +, -)')} → expression templates ${H.c('g', '1')}</pre>`,
    brute: { why: `<p>Each operator returns a full <code>Vec</code>: <code>b*2</code> allocates and loops, <code>a + tmp1</code> allocates and loops, <code>tmp2 - c</code> allocates and loops. Memory traffic triples and nothing fuses — exactly what Eigen/Blaze avoid.</p>`,
      code: R`
        #include <vector>
        #include <cstddef>
        struct NVec {
            std::vector<double> d;
            static inline int allocs = 0;
            explicit NVec(std::size_t n) : d(n) { ++allocs; }
        };
        NVec operator+(const NVec& a, const NVec& b) { NVec r(a.d.size()); for (std::size_t i = 0; i < r.d.size(); ++i) r.d[i] = a.d[i] + b.d[i]; return r; }
        NVec operator-(const NVec& a, const NVec& b) { NVec r(a.d.size()); for (std::size_t i = 0; i < r.d.size(); ++i) r.d[i] = a.d[i] - b.d[i]; return r; }
        NVec operator*(const NVec& a, double k) { NVec r(a.d.size()); for (std::size_t i = 0; i < r.d.size(); ++i) r.d[i] = a.d[i] * k; return r; }
        int main() { NVec a(3), b(3), c(3); NVec::allocs = 0; NVec r = a + b * 2.0 - c; return NVec::allocs == 3 ? 0 : 1; }` },
    mcq: { q: 'Why do expression nodes store <b>leaf Vecs by reference</b> but <b>sub-expressions by value</b>?', options: ['Vecs are long-lived and expensive to copy; sub-expression nodes are tiny temporaries that would dangle if held by reference after the full expression', 'References are always faster', 'Sub-expressions cannot be referenced', 'To make the nodes polymorphic'], answer: 0, explain: 'Temporaries die at the end of the full expression. Holding the cheap node by value keeps the tree valid even if it is stored (e.g. in <code>auto e = a + b + c;</code>), while copying a whole Vec would defeat the purpose.' },
    hints: [`<p>CRTP base: <code>template &lt;class E&gt; struct Expr { double operator[](size_t i) const { return self()[i]; } size_t size() const; const E&amp; self() const; };</code></p>`, `<p>Nodes: <code>template &lt;class L, class R, class Op&gt; struct BinExpr : Expr&lt;BinExpr&lt;L,R,Op&gt;&gt; { Store&lt;L&gt; l; Store&lt;R&gt; r; double operator[](size_t i) const { return Op{}(l[i], r[i]); } };</code> where <code>Store&lt;Vec&gt;</code> = <code>const Vec&amp;</code>, otherwise the node by value.</p>`, `<p><code>Vec</code> gets a templated constructor <code>template &lt;class E&gt; Vec(const Expr&lt;E&gt;&amp; e)</code> that allocates once and runs the single loop <code>d[i] = e[i]</code>.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"-79 -158 -237 | allocs = 1\n-9 -18 -27\n6 12 18\n10 20 30 | allocs = 1\n63 3\n12"}]},
    solution: {
      approach: `<p>Operators return expression <b>types</b> instead of values; nothing is computed until a <code>Vec</code> is constructed from the expression, at which point one loop evaluates <code>e[i]</code> — which the compiler inlines into <code>a[i] + b[i]*2.0 - c[i]</code>. CRTP gives a common static interface (<code>Expr&lt;E&gt;</code>) without virtual calls.</p>`,
      code: R`
        #include <cstddef>
        #include <functional>
        #include <initializer_list>
        #include <iostream>
        #include <type_traits>
        #include <vector>

        template <typename E>
        struct Expr {                                                   // CRTP base: the static interface
            const E& self() const { return static_cast<const E&>(*this); }
            double operator[](std::size_t i) const { return self()[i]; }
            std::size_t size() const { return self().size(); }
        };

        class Vec : public Expr<Vec> {
            std::vector<double> d_;
        public:
            static inline int allocs = 0;
            Vec(std::initializer_list<double> il) : d_(il) { ++allocs; }
            template <typename E>
            Vec(const Expr<E>& e) : d_(e.size()) {                      // ONE allocation, ONE fused loop
                ++allocs;
                for (std::size_t i = 0; i < d_.size(); ++i) d_[i] = e[i];
            }
            double operator[](std::size_t i) const { return d_[i]; }
            std::size_t size() const { return d_.size(); }
        };

        template <typename T> using Store = std::conditional_t<std::is_same_v<T, Vec>, const Vec&, T>;

        template <typename L, typename R, typename Op>
        struct BinExpr : Expr<BinExpr<L, R, Op>> {
            Store<L> l; Store<R> r;
            BinExpr(const L& a, const R& b) : l(a), r(b) {}
            double operator[](std::size_t i) const { return Op{}(l[i], r[i]); }
            std::size_t size() const { return l.size(); }
        };
        template <typename L>
        struct ScaleExpr : Expr<ScaleExpr<L>> {
            Store<L> l; double k;
            ScaleExpr(const L& a, double s) : l(a), k(s) {}
            double operator[](std::size_t i) const { return l[i] * k; }
            std::size_t size() const { return l.size(); }
        };

        template <typename L, typename R>
        BinExpr<L, R, std::plus<>> operator+(const Expr<L>& a, const Expr<R>& b) { return {a.self(), b.self()}; }
        template <typename L, typename R>
        BinExpr<L, R, std::minus<>> operator-(const Expr<L>& a, const Expr<R>& b) { return {a.self(), b.self()}; }
        template <typename L>
        ScaleExpr<L> operator*(const Expr<L>& a, double k) { return {a.self(), k}; }

        int main() {
            Vec a{1, 2, 3}, b{10, 20, 30}, c{100, 200, 300};
            Vec::allocs = 0;
            Vec r = a + b * 2.0 - c;                                    // type: BinExpr<BinExpr<Vec,ScaleExpr<Vec>,plus>,Vec,minus>
            std::cout << r[0] << " " << r[1] << " " << r[2] << " | allocs = " << Vec::allocs << "\n";   // -79 -158 -237 | allocs = 1
            Vec d = a - b;
            std::cout << d[0] << " " << d[1] << " " << d[2] << "\n";    // -9 -18 -27
            Vec e = (a + a) * 3.0;
            std::cout << e[0] << " " << e[1] << " " << e[2] << "\n";    // 6 12 18
            Vec::allocs = 0;
            Vec t = a + a + a + a + a + a + a + a + a + a;
            std::cout << t[0] << " " << t[1] << " " << t[2] << " | allocs = " << Vec::allocs << "\n";   // 10 20 30 | allocs = 1
            auto lazy = a + b * 2.0;                                    // nothing computed yet
            std::cout << lazy[2] << " " << lazy.size() << "\n";         // 63 3
            Vec f = (a * 2.0) * 3.0;
            std::cout << f[1] << "\n";                                  // 12
        }`,
      complexity: `<p>O(n) with a single pass and one allocation regardless of expression length; zero runtime dispatch (all nodes inlined).</p>`,
      followUps: ['What goes wrong with <code>auto e = a + b; a = ...; Vec r = e;</code>? (Lazy evaluation sees the new <code>a</code>; aliasing.)', 'How do Eigen\'s <code>.eval()</code> and <code>noalias()</code> relate to this?', 'Add SIMD-friendly evaluation or parallel evaluation in the Vec constructor.']
    }
  });

  practice.push({
    title: 'Copy-on-Write String (and why std::string abandoned it)', level: 'Hard', tags: ['copy-on-write', 'shared_ptr', 'copy-and-swap'], companies: ['Bloomberg', 'Meta', 'Oracle'],
    statement: `<p>Implement <code>CowString</code>: copies are O(1) and share one buffer; the first <b>write</b> to a shared instance makes a private copy ("detach"). Support <code>size()</code>, <code>at(i)</code> (read), <code>set(i, c)</code>, <code>append(s)</code>, <code>str()</code>, and <code>sharesWith(other)</code> for testing. Then explain why returning a non-const <code>char&amp;</code> from <code>operator[]</code> breaks COW.</p>`,
    constraints: `<p>Use <code>std::shared_ptr&lt;std::string&gt;</code>. Single-threaded correctness required; discuss multi-threaded issues.</p>`,
    example: `<pre>CowString a("hello"); CowString b = a;   a.sharesWith(b) → ${H.c('g', 'true')} (no copy yet)
b.set(0, 'j');                             → a = "hello", b = "jello", sharesWith → ${H.c('g', 'false')}</pre>`,
    brute: { why: `<p>An always-deep-copy string makes every copy O(n). If a program copies large strings often but rarely modifies them (config values, log fields), most of that work is wasted.</p>`,
      code: R`
        #include <string>
        #include <vector>
        int main() {
            std::string big(1'000'000, 'x');
            std::vector<std::string> copies(100, big);      // 100 MB copied though nobody writes
            return copies.size() == 100 ? 0 : 1;
        }` },
    mcq: { q: 'Why did C++11 effectively forbid copy-on-write <code>std::string</code>?', options: ['Non-const operator[]/iterators must not invalidate references, and COW detach on write would; plus atomic ref-counting cost under threads', 'COW uses too much memory', 'shared_ptr did not exist', 'Strings must be null-terminated'], answer: 0, explain: 'C++11 tightened invalidation rules (and made concurrent const access safe without hidden writes); a COW string must detach on non-const access, invalidating references, and pays atomic increments on every copy.' },
    hints: [`<p>Member: <code>std::shared_ptr&lt;std::string&gt; p_</code>. Copy constructor = copy the shared_ptr (O(1)).</p>`, `<p><code>detach()</code>: <code>if (p_.use_count() &gt; 1) p_ = std::make_shared&lt;std::string&gt;(*p_);</code> — call it at the start of every mutating function.</p>`, `<p>Avoid handing out <code>char&amp;</code>: if a caller holds a reference into a buffer that later becomes shared via a copy, writing through it changes both strings. Provide <code>set(i, c)</code> instead (or mark the buffer "unshareable" once a reference escapes).</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"1 hello jello 0 jello jello!\n111\n10\n1\nrange\n0\n100001 1000"}]},
    solution: {
      approach: `<p>Sharing via <code>shared_ptr</code>; every mutator detaches first so writes never affect other copies. Reads are free. The API deliberately has no mutable references, which is the hole that sank COW <code>std::string</code>. Assignment uses copy-and-swap (here: copy the pointer, swap).</p>`,
      code: R`
        #include <stdexcept>
        #include <cstddef>
        #include <iostream>
        #include <memory>
        #include <string>
        #include <utility>

        class CowString {
            std::shared_ptr<std::string> p_;
            void detach() { if (p_.use_count() > 1) p_ = std::make_shared<std::string>(*p_); }   // copy on first write
        public:
            CowString(const char* s = "") : p_(std::make_shared<std::string>(s)) {}
            CowString(const CowString&) = default;                     // O(1): shares the buffer
            CowString(CowString&&) noexcept = default;
            CowString& operator=(CowString o) noexcept { p_.swap(o.p_); return *this; }   // copy-and-swap
            std::size_t size() const { return p_->size(); }
            char at(std::size_t i) const { return p_->at(i); }        // read: no detach
            const std::string& str() const { return *p_; }
            void set(std::size_t i, char c) { detach(); p_->at(i) = c; }
            void append(const std::string& s) { detach(); *p_ += s; }
            bool sharesWith(const CowString& o) const { return p_ == o.p_; }
        };

        int main() {
            CowString a("hello");
            CowString b = a;
            std::cout << a.sharesWith(b) << " ";                       // 1
            b.set(0, 'j');
            std::cout << a.str() << " " << b.str() << " " << a.sharesWith(b) << " ";   // hello jello 0
            CowString c = b; c.append("!");
            std::cout << b.str() << " " << c.str() << "\n";            // jello jello!
            CowString x("abc"), y = x;
            char first = y.at(0);                                      // reading never detaches
            CowString s("abc");
            const std::string* before = &s.str();
            s.set(0, 'X');                                             // sole owner: no copy needed
            std::cout << x.sharesWith(y) << (before == &s.str()) << (first == 'a') << "\n";   // 111
            CowString p("q"), q = p, r = p;
            r.set(0, 'z');
            std::cout << p.sharesWith(q) << p.sharesWith(r) << "\n";   // 10
            CowString d = p;
            std::cout << d.sharesWith(p) << "\n";                      // 1
            try { d.set(5, 'x'); } catch (const std::out_of_range&) { std::cout << "range\n"; }   // range
            CowString e;
            std::cout << e.size() << "\n";                             // 0
            CowString big("x");
            for (int i = 0; i < 100000; ++i) big.append("y");
            std::vector<CowString> copies(1000, big);
            int shared = 0;
            for (auto& cp : copies) shared += cp.sharesWith(big);
            std::cout << big.size() << " " << shared << "\n";          // 100001 1000
        }`,
      complexity: `<p>Copy O(1) (one atomic increment); first write after sharing O(n); later writes O(1) amortized.</p>`,
      followUps: ['Why is <code>use_count()</code> unreliable as a "am I unique?" test with multiple threads?', 'How do Qt\'s implicitly shared classes (QString) handle non-const <code>operator[]</code>?', 'Compare COW with SSO (small string optimization) for typical string sizes.']
    }
  });

  practice.push({
    title: 'Composable Generator Pipeline: naturals | filter | map | take', level: 'Hard', tags: ['coroutines', 'generators', 'templates', 'lazy evaluation'], companies: ['Google', 'Microsoft', 'Bloomberg'],
    statement: `<p>Using a generic <code>Generator&lt;T&gt;</code>, write coroutine adapters <code>filter(gen, pred)</code>, <code>mapEach(gen, fn)</code> and <code>take(gen, n)</code> that consume another generator, plus an <b>infinite</b> <code>naturals()</code>. Compute the first 5 squares of even numbers lazily: <code>take(mapEach(filter(naturals(), isEven), square), 5)</code>.</p>`,
    constraints: `<p>No element beyond what is needed may be computed (prove it with a counter). Adapters must own their upstream generator (no dangling).</p>`,
    example: `<pre>take(mapEach(filter(naturals(), even), square), 5)  → ${H.c('g', '0 4 16 36 64')}
naturals produced: ${H.c('g', '9')} values (0..8), not infinitely many</pre>`,
    brute: { why: `<p>Eager pipelines (build a vector of naturals, then filter, then map, then truncate) cannot handle infinite sources and do all the work up front. You'd have to guess "generate the first 1000 numbers" and hope it is enough.</p>`,
      code: R`
        #include <vector>
        #include <iostream>
        int main() {
            std::vector<int> nat; for (int i = 0; i < 1000; ++i) nat.push_back(i);   // guess a bound
            std::vector<int> out;
            for (int x : nat) if (x % 2 == 0) out.push_back(x * x);                  // all 500 computed
            out.resize(5);
            for (int x : out) std::cout << x << " ";
        }` },
    mcq: { q: 'Why does <code>take</code> <code>co_return</code> immediately after yielding the n-th value instead of looping once more?', options: ['Looping again would resume upstream and compute one extra element that is never used', 'co_yield cannot be called n+1 times', 'It would throw', 'No difference'], answer: 0, explain: 'Incrementing the upstream iterator resumes the upstream coroutine. Stopping right after the n-th yield keeps the pipeline exactly as lazy as needed.' },
    hints: [`<p>Adapters take <code>Generator&lt;T&gt; g</code> <b>by value</b> (moved into the frame) and iterate it with a range-for, yielding transformed values.</p>`, `<p><code>mapEach</code>'s result type (named so it doesn't clash with <code>std::map</code>): <code>Generator&lt;std::invoke_result_t&lt;F&amp;, const T&amp;&gt;&gt;</code>.</p>`, `<p><code>take</code>: <code>if (n &lt;= 0) co_return; for (auto&amp;&amp; x : g) { co_yield x; if (--n == 0) co_return; }</code>. Count produced naturals with a global counter.</p>`],
    tests: {"io":true,"cases":[{"stdin":"","stdout":"0 4 16 36 64 | produced 9\n<0 1 2> p=3\n<> p=0\n<0 1 2>\n<0! 1! 4!>\n<0 3 6 9> p=10\n<0 1 4 9> p=4\n<>\n4999950000"}]},
    solution: {
      approach: `<p>Each adapter is a coroutine that owns its upstream generator and pulls from it on demand. The outermost loop drives everything: each <code>++</code> resumes <code>take</code>, which resumes <code>mapEach</code>, which resumes <code>filter</code>, which resumes <code>naturals</code> until a value flows back out — a pull-based lazy pipeline, like C++20 ranges views but built from coroutines.</p>`,
      code: R`
        #include <string>
        #include <coroutine>
        #include <exception>
        #include <iostream>
        #include <iterator>
        #include <optional>
        #include <type_traits>
        #include <utility>

        template <typename T>
        class Generator {
        public:
            struct promise_type {
                std::optional<T> current;
                Generator get_return_object() { return Generator{std::coroutine_handle<promise_type>::from_promise(*this)}; }
                std::suspend_always initial_suspend() noexcept { return {}; }
                std::suspend_always final_suspend() noexcept { return {}; }
                std::suspend_always yield_value(T v) { current = std::move(v); return {}; }
                void return_void() noexcept {}
                void unhandled_exception() { throw; }
            };
            using handle = std::coroutine_handle<promise_type>;
            struct iterator {
                handle h;
                const T& operator*() const { return *h.promise().current; }
                iterator& operator++() { h.resume(); return *this; }
                bool operator==(std::default_sentinel_t) const { return !h || h.done(); }
            };
            explicit Generator(handle h) : h_(h) {}
            Generator(Generator&& o) noexcept : h_(std::exchange(o.h_, {})) {}
            Generator(const Generator&) = delete;
            ~Generator() { if (h_) h_.destroy(); }
            iterator begin() { h_.resume(); return iterator{h_}; }
            std::default_sentinel_t end() { return {}; }
        private:
            handle h_;
        };

        int produced = 0;
        Generator<int> naturals() { for (int i = 0;; ++i) { ++produced; co_yield i; } }   // infinite

        template <typename T, typename P>
        Generator<T> filter(Generator<T> g, P pred) { for (const T& x : g) if (pred(x)) co_yield x; }

        template <typename T, typename F>
        Generator<std::invoke_result_t<F&, const T&>> mapEach(Generator<T> g, F fn) { for (const T& x : g) co_yield fn(x); }

        template <typename T>
        Generator<T> take(Generator<T> g, int n) {
            if (n <= 0) co_return;
            for (const T& x : g) { co_yield x; if (--n == 0) co_return; }   // stop before pulling one more
        }

        template <class T>
        void show(Generator<T> g) {
            std::cout << '<';
            bool first = true;
            for (const T& x : g) { std::cout << (first ? "" : " ") << x; first = false; }
            std::cout << '>';
        }

        Generator<int> upTo(int n) { for (int i = 0; i < n; ++i) co_yield i; }

        int main() {
            auto even = [](int x) { return x % 2 == 0; };
            auto square = [](int x) { return x * x; };
            for (int v : take(mapEach(filter(naturals(), even), square), 5)) std::cout << v << " ";
            std::cout << "| produced " << produced << "\n";              // 0 4 16 36 64 | produced 9
            produced = 0; show(take(naturals(), 3));  std::cout << " p=" << produced << "\n";   // <0 1 2> p=3
            produced = 0; show(take(naturals(), 0));  std::cout << " p=" << produced << "\n";   // <> p=0
            show(take(upTo(3), 10)); std::cout << "\n";                                          // <0 1 2>
            show(mapEach(upTo(3), [](int x) { return std::to_string(x * x) + "!"; })); std::cout << "\n";   // <0! 1! 4!>
            produced = 0;
            show(take(filter(naturals(), [](int x) { return x % 3 == 0; }), 4)); std::cout << " p=" << produced << "\n";   // <0 3 6 9> p=10
            produced = 0;
            show(mapEach(take(naturals(), 4), square)); std::cout << " p=" << produced << "\n";  // <0 1 4 9> p=4
            show(filter(upTo(5), [](int) { return false; })); std::cout << "\n";                 // <>
            long long sum = 0;
            for (int v : take(naturals(), 100000)) sum += v;
            std::cout << sum << "\n";                                                            // 4999950000
        }`,
      complexity: `<p>O(k) work for k consumed upstream elements; memory = one frame per stage (4 frames), independent of how many values flow.</p>`,
      followUps: ['Add a pipe syntax <code>naturals() | filter(even) | take(5)</code> with small adapter objects.', 'Compare with <code>std::views::iota(0) | std::views::filter(even) | std::views::transform(square) | std::views::take(5)</code> — which is faster and why?', 'What happens to the inner frames when the outer loop breaks early?']
    }
  });

  /* ======================================================================
     QUIZ — mostly "predict the output"
     ====================================================================== */
  quiz.push(
    { q: `What does this print?<pre>struct Base { Base() { hello(); } virtual void hello() { cout &lt;&lt; "Base "; } };
struct Derived : Base { Derived() { hello(); } void hello() override { cout &lt;&lt; "Derived "; } };
int main() { Derived d; }</pre>`, options: ['Base Derived', 'Derived Derived', 'Base Base', 'Undefined behavior'], answer: 0, explain: 'During Base\'s constructor the dynamic type is Base, so the virtual call stops at Base::hello. After Base is built, Derived\'s constructor body dispatches to Derived::hello.' },
    { q: `What does <code>r.f()</code> print?<pre>struct A { virtual void f(int x = 1) { cout &lt;&lt; "A" &lt;&lt; x; } };
struct B : A { void f(int x = 2) override { cout &lt;&lt; "B" &lt;&lt; x; } };
B b; A&amp; r = b; r.f();</pre>`, options: ['B1', 'B2', 'A1', 'A2'], answer: 0, explain: 'The default argument comes from the static type (A&amp; → 1); the function body from the dynamic type (B).' },
    { q: `Output?<pre>template &lt;class T&gt; struct Counter { static inline int n = 0; Counter() { ++n; } };
Counter&lt;int&gt; a, b; Counter&lt;double&gt; c;
cout &lt;&lt; Counter&lt;int&gt;::n &lt;&lt; Counter&lt;double&gt;::n;</pre>`, options: ['21', '33', '30', '12'], answer: 0, explain: 'Each instantiation is a distinct class with its own static member — the basis of the CRTP per-class counter.' },
    { q: `Output?<pre>auto p = make_shared&lt;int&gt;(5); auto q = p;
{ auto r = q; cout &lt;&lt; p.use_count(); }
cout &lt;&lt; p.use_count();
weak_ptr&lt;int&gt; w = p; cout &lt;&lt; p.use_count();</pre>`, options: ['322', '323', '321', '332'], answer: 0, explain: 'Three owners inside the block, two after r dies; a weak_ptr increments only the weak count.' },
    { q: `With GCC/libstdc++, what does this print?<pre>struct T { T() {} T(const T&amp;) { cout &lt;&lt; "C"; } T(T&amp;&amp;) { cout &lt;&lt; "M"; } };
vector&lt;T&gt; v; v.reserve(1); v.push_back(T()); v.push_back(T());</pre>`, options: ['MMC', 'MMM', 'MCM', 'CCC'], answer: 0, explain: 'The second push_back reallocates: the new element is moved in, then the old element is relocated by <b>copy</b> because the move constructor is not noexcept (move_if_noexcept).' },
    { q: `Output (no <code>virtual</code> inheritance)?<pre>struct A { A() { cout &lt;&lt; "A"; } };
struct B : A { B() { cout &lt;&lt; "B"; } };
struct C : A { C() { cout &lt;&lt; "C"; } };
struct D : B, C { D() { cout &lt;&lt; "D"; } };
D d;</pre>`, options: ['ABACD', 'ABCD', 'DCBA', 'ABCAD'], answer: 0, explain: 'Without virtual inheritance D contains two A sub-objects: B builds one (A, B), C builds another (A, C), then D.' },
    { q: `What does <code>cout &lt;&lt; (i &lt; u);</code> print for <code>int i = -1; unsigned u = 1;</code>?`, options: ['0', '1', 'Compile error', 'Undefined behavior'], answer: 0, explain: 'i is converted to unsigned (4294967295), which is not less than 1. Use <code>std::cmp_less</code> in C++20.' },
    { q: `On x86-64, <code>sizeof(P)</code> for <code>struct P { char c; int i; char d; };</code> is…`, options: ['12', '6', '8', '9'], answer: 0, explain: '3 bytes of padding after c (to align i to 4), and 3 bytes at the end so arrays of P keep i aligned: 1+3+4+1+3 = 12. Reordering to {int, char, char} gives 8.' },
    { q: `Given <code>void f(int); void f(char*);</code>, which one does <code>f(0)</code> call?`, options: ['f(int)', 'f(char*)', 'Ambiguous', 'Neither'], answer: 0, explain: '0 is an int literal: an exact match for f(int). Converting it to a null pointer is a conversion, so f(int) wins — one reason <code>nullptr</code> exists.' },
    { q: `Output?<pre>struct Base { virtual const char* name() const { return "Base"; } };
struct Der : Base { const char* name() const override { return "Der"; } };
try { throw Der(); } catch (Base b) { cout &lt;&lt; b.name(); }</pre>`, options: ['Base', 'Der', 'Nothing — std::terminate', 'Compile error'], answer: 0, explain: 'Catch by value copy-constructs a Base from the Der exception → slicing. Catch by const reference to keep the dynamic type.' },
    { q: `Output?<pre>template &lt;class T&gt; void g(T)  { cout &lt;&lt; "T "; }
template &lt;&gt; void g&lt;int*&gt;(int*) { cout &lt;&lt; "spec "; }
template &lt;class T&gt; void g(T*) { cout &lt;&lt; "T* "; }
int x; g(&amp;x);</pre>`, options: ['T*', 'spec', 'T', 'Ambiguous call'], answer: 0, explain: 'Specializations don\'t participate in overload resolution. Between the primaries g(T) and g(T*), g(T*) is more specialized. The specialization belongs to g(T) and is never chosen.' },
    { q: `What does <code>int i = 0; int j = i++ + i++;</code> do?`, options: ['Undefined behavior (unsequenced modifications of i)', 'j = 1', 'j = 0', 'j = 2'], answer: 0, explain: 'The operands of + are unsequenced relative to each other, and both modify i → UB, even in C++17/20.' },
    { q: `Output?<pre>int x = 1;
auto f = [x] { return x; };
auto g = [&amp;x] { return x; };
x = 5;
cout &lt;&lt; f() &lt;&lt; g();</pre>`, options: ['15', '55', '11', '51'], answer: 0, explain: 'By-value capture copies x when the lambda is created (1); by-reference capture reads the current value (5).' },
    { q: `Output?<pre>const string a = "hi";
string b = std::move(a);
cout &lt;&lt; a &lt;&lt; b;</pre>`, options: ['hihi', 'hi', 'Undefined behavior', 'Compile error'], answer: 0, explain: '<code>std::move(a)</code> on a const object yields <code>const string&amp;&amp;</code>, which binds to the copy constructor, not the move constructor. a is untouched.' },
    { q: `Pimpl: the header has <code>struct Impl; std::unique_ptr&lt;Impl&gt; p_;</code> and <b>no</b> destructor declaration. What happens in client code that destroys a Widget?`, options: ['Compile error: the implicit destructor deletes an incomplete type', 'It works but leaks Impl', 'Linker error', 'It works perfectly'], answer: 0, explain: 'The implicit destructor is defined inline in each client where Impl is incomplete; <code>std::default_delete</code> static_asserts. Declare <code>~Widget();</code> and define it in the .cpp.' },
    { q: `Copy-and-swap <code>T&amp; operator=(T other) { swap(*this, other); return *this; }</code> gives which exception-safety guarantee for copy-assignment?`, options: ['Strong (commit-or-rollback)', 'Basic only', 'Nothrow', 'None'], answer: 0, explain: 'The copy that can throw is made before *this is touched; the swap and destructor don\'t throw. Either the assignment fully happens or nothing changes.' },
    { q: `What does <code>std::lock_guard&lt;std::mutex&gt;{m};</code> (no variable name) do?`, options: ['Locks and immediately unlocks m — the temporary dies at the semicolon', 'Locks m until the end of the scope', 'Compile error', 'Declares a variable named m'], answer: 0, explain: 'An unnamed temporary guard is destroyed at the end of the full expression, so the following code is unprotected. Always name guards.' },
    { q: `In a generator's <code>promise_type</code>, what does <code>initial_suspend()</code> returning <code>std::suspend_always</code> mean?`, options: ['The coroutine is lazy: its body does not run until the first resume()', 'The coroutine can never be resumed', 'The frame is destroyed immediately', 'The coroutine runs to completion eagerly'], answer: 0, explain: 'The coroutine pauses before executing the first statement; the caller resumes it when it wants the first value.' },
    { q: `Which change to a class in a shared library's public header breaks binary compatibility for already-compiled clients?`, options: ['Adding a private data member', 'Adding a new non-virtual, non-inline member function', 'Changing code inside a function defined in the .cpp', 'Adding a new free function'], answer: 0, explain: 'A new data member changes sizeof and possibly offsets, which clients baked in at compile time — private or not.' },
    { q: `Which of these is <b>not</b> implemented with type erasure in the standard library?`, options: ['std::variant', 'std::function', 'std::any', 'the deleter inside std::shared_ptr'], answer: 0, explain: 'std::variant stores one of a closed, listed set of types inline and dispatches with visit — no erasure. The others hide an arbitrary type behind a uniform interface.' },
    { q: `Output (GCC)?<pre>struct T { T() { cout &lt;&lt; "ctor "; } T(T&amp;&amp;) { cout &lt;&lt; "move "; } ~T() { cout &lt;&lt; "dtor "; } };
T make() { return T(); }
int main() { T t = make(); }</pre>`, options: ['ctor dtor', 'ctor move dtor dtor', 'ctor move move dtor dtor dtor', 'Depends on optimization level'], answer: 0, explain: 'Since C++17, initializing from a prvalue is guaranteed copy elision: one construction, no moves, at every optimization level.' },
    { q: `What is wrong with this CRTP base?<pre>template &lt;class D&gt; struct Shape { double area() const { return static_cast&lt;const D&amp;&gt;(*this).area(); } };
struct Sq : Shape&lt;Sq&gt; { double s = 2; };   // forgot to define area()</pre>`, options: ['Sq{}.area() recurses forever (stack overflow) instead of failing to compile', 'Compile error: area() not found', 'It returns 0', 'Nothing'], answer: 0, explain: 'Name lookup on Sq finds the base\'s own area(), so it calls itself. Use a distinct hook name (areaImpl) so a missing hook is a compile error.' }
  );

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push(
    { q: 'What is CRTP and when would you use it instead of virtual functions?', level: 'A',
      a: `<p>CRTP (Curiously Recurring Template Pattern) is <code>struct D : Base&lt;D&gt;</code>: the base is a template that knows its derived type, so it can call derived functions via <code>static_cast&lt;D&amp;&gt;(*this)</code> with no vtable. It gives <b>static polymorphism</b>: calls are resolved at compile time and can be inlined, objects carry no vptr. I use it (1) in hot code where the concrete type is known at the call site and profiling shows dispatch or missed inlining matters, (2) for <b>mixins</b> that add behaviour to many classes (comparison operators, per-class counters, <code>clone()</code>), and (3) for library hooks like <code>enable_shared_from_this</code>. I don't use it when I need a heterogeneous container or plugin-style runtime extension — then virtual functions or type erasure are right. In C++20/23, concepts and deducing <code>this</code> replace some CRTP uses.</p>`,
      followUps: ['What happens if the derived class forgets to implement the hook?', 'How do you prevent <code>struct B : Base&lt;A&gt;</code>?', 'How does C++23 deducing <code>this</code> change things?'] },
    { q: 'Explain the pimpl idiom. What problems does it solve and what does it cost?', level: 'I',
      a: `<p>Pimpl moves a class's private data into a separately defined <code>struct Impl</code>, leaving only <code>std::unique_ptr&lt;Impl&gt;</code> in the header. <b>Solves:</b> (1) compile-time coupling — private changes recompile one .cpp instead of every includer; (2) ABI stability — <code>sizeof</code> and layout of the public class never change, so binary clients keep working; (3) header hygiene — heavy includes stay in the .cpp; (4) hiding implementation in closed-source SDKs. <b>Costs:</b> one heap allocation per object, an extra indirection on every access, lost inlining, boilerplate forwarding functions, and the special members must be declared in the header and defined in the .cpp (otherwise <code>unique_ptr</code> deletes an incomplete type). Moved-from objects hold a null pimpl, and const-ness doesn't propagate through the pointer unless you use <code>propagate_const</code> or const accessors.</p>`,
      followUps: ['Why does the destructor need to be in the .cpp file?', 'What is "fast pimpl"?', 'Would you use shared_ptr for the impl pointer?'] },
    { q: 'How does std::function work internally? Implement the core idea.', level: 'A',
      a: `<p>It is <b>type erasure</b>. Internally there is an abstract interface (a "Concept") with virtual <code>call</code>, <code>clone</code> and destroy operations, and a class template <code>Model&lt;F&gt;</code> that stores the actual callable and implements them by forwarding. A <b>templated constructor</b> captures the callable's real type F into <code>Model&lt;F&gt;</code>; after that the outer <code>std::function&lt;R(Args...)&gt;</code> type no longer mentions F. Copying calls the virtual <code>clone</code> because only the model knows F. Real implementations replace the virtual Concept with a hand-built table of function pointers and add a <b>small buffer</b>: callables up to ~16–32 bytes that are nothrow-movable are stored inline (no allocation). Costs: an indirect call per invocation (not inlinable), possible heap allocation, and the requirement that callables be copyable (fixed by C++23 <code>std::move_only_function</code>).</p>`,
      followUps: ['Why must inline-stored callables be nothrow-movable?', 'What does std::function_ref (C++26) do differently?', 'Why can\'t std::function hold a lambda capturing a unique_ptr?'] },
    { q: 'Write a copy assignment operator for a class that owns a raw buffer. What guarantee does yours give?', level: 'I',
      a: `<p>I'd use copy-and-swap: correct copy constructor and destructor, a <code>noexcept</code> member-wise <code>friend void swap</code>, and <code>T&amp; operator=(T other) noexcept { swap(*this, other); return *this; }</code>. The parameter is built by the caller — by copy for lvalues, by move for rvalues — so the only operation that can throw (allocation) happens <b>before</b> <code>*this</code> is modified: the <b>strong guarantee</b>. Self-assignment is correct without a check (wasteful copy, but rare), and the old buffer is freed by <code>other</code>'s destructor, so no cleanup code is duplicated. If performance mattered more than the strong guarantee — e.g. frequently assigning equal-sized buffers — I'd write a version that reuses capacity, like <code>std::vector</code> does, and document that it only gives the basic guarantee. And if possible I'd avoid all of it by holding a <code>std::vector</code> (rule of zero).</p>`,
      followUps: ['Why not call std::swap(*this, other)?', 'Can you have both operator=(T) and operator=(T&amp;&amp;)?', 'How would you test exception safety?'] },
    { q: 'What are the exception-safety guarantees? Give an example of each.', level: 'I',
      a: `<p><b>Nothrow:</b> the operation never throws — destructors, <code>swap</code>, move constructors marked <code>noexcept</code>, <code>std::vector::pop_back</code>. <b>Strong:</b> commit-or-rollback; if it throws, state is unchanged — <code>std::vector::push_back</code> (when T's move is noexcept or T is copyable), copy-and-swap assignment. <b>Basic:</b> no leaks and invariants hold, but the value may change — <code>std::vector::insert</code> in the middle with a throwing move, or an assignment that partially copied elements. <b>No guarantee:</b> anything may happen — code that frees before allocating. The tools to reach them are RAII (basic for free), "do the risky work on the side, then commit with nothrow operations" (strong), and <code>noexcept</code> on moves/swaps so containers can use them.</p>`,
      followUps: ['Why does std::vector care whether your move constructor is noexcept?', 'Which guarantee does std::map::insert give?'] },
    { q: 'What is a scope guard and how would you implement scope_fail?', level: 'A',
      a: `<p>A scope guard is an RAII object that runs a callable when its scope ends — Go's <code>defer</code> in C++. Implementation: a class template holding the callable by value and an "active" flag; the destructor calls it if active; it is non-copyable, movable (the move disarms the source) and offers <code>dismiss()</code>. <code>scope_fail</code> runs only when leaving by exception: store <code>std::uncaught_exceptions()</code> in the constructor and in the destructor run the callable only if the current count is <b>greater</b>. Counting (not the old bool <code>uncaught_exception()</code>) matters because a guard created inside a destructor that is running during unwinding would otherwise misfire. <code>scope_success</code> is the opposite check. These are in the Library Fundamentals TS v3; production code often uses GSL <code>finally</code>, folly <code>SCOPE_EXIT</code> or Boost.Scope.</p>`,
      followUps: ['What if the cleanup lambda throws?', 'Why must the guard be named?', 'How would you use scope_fail to implement a transaction?'] },
    { q: 'What happens when a destructor throws?', level: 'I',
      a: `<p>Since C++11 destructors are implicitly <code>noexcept</code>, so an exception escaping one calls <code>std::terminate</code> immediately. Even if you declare <code>noexcept(false)</code>, throwing during stack unwinding (while another exception is already propagating) also calls <code>std::terminate</code>, because C++ can't handle two exceptions in flight. And containers/algorithms assume destructors don't throw — a throwing element destructor leaves them in an unspecified state. So destructors should swallow or log errors; if releasing a resource can fail meaningfully (flushing a file, committing a transaction), provide an explicit <code>close()</code>/<code>commit()</code> that reports errors, and make the destructor a best-effort fallback.</p>`,
      followUps: ['How can a destructor know whether it is running due to unwinding?', 'What does std::fstream do if close fails in its destructor?'] },
    { q: 'Explain C++20 coroutines: what is the promise_type, the coroutine handle and the frame?', level: 'E',
      a: `<p>A coroutine is any function using <code>co_await</code>, <code>co_yield</code> or <code>co_return</code>. The compiler allocates a <b>coroutine frame</b> (usually on the heap; elidable via HALO) storing parameters, locals that live across suspension points, the resume point, and a <b>promise object</b> of type <code>ReturnType::promise_type</code>. The promise customizes behaviour: <code>get_return_object</code> builds what the caller receives, <code>initial_suspend</code> (lazy vs eager), <code>yield_value</code>, <code>return_value/return_void</code>, <code>unhandled_exception</code>, <code>final_suspend</code>. The <b>coroutine_handle</b> is a non-owning pointer to the frame with <code>resume()</code>, <code>done()</code>, <code>destroy()</code> and <code>promise()</code>; the return object usually owns it RAII-style. <code>co_await</code> talks to an awaiter via <code>await_ready/await_suspend/await_resume</code>. They are <b>stackless</b>: suspension only happens in the coroutine body itself, and while running they use the resumer's stack.</p>`,
      followUps: ['Why is final_suspend usually suspend_always?', 'What is symmetric transfer?', 'Why are reference parameters dangerous in coroutines?'] },
    { q: 'Stackful vs stackless coroutines — which does C++20 provide, and what are the trade-offs?', level: 'E',
      a: `<p>C++20 coroutines are <b>stackless</b>: each coroutine has a small heap frame sized by the compiler, and can only suspend at <code>co_await</code>/<code>co_yield</code> in its own body; any function it calls runs to completion normally. That makes them cheap (bytes to a few KB each, nanosecond switches, millions can exist) and lets the compiler optimize and sometimes elide allocation — but "coroutine-ness" is viral: to suspend deep inside a call chain, every function on the chain must itself be a coroutine. <b>Stackful</b> coroutines/fibers (Boost.Context, Boost.Fiber, Go goroutines) have their own stack, so they can suspend from any depth and work with existing code, at the cost of reserving stack memory per fiber and costlier switches. Async servers in C++ today usually combine stackless coroutines with an executor like Asio.</p>`,
      followUps: ['How does Asio\'s co_spawn schedule coroutines?', 'Can a C++20 coroutine migrate between threads?'] },
    { q: 'What is the difference between API and ABI? Give examples of ABI-breaking changes.', level: 'A',
      a: `<p>The API is the source-level contract: names, types, signatures — breaking it causes compile errors. The ABI is the binary contract compiled into callers: object layout (sizes, offsets, alignment), vtable slot order, mangled symbol names, calling conventions, exception and RTTI details, inline function and template bodies, and the layout of standard library types. Breaking it leaves already-built programs crashing or computing garbage with no compiler warning. ABI-breaking changes include: adding/removing/reordering data members (even private), adding or reordering virtual functions, changing a parameter type (different mangled name), changing base classes, changing inline/template bodies (ODR violation between old and new copies), and changing flags like <code>_GLIBCXX_USE_CXX11_ABI</code>. Safe changes include adding new non-virtual non-inline functions or new classes. Mitigations: pimpl, extern "C" facades with opaque handles, inline namespaces, SONAME bumps, and <code>abidiff</code> in CI.</p>`,
      followUps: ['Why didn\'t C++ fix std::unordered_map\'s performance?', 'How does libstdc++ dual ABI work?', 'What does -fvisibility=hidden buy you?'] },
    { q: 'What is name mangling and why does extern "C" exist?', level: 'I',
      a: `<p>The linker works with flat symbol strings, but C++ allows overloading, namespaces, classes and templates. Name mangling encodes all of that into the symbol: on the Itanium ABI (GCC/Clang on Linux/macOS) <code>int add(int,int)</code> becomes <code>_Z3addii</code> and <code>ns::Widget::click()</code> becomes <code>_ZN2ns6Widget5clickEv</code>; MSVC uses a different scheme, which is one reason binaries from different C++ ABIs don't link. <code>extern "C"</code> gives a function C language linkage: the symbol is the plain name (<code>add_c</code>), so C code, Python ctypes, Rust FFI, dlsym() and other compilers can find it. The price: no overloading on those functions, and only C-compatible types and no exceptions should cross that boundary. <code>c++filt</code> demangles names in linker errors.</p>`,
      followUps: ['Can an extern "C" function throw?', 'How would you load a plugin with dlopen/dlsym?'] },
    { q: 'Why is passing std::string or allocating/freeing memory across a DLL boundary dangerous?', level: 'E',
      a: `<p>Each side of the boundary may be built with a different compiler version, standard library or C runtime. <code>std::string</code>'s layout differs between libstdc++ ABIs, libc++ and MSVC's STL, and even between MSVC debug and release builds, so passing it by value or reference reinterprets bytes incorrectly. Memory is the second trap: on Windows each DLL can link its own CRT with its own heap, so <code>new</code> in the DLL and <code>delete</code> in the EXE goes to the wrong heap and corrupts it; the same happens implicitly when a string or vector allocated on one side is destroyed on the other. Rules: keep the boundary to C types and opaque handles, let the side that allocates also free (<code>lib_destroy</code>), copy data into caller-provided buffers, or guarantee identical toolchains and a shared dynamic runtime on both sides.</p>`,
      followUps: ['How does COM solve this?', 'What does a "stable ABI" C++ library like Qt promise?'] },
    { q: 'Why do we need a virtual destructor, and what happens with unique_ptr&lt;Base&gt; vs shared_ptr&lt;Base&gt; holding a Derived?', level: 'I',
      a: `<p>Deleting a Derived through a <code>Base*</code> whose destructor is not virtual is undefined behavior; in practice only <code>~Base</code> runs and Derived's resources leak. <code>std::unique_ptr&lt;Base&gt;</code> deletes through <code>Base*</code> with <code>default_delete&lt;Base&gt;</code>, so it has exactly this problem. <code>std::shared_ptr&lt;Base&gt;</code> created with <code>make_shared&lt;Derived&gt;()</code> or <code>shared_ptr&lt;Base&gt;(new Derived)</code> captures a <b>type-erased deleter</b> for Derived in the control block at construction time, so it calls <code>~Derived</code> correctly even without a virtual destructor — a nice illustration of type erasure. The rule remains: a class meant to be deleted polymorphically needs a public virtual destructor; otherwise make the destructor protected and non-virtual (as CRTP mixins do).</p>`,
      followUps: ['Why is shared_ptr&lt;void&gt; able to destroy objects correctly?', 'When is a protected non-virtual destructor the right choice?'] },
    { q: 'Explain guaranteed copy elision (C++17), NRVO, and implicit move on return.', level: 'A',
      a: `<p>Since C++17, a <b>prvalue</b> is not a temporary object but an initializer: <code>T x = T();</code> and <code>return T();</code> construct directly into the final object — guaranteed, even if T has deleted copy and move constructors. <b>NRVO</b> (returning a named local, <code>T x; return x;</code>) is still optional: compilers usually do it when there is a single named return object, but with two candidates (<code>if (b) return x; return y;</code>) they typically can't. When NRVO doesn't happen, <code>return local;</code> and <code>return param;</code> are treated as rvalues first (<b>implicit move</b>), so you get a move, not a copy. Consequences: never write <code>return std::move(local);</code> — it disables NRVO; parameters are moved, not elided; and the classic interview output "ctor dtor" for <code>T t = make();</code> is guaranteed regardless of optimization level.</p>`,
      followUps: ['What does a Tracer class print for each case?', 'Does elision apply to throw/catch?'] },
    { q: 'Walk me through how you would approach any "what does this C++ print?" question.', level: 'I',
      a: `<p>I check, in order: (1) <b>UB first</b> — unsequenced modifications, uninitialized reads, dangling references/string_views, signed overflow, deleting via non-virtual base; if present the answer is "undefined". (2) <b>Lifetimes</b> — virtual bases, bases, members in declaration order, body; destruction reversed; temporaries die at the full expression unless lifetime-extended; statics after main. (3) <b>Static vs dynamic type</b> — virtual dispatch vs default arguments, slicing on pass-by-value or catch-by-value, no deep dispatch in ctors/dtors, name hiding. (4) <b>Overload resolution</b> — exact &gt; promotion &gt; conversion; non-templates win ties; specializations don't participate. (5) <b>Copies/moves</b> — prvalue elision, optional NRVO, implicit move, <code>move_if_noexcept</code> in containers, <code>std::move</code> on const copies. (6) <b>Arithmetic</b> — promotions, signed/unsigned, truncating division. (7) <b>Evaluation order</b> — C++17 sequencing of <code>&lt;&lt;</code>, unspecified argument order. I narrate each step aloud, then verify on Compiler Explorer with sanitizers if allowed.</p>`,
      followUps: ['Give an example where the answer is "unspecified" rather than "undefined".', 'What changed in C++17 about evaluation order?'] },
    { q: 'Compare virtual functions, CRTP, std::variant and type erasure for "handling many shape types".', level: 'E',
      a: `<p><b>Virtual + base class:</b> open set of types, runtime dispatch, but intrusive (types must inherit), pointer semantics (<code>vector&lt;unique_ptr&lt;Shape&gt;&gt;</code>), heap per object. <b>CRTP/templates:</b> zero-overhead, inlinable, but types are fixed at compile time and can't be mixed in one container; code bloat. <b>std::variant:</b> closed set listed up front, value semantics, no heap, dispatch with <code>std::visit</code> (often a jump table); adding a type means editing the variant and all visitors, adding an operation is easy. <b>Type erasure:</b> open set, non-intrusive (works with int, lambdas, third-party types), value semantics, runtime dispatch, one allocation unless SBO; adding a type is free, adding an operation means editing Concept and Model. My choice: variant for a small closed domain (AST nodes, messages), type erasure for library APIs and callbacks, virtual for classic plugin hierarchies, CRTP/templates for hot inner loops.</p>`,
      followUps: ['What is the "expression problem"?', 'How would you add SBO to the type-erased version?'] }
  );

  registerModule({
    id: 'cpp13',
    title: 'Expert Idioms + Question Bank',
    intro: `<p>This is the capstone of the C++ track. You already know classes, move semantics, templates, RAII and concurrency; now you'll learn the <b>idioms</b> senior C++ engineers reach for when they design real libraries — and the <b>tricky questions</b> interviewers use to tell experts from people who memorized syntax.</p>
      <p>Each idiom answers one design pressure: <b>CRTP</b> (speed — polymorphism with zero runtime cost, and reusable mixins), <b>pimpl</b> (build times and binary stability), <b>type erasure</b> (runtime polymorphism without inheritance, the trick behind <code>std::function</code>), <b>copy-and-swap</b> (exception-safe assignment), <b>RAII guards</b> (cleanup that can't be forgotten), <b>C++20 coroutines</b> (functions that pause and resume), and <b>ABI awareness</b> (why "it compiles" doesn't mean "old binaries still work"). The final topic is a big bank of <b>predict-the-output</b> puzzles with a 7-step checklist to crack any of them.</p>
      <p>Every topic opens with an everyday analogy, has a step-by-step visualizer, worked examples you can compile, a guided "solve it yourself" problem, and a note on how AI assistants change (and don't change) the job.</p>`,
    goals: [
      'Implement CRTP static interfaces and mixins (counters, comparisons, clone) and explain when they beat virtual functions',
      'Convert a class to pimpl correctly — including where the destructor and move operations must be defined — and explain the build-time and ABI benefits',
      'Build a type-erased wrapper (Concept + Model&lt;T&gt; + template constructor), a mini <code>std::function</code> and <code>std::any</code>, and add small-buffer optimization',
      'Write rule-of-five classes with copy-and-swap and reason precisely about nothrow / strong / basic exception-safety guarantees',
      'Use and write RAII guards (lock guards, scope_exit/scope_fail, custom deleters) and explain stack unwinding order',
      'Write a C++20 coroutine generator from scratch and explain promise_type, coroutine_handle, the frame and lifetime pitfalls',
      'Identify ABI-breaking changes, read mangled names, and design a stable <code>extern "C"</code> boundary',
      'Predict the output of tricky C++ snippets (construction order, slicing, default arguments, overload resolution, elision, conversions) and spot undefined behavior'
    ],
    prereqs: `<p>C++ 5 (Rule of 3/5/0, virtual functions, vtables), C++ 6 (RAII and smart pointers), C++ 9 (templates, SFINAE, concepts), C++ 10 (move semantics, perfect forwarding, lambdas) and C++ 11 (concurrency basics). Comfortable compiling and running small programs with <code>g++ -std=c++20</code>.</p>`,
    hours: 16,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
