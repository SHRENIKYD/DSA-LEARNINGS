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

registerModule({ id: 'cpp05', title: 'Advanced OOP', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
