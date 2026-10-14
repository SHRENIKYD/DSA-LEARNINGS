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
  registerModule({ id: 'cpp13', title: 'Expert Idioms + Question Bank', intro: '<p>stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub</p>', goals: ['aaaaaaaaaaaa','bbbbbbbbbbbbbb','cccccccccccc'], prereqs: 'xxxxxxxxxxxxxxxxxxxx', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
