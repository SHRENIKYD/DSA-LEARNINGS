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
  registerModule({ id: 'cpp06', title: 'Memory Management, RAII & Smart Pointers', intro: '<p>x</p>', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview });
})();
