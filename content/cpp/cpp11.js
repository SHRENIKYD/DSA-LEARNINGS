(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw;   // C++ code is written with String.raw so "\n" stays a C++ escape

  /* ======================================================================
     Shared helpers for the visualizers of this module
     ====================================================================== */
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function note(html, label) { return { type: 'text', label: label || 'What is going on', html: html }; }

  /* Parse a schedule like "A B A B" or "ABAB" into ['A','B','A','B'] */
  function parseSched(input, def) {
    var raw = String(input === undefined || input === null ? def : input).toUpperCase().replace(/[^A-Z]/g, '');
    if (!raw) throw new Error('Type a schedule made of the letters A and B, e.g. ' + def);
    if (/[^AB]/.test(raw)) throw new Error('Only the letters A and B are allowed (A = thread A runs one tiny step, B = thread B runs one tiny step). Example: ' + def);
    if (raw.length > 40) throw new Error('Use at most 40 letters');
    return raw.split('');
  }

  /* ----------------------------------------------------------------------
     A tiny "two-thread CPU" simulator.
     cfg = {
       code:   { A: 'source text', B: 'source text' },
       ops:    { A: [op...], B: [op...] }   op = { line, txt, can?(st,t), waitSay?(st,t), run(st,t) -> {say, narr, cls, jump} }
       shared: {...} initial shared memory,  reg: {...} initial per-thread registers
       cols:   ['extra column names'],  colVals(st) -> [values]
       view(st) -> {name: value} for the vars part,  viewHl(st) -> {name: cls}
       intro: 'HTML', finish(st) -> 'HTML', deadlock?: 'HTML'
     }
     sched = ['A','B',...]  — after it runs out we alternate fairly.
     ---------------------------------------------------------------------- */
  function interleave(cfg, sched) {
    var st = { s: clone(cfg.shared), r: { A: clone(cfg.reg || {}), B: clone(cfg.reg || {}) }, pc: { A: 0, B: 0 } };
    var rows = [], keep = {}, frames = [];
    function done(t) { return st.pc[t] >= cfg.ops[t].length; }
    function canRun(t) { if (done(t)) return false; var op = cfg.ops[t][st.pc[t]]; return !op.can || op.can(st, t); }
    function codeParts() {
      return ['A', 'B'].map(function (t) {
        var h = {};
        if (!done(t)) h[cfg.ops[t][st.pc[t]].line] = canRun(t) ? 'cur' : 'bad';
        return { type: 'code', label: 'Thread ' + t + (done(t) ? ' (finished)' : canRun(t) ? ' (next line to run)' : ' (blocked on this line)'), lang: 'cpp', code: cfg.code[t], hl: h };
      });
    }
    function snap(narr, lastCls) {
      var hl = clone(keep);
      if (rows.length && lastCls) hl[rows.length - 1] = lastCls;
      var parts = [{ type: 'table', label: cfg.tableLabel || 'Timeline: one row per tiny step the CPU takes', columns: ['#', 'Thread A', 'Thread B'].concat(cfg.cols), rows: clone(rows), hl: hl }];
      parts = parts.concat(codeParts());
      parts.push({ type: 'vars', label: 'Shared memory and each thread private registers', vals: cfg.view(st), hl: cfg.viewHl ? cfg.viewHl(st) : {} });
      frames.push({ narr: narr, parts: parts });
    }
    snap(cfg.intro, null);
    var i = 0, alt = 'A', steps = 0, max = cfg.max || 60;
    while (!(done('A') && done('B')) && steps < max) {
      var alive = ['A', 'B'].filter(function (t) { return !done(t); });
      var runnable = alive.filter(canRun);
      if (!runnable.length) {
        snap(cfg.deadlock || '<span class="c-r"><b>DEADLOCK.</b></span> Every unfinished thread is waiting for something that only the other thread can give. Nothing will ever move again: the program hangs forever.', 'bad');
        return frames;
      }
      var t;
      if (i < sched.length) { t = sched[i++]; if (done(t)) t = t === 'A' ? 'B' : 'A'; }
      else { t = canRun(alt) ? alt : runnable[0]; alt = t === 'A' ? 'B' : 'A'; }
      steps++;
      var op = cfg.ops[t][st.pc[t]], row = [String(rows.length + 1), '', ''], cls = 'cur', narr;
      if (!canRun(t)) {
        var w = op.waitSay ? op.waitSay(st, t) : 'it is waiting';
        row[t === 'A' ? 1 : 2] = '(blocked) ' + w;
        cls = 'win';
        narr = '<b>Thread ' + t + '</b> gets the CPU but cannot go on: ' + w + '. The OS puts it back to sleep, so this time slice is wasted for it.';
      } else {
        var res = op.run(st, t) || {};
        row[t === 'A' ? 1 : 2] = res.say || op.txt;
        cls = res.cls || 'cur';
        narr = '<b>Thread ' + t + '</b>: ' + (res.narr || res.say || op.txt);
        st.pc[t] = res.jump !== undefined ? res.jump : st.pc[t] + 1;
      }
      row = row.concat(cfg.colVals(st).map(String));
      rows.push(row);
      if (cls === 'bad' || cls === 'ok' || cls === 'sel') keep[rows.length - 1] = cls;
      snap(narr, cls);
    }
    snap(cfg.finish(st), null);
    return frames;
  }

  /* ---------- op builders reused by several visualizers ---------- */
  function lockOp(line, m) {
    return {
      line: line, txt: 'lock ' + m,
      can: function (st, t) { return st.s[m] === null || st.s[m] === undefined; },
      waitSay: function (st, t) { return m + ' is owned by thread ' + st.s[m]; },
      run: function (st, t) { st.s[m] = t; return { say: 'lock(' + m + ') -> got it', cls: 'ok', narr: 'locks <code>' + m + '</code>. Nobody owned it, so thread ' + t + ' now holds the key. Anyone else who tries to lock it will have to wait.' }; }
    };
  }
  function unlockOp(line, m, jumpFn) {
    return {
      line: line, txt: 'unlock ' + m,
      run: function (st, t) {
        st.s[m] = null;
        var r = { say: 'unlock(' + m + ')', narr: 'unlocks <code>' + m + '</code> (the lock_guard destructor runs at the closing brace). The key goes back on the hook.' };
        if (jumpFn) { var j = jumpFn(st, t); if (j !== undefined) r.jump = j; }
        return r;
      }
    };
  }

  /* ======================================================================
     TOPIC 1 — std::thread, join, detach, jthread
     ====================================================================== */
  var LIFE_CODE = {
    join: 'void bake() { /* bake 3 cakes */ }\nint main() {\n    std::thread t(bake);      // worker starts NOW\n    setTables();              // main keeps working\n    t.join();                 // wait for the worker\n    std::cout << "closing";\n}                             // ~thread(): not joinable, fine',
    detach: 'void bake() { /* bake 3 cakes */ }\nint main() {\n    std::thread t(bake);      // worker starts NOW\n    setTables();              // main keeps working\n    t.detach();               // "go on without me"\n    std::cout << "closing";\n}                             // main returns -> process exits',
    forget: 'void bake() { /* bake 3 cakes */ }\nint main() {\n    std::thread t(bake);      // worker starts NOW\n    setTables();              // main keeps working\n    /* forgot join() AND detach() */\n    std::cout << "closing";\n}                             // ~thread(): still joinable!',
    jthread: 'void bake() { /* bake 3 cakes */ }\nint main() {\n    std::jthread t(bake);     // C++20 joining thread\n    setTables();              // main keeps working\n    /* nothing to remember */\n    std::cout << "closing";\n}                             // ~jthread(): request_stop() + join()'
  };
  function lifeSteps(mode) {
    var S = [];
    // [main, worker, joinable, line, narr, cls, cakes]
    S.push(['main() starts', 'does not exist yet', 'no thread', 2, 'The program starts with exactly <b>one</b> thread: the main thread. The worker does not exist yet.', 'cur', 0]);
    S.push([mode === 'jthread' ? 'creates std::jthread t' : 'creates std::thread t', 'starts running bake()', 'true', 3, 'Constructing the thread object asks the OS for a new thread. From this moment <b>two</b> things run at the same time, maybe on two CPU cores. The object <code>t</code> is now <i>joinable</i>: it owns a running thread.', 'ok', 0]);
    S.push(['setTables()', 'bakes cake 1', 'true', 4, 'Both threads make progress <b>at the same time</b>. Nobody decides who is "ahead": the OS scheduler does.', 'cur', 1]);
    if (mode === 'join') {
      S.push(['t.join(): main goes to sleep', 'bakes cake 2', 'true', 5, '<code>join()</code> means "wait here until the worker is completely done". Main uses <b>zero CPU</b> while it waits.', 'win', 2]);
      S.push(['(still waiting inside join)', 'bakes cake 3, bake() returns', 'true', 5, 'The worker finishes its function. The OS thread ends.', 'cur', 3]);
      S.push(['join() returns', 'finished and cleaned up', 'false', 5, 'join() returns. All the worker\'s writes are now <b>visible</b> to main (join is a synchronization point). <code>t.joinable()</code> becomes false.', 'ok', 3]);
      S.push(['prints "closing"', 'gone', 'false', 6, 'Main prints. It can safely read anything the worker produced.', 'cur', 3]);
      S.push(['~thread(): joinable is false, OK', 'gone', 'false', 7, '<span class="c-g"><b>Clean exit.</b></span> The destructor sees a non-joinable thread and does nothing. All 3 cakes are baked.', 'ok', 3]);
    } else if (mode === 'detach') {
      S.push(['t.detach()', 'bakes cake 2 (now on its own)', 'false', 5, '<code>detach()</code> cuts the string: the thread keeps running in the background, but <code>t</code> no longer owns it. Nobody can ever join it again.', 'win', 2]);
      S.push(['prints "closing"', 'still baking cake 3...', 'false', 6, 'Main does not wait. The worker is still busy.', 'cur', 2]);
      S.push(['return from main: process exits', 'KILLED in the middle of cake 3', 'false', 7, '<span class="c-r"><b>Danger.</b></span> When <code>main</code> returns, the whole process ends and every detached thread is killed mid-step. Cake 3 is never finished, files may be half-written. If the worker used references to main\'s local variables, they were already dangling.', 'bad', 2]);
      S.push(['(process gone)', '(gone)', 'false', 7, 'Rule of thumb: <b>detach is almost never what you want</b>. Use it only for truly fire-and-forget work that owns all its data and that you do not mind losing.', 'bad', 2]);
    } else if (mode === 'forget') {
      S.push(['prints "closing"', 'bakes cake 2', 'true', 6, 'Main forgot to call join() or detach(). <code>t</code> is still joinable.', 'cur', 2]);
      S.push(['~thread() runs at the closing brace', 'bakes cake 3', 'true', 7, 'The destructor of a <b>joinable</b> std::thread has no good choice: joining silently could hang forever, detaching silently could leave dangling references.', 'win', 3]);
      S.push(['std::terminate(): abort!', 'killed', 'true', 7, '<span class="c-r"><b>Crash.</b></span> So the standard says: destroying a joinable std::thread calls <code>std::terminate()</code>. Your program aborts ("terminate called without an active exception").', 'bad', 3]);
      S.push(['(process aborted)', '(gone)', 'true', 7, 'This also happens when an exception unwinds past an un-joined thread. Fix: call join(), or better, use <code>std::jthread</code> which joins in its destructor.', 'bad', 3]);
    } else {
      S.push(['prints "closing"', 'bakes cake 2', 'true', 6, 'With <code>std::jthread</code> there is nothing to remember.', 'cur', 2]);
      S.push(['~jthread(): request_stop()', 'bakes cake 3', 'true', 7, 'The destructor first calls <code>request_stop()</code>. A worker that takes a <code>std::stop_token</code> could notice and finish early. bake() ignores it and keeps going.', 'win', 3]);
      S.push(['~jthread(): join() waits', 'bake() returns', 'true', 7, 'Then the destructor <b>joins</b>: main waits for the worker, exactly like a manual join.', 'win', 3]);
      S.push(['destructor finishes', 'finished', 'false', 7, '<span class="c-g"><b>Clean exit, even if an exception had been thrown.</b></span> RAII at work: the cleanup lives in a destructor, so it always runs.', 'ok', 3]);
    }
    return S;
  }
  var vizLifecycle = {
    title: 'Thread lifecycle: join vs detach vs forgetting vs jthread',
    input: 'join',
    inputLabel: 'Mode: join | detach | forget | jthread',
    gen: function (input) {
      var mode = String(input || 'join').trim().toLowerCase();
      if (!LIFE_CODE[mode]) throw new Error('Type one of: join, detach, forget, jthread');
      var S = lifeSteps(mode), rows = [], frames = [];
      S.forEach(function (s, k) {
        rows.push([String(k), s[0], s[1], s[2]]);
        var hl = {}; hl[k] = s[5];
        var lh = {}; lh[s[3]] = s[5] === 'bad' ? 'bad' : s[5] === 'ok' ? 'ok' : 'cur';
        frames.push({ narr: s[4], parts: [
          { type: 'table', label: 'Timeline (main and worker side by side)', columns: ['step', 'main thread', 'worker thread', 't.joinable()'], rows: clone(rows), hl: hl },
          { type: 'code', label: 'Program (mode: ' + mode + ')', lang: 'cpp', code: LIFE_CODE[mode], hl: lh },
          { type: 'vars', label: 'State', vals: { 't.joinable()': s[2], 'cakes baked': s[6] + ' / 3' }, hl: { 't.joinable()': s[5] === 'bad' ? 'bad' : 'cur' } }
        ] });
      });
      return frames;
    }
  };

  function printOps(name) {
    return [1, 2, 3].map(function (k) {
      return { line: k, txt: 'print ' + name + k, run: function (st) { st.s.out += (st.s.out ? ' ' : '') + name + k; return { say: 'prints ' + name + k, narr: 'prints <b>' + name + k + '</b>. Output so far: <code>' + st.s.out + '</code>' }; } };
    });
  }
  var vizPrints = {
    title: 'Who prints first? You are the OS scheduler',
    input: 'A B B A B A',
    inputLabel: 'Schedule: a list of A / B (who gets the CPU for one step)',
    gen: function (input) {
      var sched = parseSched(input, 'A B B A B A');
      return interleave({
        code: { A: 'std::cout << "A1";\nstd::cout << "A2";\nstd::cout << "A3";', B: 'std::cout << "B1";\nstd::cout << "B2";\nstd::cout << "B3";' },
        ops: { A: printOps('A'), B: printOps('B') },
        shared: { out: '' }, reg: {},
        cols: ['console so far'], colVals: function (st) { return [st.s.out]; },
        view: function (st) { return { 'console output': st.s.out || '(empty)', 'A next': st.pc.A < 3 ? 'A' + (st.pc.A + 1) : 'done', 'B next': st.pc.B < 3 ? 'B' + (st.pc.B + 1) : 'done' }; },
        intro: 'Two threads each print three words. <b>You</b> play the OS scheduler: every letter in the schedule gives one thread the CPU for one step. Change the schedule and see the output change. Inside one thread the order is fixed (A1 before A2 before A3); <b>between</b> threads anything goes.',
        finish: function (st) { return 'Final output: <code>' + st.s.out + '</code>. This is just one of <b>20</b> possible outputs (choose which 3 of the 6 slots belong to A: 6!/(3!·3!) = 20). Real programs have billions of possible interleavings, which is why concurrency bugs hide in testing and appear in production.'; }
      }, sched);
    }
  };

  topics.push({
    title: 'std::thread, join, detach & std::jthread',
    analogy: `<p>You run a small bakery. You (the <b>main thread</b>) hire a helper (a <b>worker thread</b>) and say "bake three cakes". Now two people work <i>at the same time</i> in the same kitchen, sharing the same fridge (memory). Before you lock up for the night you must make a choice about the helper:</p>
      <ul><li><b>join</b> = "I will wait at the door until you finish". Safe and common.</li>
      <li><b>detach</b> = "Go home whenever, I won't check on you". If you lock the building first, the helper is thrown out mid-cake.</li>
      <li><b>forget to choose</b> = C++ sets off the <b>fire alarm</b> (<code>std::terminate</code>) because it refuses to guess for you.</li>
      <li><b>std::jthread</b> = a helper who automatically waits for you at the door. You cannot forget.</li></ul>`,
    explain: `<p>A <b>thread</b> is an independent path of execution inside your program. All threads of one process share the same memory (globals, heap), but each has its own <b>stack</b> (local variables) and its own position in the code. On a 8-core laptop, up to 8 threads can truly run at the same instant; more than that and the OS takes turns ("time slicing").</p>
      <p><b>Starting a thread</b> is one line: <code>std::thread t(function, arg1, arg2);</code>. It starts running <i>immediately</i>. The "function" can be a plain function, a lambda, a function object, or a member function (<code>std::thread t(&amp;Cls::method, &amp;obj, args)</code>).</p>
      <p><b>Arguments are copied</b> into the new thread (so it can't be hurt if your local variable goes away). If you really want a reference, wrap it: <code>std::ref(x)</code>. Forgetting this is a classic interview trap: the thread changes its private copy and your <code>x</code> never changes.</p>
      ${H.table(['you call', 'what happens', 'after the call'], [
        ['<code>t.join()</code>', 'caller sleeps until the thread finishes', '<code>t.joinable() == false</code>; worker results are visible'],
        ['<code>t.detach()</code>', 'thread keeps running on its own; you lose the handle', '<code>t.joinable() == false</code>; you can never wait for it'],
        ['nothing', '<code>~thread()</code> on a joinable thread', '<span class="c-r">std::terminate() → program aborts</span>'],
        ['<code>std::jthread</code> (C++20)', 'destructor calls <code>request_stop()</code> then <code>join()</code>', 'always safe, even when exceptions fly']
      ])}
      <p><b>Exactly once rule:</b> every <code>std::thread</code> that started a thread must be joined <i>or</i> detached exactly once before its destructor runs. Calling join twice throws <code>std::system_error</code>. Threads are <b>movable but not copyable</b> (one owner), so you can keep them in a <code>vector&lt;thread&gt;</code> with <code>emplace_back</code>.</p>
      <p><b>Useful helpers:</b> <code>std::thread::hardware_concurrency()</code> (how many hardware threads, may return 0 if unknown), <code>std::this_thread::get_id()</code>, <code>std::this_thread::sleep_for(100ms)</code>, <code>std::this_thread::yield()</code>.</p>
      <p><b>Output order is not fixed.</b> If two threads print, the lines can come out in any order, and even mixed inside a line. That's the first taste of <i>non-determinism</i>: the same program can behave differently each run.</p>`,
    clues: ['"run these tasks in parallel" / "use multiple cores" → <code>std::thread</code> or <code>std::async</code>, one thread per chunk', '"terminate called without an active exception" → a joinable std::thread was destroyed (missing join)', '"the thread modified a copy" / value never changes → arguments are copied, use <code>std::ref</code>', '"fire and forget" / "background thread outlives main" → detach discussion: lifetimes and dangling references', '"exception safety with threads" / "C++20" → <code>std::jthread</code> + <code>std::stop_token</code>', '"how many threads should I create?" → <code>hardware_concurrency()</code>, CPU-bound vs I/O-bound'],
    code: [R`
      #include <bits/stdc++.h>
      using namespace std;

      void greet(const string& name, int times) {
          for (int i = 0; i < times; ++i)
              cout << "hi " + name + "\n";        // one string per << so lines stay whole
      }

      struct Counter {
          int value = 0;
          void addMany(int n) { for (int i = 0; i < n; ++i) ++value; }
      };

      int main() {
          // 1) plain function + arguments (they are COPIED into the thread)
          thread t1(greet, "Asha", 2);

          // 2) lambda capturing by value
          int base = 40;
          thread t2([base] { cout << "answer " + to_string(base + 2) + "\n"; });

          // 3) member function: pass a pointer to the object as the first argument
          Counter c;
          thread t3(&Counter::addMany, &c, 1000);

          // 4) pass a REFERENCE: must wrap with std::ref, otherwise the thread gets a copy
          int total = 0;
          thread t4([](int& out) { out = 99; }, ref(total));

          t1.join(); t2.join(); t3.join(); t4.join();   // join every thread exactly once
          cout << c.value << " " << total << "\n";       // 1000 99 (safe: join synchronizes)
          cout << "cores: " << thread::hardware_concurrency() << "\n";
      }`, R`
      #include <bits/stdc++.h>
      using namespace std;
      using namespace std::chrono_literals;

      // C++20: std::jthread joins automatically and supports cooperative cancellation.
      int main() {
          jthread ticker([](stop_token st) {          // jthread passes its stop_token first
              int n = 0;
              while (!st.stop_requested()) {           // check the "please stop" flag
                  ++n;
                  this_thread::sleep_for(10ms);
              }
              cout << "ticker stopped after " << n << " ticks\n";
          });
          this_thread::sleep_for(55ms);
          ticker.request_stop();   // optional: the destructor would do this anyway
      }                            // ~jthread(): request_stop() + join()  -> never terminates`],
    codeTitle: ['Four ways to start a thread (and std::ref)', 'std::jthread + stop_token (C++20)'],
    viz: [vizLifecycle, vizPrints],
    examples: [
      { title: 'The std::ref trap', html: `<p>You pass <code>x</code> to a function taking <code>int&amp;</code>. Without <code>std::ref</code> it doesn't even compile (the copied argument is an rvalue and can't bind to <code>int&amp;</code>). With a parameter of type <code>const int&amp;</code> it compiles but refers to the thread's <b>private copy</b>. Rule: <b>std::thread always copies</b>; say <code>std::ref(x)</code> when you mean "really this x", and then <b>you</b> must keep x alive until the thread is joined.</p>`, code: R`
        void bump(int& v) { ++v; }
        int main() {
            int x = 1;
            // std::thread bad(bump, x);    // compile error: cannot bind int& to a copied rvalue
            std::thread good(bump, std::ref(x));
            good.join();
            std::cout << x << "\n";         // 2
        }` },
      { title: 'Detach + a reference to a local = dangling', html: `<p>The lambda captures <code>buf</code> by reference, the thread is detached, and the function returns. <code>buf</code> is destroyed while the thread still writes into it: <span class="c-r">undefined behaviour</span> (random crashes, corrupted memory). Fix: capture by value / move the data into the thread, or join before returning.</p>`, code: R`
        void startLogger() {
            std::string buf = "log:";
            std::thread t([&buf] {                       // BUG: reference to a local
                for (int i = 0; i < 3; ++i) buf += '.';
            });
            t.detach();                                  // function returns, buf dies
        }
        void startLoggerFixed() {
            std::string buf = "log:";
            std::thread t([buf]() mutable {              // own a copy: safe even when detached
                for (int i = 0; i < 3; ++i) buf += '.';
            });
            t.join();                                    // or keep the handle and join later
        }` },
      { title: 'Exception between start and join', html: `<p>If <code>riskyWork()</code> throws, <code>t.join()</code> is skipped, the joinable thread is destroyed during unwinding, and the program terminates. Old fix: a hand-written RAII "thread guard" class. Modern fix: <code>std::jthread</code>.</p>`, code: R`
        void riskyWork();
        void caller() {
            std::jthread t([] { /* background work */ });
            riskyWork();     // even if this throws, ~jthread() joins: no terminate
        }` },
      { title: 'A pool of threads in a vector', html: `<p>Threads are move-only, so <code>vector&lt;thread&gt;</code> + <code>emplace_back</code> is the standard way to launch N workers. Capture loop variables <b>by value</b> (<code>[i]</code>), never <code>[&amp;]</code>, because <code>i</code> keeps changing after the thread starts.</p>`, code: R`
        int main() {
            std::vector<std::thread> pool;
            std::vector<int> result(4);
            for (int i = 0; i < 4; ++i)
                pool.emplace_back([i, &result] { result[i] = i * 10; });  // disjoint slots: no race
            for (auto& t : pool) t.join();
            for (int r : result) std::cout << r << ' ';                   // 0 10 20 30
        }` }
    ],
    deepDive: `<p><b>What the constructor really does.</b> On Linux, <code>std::thread</code> wraps <code>pthread_create</code>; on Windows, <code>CreateThread</code>. The kernel allocates a stack (Linux default ≈ 8 MB of <i>virtual</i> memory, only touched pages become real), a thread control block and a scheduler entry. Creating and joining a thread costs roughly <b>10–50 µs</b>. That's why real servers keep a <b>thread pool</b> instead of spawning one thread per tiny task.</p>
      <p><b>Decay-copy.</b> The arguments are copied (or moved) into storage owned by the new thread <i>in the calling thread</i>, before the constructor returns. That's why <code>std::thread t(f, buf)</code> with <code>f(const std::string&amp;)</code> and a local <code>char buf[64]</code> can bite: only the <code>char*</code> pointer is copied, and the <code>std::string</code> is built later inside the new thread. If the pointer points to a local buffer that has died by then, you read garbage. Convert explicitly: <code>std::thread t(f, std::string(buf))</code>.</p>
      <p><b>Why terminate instead of auto-join?</b> The committee chose "fail loudly". Implicit join in the destructor could hang forever during exception unwinding; implicit detach could leave the thread using destroyed locals. C++20's <code>jthread</code> picked auto-join <i>plus</i> a cooperative stop request, which fixes the hang concern when the worker checks its <code>stop_token</code>.</p>
      <p><b>Exceptions inside a thread.</b> If the thread function lets an exception escape, <code>std::terminate</code> is called: exceptions do <b>not</b> travel to the joining thread. To send errors back, use <code>std::promise</code>/<code>std::future</code> or <code>std::async</code> (topic 7), or catch and store into an <code>std::exception_ptr</code>.</p>
      <p><b>Sizing.</b> For CPU-bound work use about <code>hardware_concurrency()</code> threads. More threads only add context switches (each ≈ 1–5 µs plus cache pollution). For I/O-bound work (waiting on disk or network) more threads can help, but async I/O usually scales better. <b>thread_local</b> variables give each thread its own copy (great for per-thread counters merged at the end).</p>
      <p><b>join() is a synchronization point:</b> everything the thread did happens-before <code>join()</code> returns, so reading its results afterwards is race-free. That fact is what makes the "each thread writes its own slot, then join" pattern correct without any lock.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants happily write <code>std::thread</code> boilerplate, split loops into chunks and produce thread-pool skeletons in seconds. That part of the job is cheap now.</p>
      <p><b>Use AI as a partner:</b> ask <code>"Review this code for lifetime bugs: which objects can a detached thread outlive?"</code> or <code>"Convert these std::thread + join pairs to std::jthread with stop_token cancellation"</code>. Ask it to list every place an exception could skip a join.</p>
      <p><b>Where AI goes wrong:</b> it often captures <code>[&amp;]</code> in lambdas launched in a loop, detaches threads "to avoid blocking", forgets <code>std::ref</code>, or spawns one thread per request with no limit. It also tends to claim code is safe because "it worked when I ran it", which says nothing about concurrency.</p>
      <p><b>What you must still own:</b> the lifetime story (who owns each object, who outlives whom), choosing how many threads, and explaining join's happens-before guarantee in an interview. Those decisions can't be checked by running the code once.</p>`,
    problems: [{
      title: 'Split the Work: Fill an Array with K Threads',
      level: 'Easy', tags: ['std::thread', 'join', 'partitioning'], companies: ['Bloomberg', 'Microsoft', 'Nvidia'],
      statement: `<p>Write <code>vector&lt;long long&gt; parallelSquares(int n, int k)</code> that returns <code>out</code> with <code>out[i] = i * i</code> for <code>0 ≤ i &lt; n</code>, using <b>k</b> threads. Every element must be written exactly once, no locks allowed, and all threads must be finished before you return.</p>`,
      constraints: `1 ≤ n ≤ 10<sup>7</sup>, 1 ≤ k ≤ 64 (k may be larger than n)`,
      example: `<p>n = 10, k = 3 → chunk = ⌈10/3⌉ = 4</p>${H.table(['thread', 'slice [lo, hi)', 'writes'], [['w0', '[0, 4)', '0 1 4 9'], ['w1', '[4, 8)', '16 25 36 49'], ['w2', '[8, 10)', '64 81']])}<p>Output: <code>0 1 4 9 16 25 36 49 64 81</code>. ${H.c('g', 'Each index belongs to exactly one thread → no two threads touch the same element → no data race.')}</p>`,
      brute: { why: `<p>A single loop is correct but uses one core. The tempting "parallel" attempt below is worse: it captures the loop variable by reference (every thread may see a changed <code>w</code>) and never joins, so the program terminates.</p>`, code: R`
        vector<long long> squaresSequential(int n) {
            vector<long long> out(n);
            for (int i = 0; i < n; ++i) out[i] = 1LL * i * i;   // correct, but 1 core only
            return out;
        }
        // BROKEN parallel attempt (do not use):
        //   for (int w = 0; w < k; ++w) thread([&] { /* uses w by reference */ });
        //   -> temporary thread destroyed while joinable -> std::terminate` },
      mcq: { q: 'Each thread writes only out[lo..hi). Do we need a mutex around <code>out[i] = ...</code>?', options: ['Yes, vector is not thread-safe', 'No: different elements are different memory locations, and join() publishes the results', 'Only if k &gt; number of cores', 'Yes, but only for the last chunk'], answer: 1, explain: 'A data race needs two threads touching the SAME memory location. Distinct vector elements are distinct locations (careful: vector&lt;bool&gt; is the exception, its bits share bytes). join() then gives main a happens-before edge, so reading the results is safe.' },
      hints: [`<p><b>Aha:</b> if every index is owned by exactly one thread, no thread ever touches another thread's data, so there's nothing to lock.</p>`, `<p>Use <code>chunk = (n + k - 1) / k</code>; thread w handles <code>[w*chunk, min(n, (w+1)*chunk))</code>. Store threads in a <code>vector&lt;thread&gt;</code>.</p>`, `<p>Edge cases: k &gt; n gives empty slices, so skip them. Capture <code>lo</code>/<code>hi</code> <b>by value</b>. Recipe: make the slices → <code>emplace_back</code> one lambda per slice → join all → return.</p>`],
      solution: {
        approach: `<p><b>Static partitioning.</b> Cut the index range into k contiguous slices, give each slice to one thread, then join all. Contiguous slices are also cache-friendly. Because slices are disjoint, the only synchronization needed is <code>join()</code>, which makes every write visible to the caller.</p>`,
        code: R`
          #include <bits/stdc++.h>
          using namespace std;

          // out[i] = i*i using k threads; each thread owns a disjoint slice [lo, hi)
          vector<long long> parallelSquares(int n, int k) {
              vector<long long> out(n);
              vector<thread> workers;
              workers.reserve(k);
              int chunk = (n + k - 1) / k;                 // ceil(n / k)
              for (int w = 0; w < k; ++w) {
                  int lo = w * chunk;
                  int hi = min(n, lo + chunk);
                  if (lo >= hi) break;                     // more threads than work
                  // capture lo/hi BY VALUE: w keeps changing in this loop
                  workers.emplace_back([&out, lo, hi] {
                      for (int i = lo; i < hi; ++i) out[i] = 1LL * i * i;
                  });
              }
              for (auto& t : workers) t.join();            // wait for every slice (happens-before)
              return out;
          }

          int main() {
              for (long long x : parallelSquares(10, 3)) cout << x << ' ';
              cout << '\n';                                // 0 1 4 9 16 25 36 49 64 81
          }`,
        dry: { head: ['w', 'lo', 'hi', 'thread writes', 'after join'], rows: [['0', '0', '4', 'out[0..3] = 0 1 4 9', 'visible'], ['1', '4', '8', 'out[4..7] = 16 25 36 49', 'visible'], ['2', '8', '10', 'out[8..9] = 64 81', 'visible'], ['3', '12', '10', 'lo ≥ hi → loop breaks', '-']] },
        complexity: `<p>Work O(n) total, wall-clock ≈ O(n / k) with k free cores (plus ~tens of µs per thread start). Extra space O(k) for the thread handles.</p>`,
        followUps: ['Why would <code>vector&lt;bool&gt;</code> break this lock-free design?', 'How would you handle uneven work per index (dynamic scheduling with an atomic next-index counter)?', 'What is false sharing and can it happen at slice borders?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 2 — Data races & race conditions
     ====================================================================== */
  var RACE_CODE = 'for (int k = 0; k < 2; ++k) {\n    int tmp = counter;   // 1. LOAD  (copy into a register)\n    tmp = tmp + 1;       // 2. ADD   (only in the register)\n    counter = tmp;       // 3. STORE (write back to memory)\n}';
  function raceOps() {
    return [
      { line: 2, txt: 'load', run: function (st, t) { var r = st.r[t]; r.tmp = st.s.counter; r.seen = st.s.counter; return { say: 'tmp = counter (reads ' + r.tmp + ')', narr: 'LOADs <code>counter</code> into its private register: tmp = <b>' + r.tmp + '</b>.' }; } },
      { line: 3, txt: 'add', run: function (st, t) { var r = st.r[t]; r.tmp++; return { say: 'tmp = ' + r.tmp + ' (in register)', narr: 'adds 1 <b>inside its own register</b>: tmp = ' + r.tmp + '. Memory still says counter = ' + st.s.counter + '.' }; } },
      { line: 4, txt: 'store', run: function (st, t) {
        var r = st.r[t], old = st.s.counter, lost = old !== r.seen, res;
        st.s.counter = r.tmp;
        if (lost) { st.s.lost++; res = { say: 'counter = ' + r.tmp + ' (LOST UPDATE: overwrote ' + old + ')', cls: 'bad', narr: '<span class="c-r">STOREs ' + r.tmp + ', overwriting the ' + old + ' that the other thread wrote.</span> It loaded ' + r.seen + ' earlier, but the other thread changed counter since then. That increment is <b>lost forever</b>.' }; }
        else res = { say: 'counter = ' + r.tmp, cls: 'ok', narr: 'STOREs ' + r.tmp + ' back to memory. Nobody touched counter in between, so this increment counts.' };
        if (r.k < 1) { r.k++; res.jump = 0; }
        return res;
      } }
    ];
  }
  var vizRace = {
    title: 'counter++ is three steps: watch an update get lost',
    input: 'A B A B A B',
    inputLabel: 'Schedule of A / B steps (try "A A A B B B" for a lucky run)',
    gen: function (input) {
      var sched = parseSched(input, 'A B A B A B');
      return interleave({
        code: { A: RACE_CODE, B: RACE_CODE },
        ops: { A: raceOps(), B: raceOps() },
        shared: { counter: 0, lost: 0 }, reg: { tmp: '-', seen: 0, k: 0 },
        cols: ['counter in memory'], colVals: function (st) { return [st.s.counter]; },
        view: function (st) { return { counter: st.s.counter, 'A.tmp (register)': st.r.A.tmp, 'B.tmp (register)': st.r.B.tmp, 'lost updates': st.s.lost }; },
        viewHl: function (st) { return st.s.lost ? { 'lost updates': 'bad' } : {}; },
        intro: 'Both threads run <code>++counter</code> twice, so the answer "should" be <b>4</b>. But <code>++counter</code> on a plain int is really <b>load → add → store</b>. You are the scheduler: each letter lets one thread do one of those tiny steps.',
        finish: function (st) {
          return st.s.counter === 4
            ? '<span class="c-g">counter = 4.</span> This schedule happened to keep each load-add-store together, so nothing was lost. <b>Lucky is not correct</b>: in C++ this program has a data race and is undefined behaviour no matter what number comes out.'
            : '<span class="c-r">counter = ' + st.s.counter + ' instead of 4</span> (' + st.s.lost + ' lost update' + (st.s.lost === 1 ? '' : 's') + '). Two threads loaded the same old value, both added 1, and the second store overwrote the first. Fix: <code>std::atomic&lt;int&gt;</code> (one indivisible fetch_add) or a mutex around the three steps.';
        }
      }, sched);
    }
  };
  var BANK_CODE = '// balance is std::atomic<int>, starts at 100\nif (balance.load() >= 80) {      // 1. CHECK\n    balance.fetch_sub(80);       // 2. ACT\n}';
  function bankOps() {
    return [
      { line: 2, txt: 'check', run: function (st, t) { var ok = st.s.balance >= 80; st.r[t].go = ok; return { say: 'check: balance ' + st.s.balance + (ok ? ' >= 80, yes' : ' < 80, no'), narr: 'checks the balance: ' + st.s.balance + (ok ? ' is enough, so it decides to withdraw.' : ' is not enough, so it gives up.'), jump: ok ? 1 : 2 }; } },
      { line: 3, txt: 'act', run: function (st, t) {
        st.s.balance -= 80;
        var bad = st.s.balance < 0;
        return { say: 'fetch_sub(80) -> balance ' + st.s.balance, cls: bad ? 'bad' : 'ok', narr: bad ? '<span class="c-r">withdraws 80 based on a check that is no longer true.</span> Balance is now <b>' + st.s.balance + '</b>. Each single operation was atomic, but the check-then-act pair was not.' : 'withdraws 80 atomically. Balance = ' + st.s.balance + '.' };
      } }
    ];
  }
  var vizBank = {
    title: 'Race condition without a data race: check-then-act',
    input: 'A B A B',
    inputLabel: 'Schedule of A / B steps (try "A A B B")',
    gen: function (input) {
      var sched = parseSched(input, 'A B A B');
      return interleave({
        code: { A: BANK_CODE, B: BANK_CODE },
        ops: { A: bankOps(), B: bankOps() },
        shared: { balance: 100 }, reg: { go: '-' },
        cols: ['balance'], colVals: function (st) { return [st.s.balance]; },
        view: function (st) { return { balance: st.s.balance, 'A decided to withdraw': st.r.A.go, 'B decided to withdraw': st.r.B.go }; },
        viewHl: function (st) { return st.s.balance < 0 ? { balance: 'bad' } : {}; },
        intro: 'Balance is a <code>std::atomic&lt;int&gt;</code>, so there is <b>no data race</b>: every single load and fetch_sub is indivisible. Two customers each try to withdraw 80 from 100. Only one should succeed.',
        finish: function (st) {
          return st.s.balance < 0
            ? '<span class="c-r">Balance = ' + st.s.balance + '.</span> This is a <b>race condition</b> (a logic bug about timing), not a data race. Atomics on each step do not help: the decision must be taken and applied as one unit. Fix: hold a mutex over check + act, or use a compare_exchange loop that only subtracts if the value is still what you checked.'
            : '<span class="c-g">Balance = ' + st.s.balance + '.</span> This schedule did the check and the act of one thread back-to-back, so the second thread saw the true balance. The bug is still there; it just did not show up this time.';
        }
      }, sched);
    }
  };

  topics.push({
    title: 'Data Races, Race Conditions & Why "It Worked on My Machine" Means Nothing',
    analogy: `<p>Two cashiers share one whiteboard that shows "<b>cookies sold: 5</b>". Both sell a cookie at the same moment. Each reads 5, each thinks "5 + 1 = 6", each wipes the board and writes <b>6</b>. Two cookies were sold, but the board only went up by one. Nobody did anything "wrong" alone; the problem is that <b>read → think → write</b> is three moves, and the other cashier slipped in between.</p>`,
    explain: `<p><b>Why it happens.</b> <code>++counter</code> looks like one action, but the CPU does three: <b>load</b> the value into a register, <b>add</b> 1 in the register, <b>store</b> it back. If another thread runs between the load and the store, one increment vanishes. Run 4 threads × 100,000 increments and you typically get something like 217,893 instead of 400,000, and a different number every run.</p>
      <p><b>The official definition (learn this sentence).</b> A <b>data race</b> happens when two threads access the <b>same memory location</b>, <b>at least one of them writes</b>, <b>at least one access is not atomic</b>, and <b>neither happens-before the other</b> (nothing orders them: no lock, no join, no atomic handshake). In C++ a data race is <span class="c-r"><b>undefined behaviour</b></span>. Not "maybe a wrong number": the whole program has no meaning, and the optimizer is allowed to assume it never happens.</p>
      ${H.table(['', 'data race', 'race condition'], [
        ['what', 'unsynchronized conflicting access to one memory location', 'the result depends on timing / ordering of events'],
        ['level', 'language rule (the C++ memory model)', 'program logic'],
        ['consequence', 'undefined behaviour', 'a wrong but well-defined result'],
        ['example', '<code>int c; c++</code> from two threads', 'atomic check balance, then atomic withdraw'],
        ['detected by', 'ThreadSanitizer (TSan)', 'thinking, tests, model checkers']
      ])}
      <p>You can have one without the other: a mutex-protected <code>map</code> where you check <code>contains(k)</code> in one locked call and <code>insert</code> in another has no data race but still has a race condition (check-then-act).</p>
      <p><b>The four cures</b> (pick in this order):</p>
      <ol><li><b>Don't share</b>: give each thread its own data (own slice, <code>thread_local</code>, local variable) and combine at the end.</li>
      <li><b>Share only immutable data</b>: many readers and zero writers is always safe.</li>
      <li><b>Lock</b>: protect the shared data with a mutex so only one thread at a time runs the critical section (topic 3).</li>
      <li><b>Atomics</b>: for single variables, <code>std::atomic</code> makes each operation indivisible (topic 5).</li></ol>
      <p><b>Memory location</b> = one scalar object (an int, a pointer, a double...). Two different members of a struct are two locations, so two threads may write <code>s.a</code> and <code>s.b</code> at the same time safely. The exceptions: adjacent bit-fields share a location, and <code>vector&lt;bool&gt;</code> packs 8 elements into one byte.</p>`,
    clues: ['"the count is sometimes lower than expected" / "flaky test under load" → lost update from a read-modify-write data race', '"works in Debug, hangs in Release" → optimizer hoisted a non-atomic flag read out of a loop', '"is this code thread-safe?" → look for shared + mutable + unsynchronized', '"check if absent, then insert" / "if balance ≥ x then withdraw" → check-then-act race condition: make the pair one atomic unit', '"volatile bool stop" in C++ → not a synchronization tool; use <code>std::atomic&lt;bool&gt;</code>', '"how would you find it?" → ThreadSanitizer <code>-fsanitize=thread</code>, stress tests, code review'],
    code: [R`
      #include <bits/stdc++.h>
      using namespace std;

      int plainHits = 0;               // shared, NOT protected  -> data race (UB)
      atomic<int> atomicHits{0};       // shared, every op is indivisible -> correct

      int main() {
          vector<thread> pool;
          for (int t = 0; t < 4; ++t)
              pool.emplace_back([] {
                  for (int i = 0; i < 100000; ++i) {
                      ++plainHits;     // load + add + store: increments get lost
                      ++atomicHits;    // one atomic fetch_add: never lost
                  }
              });
          for (auto& th : pool) th.join();
          cout << "plain : " << plainHits << "  (expected 400000, usually less)\n";
          cout << "atomic: " << atomicHits << "  (always 400000)\n";
      }
      // Build with: g++ -std=c++20 -O1 -g -fsanitize=thread race.cpp
      // TSan reports: "WARNING: ThreadSanitizer: data race ... Write of size 4 ... plainHits"`],
    codeTitle: ['Lost updates: plain int vs std::atomic (run it under TSan)'],
    viz: [vizRace, vizBank],
    examples: [
      { title: 'The flag that never changes (works in -O0, hangs in -O2)', html: `<p>With a plain <code>bool</code>, the compiler may legally assume no other thread changes <code>stopFlag</code> (that would be a data race, which "cannot happen"). So it reads it <b>once</b>, keeps it in a register, and turns the loop into <code>while (true)</code>. <code>volatile</code> is not the fix in C++ (it gives no atomicity and no ordering between threads). <code>std::atomic&lt;bool&gt;</code> is.</p>`, code: R`
        std::atomic<bool> stopFlag{false};        // NOT plain bool, NOT volatile bool
        void worker() {
            while (!stopFlag.load()) {            // re-read from memory every iteration
                /* do a unit of work */
            }
        }
        int main() {
            std::thread t(worker);
            std::this_thread::sleep_for(std::chrono::milliseconds(50));
            stopFlag.store(true);                 // worker sees it and exits
            t.join();
        }` },
      { title: 'Check-then-act on a "thread-safe" map', html: `<p>Each method locks internally, yet two threads can both see "not there" and both insert/compute. The data is never corrupted, but the expensive load runs twice or the second value overwrites the first: a <b>race condition</b>. Fix: one lock around the whole compound action (or an API like <code>getOrCreate</code>).</p>`, code: R`
        class SafeCache {
            std::mutex m;
            std::unordered_map<std::string, int> data_;
        public:
            // the whole "check + insert" happens under ONE lock: no window in between
            int getOrCompute(const std::string& key, const std::function<int()>& compute) {
                std::lock_guard<std::mutex> g(m);
                auto it = data_.find(key);
                if (it != data_.end()) return it->second;
                int v = compute();                       // (holding the lock while computing is a trade-off)
                data_.emplace(key, v);
                return v;
            }
        };` },
      { title: 'Different struct members are fine, vector&lt;bool&gt; is not', html: `<p>Two threads writing <code>p.x</code> and <code>p.y</code> is <b>not</b> a data race: different memory locations. Two threads writing <code>flags[0]</code> and <code>flags[1]</code> of a <code>vector&lt;bool&gt;</code> <b>is</b> a data race, because both bits live in the same byte and each write is a read-modify-write of that byte. Use <code>vector&lt;char&gt;</code> or <code>vector&lt;uint8_t&gt;</code> instead.</p>`, code: R`
        struct Point { int x; int y; };
        int main() {
            Point p{};
            std::thread a([&] { p.x = 1; });      // OK: separate memory locations
            std::thread b([&] { p.y = 2; });
            a.join(); b.join();

            std::vector<char> flags(2);           // vector<bool> here would be a data race
            std::thread c([&] { flags[0] = 1; });
            std::thread d([&] { flags[1] = 1; });
            c.join(); d.join();
            std::cout << p.x + p.y + flags[0] + flags[1] << "\n";   // 5
        }` },
      { title: 'shared_ptr: the count is atomic, the object is not', html: `<p>Copying <i>different</i> <code>shared_ptr</code> objects that point to the same thing from many threads is safe (the reference count uses atomic increments). But reading and writing the <b>same</b> <code>shared_ptr</code> variable from two threads is a data race, and so is mutating the pointed-to object without a lock. C++20 adds <code>std::atomic&lt;std::shared_ptr&lt;T&gt;&gt;</code> for the first case.</p>` }
    ],
    deepDive: `<p><b>Why UB and not "just a wrong value"?</b> Because it lets compilers optimize single-threaded code freely: keep variables in registers, merge or remove loads and stores, reorder independent statements. If data races were defined, every memory access would need to be treated like an atomic, and all code would get slower. Under the "data-race-free programs behave sequentially consistent" contract (the <b>SC-DRF</b> guarantee), if <i>you</i> remove all data races, the compiler and CPU promise your program behaves as if threads simply took turns.</p>
      <p><b>Real damage, not theory:</b> torn reads (a 64-bit value written as two 32-bit halves on a 32-bit CPU, so a reader sees half old, half new), loops that never exit, a "double-checked" pointer seen as non-null before the object it points to is constructed, and the compiler re-reading a variable twice so one <code>if</code> sees two different values. There is <b>no such thing as a benign data race</b> in C++.</p>
      <p><b>ThreadSanitizer</b> (<code>-fsanitize=thread</code>, GCC and Clang) instruments every memory access and tracks happens-before with vector clocks. It reports the two conflicting accesses with stack traces. Cost: about 5–15× slower and 5–10× more memory, and it cannot be combined with AddressSanitizer in one build. It only finds races on paths that actually execute, so pair it with stress tests (many iterations, more threads than cores, random sleeps). Valgrind's Helgrind/DRD are alternatives.</p>
      <p><b>volatile in C++ ≠ volatile in Java/C#.</b> In C++ it only means "this access has side effects (memory-mapped I/O), do not remove it". It gives no atomicity and no inter-thread ordering. Multi-threaded code needs <code>std::atomic</code> or locks.</p>
      <p><b>Happens-before sources</b> you can rely on: thread start (everything before the <code>std::thread</code> constructor is visible in the new thread), <code>join()</code>, mutex unlock → later lock of the same mutex, atomic release-store → acquire-load that reads it, <code>promise::set_value</code> → <code>future::get</code>, <code>notify</code> + <code>wait</code> under a mutex. Every correct concurrent design is a chain of these edges.</p>`,
    aiEra: `<p><b>What AI changes:</b> pasting a TSan report into an assistant gets a quick explanation of which two accesses collide and a plausible fix. Static analyzers with LLM help also flag "shared mutable state without a lock" during review.</p>
      <p><b>Use AI as a partner:</b> <code>"List every variable in this file that is accessed by more than one thread, and for each say what protects it"</code>. That ownership table is the best review you can ask for. Also ask it to write a stress test that hammers the code with 32 threads under TSan.</p>
      <p><b>Where AI goes wrong:</b> it often "fixes" a race by sprinkling <code>volatile</code>, by making each operation atomic while leaving a check-then-act gap, or by adding a sleep. It also says "this is a benign race" with confidence, but C++ has none. And it may report code as race-free because tests passed.</p>
      <p><b>What you must still own:</b> the data-race definition, the ownership/protection map of your shared state, and the judgment of which invariant must hold atomically (the unit that a lock must cover). An interviewer will ask you to <i>find</i> the race by reading, not by running.</p>`,
    problems: [{
      title: 'Bug Hunt: The Lossy Hit Counter',
      level: 'Easy', tags: ['data race', 'atomic', 'mutex', 'thread_local'], companies: ['Google', 'Amazon', 'Jane Street'],
      statement: `<p>A web server counts page hits with 8 threads, each running <code>for (i = 0; i &lt; 1'000'000; ++i) ++hits;</code> on a global <code>long long hits</code>. The dashboard shows numbers like 3,912,447 instead of 8,000,000. (1) Explain exactly why. (2) Give three correct fixes and say which is fastest.</p>`,
      constraints: `8 threads, 10<sup>6</sup> increments each, final total must be exactly 8·10<sup>6</sup>`,
      example: `<p>One lost update, step by step (counter starts at 7):</p>${H.table(['step', 'Thread A', 'Thread B', 'hits in memory'], [['1', 'load 7', '', '7'], ['2', '', 'load 7', '7'], ['3', 'add → 8, store 8', '', '8'], ['4', '', 'add → 8, store 8', '<span class="c-r">8 (should be 9)</span>']])}`,
      brute: { why: `<p>The buggy code: <code>++hits</code> on a plain integer is a load-add-store. Two threads interleave inside it, so increments are lost. It's also a data race, so the result isn't even guaranteed to be "a smaller number": it's undefined behaviour.</p>`, code: R`
        long long hits = 0;                       // shared, unprotected
        void handleRequests() {
            for (int i = 0; i < 1000000; ++i) ++hits;   // DATA RACE: load + add + store
        }
        int main() {
            std::vector<std::thread> pool;
            for (int t = 0; t < 8; ++t) pool.emplace_back(handleRequests);
            for (auto& th : pool) th.join();
            std::cout << hits << "\n";            // anything up to 8000000 (UB)
        }` },
      mcq: { q: 'Which fix is usually the FASTEST for 8 threads hammering one counter?', options: ['A std::mutex around ++hits', 'std::atomic&lt;long long&gt; with fetch_add', 'Each thread counts in a local variable, then adds it once at the end', 'Mark hits as volatile'], answer: 2, explain: 'Local counting does 10<sup>6</sup> register increments per thread and only ONE shared update each. Atomics are correct but all 8 cores fight over one cache line (~20-100 ns per contended op). A mutex is slower still. volatile does not fix anything.' },
      hints: [`<p><b>Aha:</b> the bug is not "two threads", it's <b>shared + mutable + unsynchronized</b>. Remove any one of the three and it's fixed.</p>`, `<p>Fix 1: <code>std::atomic&lt;long long&gt;</code>. Fix 2: <code>std::mutex</code> + <code>lock_guard</code>. Fix 3: stop sharing: count locally, then publish once.</p>`, `<p>For Fix 3 the final "publish" still needs to be safe: use one atomic <code>fetch_add</code> per thread, or write into a per-thread slot and sum after <code>join()</code>. Remember <code>relaxed</code> is enough for a pure counter read after join.</p>`],
      solution: {
        approach: `<p><b>Why:</b> lost updates from interleaved load-add-store (see the table). <b>Fixes</b>, from fastest to slowest under heavy contention: (3) <b>don't share</b>: accumulate in a local and add once; (2) <b>atomic</b> <code>fetch_add</code>: every increment is indivisible, but the cache line bounces between cores; (1) <b>mutex</b>: correct but every increment pays a lock and unlock, and threads go to sleep under contention. Never use <code>volatile</code>.</p>`,
        code: R`
          #include <bits/stdc++.h>
          using namespace std;

          constexpr int THREADS = 8, PER = 1000000;

          // Fix 1: mutex (correct, slowest under contention)
          long long hitsLocked = 0;
          mutex hitsMutex;
          void withMutex() {
              for (int i = 0; i < PER; ++i) {
                  lock_guard<mutex> g(hitsMutex);   // only one thread inside at a time
                  ++hitsLocked;
              }
          }

          // Fix 2: atomic (correct, one indivisible fetch_add per hit)
          atomic<long long> hitsAtomic{0};
          void withAtomic() {
              for (int i = 0; i < PER; ++i)
                  hitsAtomic.fetch_add(1, memory_order_relaxed);   // counter only: relaxed is enough
          }

          // Fix 3: don't share (fastest): count privately, publish once
          atomic<long long> hitsBatched{0};
          void withLocalCount() {
              long long mine = 0;                   // lives in a register, no other thread sees it
              for (int i = 0; i < PER; ++i) ++mine;
              hitsBatched.fetch_add(mine, memory_order_relaxed);   // ONE shared write per thread
          }

          template <class F> void runAll(F f) {
              vector<thread> pool;
              for (int t = 0; t < THREADS; ++t) pool.emplace_back(f);
              for (auto& th : pool) th.join();      // join = happens-before, totals are now visible
          }

          int main() {
              runAll(withMutex);      cout << hitsLocked << "\n";          // 8000000
              runAll(withAtomic);     cout << hitsAtomic.load() << "\n";   // 8000000
              runAll(withLocalCount); cout << hitsBatched.load() << "\n";  // 8000000
          }`,
        dry: { head: ['fix', 'shared writes per thread', 'contention', 'result'], rows: [['buggy ++hits', '1,000,000 (racy)', 'silent corruption', '<span class="c-r">≤ 8,000,000, UB</span>'], ['mutex', '1,000,000 lock/unlock pairs', 'threads sleep and wake', '<span class="c-g">8,000,000</span>'], ['atomic fetch_add', '1,000,000 atomic RMWs', 'cache line ping-pong', '<span class="c-g">8,000,000</span>'], ['local + 1 publish', '1', 'almost none', '<span class="c-g">8,000,000</span>']] },
        complexity: `<p>All O(N) work. Rough real timings for 8×10<sup>6</sup> increments on 8 cores: local ≈ 1–3 ms, contended atomic ≈ 50–200 ms, contended mutex ≈ 200–800 ms. The asymptotic class is the same; the constant factor from cache-line traffic is everything.</p>`,
        followUps: ['How would you make a sharded counter that is cheap to increment and occasionally read?', 'What is false sharing and how does <code>alignas(std::hardware_destructive_interference_size)</code> help?', 'Why is <code>memory_order_relaxed</code> safe for this counter but not for a "data is ready" flag?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 3 — mutex, lock_guard, unique_lock, scoped_lock, deadlock
     ====================================================================== */
  var MUTEX_CODE = 'for (int k = 0; k < 2; ++k) {\n    std::lock_guard g(m);   // lock m (waits if taken)\n    int tmp = counter;      // LOAD\n    counter = tmp + 1;      // ADD + STORE\n}                           // ~lock_guard: unlock m';
  function mutexOps() {
    return [
      lockOp(2, 'm'),
      { line: 3, txt: 'load', run: function (st, t) { st.r[t].tmp = st.s.counter; return { say: 'tmp = counter (' + st.s.counter + ')', narr: 'reads counter = <b>' + st.s.counter + '</b> while holding the lock. The other thread cannot be in here.' }; } },
      { line: 4, txt: 'store', run: function (st, t) { st.s.counter = st.r[t].tmp + 1; return { say: 'counter = ' + st.s.counter, narr: 'writes back <b>' + st.s.counter + '</b>. Because of the lock, nobody could sneak in between the load and this store.' }; } },
      unlockOp(5, 'm', function (st, t) { if (st.r[t].k < 1) { st.r[t].k++; return 0; } })
    ];
  }
  var vizMutex = {
    title: 'A mutex turns load-add-store into one protected block',
    input: 'A B A B A B B A',
    inputLabel: 'Schedule of A / B steps (same one that lost updates before)',
    gen: function (input) {
      var sched = parseSched(input, 'A B A B A B B A');
      return interleave({
        code: { A: MUTEX_CODE, B: MUTEX_CODE },
        ops: { A: mutexOps(), B: mutexOps() },
        shared: { counter: 0, m: null }, reg: { tmp: '-', k: 0 },
        cols: ['counter', 'm owner'], colVals: function (st) { return [st.s.counter, st.s.m || 'nobody']; },
        view: function (st) { return { 'm owner': st.s.m ? 'thread ' + st.s.m : 'nobody (unlocked)', counter: st.s.counter, 'A.tmp': st.r.A.tmp, 'B.tmp': st.r.B.tmp }; },
        viewHl: function (st) { return { 'm owner': st.s.m ? 'cur' : 'ok' }; },
        intro: 'Same race as before, but now each increment is wrapped in <code>std::lock_guard g(m)</code>. Watch the <b>m owner</b> box: while one thread holds the key, the other one is <b>blocked</b> when it tries to lock (blue rows).',
        finish: function (st) { return '<span class="c-g"><b>counter = ' + st.s.counter + '.</b></span> No matter what schedule you type, the answer is always 4, because the load and the store of one thread can never be split by the other. The price: blocked steps (blue rows) where a thread just waits.'; }
      }, sched);
    }
  };

  var DL_CODE = {
    naive: { A: 'std::lock_guard g1(m1);   // lock m1\nstd::lock_guard g2(m2);   // lock m2\nmoveMoney();\n/* } unlock m2, m1 */', B: 'std::lock_guard g1(m2);   // lock m2 (!)\nstd::lock_guard g2(m1);   // lock m1\nmoveMoney();\n/* } unlock m1, m2 */' },
    ordered: { A: 'std::lock_guard g1(m1);   // always m1 first\nstd::lock_guard g2(m2);   // then m2\nmoveMoney();\n/* } unlock */', B: 'std::lock_guard g1(m1);   // always m1 first\nstd::lock_guard g2(m2);   // then m2\nmoveMoney();\n/* } unlock */' },
    scoped: { A: 'std::scoped_lock g(m1, m2);  // both or none\nmoveMoney();\n/* } unlock both */', B: 'std::scoped_lock g(m2, m1);  // order does not matter\nmoveMoney();\n/* } unlock both */' }
  };
  function workOp(line) { return { line: line, txt: 'work', run: function (st, t) { st.s.done++; return { say: 'moveMoney() (holds both locks)', cls: 'ok', narr: 'holds <b>both</b> mutexes and does the transfer safely.' }; } }; }
  function unlockBoth(line) { return { line: line, txt: 'unlock', run: function (st, t) { st.s.m1 = null; st.s.m2 = null; return { say: 'unlock m1 and m2', narr: 'leaves the scope: the guards unlock both mutexes.' }; } }; }
  function dlOps(mode, t) {
    if (mode === 'scoped') return [
      { line: 1, txt: 'scoped_lock', can: function (st) { return st.s.m1 === null && st.s.m2 === null; }, waitSay: function (st) { return 'scoped_lock needs both; ' + (st.s.m1 ? 'm1 is held by ' + st.s.m1 : 'm2 is held by ' + st.s.m2) + ' (it never holds one while waiting for the other)'; },
        run: function (st, tt) { st.s.m1 = tt; st.s.m2 = tt; return { say: 'scoped_lock(m1, m2) -> got both', cls: 'ok', narr: 'locks <b>both</b> mutexes as one step. Internally std::lock tries, and if it cannot get the second it releases the first and retries, so it never sits on one key while waiting for another.' }; } },
      workOp(2), unlockBoth(3)];
    var first = (mode === 'naive' && t === 'B') ? 'm2' : 'm1', second = first === 'm1' ? 'm2' : 'm1';
    return [lockOp(1, first), lockOp(2, second), workOp(3), unlockBoth(4)];
  }
  var vizDeadlock = {
    title: 'Deadlock: two threads, two mutexes, opposite order',
    input: 'naive: A B A B',
    inputLabel: 'mode: schedule   (modes: naive | ordered | scoped)',
    gen: function (input) {
      var s = String(input || 'naive: A B A B'), mode = 'naive', rest = s;
      var mm = s.match(/^\s*([a-zA-Z]+)\s*:(.*)$/);
      if (mm) { mode = mm[1].toLowerCase(); rest = mm[2]; }
      if (!DL_CODE[mode]) throw new Error('Mode must be naive, ordered or scoped, e.g. "naive: A B A B"');
      var sched = parseSched(rest, 'A B A B');
      return interleave({
        code: DL_CODE[mode],
        ops: { A: dlOps(mode, 'A'), B: dlOps(mode, 'B') },
        shared: { m1: null, m2: null, done: 0 }, reg: {},
        cols: ['m1 owner', 'm2 owner'], colVals: function (st) { return [st.s.m1 || '-', st.s.m2 || '-']; },
        view: function (st) { return { 'm1 owner': st.s.m1 || 'nobody', 'm2 owner': st.s.m2 || 'nobody', 'transfers done': st.s.done + ' / 2' }; },
        viewHl: function (st) { return { 'm1 owner': st.s.m1 ? 'cur' : 'ok', 'm2 owner': st.s.m2 ? 'cur' : 'ok' }; },
        intro: 'Mode <b>' + mode + '</b>. Each thread needs <b>both</b> mutexes to move money between two accounts. ' + (mode === 'naive' ? 'Thread A locks m1 then m2; thread B locks m2 then m1. Try the schedule "A B A B", then "A A B B".' : mode === 'ordered' ? 'Both threads lock in the SAME global order: m1, then m2. Try any schedule you like.' : 'Both threads use <code>std::scoped_lock</code>, which acquires several mutexes with a deadlock-avoidance algorithm.'),
        deadlock: '<span class="c-r"><b>DEADLOCK.</b></span> A holds m1 and waits for m2; B holds m2 and waits for m1. Each waits for the other forever: a <b>cycle</b> in the wait-for graph. The program freezes with 0% CPU. Fixes: lock in one global order, or use <code>std::scoped_lock(m1, m2)</code>.',
        finish: function (st) { return '<span class="c-g"><b>Both transfers finished.</b></span> ' + (mode === 'naive' ? 'This schedule was lucky: one thread grabbed both locks before the other started. The deadlock is still possible on another day.' : 'With ' + (mode === 'ordered' ? 'a single global lock order' : 'scoped_lock') + ' no cycle can form, so <b>every</b> schedule completes.'); }
      }, sched);
    }
  };

  topics.push({
    title: 'Mutexes: lock_guard, unique_lock, scoped_lock & Avoiding Deadlock',
    analogy: `<p>A café has <b>one bathroom and one key</b> on a hook. Whoever takes the key goes in; everyone else waits in line. When they come out they hang the key back. That key is a <b>mutex</b> ("mutual exclusion"). A <b>lock_guard</b> is a key on a spring cord: it snaps back to the hook automatically when you leave, even if you leave in a hurry (an exception). A <b>deadlock</b> is two people who each hold one of two keys and wait for the other's key forever.</p>`,
    explain: `<p>A <b>mutex</b> protects a <b>critical section</b>: code that touches shared data. Only one thread at a time can own it. <code>m.lock()</code> waits (sleeps) until the mutex is free, then owns it; <code>m.unlock()</code> releases it. Unlocking "publishes" everything you wrote: the next thread that locks the same mutex is guaranteed to see it.</p>
      <p><b>Never call lock()/unlock() by hand.</b> If code between them throws or returns early, the mutex stays locked forever. Use an RAII guard:</p>
      ${H.table(['guard', 'use it when', 'extra powers'], [
        ['<code>std::lock_guard&lt;std::mutex&gt;</code>', 'simple scoped critical section (most of the time)', 'none: lock in ctor, unlock in dtor, tiny and fast'],
        ['<code>std::unique_lock&lt;std::mutex&gt;</code>', 'you need flexibility, or a condition_variable', '<code>unlock()</code> early / relock, <code>defer_lock</code>, <code>try_to_lock</code>, timeouts, movable'],
        ['<code>std::scoped_lock</code> (C++17)', 'you need <b>several</b> mutexes at once', 'locks all of them with a deadlock-avoidance algorithm'],
        ['<code>std::shared_lock&lt;std::shared_mutex&gt;</code>', 'many readers, rare writers', 'readers share; a writer uses unique_lock and is alone']
      ])}
      <p><b>Other mutex types:</b> <code>std::recursive_mutex</code> (same thread may lock it again, usually a design smell), <code>std::timed_mutex</code> (<code>try_lock_for(50ms)</code>), <code>std::shared_mutex</code> (reader-writer lock).</p>
      <p><b>Deadlock</b> needs four things at once (the <b>Coffman conditions</b>): mutual exclusion, <b>hold-and-wait</b> (keep one lock while waiting for another), no preemption, and a <b>circular wait</b>. Break any one and deadlock is impossible. In practice you break the cycle:</p>
      <ul><li><b>Lock ordering:</b> all code takes mutexes in one global order (e.g., by account id). No cycles can form.</li>
      <li><b>Lock everything at once:</b> <code>std::scoped_lock lk(a.m, b.m);</code></li>
      <li><b>Don't call unknown code while holding a lock</b> (callbacks, virtual functions, logging that might lock) since it may take locks you don't know about.</li>
      <li><b>Keep critical sections tiny:</b> copy the data out under the lock, do slow work (I/O, allocation, computing) outside.</li></ul>
      <p><b>Golden rule of encapsulation:</b> the mutex and the data it guards live together in one class, and you never hand out a pointer or reference to the guarded data (otherwise callers touch it without the lock).</p>`,
    clues: ['"thread-safe class" / "make this cache safe for concurrent use" → private mutex + lock_guard in every member function', '"transfer between two accounts" / "lock two objects" → <code>std::scoped_lock</code> or global lock order (deadlock!)', '"program freezes, CPU at 0%" → deadlock: look for two locks taken in opposite orders', '"many reads, few writes" → <code>std::shared_mutex</code> + <code>shared_lock</code> / <code>unique_lock</code>', '"needs to unlock before waiting" / "used with condition_variable" → <code>std::unique_lock</code>', '"exception thrown while holding the lock" → RAII guard, never manual unlock'],
    code: [R`
      #include <bits/stdc++.h>
      using namespace std;

      // The mutex lives next to the data it protects. Every public method locks it.
      class ThreadSafeCounter {
          mutable mutex m;          // mutable: so const methods (get) can lock it too
          long long value = 0;
      public:
          void add(long long d) {
              lock_guard<mutex> g(m);           // lock now, unlock at the closing brace
              value += d;
          }
          long long get() const {
              lock_guard<mutex> g(m);
              return value;                     // copy out while locked
          }
      };

      int main() {
          ThreadSafeCounter c;
          vector<jthread> pool;
          for (int t = 0; t < 4; ++t)
              pool.emplace_back([&c] { for (int i = 0; i < 1000; ++i) c.add(1); });
          pool.clear();                          // jthread destructors join here
          cout << c.get() << "\n";               // 4000
      }`, R`
      #include <bits/stdc++.h>
      using namespace std;

      mutex mtx;
      vector<string> logLines;

      void appendLog(const string& raw) {
          string formatted = "[" + to_string(raw.size()) + "] " + raw;   // slow work OUTSIDE the lock

          unique_lock<mutex> lk(mtx);            // locks now
          logLines.push_back(formatted);
          size_t n = logLines.size();
          lk.unlock();                           // release early: the rest does not touch logLines

          if (n % 1000 == 0) cout << "flushed " << n << "\n";
      }                                          // dtor: does nothing, we no longer own the lock

      bool tryQuickUpdate() {
          unique_lock<mutex> lk(mtx, try_to_lock);   // do not wait if busy
          if (!lk.owns_lock()) return false;         // someone else has it: skip this round
          logLines.emplace_back("quick");
          return true;
      }

      int main() { appendLog("hello"); cout << tryQuickUpdate() << "\n"; }`],
    codeTitle: ['A thread-safe class with lock_guard', 'unique_lock: unlock early and try_to_lock'],
    viz: [vizMutex, vizDeadlock],
    examples: [
      { title: 'Reader-writer cache with shared_mutex', html: `<p>Lookups are frequent and only read, so many threads may hold a <code>shared_lock</code> at the same time. An update takes a <code>unique_lock</code> and waits until all readers have left. Good when reads dominate heavily; with balanced read/write traffic a plain mutex is often faster (shared_mutex has more bookkeeping).</p>`, code: R`
        class Config {
            mutable std::shared_mutex rw;
            std::map<std::string, std::string> kv;
        public:
            std::optional<std::string> get(const std::string& k) const {
                std::shared_lock lk(rw);                 // many readers at once
                auto it = kv.find(k);
                if (it == kv.end()) return std::nullopt;
                return it->second;                       // return a COPY, never a reference
            }
            void set(const std::string& k, std::string v) {
                std::unique_lock lk(rw);                 // writer: exclusive
                kv[k] = std::move(v);
            }
        };` },
      { title: 'Leaking a reference defeats the lock', html: `<p><code>items()</code> locks, returns a reference, then unlocks when it returns. The caller then iterates the vector with <b>no lock</b> while another thread calls <code>add()</code> and reallocates it: data race, dangling iterators. Fix: return a copy, or take a callback and run it under the lock (carefully).</p>`, code: R`
        class Bag {
            std::mutex m;
            std::vector<int> v;
        public:
            void add(int x) { std::lock_guard g(m); v.push_back(x); }
            const std::vector<int>& itemsBAD() { std::lock_guard g(m); return v; }   // BUG: escapes the lock
            std::vector<int> itemsGood() { std::lock_guard g(m); return v; }         // snapshot copy
        };` },
      { title: 'std::lock with defer_lock (pre-C++17 style)', html: `<p>Before <code>scoped_lock</code> existed, you created two <code>unique_lock</code>s that don't lock yet (<code>defer_lock</code>), then called <code>std::lock(a, b)</code>, which locks both without deadlock. You'll see this in older codebases and interviews.</p>`, code: R`
        struct Account { std::mutex m; long long balance = 0; };
        void transfer(Account& from, Account& to, long long amt) {
            if (&from == &to) return;                          // locking the same mutex twice = UB
            std::unique_lock<std::mutex> l1(from.m, std::defer_lock);
            std::unique_lock<std::mutex> l2(to.m, std::defer_lock);
            std::lock(l1, l2);                                  // both, deadlock-free
            from.balance -= amt;
            to.balance += amt;
        }` },
      { title: 'Lock granularity: one big lock vs striped locks', html: `<p>One mutex for a whole hash map is simple but makes all threads queue. <b>Lock striping</b> uses, say, 16 mutexes and picks one by <code>hash(key) % 16</code>, so threads touching different stripes run in parallel. Java's old ConcurrentHashMap did this. More locks means more parallelism but also harder multi-key operations (you must lock stripes in index order).</p>`, code: R`
        class StripedMap {
            static constexpr size_t N = 16;
            std::array<std::mutex, N> locks;
            std::array<std::unordered_map<int, int>, N> shards;
            size_t idx(int key) const { return std::hash<int>{}(key) % N; }
        public:
            void put(int k, int v) { size_t i = idx(k); std::lock_guard g(locks[i]); shards[i][k] = v; }
            std::optional<int> get(int k) {
                size_t i = idx(k); std::lock_guard g(locks[i]);
                auto it = shards[i].find(k);
                return it == shards[i].end() ? std::nullopt : std::optional<int>(it->second);
            }
        };` }
    ],
    deepDive: `<p><b>How a mutex really works (Linux).</b> <code>std::mutex</code> sits on a <b>futex</b> ("fast userspace mutex"): one atomic integer. Uncontended lock = one atomic compare-and-swap in user space (≈ 15–25 ns, no system call). If it's taken, the thread may spin briefly, then calls <code>futex_wait</code> and the kernel puts it to sleep; unlock does an atomic store and, only if someone is sleeping, <code>futex_wake</code>. So mutexes are cheap when uncontended and expensive (microseconds, context switches) when contended. <b>Contention, not locking, is the cost.</b></p>
      <p><b>Fairness is not guaranteed.</b> A thread that unlocks and immediately relocks often wins again (it's hot in cache), so others can starve. <b>Priority inversion:</b> a low-priority thread holds a lock that a high-priority thread needs while medium-priority threads hog the CPU (the Mars Pathfinder bug). Real-time systems use priority-inheritance mutexes.</p>
      <p><b>How std::lock / scoped_lock avoid deadlock:</b> lock the first mutex, <code>try_lock</code> the others; if one fails, release everything, then retry starting with the one that failed. It never <i>holds</i> while <i>blocking</i>, which breaks hold-and-wait. Lock-ordering instead breaks circular wait and has no retries, so large systems often enforce a <b>lock hierarchy</b> (each mutex has a level; you may only lock lower levels while holding higher ones), checked at runtime in debug builds.</p>
      <p><b>Deadlock vs livelock vs starvation.</b> Deadlock: everyone sleeps forever. Livelock: everyone is busy retrying and backing off in sync, no progress (two people stepping aside in a corridor). Starvation: the system progresses but one thread never gets its turn.</p>
      <p><b>Static checking.</b> Clang's Thread Safety Analysis (<code>-Wthread-safety</code> with annotations like <code>GUARDED_BY(mu)</code>, <code>REQUIRES(mu)</code>) catches "accessed without the lock" at compile time. Google's Abseil <code>absl::Mutex</code> uses these annotations everywhere and also has built-in deadlock detection in debug mode.</p>
      <p><b>Don't lock the same std::mutex twice</b> in one thread: it's undefined behaviour (usually a self-deadlock). If you "need" recursion, restructure into a public locking function that calls a private <code>*_locked</code> helper that assumes the lock is held.</p>`,
    aiEra: `<p><b>What AI changes:</b> generating a thread-safe wrapper class or converting manual lock/unlock to RAII guards is instant. Assistants are good at spotting a missing guard in a member function.</p>
      <p><b>Use AI as a partner:</b> ask <code>"Draw the lock-acquisition graph of this module: which functions lock which mutexes, in what order, and which call each other while holding a lock?"</code>. Cycles in that graph are your potential deadlocks. Ask it to add Clang thread-safety annotations so the compiler enforces the design.</p>
      <p><b>Where AI goes wrong:</b> it puts slow I/O or callbacks inside critical sections, returns references to guarded members, picks <code>recursive_mutex</code> to "fix" a self-deadlock, or suggests <code>shared_mutex</code> everywhere even for tiny write-heavy sections where it's slower.</p>
      <p><b>What you must still own:</b> deciding which invariant each mutex protects, the global lock order, and critical-section size. These are design decisions that need the whole picture of the system, and you'll be asked to defend them in a design interview.</p>`,
    problems: [{
      title: 'Thread-Safe Bank Transfer (No Deadlock)',
      level: 'Medium', tags: ['mutex', 'scoped_lock', 'deadlock', 'lock ordering'], companies: ['Goldman Sachs', 'Bloomberg', 'Citadel'],
      statement: `<p>Each <code>Account</code> has its own <code>std::mutex</code>. Implement <code>bool transfer(Account&amp; from, Account&amp; to, long long amt)</code> that moves money only if <code>from</code> has enough, is safe when called concurrently from many threads in any directions (including A→B and B→A at the same time), and never deadlocks. Money must never be created or destroyed: the total over all accounts stays constant.</p>`,
      constraints: `Up to 10<sup>4</sup> accounts, 32 threads, 10<sup>6</sup> transfers; a transfer to the same account must be handled.`,
      example: `<p>Accounts A = 100, B = 50. Thread 1: transfer(A, B, 30). Thread 2: transfer(B, A, 70), both at once.</p>${H.table(['order', 'result'], [['T1 first', 'A=70, B=80 → T2 ok → A=140, B=10'], ['T2 first', 'B=50 &lt; 70 → T2 fails; T1 → A=70, B=80']])}<p>Either outcome is fine; ${H.c('g', 'total is always 150')} and ${H.c('r', 'the program must never hang')}.</p>`,
      brute: { why: `<p>Locking <code>from</code> then <code>to</code> looks natural but T1 locks A then waits for B, while T2 locks B then waits for A: circular wait, <b>deadlock</b>. Also <code>transfer(A, A, x)</code> locks the same mutex twice, which is undefined behaviour.</p>`, code: R`
        struct Account { std::mutex m; long long balance = 0; };
        bool transferBAD(Account& from, Account& to, long long amt) {
            std::lock_guard<std::mutex> g1(from.m);   // T1: A   | T2: B
            std::lock_guard<std::mutex> g2(to.m);     // T1 waits B, T2 waits A -> deadlock
            if (from.balance < amt) return false;
            from.balance -= amt;
            to.balance += amt;
            return true;
        }` },
      mcq: { q: 'T1 runs transfer(A,B) and T2 runs transfer(B,A). Which change GUARANTEES no deadlock?', options: ['Add a sleep between the two locks', 'Lock both with std::scoped_lock(from.m, to.m)', 'Use recursive_mutex', 'Lock to.m first instead of from.m'], answer: 1, explain: 'scoped_lock uses std::lock\'s deadlock-avoidance algorithm (never holds one while blocking on another). Swapping the order just moves the cycle; sleeping only hides it; recursive_mutex is about re-locking in the SAME thread.' },
      hints: [`<p><b>Aha:</b> deadlock needs a cycle. Two threads taking the same two locks in opposite orders is the textbook cycle.</p>`, `<p>Either acquire both atomically with <code>std::scoped_lock</code>, or always lock the account with the smaller id (or address) first.</p>`, `<p>Edge case: <code>&amp;from == &amp;to</code> → return early (locking one mutex twice is UB). Check the balance <b>after</b> locking, never before (check-then-act). Recipe: same-account check → lock both → check balance → move → unlock by scope exit.</p>`],
      solution: {
        approach: `<p>Use <code>std::scoped_lock lk(from.m, to.m)</code>: it acquires both mutexes as one unit with a try-and-back-off algorithm, so no circular wait can form regardless of argument order. Do the balance check <i>inside</i> the critical section so the decision and the update are one atomic unit. The alternative (shown in comments) is <b>global lock ordering</b> by account id, which is cheaper and avoids retries but requires a total order on every lock in the system.</p>`,
        code: R`
          #include <bits/stdc++.h>
          using namespace std;

          struct Account {
              int id;
              mutex m;
              long long balance;
              Account(int i, long long b) : id(i), balance(b) {}
          };

          bool transfer(Account& from, Account& to, long long amt) {
              if (&from == &to) return true;              // same account: nothing to move, and avoid double-lock UB
              scoped_lock lk(from.m, to.m);               // both or none: deadlock-free
              if (from.balance < amt) return false;       // check INSIDE the lock (no check-then-act gap)
              from.balance -= amt;
              to.balance += amt;
              return true;
          }

          // Alternative: global lock order by id (no retries, but every caller must follow it)
          bool transferOrdered(Account& from, Account& to, long long amt) {
              if (&from == &to) return true;
              Account& first  = from.id < to.id ? from : to;
              Account& second = from.id < to.id ? to : from;
              lock_guard<mutex> g1(first.m);
              lock_guard<mutex> g2(second.m);
              if (from.balance < amt) return false;
              from.balance -= amt;
              to.balance += amt;
              return true;
          }

          int main() {
              Account a(1, 100), b(2, 50);
              {
                  jthread t1([&] { for (int i = 0; i < 100000; ++i) transfer(a, b, 1); });
                  jthread t2([&] { for (int i = 0; i < 100000; ++i) transfer(b, a, 1); });
              }                                            // both joined here
              scoped_lock lk(a.m, b.m);
              cout << a.balance + b.balance << "\n";       // always 150
          }`,
        dry: { head: ['step', 'T1: transfer(A,B,30)', 'T2: transfer(B,A,70)', 'A', 'B'], rows: [['1', 'scoped_lock(A,B): gets A, try B ok', '', '100', '50'], ['2', '', 'scoped_lock(B,A): try B busy, waits (holds nothing)', '100', '50'], ['3', 'balance 100 ≥ 30 → A-=30, B+=30', '', '70', '80'], ['4', 'unlock both', 'gets B, gets A', '70', '80'], ['5', '', 'balance 80 ≥ 70 → B-=70, A+=70', '140', '10']] },
        complexity: `<p>O(1) per transfer plus lock cost (~20 ns uncontended, microseconds when contended). No deadlock in any interleaving; total money invariant preserved because every read-modify-write happens under both locks.</p>`,
        followUps: ['How would you do a consistent "sum of all balances" snapshot without stopping the world?', 'Transfer among 3 accounts atomically?', 'Why can a try_lock-and-back-off scheme livelock, and how does random backoff help?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 4 — condition_variable, producer-consumer
     ====================================================================== */
  var CV_CODE = {
    whileC: 'std::unique_lock lk(m);\nnotEmpty.wait(lk, [&] { return !buf.empty(); });   // loops!\nint item = buf.front(); buf.pop();\nlk.unlock();\nnotFull.notify_one();',
    ifC: 'std::unique_lock lk(m);\nif (buf.empty()) notEmpty.wait(lk);   // BUG: if, not while\nint item = buf.front(); buf.pop();\nlk.unlock();\nnotFull.notify_one();',
    whileP: 'std::unique_lock lk(m);\nnotFull.wait(lk, [&] { return buf.size() < CAP; });\nbuf.push(item);\nlk.unlock();\nnotEmpty.notify_one();',
    ifP: 'std::unique_lock lk(m);\nif (buf.size() == CAP) notFull.wait(lk);   // BUG: if\nbuf.push(item);\nlk.unlock();\nnotEmpty.notify_one();'
  };
  var vizCV = {
    title: 'Producer-consumer: wait() and notify_one() on a bounded buffer',
    input: 'C1 P C2 C1 P P P C1 C2 P',
    inputLabel: 'Who runs next: P, C1, C2 (prefix "if:" to see the if-instead-of-while bug)',
    gen: function (input) {
      var s = String(input === undefined || input === null ? 'C1 P C2 C1 P P P C1 C2 P' : input).trim(), mode = 'while';
      var mm = s.match(/^\s*(if|while)\s*:(.*)$/i);
      if (mm) { mode = mm[1].toLowerCase(); s = mm[2]; }
      var toks = s.toUpperCase().split(/[\s,]+/).filter(Boolean).map(function (x) { return x === 'C' ? 'C1' : x; });
      if (!toks.length || toks.some(function (x) { return ['P', 'C1', 'C2'].indexOf(x) < 0; })) throw new Error('Use the tokens P, C1, C2 separated by spaces, e.g. "C1 P C2 C1" (optional prefix "if:")');
      if (toks.length > 30) throw new Error('Use at most 30 steps');
      var CAP = 2, buf = [], nextItem = 1, state = { P: 'ready', C1: 'ready', C2: 'ready' }, notEmptyQ = [], notFullQ = [], log = [], eaten = [], frames = [];
      function frame(narr, actor, line, cls, owner) {
        var hl = {}; if (log.length) hl[log.length - 1] = cls;
        var lh = {}; if (line) lh[line] = cls === 'bad' ? 'bad' : cls === 'ok' ? 'ok' : 'cur';
        var isP = actor === 'P', codeKey = (mode === 'if' ? 'if' : 'while') + (isP ? 'P' : 'C');
        var bh = {}; if (cls === 'ok' && buf.length && isP) bh[buf.length - 1] = 'ok';
        frames.push({ narr: narr, parts: [
          { type: 'queue', label: 'Shared buffer (capacity ' + CAP + ')', items: buf.slice(), hl: bh, frontLabel: 'pop', backLabel: 'push' },
          { type: 'queue', label: 'Sleeping on notEmpty (consumers waiting for data)', items: notEmptyQ.slice(), frontLabel: 'woken first', backLabel: 'joins' },
          { type: 'queue', label: 'Sleeping on notFull (producers waiting for space)', items: notFullQ.slice(), frontLabel: 'woken first', backLabel: 'joins' },
          { type: 'vars', label: 'Mutex and thread states', vals: { 'm owner': owner || 'nobody', P: state.P, C1: state.C1, C2: state.C2, 'consumed so far': eaten.length ? eaten.join(', ') : 'none' }, hl: { 'm owner': owner ? 'cur' : 'ok' } },
          { type: 'code', label: actor ? (isP ? 'Producer code (' + actor + ')' : 'Consumer code (' + actor + ')') : 'Consumer code', lang: 'cpp', code: CV_CODE[codeKey], hl: lh },
          { type: 'table', label: 'Event log', columns: ['#', 'thread', 'what happened', 'buffer after'], rows: clone(log), hl: hl }
        ] });
      }
      function add(actor, what) { log.push([String(log.length + 1), actor, what, '[' + buf.join(', ') + ']']); }
      function wake(q, who) {
        if (!q.length) return ' notify_one(): nobody is sleeping, so the notification does nothing (that is fine).';
        var w = q.shift(); state[w] = 'woken (needs m)';
        return ' notify_one() wakes <b>' + w + '</b>. It does not run yet: it must first re-lock m, then re-check the condition.';
      }
      frame('Mode <b>' + mode + '</b>. One producer P and two consumers C1, C2 share a buffer of capacity 2, one mutex <code>m</code> and two condition variables. Each token in your input lets that thread try <b>one</b> operation. Sleeping threads cannot run until someone notifies them.', null, 0, 'cur', null);
      for (var i = 0; i < toks.length; i++) {
        var X = toks[i], isP = X === 'P';
        if (state[X] === 'waiting') {
          add(X, 'asleep on the cv: not runnable, skipped');
          frame('<b>' + X + '</b> is asleep inside <code>wait()</code>. A sleeping thread uses no CPU and is not runnable until a notify (or a spurious wakeup) moves it. Nothing happens.', X, 2, 'win', null);
          continue;
        }
        var woken = state[X].indexOf('woken') === 0, pre = woken ? 'wakes up, re-locks m and ' : 'locks m and ';
        var blocked = isP ? buf.length >= CAP : buf.length === 0;
        if (blocked && woken && mode === 'if') {
          add(X, isP ? 'skips re-check, pushes into a FULL buffer' : 'skips re-check, pops from an EMPTY buffer');
          frame('<span class="c-r"><b>' + X + ' crashes.</b></span> It ' + pre + 'does <b>not</b> re-check (because of <code>if</code>). ' + (isP ? 'The buffer is full again, so it overflows the capacity.' : 'Someone else already took the item ("stolen wakeup"), so <code>buf.front()</code> on an empty queue is <b>undefined behaviour</b>.') + ' Always wait in a loop / with a predicate.', X, 3, 'bad', X);
          return frames;
        }
        if (blocked) {
          (isP ? notFullQ : notEmptyQ).push(X); state[X] = 'waiting';
          add(X, (woken ? 're-checks: still ' : 'sees buffer ') + (isP ? 'full' : 'empty') + ' → wait() (unlocks m, sleeps)');
          frame('<b>' + X + '</b> ' + pre + 'checks the predicate: the buffer is <b>' + (isP ? 'full' : 'empty') + '</b>' + (woken ? ' again (another thread got there first, or the wakeup was spurious)' : '') + '. <code>wait()</code> <b>atomically</b> unlocks m and puts ' + X + ' to sleep in the ' + (isP ? 'notFull' : 'notEmpty') + ' queue. Unlocking is essential: otherwise nobody else could ever change the buffer.', X, 2, 'win', null);
          continue;
        }
        var what, extra;
        if (isP) { var it = nextItem++; buf.push(it); what = 'pushes item ' + it; extra = wake(notEmptyQ); }
        else { var got = buf.shift(); eaten.push(got + ' by ' + X); what = 'pops item ' + got; extra = wake(notFullQ); }
        state[X] = 'ready';
        add(X, (woken ? 're-checks ok, ' : '') + what);
        frame('<b>' + X + '</b> ' + pre + (woken ? 're-checks: the condition is true now, so it continues. ' : 'the condition already holds, so it does not wait. ') + 'It ' + what + ', then unlocks m.' + extra, X, isP ? 3 : 3, 'ok', X);
      }
      frame('Done. Items consumed: <b>' + (eaten.length ? eaten.join(', ') : 'none') + '</b>. Notice the pattern: <b>wait with a predicate</b> (re-checked after every wakeup), <b>change the state under the mutex</b>, then <b>notify</b>. Try the prefix <code>if:</code> with "C1 P C2 C1" to watch the if-instead-of-while crash.', null, 0, 'cur', null);
      return frames;
    }
  };

  topics.push({
    title: 'condition_variable: Sleeping Until Something Changes (Producer-Consumer)',
    analogy: `<p>At a busy burger place you don't stand at the counter asking "is my order ready? is it ready now?" every second (that's <b>busy-waiting</b>, wasting everyone's time). You take a <b>buzzer</b> and sit down. When the kitchen puts your burger on the counter it <b>buzzes</b> you. You walk up and <b>check the tray</b>: if someone else grabbed it by mistake, you sit down and wait again. The buzzer is the <b>condition_variable</b>, the counter is the shared data, and "check the tray again" is the <b>predicate loop</b>.</p>`,
    explain: `<p>A <code>std::condition_variable</code> lets a thread <b>sleep until another thread says "something changed"</b>, using zero CPU while it waits. It always works together with a <b>mutex</b> and a <b>condition</b> (a predicate on shared data, such as "queue not empty").</p>
      <p><b>The waiting side</b> (needs a <code>unique_lock</code>, because wait must unlock and relock it):</p>
      <pre>std::unique_lock lk(m);
cv.wait(lk, [&amp;] { return !q.empty(); });   // sleeps until the predicate is true
// here: m is locked AND the predicate is true</pre>
      <p><code>wait(lk, pred)</code> is exactly <code>while (!pred()) wait(lk);</code>. Each <code>wait(lk)</code> <b>atomically</b> unlocks m and goes to sleep; when woken, it <b>re-locks m</b> before returning. The predicate is checked under the lock, so it reads shared data safely.</p>
      <p><b>The notifying side:</b> change the shared data <b>while holding the mutex</b>, then call <code>cv.notify_one()</code> (wake one waiter) or <code>cv.notify_all()</code> (wake all of them, e.g. for shutdown).</p>
      ${H.table(['rule', 'why'], [
        ['Always wait with a <b>predicate</b> (or a while loop)', '<b>spurious wakeups</b>: wait may return with nobody notifying; <b>stolen wakeups</b>: another thread consumed the item first'],
        ['Modify the condition <b>under the same mutex</b>', 'otherwise the waiter can check "empty", you push + notify, and then it goes to sleep: a <b>lost wakeup</b>, sleeping forever'],
        ['Use <code>notify_one</code> when any single waiter can handle the event', 'avoids waking a "thundering herd" that all fight for the mutex'],
        ['Use <code>notify_all</code> when the state change matters to everyone', 'shutdown flags, "phase finished", several kinds of waiters on one cv'],
        ['A cv has no memory', 'a notify with no waiters is simply lost, which is why the <b>predicate (state)</b> is the source of truth, not the notify']
      ])}
      <p><b>Producer-consumer</b> is the classic use: producers push work into a shared queue, consumers pop it. With a <b>bounded</b> queue you need two conditions: consumers wait for "not empty", producers wait for "not full". This gives <b>back-pressure</b>: fast producers are slowed to the consumers' speed instead of eating all memory.</p>
      <p><b>Timeouts:</b> <code>cv.wait_for(lk, 200ms, pred)</code> returns <code>false</code> if time ran out and the predicate is still false. <b>C++20</b> adds lighter tools for simple cases: <code>std::counting_semaphore</code>, <code>std::latch</code> (one-shot countdown), <code>std::barrier</code> (reusable phase sync), and <code>atomic::wait/notify</code>.</p>`,
    clues: ['"producer-consumer" / "work queue" / "blocking queue" → mutex + condition_variable (two cvs if bounded)', '"wait until X is ready without busy-waiting / burning CPU" → condition_variable or C++20 latch/semaphore', '"print odd/even alternately", "FooBar", "ping-pong between threads" → shared turn variable + cv with predicate', '"spurious wakeup" / "lost wakeup" / "if vs while" → always wait with a predicate, modify state under the lock', '"graceful shutdown of worker threads" → a <code>closed</code> flag + <code>notify_all</code>', '"bounded buffer" / "back-pressure" → second cv for not-full'],
    code: [R`
      #include <bits/stdc++.h>
      using namespace std;

      // Unbounded MPMC (multi-producer multi-consumer) blocking queue with shutdown.
      template <class T>
      class BlockingQueue {
          mutex m;
          condition_variable notEmpty;
          deque<T> q;
          bool closed = false;
      public:
          void push(T v) {
              {
                  lock_guard<mutex> g(m);            // change the state UNDER the mutex
                  q.push_back(std::move(v));
              }
              notEmpty.notify_one();                 // notify after unlocking (slightly cheaper)
          }
          // returns nullopt only when the queue is closed AND drained
          optional<T> pop() {
              unique_lock<mutex> lk(m);              // unique_lock: wait() must unlock/relock it
              notEmpty.wait(lk, [&] { return !q.empty() || closed; });   // predicate handles spurious wakeups
              if (q.empty()) return nullopt;         // closed and nothing left
              T v = std::move(q.front());
              q.pop_front();
              return v;
          }
          void close() {
              { lock_guard<mutex> g(m); closed = true; }
              notEmpty.notify_all();                 // EVERY waiter must see the shutdown
          }
      };

      int main() {
          BlockingQueue<int> jobs;
          atomic<long long> sum{0};
          vector<jthread> workers;
          for (int w = 0; w < 3; ++w)
              workers.emplace_back([&] { while (auto j = jobs.pop()) sum += *j; });
          for (int i = 1; i <= 100; ++i) jobs.push(i);
          jobs.close();
          workers.clear();                           // join all
          cout << sum << "\n";                       // 5050
      }`],
    codeTitle: ['A blocking queue with condition_variable and clean shutdown'],
    viz: vizCV,
    examples: [
      { title: 'One-shot "I am ready" signal', html: `<p>Main must not use the database until the worker finished connecting. The flag is the truth; the cv just avoids polling. Because <code>ready</code> is written and read under the mutex, there's no data race and no lost wakeup, even if the worker finishes before main starts waiting (the predicate is already true, so wait returns immediately).</p>`, code: R`
        std::mutex m;
        std::condition_variable cv;
        bool ready = false;

        int main() {
            std::thread worker([] {
                /* connect to the database ... */
                { std::lock_guard g(m); ready = true; }
                cv.notify_one();
            });
            std::unique_lock lk(m);
            cv.wait(lk, [] { return ready; });     // returns at once if already ready
            std::cout << "worker is ready\n";
            lk.unlock();
            worker.join();
        }` },
      { title: 'The lost wakeup bug', html: `<p>The setter changes <code>flagSet</code> <b>without</b> the mutex. Timeline: the waiter locks, checks <code>flagSet</code> (false)... the setter writes true and notifies (no one is sleeping yet, so it's lost)... the waiter now calls wait and sleeps <b>forever</b>. It's also a data race on <code>flagSet</code>. Fix: set the flag under the mutex (an atomic flag alone is not enough to close this window).</p>`, code: R`
        std::mutex mx;
        std::condition_variable cv2;
        bool flagSet = false;
        void setterBAD()  { flagSet = true; cv2.notify_one(); }                 // no lock: can be lost
        void setterGood() { { std::lock_guard g(mx); flagSet = true; } cv2.notify_one(); }
        void waiter() {
            std::unique_lock lk(mx);
            cv2.wait(lk, [] { return flagSet; });
        }` },
      { title: 'Alternate odd/even printing with one cv', html: `<p>Two threads must print 1..10 in order: one prints odds, the other evens. A shared <code>turn</code> number plus <code>wait(pred)</code> makes each thread sleep until it's its turn. Use <code>notify_all</code> or <code>notify_one</code>: with exactly two threads and one waiting, both are fine.</p>`, code: R`
        int main() {
            std::mutex m; std::condition_variable cv; int turn = 1; const int N = 10;
            auto run = [&](int parity) {
                while (true) {
                    std::unique_lock lk(m);
                    cv.wait(lk, [&] { return turn > N || turn % 2 == parity; });
                    if (turn > N) return;
                    std::cout << turn << ' ';
                    ++turn;
                    cv.notify_all();
                }
            };
            std::thread odd(run, 1), even(run, 0);
            odd.join(); even.join();                   // prints 1 2 3 ... 10
        }` },
      { title: 'C++20: latch and counting_semaphore', html: `<p><code>std::latch</code> is a one-time countdown: "start the race when all 4 runners are on the line". <code>std::counting_semaphore&lt;N&gt;</code> limits how many threads may enter at once (e.g. max 3 concurrent downloads). They have no "predicate loop" footguns, so prefer them when they fit.</p>`, code: R`
        int main() {
            std::latch allReady(4);
            std::counting_semaphore<3> slots(3);          // at most 3 inside at once
            std::vector<std::jthread> ts;
            for (int i = 0; i < 4; ++i)
                ts.emplace_back([&, i] {
                    allReady.arrive_and_wait();           // everyone starts together
                    slots.acquire();                      // take a slot (blocks if 3 are busy)
                    std::cout << ("download " + std::to_string(i) + "\n");
                    slots.release();
                });
        }` }
    ],
    deepDive: `<p><b>Why "atomically unlock and sleep" matters.</b> If wait did <code>unlock(); sleep();</code> as two separate steps, a notify could land between them and be lost. The implementation (pthread_cond_wait over futexes on Linux) registers the thread as a waiter <i>before</i> releasing the mutex, so any notify after the unlock is seen.</p>
      <p><b>Spurious wakeups are real.</b> POSIX and the C++ standard explicitly allow wait to return without a notify (signals interrupting the futex syscall, implementation simplicity on multiprocessors). There are also <b>stolen wakeups</b>: you were notified, but between the notify and your re-lock another thread took the item. One rule handles both: <b>re-check the predicate in a loop</b>, which the predicate overload does for you.</p>
      <p><b>Notify inside or outside the lock?</b> Both are correct if the state was changed under the lock. Notifying after unlocking avoids "hurry up and wait" (the woken thread immediately blocks on the mutex you still hold). Notifying under the lock is required when the cv itself might be destroyed right after the waiter wakes up (e.g. a stack-allocated cv in a one-shot handshake), and some schedulers handle it efficiently with <i>wait morphing</i>.</p>
      <p><b>notify_all and the thundering herd.</b> Waking 64 consumers for one item makes 63 of them grab the mutex, find nothing, and sleep again: lots of context switches. Use notify_one for "one item available"; use notify_all for broadcasts (shutdown, phase changes) or when different waiters wait for different predicates on the same cv.</p>
      <p><b>Cancellation in C++20.</b> <code>std::condition_variable_any</code> has <code>wait(lk, stop_token, pred)</code>, which also wakes up when a <code>jthread</code> is asked to stop. That gives clean shutdown without a manual closed flag.</p>
      <p><b>Performance.</b> A cv handoff (notify → other thread running) costs a few microseconds because it involves the kernel scheduler. For extreme low latency (trading, audio), people use lock-free SPSC ring buffers with spinning or <code>atomic::wait</code>, trading CPU for latency. For normal servers, a mutex+cv queue handling ~10<sup>5</sup>–10<sup>6</sup> items/s is plenty.</p>`,
    aiEra: `<p><b>What AI changes:</b> "write me a thread-safe blocking queue" is now a one-line prompt, and the result is usually close. The skill that matters shifts from typing the pattern to <b>reviewing</b> it in seconds.</p>
      <p><b>Use AI as a partner:</b> paste your queue and ask <code>"Find any path where a notify can be lost, a waiter can sleep forever after close(), or pop can run on an empty queue"</code>. Ask it to generate a stress test with random sleeps, more consumers than producers, and a shutdown in the middle.</p>
      <p><b>Where AI goes wrong:</b> classic slips are <code>if</code> instead of <code>while</code>, setting the flag outside the mutex, using <code>notify_one</code> for shutdown (only one worker exits, the rest hang), forgetting to wake producers blocked on "not full" during close, and holding the lock while running the job.</p>
      <p><b>What you must still own:</b> knowing the three rules (predicate loop, state under mutex, right notify), reasoning about shutdown and back-pressure, and choosing between cv, semaphore, latch and lock-free queues for the latency you need.</p>`,
    problems: [{
      title: 'Bounded Blocking Queue (Producer-Consumer)',
      level: 'Medium', tags: ['condition_variable', 'producer-consumer', 'mutex'], companies: ['Amazon', 'Microsoft', 'Uber', 'LinkedIn'],
      statement: `<p>Implement <code>BoundedQueue&lt;T&gt;</code> with capacity C: <code>push(x)</code> blocks while the queue is full, <code>pop()</code> blocks while it is empty, and <code>size()</code> returns the current size. It must work with any number of producer and consumer threads (LeetCode 1188 "Design Bounded Blocking Queue").</p>`,
      constraints: `1 ≤ C ≤ 10<sup>4</sup>; up to 16 producers and 16 consumers; no busy-waiting.`,
      example: `<p>C = 2. Producer pushes 1, 2, 3; consumer pops slowly.</p>${H.table(['event', 'queue', 'who sleeps'], [['push 1', '[1]', '-'], ['push 2', '[1, 2]', '-'], ['push 3', '[1, 2] (full)', '<span class="c-y">producer on notFull</span>'], ['pop → 1', '[2]', 'producer woken'], ['push 3 (retry)', '[2, 3]', '-']])}`,
      brute: { why: `<p>Busy-waiting: spin until there is room / an item, releasing and re-taking the lock in a tight loop. It's correct but burns a full CPU core per waiting thread and steals cycles from the very threads that would make progress.</p>`, code: R`
        template <class T>
        class SpinQueue {
            std::mutex m; std::deque<T> q; size_t cap;
        public:
            explicit SpinQueue(size_t c) : cap(c) {}
            void push(T x) {
                while (true) {
                    std::lock_guard g(m);
                    if (q.size() < cap) { q.push_back(std::move(x)); return; }
                }                                           // spins at 100% CPU while full
            }
            T pop() {
                while (true) {
                    std::lock_guard g(m);
                    if (!q.empty()) { T v = std::move(q.front()); q.pop_front(); return v; }
                }
            }
        };` },
      mcq: { q: 'Why do we need TWO condition variables (notEmpty and notFull) here?', options: ['One cv cannot be waited on by two threads', 'Producers and consumers wait for different conditions; with one cv a notify_one might wake the wrong kind of thread and the right one sleeps forever', 'condition_variable has a maximum of 1 waiter', 'It makes the queue lock-free'], answer: 1, explain: 'With a single cv, a consumer\'s notify_one could wake another consumer instead of the waiting producer. You can survive with one cv only by always using notify_all (slower). Two cvs make notify_one always target the right group.' },
      hints: [`<p><b>Aha:</b> "full" and "empty" are two different reasons to sleep, so give each its own condition_variable.</p>`, `<p>push: <code>notFull.wait(lk, [&amp;]{ return q.size() &lt; cap; })</code>, push, <code>notEmpty.notify_one()</code>. pop is the mirror image.</p>`, `<p>Always use the predicate overload (spurious + stolen wakeups). Mutate the deque under the lock. Make <code>size()</code> lock too. Recipe: lock → wait(pred) → modify → unlock → notify the other side.</p>`],
      solution: {
        approach: `<p>One mutex guards the deque. Two condition variables: consumers sleep on <b>notEmpty</b>, producers sleep on <b>notFull</b>. Each operation: lock → wait until its predicate holds → modify → unlock → notify_one the <i>other</i> side. Predicates make spurious and stolen wakeups harmless. Notifying after unlocking avoids waking a thread straight into a held lock.</p>`,
        code: R`
          #include <bits/stdc++.h>
          using namespace std;

          template <class T>
          class BoundedQueue {
              mutable mutex m;
              condition_variable notEmpty, notFull;
              deque<T> q;
              const size_t cap;
          public:
              explicit BoundedQueue(size_t capacity) : cap(capacity) {}

              void push(T x) {
                  unique_lock<mutex> lk(m);
                  notFull.wait(lk, [&] { return q.size() < cap; });   // sleep while full
                  q.push_back(std::move(x));
                  lk.unlock();
                  notEmpty.notify_one();                              // one consumer can proceed
              }

              T pop() {
                  unique_lock<mutex> lk(m);
                  notEmpty.wait(lk, [&] { return !q.empty(); });      // sleep while empty
                  T v = std::move(q.front());
                  q.pop_front();
                  lk.unlock();
                  notFull.notify_one();                               // one producer can proceed
                  return v;
              }

              size_t size() const { lock_guard<mutex> g(m); return q.size(); }
          };

          int main() {
              BoundedQueue<int> bq(2);
              long long total = 0;
              {
                  jthread producer([&] { for (int i = 1; i <= 1000; ++i) bq.push(i); });
                  jthread consumer([&] { for (int i = 1; i <= 1000; ++i) total += bq.pop(); });
              }                                          // both joined: total is visible
              cout << total << "\n";                     // 500500
          }`,
        dry: { head: ['step', 'thread', 'action', 'queue', 'sleepers'], rows: [['1', 'C', 'pop: empty → wait on notEmpty', '[]', 'C'], ['2', 'P', 'push 1 → notify notEmpty', '[1]', '(C woken)'], ['3', 'C', 're-check ok → pop 1 → notify notFull', '[]', '-'], ['4', 'P', 'push 2, push 3', '[2, 3]', '-'], ['5', 'P', 'push 4: full → wait on notFull', '[2, 3]', 'P'], ['6', 'C', 'pop 2 → notify notFull', '[3]', '(P woken)'], ['7', 'P', 're-check ok → push 4', '[3, 4]', '-']] },
        complexity: `<p>O(1) amortized per push/pop (deque). Memory O(C). Waiting threads use no CPU. Each blocked handoff costs a few µs (kernel wake-up).</p>`,
        followUps: ['Add <code>close()</code> so blocked producers and consumers all return (hint: notify_all on both cvs)', 'Add <code>try_push_for(timeout)</code> using <code>wait_for</code>', 'How would a lock-free single-producer single-consumer ring buffer differ?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 5 — atomics, fetch_add, compare_exchange
     ====================================================================== */
  var CAS_CODE = 'int expected = x.load();\nwhile (true) {\n    int desired = expected + 10;\n    if (x.compare_exchange_weak(expected, desired)) break;\n}   // on failure CAS copied the CURRENT x into expected';
  function casOps() {
    return [
      { line: 1, txt: 'load', run: function (st, t) { st.r[t].exp = st.s.x; return { say: 'expected = x.load() → ' + st.s.x, narr: 'takes a snapshot: expected = <b>' + st.s.x + '</b>.' }; } },
      { line: 3, txt: 'compute', run: function (st, t) { var r = st.r[t]; r.des = r.exp + 10; return { say: 'desired = ' + r.exp + ' + 10 = ' + r.des, narr: 'computes the new value privately: desired = <b>' + r.des + '</b>. Nothing in shared memory has changed yet.' }; } },
      { line: 4, txt: 'cas', run: function (st, t) {
        var r = st.r[t];
        if (st.s.x === r.exp) { st.s.x = r.des; st.s.ok++; return { say: 'CAS(' + r.exp + ' → ' + r.des + ') SUCCESS', cls: 'ok', narr: '<code>compare_exchange</code>: x is still ' + r.exp + ', exactly what it expected, so in <b>one indivisible step</b> it writes ' + r.des + '. Done.', jump: 3 }; }
        var cur = st.s.x; r.retries++; st.s.fails++;
        var old = r.exp; r.exp = cur;
        return { say: 'CAS(' + old + ' → ' + r.des + ') FAILS, x is ' + cur, cls: 'bad', narr: '<span class="c-r">CAS fails:</span> it expected ' + old + ' but x is now <b>' + cur + '</b> (the other thread got there first). Nothing is overwritten. CAS loads the current value into <code>expected</code>, and the loop retries with fresh data. <b>No update is lost.</b>', jump: 1 };
      } }
    ];
  }
  var vizCAS = {
    title: 'Compare-and-swap loop: fail, refresh, retry, never lose an update',
    input: 'A B A B A B',
    inputLabel: 'Schedule of A / B steps',
    gen: function (input) {
      var sched = parseSched(input, 'A B A B A B');
      return interleave({
        code: { A: CAS_CODE, B: CAS_CODE },
        ops: { A: casOps(), B: casOps() },
        shared: { x: 0, ok: 0, fails: 0 }, reg: { exp: '-', des: '-', retries: 0 },
        cols: ['x in memory'], colVals: function (st) { return [st.s.x]; },
        view: function (st) { return { x: st.s.x, 'A.expected': st.r.A.exp, 'A.desired': st.r.A.des, 'B.expected': st.r.B.exp, 'B.desired': st.r.B.des, 'failed CAS attempts': st.s.fails }; },
        viewHl: function (st) { return st.s.fails ? { 'failed CAS attempts': 'win' } : {}; },
        intro: 'Both threads add 10 to <code>std::atomic&lt;int&gt; x</code> using the general-purpose <b>CAS loop</b> (the same pattern works for any update: max, multiply, push onto a stack). The key: the write only happens if x still holds the value we based our computation on.',
        finish: function (st) { return '<span class="c-g"><b>x = ' + st.s.x + '</b></span> (correct: 0 + 10 + 10). Failed attempts: ' + st.s.fails + '. A failed CAS is not an error, just a retry with fresh data. This is <b>lock-free</b>: some thread always makes progress, and nobody ever sleeps holding a lock.'; }
      }, sched);
    }
  };
  var SPIN_CODE = 'while (flag.test_and_set(std::memory_order_acquire))\n    ;                            // spin: keep trying\nshared += 1;                     // critical section\nflag.clear(std::memory_order_release);';
  function spinOps() {
    return [
      { line: 1, txt: 'tas', run: function (st, t) {
        if (!st.s.flag) { st.s.flag = true; st.s.owner = t; return { say: 'test_and_set: was false → acquired', cls: 'ok', narr: '<code>test_and_set</code> atomically sets the flag to true and returns the <b>old</b> value: false, so this thread now owns the spinlock.' }; }
        st.s.spins++;
        return { say: 'test_and_set: was true → spin', cls: 'win', narr: 'tries <code>test_and_set</code>, gets <b>true</b> back (someone holds it) and loops again. Unlike a mutex it does not sleep: it <b>burns CPU</b> while it waits.', jump: 0 };
      } },
      { line: 3, txt: 'work', run: function (st, t) { st.s.shared++; return { say: 'shared += 1 → ' + st.s.shared, narr: 'does the critical-section work safely: shared = ' + st.s.shared + '.' }; } },
      { line: 4, txt: 'clear', run: function (st, t) { st.s.flag = false; st.s.owner = null; return { say: 'clear() → released', narr: '<code>clear(release)</code> sets the flag back to false and publishes the writes made inside the critical section.' }; } }
    ];
  }
  var vizSpin = {
    title: 'A spinlock from std::atomic_flag: waiting by spinning',
    input: 'A B B B A A B B B',
    inputLabel: 'Schedule of A / B steps',
    gen: function (input) {
      var sched = parseSched(input, 'A B B B A A B B B');
      return interleave({
        code: { A: SPIN_CODE, B: SPIN_CODE },
        ops: { A: spinOps(), B: spinOps() },
        shared: { flag: false, owner: null, shared: 0, spins: 0 }, reg: {},
        cols: ['flag', 'shared'], colVals: function (st) { return [st.s.flag, st.s.shared]; },
        view: function (st) { return { flag: st.s.flag, owner: st.s.owner || 'nobody', shared: st.s.shared, 'wasted spin steps': st.s.spins }; },
        viewHl: function (st) { return st.s.spins ? { 'wasted spin steps': 'bad' } : {}; },
        intro: 'A spinlock is the simplest lock you can build from one atomic: <code>std::atomic_flag</code>. Thread A grabs it first; watch thread B spin in place, using CPU without making progress, until A clears the flag.',
        finish: function (st) { return 'shared = <b>' + st.s.shared + '</b>, wasted spin steps: <b>' + st.s.spins + '</b>. Spinlocks are great when the critical section is a few nanoseconds and threads run on different cores. They are terrible when the holder can be descheduled, because everyone else spins for a whole time slice. That is why std::mutex spins briefly and then sleeps.'; }
      }, sched);
    }
  };

  topics.push({
    title: 'Atomics: std::atomic, fetch_add & Compare-and-Swap',
    analogy: `<p>At the deli counter there's a <b>ticket dispenser</b>. When you pull a ticket, reading the number and advancing the roll happen as <b>one physical motion</b>: two customers can never get the same number, no matter how fast they grab. That's an <b>atomic</b> operation. <b>Compare-and-swap</b> is like editing a shared doc that says "only save my change if the doc is still at version 7; if someone saved in between, show me the new version and let me redo my edit".</p>`,
    explain: `<p><code>std::atomic&lt;T&gt;</code> wraps a value so that each operation on it is <b>indivisible</b> (no thread can ever see it half-done) and <b>never a data race</b>. It works for integers, pointers, <code>bool</code>, and since C++20 floating point <code>fetch_add</code> and <code>std::atomic&lt;std::shared_ptr&lt;T&gt;&gt;</code>.</p>
      ${H.table(['operation', 'meaning', 'returns'], [
        ['<code>x.load()</code> / <code>x.store(v)</code>', 'read / write the whole value at once', 'value / nothing'],
        ['<code>x.exchange(v)</code>', 'write v, give back the old value', 'old value'],
        ['<code>x.fetch_add(d)</code>, <code>fetch_sub</code>, <code>fetch_and/or/xor</code>', 'read-modify-write in one step', 'old value'],
        ['<code>++x</code>, <code>x += d</code>, <code>x |= m</code>', 'same as fetch_* (atomic RMW)', 'new value'],
        ['<code>x.compare_exchange_weak(exp, des)</code>', 'if x == exp then x = des (true); else exp = x (false)', 'bool'],
        ['<code>x.is_lock_free()</code>', 'does the hardware do it without a hidden lock?', 'bool']
      ])}
      <p><span class="c-r"><b>Trap:</b></span> <code>x = x + 1</code> on an atomic is <b>two</b> atomic operations (a load, then a store). Another thread can slip in between, so updates get lost. Use <code>++x</code> or <code>fetch_add</code>.</p>
      <p><b>Compare-and-swap (CAS)</b> is the universal tool. Anything you can compute from the old value (max, multiply, "push node onto list") becomes atomic with a <b>CAS loop</b>: read the value, compute the new one privately, then CAS. If someone changed it meanwhile, CAS fails, refreshes <code>expected</code> with the current value, and you retry. <code>compare_exchange_weak</code> may fail even when the values are equal (spuriously, on ARM/POWER), so use it in loops; <code>compare_exchange_strong</code> never fails spuriously, so use it for a single attempt.</p>
      <p><b>When to use atomics vs a mutex:</b> atomics for <b>one</b> variable with a simple update (counters, flags, a pointer swap, statistics, sequence numbers). The moment your invariant involves <b>two or more</b> variables ("balance and history must agree"), use a mutex. Hand-made lock-free data structures are expert territory.</p>
      <p><b>Lock-free</b> means at least one thread always makes progress even if others are paused; nobody can block everyone by being descheduled while holding a lock. It doesn't automatically mean faster: heavy contention on one atomic makes all cores fight over a single cache line.</p>`,
    clues: ['"thread-safe counter / statistic / ID generator" → <code>std::atomic</code> + <code>fetch_add</code> (often relaxed)', '"stop flag" / "is shutting down" → <code>std::atomic&lt;bool&gt;</code>', '"update only if unchanged" / "lock-free" / "optimistic concurrency" → compare_exchange loop', '"atomic max / min" (no fetch_max before C++26) → CAS loop', '"only one thread should initialize / claim this" → <code>compare_exchange_strong(false → true)</code> or <code>std::call_once</code>', '"implement a spinlock" → <code>std::atomic_flag</code> + test_and_set(acquire) / clear(release)'],
    code: [R`
      #include <bits/stdc++.h>
      using namespace std;

      atomic<long long> requests{0};
      atomic<int> peak{0};
      atomic<bool> claimed{false};

      // atomic max with a CAS loop (std::atomic has no fetch_max before C++26)
      void updatePeak(int v) {
          int cur = peak.load();
          while (cur < v && !peak.compare_exchange_weak(cur, v)) {
              // CAS failed: cur now holds the latest peak; loop re-checks cur < v
          }
      }

      int main() {
          vector<jthread> pool;
          for (int t = 0; t < 4; ++t)
              pool.emplace_back([t] {
                  for (int i = 0; i < 1000; ++i) {
                      requests.fetch_add(1);              // indivisible read-modify-write
                      updatePeak(t * 1000 + i);
                  }
                  bool expected = false;                  // exactly ONE thread wins the claim
                  if (claimed.compare_exchange_strong(expected, true))
                      cout << ("thread " + to_string(t) + " did the one-time setup\n");
              });
          pool.clear();                                   // join
          cout << requests << " " << peak << "\n";        // 4000 3999
          cout << boolalpha << requests.is_lock_free() << "\n";   // true on x86-64 / ARM64
      }`],
    codeTitle: ['fetch_add, CAS-loop max, and a one-shot claim'],
    viz: [vizCAS, vizSpin],
    examples: [
      { title: 'x = x + 1 on an atomic still loses updates', html: `<p>Each half is atomic, but the pair is not: thread A loads 5, thread B loads 5, both store 6. The fix is one RMW: <code>x.fetch_add(1)</code> or <code>++x</code>. This is the atomic version of the check-then-act bug.</p>`, code: R`
        std::atomic<int> hits{0};
        void bad()  { hits = hits + 1; }        // load, then store: NOT one atomic step
        void good() { hits.fetch_add(1); }      // one indivisible read-modify-write
        void alsoGood() { ++hits; }             // operator++ is fetch_add(1) + 1` },
      { title: 'A correct (and polite) spinlock', html: `<p>Test-and-set with <b>acquire</b> to enter and <b>release</b> to leave (topic 6 explains why). The inner loop only <i>reads</i> (<code>test()</code>, C++20) so waiting cores share the cache line instead of bouncing it with writes ("test-and-test-and-set"). <code>yield()</code> or a CPU pause instruction reduces wasted power.</p>`, code: R`
        class SpinLock {
            std::atomic_flag f = ATOMIC_FLAG_INIT;
        public:
            void lock() {
                while (f.test_and_set(std::memory_order_acquire)) {     // try to grab
                    while (f.test(std::memory_order_relaxed))            // wait by reading only
                        std::this_thread::yield();
                }
            }
            void unlock() { f.clear(std::memory_order_release); }
        };
        int main() {
            SpinLock sl; long long n = 0;
            { std::jthread a([&] { for (int i = 0; i < 10000; ++i) { std::lock_guard g(sl); ++n; } });
              std::jthread b([&] { for (int i = 0; i < 10000; ++i) { std::lock_guard g(sl); ++n; } }); }
            std::cout << n << "\n";                                     // 20000
        }` },
      { title: 'False sharing: atomics that slow each other down', html: `<p>Four per-thread counters in one array sit in the <b>same 64-byte cache line</b>. They are different variables, so it's correct, but every increment invalidates the line in the other cores' caches. Padding each counter to its own line can make this 5–10× faster.</p>`, code: R`
        struct alignas(64) PaddedCounter { std::atomic<long long> v{0}; };   // one cache line each
        PaddedCounter perThread[4];
        void work(int id) {
            for (int i = 0; i < 1000000; ++i)
                perThread[id].v.fetch_add(1, std::memory_order_relaxed);
        }` },
      { title: 'Big atomics may use a hidden lock', html: `<p><code>std::atomic&lt;T&gt;</code> works for any trivially copyable T, but if T is larger than what the CPU can swap in one instruction (usually 8 or 16 bytes), the library uses an internal lock. Check <code>is_always_lock_free</code> at compile time if you care (signal handlers, real-time code).</p>`, code: R`
        struct Small { int a, b; };            // 8 bytes: lock-free on x86-64
        struct Big   { long long v[8]; };      // 64 bytes: uses a lock inside the library
        static_assert(std::atomic<Small>::is_always_lock_free);
        bool bigIsLockFree() { return std::atomic<Big>{}.is_lock_free(); }   // false (needs -latomic to link)` }
    ],
    deepDive: `<p><b>What the hardware does.</b> On x86-64, <code>fetch_add</code> compiles to <code>lock xadd</code> and CAS to <code>lock cmpxchg</code>; the <code>lock</code> prefix holds the cache line in exclusive state for the duration of the operation. On ARMv8.1+ there are single instructions (<code>ldadd</code>, <code>cas</code>); older ARM uses a <b>load-linked / store-conditional</b> pair (<code>ldxr</code>/<code>stxr</code>), where the store fails if anything touched the line in between, even an unrelated write or an interrupt. That's exactly why <code>compare_exchange_weak</code> is allowed to fail spuriously: it maps to one LL/SC attempt, while <code>_strong</code> hides an internal retry loop.</p>
      <p><b>Cost model.</b> An uncontended atomic RMW costs ≈ 5–20 ns. Under contention each operation must pull the cache line from another core through the coherence protocol (MESI), ≈ 40–100+ ns, and the operations are serialized. 32 threads incrementing one atomic can be <i>slower</i> than one thread. Scalable designs <b>shard</b>: per-thread or per-core counters, summed when read.</p>
      <p><b>Progress guarantees.</b> <i>Blocking</i> (mutex): a paused lock holder stalls everyone. <i>Lock-free</i>: the system as a whole always progresses (a CAS loop: if my CAS failed, someone else's succeeded). <i>Wait-free</i>: every thread finishes in a bounded number of its own steps (e.g. <code>fetch_add</code> on x86).</p>
      <p><b>The ABA problem.</b> A lock-free stack pop reads top = A, then gets paused. Others pop A, pop B, push A back. The CAS "top is still A → set top = B" succeeds, but B was freed: memory corruption. Fixes: tagged pointers (pointer + version counter, double-width CAS), hazard pointers (standardized in C++26), epoch-based reclamation/RCU (also C++26), or simply never freeing nodes while threads run.</p>
      <p><b>More tools:</b> <code>std::atomic_ref&lt;T&gt;</code> (C++20) performs atomic operations on an ordinary object you don't own. <code>x.wait(old)</code> / <code>x.notify_one()</code> (C++20) let a thread sleep until an atomic changes, a lightweight futex-like alternative to a cv. Every atomic operation also takes a <b>memory order</b> argument, which is the next topic.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants know the CAS-loop pattern and will produce a lock-free stack or queue on request. Lock-free code that "compiles and passes a test" is now cheap; lock-free code that is <b>correct</b> is as rare as ever.</p>
      <p><b>Use AI as a partner:</b> ask <code>"Is there any multi-variable invariant in this class that atomics on individual fields cannot protect?"</code> and <code>"Explain the ABA risk in this pop() and propose a reclamation scheme"</code>. Ask it to benchmark sharded vs single atomic counters for your core count.</p>
      <p><b>Where AI goes wrong:</b> it turns every field into an atomic and calls the class thread-safe, writes <code>x = x + 1</code> on atomics, uses <code>compare_exchange_weak</code> outside a loop, frees nodes right after popping in lock-free structures (ABA / use-after-free), and adds <code>memory_order_relaxed</code> everywhere "for speed".</p>
      <p><b>What you must still own:</b> deciding whether a problem is single-variable (atomic is fine) or multi-variable (use a lock), knowing that lock-free is not automatically faster, and recognizing ABA and memory-reclamation issues. In interviews, a correct mutex solution beats an incorrect lock-free one every time.</p>`,
    problems: [{
      title: 'Atomic Maximum Tracker',
      level: 'Medium', tags: ['atomic', 'compare_exchange', 'lock-free'], companies: ['Meta', 'Nvidia', 'Optiver'],
      statement: `<p>Many threads measure request latencies. Implement <code>void record(int latency)</code> and <code>int worst()</code> so that <code>worst()</code> returns the maximum latency ever recorded. It must be lock-free (no mutex) and correct under any interleaving.</p>`,
      constraints: `Up to 64 threads, 10<sup>7</sup> calls to record; 0 ≤ latency ≤ 10<sup>9</sup>`,
      example: `<p>Thread A records 70 while thread B records 90; starting worst = 50.</p>${H.table(['naive load/store', 'CAS loop'], [['A loads 50, B loads 50', 'A loads 50, B loads 50'], ['B stores 90', 'B: CAS(50→90) succeeds'], ['A stores 70 (70 &gt; 50 it thought)', 'A: CAS(50→70) <b>fails</b>, sees 90'], ['<span class="c-r">worst = 70 (wrong)</span>', 'A: 70 &lt; 90 → stop. <span class="c-g">worst = 90</span>']])}`,
      brute: { why: `<p>"Load, compare, store" is a check-then-act: between A's load and A's store, B can store a bigger value, and A then overwrites it with a smaller one. Each operation is atomic, but the sequence is not.</p>`, code: R`
        std::atomic<int> worstSeen{0};
        void recordBAD(int latency) {
            if (latency > worstSeen.load())     // check ...
                worstSeen.store(latency);       // ... then act: can overwrite a larger value
        }` },
      mcq: { q: 'In the CAS loop <code>while (cur &lt; v &amp;&amp; !m.compare_exchange_weak(cur, v)) {}</code>, what happens to <code>cur</code> when the CAS fails?', options: ['It stays the same, so the loop retries with stale data', 'It is set to v', 'It is updated to the value currently stored in m', 'It becomes 0'], answer: 2, explain: 'On failure compare_exchange writes the actual current value into the expected argument. The loop condition then re-checks cur &lt; v with fresh data, and stops if someone already stored something bigger.' },
      hints: [`<p><b>Aha:</b> you want "store v only if the current value is still the one I compared against". That's exactly compare-and-swap.</p>`, `<p>Loop: <code>int cur = m.load(); while (cur &lt; v &amp;&amp; !m.compare_exchange_weak(cur, v)) {}</code>.</p>`, `<p>Exit early when <code>cur ≥ v</code> (someone already did better; no write needed, which also reduces cache traffic). Use <code>_weak</code> because we are in a loop anyway. Relaxed ordering is fine for a pure statistic.</p>`],
      solution: {
        approach: `<p>CAS loop: snapshot the current max, and while our value is bigger try to swap it in. A failed CAS means someone else changed the max, and <code>cur</code> is refreshed automatically, so we re-evaluate. The loop ends either because we won or because the stored max is already ≥ ours. Lock-free: every failed CAS implies another thread's CAS succeeded.</p>`,
        code: R`
          #include <bits/stdc++.h>
          using namespace std;

          class MaxTracker {
              atomic<int> best{numeric_limits<int>::min()};
          public:
              void record(int v) {
                  int cur = best.load(memory_order_relaxed);
                  // keep trying while our value is still bigger than what is stored
                  while (cur < v && !best.compare_exchange_weak(cur, v, memory_order_relaxed)) {
                      // failure (real or spurious): cur was refreshed with the latest value
                  }
              }
              int worst() const { return best.load(memory_order_relaxed); }
          };

          int main() {
              MaxTracker t;
              {
                  vector<jthread> pool;
                  for (int id = 0; id < 8; ++id)
                      pool.emplace_back([&t, id] {
                          mt19937 rng(id);
                          for (int i = 0; i < 100000; ++i) t.record(int(rng() % 1000000));
                      });
                  t.record(1000000);                    // a known maximum from the main thread
              }
              cout << t.worst() << "\n";                // 1000000
          }`,
        dry: { head: ['step', 'thread', 'cur (local)', 'stored max', 'CAS result'], rows: [['1', 'A(v=70)', '50', '50', '-'], ['2', 'B(v=90)', '50', '50', '-'], ['3', 'B', '50', '90', '<span class="c-g">success</span>'], ['4', 'A', '50 → 90', '90', '<span class="c-r">fail, cur refreshed</span>'], ['5', 'A', '90', '90', 'loop exits: 90 ≥ 70']] },
        complexity: `<p>O(1) expected per record; under contention a call may retry, but each retry means another thread succeeded (lock-free). No writes at all when v ≤ current max, which keeps the cache line shared and fast.</p>`,
        followUps: ['Track both max and the request id that produced it, atomically (hint: pack into 64 bits, or use a mutex)', 'C++26 adds <code>fetch_max</code>: what would it compile to on x86 vs ARM?', 'How would you make this scale to 128 cores (per-core maxima)?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 6 — memory orders: relaxed, acquire/release, seq_cst
     ====================================================================== */
  var ORD_NAME = { relaxed: 'relaxed', acqrel: 'acquire / release', seqcst: 'seq_cst' };
  function ordFor(mode, kind) {
    if (mode === 'relaxed') return 'memory_order_relaxed';
    if (mode === 'seqcst') return 'memory_order_seq_cst';
    return kind === 'store' ? 'memory_order_release' : 'memory_order_acquire';
  }
  var LITMUS = {
    SB: {
      name: 'Store Buffering (Dekker)',
      vars: ['x', 'y'],
      A: [{ w: 0, v: 1, txt: 'x = 1' }, { r: 1, reg: 'r1', txt: 'r1 = y' }],
      B: [{ w: 1, v: 1, txt: 'y = 1' }, { r: 0, reg: 'r2', txt: 'r2 = x' }],
      code: function (o) {
        return {
          A: '// Thread A\nx.store(1, ' + ordFor(o, 'store') + ');\nint r1 = y.load(' + ordFor(o, 'load') + ');',
          B: '// Thread B\ny.store(1, ' + ordFor(o, 'store') + ');\nint r2 = x.load(' + ordFor(o, 'load') + ');'
        };
      },
      question: 'Both start at 0. Each thread first writes its own flag, then reads the other one. <b>Can the program end with r1 == 0 AND r2 == 0</b>, meaning each thread missed the other\'s write?',
      isTarget: function (r1, r2) { return r1 === 0 && r2 === 0; },
      outcomes: ['r1=0, r2=0', 'r1=0, r2=1', 'r1=1, r2=0', 'r1=1, r2=1'],
      allowed: { relaxed: [1, 1, 1, 1], acqrel: [1, 1, 1, 1], seqcst: [0, 1, 1, 1] },
      hw: {
        weak: [
          { a: 'x = 1 → into A\'s store buffer', b: '', sbA: 'x=1', sbB: '', m: [0, 0], r1: '-', r2: '-', narr: 'Core A executes <code>x = 1</code>. Real CPUs do not write straight to memory: the store waits in a private <b>store buffer</b> so the core can keep running. Other cores cannot see it yet.' },
          { a: '', b: 'y = 1 → into B\'s store buffer', sbA: 'x=1', sbB: 'y=1', m: [0, 0], r1: '-', r2: '-', narr: 'Core B does the same with <code>y = 1</code>. Memory still says x = 0, y = 0.' },
          { a: 'r1 = y → reads memory: 0', b: '', sbA: 'x=1', sbB: 'y=1', m: [0, 0], r1: 0, r2: '-', narr: 'Core A loads y. Its own buffer has nothing for y, so it reads memory: <b>0</b>. Effectively A\'s load ran <b>before</b> its own store became visible (a StoreLoad reordering). Even x86 does this.' },
          { a: '', b: 'r2 = x → reads memory: 0', sbA: 'x=1', sbB: 'y=1', m: [0, 0], r1: 0, r2: 0, cls: 'bad', narr: '<span class="c-r">Core B loads x from memory: <b>0</b>.</span> Both threads missed each other: r1 = 0, r2 = 0, an outcome that <b>no interleaving</b> can produce.' },
          { a: 'buffer drains', b: 'buffer drains', sbA: '', sbB: '', m: [1, 1], r1: 0, r2: 0, narr: 'Later the buffers drain and memory becomes x = 1, y = 1. Too late: the loads already happened. Release/acquire do <b>not</b> forbid this, because release only keeps <i>earlier</i> operations before a store, and acquire only keeps <i>later</i> operations after a load. A store followed by a load of another variable is not covered.' }
        ],
        strong: [
          { a: 'x = 1 → into A\'s store buffer', b: '', sbA: 'x=1', sbB: '', m: [0, 0], r1: '-', r2: '-', narr: 'Core A executes the seq_cst store <code>x = 1</code>. On x86 the compiler emits <code>xchg</code> (or <code>mov</code> + <code>mfence</code>); on ARM64 <code>stlr</code>, which later <code>ldar</code> loads cannot pass.' },
          { a: 'fence: drain buffer before next load', b: '', sbA: '', sbB: '', m: [1, 0], r1: '-', r2: '-', cls: 'ok', narr: 'Because of seq_cst, A\'s <b>next seq_cst load must wait</b> until x = 1 is globally visible. The buffer drains: memory x = 1.' },
          { a: 'r1 = y → 0', b: '', sbA: '', sbB: '', m: [1, 0], r1: 0, r2: '-', narr: 'A reads y = 0 (B has not written yet). That is fine.' },
          { a: '', b: 'y = 1, drained before its load', sbA: '', sbB: '', m: [1, 1], r1: 0, r2: '-', narr: 'B stores y = 1 and must also make it visible before its seq_cst load.' },
          { a: '', b: 'r2 = x → 1', sbA: '', sbB: '', m: [1, 1], r1: 0, r2: 1, cls: 'ok', narr: '<span class="c-g">B reads x = <b>1</b>.</span> Whoever goes second is guaranteed to see the first thread\'s store. All seq_cst operations fit in <b>one global order</b>, so (0, 0) is impossible.' }
        ]
      }
    },
    MP: {
      name: 'Message Passing (publish a value with a flag)',
      vars: ['payload', 'ready'],
      A: [{ w: 0, v: 42, txt: 'payload = 42' }, { w: 1, v: 1, txt: 'ready = 1' }],
      B: [{ r: 1, reg: 'r1', txt: 'r1 = ready' }, { r: 0, reg: 'r2', txt: 'r2 = payload' }],
      code: function (o) {
        return {
          A: '// Thread A (producer)\npayload.store(42, memory_order_relaxed);\nready.store(1, ' + ordFor(o, 'store') + ');',
          B: '// Thread B (consumer)\nint r1 = ready.load(' + ordFor(o, 'load') + ');\nint r2 = payload.load(memory_order_relaxed);'
        };
      },
      question: 'Thread A prepares a value and then raises a flag. Thread B checks the flag, then reads the value. <b>Can B see ready == 1 but payload == 0</b> (the flag arrived before the data)?',
      isTarget: function (r1, r2) { return r1 === 1 && r2 === 0; },
      outcomes: ['r1=0, r2=0', 'r1=0, r2=42', 'r1=1, r2=42', 'r1=1, r2=0'],
      allowed: { relaxed: [1, 1, 1, 1], acqrel: [1, 1, 1, 0], seqcst: [1, 1, 1, 0] },
      hw: {
        weak: [
          { a: 'payload = 42 → store buffer', b: '', sbA: 'payload=42', sbB: '', m: [0, 0], r1: '-', r2: '-', narr: 'Core A writes payload = 42 into its store buffer.' },
          { a: 'ready = 1 → store buffer', b: '', sbA: 'payload=42, ready=1', sbB: '', m: [0, 0], r1: '-', r2: '-', narr: 'Then ready = 1, also buffered. With <b>relaxed</b> there is no rule about which one reaches memory first. (The <b>compiler</b> may even swap the two stores at compile time, on any CPU.)' },
          { a: 'ready drains FIRST', b: '', sbA: 'payload=42', sbB: '', m: [0, 1], r1: '-', r2: '-', cls: 'win', narr: 'On ARM / POWER the buffer may drain out of order: <b>ready = 1 becomes visible before payload = 42</b>.' },
          { a: '', b: 'r1 = ready → 1', sbA: 'payload=42', sbB: '', m: [0, 1], r1: 1, r2: '-', narr: 'Core B sees the flag: r1 = 1. "Great, the data must be ready!"' },
          { a: '', b: 'r2 = payload → 0', sbA: 'payload=42', sbB: '', m: [0, 1], r1: 1, r2: 0, cls: 'bad', narr: '<span class="c-r">Core B reads payload = <b>0</b>.</span> The flag said ready, but the data was not there yet. In real code this means reading a half-built object, a null pointer, garbage.' },
          { a: 'payload drains', b: '', sbA: '', sbB: '', m: [42, 1], r1: 1, r2: 0, narr: 'payload = 42 finally reaches memory, too late. Relaxed atomics give atomicity but <b>no ordering between different variables</b>.' }
        ],
        strong: [
          { a: 'payload = 42 → store buffer', b: '', sbA: 'payload=42', sbB: '', m: [0, 0], r1: '-', r2: '-', narr: 'Core A writes payload = 42 (relaxed, buffered).' },
          { a: 'ready.store(1, release or seq_cst)', b: '', sbA: 'payload=42, ready=1', sbB: '', m: [0, 0], r1: '-', r2: '-', narr: 'The <b>release</b> store promises: every write before me becomes visible <b>no later than</b> me. Think of it as sealing an envelope: everything packed before sealing travels with it.' },
          { a: 'drain in order: payload, then ready', b: '', sbA: '', sbB: '', m: [42, 1], r1: '-', r2: '-', cls: 'ok', narr: 'So payload = 42 reaches memory before (or together with) ready = 1. On x86 this is free; on ARM64 the compiler emits <code>stlr</code>.' },
          { a: '', b: 'r1 = ready.load(acquire or seq_cst) → 1', sbA: '', sbB: '', m: [42, 1], r1: 1, r2: '-', narr: 'The <b>acquire</b> load reads the value written by the release store. That creates a <b>synchronizes-with</b> edge: everything A did before the release <b>happens-before</b> everything B does after the acquire. Later loads cannot be moved above it (ARM64: <code>ldar</code>).' },
          { a: '', b: 'r2 = payload → 42', sbA: '', sbB: '', m: [42, 1], r1: 1, r2: 42, cls: 'ok', narr: '<span class="c-g">B is guaranteed to read payload = 42.</span> (1, 0) is impossible. This release/acquire handshake is how mutexes, queues and futures publish data.' },
          { a: 'done', b: 'done', sbA: '', sbB: '', m: [42, 1], r1: 1, r2: 42, narr: 'If B had read ready = 0 it would simply know "not ready yet" and must not touch payload (or must spin until ready == 1).' }
        ]
      }
    }
  };
  var SC_ORDERS = ['AABB', 'ABAB', 'ABBA', 'BAAB', 'BABA', 'BBAA'];
  var vizMemOrder = {
    title: 'Memory-order litmus tests: interleavings vs what real CPUs do',
    input: 'SB relaxed',
    inputLabel: 'Test (SB or MP) + order (relaxed | acqrel | seqcst), e.g. "MP acqrel"',
    gen: function (input) {
      var parts = String(input || 'SB relaxed').trim().split(/[\s,]+/);
      var lt = (parts[0] || 'SB').toUpperCase(), o = (parts[1] || 'relaxed').toLowerCase().replace(/[^a-z]/g, '');
      var alias = { relaxed: 'relaxed', acqrel: 'acqrel', acquire: 'acqrel', release: 'acqrel', acquirerelease: 'acqrel', releaseacquire: 'acqrel', ar: 'acqrel', seqcst: 'seqcst', sc: 'seqcst', seq: 'seqcst' };
      var L = LITMUS[lt], mode = alias[o];
      if (!L || !mode) throw new Error('Type a test (SB or MP) and an order (relaxed, acqrel, seqcst), e.g. "MP acqrel"');
      var code = L.code(mode), frames = [], scRows = [], scHl = {};
      function codeParts(hlA, hlB) { return [{ type: 'code', label: 'Thread A', lang: 'cpp', code: code.A, hl: hlA || {} }, { type: 'code', label: 'Thread B', lang: 'cpp', code: code.B, hl: hlB || {} }]; }
      frames.push({ narr: '<b>' + L.name + '</b> with <b>' + ORD_NAME[mode] + '</b>. ' + L.question + ' First we try every way the two threads can <b>take turns</b> (what most people imagine), then we look at what real hardware may do.', parts: codeParts().concat([note('Variables start at 0. A <b>litmus test</b> is a tiny program used to ask "which results are allowed?". Interviewers love them because they reveal whether you understand reordering.', 'The question')]) });
      SC_ORDERS.forEach(function (ord, k) {
        var mem = [0, 0], reg = {}, ia = 0, ib = 0, seq = [];
        ord.split('').forEach(function (t) {
          var op = t === 'A' ? L.A[ia++] : L.B[ib++];
          if (op.w !== undefined) mem[op.w] = op.v; else reg[op.reg] = mem[op.r];
          seq.push(t + ': ' + op.txt);
        });
        var hit = L.isTarget(reg.r1, reg.r2);
        scRows.push([seq.join('  →  '), String(reg.r1), String(reg.r2), hit ? 'YES' : 'no']);
        scHl = {}; for (var c = 0; c < 4; c++) scHl[k + ',' + c] = hit ? 'bad' : 'cur';
        frames.push({ narr: 'Interleaving ' + (k + 1) + ' of 6 (<code>' + ord + '</code>): ' + seq.join(', ') + ' gives r1 = <b>' + reg.r1 + '</b>, r2 = <b>' + reg.r2 + '</b>. ' + (hit ? '<span class="c-r">That is the surprising outcome.</span>' : 'Not the surprising outcome.'), parts: [
          { type: 'grid', label: 'Every "take turns" (sequentially consistent) order', colHead: ['order of the 4 operations', 'r1', 'r2', 'surprising?'], rows: clone(scRows), hl: scHl }
        ].concat(codeParts()) });
      });
      frames.push({ narr: 'None of the 6 turn-taking orders produces the surprising result. If computers only interleaved, the answer would be "impossible". <b>But compilers and CPUs reorder memory operations</b> as long as a single thread cannot tell the difference. Let\'s see what hardware may do with <b>' + ORD_NAME[mode] + '</b>.', parts: [
        { type: 'grid', label: 'Every "take turns" (sequentially consistent) order', colHead: ['order of the 4 operations', 'r1', 'r2', 'surprising?'], rows: clone(scRows), hl: {} },
        note('Model: each core has a <b>store buffer</b> (writes wait there before reaching shared memory); loads read the core\'s own buffer first, then memory.', 'Hardware model')
      ] });
      var weakOK = L.allowed[mode][lt === 'SB' ? 0 : 3] === 1;   // show the reordering only if C++ allows the surprising outcome
      var steps = weakOK ? L.hw.weak : L.hw.strong;
      var cols = [], rowsH = ['Core A does', 'A store buffer', 'Core B does', 'B store buffer', 'memory ' + L.vars[0], 'memory ' + L.vars[1], 'r1', 'r2'];
      steps.forEach(function (s, k) {
        cols.push([s.a || '·', s.sbA || '(empty)', s.b || '·', s.sbB || '(empty)', String(s.m[0]), String(s.m[1]), String(s.r1), String(s.r2)]);
        var rows = rowsH.map(function (_, r) { return cols.map(function (c) { return c[r]; }); });
        var hl = {};
        for (var r = 0; r < rowsH.length; r++) hl[r + ',' + k] = s.cls || 'cur';
        frames.push({ narr: 't' + (k + 1) + ': ' + s.narr, parts: [
          { type: 'grid', label: 'Hardware timeline (' + ORD_NAME[mode] + '): columns are time steps', rowHead: rowsH, colHead: cols.map(function (_, i) { return 't' + (i + 1); }), rows: rows, hl: hl }
        ].concat(codeParts()) });
      });
      var vrows = L.outcomes.map(function (oc, i) { return [oc, L.allowed.relaxed[i] ? 'allowed' : 'FORBIDDEN', L.allowed.acqrel[i] ? 'allowed' : 'FORBIDDEN', L.allowed.seqcst[i] ? 'allowed' : 'FORBIDDEN']; });
      var col = { relaxed: 1, acqrel: 2, seqcst: 3 }[mode], vhl = {};
      L.outcomes.forEach(function (_, i) { var tgt = i === (lt === 'SB' ? 0 : 3); vhl[i + ',' + col] = tgt ? (L.allowed[mode][i] ? 'bad' : 'ok') : 'sel'; });
      var tIdx = lt === 'SB' ? 0 : 3, can = L.allowed[mode][tIdx] === 1;
      frames.push({ narr: '<b>Verdict for ' + ORD_NAME[mode] + ':</b> the surprising outcome is ' + (can ? '<span class="c-r">ALLOWED</span>. Your code must not rely on it being impossible.' : '<span class="c-g">FORBIDDEN</span>. The ordering guarantees rule it out on every compiler and CPU.') + (lt === 'SB' ? ' Store-buffering needs <b>seq_cst</b>: acquire/release is not enough.' : ' Message passing needs <b>release on the flag store + acquire on the flag load</b>; seq_cst also works but costs more.') + ' Try the other orders and the other test.', parts: [
        { type: 'grid', label: L.name + ': which results can a correct C++ implementation produce?', colHead: ['outcome', 'relaxed', 'acquire/release', 'seq_cst'], rows: vrows, hl: vhl }
      ].concat(codeParts()) });
      return frames;
    }
  };

  topics.push({
    title: 'Memory Orders: relaxed, acquire/release, seq_cst (and Happens-Before)',
    analogy: `<p>You mail a friend <b>two postcards</b>: first "I baked a cake" then "come over, it's ready". The post office doesn't promise they arrive in order, so your friend might read "come over" before "I baked a cake" (<b>relaxed</b>). If you instead put the cake news <b>inside a sealed registered envelope</b> together with the invitation, whoever opens the envelope is guaranteed to see everything you packed before sealing it. Sealing is <b>release</b>, opening is <b>acquire</b>. <b>seq_cst</b> is a town where every letter from everyone goes through one single counter, so everybody agrees on one order of all letters.</p>`,
    explain: `<p><b>Surprise #1: your code doesn't run in the order you wrote it.</b> The compiler reorders and merges instructions, and the CPU executes out of order and buffers stores. That's all invisible to a <i>single</i> thread (the "as-if" rule), but <b>another</b> thread can observe the reordering. Memory orders are how you tell the compiler and CPU which orderings you need preserved across threads.</p>
      ${H.table(['order', 'what it guarantees', 'typical use', 'cost'], [
        ['<code>memory_order_relaxed</code>', 'the operation is atomic, and all threads agree on the order of writes <b>to that one variable</b>. Nothing about other variables.', 'counters, statistics, unique IDs', 'cheapest'],
        ['<code>memory_order_release</code> (stores)', 'no reads/writes written <b>before</b> it may move after it', 'publishing data: "the data is ready" flag', 'free on x86, cheap on ARM'],
        ['<code>memory_order_acquire</code> (loads)', 'no reads/writes written <b>after</b> it may move before it', 'consuming published data, taking a lock', 'free on x86, cheap on ARM'],
        ['<code>memory_order_acq_rel</code> (RMW)', 'both at once, for read-modify-write ops', 'exchange / CAS in locks, refcount decrement', 'like a RMW'],
        ['<code>memory_order_seq_cst</code> (default)', 'acquire/release <b>plus</b> one single global order of all seq_cst operations that every thread agrees on', 'default; flag protocols like Dekker / store-buffering', 'store costs a full fence on x86']
      ])}
      <p><b>The key idea: happens-before.</b> If a <b>release</b> store to <code>ready</code> is read by an <b>acquire</b> load of <code>ready</code>, the two <b>synchronize-with</b> each other. Then everything thread A did before the release <b>happens-before</b> everything thread B does after the acquire, so B sees all of A's earlier writes, <b>including plain non-atomic ones</b>. This is the same mechanism that makes <code>mutex.unlock()</code> → <code>mutex.lock()</code> publish data.</p>
      <p><b>One-way fences, not walls.</b> Release keeps earlier operations above it, but later ones may still float up above it. Acquire keeps later operations below it, but earlier ones may sink below it. That's why release/acquire does <b>not</b> stop a store followed by a load of a different variable from being reordered (the store-buffering test), and only seq_cst does.</p>
      <p><b>Practical rules for normal humans:</b></p>
      <ol><li>Use the default (<code>seq_cst</code>) unless profiling proves an atomic is a bottleneck.</li>
      <li>Use <code>relaxed</code> only for values nobody uses to decide whether <i>other</i> data is ready (pure counters, stats).</li>
      <li>For "flag says data is ready": <b>release</b> on the store, <b>acquire</b> on the load.</li>
      <li>If you're not sure, use a mutex. It does the right acquire/release for you.</li></ol>
      <p><code>memory_order_consume</code> exists on paper, but every compiler treats it as acquire and C++26 deprecates it. Don't use it.</p>`,
    clues: ['"what can this print?" with two threads and atomics → enumerate interleavings, then ask which reorderings the memory order allows', '"flag + data" / "publish an object to another thread" / "double-checked locking" → release store + acquire load', '"each thread sets its flag then checks the other\'s" (Dekker, Peterson) → needs seq_cst (store-buffering)', '"just a counter" / "statistics" / "only read after join" → relaxed is enough', '"works on x86, fails on ARM / Apple Silicon / Graviton" → missing acquire/release (x86-TSO hides it)', '"happens-before" / "synchronizes-with" / "visibility" → acquire-release pairing on the same atomic'],
    code: [R`
      #include <bits/stdc++.h>
      using namespace std;

      struct Config { string host; int port; };

      Config* sharedCfg = nullptr;               // plain pointer data, published via the flag
      atomic<bool> cfgReady{false};

      void producer() {
          sharedCfg = new Config{"db.local", 5432};          // ordinary (non-atomic) writes
          cfgReady.store(true, memory_order_release);        // seal the envelope
      }

      void consumer() {
          while (!cfgReady.load(memory_order_acquire))        // open the envelope
              this_thread::yield();
          // acquire read the release value: every write before the release is visible here
          cout << sharedCfg->host << ":" << sharedCfg->port << "\n";   // db.local:5432, guaranteed
      }

      atomic<long long> eventsSeen{0};
      void countEvent() { eventsSeen.fetch_add(1, memory_order_relaxed); }   // pure counter: relaxed OK

      int main() {
          thread c(consumer), p(producer);
          p.join(); c.join();
          for (int i = 0; i < 5; ++i) countEvent();
          cout << eventsSeen.load() << "\n";                  // 5 (read after the work: fine)
          delete sharedCfg;
      }`, R`
      #include <bits/stdc++.h>
      using namespace std;

      // Store-buffering / Dekker: only seq_cst forbids r1 == 0 && r2 == 0
      atomic<int> x{0}, y{0};
      int r1 = -1, r2 = -1;

      int main() {
          int bothZero = 0;
          for (int iter = 0; iter < 20000; ++iter) {
              x = 0; y = 0;
              thread a([] { x.store(1, memory_order_relaxed); r1 = y.load(memory_order_relaxed); });
              thread b([] { y.store(1, memory_order_relaxed); r2 = x.load(memory_order_relaxed); });
              a.join(); b.join();
              if (r1 == 0 && r2 == 0) ++bothZero;       // possible with relaxed / acquire-release
          }
          cout << "r1==0 && r2==0 happened " << bothZero << " times\n";
          // Change both orders to memory_order_seq_cst: the count is always 0.
      }`],
    codeTitle: ['Publishing data with release / acquire (and a relaxed counter)', 'Store-buffering experiment: relaxed vs seq_cst'],
    viz: vizMemOrder,
    examples: [
      { title: 'What can this print? (relaxed message passing)', html: `<p>Possible outputs: <b>nothing</b> (B saw ready = 0), <b>42</b>, and also <span class="c-r"><b>0</b></span>: with relaxed, B may see the flag before the data. Changing the flag store to <code>release</code> and the flag load to <code>acquire</code> leaves only "nothing" and "42".</p>`, code: R`
        std::atomic<int> payload{0}, ready{0};
        void a() { payload.store(42, std::memory_order_relaxed); ready.store(1, std::memory_order_relaxed); }
        void b() {
            if (ready.load(std::memory_order_relaxed) == 1)
                std::cout << payload.load(std::memory_order_relaxed);   // may print 0 !
        }` },
      { title: 'What can this print? (Dekker-style flags)', html: `<p>Each thread raises its own flag, then checks the other's. People expect "at most one enters", but with acquire/release <b>both</b> can see the other's flag as 0 and both enter the critical section (both print). With the default seq_cst, at least one thread sees the other's flag, so <b>at most one</b> line prints. This is why Peterson's algorithm needs seq_cst.</p>`, code: R`
        std::atomic<bool> wantA{false}, wantB{false};
        void threadA() {
            wantA.store(true, std::memory_order_release);
            if (!wantB.load(std::memory_order_acquire)) std::cout << "A enters\n";
        }
        void threadB() {
            wantB.store(true, std::memory_order_release);
            if (!wantA.load(std::memory_order_acquire)) std::cout << "B enters\n";   // both can print!
        }` },
      { title: 'Double-checked locking done right', html: `<p>The fast path reads the pointer with <b>acquire</b>. The slow path builds the object under a mutex and publishes it with <b>release</b>. Without these orders a thread could see a non-null pointer to an object whose constructor writes are not visible yet. In practice prefer a function-local <code>static</code> ("magic statics", thread-safe since C++11) or <code>std::call_once</code>.</p>`, code: R`
        struct Registry { std::vector<int> items{1, 2, 3}; };
        std::atomic<Registry*> inst{nullptr};
        std::mutex initM;
        Registry& get() {
            Registry* p = inst.load(std::memory_order_acquire);          // fast path: no lock
            if (!p) {
                std::lock_guard g(initM);
                p = inst.load(std::memory_order_relaxed);                 // re-check under the lock
                if (!p) { p = new Registry(); inst.store(p, std::memory_order_release); }
            }
            return *p;
        }
        Registry& getSimple() { static Registry r; return r; }            // the easy, correct way` },
      { title: 'Reference counting: relaxed up, acq_rel down', html: `<p>This is how <code>shared_ptr</code> implementations order their count. Incrementing can be relaxed (you already hold a reference, nothing to publish). The decrement must be <b>acq_rel</b> (or release + an acquire fence when it hits zero): the thread that destroys the object must see every write other owners made before dropping their references.</p>`, code: R`
        struct Node { std::atomic<int> refs{1}; int value = 0; };
        void addRef(Node* n) { n->refs.fetch_add(1, std::memory_order_relaxed); }
        void release(Node* n) {
            if (n->refs.fetch_sub(1, std::memory_order_acq_rel) == 1)
                delete n;                         // sees all writes by previous owners
        }` }
    ],
    deepDive: `<p><b>Where reordering comes from.</b> (1) The <b>compiler</b>: it may reorder, merge or remove loads and stores to non-atomics, and to relaxed atomics of different variables. (2) The <b>CPU</b>: out-of-order execution, store buffers, and caches that propagate writes at different speeds. x86 uses <b>TSO</b> (total store order): the only visible hardware reordering is a store followed by a later load (StoreLoad). ARM and POWER are weaker: almost any pair can be reordered unless you use barriers or acquire/release instructions. Code that "works" on an x86 laptop can break on ARM servers (AWS Graviton, Apple Silicon).</p>
      <p><b>What gets emitted.</b> x86: relaxed/acquire loads and relaxed/release stores are plain <code>mov</code>s (they only constrain the compiler); a seq_cst store is <code>xchg</code> (an implicit full fence, ≈ 20+ cycles); a seq_cst load is a plain <code>mov</code>. ARM64: acquire load = <code>ldar</code>/<code>ldapr</code>, release store = <code>stlr</code>, with seq_cst using the same instructions (they're designed so <code>stlr</code> followed by <code>ldar</code> is not reordered). So seq_cst's cost is mostly on x86 stores.</p>
      <p><b>Formal pieces you can name in an interview:</b> <i>sequenced-before</i> (program order inside a thread), <i>synchronizes-with</i> (release → acquire that reads the value, or a later value in the <i>release sequence</i> of RMWs), <i>happens-before</i> (the transitive closure), <i>modification order</i> (every atomic has one total order of writes everyone agrees on, called coherence), and the single total order <i>S</i> over seq_cst operations.</p>
      <p><b>Fences.</b> <code>std::atomic_thread_fence(memory_order_release)</code> before a relaxed store, paired with a relaxed load followed by an acquire fence, gives the same synchronization as release/acquire operations, which is handy to upgrade many relaxed operations at once. <code>atomic_signal_fence</code> only restrains the compiler (for signal handlers on the same thread).</p>
      <p><b>IRIW</b> (independent reads of independent writes): two writers write x and y; two readers read them in opposite orders. With acquire/release the readers may <b>disagree</b> about which write happened first (possible on POWER). Only seq_cst forces everyone to agree on one order. If you ever need that, you really need seq_cst.</p>
      <p><b>Testing is weak evidence.</b> Reorderings may show up once in a billion runs, or only on another CPU. Tools: <b>herd7</b> / <b>CppMem</b> (exhaustive litmus checkers for the C++ model), <b>Relacy</b> and <b>CDSChecker</b> (model checkers for small lock-free algorithms), TSan (catches missing happens-before on non-atomics).</p>`,
    aiEra: `<p><b>What AI changes:</b> LLMs can recite the memory-order table and generate litmus tests instantly. They are also great at translating a relaxed/acquire/release design into plain-English happens-before chains, if you ask them to.</p>
      <p><b>Use AI as a partner:</b> prompt <code>"For each atomic operation in this code, state which other operation it synchronizes with, and what data that edge publishes. Flag any relaxed operation whose value is used to decide whether to read other data."</code> Then ask it to produce a herd7/CppMem litmus test for the critical pair and run that tool for real.</p>
      <p><b>Where AI goes wrong:</b> this is one of the areas where models are most confidently wrong: claiming acquire/release fixes store-buffering, saying "relaxed is fine on x86", treating <code>volatile</code> as a fence, or weakening orders "for performance" with no proof. Many training examples come from x86-only code that is subtly broken on ARM.</p>
      <p><b>What you must still own:</b> the rule "use seq_cst or a mutex unless you can draw the happens-before graph", the ability to solve a small litmus test by hand (interleavings first, then allowed reorderings), and the discipline to verify weakened orders with a model checker and ARM hardware, not with a quick run on your laptop.</p>`,
    problems: [{
      title: 'What Can This Print? Fix the Flag Publication',
      level: 'Hard', tags: ['memory order', 'acquire/release', 'litmus test'], companies: ['Jane Street', 'Hudson River Trading', 'Apple', 'Google'],
      statement: `<p>Thread A fills a <code>std::string msg</code> (non-atomic) and then sets <code>std::atomic&lt;bool&gt; done</code> with <code>memory_order_relaxed</code>. Thread B spins until <code>done</code> is true (relaxed) and then prints <code>msg</code>. (1) List everything the program can do. (2) Fix it using the <b>weakest</b> orders that are correct, and explain the happens-before chain.</p>`,
      constraints: `Must be correct on any conforming compiler and CPU (x86, ARM64, POWER). No mutex.`,
      example: `<p>Intended output: <code>hello</code>. With relaxed ordering:</p>${H.table(['possibility', 'why'], [['prints hello', 'the usual case on x86'], ['<span class="c-r">prints empty / garbage / crashes</span>', 'B sees done = true before the writes to msg are visible: data race on msg = UB'], ['spins forever?', 'no: atomics must become visible "eventually", even relaxed']])}`,
      brute: { why: `<p>The relaxed flag gives no ordering between the writes to <code>msg</code> and the write to <code>done</code>. There is no happens-before edge between A writing msg and B reading it, so it is a <b>data race on a non-atomic object</b>: undefined behaviour, not just a stale value.</p>`, code: R`
        std::string msg;
        std::atomic<bool> done{false};
        void writerBAD() {
            msg = "hello";
            done.store(true, std::memory_order_relaxed);        // no release: msg may not be visible
        }
        void readerBAD() {
            while (!done.load(std::memory_order_relaxed)) {}    // no acquire
            std::cout << msg << "\n";                           // DATA RACE on msg (UB)
        }` },
      mcq: { q: 'Which is the weakest correct pair of orders for the done flag?', options: ['store relaxed / load relaxed', 'store release / load acquire', 'store seq_cst / load relaxed', 'store relaxed / load acquire'], answer: 1, explain: 'You need a synchronizes-with edge: a release store read by an acquire load. A seq_cst store with a relaxed load does NOT synchronize (the load side has no acquire). Relaxed on either side breaks the edge.' },
      hints: [`<p><b>Aha:</b> the question is not "is done atomic?" (it is) but "does reading done = true guarantee seeing msg?". That needs a happens-before edge.</p>`, `<p>Release on the store keeps <code>msg = "hello"</code> before it; acquire on the load keeps <code>cout &lt;&lt; msg</code> after it. When the acquire reads the released value they synchronize.</p>`, `<p>Write the chain: <code>msg = "hello"</code> sequenced-before <code>done.store(release)</code> synchronizes-with <code>done.load(acquire)</code> sequenced-before <code>cout &lt;&lt; msg</code> → happens-before → no data race. seq_cst would also work, just stronger than needed.</p>`],
      solution: {
        approach: `<p>Add the release/acquire handshake. The writer's <b>release</b> store means "everything I wrote before this, including msg, travels with the flag". The reader's <b>acquire</b> load, once it reads <code>true</code>, synchronizes-with that store, so the write to msg happens-before the print. The non-atomic <code>msg</code> is now race-free. Possible outputs: only <code>hello</code>.</p>`,
        code: R`
          #include <bits/stdc++.h>
          using namespace std;

          string msg;                                   // ordinary, non-atomic data
          atomic<bool> done{false};

          void writer() {
              msg = "hello";                            // (1) sequenced-before (2)
              done.store(true, memory_order_release);   // (2) release: publishes (1)
          }

          void reader() {
              while (!done.load(memory_order_acquire))  // (3) acquire reads the value from (2): synchronizes-with
                  this_thread::yield();
              cout << msg << "\n";                      // (4) (1) happens-before (4): prints "hello"
          }

          int main() {
              thread r(reader), w(writer);
              w.join(); r.join();
          }`,
        dry: { head: ['step', 'thread', 'operation', 'guarantee gained'], rows: [['1', 'A', 'msg = "hello"', 'sequenced-before step 2'], ['2', 'A', 'done.store(true, release)', 'all earlier writes travel with it'], ['3', 'B', 'done.load(acquire) → false (spin)', 'nothing yet: do not touch msg'], ['4', 'B', 'done.load(acquire) → true', 'synchronizes-with step 2'], ['5', 'B', 'print msg', '<span class="c-g">step 1 happens-before: prints hello</span>']] },
        complexity: `<p>On x86 the fix costs nothing at runtime (plain movs; it only stops compiler reordering). On ARM64 it uses <code>stlr</code>/<code>ldar</code>, a few cycles. The spin loop burns CPU while waiting; for long waits use <code>done.wait(false)</code> (C++20) or a condition_variable.</p>`,
        followUps: ['Replace the spin with C++20 <code>done.wait(false)</code> + <code>done.notify_one()</code>', 'What if the reader only <i>sometimes</i> reads msg (if done) and otherwise moves on?', 'Would <code>volatile bool done</code> work? Why not?']
      }
    }]
  });

  /* ======================================================================
     TOPIC 7 — futures, promises, std::async, packaged_task
     ====================================================================== */
  var FUT = {
    async: {
      code: 'int slowSquare(int x) { /* takes 3 ticks */ return x * x; }\nint main() {\n    auto fut = std::async(std::launch::async, slowSquare, 7);\n    prepareReport();          // main keeps working\n    int v = fut.get();        // wait if needed, then take the result\n    std::cout << v;           // 49\n}',
      steps: [
        ['main() starts', '-', 'none yet', 2, '-', 'One thread so far.', 'cur'],
        ['std::async(launch::async, ...)', 'NEW thread starts slowSquare(7)', 'not ready', 3, 'true', '<code>std::async</code> with <code>launch::async</code> starts the function on a <b>new thread</b> right away and immediately hands back a <b>future</b>: a receipt for a value that does not exist yet. Both share a heap object, the <b>shared state</b>.', 'ok'],
        ['prepareReport()', 'computing (tick 1 of 3)', 'not ready', 4, 'true', 'Main does other useful work while the task runs in parallel. This overlap is the whole point.', 'cur'],
        ['fut.get(): result not ready, main sleeps', 'computing (tick 2 of 3)', 'not ready', 5, 'true', '<code>get()</code> blocks until the shared state becomes ready. Sleeping costs no CPU.', 'win'],
        ['(blocked inside get)', 'returns 49 → stored in shared state', 'READY: 49', 5, 'true', 'The task finishes and the library stores 49 in the shared state, then wakes the waiter. Storing the result <b>happens-before</b> get() returning, so no data race.', 'ok'],
        ['get() returns 49', 'thread finished', 'consumed', 5, 'false', '<code>get()</code> moves the value out. The future is now <b>invalid</b> (<code>valid() == false</code>): get() is one-shot. Use <code>std::shared_future</code> if several readers need it.', 'ok'],
        ['prints 49', '-', 'consumed', 6, 'false', '<span class="c-g">Done.</span> We ran slowSquare in parallel with prepareReport and collected the result safely, without a single mutex in our code.', 'ok']
      ]
    },
    deferred: {
      code: 'int slowSquare(int x) { /* takes 3 ticks */ return x * x; }\nint main() {\n    auto fut = std::async(std::launch::deferred, slowSquare, 7);\n    prepareReport();          // NOTHING runs in parallel\n    int v = fut.get();        // runs slowSquare HERE, on main\n    std::cout << v;           // 49\n}',
      steps: [
        ['main() starts', '-', 'none yet', 2, '-', 'One thread.', 'cur'],
        ['std::async(launch::deferred, ...)', '(no thread created)', 'deferred: function + args saved', 3, 'true', '<b>deferred</b> means lazy: no thread is created. The function and its arguments are just stored inside the shared state.', 'win'],
        ['prepareReport()', '(nothing running)', 'deferred', 4, 'true', 'No parallelism at all: the task has not started.', 'cur'],
        ['fut.get() → runs slowSquare(7) on MAIN', '(still no thread)', 'running on main', 5, 'true', '<code>get()</code> (or <code>wait()</code>) runs the function <b>synchronously on the calling thread</b>.', 'win'],
        ['get() returns 49', '-', 'consumed', 5, 'false', 'Result returned; the future is now invalid.', 'ok'],
        ['prints 49', '-', 'consumed', 6, 'false', 'Same answer, zero concurrency. If nobody ever calls get()/wait(), the function <b>never runs</b>. The default policy (<code>async | deferred</code>) lets the library choose, so pass <code>launch::async</code> when you need real parallelism.', 'ok']
      ]
    },
    exception: {
      code: 'int parsePort(std::string s) { return std::stoi(s); }   // throws on "abc"\nint main() {\n    auto fut = std::async(std::launch::async, parsePort, "abc");\n    try {\n        int p = fut.get();    // the exception is RE-THROWN here\n    } catch (const std::exception& e) {\n        std::cout << "error: " << e.what();\n    }\n}',
      steps: [
        ['main() starts', '-', 'none yet', 2, '-', 'One thread.', 'cur'],
        ['std::async(launch::async, parsePort, "abc")', 'starts parsePort("abc")', 'not ready', 3, 'true', 'The task starts on a new thread.', 'ok'],
        ['enters try, calls fut.get(), sleeps', 'std::stoi("abc") throws invalid_argument', 'not ready', 5, 'true', 'Inside the worker, <code>std::stoi</code> throws. If this were a raw std::thread, the uncaught exception would call <b>std::terminate</b>.', 'win'],
        ['(blocked inside get)', 'async catches it, stores exception_ptr', 'READY: exception', 5, 'true', 'But <code>std::async</code> wraps the call in try/catch and stores the exception in the shared state (as a <code>std::exception_ptr</code>).', 'bad'],
        ['get() RE-THROWS invalid_argument', 'finished', 'consumed', 5, 'false', '<code>get()</code> re-throws the very same exception <b>in the calling thread</b>, so normal try/catch works across threads.', 'bad'],
        ['catch prints "error: stoi"', '-', 'consumed', 7, 'false', '<span class="c-g">Handled.</span> This exception transport is a big reason to prefer futures over hand-rolled threads for tasks that can fail.', 'ok']
      ]
    },
    discard: {
      code: 'void sendEmail() { /* takes 3 ticks */ }\nint main() {\n    std::async(std::launch::async, sendEmail);   // result ignored!\n    std::async(std::launch::async, sendEmail);   // waits for #1 first\n    std::cout << "done";\n}',
      steps: [
        ['main() starts', '-', '-', 2, '-', 'The intent: send two emails in parallel, fire-and-forget.', 'cur'],
        ['async #1 starts, returns a TEMPORARY future', 'email #1 starts', 'not ready', 3, 'true', 'The returned future is not stored in a variable, so it is a temporary destroyed at the end of this statement.', 'cur'],
        ['~future() BLOCKS until email #1 is done', 'email #1 ticks 1..3', 'not ready → ready', 3, 'true', '<span class="c-r">Gotcha:</span> a future that came from <code>std::async</code> <b>waits in its destructor</b> for the task to finish. So this line takes the full 3 ticks.', 'bad'],
        ['async #2 starts', 'email #2 starts (#1 already done)', 'not ready', 4, 'true', 'Only now does the second email start.', 'cur'],
        ['~future() BLOCKS again', 'email #2 ticks 1..3', 'ready', 4, 'true', 'Same story: 3 more ticks of waiting.', 'bad'],
        ['prints done after 6 ticks', '-', '-', 5, '-', 'Total 6 ticks instead of 3: <b>fully sequential</b>. Fix: keep the futures alive (<code>auto f1 = ...; auto f2 = ...;</code>) so both run at once, and get/wait them later.', 'bad']
      ]
    },
    promise: {
      code: 'void worker(std::promise<int> p) {\n    int answer = 6 * 7;      // compute\n    p.set_value(answer);     // fulfil the promise\n}\nint main() {\n    std::promise<int> prom;\n    std::future<int> fut = prom.get_future();\n    std::thread t(worker, std::move(prom));\n    std::cout << fut.get();  // 42\n    t.join();\n}',
      steps: [
        ['creates promise + future', '-', 'not ready', 7, 'true', 'A <b>promise</b> is the "write end" of the channel, the <b>future</b> is the "read end". They share one state.', 'cur'],
        ['std::thread t(worker, move(prom))', 'starts worker, owns the promise', 'not ready', 8, 'true', 'The promise is <b>moved</b> into the worker (promises are move-only).', 'ok'],
        ['fut.get(): sleeps', 'answer = 42', 'not ready', 9, 'true', 'Main waits on the future.', 'win'],
        ['(blocked)', 'p.set_value(42)', 'READY: 42', 3, 'true', '<code>set_value</code> stores the value and wakes the waiter. Use <code>set_exception(std::current_exception())</code> to send an error instead.', 'ok'],
        ['get() returns 42', 'worker returns', 'consumed', 9, 'false', 'If the worker had destroyed the promise without setting it, get() would throw <code>std::future_error</code> with <code>broken_promise</code>.', 'ok'],
        ['t.join()', 'finished', 'consumed', 10, 'false', '<span class="c-g">Done.</span> promise/future works with any thread, callback or event loop, not just std::async.', 'ok']
      ]
    }
  };
  var vizFuture = {
    title: 'Futures timeline: async vs deferred vs exceptions vs the discarded-future trap',
    input: 'async',
    inputLabel: 'Mode: async | deferred | exception | discard | promise',
    gen: function (input) {
      var mode = String(input || 'async').trim().toLowerCase();
      var F = FUT[mode];
      if (!F) throw new Error('Type one of: async, deferred, exception, discard, promise');
      var rows = [], frames = [];
      F.steps.forEach(function (s, k) {
        rows.push([String(k), s[0], s[1], s[2]]);
        var hl = {}; hl[k] = s[6];
        var lh = {}; lh[s[3]] = s[6] === 'bad' ? 'bad' : s[6] === 'ok' ? 'ok' : 'cur';
        frames.push({ narr: s[5], parts: [
          { type: 'table', label: 'Timeline', columns: ['tick', 'main thread', 'task side', 'shared state'], rows: clone(rows), hl: hl },
          { type: 'code', label: 'Program (mode: ' + mode + ')', lang: 'cpp', code: F.code, hl: lh },
          { type: 'vars', label: 'Future', vals: { 'fut.valid()': s[4], 'shared state': s[2] }, hl: { 'shared state': s[6] === 'bad' ? 'bad' : s[2].indexOf('READY') === 0 ? 'ok' : 'cur' } }
        ] });
      });
      return frames;
    }
  };

  topics.push({
    title: 'Futures, Promises, std::async & packaged_task',
    analogy: `<p>At a coffee shop you order, pay, and get a <b>receipt with a number</b>. You don't stand frozen at the counter: you find a table and answer emails. When you need the coffee you go to the counter with your receipt: if it's ready you take it, if not you wait right there. The receipt is a <b>future</b>, the barista's promise to fill it is a <b>promise</b>, and ordering is <b>std::async</b>. If the machine breaks, you get the <b>bad news at the counter</b> instead of the coffee: an exception delivered through the future.</p>`,
    explain: `<p>Threads and mutexes are low-level. Most of the time you just want "<b>run this function somewhere else and give me its result later</b>". That's what futures are for.</p>
      ${H.table(['tool', 'what it is', 'typical use'], [
        ['<code>std::future&lt;T&gt;</code>', 'the read end: <code>get()</code> waits and returns the T (or re-throws the exception), <b>once</b>', 'holding a result that will arrive later'],
        ['<code>std::async(policy, f, args...)</code>', 'runs f and returns a future of its result', 'simple parallel tasks, divide-and-conquer'],
        ['<code>std::promise&lt;T&gt;</code>', 'the write end: <code>set_value</code> / <code>set_exception</code>', 'results from callbacks, threads you manage yourself'],
        ['<code>std::packaged_task&lt;R(Args...)&gt;</code>', 'wraps a callable; calling it fills its future', 'thread pools and task queues'],
        ['<code>std::shared_future&lt;T&gt;</code>', 'copyable future; many threads can <code>get()</code>', 'broadcast a result or a "start" signal']
      ])}
      <p><b>Launch policies:</b> <code>std::launch::async</code> = start on a new thread now. <code>std::launch::deferred</code> = run lazily on whichever thread calls <code>get()</code>/<code>wait()</code>, and never if nobody does. The <b>default</b> (both flags) lets the implementation choose, so always say <code>launch::async</code> if you need real parallelism.</p>
      <p><b>Things to know about futures:</b></p>
      <ul><li><code>get()</code> blocks until ready, then <b>moves</b> the result out; afterwards <code>valid()</code> is false, and calling get() again is a bug.</li>
      <li><code>wait()</code> blocks without taking the result; <code>wait_for(100ms)</code> returns <code>future_status::ready</code>, <code>timeout</code> or <code>deferred</code>.</li>
      <li><b>Exceptions travel:</b> if the task throws, <code>get()</code> re-throws it in your thread.</li>
      <li><span class="c-r"><b>The trap:</b></span> a future returned by <code>std::async</code> <b>blocks in its destructor</b> until the task finishes. Ignoring the return value makes your "parallel" code sequential.</li>
      <li>The result is handed over through a <b>shared state</b>, and making it ready happens-before <code>get()</code> returns, so reading the result is race-free.</li></ul>
      <p><b>When to use what:</b> one-off parallel computation → <code>std::async(launch::async, ...)</code>. Many small tasks → a <b>thread pool</b> of workers taking <code>packaged_task</code>s from a blocking queue. Results coming from callbacks or I/O → <code>promise</code>. Standard C++ futures have no <code>.then()</code> continuations; C++26's <code>std::execution</code> (senders/receivers) is the modern composable model.</p>`,
    clues: ['"compute two halves in parallel and combine" / "parallel merge sort / sum" → <code>std::async(launch::async)</code> + <code>get()</code>', '"return a value from a thread" / "propagate an exception from a worker" → future/promise instead of shared variables', '"thread pool where submit() returns the result" → <code>packaged_task</code> + <code>future</code>', '"wait at most 200 ms for a result" → <code>wait_for</code> + <code>future_status</code>', '"fire-and-forget with std::async is slow / sequential" → discarded future blocks in its destructor', '"many threads wait for one signal / result" → <code>shared_future</code>'],
    code: [R`
      #include <bits/stdc++.h>
      using namespace std;
      using namespace std::chrono_literals;

      long long sumRange(const vector<int>& v, size_t lo, size_t hi) {
          return accumulate(v.begin() + lo, v.begin() + hi, 0LL);
      }

      int main() {
          vector<int> v(1'000'000, 1);
          size_t mid = v.size() / 2;

          // 1) async: left half on a new thread, right half here
          auto left = async(launch::async, sumRange, cref(v), 0, mid);
          long long right = sumRange(v, mid, v.size());
          cout << left.get() + right << "\n";                    // 1000000

          // 2) promise / future with an explicit thread
          promise<string> prom;
          future<string> fut = prom.get_future();
          thread t([p = std::move(prom)]() mutable {
              try { p.set_value("config loaded"); }
              catch (...) { p.set_exception(current_exception()); }
          });
          cout << fut.get() << "\n";
          t.join();

          // 3) packaged_task: wrap a callable, run it anywhere, collect via its future
          packaged_task<int(int, int)> task([](int a, int b) { return a * b; });
          future<int> prod = task.get_future();
          thread runner(std::move(task), 6, 7);
          cout << prod.get() << "\n";                            // 42
          runner.join();

          // 4) timeouts
          auto slow = async(launch::async, [] { this_thread::sleep_for(50ms); return 1; });
          if (slow.wait_for(10ms) == future_status::timeout) cout << "not yet...\n";
          cout << slow.get() << "\n";
      }`],
    codeTitle: ['async, promise, packaged_task and wait_for in one program'],
    viz: vizFuture,
    examples: [
      { title: 'Exceptions cross threads through get()', html: `<p>The worker throws; <code>get()</code> re-throws the same exception object in the caller, where an ordinary try/catch handles it. With a raw <code>std::thread</code> the same throw would call <code>std::terminate</code>.</p>`, code: R`
        int loadUser(int id) {
            if (id < 0) throw std::invalid_argument("negative id");
            return id * 10;
        }
        int main() {
            auto f = std::async(std::launch::async, loadUser, -1);
            try { std::cout << f.get(); }
            catch (const std::invalid_argument& e) { std::cout << "failed: " << e.what() << "\n"; }
        }` },
      { title: 'The discarded-future trap and its fix', html: `<p>Both calls in <code>slowVersion</code> run one after another, because each temporary future waits in its destructor. Keeping the futures alive lets the work overlap. (Other futures, from a promise or packaged_task, do <b>not</b> block in their destructor; only std::async's do.)</p>`, code: R`
        void work() { std::this_thread::sleep_for(std::chrono::milliseconds(100)); }
        void slowVersion() {                       // ~200 ms
            std::async(std::launch::async, work);
            std::async(std::launch::async, work);
        }
        void fastVersion() {                       // ~100 ms
            auto f1 = std::async(std::launch::async, work);
            auto f2 = std::async(std::launch::async, work);
            f1.get(); f2.get();
        }` },
      { title: 'shared_future as a starting gun', html: `<p>All runners wait on copies of one <code>shared_future</code>. When main calls <code>set_value()</code>, every waiter wakes. A plain future could only be waited on by one owner. (A C++20 <code>std::latch</code> is another good fit.)</p>`, code: R`
        int main() {
            std::promise<void> go;
            std::shared_future<void> start = go.get_future().share();
            std::vector<std::thread> runners;
            for (int i = 0; i < 3; ++i)
                runners.emplace_back([start, i] { start.wait(); std::cout << ("runner " + std::to_string(i) + " off\n"); });
            go.set_value();                          // everybody starts now
            for (auto& r : runners) r.join();
        }` },
      { title: 'Choosing: async vs thread pool', html: `<p>libstdc++ (GCC) and libc++ create a <b>new OS thread</b> for every <code>std::async(launch::async)</code> call (MSVC uses a pool). Fine for a handful of big tasks; terrible for 100,000 tiny ones. Rule of thumb: tasks under ~100 µs or more tasks than cores → a thread pool, or a library such as Intel oneTBB / Taskflow / <code>std::execution</code> parallel algorithms like <code>std::reduce(std::execution::par, ...)</code>.</p>`, code: R`
        long long parallelSum(const std::vector<long long>& v) {
            // the standard library can do the splitting for you (C++17 parallel algorithms)
            return std::reduce(v.begin(), v.end(), 0LL);   // add std::execution::par with TBB installed
        }` }
    ],
    deepDive: `<p><b>Shared state internals.</b> A future and its promise/task point to one heap-allocated, reference-counted <b>shared state</b> holding: the value or an <code>exception_ptr</code>, a "ready" flag, and synchronization (typically a mutex + condition variable, or a futex). <code>set_value</code> writes the value, flips ready (release) and wakes waiters; <code>get</code> waits (acquire) and moves the value out. That's the happens-before edge that makes the handoff race-free.</p>
      <p><b>Why std::async futures block on destruction.</b> The committee wanted to prevent detached tasks that outlive everything they reference. The price is the surprising sequential behaviour when you drop the future. Futures from <code>promise</code> and <code>packaged_task</code> don't do this. If you need true fire-and-forget, use a thread pool that owns the work.</p>
      <p><b>Error states.</b> Destroying a promise without setting it stores <code>future_error(broken_promise)</code>; calling <code>get_future()</code> twice or <code>set_value()</code> twice throws <code>future_error</code>. Calling <code>get()</code> on an invalid future (already consumed, or default-constructed) is undefined behaviour; implementations usually throw <code>future_error(no_state)</code>. Check <code>valid()</code> when unsure.</p>
      <p><b>Deferred subtleties.</b> <code>wait_for</code> on a deferred future returns <code>future_status::deferred</code> immediately and never times out. A loop like <code>while (f.wait_for(0s) != future_status::ready)</code> spins forever if the default policy chose deferred. Another reason to pass <code>launch::async</code> explicitly.</p>
      <p><b>Recursion and thread explosion.</b> Divide-and-conquer with <code>std::async</code> at every level creates 2<sup>depth</sup> threads. Cap it: only spawn above a size threshold or below a depth limit, and process the other half on the current thread. Pools with <b>work stealing</b> (TBB, Taskflow, Java's ForkJoin, Rust's Rayon) solve this properly by keeping per-worker deques.</p>
      <p><b>The future of futures.</b> <code>std::experimental::future::then</code> never made it into the standard. C++20 coroutines give you <code>co_await</code>-able task types (from libraries), and C++26 standardizes <b>senders/receivers</b> (<code>std::execution</code>): lazy, composable async pipelines with explicit schedulers, the long-term replacement for chaining futures.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants convert sequential loops into <code>std::async</code> or parallel-algorithm versions instantly, and can scaffold a thread pool with <code>packaged_task</code> in one go.</p>
      <p><b>Use AI as a partner:</b> ask <code>"Where in this code is a std::async future discarded or destroyed early?"</code>, <code>"What happens if this task throws, and where is it caught?"</code>, and <code>"How many OS threads can this recursive async create for n = 10⁷?"</code>. Have it write a benchmark comparing async-per-task vs a pool vs <code>std::reduce(par)</code>.</p>
      <p><b>Where AI goes wrong:</b> it uses the default launch policy and assumes parallelism, ignores the return value of <code>std::async</code> for fire-and-forget, calls <code>get()</code> twice, spawns async at every recursion level, and captures references in tasks that outlive the referenced data.</p>
      <p><b>What you must still own:</b> choosing the right granularity (how big a task must be to be worth a thread), the lifetime of everything a task touches, and the error-handling story. Those are architecture decisions you'll defend in system-design and C++ interviews.</p>`,
    problems: [{
      title: 'Parallel Sum with std::async (Divide & Conquer)',
      level: 'Medium', tags: ['std::async', 'future', 'divide and conquer'], companies: ['Microsoft', 'Bloomberg', 'Adobe'],
      statement: `<p>Implement <code>long long parallelSum(const vector&lt;int&gt;&amp; v)</code> that splits the work recursively: if the range is larger than a threshold, sum the left half with <code>std::async(launch::async)</code> and the right half on the current thread, then combine. Never create more than about <code>hardware_concurrency()</code> concurrent tasks.</p>`,
      constraints: `1 ≤ n ≤ 10<sup>8</sup>, |v[i]| ≤ 10<sup>9</sup> (use long long); threshold ≥ 10<sup>4</sup> elements`,
      example: `<p>v = [1..8], threshold = 2, max depth 2:</p>${H.table(['call', 'range', 'left half', 'right half', 'result'], [['depth 0', '[0,8)', 'async → [0,4)', 'here → [4,8)', '10 + 26 = 36'], ['depth 1 (left)', '[0,4)', 'async → [0,2)', 'here → [2,4)', '3 + 7 = 10'], ['depth 1 (right)', '[4,8)', 'async → [4,6)', 'here → [6,8)', '11 + 15 = 26']])}<p>Output ${H.c('g', '36')}.</p>`,
      brute: { why: `<p>Sequential <code>accumulate</code> uses one core. The naive parallel attempt (async at every level, no threshold) creates one thread per tiny range: for n = 10<sup>6</sup> that's ~10<sup>6</sup> thread creations, which is much slower than the plain loop and may hit the OS thread limit.</p>`, code: R`
        long long sumSequential(const std::vector<int>& v) {
            return std::accumulate(v.begin(), v.end(), 0LL);   // one core
        }
        long long sumExplode(const std::vector<int>& v, size_t lo, size_t hi) {
            if (hi - lo == 1) return v[lo];
            size_t mid = lo + (hi - lo) / 2;
            auto left = std::async(std::launch::async, sumExplode, std::cref(v), lo, mid);   // a thread per node!
            return sumExplode(v, mid, hi) + left.get();
        }` },
      mcq: { q: 'Why compute the right half on the CURRENT thread instead of launching two asyncs?', options: ['async cannot be called twice', 'The current thread would otherwise just sit in get() doing nothing: one async per split halves the number of threads', 'It changes the result', 'get() only works for the left half'], answer: 1, explain: 'Launching both halves leaves the parent idle while it waits. Doing one half yourself keeps every thread busy and halves the thread count.' },
      hints: [`<p><b>Aha:</b> parallel speedup only pays if each task is big enough to amortize ~20–50 µs of thread start-up.</p>`, `<p>Recursive helper <code>sum(v, lo, hi, depth)</code>: if <code>hi - lo &lt; THRESH</code> or <code>depth == 0</code>, use accumulate; else async the left half with depth-1, do the right half here, add <code>left.get()</code>.</p>`, `<p>Start with <code>depth = ⌈log₂(hardware_concurrency())⌉</code> so about that many leaves run at once. Pass the vector with <code>std::cref</code> (async copies its arguments!). Use long long for the sum.</p>`],
      solution: {
        approach: `<p>Divide and conquer with a <b>depth budget</b>: each level spawns one async for the left half and recurses on the right half itself, so depth d gives at most 2<sup>d</sup> concurrent leaves. Small ranges fall back to <code>std::accumulate</code>. Futures carry results (and exceptions) back without any shared mutable state.</p>`,
        code: R`
          #include <bits/stdc++.h>
          using namespace std;

          constexpr size_t THRESH = 10000;

          long long sumRec(const vector<int>& v, size_t lo, size_t hi, int depth) {
              if (hi - lo <= THRESH || depth <= 0)
                  return accumulate(v.begin() + lo, v.begin() + hi, 0LL);   // small or out of budget: sequential
              size_t mid = lo + (hi - lo) / 2;
              // left half on a new thread (cref: avoid copying the whole vector into the task!)
              auto left = async(launch::async, sumRec, cref(v), lo, mid, depth - 1);
              long long right = sumRec(v, mid, hi, depth - 1);              // right half on THIS thread
              return left.get() + right;                                   // waits only if left is slower
          }

          long long parallelSum(const vector<int>& v) {
              unsigned hw = max(1u, thread::hardware_concurrency());
              int depth = 0;
              while ((1u << depth) < hw) ++depth;                          // 2^depth leaves ≈ cores
              return sumRec(v, 0, v.size(), depth);
          }

          int main() {
              vector<int> v(5'000'000);
              iota(v.begin(), v.end(), 1);
              cout << parallelSum(v) << "\n";                               // 12500002500000
          }`,
        dry: { head: ['call', 'lo..hi', 'depth', 'action', 'returns'], rows: [['root', '0..8', '2', 'async(0..4), self(4..8)', '36'], ['self', '4..8', '1', 'async(4..6), self(6..8)', '26'], ['async', '0..4', '1', 'async(0..2), self(2..4)', '10'], ['leaves', '0..2 / 2..4 / 4..6 / 6..8', '0', 'accumulate', '3 / 7 / 11 / 15']] },
        complexity: `<p>Work O(n); span O(n / 2<sup>d</sup> + d); at most 2<sup>d</sup> ≈ cores threads alive. Memory-bandwidth-bound sums usually speed up 3–6× on 8 cores, not 8×, because RAM bandwidth is shared.</p>`,
        followUps: ['Generalize to <code>parallelReduce(first, last, init, op)</code>', 'Compare with <code>std::reduce(std::execution::par, ...)</code>', 'How would work stealing handle uneven work (e.g. a parallel quicksort)?']
      }
    }]
  });

  /* ======================================================================
     PRACTICE — Easy
     ====================================================================== */
  practice.push({
    title: 'Launch N Workers, Print Results in Order',
    level: 'Easy', tags: ['std::thread', 'join', 'vector of threads'], companies: ['Microsoft', 'Bloomberg'],
    statement: `<p>Start <code>n</code> worker threads. Worker <code>i</code> computes <code>score(i) = (i + 1) * 100 + i</code> (pretend it's slow). Main must print all scores <b>in index order 0..n-1</b>, no matter which worker finishes first, and must exit cleanly.</p>`,
    constraints: `1 ≤ n ≤ 64`,
    example: `<p>n = 3 → workers may finish in order 2, 0, 1, but the output is always:</p><pre>0: 100
1: 201
2: 302</pre><p>${H.c('g', 'Each worker writes only its own slot; main reads after join().')}</p>`,
    brute: { why: `<p>Printing from inside the workers gives a random order (and interleaved characters). Forgetting <code>join</code> destroys joinable threads → <code>std::terminate</code>. Detaching means main might exit before workers finish.</p>`, code: R`
      int main() {
          int n = 3;
          for (int i = 0; i < n; ++i) {
              std::thread t([i] { std::cout << i << ": " << (i + 1) * 100 + i << "\n"; });
              t.detach();                       // BUG: random order, may not print at all before exit
          }
      }` },
    mcq: { q: 'Why is it safe for main to read <code>results[i]</code> after the loop of <code>join()</code> calls without any mutex?', options: ['vector is thread-safe', 'join() makes everything the thread did happen-before the code after join()', 'Because ints are atomic', 'It is not safe'], answer: 1, explain: 'Thread completion synchronizes-with the return of join(). After joining, all writes of that thread are visible. Different slots also mean no two workers race with each other.' },
    hints: [`<p>Separate <b>computing</b> (parallel) from <b>printing</b> (in order, on main). Each worker writes its answer to its own slot.</p>`, `<p>Use <code>vector&lt;long long&gt; results(n)</code> and <code>vector&lt;thread&gt; pool</code>; capture <code>i</code> by value and <code>results</code> by reference.</p>`, `<p>Recipe: start all → join all → print results[0..n-1]. Never call join inside the start loop (that would run them one by one).</p>`],
    solution: {
      approach: `<p>Start all workers first, so they truly overlap, with each writing <code>results[i]</code>. Then join every thread; join gives the happens-before edge that makes the results visible. Finally print in order from main. Joining inside the creation loop would serialize the work.</p>`,
      code: R`
        #include <bits/stdc++.h>
        using namespace std;

        long long score(int i) { return (i + 1) * 100LL + i; }   // pretend this is slow

        int main() {
            int n = 5;
            vector<long long> results(n);
            vector<thread> pool;
            pool.reserve(n);
            for (int i = 0; i < n; ++i)
                pool.emplace_back([i, &results] { results[i] = score(i); });   // own slot only
            for (auto& t : pool) t.join();                                     // wait for ALL
            for (int i = 0; i < n; ++i) cout << i << ": " << results[i] << "\n";
        }`,
      dry: { head: ['phase', 'what happens', 'results'], rows: [['start', '5 threads running at once', '[?, ?, ?, ?, ?]'], ['finish (any order)', 'worker 3, 0, 4, 1, 2 write their slots', '[100, 201, 302, 403, 504]'], ['join all', 'main waits; writes become visible', 'same'], ['print', 'main prints 0..4 in order', '0: 100 ... 4: 504']] },
      complexity: `<p>O(n) thread starts and joins; wall time ≈ the slowest worker. O(n) memory.</p>`,
      followUps: ['Rewrite with <code>std::async</code> and a <code>vector&lt;future&lt;long long&gt;&gt;</code>', 'Rewrite with <code>std::jthread</code> so no explicit join loop is needed']
    }
  });

  practice.push({
    title: 'Bug Hunt: The Thread That Changed a Copy',
    level: 'Easy', tags: ['std::ref', 'argument passing', 'lambda capture'], companies: ['Amazon', 'Qualcomm'],
    statement: `<p>A teammate wrote <code>void loadInto(vector&lt;int&gt; out)</code> because <code>std::thread t(loadInto, data)</code> with a reference parameter "didn't compile". Now <code>data</code> is always empty after the thread finishes. Explain both problems and fix the code so the thread fills the caller's vector.</p>`,
    constraints: `The vector must be filled in place (no global variables).`,
    example: `<p>Expected: <code>data.size() == 3</code> after <code>join()</code>. Actual: ${H.c('r', '0')}. The thread filled its <b>own copy</b>, which was destroyed when the thread ended.</p>`,
    brute: { why: `<p><code>std::thread</code> always <b>copies</b> (decay-copies) its arguments into the new thread. A non-const reference parameter cannot bind to that internal copy, so the compiler refused. Changing the parameter to by-value "fixes" compilation but now the thread works on a copy.</p>`, code: R`
      void loadInto(std::vector<int> out) {     // takes a COPY
          out = {1, 2, 3};
      }
      int main() {
          std::vector<int> data;
          std::thread t(loadInto, data);         // copies data into the thread
          t.join();
          std::cout << data.size() << "\n";      // 0
      }` },
    mcq: { q: 'Which call makes the thread write into <code>data</code> itself?', options: ['<code>std::thread t(loadInto, data)</code>', '<code>std::thread t(loadInto, &amp;data)</code> with a by-value vector parameter', '<code>std::thread t(loadInto, std::ref(data))</code> with a <code>vector&lt;int&gt;&amp;</code> parameter', '<code>std::thread t(loadInto, std::move(data))</code>'], answer: 2, explain: 'std::ref wraps a reference in a copyable reference_wrapper, which converts back to vector&lt;int&gt;&amp; inside the thread. You then must keep data alive until join().' },
    hints: [`<p>Remember the rule: <b>std::thread copies every argument</b>, just like std::bind.</p>`, `<p>Make the parameter <code>vector&lt;int&gt;&amp;</code> again and pass <code>std::ref(data)</code>, or use a lambda capturing <code>[&amp;data]</code>.</p>`, `<p>Lifetime check: the referenced object must outlive the thread, so join before <code>data</code> goes out of scope. Never combine a reference with <code>detach()</code>.</p>`],
    solution: {
      approach: `<p>Restore the reference parameter and pass <code>std::ref(data)</code> (or capture by reference in a lambda). Then reason about lifetime: <code>data</code> lives in main and we join before main's scope ends, so the reference never dangles. Reading <code>data</code> after join is race-free.</p>`,
      code: R`
        #include <bits/stdc++.h>
        using namespace std;

        void loadInto(vector<int>& out) {          // real reference again
            out = {1, 2, 3};
        }

        int main() {
            vector<int> data;
            thread t(loadInto, ref(data));          // pass a reference_wrapper
            t.join();                               // data outlives the thread
            cout << data.size() << "\n";            // 3

            vector<int> other;
            thread t2([&other] { other.assign(5, 7); });   // lambda alternative
            t2.join();
            cout << other.size() << "\n";           // 5
        }`,
      dry: { head: ['version', 'what the thread touches', 'data.size() after join'], rows: [['by-value param', 'private copy', '<span class="c-r">0</span>'], ['std::ref + T&amp;', 'main\'s data', '<span class="c-g">3</span>']] },
      complexity: `<p>O(1) extra; no copy of the vector at all with std::ref.</p>`,
      followUps: ['What if you call <code>t.detach()</code> instead of join here?', 'How do you move a large vector INTO a thread efficiently (std::move)?']
    }
  });

  practice.push({
    title: 'Bug Hunt: The Stop Flag That Never Stops',
    level: 'Easy', tags: ['data race', 'atomic<bool>', 'optimizer'], companies: ['Nvidia', 'Tesla', 'Arm'],
    statement: `<p>A background sampler loops <code>while (!stopRequested) { sample(); }</code> where <code>stopRequested</code> is a plain <code>bool</code>. Main sets it to true and joins. In Debug builds it works; in Release (<code>-O2</code>) the program hangs forever. Explain why and fix it. Someone suggests <code>volatile</code>; is that right?</p>`,
    constraints: `Must be correct by the C++ standard on every compiler and CPU.`,
    example: `<p>${H.table(['build', 'behaviour'], [['-O0', 'stops after ~50 ms'], ['-O2', '<span class="c-r">hangs: the loop became while (true)</span>']])}</p>`,
    brute: { why: `<p>Writing a plain bool in one thread while another reads it is a <b>data race</b> (UB). The optimizer may assume no other thread changes it, so it reads the flag once, keeps it in a register, and turns the loop into an infinite loop. <code>volatile</code> forces a memory read, but it is still a data race by the standard and gives no ordering.</p>`, code: R`
      bool stopRequested = false;               // plain bool: data race
      long long samples = 0;
      void sampler() {
          while (!stopRequested) ++samples;     // may compile to: if (!stopRequested) for (;;) ++samples;
      }
      int main() {
          std::thread t(sampler);
          std::this_thread::sleep_for(std::chrono::milliseconds(50));
          stopRequested = true;
          t.join();                             // may hang forever at -O2
      }` },
    mcq: { q: 'Which is the correct, portable fix?', options: ['<code>volatile bool stopRequested</code>', '<code>std::atomic&lt;bool&gt; stopRequested</code>', 'Add <code>sleep_for(1ms)</code> in the loop', 'Compile with -O0'], answer: 1, explain: 'std::atomic makes the access race-free and guarantees the store becomes visible to the loading thread. volatile is not a synchronization primitive in C++; sleeps and -O0 just hide the bug.' },
    hints: [`<p>Ask: is a non-atomic variable written by one thread while another reads it, with no lock? Then it's a data race and the compiler may assume it never changes.</p>`, `<p><code>std::atomic&lt;bool&gt;</code> fixes it: every <code>load()</code> really reads the shared value. In C++20, <code>std::jthread</code> + <code>std::stop_token</code> is a ready-made version.</p>`, `<p>Default seq_cst is fine; if the flag publishes other data (e.g. "results are ready") use release/acquire. For a pure stop signal even relaxed works, but default is simplest.</p>`],
    solution: {
      approach: `<p>Make the flag <code>std::atomic&lt;bool&gt;</code>. The compiler must then perform a real atomic load each iteration, and the store from main is guaranteed to become visible. Better still in C++20: <code>std::jthread</code> whose lambda takes a <code>std::stop_token</code>; its destructor requests stop and joins.</p>`,
      code: R`
        #include <bits/stdc++.h>
        using namespace std;
        using namespace std::chrono_literals;

        atomic<bool> stopRequested{false};
        atomic<long long> samples{0};

        void sampler() {
            while (!stopRequested.load())                 // real load every iteration
                samples.fetch_add(1, memory_order_relaxed);
        }

        int main() {
            thread t(sampler);
            this_thread::sleep_for(50ms);
            stopRequested.store(true);                    // visible to the sampler
            t.join();
            cout << "stopped after " << samples.load() << " samples\n";

            // C++20 version: cooperative cancellation built in
            jthread j([](stop_token st) { while (!st.stop_requested()) this_thread::yield(); });
            this_thread::sleep_for(10ms);
        }                                                 // ~jthread: request_stop() + join()`,
      dry: { head: ['step', 'sampler', 'main'], rows: [['1', 'load → false, sample', 'sleeping'], ['2', 'load → false, sample', 'store(true)'], ['3', 'load → true, exit loop', 'join() waits'], ['4', 'returns', 'join() returns']] },
      complexity: `<p>One atomic load per iteration: on x86 a plain <code>mov</code>, essentially free.</p>`,
      followUps: ['Why is volatile still wrong even though it "works" here?', 'How would you wait for the flag without spinning (atomic::wait / condition_variable)?']
    }
  });

  practice.push({
    title: 'Print in Order (Three Threads)',
    level: 'Easy', tags: ['promise/future', 'synchronization', 'LeetCode 1114'], companies: ['Microsoft', 'Apple', 'Amazon'],
    statement: `<p>Class <code>Foo</code> has <code>first()</code>, <code>second()</code>, <code>third()</code>. Three different threads call them, in <b>any</b> order and at any time. Guarantee the output is always <code>firstsecondthird</code>. Each method is called exactly once.</p>`,
    constraints: `Exactly 3 threads, each calls one method once; no busy-waiting.`,
    example: `<p>Threads start in order C, A, B (third, first, second). Output: ${H.c('g', 'firstsecondthird')}: third() must sleep until second() is done, and second() until first() is done.</p>`,
    brute: { why: `<p>Spinning on a plain <code>int stage</code> is a data race (UB), burns CPU, and can hang at -O2 for the same reason as the stop-flag bug. Sleeping "long enough" is not a guarantee.</p>`, code: R`
      class FooBAD {
          int stage = 0;                            // plain int: data race
      public:
          void first(std::function<void()> pf)  { pf(); stage = 1; }
          void second(std::function<void()> ps) { while (stage != 1) {} ps(); stage = 2; }   // spin + UB
          void third(std::function<void()> pt)  { while (stage != 2) {} pt(); }
      };` },
    mcq: { q: 'Why is <code>std::promise&lt;void&gt;</code> a natural fit here?', options: ['It is faster than a mutex in every case', 'Each "X is done" event happens exactly once, and future::wait() sleeps until it happens, with a happens-before edge', 'promise can be set many times', 'It avoids creating threads'], answer: 1, explain: 'A one-shot event = promise/future. set_value() makes the future ready; wait() blocks without spinning; the handoff orders the prints.' },
    hints: [`<p>You need two one-time signals: "first is done" and "second is done".</p>`, `<p>Use two <code>promise&lt;void&gt;</code> members and keep their futures (get_future can be called only once). <code>second()</code> waits on the first future, <code>third()</code> on the second.</p>`, `<p>Alternatives: a mutex + cv + <code>stage</code> counter with predicates; two C++20 <code>std::binary_semaphore</code>s starting at 0; or <code>std::atomic&lt;int&gt;</code> + <code>wait()/notify_all()</code>.</p>`],
    solution: {
      approach: `<p>Model each "done" event as a promise. <code>first()</code> prints and fulfils p1; <code>second()</code> waits for f1, prints, fulfils p2; <code>third()</code> waits for f2 and prints. The futures are created in the constructor (member initializers run in declaration order, so promises come first). Waiting is blocking, not spinning, and set_value → wait gives the needed ordering.</p>`,
      code: R`
        #include <bits/stdc++.h>
        using namespace std;

        class Foo {
            promise<void> p1, p2;                         // declared first ...
            future<void> f1 = p1.get_future();            // ... so these initializers can use them
            future<void> f2 = p2.get_future();
        public:
            void first(function<void()> printFirst)   { printFirst();  p1.set_value(); }
            void second(function<void()> printSecond) { f1.wait(); printSecond(); p2.set_value(); }
            void third(function<void()> printThird)   { f2.wait(); printThird(); }
        };

        int main() {
            Foo foo;
            thread c([&] { foo.third([] { cout << "third"; }); });
            thread a([&] { foo.first([] { cout << "first"; }); });
            thread b([&] { foo.second([] { cout << "second"; }); });
            a.join(); b.join(); c.join();
            cout << "\n";                                 // firstsecondthird
        }`,
      dry: { head: ['time', 'thread C (third)', 'thread A (first)', 'thread B (second)'], rows: [['1', 'f2.wait() sleeps', '', ''], ['2', '', 'prints first, p1.set_value()', ''], ['3', '', '', 'f1 ready → prints second, p2.set_value()'], ['4', 'wakes → prints third', '', '']] },
      complexity: `<p>O(1) work; each thread blocks at most once; no CPU spinning.</p>`,
      followUps: ['Solve it with C++20 <code>std::binary_semaphore</code>', 'What if each method may be called many times in rounds (FooBar alternately)?']
    }
  });

  /* ======================================================================
     PRACTICE — Medium
     ====================================================================== */
  practice.push({
    title: 'Rate Limiter Counter: incrementIfBelow(limit)',
    level: 'Medium', tags: ['mutex', 'atomic', 'CAS', 'check-then-act'], companies: ['Stripe', 'Cloudflare', 'Uber'],
    statement: `<p>Build a counter shared by request-handler threads with <code>bool tryAcquire()</code>: if the current count is below <code>limit</code>, increment it and return true, otherwise return false (request rejected). Also <code>void release()</code> (decrement) and <code>int inUse()</code>. The count must never exceed <code>limit</code>, under any interleaving. Give a mutex version and a lock-free version.</p>`,
    constraints: `limit ≤ 10<sup>6</sup>, up to 64 threads, millions of calls per second`,
    example: `<p>limit = 2, three threads call tryAcquire() at once → exactly ${H.c('g', 'two get true')}, ${H.c('r', 'one gets false')}; inUse() = 2.</p>`,
    brute: { why: `<p>"if (count.load() &lt; limit) count++" is check-then-act: two threads both see 1 &lt; 2 and both increment to 3. Each operation is atomic, the pair is not.</p>`, code: R`
      class LimiterBAD {
          std::atomic<int> count{0};
          const int limit;
      public:
          explicit LimiterBAD(int l) : limit(l) {}
          bool tryAcquire() {
              if (count.load() < limit) { ++count; return true; }   // two threads can both pass the check
              return false;
          }
      };` },
    mcq: { q: 'In the lock-free version, what does the CAS loop guarantee?', options: ['That no thread ever retries', 'That we only increment if count is STILL the value we compared against the limit', 'That the counter is always even', 'That threads acquire in FIFO order'], answer: 1, explain: 'compare_exchange(cur, cur+1) succeeds only if nobody changed count since we read cur and checked cur &lt; limit, closing the check-then-act gap.' },
    hints: [`<p>The check and the increment must be one indivisible unit: either a lock around both, or a compare-and-swap that only succeeds if the value is unchanged.</p>`, `<p>CAS loop: <code>int cur = count.load(); while (cur &lt; limit) { if (count.compare_exchange_weak(cur, cur + 1)) return true; } return false;</code></p>`, `<p>release() can be a plain <code>fetch_sub(1)</code>. Think about which memory order the acquire path needs (acquire/release if the counter guards other resources; relaxed if it's only a number).</p>`],
    solution: {
      approach: `<p>Two correct designs. <b>Mutex:</b> lock, check, increment, unlock: simple and obviously right. <b>Lock-free:</b> CAS loop: read cur, give up if cur ≥ limit, otherwise CAS cur → cur+1; on failure cur is refreshed and we re-check. The count can never pass the limit because every successful increment was based on an up-to-date value below the limit.</p>`,
      code: R`
        #include <bits/stdc++.h>
        using namespace std;

        class LimiterMutex {
            mutable mutex m;
            int count = 0;
            const int limit;
        public:
            explicit LimiterMutex(int l) : limit(l) {}
            bool tryAcquire() {
                lock_guard<mutex> g(m);                     // check + act under ONE lock
                if (count >= limit) return false;
                ++count;
                return true;
            }
            void release() { lock_guard<mutex> g(m); --count; }
            int inUse() const { lock_guard<mutex> g(m); return count; }
        };

        class LimiterAtomic {
            atomic<int> count{0};
            const int limit;
        public:
            explicit LimiterAtomic(int l) : limit(l) {}
            bool tryAcquire() {
                int cur = count.load(memory_order_relaxed);
                while (cur < limit) {
                    // succeeds only if count is still cur; acquire: we may use the guarded resource next
                    if (count.compare_exchange_weak(cur, cur + 1, memory_order_acquire, memory_order_relaxed))
                        return true;
                }                                            // failure refreshed cur; loop re-checks the limit
                return false;
            }
            void release() { count.fetch_sub(1, memory_order_release); }
            int inUse() const { return count.load(memory_order_relaxed); }
        };

        int main() {
            LimiterAtomic lim(2);
            atomic<int> granted{0};
            {
                vector<jthread> ts;
                for (int i = 0; i < 3; ++i) ts.emplace_back([&] { if (lim.tryAcquire()) ++granted; });
            }
            cout << granted << " " << lim.inUse() << "\n";  // 2 2
        }`,
      dry: { head: ['step', 'T1', 'T2', 'count'], rows: [['1', 'cur = 1', 'cur = 1', '1'], ['2', 'CAS 1→2 ok, true', '', '2'], ['3', '', 'CAS 1→2 fails, cur = 2', '2'], ['4', '', '2 &lt; 2 false → return false', '2']] },
      complexity: `<p>O(1) expected per call. Mutex: ~20 ns uncontended, much more when contended. CAS: lock-free, retries only when another thread just succeeded.</p>`,
      followUps: ['Make tryAcquire block until a slot frees up (std::counting_semaphore)', 'Turn this into a token bucket that refills over time']
    }
  });

  practice.push({
    title: 'Print Odd and Even Numbers Alternately',
    level: 'Medium', tags: ['condition_variable', 'turn-taking'], companies: ['Amazon', 'Oracle', 'Infosys', 'Flipkart'],
    statement: `<p>Thread <b>Odd</b> prints only odd numbers, thread <b>Even</b> prints only even numbers. Together they must print <code>1 2 3 ... N</code> in order. No busy-waiting.</p>`,
    constraints: `1 ≤ N ≤ 10<sup>6</sup>; exactly 2 threads`,
    example: `<p>N = 5 → ${H.c('g', '1 2 3 4 5')}. Odd prints 1, then sleeps until Even has printed 2, and so on. Both threads must exit when the counter passes N.</p>`,
    brute: { why: `<p>Spin-checking a shared counter with an atomic works but wastes 100% of two cores. Using a plain int is a data race. Using <code>sleep_for</code> to take turns is guessing, not synchronization.</p>`, code: R`
      std::atomic<int> nextNum{1};
      void spinPrinter(int parity, int n) {
          while (true) {
              int v = nextNum.load();
              if (v > n) return;
              if (v % 2 == parity) { std::cout << v << ' '; nextNum.store(v + 1); }   // correct but spins at 100% CPU
          }
      }` },
    mcq: { q: 'What must the predicate passed to <code>cv.wait</code> include so both threads exit at the end?', options: ['Only "it is my turn"', '"it is my turn" OR "counter &gt; N"', 'Only "counter &gt; N"', 'Nothing; wait without predicate'], answer: 1, explain: 'When the last number is printed, the other thread is asleep waiting for its turn, which will never come. It must also wake when the work is finished, otherwise it waits forever and join() hangs.' },
    hints: [`<p>Shared state: one integer <code>cur</code> (next number to print), protected by a mutex.</p>`, `<p>Each thread loops: lock → <code>wait(lk, [&amp;]{ return cur &gt; n || cur % 2 == parity; })</code> → if done, return → print → ++cur → notify.</p>`, `<p>Notify after changing <code>cur</code>. With exactly two threads, notify_one works; notify_all is the safe default. Don't forget the exit condition in the predicate.</p>`],
    solution: {
      approach: `<p>One mutex, one condition_variable, one shared counter. A thread may print only when <code>cur</code> has its parity; otherwise it sleeps. After printing it increments and notifies, which hands the turn to the other thread. The predicate also checks <code>cur &gt; n</code> so the waiting thread wakes and exits at the end.</p>`,
      code: R`
        #include <bits/stdc++.h>
        using namespace std;

        int main() {
            const int n = 10;
            mutex m;
            condition_variable cv;
            int cur = 1;                                        // next number to print (guarded by m)

            auto printer = [&](int parity) {
                while (true) {
                    unique_lock<mutex> lk(m);
                    cv.wait(lk, [&] { return cur > n || cur % 2 == parity; });
                    if (cur > n) return;                        // finished: leave (the lock unlocks itself)
                    cout << cur << ' ';
                    ++cur;                                      // hand the turn over ...
                    lk.unlock();
                    cv.notify_all();                            // ... and wake the other thread
                }
            };

            thread odd(printer, 1), even(printer, 0);
            odd.join(); even.join();
            cout << "\n";                                       // 1 2 3 4 5 6 7 8 9 10
        }`,
      dry: { head: ['cur', 'Odd', 'Even'], rows: [['1', 'prints 1 → cur=2, notify', 'waiting (1 is odd)'], ['2', 'waiting', 'prints 2 → cur=3, notify'], ['3', 'prints 3 → cur=4', 'waiting'], ['11', 'cur &gt; n → exit', 'cur &gt; n → exit']] },
      complexity: `<p>O(N) prints; each number costs one handoff (~2–10 µs with kernel wakeups). Turn-taking is inherently sequential, so it's no faster than one thread.</p>`,
      followUps: ['Generalize to K threads printing in round-robin', 'Solve with two C++20 binary_semaphores (ping-pong)']
    }
  });

  practice.push({
    title: 'Bug Hunt: The Logger Deadlock',
    level: 'Medium', tags: ['deadlock', 'lock ordering', 'scoped_lock'], companies: ['Google', 'VMware', 'Oracle'],
    statement: `<p>A service freezes about once a week with 0% CPU. Two code paths exist: <code>saveUser()</code> locks <code>dbMutex</code> and then (to log) <code>logMutex</code>; <code>rotateLogs()</code> locks <code>logMutex</code> and then (to record the rotation in the DB) <code>dbMutex</code>. Explain the freeze and give two different fixes.</p>`,
    constraints: `Both functions are called frequently from many threads.`,
    example: `${H.table(['time', 'thread 1: saveUser', 'thread 2: rotateLogs'], [['1', 'locks dbMutex', ''], ['2', '', 'locks logMutex'], ['3', 'waits for logMutex', ''], ['4', '', 'waits for dbMutex → <span class="c-r">DEADLOCK</span>']])}`,
    brute: { why: `<p>Opposite lock order creates a cycle in the wait-for graph: T1 holds db, wants log; T2 holds log, wants db. It only happens when the timing lines up, which is why it shows up weekly and never in tests.</p>`, code: R`
      std::mutex dbMutex, logMutex;
      void saveUser() {
          std::lock_guard a(dbMutex);
          /* write user row */
          std::lock_guard b(logMutex);      // db -> log
          /* append "user saved" */
      }
      void rotateLogs() {
          std::lock_guard a(logMutex);
          /* rotate file */
          std::lock_guard b(dbMutex);       // log -> db  (opposite order!)
          /* record rotation */
      }` },
    mcq: { q: 'Which change does NOT reliably fix this deadlock?', options: ['Lock both with std::scoped_lock(dbMutex, logMutex) in both functions', 'Always lock dbMutex before logMutex everywhere', 'Release the first lock before taking the second (no nesting)', 'Add a 1 ms sleep before the second lock'], answer: 3, explain: 'Sleeping changes the timing but the cycle is still possible. The other three remove hold-and-wait or the circular order.' },
    hints: [`<p>Draw who holds what and who waits for what. A cycle = deadlock.</p>`, `<p>Fix A: one global order (db before log) or <code>std::scoped_lock</code>. Fix B: don't hold one lock while taking the other: finish the DB work, unlock, then log.</p>`, `<p>Fix B is often best in practice: logging under a DB lock also makes the critical section slow. Copy what you need to log while locked, log after unlocking.</p>`],
    solution: {
      approach: `<p><b>Fix 1 (ordering):</b> acquire both with <code>std::scoped_lock</code> (or one documented global order). <b>Fix 2 (narrow critical sections):</b> never nest: do the DB work under dbMutex, release it, then log under logMutex. Fix 2 also shortens lock hold times. Prevent recurrence with a lock-hierarchy convention or Clang thread-safety annotations.</p>`,
      code: R`
        #include <bits/stdc++.h>
        using namespace std;

        mutex dbMutex, logMutex;
        vector<string> dbRows, logLines;

        // Fix 2: no nesting — finish with one lock before taking the other
        void saveUser(const string& name) {
            {
                lock_guard<mutex> a(dbMutex);
                dbRows.push_back(name);
            }                                           // dbMutex released here
            lock_guard<mutex> b(logMutex);
            logLines.push_back("saved " + name);
        }

        // Fix 1: when both are truly needed together, take them as one unit
        void rotateLogs() {
            scoped_lock both(logMutex, dbMutex);        // deadlock-free in any argument order
            logLines.clear();
            dbRows.push_back("log rotated");
        }

        int main() {
            {
                vector<jthread> ts;
                for (int i = 0; i < 4; ++i) {
                    ts.emplace_back([i] { for (int k = 0; k < 1000; ++k) saveUser("u" + to_string(i)); });
                    ts.emplace_back([] { for (int k = 0; k < 100; ++k) rotateLogs(); });
                }
            }                                           // never hangs
            cout << dbRows.size() << "\n";              // 4000 + 400 = 4400
        }`,
      dry: { head: ['time', 'saveUser', 'rotateLogs'], rows: [['1', 'lock db, insert, unlock db', ''], ['2', '', 'scoped_lock(log, db) → gets both'], ['3', 'lock log → waits (holds nothing else)', 'clear logs, insert, unlock both'], ['4', 'gets log, appends', '']] },
      complexity: `<p>No extra cost for Fix 2 (shorter hold times usually make it faster). scoped_lock adds a try-lock/back-off only under contention.</p>`,
      followUps: ['How would you detect potential deadlocks automatically (lock-order graphs, TSan deadlock detector)?', 'What is a lock hierarchy and how would you enforce it at runtime?']
    }
  });

  practice.push({
    title: 'Bug Hunt: The Job Queue That Sometimes Crashes and Sometimes Hangs',
    level: 'Medium', tags: ['condition_variable', 'lost wakeup', 'spurious wakeup'], companies: ['Meta', 'Bloomberg', 'Snowflake'],
    statement: `<p>This job queue crashes rarely (pop from an empty queue) and hangs rarely (a worker sleeps although jobs are queued). Find <b>both</b> bugs in the code below and fix them.</p><pre>void push(int j) { jobs.push(j); cv.notify_one(); }
int pop() {
    std::unique_lock lk(m);
    if (jobs.empty()) cv.wait(lk);
    int j = jobs.front(); jobs.pop(); return j;
}</pre>`,
    constraints: `Several producers and several consumers.`,
    example: `${H.table(['bug', 'symptom', 'cause'], [['push without the mutex', 'hang / corruption', 'data race on the queue, and the lost wakeup window'], ['if instead of while', 'crash: front() on empty', 'spurious or stolen wakeup']])}`,
    brute: { why: `<p>(1) <code>push</code> modifies <code>jobs</code> without the mutex: a data race with <code>pop</code>, and a notify can land between a consumer's empty-check and its wait (lost wakeup → sleeps forever). (2) <code>if</code> doesn't re-check after waking: a spurious wakeup or another consumer stealing the job leaves the queue empty.</p>`, code: R`
      std::mutex m;
      std::condition_variable cv;
      std::queue<int> jobs;
      void pushBAD(int j) { jobs.push(j); cv.notify_one(); }        // no lock
      int popBAD() {
          std::unique_lock lk(m);
          if (jobs.empty()) cv.wait(lk);                            // if, not while
          int j = jobs.front(); jobs.pop();
          return j;
      }` },
    mcq: { q: 'A consumer checked <code>jobs.empty()</code> (true) and is about to call wait(). The producer pushes and notifies WITHOUT the lock right now. What happens?', options: ['The consumer gets the notification later', 'The notify is lost; the consumer then sleeps although a job is queued', 'wait() returns immediately because it remembers the notify', 'The program throws'], answer: 1, explain: 'condition_variable has no memory. If the notify happens before the consumer is registered as a waiter, it is lost. Taking the mutex in push makes this window impossible, because push cannot run between check and wait.' },
    hints: [`<p>Two independent rules are broken: "modify shared state under the mutex" and "always re-check the condition after waking".</p>`, `<p>push: <code>{ lock_guard g(m); jobs.push(j); } cv.notify_one();</code>. pop: <code>cv.wait(lk, [&amp;]{ return !jobs.empty(); });</code></p>`, `<p>Bonus: add a <code>closed</code> flag for shutdown and include it in the predicate, with <code>notify_all</code> in close().</p>`],
    solution: {
      approach: `<p>Push under the mutex (removes the data race and the lost-wakeup window), and wait with a predicate (handles spurious and stolen wakeups). Add a shutdown flag so consumers can exit. The notify can happen after unlocking.</p>`,
      code: R`
        #include <bits/stdc++.h>
        using namespace std;

        class JobQueue {
            mutex m;
            condition_variable cv;
            queue<int> jobs;
            bool closed = false;
        public:
            void push(int j) {
                { lock_guard<mutex> g(m); jobs.push(j); }       // FIX 1: modify under the mutex
                cv.notify_one();
            }
            optional<int> pop() {
                unique_lock<mutex> lk(m);
                cv.wait(lk, [&] { return !jobs.empty() || closed; });   // FIX 2: predicate = while loop
                if (jobs.empty()) return nullopt;               // closed and drained
                int j = jobs.front(); jobs.pop();
                return j;
            }
            void close() { { lock_guard<mutex> g(m); closed = true; } cv.notify_all(); }
        };

        int main() {
            JobQueue q;
            atomic<int> done{0};
            vector<thread> workers;
            for (int i = 0; i < 3; ++i) workers.emplace_back([&] { while (q.pop()) ++done; });
            for (int j = 0; j < 1000; ++j) q.push(j);
            q.close();
            for (auto& w : workers) w.join();
            cout << done << "\n";                               // 1000
        }`,
      dry: { head: ['time', 'consumer', 'producer (fixed)'], rows: [['1', 'lock, sees empty, wait() → unlock + sleep', ''], ['2', '', 'lock (now possible), push, unlock'], ['3', '', 'notify_one → consumer woken'], ['4', 're-lock, predicate true → pop', '']] },
      complexity: `<p>O(1) per operation; the fix adds one uncontended lock to push (~20 ns).</p>`,
      followUps: ['Is it OK to call notify_one() while still holding the lock?', 'Why does an atomic&lt;bool&gt; flag alone not fix the lost wakeup?']
    }
  });

  practice.push({
    title: 'Many Producers, Many Consumers, Clean Shutdown',
    level: 'Medium', tags: ['producer-consumer', 'shutdown', 'condition_variable'], companies: ['Amazon', 'Databricks', 'Confluent'],
    statement: `<p>P producer threads each produce the numbers 1..K. C consumer threads must process (sum) <b>every</b> number exactly once and then <b>all</b> exit. Implement it without busy-waiting, and make sure no consumer hangs at shutdown and no item is lost.</p>`,
    constraints: `1 ≤ P, C ≤ 16; 1 ≤ K ≤ 10<sup>6</sup>; expected total = P · K(K+1)/2`,
    example: `<p>P = 2, C = 3, K = 1000 → total must be ${H.c('g', '2 × 500500 = 1001000')}, and the program must terminate.</p>`,
    brute: { why: `<p>Common broken shutdowns: (a) consumers loop <code>while (!q.empty())</code>, so they quit early when the queue is momentarily empty; (b) one "poison pill" for C consumers, so only one exits and the others hang; (c) close() uses notify_one, waking only one sleeper.</p>`, code: R`
      std::mutex m; std::queue<int> q; long long total = 0;
      void consumerBAD() {
          while (true) {
              std::lock_guard g(m);
              if (q.empty()) return;            // BUG: queue may be empty only for a moment
              total += q.front(); q.pop();
          }
      }` },
    mcq: { q: 'When is it safe to call <code>close()</code> on the queue?', options: ['Right after starting the producers', 'After ALL producer threads have been joined', 'When the queue becomes empty', 'From any consumer'], answer: 1, explain: 'Close means "no more items will ever come". That is only true after every producer has finished, which you know by joining them. Consumers then drain the rest and exit.' },
    hints: [`<p>The exit condition is "queue empty <b>and</b> no more items will come", not just "queue empty".</p>`, `<p>Use a blocking queue whose pop returns <code>optional&lt;T&gt;</code>: empty optional only when closed and drained. Join producers, then close, then join consumers.</p>`, `<p>close() must <code>notify_all</code>. Accumulate per consumer locally and merge once at the end to avoid a shared hot counter.</p>`],
    solution: {
      approach: `<p>Blocking queue with a <code>closed</code> flag. Consumers loop on <code>pop()</code>, which sleeps while the queue is empty and open, and returns nullopt only when closed <b>and</b> empty. The orchestration order: start consumers, start producers, join producers, close (notify_all), join consumers. Each consumer keeps a local sum and adds it to an atomic once.</p>`,
      code: R`
        #include <bits/stdc++.h>
        using namespace std;

        template <class T>
        class ClosableQueue {
            mutex m; condition_variable cv; deque<T> q; bool closed = false;
        public:
            void push(T v) { { lock_guard<mutex> g(m); q.push_back(std::move(v)); } cv.notify_one(); }
            optional<T> pop() {
                unique_lock<mutex> lk(m);
                cv.wait(lk, [&] { return !q.empty() || closed; });
                if (q.empty()) return nullopt;                    // closed AND drained
                T v = std::move(q.front()); q.pop_front();
                return v;
            }
            void close() { { lock_guard<mutex> g(m); closed = true; } cv.notify_all(); }
        };

        int main() {
            const int P = 2, C = 3, K = 1000;
            ClosableQueue<int> q;
            atomic<long long> total{0};

            vector<thread> consumers, producers;
            for (int c = 0; c < C; ++c)
                consumers.emplace_back([&] {
                    long long mine = 0;
                    while (auto v = q.pop()) mine += *v;          // ends only after close + drain
                    total += mine;                                // one shared update per consumer
                });
            for (int p = 0; p < P; ++p)
                producers.emplace_back([&] { for (int i = 1; i <= K; ++i) q.push(i); });

            for (auto& t : producers) t.join();                   // 1) no more items will come
            q.close();                                            // 2) tell everyone
            for (auto& t : consumers) t.join();                   // 3) they drain and exit
            cout << total << "\n";                                // 1001000
        }`,
      dry: { head: ['phase', 'producers', 'consumers', 'queue'], rows: [['run', 'pushing 1..K', 'popping, summing locally', 'varies'], ['producers joined', 'done', 'still draining', 'maybe non-empty'], ['close()', '-', 'all woken; keep popping', 'draining'], ['drained', '-', 'pop → nullopt → exit', 'empty']] },
      complexity: `<p>O(P·K) total pushes/pops, each O(1) plus lock cost. Throughput is limited by the single mutex (~10<sup>6</sup>–10<sup>7</sup> ops/s); shard queues if you need more.</p>`,
      followUps: ['Make the queue bounded so producers get back-pressure', 'How would you cancel immediately (drop remaining items) instead of draining?']
    }
  });

  practice.push({
    title: 'Parallel Word Count with std::async',
    level: 'Medium', tags: ['std::async', 'map-reduce', 'no shared state'], companies: ['Google', 'Microsoft', 'Databricks'],
    statement: `<p>Given a large <code>vector&lt;string&gt; words</code>, return an <code>unordered_map&lt;string,int&gt;</code> with the frequency of each word, using up to T tasks. Design it so that <b>no locks</b> are needed during counting.</p>`,
    constraints: `n ≤ 10<sup>7</sup> words, T ≤ hardware_concurrency()`,
    example: `<p>words = [a, b, a, c, b, a], T = 2 → task 0 counts [a, b, a] = {a:2, b:1}; task 1 counts [c, b, a] = {c:1, b:1, a:1}; merge → ${H.c('g', '{a:3, b:2, c:1}')}.</p>`,
    brute: { why: `<p>One shared map protected by a mutex: every single word locks the same mutex, so the threads mostly wait for each other and it's often <i>slower</i> than one thread. Without the mutex it's a data race that corrupts the map.</p>`, code: R`
      std::unordered_map<std::string, int> countShared(const std::vector<std::string>& w, int T) {
          std::unordered_map<std::string, int> freq; std::mutex m;
          std::vector<std::thread> ts;
          for (int t = 0; t < T; ++t)
              ts.emplace_back([&, t] {
                  for (size_t i = t; i < w.size(); i += T) { std::lock_guard g(m); ++freq[w[i]]; }   // contention on every word
              });
          for (auto& th : ts) th.join();
          return freq;
      }` },
    mcq: { q: 'Why does the map-reduce design need no mutex at all?', options: ['unordered_map is thread-safe for different keys', 'Each task owns a private map; maps are only combined on one thread after get() returns them', 'std::async adds a lock automatically', 'Strings are immutable'], answer: 1, explain: 'Nothing is shared and mutable during the parallel phase. The future hands each partial map back with a happens-before edge, and the merge runs on a single thread.' },
    hints: [`<p><b>Map</b> phase: each task counts its own chunk into its own local map. <b>Reduce</b> phase: merge the partial maps.</p>`, `<p>Launch tasks with <code>async(launch::async, countChunk, cref(words), lo, hi)</code> returning a map; collect futures in a vector.</p>`, `<p>Merge into the largest map to reduce work; reserve buckets; pass the words by const reference (std::cref) to avoid copying 10<sup>7</sup> strings.</p>`],
    solution: {
      approach: `<p>Split the vector into T contiguous chunks; each async task builds a <b>private</b> frequency map for its chunk (no sharing, so no locks); the main thread then merges the T partial maps. This is map-reduce in miniature, and the same idea behind per-thread counters and parallel reductions.</p>`,
      code: R`
        #include <bits/stdc++.h>
        using namespace std;

        using Freq = unordered_map<string, int>;

        Freq countChunk(const vector<string>& w, size_t lo, size_t hi) {
            Freq local;                                        // private to this task
            for (size_t i = lo; i < hi; ++i) ++local[w[i]];
            return local;
        }

        Freq parallelCount(const vector<string>& w, int T) {
            vector<future<Freq>> parts;
            size_t chunk = (w.size() + T - 1) / T;
            for (int t = 0; t < T; ++t) {
                size_t lo = t * chunk, hi = min(w.size(), lo + chunk);
                if (lo >= hi) break;
                parts.push_back(async(launch::async, countChunk, cref(w), lo, hi));
            }
            Freq total;
            for (auto& f : parts)                              // reduce on one thread
                for (auto& [word, c] : f.get()) total[word] += c;
            return total;
        }

        int main() {
            vector<string> w = {"a", "b", "a", "c", "b", "a"};
            Freq f = parallelCount(w, 2);
            cout << f["a"] << f["b"] << f["c"] << "\n";        // 321
        }`,
      dry: { head: ['task', 'chunk', 'partial map'], rows: [['0', '[a, b, a]', '{a:2, b:1}'], ['1', '[c, b, a]', '{c:1, b:1, a:1}'], ['merge', '-', '{a:3, b:2, c:1}']] },
      complexity: `<p>Work O(n + T·U) where U = distinct words per chunk (the merge); span O(n/T + T·U). Memory O(T·U) for partial maps.</p>`,
      followUps: ['How would you merge the T maps in parallel too (tree reduction)?', 'Which is better for skewed data: static chunks or a shared atomic work index?']
    }
  });

  /* ======================================================================
     PRACTICE — Hard
     ====================================================================== */
  practice.push({
    title: 'Implement a Thread Pool Whose submit() Returns a Future',
    level: 'Hard', tags: ['thread pool', 'packaged_task', 'condition_variable', 'templates'], companies: ['Bloomberg', 'Microsoft', 'Nvidia', 'Two Sigma'],
    statement: `<p>Implement <code>ThreadPool(size_t n)</code> with <code>submit(f, args...)</code> that queues any callable and returns a <code>std::future</code> of its result. Exceptions thrown by tasks must reach the caller through the future. The destructor must finish all queued tasks and join every worker. Submitting after shutdown should throw.</p>`,
    constraints: `n ≤ 256 workers, millions of tasks; tasks may return any type including void.`,
    example: `<p><code>ThreadPool pool(4); auto f = pool.submit([](int a, int b){ return a + b; }, 2, 3);</code> → <code>f.get() == 5</code>. A task that throws <code>runtime_error("x")</code> makes its <code>get()</code> rethrow ${H.c('r', 'runtime_error')} in the caller.</p>`,
    brute: { why: `<p>One <code>std::async</code> (one OS thread) per task: ~20–50 µs of thread creation each, unbounded thread count under load, and terrible cache behaviour. A pool reuses a fixed set of threads.</p>`, code: R`
      template <class F>
      auto submitNaive(F f) {
          return std::async(std::launch::async, std::move(f));   // a brand-new thread per task
      }` },
    mcq: { q: 'Why is the packaged_task wrapped in a <code>shared_ptr</code> before being put in a <code>std::queue&lt;std::function&lt;void()&gt;&gt;</code>?', options: ['To make it faster', 'std::function requires a copyable callable, and packaged_task is move-only', 'To share it between several workers that all run it', 'shared_ptr makes it thread-safe'], answer: 1, explain: 'std::function needs CopyConstructible targets. Capturing a shared_ptr makes the lambda copyable. (C++23 std::move_only_function removes the need.)' },
    hints: [`<p>Parts: a vector of worker threads, a queue of type-erased jobs <code>function&lt;void()&gt;</code>, a mutex + condition_variable, and a <code>stopping</code> flag.</p>`, `<p>submit: build <code>packaged_task&lt;R()&gt;</code> from <code>bind(f, args...)</code>, take its future, push a lambda that runs it, then notify_one. Workers: wait(pred: stopping or !empty), pop, unlock, run.</p>`, `<p>Destructor: set stopping under the lock, notify_all, join all. Workers exit only when <code>stopping &amp;&amp; queue empty</code> so queued tasks still finish. Run the job <b>outside</b> the lock.</p>`],
    solution: {
      approach: `<p>Classic design: N workers loop on a condition variable, pulling type-erased jobs from a shared queue. <code>submit</code> wraps the call in a <code>packaged_task</code>, which captures the return value <i>or</i> the exception into its shared state, so the caller gets results and errors through the future. Shutdown sets a flag, wakes everyone, and joins; workers drain remaining jobs first. Jobs run outside the lock, so the lock is held only for the push/pop.</p>`,
      code: R`
        #include <bits/stdc++.h>
        using namespace std;

        class ThreadPool {
            vector<thread> workers;
            queue<function<void()>> jobs;
            mutex m;
            condition_variable cv;
            bool stopping = false;

            void workerLoop() {
                while (true) {
                    function<void()> job;
                    {
                        unique_lock<mutex> lk(m);
                        cv.wait(lk, [&] { return stopping || !jobs.empty(); });
                        if (stopping && jobs.empty()) return;        // drained: exit
                        job = std::move(jobs.front());
                        jobs.pop();
                    }                                                // unlock BEFORE running the job
                    job();                                           // packaged_task stores result/exception
                }
            }
        public:
            explicit ThreadPool(size_t n) {
                for (size_t i = 0; i < n; ++i) workers.emplace_back([this] { workerLoop(); });
            }

            template <class F, class... Args>
            auto submit(F&& f, Args&&... args) -> future<invoke_result_t<F, Args...>> {
                using R = invoke_result_t<F, Args...>;
                auto task = make_shared<packaged_task<R()>>(
                    bind(std::forward<F>(f), std::forward<Args>(args)...));
                future<R> fut = task->get_future();
                {
                    lock_guard<mutex> g(m);
                    if (stopping) throw runtime_error("submit on a stopped ThreadPool");
                    jobs.emplace([task] { (*task)(); });             // shared_ptr keeps the lambda copyable
                }
                cv.notify_one();
                return fut;
            }

            ~ThreadPool() {
                { lock_guard<mutex> g(m); stopping = true; }
                cv.notify_all();                                     // wake every worker
                for (auto& w : workers) w.join();                    // they finish queued jobs first
            }
        };

        int main() {
            ThreadPool pool(4);
            auto sum = pool.submit([](int a, int b) { return a + b; }, 2, 3);
            auto bad = pool.submit([]() -> int { throw runtime_error("task failed"); });
            vector<future<int>> squares;
            for (int i = 0; i < 8; ++i) squares.push_back(pool.submit([i] { return i * i; }));

            cout << sum.get() << "\n";                               // 5
            try { bad.get(); } catch (const exception& e) { cout << e.what() << "\n"; }
            int total = 0;
            for (auto& f : squares) total += f.get();
            cout << total << "\n";                                   // 140
        }`,
      dry: { head: ['event', 'queue', 'workers', 'futures'], rows: [['submit(sum)', '[sum]', 'one woken', 'sum: not ready'], ['worker runs sum', '[]', 'job() outside lock', 'sum: ready 5'], ['submit(bad)', '[bad]', 'one woken', 'bad: not ready'], ['bad throws', '[]', 'packaged_task stores exception', 'bad: ready (exception)'], ['~ThreadPool', '[]', 'stopping=true, notify_all, join', 'all done']] },
      complexity: `<p>submit/pop: O(1) + one lock. Per-task overhead ≈ 1–5 µs (allocation + handoff) vs ~20–50 µs for a new thread. The single queue becomes the bottleneck above ~10<sup>6</sup> tasks/s; then use per-worker queues with work stealing.</p>`,
      followUps: ['Add work stealing with per-worker deques', 'What happens if a task submits another task and waits on its future while all workers are busy (pool deadlock)?', 'Replace the shared_ptr trick with C++23 std::move_only_function']
    }
  });

  practice.push({
    title: 'What Can This Print? The Two-Flag Mutual Exclusion Puzzle',
    level: 'Hard', tags: ['memory order', 'seq_cst', 'store buffering', 'Dekker'], companies: ['Jane Street', 'Optiver', 'Citadel Securities', 'Apple'],
    statement: `<p>Two threads try to build mutual exclusion from two flags:</p><pre>Thread A: flagA.store(true, release); if (!flagB.load(acquire)) print("A");
Thread B: flagB.store(true, release); if (!flagA.load(acquire)) print("B");</pre><p>Flags start false. List every possible output. Then change the code (still without a mutex) so that <b>at most one</b> letter can ever be printed, and explain why acquire/release was not enough.</p>`,
    constraints: `Any conforming compiler and CPU, including x86 (TSO) and ARM.`,
    example: `<p>Possible outputs with release/acquire: ${H.c('g', '"A"')}, ${H.c('g', '"B"')}, ${H.c('y', '"" (neither)')}, and ${H.c('r', '"AB" / "BA" (both!)')}. The last one breaks mutual exclusion.</p>`,
    brute: { why: `<p>Release only keeps <b>earlier</b> operations before the store; acquire only keeps <b>later</b> operations after the load. Nothing stops "my store" and "my later load of the other flag" from being reordered (StoreLoad). Each core's store can sit in its store buffer while it reads the other flag as false from memory. Even x86 does this.</p>`, code: R`
      std::atomic<bool> flagA{false}, flagB{false};
      void threadA() {
          flagA.store(true, std::memory_order_release);
          if (!flagB.load(std::memory_order_acquire)) std::cout << "A";   // both A and B may print
      }
      void threadB() {
          flagB.store(true, std::memory_order_release);
          if (!flagA.load(std::memory_order_acquire)) std::cout << "B";
      }` },
    mcq: { q: 'Which change guarantees that "AB" can never be printed?', options: ['Use memory_order_relaxed everywhere', 'Use memory_order_seq_cst for the stores and the loads', 'Make the flags volatile', 'Swap the order of store and load'], answer: 1, explain: 'seq_cst puts all four operations into one total order. Whichever store comes first in that order, the other thread\'s later load must see it, so at least one load reads true. Swapping store and load breaks the protocol completely.' },
    hints: [`<p>First enumerate all 6 interleavings: in every one, at least one thread sees the other's flag as true. So "AB" can only come from <b>reordering</b>.</p>`, `<p>The pattern "store X; load Y" in one thread and "store Y; load X" in the other is the <b>store-buffering</b> litmus test. Only seq_cst (or seq_cst fences between store and load) forbids both loads returning false.</p>`, `<p>Fix: default seq_cst on all four operations, or keep the orders and put <code>atomic_thread_fence(memory_order_seq_cst)</code> between each store and load. Real code should just use std::mutex.</p>`],
    solution: {
      approach: `<p>With seq_cst, all seq_cst operations appear in a single total order S consistent with each thread's program order. Suppose flagA.store comes before flagB.store in S. Then B's load of flagA comes after flagA.store in S, so it reads true and B does not print. Symmetrically for the other case. Therefore at most one thread prints. This is why Dekker's and Peterson's algorithms need sequential consistency. On x86 the compiler emits <code>xchg</code> (or <code>mov</code> + <code>mfence</code>) for the seq_cst stores, which drains the store buffer before the load.</p>`,
      code: R`
        #include <bits/stdc++.h>
        using namespace std;

        atomic<bool> flagA{false}, flagB{false};
        atomic<int> entered{0};

        void threadA() {
            flagA.store(true);                         // seq_cst (the default)
            if (!flagB.load()) entered.fetch_add(1);   // "A enters"
        }
        void threadB() {
            flagB.store(true);
            if (!flagA.load()) entered.fetch_add(1);   // "B enters"
        }

        // Equivalent with explicit fences, keeping weaker operations:
        void threadAFenced() {
            flagA.store(true, memory_order_relaxed);
            atomic_thread_fence(memory_order_seq_cst);  // StoreLoad barrier
            if (!flagB.load(memory_order_relaxed)) entered.fetch_add(1);
        }

        int main() {
            int violations = 0;
            for (int i = 0; i < 20000; ++i) {
                flagA = false; flagB = false; entered = 0;
                thread a(threadA), b(threadB);
                a.join(); b.join();
                if (entered.load() == 2) ++violations;
            }
            cout << "both entered: " << violations << " times\n";   // always 0 with seq_cst
        }`,
      dry: { head: ['orders used', '"" possible?', '"A" or "B"?', '"AB" possible?'], rows: [['relaxed', 'yes (both stores first)', 'yes', '<span class="c-r">yes</span>'], ['release / acquire', 'yes', 'yes', '<span class="c-r">yes</span>'], ['seq_cst', 'yes', 'yes', '<span class="c-g">no</span>']] },
      complexity: `<p>Each seq_cst store costs a full fence on x86 (~20–30 cycles more than a plain store). That's exactly why hardware vendors made StoreLoad reordering the one reordering x86 allows.</p>`,
      followUps: ['Nothing printed ("") is possible even with seq_cst: give the interleaving. Why is that acceptable for mutual exclusion but bad for progress?', 'Why is a mutex-based solution still preferred in production?', 'What does the IRIW litmus test show that store-buffering does not?']
    }
  });

  practice.push({
    title: 'Build a Correct Spinlock (and Explain Each Memory Order)',
    level: 'Hard', tags: ['atomic', 'spinlock', 'acquire/release', 'TTAS'], companies: ['Nvidia', 'Intel', 'Hudson River Trading'],
    statement: `<p>Implement <code>SpinLock</code> with <code>lock()</code>, <code>try_lock()</code> and <code>unlock()</code> using <code>std::atomic&lt;bool&gt;</code>, usable with <code>std::lock_guard</code>. Use the weakest correct memory orders and avoid hammering the cache line while waiting. Explain what breaks if <code>unlock()</code> used <code>memory_order_relaxed</code>.</p>`,
    constraints: `Critical sections are tiny (&lt; 100 ns); up to 8 threads on 8 cores.`,
    example: `<p>Two threads each do 10<sup>6</sup> increments of a plain <code>long long</code> under the spinlock → ${H.c('g', '2,000,000')} every time, with no data race reported by TSan.</p>`,
    brute: { why: `<p>"if (!locked.load()) locked.store(true)" is check-then-act: both threads can see false and both enter. Also, using relaxed for lock/unlock gives no happens-before between critical sections: writes inside one critical section may not be visible to the next owner, a data race on the protected data.</p>`, code: R`
      class SpinLockBAD {
          std::atomic<bool> locked{false};
      public:
          void lock() {
              while (true) {
                  if (!locked.load()) { locked.store(true); return; }   // two threads can both get here
              }
          }
          void unlock() { locked.store(false, std::memory_order_relaxed); }   // no release: publishes nothing
      };` },
    mcq: { q: 'Why must <code>unlock()</code> use (at least) <code>memory_order_release</code>?', options: ['Otherwise the store might never happen', 'So writes made inside the critical section happen-before the next thread that acquires the lock reads them', 'Release makes the store faster', 'It is required by lock_guard'], answer: 1, explain: 'The next lock() does an acquire RMW that reads the value written by unlock\'s release store, creating synchronizes-with. Without it, the protected data is accessed by two threads without happens-before: a data race.' },
    hints: [`<p>Acquiring must be one atomic read-modify-write: <code>locked.exchange(true)</code> returns the old value; false means you got it.</p>`, `<p>lock: <code>exchange(true, acquire)</code>; unlock: <code>store(false, release)</code>. While waiting, only <b>read</b> (<code>load(relaxed)</code>) until it looks free, then retry the exchange: test-and-test-and-set.</p>`, `<p>Add a CPU pause / <code>this_thread::yield()</code> in the read loop. try_lock = one exchange attempt, but check with a cheap load first to avoid a write when it's obviously taken.</p>`],
    solution: {
      approach: `<p><b>Acquire</b> with an atomic exchange (one RMW, so no check-then-act gap) using <code>memory_order_acquire</code>, so nothing in the critical section can move above it. <b>Release</b> with a store of false using <code>memory_order_release</code>, so nothing in the critical section can move below it, and the next acquirer sees all writes. While contended, spin on a relaxed <b>load</b>: readers can share the cache line in "shared" state; only the final exchange needs exclusive ownership (TTAS).</p>`,
      code: R`
        #include <bits/stdc++.h>
        using namespace std;

        class SpinLock {
            atomic<bool> locked{false};
        public:
            void lock() {
                while (true) {
                    if (!locked.exchange(true, memory_order_acquire)) return;   // got it
                    while (locked.load(memory_order_relaxed))                   // wait by READING only
                        this_thread::yield();                                   // (or a CPU pause instruction)
                }
            }
            bool try_lock() {
                return !locked.load(memory_order_relaxed)                       // cheap check first
                    && !locked.exchange(true, memory_order_acquire);
            }
            void unlock() { locked.store(false, memory_order_release); }        // publish the critical section
        };

        int main() {
            SpinLock sl;
            long long counter = 0;                       // plain data protected by the spinlock
            {
                jthread a([&] { for (int i = 0; i < 1000000; ++i) { lock_guard<SpinLock> g(sl); ++counter; } });
                jthread b([&] { for (int i = 0; i < 1000000; ++i) { lock_guard<SpinLock> g(sl); ++counter; } });
            }
            cout << counter << "\n";                     // 2000000
        }`,
      dry: { head: ['step', 'T1', 'T2', 'locked'], rows: [['1', 'exchange(true, acq) → old false: enters', '', 'true'], ['2', '++counter', 'exchange → old true: spin on load', 'true'], ['3', 'store(false, release)', 'load sees false', 'false'], ['4', '', 'exchange(true, acq) → old false: enters, sees T1\'s write', 'true']] },
      complexity: `<p>Uncontended lock+unlock ≈ 2 atomic ops (~10–20 ns). Under contention TTAS avoids cache-line ping-pong while waiting. Spinlocks are bad if the holder can be preempted, or with more threads than cores; then std::mutex (spin briefly, then sleep) wins.</p>`,
      followUps: ['Make it fair with a ticket lock (two counters: next ticket and now serving)', 'Why do spinlocks perform terribly on an oversubscribed machine?', 'How does C++20 atomic::wait() let you build a lock that sleeps instead of spinning?']
    }
  });

  practice.push({
    title: 'Lock-Free Stack (Treiber) with Safe Memory Handling',
    level: 'Hard', tags: ['lock-free', 'CAS', 'ABA', 'memory reclamation'], companies: ['Jane Street', 'Meta', 'Microsoft', 'Nvidia'],
    statement: `<p>Implement a lock-free LIFO stack with <code>push(T)</code> and <code>optional&lt;T&gt; pop()</code> using a CAS loop on an <code>std::atomic&lt;Node*&gt;</code> head. Popped nodes must not be deleted while another thread might still be reading them, and the design must not suffer from the ABA problem. (Memory may be reclaimed in the destructor.)</p>`,
    constraints: `Up to 32 threads pushing and popping concurrently; correctness over memory efficiency.`,
    example: `<p>${H.table(['ABA scenario if nodes were freed and reused', ''], [['T1: reads head = A, next = B, then pauses', ''], ['T2: pops A, pops B (frees B), pushes A again (same address)', ''], ['T1: CAS(head A → B) <span class="c-r">succeeds</span>, head now points at freed B', 'use-after-free']])}</p>`,
    brute: { why: `<p>The textbook stack that calls <code>delete old</code> right after a successful pop is broken: another thread that read <code>old</code> as head may still dereference <code>old-&gt;next</code> (use-after-free), and if the allocator reuses the address, a stale CAS can succeed (ABA). A mutex-based stack is correct but blocking.</p>`, code: R`
      template <class T>
      class StackBAD {
          struct Node { T v; Node* next; };
          std::atomic<Node*> head{nullptr};
      public:
          void push(T v) { Node* n = new Node{std::move(v), head.load()}; while (!head.compare_exchange_weak(n->next, n)) {} }
          std::optional<T> pop() {
              Node* old = head.load();
              while (old && !head.compare_exchange_weak(old, old->next)) {}   // old->next may read freed memory
              if (!old) return std::nullopt;
              T v = std::move(old->v);
              delete old;                                                    // BUG: others may still use it (and ABA)
              return v;
          }
      };` },
    mcq: { q: 'Why does "never free popped nodes until the destructor" prevent ABA here?', options: ['Because CAS becomes wait-free', 'Because a node address can never be reused while the stack is alive, so head == old really means the same node is still on top', 'Because the stack becomes FIFO', 'It does not prevent ABA'], answer: 1, explain: 'ABA needs the same address to come back with different meaning. If memory is never recycled during operation, an address uniquely identifies a node, and dereferencing old-&gt;next is always safe. Production code uses hazard pointers / epochs (C++26 has std::hazard_pointer and RCU) to reclaim earlier.' },
    hints: [`<p>push: build the node privately, set <code>n-&gt;next = head</code>, CAS head from n-&gt;next to n (on failure, CAS refreshes n-&gt;next for you).</p>`, `<p>pop: <code>old = head.load(acquire)</code>; loop CAS(old → old-&gt;next). Use release on push's CAS and acquire on pop's load/CAS so the popper sees the node's contents.</p>`, `<p>Reclamation: push popped nodes onto a separate lock-free "retired" list (using a different link field) and delete everything in the destructor. Note the trade-off: memory grows with the number of pops.</p>`],
    solution: {
      approach: `<p>Treiber stack: a CAS loop swaps the head pointer. Push publishes a fully built node with a <b>release</b> CAS; pop reads head with <b>acquire</b> so it can safely read <code>old-&gt;next</code> and the value. Safety comes from <b>deferred reclamation</b>: popped nodes go to a retired list (linked through a separate field, so concurrent readers of <code>next</code> are unaffected) and are freed only in the destructor. Since addresses are never reused while the stack is live, ABA can't happen and no thread ever touches freed memory. Production versions reclaim earlier with hazard pointers or epoch-based schemes.</p>`,
      code: R`
        #include <bits/stdc++.h>
        using namespace std;

        template <class T>
        class TreiberStack {
            struct Node {
                T value;
                Node* next;                    // stack link: written only before publication
                Node* retiredNext = nullptr;   // separate link for the retired list
            };
            atomic<Node*> head{nullptr};
            atomic<Node*> retired{nullptr};

            void retire(Node* n) {            // lock-free push onto the retired list
                n->retiredNext = retired.load(memory_order_relaxed);
                while (!retired.compare_exchange_weak(n->retiredNext, n, memory_order_release, memory_order_relaxed)) {}
            }
        public:
            void push(T v) {
                Node* n = new Node{std::move(v), head.load(memory_order_relaxed)};
                // on failure, CAS writes the current head into n->next and we retry
                while (!head.compare_exchange_weak(n->next, n, memory_order_release, memory_order_relaxed)) {}
            }

            optional<T> pop() {
                Node* old = head.load(memory_order_acquire);
                // old is never freed while the stack lives, so reading old->next is always safe
                while (old && !head.compare_exchange_weak(old, old->next, memory_order_acquire, memory_order_acquire)) {}
                if (!old) return nullopt;
                optional<T> out(std::move(old->value));   // we own old exclusively now
                retire(old);                              // defer deletion: no use-after-free, no ABA
                return out;
            }

            ~TreiberStack() {                             // no other threads may be running now
                for (Node* n = head.load(); n;) { Node* nx = n->next; delete n; n = nx; }
                for (Node* n = retired.load(); n;) { Node* nx = n->retiredNext; delete n; n = nx; }
            }
        };

        int main() {
            TreiberStack<int> st;
            atomic<long long> popped{0};
            {
                vector<jthread> ts;
                for (int t = 0; t < 4; ++t)
                    ts.emplace_back([&, t] {
                        for (int i = 1; i <= 1000; ++i) st.push(i);
                        for (int i = 0; i < 1000; ++i) if (auto v = st.pop()) popped += *v;
                    });
            }
            while (auto v = st.pop()) popped += *v;               // drain leftovers
            cout << popped << "\n";                               // 4 * 500500 = 2002000
        }`,
      dry: { head: ['step', 'T1 (pop)', 'T2 (push 9)', 'head'], rows: [['1', 'old = A (acquire), old-&gt;next = B', '', 'A'], ['2', '', 'n = {9, next = A}; CAS(A → n) ok (release)', 'n'], ['3', 'CAS(A → B) fails, old = n', '', 'n'], ['4', 'CAS(n → A) ok, returns 9, retires n', '', 'A']] },
      complexity: `<p>push/pop O(1) expected, lock-free (a failed CAS means someone else succeeded). Memory O(total pushes) until destruction: that's the price of the simple reclamation scheme. Under heavy contention a single head is a hotspot; elimination-backoff stacks help.</p>`,
      followUps: ['Replace deferred reclamation with hazard pointers (C++26 &lt;hazard_pointer&gt;)', 'How do tagged pointers (pointer + counter in one 64/128-bit CAS) prevent ABA?', 'Is this stack linearizable? Where is the linearization point of pop?']
    }
  });

  practice.push({
    title: 'Implement a Reusable (Cyclic) Barrier',
    level: 'Hard', tags: ['condition_variable', 'barrier', 'generation counter'], companies: ['Google', 'Nvidia', 'Bloomberg'],
    statement: `<p>Implement <code>Barrier(int n)</code> with <code>arriveAndWait()</code>: each of n threads calls it at the end of a phase; nobody continues until all n have arrived; then all are released together. The <b>same</b> barrier must work for many phases in a row (threads loop: work → arriveAndWait → work → ...). Use only a mutex and a condition_variable. (C++20 has <code>std::barrier</code>; build your own.)</p>`,
    constraints: `2 ≤ n ≤ 64 threads, up to 10<sup>6</sup> phases`,
    example: `<p>n = 3, 2 phases. Output must show all three "phase 0" lines before any "phase 1" line:</p><pre>t0 phase 0
t2 phase 0
t1 phase 0
t1 phase 1
t0 phase 1
t2 phase 1</pre>`,
    brute: { why: `<p>A single counter with predicate "count == n" breaks on reuse: the last thread resets count to 0 for the next phase, so threads that wake up late see count == 0 and go back to sleep forever, or a fast thread starts the next phase and increments the counter before slow ones left. A one-shot latch cannot be reused at all.</p>`, code: R`
      class BarrierBAD {
          std::mutex m; std::condition_variable cv; int count = 0; const int n;
      public:
          explicit BarrierBAD(int total) : n(total) {}
          void arriveAndWait() {
              std::unique_lock lk(m);
              if (++count == n) { count = 0; cv.notify_all(); return; }   // reset for the next phase ...
              cv.wait(lk, [&] { return count == n; });                     // ... so sleepers never see n: hang
          }
      };` },
    mcq: { q: 'What does the generation counter solve?', options: ['It makes the barrier faster', 'Each waiter remembers which phase it waits for and wakes when the phase number changes, which is immune to the count being reset or reused', 'It counts the number of threads', 'It replaces the mutex'], answer: 1, explain: 'The predicate "generation != myGeneration" stays true forever once the phase has advanced, so late wakers can never miss it, and a fast thread entering the next phase cannot confuse it.' },
    hints: [`<p>Keep three fields under the mutex: <code>waiting</code> (arrived in this phase), <code>generation</code> (phase number), and the constant <code>n</code>.</p>`, `<p>On arrival: remember <code>gen = generation</code>. If you're the last (<code>++waiting == n</code>): reset waiting to 0, <code>++generation</code>, notify_all. Otherwise wait until <code>generation != gen</code>.</p>`, `<p>The predicate must refer to the phase you joined, not to the count. Spurious wakeups are harmless. Notify can happen after unlocking.</p>`],
    solution: {
      approach: `<p>Use a <b>generation number</b>. Each arriving thread notes the current generation. The last arrival opens the barrier by resetting the count and incrementing the generation, then wakes all. Waiters sleep until the generation differs from the one they joined, a condition that stays true no matter how quickly the next phase starts. This is exactly how <code>std::barrier</code> and Java's <code>CyclicBarrier</code> work internally.</p>`,
      code: R`
        #include <bits/stdc++.h>
        using namespace std;

        class Barrier {
            mutex m;
            condition_variable cv;
            const int n;
            int waiting = 0;
            unsigned long long generation = 0;
        public:
            explicit Barrier(int total) : n(total) {}
            void arriveAndWait() {
                unique_lock<mutex> lk(m);
                auto gen = generation;                      // the phase I am part of
                if (++waiting == n) {                       // last one in: open the gate
                    waiting = 0;
                    ++generation;
                    lk.unlock();
                    cv.notify_all();
                    return;
                }
                cv.wait(lk, [&] { return generation != gen; });   // stays true even if the next phase began
            }
        };

        int main() {
            const int N = 3, PHASES = 3;
            Barrier bar(N);
            mutex outM;
            vector<thread> ts;
            for (int id = 0; id < N; ++id)
                ts.emplace_back([&, id] {
                    for (int p = 0; p < PHASES; ++p) {
                        { lock_guard<mutex> g(outM); cout << "t" << id << " phase " << p << "\n"; }
                        bar.arriveAndWait();                // nobody starts phase p+1 early
                    }
                });
            for (auto& t : ts) t.join();
        }`,
      dry: { head: ['event', 'waiting', 'generation', 'effect'], rows: [['t0 arrives (gen 0)', '1', '0', 't0 sleeps'], ['t2 arrives (gen 0)', '2', '0', 't2 sleeps'], ['t1 arrives (gen 0)', '3 → 0', '0 → 1', 'notify_all: all released'], ['t1 races ahead, arrives (gen 1)', '1', '1', 'sleeps; t0/t2 still see 1 ≠ 0 and wake fine']] },
      complexity: `<p>O(1) per arrival; one notify_all per phase (n wakeups). For huge n, tree/dissemination barriers avoid the single hot mutex. C++20 <code>std::barrier</code> also supports a completion function run once per phase.</p>`,
      followUps: ['Add a completion callback executed once per phase by the last thread', 'Compare with std::latch: when is a one-shot latch enough?', 'How would a spinning (sense-reversing) barrier work for very short phases?']
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: 'What happens when a <code>std::thread</code> object that is still joinable is destroyed?', options: ['The thread is joined automatically', 'The thread is detached automatically', '<code>std::terminate()</code> is called', 'Nothing, the OS cleans up'], answer: 2, explain: 'The destructor of a joinable std::thread calls std::terminate. Call join() or detach() first, or use C++20 std::jthread, which joins in its destructor.' },
    { q: '<code>void f(int&amp; x);</code> Which line starts a thread that modifies the caller\'s <code>n</code>?', options: ['<code>std::thread t(f, n);</code>', '<code>std::thread t(f, &amp;n);</code>', '<code>std::thread t(f, std::ref(n));</code>', '<code>std::thread t(f, std::move(n));</code>'], answer: 2, explain: 'std::thread copies its arguments. std::ref passes a reference_wrapper that converts back to int&amp;. The first line does not even compile with an int&amp; parameter.' },
    { q: 'Two threads each run <code>++c</code> 1000 times on a plain shared <code>int c = 0</code>. What does the C++ standard say about the result?', options: ['It is always 2000', 'It is between 1000 and 2000', 'The behaviour is undefined (data race)', 'It is always 1000'], answer: 2, explain: 'Unsynchronized conflicting accesses where at least one is a write are a data race, which is undefined behaviour. In practice you usually see lost updates, but the standard promises nothing.' },
    { q: 'Which statement about <code>std::atomic&lt;int&gt; x</code> is FALSE?', options: ['<code>x++</code> is a single atomic read-modify-write', '<code>x = x + 1</code> is a single atomic read-modify-write', '<code>x.fetch_add(1)</code> returns the old value', 'Concurrent <code>x.load()</code> and <code>x.store()</code> are not a data race'], answer: 1, explain: 'x = x + 1 is an atomic load followed by a separate atomic store, so another thread can sneak in between and the update can be lost.' },
    { q: 'Why does <code>condition_variable::wait</code> need a <code>std::unique_lock</code> rather than a <code>std::lock_guard</code>?', options: ['lock_guard is slower', 'wait must unlock the mutex while sleeping and re-lock it before returning, and only unique_lock supports unlock/lock', 'lock_guard cannot be used with std::mutex', 'unique_lock is the only RAII lock'], answer: 1, explain: 'wait atomically releases the mutex and sleeps, then re-acquires it on wakeup. lock_guard has no unlock/lock operations, so it cannot be used there.' },
    { q: 'Why should you call <code>cv.wait(lk, predicate)</code> instead of plain <code>cv.wait(lk)</code> inside an <code>if</code>?', options: ['It is shorter to write', 'wait can return spuriously, or another thread may have consumed the state first; the predicate overload re-checks in a loop', 'The predicate makes notify unnecessary', 'Plain wait never returns'], answer: 1, explain: 'Spurious wakeups are allowed, and stolen wakeups happen with several consumers. wait(lk, pred) is exactly while (!pred()) wait(lk);' },
    { q: 'Thread 1: <code>lock(a); lock(b);</code>. Thread 2: <code>lock(b); lock(a);</code>. What is the risk and the simplest standard fix?', options: ['Livelock; use recursive_mutex', 'Deadlock; use <code>std::scoped_lock lk(a, b);</code> in both', 'Data race; use atomics', 'Starvation; use notify_all'], answer: 1, explain: 'Opposite lock order can form a circular wait. std::scoped_lock acquires several mutexes with a deadlock-avoidance algorithm; a consistent global order also works.' },
    { q: 'Producer: <code>payload = 42; ready.store(true, X);</code> Consumer: <code>if (ready.load(Y)) use(payload);</code> (payload is a plain int). Which (X, Y) is the weakest correct choice?', options: ['(relaxed, relaxed)', '(release, acquire)', '(seq_cst, relaxed)', '(relaxed, acquire)'], answer: 1, explain: 'A release store read by an acquire load synchronizes-with it, so payload = 42 happens-before use(payload). Any relaxed side breaks the edge and makes the access to payload a data race.' },
    { q: 'Store buffering: A: <code>x=1; r1=y;</code> B: <code>y=1; r2=x;</code> (atomics, start at 0). With release stores and acquire loads, is <code>r1 == 0 &amp;&amp; r2 == 0</code> possible?', options: ['No, never', 'Yes; only seq_cst forbids it', 'Only on x86', 'Only if the threads run on the same core'], answer: 1, explain: 'Release/acquire do not order a store followed by a load of a different variable (StoreLoad). Store buffers let both loads read 0. seq_cst (a single total order) forbids it, which is why Dekker/Peterson need seq_cst.' },
    { q: 'What is wrong with: <code>std::async(std::launch::async, sendEmail); std::async(std::launch::async, sendEmail);</code> if the goal is to send two emails in parallel?', options: ['Nothing, they run in parallel', 'The discarded futures block in their destructors, so the calls run one after another', 'std::async cannot take void functions', 'The second call throws'], answer: 1, explain: 'A future returned by std::async waits for the task in its destructor. Each temporary is destroyed at the end of its statement, making the code sequential. Keep the futures alive.' },
    { q: 'A task launched with <code>std::async</code> throws <code>std::runtime_error</code>. What happens?', options: ['std::terminate is called immediately', 'The exception is stored and rethrown by <code>future::get()</code> in the caller', 'The exception is silently ignored', 'get() returns a default value'], answer: 1, explain: 'std::async (like packaged_task and promise::set_exception) stores the exception in the shared state; get() rethrows it in the calling thread.' },
    { q: 'Which is the best tool for "8 workers must wait until all of them finished phase 1 before any starts phase 2, repeated 100 times"?', options: ['std::latch', 'std::barrier (or a cv-based cyclic barrier)', 'A single std::promise', 'std::recursive_mutex'], answer: 1, explain: 'A barrier is reusable across phases. A latch is single-use; a promise can only be set once.' }
  );

  /* ======================================================================
     INTERVIEW
     ====================================================================== */
  interview.push(
    { q: 'What is the difference between a data race and a race condition?', level: 'B', a: `<p>A <b>data race</b> is a language-level rule violation: two threads access the same memory location, at least one writes, at least one access is non-atomic, and there is no happens-before ordering between them. In C++ it's <b>undefined behaviour</b>. A <b>race condition</b> is a logic bug where the result depends on timing, for example check-then-act ("if balance ≥ 80 then withdraw") even when every single operation is atomic or locked. You can have either without the other: atomics remove data races but not race conditions; a lock around the whole compound action removes both.</p>`, followUps: ['Give a race condition that has no data race.', 'How does ThreadSanitizer detect data races?'] },
    { q: 'Explain join() vs detach(), and what happens if you do neither.', level: 'B', a: `<p><code>join()</code> blocks the caller until the thread finishes and makes everything the thread did visible afterwards (happens-before). <code>detach()</code> lets the thread run independently; you can never wait for it, and it's killed if the process exits. Its captured references can dangle. If a <code>std::thread</code> is still joinable when destroyed (neither called), the destructor calls <code>std::terminate</code>. This also happens when an exception skips your join. C++20's <code>std::jthread</code> fixes it: the destructor calls <code>request_stop()</code> then <code>join()</code>.</p>`, followUps: ['Why did the committee choose terminate instead of auto-join for std::thread?', 'When is detach acceptable?'] },
    { q: 'lock_guard vs unique_lock vs scoped_lock: when do you use each?', level: 'I', a: `<p><b>lock_guard</b>: the simplest RAII lock: locks in the constructor, unlocks in the destructor, no other operations. The default for a scoped critical section. <b>unique_lock</b>: movable, can be created unlocked (<code>defer_lock</code>), try-locked (<code>try_to_lock</code>), timed, unlocked early and re-locked. Required by <code>condition_variable::wait</code>. Slightly bigger (stores an "owns" flag). <b>scoped_lock</b> (C++17): locks one or more mutexes at once using a deadlock-avoidance algorithm, so use it whenever you need several mutexes. For reader-writer locks use <code>shared_lock</code> on a <code>shared_mutex</code>.</p>`, followUps: ['How does std::lock avoid deadlock internally?', 'Why is returning a reference to guarded data from a locked method a bug?'] },
    { q: 'What are the conditions for deadlock and how do you prevent it in a large codebase?', level: 'I', a: `<p>Coffman's four conditions: <b>mutual exclusion</b>, <b>hold-and-wait</b>, <b>no preemption</b>, and <b>circular wait</b>. Remove one and deadlock can't occur. Practical prevention: (1) a global <b>lock ordering</b>/hierarchy (always lock lower-level before higher-level, enforced in debug builds); (2) acquire multiple locks atomically with <code>std::scoped_lock</code>; (3) never call unknown code (callbacks, virtuals, logging) while holding a lock; (4) keep critical sections small and don't nest locks if you can avoid it; (5) use try_lock with timeouts plus back-off for recovery. Detection: lock-order graphs (TSan's deadlock detector, Abseil's debug mutex), and thread dumps of hung processes.</p>`, followUps: ['Deadlock vs livelock vs starvation?', 'What is priority inversion?'] },
    { q: 'Walk me through how condition_variable::wait works and why spurious wakeups matter.', level: 'I', a: `<p>You hold a <code>unique_lock</code> on the mutex that guards some state. <code>wait(lk)</code> <b>atomically</b> releases the mutex and blocks the thread (registered as a waiter before unlocking, so a notify right after can't be lost). When notified (or spuriously), it re-acquires the mutex before returning. Because returns can be spurious, or another consumer may have taken the item first (stolen wakeup), you must re-check the condition: <code>cv.wait(lk, [&amp;]{ return !q.empty(); })</code>. On the other side, modify the state under the same mutex, then notify, or you risk a lost wakeup. A cv has no memory: the predicate on shared state is the source of truth.</p>`, followUps: ['notify_one vs notify_all: when is notify_all required?', 'Should you notify while holding the lock?'] },
    { q: 'Design a bounded blocking queue. What are the pitfalls?', level: 'I', a: `<p>One mutex guarding a <code>deque</code>, plus two condition variables: <b>notFull</b> (producers wait while size == cap) and <b>notEmpty</b> (consumers wait while empty). push: lock → wait(notFull, pred) → push → unlock → notEmpty.notify_one(). pop mirrors it. Pitfalls: <code>if</code> instead of a predicate/while; modifying the deque without the lock; a single cv with notify_one waking the wrong kind of thread; holding the lock while processing items; forgetting shutdown, so add a <code>closed</code> flag in both predicates and <code>notify_all</code> on both cvs in close(); and unbounded queues that hide back-pressure problems.</p>`, followUps: ['How would you make it lock-free for a single producer and single consumer?', 'How do you implement try_pop_for(timeout)?'] },
    { q: 'When would you use std::atomic instead of a mutex, and when not?', level: 'I', a: `<p>Atomics fit <b>single-variable</b> state with simple updates: counters, flags, IDs, a pointer swap, statistics, reference counts. They never block and are cheap when uncontended (~5–20 ns). Use a mutex when an <b>invariant spans several variables</b> (e.g. a map plus its size, a balance plus a history log), when operations are compound, or when the code must be easy to review. Making each field atomic doesn't make the object thread-safe. Also note heavily contended atomics bounce a cache line between cores and can be slower than sharded counters or even a mutex.</p>`, followUps: ['What is false sharing and how do you avoid it?', 'Is lock-free always faster?'] },
    { q: 'Explain compare_exchange_weak vs compare_exchange_strong and the CAS loop pattern.', level: 'A', a: `<p><code>x.compare_exchange_*(expected, desired)</code>: if <code>x == expected</code>, atomically set <code>x = desired</code> and return true; otherwise copy the current value into <code>expected</code> and return false. <b>weak</b> may fail spuriously even when equal (it maps to one load-linked/store-conditional attempt on ARM/POWER), so use it inside loops; <b>strong</b> never fails spuriously (it hides a retry loop), so use it for one-shot attempts like "claim this flag". CAS loop: read the value, compute the new one privately, CAS; on failure <code>expected</code> is refreshed, so recompute and retry. Any read-modify-write (max, multiply, push onto a list) becomes lock-free this way.</p>`, followUps: ['What is the ABA problem and how do tagged pointers or hazard pointers solve it?', 'Is a CAS loop lock-free or wait-free?'] },
    { q: 'Explain memory_order_relaxed, acquire/release and seq_cst with a concrete example of each.', level: 'A', a: `<p><b>relaxed</b>: atomicity plus a per-variable modification order; no ordering with other memory. Example: a hit counter read after join. <b>release/acquire</b>: a release store "publishes" all earlier writes; an acquire load that reads that value "receives" them (synchronizes-with → happens-before). Example: <code>data = 42; ready.store(true, release);</code> / <code>if (ready.load(acquire)) use(data);</code>. Mutex unlock/lock use exactly this. <b>seq_cst</b>: acquire/release plus a single total order over all seq_cst operations that every thread agrees on. Needed for store-buffering protocols like Dekker/Peterson (store my flag, then read yours), where acquire/release still allow both threads to read 0. Default to seq_cst; weaken only with a happens-before argument and evidence.</p>`, followUps: ['Why does code with relaxed flags often "work" on x86 but fail on ARM?', 'What does a seq_cst store compile to on x86?'] },
    { q: 'What is "happens-before" and how do you establish it between threads?', level: 'A', a: `<p>Happens-before is the partial order that decides what a thread is guaranteed to see. If write W happens-before read R, R sees W (or something later); if two conflicting accesses are not ordered by happens-before, it's a data race. It's built from <b>sequenced-before</b> (program order in one thread) plus <b>synchronizes-with</b> edges between threads: thread creation (constructor → thread body), thread completion → <code>join()</code>, mutex unlock → later lock of the same mutex, atomic release store → acquire load that reads it (or a later value in its release sequence), <code>promise::set_value</code> → <code>future::get</code>, and C++20 latch/barrier/semaphore operations. Correct concurrent code is a chain of such edges between every write and every read of shared data.</p>`, followUps: ['What is a release sequence?', 'How do fences create synchronizes-with?'] },
    { q: 'std::async: what launch policies exist, and what are its gotchas?', level: 'I', a: `<p><code>launch::async</code> runs the task on a new thread immediately; <code>launch::deferred</code> runs it lazily on the thread that calls <code>get()</code>/<code>wait()</code> (never, if nobody does); the default allows either, so specify <code>launch::async</code> when you need parallelism. Gotchas: (1) the returned future <b>blocks in its destructor</b>, so discarding it makes the call synchronous; (2) <code>get()</code> is one-shot (use <code>shared_future</code> for many readers); (3) wait_for on a deferred future returns <code>deferred</code>, not timeout, so polling loops can spin forever; (4) libstdc++/libc++ create one OS thread per call, which is too heavy for tiny tasks; (5) arguments are copied, so pass <code>std::cref</code> for big data. Upside: exceptions are captured and rethrown by get().</p>`, followUps: ['How do promise and packaged_task differ from async?', 'How would you implement a thread pool with futures?'] },
    { q: 'How would you design a thread pool in C++? What happens on shutdown?', level: 'A', a: `<p>Fixed N workers (≈ cores for CPU-bound work) loop on a shared queue of type-erased jobs (<code>function&lt;void()&gt;</code> or C++23 <code>move_only_function</code>) protected by a mutex + condition_variable. <code>submit(f, args...)</code> wraps the call into a <code>packaged_task&lt;R()&gt;</code>, returns its future (so results and exceptions flow back), pushes, and notifies one worker. Workers pop under the lock and run jobs <b>outside</b> it. Shutdown: set <code>stopping</code> under the lock, <code>notify_all</code>, join; decide whether to drain or drop queued jobs, and reject new submissions. Advanced: per-worker deques with work stealing, bounded queue for back-pressure, and beware tasks that block waiting on other tasks in the same pool (pool deadlock).</p>`, followUps: ['How does work stealing improve locality and contention?', 'How do you avoid a task waiting on a future of another queued task deadlocking the pool?'] },
    { q: 'Is the reference count of shared_ptr thread-safe? Is shared_ptr itself thread-safe?', level: 'A', a: `<p>The <b>control block</b> is thread-safe: copying and destroying <i>different</i> <code>shared_ptr</code> instances that share ownership, from different threads, is fine. Increments use relaxed atomics; decrements use acq_rel so the thread that frees the object sees all prior writes. But (1) the <b>pointee</b> is not protected, so mutating the object from several threads needs your own synchronization; and (2) reading and writing the <b>same</b> <code>shared_ptr</code> variable concurrently (one thread assigns, another copies) is a data race. Use <code>std::atomic&lt;std::shared_ptr&lt;T&gt;&gt;</code> (C++20) or a mutex for that, which is the classic way to publish an immutable config snapshot.</p>`, followUps: ['Why can the increment be relaxed but not the decrement?', 'How would you implement read-copy-update of a config with atomic shared_ptr?'] },
    { q: 'How do you debug and test concurrent C++ code?', level: 'E', a: `<p><b>Prevent:</b> minimize shared mutable state, encapsulate locks with data, use Clang thread-safety annotations (<code>GUARDED_BY</code>), prefer high-level primitives (queues, futures, latches). <b>Detect:</b> build with ThreadSanitizer (<code>-fsanitize=thread</code>) for data races and lock-order inversions; Helgrind/DRD as alternatives; stress tests with more threads than cores, randomized sleeps/yields, thousands of iterations; run on ARM as well as x86 to expose weak-memory bugs. <b>Verify</b> lock-free algorithms with model checkers (Relacy, CDSChecker, herd7/CppMem litmus tests). <b>Diagnose hangs:</b> take thread dumps (<code>gdb -p</code>, <code>thread apply all bt</code>) and look for cycles of threads waiting on locks. Log with thread ids and monotonic timestamps; remember that logging itself changes timing (Heisenbugs).</p>`, followUps: ['Why can adding a printf make a race disappear?', 'What can TSan not detect?'] }
  );

  /* ======================================================================
     MODULE
     ====================================================================== */
  registerModule({
    id: 'cpp11',
    title: 'Concurrency in C++',
    intro: `<p>Your laptop has 8 or more cores, and almost every serious C++ system (trading engines, game engines, databases, browsers, ML runtimes) uses many threads. This module teaches you to write C++ that runs on several cores <b>correctly</b>: starting and joining threads, protecting shared data with mutexes, sleeping efficiently with condition variables, lock-free updates with atomics, the famous <b>memory orders</b> (relaxed, acquire/release, seq_cst), and handing results around with futures and <code>std::async</code>.</p>
      <p>Every topic has a <b>visualizer where you play the OS scheduler</b>: pick which thread runs next and watch updates get lost, mutexes block, deadlocks form, condition variables wake and re-check, CAS loops retry, and CPUs reorder memory. You'll do data-race bug hunts, build a thread-safe counter, a blocking queue, a thread pool and a lock-free stack, and solve the "what can this print?" puzzles that C++ interviewers love.</p>`,
    goals: [
      'Start, join and manage threads safely (<code>std::thread</code>, <code>std::jthread</code>, <code>std::ref</code>, lifetimes) and explain why a joinable thread\'s destructor terminates',
      'Spot data races and race conditions by reading code, explain why a data race is undefined behaviour, and fix them with ownership, mutexes or atomics',
      'Use <code>lock_guard</code>, <code>unique_lock</code>, <code>scoped_lock</code> and <code>shared_mutex</code> correctly, and prevent deadlock with lock ordering',
      'Implement producer-consumer with <code>condition_variable</code> using predicates, avoiding spurious and lost wakeups, with clean shutdown',
      'Write CAS loops with <code>std::atomic</code>, and solve memory-order litmus tests (message passing, store buffering) for relaxed, acquire/release and seq_cst',
      'Use <code>std::async</code>, <code>promise</code>, <code>packaged_task</code> and futures (including exception transport and the discarded-future trap), and design a thread pool'
    ],
    prereqs: `<p>C++ 6 (Memory Management, RAII &amp; Smart Pointers) for RAII and ownership, C++ 7 (STL Containers), and C++ 10 (Modern C++: Move Semantics, Lambdas) for lambdas, captures and <code>std::move</code>. Basic idea of what a CPU core and cache are helps but is explained here.</p>`,
    hours: 16,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
