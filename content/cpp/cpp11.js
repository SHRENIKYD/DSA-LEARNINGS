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
registerModule({ id: 'cpp11', title: 'Concurrency in C++', intro: 'x', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
