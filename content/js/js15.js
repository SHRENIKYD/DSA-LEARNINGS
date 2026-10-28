(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw;

  /* =====================================================================
     SHARED VISUALIZER KIT (Node.js internals)
     ===================================================================== */
  function one(i, cls) { var o = {}; o[i] = cls; return o; }
  // Phase ring of the libuv loop; `cur` = id of the highlighted phase.
  function phaseGraph(cur) {
    var nodes = [
      { id: 'TM', label: 'timers', x: 12, y: 10, shape: 'box' },
      { id: 'PE', label: 'pending', x: 40, y: 10, shape: 'box' },
      { id: 'PO', label: 'poll (I/O)', x: 70, y: 10, shape: 'box' },
      { id: 'CH', label: 'check', x: 70, y: 48, shape: 'box' },
      { id: 'CL', label: 'close', x: 40, y: 48, shape: 'box' },
      { id: 'MT', label: 'nextTick + microtasks', x: 12, y: 48, shape: 'box', w: 22 }
    ];
    var hl = {}; if (cur) hl[cur] = 'cur';
    return { type: 'graph', label: 'libuv event loop (one lap = timers → pending → poll → check → close)', directed: true, height: 60, nodes: nodes,
      edges: [['TM', 'PE'], ['PE', 'PO'], ['PO', 'CH'], ['CH', 'CL'], ['CL', 'TM']], hl: hl };
  }
  // Parse "name: kind:child kind:child" lines into a callback table.
  function parseCbs(input) {
    var lines = String(input).split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    if (!lines.length || lines.length > 20) throw new Error('Write 1-20 lines like  main: timeout:T1 immediate:I1 tick:N1 promise:P1 io:R1');
    var cbs = {};
    lines.forEach(function (l) {
      var i = l.indexOf(':');
      if (i < 1) throw new Error('Each line needs a name and a colon, e.g.  R1: immediate:I2');
      cbs[l.slice(0, i).trim()] = l.slice(i + 1).trim().split(/\s+/).filter(Boolean).map(function (a) {
        var p = a.split(':');
        if (p.length !== 2 || ['timeout', 'immediate', 'tick', 'promise', 'io'].indexOf(p[0]) < 0) throw new Error('Unknown action "' + a + '". Use timeout:X immediate:X tick:X promise:X io:X');
        return { kind: p[0], name: p[1] };
      });
    });
    if (!cbs.main) throw new Error('The first callback must be called main');
    return cbs;
  }
  // Traced version of the phase simulator used in topic 1 (frames for the visualizer).
  function traceLoop(input) {
    var cbs = parseCbs(input), out = [], ticks = [], micro = [], timers = [], io = [], imm = [], frames = [];
    function snap(phase, running, narr) {
      frames.push({ narr: narr, parts: [
        phaseGraph(phase),
        { type: 'stack', label: 'Running now', items: running ? [running] : [], hl: running ? one(0, 'cur') : {} },
        { type: 'queue', label: 'nextTick queue', items: ticks.slice(), frontLabel: 'next', backLabel: '' },
        { type: 'queue', label: 'Promise microtask queue', items: micro.slice(), frontLabel: 'next', backLabel: '' },
        { type: 'queue', label: 'timers | poll (I/O) | check', items: timers.map(function (t) { return 'T:' + t; }).concat(io.map(function (t) { return 'IO:' + t; }), imm.map(function (t) { return 'C:' + t; })), frontLabel: '', backLabel: '' },
        { type: 'array', label: 'Output', values: out.slice(), start: 1, hl: out.length ? one(out.length - 1, 'ok') : {} }
      ] });
    }
    function run(name, phase, why) {
      if (name !== 'main') out.push(name);
      (cbs[name] || []).forEach(function (a) {
        ({ tick: ticks, promise: micro, timeout: timers, immediate: imm, io: io })[a.kind].push(a.name);
      });
      snap(phase, name, why + ' <b>' + name + '</b> runs and schedules: ' + ((cbs[name] || []).map(function (a) { return a.kind + ' ' + a.name; }).join(', ') || 'nothing') + '.');
    }
    function drain() {
      while (ticks.length || micro.length) {
        while (ticks.length) run(ticks.shift(), 'MT', 'Between callbacks Node empties the <b>nextTick</b> queue first:');
        while (micro.length) run(micro.shift(), 'MT', 'nextTick queue empty, so V8 drains the <b>promise microtasks</b>:');
      }
    }
    function phase(q, id, label) {
      var batch = q.splice(0, q.length);
      batch.forEach(function (n) { run(n, id, label + ' phase:'); drain(); });
    }
    run('main', null, 'The main module runs synchronously first.');
    drain();
    var guard = 0;
    while ((timers.length || io.length || imm.length) && guard++ < 50 && frames.length < 60) {
      phase(timers, 'TM', 'Timers'); phase(io, 'PO', 'Poll'); phase(imm, 'CH', 'Check');
    }
    snap(null, null, 'All queues are empty, so the loop has nothing keeping it alive and the process exits. Final order: <b>' + (out.join(' → ') || '(nothing)') + '</b>.');
    return frames;
  }
  // Generic "list of steps" visualizer: each step = [narr, parts].
  function stepsViz(steps) { return steps.map(function (s) { return { narr: s[0], parts: s[1] }; }); }

  /* ======================================================================
     TOPIC 1 — Node architecture & libuv event loop phases
     ====================================================================== */
  topics.push({
    title: 'Inside Node.js: V8 + libuv + Bindings, and the Six Phases of the Event Loop',
    analogy: `<p>Picture a busy <b>post office with one clerk at the counter</b>. The clerk (V8 running your JavaScript) is fast but can only serve one person at a time. Behind the counter is a <b>sorting office</b> (libuv) with machines that watch thousands of mailboxes at once (the operating system's epoll / kqueue / IOCP) and four helpers who do slow paperwork (the thread pool). The clerk works through fixed <b>rounds</b>: first the alarm clocks that have rung (timers), then letters that just arrived (poll), then "do this right after the post" notes (check: <code>setImmediate</code>), then goodbyes (close). Between every single customer the clerk glances at a sticky-note pad of urgent items (<code>process.nextTick</code> and promises).</p>`,
    explain: `<p>JS 3 told you Node is "V8 plus host APIs". Here we open the box. Node.js is three layers:</p>
<ol>
<li><b>V8</b> — parses and runs your JavaScript, owns the heap, the call stack and the <b>promise microtask queue</b>.</li>
<li><b>Node core</b> — the JS standard library (<code>lib/fs.js</code>, <code>lib/net.js</code>…) plus C++ <b>bindings</b> that translate JS calls into C calls.</li>
<li><b>libuv</b> — a C library that provides the <b>event loop</b>, non-blocking sockets via the OS (epoll on Linux, kqueue on macOS, IOCP on Windows), timers, signals, child processes and a <b>thread pool</b> for work the OS cannot do asynchronously (most file I/O, <code>dns.lookup</code>, some crypto, zlib).</li>
</ol>
<p>After your main module finishes, Node enters <code>uv_run()</code>. Each <b>lap</b> (iteration) visits phases in a fixed order:</p>
${H.table(['Phase', 'What runs there', 'Example'], [
  ['<b>timers</b>', 'callbacks of expired <code>setTimeout</code>/<code>setInterval</code>', 'a 100 ms timer whose time has come'],
  ['<b>pending callbacks</b>', 'some I/O callbacks deferred from the last lap', 'TCP <code>ECONNREFUSED</code> on some systems'],
  ['idle, prepare', 'internal libuv bookkeeping', '—'],
  ['<b>poll</b>', 'wait for new I/O events and run their callbacks; may <b>block here</b> when nothing else is due', 'fs.readFile done, socket data arrived'],
  ['<b>check</b>', '<code>setImmediate</code> callbacks', 'work queued from an I/O callback'],
  ['<b>close callbacks</b>', '<code>\'close\'</code> handlers of handles closed abruptly', '<code>socket.on(\'close\')</code> after <code>destroy()</code>']
])}
<p>Two rules make outputs predictable: (1) <b>after every callback</b> (not every phase) Node drains the <code>process.nextTick</code> queue, then the promise microtask queue, repeating until both are empty; (2) a phase runs the callbacks that were queued <b>when it started</b> — an immediate scheduled from inside the check phase waits for the next lap; a new timer scheduled inside a timer callback waits at least until the next lap.</p>
<p>The loop stays alive while there are <b>active, referenced handles or requests</b> (a listening server, a pending timer, an in-flight read). When nothing is left, <code>uv_run</code> returns and the process exits — that is why a script with only <code>console.log</code> ends instantly, and why <code>timer.unref()</code> lets the process exit even though the timer is pending.</p>`,
    clues: [
      '"What is libuv?" → C library: event loop + OS async I/O + thread pool; Node\'s loop IS uv_run()',
      '"Name the phases of the Node event loop" → timers → pending → idle/prepare → poll → check → close',
      '"setTimeout(0) vs setImmediate" → racy in the main module, immediate first inside an I/O callback',
      '"Why does my Node process not exit?" → a referenced handle (server, interval, socket) keeps the loop alive; use unref()/close()',
      '"How does Node handle 10k connections on one thread?" → sockets are watched by epoll/kqueue/IOCP in the poll phase, not by threads',
      '"Where does Node block when idle?" → in the poll phase, sleeping in epoll_wait until the next timer is due'
    ],
    code: [
      { lang: 'js', title: 'Which phase runs each callback? (syntax-checked, run it with node)', code: R`// node phases.js — CommonJS
const fs = require('node:fs');
const net = require('node:net');

setTimeout(() => console.log('timers phase: setTimeout'), 0);

fs.readFile(__filename, () => {                       // poll phase: I/O callback
  console.log('poll phase: readFile done');
  setImmediate(() => console.log('check phase: setImmediate (always before the next timer here)'));
  setTimeout(() => console.log('timers phase, next lap'), 0);
});

const server = net.createServer().listen(0, () => {
  const sock = net.connect(server.address().port, () => sock.destroy());
  sock.on('close', () => {                            // close callbacks phase
    console.log('close phase: socket closed');
    server.close();                                   // last handle gone -> loop can exit
  });
});

const keepAlive = setInterval(() => {}, 1000);
keepAlive.unref();                                    // does NOT keep the process alive
process.on('exit', (code) => console.log('loop empty, exiting with', code));` },
      { lang: 'js', run: true, title: 'A phase-by-phase loop model in plain JS (runnable)', code: R`// Toy model: one array per phase, nextTick + promise queues drained after EVERY callback.
const q = { timers: [], poll: [], check: [] }, ticks = [], micro = [], out = [];
function drain() {
  while (ticks.length || micro.length) {
    while (ticks.length) ticks.shift()();
    while (micro.length) micro.shift()();
  }
}
function runPhase(name) {
  const batch = q[name].splice(0);              // only callbacks queued BEFORE the phase started
  for (const cb of batch) { cb(); drain(); }
}
// "main module"
q.timers.push(() => out.push('T1'));
q.poll.push(() => { out.push('IO'); q.check.push(() => out.push('I2')); q.timers.push(() => out.push('T2')); });
q.check.push(() => { out.push('I1'); q.check.push(() => out.push('I3 (next lap)')); });
ticks.push(() => out.push('tick'));
micro.push(() => out.push('promise'));
out.push('main'); drain();
let lap = 0;
while (q.timers.length || q.poll.length || q.check.length) {
  lap++; runPhase('timers'); runPhase('poll'); runPhase('check');
  out.push('-- end of lap ' + lap);
}
console.log(out.join('\n'));` }
    ],
    codeTitle: ['Phases in real Node', 'Loop model'],
    viz: [
      {
        title: 'Phase simulator (editable): who runs when?',
        input: 'main: timeout:T1 immediate:I1 tick:N1 promise:P1 io:R1\nN1: promise:P0\nR1: timeout:T2 immediate:I2\nT1: tick:N2',
        inputLabel: 'Callbacks: name: action:child … (actions: timeout immediate tick promise io)',
        gen: function (input) { return traceLoop(input); }
      },
      {
        title: 'One lap of uv_run(), phase by phase',
        gen: function () {
          var S = [
            [null, 'Main module done. Node calls <b>uv_run()</b>. First it updates its cached "now" time.'],
            ['TM', '<b>timers</b>: run every timer whose due time ≤ now, in due-time order. After each one, drain nextTick + promises.'],
            ['PE', '<b>pending callbacks</b>: a few I/O callbacks the OS reported last lap (for example some TCP errors).'],
            ['PO', '<b>poll</b>: ask the OS (epoll_wait) for ready I/O and run those callbacks. If nothing else is scheduled, Node <b>sleeps here</b> until the next timer is due — 0 % CPU while idle.'],
            ['CH', '<b>check</b>: run setImmediate callbacks queued before this phase began.'],
            ['CL', '<b>close</b>: run \'close\' events of handles that were destroyed.'],
            ['MT', 'Between <b>every</b> callback of every phase: empty the nextTick queue, then the promise microtasks, repeat until both are empty.'],
            ['TM', 'Any referenced handles or requests left? Yes → next lap. No → uv_run returns, <code>process.on(\'exit\')</code> fires, the process ends.']
          ];
          return S.map(function (s) { return { narr: s[1], parts: [phaseGraph(s[0])] }; });
        }
      }
    ],
    examples: [
      { title: 'setTimeout(0) vs setImmediate in the main module is a race', html: `<p>Node turns <code>setTimeout(fn, 0)</code> into a 1 ms timer. When the loop starts, if at least 1 ms has passed since the timer was created, the timers phase runs it first; otherwise the loop goes on to poll and check, and the immediate wins. Machine load decides. Inside an I/O callback there is no race: check comes right after poll.</p>`, code: { lang: 'js', code: R`setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
// Prints either order from the main module. Wrap both in fs.readFile(..., () => {...})
// and it is ALWAYS: immediate, timeout.` } },
      { title: 'Why a server keeps the process alive and a timer can be unref\'d', html: `<p>A listening server is an active <b>handle</b>; the loop keeps going while it exists. <code>setInterval</code> is also a handle. <code>unref()</code> says "do not count me when deciding whether to exit" — perfect for a metrics flush interval that must not stop graceful shutdown.</p>`, code: { lang: 'js', code: R`const http = require('node:http');
const server = http.createServer((req, res) => res.end('ok')).listen(3000);
const flush = setInterval(() => sendMetrics(), 10_000);
flush.unref();                       // the server, not this timer, keeps the loop alive
process.on('SIGTERM', () => server.close(() => console.log('closed, loop drains, process exits')));
function sendMetrics() {}` } },
      { title: 'Predict a lap by hand', html: `<p>Main schedules timer T1, immediate I1, and reads a file (R1). Lap 1: timers → T1; poll → R1 (which schedules I2 and T2); check → I1, I2; close. Lap 2: timers → T2. Output: <b>T1 R1 I1 I2 T2</b> (assuming T1 had expired when the loop started). Notice I2 joined the check queue <i>before</i> check began, so it runs in the same lap.</p>` },
      { title: 'Timers are a minimum, not a promise', html: `<p><code>setTimeout(fn, 100)</code> means "not earlier than 100 ms". If a callback in the poll phase computes for 300 ms, the timer fires at ~300 ms. libuv keeps timers in a <b>min-heap</b> ordered by due time, so checking "is the earliest timer due?" is O(1) and inserting is O(log n).</p>` }
    ],
    deepDive: `<p><b>uv_run in more detail.</b> Each lap: <code>uv__update_time</code> → run due timers → run pending queue → idle → prepare → compute the poll <b>timeout</b> (0 if immediates are pending or the loop is stopping, otherwise time until the nearest timer, or infinite) → <code>uv__io_poll</code> (epoll_wait/kevent/GetQueuedCompletionStatus) → check → closing handles. libuv 1.45 (Node 20) moved the timer run so that timers are processed once per lap after poll as well; the guarantees interviewers ask about (I/O-callback immediates before timers, main-module race) did not change.</p>
<p><b>Handles vs requests.</b> A <i>handle</i> is a long-lived object (TCP server, timer, signal watcher); a <i>request</i> is a one-shot operation (a write, an fs read, a DNS lookup). <code>uv_loop_alive()</code> checks for active referenced handles or requests. <code>process._getActiveHandles()</code> (undocumented) or the <code>why-is-node-running</code> package lists them when a process "hangs" at the end of a test run.</p>
<p><b>Where the microtasks live.</b> V8 owns the promise job queue; Node's <code>processTicksAndRejections</code> runs the nextTick queue and calls <code>runMicrotasks()</code> in a loop. It is invoked from <code>InternalCallbackScope</code> whenever C++ calls back into JS, which is why the drain happens after <b>each</b> callback. Unhandled rejections are processed in the same function, after the queues empty.</p>
<p><b>Windows.</b> IOCP is completion-based (the OS does the read and tells you), while epoll/kqueue are readiness-based (the OS says "you can read now"). libuv hides the difference; that is why Node code is portable.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants reliably recite the six phases, but often state a fixed order for <code>setTimeout(0)</code> vs <code>setImmediate</code> in the main module, or mix in browser rules (rendering steps, "macrotask queue" as one queue). They also forget that the drain happens after each callback, not after each phase (the pre-Node-11 behaviour that old blog posts describe).</p>
<p><b>Use AI well:</b> ask it to annotate a snippet with "phase + why" per callback, then <i>run</i> the snippet with <code>node</code> twice, and once wrapped in <code>fs.readFile</code>. Ask for a counter-example to each rule it claims. For hangs, paste the output of <code>why-is-node-running</code> and ask which handle keeps the loop alive.</p>
<p><b>What you must still own:</b> drawing the lap from memory, knowing what "the loop is alive" means, and spotting when a claim depends on timing (racy) versus phase order (guaranteed).</p>`,
    problems: [
      {
        title: 'Event-loop phase simulator',
        level: 'Medium', tags: ['node', 'event loop', 'simulation', 'nextTick'], companies: ['Netflix', 'PayPal', 'Uber'],
        statement: `<p>Write <code>loopOrder(lines)</code> that simulates Node's event loop and returns the order in which callbacks run. Each line describes one callback: <code>name: kind:child kind:child …</code>. When a callback runs it is logged by name (except <code>main</code>, which is the main module and runs first), then it schedules its children in order:</p>
<ul><li><code>tick:X</code> → <code>process.nextTick</code>; <code>promise:X</code> → promise microtask;</li>
<li><code>timeout:X</code> → <code>setTimeout(X, 0)</code>; <code>io:X</code> → an I/O request whose callback X runs in the next poll phase; <code>immediate:X</code> → <code>setImmediate</code>.</li></ul>
<p>Rules: after <b>every</b> callback, drain the nextTick queue completely, then the microtask queue completely, and repeat while either is non-empty. Then loop laps of <b>timers → poll → check</b>; each phase runs only the callbacks queued before the phase started. Assume every timer has expired by the time its lap begins (so no main-module race). Stop when all queues are empty.</p>`,
        constraints: `<p>1–50 lines, names are unique words, a name without a line schedules nothing. Total callbacks ≤ 10<sup>4</sup>.</p>`,
        example: `<p><code>["main: timeout:T1 immediate:I1 tick:N1 promise:P1", "P1: tick:N2", "N1: promise:P0"]</code> → ${H.c('p', 'N1 P1 P0 N2')} ${H.c('b', 'T1')} ${H.c('g', 'I1')}. N1 (tick) runs first and queues P0 behind P1; while the microtask queue drains, P1 queues tick N2, which only runs once the microtask queue is empty. Then the timers phase (T1), then check (I1).</p>`,
        brute: { why: `<p>A "one big macrotask queue" model puts every timer, I/O callback and immediate in creation order and runs microtasks only once at the end. It gets I/O-callback immediates, nested ticks and per-callback draining wrong.</p>`, code: R`function loopOrderNaive(lines) {
  // Flattens everything into creation order: wrong for Node's phases.
  const out = [];
  for (const line of lines) {
    const [name, rest] = line.split(':');
    if (name.trim() !== 'main') out.push(name.trim());
  }
  return out;
}` },
        mcq: { q: 'A promise callback calls <code>process.nextTick(f)</code>. When does f run?', options: ['Immediately, before the promise callback returns', 'After the whole current promise microtask queue is empty', 'In the next timers phase', 'In the check phase'], answer: 1, explain: 'Node drains ticks, then all microtasks; a tick added during the microtask drain waits until the microtask queue is empty, then the outer loop picks it up.' },
        hints: [
          `<p>Hint 1: Keep five FIFO queues: ticks, microtasks, timers, I/O, immediates. A callback "running" just logs itself and pushes its children.</p>`,
          `<p>Hint 2: <code>drain()</code> = while (ticks or micro non-empty) { empty ticks; empty micro }. Call it after EVERY callback, including main.</p>`,
          `<p>Hint 3: A phase takes a snapshot: <code>batch = queue.splice(0)</code>, then runs each with a drain after it. Loop laps timers → poll → check until all three are empty.</p>`
        ],
        tests: { sig: 'string[] -> string[]', fn: 'loopOrder', cases: [
          [[['main: timeout:T1 immediate:I1 tick:N1 promise:P1', 'P1: tick:N2', 'N1: promise:P0']], ['N1', 'P1', 'P0', 'N2', 'T1', 'I1']],
          [[['main: io:R1', 'R1: timeout:T1 immediate:I1']], ['R1', 'I1', 'T1']],
          [[['main:']], []],
          [[['main: immediate:I1 immediate:I2', 'I1: immediate:I3 tick:N1']], ['I1', 'N1', 'I2', 'I3']],
          [[['main: timeout:T1 timeout:T2', 'T1: timeout:T3 promise:P1']], ['T1', 'P1', 'T2', 'T3']],
          [[['main: promise:P1 tick:N1 timeout:T1', 'P1: promise:P2', 'P2: tick:N2', 'N2: promise:P3']], ['N1', 'P1', 'P2', 'N2', 'P3', 'T1']],
          [[['main: timeout:T1 immediate:I1', 'T1: io:R1 immediate:I2', 'R1: timeout:T2']], ['T1', 'R1', 'I1', 'I2', 'T2']]
        ] },
        solution: {
          approach: `<p>Model each queue as an array. <code>run(name)</code> logs and schedules children. <code>drain()</code> alternates "all ticks, then all microtasks" until both are empty — exactly what <code>processTicksAndRejections</code> does. Each phase snapshots its queue so callbacks scheduled during the phase wait for the next lap.</p>`,
          code: { lang: 'js', run: true, code: R`function loopOrder(lines) {
  const cbs = {};
  for (const line of lines) {
    const i = line.indexOf(':');
    const name = line.slice(0, i).trim();
    cbs[name] = line.slice(i + 1).trim().split(/\s+/).filter(Boolean)
      .map((a) => { const [kind, child] = a.split(':'); return { kind, child }; });
  }
  const out = [], q = { tick: [], promise: [], timeout: [], io: [], immediate: [] };

  function run(name) {
    if (name !== 'main') out.push(name);
    for (const a of cbs[name] || []) q[a.kind].push(a.child);   // schedule children in order
  }
  function drain() {                       // after EVERY callback
    while (q.tick.length || q.promise.length) {
      while (q.tick.length) run(q.tick.shift());         // all nextTicks first
      while (q.promise.length) run(q.promise.shift());   // then all promise jobs
    }
  }
  function phase(queue) {
    const batch = queue.splice(0);         // only what was queued before the phase began
    for (const name of batch) { run(name); drain(); }
  }

  run('main'); drain();
  while (q.timeout.length || q.io.length || q.immediate.length) {
    phase(q.timeout);    // timers
    phase(q.io);         // poll
    phase(q.immediate);  // check
  }
  return out;
}

console.log(loopOrder(['main: timeout:T1 immediate:I1 tick:N1 promise:P1', 'P1: tick:N2', 'N1: promise:P0']).join(' '));
// N1 P1 P0 N2 T1 I1` },
          dry: { head: ['step', 'runs', 'ticks', 'micro', 'output'], rows: [
            ['main', 'main', 'N1', 'P1', '—'],
            ['drain', 'N1 (tick)', '—', 'P1 P0', 'N1'],
            ['drain', 'P1 (micro)', 'N2', 'P0', 'N1 P1'],
            ['drain', 'P0 (micro)', 'N2', '—', 'N1 P1 P0'],
            ['drain again', 'N2 (tick)', '—', '—', 'N1 P1 P0 N2'],
            ['timers', 'T1', '—', '—', '… T1'],
            ['check', 'I1', '—', '—', '<span class="c-g">N1 P1 P0 N2 T1 I1</span>']
          ] },
          complexity: `<p>O(C) for C callbacks (each is queued and run once; <code>shift</code> on small arrays is fine, use an index for huge inputs).</p>`,
          followUps: ['Add real timer delays: keep timers in a min-heap keyed by due time.', 'Model the ES-module twist where main itself runs inside a microtask.']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 2 — nextTick vs microtasks vs setImmediate
     ====================================================================== */
  topics.push({
    title: 'process.nextTick vs Promise Microtasks vs setImmediate: Priorities, Starvation and the ESM Twist',
    analogy: `<p>Think of a <b>doctor between patients</b>. Before calling the next patient she checks two trays on her desk: the red <b>"right now"</b> tray (<code>process.nextTick</code>) and then the yellow <b>"before the next patient"</b> tray (promise callbacks). She empties red, then yellow, and if yellow work added more red notes she goes back to red. Only when both trays are empty does she open the waiting-room door. <code>setImmediate</code> is a note pinned to the <b>waiting-room board</b>: it is handled in the next "check" round, after the people already waiting. If someone keeps dropping notes into the red tray, the waiting room is never served — that is <b>starvation</b>.</p>`,
    explain: `<p>Three "run soon" APIs, three very different promises:</p>
${H.table(['API', 'Queue', 'Runs', 'Owner'], [
  ['<code>process.nextTick(fn)</code>', 'nextTick queue', 'as soon as the current JS operation finishes, before promises', 'Node'],
  ['<code>Promise.then</code>, <code>await</code>, <code>queueMicrotask</code>', 'V8 microtask queue', 'after the nextTick queue is empty', 'V8 (ECMAScript)'],
  ['<code>setImmediate(fn)</code>', 'check-phase queue', 'in the check phase of the current or next lap', 'libuv'],
  ['<code>setTimeout(fn, 0)</code>', 'timer heap', 'timers phase, ≥ 1 ms later', 'libuv']
])}
<p>The names are historical and misleading: <code>nextTick</code> fires <i>immediately</i> (no loop lap), while <code>setImmediate</code> fires on a later tick. The Node docs recommend <code>setImmediate</code> or <code>queueMicrotask</code> in new code because they are easier to reason about.</p>
<p><b>Why does nextTick exist?</b> To let an API behave asynchronously <i>but before any I/O</i>. Classic case: a constructor that wants to emit an event. If it emitted synchronously, nobody could have attached a listener yet. With <code>process.nextTick(() =&gt; this.emit('ready'))</code> the caller's synchronous code (including <code>.on('ready')</code>) runs first, and the event still fires before any I/O callback. Node core uses this everywhere (for example, errors from <code>net.connect</code> with a bad port are emitted on next tick).</p>
<p><b>Starvation.</b> Both queues are drained <i>until empty</i>. A nextTick (or promise) callback that schedules itself recursively never lets the loop reach poll: no I/O, no timers, a 100 % CPU process that still "looks alive". <code>setImmediate</code> recursion is safe — each new immediate waits for the next lap, so I/O gets its turn.</p>
<p><b>The ES-module twist.</b> In an ES module (<code>.mjs</code> or <code>"type": "module"</code>), your top-level code runs as part of the module's evaluation, which is driven by promises. When it finishes, V8 is still in the middle of draining microtasks, so promise callbacks scheduled at top level run <b>before</b> nextTick callbacks. In CommonJS the order is the classic nextTick → promise.</p>`,
    clues: [
      '"nextTick vs setImmediate — which first?" → nextTick (before any I/O); immediate waits for the check phase',
      '"process.nextTick vs Promise.then" → nextTick queue first in CommonJS; in an ES module top level, promise first',
      '"Why does my server stop responding while CPU is 100 %?" → recursive nextTick / microtask loop starving the poll phase',
      '"Emit an event from a constructor" → defer with process.nextTick so listeners can attach first',
      '"Yield to I/O inside a long loop" → setImmediate, not nextTick or await Promise.resolve()',
      '"queueMicrotask in Node" → same queue as promise reactions; standard and portable'
    ],
    code: [
      { lang: 'js', run: true, title: 'Priority ladder with nesting (runnable in Node)', code: R`setImmediate(() => console.log('7 immediate'));
setTimeout(() => console.log('8 timeout (or before 7: main-module race)'), 0);
process.nextTick(() => {
  console.log('2 tick');
  process.nextTick(() => console.log('3 tick added by a tick: still before promises'));
  Promise.resolve().then(() => console.log('5 promise added by a tick'));
});
Promise.resolve().then(() => {
  console.log('4 promise');
  process.nextTick(() => console.log('6 tick added by a promise: after the promise queue empties'));
});
console.log('1 sync');` },
      { lang: 'js', title: 'Starvation vs yielding (syntax-checked, do not run the bad one!)', code: R`// BAD: recursive nextTick. The timers and poll phases are never reached.
function spinForever() { process.nextTick(spinForever); }
// setTimeout(() => console.log('never printed'), 10); spinForever();

// GOOD: chunked work that yields to the event loop with setImmediate.
function sumInChunks(items, done, i = 0, acc = 0) {
  const end = Math.min(i + 10_000, items.length);
  for (; i < end; i++) acc += items[i];
  if (i < items.length) setImmediate(sumInChunks, items, done, i, acc); // I/O runs between chunks
  else done(acc);
}` },
      { lang: 'js', title: 'The deferred-emit pattern used by Node core (syntax-checked)', code: R`const { EventEmitter } = require('node:events');

class Connection extends EventEmitter {
  constructor(opts) {
    super();
    if (!opts.host) {
      // Emitting synchronously here would fire before the caller attached .on('error').
      process.nextTick(() => this.emit('error', new Error('host is required')));
      return;
    }
    process.nextTick(() => this.emit('ready'));
  }
}

new Connection({}).on('error', (e) => console.log('caught:', e.message));` }
    ],
    codeTitle: ['Ladder', 'Starvation', 'Deferred emit'],
    viz: [
      {
        title: 'Two trays: draining nextTick and microtasks',
        gen: function () {
          var code = "setImmediate(() => log('immediate'));\nprocess.nextTick(() => {\n  log('tick1');\n  Promise.resolve().then(() => log('p-from-tick'));\n  process.nextTick(() => log('tick-from-tick'));\n});\nPromise.resolve().then(() => {\n  log('promise1');\n  process.nextTick(() => log('tick-from-promise'));\n});\nqueueMicrotask(() => log('micro2'));\nlog('sync');";
          var S = [
            [12, [], [], ['immediate'], ['sync'], 'Main module runs. It queues an immediate, a tick, a promise job and a queueMicrotask job, then prints <b>sync</b>.', ['tick1'], ['promise1', 'micro2']],
            [3, [], [], ['immediate'], ['sync', 'tick1'], 'Main returns → Node empties the <b>nextTick</b> tray first: <b>tick1</b>. It adds a promise job (to the back of the yellow tray) and another tick.', ['tick-from-tick'], ['promise1', 'micro2', 'p-from-tick']],
            [5, [], [], ['immediate'], ['sync', 'tick1', 'tick-from-tick'], 'The red tray is not empty yet → <b>tick-from-tick</b> runs before any promise.', [], ['promise1', 'micro2', 'p-from-tick']],
            [8, [], [], ['immediate'], ['sync', 'tick1', 'tick-from-tick', 'promise1'], 'Red empty → yellow tray (V8 microtasks): <b>promise1</b>, which adds a tick. The tick must wait: the yellow tray is drained completely first.', ['tick-from-promise'], ['micro2', 'p-from-tick']],
            [11, [], [], ['immediate'], ['sync', 'tick1', 'tick-from-tick', 'promise1', 'micro2'], '<b>micro2</b> (queueMicrotask uses the same queue as promises).', ['tick-from-promise'], ['p-from-tick']],
            [4, [], [], ['immediate'], ['sync', 'tick1', 'tick-from-tick', 'promise1', 'micro2', 'p-from-tick'], '<b>p-from-tick</b>. Yellow tray empty now.', ['tick-from-promise'], []],
            [9, [], [], ['immediate'], ['sync', 'tick1', 'tick-from-tick', 'promise1', 'micro2', 'p-from-tick', 'tick-from-promise'], 'Back to red: <b>tick-from-promise</b>. Both trays empty → the loop may continue.', [], []],
            [1, [], [], [], ['sync', 'tick1', 'tick-from-tick', 'promise1', 'micro2', 'p-from-tick', 'tick-from-promise', 'immediate'], 'Loop: timers (none) → poll (nothing) → <b>check</b>: <b>immediate</b>.', [], []]
          ];
          return S.map(function (s) {
            return { narr: s[5], parts: [
              { type: 'code', label: 'CommonJS program', lang: 'js', code: code, hl: one(s[0], 'cur') },
              { type: 'queue', label: 'Red tray: nextTick queue', items: s[6], frontLabel: 'next', backLabel: '' },
              { type: 'queue', label: 'Yellow tray: microtask queue', items: s[7], frontLabel: 'next', backLabel: '' },
              { type: 'queue', label: 'check phase', items: s[3], frontLabel: 'next', backLabel: '' },
              { type: 'array', label: 'Output', values: s[4], start: 1, hl: one(s[4].length - 1, 'ok') }
            ] };
          });
        }
      },
      {
        title: 'Starvation: recursive nextTick vs recursive setImmediate',
        gen: function () {
          var rows = [];
          var frames = [];
          var steps = [
            ['nextTick', 'tick #1 runs and queues tick #2', 'MT'],
            ['nextTick', 'tick #2 runs and queues tick #3 — the drain loop never ends', 'MT'],
            ['nextTick', 'tick #1000000… timers phase and poll are never reached: the HTTP request waiting in the kernel is never read', 'MT'],
            ['setImmediate', 'immediate #1 runs in check and queues #2 for the NEXT lap', 'CH'],
            ['setImmediate', 'close → timers → poll: the HTTP request callback runs', 'PO'],
            ['setImmediate', 'check: immediate #2 runs. Work and I/O interleave fairly', 'CH']
          ];
          steps.forEach(function (s) {
            rows.push([s[0], s[1]]);
            frames.push({ narr: '<b>' + s[0] + '</b> recursion: ' + s[1] + '.', parts: [phaseGraph(s[2]), { type: 'table', label: 'What happens', columns: ['API', 'step'], rows: rows.slice(), hl: one(rows.length - 1, s[0] === 'nextTick' ? 'bad' : 'ok') }] });
          });
          return frames;
        }
      }
    ],
    examples: [
      { title: 'ESM flips nextTick and promise', html: `<p>Save as <code>order.mjs</code>: it prints <b>sync, promise, nextTick</b>. Rename to <code>order.cjs</code>: <b>sync, nextTick, promise</b>. The ES module's body is evaluated inside a promise job, so the microtask queue is already being drained when the body ends.</p>`, code: { lang: 'js', code: R`process.nextTick(() => console.log('nextTick'));
Promise.resolve().then(() => console.log('promise'));
console.log('sync');` } },
      { title: 'await does not yield to I/O', html: `<p><code>await null</code> inside a hot loop yields only to other <b>microtasks</b>. The poll phase is never reached, so incoming requests still wait. Use <code>await new Promise(setImmediate)</code> (or <code>require('node:timers/promises').setImmediate()</code>) to give I/O a turn.</p>`, code: { lang: 'js', code: R`const { setImmediate: yieldToLoop } = require('node:timers/promises');
async function crunch(rows) {
  for (let i = 0; i < rows.length; i++) {
    heavy(rows[i]);
    if (i % 1000 === 0) await yieldToLoop();   // lets the poll phase run
  }
}
function heavy() {}` } },
      { title: 'Unhandled rejections are checked after the queues drain', html: `<p>Node checks for unhandled rejections inside <code>processTicksAndRejections</code>, after the tick and microtask queues empty. Attaching <code>.catch</code> in a later nextTick or microtask is fine; attaching it in a <code>setTimeout</code> is too late — since Node 15 the default <code>--unhandled-rejections=throw</code> crashes the process first.</p>` },
      { title: 'Interview speed answer', html: `<p>"Inside one turn: synchronous code → all nextTicks → all promise microtasks (repeat until both empty) → then the loop continues to its next phase. setImmediate = check phase. setTimeout 0 = timers phase, ≥ 1 ms. Inside I/O callbacks immediate beats timeout; at top level it is a race. In ESM top level, promises beat nextTick."</p>` }
    ],
    deepDive: `<p><b>Implementation.</b> <code>process.nextTick</code> pushes to a JS <code>FixedQueue</code> (a ring buffer of 2048-slot arrays) in <code>lib/internal/process/task_queues.js</code>. <code>processTicksAndRejections()</code> does: <code>do { while (tick = queue.shift()) { run tick }; runMicrotasks(); } while (!queue.isEmpty() || processPromiseRejections())</code>. V8's microtask policy in Node is <b>explicit</b>: V8 never drains microtasks on its own; Node calls <code>runMicrotasks()</code> when a callback scope closes.</p>
<p><b>Where the drain is triggered.</b> Every time libuv calls back into JS (timer, I/O, immediate), the C++ <code>InternalCallbackScope</code> destructor calls the tick-processing function if there is work. Timers are a special case: all expired timers with the same duration share one libuv timer, and <code>listOnTimeout</code> calls <code>runNextTicks()</code> between them — that change in Node 11 is why "microtasks between each setTimeout" now matches browsers.</p>
<p><b>setImmediate internals.</b> Immediates are a linked list run by a single libuv <code>uv_check_t</code>. While immediates are pending, an idle handle keeps the poll timeout at 0, so the loop does not sleep in epoll. The list is snapshotted at the start of the check phase.</p>
<p><b>AsyncLocalStorage</b> context propagates through all of these (nextTick, promises, timers, immediates) because Node captures the async context when the callback is queued — important for request IDs in logs.</p>`,
    aiEra: `<p><b>What AI changes:</b> models frequently say "microtasks always run before nextTick" or the reverse without mentioning the module format, and many generated "yield" helpers use <code>await Promise.resolve()</code>, which never lets I/O run. They also suggest <code>process.nextTick</code> for deferring heavy work, which makes starvation worse.</p>
<p><b>Use AI well:</b> ask "show the order for this snippet in CommonJS and in ESM and explain the difference", then verify with <code>node file.cjs</code> and <code>node file.mjs</code>. When reviewing generated code, search for recursive <code>nextTick</code>/<code>queueMicrotask</code> and loops with <code>await</code> of resolved values on hot paths.</p>
<p><b>What you must still own:</b> the two-tray drain rule, the starvation argument, and the practical choice: <code>queueMicrotask</code> for "after this, before anything else", <code>setImmediate</code> for "after pending I/O".</p>`,
    problems: [
      {
        title: 'Predict nested nextTick / promise / queueMicrotask order',
        level: 'Medium', tags: ['node', 'nextTick', 'microtasks', 'output order'], companies: ['Atlassian', 'Swiggy', 'LinkedIn'],
        statement: `<p>Write a CommonJS Node program that schedules exactly the callbacks below and prints the order in which they run. Then explain each line.</p><pre>setImmediate → 'immediate'
nextTick → 'tick1' (which queues a promise 'promise-from-tick' and a nextTick 'tick-from-tick')
promise → 'promise1' (which queues a nextTick 'tick-from-promise')
queueMicrotask → 'micro2'
sync log → 'sync'</pre>`,
        constraints: `<p>Node.js 20+ running a <b>CommonJS</b> file. No timers other than setImmediate.</p>`,
        example: `<p>${H.c('g', 'sync')} → ${H.c('r', 'tick1 tick-from-tick')} → ${H.c('y', 'promise1 micro2 promise-from-tick')} → ${H.c('r', 'tick-from-promise')} → ${H.c('b', 'immediate')}.</p>`,
        brute: { why: `<p>The naive guess "everything in creation order, nested ones last" ignores that the nextTick queue is fully emptied (including ticks added by ticks) before any promise, and that a tick queued by a promise waits for the whole microtask queue.</p>`, code: R`// Creation-order guess (wrong):
console.log(['sync', 'immediate', 'tick1', 'promise1', 'micro2',
  'promise-from-tick', 'tick-from-tick', 'tick-from-promise'].join('\n'));` },
        mcq: { q: 'Why does <code>tick-from-tick</code> print before <code>promise1</code>?', options: ['nextTick callbacks are sorted alphabetically', 'Node empties the whole nextTick queue, including ticks added during the drain, before running promise jobs', 'promise1 is a macrotask', 'Because of the ESM twist'], answer: 1, explain: 'The inner loop is "while (tick queue not empty) run tick", so newly added ticks run in the same drain.' },
        hints: [
          `<p>Hint 1: Separate three groups: synchronous, red tray (nextTick), yellow tray (promise + queueMicrotask). Immediate is last of all.</p>`,
          `<p>Hint 2: The red tray is emptied completely, even of ticks added while emptying it. Then the yellow tray completely.</p>`,
          `<p>Hint 3: A tick queued from a promise job waits until the yellow tray is empty, then the outer loop goes back to red.</p>`
        ],
        tests: { io: true, cases: [{ stdin: '', stdout: 'sync\ntick1\ntick-from-tick\npromise1\nmicro2\npromise-from-tick\ntick-from-promise\nimmediate' }] },
        solution: {
          approach: `<p>Schedule everything exactly as specified. The drain order follows <code>processTicksAndRejections</code>: all ticks (tick1, then tick-from-tick), all microtasks in FIFO order (promise1, micro2, promise-from-tick — the last was queued during tick1, after the two from main), then the tick that promise1 queued, then the check phase.</p>`,
          code: R`setImmediate(() => console.log('immediate'));
process.nextTick(() => {
  console.log('tick1');
  Promise.resolve().then(() => console.log('promise-from-tick'));
  process.nextTick(() => console.log('tick-from-tick'));
});
Promise.resolve().then(() => {
  console.log('promise1');
  process.nextTick(() => console.log('tick-from-promise'));
});
queueMicrotask(() => console.log('micro2'));
console.log('sync');`,
          dry: { head: ['stage', 'runs', 'red tray after', 'yellow tray after'], rows: [
            ['main', 'sync', 'tick1', 'promise1, micro2'],
            ['ticks', 'tick1', 'tick-from-tick', 'promise1, micro2, promise-from-tick'],
            ['ticks', 'tick-from-tick', '—', 'same'],
            ['microtasks', 'promise1, micro2, promise-from-tick', 'tick-from-promise', '—'],
            ['ticks', 'tick-from-promise', '—', '—'],
            ['check', 'immediate', '—', '—']
          ] },
          complexity: `<p>Each callback runs once: O(callbacks).</p>`,
          followUps: ['What changes if the file is renamed to .mjs?', 'Add setTimeout(…, 0): where can it appear?']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 3 — the libuv thread pool
     ====================================================================== */
  topics.push({
    title: 'The libuv Thread Pool: Which APIs Use It, UV_THREADPOOL_SIZE and Saturation',
    analogy: `<p>A restaurant has one host at the door (the JS thread) and a kitchen with <b>four cooks</b> (the thread pool). Drinks come from a vending machine that serves everyone at once (the OS network stack — no cook needed). But every pizza needs a cook. Order six slow pizzas and the fifth and sixth wait in a ticket rail until a cook is free — even a quick salad ordered afterwards waits behind them. That ticket rail is the pool's <b>FIFO queue</b>, and it is why one slow crypto call can make your file reads slow.</p>`,
    explain: `<p>Network sockets are asynchronous at the OS level: libuv registers them with epoll/kqueue/IOCP and the poll phase is told when they are ready. Many other operations have <b>no good async OS API</b> on all platforms, so libuv runs them as blocking calls on a small <b>thread pool</b> and posts the result back to the loop (picked up in the poll phase).</p>
${H.table(['Uses the thread pool', 'Does NOT use it'], [
  ['<b>fs</b>: almost all async file APIs (<code>readFile</code>, <code>stat</code>, <code>fs.promises.*</code>, streams\' reads/writes)', '<b>net</b>, <b>http</b>, <b>https</b> sockets, <code>fetch</code> (OS async I/O)'],
  ['<b>dns.lookup</b> (calls getaddrinfo, used by <code>http.get(\'example.com\')</code>!)', '<b>dns.resolve*</b> (c-ares over UDP/TCP sockets)'],
  ['<b>crypto</b>: <code>pbkdf2</code>, <code>scrypt</code>, <code>randomBytes</code>/<code>randomFill</code> (async), <code>generateKeyPair</code>', 'sync crypto (<code>createHash</code>, <code>*Sync</code>) — runs on the main thread'],
  ['<b>zlib</b> async (<code>gzip</code>, <code>deflate</code>, zlib streams)', 'child processes, pipes, signals, timers (event loop itself)'],
  ['native addons that call <code>uv_queue_work</code> (e.g. bcrypt, sharp)', '<code>*Sync</code> APIs: they block the <b>main</b> thread instead']
])}
<p>The pool has <b>4 threads by default</b>, set by the environment variable <code>UV_THREADPOOL_SIZE</code> (1 … 1024). It is created lazily on first use and its size is read once, so it must be set <b>before</b> the first pool request — in practice, in the environment that starts Node (setting <code>process.env.UV_THREADPOOL_SIZE</code> at the top of the entry file works only if nothing has used the pool yet, which is fragile).</p>
<p><b>Saturation:</b> with 4 threads and 8 parallel <code>crypto.pbkdf2</code> calls of 100 ms each, completions come at ~100, 100, 100, 100, 200, 200, 200, 200 ms. Any <code>fs.readFile</code> queued behind them waits ≥ 100 ms even though it needs 1 ms. Symptoms in production: "file reads and DNS lookups are slow but CPU is at 25 %", or HTTP requests to hostnames stalling during a bcrypt-heavy login burst.</p>
<p><b>Fixes:</b> raise <code>UV_THREADPOOL_SIZE</code> to roughly the number of cores when the pool work is CPU-bound (more threads than cores just time-slices), separate heavy CPU work into <code>worker_threads</code>, cache DNS or use <code>dns.resolve</code>, and avoid running many large <code>fs</code> reads in parallel when streams would do.</p>`,
    clues: [
      '"Is Node single-threaded?" → your JS is; libuv has a 4-thread pool and the OS does network I/O',
      '"Which APIs use the thread pool?" → fs, dns.lookup, crypto pbkdf2/scrypt/randomBytes, zlib, uv_queue_work addons',
      '"8 bcrypt hashes take twice as long as 4" → pool of 4 is saturated; queue waits',
      '"http.get to a hostname is slow under load" → dns.lookup goes through the pool',
      '"UV_THREADPOOL_SIZE" → env var, default 4, max 1024, read once when the pool starts',
      '"Should I raise the pool size to 128?" → only for blocking I/O; CPU-bound pool work caps at core count'
    ],
    code: [
      { lang: 'js', title: 'See the pool saturate (syntax-checked, run with node and with UV_THREADPOOL_SIZE=8)', code: R`// UV_THREADPOOL_SIZE=4 node pool.js   vs   UV_THREADPOOL_SIZE=8 node pool.js
const crypto = require('node:crypto');
const fs = require('node:fs');
const start = Date.now();

for (let i = 1; i <= 8; i++) {
  crypto.pbkdf2('secret', 'salt', 200_000, 64, 'sha512', () => {
    console.log('hash', i, 'done at', Date.now() - start, 'ms');
  });
}
// A tiny file read queued BEHIND the hashes: it waits for a free pool thread.
fs.stat(__filename, () => console.log('fs.stat done at', Date.now() - start, 'ms'));
// A network call does not need the pool (but a hostname would need dns.lookup!).` },
      { lang: 'js', run: true, title: 'FIFO pool model: completion times (runnable)', code: R`// Each job waits for the earliest-free thread, in submission order.
function completionTimes(poolSize, durations) {
  const freeAt = Array(poolSize).fill(0);
  return durations.map((d) => {
    let k = 0;
    for (let i = 1; i < poolSize; i++) if (freeAt[i] < freeAt[k]) k = i;
    freeAt[k] += d;
    return freeAt[k];
  });
}
console.log('pool 4:', completionTimes(4, [100, 100, 100, 100, 100, 100, 100, 100, 1]).join(' '));
console.log('pool 8:', completionTimes(8, [100, 100, 100, 100, 100, 100, 100, 100, 1]).join(' '));
// pool 4: 100 100 100 100 200 200 200 200 201   <- the 1 ms fs job waited 200 ms
// pool 8: 100 100 100 100 100 100 100 100 101` }
    ],
    codeTitle: ['Real saturation', 'Pool model'],
    viz: [
      {
        title: 'Thread pool queue (editable): size and job durations',
        input: '4\n100 100 100 100 100 100 1',
        inputLabel: 'Line 1: pool size (1-8). Line 2: job durations in ms (≤ 12 jobs), submitted together',
        gen: function (input) {
          var ls = String(input).trim().split('\n');
          var n = parseInt(ls[0], 10), jobs = (ls[1] || '').trim().split(/\s+/).map(Number);
          if (!(n >= 1 && n <= 8) || !jobs.length || jobs.length > 12 || jobs.some(function (x) { return !(x > 0); })) throw new Error('Line 1: pool size 1-8; line 2: up to 12 positive durations');
          var free = [], who = [], fin = [], frames = [];
          for (var i = 0; i < n; i++) { free.push(0); who.push('idle'); }
          frames.push({ narr: 'All ' + jobs.length + ' jobs are submitted at t=0 and wait in the pool\'s FIFO queue. ' + n + ' worker thread(s).', parts: [
            { type: 'queue', label: 'Pool work queue', items: jobs.map(function (d, j) { return 'job' + j + ' (' + d + 'ms)'; }), frontLabel: 'next', backLabel: '' },
            { type: 'bars', label: 'Thread busy-until (ms)', values: free.slice(), idxLabels: free.map(function (_, k) { return 'T' + k; }) }
          ] });
          jobs.forEach(function (d, j) {
            var k = 0; for (var w = 1; w < n; w++) if (free[w] < free[k]) k = w;
            var start = free[k]; free[k] += d; fin.push(free[k]);
            frames.push({ narr: 'job' + j + ' goes to the earliest-free thread <b>T' + k + '</b>: starts at ' + start + ' ms, finishes at <b>' + free[k] + ' ms</b>' + (start > 0 ? ' — it waited ' + start + ' ms in the queue.' : '.'), parts: [
              { type: 'queue', label: 'Pool work queue', items: jobs.slice(j + 1).map(function (dd, jj) { return 'job' + (j + 1 + jj) + ' (' + dd + 'ms)'; }), frontLabel: 'next', backLabel: '' },
              { type: 'bars', label: 'Thread busy-until (ms)', values: free.slice(), hl: one(k, start > 0 ? 'bad' : 'ok'), idxLabels: free.map(function (_, kk) { return 'T' + kk; }) },
              { type: 'array', label: 'Completion times so far', values: fin.slice(), hl: one(j, 'ok') }
            ] });
          });
          frames.push({ narr: 'Done. Each completion is posted back to the event loop and its JS callback runs in the poll phase. Last job finished at <b>' + Math.max.apply(null, fin) + ' ms</b>.', parts: [{ type: 'array', label: 'Completion times', values: fin, hl: one(fin.length - 1, 'sel') }] });
          return frames;
        }
      },
      {
        title: 'Who does the work? Main thread, pool, or kernel',
        gen: function () {
          var nodes = [
            { id: 'JS', label: 'JS main thread', x: 12, y: 30, shape: 'box' },
            { id: 'UV', label: 'libuv loop', x: 42, y: 30, shape: 'box' },
            { id: 'TP', label: 'thread pool ×4', x: 78, y: 12, shape: 'box' },
            { id: 'OS', label: 'kernel epoll/IOCP', x: 78, y: 48, shape: 'box' }
          ];
          var E = [['JS', 'UV'], ['UV', 'TP'], ['UV', 'OS'], ['TP', 'UV'], ['OS', 'UV']];
          var S = [
            ['fs.readFile(): the JS binding creates a request and hands it to libuv.', { JS: 'cur', UV: 'cur' }, { 'JS-UV': 'cur' }],
            ['libuv queues it for the <b>thread pool</b>: a pool thread does the blocking read() syscalls.', { TP: 'cur' }, { 'UV-TP': 'cur' }],
            ['socket.write(): network I/O goes straight to the <b>kernel</b>; no pool thread is used.', { OS: 'cur' }, { 'UV-OS': 'cur' }],
            ['The pool thread finishes and signals the loop (uv_async_send); the callback runs on the JS thread in the poll phase.', { UV: 'ok', JS: 'ok' }, { 'TP-UV': 'ok' }],
            ['dns.lookup("api.example.com") is a blocking getaddrinfo → <b>pool</b>. With 4 slow DNS lookups in flight, every fs call waits.', { TP: 'bad' }, { 'UV-TP': 'bad' }],
            ['crypto.createHash().digest() is synchronous: it runs on the <b>JS main thread</b> and blocks the loop for its whole duration.', { JS: 'bad' }, {}]
          ];
          return S.map(function (s) { return { narr: s[0], parts: [{ type: 'graph', label: 'Where the work happens', directed: true, height: 60, nodes: nodes, edges: E, hl: s[1], ehl: s[2] }] }; });
        }
      }
    ],
    examples: [
      { title: 'The hostname trap', html: `<p><code>http.get('http://api.internal/x')</code> first calls <code>dns.lookup</code> → pool. During a burst of <code>bcrypt.hash</code> (pool) calls, outgoing HTTP requests stall in DNS. Fixes: a bigger pool, a DNS cache (for example <code>cacheable-lookup</code>), connecting by IP, or moving bcrypt to a worker. <code>fetch</code> (undici) also resolves via <code>dns.lookup</code> by default.</p>` },
      { title: 'Sync vs async crypto', html: `<p><code>crypto.pbkdf2Sync</code> blocks the main thread for the whole computation — no other request is served. <code>crypto.pbkdf2</code> runs on the pool — the main thread stays free, but you are limited to pool-size parallel hashes. <code>createHash('sha256')</code> has no async version and is fast for small inputs; hashing a 2 GB file should stream it.</p>`, code: { lang: 'js', code: R`const crypto = require('node:crypto');
const { promisify } = require('node:util');
const pbkdf2 = promisify(crypto.pbkdf2);
async function hashPassword(pw, salt) {
  return (await pbkdf2(pw, salt, 600_000, 32, 'sha256')).toString('hex'); // pool thread
}` } },
      { title: 'Picking UV_THREADPOOL_SIZE', html: `<p>Pool work is either <b>blocking I/O</b> (fs on slow disks, NFS, DNS) or <b>CPU</b> (crypto, zlib). For I/O, more threads than cores helps (16–64 is common). For CPU, more threads than cores only adds context switching. Measure: if pool queue time dominates (slow fs/DNS while CPU is idle), raise it.</p>`, code: { lang: 'bash', code: `UV_THREADPOOL_SIZE=16 node server.js` } },
      { title: 'Reading a file in parallel 1000 times', html: `<p><code>Promise.all(files.map((f) =&gt; fs.promises.readFile(f)))</code> with 1000 big files queues 1000 pool jobs and holds every buffer in memory at once. Limit concurrency (a promise pool) or stream, so the pool queue stays short and fair for other users of fs and DNS.</p>` }
    ],
    deepDive: `<p><b>Implementation.</b> <code>uv_queue_work(loop, req, work_cb, after_work_cb)</code> pushes onto a global mutex-protected queue; worker threads block on a condition variable. When <code>work_cb</code> finishes on the worker, the request is moved to the loop's completed list and <code>uv_async_send</code> wakes the loop; <code>after_work_cb</code> runs on the loop thread. The pool is <b>process-wide</b> (shared by all loops, including each <code>worker_thread</code>'s loop), started once by <code>uv_once</code>.</p>
<p><b>Slow I/O fairness.</b> libuv marks some fs/DNS work as "slow I/O" and limits it to about half of the threads (<code>(nthreads + 1) / 2</code>), so that a flood of slow DNS lookups cannot occupy every thread and starve fast fs work.</p>
<p><b>Linux io_uring.</b> libuv 1.45+ can use io_uring for some file operations on Linux, bypassing the pool. Node later disabled it by default after security and compatibility concerns (it can be enabled with <code>UV_USE_IO_URING=1</code>), so you should still assume fs uses the pool on all LTS lines.</p>
<p><b>Observability.</b> There is no built-in "pool queue length" metric. Indirect signals: fs/DNS latency rising while event-loop delay stays low; <code>async_hooks</code>/diagnostics_channel timing of <code>FSREQCALLBACK</code> and <code>GETADDRINFOREQWRAP</code> resources; <code>perf</code> showing worker threads at 100 %.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated answers often claim "Node uses the thread pool for all I/O", including network sockets, or recommend <code>UV_THREADPOOL_SIZE=128</code> as a universal speed-up. They also tend to set the variable with <code>process.env</code> deep inside a module that loads after the pool already started.</p>
<p><b>Use AI well:</b> ask it to classify each call in your request path as main thread / pool / kernel and to point out <code>dns.lookup</code> hidden in HTTP clients. Then verify with a micro-benchmark like the pbkdf2 example and a profile. Let AI write the load-test script; you interpret the queueing curve.</p>
<p><b>What you must still own:</b> the classification table, the queueing math (jobs / threads × duration), and the judgement of when to scale the pool versus moving work to workers.</p>`,
    problems: [
      {
        title: 'Thread-pool queue simulator',
        level: 'Easy', tags: ['node', 'libuv', 'thread pool', 'simulation'], companies: ['Amazon', 'Walmart', 'Flipkart'],
        statement: `<p>All jobs are submitted to the libuv pool at <code>t = 0</code> in the given order. The pool has <code>size</code> threads; a job is taken from the FIFO queue by the thread that becomes free first (lowest index on ties) and runs for its duration without interruption. Return each job's completion time, in input order.</p>`,
        constraints: `<p>1 ≤ size ≤ 1024, 0 ≤ jobs.length ≤ 10<sup>5</sup>, 1 ≤ duration ≤ 10<sup>4</sup>.</p>`,
        example: `<p><code>size = 4, jobs = [100,100,100,100,100,100]</code> → ${H.c('g', '[100,100,100,100,')}${H.c('r', '200,200]')}: four run at once; jobs 5 and 6 wait for the first free threads.</p>`,
        brute: { why: `<p>Simulating millisecond by millisecond is O(total time × size): correct but wasteful when durations are large.</p>`, code: R`function poolScheduleSlow(size, jobs) {
  const out = Array(jobs.length).fill(0), left = jobs.slice(), running = [];
  let next = 0, t = 0;
  while (next < jobs.length || running.length) {
    while (running.length < size && next < jobs.length) running.push(next++);
    t++;
    for (const j of running) left[j]--;
    for (let k = running.length - 1; k >= 0; k--) if (left[running[k]] === 0) { out[running[k]] = t; running.splice(k, 1); }
  }
  return out;
}` },
        mcq: { q: 'Pool size 4, nine 100 ms pbkdf2 calls submitted together. When does the 9th finish?', options: ['100 ms', '200 ms', '300 ms', '900 ms'], answer: 2, explain: 'Batches of 4: 100, 200, then the 9th runs alone from 200 to 300 ms.' },
        hints: [
          `<p>Hint 1: You only need each thread's "free at" time.</p>`,
          `<p>Hint 2: For each job in order, pick the thread with the smallest free-at time; finish = freeAt + duration.</p>`,
          `<p>Hint 3: A linear scan over threads is fine for small pools; use a min-heap of (freeAt, index) for size up to 1024 and 10<sup>5</sup> jobs.</p>`
        ],
        tests: { sig: 'int int[] -> int[]', fn: 'poolSchedule', cases: [
          [[4, [100, 100, 100, 100, 100, 100]], [100, 100, 100, 100, 200, 200]],
          [[1, [5, 3, 2]], [5, 8, 10]],
          [[3, []], []],
          [[2, [10, 1, 1, 1]], [10, 1, 2, 3]],
          [[8, [7]], [7]],
          [[4, [100, 100, 100, 100, 100, 100, 100, 100, 1]], [100, 100, 100, 100, 200, 200, 200, 200, 201]],
          [[2, [3, 3, 3, 3, 3]], [3, 3, 6, 6, 9]]
        ] },
        solution: {
          approach: `<p>Keep <code>freeAt[k]</code> for each thread. Each job goes to the earliest-free thread (FIFO queue order), starting when that thread frees up. This is exactly list scheduling on identical machines.</p>`,
          code: { lang: 'js', run: true, code: R`function poolSchedule(size, jobs) {
  const freeAt = new Array(size).fill(0);
  return jobs.map((duration) => {
    let k = 0;
    for (let i = 1; i < size; i++) if (freeAt[i] < freeAt[k]) k = i;   // earliest free, lowest index
    freeAt[k] += duration;            // job starts when thread k is free
    return freeAt[k];                 // completion time
  });
}
console.log(poolSchedule(4, [100, 100, 100, 100, 100, 100]));   // [100,100,100,100,200,200]` },
          dry: { head: ['job', 'freeAt before', 'thread', 'finish'], rows: [
            ['0', '[0,0,0,0]', 'T0', '100'], ['1', '[100,0,0,0]', 'T1', '100'], ['2', '[100,100,0,0]', 'T2', '100'], ['3', '[100,100,100,0]', 'T3', '100'],
            ['4', '[100,100,100,100]', 'T0', '<span class="c-r">200</span>'], ['5', '[200,100,100,100]', 'T1', '<span class="c-r">200</span>']
          ] },
          complexity: `<p>O(J × S) with the scan, O(J log S) with a min-heap. O(S) memory.</p>`,
          followUps: ['Add arrival times (see the practice arena).', 'Model libuv\'s rule that slow I/O may use at most half the threads.']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 4 — Streams, backpressure & Buffers
     ====================================================================== */
  topics.push({
    title: 'Streams, Backpressure and Buffers: Moving Big Data in Small Bites',
    analogy: `<p>Filling a bathtub from a fire hose through a narrow drain: if the hose never stops, the tub overflows (your process runs out of memory). A <b>stream</b> moves water in buckets (chunks). The <b>highWaterMark</b> is the line painted on the tub: once the water reaches it, the tub shouts "stop!" (<code>write()</code> returns <code>false</code>), the hose pauses, and when the tub has drained it shouts "go!" (the <code>'drain'</code> event). That conversation is <b>backpressure</b>. A <b>Buffer</b> is one bucket: a fixed-size chunk of raw bytes.</p>`,
    explain: `<p>A <b>stream</b> processes data piece by piece instead of loading it all. Node has four kinds:</p>
${H.table(['Type', 'Role', 'Examples'], [
  ['<b>Readable</b>', 'source you read from', '<code>fs.createReadStream</code>, <code>http.IncomingMessage</code> (req), <code>process.stdin</code>'],
  ['<b>Writable</b>', 'sink you write to', '<code>fs.createWriteStream</code>, <code>http.ServerResponse</code> (res), <code>process.stdout</code>'],
  ['<b>Duplex</b>', 'both, independent sides', 'TCP <code>net.Socket</code>'],
  ['<b>Transform</b>', 'duplex where output = f(input)', '<code>zlib.createGzip()</code>, <code>crypto.createHash</code> as stream, CSV parsers']
])}
<p><b>Buffers inside streams.</b> Each stream keeps an internal buffer. <code>highWaterMark</code> is a <i>threshold</i>, not a hard limit: bytes for byte streams (default <b>64 KiB since Node 22</b>, 16 KiB in Node 20 and earlier; <code>fs.createReadStream</code> uses 64 KiB), or a count of objects in <code>objectMode</code> (default 16).</p>
<ul>
<li><code>writable.write(chunk)</code> always accepts the chunk, then returns <code>buffered &lt; highWaterMark</code>. <b>false = please stop</b>. When the buffer fully empties, the stream emits <code>'drain'</code>.</li>
<li>A Readable fills its buffer by calling <code>_read()</code> until it reaches its highWaterMark; if nobody consumes, it stops calling the source.</li>
<li><code>readable.pipe(dest)</code> and <code>stream.pipeline(...)</code> wire these together: when <code>dest.write()</code> returns false, the source is paused; on <code>'drain'</code> it resumes.</li>
</ul>
<p><b>Why it matters:</b> copying a 5 GB file with <code>readFile</code> + <code>writeFile</code> needs 5 GB of RAM. With <code>pipeline(createReadStream(src), createWriteStream(dst))</code> it needs about two highWaterMarks of memory, no matter the file size. If you ignore <code>write()</code>'s return value (e.g. writing in a <code>for</code> loop to a slow socket), the writable buffer grows without bound — a memory leak that looks like "RSS climbs during big exports".</p>
<p><b>Use <code>pipeline</code>, not <code>pipe</code></b>: <code>.pipe()</code> does not forward errors or destroy the other streams when one fails (leaking file descriptors), while <code>pipeline</code> (callback or <code>require('node:stream/promises').pipeline</code>) destroys every stream on error and reports exactly one error. Readables are also <b>async iterables</b>: <code>for await (const chunk of readable)</code> respects backpressure automatically.</p>
<p><b>Buffer basics:</b> <code>Buffer</code> is a subclass of <code>Uint8Array</code> holding raw bytes outside the V8 heap's normal object storage. <code>Buffer.from('héllo')</code> is 6 bytes in UTF-8 (é is 2 bytes); <code>Buffer.byteLength(str)</code> ≠ <code>str.length</code>. <code>buf.subarray()</code> (and the deprecated-in-spirit <code>slice()</code>) shares memory with the original; <code>Buffer.alloc(n)</code> zero-fills, <code>Buffer.allocUnsafe(n)</code> does not (faster, may expose old memory) and small ones come from a shared 8 KiB pool.</p>`,
    clues: [
      '"Process a 10 GB file with 512 MB RAM" → streams + pipeline; never readFile',
      '"write() returned false" → backpressure: stop and wait for \'drain\'',
      '"pipe vs pipeline" → pipeline forwards errors and destroys all streams (no fd leaks)',
      '"Memory grows while sending a big response" → ignoring write() return value / no backpressure',
      '"highWaterMark" → buffering threshold: bytes (64 KiB default in Node 22+) or objects (16)',
      '"Multi-byte characters broken at chunk boundaries" → setEncoding / StringDecoder, not chunk.toString()'
    ],
    code: [
      { lang: 'js', title: 'pipeline with a Transform and async iteration (syntax-checked, Node only)', code: R`const fs = require('node:fs');
const zlib = require('node:zlib');
const { Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');

const upper = new Transform({
  transform(chunk, encoding, callback) {          // called once per chunk
    callback(null, chunk.toString('utf8').toUpperCase());
  }
});

async function main() {
  // Backpressure, error propagation and cleanup are all handled by pipeline.
  await pipeline(fs.createReadStream('in.txt'), upper, zlib.createGzip(), fs.createWriteStream('out.txt.gz'));

  // Readables are async iterables: the loop pulls only as fast as it consumes.
  let lines = 0;
  for await (const chunk of fs.createReadStream('in.txt', { encoding: 'utf8' })) {
    lines += chunk.split('\n').length - 1;
  }
  console.log('lines:', lines);
}
main().catch((err) => { console.error('pipeline failed:', err); process.exitCode = 1; });` },
      { lang: 'js', title: 'Manual backpressure: respect write() and wait for drain (syntax-checked)', code: R`const { once } = require('node:events');

async function writeMillionLines(writable) {
  for (let i = 0; i < 1_000_000; i++) {
    if (!writable.write('line ' + i + '\n')) {     // buffer reached highWaterMark
      await once(writable, 'drain');                // pause until it empties
    }
  }
  writable.end();
  await once(writable, 'finish');
}` },
      { lang: 'js', run: true, title: 'Buffer facts you get asked about (runnable)', code: R`const s = 'héllo €';
console.log('chars:', s.length, 'bytes:', Buffer.byteLength(s));   // 7 vs 10
const buf = Buffer.from(s, 'utf8');
console.log(buf);                                                 // <Buffer 68 c3 a9 6c 6c 6f 20 e2 82 ac>
console.log(buf instanceof Uint8Array);                           // true
const view = buf.subarray(0, 1);                                  // shares memory
view[0] = 0x48;                                                   // 'h' -> 'H'
console.log(buf.toString());                                      // Héllo €
const copy = Buffer.from(buf);                                    // independent copy
copy[0] = 0x4a;
console.log(buf.toString(), copy.toString());
console.log(Buffer.from('aGk=', 'base64').toString(), buf.toString('hex').slice(0, 6));
// Split a multi-byte char across chunks: naive toString() breaks it
const euro = Buffer.from('€');
console.log(euro.subarray(0, 2).toString() + euro.subarray(2).toString()); // garbage
const { StringDecoder } = require('node:string_decoder');
const dec = new StringDecoder('utf8');
console.log(dec.write(euro.subarray(0, 2)) + dec.write(euro.subarray(2))); // €` }
    ],
    codeTitle: ['pipeline', 'Manual backpressure', 'Buffers'],
    viz: [
      {
        title: 'Backpressure model (editable): highWaterMark and chunk sizes',
        input: '10\n4 4 4 4',
        inputLabel: 'Line 1: highWaterMark (bytes). Line 2: chunk sizes (≤ 12). Sink finishes one chunk per tick',
        gen: function (input) {
          var ls = String(input).trim().split('\n');
          var hwm = parseInt(ls[0], 10), chunks = (ls[1] || '').trim().split(/\s+/).filter(Boolean).map(Number);
          if (!(hwm >= 1 && hwm <= 1000) || chunks.length > 12 || chunks.some(function (x) { return !(x > 0 && x <= 1000); })) throw new Error('Line 1: highWaterMark 1-1000; line 2: up to 12 chunk sizes 1-1000');
          var buf = [], buffered = 0, next = 0, t = 0, needDrain = false, frames = [], log = [];
          function fr(narr, cls) {
            frames.push({ narr: narr, parts: [
              { type: 'queue', label: 'Writable internal buffer (front = being flushed to disk/socket)', items: buf.map(function (s) { return s + 'B'; }), frontLabel: 'flushing', backLabel: 'write()' },
              { type: 'bars', label: 'buffered bytes vs highWaterMark', values: [buffered, hwm], texts: ['buffered', 'hwm'], hl: one(0, cls) },
              { type: 'vars', label: 'State', vals: { t: t, nextChunk: next < chunks.length ? next : 'done', needDrain: needDrain } },
              { type: 'array', label: 'Event log', values: log.slice(), hl: log.length ? one(log.length - 1, cls) : {} }
            ] });
          }
          function pump() {
            while (next < chunks.length) {
              var s = chunks[next]; buf.push(s); buffered += s;
              var ok = buffered < hwm; log.push('write ' + next + (ok ? ' ok' : ' full'));
              next++;
              fr('Producer writes chunk ' + (next - 1) + ' (' + s + ' B). Buffer holds ' + buffered + ' B; ' + (ok ? 'still below highWaterMark → write() returns <b>true</b>, keep going.' : 'reached highWaterMark → write() returns <b>false</b>. The producer must STOP and wait for \'drain\'. (The chunk was still accepted!)'), ok ? 'ok' : 'bad');
              if (!ok) { needDrain = true; return; }
            }
          }
          fr('Start: empty buffer, highWaterMark ' + hwm + ' B.', 'cur');
          pump();
          while (buf.length && frames.length < 60) {
            t++; buffered -= buf.shift();
            fr('Tick ' + t + ': the sink finished one chunk. Buffer now ' + buffered + ' B.', 'cur');
            if (buffered === 0 && needDrain) { needDrain = false; log.push('drain t=' + t); fr('Buffer is empty after a false write → <b>\'drain\'</b> fires. The producer resumes.', 'ok'); pump(); }
          }
          log.push('finish t=' + t);
          fr('All chunks flushed: <b>\'finish\'</b>. Peak memory stayed near the highWaterMark instead of the whole data size.', 'sel');
          return frames;
        }
      },
      {
        title: 'pipe() vs pipeline() when the destination fails',
        gen: function () {
          var nodes = [
            { id: 'R', label: 'createReadStream', x: 12, y: 30, shape: 'box' },
            { id: 'G', label: 'gzip Transform', x: 46, y: 30, shape: 'box' },
            { id: 'W', label: 'createWriteStream', x: 82, y: 30, shape: 'box' }
          ];
          var E = [['R', 'G'], ['G', 'W']];
          var S = [
            ['Data flows R → gzip → W. Each arrow is a pipe with backpressure.', { R: 'ok', G: 'ok', W: 'ok' }, { 'R-G': 'ok', 'G-W': 'ok' }],
            ['The disk fills up: W emits <b>error (ENOSPC)</b>.', { W: 'bad' }, { 'G-W': 'bad' }],
            ['With <b>.pipe()</b>: gzip just unpipes. R and gzip stay open — the file descriptor leaks and nobody hears about the error unless every stream has its own error handler.', { R: 'cur', G: 'cur', W: 'bad' }, {}],
            ['With <b>pipeline()</b>: the error destroys W, gzip AND R (fds closed), and the final callback / promise rejects once with ENOSPC.', { R: 'done', G: 'done', W: 'bad' }, {}],
            ['Rule: use <code>stream/promises.pipeline</code> (or <code>for await</code>) in all new code.', { R: 'sel', G: 'sel', W: 'sel' }, { 'R-G': 'sel', 'G-W': 'sel' }]
          ];
          return S.map(function (s) { return { narr: s[0], parts: [{ type: 'graph', label: 'Stream chain', directed: true, height: 60, nodes: nodes, edges: E, hl: s[1], ehl: s[2] }] }; });
        }
      }
    ],
    examples: [
      { title: 'Serving a large file over HTTP', html: `<p><code>res</code> is a Writable. <code>pipeline(fs.createReadStream(path), res)</code> sends a 4 GB video with ~64 KiB of buffering per connection; slow clients automatically slow down the disk reads. <code>res.end(fs.readFileSync(path))</code> blocks the loop and holds the whole file in RAM per request.</p>`, code: { lang: 'js', code: R`const http = require('node:http');
const fs = require('node:fs');
const { pipeline } = require('node:stream');
http.createServer((req, res) => {
  res.setHeader('content-type', 'video/mp4');
  pipeline(fs.createReadStream('movie.mp4'), res, (err) => {
    if (err) console.error('stream aborted:', err.code);   // client disconnected, etc.
  });
}).listen(8080);` } },
      { title: 'Object mode with Readable.from', html: `<p>Any iterable or async iterable becomes a stream. In objectMode the highWaterMark counts <b>objects</b>, so a slow database writer pulls at most ~16 rows ahead.</p>`, code: { lang: 'js', code: R`const { Readable, Writable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
async function* rows() { for (let id = 1; id <= 3; id++) yield { id }; }
const sink = new Writable({
  objectMode: true,
  write(row, _enc, cb) { setTimeout(() => { console.log('saved', row.id); cb(); }, 10); }
});
pipeline(Readable.from(rows()), sink).then(() => console.log('done'));` } },
      { title: 'Backpressure by the numbers', html: `<p>highWaterMark 10 B, chunks 4, 4, 4, 4, the sink finishes one chunk per tick. Writes return ok, ok, <b>false</b> (12 ≥ 10). The producer stops. After 3 ticks the buffer is empty → <code>'drain'</code> at t=3, chunk 4 is written, done at t=4. Peak buffered: 12 B instead of 16 B; with 1 million chunks the peak would still be 12 B.</p>` },
      { title: 'Buffer.allocUnsafe and the 8 KiB pool', html: `<p><code>Buffer.allocUnsafe(100)</code> carves 100 bytes from a shared, pre-allocated 8 KiB slab (<code>Buffer.poolSize</code>) without zeroing — it may contain old data. Never send it before filling it completely. Retaining a tiny slice of a large Buffer (<code>big.subarray(0, 10)</code>) keeps the <b>whole</b> backing memory alive; copy with <code>Buffer.from(slice)</code> if you keep it for long.</p>` }
    ],
    deepDive: `<p><b>Readable state machine.</b> A Readable is in <i>paused</i> mode (you call <code>read()</code>) or <i>flowing</i> mode (attaching <code>'data'</code>, calling <code>resume()</code> or <code>pipe()</code>). <code>push(chunk)</code> returns false once the buffer reaches highWaterMark; the stream then stops calling <code>_read()</code> until the consumer reads. <code>'readable'</code> plus <code>read()</code> gives precise control; mixing <code>'data'</code> and <code>'readable'</code> is a classic bug.</p>
<p><b>Writable internals.</b> <code>write()</code> appends to a buffer and calls <code>_write()</code> (or <code>_writev()</code> for batched writes after <code>cork()</code>) one chunk at a time; the callback of <code>_write</code> moves to the next chunk. <code>'drain'</code> is emitted only if a previous write returned false. <code>end()</code> → <code>_final()</code> → <code>'finish'</code>; <code>destroy(err)</code> → <code>_destroy()</code> → <code>'error'</code> → <code>'close'</code>.</p>
<p><b>Web Streams.</b> Node also implements WHATWG <code>ReadableStream</code>/<code>WritableStream</code>/<code>TransformStream</code> (used by <code>fetch</code>), with backpressure via <code>desiredSize</code> and a queuing strategy. Convert with <code>Readable.fromWeb()</code> / <code>Readable.toWeb()</code>.</p>
<p><b>Buffer memory.</b> Buffer contents live in an <code>ArrayBuffer</code> backing store allocated outside the JS object area; it counts toward <code>process.memoryUsage().arrayBuffers</code> and <code>external</code>, not <code>heapUsed</code>. A heap snapshot shows small JS wrappers retaining large external memory — a common surprise when hunting leaks.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI-generated file processing code often uses <code>readFile</code> + <code>split('\\n')</code> on files that can be gigabytes, writes in loops ignoring <code>write()</code>'s return value, uses <code>.pipe()</code> without error handling, and decodes chunks with <code>chunk.toString()</code>, breaking multi-byte characters. Many answers still quote 16 KiB as the default highWaterMark (true only before Node 22).</p>
<p><b>Use AI well:</b> ask for a <code>stream/promises.pipeline</code> version with a Transform, then review for: backpressure respected, errors propagated, encoding set once, partial lines carried between chunks. Generate a 2 GB test file and watch RSS with <code>/usr/bin/time -v</code>.</p>
<p><b>What you must still own:</b> the write()/drain contract, why pipeline beats pipe, and estimating peak memory from highWaterMarks.</p>`,
    problems: [
      {
        title: 'Backpressure-aware pipe model with highWaterMark',
        level: 'Medium', tags: ['node', 'streams', 'backpressure', 'simulation'], companies: ['Netflix', 'Dropbox', 'Hotstar'],
        statement: `<p>Model a producer writing chunks to a Writable with a byte <code>highWaterMark</code>. Return the event log.</p>
<ul><li>At t=0 the producer writes chunks in order. Each write adds the chunk to the buffer and returns <code>buffered &lt; hwm</code>. Log <code>"write i ok buf=B"</code> or <code>"write i full buf=B"</code>. After a <i>full</i> write the producer stops and waits for drain.</li>
<li>Each tick t = 1, 2, … the sink finishes the oldest buffered chunk. If the buffer becomes empty and a drain is pending, log <code>"drain t=T"</code> and the producer resumes writing in the same tick.</li>
<li>When everything is flushed, log <code>"finish t=T peak=P"</code> where P is the largest buffered byte count ever reached.</li></ul>`,
        constraints: `<p>1 ≤ hwm ≤ 10<sup>9</sup>, 0 ≤ chunks.length ≤ 10<sup>5</sup>, 1 ≤ chunk ≤ 10<sup>6</sup>.</p>`,
        example: `<p><code>hwm=10, chunks=[4,4,4,4]</code> → write 0 ok buf=4, write 1 ok buf=8, ${H.c('r', 'write 2 full buf=12')}, ${H.c('g', 'drain t=3')}, write 3 ok buf=4, ${H.c('b', 'finish t=4 peak=12')}.</p>`,
        brute: { why: `<p>Ignoring backpressure writes everything at t=0: correct output bytes, but the peak buffer equals the total data size — exactly the memory blow-up streams exist to prevent.</p>`, code: R`function pipeNoBackpressure(hwm, chunks) {
  let buffered = 0;
  const log = chunks.map((c, i) => { buffered += c; return 'write ' + i + ' ignored-return buf=' + buffered; });
  log.push('finish t=' + chunks.length + ' peak=' + buffered);   // peak = everything
  return log;
}` },
        mcq: { q: 'When does Node emit <code>\'drain\'</code>?', options: ['After every write', 'When the buffer drops below highWaterMark at any time', 'When the buffer has emptied after a write() had returned false', 'Only at end()'], answer: 2, explain: 'drain is only owed to a producer that was told to stop (needDrain), and fires once the buffered data is flushed.' },
        hints: [
          `<p>Hint 1: State = FIFO of buffered chunk sizes, a running byte count, the next chunk index, and a needDrain flag.</p>`,
          `<p>Hint 2: Write a <code>pump()</code> that writes until a write returns false (set needDrain) or chunks run out. Call it at t=0 and right after each drain.</p>`,
          `<p>Hint 3: Loop ticks while the buffer is non-empty: pop the head, subtract, and check "empty and needDrain". Track the peak right after each write.</p>`
        ],
        tests: { sig: 'int int[] -> string[]', fn: 'pipeModel', cases: [
          [[10, [4, 4, 4, 4]], ['write 0 ok buf=4', 'write 1 ok buf=8', 'write 2 full buf=12', 'drain t=3', 'write 3 ok buf=4', 'finish t=4 peak=12']],
          [[5, []], ['finish t=0 peak=0']],
          [[1, [1, 1]], ['write 0 full buf=1', 'drain t=1', 'write 1 full buf=1', 'drain t=2', 'finish t=2 peak=1']],
          [[100, [10, 20, 30]], ['write 0 ok buf=10', 'write 1 ok buf=30', 'write 2 ok buf=60', 'finish t=3 peak=60']],
          [[6, [10, 1, 1]], ['write 0 full buf=10', 'drain t=1', 'write 1 ok buf=1', 'write 2 ok buf=2', 'finish t=3 peak=10']],
          [[3, [1, 1, 1, 1, 1]], ['write 0 ok buf=1', 'write 1 ok buf=2', 'write 2 full buf=3', 'drain t=3', 'write 3 ok buf=1', 'write 4 ok buf=2', 'finish t=5 peak=3']]
        ] },
        solution: {
          approach: `<p>Direct simulation of the Writable contract: accept the chunk, return <code>buffered &lt; hwm</code>, remember that a drain is owed, and emit it when the buffer empties. Use an index into the buffered array instead of <code>shift()</code> for 10<sup>5</sup> chunks.</p>`,
          code: { lang: 'js', run: true, code: R`function pipeModel(hwm, chunks) {
  const log = [], buf = [];
  let head = 0, buffered = 0, next = 0, peak = 0, t = 0, needDrain = false;

  function pump() {                                 // producer: write until told to stop
    while (next < chunks.length) {
      const size = chunks[next];
      buf.push(size); buffered += size; peak = Math.max(peak, buffered);
      const ok = buffered < hwm;                    // write()'s return value
      log.push('write ' + next + (ok ? ' ok' : ' full') + ' buf=' + buffered);
      next++;
      if (!ok) { needDrain = true; return; }        // wait for 'drain'
    }
  }

  pump();
  while (head < buf.length) {                       // sink flushes one chunk per tick
    t++;
    buffered -= buf[head++];
    if (buffered === 0 && needDrain) {
      needDrain = false;
      log.push('drain t=' + t);
      pump();
    }
  }
  log.push('finish t=' + t + ' peak=' + peak);
  return log;
}
console.log(pipeModel(10, [4, 4, 4, 4]).join('\n'));` },
          dry: { head: ['t', 'action', 'buffered', 'needDrain'], rows: [
            ['0', 'write 0, 1 ok; write 2 full', '12', 'true'],
            ['1', 'flush 4', '8', 'true'], ['2', 'flush 4', '4', 'true'],
            ['3', 'flush 4 → empty → drain, write 3 ok', '4', 'false'],
            ['4', 'flush 4 → finish', '0', 'false']
          ] },
          complexity: `<p>O(n) time (each chunk written and flushed once), O(n) memory for the log.</p>`,
          followUps: ['Model a Readable source with its own highWaterMark feeding this writable (pipe).', 'What happens to peak memory if a single chunk is bigger than hwm?']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 5 — EventEmitter
     ====================================================================== */
  var EMITTER_HARNESS = R`
function chk(cmds) {
  var em = new EventEmitter(), log = [], fns = {};
  function fnFor(name) {
    if (!fns[name]) fns[name] = function () { var a = [].slice.call(arguments).map(String); log.push(name + ':' + em.__cur + ':' + a.join(',')); };
    return fns[name];
  }
  cmds.forEach(function (c) {
    var p = c.split(' '), ev = p[1];
    try {
      if (p[0] === 'on' || p[0] === 'once') {
        var f = fnFor(p[2]);
        em[p[0]](ev, f);
      } else if (p[0] === 'off') em.off(ev, fnFor(p[2]));
      else if (p[0] === 'onadd') {
        var adder = fns[p[2]] = fns[p[2]] || function () { log.push(p[2] + ':' + ev + ':'); em.on(ev, fnFor(p[3])); };
        em.on(ev, adder);
      } else if (p[0] === 'emit') {
        em.__cur = ev;
        var r = em.emit.apply(em, [ev].concat(p.slice(2)));
        log.push('emit ' + ev + ' -> ' + r);
      } else if (p[0] === 'emiterr') {
        em.__cur = 'error';
        var r2 = em.emit('error', new Error(p.slice(1).join(' ')));
        log.push('emit error -> ' + r2);
      } else if (p[0] === 'count') log.push('count ' + ev + ' = ' + em.listenerCount(ev));
    } catch (e) { log.push('threw ' + e.message); }
  });
  return log;
}`;

  topics.push({
    title: 'EventEmitter: Synchronous Events, once/off, the error Event and Listener Leaks',
    analogy: `<p>An <b>EventEmitter</b> is a <b>group chat admin</b>. People subscribe to topics ("deploys", "errors"). When the admin posts to a topic, she reads the message out to every subscriber <b>one after another, right now</b>, in the order they joined — she does not wait until later. A <code>once</code> subscriber leaves the group right before hearing their first message. And there is one strict rule: if someone posts to the <b>"error"</b> topic and <i>nobody</i> is subscribed, the admin pulls the fire alarm (throws) instead of letting the problem go unnoticed.</p>`,
    explain: `<p><code>EventEmitter</code> (<code>node:events</code>) is the backbone of Node's API: streams, servers, sockets, child processes and <code>process</code> itself are emitters.</p>
<ul>
<li><code>on(name, fn)</code> / <code>addListener</code> appends a listener; <code>prependListener</code> puts it first. The same function can be added twice and will run twice.</li>
<li><code>once(name, fn)</code> wraps fn so it removes itself <b>before</b> running.</li>
<li><code>off(name, fn)</code> / <code>removeListener</code> removes <b>one</b> instance — the most recently added one if fn was added several times. Passing the original of a once-wrapper works too.</li>
<li><code>emit(name, ...args)</code> calls the listeners <b>synchronously</b>, in registration order, with <code>this</code> = the emitter (for normal functions), and returns <code>true</code> if there were listeners. It iterates over a <b>copy</b> of the list, so listeners added or removed during an emit do not affect that emit.</li>
</ul>
${H.table(['Gotcha', 'What happens'], [
  ['<code>emit(\'error\', err)</code> with no \'error\' listener', 'throws err (or <code>ERR_UNHANDLED_ERROR</code> for a non-Error) — usually crashing the process'],
  ['listener throws during emit', 'the exception propagates out of <code>emit()</code>; later listeners do not run'],
  ['> 10 listeners for one event', '<code>MaxListenersExceededWarning</code> (a leak hint, not an error); tune with <code>setMaxListeners</code>'],
  ['async listener rejects', 'unhandled rejection unless <code>captureRejections: true</code> routes it to \'error\''],
  ['emit inside the constructor', 'nobody listens yet — defer with <code>process.nextTick</code>']
])}
<p>Because emit is synchronous, an emitter is <b>not a queue</b> and adds no concurrency: a slow listener blocks the emitter and the event loop. For async consumption use <code>events.once(emitter, name)</code> (returns a promise; rejects if <code>'error'</code> fires first) or <code>events.on(emitter, name)</code> (async iterator). Since Node 15 there is also the web-standard <code>EventTarget</code>, used by <code>AbortSignal</code>; it does not have the special error rule.</p>`,
    clues: [
      '"Is emit synchronous?" → yes: listeners run in order on the same stack before emit returns',
      '"Process crashed with Unhandled \'error\' event" → emitter emitted error with no error listener',
      '"MaxListenersExceededWarning" → probably adding a listener per request without removing it',
      '"Wait for an event with await" → events.once(emitter, name) (rejects on error)',
      '"Implement an EventEmitter" → Map&lt;event, fn[]&gt;, once-wrapper with .listener, snapshot on emit, error rule',
      '"Remove a listener added with once" → off(original) must match wrapper.listener'
    ],
    code: [
      { lang: 'js', run: true, title: 'Core semantics in real Node (runnable)', code: R`const { EventEmitter, once } = require('node:events');
const bus = new EventEmitter();

bus.on('order', (id) => console.log('1st listener', id));
bus.prependListener('order', (id) => console.log('prepended runs first', id));
bus.once('order', (id) => console.log('once-only', id));

console.log('before emit');
console.log('had listeners:', bus.emit('order', 42));   // synchronous: all listeners ran already
bus.emit('order', 43);                                   // once-only is gone
console.log('count:', bus.listenerCount('order'));

try { bus.emit('error', new Error('db down')); }        // no 'error' listener -> throws
catch (e) { console.log('emit threw:', e.message); }

(async () => {
  setTimeout(() => bus.emit('ready', 'v1'), 5);
  const [value] = await once(bus, 'ready');              // promise helper
  console.log('awaited ready:', value);
})();` },
      { lang: 'js', title: 'Listener leak and the fix (syntax-checked)', code: R`const { EventEmitter } = require('node:events');
const db = new EventEmitter();

// LEAK: every request adds a listener that is never removed.
function handleBad(req, res) {
  db.on('reconnect', () => res.write('db is back'));     // after 11 requests: MaxListenersExceededWarning
}

// FIX: remove it when the request ends (or use AbortSignal / once).
function handleGood(req, res) {
  const onReconnect = () => res.write('db is back');
  db.on('reconnect', onReconnect);
  res.on('close', () => db.off('reconnect', onReconnect));
}` }
    ],
    codeTitle: ['Semantics', 'Leak fix'],
    viz: [
      {
        title: 'emit() is synchronous and works on a snapshot',
        gen: function () {
          var code = "const em = new EventEmitter();\nem.on('job', A);\nem.once('job', B);\nem.on('job', C); // C adds D during emit\nconsole.log('before');\nem.emit('job', 7);\nconsole.log('after');\nem.emit('job', 8);";
          var S = [
            [4, ['A', 'B(once)', 'C'], [], [], 'Three listeners registered in order. Nothing has run yet.'],
            [5, ['A', 'B(once)', 'C'], [], ['before'], 'Synchronous log: <b>before</b>.'],
            [6, ['A', 'B(once)', 'C'], ['A', 'B(once)', 'C'], ['before', 'A 7'], 'emit(\'job\', 7) copies the listener array (snapshot) and calls <b>A</b> right now, on the same call stack.'],
            [6, ['A', 'C'], ['A', 'B(once)', 'C'], ['before', 'A 7', 'B 7'], 'B is a once-wrapper: it <b>removes itself first</b>, then calls B. The live list shrinks, but the snapshot is unaffected.'],
            [6, ['A', 'C', 'D'], ['A', 'B(once)', 'C'], ['before', 'A 7', 'B 7', 'C 7'], 'C runs and adds D to the live list. D is <b>not</b> in the snapshot, so it does not run in this emit.'],
            [7, ['A', 'C', 'D'], [], ['before', 'A 7', 'B 7', 'C 7', 'after'], 'emit returned true; only now does <b>after</b> print. Events are not queued for later.'],
            [8, ['A', 'C', 'D', 'D'], ['A', 'C', 'D'], ['before', 'A 7', 'B 7', 'C 7', 'after', 'A 8', 'C 8', 'D 8'], 'Second emit: A, C (adds another D), D. B is gone forever. Adding a listener on every emit is how listener leaks start.']
          ];
          return S.map(function (s) {
            return { narr: s[4], parts: [
              { type: 'code', label: 'Program', lang: 'js', code: code, hl: one(s[0], 'cur') },
              { type: 'array', label: 'Live listeners for "job"', values: s[1] },
              { type: 'array', label: 'Snapshot being called', values: s[2] },
              { type: 'array', label: 'Output', values: s[3], hl: one(s[3].length - 1, 'ok') }
            ] };
          });
        }
      },
      {
        title: 'The special "error" event',
        gen: function () {
          var S = [
            ['emit(\'data\') with no listeners → returns <b>false</b>. Nothing else happens.', 'ok'],
            ['emit(\'error\', err) <b>with</b> an error listener → the listener handles it like any event.', 'ok'],
            ['emit(\'error\', err) with <b>no</b> error listener → Node throws err from emit(). In a callback this becomes an uncaught exception and the process exits.', 'bad'],
            ['emit(\'error\', \'oops\') (not an Error) with no listener → throws ERR_UNHANDLED_ERROR: "Unhandled error. (\'oops\')".', 'bad'],
            ['events.errorMonitor listeners see the error first without counting as a handler — good for metrics, it still throws if nobody handles it.', 'cur'],
            ['Rule: every long-lived emitter (sockets, streams, child processes) needs an \'error\' listener, or use pipeline / events.once, which wire errors for you.', 'sel']
          ];
          var rows = [];
          return S.map(function (s, i) { rows.push([String(i + 1), s[0]]); return { narr: s[0], parts: [{ type: 'table', label: 'error-event rules', columns: ['#', 'case'], rows: rows.slice(), hl: one(i, s[1]) }] }; });
        }
      }
    ],
    examples: [
      { title: 'A listener that throws stops the rest', html: `<p>Listeners run in a plain loop. If listener 1 throws, listener 2 never runs, and the exception surfaces at the <code>emit()</code> call site — often deep inside a library, far from your code. Wrap risky listener bodies or emit errors instead of throwing.</p>`, code: { lang: 'js', run: true, code: R`const { EventEmitter } = require('node:events');
const em = new EventEmitter();
em.on('x', () => { throw new Error('listener 1 broke'); });
em.on('x', () => console.log('listener 2 never runs'));
try { em.emit('x'); } catch (e) { console.log('caught at emit():', e.message); }` } },
      { title: 'off() removes the most recent duplicate', html: `<p>Add <code>f</code>, then <code>g</code>, then <code>f</code> again. <code>off('e', f)</code> removes the <b>last</b> f, leaving [f, g]. Node scans the array from the end.</p>`, code: { lang: 'js', run: true, code: R`const { EventEmitter } = require('node:events');
const em = new EventEmitter(), out = [];
const f = () => out.push('f'), g = () => out.push('g');
em.on('e', f); em.on('e', g); em.on('e', f);
em.off('e', f);
em.emit('e');
console.log(out.join(' '));   // f g` } },
      { title: 'async listeners and captureRejections', html: `<p><code>em.on('job', async () =&gt; { throw err })</code> creates a rejected promise that the emitter ignores → unhandled rejection → crash (Node 15+). With <code>new EventEmitter({ captureRejections: true })</code>, Node attaches a handler and re-emits the rejection as <code>'error'</code>.</p>` },
      { title: 'Timeout an event wait with AbortSignal', html: `<p><code>await once(socket, 'connect', { signal: AbortSignal.timeout(2000) })</code> rejects with an AbortError after 2 s and removes its listeners — no leaked listener, no hanging promise.</p>` }
    ],
    deepDive: `<p><b>Implementation details.</b> Node stores listeners in <code>this._events</code>, an object with a null prototype. A single listener is stored <i>directly</i> as a function (no array) — an optimisation for the common one-listener case; a second listener turns it into an array. <code>emit</code> fast-paths 0–3 arguments and uses <code>arrayClone</code> for the snapshot. <code>once</code> creates a wrapper with <code>wrapper.listener = fn</code>; <code>rawListeners()</code> returns wrappers, <code>listeners()</code> returns originals.</p>
<p><b>'newListener' / 'removeListener'</b> meta-events fire when listeners change ('newListener' before adding, so a listener added inside it goes first). Streams use 'newListener' to switch to flowing mode when you attach 'data'.</p>
<p><b>Max listeners.</b> Default 10 per event (<code>events.defaultMaxListeners</code>), checked on add; the warning lists emitter type and event name. Setting it to <code>Infinity</code>/<code>0</code> hides real leaks — prefer fixing the lifecycle.</p>
<p><b>EventTarget vs EventEmitter.</b> <code>EventTarget</code> dispatches <code>Event</code> objects, de-duplicates the same listener, supports <code>{ once, signal }</code> options, and reports listener exceptions as uncaught exceptions on next tick instead of throwing at the dispatch site.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated "custom event bus" code usually forgets the error-event rule, iterates the live array (so once-listeners skip neighbours), and never removes listeners in request scope. AI explanations sometimes call emit asynchronous because "events are async in JavaScript".</p>
<p><b>Use AI well:</b> have it write tests for the edge cases (self-removal during emit, duplicate listeners, error with no listener, throwing listener) before writing the emitter. For leak warnings, paste the warning and the code that registers listeners and ask where the matching <code>off</code> should go.</p>
<p><b>What you must still own:</b> knowing that emit is synchronous, the error rule, and the lifecycle discipline (every <code>on</code> in a short-lived scope needs an <code>off</code> or an AbortSignal).</p>`,
    problems: [
      {
        title: 'Tiny EventEmitter with once/off/error semantics',
        level: 'Medium', tags: ['node', 'events', 'design', 'class'], companies: ['Microsoft', 'Slack', 'Razorpay'],
        statement: `<p>Implement <code>class EventEmitter</code> with:</p>
<ul><li><code>on(event, fn)</code> and <code>once(event, fn)</code> (both return <code>this</code>);</li>
<li><code>off(event, fn)</code>: remove the <b>most recently added</b> listener equal to fn (or whose once-wrapper wraps fn);</li>
<li><code>emit(event, ...args)</code>: call listeners synchronously in order on a <b>snapshot</b>, with <code>this</code> bound to the emitter, and return whether there were listeners. If <code>event === 'error'</code> and there are no listeners, throw: the argument itself if it is an <code>Error</code>, otherwise <code>new Error('Unhandled error. (' + arg + ')')</code>;</li>
<li><code>listenerCount(event)</code>.</li></ul>`,
        constraints: `<p>Up to 10<sup>4</sup> operations. A once-listener runs at most once even if it re-emits the same event.</p>`,
        example: `<p><code>on a L1; on a L2; on a L1; off a L1; emit a z</code> → ${H.c('g', 'L1 L2')} run (the <i>last</i> L1 was removed), emit returns ${H.c('b', 'true')}.</p>`,
        brute: { why: `<p>An emitter that iterates the live array and has no error rule: a once-listener that removes itself shifts the array and skips the next listener, and errors emitted with no handler vanish silently.</p>`, code: R`class NaiveEmitter {
  constructor() { this.l = {}; }
  on(e, f) { (this.l[e] = this.l[e] || []).push(f); return this; }
  emit(e, ...a) { const arr = this.l[e] || []; for (let i = 0; i < arr.length; i++) arr[i](...a); return arr.length > 0; }
}` },
        mcq: { q: 'A once-listener is first of three. Without a snapshot, what goes wrong when it removes itself during emit?', options: ['Nothing', 'The index shifts and the second listener is skipped', 'All listeners run twice', 'emit throws'], answer: 1, explain: 'splice moves listener 2 into index 0 while the loop moves on to index 1.' },
        hints: [
          `<p>Hint 1: <code>Map&lt;string, Function[]&gt;</code>. once = a wrapper that calls <code>off</code> on itself first, then fn; store <code>wrapper.listener = fn</code>.</p>`,
          `<p>Hint 2: off scans from the END for <code>l === fn || l.listener === fn</code> and splices one element.</p>`,
          `<p>Hint 3: emit: if no listeners and event is 'error', throw. Otherwise <code>for (const l of list.slice()) l.apply(this, args)</code> and return true.</p>`
        ],
        tests: { sig: 'string[] -> string[]', fn: 'chk', harness: { js: EMITTER_HARNESS }, cases: [
          [[['on a L1', 'on a L2', 'emit a 1 2', 'count a']], ['L1:a:1,2', 'L2:a:1,2', 'emit a -> true', 'count a = 2']],
          [[['once a L1', 'emit a x', 'emit a y', 'count a']], ['L1:a:x', 'emit a -> true', 'emit a -> false', 'count a = 0']],
          [[['on a L1', 'on a L1', 'off a L1', 'count a', 'emit a']], ['count a = 1', 'L1:a:', 'emit a -> true']],
          [[['once a L1', 'off a L1', 'emit a']], ['emit a -> false']],
          [[['emit error boom']], ['threw Unhandled error. (boom)']],
          [[['emiterr disk full']], ['threw disk full']],
          [[['on error H', 'emiterr bad', 'count error']], ['H:error:Error: bad', 'emit error -> true', 'count error = 1']],
          [[['onadd a L M', 'emit a', 'emit a', 'count a']], ['L:a:', 'emit a -> true', 'L:a:', 'M:a:', 'emit a -> true', 'count a = 3']],
          [[['emit nothing', 'count nothing']], ['emit nothing -> false', 'count nothing = 0']],
          [[['on a L1', 'on a L2', 'on a L1', 'off a L1', 'emit a z']], ['L1:a:z', 'L2:a:z', 'emit a -> true']]
        ] },
        solution: {
          approach: `<p>A Map from event name to an array of listeners. <code>once</code> uses a self-removing wrapper that remembers the original. <code>off</code> searches backwards so duplicates are removed newest-first, like Node. <code>emit</code> enforces the error rule, then calls a copy of the array with <code>this</code> set to the emitter.</p>`,
          code: { lang: 'js', run: true, code: R`class EventEmitter {
  constructor() { this.events = new Map(); }

  on(event, fn) {
    if (!this.events.has(event)) this.events.set(event, []);
    this.events.get(event).push(fn);
    return this;
  }

  once(event, fn) {
    const wrapper = (...args) => {
      this.off(event, wrapper);          // remove BEFORE calling: re-emits cannot re-run it
      return fn.apply(this, args);
    };
    wrapper.listener = fn;               // lets off(event, fn) find the wrapper
    return this.on(event, wrapper);
  }

  off(event, fn) {
    const list = this.events.get(event);
    if (!list) return this;
    for (let i = list.length - 1; i >= 0; i--) {          // newest first, like Node
      if (list[i] === fn || list[i].listener === fn) { list.splice(i, 1); break; }
    }
    if (list.length === 0) this.events.delete(event);
    return this;
  }

  emit(event, ...args) {
    const list = this.events.get(event);
    if (!list || list.length === 0) {
      if (event === 'error') {
        const err = args[0];
        throw err instanceof Error ? err : new Error('Unhandled error. (' + err + ')');
      }
      return false;
    }
    for (const fn of list.slice()) fn.apply(this, args);   // snapshot
    return true;
  }

  listenerCount(event) { return (this.events.get(event) || []).length; }
}

const em = new EventEmitter();
em.once('ready', (v) => console.log('ready', v));
console.log(em.emit('ready', 1), em.emit('ready', 2));   // ready 1, then: true false
try { em.emit('error', new Error('boom')); } catch (e) { console.log('threw', e.message); }` },
          dry: { head: ['op', 'listeners for a', 'output'], rows: [
            ['on a L1', '[L1]', '—'], ['on a L2', '[L1, L2]', '—'], ['on a L1', '[L1, L2, L1]', '—'],
            ['off a L1 (scan from end)', '[L1, L2]', '—'], ['emit a z', 'snapshot [L1, L2]', 'L1:a:z, L2:a:z → true']
          ] },
          complexity: `<p>on O(1) amortised; off and emit O(k) for k listeners of that event.</p>`,
          followUps: ['Add prependListener and a max-listeners warning.', 'Implement events.once(emitter, name) returning a promise that rejects on error.']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 6 — worker_threads, cluster, child_process
     ====================================================================== */
  topics.push({
    title: 'Using More Cores: worker_threads, cluster and child_process',
    analogy: `<p>Your one-clerk post office is overloaded. Three ways to grow: <b>worker_threads</b> = hire assistants who sit in the <i>same building</i>, each with their own desk and notepad (own V8 isolate and event loop); they pass notes through a mail slot (<code>postMessage</code>) and can share one whiteboard (<code>SharedArrayBuffer</code>). <b>cluster</b> = open identical branch offices next door (separate processes) with one receptionist sending each customer to the next branch (round-robin). <b>child_process</b> = phone an outside contractor (any program: <code>ffmpeg</code>, <code>git</code>, Python) and read what they say back.</p>`,
    explain: `${H.table(['', 'worker_threads', 'cluster', 'child_process'], [
  ['Unit', 'thread in the same process', 'process (a forked copy of your app)', 'any process (any language)'],
  ['Memory', 'separate JS heaps; can share <code>SharedArrayBuffer</code>', 'fully separate', 'fully separate'],
  ['Talk via', '<code>postMessage</code> (structured clone, transfer list), MessageChannel', 'IPC messages; they share the listening port', 'stdio streams, or IPC with <code>fork()</code>'],
  ['Best for', 'CPU-heavy JS (image resize, parsing, crypto, ML inference)', 'scaling an HTTP server across cores', 'running other programs / isolation'],
  ['Crash impact', 'error event in parent; process survives', 'one worker dies, primary can fork another', 'exit code / signal to parent']
])}
<p><b>worker_threads.</b> <code>new Worker(file, { workerData })</code> starts a thread with its own isolate, heap, event loop and nextTick/microtask queues (the libuv <i>thread pool</i> is shared process-wide). Messages are copied with the <b>structured clone</b> algorithm (handles Map, Set, Date, typed arrays, cycles; not functions or class prototypes). Large binary data can be <b>transferred</b> instead: <code>postMessage(buf, [buf.buffer])</code> moves the ArrayBuffer — zero copy — and the sender's copy becomes <b>detached</b> (byteLength 0). <code>SharedArrayBuffer</code> + <code>Atomics</code> give true shared memory. Starting a worker costs a few ms and several MB, so use a <b>pool</b> (e.g. <code>piscina</code>) rather than one worker per request.</p>
<p><b>cluster.</b> The primary process forks N workers (<code>cluster.fork()</code>, typically one per core from <code>os.availableParallelism()</code>). Workers call <code>server.listen(3000)</code>; the primary owns the socket and hands accepted connections out <b>round-robin</b> (the default everywhere except Windows). No shared memory: sessions and caches must live in Redis or similar. In containers, people often run one Node process per container and let Kubernetes scale instead.</p>
<p><b>child_process.</b> <code>spawn</code> streams stdout/stderr (use for big output); <code>exec</code> runs a <b>shell</b> command and buffers output (<code>maxBuffer</code> limit, shell-injection risk with user input); <code>execFile</code> runs a binary without a shell; <code>fork</code> spawns a new Node process with an IPC channel (<code>process.send</code>). Sync variants block the event loop.</p>`,
    clues: [
      '"CPU-heavy work blocks my API" → move it to worker_threads (a pool), not cluster, not async/await',
      '"Use all 8 cores for an HTTP server" → cluster / several processes behind a load balancer, or one process per container',
      '"Share data between workers" → postMessage (clone/transfer) or SharedArrayBuffer + Atomics; cluster shares nothing',
      '"Zero-copy hand-off of a large buffer" → transfer list; sender\'s ArrayBuffer is detached',
      '"Run ffmpeg / a shell command" → spawn (streams) or execFile; avoid exec with user input',
      '"Do workers share the event loop?" → no, each worker has its own loop; they share only the libuv thread pool'
    ],
    code: [
      { lang: 'js', title: 'A worker in one file with transfer (syntax-checked, Node only)', code: R`const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');

if (isMainThread) {
  const pixels = new Uint8Array(50_000_000);                 // 50 MB
  const worker = new Worker(__filename, { workerData: { factor: 2 } });
  worker.on('message', (result) => {
    console.log('main got', result.byteLength, 'bytes back');
    worker.terminate();
  });
  worker.on('error', (err) => console.error('worker crashed:', err));
  worker.postMessage(pixels, [pixels.buffer]);               // TRANSFER: zero copy
  console.log('main after transfer:', pixels.byteLength);   // 0 (detached)
} else {
  parentPort.on('message', (px) => {
    for (let i = 0; i < px.length; i++) px[i] = Math.min(255, px[i] * workerData.factor); // CPU work off the main loop
    parentPort.postMessage(px, [px.buffer]);                 // transfer back
  });
}` },
      { lang: 'js', title: 'cluster: one HTTP worker per core with auto-restart (syntax-checked)', code: R`const cluster = require('node:cluster');
const http = require('node:http');
const os = require('node:os');

if (cluster.isPrimary) {
  for (let i = 0; i < os.availableParallelism(); i++) cluster.fork();
  cluster.on('exit', (worker, code, signal) => {
    console.log('worker', worker.process.pid, 'died', code || signal, '- forking a new one');
    cluster.fork();
  });
} else {
  http.createServer((req, res) => res.end('handled by ' + process.pid)).listen(3000);
}` },
      { lang: 'js', title: 'child_process: spawn vs execFile (syntax-checked)', code: R`const { spawn, execFile } = require('node:child_process');

// spawn: stream a long-running command's output
const ff = spawn('ffmpeg', ['-i', 'in.mp4', '-f', 'mp3', 'pipe:1']);
ff.stdout.pipe(require('node:fs').createWriteStream('out.mp3'));
ff.on('close', (code) => console.log('ffmpeg exited', code));

// execFile: no shell, arguments passed safely, output buffered
execFile('git', ['rev-parse', 'HEAD'], (err, stdout) => {
  if (err) throw err;
  console.log('commit', stdout.trim());
});` }
    ],
    codeTitle: ['worker_threads', 'cluster', 'child_process'],
    viz: [
      {
        title: 'Clone vs transfer between threads',
        gen: function () {
          var S = [
            ['Main allocates a 64 MB ArrayBuffer A.', [['main', 'A (64 MB)']], [], 'ok'],
            ['<b>Clone</b>: postMessage(A). Structured clone copies all 64 MB into the worker\'s heap — both sides now own separate copies (cost: time + 2× memory).', [['main', 'A (64 MB)']], [['worker', "A' (64 MB copy)"]], 'cur'],
            ['<b>Transfer</b>: postMessage(B, [B]). Only the pointer to the backing store moves — O(1). Main\'s B becomes <b>detached</b>: byteLength 0, reads give undefined.', [['main', 'A (64 MB)'], ['main', 'B (detached, 0 B)']], [['worker', "A' (64 MB copy)"], ['worker', 'B (64 MB)']], 'ok'],
            ['Main tries postMessage(B, [B]) again → <b>DataCloneError</b>: you cannot transfer what you no longer own.', [['main', 'B (detached)']], [['worker', 'B (64 MB)']], 'bad'],
            ['<b>SharedArrayBuffer</b> S: both sides see the same memory. Coordinate with Atomics.add / Atomics.wait / Atomics.notify to avoid races.', [['main', 'S (shared)']], [['worker', 'S (shared)']], 'sel']
          ];
          return S.map(function (s) {
            return { narr: s[0], parts: [
              { type: 'map', label: 'Main thread owns', entries: s[1].map(function (e) { return [e[1], e[0]]; }) },
              { type: 'map', label: 'Worker owns', entries: s[2].map(function (e) { return [e[1], e[0]]; }) },
              { type: 'text', label: 'Rule', html: s[3] === 'bad' ? '<span class="c-r">Detached buffers cannot be posted.</span>' : s[3] === 'sel' ? '<span class="c-p">Shared memory needs Atomics.</span>' : '<span class="c-g">Ownership is always clear.</span>' }
            ] };
          });
        }
      },
      {
        title: 'cluster: the primary hands out connections round-robin',
        gen: function () {
          var nodes = [
            { id: 'C', label: 'clients', x: 8, y: 30, shape: 'box' },
            { id: 'P', label: 'primary :3000', x: 38, y: 30, shape: 'box' },
            { id: 'W1', label: 'worker 1', x: 78, y: 8, shape: 'box' },
            { id: 'W2', label: 'worker 2', x: 78, y: 30, shape: 'box' },
            { id: 'W3', label: 'worker 3', x: 78, y: 52, shape: 'box' }
          ];
          var E = [['C', 'P'], ['P', 'W1'], ['P', 'W2'], ['P', 'W3']];
          var S = [
            ['The primary owns the listening socket. Workers called listen(3000), which actually registers with the primary.', {}, {}],
            ['Connection 1 → worker 1.', { W1: 'ok' }, { 'C-P': 'cur', 'P-W1': 'ok' }],
            ['Connection 2 → worker 2.', { W2: 'ok' }, { 'C-P': 'cur', 'P-W2': 'ok' }],
            ['Connection 3 → worker 3.', { W3: 'ok' }, { 'C-P': 'cur', 'P-W3': 'ok' }],
            ['Worker 2 crashes (uncaught exception). Its in-flight requests fail; others are fine.', { W2: 'bad' }, {}],
            ['Connection 4 → worker 1 (worker 2 skipped). The primary\'s exit handler forks a replacement.', { W1: 'ok', W2: 'done' }, { 'P-W1': 'ok' }],
            ['Each worker has its own memory: an in-process session cache is NOT shared. Use Redis or sticky sessions.', { W1: 'sel', W2: 'sel', W3: 'sel' }, {}]
          ];
          return S.map(function (s) { return { narr: s[0], parts: [{ type: 'graph', label: 'cluster', directed: true, height: 60, nodes: nodes, edges: E, hl: s[1], ehl: s[2] }] }; });
        }
      }
    ],
    examples: [
      { title: 'async does not make CPU work parallel', html: `<p>Wrapping a 2-second JSON parse or image resize in an <code>async</code> function changes nothing: it still runs on the main thread and blocks every request for 2 s. Only another thread or process runs JS in parallel. Rule of thumb: I/O-bound → stay on the loop; CPU-bound and &gt; ~10–50 ms → worker pool.</p>` },
      { title: 'Structured clone limits', html: `<p>Posting <code>{ when: new Date(), tags: new Set(['a']) }</code> works (Date and Set survive). Posting a class instance arrives as a plain object (prototype lost). Posting a function throws <code>DataCloneError</code>. <code>structuredClone()</code> is the same algorithm, available globally — try it on the main thread.</p>`, code: { lang: 'js', run: true, code: R`class User { constructor(n) { this.name = n; } hi() { return 'hi ' + this.name; } }
const copy = structuredClone({ when: new Date(0), tags: new Set(['a']), user: new User('Ann') });
console.log(copy.when instanceof Date, copy.tags.has('a'), copy.user instanceof User, typeof copy.user.hi);
try { structuredClone({ f() {} }); } catch (e) { console.log(e.name); }   // DataCloneError` } },
      { title: 'exec and shell injection', html: `<p><code>exec('convert ' + userFile + ' out.png')</code> with <code>userFile = "a.png; rm -rf ~"</code> runs the second command. <code>execFile('convert', [userFile, 'out.png'])</code> passes it as one argument — no shell parses it. Also, <code>exec</code> buffers all output and kills the child past <code>maxBuffer</code> (1 MiB default).</p>` },
      { title: 'Shared counter with Atomics', html: `<p>Two workers increment a plain shared <code>Int32Array</code> 1 million times each: the total is less than 2 million (lost updates). <code>Atomics.add(view, 0, 1)</code> makes each increment indivisible, and the total is exactly 2 million.</p>` }
    ],
    deepDive: `<p><b>What a worker really is.</b> Each Worker = an OS thread running a new V8 <i>isolate</i> with its own heap and GC, a new Node environment (its own <code>process.env</code> copy, its own module cache) and its own libuv loop. <code>resourceLimits</code> (<code>maxOldGenerationSizeMb</code> etc.) cap its heap. <code>worker.terminate()</code> stops JS at the next safe point. Workers cannot touch the parent's objects; native addons must be context-aware to load in workers.</p>
<p><b>MessagePort semantics.</b> Messages are delivered as tasks on the receiving loop in FIFO order. <code>MessageChannel</code> creates a pair of ports you can transfer to another worker for direct worker-to-worker communication. <code>receiveMessageOnPort</code> reads synchronously; combined with <code>Atomics.wait</code> it allows synchronous calls into a worker (used by some loaders and test runners).</p>
<p><b>cluster scheduling.</b> <code>cluster.schedulingPolicy</code> is <code>SCHED_RR</code> by default (primary accepts and passes handles); <code>SCHED_NONE</code> lets workers <code>accept()</code> directly on the shared socket, where the OS often favours a few busy processes. Graceful restart: <code>worker.disconnect()</code> stops new connections, waits for open ones, then exits.</p>
<p><b>When not to use them.</b> If the bottleneck is a database, more threads only add contention. Many teams prefer horizontal scaling (one process per container, orchestrator restarts) over cluster, and dedicated job queues (BullMQ, SQS consumers) over in-process worker pools for long jobs.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI tools happily suggest "make it async" for CPU-bound work, or spawn a new Worker per request (slow and memory-hungry). Generated cluster code often keeps in-memory sessions that silently break across workers, and child_process snippets use <code>exec</code> with string concatenation.</p>
<p><b>Use AI well:</b> describe the workload (CPU ms per request, payload size) and ask it to choose between worker pool, cluster and horizontal scaling with numbers. Ask it to write a piscina-based pool with transfer lists and a benchmark. Review for shell injection and missing error/exit handlers.</p>
<p><b>What you must still own:</b> the isolation model (what is shared, what is copied, what is transferred), the cost of starting workers, and how the choice interacts with your deployment (containers, CPU limits).</p>`,
    problems: [
      {
        title: 'Simulate postMessage clone vs transfer ownership',
        level: 'Medium', tags: ['node', 'worker_threads', 'structured clone', 'transfer'], companies: ['Figma', 'Adobe', 'Canva'],
        statement: `<p>Simulate ArrayBuffer ownership between threads. Process commands and return the log:</p>
<ul><li><code>alloc OWNER BUF SIZE</code> → OWNER now owns BUF of SIZE bytes; log <code>"OWNER BUF SIZE"</code>.</li>
<li><code>post FROM TO BUF clone|transfer</code> → if FROM does not currently own BUF (never had it, or it was transferred away = detached), log <code>"DataCloneError BUF"</code>. <i>transfer</i>: TO becomes the owner, FROM's view is detached; log <code>"BUF moved to TO"</code>. <i>clone</i>: a new buffer named <code>BUF'</code> (BUF plus an apostrophe) of the same size is owned by TO; log <code>"BUF' copied to TO"</code>.</li>
<li><code>len WHO BUF</code> → log <code>"WHO BUF n"</code> where n is the byteLength WHO sees: the size if WHO owns BUF, otherwise 0.</li></ul>`,
        constraints: `<p>≤ 10<sup>4</sup> commands; names have no spaces.</p>`,
        example: `<p><code>alloc main A 1024; post main w1 A transfer; len main A; len w1 A</code> → main A 1024, A moved to w1, ${H.c('r', 'main A 0')}, ${H.c('g', 'w1 A 1024')}.</p>`,
        brute: { why: `<p>Treating every post as a copy (or every post as a share) ignores detachment: the second transfer of the same buffer would wrongly succeed, and memory accounting would double.</p>`, code: R`function transferSimNaive(ops) {
  return ops.map((op) => op.startsWith('post') ? op.split(' ')[3] + ' sent' : op);   // no ownership at all
}` },
        mcq: { q: 'After <code>port.postMessage(u8, [u8.buffer])</code>, what is <code>u8.byteLength</code> in the sender?', options: ['Unchanged', '0 — the buffer is detached', 'Half', 'It throws on access'], answer: 1, explain: 'Transferring moves the backing store; the sender\'s ArrayBuffer and its views become detached with length 0.' },
        hints: [
          `<p>Hint 1: Two maps are enough: <code>owner: buf → thread</code> and <code>size: buf → bytes</code>.</p>`,
          `<p>Hint 2: Detached simply means "FROM is no longer the owner", so one ownership check covers both errors.</p>`,
          `<p>Hint 3: Clone creates a brand-new entry <code>buf + "'"</code> owned by TO with the same size; the original stays with FROM.</p>`
        ],
        tests: { sig: 'string[] -> string[]', fn: 'transferSim', cases: [
          [[['alloc main A 1024', 'post main w1 A transfer', 'len main A', 'len w1 A']], ['main A 1024', 'A moved to w1', 'main A 0', 'w1 A 1024']],
          [[['alloc main A 8', 'post main w1 A clone', 'len main A', "len w1 A'"]], ['main A 8', "A' copied to w1", 'main A 8', "w1 A' 8"]],
          [[['alloc main A 8', 'post main w1 A transfer', 'post main w2 A transfer']], ['main A 8', 'A moved to w1', 'DataCloneError A']],
          [[['alloc main A 8', 'post main w1 A transfer', 'post w1 main A transfer', 'len main A', 'len w1 A']], ['main A 8', 'A moved to w1', 'A moved to main', 'main A 8', 'w1 A 0']],
          [[[]], []],
          [[['alloc main A 16', 'post main w1 A transfer', 'post main w2 A clone']], ['main A 16', 'A moved to w1', 'DataCloneError A']],
          [[['alloc main A 4', 'post main w1 A clone', "post w1 w2 A' clone", "len w2 A''"]], ['main A 4', "A' copied to w1", "A'' copied to w2", "w2 A'' 4"]],
          [[['post main w1 Z transfer', 'len main Z']], ['DataCloneError Z', 'main Z 0']]
        ] },
        solution: {
          approach: `<p>Track the single owner of every buffer. A transfer reassigns the owner (the old view is detached); a clone allocates a new buffer for the receiver. Posting something you do not own is the DataCloneError case.</p>`,
          code: { lang: 'js', run: true, code: R`function transferSim(ops) {
  const owner = new Map(), size = new Map(), log = [];
  for (const line of ops) {
    const p = line.split(' ');
    if (p[0] === 'alloc') {
      const [, who, buf, bytes] = p;
      owner.set(buf, who); size.set(buf, Number(bytes));
      log.push(who + ' ' + buf + ' ' + bytes);
    } else if (p[0] === 'post') {
      const [, from, to, buf, mode] = p;
      if (owner.get(buf) !== from) { log.push('DataCloneError ' + buf); continue; }   // detached or never owned
      if (mode === 'transfer') {
        owner.set(buf, to);                          // zero-copy move; sender's view is detached
        log.push(buf + ' moved to ' + to);
      } else {
        const copy = buf + "'";                      // structured clone = new backing store
        owner.set(copy, to); size.set(copy, size.get(buf));
        log.push(copy + ' copied to ' + to);
      }
    } else if (p[0] === 'len') {
      const [, who, buf] = p;
      log.push(who + ' ' + buf + ' ' + (owner.get(buf) === who ? size.get(buf) : 0));
    }
  }
  return log;
}
console.log(transferSim(['alloc main A 1024', 'post main w1 A transfer', 'len main A', 'len w1 A']));` },
          dry: { head: ['command', 'owner of A', 'log'], rows: [
            ['alloc main A 1024', 'main', 'main A 1024'], ['post main w1 A transfer', 'w1', 'A moved to w1'],
            ['len main A', 'w1', '<span class="c-r">main A 0</span>'], ['len w1 A', 'w1', '<span class="c-g">w1 A 1024</span>']
          ] },
          complexity: `<p>O(1) per command with hash maps; O(buffers) memory. Real transfer is O(1) too, while real clone is O(bytes).</p>`,
          followUps: ['Add SharedArrayBuffer: posting it shares instead of copying.', 'Why can a transferred buffer not be used by two threads at once without Atomics?']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 7 — Module loading: CommonJS vs ES modules
     ====================================================================== */
  topics.push({
    title: 'Module Loading: CommonJS require() vs ES Modules — Resolution, Caching and Cycles',
    analogy: `<p><b>CommonJS</b> is a librarian who fetches books <i>on demand</i>: when you shout "require('a')", she walks to the shelf, reads the book aloud from the start, and puts it on the "already read" cart (the cache). If book A says "now read B", and B says "now read A", she does not start A again — she hands B the <b>half-read</b> A, with only the pages read so far. <b>ES modules</b> are a librarian who first reads every table of contents, builds the full map of which books cite which, wires up the references, and only then reads each book once, dependencies first.</p>`,
    explain: `<p>JS 3 introduced <code>require</code> vs <code>import</code>. Here is how Node actually loads them.</p>
<p><b>CommonJS: <code>require(X)</code> from a file in directory D</b></p>
<ol>
<li><b>Core module?</b> (<code>fs</code>, <code>node:fs</code>) → return it. The <code>node:</code> prefix skips any lookup and is required for some newer modules (<code>node:test</code>, <code>node:sqlite</code>).</li>
<li><b>Starts with <code>./</code>, <code>../</code> or <code>/</code>?</b> → path P = resolve(D, X). Try P as a file: P, P.js, P.json, P.node. Then as a directory: P/package.json <code>"main"</code>, then P/index.js, index.json, index.node.</li>
<li><b>Bare name</b> (<code>lodash</code>, <code>@scope/pkg/sub</code>) → for each <code>node_modules</code> folder walking up from D to the root: if the package has an <code>"exports"</code> field, only the paths it exports are allowed (<code>ERR_PACKAGE_PATH_NOT_EXPORTED</code> otherwise); else try file/directory rules.</li>
<li>Not found → <code>MODULE_NOT_FOUND</code>.</li>
</ol>
<p>The resolved <b>absolute filename</b> is the cache key in <code>require.cache</code>. On first load Node creates <code>module = { exports: {} }</code>, <b>puts it in the cache first</b>, then runs the file inside a wrapper: <code>(function (exports, require, module, __filename, __dirname) { … })</code>. That ordering is what makes cycles "work": a module required while it is still loading gets its <b>partial</b> <code>module.exports</code>.</p>
<p><b>ES modules</b> (<code>.mjs</code>, or <code>.js</code> under <code>"type": "module"</code>) load in three phases: <b>construction</b> (parse and resolve every <code>import</code> statically, building the graph; specifiers are URLs, relative ones need the <b>full file extension</b>, no directory index lookup), <b>linking</b> (bind imports to exports as <i>live bindings</i>) and <b>evaluation</b> (post-order DFS: dependencies run before dependents, each module once). The module map is keyed by URL; there is no <code>require.cache</code> to delete from. In a cycle, a module may run before a dependency it imports: touching that binding at top level throws a <code>ReferenceError</code> (TDZ) instead of seeing a partial object.</p>
${H.table(['', 'CommonJS', 'ES modules'], [
  ['When resolved', 'at run time, line by line', 'before any code runs (static graph)'],
  ['Exports', 'copy of a value on module.exports', 'live bindings'],
  ['Cycles', 'partial exports object', 'uninitialised binding → TDZ ReferenceError if touched early'],
  ['Extensions / index', 'optional, index.js lookup', 'required, no index lookup'],
  ['Top-level await', 'no', 'yes'],
  ['__dirname', 'yes', '<code>import.meta.dirname</code> (Node 20.11+), <code>import.meta.url</code>']
])}
<p><b>Interop:</b> <code>import cjs from './x.cjs'</code> gives <code>module.exports</code> as the default export (named exports when the cjs-module-lexer can detect them). <code>require()</code> of an ES module works in Node 22.12+ and 20.19+ when the module graph has no top-level <code>await</code>; otherwise use <code>await import()</code>.</p>`,
    clues: [
      '"How does require find a module?" → core → relative file/ext/dir(main/index) → node_modules walk-up → exports field',
      '"Why is require() of my module returning {}?" → circular dependency: partial exports during load',
      '"require.cache / hot reload" → cache keyed by absolute filename; delete the entry to reload',
      '"ERR_PACKAGE_PATH_NOT_EXPORTED" → package "exports" hides that subpath',
      '"ERR_REQUIRE_ESM" → older Node or an ESM graph with top-level await; use import()',
      '"Cannot access X before initialization" in ESM → cyclic import touched at top level'
    ],
    code: [
      { lang: 'js', title: 'A circular dependency in CommonJS (syntax-checked; three files)', code: R`// ---- a.js ----
exports.done = false;
const b = require('./b.js');          // a is in the cache, half-loaded
console.log('in a, b.done =', b.done);
exports.done = true;

// ---- b.js ----
exports.done = false;
const a = require('./a.js');          // cycle! gets a's PARTIAL exports
console.log('in b, a.done =', a.done); // false
exports.done = true;

// ---- main.js ----
const a2 = require('./a.js');
const b2 = require('./b.js');          // cached, not re-run
console.log('in main', a2.done, b2.done);   // true true` },
      { lang: 'js', run: true, title: 'A mini require() with cache-before-execute (runnable)', code: R`// Fake file system: each "file" is a function(exports, require, module).
const files = {
  '/a.js': (exports, require) => { exports.name = 'a'; const b = require('/b.js'); exports.saw = 'b sees a.name=' + b.seenA; },
  '/b.js': (exports, require) => { const a = require('/a.js'); exports.seenA = a.name; exports.late = a.saw; }
};
const cache = {};
function myRequire(filename) {
  if (cache[filename]) return cache[filename].exports;      // hit (may be partial!)
  const module = { exports: {}, loaded: false };
  cache[filename] = module;                                  // cache BEFORE running
  files[filename](module.exports, myRequire, module);
  module.loaded = true;
  return module.exports;
}
const a = myRequire('/a.js');
console.log(a.saw);                                          // b sees a.name=a
console.log('b.late =', cache['/b.js'].exports.late);         // undefined: a was partial` },
      { lang: 'js', title: 'ESM details (syntax-checked, save as .mjs)', code: R`import { readFile } from 'node:fs/promises';
import config from './config.json' with { type: 'json' };   // import attributes
import legacy from './legacy.cjs';                            // module.exports as default

const here = import.meta.dirname;                             // Node 20.11+
const pkgUrl = import.meta.resolve('some-package');           // resolution without loading
const text = await readFile(new URL('./data.txt', import.meta.url), 'utf8'); // top-level await
console.log(here, pkgUrl, config.port, legacy, text.length);` }
    ],
    codeTitle: ['CJS cycle', 'Mini require', 'ESM'],
    viz: [
      {
        title: 'CommonJS loader (editable): cache, partial exports in cycles',
        input: 'main: a b\na: b\nb: a',
        inputLabel: 'One module per line: name: deps it requires in order (first line = entry)',
        gen: function (input) {
          var lines = String(input).split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
          if (!lines.length || lines.length > 12) throw new Error('Write 1-12 lines like  a: b c');
          var deps = {}, first = null;
          lines.forEach(function (l) {
            var i = l.indexOf(':'); if (i < 1) throw new Error('Each line needs "name:" e.g.  b: a');
            var n = l.slice(0, i).trim(); if (first === null) first = n; deps[n] = l.slice(i + 1).trim().split(/\s+/).filter(Boolean);
          });
          var cache = [], stack = [], log = [], frames = [];
          function fr(narr, cls) {
            frames.push({ narr: narr, parts: [
              { type: 'stack', label: 'require() call stack', items: stack.slice(), hl: stack.length ? one(stack.length - 1, 'cur') : {} },
              { type: 'map', label: 'require.cache', entries: cache.map(function (c) { return [c[0], c[1] ? 'loaded' : 'loading (partial)']; }) },
              { type: 'array', label: 'Log', values: log.slice(), hl: log.length ? one(log.length - 1, cls) : {} }
            ] });
          }
          function find(n) { for (var i = 0; i < cache.length; i++) if (cache[i][0] === n) return cache[i]; return null; }
          function req(n) {
            if (frames.length > 60) return;
            var c = find(n);
            if (c) { log.push((c[1] ? 'cached ' : 'partial ') + n); fr(c[1] ? 'require(\'' + n + '\') → cache hit; the module is NOT run again.' : 'require(\'' + n + '\') while ' + n + ' is still loading → <b>cycle</b>! You get its <b>partial</b> module.exports (whatever it had assigned so far).', c[1] ? 'ok' : 'bad'); return; }
            if (!deps.hasOwnProperty(n)) { log.push('missing ' + n); fr('require(\'' + n + '\') → no such module: MODULE_NOT_FOUND (logged here so the model continues).', 'bad'); return; }
            var e = [n, false]; cache.push(e); stack.push(n); log.push('start ' + n);
            fr('Load <b>' + n + '</b>: create module.exports = {}, put it in the cache <b>first</b>, then run its code.', 'cur');
            deps[n].forEach(req);
            e[1] = true; stack.pop(); log.push('end ' + n);
            fr(n + ' finished: module.loaded = true; its exports are complete.', 'ok');
          }
          req(first);
          return frames;
        }
      },
      {
        title: 'ESM: construct → link → evaluate (post-order)',
        gen: function () {
          var nodes = [
            { id: 'main', label: 'main.mjs', x: 50, y: 6, shape: 'box' },
            { id: 'a', label: 'a.mjs', x: 22, y: 30, shape: 'box' },
            { id: 'b', label: 'b.mjs', x: 78, y: 30, shape: 'box' },
            { id: 'c', label: 'c.mjs', x: 50, y: 54, shape: 'box' }
          ];
          var E = [['main', 'a'], ['main', 'b'], ['a', 'c'], ['b', 'c'], ['c', 'a']];
          var S = [
            ['<b>Construction</b>: parse main.mjs, find its imports (a, b), fetch and parse them, recursively. No code runs yet.', { main: 'cur', a: 'cur', b: 'cur', c: 'cur' }, {}],
            ['<b>Linking</b>: each import is bound to the exporting module\'s variable slot (a live binding). Missing export names fail here, before anything runs.', {}, { 'main-a': 'cur', 'main-b': 'cur', 'a-c': 'cur', 'b-c': 'cur', 'c-a': 'cur' }],
            ['<b>Evaluation</b> is a post-order DFS from main: main → a → c → (a is already being visited: cycle) → evaluate <b>c first</b>.', { c: 'ok' }, { 'c-a': 'bad' }],
            ['c\'s top-level code reads an import from a, but a has not run: <b>ReferenceError: Cannot access before initialization</b> (TDZ). Reading it later inside a function is fine.', { c: 'bad' }, {}],
            ['If c only uses a\'s bindings inside functions: c done → a runs → b (c already evaluated) → main. Order: c, a, b, main.', { c: 'done', a: 'ok', b: 'ok', main: 'ok' }, {}],
            ['Each module evaluated exactly once, keyed by URL in the module map.', { main: 'sel', a: 'sel', b: 'sel', c: 'sel' }, {}]
          ];
          return S.map(function (s) { return { narr: s[0], parts: [{ type: 'graph', label: 'Module graph', directed: true, height: 60, nodes: nodes, edges: E, hl: s[1], ehl: s[2] }] }; });
        }
      }
    ],
    examples: [
      { title: 'Where does require(\'lodash\') look?', html: `<p>From <code>/home/u/app/src/util.js</code>: <code>/home/u/app/src/node_modules</code>, <code>/home/u/app/node_modules</code>, <code>/home/u/node_modules</code>, <code>/home/node_modules</code>, <code>/node_modules</code> (plus legacy <code>NODE_PATH</code> and global folders). <code>require.resolve.paths('lodash')</code> prints the list.</p>` },
      { title: 'The module.exports vs exports trap', html: `<p><code>exports</code> starts as a reference to <code>module.exports</code>. <code>exports.fn = …</code> adds to it; <code>exports = { fn }</code> just rebinds a local variable and exports nothing. To replace the whole export, assign <code>module.exports = …</code>.</p>`, code: { lang: 'js', run: true, code: R`function load(body) { const module = { exports: {} }; body(module.exports, module); return module.exports; }
console.log(load((exports) => { exports.a = 1; }));             // { a: 1 }
console.log(load((exports) => { exports = { a: 1 }; }));        // {}  (rebinding the local)
console.log(load((exports, module) => { module.exports = { a: 1 }; })); // { a: 1 }` } },
      { title: 'Hot reload by deleting the cache entry', html: `<p><code>delete require.cache[require.resolve('./config')]</code> then <code>require('./config')</code> re-executes the file. Old references held by other modules still point to the <b>old</b> exports — one reason hot reload in CJS is fragile. ESM has no public way to evict a module; tools append a query string (<code>import('./x.mjs?v=2')</code>) and leak the old module.</p>` },
      { title: 'Dual package hazard', html: `<p>A package that ships both CJS and ESM builds can be loaded <b>twice</b> in one app (once via <code>require</code>, once via <code>import</code>), creating two copies of its state — two singletons, <code>instanceof</code> failing across them. Mitigations: an ESM wrapper around the CJS build, or a single format.</p>` }
    ],
    deepDive: `<p><b>CJS internals.</b> <code>Module._load</code> → <code>Module._resolveFilename</code> (with a <code>relativeResolveCache</code>) → check <code>Module._cache</code> → <code>new Module()</code> → cache → <code>module.load()</code> picks a loader from <code>Module._extensions</code> (<code>.js</code> compiles with the wrapper via <code>vm.compileFunction</code>-like machinery; <code>.json</code> uses JSON.parse; <code>.node</code> uses dlopen). Symlinks are resolved to real paths by default (<code>--preserve-symlinks</code> changes that), which matters for monorepos and pnpm.</p>
<p><b>package.json fields.</b> <code>"type"</code> sets how <code>.js</code> is interpreted in that package scope. <code>"exports"</code> supports subpaths (<code>"./feature/*"</code>), conditions (<code>import</code>, <code>require</code>, <code>node</code>, <code>default</code>, custom ones via <code>--conditions</code>), and <code>null</code> to block paths; condition order in the object decides priority. <code>"imports"</code> defines private <code>#internal</code> specifiers.</p>
<p><b>ESM loader.</b> Resolution follows the WHATWG URL-based algorithm with Node's ESM_RESOLVE rules; loader hooks (<code>module.register</code>, and synchronous <code>registerHooks</code> in newer releases) let tools like tsx or test mocks customise resolve/load. Syntax detection (Node 22.7+) runs an ambiguous <code>.js</code> file as ESM if it contains ESM-only syntax.</p>
<p><b>Performance.</b> Thousands of small CJS files mean thousands of <code>stat</code> calls during resolution (startup cost). Bundling, <code>node --snapshot-blob</code>, the compile cache (<code>module.enableCompileCache()</code>, Node 22.1+) and fewer, flatter dependencies help cold starts (serverless).</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants mix the two systems: <code>__dirname</code> in ESM files, extension-less relative imports in ESM, <code>require</code> inside <code>"type": "module"</code> packages, or claims that ESM cannot import CommonJS. Answers trained on older data say <code>require(esm)</code> is impossible, which changed in Node 22.12 / 20.19.</p>
<p><b>Use AI well:</b> give it your <code>package.json</code> (type, exports) and Node version, and ask what a given specifier resolves to and why. Verify with <code>require.resolve</code> / <code>import.meta.resolve</code>. For cycles, ask it to draw the import graph from your files and point out top-level uses across the cycle.</p>
<p><b>What you must still own:</b> the resolution algorithm, cache-before-execute, the difference between partial exports and TDZ errors, and the rules of the exports field.</p>`,
    problems: [
      {
        title: 'CommonJS loader simulator with caching and cycles',
        level: 'Medium', tags: ['node', 'modules', 'commonjs', 'graphs'], companies: ['Vercel', 'Shopify', 'Atlassian'],
        statement: `<p>Each line <code>name: dep1 dep2 …</code> describes a module that requires its deps in order. The first line is the entry. Simulate CommonJS loading and return the log:</p>
<ul><li>Requiring an uncached module: log <code>"start X"</code>, cache it as <i>loading</i>, require its deps in order, mark it <i>loaded</i>, log <code>"end X"</code>.</li>
<li>Requiring a cached module: log <code>"cached X"</code> if loaded, or <code>"partial X"</code> if it is still loading (a cycle).</li>
<li>Requiring a name with no line: log <code>"missing X"</code> and continue.</li></ul>`,
        constraints: `<p>≤ 1000 modules, ≤ 10<sup>4</sup> require edges. Depth of the require chain ≤ 1000.</p>`,
        example: `<p><code>["main: a b", "a: b", "b: a"]</code> → start main, start a, start b, ${H.c('r', 'partial a')}, end b, end a, ${H.c('g', 'cached b')}, end main.</p>`,
        brute: { why: `<p>Re-running a module on every require (no cache) loops forever on cycles and executes side effects (like opening a DB pool) many times.</p>`, code: R`function requireNoCache(lines) {
  const deps = Object.fromEntries(lines.map((l) => [l.split(':')[0].trim(), l.split(':')[1].trim().split(/\s+/).filter(Boolean)]));
  const log = [];
  const req = (n, depth) => { if (depth > 20) { log.push('stack overflow'); return; } log.push('start ' + n); (deps[n] || []).forEach((d) => req(d, depth + 1)); log.push('end ' + n); };
  req(lines[0].split(':')[0].trim(), 0);
  return log;
}` },
        mcq: { q: 'Why does Node insert the module into <code>require.cache</code> <b>before</b> running its code?', options: ['To make loading faster', 'So a circular require returns the partial exports instead of recursing forever', 'Because the wrapper function requires it', 'To support ESM interop'], answer: 1, explain: 'Caching first breaks the infinite recursion in cycles; the price is that the cycle sees a half-filled exports object.' },
        hints: [
          `<p>Hint 1: A Map from name to a state object <code>{ loaded: false }</code> plays the role of require.cache.</p>`,
          `<p>Hint 2: Order inside <code>req(n)</code>: cache check → missing check → put in cache → log start → deps → loaded = true → log end.</p>`,
          `<p>Hint 3: With depth up to 1000, plain recursion is fine in JS (default stack ≈ 10k frames).</p>`
        ],
        tests: { sig: 'string[] -> string[]', fn: 'requireOrder', cases: [
          [[['main: a b', 'a: b', 'b: a']], ['start main', 'start a', 'start b', 'partial a', 'end b', 'end a', 'cached b', 'end main']],
          [[['main:']], ['start main', 'end main']],
          [[['main: x']], ['start main', 'missing x', 'end main']],
          [[['main: a a', 'a:']], ['start main', 'start a', 'end a', 'cached a', 'end main']],
          [[['main: main']], ['start main', 'partial main', 'end main']],
          [[['main: a b', 'a: c', 'b: c', 'c:']], ['start main', 'start a', 'start c', 'end c', 'end a', 'start b', 'cached c', 'end b', 'end main']],
          [[['main: a', 'a: b', 'b: c', 'c: a']], ['start main', 'start a', 'start b', 'start c', 'partial a', 'end c', 'end b', 'end a', 'end main']]
        ] },
        solution: {
          approach: `<p>Recursive DFS mirroring <code>Module._load</code>: cache check, then cache-before-execute, then the body (requires in order), then mark loaded. The loading/loaded distinction is exactly <code>module.loaded</code>.</p>`,
          code: { lang: 'js', run: true, code: R`function requireOrder(lines) {
  const deps = new Map();
  let entry = null;
  for (const line of lines) {
    const i = line.indexOf(':');
    const name = line.slice(0, i).trim();
    if (entry === null) entry = name;
    deps.set(name, line.slice(i + 1).trim().split(/\s+/).filter(Boolean));
  }
  const cache = new Map(), log = [];

  function req(name) {
    const hit = cache.get(name);
    if (hit) { log.push((hit.loaded ? 'cached ' : 'partial ') + name); return; }
    if (!deps.has(name)) { log.push('missing ' + name); return; }
    const module = { loaded: false };
    cache.set(name, module);                 // cache BEFORE executing: breaks cycles
    log.push('start ' + name);
    for (const d of deps.get(name)) req(d);  // the module body: its require() calls
    module.loaded = true;
    log.push('end ' + name);
  }
  req(entry);
  return log;
}
console.log(requireOrder(['main: a b', 'a: b', 'b: a']).join(', '));` },
          dry: { head: ['call', 'cache state', 'log'], rows: [
            ['req main', 'main:loading', 'start main'], ['req a', '+a:loading', 'start a'], ['req b', '+b:loading', 'start b'],
            ['req a (from b)', 'a still loading', '<span class="c-r">partial a</span>'], ['b done', 'b:loaded', 'end b'], ['a done', 'a:loaded', 'end a'],
            ['req b (from main)', 'b loaded', '<span class="c-g">cached b</span>'], ['main done', 'all loaded', 'end main']
          ] },
          complexity: `<p>O(M + E) for M modules and E require edges; O(M) cache memory.</p>`,
          followUps: ['Return the ESM evaluation order for the same graph (post-order DFS).', 'Add a "delete from cache" command and model hot reload.']
        }
      }
    ]
  });

  /* ======================================================================
     TOPIC 8 — Diagnosing a blocked loop, leaks, profiling
     ====================================================================== */
  topics.push({
    title: 'Diagnosing a Blocked Event Loop, Memory Leaks and Profiling in Production',
    analogy: `<p>A <b>hospital heart monitor</b>: a nurse expects a beep every 10 ms. If the beep comes 300 ms late, something blocked the heart for 300 ms — that delay is <b>event-loop lag</b>. A <b>CPU profile</b> is a slow-motion video showing which function held the heart. A <b>heap snapshot</b> is an X-ray: take one now and one later, and whatever keeps growing between X-rays is your leak.</p>`,
    explain: `<p>One thread runs all your JS, so a single slow callback delays <b>everything</b>: other requests, timers, health checks. Symptoms: p99 latency spikes while average CPU looks fine, Kubernetes liveness probes failing under load, timers firing late.</p>
<p><b>Measure the loop.</b></p>
<ul>
<li><b>Event-loop delay</b>: <code>perf_hooks.monitorEventLoopDelay()</code> samples how late a timer fires (a histogram with <code>min</code>, <code>mean</code>, <code>percentile(99)</code>, <code>max</code> in nanoseconds). p99 above ~50–100 ms means users feel it.</li>
<li><b>Event-loop utilisation (ELU)</b>: <code>performance.eventLoopUtilization()</code> = time the loop spent running JS / total time. ELU near 1 means saturated (scale out or optimise); low ELU with high latency means you are waiting on I/O or the thread pool.</li>
</ul>
<p><b>Usual causes of a blocked loop:</b> <code>*Sync</code> APIs on hot paths (<code>readFileSync</code>, <code>pbkdf2Sync</code>), <code>JSON.parse</code>/<code>JSON.stringify</code> of multi-MB payloads, catastrophic-backtracking regexes (ReDoS), big sorts/loops, synchronous logging to a slow destination, and recursive <code>nextTick</code>/microtask chains.</p>
<p><b>Find the culprit:</b> <code>node --cpu-prof app.js</code> writes a <code>.cpuprofile</code> (open in Chrome DevTools); <code>node --inspect</code> + DevTools Performance tab for live profiling; flame graphs via <code>0x</code> or <code>clinic flame</code>; <code>--trace-sync-io</code> warns about sync I/O after the first tick; diagnostic reports (<code>--report-on-signal</code>, <code>process.report.writeReport()</code>) dump the JS stack, native stack, handles and resource usage of a hung process.</p>
<p><b>Memory.</b> <code>process.memoryUsage()</code> returns <code>rss</code> (whole process), <code>heapTotal</code>/<code>heapUsed</code> (V8 JS heap), <code>external</code> and <code>arrayBuffers</code> (Buffers live here). Steadily growing <code>heapUsed</code> after GC = JS leak; growing <code>rss</code> with flat heap = native/Buffer memory or fragmentation. Take heap snapshots with <code>v8.writeHeapSnapshot()</code>, <code>--heapsnapshot-signal=SIGUSR2</code> or automatically with <code>--heapsnapshot-near-heap-limit=2</code>, then compare them in DevTools (three-snapshot technique from JS 12). Typical Node leaks: module-level caches/Maps without eviction, listeners added per request, closures captured by long-lived timers, unbounded in-memory queues (ignored backpressure), and huge objects stored in <code>AsyncLocalStorage</code> stores.</p>
<p><b>Heap limit.</b> V8's old-space limit depends on available memory and the Node version (often 2–4 GB on 64-bit), and it is not always derived from a container's memory limit — set it explicitly in containers. <code>--max-old-space-size=MB</code> overrides it. Hitting it produces "FATAL ERROR: Reached heap limit … JavaScript heap out of memory".</p>`,
    clues: [
      '"p99 latency spikes but CPU is only 30 %" → blocked loop by occasional heavy callbacks; measure event-loop delay',
      '"Health check times out under load" → loop blocked, probe callbacks queue behind CPU work',
      '"RSS keeps growing, heapUsed is flat" → Buffers / native memory / fragmentation, not a JS-object leak',
      '"JavaScript heap out of memory" → leak or undersized --max-old-space-size; take snapshots near the limit',
      '"Find which function is slow in production" → --cpu-prof / inspector profile / flame graph',
      '"Process hangs, no CPU" → diagnostic report or why-is-node-running: an open handle, deadlocked await'
    ],
    code: [
      { lang: 'js', title: 'Built-in loop health metrics (syntax-checked, Node only)', code: R`const { monitorEventLoopDelay, performance } = require('node:perf_hooks');

const h = monitorEventLoopDelay({ resolution: 10 });   // sample every 10 ms
h.enable();
let lastElu = performance.eventLoopUtilization();

setInterval(() => {
  const elu = performance.eventLoopUtilization(lastElu); // delta since last call
  lastElu = performance.eventLoopUtilization();
  const mem = process.memoryUsage();
  console.log(JSON.stringify({
    lagP50ms: h.percentile(50) / 1e6,
    lagP99ms: h.percentile(99) / 1e6,
    lagMaxMs: h.max / 1e6,
    elu: elu.utilization.toFixed(2),
    heapUsedMB: Math.round(mem.heapUsed / 1048576),
    rssMB: Math.round(mem.rss / 1048576)
  }));
  h.reset();
}, 5000).unref();` },
      { lang: 'bash', title: 'Profiling and snapshot commands', code: `# CPU profile written on exit (open the .cpuprofile in Chrome DevTools > Performance)
node --cpu-prof --cpu-prof-dir=./profiles server.js

# Attach DevTools to a running process (chrome://inspect)
node --inspect=127.0.0.1:9229 server.js
kill -USR1 $PID                       # enable the inspector on an already-running process

# Heap snapshots on demand and right before an OOM
node --heapsnapshot-signal=SIGUSR2 --heapsnapshot-near-heap-limit=2 server.js
kill -USR2 $PID

# Diagnostic report (JSON: stacks, handles, resource usage) for a hung process
node --report-on-signal --report-signal=SIGUSR2 server.js

# Warn about synchronous I/O after startup
node --trace-sync-io server.js` },
      { lang: 'js', run: true, title: 'Measure lag yourself: a timer that should fire every 20 ms (runnable)', code: R`const samples = [];
let expected = Date.now() + 20;
const t = setInterval(() => {
  const now = Date.now();
  samples.push(Math.max(0, now - expected));     // how late was this tick?
  expected = now + 20;
  if (samples.length === 6) { clearInterval(t); console.log('lag per tick (ms):', samples.join(' ')); }
}, 20);
setTimeout(() => {                                 // simulate a blocking request handler
  const end = Date.now() + 120;
  while (Date.now() < end) {}                      // 120 ms of synchronous CPU
  console.log('blocked for 120 ms');
}, 30);` }
    ],
    codeTitle: ['Metrics', 'Commands', 'Lag probe'],
    viz: [
      {
        title: 'Lag timeline (editable): a periodic timer vs blocking work',
        input: '10\n60\n15 20\n40 5',
        inputLabel: 'Line 1: timer period ms. Line 2: horizon ms. Next lines: "start duration" of blocking callbacks',
        gen: function (input) {
          var ls = String(input).trim().split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
          var period = parseInt(ls[0], 10), horizon = parseInt(ls[1], 10);
          var blocks = ls.slice(2).map(function (l) { var p = l.split(/\s+/).map(Number); return [p[0], p[1]]; });
          if (!(period >= 1) || !(horizon >= 1 && horizon <= 500) || horizon / period > 30 || blocks.length > 8 || blocks.some(function (b) { return !(b[0] >= 0 && b[1] >= 0); })) throw new Error('period ≥ 1, horizon 1-500 (≤ 30 ticks), up to 8 lines "start duration"');
          blocks.sort(function (a, b) { return a[0] - b[0]; });
          var busy = [], free = 0;
          blocks.forEach(function (b) { var s = Math.max(b[0], free); busy.push([s, s + b[1]]); free = s + b[1]; });
          var frames = [], lags = [], due = period;
          frames.push({ narr: 'A timer wants to run every ' + period + ' ms (like the sampler inside monitorEventLoopDelay). Blocking callbacks occupy the thread during: ' + (busy.map(function (b) { return '[' + b[0] + ', ' + b[1] + ')'; }).join(' ') || 'never') + '.', parts: [
            { type: 'table', label: 'Busy intervals (ms)', columns: ['start', 'end'], rows: busy.map(function (b) { return [String(b[0]), String(b[1])]; }) },
            { type: 'bars', label: 'Lag per tick (ms)', values: [0] }
          ] });
          while (due <= horizon) {
            var t = due;
            for (var i = 0; i < busy.length; i++) if (busy[i][0] <= t && t < busy[i][1]) t = busy[i][1];
            lags.push(t - due);
            frames.push({ narr: 'Tick due at ' + due + ' ms ' + (t === due ? 'fires on time.' : 'finds the thread busy and fires at <b>' + t + ' ms</b> → lag <b>' + (t - due) + ' ms</b>. Every request arriving now waits just as long.') + ' Next tick is due at ' + (t + period) + ' ms.', parts: [
              { type: 'table', label: 'Busy intervals (ms)', columns: ['start', 'end'], rows: busy.map(function (b) { return [String(b[0]), String(b[1])]; }), hl: (function () { for (var k = 0; k < busy.length; k++) if (busy[k][0] <= due && due < busy[k][1]) return one(k, 'bad'); return {}; })() },
              { type: 'bars', label: 'Lag per tick (ms)', values: lags.slice(), hl: one(lags.length - 1, t === due ? 'ok' : 'bad') }
            ] });
            due = t + period;
          }
          var sorted = lags.slice().sort(function (a, b) { return a - b; });
          frames.push({ narr: 'Summary: max lag <b>' + (sorted.length ? sorted[sorted.length - 1] : 0) + ' ms</b>, median ' + (sorted.length ? sorted[Math.ceil(sorted.length / 2) - 1] : 0) + ' ms. A healthy service keeps p99 lag in single-digit ms; here the blocking callbacks are the culprits — find them with a CPU profile.', parts: [{ type: 'bars', label: 'Lag per tick (ms)', values: lags.length ? lags : [0], hl: {} }] });
          return frames;
        }
      },
      {
        title: 'Symptom → measurement → tool',
        gen: function () {
          var rows = [
            ['High p99, low avg CPU', 'event-loop delay p99', 'monitorEventLoopDelay, then --cpu-prof'],
            ['Throughput plateaus, CPU 100 % on 1 core', 'ELU ≈ 1', 'flame graph; move CPU work to workers; scale processes'],
            ['fs / DNS slow, CPU idle', 'pool queueing', 'UV_THREADPOOL_SIZE, fewer parallel fs ops, DNS cache'],
            ['heapUsed grows forever', 'heap after GC', 'three heap snapshots, compare retainers'],
            ['RSS grows, heap flat', 'external / arrayBuffers', 'Buffer retention, native addons, backpressure'],
            ['Process will not exit / hangs', 'active handles', 'diagnostic report, why-is-node-running']
          ];
          return rows.map(function (r, i) { return { narr: '<b>' + r[0] + '</b> → measure ' + r[1] + ' → ' + r[2] + '.', parts: [{ type: 'table', label: 'Triage map', columns: ['symptom', 'measure', 'tool / fix'], rows: rows.slice(0, i + 1), hl: one(i, 'cur') }] }; });
        }
      }
    ],
    examples: [
      { title: 'ReDoS takes down a server', html: `<p>The regex <code>/^(a+)+$/</code> on <code>'a'.repeat(30) + '!'</code> backtracks exponentially: seconds of CPU on the main thread, so every user waits. Fixes: rewrite the regex without nested quantifiers, limit input length, or run untrusted patterns in a worker with a timeout. CPU profiles show the time inside <code>RegExp</code> execution.</p>` },
      { title: 'Big JSON in a request handler', html: `<p><code>JSON.stringify</code> of a 50 MB report blocks for ~hundreds of ms. Stream the response (write rows as NDJSON with backpressure), paginate, or build it in a worker. Same for <code>JSON.parse</code> of large uploads: use a streaming parser.</p>` },
      { title: 'A per-request listener leak, found with snapshots', html: `<p>Heap grows ~2 MB per 1000 requests. Snapshot 2 vs 3 shows thousands of new <code>(closure)</code> objects retained by <code>EventEmitter._events.reconnect</code> on a long-lived DB client — each closure holds its <code>req</code>/<code>res</code>. Fix: remove the listener on <code>res.on('close')</code>. The MaxListenersExceededWarning in logs was the early signal.</p>` },
      { title: 'Container OOM kills', html: `<p>A pod with a 512 MB limit is OOM-killed with no "heap out of memory" message: RSS (heap + Buffers + native) crossed the cgroup limit before V8's heap limit. Set <code>--max-old-space-size</code> to roughly 70–75 % of the container limit to leave room for non-heap memory, and watch <code>rss</code> as well as <code>heapUsed</code>.</p>` }
    ],
    deepDive: `<p><b>How monitorEventLoopDelay works.</b> It starts a libuv timer at the given resolution and records, in an HDR histogram, how much later than scheduled each callback ran. It measures exactly what a user request experiences: the time a ready callback waits for the thread. ELU, by contrast, is derived from libuv's idle-time metrics (time spent blocked in the poll phase's epoll_wait), so it captures how busy the loop is rather than how late it is.</p>
<p><b>Async stack traces and context.</b> V8 reconstructs async stack traces across <code>await</code> (zero-cost async stack traces), but not across callbacks or event emitters. <code>AsyncLocalStorage</code> (built on async context propagation; Node 24 uses <code>AsyncContextFrame</code> by default) is how APM agents attribute slow spans to requests.</p>
<p><b>Profilers.</b> V8's CPU profiler samples the JS stack (default ~1 ms interval); inlined functions may disappear from the stack and native time shows as "(program)" or "(garbage collector)". A high GC share in the profile points back to allocation-heavy code — see JS 12. Linux <code>perf</code> with <code>--perf-basic-prof</code> maps JIT frames for system-wide profiles.</p>
<p><b>Production practice.</b> Export loop delay, ELU, heap and RSS as metrics; alert on p99 lag; keep <code>--heapsnapshot-near-heap-limit</code> on canaries; capture a diagnostic report on SIGUSR2; note that a heap snapshot pauses the process and needs roughly as much extra memory as the heap — take it on a drained instance.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI tools are good at reading a <code>.cpuprofile</code> summary or a heap-snapshot "comparison" table and naming suspects, and at turning a slow synchronous function into a worker-based or streamed version. They are weaker at causality: they will often blame "memory leaks" for every RSS increase or suggest raising <code>--max-old-space-size</code> as the fix.</p>
<p><b>Use AI well:</b> give it numbers (lag p99, ELU, heapUsed after GC over time, rss, external) and ask for the most likely category from the triage map, then for the cheapest experiment to confirm. Ask it to write the metrics exporter and a load test that reproduces the issue. Let it summarise a 200 MB diagnostic report.</p>
<p><b>What you must still own:</b> choosing what to measure, reading flame graphs and retainer chains, and proving the fix with before/after numbers.</p>`,
    problems: [
      {
        title: 'Compute event-loop lag from blocking callbacks',
        level: 'Medium', tags: ['node', 'performance', 'event loop lag', 'simulation'], companies: ['Datadog', 'New Relic', 'Grafana Labs'],
        statement: `<p>A probe timer is first due at <code>period</code> ms. Whenever it fires at time t, it records <code>lag = t − due</code> and re-arms itself for <code>t + period</code>. Blocking callbacks are given as <code>[start, duration]</code>: they run one at a time in start order (a callback whose start time arrives while another is running begins when that one ends). The timer cannot fire while the thread is busy; it fires at the first moment ≥ due when the thread is free. Return the lags of all ticks whose due time is ≤ <code>horizon</code>.</p>`,
        constraints: `<p>1 ≤ period ≤ 10<sup>4</sup>, 0 ≤ horizon ≤ 10<sup>6</sup>, ≤ 10<sup>4</sup> blocks with start ≥ 0, duration ≥ 0. A busy interval is half-open [s, e): a tick due exactly at e fires on time.</p>`,
        example: `<p><code>period=10, horizon=50, blocks=[[15,20]]</code> → busy [15,35). Due 10 → ${H.c('g', '0')}; due 20 → fires at 35 → ${H.c('r', '15')}; next due 45 → ${H.c('g', '0')}; next due 55 &gt; 50. Answer <code>[0, 15, 0]</code>.</p>`,
        brute: { why: `<p>Stepping time 1 ms at a time and checking every block at every step is O(horizon × blocks) — too slow for 10<sup>6</sup> ms and 10<sup>4</sup> blocks.</p>`, code: R`function timerLagSlow(period, horizon, blocks) {
  const busyAt = (t) => blocks.some(([s, d]) => s <= t && t < s + d);   // ignores queuing of overlaps!
  const lags = [];
  for (let due = period; due <= horizon;) {
    let t = due;
    while (busyAt(t)) t++;
    lags.push(t - due);
    due = t + period;
  }
  return lags;
}` },
        mcq: { q: 'Blocks [3, 4] and [4, 10]. When does the second callback actually run?', options: ['4 to 14', '7 to 17', '3 to 13', 'It is skipped'], answer: 1, explain: 'One thread: the second callback waits until the first ends at 7, so it occupies [7, 17).' },
        hints: [
          `<p>Hint 1: First turn blocks into real busy intervals: sort by start, then <code>s = max(start, previousEnd)</code>.</p>`,
          `<p>Hint 2: The busy intervals are now sorted and non-overlapping. For a due time, skip forward through intervals that contain the current time.</p>`,
          `<p>Hint 3: Due times only increase, so keep a pointer into the intervals instead of rescanning: O(ticks + blocks).</p>`
        ],
        tests: { sig: 'int int int[][] -> int[]', fn: 'timerLag', cases: [
          [[10, 50, [[15, 20]]], [0, 15, 0]],
          [[10, 30, []], [0, 0, 0]],
          [[10, 5, []], []],
          [[10, 40, [[0, 25]]], [15, 0]],
          [[5, 20, [[3, 4], [4, 10]]], [12]],
          [[10, 100, [[10, 0]]], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
          [[1, 3, [[0, 1000]]], [999]],
          [[10, 30, [[25, 5], [5, 3]]], [0, 0, 0]]
        ] },
        solution: {
          approach: `<p>Normalise blocks into sequential busy intervals (one thread → no overlap). Then walk the due times; because both due times and intervals are increasing, a single pointer finds the interval containing the current time, and the fire time jumps to its end (chained when intervals touch).</p>`,
          code: { lang: 'js', run: true, code: R`function timerLag(period, horizon, blocks) {
  const sorted = blocks.map((b) => b.slice()).sort((a, b) => a[0] - b[0]);
  const busy = [];
  let free = 0;
  for (const [start, dur] of sorted) {            // one thread: callbacks queue up
    const s = Math.max(start, free);
    busy.push([s, s + dur]);
    free = s + dur;
  }
  const lags = [];
  let k = 0;                                      // first interval that may still matter
  for (let due = period; due <= horizon;) {
    let t = due;
    while (k < busy.length && busy[k][1] <= t) k++;            // intervals already over
    while (k < busy.length && busy[k][0] <= t && t < busy[k][1]) { t = busy[k][1]; k++; } // blocked
    lags.push(t - due);
    due = t + period;                             // re-armed after it actually fired
  }
  return lags;
}
console.log(timerLag(10, 50, [[15, 20]]));    // [0, 15, 0]` },
          dry: { head: ['due', 'busy interval hit', 'fires at', 'lag'], rows: [
            ['10', '—', '10', '0'], ['20', '[15, 35)', '35', '<span class="c-r">15</span>'], ['45', '—', '45', '0'], ['55', 'beyond horizon', '—', 'stop']
          ] },
          complexity: `<p>O(B log B + T) for B blocks and T ticks; O(B) memory.</p>`,
          followUps: ['Return p50/p99 of the lags (see the practice arena).', 'Model setInterval (fixed schedule, skipped ticks) instead of a re-armed setTimeout.']
        }
      }
    ]
  });

  /* ======================================================================
     PRACTICE ARENA
     ====================================================================== */
  practice.push({
    title: 'Main thread, thread pool or kernel?',
    level: 'Easy', tags: ['node', 'libuv', 'thread pool'], companies: ['Amazon', 'Paytm', 'Zoho'],
    statement: `<p>Write <code>classify(api)</code> returning where the work of a Node API call happens: <code>"threadpool"</code>, <code>"os"</code> (non-blocking kernel I/O watched by the event loop) or <code>"main"</code> (runs synchronously on the JS thread). Support at least: <code>fs.readFile, fs.writeFile, fs.stat, dns.lookup, crypto.pbkdf2, crypto.scrypt, crypto.randomBytes, zlib.gzip</code> (pool); <code>http.get, https.request, net.connect, fetch, dns.resolve4, fs.watch, child_process.spawn</code> (os); everything else, including <code>*Sync</code> calls, <code>JSON.parse</code> and <code>crypto.createHash</code>, is <code>"main"</code>.</p>`,
    constraints: `<p>api is a non-empty string like <code>"module.function"</code>.</p>`,
    example: `<p><code>dns.lookup</code> → ${H.c('y', 'threadpool')} (getaddrinfo blocks), <code>dns.resolve4</code> → ${H.c('b', 'os')} (c-ares sockets), <code>fs.readFileSync</code> → ${H.c('r', 'main')}.</p>`,
    brute: { why: `<p>"Everything async uses the thread pool" misclassifies all network I/O — the main reason Node scales to many sockets is that it does NOT use threads for them.</p>`, code: R`function classifyNaive(api) {
  return api.endsWith('Sync') ? 'main' : 'threadpool';   // wrong for sockets, fetch, dns.resolve
}` },
    mcq: { q: 'Why does <code>dns.lookup</code> use the thread pool but <code>dns.resolve4</code> does not?', options: ['lookup is newer', 'lookup calls the OS getaddrinfo(), which blocks; resolve4 speaks DNS over non-blocking sockets via c-ares', 'resolve4 is synchronous', 'They both use the pool'], answer: 1, explain: 'getaddrinfo honours /etc/hosts and nsswitch but has no async API, so libuv runs it on a pool thread.' },
    hints: [
      `<p>Hint 1: Make two lookup sets: pool APIs and kernel-async APIs.</p>`,
      `<p>Hint 2: Order of checks: pool set → os set → default "main".</p>`,
      `<p>Hint 3: A <code>Set</code> gives O(1) membership; keep the names exact (no prefix matching, or <code>fs.readFileSync</code> would match <code>fs.readFile</code>).</p>`
    ],
    tests: { sig: 'string -> string', fn: 'classify', cases: [
      [['fs.readFile'], 'threadpool'], [['http.get'], 'os'], [['dns.lookup'], 'threadpool'], [['dns.resolve4'], 'os'],
      [['crypto.pbkdf2'], 'threadpool'], [['fs.readFileSync'], 'main'], [['JSON.parse'], 'main'], [['zlib.gzip'], 'threadpool'],
      [['net.connect'], 'os'], [['crypto.createHash'], 'main'], [['fs.watch'], 'os']
    ] },
    solution: {
      approach: `<p>Two sets encode the knowledge from the thread-pool topic. Exact matching avoids classifying <code>fs.readFileSync</code> as pool work.</p>`,
      code: { lang: 'js', run: true, code: R`const POOL = new Set(['fs.readFile', 'fs.writeFile', 'fs.stat', 'fs.open', 'dns.lookup',
  'crypto.pbkdf2', 'crypto.scrypt', 'crypto.randomBytes', 'crypto.randomFill', 'zlib.gzip', 'zlib.deflate', 'zlib.inflate']);
const KERNEL = new Set(['http.get', 'https.request', 'net.connect', 'fetch', 'dns.resolve4', 'dns.resolve',
  'fs.watch', 'child_process.spawn', 'dgram.send']);

function classify(api) {
  if (POOL.has(api)) return 'threadpool';   // blocking syscalls run on libuv worker threads
  if (KERNEL.has(api)) return 'os';         // epoll/kqueue/IOCP readiness, no thread needed
  return 'main';                            // sync APIs and plain JS block the event loop
}
console.log(['fs.readFile', 'http.get', 'JSON.parse'].map(classify));` },
      dry: { head: ['api', 'in POOL?', 'in KERNEL?', 'result'], rows: [['fs.readFile', 'yes', '—', 'threadpool'], ['http.get', 'no', 'yes', 'os'], ['JSON.parse', 'no', 'no', 'main']] },
      complexity: `<p>O(1) per call: two Set lookups.</p>`
    }
  });

  practice.push({
    title: 'Buffer.byteLength for UTF-8 by hand',
    level: 'Easy', tags: ['node', 'buffer', 'utf-8', 'strings'], companies: ['Twilio', 'Postman', 'Freshworks'],
    statement: `<p>Implement <code>utf8Bytes(s)</code> = the number of bytes <code>Buffer.byteLength(s, 'utf8')</code> returns, without using Buffer or TextEncoder. JS strings are UTF-16: code units below 0x80 take 1 byte, below 0x800 take 2, a surrogate <b>pair</b> (one astral code point such as an emoji) takes 4, and every other code unit takes 3.</p>`,
    constraints: `<p>0 ≤ s.length ≤ 10<sup>6</sup>. Inputs contain only well-formed surrogate pairs.</p>`,
    example: `<p><code>"hé€😀"</code> → 1 + 2 + 3 + 4 = ${H.c('g', '10')}, while <code>s.length</code> is 5 (the emoji is two UTF-16 units). That gap is why a <code>Content-Length</code> header must use byteLength.</p>`,
    brute: { why: `<p><code>s.length</code> counts UTF-16 code units, not bytes: wrong for anything non-ASCII, and it breaks HTTP Content-Length and protocol framing.</p>`, code: R`function utf8BytesWrong(s) { return s.length; }` },
    mcq: { q: 'How many UTF-8 bytes does "😀" (U+1F600) take, and what is its JS length?', options: ['1 byte, length 1', '2 bytes, length 2', '4 bytes, length 2', '4 bytes, length 1'], answer: 2, explain: 'Astral code points take 4 bytes in UTF-8 and two UTF-16 code units (a surrogate pair) in JS.' },
    hints: [
      `<p>Hint 1: Loop over <code>charCodeAt(i)</code>, not over characters.</p>`,
      `<p>Hint 2: A high surrogate is 0xD800–0xDBFF; when it is followed by a low surrogate (0xDC00–0xDFFF), count 4 and skip the next unit.</p>`,
      `<p>Hint 3: Thresholds: &lt; 0x80 → 1, &lt; 0x800 → 2, pair → 4, else 3.</p>`
    ],
    tests: { sig: 'string -> int', fn: 'utf8Bytes', cases: [
      [['abc'], 3], [[''], 0], [['é'], 2], [['€'], 3], [['😀'], 4], [['hé€😀'], 10], [['Node.js ✓'], 11], [['aÿ'], 3],
      [[{ $rep: 'a', n: 100000 }], 100000]
    ] },
    solution: {
      approach: `<p>Walk the UTF-16 code units and add the UTF-8 length of each code point, treating a surrogate pair as one 4-byte code point.</p>`,
      code: { lang: 'js', run: true, code: R`function utf8Bytes(s) {
  let bytes = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) bytes += 1;                       // ASCII
    else if (c < 0x800) bytes += 2;                 // Latin, Greek, Cyrillic, Arabic...
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
      const d = s.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) { bytes += 4; i++; continue; }   // surrogate pair
      bytes += 3;
    } else bytes += 3;                              // rest of the BMP (CJK, €, ✓)
  }
  return bytes;
}
console.log(utf8Bytes('hé€😀'), Buffer.byteLength('hé€😀'));   // 10 10` },
      dry: { head: ['unit', 'code', 'bytes', 'total'], rows: [['h', '0x68', '1', '1'], ['é', '0xE9', '2', '3'], ['€', '0x20AC', '3', '6'], ['😀 (pair)', '0xD83D 0xDE00', '4', '10']] },
      complexity: `<p>O(n) time, O(1) memory.</p>`
    }
  });

  practice.push({
    title: 'Event-loop utilisation from busy intervals',
    level: 'Easy', tags: ['node', 'performance', 'ELU'], companies: ['Datadog', 'Cloudflare', 'Zerodha'],
    statement: `<p>Given a measurement window <code>[0, windowMs)</code> and the non-overlapping intervals <code>[start, end)</code> during which the loop was running JS, return the event-loop utilisation as a whole percentage (rounded down): busy time inside the window ÷ window × 100. Parts of intervals outside the window do not count. Return 0 for an empty window.</p>`,
    constraints: `<p>0 ≤ windowMs ≤ 10<sup>9</sup>, ≤ 10<sup>5</sup> intervals, 0 ≤ start ≤ end.</p>`,
    example: `<p><code>windowMs=100, busy=[[0,25],[50,75]]</code> → 50 ms busy → ${H.c('g', '50')} %. Interval <code>[90,150]</code> in a 100 ms window counts only 10 ms.</p>`,
    brute: { why: `<p>Marking each millisecond in a boolean array works but costs O(windowMs) memory — a billion entries for a 10⁹ ms window.</p>`, code: R`function eluSlow(windowMs, busy) {
  const used = new Uint8Array(windowMs);
  for (const [s, e] of busy) for (let t = s; t < Math.min(e, windowMs); t++) used[t] = 1;
  return windowMs ? Math.floor(used.reduce((a, b) => a + b, 0) * 100 / windowMs) : 0;
}` },
    mcq: { q: 'ELU is 0.98 and p99 lag is 400 ms. Best next step?', options: ['Raise UV_THREADPOOL_SIZE', 'Profile CPU: the JS thread is saturated; optimise hot code or add processes/workers', 'Add more RAM', 'Switch to setImmediate'], answer: 1, explain: 'ELU near 1 means the loop is almost never idle: JS work is the bottleneck.' },
    hints: [
      `<p>Hint 1: Clip each interval to the window: <code>max(0, min(end, W) − max(start, 0))</code>.</p>`,
      `<p>Hint 2: Sum the clipped lengths (intervals do not overlap, so no double counting).</p>`,
      `<p>Hint 3: <code>Math.floor(total * 100 / W)</code>, with W = 0 handled first.</p>`
    ],
    tests: { sig: 'int int[][] -> int', fn: 'elu', cases: [
      [[100, [[0, 25], [50, 75]]], 50], [[100, []], 0], [[1000, [[0, 1000]]], 100], [[100, [[90, 150]]], 10],
      [[3, [[0, 1]]], 33], [[0, []], 0], [[200, [[10, 11]]], 0], [[100, [[100, 200]]], 0]
    ] },
    solution: {
      approach: `<p>Clip and sum. This is what <code>performance.eventLoopUtilization()</code> reports, computed from active vs idle time.</p>`,
      code: { lang: 'js', run: true, code: R`function elu(windowMs, busy) {
  if (windowMs <= 0) return 0;
  let active = 0;
  for (const [start, end] of busy) {
    active += Math.max(0, Math.min(end, windowMs) - Math.max(start, 0));   // clipped length
  }
  return Math.floor((active * 100) / windowMs);
}
console.log(elu(100, [[0, 25], [50, 75]]));   // 50` },
      dry: { head: ['interval', 'clipped', 'active'], rows: [['[0,25)', '25', '25'], ['[50,75)', '25', '50'], ['result', '50·100/100', '<span class="c-g">50</span>']] },
      complexity: `<p>O(k) for k intervals, O(1) memory.</p>`
    }
  });

  practice.push({
    title: 'Line splitter Transform across chunk boundaries',
    level: 'Medium', tags: ['node', 'streams', 'transform', 'strings'], companies: ['Elastic', 'Splunk', 'Sumo Logic'],
    statement: `<p>A log stream arrives as text chunks that can cut lines anywhere (even between <code>\\r</code> and <code>\\n</code>). Implement <code>splitLines(chunks)</code> returning the complete lines in order, the way a line-splitting Transform's <code>transform()</code> + <code>flush()</code> would: lines end at <code>\\n</code>, a trailing <code>\\r</code> before it is removed, and a final unterminated line is emitted at the end (if non-empty).</p>`,
    constraints: `<p>Up to 10<sup>5</sup> chunks, total length ≤ 10<sup>7</sup>.</p>`,
    example: `<p><code>["ab\\r", "\\ncd\\nef", "", "g\\n"]</code> → ${H.c('g', '["ab", "cd", "efg"]')}: "ab\\r" waits for its "\\n"; "ef" waits for "g\\n".</p>`,
    brute: { why: `<p>Splitting each chunk on its own emits half-lines ("ef" and "g" separately) and leaves stray "\\r". Concatenating everything first defeats streaming (memory = whole file).</p>`, code: R`function splitLinesWrong(chunks) {
  return chunks.flatMap((c) => c.split('\n')).filter((l) => l !== '');   // breaks lines at chunk edges
}` },
    mcq: { q: 'What state must a line-splitting Transform keep between chunks?', options: ['Nothing', 'The unfinished tail after the last \\n', 'All previous lines', 'The byte offset only'], answer: 1, explain: 'Only the partial last line needs to survive to the next chunk; flush() emits it at the end.' },
    hints: [
      `<p>Hint 1: Keep a <code>tail</code> string. For each chunk: <code>(tail + chunk).split('\\n')</code>; the last piece becomes the new tail.</p>`,
      `<p>Hint 2: Every other piece is a full line; strip one trailing <code>\\r</code>.</p>`,
      `<p>Hint 3: After all chunks (flush), emit the tail if it is not empty (also stripping <code>\\r</code>). Empty lines between two <code>\\n</code> are real lines and must be kept.</p>`
    ],
    tests: { sig: 'string[] -> string[]', fn: 'splitLines', cases: [
      [[['ab\r', '\ncd\nef', '', 'g\n']], ['ab', 'cd', 'efg']],
      [[[]], []],
      [[['hello']], ['hello']],
      [[['a\nb\n']], ['a', 'b']],
      [[['\n\n']], ['', '']],
      [[['x', 'y', 'z\r\n', 'w']], ['xyz', 'w']],
      [[['a\r\nb\r', '\n']], ['a', 'b']]
    ] },
    solution: {
      approach: `<p>Carry the partial tail between chunks; everything before the last newline is complete. This is the body of a real <code>Transform</code>: <code>transform</code> pushes complete lines, <code>flush</code> pushes the tail.</p>`,
      code: { lang: 'js', run: true, code: R`function splitLines(chunks) {
  const out = [];
  let tail = '';
  const clean = (line) => (line.endsWith('\r') ? line.slice(0, -1) : line);
  for (const chunk of chunks) {               // transform(chunk)
    const parts = (tail + chunk).split('\n');
    tail = parts.pop();                       // unfinished line (maybe '')
    for (const p of parts) out.push(clean(p));
  }
  if (tail.length) out.push(clean(tail));     // flush()
  return out;
}
console.log(splitLines(['ab\r', '\ncd\nef', '', 'g\n']));
// As a real stream: new Transform({ readableObjectMode: true, transform(c, e, cb) { ... }, flush(cb) { ... } })` },
      dry: { head: ['chunk', 'tail + chunk', 'emitted', 'new tail'], rows: [['"ab\\r"', '"ab\\r"', '—', '"ab\\r"'], ['"\\ncd\\nef"', '"ab\\r\\ncd\\nef"', 'ab, cd', '"ef"'], ['""', '"ef"', '—', '"ef"'], ['"g\\n"', '"efg\\n"', 'efg', '""']] },
      complexity: `<p>O(total length); memory O(longest line). Note: <code>tail + chunk</code> re-copies a very long unfinished line each time; a production splitter scans with indexOf from the old tail length.</p>`
    }
  });

  practice.push({
    title: 'node_modules lookup paths',
    level: 'Medium', tags: ['node', 'modules', 'commonjs', 'paths'], companies: ['Vercel', 'Microsoft', 'Netlify'],
    statement: `<p>Implement <code>nodeModulesPaths(dir)</code>: the list of folders <code>require('pkg')</code> searches from a file in absolute POSIX directory <code>dir</code> (like <code>Module._nodeModulePaths</code>). Walk from <code>dir</code> up to <code>/</code>, appending <code>/node_modules</code> to each directory — but skip directories whose last segment is itself <code>node_modules</code> (no <code>node_modules/node_modules</code>).</p>`,
    constraints: `<p><code>dir</code> starts with <code>/</code>, has no trailing slash (except <code>"/"</code> itself), ≤ 100 segments.</p>`,
    example: `<p><code>/home/u/app/node_modules/pkg/lib</code> → <code>…/pkg/lib/node_modules</code>, <code>…/pkg/node_modules</code>, ${H.c('g', '/home/u/app/node_modules')} (not <code>…/node_modules/node_modules</code>), <code>/home/u/node_modules</code>, <code>/home/node_modules</code>, <code>/node_modules</code>.</p>`,
    brute: { why: `<p>Appending <code>/node_modules</code> to every ancestor produces bogus <code>…/node_modules/node_modules</code> entries: extra failed <code>stat</code> calls on every require during startup.</p>`, code: R`function pathsNaive(dir) {
  const parts = dir.split('/').filter(Boolean), out = [];
  for (let i = parts.length; i >= 0; i--) out.push('/' + parts.slice(0, i).concat('node_modules').join('/'));
  return out;
}` },
    mcq: { q: 'A package at <code>/app/node_modules/a</code> requires <code>b</code>. Which folder is checked first?', options: ['/app/node_modules', '/app/node_modules/a/node_modules', '/node_modules', 'The global npm folder'], answer: 1, explain: 'The nearest node_modules wins: that is how nested (conflicting) versions work.' },
    hints: [
      `<p>Hint 1: Split into segments; for i from n down to 0, the ancestor is the first i segments.</p>`,
      `<p>Hint 2: Skip i when segment i−1 equals <code>node_modules</code>.</p>`,
      `<p>Hint 3: Build each entry as <code>'/' + segs.slice(0, i).concat('node_modules').join('/')</code>; i = 0 gives <code>/node_modules</code>.</p>`
    ],
    tests: { sig: 'string -> string[]', fn: 'nodeModulesPaths', cases: [
      [['/home/u/app/node_modules/pkg/lib'], ['/home/u/app/node_modules/pkg/lib/node_modules', '/home/u/app/node_modules/pkg/node_modules', '/home/u/app/node_modules', '/home/u/node_modules', '/home/node_modules', '/node_modules']],
      [['/'], ['/node_modules']],
      [['/node_modules/a'], ['/node_modules/a/node_modules', '/node_modules']],
      [['/a'], ['/a/node_modules', '/node_modules']],
      [['/a/b/c'], ['/a/b/c/node_modules', '/a/b/node_modules', '/a/node_modules', '/node_modules']],
      [['/x/node_modules/node_modules'], ['/x/node_modules', '/node_modules']],
      [['/x/node_modules/@s/p/node_modules/q'], ['/x/node_modules/@s/p/node_modules/q/node_modules', '/x/node_modules/@s/p/node_modules', '/x/node_modules/@s/node_modules', '/x/node_modules', '/node_modules']]
    ] },
    solution: {
      approach: `<p>Generate every ancestor from deepest to root and filter out the ones ending in <code>node_modules</code>. Matches Node's output, including scoped packages (<code>@scope/name</code>).</p>`,
      code: { lang: 'js', run: true, code: R`function nodeModulesPaths(dir) {
  const segs = dir.split('/').filter(Boolean);
  const out = [];
  for (let i = segs.length; i >= 0; i--) {
    if (i > 0 && segs[i - 1] === 'node_modules') continue;   // no node_modules/node_modules
    out.push('/' + segs.slice(0, i).concat('node_modules').join('/'));
  }
  return out;
}
console.log(nodeModulesPaths('/home/u/app/node_modules/pkg/lib'));
// Compare: require('node:module')._nodeModulePaths(dir) — undocumented, same answer` },
      dry: { head: ['i', 'ancestor', 'kept?'], rows: [['3', '/a/b/c', '/a/b/c/node_modules'], ['2', '/a/b', '/a/b/node_modules'], ['1', '/a', '/a/node_modules'], ['0', '/', '/node_modules']] },
      complexity: `<p>O(d²) string building for depth d (fine for d ≤ 100); O(d) with incremental prefixes.</p>`
    }
  });

  practice.push({
    title: 'Resolve a relative require(): files, extensions, main, index',
    level: 'Medium', tags: ['node', 'modules', 'commonjs', 'resolution'], companies: ['Shopify', 'Atlassian', 'GitHub'],
    statement: `<p>Given an absolute path X (already joined with the requiring file's directory), the set of existing files, and package.json <code>main</code> fields as <code>"dir=main"</code> strings, return what <code>require(X)</code> loads:</p>
<ol><li>LOAD_AS_FILE(X): X, X.js, X.json, X.node — first that exists.</li>
<li>If X has a package.json main M: LOAD_AS_FILE(X/M), then LOAD_INDEX(X/M) (strip a leading <code>./</code> from M).</li>
<li>LOAD_INDEX(X): X/index.js, X/index.json, X/index.node.</li>
<li>Else <code>"MODULE_NOT_FOUND"</code>.</li></ol>`,
    constraints: `<p>≤ 10<sup>4</sup> files; paths are normalised POSIX paths.</p>`,
    example: `<p><code>X="/p/lib"</code>, files <code>["/p/lib/index.js", "/p/lib/main.js"]</code>, mains <code>["/p/lib=./main.js"]</code> → ${H.c('g', '/p/lib/main.js')}: main beats index. If main pointed to a missing file, Node falls back to index.js (with a deprecation warning).</p>`,
    brute: { why: `<p>Checking index.js first (or ignoring main) loads the wrong entry point for packages whose code lives in <code>dist/</code>; checking extensions in the wrong order makes <code>a.json</code> shadow <code>a.js</code>.</p>`, code: R`function resolveWrong(x, files) {
  const have = new Set(files);
  return [x + '/index.js', x + '.js', x].find((f) => have.has(f)) || 'MODULE_NOT_FOUND';
}` },
    mcq: { q: 'Both <code>/p/a.js</code> and <code>/p/a.json</code> exist. <code>require(\'./a\')</code> loads…', options: ['/p/a.json', '/p/a.js', 'both', 'it throws'], answer: 1, explain: 'Extensions are tried in the order .js, .json, .node.' },
    hints: [
      `<p>Hint 1: Put files in a Set and parse mains into a Map dir → main.</p>`,
      `<p>Hint 2: Write <code>asFile(p)</code> and <code>asIndex(p)</code> helpers that return the first existing candidate or null.</p>`,
      `<p>Hint 3: Order: asFile(X) → (main ? asFile(X/M) || asIndex(X/M)) → asIndex(X) → not found.</p>`
    ],
    tests: { sig: 'string string[] string[] -> string', fn: 'resolveFile', cases: [
      [['/p/lib', ['/p/lib/index.js', '/p/lib/main.js'], ['/p/lib=./main.js']], '/p/lib/main.js'],
      [['/p/a', ['/p/a.js', '/p/a.json'], []], '/p/a.js'],
      [['/p/a', ['/p/a.json'], []], '/p/a.json'],
      [['/p/a.js', ['/p/a.js.js', '/p/a.js'], []], '/p/a.js'],
      [['/p/d', ['/p/d/index.json'], []], '/p/d/index.json'],
      [['/p/d', ['/p/d/lib/start.js'], ['/p/d=lib/start']], '/p/d/lib/start.js'],
      [['/p/x', [], []], 'MODULE_NOT_FOUND'],
      [['/p/d', ['/p/d/index.js'], ['/p/d=missing.js']], '/p/d/index.js'],
      [['/p/d', ['/p/d/lib/index.js'], ['/p/d=lib']], '/p/d/lib/index.js']
    ] },
    solution: {
      approach: `<p>A direct transcription of the LOAD_AS_FILE / LOAD_AS_DIRECTORY pseudocode in Node's modules documentation, with Sets/Maps standing in for <code>fs.statSync</code> and package.json reads.</p>`,
      code: { lang: 'js', run: true, code: R`function resolveFile(x, files, mains) {
  const have = new Set(files);
  const main = new Map(mains.map((m) => { const i = m.indexOf('='); return [m.slice(0, i), m.slice(i + 1)]; }));
  const first = (cands) => cands.find((c) => have.has(c)) || null;
  const asFile = (p) => first([p, p + '.js', p + '.json', p + '.node']);
  const asIndex = (p) => first([p + '/index.js', p + '/index.json', p + '/index.node']);

  const file = asFile(x);
  if (file) return file;
  if (main.has(x)) {
    const m = x + '/' + main.get(x).replace(/^\.\//, '');
    const viaMain = asFile(m) || asIndex(m);
    if (viaMain) return viaMain;                 // else: deprecated fallback to index below
  }
  return asIndex(x) || 'MODULE_NOT_FOUND';
}
console.log(resolveFile('/p/lib', ['/p/lib/index.js', '/p/lib/main.js'], ['/p/lib=./main.js']));` },
      dry: { head: ['step', 'candidates', 'hit'], rows: [['asFile(/p/lib)', '/p/lib, .js, .json, .node', '—'], ['main = main.js', '/p/lib/main.js', '<span class="c-g">/p/lib/main.js</span>']] },
      complexity: `<p>O(F + M) to build the lookups, then O(1) per candidate (at most 13).</p>`
    }
  });

  practice.push({
    title: 'Event-loop delay percentiles (like monitorEventLoopDelay)',
    level: 'Medium', tags: ['node', 'performance', 'percentiles'], companies: ['Datadog', 'Grafana Labs', 'Swiggy'],
    statement: `<p>Given lag samples in ms, return <code>[min, p50, p99, max]</code> using the <b>nearest-rank</b> method: the p-th percentile is the element at 1-based rank <code>ceil(p/100 × n)</code> of the sorted samples. Return <code>[0,0,0,0]</code> for no samples.</p>`,
    constraints: `<p>0 ≤ n ≤ 10<sup>6</sup>, 0 ≤ sample ≤ 10<sup>9</sup>.</p>`,
    example: `<p><code>[10, 10, 10, 1000]</code> → ${H.c('g', '[10, 10, 1000, 1000]')}: the median looks healthy, but p99 reveals the one 1-second stall — why dashboards alert on p99, not on the mean (257.5 here, which matches no real request).</p>`,
    brute: { why: `<p>Reporting only the average hides tail latency, and using <code>sort()</code> without a comparator sorts numbers as strings ([10, 1000, 9] → [10, 1000, 9]).</p>`, code: R`function statsWrong(samples) {
  const s = samples.slice().sort();                    // string sort!
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  return [s[0], avg, avg, s[s.length - 1]];
}` },
    mcq: { q: 'Why does <code>[10, 9, 1000].sort()</code> give a wrong numeric order?', options: ['sort is unstable', 'The default comparator compares string forms', 'sort only works on strings', 'It sorts descending'], answer: 1, explain: 'Without a comparator, elements are converted to strings and compared by UTF-16 code units: "1000" < "9".' },
    hints: [
      `<p>Hint 1: Copy and sort numerically: <code>slice().sort((a, b) =&gt; a - b)</code>.</p>`,
      `<p>Hint 2: rank = <code>Math.ceil(p / 100 * n)</code>, index = rank − 1 (clamp to 0).</p>`,
      `<p>Hint 3: Handle n = 0 first. For huge n, a histogram (like HDR) or quickselect avoids the full sort.</p>`
    ],
    tests: { sig: 'int[] -> int[]', fn: 'delayStats', cases: [
      [[[5, 1, 3, 2, 4]], [1, 3, 5, 5]], [[[]], [0, 0, 0, 0]], [[[7]], [7, 7, 7, 7]],
      [[{ $range: [1, 101] }], [1, 50, 99, 100]], [[[10, 10, 10, 1000]], [10, 10, 1000, 1000]], [[[2, 1]], [1, 1, 2, 2]],
      [[{ $range: [9999, -1, -1] }], [0, 4999, 9899, 9999]]
    ] },
    solution: {
      approach: `<p>Numeric sort plus nearest-rank lookup. <code>monitorEventLoopDelay</code> keeps an HDR histogram instead, so percentiles cost O(buckets) and memory stays constant.</p>`,
      code: { lang: 'js', run: true, code: R`function delayStats(samples) {
  const n = samples.length;
  if (n === 0) return [0, 0, 0, 0];
  const s = samples.slice().sort((a, b) => a - b);     // numeric comparator!
  const pct = (p) => s[Math.max(0, Math.ceil((p / 100) * n) - 1)];
  return [s[0], pct(50), pct(99), s[n - 1]];
}
console.log(delayStats([10, 10, 10, 1000]));   // [10, 10, 1000, 1000]` },
      dry: { head: ['sorted', 'p50 rank', 'p99 rank', 'result'], rows: [['[1,2,3,4,5]', 'ceil(2.5)=3 → 3', 'ceil(4.95)=5 → 5', '[1,3,5,5]'], ['[10,10,10,1000]', 'ceil(2)=2 → 10', 'ceil(3.96)=4 → 1000', '[10,10,1000,1000]']] },
      complexity: `<p>O(n log n) time, O(n) memory.</p>`
    }
  });

  practice.push({
    title: 'Stateful run-length encoding Transform',
    level: 'Medium', tags: ['node', 'streams', 'transform', 'compression'], companies: ['Dropbox', 'Box', 'Hotstar'],
    statement: `<p>Implement <code>rleStream(chunks)</code>: the concatenated output of a run-length-encoding Transform fed these string chunks. Output each run as <code>count + char</code> (e.g. <code>"aaab"</code> → <code>"3a1b"</code>). Runs can span chunk boundaries and must not be split. Empty chunks are allowed.</p>`,
    constraints: `<p>Chunks contain only letters (no digits). Total length ≤ 10<sup>7</sup>.</p>`,
    example: `<p><code>["aab", "bbc", "", "c"]</code> → ${H.c('g', '"2a3b2c"')}. Encoding each chunk separately would give "2a1b" + "2b1c" + "1c" — runs split at the boundaries.</p>`,
    brute: { why: `<p>Encoding chunk by chunk is stateless and wrong at boundaries; joining all chunks first is correct but holds the whole input in memory.</p>`, code: R`function rlePerChunk(chunks) {
  return chunks.map((c) => c.replace(/(.)\1*/g, (run) => run.length + run[0])).join('');
}` },
    mcq: { q: 'Why does this Transform need a <code>flush()</code>?', options: ['To close the file', 'The last run is still pending in state when the input ends', 'To reset highWaterMark', 'It does not'], answer: 1, explain: 'A run is only known to be finished when a different character or end-of-input arrives; flush() handles end-of-input.' },
    hints: [
      `<p>Hint 1: Keep state across chunks: the current char and its count.</p>`,
      `<p>Hint 2: For each character: same as current → count++; otherwise emit the finished run and start a new one.</p>`,
      `<p>Hint 3: At the end (flush) emit the pending run if count &gt; 0. Build output in an array and join once.</p>`
    ],
    tests: { sig: 'string[] -> string', fn: 'rleStream', cases: [
      [[['aab', 'bbc', '', 'c']], '2a3b2c'], [[[]], ''], [[['a']], '1a'], [[['aaaa', 'aaaaaa']], '10a'],
      [[['ab', 'ba']], '1a2b1a'], [[['', '']], ''], [[[{ $rep: 'z', n: 100000 }]], '100000z']
    ] },
    solution: {
      approach: `<p>Keep <code>(ch, count)</code> as Transform state. Emitting only completed runs in <code>transform()</code> and the last one in <code>flush()</code> makes the output identical to encoding the whole input at once.</p>`,
      code: { lang: 'js', run: true, code: R`function rleStream(chunks) {
  const out = [];
  let ch = '', count = 0;                    // state that survives between chunks
  for (const chunk of chunks) {              // transform(chunk)
    for (const c of chunk) {
      if (c === ch) count++;
      else {
        if (count) out.push(count + ch);     // previous run is complete
        ch = c; count = 1;
      }
    }
  }
  if (count) out.push(count + ch);           // flush()
  return out.join('');
}
console.log(rleStream(['aab', 'bbc', '', 'c']));   // 2a3b2c` },
      dry: { head: ['chunk', 'emitted', 'state after'], rows: [['aab', '2a', 'b×1'], ['bbc', '3b', 'c×1'], ['""', '—', 'c×1'], ['c', '—', 'c×2'], ['flush', '2c', '—']] },
      complexity: `<p>O(total length) time; O(1) state besides the output.</p>`
    }
  });

  practice.push({
    title: 'cluster round-robin with crashes and re-forks',
    level: 'Medium', tags: ['node', 'cluster', 'scheduling', 'simulation'], companies: ['Uber', 'Ola', 'PayPal'],
    statement: `<p>Model the cluster primary's round-robin scheduler. Workers <code>1..n</code> start in a ring in id order. Process events:</p>
<ul><li><code>req</code> → hand the connection to the next worker in ring order after the previous one served (start with the first); output <code>"wK"</code>, or <code>"503"</code> if no workers are alive.</li>
<li><code>crash K</code> → remove worker K from the ring; output <code>"exit wK"</code> (or <code>"noop wK"</code> if K is not alive). Round-robin continues with the worker that would have been next.</li>
<li><code>fork</code> → add a new worker with the next unused id at the end of the ring; output <code>"fork wK"</code>.</li></ul>`,
    constraints: `<p>1 ≤ n ≤ 1000, ≤ 10<sup>5</sup> events.</p>`,
    example: `<p><code>n=3: req, crash 2, req, req</code> → w1, exit w2, ${H.c('g', 'w3')}, w1 — after w1 served, w2 would be next but died, so w3 takes the next connection.</p>`,
    brute: { why: `<p>Picking <code>workers[counter % n]</code> with the original n keeps routing to dead workers (or crashes on undefined) after a worker exits.</p>`, code: R`function routeNaive(n, events) {
  let c = 0;
  return events.map((e) => (e === 'req' ? 'w' + ((c++ % n) + 1) : e));   // ignores crashes
}` },
    mcq: { q: 'In cluster round-robin mode, who calls <code>accept()</code> on new TCP connections?', options: ['Each worker independently', 'The primary, which then sends the handle to a worker', 'The kernel picks a worker', 'A load balancer outside Node'], answer: 1, explain: 'SCHED_RR (default except on Windows): the primary accepts and distributes; SCHED_NONE leaves accept() to the workers and the OS.' },
    hints: [
      `<p>Hint 1: Keep the ring as an array and a cursor = index of the next worker to serve.</p>`,
      `<p>Hint 2: On req: <code>cursor %= ring.length</code>, serve <code>ring[cursor]</code>, cursor++.</p>`,
      `<p>Hint 3: On crash at index i: splice it out and, if i &lt; cursor, decrement cursor so you do not skip a worker.</p>`
    ],
    tests: { sig: 'int string[] -> string[]', fn: 'clusterRoute', cases: [
      [[3, ['req', 'req', 'req', 'req']], ['w1', 'w2', 'w3', 'w1']],
      [[3, ['req', 'crash 2', 'req', 'req']], ['w1', 'exit w2', 'w3', 'w1']],
      [[1, ['crash 1', 'req', 'fork', 'req']], ['exit w1', '503', 'fork w2', 'w2']],
      [[2, ['req', 'req', 'crash 1', 'req', 'fork', 'req', 'req']], ['w1', 'w2', 'exit w1', 'w2', 'fork w3', 'w3', 'w2']],
      [[2, []], []],
      [[2, ['crash 5', 'req']], ['noop w5', 'w1']],
      [[3, ['req', 'crash 1', 'req']], ['w1', 'exit w1', 'w2']]
    ] },
    solution: {
      approach: `<p>An array ring with a cursor. Removing an element before the cursor shifts later ones left, so the cursor moves back one to keep pointing at the same "next" worker.</p>`,
      code: { lang: 'js', run: true, code: R`function clusterRoute(n, events) {
  const ring = Array.from({ length: n }, (_, i) => i + 1);
  let cursor = 0, nextId = n + 1;
  const out = [];
  for (const ev of events) {
    const [kind, arg] = ev.split(' ');
    if (kind === 'req') {
      if (ring.length === 0) { out.push('503'); continue; }
      cursor %= ring.length;
      out.push('w' + ring[cursor]);
      cursor++;
    } else if (kind === 'crash') {
      const id = Number(arg), i = ring.indexOf(id);
      if (i < 0) { out.push('noop w' + id); continue; }
      ring.splice(i, 1);
      if (i < cursor) cursor--;                 // keep pointing at the same next worker
      out.push('exit w' + id);
    } else if (kind === 'fork') {
      ring.push(nextId);                        // cluster.on('exit', () => cluster.fork())
      out.push('fork w' + nextId++);
    }
  }
  return out;
}
console.log(clusterRoute(3, ['req', 'crash 2', 'req', 'req']));` },
      dry: { head: ['event', 'ring', 'cursor', 'out'], rows: [['req', '[1,2,3]', '0→1', 'w1'], ['crash 2', '[1,3]', '1', 'exit w2'], ['req', '[1,3]', '1→2', 'w3'], ['req', '[1,3]', '0→1', 'w1']] },
      complexity: `<p>O(n) per crash (indexOf + splice), O(1) per req/fork.</p>`
    }
  });

  var EXPORTS_PKG = '{".":{"node":{"import":"./n.mjs","default":"./n.cjs"},"default":"./b.js"},"./feature/*":"./src/feature/*.js","./feature/a/*":"./special/*.js","./internal/*":null,"./package.json":"./package.json"}';
  practice.push({
    title: 'Resolve package.json "exports" with conditions and patterns',
    level: 'Hard', tags: ['node', 'modules', 'esm', 'package.json'], companies: ['Vercel', 'Microsoft', 'Cloudflare'],
    statement: `<p>Implement <code>resolveExports(exportsJson, subpath, conditions)</code> for Node's package <code>exports</code> field. <code>subpath</code> is <code>"."</code> or starts with <code>"./"</code>; <code>conditions</code> are the active condition names (<code>"default"</code> is always active). Rules:</p>
<ul><li>If exports is a string, or an object with no keys starting with ".", it is the target for <code>"."</code> only.</li>
<li>An exact key match wins. Otherwise consider keys with exactly one <code>*</code>: a key matches if the subpath starts with the part before * and ends with the part after (and is at least as long as the key). Prefer the longest prefix before *, then the longer key. The matched middle replaces every * in the target.</li>
<li>A target that is an object is a condition map: walk its keys <b>in order</b> and take the first active condition whose (recursively resolved) target is valid. <code>null</code> blocks the path.</li>
<li>Return the target string, or <code>"ERR_PACKAGE_PATH_NOT_EXPORTED"</code>.</li></ul>`,
    constraints: `<p>No array targets. JSON ≤ 10 KB.</p>`,
    example: `<p>With <code>{"./feature/*": "./src/feature/*.js", "./feature/a/*": "./special/*.js"}</code>, <code>./feature/a/b</code> → ${H.c('g', './special/b.js')} (longer prefix wins) and <code>./feature/x/y</code> → <code>./src/feature/x/y.js</code>. Condition objects are ordered: <code>{"default": …, "import": …}</code> always picks default.</p>`,
    brute: { why: `<p>Ignoring condition order (picking "import" because it is "more specific") or trying patterns in key order gives answers different from Node's — the source of many "works with require, fails with import" bugs.</p>`, code: R`function resolveExportsNaive(json, subpath) {
  const exp = JSON.parse(json);
  const t = typeof exp === 'string' ? exp : exp[subpath];
  return typeof t === 'string' ? t : 'ERR_PACKAGE_PATH_NOT_EXPORTED';   // no conditions, no patterns
}` },
    mcq: { q: 'Exports <code>{".": {"default": "./d.js", "import": "./m.mjs"}}</code> loaded via <code>import</code>. Result?', options: ['./m.mjs because import is more specific', './d.js because condition keys are checked in object order', 'An error', 'Both'], answer: 1, explain: 'Node walks the condition object in insertion order; "default" always matches, so anything after it is unreachable. Put default last.' },
    hints: [
      `<p>Hint 1: Normalise first: a string or a conditions-only object becomes <code>{ ".": exports }</code>.</p>`,
      `<p>Hint 2: Write <code>target(t, star)</code>: string → replace * with star; null → blocked; object → first active condition with a defined result.</p>`,
      `<p>Hint 3: Pattern match: for keys with one *, check prefix/suffix and length; keep the best by (prefix length, key length). Then call target with the captured middle.</p>`
    ],
    tests: { sig: 'string string string[] -> string', fn: 'resolveExports', cases: [
      [[EXPORTS_PKG, '.', ['node', 'import']], './n.mjs'],
      [[EXPORTS_PKG, '.', ['node', 'require']], './n.cjs'],
      [[EXPORTS_PKG, '.', ['browser']], './b.js'],
      [[EXPORTS_PKG, './feature/a/b', ['node']], './special/b.js'],
      [[EXPORTS_PKG, './feature/x/y', ['node']], './src/feature/x/y.js'],
      [[EXPORTS_PKG, './internal/x', ['node']], 'ERR_PACKAGE_PATH_NOT_EXPORTED'],
      [[EXPORTS_PKG, './package.json', []], './package.json'],
      [[EXPORTS_PKG, './missing', []], 'ERR_PACKAGE_PATH_NOT_EXPORTED'],
      [['"./index.js"', '.', []], './index.js'],
      [['"./index.js"', './index.js', []], 'ERR_PACKAGE_PATH_NOT_EXPORTED'],
      [['{"import":"./m.mjs","default":"./d.js"}', '.', ['require']], './d.js'],
      [['{".":{"default":"./d.js","import":"./m.mjs"}}', '.', ['import']], './d.js'],
      [['{".":{"import":"./m.mjs"}}', '.', ['require']], 'ERR_PACKAGE_PATH_NOT_EXPORTED']
    ] },
    solution: {
      approach: `<p>Follow Node's PACKAGE_EXPORTS_RESOLVE: normalise sugar, exact match, else best pattern match by prefix length, then resolve the target recursively through ordered condition maps. Results were checked against real Node 22 with <code>import.meta.resolve</code> and <code>require.resolve</code>.</p>`,
      code: { lang: 'js', run: true, code: R`function resolveExports(exportsJson, subpath, conditions) {
  const NOT = 'ERR_PACKAGE_PATH_NOT_EXPORTED';
  const active = new Set([...conditions, 'default']);
  let exp = JSON.parse(exportsJson);
  const isSubpathMap = exp && typeof exp === 'object' && Object.keys(exp).some((k) => k.startsWith('.'));
  if (!isSubpathMap) exp = { '.': exp };                 // sugar: exports = target of "."

  function target(t, star) {                             // undefined = no match, null = blocked
    if (typeof t === 'string') return star === null ? t : t.split('*').join(star);
    if (t === null) return null;
    if (typeof t === 'object' && !Array.isArray(t)) {
      for (const key of Object.keys(t)) {                // ORDER matters
        if (!active.has(key)) continue;
        const r = target(t[key], star);
        if (r !== undefined) return r;
      }
    }
    return undefined;
  }

  let result;
  if (Object.hasOwn(exp, subpath) && !subpath.includes('*')) {
    result = target(exp[subpath], null);
  } else {
    let bestKey = null, bestStar = null;
    for (const key of Object.keys(exp)) {
      const s = key.indexOf('*');
      if (s < 0 || key.indexOf('*', s + 1) >= 0) continue;
      const pre = key.slice(0, s), suf = key.slice(s + 1);
      if (subpath.length < key.length || !subpath.startsWith(pre) || !subpath.endsWith(suf)) continue;
      const bestPre = bestKey === null ? -1 : bestKey.indexOf('*');
      if (pre.length > bestPre || (pre.length === bestPre && key.length > bestKey.length)) {
        bestKey = key;
        bestStar = subpath.slice(pre.length, subpath.length - suf.length);
      }
    }
    if (bestKey === null) return NOT;
    result = target(exp[bestKey], bestStar);
  }
  return typeof result === 'string' ? result : NOT;
}
const pkg = '{".":{"node":{"import":"./n.mjs","default":"./n.cjs"},"default":"./b.js"},"./feature/*":"./src/feature/*.js"}';
console.log(resolveExports(pkg, '.', ['node', 'import']), resolveExports(pkg, './feature/x', ['node']));` },
      dry: { head: ['subpath', 'matched key', 'conditions walk', 'result'], rows: [
        ['.', '"."', 'node ✓ → import ✓', './n.mjs'],
        ['./feature/a/b', '"./feature/a/*" (prefix 10 &gt; 8)', 'string, * = b', './special/b.js'],
        ['./internal/x', '"./internal/*"', 'null', '<span class="c-r">NOT_EXPORTED</span>']
      ] },
      complexity: `<p>O(K · L) for K keys and subpath length L, plus the size of the condition tree.</p>`
    }
  });

  practice.push({
    title: 'ES module evaluation order with cycles (and TDZ risks)',
    level: 'Hard', tags: ['node', 'esm', 'graphs', 'dfs'], companies: ['Google', 'Meta', 'Bloomberg'],
    statement: `<p>Each line <code>name: dep1 dep2 …</code> lists a module's static imports in order; the first line is the entry; a name without a line is a leaf module. ES modules evaluate in <b>post-order DFS</b> (dependencies first, each module once; a module already being visited is skipped). Return the evaluation order. If, when a module evaluates, any of its imports has <b>not yet been evaluated</b> (only possible in a cycle), append <code>" !dep"</code> for each such dep in import order — reading those bindings at top level would throw a TDZ ReferenceError.</p>`,
    constraints: `<p>≤ 10<sup>4</sup> modules and edges; the import chain may be 10<sup>4</sup> deep, so avoid deep recursion.</p>`,
    example: `<p><code>["main: a b", "a: b c", "b: a", "c:"]</code> → ${H.c('r', '"b !a"')}, "c", "a", "main". b runs before a (cycle a → b → a), so b must not read a's exports at top level.</p>`,
    brute: { why: `<p>Evaluating in import (pre-)order runs main first, before its dependencies — that is CommonJS-like execution, not ESM, and it hides which bindings are uninitialised.</p>`, code: R`function esmPreOrderWrong(lines) {
  return lines.map((l) => l.split(':')[0].trim());   // declaration order, not post-order
}` },
    mcq: { q: 'In ESM, b imports from a, a imports from b, entry is a. Which runs first?', options: ['a', 'b', 'Both in parallel', 'Neither: cycles are errors'], answer: 1, explain: 'DFS from a visits b; b\'s import of a is already in progress, so b finishes (evaluates) first.' },
    hints: [
      `<p>Hint 1: Three states per module: unvisited, visiting, evaluated. Post-order = evaluate after all deps were visited.</p>`,
      `<p>Hint 2: When evaluating X, any dep that is not "evaluated" yet (still visiting) gets a <code>!dep</code> mark.</p>`,
      `<p>Hint 3: Use an explicit stack of <code>[name, nextDepIndex]</code> frames so a 10<sup>4</sup>-deep chain does not overflow.</p>`
    ],
    tests: { sig: 'string[] -> string[]', fn: 'esmEvalOrder', cases: [
      [[['main: a b', 'a: b c', 'b: a', 'c:']], ['b !a', 'c', 'a', 'main']],
      [[['main:']], ['main']],
      [[['main: a b', 'a: c', 'b: c', 'c:']], ['c', 'a', 'b', 'main']],
      [[['main: main']], ['main !main']],
      [[['main: a', 'a: b', 'b: c', 'c: a']], ['c !a', 'b', 'a', 'main']],
      [[['main: x']], ['x', 'main']],
      [[['main: a b', 'a: b', 'b: a']], ['b !a', 'a', 'main']],
      [[['m: a b', 'a: b', 'b: a m']], ['b !a !m', 'a', 'm']]
    ] },
    solution: {
      approach: `<p>Iterative DFS with an explicit stack. A frame advances through its deps; unvisited deps are pushed; when a frame runs out of deps it is evaluated, and any dep not yet evaluated at that moment is a cycle edge whose binding is still in TDZ.</p>`,
      code: { lang: 'js', run: true, code: R`function esmEvalOrder(lines) {
  const deps = new Map();
  let entry = null;
  for (const line of lines) {
    const i = line.indexOf(':');
    const name = line.slice(0, i).trim();
    if (entry === null) entry = name;
    deps.set(name, line.slice(i + 1).trim().split(/\s+/).filter(Boolean));
  }
  const state = new Map();                       // 'visiting' | 'done'
  const order = [];
  const stack = [[entry, 0]];
  state.set(entry, 'visiting');
  while (stack.length) {
    const frame = stack[stack.length - 1];
    const list = deps.get(frame[0]) || [];
    if (frame[1] < list.length) {
      const d = list[frame[1]++];
      if (!state.has(d)) { state.set(d, 'visiting'); stack.push([d, 0]); }
      continue;
    }
    stack.pop();                                 // all deps visited: evaluate (post-order)
    const pending = list.filter((d) => state.get(d) !== 'done');
    state.set(frame[0], 'done');
    order.push(frame[0] + pending.map((d) => ' !' + d).join(''));
  }
  return order;
}
console.log(esmEvalOrder(['main: a b', 'a: b c', 'b: a', 'c:']));` },
      dry: { head: ['stack (top right)', 'action', 'order'], rows: [
        ['main', 'visit a', '—'], ['main a', 'visit b', '—'], ['main a b', 'dep a is visiting → skip', '—'],
        ['main a', 'evaluate b (a pending)', 'b !a'], ['main a c', 'evaluate c', 'b !a, c'], ['main', 'evaluate a', '…, a'], ['—', 'evaluate main', '…, main']
      ] },
      complexity: `<p>O(V + E) time and memory, no recursion.</p>`
    }
  });

  practice.push({
    title: 'Thread pool with arrival times: who waits and for how long?',
    level: 'Hard', tags: ['node', 'libuv', 'scheduling', 'heap'], companies: ['Amazon', 'Stripe', 'Razorpay'],
    statement: `<p>Pool work requests arrive over time as <code>[arrivalMs, durationMs]</code>. The pool has <code>size</code> threads and a FIFO queue ordered by arrival time (ties: input order). A request starts when it reaches the front and a thread is free (at the earliest at its arrival). Return each request's completion time, in input order.</p>`,
    constraints: `<p>1 ≤ size ≤ 1024, ≤ 10<sup>5</sup> jobs, 0 ≤ arrival ≤ 10<sup>9</sup>, 1 ≤ duration ≤ 10<sup>4</sup>. Inputs are not sorted.</p>`,
    example: `<p><code>size=2, jobs=[[0,50],[0,50],[10,20],[100,5]]</code> → ${H.c('g', '[50, 50, 70, 105]')}: job 2 arrives at 10 but both threads are busy until 50, so it waits 40 ms; job 3 arrives at 100 to an idle pool.</p>`,
    brute: { why: `<p>A per-millisecond simulation is O(time × size): hopeless for arrivals up to 10⁹ ms.</p>`, code: R`function poolArrivalsSlow(size, jobs) {
  const fin = Array(jobs.length).fill(0), left = jobs.map((j) => j[1]);
  const order = jobs.map((_, i) => i).sort((a, b) => jobs[a][0] - jobs[b][0] || a - b);
  const running = [];
  let next = 0, t = 0;
  while (next < order.length || running.length) {
    while (running.length < size && next < order.length && jobs[order[next]][0] <= t) running.push(order[next++]);
    t++;
    for (let k = running.length - 1; k >= 0; k--) if (--left[running[k]] === 0) { fin[running[k]] = t; running.splice(k, 1); }
  }
  return fin;
}` },
    mcq: { q: 'Why is "assign each request (in arrival order) to the thread that frees up first" correct for a FIFO pool?', options: ['It is only a heuristic', 'With FIFO order, the head request always takes the earliest-available thread, and start = max(free, arrival)', 'Because all durations are equal', 'Because threads are identical CPUs'], answer: 1, explain: 'FIFO means requests start in arrival order; each one gets whichever thread becomes free first.' },
    hints: [
      `<p>Hint 1: Sort job indices by (arrival, index); results go back by original index.</p>`,
      `<p>Hint 2: Keep threads' free times in a min-heap; for each job pop the minimum, start = max(min, arrival), push start + duration.</p>`,
      `<p>Hint 3: A JS MinHeap class of numbers (push/pop with sift up/down) keeps it O(J log S).</p>`
    ],
    tests: { sig: 'int int[][] -> int[]', fn: 'poolArrivals', cases: [
      [[2, [[0, 50], [0, 50], [10, 20], [100, 5]]], [50, 50, 70, 105]],
      [[1, [[5, 1], [0, 2]]], [6, 2]],
      [[3, []], []],
      [[4, [[0, 100], [0, 100], [0, 100], [0, 100], [0, 100], [0, 1]]], [100, 100, 100, 100, 200, 101]],
      [[2, [[10, 5], [10, 5], [10, 5]]], [15, 15, 20]],
      [[1, [[0, 10], [3, 1], [3, 1]]], [10, 11, 12]],
      [[1, { $rep: [0, 1], n: 50000 }], { $range: [1, 50001] }]
    ] },
    solution: {
      approach: `<p>FIFO list scheduling with release times. Sorting fixes the queue order; a min-heap of thread free times picks the earliest-available thread in O(log S).</p>`,
      code: { lang: 'js', run: true, code: R`class MinHeap {
  constructor() { this.a = []; }
  size() { return this.a.length; }
  push(v) {
    const a = this.a; a.push(v);
    for (let i = a.length - 1; i > 0;) {
      const p = (i - 1) >> 1;
      if (a[p] <= a[i]) break;
      [a[p], a[i]] = [a[i], a[p]]; i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l] < a[m]) m = l;
        if (r < a.length && a[r] < a[m]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top;
  }
}

function poolArrivals(size, jobs) {
  const order = jobs.map((_, i) => i).sort((x, y) => jobs[x][0] - jobs[y][0] || x - y);
  const threads = new MinHeap();
  for (let i = 0; i < size; i++) threads.push(0);
  const finish = new Array(jobs.length);
  for (const j of order) {
    const [arrival, duration] = jobs[j];
    const start = Math.max(threads.pop(), arrival);   // earliest free thread, not before arrival
    finish[j] = start + duration;
    threads.push(finish[j]);
  }
  return finish;
}
console.log(poolArrivals(2, [[0, 50], [0, 50], [10, 20], [100, 5]]));   // [50, 50, 70, 105]` },
      dry: { head: ['job (arr, dur)', 'heap before', 'start', 'finish'], rows: [
        ['0 (0,50)', '[0,0]', '0', '50'], ['1 (0,50)', '[0,50]', '0', '50'], ['2 (10,20)', '[50,50]', '50', '<span class="c-r">70</span>'], ['3 (100,5)', '[50,70]', '100', '105']
      ] },
      complexity: `<p>O(J log J + J log S) time, O(J + S) memory.</p>`
    }
  });

  /* ======================================================================
     QUIZ
     ====================================================================== */
  quiz.push(
    { q: 'Which library provides Node\'s event loop and thread pool?', options: ['V8', 'libuv', 'OpenSSL', 'c-ares'], answer: 1, explain: 'V8 runs JavaScript; libuv provides the loop (uv_run), non-blocking I/O via epoll/kqueue/IOCP, timers and the thread pool.' },
    { q: 'In which order does one lap of the Node event loop visit these phases?', options: ['poll → timers → check → close', 'timers → pending callbacks → poll → check → close', 'check → poll → timers → close', 'timers → check → poll → close'], answer: 1, explain: 'timers, pending callbacks, (idle/prepare), poll, check (setImmediate), close callbacks — then back to timers.' },
    { q: 'Inside an <code>fs.readFile</code> callback you call <code>setTimeout(a, 0)</code> and <code>setImmediate(b)</code>. Which runs first?', options: ['a, always', 'b, always', 'Random', 'Neither runs'], answer: 1, explain: 'The callback runs in poll; check (setImmediate) comes next in the same lap, timers only in the next lap.' },
    { q: 'A promise callback calls <code>process.nextTick(f)</code> in a CommonJS module. When does f run?', options: ['Before the promise callback returns', 'After every promise microtask currently queued has run', 'In the next timers phase', 'In the check phase'], answer: 1, explain: 'Node drains ticks, then all microtasks; ticks added during the microtask drain run when the microtask queue is empty.' },
    { q: 'Why can recursive <code>process.nextTick</code> calls freeze a server while recursive <code>setImmediate</code> calls do not?', options: ['nextTick is slower', 'The nextTick queue is drained until empty before the loop can continue, so I/O is never polled; immediates added during check wait for the next lap', 'setImmediate runs in another thread', 'They behave the same'], answer: 1, explain: 'Starvation: the drain loop never ends. setImmediate yields to poll between iterations.' },
    { q: 'Which of these does <b>not</b> use the libuv thread pool?', options: ['fs.readFile', 'dns.lookup', 'crypto.pbkdf2', 'Reading from a TCP socket'], answer: 3, explain: 'Sockets are non-blocking at the OS level and are watched by epoll/kqueue/IOCP in the poll phase.' },
    { q: 'Default libuv thread-pool size and how to change it?', options: ['1; cluster.setup()', '4; the UV_THREADPOOL_SIZE environment variable before the pool starts', 'Number of CPU cores; os.setThreads()', '16; --pool-size'], answer: 1, explain: 'Four threads by default, up to 1024, read once when the pool is first used.' },
    { q: '<code>writable.write(chunk)</code> returned <code>false</code>. What should the producer do?', options: ['Retry the same chunk', 'Stop writing and wait for the \'drain\' event', 'Call end()', 'Nothing, the chunk was dropped'], answer: 1, explain: 'The chunk was accepted and buffered; false means the buffer reached highWaterMark. Resume on drain.' },
    { q: 'Why prefer <code>stream.pipeline()</code> over <code>a.pipe(b).pipe(c)</code>?', options: ['pipe is deprecated and removed', 'pipeline forwards errors and destroys all streams on failure, avoiding leaks and silent errors', 'pipeline is synchronous', 'pipe does not support backpressure'], answer: 1, explain: 'pipe handles backpressure but not error propagation or cleanup.' },
    { q: 'What happens when an EventEmitter emits <code>\'error\'</code> and has no \'error\' listener?', options: ['Nothing; emit returns false', 'The error is thrown from emit()', 'It is logged as a warning', 'The listener is retried'], answer: 1, explain: 'The error event is special: without a listener, emit throws (crashing the process if uncaught).' },
    { q: 'Is <code>emitter.emit()</code> synchronous?', options: ['No, listeners run on the next tick', 'Yes, all listeners run in order before emit returns', 'Only for the error event', 'It depends on captureRejections'], answer: 1, explain: 'emit loops over a snapshot of the listeners and calls each one immediately.' },
    { q: 'After <code>port.postMessage(buf, [buf.buffer])</code>, the sender\'s <code>buf.byteLength</code> is…', options: ['unchanged', '0 (detached)', 'doubled', 'undefined because buf is deleted'], answer: 1, explain: 'Transfer moves the backing store; the sender\'s ArrayBuffer is detached.' },
    { q: 'You need to run a 2-second image resize per request without hurting other requests. Best fit?', options: ['Wrap it in an async function', 'worker_threads (a pool)', 'process.nextTick', 'Increase --max-old-space-size'], answer: 1, explain: 'CPU-bound JS needs another thread; async alone keeps it on the main thread.' },
    { q: 'CommonJS a.js requires b.js, which requires a.js. What does b get?', options: ['An error', 'a\'s partial module.exports as it is at that moment', 'a\'s final exports', 'undefined'], answer: 1, explain: 'a is cached before it runs; the cycle returns the half-filled exports object.' },
    { q: 'Which is true of ES module loading in Node?', options: ['Relative imports may omit the file extension', 'Imports are resolved and linked before any module code runs', 'Each import re-executes the module', 'require.cache controls ESM caching'], answer: 1, explain: 'ESM builds the whole graph (construction, linking) before evaluation; extensions are required and there is no require.cache.' },
    { q: 'heapUsed is flat but RSS keeps growing. The most likely place to look?', options: ['A closure leak in JS objects', 'Buffers / external memory / native allocations', 'The nextTick queue', 'Stack overflow'], answer: 1, explain: 'Buffer contents are external memory (memoryUsage().external / arrayBuffers), not heapUsed.' }
  );

  /* ======================================================================
     INTERVIEW
     ====================================================================== */
  interview.push(
    { q: 'Node.js is "single-threaded". Explain what that really means.', level: 'B',
      a: `<p>Your <b>JavaScript</b> runs on one main thread with one call stack and one event loop. But the process has more threads: libuv's <b>thread pool</b> (4 by default) for fs, <code>dns.lookup</code>, some crypto and zlib; V8's background threads for GC and compilation; and the kernel does network I/O asynchronously (epoll/kqueue/IOCP) without threads at all. So Node is "single-threaded for your code, concurrent for I/O". CPU-heavy JS still blocks everything, which is why <code>worker_threads</code> exist.</p>`,
      followUps: ['Which operations go to the thread pool?', 'How do you run JS on more than one core?'] },
    { q: 'Walk me through the phases of the Node.js event loop.', level: 'I',
      a: `<p>After the main module runs, <code>uv_run</code> loops: <b>timers</b> (expired setTimeout/setInterval), <b>pending callbacks</b> (some deferred system I/O callbacks), idle/prepare (internal), <b>poll</b> (wait for and run I/O callbacks; the loop sleeps here when idle, up to the next timer), <b>check</b> (setImmediate), <b>close callbacks</b> (\'close\' events). After <i>each</i> callback Node drains the nextTick queue, then promise microtasks. The loop exits when no referenced handles or requests remain.</p>`,
      followUps: ['Where does the loop block when idle?', 'What keeps a process alive?', 'Why is setTimeout(0) vs setImmediate racy at top level?'] },
    { q: 'process.nextTick vs setImmediate vs Promise.then — when would you use each?', level: 'I',
      a: `<p><code>process.nextTick</code>: run right after the current operation, before promises and any I/O — used to emit events or errors asynchronously after a constructor returns. <code>queueMicrotask</code>/promises: standard "after this, before anything else" scheduling. <code>setImmediate</code>: run after pending I/O, in the check phase — the right tool to yield inside long work. Recursive nextTick or microtasks starve I/O; recursive setImmediate does not. In an ES module\'s top level, promise callbacks run before nextTick.</p>`,
      followUps: ['Show a starvation example.', 'Why did Node docs recommend queueMicrotask over nextTick?'] },
    { q: 'Our API\'s file reads and outbound HTTP calls get slow during login bursts that hash passwords with bcrypt. CPU is not maxed. What is going on?', level: 'A',
      a: `<p>The libuv <b>thread pool</b> is saturated. Async bcrypt/pbkdf2 runs on the pool (4 threads); so do <code>fs</code> operations and <code>dns.lookup</code>, which HTTP clients call for hostnames. During a burst, file reads and DNS lookups queue behind hashes. Fixes: raise <code>UV_THREADPOOL_SIZE</code> (set in the environment, roughly cores for CPU work), move hashing to a <code>worker_threads</code> pool or a separate service, cache DNS results, and add metrics for pool-bound latency (fs/DNS timings) next to event-loop delay.</p>`,
      followUps: ['Why not set the pool to 256?', 'How would you prove the diagnosis?'] },
    { q: 'Explain backpressure in Node streams with an example of what goes wrong without it.', level: 'I',
      a: `<p>Backpressure is the signal from a slow consumer to a fast producer to pause. <code>write()</code> returns false once the writable\'s buffer reaches <code>highWaterMark</code>; the producer should wait for <code>\'drain\'</code>. <code>pipe</code>/<code>pipeline</code>/<code>for await</code> do this automatically. Without it — e.g. a loop that writes a 2 GB export to a slow client — every chunk accumulates in memory, RSS explodes, GC thrashes, and the process may be OOM-killed. With it, memory stays around a few highWaterMarks regardless of size.</p>`,
      followUps: ['What is the default highWaterMark?', 'How does objectMode change it?'] },
    { q: 'What is the difference between pipe() and pipeline()?', level: 'I',
      a: `<p>Both connect streams with backpressure. <code>pipe()</code> does not propagate errors: if the destination fails, the source keeps its file descriptor open and you must attach an error handler to every stream. <code>pipeline()</code> (callback or <code>stream/promises</code>) wires errors through the whole chain, <b>destroys every stream</b> on failure, and calls back / rejects exactly once — no fd leaks, no hanging requests. It also accepts async generator functions as transform stages.</p>`,
      followUps: ['How do you abort a pipeline?', 'What does finished() do?'] },
    { q: 'How would you implement EventEmitter, and what edge cases matter?', level: 'I',
      a: `<p>A Map from event name to an array of listeners. <code>on</code> pushes; <code>once</code> pushes a wrapper that removes itself before calling the original (store <code>wrapper.listener</code> so <code>off(original)</code> works); <code>off</code> removes the most recently added match; <code>emit</code> iterates a <b>copy</b> (so self-removal or additions during emit are safe), calls with <code>this</code> = emitter, returns whether listeners existed. Edge cases: <code>\'error\'</code> with no listener must throw; a throwing listener stops later ones; max-listener warning for leaks; async listeners\' rejections.</p>`,
      followUps: ['Why is emit synchronous?', 'How does events.once() handle errors?'] },
    { q: 'worker_threads vs cluster vs child_process — how do you choose?', level: 'A',
      a: `<p><b>worker_threads</b>: CPU-heavy JS inside one service, sharing memory via transfer/SharedArrayBuffer; use a pool. <b>cluster</b>: run N copies of an HTTP server on N cores sharing a port (primary distributes connections round-robin); no shared memory, so state goes to Redis — in Kubernetes, one process per pod with horizontal scaling is often simpler. <b>child_process</b>: run other programs (ffmpeg, git, Python) or isolate untrusted/unstable work in a separate process; use spawn/execFile, avoid exec with user input.</p>`,
      followUps: ['What does a worker share with the main thread?', 'How do you restart crashed cluster workers gracefully?'] },
    { q: 'How does require() resolve and cache modules? What happens with circular dependencies?', level: 'I',
      a: `<p>Core modules first; relative/absolute paths try the file, then .js/.json/.node, then a directory\'s package.json main or index.js; bare names walk up <code>node_modules</code> folders, honouring the package <code>exports</code> field. The resolved absolute filename is the cache key. Node caches the module object <b>before</b> executing it, so in a cycle the second require returns the <b>partial</b> <code>module.exports</code> — values assigned later are missing (and replacing <code>module.exports</code> later is invisible to the cycle partner).</p>`,
      followUps: ['How do you hot-reload a module?', 'How do ESM cycles differ?'] },
    { q: 'CommonJS vs ES modules in Node: what are the practical differences and interop rules?', level: 'A',
      a: `<p>ESM is static: imports are resolved and linked before evaluation, exports are live bindings, top-level await works, relative specifiers need extensions, no <code>__dirname</code> (use <code>import.meta.dirname</code>/<code>url</code>), no <code>require.cache</code>. CJS loads at run time with value copies. ESM can import CJS (module.exports becomes the default; named exports if statically detectable). CJS can <code>await import()</code> ESM, and since Node 22.12/20.19 can <code>require()</code> ESM graphs without top-level await. Package <code>"type"</code> and <code>"exports"</code> conditions (<code>import</code>/<code>require</code>) control which format loads; beware the dual-package hazard.</p>`,
      followUps: ['What is the dual package hazard?', 'Why does condition order in exports matter?'] },
    { q: 'p99 latency jumped from 40 ms to 900 ms after a release, average CPU is 35 %. How do you investigate?', level: 'A',
      a: `<p>Suspect a <b>blocked event loop</b>. Check event-loop delay (<code>monitorEventLoopDelay</code> p99) and ELU; if lag spikes match latency, something synchronous and occasional is running. Diff the release for sync APIs, big JSON, new regexes (ReDoS), sorting large arrays. Capture a CPU profile in production-like load (<code>--cpu-prof</code>, inspector, flame graph) and look for long frames. If lag is fine but latency is high, look at the thread pool (fs/DNS), downstream dependencies, or GC pauses (profile shows "(garbage collector)").</p>`,
      followUps: ['How does ELU differ from CPU %?', 'How would you protect against ReDoS?'] },
    { q: 'How do you find a memory leak in a production Node service?', level: 'A',
      a: `<p>First classify: graph <code>heapUsed</code> after GC, <code>rss</code>, <code>external</code>/<code>arrayBuffers</code>. Growing heap → JS objects: take three heap snapshots over time (<code>--heapsnapshot-signal</code>, <code>v8.writeHeapSnapshot</code>, or <code>--heapsnapshot-near-heap-limit</code>) on a drained instance, compare in DevTools, sort by retained size, follow retainers (often a Map cache, listener arrays, timers, ALS stores). Flat heap but growing RSS → Buffers retained by slices, ignored backpressure, native addons. Confirm the fix with a soak test, and set <code>--max-old-space-size</code> below the container limit.</p>`,
      followUps: ['Why can a heap snapshot itself crash the process?', 'What does MaxListenersExceededWarning tell you?'] },
    { q: 'What keeps a Node process alive, and why does my test runner hang after tests finish?', level: 'I',
      a: `<p>The loop runs while there are active, <b>referenced</b> handles (servers, sockets, intervals, child processes, file watchers) or pending requests. A hanging test run usually means something was opened and never closed: a DB pool, an HTTP server, a <code>setInterval</code>. Find it with <code>why-is-node-running</code> or a diagnostic report; fix by closing in teardown, or <code>unref()</code> timers that should not keep the process alive.</p>`,
      followUps: ['What does unref() do exactly?', 'How do you implement graceful shutdown on SIGTERM?'] },
    { q: 'How would you use AI assistants safely when working on Node internals and performance?', level: 'E',
      a: `<p>Use them to draft and explain, then verify with the runtime: run ordering snippets in CommonJS and ESM, check resolution with <code>require.resolve</code>/<code>import.meta.resolve</code>, and measure with event-loop delay, ELU and profiles before and after a change. Watch for typical model errors: claiming all I/O uses the thread pool, fixed setTimeout/setImmediate order at top level, old defaults (16 KiB highWaterMark, "require(esm) is impossible"), <code>exec</code> with string concatenation, and "make it async" for CPU-bound work. Give the model real numbers and your Node version.</p>`,
      followUps: ['Which claims would you always verify by running code?', 'How would you build a regression test for event-loop lag?'] }
  );

  registerModule({
    id: 'js15',
    title: 'Node.js Internals: libuv, Streams & Worker Threads',
    intro: `<p>JS 3 showed that Node is "V8 plus host APIs", and JS 8 taught the event loop rules shared with browsers. This module opens the Node box: <b>libuv</b> and its loop phases (timers, poll, check, close), the exact drain order of <code>process.nextTick</code> and promise microtasks, the <b>thread pool</b> and the APIs that quietly depend on it, <b>streams and backpressure</b> with <b>Buffers</b>, <b>EventEmitter</b> semantics, <b>worker_threads, cluster and child processes</b>, how <b>CommonJS and ES modules</b> are resolved, cached and evaluated, and how to <b>diagnose</b> a blocked loop or a leak in production.</p><p>Every guided and practice problem is a small, tested model of a real Node mechanism — a phase simulator, a backpressure model, an emitter, a thread-pool scheduler, a module loader — so you can reason about Node 20/22/24 behaviour from first principles in interviews.</p>`,
    goals: [
      'Explain how V8, Node core bindings and libuv fit together, and walk through the event loop phases and what keeps a process alive',
      'Predict the exact order of nextTick, promise, setTimeout, setImmediate and I/O callbacks in CommonJS and ES modules, and spot starvation',
      'Name which APIs use the libuv thread pool, reason about pool saturation, and size UV_THREADPOOL_SIZE sensibly',
      'Use streams with correct backpressure (write/drain, pipeline, async iteration) and handle Buffers and encodings safely',
      'Implement and reason about EventEmitter semantics, including once/off, snapshots and the error event',
      'Choose between worker_threads, cluster and child_process; explain clone vs transfer vs shared memory',
      'Describe CommonJS and ESM resolution, caching, cycles and the package exports field',
      'Diagnose blocked event loops and memory leaks with event-loop delay, ELU, CPU profiles, heap snapshots and diagnostic reports'
    ],
    prereqs: `JS 3 (Runtimes: Browser vs Node) for the engine/host split, modules and npm basics; JS 8 (Event Loop & async/await) for tasks, microtasks and output-order reasoning. JS 12 (V8, Memory & GC) helps for the leak-hunting topic.`,
    hours: 14,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
