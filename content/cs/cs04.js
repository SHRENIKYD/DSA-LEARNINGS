(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- small helpers shared by the visualizers ---------- */
  function toks(input, hint, max) {
    var t = String(input).trim().split(/[\s,]+/).filter(Boolean);
    if (!t.length) throw new Error(hint);
    if (t.length > (max || 40)) throw new Error('Use at most ' + (max || 40) + ' items');
    return t;
  }
  function prob(title, level, tags, statement, example, bruteWhy, q, hints, approach, complexity, followUps, extra) {
    var p = {
      title: title, level: level, tags: tags, companies: (extra && extra.companies) || ['Google', 'Amazon'],
      statement: statement, constraints: (extra && extra.constraints) || 'Assume a standard shared-memory machine with preemptive threads; N threads, small fixed buffers.',
      example: example,
      brute: { why: bruteWhy },
      mcq: q, hints: hints,
      solution: { approach: approach, complexity: complexity, followUps: followUps }
    };
    if (extra && extra.bruteCode) p.brute.code = extra.bruteCode;
    if (extra && extra.code) p.solution.code = extra.code;
    return p;
  }

  /* ---------- Visualizer 1: lost update on counter++ ---------- */
  function lostGen(input) {
    var s = toks(input, 'Enter thread ids 1 or 2, e.g. 1 2 1 2 1 2', 14).map(Number);
    if (s.some(function (x) { return x !== 1 && x !== 2; })) throw new Error('Only thread ids 1 and 2 are allowed, e.g. 1 2 1 2 1 2');
    var ins = ['LOAD  r = counter', 'ADD   r = r + 1', 'STORE counter = r'];
    var pc = { 1: 0, 2: 0 }, reg = { 1: '-', 2: '-' }, loaded = { 1: null, 2: null }, counter = 0, rows = [], hl = {}, frames = [], lost = 0, step = 0;
    function part() {
      return [
        { type: 'table', label: 'Instruction log (each row = one CPU instruction)', columns: ['step', 'thread', 'instruction', 'T1.r', 'T2.r', 'counter'], rows: rows.map(function (r) { return r.slice(); }), hl: JSON.parse(JSON.stringify(hl)) },
        { type: 'vars', label: 'Shared memory', vals: { counter: counter, 'T1 pc': pc[1], 'T2 pc': pc[2] }, hl: { counter: lost ? 'bad' : 'ok' } }
      ];
    }
    rows.push(['0', '-', 'start', '-', '-', 0]);
    frames.push({ narr: 'Two threads each run <code>counter++</code>. The CPU sees it as <b>3 tiny steps</b>: LOAD, ADD, STORE. The counter starts at <b>0</b>. If both finish cleanly we expect <b>2</b>.', parts: part() });
    s.forEach(function (t) {
      if (pc[t] >= 3) { return; }
      step++;
      var k = pc[t], note = '';
      if (k === 0) { reg[t] = counter; loaded[t] = counter; note = 'Thread ' + t + ' copies counter (<b>' + counter + '</b>) into its private register.'; }
      else if (k === 1) { reg[t] = reg[t] + 1; note = 'Thread ' + t + ' adds 1 inside its own register. Nobody else can see it yet.'; }
      else {
        var isLost = counter !== loaded[t];
        note = 'Thread ' + t + ' writes <b>' + reg[t] + '</b> into counter.';
        if (isLost) { lost++; note += ' <span class="c-r">But counter had already moved from ' + loaded[t] + ' to ' + counter + ' since this thread loaded it, so that other increment is erased: LOST UPDATE.</span>'; }
        counter = reg[t];
      }
      pc[t]++;
      rows.push([String(step), 'T' + t, ins[k], reg[1], reg[2], counter]);
      hl = {}; hl[rows.length - 1] = (k === 2 && lost && counter !== undefined && note.indexOf('LOST') >= 0) ? 'bad' : 'cur';
      frames.push({ narr: note, parts: part() });
    });
    var done = (pc[1] === 3 ? 1 : 0) + (pc[2] === 3 ? 1 : 0);
    hl = {};
    frames.push({ narr: done === 2 ? (counter === 2 ? '<span class="c-g">Both finished and counter = 2. This schedule happened to be safe.</span>' : '<span class="c-r">Both threads finished, yet counter = ' + counter + ' instead of 2. One increment vanished and no error was raised. That is a race condition.</span>') : 'The schedule ended before both threads finished; counter = ' + counter + '. Add more thread ids to finish them.', parts: part() });
    return frames;
  }

  /* ---------- Visualizer 2: Peterson's solution ---------- */
  function petersonGen(input) {
    var s = toks(input, 'Enter thread ids 0 or 1, e.g. 0 1 0 1 0 1', 40).map(Number);
    if (s.some(function (x) { return x !== 0 && x !== 1; })) throw new Error('Only thread ids 0 and 1 are allowed');
    var CODE = 'flag[i] = true;\nturn = j;\nwhile (flag[j] && turn == j) { }\n/* critical section */\nflag[i] = false;';
    var flag = [false, false], turn = 0, pc = [0, 0], last = -1, frames = [], violated = false;
    var names = ['set flag', 'set turn', 'test', 'in CS', 'exit'];
    function inCS(i) { return pc[i] === 3 || pc[i] === 4; }
    function part() {
      var hlv = {};
      if (inCS(0) && inCS(1)) hlv.inCS = 'bad';
      function cl(i) { var h = {}; if (pc[i] < 5) h[pc[i] + 1] = (last === i ? 'cur' : 'win'); return h; }
      return [
        { type: 'vars', label: 'Shared variables', vals: { 'flag[0]': flag[0], 'flag[1]': flag[1], turn: turn }, hl: { turn: 'sel' } },
        { type: 'vars', label: 'Where each thread is', vals: { 'T0 next step': pc[0] < 5 ? names[pc[0]] : 'done', 'T1 next step': pc[1] < 5 ? names[pc[1]] : 'done', inCS: (inCS(0) ? 'T0 ' : '') + (inCS(1) ? 'T1' : '') || 'nobody' }, hl: hlv },
        { type: 'code', label: 'Thread 0 (i=0, j=1): next line highlighted', lang: 'cpp', code: CODE, hl: cl(0) },
        { type: 'code', label: 'Thread 1 (i=1, j=0): next line highlighted', lang: 'cpp', code: CODE, hl: cl(1) }
      ];
    }
    frames.push({ narr: 'Both flags are false, <code>turn</code> = 0 (it can start anywhere). You pick which thread runs one step at a time. Watch how <b>flag</b> says "I want in" and <b>turn</b> says "after you".', parts: part() });
    s.forEach(function (i) {
      if (pc[i] >= 5) return;
      var j = 1 - i, note = '';
      if (pc[i] === 0) { flag[i] = true; pc[i] = 1; note = 'T' + i + ' raises its hand: <code>flag[' + i + '] = true</code>.'; }
      else if (pc[i] === 1) { turn = j; pc[i] = 2; note = 'T' + i + ' politely says "you first": <code>turn = ' + j + '</code>. The LAST writer of turn is the one who gives way.'; }
      else if (pc[i] === 2) {
        if (flag[j] && turn === j) note = 'T' + i + ' tests: flag[' + j + '] is true AND turn == ' + j + ', so it <span class="c-y">keeps spinning</span> (stays on this line).';
        else { pc[i] = 3; note = 'T' + i + ' tests the loop condition: ' + (!flag[j] ? 'flag[' + j + '] is false (the other thread is not interested)' : 'turn is ' + turn + ', so the other thread already said "you first"') + '. <span class="c-g">It passes and enters the critical section.</span>'; }
      }
      else if (pc[i] === 3) { pc[i] = 4; note = 'T' + i + ' does its work inside the critical section.'; }
      else { flag[i] = false; pc[i] = 5; note = 'T' + i + ' leaves: <code>flag[' + i + '] = false</code>. The other thread can now get through its test.'; }
      last = i;
      if (inCS(0) && inCS(1)) violated = true;
      frames.push({ narr: note + (violated ? ' <span class="c-r">BOTH IN CS!</span>' : ''), parts: part() });
    });
    last = -1;
    frames.push({ narr: violated ? '<span class="c-r">Mutual exclusion was violated (this never happens with Peterson).</span>' : 'Mutual exclusion was never violated in this run: at most one thread was ever in the critical section. Try other schedules; you cannot break it.', parts: part() });
    return frames;
  }

  /* ---------- Visualizer 3: mutex owner + wait queue ---------- */
  function mutexGen(input) {
    var s = toks(input, 'Use tokens like A+ (lock) and A- (unlock): A+ B+ C+ A- B- C-', 24);
    var owner = null, q = [], frames = [];
    function part(hl) {
      return [
        { type: 'vars', label: 'Mutex', vals: { owner: owner || 'free (unlocked)', waiting: q.length }, hl: { owner: owner ? 'sel' : 'ok' } },
        { type: 'queue', label: 'Threads sleeping on the mutex (front gets it next)', items: q.slice(), frontLabel: 'next', backLabel: 'newest', hl: hl || {} }
      ];
    }
    frames.push({ narr: 'The mutex starts <b>unlocked</b>. <code>X+</code> means thread X calls lock(); <code>X-</code> means it calls unlock().', parts: part() });
    s.forEach(function (tk) {
      var m = /^([A-Za-z0-9]+)([+-])$/.exec(tk);
      if (!m) throw new Error('Bad token "' + tk + '". Use A+ or A-');
      var t = m[1], op = m[2];
      if (op === '+') {
        if (owner === null) { owner = t; frames.push({ narr: t + ' calls lock(): the mutex is free, so ' + t + ' <span class="c-g">becomes the owner</span> and enters the critical section.', parts: part() }); }
        else if (owner === t) { frames.push({ narr: t + ' calls lock() again on a normal mutex it already owns: <span class="c-r">self-deadlock</span> (a recursive mutex would allow it).', parts: part({ 0: 'bad' }) }); }
        else { q.push(t); frames.push({ narr: t + ' calls lock(): ' + owner + ' owns it, so ' + t + ' is put to <span class="c-y">sleep in the wait queue</span> (no CPU burned).', parts: part(function () { var h = {}; h[q.length - 1] = 'cur'; return h; }()) }); }
      } else {
        if (owner !== t) { frames.push({ narr: t + ' calls unlock() but does not own the mutex. <span class="c-r">Undefined behaviour</span> for std::mutex: only the owner may unlock.', parts: part() }); }
        else if (q.length) { var nx = q.shift(); owner = nx; frames.push({ narr: t + ' unlocks. The OS wakes the front sleeper, <b>' + nx + '</b>, who becomes the new owner.', parts: part() }); }
        else { owner = null; frames.push({ narr: t + ' unlocks and nobody is waiting, so the mutex becomes free.', parts: part() }); }
      }
    });
    frames.push({ narr: 'End of script. Owner: <b>' + (owner || 'nobody') + '</b>, sleepers: <b>' + q.length + '</b>.', parts: part() });
    return frames;
  }

  /* ---------- Visualizer 4: semaphore value + blocked queue ---------- */
  function semGen(input) {
    var s = toks(input, 'Start with a number then ops, e.g. 2 A:P B:P C:P A:V B:V', 26);
    var v = parseInt(s[0], 10);
    if (isNaN(v) || v < 0 || v > 9) throw new Error('First item must be the starting value 0..9');
    var q = [], frames = [], inside = [];
    function part(hl) {
      return [
        { type: 'vars', label: 'Semaphore', vals: { value: v, blocked: q.length, 'holding a permit': inside.length ? inside.join(', ') : 'none' }, hl: { value: v === 0 ? 'bad' : 'ok' } },
        { type: 'queue', label: 'Blocked threads (waiting inside wait/P)', items: q.slice(), frontLabel: 'wakes first', backLabel: 'newest', hl: hl || {} }
      ];
    }
    frames.push({ narr: 'A semaphore is a counter that never goes below 0 plus a line of sleeping threads. Starting value = <b>' + v + '</b> permits. <code>X:P</code> = wait (take a permit), <code>X:V</code> = signal (give one back).', parts: part() });
    s.slice(1).forEach(function (tk) {
      var m = /^([A-Za-z0-9]+):([PVpv])$/.exec(tk);
      if (!m) throw new Error('Bad token "' + tk + '". Use A:P or A:V');
      var t = m[1], op = m[2].toUpperCase();
      if (op === 'P') {
        if (v > 0) { v--; inside.push(t); frames.push({ narr: t + ' does wait(): value was above 0, so decrement it to <b>' + v + '</b> and <span class="c-g">carry on</span>.', parts: part() }); }
        else { q.push(t); frames.push({ narr: t + ' does wait(): value is 0, no permit left, so ' + t + ' <span class="c-y">blocks</span> and joins the queue.', parts: part(function () { var h = {}; h[q.length - 1] = 'cur'; return h; }()) }); }
      } else {
        if (q.length) { var w = q.shift(); inside.push(w); var ix = inside.indexOf(t); if (ix >= 0) inside.splice(ix, 1); frames.push({ narr: t + ' does signal(): someone is blocked, so the permit goes <b>straight to ' + w + '</b> who wakes up. Value stays <b>' + v + '</b>.', parts: part() }); }
        else { v++; var ix2 = inside.indexOf(t); if (ix2 >= 0) inside.splice(ix2, 1); frames.push({ narr: t + ' does signal(): nobody waits, so the value goes up to <b>' + v + '</b> (a permit is saved for later).', parts: part() }); }
      }
    });
    frames.push({ narr: 'Final state: value <b>' + v + '</b>, blocked <b>' + q.length + '</b>. Invariant: permits in hand + value = starting permits (when no one signals without waiting).', parts: part() });
    return frames;
  }

  /* ---------- Visualizer 5: condition variable, if vs while ---------- */
  function cvGen(input) {
    var mode = String(input).trim().toLowerCase();
    if (mode !== 'if' && mode !== 'while') throw new Error('Type either: while   or   if');
    var items = 0, cv = [], ready = [], lock = 'free', frames = [], bug = false;
    var CODE = mode === 'while' ? 'unique_lock lk(m);\nwhile (items == 0)\n    cv.wait(lk);\nitems--;   // safe: re-checked' : 'unique_lock lk(m);\nif (items == 0)\n    cv.wait(lk);\nitems--;   // DANGER: not re-checked';
    function part(line) {
      var h = {}; if (line) h[line] = bug ? 'bad' : 'cur';
      return [
        { type: 'vars', label: 'Monitor state (mode: ' + mode + ')', vals: { items: items, 'lock held by': lock }, hl: { items: items < 0 ? 'bad' : 'ok' } },
        { type: 'queue', label: 'Sleeping on the condition variable', items: cv.slice(), frontLabel: 'next signalled', backLabel: 'newest' },
        { type: 'queue', label: 'Woken, waiting to re-take the lock', items: ready.slice(), frontLabel: 'first', backLabel: 'last' },
        { type: 'code', label: 'Consumer code (' + mode + ')', lang: 'cpp', code: CODE, hl: h }
      ];
    }
    frames.push({ narr: 'Two consumers C1 and C2 and one producer P share a queue. <code>items</code> = 0. We replay one nasty schedule using <b>' + mode + '</b>. The point: a woken thread must re-take the lock, and somebody can sneak in first.', parts: part() });
    cv.push('C1'); lock = 'free';
    frames.push({ narr: 'C1 takes the lock, sees items == 0, calls <code>cv.wait()</code>: it <b>releases the lock atomically</b> and sleeps on the condition variable.', parts: part(3) });
    items = 1; lock = 'P';
    frames.push({ narr: 'P takes the lock and pushes an item: items = 1.', parts: part() });
    ready.push(cv.shift());
    frames.push({ narr: 'P calls <code>cv.notify_one()</code>. C1 wakes, but it is only "ready": it must re-acquire the lock, and P still holds it.', parts: part() });
    lock = 'free';
    frames.push({ narr: 'P unlocks. The lock is free, but C1 has not run yet (the scheduler is slow).', parts: part() });
    lock = 'C2'; items = 0;
    frames.push({ narr: 'A brand new consumer C2 arrives, takes the free lock, sees items == 1, takes it: items = 0. C2 <span class="c-y">stole the item</span> that was meant for C1.', parts: part() });
    lock = 'free';
    frames.push({ narr: 'C2 leaves and unlocks.', parts: part() });
    lock = 'C1'; ready.shift();
    if (mode === 'if') {
      items = -1; bug = true;
      frames.push({ narr: 'C1 finally gets the lock and wakes up inside <code>wait()</code>. Because the code used <b>if</b>, it does NOT look again and runs <code>items--</code>: items becomes <span class="c-r">-1</span>. It popped from an empty queue (a crash in real code).', parts: part(4) });
      frames.push({ narr: '<span class="c-r">Bug.</span> This is why the rule is: <b>always wait in a loop</b> (or use the predicate overload). Wake-ups are hints, not guarantees.', parts: part(4) });
    } else {
      cv.push('C1'); lock = 'free';
      frames.push({ narr: 'C1 gets the lock and loops back to check <code>items == 0</code>: still true (C2 took it). So C1 calls <code>wait()</code> again and goes back to sleep. <span class="c-g">Safe.</span>', parts: part(2) });
      items = 1; lock = 'P'; ready.push(cv.shift());
      frames.push({ narr: 'Later P produces another item and notifies. C1 is woken again.', parts: part() });
      lock = 'C1'; ready.shift(); items = 0;
      frames.push({ narr: 'This time C1 re-checks: items == 1, loop exits, <code>items--</code> gives 0. Correct. The while loop also protects against <b>spurious wake-ups</b> (the OS may wake you for no reason).', parts: part(4) });
    }
    return frames;
  }

  /* ---------- Visualizer 6: bounded buffer (circular array) ---------- */
  function bufGen(input) {
    var s = toks(input, 'Capacity then ops P (produce) / C (consume), e.g. 4 P P P C P P P C', 30);
    var cap = parseInt(s[0], 10);
    if (isNaN(cap) || cap < 2 || cap > 8) throw new Error('First number = capacity 2..8');
    var buf = [], i, count = 0, inP = 0, outP = 0, nextItem = 1, frames = [];
    for (i = 0; i < cap; i++) buf.push('·');
    function part(hl, note) {
      var ptr = {};
      if (inP === outP) ptr[inP] = ['in', 'out']; else { ptr[inP] = 'in'; ptr[outP] = 'out'; }
      return [
        { type: 'array', label: 'Circular buffer (in = next free slot, out = oldest item)', values: buf.slice(), ptr: ptr, hl: hl || {}, showIdx: true },
        { type: 'vars', label: 'Semaphores that guard it', vals: { 'empty (free slots)': cap - count, 'full (items)': count, mutex: 'free' }, hl: { 'empty (free slots)': count === cap ? 'bad' : 'ok', 'full (items)': count === 0 ? 'bad' : 'ok' } }
      ];
    }
    frames.push({ narr: 'A ring of <b>' + cap + '</b> slots. <code>empty</code> counts free slots, <code>full</code> counts items. Producer writes at <b>in</b>, consumer reads at <b>out</b>, both wrap around with <code>% ' + cap + '</code>.', parts: part() });
    s.slice(1).forEach(function (op) {
      op = op.toUpperCase();
      if (op === 'P') {
        if (count === cap) { frames.push({ narr: 'Producer wants to write but <code>empty</code> = 0: the buffer is FULL. In real code the producer <span class="c-y">blocks in wait(empty)</span> until a consumer frees a slot. (We skip it here.)', parts: part({}, '') }); return; }
        var h = {}; h[inP] = 'ok'; buf[inP] = nextItem++; inP = (inP + 1) % cap; count++;
        frames.push({ narr: 'Producer: wait(empty) passes, writes item <b>' + buf[(inP + cap - 1) % cap] + '</b> into slot ' + ((inP + cap - 1) % cap) + ', moves <b>in</b> to ' + inP + ', then signal(full).', parts: part(h) });
      } else if (op === 'C') {
        if (count === 0) { frames.push({ narr: 'Consumer wants to read but <code>full</code> = 0: the buffer is EMPTY. In real code the consumer <span class="c-y">blocks in wait(full)</span>. (We skip it here.)', parts: part() }); return; }
        var h2 = {}, v = buf[outP]; h2[outP] = 'bad'; buf[outP] = '·'; var old = outP; outP = (outP + 1) % cap; count--;
        frames.push({ narr: 'Consumer: wait(full) passes, reads item <b>' + v + '</b> from slot ' + old + ', moves <b>out</b> to ' + outP + ', then signal(empty).', parts: part(h2) });
      } else throw new Error('Ops must be P or C');
    });
    frames.push({ narr: 'Final: ' + count + ' item(s) in the ring. Notice in == out means either EMPTY or FULL; the counters (or one spare slot) tell which.', parts: part() });
    return frames;
  }

  /* ---------- Visualizer 7: readers-writers ---------- */
  function rwGen(input) {
    var s = toks(input, 'Policy then events, e.g. reader R1+ R2+ W1+ R3+ R1- R2- R3- W1-', 30);
    var pol = s[0].toLowerCase();
    if (pol !== 'reader' && pol !== 'writer') throw new Error('First word must be reader or writer (who gets preference)');
    var readers = [], writer = null, wait = [], frames = [], skipped = 0;
    function isW(n) { return n.charAt(0).toUpperCase() === 'W'; }
    function admit() {
      var changed = true, out = [];
      while (changed) {
        changed = false;
        if (writer === null) {
          var wIdx = -1, i;
          for (i = 0; i < wait.length; i++) if (isW(wait[i])) { wIdx = i; break; }
          var anyWaitW = wIdx >= 0;
          if (readers.length === 0 && anyWaitW && (pol === 'writer' || !wait.some(function (n) { return !isW(n); }))) { writer = wait.splice(wIdx, 1)[0]; out.push(writer + ' enters to WRITE'); changed = true; continue; }
          for (i = 0; i < wait.length; i++) {
            if (!isW(wait[i]) && (pol === 'reader' || !anyWaitW)) { var r = wait.splice(i, 1)[0]; readers.push(r); out.push(r + ' enters to READ'); changed = true; break; }
          }
        }
      }
      return out;
    }
    function part() {
      return [
        { type: 'vars', label: 'Room occupancy (policy: ' + pol + ' preference)', vals: { 'active readers': readers.length ? readers.join(', ') : 'none', 'active writer': writer || 'none', 'waiting': wait.length }, hl: { 'active writer': writer ? 'sel' : 'ok', 'active readers': readers.length ? 'win' : 'ok', waiting: wait.length ? 'cur' : 'ok' } },
        { type: 'queue', label: 'Waiting outside the door', items: wait.slice(), frontLabel: 'oldest', backLabel: 'newest', hl: (function () { var h = {}; wait.forEach(function (n, i) { if (isW(n)) h[i] = 'bad'; }); return h; }()) }
      ];
    }
    frames.push({ narr: 'A shared file. <b>Many readers</b> may be inside together, but a <b>writer needs the room alone</b>. Policy: <b>' + pol + '</b> preference. <code>R1+</code> = R1 arrives wanting in, <code>R1-</code> = R1 finishes and leaves.', parts: part() });
    s.slice(1).forEach(function (tk) {
      var m = /^([RrWw][A-Za-z0-9]*)([+-])$/.exec(tk);
      if (!m) throw new Error('Bad token "' + tk + '". Names start with R or W: R1+ W1- ...');
      var n = m[1].charAt(0).toUpperCase() + m[1].slice(1), msg;
      if (m[2] === '+') {
        wait.push(n);
        var o = admit();
        msg = n + ' arrives. ' + (o.length ? '<span class="c-g">' + o.join('; ') + '.</span>' : '<span class="c-y">Cannot enter yet: it waits.</span>');
        if (!isW(n) && wait.indexOf(n) < 0 && pol === 'reader' && wait.some(isW)) { msg += ' <span class="c-r">It jumped ahead of a waiting writer (reader preference).</span>'; skipped++; }
      } else {
        var ri = readers.indexOf(n);
        if (ri >= 0) readers.splice(ri, 1); else if (writer === n) writer = null; else throw new Error(n + ' is not inside the room');
        var o2 = admit();
        msg = n + ' leaves. ' + (o2.length ? '<span class="c-g">' + o2.join('; ') + '.</span>' : (wait.length ? 'Waiters still blocked.' : 'The room is quiet.'));
      }
      frames.push({ narr: msg, parts: part() });
    });
    var wl = wait.filter(isW);
    frames.push({ narr: wl.length ? '<span class="c-r">' + wl.join(', ') + ' is still waiting at the end' + (skipped ? ' after ' + skipped + ' reader(s) jumped the queue: that is writer STARVATION' : '') + '.</span>' : 'Everyone got served. Try the other policy with the same events and compare who waited.', parts: part() });
    return frames;
  }

  /* ---------- Visualizer 8: dining philosophers ---------- */
  function diningGen(input) {
    var mode = String(input).trim().toLowerCase();
    if (['naive', 'ordered', 'asymmetric'].indexOf(mode) < 0) throw new Error('Type naive, ordered or asymmetric');
    var n = 5, i, owner = [-1, -1, -1, -1, -1], held = [[], [], [], [], []], status = ['thinking', 'thinking', 'thinking', 'thinking', 'thinking'], waits = [-1, -1, -1, -1, -1], frames = [], order = [];
    for (i = 0; i < n; i++) {
      var l = i, r = (i + 1) % n;
      if (mode === 'naive') order.push([l, r]);
      else if (mode === 'ordered') order.push(l < r ? [l, r] : [r, l]);
      else order.push(i % 2 === 0 ? [l, r] : [r, l]);
    }
    var nodes = [];
    for (i = 0; i < n; i++) {
      var a = (-90 + i * 72) * Math.PI / 180, b = (-90 + i * 72 + 36) * Math.PI / 180;
      nodes.push({ id: 'P' + i, label: 'P' + i, x: Math.round(50 + 40 * Math.cos(a)), y: Math.round(38 + 30 * Math.sin(a)) });
      nodes.push({ id: 'F' + i, label: 'F' + i, x: Math.round(50 + 20 * Math.cos(b)), y: Math.round(38 + 15 * Math.sin(b)), shape: 'box', w: 8 });
    }
    function cycle() {
      for (var st = 0; st < n; st++) {
        var seen = [], cur = st;
        while (cur >= 0 && waits[cur] >= 0 && seen.indexOf(cur) < 0) { seen.push(cur); cur = owner[waits[cur]]; }
        if (cur >= 0 && seen.indexOf(cur) >= 0) return seen.slice(seen.indexOf(cur));
      }
      return null;
    }
    function snap(cyc) {
      var edges = [], ehl = {}, hl = {}, tags = {}, k;
      for (k = 0; k < n; k++) {
        if (owner[k] >= 0) { edges.push(['F' + k, 'P' + owner[k], 'held']); }
        if (waits[k] >= 0) { edges.push(['P' + k, 'F' + waits[k], 'wants']); }
        hl['P' + k] = status[k] === 'eating' ? 'ok' : status[k] === 'waiting' ? 'cur' : status[k] === 'done' ? 'done' : '';
        if (owner[k] >= 0) hl['F' + k] = 'sel';
        tags['P' + k] = status[k];
      }
      if (cyc) cyc.forEach(function (p) {
        hl['P' + p] = 'bad'; hl['F' + waits[p]] = 'bad';
        ehl['P' + p + '-F' + waits[p]] = 'bad'; ehl['F' + waits[p] + '-P' + owner[waits[p]]] = 'bad';
      });
      return [{ type: 'graph', label: 'Table (P = philosopher, F = fork). Fork i sits between Pi and P(i+1).', directed: true, height: 76, nodes: nodes, edges: edges, hl: hl, ehl: ehl, tags: tags }];
    }
    var rule = mode === 'naive' ? 'everyone grabs the LEFT fork first, then the right' : mode === 'ordered' ? 'everyone grabs the LOWER-numbered fork first' : 'even philosophers go left-then-right, odd ones right-then-left';
    frames.push({ narr: 'Five philosophers, five forks. Each needs <b>two</b> forks (his own and his right neighbour\'s) to eat. Rule here: <b>' + rule + '</b>. Arrows: <code>F→P held</code>, <code>P→F wants</code>.', parts: snap() });
    var dead = false;
    for (var round = 0; round < 14 && !dead; round++) {
      var changed = false;
      for (i = 0; i < n; i++) {
        if (status[i] === 'done') continue;
        if (held[i].length === 2) {
          if (status[i] === 'eating') {
            owner[held[i][0]] = -1; owner[held[i][1]] = -1; held[i] = []; status[i] = 'done'; changed = true;
            frames.push({ narr: 'P' + i + ' finished eating and puts both forks back. Others can use them now.', parts: snap() });
          } else { status[i] = 'eating'; waits[i] = -1; changed = true; frames.push({ narr: 'P' + i + ' holds both forks and <span class="c-g">eats</span>.', parts: snap() }); }
          continue;
        }
        var f = order[i][held[i].length];
        if (owner[f] < 0) {
          owner[f] = i; held[i].push(f); waits[i] = -1; status[i] = held[i].length === 2 ? 'hungry' : 'waiting'; changed = true;
          if (held[i].length < 2) status[i] = 'thinking';
          frames.push({ narr: 'P' + i + ' picks up fork F' + f + '.', parts: snap() });
        } else {
          var first = status[i] !== 'waiting' || waits[i] !== f;
          waits[i] = f; status[i] = 'waiting';
          if (first) { changed = true; frames.push({ narr: 'P' + i + ' wants F' + f + ' but <span class="c-y">P' + owner[f] + ' holds it</span>, so P' + i + ' waits (holding ' + (held[i].length ? 'F' + held[i][0] : 'nothing') + ').', parts: snap() }); }
        }
      }
      var c = cycle();
      if (c && !changed) { dead = true; frames.push({ narr: '<span class="c-r">DEADLOCK.</span> Every philosopher holds one fork and waits for the next: ' + c.map(function (p) { return 'P' + p; }).join(' → ') + ' → P' + c[0] + ' is a circular wait. Nobody can ever move.', parts: snap(c) }); }
      else if (!changed) break;
      if (status.every(function (x) { return x === 'done'; })) break;
    }
    if (!dead) frames.push({ narr: status.every(function (x) { return x === 'done'; }) ? '<span class="c-g">Everyone ate. No cycle ever formed</span> because the forks are acquired in an order that cannot loop back.' : 'Simulation ended.', parts: snap() });
    return frames;
  }

  /* =================== TOPIC 1: critical section + race conditions =================== */
  topics.push({
    title: 'The Critical Section Problem & Race Conditions',
    analogy: `<p>Picture a <b>shared bank passbook</b> in a village. Two clerks both read "balance = 100", each adds 10 in their head, and each writes "110" back. The villager deposited 20 but the book says 110. Nobody was careless; they just <em>interleaved</em>. The passbook handling is the <b>critical section</b>, and a rule like "only one clerk may hold the passbook at a time" is the fix.</p>`,
    explain: `<p>A <b>race condition</b> means the result depends on the exact timing of threads. The classic example is <code>counter++</code>. It looks like one step, but the CPU does <b>three</b>:</p>
      ${H.table(['#', 'machine step', 'what it really does'], [['1', 'LOAD', 'copy counter from memory into a private register'], ['2', 'ADD', 'add 1 to the register'], ['3', 'STORE', 'write the register back to memory']])}
      <p>The OS can pause a thread <em>between any two steps</em> and run another one. Here is a schedule that loses an update (counter starts at 0):</p>
      ${H.table(['step', 'thread', 'instruction', 'T1.r', 'T2.r', 'counter'], [['1', 'T1', 'LOAD', '0', '-', '0'], ['2', 'T2', 'LOAD', '0', '0', '0'], ['3', 'T1', 'ADD', '1', '0', '0'], ['4', 'T2', 'ADD', '1', '1', '0'], ['5', 'T1', 'STORE', '1', '1', '1'], ['6', 'T2', 'STORE', '1', '1', '<span class="c-r">1 (should be 2)</span>']])}
      <p>The code that touches shared data is the <b>critical section</b>. A correct solution to the <b>critical section problem</b> must give three guarantees:</p>
      <ul>
        <li><b>Mutual exclusion</b>: at most one thread inside at a time.</li>
        <li><b>Progress</b>: if nobody is inside and someone wants in, only threads that want in take part in choosing who goes next, and the choice cannot be postponed forever. (A thread that is outside and not interested must not block others.)</li>
        <li><b>Bounded waiting</b>: once you ask, there is a limit on how many times others can go in ahead of you. No starvation.</li>
      </ul>
      <p>Each thread follows the shape: <code>entry section → critical section → exit section → remainder section</code>. All the tools in this module (Peterson, mutex, semaphore, monitor) are just different ways to build the entry and exit sections.</p>`,
    clues: ['"two threads increment a shared counter, final value is wrong" → race condition on a read-modify-write', '"explain why counter++ is not atomic" → load / add / store, interleave in the middle', '"what three properties must a critical-section solution satisfy?" → mutual exclusion, progress, bounded waiting', '"result changes between runs / only fails under load" → data race, timing dependent (Heisenbug)', '"shared variable, multiple writers, no lock" → needs a lock, an atomic, or no sharing at all'],
    code: [
      { lang: 'cpp', title: 'The race, the atomic fix and the mutex fix', code: `#include <thread>
#include <atomic>
#include <mutex>
#include <iostream>

int plain = 0;                    // data race: undefined behaviour in C++
std::atomic<int> atomic_counter{0};  // one indivisible read-modify-write
int guarded = 0;
std::mutex m;                     // protects 'guarded'

void work() {
    for (int i = 0; i < 100000; ++i) {
        ++plain;                              // LOAD, ADD, STORE can interleave
        atomic_counter.fetch_add(1);          // hardware atomic (lock xadd on x86)
        {
            std::lock_guard<std::mutex> g(m); // enter critical section
            ++guarded;                        // only one thread at a time here
        }                                     // leave critical section (RAII)
    }
}

int main() {
    std::thread a(work), b(work);
    a.join();
    b.join();
    // plain is usually LESS than 200000; the other two are always 200000.
    std::cout << plain << " " << atomic_counter << " " << guarded << "\\n";
}` },
      { lang: 'python', run: true, title: 'Enumerate EVERY interleaving of two counter++ threads (deterministic)', code: `from itertools import combinations

# Each thread runs 3 steps: 0 = LOAD, 1 = ADD, 2 = STORE.
# A "schedule" is the order in which the 6 steps run, e.g. [1,2,1,2,1,2].
def run(schedule):
    counter = 0
    reg = {1: 0, 2: 0}      # private register of each thread
    pc = {1: 0, 2: 0}       # next step of each thread
    for t in schedule:
        if pc[t] == 0:
            reg[t] = counter          # LOAD
        elif pc[t] == 1:
            reg[t] += 1               # ADD
        else:
            counter = reg[t]          # STORE
        pc[t] += 1
    return counter

outcomes = {}
for ones in combinations(range(6), 3):        # choose which 3 of the 6 slots are thread 1
    sched = [1 if i in ones else 2 for i in range(6)]
    outcomes.setdefault(run(sched), []).append(sched)

total = sum(len(v) for v in outcomes.values())
print("total interleavings:", total)             # C(6,3) = 20
for value in sorted(outcomes):
    print("final counter =", value, "->", len(outcomes[value]), "schedules")
print("example lost update:", outcomes[1][0], "gives", 1)
print("schedules that happen to give the right answer 2:", len(outcomes[2]), "of", total)
print("with a lock only [1,1,1,2,2,2] and [2,2,2,1,1,1] are allowed, both give", run([1,1,1,2,2,2]))` }
    ],
    codeTitle: ['C++: race vs atomic vs mutex', 'Python: all 20 interleavings'],
    viz: [{
      title: 'Two threads, one counter: watch an update get lost',
      input: '1 2 1 2 1 2', inputLabel: 'Schedule (thread id per CPU step, e.g. 1 2 1 2 1 2). Try: 1 1 1 2 2 2',
      gen: lostGen
    }],
    examples: [
      { title: 'Safe schedule: one thread finishes first', html: `<p>Schedule <code>1 1 1 2 2 2</code>. T1 does LOAD (0), ADD (1), STORE (counter = 1). Then T2 loads <b>1</b>, adds, stores <b>2</b>. The answer is right, but only because we got lucky. Out of the 20 possible interleavings of two 3-step threads, only the <b>2</b> fully serial ones give the right answer; the other <b>18</b> all end with 1 (the Python demo proves it by enumeration). On a real CPU the bad ones are rare in time, so testing cannot prove safety.</p>` },
      { title: 'The lost update schedule, explained', html: `<p>Schedule <code>1 2 1 2 1 2</code>: both load 0, both add to get 1, both store 1. Two increments happened but the counter moved once. The dangerous window is <b>after LOAD and before STORE</b>: any other STORE that lands there is silently overwritten. Rule of thumb: <b>read-modify-write on shared data is a critical section</b>.</p>${H.table(['value in counter', 'schedules out of 20'], [['2 (correct)', '<span class="c-g">2 (the serial ones)</span>'], ['1 (lost update)', '<span class="c-r">18</span>']])}` },
      { title: 'Which of the 3 requirements does a naive "turn" lock break?', html: `<p>Idea: a shared variable <code>turn</code>; thread 0 enters when turn == 0 and then sets turn = 1; thread 1 enters when turn == 1 and sets turn = 0. Mutual exclusion holds. But it <b>forces strict alternation</b>. If thread 0 is slow in its remainder section, thread 1 cannot enter twice in a row even though the room is empty. That violates <b>progress</b>, because a thread outside the critical section is blocking one that wants in.</p>`,
        code: { lang: 'cpp', code: `// Strict alternation: safe but violates "progress".
int turn = 0;
void thread_i(int i) {          // i is 0 or 1
    while (true) {
        while (turn != i) { }   // spin until it is my turn
        // ---- critical section ----
        turn = 1 - i;           // hand over, even if the other thread is not interested
        // ---- remainder section (may be very long) ----
    }
}` } },
      { title: 'Atomic vs mutex: which fix to use?', html: `<p>For a single counter, <code>std::atomic&lt;int&gt;</code> is the best fix (lock-free, one instruction). When you must update <b>several variables together</b> (for example balance and a transaction log), an atomic per variable is not enough, because another thread could see them half-updated. That needs a mutex around the whole group. <b>Atomic = one variable. Mutex = one invariant.</b></p>` }
    ],
    deepDive: `<p><b>Data race vs race condition.</b> A <em>data race</em> (C++ memory model) is two threads touching the same memory, at least one writing, with no synchronisation: it is undefined behaviour, so the compiler may keep <code>plain</code> in a register for the whole loop and the result is even weirder than "lost update". A <em>race condition</em> is a broader logic bug about ordering; you can have a race condition without a data race (all accesses atomic, but check-then-act is still wrong, like <code>if (x.load() == 0) x.store(1)</code>).</p>
      <p><b>Why it is rare yet nasty.</b> The bad window is a few nanoseconds wide. On a single core with timer preemption the chance of a context switch landing inside is small, so tests pass; under production load, with many cores, it fails once a day. Tools: ThreadSanitizer (<code>-fsanitize=thread</code>), Helgrind, Go's <code>-race</code>, Java's jcstress.</p>
      <p><b>Hardware reality.</b> Even if you wrote the Peterson-style code correctly, CPUs and compilers <b>reorder</b> memory operations. x86 reorders store-to-load, ARM reorders almost everything. That is why real solutions use atomics with the right memory order, or locks that include memory barriers.</p>
      <p><b>Kernel vs user space.</b> In a kernel on a single CPU the old trick was "disable interrupts" during the critical section. That fails on multiprocessors (other CPUs keep running), so modern kernels use spinlocks plus interrupt disabling together.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI assistants write concurrent code that <em>looks</em> right and passes a quick test. They happily generate a shared <code>int</code> incremented from threads, or a "double-checked" flag with no atomic.</p>
      <p><b>Use AI as a partner:</b> ask <code>List every shared variable in this file and every thread that reads or writes it. Mark which are protected and by what.</code> and <code>Give me a schedule of instructions that makes this code lose an update.</code> It is a fast race hunter, and you can combine it with ThreadSanitizer output.</p>
      <p><b>Where AI goes wrong:</b> it adds <code>volatile</code> and calls it fixed (volatile is not atomic in C++), or wraps only the write in a lock but not the read. It also over-locks (one giant mutex) and kills performance.</p>
      <p><b>What you must still own:</b> naming the invariant ("balance equals sum of ledger"), choosing atomic vs mutex, and proving the three critical-section properties. In interviews you will be asked to <em>draw the interleaving</em>, and no tool does that for you.</p>`,
    problems: [prob('Show an Interleaving That Loses an Update', 'Easy', ['race', 'counter++'],
      `<p>Two threads each execute <code>counter++</code> once on a shared <code>counter = 0</code>. The statement compiles to <code>LOAD r, counter; ADD r, 1; STORE counter, r</code>. Give an interleaving of the 6 instructions that ends with <code>counter = 1</code>, and one that ends with 2. State which instruction pair causes the loss.</p>`,
      `<p>Schedule <code>T1.LOAD, T2.LOAD, T1.ADD, T2.ADD, T1.STORE, T2.STORE</code> gives ${H.c('r', 'counter = 1')}. Schedule <code>T1.LOAD, T1.ADD, T1.STORE, T2.LOAD, T2.ADD, T2.STORE</code> gives ${H.c('g', 'counter = 2')}. Reason: in the first, T2.LOAD happens before T1.STORE, so T2 starts from a stale 0.</p>`,
      `<p>Run it a million times and hope to see a wrong answer. The bug window is tiny, so tests prove nothing; you must <em>construct</em> the schedule by reasoning.</p>`,
      { q: 'Which pair of instructions must be ordered a certain way to lose an update?', options: ['Both threads LOAD before either STOREs', 'Both threads ADD at the same moment', 'T1 STORE before T1 LOAD', 'Both threads STORE to different addresses'], answer: 0, explain: 'If both load the old value before either stores, the second store overwrites the first with a stale result.' },
      [`<p>Hint 1: Think about what each thread remembers privately after LOAD: a copy, not a link to memory.</p>`, `<p>Hint 2: To lose an update the second thread must read the counter before the first thread's STORE becomes visible.</p>`, `<p>Hint 3: Put both LOADs first, then both ADDs, then both STOREs. Count how many schedules (out of C(6,3) = 20) end in 1.</p>`],
      `<p>Interleave so that both LOADs come before either STORE: <code>L1 L2 A1 A2 S1 S2</code>. After L1 and L2 both registers hold 0. Each ADD makes its own register 1. S1 writes 1, S2 writes 1 again. The counter received two stores of the same value, so one increment is lost. The general rule: a lost update needs one thread's LOAD to fall between another thread's LOAD and STORE of the same variable. Serial schedules (all of T1 then all of T2) always give 2. Counting all 20 interleavings: only the 2 serial ones give 2; the other 18 give 1. The fix is to make LOAD..STORE one indivisible unit: an atomic fetch_add, or a mutex around the increment.</p>`,
      `<p>No algorithm runtime; the point is reasoning. There are C(6,3) = 20 schedules.</p>`,
      ['How many of the 20 interleavings give 2? (Answer: 2. Verify with the Python demo.)', 'Would three threads change the possible final values?'])]
  });

  /* =================== TOPIC 2: Peterson's solution =================== */
  topics.push({
    title: "Peterson's Solution (Software Mutual Exclusion)",
    analogy: `<p>Two people walk toward a narrow door at the same time. Each <b>raises a hand</b> ("I want to go") and then says <b>"no, after you"</b>. Whoever said "after you" <em>last</em> loses the argument and waits. If only one person raised a hand, they just walk through. Peterson's algorithm is exactly this: a <code>flag</code> (hand up) plus a <code>turn</code> ("after you").</p>`,
    explain: `<p>Peterson's solution solves the critical section problem for <b>two threads</b> using only ordinary memory reads and writes: no special hardware instruction. Threads are numbered 0 and 1; thread <code>i</code> calls the other one <code>j = 1 - i</code>.</p>
      ${H.table(['shared variable', 'meaning'], [['<code>flag[0], flag[1]</code>', 'flag[i] = true means "thread i wants to enter"'], ['<code>turn</code>', '"who must give way": the thread that wrote turn LAST is the one that waits']])}
      <pre>// thread i
flag[i] = true;                 // 1. I want in
turn = j;                       // 2. you go first (I give way)
while (flag[j] &amp;&amp; turn == j) { }   // 3. wait while the other wants in AND I gave way
/* critical section */           // 4.
flag[i] = false;                // 5. I am done</pre>
      <p><b>Why it works, in one line:</b> both threads write <code>turn</code>, but only one write is the <em>last</em>. The last writer is stuck in the loop; the other one sees <code>turn</code> pointing to itself and walks in.</p>
      <p><b>Proof of mutual exclusion</b> (the interview favourite). Suppose both are inside. While inside, each thread's own flag is true. So each one passed its test only because <code>turn</code> pointed to itself: T0 saw turn == 0, T1 saw turn == 1. Say T0 did its (last) test first, seeing turn == 0. T0 had written turn = 1 <em>before</em> its test, so someone wrote 0 after that: only T1 does (turn = 0, before T1's test). After that, nobody writes turn = 1 again (T0 is already inside and only writes when it leaves). So when T1 tests, turn is still 0 and flag[0] is true: T1 must keep spinning. Contradiction, so they cannot both be inside. ∎</p>
      <p><b>Progress and bounded waiting:</b> If T1 is not interested (flag[1] false) T0's test is false, so T0 enters even if it is not "its turn". No strict alternation. If both are interested, the one who did <em>not</em> write turn last enters, and when it leaves it clears its flag; if it comes back immediately it sets <code>turn = j</code> again, giving the waiting thread the way. So the waiter waits for <b>at most one</b> entry by the other: bounded waiting with bound 1.</p>`,
    clues: ['"software-only solution for two processes" → Peterson (flag[] + turn)', '"prove mutual exclusion / progress / bounded waiting" → argue with flag and turn', '"why not just use flag[] alone?" → both set flags, both wait, deadlock', '"why not just use turn alone?" → strict alternation breaks progress', '"does Peterson work on modern CPUs?" → only with sequentially consistent atomics or fences (store-load reordering)'],
    code: [
      { lang: 'cpp', title: "Peterson's lock with std::atomic (seq_cst, so it is correct on real hardware)", code: `#include <atomic>
#include <thread>
#include <iostream>

// Two-thread Peterson lock. Must use seq_cst atomics: plain bool/int would be
// reordered by the compiler and the CPU (store->load reordering) and break.
struct Peterson {
    std::atomic<bool> flag[2] = {false, false};
    std::atomic<int>  turn{0};

    void lock(int i) {
        int j = 1 - i;
        flag[i].store(true);                       // I want in (seq_cst by default)
        turn.store(j);                             // you go first
        while (flag[j].load() && turn.load() == j) // spin while they want in and I yielded
            std::this_thread::yield();             // be nice to the CPU
    }
    void unlock(int i) { flag[i].store(false); }   // I am done
};

Peterson lk;
long long counter = 0;      // protected by lk (plain variable on purpose)

void worker(int id) {
    for (int k = 0; k < 100000; ++k) {
        lk.lock(id);
        ++counter;          // critical section
        lk.unlock(id);
    }
}

int main() {
    std::thread t0(worker, 0), t1(worker, 1);
    t0.join();
    t1.join();
    std::cout << counter << "\\n";   // always 200000
}` },
      { lang: 'python', run: true, title: "Model-check Peterson: explore EVERY interleaving (deterministic)", code: `# Model-check Peterson's algorithm: explore EVERY reachable state of two threads.
# pc: 0 set flag, 1 set turn, 2 test loop, 3 in critical section, 4 clear flag, 5 done
def step(state, i):
    pc, flag, turn = list(state[0]), list(state[1]), state[2]
    j = 1 - i
    if pc[i] == 0:
        flag[i] = True; pc[i] = 1
    elif pc[i] == 1:
        turn = j; pc[i] = 2
    elif pc[i] == 2:
        if not (flag[j] and turn == j):
            pc[i] = 3                      # test passes, enter
    elif pc[i] == 3:
        pc[i] = 4                          # leave critical section
    elif pc[i] == 4:
        flag[i] = False; pc[i] = 5
    else:
        return None                        # already finished
    return (tuple(pc), tuple(flag), turn)

def explore(first_turn):
    start = ((0, 0), (False, False), first_turn)
    seen, frontier, edges = {start}, [start], {}
    while frontier:
        s = frontier.pop()
        edges[s] = []
        for i in (0, 1):
            t = step(s, i)
            if t is not None:
                edges[s].append(t)
                if t not in seen:
                    seen.add(t); frontier.append(t)
    return start, seen, edges

for first_turn in (0, 1):
    start, seen, edges = explore(first_turn)
    # Mutual exclusion: never both threads at pc 3 (inside the critical section)
    bad = [s for s in seen if s[0][0] == 3 and s[0][1] == 3]
    # Progress: from every state the finished state is reachable (no deadlock)
    final = ((5, 5), (False, False))
    can_finish = {s for s in seen if s[0] == (5, 5)}
    changed = True
    while changed:
        changed = False
        for s in seen:
            if s not in can_finish and any(t in can_finish for t in edges[s]):
                can_finish.add(s); changed = True
    stuck = [s for s in seen if s not in can_finish]
    print("initial turn =", first_turn, "| reachable states:", len(seen),
          "| both-in-CS states:", len(bad), "| states that can never finish:", len(stuck))

# Now break it: remove the 'turn' step and check mutual exclusion / progress again
def step_noturn(state, i):
    pc, flag, turn = list(state[0]), list(state[1]), state[2]
    j = 1 - i
    if pc[i] == 0: flag[i] = True; pc[i] = 2          # skip setting turn
    elif pc[i] == 2:
        if not flag[j]: pc[i] = 3
    elif pc[i] == 3: pc[i] = 4
    elif pc[i] == 4: flag[i] = False; pc[i] = 5
    else: return None
    return (tuple(pc), tuple(flag), turn)

start = ((0, 0), (False, False), 0)
seen, frontier, edges = {start}, [start], {}
while frontier:
    s = frontier.pop(); edges[s] = []
    for i in (0, 1):
        t = step_noturn(s, i)
        if t: 
            edges[s].append(t)
            if t not in seen: seen.add(t); frontier.append(t)
dead = [s for s in seen if s[0] == (2, 2) and s[1] == (True, True)]
print("flags-only version: states =", len(seen), "| DEADLOCK state reachable:", bool(dead), dead[:1])
` }
    ],
    codeTitle: ["C++: Peterson with seq_cst atomics", "Python: exhaustive proof by state exploration"],
    viz: [{
      title: "Peterson's flag / turn, one instruction at a time",
      input: '0 1 0 1 0 1 0 1 0 1 0 1 0 1 0 1 0 1 0 1', inputLabel: 'Schedule: which thread runs next (0 or 1). Try 0 0 0 0 0 1 1 1 1 1 for no contention',
      gen: petersonGen
    }],
    examples: [
      { title: 'No contention: only thread 0 wants in', html: `<p>T0 sets flag[0], sets turn = 1, tests <code>flag[1] &amp;&amp; turn == 1</code>. flag[1] is false, so the whole condition is false and T0 enters without waiting. This is the <b>progress</b> property: an uninterested thread never blocks you.</p>${H.table(['step', 'flag[0]', 'flag[1]', 'turn', 'result'], [['T0 flag=true', 'T', 'F', '0', ''], ['T0 turn=1', 'T', 'F', '1', ''], ['T0 test', 'T', 'F', '1', '<span class="c-g">enter (flag[1] false)</span>']])}` },
      { title: 'Head-on collision: both arrive together', html: `<p>Schedule 0,1,0,1: T0 flag=T, T1 flag=T, T0 turn=1, T1 turn=0 (T1 wrote last). T0 tests: flag[1] true and turn == 1? turn is 0, so false: <b>T0 enters</b>. T1 tests: flag[0] true and turn == 0? yes: <b>T1 spins</b> until T0 clears flag[0]. The last writer of <code>turn</code> loses.</p>${H.table(['after step', 'flag[0]', 'flag[1]', 'turn'], [['T0 flag', 'T', 'F', '0'], ['T1 flag', 'T', 'T', '0'], ['T0 turn=1', 'T', 'T', '1'], ['T1 turn=0', 'T', 'T', '<span class="c-y">0 (last write)</span>']])}` },
      { title: 'Why flags alone deadlock (the broken variant)', html: `<p>Remove <code>turn</code> and wait only on <code>flag[j]</code>. If both set their flags before either tests, each sees the other's flag and both wait forever: <span class="c-r">deadlock</span>. The Python model checker above finds exactly that state: pc = (2, 2) with both flags true. Adding <code>turn</code> breaks the tie, which is the whole idea of the algorithm.</p>` },
      { title: 'Why turn alone is not enough', html: `<p>With only <code>turn</code> you get strict alternation (see the previous topic): T0 runs, then must wait for T1 even if T1 never comes back. That fails <b>progress</b>. Peterson combines both: <code>flag</code> says whether the other thread is even interested, <code>turn</code> breaks ties.</p>` }
    ],
    deepDive: `<p><b>Modern hardware breaks the naive version.</b> Step 1 is a store (flag[i] = true) and step 3 starts with a load (flag[j]). x86 CPUs have a store buffer that lets a later <em>load</em> complete before an earlier <em>store</em> becomes visible. Both threads can read the other's flag as false, both enter. That is why the C++ code uses seq_cst atomics (which insert an <code>mfence</code> or <code>xchg</code> on x86) and why textbook Peterson is "correct only on a sequentially consistent machine".</p>
      <p><b>Generalising.</b> For N threads there is the <em>filter lock</em> (N-1 Peterson levels) and Lamport's <em>Bakery algorithm</em> (take a ticket number; lowest ticket enters; ties broken by thread id). Bakery gives first-come-first-served fairness without atomic read-modify-write instructions.</p>
      <p><b>Busy waiting.</b> The spin loop wastes CPU; with more threads than cores, the thread inside may be descheduled while the spinner burns its whole time slice. Production code uses hardware atomics (test-and-set, compare-and-swap) or OS blocking locks, and Peterson is mainly a teaching tool and a proof exercise.</p>
      <p><b>Model checking.</b> Our Python demo enumerates all 34 reachable states, which is how tools like TLA+/SPIN prove tiny protocols. For two threads and five steps each, "think of every interleaving" is feasible; the state space grows exponentially with threads and steps.</p>`,
    aiEra: `<p><b>What AI changes:</b> an AI can write Peterson in any language in seconds, and it will usually write the <em>textbook</em> version with plain variables, which is wrong on real CPUs. It can also generate TLA+ or small exhaustive checkers like the one above to test a protocol.</p>
      <p><b>Use AI as a partner:</b> <code>Write a tiny state-space explorer for this lock protocol and report any state where both threads are in the critical section.</code> Then read the explorer code yourself. Also ask it to <em>mutate</em> the algorithm (swap two lines, drop turn) and show which property each mutation breaks.</p>
      <p><b>Where AI goes wrong:</b> it claims Peterson "works on x86" without mentioning store-load reordering, or uses <code>volatile</code> instead of atomics; it also mixes up which thread writes <code>turn = j</code> vs <code>turn = i</code>, which silently inverts the logic.</p>
      <p><b>What you must still own:</b> the 5-line proof of mutual exclusion on a whiteboard and knowing why real systems use hardware atomics or OS locks instead.</p>`,
    problems: [prob("Prove Peterson's Algorithm Satisfies Mutual Exclusion", 'Medium', ['peterson', 'proof'],
      `<p>Given Peterson's algorithm for threads 0 and 1 (flag[], turn), prove that both threads can never be in the critical section at the same time. Then explain what breaks if you swap the first two lines (set turn before setting the flag).</p>`,
      `<p>Assume both are inside. T0 passed its test, so <code>flag[1] == false</code> or <code>turn == 0</code>. T1 passed, so <code>flag[0] == false</code> or <code>turn == 1</code>. Both flags were true while inside, so turn == 0 and turn == 1 at their test times. The thread that tested later saw the other's last write: ${H.c('r', 'contradiction')}.</p>`,
      `<p>Brute force: try random schedules and see that nothing breaks. That is evidence, not a proof; the bad schedule might be one in a billion. A proof (or exhaustive search of the small state space) is needed.</p>`,
      { q: 'In the proof by contradiction, why can flag[j] not be the reason a thread passed its test?', options: ['Because flag[j] is true for any thread that is inside or about to test', 'Because flag is never read', 'Because turn is always 0', 'Because flags are cleared before the test'], answer: 0, explain: 'A thread sets its own flag before writing turn and keeps it until it leaves, so when the other tests, the flag is true. Only turn can let it pass.' },
      [`<p>Hint 1: A thread that is inside the critical section has its own flag set to true the whole time.</p>`, `<p>Hint 2: Suppose both are inside. Look at the last time each thread read the other's flag and turn in its while condition.</p>`, `<p>Hint 3: Say T0 wrote turn = 1 then T1 wrote turn = 0 (or the reverse). The thread whose write to turn is last cannot pass if the other flag is true. Order the three events: T_a writes turn, T_b writes turn, tests.</p>`],
      `<p>Suppose, for contradiction, T0 and T1 are both in the critical section. Each set its flag before entering and keeps it set until leaving, so while both are inside, both flags are true. Therefore each thread passed its test only because the <code>turn</code> part of the condition was false: T0 saw turn == 0 and T1 saw turn == 1 at their last test. WLOG T0 performed its last test first (earlier in time). At that moment turn == 0. For T1 to later see turn == 1, someone must have written turn = 1 after T0's test. Only T0 writes turn = 1, and it does that before its test, not after (it is already inside). T1 itself writes turn = 0, never 1. So turn cannot be 1 at T1's test, which is a contradiction. Hence mutual exclusion holds. If you swap the first two lines (turn = j, then flag[i] = true), T0 can write turn=1, then T1 writes flag[1]=true, turn=0, tests (flag[0] still false) and enters; then T0 sets flag[0]=true, tests flag[1] && turn==1: turn is 0 so T0 enters too. Both inside: mutual exclusion is lost. The order flag-then-turn is essential.</p>`,
      `<p>Proof length is O(1) steps; the state-space check has 34 reachable states.</p>`,
      ['How does the proof change for Lamport\'s Bakery algorithm?', 'What memory fences does an x86 implementation need?'])]
  });

  /* =================== TOPIC 3: mutex + spinlock =================== */
  topics.push({
    title: 'Mutex Locks & Spinlocks',
    analogy: `<p>A <b>mutex</b> is the key to a single-person toilet at a cafe. Take the key, go in, bring it back. If the key is gone you can either <b>stand at the door tapping your foot</b> (spinlock: busy waiting, burns energy but you leave the instant it opens) or <b>sit down and read a magazine until the staff wakes you</b> (sleeping mutex: no energy, but the wake-up takes a moment).</p>`,
    explain: `<p>A <b>mutex</b> (mutual exclusion lock) has two operations: <code>lock()</code> and <code>unlock()</code>. Rules: only the thread that locked may unlock; a thread that locks a held mutex must wait; locking an unlocked mutex succeeds immediately.</p>
      <p>How can lock() itself be safe? It needs a hardware <b>atomic instruction</b> that reads and writes a memory word as one indivisible step:</p>
      ${H.table(['instruction', 'what it does atomically'], [['test-and-set (TAS)', 'old = lock; lock = 1; return old'], ['compare-and-swap (CAS)', 'if (x == expected) { x = new; return true } else return false'], ['fetch-and-add', 'old = x; x += k; return old (used for ticket locks)']])}
      <pre>// the simplest lock: a spinlock built from test-and-set
while (test_and_set(&amp;lock)) { }   // returns 1 while someone holds it
/* critical section */
lock = 0;</pre>
      <p>Two flavours:</p>
      <ul><li><b>Spinlock</b>: the waiting thread loops, checking over and over. Great when the critical section is a few instructions and the lock holder is running on another core. Terrible if the holder is descheduled, since you burn a whole time slice.</li>
      <li><b>Sleeping mutex</b> (what <code>std::mutex</code> / <code>pthread_mutex_t</code> usually is): if the lock is taken, the kernel puts the thread to sleep in a wait queue (on Linux a <b>futex</b>) and wakes it on unlock. A good implementation first spins briefly, then sleeps.</li></ul>
      <p>In C++ never call lock/unlock by hand; use RAII helpers (<code>lock_guard</code>, <code>unique_lock</code>, <code>scoped_lock</code>) so the unlock happens even on exceptions and early returns.</p>
      <p><b>Common bugs</b>: forgetting to unlock; locking twice in the same thread on a non-recursive mutex (self-deadlock); holding a lock while doing slow I/O; two locks taken in different orders by two threads (deadlock, covered in the dining philosophers topic).</p>`,
    clues: ['"only one thread at a time may update this structure" → mutex', '"critical section is a few instructions, lock is held very briefly" → spinlock', '"thread waits a long time / waits on I/O" → sleeping mutex, not spinning', '"what does the OS do when lock() fails?" → block the thread in a wait queue (futex), context switch', '"implement a lock using test-and-set / CAS" → atomic instruction in a loop, memory ordering acquire/release', '"unlock automatically even on exception" → RAII (lock_guard / scoped_lock)'],
    code: [
      { lang: 'cpp', title: 'A spinlock (test-and-test-and-set) and std::mutex with RAII', code: `#include <atomic>
#include <mutex>
#include <thread>
#include <vector>
#include <iostream>

class SpinLock {
    std::atomic<bool> locked_{false};
public:
    void lock() {
        for (;;) {
            // exchange = atomic test-and-set. acquire: later reads see what the previous owner wrote.
            if (!locked_.exchange(true, std::memory_order_acquire)) return;
            // "test-and-test-and-set": spin on a plain read so the cache line stays shared,
            // and only retry the expensive exchange when the lock looks free.
            while (locked_.load(std::memory_order_relaxed)) {
                std::this_thread::yield();      // real code uses a CPU pause instruction here
            }
        }
    }
    void unlock() {
        locked_.store(false, std::memory_order_release); // release: publish my writes
    }
};

SpinLock spin;
std::mutex mtx;
long long a = 0, b = 0;

void work() {
    for (int i = 0; i < 50000; ++i) {
        { std::lock_guard<SpinLock> g(spin); ++a; }   // short critical section: spinlock is fine
        { std::scoped_lock g(mtx); ++b; }             // sleeping mutex, unlocks on scope exit
    }
}

int main() {
    std::vector<std::thread> ts;
    for (int i = 0; i < 4; ++i) ts.emplace_back(work);
    for (auto& t : ts) t.join();
    std::cout << a << " " << b << "\\n";   // both 200000
}` },
      { lang: 'cpp', title: 'try_lock, timed lock and avoiding self-deadlock', code: `#include <mutex>
#include <chrono>
#include <thread>
#include <iostream>

std::mutex m;
std::recursive_mutex rm;    // same thread may lock it again (keeps a count)
std::timed_mutex tmx;

void tryit() {
    if (m.try_lock()) {                     // never blocks; returns false if taken
        std::cout << "got it\\n";
        m.unlock();
    } else {
        std::cout << "busy, do something else\\n";
    }
}

void recurse(int n) {
    std::lock_guard<std::recursive_mutex> g(rm);   // fine: same thread, count goes 1,2,3...
    if (n > 0) recurse(n - 1);
}

int main() {
    tryit();
    recurse(3);
    // wait at most 50 ms, then give up (avoids waiting forever)
    if (tmx.try_lock_for(std::chrono::milliseconds(50))) {
        tmx.unlock();
    }
    // m.lock(); m.lock();   // would self-deadlock on a normal std::mutex
}` },
      { lang: 'python', run: true, title: 'Spin vs sleep: when does each lock win? (deterministic cost model)', code: `# Cost model: spinlock burns CPU while waiting; a sleeping mutex pays two
# context switches (sleep + wake) but burns nothing while asleep.
SWITCH_COST = 5          # microseconds for one sleep + wake round trip (made-up but typical order)

def simulate(arrivals, cs_len):
    """arrivals: list of (thread, arrival_time). One lock, FIFO. Returns per-thread waits."""
    free_at = 0
    out = []
    for name, t in sorted(arrivals, key=lambda x: x[1]):
        start = max(t, free_at)          # when this thread gets the lock
        out.append((name, t, start, start - t))
        free_at = start + cs_len
    return out

def report(title, cs_len):
    arrivals = [("A", 0), ("B", 1), ("C", 2), ("D", 3)]
    rows = simulate(arrivals, cs_len)
    spin_cpu = sum(w for _, _, _, w in rows)                           # all waiting time is burnt CPU
    mutex_cpu = sum(SWITCH_COST for _, _, _, w in rows if w > 0)       # only waiters pay a sleep/wake
    print(title, "(critical section =", cs_len, "us)")
    for name, t, start, w in rows:
        print("  thread", name, "arrives", t, "gets lock at", start, "waits", w)
    print("  CPU burnt  spinlock:", spin_cpu, "us   sleeping mutex:", mutex_cpu, "us")
    print("  winner:", "spinlock" if spin_cpu < mutex_cpu else "sleeping mutex")

report("SHORT critical section", 2)     # a few instructions: spinning is cheaper
report("LONG critical section", 50)     # touches disk/network: sleeping is far cheaper
` }
    ],
    codeTitle: ['C++: spinlock vs mutex', 'C++: try_lock, recursive and timed mutex', 'Python: spin vs sleep cost model'],
    viz: [{
      title: 'Mutex: owner and the wait queue',
      input: 'A+ B+ C+ A- B- C-', inputLabel: 'Events: X+ = lock, X- = unlock. Try: A+ B+ C+ D+ A- B- C- D-',
      gen: mutexGen
    }],
    examples: [
      { title: 'Lock hand-off in order', html: `<p>A locks (free, so it owns). B and C try and sleep. When A unlocks, B (front of the queue) becomes owner without the lock ever being "free" in between. When B unlocks, C gets it. The wait queue gave a <b>fair FIFO order</b> here, but the C++ standard does not promise fairness: a thread calling lock() right at the moment of unlock may barge in first ("lock stealing"), which is faster overall but can starve a sleeper.</p>` },
      { title: 'Spinlock burns CPU: a numbers example', html: `<p>Four threads fight for one lock. The critical section is 2 microseconds. Waiters wait 1, 2 and 3 µs: spinning costs 6 µs of CPU in total. A sleeping mutex pays about 5 µs per sleep/wake (two context switches), so 3 × 5 = 15 µs. <span class="c-g">Spinlock wins for tiny critical sections.</span> Make the critical section 50 µs and spinners burn nearly 300 µs while the mutex still costs 15 µs: <span class="c-g">mutex wins</span>. Run the Python cost model above.</p>` },
      { title: 'Priority inversion with a lock', html: `<p>Low-priority task L holds a mutex. High-priority H needs it and sleeps. A medium-priority task M (needs no lock) preempts L forever. So H is effectively waiting on M: <span class="c-r">priority inversion</span>. This famously reset the Mars Pathfinder rover in 1997. The fix is <b>priority inheritance</b>: while H waits, L temporarily runs at H's priority (<code>PTHREAD_PRIO_INHERIT</code>).</p>` },
      { title: 'Self-deadlock and the recursive mutex', html: `<p>A function <code>f()</code> locks mutex m and calls <code>g()</code> that also locks m. With a normal mutex the second lock waits for itself: the thread sleeps forever. Fixes: restructure so the locked region has an unlocked helper (<code>g_locked()</code> assumes the lock is held), or use a recursive mutex (but treat it as a design smell).</p>` }
    ],
    deepDive: `<p><b>How a futex mutex works (Linux).</b> The lock is one 32-bit integer in user memory: 0 = free, 1 = locked, 2 = locked with waiters. lock() does an atomic CAS 0→1 in user space; if it works, no system call at all (the fast path, ~20 ns). On contention the thread calls <code>futex(FUTEX_WAIT)</code> and the kernel parks it. unlock() does an atomic exchange to 0 and, only if the old value was 2, calls <code>futex(FUTEX_WAKE)</code>. So uncontended locks are almost free; contended ones pay a syscall and a context switch.</p>
      <p><b>Cache-line ping-pong.</b> A naive TAS spinlock makes every waiter write the lock word, bouncing its cache line between cores and slowing even the owner. Test-and-test-and-set spins on reads (shared state in the cache, no traffic) and exponential back-off reduces collisions. <b>Ticket locks</b> (fetch-and-add a ticket, wait until now_serving equals it) are fair FIFO; <b>MCS/CLH queue locks</b> make each waiter spin on its own cache line and scale to many cores.</p>
      <p><b>Memory ordering.</b> lock() is an <em>acquire</em>, unlock() is a <em>release</em>. Everything written before unlock() is visible to the next thread after its lock(). Without that, the critical section's writes could leak out of the locked region.</p>
      <p><b>Kernel rules.</b> Code in interrupt context cannot sleep, so the kernel uses spinlocks (with interrupts disabled) there. On a single-CPU system a spinlock is useless (the holder cannot run while you spin) so kernels compile it to "disable preemption".</p>
      <p><b>Performance tips.</b> Keep critical sections short, never do I/O or call unknown code while holding a lock, prefer sharding (one lock per bucket) or read-copy-update to a single global lock, and measure with a profiler before tuning.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI tools can scan a codebase and list every mutex, its holders and the data it protects, and spot "lock held across a network call". LLM-written code, though, often reaches for <code>std::mutex</code> everywhere, or invents a hand-rolled spinlock where the standard one is correct.</p>
      <p><b>Use AI as a partner:</b> <code>Review this class: for every member variable say which mutex guards it, and flag any access without it.</code> Pair with Clang's thread-safety annotations (<code>GUARDED_BY(mu)</code>) and ThreadSanitizer, so the machine checks what the AI claims.</p>
      <p><b>Where AI goes wrong:</b> it forgets memory ordering in custom locks (relaxed where acquire/release is needed), uses <code>volatile bool</code> as a lock, unlocks in the wrong branch, or holds the lock while calling a callback that tries to lock again.</p>
      <p><b>What you must still own:</b> deciding the lock granularity (one big lock vs many small), the lock ordering rule that prevents deadlock, and when a lock-free atomic is enough. Be ready to explain test-and-set, CAS and futex on a whiteboard.</p>`,
    problems: [prob('Build a Lock from Test-and-Set', 'Medium', ['spinlock', 'atomics'],
      `<p>You are given an atomic instruction <code>test_and_set(bool* p)</code> that sets *p to true and returns the old value in one indivisible step. Implement <code>lock()</code> and <code>unlock()</code> for a spinlock. Then explain (a) why plain read-then-write fails, (b) how to reduce cache traffic, and (c) when to prefer a sleeping mutex.</p>`,
      `<p>lock word = false. T1: test_and_set returns ${H.c('g', 'false')} (it got the lock; word is now true). T2: returns ${H.c('r', 'true')} so it loops. T1 unlock: word = false. T2's next try returns false and enters.</p>`,
      `<p>Plain version: <code>while (locked) {} locked = true;</code>. Two threads can both see locked == false before either sets it: both enter. The check and the set must be <em>one</em> atomic step.</p>`,
      { q: 'Why is "while (locked) {} locked = true;" not a correct lock?', options: ['Another thread can set locked between the check and the set', 'while loops are illegal in C++', 'locked must be a char', 'It would unlock automatically'], answer: 0, explain: 'The check and the assignment are two separate steps, so two threads can both pass the check. test-and-set merges them into one atomic step.' },
      [`<p>Hint 1: The bug in the naive lock is a tiny gap between "is it free?" and "take it". Close the gap with one atomic instruction.</p>`, `<p>Hint 2: test_and_set returns the OLD value. If the old value was false, you just took the lock; if true, someone else has it.</p>`, `<p>Hint 3: lock(): loop until test_and_set returns false. unlock(): store false with release ordering. For less cache traffic, spin on a read-only load and retry the TAS only when you see false.</p>`],
      `<p><b>lock():</b> <code>while (test_and_set(&amp;word)) { /* spin */ }</code>. The first thread sees old value false and exits the loop owning the lock; everyone else sees true and spins. <b>unlock():</b> <code>word = false</code> (a release store, so the owner's writes become visible). <b>Why it works:</b> test_and_set is atomic, so exactly one of any number of simultaneous callers observes false. <b>Reducing traffic:</b> every TAS is a write that steals the cache line; use test-and-test-and-set: <code>while (word.load()) pause(); </code> then try the TAS, plus exponential back-off. <b>When to use a sleeping mutex instead:</b> if the critical section is long, if there are more runnable threads than cores (the lock holder may be preempted while others spin), or if the lock is held across blocking calls. Real implementations (futex) spin briefly then sleep. Also mention fairness: a TAS spinlock is unfair (any waiter can win); a ticket lock is FIFO.</p>`,
      `<p>Each lock attempt is O(1) atomic operations; waiting time is unbounded under TAS (no fairness), O(waiters) with a ticket lock.</p>`,
      ['Make it fair with a ticket lock.', 'What memory orders does lock/unlock need?'],
      { code: { lang: 'cpp', code: `#include <atomic>
// Ticket lock: FIFO fair, each thread waits for its own number.
class TicketLock {
    std::atomic<unsigned> next_{0}, serving_{0};
public:
    void lock() {
        unsigned my = next_.fetch_add(1, std::memory_order_relaxed);   // take a ticket
        while (serving_.load(std::memory_order_acquire) != my) { }     // wait for my number
    }
    void unlock() {
        serving_.store(serving_.load(std::memory_order_relaxed) + 1, std::memory_order_release);
    }
};` } })]
  });

  /* =================== TOPIC 4: semaphores =================== */
  topics.push({
    title: 'Semaphores: Binary and Counting (wait / signal)',
    analogy: `<p>A <b>semaphore</b> is a bowl of <b>numbered tokens</b> at a car park with N spaces. Entering takes a token (<code>wait / P</code>); if the bowl is empty you queue at the gate and sleep. Leaving puts a token back (<code>signal / V</code>), and if somebody is queued the token goes straight to them. A <em>binary</em> semaphore is a bowl with one token: a key. A <em>counting</em> semaphore is a bowl with N tokens: N parking spaces, N database connections.</p>`,
    explain: `<p>Invented by Dijkstra (1965). A semaphore <code>S</code> is an integer (never negative in the usual definition) plus a queue of blocked threads, manipulated by two <b>atomic</b> operations:</p>
      <pre>wait(S)   // also called P, down, acquire
    if S &gt; 0:  S = S - 1            // take a token
    else:       block this thread in S's queue

signal(S) // also called V, up, release, post
    if someone is blocked:  wake one of them (the token goes to them)
    else:                   S = S + 1       // save the token</pre>
      ${H.table(['kind', 'initial value', 'used for', 'example'], [['binary', '1 (or 0)', 'mutual exclusion; or 0 = a "signal" between threads', 'mutex-like lock; "task done" flag'], ['counting', 'N', 'N identical resources; or counting events', 'connection pool, parking lot, items in a buffer']])}
      <p><b>Three classic uses</b>:</p>
      <ol>
        <li><b>Mutual exclusion</b>: <code>S = 1</code>; each thread does <code>wait(S); critical section; signal(S)</code>.</li>
        <li><b>Resource counting</b>: <code>S = N</code>; each user does wait / use / signal. At most N inside.</li>
        <li><b>Ordering (signalling)</b>: <code>S = 0</code>. Thread B must run after A: B does <code>wait(S)</code> (blocks), A does <code>signal(S)</code> when finished.</li>
      </ol>
      <p><b>Semaphore vs mutex</b>: a mutex has an <em>owner</em> (only the locker may unlock) and is for exclusion. A semaphore has <em>no owner</em>: any thread may signal, so it can be used to pass events between threads. Using a semaphore as a lock invites bugs such as signalling twice, or forgetting to wait.</p>
      <p>Mistakes: swapping the order of two waits (deadlock), a missing signal (everyone sleeps forever), a wait without a matching signal on an error path.</p>`,
    clues: ['"allow at most N threads at once" → counting semaphore initialised to N', '"thread B must run after thread A" → semaphore initialised to 0', '"difference between a mutex and a binary semaphore" → ownership, and signalling use', '"wait / signal / P / V / down / up" → semaphore operations', '"semaphore value is negative"→ in the classic definition |value| = number of blocked threads', '"limit concurrent connections / rate-limit workers" → counting semaphore'],
    code: [
      { lang: 'cpp', title: 'std::counting_semaphore (C++20): a connection pool of 3', code: `#include <semaphore>
#include <thread>
#include <vector>
#include <iostream>
#include <atomic>

std::counting_semaphore<8> pool(3);     // 3 tokens; type-level max is 8
std::atomic<int> inside{0}, max_seen{0};

void worker(int id) {
    pool.acquire();                      // wait(): block if 0 tokens
    int now = ++inside;                  // how many are using the pool right now?
    int prev = max_seen.load();
    while (now > prev && !max_seen.compare_exchange_weak(prev, now)) { }
    std::this_thread::sleep_for(std::chrono::milliseconds(5));   // "use the connection"
    --inside;
    pool.release();                      // signal(): give the token back (or wake a waiter)
}

int main() {
    std::vector<std::thread> ts;
    for (int i = 0; i < 10; ++i) ts.emplace_back(worker, i);
    for (auto& t : ts) t.join();
    std::cout << "max at once = " << max_seen << " (never above 3)\\n";
}` },
      { lang: 'cpp', title: 'Binary semaphore as a signal: "B runs after A"', code: `#include <semaphore>
#include <thread>
#include <iostream>

std::binary_semaphore a_done(0);        // 0 tokens: B must wait for A

void A() {
    std::cout << "A: preparing data\\n";
    a_done.release();                    // signal(): tell B it may go
}
void B() {
    a_done.acquire();                    // wait(): sleeps until A has signalled
    std::cout << "B: data is ready, going on\\n";
}

int main() {
    std::thread tb(B), ta(A);            // even if B starts first, it waits
    ta.join();
    tb.join();
}` },
      { lang: 'python', run: true, title: 'Counting semaphore trace: 3 workers, 2 connections (deterministic)', code: `from collections import deque

class Sem:
    """Semaphore: a counter plus a FIFO queue of blocked tasks."""
    def __init__(self, name, value):
        self.name, self.value, self.q = name, value, deque()

def run(tasks, trace):
    """Cooperative scheduler. A task is a generator that yields ('P', sem),
    ('V', sem) or ('do', text). One yield = one step; round-robin order."""
    ready = deque(tasks.items())               # (name, generator)
    step = 0
    while ready:
        name, gen = ready.popleft()
        step += 1
        try:
            op = next(gen)
        except StopIteration:
            trace.append(f"{step:2d}  {name}: finished")
            continue
        kind, arg = op
        if kind == 'P':
            if arg.value > 0:
                arg.value -= 1
                trace.append(f"{step:2d}  {name}: P({arg.name}) ok, value={arg.value}")
                ready.append((name, gen))
            else:
                arg.q.append((name, gen))       # blocked: NOT put back on the ready list
                trace.append(f"{step:2d}  {name}: P({arg.name}) BLOCKS, queue={[n for n, _ in arg.q]}")
        elif kind == 'V':
            if arg.q:
                woken = arg.q.popleft()          # hand the permit straight to the oldest waiter
                ready.append(woken)
                trace.append(f"{step:2d}  {name}: V({arg.name}) wakes {woken[0]}, value={arg.value}")
            else:
                arg.value += 1
                trace.append(f"{step:2d}  {name}: V({arg.name}) value={arg.value}")
            ready.append((name, gen))
        else:
            trace.append(f"{step:2d}  {name}: {arg}")
            ready.append((name, gen))
    return step

# A pool of 2 database connections shared by 3 workers (counting semaphore = 2).
pool = Sem("pool", 2)

def worker():
    yield ('P', pool)                 # borrow a connection (block if none left)
    yield ('do', "using a connection")
    yield ('V', pool)                 # give it back

trace = []
run({"A": worker(), "B": worker(), "C": worker()}, trace)
print("\\n".join(trace))
print("final pool value:", pool.value, "(must equal 2 again)")
` }
    ],
    codeTitle: ['C++: counting_semaphore pool', 'C++: binary_semaphore for ordering', 'Python: semaphore with a blocked queue'],
    viz: [{
      title: 'Semaphore value and its blocked queue',
      input: '2 A:P B:P C:P D:P A:V B:V C:V D:V', inputLabel: 'Start value, then X:P (wait) / X:V (signal). Try: 1 A:P B:P A:V B:V',
      gen: semGen
    }],
    examples: [
      { title: 'Binary semaphore as a lock', html: `<p><code>S = 1</code>. T1: wait → S = 0, enters. T2: wait → S is 0, blocks. T1: signal → T2 is queued so T2 is woken and now holds the token (S stays 0). T2: signal → nobody waiting, S = 1 again. The invariant: <b>S + (number of threads inside) = 1</b>.</p>${H.table(['event', 'S', 'blocked'], [['start', '1', '-'], ['T1 wait', '0', '-'], ['T2 wait', '0', 'T2'], ['T1 signal', '0', '- (T2 runs)'], ['T2 signal', '1', '-']])}` },
      { title: 'Ordering two statements', html: `<p>Requirement: statement <code>S2</code> in thread B must run after <code>S1</code> in thread A. Create <code>sem = 0</code>. A: <code>S1; signal(sem)</code>. B: <code>wait(sem); S2</code>. If B gets there first it sleeps; if A finishes first, the saved token lets B pass at once. Neither order breaks the rule. (A "rendezvous" of two threads uses two such semaphores.)</p>` },
      { title: 'The deadly swap: wait order matters', html: `<p>Bounded buffer producer with <code>wait(mutex); wait(empty);</code> instead of <code>wait(empty); wait(mutex);</code>. When the buffer is full, the producer takes the mutex, then sleeps on <code>empty</code> <em>while still holding the mutex</em>. The consumer needs the mutex to free a slot, so it blocks too: <span class="c-r">deadlock</span>. Rule: <b>wait on the resource semaphore first, lock the mutex last, release the mutex first</b>.</p>` },
      { title: 'Negative value implementation', html: `<p>Textbook version: <code>wait</code> does <code>S--</code> then blocks if <code>S &lt; 0</code>; <code>signal</code> does <code>S++</code> and wakes one if <code>S &lt;= 0</code>. Then a negative S means "|S| threads are blocked". Our visualizer uses the equivalent non-negative version (value plus an explicit queue); both behave the same from outside.</p>` }
    ],
    deepDive: `<p><b>Atomicity of the semaphore itself.</b> wait/signal manipulate a counter and a queue, so they need their own protection: on a single CPU the kernel disables interrupts around them; on multiprocessors it uses a short spinlock. So semaphores are <em>built on</em> lower-level atomics. Linux user-space semaphores are implemented with a futex word: the fast path is a single atomic decrement.</p>
      <p><b>Strong vs weak semaphores.</b> A strong semaphore wakes blocked threads in FIFO order (no starvation); a weak one wakes an arbitrary thread (starvation possible). POSIX only guarantees "the highest-priority, longest-waiting thread" for real-time policies.</p>
      <p><b>Priority inversion</b> hits semaphores too, but worse: there is no owner, so the OS cannot boost the priority of "the holder" (this is why RTOS mutexes have inheritance and semaphores do not).</p>
      <p><b>Lost wake-ups</b> cannot happen with semaphores, because a signal with no waiter is <em>remembered</em> in the counter. That is the key difference from condition variables, where a notify with nobody waiting is lost.</p>
      <p><b>C++20 specifics.</b> <code>std::counting_semaphore&lt;Max&gt;</code> is lightweight (often a futex/atomic wait underneath); <code>try_acquire_for</code> gives timeouts; <code>release(n)</code> can add n tokens at once. <code>std::binary_semaphore</code> is just <code>counting_semaphore&lt;1&gt;</code>. POSIX: <code>sem_init, sem_wait, sem_post</code>. Java: <code>java.util.concurrent.Semaphore</code>. Go channels with a buffer are often used as counting semaphores.</p>`,
    aiEra: `<p><b>What AI changes:</b> in AI-era services, semaphores are everywhere as <b>concurrency limiters</b>: "no more than 8 parallel calls to the model API", "max 4 GPU jobs", "limit the embedding workers". Async frameworks expose them as <code>asyncio.Semaphore</code> or a worker pool.</p>
      <p><b>Use AI as a partner:</b> ask it to <code>trace the semaphore value and queue after each step for this schedule</code> and compare with your own table. Ask it for a test that forces an unlucky order using latches or sleeps.</p>
      <p><b>Where AI goes wrong:</b> it mixes up <code>release()</code> placement (not in a <code>finally</code>, so one exception leaks a token forever and the pool silently shrinks), or uses a semaphore for exclusion where a mutex would catch misuse, or initialises it to the wrong value (off by one means one thread too many).</p>
      <p><b>What you must still own:</b> the invariant (tokens in hand + value = N), always releasing in a finally/RAII guard, and choosing wait order. Interview staple: "implement a semaphore using a mutex and a condition variable" (see the monitors topic).</p>`,
    problems: [prob('Order Two Threads and Cap Concurrency with Semaphores', 'Easy', ['semaphore', 'ordering'],
      `<p>(a) Thread A runs <code>print("1")</code>, thread B runs <code>print("2")</code>, thread C runs <code>print("3")</code>, started in random order. Use semaphores so the output is always <code>123</code>. (b) A web service may call a rate-limited API with at most 5 concurrent calls from 50 worker threads. Show the semaphore setup.</p>`,
      `<p>(a) s1 = 0, s2 = 0. A: print 1; signal(s1). B: wait(s1); print 2; signal(s2). C: wait(s2); print 3. Output always ${H.c('g', '123')}. (b) <code>sem(5)</code>; each worker: acquire, call API, release in a finally.</p>`,
      `<p>Use sleep() calls to "make sure" A runs first. Timing guesses break under load and slow everything down.</p>`,
      { q: 'What initial value makes a semaphore a pure "wait for event" signal?', options: ['0', '1', 'N (the number of waiters)', '-1'], answer: 0, explain: 'With 0, the first wait() blocks until another thread signals. The signal is remembered if it comes first.' },
      [`<p>Hint 1: Make B wait until A says "done", and C wait until B says "done".</p>`, `<p>Hint 2: Two semaphores, both starting at 0. A signals the first, B waits on the first then signals the second, C waits on the second.</p>`, `<p>Hint 3: For the cap, one counting semaphore initialised to 5, acquire before the call and release in a finally/RAII guard so a thrown exception cannot leak a token.</p>`],
      `<p><b>(a) Ordering.</b> Create <code>s1 = 0</code> and <code>s2 = 0</code>. Thread A: <code>print 1; signal(s1)</code>. Thread B: <code>wait(s1); print 2; signal(s2)</code>. Thread C: <code>wait(s2); print 3</code>. Whatever order the OS starts them, B cannot print until A has signalled and C cannot print until B has signalled, so the output is always 123. A signal that arrives before the matching wait is not lost, because the counter keeps it. <b>(b) Concurrency cap.</b> One counting semaphore with value 5. Each of the 50 workers calls <code>acquire()</code> before the API call and <code>release()</code> afterwards inside a <code>finally</code> block (or a RAII guard). At most 5 workers pass at once; the other 45 sleep without burning CPU, and each release wakes exactly one waiter. Invariant: tokens held + semaphore value = 5. Failure mode to mention: forgetting release on the error path slowly drains the pool to zero and the service hangs.</p>`,
      `<p>O(1) per operation; waiting threads sleep, so no CPU is wasted.</p>`,
      ['Add a timeout so a worker gives up after 2 seconds.', 'What if you need to rendezvous two threads at a barrier?'])]
  });

  /* =================== TOPIC 5: monitors + condition variables =================== */
  topics.push({
    title: 'Monitors & Condition Variables (Why while, Not if)',
    analogy: `<p>A <b>monitor</b> is a shop with <b>one counter and one door</b>: only one customer is served inside at a time, and the lock is built into the shop, so you cannot forget it. If the item you want is out of stock you step into the <b>waiting room</b> (the condition variable) and the counter is freed for others. When stock arrives the clerk calls out "something came in!". You walk back to the counter, but another customer may have grabbed it first, so you <b>check the shelf again</b>. That re-check is the <code>while</code> loop.</p>`,
    explain: `<p>Semaphores are powerful but easy to misuse: the programmer must put wait/signal in the right places. A <b>monitor</b> is a language-level structure that bundles shared data, the procedures that use it, and an automatic lock so <b>only one thread is active inside the monitor at a time</b>. Inside it, a thread that cannot continue uses a <b>condition variable</b>:</p>
      ${H.table(['operation', 'meaning'], [['<code>wait(cv, lock)</code>', 'atomically release the lock and go to sleep; when woken, re-acquire the lock before returning'], ['<code>notify_one(cv)</code> / <code>signal</code>', 'wake one sleeping thread (if any). If nobody sleeps, the notify is <b>lost</b>'], ['<code>notify_all(cv)</code> / <code>broadcast</code>', 'wake all sleeping threads; each re-checks its condition']])}
      <pre>// the standard pattern (C++)
std::unique_lock&lt;std::mutex&gt; lk(m);
while (!condition)        // ALWAYS a loop
    cv.wait(lk);          // sleep; lock is released while asleep
/* condition is true and we hold the lock */
...
cv.notify_one();          // after changing the state, tell sleepers</pre>
      <p><b>Why <code>while</code> and not <code>if</code>?</b> Three reasons:</p>
      <ol>
        <li><b>Barging / stolen wake-up</b>: between the notify and your re-acquiring the lock, another thread can run and consume the thing you were told about (see the visualizer).</li>
        <li><b>Spurious wake-ups</b>: POSIX and C++ allow <code>wait()</code> to return even though nobody notified (an implementation artifact of futexes and signals).</li>
        <li><b>Shared condition variable</b>: one cv may be used for several different conditions, and <code>notify_all</code> wakes threads that should keep sleeping.</li>
      </ol>
      <p>The predicate form <code>cv.wait(lk, [&amp;]{ return condition; })</code> is exactly the while loop written for you.</p>
      <p><b>Mesa vs Hoare monitors.</b> In <b>Hoare</b> semantics, signal immediately hands the monitor to the woken thread, so the condition is still true when it runs and <code>if</code> would be fine. In <b>Mesa</b> semantics (used by Java, C++, pthreads, Go, almost everything real) the signaller keeps running; the woken thread is merely made ready and must <em>re-check</em>. Practical rule: <b>assume Mesa, always loop</b>.</p>`,
    clues: ['"why use while instead of if around cond.wait()" → Mesa semantics, stolen wake-ups, spurious wake-ups', '"what is a spurious wakeup" → wait() returns without a notify', '"wait() releases the lock atomically" → no lost wake-up between check and sleep', '"synchronized / wait / notify in Java, or std::condition_variable" → monitor + condition variables', '"notify_one vs notify_all" → how many sleepers can make progress, shared cv for several conditions', '"implement a semaphore / blocking queue with a mutex and cv" → classic monitor exercise'],
    code: [
      { lang: 'cpp', title: 'A monitor in C++: semaphore built from mutex + condition_variable', code: `#include <mutex>
#include <condition_variable>

// A counting semaphore implemented as a monitor.
// The mutex = the monitor lock, the cv = the "count > 0" waiting room.
class Semaphore {
    std::mutex m_;
    std::condition_variable cv_;
    int count_;
public:
    explicit Semaphore(int n) : count_(n) {}

    void wait() {                                   // P / acquire
        std::unique_lock<std::mutex> lk(m_);
        while (count_ == 0)                         // WHILE: re-check after every wake-up
            cv_.wait(lk);                           // releases m_ while asleep
        --count_;                                   // we hold m_ and count_ > 0 here
    }
    void signal() {                                 // V / release
        {
            std::lock_guard<std::mutex> lk(m_);
            ++count_;                               // change the state under the lock
        }
        cv_.notify_one();                           // then wake one sleeper (outside the lock is fine)
    }
};

int main() {
    Semaphore s(1);
    s.wait();
    s.signal();
}` },
      { lang: 'cpp', title: 'Predicate form, notify_all and a one-shot "ready" flag', code: `#include <mutex>
#include <condition_variable>
#include <thread>
#include <iostream>
#include <vector>

std::mutex m;
std::condition_variable cv;
bool ready = false;                    // the PREDICATE lives in shared state, guarded by m

void waiter(int id) {
    std::unique_lock<std::mutex> lk(m);
    cv.wait(lk, [] { return ready; }); // same as: while (!ready) cv.wait(lk);
    std::cout << "worker " << id << " released\\n";
}

int main() {
    std::vector<std::thread> ts;
    for (int i = 0; i < 3; ++i) ts.emplace_back(waiter, i);
    {
        std::lock_guard<std::mutex> lk(m);
        ready = true;                  // change state first, under the lock
    }
    cv.notify_all();                   // everybody should re-check: broadcast
    for (auto& t : ts) t.join();
    // Even if notify_all ran BEFORE a worker started waiting, the worker sees ready == true
    // and never sleeps: state in a variable fixes the "lost notification" problem.
}` },
      { lang: 'python', run: true, title: 'Replay the stolen wake-up: if vs while (deterministic)', code: `# Replay one nasty schedule against a consumer that checks its condition with
# "if" and one that uses "while". Events are scripted, so output is deterministic.
def replay(use_while):
    items = 0
    log = []
    waiting = []            # consumers sleeping on the condition variable
    def consumer_try(name):
        nonlocal items
        if items == 0:
            waiting.append(name)
            log.append(f"{name}: items == 0, wait() -> sleeps, lock released")
            return False
        items -= 1
        log.append(f"{name}: took an item, items={items}")
        return True

    consumer_try("C1")                        # C1 finds nothing and sleeps
    items += 1                                # producer pushes an item ...
    log.append(f"P : pushed, items={items}, notify_one() wakes C1 (not running yet)")
    woken = waiting.pop(0)
    consumer_try("C2")                        # ... but C2 barges in first and steals it
    # C1 now re-acquires the lock and continues INSIDE wait():
    if use_while:
        log.append("C1: wakes, loop re-checks the condition")
        if items == 0:
            log.append("C1: still items == 0, goes back to sleep (correct)")
            waiting.append("C1")
            return log, items
    else:
        log.append("C1: wakes and does NOT re-check (it used 'if')")
    items -= 1
    log.append(f"C1: took an item, items={items}")
    return log, items

for mode in (False, True):
    log, final = replay(mode)
    print("=== consumer uses", "while" if mode else "if", "===")
    print("\\n".join("  " + l for l in log))
    print("  final items =", final, "-> BUG: negative!" if final < 0 else "-> fine")

# Spurious wake-up: the OS may return from wait() with nobody having notified.
items, wakeups, handled = 0, 3, 0
for i in range(wakeups):
    # a spurious wake-up: wait() returned but items is still 0
    if items == 0:
        handled += 1       # the while loop notices and waits again
print("spurious wake-ups handled by the while loop:", handled, "of", wakeups)
` }
    ],
    codeTitle: ['C++: semaphore as a monitor', 'C++: predicate wait + notify_all', 'Python: the bug that while prevents'],
    viz: [{
      title: 'Condition variable: C2 steals the item. Try while, then if',
      input: 'if', inputLabel: 'Consumer style: type if or while',
      gen: cvGen
    }],
    examples: [
      { title: 'Lost notification: why you need a predicate variable', html: `<p>Thread A: <code>cv.wait(lk)</code> with no predicate. Thread B finishes its work and calls <code>notify_one()</code> <em>before</em> A has started waiting. Nobody is asleep, so the notification vanishes. A then sleeps forever. Fix: B sets <code>ready = true</code> under the lock; A waits with <code>while (!ready)</code>. A condition variable is not a queue of events; it is only a wake-up, and the <b>state</b> must live in a normal variable.</p>` },
      { title: 'notify_one vs notify_all', html: `<p>A bounded buffer with <b>one</b> condition variable shared by producers and consumers: when a consumer removes an item, <code>notify_one</code> might wake another <em>consumer</em> (who finds the buffer empty and sleeps again) while a producer that could run stays asleep. The system stalls. Fix: either use two condition variables (<code>not_full</code>, <code>not_empty</code>) or use <code>notify_all</code> and let each re-check. Two cvs is the efficient, precise answer.</p>` },
      { title: 'Signal after unlock or before?', html: `<p>You may call <code>notify</code> while holding the lock or after releasing it. Holding it is simplest to reason about, but the woken thread may immediately block again on the mutex ("hurry up and wait"). Releasing first avoids that on most implementations. Both are correct, as long as the state was changed <b>under the lock</b>.</p>` },
      { title: 'Spurious wake-up trace', html: `<p>The kernel may wake a futex sleeper for reasons unrelated to your notify (signal delivery, implementation shortcuts). <code>wait()</code> returns, <code>items</code> is still 0. With <code>while (items == 0) cv.wait(lk);</code> the thread simply goes back to sleep. With <code>if</code> it would crash on an empty container. That is the cheapest and most convincing interview answer.</p>` }
    ],
    deepDive: `<p><b>Why wait() must release the lock atomically.</b> If it did "unlock, then sleep" as two steps, a notify could slip in between and be lost: the classic <em>lost wake-up</em>. The kernel's futex protocol checks the futex word value when sleeping, so a change between unlock and sleep makes the sleep fail immediately.</p>
      <p><b>Hoare vs Mesa, in detail.</b> Hoare (1974): signal passes the monitor directly to the signalled thread and suspends the signaller; condition holds, no loop needed; costs extra context switches. Mesa (Xerox PARC, 1980) and everyone since: signal is a hint, the signaller continues; woken thread competes for the lock; needs <code>while</code>. Java adds that notify must be inside <code>synchronized</code>, and Java's wait() can also wake spuriously.</p>
      <p><b>Thundering herd.</b> <code>notify_all</code> on a popular cv wakes hundreds of threads that fight for one lock and mostly go back to sleep: wasteful. Use separate cvs for separate conditions, or notify_one when any single waiter can proceed.</p>
      <p><b>Timeouts and cancellation.</b> <code>wait_for / wait_until</code> return a status; always re-check the predicate anyway. With C++20, <code>std::stop_token</code> with <code>condition_variable_any</code> lets a waiting thread be cancelled.</p>
      <p><b>Language support.</b> Java: <code>synchronized</code> + <code>wait()/notify()</code> (one implicit cv per object) or <code>ReentrantLock</code> + <code>Condition</code>. Python: <code>threading.Condition</code>. Go: <code>sync.Cond</code>, though channels usually replace it. Rust: <code>Condvar</code>. All Mesa-style.</p>`,
    aiEra: `<p><b>What AI changes:</b> condition variables hide inside "async queue" libraries (Python <code>asyncio.Condition</code>, blocking queues for LLM request batching). Generated code often reimplements them by hand.</p>
      <p><b>Use AI as a partner:</b> paste your monitor and ask <code>For every cv.wait, name the predicate, the mutex that guards it, and every place where the predicate can become true. Is each of those followed by a notify?</code> It is excellent at that cross-reference.</p>
      <p><b>Where AI goes wrong:</b> it writes <code>if (queue.empty()) cv.wait(lk);</code> in sample code (very common in tutorials it learned from), calls <code>notify</code> without changing state, changes state <em>outside</em> the lock, or uses one cv for two conditions with <code>notify_one</code>.</p>
      <p><b>What you must still own:</b> the predicate and its invariant. Say it out loud: "wait in a loop on a predicate protected by the same mutex, change the predicate under the lock, then notify". Review checklist: loop? same mutex? state change? right notify?</p>`,
    problems: [prob('Implement a Semaphore with a Mutex and Condition Variable', 'Medium', ['monitor', 'condition variable'],
      `<p>You only have a mutex and a condition variable. Implement a counting semaphore class with <code>wait()</code> and <code>signal()</code>. Explain why the wait loop must be a <code>while</code> and show a schedule where <code>if</code> breaks it.</p>`,
      `<p>count = 0. C1: wait() sleeps. P: signal() count = 1, notifies C1. C2 arrives and calls wait() first: count 1 → 0. C1 wakes: with <code>if</code> it decrements to ${H.c('r', '-1')}; with <code>while</code> it re-checks and sleeps again.</p>`,
      `<p>Poll in a loop: <code>while (count == 0) { /* busy wait */ }</code> with unlock/sleep(1ms)/lock inside. It works but burns CPU or adds up to 1 ms latency per hand-off.</p>`,
      { q: 'Which statement about notify_one() with no thread waiting is true?', options: ['It is lost; nothing is remembered', 'It is remembered like a semaphore token', 'It throws an exception', 'It blocks until someone waits'], answer: 0, explain: 'Condition variables keep no memory of notifications; that is why the state (count_) lives in a variable that the waiter checks.' },
      [`<p>Hint 1: The "count" is your shared state. The condition variable only says "the state may have changed".</p>`, `<p>Hint 2: wait(): lock, while (count == 0) cv.wait(lock); then count--. signal(): lock, count++, notify_one.</p>`, `<p>Hint 3: A woken thread must re-check because another thread may have taken the token first (barging). Also show the lost-notify case: signal before wait is fine because count_ was incremented.</p>`],
      `<p>Keep <code>int count</code>, a <code>mutex m</code> and a <code>condition_variable cv</code>. <b>wait():</b> take the lock; <code>while (count == 0) cv.wait(lock);</code> then <code>--count</code>. <b>signal():</b> take the lock, <code>++count</code>, release, <code>cv.notify_one()</code>. Correctness: every access to count is under m, so the increment and decrement are atomic with respect to each other. A signal that happens before a wait is remembered in <code>count</code>, so there is no lost wake-up. The loop is necessary because Mesa semantics let a third thread slip in between the notify and the wake-up: for example C1 sleeps; P signals (count = 1); C2 enters wait(), sees count 1, takes it (count 0); now C1 gets the lock and returns from cv.wait. With <code>if</code> it would execute --count and go to -1, violating the semaphore invariant. With <code>while</code> it sees count == 0 and sleeps again. The same loop also covers spurious wake-ups. notify_one is enough here because each signal adds exactly one token, which only one waiter can use.</p>`,
      `<p>O(1) per operation plus the blocking time; no busy waiting.</p>`,
      ['Make it fair (FIFO).', 'Add try_wait and wait_for with a timeout.'],
      { code: { lang: 'cpp', code: `#include <mutex>
#include <condition_variable>
#include <chrono>

class Semaphore {
    std::mutex m_;
    std::condition_variable cv_;
    int count_;
public:
    explicit Semaphore(int n) : count_(n) {}
    void wait() {
        std::unique_lock<std::mutex> lk(m_);
        cv_.wait(lk, [this] { return count_ > 0; });   // loop + predicate in one
        --count_;
    }
    bool wait_for(std::chrono::milliseconds d) {       // timeout variant
        std::unique_lock<std::mutex> lk(m_);
        if (!cv_.wait_for(lk, d, [this] { return count_ > 0; })) return false;
        --count_;
        return true;
    }
    void signal() {
        { std::lock_guard<std::mutex> lk(m_); ++count_; }
        cv_.notify_one();
    }
};` } })]
  });

  /* =================== TOPIC 6: producer-consumer =================== */
  topics.push({
    title: 'Producer-Consumer (Bounded Buffer)',
    analogy: `<p>A <b>sushi conveyor belt</b> with 8 plates. The chef (producer) puts plates on only if a spot is free; the guests (consumers) take plates only if one is there. Chef must pause when the belt is full, guests must pause when it is empty, and two people must never grab the <em>same</em> plate or put two plates in the same spot. The belt is a <b>circular buffer</b>: positions wrap around.</p>`,
    explain: `<p>The <b>bounded-buffer problem</b> is the most common synchronization pattern in real systems: thread pools, logging queues, Kafka consumers, pipes, GPU job queues, <code>BlockingQueue</code>. Producers add items, consumers remove them, the buffer holds at most <code>N</code> items. Three things must hold:</p>
      <ul><li><b>Producer waits</b> when the buffer is <b>full</b>.</li><li><b>Consumer waits</b> when the buffer is <b>empty</b>.</li><li>Only one thread changes the buffer indices at a time (<b>mutual exclusion</b>).</li></ul>
      <p><b>Solution with three semaphores</b> (the textbook answer):</p>
      <pre>semaphore empty = N;     // free slots (producer waits on this)
semaphore full  = 0;     // filled slots (consumer waits on this)
semaphore mutex = 1;     // protects in/out/array

producer:                        consumer:
  wait(empty);                     wait(full);
  wait(mutex);                     wait(mutex);
  buf[in] = item; in=(in+1)%N;     item = buf[out]; out=(out+1)%N;
  signal(mutex);                   signal(mutex);
  signal(full);                    signal(empty);</pre>
      <p>Order matters: <b>wait on the counting semaphore first, then the mutex</b>. Swapping them lets a producer hold the mutex while sleeping on <code>empty</code>, so the consumer can never get the mutex to free a slot: deadlock.</p>
      <p><b>Solution with a monitor</b> (usually cleaner): one mutex, two condition variables <code>not_full</code> and <code>not_empty</code>, and a plain queue. <code>put</code>: lock; <code>while (size == N) not_full.wait</code>; push; <code>not_empty.notify_one</code>. <code>take</code>: the mirror image.</p>
      ${H.table(['state', 'in vs out', 'how to tell'], [['empty', 'in == out', 'count = 0 (full semaphore = 0)'], ['full', 'in == out', 'count = N (empty semaphore = 0)'], ['partial', 'in ≠ out', 'between']])}
      <p>The ring has the same pointer position for empty and full, which is why you need a counter (or the semaphores, or a spare slot) to tell them apart.</p>`,
    clues: ['"producer produces faster than consumer consumes" → bounded buffer with blocking', '"implement a blocking queue / thread-safe queue with capacity" → cv + mutex, or semaphores', '"empty, full, mutex semaphores" → classic bounded buffer', '"circular buffer with in and out pointers" → modulo N, full/empty ambiguity', '"multiple producers and multiple consumers" → the mutex is essential; single-producer single-consumer can be lock-free', '"back-pressure" → full buffer blocks (or rejects) producers'],
    code: [
      { lang: 'cpp', title: 'Bounded buffer with mutex + two condition variables (monitor style)', code: `#include <mutex>
#include <condition_variable>
#include <queue>
#include <thread>
#include <iostream>

template <typename T>
class BoundedBuffer {
    std::mutex m_;
    std::condition_variable not_full_, not_empty_;
    std::queue<T> q_;
    const size_t cap_;
public:
    explicit BoundedBuffer(size_t cap) : cap_(cap) {}

    void put(T item) {
        std::unique_lock<std::mutex> lk(m_);
        not_full_.wait(lk, [this] { return q_.size() < cap_; });   // loop: wait while full
        q_.push(std::move(item));
        not_empty_.notify_one();             // a consumer may proceed now
    }
    T take() {
        std::unique_lock<std::mutex> lk(m_);
        not_empty_.wait(lk, [this] { return !q_.empty(); });       // loop: wait while empty
        T item = std::move(q_.front());
        q_.pop();
        not_full_.notify_one();              // a producer may proceed now
        return item;
    }
};

int main() {
    BoundedBuffer<int> buf(4);
    std::thread prod([&] { for (int i = 1; i <= 20; ++i) buf.put(i); buf.put(-1); });
    std::thread cons([&] {
        long long sum = 0;
        for (;;) { int v = buf.take(); if (v < 0) break; sum += v; }
        std::cout << "sum = " << sum << "\\n";   // 210
    });
    prod.join();
    cons.join();
}` },
      { lang: 'cpp', title: 'Bounded buffer with C++20 counting semaphores (empty / full / mutex)', code: `#include <semaphore>
#include <mutex>
#include <thread>
#include <iostream>
#include <array>

constexpr int N = 4;
std::counting_semaphore<N> empty_slots(N);    // free slots, producer waits here
std::counting_semaphore<N> full_slots(0);     // filled slots, consumer waits here
std::binary_semaphore mtx(1);                 // protects in/out and the array

std::array<int, N> buf;
int in_ = 0, out_ = 0;                        // circular indices

void produce(int item) {
    empty_slots.acquire();                    // 1) wait for a free slot FIRST
    mtx.acquire();                            // 2) then lock the buffer
    buf[in_] = item;
    in_ = (in_ + 1) % N;
    mtx.release();                            // unlock first ...
    full_slots.release();                     // ... then announce a new item
}

int consume() {
    full_slots.acquire();                     // wait for an item
    mtx.acquire();
    int item = buf[out_];
    out_ = (out_ + 1) % N;
    mtx.release();
    empty_slots.release();                    // announce a free slot
    return item;
}

int main() {
    std::thread p([] { for (int i = 1; i <= 20; ++i) produce(i); });
    std::thread c([] { long long s = 0; for (int i = 0; i < 20; ++i) s += consume(); std::cout << s << "\\n"; });
    p.join();
    c.join();
}` },
      { lang: 'python', run: true, title: 'Semaphore trace of the bounded buffer, then the swapped-wait deadlock (deterministic)', code: `from collections import deque

class Sem:
    """Semaphore: a counter plus a FIFO queue of blocked tasks."""
    def __init__(self, name, value):
        self.name, self.value, self.q = name, value, deque()

def run(tasks, trace):
    """Cooperative scheduler. A task is a generator that yields ('P', sem),
    ('V', sem) or ('do', text). One yield = one step; round-robin order."""
    ready = deque(tasks.items())               # (name, generator)
    step = 0
    while ready:
        name, gen = ready.popleft()
        step += 1
        try:
            op = next(gen)
        except StopIteration:
            trace.append(f"{step:2d}  {name}: finished")
            continue
        kind, arg = op
        if kind == 'P':
            if arg.value > 0:
                arg.value -= 1
                trace.append(f"{step:2d}  {name}: P({arg.name}) ok, value={arg.value}")
                ready.append((name, gen))
            else:
                arg.q.append((name, gen))       # blocked: NOT put back on the ready list
                trace.append(f"{step:2d}  {name}: P({arg.name}) BLOCKS, queue={[n for n, _ in arg.q]}")
        elif kind == 'V':
            if arg.q:
                woken = arg.q.popleft()          # hand the permit straight to the oldest waiter
                ready.append(woken)
                trace.append(f"{step:2d}  {name}: V({arg.name}) wakes {woken[0]}, value={arg.value}")
            else:
                arg.value += 1
                trace.append(f"{step:2d}  {name}: V({arg.name}) value={arg.value}")
            ready.append((name, gen))
        else:
            trace.append(f"{step:2d}  {name}: {arg}")
            ready.append((name, gen))
    return step

# Bounded buffer of size 2. Producer makes 4 items, consumer takes 4.
SIZE = 2
empty = Sem("empty", SIZE)     # free slots
full = Sem("full", 0)          # filled slots
mutex = Sem("mutex", 1)        # protects the buffer indices
buf, nxt = [], [1]

def producer():
    for _ in range(4):
        yield ('P', empty)                 # 1) wait for a free slot FIRST
        yield ('P', mutex)                 # 2) then lock the buffer
        buf.append(nxt[0])
        yield ('do', f"PUT {nxt[0]}  buffer={buf}")
        nxt[0] += 1
        yield ('V', mutex)                 # unlock first ...
        yield ('V', full)                  # ... then announce a new item

def consumer():
    for _ in range(4):
        yield ('P', full)                  # wait for an item
        yield ('P', mutex)
        item = buf.pop(0)
        yield ('do', f"GOT {item}  buffer={buf}")
        yield ('V', mutex)
        yield ('V', empty)                 # announce a free slot

trace = []
run({"Prod": producer(), "Cons": consumer()}, trace)
print("\\n".join(trace))
print("final: empty =", empty.value, "full =", full.value, "mutex =", mutex.value,
      "(expected 2, 0, 1)")

# ---- Same program with the two waits SWAPPED in the producer: deadlock ----
empty2, full2, mutex2 = Sem("empty", 1), Sem("full", 0), Sem("mutex", 1)

def bad_producer():
    for i in range(2):
        yield ('P', mutex2)                # WRONG: lock first ...
        yield ('P', empty2)                # ... then wait for space while holding the lock
        yield ('do', f"PUT {i + 1}")
        yield ('V', mutex2)
        yield ('V', full2)

def good_consumer():
    for _ in range(8):
        yield ('do', "busy elsewhere")      # consumer starts late, so the buffer fills up
    for _ in range(2):
        yield ('P', full2)
        yield ('P', mutex2)
        yield ('do', "GOT item")
        yield ('V', mutex2)
        yield ('V', empty2)

trace2 = []
run({"Prod": bad_producer(), "Cons": good_consumer()}, trace2)
print("\\n--- swapped waits ---")
print("\\n".join(trace2[-4:]))
stuck = [n for s in (empty2, full2, mutex2) for n, _ in s.q]
print("tasks still blocked when nothing can run:", stuck, "=> DEADLOCK" if stuck else "")
` }
    ],
    codeTitle: ['C++: monitor-style blocking queue', 'C++: three-semaphore version', 'Python: step trace + deadlock'],
    viz: [{
      title: 'Bounded buffer as a circular array with in / out pointers',
      input: '4 P P P P P C C P C C C', inputLabel: 'Capacity, then P (produce) / C (consume). Try: 3 P P P P C C C C',
      gen: bufGen
    }],
    examples: [
      { title: 'Wrap-around arithmetic', html: `<p>N = 4, in = 3, out = 1. Producer writes slot 3 and sets <code>in = (3+1) % 4 = 0</code>: it wrapped. Consumer reads slot 1 and <code>out = 2</code>. Item count = (in - out + N) % N works only if you can tell empty from full; with the counters (or a spare slot) you can.</p>${H.table(['op', 'in', 'out', 'count'], [['start', '0', '0', '0 (empty)'], ['P,P,P', '3', '0', '3'], ['C', '3', '1', '2'], ['P,P', '1', '1', '<span class="c-y">4 (full, in == out!)</span>']])}` },
      { title: 'Why the mutex semaphore is needed with 2 producers', html: `<p>Two producers both pass <code>wait(empty)</code> with one slot free? No: <code>empty</code> would be 1, so only one passes. But with <code>empty = 3</code>, two producers pass together and both read <code>in = 2</code>, write into the same slot, and both set in = 3: one item is overwritten and a slot is skipped. The counting semaphores count <em>space</em>; the mutex protects the <em>indices</em>. With exactly one producer and one consumer the mutex is unnecessary (they touch different indices), which is the basis of lock-free SPSC ring buffers.</p>` },
      { title: 'Producer faster than consumer: back-pressure', html: `<p>Producer makes an item every 1 ms, consumer takes 3 ms. A buffer of 4 fills in ~6 ms; from then on the producer blocks in <code>wait(empty)</code> and runs at the consumer's speed. This is <b>back-pressure</b>: the slow side throttles the fast side and memory stays bounded. An unbounded queue would grow without limit until the machine runs out of memory.</p>` },
      { title: 'Shutting down: the poison pill', html: `<p>How do consumers know there will be no more items? Push a sentinel ("poison pill", like <code>-1</code> in the C++ example) once per consumer, or add a <code>closed</code> flag checked in the wait predicate and <code>notify_all</code> on close. Forgetting this leaves consumers asleep forever and the program hangs on exit.</p>` }
    ],
    deepDive: `<p><b>SPSC lock-free ring.</b> With one producer and one consumer, <code>in</code> is written only by the producer and <code>out</code> only by the consumer. Make them atomics with release/acquire and no lock is needed (used in audio pipelines, network drivers, io_uring's submission and completion rings). Power-of-two capacity lets you replace <code>% N</code> by <code>&amp; (N-1)</code>, and indices that only increase (mask on access) make full/empty unambiguous: full when <code>in - out == N</code>.</p>
      <p><b>MPMC queues.</b> For many producers and consumers, either a mutex (simple, often fast enough) or sequence-numbered slots (Vyukov's bounded MPMC queue) are used. Measure before going lock-free.</p>
      <p><b>False sharing.</b> Put <code>in</code> and <code>out</code> on separate cache lines (<code>alignas(64)</code>) or producer and consumer will fight over one line.</p>
      <p><b>Batching and notify cost.</b> Waking a sleeper takes a system call. Many queues only notify on the empty→non-empty transition, or let consumers drain a batch under one lock, which massively cuts overhead.</p>
      <p><b>Semaphores vs cv version.</b> The semaphore version needs three objects and careful wait order but has no explicit loop; the monitor version has a loop and two cvs but is easier to extend (close(), timeouts, priorities, multiple wait conditions). Exceptions: if an item copy throws while you hold the lock, RAII handles the unlock but the semaphores approach would leak a token unless carefully guarded.</p>`,
    aiEra: `<p><b>What AI changes:</b> bounded buffers are the heart of LLM serving and agent pipelines: request queues with a maximum depth, token streaming channels, batch builders that collect up to <code>k</code> requests or wait <code>t</code> ms. "Back-pressure when the GPU is saturated" is the same problem.</p>
      <p><b>Use AI as a partner:</b> ask for a stress test: <code>Write a test with 4 producers and 4 consumers that checks that every item is consumed exactly once and the program exits.</code> Run it under ThreadSanitizer. Also ask it to explain how a library queue (Python <code>queue.Queue</code>, Java <code>ArrayBlockingQueue</code>) is built.</p>
      <p><b>Where AI goes wrong:</b> it uses <code>notify_one</code> with one shared cv for both conditions (stalls), forgets the shutdown path, or swaps the semaphore wait order. It may also suggest an unbounded queue "for simplicity", which removes back-pressure and causes out-of-memory incidents.</p>
      <p><b>What you must still own:</b> choosing the capacity and the overflow policy (block, drop oldest, reject), and being able to write the three-semaphore pseudo-code from memory including why the order is empty→mutex.</p>`,
    problems: [prob('Bounded Buffer with Semaphores and with Condition Variables', 'Medium', ['producer-consumer', 'semaphore', 'monitor'],
      `<p>Implement a bounded buffer of capacity N shared by many producers and many consumers, twice: (a) using semaphores, (b) using one mutex and condition variables. For (a), explain which swap of two lines causes deadlock and show the exact schedule. For (b), explain why two condition variables are better than one.</p>`,
      `<p>N = 1. Producer P1 puts item 1. P1 then tries to put item 2 with <code>wait(mutex); wait(empty)</code>: it holds mutex and sleeps. Consumer: <code>wait(full)</code> OK, <code>wait(mutex)</code> blocks. ${H.c('r', 'Deadlock')}: P1 waits for a consumer, consumer waits for P1's mutex.</p>`,
      `<p>One big mutex with a polling loop: lock; if the buffer is full, unlock, sleep(1ms), retry. Burns CPU and wastes up to a millisecond per hand-off; also unfair.</p>`,
      { q: 'In the semaphore solution, why must a producer wait(empty) BEFORE wait(mutex)?', options: ['Otherwise it could sleep on empty while holding the mutex the consumer needs', 'Because empty is faster', 'Because mutex starts at 0', 'It does not matter'], answer: 0, explain: 'Sleeping while holding the mutex blocks every consumer, so no slot is ever freed: circular wait and deadlock.' },
      [`<p>Hint 1: Three things to track: free slots, filled slots, and who is touching the indices.</p>`, `<p>Hint 2: Semaphores empty = N, full = 0, mutex = 1. Producer: wait(empty), wait(mutex), write, signal(mutex), signal(full). Consumer is the mirror.</p>`, `<p>Hint 3: For the monitor, one mutex, a queue, and two condition variables not_full / not_empty, each waited on with a while-loop predicate; notify the OTHER side after a change.</p>`],
      `<p><b>(a) Semaphores.</b> <code>empty = N, full = 0, mutex = 1</code>. Producer: <code>wait(empty); wait(mutex); buf[in] = x; in = (in+1)%N; signal(mutex); signal(full);</code>. Consumer: <code>wait(full); wait(mutex); x = buf[out]; out = (out+1)%N; signal(mutex); signal(empty);</code>. Invariants: empty + full = N minus the items in transit; the mutex makes the index update atomic when several producers run. <b>Deadlock when swapped:</b> producer does <code>wait(mutex)</code> then <code>wait(empty)</code>. With N = 1 and the buffer full, producer holds the mutex and sleeps on empty; the consumer passes <code>wait(full)</code> and blocks on <code>wait(mutex)</code> forever. Neither can proceed (hold-and-wait plus circular wait). <b>(b) Monitor.</b> <code>put</code>: lock; <code>while (q.size()==N) not_full.wait(lock)</code>; push; <code>not_empty.notify_one()</code>. <code>take</code>: lock; <code>while (q.empty()) not_empty.wait(lock)</code>; pop; <code>not_full.notify_one()</code>. Two cvs are better because a notify wakes only the kind of thread that can use the change; with one cv and notify_one, a consumer might wake another consumer while the producer who could run keeps sleeping, and the system stalls (you would need notify_all, which is wasteful). Add a closed flag for clean shutdown.</p>`,
      `<p>O(1) per put/take; throughput limited by the lock; memory O(N).</p>`,
      ['Make it lock-free for one producer and one consumer.', 'Add close() so consumers drain and exit.'])]
  });

  /* =================== TOPIC 7: readers-writers =================== */
  topics.push({
    title: 'Readers-Writers Problem (and Writer Starvation)',
    analogy: `<p>A <b>library reading room</b> with one whiteboard. Any number of people may stand and <b>read</b> the board together. But when someone wants to <b>erase and rewrite</b> it, everybody must leave first and the writer works alone. If readers keep strolling in so the room is never empty, the poor writer waits forever. A rule such as "once a writer is waiting, no new readers may enter" fixes it, but then a long line of writers can starve the readers.</p>`,
    explain: `<p>Many threads <b>read</b> shared data; some <b>write</b>. Reads do not conflict with each other, so we allow them to run in parallel; a write conflicts with everything, so it needs exclusive access. This beats a plain mutex whenever reads greatly outnumber writes (caches, routing tables, configuration).</p>
      ${H.table(['', 'reader inside', 'writer inside'], [['reader wants in', '<span class="c-g">allowed</span>', '<span class="c-r">wait</span>'], ['writer wants in', '<span class="c-r">wait</span>', '<span class="c-r">wait</span>']])}
      <p><b>First readers-writers problem (reader preference).</b> No reader waits unless a writer is actually writing. Classic code:</p>
      <pre>semaphore rw = 1;      // writers / "the room is mine"
semaphore mutex = 1;   // protects readcount
int readcount = 0;

reader:                         writer:
  wait(mutex);                    wait(rw);
  readcount++;                    ... write ...
  if (readcount == 1)             signal(rw);
      wait(rw);   // first reader locks writers out
  signal(mutex);
  ... read ...
  wait(mutex);
  readcount--;
  if (readcount == 0)
      signal(rw); // last reader lets writers in
  signal(mutex);</pre>
      <p>Problem: a continuous stream of readers keeps <code>readcount &gt; 0</code>, so <code>rw</code> is never released: <b>writer starvation</b>.</p>
      <p><b>Second problem (writer preference).</b> Once a writer is waiting, new readers must wait behind it. Standard fix: add a <b>turnstile</b> semaphore <code>gate</code>. Every reader and writer passes through <code>wait(gate); ... signal(gate)</code> first. A writer holds the gate while it waits for <code>rw</code>, so new readers pile up at the gate; the current readers drain out, the writer gets in. Now writers may starve readers if they arrive continuously.</p>
      <p><b>Third problem (fair).</b> Use the turnstile in FIFO order (a strong semaphore): a reader that arrives after a waiting writer queues behind it, but readers behind other readers can still go in together. Nobody starves.</p>
      <p>In practice use a library read-write lock: C++17 <code>std::shared_mutex</code> (<code>shared_lock</code> for readers, <code>unique_lock</code> for writers), POSIX <code>pthread_rwlock_t</code>, Java <code>ReentrantReadWriteLock</code>. Their fairness policy is implementation defined, so read the docs.</p>`,
    clues: ['"many readers, few writers" → read-write lock, not a plain mutex', '"writers starve" / "reader preference" / "writer preference" → the three variants', '"readcount" and "first reader locks, last reader unlocks" → classic reader-preference code', '"shared_mutex / RWLock / ReadWriteLock" → library answer', '"upgrade a read lock to a write lock" → deadlock risk if two readers both try', '"read-mostly data, no writer should wait forever" → fairness / turnstile'],
    code: [
      { lang: 'cpp', title: 'Reader preference with semaphores (the textbook solution)', code: `#include <semaphore>
#include <mutex>
#include <thread>
#include <iostream>

std::binary_semaphore rw(1);       // exclusive access for a writer, or "readers are in"
std::mutex rc_mutex;               // protects read_count
int read_count = 0;
int shared_value = 0;              // the data being protected

int read_it() {
    {
        std::lock_guard<std::mutex> g(rc_mutex);
        if (++read_count == 1) rw.acquire();   // first reader locks writers out
    }
    int v = shared_value;                      // many readers may be here together
    {
        std::lock_guard<std::mutex> g(rc_mutex);
        if (--read_count == 0) rw.release();   // last reader lets writers in
    }
    return v;
}

void write_it(int v) {
    rw.acquire();                              // wait until no reader and no writer
    shared_value = v;                          // exclusive
    rw.release();
}

int main() {
    std::thread w([] { for (int i = 1; i <= 100; ++i) write_it(i); });
    std::thread r1([] { for (int i = 0; i < 100; ++i) (void)read_it(); });
    std::thread r2([] { for (int i = 0; i < 100; ++i) (void)read_it(); });
    w.join(); r1.join(); r2.join();
    std::cout << read_it() << "\\n";            // 100
}` },
      { lang: 'cpp', title: 'Fix writer starvation with a turnstile, and the shared_mutex shortcut', code: `#include <semaphore>
#include <mutex>
#include <shared_mutex>
#include <thread>
#include <map>
#include <string>
#include <iostream>

// ---- Writer-friendly version: a turnstile that new readers must pass through ----
std::binary_semaphore turnstile(1);   // a waiting writer HOLDS this, stopping new readers
std::binary_semaphore room_empty(1);  // held by the writer, or collectively by the readers
std::mutex rc_mutex;
int readers = 0;
int shared_data = 0;

void reader() {
    turnstile.acquire();              // queue up behind a waiting writer
    turnstile.release();              // (readers pass through quickly if no writer waits)
    { std::lock_guard<std::mutex> g(rc_mutex); if (++readers == 1) room_empty.acquire(); }
    volatile int v = shared_data; (void)v;   // read
    { std::lock_guard<std::mutex> g(rc_mutex); if (--readers == 0) room_empty.release(); }
}

void writer(int v) {
    turnstile.acquire();              // block NEW readers from now on
    room_empty.acquire();             // wait for the readers already inside to drain
    shared_data = v;                  // exclusive write
    room_empty.release();
    turnstile.release();              // let readers back in
}

// ---- The library way: std::shared_mutex ----
std::shared_mutex sm;
std::map<std::string, int> table;

int lookup(const std::string& k) {
    std::shared_lock lk(sm);          // many readers at once
    auto it = table.find(k);
    return it == table.end() ? -1 : it->second;
}
void update(const std::string& k, int v) {
    std::unique_lock lk(sm);          // exclusive
    table[k] = v;
}

int main() {
    std::thread w([] { for (int i = 0; i < 50; ++i) writer(i); });
    std::thread r([] { for (int i = 0; i < 50; ++i) reader(); });
    w.join(); r.join();
    update("x", 7);
    std::cout << lookup("x") << "\\n";
}` },
      { lang: 'python', run: true, title: 'Writer starvation under reader preference vs writer preference (deterministic)', code: `# Discrete-time simulation: readers keep arriving every tick, each reads for 3 ticks.
# One writer arrives at tick 2 and needs 2 ticks. Does the writer ever get in?
def simulate(policy, horizon=30):
    arrivals = {}                                   # tick -> list of (name, kind, duration)
    for t in range(0, 20):                          # a steady stream of readers
        arrivals.setdefault(t, []).append((f"R{t}", "R", 3))
    arrivals.setdefault(2, []).append(("W", "W", 2))
    waiting, readers, writer = [], {}, None          # readers: name -> finish tick
    writer_wait_start, writer_started = None, None
    for t in range(horizon):
        for name, kind, d in arrivals.get(t, []):
            waiting.append((name, kind, d))
            if kind == "W":
                writer_wait_start = t
        for n in [n for n, end in readers.items() if end <= t]:
            del readers[n]                           # reader leaves
        if writer and writer[1] <= t:
            writer = None                            # writer leaves
        # admit waiting threads according to the policy
        progress = True
        while progress:
            progress = False
            w_waiting = any(k == "W" for _, k, _ in waiting)
            if writer is None:
                if not readers and w_waiting and (policy == "writer" or
                                                  not any(k == "R" for _, k, _ in waiting)):
                    i = next(i for i, x in enumerate(waiting) if x[1] == "W")
                    name, _, d = waiting.pop(i)
                    writer = (name, t + d)
                    writer_started = t
                    progress = True
                else:
                    for i, (name, kind, d) in enumerate(waiting):
                        if kind == "R" and (policy == "reader" or not w_waiting):
                            waiting.pop(i)
                            readers[name] = t + d
                            progress = True
                            break
    return writer_wait_start, writer_started

for policy in ("reader", "writer"):
    arrived, started = simulate(policy)
    if started is None:
        print(f"{policy}-preference: writer arrived at tick {arrived} and NEVER got in (starved)")
    else:
        print(f"{policy}-preference: writer arrived at tick {arrived}, started at tick {started}, "
              f"waited {started - arrived} ticks")
` }
    ],
    codeTitle: ['C++: reader-preference semaphores', 'C++: turnstile + shared_mutex', 'Python: starvation simulation'],
    viz: [{
      title: 'Readers-writers room: who gets in?',
      input: 'reader R1+ R2+ W1+ R3+ R1- R2- R3- W1-', inputLabel: 'Policy (reader or writer) then events: X+ arrive, X- finish. Try with the first word writer',
      gen: rwGen
    }],
    examples: [
      { title: 'Reader preference lets R3 jump the queue', html: `<p>R1 and R2 are reading; W1 arrives and must wait. R3 arrives: under <b>reader preference</b> it enters immediately because no writer is <em>active</em>. As long as new readers keep arriving before the old ones leave, W1 never gets the room. Under <b>writer preference</b>, R3 waits behind W1, so W1 runs as soon as R1 and R2 finish. Run the visualizer with both words and compare.</p>` },
      { title: 'Choosing a policy', html: `${H.table(['policy', 'good for', 'danger'], [['reader preference', 'read-heavy caches where stale-but-fast is OK', 'writers starve'], ['writer preference', 'data that must be fresh, e.g. config reload', 'readers starve under heavy writing'], ['fair (FIFO)', 'general purpose', 'less parallelism: readers wait behind a writer'], ['seqlock / RCU', 'extremely read-heavy, tiny data', 'complex; readers may retry or see old data']])}<p>There is no free lunch: somebody waits. Say which side you protect and why.</p>` },
      { title: 'Lock upgrade deadlock', html: `<p>Two threads each hold a <b>read</b> lock and each decide to upgrade to a <b>write</b> lock. Each waits for the other to release its read lock: <span class="c-r">deadlock</span>. That is why <code>std::shared_mutex</code> has no upgrade. Release the read lock, take the write lock, and <b>re-validate</b> what you read (it may have changed), or use an "upgradable read lock" that only one thread can hold at a time.</p>` },
      { title: 'Is a read-write lock always faster?', html: `<p>No. A shared_lock still does an atomic increment on a shared counter, so many readers on many cores bounce one cache line. For short read sections a plain mutex can be equally fast, and an RW lock is usually slower per operation. It pays off when the read section is <b>long</b> (milliseconds) and reads dominate.</p>` }
    ],
    deepDive: `<p><b>Why the first reader locks and the last one unlocks.</b> The readers act as one "group" that holds <code>rw</code> collectively. <code>readcount</code> is the group's membership counter, protected by its own mutex because several readers may arrive together. Notice the subtle effect: the first reader blocks on <code>rw</code> while holding <code>rc_mutex</code>, so later readers queue on <code>rc_mutex</code> instead; correct, but a source of "convoys".</p>
      <p><b>Fairness through the turnstile.</b> The turnstile is held by a writer for its whole wait, and readers touch it only briefly. If the semaphore is FIFO, a reader arriving after a waiting writer is blocked, which gives writer preference; combined with FIFO order for the writers it produces no-starvation behaviour for everybody (the "third readers-writers problem").</p>
      <p><b>Alternatives.</b> <b>Seqlock</b>: writers bump a version counter before and after writing; readers read, then re-check the version and retry if it changed. No reader ever blocks a writer (used for the Linux kernel clock). <b>RCU</b> (read-copy-update): writers make a new copy and swap a pointer; readers run lock-free and see either the old or the new version; the old one is freed after a "grace period". Used heavily in the Linux kernel for routing tables and file-system lookups. <b>Copy-on-write snapshots</b> and immutable data are the application-level cousins.</p>
      <p><b>Real implementation costs.</b> <code>pthread_rwlock</code> prefers readers by default on Linux (<code>PTHREAD_RWLOCK_PREFER_WRITER_NONRECURSIVE_NP</code> exists). Windows SRW locks are not fair. Java's <code>ReentrantReadWriteLock(true)</code> gives roughly FIFO fairness at a throughput cost, and its <code>StampedLock</code> offers optimistic reads.</p>`,
    aiEra: `<p><b>What AI changes:</b> read-mostly shared state is everywhere in AI systems: model weights loaded once and read by thousands of requests, feature caches, prompt-template registries, routing tables for model fleets. Hot reload of config or model versions is a "rare writer" event.</p>
      <p><b>Use AI as a partner:</b> ask it to <code>build a stress test with 8 readers and 1 writer measuring max writer wait time under each lock implementation</code>. The starvation numbers make the trade-off concrete. Ask it to describe RCU or seqlocks and then check with the kernel docs.</p>
      <p><b>Where AI goes wrong:</b> it assumes <code>shared_mutex</code> is fair (it is not guaranteed), implements the readcount code without protecting readcount, forgets that readers must not modify data under a shared lock (a "read" that updates a stats counter is a race), or proposes lock upgrading.</p>
      <p><b>What you must still own:</b> the policy decision (who may starve, and is that acceptable?), and verifying that "read-only" code is truly read-only. For high-load services, measure: an RW lock can be slower than a mutex.</p>`,
    problems: [prob('Fix Writer Starvation in Readers-Writers', 'Hard', ['readers-writers', 'starvation', 'semaphore'],
      `<p>The reader-preference solution (readcount + rw semaphore) starves writers when readers keep arriving. Modify it so that no writer waits forever, while still letting multiple readers read at the same time. Explain how your fix behaves for the schedule: R1 reading, W arrives, R2 arrives, R1 leaves.</p>`,
      `<p>Original: R1 reads (readcount 1). W waits on rw. R2 arrives: readcount 2, enters. R1 leaves: readcount 1, rw still held; W still waits. If R3 arrives before R2 leaves, ${H.c('r', 'W waits again')}: starvation. With a turnstile: W takes the gate, so R2 waits behind it; when R1 leaves, W enters, then R2.</p>`,
      `<p>Make every thread (reader or writer) take a single mutex and run alone. No starvation, but you lose all reader parallelism, which is the whole point of an RW lock.</p>`,
      { q: 'What does the writer hold while waiting for existing readers to leave in the turnstile solution?', options: ['The turnstile (gate) semaphore, blocking new readers', 'The readcount mutex only', 'Nothing', 'A busy-wait spinlock on readcount'], answer: 0, explain: 'Holding the gate means every reader arriving afterwards queues at the gate, so only the readers already inside must drain.' },
      [`<p>Hint 1: Starvation happens because new readers can join an already-reading group. Stop new readers when a writer is waiting.</p>`, `<p>Hint 2: Add a "gate" semaphore. Readers pass through the gate briefly (acquire then release); a writer acquires the gate and keeps it until it has finished writing.</p>`, `<p>Hint 3: Writer: acquire(gate), acquire(rw) (wait for old readers to drain), write, release(rw), release(gate). Reader: acquire(gate), release(gate), then the normal readcount code. Use a FIFO (strong) semaphore for the gate if you want strict fairness.</p>`],
      `<p>Add a <code>gate</code> semaphore (initial value 1) in front of the original protocol. <b>Reader:</b> <code>wait(gate); signal(gate);</code> then run the normal reader code (wait(mutex), readcount++, first reader waits on rw, signal(mutex), read, wait(mutex), readcount--, last reader signals rw, signal(mutex)). <b>Writer:</b> <code>wait(gate); wait(rw); write; signal(rw); signal(gate);</code>. For the schedule R1 reading, W arrives, R2 arrives, R1 leaves: W takes the gate, then blocks on rw because R1's group still holds it. R2 arrives and blocks on the gate (it cannot even join the group). R1 leaves, readcount reaches 0, the last reader signals rw. W acquires rw, writes, releases rw and then the gate. R2 now passes the gate and reads. W waited only for readers that were already inside when it arrived, so it cannot starve. Cost: readers arriving while a writer is pending are delayed, and a stream of writers can now starve readers. For fairness for both, make the gate a FIFO semaphore: arrivals are served in order, and consecutive readers still enter together. A completely different option is a seqlock or RCU, where readers never block writers.</p>`,
      `<p>Constant extra work per operation (one extra semaphore pass). Bounded waiting for writers: at most the readers already inside.</p>`,
      ['Prove readers still run concurrently.', 'What does Java ReentrantReadWriteLock(true) do?'])]
  });

  /* =================== TOPIC 8: dining philosophers =================== */
  topics.push({
    title: 'Dining Philosophers (Deadlock and Its Fixes)',
    analogy: `<p>Five friends sit at a round table with <b>five chopsticks</b>, one between each pair of neighbours. To eat noodles, each needs <b>two</b> chopsticks: the one on the left and the one on the right. If all five grab their left chopstick at the same moment, every hand is full and every friend waits for the right one, which is held by the neighbour, who waits for <em>his</em> right one... Nobody eats, nobody lets go. That frozen circle is a <b>deadlock</b>.</p>`,
    explain: `<p>Dijkstra's problem (1965) is a toy model for any program that needs <b>several resources at once</b> (two locks, two database rows, two files). Philosopher <code>i</code> uses fork <code>i</code> (left) and fork <code>(i+1) mod 5</code> (right).</p>
      <pre>// naive solution: looks right, can deadlock
while (true) {
    think();
    lock(fork[i]);              // pick up left
    lock(fork[(i+1) % 5]);      // pick up right
    eat();
    unlock(fork[(i+1) % 5]);
    unlock(fork[i]);
}</pre>
      <p><b>Why it deadlocks.</b> All four <b>Coffman conditions</b> hold: mutual exclusion (a fork has one user), hold-and-wait (holding left, waiting for right), no preemption (nobody forces a fork away), and <b>circular wait</b> (P0 waits for P1 waits for ... waits for P0). Break any one and deadlock is impossible.</p>
      ${H.table(['fix', 'which condition it breaks', 'cost'], [['Resource ordering: always take the lower-numbered fork first', 'circular wait', 'tiny; works for any number of locks'], ['Asymmetric: odd philosophers go right-then-left', 'circular wait', 'tiny; the cycle cannot close'], ['Waiter / semaphore of N-1 seats', 'hold-and-wait cycle (at most 4 can hold a fork)', 'one extra shared object, reduces parallelism'], ['Take both forks atomically (all-or-nothing, std::scoped_lock)', 'hold-and-wait', 'needs lock-all primitive, possible starvation'], ['try_lock, put the first fork down on failure, back off randomly', 'no preemption (voluntary release)', 'possible livelock; use random back-off']])}
      <p><b>Starvation vs deadlock.</b> Even without deadlock, one philosopher can be unlucky forever (both neighbours always eat first). Deadlock = nobody progresses. Starvation = somebody never progresses. Livelock = everybody keeps trying but no progress (all pick up left, see right busy, put left down, repeat in lock step).</p>
      <p><b>The resource ordering rule, the most useful one in real life:</b> give every lock a global number, and always acquire in increasing order. Then a cycle needs some thread to go from a higher-numbered lock to a lower one, which the rule forbids. Philosopher 4 holds forks 4 and 0, so he takes fork 0 first; that single reversal breaks the circle.</p>`,
    clues: ['"each needs two resources at once" → dining philosophers', '"all threads hold one lock and wait for another" → circular wait / deadlock', '"how do you prevent deadlock with multiple locks?" → global lock ordering, or lock-all-at-once', '"four Coffman conditions" → mutual exclusion, hold and wait, no preemption, circular wait', '"transfer(a, b) and transfer(b, a) hang" → lock ordering by account id (classic bank transfer bug)', '"threads keep retrying but never progress" → livelock, add random back-off'],
    code: [
      { lang: 'cpp', title: 'Fix 1 and 2: lock ordering, and std::scoped_lock (all-or-nothing)', code: `#include <mutex>
#include <thread>
#include <vector>
#include <iostream>
#include <algorithm>

constexpr int N = 5;
std::mutex fork_[N];
int meals[N] = {0};

// Fix 1: resource ordering. Always lock the LOWER-numbered fork first.
void philosopher_ordered(int i) {
    int a = i, b = (i + 1) % N;
    if (a > b) std::swap(a, b);              // philosopher 4 locks fork 0 before fork 4
    for (int k = 0; k < 1000; ++k) {
        std::lock_guard<std::mutex> first(fork_[a]);
        std::lock_guard<std::mutex> second(fork_[b]);
        ++meals[i];                           // eat
    }
}

// Fix 2: take both forks as ONE step. std::scoped_lock uses a deadlock-avoidance
// algorithm (try-and-back-off) internally, so the order you write does not matter.
void philosopher_scoped(int i) {
    for (int k = 0; k < 1000; ++k) {
        std::scoped_lock both(fork_[i], fork_[(i + 1) % N]);
        ++meals[i];
    }
}

int main() {
    std::vector<std::thread> ts;
    for (int i = 0; i < N; ++i) ts.emplace_back(philosopher_ordered, i);
    for (auto& t : ts) t.join();
    ts.clear();
    for (int i = 0; i < N; ++i) ts.emplace_back(philosopher_scoped, i);
    for (auto& t : ts) t.join();
    for (int i = 0; i < N; ++i) std::cout << meals[i] << " ";   // 2000 each
    std::cout << "\\n";
}` },
      { lang: 'cpp', title: 'Fix 3: a waiter (counting semaphore of N-1) and the naive version it repairs', code: `#include <mutex>
#include <semaphore>
#include <thread>
#include <vector>
#include <iostream>

constexpr int N = 5;
std::mutex fork_[N];
std::counting_semaphore<N> seats(N - 1);   // at most 4 philosophers may try to eat

// With only 4 seated, by pigeonhole at least one of them can always get BOTH forks.
void philosopher_waiter(int i) {
    for (int k = 0; k < 1000; ++k) {
        seats.acquire();                           // ask the waiter for a seat
        fork_[i].lock();                           // left
        fork_[(i + 1) % N].lock();                 // right: naive order is now safe
        /* eat */
        fork_[(i + 1) % N].unlock();
        fork_[i].unlock();
        seats.release();                           // leave the table
    }
}

// The broken original (do NOT run): every thread may hold its left fork and wait for its right.
void philosopher_naive(int i) {
    for (;;) {
        fork_[i].lock();
        fork_[(i + 1) % N].lock();                 // potential circular wait
        fork_[(i + 1) % N].unlock();
        fork_[i].unlock();
    }
}

int main() {
    std::vector<std::thread> ts;
    for (int i = 0; i < N; ++i) ts.emplace_back(philosopher_waiter, i);
    for (auto& t : ts) t.join();
    std::cout << "everyone finished\\n";
}` },
      { lang: 'python', run: true, title: 'Detect the deadlock cycle, then compare four fixes (deterministic)', code: `# Dining philosophers: deterministic round-robin simulation + deadlock detection.
# Fork i sits between philosopher i and philosopher i+1.
N = 5

def fork_order(strategy, i):
    left, right = i, (i + 1) % N
    if strategy == "naive":
        return [left, right]                       # everyone: left first
    if strategy == "ordered":
        return sorted([left, right])               # lowest-numbered fork first
    if strategy == "asymmetric":
        return [left, right] if i % 2 == 0 else [right, left]
    raise ValueError(strategy)

def find_cycle(waiting_for, owner):
    """Wait-for graph: philosopher p waits for fork f, which is held by owner[f]."""
    for start in waiting_for:
        seen, p = [], start
        while p is not None and p not in seen:
            seen.append(p)
            f = waiting_for.get(p)
            p = owner.get(f) if f is not None else None
        if p is not None and p in seen:
            return seen[seen.index(p):]
    return None

def simulate(strategy, max_rounds=30, limit_seats=None):
    owner, held, waiting_for = {}, {i: [] for i in range(N)}, {}
    done, ate = set(), []
    seated = set()
    for rnd in range(max_rounds):
        progress = False
        for i in range(N):
            if i in done:
                continue
            if limit_seats and i not in seated and len(seated) >= limit_seats:
                continue                              # waiter: only 4 may sit at the table
            seated.add(i)
            if len(held[i]) == 2:                     # has both forks: eat, then put them down
                ate.append(i)
                for f in held[i]:
                    del owner[f]
                held[i] = []
                done.add(i)
                seated.discard(i)
                progress = True
                continue
            f = fork_order(strategy, i)[len(held[i])]
            if f not in owner:
                owner[f] = i
                held[i].append(f)
                waiting_for.pop(i, None)
                progress = True
            else:
                waiting_for[i] = f
        if len(done) == N:
            return "all ate", ate
        if not progress:
            cyc = find_cycle(waiting_for, owner)
            return f"DEADLOCK cycle {cyc}", ate
    return "unfinished", ate

for strategy, seats in (("naive", None), ("ordered", None), ("asymmetric", None), ("naive", 4)):
    result, ate = simulate(strategy, limit_seats=seats)
    label = strategy + (f" + waiter allows {seats} seated" if seats else "")
    print(f"{label:34s} -> {result}; eaten in order: {ate}")
` }
    ],
    codeTitle: ['C++: ordering and scoped_lock', 'C++: waiter semaphore (and the naive bug)', 'Python: deadlock detection + fixes'],
    viz: [{
      title: 'Philosophers and forks: find the circular wait',
      input: 'naive', inputLabel: 'Strategy: naive, ordered or asymmetric',
      gen: diningGen
    }],
    examples: [
      { title: 'The deadlock, step by step', html: `<p>Round 1: P0 takes F0, P1 takes F1, P2 takes F2, P3 takes F3, P4 takes F4. Round 2: P0 wants F1 (held by P1), P1 wants F2 (held by P2) ... P4 wants F0 (held by P0). The wait-for graph is the cycle <code>P0 → P1 → P2 → P3 → P4 → P0</code>. No edge can ever disappear because nobody finishes eating.</p>${H.table(['philosopher', 'holds', 'wants', 'held by'], [['P0', 'F0', 'F1', 'P1'], ['P1', 'F1', 'F2', 'P2'], ['P2', 'F2', 'F3', 'P3'], ['P3', 'F3', 'F4', 'P4'], ['P4', 'F4', 'F0', '<span class="c-r">P0 (cycle closes)</span>']])}` },
      { title: 'Fix by ordering: the cycle cannot close', html: `<p>Each philosopher takes the lower-numbered fork first. P4's forks are F4 and F0, so P4 asks for <b>F0 first</b>. If P0 holds F0, P4 waits <em>without holding anything</em>, so F4 stays free and P3 can take F3 then F4 and eat. When P3 finishes, P2 can get F3, and the chain unwinds: P3, P2, P1, P0, P4 eat in turn. The Python simulation above prints exactly this order.</p>` },
      { title: 'Asymmetric fix', html: `<p>Even philosophers take left-then-right, odd philosophers right-then-left. Two neighbours never both hold "their first fork" in a way that forms a full circle, because somewhere around the table two adjacent philosophers compete for the <em>same</em> fork as their first choice, and only one can have it. The other holds nothing, so progress is possible.</p>` },
      { title: 'The same bug in a bank transfer', html: `<p><code>transfer(a, b)</code> locks account a then b. Thread 1 runs transfer(X, Y); thread 2 runs transfer(Y, X). Each locks its first account and waits for the other: two-philosopher deadlock. Fix: lock the account with the smaller id first, whichever direction the money goes (or use <code>std::scoped_lock(a.m, b.m)</code>).</p>`,
        code: { lang: 'cpp', code: `#include <mutex>
struct Account { int id; long balance; std::mutex m; };

void transfer(Account& from, Account& to, long amount) {
    if (&from == &to) return;                       // locking the same mutex twice would self-deadlock
    std::scoped_lock lk(from.m, to.m);              // acquires both without deadlock
    from.balance -= amount;
    to.balance += amount;
}` } }
    ],
    deepDive: `<p><b>Detection vs prevention vs avoidance.</b> The fixes above are <em>prevention</em> (break a Coffman condition by design). <em>Avoidance</em> (the Banker's algorithm) checks each request against future needs; <em>detection</em> builds the wait-for graph at runtime and breaks cycles by killing or rolling back a victim. Databases use detection: Postgres and MySQL find the cycle and abort one transaction with a "deadlock detected" error; applications must retry. We study these formally in the next module.</p>
      <p><b>What std::scoped_lock does.</b> With several mutexes it calls the <code>std::lock</code> algorithm: lock the first, <code>try_lock</code> the rest, and if any fails, unlock everything and start over from the failed one. It never holds a lock while blocking on another one, so hold-and-wait is broken. Cost: extra atomic operations and possible livelock-like retries under heavy contention.</p>
      <p><b>Chandy-Misra</b> solves the problem for arbitrary graphs with no central waiter: forks are "clean" or "dirty" and are passed by request messages, giving fairness. Useful for distributed systems.</p>
      <p><b>Lock hierarchy in practice.</b> Linux's lockdep builds a graph of "lock A taken while holding lock B" at runtime and warns the first time two orders are seen, even if the deadlock did not happen yet. Clang's <code>-Wthread-safety</code> with <code>ACQUIRED_BEFORE</code>, and Java's <code>jstack</code> deadlock report, help find them. Debug builds of mutexes can record the owner and give "owner died" or "deadlock detected" errors (<code>PTHREAD_MUTEX_ERRORCHECK</code>).</p>
      <p><b>Starvation caveats.</b> Ordering and asymmetry prevent deadlock but do not guarantee fairness; a fair solution needs queueing (e.g., the waiter serving requests FIFO).</p>`,
    aiEra: `<p><b>What AI changes:</b> agentic systems create new multi-resource deadlocks: an agent holds a GPU slot and waits for a tool lock; another holds the tool lock and waits for a GPU slot. Two services each waiting on the other's reply with bounded thread pools produce "distributed dining philosophers", the classic cause of cascading timeouts.</p>
      <p><b>Use AI as a partner:</b> give it a thread dump or <code>jstack</code>/<code>gdb thread apply all bt</code> output and ask <code>find the wait-for cycle and name the locks involved</code>. It is fast at reading 500 lines of stack traces. Ask it to propose a global lock order for your module and list the violations.</p>
      <p><b>Where AI goes wrong:</b> it "fixes" a deadlock with a timeout or a retry that hides the problem (and turns it into a livelock), adds a giant global lock (correct but kills throughput), or picks an ordering that does not cover all code paths.</p>
      <p><b>What you must still own:</b> the lock-ordering discipline across the whole codebase and the four Coffman conditions. In an interview, always name the condition each fix breaks.</p>`,
    problems: [prob('Fix Dining Philosophers by Ordering and by Asymmetric Picking', 'Hard', ['deadlock', 'dining philosophers', 'lock ordering'],
      `<p>Five philosophers each use fork i and fork (i+1) mod 5. The naive "left then right" solution deadlocks. (a) Show the deadlock. (b) Fix it by <b>global resource ordering</b>. (c) Fix it by <b>asymmetric picking</b>. (d) Fix it with a <b>waiter</b>. For each fix, name the Coffman condition that is broken and say whether it can starve someone.</p>`,
      `<p>Naive: all take left. Wait-for cycle P0→P1→P2→P3→P4→P0, ${H.c('r', 'deadlock')}. Ordering: P4 takes F0 then F4; P3 eats first, then P2, P1, P0, P4. Asymmetric: odd philosophers go right-first.</p>`,
      `<p>Give every philosopher a timeout: if the second fork is not available within 1 second, drop the first and retry. No deadlock, but the retry can repeat in lock step forever (livelock) and wastes CPU.</p>`,
      { q: 'Which Coffman condition does "always acquire locks in increasing id order" break?', options: ['Circular wait', 'Mutual exclusion', 'No preemption', 'Hold and wait'], answer: 0, explain: 'A cycle would need at least one thread holding a higher-numbered lock while waiting for a lower-numbered one, which the rule forbids.' },
      [`<p>Hint 1: Deadlock needs a circle of waits. Find a way to make the circle impossible.</p>`, `<p>Hint 2: Give the forks numbers 0..4 and make everyone pick the smaller number first. Who is the one philosopher whose "left" is the larger number?</p>`, `<p>Hint 3: For the waiter, allow at most 4 philosophers to try at once (semaphore of 4). By the pigeonhole principle among 4 philosophers and 5 forks one of them can always get both forks.</p>`],
      `<p><b>(a) The deadlock.</b> Every philosopher picks up the left fork, so philosopher i holds fork i and waits for fork i+1, held by philosopher i+1. The wait-for graph is the cycle P0→P1→P2→P3→P4→P0. All four Coffman conditions hold. <b>(b) Resource ordering.</b> Number the forks and always take the lower number first. Only P4 differs: his forks are 4 and 0, so he asks for fork 0 first. If P0 holds fork 0, P4 waits but holds nothing, leaving fork 4 free; P3 takes fork 3 then 4 and eats, then P2, P1, P0, P4 follow. This breaks <em>circular wait</em>. No deadlock; fairness is not guaranteed (a philosopher can be unlucky repeatedly) unless the locks are FIFO. <b>(c) Asymmetric.</b> Even philosophers pick left then right, odd ones right then left. Two neighbours then compete for the same fork as their first pick, and the loser holds nothing, so the ring can never be completely filled with "holders waiting for the next". Also breaks circular wait. <b>(d) Waiter.</b> A counting semaphore with N-1 = 4 permits: at most 4 philosophers hold forks at once. With 5 forks and 4 philosophers, someone can always take both forks, so progress is guaranteed; this breaks the cycle by limiting hold-and-wait participants. Fair if the semaphore is FIFO. Mention std::scoped_lock (take both atomically, breaking hold-and-wait) and that timeouts alone only change deadlock into livelock.</p>`,
      `<p>All fixes add O(1) work per meal. Ordering and asymmetry add no shared state; the waiter adds one semaphore all philosophers contend on.</p>`,
      ['Generalise to N philosophers and prove the ordering rule.', 'How does the database engine detect and resolve a deadlock?'])]
  });

  /* =================== PRACTICE =================== */
  function hs(a, b, c) { return ['<p>' + a + '</p>', '<p>' + b + '</p>', '<p>' + c + '</p>']; }

  practice.push(prob('Spot the Race: Which Lines Are Unsafe?', 'Easy', ['race condition', 'code review'],
    `<p>Two threads run <code>deposit()</code> on a shared <code>int balance</code>: <code>if (balance &gt;= 0) { balance = balance + 100; log_count++; }</code>. List every shared variable, say which statements are unsafe, and give the smallest fix for each.</p>`,
    `<p>Shared: <code>balance</code> and <code>log_count</code>. Both are read-modify-write: ${H.c('r', 'unsafe')}. The check and the update form a check-then-act race. Fix: one mutex around the whole if-block, or <code>atomic&lt;int&gt;</code> for <code>log_count</code> alone.</p>`,
    `<p>Mark each variable <code>volatile</code>. This only stops the compiler from caching it in a register; it does nothing about the load/add/store interleaving, so the race remains.</p>`,
    { q: 'Why is volatile not a fix for counter++ races in C++?', options: ['It does not make the read-modify-write indivisible', 'It makes the code slower only', 'It removes the compiler warning only', 'It is only for Java'], answer: 0, explain: 'volatile affects compiler optimisations, not atomicity. You need std::atomic or a mutex.' },
    hs('Hint 1: List every variable that more than one thread touches and at least one thread writes.', 'Hint 2: For each, check whether the code reads and then writes it (read-modify-write) or checks and then acts.', 'Hint 3: The check "balance >= 0" and the update must be in the SAME critical section, or another thread can change balance between them. Use one mutex for the group of related variables.'),
    `<p>Shared variables are <code>balance</code> and <code>log_count</code>. Both are updated with read-modify-write sequences (load, add, store), so two threads can lose an update on either one. In addition the <code>if (balance &gt;= 0)</code> is a <em>check-then-act</em>: another thread can change balance after the check and before the update, so the decision may be based on stale data (it would matter if the condition were <code>balance &gt;= 100</code> and the action a withdrawal). Smallest correct fix: put one <code>std::mutex</code> around the whole if-block with <code>lock_guard</code>, because the two variables form one invariant ("log_count equals the number of deposits"). If only a stand-alone counter needed protection, <code>std::atomic&lt;int&gt;</code> would be enough and cheaper, but atomics on each variable separately do not protect the combined invariant.</p>`,
    `<p>Mutex costs one lock/unlock per call; atomics cost a single locked instruction per variable.</p>`,
    ['What does ThreadSanitizer print for this code?', 'When is an atomic alone not enough?']));

  practice.push(prob('Which Critical-Section Requirement Is Violated?', 'Easy', ['critical section', 'theory'],
    `<p>For each proposal say which requirement fails (mutual exclusion, progress, bounded waiting) or "none": (1) a shared <code>turn</code> variable with strict alternation; (2) both threads set <code>flag[i] = true</code>, then wait while <code>flag[j]</code> is true; (3) disabling interrupts on a 1-CPU machine; (4) a lock where waiters are woken in random order and the same thread can re-acquire immediately.</p>`,
    `<p>(1) ${H.c('y', 'progress')}: an idle thread blocks the other. (2) ${H.c('y', 'progress')}/deadlock: both wait forever. (3) none on one CPU. (4) ${H.c('y', 'bounded waiting')}: a thread can be overtaken indefinitely.</p>`,
    `<p>Answer "it works in my test" for every proposal. Tests rarely hit the bad schedule, so they cannot show which property fails.</p>`,
    { q: 'Strict alternation (turn variable) violates which requirement?', options: ['Progress', 'Mutual exclusion', 'Atomicity of loads', 'None'], answer: 0, explain: 'A thread that is not interested still owns the turn and blocks the other one from entering twice in a row.' },
    hs('Hint 1: Recall the three requirements: only one inside; the decision cannot be blocked by uninterested threads; no thread waits forever.', 'Hint 2: For each proposal try to build the schedule that breaks each requirement in turn.', 'Hint 3: Strict alternation breaks progress; flag-only gives both threads the wait state at once (deadlock = progress failure); random wake-up order allows unbounded overtaking.'),
    `<p>(1) Strict alternation guarantees mutual exclusion but violates <b>progress</b>: if thread 1 is slow in its remainder section, thread 0 cannot enter again even though the critical section is empty. (2) Both set their flag and each sees the other's flag true: both spin forever. Mutual exclusion holds (nobody enters) but <b>progress</b> fails because the decision of who enters is postponed indefinitely. (3) Disabling interrupts on a single CPU satisfies everything for kernel code because no other thread can run during the critical section (it fails on multiprocessors and must be short, otherwise interrupts are lost). (4) Random wake-up and immediate re-acquisition allow the unlucky waiter to be overtaken without bound: <b>bounded waiting</b> fails (starvation), while mutual exclusion and progress hold. Summarise: mutual exclusion is a safety property, while progress and bounded waiting are liveness properties.</p>`,
    `<p>No algorithmic cost; this is an analysis exercise.</p>`,
    ['Which property is safety and which are liveness?', 'Does Peterson fix all four proposals?']));

  practice.push(prob('Mutex or Semaphore? Choose the Tool', 'Easy', ['mutex', 'semaphore'],
    `<p>Choose a mutex, a binary semaphore, or a counting semaphore for each job and justify it: (a) protect a linked list; (b) thread B must start only after thread A finished initialisation; (c) allow at most 10 simultaneous downloads; (d) a producer tells a consumer "one more item ready".</p>`,
    `<p>(a) mutex (ownership). (b) semaphore initialised to 0 (signal). (c) counting semaphore, value 10. (d) counting semaphore of items (or a condition variable with a counter).</p>`,
    `<p>Use one global mutex for everything (even for the download limit). It is correct for (a) but cannot count 10 permits and cannot be released by a different thread than the locker.</p>`,
    { q: 'Which feature distinguishes a mutex from a binary semaphore?', options: ['A mutex has an owner: only the locker may unlock', 'A mutex can count above 1', 'A semaphore can only be used in the kernel', 'A mutex never blocks'], answer: 0, explain: 'Ownership lets the system detect misuse and apply priority inheritance. A semaphore can be signalled by any thread, which suits events.' },
    hs('Hint 1: Ask: is it exclusion of a data structure, a count of identical resources, or an event between threads?', 'Hint 2: Exclusion needs ownership (mutex). Events and counts need a counter that anyone can increase (semaphore).', 'Hint 3: Initial value tells the story: 1 = lock, N = N resources, 0 = wait for event.'),
    `<p>(a) <b>Mutex</b>: the list is protected data, the same thread locks and unlocks, and ownership allows priority inheritance and error checking. (b) <b>Semaphore initialised to 0</b>: A calls signal after initialisation, B calls wait first; if A finishes first the token is remembered. A mutex cannot do this because B (not the locker) would need to unlock. (c) <b>Counting semaphore with value 10</b>: each download does acquire before starting and release in a finally block; the 11th caller sleeps. (d) <b>Counting semaphore</b> counting finished items: the consumer waits on it, the producer posts once per item, so n posts allow n waits even if the consumer is slow; this is also the "full" semaphore from the bounded-buffer problem. A condition variable plus a counter is the equivalent monitor solution.</p>`,
    `<p>All options are O(1) per operation.</p>`,
    ['Can a binary semaphore be used as a mutex? What goes wrong?', 'How would you add a timeout to (c)?']));

  practice.push(prob('Spinlock or Sleeping Mutex? Reason with Numbers', 'Easy', ['spinlock', 'mutex', 'performance'],
    `<p>A critical section takes 100 ns. A sleep and wake-up costs about 5 µs. The machine has 8 cores and 4 threads contend. Which lock is better? What if the critical section includes a 2 ms disk read? What if there are 64 runnable threads on 8 cores?</p>`,
    `<p>100 ns: waiters spin for at most ~300 ns, far less than 5 µs: ${H.c('g', 'spinlock')}. 2 ms: spinners burn 2 ms of CPU each: ${H.c('g', 'sleeping mutex')}. 64 threads on 8 cores: the holder may be preempted while others spin: ${H.c('g', 'sleeping mutex / adaptive')}.</p>`,
    `<p>Always spin: simplest code. It collapses when the lock holder is descheduled, because every spinner burns its entire time slice.</p>`,
    { q: 'When is a spinlock a bad idea?', options: ['When the critical section is long or threads outnumber cores', 'When the critical section is two instructions', 'When there are many cores', 'When using atomics'], answer: 0, explain: 'Spinning wastes CPU while the lock is held a long time, and the holder may not even be running.' },
    hs('Hint 1: Compare the expected waiting time with the cost of a sleep plus wake-up (two context switches).', 'Hint 2: Is the lock holder guaranteed to be running on another core? If threads outnumber cores, it might not be.', 'Hint 3: Adaptive mutexes spin for roughly one context-switch time, then sleep. Mention the futex fast path.'),
    `<p>Rule: spin only if the expected wait is shorter than the cost of sleeping and waking, and the holder is running. <b>Case 1</b> (100 ns, 4 threads on 8 cores): each waiter waits at most about 300 ns, which is much less than the 5 µs for sleeping, and the holder runs on another core, so a spinlock wins. <b>Case 2</b> (2 ms disk read inside): spinners would burn 2 ms of CPU each, millions of wasted cycles, so a sleeping mutex is clearly better; better still, do not do I/O while holding any lock. <b>Case 3</b> (64 runnable threads on 8 cores): the holder may be preempted while up to 7 spinners burn their full time slices (milliseconds); use a sleeping or adaptive mutex. Real implementations (pthread adaptive mutex, Linux futex) spin a few iterations and then sleep. Spinlocks are also what the kernel uses in interrupt context, where sleeping is forbidden.</p>`,
    `<p>Spin cost = waiting time; sleep cost = about 2 context switches regardless of waiting time.</p>`,
    ['What is priority inversion and how does it interact with spinlocks?', 'Why does a naive TAS spinlock hurt cache performance?']));

  practice.push(prob('Trace a Counting Semaphore Schedule', 'Medium', ['semaphore', 'trace'],
    `<p>A semaphore starts at 2. Events in order: A:wait, B:wait, C:wait, D:wait, A:signal, B:signal, C:signal, D:signal. Give the semaphore value and the blocked queue after each event (non-negative implementation, FIFO wake-up). Who is running at the end?</p>`,
    `<p>Values: 1, 0, then C and D block (queue C,D). A:signal wakes C, B:signal wakes D, C:signal value 1, D:signal value 2. Final value ${H.c('g', '2')}, queue empty.</p>`,
    `<p>Guess that the value goes negative when threads block. That is the textbook variant; here the value stays at 0 and the queue length shows the number of waiters, which is the same information.</p>`,
    { q: 'With initial value 2 and four consecutive waits and no signals, how many threads are blocked?', options: ['2', '4', '0', '1'], answer: 0, explain: 'Two waits succeed (value 2 to 0), and the remaining two block.' },
    hs('Hint 1: A wait succeeds only when value &gt; 0 and decrements it; otherwise the thread joins the queue.', 'Hint 2: A signal with a non-empty queue gives the token to the front thread (value unchanged); otherwise it increments.', 'Hint 3: Track two columns after each event: value and the queue contents. Use the visualizer with input "2 A:P B:P C:P D:P A:V B:V C:V D:V".'),
    `<p>Table (value, blocked queue): start (2, []). A:wait (1, []). B:wait (0, []). C:wait blocks (0, [C]). D:wait blocks (0, [C, D]). A:signal: queue not empty, so C is woken and takes the permit directly (0, [D]). B:signal wakes D (0, []). C:signal: queue empty, value becomes 1. D:signal: value becomes 2. At the end the value is back to the initial 2, which confirms the invariant: tokens held by threads + value = 2. Threads C and D are running after being woken (they hold the tokens until they signal). In the textbook version with negative values the sequence of values would be 1, 0, -1, -2, -1, 0, 1, 2 and |value| = number of blocked threads while negative. Both models behave identically from the outside.</p>`,
    `<p>O(1) work per event, O(events) overall.</p>`,
    ['What changes if wake-up order is not FIFO?', 'What if signals come before any wait?']));

  practice.push(prob('Rendezvous: Two Threads Wait for Each Other', 'Medium', ['semaphore', 'barrier'],
    `<p>Thread A executes <code>a1; a2;</code> and thread B executes <code>b1; b2;</code>. Use semaphores so that <code>a1</code> happens before <code>b2</code> and <code>b1</code> happens before <code>a2</code>, for any scheduling. Then explain what deadlocks if you wait before you signal in both threads.</p>`,
    `<p>aArrived = 0, bArrived = 0. A: a1; signal(aArrived); wait(bArrived); a2. B: b1; signal(bArrived); wait(aArrived); b2. If both wait first: ${H.c('r', 'deadlock')}.</p>`,
    `<p>Use sleep(100) after a1/b1 to give the other thread time. That is a guess; under load the other thread may still be late.</p>`,
    { q: 'Why must each thread signal BEFORE it waits in a rendezvous?', options: ['Otherwise both wait for a signal that is never sent', 'Signals are faster', 'Wait must come last for memory ordering only', 'It does not matter'], answer: 0, explain: 'If both wait first, each waits for the other to signal: circular wait. Signal first, then wait.' },
    hs('Hint 1: Each thread must announce "I reached the meeting point" and then wait for the other to announce the same.', 'Hint 2: Two semaphores initialised to 0, one per direction: aArrived and bArrived.', 'Hint 3: The order signal-then-wait is crucial: if both wait first, no one ever signals.'),
    `<p>Create two semaphores both initialised to 0. Thread A: <code>a1; signal(aArrived); wait(bArrived); a2;</code>. Thread B: <code>b1; signal(bArrived); wait(aArrived); b2;</code>. Because A signals only after a1, B's b2 (which waits on aArrived) cannot start before a1 finished; symmetrically a2 cannot start before b1 finished. A signal that arrives before the matching wait is remembered, so it does not matter who arrives first. If both threads wait before signalling, A waits for bArrived which B would only signal after wait(aArrived) returns, which needs A to have signalled: circular wait, deadlock. This rendezvous generalises to a reusable N-thread barrier using a counter, a mutex and a turnstile semaphore (the double-turnstile pattern), or <code>std::barrier</code> in C++20.</p>`,
    `<p>O(1) per thread; no busy waiting.</p>`,
    ['Generalise to N threads (reusable barrier).', 'What is std::barrier\'s completion function?']));

  practice.push(prob('Print FooBar Alternately (LeetCode 1115 style)', 'Medium', ['semaphore', 'ordering', 'LeetCode'],
    `<p>Two threads share an object. Thread 1 calls <code>foo()</code> which prints "foo"; thread 2 calls <code>bar()</code> which prints "bar". Each is called n times. Make the output exactly "foobar" repeated n times regardless of scheduling.</p>`,
    `<p>n = 2: output ${H.c('g', 'foobarfoobar')}. Use two semaphores: <code>fooTurn = 1</code>, <code>barTurn = 0</code>. foo: wait(fooTurn); print; signal(barTurn). bar: wait(barTurn); print; signal(fooTurn).</p>`,
    `<p>Use a shared <code>bool turn</code> and spin with <code>while (turn != me) yield();</code>. Correct but burns CPU, and the flag needs an atomic to be correct.</p>`,
    { q: 'What are the initial values of the two semaphores in the foobar solution?', options: ['fooTurn = 1, barTurn = 0', 'both 1', 'both 0', 'fooTurn = 0, barTurn = 1'], answer: 0, explain: 'foo goes first, so its semaphore starts open; bar must wait until foo signals it.' },
    hs('Hint 1: The threads must strictly alternate, so each needs to wait for its own "turn" event.', 'Hint 2: Two semaphores form a baton: finishing foo hands the baton to bar and vice versa.', 'Hint 3: Initial values decide who starts: foo semaphore 1, bar semaphore 0. Each loop iteration: wait(mine), print, signal(other).'),
    `<p>Use two semaphores, <code>fooTurn</code> initialised to 1 and <code>barTurn</code> initialised to 0. In <code>foo()</code>, loop n times: <code>fooTurn.acquire(); print("foo"); barTurn.release();</code>. In <code>bar()</code>, loop n times: <code>barTurn.acquire(); print("bar"); fooTurn.release();</code>. The semaphores act as a baton passed back and forth, so the output strictly alternates whatever the OS scheduler does. At every moment exactly one of the two semaphores holds a token (invariant), so neither thread can run ahead. No spinning: the thread that has no turn sleeps. The same idea scales to "print in order 1-2-3" (a chain of semaphores) and to ZeroEvenOdd (LeetCode 1116) with three semaphores. A condition-variable version keeps a shared <code>turn</code> variable and uses <code>while (turn != me) cv.wait(lk)</code>.</p>`,
    `<p>O(n) operations; each hand-off costs one wake-up.</p>`,
    ['Solve with one mutex and one condition variable.', 'Extend to three threads printing in order 1,2,3 repeatedly.'],
    { code: { lang: 'cpp', code: `#include <semaphore>
#include <thread>
#include <iostream>

class FooBar {
    int n_;
    std::binary_semaphore foo_turn_{1}, bar_turn_{0};
public:
    explicit FooBar(int n) : n_(n) {}
    void foo() {
        for (int i = 0; i < n_; ++i) {
            foo_turn_.acquire();          // wait for my turn
            std::cout << "foo";
            bar_turn_.release();          // hand the baton to bar
        }
    }
    void bar() {
        for (int i = 0; i < n_; ++i) {
            bar_turn_.acquire();
            std::cout << "bar";
            foo_turn_.release();
        }
    }
};

int main() {
    FooBar fb(3);
    std::thread b([&] { fb.bar(); }), f([&] { fb.foo(); });
    f.join();
    b.join();
    std::cout << "\\n";   // foobarfoobarfoobar
}` } }));

  practice.push(prob('Review a Broken Blocking Queue (if-wait, lost notify)', 'Medium', ['condition variable', 'code review'],
    `<p>Find all bugs: <code>void put(int x){ lock(m); if (q.size()==CAP) cv.wait(m); q.push(x); unlock(m); } int take(){ lock(m); if (q.empty()) cv.wait(m); int x=q.front(); q.pop(); unlock(m); cv.notify_all(); return x; }</code> (one shared cv). List each bug, the schedule that exposes it, and the fixed code idea.</p>`,
    `<p>Bugs: (1) ${H.c('r', 'if instead of while')} (2) put never notifies the consumer, so a sleeping consumer sleeps forever (3) notify after unlock is fine but only one side notifies (4) manual lock/unlock leaks on exceptions.</p>`,
    `<p>Replace the wait with a sleep(10ms) polling loop. It hides the missing notify but adds latency and burns wake-ups.</p>`,
    { q: 'What is the minimal fix for an if-then-wait consumer?', options: ['Change if to while (or use the predicate overload)', 'Add a sleep before wait', 'Use notify_one instead of notify_all', 'Make the queue volatile'], answer: 0, explain: 'The condition must be re-checked after wake-up because of stolen and spurious wake-ups.' },
    hs('Hint 1: For each wait, ask what happens if it wakes up and the condition is false again.', 'Hint 2: For each state change (push, pop), ask who might be sleeping because of the old state, and whether they get notified.', 'Hint 3: Use while or the predicate overload, notify after both push and pop (the OTHER kind of waiter), RAII locks, ideally two condition variables.'),
    `<p>Bug 1: both waits use <code>if</code>, so after a stolen or spurious wake-up the code pushes into a full queue or pops from an empty one. Fix: <code>while</code> or the predicate overload. Bug 2: <code>put</code> never signals, so a consumer sleeping on an empty queue is never woken (the only wake-ups come from take's notify_all, which wakes producers, not consumers) and the system can hang with items in the queue. Fix: call <code>notify</code> after the push. Bug 3: with a single cv shared by both conditions, <code>notify_one</code> may wake the wrong kind of thread (a consumer waking another consumer), which then sleeps again while the right thread keeps sleeping: use two cvs (not_full, not_empty) or notify_all. Bug 4: manual lock/unlock leaks the mutex if push throws; use <code>unique_lock</code>. Schedule for bug 1: C1 waits on an empty queue; P pushes and notifies; C2 takes the item; C1 resumes and pops from an empty queue. The corrected code is the BoundedBuffer from the producer-consumer topic.</p>`,
    `<p>Fixes keep O(1) per operation.</p>`,
    ['Why can notify_all hurt performance?', 'How would you add close() for graceful shutdown?']));

  practice.push(prob('Readers-Writers: Trace Both Policies', 'Medium', ['readers-writers', 'trace'],
    `<p>Events: R1 arrives, R2 arrives, W1 arrives, R3 arrives, R1 leaves, R2 leaves, R3 leaves. For reader preference and writer preference, give the order in which threads enter the room and who waited.</p>`,
    `<p>Reader preference: R1, R2, R3 enter immediately; W1 enters after R3 leaves (waited 4 events). Writer preference: R1, R2 enter; W1 waits; R3 waits behind W1; W1 enters after R2 leaves, then R3.</p>`,
    `<p>Assume threads are served in arrival order for both policies. That is the fair policy and it differs from both of the textbook variants.</p>`,
    { q: 'Under writer preference, when R3 arrives while W1 is waiting, R3...', options: ['Waits behind W1', 'Enters immediately', 'Kills W1', 'Enters only after W1 and all later writers'], answer: 0, explain: 'A waiting writer blocks new readers so that it is not starved; R3 enters after W1.' },
    hs('Hint 1: Active readers do not block other readers; a waiting writer only matters if the policy says it does.', 'Hint 2: Reader preference admits a reader whenever no writer is active. Writer preference refuses new readers while a writer waits.', 'Hint 3: Run the visualizer with the first word reader and then writer on the same event list and compare the occupancy.'),
    `<p><b>Reader preference.</b> R1 enters (room empty). R2 enters (readers can share). W1 arrives and waits (readers inside). R3 arrives: no writer is active, so it enters immediately, ahead of W1. R1, R2 leave; R3 is still reading so W1 still waits. R3 leaves: the room is empty and W1 enters last. W1 waited through three reader events. If readers kept arriving, W1 would starve. <b>Writer preference.</b> R1, R2 enter. W1 arrives and waits. R3 arrives but a writer is waiting, so R3 queues behind W1. R1 and R2 leave; W1 enters the empty room and writes alone; when W1 leaves, R3 enters. W1 waited only for the readers already inside; R3 waited for W1. A strictly FIFO policy would give the same order as writer preference here. The trade-off: reader preference maximises read parallelism but can starve writers; writer preference bounds writer wait but can delay readers.</p>`,
    `<p>O(events) simulation.</p>`,
    ['Which policy is std::shared_mutex? (Unspecified.)', 'How would a fair policy treat a new reader behind a waiting writer behind readers?']));

  practice.push(prob('Thread-Safe Bounded Blocking Queue with Close()', 'Medium', ['bounded buffer', 'design'],
    `<p>Design a bounded blocking queue with <code>push</code>, <code>pop</code> and <code>close</code> for N producers and M consumers. After close(), producers get an error and consumers drain the remaining items, then get "closed". Give the state, the predicates and the notifications.</p>`,
    `<p>State: queue, cap, closed flag, one mutex, two cvs. pop waits while (empty and not closed); returns closed only if empty and closed. close() sets the flag under the lock and ${H.c('g', 'notify_all')} on both cvs.</p>`,
    `<p>Use a poison pill value per consumer. It works when M is known and fixed, but is awkward when consumers come and go, and a producer that races with close can still insert items after the pills.</p>`,
    { q: 'Why must close() use notify_all rather than notify_one?', options: ['All sleeping threads must wake up, see closed, and exit', 'notify_one is slower', 'It is required by C++', 'To clear the queue'], answer: 0, explain: 'Every sleeper needs to re-check the predicate and find closed == true; notify_one would leave the rest asleep forever.' },
    hs('Hint 1: Extend the bounded buffer with a closed flag, protected by the same mutex as the queue.', 'Hint 2: Predicates: push waits while (full and not closed); pop waits while (empty and not closed).', 'Hint 3: close() sets closed under the lock then notify_all on both cvs. pop returns (item) if non-empty, (closed) only when empty and closed.'),
    `<p>State: <code>std::queue&lt;T&gt; q; size_t cap; bool closed = false; mutex m; condition_variable not_full, not_empty;</code>. <b>push(x):</b> lock; <code>not_full.wait(lk, [&amp;]{ return closed || q.size() &lt; cap; })</code>; if closed return false; push; <code>not_empty.notify_one()</code>; return true. <b>pop():</b> lock; <code>not_empty.wait(lk, [&amp;]{ return closed || !q.empty(); })</code>; if the queue is empty (so closed) return nullopt; otherwise pop, <code>not_full.notify_one()</code>, return the item. <b>close():</b> lock; <code>closed = true</code>; then <code>not_full.notify_all(); not_empty.notify_all();</code>. Every state change (push, pop, close) is made under the mutex and followed by the right notification, every wait is a predicate loop, and the closed flag is part of both predicates, so no sleeper is left behind and consumers always drain remaining items before seeing "closed". Mention the alternative (poison pills) and why it is weaker, and the exception-safety of the RAII locks.</p>`,
    `<p>O(1) per operation; memory O(cap).</p>`,
    ['How would you support timeouts?', 'What if a consumer should be cancelled individually?']));

  practice.push(prob('Peterson: Progress, Bounded Waiting and Real Hardware', 'Hard', ['peterson', 'proof', 'memory model'],
    `<p>(a) Prove that Peterson's algorithm satisfies progress and bounded waiting (bound 1). (b) Explain why the textbook implementation with plain <code>bool flag[2]; int turn;</code> can fail on x86 and which instruction fixes it. (c) How many reachable states does the two-thread model have, and why does that make model checking feasible?</p>`,
    `<p>(a) If T1 is not interested, flag[1] is false so T0 passes. If both want in, the one who wrote turn last waits; after the other leaves it enters: at most ${H.c('g', 'one')} entry by the other. (b) Store-load reordering through the store buffer; fix with ${H.c('g', 'mfence / seq_cst')}.</p>`,
    `<p>Assume sequential consistency and say "it works". Real CPUs and compilers reorder; the proof above is only valid for a sequentially consistent memory.</p>`,
    { q: 'Which reordering breaks plain Peterson on x86?', options: ['A later load passing an earlier store (store-load)', 'Load-load', 'Store-store', 'Load-store'], answer: 0, explain: 'x86-TSO allows a load to complete before an earlier store to a different address becomes visible. Each thread can read the other flag as false while its own flag is still in the store buffer.' },
    hs('Hint 1: Progress: look at what happens when only one thread is interested; then when both are.', 'Hint 2: Bounded waiting: after the first thread leaves and tries to re-enter, what does its "turn = j" do?', 'Hint 3: In the hardware part, think about which pair of operations is flag[i] = true followed by reading flag[j], and which memory barrier orders them.'),
    `<p><b>Progress.</b> If T_j is not interested (flag[j] false, or not yet raised), T_i's test fails immediately and it enters: an uninterested thread never blocks. If both are interested, <code>turn</code> has some value; the thread whose index equals turn's target is the one that wrote it first and may pass: exactly one of them can proceed, so the decision is not postponed. <b>Bounded waiting.</b> Suppose T0 is waiting in the loop (flag[1] true, turn == 1). T1 enters, finishes, sets flag[1] = false: T0's test is now false and it enters. If T1 returns quickly it sets flag[1] = true and turn = 0, which writes turn so that T0 (not T1) wins the test; either T0 has already passed, or turn == 0 lets T0 pass. So T1 can overtake T0 at most once. <b>Hardware.</b> The sequence "store flag[i], load flag[j]" can be reordered by the store buffer on x86 (and by ARM/POWER more broadly), so both threads read false and enter. A full fence (mfence, or a seq_cst store/xchg) between them restores order; in C++ use <code>std::atomic</code> with the default memory order. <b>State space.</b> Each thread has 6 program counter values, three shared variables with few values: our Python explorer finds 34 reachable states (for a fixed initial turn), small enough to check every one for the violation of mutual exclusion and for stuck states.</p>`,
    `<p>Proof is constant size; model checking is exponential in threads times steps in general.</p>`,
    ['Show the filter lock for N threads.', 'Why is the Bakery algorithm fair?']));

  practice.push(prob('H2O: Build Water from Hydrogen and Oxygen Threads', 'Hard', ['semaphore', 'barrier', 'LeetCode'],
    `<p>Hydrogen threads call <code>hydrogen()</code> and oxygen threads call <code>oxygen()</code> in arbitrary order. A molecule is formed by exactly 2 hydrogen and 1 oxygen, and threads must leave in groups of three: no thread of the next molecule may pass before the current molecule's three threads have all arrived. Design the synchronisation (LeetCode 1117 style).</p>`,
    `<p>Use semaphores <code>hSem = 2</code>, <code>oSem = 1</code> as capacity gates and a 3-thread barrier. Each thread acquires its gate, waits at the barrier for the three of the molecule, bonds, and the last thread to pass releases the gates for the next molecule.</p>`,
    `<p>Use one mutex and busy-wait until the counters hit (2,1). It works, but burns CPU and still needs care to stop a third hydrogen from sneaking into the next molecule.</p>`,
    { q: 'Why do we need capacity gates (hSem = 2, oSem = 1) in addition to a barrier?', options: ['Without them a third hydrogen could join the barrier of the same molecule', 'Barriers cannot count', 'To make threads faster', 'To avoid mutexes'], answer: 0, explain: 'The barrier only waits for 3 threads; the gates ensure those 3 are exactly H, H, O.' },
    hs('Hint 1: A molecule is a group of exactly three threads: two H and one O. Limit how many of each type may be in the current group.', 'Hint 2: Gates: hydrogenGate with 2 permits, oxygenGate with 1 permit. A thread must take a permit before joining the group.', 'Hint 3: Then make the three wait for each other with a barrier, and only after all three have passed refill the gates, so the next group starts cleanly.'),
    `<p>Use a counter-based barrier for the 3 members and two gate semaphores that cap the molecule composition. <b>State:</b> <code>hGate = semaphore(2)</code>, <code>oGate = semaphore(1)</code>, a mutex-protected <code>count</code> and a <code>barrier</code> semaphore(0). <b>hydrogen():</b> <code>hGate.acquire(); arrive(); releaseH(); </code> where arrive() does: lock; count++; if count == 3 then release the barrier three times; unlock; barrier.acquire(). After the barrier each thread runs its bond action (releaseHydrogen/releaseOxygen). The <em>last</em> thread through (tracked by a second counter protected by the mutex) resets count to 0 and releases <code>hGate</code> twice and <code>oGate</code> once. <b>Why it works:</b> gates ensure that at most 2 H and 1 O ever join the barrier of a given molecule, the barrier ensures all three arrive before any leaves, and the refill after the last leaves ensures the next molecule starts clean, so threads from two molecules never interleave. A simpler Java solution uses <code>CyclicBarrier(3)</code> with the two semaphores, and C++20 can use <code>std::barrier&lt;&gt;(3)</code>. Think about deadlock: all gates are released only by the last thread of a molecule and every molecule completes once its 3 threads exist, so progress is guaranteed as long as inputs satisfy the 2:1 ratio.</p>`,
    `<p>O(1) work per thread; waiting threads sleep.</p>`,
    ['Why is the reusable barrier tricky?', 'How would you adapt it to the Sleeping Barber problem?']));

  practice.push(prob('Sleeping Barber: Customers, Chairs and One Barber', 'Hard', ['semaphore', 'classic problem'],
    `<p>A barbershop has one barber chair and N waiting chairs. If no customer is present the barber sleeps. A customer who finds all waiting chairs taken leaves; otherwise he sits and wakes the barber if needed. Give a semaphore solution with no deadlock and no lost wake-ups.</p>`,
    `<p>Semaphores: <code>customers = 0</code>, <code>barber = 0</code>, <code>mutex = 1</code>, counter <code>waiting</code>. Customer: lock; if waiting &lt; N then waiting++, signal(customers), unlock, wait(barber), get haircut; else unlock and ${H.c('r', 'leave')}.</p>`,
    `<p>A single mutex and a boolean barberAsleep that the customer checks and sets. A customer can see "awake" just as the barber decides to sleep: a lost wake-up, and the customer waits forever.</p>`,
    { q: 'Why is customers a semaphore and not a boolean flag?', options: ['Wake-ups must be remembered even when the barber is busy', 'Booleans are slower', 'Semaphores are required for N chairs only', 'It makes the barber sleep'], answer: 0, explain: 'A signal when the barber is not waiting would be lost with a flag. A semaphore stores it, so the barber finds the customer when he returns.' },
    hs('Hint 1: Two kinds of events: "a customer is here" (the barber waits for this) and "the barber is ready" (the customer waits for this).', 'Hint 2: One semaphore per event, both starting at 0, plus a mutex for the shared count of occupied chairs.', 'Hint 3: Check and increment the count under the mutex; release the mutex before waiting on barber to avoid sleeping while holding it.'),
    `<p>Shared: <code>int waiting = 0</code>, semaphores <code>customers = 0</code> (customers ready for a haircut), <code>barber = 0</code> (barber ready), <code>mutex = 1</code>. <b>Barber loop:</b> <code>wait(customers)</code> (sleeps if nobody), then <code>wait(mutex); waiting--; signal(barber); signal(mutex);</code> then cut hair. <b>Customer:</b> <code>wait(mutex); if (waiting &lt; N) { waiting++; signal(customers); signal(mutex); wait(barber); get_haircut(); } else { signal(mutex); leave(); }</code>. Reasoning: <code>waiting</code> is changed only under the mutex, so the chair count is exact. The semaphores remember events: if the customer signals before the barber waits, the token is kept; if the barber is already asleep the signal wakes him, so no wake-up is lost. The customer releases the mutex before waiting on <code>barber</code>, otherwise the barber could never take the mutex to decrement <code>waiting</code>: a deadlock like the swapped waits in the bounded buffer. The rendezvous pair (customers, barber) guarantees one customer is paired with the barber at a time. Fairness: a FIFO semaphore gives first come first served among waiting customers.</p>`,
    `<p>O(1) per customer; memory O(N) for waiting chairs.</p>`,
    ['Add multiple barbers.', 'How does this map to a thread pool with a bounded queue?']));

  practice.push(prob('Bank Transfers: Deadlock-Free Locking and Detection', 'Hard', ['deadlock', 'lock ordering', 'design'],
    `<p>A service has millions of accounts, each with its own mutex. <code>transfer(a, b, amount)</code> must lock both accounts. Under load the service hangs. Explain why, and give three different fixes with their costs. Then explain how you would detect such a deadlock in production.</p>`,
    `<p>transfer(X,Y) and transfer(Y,X) run together: each locks its first account and waits for the other: ${H.c('r', 'circular wait')}. Fixes: order by account id; scoped_lock/all-at-once; try_lock with back-off; or a single-writer shard.</p>`,
    `<p>Use one global lock for all transfers. Correct and simple but serialises the entire bank; throughput collapses to one transfer at a time.</p>`,
    { q: 'What is the simplest deadlock-prevention rule when locks are per account?', options: ['Always lock the account with the smaller id first', 'Lock the source account first', 'Lock with a timeout of 1 s only', 'Use more threads'], answer: 0, explain: 'A fixed global order makes a cycle impossible, whichever direction the money flows.' },
    hs('Hint 1: Write the two interleaved calls transfer(X,Y) and transfer(Y,X) and track which lock each holds.', 'Hint 2: Apply a Coffman condition: break circular wait (ordering), hold-and-wait (take both at once), or no preemption (try_lock and release).', 'Hint 3: For detection: the wait-for graph, lock-owner tracking, thread dumps, lockdep-style order checking, and database deadlock detectors with retry.'),
    `<p><b>Why it hangs.</b> Threads 1 and 2 run transfer(X, Y) and transfer(Y, X). T1 locks X and waits for Y; T2 locks Y and waits for X: a circular wait, with mutual exclusion, hold-and-wait and no preemption all true. <b>Fix 1, global ordering:</b> lock the account with the smaller id first, then the larger one, regardless of direction (no cycle possible, near-zero overhead; also handle from == to to avoid locking the same mutex twice). <b>Fix 2, all-at-once:</b> <code>std::scoped_lock(a.m, b.m)</code> uses try-and-back-off internally, breaking hold-and-wait; simple but can retry under contention. <b>Fix 3, try_lock with back-off:</b> try both locks, if the second fails release the first, sleep a random time, retry; no deadlock but a risk of livelock and wasted work. <b>Fix 4 (architecture):</b> route all transfers of an account shard through one thread or queue (actor model), or use optimistic concurrency with compare-and-swap on versions. <b>Detection in production:</b> thread dumps (jstack, gdb thread apply all bt) show who holds and who waits; build the wait-for graph and look for a cycle; Linux lockdep and ThreadSanitizer report lock-order inversions before they hang; databases run a deadlock detector, pick a victim, abort and retry. Add lock timeouts plus logging so a hang becomes an alert instead of an outage.</p>`,
    `<p>Ordering adds O(1) compare; detection by DFS on the wait-for graph is O(threads + locks).</p>`,
    ['What changes when accounts live on different servers (distributed locks)?', 'How do two-phase locking databases avoid this?'],
    { code: { lang: 'cpp', code: `#include <mutex>
struct Account { long id; long balance = 0; std::mutex m; };

// Fix 1: strict global order by id; the direction of the transfer is irrelevant.
void transfer_ordered(Account& from, Account& to, long amount) {
    if (&from == &to) return;                       // avoid locking the same mutex twice
    Account& first  = from.id < to.id ? from : to;
    Account& second = from.id < to.id ? to : from;
    std::lock_guard<std::mutex> l1(first.m);
    std::lock_guard<std::mutex> l2(second.m);
    from.balance -= amount;
    to.balance += amount;
}` } }));

  /* =================== QUIZ =================== */
  quiz.push({ q: 'Two threads run <code>counter++</code> 1000 times each on a plain shared int. Which final value is possible?', options: ['Any value from 1000 to 2000', 'Exactly 2000 always', 'Only 1000 or 2000', 'Exactly 1000'], answer: 0, explain: 'Lost updates can happen any number of times, so the result lies between 1000 (worst realistic case) and 2000. In theory even lower values are possible.' });
  quiz.push({ q: 'Which is NOT one of the three requirements of a critical-section solution?', options: ['Fairness in CPU scheduling', 'Mutual exclusion', 'Progress', 'Bounded waiting'], answer: 0, explain: 'The three are mutual exclusion, progress and bounded waiting. CPU scheduling fairness is a different topic.' });
  quiz.push({ q: 'In Peterson\'s algorithm, thread i executes flag[i] = true; turn = j; then waits. Why is turn set to j (the other thread) rather than i?', options: ['It politely gives the other thread priority, so the last writer waits', 'To signal that it is thread i\'s turn to enter', 'To make flag unnecessary', 'It is arbitrary'], answer: 0, explain: 'Setting turn = j says "you go first". If both do that, the later write wins the argument against the writer, so the last writer waits and the other enters.' });
  quiz.push({ q: 'Peterson\'s algorithm with plain (non-atomic) variables can fail on modern CPUs because of:', options: ['Memory reordering such as store-load reordering', 'Integer overflow', 'Too many threads', 'Cache size'], answer: 0, explain: 'A thread\'s store to flag may still be in the store buffer when it reads the other flag. Use seq_cst atomics or fences.' });
  quiz.push({ q: 'A semaphore initialised to 0 is typically used for:', options: ['Signalling that an event happened (ordering)', 'Protecting a critical section', 'Limiting to N resources', 'Counting free slots in a full buffer'], answer: 0, explain: 'With 0 the first wait blocks until some thread signals. It is the standard "wait for event" building block.' });
  quiz.push({ q: 'Bounded buffer with semaphores: which wait order in the PRODUCER avoids deadlock?', options: ['wait(empty) then wait(mutex)', 'wait(mutex) then wait(empty)', 'Either, it does not matter', 'wait(full) then wait(mutex)'], answer: 0, explain: 'Wait for space first, then lock. Otherwise the producer sleeps on empty holding the mutex, so no consumer can ever free a slot.' });
  quiz.push({ q: 'Why should cv.wait() be placed in a while loop?', options: ['Wake-ups can be spurious or stolen, so the condition must be re-checked', 'To make the thread run faster', 'Because notify wakes all threads', 'To release the mutex twice'], answer: 0, explain: 'In Mesa-style monitors a woken thread must re-acquire the lock and the condition may no longer hold; spurious wake-ups are also allowed.' });
  quiz.push({ q: 'Notify is called on a condition variable while no thread is waiting. What happens?', options: ['The notification is lost', 'It is stored and delivered to the next waiter', 'The program crashes', 'The mutex is released'], answer: 0, explain: 'Condition variables have no memory. The state must be kept in a variable that the waiter checks before sleeping.' });
  quiz.push({ q: 'Reader-preference readers-writers can lead to:', options: ['Writer starvation', 'Reader starvation', 'Both reading and writing at once', 'Spurious wake-ups'], answer: 0, explain: 'A continuous stream of readers keeps the room occupied so the writer never gets exclusive access.' });
  quiz.push({ q: 'Which fix for dining philosophers breaks the circular-wait condition?', options: ['Always pick up the lower-numbered fork first', 'Add more food', 'Let every philosopher hold two forks forever', 'Use bigger forks'], answer: 0, explain: 'A global ordering of resources makes a cycle impossible: the philosopher with forks 4 and 0 takes fork 0 first.' });
  quiz.push({ q: 'A spinlock is most appropriate when:', options: ['The critical section is very short and the holder runs on another core', 'The lock is held during disk I/O', 'There are many more threads than cores', 'On a single-core user-space program'], answer: 0, explain: 'Spinning costs CPU time while waiting; it only pays off if the wait is shorter than a sleep and wake-up.' });
  quiz.push({ q: 'What is the difference between a mutex and a binary semaphore?', options: ['A mutex has an owner that must unlock it; a semaphore can be signalled by any thread', 'A mutex counts, a semaphore does not', 'They are identical', 'A semaphore cannot block'], answer: 0, explain: 'Ownership gives error checking and priority inheritance; semaphores are general signalling tools.' });
  quiz.push({ q: 'Hoare vs Mesa monitors: which one lets you use <code>if</code> instead of <code>while</code> safely?', options: ['Hoare (signal hands over the monitor immediately)', 'Mesa', 'Both', 'Neither'], answer: 0, explain: 'In Hoare semantics the condition is guaranteed true when the woken thread runs. Real languages use Mesa, so always loop.' });
  quiz.push({ q: 'Which scenario is a livelock?', options: ['Two threads repeatedly release and retry locks in lock step but make no progress', 'Two threads wait forever each holding the lock the other needs', 'One thread starves because others always go first', 'A thread sleeps forever on an empty queue'], answer: 0, explain: 'In livelock threads are active (not blocked) but keep undoing each other\'s progress; deadlock threads are blocked.' });

  /* =================== INTERVIEW =================== */
  interview.push({ q: 'What is a race condition? Show it with counter++.', level: 'B', a: `<p>A race condition is when the result depends on the timing of threads. <code>counter++</code> is three machine steps: LOAD into a register, ADD 1, STORE back. If thread 1 and thread 2 both LOAD 0 before either STOREs, both compute 1 and both store 1: two increments, counter = 1. The window is between LOAD and STORE.</p><p>Fix: make the whole read-modify-write indivisible with a mutex or an atomic (<code>fetch_add</code>). Mention that a data race is undefined behaviour in C++ and that tests rarely catch it; use ThreadSanitizer.</p>`, followUps: ['Why does volatile not fix it?', 'How many of the 20 interleavings of two counter++ give the right answer?'] });
  interview.push({ q: 'State the three requirements of a solution to the critical section problem and give a solution that violates one.', level: 'B', a: `<p><b>Mutual exclusion</b>: at most one thread in the critical section. <b>Progress</b>: if nobody is inside, the choice of who enters depends only on those who want to enter and cannot be postponed forever; an uninterested thread cannot block others. <b>Bounded waiting</b>: after a thread asks, only a bounded number of others can enter before it.</p><p>Strict alternation with a <code>turn</code> variable satisfies mutual exclusion but violates progress: a thread that is slow in its remainder section blocks the other thread. Flag-only protocols deadlock. A test-and-set spinlock violates bounded waiting because any waiter can win.</p>`, followUps: ['Which are safety and which are liveness properties?', 'Does a plain mutex guarantee bounded waiting?'] });
  interview.push({ q: 'Explain Peterson\'s algorithm and prove it gives mutual exclusion.', level: 'I', a: `<p>Two threads share <code>flag[2]</code> and <code>turn</code>. Thread i sets flag[i] = true, sets turn = j, then spins while (flag[j] &amp;&amp; turn == j), runs the critical section, and sets flag[i] = false.</p><p>Proof: if both were inside, both flags are true, so each passed only because turn pointed to itself (T0 saw turn == 0, T1 saw turn == 1). Take whichever tested first, say T0 saw 0. T1 writes turn = 0 before its test, and nobody writes turn = 1 afterwards (T0 already wrote its 1 earlier and is inside). So T1 would see turn == 0 and keep spinning: contradiction. Progress: an uninterested thread has flag false. Bounded waiting: the other can overtake at most once.</p>`, followUps: ['Why does it break on x86 with plain variables?', 'What if you swap the first two lines?'] });
  interview.push({ q: 'What does a mutex do under the hood when lock() finds it taken?', level: 'I', a: `<p>The fast path is a user-space atomic compare-and-swap on a word (0 free, 1 locked). On contention the thread calls into the kernel (Linux: <code>futex(FUTEX_WAIT)</code>), which puts it to sleep on a wait queue keyed by the address of the word. unlock() atomically sets the word to free and, if there are waiters, calls <code>futex(FUTEX_WAKE)</code> to wake one. Uncontended locks need no system call at all.</p><p>Good implementations spin briefly first because a context switch costs more than a short wait. Ownership allows error checking and priority inheritance. The lock acquire is an acquire barrier and the unlock is a release barrier.</p>`, followUps: ['What is priority inversion?', 'Why is the C++ std::mutex not guaranteed to be fair?'] });
  interview.push({ q: 'Spinlock vs mutex: when do you use each?', level: 'I', a: `<p>A spinlock burns CPU while waiting, so use it only when the critical section is tiny (a few instructions), the holder is running on another core, and sleeping is not allowed (interrupt handlers in the kernel). A sleeping mutex puts the waiter to sleep: cheap while waiting, but two context switches (a few microseconds) per contended acquisition.</p><p>Rule of thumb: spin if the expected wait is less than the context switch cost. Never spin on a single core or when threads outnumber cores, because the holder may be descheduled. Many libraries use an adaptive mutex that spins briefly and then sleeps. To reduce cache traffic, spin on a plain load (test-and-test-and-set) and use ticket or MCS locks for fairness.</p>`, followUps: ['What is a ticket lock?', 'What is lock convoying?'] });
  interview.push({ q: 'Explain semaphores. What is the difference between binary and counting, and between a binary semaphore and a mutex?', level: 'I', a: `<p>A semaphore is a non-negative integer with two atomic operations: wait/P (if value &gt; 0 decrement, else block) and signal/V (wake a waiter, or increment). <b>Binary</b>: value 0 or 1, used for exclusion or event signalling. <b>Counting</b>: value up to N, used for N identical resources (connection pool) or counting items (the "full" semaphore in a bounded buffer).</p><p>A mutex has an owner and only the owner can unlock, which enables error checking and priority inheritance. A semaphore has no owner, so any thread may signal; that makes it suitable for ordering (B waits until A signals) but riskier as a lock. Also: a semaphore remembers signals, a condition variable does not.</p>`, followUps: ['Implement a semaphore with a mutex and a condition variable.', 'What happens if you wait twice on a mutex-like semaphore?'] });
  interview.push({ q: 'Implement the bounded buffer (producer-consumer) with semaphores. What goes wrong if you swap the waits?', level: 'I', a: `<p>Semaphores: <code>empty = N</code>, <code>full = 0</code>, <code>mutex = 1</code>. Producer: wait(empty); wait(mutex); insert; signal(mutex); signal(full). Consumer: wait(full); wait(mutex); remove; signal(mutex); signal(empty).</p><p>If the producer does wait(mutex) first and then wait(empty), then when the buffer is full it sleeps on empty while holding the mutex. The consumer passes wait(full) but blocks on the mutex, so nobody can free a slot: deadlock (hold-and-wait plus circular wait). With one producer and one consumer the mutex is not needed, because they touch different indices (this is the basis for lock-free SPSC rings).</p>`, followUps: ['Do it with a mutex and two condition variables.', 'How do you shut it down cleanly?'] });
  interview.push({ q: 'Why do you wait on a condition variable in a while loop? What is a spurious wakeup?', level: 'I', a: `<p>Three reasons. (1) <b>Stolen wake-up</b>: in Mesa semantics, a woken thread has to re-acquire the lock; another thread may run first and consume the item, so the condition is false again. (2) <b>Spurious wake-up</b>: wait() may return even though nobody notified, allowed by POSIX and C++ and caused by implementation details such as signals interrupting the futex. (3) The cv may be shared between several conditions or woken by notify_all.</p><p>So the code is <code>while (!pred) cv.wait(lk);</code> or <code>cv.wait(lk, pred)</code>. Also: the predicate lives in shared state changed under the same mutex, because notifications are not remembered; a notify with no waiter is lost.</p>`, followUps: ['What is the difference between Hoare and Mesa monitors?', 'notify_one vs notify_all?'] });
  interview.push({ q: 'Describe the readers-writers problem and its starvation issues. How do you fix writer starvation?', level: 'I', a: `<p>Many readers may share the data, a writer needs exclusive access. <b>Reader preference</b>: new readers enter whenever no writer is active; a stream of readers can starve writers. <b>Writer preference</b>: once a writer is waiting, new readers block; a stream of writers can starve readers. <b>Fair</b>: FIFO ordering.</p><p>Fix for writer starvation: a turnstile (gate) semaphore. Each reader passes through the gate briefly; a writer holds the gate while it waits for current readers to drain and while it writes. In libraries use <code>std::shared_mutex</code> / <code>pthread_rwlock</code> / <code>ReentrantReadWriteLock</code> and check their fairness policy. For read-mostly data consider RCU or seqlocks where readers never block writers.</p>`, followUps: ['Why can lock upgrade deadlock?', 'Is a read-write lock always faster than a mutex?'] });
  interview.push({ q: 'Explain dining philosophers, why the naive solution deadlocks, and give two fixes.', level: 'I', a: `<p>Five philosophers, five forks, each needs two adjacent forks. Naive: everyone takes the left fork and then the right one. If all take their left fork simultaneously, each waits for the right one held by a neighbour: a cycle of waits. All four Coffman conditions hold (mutual exclusion, hold-and-wait, no preemption, circular wait).</p><p>Fix 1: <b>resource ordering</b>, always take the lower-numbered fork first (breaks circular wait; philosopher 4 takes fork 0 first). Fix 2: <b>asymmetric</b>: odd philosophers go right-then-left. Fix 3: a <b>waiter</b> semaphore allowing only 4 at the table. Fix 4: take both forks atomically with <code>std::scoped_lock</code> (breaks hold-and-wait). Timeouts alone cause livelock.</p>`, followUps: ['How does this relate to bank transfers?', 'Which fixes avoid starvation?'] });
  interview.push({ q: 'Atomic vs mutex: when is std::atomic enough?', level: 'A', a: `<p>Use an atomic when the shared state is a single variable and each operation is one indivisible read-modify-write (counter, flag, pointer swap, reference count). It is lock-free on mainstream hardware and cheaper than a mutex.</p><p>You need a mutex (or one atomic holding a packed value) when an <b>invariant spans several variables</b> (balance and ledger, size and buffer pointer), when you must do check-then-act on more than one thing, or when the critical section contains a long computation. Also mention memory ordering: default seq_cst is safest; acquire/release is enough for lock-like handoff; relaxed is only for plain counters whose value is not used to synchronise other data. And that ABA and the progress guarantees of lock-free algorithms are subtle.</p>`, followUps: ['What is the ABA problem?', 'What does memory_order_acquire/release guarantee?'] });
  interview.push({ q: 'Your service hangs under load. How do you find out whether it is a deadlock, livelock or starvation?', level: 'A', a: `<p>Take a thread dump (<code>jstack</code>, <code>gdb -p PID -batch -ex "thread apply all bt"</code>, <code>pstack</code>). <b>Deadlock</b>: threads are all blocked in lock/wait calls, CPU near 0; build the wait-for graph from "holds X, waits for Y" and look for a cycle (Java reports it directly). <b>Livelock</b>: CPU high, threads runnable, but no requests complete; usually retry/backoff loops. <b>Starvation</b>: the system makes progress but some threads (or requests) never run; look at queue wait times and lock acquisition latencies.</p><p>Prevention: a global lock order enforced by lockdep or Clang thread-safety annotations, scoped_lock for multi-lock, lock timeouts with logging, no I/O under locks, and chaos or stress tests with ThreadSanitizer.</p>`, followUps: ['How do databases detect deadlocks?', 'How do you reproduce a rare race in a test?'] });
  interview.push({ q: 'Design a thread-safe LRU cache or blocking queue. What is your locking strategy and where would you avoid a global lock?', level: 'A', a: `<p>Start simple: one mutex around the whole structure; correct and often fast enough. Measure before optimising. If contention shows up: (1) <b>shard</b> by key hash into K independent caches each with its own mutex (contention drops by about K); (2) use a <b>read-write lock</b> only if lookups dominate and do not mutate (an LRU lookup does mutate recency, so it is a write!); (3) approximate LRU with CLOCK, or record accesses in per-thread buffers and apply them in batches; (4) use immutable snapshots with atomic pointer swap for rarely changing data.</p><p>For the blocking queue: bounded buffer with mutex and two condition variables, a closed flag, and notify only on the transitions that matter (empty to non-empty). For high throughput use per-consumer queues or a lock-free MPMC ring.</p>`, followUps: ['What is false sharing?', 'How do you test it for races?'] });

  registerModule({
    id: 'cs04',
    title: 'Synchronization',
    intro: `<p>Threads share memory, and sharing is where programs quietly go wrong: a counter loses updates, two threads enter a room that should hold one, everybody waits for everybody. This module teaches the whole toolbox in the order interviews ask about it: the <b>critical section problem</b> and its three requirements, <b>race conditions</b> shown as real instruction interleavings, <b>Peterson's solution</b> (with a proof), <b>mutexes and spinlocks</b>, <b>semaphores</b>, <b>monitors and condition variables</b> (and why you wait in a <code>while</code>), then the three classic problems: <b>producer-consumer</b>, <b>readers-writers</b> and <b>dining philosophers</b>. Every topic has a step-by-step visualizer, compiling C++20 and deterministic Python simulators you can run in the browser.</p>`,
    goals: ['Draw an interleaving of counter++ that loses an update, and explain the three requirements of a critical-section solution', 'Prove Peterson\'s algorithm gives mutual exclusion, and explain why it needs atomics on real hardware', 'Choose correctly between atomic, mutex, spinlock, semaphore and condition variable for a given problem', 'Implement a bounded buffer with semaphores and with a mutex plus condition variables, and explain why the waits must be in a while loop', 'Solve readers-writers without writer starvation and fix dining philosophers by ordering or asymmetric picking, naming the Coffman condition each fix breaks'],
    prereqs: `CS Core module 2 (Processes &amp; Threads) and module 3 (CPU Scheduling): you should know what a thread, a context switch and preemption are. Basic C++ is helpful for the code.`,
    hours: 12,
    topics: topics, practice: practice, quiz: quiz, interview: interview
  });
})();
