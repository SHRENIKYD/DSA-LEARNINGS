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
        solution: {
          approach: `<p>Write the <b>Rule of Three</b>: destructor (already there), deep copy constructor, deep copy assignment. The assignment uses "allocate-copy-then-release", which is both self-assignment safe and strongly exception safe. Alternative: copy-and-swap (take the parameter by value, swap members) gives the same guarantees in 3 lines.</p>`,
          code: R`
            #include <algorithm>
            #include <cstddef>
            #include <utility>
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

registerModule({ id: 'cpp09', title: 'Templates, SFINAE & Concepts', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
