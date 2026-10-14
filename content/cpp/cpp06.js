(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw;   // C++ code is written with String.raw so "\n" stays a C++ escape

  /* ---------------- shared little helpers for the visualizers ---------------- */
  function one(k, cls) { var h = {}; h[k] = cls; return h; }
  function note(html, label) { return { type: 'text', label: label || 'What is going on', html: html }; }
  function out(lines) {
    return { type: 'text', label: 'Console output', html: lines && lines.length ? '<code>' + lines.map(function (s) { return H.esc(String(s)); }).join('<br>') + '</code>' : '<span class="c-m">(nothing printed yet)</span>' };
  }
  function splitOps(input, def) {
    var s = String(input === undefined || input === null ? def : input).trim();
    if (!s) throw new Error('Type some steps separated by ";" — e.g. ' + def);
    var ops = s.split(/\s*;\s*|\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (ops.length > 24) throw new Error('Use at most 24 steps');
    return ops;
  }
  function okName(n) {
    if (!/^[A-Za-z_][A-Za-z0-9_]{0,9}$/.test(n || '')) throw new Error('Names must be short identifiers like a, b, box1 (got "' + n + '")');
    return n;
  }
  /* A two-column memory picture: stack boxes on the left, heap boxes on the right. */
  function memGraph(label, stackBoxes, heapBoxes, edges, hl, ehl, tags) {
    var nodes = [], rows = Math.max(stackBoxes.length, heapBoxes.length, 4);
    var height = Math.max(50, rows * 11 + 14);
    nodes.push({ id: '__S', label: 'STACK (auto)', x: 18, y: 4, shape: 'box', w: 26 });
    nodes.push({ id: '__H', label: 'HEAP (free store)', x: 78, y: 4, shape: 'box', w: 30 });
    stackBoxes.forEach(function (b, i) { nodes.push({ id: b.id, label: b.label, x: 18, y: 16 + i * 11, shape: 'box', w: 30 }); });
    heapBoxes.forEach(function (b, i) { nodes.push({ id: b.id, label: b.label, x: 78, y: 16 + i * 11, shape: 'box', w: 30 }); });
    return { type: 'graph', label: label, directed: true, height: height, nodes: nodes, edges: edges || [], hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
  }

  /* ======================================================================
     TOPIC 1 — Stack vs Heap
     ====================================================================== */
  function stackHeapSim(input) {
    var DEF = 'call main; local a; new p Box; call make; new q Node; ret q; call helper; new t Buf; ret; delete p; delete q; ret';
    var ops = splitOps(input, DEF);
    var frames = [], fstack = [], blocks = [], blockSeq = 0, leaked = 0, freed = 0, out = [];
    function cur() { if (!fstack.length) throw new Error('Start with "call main" — there is no function running yet'); return fstack[fstack.length - 1]; }
    function findLocal(name) {
      var f = cur();
      for (var i = 0; i < f.locals.length; i++) if (f.locals[i].name === name) return f.locals[i];
      throw new Error('No local named "' + name + '" in ' + f.name + '()');
    }
    function picture(hlS, hlH, ehl, extraTags) {
      var sb = [], hb = [], edges = [], hl = {}, tags = {};
      fstack.forEach(function (f, fi) {
        sb.push({ id: 'F' + f.id, label: f.name + '() frame' });
        tags['F' + f.id] = fi === fstack.length - 1 ? 'running' : 'waiting';
        f.locals.forEach(function (l) {
          var id = 'L' + f.id + '_' + l.name;
          sb.push({ id: id, label: l.kind === 'ptr' ? l.type + '* ' + l.name : 'int ' + l.name + ' = ' + l.val });
          if (l.kind === 'ptr' && l.target !== null) {
            var b = blocks.filter(function (x) { return x.id === l.target; })[0];
            if (b && b.state === 'live') edges.push([id, 'B' + b.id]);
            else tags[id] = 'dangling!';
          }
        });
      });
      blocks.forEach(function (b) {
        hb.push({ id: 'B' + b.id, label: b.type + ' #' + b.id + ' (' + b.bytes + ' B)' });
        if (b.state === 'leaked') { hl['B' + b.id] = 'bad'; tags['B' + b.id] = 'LEAKED'; }
        if (b.state === 'freed') { hl['B' + b.id] = 'done'; tags['B' + b.id] = 'freed'; }
      });
      Object.keys(hlS || {}).forEach(function (k) { hl[k] = hlS[k]; });
      Object.keys(hlH || {}).forEach(function (k) { hl[k] = hlH[k]; });
      Object.keys(extraTags || {}).forEach(function (k) { tags[k] = extraTags[k]; });
      var live = blocks.filter(function (b) { return b.state === 'live'; }).length;
      return [
        memGraph('Left = stack frames & locals (auto). Right = heap blocks (new/delete). Arrow = "this pointer holds that address".', sb, hb, edges, hl, ehl, tags),
        { type: 'vars', label: 'Memory scoreboard', vals: { 'stack frames': fstack.length, 'live heap blocks': live, 'freed blocks': freed, 'LEAKED blocks': leaked }, hl: leaked ? { 'LEAKED blocks': 'bad' } : {} }
      ];
    }
    function cleanFreed() { blocks = blocks.filter(function (b) { return b.state !== 'freed'; }); }
    frames.push({ narr: 'Two memory areas. The <b>stack</b> holds each running function\'s local variables and is cleaned up automatically when the function returns. The <b>heap</b> holds things you create with <code>new</code>; they live until somebody calls <code>delete</code>. Steps: <code>' + H.esc(ops.join('; ')) + '</code>', parts: picture() });
    ops.forEach(function (op) {
      var w = op.split(/\s+/), cmd = w[0].toLowerCase();
      cleanFreed();
      if (cmd === 'call') {
        var nm = okName(w[1] || 'f');
        if (fstack.length >= 6) throw new Error('Keep the call depth at 6 or less');
        fstack.push({ id: frames.length, name: nm, locals: [] });
        frames.push({ narr: '<code>' + H.esc(nm) + '()</code> is called → a new <b>stack frame</b> is pushed. Pushing is just moving the stack pointer by a few bytes — that is why stack allocation is almost free.', parts: picture(one('F' + cur().id, 'cur')) });
      } else if (cmd === 'local') {
        var ln = okName(w[1]), f = cur();
        if (f.locals.length >= 5) throw new Error('At most 5 locals per frame in this demo');
        f.locals.push({ name: ln, kind: 'int', val: f.locals.length * 7 + 5 });
        frames.push({ narr: '<code>int ' + H.esc(ln) + '</code> lives <b>inside the frame</b> of ' + H.esc(f.name) + '(). No <code>new</code>, no <code>delete</code> — it disappears automatically when ' + H.esc(f.name) + '() returns.', parts: picture(one('L' + f.id + '_' + ln, 'ok')) });
      } else if (cmd === 'new') {
        var pn = okName(w[1]), ty = okName(w[2] || 'Obj'), f2 = cur();
        if (blocks.length >= 7) throw new Error('At most 7 heap blocks in this demo');
        blockSeq++;
        var bytes = { Box: 24, Node: 16, Buf: 4096, Obj: 32 }[ty] || 40;
        blocks.push({ id: blockSeq, type: ty, bytes: bytes, state: 'live' });
        var existing = f2.locals.filter(function (x) { return x.name === pn; })[0], overwrote = null;
        if (existing) {
          if (existing.kind !== 'ptr') throw new Error('"' + pn + '" is already an int local — pick another pointer name');
          var oldB = blocks.filter(function (x) { return x.id === existing.target && x.state === 'live'; })[0];
          existing.target = blockSeq; existing.type = ty;
          if (oldB && !fstack.some(function (f) { return f.locals.some(function (x) { return x.kind === 'ptr' && x.target === oldB.id; }); })) { oldB.state = 'leaked'; leaked++; overwrote = oldB; }
          frames.push({ narr: '<code>' + H.esc(pn) + ' = new ' + ty + '();</code> re-points an existing pointer.' + (overwrote ? ' <span class="c-r"><b>LEAK:</b> ' + overwrote.type + ' #' + overwrote.id + ' was only reachable through ' + H.esc(pn) + '. Overwriting the only pointer to a block loses it forever.</span>' : ' The old block was already freed (or is held elsewhere), so nothing is lost.'), parts: picture(one('B' + blockSeq, 'ok'), one('L' + f2.id + '_' + pn, 'cur')) });
          return;
        }
        f2.locals.push({ name: pn, kind: 'ptr', type: ty, target: blockSeq });
        frames.push({ narr: '<code>' + ty + '* ' + H.esc(pn) + ' = new ' + ty + '();</code> Two things happen: a <b>heap block</b> (' + bytes + ' bytes) is carved out by the allocator (slow-ish: it must find a free hole), and a small <b>pointer variable</b> ' + H.esc(pn) + ' (8 bytes) is put on the <b>stack</b>. The pointer is the only way back to the block.', parts: picture(one('B' + blockSeq, 'ok'), one('L' + f2.id + '_' + pn, 'cur'), one('L' + f2.id + '_' + pn + '-B' + blockSeq, 'ok')) });
      } else if (cmd === 'delete') {
        var l = findLocal(okName(w[1]));
        if (l.kind !== 'ptr') throw new Error('"' + l.name + '" is an int, not a pointer — you can only delete pointers');
        var b = blocks.filter(function (x) { return x.id === l.target; })[0];
        if (!b || b.state !== 'live') {
          frames.push({ narr: '<span class="c-r"><b>Double delete / use-after-free!</b></span> <code>delete ' + H.esc(l.name) + '</code> but that block is already gone. This is <b>undefined behavior</b> — it may crash now, later, or silently corrupt the allocator. Fix: set the pointer to <code>nullptr</code> after delete (deleting nullptr is a safe no-op) — or better, use a smart pointer.', parts: picture(one('L' + cur().id + '_' + l.name, 'bad')) });
        } else {
          b.state = 'freed'; freed++;
          frames.push({ narr: '<code>delete ' + H.esc(l.name) + ';</code> runs the destructor of ' + b.type + ' #' + b.id + ' and hands its bytes back to the allocator. Notice: the pointer variable <b>' + H.esc(l.name) + '</b> still exists and still holds the old address — it is now <b>dangling</b>. Touching <code>*' + H.esc(l.name) + '</code> would be a bug.', parts: picture(one('L' + cur().id + '_' + l.name, 'cur')) });
        }
      } else if (cmd === 'ret') {
        var fr = cur(), rv = w[1] ? okName(w[1]) : null, carried = null, lost = [];
        if (rv) carried = findLocal(rv);
        fstack.pop();
        if (carried && fstack.length) cur().locals.push({ name: carried.name, kind: carried.kind, type: carried.type, target: carried.target, val: carried.val });
        // Any live block no longer referenced by ANY pointer on the stack is leaked.
        blocks.forEach(function (bk) {
          if (bk.state !== 'live') return;
          var held = fstack.some(function (f) { return f.locals.some(function (x) { return x.kind === 'ptr' && x.target === bk.id; }); });
          if (!held) { bk.state = 'leaked'; leaked++; lost.push(bk.type + ' #' + bk.id); }
        });
        var msg = '<code>' + H.esc(fr.name) + '()</code> returns → its whole frame is popped in one go; every local in it is gone' + (rv ? ' (the <b>value</b> of ' + H.esc(rv) + ' — an address — is copied back to the caller)' : '') + '.';
        if (lost.length) msg += ' <span class="c-r"><b>LEAK:</b> ' + lost.join(', ') + ' is still on the heap but no pointer anywhere knows its address. Nobody can ever delete it. The stack cleaned itself; the heap did not.</span>';
        frames.push({ narr: msg, parts: picture() });
      } else {
        throw new Error('Unknown step "' + op + '". Use: call NAME · local NAME · new PTR TYPE · delete PTR · ret [PTR]');
      }
    });
    cleanFreed();
    var lk = blocks.filter(function (b) { return b.state === 'leaked'; });
    frames.push({ narr: lk.length ? '<b>Program over.</b> ' + lk.length + ' block(s) leaked. In a long-running server this happens on every request until memory runs out. The cure in modern C++: never let a <i>raw</i> pointer be the owner — let a stack object (vector, unique_ptr, shared_ptr) own the heap block, so the stack\'s automatic cleanup frees the heap too. That idea is <b>RAII</b>.' : '<b>Program over, no leaks.</b> Every <code>new</code> met exactly one <code>delete</code>. Try removing a <code>delete</code> step or adding <code>ret</code> before it to see a leak.', parts: picture() });
    return frames;
  }

  topics.push({
    title: 'Stack vs Heap: Where Your Objects Actually Live',
    analogy: `<p>Think of a <b>stack of plates in a cafeteria</b> versus a <b>self-storage warehouse</b>.</p>
      <ul><li><b>The stack</b> is the plate pile: you put a plate on top when a function starts, take it off when it ends. Super fast, always in order, and you never have to remember to clean up — the plate is removed when you leave.</li>
      <li><b>The heap</b> is the storage warehouse: you rent a unit (<code>new</code>) of any size, for as long as you want, and you get a <b>receipt</b> (a pointer) with the unit number. The unit stays rented until you hand it back (<code>delete</code>). Lose the receipt and you keep paying rent forever — that is a <b>memory leak</b>.</li></ul>`,
    explain: `<p>Every C++ program has (at least) two places to keep objects:</p>
      ${H.table(['', 'Stack (automatic storage)', 'Heap / free store (dynamic storage)'], [
        ['How you get it', '<code>int x = 5;</code> <code>Widget w;</code>', '<code>new Widget()</code>, <code>std::make_unique&lt;Widget&gt;()</code>, or inside a <code>vector</code>/<code>string</code>'],
        ['Who frees it', '<span class="c-g">Automatic</span> — when the enclosing scope <code>}</code> ends', '<span class="c-r">You</span> (<code>delete</code>) — or an owner object like <code>unique_ptr</code>'],
        ['Speed', 'One instruction (move the stack pointer)', 'Allocator call: find a free hole, bookkeeping, maybe a lock / syscall'],
        ['Size', 'Small: usually 1–8 MB per thread', 'Large: up to available RAM'],
        ['Lifetime', 'Tied to a scope (function body, block)', 'Anything you like — outlives the function that created it'],
        ['Typical bugs', 'Returning a pointer/reference to a local; stack overflow from deep recursion or huge arrays', 'Leaks, double delete, use-after-free, mismatched <code>new[]</code>/<code>delete</code>']
      ])}
      <p><b>Key mental model:</b> a pointer like <code>Widget* p = new Widget;</code> is <i>two</i> things. The pointer <code>p</code> itself is a tiny 8-byte variable that lives <b>on the stack</b>. The <code>Widget</code> it points to lives <b>on the heap</b>. When the function returns, the stack cleans up <code>p</code> automatically — but nothing cleans up the Widget. That is the root cause of almost every leak.</p>
      <p><b>When do you need the heap?</b> (1) The size is only known at run time (e.g. <code>n</code> read from input); (2) the object must outlive the current function (returned to a caller, stored in a long-lived container, shared across threads); (3) it is too big for the stack (a 10 MB buffer); (4) polymorphism — you hold a <code>Base*</code> to some derived object whose exact type is chosen at run time.</p>
      <p><b>Default rule in modern C++:</b> put objects on the stack and let standard containers manage heap memory for you. <code>std::vector&lt;int&gt; v(n);</code> is a small stack object (3 pointers) that owns a heap array and frees it in its destructor. You get heap flexibility with stack-style automatic cleanup.</p>
      ${H.kv([['Static storage', 'globals, <code>static</code> locals — live for the whole program'], ['Thread-local storage', '<code>thread_local</code> — one copy per thread'], ['Automatic (stack)', 'ordinary locals and parameters'], ['Dynamic (heap)', '<code>new</code>/<code>delete</code>, <code>malloc</code>/<code>free</code>']], { label: 'The four storage durations' })}`,
    clues: [
      '"Where is this object stored?" / "what happens to it when the function returns?" → storage duration question (stack vs heap)',
      '"Return a pointer to a local array" or "function returns <code>int*</code> to a local" → dangling pointer to a dead stack frame',
      'Size only known at run time (<code>n</code> from input, N up to 10<sup>6</sup>) → heap, but via <code>vector</code>, not raw <code>new[]</code>',
      '"Segfault with a big local array like <code>int a[10000000]</code>" or very deep recursion → stack overflow; move it to the heap / make it iterative',
      '"Why is allocation slow in this hot loop?" → heap allocations cost; reuse buffers, reserve, or keep objects on the stack',
      '"Object must outlive the function" / "polymorphic object chosen at run time" → heap + an owning smart pointer'
    ],
    code: [R`
      #include <iostream>
      #include <memory>
      #include <vector>
      struct Box { int w = 1, h = 2; };

      int main() {
          int a = 5;                       // stack: 4 bytes inside main's frame
          Box onStack;                     // stack: whole Box lives in the frame

          Box* raw = new Box{3, 4};        // pointer 'raw' on stack, Box on heap
          std::cout << raw->w * raw->h << "\n";
          delete raw;                      // YOU must free it, exactly once
          raw = nullptr;                   // avoid a dangling pointer

          auto owned = std::make_unique<Box>(); // heap Box, freed automatically
          std::vector<int> v(1'000'000);   // small stack object owning a big heap array

          std::cout << a + onStack.w + owned->h + (int)v.size() << "\n";
      }   // here: v frees its array, owned deletes its Box, then onStack and a vanish
    `, R`
      #include <iostream>
      // BUG: returns the address of a local array that dies when the function returns.
      int* badMakeArray() {
          int local[3] = {1, 2, 3};
          return local;               // dangling! (compilers warn: address of local returned)
      }
      // FIX 1: return by value — the container owns the heap memory.
      std::vector<int> goodMakeArray() { return {1, 2, 3}; }
      // FIX 2: if you truly need a heap array, return an owning smart pointer.
      std::unique_ptr<int[]> heapArray(std::size_t n) {
          auto p = std::make_unique<int[]>(n);   // zero-initialised
          for (std::size_t i = 0; i < n; ++i) p[i] = static_cast<int>(i);
          return p;                               // ownership moves to the caller
      }
      int main() {
          auto v = goodMakeArray();
          auto h = heapArray(4);
          std::cout << v[2] + h[3] << "\n";       // 3 + 3 = 6
      }
    `],
    codeTitle: ['Stack, heap, and the owner pattern side by side', 'Returning memory from a function: the wrong way and two right ways'],
    viz: {
      title: 'Stack frames vs heap blocks — watch a leak happen',
      input: 'call main; local a; new p Box; call make; new q Node; ret q; call helper; new t Buf; ret; delete p; delete q; ret',
      inputLabel: 'Steps: call NAME · local NAME · new PTR TYPE · delete PTR · ret [PTR]   (separate with ;)',
      gen: stackHeapSim
    },
    examples: [
      { title: 'Which of these live on the heap?', html: `<p>Look at each line and decide where the <i>bytes</i> live:</p>
        ${H.table(['Line', 'Stack', 'Heap'], [
          ['<code>int x = 3;</code>', '4 bytes (x)', '—'],
          ['<code>std::string s = "hi";</code>', '32 bytes (the string object)', '<span class="c-g">nothing!</span> short strings fit in the object (Small String Optimisation)'],
          ['<code>std::string s(100, \'a\');</code>', '32 bytes', '~101 bytes for the characters'],
          ['<code>std::vector&lt;int&gt; v(1000);</code>', '24 bytes (begin/end/capacity pointers)', '4000 bytes'],
          ['<code>auto p = new int(7);</code>', '8 bytes (pointer p)', '4 bytes (+ allocator header ~8–16 bytes)'],
          ['<code>static int counter;</code>', '—', '— (static storage: the data segment)']
        ])}
        <p>Lesson: "is it on the heap?" is about the <b>bytes</b>, not the variable. A <code>vector</code> variable is on the stack; its elements are on the heap.</p>` },
      { title: 'Stack overflow from a giant local array', html: `<p>A competitive-programming classic: <code>int dp[5000][5000];</code> inside <code>main</code> is 5000 × 5000 × 4 = <b>100 MB</b> on a stack that is typically 8 MB → instant crash (segfault) before the first line runs.</p>
        <p>Fixes: make it <code>static</code> or global (static storage), or use <code>std::vector&lt;std::vector&lt;int&gt;&gt;</code> / a flat <code>std::vector&lt;int&gt;(5000*5000)</code> (heap).</p>`, code: R`
        #include <vector>
        int main() {
            // int dp[5000][5000];                    // 100 MB on the stack -> crash
            static int dpStatic[500][500];           // fine: static storage
            std::vector<int> dp(5000 * 5000, 0);     // fine: heap, freed automatically
            dp[5000 * 1 + 2] = dpStatic[1][2] + 1;
            return dp[5002] == 1 ? 0 : 1;
        }` },
      { title: 'Lifetime: an object that must outlive its creator', html: `<p>A factory function builds a <code>Shape</code> whose exact type depends on user input. A stack object would die at the end of the factory, so it must go on the heap — and the safest way to hand it out is an owning <code>unique_ptr</code>:</p>
        <p>${H.c('g', 'The caller now owns the Shape; when its unique_ptr goes out of scope the Shape is deleted.')} No raw <code>new</code>, no manual <code>delete</code>.</p>`, code: R`
        #include <iostream>
        #include <memory>
        #include <string>
        struct Shape { virtual ~Shape() = default; virtual double area() const = 0; };
        struct Square : Shape { double s; explicit Square(double v) : s(v) {} double area() const override { return s * s; } };
        struct Circle : Shape { double r; explicit Circle(double v) : r(v) {} double area() const override { return 3.14159 * r * r; } };

        std::unique_ptr<Shape> makeShape(const std::string& kind, double x) {
            if (kind == "square") return std::make_unique<Square>(x);
            return std::make_unique<Circle>(x);
        }
        int main() {
            auto s = makeShape("square", 3);   // lives on past makeShape's frame
            std::cout << s->area() << "\n";     // 9
        }` },
      { title: 'Cost check: heap allocations in a hot loop', html: `<p>Allocating inside a loop that runs 10 million times means 10 million allocator calls. Reusing one buffer turns that into one allocation:</p>
        ${H.table(['Version', 'Allocations', 'Typical time (10M iters)'], [['<code>std::vector&lt;int&gt; tmp(16);</code> inside loop', '10,000,000', '~300–600 ms'], ['<code>tmp</code> declared once outside, <code>clear()</code> inside', '1', '~20–40 ms'], ['<code>std::array&lt;int,16&gt; tmp;</code> (stack)', '0', '~10–20 ms']])}
        <p class="c-m">Numbers are rough; measure on your machine. The shape of the result is what matters.</p>` }
    ],
    deepDive: `<p><b>How the stack really works.</b> Each thread gets a contiguous region (Linux main thread: <code>ulimit -s</code>, usually 8 MB; extra <code>std::thread</code>s often 8 MB too; Windows: 1 MB). A function's prologue subtracts its frame size from the stack pointer register (<code>rsp</code> on x86-64) — one instruction, whatever the number of locals. Locals are addressed as offsets from that pointer, which is why they are cache-hot and cheap. On return, the epilogue adds the size back; destructors of class-type locals run first, in reverse order of construction.</p>
      <p><b>How the heap really works.</b> <code>new T</code> = call <code>operator new(sizeof(T))</code> (which normally calls <code>malloc</code>) + run <code>T</code>'s constructor in that memory. glibc's malloc keeps per-thread caches (tcache) and size-class bins; small allocations are fast (~20 ns) but not free, large ones (≥128 KB by default) come straight from <code>mmap</code>. Each block carries a hidden header (8–16 bytes) — so 1 million <code>new int</code> costs ~32 MB, not 4 MB. Allocators like jemalloc, tcmalloc and mimalloc reduce lock contention and fragmentation in servers.</p>
      <p><b>Fragmentation:</b> after many mixed-size allocations and frees, free memory is split into holes too small to reuse, so RSS keeps growing even without a leak. Fixes: pooling, arenas (<code>std::pmr::monotonic_buffer_resource</code>), fewer tiny allocations (store values, not pointers, in containers).</p>
      <p><b>Escape hatches:</b> <code>alloca</code> and VLAs (<code>int a[n]</code> — a GCC extension, not standard C++) put run-time sized data on the stack; avoid them, a large <code>n</code> silently overflows. Small-buffer optimisations (SSO in <code>std::string</code>, <code>std::function</code>'s small-object buffer) keep small data inside the object to dodge the heap. Rule of thumb for interviews: "stack for small, fixed-size, scope-bound; heap for large, dynamic-size, or longer-lived — and the heap memory is always owned by some stack object."</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants write <code>std::vector</code> and <code>make_unique</code> by default, so you see fewer raw <code>new</code>s in fresh code. But AI still regularly produces code that returns a <code>std::string_view</code> or <code>const char*</code> into a local string, or a reference to a local — the stack-lifetime bug in a modern costume.</p>
      <p><b>Use AI as a partner:</b> paste a function and ask <code>For every object here, tell me stack/heap/static and when it is destroyed. Flag anything that outlives its storage.</code> Ask it to explain a sanitizer report ("stack-use-after-return", "heap-buffer-overflow") line by line.</p>
      <p><b>Where AI goes wrong:</b> it claims "<code>std::string</code> always allocates" (SSO says otherwise), suggests huge local arrays in competitive code, or "optimises" by returning <code>const T&amp;</code> to a temporary. <b>What you must own:</b> the lifetime picture — being able to draw stack frames and heap blocks for any snippet and say exactly when each byte is freed. That is what interviewers probe, and what catches the AI's subtle lifetime bugs in review.</p>`,
    problems: [{
      title: 'Return a Run-Time Sized Array Safely', level: 'Easy', tags: ['stack vs heap', 'dangling pointer', 'vector'], companies: ['Microsoft', 'Adobe'],
      statement: `<p>A teammate wrote <code>int* squares(int n)</code> that returns the first <code>n</code> squares. It works in their quick test but crashes or prints garbage in production. Explain the bug in terms of <b>stack frames</b> and rewrite it so the caller safely receives the numbers with <b>no manual delete</b>.</p>`,
      constraints: `1 ≤ n ≤ 10<sup>6</sup>. No leaks, no dangling pointers, no raw <code>new</code>/<code>delete</code> in your final version.`,
      example: `<p>n = 4 → ${H.arr([0, 1, 4, 9], { label: 'returned values', hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g' } })}</p><p>The buggy version returns the address of an array that lived in <code>squares</code>' stack frame. After <code>return</code>, that frame is ${H.c('r', 'popped')} and the next function call overwrites those bytes.</p>`,
      brute: { why: `<p>The original code returns a pointer into a <b>dead stack frame</b> (undefined behavior). The "obvious" patch — <code>new int[n]</code> — fixes the crash but makes every caller responsible for <code>delete[]</code>; forgetting it (or calling plain <code>delete</code>) leaks or corrupts memory.</p>`, code: R`
        // Buggy original + the leaky "fix".
        int* squaresBuggy(int n) {
            int local[1000];                 // lives in this function's stack frame
            for (int i = 0; i < n && i < 1000; ++i) local[i] = i * i;
            return local;                    // dangling: the frame dies on return
        }
        int* squaresLeaky(int n) {
            int* p = new int[n];             // heap: survives the return...
            for (int i = 0; i < n; ++i) p[i] = i * i;
            return p;                        // ...but every caller must remember delete[] p
        }` },
      mcq: { q: 'After <code>squaresBuggy</code> returns, what does the returned pointer point to?', options: ['A popped stack frame that the next call will reuse', 'A heap block that leaks', 'A static array that is safe to read', 'nullptr'], answer: 0, explain: 'The array was an automatic (stack) variable; its storage is released the moment the function returns, so the pointer dangles.' },
      hints: [`<p>Hint 1: Ask "who owns these bytes after the function returns?" A local array is owned by the dying frame — nobody owns it afterwards.</p>`, `<p>Hint 2: Return an object that <b>owns</b> heap memory by value: <code>std::vector&lt;int&gt;</code>. Returning by value is cheap thanks to move semantics / copy elision.</p>`, `<p>Hint 3: Recipe — create <code>std::vector&lt;int&gt; v(n)</code>, fill <code>v[i] = i*i</code> (use <code>long long</code> if n*n may exceed 2<sup>31</sup>), <code>return v;</code>. Edge cases: n = 1 → {0}; n large → heap, not stack.</p>`],
      solution: {
        approach: `<p>Let a stack object own the heap data. <code>std::vector</code> allocates its elements on the heap and frees them in its destructor, and returning it by value moves (or elides) — no copy of the elements, no manual delete. For n up to 10<sup>6</sup>, i² reaches 10<sup>12</sup>, so store <code>long long</code>.</p>`,
        code: R`
          #include <iostream>
          #include <vector>
          std::vector<long long> squares(int n) {
              std::vector<long long> v(n);                 // heap elements owned by v
              for (int i = 0; i < n; ++i) v[i] = 1LL * i * i;
              return v;                                    // NRVO / move: no element copy
          }
          int main() {
              auto s = squares(4);
              for (long long x : s) std::cout << x << ' ';  // 0 1 4 9
              std::cout << "\n";
          }   // s's destructor frees the heap array here
        `,
        dry: { head: ['step', 'stack', 'heap', 'note'], rows: [
          ['call squares(4)', 'frame{n=4, v{ptr,size,cap}}', '[ ?, ?, ?, ? ] 32 B', 'v allocates 4 long longs'],
          ['loop i=0..3', 'same', '[0, 1, 4, 9]', 'filled in place'],
          ['return v', 'frame popped; v moved into caller\'s s', '[0, 1, 4, 9] (same block!)', 'ownership moved, no copy'],
          ['end of main', 's destroyed', '<span class="c-g">freed</span>', 'no leak, no dangling']
        ] },
        complexity: `<p>O(n) time, O(n) heap memory, O(1) stack. Returning costs O(1) (pointer swap) thanks to move/NRVO.</p>`,
        followUps: ['When would you return <code>std::unique_ptr&lt;long long[]&gt;</code> instead of a vector?', 'What does NRVO mean and when is it guaranteed (C++17)?', 'Could you return a <code>std::span</code> here? Why not?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — new/delete and the memory-bug catalogue (leak hunts)
     ====================================================================== */
  var BUGS = {
    leak: {
      name: 'Early return leaks',
      code: 'bool process(int id) {\n    Record* r = new Record(id);\n    if (!r->valid())\n        return false;      // early exit\n    save(*r);\n    delete r;\n    return true;\n}',
      steps: [
        { l: 1, narr: '<code>process(7)</code> is called. A frame is pushed for it.', st: ['process() frame', 'int id = 7'], hp: [] },
        { l: 2, cls: 'ok', narr: '<code>new Record(id)</code>: heap block allocated + constructor runs. Raw pointer <code>r</code> on the stack is the only handle.', st: ['process() frame', 'int id = 7', 'Record* r'], hp: ['Record #1'], e: [[2, 0]] },
        { l: 3, narr: '<code>r-&gt;valid()</code> returns <b>false</b> for this id …', st: ['process() frame', 'int id = 7', 'Record* r'], hp: ['Record #1'], e: [[2, 0]] },
        { l: 4, cls: 'bad', narr: '… so we <code>return false</code> early. The <code>delete r</code> on line 6 is <b>skipped</b>.', st: ['process() frame', 'int id = 7', 'Record* r'], hp: ['Record #1'], e: [[2, 0]] },
        { l: 8, cls: 'bad', narr: '<span class="c-r"><b>Leak!</b></span> The frame is popped, <code>r</code> is gone, Record #1 is unreachable. Each invalid request leaks one Record. <b>Fix:</b> <code>auto r = std::make_unique&lt;Record&gt;(id);</code> — then every exit path (return, throw) deletes it automatically.', st: [], hp: ['Record #1'], leak: [0] }
      ]
    },
    exception: {
      name: 'Exception skips delete',
      code: 'void handle() {\n    Buffer* b = new Buffer(1024);\n    parse(*b);            // may throw\n    delete b;             // never reached on throw\n}',
      steps: [
        { l: 1, narr: '<code>handle()</code> starts.', st: ['handle() frame'], hp: [] },
        { l: 2, cls: 'ok', narr: 'A 1 KB Buffer is allocated on the heap; raw pointer <code>b</code> holds its address.', st: ['handle() frame', 'Buffer* b'], hp: ['Buffer #1 (1 KB)'], e: [[1, 0]] },
        { l: 3, cls: 'bad', narr: '<code>parse</code> throws <code>std::runtime_error</code>. Stack unwinding begins: C++ destroys every <b>object</b> in the frame — but <code>b</code> is just a pointer, and destroying a pointer does nothing to what it points at.', st: ['handle() frame', 'Buffer* b'], hp: ['Buffer #1 (1 KB)'], e: [[1, 0]] },
        { l: 4, cls: 'done', narr: 'Line 4 is <b>never reached</b>. The exception flies to the caller.', st: ['handle() frame', 'Buffer* b'], hp: ['Buffer #1 (1 KB)'], e: [[1, 0]] },
        { l: 5, cls: 'bad', narr: '<span class="c-r"><b>Leak!</b></span> 1 KB lost per failed parse. A try/catch with <code>delete</code> in two places "works" but is ugly and fragile. <b>RAII fix:</b> <code>auto b = std::make_unique&lt;Buffer&gt;(1024);</code> or simply <code>std::vector&lt;char&gt; b(1024);</code> — unwinding runs their destructors.', st: [], hp: ['Buffer #1 (1 KB)'], leak: [0] }
      ]
    },
    double: {
      name: 'Double delete (two owners)',
      code: 'Node* a = new Node;\nNode* b = a;          // copy of the address\ndelete a;\ndelete b;             // same block again!',
      steps: [
        { l: 1, cls: 'ok', narr: 'One Node on the heap, pointer <code>a</code> to it.', st: ['main() frame', 'Node* a'], hp: ['Node #1'], e: [[1, 0]] },
        { l: 2, narr: '<code>b = a</code> copies the <b>address</b>, not the Node. Now two raw pointers point at one block and nothing in the code says which one owns it.', st: ['main() frame', 'Node* a', 'Node* b'], hp: ['Node #1'], e: [[1, 0], [2, 0]] },
        { l: 3, cls: 'ok', narr: '<code>delete a</code> frees the block. <b>Both</b> a and b are now dangling.', st: ['main() frame', 'Node* a', 'Node* b'], hp: ['Node #1 (freed)'], fr: [0], dang: [1, 2] },
        { l: 4, cls: 'bad', narr: '<span class="c-r"><b>Double free!</b></span> Undefined behavior: glibc usually aborts with "free(): double free detected in tcache 2", but it can also silently corrupt the allocator and crash far away, later. <b>Fix:</b> exactly one owner — <code>unique_ptr</code>; observers hold raw pointers/references but never delete.', st: ['main() frame', 'Node* a', 'Node* b'], hp: ['Node #1 (freed)'], fr: [0], dang: [1, 2], badS: [2] }
      ]
    },
    uaf: {
      name: 'Use-after-free via vector growth',
      code: 'std::vector<int> v = {1, 2, 3};\nint* p = &v[0];       // pointer into v\'s buffer\nv.push_back(4);       // may reallocate!\nstd::cout << *p;      // reads freed memory',
      steps: [
        { l: 1, cls: 'ok', narr: '<code>v</code> (stack, 24 bytes) owns a heap buffer with capacity 3 holding 1 2 3.', st: ['main() frame', 'vector v {ptr,3,3}'], hp: ['int[3] {1,2,3}'], e: [[1, 0]] },
        { l: 2, narr: '<code>p</code> points <b>into</b> v\'s heap buffer. p does not own anything — it just borrows.', st: ['main() frame', 'vector v {ptr,3,3}', 'int* p'], hp: ['int[3] {1,2,3}'], e: [[1, 0], [2, 0]] },
        { l: 3, cls: 'cur', narr: '<code>push_back(4)</code> with size == capacity: the vector allocates a bigger buffer (capacity 6 in GCC: it doubles), moves 1 2 3 over, adds 4, then <b>frees the old buffer</b>.', st: ['main() frame', 'vector v {ptr,4,6}', 'int* p'], hp: ['int[3] (freed)', 'int[6] {1,2,3,4}'], e: [[1, 1], [2, 0]], fr: [0], newH: [1] },
        { l: 4, cls: 'bad', narr: '<span class="c-r"><b>Use-after-free!</b></span> <code>*p</code> reads the old, freed buffer. It may still print 1 (the bytes have not been reused yet) — which is exactly why this bug survives tests. AddressSanitizer reports <i>heap-use-after-free</i> here. <b>Fix:</b> keep an <b>index</b> (<code>size_t i = 0</code>) instead of a pointer, or <code>reserve()</code> first, or take the pointer after the last growth.', st: ['main() frame', 'vector v {ptr,4,6}', 'int* p'], hp: ['int[3] (freed)', 'int[6] {1,2,3,4}'], e: [[1, 1], [2, 0]], fr: [0], badS: [2], badE: [[2, 0]] }
      ]
    },
    mismatch: {
      name: 'new[] with delete (mismatch)',
      code: 'int* arr = new int[5];\nstd::string* s = new std::string[3];\ndelete arr;           // should be delete[]\ndelete s;             // should be delete[]',
      steps: [
        { l: 1, cls: 'ok', narr: '<code>new int[5]</code>: one block for 5 ints.', st: ['main() frame', 'int* arr'], hp: ['int[5]'], e: [[1, 0]] },
        { l: 2, cls: 'ok', narr: '<code>new std::string[3]</code>: for types with destructors, the compiler hides an <b>array cookie</b> (the count, 3) just before the elements so <code>delete[]</code> knows how many destructors to run.', st: ['main() frame', 'int* arr', 'string* s'], hp: ['int[5]', '[cookie=3] string ×3'], e: [[1, 0], [2, 1]] },
        { l: 3, cls: 'bad', narr: '<code>delete arr</code> on an array: <b>undefined behavior</b>. With ints it often "works" on GCC because no destructors are needed and the pointer is the block start — the worst kind of bug, the silent one.', st: ['main() frame', 'int* arr', 'string* s'], hp: ['int[5] (UB free)', '[cookie=3] string ×3'], e: [[2, 1]], fr: [0] },
        { l: 4, cls: 'bad', narr: '<code>delete s</code>: runs only <b>one</b> destructor (2 strings leak their buffers) and passes the wrong address (it skips the cookie) to the allocator → typical crash "free(): invalid pointer". <b>Fix:</b> match <code>new[]</code> with <code>delete[]</code> — or never write either: <code>std::vector</code>, <code>std::make_unique&lt;T[]&gt;(n)</code>.', st: ['main() frame', 'int* arr', 'string* s'], hp: ['int[5] (UB free)', '[cookie=3] string ×3'], e: [[2, 1]], fr: [0], badH: [1], badS: [2] }
      ]
    }
  };
  function bugHunt(input) {
    var key = String(input === undefined ? 'leak' : input).trim().toLowerCase();
    var sc = BUGS[key];
    if (!sc) throw new Error('Type one of: leak, exception, double, uaf, mismatch');
    var frames = [], lines = sc.code.split('\n').length;
    frames.push({ narr: '<b>Leak hunt: ' + sc.name + '.</b> Read the code first and guess the bug before stepping. (Other scenarios: leak, exception, double, uaf, mismatch.)', parts: [{ type: 'code', label: 'Suspect code', lang: 'cpp', code: sc.code, hl: {} }, note('Rule of thumb: every <code>new</code> needs exactly one matching <code>delete</code> on <b>every</b> path — normal return, early return and exception. Humans are bad at that; destructors are perfect at it.', 'Hunter\'s rule')] });
    sc.steps.forEach(function (s) {
      var sb = s.st.map(function (t, i) { return { id: 'S' + i, label: t }; });
      var hb = s.hp.map(function (t, i) { return { id: 'H' + i, label: t }; });
      var edges = (s.e || []).map(function (e) { return ['S' + e[0], 'H' + e[1]]; });
      var hl = {}, tags = {}, ehl = {};
      (s.leak || []).forEach(function (i) { hl['H' + i] = 'bad'; tags['H' + i] = 'LEAKED'; });
      (s.fr || []).forEach(function (i) { hl['H' + i] = 'done'; tags['H' + i] = 'freed'; });
      (s.newH || []).forEach(function (i) { hl['H' + i] = 'ok'; tags['H' + i] = 'new'; });
      (s.badH || []).forEach(function (i) { hl['H' + i] = 'bad'; tags['H' + i] = 'corrupt'; });
      (s.dang || []).forEach(function (i) { tags['S' + i] = 'dangling'; });
      (s.badS || []).forEach(function (i) { hl['S' + i] = 'bad'; });
      (s.badE || []).forEach(function (e) { ehl['S' + e[0] + '-H' + e[1]] = 'bad'; });
      var chl = {}; if (s.l <= lines) chl[s.l] = s.cls || 'cur';
      frames.push({ narr: s.narr, parts: [
        { type: 'code', label: 'Suspect code (highlighted = running now)', lang: 'cpp', code: sc.code, hl: chl },
        memGraph('Memory right now', sb, hb, edges, hl, ehl, tags)
      ] });
    });
    return frames;
  }

  topics.push({
    title: 'new / delete and the Memory-Bug Catalogue: Leaks, Double Free, Use-After-Free',
    analogy: `<p><b>Hotel key cards.</b> <code>new</code> is checking into a room: the hotel (allocator) gives you a key card (pointer). <code>delete</code> is checking out. The classic disasters:</p>
      <ul><li><b>Leak</b> — you lose the key card and never check out. The room stays "occupied" forever.</li>
      <li><b>Double delete</b> — you and your friend both try to check out of the same room; the front desk's records get corrupted.</li>
      <li><b>Use-after-free</b> — you checked out but kept a copy of the key, and you walk back into the room… which now belongs to a new guest.</li></ul>`,
    explain: `<p><code>new</code> and <code>delete</code> each do <b>two</b> jobs:</p>
      ${H.table(['Expression', 'Step 1', 'Step 2'], [
        ['<code>new T(args)</code>', 'call <code>operator new(sizeof(T))</code> → raw bytes (throws <code>std::bad_alloc</code> if none)', 'run <code>T</code>\'s constructor in those bytes (if it throws, the bytes are freed automatically)'],
        ['<code>delete p</code>', 'run <code>~T()</code>', 'call <code>operator delete(p)</code> → bytes back to the allocator'],
        ['<code>new T[n]</code>', 'allocate n·sizeof(T) (+ hidden count "cookie" if T has a destructor)', 'construct n elements'],
        ['<code>delete[] p</code>', 'destroy n elements in <b>reverse</b> order', 'free the whole block']
      ])}
      <p>Compare with C's <code>malloc</code>/<code>free</code>: they only handle bytes — no constructors, no destructors, return <code>NULL</code> instead of throwing. Never mix the families (<code>malloc</code> + <code>delete</code>, <code>new</code> + <code>free</code>, <code>new[]</code> + <code>delete</code>): all are undefined behavior.</p>
      <p><b>The five bugs every C++ interviewer asks about:</b></p>
      <ol><li><b>Memory leak</b> — allocated, never freed (early return, exception, overwritten pointer, forgotten in a destructor, shared_ptr cycle).</li>
      <li><b>Double free</b> — two "owners" both delete; or delete in a destructor of a class whose copy constructor copied the pointer (shallow copy).</li>
      <li><b>Use-after-free / dangling pointer</b> — reading through a pointer after its object died (deleted, went out of scope, vector reallocated).</li>
      <li><b>Mismatched forms</b> — <code>new[]</code> freed with <code>delete</code>, <code>malloc</code> freed with <code>delete</code>.</li>
      <li><b>Deleting what you did not new</b> — <code>delete</code> on a stack address or the middle of a block.</li></ol>
      <p><b>Small but important facts:</b> <code>delete nullptr;</code> is a safe no-op (no need for <code>if (p)</code>). Setting <code>p = nullptr</code> after delete prevents double-delete through <i>that</i> pointer only — copies still dangle. A leak is not "undefined behavior"; the OS reclaims everything at process exit — leaks matter in long-running programs (servers, games, embedded) where they pile up.</p>
      <p><b>How to hunt leaks in real life:</b> compile with <code>-fsanitize=address</code> (ASan + LeakSanitizer reports every leaked block with the allocation stack trace at exit), or run under <code>valgrind --leak-check=full</code>; for growth over time use heaptrack / massif / jemalloc profiling. In an interview, explain how you would do it — then show the RAII fix.</p>`,
    clues: [
      '"Find the bug / why does memory keep growing?" with raw <code>new</code> and multiple <code>return</code>s → early-return leak',
      'Code that can <code>throw</code> between <code>new</code> and <code>delete</code> → exception-path leak; answer is RAII',
      '"free(): double free detected" / "crashes in the destructor" after copying an object → shallow copy, two owners',
      'Pointer or reference taken into a <code>vector</code>, then <code>push_back</code> → iterator/pointer invalidation, use-after-free',
      '<code>new T[n]</code> paired with <code>delete</code> (no brackets) → mismatched forms, UB',
      '"Works in debug, crashes in release" / "crashes randomly far from the bug" → heap corruption; reach for ASan'
    ],
    code: [R`
      #include <iostream>
      #include <new>
      #include <string>
      struct Widget {
          std::string name;
          explicit Widget(std::string n) : name(std::move(n)) { std::cout << "ctor " << name << "\n"; }
          ~Widget() { std::cout << "dtor " << name << "\n"; }
      };
      int main() {
          Widget* w = new Widget("solo");          // operator new + ctor
          delete w;                                // dtor + operator delete
          w = nullptr;
          delete w;                                // deleting nullptr: safe no-op

          Widget* many = new Widget[2]{Widget("a"), Widget("b")};
          delete[] many;                           // dtors b then a, then free

          Widget* maybe = new (std::nothrow) Widget("nothrow");   // returns nullptr instead of throwing
          if (maybe) delete maybe;

          alignas(Widget) unsigned char buf[sizeof(Widget)];      // raw storage on the stack
          Widget* placed = new (buf) Widget("placement");         // construct in existing memory
          placed->~Widget();                                      // destroy manually; NEVER delete it
      }
    `, R`
      // Leak hunt with sanitizers (shell, shown as comments):
      //   g++ -std=c++20 -g -fsanitize=address,undefined leaky.cpp && ./a.out
      //   ==1234==ERROR: LeakSanitizer: detected memory leaks
      //   Direct leak of 16 byte(s) in 1 object(s) allocated from:
      //       #0 operator new(unsigned long)
      //       #1 makeNode() leaky.cpp:7
      #include <iostream>
      struct Node { int v; Node* next; };
      Node* makeNode(int v) { return new Node{v, nullptr}; }
      int main() {
          Node* a = makeNode(1);
          a->next = makeNode(2);
          delete a;                 // BUG: a->next (16 bytes) is leaked
          std::cout << "done\n";
      }
    `],
    codeTitle: ['Every form of new/delete (including placement and nothrow)', 'A tiny leak and what AddressSanitizer prints'],
    viz: {
      title: 'Leak hunt: step through five classic memory bugs',
      input: 'leak',
      inputLabel: 'Scenario: leak · exception · double · uaf · mismatch',
      gen: bugHunt
    },
    examples: [
      { title: 'Leak hunt #1 — the overwritten pointer', html: `<p>Spot the leak:</p>
        <pre>char* buf = new char[64];
buf = new char[128];   // grow it
delete[] buf;</pre>
        <p>${H.c('r', 'The first 64-byte block is lost')} — the only pointer to it was overwritten. Fix: free (or better, use <code>std::vector&lt;char&gt;</code> / <code>std::string</code> and call <code>resize(128)</code>).</p>`, code: R`
        #include <vector>
        int main() {
            std::vector<char> buf(64);
            buf.resize(128);          // vector frees/moves its own storage
            return static_cast<int>(buf.size()) - 128;
        }` },
      { title: 'Leak hunt #2 — the destructor that forgot', html: `<p>A class allocates in its constructor but has no destructor. Every object leaks its array. Adding a destructor fixes the leak <i>but</i> creates a double-free the moment someone copies the object (the default copy copies the pointer). This is why the <b>Rule of Zero</b> exists: hold a <code>std::vector</code>/<code>unique_ptr</code> member and write <b>no</b> destructor at all.</p>`, code: R`
        #include <memory>
        #include <cstddef>
        class Bad {            // leaks: no destructor
            int* data_;
        public:
            explicit Bad(std::size_t n) : data_(new int[n]) {}
        };
        class Good {           // Rule of Zero: the member owns the memory
            std::unique_ptr<int[]> data_;
        public:
            explicit Good(std::size_t n) : data_(std::make_unique<int[]>(n)) {}
        };
        int main() { Good g(10); Bad b(10); (void)g; (void)b; }` },
      { title: 'Leak hunt #3 — dangling reference to a temporary string', html: `<p>No <code>new</code> anywhere, still a use-after-free:</p>
        ${H.table(['Line', 'What happens'], [['<code>std::string_view sv = std::string("hello") + " world";</code>', 'a temporary <code>std::string</code> is created (its characters live inside it via SSO or, for longer text, on the heap)'], ['end of that statement', 'the temporary is destroyed → <span class="c-r">sv points at dead memory</span>'], ['<code>std::cout &lt;&lt; sv;</code>', 'UB — ASan: stack-use-after-scope or heap-use-after-free']])}
        <p>Fix: store a <code>std::string</code>, not a view, when you are the one keeping the data alive.</p>` },
      { title: 'Counting allocations to prove a fix', html: `<p>A simple instance counter is a lightweight leak detector for tests: every constructor increments, every destructor decrements, and the test asserts the count is back to 0.</p>`, code: R`
        #include <cassert>
        #include <memory>
        struct Tracked {
            static inline int alive = 0;
            Tracked() { ++alive; }
            Tracked(const Tracked&) { ++alive; }
            ~Tracked() { --alive; }
        };
        int main() {
            {
                auto a = std::make_unique<Tracked>();
                Tracked b;
                assert(Tracked::alive == 2);
            }
            assert(Tracked::alive == 0);   // nothing leaked
        }` }
    ],
    deepDive: `<p><b>Why the language makes this so easy to get wrong:</b> a raw <code>T*</code> carries no information about ownership. It could point to a heap object you must delete, a stack object, an array element, a static, or memory owned by someone else. The type system cannot tell, so the compiler cannot help. Modern guidelines (C++ Core Guidelines R.3, R.11) say: <i>a raw pointer is never an owner; avoid calling new and delete explicitly</i>.</p>
      <p><b>What happens on double free inside glibc:</b> freed chunks go into per-thread "tcache" bins (a singly linked list stored inside the freed chunk itself). Freeing the same chunk twice links it into the list twice; two later <code>new</code>s return the <b>same</b> address, so two live objects overlap — a classic exploit primitive. Modern glibc detects the simple case ("double free detected in tcache 2") but not all.</p>
      <p><b>Use-after-free</b> is the #1 class of exploited memory-safety bugs in browsers and OS kernels (Chrome and Microsoft both report roughly 70% of their serious security bugs are memory-safety issues). That is why governments (CISA, 2023–2025 guidance) push memory-safe languages and why C++ is adding hardening: the C++26 "hardened standard library" (bounds-checked <code>operator[]</code>), <code>-D_GLIBCXX_ASSERTIONS</code>, <code>-fhardened</code> in GCC 14, and erroneous-behavior rules for uninitialised reads.</p>
      <p><b>Tooling ladder:</b> compiler warnings (<code>-Wall -Wextra</code>, <code>-Wmismatched-new-delete</code>), static analysis (clang-tidy <code>cppcoreguidelines-owning-memory</code>, clang static analyzer), dynamic tools (ASan ~2× slowdown, catches UAF/overflow/double-free/leaks; Valgrind ~20–50× slower but needs no recompile), and production heap profilers. A leak report gives you the <i>allocation</i> stack — your job is to find which path forgot to free it.</p>`,
    aiEra: `<p><b>What AI changes:</b> an assistant can scan a 500-line legacy file and list every raw <code>new</code> with its matching (or missing) <code>delete</code> in seconds — a job that used to take an afternoon. It is also good at turning an ASan report into a plain-English story.</p>
      <p><b>Use AI as a partner:</b> <code>Here is an ASan report and the file. Which allocation leaks, on which path? Propose a RAII fix that changes the fewest lines.</code> Then <i>re-run the sanitizer</i> — the report, not the AI, is the ground truth.</p>
      <p><b>Where AI goes wrong:</b> it "fixes" leaks by adding a <code>delete</code> on one path and misses another (exceptions!), adds a destructor without fixing copy (creating double frees), or suggests <code>shared_ptr</code> everywhere as a blanket cure (hiding ownership and creating cycles). <b>What you must own:</b> the ownership story — who creates, who owns, who only borrows, and when it dies — plus the habit of proving a fix with a sanitizer or a counting test.</p>`,
    problems: [{
      title: 'Leak Hunt: Fix loadConfig With Three Exit Paths', level: 'Medium', tags: ['memory leak', 'RAII', 'unique_ptr', 'exceptions'], companies: ['Google', 'Bloomberg', 'Amazon'],
      statement: `<p><code>loadConfig</code> allocates a <code>Parser</code> and a 4 KB raw buffer, then has <b>three</b> ways out: a missing file returns early, a malformed line throws, and success returns a value. Find every leak and rewrite the function so <b>no path can leak</b>, without a single <code>delete</code>.</p>`,
      constraints: `Must stay exception-neutral (exceptions propagate to the caller). No <code>try/catch</code> used just for cleanup. Behaviour on success must be unchanged.`,
      example: `${H.table(['Path', 'Original', 'After fix'], [['file missing', '<span class="c-r">leaks Parser + buffer</span>', '<span class="c-g">both freed</span>'], ['bad line → throw', '<span class="c-r">leaks Parser + buffer</span>', '<span class="c-g">both freed during unwinding</span>'], ['success', 'freed', 'freed']])}`,
      brute: { why: `<p>The original frees only on the success path. A "patch" that adds <code>delete</code>s before each <code>return</code> and a <code>try/catch</code> that deletes and rethrows does work, but every future edit (a new early return) re-opens the leak. It is O(paths) places to keep in sync.</p>`, code: R`
        #include <stdexcept>
        #include <string>
        struct Parser { bool open(const std::string& f) { return !f.empty(); } int parse(const char* b) { if (!b) throw std::runtime_error("bad"); return 42; } };
        int loadConfigLeaky(const std::string& file) {
            Parser* p = new Parser();
            char* buf = new char[4096];
            if (!p->open(file)) return -1;          // LEAK: p and buf
            int value = p->parse(buf);              // may throw -> LEAK: p and buf
            delete[] buf;
            delete p;
            return value;
        }` },
      mcq: { q: 'Why is "add delete before every return" a weak fix?', options: ['It misses the exception path and every future early return must remember it', 'delete is slower than unique_ptr', 'The compiler forbids delete before return', 'It causes double free on success'], answer: 0, explain: 'Manual cleanup has to be repeated on each exit path, including invisible ones created by exceptions. Destructors run on all of them automatically.' },
      hints: [`<p>Hint 1: List the exits: early <code>return</code>, exception from <code>parse</code>, normal return. Which ones reach the <code>delete</code>s? Only one.</p>`, `<p>Hint 2: If the objects are owned by <b>stack objects</b>, the language destroys them on every exit, including stack unwinding.</p>`, `<p>Hint 3: <code>auto p = std::make_unique&lt;Parser&gt;();</code> and <code>std::vector&lt;char&gt; buf(4096);</code> (or <code>std::make_unique&lt;char[]&gt;(4096)</code>). Pass <code>buf.data()</code>. Delete both <code>delete</code> lines. Even simpler: <code>Parser p;</code> on the stack if it is small.</p>`],
      solution: {
        approach: `<p>Turn both raw owners into RAII owners. The Parser can usually just be a stack object; the buffer becomes a <code>std::vector&lt;char&gt;</code>. Now each exit — early return, exception, success — runs the destructors in reverse order of construction (buffer first, then parser). The code also gets shorter.</p>`,
        code: R`
          #include <memory>
          #include <stdexcept>
          #include <string>
          #include <vector>
          struct Parser { bool open(const std::string& f) { return !f.empty(); } int parse(const char* b) { if (!b) throw std::runtime_error("bad"); return 42; } };

          int loadConfig(const std::string& file) {
              auto p = std::make_unique<Parser>();     // or simply: Parser p;
              std::vector<char> buf(4096);             // owns the 4 KB
              if (!p->open(file)) return -1;           // both destroyed here
              return p->parse(buf.data());             // ...or here, or during unwinding
          }
          int main() { return loadConfig("app.cfg") == 42 ? 0 : 1; }
        `,
        dry: { head: ['path', 'objects alive at exit', 'who frees them', 'leak?'], rows: [
          ['file = "" → return -1', 'p, buf', '~vector, then ~unique_ptr (reverse order)', '<span class="c-g">no</span>'],
          ['parse throws', 'p, buf', 'stack unwinding runs the same destructors', '<span class="c-g">no</span>'],
          ['success → return 42', 'p, buf', 'same destructors after the return value is computed', '<span class="c-g">no</span>']
        ] },
        complexity: `<p>Same O(1) extra work as the original; <code>unique_ptr</code> has zero size/speed overhead over a raw pointer with the default deleter.</p>`,
        followUps: ['What if <code>Parser</code>\'s constructor itself throws — is anything leaked?', 'How would you prove the fix with a test (hint: counting allocations or ASan in CI)?', 'What if the function must return the Parser to the caller?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — RAII and destructor order
     ====================================================================== */
  function raiiOrder(input) {
    var DEF = 'file lock { tmp buf } conn';
    var toks = String(input === undefined ? DEF : input).trim().split(/\s+/).filter(Boolean);
    if (!toks.length) throw new Error('Type names separated by spaces, e.g. ' + DEF);
    if (toks.length > 16) throw new Error('Use at most 16 tokens');
    var depth = 0, lines = ['void work() {'], lineOf = [];
    toks.forEach(function (t) {
      if (t === '{') { lines.push('    '.repeat(depth + 1) + '{'); lineOf.push(lines.length); depth++; return; }
      if (t === '}') { if (depth === 0) throw new Error('Unbalanced "}" — every } needs a { before it'); depth--; lines.push('    '.repeat(depth + 1) + '}'); lineOf.push(lines.length); return; }
      var th = /!$/.test(t), nm = okName(t.replace(/!$/, ''));
      lines.push('    '.repeat(depth + 1) + 'Guard ' + nm + '{"' + nm + '"};' + (th ? '   // constructor throws!' : ''));
      lineOf.push(lines.length);
    });
    while (depth > 0) { depth--; lines.push('    '.repeat(depth + 1) + '}'); }
    lines.push('}');
    var code = lines.join('\n'), lastLine = lines.length;
    var frames = [], st = [], log = [], scope = 0;
    function items() { return st.map(function (o) { return o.marker ? '── scope ' + o.marker + ' ──' : o.name + ' (alive)'; }); }
    function snap(narr, line, cls, hlTop) {
      var h = {}; if (hlTop !== undefined && st.length) h[st.length - 1] = hlTop;
      var chl = {}; if (line) chl[line] = cls || 'cur';
      frames.push({ narr: narr, parts: [
        { type: 'code', label: 'The function (generated from your input)', lang: 'cpp', code: code, hl: chl },
        { type: 'stack', label: 'Objects alive on the stack (top = newest)', items: items(), hl: h },
        out(log.slice())
      ] });
    }
    function destroyTo(stopAtMarker, line, why) {
      while (st.length) {
        var top = st[st.length - 1];
        if (top.marker) { if (stopAtMarker) { st.pop(); return; } st.pop(); continue; }
        snap(why + ': destroying <b>' + H.esc(top.name) + '</b> (newest first). Its destructor releases its resource.', line, 'cur', 'bad');
        st.pop(); log.push('~Guard(' + top.name + ')  -> released');
      }
    }
    snap('RAII = <b>Resource Acquisition Is Initialization</b>: grab the resource in the constructor, release it in the destructor. Each <code>Guard</code> below could be a file, a lock, a socket. Watch the order: objects are destroyed in the <b>reverse</b> order they were created. Tip: put <code>!</code> after a name to make its constructor throw.', 1);
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i], ln = lineOf[i];
      if (t === '{') { scope++; st.push({ marker: scope }); snap('Entering an inner block <code>{</code>. Objects created in here die at its matching <code>}</code>, before the outer ones.', ln); continue; }
      if (t === '}') { destroyTo(true, ln, 'Inner block ends at <code>}</code>'); snap('Inner block finished: only its own objects were destroyed. Outer objects are still alive.', ln, 'ok'); continue; }
      var nm = t.replace(/!$/, '');
      if (/!$/.test(t)) {
        log.push('Guard(' + nm + ') constructor THROWS');
        snap('<span class="c-r"><b>' + H.esc(nm) + '\'s constructor throws.</b></span> ' + H.esc(nm) + ' was never fully built, so its destructor will <b>not</b> run (any members it had already built <i>are</i> destroyed). Stack unwinding now destroys everything that <b>was</b> fully built, newest first.', ln, 'bad');
        destroyTo(false, ln, 'Unwinding');
        snap('Unwinding finished — every acquired resource was released even though we never reached the end of the function. That guarantee is why RAII beats manual cleanup. The exception now continues to the caller.', ln, 'bad');
        return frames;
      }
      st.push({ name: nm }); log.push('Guard(' + nm + ')  -> acquired');
      snap('<code>Guard ' + H.esc(nm) + '</code> constructed: the resource is acquired <b>in the constructor</b>. It is pushed on top of the stack.', ln, 'ok', 'ok');
    }
    destroyTo(false, lastLine, 'Function returns at the final <code>}</code>');
    snap('All done. Construction order: ' + log.filter(function (l) { return /acquired/.test(l); }).map(function (l) { return l.replace(/Guard\(|\).*/g, ''); }).join(' → ') + '. Destruction order: exactly the reverse. No <code>delete</code>, <code>close</code> or <code>unlock</code> was written by hand.', lastLine, 'ok');
    return frames;
  }

  topics.push({
    title: 'RAII: Tie Every Resource to an Object\'s Lifetime',
    analogy: `<p><b>A hotel room that checks you out automatically when you walk out the door.</b> You never have to remember to return the key: the moment you leave the room (the scope), the door system ends your stay. Even if you leave in a hurry because the fire alarm went off (an exception), checkout still happens.</p>
      <p>RAII objects are that smart door: the <b>constructor</b> checks you in (opens the file, locks the mutex, allocates memory) and the <b>destructor</b> checks you out — automatically, on every way out.</p>`,
    explain: `<p><b>RAII</b> (Resource Acquisition Is Initialization — a famously bad name; think "<b>Scope-Bound Resource Management</b>") is the single most important C++ idiom:</p>
      <ol><li>Wrap each resource in a class.</li><li>Acquire it in the <b>constructor</b> (or receive ownership of it there).</li><li>Release it in the <b>destructor</b>.</li><li>Create the wrapper as a local (stack) object or as a member of another object.</li></ol>
      <p>Because C++ <b>guarantees</b> that a fully constructed automatic object's destructor runs when its scope ends — by normal flow, <code>return</code>, <code>break</code>, or an exception — the resource cannot leak.</p>
      ${H.table(['Resource', 'Manual (fragile)', 'RAII type (automatic)'], [
        ['Heap memory', '<code>new</code> / <code>delete</code>', '<code>std::vector</code>, <code>std::string</code>, <code>std::unique_ptr</code>, <code>std::shared_ptr</code>'],
        ['Mutex', '<code>m.lock()</code> / <code>m.unlock()</code>', '<code>std::lock_guard</code>, <code>std::scoped_lock</code>, <code>std::unique_lock</code>'],
        ['File', '<code>fopen</code> / <code>fclose</code>', '<code>std::ifstream</code>/<code>std::ofstream</code>, or <code>unique_ptr</code> + custom deleter'],
        ['Thread', '<code>t.join()</code> (forget → <code>std::terminate</code>)', '<code>std::jthread</code> (joins in its destructor, C++20)'],
        ['Socket / DB connection / GPU buffer', '<code>close()</code>, <code>release()</code>', 'your own small wrapper class']
      ])}
      <p><b>Destructor order rules (interview favourite):</b></p>
      <ul><li>Locals in a scope: destroyed in <b>reverse order of construction</b> (last built, first destroyed — like a stack of plates).</li>
      <li>Class members: constructed in <b>declaration order</b> (not initializer-list order!), destroyed in reverse.</li>
      <li>Inheritance: base constructed before derived; derived destroyed before base.</li>
      <li>Array / vector elements: constructed front to back; <code>delete[]</code> and built-in arrays destroy back to front.</li>
      <li>If a constructor throws, that object's destructor does <b>not</b> run — but its already-constructed members and bases are destroyed.</li></ul>
      <p><b>Writing your own RAII class:</b> decide copy semantics. Most resource handles should be <b>non-copyable</b> (delete copy constructor/assignment) but <b>movable</b> (move transfers ownership and leaves the source empty). And destructors must not throw — they are <code>noexcept</code> by default; a throw during unwinding calls <code>std::terminate</code>.</p>`,
    clues: [
      '"Make this exception-safe" / "what if X throws halfway?" → RAII wrappers, not try/catch cleanup',
      '"Lock a mutex and make sure it is always unlocked" → <code>std::lock_guard</code> / <code>std::scoped_lock</code>',
      '"In what order are these destructors called?" → reverse construction order; members reverse of declaration order',
      'Wrap a C API that returns a handle and has a matching <code>close/free/release</code> function → RAII class or <code>unique_ptr</code> with custom deleter',
      '"Run this cleanup on every exit path" / "defer" (Go) / "finally" (Java) → scope guard object',
      '"Can a destructor throw?" → no (noexcept by default; throwing during unwinding → <code>std::terminate</code>)'
    ],
    code: [R`
      #include <cstdio>
      #include <iostream>
      #include <mutex>
      #include <stdexcept>
      #include <string>
      #include <utility>

      // A minimal, correct RAII wrapper for a C FILE*.
      class File {
          std::FILE* f_ = nullptr;
      public:
          File(const char* path, const char* mode) : f_(std::fopen(path, mode)) {
              if (!f_) throw std::runtime_error(std::string("cannot open ") + path);
          }
          ~File() { if (f_) std::fclose(f_); }                 // release, never throws
          File(const File&) = delete;                         // one owner only
          File& operator=(const File&) = delete;
          File(File&& o) noexcept : f_(std::exchange(o.f_, nullptr)) {}   // transfer ownership
          File& operator=(File&& o) noexcept {
              if (this != &o) { if (f_) std::fclose(f_); f_ = std::exchange(o.f_, nullptr); }
              return *this;
          }
          std::FILE* get() const noexcept { return f_; }
      };

      std::mutex logMutex;
      void appendLine(const char* path, const std::string& line) {
          std::lock_guard<std::mutex> guard(logMutex);        // locked here...
          File out(path, "a");                                // opened here...
          std::fputs((line + "\n").c_str(), out.get());
      }   // ...closed, then unlocked (reverse order) — even if fputs or the string ops throw

      int main() {
          try { appendLine("/tmp/raii_demo.txt", "hello"); }
          catch (const std::exception& e) { std::cout << e.what() << "\n"; }
      }
    `, R`
      #include <iostream>
      #include <string>
      struct Noisy {
          std::string n;
          explicit Noisy(std::string s) : n(std::move(s)) { std::cout << "+" << n << ' '; }
          ~Noisy() { std::cout << "-" << n << ' '; }
      };
      struct Car {
          Noisy engine{"engine"};      // declared first -> built first, destroyed last
          Noisy wheels{"wheels"};
          Car() { std::cout << "+Car "; }
          ~Car() { std::cout << "-Car "; }
      };
      int main() {
          Noisy a("a");
          {
              Car c;
          }
          Noisy b("b");
          std::cout << "| ";
      }
      // Output: +a +engine +wheels +Car -Car -wheels -engine +b | -b -a
    `],
    codeTitle: ['A real RAII class (File) plus lock_guard', 'Destructor order: locals, members, nested scopes'],
    viz: {
      title: 'RAII destructor order (try "file lock buf! conn" for an exception)',
      input: 'file lock { tmp buf } conn',
      inputLabel: 'Object names in creation order; { } = inner block; name! = its constructor throws',
      gen: raiiOrder
    },
    examples: [
      { title: 'Predict the output: nested scopes', html: `<p>Objects: <code>A a; { B b; C c; } D d;</code></p>
        ${H.table(['Event', 'Stack after'], [['+A', 'A'], ['+B', 'A B'], ['+C', 'A B C'], ['inner } → -C, -B', 'A'], ['+D', 'A D'], ['function end → -D, -A', '(empty)']])}
        <p>Printed: ${H.c('b', '+A +B +C -C -B +D -D -A')}</p>` },
      { title: 'A scope guard: "defer" in C++', html: `<p>Sometimes the cleanup is a one-off action, not a resource with its own class. A tiny template that runs a lambda in its destructor gives you Go's <code>defer</code>. (Libraries: <code>std::experimental::scope_exit</code>, Abseil <code>absl::Cleanup</code>, GSL <code>gsl::finally</code>.)</p>`, code: R`
        #include <iostream>
        #include <utility>
        template <class F>
        class ScopeGuard {
            F fn_;
            bool active_ = true;
        public:
            explicit ScopeGuard(F f) : fn_(std::move(f)) {}
            ~ScopeGuard() { if (active_) fn_(); }
            void dismiss() noexcept { active_ = false; }      // "commit": skip the rollback
            ScopeGuard(const ScopeGuard&) = delete;
            ScopeGuard& operator=(const ScopeGuard&) = delete;
        };
        int main() {
            int balance = 100;
            {
                balance -= 30;                                // step 1 of a transaction
                ScopeGuard rollback([&] { balance += 30; std::cout << "rolled back\n"; });
                bool step2ok = false;                         // pretend step 2 failed
                if (step2ok) rollback.dismiss();
            }                                                 // guard fires: undo step 1
            std::cout << balance << "\n";                     // 100
        }` },
      { title: 'Constructor throws halfway: what gets cleaned?', html: `<p><code>struct Server { Socket s; Logger log; Cache c; };</code> — suppose <code>Cache</code>'s constructor throws.</p>
        ${H.table(['Member', 'Constructed?', 'Destroyed during unwind?'], [['s (Socket)', '<span class="c-g">yes</span>', '<span class="c-g">yes</span> (2nd)'], ['log (Logger)', '<span class="c-g">yes</span>', '<span class="c-g">yes</span> (1st)'], ['c (Cache)', '<span class="c-r">no — threw</span>', 'no'], ['~Server()', '—', '<span class="c-r">does NOT run</span> (object never existed)']])}
        <p>That is why you must not do raw cleanup in <code>~Server()</code> for members acquired in the constructor body: if the body throws, the destructor never runs. Make every member its own RAII object.</p>` },
      { title: 'lock_guard vs unique_lock vs scoped_lock', html: `${H.table(['Type', 'Use when', 'Extra powers'], [['<code>std::lock_guard</code>', 'lock one mutex for the whole scope', 'none — smallest, simplest'], ['<code>std::scoped_lock</code> (C++17)', 'lock one or <b>several</b> mutexes', 'deadlock-avoidance algorithm for multiple mutexes'], ['<code>std::unique_lock</code>', 'condition variables, unlock early, deferred/timed locking', 'movable, <code>unlock()</code>, <code>try_lock_for</code>']])}<p>All three unlock in their destructor — the RAII guarantee is the point.</p>` }
    ],
    deepDive: `<p><b>Why RAII works so well in C++ specifically:</b> C++ has <i>deterministic destruction</i>. Unlike garbage-collected languages (Java, Go, C#, JS), you know the exact line where a destructor runs. Java needed <code>try-with-resources</code>, C# <code>using</code>, Python <code>with</code>, Go <code>defer</code> to emulate what C++ gets from every local variable. RAII also composes: a class whose members are RAII types needs no destructor at all (<b>Rule of Zero</b>).</p>
      <p><b>Stack unwinding mechanics:</b> on <code>throw</code>, the runtime (Itanium ABI on Linux) walks frames using unwind tables, and for each frame runs "landing pads" the compiler generated to destroy live locals. This is "zero-cost" on the happy path (no runtime overhead without a throw) but throwing is expensive (microseconds). If no handler is found, whether the stack is unwound before <code>std::terminate</code> is implementation-defined — so do not rely on RAII for cleanup when an exception escapes <code>main</code>.</p>
      <p><b>Destructors and noexcept:</b> since C++11 destructors are implicitly <code>noexcept</code>. If one throws while another exception is in flight, <code>std::terminate</code> is called. Corollary: a destructor that can fail (e.g. <code>fclose</code> flushing to a full disk) should swallow/log the error, and offer an explicit <code>close()</code> method that reports errors for callers who care.</p>
      <p><b>RAII limits:</b> objects with static storage are destroyed after <code>main</code> in reverse order of construction (cross-translation-unit order is unspecified — the "static destruction order fiasco"). <code>std::exit</code> skips locals' destructors; <code>std::abort</code>/<code>quick_exit</code>/a crash skip everything. Detached threads holding RAII objects may be killed mid-flight. Moved-from RAII objects must be left empty so their destructor does nothing.</p>`,
    aiEra: `<p><b>What AI changes:</b> asking an assistant to "make this exception-safe" usually produces RAII wrappers quickly, and it is good at writing boilerplate like a movable, non-copyable handle class. Code review bots flag <code>m.lock()</code> without a guard.</p>
      <p><b>Use AI as a partner:</b> <code>List every resource this function acquires and every exit path. Show which paths release which resource.</code> That table is a fast, checkable leak audit. Ask it to generate a fuzz/fault-injection test that makes each constructor throw once.</p>
      <p><b>Where AI goes wrong:</b> generated RAII classes often forget to delete the copy operations (double close on copy), forget to null the source in the move constructor, write a destructor that throws, or rely on initializer-list order instead of declaration order. <b>What you must own:</b> the destructor-order rules and the "who owns this after a copy/move?" question — five lines of a handle class decide whether the program is correct.</p>`,
    problems: [{
      title: 'Build a Movable, Non-Copyable Socket Handle', level: 'Medium', tags: ['RAII', 'rule of 5', 'move semantics'], companies: ['Bloomberg', 'Citadel', 'Microsoft'],
      statement: `<p>A C library gives you <code>int open_conn(const char* host)</code> (returns a handle ≥ 0, or -1 on failure) and <code>void close_conn(int h)</code>. Write a class <code>Conn</code> that: opens in its constructor (throws on failure), closes exactly once in its destructor, cannot be copied, can be moved (including into a <code>std::vector&lt;Conn&gt;</code>), and exposes <code>get()</code>.</p>`,
      constraints: `No leaks or double closes under any sequence of moves, self-move-assignment, or vector growth. Move operations must be <code>noexcept</code>.`,
      example: `<p><code>Conn a("db"); Conn b = std::move(a);</code> → ${H.c('g', 'b owns handle 3')}, ${H.c('m', 'a is empty (-1)')}. At scope end only <b>one</b> <code>close_conn(3)</code> runs.</p>`,
      brute: { why: `<p>The naive class has a destructor but keeps the compiler-generated copy: copying it copies the integer handle, so two objects close the same handle (a "double close" — on a real OS the second close may close a <b>different</b> connection that reused the number). It also has no move, so <code>vector</code> growth copies.</p>`, code: R`
        #include <stdexcept>
        static int nextHandle = 3;
        int open_conn(const char*) { return nextHandle++; }
        void close_conn(int) {}
        class ConnNaive {
            int h_;
        public:
            explicit ConnNaive(const char* host) : h_(open_conn(host)) { if (h_ < 0) throw std::runtime_error("open failed"); }
            ~ConnNaive() { close_conn(h_); }      // copies share h_ -> closed twice
            int get() const { return h_; }
        };
        int main() { ConnNaive a("db"); ConnNaive b = a; return b.get() == a.get() ? 0 : 1; }` },
      mcq: { q: 'Why must the move constructor set the source handle to -1?', options: ['So the moved-from object\'s destructor does not close the handle we now own', 'Because moves must always zero memory', 'To make the class copyable', 'It is required by std::vector only'], answer: 0, explain: 'The moved-from object is still destroyed later. Leaving it "empty" makes its destructor a no-op, so the handle is closed exactly once.' },
      hints: [`<p>Hint 1: The resource is the integer handle. Who owns it after <code>Conn b = std::move(a);</code>? Only <code>b</code> — so <code>a</code> must forget it.</p>`, `<p>Hint 2: <code>= delete</code> the copy constructor and copy assignment. Implement move constructor and move assignment with <code>std::exchange(o.h_, -1)</code>; mark them <code>noexcept</code> so <code>vector</code> moves instead of copying on growth.</p>`, `<p>Hint 3: In move assignment, release what <i>this</i> currently owns first, guard against self-move (<code>this != &amp;o</code>), then steal. Destructor: <code>if (h_ &gt;= 0) close_conn(h_);</code>.</p>`],
      solution: {
        approach: `<p>Classic Rule-of-5 handle: destructor releases if non-empty; copy deleted; move transfers and empties the source; all moves <code>noexcept</code>. Using <code>std::exchange</code> makes "take the value and leave a sentinel" a one-liner.</p>`,
        code: R`
          #include <iostream>
          #include <stdexcept>
          #include <utility>
          #include <vector>
          static int nextHandle = 3;
          int open_conn(const char*) { return nextHandle++; }
          void close_conn(int h) { std::cout << "close " << h << "\n"; }

          class Conn {
              int h_ = -1;
          public:
              explicit Conn(const char* host) : h_(open_conn(host)) {
                  if (h_ < 0) throw std::runtime_error("open failed");
              }
              ~Conn() { if (h_ >= 0) close_conn(h_); }
              Conn(const Conn&) = delete;
              Conn& operator=(const Conn&) = delete;
              Conn(Conn&& o) noexcept : h_(std::exchange(o.h_, -1)) {}
              Conn& operator=(Conn&& o) noexcept {
                  if (this != &o) {
                      if (h_ >= 0) close_conn(h_);       // drop what we had
                      h_ = std::exchange(o.h_, -1);      // take theirs, empty them
                  }
                  return *this;
              }
              int get() const noexcept { return h_; }
          };

          int main() {
              Conn a("db");                 // handle 3
              Conn b = std::move(a);        // b=3, a=-1
              std::vector<Conn> pool;
              pool.emplace_back("cache");   // handle 4
              pool.push_back(std::move(b)); // growth moves, never copies
              std::cout << a.get() << " " << pool[1].get() << "\n";   // -1 3
          }   // prints "close 4" and "close 3" once each; a closes nothing
        `,
        dry: { head: ['statement', 'a.h_', 'b.h_', 'pool', 'closes so far'], rows: [
          ['Conn a("db")', '3', '—', '[]', 'none'],
          ['Conn b = move(a)', '<span class="c-m">-1</span>', '3', '[]', 'none'],
          ['emplace_back("cache")', '-1', '3', '[4]', 'none'],
          ['push_back(move(b))', '-1', '<span class="c-m">-1</span>', '[4, 3]', 'none (moves only)'],
          ['end of main', 'no-op', 'no-op', 'elements destroyed', '<span class="c-g">close 4, close 3</span>']
        ] },
        complexity: `<p>All operations O(1). Size of <code>Conn</code> = one int. No heap allocation of its own.</p>`,
        followUps: ['Why does <code>vector</code> copy instead of move when the move constructor is not <code>noexcept</code>?', 'How would <code>std::unique_ptr&lt;int, Closer&gt;</code> or a custom deleter save you this code?', 'Add a <code>close()</code> method that reports errors — how does the destructor interact with it?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — unique_ptr: exclusive ownership
     ====================================================================== */
  function uniqueSim(input) {
    var DEF = 'make a Widget; make b Gadget; move a b; copy b c; release b; make a Lamp; reset a; end';
    var ops = splitOps(input, DEF);
    var vars = [], objs = [], seq = 0, frames = [], code = [];
    function v(n) { return vars.filter(function (x) { return x.name === n; })[0]; }
    function obj(id) { return objs.filter(function (o) { return o.id === id; })[0]; }
    function kill(id, why) { var o = obj(id); if (o && o.state === 'live') { o.state = 'dead'; o.why = why; } }
    function picture(hl, ehl) {
      var sb = vars.map(function (x) { return { id: 'V' + x.name, label: (x.raw ? (x.type || 'T') + '* ' : 'unique_ptr ') + x.name + (x.target ? '' : ' = nullptr') }; });
      var live = objs.filter(function (o) { return o.state !== 'gone'; });
      var hb = live.map(function (o) { return { id: 'O' + o.id, label: o.type + ' #' + o.id }; });
      var edges = [], tags = {}, h = {};
      vars.forEach(function (x) { if (x.target && obj(x.target) && obj(x.target).state === 'live') edges.push(['V' + x.name, 'O' + x.target]); if (x.raw) tags['V' + x.name] = 'raw owner!'; });
      live.forEach(function (o) {
        if (o.state === 'dead') { h['O' + o.id] = 'done'; tags['O' + o.id] = 'destroyed'; }
        if (o.state === 'leaked') { h['O' + o.id] = 'bad'; tags['O' + o.id] = 'LEAKED'; }
      });
      Object.keys(hl || {}).forEach(function (k) { h[k] = hl[k]; });
      var rows = vars.map(function (x) { var o = x.target && obj(x.target); return [x.name, x.raw ? 'raw pointer' : 'unique_ptr', o && o.state === 'live' ? o.type + ' #' + o.id : 'nullptr', x.raw ? '<span class="c-r">you must delete</span>' : (o ? 'yes (sole owner)' : '—')]; });
      return [memGraph('Each heap object has at most ONE unique_ptr arrow pointing at it', sb, hb, edges, h, ehl || {}, tags),
        { type: 'table', label: 'Ownership table', columns: ['variable', 'kind', 'points to', 'owns it?'], rows: rows.length ? rows : [['—', '—', '—', '—']] },
        { type: 'code', label: 'Code so far', lang: 'cpp', code: code.length ? code.join('\n') : '// (nothing yet)', hl: code.length ? one(code.length, 'cur') : {} }];
    }
    function sweep() { objs.forEach(function (o) { if (o.state === 'dead') o.state = 'gone'; }); }
    function decl(n) { var x = v(n); if (!x) { x = { name: okName(n), target: null }; vars.push(x); } return x; }
    frames.push({ narr: '<code>std::unique_ptr&lt;T&gt;</code> = "I am the <b>only</b> owner of this heap object; when I die (or am reset), I delete it." It is <b>move-only</b>: ownership can be handed over, never duplicated. Steps: <code>' + H.esc(ops.join('; ')) + '</code>', parts: picture() });
    ops.forEach(function (op) {
      sweep();
      var w = op.split(/\s+/), c = w[0].toLowerCase();
      if (c === 'make') {
        var x = decl(w[1]), ty = okName(w[2] || 'Widget'), old = x.target && obj(x.target);
        if (x.raw) throw new Error('"' + x.name + '" is a raw pointer in this demo — use a new name');
        if (objs.filter(function (o) { return o.state !== 'gone'; }).length >= 7) throw new Error('At most 7 live objects in this demo');
        seq++; objs.push({ id: seq, type: ty, state: 'live' });
        var hadOld = old && old.state === 'live' && !x.raw;
        if (hadOld) kill(old.id, 'replaced');
        x.target = seq;
        code.push((x.declared ? x.name + ' = ' : 'auto ' + x.name + ' = ') + 'std::make_unique<' + ty + '>();');
        x.declared = true;
        frames.push({ narr: '<code>make_unique&lt;' + ty + '&gt;()</code> allocates and constructs ' + ty + ' #' + seq + '; <b>' + H.esc(x.name) + '</b> owns it.' + (hadOld ? ' Because ' + H.esc(x.name) + ' already owned ' + old.type + ' #' + old.id + ', that old object is <b>deleted first</b> — assigning a new value to a unique_ptr never leaks.' : ''), parts: picture(one('O' + seq, 'ok')) });
      } else if (c === 'move') {
        var src = v(w[1]); if (!src) throw new Error('No variable "' + w[1] + '"');
        if (src.raw) throw new Error('"' + src.name + '" is a raw pointer — move works on unique_ptrs in this demo');
        var isNew = !v(w[2]), dst = decl(w[2]);
        if (dst.raw) throw new Error('"' + dst.name + '" is a raw pointer — choose a unique_ptr');
        var dOld = dst.target && obj(dst.target), hadD = dOld && dOld.state === 'live';
        if (hadD) kill(dOld.id, 'overwritten');
        dst.target = src.target; src.target = null;
        code.push((dst.declared ? dst.name + ' = ' : 'auto ' + dst.name + ' = ') + 'std::move(' + src.name + ');');
        dst.declared = true;
        frames.push({ narr: '<code>std::move(' + H.esc(src.name) + ')</code> hands ownership to <b>' + H.esc(dst.name) + '</b>: the pointer value is copied and <b>' + H.esc(src.name) + ' is set to nullptr</b>. The object itself does not move in memory — only the "who owns it" label moves.' + (hadD ? ' ' + H.esc(dst.name) + '\'s previous object (' + dOld.type + ' #' + dOld.id + ') is deleted first.' : ''), parts: picture(one('V' + dst.name, 'ok'), dst.target ? one('V' + dst.name + '-O' + dst.target, 'ok') : {}) });
      } else if (c === 'copy') {
        var s2 = v(w[1]); if (!s2) throw new Error('No variable "' + w[1] + '"');
        code.push('auto ' + okName(w[2]) + ' = ' + s2.name + ';   // ERROR');
        frames.push({ narr: '<span class="c-r"><b>Compile error:</b></span> <code>use of deleted function \'unique_ptr(const unique_ptr&amp;)\'</code>. Copying would create two owners → double delete. The compiler stops you <b>before</b> the bug exists. (This line is not executed; continue with move, or use shared_ptr if you really need shared ownership.)', parts: picture(one('V' + s2.name, 'bad')) });
        code.pop(); code.push('// auto ' + w[2] + ' = ' + s2.name + ';  <- rejected by the compiler');
      } else if (c === 'reset') {
        var r = v(w[1]); if (!r || r.raw) throw new Error('reset needs a unique_ptr name');
        var ro = r.target && obj(r.target);
        if (ro) kill(ro.id, 'reset');
        r.target = null;
        code.push(r.name + '.reset();');
        frames.push({ narr: '<code>' + H.esc(r.name) + '.reset()</code> deletes the owned object now (destructor runs immediately) and leaves ' + H.esc(r.name) + ' empty. Same as <code>' + H.esc(r.name) + ' = nullptr;</code>.' + (ro ? '' : ' It was already empty, so nothing happens.'), parts: picture(ro ? one('O' + ro.id, 'bad') : {}) });
      } else if (c === 'release') {
        var rl = v(w[1]); if (!rl || rl.raw) throw new Error('release needs a unique_ptr name');
        var rawName = 'raw_' + rl.name;
        if (v(rawName)) throw new Error('Already released ' + rl.name + ' once in this demo');
        vars.push({ name: rawName, target: rl.target, raw: true, type: rl.target ? obj(rl.target).type : 'T' });
        var tg = rl.target;
        code.push((tg ? obj(tg).type : 'Widget') + '* ' + rawName + ' = ' + rl.name + '.release();');
        rl.target = null;
        frames.push({ narr: '<code>release()</code> gives up ownership <b>without deleting</b>: it returns the raw pointer and sets ' + H.esc(rl.name) + ' to nullptr. Now <b>' + rawName + '</b> is a raw owner — somebody must <code>delete ' + rawName + '</code> or the object leaks. <span class="c-y">release() is for handing ownership to a C API or legacy code; it is NOT "free the memory" (that is reset).</span>', parts: picture(tg ? one('O' + tg, 'cur') : {}) });
      } else if (c === 'delete') {
        var d = v(w[1]); if (!d || !d.raw) throw new Error('delete works on the raw pointer from release, e.g. delete raw_b');
        if (d.target) kill(d.target, 'deleted');
        d.target = null;
        code.push('delete ' + d.name + ';');
        frames.push({ narr: 'Manual <code>delete ' + H.esc(d.name) + '</code> — the object is freed. This is the old-school way; every raw owner is a chance to forget.', parts: picture() });
      } else if (c === 'end') {
        var lost = [];
        for (var i = vars.length - 1; i >= 0; i--) {
          var x2 = vars[i];
          if (x2.raw) { if (x2.target && obj(x2.target).state === 'live') { obj(x2.target).state = 'leaked'; lost.push(obj(x2.target).type + ' #' + x2.target); } }
          else if (x2.target) kill(x2.target, 'scope end');
        }
        code.push('}   // end of scope');
        vars = [];
        frames.push({ narr: 'Scope ends: unique_ptrs are destroyed in reverse order, and each one deletes what it owns — no code written by you. ' + (lost.length ? '<span class="c-r"><b>Leaked:</b> ' + lost.join(', ') + ' — held only by a raw pointer from release(). Raw pointers have no destructor logic.</span>' : '<span class="c-g">Nothing leaked.</span>'), parts: picture() });
        sweep();
      } else throw new Error('Unknown step "' + op + '". Use: make X Type · move X Y · copy X Y · reset X · release X · delete raw_X · end');
    });
    sweep();
    frames.push({ narr: 'Summary: <b>make_unique</b> creates · <b>std::move</b> transfers · <b>reset</b> frees now · <b>release</b> gives up ownership (dangerous) · <b>copy</b> is a compile error · scope end frees automatically.', parts: picture() });
    return frames;
  }

  topics.push({
    title: 'std::unique_ptr: One Owner, Zero Overhead',
    analogy: `<p><b>A car with exactly one set of keys.</b> Whoever holds the keys owns the car. You can <i>hand</i> the keys to someone else (move) — then you no longer have them — but you cannot photocopy them (copy is forbidden). When the key-holder leaves town (goes out of scope), the car is sent to the scrapyard (deleted). You can still let a friend sit in the car (a raw pointer or reference to borrow it), but they never get the keys.</p>`,
    explain: `<p><code>std::unique_ptr&lt;T&gt;</code> (header <code>&lt;memory&gt;</code>) is a tiny object that holds one pointer and deletes it in its destructor. It models <b>exclusive ownership</b> and should be your <b>default</b> whenever you need something on the heap.</p>
      ${H.table(['Operation', 'Code', 'Effect'], [
        ['Create', '<code>auto p = std::make_unique&lt;Widget&gt;(args...);</code>', 'allocate + construct, p owns it'],
        ['Use', '<code>p-&gt;run(); (*p).run(); if (p) ...</code>', 'like a raw pointer; <code>bool</code> = "do I own something?"'],
        ['Borrow', '<code>Widget* raw = p.get(); Widget&amp; r = *p;</code>', 'non-owning access; p still owns'],
        ['Transfer', '<code>auto q = std::move(p);</code>', 'q owns, p becomes nullptr'],
        ['Free now', '<code>p.reset();</code> or <code>p = nullptr;</code>', 'deletes the object immediately'],
        ['Replace', '<code>p.reset(new Widget);</code> / <code>p = std::make_unique&lt;Widget&gt;();</code>', 'deletes the old one, owns the new one'],
        ['Give up', '<code>Widget* w = p.release();</code>', 'returns the pointer, does <b>not</b> delete — you own it now'],
        ['Copy', '<code>auto q = p;</code>', '<span class="c-r">compile error</span> (copy constructor is deleted)']
      ])}
      <p><b>Zero overhead:</b> with the default deleter, <code>sizeof(unique_ptr&lt;T&gt;) == sizeof(T*)</code> (8 bytes), and <code>-&gt;</code>/<code>*</code> compile to the same instructions as a raw pointer. You pay nothing for safety.</p>
      <p><b>Arrays:</b> <code>std::unique_ptr&lt;int[]&gt; a = std::make_unique&lt;int[]&gt;(n);</code> calls <code>delete[]</code> and offers <code>a[i]</code>. Usually <code>std::vector</code> is still better (it knows its size).</p>
      <p><b>How to pass it around (Herb Sutter's rules):</b></p>
      ${H.table(['Signature', 'Meaning'], [
        ['<code>void use(const Widget&amp; w)</code> or <code>void use(Widget* w)</code>', 'I only <b>borrow</b> it (most functions!). Caller passes <code>*p</code> or <code>p.get()</code>.'],
        ['<code>void take(std::unique_ptr&lt;Widget&gt; w)</code>', '<b>Sink</b>: I take ownership. Caller writes <code>take(std::move(p))</code>.'],
        ['<code>void reseat(std::unique_ptr&lt;Widget&gt;&amp; w)</code>', 'I may replace/reset the caller\'s pointer.'],
        ['<code>std::unique_ptr&lt;Widget&gt; make()</code>', '<b>Factory</b>: caller receives ownership (no std::move needed on return).']
      ])}
      <p><b>Polymorphism:</b> <code>std::unique_ptr&lt;Base&gt; p = std::make_unique&lt;Derived&gt;();</code> works, but <code>Base</code> <b>must have a virtual destructor</b>, otherwise only <code>~Base</code> runs (UB). A <code>std::vector&lt;std::unique_ptr&lt;Shape&gt;&gt;</code> is the standard way to own a collection of polymorphic objects.</p>`,
    clues: [
      '"Exactly one owner" / "transfer ownership" / "factory returns a new object" → <code>std::unique_ptr</code>',
      '"Store polymorphic objects in a container" → <code>std::vector&lt;std::unique_ptr&lt;Base&gt;&gt;</code> (and a virtual destructor)',
      '"error: use of deleted function unique_ptr(const unique_ptr&amp;)" → you tried to copy; use <code>std::move</code> or pass by reference',
      'A class with a raw owning pointer member + hand-written destructor/copy → replace with a <code>unique_ptr</code> member (Rule of Zero)',
      '"Implement your own smart pointer" → classic interview: unique_ptr with move ctor/assign, deleted copy, release/reset/get',
      'Tree/linked list where each node owns its children → <code>unique_ptr</code> child links, raw parent pointer'
    ],
    code: [R`
      #include <iostream>
      #include <memory>
      #include <string>
      #include <vector>

      struct Shape {
          virtual ~Shape() = default;                     // REQUIRED for delete via Base*
          virtual std::string name() const = 0;
      };
      struct Circle : Shape { std::string name() const override { return "circle"; } };
      struct Square : Shape { std::string name() const override { return "square"; } };

      std::unique_ptr<Shape> makeShape(char c) {          // factory: returns ownership
          if (c == 'c') return std::make_unique<Circle>();
          return std::make_unique<Square>();
      }
      void print(const Shape& s) { std::cout << s.name() << "\n"; }           // borrow
      void archive(std::unique_ptr<Shape> s) { std::cout << "archived " << s->name() << "\n"; } // sink

      int main() {
          std::vector<std::unique_ptr<Shape>> scene;
          scene.push_back(makeShape('c'));
          scene.push_back(makeShape('s'));
          for (const auto& s : scene) print(*s);          // borrow each

          auto first = std::move(scene[0]);               // scene[0] is now nullptr
          archive(std::move(first));                      // deleted at end of archive()
          std::cout << (scene[0] == nullptr) << " " << (first == nullptr) << "\n";   // 1 1

          auto arr = std::make_unique<int[]>(5);          // delete[] is used automatically
          arr[4] = 42;
          std::cout << sizeof(std::unique_ptr<Shape>) << "\n";   // 8: same as a raw pointer
      }
    `],
    codeTitle: ['unique_ptr in practice: factory, borrow, sink, containers, arrays'],
    viz: {
      title: 'unique_ptr ownership transfers (make · move · copy · reset · release · end)',
      input: 'make a Widget; make b Gadget; move a b; copy b c; release b; make a Lamp; reset a; end',
      inputLabel: 'Steps: make X Type · move X Y · copy X Y · reset X · release X · delete raw_X · end',
      gen: uniqueSim
    },
    examples: [
      { title: 'Rule of Zero: replace a raw owning member', html: `<p>Before: a class with <code>Engine* engine_</code>, a destructor, and (if done right) copy/move code — 25 lines and easy to get wrong. After: a <code>std::unique_ptr&lt;Engine&gt;</code> member and <b>no</b> special member functions. The class becomes move-only automatically, which is exactly right for something that owns a unique resource.</p>`, code: R`
        #include <memory>
        struct Engine { int hp = 300; };
        class Car {
            std::unique_ptr<Engine> engine_ = std::make_unique<Engine>();
        public:
            int hp() const { return engine_->hp; }
            // no destructor, no copy/move code: Rule of Zero
        };
        int main() {
            Car a;
            Car b = std::move(a);         // OK: moves the engine
            // Car c = b;                 // compile error: Car is move-only
            return b.hp() == 300 ? 0 : 1;
        }` },
      { title: 'A tree that owns its children', html: `<p>Each node owns its children through <code>unique_ptr</code>; a child refers back to its parent through a <b>raw, non-owning</b> pointer (the parent always outlives its children, so the raw pointer can never dangle). Destroying the root destroys the whole tree: the parent's destructor body runs first, then its members (the children vector) are destroyed, recursively.</p>`, code: R`
        #include <iostream>
        #include <memory>
        #include <vector>
        struct TNode {
            int val;
            TNode* parent = nullptr;                          // observer, never deletes
            std::vector<std::unique_ptr<TNode>> kids;         // owners
            explicit TNode(int v) : val(v) {}
            TNode* add(int v) {
                kids.push_back(std::make_unique<TNode>(v));
                kids.back()->parent = this;
                return kids.back().get();
            }
        };
        int main() {
            auto root = std::make_unique<TNode>(1);
            TNode* two = root->add(2);
            two->add(4);
            root->add(3);
            std::cout << two->kids[0]->parent->parent->val << "\n";   // 1
        }   // whole tree freed by root's destructor` },
      { title: 'Passing unique_ptr: which signature?', html: `${H.table(['You want to…', 'Write', 'Call site'], [['just read/modify the object', '<code>void f(Widget&amp;)</code>', '<code>f(*p)</code>'], ['maybe receive "nothing"', '<code>void f(Widget*)</code>', '<code>f(p.get())</code>'], ['take ownership', '<code>void f(unique_ptr&lt;Widget&gt;)</code>', '<code>f(std::move(p))</code>'], ['replace the caller\'s object', '<code>void f(unique_ptr&lt;Widget&gt;&amp;)</code>', '<code>f(p)</code>'], ['<span class="c-r">avoid</span>', '<code>void f(const unique_ptr&lt;Widget&gt;&amp;)</code>', 'adds nothing over <code>Widget*</code>, ties callers to unique_ptr']])}` },
      { title: 'Why not just "new" inside unique_ptr\'s constructor?', html: `<p><code>std::unique_ptr&lt;Widget&gt; p(new Widget);</code> is legal and safe on its own. <code>make_unique</code> is still preferred: it never repeats the type, never shows a naked <code>new</code> (easy to grep for in code review), and before C++17 it was the only exception-safe way to create two smart pointers in one function-call expression. One exception: you need a custom deleter, which <code>make_unique</code> cannot take.</p>` }
    ],
    deepDive: `<p><b>Implementation sketch:</b> <code>template&lt;class T, class D = std::default_delete&lt;T&gt;&gt; class unique_ptr</code> stores the pointer and the deleter. With an empty (stateless) deleter, libstdc++ stores them in a <code>std::tuple</code> and the empty base optimisation (or <code>[[no_unique_address]]</code>) makes the deleter take zero bytes — hence 8 bytes total. A function-pointer deleter makes it 16 bytes; a capturing lambda adds its captures.</p>
      <p><b>Move semantics inside:</b> the move constructor is roughly <code>ptr_ = std::exchange(other.ptr_, nullptr)</code> and is <code>noexcept</code>, which matters: <code>std::vector&lt;unique_ptr&lt;T&gt;&gt;</code> can grow by moving. <code>reset(q)</code> is carefully ordered — store the new pointer first, then delete the old — so it is safe even if the old object's destructor somehow reaches back into the unique_ptr.</p>
      <p><b>Incomplete types and pimpl:</b> <code>unique_ptr&lt;Impl&gt;</code> can be declared with <code>Impl</code> only forward-declared, but the destructor must be defined where <code>Impl</code> is complete (declare <code>~Widget();</code> in the header, define <code>Widget::~Widget() = default;</code> in the .cpp). Otherwise you get "invalid application of sizeof to incomplete type". <code>shared_ptr</code> does not have this restriction because its deleter is captured at construction.</p>
      <p><b>Pitfalls:</b> (1) two unique_ptrs built from the same raw pointer → double delete; (2) <code>unique_ptr&lt;T&gt;</code> holding a <code>new T[n]</code> → wrong delete; (3) <code>release()</code> without taking ownership of the result → leak; (4) dangling <code>get()</code> pointers after the owner resets; (5) recursion depth when destroying a very long linked list of <code>unique_ptr</code> nodes (each destructor calls the next) — write an iterative destructor for lists with millions of nodes.</p>`,
    aiEra: `<p><b>What AI changes:</b> "modernise this file to smart pointers" is a task assistants now do well mechanically: replace <code>T* x = new T</code> with <code>auto x = std::make_unique&lt;T&gt;()</code>, delete matching <code>delete</code>s, change members to <code>unique_ptr</code>. Clang-tidy's <code>modernize-make-unique</code> does part of it deterministically.</p>
      <p><b>Use AI as a partner:</b> let it do the mechanical rewrite, then ask <code>For each function signature taking a unique_ptr, is it a sink, a reseat or just a borrow? Suggest the right parameter type.</code> Ask it for the ownership diagram of a class hierarchy.</p>
      <p><b>Where AI goes wrong:</b> it passes <code>const std::unique_ptr&lt;T&gt;&amp;</code> everywhere, converts everything to <code>shared_ptr</code> "to be safe", forgets the virtual destructor on the base class, or uses <code>release()</code> where it meant <code>reset()</code> (silently creating a leak). <b>What you must own:</b> deciding who owns what — the AI cannot know your system's lifetimes; you can.</p>`,
    problems: [{
      title: 'Implement Your Own UniquePtr<T>', level: 'Medium', tags: ['unique_ptr', 'move semantics', 'rule of 5', 'templates'], companies: ['Google', 'Meta', 'Nvidia', 'Jane Street'],
      statement: `<p>Implement <code>template&lt;class T&gt; class UniquePtr</code> with: constructor from <code>T*</code> (explicit), destructor, deleted copy, move constructor and move assignment, <code>get()</code>, <code>release()</code>, <code>reset(T* = nullptr)</code>, <code>operator*</code>, <code>operator-&gt;</code>, <code>explicit operator bool</code>, plus a helper <code>makeUnique&lt;T&gt;(args...)</code>.</p>`,
      constraints: `No leaks or double deletes under any sequence of operations, including self-move-assignment and <code>reset(get())</code>-style misuse should at least not double-free on the normal path. Moves must be <code>noexcept</code>.`,
      example: `<p><code>auto a = makeUnique&lt;int&gt;(5); UniquePtr&lt;int&gt; b = std::move(a);</code> → ${H.c('g', '*b == 5')}, ${H.c('m', 'a.get() == nullptr')}. <code>b.reset(new int(7));</code> deletes the 5, owns the 7.</p>`,
      brute: { why: `<p>A first attempt often forgets to delete the copy operations (two owners → double delete), forgets to null the source on move, or in move assignment overwrites <code>ptr_</code> before deleting the old object (leak) — or deletes the object when <code>this == &amp;other</code> (use-after-free on self-move).</p>`, code: R`
        template <class T>
        class UniquePtrNaive {
            T* p_;
        public:
            explicit UniquePtrNaive(T* p = nullptr) : p_(p) {}
            ~UniquePtrNaive() { delete p_; }
            // BUG: implicit copy constructor copies p_ -> double delete
            T* get() const { return p_; }
        };
        int main() { UniquePtrNaive<int> a(new int(1)); return *a.get() - 1; }` },
      mcq: { q: 'In <code>reset(T* q)</code>, why store the new pointer before deleting the old one?', options: ['If the old object\'s destructor touches this smart pointer, it sees a consistent state', 'It is faster', 'delete requires the pointer to be null', 'It avoids calling the constructor twice'], answer: 0, explain: 'The standard specifies: old = ptr; ptr = q; if (old) delete old. Updating first means re-entrancy during the destructor cannot observe a dangling ptr.' },
      hints: [`<p>Hint 1: The class holds one <code>T* p_</code>. Ownership invariant: if <code>p_</code> is non-null, this object must delete it exactly once.</p>`, `<p>Hint 2: Copy = <code>delete</code>d. Move ctor: <code>p_(std::exchange(o.p_, nullptr))</code>. Move assignment: <code>reset(o.release())</code> handles "delete old, take new" and is self-move safe.</p>`, `<p>Hint 3: <code>release()</code>: return <code>std::exchange(p_, nullptr)</code>. <code>reset(q)</code>: <code>T* old = std::exchange(p_, q); delete old;</code>. <code>makeUnique</code>: <code>return UniquePtr&lt;T&gt;(new T(std::forward&lt;Args&gt;(args)...));</code></p>`],
      solution: {
        approach: `<p>Keep one invariant — non-null means owned — and route every ownership change through two primitives: <code>release()</code> (give up without deleting) and <code>reset()</code> (replace and delete the old). Move assignment becomes <code>reset(other.release())</code>, which is automatically correct for self-move.</p>`,
        code: R`
          #include <cassert>
          #include <utility>

          template <class T>
          class UniquePtr {
              T* p_ = nullptr;
          public:
              constexpr UniquePtr() noexcept = default;
              explicit UniquePtr(T* p) noexcept : p_(p) {}
              ~UniquePtr() { delete p_; }

              UniquePtr(const UniquePtr&) = delete;
              UniquePtr& operator=(const UniquePtr&) = delete;

              UniquePtr(UniquePtr&& o) noexcept : p_(std::exchange(o.p_, nullptr)) {}
              UniquePtr& operator=(UniquePtr&& o) noexcept {
                  reset(o.release());                 // self-move: release then reset same ptr -> no delete
                  return *this;
              }

              T* get() const noexcept { return p_; }
              T* release() noexcept { return std::exchange(p_, nullptr); }
              void reset(T* q = nullptr) noexcept {
                  T* old = std::exchange(p_, q);      // update first, then delete
                  delete old;
              }
              T& operator*() const { return *p_; }
              T* operator->() const noexcept { return p_; }
              explicit operator bool() const noexcept { return p_ != nullptr; }
          };

          template <class T, class... Args>
          UniquePtr<T> makeUnique(Args&&... args) {
              return UniquePtr<T>(new T(std::forward<Args>(args)...));
          }

          int main() {
              auto a = makeUnique<int>(5);
              UniquePtr<int> b = std::move(a);
              assert(!a && *b == 5);
              b.reset(new int(7));          // deletes 5
              assert(*b == 7);
              b = std::move(b);             // self-move: still owns 7
              assert(b && *b == 7);
              int* raw = b.release();       // we own it now
              delete raw;
          }
        `,
        dry: { head: ['statement', 'a.p_', 'b.p_', 'heap'], rows: [
          ['a = makeUnique(5)', '&amp;5', '—', '{5}'],
          ['b = move(a)', 'null', '&amp;5', '{5}'],
          ['b.reset(new int(7))', 'null', '&amp;7', '{7} — 5 deleted'],
          ['b = move(b)', 'null', '&amp;7', 'release() → p_=null, reset(&amp;7) → p_=&amp;7, old=null'],
          ['raw = b.release(); delete raw', 'null', 'null', '{} — nothing leaked']
        ] },
        complexity: `<p>Every operation O(1); object size = one pointer. Same as <code>std::unique_ptr</code> with the default deleter.</p>`,
        followUps: ['Add a second template parameter for a custom deleter with zero size when the deleter is empty (<code>[[no_unique_address]]</code>).', 'Add a partial specialisation <code>UniquePtr&lt;T[]&gt;</code> using <code>delete[]</code> and <code>operator[]</code>.', 'Allow converting <code>UniquePtr&lt;Derived&gt;</code> to <code>UniquePtr&lt;Base&gt;</code>.']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — shared_ptr: control block and reference counts
     ====================================================================== */
  function sharedSim(input) {
    var DEF = 'make a Widget; copy a b; copy b c; weak w a; reset a; move b d; lock w s; reset c; reset d; reset s; lock w t; drop w';
    var ops = splitOps(input, DEF);
    var vars = [], cbs = [], seq = 0, frames = [];
    function v(n) { return vars.filter(function (x) { return x.name === n; })[0]; }
    function cb(id) { return cbs.filter(function (c) { return c.id === id; })[0]; }
    function decl(n, kind) {
      var x = v(n);
      if (!x) { x = { name: okName(n), kind: kind, cb: null }; vars.push(x); }
      if (x.kind !== kind) throw new Error('"' + n + '" is a ' + (x.kind === 'sp' ? 'shared_ptr' : 'weak_ptr') + ' — use another name');
      return x;
    }
    var events = [];
    function dropStrong(c) {
      c.strong--;
      if (c.strong === 0) {
        if (c.obj === 'live') { c.obj = 'dead'; events.push('<span class="c-r">use_count hit 0 → ' + c.type + ' destructor runs' + (c.alloc === 1 ? ' (but the memory block is shared with the control block, so the bytes stay until weak count is 0 too)' : ' and the object\'s memory is freed') + '.</span>'); }
        else if (c.obj === 'dead') { c.obj = 'double'; events.push('<span class="c-r"><b>DOUBLE DELETE!</b> A second control block also reached 0 and deletes the same object again → undefined behavior (crash).</span>'); }
        if (c.weak === 0) { c.alive = false; events.push('weak count is 0 too → the <b>control block is freed</b>.'); }
      }
    }
    function dropWeak(c) { c.weak--; if (c.weak === 0 && c.strong === 0) { c.alive = false; events.push('Last weak_ptr gone and use_count is 0 → the <b>control block is freed</b>.'); } }
    function release(x) {
      if (!x.cb) return;
      var c = cb(x.cb); x.cb = null;
      if (x.kind === 'sp') dropStrong(c); else dropWeak(c);
    }
    function picture(hl, ehl) {
      var sb = vars.map(function (x) { return { id: 'V' + x.name, label: (x.kind === 'sp' ? 'shared_ptr ' : 'weak_ptr ') + x.name + (x.cb ? '' : ' (empty)') }; });
      var hb = [], edges = [], h = {}, tags = {};
      cbs.forEach(function (c) {
        if (!c.alive && c.shown) return;
        hb.push({ id: 'C' + c.id, label: 'ctrl block #' + c.id + ': use=' + c.strong + ' weak=' + c.weak });
        hb.push({ id: 'O' + c.id, label: c.type + (c.alloc === 1 ? ' (same block)' : ' (own block)') });
        edges.push(['C' + c.id, 'O' + c.id]);
        if (!c.alive) { h['C' + c.id] = 'done'; tags['C' + c.id] = 'freed'; c.shown = true; }
        if (c.obj === 'dead') { h['O' + c.id] = 'done'; tags['O' + c.id] = 'destroyed'; }
        if (c.obj === 'double') { h['O' + c.id] = 'bad'; tags['O' + c.id] = 'DOUBLE DELETE'; }
        if (c.twinOf) tags['C' + c.id] = '2nd block, same object!';
      });
      vars.forEach(function (x) {
        if (x.cb) edges.push(['V' + x.name, 'C' + x.cb]);
        if (x.kind === 'wp') tags['V' + x.name] = x.cb && cb(x.cb).strong === 0 ? 'expired' : 'observer';
      });
      Object.keys(hl || {}).forEach(function (k) { h[k] = hl[k]; });
      var rows = cbs.filter(function (c) { return c.alive || !c.shownT; }).map(function (c) {
        if (!c.alive) c.shownT = true;
        return ['#' + c.id + (c.alive ? '' : ' (freed)'), c.strong, c.weak, c.obj === 'live' ? c.type + ' alive' : (c.obj === 'double' ? '<span class="c-r">deleted twice</span>' : 'destroyed'), c.alloc === 1 ? '1 (make_shared)' : '2 (new + block)'];
      });
      var vals = {};
      vars.forEach(function (x) { vals[x.name + (x.kind === 'sp' ? '.use_count()' : '.expired()')] = x.kind === 'sp' ? (x.cb ? cb(x.cb).strong : 0) : (!x.cb || cb(x.cb).strong === 0 ? 'true' : 'false'); });
      return [memGraph('Every shared_ptr/weak_ptr points at a CONTROL BLOCK that holds the counts and manages the object', sb, hb, edges, h, ehl || {}, tags),
        { type: 'table', label: 'Control blocks', columns: ['block', 'use_count (strong)', 'weak_ptrs', 'object', 'heap allocations'], rows: rows.length ? rows : [['—', 0, 0, '—', '—']] },
        { type: 'vars', label: 'What each variable would report', vals: Object.keys(vals).length ? vals : { '(no variables yet)': '' } }];
    }
    frames.push({ narr: '<code>std::shared_ptr</code> = <b>shared ownership</b>. Many shared_ptrs can own one object; a hidden <b>control block</b> counts them (<code>use_count</code>). The object dies when the count reaches 0. <code>weak_ptr</code>s watch without owning (they bump a separate weak count). Steps: <code>' + H.esc(ops.join('; ')) + '</code>', parts: picture() });
    ops.forEach(function (op) {
      events = [];
      var w = op.split(/\s+/), c = w[0].toLowerCase(), narr = '', hl = {}, x, s, cbx;
      if (cbs.filter(function (k) { return k.alive; }).length > 4) throw new Error('At most 5 control blocks in this demo');
      if (c === 'make' || c === 'new') {
        x = decl(w[1], 'sp'); release(x); seq++;
        cbs.push({ id: seq, strong: 1, weak: 0, type: okName(w[2] || 'Widget'), obj: 'live', alive: true, alloc: c === 'make' ? 1 : 2 });
        x.cb = seq;
        narr = c === 'make' ? '<code>auto ' + H.esc(x.name) + ' = std::make_shared&lt;' + H.esc(w[2] || 'Widget') + '&gt;();</code> — <b>one</b> heap allocation holds the control block <i>and</i> the object side by side. use_count = 1.'
          : '<code>std::shared_ptr&lt;' + H.esc(w[2] || 'Widget') + '&gt; ' + H.esc(x.name) + '(new ' + H.esc(w[2] || 'Widget') + ');</code> — <b>two</b> allocations: one by your <code>new</code> for the object, one by shared_ptr for the control block. use_count = 1.';
        hl['C' + seq] = 'ok'; hl['O' + seq] = 'ok';
      } else if (c === 'copy') {
        s = v(w[1]); if (!s || s.kind !== 'sp') throw new Error('copy needs a shared_ptr source, e.g. copy a b');
        x = decl(w[2], 'sp'); if (x === s) throw new Error('Copy into a different name');
        release(x);
        if (s.cb) { x.cb = s.cb; cb(s.cb).strong++; }
        narr = '<code>' + H.esc(x.name) + ' = ' + H.esc(s.name) + ';</code> copies the shared_ptr: both point at the same control block and use_count goes <b>up by 1</b> (an <i>atomic</i> increment, so it is thread-safe — and costs ~a few ns).';
        if (x.cb) hl['C' + x.cb] = 'cur';
      } else if (c === 'move') {
        s = v(w[1]); if (!s || s.kind !== 'sp') throw new Error('move needs a shared_ptr source');
        x = decl(w[2], 'sp'); if (x === s) throw new Error('Move into a different name');
        release(x);
        x.cb = s.cb; s.cb = null;
        narr = '<code>' + H.esc(x.name) + ' = std::move(' + H.esc(s.name) + ');</code> — ownership is <b>transferred</b>, so use_count does <b>not</b> change and no atomic operation is needed. ' + H.esc(s.name) + ' is now empty. Prefer moving a shared_ptr when you no longer need the source.';
        if (x.cb) hl['V' + x.name] = 'ok';
      } else if (c === 'reset') {
        x = v(w[1]); if (!x || x.kind !== 'sp') throw new Error('reset needs a shared_ptr name');
        cbx = x.cb; release(x);
        narr = '<code>' + H.esc(x.name) + '.reset();</code> — this owner lets go: use_count goes <b>down by 1</b>' + (cbx ? ' to ' + cb(cbx).strong + '.' : ' (it was already empty, nothing happens).');
        if (cbx) hl['C' + cbx] = 'cur';
      } else if (c === 'weak') {
        s = v(w[2]); if (!s || s.kind !== 'sp') throw new Error('weak needs: weak W SHARED, e.g. weak w a');
        x = decl(w[1], 'wp'); release(x);
        if (s.cb) { x.cb = s.cb; cb(s.cb).weak++; }
        narr = '<code>std::weak_ptr&lt;T&gt; ' + H.esc(x.name) + ' = ' + H.esc(s.name) + ';</code> — an <b>observer</b>. use_count is unchanged; only the weak count goes up. A weak_ptr cannot be dereferenced directly; it keeps the <b>control block</b> alive, not the object.';
        if (x.cb) hl['V' + x.name] = 'ok';
      } else if (c === 'lock') {
        s = v(w[1]); if (!s || s.kind !== 'wp') throw new Error('lock needs: lock WEAK SHARED, e.g. lock w s');
        x = decl(w[2], 'sp'); release(x);
        if (s.cb && cb(s.cb).strong > 0) { x.cb = s.cb; cb(s.cb).strong++; narr = '<code>auto ' + H.esc(x.name) + ' = ' + H.esc(s.name) + '.lock();</code> — the object is still alive, so lock() returns a real shared_ptr and use_count goes up. While ' + H.esc(x.name) + ' exists the object cannot die under us — this is the safe way to use a weak_ptr.'; hl['V' + x.name] = 'ok'; }
        else { narr = '<code>auto ' + H.esc(x.name) + ' = ' + H.esc(s.name) + '.lock();</code> — <span class="c-y">the object is already gone (expired)</span>, so lock() returns an <b>empty</b> shared_ptr. Always check: <code>if (auto sp = w.lock()) { ... }</code>.'; hl['V' + x.name] = 'bad'; }
      } else if (c === 'drop') {
        x = v(w[1]); if (!x || x.kind !== 'wp') throw new Error('drop needs a weak_ptr name');
        cbx = x.cb; release(x);
        narr = '<code>' + H.esc(x.name) + '.reset();</code> — the weak_ptr stops observing; weak count goes down.';
        if (cbx && cb(cbx).alive) hl['C' + cbx] = 'cur';
      } else if (c === 'fromraw') {
        s = v(w[1]); if (!s || s.kind !== 'sp' || !s.cb) throw new Error('fromraw needs a non-empty shared_ptr: fromraw a b');
        x = decl(w[2], 'sp'); release(x); seq++;
        var src = cb(s.cb);
        cbs.push({ id: seq, strong: 1, weak: 0, type: src.type, obj: 'live', alive: true, alloc: 2, twinOf: src.id, twin: src });
        x.cb = seq;
        src.twinned = seq;
        narr = '<span class="c-r"><b>Classic bug:</b></span> <code>std::shared_ptr&lt;T&gt; ' + H.esc(x.name) + '(' + H.esc(s.name) + '.get());</code> creates a <b>second control block</b> for an object that already has one. The two blocks do not know about each other: each thinks it is the only manager. When both counts reach 0 the object is deleted <b>twice</b>. (Same bug: <code>shared_ptr&lt;T&gt;(this)</code> — use <code>enable_shared_from_this</code>.)';
        hl['C' + seq] = 'bad';
      } else if (c === 'end') {
        for (var i = vars.length - 1; i >= 0; i--) release(vars[i]);
        narr = 'Scope ends: every shared_ptr and weak_ptr is destroyed (in reverse order), each one decrementing its count.';
      } else throw new Error('Unknown step "' + op + '". Use: make X T · new X T · copy X Y · move X Y · reset X · weak W X · lock W Y · drop W · fromraw X Y · end');
      // propagate the double-delete link: twin blocks share one real object
      cbs.forEach(function (k) { if (k.twin && k.obj !== 'live' && k.twin.obj === 'dead' && !k.flagged) { k.flagged = true; } });
      cbs.forEach(function (k) {
        if (k.twin) {
          var a = k.twin;
          if (k.obj === 'dead' && a.obj === 'dead' && !k.reported) { k.reported = true; k.obj = 'double'; a.obj = 'double'; events.push('<span class="c-r"><b>DOUBLE DELETE!</b> Both control blocks reached use_count 0 and each deleted the same object → undefined behavior (typically a crash in free()).</span>'); }
          else if ((k.obj === 'dead') !== (a.obj === 'dead') && !k.warned) { k.warned = true; events.push('<span class="c-y">One control block deleted the object while the other still "owns" it — every shared_ptr on the other block is now dangling.</span>'); }
        }
      });
      frames.push({ narr: narr + (events.length ? ' ' + events.join(' ') : ''), parts: picture(hl) });
    });
    frames.push({ narr: 'Recap: <b>copy</b> → use_count+1 · <b>move</b> → no change · <b>reset/destroy</b> → use_count−1 · use_count 0 → <b>object destroyed</b> · use_count 0 <i>and</i> no weak_ptrs → <b>control block freed</b>. Try <code>make a; fromraw a b; reset a; reset b</code> to see the double-control-block bug.', parts: picture() });
    return frames;
  }

  topics.push({
    title: 'std::shared_ptr: Control Block, Reference Counting and Its Real Costs',
    analogy: `<p><b>A shared apartment with a sign-in sheet on the fridge.</b> Several roommates (shared_ptrs) live in the same apartment (the object). The sheet on the fridge (the control block) counts how many roommates still live there. Each new roommate signs in (+1); each one who moves out signs off (−1). When the last roommate leaves (count 0), the landlord clears the apartment (destructor). Neighbours who just keep an eye on the place (weak_ptrs) are tracked on a separate list — they never stop it from being cleared.</p>`,
    explain: `<p><code>std::shared_ptr&lt;T&gt;</code> lets <b>several owners</b> share one object. It is two pointers wide (16 bytes):</p>
      ${H.table(['Inside a shared_ptr', 'Points to'], [['pointer #1', 'the object (so <code>-&gt;</code> is one hop)'], ['pointer #2', 'the <b>control block</b> — a separate heap structure that holds: <b>use_count</b> (strong owners), <b>weak count</b>, the deleter, and the allocator']])}
      <p><b>The counting rules:</b></p>
      ${H.table(['Action', 'use_count', 'weak count'], [
        ['<code>auto a = std::make_shared&lt;W&gt;()</code>', '1', '0'],
        ['<code>auto b = a;</code> (copy)', '+1 (atomic)', '—'],
        ['<code>auto c = std::move(a);</code>', 'unchanged (a becomes empty)', '—'],
        ['<code>b.reset();</code> / b destroyed', '−1 (atomic)', '—'],
        ['<code>std::weak_ptr&lt;W&gt; w = c;</code>', '—', '+1'],
        ['use_count reaches 0', '<b>object destroyed</b>', 'control block survives while weak &gt; 0'],
        ['use_count 0 and weak 0', '—', '<b>control block freed</b>']
      ])}
      <p><b>make_shared vs <code>shared_ptr&lt;T&gt;(new T)</code>:</b> <code>make_shared</code> does <b>one</b> allocation that holds the control block and the object together — faster and more cache-friendly. <code>new</code> + shared_ptr does <b>two</b>.</p>
      <p><b>Thread safety, precisely:</b> the <i>reference count</i> updates are atomic, so different threads can copy/destroy their <b>own</b> shared_ptr copies to the same object safely. But (1) the <b>object</b> itself is not protected — you still need a mutex for its data; (2) one single shared_ptr <i>variable</i> read and written by two threads is a data race — use <code>std::atomic&lt;std::shared_ptr&lt;T&gt;&gt;</code> (C++20).</p>
      <p><b>When to use it:</b> only when ownership is genuinely shared and the last user is not known in advance — e.g. a cached resource used by several requests, a node in a graph owned by many, an object captured by async callbacks that may outlive the caller. If one owner is clear, use <code>unique_ptr</code> (you can always convert a <code>unique_ptr</code> into a <code>shared_ptr</code> later: <code>std::shared_ptr&lt;T&gt; s = std::move(u);</code>).</p>
      <p><b>The two classic bugs:</b> (1) creating two shared_ptrs from the same raw pointer → two control blocks → double delete; (2) <code>shared_ptr&lt;T&gt;(this)</code> inside a member function → same thing. Fix for (2): inherit <code>std::enable_shared_from_this&lt;T&gt;</code> and call <code>shared_from_this()</code>.</p>`,
    clues: [
      '"Multiple owners" / "last one out turns off the lights" / "object used by several async callbacks" → <code>shared_ptr</code>',
      '"What is in a control block?" / "how big is a shared_ptr?" → use_count, weak count, deleter, allocator; 16 bytes',
      '"Is shared_ptr thread-safe?" → the count is atomic; the object and the shared_ptr variable itself are not',
      '"Callback needs to keep <code>this</code> alive" → <code>enable_shared_from_this</code> + <code>shared_from_this()</code>',
      '"Two shared_ptrs created from the same raw pointer" / "crash in the destructor of the second shared_ptr" → two control blocks, double delete',
      '"Pass shared_ptr by value or by const&amp;?" → by value only when the callee keeps a copy; otherwise pass <code>T&amp;</code>/<code>const T&amp;</code>'
    ],
    code: [R`
      #include <iostream>
      #include <memory>
      #include <string>
      struct Texture {
          std::string file;
          explicit Texture(std::string f) : file(std::move(f)) { std::cout << "load " << file << "\n"; }
          ~Texture() { std::cout << "unload " << file << "\n"; }
      };
      int main() {
          auto a = std::make_shared<Texture>("grass.png");   // use_count 1
          {
              auto b = a;                                      // use_count 2
              std::shared_ptr<Texture> c = b;                  // use_count 3
              std::cout << a.use_count() << "\n";              // 3
              auto d = std::move(c);                           // still 3 (c empty)
              std::cout << a.use_count() << " " << (c == nullptr) << "\n";   // 3 1
          }                                                    // b and d die -> 1
          std::cout << a.use_count() << "\n";                  // 1
          std::weak_ptr<Texture> w = a;                        // weak observer
          a.reset();                                           // "unload grass.png"
          std::cout << w.expired() << "\n";                    // 1
      }
    `, R`
      #include <functional>
      #include <iostream>
      #include <memory>
      #include <vector>
      // enable_shared_from_this: give callbacks an owning reference to *this.
      class Session : public std::enable_shared_from_this<Session> {
          int id_;
      public:
          explicit Session(int id) : id_(id) {}
          std::function<void()> makeCallback() {
              auto self = shared_from_this();                  // NOT shared_ptr<Session>(this)
              return [self] { std::cout << "session " << self->id_ << " still alive\n"; };
          }
      };
      int main() {
          std::vector<std::function<void()>> pending;
          {
              auto s = std::make_shared<Session>(42);          // must already be owned by a shared_ptr
              pending.push_back(s->makeCallback());
          }                                                    // s gone, but the callback keeps it alive
          for (auto& cb : pending) cb();                       // safe: "session 42 still alive"
      }
    `],
    codeTitle: ['Watching use_count change', 'enable_shared_from_this for async callbacks'],
    viz: {
      title: 'shared_ptr control block: watch use_count and weak count',
      input: 'make a Widget; copy a b; copy b c; weak w a; reset a; move b d; lock w s; reset c; reset d; reset s; lock w t; drop w',
      inputLabel: 'Steps: make X T · new X T · copy X Y · move X Y · reset X · weak W X · lock W Y · drop W · fromraw X Y · end',
      gen: sharedSim
    },
    examples: [
      { title: 'Count the counts', html: `<p>Predict <code>use_count()</code> after each line:</p>
        ${H.table(['Line', 'use_count'], [['<code>auto p = std::make_shared&lt;int&gt;(7);</code>', '1'], ['<code>auto q = p;</code>', '2'], ['<code>std::vector&lt;std::shared_ptr&lt;int&gt;&gt; v(3, p);</code>', '5 (three more copies)'], ['<code>v.clear();</code>', '2'], ['<code>auto r = std::move(q);</code>', '2 (moved, not copied)'], ['<code>std::weak_ptr&lt;int&gt; w = r;</code>', '2 (weak does not count)'], ['<code>p.reset(); r.reset();</code>', '0 → int destroyed; <code>w.expired() == true</code>']])}` },
      { title: 'Passing shared_ptr to functions — the cost of a copy', html: `<p>Each by-value <code>shared_ptr</code> parameter does an atomic increment on entry and an atomic decrement on exit — on a contended cache line that can be 20–100 ns. Guidelines:</p>
        ${H.table(['Signature', 'Use when'], [['<code>void draw(const Texture&amp; t)</code>', 'callee just uses the object (most common) — no count traffic'], ['<code>void keep(std::shared_ptr&lt;Texture&gt; t)</code>', 'callee <b>stores</b> a copy (then <code>member_ = std::move(t);</code>)'], ['<code>void maybeKeep(const std::shared_ptr&lt;Texture&gt;&amp; t)</code>', 'callee may or may not copy it'], ['<code>void reseat(std::shared_ptr&lt;Texture&gt;&amp; t)</code>', 'callee replaces the caller\'s pointer']])}`, code: R`
        #include <memory>
        #include <utility>
        #include <vector>
        struct Texture { int id = 0; };
        struct Material {
            std::vector<std::shared_ptr<Texture>> textures;
            void add(std::shared_ptr<Texture> t) { textures.push_back(std::move(t)); }   // stores: by value + move
        };
        int width(const Texture& t) { return t.id * 2; }                                   // just uses: by reference
        int main() {
            auto t = std::make_shared<Texture>();
            Material m;
            m.add(t);                    // one copy (count 2), then moved into the vector
            return width(*t);            // no count change
        }` },
      { title: 'The aliasing constructor', html: `<p>You can create a shared_ptr that <b>shares ownership</b> of a whole object but <b>points</b> at one of its members. Holding the member pointer keeps the entire owner alive:</p>`, code: R`
        #include <iostream>
        #include <memory>
        #include <string>
        struct Config { std::string dbUrl = "postgres://x"; int port = 5432; };
        int main() {
            std::shared_ptr<std::string> url;
            {
                auto cfg = std::make_shared<Config>();
                url = std::shared_ptr<std::string>(cfg, &cfg->dbUrl);   // shares cfg's control block
            }                                                         // cfg variable gone, Config still alive
            std::cout << *url << " " << url.use_count() << "\n";      // postgres://x 1
        }` },
      { title: 'shared_ptr to an array and to const', html: `<p>Since C++17, <code>std::shared_ptr&lt;int[]&gt; a(new int[10]);</code> uses <code>delete[]</code> and supports <code>a[i]</code>; C++20 adds <code>std::make_shared&lt;int[]&gt;(10)</code>. Use <code>std::shared_ptr&lt;const Config&gt;</code> to share immutable data safely between threads: nobody can modify it, and the count handles the lifetime — a common pattern for hot-reloading configuration (swap in a new <code>shared_ptr&lt;const Config&gt;</code> atomically).</p>` }
    ],
    deepDive: `<p><b>Control block anatomy (libstdc++):</b> <code>_Sp_counted_base</code> holds <code>_M_use_count</code> and <code>_M_weak_count</code> (both <code>_Atomic_word</code>) plus a vtable for <code>_M_dispose()</code> (destroy the object) and <code>_M_destroy()</code> (free the block). Subtle detail: the stored weak count is "number of weak_ptrs <b>+ 1</b> while any shared_ptr exists", so the last shared_ptr's decrement of that extra 1 frees the block when there are no weak_ptrs. <code>make_shared</code> uses <code>_Sp_counted_ptr_inplace</code> with the object embedded; <code>shared_ptr(new T)</code> uses <code>_Sp_counted_ptr</code> holding a pointer; custom deleters use <code>_Sp_counted_deleter</code>. That type-erasure is why the deleter is not part of <code>shared_ptr</code>'s type.</p>
      <p><b>Costs:</b> 16-byte handle, a control block (~16–32 bytes + deleter), atomic RMW per copy/destroy. Uncontended atomic increments are cheap (~1–5 ns), but many threads copying the same shared_ptr bounce the cache line (false/true sharing) and can cost 50–100+ ns each. libstdc++ even skips atomics when the program is single-threaded (it checks whether libpthread is active). Optimisations: pass by reference, <code>std::move</code> instead of copy, keep a <code>T&amp;</code> inside hot loops.</p>
      <p><b>Destruction timing:</b> the object is destroyed on whatever thread drops the last reference — maybe a latency-sensitive thread destroying a huge structure. Some systems defer destruction to a background thread for this reason. Also, deep chains (<code>shared_ptr</code> linked lists) can overflow the stack when the head is released.</p>
      <p><b>Atomic shared_ptr:</b> <code>std::atomic&lt;std::shared_ptr&lt;T&gt;&gt;</code> (C++20) supports lock-free-ish (often internally locked) load/store/CAS for read-copy-update patterns; it replaces the deprecated free functions <code>std::atomic_load(&amp;sp)</code>.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI-generated C++ overuses <code>shared_ptr</code> because it "never crashes" — it makes code compile and run without the model having to reason about lifetimes. Reviewers now spend time <i>removing</i> needless shared ownership.</p>
      <p><b>Use AI as a partner:</b> <code>For each shared_ptr in this file, tell me who the owners are and whether a unique_ptr or a plain reference would suffice.</code> Ask it to compute use_count at given lines as a self-check, then verify by printing <code>use_count()</code> (only for debugging — it is approximate under concurrency).</p>
      <p><b>Where AI goes wrong:</b> claims shared_ptr makes the <i>object</i> thread-safe; creates <code>shared_ptr&lt;T&gt;(this)</code>; passes shared_ptr by value through 10 layers of calls; builds parent↔child structures with shared_ptr both ways (leak). <b>What you must own:</b> the counting rules, the control-block lifetime, and the judgement "is ownership really shared here?"</p>`,
    problems: [{
      title: 'Implement a Minimal SharedPtr<T> With a Control Block', level: 'Hard', tags: ['shared_ptr', 'reference counting', 'control block', 'templates'], companies: ['Google', 'Microsoft', 'Bloomberg', 'Optiver'],
      statement: `<p>Implement <code>template&lt;class T&gt; class SharedPtr</code> supporting: construction from <code>T*</code>, copy (shares and increments), move (transfers, no count change), copy/move assignment, destructor, <code>use_count()</code>, <code>get()</code>, <code>reset()</code>, <code>*</code> and <code>-&gt;</code>. Counts must be thread-safe for independent copies (use <code>std::atomic</code>).</p>`,
      constraints: `Object deleted exactly once, when the last owner goes away; control block freed too. Self-assignment safe. No weak_ptr needed for this version.`,
      example: `${H.table(['Code', 'use_count'], [['<code>SharedPtr&lt;int&gt; a(new int(5));</code>', '1'], ['<code>auto b = a;</code>', '2'], ['<code>auto c = std::move(b);</code>', '2'], ['<code>a.reset();</code>', '1'], ['<code>c</code> destroyed', '0 → int deleted, block freed']])}`,
      brute: { why: `<p>Storing the count <b>inside each SharedPtr</b> (an <code>int count</code> member) cannot work: copies would each have their own number and could never agree. A <code>static</code> count would be shared by <i>all</i> objects of the type. The count must live in a separate heap block that all copies point to.</p>`, code: R`
        template <class T>
        class SharedPtrBroken {
            T* p_;
            int count_ = 1;                         // BUG: each copy has its own count
        public:
            explicit SharedPtrBroken(T* p) : p_(p) {}
            SharedPtrBroken(const SharedPtrBroken& o) : p_(o.p_), count_(o.count_ + 1) {}
            ~SharedPtrBroken() { if (--count_ == 0) delete p_; }   // a's count is 1, b's is 2: if a dies first it deletes while b still uses it
        };
        int main() { SharedPtrBroken<int> a(new int(1)); { SharedPtrBroken<int> b = a; } return 0; }` },
      mcq: { q: 'Why can the decrement-and-check in the destructor use <code>fetch_sub(1) == 1</code>?', options: ['fetch_sub returns the OLD value, so 1 means we were the last owner', 'fetch_sub returns the new value', 'It is a non-atomic shortcut', 'Because use_count can never be 1'], answer: 0, explain: 'Atomic fetch_sub returns the value before subtracting; seeing 1 means this thread made it 0, so exactly one thread performs the delete.' },
      hints: [`<p>Hint 1: Allocate a small <code>struct Ctrl { std::atomic&lt;long&gt; count; T* ptr; }</code> on the heap once, when the first SharedPtr is created. Every copy stores a pointer to the same Ctrl.</p>`, `<p>Hint 2: Copy: <code>ctrl_-&gt;count.fetch_add(1, relaxed)</code>. Release: <code>if (ctrl_ &amp;&amp; ctrl_-&gt;count.fetch_sub(1, acq_rel) == 1) { delete ctrl_-&gt;ptr; delete ctrl_; }</code>.</p>`, `<p>Hint 3: Copy assignment via copy-and-swap (<code>SharedPtr(o).swap(*this)</code>) is self-assignment safe. Move: steal <code>ctrl_</code>, null the source. Handle <code>SharedPtr(nullptr)</code> by keeping <code>ctrl_ = nullptr</code>.</p>`],
      solution: {
        approach: `<p>All copies share one heap-allocated control block holding the atomic count and the object pointer. Every constructor either creates a block (count 1), joins one (count+1) or steals one (no change); every destruction path calls one <code>release()</code> that decrements and, if it was the last owner, deletes the object and the block. Copy-and-swap gives safe assignment. Memory order: increments can be relaxed (you already hold a reference); the final decrement needs acquire-release so all writes to the object by other owners happen-before the delete.</p>`,
        code: R`
          #include <atomic>
          #include <cassert>
          #include <utility>

          template <class T>
          class SharedPtr {
              struct Ctrl { std::atomic<long> count{1}; T* ptr; explicit Ctrl(T* p) : ptr(p) {} };
              Ctrl* ctrl_ = nullptr;
              T* ptr_ = nullptr;

              void release() noexcept {
                  if (ctrl_ && ctrl_->count.fetch_sub(1, std::memory_order_acq_rel) == 1) {
                      delete ctrl_->ptr;              // last owner: destroy the object
                      delete ctrl_;                   // and the control block
                  }
                  ctrl_ = nullptr; ptr_ = nullptr;
              }
          public:
              SharedPtr() noexcept = default;
              explicit SharedPtr(T* p) : ctrl_(p ? new Ctrl(p) : nullptr), ptr_(p) {}
              SharedPtr(const SharedPtr& o) noexcept : ctrl_(o.ctrl_), ptr_(o.ptr_) {
                  if (ctrl_) ctrl_->count.fetch_add(1, std::memory_order_relaxed);
              }
              SharedPtr(SharedPtr&& o) noexcept
                  : ctrl_(std::exchange(o.ctrl_, nullptr)), ptr_(std::exchange(o.ptr_, nullptr)) {}
              SharedPtr& operator=(SharedPtr o) noexcept {   // copy-and-swap handles copy AND move
                  swap(o);
                  return *this;                              // old state released when o dies
              }
              ~SharedPtr() { release(); }

              void swap(SharedPtr& o) noexcept { std::swap(ctrl_, o.ctrl_); std::swap(ptr_, o.ptr_); }
              void reset() noexcept { release(); }
              long use_count() const noexcept { return ctrl_ ? ctrl_->count.load(std::memory_order_relaxed) : 0; }
              T* get() const noexcept { return ptr_; }
              T& operator*() const { return *ptr_; }
              T* operator->() const noexcept { return ptr_; }
              explicit operator bool() const noexcept { return ptr_ != nullptr; }
          };

          int main() {
              SharedPtr<int> a(new int(5));
              auto b = a;                     assert(a.use_count() == 2);
              auto c = std::move(b);          assert(c.use_count() == 2 && !b);
              a = a;                          assert(a.use_count() == 2);   // self-assign safe
              a.reset();                      assert(c.use_count() == 1);
              assert(*c == 5);
          }                                   // c dies -> int and Ctrl deleted
        `,
        dry: { head: ['statement', 'ctrl count', 'owners', 'heap'], rows: [
          ['a(new int(5))', '1', 'a', 'int, Ctrl'],
          ['b = a', '2', 'a, b', 'same'],
          ['c = move(b)', '2', 'a, c (b empty)', 'same'],
          ['a = a', '2 (copy +1, old −1)', 'a, c', 'same'],
          ['a.reset()', '1', 'c', 'same'],
          ['c destroyed', '0 → delete', '—', '<span class="c-g">both freed</span>']
        ] },
        complexity: `<p>O(1) per operation; one extra allocation for the control block (std::make_shared avoids it by co-allocating). Copies cost one atomic increment, destruction one atomic decrement.</p>`,
        followUps: ['Add <code>WeakPtr</code>: what second counter does the control block need and when is the block freed?', 'Implement <code>makeShared</code> that co-allocates object and block in one allocation.', 'Why must the final decrement use acquire-release ordering (or a release decrement + acquire fence)?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — weak_ptr and breaking reference cycles
     ====================================================================== */
  function cycleSim(input) {
    var DEF = 'Parent=>Child Child=>Parent';
    var s = String(input === undefined ? DEF : input).trim();
    if (!s) throw new Error('Type edges like: A=>B B->A   (=> shared_ptr, -> weak_ptr)');
    var toks = s.split(/[\s,;]+/).filter(Boolean), edges = [], names = [];
    toks.forEach(function (t) {
      var m = /^([A-Za-z_][A-Za-z0-9_]{0,9})(=>|->)([A-Za-z_][A-Za-z0-9_]{0,9})$/.exec(t);
      if (!m) throw new Error('Bad edge "' + t + '". Write A=>B (owning shared_ptr) or A->B (weak_ptr), separated by spaces');
      if (m[1] === m[3] && m[2] === '=>') { /* self-cycle allowed */ }
      [m[1], m[3]].forEach(function (n) { if (names.indexOf(n) < 0) names.push(n); });
      edges.push({ from: m[1], to: m[3], strong: m[2] === '=>' });
    });
    if (names.length > 6) throw new Error('Use at most 6 different objects');
    if (edges.length > 10) throw new Error('Use at most 10 edges');
    var st = {}, wk = {}, alive = {}, local = {}, linked = [];
    names.forEach(function (n) { st[n] = 1; wk[n] = 0; alive[n] = true; local[n] = true; });
    var pos = {};
    names.forEach(function (n, i) {
      var ang = -Math.PI / 2 + i * 2 * Math.PI / names.length;
      pos[n] = { x: Math.round(66 + 24 * Math.cos(ang)), y: Math.round(38 + 26 * Math.sin(ang)) };
    });
    var frames = [];
    function picture(hl, ehl) {
      var nodes = [], es = [], h = {}, tags = {}, eh = {};
      names.forEach(function (n, i) {
        nodes.push({ id: 'L_' + n, label: 'local sp_' + n, x: 10, y: 8 + i * 12, shape: 'box', w: 18 });
        if (local[n]) es.push(['L_' + n, n, 'owns']); else { h['L_' + n] = 'done'; tags['L_' + n] = 'out of scope'; }
        nodes.push({ id: n, label: n, x: pos[n].x, y: pos[n].y, shape: 'box', w: 16 });
        tags[n] = alive[n] ? 'use=' + st[n] + ' weak=' + wk[n] : 'destroyed';
        if (!alive[n]) h[n] = 'done';
      });
      linked.forEach(function (e) {
        if (!alive[e.from]) return;
        es.push([e.from, e.to, e.strong ? 'shared_ptr' : 'weak_ptr']);
        eh[e.from + '-' + e.to] = e.strong ? 'cur' : 'ok';
      });
      Object.keys(hl || {}).forEach(function (k) { h[k] = hl[k]; });
      Object.keys(ehl || {}).forEach(function (k) { eh[k] = ehl[k]; });
      var rows = names.map(function (n) { return [n, alive[n] ? st[n] : 0, wk[n], alive[n] ? (local[n] ? 'alive (held by a local)' : (st[n] > 0 ? '<span class="c-r">alive but unreachable</span>' : 'alive')) : '<span class="c-g">destroyed</span>']; });
      return [{ type: 'graph', label: 'Amber arrows = owning shared_ptr (counts toward use_count) · green arrows = weak_ptr (does not)', directed: true, height: 72, nodes: nodes, edges: es, hl: h, ehl: eh, tags: tags },
        { type: 'table', label: 'Reference counts', columns: ['object', 'use_count', 'weak count', 'state'], rows: rows }];
    }
    frames.push({ narr: 'Each object is created with <code>make_shared</code> and held by a local variable (use_count = 1). Next we wire up the member pointers from your input: <code>' + H.esc(s) + '</code>.', parts: picture() });
    edges.forEach(function (e) {
      linked.push(e);
      if (e.strong) st[e.to]++; else wk[e.to]++;
      var hl = {}; hl[e.to] = 'cur';
      frames.push({ narr: '<code>' + H.esc(e.from) + '-&gt;' + (e.strong ? 'ref' : 'weakRef') + ' = sp_' + H.esc(e.to) + ';</code> — ' + (e.strong ? 'a <b>shared_ptr</b> member: ' + H.esc(e.to) + '\'s use_count goes up to <b>' + st[e.to] + '</b>. ' + H.esc(e.from) + ' now co-owns ' + H.esc(e.to) + '.' : 'a <b>weak_ptr</b> member: only ' + H.esc(e.to) + '\'s weak count goes up (' + wk[e.to] + '). use_count stays ' + st[e.to] + ' — ' + H.esc(e.from) + ' can <i>reach</i> ' + H.esc(e.to) + ' with <code>lock()</code> but does not keep it alive.'), parts: picture(hl, one(e.from + '-' + e.to, e.strong ? 'cur' : 'ok')) });
    });
    function destroy(n, log) {
      alive[n] = false; log.push(n);
      linked.forEach(function (e) {
        if (e.from !== n) return;
        if (e.strong) { if (alive[e.to]) { st[e.to]--; if (st[e.to] === 0) destroy(e.to, log); } }
        else wk[e.to]--;
      });
    }
    for (var i = names.length - 1; i >= 0; i--) {
      var n = names[i];
      local[n] = false;
      var log = [], hl = {};
      if (alive[n]) { st[n]--; if (st[n] === 0) destroy(n, log); }
      log.forEach(function (x) { hl[x] = 'bad'; });
      var narr = 'The function ends; local <code>sp_' + H.esc(n) + '</code> is destroyed → ' + H.esc(n) + '\'s use_count drops' + (alive[n] ? ' to <b>' + st[n] + '</b>. Still &gt; 0 because another object owns it, so ' + H.esc(n) + ' stays alive.' : '.');
      if (log.length) narr += ' <span class="c-g">Reached 0 → destroyed: ' + log.join(', ') + '</span> (destroying an object also releases the shared_ptrs it holds, which can cascade).';
      frames.push({ narr: narr, parts: picture(hl) });
    }
    var leaked = names.filter(function (n) { return alive[n]; });
    if (leaked.length) {
      var hl2 = {}; leaked.forEach(function (n) { hl2[n] = 'bad'; });
      frames.push({ narr: '<span class="c-r"><b>LEAK: ' + leaked.join(', ') + '</b> — no local variable can reach them, but they keep each other\'s use_count above 0 through owning shared_ptrs. Reference counting cannot see that the whole group is garbage; their destructors will <b>never</b> run.</span> <b>Fix:</b> make the "back" edge a weak_ptr, e.g. change <code>=&gt;</code> to <code>-&gt;</code> on the child→parent (or observer) edge and run again.', parts: picture(hl2) });
    } else {
      frames.push({ narr: '<span class="c-g"><b>No leak.</b></span> Every object was destroyed. Ownership forms a tree/DAG with owning edges pointing "down"; back-references are weak_ptrs, which never keep anything alive. Try <code>A=&gt;B B=&gt;C C=&gt;A</code> to see a 3-object cycle leak.', parts: picture() });
    }
    return frames;
  }

  topics.push({
    title: 'std::weak_ptr and Breaking shared_ptr Cycles',
    analogy: `<p><b>Two friends each holding the other's balloon string.</b> Each balloon floats as long as someone holds its string. When everyone else lets go, Alice still holds Bob's string and Bob still holds Alice's — so both balloons float forever, even though nobody on the ground cares about them any more. That is a <b>shared_ptr cycle</b>.</p>
      <p>A <b>weak_ptr</b> is like <b>knowing where the balloon is without holding its string</b>: you can go and grab it (<code>lock()</code>) if it is still there, but you are not the reason it stays up.</p>`,
    explain: `<p><code>std::weak_ptr&lt;T&gt;</code> is a <b>non-owning observer</b> of an object managed by <code>shared_ptr</code>. It points at the control block and bumps the <b>weak count</b>, never the use_count.</p>
      ${H.table(['weak_ptr API', 'What it does'], [
        ['<code>std::weak_ptr&lt;T&gt; w = sp;</code>', 'start observing (weak count +1)'],
        ['<code>if (auto sp = w.lock()) { ... }</code>', '<b>the</b> way to use it: atomically get a shared_ptr if the object is alive, else an empty one'],
        ['<code>w.expired()</code>', 'true if the object is gone — only a hint; it may expire right after you check'],
        ['<code>w.use_count()</code>', 'how many shared_ptrs currently own it'],
        ['<code>w.reset()</code>', 'stop observing'],
        ['<code>*w</code>, <code>w-&gt;x</code>', '<span class="c-r">do not exist</span> — you must <code>lock()</code> first']
      ])}
      <p><b>Why cycles leak:</b> reference counting frees an object when its count reaches 0. In a cycle (A owns B, B owns A), each count includes the other's pointer, so after all outside owners leave, both counts are still 1. Nothing outside can reach them, nothing inside will let go → leak. A tracing garbage collector (Java, Go) would notice; C++ reference counting cannot.</p>
      <p><b>How to break a cycle:</b> identify the <b>ownership direction</b>. The owner holds a <code>shared_ptr</code> (or <code>unique_ptr</code>) to what it owns; any pointer going "back up" or "sideways" becomes a <code>weak_ptr</code> (or a raw pointer if the lifetime is guaranteed).</p>
      ${H.table(['Structure', 'Owning edge', 'Back / side edge'], [
        ['Tree with parent links', 'parent → children (<code>shared_ptr</code>/<code>unique_ptr</code>)', 'child → parent: <code>weak_ptr</code> (or raw <code>Node*</code>)'],
        ['Doubly linked list', '<code>next</code>: shared_ptr', '<code>prev</code>: weak_ptr'],
        ['Observer / event bus', 'whoever created the listener', 'subject → listeners: <code>weak_ptr</code> (auto-skips dead ones)'],
        ['Cache of shared resources', 'users of the resource', 'cache map → resource: <code>weak_ptr</code> (entry expires when unused)'],
        ['Object + its callbacks', 'the object', 'callback captures <code>weak_from_this()</code>, locks when fired']
      ])}
      <p><b>Memory detail:</b> while weak_ptrs exist, the <b>control block</b> stays allocated (the object itself is destroyed when use_count hits 0). With <code>make_shared</code>, object and control block share one allocation, so the object's <i>bytes</i> stay reserved until the last weak_ptr is gone too — usually fine, but matters for big objects with long-lived weak observers.</p>`,
    clues: [
      '"Parent and child point to each other" / "doubly linked list with shared_ptr" → cycle; make the back pointer weak',
      '"Destructor never called" / "memory grows although everything uses shared_ptr" → shared_ptr cycle leak',
      '"Observer must not keep the subject alive" / "listeners may die before the event fires" → <code>weak_ptr</code> + <code>lock()</code>',
      '"Cache that should not keep unused objects alive" → <code>unordered_map&lt;Key, weak_ptr&lt;T&gt;&gt;</code>',
      '"Check whether an object still exists before using it" → <code>if (auto sp = w.lock())</code>, never <code>expired()</code> then use',
      '"Callback captures <code>this</code> / shared_from_this and the object never dies" → capture <code>weak_from_this()</code> instead'
    ],
    code: [R`
      #include <iostream>
      #include <memory>
      #include <string>
      #include <vector>

      struct Node {
          std::string name;
          std::vector<std::shared_ptr<Node>> children;   // parent OWNS children
          std::weak_ptr<Node> parent;                    // child only OBSERVES parent
          explicit Node(std::string n) : name(std::move(n)) {}
          ~Node() { std::cout << "~" << name << "\n"; }
      };

      std::shared_ptr<Node> addChild(const std::shared_ptr<Node>& p, std::string name) {
          auto c = std::make_shared<Node>(std::move(name));
          c->parent = p;                                 // weak: p's use_count unchanged
          p->children.push_back(c);
          return c;
      }

      int main() {
          std::shared_ptr<Node> leaf;
          {
              auto root = std::make_shared<Node>("root");
              auto mid = addChild(root, "mid");
              leaf = addChild(mid, "leaf");
              if (auto p = leaf->parent.lock())          // safe access to the parent
                  std::cout << leaf->name << "'s parent is " << p->name << "\n";
          }   // root dies -> "~root", "~mid" (leaf is still held outside)
          std::cout << "parent expired? " << leaf->parent.expired() << "\n";   // 1
      }       // "~leaf"
    `, R`
      #include <iostream>
      #include <memory>
      // The leak, side by side with the fix.
      struct BadA; struct BadB;
      struct BadA { std::shared_ptr<BadB> b; ~BadA() { std::cout << "~BadA\n"; } };
      struct BadB { std::shared_ptr<BadA> a; ~BadB() { std::cout << "~BadB\n"; } };   // owning back-edge

      struct GoodB;
      struct GoodA { std::shared_ptr<GoodB> b; ~GoodA() { std::cout << "~GoodA\n"; } };
      struct GoodB { std::weak_ptr<GoodA> a;  ~GoodB() { std::cout << "~GoodB\n"; } };  // observing back-edge

      int main() {
          {
              auto a = std::make_shared<BadA>(); auto b = std::make_shared<BadB>();
              a->b = b; b->a = a;                   // use_count: a=2, b=2
          }                                         // both drop to 1 -> nothing printed: LEAK
          {
              auto a = std::make_shared<GoodA>(); auto b = std::make_shared<GoodB>();
              a->b = b; b->a = a;                   // use_count: a=1, b=2
          }                                         // a -> 0: "~GoodA", which releases b -> "~GoodB"
      }
    `],
    codeTitle: ['Tree: owning children, weak parent', 'Cycle leak vs weak_ptr fix'],
    viz: {
      title: 'Reference cycle leak and the weak_ptr fix (=> owning, -> weak)',
      input: 'Parent=>Child Child=>Parent',
      inputLabel: 'Edges: A=>B (shared_ptr member) or A->B (weak_ptr member). Try Parent=>Child Child->Parent',
      gen: cycleSim
    },
    examples: [
      { title: 'Count it by hand: the 2-node cycle', html: `${H.table(['Step', 'A.use_count', 'B.use_count'], [['<code>auto a = make_shared&lt;A&gt;(); auto b = make_shared&lt;B&gt;();</code>', '1', '1'], ['<code>a-&gt;b = b;</code>', '1', '2'], ['<code>b-&gt;a = a;</code> (shared)', '2', '2'], ['scope ends: <code>b</code> local dies', '2', '1'], ['<code>a</code> local dies', '1', '1'], ['<span class="c-r">result</span>', '<span class="c-r">1 — leaked</span>', '<span class="c-r">1 — leaked</span>']])}
        <p>With <code>b-&gt;a</code> as a <code>weak_ptr</code>: A's count is 1 after linking; when local <code>a</code> dies it hits 0 → A destroyed → A's member <code>b</code> released → B hits 0 → destroyed. ${H.c('g', 'No leak.')}</p>` },
      { title: 'Observer pattern that skips dead listeners', html: `<p>The subject keeps <code>weak_ptr</code>s to listeners, so a listener that has been destroyed simply fails to <code>lock()</code> and is pruned. The subject never keeps a listener (say, a closed UI window) alive by accident.</p>`, code: R`
        #include <algorithm>
        #include <iostream>
        #include <memory>
        #include <string>
        #include <vector>
        struct Listener { std::string id; void onEvent(const std::string& e) { std::cout << id << " got " << e << "\n"; } };
        class Subject {
            std::vector<std::weak_ptr<Listener>> subs_;
        public:
            void subscribe(const std::shared_ptr<Listener>& l) { subs_.push_back(l); }
            void publish(const std::string& e) {
                std::erase_if(subs_, [&](const std::weak_ptr<Listener>& w) {
                    if (auto l = w.lock()) { l->onEvent(e); return false; }
                    return true;                                  // expired: remove it
                });
            }
            std::size_t size() const { return subs_.size(); }
        };
        int main() {
            Subject s;
            auto a = std::make_shared<Listener>(Listener{"A"});
            {
                auto b = std::make_shared<Listener>(Listener{"B"});
                s.subscribe(a); s.subscribe(b);
                s.publish("start");                               // A and B
            }                                                     // B destroyed
            s.publish("tick");                                    // only A; B pruned
            std::cout << s.size() << "\n";                        // 1
        }` },
      { title: 'The expired()-then-use race', html: `<p>In multi-threaded code this is a bug:</p>
        <pre>if (!w.expired()) {        // (1) alive right now…
    use(*w.lock());         // (2) …but may have died in between → null deref
}</pre>
        <p>Between (1) and (2) another thread can drop the last owner. <code>lock()</code> is atomic: it either returns an owner that keeps the object alive for as long as you hold it, or empty. ${H.c('g', 'Correct: <code>if (auto sp = w.lock()) use(*sp);</code>')}</p>` },
      { title: 'Callbacks: capture weak, not strong', html: `<p>A timer callback that captures <code>shared_from_this()</code> keeps the object alive until the timer fires — and if the object owns the timer, you have a cycle (object → timer → callback → object). Capture <code>weak_from_this()</code> (C++17) and lock inside the callback:</p>`, code: R`
        #include <functional>
        #include <iostream>
        #include <memory>
        class Downloader : public std::enable_shared_from_this<Downloader> {
            std::function<void()> onDone_;                   // object owns its callback
        public:
            void start() {
                onDone_ = [weak = weak_from_this()] {        // no cycle
                    if (auto self = weak.lock()) std::cout << "done, still alive\n";
                    else std::cout << "object gone, ignore\n";
                };
            }
            void finish() { if (onDone_) onDone_(); }
        };
        int main() {
            auto d = std::make_shared<Downloader>();
            d->start();
            d->finish();                                      // "done, still alive"
        }                                                     // d is freed: no cycle` }
    ],
    deepDive: `<p><b>How lock() works:</b> it loads use_count and tries a compare-and-swap from n to n+1, looping while n &gt; 0 ("increment if not zero"). If it sees 0, the object is dead or dying and it returns empty. This is why <code>lock()</code> is race-free but a bit more expensive than copying a shared_ptr.</p>
      <p><b>Choosing the weak edge:</b> ask "if X disappears, should Y disappear too?" If yes, X owns Y (strong edge X→Y). Back-edges, sibling links and registries are weak. When a cycle is <i>inherent</i> (general graphs where any node may be referenced by many and cycles are data, e.g. a social graph), weak_ptr is the wrong tool: use an <b>arena</b> — a <code>std::vector&lt;std::unique_ptr&lt;Node&gt;&gt;</code> (or a vector of nodes with integer indices) owned by the graph object, with edges as raw pointers/indices. The whole graph dies together. Some libraries implement deferred cycle collection on top of ref counting (Python does this with its cyclic GC; C++ has proposals like Herb Sutter's <code>gcpp</code>), but the standard library does not.</p>
      <p><b>Raw pointer vs weak_ptr for back-edges:</b> a raw <code>Node* parent</code> is faster (no control block traffic, 8 bytes instead of 16) and correct if the parent provably outlives the child — true for a tree whose children are only reachable through the parent. If children can escape (handed to other code, stored elsewhere as shared_ptrs, as in the code example above), use <code>weak_ptr</code> so a stale parent is detected instead of dereferenced.</p>
      <p><b>Detecting cycle leaks in practice:</b> LeakSanitizer reports them as "indirect leaks" (memory only reachable from other leaked blocks); a destructor log or instance counters show objects that never die; heap snapshots show growing counts of one type. Code review smell: two classes holding <code>shared_ptr</code>s to each other.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants know the parent/child weak_ptr rule well and will usually suggest it when asked about cycles. They are also handy for drawing the ownership graph of an unfamiliar codebase: <code>List every shared_ptr member in these classes as edges From → To and find cycles.</code></p>
      <p><b>Use AI as a partner:</b> generate the edge list, then run a quick cycle check yourself (or have the AI write a tiny script that parses member declarations). Ask for a unit test with instance counters that proves all destructors ran.</p>
      <p><b>Where AI goes wrong:</b> it makes the <i>wrong</i> edge weak (the owning one), so objects die immediately; it uses <code>expired()</code> then <code>lock()</code> (race); it captures <code>shared_from_this()</code> in long-lived callbacks; or it "fixes" a leak by calling <code>reset()</code> manually in a <code>close()</code> method that someone forgets to call. <b>What you must own:</b> deciding the ownership direction — that is a design decision about your domain, not a syntax choice.</p>`,
    problems: [{
      title: 'Fix the Leaking Department ↔ Employee Graph', level: 'Medium', tags: ['weak_ptr', 'reference cycle', 'shared_ptr'], companies: ['Amazon', 'Uber', 'Bloomberg'],
      statement: `<p>A <code>Department</code> holds <code>std::vector&lt;std::shared_ptr&lt;Employee&gt;&gt; staff</code>, and each <code>Employee</code> holds <code>std::shared_ptr&lt;Department&gt; dept</code> so it can print its department name. After a department is closed (all outside references dropped), memory is never released and destructors never run. Fix the design so everything is freed, and make <code>Employee::deptName()</code> return <code>"(none)"</code> if the department is gone.</p>`,
      constraints: `Employees may outlive their department (they can be transferred elsewhere). No manual "break the cycle" calls allowed — destruction must be automatic.`,
      example: `${H.table(['Design', 'Dept use_count after outside refs drop', 'Result'], [['Employee holds shared_ptr&lt;Department&gt;', '= number of employees (&gt; 0)', '<span class="c-r">leak</span>'], ['Employee holds weak_ptr&lt;Department&gt;', '0', '<span class="c-g">Department destroyed; employees still usable</span>']])}`,
      brute: { why: `<p>The original design is a cycle: Department owns Employees, each Employee owns the Department. Department's use_count can never reach 0 while any Employee exists, and Employees are owned by the Department. A manual <code>close()</code> that clears <code>staff</code> works only if every caller remembers it — the exact fragility RAII is meant to remove.</p>`, code: R`
        #include <memory>
        #include <string>
        #include <vector>
        struct Department;
        struct Employee {
            std::string name;
            std::shared_ptr<Department> dept;          // owning back-edge -> cycle
        };
        struct Department {
            std::string name;
            std::vector<std::shared_ptr<Employee>> staff;
        };
        int main() {
            auto d = std::make_shared<Department>(Department{"R&D", {}});
            auto e = std::make_shared<Employee>(Employee{"Ana", d});
            d->staff.push_back(e);
        }   // d: use 2 -> 1, e: use 2 -> 1  => both leaked` },
      mcq: { q: 'Which edge should become a weak_ptr?', options: ['Employee → Department (the back-reference)', 'Department → Employee (the staff list)', 'Both', 'Neither — use raw pointers for both'], answer: 0, explain: 'The department is the natural owner of its staff list; an employee only needs to look up its department. Making the back-edge weak breaks the cycle and lets the employee detect a closed department.' },
      hints: [`<p>Hint 1: Draw the arrows and count: Department → Employee (owning), Employee → Department (owning). A loop of owning arrows = leak.</p>`, `<p>Hint 2: Keep <code>staff</code> as shared_ptrs (employees can be shared/transferred), make <code>Employee::dept</code> a <code>std::weak_ptr&lt;Department&gt;</code>.</p>`, `<p>Hint 3: <code>deptName()</code>: <code>if (auto d = dept.lock()) return d-&gt;name; return "(none)";</code>. Verify with destructor prints or static counters.</p>`],
      solution: {
        approach: `<p>Ownership flows Department → Employee; the back-reference becomes a <code>weak_ptr</code>. When outside references to the department vanish, its use_count reaches 0, it is destroyed, its <code>staff</code> vector releases the employees (each freed if nobody else holds it), and surviving employees see an expired weak_ptr.</p>`,
        code: R`
          #include <iostream>
          #include <memory>
          #include <string>
          #include <vector>
          struct Department;
          struct Employee {
              std::string name;
              std::weak_ptr<Department> dept;           // observe, don't own
              explicit Employee(std::string n) : name(std::move(n)) {}
              ~Employee() { std::cout << "~Employee " << name << "\n"; }
              std::string deptName() const;
          };
          struct Department {
              std::string name;
              std::vector<std::shared_ptr<Employee>> staff;   // owns its staff
              explicit Department(std::string n) : name(std::move(n)) {}
              ~Department() { std::cout << "~Department " << name << "\n"; }
              void hire(const std::shared_ptr<Department>& self, std::shared_ptr<Employee> e) {
                  e->dept = self;
                  staff.push_back(std::move(e));
              }
          };
          std::string Employee::deptName() const {
              if (auto d = dept.lock()) return d->name;
              return "(none)";
          }
          int main() {
              std::shared_ptr<Employee> keep;
              {
                  auto rnd = std::make_shared<Department>("R&D");
                  auto ana = std::make_shared<Employee>("Ana");
                  rnd->hire(rnd, ana);
                  rnd->hire(rnd, std::make_shared<Employee>("Bo"));
                  keep = ana;                                     // Ana is also held outside
                  std::cout << keep->deptName() << "\n";          // R&D
              }   // "~Department R&D", then "~Employee Bo" (Ana survives via keep)
              std::cout << keep->deptName() << "\n";              // (none)
          }       // "~Employee Ana"
        `,
        dry: { head: ['moment', 'R&amp;D use', 'Ana use', 'Bo use', 'event'], rows: [
          ['after both hires', '1 (local rnd)', '2 (ana, staff)', '1 (staff)', 'weak dept links add 0 to R&amp;D'],
          ['keep = ana', '1', '3', '1', '—'],
          ['scope ends: ana local dies', '1', '2', '1', '—'],
          ['rnd local dies', '0', '2 → 1', '1 → 0', '<span class="c-g">~Department, ~Employee Bo</span>'],
          ['keep-&gt;deptName()', '—', '1', '—', 'lock() empty → "(none)"'],
          ['end of main', '—', '0', '—', '<span class="c-g">~Employee Ana</span>']
        ] },
        complexity: `<p>Same memory layout cost as before (weak_ptr is 16 bytes like shared_ptr). <code>lock()</code> is a CAS loop on the control block — fine for lookups, avoid in the tightest loops.</p>`,
        followUps: ['When is a raw <code>Department*</code> back-pointer acceptable instead?', 'How would you test for this leak automatically in CI?', 'How do you remove an employee from the department when the employee transfers?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — make_unique / make_shared and custom deleters
     ====================================================================== */
  function allocCompare(input) {
    var mode = String(input === undefined ? 'make' : input).trim().toLowerCase();
    if (mode !== 'make' && mode !== 'new') throw new Error('Type "make" (std::make_shared) or "new" (shared_ptr<T>(new T))');
    var M = mode === 'make', OBJ = 4096, CB = 32, frames = [];
    var codeTxt = M ? 'auto a = std::make_shared<Big>();   // Big is 4 KB\nstd::weak_ptr<Big> w = a;\na.reset();\nw.reset();'
                    : 'std::shared_ptr<Big> a(new Big);    // Big is 4 KB\nstd::weak_ptr<Big> w = a;\na.reset();\nw.reset();';
    function snap(line, narr, stackB, heapB, edges, hl, tags, allocs, bytes) {
      frames.push({ narr: narr, parts: [
        { type: 'code', label: M ? 'make_shared version' : 'new + shared_ptr version', lang: 'cpp', code: codeTxt, hl: line ? one(line, 'cur') : {} },
        memGraph('Heap blocks (one box = one allocation)', stackB, heapB, edges, hl, {}, tags),
        { type: 'vars', label: 'Allocator scoreboard', vals: { 'malloc calls so far': allocs, 'bytes still reserved': bytes }, hl: {} }
      ] });
    }
    snap(0, (M ? '<b>make_shared mode.</b>' : '<b>new mode.</b>') + ' We create a 4 KB object, observe it with a weak_ptr, then drop the shared_ptr and the weak_ptr. Watch how many allocations happen and when the 4 KB is really returned. (Switch the input to "' + (M ? 'new' : 'make') + '" to compare.)', [], [], [], {}, {}, 0, 0);
    if (M) {
      snap(1, '<code>make_shared</code>: <b>one</b> allocation of ~' + (OBJ + CB) + ' bytes holding the control block <i>and</i> the Big object side by side. Faster (one malloc instead of two), better cache locality, no naked <code>new</code>.', [{ id: 'a', label: 'shared_ptr a' }], [{ id: 'blk', label: '[ctrl use=1 weak=0 | Big 4 KB]' }], [['a', 'blk']], { blk: 'ok' }, {}, 1, OBJ + CB);
      snap(2, 'weak_ptr <code>w</code> observes: weak count 1. Same single block.', [{ id: 'a', label: 'shared_ptr a' }, { id: 'w', label: 'weak_ptr w' }], [{ id: 'blk', label: '[ctrl use=1 weak=1 | Big 4 KB]' }], [['a', 'blk'], ['w', 'blk']], {}, {}, 1, OBJ + CB);
      snap(3, '<code>a.reset()</code>: use_count → 0, so <code>~Big()</code> runs. <span class="c-y">But the 4 KB cannot be returned yet</span>: it lives in the same allocation as the control block, and the control block must stay while <code>w</code> exists. A long-lived weak_ptr to a huge make_shared object pins its memory.', [{ id: 'a', label: 'shared_ptr a (empty)' }, { id: 'w', label: 'weak_ptr w' }], [{ id: 'blk', label: '[ctrl use=0 weak=1 | ~Big done, bytes held]' }], [['w', 'blk']], { blk: 'cur' }, { blk: 'zombie bytes' }, 1, OBJ + CB);
      snap(4, '<code>w.reset()</code>: weak count → 0 → the single block is freed. All ' + (OBJ + CB) + ' bytes go back now.', [{ id: 'a', label: 'shared_ptr a (empty)' }, { id: 'w', label: 'weak_ptr w (empty)' }], [{ id: 'blk', label: 'block freed' }], [], { blk: 'done' }, { blk: 'freed' }, 1, 0);
    } else {
      snap(1, '<code>new Big</code> is allocation #1 (4 KB). Then the shared_ptr constructor allocates the control block: allocation #2. Two mallocs; the counts live far from the object in memory.', [{ id: 'a', label: 'shared_ptr a' }], [{ id: 'obj', label: 'Big 4 KB' }, { id: 'cb', label: 'ctrl use=1 weak=0' }], [['a', 'cb'], ['cb', 'obj']], { obj: 'ok', cb: 'ok' }, {}, 2, OBJ + CB);
      snap(2, 'weak_ptr <code>w</code> points at the control block: weak count 1.', [{ id: 'a', label: 'shared_ptr a' }, { id: 'w', label: 'weak_ptr w' }], [{ id: 'obj', label: 'Big 4 KB' }, { id: 'cb', label: 'ctrl use=1 weak=1' }], [['a', 'cb'], ['w', 'cb'], ['cb', 'obj']], {}, {}, 2, OBJ + CB);
      snap(3, '<code>a.reset()</code>: use_count → 0 → <code>delete</code> the Big. Its 4 KB is <b>returned immediately</b> because it is its own allocation. Only the small control block remains for <code>w</code>.', [{ id: 'a', label: 'shared_ptr a (empty)' }, { id: 'w', label: 'weak_ptr w' }], [{ id: 'obj', label: 'Big freed' }, { id: 'cb', label: 'ctrl use=0 weak=1' }], [['w', 'cb']], { obj: 'done', cb: 'cur' }, { obj: 'freed' }, 2, CB);
      snap(4, '<code>w.reset()</code>: weak count → 0 → control block freed. Trade-off: two allocations up front, but no memory pinned by long-lived weak_ptrs.', [{ id: 'a', label: 'shared_ptr a (empty)' }, { id: 'w', label: 'weak_ptr w (empty)' }], [{ id: 'obj', label: 'Big freed' }, { id: 'cb', label: 'ctrl freed' }], [], { obj: 'done', cb: 'done' }, { cb: 'freed' }, 2, 0);
    }
    frames.push({ narr: 'Verdict: <b>default to make_shared/make_unique</b>. Prefer <code>shared_ptr(new T)</code> (or allocate_shared with care) only when the object is large <i>and</i> weak_ptrs routinely outlive it — or when you need a custom deleter, which make_shared cannot take.', parts: [
      { type: 'table', label: 'make_shared vs shared_ptr(new T)', columns: ['', 'make_shared', 'shared_ptr(new T)'], rows: [['allocations', '1', '2'], ['locality', 'counts next to object', 'separate blocks'], ['custom deleter', 'not possible', 'possible'], ['object bytes freed when', 'last weak_ptr gone', 'last shared_ptr gone'], ['private constructor', 'not usable', 'usable (from inside the class)']], hl: { 0: 'sel' } }
    ] });
    return frames;
  }

  function deleterOrder() {
    var code = [
      'struct FileCloser { void operator()(FILE* f) const { std::fclose(f); } };',
      'void work(Pool& pool) {',
      '    std::unique_ptr<FILE, FileCloser> log(std::fopen("app.log", "a"));',
      '    std::unique_ptr<char, decltype(&std::free)> buf((char*)std::malloc(64), &std::free);',
      '    std::shared_ptr<Socket> sock(openSocket(), [](Socket* s) { closeSocket(s); });',
      '    auto conn = pool.acquire();        // unique_ptr<Conn, ReturnToPool>',
      '    use(log.get(), buf.get(), *sock, *conn);',
      '}   // destroyed in reverse: conn, sock, buf, log'
    ].join('\n');
    var frames = [], st = [], outl = [];
    var sizes = { 'sizeof log (stateless functor)': 8, 'sizeof buf (function pointer)': 16, 'sizeof sock (shared_ptr)': 16, 'sizeof conn (deleter holds Pool*)': 16 };
    function snap(line, narr, hlTop, cls) {
      var h = {}; if (hlTop !== undefined) h[hlTop] = cls || 'cur';
      frames.push({ narr: narr, parts: [
        { type: 'code', label: 'Custom deleters in one function', lang: 'cpp', code: code, hl: one(line, line === 8 ? 'ok' : 'cur') },
        { type: 'stack', label: 'RAII handles on the stack (top = newest)', items: st.slice(), hl: h },
        { type: 'vars', label: 'Handle sizes on x86-64', vals: sizes },
        out(outl.slice())
      ] });
    }
    snap(1, 'A <b>custom deleter</b> tells a smart pointer <i>how</i> to release the resource when it is not "delete". This stateless functor calls <code>fclose</code>. Because it has no data, <code>unique_ptr&lt;FILE, FileCloser&gt;</code> is still just 8 bytes.');
    st.push('log  → FILE* (FileCloser)'); outl.push('fopen app.log');
    snap(3, '<code>log</code> owns a C <code>FILE*</code>. The deleter type is part of the unique_ptr\'s <b>type</b>.', 0, 'ok');
    st.push('buf  → char[64] (free)'); outl.push('malloc 64');
    snap(4, 'Memory from <code>malloc</code> must be released with <code>free</code>, not <code>delete</code>. A function-pointer deleter works but must be stored: the unique_ptr grows to 16 bytes.', 1, 'ok');
    st.push('sock → Socket* (lambda)'); outl.push('openSocket');
    snap(5, '<code>shared_ptr</code> takes the deleter as a constructor argument and stores it <b>in the control block</b> (type-erased), so <code>shared_ptr&lt;Socket&gt;</code> has the same type and size whatever the deleter is.', 2, 'ok');
    st.push('conn → Conn* (ReturnToPool)'); outl.push('pool.acquire -> conn #7');
    snap(6, 'A deleter does not have to free anything: <code>ReturnToPool</code> puts the connection back into the pool for reuse. RAII for "borrow and give back".', 3, 'ok');
    snap(7, 'Use the resources. If <code>use</code> throws, everything below still happens during unwinding.', 3);
    [['conn', 'ReturnToPool: conn #7 back to pool'], ['sock', 'lambda: closeSocket'], ['buf', 'std::free(buf)'], ['log', 'FileCloser: fclose(app.log)']].forEach(function (d) {
      snap(8, 'Scope ends → <b>' + d[0] + '</b> is destroyed (newest first) and its deleter runs: <code>' + H.esc(d[1]) + '</code>.', st.length - 1, 'bad');
      st.pop(); outl.push(d[1]);
    });
    snap(8, 'All four resources released in reverse order of acquisition, with zero cleanup code inside <code>work()</code>. Detail: <code>unique_ptr</code> calls its deleter only for a <b>non-null</b> pointer (if <code>fopen</code> failed, <code>fclose(nullptr)</code> is never called), but <code>shared_ptr</code> calls its deleter even for a null pointer — so guard inside shared_ptr deleters.');
    return frames;
  }

  topics.push({
    title: 'make_unique / make_shared and Custom Deleters',
    analogy: `<p><b>Flat-pack furniture vs a delivered, assembled sofa.</b> Writing <code>new</code> yourself is buying the parts and assembling them in your hallway — it works, but if you get interrupted halfway (an exception), parts are lying everywhere. <code>make_unique</code>/<code>make_shared</code> is ordering it delivered and assembled in one go, with the "how to dispose of it" card already attached.</p>
      <p>A <b>custom deleter</b> is that disposal card: "this one is not thrown in the bin (<code>delete</code>) — return it to the rental shop (<code>pool</code>), unplug it first (<code>fclose</code>), recycle it (<code>free</code>)."</p>`,
    explain: `<p><b>Why prefer the make functions?</b></p>
      <ol><li><b>No naked new</b>: code with zero <code>new</code>/<code>delete</code> is easy to audit — any <code>new</code> left is a code-review flag.</li>
      <li><b>Type written once</b>: <code>auto p = std::make_unique&lt;VeryLongTypeName&gt;(args);</code></li>
      <li><b>Exception safety</b> (historically): before C++17, in <code>f(std::shared_ptr&lt;A&gt;(new A), g())</code> the compiler could run <code>new A</code>, then <code>g()</code>, then the shared_ptr constructor. If <code>g()</code> threw, the A leaked. <code>f(std::make_shared&lt;A&gt;(), g())</code> never had this problem. C++17 tightened evaluation order so each argument is fully evaluated before the next starts, but the habit is still right.</li>
      <li><b>make_shared performance</b>: one allocation for object + control block instead of two.</li></ol>
      <p><b>When you cannot (or should not) use them:</b></p>
      ${H.table(['Situation', 'Why', 'Use instead'], [
        ['Custom deleter needed', 'make_* take constructor args only', '<code>std::unique_ptr&lt;T, D&gt;(ptr, d)</code>, <code>std::shared_ptr&lt;T&gt;(ptr, d)</code>'],
        ['Private/protected constructor', 'make_* call it from outside the class', 'a static factory that does <code>std::shared_ptr&lt;T&gt;(new T(...))</code> (or the passkey idiom)'],
        ['Brace-initialisation wanted', 'make_* use parentheses: <code>make_unique&lt;vector&lt;int&gt;&gt;(3, 1)</code> = {1,1,1}', 'construct explicitly'],
        ['Huge object + long-lived weak_ptrs', 'make_shared memory freed only when the last weak_ptr goes', '<code>shared_ptr&lt;T&gt;(new T)</code>'],
        ['Custom allocator', '—', '<code>std::allocate_shared</code>'],
        ['Big buffer you will overwrite anyway', 'make_unique&lt;T[]&gt;(n) value-initialises (zeroes) n elements', '<code>std::make_unique_for_overwrite&lt;T[]&gt;(n)</code> (C++20)']
      ])}
      <p><b>Custom deleters</b> let smart pointers manage anything with a "release" function:</p>
      ${H.table(['Resource', 'Deleter'], [['<code>FILE*</code> from <code>fopen</code>', '<code>fclose</code>'], ['<code>malloc</code> memory', '<code>free</code>'], ['C library handles (sqlite3*, CURL*, SDL_Window*, OpenSSL objects)', 'their <code>*_close</code>/<code>*_free</code>/<code>*_destroy</code> function'], ['object from a pool', '"return to pool"'], ['memory you do NOT own (e.g. a static)', 'no-op deleter (use with care)']])}
      <p><b>Key difference:</b> for <code>unique_ptr&lt;T, D&gt;</code> the deleter is <b>part of the type</b> (and may add size); for <code>shared_ptr&lt;T&gt;</code> it is <b>type-erased</b> into the control block (no effect on type or handle size). Prefer a stateless functor struct (or a captureless lambda type via <code>decltype</code>) for unique_ptr so it stays 8 bytes.</p>`,
    clues: [
      '"Wrap this C API" / "handle with a close function" (<code>fopen/fclose</code>, <code>sqlite3_open/close</code>, <code>curl_easy_init/cleanup</code>) → unique_ptr + custom deleter',
      '"Why prefer make_shared over shared_ptr(new T)?" → one allocation, no naked new, exception safety, locality',
      '"When is make_shared a bad idea?" → custom deleter, private ctor, huge object with long-lived weak_ptrs',
      '"Object pool: return objects instead of deleting" → custom deleter that pushes back into the pool',
      '"Memory from malloc / an aligned allocator" → deleter calling <code>free</code> / the matching deallocator, never delete',
      '"Does the deleter change the size/type of the smart pointer?" → unique_ptr: yes (part of type, maybe size); shared_ptr: no'
    ],
    code: [R`
      #include <cstdio>
      #include <cstdlib>
      #include <iostream>
      #include <memory>

      // 1) Stateless functor: zero-size deleter, unique_ptr stays 8 bytes.
      struct FileCloser {
          void operator()(std::FILE* f) const noexcept { if (f) std::fclose(f); }
      };
      using FilePtr = std::unique_ptr<std::FILE, FileCloser>;

      FilePtr openFile(const char* path, const char* mode) {
          return FilePtr(std::fopen(path, mode));             // may hold nullptr if fopen failed
      }

      // 2) malloc'd memory must go back through free.
      struct FreeDeleter { void operator()(void* p) const noexcept { std::free(p); } };

      int main() {
          if (FilePtr f = openFile("/tmp/deleter_demo.txt", "w")) {
              std::fputs("hello\n", f.get());
          }                                                    // fclose runs here

          std::unique_ptr<char, FreeDeleter> buf(static_cast<char*>(std::malloc(32)));

          // 3) A captureless lambda as the deleter type (C++20 allows decltype of a lambda expression).
          auto closer = [](std::FILE* f) { if (f) std::fclose(f); };
          std::unique_ptr<std::FILE, decltype(closer)> g(std::fopen("/tmp/deleter_demo.txt", "r"), closer);

          // 4) shared_ptr: deleter is type-erased into the control block.
          std::shared_ptr<std::FILE> shared(std::fopen("/tmp/deleter_demo.txt", "r"),
                                            [](std::FILE* f) { if (f) std::fclose(f); });

          std::cout << sizeof(FilePtr) << " "                                   // 8
                    << sizeof(std::unique_ptr<std::FILE, int (*)(std::FILE*)>) << " "   // 16
                    << sizeof(shared) << "\n";                                    // 16
      }
    `, R`
      #include <memory>
      #include <string>
      // Private constructor: make_shared cannot reach it, a static factory can.
      class Session {
          std::string user_;
          explicit Session(std::string u) : user_(std::move(u)) {}
      public:
          static std::shared_ptr<Session> create(std::string u) {
              return std::shared_ptr<Session>(new Session(std::move(u)));   // OK inside the class
          }
          const std::string& user() const { return user_; }
      };
      int main() {
          auto s = Session::create("ana");
          auto big = std::make_unique_for_overwrite<char[]>(1 << 20);       // C++20: no zero-fill
          big[0] = 'x';
          return s->user() == "ana" && big[0] == 'x' ? 0 : 1;
      }
    `],
    codeTitle: ['Custom deleters: functor, free, lambda, shared_ptr', 'When make_* is not available: private ctor, for_overwrite'],
    viz: [{
      title: 'make_shared vs shared_ptr(new T): allocations and the weak_ptr tail',
      input: 'make',
      inputLabel: 'Mode: make or new',
      gen: allocCompare
    }, {
      title: 'Custom deleters at scope exit (destructor order on the stack)',
      gen: deleterOrder
    }],
    examples: [
      { title: 'Object pool with a "return, don\'t delete" deleter', html: `<p>Creating connections is expensive, so a pool hands out <code>unique_ptr</code>s whose deleter puts the object <b>back</b> into the pool. Callers use normal RAII and cannot forget to return it.</p>`, code: R`
        #include <iostream>
        #include <memory>
        #include <vector>
        struct Conn { int id; };
        class Pool {
            std::vector<std::unique_ptr<Conn>> free_;
            int next_ = 0;
        public:
            struct ReturnToPool {
                Pool* pool;
                void operator()(Conn* c) const { pool->free_.emplace_back(c); }   // reuse, don't delete
            };
            using Handle = std::unique_ptr<Conn, ReturnToPool>;
            Handle acquire() {
                if (free_.empty()) free_.push_back(std::make_unique<Conn>(Conn{next_++}));
                Conn* c = free_.back().release();
                free_.pop_back();
                return Handle(c, ReturnToPool{this});
            }
            std::size_t idle() const { return free_.size(); }
        };
        int main() {
            Pool pool;
            {
                auto a = pool.acquire();
                auto b = pool.acquire();
                std::cout << a->id << b->id << " idle=" << pool.idle() << "\n";   // 01 idle=0
            }
            std::cout << "idle=" << pool.idle() << "\n";                          // idle=2
            auto c = pool.acquire();                                               // reuses a connection
            std::cout << "reused " << c->id << "\n";
        }   // note: the pool must outlive its handles (c is destroyed before pool here)` },
      { title: 'Exception safety puzzle (pre-C++17)', html: `${H.table(['Call', 'Possible order before C++17', 'Leak?'], [['<code>f(std::shared_ptr&lt;A&gt;(new A), g())</code>', '<code>new A</code> → <code>g()</code> throws → shared_ptr never constructed', '<span class="c-r">yes, A leaks</span>'], ['<code>f(std::make_shared&lt;A&gt;(), g())</code>', 'allocation and ownership happen inside one function', '<span class="c-g">no</span>']])}<p>C++17 guarantees each function argument is fully evaluated before another starts (order between arguments still unspecified), which closes this hole — but interviewers still ask, and the make_* habit costs nothing.</p>` },
      { title: 'Handles that are not pointers (file descriptors)', html: `<p>A POSIX file descriptor is an <code>int</code>, not a pointer. unique_ptr works only if the deleter defines a nested <code>pointer</code> type that behaves like a nullable pointer — doable but awkward. A tiny dedicated RAII class (like the <code>Conn</code> handle in the RAII topic) is usually clearer:</p>`, code: R`
        #include <utility>
        class Fd {
            int fd_ = -1;
        public:
            explicit Fd(int fd) noexcept : fd_(fd) {}
            ~Fd() { if (fd_ >= 0) closeFd(fd_); }
            Fd(Fd&& o) noexcept : fd_(std::exchange(o.fd_, -1)) {}
            Fd& operator=(Fd&& o) noexcept { if (this != &o) { if (fd_ >= 0) closeFd(fd_); fd_ = std::exchange(o.fd_, -1); } return *this; }
            Fd(const Fd&) = delete;
            Fd& operator=(const Fd&) = delete;
            int get() const noexcept { return fd_; }
            static void closeFd(int) noexcept { /* ::close(fd) on POSIX */ }
        };
        int main() { Fd a(3); Fd b = std::move(a); return b.get() == 3 && a.get() == -1 ? 0 : 1; }` },
      { title: 'Deleter size cheat sheet (x86-64, libstdc++)', html: `${H.table(['Declaration', 'sizeof'], [['<code>unique_ptr&lt;T&gt;</code>', '8'], ['<code>unique_ptr&lt;T, EmptyFunctor&gt;</code>', '8'], ['<code>unique_ptr&lt;T, decltype(captureless_lambda)&gt;</code>', '8'], ['<code>unique_ptr&lt;T, void(*)(T*)&gt;</code>', '16'], ['<code>unique_ptr&lt;T, std::function&lt;void(T*)&gt;&gt;</code>', '40 (avoid)'], ['<code>shared_ptr&lt;T&gt;</code> with any deleter', '16 (deleter lives in the control block)']])}` }
    ],
    deepDive: `<p><b>How unique_ptr stores the deleter:</b> libstdc++ keeps <code>std::tuple&lt;pointer, D&gt;</code>; tuple uses the empty-base optimisation so an empty <code>D</code> costs 0 bytes (MSVC uses a compressed pair; C++20 code often uses <code>[[no_unique_address]]</code>). The deleter is called only if the pointer is non-null, and <code>get_deleter()</code> gives access to it. If <code>D</code> defines <code>D::pointer</code>, unique_ptr stores that type instead of <code>T*</code> — the hook for "fancy pointers" and non-pointer handles.</p>
      <p><b>How shared_ptr stores it:</b> the constructor taking a deleter allocates a <code>_Sp_counted_deleter&lt;Ptr, D, Alloc&gt;</code> control block that holds the deleter (and allocator). Disposal goes through a virtual call, so <code>shared_ptr&lt;Socket&gt;</code> objects with different deleters are interchangeable. <code>std::get_deleter&lt;D&gt;(sp)</code> can retrieve it if you know the type. Important guarantee: if allocating the control block throws, the shared_ptr constructor calls the deleter on the pointer you passed — no leak.</p>
      <p><b>make_shared internals:</b> one allocation of <code>_Sp_counted_ptr_inplace</code> containing aligned storage for T. Destruction is split: <code>_M_dispose</code> runs <code>~T()</code> when use_count hits 0; <code>_M_destroy</code> frees the storage when the weak count hits 0 — exactly the "zombie bytes" in the visualiser. <code>allocate_shared</code> does the same with your allocator, and C++20 adds <code>make_shared&lt;T[]&gt;</code> and <code>make_shared_for_overwrite</code>.</p>
      <p><b>Deleter pitfalls:</b> a deleter that throws → <code>std::terminate</code> (destructors are noexcept); a pool deleter that outlives its pool → use-after-free (the pool must outlive every handle, or the deleter should hold a <code>weak_ptr</code> to the pool and fall back to <code>delete</code>); a no-op deleter on a stack object handed to code that stores the shared_ptr → dangling. Converting <code>unique_ptr&lt;T, D&gt;</code> to <code>shared_ptr&lt;T&gt;</code> moves the deleter into the control block — that works fine.</p>`,
    aiEra: `<p><b>What AI changes:</b> wrapping a C library is a perfect AI task: give it the header, ask for <code>using XPtr = std::unique_ptr&lt;X, XDeleter&gt;;</code> for each create/destroy pair, and you get a safe C++ layer in minutes instead of an afternoon.</p>
      <p><b>Use AI as a partner:</b> <code>Here is the C API header. For every function returning an owned handle, find the matching release function and generate a zero-size unique_ptr deleter. Flag functions whose ownership is unclear from the docs.</code> Then read the library docs for the flagged ones — ownership rules ("caller must free" vs "borrowed reference") are exactly where models hallucinate.</p>
      <p><b>Where AI goes wrong:</b> it pairs the wrong release function (<code>free</code> vs a library-specific <code>X_free</code>), uses <code>std::function</code> deleters (40 bytes and a heap allocation), calls the deleter on null handles the C API does not accept, or uses make_shared together with a custom deleter (does not compile). <b>What you must own:</b> the allocation/deallocation pairing for every resource, and when the make_* functions are the wrong tool.</p>`,
    problems: [{
      title: 'Wrap a C Database Handle With unique_ptr and a Custom Deleter', level: 'Medium', tags: ['custom deleter', 'unique_ptr', 'C interop', 'RAII'], companies: ['Bloomberg', 'Apple', 'Adobe'],
      statement: `<p>A C library exposes <code>db_t* db_open(const char* path)</code> (returns NULL on failure), <code>void db_close(db_t*)</code>, <code>stmt_t* db_prepare(db_t*, const char* sql)</code> and <code>void stmt_finalize(stmt_t*)</code>. Statements must be finalized <b>before</b> their database is closed. Write a C++ layer with type aliases <code>DbPtr</code>/<code>StmtPtr</code> so that callers can never leak a handle or close in the wrong order, and <code>openDb</code> throws if the open fails.</p>`,
      constraints: `Smart pointer handles must stay 8 bytes. No manual close calls in user code. Destruction order must be correct even when an exception is thrown between prepare and use.`,
      example: `<p><code>auto db = openDb("a.db"); auto st = prepare(db, "SELECT 1");</code> → at scope end: ${H.c('g', 'stmt_finalize, then db_close')} (reverse order of declaration).</p>`,
      brute: { why: `<p>Manual calls in every function: <code>db_close</code> forgotten on the error path, statements finalized after the database was already closed when a refactor reorders lines, and a <code>std::function</code> deleter that bloats each handle to 40 bytes.</p>`, code: R`
        struct db_t { int open = 1; };
        struct stmt_t { db_t* db; };
        db_t* db_open(const char*) { return new db_t; }
        void db_close(db_t* d) { delete d; }
        stmt_t* db_prepare(db_t* d, const char*) { return new stmt_t{d}; }
        void stmt_finalize(stmt_t* s) { delete s; }
        int runManual(const char* path) {
            db_t* db = db_open(path);
            stmt_t* st = db_prepare(db, "SELECT 1");
            if (!st) return -1;                 // LEAK: db never closed
            db_close(db);                       // BUG: closed before finalize
            stmt_finalize(st);
            return 0;
        }` },
      mcq: { q: 'Which deleter keeps <code>std::unique_ptr&lt;db_t, D&gt;</code> at 8 bytes?', options: ['An empty struct with <code>operator()(db_t*)</code>', '<code>void(*)(db_t*)</code> function pointer', '<code>std::function&lt;void(db_t*)&gt;</code>', 'A lambda capturing the path'], answer: 0, explain: 'An empty (stateless) deleter takes no storage thanks to the empty-base optimisation; function pointers and std::function must be stored inside the unique_ptr.' },
      hints: [`<p>Hint 1: One stateless deleter struct per release function: <code>struct DbCloser { void operator()(db_t* d) const noexcept { db_close(d); } };</code></p>`, `<p>Hint 2: <code>using DbPtr = std::unique_ptr&lt;db_t, DbCloser&gt;;</code> and the same for statements. A factory <code>openDb</code> checks for null and throws.</p>`, `<p>Hint 3: Order: locals die in reverse, so declaring <code>db</code> before <code>st</code> already finalizes first. To make wrong usage impossible, have <code>prepare</code> take <code>const DbPtr&amp;</code> (the database must exist already) and document that statements must not outlive it — or bundle them in a class whose members are declared db first, statements after.</p>`],
      solution: {
        approach: `<p>Zero-size functor deleters + type aliases give 8-byte RAII handles. Factories translate C error conventions (NULL) into exceptions. Correct teardown order falls out of C++'s reverse-destruction rule; a <code>Connection</code> class that declares the database member before its statement members makes the order a property of the type rather than of each caller.</p>`,
        code: R`
          #include <iostream>
          #include <memory>
          #include <stdexcept>
          #include <string>
          #include <vector>
          // --- pretend C library ---
          struct db_t { std::string path; };
          struct stmt_t { db_t* db; std::string sql; };
          db_t* db_open(const char* p) { return p && *p ? new db_t{p} : nullptr; }
          void db_close(db_t* d) { std::cout << "db_close " << d->path << "\n"; delete d; }
          stmt_t* db_prepare(db_t* d, const char* sql) { return new stmt_t{d, sql}; }
          void stmt_finalize(stmt_t* s) { std::cout << "finalize " << s->sql << "\n"; delete s; }
          // --- C++ layer ---
          struct DbCloser   { void operator()(db_t* d) const noexcept { db_close(d); } };
          struct StmtCloser { void operator()(stmt_t* s) const noexcept { stmt_finalize(s); } };
          using DbPtr   = std::unique_ptr<db_t, DbCloser>;
          using StmtPtr = std::unique_ptr<stmt_t, StmtCloser>;
          static_assert(sizeof(DbPtr) == sizeof(db_t*), "deleter must be zero-size");

          DbPtr openDb(const std::string& path) {
              DbPtr db(db_open(path.c_str()));
              if (!db) throw std::runtime_error("cannot open " + path);
              return db;
          }
          StmtPtr prepare(const DbPtr& db, const std::string& sql) {
              StmtPtr st(db_prepare(db.get(), sql.c_str()));
              if (!st) throw std::runtime_error("prepare failed: " + sql);
              return st;
          }
          class Connection {                     // member order = teardown order guarantee
              DbPtr db_;                         // declared first -> destroyed last
              std::vector<StmtPtr> stmts_;       // destroyed first
          public:
              explicit Connection(const std::string& path) : db_(openDb(path)) {}
              stmt_t* add(const std::string& sql) { stmts_.push_back(prepare(db_, sql)); return stmts_.back().get(); }
          };
          int main() {
              Connection c("app.db");
              c.add("SELECT 1");
              c.add("SELECT 2");
          }   // finalize SELECT 1, finalize SELECT 2, db_close app.db
        `,
        dry: { head: ['event', 'handles alive', 'output'], rows: [
          ['Connection c("app.db")', 'db_', '—'],
          ['add("SELECT 1"), add("SELECT 2")', 'db_, stmts_[0], stmts_[1]', '—'],
          ['~Connection: stmts_ destroyed first', 'db_', 'finalize SELECT 1, finalize SELECT 2'],
          ['then db_ destroyed', '—', 'db_close app.db'],
          ['openDb("") instead', '—', 'throws, nothing to clean']
        ] },
        complexity: `<p>O(1) per handle operation; each handle is 8 bytes; no extra allocations beyond the C library's own.</p>`,
        followUps: ['How would you let a statement safely outlive the Connection object (hint: shared_ptr&lt;db_t&gt; inside the statement\'s deleter)?', 'What if <code>db_close</code> can fail and you need to report the error?', 'How does <code>std::out_ptr</code> (C++23) help with C APIs that return handles through a <code>T**</code> parameter?']
      }
    }]
  });

  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Fix the Mismatched delete (and Then Delete Neither)', level: 'Easy', tags: ['new[]/delete[]', 'vector', 'leak hunt'], companies: ['Amazon', 'Infosys', 'Qualcomm'],
    statement: `<p><code>average(n)</code> reads <code>n</code> doubles into <code>new double[n]</code>, returns their mean and frees the array with <code>delete arr;</code>. Explain why this is undefined behavior, fix it minimally, then rewrite it so no manual memory management remains. Also handle <code>n == 0</code>.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>6</sup>. Return 0.0 for n = 0.`,
    example: `<p>values = ${H.arr([2, 4, 9], { label: 'input' })} → mean ${H.c('g', '5.0')}. With <code>delete</code> instead of <code>delete[]</code> it may "work" for doubles on GCC — ${H.c('r', 'still UB')}, and for class types it runs only one destructor and can crash.</p>`,
    brute: { why: `<p>The original pairs <code>new[]</code> with scalar <code>delete</code> (UB) and also divides by zero for n = 0. Even after switching to <code>delete[]</code>, any exception between allocation and the delete (e.g. a throwing input parser) leaks the array.</p>`, code: R`
      #include <vector>
      double averageBuggy(const std::vector<double>& in) {
          int n = static_cast<int>(in.size());
          double* arr = new double[n];
          for (int i = 0; i < n; ++i) arr[i] = in[i];
          double s = 0;
          for (int i = 0; i < n; ++i) s += arr[i];
          delete arr;                 // UB: must be delete[]
          return s / n;               // n == 0 -> NaN
      }` },
    mcq: { q: 'What exactly is wrong with <code>new double[n]</code> + <code>delete arr</code>?', options: ['Undefined behavior: array form must be freed with delete[]', 'Only a memory leak', 'Compile error', 'Nothing for doubles, it is fine'], answer: 0, explain: 'Mixing the array and scalar forms is UB regardless of element type. It often appears to work for trivial types, which hides it.' },
    hints: [`<p>Hint 1: Every <code>new T[n]</code> needs <code>delete[]</code>; the minimal fix is adding the brackets — but think about exceptions and early returns too.</p>`, `<p>Hint 2: <code>std::vector&lt;double&gt;</code> owns its buffer and frees it with the right form automatically; you do not even need a copy if you can read the input directly.</p>`, `<p>Hint 3: Recipe — if <code>in.empty()</code> return 0.0; otherwise <code>std::accumulate(in.begin(), in.end(), 0.0) / in.size()</code>. Note the <code>0.0</code> seed: an <code>int</code> seed would truncate.</p>`],
    solution: {
      approach: `<p>Minimal fix: <code>delete[] arr;</code> plus an n = 0 guard. Real fix: no owning raw pointer at all — operate on the vector (or copy into one) and let RAII free it. Use <code>std::accumulate</code> with a <code>double</code> initial value.</p>`,
      code: R`
        #include <iostream>
        #include <numeric>
        #include <vector>
        double average(const std::vector<double>& in) {
            if (in.empty()) return 0.0;
            return std::accumulate(in.begin(), in.end(), 0.0) / static_cast<double>(in.size());
        }
        int main() {
            std::cout << average({2, 4, 9}) << " " << average({}) << "\n";   // 5 0
        }
      `,
      dry: { head: ['input', 'empty?', 'sum', 'result'], rows: [['{2,4,9}', 'no', '15.0', '5.0'], ['{}', 'yes', '—', '0.0']] },
      complexity: `<p>O(n) time, O(1) extra memory (no copy at all in the final version).</p>`,
      followUps: ['What is the "array cookie" and why does it make delete vs delete[] matter for class types?', 'When would <code>std::unique_ptr&lt;double[]&gt;</code> be preferable to a vector?']
    }
  });

  practice.push({
    title: 'Rule of Zero: Make Image Copy-Safe', level: 'Easy', tags: ['rule of 3/5/0', 'shallow copy', 'double free'], companies: ['Adobe', 'Microsoft', 'EA'],
    statement: `<p><code>class Image</code> holds <code>unsigned char* pixels_</code> allocated with <code>new[]</code> and a destructor that <code>delete[]</code>s it. Copying an Image crashes at the end of the program with "double free". Make <code>Image</code> safe to copy (deep copy) and move, writing <b>no</b> destructor, copy or move functions.</p>`,
    constraints: `Width/height up to 10<sup>4</sup>. Copies must be independent (changing one does not change the other).`,
    example: `<p><code>Image a(2, 2); Image b = a; b.set(0, 0, 255);</code> → ${H.c('g', 'a.get(0,0) == 0, b.get(0,0) == 255')}. Original code: both share one buffer → ${H.c('r', 'both destructors delete[] it')}.</p>`,
    brute: { why: `<p>The compiler-generated copy constructor copies the <b>pointer</b> (shallow copy), so two Images own one buffer; the second destructor frees freed memory. Writing a correct Rule-of-5 by hand (deep copy ctor, copy-and-swap assignment, move ctor/assign, destructor) is ~30 lines and easy to get subtly wrong.</p>`, code: R`
      #include <cstddef>
      class ImageBad {
          std::size_t w_, h_;
          unsigned char* pixels_;
      public:
          ImageBad(std::size_t w, std::size_t h) : w_(w), h_(h), pixels_(new unsigned char[w * h]()) {}
          ~ImageBad() { delete[] pixels_; }     // implicit copy duplicates pixels_ -> double free
      };
      int main() { ImageBad a(2, 2); /* ImageBad b = a;  -> double free at exit */ }` },
    mcq: { q: 'Which member makes <code>Image</code> correctly copyable with zero hand-written special members?', options: ['std::vector&lt;unsigned char&gt;', 'std::unique_ptr&lt;unsigned char[]&gt;', 'std::shared_ptr&lt;unsigned char[]&gt;', 'unsigned char* with a destructor'], answer: 0, explain: 'vector deep-copies on copy and moves cheaply. unique_ptr would make Image move-only; shared_ptr would make copies share (and mutate) the same pixels.' },
    hints: [`<p>Hint 1: The bug is "two owners of one buffer". Which standard type owns a buffer and knows how to deep-copy it?</p>`, `<p>Hint 2: Replace the raw pointer with <code>std::vector&lt;unsigned char&gt;</code> sized <code>w*h</code>; delete the destructor.</p>`, `<p>Hint 3: Now the implicit copy constructor copies the vector (deep), the implicit move moves it (O(1)), and the implicit destructor frees it. That is the Rule of Zero.</p>`],
    solution: {
      approach: `<p>Rule of Zero: let a member that already has correct value semantics own the resource. <code>std::vector</code> deep-copies, moves in O(1) and frees itself, so every special member the compiler generates for Image is correct.</p>`,
      code: R`
        #include <cassert>
        #include <cstddef>
        #include <vector>
        class Image {
            std::size_t w_, h_;
            std::vector<unsigned char> pixels_;      // owns + deep-copies
        public:
            Image(std::size_t w, std::size_t h) : w_(w), h_(h), pixels_(w * h, 0) {}
            unsigned char get(std::size_t x, std::size_t y) const { return pixels_[y * w_ + x]; }
            void set(std::size_t x, std::size_t y, unsigned char v) { pixels_[y * w_ + x] = v; }
        };
        int main() {
            Image a(2, 2);
            Image b = a;                // deep copy
            b.set(0, 0, 255);
            assert(a.get(0, 0) == 0 && b.get(0, 0) == 255);
            Image c = std::move(b);     // O(1) move
            assert(c.get(0, 0) == 255);
        }
      `,
      complexity: `<p>Copy O(w·h) (it must duplicate pixels), move O(1), destruction O(1) for trivial elements.</p>`,
      followUps: ['If copies were rare and images huge, how could <code>shared_ptr&lt;const std::vector&lt;unsigned char&gt;&gt;</code> give copy-on-write?', 'Why would <code>unique_ptr&lt;unsigned char[]&gt;</code> make Image move-only?']
    }
  });

  practice.push({
    title: 'Fix the Dangling Reference Return', level: 'Easy', tags: ['stack lifetime', 'dangling reference', 'string_view'], companies: ['Google', 'Bloomberg'],
    statement: `<p>Three helper functions compile (with warnings) but print garbage: one returns <code>const std::string&amp;</code> to a local, one returns <code>std::string_view</code> into a local string, and one returns <code>const char*</code> from <code>local.c_str()</code>. Explain each in terms of stack lifetime and fix all three.</p>`,
    constraints: `Keep the functions' purpose: build "Hello, &lt;name&gt;!". No heap allocation by hand.`,
    example: `<p><code>greet("Ana")</code> should return ${H.c('g', '"Hello, Ana!"')}. The buggy versions return a view/reference into a string that was ${H.c('r', 'destroyed when the function returned')}.</p>`,
    brute: { why: `<p>All three return a <b>non-owning</b> handle (reference, view, raw char pointer) to an object whose storage belongs to the function's stack frame (and possibly a heap buffer it owned). When the frame is popped the string's destructor runs and frees/invalidates that storage.</p>`, code: R`
      #include <string>
      #include <string_view>
      const std::string& greetRef(const std::string& n) { std::string s = "Hello, " + n + "!"; return s; }   // dangling
      std::string_view greetView(const std::string& n) { std::string s = "Hello, " + n + "!"; return s; }    // dangling
      const char* greetC(const std::string& n) { std::string s = "Hello, " + n + "!"; return s.c_str(); }   // dangling` },
    mcq: { q: 'Is returning <code>std::string</code> by value expensive here?', options: ['No — copy elision/move makes it cheap', 'Yes — it always deep-copies', 'Yes — it allocates twice', 'It does not compile'], answer: 0, explain: 'Returning a local by value uses NRVO or, failing that, a move (a pointer swap). The safe version costs nothing extra.' },
    hints: [`<p>Hint 1: Ask "who owns the characters after return?" For all three versions the answer is "a dead object".</p>`, `<p>Hint 2: Return an <b>owning</b> type: <code>std::string</code> by value.</p>`, `<p>Hint 3: A function may return a reference/view only to something that outlives the call: a parameter passed by reference, a member of <code>*this</code>, or a static. Turn on <code>-Wall</code> (GCC warns "reference to local variable returned") and <code>-fsanitize=address</code>.</p>`],
    solution: {
      approach: `<p>Return by value. The string object is moved (or constructed directly in the caller's storage via NRVO), so the caller owns the characters. Views and references are fine as <i>parameters</i> (the caller keeps the data alive during the call) but dangerous as return types from functions that build data locally.</p>`,
      code: R`
        #include <iostream>
        #include <string>
        #include <string_view>
        std::string greet(std::string_view name) {           // view as parameter: fine
            std::string s = "Hello, ";
            s += name;
            s += '!';
            return s;                                         // owning return: safe and cheap
        }
        int main() {
            std::string g = greet("Ana");
            std::cout << g << "\n";                           // Hello, Ana!
        }
      `,
      dry: { head: ['version', 'returns', 'owner after return', 'safe?'], rows: [['greetRef', 'const string&amp;', 'dead local', '<span class="c-r">no</span>'], ['greetView', 'string_view', 'dead local', '<span class="c-r">no</span>'], ['greetC', 'const char*', 'dead local', '<span class="c-r">no</span>'], ['greet', 'string', 'caller', '<span class="c-g">yes</span>']] },
      complexity: `<p>O(len) to build the string; return is O(1).</p>`,
      followUps: ['When is returning <code>const std::string&amp;</code> from a getter OK?', 'What does <code>std::string_view sv = greet("x");</code> do? (Hint: the temporary dies at the semicolon.)']
    }
  });

  practice.push({
    title: 'Prove There Is No Leak With an Instance Counter', level: 'Easy', tags: ['testing', 'RAII', 'leak detection'], companies: ['Microsoft', 'Amazon'],
    statement: `<p>Write a reusable <code>Counted</code> base (or mixin) that tracks how many objects of a type are alive, then write a test showing that a function which builds a vector of <code>unique_ptr&lt;Order&gt;</code> and throws halfway leaves <b>zero</b> live Orders. Show that the raw-pointer version leaks.</p>`,
    constraints: `Count must include copies and moves (every constructor increments, the destructor decrements). Single-threaded test.`,
    example: `<p>After <code>try { buildOrders(5, /*failAt=*/3); } catch (...) {}</code>: raw version ${H.c('r', 'alive == 3')}, unique_ptr version ${H.c('g', 'alive == 0')}.</p>`,
    brute: { why: `<p>Storing <code>Order*</code> in a vector and deleting them at the end of the function leaks every Order created before the throw — the cleanup loop never runs. Without a counter, nothing in a unit test notices; the leak shows up weeks later as rising memory in production.</p>`, code: R`
      #include <stdexcept>
      #include <vector>
      struct Order { static inline int alive = 0; Order() { ++alive; } ~Order() { --alive; } };
      void buildOrdersRaw(int n, int failAt) {
          std::vector<Order*> v;
          for (int i = 0; i < n; ++i) {
              if (i == failAt) throw std::runtime_error("db down");
              v.push_back(new Order());
          }
          for (Order* o : v) delete o;           // never reached on throw -> leak
      }
      int main() { try { buildOrdersRaw(5, 3); } catch (...) {} return Order::alive; }   // returns 3` },
    mcq: { q: 'Why must the copy constructor also increment the counter?', options: ['Copies are destroyed too; otherwise the count goes negative', 'The compiler requires it', 'To make the class movable', 'It does not need to'], answer: 0, explain: 'Every object that is destroyed decrements. If some constructors (copy/move) do not increment, the books do not balance.' },
    hints: [`<p>Hint 1: A CRTP template <code>template&lt;class T&gt; struct Counted { static inline int alive = 0; ... };</code> gives each type its own counter.</p>`, `<p>Hint 2: Define default, copy and move constructors that all <code>++alive</code>, and a destructor that <code>--alive</code>. Assignment does not change the count.</p>`, `<p>Hint 3: Test: record <code>alive</code> before, call the function in try/catch, assert it is unchanged. Swap <code>Order*</code> for <code>std::unique_ptr&lt;Order&gt;</code> and the vector's destructor cleans up during unwinding.</p>`],
    solution: {
      approach: `<p>A CRTP base gives every derived type an independent static counter. The test is "count before == count after", even when the function throws. With <code>std::vector&lt;std::unique_ptr&lt;Order&gt;&gt;</code>, unwinding destroys the vector, which destroys each unique_ptr, which deletes each Order.</p>`,
      code: R`
        #include <cassert>
        #include <memory>
        #include <stdexcept>
        #include <vector>
        template <class T>
        struct Counted {
            static inline int alive = 0;
            Counted() { ++alive; }
            Counted(const Counted&) { ++alive; }
            Counted(Counted&&) noexcept { ++alive; }
            Counted& operator=(const Counted&) = default;
            Counted& operator=(Counted&&) = default;
            ~Counted() { --alive; }
        };
        struct Order : Counted<Order> { int id = 0; };

        std::vector<std::unique_ptr<Order>> buildOrders(int n, int failAt) {
            std::vector<std::unique_ptr<Order>> v;
            for (int i = 0; i < n; ++i) {
                if (i == failAt) throw std::runtime_error("db down");
                v.push_back(std::make_unique<Order>());
            }
            return v;
        }
        int main() {
            int before = Order::alive;
            try { buildOrders(5, 3); } catch (const std::exception&) {}
            assert(Order::alive == before);          // nothing leaked
            { auto ok = buildOrders(4, -1); assert(Order::alive == before + 4); }
            assert(Order::alive == before);
        }
      `,
      dry: { head: ['i', 'action', 'alive'], rows: [['0..2', 'make_unique', '1, 2, 3'], ['3', 'throw', '3'], ['unwind', '~vector → 3 × ~unique_ptr', '0'], ['assert', 'before == after', '<span class="c-g">pass</span>']] },
      complexity: `<p>O(1) overhead per construction/destruction. For multithreaded tests make the counter <code>std::atomic&lt;int&gt;</code>.</p>`,
      followUps: ['How would you count bytes instead of objects (global operator new)?', 'How does LeakSanitizer find leaks without any counters?']
    }
  });

  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'Linked List of unique_ptr Without Stack Overflow', level: 'Medium', tags: ['unique_ptr', 'linked list', 'destructor', 'recursion'], companies: ['Google', 'Meta', 'Amazon'],
    statement: `<p>Implement a singly linked list where each node owns the next via <code>std::unique_ptr&lt;Node&gt; next</code>. Support <code>push_front</code>, <code>pop_front</code>, <code>reverse</code> and <code>size</code>. The list must be destroyable with <b>10 million</b> nodes — the naive version crashes with a stack overflow when it goes out of scope. Explain why and fix it.</p>`,
    constraints: `Up to 10<sup>7</sup> nodes. No raw <code>new</code>/<code>delete</code>. O(1) push/pop, O(n) reverse.`,
    example: `<p>push_front 3, 2, 1 → ${H.arr([1, 2, 3], { label: 'list' })} → reverse → ${H.arr([3, 2, 1], { label: 'list' })}. Destroying a list of 10<sup>7</sup> nodes: naive ${H.c('r', 'segfault')}, fixed ${H.c('g', 'fine')}.</p>`,
    brute: { why: `<p>With the default destructor, destroying the head destroys <code>head-&gt;next</code>, which destroys its <code>next</code>, and so on: a recursion as deep as the list. Each level uses a stack frame (~50–100 bytes), so ~10<sup>5</sup>–10<sup>6</sup> nodes exhaust an 8 MB stack.</p>`, code: R`
      #include <memory>
      struct NodeR { int val; std::unique_ptr<NodeR> next; };
      struct ListNaive {
          std::unique_ptr<NodeR> head;
          void push_front(int v) { head = std::unique_ptr<NodeR>(new NodeR{v, std::move(head)}); }
          // implicit ~ListNaive(): destroys head -> recursive chain of ~NodeR -> stack overflow for huge lists
      };
      int main() { ListNaive l; for (int i = 0; i < 1000; ++i) l.push_front(i); }` },
    mcq: { q: 'Why does the iterative destructor avoid deep recursion?', options: ['It detaches each node\'s next before the node dies, so each destructor has nothing to recurse into', 'It uses delete instead of unique_ptr', 'Compilers optimize recursion away automatically', 'It frees nodes in reverse order'], answer: 0, explain: 'Moving next out (head = std::move(head->next)) leaves the old node with an empty next; its destructor is O(1) and non-recursive.' },
    hints: [`<p>Hint 1: Who calls whom during destruction? <code>~unique_ptr</code> → <code>~Node</code> → <code>~unique_ptr</code> (next) → … that is recursion.</p>`, `<p>Hint 2: In <code>~List()</code>, loop: <code>while (head) head = std::move(head-&gt;next);</code>. Each assignment destroys exactly one node whose <code>next</code> was already moved out.</p>`, `<p>Hint 3: Reverse with three owners: <code>prev</code>, <code>cur = std::move(head)</code>, and <code>next = std::move(cur-&gt;next)</code>; then <code>cur-&gt;next = std::move(prev); prev = std::move(cur); cur = std::move(next);</code>. Finally <code>head = std::move(prev)</code>.</p>`],
    solution: {
      approach: `<p>Ownership is a chain of unique_ptrs. To destroy it without recursion, peel off one node at a time: move the head's <code>next</code> into <code>head</code>, which destroys the old head (whose next is now empty). Reverse uses the same "move the links" style, so no node is ever copied or leaked.</p>`,
      code: R`
        #include <cassert>
        #include <cstddef>
        #include <memory>
        #include <utility>
        class List {
            struct Node { int val; std::unique_ptr<Node> next; };
            std::unique_ptr<Node> head_;
            std::size_t n_ = 0;
        public:
            List() = default;
            List(List&&) noexcept = default;
            List& operator=(List&&) noexcept = default;
            ~List() { while (head_) head_ = std::move(head_->next); }   // iterative: O(1) stack
            void push_front(int v) { head_ = std::unique_ptr<Node>(new Node{v, std::move(head_)}); ++n_; }
            bool pop_front() {
                if (!head_) return false;
                head_ = std::move(head_->next);                          // old head destroyed here
                --n_;
                return true;
            }
            void reverse() {
                std::unique_ptr<Node> prev, cur = std::move(head_);
                while (cur) {
                    auto next = std::move(cur->next);
                    cur->next = std::move(prev);
                    prev = std::move(cur);
                    cur = std::move(next);
                }
                head_ = std::move(prev);
            }
            int front() const { return head_->val; }
            std::size_t size() const { return n_; }
        };
        int main() {
            List l;
            for (int v : {3, 2, 1}) l.push_front(v);     // 1 2 3
            l.reverse();                                  // 3 2 1
            assert(l.front() == 3 && l.size() == 3);
            List big;
            for (int i = 0; i < 10'000'000; ++i) big.push_front(i);
        }   // big destroyed iteratively: no stack overflow
      `,
      dry: { head: ['step', 'prev', 'cur', 'next', 'list so far'], rows: [['start', '∅', '1', '—', '1→2→3'], ['iter 1', '1', '2', '2', '1→∅'], ['iter 2', '2', '3', '3', '2→1'], ['iter 3', '3', '∅', '∅', '3→2→1'], ['done', '—', '—', '—', 'head = 3→2→1']] },
      complexity: `<p>push/pop O(1); reverse O(n); destruction O(n) time, O(1) stack. Note: <code>new Node{...}</code> appears only because <code>make_unique</code> cannot aggregate-initialise before C++20's parenthesised aggregate init; in C++20 <code>std::make_unique&lt;Node&gt;(v, std::move(head_))</code> also works.</p>`,
      followUps: ['Why is <code>shared_ptr</code> for <code>next</code> a poor choice here?', 'How would you add an O(1) <code>push_back</code> (raw tail pointer — why is that safe)?']
    }
  });

  practice.push({
    title: 'Texture Cache That Never Keeps Unused Textures Alive', level: 'Medium', tags: ['weak_ptr', 'cache', 'flyweight', 'shared_ptr'], companies: ['Unity', 'EA', 'Nvidia', 'Adobe'],
    statement: `<p>Implement <code>TextureCache::get(name)</code> returning <code>std::shared_ptr&lt;Texture&gt;</code>. If some part of the program still uses a texture with that name, return the <b>same</b> object; if all users have released it, it must already have been freed, and <code>get</code> loads it again. The cache itself must not keep textures alive. Add <code>purge()</code> to drop expired map entries.</p>`,
    constraints: `Loading is expensive (count loads). Up to 10<sup>5</sup> names. Single-threaded (follow-up: thread-safe).`,
    example: `${H.table(['Call', 'loads', 'note'], [['a = get("grass")', '1', 'loaded'], ['b = get("grass")', '1', '<span class="c-g">same object, a == b</span>'], ['a.reset(); b.reset()', '1', 'texture freed (cache holds only weak_ptr)'], ['c = get("grass")', '2', 'expired → loaded again']])}`,
    brute: { why: `<p>A map of <code>shared_ptr&lt;Texture&gt;</code> works as a cache but <b>never frees</b> anything: the cache is itself an owner, so use_count never reaches 0. Memory only grows. A map of raw pointers cannot tell whether a texture is still alive.</p>`, code: R`
      #include <map>
      #include <memory>
      #include <string>
      struct Texture { std::string name; };
      class CacheForever {
          std::map<std::string, std::shared_ptr<Texture>> m_;      // owns everything forever
      public:
          std::shared_ptr<Texture> get(const std::string& n) {
              auto& sp = m_[n];
              if (!sp) sp = std::make_shared<Texture>(Texture{n});
              return sp;
          }
      };
      int main() { CacheForever c; auto t = c.get("grass"); return t->name.size() == 5 ? 0 : 1; }` },
    mcq: { q: 'What does the cache store per name?', options: ['weak_ptr&lt;Texture&gt;', 'shared_ptr&lt;Texture&gt;', 'unique_ptr&lt;Texture&gt;', 'Texture by value'], answer: 0, explain: 'A weak_ptr lets the cache find a live texture (lock) without owning it, so the texture dies when its last real user lets go.' },
    hints: [`<p>Hint 1: The cache must <i>observe</i>, not own → <code>std::unordered_map&lt;std::string, std::weak_ptr&lt;Texture&gt;&gt;</code>.</p>`, `<p>Hint 2: In <code>get</code>: <code>if (auto sp = map[name].lock()) return sp;</code> otherwise load, store <code>map[name] = sp;</code> (assigning a shared_ptr to a weak_ptr), return sp.</p>`, `<p>Hint 3: Expired entries stay in the map as empty weak_ptrs (small, but they accumulate): <code>std::erase_if(map, [](auto&amp; kv){ return kv.second.expired(); })</code> in <code>purge()</code>. Prefer <code>shared_ptr(new T)</code> over make_shared if textures are huge, so expired entries do not pin the texture bytes (see the make_shared tail).</p>`],
    solution: {
      approach: `<p>Flyweight with weak references: users own textures through shared_ptr; the cache holds weak_ptrs and resurrects nothing — <code>lock()</code> either returns the live object or empty, in which case we reload. Because textures are large and the cache's weak_ptrs can live long, construct with <code>shared_ptr(new Texture)</code> so the pixel memory is released as soon as the last user leaves.</p>`,
      code: R`
        #include <cassert>
        #include <memory>
        #include <string>
        #include <unordered_map>
        #include <vector>
        struct Texture {
            std::string name;
            std::vector<unsigned char> pixels;
            static inline int loads = 0;
            explicit Texture(std::string n) : name(std::move(n)), pixels(1024) { ++loads; }
        };
        class TextureCache {
            std::unordered_map<std::string, std::weak_ptr<Texture>> map_;
        public:
            std::shared_ptr<Texture> get(const std::string& name) {
                auto& slot = map_[name];
                if (auto sp = slot.lock()) return sp;                 // still in use somewhere
                std::shared_ptr<Texture> sp(new Texture(name));     // separate block: bytes freed promptly
                slot = sp;                                          // observe only
                return sp;
            }
            void purge() { std::erase_if(map_, [](const auto& kv) { return kv.second.expired(); }); }
            std::size_t entries() const { return map_.size(); }
        };
        int main() {
            TextureCache c;
            auto a = c.get("grass");
            auto b = c.get("grass");
            assert(a == b && Texture::loads == 1);
            a.reset(); b.reset();                                   // texture destroyed now
            auto d = c.get("grass");
            assert(Texture::loads == 2);
            d.reset();
            c.purge();
            assert(c.entries() == 0);
        }
      `,
      dry: { head: ['call', 'weak slot', 'use_count', 'loads'], rows: [['get → a', 'set', '1', '1'], ['get → b', 'lock() ok', '2', '1'], ['a,b reset', 'expired', '0 (destroyed)', '1'], ['get → d', 'lock() empty → reload', '1', '2'], ['d reset; purge', 'erased', '—', '2']] },
      complexity: `<p><code>get</code> O(1) average (hash + lock CAS). Memory: one map entry per name until purge.</p>`,
      followUps: ['Make it thread-safe: what must the mutex protect, and can loading happen outside the lock?', 'Add an LRU "keep the last K textures alive" policy on top (hint: also hold K shared_ptrs).']
    }
  });

  practice.push({
    title: 'Doubly Linked List With shared_ptr next and weak_ptr prev', level: 'Medium', tags: ['weak_ptr', 'reference cycle', 'linked list'], companies: ['Amazon', 'Microsoft', 'Oracle'],
    statement: `<p>Implement a deque-like doubly linked list with <code>push_back</code>, <code>pop_front</code>, <code>pop_back</code>, and a backward traversal. Nodes link with <code>next</code> and <code>prev</code>. A first version that used <code>shared_ptr</code> for both links never frees its nodes. Fix the ownership so all nodes are freed when the list is destroyed.</p>`,
    constraints: `Up to 10<sup>5</sup> nodes (follow-up: 10<sup>7</sup>). O(1) push/pop at both ends.`,
    example: `<p>push_back 1, 2, 3 → forward ${H.arr([1, 2, 3])} backward ${H.arr([3, 2, 1])}. With shared_ptr both ways, after the list is destroyed ${H.c('r', 'each middle node still has use_count ≥ 1')} → leak.</p>`,
    brute: { why: `<p>With <code>shared_ptr</code> in both directions, neighbours own each other: node 1 owns 2 (next) and 2 owns 1 (prev). When the list drops head and tail, every node still has a count from its neighbour → nothing is ever freed.</p>`, code: R`
      #include <memory>
      struct DNodeBad { int v; std::shared_ptr<DNodeBad> next, prev; };     // cycle between neighbours
      int main() {
          auto a = std::make_shared<DNodeBad>(); auto b = std::make_shared<DNodeBad>();
          a->next = b; b->prev = a;
      }   // a and b leak` },
    mcq: { q: 'Which link direction should own?', options: ['next owns (shared_ptr), prev observes (weak_ptr)', 'prev owns, next observes', 'both observe', 'both own and call reset() in the destructor'], answer: 0, explain: 'One direction must be non-owning to break the 2-cycle; conventionally next owns so the head owns the whole chain.' },
    hints: [`<p>Hint 1: Every adjacent pair forms a 2-cycle if both links own. Choose one owning direction.</p>`, `<p>Hint 2: <code>std::shared_ptr&lt;Node&gt; next; std::weak_ptr&lt;Node&gt; prev;</code>. The list holds <code>head</code> (owning) and <code>tail</code> (a weak_ptr or raw pointer — the tail is already owned by its predecessor).</p>`, `<p>Hint 3: <code>pop_back</code>: <code>auto t = tail.lock(); auto p = t-&gt;prev.lock(); if (p) p-&gt;next.reset(); else head.reset(); tail = p;</code>. Iterative destructor as in the singly linked list problem to avoid deep recursion for huge lists.</p>`],
    solution: {
      approach: `<p>Owning direction = <code>next</code>; back links are <code>weak_ptr</code>. The list owns only <code>head</code>; <code>tail</code> is a weak observer. Popping fixes both neighbours' links. The destructor peels nodes iteratively. (In production you would use raw <code>prev</code> pointers — the list guarantees lifetimes and it avoids control-block traffic — or simply <code>std::list</code>; this exercise is about seeing the cycle.)</p>`,
      code: R`
        #include <cassert>
        #include <memory>
        #include <vector>
        class DList {
            struct Node { int v; std::shared_ptr<Node> next; std::weak_ptr<Node> prev; };
            std::shared_ptr<Node> head_;
            std::weak_ptr<Node> tail_;
        public:
            ~DList() { while (head_) head_ = std::move(head_->next); }
            void push_back(int v) {
                auto n = std::make_shared<Node>();
                n->v = v;
                if (auto t = tail_.lock()) { n->prev = t; t->next = n; }
                else head_ = n;
                tail_ = n;
            }
            bool pop_front() {
                if (!head_) return false;
                head_ = std::move(head_->next);
                if (head_) head_->prev.reset(); else tail_.reset();
                return true;
            }
            bool pop_back() {
                auto t = tail_.lock();
                if (!t) return false;
                auto p = t->prev.lock();
                if (p) p->next.reset(); else head_.reset();   // t destroyed when last owner drops
                tail_ = p;
                return true;
            }
            std::vector<int> backward() const {
                std::vector<int> out;
                for (auto n = tail_.lock(); n; n = n->prev.lock()) out.push_back(n->v);
                return out;
            }
        };
        int main() {
            DList d;
            for (int v : {1, 2, 3, 4}) d.push_back(v);
            assert((d.backward() == std::vector<int>{4, 3, 2, 1}));
            d.pop_back(); d.pop_front();
            assert((d.backward() == std::vector<int>{3, 2}));
        }   // all nodes freed: only next links own
      `,
      dry: { head: ['op', 'forward', 'owners of node 2', 'note'], rows: [['push 1..4', '1 2 3 4', 'node1.next', 'prev links add 0'], ['pop_back', '1 2 3', 'node1.next', 'node3.next reset → node4 freed'], ['pop_front', '2 3', 'head_', 'node1 freed, node2.prev reset'], ['~DList', '—', '—', 'iterative peel, all freed']] },
      complexity: `<p>All operations O(1) except traversal O(n). Each node carries 32 bytes of link overhead (two 16-byte smart pointers) plus a control block — a reason real lists use raw back pointers.</p>`,
      followUps: ['Rewrite with <code>unique_ptr next</code> + raw <code>Node* prev</code>. Why is the raw pointer safe there?', 'What does LeakSanitizer report for the buggy version ("indirect leak")?']
    }
  });

  practice.push({
    title: 'Shape Factory Registry and the Missing Virtual Destructor', level: 'Medium', tags: ['unique_ptr', 'polymorphism', 'virtual destructor', 'factory'], companies: ['Bloomberg', 'Autodesk', 'Microsoft'],
    statement: `<p>Build a registry <code>Factory</code> where shapes register a creator by name (<code>"circle"</code>, <code>"rect"</code>) and <code>create(name)</code> returns <code>std::unique_ptr&lt;Shape&gt;</code> (null for unknown names). A teammate's version leaks every <code>Rect</code>'s internal label buffer. Find the bug and build the registry correctly.</p>`,
    constraints: `Creators stored as <code>std::function&lt;std::unique_ptr&lt;Shape&gt;()&gt;</code>. Unknown name → nullptr, not an exception.`,
    example: `<p><code>auto s = f.create("rect"); s-&gt;area();</code> → works. At scope end the buggy version runs only ${H.c('r', '~Shape()')} — the Rect's <code>std::string</code> member is never destroyed. With <code>virtual ~Shape() = default;</code> ${H.c('g', '~Rect() then ~Shape()')}.</p>`,
    brute: { why: `<p>Deleting a derived object through a base pointer whose destructor is not virtual is <b>undefined behavior</b>; in practice only the base destructor runs, so derived members (strings, vectors) leak their memory. unique_ptr&lt;Shape&gt; calls <code>delete</code> on a <code>Shape*</code>, so it inherits this bug.</p>`, code: R`
      #include <memory>
      #include <string>
      struct ShapeBad { double area() const { return 0; } };                 // no virtual destructor
      struct RectBad : ShapeBad { std::string label = std::string(100, 'x'); };
      int main() {
          std::unique_ptr<ShapeBad> s = std::make_unique<RectBad>();       // compiles...
      }   // ...but delete through ShapeBad* -> UB, label's 100 bytes leak` },
    mcq: { q: 'What single line fixes the leak?', options: ['virtual ~Shape() = default; in the base class', 'Use shared_ptr instead of unique_ptr', 'Add ~Rect() that deletes label', 'Mark Rect final'], answer: 0, explain: 'A virtual destructor makes delete-through-base dispatch to the most-derived destructor. (Curiously, shared_ptr created by make_shared&lt;Rect&gt; would also call the right destructor, because its deleter captures the real type — but relying on that is fragile.)' },
    hints: [`<p>Hint 1: Who deletes the object? <code>unique_ptr&lt;Shape&gt;</code> → <code>delete (Shape*)p</code>. Which destructor does that call if <code>~Shape</code> is not virtual?</p>`, `<p>Hint 2: Base classes meant for polymorphic deletion need <code>virtual ~Base() = default;</code> (Core Guidelines C.35: public virtual or protected non-virtual).</p>`, `<p>Hint 3: Registry: <code>std::unordered_map&lt;std::string, std::function&lt;std::unique_ptr&lt;Shape&gt;()&gt;&gt;</code>; <code>create</code> looks up and calls the function, or returns nullptr.</p>`],
    solution: {
      approach: `<p>Give the base a virtual destructor; store creator lambdas that return <code>std::make_unique&lt;Derived&gt;()</code> converted to <code>unique_ptr&lt;Shape&gt;</code>. Ownership flows from the factory to the caller with no raw new/delete.</p>`,
      code: R`
        #include <cassert>
        #include <functional>
        #include <memory>
        #include <string>
        #include <unordered_map>
        struct Shape {
            virtual ~Shape() = default;                 // the fix
            virtual double area() const = 0;
        };
        struct Circle : Shape { double r = 1; double area() const override { return 3.14159 * r * r; } };
        struct Rect : Shape { std::string label = std::string(100, 'x'); double area() const override { return 6; } };

        class Factory {
            std::unordered_map<std::string, std::function<std::unique_ptr<Shape>()>> makers_;
        public:
            template <class T>
            void add(const std::string& name) { makers_[name] = [] { return std::make_unique<T>(); }; }
            std::unique_ptr<Shape> create(const std::string& name) const {
                auto it = makers_.find(name);
                return it == makers_.end() ? nullptr : it->second();
            }
        };
        int main() {
            Factory f;
            f.add<Circle>("circle");
            f.add<Rect>("rect");
            auto s = f.create("rect");
            assert(s && s->area() == 6);
            assert(f.create("hexagon") == nullptr);
        }   // ~Rect (frees label) then ~Shape
      `,
      complexity: `<p>create: O(1) average lookup + one allocation. Virtual destructor adds a vtable slot (the class already has a vptr because of <code>area()</code>).</p>`,
      followUps: ['Why does <code>std::shared_ptr&lt;ShapeBad&gt; p = std::make_shared&lt;RectBad&gt;();</code> happen to destroy correctly?', 'How would self-registration with static objects work, and what is the static initialisation order risk?']
    }
  });

  practice.push({
    title: 'Callbacks That Outlive Their Object: enable_shared_from_this', level: 'Medium', tags: ['enable_shared_from_this', 'weak_ptr', 'async', 'use-after-free'], companies: ['Google', 'Microsoft', 'Zoom', 'Discord'],
    statement: `<p>A <code>Connection</code> registers a callback with an <code>EventLoop</code> (a queue of <code>std::function&lt;void()&gt;</code> that runs later). The callback captures <code>this</code>. If the Connection is destroyed before the loop runs, the callback touches freed memory. Provide two fixes: (a) the callback keeps the Connection alive until it runs; (b) the callback is skipped if the Connection is gone.</p>`,
    constraints: `Connections are created via <code>std::make_shared</code>. No raw <code>this</code> captured in deferred callbacks.`,
    example: `${H.table(['Capture', 'Connection destroyed before loop runs', 'Behaviour'], [['<code>[this]</code>', 'yes', '<span class="c-r">use-after-free</span>'], ['<code>[self = shared_from_this()]</code>', 'no (kept alive)', 'callback runs safely'], ['<code>[weak = weak_from_this()]</code>', 'yes', 'lock() empty → skipped']])}`,
    brute: { why: `<p>Capturing <code>this</code> stores a raw pointer with no lifetime information. Wrapping it as <code>std::shared_ptr&lt;Connection&gt;(this)</code> is worse: it creates a second control block → double delete.</p>`, code: R`
      #include <functional>
      #include <iostream>
      #include <memory>
      #include <vector>
      std::vector<std::function<void()>> loopQueue;
      struct ConnBad {
          int id = 7;
          void onReadable() { loopQueue.push_back([this] { std::cout << id << "\n"; }); }   // raw this
      };
      int main() {
          { auto c = std::make_shared<ConnBad>(); c->onReadable(); }   // c destroyed
          // for (auto& f : loopQueue) f();   // would read freed memory
      }` },
    mcq: { q: 'Why does <code>shared_from_this()</code> require the object to already be owned by a shared_ptr?', options: ['It finds the existing control block through an internal weak_ptr set when the first shared_ptr was created', 'It allocates a new control block', 'It copies the object', 'It only works in constructors'], answer: 0, explain: 'enable_shared_from_this holds a weak_ptr that the first shared_ptr constructor fills in. If no shared_ptr owns the object, shared_from_this throws std::bad_weak_ptr (since C++17).' },
    hints: [`<p>Hint 1: Inherit <code>public std::enable_shared_from_this&lt;Connection&gt;</code>. It gives you <code>shared_from_this()</code> and <code>weak_from_this()</code>.</p>`, `<p>Hint 2: Fix (a): capture <code>self = shared_from_this()</code> — the queue now co-owns the Connection until the callback runs and is destroyed.</p>`, `<p>Hint 3: Fix (b): capture <code>weak = weak_from_this()</code> and inside do <code>if (auto self = weak.lock()) self-&gt;handle();</code>. Never call either in the constructor (no owner exists yet).</p>`],
    solution: {
      approach: `<p>Use the existing control block instead of raw <code>this</code>. Strong capture means "finish my work even if everybody else lets go" (good for writes that must complete); weak capture means "only if I still exist" (good for UI updates, timers, retries). Both prevent use-after-free.</p>`,
      code: R`
        #include <cassert>
        #include <functional>
        #include <memory>
        #include <string>
        #include <vector>
        struct EventLoop {
            std::vector<std::function<void()>> q;
            void runAll() { auto items = std::move(q); q.clear(); for (auto& f : items) f(); }
        };
        class Connection : public std::enable_shared_from_this<Connection> {
        public:
            std::vector<std::string>* log;
            explicit Connection(std::vector<std::string>* l) : log(l) {}
            void sendLater(EventLoop& loop) {               // (a) keep alive until done
                loop.q.push_back([self = shared_from_this()] { self->log->push_back("sent"); });
            }
            void refreshLater(EventLoop& loop) {            // (b) skip if gone
                loop.q.push_back([weak = weak_from_this()] {
                    if (auto self = weak.lock()) self->log->push_back("refreshed");
                    // else: the Connection is gone, nothing to do
                });
            }
        };
        int main() {
            std::vector<std::string> log;
            EventLoop sendLoop, refreshLoop;
            {
                auto c1 = std::make_shared<Connection>(&log);
                c1->sendLater(sendLoop);                    // queue co-owns c1
                auto c2 = std::make_shared<Connection>(&log);
                c2->refreshLater(refreshLoop);              // queue only observes c2
            }                                               // c2 destroyed now; c1 kept alive by sendLoop
            sendLoop.runAll();                              // "sent"
            refreshLoop.runAll();                           // lock() empty -> skipped
            assert(log.size() == 1 && log[0] == "sent");
        }                                                   // (c1 was freed at the end of sendLoop.runAll())
      `,
      dry: { head: ['moment', 'c1 use_count', 'c2 use_count', 'event'], rows: [['after make_shared + schedule', '2 (local + queue)', '1 (local; weak adds 0)', '—'], ['scope ends', '1 (queue)', '0 → destroyed', 'c2 gone'], ['sendLoop.runAll()', '1 → 0 after items die', '—', 'log "sent", then c1 freed'], ['refreshLoop.runAll()', '—', '—', 'lock() empty → skipped']] },
      complexity: `<p>Each capture copies a shared/weak pointer (atomic increment). lock() is a CAS. Negligible compared to I/O.</p>`,
      followUps: ['If one Connection scheduled both callbacks on the same loop, would the weak one run? (Hint: the strong lambda is still alive in the queue while the weak one runs.)', 'When is a strong capture dangerous (cycles: object owns loop, loop owns callback, callback owns object)?']
    }
  });

  practice.push({
    title: 'Copy-on-Write Document With shared_ptr<const T>', level: 'Medium', tags: ['shared_ptr', 'copy-on-write', 'immutability', 'use_count'], companies: ['Google', 'Figma', 'Adobe'],
    statement: `<p>Implement <code>Doc</code>, a value type holding a large <code>std::vector&lt;std::string&gt;</code> of lines. Copying a Doc must be O(1) (share the data); modifying a Doc (<code>setLine</code>) must not affect other copies — clone the data only if it is shared. Reads must never clone.</p>`,
    constraints: `Up to 10<sup>6</sup> lines; thousands of copies (undo history). Single-threaded writes per Doc.`,
    example: `<p><code>Doc a; a.append("x"); Doc b = a;</code> → ${H.c('b', 'share one buffer (use_count 2)')}. <code>b.setLine(0, "y")</code> → ${H.c('g', 'b clones, a still "x"')}. A second <code>b.setLine</code> does not clone again (b's buffer is now unshared).</p>`,
    brute: { why: `<p>Storing the vector by value deep-copies all lines on every copy — 10<sup>6</sup> strings per undo step. Storing <code>shared_ptr&lt;vector&gt;</code> without the clone check makes copies alias: editing one edits all.</p>`, code: R`
      #include <string>
      #include <vector>
      struct DocDeep {
          std::vector<std::string> lines;                // every copy duplicates everything
          void setLine(std::size_t i, std::string s) { lines[i] = std::move(s); }
      };
      int main() { DocDeep a{{"x"}}; DocDeep b = a; b.setLine(0, "y"); return a.lines[0] == "x" ? 0 : 1; }` },
    mcq: { q: 'Why store <code>shared_ptr&lt;const std::vector&lt;std::string&gt;&gt;</code> (const) rather than non-const?', options: ['Shared data can never be mutated in place by accident; writers must clone into a fresh buffer', 'const makes it faster', 'shared_ptr requires const', 'To prevent copying the Doc'], answer: 0, explain: 'Making the shared buffer const turns "mutate shared state" into a compile error; the only path to change is the explicit detach-and-clone.' },
    hints: [`<p>Hint 1: Copy = copy the shared_ptr (use_count + 1). The data is shared until someone writes.</p>`, `<p>Hint 2: Before a write, "detach": if <code>data_.use_count() &gt; 1</code> (or always, for simplicity), make a mutable copy: <code>auto copy = std::make_shared&lt;std::vector&lt;std::string&gt;&gt;(*data_);</code> modify it, then <code>data_ = std::move(copy);</code>.</p>`, `<p>Hint 3: If use_count() == 1 you are the sole owner — you may modify in place via a <code>const_cast</code> on a buffer you created as non-const, or keep it simple and keep a non-const shared_ptr privately while exposing only const reads. use_count is reliable here because a single Doc is not shared across threads.</p>`],
    solution: {
      approach: `<p>Hold the buffer through a shared_ptr. Copies share it. Writers call <code>detach()</code>, which clones only when <code>use_count() &gt; 1</code>; after that the writer is the sole owner and mutates in place. Readers get <code>const</code> access only. This is how many editors implement cheap undo snapshots.</p>`,
      code: R`
        #include <cassert>
        #include <memory>
        #include <string>
        #include <vector>
        class Doc {
            using Lines = std::vector<std::string>;
            std::shared_ptr<Lines> data_ = std::make_shared<Lines>();
            void detach() {
                if (data_.use_count() > 1) data_ = std::make_shared<Lines>(*data_);   // clone only if shared
            }
        public:
            const std::string& line(std::size_t i) const { return (*data_)[i]; }   // read: never clones
            std::size_t size() const { return data_->size(); }
            void append(std::string s) { detach(); data_->push_back(std::move(s)); }
            void setLine(std::size_t i, std::string s) { detach(); (*data_)[i] = std::move(s); }
            long sharers() const { return data_.use_count(); }
        };
        int main() {
            Doc a;
            a.append("x");
            Doc b = a;                         // O(1): shared
            assert(a.sharers() == 2);
            b.setLine(0, "y");                 // clone happens here
            assert(a.line(0) == "x" && b.line(0) == "y");
            assert(a.sharers() == 1 && b.sharers() == 1);
            b.setLine(0, "z");                 // no clone: b is sole owner
            assert(b.line(0) == "z");
        }
      `,
      dry: { head: ['op', 'a buffer', 'b buffer', 'use_count'], rows: [['a.append("x")', 'B1{x}', '—', '1'], ['b = a', 'B1{x}', 'B1', '2'], ['b.setLine(0,"y")', 'B1{x}', 'B2{y} (clone)', '1 / 1'], ['b.setLine(0,"z")', 'B1{x}', 'B2{z} (in place)', '1 / 1']] },
      complexity: `<p>Copy O(1); first write after sharing O(n) clone; later writes O(1). Reads O(1).</p>`,
      followUps: ['Why is <code>use_count()</code> unreliable for COW if Doc copies live on different threads?', 'How do persistent data structures (structural sharing) reduce the O(n) clone to O(log n)?']
    }
  });

  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'SharedPtr + WeakPtr With Strong and Weak Counts', level: 'Hard', tags: ['shared_ptr', 'weak_ptr', 'control block', 'atomics'], companies: ['Google', 'Jane Street', 'Citadel', 'Meta'],
    statement: `<p>Extend a hand-written <code>SharedPtr&lt;T&gt;</code> with a <code>WeakPtr&lt;T&gt;</code>. The control block holds an atomic <b>strong</b> count and an atomic <b>weak</b> count. Rules: object destroyed when strong hits 0; control block freed when strong and weak are both 0. Implement <code>WeakPtr::lock()</code> race-free ("increment strong only if it is not zero") and <code>expired()</code>.</p>`,
    constraints: `Thread-safe counts. No double free of the block when the last SharedPtr and the last WeakPtr die concurrently.`,
    example: `${H.table(['Code', 'strong', 'weak', 'object', 'block'], [['SharedPtr a(new int(1))', '1', '1*', 'alive', 'alive'], ['WeakPtr w = a', '1', '2*', 'alive', 'alive'], ['a.reset()', '0', '1', '<span class="c-r">deleted</span>', 'alive'], ['w.lock()', '0', '1', '—', 'returns empty'], ['w.reset()', '0', '0', '—', '<span class="c-g">freed</span>']])}<p class="c-m">* using the libstdc++ trick: weak = number of WeakPtrs + 1 while strong &gt; 0.</p>`,
    brute: { why: `<p>Freeing the control block when strong hits 0 (like the strong-only SharedPtr) leaves every WeakPtr pointing at freed memory. Checking <code>strong &gt; 0</code> and then incrementing in two steps (load, then fetch_add) races: another thread can drop strong to 0 and delete the object in between.</p>`, code: R`
      #include <atomic>
      struct CtrlRacy { std::atomic<long> strong{1}; int* obj; };
      int* lockRacy(CtrlRacy* c) {
          if (c->strong.load() > 0) {          // check...
              c->strong.fetch_add(1);           // ...then act: object may already be deleted
              return c->obj;
          }
          return nullptr;
      }` },
    mcq: { q: 'Why does libstdc++ keep "weak = WeakPtrs + 1 while any SharedPtr exists"?', options: ['So exactly one thread observes weak reaching 0 and frees the block, with no separate check of both counters', 'To make weak_ptr faster to copy', 'Because weak_ptr needs a strong reference', 'It is required by the standard wording'], answer: 0, explain: 'The strong owners collectively hold one weak reference. When strong hits 0 that thread drops the extra weak reference; whoever brings weak to 0 frees the block — a single atomic decision, so no race between "last strong" and "last weak".' },
    hints: [`<p>Hint 1: Block = <code>{ atomic&lt;long&gt; strong{1}, weak{1}; T* ptr; }</code>. The "+1 weak" belongs to the group of strong owners.</p>`, `<p>Hint 2: releaseStrong: <code>if (strong.fetch_sub(1, acq_rel) == 1) { delete ptr; releaseWeak(); }</code>. releaseWeak: <code>if (weak.fetch_sub(1, acq_rel) == 1) delete block;</code>.</p>`, `<p>Hint 3: lock(): load strong into <code>n</code>; loop <code>while (n != 0) { if (strong.compare_exchange_weak(n, n + 1)) return SharedPtr(block); }</code> return empty. CAS fails and reloads <code>n</code> if another thread changed it.</p>`],
    solution: {
      approach: `<p>Two counters, one rule each. Strong owners collectively own one weak reference, so block lifetime is decided by a single counter reaching zero. <code>lock()</code> uses a CAS loop to implement increment-if-not-zero atomically. SharedPtr gets a private constructor from a control block that assumes the strong count was already incremented.</p>`,
      code: R`
        #include <atomic>
        #include <cassert>
        #include <utility>

        template <class T> class WeakPtr;

        template <class T>
        struct Ctrl {
            std::atomic<long> strong{1};
            std::atomic<long> weak{1};          // +1 held collectively by the strong owners
            T* ptr;
            explicit Ctrl(T* p) : ptr(p) {}
            void releaseWeak() noexcept { if (weak.fetch_sub(1, std::memory_order_acq_rel) == 1) delete this; }
            void releaseStrong() noexcept {
                if (strong.fetch_sub(1, std::memory_order_acq_rel) == 1) { delete ptr; ptr = nullptr; releaseWeak(); }
            }
        };

        template <class T>
        class SharedPtr {
            Ctrl<T>* c_ = nullptr;
            friend class WeakPtr<T>;
            struct Adopt {};
            SharedPtr(Ctrl<T>* c, Adopt) noexcept : c_(c) {}           // strong already incremented
        public:
            SharedPtr() noexcept = default;
            explicit SharedPtr(T* p) : c_(p ? new Ctrl<T>(p) : nullptr) {}
            SharedPtr(const SharedPtr& o) noexcept : c_(o.c_) { if (c_) c_->strong.fetch_add(1, std::memory_order_relaxed); }
            SharedPtr(SharedPtr&& o) noexcept : c_(std::exchange(o.c_, nullptr)) {}
            SharedPtr& operator=(SharedPtr o) noexcept { std::swap(c_, o.c_); return *this; }
            ~SharedPtr() { if (c_) c_->releaseStrong(); }
            void reset() noexcept { SharedPtr().swap(*this); }
            void swap(SharedPtr& o) noexcept { std::swap(c_, o.c_); }
            T* get() const noexcept { return c_ ? c_->ptr : nullptr; }
            T& operator*() const { return *get(); }
            long use_count() const noexcept { return c_ ? c_->strong.load() : 0; }
            explicit operator bool() const noexcept { return get() != nullptr; }
        };

        template <class T>
        class WeakPtr {
            Ctrl<T>* c_ = nullptr;
        public:
            WeakPtr() noexcept = default;
            WeakPtr(const SharedPtr<T>& s) noexcept : c_(s.c_) { if (c_) c_->weak.fetch_add(1, std::memory_order_relaxed); }
            WeakPtr(const WeakPtr& o) noexcept : c_(o.c_) { if (c_) c_->weak.fetch_add(1, std::memory_order_relaxed); }
            WeakPtr& operator=(WeakPtr o) noexcept { std::swap(c_, o.c_); return *this; }
            ~WeakPtr() { if (c_) c_->releaseWeak(); }
            void reset() noexcept { WeakPtr().swap(*this); }
            void swap(WeakPtr& o) noexcept { std::swap(c_, o.c_); }
            bool expired() const noexcept { return !c_ || c_->strong.load(std::memory_order_acquire) == 0; }
            SharedPtr<T> lock() const noexcept {
                if (!c_) return {};
                long n = c_->strong.load(std::memory_order_relaxed);
                while (n != 0) {                                        // increment-if-not-zero
                    if (c_->strong.compare_exchange_weak(n, n + 1, std::memory_order_acq_rel, std::memory_order_relaxed))
                        return SharedPtr<T>(c_, typename SharedPtr<T>::Adopt{});
                }
                return {};
            }
        };

        int main() {
            SharedPtr<int> a(new int(1));
            WeakPtr<int> w = a;
            { auto s = w.lock(); assert(s && *s == 1 && a.use_count() == 2); }
            a.reset();                       // object deleted, block kept for w
            assert(w.expired() && !w.lock());
            w.reset();                       // block freed
        }
      `,
      dry: { head: ['op', 'strong', 'weak (incl. +1)', 'effect'], rows: [['a(new int)', '1', '1', '—'], ['w = a', '1', '2', '—'], ['s = w.lock()', '2', '2', 'CAS 1→2'], ['s dies', '1', '2', '—'], ['a.reset()', '0', '1', 'delete int; drop +1'], ['w.lock()', '0', '1', 'loop sees 0 → empty'], ['w.reset()', '0', '0', 'delete block']] },
      complexity: `<p>All operations O(1); lock() is a CAS loop (usually one iteration). Memory: one extra allocation per managed object (std::make_shared fuses it).</p>`,
      followUps: ['Add the aliasing constructor (share ownership, point elsewhere).', 'Why can increments be <code>relaxed</code> but decrements need acq_rel?', 'How would you make <code>makeShared</code> co-allocate T inside the block (placement new + manual destroy)?']
    }
  });

  practice.push({
    title: 'Build a Leak Detector by Replacing Global operator new/delete', level: 'Hard', tags: ['operator new', 'leak detection', 'testing', 'allocation tracking'], companies: ['Microsoft', 'Unity', 'Qualcomm', 'Apple'],
    statement: `<p>Write a tiny test-only allocation tracker: replace the global <code>operator new</code>/<code>operator delete</code> so they count live allocations and live bytes, then write a <code>LeakCheck</code> RAII guard that records the counters in its constructor and, in its destructor, reports how many allocations and bytes were leaked inside its scope.</p>`,
    constraints: `Must handle sized delete (<code>operator delete(void*, std::size_t)</code>) and array forms. The tracker itself must not allocate through the tracked operators (no infinite recursion).`,
    example: `<p><code>{ LeakCheck lc; auto p = std::make_unique&lt;int&gt;(1); }</code> → ${H.c('g', 'leaked 0 allocations, 0 bytes')}. <code>{ LeakCheck lc; new int(2); }</code> → ${H.c('r', 'leaked 1 allocation, 4 bytes')}.</p>`,
    brute: { why: `<p>Counting only in a custom class's constructor misses raw buffers, strings and containers. Using a <code>std::map</code> inside <code>operator new</code> to remember sizes recurses (the map allocates through <code>operator new</code>). Forgetting the array/sized overloads gives mismatched counts.</p>`, code: R`
      #include <cstdlib>
      #include <map>
      #include <new>
      // BAD idea: a std::map inside operator new would call operator new again -> infinite recursion.
      static long allocations = 0;
      void* trackedNewNaive(std::size_t n) { ++allocations; return std::malloc(n); }   // no size bookkeeping
      int main() { void* p = trackedNewNaive(8); std::free(p); return allocations == 1 ? 0 : 1; }` },
    mcq: { q: 'How can operator delete know the size of the block without a lookup table?', options: ['Store the size in a small header just before the pointer returned to the caller', 'Ask malloc_usable_size', 'Use sizeof(*p)', 'It cannot'], answer: 0, explain: 'Allocating n + header bytes and stashing n in the header lets delete read it back in O(1). Keep the header aligned to max_align_t so returned pointers stay suitably aligned.' },
    hints: [`<p>Hint 1: Replace <code>void* operator new(std::size_t)</code> and <code>void operator delete(void*) noexcept</code>; the array forms can forward to them. Use <code>malloc/free</code> inside to avoid recursion.</p>`, `<p>Hint 2: Allocate <code>n + sizeof(std::max_align_t)</code> bytes, write <code>n</code> at the start, return <code>base + header</code>. In delete, step back by the header, read n, update counters, <code>free(base)</code>.</p>`, `<p>Hint 3: Counters as <code>std::atomic&lt;long&gt;</code>. <code>LeakCheck</code> stores the counts in its constructor and prints the difference in its destructor — note the guard itself must not allocate in between (avoid building strings there).</p>`],
    solution: {
      approach: `<p>Global replacement functions with a size header. All other overloads (array, sized, nothrow) forward to the core pair so the books always balance. The RAII guard snapshots counters and reports the delta at scope exit — a mini LeakSanitizer for unit tests. (Real projects use ASan/LSan or heaptrack; this exercise shows how they hook allocation.)</p>`,
      code: R`
        #include <atomic>
        #include <cstddef>
        #include <cstdio>
        #include <cstdlib>
        #include <memory>
        #include <new>

        static std::atomic<long> gLiveAllocs{0}, gLiveBytes{0};
        constexpr std::size_t kHeader = alignof(std::max_align_t);

        void* operator new(std::size_t n) {
            auto* base = static_cast<unsigned char*>(std::malloc(n + kHeader));
            if (!base) throw std::bad_alloc();
            *reinterpret_cast<std::size_t*>(base) = n;          // remember the size
            gLiveAllocs.fetch_add(1, std::memory_order_relaxed);
            gLiveBytes.fetch_add(static_cast<long>(n), std::memory_order_relaxed);
            return base + kHeader;
        }
        void operator delete(void* p) noexcept {
            if (!p) return;
            auto* base = static_cast<unsigned char*>(p) - kHeader;
            std::size_t n = *reinterpret_cast<std::size_t*>(base);
            gLiveAllocs.fetch_sub(1, std::memory_order_relaxed);
            gLiveBytes.fetch_sub(static_cast<long>(n), std::memory_order_relaxed);
            std::free(base);
        }
        void* operator new[](std::size_t n) { return ::operator new(n); }
        void operator delete[](void* p) noexcept { ::operator delete(p); }
        void operator delete(void* p, std::size_t) noexcept { ::operator delete(p); }
        void operator delete[](void* p, std::size_t) noexcept { ::operator delete(p); }

        class LeakCheck {
            const char* name_;
            long allocs_, bytes_;
        public:
            explicit LeakCheck(const char* name) : name_(name), allocs_(gLiveAllocs.load()), bytes_(gLiveBytes.load()) {}
            ~LeakCheck() {
                long a = gLiveAllocs.load() - allocs_, b = gLiveBytes.load() - bytes_;
                std::printf("[%s] leaked %ld allocation(s), %ld byte(s)\n", name_, a, b);
            }
        };

        int main() {
            { LeakCheck lc("smart"); auto p = std::make_unique<int>(1); }   // leaked 0
            { LeakCheck lc("raw");   new int(2); }                           // leaked 1, 4 bytes
        }
      `,
      dry: { head: ['scope', 'allocs at start', 'event', 'allocs at end', 'report'], rows: [['smart', 'A', 'new 4 B, then delete', 'A', '0 / 0'], ['raw', 'A', 'new 4 B, never freed', 'A+1', '<span class="c-r">1 / 4</span>']] },
      complexity: `<p>O(1) per allocation plus a 16-byte header (<code>max_align_t</code> alignment) per block. Atomic counters make it thread-safe for counting; per-thread scopes would need thread-local snapshots.</p>`,
      followUps: ['How would you also record the allocation call stack (backtrace) for each live block?', 'What breaks if a library allocates with malloc and frees with delete through your header scheme?', 'How do aligned new overloads (<code>std::align_val_t</code>) fit in?']
    }
  });

  practice.push({
    title: 'Deep-Copy a Cyclic Graph Without shared_ptr Cycles', level: 'Hard', tags: ['ownership design', 'arena', 'unique_ptr', 'graph clone'], companies: ['Meta', 'Google', 'Amazon'],
    statement: `<p>A <code>Graph</code> holds nodes with arbitrary directed edges, including cycles and self-loops. Design ownership so that destroying the Graph frees every node (no leaks, no shared_ptr cycles), and implement a <b>deep copy</b> (copy constructor) that reproduces the same shape with fresh nodes — edges in the copy must point to nodes of the copy, never the original.</p>`,
    constraints: `Up to 10<sup>5</sup> nodes and 10<sup>6</sup> edges. Copy in O(V + E). Graph must be copyable and movable.`,
    example: `<p>Original: ${H.c('b', '0→1, 1→2, 2→0, 2→2')} (cycle + self-loop). After <code>Graph g2 = g1;</code> → same edges, all pointers inside g2, ${H.c('g', 'and deleting g1 leaves g2 valid')}.</p>`,
    brute: { why: `<p>Edges as <code>shared_ptr&lt;Node&gt;</code> leak every cycle (ref counting cannot free them). Making edges weak_ptrs works but every traversal pays <code>lock()</code>. A copy that copies the node <i>pointers</i> produces a graph whose edges point into the original — a use-after-free as soon as the original dies.</p>`, code: R`
      #include <memory>
      #include <vector>
      struct GNodeBad { int id; std::vector<std::shared_ptr<GNodeBad>> out; };   // cycles leak
      int main() {
          auto a = std::make_shared<GNodeBad>(); auto b = std::make_shared<GNodeBad>();
          a->out.push_back(b); b->out.push_back(a);
      }   // leak: a <-> b` },
    mcq: { q: 'In an arena design, who owns the nodes?', options: ['The Graph, via std::vector&lt;std::unique_ptr&lt;Node&gt;&gt;; edges are non-owning raw pointers', 'Each node owns its out-neighbours', 'Every edge owns its target', 'Nobody; nodes are leaked on purpose'], answer: 0, explain: 'All nodes share one lifetime (the graph\'s), so a single owner holds them all and edges merely refer. Cycles stop mattering because edges do not own.' },
    hints: [`<p>Hint 1: Separate <b>ownership</b> from <b>reference</b>: the Graph owns nodes in a <code>vector&lt;unique_ptr&lt;Node&gt;&gt;</code> (stable addresses), edges are <code>Node*</code>.</p>`, `<p>Hint 2: Deep copy in two passes: (1) create one new node per old node and record <code>old → new</code> in an <code>unordered_map&lt;const Node*, Node*&gt;</code> (or store each node's index); (2) for every old edge u→v add <code>map[u] → map[v]</code>.</p>`, `<p>Hint 3: Copy assignment via copy-and-swap; moves are defaulted (moving the vector keeps node addresses valid because the nodes themselves do not move). Alternative design: indices instead of pointers make copies trivial (just copy vectors).</p>`],
    solution: {
      approach: `<p>Arena ownership: the graph is the single owner, edges are plain pointers, so cycles are harmless and destruction is just destroying the vector. Copying maps each old node to its clone (an index works since each node stores its position), then rewires edges through the map. Moves keep node addresses stable because only the vector of unique_ptrs moves.</p>`,
      code: R`
        #include <cassert>
        #include <memory>
        #include <utility>
        #include <vector>
        class Graph {
        public:
            struct Node { int id; std::size_t idx; std::vector<Node*> out; };
        private:
            std::vector<std::unique_ptr<Node>> nodes_;     // the single owner
        public:
            Graph() = default;
            Graph(const Graph& o) {
                nodes_.reserve(o.nodes_.size());
                for (const auto& n : o.nodes_) addNode(n->id);                 // pass 1: clone nodes
                for (const auto& n : o.nodes_)                                  // pass 2: rewire edges
                    for (const Node* v : n->out) nodes_[n->idx]->out.push_back(nodes_[v->idx].get());
            }
            Graph& operator=(Graph o) noexcept { nodes_.swap(o.nodes_); return *this; }   // copy-and-swap
            Graph(Graph&&) noexcept = default;
            Node* addNode(int id) {
                nodes_.push_back(std::make_unique<Node>(Node{id, nodes_.size(), {}}));
                return nodes_.back().get();
            }
            void addEdge(Node* u, Node* v) { u->out.push_back(v); }
            Node* at(std::size_t i) const { return nodes_[i].get(); }
            std::size_t size() const { return nodes_.size(); }
        };
        int main() {
            Graph g1;
            auto* a = g1.addNode(0); auto* b = g1.addNode(1); auto* c = g1.addNode(2);
            g1.addEdge(a, b); g1.addEdge(b, c); g1.addEdge(c, a); g1.addEdge(c, c);   // cycle + self-loop
            Graph g2 = g1;
            assert(g2.at(2)->out[0] == g2.at(0));      // points into g2, not g1
            assert(g2.at(2)->out[1] == g2.at(2));
            assert(g2.at(0) != g1.at(0));
            { Graph tmp = std::move(g1); }              // original destroyed; g2 unaffected
            assert(g2.at(1)->out[0]->id == 2);
        }
      `,
      dry: { head: ['pass', 'old', 'new / action'], rows: [['1', 'nodes 0,1,2', 'clones 0\',1\',2\' (idx 0..2)'], ['2', '0→1', '0\'→1\''], ['2', '1→2', '1\'→2\''], ['2', '2→0, 2→2', '2\'→0\', 2\'→2\''], ['destroy g1', 'vector freed', 'g2 untouched']] },
      complexity: `<p>Copy O(V + E) time and memory; destruction O(V + E) (frees vectors); no reference counting cost on traversal.</p>`,
      followUps: ['How would you support deleting a single node (and all edges into it) efficiently?', 'Compare with an index-based graph (<code>vector&lt;vector&lt;int&gt;&gt;</code>): when is it strictly better?', 'How does <code>std::pmr::monotonic_buffer_resource</code> make allocating 10<sup>5</sup> nodes faster?']
    }
  });

  practice.push({
    title: 'Hot-Reloadable Config With atomic<shared_ptr<const Config>>', level: 'Hard', tags: ['shared_ptr', 'atomics', 'RCU', 'concurrency', 'immutability'], companies: ['Google', 'Meta', 'Cloudflare', 'Netflix'],
    statement: `<p>Many request threads read a <code>Config</code> on every request; an admin thread occasionally reloads it. Readers must never block, never see a half-updated config, and a config must be freed once no request uses it anymore. Implement <code>ConfigStore</code> with <code>std::shared_ptr&lt;const Config&gt; current()</code> and <code>void publish(Config)</code>.</p>`,
    constraints: `10<sup>5</sup> reads/s per thread, rare writes. C++20. No reader-side mutex in the final solution.`,
    example: `${H.table(['Time', 'Reader A', 'Admin', 'Old config freed?'], [['t0', 'snap = current() (v1, count 2)', '—', '—'], ['t1', 'uses v1', 'publish(v2) → store now v2', 'no: A still holds v1'], ['t2', 'snap dies', '—', '<span class="c-g">yes, v1 freed by A\'s thread</span>'], ['t3', 'current() → v2', '—', '—']])}`,
    brute: { why: `<p>A global <code>Config</code> guarded by a mutex makes every request contend on one lock. A plain <code>std::shared_ptr&lt;Config&gt;</code> global read and written by different threads is a data race on the shared_ptr object itself (its two pointers are not updated atomically) — even though the reference count is atomic.</p>`, code: R`
      #include <memory>
      #include <mutex>
      #include <string>
      struct Config { std::string db; int timeoutMs = 100; };
      class ConfigStoreLocked {
          std::mutex m_;
          std::shared_ptr<const Config> cfg_ = std::make_shared<const Config>();
      public:
          std::shared_ptr<const Config> current() { std::lock_guard<std::mutex> g(m_); return cfg_; }   // every read locks
          void publish(Config c) { auto p = std::make_shared<const Config>(std::move(c)); std::lock_guard<std::mutex> g(m_); cfg_ = std::move(p); }
      };
      int main() { ConfigStoreLocked s; return s.current()->timeoutMs == 100 ? 0 : 1; }` },
    mcq: { q: 'Why is <code>Config</code> held as <code>const</code>?', options: ['Published snapshots are immutable, so readers can use them without locks; writers publish a new snapshot instead of mutating', 'atomic&lt;shared_ptr&gt; requires const', 'To save memory', 'To prevent copying'], answer: 0, explain: 'Immutability is what makes lock-free reading safe: nobody ever writes to a config another thread might be reading. Updates are whole-snapshot swaps (read-copy-update).' },
    hints: [`<p>Hint 1: Separate two races: the <b>object</b> (solve by immutability) and the <b>pointer variable</b> (solve by an atomic smart pointer).</p>`, `<p>Hint 2: <code>std::atomic&lt;std::shared_ptr&lt;const Config&gt;&gt; cur_;</code> — <code>cur_.load()</code> returns an owning snapshot; <code>cur_.store(std::make_shared&lt;const Config&gt;(...))</code> publishes.</p>`, `<p>Hint 3: Old snapshots are freed automatically when the last reader's shared_ptr dies — on that reader's thread. If a destructor is expensive, readers pay it; mitigate by handing old configs to a background reaper. Note: libstdc++'s atomic&lt;shared_ptr&gt; uses a small internal lock bit, so check <code>is_lock_free()</code> if it matters.</p>`],
    solution: {
      approach: `<p>Read-Copy-Update with reference counting: readers atomically load an owning snapshot of an immutable Config and use it for the whole request; writers build a new Config off to the side and atomically store it. The shared_ptr count guarantees an old snapshot lives exactly as long as some request still uses it, then is freed — no grace-period machinery needed.</p>`,
      code: R`
        #include <atomic>
        #include <cassert>
        #include <memory>
        #include <string>
        #include <thread>
        #include <vector>
        struct Config { std::string db = "primary"; int timeoutMs = 100; };

        class ConfigStore {
            std::atomic<std::shared_ptr<const Config>> cur_{std::make_shared<const Config>()};
        public:
            std::shared_ptr<const Config> current() const { return cur_.load(std::memory_order_acquire); }
            void publish(Config c) { cur_.store(std::make_shared<const Config>(std::move(c)), std::memory_order_release); }
        };

        int main() {
            ConfigStore store;
            std::atomic<long> sum{0};
            std::vector<std::thread> readers;
            for (int t = 0; t < 4; ++t)
                readers.emplace_back([&] {
                    for (int i = 0; i < 10000; ++i) {
                        auto snap = store.current();          // owning snapshot for this "request"
                        sum.fetch_add(snap->timeoutMs, std::memory_order_relaxed);
                    }                                         // snapshot released here
                });
            store.publish(Config{"replica", 250});            // concurrent publish
            for (auto& th : readers) th.join();
            assert(store.current()->db == "replica");
            assert(sum.load() >= 4L * 10000 * 100);
        }
      `,
      dry: { head: ['event', 'store points to', 'v1 owners', 'v2 owners'], rows: [['start', 'v1', 'store', '—'], ['reader loads', 'v1', 'store, reader', '—'], ['publish v2', 'v2', 'reader', 'store'], ['reader done', 'v2', '— → v1 freed', 'store']] },
      complexity: `<p>Read: one atomic load + refcount increment/decrement (contended cache line under heavy load — shard per thread or use hazard pointers/RCU libraries for extreme read rates). Write: one allocation + atomic store.</p>`,
      followUps: ['Why is <code>std::shared_ptr&lt;Config&gt;</code> (non-const) with in-place edits unsafe even with the atomic wrapper?', 'How would you avoid the refcount cache-line contention for 64+ reader threads?', 'Pre-C++20, which deprecated free functions did this job?']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: 'In <code>Widget* p = new Widget;</code> inside a function, where do <code>p</code> and the Widget live?', options: ['p on the stack, the Widget on the heap', 'Both on the heap', 'Both on the stack', 'p on the heap, the Widget on the stack'], answer: 0, explain: 'The pointer is an ordinary local (automatic storage); new creates the object in dynamic storage. When the function returns, p disappears but the Widget does not — a leak unless someone deletes it.' },
    { q: 'Which line is undefined behavior?', options: ['<code>int* a = new int[4]; delete a;</code>', '<code>int* a = nullptr; delete a;</code>', '<code>auto a = std::make_unique&lt;int[]&gt;(4);</code>', '<code>std::vector&lt;int&gt; a(4);</code>'], answer: 0, explain: 'Array new must be paired with delete[]. Deleting nullptr is a defined no-op.' },
    { q: 'Objects <code>A a; B b; C c;</code> are declared in that order in one scope. In what order are their destructors called?', options: ['C, B, A', 'A, B, C', 'Unspecified', 'B, C, A'], answer: 0, explain: 'Automatic objects are destroyed in reverse order of construction — like popping plates off a stack.' },
    { q: 'A constructor throws after two of its members were constructed. What happens?', options: ['The two constructed members are destroyed; the class destructor does not run', 'The class destructor runs', 'Nothing is destroyed, memory leaks', 'std::terminate is called'], answer: 0, explain: 'Only fully constructed subobjects are destroyed during unwinding. The object itself never finished construction, so its own destructor is not called.' },
    { q: 'What does <code>p.release()</code> do on a <code>std::unique_ptr</code>?', options: ['Returns the raw pointer and stops owning it without deleting', 'Deletes the object', 'Copies the object', 'Decrements a reference count'], answer: 0, explain: 'release() hands ownership to the caller. If the result is ignored the object leaks. To delete now, use reset().' },
    { q: '<code>sizeof(std::unique_ptr&lt;int&gt;)</code> on a typical 64-bit platform is…', options: ['8', '16', '24', '32'], answer: 0, explain: 'With the default (empty) deleter, unique_ptr stores just one pointer.' },
    { q: 'After <code>auto a = std::make_shared&lt;int&gt;(1); auto b = a; auto c = std::move(b); std::weak_ptr&lt;int&gt; w = c;</code>, what is <code>a.use_count()</code>?', options: ['2', '3', '4', '1'], answer: 0, explain: 'a and c own it (b was moved from, so empty). weak_ptr does not change use_count.' },
    { q: 'Two classes each hold a <code>shared_ptr</code> to the other. What happens when all outside references are dropped?', options: ['Both objects leak: their use_counts stay at 1', 'Both are destroyed normally', 'Double delete', 'Compile error'], answer: 0, explain: 'Reference counting cannot detect cycles. Make one direction a weak_ptr (or raw pointer if lifetimes are guaranteed).' },
    { q: 'What is the correct way to use a <code>weak_ptr</code> <code>w</code>?', options: ['<code>if (auto sp = w.lock()) use(*sp);</code>', '<code>if (!w.expired()) use(*w.lock());</code>', '<code>use(*w);</code>', '<code>use(*w.get());</code>'], answer: 0, explain: 'lock() atomically returns an owning shared_ptr or empty. expired()-then-lock races in multithreaded code; weak_ptr has no * or get().' },
    { q: 'Which is a real advantage of <code>std::make_shared&lt;T&gt;()</code> over <code>std::shared_ptr&lt;T&gt;(new T)</code>?', options: ['One allocation for object and control block', 'It accepts a custom deleter', 'It frees the object\'s memory sooner when weak_ptrs exist', 'It works with private constructors'], answer: 0, explain: 'make_shared co-allocates. It cannot take a deleter, cannot call private constructors, and with long-lived weak_ptrs it keeps the object\'s bytes until the control block dies.' },
    { q: '<code>std::shared_ptr&lt;T&gt;(this)</code> inside a member function of an object already owned by a shared_ptr causes…', options: ['A second control block → double delete', 'A harmless extra reference', 'A compile error', 'A weak reference'], answer: 0, explain: 'Each shared_ptr built from a raw pointer creates its own control block. Use enable_shared_from_this and shared_from_this() instead.' },
    { q: 'For a custom deleter, which statement is true?', options: ['For unique_ptr the deleter is part of the type; for shared_ptr it is stored in the control block', 'Both store it in the type', 'Neither supports custom deleters', 'shared_ptr grows to 24 bytes with a lambda deleter'], answer: 0, explain: 'unique_ptr&lt;T, D&gt; carries D in its type (and maybe size); shared_ptr type-erases D into the control block, so shared_ptr&lt;T&gt; stays 16 bytes.' },
    { q: 'Is <code>std::shared_ptr</code> thread-safe?', options: ['The reference count updates are atomic, but the pointed-to object and a single shared_ptr variable shared between threads are not protected', 'Yes, completely', 'No, not at all', 'Only when created with make_shared'], answer: 0, explain: 'Distinct shared_ptr copies may be used concurrently. Concurrent read/write of the same shared_ptr object needs std::atomic&lt;std::shared_ptr&lt;T&gt;&gt; (C++20) or a mutex; the object needs its own synchronization.' }
  );

  /* ======================================================================
     INTERVIEW
     ====================================================================== */
  interview.push(
    { q: 'What is the difference between stack and heap memory in C++?', level: 'B', a: `<p>The <b>stack</b> holds automatic objects: locals and parameters. Allocation is just moving the stack pointer, it is cache-hot, and objects are destroyed automatically (reverse order) when their scope ends. It is small (typically 1–8 MB per thread). The <b>heap</b> (free store) holds objects created with <code>new</code>/<code>malloc</code> or by containers; allocation goes through an allocator (tens of ns), size is limited only by RAM, and the lifetime is whatever the program decides — which means someone must free it. In modern C++ heap memory is always owned by a stack object (vector, string, unique_ptr) so cleanup is still automatic.</p>`, followUps: ['What causes a stack overflow?', 'Is a std::vector on the stack or the heap?', 'Why is heap allocation slower?'] },
    { q: 'What is RAII and why is it so important in C++?', level: 'B', a: `<p>RAII — Resource Acquisition Is Initialization — ties a resource's lifetime to an object's lifetime: acquire in the constructor, release in the destructor. Since C++ guarantees destructors of fully constructed automatic objects run on every scope exit (return, break, exception), resources cannot leak and cleanup code is written once, in one place. It covers memory (vector, unique_ptr), locks (lock_guard), files (fstream), threads (jthread) and anything with a release function. It is also the basis of exception safety and the Rule of Zero.</p>`, followUps: ['How does RAII interact with exceptions?', 'Can a destructor throw?', 'Name RAII types in the standard library.'] },
    { q: 'What are the main kinds of memory errors in C++ and how do you find them?', level: 'I', a: `<p>Leaks (allocated, never freed), double free, use-after-free / dangling pointers and references (including iterator invalidation), mismatched allocation forms (<code>new[]</code>/<code>delete</code>, <code>malloc</code>/<code>delete</code>), buffer overflows, and uninitialised reads. Prevention: RAII and smart pointers, containers instead of raw arrays, no owning raw pointers. Detection: compiler warnings, clang-tidy, AddressSanitizer + LeakSanitizer in CI (fast, precise stack traces), Valgrind (no recompile, slow), UBSan, and heap profilers (heaptrack, massif, jemalloc) for growth over time in production.</p>`, followUps: ['What does an ASan "heap-use-after-free" report contain?', 'Why can a use-after-free survive tests?', 'Difference between a direct and an indirect leak?'] },
    { q: 'Explain unique_ptr. How do you pass it to and return it from functions?', level: 'I', a: `<p><code>std::unique_ptr&lt;T&gt;</code> is a move-only owner of one heap object; its destructor deletes the object; copy is deleted; it is the size of a raw pointer with zero runtime overhead. Return it by value from factories (move/elision is automatic). Pass it by value (<code>f(std::unique_ptr&lt;T&gt;)</code>, called with <code>std::move</code>) when the callee takes ownership; by non-const reference when the callee may reseat it; and when the callee only uses the object, pass <code>T&amp;</code>/<code>const T&amp;</code> or <code>T*</code> (if nullable) — not <code>const unique_ptr&amp;</code>, which needlessly couples the interface to the ownership policy.</p>`, followUps: ['Why does unique_ptr&lt;Base&gt; need a virtual destructor in Base?', 'release() vs reset()?', 'How do you store unique_ptrs in a vector?'] },
    { q: 'How does shared_ptr work internally? What is in the control block?', level: 'I', a: `<p>A shared_ptr holds two pointers: one to the object (for fast access) and one to a heap-allocated <b>control block</b>. The control block stores the strong count (use_count), the weak count, the deleter and allocator (type-erased, via virtual functions). Copying atomically increments the strong count; destroying decrements; at 0 the deleter destroys the object; when the weak count also reaches 0 the control block is freed. <code>make_shared</code> co-allocates object and block in one allocation; <code>shared_ptr(new T)</code> uses two. Counts are atomic, so copies on different threads are safe, but the object and a single shared_ptr variable are not synchronized.</p>`, followUps: ['Why is the deleter not part of shared_ptr\'s type?', 'Cost of copying a shared_ptr?', 'What is the aliasing constructor?'] },
    { q: 'What is a weak_ptr for? Give real use cases.', level: 'I', a: `<p>A weak_ptr observes an object owned by shared_ptrs without keeping it alive. You turn it into a usable owner with <code>lock()</code>, which returns empty if the object is gone. Uses: breaking reference cycles (child→parent, prev pointers, back-references), caches that should not keep unused entries alive (map of weak_ptrs), observer lists that skip dead subscribers, and async callbacks that should run only if their object still exists (capture <code>weak_from_this()</code>). It keeps the control block (not the object) alive.</p>`, followUps: ['Why is expired() then lock() a race?', 'How does lock() work atomically?', 'What does a weak_ptr cost in memory?'] },
    { q: 'How can a program that uses only shared_ptr still leak memory? How do you fix it?', level: 'I', a: `<p>Through ownership <b>cycles</b>: if A holds a shared_ptr to B and B to A (or a longer loop), their counts never reach 0 after outside owners leave, because each is held by the other — reference counting does not trace reachability. Other shared_ptr "leaks": a global/static container or cache holding shared_ptrs forever, or a callback stored in an object that captures shared_from_this(). Fix by defining the ownership direction: owners hold shared_ptr/unique_ptr, back/side references are weak_ptr (or raw when the lifetime is guaranteed); for general graphs, an arena owner with non-owning edges. Detect with LSan (indirect leaks), destructor logs or instance counters.</p>`, followUps: ['Which edge do you make weak in a tree?', 'When would you choose a raw back-pointer instead of weak_ptr?', 'How would you test for this in CI?'] },
    { q: 'Why prefer make_unique and make_shared? When can\'t you use them?', level: 'I', a: `<p>They remove naked <code>new</code> (easier auditing), avoid repeating the type, were the only exception-safe way to create smart pointers inside function-argument lists before C++17, and make_shared does a single allocation with better locality. You cannot (or should not) use them when you need a custom deleter, when the constructor is private (use a static factory with <code>new</code>), when you need brace-initialisation semantics, when a huge object would be pinned by long-lived weak_ptrs (make_shared frees the bytes only when the control block dies), or with a custom allocator (use <code>allocate_shared</code>). For large buffers you will overwrite, C++20 offers <code>make_unique_for_overwrite</code>.</p>`, followUps: ['Explain the pre-C++17 leak in f(shared_ptr&lt;A&gt;(new A), g()).', 'What did C++17 change in evaluation order?'] },
    { q: 'What is a custom deleter? Show how you would wrap a C API handle.', level: 'I', a: `<p>A custom deleter is a callable a smart pointer uses instead of <code>delete</code>. For a C API like <code>FILE* fopen</code>/<code>fclose</code>, define a stateless functor <code>struct FileCloser { void operator()(FILE* f) const { fclose(f); } };</code> and <code>using FilePtr = std::unique_ptr&lt;FILE, FileCloser&gt;;</code>. It stays 8 bytes (empty base optimisation), closes automatically, and is move-only. A function-pointer deleter works but makes the unique_ptr 16 bytes. For shared_ptr pass the deleter to the constructor; it lives in the control block. Other uses: <code>free</code> for malloc'd memory, returning objects to a pool, library-specific destroy functions.</p>`, followUps: ['Does unique_ptr call the deleter on nullptr? Does shared_ptr?', 'How do you handle a non-pointer handle like an int file descriptor?', 'What is std::out_ptr (C++23)?'] },
    { q: 'What is enable_shared_from_this and what problem does it solve?', level: 'A', a: `<p>Inside a member function you sometimes need a shared_ptr to the current object — e.g. to hand to an async callback so the object stays alive until the callback runs. <code>std::shared_ptr&lt;T&gt;(this)</code> would create a second control block and cause a double delete. Inheriting <code>std::enable_shared_from_this&lt;T&gt;</code> embeds a weak_ptr that the first owning shared_ptr fills in; <code>shared_from_this()</code> locks it, sharing the existing control block, and <code>weak_from_this()</code> (C++17) returns the weak_ptr. Rules: the object must already be owned by a shared_ptr (otherwise <code>bad_weak_ptr</code> is thrown since C++17), so never call it in the constructor; inherit publicly.</p>`, followUps: ['Strong vs weak capture in callbacks — when each?', 'How does it find the control block?'] },
    { q: 'Implement (or describe in detail) your own unique_ptr. What are the tricky parts?', level: 'A', a: `<p>Store <code>T* p_</code>. Destructor: <code>delete p_</code>. Delete copy constructor and copy assignment. Move constructor: <code>p_ = std::exchange(o.p_, nullptr)</code>, <code>noexcept</code> (so vector moves instead of copying). <code>release()</code> returns and nulls; <code>reset(q)</code> stores q first then deletes the old pointer (safe if the old object's destructor re-enters). Move assignment: <code>reset(o.release())</code>, which is self-move safe. Extras: <code>explicit operator bool</code>, <code>*</code>/<code>-&gt;</code>, a deleter template parameter stored with EBO/<code>[[no_unique_address]]</code> so empty deleters cost nothing, a <code>T[]</code> specialisation with <code>delete[]</code> and <code>operator[]</code>, and converting moves from <code>unique_ptr&lt;Derived&gt;</code>.</p>`, followUps: ['Why must move operations be noexcept?', 'How do you make the deleter zero-size?', 'How does unique_ptr work with an incomplete type (pimpl)?'] },
    { q: 'How would you implement shared_ptr and weak_ptr reference counting correctly under concurrency?', level: 'E', a: `<p>Use a control block with atomic strong and weak counters. Increments can be <code>memory_order_relaxed</code> because the incrementing thread already holds a reference. The decrement that may destroy must be acquire-release (or release decrement + acquire fence on the zero path) so all other owners' writes to the object happen-before the destructor. To avoid races between "last strong" and "last weak", let the group of strong owners hold one weak reference: when strong hits 0, destroy the object and drop that weak reference; whoever brings weak to 0 frees the block. <code>weak_ptr::lock()</code> is increment-if-not-zero via a CAS loop. Under heavy contention the shared counter's cache line becomes a bottleneck; mitigations include passing by reference, moving, or hazard pointers/RCU for read-mostly data.</p>`, followUps: ['Why is a plain load-then-increment in lock() wrong?', 'What does std::atomic&lt;std::shared_ptr&lt;T&gt;&gt; add?', 'Why does libstdc++ sometimes skip atomics?'] },
    { q: 'You see memory growing steadily in a long-running C++ service. Walk me through how you find the cause.', level: 'E', a: `<p>First decide leak vs bloat: track RSS and allocator stats (jemalloc/tcmalloc stats, <code>malloc_info</code>) over time; fragmentation or an unbounded cache can grow without a true leak. Reproduce in staging with a heap profiler (heaptrack, jemalloc prof, tcmalloc heap profiler, massif) and diff snapshots to find which allocation stack keeps growing. Run the test suite and a load replay under ASan/LSan to catch true leaks (direct and indirect — indirect often means a shared_ptr cycle). Inspect suspect code for ownership: raw owning pointers, missing virtual destructors, shared_ptr cycles, callbacks capturing shared_from_this, caches without eviction or holding shared instead of weak pointers, thread-local caches. Fix with RAII/ownership redesign, add an instance-counter or LSan test to CI, and verify the fix with the same profiler.</p>`, followUps: ['How do you tell fragmentation from a leak?', 'What is an indirect leak in LSan output?', 'How would you add a regression test?'] },
    { q: 'When would you choose a raw pointer, a reference, unique_ptr, shared_ptr or weak_ptr?', level: 'A', a: `<p><b>Reference</b>: non-null, non-owning access for the duration of a call. <b>Raw pointer</b>: non-owning, possibly null, or a back-pointer whose target provably outlives it (tree parent, arena graph edge) — never an owner. <b>unique_ptr</b>: the default owner for heap objects: factories, polymorphic members, pimpl, containers of polymorphic objects. <b>shared_ptr</b>: genuinely shared ownership where the last user is unknown (async callbacks, shared caches, immutable snapshots shared across threads) — accept the atomic and allocation cost. <b>weak_ptr</b>: observe a shared object without extending its life — cycle breaking, caches, observers, "run only if still alive". And often the best answer is none: a value or a container.</p>`, followUps: ['Why is shared_ptr a design smell when overused?', 'Can you convert unique_ptr to shared_ptr? The reverse?'] }
  );

  registerModule({
    id: 'cpp06',
    title: 'Memory Management, RAII & Smart Pointers',
    intro: `<p>Every C++ object lives somewhere — on the <b>stack</b>, where cleanup is automatic, or on the <b>heap</b>, where someone must clean up. This module is about getting that "someone" right, every time. You will see why raw <code>new</code>/<code>delete</code> leads to leaks, double frees and use-after-free bugs, and how C++ solves this with <b>RAII</b>: tie every resource to an object whose destructor releases it.</p>
      <p>Then come the smart pointers: <code>unique_ptr</code> for a single owner, <code>shared_ptr</code> with its control block and reference counts, <code>weak_ptr</code> for observing and for breaking cycles, <code>make_unique</code>/<code>make_shared</code>, and custom deleters for wrapping C handles, pools and files. Every topic has an interactive visualizer — stack frames and heap blocks, destructor order, ref counts going up and down, and a cycle leaking in front of you. You will also do leak hunts, RAII refactors and cycle fixes, and implement your own unique_ptr and shared_ptr, which interviewers love to ask for.</p>`,
    goals: [
      'Draw the stack and heap for any snippet and say exactly when each object is destroyed',
      'Spot leaks, double frees, use-after-free and mismatched <code>new[]</code>/<code>delete</code> in code review, and prove the fix with ASan or a counter test',
      'Write RAII classes (movable, non-copyable handles, scope guards) and predict destructor order, including during exceptions',
      'Choose between <code>unique_ptr</code>, <code>shared_ptr</code>, <code>weak_ptr</code>, references and raw pointers, and pass each correctly to functions',
      'Explain the shared_ptr control block, use/weak counts, make_shared\'s single allocation and its thread-safety guarantees',
      'Break <code>shared_ptr</code> cycles with <code>weak_ptr</code>, and wrap C APIs with zero-size custom deleters',
      'Implement your own UniquePtr and SharedPtr/WeakPtr in an interview'
    ],
    prereqs: `C++ 3 (Pointers &amp; References) and C++ 5 (Advanced OOP: Rule of 3/5/0, virtual destructors). Comfortable with classes, constructors/destructors and basic templates. Move semantics are used lightly here and covered fully in C++ 10.`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
