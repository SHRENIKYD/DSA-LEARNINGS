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
        if (lost) { st.s.lost++; res = { say: 'counter = ' + r.tmp + ' (LOST UPDATE: overwrote ' + old + ')', cls: 'bad', narr: '<span class="c-r">STOREs ' + r.tmp + ' over ' + old + '.</span> It read ' + r.seen + ' earlier, but the other thread changed counter since then. That increment is <b>lost forever</b>.' }; }
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
registerModule({ id: 'cpp11', title: 'Concurrency in C++', intro: 'x', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
