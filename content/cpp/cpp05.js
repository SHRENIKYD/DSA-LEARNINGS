(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw;

  /* ---------------- shared little helpers for the visualizers ---------------- */
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function esc(s) { return H.esc(s); }
  function out(text, label) {
    return { type: 'text', label: label || 'Console output', html: text ? '<code>' + esc(text).replace(/\n/g, '<br>') + '</code>' : '<span class="c-m">(nothing printed yet)</span>' };
  }
  function note(html, label) { return { type: 'text', label: label || 'What the compiler really does', html: html }; }
  function words(input, hint) {
    var s = String(input === undefined || input === null ? '' : input).trim();
    if (!s) throw new Error(hint);
    return s;
  }
  /* Turns a list of steps into visualizer frames for a fixed C++ listing.
     step = { l: line | [lines], cls, v: {vars}, hv: {name: cls}, vl: 'vars label', out: 'console', extra: [parts], narr } */
  function codeFrames(code, steps, label) {
    return steps.map(function (s) {
      var hl = {};
      [].concat(s.l === undefined ? [] : s.l).forEach(function (n) { hl[n] = s.cls || 'cur'; });
      var parts = [{ type: 'code', label: label || 'Code (highlighted line = running now)', lang: 'cpp', code: code, hl: hl }];
      if (s.v) parts.push({ type: 'vars', label: s.vl || 'Variables', vals: s.v, hl: s.hv || {} });
      (s.extra || []).forEach(function (p) { parts.push(p); });
      if (s.out !== undefined) parts.push(out(s.out));
      return { narr: s.narr, parts: parts };
    });
  }

  /* ======================================================================
     TOPIC 1 — Copy constructor, copy assignment, destructor: which one runs?
     ====================================================================== */
  topics.push({
    title: 'The Big Three: Copy Constructor, Copy Assignment & Destructor (Which One Runs?)',
    analogy: `<p>Think about notebooks in a classroom.</p>
      <ul>
        <li><b>Copy constructor</b> = a student walks in with a <b>brand-new, blank notebook</b> and photocopies a friend's notes into it. The notebook did not exist a second ago; it is <i>born</i> as a copy.</li>
        <li><b>Copy assignment</b> = a student already has a notebook <b>full of old notes</b>. To copy a friend's notes, they first have to <b>tear out the old pages</b>, then copy. The notebook already existed, so there is old stuff to clean up.</li>
        <li><b>Destructor</b> = the end of the year, when every notebook is <b>shredded and recycled</b> in the reverse order they were handed out. You never have to call the shredder yourself: it comes automatically.</li>
      </ul>
      <p>One question decides everything: <b>"Is the object on the left being born right now?"</b> Born now → constructor. Already alive → assignment.</p>`,
    explain: `<p>Every C++ class has a few <b>special member functions</b>. The compiler writes them for you if you do not, and calls them automatically at very specific moments. The first three to learn are:</p>
      ${H.table(['Name', 'Signature', 'Runs when…'], [
        ['Copy constructor', '<code>T(const T&amp; other)</code>', 'a <b>new</b> object is created from an existing one'],
        ['Copy assignment', '<code>T&amp; operator=(const T&amp; other)</code>', 'an <b>already-alive</b> object gets overwritten by another'],
        ['Destructor', '<code>~T()</code>', 'an object\'s lifetime ends (end of scope, <code>delete</code>, end of a temporary)']
      ])}
      <p><b>The trap that catches everyone:</b> the <code>=</code> sign does <i>not</i> mean assignment. Look at the left side instead.</p>
      ${H.table(['Line', 'Is the left side being born?', 'What runs'], [
        ['<code>T b = a;</code>', H.c('g', 'yes, b is declared here'), '<b>copy constructor</b>'],
        ['<code>T c(a);</code> / <code>T c{a};</code>', H.c('g', 'yes'), '<b>copy constructor</b>'],
        ['<code>c = a;</code>', H.c('r', 'no, c already exists'), '<b>copy assignment</b>'],
        ['<code>f(a);</code> where <code>void f(T p)</code>', H.c('g', 'yes, parameter p is a new object'), 'copy constructor (then p\'s destructor when f returns)'],
        ['<code>g(a);</code> where <code>void g(const T&amp; r)</code>', 'nothing new: r is just another name for a', H.c('g', 'nothing at all')],
        ['<code>T d = make();</code>', 'yes, but C++17 builds the result <i>directly</i> in d', 'just one constructor inside make() (guaranteed copy elision)']
      ])}
      <p><b>Destructors run in reverse order of construction</b> — like a stack of plates: the last plate you put on is the first one you take off. If <code>a</code>, then <code>b</code>, then <code>c</code> are created in a block, the closing <code>}</code> destroys <code>c</code>, then <code>b</code>, then <code>a</code>. Inside one object, members are destroyed in the reverse of their declaration order, and base classes after the derived part.</p>
      <p><b>What does the compiler-generated version do?</b> It copies <b>member by member</b> (each member's own copy constructor / assignment). For an <code>int</code> or a <code>std::string</code> that is perfect. For a raw owning pointer it copies only the <i>address</i>, which is the root of the shallow-copy bug in the next topic.</p>`,
    clues: [
      '"How many times is the copy constructor called?" → count every <b>new</b> object made from an existing one: by-value params, by-value returns (minus elision), container copies',
      '"<code>T b = a;</code> — constructor or assignment?" → always a constructor; <code>=</code> in a declaration is initialization',
      '"In what order are destructors called?" → reverse of construction, members in reverse declaration order, derived before base',
      '"Why does the copy constructor take <code>const T&amp;</code>?" → by-value would need a copy to make a copy: infinite recursion (it does not compile)',
      '"Predict the output" programs with a class that prints in every special member → trace births, assignments and deaths line by line',
      '"Function takes a big object by value" in a code review → suggests <code>const T&amp;</code> to avoid a copy'
    ],
    code: [R`
      // A "noisy" class: every special member prints, so you can SEE which one runs.
      #include <iostream>
      #include <string>

      struct Noisy {
          std::string name;

          explicit Noisy(std::string n) : name(std::move(n)) {          // ordinary constructor
              std::cout << "ctor        " << name << '\n';
          }
          Noisy(const Noisy& other) : name(other.name + "_copy") {      // copy constructor: a NEW object
              std::cout << "copy-ctor   " << name << '\n';
          }
          Noisy& operator=(const Noisy& other) {                        // copy assignment: an EXISTING object
              std::cout << "copy-assign " << name << " <- " << other.name << '\n';
              name = other.name;                                        // overwrite the old state
              return *this;                                             // return *this so a = b = c works
          }
          ~Noisy() {                                                    // destructor: end of life
              std::cout << "dtor        " << name << '\n';
          }
      };

      void byValue(Noisy p) { std::cout << "  inside byValue with " << p.name << '\n'; }
      void byRef(const Noisy& r) { std::cout << "  inside byRef with " << r.name << '\n'; }

      int main() {
          Noisy a("a");        // ctor a
          Noisy b = a;         // copy-ctor a_copy        (b is BORN here)
          Noisy c("c");        // ctor c
          c = a;               // copy-assign c <- a      (c already existed)
          byValue(a);          // copy-ctor a_copy, body, dtor a_copy
          byRef(a);            // no new object at all
      }                        // dtor a (that is c now), dtor a_copy (b), dtor a  -> reverse order
    `],
    codeTitle: ['Instrumented class: watch every special member fire'],
    viz: {
      title: 'Which special member runs? (stack of live objects)',
      input: 'T a; T b = a; T c; c = a; byValue(a); byRef(b); T d = std::move(c); T e = make()',
      inputLabel: 'Statements separated by ; (T x; | T x = y; | T x(y); | x = y; | std::move(y) | byValue(x); | byRef(x); | T x = make(); | T();)',
      gen: function (input) {
        var stmts = words(input, 'Type statements like: T a; T b = a; a = b').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!stmts.length) throw new Error('Type statements like: T a; T b = a; a = b');
        if (stmts.length > 10) throw new Error('Use at most 10 statements');
        var header = ['struct T { T(); T(const T&); T(T&&) noexcept; T& operator=(const T&);', '           T& operator=(T&&) noexcept; ~T(); };   // each one prints', 'void byValue(T p);          // p is a NEW object', 'void byRef(const T& r);     // r is only an alias', 'T make();                   // returns a prvalue', 'int main() {'];
        var code = header.concat(stmts.map(function (s) { return '    ' + s + ';'; })).concat(['}']).join('\n');
        var base = header.length + 1; /* line of first statement */
        var alive = [], log = [], frames = [], counts = { ctor: 0, copy: 0, move: 0, cassign: 0, massign: 0, dtor: 0 };
        function idx(n) { for (var i = 0; i < alive.length; i++) if (alive[i].n === n) return i; return -1; }
        function need(n, s) { if (idx(n) < 0) throw new Error('"' + n + '" is not alive yet in: ' + s); }
        function fresh(n, s) { if (idx(n) >= 0) throw new Error('"' + n + '" is declared twice (in: ' + s + ')'); }
        function label(o) { return o.n + '  [' + o.st + ']'; }
        function push(line, cls, narr, hlIdx, hlCls) {
          var hl = {}; if (hlIdx !== undefined && hlIdx >= 0) hl[hlIdx] = hlCls || 'cur';
          frames.push({ narr: narr, parts: [
            { type: 'code', label: 'Program', lang: 'cpp', code: code, hl: one(line, cls) },
            { type: 'stack', label: 'Objects alive (bottom = born first, destroyed last)', items: alive.map(label), hl: hl },
            { type: 'vars', label: 'Special member calls so far', vals: { 'ctor': counts.ctor, 'copy-ctor': counts.copy, 'move-ctor': counts.move, 'copy-assign': counts.cassign, 'move-assign': counts.massign, 'dtor': counts.dtor } },
            out(log.join('\n'), 'Call log')
          ] });
        }
        push(header.length, 'cur', 'Program starts. No objects are alive yet. For each line ask: <b>is the left side being born right now?</b> Born → a constructor. Already alive → an assignment.');
        stmts.forEach(function (s, k) {
          var line = base + k, m;
          if ((m = s.match(/^T\s+([A-Za-z_]\w*)\s*=\s*make\(\s*\)$/))) {
            fresh(m[1], s); counts.ctor++; alive.push({ n: m[1], st: 'built by make()' }); log.push('T()          ' + m[1] + '   (built in place)');
            push(line, 'ok', '<code>' + esc(s) + '</code>: <code>make()</code> returns a prvalue, and since C++17 the result is <b>constructed directly inside ' + esc(m[1]) + '</b>. No copy, no move — this is <b>guaranteed copy elision</b>.', alive.length - 1, 'ok');
          } else if ((m = s.match(/^T\s+([A-Za-z_]\w*)$/))) {
            fresh(m[1], s); counts.ctor++; alive.push({ n: m[1], st: 'default' }); log.push('T()          ' + m[1]);
            push(line, 'ok', '<code>' + esc(s) + '</code>: a new object with no source → the <b>default constructor</b> runs. It goes on top of the stack of live objects.', alive.length - 1, 'ok');
          } else if ((m = s.match(/^T\s+([A-Za-z_]\w*)\s*(?:=\s*|\(\s*|\{\s*)std::move\(\s*([A-Za-z_]\w*)\s*\)\s*[)}]?$/))) {
            fresh(m[1], s); need(m[2], s); counts.move++;
            alive[idx(m[2])].st = 'moved-from';
            alive.push({ n: m[1], st: 'stole ' + m[2] + "'s guts" }); log.push('T(T&&)       ' + m[1] + ' <- ' + m[2]);
            push(line, 'ok', '<code>' + esc(s) + '</code>: ' + esc(m[1]) + ' is <b>born</b> from an rvalue (<code>std::move</code> only casts!) → the <b>move constructor</b>. It steals ' + esc(m[2]) + '\'s resources; ' + esc(m[2]) + ' stays alive but in a valid, unspecified "moved-from" state.', alive.length - 1, 'ok');
          } else if ((m = s.match(/^T\s+([A-Za-z_]\w*)\s*(?:=\s*|\(\s*|\{\s*)([A-Za-z_]\w*)\s*[)}]?$/))) {
            fresh(m[1], s); need(m[2], s); counts.copy++;
            alive.push({ n: m[1], st: 'copy of ' + m[2] }); log.push('T(const T&)  ' + m[1] + ' <- ' + m[2]);
            push(line, 'ok', '<code>' + esc(s) + '</code>: the <code>=</code> is a trap! ' + esc(m[1]) + ' is <b>being declared</b>, so it is born now → the <b>copy constructor</b>, not assignment.', alive.length - 1, 'ok');
          } else if ((m = s.match(/^T\s*(?:\(\s*\)|\{\s*\})$/))) {
            counts.ctor++; alive.push({ n: '(temporary)', st: 'lives until ;' }); log.push('T()          temporary');
            push(line, 'ok', '<code>' + esc(s) + '</code>: a <b>temporary</b> object is created…', alive.length - 1, 'ok');
            alive.pop(); counts.dtor++; log.push('~T()         temporary');
            push(line, 'bad', '…and destroyed at the <b>end of the full expression</b> (the semicolon). Temporaries die young unless bound to a <code>const T&amp;</code> or <code>T&amp;&amp;</code> that extends their life.');
          } else if ((m = s.match(/^([A-Za-z_]\w*)\s*=\s*std::move\(\s*([A-Za-z_]\w*)\s*\)$/))) {
            need(m[1], s); need(m[2], s); counts.massign++;
            alive[idx(m[2])].st = 'moved-from'; alive[idx(m[1])].st = 'took ' + m[2] + "'s guts";
            log.push('operator=(T&&) ' + m[1] + ' <- ' + m[2]);
            push(line, 'cur', '<code>' + esc(s) + '</code>: ' + esc(m[1]) + ' <b>already exists</b> and the right side is an rvalue → <b>move assignment</b>. ' + esc(m[1]) + ' first releases its old resource, then steals ' + esc(m[2]) + '\'s.', idx(m[1]), 'cur');
          } else if ((m = s.match(/^([A-Za-z_]\w*)\s*=\s*([A-Za-z_]\w*)$/))) {
            need(m[1], s); need(m[2], s); counts.cassign++;
            var self = m[1] === m[2];
            if (!self) alive[idx(m[1])].st = 'now equals ' + m[2];
            log.push('operator=(const T&) ' + m[1] + ' <- ' + m[2]);
            push(line, self ? 'bad' : 'cur', '<code>' + esc(s) + '</code>: ' + esc(m[1]) + ' <b>already exists</b> → <b>copy assignment</b>. It must clean up its old state before copying.' + (self ? ' <span class="c-r">Self-assignment!</span> A naive "delete then copy" would delete the very data it is about to copy — guard with <code>if (this == &amp;other)</code> or use copy-and-swap.' : ''), idx(m[1]), self ? 'bad' : 'cur');
          } else if ((m = s.match(/^byValue\(\s*(std::move\(\s*)?([A-Za-z_]\w*)\s*\)?\s*\)$/))) {
            need(m[2], s); var mv = !!m[1];
            if (mv) { counts.move++; alive[idx(m[2])].st = 'moved-from'; } else counts.copy++;
            alive.push({ n: 'p', st: 'param, ' + (mv ? 'moved' : 'copied') + ' from ' + m[2] }); log.push((mv ? 'T(T&&)       p <- ' : 'T(const T&)  p <- ') + m[2]);
            push(line, 'ok', '<code>' + esc(s) + '</code>: the parameter <code>p</code> is a <b>brand-new object</b> → ' + (mv ? 'the <b>move constructor</b> (argument is an rvalue).' : 'the <b>copy constructor</b> runs just to call the function. This is the hidden cost of pass-by-value.'), alive.length - 1, 'ok');
            push(line, 'cur', 'The body of <code>byValue</code> runs using its own private copy <code>p</code>. Changes to p never touch ' + esc(m[2]) + '.', alive.length - 1, 'cur');
            alive.pop(); counts.dtor++; log.push('~T()         p');
            push(line, 'bad', 'byValue returns → its parameter <code>p</code> dies: the <b>destructor</b> runs. One call cost us a constructor <i>and</i> a destructor.');
          } else if ((m = s.match(/^byRef\(\s*([A-Za-z_]\w*)\s*\)$/))) {
            need(m[1], s);
            push(line, 'ok', '<code>' + esc(s) + '</code>: <code>const T&amp;</code> is just another name for ' + esc(m[1]) + '. <b>No object is created, so no special member runs.</b> This is why big objects are passed by const reference.', idx(m[1]), 'sel');
          } else throw new Error('Did not understand "' + s + '". Use: T x; | T x = y; | T x(y); | x = y; | T x = std::move(y); | x = std::move(y); | byValue(x); | byRef(x); | T x = make(); | T();');
        });
        var endLine = base + stmts.length;
        while (alive.length) {
          var o = alive[alive.length - 1];
          push(endLine, 'bad', 'Closing <code>}</code>: objects die in <b>reverse order of birth</b>. Destroying <b>' + esc(o.n) + '</b> (top of the stack)' + (o.st === 'moved-from' ? ' — moved-from objects are still destroyed, so their destructor must cope with an empty state.' : '.'), alive.length - 1, 'bad');
          alive.pop(); counts.dtor++; log.push('~T()         ' + o.n);
        }
        push(endLine, 'done', 'Done. Constructors of any kind: <b>' + (counts.ctor + counts.copy + counts.move) + '</b>, destructors: <b>' + counts.dtor + '</b>. They always match — every object that is born also dies exactly once.');
        return frames;
      }
    },
    examples: [
      {
        title: 'Same "=" sign, two different functions',
        html: `<p><code>T b = a;</code> declares <code>b</code>, so <code>b</code> is born → <b>copy constructor</b>. <code>b = a;</code> on a later line: <code>b</code> already exists → <b>copy assignment</b>. A quick test: if you could put the type name in front, it is a constructor.</p>
          ${H.table(['Code', 'Output line'], [['<code>Noisy b = a;</code>', 'copy-ctor a_copy'], ['<code>b = a;</code>', 'copy-assign a_copy &lt;- a']])}`,
        code: R`
          struct Noisy {
              Noisy() = default;
              Noisy(const Noisy&) { std::cout << "copy-ctor\n"; }
              Noisy& operator=(const Noisy&) { std::cout << "copy-assign\n"; return *this; }
          };
          int main() {
              Noisy a;
              Noisy b = a;   // copy-ctor   (b born)
              b = a;         // copy-assign (b alive already)
          }
        `
      },
      {
        title: 'Pass by value vs pass by const reference',
        html: `<p>Calling <code>byValue(a)</code> 1000 times in a loop makes <b>1000 copies and 1000 destructions</b>. For a class holding a 1 MB buffer, that is 1 GB of memory traffic. <code>byRef(a)</code> creates nothing. Rule of thumb: pass cheap things (int, double, pointers, <code>string_view</code>, <code>span</code>) by value; pass expensive-to-copy things by <code>const T&amp;</code>; pass by value only when the function will <b>keep</b> its own copy anyway (then move from it).</p>`,
        code: R`
          struct Big { std::vector<int> data = std::vector<int>(250000); };
          long sumByValue(Big b) { long s = 0; for (int x : b.data) s += x; return s; }        // copies 1 MB per call
          long sumByRef(const Big& b) { long s = 0; for (int x : b.data) s += x; return s; }   // copies nothing
        `
      },
      {
        title: 'Return by value: guaranteed elision vs NRVO',
        html: `<p><code>return Noisy("x");</code> returns a <b>prvalue</b>: since C++17 the object is built straight into the caller's variable — no copy or move is even <i>allowed</i> to happen, so it works even if the copy constructor is deleted. <code>Noisy n("x"); return n;</code> returns a <b>named</b> local: compilers usually apply <b>NRVO</b> (named return value optimization) and elide it too, but it is optional; if they don't, the local is <b>moved</b>, not copied.</p>`,
        code: R`
          struct Noisy { Noisy() {} Noisy(const Noisy&) { std::cout << "copy\n"; } Noisy(Noisy&&) noexcept { std::cout << "move\n"; } };
          Noisy makeA() { return Noisy(); }          // C++17: guaranteed elision -> prints nothing
          Noisy makeB() { Noisy n; return n; }       // NRVO (usually) -> nothing; otherwise "move", never "copy"
          int main() { Noisy x = makeA(); Noisy y = makeB(); }
        `
      },
      {
        title: 'Destruction order of members and bases',
        html: `<p>For <code>struct Car : Vehicle { Engine e; Wheels w; };</code> construction goes <b>Vehicle → Engine → Wheels → Car body</b>. Destruction is the exact mirror: <b>~Car body → ~Wheels → ~Engine → ~Vehicle</b>. The order of the member-initializer list does not matter; <b>declaration order</b> does (g++ warns with <code>-Wreorder</code> if your list disagrees).</p>`,
        code: R`
          struct P { const char* s; P(const char* x) : s(x) { std::cout << "+" << s << ' '; } ~P() { std::cout << "-" << s << ' '; } };
          struct Vehicle { P v{"Vehicle"}; };
          struct Car : Vehicle { P e{"Engine"}; P w{"Wheels"}; };
          int main() { Car c; }   // +Vehicle +Engine +Wheels -Wheels -Engine -Vehicle
        `
      }
    ],
    deepDive: `<p><b>Exact signatures.</b> A copy constructor is any constructor whose first parameter is <code>T&amp;</code>, <code>const T&amp;</code>, <code>volatile T&amp;</code> or <code>const volatile T&amp;</code> and any other parameters have defaults. Always use <code>const T&amp;</code>: it binds to temporaries and to const objects. A constructor <code>T(T)</code> is ill-formed — to pass the argument by value you would first need to copy it, which needs the copy constructor… infinite recursion, so the language forbids it.</p>
      <p><b>Copy assignment returns <code>T&amp;</code></b> so chains like <code>a = b = c</code> work and so it behaves like built-in types. Returning by value would create a pointless extra copy; returning <code>void</code> breaks chaining.</p>
      <p><b>Copy elision rules (C++17+).</b> Initializing from a prvalue of the same type (<code>T x = T();</code>, <code>return T();</code>) is <i>not a copy at all</i>: the prvalue is just a recipe that materializes directly in the destination. NRVO for named locals is still optional; GCC and Clang do it at <code>-O0</code> too, MSVC in release builds. <code>-fno-elide-constructors</code> disables the optional elisions so you can see them in class. Returning a function parameter or a member is never NRVO'd — it is implicitly moved (C++20 widened "implicit move" to rvalue-reference locals as well, and C++23 simplified it further).</p>
      <p><b>Temporaries</b> die at the end of the full-expression (the <code>;</code>), except when bound directly to a <code>const T&amp;</code> or <code>T&amp;&amp;</code> local, which extends their life to the reference's scope. Extension does <i>not</i> pass through a function return: returning a <code>const T&amp;</code> to a parameter bound to a temporary dangles.</p>
      <p><b>Trivially copyable types</b> (no user-provided copy/move/destructor, all members trivially copyable) are copied with a plain <code>memcpy</code>; <code>std::vector</code> uses this for fast reallocation, and <code>std::is_trivially_copyable_v&lt;T&gt;</code> lets you check. Adding an empty user-written destructor <code>~T() {}</code> silently makes a type non-trivial — prefer <code>~T() = default;</code>.</p>
      <p><b>explicit copy constructors</b> forbid copy-initialization (<code>T b = a;</code> fails, <code>T b(a);</code> works) — almost never what you want. <b>Production reality:</b> in perf-sensitive code (games, HFT) teams add <code>static_assert(std::is_nothrow_move_constructible_v&lt;T&gt;)</code> and count copies with instrumented allocators or heaptrack, because a stray pass-by-value inside a hot loop can dominate a profile.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants happily generate classes, and the most common silent bug in generated C++ is a by-value parameter or a missing <code>const&amp;</code> that copies a large object on every call. The code compiles, tests pass, and the profile is 10× slower. You need to be able to <i>see</i> the hidden copies.</p>
      <p><b>Use AI as a partner:</b> <code>Add a print to every special member of this class and give me a main() that exercises copy-ctor, copy-assign, move-ctor, move-assign and two temporaries — don't tell me the output.</code> Then predict the output yourself and run it. Or: <code>List every place in this file where a std::vector or std::string is copied rather than moved or referenced.</code></p>
      <p><b>Where AI goes wrong:</b> it often claims <code>T b = a;</code> "calls the assignment operator", forgets that destructors run in reverse order, and over-applies <code>std::move</code> on return values (<code>return std::move(local);</code> actually <i>disables</i> NRVO — g++ warns with <code>-Wpessimizing-move</code>).</p>
      <p><b>What you must still own:</b> reading a block of code and naming, line by line, which special member runs and when each object dies. Interviewers test this with "predict the output" because it proves you understand object lifetime, the foundation of RAII.</p>`,
    problems: [
      {
        title: 'Predict the Special-Member Log, Then Remove the Wasted Copies',
        level: 'Easy', tags: ['copy constructor', 'copy assignment', 'destructor', 'predict output'], companies: ['Microsoft', 'Bloomberg', 'Adobe'],
        statement: `<p>The program below prints a line from every special member. (1) Write down the <b>exact output</b>. (2) Change <b>one</b> function signature so the program makes <b>no copy</b> when calling <code>show</code>, and give the new output.</p>`,
        constraints: `<p>C++17 or later. Assume no optimizations beyond the ones the standard guarantees.</p>`,
        example: `<p>Key lines: <code>Noisy b = a;</code> → ${H.c('g', 'copy-ctor')} (b is born). <code>c = a;</code> → ${H.c('b', 'copy-assign')} (c already alive). <code>show(a)</code> with a by-value parameter → ${H.c('y', 'copy-ctor + dtor')} of the parameter. At <code>}</code>: c, b, a die in ${H.c('r', 'reverse order')}.</p>`,
        brute: {
          why: `<p>The naive version takes <code>Noisy</code> <b>by value</b>. Every call builds a copy (string allocation for the name) and destroys it again on return: two special-member calls of pure waste per call. A naive <i>mental model</i> ("every <code>=</code> is assignment") also predicts the wrong output for <code>Noisy b = a;</code>.</p>`,
          code: R`
            #include <iostream>
            #include <string>
            struct Noisy {
                std::string id;
                Noisy(std::string s) : id(std::move(s)) { std::cout << "ctor " << id << '\n'; }
                Noisy(const Noisy& o) : id(o.id + "'") { std::cout << "copy-ctor " << id << '\n'; }
                Noisy& operator=(const Noisy& o) { std::cout << "copy-assign " << id << " = " << o.id << '\n'; id = o.id; return *this; }
                ~Noisy() { std::cout << "dtor " << id << '\n'; }
            };
            void show(Noisy n) { std::cout << "show " << n.id << '\n'; }   // by value: hidden copy
            int main() {
                Noisy a("a");
                Noisy b = a;
                Noisy c("c");
                c = a;
                show(a);
            }
          `
        },
        mcq: { q: 'What does <code>Noisy b = a;</code> print?', options: ['<code>copy-ctor a\'</code>', '<code>copy-assign a\' = a</code>', '<code>ctor a</code> then <code>copy-assign</code>', 'Nothing — it is elided'], answer: 0, explain: '<code>b</code> is being declared, so it is born from <code>a</code>: the copy constructor runs. The <code>=</code> in a declaration is initialization, not assignment. Elision only applies to prvalues, and <code>a</code> is an lvalue.' },
        hints: [
          `<p>Hint 1: for every line ask "is the left side being born?" Born → constructor; alive → assignment. A by-value parameter is also a newborn object.</p>`,
          `<p>Hint 2: keep a stack of live objects. Push on construction, pop on destruction. The function parameter is pushed at the call and popped at the return.</p>`,
          `<p>Hint 3: at the closing brace pop the rest in reverse. Careful: after <code>c = a;</code> the object <code>c</code> has id <code>"a"</code>, so its destructor prints <code>dtor a</code>. Fix: change <code>show(Noisy n)</code> to <code>show(const Noisy&amp; n)</code>.</p>`
        ],
        tests: { io: true, cases: [
          { stdin: "", stdout: "ctor a\ncopy-ctor a'\nctor c\ncopy-assign c = a\nshow a\ndtor a\ndtor a'\ndtor a" }
        ] },
        solution: {
          approach: `<p>Trace births and deaths with a stack. Output of the original:</p>
            <pre>ctor a
copy-ctor a'
ctor c
copy-assign c = a
copy-ctor a'
show a'
dtor a'
dtor a
dtor a'
dtor a</pre>
            <p>The last three lines are c (whose id became "a"), b ("a'") and a. After changing <code>show</code> to take <code>const Noisy&amp;</code>, the <code>copy-ctor a'</code> / <code>dtor a'</code> pair around <code>show</code> disappears and it prints <code>show a</code>.</p>`,
          code: R`
            #include <iostream>
            #include <string>
            struct Noisy {
                std::string id;
                Noisy(std::string s) : id(std::move(s)) { std::cout << "ctor " << id << '\n'; }
                Noisy(const Noisy& o) : id(o.id + "'") { std::cout << "copy-ctor " << id << '\n'; }
                Noisy& operator=(const Noisy& o) { std::cout << "copy-assign " << id << " = " << o.id << '\n'; id = o.id; return *this; }
                ~Noisy() { std::cout << "dtor " << id << '\n'; }
            };
            // FIX: take a const reference -> no new object, no copy, no extra destructor.
            void show(const Noisy& n) { std::cout << "show " << n.id << '\n'; }
            int main() {
                Noisy a("a");      // ctor a
                Noisy b = a;       // copy-ctor a'
                Noisy c("c");      // ctor c
                c = a;             // copy-assign c = a
                show(a);           // show a          (no copy any more)
            }                      // dtor a (c), dtor a' (b), dtor a (a)
          `,
          dry: { head: ['Line', 'Special member', 'Live objects (bottom→top)', 'Printed'], rows: [
            ['<code>Noisy a("a")</code>', 'ctor', 'a', 'ctor a'],
            ['<code>Noisy b = a</code>', H.c('g', 'copy-ctor'), 'a, b(a\')', 'copy-ctor a\''],
            ['<code>Noisy c("c")</code>', 'ctor', 'a, b, c', 'ctor c'],
            ['<code>c = a</code>', H.c('b', 'copy-assign'), 'a, b, c(now "a")', 'copy-assign c = a'],
            ['<code>show(a)</code> (fixed)', 'none', 'a, b, c', 'show a'],
            ['<code>}</code>', H.c('r', 'dtor ×3'), '(empty)', 'dtor a, dtor a\', dtor a']
          ] },
          complexity: `<p>Fixed version: 3 constructions + 3 destructions. Original: 4 + 4. Each avoided copy saves one heap allocation for the <code>std::string</code> (unless it fits the small-string buffer).</p>`,
          followUps: ['What would change if <code>show</code> returned its parameter by value?', 'Add a move constructor and call <code>show(Noisy("t"))</code> with the by-value version: what prints?', 'Why does <code>c</code> print <code>dtor a</code> and not <code>dtor c</code>?']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 2 — Shallow vs deep copy
     ====================================================================== */
  topics.push({
    title: 'Shallow vs Deep Copy: Copying the Address vs Copying the House',
    analogy: `<p>You have a house and a slip of paper with its address. <b>Shallow copy</b> = photocopying the <i>slip of paper</i>. Now two people hold an address, but there is still <b>one house</b>. If one person paints the door red, the other sees a red door too. If one person <b>demolishes</b> the house, the other is holding an address that points at rubble — and if they try to demolish it again, chaos.</p>
      <p><b>Deep copy</b> = building a <b>second, identical house</b> and giving the new person that address. Each person can paint or demolish their own house without ever affecting the other.</p>`,
    explain: `<p>When a class owns memory through a <b>raw pointer</b>, the pointer is just a number (an address). The compiler-generated copy constructor copies members one by one, so it copies that <b>number</b> — not the memory it points to. That is a <b>shallow copy</b>.</p>
      ${H.table(['', 'a.data', 'b.data', 'Heap blocks'], [
        ['After shallow copy', '0x1000', H.c('r', '0x1000'), 'one block "hi" shared by both'],
        ['After deep copy', '0x1000', H.c('g', '0x2000'), 'two blocks: "hi" and "hi"']
      ])}
      <p><b>Three bugs come from a shallow copy of an owning pointer:</b></p>
      <ol>
        <li><b>Aliasing:</b> writing through <code>b</code> changes what <code>a</code> sees. Surprising "spooky" edits.</li>
        <li><b>Dangling pointer:</b> when <code>b</code> is destroyed its destructor frees the block. <code>a.data</code> now points at freed memory; reading it is <b>use-after-free</b> (undefined behaviour).</li>
        <li><b>Double free:</b> when <code>a</code> is destroyed it frees the same block <b>again</b>. glibc usually aborts with <code>free(): double free detected</code>; in the worst case it corrupts the heap silently and becomes a security hole.</li>
      </ol>
      <p><b>A deep copy</b> allocates a fresh block and copies the <b>contents</b>:</p>
      ${H.arr(['h', 'i', '\\0'], { label: 'a.data @0x1000' })}
      ${H.arr(['h', 'i', '\\0'], { label: 'b.data @0x2000 (new)', hl: { 0: 'g', 1: 'g', 2: 'g' } })}
      <p><b>When is shallow fine?</b> When the pointer does <b>not own</b> what it points at (a non-owning observer, like a <code>Node*</code> parent link or a <code>string_view</code>), or when sharing is the <b>intended</b> design (<code>std::shared_ptr</code> deliberately shares and counts owners). The question to ask is always: <b>"Who deletes this?"</b> If the answer is "each object deletes its own", you need a deep copy (or you must forbid copying).</p>
      <p><b>The modern shortcut:</b> <code>std::string</code>, <code>std::vector</code> and friends already deep-copy correctly. If your class stores those instead of raw pointers, the compiler-generated copy is automatically deep and correct. That is the Rule of Zero (next topic).</p>`,
    clues: [
      '"Class has a raw pointer member and a destructor that deletes it" → shallow copy bug unless copy ctor/assignment are written or deleted',
      '"Program crashes with <code>double free</code> / <code>free(): invalid pointer</code> at the end of main" → two objects own the same block',
      '"Changing one object changed the other" → aliasing from a shallow copy',
      '"Implement a String / Vector / Matrix class" → interviewer is checking that you deep-copy and handle self-assignment',
      '"Clone an object graph / linked list with random pointers" → deep copy with a map from old node to new node',
      '"Copy-on-write" or "share until someone writes" → controlled shallow copy with a reference count'
    ],
    code: [R`
      // A tiny string-like buffer that owns heap memory through a raw pointer.
      #include <cstring>
      #include <iostream>
      #include <utility>

      class Buffer {
          char*       data_;   // OWNS a heap block (we must delete[] it)
          std::size_t size_;
      public:
          explicit Buffer(const char* s) : data_(new char[std::strlen(s) + 1]), size_(std::strlen(s)) {
              std::memcpy(data_, s, size_ + 1);              // copy the text, including '\0'
          }
          ~Buffer() { delete[] data_; }                       // we own it, so we free it

          // DEEP copy constructor: brand-new block, copy the CONTENTS
          Buffer(const Buffer& other) : data_(new char[other.size_ + 1]), size_(other.size_) {
              std::memcpy(data_, other.data_, size_ + 1);
          }

          // DEEP copy assignment: allocate first (may throw), then release old, then commit
          Buffer& operator=(const Buffer& other) {
              if (this == &other) return *this;               // self-assignment guard
              char* fresh = new char[other.size_ + 1];         // if this throws, *this is untouched
              std::memcpy(fresh, other.data_, other.size_ + 1);
              delete[] data_;                                  // now it is safe to drop the old block
              data_ = fresh;
              size_ = other.size_;
              return *this;
          }

          void set(std::size_t i, char c) { data_[i] = c; }
          const char* c_str() const { return data_; }
      };

      int main() {
          Buffer a("hi");
          Buffer b = a;          // deep copy: b gets its own block
          b.set(0, 'J');
          std::cout << a.c_str() << ' ' << b.c_str() << '\n';   // hi Ji
      }                          // b frees its block, a frees its block: no double free
    `, R`
      // The BUGGY shallow version: compiler-generated copy copies the pointer value only.
      #include <cstring>
      class ShallowBuffer {
          char* data_;
      public:
          explicit ShallowBuffer(const char* s) : data_(new char[std::strlen(s) + 1]) { std::strcpy(data_, s); }
          ~ShallowBuffer() { delete[] data_; }
          // No copy constructor / assignment written -> memberwise copy of data_ (an address)
      };
      int main() {
          ShallowBuffer a("hi");
          ShallowBuffer b = a;   // b.data_ == a.data_  (same block!)
      }                          // ~b deletes the block, ~a deletes it AGAIN -> double free (UB)
    `],
    codeTitle: ['Correct deep copy (copy ctor + copy assignment)', 'The shallow-copy bug (compiles fine, crashes at runtime)'],
    viz: {
      title: 'Shallow vs deep copy: who points at which heap block?',
      input: 'shallow hi',
      inputLabel: 'Mode and text: "shallow hi" or "deep hi" (text up to 8 letters)',
      gen: function (input) {
        var m = String(input || '').trim().match(/^(shallow|deep)\s+([A-Za-z]{1,8})$/i);
        if (!m) throw new Error('Type "shallow hi" or "deep hi" (text: 1–8 letters)');
        var deep = m[1].toLowerCase() === 'deep', text = m[2];
        var frames = [];
        var A = text.split(''), B = text.split('');
        var addrA = '0x1000', addrB = deep ? '0x2000' : '0x1000';
        function g(stage, hl, ehl, tags) {
          var nodes = [{ id: 'a', label: 'a.data', x: 14, y: 12, shape: 'box' }, { id: 'hA', label: 'block @0x1000', x: 70, y: 12, shape: 'box' }];
          var edges = [['a', 'hA', addrA]];
          if (stage >= 1) {
            nodes.push({ id: 'b', label: 'b.data', x: 14, y: 42, shape: 'box' });
            if (deep) { nodes.push({ id: 'hB', label: 'block @0x2000', x: 70, y: 42, shape: 'box' }); edges.push(['b', 'hB', addrB]); }
            else edges.push(['b', 'hA', addrB]);
          }
          return { type: 'graph', label: 'Stack objects (left) → heap blocks (right)', directed: true, height: 54, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
        }
        function heap(lbl, arr, cls) { var h = {}; arr.forEach(function (_, i) { if (cls) h[i] = cls; }); return { type: 'array', label: lbl, values: arr.concat(['\\0']), hl: h }; }
        var code = 'Buffer a("' + text + '");\nBuffer b = a;        // ' + (deep ? 'deep copy ctor' : 'compiler-generated (shallow)') + '\nb.set(0, \'J\');\n}  // ~b runs\n   // ~a runs';
        frames.push({ narr: '<code>Buffer a("' + esc(text) + '")</code> allocates a heap block at 0x1000 and stores its address in <code>a.data</code>. a <b>owns</b> that block: its destructor will <code>delete[]</code> it.', parts: [
          { type: 'code', label: 'Code', lang: 'cpp', code: code, hl: { 1: 'cur' } }, g(0, { hA: 'ok' }), heap('heap block @0x1000', A, 'ok'), { type: 'vars', label: 'Pointer values', vals: { 'a.data': addrA } } ] });
        if (deep) {
          frames.push({ narr: '<code>Buffer b = a;</code> runs <b>our deep copy constructor</b>: it calls <code>new char[]</code> for a <b>fresh block at 0x2000</b> and copies the letters. Two owners, two blocks.', parts: [
            { type: 'code', label: 'Code', lang: 'cpp', code: code, hl: { 2: 'cur' } }, g(1, { hB: 'ok', b: 'ok' }, { 'b-hB': 'ok' }), heap('block @0x1000 (a)', A), heap('block @0x2000 (b) — new', B, 'ok'), { type: 'vars', label: 'Pointer values', vals: { 'a.data': addrA, 'b.data': addrB }, hl: { 'b.data': 'ok' } } ] });
        } else {
          frames.push({ narr: '<code>Buffer b = a;</code> uses the <b>compiler-generated</b> copy constructor: it copies each member. <code>data</code> is just a number, so b gets the <b>same address 0x1000</b>. Two owners, <span class="c-r">one block</span>.', parts: [
            { type: 'code', label: 'Code', lang: 'cpp', code: code, hl: { 2: 'bad' } }, g(1, { hA: 'bad', b: 'cur' }, { 'b-hA': 'bad' }, { hA: '2 owners!' }), heap('block @0x1000 (shared!)', A, 'cur'), { type: 'vars', label: 'Pointer values', vals: { 'a.data': addrA, 'b.data': addrB }, hl: { 'a.data': 'bad', 'b.data': 'bad' } } ] });
        }
        B[0] = 'J'; if (!deep) A[0] = 'J';
        frames.push({ narr: '<code>b.set(0, \'J\')</code> writes through <code>b.data</code>. ' + (deep ? 'Only b\'s block changes. a still reads <b>"' + esc(text) + '"</b> — independent objects, as users expect.' : '<span class="c-r">a changes too!</span> a now reads <b>"' + esc(A.join('')) + '"</b> even though nobody touched a. This is <b>aliasing</b>.'), parts: [
          { type: 'code', label: 'Code', lang: 'cpp', code: code, hl: { 3: deep ? 'ok' : 'bad' } }, g(1, deep ? { hB: 'cur' } : { hA: 'bad' }),
          deep ? heap('block @0x1000 (a) — untouched', A, 'ok') : heap('block @0x1000 seen by a AND b', A, 'bad'), deep ? heap('block @0x2000 (b)', B, 'cur') : note('a.c_str() and b.c_str() both print <b>' + esc(A.join('')) + '</b>', 'Output'),
          out((deep ? text : A.join('')) + ' ' + B.join('')) ] });
        frames.push({ narr: 'End of scope: objects die in reverse order, so <b>~b runs first</b> and calls <code>delete[] data</code>. ' + (deep ? 'It frees block 0x2000 — b\'s own block. a is unaffected.' : 'It frees block 0x1000… <span class="c-r">but a still points there</span>: a.data is now a <b>dangling pointer</b>.'), parts: [
          { type: 'code', label: 'Code', lang: 'cpp', code: code, hl: { 4: deep ? 'ok' : 'bad' } }, g(1, deep ? { hB: 'done', b: 'done' } : { hA: 'bad', b: 'done' }, deep ? {} : { 'a-hA': 'bad' }, deep ? { hB: 'freed' } : { hA: 'FREED' }),
          { type: 'stack', label: 'Live objects', items: ['a'], hl: { 0: deep ? 'ok' : 'bad' } } ] });
        frames.push({ narr: '<b>~a runs</b> and calls <code>delete[] data</code>. ' + (deep ? 'It frees block 0x1000, the one only a owned. <span class="c-g">Every block freed exactly once.</span>' : '<span class="c-r">It frees 0x1000 a SECOND time → double free.</span> Undefined behaviour: glibc typically aborts with <code>free(): double free detected in tcache 2</code>; AddressSanitizer reports <code>attempting double-free</code>.'), parts: [
          { type: 'code', label: 'Code', lang: 'cpp', code: code, hl: { 5: deep ? 'ok' : 'bad' } }, g(1, deep ? { hA: 'done', hB: 'done', a: 'done', b: 'done' } : { hA: 'bad', a: 'bad' }, {}, deep ? { hA: 'freed', hB: 'freed' } : { hA: 'freed TWICE' }),
          { type: 'stack', label: 'Live objects', items: [] } ] });
        frames.push({ narr: deep ? '<b>Deep copy wins:</b> 2 allocations, 2 frees, no aliasing. The cost is one extra allocation + copy per copy — which is why moves (next topic) exist.' : '<b>Fix:</b> write a deep copy constructor + copy assignment (Rule of Three), or forbid copying with <code>= delete</code>, or — best — replace <code>char*</code> with <code>std::string</code> and write nothing (Rule of Zero). Try input <code>deep ' + esc(text) + '</code>.', parts: [
          { type: 'table', label: 'Scorecard', columns: ['', 'shallow', 'deep'], rows: [['allocations', '1', '2'], ['frees attempted', '2 (double free!)', '2'], ['writes leak across objects?', 'yes', 'no'], ['cost per copy', 'O(1) (copy a pointer)', 'O(n) (copy the bytes)']], hl: { 1: deep ? 'ok' : 'bad' } } ] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Spot the bug: a Matrix with a raw pointer',
        html: `<p>The class below has a destructor that frees <code>cells</code> but no copy operations. <code>Matrix m2 = m1;</code> compiles, then the program aborts at the closing brace with a double free. Any time you see <b>"raw owning pointer + destructor + no copy constructor"</b>, the bug is already there; it only waits for the first copy (passing by value, pushing into a vector, returning by value without elision).</p>`,
        code: R`
          struct Matrix {
              int rows, cols;
              double* cells;                                    // owning raw pointer
              Matrix(int r, int c) : rows(r), cols(c), cells(new double[r * c]{}) {}
              ~Matrix() { delete[] cells; }                     // frees...
              // ...but no copy ctor / copy assignment -> shallow copies -> double free
          };
          int main() {
              Matrix m1(2, 2);
              Matrix m2 = m1;   // BUG: m2.cells == m1.cells
          }                     // double free here
        `
      },
      {
        title: 'Shallow is correct for non-owning pointers',
        html: `<p>A tree node's <code>parent</code> pointer does <b>not</b> own the parent; the parent owns its children. Copying a <code>Node</code> should copy children deeply but must <b>not</b> clone the parent. The question "who deletes this?" tells you which members to deep-copy (owning ones) and which to copy shallowly (observers). Using <code>std::unique_ptr</code> for owned children and a raw pointer for the observing parent link makes the intent visible in the types.</p>`,
        code: R`
          struct Node {
              int value = 0;
              Node* parent = nullptr;                          // observer: never deleted by Node
              std::vector<std::unique_ptr<Node>> children;     // owners: deleted automatically
          };
        `
      },
      {
        title: 'Deep copy of a linked list (the interview classic)',
        html: `<p>Copying a list by copying the head pointer gives two "lists" that share every node. A deep copy walks the list and creates a <b>new node per old node</b>. With random pointers (LeetCode 138), map old → new with an <code>unordered_map&lt;Node*, Node*&gt;</code> so each node is cloned exactly once.</p>`,
        code: R`
          struct LNode { int val; LNode* next; };
          LNode* deepCopy(const LNode* head) {
              LNode dummy{0, nullptr};
              LNode* tail = &dummy;
              for (const LNode* p = head; p; p = p->next) {
                  tail->next = new LNode{p->val, nullptr};   // NEW node for every old node
                  tail = tail->next;
              }
              return dummy.next;
          }
        `
      },
      {
        title: 'Why std::string makes the problem disappear',
        html: `<p>Replace <code>char* data_</code> with <code>std::string data_</code>. Now the compiler-generated copy constructor calls <code>std::string</code>'s copy constructor, which deep-copies. The generated destructor calls <code>~string</code>. You write <b>zero</b> special members and get correct deep copies, moves and cleanup. This is the most important practical lesson of the whole topic.</p>`,
        code: R`
          class SafeBuffer {
              std::string data_;                // owns its chars; copies deeply by itself
          public:
              explicit SafeBuffer(std::string s) : data_(std::move(s)) {}
              void set(std::size_t i, char c) { data_[i] = c; }
          };
          int main() { SafeBuffer a("hi"); SafeBuffer b = a; b.set(0, 'J'); }   // a stays "hi"
        `
      }
    ],
    deepDive: `<p><b>Why the compiler cannot guess.</b> A <code>T*</code> member could be owning, observing, an array, a single object, or a pointer into someone else's buffer. The type alone does not say, so the default is the only safe mechanical choice: copy the bits. Ownership must be expressed by <i>you</i> — through code (Rule of Three) or, better, through types (<code>unique_ptr</code> = sole owner and non-copyable, <code>shared_ptr</code> = shared owner, raw <code>T*</code>/<code>T&amp;</code> = non-owning observer, per the C++ Core Guidelines R.3).</p>
      <p><b>Detecting the bug.</b> Compile with <code>-fsanitize=address -g</code>: ASan reports <code>heap-use-after-free</code> for the aliasing read and <code>attempting double-free</code> with both allocation and free stack traces. Valgrind's memcheck says <code>Invalid free() / delete / delete[]</code>. clang-tidy's <code>cppcoreguidelines-special-member-functions</code> and <code>bugprone-*</code> checks flag a class with a destructor but default copy operations.</p>
      <p><b>Deep copy cost.</b> Copying an n-byte buffer is O(n) time and one allocation. That is why C++11 added move semantics (steal the pointer, O(1)) and why old libraries used <b>copy-on-write</b> (share the block with a reference count, clone only on the first write). C++11 effectively banned COW for <code>std::string</code> (because <code>operator[]</code> must not invalidate references and the reference count needs atomics in multi-threaded code); libstdc++ switched to SSO (small string optimization: up to 15 chars stored inline, no heap at all) in GCC 5.</p>
      <p><b>Polymorphic deep copy.</b> If a class holds <code>std::unique_ptr&lt;Shape&gt;</code>, deep copying needs a virtual <code>clone()</code> because the copier does not know the dynamic type — the "virtual constructor" idiom (topic 4 practice). C++26 adds <code>std::indirect&lt;T&gt;</code> and <code>std::polymorphic&lt;T&gt;</code>: value-semantic owning wrappers that deep copy automatically, removing most hand-written clone code.</p>
      <p><b>Exception safety of copy assignment.</b> The order "allocate new → copy → delete old → commit" gives the <b>strong guarantee</b>: if <code>new</code> throws, the object is unchanged. The naive "delete old → allocate new" leaves a dangling pointer if <code>new</code> throws, and breaks self-assignment outright.</p>`,
    aiEra: `<p><b>What AI changes:</b> when asked for "a simple dynamic array class", LLMs still frequently emit a raw <code>int*</code> with a destructor and no copy operations, or a copy assignment that deletes before allocating. The code looks textbook-clean and passes a single-object test.</p>
      <p><b>Use AI as a partner:</b> <code>Write a test that copies this object, mutates the copy, and checks the original is unchanged; then run it under -fsanitize=address.</code> Ask: <code>For each pointer member in this class, is it owning or observing? Justify.</code> That forces the ownership question the model skipped.</p>
      <p><b>Where AI goes wrong:</b> mixing up <code>delete</code> and <code>delete[]</code>, forgetting the <code>'\\0'</code> terminator byte in string buffers, writing deep copy for the constructor but leaving assignment shallow, or "fixing" a double free by removing the <code>delete</code> (turning a crash into a leak).</p>
      <p><b>What you must still own:</b> the ownership model. Reviewers and interviewers expect you to look at any class and say in one sentence who frees each resource — and to prefer <code>std::string</code>/<code>std::vector</code>/<code>unique_ptr</code> so the question answers itself.</p>`,
    problems: [
      {
        title: 'Fix the Double Free in IntArray',
        level: 'Medium', tags: ['deep copy', 'rule of three', 'self-assignment'], companies: ['Amazon', 'Qualcomm', 'Nvidia'],
        statement: `<p><code>IntArray</code> owns a heap array of <code>n</code> ints through a raw pointer and frees it in its destructor. Copying it currently crashes. Add a <b>deep copy constructor</b> and a <b>deep, self-assignment-safe, exception-safe copy assignment</b> so that copies are fully independent.</p>`,
        constraints: `<p>Keep the raw pointer (this is an exercise in writing the members). 0 ≤ n ≤ 10<sup>6</sup>. Copy assignment must leave the target unchanged if allocation throws.</p>`,
        example: `<p><code>IntArray a(3); a[0] = 7; IntArray b = a; b[0] = 9;</code> → ${H.c('g', 'a[0] is still 7')}, b[0] is 9. <code>a = a;</code> → ${H.c('g', 'a unchanged')}. At the end of main ${H.c('g', 'each block is freed exactly once')}.</p>`,
        brute: {
          why: `<p>The given class relies on the compiler-generated copy members, which copy the <b>address</b> only. Both objects then delete the same block → double free. A tempting "fix" in assignment — <code>delete[] data; data = new int[o.n];</code> — breaks on self-assignment (it deletes the source before copying) and leaves a dangling pointer if <code>new</code> throws.</p>`,
          code: R`
            #include <algorithm>
            #include <cstddef>
            class IntArray {
                int* data;
                std::size_t n;
            public:
                explicit IntArray(std::size_t size) : data(new int[size]{}), n(size) {}
                ~IntArray() { delete[] data; }
                int& operator[](std::size_t i) { return data[i]; }
                // BUGGY assignment someone added:
                IntArray& operator=(const IntArray& o) {
                    delete[] data;                      // self-assignment: o.data is gone too!
                    data = new int[o.n];                // if this throws, data dangles
                    std::copy(o.data, o.data + o.n, data);
                    n = o.n;
                    return *this;
                }
                // copy constructor still missing -> shallow
            };
          `
        },
        mcq: { q: 'In copy assignment, what is the safest order of operations?', options: ['Allocate + copy into a temporary, then delete old, then commit', 'Delete old, then allocate and copy', 'Copy the pointer, then delete the source', 'Skip delete; let the destructor do it'], answer: 0, explain: 'Doing the work that can throw (allocation) first means a failure leaves *this untouched (strong guarantee) and self-assignment still works because the source is read before anything is freed.' },
        hints: [
          `<p>Hint 1: the copy constructor runs on a <b>newborn</b> object: there is nothing old to free. Just allocate <code>o.n</code> ints and copy them.</p>`,
          `<p>Hint 2: for assignment, build the new block <b>first</b> into a local pointer, copy into it, then <code>delete[]</code> the old block and adopt the new one.</p>`,
          `<p>Hint 3: handle <code>n == 0</code> (still allocate <code>new int[0]</code> or use nullptr consistently), return <code>*this</code>, and optionally guard <code>if (this == &amp;o)</code> as a fast path. Even simpler: copy-and-swap.</p>`
        ],
        tests: { sig: 'int[] -> long[]', fn: 'ia',
          harness: { cpp: "vector<long long> ia(vector<int> vals) { size_t n = vals.size(); IntArray a(n); for (size_t i = 0; i < n; ++i) a[i] = vals[i];\n  IntArray b = a; if (n) b[0] = 999; IntArray c(1); c = a; if (n) c[n - 1] = -999; IntArray& ref = a; a = ref;\n  vector<long long> r = {(long long)a.size(), (long long)b.size(), (long long)c.size()}; for (size_t i = 0; i < n; ++i) r.push_back(a[i]); for (size_t i = 0; i < n; ++i) r.push_back(b[i]); for (size_t i = 0; i < n; ++i) r.push_back(c[i]); return r; }" }, cases: [
          [[[1,2,3]], [3,3,3,1,2,3,999,2,3,1,2,-999]],
          [[[7]], [1,1,1,7,999,-999]],
          [[[]], [0,0,0]],
          [[[5,5,5,5]], [4,4,4,5,5,5,5,999,5,5,5,5,5,5,-999]],
          [[[-1,0,1]], [3,3,3,-1,0,1,999,0,1,-1,0,-999]],
          [[[2147483647,-2147483648]], [2,2,2,2147483647,-2147483648,999,-2147483648,2147483647,-999]],
          [[[3,1]], [2,2,2,3,1,999,1,3,-999]],
          [[{"$range":[0,300000]}], {"$concat":[[300000,300000,300000],{"$range":[0,300000]},[999],{"$range":[1,300000]},{"$range":[0,299999]},[-999]]}]
        ] },
        solution: {
          approach: `<p>Write the <b>Rule of Three</b>: destructor (already there), deep copy constructor, deep copy assignment. The assignment uses "allocate-copy-then-release", which is both self-assignment safe and strongly exception safe. Alternative: copy-and-swap (take the parameter by value, swap members) gives the same guarantees in 3 lines.</p>`,
          code: R`
            #include <algorithm>
            #include <cstddef>
            #include <utility>
            #include <iostream>
            class IntArray {
                int* data;
                std::size_t n;
            public:
                explicit IntArray(std::size_t size) : data(new int[size]{}), n(size) {}
                ~IntArray() { delete[] data; }

                // Deep copy constructor: new block, copy the contents.
                IntArray(const IntArray& o) : data(new int[o.n]), n(o.n) {
                    std::copy(o.data, o.data + o.n, data);
                }

                // Deep copy assignment: allocate + copy first (may throw), then release old.
                IntArray& operator=(const IntArray& o) {
                    if (this == &o) return *this;          // fast path, not required for correctness
                    int* fresh = new int[o.n];             // throws? *this untouched (strong guarantee)
                    std::copy(o.data, o.data + o.n, fresh);
                    delete[] data;                         // safe now: o.data was already read
                    data = fresh;
                    n = o.n;
                    return *this;
                }

                int& operator[](std::size_t i) { return data[i]; }
                const int& operator[](std::size_t i) const { return data[i]; }
                std::size_t size() const { return n; }
            };

            int main() {
                IntArray a(3);
                a[0] = 7;
                IntArray b = a;     // deep copy
                b[0] = 9;
                a = a;              // self-assignment is harmless
                std::cout << a[0] << ' ' << b[0] << '\n';   // 7 9
            }

          `,
          alt: [R`
            // Same class using copy-and-swap for assignment (strong guarantee, self-assignment safe).
            #include <algorithm>
            #include <cstddef>
            #include <utility>
            class IntArray {
                int* data;
                std::size_t n;
            public:
                explicit IntArray(std::size_t size) : data(new int[size]{}), n(size) {}
                ~IntArray() { delete[] data; }
                IntArray(const IntArray& o) : data(new int[o.n]), n(o.n) { std::copy(o.data, o.data + o.n, data); }
                friend void swap(IntArray& x, IntArray& y) noexcept { std::swap(x.data, y.data); std::swap(x.n, y.n); }
                IntArray& operator=(IntArray o) {   // by value: the copy happens here (may throw before we touch *this)
                    swap(*this, o);                 // never throws
                    return *this;                   // o (holding our old block) is destroyed now
                }
            };
          `]
          ,
          dry: { head: ['Step', 'a.data', 'b.data', 'Heap blocks', 'Note'], rows: [
            ['<code>IntArray a(3)</code>', '0x10', '—', '0x10 = [0,0,0]', 'a owns 0x10'],
            ['<code>a[0] = 7</code>', '0x10', '—', '0x10 = [7,0,0]', ''],
            ['<code>IntArray b = a</code>', '0x10', H.c('g', '0x20'), '0x10, 0x20 = [7,0,0]', 'deep copy ctor'],
            ['<code>b[0] = 9</code>', '0x10', '0x20', '0x20 = [9,0,0]', H.c('g', 'a unaffected')],
            ['<code>a = a</code>', '0x10', '0x20', 'unchanged', 'guard returns early'],
            ['<code>}</code>', 'freed', 'freed', 'none', H.c('g', 'each freed once')]
          ] },
          complexity: `<p>Copy constructor and assignment: O(n) time, O(n) extra memory. Destructor O(1) for ints. Self-assignment: O(1) with the guard.</p>`,
          followUps: ['Add a move constructor and move assignment (Rule of Five).', 'Rewrite with <code>std::vector&lt;int&gt;</code> and delete all special members (Rule of Zero).', 'What does <code>std::copy</code> become for ints under -O2? (memmove)']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 3 — Rule of 3 / 5 / 0 (+ move semantics, copy-and-swap, =default/=delete)
     ====================================================================== */
  topics.push({
    title: 'Rule of 3 / 5 / 0: Moves, Copy-and-Swap, =default and =delete',
    analogy: `<p>Moving house. A <b>copy</b> is buying identical new furniture for the new flat — slow and expensive, and the old flat stays furnished. A <b>move</b> is loading <i>your</i> furniture into a van and taking it — fast, and the old flat is left <b>empty but still a valid flat</b> (you can furnish it again later).</p>
      <p>The rules are like a landlord's checklist: <b>Rule of Three</b> — if you install a custom lock (destructor), you must also handle duplicate keys (copy ctor, copy assignment). <b>Rule of Five</b> — add the van (move ctor, move assignment). <b>Rule of Zero</b> — rent a furnished flat managed by a professional company (<code>std::string</code>, <code>std::vector</code>, <code>unique_ptr</code>) and you never deal with any of it.</p>`,
    explain: `<p>There are <b>six</b> special member functions. The compiler may write each one for you:</p>
      ${H.table(['#', 'Member', 'Signature'], [
        ['1', 'Default constructor', '<code>T()</code>'],
        ['2', 'Destructor', '<code>~T()</code>'],
        ['3', 'Copy constructor', '<code>T(const T&amp;)</code>'],
        ['4', 'Copy assignment', '<code>T&amp; operator=(const T&amp;)</code>'],
        ['5', 'Move constructor', '<code>T(T&amp;&amp;) noexcept</code>'],
        ['6', 'Move assignment', '<code>T&amp; operator=(T&amp;&amp;) noexcept</code>']
      ])}
      <p><b>Moves in one paragraph.</b> <code>T&amp;&amp;</code> is an <b>rvalue reference</b>: it binds to objects that are about to die (temporaries) or that you have explicitly given up with <code>std::move(x)</code>. <code>std::move</code> does <b>not move anything</b> — it is just a cast that says "you may steal from this". The move constructor then steals the pointer (O(1)) and sets the source's pointer to <code>nullptr</code> so the source's destructor does nothing harmful.</p>
      <p><b>The three rules:</b></p>
      <ul>
        <li><b>Rule of Three (C++98):</b> if you write <i>any</i> of destructor / copy constructor / copy assignment, you almost certainly need <i>all three</i> — because you are managing a resource by hand.</li>
        <li><b>Rule of Five (C++11):</b> same idea, plus move constructor and move assignment. If you declare a destructor or a copy operation, the compiler <b>stops generating moves</b>, and "moves" silently fall back to copies.</li>
        <li><b>Rule of Zero (best practice):</b> design classes so they need <i>none</i> of them. Let members that already manage themselves (<code>std::string</code>, <code>std::vector</code>, <code>std::unique_ptr</code>) do the work. Only small, dedicated resource-wrapper classes should ever write the five.</li>
      </ul>
      <p><b>What the compiler generates when you declare something</b> (Howard Hinnant's famous table, simplified):</p>
      ${H.table(['You declare…', 'copy ctor / copy =', 'move ctor / move =', 'default ctor'], [
        ['nothing', H.c('g', 'defaulted'), H.c('g', 'defaulted'), H.c('g', 'defaulted')],
        ['any constructor', 'defaulted', 'defaulted', H.c('r', 'not declared')],
        ['destructor', H.c('y', 'defaulted (deprecated)'), H.c('r', 'NOT declared → copies used'), 'defaulted'],
        ['copy ctor or copy =', 'the other one: defaulted (deprecated)', H.c('r', 'NOT declared → copies used'), 'copy ctor: not declared'],
        ['move ctor or move =', H.c('r', 'deleted'), 'the other one: not declared', 'move ctor: not declared']
      ])}
      <p><b><code>= default</code> and <code>= delete</code></b> let you state intent explicitly. <code>T(const T&amp;) = delete;</code> makes a type <b>non-copyable</b> (like <code>std::unique_ptr</code>, <code>std::mutex</code>, <code>std::thread</code>). <code>~T() = default;</code> keeps the type trivial where possible. If you write one of the five, write or <code>=default</code>/<code>=delete</code> all five, so a reader never has to remember the table.</p>
      <p><b>Copy-and-swap</b> is the easiest correct way to write assignment: take the parameter <b>by value</b> (which copies or moves into it), <code>swap</code> your guts with it, and let it die carrying your old state. One function handles both copy and move assignment, is self-assignment safe, and gives the strong exception guarantee.</p>`,
    clues: [
      '"Implement a class that manages a resource (file handle, socket, buffer)" → Rule of Five, or make it move-only with <code>= delete</code> copies',
      '"My class has a destructor; why is <code>vector</code> copying instead of moving it?" → user-declared destructor suppresses implicit moves',
      '"Why must the move constructor be <code>noexcept</code>?" → <code>vector</code> reallocation uses <code>std::move_if_noexcept</code>; otherwise it copies',
      '"What state is an object in after being moved from?" → valid but unspecified; destructor and assignment must still work',
      '"Write an assignment operator that is exception-safe" → copy-and-swap / allocate-before-release',
      '"Prevent copying of this class" → <code>T(const T&amp;) = delete; T&amp; operator=(const T&amp;) = delete;</code>',
      '"Rule of Zero" / "prefer composition of RAII members" in a code-review question'
    ],
    code: [R`
      // Rule of FIVE done right: a minimal owning string.
      #include <cstring>
      #include <iostream>
      #include <utility>

      class MyString {
          char*       p_ = nullptr;
          std::size_t n_ = 0;
      public:
          MyString() = default;                                        // empty string
          explicit MyString(const char* s) : p_(new char[std::strlen(s) + 1]), n_(std::strlen(s)) {
              std::memcpy(p_, s, n_ + 1);
          }
          ~MyString() { delete[] p_; }                                  // 1. destructor

          MyString(const MyString& o)                                   // 2. copy ctor (deep)
              : p_(o.p_ ? new char[o.n_ + 1] : nullptr), n_(o.n_) {
              if (p_) std::memcpy(p_, o.p_, n_ + 1);
          }

          MyString(MyString&& o) noexcept                               // 3. move ctor: steal, then empty the source
              : p_(std::exchange(o.p_, nullptr)), n_(std::exchange(o.n_, 0)) {}

          // 4 + 5. ONE assignment for both copy and move (copy-and-swap / "unified assignment").
          MyString& operator=(MyString other) noexcept {                // other was copied OR moved into
              swap(*this, other);                                       // take its guts, give it ours
              return *this;                                             // other dies with our old buffer
          }

          friend void swap(MyString& a, MyString& b) noexcept {
              std::swap(a.p_, b.p_);
              std::swap(a.n_, b.n_);
          }
          const char* c_str() const { return p_ ? p_ : ""; }
          std::size_t size() const { return n_; }
      };

      int main() {
          MyString a("hello");
          MyString b = a;                 // copy ctor: new buffer
          MyString c = std::move(a);      // move ctor: c steals a's buffer, a is now empty
          b = c;                          // copy-assign via copy-and-swap
          c = MyString("tmp");            // move-assign: the temporary is moved into 'other'
          std::cout << '[' << a.c_str() << "] " << b.c_str() << ' ' << c.c_str() << '\n';   // [] hello tmp
      }
    `, R`
      // Rule of ZERO: no special members written at all, yet copy, move and cleanup are all correct.
      #include <memory>
      #include <string>
      #include <vector>

      class Document {
          std::string                 title_;     // copies deeply, moves cheaply
          std::vector<std::string>    lines_;     // same
          std::shared_ptr<const std::string> font_;   // shared on purpose
      public:
          Document(std::string t, std::shared_ptr<const std::string> f) : title_(std::move(t)), font_(std::move(f)) {}
          void add(std::string line) { lines_.push_back(std::move(line)); }
      };

      // Move-only resource wrapper (like unique_ptr): copies deleted, moves allowed.
      class FileHandle {
          std::FILE* f_ = nullptr;
      public:
          explicit FileHandle(const char* path) : f_(std::fopen(path, "r")) {}
          ~FileHandle() { if (f_) std::fclose(f_); }
          FileHandle(const FileHandle&) = delete;                 // no copies: two closers = double fclose
          FileHandle& operator=(const FileHandle&) = delete;
          FileHandle(FileHandle&& o) noexcept : f_(std::exchange(o.f_, nullptr)) {}
          FileHandle& operator=(FileHandle&& o) noexcept {
              if (this != &o) { if (f_) std::fclose(f_); f_ = std::exchange(o.f_, nullptr); }
              return *this;
          }
          explicit operator bool() const { return f_ != nullptr; }
      };
    `],
    codeTitle: ['Rule of Five with copy-and-swap', 'Rule of Zero, and a move-only Rule-of-Five wrapper'],
    viz: [{
      title: 'What does the compiler generate? (type what YOU declare)',
      input: 'dtor',
      inputLabel: 'User-declared members, comma separated: ctor, default, dtor, copy-ctor, copy-assign, move-ctor, move-assign (or "none")',
      gen: function (input) {
        var raw = String(input || '').trim().toLowerCase();
        if (!raw) throw new Error('Type e.g. "dtor" or "copy-ctor, dtor" or "none"');
        var ok = { 'ctor': 1, 'default': 1, 'dtor': 1, 'copy-ctor': 1, 'copy-assign': 1, 'move-ctor': 1, 'move-assign': 1, 'none': 1 };
        var d = {};
        raw.split(/[\s,]+/).filter(Boolean).forEach(function (w) { if (!ok[w]) throw new Error('Unknown "' + w + '". Use: ctor, default, dtor, copy-ctor, copy-assign, move-ctor, move-assign, none'); if (w !== 'none') d[w] = true; });
        var anyCtor = d.ctor || d['copy-ctor'] || d['move-ctor'];
        var anyMove = d['move-ctor'] || d['move-assign'];
        var rows = [], frames = [], status = {};
        function st(name, val, why) { status[name] = val; rows.push([name, val, why]); }
        var order = [
          ['default ctor', function () {
            if (d['default']) return ['user-declared', 'you wrote T()'];
            if (anyCtor) return ['not declared', 'you declared another constructor, so the compiler will not invent T()'];
            return ['defaulted', 'no constructors declared → implicit T()'];
          }],
          ['destructor', function () { return d.dtor ? ['user-declared', 'you wrote ~T()'] : ['defaulted', 'always generated unless you write one']; }],
          ['copy ctor', function () {
            if (d['copy-ctor']) return ['user-declared', 'you wrote T(const T&)'];
            if (anyMove) return ['DELETED', 'declaring a move operation deletes the implicit copies'];
            if (d.dtor || d['copy-assign']) return ['defaulted (deprecated)', 'still generated for C++98 compatibility, but deprecated — it is probably wrong for your resource'];
            return ['defaulted', 'memberwise copy'];
          }],
          ['copy assign', function () {
            if (d['copy-assign']) return ['user-declared', 'you wrote operator=(const T&)'];
            if (anyMove) return ['DELETED', 'declaring a move operation deletes the implicit copies'];
            if (d.dtor || d['copy-ctor']) return ['defaulted (deprecated)', 'still generated, but deprecated'];
            return ['defaulted', 'memberwise copy assignment'];
          }],
          ['move ctor', function () {
            if (d['move-ctor']) return ['user-declared', 'you wrote T(T&&)'];
            if (d['copy-ctor'] || d['copy-assign'] || d['move-assign'] || d.dtor) return ['not declared', 'a user-declared dtor/copy/move-assign suppresses it → rvalues will use the COPY ctor'];
            return ['defaulted', 'memberwise move'];
          }],
          ['move assign', function () {
            if (d['move-assign']) return ['user-declared', 'you wrote operator=(T&&)'];
            if (d['copy-ctor'] || d['copy-assign'] || d['move-ctor'] || d.dtor) return ['not declared', 'suppressed → rvalue assignment uses COPY assignment'];
            return ['defaulted', 'memberwise move assignment'];
          }]
        ];
        function cls(v) { return v === 'DELETED' || v === 'not declared' ? 'bad' : v.indexOf('deprecated') >= 0 ? 'cur' : v === 'user-declared' ? 'sel' : 'ok'; }
        var declared = Object.keys(d);
        frames.push({ narr: 'You declared: <b>' + (declared.length ? esc(declared.join(', ')) : 'nothing') + '</b>. Now we ask the compiler, one special member at a time, whether it will write it for you.', parts: [
          { type: 'set', label: 'User-declared', items: declared.length ? declared : ['(none)'] },
          { type: 'table', label: 'Special members', columns: ['member', 'status', 'why'], rows: [] }
        ] });
        order.forEach(function (o) {
          var r = o[1](); st(o[0], r[0], r[1]);
          var hl = {}; rows.forEach(function (row, i) { hl[i] = cls(row[1]); });
          frames.push({ narr: '<b>' + o[0] + '</b> → <b>' + esc(r[0]) + '</b>: ' + esc(r[1]) + '.', parts: [
            { type: 'set', label: 'User-declared', items: declared.length ? declared : ['(none)'] },
            { type: 'table', label: 'Special members', columns: ['member', 'status', 'why'], rows: rows.map(function (x) { return x.slice(); }), hl: hl }
          ] });
        });
        var mc = status['move ctor'], cc = status['copy ctor'];
        var what = mc === 'user-declared' || mc === 'defaulted' ? 'the <b>move constructor</b> runs (cheap)' : cc === 'DELETED' ? '<span class="c-r">compile error</span> (move not declared and copy deleted)' : '<span class="c-r">the COPY constructor runs</span> — overload resolution falls back to <code>const T&amp;</code>, silently paying for a deep copy';
        var copyWhat = cc === 'DELETED' ? '<span class="c-r">compile error: copy is deleted</span> (type is move-only)' : 'the copy constructor runs';
        frames.push({ narr: 'Consequences. <code>T b = std::move(a);</code> → ' + what + '. <code>T b = a;</code> → ' + copyWhat + '.', parts: [
          { type: 'table', label: 'Final verdict', columns: ['expression', 'what happens'], rows: [['T b = std::move(a);', what.replace(/<[^>]+>/g, '')], ['T b = a;', copyWhat.replace(/<[^>]+>/g, '')]], hl: { 0: mc === 'user-declared' || mc === 'defaulted' ? 'ok' : 'bad', 1: cc === 'DELETED' ? 'bad' : 'ok' } },
          note(declared.length === 0 ? '<b>Rule of Zero</b>: you declared nothing, so everything is generated and correct as long as your members manage themselves.' : (d.dtor && !anyMove) ? '<b>Classic trap:</b> adding just a destructor (even <code>~T() {}</code> for logging) kills the implicit moves. Fix: also write <code>T(T&amp;&amp;) noexcept = default;</code> and <code>T&amp; operator=(T&amp;&amp;) noexcept = default;</code> (and then default the copies too, since declaring moves deletes them).' : '<b>Rule of Five:</b> whenever you declare any of these, explicitly declare (write, <code>= default</code> or <code>= delete</code>) all five so the reader never needs this table.', 'Advice')
        ] });
        return frames;
      }
    }, {
      title: 'vector growth: move or copy? (why move must be noexcept)',
      input: 'noexcept 4',
      inputLabel: '"noexcept N" or "throwing N" (N = elements already in a full vector, 1–6)',
      gen: function (input) {
        var m = String(input || '').trim().match(/^(noexcept|throwing)\s+(\d)$/i);
        if (!m || +m[2] < 1 || +m[2] > 6) throw new Error('Type "noexcept 4" or "throwing 4" (N from 1 to 6)');
        var ne = m[1].toLowerCase() === 'noexcept', n = +m[2], frames = [];
        var old = []; for (var i = 0; i < n; i++) old.push('S' + i);
        var cap = n * 2, fresh = [];
        frames.push({ narr: 'The vector is <b>full</b>: size ' + n + ' = capacity ' + n + '. <code>push_back</code> needs room, so it allocates a new block of capacity ' + cap + ' and must transfer the old elements.', parts: [
          { type: 'array', label: 'old block (capacity ' + n + ')', values: old.slice(), hl: {} },
          { type: 'array', label: 'new block (capacity ' + cap + ')', values: new Array(cap).fill('·') },
          { type: 'vars', label: 'Type traits', vals: { 'is_nothrow_move_constructible': ne ? 'true' : 'false', 'strategy': ne ? 'move' : 'copy' }, hl: { strategy: ne ? 'ok' : 'bad' } }
        ] });
        frames.push({ narr: 'The standard demands the <b>strong guarantee</b> for <code>push_back</code>: if anything throws, the vector must look untouched. ' + (ne ? 'Moves are <code>noexcept</code>, so they cannot fail half-way. vector uses <code>std::move_if_noexcept</code> → <b>move</b>.' : 'Your move constructor might throw. If the 3rd move threw, the first two old elements would already be gutted and could not be restored. So <code>std::move_if_noexcept</code> picks the <b>copy constructor</b> instead.'), parts: [
          { type: 'code', label: 'libstdc++ idea', lang: 'cpp', code: 'for (each element e in old block)\n    ::new (dst) T(std::move_if_noexcept(e));\n// move_if_noexcept(e) yields T&& only if T(T&&) is noexcept\n// (or T is not copyable); otherwise const T&', hl: { 2: ne ? 'ok' : 'bad' } }
        ] });
        for (var k = 0; k < n; k++) {
          var hl = {}; hl[k] = ne ? 'bad' : 'cur';
          if (ne) old[k] = '(moved)';
          fresh[k] = 'S' + k;
          var arr = fresh.slice(); while (arr.length < cap) arr.push('·');
          var hn = {}; hn[k] = 'ok';
          frames.push({ narr: (ne ? 'Move S' + k + ': steal its pointer (O(1), no allocation).' : 'Copy S' + k + ': allocate + copy its contents (O(len)). The old S' + k + ' stays intact in case a later copy throws.'), parts: [
            { type: 'array', label: 'old block', values: old.slice(), hl: hl },
            { type: 'array', label: 'new block', values: arr, hl: hn }
          ] });
        }
        frames.push({ narr: 'Destroy the old elements and free the old block, then construct the new element at index ' + n + '. Total: ' + (ne ? n + ' cheap moves' : '<span class="c-r">' + n + ' full deep copies</span>') + '. With strings of 1 KB each and a million elements, that is the difference between microseconds and a gigabyte of copying.', parts: [
          { type: 'array', label: 'new block after push_back', values: fresh.concat(['NEW']).concat(new Array(cap - n - 1).fill('·')), hl: one(n, 'sel') },
          { type: 'table', label: 'Lesson', columns: ['move ctor', 'vector reallocation does'], rows: [['noexcept (or = default with noexcept members)', 'moves'], ['may throw / not declared', 'copies']], hl: { 0: ne ? 'ok' : '', 1: ne ? '' : 'bad' } }
        ] });
        return frames;
      }
    }],
    examples: [
      {
        title: 'The logging destructor that made everything slow',
        html: `<p>A developer added <code>~Order() { log("destroyed"); }</code> to a class holding a <code>std::vector&lt;Item&gt;</code>. Implicit moves vanished, so every <code>std::move(order)</code> and every vector reallocation now <b>deep-copies</b> all items. No compile error, no warning by default. Fix: <code>Order(Order&amp;&amp;) noexcept = default; Order&amp; operator=(Order&amp;&amp;) noexcept = default;</code> plus defaulted copies.</p>`,
        code: R`
          struct Item { std::string name; };
          struct Order {
              std::vector<Item> items;
              ~Order() { std::cout << "destroyed\n"; }                    // suppresses implicit moves!
              Order() = default;
              Order(const Order&) = default;                              // restore copies explicitly
              Order& operator=(const Order&) = default;
              Order(Order&&) noexcept = default;                          // restore cheap moves
              Order& operator=(Order&&) noexcept = default;
          };
          static_assert(std::is_nothrow_move_constructible_v<Order>);
        `
      },
      {
        title: 'Moved-from objects are still alive',
        html: `<p>After <code>std::string t = std::move(s);</code>, <code>s</code> is in a <b>valid but unspecified</b> state (for <code>std::string</code> it is empty in practice). You may assign to it, call <code>clear()</code>, or let it be destroyed. Do not rely on its value. Your own move constructor must leave the source destructible — that is why we set the source pointer to <code>nullptr</code> with <code>std::exchange</code>.</p>`,
        code: R`
          int main() {
              std::string s = "a fairly long string that lives on the heap";
              std::string t = std::move(s);   // t steals the buffer
              s = "reused";                   // fine: assigning to a moved-from object is allowed
              std::cout << t.size() << ' ' << s << '\n';
          }
        `
      },
      {
        title: 'Non-copyable but movable: the unique_ptr pattern',
        html: `<p>Some resources must have exactly one owner: a file descriptor, a mutex lock, a GPU buffer, a thread. Delete the copy operations and provide noexcept moves. Now <code>std::vector&lt;FileHandle&gt;</code> works (it moves), returning a <code>FileHandle</code> from a factory works (elision/move), and accidental copies are <b>compile errors</b> instead of double-closes.</p>`,
        code: R`
          class Socket {
              int fd_ = -1;
          public:
              explicit Socket(int fd) : fd_(fd) {}
              ~Socket() { if (fd_ >= 0) { /* close(fd_) */ } }
              Socket(const Socket&) = delete;
              Socket& operator=(const Socket&) = delete;
              Socket(Socket&& o) noexcept : fd_(std::exchange(o.fd_, -1)) {}
              Socket& operator=(Socket&& o) noexcept { std::swap(fd_, o.fd_); return *this; }
          };
          int main() {
              std::vector<Socket> v;
              v.push_back(Socket(3));      // moved in
              // Socket copy = v[0];       // would not compile: copy is deleted
          }
        `
      },
      {
        title: 'Why copy-and-swap handles self-assignment for free',
        html: `<p><code>a = a;</code> with <code>operator=(MyString other)</code>: <code>other</code> is a <b>fresh copy</b> of <code>a</code> made before the body runs. Swapping <code>a</code> with that copy and destroying the copy leaves <code>a</code> with identical content. Nothing was ever deleted while still being read. The price: a self-assignment does a full (wasted) copy, and copy assignment can no longer reuse an existing buffer that is big enough — <code>std::vector</code>'s own operator= avoids copy-and-swap for exactly that performance reason.</p>`
      }
    ],
    deepDive: `<p><b>Exact implicit-declaration rules (C++11 onward).</b> The move constructor is implicitly declared only if there is no user-declared copy constructor, copy assignment, move assignment, or destructor. A defaulted move is defined as <i>deleted</i> if some member cannot be moved (and is then ignored by overload resolution, so copy is used). Declaring any move operation makes the implicit copy constructor and copy assignment <b>deleted</b>. The implicit copies in the presence of a user destructor are <i>deprecated</i> (since C++11) — GCC warns with <code>-Wdeprecated-copy-dtor</code>.</p>
      <p><b>"User-declared" vs "user-provided".</b> <code>~T() = default;</code> is user-<i>declared</i> (so it still suppresses moves!) but not user-<i>provided</i> (so the destructor can still be trivial). This subtle distinction surprises even experienced engineers.</p>
      <p><b>noexcept matters beyond vector.</b> <code>std::move_if_noexcept</code>, <code>std::vector::resize/reserve/push_back</code>, and <code>std::swap</code>'s conditional noexcept all propagate. Defaulted moves are noexcept iff every member's move is. Check with <code>static_assert(std::is_nothrow_move_constructible_v&lt;T&gt;)</code>. Note that <code>std::deque</code>, <code>std::list</code> and node-based maps never relocate elements, so they do not care.</p>
      <p><b>Move assignment and self-move.</b> The standard library only promises that <code>x = std::move(x)</code> leaves <code>x</code> in a valid-but-unspecified state; your types should at least not crash. The "steal then null" implementation without a check would free its own buffer, hence the <code>if (this != &amp;o)</code> or the swap-based implementation.</p>
      <p><b>Copy-and-swap trade-offs.</b> It is correct and short but always allocates on copy assignment. High-performance containers reuse capacity: if <code>this-&gt;capacity() &gt;= other.size()</code>, copy element-wise in place (basic guarantee instead of strong). Know both and say which guarantee you chose. <b>Hidden friend swap</b> (a <code>friend</code> defined inside the class) is found by ADL and keeps <code>std::swap</code> fast for your type.</p>
      <p><b>Rule of Zero in production.</b> Google, LLVM and Chromium style guides push resource management into a handful of wrapper types (<code>unique_ptr</code> with custom deleters, <code>absl::Cleanup</code>, scope guards) so that 99% of classes declare no special members at all. C++ Core Guidelines C.20: "If you can avoid defining default operations, do"; C.21: "If you define or =delete any copy, move, or destructor function, define or =delete them all".</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants generate Rule-of-Five boilerplate instantly, which is great — and dangerous, because hand-written special members are exactly where subtle bugs hide (missing <code>noexcept</code>, moved-from source not nulled, copy assignment that leaks on throw). Less code you did not need is the best code: ask for the Rule-of-Zero version first.</p>
      <p><b>Use AI as a partner:</b> <code>Rewrite this class so it needs no user-declared special members. If a raw resource is unavoidable, wrap it in a unique_ptr with a custom deleter.</code> Or: <code>Add static_asserts checking this type is nothrow-move-constructible and not copyable.</code> Then let the compiler, not the model, be the judge.</p>
      <p><b>Where AI goes wrong:</b> writing <code>T(T&amp;&amp; o) : p(o.p) {}</code> without nulling <code>o.p</code> (double free), omitting <code>noexcept</code>, marking a move "noexcept" while calling something that throws (→ <code>std::terminate</code>), and adding a destructor "for logging" while forgetting it suppresses moves.</p>
      <p><b>What you must still own:</b> the implicit-generation table, the meaning of <code>std::move</code> (a cast), the moved-from contract, and the judgement of when a type should be copyable, move-only, or neither. These are senior-level C++ interview staples.</p>`,
    problems: [
      {
        title: 'Make Buffer Move-Aware (Rule of Five) Without Breaking Copies',
        level: 'Medium', tags: ['rule of five', 'move semantics', 'noexcept'], companies: ['Bloomberg', 'Citadel', 'Google'],
        statement: `<p>You are given a correct Rule-of-Three <code>Buffer</code> (deep copy ctor, deep copy assignment, destructor). Profiling shows <code>std::vector&lt;Buffer&gt;</code> spends most of its time copying during reallocation. Add a <b>move constructor</b> and <b>move assignment</b> so that reallocations and <code>std::move</code> are O(1), and prove with <code>static_assert</code> that vector will actually use them.</p>`,
        constraints: `<p>Keep the existing behaviour of copies. Moved-from Buffers must be safely destructible and assignable. No exceptions may escape the moves.</p>`,
        example: `<p><code>Buffer a(1000); Buffer b = std::move(a);</code> → ${H.c('g', 'no allocation')}; <code>b.size()==1000</code>, <code>a.size()==0</code>. <code>std::vector&lt;Buffer&gt; v; for 1e5 push_backs</code> → reallocations ${H.c('g', 'move pointers instead of copying bytes')}.</p>`,
        brute: {
          why: `<p>Without move members, the user-declared destructor and copies suppress the implicit moves, so <code>std::move(a)</code> binds to <code>const Buffer&amp;</code> and deep-copies. Every vector reallocation copies every byte of every buffer: O(total bytes) per growth.</p>`,
          code: R`
            #include <algorithm>
            #include <cstddef>
            class Buffer {
                int* d_; std::size_t n_;
            public:
                explicit Buffer(std::size_t n) : d_(new int[n]{}), n_(n) {}
                ~Buffer() { delete[] d_; }
                Buffer(const Buffer& o) : d_(new int[o.n_]), n_(o.n_) { std::copy(o.d_, o.d_ + n_, d_); }
                Buffer& operator=(const Buffer& o) {
                    if (this != &o) { int* f = new int[o.n_]; std::copy(o.d_, o.d_ + o.n_, f); delete[] d_; d_ = f; n_ = o.n_; }
                    return *this;
                }
                std::size_t size() const { return n_; }
            };
            static_assert(!std::is_nothrow_move_constructible_v<Buffer>);   // moves fall back to (throwing) copies
          `
        },
        mcq: { q: 'Your move constructor is correct but NOT marked noexcept. What does <code>std::vector</code> do on reallocation?', options: ['Copies the elements (if copyable)', 'Moves them anyway', 'Fails to compile', 'Calls std::terminate'], answer: 0, explain: '<code>std::move_if_noexcept</code> chooses the copy constructor when the move might throw and a copy is available, to keep the strong exception guarantee.' },
        hints: [
          `<p>Hint 1: a move constructor takes <code>Buffer&amp;&amp; o</code>, copies <code>o</code>'s pointer and size, and then <b>empties</b> <code>o</code> so its destructor does nothing harmful.</p>`,
          `<p>Hint 2: <code>std::exchange(o.d_, nullptr)</code> returns the old value and sets the new one in one step. Mark both moves <code>noexcept</code> — they only shuffle pointers.</p>`,
          `<p>Hint 3: move assignment must free <i>this</i> object's old block first (or swap so the source frees it) and must survive <code>x = std::move(x)</code>. Finish with <code>static_assert(std::is_nothrow_move_constructible_v&lt;Buffer&gt;)</code>.</p>`
        ],
        tests: { sig: 'int int -> long[]', fn: 'bf',
          harness: { cpp: "vector<long long> bf(int n, int m) { Buffer a(n); Buffer b = std::move(a); vector<Buffer> v; for (int i = 0; i < m; ++i) v.emplace_back(n + i); long long tot = 0; for (auto& x : v) tot += x.size();\n  Buffer c(b); Buffer d(3); d = std::move(b); Buffer e(5); e = c; Buffer& rr = e; e = std::move(rr); vector<Buffer> w = v; return {(long long)a.size(), (long long)c.size(), (long long)d.size(), (long long)v.size(), tot, (long long)w.size(), w.empty() ? 0 : (long long)w.back().size()}; }" }, cases: [
          [[1000,100], [0,1000,1000,100,104950,100,1099]],
          [[0,0], [0,0,0,0,0,0,0]],
          [[1,1], [0,1,1,1,1,1,1]],
          [[5,0], [0,5,5,0,0,0,0]],
          [[0,10], [0,0,0,10,45,10,9]],
          [[10,3], [0,10,10,3,33,3,12]],
          [[100000,20], [0,100000,100000,20,2000190,20,100019]],
          [[7,1000], [0,7,7,1000,506500,1000,1006]]
        ] },
        solution: {
          approach: `<p>Add the two move members. The move constructor <b>steals</b> (<code>std::exchange</code>) and leaves the source as an empty buffer. Move assignment <b>swaps</b> with the source: the source now owns our old block and frees it when it dies; self-move is harmless because swapping with yourself is a no-op. Both are <code>noexcept</code>, so <code>std::vector</code> will move during reallocation.</p>`,
          code: R`
            #include <algorithm>
            #include <cstddef>
            #include <utility>
            #include <vector>
            class Buffer {
                int* d_ = nullptr;
                std::size_t n_ = 0;
            public:
                explicit Buffer(std::size_t n) : d_(new int[n]{}), n_(n) {}
                ~Buffer() { delete[] d_; }                                   // delete[] nullptr is fine

                Buffer(const Buffer& o) : d_(new int[o.n_]), n_(o.n_) { std::copy(o.d_, o.d_ + n_, d_); }
                Buffer& operator=(const Buffer& o) {
                    if (this != &o) { int* f = new int[o.n_]; std::copy(o.d_, o.d_ + o.n_, f); delete[] d_; d_ = f; n_ = o.n_; }
                    return *this;
                }

                // NEW: move constructor — steal and leave the source empty.
                Buffer(Buffer&& o) noexcept
                    : d_(std::exchange(o.d_, nullptr)), n_(std::exchange(o.n_, 0)) {}

                // NEW: move assignment — swap; the source will free our old block.
                Buffer& operator=(Buffer&& o) noexcept {
                    std::swap(d_, o.d_);
                    std::swap(n_, o.n_);
                    return *this;
                }

                std::size_t size() const { return n_; }
            };
            static_assert(std::is_nothrow_move_constructible_v<Buffer>);
            static_assert(std::is_nothrow_move_assignable_v<Buffer>);

            int main() {
                Buffer a(1000);
                Buffer b = std::move(a);                 // O(1), no allocation
                std::vector<Buffer> v;
                for (int i = 0; i < 100; ++i) v.emplace_back(1000);   // reallocations MOVE
                std::cout << a.size() << ' ' << b.size() << ' ' << v.size() << '\n';   // 0 1000 100
            }

          `,
          dry: { head: ['Statement', 'a.d_ / a.n_', 'b.d_ / b.n_', 'Allocations so far'], rows: [
            ['<code>Buffer a(1000)</code>', '0xA0 / 1000', '—', '1'],
            ['<code>Buffer b = std::move(a)</code>', H.c('y', 'nullptr / 0'), H.c('g', '0xA0 / 1000'), '1 (stolen, not copied)'],
            ['<code>v.emplace_back</code> #1', '', '', '2 (buffer) + 1 (vector)'],
            ['vector grows 1→2', '', '', 'old element <b>moved</b>, 0 int copies'],
            ['end of main', 'delete[] nullptr (no-op)', 'delete[] 0xA0', 'all freed once']
          ] },
          complexity: `<p>Move ctor / move assign: O(1), no allocation. Copy: O(n). Pushing m buffers of size k into a vector: O(m·k) for the buffers themselves + O(m) pointer moves amortized for reallocation (instead of O(m·k) copies per growth).</p>`,
          followUps: ['Rewrite Buffer as Rule of Zero using <code>std::vector&lt;int&gt;</code> or <code>std::unique_ptr&lt;int[]&gt;</code> + size.', 'What happens if move assignment uses steal-then-null without a self-check and you write <code>b = std::move(b)</code>?', 'Implement copy assignment that reuses the existing block when it is already large enough.']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 4 — Virtual functions, vtables and vptr
     ====================================================================== */
  topics.push({
    title: 'Virtual Functions: How vtables and the vptr Pick the Right Function',
    analogy: `<p>A hotel has a universal <b>"Room Service"</b> button in every room. The front desk does not know who is in the room; it just looks at a <b>card stuck to the room's door</b> that says which menu that guest ordered from (vegetarian, kids, VIP). The desk reads the card, opens <i>that</i> menu at line 2 ("dinner"), and sends the right dish.</p>
      <p>In C++ the card on the door is the <b>vptr</b> (a hidden pointer inside every object of a class with virtual functions), the menus are the <b>vtables</b> (one per class, shared by all its objects), and "line 2" is the fixed <b>slot number</b> of the function. The caller never needs to know the guest's real type.</p>`,
    explain: `<p><b>Static vs dynamic binding.</b> Normally the compiler picks which function to call by looking at the <b>declared type</b> of the expression (static binding). With <code>virtual</code>, the choice is made at <b>run time</b> by the <b>actual type of the object</b> (dynamic binding). That only happens when you call through a <b>pointer or reference</b> to a base class.</p>
      ${H.table(['Call', 'Declared type', 'Actual object', 'Non-virtual calls…', 'Virtual calls…'], [
        ['<code>Shape* p = new Circle; p-&gt;area()</code>', 'Shape*', 'Circle', 'Shape::area', H.c('g', 'Circle::area')],
        ['<code>Shape&amp; r = sq; r.area()</code>', 'Shape&amp;', 'Square', 'Shape::area', H.c('g', 'Square::area')],
        ['<code>Shape s = sq; s.area()</code>', 'Shape (a copy)', 'Shape (sliced!)', 'Shape::area', 'Shape::area']
      ])}
      <p><b>How it really works (what g++/clang generate):</b></p>
      <ol>
        <li>For every class that has (or inherits) a virtual function, the compiler builds <b>one vtable</b>: a static array of function pointers, one slot per virtual function, in declaration order. A derived class copies its base's table and <b>overwrites the slots it overrides</b>; new virtuals are appended.</li>
        <li>Every <b>object</b> of such a class gets a hidden first member, the <b>vptr</b>, pointing to its class's vtable. The constructor sets it.</li>
        <li>A call <code>p-&gt;area()</code> becomes roughly <code>(*(p-&gt;vptr)[slot_of_area])(p)</code>: load the vptr, load the function pointer from the slot, call it with <code>this = p</code>.</li>
      </ol>
      ${H.table(['Slot', 'Shape vtable', 'Circle vtable', 'Square vtable'], [
        ['0–1', '~Shape', '~Circle', '~Square'],
        ['2', 'Shape::area', H.c('g', 'Circle::area'), H.c('g', 'Square::area')],
        ['3', 'Shape::name', H.c('m', 'Shape::name (inherited)'), H.c('g', 'Square::name')]
      ])}
      <p><b>Keywords you should always use:</b> <code>override</code> on every overriding function (the compiler errors if it does not actually override — catches typos and missing <code>const</code>); <code>final</code> to forbid further overriding or derivation (also lets the compiler devirtualize). <code>virtual</code> on the override is redundant once you write <code>override</code>.</p>
      <p><b>Cost:</b> one extra pointer per object (8 bytes on 64-bit), one vtable per class, and each virtual call is an <b>indirect call</b> that usually cannot be inlined. That is tiny for business logic and noticeable in a hot inner loop over millions of small objects.</p>`,
    clues: [
      '"How does C++ implement runtime polymorphism?" → vtable per class, vptr per object, indirect call through a slot',
      '"What is <code>sizeof</code> of a class with one virtual function and one int?" → 16 on 64-bit (8-byte vptr + 4 int + 4 padding)',
      '"Base pointer, derived object, which function is called?" → virtual: derived version; non-virtual: base version',
      '"Different types must respond to the same call differently" (shapes, payment methods, plugins) → virtual interface',
      '"Why use <code>override</code>?" → compile-time check that you really override (signature, const, ref-qualifiers)',
      '"Virtual call is slow in a hot loop" → <code>final</code>, CRTP, <code>std::variant</code>, or sort objects by type',
      '"Default argument in a virtual function" puzzles → defaults are chosen by the STATIC type'
    ],
    code: [R`
      #include <iostream>
      #include <memory>
      #include <string>
      #include <vector>

      struct Shape {
          virtual ~Shape() = default;                                   // virtual dtor (topic 6)
          virtual double area() const { return 0.0; }                   // slot: area
          virtual std::string name() const { return "shape"; }          // slot: name
          void describe() const {                                       // NOT virtual: always Shape::describe
              std::cout << name() << " with area " << area() << '\n';  // ...but the calls INSIDE are virtual
          }
      };

      struct Circle : Shape {
          double r;
          explicit Circle(double radius) : r(radius) {}
          double area() const override { return 3.14159 * r * r; }      // overrides slot 'area'
          // name() not overridden -> Circle's vtable reuses Shape::name
      };

      struct Square final : Shape {                                     // final: nobody can derive from Square
          double s;
          explicit Square(double side) : s(side) {}
          double area() const override { return s * s; }
          std::string name() const override { return "square"; }
      };

      int main() {
          std::vector<std::unique_ptr<Shape>> shapes;
          shapes.push_back(std::make_unique<Circle>(1.0));
          shapes.push_back(std::make_unique<Square>(2.0));
          for (const auto& sp : shapes) sp->describe();                // shape with area 3.14159 / square with area 4
          std::cout << sizeof(Shape) << '\n';                           // 8: just the vptr
      }
    `],
    codeTitle: ['Dynamic dispatch through a base pointer'],
    viz: {
      title: 'Follow the vptr: dynamic dispatch step by step',
      input: 'Circle: area name describe delete',
      inputLabel: 'Dynamic type (Shape, Circle or Square) then calls: area, name, describe, delete',
      gen: function (input) {
        var m = String(input || '').trim().match(/^(Shape|Circle|Square)\s*:\s*([a-z\s,]+)$/i);
        if (!m) throw new Error('Format: "Circle: area name describe delete" (types: Shape, Circle, Square)');
        var T = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
        var calls = m[2].split(/[\s,]+/).filter(Boolean).map(function (c) { return c.toLowerCase(); });
        if (!calls.length || calls.length > 6) throw new Error('Give 1 to 6 calls');
        calls.forEach(function (c) { if (['area', 'name', 'describe', 'delete'].indexOf(c) < 0) throw new Error('Unknown call "' + c + '". Use area, name, describe, delete'); });
        if (calls.indexOf('delete') >= 0 && calls.indexOf('delete') !== calls.length - 1) throw new Error('"delete" must be the last call');
        var VT = {
          Shape: [['[-2]', 'offset-to-top = 0'], ['[-1]', 'typeinfo for Shape'], ['[0]', '~Shape() complete'], ['[1]', '~Shape() deleting'], ['[2]', 'Shape::area'], ['[3]', 'Shape::name']],
          Circle: [['[-2]', 'offset-to-top = 0'], ['[-1]', 'typeinfo for Circle'], ['[0]', '~Circle() complete'], ['[1]', '~Circle() deleting'], ['[2]', 'Circle::area'], ['[3]', 'Shape::name (inherited)']],
          Square: [['[-2]', 'offset-to-top = 0'], ['[-1]', 'typeinfo for Square'], ['[0]', '~Square() complete'], ['[1]', '~Square() deleting'], ['[2]', 'Square::area'], ['[3]', 'Square::name']]
        };
        var lines = ['struct Shape {', '    virtual ~Shape() = default;', '    virtual double area() const { return 0; }', '    virtual std::string name() const { return "shape"; }', '    void describe() const { cout << name() << " " << area(); }  // non-virtual', '};', 'struct Circle : Shape {  double r = 1;', '    double area() const override { return 3.14159 * r * r; }', '};                       // name() inherited', 'struct Square : Shape {  double s = 2;', '    double area() const override { return s * s; }', '    std::string name() const override { return "square"; }', '};', 'Shape* p = new ' + T + ';'];
        var callLine = {};
        calls.forEach(function (c, i) { lines.push(c === 'delete' ? 'delete p;' : 'p->' + c + '();'); callLine[i] = lines.length; });
        var code = lines.join('\n');
        var fnLine = { 'Shape::area': 3, 'Shape::name': 4, 'Circle::area': 8, 'Square::area': 11, 'Square::name': 12 };
        var res = { 'Shape::area': '0', 'Circle::area': '3.14159', 'Square::area': '4', 'Shape::name': 'shape', 'Square::name': 'square' };
        var slotOf = { area: 4, name: 5, 'delete': 3 };
        var target = function (c) { var e = VT[T][slotOf[c]][1]; return e.replace(' (inherited)', ''); };
        var frames = [], output = [];
        function graph(stage, fn) {
          var hl = {}, ehl = {}, nodes = [
            { id: 'p', label: 'Shape* p', x: 9, y: 30, shape: 'box' },
            { id: 'obj', label: T + ' object', x: 31, y: 30, shape: 'box' },
            { id: 'vShape', label: 'vtable Shape', x: 58, y: 8, shape: 'box' },
            { id: 'vCircle', label: 'vtable Circle', x: 58, y: 30, shape: 'box' },
            { id: 'vSquare', label: 'vtable Square', x: 58, y: 52, shape: 'box' }
          ];
          var edges = [['p', 'obj', 'points to'], ['obj', 'v' + T, 'vptr']];
          if (fn) { nodes.push({ id: 'fn', label: fn, x: 88, y: 30, shape: 'box' }); edges.push(['v' + T, 'fn', 'slot']); }
          hl['v' + T] = stage >= 2 ? 'cur' : 'win';
          if (stage >= 1) { hl.obj = 'cur'; ehl['obj-v' + T] = 'cur'; ehl['p-obj'] = 'ok'; }
          if (stage >= 3 && fn) { hl.fn = 'ok'; ehl['v' + T + '-fn'] = 'ok'; }
          return { type: 'graph', label: 'Pointer → object → vptr → vtable → function', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl, ehl: ehl };
        }
        function vt(slot, cls) { var h = {}; if (slot !== undefined) h[slot] = cls || 'cur'; return { type: 'table', label: 'vtable of ' + T + ' (Itanium C++ ABI layout, used by g++/clang)', columns: ['slot', 'entry'], rows: VT[T].map(function (r) { return r.slice(); }), hl: h }; }
        function cf(hlMap) { return { type: 'code', label: 'Program', lang: 'cpp', code: code, hl: hlMap }; }
        frames.push({ narr: '<code>new ' + T + '</code> builds the object. Its constructor stores the address of <b>' + T + '\'s vtable</b> in the hidden <b>vptr</b>. <code>p</code> is declared <code>Shape*</code>, but the object knows its real type through the vptr.', parts: [cf(one(14, 'ok')), graph(1), vt(), { type: 'vars', label: 'Memory of *p (64-bit)', vals: { 'offset 0: vptr': '&vtable for ' + T + ' + 16', 'offset 8': T === 'Circle' ? 'double r = 1' : T === 'Square' ? 'double s = 2' : '(nothing)', 'sizeof': T === 'Shape' ? '8' : '16' } }] });
        function dispatch(c, lineHl, why) {
          var fn = target(c);
          frames.push({ narr: (why || '') + '<code>' + c + '()</code> is <b>virtual</b>, so the compiler cannot hard-code the target. Step 1: load the vptr stored inside <code>*p</code>.', parts: [cf(lineHl), graph(2), vt()] });
          frames.push({ narr: 'Step 2: <code>' + c + '</code> always lives at slot <b>' + VT[T][slotOf[c]][0] + '</b> in every table of this hierarchy. Read the function pointer there: <b>' + esc(VT[T][slotOf[c]][1]) + '</b>.', parts: [cf(lineHl), graph(2, fn), vt(slotOf[c], 'cur'), { type: 'text', label: 'Machine-level (x86-64)', html: '<code>mov rax, [rdi]</code> ; load vptr<br><code>call [rax + ' + ((slotOf[c] - 2) * 8) + ']</code> ; indirect call through slot' }] });
          var h = {}; Object.keys(lineHl).forEach(function (k) { h[k] = lineHl[k]; }); h[fnLine[fn]] = 'ok';
          output.push(res[fn]);
          frames.push({ narr: 'Step 3: jump to <b>' + esc(fn) + '</b> with <code>this = p</code>. ' + (VT[T][slotOf[c]][1].indexOf('inherited') >= 0 ? T + ' did not override <code>' + c + '</code>, so its slot still holds the base version.' : '') + ' Result: <b>' + esc(res[fn]) + '</b>.', parts: [cf(h), graph(3, fn), vt(slotOf[c], 'ok'), out(output.join('\n'))] });
        }
        calls.forEach(function (c, i) {
          var L = one(callLine[i], 'cur');
          if (c === 'area' || c === 'name') dispatch(c, L);
          else if (c === 'describe') {
            var h = one(callLine[i], 'cur'); h[5] = 'sel';
            frames.push({ narr: '<code>describe()</code> is <b>not virtual</b>: the compiler binds it statically to <b>Shape::describe</b> — a plain direct <code>call</code>, no vtable lookup. (Hiding a non-virtual function in a derived class would NOT change this call.)', parts: [cf(h), graph(1, 'Shape::describe'), vt(), { type: 'text', label: 'Machine-level', html: '<code>call Shape::describe</code> ; address known at link time' }] });
            dispatch('name', h, 'Inside <code>describe</code>, <code>name()</code> means <code>this-&gt;name()</code>, a virtual call. ');
            dispatch('area', h, 'Next, <code>this-&gt;area()</code>: also virtual. ');
          } else {
            var dh = one(callLine[i], 'bad');
            frames.push({ narr: '<code>delete p</code>: the destructor is virtual, so delete goes through slot <b>[1] (deleting destructor)</b> of ' + T + '\'s vtable. That runs the right destructor chain and then frees memory with the right size.', parts: [cf(dh), graph(2, '~' + T + '()'), vt(3, 'bad')] });
            var chain = T === 'Shape' ? ['~Shape()'] : ['~' + T + '()', '~Shape()'];
            frames.push({ narr: 'Destructors run from most-derived to base: <b>' + chain.join(' → ') + '</b>, then <code>operator delete</code>. Without a virtual destructor only <code>~Shape</code> would run (undefined behaviour — topic 6).', parts: [cf(dh), { type: 'stack', label: 'Destructor calls (top runs first)', items: chain.slice().reverse(), hl: one(chain.length - 1, 'bad') }, out(output.join('\n'))] });
          }
        });
        frames.push({ narr: 'Summary: every virtual call = <b>load vptr → load slot → indirect call</b>. Two memory loads plus a jump the CPU must predict. The caller only ever knew <code>Shape*</code>.', parts: [{ type: 'table', label: 'Calls made', columns: ['call', 'binding', 'ran'], rows: calls.map(function (c) { return [c === 'delete' ? 'delete p' : 'p->' + c + '()', c === 'describe' ? 'static (non-virtual)' : 'dynamic (vtable)', c === 'describe' ? 'Shape::describe' : c === 'delete' ? '~' + T : target(c)]; }) }, out(output.join('\n'))] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Predict the output: forgetting virtual',
        html: `<p>With <code>speak()</code> <b>not</b> virtual, <code>a-&gt;speak()</code> is bound to <code>Animal::speak</code> at compile time, because <code>a</code>'s declared type is <code>Animal*</code>. The derived function merely <b>hides</b> the base one; it does not override it. Output: <b>"..."</b>. Add <code>virtual</code> and the output becomes <b>"Woof"</b>.</p>
          ${H.table(['speak() is…', 'd.speak()', 'a-&gt;speak()'], [['non-virtual', 'Woof', H.c('r', '...')], ['virtual', 'Woof', H.c('g', 'Woof')]])}`,
        code: R`
          struct Animal { void speak() const { std::cout << "...\n"; } };         // NOT virtual
          struct Dog : Animal { void speak() const { std::cout << "Woof\n"; } };  // hides, does not override
          int main() {
              Dog d;
              Animal* a = &d;
              d.speak();    // Woof   (static type Dog)
              a->speak();   // ...    (static type Animal, no dynamic dispatch)
          }
        `
      },
      {
        title: '<code>override</code> catches the missing const',
        html: `<p>The base declares <code>virtual double area() const</code>. A derived class writes <code>double area()</code> (no <code>const</code>). Without <code>override</code> this compiles: it is a <b>new, unrelated</b> function, and calls through <code>Shape*</code> still go to <code>Shape::area</code> — a silent bug. With <code>override</code> the compiler says <i>"marked 'override', but does not override"</i>. The commented line below would be that compile error.</p>`,
        code: R`
          struct Shape { virtual ~Shape() = default; virtual double area() const { return 0; } };
          struct Bad : Shape {
              double area() { return 42; }               // compiles, but does NOT override (no const)
          };
          struct Good : Shape {
              double area() const override { return 42; }
              // double area() override { return 42; }  // error: marked 'override', but does not override
          };
          int main() { Bad b; Shape& s = b; std::cout << s.area() << '\n'; }   // prints 0, not 42
        `
      },
      {
        title: 'Predict the output: default arguments are static',
        html: `<p>Default arguments are filled in by the compiler at the <b>call site</b>, using the <b>static type</b>. The function body is chosen dynamically. So <code>p-&gt;f()</code> runs <code>Derived::f</code> but with <code>Base</code>'s default <code>x = 1</code>. Output: <b>"Derived 1"</b>. Core Guidelines C.140: do not give different default arguments to a virtual function and its overrider.</p>`,
        code: R`
          struct Base { virtual ~Base() = default; virtual void f(int x = 1) const { std::cout << "Base " << x << '\n'; } };
          struct Derived : Base { void f(int x = 2) const override { std::cout << "Derived " << x << '\n'; } };
          int main() {
              Derived d;
              Base* p = &d;
              p->f();   // Derived 1   <- body from Derived, default from Base
              d.f();    // Derived 2
          }
        `
      },
      {
        title: 'The vptr shows up in sizeof',
        html: `${H.table(['Type', 'Members', 'sizeof on x86-64'], [['<code>struct A { int x; }</code>', 'int', '4'], ['<code>struct B { int x; virtual void f(); }</code>', 'vptr + int + padding', '16'], ['<code>struct C : B { int y; }</code>', 'vptr + x + y', '16 (y fits in the padding)'], ['<code>struct E { virtual void f(); virtual void g(); }</code>', 'one vptr, no matter how many virtuals', '8']])}<p>The number of virtual functions changes the <b>vtable</b> size (shared per class), never the <b>object</b> size.</p>`,
        code: R`
          struct A { int x; };
          struct B { int x; virtual void f() {} };
          struct E { virtual void f() {} virtual void g() {} };
          static_assert(sizeof(A) == 4);
          static_assert(sizeof(B) == 16);   // on 64-bit Itanium ABI (Linux/macOS)
          static_assert(sizeof(E) == 8);
        `
      }
    ],
    deepDive: `<p><b>Itanium C++ ABI layout</b> (Linux, macOS, Android; MSVC differs in details). The vtable contains, before the address the vptr points to: the <i>offset-to-top</i> (for multiple inheritance) and the <i>RTTI pointer</i> (used by <code>typeid</code> and <code>dynamic_cast</code>). Each virtual destructor gets <b>two</b> entries: the <i>complete-object</i> destructor (D1) and the <i>deleting</i> destructor (D0) that also calls <code>operator delete</code> with the right size. Inspect real layouts with <code>g++ -fdump-lang-class</code> or <code>clang -Xclang -fdump-vtable-layouts</code>.</p>
      <p><b>Multiple inheritance</b> gives an object <b>several vptrs</b> (one per polymorphic base subobject). Converting <code>Derived*</code> to the second base adjusts the pointer by an offset, and overriders reached through the second base go through small <b>thunks</b> that fix up <code>this</code>. <b>Virtual inheritance</b> adds virtual-base offsets to the vtable. During construction, the vptr is set <b>for each level</b> in turn (Base's table while Base's constructor runs, then Derived's), which is why virtual calls in constructors do not reach derived overrides.</p>
      <p><b>Performance.</b> A predicted indirect call costs about the same as a direct call; a mispredicted one costs ~15–20 cycles. The real cost is lost <b>inlining</b> (no constant folding, no vectorization across the call). Compilers <b>devirtualize</b> when they can prove the dynamic type: the class or function is <code>final</code>, the object is a local of known type, or LTO/whole-program analysis sees all derived classes (<code>-fwhole-program-vtables</code>, speculative devirtualization with a type check + inlined fast path).</p>
      <p><b>Alternatives:</b> CRTP (static polymorphism, zero overhead, no heterogeneous containers), <code>std::variant</code> + <code>std::visit</code> (closed set of types, value semantics, often faster thanks to contiguous storage), type erasure (<code>std::function</code>, <code>std::any</code>, C++26 <code>std::function_ref</code>), and "data-oriented" designs that keep one array per type and avoid per-object dispatch entirely (common in game engines). C++23 <b>deducing this</b> (<code>this auto&amp; self</code>) simplifies CRTP.</p>
      <p><b>Security.</b> vptr overwrites are a classic exploit primitive (heap overflow → fake vtable). Mitigations: Clang CFI (<code>-fsanitize=cfi-vcall</code>), MSVC Control Flow Guard, and hardware like Intel CET / ARM pointer authentication, which Apple uses to sign vtable pointers on arm64e.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants reach for inheritance hierarchies by default, even when a <code>std::variant</code> or a simple function table would be clearer and faster. They also generate overrides without <code>override</code>, so a missing <code>const</code> silently creates a new function.</p>
      <p><b>Use AI as a partner:</b> <code>Show me the Itanium vtable layout for these three classes and annotate each slot.</code> Then verify with <code>g++ -fdump-lang-class</code>. Or: <code>Rewrite this virtual hierarchy using std::variant and std::visit, and list what we lose (open extension) and gain (no heap, no vptr).</code></p>
      <p><b>Where AI goes wrong:</b> claiming each object stores a copy of the vtable (it stores only a pointer), claiming virtual calls are "always slow", mixing up overriding and hiding, and forgetting that default arguments and overload resolution use the static type.</p>
      <p><b>What you must still own:</b> drawing object → vptr → vtable → function from memory, predicting which function runs for any combination of declared and dynamic type, and choosing between runtime polymorphism, compile-time polymorphism and variants. This is a guaranteed C++ interview question at every level.</p>`,
    problems: [
      {
        title: 'Total Area of Mixed Shapes: Replace the Switch with Virtual Dispatch',
        level: 'Easy', tags: ['virtual functions', 'polymorphism', 'override'], companies: ['Amazon', 'Adobe', 'Siemens'],
        statement: `<p>A legacy codebase stores shapes as a struct with a <code>kind</code> enum and computes area with a <code>switch</code>. Every new shape means editing every switch in the codebase. Redesign with an abstract-enough base <code>Shape</code> with a virtual <code>area()</code>, implement <code>Circle</code>, <code>Rect</code> and <code>Triangle</code>, and write <code>double totalArea(const std::vector&lt;std::unique_ptr&lt;Shape&gt;&gt;&amp;)</code>.</p>`,
        constraints: `<p>Up to 10<sup>5</sup> shapes. Adding a new shape must not require editing <code>totalArea</code>.</p>`,
        example: `<p>Shapes: Circle(r=1), Rect(2×3), Triangle(base 4, height 5). Areas: ${H.c('b', '3.14159')} + ${H.c('g', '6')} + ${H.c('y', '10')} = <b>19.14159</b>. The loop body is just <code>sum += s-&gt;area()</code>; each call dispatches through the object's vptr.</p>`,
        brute: {
          why: `<p>The enum + switch approach works but violates the open/closed principle: adding <code>Hexagon</code> means editing every <code>switch</code> (area, perimeter, draw, serialize…). Forgetting one case is a silent bug (unless you use <code>-Wswitch</code>), and the struct carries fields that only some kinds use.</p>`,
          code: R`
            #include <vector>
            enum class Kind { Circle, Rect, Triangle };
            struct ShapeData { Kind kind; double a, b; };          // meaning of a, b depends on kind
            double totalArea(const std::vector<ShapeData>& v) {
                double sum = 0;
                for (const auto& s : v) {
                    switch (s.kind) {                               // must be edited for every new shape
                        case Kind::Circle:   sum += 3.14159 * s.a * s.a; break;
                        case Kind::Rect:     sum += s.a * s.b;           break;
                        case Kind::Triangle: sum += 0.5 * s.a * s.b;     break;
                    }
                }
                return sum;
            }
          `
        },
        mcq: { q: 'In <code>for (auto&amp; s : shapes) sum += s-&gt;area();</code> with <code>shapes</code> holding <code>unique_ptr&lt;Shape&gt;</code>, how is the right <code>area</code> found?', options: ['Through the vptr inside each object, indexing the area slot of that object\'s class vtable', 'By the compiler inspecting the vector at compile time', 'By a hidden switch on a type id', 'Through RTTI and dynamic_cast on each element'], answer: 0, explain: 'Each object carries a vptr to its class\'s vtable; the call loads the pointer at the fixed area slot and calls it. No switch, no RTTI lookup.' },
        hints: [
          `<p>Hint 1: put the behaviour that varies (<code>area</code>) behind a <code>virtual</code> function in the base; give the base a <b>virtual destructor</b> because you will delete through <code>Shape*</code>.</p>`,
          `<p>Hint 2: each derived class stores only its own fields and overrides <code>area() const override</code>.</p>`,
          `<p>Hint 3: store <code>std::unique_ptr&lt;Shape&gt;</code> in the vector (not <code>Shape</code> by value — that slices). <code>totalArea</code> just sums <code>s-&gt;area()</code>.</p>`
        ],
        tests: { sig: 'string[] double[] double[] -> double', fn: 'ta', cmp: 'float',
          harness: { cpp: "double ta(vector<string> kinds, vector<double> a, vector<double> b) { vector<unique_ptr<Shape>> v; for (size_t i = 0; i < kinds.size(); ++i) { if (kinds[i] == \"C\") v.push_back(make_unique<Circle>(a[i])); else if (kinds[i] == \"R\") v.push_back(make_unique<Rect>(a[i], b[i])); else v.push_back(make_unique<Triangle>(a[i], b[i])); } return totalArea(v); }" }, cases: [
          [[["C","R","T"],[1,2,4],[0,3,5]], 19.14159],
          [[[],[],[]], 0],
          [[["C"],[0],[0]], 0],
          [[["R"],[1000000],[1000000]], 1000000000000],
          [[["T"],[3],[0]], 0],
          [[["C","C"],[0.5,2.5],[0,0]], 20.420334999999998],
          [[["R","T","R","T"],[1.5,2,3,4],[2,2,0.5,0.25]], 7],
          [[["C"],[1000],[0]], 3141589.9999999995],
          [[{"$rep":"R","n":100000},{"$rep":2,"n":100000},{"$rep":3,"n":100000}], 600000],
          [[{"$rep":"T","n":100000},{"$rep":4,"n":100000},{"$rep":5,"n":100000}], 1000000]
        ] },
        solution: {
          approach: `<p>Classic runtime polymorphism: an interface-like base with a pure or default virtual <code>area()</code>, one class per shape, heterogeneous container of owning base pointers. New shapes are added by writing a new class; <code>totalArea</code> never changes.</p>`,
          code: R`
            #include <iostream>
            #include <memory>
            #include <vector>
            struct Shape {
                virtual ~Shape() = default;
                virtual double area() const = 0;                 // every shape must say its area
            };
            struct Circle final : Shape {
                double r;
                explicit Circle(double r_) : r(r_) {}
                double area() const override { return 3.14159 * r * r; }
            };
            struct Rect final : Shape {
                double w, h;
                Rect(double w_, double h_) : w(w_), h(h_) {}
                double area() const override { return w * h; }
            };
            struct Triangle final : Shape {
                double base, height;
                Triangle(double b, double h) : base(b), height(h) {}
                double area() const override { return 0.5 * base * height; }
            };
            double totalArea(const std::vector<std::unique_ptr<Shape>>& shapes) {
                double sum = 0;
                for (const auto& s : shapes) sum += s->area();   // dynamic dispatch, no switch
                return sum;
            }

            int main() {
                std::vector<std::unique_ptr<Shape>> v;
                v.push_back(std::make_unique<Circle>(1));
                v.push_back(std::make_unique<Rect>(2, 3));
                v.push_back(std::make_unique<Triangle>(4, 5));
                std::cout << totalArea(v) << '\n';               // 19.1416
            }
          `,
          dry: { head: ['Element', 'Dynamic type', 'vtable slot area →', 'area()', 'sum'], rows: [
            ['v[0]', 'Circle', 'Circle::area', '3.14159', '3.14159'],
            ['v[1]', 'Rect', 'Rect::area', '6', '9.14159'],
            ['v[2]', 'Triangle', 'Triangle::area', '10', H.c('g', '19.14159')]
          ] },
          complexity: `<p>O(N) time, one indirect call per shape. Memory: one heap allocation + 8-byte vptr per shape. If profiling shows the dispatch matters, group shapes by type or switch to <code>std::variant</code>.</p>`,
          followUps: ['Add <code>perimeter()</code> and a <code>Hexagon</code> — which files change?', 'Implement the same with <code>std::variant&lt;Circle, Rect, Triangle&gt;</code> and <code>std::visit</code>.', 'Why is <code>final</code> on the leaf classes useful for the optimizer?']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 5 — Pure virtual functions & abstract classes (interfaces)
     ====================================================================== */
  topics.push({
    title: 'Pure Virtual Functions & Abstract Classes: Contracts You Cannot Instantiate',
    analogy: `<p>A <b>job description</b> for "Driver" says: <i>must be able to start(), steer(), and park()</i>. You cannot hire "a job description" — there is no person in it. You can only hire a real person (a <b>TruckDriver</b>, a <b>TaxiDriver</b>) who can actually do every item on the list. If a candidate can start and steer but cannot park, they are still not hireable.</p>
      <p>A <b>pure virtual function</b> (<code>= 0</code>) is one line of the job description. A class with at least one unfilled line is <b>abstract</b>: you cannot create objects of it, but you can talk about "any Driver" through a <code>Driver&amp;</code> or <code>Driver*</code>.</p>`,
    explain: `<p>Write <code>= 0</code> after a virtual function declaration to make it <b>pure virtual</b>: "every concrete subclass <b>must</b> provide this".</p>
      <ul>
        <li>A class with at least one pure virtual function (declared or inherited and not yet overridden) is an <b>abstract class</b>.</li>
        <li>You <b>cannot create objects</b> of an abstract class: <code>Animal a;</code> and <code>new Animal</code> are compile errors. But <code>Animal&amp;</code>, <code>Animal*</code> and <code>std::unique_ptr&lt;Animal&gt;</code> are fine — that is the whole point.</li>
        <li>A derived class stays abstract until <b>every</b> pure virtual function has a final overrider. The compiler error tells you which one is missing.</li>
        <li>Abstract classes can still have <b>data members, constructors, and normal functions</b>. Only the pure ones are "holes".</li>
      </ul>
      ${H.table(['Class', 'speak()', 'move()', 'Can you write <code>X obj;</code>?'], [
        ['Animal', H.c('r', '= 0'), H.c('r', '= 0'), H.c('r', 'no — abstract')],
        ['Dog : Animal', H.c('g', 'Dog::speak'), H.c('r', '= 0 (inherited)'), H.c('r', 'no — still abstract')],
        ['Puppy : Dog', 'Dog::speak', H.c('g', 'Puppy::move'), H.c('g', 'yes — concrete')]
      ])}
      <p><b>Interfaces in C++.</b> C++ has no <code>interface</code> keyword. The idiom is a class with <b>only</b> pure virtual functions plus a <b>virtual destructor</b> (so <code>delete</code> through the interface works), and usually no data. A class can implement several interfaces through multiple inheritance — that is the "safe" use of multiple inheritance.</p>
      <p><b>Two surprising facts interviewers love:</b></p>
      <ol>
        <li>A pure virtual function <b>can have a body</b>. Derived classes must still override it, but they can call the base version explicitly: <code>Base::f()</code>. Useful for "here is a sensible default, but you must opt in".</li>
        <li>A <b>pure virtual destructor</b> (<code>virtual ~Base() = 0;</code>) makes a class abstract when it has no other natural pure function — but it <b>must</b> still be defined (<code>Base::~Base() {}</code>), because every derived destructor calls it. Forgetting the definition is a <b>linker error</b>.</li>
      </ol>`,
    clues: [
      '"Design an interface for payment methods / storage backends / notification channels" → abstract base with pure virtuals + virtual destructor',
      '"Can an abstract class have a constructor? data members?" → yes, both; it just cannot be instantiated directly',
      '"Why do I get <i>cannot declare variable to be of abstract type</i>?" → some pure virtual is not overridden (check const/signature)',
      '"Can a pure virtual function have a body?" → yes; call it with <code>Base::f()</code>',
      '"pure virtual method called" crash at runtime → a pure virtual was called during construction/destruction',
      '"Dependency injection / mock this dependency in tests" → program against an abstract interface',
      '"Template Method / NVI pattern" → public non-virtual function calling private pure virtual hooks'
    ],
    code: [R`
      #include <iostream>
      #include <memory>
      #include <string>
      #include <vector>

      // An "interface": only pure virtual functions + a virtual destructor.
      class Notifier {
      public:
          virtual ~Notifier() = default;
          virtual void send(const std::string& to, const std::string& msg) = 0;   // pure virtual
          virtual std::string channel() const = 0;
      };

      class EmailNotifier final : public Notifier {
      public:
          void send(const std::string& to, const std::string& msg) override {
              std::cout << "[email to " << to << "] " << msg << '\n';
          }
          std::string channel() const override { return "email"; }
      };

      class SmsNotifier final : public Notifier {
      public:
          void send(const std::string& to, const std::string& msg) override {
              std::cout << "[sms to " << to << "] " << msg.substr(0, 160) << '\n';   // SMS length limit
          }
          std::string channel() const override { return "sms"; }
      };

      // Code that depends ONLY on the contract. It never names a concrete class.
      void alertAll(std::vector<std::unique_ptr<Notifier>>& ns, const std::string& who) {
          for (auto& n : ns) n->send(who, "Your order shipped via " + n->channel());
      }

      int main() {
          std::vector<std::unique_ptr<Notifier>> ns;
          ns.push_back(std::make_unique<EmailNotifier>());
          ns.push_back(std::make_unique<SmsNotifier>());
          alertAll(ns, "asha");
          // Notifier n;   // error: cannot declare variable 'n' to be of abstract type 'Notifier'
      }
    `, R`
      // Pure virtual WITH a body, and a pure virtual destructor (must be defined!).
      #include <iostream>
      struct Shape {
          virtual ~Shape() = 0;                         // pure virtual destructor: makes Shape abstract
          virtual void draw() const = 0;                // pure, but has a default body below
      };
      Shape::~Shape() {}                                // REQUIRED definition, or the linker fails
      void Shape::draw() const { std::cout << "generic outline\n"; }

      struct Circle : Shape {
          void draw() const override {
              Shape::draw();                            // reuse the base body explicitly
              std::cout << "fill circle\n";
          }
      };
      int main() { Circle c; c.draw(); }
    `],
    codeTitle: ['Interface + two implementations + code that only knows the interface', 'Pure virtual functions with bodies'],
    viz: {
      title: 'Abstract or concrete? Track the final overrider of every pure function',
      input: 'Dog: speak; Puppy: move',
      inputLabel: 'Overrides per class: "Dog: speak; Puppy: move" (functions: speak, move, eat; classes: Dog, Puppy)',
      gen: function (input) {
        var s = String(input || '').trim();
        if (s.length > 80) throw new Error('Keep the input short, e.g. "Dog: speak; Puppy: move"');
        var ov = { Dog: [], Puppy: [] }, FN = ['speak', 'move', 'eat'];
        if (s) s.split(';').map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (seg) {
          var m = seg.match(/^(Dog|Puppy)\s*:\s*([a-z,\s]*)$/i);
          if (!m) throw new Error('Format: "Dog: speak; Puppy: move eat"');
          var cls = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
          m[2].split(/[\s,]+/).filter(Boolean).forEach(function (f) {
            f = f.toLowerCase();
            if (FN.indexOf(f) < 0) throw new Error('Unknown function "' + f + '" — use speak, move, eat');
            if (ov[cls].indexOf(f) < 0) ov[cls].push(f);
          });
        });
        var fo = { speak: 'Animal::speak = 0', move: 'Animal::move = 0', eat: 'Animal::eat (has body, NOT pure)' };
        var pure = { speak: true, move: true, eat: false };
        var frames = [], classes = ['Animal', 'Dog', 'Puppy'], status = {};
        function rows() { return FN.map(function (f) { return [f + '()', fo[f], pure[f] ? 'pure → hole' : 'implemented']; }); }
        function hl() { var h = {}; FN.forEach(function (f, i) { h[i] = pure[f] ? 'bad' : 'ok'; }); return h; }
        function graph(cur) {
          var hlg = {}, tags = {};
          classes.forEach(function (c) { if (status[c] !== undefined) { hlg[c] = status[c] ? 'bad' : 'ok'; tags[c] = status[c] ? 'abstract' : 'concrete'; } });
          if (cur) hlg[cur] = status[cur] ? 'bad' : 'cur';
          return { type: 'graph', label: 'Inheritance chain', directed: true, height: 22, nodes: [{ id: 'Animal', x: 15, y: 9, shape: 'box' }, { id: 'Dog', x: 50, y: 9, shape: 'box' }, { id: 'Puppy', x: 85, y: 9, shape: 'box' }], edges: [['Dog', 'Animal', 'is-a'], ['Puppy', 'Dog', 'is-a']], hl: hlg, tags: tags };
        }
        function codeFor() {
          var L = ['struct Animal {', '    virtual ~Animal() = default;', '    virtual void speak() const = 0;', '    virtual void move() const = 0;', '    virtual void eat() const { /* default body */ }', '};', 'struct Dog : Animal {'];
          ov.Dog.forEach(function (f) { L.push('    void ' + f + '() const override;'); });
          L.push('};', 'struct Puppy : Dog {');
          ov.Puppy.forEach(function (f) { L.push('    void ' + f + '() const override;'); });
          L.push('};');
          return L.join('\n');
        }
        var code = codeFor();
        status.Animal = true;
        frames.push({ narr: '<b>Animal</b> declares <code>speak</code> and <code>move</code> as <code>= 0</code> (pure) and gives <code>eat</code> a body. Two holes → Animal is <b>abstract</b>. You may write <code>Animal*</code> or <code>Animal&amp;</code>, but never <code>Animal a;</code>.', parts: [{ type: 'code', label: 'Hierarchy', lang: 'cpp', code: code, hl: { 3: 'bad', 4: 'bad', 5: 'ok' } }, graph('Animal'), { type: 'table', label: 'Final overrider so far', columns: ['function', 'final overrider', 'state'], rows: rows(), hl: hl() }] });
        ['Dog', 'Puppy'].forEach(function (c) {
          ov[c].forEach(function (f) { fo[f] = c + '::' + f; pure[f] = false; });
          var holes = FN.filter(function (f) { return pure[f]; });
          status[c] = holes.length > 0;
          frames.push({ narr: '<b>' + c + '</b> overrides: ' + (ov[c].length ? '<b>' + esc(ov[c].join(', ')) + '</b>' : '<i>nothing</i>') + '. ' + (holes.length ? 'Still pure: <b>' + esc(holes.join(', ')) + '</b> → ' + c + ' is <span class="c-r">abstract</span> too.' : 'No holes left → ' + c + ' is <span class="c-g">concrete</span>: objects can be created.'), parts: [{ type: 'code', label: 'Hierarchy', lang: 'cpp', code: code }, graph(c), { type: 'table', label: 'Final overrider so far', columns: ['function', 'final overrider', 'state'], rows: rows(), hl: hl() }] });
        });
        var tests = [['Animal a;', status.Animal], ['Dog d;', status.Dog], ['Puppy p;', status.Puppy], ['Animal* x = new Puppy;', status.Puppy], ['Animal& r = someDog;', false]];
        frames.push({ narr: 'Now try to create objects. The compiler checks whether the class has any pure virtual function without a final overrider. Pointers and references to abstract types are <b>always</b> allowed.', parts: [graph(), { type: 'table', label: 'Does it compile?', columns: ['statement', 'result'], rows: tests.map(function (t) { return [t[0], t[1] ? 'error: abstract type' : 'OK']; }), hl: (function () { var h = {}; tests.forEach(function (t, i) { h[i] = t[1] ? 'bad' : 'ok'; }); return h; })() }] });
        var concrete = classes.filter(function (c) { return !status[c]; });
        frames.push({ narr: concrete.length ? 'Concrete classes: <b>' + concrete.join(', ') + '</b>. A call like <code>animalPtr-&gt;speak()</code> on a ' + concrete[concrete.length - 1] + ' dispatches to <b>' + esc(fo.speak) + '</b>.' : 'No class is concrete yet. Add overrides (e.g. <code>Dog: speak; Puppy: move</code>) until every pure function has an overrider.', parts: [{ type: 'table', label: 'vtable of the most-derived class (pure slots point to __cxa_pure_virtual)', columns: ['slot', 'entry'], rows: [['~', '~Puppy'], ['speak', pure.speak ? '__cxa_pure_virtual' : fo.speak], ['move', pure.move ? '__cxa_pure_virtual' : fo.move], ['eat', fo.eat.replace(' (has body, NOT pure)', '')]], hl: { 1: pure.speak ? 'bad' : 'ok', 2: pure.move ? 'bad' : 'ok', 3: 'ok' } }, note('An abstract class\'s vtable fills pure slots with <code>__cxa_pure_virtual</code>, a function that prints <b>"pure virtual method called"</b> and aborts. You can only reach it by calling a pure virtual function during construction or destruction of the base.', 'Under the hood')] });
        return frames;
      }
    },
    examples: [
      {
        title: 'The missing const keeps the class abstract',
        html: `<p>Base: <code>virtual double area() const = 0;</code>. Derived writes <code>double area() override</code> without <code>const</code>... with <code>override</code> you get a clear error. Without <code>override</code>, the derived function is a new overload, <code>area() const</code> is still pure, and you get the confusing error <i>"cannot declare variable 'c' to be of abstract type 'Circle'"</i> at the place where you create the object. Lesson: always write <code>override</code>.</p>`,
        code: R`
          struct Shape { virtual ~Shape() = default; virtual double area() const = 0; };
          struct Circle : Shape {
              double r = 1;
              double area() const override { return 3.14159 * r * r; }   // const matches -> overrides
          };
          int main() { Circle c; Shape& s = c; std::cout << s.area() << '\n'; }
        `
      },
      {
        title: 'Programming to an interface makes testing easy',
        html: `<p><code>Checkout</code> needs to charge cards. If it depends on the abstract <code>PaymentGateway</code>, a unit test can pass a <code>FakeGateway</code> that records calls and never touches the network. Real production code passes <code>StripeGateway</code>. This is <b>dependency inversion</b> (the D in SOLID) and how mocking frameworks like GoogleMock work: they generate a class overriding your pure virtuals.</p>`,
        code: R`
          struct PaymentGateway {
              virtual ~PaymentGateway() = default;
              virtual bool charge(const std::string& card, long cents) = 0;
          };
          struct FakeGateway final : PaymentGateway {
              std::vector<long> charged;
              bool charge(const std::string&, long cents) override { charged.push_back(cents); return true; }
          };
          class Checkout {
              PaymentGateway& gw_;                       // depends on the contract only
          public:
              explicit Checkout(PaymentGateway& gw) : gw_(gw) {}
              bool pay(long cents) { return cents > 0 && gw_.charge("4242", cents); }
          };
          int main() { FakeGateway fake; Checkout c(fake); c.pay(1999); std::cout << fake.charged.size() << '\n'; }   // 1
        `
      },
      {
        title: 'Non-Virtual Interface (NVI): public non-virtual, private virtual',
        html: `<p>The base controls the <b>algorithm skeleton</b> (logging, locking, validation) in a public non-virtual function, and derived classes only fill in private pure virtual <b>hooks</b>. Derived classes can override private virtuals — access control and overriding are independent. This is the Template Method pattern, and Herb Sutter's recommended default for C++ class hierarchies.</p>`,
        code: R`
          class Report {
          public:
              void print() const {                      // non-virtual: base owns the skeleton
                  std::cout << "== header ==\n";
                  body();                               // hook
                  std::cout << "== footer ==\n";
              }
              virtual ~Report() = default;
          private:
              virtual void body() const = 0;            // derived classes fill this in
          };
          class SalesReport final : public Report {
              void body() const override { std::cout << "sales: 42\n"; }
          };
          int main() { SalesReport r; r.print(); }
        `
      },
      {
        title: 'Predict the crash: calling a pure virtual from the base constructor',
        html: `<p>While <code>Base</code>'s constructor runs, the object's vptr points to <b>Base</b>'s vtable, whose <code>init</code> slot holds <code>__cxa_pure_virtual</code>. Calling <code>init()</code> <b>indirectly</b> (through a helper, so the compiler cannot warn) prints <b>"pure virtual method called"</b> and terminates. Calling it directly in the constructor is undefined behaviour that GCC usually diagnoses. Fix: do two-phase init through a factory, or pass the needed data into the base constructor.</p>`,
        code: R`
          struct Base {
              Base() { setup(); }                       // calls a pure virtual indirectly -> abort at runtime
              void setup() { init(); }
              virtual void init() = 0;
              virtual ~Base() = default;
          };
          struct Derived : Base { void init() override { std::cout << "never reached from Base()\n"; } };
          // int main() { Derived d; }               // would print: pure virtual method called / terminate
        `
      }
    ],
    deepDive: `<p><b>"Abstract" is decided by final overriders.</b> [class.abstract]: a class is abstract if it has at least one pure virtual function for which the final overrider is pure. Overriding a non-pure virtual with a pure one (<code>void f() override = 0;</code>) is legal and makes the derived class abstract again — useful to force grandchildren to re-implement something.</p>
      <p><b>Pure virtual destructor</b>: unlike other pure virtuals, it must be defined, because destructor chains call every base destructor explicitly (non-virtually). The definition goes outside the class: either <code>Base::~Base() {}</code> or <code>Base::~Base() = default;</code> (an out-of-line defaulted definition is allowed). The typical use: a base class that has no other natural pure function but must not be instantiated.</p>
      <p><b>Cost of interfaces.</b> An empty interface adds a vptr to each object. Implementing several interfaces adds one vptr per polymorphic base (multiple inheritance), so a class implementing 3 interfaces carries 3 vptrs (24 bytes) and pointer conversions between them adjust <code>this</code>. The Empty Base Optimization does not apply to polymorphic bases.</p>
      <p><b>Linker gotcha: the "key function".</b> In the Itanium ABI, a class's vtable is emitted in the translation unit that defines its <b>first non-inline, non-pure virtual function</b> (the key function). If you declare it but never define it, you get the infamous <i>undefined reference to 'vtable for X'</i>. Defining everything inline makes the vtable emitted in every TU (as a weak/COMDAT symbol).</p>
      <p><b>Abstract classes vs concepts.</b> C++20 concepts express "has a <code>send(string, string)</code> member" at compile time with zero runtime cost and no inheritance, but they do not give you a heterogeneous container. Rule of thumb: <b>runtime choice of implementation</b> (plugins, config-driven backends, mocks) → abstract base class; <b>compile-time genericity</b> (algorithms over many types) → templates + concepts. Big codebases often combine them: a concept-constrained template wrapped in a type-erased runtime interface.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating an interface plus three implementations plus a GoogleMock mock is now seconds of work, so the bottleneck shifts to <i>deciding the contract</i>: what goes in the interface, at what granularity, with what error semantics. Bloated interfaces (20 pure virtuals "just in case") are the most common AI-generated design smell.</p>
      <p><b>Use AI as a partner:</b> <code>Given these 3 call sites, propose the smallest interface they need (Interface Segregation). Explain each method.</code> Or: <code>Write a GoogleMock class for this interface and one test using EXPECT_CALL.</code></p>
      <p><b>Where AI goes wrong:</b> omitting the virtual destructor on the interface, writing <code>virtual ~Base() = 0;</code> without the out-of-line definition (linker error), forgetting <code>const</code> so the "implementation" does not override, and using an abstract class where a <code>std::function</code> callback or a concept would be simpler.</p>
      <p><b>What you must still own:</b> knowing exactly when a class is abstract, explaining why abstract classes can have constructors and data, recognising the "pure virtual method called" crash, and choosing between abstract interfaces, concepts and type erasure in a design discussion.</p>`,
    problems: [
      {
        title: 'Design a Pluggable Logger Interface',
        level: 'Medium', tags: ['abstract class', 'pure virtual', 'interface', 'dependency injection'], companies: ['Microsoft', 'Uber', 'Atlassian'],
        statement: `<p>Create an abstract <code>Logger</code> with pure virtual <code>void write(Level, std::string_view)</code> and a <b>non-virtual</b> convenience API <code>info(msg)</code> / <code>error(msg)</code> that filters by a minimum level stored in the base. Implement <code>ConsoleLogger</code> (prints) and <code>MemoryLogger</code> (stores lines for tests). A <code>Service</code> must receive a <code>Logger&amp;</code> and log through it without knowing the concrete type.</p>`,
        constraints: `<p>Logger must not be instantiable. Deleting a logger through <code>Logger*</code> must be safe. Filtering logic must exist in exactly one place.</p>`,
        example: `<p><code>MemoryLogger m(Level::Error); Service s(m); s.run();</code> where run() logs one info and one error → ${H.c('g', 'm.lines == ["ERROR boom"]')} — the info line was ${H.c('r', 'filtered')} by the base class before <code>write</code> was ever called.</p>`,
        brute: {
          why: `<p>A concrete <code>Logger</code> class with a <code>bool toConsole</code> flag and if/else in every method: every new destination (file, syslog, network) means editing the class, tests cannot capture output without hacks, and filtering is duplicated in every branch.</p>`,
          code: R`
            #include <iostream>
            #include <string>
            #include <vector>
            enum class Level { Info, Error };
            class Logger {                                  // concrete "god" logger
            public:
                bool toConsole = true;
                std::vector<std::string> memory;
                void info(const std::string& m)  { if (toConsole) std::cout << "INFO " << m << '\n'; else memory.push_back("INFO " + m); }
                void error(const std::string& m) { if (toConsole) std::cout << "ERROR " << m << '\n'; else memory.push_back("ERROR " + m); }
            };
          `
        },
        mcq: { q: 'Where should the level-filtering logic live?', options: ['In the base class\'s non-virtual info()/error(), before calling the pure virtual write()', 'Copied into every derived write()', 'In the Service class', 'In a global variable'], answer: 0, explain: 'This is the NVI / Template Method idea: the base owns the policy (filtering), derived classes only implement the varying step (where the text goes). One place to change, impossible to forget.' },
        hints: [
          `<p>Hint 1: the base class has data (<code>minLevel_</code>) and a constructor taking it — abstract classes may have both.</p>`,
          `<p>Hint 2: make <code>write</code> a <code>protected</code> or <code>private</code> pure virtual; make <code>info</code>/<code>error</code> public and non-virtual; give the base a virtual destructor.</p>`,
          `<p>Hint 3: <code>Service</code> stores <code>Logger&amp;</code>. Tests construct a <code>MemoryLogger</code> and inspect its <code>lines</code>. Mark leaf classes <code>final</code>.</p>`
        ],
        tests: { sig: 'int string[] -> string[]', fn: 'lg',
          harness: { cpp: "vector<string> lg(int minLevel, vector<string> ops) { static_assert(std::is_abstract_v<Logger>); static_assert(std::has_virtual_destructor_v<Logger>); MemoryLogger m(static_cast<Level>(minLevel)); Service s(m);\n  for (auto& op : ops) { if (op == \"run\") s.run(); else if (op.rfind(\"info:\", 0) == 0) m.info(op.substr(5)); else if (op.rfind(\"error:\", 0) == 0) m.error(op.substr(6)); }\n  { unique_ptr<Logger> p = make_unique<MemoryLogger>(Level::Info); p->info(\"x\"); } return m.lines; }" }, cases: [
          [[1,["run"]], ["ERROR boom"]],
          [[0,["run"]], ["INFO starting","ERROR boom"]],
          [[1,[]], []],
          [[0,["info:a","error:b","info:c"]], ["INFO a","ERROR b","INFO c"]],
          [[1,["info:a","error:b","info:c"]], ["ERROR b"]],
          [[1,["run","run","error:z"]], ["ERROR boom","ERROR boom","ERROR z"]],
          [[0,["info:"]], ["INFO "]],
          [[1,["info:","error:"]], ["ERROR "]],
          [[0,["run","info:hello world","error:oops!"]], ["INFO starting","ERROR boom","INFO hello world","ERROR oops!"]],
          [[1,{"$rep":"run","n":2000}], ["ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom","ERROR boom"]]
        ] },
        solution: {
          approach: `<p>Abstract base = policy + contract. It stores the minimum level, exposes non-virtual <code>info</code>/<code>error</code> that filter and format, and calls the private pure virtual <code>write</code>. Each concrete logger implements only <code>write</code>. <code>Service</code> depends on <code>Logger&amp;</code> (dependency injection).</p>`,
          code: R`
            #include <iostream>
            #include <string>
            #include <string_view>
            #include <vector>

            enum class Level { Info = 0, Error = 1 };

            class Logger {
            public:
                explicit Logger(Level min) : minLevel_(min) {}          // abstract classes can have ctors + data
                virtual ~Logger() = default;
                void info(std::string_view m)  { log(Level::Info, m); }  // non-virtual public API
                void error(std::string_view m) { log(Level::Error, m); }
            private:
                void log(Level l, std::string_view m) {
                    if (l < minLevel_) return;                           // filtering lives in ONE place
                    write(l, m);
                }
                virtual void write(Level l, std::string_view m) = 0;    // the only varying step
                Level minLevel_;
            };

            class ConsoleLogger final : public Logger {
            public:
                using Logger::Logger;                                   // inherit the constructor
            private:
                void write(Level l, std::string_view m) override {
                    std::cout << (l == Level::Error ? "ERROR " : "INFO ") << m << '\n';
                }
            };

            class MemoryLogger final : public Logger {
            public:
                using Logger::Logger;
                std::vector<std::string> lines;
            private:
                void write(Level l, std::string_view m) override {
                    lines.push_back(std::string(l == Level::Error ? "ERROR " : "INFO ") + std::string(m));
                }
            };

            class Service {
                Logger& log_;
            public:
                explicit Service(Logger& l) : log_(l) {}
                void run() { log_.info("starting"); log_.error("boom"); }
            };

            int main() {
                MemoryLogger m(Level::Error);
                Service(m).run();
                std::cout << m.lines.size() << ' ' << m.lines[0] << '\n';   // 1 ERROR boom
                ConsoleLogger c(Level::Info);
                Service(c).run();                                          // INFO starting / ERROR boom
            }

          `,
          dry: { head: ['Call', 'log() level check (min = Error)', 'write() dispatched to', 'm.lines'], rows: [
            ['<code>info("starting")</code>', H.c('r', 'Info &lt; Error → return'), '—', '[]'],
            ['<code>error("boom")</code>', H.c('g', 'pass'), 'MemoryLogger::write (via vptr)', '["ERROR boom"]']
          ] },
          complexity: `<p>Each log call: O(1) level check + one virtual call + the cost of the sink. Filtered messages never reach the virtual call.</p>`,
          followUps: ['Add a <code>FileLogger</code> that owns a <code>std::ofstream</code> — which special members must it declare? (none: Rule of Zero)', 'Make the logger thread-safe without touching derived classes.', 'Replace the interface with a <code>std::function&lt;void(Level, std::string_view)&gt;</code> sink. Trade-offs?']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 6 — Virtual destructors, construction/destruction order, virtual calls in ctors
     ====================================================================== */
  topics.push({
    title: 'Virtual Destructors & Construction Order: Deleting Through a Base Pointer',
    analogy: `<p>A building is built <b>foundation first, then floors, then the roof</b>. It is demolished <b>roof first, then floors, then the foundation</b>. Now imagine a demolition crew that only reads the sign at the front door saying "Foundation Co." — they knock down the foundation and walk away, leaving floors and roof floating in the air (and the electricity on).</p>
      <p>Deleting a <code>Derived</code> object through a <code>Base*</code> without a <b>virtual destructor</b> is that crew: only the base part is cleaned up. A virtual destructor makes the crew check the <b>real</b> building (via the vptr) and demolish it properly from the top down.</p>`,
    explain: `<p><b>Construction order</b> (bottom-up): base classes first (in declaration order), then members (in declaration order), then the derived constructor body. <b>Destruction order</b> is the exact reverse: derived destructor body, then members (reverse order), then base destructors.</p>
      ${H.table(['Phase', 'Order for <code>struct D : B { M m; }</code>'], [
        ['Construction', '<code>B()</code> → <code>M()</code> → <code>D()</code> body'],
        ['Destruction', '<code>~D()</code> body → <code>~M()</code> → <code>~B()</code>']
      ])}
      <p><b>The virtual destructor rule.</b> If you will ever <code>delete</code> a derived object through a pointer to its base (directly or via <code>std::unique_ptr&lt;Base&gt;</code>), the base destructor <b>must be virtual</b>. Otherwise <code>delete basePtr;</code> is bound statically to <code>~Base()</code>: the derived destructor and the derived members' destructors <b>never run</b>. The C++ standard calls this <b>undefined behaviour</b>; in practice you get leaks (files left open, memory never freed, locks never released) and sometimes heap corruption.</p>
      ${H.table(['Base destructor', '<code>Base* p = new Derived; delete p;</code> runs'], [
        ['<code>~Base()</code> (non-virtual)', H.c('r', '~Base() only — UB, Derived\'s resources leak')],
        ['<code>virtual ~Base()</code>', H.c('g', '~Derived() → ~members → ~Base()')]
      ])}
      <p><b>Simple rule (C++ Core Guidelines C.35):</b> a base class destructor should be either <b>public and virtual</b> (you may delete through the base) or <b>protected and non-virtual</b> (you may not — the compiler stops you). If your class has any virtual function, give it a virtual destructor: <code>virtual ~Base() = default;</code>. Classes not meant to be bases (like <code>std::string</code>, <code>std::vector</code>) have non-virtual destructors on purpose — <b>do not inherit from them</b> to add behaviour you will delete polymorphically.</p>
      <p><b>Virtual calls inside constructors and destructors do not reach the derived class.</b> While <code>Base()</code> runs, the <code>Derived</code> part does not exist yet (its members are not constructed), so the object's vptr points to <b>Base</b>'s vtable and <code>hello()</code> calls <code>Base::hello</code>. During <code>~Base()</code>, the derived part is already destroyed, so again the base version runs. This is a deliberate safety rule, unlike Java and C#, where the derived override runs on a half-built object.</p>`,
    clues: [
      '"Why should a base class destructor be virtual?" → deleting through a base pointer must run the derived destructor',
      '"Memory leak only when deleting through the interface pointer" → missing virtual destructor',
      '"<code>-Wdelete-non-virtual-dtor</code> / <code>-Wnon-virtual-dtor</code> warning" → exactly this bug',
      '"Calling a virtual function from a constructor — which version runs?" → the version of the class currently being constructed',
      '"In what order are constructors of base, members and derived called?" → bases, members (declaration order), body; destruction reversed',
      '"Should I inherit from std::vector / std::string?" → no polymorphic deletion: their destructors are not virtual'
    ],
    code: [R`
      #include <iostream>
      #include <memory>
      #include <vector>

      struct Base {
          Base() { std::cout << "Base()\n"; hello(); }            // virtual call during construction
          virtual void hello() const { std::cout << "  Base::hello\n"; }
          virtual ~Base() { std::cout << "~Base()\n"; }           // VIRTUAL: delete through Base* is safe
      };

      struct Member {
          Member()  { std::cout << "Member()\n"; }
          ~Member() { std::cout << "~Member()\n"; }
      };

      struct Derived : Base {
          Member m;                                               // constructed after Base, before Derived body
          std::vector<int> buf = std::vector<int>(1000);          // owns 4 KB of heap
          Derived() { std::cout << "Derived()\n"; hello(); }
          void hello() const override { std::cout << "  Derived::hello\n"; }
          ~Derived() override { std::cout << "~Derived()\n"; }
      };

      int main() {
          std::unique_ptr<Base> p = std::make_unique<Derived>();
          // Base() / Base::hello / Member() / Derived() / Derived::hello
          p.reset();
          // ~Derived() / ~Member() / ~Base()     (buf's 4 KB freed between ~Derived and ~Base)
      }
    `],
    codeTitle: ['Full construction and destruction chain with a virtual destructor'],
    viz: {
      title: 'Build up, tear down: with and without a virtual destructor',
      input: 'virtual',
      inputLabel: '"virtual" (virtual ~Base) or "plain" (non-virtual ~Base)',
      gen: function (input) {
        var mode = String(input || '').trim().toLowerCase();
        if (mode !== 'virtual' && mode !== 'plain') throw new Error('Type "virtual" or "plain"');
        var V = mode === 'virtual';
        var code = ['struct Base {', '    Base() { cout << "Base()"; hello(); }', '    virtual void hello() { cout << "Base::hello"; }', '    ' + (V ? 'virtual ~Base()' : '~Base()        ') + ' { cout << "~Base()"; }', '};', 'struct Derived : Base {', '    std::vector<int> buf = std::vector<int>(1000);  // 4 KB', '    Derived() { cout << "Derived()"; hello(); }', '    void hello() override { cout << "Derived::hello"; }', '    ~Derived() { cout << "~Derived()"; }', '};', 'Base* p = new Derived;', 'delete p;'].join('\n');
        var log = [], frames = [];
        function F(line, cls, narr, stack, sh, vals, vh) {
          frames.push({ narr: narr, parts: [
            { type: 'code', label: 'Program', lang: 'cpp', code: code, hl: (function () { var h = {}; [].concat(line).forEach(function (l) { h[l] = cls; }); return h; })() },
            { type: 'stack', label: 'Constructor / destructor call stack', items: stack, hl: sh || {} },
            { type: 'vars', label: 'Object state', vals: vals, hl: vh || {} },
            out(log.join('\n'))
          ] });
        }
        F(12, 'cur', '<code>new Derived</code>: first <code>operator new</code> grabs raw memory for the whole Derived object (vptr + buf). Nothing is constructed yet.', ['new Derived'], {}, { vptr: '(garbage)', buf: '(raw bytes)', heap4KB: 'not allocated' });
        log.push('Base()');
        F([12, 2], 'cur', 'Construction is <b>bottom-up</b>: the <b>Base</b> constructor runs first. Its first hidden action is <b>vptr = &amp;vtable for Base</b>. Then it prints "Base()".', ['new Derived', 'Derived()', 'Base()'], { 2: 'cur' }, { vptr: 'Base vtable', buf: '(not constructed)', heap4KB: 'not allocated' }, { vptr: 'cur' });
        log.push('Base::hello');
        F([2, 3], 'sel', '<code>hello()</code> is virtual, but the vptr currently points to <b>Base</b>\'s table, so <b>Base::hello</b> runs. The Derived part (buf) does not exist yet — calling Derived::hello now would read garbage, so C++ forbids reaching it.', ['new Derived', 'Derived()', 'Base()', 'hello() → Base::hello'], { 3: 'sel' }, { vptr: 'Base vtable', buf: '(not constructed)', heap4KB: 'not allocated' }, { vptr: 'sel' });
        F(7, 'ok', 'Base is done. Next, members in declaration order: <code>buf</code> is constructed and allocates <b>4 KB</b> on the heap.', ['new Derived', 'Derived()', 'buf: vector(1000)'], { 2: 'ok' }, { vptr: 'Base vtable', buf: 'size 1000', heap4KB: 'ALLOCATED' }, { heap4KB: 'ok' });
        log.push('Derived()'); log.push('Derived::hello');
        F([8, 9], 'ok', 'Finally the Derived constructor: its hidden first step sets <b>vptr = &amp;vtable for Derived</b>. Now <code>hello()</code> dispatches to <b>Derived::hello</b>.', ['new Derived', 'Derived()'], { 1: 'ok' }, { vptr: 'Derived vtable', buf: 'size 1000', heap4KB: 'ALLOCATED' }, { vptr: 'ok' });
        F(12, 'ok', 'Construction complete. <code>p</code> holds a <code>Base*</code> to a fully-built Derived. The object knows its real type only through its vptr.', [], {}, { vptr: 'Derived vtable', buf: 'size 1000', heap4KB: 'ALLOCATED', p: 'Base* → Derived' });
        if (V) {
          F(13, 'cur', '<code>delete p</code>: the destructor is <b>virtual</b>, so delete looks it up through the vptr (deleting-destructor slot) and finds <b>~Derived</b>.', ['delete p', '~Derived() [via vtable]'], { 1: 'cur' }, { vptr: 'Derived vtable', buf: 'size 1000', heap4KB: 'ALLOCATED' }, { vptr: 'cur' });
          log.push('~Derived()');
          F(10, 'bad', 'Destruction is <b>top-down</b>: the ~Derived body runs first.', ['delete p', '~Derived()'], { 1: 'bad' }, { vptr: 'Derived vtable', buf: 'size 1000', heap4KB: 'ALLOCATED' });
          F(7, 'bad', 'Then members in reverse declaration order: <code>~vector</code> frees the 4 KB.', ['delete p', '~Derived()', '~buf'], { 2: 'bad' }, { vptr: 'Derived vtable', buf: 'destroyed', heap4KB: 'freed' }, { heap4KB: 'ok' });
          log.push('~Base()');
          F(4, 'bad', 'Then <b>~Base</b>. Its hidden first step resets <b>vptr = &amp;vtable for Base</b> (the Derived part is gone, so virtual calls from here would reach Base versions). Prints "~Base()".', ['delete p', '~Base()'], { 1: 'bad' }, { vptr: 'Base vtable', buf: 'destroyed', heap4KB: 'freed' }, { vptr: 'cur' });
          F(13, 'ok', 'Finally <code>operator delete</code> returns the object\'s memory with the <b>correct size</b>. <span class="c-g">Everything was cleaned up exactly once.</span>', [], {}, { vptr: '—', buf: '—', heap4KB: 'freed', leaks: '0 bytes' }, { leaks: 'ok' });
        } else {
          F(13, 'bad', '<code>delete p</code>: the destructor is <b>not virtual</b>, so the compiler uses the <b>static type</b> of p (<code>Base*</code>) and calls <b>~Base</b> directly. The vptr is never consulted.', ['delete p', '~Base() [static call]'], { 1: 'bad' }, { vptr: 'Derived vtable', buf: 'size 1000', heap4KB: 'ALLOCATED' }, { vptr: 'bad' });
          log.push('~Base()');
          F(4, 'bad', '<b>~Base</b> runs and prints "~Base()". <span class="c-r">~Derived never runs. buf\'s destructor never runs.</span>', ['delete p', '~Base()'], { 1: 'bad' }, { vptr: 'Base vtable', buf: 'NEVER destroyed', heap4KB: 'still ALLOCATED' }, { buf: 'bad', heap4KB: 'bad' });
          F(13, 'bad', '<code>operator delete</code> frees the object with size <code>sizeof(Base)</code> — the wrong size (sized deallocation). This is <b>undefined behaviour</b>; ASan reports <code>new-delete-type-mismatch</code>.', [], {}, { vptr: '—', buf: 'leaked', heap4KB: 'LEAKED', leaks: '4000 bytes per delete' }, { heap4KB: 'bad', leaks: 'bad' });
          F(4, 'cur', '<b>Fix:</b> <code>virtual ~Base() = default;</code>. g++ warns about this with <code>-Wdelete-non-virtual-dtor</code> (enabled by -Wall) when Base has other virtual functions. Try input <code>virtual</code>.', [], {}, { fix: 'virtual ~Base() = default;' }, { fix: 'ok' });
        }
        return frames;
      }
    },
    examples: [
      {
        title: 'Predict the output: construction and destruction order',
        html: `<p>Bases first, members in <b>declaration</b> order (not initializer-list order), body last — and the mirror image on destruction.</p>
          ${H.table(['Step', 'Output'], [['1', 'A'], ['2', 'm1'], ['3', 'm2'], ['4', 'B'], ['5', '~B'], ['6', '~m2'], ['7', '~m1'], ['8', '~A']])}`,
        code: R`
          struct P { const char* n; P(const char* s) : n(s) { std::cout << n << ' '; } ~P() { std::cout << '~' << n << ' '; } };
          struct A { A() { std::cout << "A "; } virtual ~A() { std::cout << "~A "; } };
          struct B : A {
              P m1;                                   // declared FIRST
              P m2;                                   // declared SECOND
              B() : m2("m2"), m1("m1") { std::cout << "B "; }   // list order is ignored (-Wreorder warns)
              ~B() override { std::cout << "~B "; }
          };
          int main() { B b; }   // A m1 m2 B ~B ~m2 ~m1 ~A   (declaration order wins)
        `
      },
      {
        title: 'unique_ptr&lt;Base&gt; needs the virtual destructor too',
        html: `<p><code>std::unique_ptr&lt;Base&gt;</code>'s default deleter does <code>delete ptr;</code> with <code>ptr</code> of type <code>Base*</code> — exactly the dangerous expression. Smart pointers do <b>not</b> fix a missing virtual destructor. (<code>std::shared_ptr&lt;Base&gt;(new Derived)</code> happens to work, because shared_ptr captures a deleter for the <i>original</i> pointer type in its control block — but do not design around that accident.)</p>`,
        code: R`
          struct Base { virtual ~Base() = default; virtual int id() const { return 0; } };
          struct Derived : Base { std::string big = std::string(1000, 'x'); int id() const override { return 1; } };
          int main() {
              std::unique_ptr<Base> p = std::make_unique<Derived>();   // safe ONLY because ~Base is virtual
              std::cout << p->id() << '\n';
          }
        `
      },
      {
        title: 'Protected non-virtual destructor: "you may not delete me through the base"',
        html: `<p>Mixin / CRTP bases and policy classes are not meant for polymorphic deletion. Making their destructor <b>protected</b> turns <code>delete basePtr;</code> into a <b>compile error</b> while costing no vptr. This is the other half of Core Guideline C.35.</p>`,
        code: R`
          template <class D>
          struct Comparable {                         // CRTP mixin: never deleted through Comparable*
              bool operator!=(const D& o) const { return !(static_cast<const D&>(*this) == o); }
          protected:
              ~Comparable() = default;                // protected + non-virtual: no vptr, no misuse
          };
          struct Money : Comparable<Money> {
              long cents = 0;
              bool operator==(const Money& o) const { return cents == o.cents; }
          };
          int main() { Money a, b; std::cout << (a != b) << '\n'; }
        `
      },
      {
        title: 'Predict the output: virtual call in a destructor',
        html: `<p>During <code>~Base()</code> the Derived part is already gone and the vptr has been reset to Base's table, so <code>name()</code> prints <b>"Base"</b>. Output of <code>delete p;</code>: <b>~Derived ~Base(Base)</b>.</p>`,
        code: R`
          struct Base {
              virtual std::string name() const { return "Base"; }
              virtual ~Base() { std::cout << "~Base(" << name() << ")\n"; }
          };
          struct Derived : Base {
              std::string name() const override { return "Derived"; }
              ~Derived() override { std::cout << "~Derived\n"; }
          };
          int main() { Base* p = new Derived; delete p; }   // ~Derived  then  ~Base(Base)
        `
      }
    ],
    deepDive: `<p><b>Why UB and not just "a leak"?</b> [expr.delete]/3: if the static type differs from the dynamic type, the static type shall be a base class with a virtual destructor, otherwise the behaviour is undefined. Concretely: with sized deallocation (C++14) <code>operator delete(p, sizeof(Base))</code> receives the wrong size; with multiple inheritance <code>p</code> may not even point to the start of the allocation, so <code>free</code> gets an interior pointer and the allocator corrupts itself.</p>
      <p><b>The deleting destructor.</b> With a virtual destructor, <code>delete p</code> calls vtable slot D0 (deleting destructor) of the dynamic class. D0 runs the full destructor chain and then calls <code>operator delete</code> with the most-derived size and the correct starting address (and the class-specific <code>operator delete</code> if one exists). That is why the deletion — not just the destruction — must be dispatched virtually.</p>
      <p><b>The vptr dance.</b> Each constructor in the chain sets the vptr to <i>its own</i> class's vtable before running member initializers of its class, and each destructor resets it to its own class's table on entry. The object's dynamic type literally changes over its lifetime: Base → Derived during construction, Derived → Base during destruction. <code>typeid(*this)</code> and <code>dynamic_cast</code> in a constructor observe this too.</p>
      <p><b>Exceptions during construction.</b> If <code>Derived()</code> throws, the already-constructed parts (members, then base) are destroyed in reverse order, but <code>~Derived()</code> itself is <b>not</b> called — the object never finished being born. That is why every resource should be held by its own RAII member rather than acquired raw in the constructor body.</p>
      <p><b>Cost.</b> Making the destructor virtual adds a vptr only if the class had no virtual functions before; if it already has any, the cost is one more vtable slot (nothing per object). Classes with no virtual functions that are never deleted polymorphically (value types, <code>final</code> classes) should <b>not</b> pay for one. Destructors are implicitly <code>noexcept</code>; throwing from one during stack unwinding calls <code>std::terminate</code>.</p>`,
    aiEra: `<p><b>What AI changes:</b> code generators reliably add <code>virtual ~Base() = default;</code> to obvious interfaces, but routinely miss it in "utility" bases that grow virtual functions later, and they sometimes inherit from <code>std::vector</code> or <code>std::map</code> "to add a helper method". Static analysis (<code>-Wnon-virtual-dtor</code>, clang-tidy <code>cppcoreguidelines-virtual-class-destructor</code>) catches what review misses — turn it on in CI.</p>
      <p><b>Use AI as a partner:</b> <code>List every class in this diff that has a virtual function but no public virtual or protected non-virtual destructor.</code> Or ask it to write a test that deletes through a base pointer under ASan and LeakSanitizer.</p>
      <p><b>Where AI goes wrong:</b> claiming virtual calls in constructors reach the derived override (true in Java/C#, false in C++), saying <code>unique_ptr</code> fixes non-virtual destructors, or making <i>every</i> destructor virtual "to be safe" (wasting a vptr on value types and preventing triviality).</p>
      <p><b>What you must still own:</b> the exact construction/destruction order, the vptr changes during the chain, and the C.35 rule. "Why should destructors be virtual?" is one of the five most-asked C++ interview questions.</p>`,
    problems: [
      {
        title: 'Leak Hunt: The Plugin That Never Releases Its Buffer',
        level: 'Easy', tags: ['virtual destructor', 'memory leak', 'polymorphism'], companies: ['Adobe', 'Autodesk', 'Samsung'],
        statement: `<p>A plugin system stores <code>std::unique_ptr&lt;Plugin&gt;</code>. Each <code>ImageFilter</code> plugin allocates a large buffer. Valgrind reports that every unloaded plugin leaks its buffer and AddressSanitizer reports <code>new-delete-type-mismatch</code>. Find the bug, fix it with a one-line change, and explain what was (and was not) being destroyed.</p>`,
        constraints: `<p>Do not change how plugins are stored or created. Plugin has a virtual <code>run()</code>.</p>`,
        example: `<p>Before: unloading prints only ${H.c('r', '"~Plugin"')}. After the fix: ${H.c('g', '"~ImageFilter" then "~Plugin"')}, and the buffer's destructor frees its memory.</p>`,
        brute: {
          why: `<p>The base destructor is <b>non-virtual</b>. <code>unique_ptr&lt;Plugin&gt;</code> calls <code>delete</code> on a <code>Plugin*</code>, which statically binds to <code>~Plugin()</code>. <code>~ImageFilter()</code> and the buffer member's destructor never run → leak + undefined behaviour. Adding manual <code>cleanup()</code> calls everywhere would be the "brute" workaround — fragile and easy to forget.</p>`,
          code: R`
            #include <iostream>
            #include <memory>
            #include <vector>
            struct Plugin {
                virtual void run() = 0;
                ~Plugin() { std::cout << "~Plugin\n"; }          // BUG: non-virtual
            };
            struct ImageFilter : Plugin {
                std::vector<unsigned char> buffer = std::vector<unsigned char>(1 << 20);   // 1 MB
                void run() override {}
                ~ImageFilter() { std::cout << "~ImageFilter\n"; }
            };
            int main() {
                std::unique_ptr<Plugin> p = std::make_unique<ImageFilter>();
                p.reset();                                        // prints only ~Plugin: 1 MB leaked
            }
          `
        },
        mcq: { q: 'Which single change fixes the leak?', options: ['Declare <code>virtual ~Plugin()</code> (e.g. <code>virtual ~Plugin() = default;</code>)', 'Make <code>~ImageFilter</code> virtual', 'Switch to <code>std::shared_ptr&lt;Plugin&gt;</code> created with make_unique', 'Call <code>buffer.clear()</code> in run()'], answer: 0, explain: 'Virtual-ness must be declared in the base, because delete is performed through the base type. Making only the derived destructor virtual does nothing for a call made through Plugin*.' },
        hints: [
          `<p>Hint 1: look at the type of the pointer that <code>delete</code> is applied to. It is <code>Plugin*</code>, not <code>ImageFilter*</code>.</p>`,
          `<p>Hint 2: a non-virtual destructor is chosen at compile time from the static type. Which destructor does that select?</p>`,
          `<p>Hint 3: make the base destructor virtual. Then the deletion dispatches through the vptr to ImageFilter's deleting destructor, which runs ~ImageFilter, ~vector, ~Plugin in that order. Add <code>override</code> on the derived destructor for clarity.</p>`
        ],
        tests: { io: true, cases: [
          { stdin: "", stdout: "~ImageFilter\n~Plugin" }
        ] },
        solution: {
          approach: `<p>One-line fix: <code>virtual ~Plugin()</code>. Since <code>Plugin</code> already has a virtual function, this adds no per-object cost. Then turn on <code>-Wall -Wnon-virtual-dtor</code> so the compiler catches the next one.</p>`,
          code: R`
            #include <iostream>
            #include <memory>
            #include <vector>
            struct Plugin {
                virtual void run() = 0;
                virtual ~Plugin() { std::cout << "~Plugin\n"; }  // FIX: virtual
            };
            struct ImageFilter : Plugin {
                std::vector<unsigned char> buffer = std::vector<unsigned char>(1 << 20);
                void run() override {}
                ~ImageFilter() override { std::cout << "~ImageFilter\n"; }
            };
            int main() {
                std::unique_ptr<Plugin> p = std::make_unique<ImageFilter>();
                p.reset();     // ~ImageFilter, (buffer freed), ~Plugin
            }
          `,
          dry: { head: ['Event', 'Without virtual', 'With virtual'], rows: [
            ['<code>delete</code> binds to', '~Plugin (static)', '~ImageFilter via vptr'],
            ['~ImageFilter body', H.c('r', 'skipped'), H.c('g', 'runs')],
            ['~vector (1 MB)', H.c('r', 'skipped → leak'), H.c('g', 'runs → freed')],
            ['~Plugin body', 'runs', 'runs'],
            ['operator delete size', H.c('r', 'sizeof(Plugin) — wrong'), H.c('g', 'sizeof(ImageFilter)')]
          ] },
          complexity: `<p>No asymptotic change; the fix adds one vtable slot (no per-object cost since Plugin already had a vptr).</p>`,
          followUps: ['When would you instead make <code>~Plugin</code> protected and non-virtual?', 'Does <code>std::shared_ptr&lt;Plugin&gt; sp = std::make_shared&lt;ImageFilter&gt;()</code> leak without the fix? Why?', 'What does <code>-Wdelete-non-virtual-dtor</code> check exactly?']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 7 — Object slicing
     ====================================================================== */
  topics.push({
    title: 'Object Slicing: When Copying a Derived Object Cuts Off Its Derived Part',
    analogy: `<p>You have a long <b>train</b>: an engine plus three special carriages (dining car, sleeper, cargo). The station has a parking slot sized for <b>exactly one engine</b>. If you insist on "copying" the train into that slot, the crew copies the engine and <b>cuts off every carriage</b> — they simply do not fit. The engine in the slot is a perfectly fine engine, but it no longer knows it was ever pulling a dining car.</p>
      <p>A variable of type <code>Animal</code> is a slot sized for an Animal. Copy a <code>Dog</code> into it and the Dog-only part is <b>sliced off</b> — and the copy even forgets it was a dog when you call virtual functions.</p>`,
    explain: `<p><b>Object slicing</b> happens when a derived object is <b>copied (or moved) into an object of base type</b>. The base's copy constructor only knows about base members, so it copies those and ignores the rest. The result is a <b>genuine Base object</b>: its vptr points to the Base vtable, so virtual calls on it run the <b>Base</b> versions.</p>
      ${H.arr(['vptr→Dog', 'name', 'legs', 'breed', 'tricks'], { label: 'Dog d', hl: { 3: 'p', 4: 'p' } })}
      ${H.arr(['vptr→Animal', 'name', 'legs'], { label: 'Animal a = d;', hl: { 0: 'r' } })}
      <p><b>Where slicing sneaks in:</b></p>
      ${H.table(['Code', 'Sliced?', 'Why'], [
        ['<code>void feed(Animal a)</code>; <code>feed(dog)</code>', H.c('r', 'yes'), 'by-value parameter of base type'],
        ['<code>Animal pick() { return dog; }</code>', H.c('r', 'yes'), 'by-value return of base type'],
        ['<code>std::vector&lt;Animal&gt; zoo; zoo.push_back(dog);</code>', H.c('r', 'yes'), 'container stores Animal objects'],
        ['<code>catch (std::exception e)</code>', H.c('r', 'yes'), 'exception caught by value'],
        ['<code>Animal&amp; r = dog2; r = dog1;</code>', H.c('r', 'partial'), 'only the Animal part of dog2 is overwritten'],
        ['<code>void feed(const Animal&amp; a)</code>', H.c('g', 'no'), 'a reference refers to the whole Dog'],
        ['<code>std::vector&lt;std::unique_ptr&lt;Animal&gt;&gt;</code>', H.c('g', 'no'), 'stores pointers; objects stay whole on the heap']
      ])}
      <p><b>Why C++ allows it:</b> a <code>Dog</code> <i>is-an</i> <code>Animal</code>, so it binds to <code>const Animal&amp;</code>, which is exactly the parameter of Animal's copy constructor. The language cannot know you wanted polymorphism instead of a copy.</p>
      <p><b>How to prevent it:</b></p>
      <ol>
        <li>Pass and store polymorphic objects by <b>reference or (smart) pointer</b>, never by base value.</li>
        <li><b>Catch exceptions by <code>const&amp;</code></b>: <code>catch (const std::exception&amp; e)</code>.</li>
        <li>Make polymorphic bases <b>abstract</b> — a by-value parameter of abstract type does not compile — or make their copy operations <code>protected</code> / <code>= delete</code> (Core Guidelines C.67: "a polymorphic class should suppress public copy/move").</li>
        <li>If you truly need a copy of "whatever this really is", add a virtual <b><code>clone()</code></b> that returns <code>std::unique_ptr&lt;Base&gt;</code>.</li>
      </ol>`,
    clues: [
      '"Derived-specific data disappeared after storing in a vector" → <code>vector&lt;Base&gt;</code> slices',
      '"Virtual function calls the base version even though I passed a derived object" → parameter taken by value',
      '"<code>e.what()</code> returns std::exception instead of my message" → catch by value',
      '"What is object slicing and how do you prevent it?" → classic interview question; answer with references/pointers, abstract base, clone',
      '"Copy a polymorphic object without knowing its type" → virtual clone (virtual constructor idiom)',
      '"Assigning through a base reference produced a mixed object" → partial assignment slicing'
    ],
    code: [R`
      #include <iostream>
      #include <memory>
      #include <string>
      #include <vector>

      struct Animal {
          std::string name;
          explicit Animal(std::string n) : name(std::move(n)) {}
          virtual ~Animal() = default;
          virtual std::string speak() const { return name + ": ..."; }
      };
      struct Dog : Animal {
          std::string breed;
          Dog(std::string n, std::string b) : Animal(std::move(n)), breed(std::move(b)) {}
          std::string speak() const override { return name + " the " + breed + ": Woof"; }
      };

      void byValue(Animal a)      { std::cout << "byValue: " << a.speak() << '\n'; }   // SLICES
      void byRef(const Animal& a) { std::cout << "byRef:   " << a.speak() << '\n'; }   // keeps the Dog

      int main() {
          Dog rex("Rex", "Labrador");
          byValue(rex);                               // byValue: Rex: ...           (sliced!)
          byRef(rex);                                 // byRef:   Rex the Labrador: Woof

          std::vector<Animal> zoo;                    // stores Animal objects
          zoo.push_back(rex);                         // sliced copy
          std::cout << zoo[0].speak() << '\n';       // Rex: ...

          std::vector<std::unique_ptr<Animal>> safeZoo;   // stores pointers: no slicing
          safeZoo.push_back(std::make_unique<Dog>("Rex", "Labrador"));
          std::cout << safeZoo[0]->speak() << '\n';  // Rex the Labrador: Woof
      }
    `],
    codeTitle: ['Slicing vs no slicing, side by side'],
    viz: {
      title: 'Watch the derived part get sliced off',
      input: 'value',
      inputLabel: 'Scenario: value | ref | vector | assign | catch',
      gen: function (input) {
        var sc = String(input || '').trim().toLowerCase();
        var ok = ['value', 'ref', 'vector', 'assign', 'catch'];
        if (ok.indexOf(sc) < 0) throw new Error('Type one of: value, ref, vector, assign, catch');
        var offs = ['+0', '+8', '+40', '+48', '+80'];
        var dogCells = ['vptr→Dog', 'name="Rex"', 'legs=4', 'breed="Lab"', 'tricks=3'];
        var frames = [];
        function dog(label, cells, hl) { return { type: 'array', label: label, values: cells.slice(), hl: hl || {}, idxLabels: offs }; }
        function animal(label, cells, hl) { return { type: 'array', label: label, values: cells.slice(), hl: hl || {}, idxLabels: offs.slice(0, 3) }; }
        var baseHl = { 0: 'win', 1: 'win', 2: 'win' }, derHl = { 3: 'sel', 4: 'sel' };
        function both(h1, h2) { var h = {}; Object.keys(h1).forEach(function (k) { h[k] = h1[k]; }); Object.keys(h2).forEach(function (k) { h[k] = h2[k]; }); return h; }
        frames.push({ narr: 'A <code>Dog</code> in memory: the <b>Animal sub-object</b> comes first (vptr, name, legs — blue), then the <b>Dog-only members</b> (breed, tricks — purple). Offsets are for a typical 64-bit layout.', parts: [dog('Dog rex (40 + 48 = 88 bytes)', dogCells, both(baseHl, derHl)), note('Animal part = first 3 cells. A variable of type <code>Animal</code> has room for exactly those 3 cells.', 'Layout')] });
        if (sc === 'ref') {
          frames.push({ narr: '<code>void feed(const Animal&amp; a)</code>: a reference is just another name for the <b>whole</b> object. No copy, nothing sliced.', parts: [{ type: 'code', label: 'Code', lang: 'cpp', code: 'void feed(const Animal& a) { cout << a.speak(); }\nfeed(rex);', hl: { 2: 'ok' } }, dog('a refers to rex (same memory)', dogCells, { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok', 4: 'ok' })] });
          frames.push({ narr: '<code>a.speak()</code> reads the vptr at offset +0: it still says <b>Dog</b>, so <b>Dog::speak</b> runs.', parts: [dog('rex', dogCells, { 0: 'cur' }), out('Rex the Lab: Woof')] });
          frames.push({ narr: 'Same with <code>Animal*</code>, <code>std::unique_ptr&lt;Animal&gt;</code> and <code>std::shared_ptr&lt;Animal&gt;</code>: they point at the full object.', parts: [{ type: 'table', label: 'Safe ways to handle polymorphic objects', columns: ['form', 'sliced?'], rows: [['const Animal&', 'no'], ['Animal*', 'no'], ['std::unique_ptr<Animal>', 'no'], ['std::vector<std::unique_ptr<Animal>>', 'no']], hl: { 0: 'ok', 1: 'ok', 2: 'ok', 3: 'ok' } }] });
          frames.push({ narr: 'Rule of thumb: <b>polymorphism lives behind references and pointers</b>. The moment you write the base type by value, you get a base object.', parts: [note('Try input <code>value</code> to see the opposite.', 'Next')] });
          return frames;
        }
        if (sc === 'assign') {
          var d2 = ['vptr→Dog', 'name="Bo"', 'legs=3', 'breed="Pug"', 'tricks=0'];
          frames.push({ narr: 'Two dogs. <code>Animal&amp; r = bo;</code> then <code>r = rex;</code>. Assignment through a <b>base reference</b> calls <b>Animal::operator=</b> (it is not virtual).', parts: [dog('rex', dogCells, baseHl), dog('bo (r refers here)', d2, both(baseHl, derHl)), { type: 'code', label: 'Code', lang: 'cpp', code: 'Animal& r = bo;\nr = rex;   // Animal::operator=(const Animal&)', hl: { 2: 'cur' } }] });
          var mixed = d2.slice(); mixed[1] = 'name="Rex"'; mixed[2] = 'legs=4';
          frames.push({ narr: 'Animal::operator= copies only the Animal members: name and legs. The <b>vptr is never copied</b> by assignment (each object keeps its own type), and breed/tricks are untouched.', parts: [dog('rex', dogCells, { 1: 'ok', 2: 'ok' }), dog('bo after r = rex', mixed, { 1: 'ok', 2: 'ok', 3: 'bad', 4: 'bad' })] });
          frames.push({ narr: '<span class="c-r">bo is now a Frankenstein dog:</span> Rex\'s name and legs with Bo\'s breed (Pug) and tricks (0). No crash, no warning — just wrong data that can break class invariants.', parts: [dog('bo', mixed, { 1: 'cur', 2: 'cur', 3: 'bad', 4: 'bad' }), out('bo.speak() → Rex the Pug: Woof')] });
          frames.push({ narr: '<b>Fix:</b> make the base\'s copy/move assignment <code>protected</code> (or <code>= delete</code>), so <code>r = rex</code> does not compile. Polymorphic bases rarely need public assignment.', parts: [{ type: 'code', label: 'Prevention', lang: 'cpp', code: 'struct Animal {\n    virtual ~Animal() = default;\nprotected:\n    Animal(const Animal&) = default;\n    Animal& operator=(const Animal&) = default;\n};', hl: { 3: 'ok', 4: 'ok', 5: 'ok' } }] });
          return frames;
        }
        var codeMap = {
          value: 'void feed(Animal a) { cout << a.speak(); }\nfeed(rex);',
          vector: 'std::vector<Animal> zoo;\nzoo.push_back(rex);\ncout << zoo[0].speak();',
          'catch': 'struct MyError : std::exception { string msg; ... };\ntry { throw MyError{"disk full"}; }\ncatch (std::exception e) { cout << e.what(); }'
        };
        var where = { value: 'the by-value parameter <code>a</code>', vector: 'the vector\'s element <code>zoo[0]</code>', 'catch': 'the handler\'s by-value object <code>e</code>' }[sc];
        var cline = { value: 2, vector: 2, 'catch': 3 }[sc];
        frames.push({ narr: 'The code creates a <b>new object of base type</b>: ' + where + '. To build it, the compiler calls <b>Animal\'s copy constructor</b> with <code>const Animal&amp; = rex</code> — legal, since a Dog is-an Animal.', parts: [{ type: 'code', label: 'Code', lang: 'cpp', code: codeMap[sc], hl: one(cline, 'cur') }, dog('rex (source)', dogCells, baseHl), animal('new Animal object (empty slot)', ['?', '?', '?'])] });
        frames.push({ narr: 'Animal\'s copy constructor copies <b>name</b> and <b>legs</b>. It has no idea breed and tricks exist.', parts: [dog('rex (source)', dogCells, { 1: 'ok', 2: 'ok' }), animal('new Animal object', ['?', 'name="Rex"', 'legs=4'], { 1: 'ok', 2: 'ok' })] });
        frames.push({ narr: '<span class="c-r">breed and tricks are sliced off</span> — there is simply no room for them in an Animal.', parts: [dog('rex (source)', dogCells, { 3: 'bad', 4: 'bad' }), animal('new Animal object', ['?', 'name="Rex"', 'legs=4'])] });
        frames.push({ narr: 'And the vptr: the copy is being constructed <b>as an Animal</b>, so Animal\'s constructor sets its vptr to the <b>Animal vtable</b>. The new object is a real, complete Animal — not a Dog.', parts: [animal('new Animal object', ['vptr→Animal', 'name="Rex"', 'legs=4'], { 0: 'bad' })] });
        var res = sc === 'catch' ? 'std::exception' : 'Rex: ...';
        frames.push({ narr: (sc === 'catch' ? '<code>e.what()</code>' : '<code>speak()</code>') + ' is virtual, but this object\'s vptr says Animal, so the <b>base version</b> runs: <b>' + esc(res) + '</b>' + (sc === 'catch' ? ' (libstdc++ prints the base class message, not "disk full").' : ' instead of "Woof".'), parts: [animal('sliced copy', ['vptr→Animal', 'name="Rex"', 'legs=4'], { 0: 'cur' }), out(res)] });
        var fix = { value: 'Take <code>const Animal&amp; a</code> instead of <code>Animal a</code>.', vector: 'Use <code>std::vector&lt;std::unique_ptr&lt;Animal&gt;&gt;</code> and <code>std::make_unique&lt;Dog&gt;(…)</code>.', 'catch': 'Always <code>catch (const std::exception&amp; e)</code> — catch by const reference.' }[sc];
        frames.push({ narr: '<b>Fix:</b> ' + fix + ' Extra safety: make polymorphic bases abstract or give them protected copy operations, so the slicing line does not even compile.', parts: [{ type: 'table', label: 'Slicing summary', columns: ['', 'before', 'after fix'], rows: [['object type at runtime', 'Animal', 'Dog'], ['Dog members', 'lost', 'kept'], ['virtual calls go to', 'Animal::…', 'Dog::…']], hl: { 0: 'ok', 1: 'ok', 2: 'ok' } }] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Predict the output: vector&lt;Base&gt;',
        html: `<p>Each <code>push_back</code> makes an <b>Animal</b> copy. All three elements are plain Animals, so the loop prints <b>"...", "...", "..."</b>. Note that even the Cat's extra members are gone forever: you cannot "cast back" to Cat (a <code>static_cast&lt;Cat&amp;&gt;(zoo[1])</code> would be undefined behaviour).</p>`,
        code: R`
          struct Animal { virtual ~Animal() = default; virtual const char* sound() const { return "..."; } };
          struct Dog : Animal { const char* sound() const override { return "Woof"; } };
          struct Cat : Animal { const char* sound() const override { return "Meow"; } };
          int main() {
              std::vector<Animal> zoo;
              zoo.push_back(Dog{});
              zoo.push_back(Cat{});
              zoo.push_back(Animal{});
              for (const auto& a : zoo) std::cout << a.sound() << ' ';   // ... ... ...
          }
        `
      },
      {
        title: 'Catch by value slices exceptions',
        html: `<p>The thrown object is a <code>std::runtime_error</code> carrying "disk full". <code>catch (std::exception e)</code> copy-constructs a <b>plain</b> <code>std::exception</code> from it, so <code>what()</code> prints the generic message ("std::exception" in libstdc++). <code>catch (const std::exception&amp; e)</code> binds to the original object and prints "disk full". Bonus: rethrowing with <code>throw e;</code> would throw the <b>sliced</b> copy; use plain <code>throw;</code> to rethrow the original.</p>`,
        code: R`
          int main() {
              try { throw std::runtime_error("disk full"); }
              catch (std::exception e) { std::cout << e.what() << '\n'; }          // std::exception (sliced)
              try { throw std::runtime_error("disk full"); }
              catch (const std::exception& e) { std::cout << e.what() << '\n'; }   // disk full
          }
        `
      },
      {
        title: 'Make slicing a compile error',
        html: `<p>If <code>Animal</code> is abstract, <code>void feed(Animal a)</code> and <code>std::vector&lt;Animal&gt;</code> fail to compile (you cannot create Animal objects). If it must be concrete, make its copy operations <code>protected</code>: derived classes can still use them in their own copy constructors, but outside code cannot copy-construct an Animal from a Dog.</p>`,
        code: R`
          class Animal {
          public:
              virtual ~Animal() = default;
              virtual std::string speak() const = 0;            // abstract: no Animal objects at all
          protected:
              Animal() = default;
              Animal(const Animal&) = default;                  // usable by Dog's copy ctor only
              Animal& operator=(const Animal&) = default;
          };
          class Dog final : public Animal {
          public:
              std::string speak() const override { return "Woof"; }
          };
          int main() {
              Dog a, b = a;                                     // fine: Dog's copy ctor calls protected Animal copy
              // Animal x = a;                                  // error: Animal is abstract / copy is protected
              std::cout << b.speak() << '\n';
          }
        `
      },
      {
        title: 'Virtual clone(): copying without slicing',
        html: `<p>To duplicate an object you only know as <code>const Animal&amp;</code>, ask the object to copy <b>itself</b>: each class overrides <code>clone()</code> and calls its own copy constructor. The result is returned as <code>std::unique_ptr&lt;Animal&gt;</code> but the heap object is a full Dog. This is the "virtual constructor" idiom.</p>`,
        code: R`
          struct Animal {
              virtual ~Animal() = default;
              virtual std::unique_ptr<Animal> clone() const = 0;
              virtual std::string speak() const = 0;
          };
          struct Dog final : Animal {
              std::string breed = "Lab";
              std::unique_ptr<Animal> clone() const override { return std::make_unique<Dog>(*this); }   // full copy
              std::string speak() const override { return breed + ": Woof"; }
          };
          int main() {
              Dog d;
              const Animal& a = d;
              std::unique_ptr<Animal> copy = a.clone();          // a whole Dog, not a slice
              std::cout << copy->speak() << '\n';                // Lab: Woof
          }
        `
      }
    ],
    deepDive: `<p><b>Mechanics.</b> Slicing is not a special language rule; it is ordinary overload resolution. <code>Animal a = dog;</code> looks for an Animal constructor accepting a Dog; <code>Animal(const Animal&amp;)</code> matches via derived-to-base reference binding. The copy constructor runs as part of constructing an <i>Animal</i>, so it sets the Animal vptr. Moves slice the same way (<code>Animal(Animal&amp;&amp;)</code>), and the moved-from Dog is left with a gutted Animal part but intact Dog members — another inconsistent state.</p>
      <p><b>Why polymorphic classes and value semantics clash.</b> Value semantics need the static type to know the full size of the object (stack slot, vector element). Polymorphism means the full size is only known at runtime. C++ resolves the tension by putting polymorphic objects on the heap behind pointers — or with modern tools: <code>std::variant</code> (closed set, size = largest alternative), type erasure (<code>std::function</code>, Sean Parent's "runtime polymorphism without inheritance"), small-buffer optimized polymorphic wrappers, and C++26 <code>std::polymorphic&lt;T&gt;</code>, which deep-copies through an internal clone mechanism.</p>
      <p><b>Covariant return types.</b> <code>Dog* clone() const override</code> is allowed to override <code>Animal* clone() const</code> (raw pointers/references only), but not with <code>unique_ptr&lt;Dog&gt;</code> vs <code>unique_ptr&lt;Animal&gt;</code> — smart pointers are unrelated class types. The common workaround is a private virtual <code>clone_impl()</code> returning raw pointers plus public non-virtual wrappers returning smart pointers, or a CRTP <code>Cloneable&lt;Derived, Base&gt;</code> helper.</p>
      <p><b>Detection.</b> clang-tidy has <code>cppcoreguidelines-slicing</code> (flags copies that discard derived state or override vtable entries) and <code>bugprone-throw-keyword-missing</code>/<code>misc-throw-by-value-catch-by-reference</code>. GCC warns <code>-Wcatch-value</code> for catching polymorphic exceptions by value (enabled by -Wall).</p>
      <p><b>Partial assignment and invariants.</b> If Dog maintains an invariant linking base and derived fields (e.g. "legs == 4 for non-Pug breeds"), assignment through <code>Animal&amp;</code> can break it silently. Some codebases make <code>operator=</code> virtual to "fix" this, but a virtual <code>operator=(const Animal&amp;)</code> in Dog would then need to handle a right-hand side that is a Cat — usually a sign the type should not be assignable through the base at all.</p>`,
    aiEra: `<p><b>What AI changes:</b> slicing bugs survive code review because the code reads naturally: <code>std::vector&lt;Shape&gt; shapes;</code> looks fine at a glance, and LLM-generated code produces exactly this when asked to "store shapes in a vector". Tests that only check the count of elements will pass.</p>
      <p><b>Use AI as a partner:</b> <code>Scan this code for object slicing: by-value base parameters, containers of base type, catch-by-value, assignment through base references.</code> Pair it with <code>-Wall -Wextra</code> and clang-tidy's <code>cppcoreguidelines-slicing</code> so the tools, not just the model, check it.</p>
      <p><b>Where AI goes wrong:</b> suggesting <code>static_cast&lt;Dog&amp;&gt;</code> on a sliced object to "get the Dog back" (undefined behaviour — the Dog data no longer exists), using <code>std::vector&lt;std::reference_wrapper&lt;Animal&gt;&gt;</code> without thinking about lifetimes, and writing a non-virtual <code>clone()</code>.</p>
      <p><b>What you must still own:</b> recognising the four slicing sites on sight, explaining the vptr consequence, and choosing among references, smart pointers, abstract bases, clone and variants for a given design.</p>`,
    problems: [
      {
        title: 'Unslice the Zoo: Store Animals Polymorphically and Copy Them Safely',
        level: 'Medium', tags: ['object slicing', 'unique_ptr', 'clone', 'polymorphism'], companies: ['Bloomberg', 'Electronic Arts', 'Morgan Stanley'],
        statement: `<p>A zoo app stores <code>std::vector&lt;Animal&gt;</code>; all animals print "..." instead of their sound and Dog breeds are lost. (1) Fix storage so each animal keeps its real type. (2) Implement <code>Zoo</code> copy construction so that copying a zoo <b>deep-copies</b> every animal with its real type (no slicing, no shared animals).</p>`,
        constraints: `<p>Up to 10<sup>4</sup> animals; types: Dog (has breed), Cat (has lives). Zoo copies must be independent.</p>`,
        example: `<p>Zoo z: [Dog "Lab", Cat 9]. <code>Zoo z2 = z;</code> then change z2's dog breed to "Pug" → ${H.c('g', 'z still prints "Lab: Woof", "Meow x9"')}; z2 prints ${H.c('b', '"Pug: Woof", "Meow x9"')}.</p>`,
        brute: {
          why: `<p>The brute version stores <code>std::vector&lt;Animal&gt;</code>. Each insertion slices: Dog's breed and Cat's lives are discarded and every element's vptr points to Animal's vtable. A naive "fix" with <code>std::vector&lt;Animal*&gt;</code> and the default Zoo copy constructor would make two zoos <b>share</b> the same animals (shallow copy) and double-delete them.</p>`,
          code: R`
            #include <iostream>
            #include <string>
            #include <vector>
            struct Animal { virtual ~Animal() = default; virtual std::string sound() const { return "..."; } };
            struct Dog : Animal { std::string breed = "Lab"; std::string sound() const override { return breed + ": Woof"; } };
            struct Cat : Animal { int lives = 9; std::string sound() const override { return "Meow x" + std::to_string(lives); } };
            struct Zoo {
                std::vector<Animal> animals;                    // SLICES every animal
                void add(const Animal& a) { animals.push_back(a); }
                void show() const { for (const auto& a : animals) std::cout << a.sound() << '\n'; }
            };
          `
        },
        mcq: { q: 'Zoo stores <code>std::vector&lt;std::unique_ptr&lt;Animal&gt;&gt;</code>. What does the compiler-generated Zoo copy constructor do?', options: ['It is deleted, because unique_ptr is not copyable', 'It deep-copies all animals automatically', 'It shallow-copies the pointers', 'It slices each animal'], answer: 0, explain: 'A vector of unique_ptr is move-only, so Zoo\'s implicit copy constructor is defined as deleted. To get copies you must write one that clones each element.' },
        hints: [
          `<p>Hint 1: store <code>std::unique_ptr&lt;Animal&gt;</code> so each object stays whole on the heap and is owned by exactly one zoo.</p>`,
          `<p>Hint 2: add a pure virtual <code>clone() const</code> returning <code>std::unique_ptr&lt;Animal&gt;</code>; each class returns <code>std::make_unique&lt;Self&gt;(*this)</code>.</p>`,
          `<p>Hint 3: write <code>Zoo(const Zoo&amp; o)</code> that reserves and pushes <code>a-&gt;clone()</code> for each element; implement copy assignment with copy-and-swap; default the moves (they are cheap and noexcept).</p>`
        ],
        tests: { sig: 'int int string -> string[]', fn: 'zoo',
          harness: { cpp: "vector<string> zoo(int nd, int nc, string breed) { Zoo z; for (int i = 0; i < nd; ++i) z.add(make_unique<Dog>()); for (int i = 0; i < nc; ++i) z.add(make_unique<Cat>());\n  Zoo z2 = z; if (nd) static_cast<Dog&>(z2.at(0)).breed = breed; Zoo z3; z3 = z2; if (nd) static_cast<Dog&>(z3.at(nd - 1)).breed = breed + \"3\"; if (nc) static_cast<Cat&>(z3.at(nd)).lives = 1;\n  vector<string> r; int n = nd + nc; for (int i = 0; i < n; ++i) r.push_back(z.at(i).sound()); r.push_back(\"|\"); for (int i = 0; i < n; ++i) r.push_back(z2.at(i).sound()); r.push_back(\"|\"); for (int i = 0; i < n; ++i) r.push_back(z3.at(i).sound()); return r; }" }, cases: [
          [[1,1,"Pug"], ["Lab: Woof","Meow x9","|","Pug: Woof","Meow x9","|","Pug3: Woof","Meow x1"]],
          [[0,0,"x"], ["|","|"]],
          [[2,0,"Pug"], ["Lab: Woof","Lab: Woof","|","Pug: Woof","Lab: Woof","|","Pug: Woof","Pug3: Woof"]],
          [[0,3,"x"], ["Meow x9","Meow x9","Meow x9","|","Meow x9","Meow x9","Meow x9","|","Meow x1","Meow x9","Meow x9"]],
          [[1,0,"Husky"], ["Lab: Woof","|","Husky: Woof","|","Husky3: Woof"]],
          [[3,2,"Pug"], ["Lab: Woof","Lab: Woof","Lab: Woof","Meow x9","Meow x9","|","Pug: Woof","Lab: Woof","Lab: Woof","Meow x9","Meow x9","|","Pug: Woof","Lab: Woof","Pug3: Woof","Meow x1","Meow x9"]],
          [[0,1,""], ["Meow x9","|","Meow x9","|","Meow x1"]],
          [[5,5,"Lab"], ["Lab: Woof","Lab: Woof","Lab: Woof","Lab: Woof","Lab: Woof","Meow x9","Meow x9","Meow x9","Meow x9","Meow x9","|","Lab: Woof","Lab: Woof","Lab: Woof","Lab: Woof","Lab: Woof","Meow x9","Meow x9","Meow x9","Meow x9","Meow x9","|","Lab: Woof","Lab: Woof","Lab: Woof","Lab: Woof","Lab3: Woof","Meow x1","Meow x9","Meow x9","Meow x9","Meow x9"]],
          [[5000,5000,"Pug"], {"$concat":[{"$rep":"Lab: Woof","n":5000},{"$rep":"Meow x9","n":5000},["|","Pug: Woof"],{"$rep":"Lab: Woof","n":4999},{"$rep":"Meow x9","n":5000},["|","Pug: Woof"],{"$rep":"Lab: Woof","n":4998},["Pug3: Woof","Meow x1"],{"$rep":"Meow x9","n":4999}]}]
        ] },
        solution: {
          approach: `<p>Polymorphic storage via <code>unique_ptr&lt;Animal&gt;</code> fixes slicing. Deep copy requires asking each object to copy itself (<code>clone</code>), because only the object knows its dynamic type. Zoo follows the Rule of Five: custom copy ctor/assignment (cloning), defaulted noexcept moves, defaulted destructor.</p>`,
          code: R`
            #include <iostream>
            #include <memory>
            #include <string>
            #include <utility>
            #include <vector>

            struct Animal {
                virtual ~Animal() = default;
                virtual std::string sound() const = 0;
                virtual std::unique_ptr<Animal> clone() const = 0;
            };
            struct Dog final : Animal {
                std::string breed = "Lab";
                std::string sound() const override { return breed + ": Woof"; }
                std::unique_ptr<Animal> clone() const override { return std::make_unique<Dog>(*this); }
            };
            struct Cat final : Animal {
                int lives = 9;
                std::string sound() const override { return "Meow x" + std::to_string(lives); }
                std::unique_ptr<Animal> clone() const override { return std::make_unique<Cat>(*this); }
            };

            class Zoo {
                std::vector<std::unique_ptr<Animal>> animals_;
            public:
                Zoo() = default;
                Zoo(const Zoo& o) {                                    // deep, type-preserving copy
                    animals_.reserve(o.animals_.size());
                    for (const auto& a : o.animals_) animals_.push_back(a->clone());
                }
                Zoo& operator=(Zoo o) noexcept { std::swap(animals_, o.animals_); return *this; }   // copy-and-swap
                Zoo(Zoo&&) noexcept = default;
                ~Zoo() = default;

                void add(std::unique_ptr<Animal> a) { animals_.push_back(std::move(a)); }
                Animal& at(std::size_t i) { return *animals_[i]; }
                void show() const { for (const auto& a : animals_) std::cout << a->sound() << '\n'; }
            };

            int main() {
                Zoo z;
                z.add(std::make_unique<Dog>());
                z.add(std::make_unique<Cat>());
                Zoo z2 = z;                                            // clones: Dog stays Dog, Cat stays Cat
                static_cast<Dog&>(z2.at(0)).breed = "Pug";             // safe: we know element 0 is a Dog
                z.show();                                              // Lab: Woof / Meow x9
                z2.show();                                             // Pug: Woof / Meow x9
            }

          `,
          dry: { head: ['Step', 'z.animals_', 'z2.animals_', 'Note'], rows: [
            ['add Dog, add Cat', '[Dog@A, Cat@B]', '—', 'objects whole on heap'],
            ['<code>Zoo z2 = z</code>', '[Dog@A, Cat@B]', '[Dog@C, Cat@D]', 'clone() per element'],
            ['z2 dog breed = Pug', 'Dog@A breed Lab', 'Dog@C breed Pug', H.c('g', 'independent')],
            ['end of main', 'A, B freed', 'C, D freed', 'each freed once']
          ] },
          complexity: `<p>Copying a zoo: O(N) clones, each O(size of animal). Moving a zoo: O(1). Calls: one virtual call per animal per operation.</p>`,
          followUps: ['Implement clone once with a CRTP helper <code>Cloneable&lt;Derived, Animal&gt;</code>.', 'Redo the zoo with <code>std::variant&lt;Dog, Cat&gt;</code> — what do you gain and lose?', 'How would C++26 <code>std::polymorphic&lt;Animal&gt;</code> simplify Zoo?']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 8 — Operator overloading
     ====================================================================== */
  topics.push({
    title: 'Operator Overloading: Making Your Types Feel Built-In (and the C++20 Spaceship)',
    analogy: `<p>The <b>+</b> key on a calculator means "add numbers". On a music app, a <b>+</b> button means "add song to playlist". Same symbol, different meaning depending on <b>what you press it on</b> — and it feels natural because the meaning matches what people expect.</p>
      <p>Operator overloading lets you teach C++ what <code>+</code>, <code>==</code>, <code>&lt;&lt;</code> or <code>[]</code> mean for <b>your</b> types. The golden rule is the same as for the button: <b>only give an operator a meaning that people would guess anyway</b>. A <code>+</code> that secretly deletes a file is legal and evil.</p>`,
    explain: `<p>An overloaded operator is just a function with a special name: <code>a + b</code> becomes either <code>a.operator+(b)</code> (member) or <code>operator+(a, b)</code> (free function). The compiler tries both.</p>
      ${H.table(['Expression', 'Becomes', 'Usually written as'], [
        ['<code>a + b</code>', '<code>operator+(a, b)</code>', 'free function (symmetric), built on <code>+=</code>'],
        ['<code>a += b</code>', '<code>a.operator+=(b)</code>', 'member, returns <code>*this</code> by reference'],
        ['<code>-a</code>', '<code>a.operator-()</code>', 'member, const, returns a new value'],
        ['<code>a == b</code>', '<code>a.operator==(b)</code>', 'member or friend; C++20: <code>= default</code>'],
        ['<code>a &lt; b</code>', '<code>(a &lt;=&gt; b) &lt; 0</code> (C++20)', 'one <code>operator&lt;=&gt;</code> gives all four orderings'],
        ['<code>std::cout &lt;&lt; a</code>', '<code>operator&lt;&lt;(std::cout, a)</code>', 'free (left side is ostream, not yours)'],
        ['<code>a[i]</code>', '<code>a.operator[](i)</code>', 'member; const and non-const versions'],
        ['<code>++a</code> / <code>a++</code>', '<code>a.operator++()</code> / <code>a.operator++(0)</code>', 'prefix returns <code>T&amp;</code>; postfix takes dummy <code>int</code>, returns old value'],
        ['<code>f(x)</code>', '<code>f.operator()(x)</code>', 'function objects / lambdas'],
        ['<code>if (a)</code>', '<code>a.operator bool()</code>', '<code>explicit</code> to block accidental conversions']
      ])}
      <p><b>Member or free function?</b></p>
      <ul>
        <li><b>Must be members:</b> <code>=</code>, <code>[]</code>, <code>()</code>, <code>-&gt;</code>, and conversion operators.</li>
        <li><b>Should be members:</b> compound assignment (<code>+=</code>, <code>-=</code>…) and <code>++</code>/<code>--</code>: they modify <code>*this</code>.</li>
        <li><b>Should be free (often <code>friend</code>):</b> symmetric binary operators (<code>+</code>, <code>-</code>, <code>*</code>, <code>==</code>) so that <b>implicit conversions work on both sides</b> (<code>2 * v</code> and <code>v * 2</code>), and stream operators <code>&lt;&lt;</code>/<code>&gt;&gt;</code> because the left operand is a stream you do not own.</li>
      </ul>
      <p><b>C++20 comparisons.</b> Write <code>bool operator==(const T&amp;) const = default;</code> and <code>auto operator&lt;=&gt;(const T&amp;) const = default;</code> and you get <code>==</code>, <code>!=</code>, <code>&lt;</code>, <code>&lt;=</code>, <code>&gt;</code>, <code>&gt;=</code>, compared member by member in declaration order. The compiler <b>rewrites</b> <code>a != b</code> as <code>!(a == b)</code> and <code>a &lt; b</code> as <code>(a &lt;=&gt; b) &lt; 0</code>, and even tries reversed arguments (<code>b == a</code>), so you no longer write six boilerplate functions.</p>
      <p><b>What you cannot do:</b> invent new operators (<code>**</code>), change precedence or arity, or overload <code>::</code>, <code>.</code>, <code>.*</code>, <code>?:</code>, <code>sizeof</code>. Overloading <code>&amp;&amp;</code>, <code>||</code> and <code>,</code> is legal but loses short-circuit evaluation (before C++17 also sequencing) — avoid it.</p>`,
    clues: [
      '"Implement a Fraction / Complex / Money / BigInt / Matrix class" → arithmetic operators, <code>==</code>, <code>&lt;=&gt;</code>, <code>&lt;&lt;</code>',
      '"Why is <code>operator&lt;&lt;</code> a free function?" → left operand is <code>std::ostream</code>, which you cannot add members to',
      '"<code>2 * v</code> does not compile but <code>v * 2</code> does" → the operator is a member; make it a free function',
      '"Difference between prefix and postfix ++" → postfix takes a dummy <code>int</code>, returns the old value (a copy)',
      '"Make a type usable as a <code>std::map</code> key / in <code>std::sort</code>" → strict weak ordering via <code>&lt;</code> or <code>&lt;=&gt;</code>',
      '"Use objects like functions" / custom comparator / hash → <code>operator()</code>',
      '"Smart pointer or iterator implementation" → <code>*</code>, <code>-&gt;</code>, <code>++</code>, <code>==</code>'
    ],
    code: [R`
      #include <compare>
      #include <iostream>

      struct Vec2 {
          int x = 0, y = 0;

          // Compound assignment: member, modifies *this, returns a reference (allows chaining).
          Vec2& operator+=(const Vec2& o) { x += o.x; y += o.y; return *this; }
          Vec2& operator*=(int k) { x *= k; y *= k; return *this; }

          Vec2 operator-() const { return {-x, -y}; }                 // unary minus: new value

          int& operator[](int i) { return i == 0 ? x : y; }           // write access: v[0] = 5
          int  operator[](int i) const { return i == 0 ? x : y; }     // read access on const Vec2

          explicit operator bool() const { return x != 0 || y != 0; } // if (v) ... but not int n = v;

          bool operator==(const Vec2&) const = default;               // C++20: memberwise ==, gives != too
          auto operator<=>(const Vec2&) const = default;              // C++20: lexicographic <, <=, >, >=
      };

      // Symmetric binary operators as FREE functions, implemented with the compound versions.
      Vec2 operator+(Vec2 a, const Vec2& b) { a += b; return a; }    // a is a copy we can modify
      Vec2 operator*(Vec2 v, int k) { v *= k; return v; }
      Vec2 operator*(int k, Vec2 v) { v *= k; return v; }            // lets 2 * v compile

      std::ostream& operator<<(std::ostream& os, const Vec2& v) {     // free: left side is ostream
          return os << '(' << v.x << ", " << v.y << ')';
      }

      int main() {
          Vec2 a{1, 2}, b{3, 4};
          std::cout << a + b << ' ' << 2 * a << ' ' << -b << '\n';   // (4, 6) (2, 4) (-3, -4)
          a += b;                                                     // a = (4, 6)
          std::cout << (a == b) << (a != b) << (b < a) << '\n';      // 011  (false, true, true)
          a[0] = 0; a[1] = 0;
          if (!a) std::cout << "a is the zero vector\n";
      }
    `, R`
      // Increment operators and a function object.
      #include <iostream>
      class Counter {
          int n_ = 0;
      public:
          Counter& operator++() { ++n_; return *this; }               // prefix: increment, return self
          Counter operator++(int) { Counter old = *this; ++n_; return old; }   // postfix: dummy int, return OLD copy
          int value() const { return n_; }
      };

      struct IsMultipleOf {                                           // a "functor": object with operator()
          int k;
          bool operator()(int x) const { return x % k == 0; }
      };

      int main() {
          Counter c;
          Counter before = c++;                                       // before = 0, c = 1
          ++c;                                                        // c = 2 (no copy made)
          std::cout << before.value() << ' ' << c.value() << '\n';    // 0 2
          IsMultipleOf by3{3};
          std::cout << by3(9) << by3(10) << '\n';                     // 10  (true, false)
      }
    `],
    codeTitle: ['A value type with the canonical operator set', 'Prefix/postfix ++ and operator()'],
    viz: {
      title: 'Which operator function does each expression call?',
      input: 'a = (1,2); b = (3,4); a + b; 2 * a; a += b; -a; a == b; a != b; b < a; a[0]; if (a); cout << a',
      inputLabel: 'Statements separated by ; using vectors a, b (e.g. a = (1,2); a + b; k * a; a * k; -a; a += b; a == b; a != b; a < b; a[0]; if (a); cout << a; a = b)',
      gen: function (input) {
        var st = words(input, 'Type statements like: a = (1,2); b = (3,4); a + b').split(';').map(function (s) { return s.trim(); }).filter(Boolean);
        if (!st.length) throw new Error('Type statements like: a = (1,2); b = (3,4); a + b');
        if (st.length > 14) throw new Error('Use at most 14 statements');
        var code = ['struct Vec2 {', '    int x = 0, y = 0;', '    Vec2& operator+=(const Vec2& o) { x += o.x; y += o.y; return *this; }', '    Vec2 operator-() const { return {-x, -y}; }', '    int& operator[](int i) { return i == 0 ? x : y; }', '    explicit operator bool() const { return x != 0 || y != 0; }', '    bool operator==(const Vec2&) const = default;', '    auto operator<=>(const Vec2&) const = default;', '};', 'Vec2 operator+(Vec2 a, const Vec2& b) { a += b; return a; }', 'Vec2 operator*(Vec2 v, int k) { return {v.x * k, v.y * k}; }', 'Vec2 operator*(int k, Vec2 v) { return v * k; }', 'std::ostream& operator<<(std::ostream& os, const Vec2& v);'].join('\n');
        var V = { a: [1, 2], b: [3, 4] }, rows = [], outp = [], frames = [];
        function s(v) { return '(' + v[0] + ',' + v[1] + ')'; }
        function cmp(p, q) { return p[0] !== q[0] ? (p[0] < q[0] ? -1 : 1) : p[1] !== q[1] ? (p[1] < q[1] ? -1 : 1) : 0; }
        function vn(n) { if (!V[n]) throw new Error('Only vectors a and b exist'); return V[n]; }
        function push(expr, call, result, lines, narr, cls) {
          rows.push([expr, call, result]);
          var hl = {}; [].concat(lines).forEach(function (l) { hl[l] = cls || 'cur'; });
          var th = {}; th[rows.length - 1] = cls === 'bad' ? 'bad' : 'cur';
          frames.push({ narr: narr, parts: [
            { type: 'code', label: 'Vec2 and its operators', lang: 'cpp', code: code, hl: hl },
            { type: 'table', label: 'Expression → function the compiler actually calls', columns: ['expression', 'becomes', 'result'], rows: rows.map(function (r) { return r.slice(); }), hl: th },
            { type: 'vars', label: 'Values', vals: { a: s(V.a), b: s(V.b) } },
            out(outp.join('\n'))
          ] });
        }
        frames.push({ narr: 'Every operator expression on a class type is turned into a <b>function call</b>. For each line we will show the exact function the compiler picks, and why it is a member or a free function.', parts: [{ type: 'code', label: 'Vec2 and its operators', lang: 'cpp', code: code }, { type: 'vars', label: 'Values', vals: { a: s(V.a), b: s(V.b) } }] });
        st.forEach(function (x) {
          var m, k;
          if ((m = x.match(/^(a|b)\s*=\s*\(\s*(-?\d{1,4})\s*,\s*(-?\d{1,4})\s*\)$/))) {
            V[m[1]] = [+m[2], +m[3]];
            push(x, m[1] + ' = Vec2{' + m[2] + ', ' + m[3] + '}', s(V[m[1]]), 1, 'Set <code>' + m[1] + '</code> to ' + s(V[m[1]]) + ' (aggregate initialization + the compiler-generated copy assignment).', 'ok');
          } else if ((m = x.match(/^(a|b)\s*=\s*(a|b)$/))) {
            V[m[1]] = vn(m[2]).slice();
            push(x, m[1] + '.operator=(' + m[2] + ')', s(V[m[1]]), 1, '<code>' + esc(x) + '</code>: we never wrote <code>operator=</code>, so the <b>compiler-generated copy assignment</b> copies x and y (Rule of Zero).', 'ok');
          } else if ((m = x.match(/^(a|b)\s*\+=\s*(a|b)$/))) {
            var t = vn(m[1]), o = vn(m[2]); t[0] += o[0]; t[1] += o[1];
            push(x, m[1] + '.operator+=(' + m[2] + ')', s(t), 3, '<code>' + esc(x) + '</code> → <b>member</b> <code>operator+=</code>: it modifies the left operand in place and returns <code>*this</code> by reference (so <code>(a += b) += b</code> works like for ints).');
          } else if ((m = x.match(/^(a|b)\s*\+\s*(a|b)$/))) {
            var r = [vn(m[1])[0] + vn(m[2])[0], vn(m[1])[1] + vn(m[2])[1]];
            push(x, 'operator+(' + m[1] + ', ' + m[2] + ')', s(r), [10, 3], '<code>' + esc(x) + '</code> → <b>free</b> <code>operator+</code>. It takes the left side <b>by value</b> (a copy it may change), reuses <code>+=</code> and returns the copy. One source of truth for the addition logic.');
          } else if ((m = x.match(/^(-?\d{1,4})\s*\*\s*(a|b)$/))) {
            k = +m[1]; var v1 = vn(m[2]);
            push(x, 'operator*(' + k + ', ' + m[2] + ')', s([v1[0] * k, v1[1] * k]), [12, 11], '<code>' + esc(x) + '</code>: the <b>left operand is an int</b>. A member function needs the left operand to be a Vec2, so only a <b>free</b> <code>operator*(int, Vec2)</code> can handle this. It forwards to the other overload.');
          } else if ((m = x.match(/^(a|b)\s*\*\s*(-?\d{1,4})$/))) {
            k = +m[2]; var v2 = vn(m[1]);
            push(x, 'operator*(' + m[1] + ', ' + k + ')', s([v2[0] * k, v2[1] * k]), 11, '<code>' + esc(x) + '</code> → free <code>operator*(Vec2, int)</code>.');
          } else if ((m = x.match(/^-\s*(a|b)$/))) {
            var v3 = vn(m[1]);
            push(x, m[1] + '.operator-()', s([-v3[0], -v3[1]]), 4, '<code>' + esc(x) + '</code> → unary member <code>operator-()</code>. It is <code>const</code> and returns a <b>new</b> value; the original is untouched.');
          } else if ((m = x.match(/^(a|b)\s*==\s*(a|b)$/))) {
            var eq = cmp(vn(m[1]), vn(m[2])) === 0;
            push(x, m[1] + '.operator==(' + m[2] + ')', String(eq), 7, '<code>' + esc(x) + '</code> → the <b>defaulted</b> <code>operator==</code>: compares x, then y, memberwise. Result <b>' + eq + '</b>.');
          } else if ((m = x.match(/^(a|b)\s*!=\s*(a|b)$/))) {
            var ne = cmp(vn(m[1]), vn(m[2])) !== 0;
            push(x, '!(' + m[1] + ' == ' + m[2] + ')   [rewritten]', String(ne), 7, '<code>' + esc(x) + '</code>: we never wrote <code>!=</code>. C++20 <b>rewrites</b> it as <code>!(a == b)</code>. Result <b>' + ne + '</b>.');
          } else if ((m = x.match(/^(a|b)\s*(<=|>=|<|>)\s*(a|b)$/))) {
            var c = cmp(vn(m[1]), vn(m[3])), op = m[2];
            var res = op === '<' ? c < 0 : op === '<=' ? c <= 0 : op === '>' ? c > 0 : c >= 0;
            push(x, '(' + m[1] + ' <=> ' + m[3] + ') ' + op + ' 0   [rewritten]', String(res), 8, '<code>' + esc(x) + '</code> → C++20 rewrites it to <code>(' + m[1] + ' &lt;=&gt; ' + m[3] + ') ' + esc(op) + ' 0</code>. The defaulted <code>&lt;=&gt;</code> compares <b>x first, then y</b> (declaration order): ' + s(vn(m[1])) + ' vs ' + s(vn(m[3])) + ' gives ' + (c < 0 ? 'less' : c > 0 ? 'greater' : 'equal') + '. Result <b>' + res + '</b>.');
          } else if ((m = x.match(/^(a|b)\s*<=>\s*(a|b)$/))) {
            var c2 = cmp(vn(m[1]), vn(m[2]));
            push(x, m[1] + '.operator<=>(' + m[2] + ')', 'strong_ordering::' + (c2 < 0 ? 'less' : c2 > 0 ? 'greater' : 'equal'), 8, '<code>' + esc(x) + '</code> calls the spaceship directly. For int members the result type is <code>std::strong_ordering</code>.');
          } else if ((m = x.match(/^(a|b)\s*\[\s*([01])\s*\]$/))) {
            var val = vn(m[1])[+m[2]];
            push(x, m[1] + '.operator[](' + m[2] + ')', 'int& → ' + val, 5, '<code>' + esc(x) + '</code> → member <code>operator[]</code> (it <b>must</b> be a member). It returns <code>int&amp;</code>, so <code>' + m[1] + '[' + m[2] + '] = 7</code> would write into the vector.');
          } else if ((m = x.match(/^if\s*\(\s*(!?)\s*(a|b)\s*\)$/))) {
            var v4 = vn(m[2]), bv = v4[0] !== 0 || v4[1] !== 0; if (m[1]) bv = !bv;
            push(x, (m[1] ? '!' : '') + m[2] + '.operator bool()', String(bv), 6, '<code>' + esc(x) + '</code>: an <code>if</code> condition is a <b>contextual conversion to bool</b>, which is allowed to use an <code>explicit operator bool</code>. But <code>int n = ' + m[2] + ';</code> or <code>' + m[2] + ' + 1</code> will <b>not</b> compile — that is what <code>explicit</code> buys you.');
          } else if ((m = x.match(/^(?:std::)?cout\s*<<\s*(a|b)$/))) {
            outp.push(s(vn(m[1])));
            push(x, 'operator<<(std::cout, ' + m[1] + ')', 'ostream& (prints ' + s(vn(m[1])) + ')', 13, '<code>' + esc(x) + '</code>: the left operand is <code>std::ostream</code>, a class we cannot add members to. So <code>operator&lt;&lt;</code> is a <b>free function</b> returning the stream by reference to allow chaining <code>cout &lt;&lt; a &lt;&lt; b</code>.');
          } else throw new Error('Did not understand "' + x + '". Try: a + b; 2 * a; a * 3; -a; a += b; a == b; a != b; a < b; a <=> b; a[0]; if (a); cout << a; a = b; a = (1,2)');
        });
        frames.push({ narr: 'Summary: <b>members</b> for operators that modify or must be members (<code>+=</code>, <code>[]</code>, unary, conversion); <b>free functions</b> for symmetric ones and streams; <b>defaulted</b> <code>==</code> and <code>&lt;=&gt;</code> for comparisons, with C++20 rewriting the rest.', parts: [{ type: 'table', label: 'All calls', columns: ['expression', 'becomes', 'result'], rows: rows.map(function (r) { return r.slice(); }) }, out(outp.join('\n'))] });
        return frames;
      }
    },
    examples: [
      {
        title: 'Why 2 * v fails with a member operator',
        html: `<p>A member <code>Vec2 operator*(int k) const</code> handles <code>v * 2</code> (<code>v.operator*(2)</code>). For <code>2 * v</code> the compiler would need <code>2.operator*(v)</code> — ints have no members. Only a free function <code>operator*(int, Vec2)</code> can match. The same reasoning explains <code>operator&lt;&lt;</code>: <code>cout &lt;&lt; v</code> would need a member of <code>std::ostream</code>.</p>
          ${H.table(['Expression', 'Member only', 'Free functions'], [['<code>v * 2</code>', H.c('g', 'OK'), H.c('g', 'OK')], ['<code>2 * v</code>', H.c('r', 'error'), H.c('g', 'OK')]])}`,
        code: R`
          struct V { int x; V operator*(int k) const { return {x * k}; } };
          V operator*(int k, const V& v) { return v * k; }      // add this free overload for 2 * v
          int main() { V v{3}; V a = v * 2; V b = 2 * v; std::cout << a.x << b.x << '\n'; }   // 66
        `
      },
      {
        title: 'Predict the output: prefix vs postfix',
        html: `<p><code>c++</code> calls <code>operator++(int)</code>, which copies the old value, increments, and returns the <b>copy</b>. <code>++c</code> increments and returns a reference — no copy. For iterators of complex containers that copy is real work, which is why idiomatic C++ loops write <code>++it</code>.</p>
          ${H.table(['Line', 'printed', 'c afterwards'], [['<code>cout &lt;&lt; (c++).value()</code>', '0', '1'], ['<code>cout &lt;&lt; (++c).value()</code>', '2', '2']])}`,
        code: R`
          struct C {
              int n = 0;
              C& operator++() { ++n; return *this; }
              C operator++(int) { C old = *this; ++n; return old; }
              int value() const { return n; }
          };
          int main() { C c; std::cout << (c++).value() << ' ' << (++c).value() << '\n'; }   // 0 2
        `
      },
      {
        title: 'Spaceship with a custom order: case-insensitive names',
        html: `<p>When the default memberwise order is wrong, write <code>operator&lt;=&gt;</code> yourself and return the right category. Here two names that differ only by case are <b>equivalent</b> but not identical, so the honest category is <code>std::weak_ordering</code>. Remember to also define <code>operator==</code> consistently — a user-written <code>&lt;=&gt;</code> does not generate <code>==</code> (only a <i>defaulted</i> one does).</p>`,
        code: R`
          struct Name {
              std::string s;
              std::weak_ordering operator<=>(const Name& o) const {
                  for (std::size_t i = 0; i < s.size() && i < o.s.size(); ++i) {
                      int a = std::tolower(static_cast<unsigned char>(s[i]));
                      int b = std::tolower(static_cast<unsigned char>(o.s[i]));
                      if (a != b) return a < b ? std::weak_ordering::less : std::weak_ordering::greater;
                  }
                  return s.size() <=> o.s.size();             // strong_ordering converts to weak_ordering
              }
              bool operator==(const Name& o) const { return (*this <=> o) == 0; }
          };
          int main() { std::cout << (Name{"alice"} == Name{"ALICE"}) << (Name{"bob"} < Name{"Carl"}) << '\n'; }   // 11
        `
      },
      {
        title: 'Self-assignment, return types and the canonical forms',
        html: `${H.table(['Operator', 'Canonical signature', 'Returns'], [
            ['copy assignment', '<code>T&amp; operator=(const T&amp;)</code>', '<code>*this</code> by reference'],
            ['compound <code>+=</code>', '<code>T&amp; operator+=(const T&amp;)</code>', '<code>*this</code> by reference'],
            ['binary <code>+</code>', '<code>T operator+(T lhs, const T&amp; rhs)</code>', 'new value'],
            ['prefix <code>++</code>', '<code>T&amp; operator++()</code>', 'reference'],
            ['postfix <code>++</code>', '<code>T operator++(int)</code>', 'old value (copy)'],
            ['stream out', '<code>std::ostream&amp; operator&lt;&lt;(std::ostream&amp;, const T&amp;)</code>', 'the stream'],
            ['subscript', '<code>T&amp; operator[](size_t)</code> + const overload', 'reference'],
            ['comparison (C++20)', '<code>auto operator&lt;=&gt;(const T&amp;) const = default;</code>', 'ordering category']
          ])}<p>Returning <code>const T</code> by value (an old Scott Meyers tip to block <code>(a + b) = c</code>) is now discouraged because it disables move semantics on the result.</p>`
      }
    ],
    deepDive: `<p><b>Overload resolution and ADL.</b> For <code>a + b</code> the compiler collects member candidates (<code>a.operator+</code>), non-member candidates found by normal lookup <i>and</i> by argument-dependent lookup (namespaces of the argument types), plus built-in candidates, then picks the best match. ADL is why <code>operator&lt;&lt;</code> declared in your type's namespace is found from anywhere. <b>Hidden friends</b> (a <code>friend</code> function <i>defined</i> inside the class) are visible <i>only</i> via ADL: this keeps overload sets small, speeds up compilation, and prevents surprising implicit conversions — the recommended modern style for symmetric operators.</p>
      <p><b>C++20 rewritten candidates.</b> For <code>a == b</code> the compiler also considers <code>b == a</code> (reversed); for <code>a != b</code>, <code>!(a == b)</code> and <code>!(b == a)</code>; for <code>a &lt; b</code>, <code>(a &lt;=&gt; b) &lt; 0</code> and <code>0 &lt; (b &lt;=&gt; a)</code>. A defaulted <code>&lt;=&gt;</code> also implicitly declares a defaulted <code>==</code>. Why is <code>==</code> separate from <code>&lt;=&gt;</code>? Performance: equality of strings can short-circuit on different lengths, while ordering cannot.</p>
      <p><b>Comparison categories.</b> <code>std::strong_ordering</code> (equal means substitutable, e.g. ints), <code>std::weak_ordering</code> (equivalent but distinguishable, e.g. case-insensitive strings), <code>std::partial_ordering</code> (some values incomparable — <code>double</code> with NaN). Defaulted <code>&lt;=&gt;</code> picks the weakest category among members. Ordered containers and <code>std::sort</code> require a <b>strict weak ordering</b>; violating it (e.g. using <code>&lt;=</code> as a comparator) is undefined behaviour and can crash <code>std::sort</code>.</p>
      <p><b>Conversion operators and the "safe bool" history.</b> Before C++11, <code>operator bool()</code> made <code>obj + 1</code> and <code>obj1 == obj2</code> compile by accident, so libraries used the convoluted "safe bool idiom". C++11 <code>explicit operator bool</code> allows only contextual conversions (<code>if</code>, <code>while</code>, <code>!</code>, <code>&amp;&amp;</code>, <code>?:</code>). Single-argument constructors should usually be <code>explicit</code> too, for the same reason.</p>
      <p><b>Other notable overloads.</b> <code>operator-&gt;</code> chains until it reaches a raw pointer (how smart pointers and proxies work). <code>operator()</code> powers functors and lambdas (a lambda is a compiler-generated class with <code>operator()</code>); C++23 allows <code>static operator()</code> and multidimensional <code>operator[](i, j)</code>. <code>operator new/delete</code> can be overloaded per class for pooling. User-defined literals (<code>operator""_km</code>) let you write <code>5_km</code>. Overloading <code>&amp;</code> (address-of) breaks generic code — use <code>std::addressof</code> in templates.</p>`,
    aiEra: `<p><b>What AI changes:</b> boilerplate like six comparison operators, stream operators and arithmetic sets is exactly what assistants produce instantly — and exactly what C++20's <code>= default</code> comparisons made unnecessary. Generated code from older training data often still hand-writes all six, inconsistently.</p>
      <p><b>Use AI as a partner:</b> <code>Modernize this class to C++20: replace hand-written comparisons with defaulted == and <=>, make binary operators hidden friends, and keep behaviour identical. Then write property tests: a < b implies !(b < a); a == b implies !(a < b) && !(b < a).</code></p>
      <p><b>Where AI goes wrong:</b> postfix <code>++</code> returning a reference to a local (dangling), <code>operator=</code> returning by value, comparators that are not strict weak orderings, implicit <code>operator bool</code> without <code>explicit</code>, and overloads with surprising semantics (<code>+</code> mutating the left operand).</p>
      <p><b>What you must still own:</b> choosing member vs free, the canonical signatures and return types, the C++20 rewrite rules, and the principle of least surprise. Interviewers ask you to implement <code>Fraction</code>, <code>Complex</code> or <code>BigInt</code> exactly to see these decisions.</p>`,
    problems: [
      {
        title: 'Fraction Class with Arithmetic, Equality, Ordering and Printing',
        level: 'Medium', tags: ['operator overloading', 'spaceship', 'gcd', 'value type'], companies: ['Google', 'Jane Street', 'Microsoft'],
        statement: `<p>Implement <code>Fraction</code> (numerator/denominator, <code>long long</code>) that is always stored in <b>lowest terms</b> with a <b>positive denominator</b>. Support <code>+ - * /</code> (and their compound forms), <code>==</code>, all orderings, unary <code>-</code>, and <code>std::cout &lt;&lt; f</code> printing <code>"n/d"</code> (or just <code>"n"</code> when d = 1). Mixed expressions like <code>f + 1</code> and <code>1 + f</code> must work.</p>`,
        constraints: `<p>|numerator|, |denominator| ≤ 10<sup>9</sup> for inputs; denominator ≠ 0 (throw <code>std::invalid_argument</code>). Intermediate products fit in <code>long long</code> for the tests.</p>`,
        example: `<p><code>Fraction(1,2) + Fraction(1,3)</code> = ${H.c('g', '5/6')}. <code>Fraction(2,-4)</code> is stored as ${H.c('b', '-1/2')}. <code>Fraction(1,2) == Fraction(2,4)</code> → ${H.c('g', 'true')} because both normalize to 1/2. <code>1 + Fraction(1,2)</code> → ${H.c('g', '3/2')}.</p>`,
        brute: {
          why: `<p>The naive version stores fractions un-normalized and compares fields directly, so <code>1/2 == 2/4</code> is false; it compares with floating point (<code>double(n)/d</code>) for ordering, which is inexact for large values; and it writes members only, so <code>1 + f</code> does not compile.</p>`,
          code: R`
            struct Fraction {
                long long n, d;
                Fraction operator+(const Fraction& o) const { return {n * o.d + o.n * d, d * o.d}; }   // never reduced
                bool operator==(const Fraction& o) const { return n == o.n && d == o.d; }             // 1/2 != 2/4 !
                bool operator<(const Fraction& o) const { return double(n) / d < double(o.n) / o.d; } // inexact
            };
          `
        },
        mcq: { q: 'How should <code>operator&lt;</code> compare a/b and c/d (b, d &gt; 0) exactly?', options: ['Compare a·d with c·b using integers', 'Compare a/b and c/d as doubles', 'Compare numerators, then denominators', 'Compare a + d with c + b'], answer: 0, explain: 'With positive denominators, a/b &lt; c/d ⇔ a·d &lt; c·b. Integer cross-multiplication is exact; doubles lose precision beyond 2^53 and make near-equal values compare wrongly.' },
        hints: [
          `<p>Hint 1: normalize in <b>one</b> private function called by the constructor: divide by <code>std::gcd</code>, and flip signs so the denominator is positive. Then equality can be the defaulted memberwise <code>==</code>.</p>`,
          `<p>Hint 2: implement <code>+=</code>, <code>-=</code>, <code>*=</code>, <code>/=</code> as members; implement <code>+ - * /</code> as <b>hidden friends</b> taking the left operand by value. A non-explicit constructor <code>Fraction(long long n, long long d = 1)</code> lets <code>1 + f</code> convert the 1.</p>`,
          `<p>Hint 3: ordering: write <code>std::strong_ordering operator&lt;=&gt;</code> using cross-multiplication <code>n * o.d &lt;=&gt; o.n * d</code>. Printing: <code>n</code> alone when <code>d == 1</code>.</p>`
        ],
        tests: { sig: 'long long long long char -> string', fn: 'fr',
          harness: { cpp: "string fr(long long a, long long b, long long c, long long d, char op) { try { Fraction x(a, b), y(c, d); ostringstream os;\n  switch (op) { case '+': os << x + y; break; case '-': os << x - y; break; case '*': os << x * y; break; case '/': os << x / y; break; case 'n': os << -x; break; case 'i': os << (int(c) + x); break; case 'j': os << (x + int(c)); break;\n    case '<': os << (x < y) << (x <= y) << (x > y) << (x >= y) << (x == y) << (x != y); break; case 'a': { Fraction z = x; z += y; z -= Fraction(1); z *= Fraction(2); z /= Fraction(3); os << z; break; } default: os << x; }\n  return os.str(); } catch (const invalid_argument&) { return \"invalid\"; } }" }, cases: [
          [[1,2,1,3,"+"], "5/6"],
          [[2,-4,1,1,"p"], "-1/2"],
          [[1,2,2,4,"<"], "010110"],
          [[1,2,1,3,"-"], "1/6"],
          [[1,2,1,3,"*"], "1/6"],
          [[1,2,1,3,"/"], "3/2"],
          [[1,2,1,1,"i"], "3/2"],
          [[1,2,1,1,"j"], "3/2"],
          [[3,4,0,1,"n"], "-3/4"],
          [[0,3,1,1,"n"], "0"],
          [[1,0,1,1,"+"], "invalid"],
          [[1,1,1,0,"+"], "invalid"],
          [[1,2,0,1,"/"], "invalid"],
          [[-1,3,-2,5,"<"], "001101"],
          [[2,3,2,3,"<"], "010110"],
          [[1,3,1,2,"<"], "110001"],
          [[1000000000,1,1000000000,1,"*"], "1000000000000000000"],
          [[999999999,1000000000,1,1000000000,"+"], "1"],
          [[5,7,-5,7,"+"], "0"],
          [[1,2,3,4,"a"], "1/6"],
          [[-6,8,6,8,"-"], "-3/2"],
          [[7,3,0,1,"i"], "7/3"],
          [[7,3,-2,1,"j"], "1/3"],
          [[4,6,0,1,"p"], "2/3"]
        ] },
        solution: {
          approach: `<p>Class invariant: gcd(|n|, d) = 1 and d &gt; 0, established in the constructor and preserved because every operation constructs its result through the constructor. Thanks to the invariant, equal fractions have identical fields, so <code>operator==</code> can be defaulted. Ordering uses exact integer cross-multiplication. Binary operators are hidden friends so implicit conversion from integers works on both sides.</p>`,
          code: R`
            #include <compare>
            #include <iostream>
            #include <numeric>
            #include <stdexcept>

            class Fraction {
                long long n_, d_;
                void normalize() {
                    if (d_ == 0) throw std::invalid_argument("zero denominator");
                    if (d_ < 0) { n_ = -n_; d_ = -d_; }              // keep the sign in the numerator
                    long long g = std::gcd(n_, d_);                  // gcd works on absolute values
                    if (g > 1) { n_ /= g; d_ /= g; }
                }
            public:
                Fraction(long long n = 0, long long d = 1) : n_(n), d_(d) { normalize(); }   // implicit from int: on purpose
                long long num() const { return n_; }
                long long den() const { return d_; }

                Fraction& operator+=(const Fraction& o) { *this = Fraction(n_ * o.d_ + o.n_ * d_, d_ * o.d_); return *this; }
                Fraction& operator-=(const Fraction& o) { *this = Fraction(n_ * o.d_ - o.n_ * d_, d_ * o.d_); return *this; }
                Fraction& operator*=(const Fraction& o) { *this = Fraction(n_ * o.n_, d_ * o.d_); return *this; }
                Fraction& operator/=(const Fraction& o) { *this = Fraction(n_ * o.d_, d_ * o.n_); return *this; }
                Fraction operator-() const { return Fraction(-n_, d_); }

                // Hidden friends: symmetric, found by ADL, allow 1 + f and f + 1.
                friend Fraction operator+(Fraction a, const Fraction& b) { return a += b; }
                friend Fraction operator-(Fraction a, const Fraction& b) { return a -= b; }
                friend Fraction operator*(Fraction a, const Fraction& b) { return a *= b; }
                friend Fraction operator/(Fraction a, const Fraction& b) { return a /= b; }

                bool operator==(const Fraction&) const = default;                    // invariant makes this exact
                std::strong_ordering operator<=>(const Fraction& o) const { return n_ * o.d_ <=> o.n_ * d_; }

                friend std::ostream& operator<<(std::ostream& os, const Fraction& f) {
                    os << f.n_;
                    if (f.d_ != 1) os << '/' << f.d_;
                    return os;
                }
            };

            int main() {
                Fraction a(1, 2), b(1, 3);
                std::cout << a + b << ' ' << a - b << ' ' << a * b << ' ' << a / b << '\n';   // 5/6 1/6 1/6 3/2
                std::cout << Fraction(2, -4) << ' ' << (1 + a) << ' ' << (a == Fraction(2, 4)) << ' ' << (b < a) << '\n';   // -1/2 3/2 1 1
            }

          `,
          dry: { head: ['Expression', 'Raw result', 'gcd', 'Stored', 'Printed'], rows: [
            ['<code>a + b</code> (1/2 + 1/3)', '(1·3 + 1·2)/(2·3) = 5/6', '1', '5/6', '5/6'],
            ['<code>a / b</code>', '(1·3)/(2·1) = 3/2', '1', '3/2', '3/2'],
            ['<code>Fraction(2, -4)</code>', 'flip signs → -2/4', '2', '-1/2', '-1/2'],
            ['<code>1 + a</code>', 'Fraction(1) + 1/2 = 3/2', '1', '3/2', '3/2'],
            ['<code>b &lt; a</code>', '1·2 &lt;=&gt; 1·3 → less', '—', '—', H.c('g', 'true')]
          ] },
          complexity: `<p>Each operation is O(log min(n, d)) for the gcd. Comparison is O(1). Overflow: products of two 10<sup>9</sup> values fit in 64 bits; for arbitrary inputs reduce before multiplying (cross-cancel gcds) or use <code>__int128</code>.</p>`,
          followUps: ['Reduce overflow risk by cross-cancelling gcds before multiplying.', 'Should the int constructor be explicit? What breaks if it is?', 'Add <code>operator&gt;&gt;</code> to parse "3/4" from a stream.']
        }
      }
    ]
  });

  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Count Every Special Member Call',
    level: 'Easy', tags: ['special members', 'static members', 'instrumentation'], companies: ['Bloomberg', 'Microsoft'],
    statement: `<p>Write a class <code>Tracker</code> that counts, in static counters, how many times each special member ran: default ctor, copy ctor, move ctor, copy assign, move assign, destructor. Then run the scenario below and print the counts. Use it to prove how many copies a piece of code really makes.</p>`,
    constraints: `<p>Counters must be shared by all Tracker objects. Scenario: <code>std::vector&lt;Tracker&gt; v; v.reserve(4); Tracker t; v.push_back(t); v.push_back(Tracker{}); v.emplace_back(); Tracker u = v[0]; u = std::move(v[1]);</code></p>`,
    example: `<p>Expected counts: ${H.c('g', 'default 3')} (t, Tracker{}, emplace_back), ${H.c('y', 'copy 2')} (push_back(t), u = v[0]), ${H.c('b', 'move 1')} (push_back(Tracker{})), copy-assign 0, ${H.c('b', 'move-assign 1')}; destructors after scope: 6 (one per object ever constructed).</p>`,
    brute: {
      why: `<p>Printing a line from every member and counting by eye works for 5 lines but not for a loop of 10<sup>5</sup> push_backs, and output interleaving makes it error-prone. A per-object counter would not work at all: the counts must be global.</p>`,
      code: R`
        #include <iostream>
        struct Tracker {
            Tracker() { std::cout << "default\n"; }
            Tracker(const Tracker&) { std::cout << "copy\n"; }
            Tracker(Tracker&&) noexcept { std::cout << "move\n"; }
            Tracker& operator=(const Tracker&) { std::cout << "copy-assign\n"; return *this; }
            Tracker& operator=(Tracker&&) noexcept { std::cout << "move-assign\n"; return *this; }
            ~Tracker() { std::cout << "dtor\n"; }
        };
      `
    },
    mcq: { q: 'Which keyword lets every Tracker object share one counter?', options: ['<code>static</code> data members (C++17: <code>static inline int</code>)', '<code>mutable</code>', '<code>const</code>', '<code>friend</code>'], answer: 0, explain: 'A static data member belongs to the class, not to an object, so all instances increment the same variable. <code>inline</code> lets you define it inside the class without a separate definition in a .cpp file.' },
    hints: [
      `<p>Hint 1: one <code>static inline</code> counter per special member, incremented in that member.</p>`,
      `<p>Hint 2: <code>v.reserve(4)</code> prevents reallocation, so the vector never moves existing elements in this scenario.</p>`,
      `<p>Hint 3: <code>push_back(t)</code> copies (t is an lvalue), <code>push_back(Tracker{})</code> moves the temporary, <code>emplace_back()</code> default-constructs in place, <code>Tracker u = v[0]</code> copies, <code>u = std::move(v[1])</code> move-assigns.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: "", stdout: "def=3 copy=2 move=1 cassign=0 massign=1 dtor=1\ndef=3 copy=2 move=1 cassign=0 massign=1 dtor=6" }
    ] },
    solution: {
      approach: `<p>Static counters + a small report function. Print the counters inside a nested scope's end to see destructors too.</p>`,
      code: R`
        #include <iostream>
        #include <utility>
        #include <vector>
        struct Tracker {
            static inline int def = 0, copy = 0, move = 0, cassign = 0, massign = 0, dtor = 0;
            Tracker() { ++def; }
            Tracker(const Tracker&) { ++copy; }
            Tracker(Tracker&&) noexcept { ++move; }
            Tracker& operator=(const Tracker&) { ++cassign; return *this; }
            Tracker& operator=(Tracker&&) noexcept { ++massign; return *this; }
            ~Tracker() { ++dtor; }
            static void report() {
                std::cout << "def=" << def << " copy=" << copy << " move=" << move
                          << " cassign=" << cassign << " massign=" << massign << " dtor=" << dtor << '\n';
            }
        };
        int main() {
            {
                std::vector<Tracker> v;
                v.reserve(4);
                Tracker t;                    // def 1
                v.push_back(t);               // copy 1
                v.push_back(Tracker{});       // def 2, move 1, dtor 1 (the temporary)
                v.emplace_back();             // def 3 (built in place)
                Tracker u = v[0];             // copy 2
                u = std::move(v[1]);          // massign 1
                Tracker::report();            // def=3 copy=2 move=1 cassign=0 massign=1 dtor=1
            }
            Tracker::report();                // def=3 copy=2 move=1 cassign=0 massign=1 dtor=6
        }
      `,
      dry: { head: ['Statement', 'def', 'copy', 'move', 'massign', 'dtor'], rows: [
        ['<code>Tracker t</code>', '1', '0', '0', '0', '0'],
        ['<code>push_back(t)</code>', '1', '1', '0', '0', '0'],
        ['<code>push_back(Tracker{})</code>', '2', '1', '1', '0', '1'],
        ['<code>emplace_back()</code>', '3', '1', '1', '0', '1'],
        ['<code>Tracker u = v[0]</code>', '3', '2', '1', '0', '1'],
        ['<code>u = std::move(v[1])</code>', '3', '2', '1', '1', '1'],
        ['closing <code>}</code> (t, u, 3 elements)', '3', '2', '1', '1', H.c('g', '6')]
      ] },
      complexity: `<p>O(1) per counted call. Sanity check that always works: objects born = def 3 + copy 2 + move 1 = <b>6</b>; objects dead = 1 temporary + t + u + 3 elements = <b>6</b>. Births and deaths must always balance — if your counts do not, you have a leak or a double destruction.</p>`,
      followUps: ['Remove <code>reserve(4)</code>: how do the counts change (hint: growth 1 → 2 → 4 moves elements)?', 'Drop <code>noexcept</code> from the move constructor and re-run without reserve.', 'Make the counters thread-safe with <code>std::atomic&lt;int&gt;</code>.']
    }
  });

  practice.push({
    title: 'Rule of Zero Refactor: Delete 40 Lines, Fix 3 Bugs',
    level: 'Easy', tags: ['rule of zero', 'std::string', 'refactoring'], companies: ['Google', 'Meta'],
    statement: `<p><code>Contact</code> stores <code>char* name</code> and <code>char* email</code> with a hand-written destructor and copy constructor, but no copy assignment (and no moves). Refactor it so it needs <b>no user-declared special members</b> while keeping the same public behaviour, and explain which bugs disappear.</p>`,
    constraints: `<p>Public API: <code>Contact(const char* name, const char* email)</code>, <code>name()</code>, <code>email()</code> returning <code>const char*</code> or <code>std::string_view</code>.</p>`,
    example: `<p><code>Contact a("Asha", "a@x.io"); Contact b("Ben", "b@x.io"); b = a;</code> → original: ${H.c('r', 'shallow assignment, leak of Ben\'s strings, double free at exit')}. Refactored: ${H.c('g', 'deep copy, no leak, no double free')}, and <code>std::move(a)</code> is cheap.</p>`,
    brute: {
      why: `<p>The existing class violates the Rule of Three: assignment is compiler-generated and shallow (leaks the old buffers, then double-frees the shared ones). It also has no moves (destructor suppresses them), so every move is a deep copy. Patching it means writing 3 more functions carefully.</p>`,
      code: R`
        #include <cstring>
        class Contact {
            char* name_;
            char* email_;
            static char* dup(const char* s) { char* p = new char[std::strlen(s) + 1]; std::strcpy(p, s); return p; }
        public:
            Contact(const char* n, const char* e) : name_(dup(n)), email_(dup(e)) {}
            Contact(const Contact& o) : name_(dup(o.name_)), email_(dup(o.email_)) {}
            ~Contact() { delete[] name_; delete[] email_; }
            // operator= missing -> shallow copy -> leak + double free
            const char* name() const { return name_; }
            const char* email() const { return email_; }
        };
      `
    },
    mcq: { q: 'After switching both members to <code>std::string</code>, which special members should you write?', options: ['None — the compiler-generated ones are correct', 'Only the destructor', 'Copy constructor and copy assignment', 'All five'], answer: 0, explain: 'std::string manages its own memory and has correct copy/move/destroy semantics, so memberwise generated members are correct. Writing any of them would also suppress the implicit moves.' },
    hints: [
      `<p>Hint 1: ask "who owns these chars?" — a type that already owns chars correctly exists in the standard library.</p>`,
      `<p>Hint 2: store <code>std::string</code>; take constructor arguments as <code>std::string</code> by value and <code>std::move</code> them into members.</p>`,
      `<p>Hint 3: return <code>const std::string&amp;</code> or <code>std::string_view</code> from the getters; delete the destructor and copy constructor entirely.</p>`
    ],
    tests: { sig: 'string string string string -> string', fn: 'ct',
      harness: { cpp: "string ct(string n1, string e1, string n2, string e2) { static_assert(std::is_copy_assignable_v<Contact> && std::is_nothrow_move_constructible_v<Contact>); Contact a(n1, e1), b(n2, e2); b = a; Contact c = std::move(a); return string(b.name()) + \"|\" + string(b.email()) + \"|\" + string(c.name()) + \"|\" + string(c.email()); }" }, cases: [
      [["Asha","a@x.io","Ben","b@x.io"], "Asha|a@x.io|Asha|a@x.io"],
      [["","","x","y"], "|||"],
      [["x","y","",""], "x|y|x|y"],
      [["Zoë","z@é.org","ß","q"], "Zoë|z@é.org|Zoë|z@é.org"],
      [["same","same","same","same"], "same|same|same|same"],
      [["A","B","C","D"], "A|B|A|B"],
      [[{"$rep":"n","n":1000000},{"$rep":"e","n":1000000},"x","y"], {"$concat":[{"$rep":"n","n":1000000},"|",{"$rep":"e","n":1000000},"|",{"$rep":"n","n":1000000},"|",{"$rep":"e","n":1000000}]}]
    ] },
    solution: {
      approach: `<p>Replace raw owning pointers with <code>std::string</code>. The compiler now generates a correct destructor, deep copy constructor, deep copy assignment, and cheap noexcept moves. Three bugs vanish: the leak in assignment, the double free, and copies-instead-of-moves.</p>`,
      code: R`
        #include <iostream>
        #include <string>
        #include <string_view>
        #include <utility>
        class Contact {
            std::string name_;
            std::string email_;
        public:
            Contact(std::string n, std::string e) : name_(std::move(n)), email_(std::move(e)) {}
            std::string_view name() const { return name_; }
            std::string_view email() const { return email_; }
            // No destructor, no copy/move members: Rule of Zero.
        };
        static_assert(std::is_nothrow_move_constructible_v<Contact>);

        int main() {
            Contact a("Asha", "a@x.io"), b("Ben", "b@x.io");
            b = a;                                       // deep copy, old strings released correctly
            Contact c = std::move(a);                    // cheap move
            std::cout << b.name() << ' ' << c.email() << '\n';   // Asha a@x.io
        }
      `,
      dry: { head: ['Operation', 'Raw char* version', 'std::string version'], rows: [
        ['<code>b = a</code>', H.c('r', 'shallow: leaks Ben, shares Asha'), H.c('g', 'deep copy')],
        ['<code>Contact c = std::move(a)</code>', H.c('y', 'deep copy (no move ctor)'), H.c('g', 'O(1) move')],
        ['end of main', H.c('r', 'double free'), H.c('g', 'clean')]
      ] },
      complexity: `<p>Copy O(len), move O(1). Code size: 4 special members → 0. Short strings (≤ 15 chars in libstdc++) do not even allocate thanks to SSO.</p>`,
      followUps: ['When is a raw pointer member still appropriate? (non-owning observers)', 'How would you keep the <code>const char*</code> getters for a C API?', 'Add a <code>std::vector&lt;std::string&gt; phones_</code> — what changes? (nothing)']
    }
  });

  practice.push({
    title: 'Printable, Comparable Point',
    level: 'Easy', tags: ['operator<<', 'operator==', 'spaceship'], companies: ['Amazon', 'Infosys'],
    statement: `<p>Implement <code>struct Point { int x, y; }</code> so that <code>std::cout &lt;&lt; p</code> prints <code>(x, y)</code>, points compare equal when both coordinates match, and a <code>std::set&lt;Point&gt;</code> works (ordered by x, then y).</p>`,
    constraints: `<p>Use C++20 features where they remove boilerplate. Up to 10<sup>5</sup> points in the set.</p>`,
    example: `<p>Insert (2,1), (1,5), (1,2), (2,1) into a set → printed in order ${H.c('g', '(1, 2) (1, 5) (2, 1)')}; the duplicate (2,1) is ${H.c('r', 'rejected')} because it is equivalent to an existing element.</p>`,
    brute: {
      why: `<p>Pre-C++20 style: six comparison operators written by hand, easy to make inconsistent (e.g. <code>&lt;</code> compares only x, so (1,2) and (1,5) look equivalent and the set drops one). Printing via a member <code>print()</code> does not compose with streams.</p>`,
      code: R`
        #include <iostream>
        struct Point {
            int x, y;
            bool operator==(const Point& o) const { return x == o.x && y == o.y; }
            bool operator!=(const Point& o) const { return !(*this == o); }
            bool operator<(const Point& o) const { return x < o.x; }          // BUG: ignores y
            bool operator>(const Point& o) const { return o < *this; }
            bool operator<=(const Point& o) const { return !(o < *this); }
            bool operator>=(const Point& o) const { return !(*this < o); }
            void print() const { std::cout << '(' << x << ", " << y << ')'; }
        };
      `
    },
    mcq: { q: 'What does <code>auto operator&lt;=&gt;(const Point&amp;) const = default;</code> compare?', options: ['x first, then y (members in declaration order)', 'y first, then x', 'The sum x + y', 'The addresses of the objects'], answer: 0, explain: 'A defaulted three-way comparison compares base classes then members lexicographically in declaration order, stopping at the first difference.' },
    hints: [
      `<p>Hint 1: <code>bool operator==(const Point&amp;) const = default;</code> gives <code>==</code> and <code>!=</code>.</p>`,
      `<p>Hint 2: <code>auto operator&lt;=&gt;(const Point&amp;) const = default;</code> gives <code>&lt;</code>, <code>&lt;=</code>, <code>&gt;</code>, <code>&gt;=</code> — exactly what <code>std::set</code> needs (it uses <code>std::less</code>, i.e. <code>&lt;</code>).</p>`,
      `<p>Hint 3: <code>operator&lt;&lt;</code> must be a free function (or hidden friend) taking <code>std::ostream&amp;</code> and returning it.</p>`
    ],
    tests: { sig: 'int[][] -> string', fn: 'pt',
      harness: { cpp: "string pt(vector<vector<int>> pts) { set<Point> s; for (auto& p : pts) s.insert(Point{p[0], p[1]}); ostringstream os; bool first = true; for (const Point& p : s) { if (!first) os << ' '; first = false; os << p; }\n  if (pts.size() >= 2) { Point p0{pts[0][0], pts[0][1]}, p1{pts[1][0], pts[1][1]}; os << \" | eq=\" << (p0 == p1) << \" ne=\" << (p0 != p1) << \" lt=\" << (p0 < p1) << \" gt=\" << (p0 > p1) << \" le=\" << (p0 <= p1); } return os.str(); }" }, cases: [
      [[[[2,1],[1,5],[1,2],[2,1]]], "(1, 2) (1, 5) (2, 1) | eq=0 ne=1 lt=0 gt=1 le=0"],
      [[[[0,0]]], "(0, 0)"],
      [[[]], ""],
      [[[[1,1],[1,1]]], "(1, 1) | eq=1 ne=0 lt=0 gt=0 le=1"],
      [[[[-1,5],[-1,-5],[-2,100]]], "(-2, 100) (-1, -5) (-1, 5) | eq=0 ne=1 lt=0 gt=1 le=0"],
      [[[[2147483647,-2147483648],[2147483647,2147483647]]], "(2147483647, -2147483648) (2147483647, 2147483647) | eq=0 ne=1 lt=1 gt=0 le=1"],
      [[[[3,3],[2,9],[3,1],[2,9],[3,3]]], "(2, 9) (3, 1) (3, 3) | eq=0 ne=1 lt=0 gt=1 le=0"],
      [[[[5,5],[5,4]]], "(5, 4) (5, 5) | eq=0 ne=1 lt=0 gt=1 le=0"]
    ] },
    solution: {
      approach: `<p>Two defaulted comparison declarations + one stream operator as a hidden friend. Lexicographic order is exactly "x, then y".</p>`,
      code: R`
        #include <compare>
        #include <iostream>
        #include <set>
        struct Point {
            int x = 0, y = 0;
            bool operator==(const Point&) const = default;
            auto operator<=>(const Point&) const = default;
            friend std::ostream& operator<<(std::ostream& os, const Point& p) {
                return os << '(' << p.x << ", " << p.y << ')';
            }
        };

        int main() {
            std::set<Point> s{{2, 1}, {1, 5}, {1, 2}, {2, 1}};
            for (const Point& p : s) std::cout << p << ' ';        // (1, 2) (1, 5) (2, 1)
            std::cout << '\n' << (Point{1, 2} < Point{1, 5}) << '\n';   // 1
        }
      `,
      dry: { head: ['Insert', 'Compared with', 'Result', 'Set'], rows: [
        ['(2,1)', '—', 'inserted', '{(2,1)}'],
        ['(1,5)', '(2,1): x 1 &lt; 2', 'inserted before', '{(1,5),(2,1)}'],
        ['(1,2)', '(1,5): x equal, y 2 &lt; 5', 'inserted before', '{(1,2),(1,5),(2,1)}'],
        ['(2,1)', '(2,1): equal', H.c('r', 'rejected'), 'unchanged']
      ] },
      complexity: `<p>Each comparison O(1); set insert O(log n). The defaulted operators are <code>constexpr</code>-friendly and as fast as hand-written ones.</p>`,
      followUps: ['Make points hashable for <code>std::unordered_set</code>.', 'Order by distance from the origin instead — which ordering category is correct?', 'Why is <code>operator&lt;&lt;</code> not a member?']
    }
  });

  practice.push({
    title: 'Predict the Output: Virtual, Non-Virtual and Hidden Functions',
    level: 'Easy', tags: ['virtual', 'name hiding', 'static vs dynamic binding', 'predict output'], companies: ['Qualcomm', 'Cisco', 'Oracle'],
    statement: `<p>Predict every line printed by the program below, then explain each one in terms of static type, dynamic type and the vtable. <code>Base</code> has a virtual <code>who()</code>, a non-virtual <code>tag()</code>, and an overloaded virtual <code>f(int)</code>/<code>f(double)</code>; <code>Derived</code> overrides <code>who()</code>, redefines <code>tag()</code>, and overrides only <code>f(int)</code>.</p>`,
    constraints: `<p>Calls are made through <code>Derived d</code>, <code>Base&amp; r = d</code>, and <code>Base b = d</code>.</p>`,
    example: `<p><code>r.who()</code> → ${H.c('g', 'Derived')} (virtual, dynamic type). <code>r.tag()</code> → ${H.c('r', 'Base-tag')} (non-virtual, static type). <code>d.f(1.5)</code> → ${H.c('y', 'Derived::f(int) with 1')} — Derived's <code>f</code> <b>hides</b> all base overloads, so 1.5 converts to int!</p>`,
    brute: {
      why: `<p>The naive mental model "the object is a Derived, so Derived's version always runs" gets three of the lines wrong: non-virtual <code>tag()</code> through a Base reference, the sliced copy <code>b</code>, and the name-hiding surprise with <code>f(double)</code>.</p>`,
      code: R`
        #include <iostream>
        struct Base {
            virtual ~Base() = default;
            virtual const char* who() const { return "Base"; }
            const char* tag() const { return "Base-tag"; }
            virtual void f(int x) const { std::cout << "Base::f(int) " << x << '\n'; }
            virtual void f(double x) const { std::cout << "Base::f(double) " << x << '\n'; }
        };
        struct Derived : Base {
            const char* who() const override { return "Derived"; }
            const char* tag() const { return "Derived-tag"; }                 // hides, not overrides
            void f(int x) const override { std::cout << "Derived::f(int) " << x << '\n'; }   // hides f(double)!
        };
        // naive guess: every call prints the Derived version
      `
    },
    mcq: { q: 'Why does <code>d.f(1.5)</code> call <code>Derived::f(int)</code>?', options: ['Declaring f in Derived hides ALL base overloads named f, so only f(int) is visible and 1.5 converts to 1', 'Because f(double) is not virtual', 'Because the vtable has only one slot for f', 'It is undefined behaviour'], answer: 0, explain: 'Name lookup stops at the first scope that declares the name. Derived declares f, so Base::f(double) is never considered for <code>d.f(...)</code>. Fix: <code>using Base::f;</code> in Derived.' },
    hints: [
      `<p>Hint 1: for each call, write down the static type of the expression and whether the function is virtual.</p>`,
      `<p>Hint 2: <code>Base b = d;</code> slices — b is a genuine Base with Base's vptr.</p>`,
      `<p>Hint 3: name lookup happens before overload resolution and before virtual dispatch. A name declared in Derived hides every same-named function in Base.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: "", stdout: "Derived Derived Base\nDerived-tag Base-tag\nDerived::f(int) 1\nBase::f(double) 1.5\nDerived::f(int) 2" }
    ] },
    solution: {
      approach: `<p>Apply the three rules in order: (1) name lookup in the static type's scope, (2) overload resolution among what was found, (3) if the chosen function is virtual and the call is through a reference/pointer, dispatch on the dynamic type.</p>`,
      code: R`
        #include <iostream>
        struct Base {
            virtual ~Base() = default;
            virtual const char* who() const { return "Base"; }
            const char* tag() const { return "Base-tag"; }
            virtual void f(int x) const { std::cout << "Base::f(int) " << x << '\n'; }
            virtual void f(double x) const { std::cout << "Base::f(double) " << x << '\n'; }
        };
        struct Derived : Base {
            const char* who() const override { return "Derived"; }
            const char* tag() const { return "Derived-tag"; }
            void f(int x) const override { std::cout << "Derived::f(int) " << x << '\n'; }
        };
        int main() {
            Derived d;
            Base& r = d;
            Base b = d;                                        // sliced copy
            std::cout << d.who() << ' ' << r.who() << ' ' << b.who() << '\n';   // Derived Derived Base
            std::cout << d.tag() << ' ' << r.tag() << '\n';                       // Derived-tag Base-tag
            d.f(1.5);                                          // Derived::f(int) 1     (hiding!)
            r.f(1.5);                                          // Base::f(double) 1.5   (lookup in Base, not overridden)
            r.f(2);                                            // Derived::f(int) 2     (virtual dispatch)
        }
      `,
      dry: { head: ['Call', 'Static type', 'Lookup finds', 'Virtual?', 'Runs'], rows: [
        ['<code>r.who()</code>', 'Base&amp;', 'Base::who', 'yes', 'Derived::who'],
        ['<code>b.who()</code>', 'Base (object)', 'Base::who', 'yes, but b IS a Base', 'Base::who'],
        ['<code>r.tag()</code>', 'Base&amp;', 'Base::tag', 'no', 'Base::tag'],
        ['<code>d.f(1.5)</code>', 'Derived', 'Derived::f(int) only', 'yes', 'Derived::f(int) with 1'],
        ['<code>r.f(1.5)</code>', 'Base&amp;', 'f(int), f(double)', 'yes', 'Base::f(double)'],
        ['<code>r.f(2)</code>', 'Base&amp;', 'f(int), f(double)', 'yes', 'Derived::f(int)']
      ] },
      complexity: `<p>Not an algorithmic problem; the takeaway is the three-step rule. Add <code>using Base::f;</code> to Derived to make <code>d.f(1.5)</code> call <code>Base::f(double)</code>.</p>`,
      followUps: ['What warning flag reports hidden overloaded virtuals? (<code>-Woverloaded-virtual</code>)', 'Add <code>final</code> to <code>Derived::who</code>. What can the compiler do with <code>d.who()</code>?', 'Predict <code>static_cast&lt;Base&amp;&gt;(d).tag()</code>.']
    }
  });

  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'DynArray&lt;T&gt;: Rule of Five with Copy-and-Swap',
    level: 'Medium', tags: ['rule of five', 'copy-and-swap', 'templates', 'exception safety'], companies: ['Bloomberg', 'Citadel', 'Optiver'],
    statement: `<p>Implement a fixed-size generic array <code>DynArray&lt;T&gt;</code> that owns <code>new T[n]</code>. It must support deep copy, O(1) noexcept move, self-assignment, the strong exception guarantee for copy assignment, <code>operator[]</code> (const and non-const) and <code>size()</code>. Use a <code>swap</code> hidden friend and the copy-and-swap idiom.</p>`,
    constraints: `<p>T is default-constructible and copy-assignable; T's copy may throw. n ≤ 10<sup>7</sup>.</p>`,
    example: `<p><code>DynArray&lt;std::string&gt; a(2); a[0] = "x"; auto b = a; b[0] = "y";</code> → ${H.c('g', 'a[0] == "x"')}. <code>auto c = std::move(b);</code> → ${H.c('b', 'b.size() == 0, c[0] == "y"')}, no allocation.</p>`,
    brute: {
      why: `<p>Writing copy assignment as "delete old, allocate, copy" fails self-assignment and leaves a dangling pointer if T's copy throws halfway. Writing separate copy and move assignments doubles the code paths to test.</p>`,
      code: R`
        #include <algorithm>
        #include <cstddef>
        template <class T>
        class DynArray {
            T* p_; std::size_t n_;
        public:
            explicit DynArray(std::size_t n) : p_(new T[n]), n_(n) {}
            ~DynArray() { delete[] p_; }
            DynArray(const DynArray& o) : p_(new T[o.n_]), n_(o.n_) { std::copy(o.p_, o.p_ + n_, p_); }   // leaks p_ if copy throws!
            DynArray& operator=(const DynArray& o) {
                delete[] p_;                           // self-assignment destroys the source
                p_ = new T[o.n_]; n_ = o.n_;           // if this throws, p_ dangles
                std::copy(o.p_, o.p_ + n_, p_);
                return *this;
            }
        };
      `
    },
    mcq: { q: 'In <code>DynArray&amp; operator=(DynArray other)</code>, where does the copy (that might throw) happen?', options: ['While constructing the by-value parameter, before the function body runs', 'Inside swap()', 'In the destructor of other', 'It never copies'], answer: 0, explain: 'The argument is copied (lvalue) or moved (rvalue) into the parameter at the call site. If that throws, *this was never touched — strong guarantee for free. The body only swaps, which is noexcept.' },
    hints: [
      `<p>Hint 1: in the copy constructor, if <code>std::copy</code> throws, the destructor of the half-built object will NOT run. Hold the new block in a <code>std::unique_ptr&lt;T[]&gt;</code> until copying succeeds, then <code>release()</code> it.</p>`,
      `<p>Hint 2: move constructor = <code>std::exchange</code> both members; mark it noexcept.</p>`,
      `<p>Hint 3: one assignment operator taking <code>DynArray other</code> by value + <code>swap(*this, other)</code> covers copy-assign and move-assign.</p>`
    ],
    tests: { sig: 'string[] string int -> string[]', fn: 'dyn',
      harness: { cpp: "struct Flaky { int v = 0; static inline int budget = -1; Flaky() = default; Flaky(const Flaky& o) : v(o.v) { tick(); } Flaky& operator=(const Flaky& o) { tick(); v = o.v; return *this; } static void tick() { if (budget == 0) throw runtime_error(\"copy failed\"); if (budget > 0) --budget; } };\nvector<string> dyn(vector<string> vals, string repl, int budget) {\n  if (budget >= 0) { size_t n = vals.size(); DynArray<Flaky> a(n); for (size_t i = 0; i < n; ++i) a[i].v = (int)i + 1; DynArray<Flaky> b(2); b[0].v = 77; b[1].v = 88; Flaky::budget = budget; string status = \"ok\";\n    try { b = a; } catch (const runtime_error&) { status = \"threw\"; } Flaky::budget = -1; vector<string> r = {status, to_string(b.size())}; for (size_t i = 0; i < b.size(); ++i) r.push_back(to_string(b[i].v)); return r; }\n  size_t n = vals.size(); DynArray<string> a(n); for (size_t i = 0; i < n; ++i) a[i] = vals[i]; DynArray<string> b = a; if (n) b[0] = repl; DynArray<string> c = std::move(b); DynArray<string>& ref = a; a = ref;\n  vector<string> r; for (size_t i = 0; i < n; ++i) r.push_back(a[i]); r.push_back(\"|\"); r.push_back(\"b:\" + to_string(b.size())); r.push_back(\"|\"); for (size_t i = 0; i < c.size(); ++i) r.push_back(c[i]); c = a; r.push_back(\"|\"); for (size_t i = 0; i < c.size(); ++i) r.push_back(c[i]); return r; }" }, cases: [
      [[["x","y"],"Q",-1], ["x","y","|","b:0","|","Q","y","|","x","y"]],
      [[["a"],"z",-1], ["a","|","b:0","|","z","|","a"]],
      [[[],"z",-1], ["|","b:0","|","|"]],
      [[["p","q","r"],"",-1], ["p","q","r","|","b:0","|","","q","r","|","p","q","r"]],
      [[["x","x"],"x",-1], ["x","x","|","b:0","|","x","x","|","x","x"]],
      [[["v","v","v"],"r",0], ["threw","2","77","88"]],
      [[["v","v","v"],"r",2], ["threw","2","77","88"]],
      [[["v","v","v"],"r",3], ["ok","3","1","2","3"]],
      [[["v","v","v"],"r",10], ["ok","3","1","2","3"]],
      [[["v"],"r",0], ["threw","2","77","88"]],
      [[["v"],"r",1], ["ok","1","1"]],
      [[["v","v","v","v","v"],"r",4], ["threw","2","77","88"]],
      [[["v","v","v","v","v"],"r",5], ["ok","5","1","2","3","4","5"]],
      [[[],"r",0], ["ok","0"]],
      [[{"$rep":"abc","n":100000},"zzz",-1], {"$concat":[{"$rep":"abc","n":100000},["|","b:0","|","zzz"],{"$rep":"abc","n":99999},["|"],{"$rep":"abc","n":100000}]}]
    ] },
    solution: {
      approach: `<p>Copy constructor: allocate into a temporary unique_ptr (so an exception during element copy frees the block), then adopt it. Move constructor: steal with <code>std::exchange</code>. Unified assignment: by-value parameter + noexcept swap. Destructor: <code>delete[]</code>.</p>`,
      code: R`
        #include <algorithm>
        #include <cstddef>
        #include <iostream>
        #include <memory>
        #include <string>
        #include <utility>

        template <class T>
        class DynArray {
            T* p_ = nullptr;
            std::size_t n_ = 0;
        public:
            DynArray() = default;
            explicit DynArray(std::size_t n) : p_(new T[n]()), n_(n) {}
            ~DynArray() { delete[] p_; }

            DynArray(const DynArray& o) : n_(o.n_) {
                std::unique_ptr<T[]> tmp(new T[o.n_]);          // freed automatically if a copy throws
                std::copy(o.p_, o.p_ + o.n_, tmp.get());
                p_ = tmp.release();                              // commit
            }
            DynArray(DynArray&& o) noexcept : p_(std::exchange(o.p_, nullptr)), n_(std::exchange(o.n_, 0)) {}

            DynArray& operator=(DynArray other) noexcept {      // copy or move happens in the parameter
                swap(*this, other);
                return *this;
            }
            friend void swap(DynArray& a, DynArray& b) noexcept {
                std::swap(a.p_, b.p_);
                std::swap(a.n_, b.n_);
            }

            T& operator[](std::size_t i) { return p_[i]; }
            const T& operator[](std::size_t i) const { return p_[i]; }
            std::size_t size() const { return n_; }
        };

        int main() {
            DynArray<std::string> a(2);
            a[0] = "x";
            DynArray<std::string> b = a;                         // deep copy
            b[0] = "y";
            DynArray<std::string> c = std::move(b);              // steal
            a = a;                                               // self-assignment: safe
            c = a;                                               // copy-assign via copy-and-swap
            std::cout << a[0] << ' ' << b.size() << ' ' << c[0] << '\n';   // x 0 x
        }

      `,
      dry: { head: ['Statement', 'a', 'b', 'c', 'Note'], rows: [
        ['<code>a(2); a[0]="x"</code>', '[x, ""]', '—', '—', ''],
        ['<code>b = a</code>', '[x, ""]', '[x, ""] (new block)', '—', 'deep copy'],
        ['<code>b[0] = "y"</code>', '[x, ""]', '[y, ""]', '—', 'independent'],
        ['<code>c = std::move(b)</code>', '[x, ""]', 'empty', '[y, ""]', 'O(1)'],
        ['<code>c = a</code>', '[x, ""]', 'empty', '[x, ""]', 'param copy, swap, old c block freed']
      ] },
      complexity: `<p>Copy O(n), move O(1), assignment O(n) for copies / O(1) for moves. Extra memory during copy assignment: one temporary array (the price of the strong guarantee).</p>`,
      followUps: ['Why is <code>new T[n]()</code> (value-init) different from <code>new T[n]</code> for ints?', 'Make it a growable vector: what changes about exception safety when T\'s move may throw?', 'Add <code>begin()</code>/<code>end()</code> so range-for works.']
    }
  });

  practice.push({
    title: 'Vec3 Operator Suite for a Physics Engine',
    level: 'Medium', tags: ['operator overloading', 'hidden friends', 'const correctness'], companies: ['Nvidia', 'Unity', 'Epic Games'],
    statement: `<p>Implement <code>Vec3</code> (three doubles) with: <code>+ - </code> (binary), unary <code>-</code>, <code>* /</code> by a scalar on either side (<code>v * 2</code>, <code>2 * v</code>), compound <code>+= -= *= /=</code>, <code>==</code>, <code>operator[]</code> (0..2, const and non-const), <code>dot</code>, <code>cross</code>, <code>length</code>, and <code>&lt;&lt;</code>. Then simulate one Euler step: <code>pos += vel * dt; vel += gravity * dt;</code>.</p>`,
    constraints: `<p>No heap allocation; all operations O(1). Binary operators must not be members.</p>`,
    example: `<p>pos = (0, 10, 0), vel = (1, 0, 0), gravity = (0, -9.8, 0), dt = 0.5 → new pos = ${H.c('g', '(0.5, 10, 0)')}, new vel = ${H.c('b', '(1, -4.9, 0)')}. <code>cross((1,0,0), (0,1,0))</code> = ${H.c('g', '(0, 0, 1)')}.</p>`,
    brute: {
      why: `<p>Named functions only (<code>add(a, b)</code>, <code>scale(v, k)</code>) work but turn <code>pos + vel * dt</code> into <code>add(pos, scale(vel, dt))</code>: unreadable physics. Member binary operators break <code>2 * v</code>.</p>`,
      code: R`
        struct Vec3 { double x, y, z; };
        Vec3 add(Vec3 a, Vec3 b) { return {a.x + b.x, a.y + b.y, a.z + b.z}; }
        Vec3 scale(Vec3 v, double k) { return {v.x * k, v.y * k, v.z * k}; }
        // pos = add(pos, scale(vel, dt));   readable? not really.
      `
    },
    mcq: { q: 'Why define <code>operator+</code> in terms of <code>operator+=</code>?', options: ['One implementation of the arithmetic, so the two can never disagree', 'Because += is faster than +', 'Because + cannot access private members', 'The standard requires it'], answer: 0, explain: 'The canonical pattern keeps the logic in the compound operator (a member) and makes the binary operator a thin free function: <code>a += b; return a;</code>. Less code, no inconsistency.' },
    hints: [
      `<p>Hint 1: compound operators as members returning <code>Vec3&amp;</code>; binary operators as hidden friends taking the left side by value.</p>`,
      `<p>Hint 2: provide both <code>operator*(Vec3, double)</code> and <code>operator*(double, Vec3)</code>.</p>`,
      `<p>Hint 3: <code>==</code> on doubles: default it for exact equality, but provide an <code>approxEqual(a, b, eps)</code> for physics comparisons.</p>`
    ],
    tests: { sig: 'double[] double[] double int -> double[]', fn: 'v3', cmp: 'float',
      harness: { cpp: "vector<double> v3(vector<double> A, vector<double> B, double k, int op) { Vec3 a{A[0], A[1], A[2]}, b{B[0], B[1], B[2]}; auto L = [](const Vec3& v) { return vector<double>{v.x, v.y, v.z}; };\n  switch (op) { case 0: return L(a + b); case 1: return L(a - b); case 2: return L(-a); case 3: return L(a * k); case 4: return L(k * a); case 5: return L(a / k); case 6: return {dot(a, b)}; case 7: return L(cross(a, b)); case 8: return {length(a)}; case 9: return {a == b ? 1.0 : 0.0};\n    case 10: return {a[0], a[1], a[2]}; case 11: { Vec3 t = a; t += b; t -= Vec3{1, 1, 1}; t *= k; t /= 2; return L(t); }\n    case 12: { Vec3 pos = a, vel = b; const Vec3 g{0, -9.8, 0}; pos += vel * k; vel += g * k; vector<double> r = L(pos); auto q = L(vel); r.insert(r.end(), q.begin(), q.end()); return r; } default: { const Vec3 ca = a; return {ca[2], ca[0]}; } } }" }, cases: [
      [[[0,10,0],[1,0,0],0.5,12], [0.5,10,0,1,-4.9,0]],
      [[[1,0,0],[0,1,0],0,7], [0,0,1]],
      [[[3,4,0],[0,0,0],1,8], [5]],
      [[[1,2,3],[4,5,6],2,0], [5,7,9]],
      [[[1,2,3],[4,5,6],2,1], [-3,-3,-3]],
      [[[1,2,3],[0,0,0],0,2], [-1,-2,-3]],
      [[[1,-2,3],[0,0,0],2.5,3], [2.5,-5,7.5]],
      [[[1,-2,3],[0,0,0],2.5,4], [2.5,-5,7.5]],
      [[[1,2,3],[0,0,0],4,5], [0.25,0.5,0.75]],
      [[[1,2,3],[4,5,6],0,6], [32]],
      [[[1,0,0],[1,0,0],0,9], [1]],
      [[[1,0,0],[1,0,0.0001],0,9], [0]],
      [[[7,8,9],[0,0,0],0,10], [7,8,9]],
      [[[1,2,3],[3,2,1],4,11], [6,6,6]],
      [[[1,2,3],[0,0,0],0,13], [3,1]],
      [[[0,0,0],[0,0,0],0,8], [0]],
      [[[1,2,3],[2,4,6],0,7], [0,0,0]],
      [[[1000000,2000000,3000000],[1000000,1000000,1000000],1000,12], [1001000000,1002000000,1003000000,1000000,990200,1000000]]
    ] },
    solution: {
      approach: `<p>Canonical operator set: members for compound assignment, unary minus and subscript; hidden friends for symmetric binary operators and streaming; free functions for dot/cross/length. Everything is <code>constexpr</code>-friendly and allocation-free.</p>`,
      code: R`
        #include <cmath>
        #include <iostream>

        struct Vec3 {
            double x = 0, y = 0, z = 0;

            Vec3& operator+=(const Vec3& o) { x += o.x; y += o.y; z += o.z; return *this; }
            Vec3& operator-=(const Vec3& o) { x -= o.x; y -= o.y; z -= o.z; return *this; }
            Vec3& operator*=(double k) { x *= k; y *= k; z *= k; return *this; }
            Vec3& operator/=(double k) { x /= k; y /= k; z /= k; return *this; }
            Vec3 operator-() const { return {-x, -y, -z}; }

            double& operator[](int i) { return i == 0 ? x : i == 1 ? y : z; }
            double operator[](int i) const { return i == 0 ? x : i == 1 ? y : z; }

            bool operator==(const Vec3&) const = default;

            friend Vec3 operator+(Vec3 a, const Vec3& b) { return a += b; }
            friend Vec3 operator-(Vec3 a, const Vec3& b) { return a -= b; }
            friend Vec3 operator*(Vec3 v, double k) { return v *= k; }
            friend Vec3 operator*(double k, Vec3 v) { return v *= k; }
            friend Vec3 operator/(Vec3 v, double k) { return v /= k; }
            friend std::ostream& operator<<(std::ostream& os, const Vec3& v) {
                return os << '(' << v.x << ", " << v.y << ", " << v.z << ')';
            }
        };
        double dot(const Vec3& a, const Vec3& b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
        Vec3 cross(const Vec3& a, const Vec3& b) { return {a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x}; }
        double length(const Vec3& v) { return std::sqrt(dot(v, v)); }

        int main() {
            Vec3 pos{0, 10, 0}, vel{1, 0, 0};
            const Vec3 gravity{0, -9.8, 0};
            double dt = 0.5;
            pos += vel * dt;                 // (0.5, 10, 0)
            vel += gravity * dt;             // (1, -4.9, 0)
            std::cout << pos << ' ' << vel << ' ' << cross(Vec3{1, 0, 0}, Vec3{0, 1, 0}) << ' ' << length(Vec3{3, 4, 0}) << '\n';
        }

      `,
      dry: { head: ['Expression', 'Calls', 'Value'], rows: [
        ['<code>vel * dt</code>', 'operator*(Vec3, double)', '(0.5, 0, 0)'],
        ['<code>pos += …</code>', 'pos.operator+=(…)', '(0.5, 10, 0)'],
        ['<code>gravity * dt</code>', 'operator*(Vec3, double)', '(0, -4.9, 0)'],
        ['<code>vel += …</code>', 'vel.operator+=(…)', '(1, -4.9, 0)'],
        ['<code>cross(x̂, ŷ)</code>', 'cross', '(0, 0, 1)']
      ] },
      complexity: `<p>All O(1), no allocations. With <code>-O2</code> these compile to the same instructions as hand-written component math (and often vectorize).</p>`,
      followUps: ['Make every operator <code>constexpr</code> and compute a constant at compile time.', 'Why is defaulted <code>==</code> on doubles risky in physics code?', 'Template it as <code>Vec3&lt;T&gt;</code> constrained by a concept.']
    }
  });

  practice.push({
    title: 'Polymorphic Clone Without Repeating Yourself (CRTP Cloneable)',
    level: 'Medium', tags: ['clone', 'CRTP', 'virtual constructor', 'slicing'], companies: ['Bloomberg', 'Autodesk', 'Adobe'],
    statement: `<p>A document editor has <code>Shape</code> with 20 derived classes, each writing the same <code>clone()</code> boilerplate. Write a CRTP helper <code>Cloneable&lt;Derived, Base&gt;</code> that implements <code>clone()</code> once, returning <code>std::unique_ptr&lt;Base&gt;</code> holding a full copy of the dynamic type. Use it for <code>Circle</code> and <code>Text</code>, and implement "duplicate selection" that copies a <code>std::vector&lt;std::unique_ptr&lt;Shape&gt;&gt;</code>.</p>`,
    constraints: `<p>No slicing; each copy must have the correct dynamic type. Up to 10<sup>5</sup> shapes.</p>`,
    example: `<p>Selection [Circle r=2, Text "hi"] duplicated → new vector [${H.c('g', 'Circle r=2')}, ${H.c('g', 'Text "hi"')}] at different addresses; editing the copy's text does not change the original.</p>`,
    brute: {
      why: `<p>Hand-writing <code>clone()</code> in every class is repetitive, and forgetting it in one class silently inherits the parent's <code>clone()</code>, which then <b>slices</b> (creates a parent object). Copying via <code>std::make_unique&lt;Shape&gt;(*p)</code> does not compile for abstract Shape and slices for concrete ones.</p>`,
      code: R`
        #include <memory>
        struct Shape { virtual ~Shape() = default; virtual std::unique_ptr<Shape> clone() const = 0; };
        struct Circle : Shape {
            double r = 1;
            std::unique_ptr<Shape> clone() const override { return std::make_unique<Circle>(*this); }
        };
        struct BigCircle : Circle {
            double border = 2;
            // forgot clone() -> inherits Circle::clone -> returns a sliced Circle!
        };
      `
    },
    mcq: { q: 'In <code>struct Circle : Cloneable&lt;Circle, Shape&gt;</code>, how does the helper know to copy a Circle?', options: ['Derived is a template parameter, so it can static_cast *this to const Derived&amp; and call Derived\'s copy constructor', 'It uses RTTI at runtime', 'It calls Shape\'s copy constructor', 'It memcpys sizeof(Base) bytes'], answer: 0, explain: 'CRTP passes the derived type to the base at compile time. <code>std::make_unique&lt;Derived&gt;(static_cast&lt;const Derived&amp;&gt;(*this))</code> invokes the correct copy constructor.' },
    hints: [
      `<p>Hint 1: <code>template &lt;class Derived, class Base&gt; struct Cloneable : Base { ... };</code> — the helper sits <b>between</b> Shape and the concrete class.</p>`,
      `<p>Hint 2: implement <code>std::unique_ptr&lt;Shape&gt; clone() const override</code> in the helper using <code>static_cast&lt;const Derived&amp;&gt;(*this)</code>.</p>`,
      `<p>Hint 3: duplicating the selection: <code>reserve</code>, then <code>push_back(p-&gt;clone())</code> for each element.</p>`
    ],
    tests: { sig: 'string[] double[] string[] -> string[]', fn: 'cl',
      harness: { cpp: "vector<string> cl(vector<string> kinds, vector<double> nums, vector<string> strs) { vector<unique_ptr<Shape>> sel; for (size_t i = 0; i < kinds.size(); ++i) { if (kinds[i] == \"C\") sel.push_back(make_unique<Circle>(nums[i])); else sel.push_back(make_unique<Text>(strs[i])); }\n  auto copy = duplicate(sel); vector<string> r; for (size_t i = 0; i < sel.size(); ++i) if (sel[i].get() == copy[i].get()) return {\"same address\"};\n  for (size_t i = 0; i < copy.size(); ++i) if (kinds[i] == \"T\") static_cast<Text&>(*copy[i]).s = \"edited\"; else static_cast<Circle&>(*copy[i]).r += 1;\n  for (auto& p : sel) r.push_back(p->describe()); r.push_back(\"|\"); for (auto& p : copy) r.push_back(p->describe()); return r; }" }, cases: [
      [[["C","T"],[2,0],["","hi"]], ["Circle r=2.000000","Text \"hi\"","|","Circle r=3.000000","Text \"edited\""]],
      [[[],[],[]], ["|"]],
      [[["C"],[0.5],[""]], ["Circle r=0.500000","|","Circle r=1.500000"]],
      [[["T"],[0],[""]], ["Text \"\"","|","Text \"edited\""]],
      [[["T","T","C"],[0,0,1.25],["a","b b",""]], ["Text \"a\"","Text \"b b\"","Circle r=1.250000","|","Text \"edited\"","Text \"edited\"","Circle r=2.250000"]],
      [[["C","C"],[1000000,3],["",""]], ["Circle r=1000000.000000","Circle r=3.000000","|","Circle r=1000001.000000","Circle r=4.000000"]],
      [[{"$rep":"T","n":100000},{"$rep":0,"n":100000},{"$rep":"w","n":100000}], {"$concat":[{"$rep":"Text \"w\"","n":100000},["|"],{"$rep":"Text \"edited\"","n":100000}]}]
    ] },
    solution: {
      approach: `<p>Cloneable inherits from Base and implements the virtual <code>clone()</code> by copy-constructing <code>Derived</code>. Concrete classes inherit from <code>Cloneable&lt;Self, Shape&gt;</code> and get a correct clone automatically. Inheriting constructors (<code>using Base::Base</code>) keeps the helper transparent.</p>`,
      code: R`
        #include <iostream>
        #include <memory>
        #include <string>
        #include <vector>

        struct Shape {
            virtual ~Shape() = default;
            virtual std::unique_ptr<Shape> clone() const = 0;
            virtual std::string describe() const = 0;
        };

        template <class Derived, class Base>
        struct Cloneable : Base {
            using Base::Base;
            std::unique_ptr<Shape> clone() const override {
                return std::make_unique<Derived>(static_cast<const Derived&>(*this));   // Derived's copy ctor
            }
        };

        struct Circle final : Cloneable<Circle, Shape> {
            double r;
            explicit Circle(double radius) : r(radius) {}
            std::string describe() const override { return "Circle r=" + std::to_string(r); }
        };
        struct Text final : Cloneable<Text, Shape> {
            std::string s;
            explicit Text(std::string t) : s(std::move(t)) {}
            std::string describe() const override { return "Text \"" + s + "\""; }
        };

        std::vector<std::unique_ptr<Shape>> duplicate(const std::vector<std::unique_ptr<Shape>>& sel) {
            std::vector<std::unique_ptr<Shape>> out;
            out.reserve(sel.size());
            for (const auto& p : sel) out.push_back(p->clone());
            return out;
        }

        int main() {
            std::vector<std::unique_ptr<Shape>> sel;
            sel.push_back(std::make_unique<Circle>(2));
            sel.push_back(std::make_unique<Text>("hi"));
            auto copy = duplicate(sel);
            static_cast<Text&>(*copy[1]).s = "edited";
            for (const auto& p : sel) std::cout << p->describe() << '\n';    // Circle r=2.000000 / Text "hi"
            for (const auto& p : copy) std::cout << p->describe() << '\n';   // Circle r=2.000000 / Text "edited"
        }

      `,
      dry: { head: ['Element', 'clone() resolved to', 'Copy constructed', 'Dynamic type of copy'], rows: [
        ['sel[0]', 'Cloneable&lt;Circle, Shape&gt;::clone', 'Circle(const Circle&amp;)', 'Circle'],
        ['sel[1]', 'Cloneable&lt;Text, Shape&gt;::clone', 'Text(const Text&amp;)', 'Text']
      ] },
      complexity: `<p>O(N) clones, each one allocation + one copy. One virtual call per element.</p>`,
      followUps: ['Support multi-level hierarchies (BigCircle derived from Circle) with <code>Cloneable&lt;BigCircle, Circle&gt;</code>.', 'Rewrite using C++23 deducing this.', 'Compare with C++26 <code>std::polymorphic&lt;Shape&gt;</code>.']
    }
  });

  practice.push({
    title: 'Matrix with operator() Indexing and operator* Multiplication',
    level: 'Medium', tags: ['operator()', 'operator*', 'rule of zero', 'value semantics'], companies: ['Jane Street', 'MathWorks', 'Two Sigma'],
    statement: `<p>Implement a dense row-major <code>Matrix</code> of doubles with <code>m(i, j)</code> access (const and non-const), <code>==</code>, <code>*</code> (matrix product, throws <code>std::invalid_argument</code> on dimension mismatch), <code>*=</code>, and <code>&lt;&lt;</code>. Storage must be a single <code>std::vector&lt;double&gt;</code> so that the class follows the Rule of Zero.</p>`,
    constraints: `<p>Up to 500×500. Product must be O(n·m·p). Use cache-friendly loop order.</p>`,
    example: `<p>A = [[1,2],[3,4]], B = [[5,6],[7,8]] → A*B = ${H.c('g', '[[19,22],[43,50]]')}. A (2×2) * C (3×1) → ${H.c('r', 'throws invalid_argument')}.</p>`,
    brute: {
      why: `<p>A <code>double**</code> with rows allocated separately needs a hand-written Rule of Five (and gets shallow copies by default), scatters rows across the heap, and the naive i-j-k product loop walks B column-wise, missing the cache on every access.</p>`,
      code: R`
        struct BadMatrix {
            int r, c;
            double** d;                                                   // array of separately allocated rows
            BadMatrix(int r_, int c_) : r(r_), c(c_), d(new double*[r_]) { for (int i = 0; i < r; ++i) d[i] = new double[c]{}; }
            ~BadMatrix() { for (int i = 0; i < r; ++i) delete[] d[i]; delete[] d; }
            // no copy ctor/assign: shallow copies -> double free
        };
      `
    },
    mcq: { q: 'Why use <code>operator()(i, j)</code> instead of <code>operator[]</code> for 2-D access in C++20?', options: ['Before C++23, operator[] accepts exactly one argument; m[i][j] needs a proxy row object', 'operator() is faster', 'operator[] cannot return a reference', 'operator() is required by the standard for matrices'], answer: 0, explain: 'C++23 allows multidimensional <code>operator[](i, j)</code>, but in C++20 <code>operator[]</code> takes one parameter, so libraries (Eigen, Armadillo) use <code>m(i, j)</code>.' },
    hints: [
      `<p>Hint 1: store <code>rows_</code>, <code>cols_</code> and <code>std::vector&lt;double&gt; a_</code>; element (i, j) is <code>a_[i * cols_ + j]</code>.</p>`,
      `<p>Hint 2: for C = A·B use loop order i, k, j: <code>double aik = A(i,k); for j: C(i,j) += aik * B(k,j);</code> — B and C are then read row-wise.</p>`,
      `<p>Hint 3: implement <code>*</code> as a hidden friend and <code>*=</code> as <code>*this = *this * o;</code> (the product cannot be done in place).</p>`
    ],
    tests: { sig: 'double[][] double[][] -> string', fn: 'mm',
      harness: { cpp: "string mm(vector<vector<double>> A, vector<vector<double>> B) { Matrix a(A.size(), A[0].size()), b(B.size(), B[0].size()); for (size_t i = 0; i < A.size(); ++i) for (size_t j = 0; j < A[0].size(); ++j) a(i, j) = A[i][j]; for (size_t i = 0; i < B.size(); ++i) for (size_t j = 0; j < B[0].size(); ++j) b(i, j) = B[i][j];\n  try { Matrix p = a * b; if (!(p == a * b)) return \"not equal to itself\"; Matrix q = a; q *= b; if (!(q == p)) return \"*= differs\"; ostringstream os; os << p; return os.str(); } catch (const invalid_argument&) { return \"invalid\"; } }" }, cases: [
      [[[[1,2],[3,4]],[[5,6],[7,8]]], "[19,22]\n[43,50]\n"],
      [[[[1,2],[3,4]],[[1],[2],[3]]], "invalid"],
      [[[[2]],[[3.5]]], "[7]\n"],
      [[[[1,2,3]],[[1],[1],[1]]], "[6]\n"],
      [[[[1],[2],[3]],[[1,2]]], "[1,2]\n[2,4]\n[3,6]\n"],
      [[[[0.5,0.5],[0.25,0.75]],[[2,0],[0,2]]], "[1,1]\n[0.5,1.5]\n"],
      [[[[-1,1],[1,-1]],[[1,1],[1,1]]], "[0,0]\n[0,0]\n"],
      [[[[1,0],[0,1]],[[9,8],[7,6]]], "[9,8]\n[7,6]\n"],
      [[[[1,2],[3,4]],[[1,2]]], "invalid"],
      [[{"$rep":[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],"n":100},{"$rep":[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],"n":100}], "[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n[100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100,100]\n"]
    ] },
    solution: {
      approach: `<p>Rule of Zero value type over one contiguous vector. <code>operator()</code> provides 2-D indexing; defaulted <code>==</code> compares dimensions and data. Multiplication uses the i-k-j order for sequential memory access and checks dimensions.</p>`,
      code: R`
        #include <iostream>
        #include <stdexcept>
        #include <vector>

        class Matrix {
            std::size_t rows_ = 0, cols_ = 0;
            std::vector<double> a_;
        public:
            Matrix(std::size_t r, std::size_t c) : rows_(r), cols_(c), a_(r * c, 0.0) {}
            Matrix(std::initializer_list<std::initializer_list<double>> init)
                : rows_(init.size()), cols_(init.size() ? init.begin()->size() : 0) {
                for (const auto& row : init) {
                    if (row.size() != cols_) throw std::invalid_argument("ragged rows");
                    a_.insert(a_.end(), row.begin(), row.end());
                }
            }
            double& operator()(std::size_t i, std::size_t j) { return a_[i * cols_ + j]; }
            double operator()(std::size_t i, std::size_t j) const { return a_[i * cols_ + j]; }
            std::size_t rows() const { return rows_; }
            std::size_t cols() const { return cols_; }
            bool operator==(const Matrix&) const = default;

            friend Matrix operator*(const Matrix& A, const Matrix& B) {
                if (A.cols_ != B.rows_) throw std::invalid_argument("dimension mismatch");
                Matrix C(A.rows_, B.cols_);
                for (std::size_t i = 0; i < A.rows_; ++i)
                    for (std::size_t k = 0; k < A.cols_; ++k) {
                        double aik = A(i, k);
                        for (std::size_t j = 0; j < B.cols_; ++j) C(i, j) += aik * B(k, j);   // row-wise
                    }
                return C;
            }
            Matrix& operator*=(const Matrix& o) { *this = *this * o; return *this; }

            friend std::ostream& operator<<(std::ostream& os, const Matrix& m) {
                for (std::size_t i = 0; i < m.rows_; ++i) {
                    os << '[';
                    for (std::size_t j = 0; j < m.cols_; ++j) os << m(i, j) << (j + 1 < m.cols_ ? "," : "");
                    os << "]\n";
                }
                return os;
            }
        };

        int main() {
            Matrix A{{1, 2}, {3, 4}}, B{{5, 6}, {7, 8}};
            std::cout << A * B;                                    // [19,22] [43,50]
            std::cout << (A * B == Matrix{{19, 22}, {43, 50}}) << '\n';   // 1
            try { Matrix C(3, 1); A * C; } catch (const std::invalid_argument& e) { std::cout << e.what() << '\n'; }
        }

      `,
      dry: { head: ['i', 'k', 'aik', 'row C(i,·) after k'], rows: [
        ['0', '0', '1', '[5, 6]'],
        ['0', '1', '2', '[5+14, 6+16] = [19, 22]'],
        ['1', '0', '3', '[15, 18]'],
        ['1', '1', '4', '[15+28, 18+32] = [43, 50]']
      ] },
      complexity: `<p>Product O(n·m·p) time, O(n·p) extra memory. Copy O(rows·cols), move O(1) (vector move). The i-k-j order is typically 3–10× faster than i-j-k for large matrices because of cache behaviour.</p>`,
      followUps: ['Add <code>operator[](i, j)</code> under C++23.', 'Implement expression templates so <code>A + B + C</code> makes no temporaries.', 'Return a lightweight row view from <code>row(i)</code> using <code>std::span</code>.']
    }
  });

  practice.push({
    title: 'Make Your Range Work in a Range-for (Iterator Operators)',
    level: 'Medium', tags: ['iterator', 'operator*', 'operator++', 'operator=='], companies: ['Google', 'Microsoft', 'Bloomberg'],
    statement: `<p>Implement <code>Range(lo, hi, step)</code> that produces <code>lo, lo+step, …</code> while <code>&lt; hi</code>, without storing the numbers. It must work in <code>for (int x : Range(0, 10, 3))</code> and with <code>std::vector&lt;int&gt; v(r.begin(), r.end())</code>. Write the iterator class with <code>operator*</code>, prefix and postfix <code>operator++</code>, and <code>operator==</code>.</p>`,
    constraints: `<p>step &gt; 0. O(1) memory. Must satisfy <code>std::input_iterator</code> (check with <code>static_assert</code>).</p>`,
    example: `<p><code>Range(0, 10, 3)</code> yields ${H.c('g', '0 3 6 9')}. The range-for is rewritten by the compiler into <code>for (auto it = r.begin(), end = r.end(); it != end; ++it) { int x = *it; … }</code> — exactly the three operators you write.</p>`,
    brute: {
      why: `<p>Materializing the numbers into a <code>std::vector&lt;int&gt;</code> works but costs O(n) memory and time up front — a <code>Range(0, 1'000'000'000)</code> would allocate 4 GB just to loop.</p>`,
      code: R`
        #include <vector>
        std::vector<int> rangeVec(int lo, int hi, int step) {
            std::vector<int> v;
            for (int x = lo; x < hi; x += step) v.push_back(x);   // O(n) memory before the loop even starts
            return v;
        }
      `
    },
    mcq: { q: 'With <code>it != end</code> in the loop condition and only <code>operator==</code> defined, does it compile in C++20?', options: ['Yes — != is rewritten as !(it == end)', 'No — you must write operator!= too', 'Only if operator&lt;=&gt; is defined', 'Only for random-access iterators'], answer: 0, explain: 'C++20 rewritten comparison candidates generate != from ==. (Before C++20 you had to write both.)' },
    hints: [
      `<p>Hint 1: the iterator stores the current value and the step. Comparing iterators needs care: with step 3 and hi 10 the values go 0,3,6,9,12 — never exactly 10.</p>`,
      `<p>Hint 2: make <code>end()</code> hold the first value ≥ hi that the sequence actually reaches: <code>lo + ceil((hi-lo)/step)*step</code>, so <code>==</code> on the current value works.</p>`,
      `<p>Hint 3: provide the iterator type aliases (<code>value_type</code>, <code>difference_type</code>, <code>iterator_concept</code>) so standard algorithms accept it; postfix <code>++</code> returns the old copy.</p>`
    ],
    tests: { sig: 'int int int -> int[]', fn: 'rg',
      harness: { cpp: "vector<int> rg(int lo, int hi, int step) { Range r(lo, hi, step); vector<int> out; for (int x : r) out.push_back(x); vector<int> v(r.begin(), r.end()); if (v != out) return {-777}; auto it = r.begin(); if (!out.empty()) { auto old = it++; if (*old != lo || *it != lo + step && out.size() > 1) { if (out.size() > 1) return {-778}; } } return out; }" }, cases: [
      [[0,10,3], [0,3,6,9]],
      [[5,8,1], [5,6,7]],
      [[0,0,1], []],
      [[5,5,3], []],
      [[5,2,1], []],
      [[-5,5,5], [-5,0]],
      [[-10,-1,4], [-10,-6,-2]],
      [[0,1,100], [0]],
      [[0,1,1], [0]],
      [[3,4,7], [3]],
      [[-2147483648,-2147483640,3], [-2147483648,-2147483645,-2147483642]],
      [[2147483640,2147483647,2], [2147483640,2147483642,2147483644,2147483646]],
      [[0,2147483647,1073741824], [0,1073741824]],
      [[100,1000,450], [100,550]],
      [[0,1000000,1], {"$range":[0,1000000]}],
      [[0,1000000,7], {"$range":[0,1000000,7]}],
      [[-500000,500000,3], {"$range":[-500000,500000,3]}]
    ] },
    solution: {
      approach: `<p>A lightweight iterator holding (value, step). <code>end()</code> is pre-computed as the first reachable value at or past <code>hi</code>, so equality comparison on values is exact. C++20 rewrites <code>!=</code> from <code>==</code>.</p>`,
      code: R`
        #include <iostream>
        #include <iterator>
        #include <vector>

        class Range {
            int lo_, hi_, step_;
        public:
            class iterator {
                long long v_ = 0;                      // wide: lo + n * step can pass INT_MAX
                int step_ = 1;
            public:
                using value_type = int;
                using difference_type = std::ptrdiff_t;
                using iterator_concept = std::forward_iterator_tag;
                iterator() = default;
                iterator(long long v, int s) : v_(v), step_(s) {}
                int operator*() const { return static_cast<int>(v_); }
                iterator& operator++() { v_ += step_; return *this; }               // prefix
                iterator operator++(int) { iterator old = *this; v_ += step_; return old; }   // postfix
                bool operator==(const iterator& o) const { return v_ == o.v_; }      // != comes for free
            };
            Range(int lo, int hi, int step = 1) : lo_(lo), hi_(hi), step_(step) {}
            iterator begin() const { return {lo_, step_}; }
            iterator end() const {
                long long n = hi_ > lo_ ? (static_cast<long long>(hi_) - lo_ + step_ - 1) / step_ : 0;   // number of elements
                return {lo_ + n * step_, step_};
            }
        };
        static_assert(std::forward_iterator<Range::iterator>);

        int main() {
            for (int x : Range(0, 10, 3)) std::cout << x << ' ';                    // 0 3 6 9
            Range r(5, 8);
            std::vector<int> v(r.begin(), r.end());                                 // 5 6 7
            std::cout << "| " << v.size() << '\n';
        }

      `,
      dry: { head: ['Iteration', 'it.v_', 'it == end (12)?', 'x printed'], rows: [
        ['1', '0', 'no', '0'],
        ['2', '3', 'no', '3'],
        ['3', '6', 'no', '6'],
        ['4', '9', 'no', '9'],
        ['5', '12', H.c('g', 'yes → stop'), '—']
      ] },
      complexity: `<p>O(1) memory, O(1) per step. The compiler typically optimizes the range-for to the same loop as a hand-written <code>for (int x = lo; x &lt; hi; x += step)</code>.</p>`,
      followUps: ['Support negative steps.', 'Use a sentinel type for <code>end()</code> instead of precomputing it (C++20 ranges allow different begin/end types).', 'Make <code>Range</code> a <code>std::ranges::view</code> and pipe it into <code>std::views::filter</code>.']
    }
  });

  practice.push({
    title: 'Which Constructor Runs? Ten Ways to Initialize an Object',
    level: 'Medium', tags: ['initialization', 'most vexing parse', 'explicit', 'predict output'], companies: ['Bloomberg', 'Amazon', 'Optiver'],
    statement: `<p>For a class <code>W</code> that prints from its default ctor, <code>W(int)</code>, <code>explicit W(double)</code>, <code>W(std::initializer_list&lt;int&gt;)</code>, copy ctor and move ctor, predict what each line prints: <code>W a; W b(1); W c = 2; W d{3}; W e{}; W f = {4, 5}; W g(a); W h = std::move(a); W i = W(6); W j();</code> — and spot the line that does not create an object at all.</p>`,
    constraints: `<p>C++17 or later (guaranteed copy elision). <code>W(double)</code> is explicit.</p>`,
    example: `<p><code>W d{3};</code> → ${H.c('y', 'init-list ctor')} (braces strongly prefer initializer_list constructors). <code>W e{};</code> → ${H.c('g', 'default ctor')} (empty braces mean value-initialization). <code>W j();</code> → ${H.c('r', 'nothing: it declares a function!')} (the most vexing parse).</p>`,
    brute: {
      why: `<p>Guessing from the visual shape of the line ("parentheses call the matching constructor, braces too") gets <code>W d{3}</code>, <code>W f = {4, 5}</code>, <code>W i = W(6)</code> and <code>W j()</code> wrong. You need the actual rules for direct, copy, list and value initialization.</p>`,
      code: R`
        #include <iostream>
        struct W {
            W() { std::cout << "default\n"; }
            W(int) { std::cout << "int\n"; }
            // naive guess table:
            // W d{3};      -> "int"?         (wrong: init-list wins)
            // W i = W(6);  -> "int" + "copy"? (wrong: elided since C++17)
            // W j();       -> "default"?      (wrong: declares a function)
        };
      `
    },
    mcq: { q: 'What does <code>W j();</code> do?', options: ['Declares a function j taking no arguments and returning W', 'Default-constructs j', 'Value-initializes j to zero', 'Compile error'], answer: 0, explain: 'If something can be parsed as a declaration, it is. Empty parentheses after a name in a declaration declare a function. Use <code>W j;</code> or <code>W j{};</code>.' },
    hints: [
      `<p>Hint 1: copy-initialization (<code>W c = 2;</code>) considers only <b>non-explicit</b> converting constructors.</p>`,
      `<p>Hint 2: list-initialization (<code>{…}</code>) prefers an <code>initializer_list</code> constructor whenever the elements can convert; empty braces <code>{}</code> use the default constructor instead.</p>`,
      `<p>Hint 3: <code>W i = W(6);</code> is a prvalue initializing a W → guaranteed elision: just <code>W(int)</code>.</p>`
    ],
    tests: { io: true, cases: [
      { stdin: "", stdout: "default\nint\nint\ninit-list(1)\ndefault\ninit-list(2)\ncopy\nmove\nint\ndouble" }
    ] },
    solution: {
      approach: `<p>Classify each line by initialization kind: default, direct, copy, list (direct or copy), value; apply explicit-ness and initializer_list preference; remember elision and the most vexing parse.</p>`,
      code: R`
        #include <initializer_list>
        #include <iostream>
        #include <utility>
        struct W {
            W() { std::cout << "default\n"; }
            W(int) { std::cout << "int\n"; }
            explicit W(double) { std::cout << "double\n"; }
            W(std::initializer_list<int> l) { std::cout << "init-list(" << l.size() << ")\n"; }
            W(const W&) { std::cout << "copy\n"; }
            W(W&&) noexcept { std::cout << "move\n"; }
        };
        int main() {
            W a;               // default
            W b(1);            // int
            W c = 2;           // int        (copy-init: non-explicit converting ctor)
            W d{3};            // init-list(1)
            W e{};             // default    (empty braces -> value-init via default ctor)
            W f = {4, 5};      // init-list(2)
            W g(a);            // copy
            W h = std::move(a);// move
            W i = W(6);        // int        (guaranteed elision, no copy/move)
            W j();             // prints nothing: declares a function named j!
            W k(2.5);          // double     (direct-init may use explicit ctors)
            // W m = 2.5;      // would pick W(int) after double->int conversion? No: explicit W(double) is
            //                 // ignored, W(int) is viable -> prints "int" (narrowing silently!)
        }
      `,
      dry: { head: ['Line', 'Initialization kind', 'Chosen constructor'], rows: [
        ['<code>W c = 2;</code>', 'copy-init', 'W(int)'],
        ['<code>W d{3};</code>', 'direct-list-init', 'W(initializer_list) — preferred'],
        ['<code>W e{};</code>', 'value-init', 'W()'],
        ['<code>W f = {4, 5};</code>', 'copy-list-init', 'W(initializer_list)'],
        ['<code>W i = W(6);</code>', 'copy-init from prvalue', 'W(int) only (elided)'],
        ['<code>W j();</code>', H.c('r', 'function declaration'), 'none'],
        ['<code>W k(2.5);</code>', 'direct-init', 'explicit W(double)']
      ] },
      complexity: `<p>Not algorithmic. Practical rule: prefer <code>{}</code> for "construct from these values" except when a type has an initializer_list constructor you do not want (the classic <code>std::vector&lt;int&gt; v{10}</code> = one element vs <code>v(10)</code> = ten elements).</p>`,
      followUps: ['Explain <code>std::vector&lt;int&gt; a(3, 1)</code> vs <code>std::vector&lt;int&gt; b{3, 1}</code>.', 'Why does <code>W x{2.5}</code> fail to compile (narrowing in list-init)?', 'What does <code>auto x{5};</code> deduce since C++17?']
    }
  });

  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'Build a Minimal unique_ptr (Move-Only Ownership, Custom Deleter)',
    level: 'Hard', tags: ['rule of five', 'move-only', 'RAII', 'operator overloading'], companies: ['Google', 'Bloomberg', 'Meta'],
    statement: `<p>Implement <code>UniquePtr&lt;T, D = DefaultDelete&lt;T&gt;&gt;</code>: sole ownership of a heap object, copy <b>deleted</b>, noexcept move constructor/assignment, destructor that calls the deleter, <code>operator*</code>, <code>operator-&gt;</code>, <code>explicit operator bool</code>, <code>get()</code>, <code>release()</code>, <code>reset(p = nullptr)</code>, and a <code>makeUnique&lt;T&gt;(args...)</code> factory. A <code>UniquePtr&lt;Derived&gt;</code> must convert to <code>UniquePtr&lt;Base&gt;</code>.</p>`,
    constraints: `<p>No leaks or double deletes under any sequence of moves/resets (verify with ASan). <code>sizeof(UniquePtr&lt;T&gt;) == sizeof(T*)</code> for the empty default deleter (use <code>[[no_unique_address]]</code>).</p>`,
    example: `<p><code>auto a = makeUnique&lt;int&gt;(5); auto b = std::move(a);</code> → ${H.c('y', 'a is null')}, ${H.c('g', '*b == 5')}. <code>UniquePtr&lt;int&gt; c = b;</code> → ${H.c('r', 'compile error (copy deleted)')}. <code>b.reset(new int(7));</code> → old 5 deleted, b owns 7.</p>`,
    brute: {
      why: `<p>A raw-pointer wrapper that relies on the compiler-generated copy members gives two owners → double delete. Making copy "transfer ownership" (the C++98 <code>auto_ptr</code> design) silently nulls the source on what looks like a copy, which broke containers and algorithms — that is why <code>auto_ptr</code> was removed in C++17.</p>`,
      code: R`
        template <class T>
        class NaivePtr {
            T* p_;
        public:
            explicit NaivePtr(T* p) : p_(p) {}
            ~NaivePtr() { delete p_; }
            T& operator*() const { return *p_; }
            // compiler-generated copy: two NaivePtrs own the same T -> double delete
        };
        int main() { NaivePtr<int> a(new int(1)); NaivePtr<int> b = a; }   // double free at exit
      `
    },
    mcq: { q: 'Why must <code>reset(p)</code> store the new pointer <b>before</b> deleting the old one?', options: ['If deleting the old object somehow reaches this UniquePtr again (e.g. via its destructor), it must already see a consistent state', 'Because delete is slow', 'To avoid a compiler warning', 'It does not matter'], answer: 0, explain: 'The standard specifies: old = ptr; ptr = p; if (old) deleter(old). Deleting first would leave a dangling pointer visible during the old object\'s destructor (and breaks self-reset patterns).' },
    hints: [
      `<p>Hint 1: members: <code>T* p_</code> and <code>[[no_unique_address]] D d_</code>. Delete the copy constructor and copy assignment.</p>`,
      `<p>Hint 2: move ctor: <code>p_(std::exchange(o.p_, nullptr))</code>. Move assign: <code>reset(o.release())</code> — automatically self-move safe? Check it: release() nulls o first, then reset deletes our old pointer; for self-move old == new pointer… handle that case.</p>`,
      `<p>Hint 3: converting constructor <code>template &lt;class U&gt; requires std::is_convertible_v&lt;U*, T*&gt; UniquePtr(UniquePtr&lt;U&gt;&amp;&amp; o)</code>; give it access via a friend declaration or use <code>o.release()</code>.</p>`
    ],
    tests: { sig: 'int int -> long[]', fn: 'up',
      harness: { cpp: "struct Probe { static inline int live = 0; int v; explicit Probe(int x) : v(x) { ++live; } ~Probe() { --live; } };\nstruct CountDel { int* cnt; void operator()(Probe* p) const { ++*cnt; delete p; } };\nvector<long long> up(int mode, int n) { vector<long long> r; int base = Probe::live;\n  if (mode == 0) { auto a = makeUnique<Probe>(5); auto b = std::move(a); r = {(long long)(bool)a, b->v, Probe::live - base}; b.reset(new Probe(7)); r.push_back(b->v); r.push_back(Probe::live - base); b.reset(); r.push_back((bool)b); r.push_back(Probe::live - base); }\n  else if (mode == 1) { UniquePtr<Base> p = makeUnique<Derived>(); r = {p->id(), (long long)(bool)p}; UniquePtr<Base> q; q = std::move(p); r.push_back((bool)p); r.push_back((bool)q); r.push_back(q->id()); Base* raw = q.release(); r.push_back((bool)q); delete raw; }\n  else if (mode == 2) { int cnt = 0; { UniquePtr<Probe, CountDel> u(new Probe(1), CountDel{&cnt}); r.push_back(cnt); u.reset(new Probe(2)); r.push_back(cnt); r.push_back(Probe::live - base); auto w = std::move(u); r.push_back(cnt); r.push_back((bool)u); r.push_back(w->v); } r.push_back(cnt); r.push_back(Probe::live - base); }\n  else if (mode == 3) { UniquePtr<Probe> a = makeUnique<Probe>(9); UniquePtr<Probe>& ref = a; a = std::move(ref); r = {(long long)(bool)a, a->v, Probe::live - base}; Probe* raw = a.release(); r.push_back(Probe::live - base); a.reset(raw); r.push_back(a->v); }\n  else { vector<UniquePtr<Probe>> v; for (int i = 0; i < n; ++i) v.push_back(makeUnique<Probe>(i)); r.push_back(Probe::live - base); while ((int)v.size() > n / 2) v.pop_back(); r.push_back(Probe::live - base); v.clear(); r.push_back(Probe::live - base); }\n  r.push_back(Probe::live - base); return r; }" }, cases: [
      [[0,0], [0,5,1,7,1,0,0,0]],
      [[1,0], [1,1,0,1,1,0,0]],
      [[2,0], [0,1,1,1,0,2,2,0,0]],
      [[3,0], [1,9,1,1,9,0]],
      [[4,10], [10,5,0,0]],
      [[4,1], [1,0,0,0]],
      [[4,0], [0,0,0,0]],
      [[4,7], [7,3,0,0]],
      [[4,1000], [1000,500,0,0]]
    ] },
    solution: {
      approach: `<p>RAII handle with move-only semantics. The destructor and <code>reset</code> are the only places that call the deleter. Move assignment is implemented as <code>reset(o.release())</code> guarded against self-move. <code>[[no_unique_address]]</code> makes an empty deleter take no space.</p>`,
      code: R`
        #include <iostream>
        #include <type_traits>
        #include <utility>

        template <class T>
        struct DefaultDelete {
            DefaultDelete() = default;
            template <class U> requires std::is_convertible_v<U*, T*>
            DefaultDelete(const DefaultDelete<U>&) noexcept {}                // Derived deleter -> Base deleter
            void operator()(T* p) const noexcept { delete p; }
        };

        template <class T, class D = DefaultDelete<T>>
        class UniquePtr {
            T* p_ = nullptr;
            [[no_unique_address]] D d_{};
        public:
            UniquePtr() noexcept = default;
            explicit UniquePtr(T* p, D d = D{}) noexcept : p_(p), d_(std::move(d)) {}
            ~UniquePtr() { if (p_) d_(p_); }

            UniquePtr(const UniquePtr&) = delete;                       // sole ownership
            UniquePtr& operator=(const UniquePtr&) = delete;

            UniquePtr(UniquePtr&& o) noexcept : p_(std::exchange(o.p_, nullptr)), d_(std::move(o.d_)) {}
            UniquePtr& operator=(UniquePtr&& o) noexcept {
                if (this != &o) { reset(o.release()); d_ = std::move(o.d_); }
                return *this;
            }

            template <class U, class E>
                requires std::is_convertible_v<U*, T*> && std::is_convertible_v<E, D>
            UniquePtr(UniquePtr<U, E>&& o) noexcept : p_(o.release()), d_(std::move(o.get_deleter())) {}

            T& operator*() const { return *p_; }
            T* operator->() const noexcept { return p_; }
            explicit operator bool() const noexcept { return p_ != nullptr; }
            T* get() const noexcept { return p_; }
            D& get_deleter() noexcept { return d_; }
            T* release() noexcept { return std::exchange(p_, nullptr); }
            void reset(T* p = nullptr) noexcept {
                T* old = std::exchange(p_, p);                          // publish new state first
                if (old) d_(old);
            }
        };

        template <class T, class... Args>
        UniquePtr<T> makeUnique(Args&&... args) { return UniquePtr<T>(new T(std::forward<Args>(args)...)); }

        struct Base { virtual ~Base() = default; virtual int id() const { return 0; } };
        struct Derived : Base { int id() const override { return 1; } };

        static_assert(sizeof(UniquePtr<int>) == sizeof(int*));
        static_assert(!std::is_copy_constructible_v<UniquePtr<int>>);
        static_assert(std::is_nothrow_move_constructible_v<UniquePtr<int>>);

        int main() {
            auto a = makeUnique<int>(5);
            auto b = std::move(a);                                      // a null, b owns 5
            b.reset(new int(7));                                        // 5 deleted, b owns 7
            UniquePtr<Base> poly = makeUnique<Derived>();               // converting move
            std::cout << static_cast<bool>(a) << ' ' << *b << ' ' << poly->id() << '\n';   // 0 7 1
        }

      `,
      dry: { head: ['Statement', 'a.p_', 'b.p_', 'Heap'], rows: [
        ['<code>a = makeUnique&lt;int&gt;(5)</code>', '0x10', '—', '{0x10: 5}'],
        ['<code>b = std::move(a)</code>', 'nullptr', '0x10', '{0x10: 5}'],
        ['<code>b.reset(new int(7))</code>', 'nullptr', '0x20', '{0x20: 7} (0x10 deleted)'],
        ['end of main', '—', 'deleted 0x20', 'empty']
      ] },
      complexity: `<p>All operations O(1). Zero space overhead beyond one pointer with a stateless deleter.</p>`,
      followUps: ['Add the array specialization <code>UniquePtr&lt;T[]&gt;</code> with <code>operator[]</code> and <code>delete[]</code>.', 'Use a function-pointer deleter for <code>FILE*</code> with <code>fclose</code>. What happens to sizeof?', 'Why can a <code>std::unique_ptr</code> to an incomplete type be declared but its destructor not instantiated?']
    }
  });

  practice.push({
    title: 'Hand-Rolled vtable: Dynamic Dispatch in C-Style Code',
    level: 'Hard', tags: ['vtable', 'vptr', 'function pointers', 'internals'], companies: ['Nvidia', 'Apple', 'Qualcomm'],
    statement: `<p>Without using the <code>virtual</code> keyword, implement polymorphic <code>area()</code> and <code>name()</code> for Circle and Rect the way the compiler does: a <code>VTable</code> struct of function pointers, one <code>static const</code> table per "class", and a <code>vptr</code> as the first member of each object. Write <code>double totalArea(Shape* const* shapes, int n)</code> that dispatches through the vptr.</p>`,
    constraints: `<p>Plain structs only (as you would in C or in a kernel / embedded codebase). Objects must be usable through a <code>Shape*</code> that points at their first member.</p>`,
    example: `<p>Circle r=1 and Rect 2×3 → total ${H.c('g', '9.14159')}. Dispatch for the Rect: ${H.c('b', 's-&gt;vptr')} → ${H.c('y', 'RectVTable')} → ${H.c('g', 'rect_area(s)')}.</p>`,
    brute: {
      why: `<p>A type-tag <code>switch</code> in every function works but every new shape edits every switch — exactly the coupling vtables were invented to remove. Storing function pointers <b>per object</b> (instead of one shared table) wastes memory: two pointers per object per method.</p>`,
      code: R`
        enum Kind { CIRCLE, RECT };
        struct Shape { Kind kind; double a, b; };
        double area(const Shape* s) {
            switch (s->kind) {                       // edited for every new shape
                case CIRCLE: return 3.14159 * s->a * s->a;
                case RECT:   return s->a * s->b;
            }
            return 0;
        }
      `
    },
    mcq: { q: 'Why does each object store a pointer to a <b>shared</b> table instead of its own function pointers?', options: ['One table per class costs memory once; each object pays only 8 bytes for the vptr regardless of how many virtual functions exist', 'Function pointers cannot be stored in objects', 'It is faster to call through two indirections', 'Shared tables are required by C'], answer: 0, explain: 'With k virtual functions, per-object function pointers cost 8k bytes per object; a vptr costs 8 bytes per object plus 8k bytes per class.' },
    hints: [
      `<p>Hint 1: <code>struct VTable { double (*area)(const struct Shape*); const char* (*name)(const struct Shape*); };</code> and <code>struct Shape { const VTable* vptr; };</code></p>`,
      `<p>Hint 2: <code>struct Circle { Shape base; double r; };</code> — base first, so <code>(Shape*)&amp;circle</code> is valid (standard-layout); inside <code>circle_area</code> cast back with <code>reinterpret_cast&lt;const Circle*&gt;(s)</code>.</p>`,
      `<p>Hint 3: the "constructor" sets <code>c.base.vptr = &amp;CircleVTable</code>; the call site is <code>s-&gt;vptr-&gt;area(s)</code> — exactly what <code>s-&gt;area()</code> compiles to.</p>`
    ],
    tests: { sig: 'string double[] double[] -> double', fn: 'vt', cmp: 'float',
      harness: { cpp: "double vt(string kinds, vector<double> a, vector<double> b) { vector<Circle> cs; vector<Rect> rs; cs.reserve(kinds.size()); rs.reserve(kinds.size()); vector<Shape*> sh; for (size_t i = 0; i < kinds.size(); ++i) { if (kinds[i] == 'C') { cs.push_back(makeCircle(a[i])); sh.push_back(&cs.back().base); if (string(sh.back()->vptr->name(sh.back())) != \"circle\") return -1; } else { rs.push_back(makeRect(a[i], b[i])); sh.push_back(&rs.back().base); if (string(sh.back()->vptr->name(sh.back())) != \"rect\") return -2; } }\n  return totalArea(sh.data(), (int)sh.size()); }" }, cases: [
      [["CR",[1,2],[0,3]], 9.14159],
      [["",[],[]], 0],
      [["C",[0],[0]], 0],
      [["R",[1000000],[1000000]], 1000000000000],
      [["RRCC",[1,2,3,0.5],[4,5,0,0]], 43.0597075],
      [["C",[10],[0]], 314.159],
      [[{"$rep":"R","n":100000},{"$rep":2,"n":100000},{"$rep":0.5,"n":100000}], 100000]
    ] },
    solution: {
      approach: `<p>Emulate the Itanium-style layout: the base sub-object (holding the vptr) is the first member, each "class" has one constant table, and a call loads the vptr, loads the slot and calls with the object pointer as <code>this</code>. This is how GObject, the Linux kernel's <code>file_operations</code>, and COM work.</p>`,
      code: R`
        #include <cstdio>

        struct Shape;
        struct VTable {
            double (*area)(const Shape*);
            const char* (*name)(const Shape*);
        };
        struct Shape { const VTable* vptr; };                      // the hidden member, made visible

        struct Circle { Shape base; double r; };                   // base FIRST: Shape* == Circle* address
        struct Rect   { Shape base; double w, h; };

        static double circle_area(const Shape* s) { const Circle* c = reinterpret_cast<const Circle*>(s); return 3.14159 * c->r * c->r; }
        static const char* circle_name(const Shape*) { return "circle"; }
        static double rect_area(const Shape* s) { const Rect* r = reinterpret_cast<const Rect*>(s); return r->w * r->h; }
        static const char* rect_name(const Shape*) { return "rect"; }

        static const VTable CircleVTable = { circle_area, circle_name };   // one table per "class"
        static const VTable RectVTable   = { rect_area, rect_name };

        Circle makeCircle(double r) { Circle c; c.base.vptr = &CircleVTable; c.r = r; return c; }   // "constructor" sets vptr
        Rect makeRect(double w, double h) { Rect x; x.base.vptr = &RectVTable; x.w = w; x.h = h; return x; }

        double totalArea(Shape* const* shapes, int n) {
            double sum = 0;
            for (int i = 0; i < n; ++i) sum += shapes[i]->vptr->area(shapes[i]);   // load vptr, load slot, call
            return sum;
        }

        int main() {
            Circle c = makeCircle(1);
            Rect r = makeRect(2, 3);
            Shape* shapes[] = { &c.base, &r.base };
            for (Shape* s : shapes) std::printf("%s %.5f\n", s->vptr->name(s), s->vptr->area(s));
            std::printf("total %.5f\n", totalArea(shapes, 2));      // total 9.14159
        }

      `,
      dry: { head: ['Element', 'vptr →', 'slot area', 'Result', 'Sum'], rows: [
        ['shapes[0]', 'CircleVTable', 'circle_area', '3.14159', '3.14159'],
        ['shapes[1]', 'RectVTable', 'rect_area', '6', H.c('g', '9.14159')]
      ] },
      complexity: `<p>O(N) with one indirect call per element — identical cost to C++ virtual functions. Memory: 8 bytes per object + one table per type.</p>`,
      followUps: ['Add "inheritance": a <code>Square</code> whose table reuses <code>rect_area</code> but has its own name.', 'Add a destroy slot and emulate a virtual destructor.', 'Compare the generated assembly with the <code>virtual</code> version at -O2.']
    }
  });

  practice.push({
    title: 'Growable Stack&lt;T&gt; with the Strong Exception Guarantee',
    level: 'Hard', tags: ['rule of five', 'move_if_noexcept', 'exception safety', 'templates'], companies: ['Bloomberg', 'Citadel', 'Hudson River Trading'],
    statement: `<p>Implement <code>Stack&lt;T&gt;</code> backed by a manually managed buffer that grows ×2. <code>push(const T&amp;)</code>/<code>push(T&amp;&amp;)</code> must give the <b>strong guarantee</b>: if anything throws (allocation, T's copy, T's move), the stack is unchanged. Use <code>std::move_if_noexcept</code> when relocating. Provide full Rule of Five, <code>pop()</code>, <code>top()</code>, <code>size()</code>.</p>`,
    constraints: `<p>T may have a throwing copy constructor and a possibly-throwing move constructor. Use <code>std::allocator&lt;T&gt;</code> or <code>::operator new</code> + placement new so capacity slots are not default-constructed.</p>`,
    example: `<p>Push 3 strings into capacity 2 → reallocation to 4: ${H.c('g', 'moves the 2 existing strings')} (string's move is noexcept). For a type whose move may throw, ${H.c('y', 'it copies them instead')} so a failure leaves the old buffer intact.</p>`,
    brute: {
      why: `<p>Using <code>new T[cap]</code> default-constructs every slot (requires default-constructible T, wastes work). Relocating with <code>std::move</code> unconditionally loses elements if the 3rd move throws: the first two are already gutted in the old buffer.</p>`,
      code: R`
        #include <algorithm>
        #include <cstddef>
        #include <utility>
        template <class T>
        class NaiveStack {
            T* d_ = new T[1]; std::size_t n_ = 0, cap_ = 1;
        public:
            ~NaiveStack() { delete[] d_; }
            void push(T v) {
                if (n_ == cap_) {
                    T* nd = new T[cap_ * 2];                                    // default-constructs every slot
                    for (std::size_t i = 0; i < n_; ++i) nd[i] = std::move(d_[i]);   // throws midway -> data lost, nd leaked
                    delete[] d_; d_ = nd; cap_ *= 2;
                }
                d_[n_++] = std::move(v);
            }
        };
      `
    },
    mcq: { q: 'Relocating during growth, when should elements be copied instead of moved?', options: ['When T\'s move constructor is not noexcept and T is copyable', 'Always copy', 'Always move', 'When T is trivially copyable'], answer: 0, explain: 'std::move_if_noexcept yields an rvalue only if moving cannot throw (or T is move-only). Copying keeps the originals intact, so if a copy throws we destroy the partial new buffer and the stack is unchanged.' },
    hints: [
      `<p>Hint 1: allocate raw storage with <code>std::allocator&lt;T&gt;</code>; construct with <code>std::construct_at</code>; destroy with <code>std::destroy_at</code>/<code>std::destroy</code>.</p>`,
      `<p>Hint 2: in <code>grow()</code>, construct into the new buffer inside try/catch; on exception destroy the already-built elements in the new buffer, deallocate it, rethrow. Only after success destroy the old elements and swap buffers.</p>`,
      `<p>Hint 3: in <code>push</code>, construct the new element into the <b>new</b> buffer before relocating the old ones (it may alias an existing element: <code>s.push(s.top())</code>).</p>`
    ],
    tests: { sig: 'int[] int int -> long[]', fn: 'stk',
      harness: { cpp: "struct Flaky { int v = 0; static inline int budget = -1; Flaky() = default; Flaky(int x) : v(x) {} Flaky(const Flaky& o) : v(o.v) { tick(); } Flaky(Flaky&& o) noexcept(false) : v(o.v) { tick(); } Flaky& operator=(const Flaky&) = default; static void tick() { if (budget == 0) throw runtime_error(\"copy failed\"); if (budget > 0) --budget; } };\nvector<long long> stk(vector<int> vals, int budget, int mode) { vector<long long> r;\n  if (mode == 1) { if (vals.empty()) return {0, 0, 0, 0, 0}; Stack<string> s; for (int v : vals) s.push(to_string(v)); if (!vals.empty()) s.push(s.top()); Stack<string> t = s; s.pop(); r = {(long long)s.size(), (long long)t.size(), vals.empty() ? 0 : stol(t.top())}; Stack<string> u; u = t; u.pop(); r.push_back((long long)u.size()); r.push_back((long long)t.size()); return r; }\n  Stack<Flaky> s; size_t n = vals.size(); for (size_t i = 0; i + 1 < n; ++i) s.push(Flaky(vals[i])); Flaky::budget = -1; bool threw = false; if (n) { Flaky last(vals[n - 1]); Flaky::budget = budget; try { s.push(std::move(last)); } catch (const runtime_error&) { threw = true; } Flaky::budget = -1; }\n  r.push_back(threw ? 1 : 0); r.push_back((long long)s.size()); while (s.size()) { r.push_back(s.top().v); s.pop(); } return r; }" }, cases: [
      [[[1,2,3],-1,0], [0,3,3,2,1]],
      [[[1,2,3],0,0], [1,2,2,1]],
      [[[1,2,3],1,0], [1,2,2,1]],
      [[[1,2,3],2,0], [1,2,2,1]],
      [[[1,2,3],3,0], [0,3,3,2,1]],
      [[[1,2,3,4],0,0], [1,3,3,2,1]],
      [[[1,2,3,4],1,0], [0,4,4,3,2,1]],
      [[[1,2,3,4],4,0], [0,4,4,3,2,1]],
      [[[1,2,3,4],100,0], [0,4,4,3,2,1]],
      [[[5,6,7,8,9],4,0], [1,4,8,7,6,5]],
      [[[5,6,7,8,9],5,0], [0,5,9,8,7,6,5]],
      [[[5],0,0], [1,0]],
      [[[5],1,0], [0,1,5]],
      [[[],0,0], [0,0]],
      [[[1,2],1,0], [1,1,1]],
      [[[1,2],2,0], [0,2,2,1]],
      [[[1,2,3,4,5,6,7,8,9],8,0], [1,8,8,7,6,5,4,3,2,1]],
      [[[1,2,3,4,5,6,7,8,9],9,0], [0,9,9,8,7,6,5,4,3,2,1]],
      [[[1,2,3,4,5,6,7,8,9],0,0], [1,8,8,7,6,5,4,3,2,1]],
      [[[1,2,3,4,5,6,7],0,0], [1,6,6,5,4,3,2,1]],
      [[[1,2,3,4,5,6,7],1,0], [0,7,7,6,5,4,3,2,1]],
      [[[3,1,2],0,1], [3,4,2,3,4]],
      [[[],0,1], [0,0,0,0,0]],
      [[[9],0,1], [1,2,9,1,2]],
      [[[4,4,4,4,4],0,1], [5,6,4,5,6]]
    ] },
    solution: {
      approach: `<p>Separate allocation from construction. Growth builds a complete new buffer (relocating with <code>move_if_noexcept</code>) and commits with non-throwing pointer swaps only at the end. The element being pushed is constructed first in the new buffer so that pushing a reference to an existing element is safe. Copy uses the same build-then-commit pattern; moves steal pointers.</p>`,
      code: R`
        #include <cstddef>
        #include <iostream>
        #include <memory>
        #include <string>
        #include <utility>

        template <class T>
        class Stack {
            T* d_ = nullptr;
            std::size_t n_ = 0, cap_ = 0;
            static T* alloc(std::size_t c) { return c ? std::allocator<T>{}.allocate(c) : nullptr; }
            static void dealloc(T* p, std::size_t c) { if (p) std::allocator<T>{}.deallocate(p, c); }

            template <class U>
            void growAndPush(U&& v) {
                std::size_t nc = cap_ ? cap_ * 2 : 1;
                T* nd = alloc(nc);
                std::size_t built = 0;
                bool placed = false;
                try {
                    std::construct_at(nd + n_, std::forward<U>(v));                 // new element first (aliasing-safe)
                    placed = true;
                    for (; built < n_; ++built) std::construct_at(nd + built, std::move_if_noexcept(d_[built]));
                } catch (...) {                                                      // roll back: *this is untouched
                    std::destroy(nd, nd + built);                                    // relocated copies built so far
                    if (placed) std::destroy_at(nd + n_);                            // the new element, if it was built
                    dealloc(nd, nc);
                    throw;
                }
                std::destroy(d_, d_ + n_);                                           // commit: nothing below can throw
                dealloc(d_, cap_);
                d_ = nd; cap_ = nc; ++n_;
            }
        public:
            Stack() = default;
            ~Stack() { std::destroy(d_, d_ + n_); dealloc(d_, cap_); }
            Stack(const Stack& o) : d_(alloc(o.n_)), n_(0), cap_(o.n_) {
                try { for (; n_ < o.n_; ++n_) std::construct_at(d_ + n_, o.d_[n_]); }
                catch (...) { std::destroy(d_, d_ + n_); dealloc(d_, cap_); throw; }
            }
            Stack(Stack&& o) noexcept : d_(std::exchange(o.d_, nullptr)), n_(std::exchange(o.n_, 0)), cap_(std::exchange(o.cap_, 0)) {}
            Stack& operator=(Stack o) noexcept { swap(*this, o); return *this; }
            friend void swap(Stack& a, Stack& b) noexcept { std::swap(a.d_, b.d_); std::swap(a.n_, b.n_); std::swap(a.cap_, b.cap_); }

            void push(const T& v) { if (n_ == cap_) growAndPush(v); else { std::construct_at(d_ + n_, v); ++n_; } }
            void push(T&& v) { if (n_ == cap_) growAndPush(std::move(v)); else { std::construct_at(d_ + n_, std::move(v)); ++n_; } }
            void pop() { std::destroy_at(d_ + --n_); }
            T& top() { return d_[n_ - 1]; }
            std::size_t size() const { return n_; }
        };

        int main() {
            Stack<std::string> s;
            s.push("alpha"); s.push("beta"); s.push(s.top());       // aliasing push during growth: safe
            Stack<std::string> t = s;                                // deep copy
            s.pop();
            std::cout << s.size() << ' ' << t.size() << ' ' << t.top() << '\n';   // 2 3 beta
        }

      `,
      dry: { head: ['Operation', 'n / cap', 'Relocation', 'Note'], rows: [
        ['push "alpha"', '1 / 1', 'grow 0→1', 'construct in new buffer'],
        ['push "beta"', '2 / 2', 'grow 1→2: move alpha', 'string move is noexcept'],
        ['push(s.top())', '3 / 4', 'grow 2→4', 'copy of "beta" built FIRST, then alpha, beta moved'],
        ['<code>Stack t = s</code>', 't: 3 / 3', 'copy each', 'on throw: destroy built, free, rethrow'],
        ['s.pop()', '2 / 4', '—', 'destroy_at top']
      ] },
      complexity: `<p>push amortized O(1); growth O(n) moves (or copies when move may throw). Copy O(n). Move O(1). Extra memory during growth: old + new buffer.</p>`,
      followUps: ['If <code>push(T&amp;&amp;)</code> fails after the argument was already moved into the new buffer, is the caller\'s object still intact? How does <code>std::vector</code> document this?', 'Why can\'t <code>pop()</code> return the popped value by value with the strong guarantee? (the classic std::stack design reason)', 'Replace manual try/catch with a scope guard RAII helper.']
    }
  });

  practice.push({
    title: 'Value-Semantic Polymorphism: a Type-Erased AnyShape',
    level: 'Hard', tags: ['type erasure', 'virtual', 'rule of five', 'no slicing'], companies: ['Adobe', 'Google', 'Bloomberg'],
    statement: `<p>Implement <code>AnyShape</code> that can hold <b>any</b> type with an <code>area()</code> member (no common base class required!), is <b>copyable with value semantics</b> (copies deep-copy the held object), movable, and can be stored directly in <code>std::vector&lt;AnyShape&gt;</code> without slicing. This is Sean Parent's "runtime polymorphism without inheritance".</p>`,
    constraints: `<p>User types (<code>Circle</code>, <code>Square</code>) must not inherit from anything. One heap allocation per stored object.</p>`,
    example: `<p><code>std::vector&lt;AnyShape&gt; v{Circle{1}, Square{2}}; auto w = v; </code> → ${H.c('g', 'w is an independent deep copy')}; sum of areas ${H.c('b', '7.14159')}; no slicing because the vector stores AnyShape handles, not shapes.</p>`,
    brute: {
      why: `<p>The inheritance approach forces every type to derive from <code>Shape</code> (impossible for third-party types), requires <code>unique_ptr&lt;Shape&gt;</code> in containers (no value semantics: copying the vector does not compile) and a hand-written clone in every class.</p>`,
      code: R`
        #include <memory>
        #include <vector>
        struct Shape { virtual ~Shape() = default; virtual double area() const = 0; };
        struct Circle : Shape { double r; double area() const override { return 3.14159 * r * r; } };   // must inherit
        int main() {
            std::vector<std::unique_ptr<Shape>> v;
            // auto w = v;   // does not compile: unique_ptr is move-only -> no value semantics
        }
      `
    },
    mcq: { q: 'Where does the virtual function live in a type-erasure design?', options: ['In a private Concept base class inside AnyShape; a templated Model&lt;T&gt; implements it by calling T\'s area()', 'In the user\'s Circle class', 'In std::any', 'Nowhere — type erasure uses only templates'], answer: 0, explain: 'The inheritance is hidden inside the wrapper: Concept declares virtual area/clone, Model&lt;T&gt; stores a T and forwards. Users never see or inherit from Concept.' },
    hints: [
      `<p>Hint 1: inside AnyShape: <code>struct Concept { virtual ~Concept() = default; virtual double area() const = 0; virtual std::unique_ptr&lt;Concept&gt; clone() const = 0; };</code></p>`,
      `<p>Hint 2: <code>template &lt;class T&gt; struct Model final : Concept { T obj; ... double area() const override { return obj.area(); } ... };</code> and a templated constructor <code>AnyShape(T t)</code> that creates a Model&lt;T&gt;.</p>`,
      `<p>Hint 3: copy ctor clones; copy assignment via copy-and-swap; moves are defaulted (unique_ptr moves). Constrain the templated constructor so it does not hijack copying an AnyShape (exclude <code>T = AnyShape</code>).</p>`
    ],
    tests: { sig: 'string[] double[] -> double[]', fn: 'as', cmp: 'float',
      harness: { cpp: "vector<double> as(vector<string> kinds, vector<double> a) { vector<AnyShape> v; for (size_t i = 0; i < kinds.size(); ++i) { if (kinds[i] == \"C\") v.push_back(Circle{a[i]}); else v.push_back(Square{a[i]}); } vector<AnyShape> w = v; if (!v.empty()) v[0] = Square{10}; double sw = 0, sv = 0; for (auto& s : w) sw += s.area(); for (auto& s : v) sv += s.area(); vector<AnyShape> m = std::move(w); double sm = 0; for (auto& s : m) sm += s.area(); return {sw, v.empty() ? -1 : v[0].area(), sv, sm}; }" }, cases: [
      [[["C","S"],[1,2]], [7.14159,100,104,7.14159]],
      [[[],[]], [0,-1,0,0]],
      [[["C"],[0]], [0,100,100,0]],
      [[["S"],[3]], [9,100,100,9]],
      [[["S","S","C"],[1,2,0.5]], [5.7853975,100,104.7853975,5.7853975]],
      [[["C","C"],[1000,2]], [3141602.5663599996,100,112.56636000005528,3141602.5663599996]],
      [[{"$rep":"S","n":100000},{"$rep":2,"n":100000}], [400000,100,400096,400000]]
    ] },
    solution: {
      approach: `<p>External polymorphism: a hidden abstract <code>Concept</code>, a templated <code>Model&lt;T&gt;</code> adapting any type with <code>area()</code>, and a value-semantic handle owning <code>unique_ptr&lt;Concept&gt;</code>. Copy = clone (deep, type-preserving); move = pointer steal. The same pattern underlies <code>std::function</code> and <code>std::any</code>.</p>`,
      code: R`
        #include <concepts>
        #include <iostream>
        #include <memory>
        #include <type_traits>
        #include <vector>

        template <class T>
        concept HasArea = requires(const T& t) { { t.area() } -> std::convertible_to<double>; };

        class AnyShape {
            struct Concept {
                virtual ~Concept() = default;
                virtual double area() const = 0;
                virtual std::unique_ptr<Concept> clone() const = 0;
            };
            template <class T>
            struct Model final : Concept {
                T obj;
                explicit Model(T o) : obj(std::move(o)) {}
                double area() const override { return obj.area(); }
                std::unique_ptr<Concept> clone() const override { return std::make_unique<Model>(*this); }
            };
            std::unique_ptr<Concept> self_;
        public:
            template <class T>
                requires HasArea<T> && (!std::same_as<std::remove_cvref_t<T>, AnyShape>)
            AnyShape(T t) : self_(std::make_unique<Model<T>>(std::move(t))) {}

            AnyShape(const AnyShape& o) : self_(o.self_->clone()) {}          // deep copy, real type kept
            AnyShape(AnyShape&&) noexcept = default;
            AnyShape& operator=(AnyShape o) noexcept { self_ = std::move(o.self_); return *this; }
            ~AnyShape() = default;

            double area() const { return self_->area(); }
        };

        struct Circle { double r; double area() const { return 3.14159 * r * r; } };   // no base class!
        struct Square { double s; double area() const { return s * s; } };

        int main() {
            std::vector<AnyShape> v{Circle{1}, Square{2}};
            std::vector<AnyShape> w = v;                                   // value semantics: deep copy
            v[0] = Square{10};                                             // does not affect w
            double sum = 0;
            for (const auto& s : w) sum += s.area();
            std::cout << sum << ' ' << v[0].area() << '\n';                 // 7.14159 100
        }

      `,
      dry: { head: ['Step', 'v', 'w', 'Mechanism'], rows: [
        ['construct v', '[Model&lt;Circle&gt;, Model&lt;Square&gt;]', '—', 'templated ctor wraps each'],
        ['<code>w = v</code>', 'unchanged', '[clone, clone]', 'AnyShape copy ctor → clone()'],
        ['<code>v[0] = Square{10}</code>', '[Model&lt;Square 10&gt;, …]', 'unchanged', 'convert, then move-assign'],
        ['sum over w', '', '3.14159 + 4', H.c('g', '7.14159')]
      ] },
      complexity: `<p>One allocation per stored object, one virtual call per area(). Copy O(size of object). Small-buffer optimization (storing small T inline) removes the allocation for small types — what <code>std::function</code> implementations do.</p>`,
      followUps: ['Add small-buffer optimization for types ≤ 32 bytes.', 'Make AnyShape hold <code>std::shared_ptr&lt;const Concept&gt;</code> for cheap copies of immutable shapes (copy-on-write).', 'Compare with C++26 <code>std::polymorphic</code> and with <code>std::variant</code>.']
    }
  });

  practice.push({
    title: 'Intrusive Reference-Counted Handle (Shared Ownership by Hand)',
    level: 'Hard', tags: ['rule of five', 'reference counting', 'RAII', 'operator overloading'], companies: ['Apple', 'Microsoft', 'Unreal / Epic'],
    statement: `<p>Game engines and COM/Objective-C style APIs use <b>intrusive</b> reference counts: the object itself stores its count. Implement <code>RefCounted</code> (base with <code>addRef()</code>/<code>release()</code>, deleting itself at zero through a <b>virtual destructor</b>) and <code>RefPtr&lt;T&gt;</code>: copy = share (increment), move = steal (no count change), destructor = release, plus <code>*</code>, <code>-&gt;</code>, <code>==</code>, <code>explicit operator bool</code>, and correct self-assignment.</p>`,
    constraints: `<p>Single-threaded counts are fine; mention what changes for threads. No leaks, no double deletes, self-assignment safe (including <code>p = p</code> when p holds the last reference).</p>`,
    example: `<p><code>RefPtr&lt;Texture&gt; a = make&lt;Texture&gt;(); auto b = a;</code> → ${H.c('b', 'count 2')}. <code>auto c = std::move(a);</code> → ${H.c('b', 'count still 2')}, a is null. <code>b = nullptr-ish reset; c goes out of scope</code> → ${H.c('g', 'count 0 → ~Texture runs once')}.</p>`,
    brute: {
      why: `<p>A naive copy assignment that releases the old object <b>before</b> retaining the new one deletes the object when both sides point to the same last reference (<code>p = p</code>), then increments a dead object. Forgetting a virtual destructor in RefCounted means <code>delete this</code> inside <code>release()</code> runs only <code>~RefCounted</code>.</p>`,
      code: R`
        struct RefCounted {
            int refs = 0;
            void addRef() { ++refs; }
            void release() { if (--refs == 0) delete this; }   // BUG: ~RefCounted not virtual
            ~RefCounted() = default;
        };
        template <class T>
        struct NaiveRef {
            T* p = nullptr;
            NaiveRef& operator=(const NaiveRef& o) {
                if (p) p->release();          // if p == o.p and refs was 1: object deleted here
                p = o.p;
                if (p) p->addRef();           // ...then incremented after death: use-after-free
                return *this;
            }
        };
      `
    },
    mcq: { q: 'Safest order inside copy assignment of a ref-counted pointer?', options: ['addRef the new object first, then release the old one', 'Release the old, then addRef the new', 'Only addRef', 'Only release'], answer: 0, explain: 'Retaining first guarantees the object cannot hit zero in between, so self-assignment and "assign from an object owned only through me" are safe. (Copy-and-swap achieves the same ordering automatically.)' },
    hints: [
      `<p>Hint 1: <code>RefCounted</code> needs <code>virtual ~RefCounted()</code> because <code>release()</code> deletes through a base pointer. Make its copy operations not copy the count (a copied object starts at 0 references).</p>`,
      `<p>Hint 2: copy ctor: copy pointer, addRef. Move ctor: <code>std::exchange</code>, no count change. Destructor: release if non-null.</p>`,
      `<p>Hint 3: assignment via copy-and-swap: <code>RefPtr&amp; operator=(RefPtr o) noexcept { std::swap(p_, o.p_); return *this; }</code> — the parameter copy does the addRef, its destructor does the release of our old object.</p>`
    ],
    tests: { sig: 'int int -> int[]', fn: 'rp',
      harness: { cpp: "struct Counted : RefCounted { static inline int live = 0; Counted() { ++live; } ~Counted() override { --live; } };\nvector<int> rp(int mode, int n) { vector<int> r; int base = Counted::live;\n  if (mode == 0) { RefPtr<Counted> a = make<Counted>(); RefPtr<Counted> b = a; RefPtr<Counted> c = std::move(a); r = {c->count(), (int)(bool)a, (int)(b == c)}; RefPtr<Counted>& rc = c; c = rc; r.push_back(c->count()); b.reset(); r.push_back(c->count()); c = RefPtr<Counted>(); r.push_back(Counted::live - base); }\n  else if (mode == 1) { RefPtr<Counted> p = make<Counted>(); vector<RefPtr<Counted>> v(n, p); r.push_back(p->count()); p = RefPtr<Counted>(); r.push_back(Counted::live - base); r.push_back(n ? v[0]->count() : 0); v.clear(); r.push_back(Counted::live - base); }\n  else if (mode == 2) { RefPtr<Counted> p = make<Counted>(); RefPtr<Counted>& rp2 = p; p = rp2; r = {Counted::live - base, p->count()}; }\n  else { Counted* raw = new Counted; RefPtr<Counted> a(raw); RefPtr<Counted> b(raw); r.push_back(raw->count()); a.reset(); r.push_back(Counted::live - base); r.push_back(raw->count()); b.reset(); r.push_back(Counted::live - base); }\n  r.push_back(Counted::live - base); return r; }" }, cases: [
      [[0,0], [2,0,1,2,1,0,0]],
      [[1,5], [6,1,5,0,0]],
      [[1,1], [2,1,1,0,0]],
      [[1,0], [1,0,0,0,0]],
      [[1,1000], [1001,1,1000,0,0]],
      [[2,0], [1,1,0]],
      [[3,0], [2,1,1,0,0]]
    ] },
    solution: {
      approach: `<p>The count lives in the object (no separate control block → one allocation, and a raw <code>T*</code> can be re-wrapped safely). RefPtr is a Rule-of-Five handle: copy increments, move transfers, destruction decrements, and copy-and-swap orders increment-before-decrement. For multi-threading use <code>std::atomic&lt;int&gt;</code> with <code>fetch_add(relaxed)</code> and <code>fetch_sub(acq_rel)</code>.</p>`,
      code: R`
        #include <iostream>
        #include <string>
        #include <utility>

        class RefCounted {
            mutable int refs_ = 0;
        public:
            RefCounted() = default;
            RefCounted(const RefCounted&) : refs_(0) {}              // a copy is a NEW object: 0 refs
            RefCounted& operator=(const RefCounted&) { return *this; }   // never copy the count
            virtual ~RefCounted() = default;                         // release() deletes through this base
            void addRef() const { ++refs_; }
            void release() const { if (--refs_ == 0) delete this; }
            int count() const { return refs_; }
        };

        template <class T>
        class RefPtr {
            T* p_ = nullptr;
        public:
            RefPtr() = default;
            explicit RefPtr(T* p) : p_(p) { if (p_) p_->addRef(); }
            RefPtr(const RefPtr& o) : p_(o.p_) { if (p_) p_->addRef(); }              // share
            RefPtr(RefPtr&& o) noexcept : p_(std::exchange(o.p_, nullptr)) {}       // steal: count unchanged
            RefPtr& operator=(RefPtr o) noexcept { std::swap(p_, o.p_); return *this; }   // addRef (in o) before release (o dies)
            ~RefPtr() { if (p_) p_->release(); }

            T& operator*() const { return *p_; }
            T* operator->() const { return p_; }
            explicit operator bool() const { return p_ != nullptr; }
            bool operator==(const RefPtr&) const = default;          // same object?
            void reset() { RefPtr().swap(*this); }
            void swap(RefPtr& o) noexcept { std::swap(p_, o.p_); }
        };

        template <class T, class... A>
        RefPtr<T> make(A&&... a) { return RefPtr<T>(new T(std::forward<A>(a)...)); }

        struct Texture : RefCounted {
            std::string name;
            explicit Texture(std::string n) : name(std::move(n)) {}
            ~Texture() override { std::cout << "~Texture " << name << '\n'; }
        };

        int main() {
            RefPtr<Texture> a = make<Texture>("grass");
            RefPtr<Texture> b = a;                                    // 2
            RefPtr<Texture> c = std::move(a);                         // still 2, a null
            std::cout << c->count() << ' ' << static_cast<bool>(a) << ' ' << (b == c) << '\n';   // 2 0 1
            c = c;                                                    // self-assignment: safe
            b.reset();                                                // 1
            std::cout << c->count() << '\n';                          // 1
        }

      `,
      dry: { head: ['Statement', 'a', 'b', 'c', 'refs'], rows: [
        ['<code>a = make("grass")</code>', 'T', '—', '—', '1'],
        ['<code>b = a</code>', 'T', 'T', '—', '2'],
        ['<code>c = std::move(a)</code>', 'null', 'T', 'T', '2'],
        ['<code>c = c</code>', 'null', 'T', 'T', '2 → 3 (param) → 2'],
        ['<code>b.reset()</code>', 'null', 'null', 'T', '1'],
        ['end of main', '', '', 'released', H.c('g', '0 → ~Texture')]
      ] },
      complexity: `<p>All operations O(1). Memory: one int inside the object, one pointer per handle. Atomic counts cost ~5–20 ns per increment under contention — a reason to pass <code>const RefPtr&amp;</code> rather than by value in hot paths.</p>`,
      followUps: ['Make the count atomic and justify the memory orders.', 'How do you break reference cycles without weak_ptr? (non-owning raw back-pointers / weak references with a separate counter)', 'Compare with <code>std::shared_ptr</code> + <code>enable_shared_from_this</code>.']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: 'Which special member runs for <code>Widget b = a;</code> where <code>a</code> is an existing Widget?', options: ['Copy constructor', 'Copy assignment operator', 'Default constructor then copy assignment', 'Move constructor'], answer: 0, explain: '<code>b</code> is being declared, so it is born here: initialization, i.e. the copy constructor. The <code>=</code> in a declaration is not assignment. It is not a move because <code>a</code> is an lvalue.' },
    { q: 'A class has a raw owning pointer, a destructor that deletes it, and nothing else. What happens on <code>T b = a;</code> followed by both going out of scope?', options: ['Double delete: both objects free the same block (undefined behaviour)', 'A deep copy is made automatically', 'Compile error: copy constructor missing', 'Memory leak only'], answer: 0, explain: 'The implicit copy constructor copies the pointer value (shallow copy). Both destructors then delete the same address. This is exactly why the Rule of Three exists.' },
    { q: 'You add <code>~Order() { log(); }</code> to a class that previously declared no special members. What happens to <code>Order o2 = std::move(o1);</code>?', options: ['It now copies, because a user-declared destructor suppresses the implicit move constructor', 'It still moves', 'It fails to compile', 'It moves but logs twice'], answer: 0, explain: 'A user-declared destructor prevents implicit move operations from being declared. The rvalue then binds to the (deprecated but still generated) copy constructor — silently slower.' },
    { q: 'Why should a move constructor be marked <code>noexcept</code>?', options: ['So std::vector uses it (via move_if_noexcept) when reallocating; otherwise vector copies to keep the strong guarantee', 'Because the compiler requires it', 'To make it inline', 'So it can be called from destructors'], answer: 0, explain: 'If moving could throw half-way through relocation, the old elements could not be restored, so vector falls back to copying unless the move is noexcept (or the type is move-only).' },
    { q: 'On a typical 64-bit Linux system, what is <code>sizeof</code> of <code>struct S { virtual void f(); virtual void g(); int x; };</code>?', options: ['16', '8', '24', '4'], answer: 0, explain: 'One vptr (8 bytes) regardless of how many virtual functions exist, plus int x (4) and 4 bytes of padding for 8-byte alignment = 16.' },
    { q: '<code>Base* p = new Derived; p-&gt;f();</code> where <code>f</code> is <b>non-virtual</b> in Base and redefined in Derived. Which runs?', options: ['Base::f — non-virtual calls bind to the static type', 'Derived::f', 'Both', 'Undefined behaviour'], answer: 0, explain: 'Without virtual there is no vtable lookup; the compiler uses the declared type Base*. Derived::f only hides Base::f for calls made through a Derived.' },
    { q: 'What makes a class abstract?', options: ['It has at least one pure virtual function whose final overrider is still pure', 'It has a protected constructor', 'It has no data members', 'It is declared with the abstract keyword'], answer: 0, explain: 'C++ has no abstract keyword. A class with any unresolved pure virtual function (= 0), declared or inherited, cannot be instantiated.' },
    { q: 'A pure virtual destructor <code>virtual ~Base() = 0;</code> is declared but never defined. What happens when you build a program that creates a Derived?', options: ['Linker error: every derived destructor calls ~Base, so it must be defined', 'It works fine', 'Runtime crash "pure virtual method called"', 'Compile error at the declaration'], answer: 0, explain: 'Unlike other pure virtuals, a pure virtual destructor is always called (by derived destructors), so it needs a definition such as <code>Base::~Base() = default;</code>.' },
    { q: '<code>Base* p = new Derived; delete p;</code> where <code>~Base()</code> is not virtual and Derived owns a std::vector. Result?', options: ['Undefined behaviour; in practice only ~Base runs and the vector leaks', '~Derived then ~Base run normally', 'Compile error', 'Only ~Derived runs'], answer: 0, explain: 'delete through a base pointer requires a virtual destructor in the base. Otherwise the call binds to ~Base statically: derived destructors and members never run.' },
    { q: 'Inside <code>Base</code>\'s constructor, a call to the virtual <code>init()</code> on an object being constructed as <code>Derived</code> runs…', options: ['Base::init — the vptr points to Base\'s vtable during Base construction', 'Derived::init', 'Nothing — virtual calls are ignored in constructors', 'It is always a compile error'], answer: 0, explain: 'During construction the object is treated as a Base; the Derived part does not exist yet. (If init is pure in Base, you get "pure virtual method called".)' },
    { q: 'Which line slices?', options: ['<code>std::vector&lt;Animal&gt; v; v.push_back(Dog{});</code>', '<code>const Animal&amp; r = dog;</code>', '<code>std::unique_ptr&lt;Animal&gt; p = std::make_unique&lt;Dog&gt;();</code>', '<code>Animal* p = &amp;dog;</code>'], answer: 0, explain: 'The vector stores Animal objects, so pushing a Dog copy-constructs an Animal from it, discarding the Dog part. References and pointers refer to the whole object.' },
    { q: 'Why is <code>operator&lt;&lt;</code> for printing a custom type written as a non-member?', options: ['Its left operand is std::ostream, a class you cannot add members to', 'Members cannot return references', 'Non-members are faster', 'The standard forbids member operator&lt;&lt;'], answer: 0, explain: 'A member operator takes the class as its LEFT operand. For <code>cout &lt;&lt; x</code> the left operand is the stream, so it must be a free function (often a hidden friend).' },
    { q: 'In C++20, which declaration(s) give a struct all of <code>== != &lt; &lt;= &gt; &gt;=</code>?', options: ['<code>auto operator&lt;=&gt;(const T&amp;) const = default;</code> alone (a defaulted &lt;=&gt; also implicitly declares a defaulted ==)', 'Only writing all six by hand', '<code>bool operator&lt;(const T&amp;) const;</code> alone', '<code>bool operator==(const T&amp;) const = default;</code> alone'], answer: 0, explain: 'A defaulted three-way comparison provides the four relational operators via rewriting and implicitly declares a defaulted ==, from which != is rewritten. Defaulted == alone gives only == and !=.' },
    { q: 'What is the difference between <code>T&amp; operator++()</code> and <code>T operator++(int)</code>?', options: ['The first is prefix (returns the incremented object); the second is postfix (dummy int, returns the old value as a copy)', 'They are identical', 'The int parameter is the increment amount', 'The second is prefix'], answer: 0, explain: 'The unused int parameter only distinguishes postfix. Postfix must copy the old value, which is why ++it is preferred for non-trivial iterators.' }
  );

  /* ======================================================================
     INTERVIEW Q&A
     ====================================================================== */
  interview.push(
    { q: 'What is the difference between the copy constructor and the copy assignment operator? When is each called?', level: 'B',
      a: `<p>The <b>copy constructor</b> <code>T(const T&amp;)</code> creates a <b>new</b> object from an existing one: <code>T b = a;</code>, <code>T b(a);</code>, passing by value, returning by value when not elided, catching by value, container copies. The <b>copy assignment operator</b> <code>T&amp; operator=(const T&amp;)</code> overwrites an object that <b>already exists</b>: <code>b = a;</code>. Because the target already holds state, assignment must release or reuse the old resources and must survive self-assignment; the constructor has nothing old to clean up. My quick test: "is the left side being declared on this line?" — yes means constructor, even if there is an <code>=</code> sign.</p>`,
      followUps: ['Why does the copy constructor take its parameter by const reference?', 'Why does operator= return T&amp; and not void?', 'Does <code>T b = T();</code> call the copy constructor in C++17?'] },
    { q: 'Explain shallow copy vs deep copy. When is a shallow copy correct?', level: 'B',
      a: `<p>A <b>shallow copy</b> copies member values as they are; for a pointer that means copying the <b>address</b>, so both objects refer to the same heap block. A <b>deep copy</b> allocates new storage and copies the <b>pointed-to contents</b>, giving two independent objects. Shallow copies of <b>owning</b> pointers cause aliasing, dangling pointers and double frees. A shallow copy is correct when the pointer is <b>non-owning</b> (an observer like a parent link or <code>string_view</code>) or when sharing is the intended semantics and ownership is tracked (<code>shared_ptr</code>, copy-on-write with a reference count). The key question is always "who deletes this?"</p>`,
      followUps: ['How would you deep-copy a linked list with random pointers?', 'Why did C++11 effectively forbid copy-on-write std::string?', 'How do you deep-copy through a base pointer?'] },
    { q: 'State the Rule of Three, Rule of Five and Rule of Zero. Which one do you follow by default?', level: 'I',
      a: `<p><b>Rule of Three:</b> if a class needs a user-defined destructor, copy constructor or copy assignment, it almost certainly needs all three, because it manages a resource manually. <b>Rule of Five:</b> since C++11 add the move constructor and move assignment; declaring any of destructor/copy operations suppresses the implicit moves, so moves silently become copies. <b>Rule of Zero:</b> design classes so they need none of them, by composing members that already manage themselves (<code>std::string</code>, <code>std::vector</code>, <code>std::unique_ptr</code> with a custom deleter). I default to Rule of Zero; only small dedicated RAII wrappers implement the five, and if I declare one special member I explicitly declare all five with <code>= default</code>/<code>= delete</code>.</p>`,
      followUps: ['What exactly suppresses the implicit move constructor?', 'Is <code>~T() = default;</code> user-declared? Does it suppress moves?', 'Show a move-only resource wrapper.'] },
    { q: 'What does std::move actually do? What state is a moved-from object in?', level: 'I',
      a: `<p><code>std::move</code> does not move anything: it is an unconditional <b>cast to an rvalue reference</b> (<code>static_cast&lt;T&amp;&amp;&gt;</code>). It enables overload resolution to pick a move constructor or move assignment, which then performs the actual transfer, typically by stealing pointers and nulling the source. A moved-from standard library object is in a <b>valid but unspecified</b> state: you may destroy it, assign to it, or call functions without preconditions (like <code>clear()</code> or <code>size()</code>), but must not rely on its value. Your own types must at least keep the moved-from object destructible and assignable. Moving from a <code>const</code> object silently copies, because <code>const T&amp;&amp;</code> binds to the copy constructor.</p>`,
      followUps: ['Why does <code>return std::move(local);</code> hurt performance?', 'What happens with <code>std::move</code> on a const object?', 'What is std::forward for?'] },
    { q: 'Why must move constructors usually be noexcept? What happens if they are not?', level: 'I',
      a: `<p>Containers like <code>std::vector</code> promise the <b>strong exception guarantee</b> for operations such as <code>push_back</code>: if an exception is thrown, the container is unchanged. During reallocation, if element moves could throw half-way, some old elements would already be gutted and could not be restored. So vector uses <code>std::move_if_noexcept</code>: it moves only when the move constructor is <code>noexcept</code> (or the type is not copyable), otherwise it <b>copies</b>. A missing <code>noexcept</code> therefore turns every reallocation into deep copies. Defaulted moves are noexcept if all members' moves are; I check with <code>static_assert(std::is_nothrow_move_constructible_v&lt;T&gt;)</code>.</p>`,
      followUps: ['What happens if a noexcept function throws?', 'Do std::list or std::deque care about noexcept moves?', 'How do you make a defaulted move noexcept explicitly?'] },
    { q: 'Explain how virtual functions are implemented (vtable and vptr). What does a virtual call cost?', level: 'I',
      a: `<p>For each polymorphic class the compiler emits one <b>vtable</b>: a static array of function pointers (plus, in the Itanium ABI, offset-to-top and RTTI pointers before it). Derived classes copy the base layout, overwrite slots they override and append new virtuals. Every object gets a hidden <b>vptr</b> pointing to its class's vtable, set by each constructor in the chain. A call <code>p-&gt;f()</code> compiles to: load vptr from <code>*p</code>, load the function pointer at <code>f</code>'s fixed slot, indirect call with <code>this = p</code>. Cost: 8 bytes per object, one table per class, two dependent loads and an indirect branch per call; the bigger cost is lost inlining. Compilers devirtualize when the dynamic type is provable (<code>final</code>, local objects, LTO).</p>`,
      followUps: ['How many vptrs does an object with two polymorphic bases have?', 'What is a thunk?', 'Why does the vptr change during construction?'] },
    { q: 'What is the difference between overriding, overloading and hiding? What do override and final do?', level: 'I',
      a: `<p><b>Overloading</b>: same name, different parameters, same scope, resolved at compile time. <b>Overriding</b>: a derived class provides a function with the same signature (including const and ref-qualifiers) as a base <b>virtual</b> function; calls through base references dispatch to it at runtime. <b>Hiding</b>: a derived class declares any function with the same name, which hides <b>all</b> base functions of that name (even other overloads, and even if they are virtual) for lookups through the derived type; fix with <code>using Base::f;</code>. <code>override</code> makes the compiler verify that the function really overrides something (catches missing const, typos). <code>final</code> forbids further overriding or derivation and lets the compiler devirtualize calls.</p>`,
      followUps: ['Can a virtual function be overloaded in the derived class without hiding?', 'Which warning flags catch hidden virtuals?', 'Are default arguments of virtual functions dynamic?'] },
    { q: 'What is an abstract class? Can it have constructors and data members? Can a pure virtual function have a body?', level: 'I',
      a: `<p>A class is <b>abstract</b> if it has at least one pure virtual function (<code>= 0</code>) whose final overrider is still pure. You cannot create objects of it, but you can use pointers and references to it — that is its purpose as an interface or partial implementation. It <b>can</b> have constructors (called by derived constructors), data members, and non-virtual or virtual functions with bodies. A pure virtual function <b>can</b> have a definition: derived classes must still override it, but may call <code>Base::f()</code> explicitly. A pure virtual <b>destructor must</b> be defined because every derived destructor calls it. Calling a pure virtual during base construction reaches <code>__cxa_pure_virtual</code> and aborts with "pure virtual method called".</p>`,
      followUps: ['How do you build an interface in C++?', 'What is the NVI idiom?', 'Abstract class vs C++20 concept — when to use which?'] },
    { q: 'Why should a base class destructor be virtual? When should it not be?', level: 'B',
      a: `<p>If code deletes a derived object through a base pointer (<code>delete basePtr</code>, or <code>std::unique_ptr&lt;Base&gt;</code>), the destructor call is dispatched by the <b>static</b> type unless it is virtual. With a non-virtual base destructor only <code>~Base</code> runs: the derived destructor and its members' destructors are skipped — formally undefined behaviour, in practice leaks and sometimes heap corruption (wrong size passed to sized delete, wrong address with multiple inheritance). Guideline C.35: a base class destructor should be <b>public and virtual</b> or <b>protected and non-virtual</b>. Classes not designed as polymorphic bases (value types, <code>final</code> classes, CRTP mixins) should not have a virtual destructor, which would add a vptr and prevent triviality.</p>`,
      followUps: ['Does shared_ptr&lt;Base&gt;(new Derived) leak without a virtual destructor?', 'What is the deleting destructor?', 'Should you inherit from std::vector?'] },
    { q: 'In what order are constructors and destructors called in an inheritance hierarchy with members? What about virtual calls inside them?', level: 'I',
      a: `<p>Construction: virtual bases first, then direct bases in declaration order, then non-static members in <b>declaration</b> order (not initializer-list order), then the constructor body. Destruction is the exact reverse: body, members in reverse order, bases in reverse order. During each constructor and destructor the object's dynamic type is the class currently being constructed or destroyed: the vptr points to that class's vtable, so virtual calls resolve to that class's version, never to a more-derived override (unlike Java and C#). If a constructor throws, already-constructed members and bases are destroyed, but that class's own destructor is not called.</p>`,
      followUps: ['What does -Wreorder warn about?', 'Why are virtual calls in constructors dangerous in Java but not C++?', 'How does two-phase initialization work?'] },
    { q: 'What is object slicing? Give the common sources and the fixes.', level: 'I',
      a: `<p>Slicing happens when a derived object is copied or moved into an object of base type: only the base sub-object is copied, the derived members are discarded, and the new object is a genuine base (its vptr points to the base vtable), so virtual calls run base versions. Sources: by-value parameters/returns of base type, <code>std::vector&lt;Base&gt;</code>, catching exceptions by value, and assignment through a base reference (partial assignment that mixes two objects). Fixes: pass and store polymorphic objects by reference or smart pointer, <code>catch (const E&amp;)</code>, make bases abstract or give them protected/deleted copy operations, and use a virtual <code>clone()</code> or type erasure when real copies are needed.</p>`,
      followUps: ['Why can\'t you static_cast a sliced object back to Derived?', 'How does catch-by-value interact with rethrow?', 'How does C++26 std::polymorphic help?'] },
    { q: 'How do you choose between member and non-member operator overloads? Write the canonical forms.', level: 'I',
      a: `<p>Must be members: <code>=</code>, <code>[]</code>, <code>()</code>, <code>-&gt;</code>, conversions. Should be members: compound assignments (<code>+=</code>) and <code>++</code>/<code>--</code>, which modify <code>*this</code> and return <code>T&amp;</code>. Should be non-members (ideally hidden friends): symmetric binary operators, so implicit conversions apply to both operands (<code>2 * v</code>), and stream operators, whose left operand is the stream. Canonical: <code>T&amp; operator+=(const T&amp;)</code>; <code>friend T operator+(T a, const T&amp; b) { return a += b; }</code>; <code>T&amp; operator++()</code> and <code>T operator++(int)</code>; <code>friend std::ostream&amp; operator&lt;&lt;(std::ostream&amp;, const T&amp;)</code>; in C++20, <code>bool operator==(const T&amp;) const = default;</code> and <code>auto operator&lt;=&gt;(const T&amp;) const = default;</code>.</p>`,
      followUps: ['What are hidden friends and why are they preferred?', 'Which operators should never be overloaded?', 'Why make operator bool explicit?'] },
    { q: 'Explain C++20 operator&lt;=&gt; and comparison rewriting. When would you write it by hand?', level: 'A',
      a: `<p>The three-way comparison <code>a &lt;=&gt; b</code> returns an ordering category: <code>std::strong_ordering</code>, <code>std::weak_ordering</code> or <code>std::partial_ordering</code>. The compiler <b>rewrites</b> <code>a &lt; b</code> as <code>(a &lt;=&gt; b) &lt; 0</code> (also trying reversed operands), and <code>a != b</code> as <code>!(a == b)</code>. A defaulted <code>&lt;=&gt;</code> compares bases then members lexicographically in declaration order and implicitly declares a defaulted <code>==</code>; the result category is the weakest among members (doubles give partial_ordering). <code>==</code> is kept separate for efficiency (equality can short-circuit, e.g. on string length). I write it by hand for non-memberwise orders: case-insensitive names (weak_ordering), fractions compared by cross-multiplication, or ignoring cache fields — and then I also write a consistent <code>==</code>.</p>`,
      followUps: ['What breaks if a comparator is not a strict weak ordering?', 'Why does a user-written &lt;=&gt; not generate ==?', 'How do doubles with NaN affect defaulted &lt;=&gt;?'] },
    { q: 'Implement a copy assignment operator that is exception-safe and self-assignment safe. Compare approaches.', level: 'A',
      a: `<p>Option 1, <b>allocate-then-release</b>: allocate and copy into a temporary pointer first, then delete the old resource and adopt the new one. If allocation or copying throws, <code>*this</code> is unchanged (strong guarantee), and self-assignment works because the source is read before anything is freed. Option 2, <b>copy-and-swap</b>: <code>T&amp; operator=(T other) noexcept { swap(*this, other); return *this; }</code> — the copy (or move) happens in the parameter; the body cannot throw; the old state dies with <code>other</code>. It unifies copy and move assignment. Trade-off: copy-and-swap always allocates, even when the existing buffer is big enough, and does a wasted full copy on self-assignment; high-performance containers reuse capacity and offer only the basic guarantee for copy assignment. I state which guarantee I chose.</p>`,
      followUps: ['What are the basic, strong and nothrow guarantees?', 'Why is the self-assignment check alone not enough for exception safety?', 'How does std::vector implement operator=?'] },
    { q: 'How would you copy a polymorphic object when all you have is a Base reference? Discuss clone, type erasure and variants.', level: 'E',
      a: `<p>The copier does not know the dynamic type, so the object must copy itself: a virtual <b><code>clone()</code></b> returning <code>std::unique_ptr&lt;Base&gt;</code>, implemented in each class (or once via a CRTP helper <code>Cloneable&lt;Derived, Base&gt;</code>) by calling Derived's copy constructor. For value semantics without user-visible inheritance, use <b>type erasure</b>: a handle holding <code>unique_ptr&lt;Concept&gt;</code> where a templated <code>Model&lt;T&gt;</code> implements virtual <code>clone</code>; copying the handle deep-copies; types need no common base (Sean Parent's pattern, like <code>std::function</code>). If the set of types is closed, <b><code>std::variant</code></b> gives value semantics, no heap allocation, and copying for free, at the cost of editing the variant to add types. C++26 adds <code>std::polymorphic&lt;T&gt;</code>, a standard deep-copying owning wrapper. I choose by: open vs closed set of types, need for value semantics, and allocation/latency budgets.</p>`,
      followUps: ['Why can\'t unique_ptr&lt;Derived&gt; be a covariant return type?', 'What is small-buffer optimization in type erasure?', 'How would you serialize such a hierarchy?'] }
  );

  registerModule({
    id: 'cpp05',
    title: 'Advanced OOP: Rule of 3/5/0, Virtual & Operators',
    intro: `<p>This module is where C++ objects stop being "structs with functions" and become things with a <b>lifetime</b>, an <b>owner</b> and a <b>dynamic type</b>. You will learn exactly which special member function runs on every line of code (copy constructor, copy assignment, move operations, destructor), why a class with a raw pointer crashes with a <b>double free</b> the moment it is copied, and how the <b>Rule of 3 / 5 / 0</b> prevents it — ideally by writing no special members at all.</p>
      <p>Then we open the hood of runtime polymorphism: the <b>vptr</b> inside every object, the <b>vtable</b> per class, how <code>p-&gt;area()</code> becomes "load, load, call", why abstract classes cannot be created, why base destructors must be virtual, why virtual calls in constructors do not reach the derived class, and how <b>object slicing</b> silently turns a Dog into a plain Animal. Finally, <b>operator overloading</b> — member vs free, canonical signatures, and the C++20 spaceship operator — lets your types feel built-in.</p>
      <p>Every topic has an interactive visualizer (watch objects being born and destroyed on a stack, pointers sharing a heap block, a call travelling through the vtable, bytes being sliced off), "predict the output" puzzles, bug hunts, and interview-style problems. These are some of the most frequently asked C++ interview topics at every level.</p>`,
    goals: [
      'Name, for any line of code, which special member runs (copy/move constructor, copy/move assignment, destructor) and in what order objects are destroyed',
      'Spot shallow-copy bugs (aliasing, dangling pointers, double free) and fix them with deep copies, the Rule of Five, or — preferably — the Rule of Zero',
      'Write correct, exception-safe Rule-of-Five classes with noexcept moves and copy-and-swap, and explain the implicit-generation rules',
      'Draw object → vptr → vtable → function for a hierarchy and predict which function a call runs, including non-virtual, hidden and default-argument cases',
      'Design interfaces with pure virtual functions and abstract classes, and always give polymorphic bases a correct destructor',
      'Recognise and prevent object slicing, and copy polymorphic objects with clone() or type erasure',
      'Overload operators idiomatically (member vs hidden friend, canonical return types, C++20 defaulted == and &lt;=&gt;)'
    ],
    prereqs: `<p>C++ 3 (Pointers &amp; References) and C++ 4 (OOP Basics: classes, constructors, destructors, initializer lists, inheritance). Comfort with <code>new</code>/<code>delete</code> and references helps; smart pointers are introduced lightly here and covered fully in C++ 6 (Memory Management, RAII &amp; Smart Pointers).</p>`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
