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
  registerModule({ id: 'cpp13', title: 'Expert Idioms + Question Bank', intro: '<p>stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub stub</p>', goals: ['aaaaaaaaaaaa','bbbbbbbbbbbbbb','cccccccccccc'], prereqs: 'xxxxxxxxxxxxxxxxxxxx', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
