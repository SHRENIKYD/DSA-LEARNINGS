(function () {
var topics = [], practice = [], quiz = [], interview = [];

/* Shared event-loop simulator used by the visualizers of topics 1 and 2.
   Tokens: T=setTimeout(0)  I=setImmediate  N=process.nextTick  P=Promise.then  F=fs.readFile callback  C=close callback */
function loopFrames(input, defInput) {
  var raw = (input === undefined || input === null || String(input).trim() === '') ? defInput : String(input);
  var toks = raw.trim().toUpperCase().split(/[\s,]+/).filter(Boolean);
  if (!toks.length || toks.length > 8 || toks.some(function (t) { return 'TINPFC'.indexOf(t) < 0 || t.length !== 1; })) {
    throw new Error('Type 1 to 8 letters separated by spaces. T=setTimeout(0)  I=setImmediate  N=nextTick  P=Promise.then  F=readFile callback  C=close callback');
  }
  var NAME = { T: 'setTimeout', I: 'setImmediate', N: 'nextTick', P: 'promise.then', F: 'readFile cb', C: 'close cb' };
  var WHY = {
    T: 'a timer whose time is up (the 0 ms became 1 ms and has passed)',
    I: 'setImmediate callbacks always run in the check phase, right after poll',
    N: 'nextTick runs first: right after the current operation, before any promise',
    P: 'promise callbacks (microtasks) run after all nextTicks, before the loop moves on',
    F: 'the file finished reading, so its callback runs in the poll phase',
    C: 'close callbacks run in the last phase of the lap'
  };
  var PH = ['timers', 'pending', 'idle', 'poll', 'check', 'close'];
  var DESC = {
    timers: 'Phase 1, <b>timers</b>: run setTimeout/setInterval callbacks that are due. We pretend 1 ms has passed, so setTimeout(0) is due.',
    pending: 'Phase 2, <b>pending callbacks</b>: a few deferred system callbacks (like certain TCP errors). Almost always empty.',
    idle: 'Phase 3, <b>idle/prepare</b>: Node\'s own housekeeping. You never put code here.',
    poll: 'Phase 4, <b>poll</b>: collect finished I/O (files, sockets) and run their callbacks. With nothing else waiting, Node would sleep here until I/O arrives.',
    check: 'Phase 5, <b>check</b>: setImmediate callbacks run here, right after poll.',
    close: 'Phase 6, <b>close callbacks</b>: things like socket.on("close") run here.'
  };
  var NODES = [
    { id: 'main', label: 'main script', x: 50, y: 35, shape: 'box' },
    { id: 'timers', label: '1 timers', x: 30, y: 6, shape: 'box' },
    { id: 'pending', label: '2 pending cb', x: 70, y: 6, shape: 'box' },
    { id: 'idle', label: '3 idle/prepare', x: 88, y: 35, shape: 'box' },
    { id: 'poll', label: '4 poll (I/O)', x: 70, y: 64, shape: 'box' },
    { id: 'check', label: '5 check', x: 30, y: 64, shape: 'box' },
    { id: 'close', label: '6 close cb', x: 12, y: 35, shape: 'box' }
  ];
  var EDGES = [['main', 'timers'], ['timers', 'pending'], ['pending', 'idle'], ['idle', 'poll'], ['poll', 'check'], ['check', 'close'], ['close', 'timers']];
  var q = { tick: [], micro: [], timers: [], pending: [], poll: [], check: [], close: [] };
  var log = [], frames = [];
  function names(k) { return q[k].map(function (it) { return it.n; }); }
  function snap(narr, phase, edge, runQ) {
    var hl = {}, ehl = {}, tags = {}, th = {}, mh = {}, rowHl = {};
    if (phase) hl[phase] = 'cur';
    if (edge) ehl[edge] = 'ok';
    ['timers', 'pending', 'poll', 'check', 'close'].forEach(function (p) { if (q[p].length) tags[p] = q[p].length + ' waiting'; });
    if (runQ === 'tick') th[0] = 'cur';
    if (runQ === 'micro') mh[0] = 'cur';
    var rows = ['timers', 'pending', 'poll', 'check', 'close'].map(function (p, i) {
      if (runQ === p) rowHl[i] = 'cur';
      return [p, names(p).join(', ') || '-'];
    });
    frames.push({ narr: narr, parts: [
      { type: 'graph', label: 'The event loop ring (one lap = timers → pending → idle → poll → check → close)', height: 70, directed: true, nodes: NODES, edges: EDGES, hl: hl, ehl: ehl, tags: tags },
      { type: 'queue', label: 'process.nextTick queue (drained first)', items: names('tick'), hl: th, frontLabel: 'runs next', backLabel: 'newest' },
      { type: 'queue', label: 'Promise microtask queue (drained second)', items: names('micro'), hl: mh, frontLabel: 'runs next', backLabel: 'newest' },
      { type: 'table', label: 'Callbacks waiting in each phase', columns: ['phase', 'waiting callbacks'], rows: rows, hl: rowHl },
      { type: 'text', html: '<b>Console output so far:</b> ' + (log.length ? log.join(' <span class="c-m">→</span> ') : '<span class="c-m">(nothing yet)</span>') }
    ] });
  }
  function exec(qn, phase) {
    var it = q[qn][0];
    snap('Run <b>' + it.n + '</b>: ' + it.why + '.', phase, null, qn);
    q[qn].shift();
    log.push(it.n);
    if (it.fn) it.fn();
  }
  function drain(phase) {
    var guard = 0;
    while ((q.tick.length || q.micro.length) && guard++ < 40) {
      while (q.tick.length) exec('tick', phase);
      while (q.micro.length) exec('micro', phase);
    }
  }
  toks.forEach(function (t, i) {
    var it = { n: NAME[t] + '#' + (i + 1), why: WHY[t] };
    if (t === 'T') q.timers.push(it);
    if (t === 'I') q.check.push(it);
    if (t === 'N') q.tick.push(it);
    if (t === 'P') q.micro.push(it);
    if (t === 'C') q.close.push(it);
    if (t === 'F') {
      it.fn = function () {
        q.timers.push({ n: 'setTimeout (inside cb)', why: 'a timer created inside an I/O callback waits for the NEXT lap' });
        q.check.push({ n: 'setImmediate (inside cb)', why: 'check comes right after poll, so this runs in the same lap' });
      };
      q.poll.push(it);
    }
  });
  log.push('sync code');
  snap('Your script ran top to bottom. It only <b>registered</b> callbacks (and printed "sync code"). Nothing asynchronous has run yet.', 'main', null, null);
  snap('The script is done. Before the loop starts, Node empties the <b>nextTick</b> queue, then the <b>promise</b> queue.', 'main', null, null);
  drain('main');
  function pending() { return q.timers.length || q.pending.length || q.poll.length || q.check.length || q.close.length; }
  var lap = 0, prev = 'main';
  while (pending() && lap < 4) {
    lap++;
    PH.forEach(function (p) {
      var n = q[p] ? q[p].length : 0;
      if (lap > 1 && !n) return;
      var edge = prev + '-' + p;
      snap('Lap ' + lap + '. ' + DESC[p] + (n ? ' <b>' + n + '</b> callback(s) waiting.' : ' Nothing waiting, move on.'), p, edge, null);
      prev = p;
      for (var k = 0; k < n; k++) { exec(p, p); drain(p); }
    });
    prev = 'close';
  }
  snap('Every queue is empty and nothing is waiting, so the process can exit. Final order: <b>' + log.join(' → ') + '</b>', null, null, null);
  return frames;
}

topics.push({
  title: 'The Event Loop: Six Phases',
  analogy: `<p>Picture <b>one waiter</b> in a busy restaurant. He walks the <b>same fixed route</b> again and again: (1) look at the kitchen timers, (2) handle leftover jobs, (3) quick housekeeping, (4) collect finished dishes from the kitchen window, (5) deliver the "do this right after" notes, (6) clear the tables. The cooks (the operating system and a small team called the thread pool) work in the back. The waiter never cooks, he only <i>walks the route and hands things over</i>. If he stops to chat for 10 minutes (a long CPU loop), nobody gets served.</p>`,
  explain: `<p>Node runs your JavaScript on <b>one thread</b>. To still handle thousands of connections, it uses an <b>event loop</b> (built on a C library called <b>libuv</b>): a loop that keeps asking "is there a callback ready to run?" and runs it. One full trip around the loop is called a <b>lap</b> (or "tick").</p>
  <p>Each lap visits six <b>phases</b>, always in this order. Every phase has its own queue of callbacks.</p>
  ${H.table(['#', 'Phase', 'What runs here', 'Example'], [
    ['1', '<b>timers</b>', 'Callbacks of timers whose time is up', '<code>setTimeout</code>, <code>setInterval</code>'],
    ['2', '<b>pending callbacks</b>', 'A few deferred system callbacks', 'some TCP errors (rare)'],
    ['3', '<b>idle, prepare</b>', 'Node internals only', 'nothing you write'],
    ['4', '<b>poll</b>', 'Finished I/O callbacks; also where the loop may <i>sleep</i> waiting for I/O', '<code>fs.readFile</code> callback, incoming socket data'],
    ['5', '<b>check</b>', 'Callbacks from setImmediate', '<code>setImmediate(fn)</code>'],
    ['6', '<b>close callbacks</b>', 'Cleanup events', '<code>socket.on("close")</code>']
  ])}
  <p><b>Two special queues</b> sit <i>outside</i> the six phases: the <code>process.nextTick</code> queue and the <b>promise microtask</b> queue. They are emptied <b>after every single callback</b> (and after the main script), nextTick first, then promises. We cover them in the next topic.</p>
  <p><b>Big rules to remember:</b></p>
  <ul>
    <li>Callbacks inside one phase run <b>one after another</b>, never at the same time.</li>
    <li>A callback added <i>while</i> a phase is running waits for the next lap (for timers and check) so a phase cannot starve the others.</li>
    <li><code>setImmediate</code> runs in <b>check</b>; <code>setTimeout(fn, 0)</code> runs in <b>timers</b>. From the main script their order is not guaranteed. Inside an I/O callback, <code>setImmediate</code> is <b>always</b> first.</li>
    <li>If any callback runs for a long time, every later phase waits. The loop is single-file.</li>
  </ul>
  ${H.chips(['timers', 'pending', 'idle/prepare', 'poll', 'check', 'close'], { label: 'one lap, in order', hl: { poll: 'y', check: 'g' } })}`,
  clues: [
    '"Why does <code>setImmediate</code> run before <code>setTimeout(0)</code> inside a <code>readFile</code> callback?" → poll phase is followed by check',
    '"Predict the output order" of <code>setTimeout</code> / <code>setImmediate</code> / <code>nextTick</code> / <code>Promise</code> → which phase or queue each belongs to',
    '"Node is single-threaded, so how does it serve 10,000 connections?" → event loop + OS async I/O + thread pool for the rest',
    '"One slow request makes <b>every</b> request slow" → something blocked the loop (CPU work or a sync API)',
    '"Timer fires late" or "setTimeout(…, 100) took 340 ms" → loop was busy; timers say "at least" not "exactly"',
    '"Explain libuv" / "what is the poll phase doing?" → epoll/kqueue/IOCP waiting for I/O readiness'
  ],
  code: [
    {
      title: 'Predict the order (runs in your browser)',
      run: true,
      code: `// Which line prints first? Think, then press Run.
console.log('1 sync: script start');

setTimeout(function () { console.log('5 timer: setTimeout 0 (macrotask, timers phase)'); }, 0);

Promise.resolve().then(function () { console.log('3 microtask: promise.then'); });
queueMicrotask(function () { console.log('4 microtask: queueMicrotask'); });

console.log('2 sync: script end');
// Rule: all sync code first -> all microtasks -> then the next macrotask (timer).`
    },
    {
      title: 'Event loop phase simulator (pure JS, prints the order)',
      run: true,
      code: `// A tiny MODEL of Node's event loop. It is not real Node, it only copies the ORDER rules.
function createLoop() {
  var q = { tick: [], micro: [], timers: [], pending: [], poll: [], check: [], close: [] };
  var out = [];
  var api = {
    nextTick: function (fn) { q.tick.push(fn); },
    promise: function (fn) { q.micro.push(fn); },
    setTimeout: function (fn) { q.timers.push(fn); },   // pretend delay 0 and 1 ms has passed
    setImmediate: function (fn) { q.check.push(fn); },
    ioDone: function (fn) { q.poll.push(fn); },          // "a file finished reading"
    onClose: function (fn) { q.close.push(fn); },
    log: function (s) { out.push(s); }
  };
  // nextTick queue first, then promise queue; repeat until both are empty
  function drainMicro() {
    while (q.tick.length || q.micro.length) {
      while (q.tick.length) q.tick.shift()();
      while (q.micro.length) q.micro.shift()();
    }
  }
  // run only the callbacks that were queued BEFORE this phase started
  function runPhase(name) {
    var batch = q[name].splice(0, q[name].length);
    batch.forEach(function (fn) { fn(); drainMicro(); });   // microtasks drain after EACH callback
  }
  api.start = function (mainFn) {
    mainFn(api);
    drainMicro();                                            // after the main script
    var laps = 0;
    function busy() { return q.timers.length || q.pending.length || q.poll.length || q.check.length || q.close.length; }
    while (laps++ < 10 && busy()) {
      ['timers', 'pending', 'poll', 'check', 'close'].forEach(runPhase);
    }
    return out;
  };
  return api;
}

var loop = createLoop();
var order = loop.start(function (L) {
  L.log('sync: script start');
  L.setTimeout(function () { L.log('timers: setTimeout'); });
  L.setImmediate(function () { L.log('check: setImmediate'); });
  L.ioDone(function () {
    L.log('poll: readFile callback');
    L.setTimeout(function () { L.log('timers (next lap): setTimeout inside I/O'); });
    L.setImmediate(function () { L.log('check: setImmediate inside I/O'); });
  });
  L.nextTick(function () { L.log('nextTick'); });
  L.promise(function () { L.log('promise.then'); });
  L.onClose(function () { L.log('close: socket closed'); });
  L.log('sync: script end');
});
console.log(order.join('\\n'));`
    },
    {
      title: 'The same idea in real Node (needs Node, so not runnable here)',
      code: `const fs = require('fs');

// Inside an I/O callback the order is ALWAYS: immediate first, timeout second.
fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
});

// From the main script the order of these two is NOT guaranteed:
// it depends on how fast the process started (is 1 ms already over?).
setTimeout(() => console.log('main: timeout'), 0);
setImmediate(() => console.log('main: immediate'));`
    }
  ],
  codeTitle: ['Predict the order', 'Event loop phase simulator', 'Real Node: timeout vs immediate'],
  viz: [
    {
      title: 'Event loop ring: watch one lap at a time',
      input: 'T I N P F',
      inputLabel: 'Callbacks (letters): T=setTimeout(0) I=setImmediate N=nextTick P=Promise.then F=readFile cb C=close cb',
      gen: function (input) { return loopFrames(input, 'T I N P F'); }
    }
  ],
  examples: [
    {
      title: 'Main script: timeout vs immediate (a coin flip)',
      html: `<p>You write <code>setTimeout(f, 0)</code> and <code>setImmediate(g)</code> in the main file. Node turns <code>0</code> into <code>1 ms</code>. When the loop starts, one of two things is true:</p>
      <ul><li><b>1 ms already passed</b> (slow start): the timers phase runs <code>f</code> first, then check runs <code>g</code>.</li>
      <li><b>less than 1 ms passed</b> (fast start): timers sees nothing due, poll passes, check runs <code>g</code> first, <code>f</code> comes on lap 2.</li></ul>
      <p>So the printed order can change between runs. Interview answer: <i>"not guaranteed from the main module"</i>.</p>`
    },
    {
      title: 'Inside an I/O callback: immediate always wins',
      html: `<p>A <code>readFile</code> callback runs in the <b>poll</b> phase. The next phase after poll is <b>check</b>, so <code>setImmediate</code> runs in the same lap. A timer created now must wait for the <b>timers</b> phase of the <i>next</i> lap.</p>
      ${H.arr(['poll: cb runs', 'check: immediate', 'close', 'timers: timeout'], { label: 'order of events after the callback', hl: { 1: 'g', 3: 'y' }, idx: false })}
      <p>This is why <code>setImmediate</code> is the right tool for "run this right after the current I/O".</p>`
    },
    {
      title: 'Timers are "at least", never "exactly"',
      html: `<p><code>setTimeout(f, 100)</code> means <i>"not before 100 ms"</i>. If a callback in the poll phase hogs the thread for 300 ms, <code>f</code> runs at about 300 ms+. Here is the maths with a table:</p>
      ${H.table(['Time (ms)', 'What the thread is doing', 'Timer f (due at 100)'], [['0', 'schedule f, start heavy callback', 'waiting'], ['100', 'still inside the heavy callback', '<span class="c-r">due but cannot run</span>'], ['300', 'heavy callback ends, lap goes on', '<span class="c-g">runs now (200 ms late)</span>']])}
      <p>This is called <b>event loop lag</b>. It is one of the first metrics to watch on a Node service.</p>`
    },
    {
      title: 'Which phase sleeps? The poll phase',
      html: `<p>When there is nothing to run, Node must not burn CPU in a busy loop. In <b>poll</b> it asks the OS "wake me when a socket or file is ready, but no later than when the nearest timer is due" (using <code>epoll</code> on Linux, <code>kqueue</code> on macOS, <code>IOCP</code> on Windows). If an <code>setImmediate</code> is pending, poll does <b>not</b> sleep; it moves on to check at once.</p>`
    }
  ],
  deepDive: `<p><b>What libuv really does each lap (<code>uv_run</code>):</b> update the loop clock → run due timers (stored in a <b>min-heap</b>, so finding the next one is cheap) → run pending callbacks → run idle/prepare handles → compute a poll <b>timeout</b> (0 if immediates or idle handles exist, else time to the nearest timer, else forever) → block in the OS poll call for up to that timeout → run I/O callbacks → run check handles (<code>setImmediate</code>) → run closing callbacks. The loop stays alive while something is "ref'd" (an active server, a timer, a pending request). <code>timer.unref()</code> says "do not keep the process alive just for me".</p>
  <p><b>Microtasks between callbacks:</b> before Node 11, nextTick and promise queues were drained only <i>between phases</i>, so two timers due together ran back to back. Since Node 11 they drain <b>after every callback</b>, matching browsers. A famous interview trap is an answer written for Node 10.</p>
  <p><b>ES modules change the first step:</b> top-level code of an ES module runs inside a promise job. So at the end of the main file, promises run <i>before</i> <code>nextTick</code> in ESM, but <i>after</i> in CommonJS. Mention this and you stand out.</p>
  <p><b>Measuring health:</b> <code>perf_hooks.monitorEventLoopDelay()</code> gives a histogram (p50, p99) of lag; <code>performance.eventLoopUtilization()</code> gives how busy the loop is (0 to 1). Alert when p99 lag is more than ~100 ms. <b>Never</b> call <code>process.exit</code> from inside the poll phase to "fix" a stall; find the blocker with a CPU profile (<code>--cpu-prof</code>) instead.</p>
  <p><b>Common myths:</b> "setImmediate is faster than setTimeout(0)" (not always); "Node is single-threaded" (JS is, Node is not: the thread pool, V8 helper threads and GC threads exist); "async means parallel" (async I/O overlaps waiting, CPU work never overlaps on one thread).</p>`,
  aiEra: `<p><b>What AI changes:</b> Assistants write async code very fast, and most of it is fine. But they often mix up the queues in explanations: they say "setImmediate runs before setTimeout" as a rule, or forget that nextTick beats promises. Their answers also rarely mention Node version differences (Node 10 vs 11+ microtask timing, CJS vs ESM).</p>
  <p><b>Use AI as a partner:</b> ask <code>Write 6 tiny Node scripts mixing nextTick, promises, timers and immediates; do NOT give the output</code>, predict the output by hand, then run them to check yourself. Paste a slow-endpoint flame graph and ask <code>Which frames block the event loop?</code>.</p>
  <p><b>Where AI goes wrong:</b> it "fixes" slow endpoints by wrapping sync work in <code>async</code> or <code>setImmediate</code> (which only delays the block). It also loves <code>await Promise.all(bigArray.map(cpuHeavy))</code> thinking it is parallel; it is not. <b>What you must still own:</b> a mental model of the loop, so you can look at a code review and say "this runs on the main thread for 200 ms".</p>`,
  problems: [{
    title: 'Timer or Immediate: Who Wins Inside I/O?',
    level: 'Medium',
    tags: ['event loop', 'phases', 'setImmediate'],
    companies: ['PayPal', 'Netflix', 'Uber'],
    statement: `<p>An interviewer shows this code and asks: <i>"What is printed, and is the order guaranteed? What changes if the two calls are moved out of the callback to the main file?"</i></p>
    <pre>fs.readFile(__filename, () =&gt; {
  setTimeout(() =&gt; console.log('timeout'), 0);
  setImmediate(() =&gt; console.log('immediate'));
});</pre>`,
    constraints: `Node 18+ on Linux. Assume the file read succeeds.`,
    example: `<p>Output: <b class="c-g">immediate</b> then <b class="c-y">timeout</b> (every run).</p><p>Why: the callback runs in the <b>poll</b> phase. Next phase is <b>check</b> (immediate). The timer must wait for <b>timers</b> of lap 2.</p>`,
    brute: {
      why: `<p>Guessing "timeout first because it is written first" mixes up <i>source order</i> with <i>phase order</i>. The loop does not run callbacks in the order you wrote them, it runs them by phase.</p>`,
      code: { lang: 'js', code: `// Wrong mental model: "first written = first run"\nsetTimeout(() => console.log('timeout'), 0);\nsetImmediate(() => console.log('immediate'));\n// This is a coin flip from the main script, so the rule is wrong.` }
    },
    mcq: { q: 'You are inside a readFile callback (poll phase). Which runs first?', options: ['setTimeout(fn, 0)', 'setImmediate(fn)', 'They run in the order written', 'Random'], answer: 1, explain: 'Check (setImmediate) comes right after poll in the same lap; the timer waits for timers of the next lap.' },
    hints: [
      `<p>Hint 1: Ask "which phase am I in right now?". A readFile callback is run by the <b>poll</b> phase.</p>`,
      `<p>Hint 2: Write the phase order: timers, pending, idle, poll, check, close. What is directly after poll? What is the next time the loop returns to timers?</p>`,
      `<p>Hint 3: Recipe: (1) find current phase, (2) setImmediate callback goes to the check queue of this lap, (3) setTimeout callback goes to the timer heap and is picked at the next timers phase, (4) from the main script the answer depends on the 1 ms clock.</p>`
    ],
    solution: {
      approach: `<p>Inside the I/O callback the loop is in <b>poll</b>. After poll the loop enters <b>check</b>, so <code>immediate</code> prints first. The new timer is only looked at when the loop comes back to <b>timers</b> (next lap), so <code>timeout</code> prints second. This is deterministic.</p>
      <p>From the main module it is <b>not</b> deterministic: <code>0</code> becomes <code>1 ms</code>, and whether 1 ms has passed when the loop first enters the timers phase depends on process start-up speed and machine load.</p>`,
      code: { lang: 'js', code: `const fs = require('fs');\n\n// Deterministic: immediate, then timeout\nfs.readFile(__filename, () => {\n  setTimeout(() => console.log('timeout'), 0);\n  setImmediate(() => console.log('immediate'));\n});` },
      complexity: `<p>Each callback runs once. Cost is O(1) per scheduling call (timer insert is O(log n) in the heap).</p>`,
      followUps: ['What if you also add process.nextTick inside the callback?', 'How would a 5 ms CPU loop in the timeout callback delay the immediate?']
    }
  }]
});

topics.push({
  title: 'process.nextTick, Microtasks and Starvation',
  analogy: `<p>Think of a doctor with a long waiting room (the event loop phases). Two special people can skip the whole line: the <b>nurse with an emergency</b> (<code>process.nextTick</code>) and the <b>patient with an appointment slip</b> (a resolved promise). After <i>every</i> patient, the doctor first takes <b>all</b> emergencies, then <b>all</b> appointment slips, and only then calls the next person from the waiting room. If emergencies keep arriving forever, the waiting room never gets seen. That is <b>starvation</b>.</p>`,
  explain: `<p>Besides the six phase queues, Node keeps two small <b>VIP queues</b>:</p>
  ${H.table(['Queue', 'Filled by', 'Drained', 'Priority'], [
    ['<b>nextTick queue</b>', '<code>process.nextTick(fn)</code>', 'After the current operation ends', '<span class="c-g">1st</span>'],
    ['<b>microtask queue</b>', '<code>promise.then</code>, <code>await</code> continuation, <code>queueMicrotask(fn)</code>', 'After the nextTick queue is empty', '<span class="c-b">2nd</span>'],
    ['phase queues', 'timers, I/O, setImmediate, close', 'One phase per lap', '<span class="c-m">3rd</span>']
  ])}
  <p><b>When are VIP queues emptied?</b> (1) once after your main script, and (2) after <b>every callback</b> that the loop runs. The order is: all nextTicks, then all promises, then check the nextTick queue again, repeat until both are empty.</p>
  <p>Small example in your head: <code>sync code</code> → <code>nextTick</code> → <code>promise.then</code> → <code>setTimeout</code>/<code>setImmediate</code>. Memorise this one line, it answers 90% of "predict the output" questions.</p>
  <p><b>What about async/await?</b> Code before the first <code>await</code> runs <b>synchronously</b>. Code after <code>await</code> is just a <code>.then</code> callback, so it is a <b>microtask</b>.</p>
  <p><b>Why does nextTick even exist?</b> To run something "very soon, but after the current function returns". Classic use: an object that emits an event in its constructor. If it emits immediately, the caller has no chance to attach a listener yet. Deferring the emit with <code>nextTick</code> fixes that.</p>
  <p><b>The danger:</b> both VIP queues are drained <i>completely</i> before the loop moves on. A <code>nextTick</code> that schedules another <code>nextTick</code> forever means timers and I/O <b>never run</b>. Promises can do the same with an endless <code>.then</code> chain.</p>`,
  clues: [
    '"What is the difference between <code>process.nextTick</code> and <code>setImmediate</code>?" → tick = before the loop continues; immediate = check phase of this lap (names are swapped historically)',
    '"Predict the output" with <code>async/await</code> → code after <code>await</code> is a microtask',
    '"Server stops responding but CPU is 100% and no code is blocking" → recursive nextTick / endless microtask chain (starvation)',
    '"Is a promise callback a macrotask?" → no, microtask; runs before timers',
    '"Why defer emit in a constructor?" → nextTick lets the caller attach listeners first',
    '"CommonJS vs ESM ordering of promise and nextTick" → ESM runs top-level inside a promise job'
  ],
  code: [
    {
      title: 'async/await order (runs in your browser)',
      run: true,
      code: `// Predict first. Hint: code after "await" is a .then callback (a microtask).
async function a() {
  console.log('a: start (sync)');
  await b();
  console.log('a: after await (microtask)');
}
async function b() { console.log('b: runs synchronously'); }

console.log('script start');
setTimeout(function () { console.log('timeout (macrotask)'); }, 0);
a();
new Promise(function (resolve) {
  console.log('promise executor is synchronous');
  resolve();
}).then(function () { console.log('then 1'); })
  .then(function () { console.log('then 2'); });
console.log('script end');`
    },
    {
      title: 'Starvation model: a tick that re-schedules itself',
      run: true,
      code: `// MODEL: the tick queue is always emptied before anything else gets a turn.
function simulate(selfReschedule, limit) {
  var tickQ = [], timerQ = ['timer callback'], out = [], count = 0;
  function tick() {
    count++;
    out.push('tick #' + count);
    if (selfReschedule && count < limit) tickQ.push(tick);   // schedules ITSELF again
  }
  tickQ.push(tick);
  while (tickQ.length) tickQ.shift()();     // drain all ticks first
  while (timerQ.length) out.push(timerQ.shift());   // only now may the timer run
  return out;
}
console.log('stops after 3 ticks  ->', simulate(true, 3).join(', '));
console.log('single tick          ->', simulate(false, 1).join(', '));
// In real Node with limit = Infinity the timer line would NEVER be reached.
// That is starvation. setImmediate instead of the tick lets the loop breathe.`
    },
    {
      title: 'All four in one Node script (CommonJS)',
      code: `setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));
process.nextTick(() => console.log('nextTick'));
Promise.resolve().then(() => console.log('promise'));
(async () => {
  console.log('async start');      // sync
  await null;
  console.log('async after await');   // microtask, queued AFTER the promise above
})();
console.log('sync');
// Output (CommonJS):
// async start, sync, nextTick, promise, async after await, timeout, immediate
// (timeout and immediate may swap from the main script)`
    },
    {
      title: 'Good use of nextTick: let the caller attach listeners',
      code: `const EventEmitter = require('events');

class Job extends EventEmitter {
  constructor() {
    super();
    // emit AFTER the constructor returns, so "job.on('ready')" below still works
    process.nextTick(() => this.emit('ready'));
  }
}

const job = new Job();
job.on('ready', () => console.log('ready received'));   // would be missed without nextTick`
    }
  ],
  codeTitle: ['async/await order', 'Starvation model', 'nextTick, promise, timer, immediate', 'nextTick in a constructor'],
  viz: [
    {
      title: 'Draining the VIP queues: nextTick first, then promises',
      input: 'N P N P T I',
      inputLabel: 'Letters: T=setTimeout(0) I=setImmediate N=nextTick P=Promise.then F=readFile cb C=close cb',
      gen: function (input) { return loopFrames(input, 'N P N P T I'); }
    },
    {
      title: 'Starvation: a nextTick that keeps scheduling itself',
      input: '5',
      inputLabel: 'How many times the tick re-schedules itself (2 to 8)',
      gen: function (input) {
        var n = parseInt(String(input).trim(), 10);
        if (isNaN(n) || n < 2 || n > 8) throw new Error('Enter a whole number from 2 to 8');
        var frames = [], skipped = [];
        function table(timerState, ioState) {
          return { type: 'table', label: 'Who is waiting for a turn?', columns: ['callback', 'state'], rows: [['setTimeout(0)', timerState], ['incoming HTTP request (poll)', ioState]], hl: timerState.indexOf('STARVED') >= 0 ? { 0: 'bad', 1: 'bad' } : {} };
        }
        frames.push({ narr: 'Your code starts a <b>recursive nextTick</b>: each tick schedules the next one. A timer and an incoming request are also waiting.', parts: [
          { type: 'queue', label: 'nextTick queue', items: ['tick #1'], hl: { 0: 'cur' }, frontLabel: 'runs next', backLabel: 'newest' },
          table('waiting', 'waiting'),
          { type: 'bars', label: 'Times the loop skipped the timer', values: [0], texts: ['0'] }
        ] });
        for (var i = 1; i <= n; i++) {
          skipped.push(i);
          var last = i === n;
          frames.push({ narr: 'Tick #' + i + ' runs' + (last ? ' and does <b>not</b> schedule another one this time.' : ' and schedules tick #' + (i + 1) + '. The queue is not empty yet, so Node keeps draining it.') + ' The timer is still skipped.', parts: [
            { type: 'queue', label: 'nextTick queue', items: last ? [] : ['tick #' + (i + 1)], hl: last ? {} : { 0: 'cur' }, frontLabel: 'runs next', backLabel: 'newest' },
            table(last ? 'about to run' : 'STARVED (skipped ' + i + 'x)', last ? 'about to run' : 'STARVED (skipped ' + i + 'x)'),
            { type: 'bars', label: 'Times the loop skipped the timer', values: skipped.slice(), hl: last ? {} : { 0: 'bad' }, texts: skipped.map(String) }
          ] });
        }
        frames.push({ narr: 'The tick queue is finally empty, so the loop moves on and the timer and the request run. <span class="c-r">With an endless recursion this frame would never come</span>: the server would look frozen while using 100% CPU. Fix: use <code>setImmediate</code> so each step lets the loop do a full lap.', parts: [
          { type: 'queue', label: 'nextTick queue', items: [] },
          table('runs now (late)', 'runs now (late)'),
          { type: 'bars', label: 'Times the loop skipped the timer', values: skipped.slice(), hl: { 0: 'ok' }, texts: skipped.map(String) }
        ] });
        return frames;
      }
    }
  ],
  examples: [
    {
      title: 'Same file, CommonJS vs ES module',
      html: `<p>In a <b>CommonJS</b> file (<code>require</code>), at the end of the main script Node runs <code>nextTick</code> first, then promises. In an <b>ES module</b> file (<code>import</code>), the whole file is itself running inside a promise job, so the microtask queue is being drained already and <b>promises run before nextTick</b>.</p>
      ${H.table(['Code (same lines)', 'CommonJS output', 'ESM output'], [['nextTick + Promise.then', 'nextTick, promise', '<span class="c-y">promise, nextTick</span>']])}
      <p>Rule: never depend on the order between those two; if you must, you are probably designing it wrong.</p>`
    },
    {
      title: 'Promise chains can starve too',
      html: `<p>People think only <code>nextTick</code> can starve the loop. A promise that re-creates itself does the same, because the microtask queue is also drained until empty:</p>
      <pre>function spin() { return Promise.resolve().then(spin); }  // never lets timers run</pre>
      <p>The cure is the same: yield to the loop with <code>await new Promise(r =&gt; setImmediate(r))</code> every few thousand iterations of heavy work.</p>`
    },
    {
      title: 'Worked trace: 3 sync lines, 1 tick, 2 promises, 1 timer',
      html: `${H.table(['Step', 'Event', 'Queues after step'], [
        ['1', 'sync: log("A")', 'tick [ ], micro [ ], timers [ ]'],
        ['2', 'setTimeout → timers', 'timers [t]'],
        ['3', 'nextTick(x) and Promise.then(y)', 'tick [x], micro [y]'],
        ['4', 'sync: log("B"), script ends', 'tick [x], micro [y], timers [t]'],
        ['5', 'drain: x runs, then y runs', '<span class="c-g">tick [ ], micro [ ]</span>'],
        ['6', 'loop lap 1, timers phase: t runs', 'all empty']
      ])}
      <p>Printed order: <b>A, B, x, y, t</b>.</p>`
    },
    {
      title: 'Why await adds one microtask hop',
      html: `<p><code>await v</code> pauses the function and continues in a microtask. So in <code>async function f(){ await null; log("after") }</code> followed by <code>Promise.resolve().then(()=&gt;log("p"))</code> written <i>before</i> the call of <code>f()</code>, you get <code>p</code> before <code>after</code>: the promise callback was queued first. Order of queuing = order of running inside one queue.</p>`
    }
  ],
  deepDive: `<p><b>Internals:</b> the nextTick queue is a JavaScript linked list inside Node (<code>lib/internal/process/task_queues.js</code>). The microtask queue belongs to <b>V8</b>. After each callback, Node's function <code>processTicksAndRejections</code> loops: <i>run all ticks</i> → call <code>runMicrotasks()</code> (V8 drains everything, including microtasks queued meanwhile) → if new ticks appeared, repeat. That is why a tick queued from inside a promise callback runs <b>after</b> the whole current microtask queue, not in the middle of it.</p>
  <p><b>Why the names are backwards:</b> <code>nextTick</code> runs "before the next tick of the loop" and <code>setImmediate</code> runs "on the next tick of the loop". The Node team agrees the names are confusing but changing them would break the ecosystem. Docs recommend <code>setImmediate</code> for most deferral and <code>queueMicrotask</code> for promise-like deferral. Use <code>nextTick</code> mainly for the "emit after constructor" pattern and inside Node-style libraries.</p>
  <p><b>Unhandled rejections are checked in this same function:</b> after microtasks drain, Node processes the list of promises that were rejected without a handler, and (since Node 15) throws. So a <code>.catch</code> attached in the <i>same</i> tick is fine, one attached later may be too late.</p>
  <p><b>Performance reality:</b> microtask hops are cheap (hundreds of nanoseconds) but not free. Awaiting inside a hot loop of 10 million items adds seconds. For batch work, process chunks synchronously and <code>await</code> once per chunk. For fairness, yield to I/O every ~1 ms of CPU work (<code>await scheduler.yield()</code> exists in newer runtimes; in Node use <code>setImmediate</code>).</p>`,
  aiEra: `<p><b>What AI changes:</b> Assistants usually produce correct <code>async/await</code> code, so the dangerous part is subtle ordering: "I'll just <code>process.nextTick</code> the heavy work so it doesn't block" is a very common wrong suggestion; it moves the work earlier, not off the thread.</p>
  <p><b>Use AI as a partner:</b> ask it to <code>generate 10 predict-the-output snippets mixing await, nextTick and timers, each with an answer key in a separate message</code> and test yourself. When reviewing AI code, search for <code>nextTick</code> and for <code>.then</code> chains inside loops.</p>
  <p><b>Where AI goes wrong:</b> mixing up Node 10 behaviour (old blogs in its training data) with Node 11+; claiming promises are "macrotasks"; writing recursive <code>nextTick</code> "polling" helpers. <b>What you must still own:</b> being able to draw the VIP queues on a whiteboard and explain which line starves which. In an incident, that diagram finds the cause faster than any chatbot.</p>`,
  problems: [{
    title: 'Predict the Output: nextTick, Promise, Timer, Immediate',
    level: 'Medium',
    tags: ['event loop', 'microtasks', 'output prediction'],
    companies: ['Amazon', 'Walmart', 'Flipkart'],
    statement: `<p>Predict the exact console output (CommonJS, Node 20). Mention which pairs are not guaranteed.</p>
    <pre>console.log('A');
setTimeout(() =&gt; console.log('B'), 0);
setImmediate(() =&gt; console.log('C'));
process.nextTick(() =&gt; console.log('D'));
Promise.resolve()
  .then(() =&gt; { console.log('E'); process.nextTick(() =&gt; console.log('F')); })
  .then(() =&gt; console.log('G'));
process.nextTick(() =&gt; { console.log('H'); Promise.resolve().then(() =&gt; console.log('I')); });
(async () =&gt; { console.log('J'); await null; console.log('K'); })();
console.log('L');</pre>`,
    constraints: `CommonJS file, Node 18+, no other code.`,
    example: `<p>Output: <b>A J L D H E K I G F B C</b></p>
    <p>${H.c('g', 'A J L')} sync. ${H.c('b', 'D H')} nextTick queue. ${H.c('p', 'E K I G')} microtasks. ${H.c('y', 'F')} tick created inside a microtask. ${H.c('m', 'B C')} macrotasks (these two may swap).</p>`,
    brute: {
      why: `<p>Reading top to bottom and printing in source order gives A B C D E ... which ignores the three-level priority (sync, VIP queues, phases). The wasted work is not CPU but a wrong model.</p>`,
      code: { lang: 'js', code: `// Wrong model: "run in the order the lines are written"\n// A B C D E F G H I J K L   (this is NOT what Node prints)` }
    },
    mcq: { q: 'A nextTick callback is scheduled from inside a promise callback while the microtask queue is draining. When does it run?', options: ['Immediately, before the next microtask', 'After the whole current microtask queue is empty', 'In the next timers phase', 'In the check phase'], answer: 1, explain: 'V8 drains the microtask queue completely; Node then checks the tick queue again.' },
    hints: [
      `<p>Hint 1: three buckets. (1) synchronous lines, (2) nextTick then promise queues, (3) phase queues (timers, check).</p>`,
      `<p>Hint 2: write two lists while you read: TICK = [..], MICRO = [..]. A promise <code>.then</code> that is already resolved is queued immediately; <code>await null</code> queues the rest of the function.</p>`,
      `<p>Hint 3: recipe: print sync (A, J, L). Drain TICK in order (D, H; H queues I into MICRO). Drain MICRO fully in queue order (E, K, I, G; E queues tick F). Because the tick queue is checked again, F prints. Finally phases: B and C.</p>`
    ],
    solution: {
      approach: `<p><b>Step 1, sync:</b> prints A, then the async function runs up to its first await so J, then L. <b>Step 2, ticks:</b> D, then H (H queues promise I). <b>Step 3, microtasks</b> in queue order: E (queues tick F and makes G ready), K, I, then G. <b>Step 4:</b> the tick queue has F, so F. <b>Step 5, loop:</b> timers B and check C; B and C may swap because they were scheduled from the main script.</p>
      ${H.table(['Bucket', 'Prints'], [['sync', 'A J L'], ['nextTick', 'D H'], ['microtasks', 'E K I G'], ['new tick', 'F'], ['phases', 'B C (or C B)']])}`,
      code: { lang: 'js', code: `// Run it yourself (CommonJS):\nconsole.log('A');\nsetTimeout(() => console.log('B'), 0);\nsetImmediate(() => console.log('C'));\nprocess.nextTick(() => console.log('D'));\nPromise.resolve()\n  .then(() => { console.log('E'); process.nextTick(() => console.log('F')); })\n  .then(() => console.log('G'));\nprocess.nextTick(() => { console.log('H'); Promise.resolve().then(() => console.log('I')); });\n(async () => { console.log('J'); await null; console.log('K'); })();\nconsole.log('L');` },
      complexity: `<p>No algorithmic cost; the skill is the model. Each callback is O(1) to enqueue and run.</p>`,
      followUps: ['What changes if this is an ES module file?', 'Where would a setImmediate inside the timeout callback print?']
    }
  }]
});

topics.push({
  title: 'libuv Thread Pool & Why a CPU Loop Blocks Everything',
  analogy: `<p>A small hotel has <b>one receptionist</b> (the JavaScript thread) and a <b>back office with 4 clerks</b> (the libuv thread pool). Guests ask for slow paperwork: reading old records (<code>fs</code>), password hashing (<code>crypto</code>), name look-ups (<code>dns.lookup</code>). The receptionist passes the form to a clerk and immediately greets the next guest. When a clerk finishes, a note lands on the desk and the receptionist reads it out. Now imagine the receptionist decides to hand-copy a 300-page report himself. The lobby fills up, nobody gets a room, and the 4 clerks sit idle. <b>That is a CPU loop blocking Node.</b></p>`,
  explain: `<p><b>Two different helpers exist behind Node.</b> Do not mix them up:</p>
  ${H.table(['Work', 'Who does it', 'Uses thread pool?'], [
    ['TCP/HTTP sockets, pipes', 'The operating system (epoll, kqueue, IOCP) tells libuv "data is ready"', '<span class="c-g">No</span>'],
    ['<code>fs.*</code> (readFile, stat, writeFile, also <code>fs.promises</code>)', 'A libuv worker thread does the blocking system call', '<span class="c-y">Yes</span>'],
    ['<code>crypto.pbkdf2</code>, <code>scrypt</code>, <code>randomBytes</code>, <code>bcrypt</code> (native addon)', 'Worker thread (CPU heavy)', '<span class="c-y">Yes</span>'],
    ['<code>zlib</code> async (gzip, brotli)', 'Worker thread', '<span class="c-y">Yes</span>'],
    ['<code>dns.lookup</code> (what <code>http.get("example.com")</code> uses)', 'Worker thread calls <code>getaddrinfo</code>', '<span class="c-y">Yes</span>'],
    ['<code>dns.resolve</code>', 'c-ares library, a real network request', '<span class="c-g">No</span>'],
    ['Your own <code>for</code> loop, <code>JSON.parse</code>, regex, sorting', '<b>The JS thread itself</b>', '<span class="c-r">No: it blocks!</span>']
  ])}
  <p><b>The pool has 4 threads by default.</b> The 5th concurrent pool task waits in a queue, even if you have 16 CPU cores. You can raise it with the environment variable <code>UV_THREADPOOL_SIZE</code> (maximum 1024), set <i>before</i> the process starts.</p>
  <p><b>Why a CPU loop blocks all requests:</b> your JavaScript runs on <b>one</b> thread and the event loop is also that thread. While it executes a callback, it cannot go around the ring. No new request is accepted, no timer fires, no response is written, and the pool's finished results sit unread. Every user feels the delay, not only the one who triggered it.</p>
  <p><b>Rule of thumb:</b> if a single callback takes more than about <b>10 to 50 ms</b>, move it off the main thread: a worker thread, a separate service, or split it into chunks that yield with <code>setImmediate</code>.</p>
  ${H.arr(['req A (slow loop 400 ms)', 'req B waits', 'req C waits', 'req D waits'], { label: 'same thread, one after another', hl: { 0: 'r', 1: 'y', 2: 'y', 3: 'y' }, idx: false })}`,
  clues: [
    '"Node is single threaded. How does it read files without blocking?" → libuv thread pool (and OS async I/O for sockets)',
    '"One endpoint is slow and <b>all</b> endpoints get slow" → a synchronous/CPU task is blocking the loop',
    '"8 password hashes at once are slower than expected" → only 4 pool threads, tasks queue; check <code>UV_THREADPOOL_SIZE</code>',
    '"HTTP calls hang while lots of file uploads are processed" → <code>dns.lookup</code> shares the same 4 threads',
    '"Why not just run Node with more threads?" → the answer is worker threads / cluster, with trade-offs',
    '"Latency spikes every few seconds, CPU low" → GC pause, sync call, or big JSON.parse blocking; measure loop lag'
  ],
  code: [
    {
      title: 'Prove it: a busy loop delays a 10 ms timer (runs in your browser)',
      run: true,
      code: `// The timer wants to run after 10 ms. The loop below keeps the thread busy for 200 ms.
var start = Date.now();
setTimeout(function () {
  console.log('timer asked for 10 ms, really ran at ' + (Date.now() - start) + ' ms  <-- blocked!');
}, 10);

while (Date.now() - start < 200) {
  // pretend this is JSON.parse of a huge file, a big regex or a nested loop
}
console.log('busy loop finished at ' + (Date.now() - start) + ' ms');
// Nothing else (timers, requests, I/O callbacks) could run during those 200 ms.`
    },
    {
      title: 'Thread pool model: 4 workers, tasks wait in a queue',
      run: true,
      code: `// MODEL of libuv's pool: N workers, a FIFO queue, each task takes some "time units".
function runPool(size, tasks) {
  var free = [];                 // when each worker becomes free
  for (var i = 0; i < size; i++) free.push(0);
  var lines = [];
  tasks.forEach(function (t, idx) {
    var w = 0;                   // pick the worker that is free first
    for (var k = 1; k < size; k++) if (free[k] < free[w]) w = k;
    var start = free[w], end = start + t.cost;
    free[w] = end;
    lines.push('task ' + (idx + 1) + ' (' + t.name + ') -> worker ' + (w + 1) + ', time ' + start + ' to ' + end);
  });
  lines.push('ALL DONE at time ' + Math.max.apply(null, free));
  return lines;
}
var tasks = [];
for (var n = 0; n < 8; n++) tasks.push({ name: 'pbkdf2', cost: 3 });   // 8 password hashes
console.log('--- pool size 4 (default) ---');
console.log(runPool(4, tasks).join('\\n'));
console.log('--- pool size 8 ---');
console.log(runPool(8, tasks).slice(-1)[0]);`
    },
    {
      title: 'Real Node: 8 hashes with the default pool of 4',
      code: `const crypto = require('crypto');

const t0 = Date.now();
for (let i = 1; i <= 8; i++) {
  // pbkdf2 runs on a libuv worker thread, not on the JS thread
  crypto.pbkdf2('password', 'salt', 200000, 64, 'sha512', () => {
    console.log('hash ' + i + ' finished after ' + (Date.now() - t0) + ' ms');
  });
}
// Typical result with 4 pool threads and enough CPU cores:
//   hashes 1-4 finish together at about T ms, hashes 5-8 finish together at about 2T ms.
// Run again with UV_THREADPOOL_SIZE=8 and all 8 finish at about T ms.`
    },
    {
      title: 'Launching with a bigger pool',
      lang: 'bash',
      code: `# set the pool size BEFORE node starts (do not rely on setting it inside your code)
UV_THREADPOOL_SIZE=8 node hash-demo.js

# find out how many CPUs the container really gives you
node -e "console.log(require('os').availableParallelism())"`
    },
    {
      title: 'A blocking Express route and two fixes',
      check: false,
      code: `const express = require('express');
const app = express();

// BAD: 400 ms of pure CPU on the main thread. Every other request waits.
app.get('/report-bad', (req, res) => {
  let sum = 0;
  for (let i = 0; i < 4e8; i++) sum += i % 7;
  res.json({ sum });
});

// FIX 1: chunk the work and let the loop breathe between chunks
app.get('/report-chunked', async (req, res) => {
  let sum = 0;
  const total = 4e8, chunk = 1e7;
  for (let i = 0; i < total; i += chunk) {
    for (let j = i; j < i + chunk; j++) sum += j % 7;
    await new Promise((resolve) => setImmediate(resolve));   // yield: other requests get a turn
  }
  res.json({ sum });
});

// FIX 2 (best for heavy work): move it to a worker thread (see the Worker Threads topic)
app.get('/ping', (req, res) => res.send('pong'));
app.listen(3000);`
    }
  ],
  codeTitle: ['Busy loop delays a timer', 'Thread pool model', 'pbkdf2 with the default pool', 'Launch with a bigger pool', 'Blocking route and fixes'],
  viz: [
    {
      title: 'Thread pool: 4 workers, tasks wait in a queue',
      input: 'c c c c c f f d',
      inputLabel: 'Tasks: c=crypto (3 units) f=fs (1) d=dns.lookup (2) z=zlib (2). Optional first word size=N sets pool size (default 4)',
      gen: function (input) {
        var toks = String(input).trim().toLowerCase().split(/[\s,]+/).filter(Boolean);
        var size = 4;
        if (toks.length && /^size=\d+$/.test(toks[0])) { size = parseInt(toks[0].slice(5), 10); toks.shift(); }
        if (size < 1 || size > 8) throw new Error('size must be 1 to 8');
        if (!toks.length || toks.length > 12 || toks.some(function (t) { return 'cfdz'.indexOf(t) < 0 || t.length !== 1; })) throw new Error('Use 1 to 12 task letters from: c f d z   (example: c c c c c f f d)');
        var KIND = { c: ['crypto', 3], f: ['fs', 1], d: ['dns', 2], z: ['zip', 2] };
        var tasks = toks.map(function (t, i) { return { id: i + 1, label: KIND[t][0].slice(0, 3) + '#' + (i + 1), cost: KIND[t][1], s: 0, e: 0, w: 0 }; });
        var free = [];
        for (var i = 0; i < size; i++) free.push(0);
        tasks.forEach(function (t) {
          var w = 0;
          for (var k = 1; k < size; k++) if (free[k] < free[w]) w = k;
          t.w = w; t.s = free[w]; t.e = t.s + t.cost; free[w] = t.e;
        });
        var T = Math.max.apply(null, free);
        var rowHead = [], colHead = [];
        for (i = 0; i < size; i++) rowHead.push('worker ' + (i + 1));
        for (i = 1; i <= T; i++) colHead.push('t' + i);
        function frame(t) {
          var rows = [], hl = {}, r, c;
          for (r = 0; r < size; r++) { rows.push([]); for (c = 0; c < T; c++) rows[r].push(''); }
          tasks.forEach(function (k) {
            for (var s = k.s + 1; s <= k.e && s <= t; s++) {
              rows[k.w][s - 1] = k.label;
              hl[k.w + ',' + (s - 1)] = s === t ? 'cur' : 'done';
            }
          });
          var waiting = tasks.filter(function (k) { return k.s >= t; }).map(function (k) { return k.label; });
          var doneN = tasks.filter(function (k) { return k.e <= t; }).length;
          var narr;
          if (t === 0) narr = '<b>' + tasks.length + ' tasks</b> are submitted at once. The pool has only <b>' + size + '</b> worker(s), so only ' + Math.min(size, tasks.length) + ' can start. The rest wait in the queue.';
          else {
            var started = tasks.filter(function (k) { return k.s + 1 === t; }).map(function (k) { return k.label; });
            narr = 'Time unit <b>' + t + '</b>. ' + (started.length ? 'Newly started: <b>' + started.join(', ') + '</b>. ' : '') + doneN + ' of ' + tasks.length + ' tasks done' + (waiting.length ? ', ' + waiting.length + ' still waiting for a free worker.' : '.');
            if (t === T) narr += ' <span class="c-g">All finished.</span> Try again with size=8 to see the queue disappear.';
          }
          return { narr: narr, parts: [
            { type: 'grid', label: 'Worker threads (rows) over time (columns)', rowHead: rowHead, colHead: colHead, rows: rows, hl: hl },
            { type: 'queue', label: 'Queue of tasks waiting for a worker', items: waiting, frontLabel: 'next out', backLabel: 'last in' },
            { type: 'vars', vals: { pool_size: size, finished: doneN + '/' + tasks.length, time: t } }
          ] };
        }
        var frames = [];
        for (var t = 0; t <= T; t++) frames.push(frame(t));
        return frames;
      }
    },
    {
      title: 'A CPU loop blocks every other request',
      input: '400',
      inputLabel: 'How long the slow request blocks the thread, in ms (150 to 800)',
      gen: function (input) {
        var B = parseInt(String(input).trim(), 10);
        if (isNaN(B) || B < 150 || B > 800) throw new Error('Enter a number of milliseconds from 150 to 800');
        var N = 6, step = Math.round(B / (N + 1)), arr = [], frames = [], k;
        for (k = 1; k <= N; k++) arr.push(step * k);
        frames.push({ narr: 'At <b>0 ms</b> a slow request (<code>/report</code>) starts a synchronous loop that needs <b>' + B + ' ms</b>. The one JavaScript thread is now busy.', parts: [
          { type: 'vars', vals: { time_ms: 0, thread: 'BUSY (report loop)' }, hl: { thread: 'bad' } },
          { type: 'queue', label: 'Requests waiting in the socket queue', items: [], frontLabel: 'next', backLabel: 'newest' }
        ] });
        for (k = 1; k <= N; k++) {
          var waits = arr.slice(0, k).map(function (a) { return arr[k - 1] - a; });
          frames.push({ narr: 'At <b>' + arr[k - 1] + ' ms</b> request <b>R' + k + '</b> (maybe just a tiny <code>/ping</code>) arrives. The kernel accepted the connection, but JavaScript cannot read it. It waits.', parts: [
            { type: 'vars', vals: { time_ms: arr[k - 1], thread: 'BUSY (report loop)' }, hl: { thread: 'bad' } },
            { type: 'queue', label: 'Requests waiting in the socket queue', items: arr.slice(0, k).map(function (a, i) { return 'R' + (i + 1); }), hl: { 0: 'bad' }, frontLabel: 'next', backLabel: 'newest' },
            { type: 'bars', label: 'How long each request has waited so far (ms)', values: waits, texts: waits.map(String), hl: { 0: 'bad' } }
          ] });
        }
        var lat = arr.map(function (a, i) { return B - a + 5 * (i + 1); });
        frames.push({ narr: 'At <b>' + B + ' ms</b> the loop ends. Now the thread is free and serves the queue one by one (5 ms each). Even a 1 ms ping answers late.', parts: [
          { type: 'vars', vals: { time_ms: B, thread: 'free, serving queue' }, hl: { thread: 'ok' } },
          { type: 'queue', label: 'Requests being served', items: arr.map(function (a, i) { return 'R' + (i + 1); }), hl: { 0: 'cur' }, frontLabel: 'next', backLabel: 'newest' }
        ] });
        frames.push({ narr: 'Final latency of each small request: <b>' + lat.join(', ') + ' ms</b> instead of about 5 ms. One slow callback hurt everybody. The fix is not "more async keywords", it is moving the CPU work to a worker thread or splitting it into chunks.', parts: [
          { type: 'bars', label: 'Latency seen by users (ms)', values: lat, texts: lat.map(String), idxLabels: arr.map(function (a, i) { return 'R' + (i + 1); }), hl: { 0: 'bad', 1: 'bad', 2: 'bad', 3: 'bad', 4: 'bad', 5: 'bad' } }
        ] });
        return frames;
      }
    }
  ],
  examples: [
    {
      title: 'Eight password hashes, four threads',
      html: `<p>You call <code>crypto.pbkdf2</code> 8 times at once; each needs about 100 ms of CPU. With the default pool:</p>
      ${H.table(['Hash', 'Worker', 'Starts', 'Finishes'], [['1-4', 'workers 1-4', '0 ms', '<span class="c-g">100 ms</span>'], ['5-8', 'workers 1-4 (again)', '100 ms', '<span class="c-y">200 ms</span>']])}
      <p>The slowest of the 8 takes 200 ms, not 100 ms. With 8 CPU cores and <code>UV_THREADPOOL_SIZE=8</code> all finish at about 100 ms. But on a 2-core machine, 8 threads would just time-share and nothing gets faster. Pool size should match <b>cores</b> for CPU work.</p>`
    },
    {
      title: 'What blocks the event loop? A checklist',
      html: `<ul>
      <li>Sync APIs: <code>readFileSync</code>, <code>pbkdf2Sync</code>, <code>execSync</code>, <code>zlib.gzipSync</code> (fine at start-up, never in a request).</li>
      <li><code>JSON.parse</code> / <code>JSON.stringify</code> of megabytes (a 50 MB body can take 300+ ms).</li>
      <li>Regex with <b>catastrophic backtracking</b> (ReDoS), e.g. <code>/(a+)+$/</code> on a long string of a's plus one other char.</li>
      <li>Big loops, sorting a million items, building huge strings, deep clone with <code>structuredClone</code> on large objects.</li>
      <li>Template/PDF/image rendering in pure JS.</li>
      </ul><p>None of these can be fixed with <code>async</code>. The thread must be freed, or the work moved.</p>`
    },
    {
      title: 'Pool starvation: HTTP calls hang while files are busy',
      html: `<p>A service reads 200 big files at once with <code>fs.readFile</code> and calls <code>fetch("https://api.example.com")</code>. The fetch needs <code>dns.lookup</code> to resolve the hostname, which uses the same 4 threads. The look-up waits behind the file reads, so the outgoing HTTP call looks "slow" although the network is fine.</p>
      ${H.kv([['pool thread 1-4', 'busy with fs reads'], ['dns.lookup', 'waiting in queue'], ['symptom', 'random slow fetch, no CPU use']], { label: 'what you would see', hl: { symptom: 'r' } })}
      <p>Fixes: limit file concurrency (for example 8 at a time with a small semaphore), raise <code>UV_THREADPOOL_SIZE</code>, or cache DNS.</p>`
    },
    {
      title: 'Measuring event loop lag in 6 lines',
      html: `<p>Use the built-in histogram. If p99 is above 100 ms, users feel stalls.</p>`,
      code: `const { monitorEventLoopDelay } = require('perf_hooks');

const h = monitorEventLoopDelay({ resolution: 10 });   // sample every 10 ms
h.enable();

setInterval(() => {
  // histogram values are in nanoseconds
  console.log('loop lag p50=' + (h.percentile(50) / 1e6).toFixed(1) + 'ms p99=' + (h.percentile(99) / 1e6).toFixed(1) + 'ms');
  h.reset();
}, 5000).unref();   // unref: do not keep the process alive just for this timer`
    }
  ],
  deepDive: `<p><b>How libuv hands work to the pool:</b> JavaScript calls a C++ binding such as <code>fs.read</code>. Node packs a <code>uv_work_t</code> request and calls <code>uv_queue_work</code>. libuv puts it in a global queue guarded by a mutex; an idle worker wakes up, runs the blocking function (<code>read()</code>, <code>PBKDF2</code>, <code>getaddrinfo</code>), then posts the result back and wakes the loop through an <b>async handle</b> (an eventfd or pipe). The loop sees it in the <b>poll</b> phase and runs your JS callback. So even pool results come back on the single JS thread, in order of completion.</p>
  <p><b>Sizing:</b> I/O-bound pool work (disk, DNS) benefits from more threads than cores because threads mostly wait. CPU-bound work (crypto) should not exceed core count. In containers <code>os.cpus().length</code> shows the <i>host</i> cores; use <code>os.availableParallelism()</code> (Node 18.14+, respects cgroup limits). The pool is created lazily on first use, so set the env var at process start, not mid-program (it is ignored on some platforms if set late).</p>
  <p><b>Many libraries hide the pool:</b> <code>bcrypt</code> (native), <code>sharp</code> (image resizing uses libuv threads plus its own), <code>sqlite3</code>, <code>argon2</code>. One busy library can starve the others, which is why heavy tenants get their own worker pool (<code>piscina</code>) with an explicit size.</p>
  <p><b>Detecting a block in production:</b> compare <i>CPU time</i> and <i>request latency</i>. High p99 loop lag with one core at 100% = sync CPU. High lag with low CPU = waiting in a pool queue or GC. Tools: <code>node --cpu-prof</code>, <code>clinic doctor</code>, <code>0x</code> flame graphs, and <code>blocked-at</code> in development. Never use <code>--max-old-space-size</code> as the cure for latency; GC pauses are only one cause.</p>
  <p><b>Linux io_uring:</b> libuv has experimental support for io_uring file operations, which can skip the pool. It is not the default in Node, so assume the 4-thread model in interviews and mention it as a future direction.</p>`,
  aiEra: `<p><b>What AI changes:</b> Assistants love <code>readFileSync</code>, <code>pbkdf2Sync</code> and <code>bcrypt.hashSync</code> in snippets because they are shorter, and the code works in a demo. Under load they are the #1 cause of "mysterious" latency. AI-built features also add CPU-heavy work to Node: tokenising text, chunking documents for RAG, computing embeddings similarity, parsing huge LLM JSON.</p>
  <p><b>Use AI as a partner:</b> paste a 30-line handler and ask <code>List every call that can block the event loop and estimate cost for 1 MB input</code>. Ask it to write a load test (autocannon) that mixes a slow and a fast endpoint so you can <i>see</i> the blocking.</p>
  <p><b>Where AI goes wrong:</b> it "parallelises" CPU work with <code>Promise.all</code> (no gain, one thread), recommends setting <code>UV_THREADPOOL_SIZE=128</code> as a cure-all, and suggests <code>setTimeout(fn, 0)</code> to unblock (moves but doesn't shorten the block). <b>What you must still own:</b> classifying each operation as "OS async", "pool", or "main thread CPU", and choosing worker threads, a queue, or a different service for the third kind.</p>`,
  problems: [{
    title: 'Explain and Fix: One Slow Endpoint Freezes the API',
    level: 'Medium',
    tags: ['event loop', 'blocking', 'thread pool', 'performance'],
    companies: ['Atlassian', 'Shopify', 'Swiggy'],
    statement: `<p>A Node API has <code>GET /report</code> that loops 400 million times (about 400 ms) and <code>GET /ping</code> that returns "pong". During a load test, <code>/ping</code> p99 jumps from 3 ms to 900 ms whenever someone calls <code>/report</code>. Explain <b>why</b>, and list <b>three fixes</b> from cheapest to strongest, with trade-offs.</p>`,
    constraints: `Single Node process, 1 CPU-bound endpoint, 200 requests per second of /ping, 2 requests per second of /report.`,
    example: `<p>Timeline: <code>/report</code> arrives at 0 ms and blocks until 400 ms. Pings that arrive in that window all wait; at 200 rps that is about 80 pings queued, each delayed up to 400 ms, plus queue drain time.</p>
    ${H.table(['Request', 'Arrives', 'Served at', 'Latency'], [['report', '0', '400', '400'], ['ping A', '10', '400', '<span class="c-r">390</span>'], ['ping B', '210', '405', '<span class="c-r">195</span>'], ['ping C', '500', '500', '<span class="c-g">1</span>']])}`,
    brute: {
      why: `<p>Making the handler <code>async</code> or wrapping the loop in <code>Promise.resolve().then()</code> changes nothing: the loop still runs on the main thread, just a microtask later. The wasted work is not CPU but waiting by innocent requests.</p>`,
      code: { lang: 'js', code: `// Looks async, still blocks the whole process\napp.get('/report', async (req, res) => {\n  const sum = await Promise.resolve().then(() => {\n    let s = 0;\n    for (let i = 0; i < 4e8; i++) s += i % 7;   // still on the JS thread\n    return s;\n  });\n  res.json({ sum });\n});`, check: false }
    },
    mcq: { q: 'Which change really keeps /ping fast while /report runs?', options: ['Add async/await to the handler', 'Run the report loop in a worker thread', 'Use setTimeout(fn, 0) once at the top', 'Increase UV_THREADPOOL_SIZE to 64'], answer: 1, explain: 'Only moving the loop to another thread (worker) or another process frees the main thread. async/await and the libuv pool size do not apply to your own JS loop.' },
    hints: [
      `<p>Hint 1: How many threads run your JavaScript? What does the event loop do while a callback is running?</p>`,
      `<p>Hint 2: Is the work I/O waiting (OS or thread pool can do it) or CPU in JS? Only the first kind is helped by "async".</p>`,
      `<p>Hint 3: Fix options in order: (a) chunk with setImmediate (cheap, still uses the same CPU), (b) worker thread (real parallelism, extra memory), (c) separate service or queue (isolation, extra ops cost). Say what you measure: event loop lag and p99.</p>`
    ],
    solution: {
      approach: `<p><b>Why:</b> JavaScript runs on one thread and the event loop is that thread. While the 400 ms loop runs, the loop cannot accept sockets, run timers or write responses. Every <code>/ping</code> that arrives waits in the OS socket queue until the callback ends; then they are served one by one, so p99 is roughly the length of the block.</p>
      <p><b>Fixes, cheapest first:</b></p>
      <ol><li><b>Chunk and yield</b>: process 10 million iterations, then <code>await new Promise(r =&gt; setImmediate(r))</code>. Pings get a turn between chunks. Cost: report takes a bit longer; still uses the main thread's CPU.</li>
      <li><b>Worker thread</b>: run the loop in <code>worker_threads</code> (ideally a pool such as piscina). The main thread only posts a message. Real parallelism on another core. Cost: about 30 MB per worker, serialization of data, more code.</li>
      <li><b>Separate process or service / job queue</b>: return 202 Accepted, put the job on a queue (BullMQ, SQS), let a worker service compute and store the result. Best isolation and scaling, most moving parts.</li></ol>
      <p>Also add a guard: measure loop lag with <code>monitorEventLoopDelay</code> and alert on p99 above 100 ms, and add a request timeout so one report cannot run unbounded.</p>`,
      code: { lang: 'js', code: `// Fix 1: chunk + yield (works anywhere, no extra threads)\nasync function heavySum(total, chunk) {\n  let sum = 0;\n  for (let i = 0; i < total; i += chunk) {\n    const end = Math.min(i + chunk, total);\n    for (let j = i; j < end; j++) sum += j % 7;\n    await new Promise((resolve) => setImmediate(resolve));   // let ping and other I/O run\n  }\n  return sum;\n}\nheavySum(4e7, 1e7).then((s) => console.log('sum =', s));` },
      complexity: `<p>Work is still O(n) CPU. Chunking adds n/chunk extra loop laps (negligible). A worker adds about 1 message round trip (tens of microseconds) plus serialization cost proportional to the data size.</p>`,
      followUps: ['How would you cap the number of concurrent reports?', 'What changes if the heavy work is a native addon that already runs on the libuv pool?']
    }
  }]
});

topics.push({
  title: 'Streams and Backpressure',
  analogy: `<p>A <b>kitchen sink</b>. The tap (a fast <i>readable</i> source) pours water; the drain (a slow <i>writable</i> destination, like a disk or a slow phone connection) lets it out. If you open the tap fully and ignore the drain, the sink overflows onto the floor: that is your server running out of memory. A smart plumber adds a <b>water-level mark</b> (<code>highWaterMark</code>). When the water reaches the mark the tap is switched off (<b>pause</b>); when the sink is empty again a light turns on (<b>drain</b>) and the tap is switched on (<b>resume</b>). This "tap off / tap on" conversation between fast and slow sides is called <b>backpressure</b>.</p>`,
  explain: `<p>A <b>stream</b> lets you process data <b>piece by piece</b> (chunks) instead of loading it all. Reading a 2 GB file with <code>fs.readFile</code> needs 2 GB of RAM; reading it as a stream needs about <b>64 KB</b> at a time.</p>
  ${H.table(['Type', 'You use it for', 'Example'], [
    ['<b>Readable</b>', 'a source of data', '<code>fs.createReadStream</code>, HTTP request body (on a server), <code>process.stdin</code>'],
    ['<b>Writable</b>', 'a destination', '<code>fs.createWriteStream</code>, HTTP response, <code>process.stdout</code>'],
    ['<b>Duplex</b>', 'both directions, independent', 'a TCP socket'],
    ['<b>Transform</b>', 'a Duplex that changes data on the way', '<code>zlib.createGzip()</code>, a CSV parser']
  ])}
  <p><b>How backpressure works, in 4 steps:</b></p>
  <ol>
    <li>Each writable has an internal <b>buffer</b> and a size limit called <code>highWaterMark</code> (HWM). For byte streams the default is 16 KiB (64 KiB in Node 22+); for object mode it is 16 objects.</li>
    <li><code>writable.write(chunk)</code> returns <code>true</code> if the buffer is still under the limit, <code>false</code> once it reached the limit.</li>
    <li>On <code>false</code>, a well-behaved producer <b>stops writing</b> and waits for the <code>'drain'</code> event.</li>
    <li>On <code>'drain'</code> the buffer is empty again; the producer resumes.</li>
  </ol>
  <p><b>You rarely write this by hand.</b> <code>readable.pipe(writable)</code> and, better, <code>stream.pipeline(a, b, c)</code> do the pause/resume dance for you and also clean up when something fails. The bug people make is doing a manual <code>for</code> loop of <code>write()</code> calls and <b>ignoring the return value</b>: memory then grows without limit.</p>
  <p><b>The limit is soft:</b> <code>write()</code> still accepts the chunk when it returns <code>false</code>; it is only a polite request to slow down. Ignore it and the data piles up in RAM.</p>
  ${H.chips(['write() → true', 'write() → false', 'stop writing', "wait for 'drain'", 'resume'], { label: 'the conversation', hl: { 'write() → false': 'r', "wait for 'drain'": 'y', resume: 'g' } })}`,
  clues: [
    '"Serve / upload / copy a <b>2 GB file</b> without running out of memory" → streams + <code>pipeline</code>',
    '"Process a huge CSV / log / JSON-lines file" → read stream + line splitter / Transform',
    '"Fast producer, slow consumer" or "memory grows while a client downloads slowly" → backpressure missing',
    '"What does <code>write()</code> returning false mean?" → buffer reached highWaterMark; wait for <code>drain</code>',
    '"<code>pipe</code> vs <code>pipeline</code>" → pipeline forwards errors and destroys all streams; pipe leaks on error',
    '"Stream tokens from an LLM to the browser" → chunked/SSE response + abort on client disconnect'
  ],
  code: [
    {
      title: 'Backpressure simulation: bounded buffer (pure JS, runnable)',
      run: true,
      code: `// MODEL of a Writable with highWaterMark. One tick = one unit of time.
// The consumer finishes one chunk every "consumeEvery" ticks. The producer wants to send one chunk per tick.
function simulate(total, hwm, consumeEvery, polite) {
  var buffer = 0, produced = 0, consumed = 0, maxBuffer = 0, paused = false, pauses = 0, tick = 0;
  while (consumed < total && tick < 10000) {
    tick++;
    // 1) the slow consumer (disk / network) finishes one chunk now and then
    if (tick % consumeEvery === 0 && buffer > 0) {
      buffer--; consumed++;
      if (paused && buffer === 0) paused = false;       // the 'drain' event fires: resume
    }
    // 2) the fast producer writes a chunk, unless it was told to wait
    if (produced < total && !(polite && paused)) {
      produced++; buffer++;
      var writeReturned = buffer < hwm;                  // what write() would return
      if (!writeReturned && polite) { paused = true; pauses++; }   // obey: stop and wait for 'drain'
    }
    if (buffer > maxBuffer) maxBuffer = buffer;
  }
  return { maxBuffer: maxBuffer, ticks: tick, pauses: pauses };
}
var total = 40, hwm = 4, every = 3;
var naive = simulate(total, hwm, every, false);
var polite = simulate(total, hwm, every, true);
console.log('highWaterMark = ' + hwm + ', ' + total + ' chunks, consumer is 3x slower than producer');
console.log('IGNORES write() result -> max chunks in RAM: ' + naive.maxBuffer + ' (finished in ' + naive.ticks + ' ticks)');
console.log('OBEYS backpressure     -> max chunks in RAM: ' + polite.maxBuffer + ' (finished in ' + polite.ticks + ' ticks, paused ' + polite.pauses + ' times)');
console.log('Same speed overall, because the slow consumer sets the pace. Memory is bounded.');`
    },
    {
      title: 'Copy + gzip a huge file with pipeline (Node)',
      code: `const fs = require('fs');
const zlib = require('zlib');
const { pipeline } = require('stream/promises');

// Memory stays around a few hundred KB even for a 20 GB file.
// pipeline: handles backpressure, forwards errors, and destroys every stream if one fails.
async function gzipFile(src, dest) {
  await pipeline(
    fs.createReadStream(src),          // Readable (64 KiB chunks)
    zlib.createGzip(),                 // Transform
    fs.createWriteStream(dest)         // Writable
  );
  console.log('done: ' + dest);
}

gzipFile(process.argv[2], process.argv[3]).catch((err) => {
  console.error('copy failed', err.code || err.message);
  process.exitCode = 1;
});`
    },
    {
      title: 'Manual backpressure: respect write() and wait for drain',
      code: `const fs = require('fs');
const { once } = require('events');

// Writes a million lines without ever holding more than ~one buffer in memory.
async function writeLines(path, count) {
  const out = fs.createWriteStream(path);
  for (let i = 0; i < count; i++) {
    const ok = out.write('line ' + i + '\\n');     // returns false when the buffer reached the limit
    if (!ok) await once(out, 'drain');           // pause until the buffer is empty again
  }
  out.end();
  await once(out, 'finish');
}

writeLines('/tmp/lines.txt', 1000000).then(() => console.log('written'));`
    },
    {
      title: 'Your own Transform stream',
      code: `const { Transform } = require('stream');

// Upper-cases text as it flows through. Backpressure comes for free:
// if the next stream is slow, callback() is simply called later.
class UpperCase extends Transform {
  _transform(chunk, encoding, callback) {
    callback(null, chunk.toString().toUpperCase());   // (error, outputChunk)
  }
}

process.stdin.pipe(new UpperCase()).pipe(process.stdout);`
    },
    {
      title: 'Read a big file line by line with async iteration',
      code: `const fs = require('fs');
const readline = require('readline');

async function countErrors(path) {
  const rl = readline.createInterface({ input: fs.createReadStream(path), crlfDelay: Infinity });
  let n = 0;
  // "for await" pulls one line at a time: the loop body is the natural backpressure
  for await (const line of rl) {
    if (line.includes(' ERROR ')) n++;
  }
  return n;
}

countErrors('./app.log').then((n) => console.log('errors: ' + n));`
    },
    {
      title: 'Express: stream a download safely',
      check: false,
      code: `const express = require('express');
const fs = require('fs');
const { pipeline } = require('stream');
const app = express();

app.get('/download/:name', (req, res, next) => {
  const file = fs.createReadStream('./files/' + require('path').basename(req.params.name));   // basename: no ../ tricks
  res.setHeader('Content-Type', 'application/octet-stream');
  // pipeline destroys the file stream if the client disconnects, so no file descriptor leaks
  pipeline(file, res, (err) => { if (err && !res.headersSent) next(err); });
});
app.listen(3000);`
    }
  ],
  codeTitle: ['Backpressure simulation', 'gzip a huge file with pipeline', 'Manual write/drain', 'A Transform stream', 'Line by line with for await', 'Streaming a download in Express'],
  viz: [
    {
      title: 'Stream buffer filling to highWaterMark: pause and resume',
      input: '4 3 10 polite',
      inputLabel: 'highWaterMark(2-6)  consumeEvery(1-4 ticks)  chunks(6-14)  mode: polite or naive',
      gen: function (input) {
        var t = String(input).trim().toLowerCase().split(/[\s,]+/);
        var hwm = parseInt(t[0], 10), every = parseInt(t[1], 10), total = parseInt(t[2], 10), polite = (t[3] || 'polite') !== 'naive';
        if (isNaN(hwm) || isNaN(every) || isNaN(total) || hwm < 2 || hwm > 6 || every < 1 || every > 4 || total < 6 || total > 14) throw new Error('Format: "4 3 10 polite" = highWaterMark 2-6, consumeEvery 1-4, chunks 6-14, then polite or naive');
        var NODES = [{ id: 'R', label: 'Readable (fast source)', x: 14, y: 20, shape: 'box' }, { id: 'B', label: 'Writable buffer', x: 50, y: 20, shape: 'box' }, { id: 'D', label: 'Disk / slow client', x: 86, y: 20, shape: 'box' }];
        var buffer = 0, produced = 0, consumed = 0, paused = false, tick = 0, frames = [], hist = [], pauses = 0;
        function snap(narr, wrote, ret) {
          var slots = Math.max(hwm + 1, buffer), vals = [], hl = {}, ptr = {}, texts = [], i;
          for (i = 0; i < slots; i++) {
            vals.push(i < buffer ? 10 : 0);
            texts.push(i < buffer ? 'chunk' : '');
            if (i < buffer) hl[i] = i >= hwm ? 'bad' : (wrote && i === buffer - 1 ? 'cur' : 'ok');
          }
          ptr[hwm - 1] = 'HWM line';
          var eh = {};
          eh['R-B'] = paused ? 'bad' : 'ok';
          eh['B-D'] = buffer > 0 ? 'ok' : '';
          frames.push({ narr: narr, parts: [
            { type: 'graph', label: 'Data flow', height: 40, directed: true, nodes: NODES, edges: [['R', 'B', paused ? 'PAUSED' : 'flowing'], ['B', 'D']], ehl: eh, hl: { R: paused ? 'bad' : 'ok', B: buffer >= hwm ? 'bad' : 'win' } },
            { type: 'bars', label: 'Writable buffer slots (the line marks highWaterMark = ' + hwm + ')', values: vals, texts: texts, hl: hl, ptr: ptr },
            { type: 'vars', vals: { tick: tick, buffered: buffer, highWaterMark: hwm, 'last write() returned': ret === undefined ? '-' : String(ret), producer: paused ? 'PAUSED (waiting for drain)' : 'writing', written: produced + '/' + total, flushed: consumed + '/' + total }, hl: { buffered: buffer >= hwm ? 'bad' : 'ok', producer: paused ? 'bad' : 'ok' } },
            { type: 'bars', label: 'Buffer size at every tick so far', values: hist.length ? hist.slice() : [0], texts: hist.length ? hist.map(String) : ['0'] }
          ] });
        }
        snap('Start. The readable is ready to send <b>' + total + '</b> chunks. The writable buffer is empty. The ' + (polite ? '<b>polite</b> producer will obey write() = false.' : '<b>naive</b> producer ignores the return value of write().') + ' The slow side finishes one chunk every ' + every + ' tick(s).');
        while (consumed < total && tick < 70) {
          tick++;
          var msg = '', wrote = false, ret;
          if (tick % every === 0 && buffer > 0) {
            buffer--; consumed++;
            msg += 'Slow side flushed one chunk to the disk. ';
            if (paused && buffer === 0) { paused = false; msg += '<span class="c-g">Buffer is empty: <code>drain</code> fires, producer resumes.</span> '; }
          }
          if (produced < total && !(polite && paused)) {
            produced++; buffer++; wrote = true;
            ret = buffer < hwm;
            msg += 'Producer wrote chunk ' + produced + ' → <code>write()</code> returned <b>' + ret + '</b>. ';
            if (!ret && polite) { paused = true; pauses++; msg += '<span class="c-r">Buffer reached highWaterMark, so the producer stops and waits for drain.</span>'; }
            if (!ret && !polite) msg += '<span class="c-r">It ignores false and keeps writing: the buffer grows past the line!</span>';
          } else if (produced < total) {
            msg += 'Producer is waiting (paused), writing nothing this tick.';
          }
          hist.push(buffer);
          if (!msg) msg = 'The producer is idle and the slow side is still working on a chunk.';
          snap('Tick ' + tick + '. ' + msg, wrote, ret);
        }
        frames.push({ narr: 'All ' + total + ' chunks flushed. Peak buffer: <b>' + Math.max.apply(null, hist) + '</b> chunks' + (polite ? ' (bounded near highWaterMark, paused ' + pauses + ' times)' : ' (way past the mark: this is memory you did not budget for)') + '. Try <code>naive</code> and <code>polite</code> with the same numbers.', parts: [
          { type: 'bars', label: 'Buffer size at every tick', values: hist.slice(), texts: hist.map(String), hl: (function () { var h = {}; hist.forEach(function (v, i) { if (v > hwm) h[i] = 'bad'; }); return h; })() },
          { type: 'vars', vals: { peak_buffer: Math.max.apply(null, hist), highWaterMark: hwm, ticks: tick } }
        ] });
        return frames;
      }
    }
  ],
  examples: [
    {
      title: 'readFile vs createReadStream: the memory maths',
      html: `<p>Serving a 2 GB video file to 100 users at the same time:</p>
      ${H.table(['Approach', 'Memory per request', 'For 100 users', 'First byte sent after'], [
        ['<code>readFile</code> then <code>res.send</code>', '2 GB', '<span class="c-r">200 GB (crash)</span>', 'after the whole file is read'],
        ['<code>createReadStream</code> piped to <code>res</code>', '~64 KiB', '<span class="c-g">~6.4 MB</span>', 'immediately']
      ])}
      <p>Streams also give a better time-to-first-byte, because data starts to flow before the whole file is ready.</p>`
    },
    {
      title: 'The bug: a write loop that ignores the return value',
      html: `<p>This looks fine and works in tests with 1,000 lines:</p>
      <pre>for (let i = 0; i &lt; 5e6; i++) out.write('row ' + i + '\\n');   // ignores the return value</pre>
      <p>Every row is accepted into the writable's buffer even though disk is slower than the loop. Memory climbs to hundreds of MB, GC pauses grow, the process may be killed by the OS (OOM). The same happens in production when a <b>slow client</b> downloads a response you generate quickly: 1,000 slow clients × a large buffer each = out of memory. This is why backpressure bugs show up only under load.</p>`
    },
    {
      title: 'pipe vs pipeline: who cleans up on error?',
      html: `<p>With <code>a.pipe(b).pipe(c)</code>, if <code>b</code> errors, <code>a</code> is not closed (file descriptor leak) and <code>c</code> never ends; you must add three <code>error</code> handlers. <code>pipeline(a, b, c, cb)</code> (or the promise version from <code>stream/promises</code>) destroys <b>all</b> streams and reports the first error once. Rule: <b>use pipeline, always</b>.</p>
      ${H.table(['', 'pipe()', 'pipeline()'], [['Backpressure', '<span class="c-g">yes</span>', '<span class="c-g">yes</span>'], ['Error forwarding', '<span class="c-r">no</span>', '<span class="c-g">yes</span>'], ['Cleanup on error / client abort', '<span class="c-r">no</span>', '<span class="c-g">yes</span>'], ['Promise / async friendly', 'no', '<span class="c-g">yes</span> (stream/promises)']])}`
    },
    {
      title: 'Object mode: streaming rows from a database',
      html: `<p>In <b>object mode</b> a chunk is a JavaScript object, and highWaterMark counts <b>objects</b> (default 16), not bytes. A DB cursor stream can push 16 rows, then wait until the CSV transform downstream asks for more. That is how you export 10 million rows with constant memory.</p>`,
      code: `const { Readable, Transform } = require('stream');
const { pipeline } = require('stream/promises');

// Fake "database cursor": an async generator that yields row objects
async function* rows() {
  for (let i = 1; i <= 5; i++) yield { id: i, name: 'user' + i };
}

const toCsv = new Transform({
  writableObjectMode: true,                       // input: objects
  transform(row, enc, cb) { cb(null, row.id + ',' + row.name + '\\n'); }   // output: text
});

pipeline(Readable.from(rows()), toCsv, process.stdout).catch(console.error);`
    }
  ],
  deepDive: `<p><b>Readable internals:</b> a readable has two modes. In <b>flowing</b> mode data is pushed to <code>'data'</code> listeners as fast as it arrives; in <b>paused</b> mode you pull with <code>read()</code> (or <code>for await</code>). Inside, <code>_read()</code> asks the source for more and the source calls <code>push(chunk)</code>. <code>push()</code> returns <code>false</code> when the readable's own buffer is over HWM; a well-written source then stops reading until <code>_read()</code> is called again. So backpressure exists <b>on both sides</b> of every link.</p>
  <p><b>Writable internals:</b> <code>write()</code> adds to a queue; <code>_write()</code> processes one chunk at a time. <code>writable.writableLength</code>, <code>writableHighWaterMark</code> and <code>writableNeedDrain</code> (Node 15.2+) let you inspect it. <code>cork()</code>/<code>uncork()</code> batches many small writes into one system call (useful for sockets).</p>
  <p><b>Real-world chain of buffers:</b> app buffer → libuv/kernel socket send buffer → TCP window → remote receiver. When the remote is slow, the kernel buffer fills, the socket's <code>write</code> returns false, <code>pipe</code> pauses the file read, and the disk read stops: <b>the slowness travels backwards through the chain</b> by itself. That is the beauty of the design, and it breaks the moment one link ignores the protocol.</p>
  <p><b>Defaults matter:</b> HWM was 16 KiB for a long time; Node 22 raised the default to 64 KiB for better throughput (check with <code>stream.getDefaultHighWaterMark(false)</code>). <code>fs.createReadStream</code> uses 64 KiB. Tune for throughput, not by guess: measure with realistic files, because bigger buffers cost memory × concurrent connections.</p>
  <p><b>Web streams:</b> <code>fetch()</code> returns a WHATWG <code>ReadableStream</code> as <code>response.body</code>. Convert with <code>Readable.fromWeb(res.body)</code> or just use <code>for await (const chunk of res.body)</code>. Same backpressure idea (queuing strategy and <code>desiredSize</code>), slightly different API. Node supports both families and converters (<code>Readable.toWeb</code>).</p>
  <p><b>Gotchas:</b> forgetting to consume a response (<code>undici</code> keeps the socket busy), attaching a <code>'data'</code> listener accidentally switches to flowing mode and drops data, async code between creating a stream and attaching a listener can lose early chunks, and <code>highWaterMark</code> in objectMode is a count, not bytes.</p>`,
  aiEra: `<p><b>What AI changes:</b> The biggest new streaming use case is <b>LLM token streaming</b>: the model sends tokens over SSE or chunked HTTP, your Node service forwards them to the browser. Many users are slow (mobile), so backpressure and cancelling matter: if the browser disconnects, you must abort the upstream call or you keep paying for tokens nobody reads.</p>
  <p><b>Use AI as a partner:</b> ask <code>Rewrite this readFile + res.send handler as a streaming pipeline with error handling, and explain where the buffers are</code>. Ask it to generate a script that creates a 1 GB test file and measures peak RSS before and after your change.</p>
  <p><b>Where AI goes wrong:</b> it writes <code>fs.readFile</code> or <code>await res.text()</code> for large inputs, uses <code>.pipe()</code> without error handlers, and ignores <code>drain</code> in manual loops. When asked for "streaming" it may only <code>res.write</code> in a loop with <code>setTimeout</code>. <b>What you must still own:</b> a checklist for any stream code: backpressure respected, errors forwarded, resources destroyed on client abort, memory bounded under N slow clients.</p>`,
  problems: [{
    title: 'Pipe a Large File with Backpressure',
    level: 'Medium',
    tags: ['streams', 'backpressure', 'pipeline', 'memory'],
    companies: ['Dropbox', 'Netflix', 'Zoom'],
    statement: `<p>An endpoint must send a 5 GB log file as a gzip download, and a separate job must write 10 million lines to a file. Your pod has 512 MB RAM. Show how you stream both with <b>bounded memory</b>, how you handle a client that disconnects half-way, and explain exactly what <code>write()</code> returning <code>false</code> means.</p>`,
    constraints: `Node 20+, 512 MB memory limit, up to 50 simultaneous downloads, files bigger than RAM.`,
    example: `<p>Download path: <code>fs.createReadStream → createGzip → res</code> via <code>pipeline</code>. Memory per download is about 64 KiB (read buffer) + gzip window (~256 KiB) + socket buffer, so ${H.c('g', '50 downloads ≈ 20-30 MB')}. Loading the file with readFile would need ${H.c('r', '5 GB per download')}.</p>`,
    brute: {
      why: `<p><code>readFile</code> pulls the whole file into memory (5 GB) before the first byte is sent, and the write loop never checks the return value of <code>write()</code>, so memory grows with every unflushed line.</p>`,
      code: { lang: 'js', check: false, code: `app.get('/log', async (req, res) => {\n  const data = await fs.promises.readFile('./big.log');   // 5 GB in RAM: crash\n  res.send(zlib.gzipSync(data));                          // plus blocks the event loop\n});\n\nfor (let i = 0; i < 1e7; i++) out.write('line ' + i + '\\n');   // ignores backpressure` }
    },
    mcq: { q: 'What should a producer do when writable.write() returns false?', options: ['Throw an error, the stream is broken', 'Stop writing until the "drain" event fires', 'Call write() again immediately to flush', 'Increase highWaterMark to zero'], answer: 1, explain: 'false means the internal buffer reached highWaterMark. The data is still accepted, but you should pause until drain so memory stays bounded.' },
    hints: [
      `<p>Hint 1: Where does the data sit in memory at any moment? Aim for "a few chunks", never "the whole file".</p>`,
      `<p>Hint 2: Which Node helper connects Readable → Transform → Writable, handles pause/resume, and destroys everything on error or client abort?</p>`,
      `<p>Hint 3: Recipe: (a) download: <code>pipeline(createReadStream, createGzip, res, cb)</code>; (b) writer loop: <code>if (!out.write(x)) await once(out, 'drain')</code>; (c) on client abort pipeline destroys the file stream; (d) always set Content-Type / Content-Encoding headers before piping.</p>`
    ],
    solution: {
      approach: `<p><b>Download:</b> use <code>pipeline(fs.createReadStream(path), zlib.createGzip(), res, cb)</code>. Each chunk is read, compressed and written to the socket; when the client is slow the socket buffer fills, <code>res.write</code> returns false internally, the gzip stream pauses, and the file read stops. If the client disconnects, <code>pipeline</code> destroys all three streams, so no file descriptor leaks.</p>
      <p><b>Writer:</b> after each <code>write()</code> check the boolean; on <code>false</code> <code>await once(out, 'drain')</code>. Memory stays near one highWaterMark. <code>false</code> does not mean data was lost; it means "your request was accepted but please slow down".</p>
      <p>Extra: limit concurrent downloads with a counter or semaphore, set timeouts, and prefer streaming with <code>Content-Length</code> unknown (chunked transfer) when compressing on the fly.</p>`,
      code: { lang: 'js', check: false, code: `const fs = require('fs');\nconst zlib = require('zlib');\nconst { pipeline } = require('stream');\nconst { once } = require('events');\n\n// 1) Download endpoint (Express style)\napp.get('/log.gz', (req, res, next) => {\n  res.setHeader('Content-Type', 'text/plain');\n  res.setHeader('Content-Encoding', 'gzip');\n  pipeline(fs.createReadStream('./big.log'), zlib.createGzip(), res, (err) => {\n    if (err) console.error('download aborted:', err.code || err.message);   // client left, or disk error\n  });\n});\n\n// 2) Writer job with manual backpressure\nasync function writeMillions() {\n  const out = fs.createWriteStream('./out.txt');\n  for (let i = 0; i < 1e7; i++) {\n    if (!out.write('line ' + i + '\\n')) await once(out, 'drain');\n  }\n  out.end();\n  await once(out, 'finish');\n}` },
      complexity: `<p>Time O(file size). Memory O(highWaterMark × number of streams in the chain) per request, independent of file size. 50 downloads need tens of MB, not hundreds of GB.</p>`,
      followUps: ['How do you stop a runaway client that never reads (slow-loris download)?', 'How would you resume a partial download with Range requests?']
    }
  }]
});

topics.push({
  title: 'EventEmitter: The Observer Pattern Inside Node',
  analogy: `<p>A <b>radio station</b>. People tune in to a channel (<code>on('news', listener)</code>). When the station broadcasts (<code>emit('news', data)</code>), every listener hears it, in the order they tuned in. A <b>one-time ticket</b> (<code>once</code>) works for only the first broadcast. The channel called <b>error</b> is the <b>fire alarm</b>: if nobody is listening to it when it rings, the building is evacuated, meaning Node throws and (usually) the process dies.</p>`,
  explain: `<p>Almost everything in Node is an <b>EventEmitter</b>: HTTP servers, sockets, streams, child processes. The class from the <code>events</code> module has a tiny API:</p>
  ${H.table(['Method', 'Meaning', 'Notes'], [
    ['<code>on(name, fn)</code> / <code>addListener</code>', 'Subscribe to an event', 'Listeners run in the order they were added'],
    ['<code>once(name, fn)</code>', 'Subscribe for the first emit only', 'Removed <i>before</i> it runs'],
    ['<code>off(name, fn)</code> / <code>removeListener</code>', 'Unsubscribe', 'You need the same function reference'],
    ['<code>emit(name, ...args)</code>', 'Call every listener now', 'Returns <code>true</code> if anyone listened'],
    ['<code>prependListener</code>', 'Subscribe at the front of the line', 'Runs before others'],
    ['<code>listenerCount(name)</code>', 'How many listeners?', 'Good for debugging leaks']
  ])}
  <p><b>Three facts that surprise beginners:</b></p>
  <ol>
    <li><b><code>emit</code> is synchronous.</b> It calls each listener one after the other <i>before</i> <code>emit</code> returns. Nothing about events is automatically "async". A slow listener blocks the emitter and the event loop.</li>
    <li><b>The special <code>'error'</code> event.</b> If you emit <code>'error'</code> and there is no <code>'error'</code> listener, Node <b>throws</b> the error. Always add <code>emitter.on('error', handler)</code> to anything that can fail (streams, sockets, your own classes).</li>
    <li><b>Events emitted before anyone listens are lost.</b> There is no replay. That is why constructors use <code>process.nextTick</code> to emit later.</li>
  </ol>
  <p>You make your own emitter by extending the class: <code>class Order extends EventEmitter {}</code>. It is the simplest way to decouple parts of a program: the "order" code announces <i>"order created"</i> without knowing who sends the email, updates stock or writes the audit log.</p>
  ${H.kv([['data', 'logger, parser'], ['end', 'cleanup (once)'], ['error', 'alerting']], { label: 'listeners by event name (a Map of arrays)', hl: { error: 'r' } })}`,
  clues: [
    '"Implement an EventEmitter / pub-sub class with on, off, emit, once"',
    '"Node warns <code>MaxListenersExceededWarning: 11 listeners</code>" → listener leak (adding listeners in a loop or per request)',
    '"Process crashed with <code>Unhandled error event</code>" → emitted <code>error</code> without a listener',
    '"Are event listeners async?" → no; <code>emit</code> is synchronous, listeners run in order',
    '"The event fired but my handler never ran" → registered after the emit (events are not replayed)',
    '"Observer / publish-subscribe in Node" → EventEmitter, but in-process only (not across services)'
  ],
  code: [
    {
      title: 'Mini EventEmitter with on / once / off / emit (pure JS, runnable)',
      run: true,
      code: `// A small, correct EventEmitter. Same behaviour as Node's for the basics.
class MiniEmitter {
  constructor() { this._events = new Map(); }       // event name -> array of listener functions

  on(name, fn) {
    if (typeof fn !== 'function') throw new TypeError('listener must be a function');
    if (!this._events.has(name)) this._events.set(name, []);
    this._events.get(name).push(fn);
    return this;                                     // chaining: a.on(...).on(...)
  }
  prependListener(name, fn) {
    if (!this._events.has(name)) this._events.set(name, []);
    this._events.get(name).unshift(fn);
    return this;
  }
  once(name, fn) {
    const self = this;
    function wrapper(...args) {
      self.off(name, wrapper);                      // remove FIRST, so it can never run twice
      return fn.apply(self, args);
    }
    wrapper.listener = fn;                           // remember the original so off(name, fn) still works
    return this.on(name, wrapper);
  }
  off(name, fn) {
    const list = this._events.get(name);
    if (!list) return this;
    const i = list.findIndex(function (l) { return l === fn || l.listener === fn; });
    if (i >= 0) list.splice(i, 1);
    if (list.length === 0) this._events.delete(name);
    return this;
  }
  emit(name, ...args) {
    const list = this._events.get(name);
    if (!list || list.length === 0) {
      if (name === 'error') {                        // the fire alarm: no listener -> throw
        throw args[0] instanceof Error ? args[0] : new Error('Unhandled error event: ' + args[0]);
      }
      return false;
    }
    list.slice().forEach((fn) => fn.apply(this, args));   // slice(): safe if a listener adds or removes listeners
    return true;
  }
  listenerCount(name) { return (this._events.get(name) || []).length; }
}

const bus = new MiniEmitter();
const logger = (x) => console.log('logger got', x);
bus.on('data', logger);
bus.on('data', (x) => console.log('parser got', x));
bus.once('end', () => console.log('end handled (only once)'));

console.log('emit data ->', bus.emit('data', 42));      // true, both listeners run in order
console.log('emit end  ->', bus.emit('end'));            // true
console.log('emit end  ->', bus.emit('end'));            // false: the once listener is gone
bus.off('data', logger);
bus.emit('data', 43);                                    // only the parser runs now
console.log('listeners left for data:', bus.listenerCount('data'));
try { bus.emit('error', new Error('disk full')); } catch (e) { console.log('error with no listener THROWS:', e.message); }`
    },
    {
      title: 'Real Node: extend EventEmitter, handle error, await an event',
      code: `const EventEmitter = require('events');
const { once } = require('events');

class Downloader extends EventEmitter {
  start(url) {
    // emit later, so the caller can attach listeners right after start()
    setImmediate(() => {
      this.emit('progress', 50);
      if (url.startsWith('bad')) this.emit('error', new Error('cannot reach ' + url));
      else this.emit('done', { url, bytes: 1024 });
    });
    return this;
  }
}

async function main() {
  const d = new Downloader();
  d.on('progress', (p) => console.log('progress', p + '%'));
  d.on('error', (err) => console.error('failed:', err.message));   // ALWAYS add this
  d.start('good.example.com');
  const [result] = await once(d, 'done');       // promise that resolves on the next 'done'; rejects on 'error'
  console.log('result', result);
}
main();`
    },
    {
      title: 'Listener leak: the classic bug and its fix',
      check: false,
      code: `const EventEmitter = require('events');
const config = new EventEmitter();     // long-lived, shared by every request

// BAD: every request adds a listener and never removes it.
// After 11 requests Node prints MaxListenersExceededWarning, and memory keeps growing.
app.get('/bad', (req, res) => {
  config.on('changed', () => res.write('config changed'));   // closes over res: leaks the response
  res.end('ok');
});

// GOOD: remove it when the request ends (or use once with an AbortSignal)
app.get('/good', (req, res) => {
  const onChange = () => res.write('config changed');
  config.on('changed', onChange);
  res.on('close', () => config.off('changed', onChange));    // always cleans up
  res.end('ok');
});`
    },
    {
      title: 'Async listeners: emit does not wait for them',
      code: `const EventEmitter = require('events');

// captureRejections: a rejected async listener is routed to the 'error' event
// instead of becoming an unhandled rejection that could crash the process.
const bus = new EventEmitter({ captureRejections: true });

bus.on('order', async (o) => {
  await Promise.resolve();
  throw new Error('email service down for order ' + o.id);   // async failure
});
bus.on('error', (err) => console.error('captured:', err.message));

bus.emit('order', { id: 7 });          // returns immediately, does NOT await the listener
console.log('emit returned before the async listener finished');`
    }
  ],
  codeTitle: ['Mini EventEmitter', 'Extending EventEmitter in Node', 'Listener leak and fix', 'Async listeners and captureRejections'],
  viz: [
    {
      title: 'EventEmitter: listeners map and emit step by step',
      input: 'on:data:A on:data:B once:end:C emit:data emit:end emit:end off:data:A emit:data emit:error',
      inputLabel: 'Operations: on:event:Name  once:event:Name  prepend:event:Name  off:event:Name  emit:event',
      gen: function (input) {
        var ops = String(input).trim().split(/\s+/).filter(Boolean);
        if (!ops.length || ops.length > 14) throw new Error('Give 1 to 14 operations, e.g. on:data:A emit:data');
        var L = {}, frames = [], dead = false;
        function entries() {
          var e = Object.keys(L).filter(function (k) { return L[k].length; }).map(function (k) {
            return [k, L[k].map(function (x) { return x.n + (x.once ? ' (once)' : ''); }).join(', ')];
          });
          return e.length ? e : [['(no listeners yet)', '-']];
        }
        function snap(narr, codeLine, hlMap, invoked, hlInv, ret) {
          var parts = [
            { type: 'map', label: 'emitter._events  (event name → listeners, in call order)', entries: entries(), hl: hlMap || {} },
            { type: 'code', label: 'Your call', lang: 'js', code: codeLine, hl: { 1: 'cur' } }
          ];
          if (invoked) parts.push({ type: 'queue', label: 'Listeners called, in order (synchronously)', items: invoked, hl: hlInv || {}, frontLabel: 'first', backLabel: 'last' });
          if (ret !== undefined) parts.push({ type: 'vars', vals: { 'emit() returned': String(ret) }, hl: { 'emit() returned': ret ? 'ok' : 'bad' } });
          frames.push({ narr: narr, parts: parts });
        }
        snap('We start with an emitter that has <b>no listeners</b>. It keeps a Map: event name → array of functions.', 'const e = new EventEmitter();', {});
        ops.forEach(function (op) {
          if (dead) return;
          var p = op.split(':'), kind = p[0].toLowerCase(), ev = p[1], nm = p[2];
          if (['on', 'once', 'prepend', 'off', 'emit'].indexOf(kind) < 0 || !ev || (kind !== 'emit' && !nm)) throw new Error('Bad operation "' + op + '". Use on:event:Name, once:event:Name, prepend:event:Name, off:event:Name, emit:event');
          var h = {}; h[ev] = 'ok';
          if (kind === 'on' || kind === 'once' || kind === 'prepend') {
            L[ev] = L[ev] || [];
            var item = { n: nm, once: kind === 'once' };
            if (kind === 'prepend') L[ev].unshift(item); else L[ev].push(item);
            snap((kind === 'prepend' ? '<b>prependListener</b> puts ' + nm + ' at the FRONT of the line.' : kind === 'once' ? '<b>once</b> registers ' + nm + ' but it will remove itself right before its first call.' : '<b>on</b> appends ' + nm + ' to the end of the list for "' + ev + '".'), "e." + (kind === 'prepend' ? 'prependListener' : kind) + "('" + ev + "', " + nm + ");", h);
          } else if (kind === 'off') {
            var before = (L[ev] || []).length;
            L[ev] = (L[ev] || []).filter(function (x) { return x.n !== nm; });
            h = {}; h[ev] = before === L[ev].length ? 'bad' : 'sel';
            snap(before === L[ev].length ? 'Nothing named ' + nm + ' was registered for "' + ev + '", so <code>off</code> does nothing.' : '<b>off</b> removed ' + nm + '. You need the same function reference to do this in real code.', "e.off('" + ev + "', " + nm + ");", h);
          } else {
            var list = (L[ev] || []).slice();
            if (!list.length) {
              if (ev === 'error') {
                snap('<span class="c-r">No "error" listener exists, so emit THROWS an Error. Uncaught, the whole Node process crashes.</span> Always attach <code>e.on("error", ...)</code>.', "e.emit('error', new Error('boom'));", { error: 'bad' }, [], {}, undefined);
                dead = true;
              } else snap('Nobody listens to "' + ev + '", so nothing runs and <code>emit</code> returns <b>false</b>. The event is simply lost (no replay).', "e.emit('" + ev + "');", {}, [], {}, false);
              return;
            }
            var names = list.map(function (x) { return x.n; });
            var hi = {}; names.forEach(function (n, i) { hi[i] = 'cur'; });
            snap('<b>emit</b> calls ' + names.join(', ') + ' one after another, <b>synchronously</b>, then returns <b>true</b>. ' + (list.some(function (x) { return x.once; }) ? 'The once-listener is removed just before it runs.' : ''), "e.emit('" + ev + "');", h, names, hi, true);
            L[ev] = L[ev].filter(function (x) { return !x.once; });
          }
        });
        snap(dead ? 'The program crashed at the unhandled "error" event. Lesson: handle <code>error</code> on every emitter that can fail.' : 'End of the script. Remaining listeners are shown above. Each still holds a reference to its closure: forgotten <code>on</code> calls are memory leaks.', "// end of script", {});
        return frames;
      }
    }
  ],
  examples: [
    {
      title: 'Order of listeners = order of registration',
      html: `<p>Registering <code>A</code> then <code>B</code> then <code>prependListener(C)</code> gives the call order <b>C, A, B</b>. If <code>A</code> throws, <code>B</code> never runs (the exception travels up through <code>emit</code>). Because of this, wrap risky listener code in try/catch or use <code>captureRejections</code> for async ones.</p>
      ${H.arr(['C', 'A', 'B'], { label: 'call order after prependListener(C)', hl: { 0: 'y' }, idx: true })}`
    },
    {
      title: 'once() with a timeout: wait for an event or give up',
      html: `<p><code>events.once(emitter, 'ready')</code> returns a promise. Combine with an <code>AbortSignal</code> so a missing event cannot hang your program forever.</p>`,
      code: `const { once, EventEmitter } = require('events');

async function waitReady(server, ms) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  try {
    await once(server, 'ready', { signal: ac.signal });   // rejects with AbortError on timeout
    return true;
  } catch (err) {
    if (err.name === 'AbortError') return false;           // gave up waiting
    throw err;                                             // a real 'error' event
  } finally {
    clearTimeout(timer);
  }
}

waitReady(new EventEmitter(), 100).then((ok) => console.log('ready?', ok));`
    },
    {
      title: 'Why the 11th listener prints a warning',
      html: `<p>By default one event may have <b>10</b> listeners. The 11th triggers <code>MaxListenersExceededWarning: Possible EventEmitter memory leak detected</code>. It is only a warning; the listeners are still added. The number is a smell detector, not a limit. If you truly need more (for example many sockets listening to one shared bus) raise it on that emitter with <code>setMaxListeners(n)</code>, but first ask "who removes these listeners?".</p>
      ${H.table(['Listeners on one event', 'What Node does'], [['1-10', 'nothing'], ['11+', '<span class="c-y">prints a warning once</span>'], ['100,000 (never removed)', '<span class="c-r">memory leak, slow emit</span>']])}`
    },
    {
      title: 'In-process pub/sub is not a message broker',
      html: `<p>An EventEmitter lives inside <b>one process</b>. If the process restarts the events are gone. If you run 4 cluster workers, a worker only hears its own emits. For cross-process or durable events use Redis pub/sub, a queue (SQS, RabbitMQ) or Kafka. Use EventEmitter for in-process decoupling and lifecycle hooks.</p>`
    }
  ],
  deepDive: `<p><b>Node's real implementation</b> (<code>lib/events.js</code>) stores listeners in a plain object <code>_events</code> with a counter. A clever optimisation: when an event has <b>one</b> listener it is stored as the function itself, not an array, which avoids an allocation for the very common case. On the second listener it becomes an array. <code>emit</code> clones the array before looping (<code>arrayClone</code>) so adding or removing listeners from inside a listener does not change the run in progress; this is the same reason our mini version uses <code>slice()</code>.</p>
  <p><b>Meta events:</b> <code>'newListener'</code> fires before a listener is added and <code>'removeListener'</code> after one is removed. Frameworks use them for lazy setup (start reading only when somebody listens to <code>'data'</code>, which is exactly how a Readable switches to flowing mode).</p>
  <p><b>Errors and async:</b> <code>emit</code> never waits for promises returned by listeners. A rejected async listener becomes an <b>unhandled rejection</b>, which can crash the process in modern Node. Use <code>new EventEmitter({ captureRejections: true })</code> so the rejection is forwarded to the <code>'error'</code> event (or to <code>emitter[Symbol.for('nodejs.rejection')]</code>).</p>
  <p><b>Async iteration:</b> <code>for await (const [x] of on(emitter, 'tick'))</code> turns events into a pull-based stream, with an internal queue. Remember to pass a <code>signal</code> to stop, or the loop never ends and the listener stays attached.</p>
  <p><b>EventTarget:</b> Node also ships the browser's <code>EventTarget</code> / <code>Event</code> (used by <code>AbortSignal</code>, <code>BroadcastChannel</code>, web streams). It differs from EventEmitter: listeners get an <code>Event</code> object, no special <code>error</code> semantics, no <code>once</code>-by-name helpers (use the <code>{ once: true }</code> option).</p>
  <p><b>Design advice:</b> events are great for notification ("something happened") and weak for request/response ("do this and give me the result"). Too many events make control flow impossible to trace (a debugging nightmare called "event spaghetti"). Name events consistently (<code>order.created</code>), document the payload shape, and always unsubscribe in the same place where you subscribe.</p>`,
  aiEra: `<p><b>What AI changes:</b> Modern AI SDKs expose streams as emitters: <code>stream.on('text', ...)</code>, <code>stream.on('toolCall', ...)</code>, <code>stream.on('end')</code>. Agent frameworks emit lifecycle events (start, token, tool result, error) and your observability code listens. EventEmitter patterns are everywhere in AI backends.</p>
  <p><b>Use AI as a partner:</b> ask it to <code>implement an EventEmitter with once/off/prepend/error semantics and then write 12 test cases that compare it against Node's real class</code>. Differential testing against the real implementation is a great way to catch mistakes in generated code.</p>
  <p><b>Where AI goes wrong:</b> it registers listeners inside request handlers without removing them, forgets the <code>'error'</code> listener on child processes or sockets, assumes <code>emit</code> awaits async listeners, and for "once" implementations often removes the wrapper after the call (so a re-entrant emit runs it twice). <b>What you must still own:</b> thinking about listener <b>lifetime</b>: who adds it, who removes it, and what it captures. In reviews, count <code>.on(</code> calls and look for the matching <code>.off(</code>.</p>`,
  problems: [{
    title: 'Write Your Own EventEmitter',
    level: 'Medium',
    tags: ['EventEmitter', 'observer pattern', 'closures', 'machine coding'],
    companies: ['Flipkart', 'Razorpay', 'Atlassian'],
    statement: `<p>Implement <code>class Emitter</code> with <code>on(name, fn)</code>, <code>once(name, fn)</code>, <code>off(name, fn)</code> and <code>emit(name, ...args)</code>. Requirements: listeners run in registration order; <code>emit</code> returns <code>true</code> if at least one listener ran; <code>once</code> listeners run at most one time even if <code>emit</code> is called from inside a listener (re-entrancy); <code>off</code> works with the original function for <code>once</code> listeners; emitting <code>'error'</code> with no listener throws; a listener that removes itself or others during <code>emit</code> must not break the current round.</p>`,
    constraints: `Plain JavaScript, no libraries. Up to 10<sup>5</sup> listeners per event; emit should be O(listeners).`,
    example: `<p>${H.c('b', "e.once('x', f); e.emit('x'); e.emit('x');")} → f runs <b>once</b>; the second emit returns <b>false</b>.</p>`,
    brute: {
      why: `<p>Storing listeners in an array and removing the once-wrapper <i>after</i> calling it breaks when the listener emits the same event again (it runs twice). Also iterating the live array while listeners call <code>off</code> skips listeners.</p>`,
      code: { lang: 'js', code: `class BadEmitter {\n  constructor() { this.l = {}; }\n  on(n, f) { (this.l[n] = this.l[n] || []).push(f); }\n  once(n, f) { this.on(n, (...a) => { f(...a); this.off(n, f); }); }   // BUG 1: removes AFTER the call; off(f) never matches the wrapper\n  off(n, f) { this.l[n] = (this.l[n] || []).filter((x) => x !== f); }\n  emit(n, ...a) { (this.l[n] || []).forEach((f) => f(...a)); }          // BUG 2: iterates the live array, no return value\n}\nconsole.log(typeof new BadEmitter().emit);` }
    },
    mcq: { q: 'Why does emit() loop over a copy (slice) of the listener array?', options: ['To make emit faster', 'So listeners that add or remove listeners do not corrupt the current round', 'Because arrays are immutable in JS', 'To run listeners in parallel'], answer: 1, explain: 'Mutating an array while iterating it can skip or repeat entries. A snapshot makes the round predictable.' },
    hints: [
      `<p>Hint 1: Store a Map from event name to an array of functions. What should <code>on</code> return so calls can be chained?</p>`,
      `<p>Hint 2: <code>once</code> is just <code>on</code> with a wrapper. The wrapper must call <code>off</code> <b>first</b>, then the real function. Keep a reference <code>wrapper.listener = fn</code> so <code>off(name, fn)</code> can find it.</p>`,
      `<p>Hint 3: Recipe for emit: get the list; if empty → throw for 'error' else return false; copy with slice; call each with <code>this</code> bound to the emitter; return true.</p>`
    ],
    solution: {
      approach: `<p>Use a <code>Map&lt;string, Function[]&gt;</code>. <code>on</code> pushes; <code>once</code> pushes a wrapper that first calls <code>off(name, wrapper)</code> and then the real listener, and tags <code>wrapper.listener = fn</code> so <code>off</code> can match either the wrapper or the original. <code>emit</code> takes a snapshot with <code>slice()</code>, so self-removal and re-entrancy are safe, and returns whether any listener existed. Emitting <code>'error'</code> with no listener throws the error (or wraps a non-Error).</p>`,
      code: {
        lang: 'js',
        run: true,
        code: `class Emitter {
  constructor() { this.map = new Map(); }
  on(name, fn) {
    if (!this.map.has(name)) this.map.set(name, []);
    this.map.get(name).push(fn);
    return this;
  }
  once(name, fn) {
    const self = this;
    function wrapper(...args) { self.off(name, wrapper); return fn.apply(self, args); }
    wrapper.listener = fn;
    return this.on(name, wrapper);
  }
  off(name, fn) {
    const list = this.map.get(name);
    if (!list) return this;
    const i = list.findIndex((l) => l === fn || l.listener === fn);
    if (i !== -1) list.splice(i, 1);
    if (!list.length) this.map.delete(name);
    return this;
  }
  emit(name, ...args) {
    const list = this.map.get(name);
    if (!list || !list.length) {
      if (name === 'error') throw args[0] instanceof Error ? args[0] : new Error('Unhandled error: ' + args[0]);
      return false;
    }
    for (const fn of list.slice()) fn.apply(this, args);
    return true;
  }
}

// tests
const e = new Emitter();
let n = 0;
const f = () => { n++; e.emit('x'); };        // re-entrant: emits the same event from inside
e.once('x', f);
console.log('first emit  ->', e.emit('x'), 'calls =', n);    // true, 1
console.log('second emit ->', e.emit('x'), 'calls =', n);    // false, still 1
const g = () => console.log('g ran');
e.once('y', g); e.off('y', g);
console.log('off works on once listeners ->', e.emit('y'));   // false
try { e.emit('error', new Error('boom')); } catch (err) { console.log('throws:', err.message); }`
      },
      complexity: `<p><code>on</code>/<code>once</code> O(1); <code>off</code> O(L) to find the listener; <code>emit</code> O(L) for L listeners (plus O(L) for the snapshot). Memory O(total listeners).</p>`,
      followUps: ['How would you add prependListener and a max-listener warning?', 'How would you support async emit that awaits every listener in order (emitAsync)?']
    }
  }]
});

topics.push({
  title: 'Clustering and Worker Threads: Using More Than One Core',
  analogy: `<p>Your restaurant has one kitchen and one chef (a Node process). Business grows. You have two ways to add capacity. <b>Cluster</b> = open <b>several identical restaurants</b> in the same street, each with its own kitchen and fridge, and put a <b>doorman</b> in front who sends each new guest to the next restaurant (the primary process). If one restaurant burns down, the others keep serving and the doorman opens a new one. <b>Worker threads</b> = hire <b>extra chefs inside the same building</b> for heavy jobs (chopping 10 kg of onions). They work in their own corner, pass notes to the head chef, and can share one whiteboard (<code>SharedArrayBuffer</code>) if you set it up.</p>`,
  explain: `<p>One Node process runs your JavaScript on <b>one CPU core</b>. A server with 8 cores will leave 7 idle unless you do something. Node gives you three tools:</p>
  ${H.table(['Tool', 'What it creates', 'Memory', 'Best for'], [
    ['<b><code>cluster</code></b>', 'Several full Node <b>processes</b> that share one listening port', 'Separate (not shared)', 'Scaling an HTTP server across cores'],
    ['<b><code>worker_threads</code></b>', 'Extra <b>threads</b> in one process, each with its own JS engine and event loop', 'Separate heaps; share only via <code>SharedArrayBuffer</code>', 'CPU-heavy jobs (hashing, image resize, parsing)'],
    ['<b><code>child_process</code></b>', 'Any other program (Python, ffmpeg, a shell)', 'Separate process', 'Running external tools'],
    ['<b>Containers / orchestrator</b>', 'N copies of the app, 1 process each', 'Separate pods', 'Modern default: let Kubernetes scale pods']
  ])}
  <p><b>How cluster works:</b> the <b>primary</b> process calls <code>cluster.fork()</code> N times; each worker is a new Node process running the same file. When a worker calls <code>server.listen(3000)</code>, the primary actually owns the socket and hands each incoming connection to a worker in <b>round-robin</b> order (default on Linux and macOS). If a worker dies, the primary hears the <code>'exit'</code> event and forks a replacement. Users do not notice.</p>
  <p><b>Big catch:</b> workers have <b>no shared memory</b>. A counter in a variable, an in-memory cache, a session map or a WebSocket room list exists <i>separately</i> in each worker. Keep shared state in Redis or a database.</p>
  <p><b>How worker threads work:</b> <code>new Worker('./job.js', { workerData })</code> starts a thread. Talk with <code>postMessage</code> / <code>on('message')</code>. Data is <b>copied</b> (structured clone), or you can <b>transfer</b> an <code>ArrayBuffer</code> without copying. Workers do <b>not</b> make I/O faster (Node's I/O is already async); they exist so a CPU loop does not freeze the main event loop.</p>
  <p><b>Rule of thumb:</b> I/O-bound server = cluster or more pods. One CPU-heavy task inside the request = worker thread pool. Never create a new Worker per request: starting one costs tens of ms and some MB. Use a pool.</p>`,
  clues: [
    '"Use all CPU cores with Node" / "scale Node vertically" → <code>cluster</code> (processes) or several containers',
    '"CPU-intensive task (image resize, hashing, parsing) hurts latency" → worker threads / pool',
    '"A counter works locally but is wrong in production with PM2 cluster mode" → no shared memory between workers; use Redis',
    '"WebSocket / socket.io fails randomly behind cluster" → needs sticky sessions (same worker per client)',
    '"Cluster vs worker_threads vs child_process" → processes sharing a port vs threads vs external programs',
    '"Graceful restart / zero downtime reload" → rolling restart: disconnect one worker at a time'
  ],
  code: [
    {
      title: 'Cluster round-robin model with a crash (pure JS, runnable)',
      run: true,
      code: `// MODEL of cluster: a primary hands connections to workers in round-robin order,
// and replaces a worker that dies.
function createCluster(n) {
  var nextId = 1, workers = [], cursor = 0, log = [];
  function fork() { var w = { id: nextId++, handled: 0, alive: true }; workers.push(w); log.push('primary: forked worker ' + w.id); return w; }
  for (var i = 0; i < n; i++) fork();
  return {
    request: function (label) {
      var tries = workers.length;
      while (tries--) {
        var w = workers[cursor % workers.length];
        cursor++;
        if (w.alive) { w.handled++; log.push(label + ' -> worker ' + w.id); return w.id; }
      }
      log.push(label + ' -> no worker!');
    },
    crash: function (id) {
      var w = workers.filter(function (x) { return x.id === id; })[0];
      w.alive = false;
      workers = workers.filter(function (x) { return x.alive; });
      log.push('worker ' + id + ' CRASHED (other workers keep serving)');
      fork();                                                // primary replaces it
    },
    report: function () { return log.concat(workers.map(function (w) { return 'worker ' + w.id + ' handled ' + w.handled; })); }
  };
}
var c = createCluster(3);
for (var r = 1; r <= 4; r++) c.request('req ' + r);
c.crash(2);
for (r = 5; r <= 8; r++) c.request('req ' + r);
console.log(c.report().join('\\n'));`
    },
    {
      title: 'Real Node cluster with automatic restart',
      code: `const cluster = require('cluster');
const http = require('http');
const os = require('os');

if (cluster.isPrimary) {
  const n = os.availableParallelism();               // respects container CPU limits
  console.log('primary ' + process.pid + ' starting ' + n + ' workers');
  for (let i = 0; i < n; i++) cluster.fork();

  cluster.on('exit', (worker, code, signal) => {
    console.log('worker ' + worker.process.pid + ' exited (' + (signal || code) + ')');
    if (!worker.exitedAfterDisconnect) cluster.fork();   // crash -> replace; planned stop -> do not
  });

  process.on('SIGTERM', () => {                       // graceful shutdown: ask workers to finish
    for (const id in cluster.workers) cluster.workers[id].disconnect();
  });
} else {
  // every worker runs this part; all share port 3000 through the primary
  const server = http.createServer((req, res) => {
    res.end('hello from worker ' + process.pid + '\\n');
  }).listen(3000);

  process.on('SIGTERM', () => server.close(() => process.exit(0)));
}`
    },
    {
      title: 'Move password hashing into a worker thread',
      code: `const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const crypto = require('crypto');

if (isMainThread) {
  // ---------- MAIN THREAD: stays free to serve other requests ----------
  const hashInWorker = (password) => new Promise((resolve, reject) => {
    const w = new Worker(__filename, { workerData: { password } });   // same file runs again as the worker
    w.once('message', resolve);                                       // result comes back as a message
    w.once('error', reject);
    w.once('exit', (code) => { if (code !== 0) reject(new Error('worker exited with code ' + code)); });
  });

  const t0 = Date.now();
  setInterval(() => console.log('main thread still responsive at ' + (Date.now() - t0) + ' ms'), 50).unref();
  hashInWorker('correct horse battery staple').then((r) => {
    console.log('hash ready after ' + (Date.now() - t0) + ' ms: ' + r.hash.slice(0, 16) + '...');
  });
} else {
  // ---------- WORKER THREAD: the heavy synchronous CPU work happens here ----------
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(workerData.password, salt, 300000, 64, 'sha512');   // blocks only this thread
  parentPort.postMessage({ salt: salt.toString('hex'), hash: hash.toString('hex') });
}`
    },
    {
      title: 'A tiny reusable worker pool (queue + idle workers)',
      code: `const { Worker } = require('worker_threads');

// Create N workers once. Jobs wait in a queue when all are busy (backpressure for CPU work).
class WorkerPool {
  constructor(file, size) {
    this.file = file;
    this.idle = [];
    this.queue = [];                                  // jobs waiting: { data, resolve, reject }
    for (let i = 0; i < size; i++) this.idle.push(this._spawn());
  }
  _spawn() {
    const w = new Worker(this.file);
    w.on('error', (err) => { if (w.job) w.job.reject(err); });
    return w;
  }
  run(data) {
    return new Promise((resolve, reject) => {
      this.queue.push({ data, resolve, reject });
      this._next();
    });
  }
  _next() {
    if (!this.queue.length || !this.idle.length) return;
    const w = this.idle.pop();
    const job = this.queue.shift();
    w.job = job;
    w.once('message', (result) => { w.job = null; this.idle.push(w); job.resolve(result); this._next(); });
    w.postMessage(job.data);
  }
}
module.exports = WorkerPool;`
    },
    {
      title: 'Shared memory between threads: SharedArrayBuffer + Atomics',
      code: `const { Worker, isMainThread, workerData } = require('worker_threads');

if (isMainThread) {
  const sab = new SharedArrayBuffer(4);              // 4 bytes shared by every thread
  const counter = new Int32Array(sab);
  const workers = [];
  for (let i = 0; i < 4; i++) workers.push(new Worker(__filename, { workerData: sab }));
  let done = 0;
  workers.forEach((w) => w.on('exit', () => {
    if (++done === 4) console.log('final counter = ' + Atomics.load(counter, 0) + ' (expected 40000)');
  }));
} else {
  const counter = new Int32Array(workerData);
  for (let i = 0; i < 10000; i++) Atomics.add(counter, 0, 1);   // atomic: no lost updates between threads
}`
    }
  ],
  codeTitle: ['Cluster round-robin model', 'Cluster with restart', 'Hashing in a worker thread', 'Worker pool', 'SharedArrayBuffer and Atomics'],
  viz: [
    {
      title: 'Cluster: primary hands requests to workers, crash and restart',
      input: '3',
      inputLabel: 'Number of workers (2 to 5)',
      gen: function (input) {
        var n = parseInt(String(input).trim(), 10);
        if (isNaN(n) || n < 2 || n > 5) throw new Error('Enter a number of workers from 2 to 5');
        var frames = [], i;
        var ids = [];
        for (i = 1; i <= n; i++) ids.push('W' + i);
        function nodes(alive, labels) {
          var arr = [{ id: 'C', label: 'Clients', x: 9, y: 28, shape: 'box' }, { id: 'P', label: 'Primary (doorman)', x: 38, y: 28, shape: 'box', w: 22 }];
          ids.forEach(function (w, k) {
            arr.push({ id: w, label: (labels && labels[w]) || ('Worker ' + (k + 1)), x: 82, y: n === 1 ? 28 : 5 + (k * 46) / (n - 1), shape: 'box' });
          });
          return arr;
        }
        function edges() {
          var e = [['C', 'P', 'HTTP :3000']];
          ids.forEach(function (w) { e.push(['P', w]); });
          return e;
        }
        function tags(handled) { var t = {}; ids.forEach(function (w) { t[w] = (handled[w] || 0) + ' req'; }); return t; }
        var handled = {};
        frames.push({ narr: 'The <b>primary</b> process starts. It calls <code>cluster.fork()</code> ' + n + ' times, creating ' + n + ' separate Node processes. Each has its own memory and its own event loop.', parts: [
          { type: 'graph', label: 'Cluster on one machine', height: 56, directed: true, nodes: nodes(), edges: edges(), hl: { P: 'cur' }, tags: tags(handled) },
          { type: 'text', html: 'Workers share <b>one port</b>: the primary owns the listening socket and passes connections on.' }
        ] });
        var rr = 0;
        var total = n + 2;
        for (var r = 1; r <= total; r++) {
          var w = ids[rr % n]; rr++;
          handled[w] = (handled[w] || 0) + 1;
          var eh = { 'C-P': 'ok' }; eh['P-' + w] = 'ok';
          var hl = { P: 'cur' }; hl[w] = 'sel';
          frames.push({ narr: 'Request <b>#' + r + '</b> arrives. The primary picks the <b>next worker in the circle</b>: <b>' + w + '</b>. ' + (r > n ? 'It has gone around once, so the first worker gets a second request.' : ''), parts: [
            { type: 'graph', label: 'Round-robin', height: 56, directed: true, nodes: nodes(), edges: edges(), hl: hl, ehl: eh, tags: tags(handled) },
            { type: 'bars', label: 'Requests handled per worker', values: ids.map(function (x) { return handled[x] || 0; }), idxLabels: ids, texts: ids.map(function (x) { return String(handled[x] || 0); }) }
          ] });
        }
        var victim = ids[1];
        var h2 = {}; h2[victim] = 'bad';
        var lab = {}; lab[victim] = 'Worker 2 (CRASHED)';
        frames.push({ narr: '<span class="c-r">' + victim + ' crashes</span> (uncaught exception, out of memory...). Only the requests running on it are lost; the other workers and the primary are untouched. That is the main reliability win of processes.', parts: [
          { type: 'graph', label: 'A worker dies', height: 56, directed: true, nodes: nodes(null, lab), edges: edges(), hl: h2, tags: tags(handled) }
        ] });
        var h3 = {}; h3[victim] = 'ok'; h3.P = 'cur';
        handled[victim] = 0;
        var lab3 = {}; lab3[victim] = 'Worker 2 (new)';
        frames.push({ narr: 'The primary gets the <code>exit</code> event and calls <code>cluster.fork()</code> again. A <b>fresh</b> ' + victim + ' starts empty: anything it kept only in memory (counters, cache, sessions) is gone. Keep shared state in Redis or a database.', parts: [
          { type: 'graph', label: 'Primary replaces the dead worker', height: 56, directed: true, nodes: nodes(null, lab3), edges: edges(), hl: h3, tags: tags(handled) },
          { type: 'text', html: '<span class="c-y">Warning:</span> no worker can read another worker\'s variables. Each one is a separate process.' }
        ] });
        return frames;
      }
    },
    {
      title: 'Worker thread: keep the main event loop free',
      input: 'worker',
      inputLabel: 'Where does the hashing run? Type: main  or  worker',
      gen: function (input) {
        var mode = String(input).trim().toLowerCase();
        if (mode !== 'main' && mode !== 'worker') throw new Error('Type main or worker');
        var onMain = mode === 'main';
        var frames = [];
        function nodes(mainLabel, workerLabel) {
          return [
            { id: 'U', label: 'Users', x: 10, y: 28, shape: 'box' },
            { id: 'M', label: mainLabel, x: 45, y: 28, shape: 'box', w: 24 },
            { id: 'W', label: workerLabel, x: 85, y: 28, shape: 'box', w: 22 }
          ];
        }
        function g(label, mainLabel, workerLabel, hl, ehl, tags, edges) {
          return { type: 'graph', label: label, height: 56, directed: true, nodes: nodes(mainLabel, workerLabel), edges: edges || [['U', 'M'], ['M', 'W', 'postMessage']], hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
        }
        frames.push({ narr: 'A user calls <code>POST /login</code>. It needs a password hash that costs <b>~100 ms of CPU</b>. Another user calls <code>GET /ping</code> right after.', parts: [
          g('Where will the CPU work run?', 'Main thread (event loop)', 'Worker thread', { M: 'cur' }, { 'U-M': 'ok' }, { M: 'free' }),
          { type: 'text', html: 'Mode chosen: <b>' + (onMain ? 'hash on the main thread (pbkdf2Sync)' : 'hash in a worker thread') + '</b>.' }
        ] });
        if (onMain) {
          frames.push({ narr: 'The main thread runs the hash itself. For 100 ms it can do nothing else.', parts: [
            g('Main thread is busy', 'Main thread: HASHING', 'Worker thread (idle)', { M: 'bad' }, {}, { M: 'BUSY 100 ms' }),
            { type: 'queue', label: 'Waiting for the event loop', items: ['GET /ping'], hl: { 0: 'bad' }, frontLabel: 'next', backLabel: 'newest' }
          ] });
          frames.push({ narr: '<span class="c-r">/ping must wait</span>, although it needs 1 ms. Every user feels the stall. With 10 logins per second the server is permanently busy.', parts: [
            g('Everyone waits', 'Main thread: HASHING', 'Worker thread (idle)', { M: 'bad' }, {}, { M: 'BUSY' }),
            { type: 'bars', label: 'Latency of /ping (ms)', values: [100], texts: ['~100 ms'], hl: { 0: 'bad' } }
          ] });
          frames.push({ narr: 'Hash done. Now /ping is answered, 100 ms late. Moving the hash to a worker thread (type <code>worker</code>) removes this problem.', parts: [
            g('Finally free', 'Main thread (free again)', 'Worker thread (idle)', { M: 'ok' }, {}, { M: 'free' }),
            { type: 'bars', label: 'Latency of /ping (ms)', values: [100], texts: ['~100 ms'], hl: { 0: 'bad' } }
          ] });
        } else {
          frames.push({ narr: 'The main thread does <b>not</b> hash. It sends the job to the worker with <code>postMessage({ password })</code>. This costs microseconds.', parts: [
            g('Job handed to the worker', 'Main thread: free', 'Worker thread: HASHING', { W: 'cur', M: 'ok' }, { 'M-W': 'ok' }, { M: 'free', W: 'BUSY 100 ms' })
          ] });
          frames.push({ narr: 'While the worker computes on another CPU core, the main thread answers <code>GET /ping</code> in about 1 ms. The two jobs run in <b>real parallel</b>.', parts: [
            g('Main thread keeps serving', 'Main thread: serving /ping', 'Worker thread: HASHING', { M: 'ok', W: 'cur' }, { 'U-M': 'ok' }, { M: 'free', W: 'BUSY' }),
            { type: 'bars', label: 'Latency of /ping (ms)', values: [1], texts: ['~1 ms'], hl: { 0: 'ok' } }
          ] });
          frames.push({ narr: 'The worker finishes and sends the hash back with <code>parentPort.postMessage</code>. The main thread receives a <code>message</code> event and finishes the login response.', parts: [
            g('Result comes back as a message', 'Main thread: sends login response', 'Worker thread (idle)', { M: 'cur', W: 'ok' }, { 'M-W': 'ok' }, { M: 'free', W: 'free' })
          ] });
          frames.push({ narr: 'Cost to remember: the worker needs its own memory (tens of MB) and data is copied between threads. So keep a <b>pool</b> of workers (about one per CPU core) instead of starting a worker for every request.', parts: [
            g('Pool of workers', 'Main thread', 'Worker pool (N threads)', { W: 'sel' }, {}, { W: 'reused' })
          ] });
        }
        return frames;
      }
    }
  ],
  examples: [
    {
      title: 'The in-memory counter bug',
      html: `<p>A developer adds <code>let hits = 0; app.get('/', () =&gt; hits++)</code> and shows it on a stats page. Locally it is right. In production with 4 cluster workers each request goes to a different worker, so the stats page (also served by random workers) shows <b>hits / 4</b> roughly, and the number jumps around.</p>
      ${H.table(['Worker', 'hits in its own memory'], [['1', '250'], ['2', '248'], ['3', '255'], ['4', '247']])}
      <p>Real total is 1000. Fix: store counters in Redis (<code>INCR</code>) or a database. Same for rate limiting, sessions and caches.</p>`
    },
    {
      title: 'Cluster vs Worker Threads: which one?',
      html: `${H.table(['Situation', 'Pick', 'Why'], [
        ['REST API with mostly DB and network calls, want to use 8 cores', 'cluster / 8 pods', 'More event loops, each handles I/O; crash isolation'],
        ['One endpoint resizes images (CPU 200 ms)', 'worker pool', 'Keeps the main loop free, no process copies of the whole app'],
        ['Run ffmpeg or a Python script', 'child_process', 'It is another program'],
        ['WebSocket chat with rooms', 'cluster + sticky sessions + Redis adapter', 'Rooms must be shared across workers'],
        ['Kubernetes, 1 CPU per pod', 'neither', 'One process per pod, scale replicas']
      ])}`
    },
    {
      title: 'Sticky sessions for WebSockets and polling',
      html: `<p>Long polling and the Socket.IO handshake use <b>several HTTP requests</b> that must all reach the <b>same</b> worker. Round-robin would split them across workers and the handshake fails ("Session ID unknown"). Fix: route by client IP or a cookie (sticky sessions) at the load balancer, or use the official adapter that shares state through Redis. For plain WebSockets one upgrade request creates one long connection, so stickiness matters less, but broadcast across workers still needs a shared bus.</p>`
    },
    {
      title: 'Zero-downtime reload (rolling restart)',
      html: `<p>New code version? Restart workers <b>one by one</b>: for each worker, fork a new one, wait for it to listen, then call <code>old.disconnect()</code> so the old worker stops accepting and finishes in-flight requests, then exits. At every moment N workers are serving. PM2's <code>reload</code> command does exactly this. In Kubernetes the equivalent is a rolling update of pods with readiness probes.</p>
      ${H.arr(['W1 old', 'W2 old', 'W3 old'], { label: 'start', idx: false })}
      ${H.arr(['W1 new', 'W2 old', 'W3 old'], { label: 'step 1', hl: { 0: 'g' }, idx: false })}
      ${H.arr(['W1 new', 'W2 new', 'W3 new'], { label: 'done', hl: { 0: 'g', 1: 'g', 2: 'g' }, idx: false })}`
    }
  ],
  deepDive: `<p><b>Cluster internals:</b> <code>cluster.fork()</code> uses <code>child_process.fork</code> with an <b>IPC channel</b> (a Unix pipe) so primary and workers can send JSON messages (<code>worker.send</code>, <code>process.on('message')</code>). When a worker calls <code>listen</code>, it asks the primary to create the server handle. With the default <b>round-robin</b> policy (<code>cluster.SCHED_RR</code>, default except on Windows) the primary accepts connections and passes each socket to a worker over IPC. With <code>SCHED_NONE</code> the OS decides which worker accepts; on Linux this tends to give an <b>uneven</b> split (a few workers get most connections). Newer Node versions also support <code>reusePort</code> (the Linux <code>SO_REUSEPORT</code> option) so the kernel load-balances separate listening sockets.</p>
  <p><b>Cost per worker:</b> each cluster worker loads your whole app and its modules again: 40 to 150 MB RSS is normal, so 16 workers can use 2 GB. Memory-heavy apps may prefer fewer workers than cores. Also, JIT warm-up and connection pools (database) are per worker: 8 workers × pool of 10 = 80 DB connections. Plan for it.</p>
  <p><b>Worker thread internals:</b> each worker has its own V8 <b>isolate</b>, its own event loop and (optionally) its own limits via <code>resourceLimits</code>. They are lighter than processes (a few ms to tens of ms, ~10 MB baseline) but not free. Messages use the <b>structured clone</b> algorithm (copies objects, Maps, Dates, typed arrays; not functions or class instances). Large buffers should be <b>transferred</b> (<code>postMessage(buf, [buf.buffer])</code>), which moves ownership in O(1). <code>SharedArrayBuffer</code> plus <code>Atomics</code> allow real shared memory; then you face classic concurrency bugs (races), so keep it small and well-defined.</p>
  <p><b>Errors:</b> an uncaught exception in a worker fires <code>'error'</code> on the Worker object in the parent and then <code>'exit'</code>; the main process survives. <code>process.exit()</code> inside a worker ends only that worker. Always handle both events and decide: retry, replace the worker, or fail the job.</p>
  <p><b>Pools:</b> libraries like <b>piscina</b> add a queue, task cancellation with AbortSignal, idle timeouts and a size equal to <code>availableParallelism()</code> by default. Size CPU pools to the number of cores minus one (leave room for the main thread), and cap the queue length so overload becomes a fast 503 and not an endless backlog.</p>
  <p><b>Containers:</b> in Kubernetes the common advice is: <b>one Node process per container</b>, 1 or 2 CPUs per pod, scale with replicas and an autoscaler. Cluster inside a container hides crashes from the orchestrator and fights CPU limits. Use cluster/PM2 on plain VMs or when you want to avoid paying the per-pod overhead.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI features add CPU work to Node backends: tokenising and chunking documents for RAG, parsing PDFs, resizing images for vision models, computing cosine similarity over embeddings, running small ONNX/WASM models. Those belong in <b>worker threads</b> (or a separate service). The LLM call itself is just a network request: it does <b>not</b> need workers and a cluster will not make it faster.</p>
  <p><b>Use AI as a partner:</b> describe your workload (requests/sec, CPU ms per request, memory per request) and ask <code>Compute how many workers and pods I need, show the maths, then tell me what I should measure to confirm</code>. Ask it to produce a load-test script with autocannon and to explain the p99 chart.</p>
  <p><b>Where AI goes wrong:</b> it recommends <code>cluster</code> for everything, ignoring that you are in Kubernetes; spawns a <code>new Worker</code> per request; keeps state in module variables in a clustered app; and forgets to handle the worker <code>'error'</code> event. <b>What you must still own:</b> deciding the unit of scaling (process, thread, pod), where shared state lives, and what happens during a crash or deploy.</p>`,
  problems: [{
    title: 'Move Password Hashing Off the Main Thread',
    level: 'Hard',
    tags: ['worker_threads', 'pool', 'cpu-bound', 'latency'],
    companies: ['Stripe', 'Okta', 'Atlassian'],
    statement: `<p>Your login endpoint calls <code>crypto.pbkdf2Sync</code> (about 100 ms per call). At 30 logins per second, <code>/health</code> latency has exploded and the load balancer marks pods unhealthy. Redesign with <b>worker threads</b>: show the message protocol, how many workers you start, how you avoid creating a worker per request, what happens when a worker crashes, and how overload is handled.</p>`,
    constraints: `4 vCPU pod, 30 logins/s peak (3 CPU-seconds per second of hashing needed), p99 /health must stay under 50 ms.`,
    example: `<p>Math: 30 logins/s × 0.1 s = <b>3 CPU-seconds per second</b>. That is 3 cores of work, so hashing on the main thread is impossible (it can give at most 1). With a pool of 3 workers (4 vCPU minus 1 for the main thread) capacity is about <b>30 hashes/s</b>: right at the limit, so add a bounded queue and shed load.</p>`,
    brute: {
      why: `<p><code>pbkdf2Sync</code> on the main thread caps the whole server at 10 hashes per second and freezes every other route during each 100 ms. Creating a <code>new Worker</code> per login adds tens of ms and tens of MB each time and can exhaust memory under a burst.</p>`,
      code: { lang: 'js', check: false, code: `app.post('/login', (req, res) => {\n  const hash = crypto.pbkdf2Sync(req.body.password, salt, 300000, 64, 'sha512');  // blocks all requests\n  res.json({ ok: hash.equals(stored) });\n});\n\n// Also bad: a new Worker for every request\napp.post('/login2', (req, res) => {\n  const w = new Worker('./hash-worker.js', { workerData: req.body });\n  w.once('message', (h) => res.json(h));\n});` }
    },
    mcq: { q: 'You have a 4 vCPU pod and a CPU-heavy hashing task. A good worker pool size is…', options: ['1000, workers are cheap', 'About 3 (cores minus one for the main thread)', 'Exactly 1, JavaScript is single-threaded', 'Zero, use async/await instead'], answer: 1, explain: 'CPU-bound pool threads beyond the number of cores just time-share. Leave one core for the main event loop.' },
    hints: [
      `<p>Hint 1: How many CPU-seconds per second does the workload need? Compare with the cores you have.</p>`,
      `<p>Hint 2: Start N workers once. Keep a queue of jobs and a list of idle workers. A job = <code>postMessage</code>, result = <code>message</code> event.</p>`,
      `<p>Hint 3: Edge cases: worker 'error'/'exit' (replace it, reject its job), queue length limit (return 503 + Retry-After), job timeout, graceful shutdown (stop accepting, wait for jobs).</p>`
    ],
    solution: {
      approach: `<p><b>Design.</b> At startup create a pool of <code>availableParallelism() - 1</code> workers (3 on a 4 vCPU pod). Each worker file waits for <code>{ id, password, salt }</code> messages and replies with <code>{ id, hash }</code>. The main thread keeps <code>idle[]</code> and a bounded <code>queue[]</code>; <code>run(data)</code> returns a promise that resolves when the matching reply arrives. <b>Capacity:</b> 3 workers × 10 hashes/s = 30/s, equal to the peak, so cap the queue (for example 100 jobs, or by wait time) and answer <code>503 + Retry-After</code> beyond it rather than letting latency grow forever.</p>
      <p><b>Failures.</b> If a worker emits <code>error</code> or exits, reject the job that it was running (so the HTTP request gets 500, or retry once), remove the dead worker and spawn a replacement. Add a per-job timeout. On <code>SIGTERM</code> stop taking new jobs, wait for running ones, then terminate workers.</p>
      <p><b>Also consider:</b> use the async <code>crypto.pbkdf2</code> / <code>scrypt</code> (libuv pool) or <code>argon2</code> with a native async API: they already run off-thread but share the 4-thread libuv pool, so you still need a limit. At large scale, move authentication hashing to a dedicated auth service so CPU spikes there cannot hurt the rest of the API. Keep <code>/health</code> cheap and on the main thread.</p>`,
      code: { lang: 'js', check: false, code: `// hash-worker.js: runs inside each worker thread\nconst { parentPort } = require('worker_threads');\nconst crypto = require('crypto');\nparentPort.on('message', ({ id, password, salt }) => {\n  const hash = crypto.pbkdf2Sync(password, Buffer.from(salt, 'hex'), 300000, 64, 'sha512');\n  parentPort.postMessage({ id, hash: hash.toString('hex') });\n});\n\n// pool.js: main thread side\nconst { Worker } = require('worker_threads');\nconst os = require('os');\n\nclass HashPool {\n  constructor(size = Math.max(1, os.availableParallelism() - 1), maxQueue = 100) {\n    this.maxQueue = maxQueue; this.queue = []; this.idle = []; this.pending = new Map(); this.seq = 0;\n    for (let i = 0; i < size; i++) this.idle.push(this._spawn());\n  }\n  _spawn() {\n    const w = new Worker('./hash-worker.js');\n    w.on('message', (m) => {\n      const job = this.pending.get(m.id); this.pending.delete(m.id);\n      this.idle.push(w); job.resolve(m.hash); this._pump();\n    });\n    w.on('error', (err) => {                      // crash: fail its job, replace the worker\n      for (const [id, job] of this.pending) if (job.worker === w) { this.pending.delete(id); job.reject(err); }\n      this.idle = this.idle.filter((x) => x !== w);\n      this.idle.push(this._spawn()); this._pump();\n    });\n    return w;\n  }\n  run(password, salt) {\n    if (this.queue.length >= this.maxQueue) return Promise.reject(Object.assign(new Error('busy'), { status: 503 }));\n    return new Promise((resolve, reject) => { this.queue.push({ password, salt, resolve, reject }); this._pump(); });\n  }\n  _pump() {\n    while (this.queue.length && this.idle.length) {\n      const w = this.idle.pop(), job = this.queue.shift(), id = ++this.seq;\n      this.pending.set(id, { resolve: job.resolve, reject: job.reject, worker: w });\n      w.postMessage({ id, password: job.password, salt: job.salt });\n    }\n  }\n}\nmodule.exports = HashPool;` },
      complexity: `<p>Dispatch is O(1) per job. Throughput is workers × (1 / cost per hash). Memory is about (workers × 30 MB) fixed, instead of one worker per request. Queue length is bounded, so worst-case wait is maxQueue × cost / workers.</p>`,
      followUps: ['How would you set the queue limit from a latency target (for example p99 under 500 ms)?', 'What do you do if the hash cost is raised next year to 300 ms?']
    }
  }]
});

topics.push({
  title: 'Middleware in Express and Fastify',
  analogy: `<p>An <b>airport journey</b>. Your request (a passenger) walks through gates in a fixed order: check-in (logger), passport control (auth), baggage scan (body parser), then the plane (route handler). Each gate can wave you through (<code>next()</code>), stop you (send a 401 and nobody further down sees you), or hand you to the <b>help desk</b> (error middleware) if something goes wrong. On the way <i>back</i> (the response) the passenger passes the same gates in reverse, like an onion with layers: that is why a logger can measure total time.</p>`,
  explain: `<p><b>Middleware</b> is a function that sits between the incoming request and your final handler. In Express its shape is <code>(req, res, next)</code>. It can: read or change <code>req</code>/<code>res</code>, end the response, or call <code>next()</code> to pass control to the following function.</p>
  <ul>
    <li><b>Order matters.</b> Functions run in the order you register them with <code>app.use(...)</code> or <code>app.get(...)</code>. Put <code>express.json()</code> before routes that read <code>req.body</code>, auth before protected routes.</li>
    <li><b>Forgetting <code>next()</code></b> (and not sending a response) makes the request hang until timeout.</li>
    <li><b>Calling <code>next()</code> AND sending a response</b> causes "Cannot set headers after they are sent".</li>
    <li><b>Error middleware</b> has <b>four</b> arguments <code>(err, req, res, next)</code>. Express recognises it by that count. Call <code>next(err)</code> (or throw in sync code) and Express skips all normal middleware and jumps to the next error middleware. Register it <b>last</b>.</li>
  </ul>
  ${H.table(['Call', 'What happens'], [
    ['<code>next()</code>', 'Go to the next normal middleware / route'],
    ['<code>next(err)</code>', 'Skip to the first error middleware'],
    ['<code>next("route")</code>', 'Skip the rest of this route\'s handlers'],
    ['<code>res.status(401).json(...)</code> and no next', 'Chain stops here (good for auth failures)']
  ])}
  <p><b>Async errors:</b> in Express 4, a thrown error or rejected promise inside an <code>async</code> handler is <b>not</b> caught: you must <code>try/catch</code> and <code>next(err)</code>, or wrap handlers. <b>Express 5</b> (the current default on npm) forwards rejected promises to the error middleware for you.</p>
  <p><b>Fastify</b> says the same thing with a different design: instead of one long middleware list it has <b>lifecycle hooks</b> in a fixed order (<code>onRequest → preParsing → preValidation → preHandler → handler → preSerialization → onSend → onResponse</code>), <b>plugins</b> with encapsulation (a plugin's hooks only affect its own routes), built-in <b>JSON schema</b> validation and fast serialization, and handlers that are naturally <code>async</code> (return the value, or throw). Errors go to <code>setErrorHandler</code>.</p>`,
  clues: [
    '"Implement middleware chain / <code>compose</code> / <code>next()</code>" → recursive dispatch with an index',
    '"Error-handling middleware" → 4 arguments, registered last',
    '"Request hangs and never responds" → middleware forgot <code>next()</code> or the handler never sends',
    '"Cannot set headers after they are sent to the client" → responded twice (next() after res.send)',
    '"Why does my <code>req.body</code> come undefined?" → body parser registered after the route',
    '"Express vs Fastify" → middleware list vs hooks + plugins + schemas; Fastify is typically faster and more structured'
  ],
  code: [
    {
      title: 'Middleware chain with next() and error middleware (pure JS, runnable)',
      run: true,
      code: `// A tiny Express-like app. Normal middleware has 2 params (ctx, next); error middleware has 3 (err, ctx, next).
function createApp() {
  var stack = [];
  return {
    use: function (fn) { stack.push(fn); return this; },
    handle: function (ctx) {
      var i = 0;
      function next(err) {
        var fn = stack[i++];
        if (!fn) {                                         // end of the chain
          if (err) { ctx.status = 500; ctx.body = 'Unhandled: ' + err.message; }
          return;
        }
        try {
          if (err) {
            if (fn.length === 3) fn(err, ctx, next);       // an error middleware: it can handle it
            else next(err);                                // normal middleware is SKIPPED while an error travels
          } else if (fn.length < 3) {
            fn(ctx, next);
          } else {
            next();                                        // error middleware is skipped when all is fine
          }
        } catch (e) { next(e); }                           // a thrown error becomes next(err)
      }
      next();
      return ctx;
    }
  };
}

var app = createApp();
app.use(function logger(ctx, next) { ctx.log.push('logger: before'); next(); ctx.log.push('logger: after (status ' + ctx.status + ')'); });
app.use(function auth(ctx, next) {
  if (!ctx.token) { ctx.status = 401; ctx.body = 'login first'; return; }   // stop: no next()
  next();
});
app.use(function handler(ctx, next) {
  if (ctx.path === '/boom') throw new Error('database down');
  ctx.status = 200; ctx.body = 'hello';
});
app.use(function errorHandler(err, ctx, next) { ctx.status = 500; ctx.body = 'Oops: ' + err.message; });

[{ path: '/', token: 'x' }, { path: '/', token: '' }, { path: '/boom', token: 'x' }].forEach(function (req) {
  var out = app.handle({ path: req.path, token: req.token, status: 0, body: '', log: [] });
  console.log(req.path + (req.token ? ' (logged in)' : ' (anonymous)') + ' -> ' + out.status + ' ' + out.body);
  console.log('   ' + out.log.join(' | '));
});`
    },
    {
      title: 'Async compose(): the Koa-style onion (pure JS, runnable)',
      run: true,
      code: `// compose([a, b, c]) returns one function. "await next()" runs everything further down, then comes back.
function compose(middlewares) {
  return function (ctx) {
    var index = -1;
    function dispatch(i) {
      if (i <= index) return Promise.reject(new Error('next() called multiple times'));
      index = i;
      var fn = middlewares[i];
      if (!fn) return Promise.resolve();
      try { return Promise.resolve(fn(ctx, function () { return dispatch(i + 1); })); }
      catch (err) { return Promise.reject(err); }
    }
    return dispatch(0);
  };
}
var order = [];
var run = compose([
  async function timing(ctx, next) { order.push('timing in'); await next(); order.push('timing out'); },
  async function auth(ctx, next) { order.push('auth in'); await next(); order.push('auth out'); },
  async function handler(ctx) { order.push('handler'); }
]);
run({}).then(function () { console.log(order.join(' -> ')); });`
    },
    {
      title: 'Express: logger, auth, error middleware',
      check: false,
      code: `const express = require('express');
const app = express();

app.use(express.json());                                   // 1. parse JSON body BEFORE routes

app.use((req, res, next) => {                              // 2. logger: wraps the whole request
  const start = Date.now();
  res.on('finish', () => console.log(req.method + ' ' + req.url + ' ' + res.statusCode + ' ' + (Date.now() - start) + 'ms'));
  next();
});

function requireAuth(req, res, next) {                     // 3. auth: stop the chain on failure
  if (req.get('authorization') !== 'Bearer demo-token') return res.status(401).json({ error: 'unauthorized' });
  next();
}

app.get('/me', requireAuth, (req, res) => res.json({ user: 'asha' }));
app.get('/boom', (req, res) => { throw new Error('sync failure'); });          // Express catches sync throws

// Express 4 needs this wrapper for async handlers (Express 5 does it for you)
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
app.get('/slow', wrap(async (req, res) => { throw new Error('async failure'); }));

app.use((req, res) => res.status(404).json({ error: 'not found' }));   // 4. 404 after all routes

app.use((err, req, res, next) => {                         // 5. error middleware: 4 args, LAST
  console.error(err);
  if (res.headersSent) return next(err);                   // too late to send JSON: let Express close it
  res.status(err.status || 500).json({ error: 'internal error' });   // never leak err.stack to clients
});
app.listen(3000);`
    },
    {
      title: 'Fastify: hooks, plugin encapsulation, error handler',
      check: false,
      code: `const fastify = require('fastify')({ logger: true });

// A hook runs at a fixed lifecycle point. This one guards every route in this scope.
fastify.addHook('onRequest', async (request, reply) => {
  if (request.headers.authorization !== 'Bearer demo-token') {
    reply.code(401);
    throw new Error('unauthorized');                       // async hooks: throw to stop the request
  }
});

fastify.get('/me', {
  schema: { response: { 200: { type: 'object', properties: { user: { type: 'string' } } } } }   // fast serialization + no leaks
}, async () => ({ user: 'asha' }));                         // just return the value

fastify.get('/boom', async () => { throw new Error('async failure'); });   // async errors are caught natively

// plugin = encapsulated scope: its hooks do not leak to routes outside of it
fastify.register(async function publicRoutes(instance) {
  instance.get('/health', async () => ({ ok: true }));
}, { prefix: '/public' });

fastify.setErrorHandler((err, request, reply) => {
  request.log.error(err);
  reply.code(err.statusCode || 500).send({ error: 'internal error' });
});
fastify.listen({ port: 3000 });`
    }
  ],
  codeTitle: ['Middleware chain with error middleware', 'Async compose onion', 'Express app', 'Fastify app'],
  viz: [
    {
      title: 'The middleware onion: requests go in, responses come out',
      input: 'ok',
      inputLabel: 'Scenario: ok  |  auth (auth fails, no next)  |  throw (handler throws)',
      gen: function (input) {
        var sc = String(input).trim().toLowerCase();
        if (['ok', 'auth', 'throw'].indexOf(sc) < 0) throw new Error('Type ok, auth or throw');
        var chain = ['logger', 'auth', 'bodyParser', 'handler'];
        var frames = [], st = [], note = [];
        function snap(narr, hl, extra) {
          var parts = [
            { type: 'stack', label: 'Call stack (outer layer at the bottom, current at the top)', items: st.slice(), hl: hl || {} },
            { type: 'text', html: '<b>Log:</b> ' + (note.length ? note.join(' <span class="c-m">|</span> ') : '<span class="c-m">(empty)</span>') }
          ];
          if (extra) parts.push(extra);
          frames.push({ narr: narr, parts: parts });
        }
        snap('A request arrives: <code>GET /me</code>. The chain is <b>logger → auth → bodyParser → handler</b>, with an error handler registered last.');
        var stopAt = -1, errAt = -1;
        for (var i = 0; i < chain.length; i++) {
          st.push(chain[i]);
          var top = {}; top[st.length - 1] = 'cur';
          if (chain[i] === 'logger') note.push('start timer');
          if (chain[i] === 'auth' && sc === 'auth') {
            note.push('401 sent');
            snap('<b>auth</b> sees no valid token. It sends <b>401</b> and does <b>not</b> call <code>next()</code>. The layers below (bodyParser, handler) never run.', { 1: 'bad' });
            stopAt = i; break;
          }
          if (chain[i] === 'handler' && sc === 'throw') {
            note.push('handler threw');
            snap('<span class="c-r">The handler throws an Error.</span> Express catches it and acts as if <code>next(err)</code> was called.', { 3: 'bad' });
            errAt = i; break;
          }
          snap('<b>' + chain[i] + '</b> runs its "before" part' + (i < chain.length - 1 ? ' and calls <code>next()</code>: control moves one layer deeper.' : ' and sends the response (200).'), top);
          if (chain[i] === 'handler') note.push('200 sent');
        }
        if (errAt >= 0) {
          while (st.length > 1) st.pop();
          st.push('errorHandler(err)');
          snap('Express <b>skips</b> the normal middleware and jumps to the <b>error middleware</b> (the one with 4 parameters). It answers <b>500</b> with a safe message.', { 1: 'sel' });
          note.push('500 sent');
          st.pop();
        }
        while (st.length) {
          var name = st.pop();
          if (name === 'logger') note.push('log "done" + time');
          var hl2 = {}; if (st.length) hl2[st.length - 1] = 'done';
          snap('Unwinding: <b>' + name + '</b> finishes (code after its <code>next()</code> runs now' + (name === 'logger' ? ', so it can log status and duration' : '') + ').', hl2);
        }
        snap('Response delivered. Rule: <b>order matters</b>. Each layer sees the request on the way in and the response on the way out.', {}, { type: 'vars', vals: { scenario: sc, final: sc === 'ok' ? '200 OK' : sc === 'auth' ? '401 Unauthorized' : '500 Internal error' }, hl: { final: sc === 'ok' ? 'ok' : 'bad' } });
        return frames;
      }
    }
  ],
  examples: [
    {
      title: 'Order bug: body parser after the route',
      html: `<p><code>app.post('/orders', handler); app.use(express.json());</code> → in the handler <code>req.body</code> is <code>undefined</code> because the route matched <i>before</i> the parser got a chance. Swap the lines. The same trap hits <code>cors()</code> (preflight must be answered before auth) and <code>helmet()</code>.</p>
      ${H.table(['Order', 'Result'], [['json() → route', '<span class="c-g">body parsed</span>'], ['route → json()', '<span class="c-r">req.body undefined</span>'], ['auth → cors()', '<span class="c-r">browser preflight gets 401</span>']])}`
    },
    {
      title: 'Hanging request: the missing next()',
      html: `<p>A middleware checks a header and forgets to call <code>next()</code> in the happy path:</p>
      <pre>app.use((req, res, next) =&gt; { if (!req.get('x-id')) return res.status(400).end(); /* forgot next() */ });</pre>
      <p>Every valid request now waits forever (until the client or load balancer times out). Symptom in monitoring: <b>no error logs, requests pile up, sockets stay open</b>. Test every middleware with the "valid" path as well as the failing one.</p>`
    },
    {
      title: 'Double response: next() after res.send()',
      html: `<p>Calling both <code>res.json(...)</code> and <code>next()</code> sends the response, then runs the following handler which tries to send a second one: <code>ERR_HTTP_HEADERS_SENT</code>. Pattern to avoid it: always <code>return res.status(401).json(...)</code> so the function stops. In the error handler, check <code>res.headersSent</code> first.</p>`
    },
    {
      title: 'Request-scoped data: res.locals and AsyncLocalStorage',
      html: `<p>Middleware often needs to pass data down (the logged-in user, a request id). Express offers <code>req.user = ...</code> or <code>res.locals</code>. For code deep in your services that has no <code>req</code>, use <code>AsyncLocalStorage</code>, which keeps a value alive across <code>await</code>s for one request.</p>`,
      code: `const { AsyncLocalStorage } = require('async_hooks');
const als = new AsyncLocalStorage();

// middleware: start a context for this request
function requestContext(req, res, next) {
  als.run({ requestId: Math.random().toString(36).slice(2, 8) }, next);
}

// any function, no req needed
function log(msg) {
  const ctx = als.getStore();
  console.log('[' + (ctx ? ctx.requestId : 'no-request') + '] ' + msg);
}

module.exports = { requestContext, log };`
    }
  ],
  deepDive: `<p><b>How Express dispatches:</b> a request walks an array of <b>layers</b> (each has a path matcher and a handler). <code>next()</code> is a closure that increments an index and calls the next matching layer; our mini <code>createApp</code> above is the same idea. A router is a mini-app with its own layer list, mounted as one layer in the parent. Error flow: when a layer throws or calls <code>next(err)</code>, Express walks forward looking for layers whose handler has <code>fn.length === 4</code>.</p>
  <p><b>Koa-style compose</b> uses promises: <code>await next()</code> returns after everything downstream finished, so "after" code naturally lives below the await. It is the cleanest way to explain the <b>onion model</b> and avoids the "forgot to return" issues of callbacks. The guard <code>if (i &lt;= index)</code> catches a middleware that calls <code>next()</code> twice.</p>
  <p><b>Express 5:</b> async handlers returning rejected promises are passed to <code>next(err)</code> automatically; path syntax is stricter (<code>path-to-regexp</code> v8, wildcards need names, e.g. <code>/*splat</code>); <code>req.query</code> is a getter; <code>app.del</code> and some old signatures were removed. Fastify v5 requires Node 20+ and a full JSON Schema for <code>querystring</code>/<code>params</code> (no shorthand).</p>
  <p><b>Fastify performance story:</b> routes are matched by a radix tree (<code>find-my-way</code>), request bodies are validated by compiled <code>ajv</code> functions, and responses with a schema are serialised by <code>fast-json-stringify</code>, which skips the generic <code>JSON.stringify</code> work. Encapsulation (<code>avvio</code>) lets you give each plugin its own hooks and decorators; use <code>fastify-plugin</code> to deliberately <b>break</b> encapsulation for shared things like a DB connection.</p>
  <p><b>Production middleware stack, typical order:</b> request id → logger → security headers (helmet) → CORS → rate limit → compression → body parser (with size limit!) → auth → routes → 404 → error handler. Put cheap rejections (rate limit, auth) before expensive work (body parsing, DB). Set <code>express.json({ limit: '100kb' })</code> so a huge body cannot block the loop (JSON.parse is synchronous). Disable <code>x-powered-by</code>. Time out slow clients (<code>server.requestTimeout</code>, <code>headersTimeout</code>).</p>`,
  aiEra: `<p><b>What AI changes:</b> AI features are built as middleware: an <b>auth + quota</b> layer in front of LLM routes, a <b>guardrail</b> layer that scans prompts and responses, a <b>token-usage logger</b>, and a <b>streaming</b> handler. The onion model fits well: the outer layer measures cost and latency, the inner one calls the model.</p>
  <p><b>Use AI as a partner:</b> ask <code>Review this Express app and list the order of middleware, what each does on the way in and out, and 5 ways a request could hang or double-respond</code>. Ask for a table of Express middleware to Fastify hooks.</p>
  <p><b>Where AI goes wrong:</b> it mixes Express 4 and 5 behaviour, writes async handlers without error forwarding (silent hangs), puts error middleware before routes, forgets <code>return</code> after <code>res.status(...).send()</code>, and copies <code>cors({ origin: '*' })</code> with credentials. <b>What you must still own:</b> the order of the chain, what each layer guarantees, and a test for the unhappy paths (missing token, bad JSON, thrown error).</p>`,
  problems: [{
    title: 'Build a Middleware Chain with Error Middleware',
    level: 'Medium',
    tags: ['middleware', 'compose', 'express', 'error handling'],
    companies: ['Uber', 'Swiggy', 'PayPal'],
    statement: `<p>Implement a small <code>App</code> with <code>use(fn)</code> and <code>handle(ctx)</code>. A normal middleware is <code>(ctx, next)</code>; an error middleware is <code>(err, ctx, next)</code>. Rules: they run in registration order; not calling <code>next()</code> stops the chain; a thrown error (or <code>next(err)</code>) skips normal middleware and goes to the next error middleware; code after <code>next()</code> runs when the downstream finishes; if no error middleware handles it, set status 500.</p>`,
    constraints: `Synchronous middleware is enough. Up to 10<sup>3</sup> middleware. Distinguish error middleware by <code>fn.length === 3</code>.`,
    example: `<p>Chain: logger, auth, handler, errorHandler. Request with no token → ${H.c('r', '401')}, handler skipped. Handler throws → ${H.c('y', 'errorHandler runs → 500')}. Logger "after" part runs in all cases.</p>`,
    brute: {
      why: `<p>A plain <code>for</code> loop calling every function in order cannot support "stop here", "do work after the rest" or skipping to the error handler; the logic ends up as nested if-statements spread over the handlers.</p>`,
      code: { lang: 'js', code: `function handleBad(stack, ctx) {\n  for (const fn of stack) fn(ctx);    // cannot stop, cannot wrap, cannot route errors\n}\nconsole.log(typeof handleBad);` }
    },
    mcq: { q: 'How does Express decide that a function is an error-handling middleware?', options: ['Its name ends with Error', 'It has four parameters (err, req, res, next)', 'It is registered with app.error()', 'It returns a promise'], answer: 1, explain: 'Express checks fn.length === 4. Declaring only three parameters makes it a normal middleware.' },
    hints: [
      `<p>Hint 1: Keep one index <code>i</code> shared by all calls of <code>next</code>. <code>next</code> takes the function at <code>i</code> and increments it.</p>`,
      `<p>Hint 2: <code>next(err)</code> carries the error forward. While an error is travelling, skip functions that are not error middleware.</p>`,
      `<p>Hint 3: Wrap each call in try/catch and turn a throw into <code>next(e)</code>. When the list ends with an error still pending, set status 500.</p>`
    ],
    solution: {
      approach: `<p>One closure <code>next(err)</code> pulls <code>stack[i++]</code>. With an error pending, only functions of length 3 are called as <code>fn(err, ctx, next)</code>; others are skipped by recursively calling <code>next(err)</code>. With no error, functions of length below 3 are called as <code>fn(ctx, next)</code> and error middleware is skipped. A try/catch converts throws into <code>next(e)</code>. Because <code>next()</code> is a normal function call, code written after it inside a middleware runs when everything downstream has returned, which gives the onion behaviour.</p>`,
      code: {
        lang: 'js',
        run: true,
        code: `class App {
  constructor() { this.stack = []; }
  use(fn) { this.stack.push(fn); return this; }
  handle(ctx) {
    let i = 0;
    const next = (err) => {
      const fn = this.stack[i++];
      if (!fn) { if (err) { ctx.status = 500; ctx.body = 'Unhandled: ' + err.message; } return; }
      try {
        if (err) { fn.length === 3 ? fn(err, ctx, next) : next(err); }
        else if (fn.length < 3) fn(ctx, next);
        else next();
      } catch (e) { next(e); }
    };
    next();
    return ctx;
  }
}
const app = new App()
  .use((ctx, next) => { ctx.trace = ['in']; next(); ctx.trace.push('out ' + ctx.status); })
  .use((ctx, next) => { if (!ctx.user) { ctx.status = 401; return; } next(); })
  .use((ctx) => { if (ctx.fail) throw new Error('db down'); ctx.status = 200; })
  .use((err, ctx, next) => { ctx.status = 500; ctx.body = err.message; });
for (const c of [{ user: 1 }, { user: 0 }, { user: 1, fail: true }]) {
  const r = app.handle(c);
  console.log(JSON.stringify({ status: r.status, body: r.body, trace: r.trace }));
}`
      },
      complexity: `<p>Each request visits each middleware at most once: O(M) time for M middleware, O(M) stack depth in the worst case (recursion through next).</p>`,
      followUps: ['How would you support async middleware with await next()?', 'How would you detect next() being called twice in one middleware?']
    }
  }]
});

topics.push({
  title: 'Error Handling: Async Errors and Unhandled Rejections',
  analogy: `<p>A <b>hospital</b>. Small problems (a wrong password, a missing record) are handled at the <b>front desk</b> by a nurse: a clear message, no panic. These are <b>operational errors</b>. A real emergency (a bug that left the building's wiring in an unknown state) calls the fire brigade: stop everything, evacuate safely, restart. That is a <b>programmer error</b>: log it, finish the work in progress, and let a supervisor (PM2, Kubernetes) restart the process. The worst design is a hospital where a letter that nobody opens (an <b>unhandled promise rejection</b>) silently sets the building on fire.</p>`,
  explain: `<p>Errors in Node come in four shapes. Each has a different safety net:</p>
  ${H.table(['Where the error happens', 'How to catch it', 'If you forget'], [
    ['Synchronous code', '<code>try/catch</code>', 'Exception bubbles up; Express 4/5 catch it in handlers'],
    ['<code>async</code> function / promise', '<code>await</code> inside <code>try/catch</code>, or <code>.catch()</code>', '<span class="c-r">Unhandled rejection</span>: Node 15+ crashes the process'],
    ['Callback style <code>(err, data)</code>', 'check <code>if (err)</code> first', 'You use <code>undefined</code> data, or the error is lost'],
    ['EventEmitter <code>error</code> event', '<code>emitter.on("error", ...)</code>', 'Throws; crashes with "Unhandled error event"']
  ])}
  <p><b>Big trap:</b> <code>try/catch</code> only catches errors thrown <i>while the try block is on the call stack</i>. An error inside a <code>setTimeout</code> callback, an event listener or an un-awaited promise happens later, after the <code>try</code> has finished. It is invisible to that <code>try</code>.</p>
  <p><b>In Express 4:</b> <code>async (req,res) =&gt; { await db() }</code> that rejects has nobody waiting for the promise → unhandled rejection → crash (and the request hangs). Fix: <code>.catch(next)</code> via a wrapper, or use <b>Express 5</b>, which forwards rejections to your error middleware. In Fastify, async handlers are awaited, so the error goes to <code>setErrorHandler</code>.</p>
  <p><b>Process-level safety nets</b> (the last line of defence, not the plan):</p>
  <ul>
    <li><code>process.on('unhandledRejection', (reason) =&gt; ...)</code> a promise rejected and nobody handled it. Default since Node 15: <b>throw</b> (it becomes an uncaught exception).</li>
    <li><code>process.on('uncaughtException', (err) =&gt; ...)</code> a thrown error nobody caught. After this the process is in an <b>unknown state</b>: log, flush, and <b>exit</b> (code 1). Never "carry on".</li>
    <li><code>SIGTERM</code> / <code>SIGINT</code>: orchestrator asks you to stop; stop accepting connections, finish in-flight requests, close DB pools, exit 0.</li>
  </ul>
  <p><b>Design rule:</b> separate <b>operational errors</b> (expected: validation failed, not found, upstream timeout; return a 4xx/5xx and continue) from <b>programmer errors</b> (bugs: undefined is not a function; crash and restart). Use a small <code>AppError</code> class with <code>status</code> and a safe <code>message</code>; everything else becomes a generic 500 and is logged with the stack.</p>`,
  clues: [
    '"Unhandled promise rejection" / "process crashed with exit code 1 after a rejected promise"',
    '"Why doesn\'t try/catch catch my error?" → asynchronous callback or missing <code>await</code>',
    '"Async route handler throws in Express" → Express 4 needs a wrapper or <code>next(err)</code>; Express 5 forwards it',
    '"Should we keep the process alive after an <code>uncaughtException</code>?" → no: log, drain, exit, restart',
    '"Graceful shutdown" / "zero dropped requests on deploy" → SIGTERM handler + <code>server.close()</code>',
    '"Centralised error handling / consistent error responses" → error middleware + AppError classes'
  ],
  code: [
    {
      title: 'try/catch vs async: what is caught (runs in your browser)',
      run: true,
      code: `async function risky() { throw new Error('boom'); }

// 1) Calling WITHOUT await: try/catch does NOT see the rejection.
try {
  var p = risky();                       // returns a rejected promise, nothing thrown yet
  console.log('1) no exception here, got a promise');
  p.catch(function (e) { console.log('1) caught later via .catch: ' + e.message); });   // handle it, or Node would crash
} catch (e) { console.log('never printed'); }

// 2) With await: now the rejection becomes a normal exception inside try.
(async function () {
  try { await risky(); } catch (e) { console.log('2) caught with await: ' + e.message); }

  // 3) Promise.all rejects at the FIRST failure; allSettled waits for everybody.
  var jobs = [Promise.resolve('a'), Promise.reject(new Error('b failed')), Promise.resolve('c')];
  var all = await Promise.all(jobs.map(function (j) { return j.catch(function (e) { return 'ERR:' + e.message; }); }));
  console.log('3) per-item catch ->', all.join(', '));
  var settled = await Promise.allSettled([Promise.resolve(1), Promise.reject(new Error('x'))]);
  console.log('3) allSettled ->', settled.map(function (s) { return s.status; }).join(', '));
})();`
    },
    {
      title: 'AppError and an async wrapper, modelled in pure JS (runnable)',
      run: true,
      code: `// Operational errors carry a status and a SAFE message. Everything else is a bug -> generic 500.
class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; this.expose = true; }
}

// Express-4-style wrapper: any rejection from an async handler is forwarded to next(err)
function wrap(handler) {
  return function (req, res, next) {
    Promise.resolve().then(function () { return handler(req, res, next); }).catch(next);
  };
}

// central error handler (what error middleware does)
function errorHandler(err, req, res) {
  var known = err instanceof AppError;
  if (!known) console.log('   [log] BUG with stack: ' + err.message);          // log the real thing
  res.status = known ? err.status : 500;
  res.body = known ? err.message : 'Internal error';                             // never leak internals
}

async function getUser(req) {
  if (!req.id) throw new AppError(400, 'id is required');
  if (req.id === 'ghost') throw new AppError(404, 'user not found');
  if (req.id === 'bug') return undefined.name;                                  // programmer error
  return 'user ' + req.id;
}

async function simulate(id) {
  var res = {};
  var req = { id: id };
  var handler = wrap(async function (rq, rs) { rs.status = 200; rs.body = await getUser(rq); });
  await new Promise(function (resolve) {
    handler(req, res, function (err) { errorHandler(err, req, res); resolve(); });
    setTimeout(resolve, 5);
  });
  console.log('GET ' + (id || '(none)') + ' -> ' + res.status + ' ' + res.body);
}
(async function () { await simulate('42'); await simulate(''); await simulate('ghost'); await simulate('bug'); })();`
    },
    {
      title: 'Process-level safety nets and graceful shutdown',
      code: `const http = require('http');

const server = http.createServer((req, res) => res.end('ok'));
server.listen(3000);

let shuttingDown = false;
function shutdown(reason, code) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.error('shutting down:', reason);
  // 1) stop accepting new connections, let in-flight requests finish
  server.close(() => {
    // 2) close DB pools, flush logs here, then exit
    process.exit(code);
  });
  // 3) safety timer: do not wait forever for stuck connections
  setTimeout(() => process.exit(1), 10000).unref();
}

// Orchestrator (Kubernetes, PM2, Docker) asks nicely:
process.on('SIGTERM', () => shutdown('SIGTERM', 0));
process.on('SIGINT', () => shutdown('SIGINT', 0));

// A promise failed and nobody handled it: that is a bug. Log, then restart cleanly.
process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason);
  shutdown('unhandledRejection', 1);
});

// A thrown error nobody caught: process state is unknown. Do NOT continue.
process.on('uncaughtException', (err, origin) => {
  console.error('uncaughtException from ' + origin + ':', err);
  shutdown('uncaughtException', 1);
});`
    },
    {
      title: 'Express: asyncHandler, AppError, central handler',
      check: false,
      code: `const express = require('express');
const app = express();

class AppError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// Express 4 needs this; Express 5 makes it unnecessary.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await db.users.findById(req.params.id);       // may reject
  if (!user) throw new AppError(404, 'user not found');      // expected -> 404
  res.json(user);
}));

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const known = err instanceof AppError;
  if (!known) req.log?.error({ err }, 'unexpected error');   // bugs get logged with the stack
  res.status(known ? err.status : 500).json({ error: known ? err.message : 'Internal Server Error' });
});`
    },
    {
      title: 'Retry with backoff for upstream (operational) errors',
      code: `// Retry only errors that may succeed later (timeouts, 503). Never retry 400 / validation errors.
async function withRetry(fn, { retries = 3, baseMs = 100 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (!err.retryable || attempt === retries) break;
      const delay = baseMs * 2 ** attempt + Math.random() * 50;   // exponential backoff + jitter
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

withRetry(async (n) => {
  if (n < 2) { const e = new Error('upstream 503'); e.retryable = true; throw e; }
  return 'ok after ' + n + ' retries';
}).then(console.log);`
    }
  ],
  codeTitle: ['try/catch vs async', 'AppError and async wrapper', 'Safety nets and graceful shutdown', 'Express asyncHandler', 'Retry with backoff'],
  viz: [
    {
      title: 'Where does an error go? Four routes through Express',
      input: 'async4',
      inputLabel: 'Scenario: sync  |  async4 (Express 4, no wrapper)  |  wrapped (asyncHandler)  |  express5',
      gen: function (input) {
        var sc = String(input).trim().toLowerCase();
        if (['sync', 'async4', 'wrapped', 'express5'].indexOf(sc) < 0) throw new Error('Type sync, async4, wrapped or express5');
        var nodes = [
          { id: 'REQ', label: 'Request', x: 9, y: 30, shape: 'box' },
          { id: 'H', label: 'Route handler', x: 33, y: 30, shape: 'box', w: 20 },
          { id: 'EM', label: 'Error middleware', x: 68, y: 8, shape: 'box', w: 22 },
          { id: 'UR', label: 'unhandledRejection', x: 68, y: 30, shape: 'box', w: 22 },
          { id: 'PX', label: 'Process exits (code 1)', x: 68, y: 53, shape: 'box', w: 24 },
          { id: 'R500', label: 'Clean 500 response', x: 92, y: 8, shape: 'box', w: 16 }
        ];
        var edges = [['REQ', 'H'], ['H', 'EM', 'next(err)'], ['H', 'UR', 'rejected promise'], ['UR', 'PX', 'Node 15+ default'], ['EM', 'R500']];
        var frames = [];
        function g(hl, ehl, tags) { return { type: 'graph', label: 'Error routes', height: 60, directed: true, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} }; }
        var codeBy = {
          sync: "app.get('/a', (req, res) => { throw new Error('x'); });",
          async4: "app.get('/a', async (req, res) => { throw new Error('x'); });   // Express 4",
          wrapped: "app.get('/a', asyncHandler(async (req, res) => { throw new Error('x'); }));",
          express5: "app.get('/a', async (req, res) => { throw new Error('x'); });   // Express 5"
        };
        frames.push({ narr: 'A request reaches a route handler. Scenario <b>' + sc + '</b>. Watch where the error travels.', parts: [
          g({ REQ: 'ok', H: 'cur' }, { 'REQ-H': 'ok' }),
          { type: 'code', label: 'Handler', lang: 'js', code: codeBy[sc], hl: { 1: 'cur' } }
        ] });
        frames.push({ narr: 'The handler hits an error (the database call fails).', parts: [
          g({ H: 'bad' }, {}, { H: 'error!' }),
          { type: 'code', label: 'Handler', lang: 'js', code: codeBy[sc], hl: { 1: 'bad' } }
        ] });
        if (sc === 'sync' || sc === 'wrapped' || sc === 'express5') {
          var why = sc === 'sync' ? 'A <b>synchronous</b> throw happens while Express is still on the call stack, so Express\'s own try/catch catches it.' : sc === 'wrapped' ? 'The wrapper added <code>.catch(next)</code> to the returned promise, so the rejection becomes <code>next(err)</code>.' : '<b>Express 5</b> awaits the promise returned by your handler and calls <code>next(err)</code> if it rejects.';
          frames.push({ narr: why, parts: [
            g({ H: 'bad', EM: 'cur' }, { 'H-EM': 'ok' }, { EM: 'next(err)' })
          ] });
          frames.push({ narr: 'The <b>error middleware</b> (4 parameters) logs the stack and sends a clean <b>500</b>. The process keeps running and other requests are unaffected.', parts: [
            g({ EM: 'ok', R500: 'ok' }, { 'H-EM': 'ok', 'EM-R500': 'ok' }),
            { type: 'vars', vals: { status: 500, process: 'alive', next_request: 'served normally' }, hl: { process: 'ok' } }
          ] });
        } else {
          frames.push({ narr: 'Express 4 calls the async function and ignores the returned promise. Nobody attached a <code>.catch</code>, so the rejection is <b>unhandled</b>.', parts: [
            g({ H: 'bad', UR: 'bad' }, { 'H-UR': 'bad' }, { UR: 'nobody listens' })
          ] });
          frames.push({ narr: '<span class="c-r">Since Node 15 an unhandled rejection is turned into an uncaught exception: the whole process exits.</span> All in-flight requests of all users die, and this request hangs until the client times out.', parts: [
            g({ UR: 'bad', PX: 'bad' }, { 'H-UR': 'bad', 'UR-PX': 'bad' }, { PX: 'crash' }),
            { type: 'vars', vals: { process: 'DEAD', in_flight_requests: 'dropped', fix: 'asyncHandler / Express 5 / try-catch + next(err)' }, hl: { process: 'bad', fix: 'ok' } }
          ] });
          frames.push({ narr: 'A supervisor (Kubernetes, PM2) restarts the process after a few seconds, but a single bad request has already caused an outage. Also set an <code>unhandledRejection</code> handler that logs and shuts down gracefully, so you at least know why it died.', parts: [
            g({ PX: 'sel' }, {}, { PX: 'restarted by supervisor' })
          ] });
        }
        return frames;
      }
    }
  ],
  examples: [
    {
      title: 'The silent killer: forgot await',
      html: `<p><code>app.post('/pay', async (req, res) =&gt; { chargeCard(req.body); res.send('ok'); })</code>. <code>chargeCard</code> is async and rejects when the card is declined. Without <code>await</code>, the handler answers "ok" before the charge finishes, and the failure becomes an unhandled rejection (crash). Two bugs from one missing word. ESLint rule <code>@typescript-eslint/no-floating-promises</code> catches this; turn it on.</p>`
    },
    {
      title: 'Fire-and-forget done right',
      html: `<p>Sometimes you really do not want to wait (send an analytics event). Then attach your own handler so a failure is logged instead of crashing:</p>
      <pre>sendAnalytics(event).catch((err) =&gt; log.warn({ err }, 'analytics failed'));</pre>
      <p>Rule: every promise is either <b>awaited</b>, <b>returned</b>, or <b>has a .catch</b>. No fourth option.</p>`
    },
    {
      title: 'Operational vs programmer errors',
      html: `${H.table(['Error', 'Type', 'What to do'], [
        ['Invalid email in a request body', 'operational', '<span class="c-g">400 + message, keep running</span>'],
        ['Database timeout', 'operational', '<span class="c-y">503 or retry with backoff, alert if frequent</span>'],
        ['<code>Cannot read properties of undefined</code>', 'programmer (bug)', '<span class="c-r">log stack, 500, fix the code; if state is corrupt, exit</span>'],
        ['Out of memory', 'fatal', '<span class="c-r">process dies; supervisor restarts</span>']
      ])}`
    },
    {
      title: 'Error cause chains keep the story',
      html: `<p>When you catch and re-throw, keep the original with the <code>cause</code> option so logs show both layers. Do not swallow errors with an empty <code>catch {}</code>.</p>`,
      code: `async function loadProfile(id) {
  try {
    return await fetchFromDb(id);
  } catch (err) {
    // new message for callers, original error kept for debugging
    throw new Error('could not load profile ' + id, { cause: err });
  }
}

async function fetchFromDb(id) { throw new Error('connection reset'); }

loadProfile(7).catch((e) => console.log(e.message + ' <- ' + e.cause.message));`
    }
  ],
  deepDive: `<p><b>Unhandled rejection modes:</b> Node's <code>--unhandled-rejections</code> flag has <code>throw</code> (default since 15: raise as uncaught exception, but fire the <code>unhandledRejection</code> handler first if present), <code>strict</code>, <code>warn</code>, <code>warn-with-error-code</code>, and <code>none</code>. Detection happens when the microtask queue drains after a tick: a promise rejected with no handler attached by then is reported. Attaching <code>.catch</code> later fires <code>rejectionHandled</code> (rare in practice, avoid relying on it).</p>
  <p><b>Why not continue after <code>uncaughtException</code>?</b> The error may have left a socket half-written, a lock held, a transaction open or an invariant broken. The Node docs say the handler is for synchronous cleanup before exit, not for resuming. The robust pattern is "crash-only software": keep processes small, stateless and quickly restartable, and let the supervisor bring a clean one up. Combine with health checks and readiness probes so traffic only goes to healthy pods.</p>
  <p><b>Graceful shutdown details:</b> <code>server.close()</code> stops accepting new connections but waits for keep-alive connections to end, which can take minutes. In Node 18.2+ use <code>server.closeIdleConnections()</code> and <code>closeAllConnections()</code> after a grace period. Also mark readiness as false first so the load balancer stops routing to you, wait a few seconds, then close. Set Kubernetes <code>terminationGracePeriodSeconds</code> above your own timeout.</p>
  <p><b>Stack traces and async:</b> V8 keeps "async stack traces" across <code>await</code> (zero-cost async stack traces), but not across callbacks or event emitters. Log <code>err.stack</code>, <code>err.cause</code>, the request id and user id. Use structured logging (pino) so you can query fields, and do not log secrets or full request bodies.</p>
  <p><b>Operational hygiene:</b> map errors to HTTP codes in one place; return problem-details style JSON (<code>{ type, title, status, detail }</code>); never send stack traces to clients; add a timeout to every outbound call (<code>AbortSignal.timeout(ms)</code>); put a circuit breaker around flaky dependencies; count errors by type for alerts. Tests: write one for "handler rejects" to prove the process does not die.</p>`,
  aiEra: `<p><b>What AI changes:</b> AI-generated code is full of <code>async</code> functions, and agents call many flaky tools and LLM APIs that time out, rate-limit (429) or return malformed JSON. Error handling becomes a product feature: retries with backoff and jitter, timeouts through <code>AbortSignal</code>, fallbacks to a cheaper model, and clear messages when a tool fails.</p>
  <p><b>Use AI as a partner:</b> ask <code>List every promise in this file that is neither awaited, returned nor caught</code> or <code>Write failing tests for each error path of this handler</code>. It is also strong at drafting an error taxonomy and a mapping table to HTTP status codes that you then review.</p>
  <p><b>Where AI goes wrong:</b> empty <code>catch (e) {}</code> blocks "to make the error go away", <code>process.on('uncaughtException', () =&gt; {})</code> that keeps a corrupted process alive, returning <code>err.message</code> or stack traces to clients, retrying non-idempotent POSTs, and catching an error just to <code>console.log</code> it and carry on with <code>undefined</code>. <b>What you must still own:</b> the policy: what is retried, what is shown to users, what pages the on-call, and when the process must die.</p>`,
  problems: [{
    title: 'Make Async Errors Safe: Wrapper, Central Handler, Shutdown',
    level: 'Medium',
    tags: ['error handling', 'unhandled rejection', 'graceful shutdown', 'express'],
    companies: ['Amazon', 'Zalando', 'Gojek'],
    statement: `<p>A team runs Express 4. Some async handlers lack try/catch and the pod occasionally restarts with exit code 1 and a log line "UnhandledPromiseRejection". Deployments also drop requests. Propose a fix covering: (1) async handler errors, (2) consistent error responses without leaking internals, (3) process-level handlers, (4) graceful shutdown on SIGTERM.</p>`,
    constraints: `Express 4.x, Node 20, Kubernetes with 30 s termination grace period, ~500 handlers (cannot rewrite them all today).`,
    example: `<p>Before: ${H.c('r', "async handler rejects → process exit 1 → all in-flight requests dropped")}. After: ${H.c('g', 'rejection → next(err) → JSON 500 → process keeps running')}.</p>`,
    brute: {
      why: `<p>Adding try/catch to 500 handlers by hand is error-prone (someone forgets one), and a global <code>uncaughtException</code> handler that swallows errors leaves a possibly corrupted process serving traffic.</p>`,
      code: { lang: 'js', code: `// "Make the crashes stop" the wrong way: swallow everything\nprocess.on('uncaughtException', () => {});\nprocess.on('unhandledRejection', () => {});\nconsole.log('errors are now invisible and state may be corrupt');` }
    },
    mcq: { q: 'What should an uncaughtException handler do?', options: ['Log the error and keep serving traffic', 'Log, finish cleanup, and exit so a supervisor restarts the process', 'Retry the failed function forever', 'Nothing, Node recovers automatically'], answer: 1, explain: 'After an uncaught exception the process state is unknown; the safe move is a controlled exit and restart.' },
    hints: [
      `<p>Hint 1: Where do the 500 handlers get their errors? Can you add the missing <code>.catch(next)</code> in one place instead of 500?</p>`,
      `<p>Hint 2: One error middleware at the end decides status and body. Distinguish your own AppError from unexpected bugs.</p>`,
      `<p>Hint 3: SIGTERM recipe: set readiness false, <code>server.close()</code>, close DB, exit; plus a timer slightly below the grace period that forces exit. Upgrade to Express 5 for the long term.</p>`
    ],
    solution: {
      approach: `<p><b>1. Async errors:</b> wrap handlers once: monkey-patch via a tiny helper or the package <code>express-async-errors</code>, or write <code>asyncHandler(fn)</code> that does <code>Promise.resolve(fn(req,res,next)).catch(next)</code> and apply it with a codemod to the 500 routes. Long term upgrade to Express 5, which does it natively.</p>
      <p><b>2. Central handler:</b> one 4-argument middleware registered last. <code>AppError</code> (400, 404, 409...) returns its message; anything else is logged with stack and request id and returns a generic 500. Check <code>res.headersSent</code> first.</p>
      <p><b>3. Process handlers:</b> <code>unhandledRejection</code> and <code>uncaughtException</code> log the error and start a graceful shutdown with exit code 1; they never swallow. Fix the root cause with the lint rule <code>no-floating-promises</code>.</p>
      <p><b>4. Shutdown:</b> on SIGTERM flip readiness to failing, wait a couple of seconds for the load balancer to notice, call <code>server.close()</code> (and close idle keep-alive connections), close DB pools, exit 0. A <code>setTimeout(...).unref()</code> at about 25 s forces exit before Kubernetes' SIGKILL at 30 s.</p>`,
      code: { lang: 'js', check: false, code: `const express = require('express');\nconst app = express();\nlet ready = true;\n\nclass AppError extends Error { constructor(status, msg) { super(msg); this.status = status; } }\nconst asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);\n\napp.get('/healthz/ready', (req, res) => res.status(ready ? 200 : 503).end());\napp.get('/users/:id', asyncHandler(async (req, res) => {\n  const u = await db.find(req.params.id);\n  if (!u) throw new AppError(404, 'not found');\n  res.json(u);\n}));\n\napp.use((err, req, res, next) => {\n  if (res.headersSent) return next(err);\n  const known = err instanceof AppError;\n  if (!known) console.error('unexpected', err);\n  res.status(known ? err.status : 500).json({ error: known ? err.message : 'Internal Server Error' });\n});\n\nconst server = app.listen(3000);\nfunction shutdown(code) {\n  ready = false;                                   // load balancer stops sending traffic\n  setTimeout(() => {\n    server.close(() => { db.close().finally(() => process.exit(code)); });\n    server.closeIdleConnections();\n  }, 2000);\n  setTimeout(() => process.exit(1), 25000).unref();   // before SIGKILL at 30 s\n}\nprocess.on('SIGTERM', () => shutdown(0));\nprocess.on('unhandledRejection', (r) => { console.error(r); shutdown(1); });\nprocess.on('uncaughtException', (e) => { console.error(e); shutdown(1); });` },
      complexity: `<p>Constant overhead per request (one extra promise hop). Shutdown time is bounded by the longest in-flight request or the forced-exit timer.</p>`,
      followUps: ['What changes if the in-flight work is a long WebSocket connection?', 'How do you test that an unhandled rejection no longer kills the process?']
    }
  }]
});

/* ---------------- PRACTICE ---------------- */
practice.push({
  title: 'Which Phase Runs It?', level: 'Easy', tags: ['event loop', 'phases'], companies: ['Infosys', 'TCS'],
  statement: `<p>For each call, name the event loop phase or special queue that runs its callback: <code>setTimeout(f, 0)</code>, <code>setImmediate(f)</code>, <code>process.nextTick(f)</code>, <code>Promise.resolve().then(f)</code>, a <code>fs.readFile</code> callback, <code>socket.on('close', f)</code>.</p>`,
  constraints: `Node 18+. Six phases: timers, pending, idle/prepare, poll, check, close.`,
  example: `${H.table(['Call', 'Where'], [['setTimeout(f,0)', 'timers'], ['setImmediate(f)', 'check'], ['nextTick(f)', 'nextTick queue (before promises)'], ['Promise.then(f)', 'microtask queue'], ['readFile cb', 'poll'], ['socket close', 'close callbacks']])}`,
  brute: { why: `<p>Guessing from the function names ("immediate must be first") is wrong: names are historical and the real order depends on queues and phases.</p>` },
  mcq: { q: 'Which phase runs setImmediate callbacks?', options: ['timers', 'poll', 'check', 'close callbacks'], answer: 2, explain: 'The check phase comes right after poll and is dedicated to setImmediate.' },
  hints: [`<p>Hint 1: Write the six phases in order on paper before answering anything.</p>`, `<p>Hint 2: Two items are not in any phase: nextTick and promises. They run between callbacks.</p>`, `<p>Hint 3: I/O completion callbacks belong to poll, timers to timers, immediates to check, cleanup events to close.</p>`],
  solution: { approach: `<p>setTimeout runs in the <b>timers</b> phase; setImmediate in <b>check</b>; nextTick in the <b>nextTick queue</b> which is drained first after each callback; Promise.then in the <b>microtask queue</b> drained right after the tick queue; the readFile callback in <b>poll</b> (when the thread pool reports the read is done); socket close handlers in <b>close callbacks</b>. This means that, after the main script, the order is sync, nextTick, promises, timers, poll, check, close.</p>`, complexity: `<p>Conceptual question; O(1) to answer once the model is known.</p>` }
});

practice.push({
  title: 'Unhandled Error Event', level: 'Easy', tags: ['EventEmitter', 'error'], companies: ['Wipro', 'Cognizant'],
  statement: `<p>This script crashes with "Unhandled error event". Explain why and fix it so the program logs the failure and continues.</p><pre>const EventEmitter = require('events');
const job = new EventEmitter();
job.emit('error', new Error('disk full'));
console.log('still running?');</pre>`,
  constraints: `Node 18+, no extra libraries.`,
  example: `<p>Output now: ${H.c('r', 'throws Error: disk full')} and the last line never prints. After adding <code>job.on('error', ...)</code> it prints <b>still running?</b>.</p>`,
  brute: { why: `<p>Wrapping <code>emit</code> in try/catch works once but hides the design problem: every other emit site still crashes, and async emits are not covered by the try.</p>` },
  mcq: { q: 'What does emit("error", err) do when there is no "error" listener?', options: ['Returns false silently', 'Throws err', 'Logs a warning', 'Calls process.exit(0)'], answer: 1, explain: 'The error event is special: without a listener the error is thrown.' },
  hints: [`<p>Hint 1: Is "error" a normal event name? Check what Node does when nobody listens.</p>`, `<p>Hint 2: Attach a listener before anything can emit.</p>`, `<p>Hint 3: Register the handler at creation time, log the error, and decide whether to retry or stop the job.</p>`],
  solution: { approach: `<p>The <code>'error'</code> event has special handling: if no listener exists, <code>emit</code> throws the error and, being uncaught, it terminates the process. Fix: add <code>job.on('error', (err) =&gt; console.error('job failed:', err.message))</code> right after creating the emitter, before any emit can happen. Every emitter that can fail (streams, sockets, child processes, your own classes) needs this listener; in a class constructor, attach it in the owner code that creates the object.</p>`, code: { lang: 'js', code: `const EventEmitter = require('events');\nconst job = new EventEmitter();\njob.on('error', (err) => console.error('job failed:', err.message));\njob.emit('error', new Error('disk full'));\nconsole.log('still running?');` }, complexity: `<p>O(1): a single listener registration and emit.</p>` }
});

practice.push({
  title: 'Spot the Blocker', level: 'Easy', tags: ['blocking', 'sync apis'], companies: ['Swiggy', 'Freshworks'],
  statement: `<p>Circle everything that blocks the event loop when used inside an HTTP request handler: <code>fs.readFileSync</code>, <code>await fs.promises.readFile</code>, <code>JSON.parse(hugeString)</code>, <code>crypto.pbkdf2Sync</code>, <code>await fetch(url)</code>, a <code>for</code> loop over 10 million items, <code>zlib.gzip</code> (async).</p>`,
  constraints: `Assume files of several MB and a loop body of a few nanoseconds.`,
  example: `<p>${H.c('r', 'Blocks: readFileSync, JSON.parse(huge), pbkdf2Sync, 10M loop')}. ${H.c('g', 'Does not block: promises readFile, fetch, async gzip (thread pool)')}.</p>`,
  brute: { why: `<p>Assuming "anything with await is safe" and "anything sync is fine for small data" misses that JSON.parse and loops are CPU on the main thread regardless of syntax.</p>` },
  mcq: { q: 'Which one is safe for the event loop?', options: ['crypto.pbkdf2Sync', 'JSON.parse of a 100 MB string', 'await fs.promises.readFile(path)', 'while (Date.now() < end) {}'], answer: 2, explain: 'The promise API hands the read to the thread pool; the other three run on the main thread.' },
  hints: [`<p>Hint 1: Ask for each: who does the work, the JS thread, the OS, or a pool thread?</p>`, `<p>Hint 2: Sync-suffixed APIs and pure JS computation always use the JS thread.</p>`, `<p>Hint 3: await only waits for results; it does not move work to another thread.</p>`],
  solution: { approach: `<p>Blockers (main thread does the work): <code>readFileSync</code> (waits on disk), <code>JSON.parse</code> of a huge string (pure CPU), <code>pbkdf2Sync</code> (CPU), and the 10-million-iteration loop. Non-blockers: <code>fs.promises.readFile</code> (libuv thread pool), <code>fetch</code> (OS network I/O), async <code>zlib.gzip</code> (thread pool). Note a loop of 10 million cheap iterations may take only ~10 to 30 ms, which is still a visible stall under load; measure with event loop lag. Fix options are streaming parsers, worker threads or chunking with setImmediate.</p>`, complexity: `<p>Conceptual question; O(1) once you know the rules.</p>` }
});

practice.push({
  title: 'Why Is req.body Undefined?', level: 'Easy', tags: ['express', 'middleware order'], companies: ['Zoho', 'Paytm'],
  statement: `<p>In an Express app a POST route reads <code>req.body.name</code> and gets <code>TypeError: Cannot read properties of undefined</code>. The code has <code>app.post('/users', create); app.use(express.json());</code>. Explain and fix. Also say what you would add so an invalid or huge JSON body is handled safely.</p>`,
  constraints: `Express 4 or 5.`,
  example: `<p>${H.c('r', 'route first, parser second → body undefined')} · ${H.c('g', 'parser first, route second → body parsed')}.</p>`,
  brute: { why: `<p>Parsing the body by hand inside every route duplicates code and misses limits and content-type checks.</p>` },
  mcq: { q: 'What decides which function runs first in Express?', options: ['Alphabetical order', 'The order of registration', 'Function length', 'HTTP method'], answer: 1, explain: 'Express walks layers in the order they were registered.' },
  hints: [`<p>Hint 1: The request finds the first matching layer. Which layer matched first?</p>`, `<p>Hint 2: Parser middleware must be registered before the routes that need it.</p>`, `<p>Hint 3: Also set a size limit and an error handler for malformed JSON (status 400).</p>`],
  solution: { approach: `<p>The route was registered before the parser, so the request matched the route first and the body was never parsed. Move <code>app.use(express.json({ limit: '100kb' }))</code> above all routes. For safety add an error middleware that maps parse errors (<code>err.type === 'entity.parse.failed'</code>) to 400 and size errors (<code>entity.too.large</code>) to 413, so bad clients never produce a 500 or a stack trace. The limit matters because JSON.parse is synchronous, and a giant body would stall the event loop.</p>`, code: { lang: 'js', check: false, code: `app.use(express.json({ limit: '100kb' }));   // before routes\napp.post('/users', create);\napp.use((err, req, res, next) => {\n  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'invalid JSON' });\n  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'body too large' });\n  next(err);\n});` }, complexity: `<p>Parsing is O(body size).</p>` }
});

practice.push({
  title: 'Await Inside forEach', level: 'Medium', tags: ['async', 'promises', 'concurrency'], companies: ['Amazon', 'Google'],
  statement: `<p>A job does <code>ids.forEach(async (id) =&gt; { await save(id); }); console.log('all saved');</code> and "all saved" prints early; failures also crash the process. Explain the bug and give two fixes: sequential and concurrent with a limit of 5.</p>`,
  constraints: `ids up to 10<sup>4</sup>; save takes ~50 ms; the database allows 10 connections.`,
  example: `<p>Sequential: 10<sup>4</sup> × 50 ms = ${H.c('y', '500 s')}. Unbounded parallel: ${H.c('r', '10,000 concurrent calls exhaust the pool')}. Limit 5: ${H.c('g', '~100 s')}.</p>`,
  brute: { why: `<p>forEach ignores the promises returned by its callback, so nobody waits and errors are unhandled rejections.</p>` },
  mcq: { q: 'Why does forEach(async ...) not wait?', options: ['forEach is asynchronous', 'It discards the promises returned by the callback', 'await only works in for loops', 'Promises are lazy'], answer: 1, explain: 'forEach does not use the return values, so the outer function continues immediately.' },
  hints: [`<p>Hint 1: What does forEach do with the value returned from your callback?</p>`, `<p>Hint 2: Sequential: for...of with await. Parallel: collect promises and await them.</p>`, `<p>Hint 3: For a limit, run N worker loops that each pull the next id from a shared index.</p>`],
  solution: { approach: `<p><code>forEach</code> calls the async callback, receives a promise, and throws it away; the loop finishes instantly, "all saved" prints, and a rejection has no handler. Fix 1: <code>for (const id of ids) await save(id)</code> (safe, slow). Fix 2: bounded concurrency: start 5 "lanes", each repeatedly takes the next index and awaits <code>save</code>; <code>await Promise.all(lanes)</code>. Errors then propagate to the caller once, and the pool never sees more than 5 concurrent calls. Libraries such as p-limit implement the same idea.</p>`, code: { lang: 'js', code: `async function saveAll(ids, save, limit) {\n  let next = 0;\n  async function lane() {\n    while (next < ids.length) {\n      const id = ids[next++];      // safe: JS is single-threaded, no race on next\n      await save(id);\n    }\n  }\n  await Promise.all(Array.from({ length: limit }, lane));\n}\nsaveAll([1, 2, 3, 4, 5, 6, 7], async (id) => { console.log('saved', id); }, 3).then(() => console.log('all saved'));` }, complexity: `<p>Time about N × t / limit; memory O(limit).</p>` }
});

practice.push({
  title: 'Debounce Order with Immediate and Timeout in a Loop', level: 'Medium', tags: ['event loop', 'prediction'], companies: ['Microsoft', 'Meta'],
  statement: `<p>Predict the output (CommonJS):</p><pre>setTimeout(() =&gt; console.log('t1'), 0);
setTimeout(() =&gt; { console.log('t2'); Promise.resolve().then(() =&gt; console.log('p1')); }, 0);
setTimeout(() =&gt; console.log('t3'), 0);
setImmediate(() =&gt; console.log('i1'));</pre><p>What changed between Node 10 and Node 11+?</p>`,
  constraints: `Assume the three timers are all due when the loop starts.`,
  example: `<p>Node 11+: ${H.c('g', 't1 t2 p1 t3 i1')}. Node 10: ${H.c('y', 't1 t2 t3 p1 i1')}.</p>`,
  brute: { why: `<p>Assuming microtasks run only after the whole timers phase (the Node 10 rule) gives the wrong answer on modern Node.</p>` },
  mcq: { q: 'Since Node 11, when are promise callbacks drained?', options: ['Only after each full phase', 'After every single callback', 'Only at the end of the program', 'Before the main script'], answer: 1, explain: 'Node aligned with browsers: the microtask queue drains after each callback.' },
  hints: [`<p>Hint 1: Three timers are in the same phase; the immediate waits for check.</p>`, `<p>Hint 2: After t2 finishes, what is queued and when is it drained?</p>`, `<p>Hint 3: Draining happens between t2 and t3 on Node 11+; the i1 follows after timers and poll.</p>`],
  solution: { approach: `<p>All three timers run in one timers phase in order t1, t2, t3. On Node 11+ the microtask queue is drained after <b>each</b> callback, so p1 (queued by t2) prints immediately after t2 and before t3. Then poll has nothing, and check runs i1 (assuming the timers were due on entry; if the loop entered before 1 ms elapsed, i1 could print first, which is why the main-script timer/immediate order is not guaranteed). Final: t1 t2 p1 t3 i1. On Node 10 and below microtasks drained only after the entire phase: t1 t2 t3 p1 i1. Mentioning this version change shows depth.</p>`, complexity: `<p>Conceptual question; no algorithmic cost, only the ordering rules matter.</p>` }
});

practice.push({
  title: 'Tune the Thread Pool for Eight Hashes', level: 'Medium', tags: ['libuv', 'thread pool', 'crypto'], companies: ['Cloudflare', 'Okta'],
  statement: `<p>On an 8-core machine, 16 concurrent <code>crypto.pbkdf2</code> calls (each ~100 ms of CPU) take about 400 ms. Why exactly? What value of <code>UV_THREADPOOL_SIZE</code> would you pick, what is the new time, and what else could it hurt?</p>`,
  constraints: `Default pool = 4. 8 physical cores. The service also does file reads and DNS lookups.`,
  example: `${H.table(['Pool size', 'Waves', 'Total'], [['4', '16/4 = 4', '400 ms'], ['8', '16/8 = 2', '<span class="c-g">200 ms</span>'], ['16', '1 (but only 8 cores)', '<span class="c-y">~200 ms, time-sharing</span>']])}`,
  brute: { why: `<p>Setting UV_THREADPOOL_SIZE=1024 "to be safe" creates many threads that fight for 8 cores, adding context switches and memory with no speedup.</p>` },
  mcq: { q: 'Best pool size for pure CPU-bound pbkdf2 on 8 cores?', options: ['4', '8 (about the core count)', '128', '1'], answer: 1, explain: 'CPU-bound work gains nothing beyond one thread per core.' },
  hints: [`<p>Hint 1: Count the waves: tasks divided by pool threads, rounded up.</p>`, `<p>Hint 2: CPU-bound pool work cannot beat the number of cores.</p>`, `<p>Hint 3: Remember that fs and dns share the same pool; heavy hashing can starve them.</p>`],
  solution: { approach: `<p>With 4 threads, 16 tasks run in 4 waves of 100 ms = 400 ms. Setting <code>UV_THREADPOOL_SIZE=8</code> gives 2 waves = about 200 ms; going above the core count only time-shares the same cores. The side effect: the hashes now occupy all 8 threads, so fs reads and dns.lookup calls queue behind them and unrelated requests slow down. Better design: keep the default pool for I/O, run hashing in a dedicated worker pool (piscina) sized to cores minus one, with a bounded queue. Set the variable in the environment at process start, not inside the code. Measure p99 before and after.</p>`, complexity: `<p>Wall time = ceil(tasks / min(pool, cores)) × cost.</p>` }
});

practice.push({
  title: 'Cluster, Worker Thread or Child Process?', level: 'Medium', tags: ['cluster', 'worker_threads', 'architecture'], companies: ['Walmart', 'Adobe'],
  statement: `<p>Choose the best tool and defend it for each: (a) a JSON API mostly waiting on PostgreSQL that must use 16 cores; (b) a PDF text-extraction step of 300 ms CPU per upload; (c) converting videos with ffmpeg; (d) a Socket.IO chat with rooms on 4 workers; (e) a service already deployed as 8 Kubernetes pods with 1 CPU each.</p>`,
  constraints: `Node 20, Linux.`,
  example: `${H.table(['Case', 'Tool'], [['a', 'cluster (or 16 pods)'], ['b', 'worker thread pool'], ['c', 'child_process / separate job service'], ['d', 'cluster + sticky + Redis adapter'], ['e', 'none; scale replicas']])}`,
  brute: { why: `<p>Using worker threads for everything adds copying and complexity to I/O-bound code that gains nothing from them.</p>` },
  mcq: { q: 'Which tool gives crash isolation and shares a listening port?', options: ['worker_threads', 'cluster', 'AsyncLocalStorage', 'EventEmitter'], answer: 1, explain: 'Cluster forks processes that share the server port through the primary.' },
  hints: [`<p>Hint 1: Is the bottleneck I/O waiting or CPU computation?</p>`, `<p>Hint 2: Do you need shared state across instances? Where will it live?</p>`, `<p>Hint 3: In an orchestrated environment replicas are usually the first lever.</p>`],
  solution: { approach: `<p>(a) I/O-bound HTTP API: <b>cluster</b> or 16 containers; each process has its own event loop, and crashes are isolated. (b) CPU 300 ms per upload: <b>worker thread pool</b> so the HTTP loop stays responsive; transfer buffers to avoid copies. (c) ffmpeg is an external program: <b>child_process</b> (spawn, stream stdio) or better a queue plus a worker service with its own scaling. (d) Chat rooms: <b>cluster with sticky sessions</b> and a Redis pub/sub adapter, because rooms and broadcasts span workers. (e) Already one process per pod: <b>no cluster</b>; scale replicas with an autoscaler and keep one process per container so Kubernetes sees crashes and restarts them.</p>`, complexity: `<p>Decision question; compare cost per option: memory per process, copy cost per message, operational complexity.</p>` }
});

practice.push({
  title: 'Uppercase Transform with Backpressure', level: 'Medium', tags: ['streams', 'transform'], companies: ['Dropbox', 'Box'],
  statement: `<p>Write a function <code>upperFile(src, dest)</code> that upper-cases a file of unknown size with a Transform stream, using bounded memory, and fails cleanly (no leaked file descriptors) if the source is missing. Then explain where backpressure acts in the chain.</p>`,
  constraints: `Node 20. Files up to several GB.`,
  example: `<p>Input chunks "abc", "def" → output "ABC", "DEF". Memory ≈ 2 × highWaterMark regardless of size.</p>`,
  brute: { why: `<p><code>readFile</code> + <code>toUpperCase</code> + <code>writeFile</code> needs the whole file in RAM, 2 copies at once (string and buffer), and blocks the first byte until the end.</p>` },
  mcq: { q: 'Why prefer stream.pipeline over a.pipe(b).pipe(c)?', options: ['It is shorter', 'It forwards errors and destroys all streams on failure', 'It disables backpressure', 'It runs in a worker thread'], answer: 1, explain: 'pipeline wires cleanup and error propagation; pipe does not.' },
  hints: [`<p>Hint 1: A Transform implements _transform(chunk, enc, cb).</p>`, `<p>Hint 2: Use stream/promises pipeline with read stream, transform, write stream.</p>`, `<p>Hint 3: Multi-byte characters can be split across chunks; for pure ASCII uppercasing a Buffer-level approach is fine, otherwise use a StringDecoder.</p>`],
  solution: { approach: `<p>Create a <code>Transform</code> whose <code>_transform</code> converts each chunk and calls the callback with the result; the callback is also the backpressure valve (when the next stream is slow, it is called later, so the previous stream pauses). Connect with <code>await pipeline(createReadStream(src), upper, createWriteStream(dest))</code>. If the source is missing, the read stream errors, pipeline destroys the others and rejects once, so no descriptors leak. Backpressure acts at every link: write stream buffer to transform's writable side to read stream's pause. For non-ASCII text use <code>setEncoding('utf8')</code> on the read stream (it uses a StringDecoder internally) to avoid splitting characters.</p>`, code: { lang: 'js', code: `const fs = require('fs');\nconst { Transform } = require('stream');\nconst { pipeline } = require('stream/promises');\n\nconst upper = () => new Transform({\n  transform(chunk, enc, cb) { cb(null, chunk.toString('utf8').toUpperCase()); }\n});\n\nasync function upperFile(src, dest) {\n  await pipeline(fs.createReadStream(src, { encoding: 'utf8' }), upper(), fs.createWriteStream(dest));\n}\nupperFile('in.txt', 'out.txt').catch((e) => console.error('failed:', e.code));` }, complexity: `<p>Time O(n); memory O(highWaterMark).</p>` }
});

practice.push({
  title: 'Fastify Hooks vs Express Middleware', level: 'Medium', tags: ['fastify', 'express', 'hooks'], companies: ['Netflix', 'Grab'],
  statement: `<p>You have Express middleware: request-id, logger, rate limit, JSON parser, auth, route, error handler. Map each to the Fastify way, and explain encapsulation with plugins and when you would break it.</p>`,
  constraints: `Fastify v5, Node 20.`,
  example: `${H.table(['Express', 'Fastify'], [['request-id', 'genReqId option'], ['logger', 'built-in pino logger'], ['rate limit', '@fastify/rate-limit plugin'], ['json parser', 'built-in content-type parser'], ['auth', 'onRequest or preHandler hook'], ['error middleware', 'setErrorHandler']])}`,
  brute: { why: `<p>Porting line by line with the middleware compatibility layer keeps Express's slower, order-dependent design and loses schema validation and serialization benefits.</p>` },
  mcq: { q: 'In Fastify, a hook added inside a plugin applies to…', options: ['Every route in the app', 'Only routes inside that plugin scope (encapsulation)', 'Only the first route', 'No route'], answer: 1, explain: 'Plugins create encapsulated contexts unless wrapped with fastify-plugin.' },
  hints: [`<p>Hint 1: Fastify has a fixed lifecycle: onRequest, preParsing, preValidation, preHandler, handler, onSend, onResponse.</p>`, `<p>Hint 2: Auth belongs before the body is parsed if possible (onRequest) to save work.</p>`, `<p>Hint 3: Shared things like a DB client use fastify-plugin to escape encapsulation.</p>`],
  solution: { approach: `<p>request-id: <code>genReqId</code>; logger: built-in pino (<code>logger: true</code>) with request-scoped child logger; rate limit: <code>@fastify/rate-limit</code> registered at the root; JSON parsing is built in (body limit via <code>bodyLimit</code>); auth: an <code>onRequest</code> hook (cheap rejection before parsing) registered in a plugin that wraps only protected routes; validation: a JSON schema on each route (<code>preValidation</code> stage, compiled by ajv); serialization: response schema (fast-json-stringify); errors: <code>setErrorHandler</code>, also <code>setNotFoundHandler</code>. Encapsulation means hooks and decorators defined in a plugin affect only that plugin and its children, which lets public and private route groups coexist without ordering mistakes. Use <code>fastify-plugin</code> only for shared infrastructure (database, config) that siblings must see.</p>`, complexity: `<p>Route lookup is a radix tree; hooks add O(h) per request for h hooks.</p>` }
});

practice.push({
  title: 'Build a Worker Pool with a Bounded Queue', level: 'Hard', tags: ['worker_threads', 'pool', 'backpressure'], companies: ['Stripe', 'Cloudflare'],
  statement: `<p>Design and implement the logic of a <code>Pool</code> class: fixed number of workers, <code>run(task)</code> returning a promise, a FIFO queue limited to <code>maxQueue</code>, rejection with a "busy" error beyond the limit, per-task timeout, and replacement of crashed workers. Model workers with plain async functions so the code runs here.</p>`,
  constraints: `size 1..32, maxQueue up to 10<sup>4</sup>, tasks 1 ms to 10 s.`,
  example: `<p>size 2, maxQueue 1: tasks A, B run; C waits; D is ${H.c('r', 'rejected (busy)')}. When A ends, C starts.</p>`,
  brute: { why: `<p>Creating a worker per task costs tens of ms and tens of MB each and has no upper bound under a burst; an unbounded queue turns overload into endless latency and memory growth.</p>` },
  mcq: { q: 'Why bound the queue of a CPU worker pool?', options: ['To save disk space', 'So overload becomes a fast error instead of unbounded latency and memory', 'Because workers cannot queue', 'To disable timeouts'], answer: 1, explain: 'Bounded queues apply backpressure to callers and keep latency predictable.' },
  hints: [`<p>Hint 1: State: idle count (or idle list), queue array, running count.</p>`, `<p>Hint 2: run(): if a worker is free start now; else if queue has room push; else reject.</p>`, `<p>Hint 3: When a task finishes (success, error or timeout) free the worker and pump the queue; in a real pool a crashed worker is replaced.</p>`],
  solution: { approach: `<p>Keep <code>active</code> (running count) and a <code>queue</code>. <code>run(task)</code> returns a promise: if <code>active &lt; size</code> start immediately, else if <code>queue.length &lt; maxQueue</code> enqueue, else reject with a busy error (the HTTP layer maps it to 503 with Retry-After). Starting a task wraps it with <code>Promise.race</code> against a timer; whatever happens, a <code>finally</code> decrements <code>active</code> and pumps the next queued job. With real threads a timeout or crash also terminates and respawns the worker, since a CPU loop cannot be cancelled cooperatively. Sizing: cores minus one for CPU tasks; choose maxQueue = target latency × throughput.</p>`, code: { lang: 'js', run: true, code: `class Pool {
  constructor(size, maxQueue, timeoutMs) { this.size = size; this.maxQueue = maxQueue; this.timeoutMs = timeoutMs; this.active = 0; this.queue = []; }
  run(task) {
    return new Promise((resolve, reject) => {
      if (this.active < this.size) return this._start(task, resolve, reject);
      if (this.queue.length >= this.maxQueue) return reject(new Error('busy'));
      this.queue.push({ task, resolve, reject });
    });
  }
  _start(task, resolve, reject) {
    this.active++;
    let timer;
    const timeout = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('timeout')), this.timeoutMs); });
    Promise.race([task(), timeout]).then(resolve, reject).finally(() => {
      clearTimeout(timer);
      this.active--;
      const next = this.queue.shift();
      if (next) this._start(next.task, next.resolve, next.reject);
    });
  }
}
const sleep = (ms, v) => () => new Promise((r) => setTimeout(() => r(v), ms));
const pool = new Pool(2, 1, 100);
['A', 'B', 'C', 'D'].forEach((n) => pool.run(sleep(30, n)).then((v) => console.log('done', v), (e) => console.log(n, 'rejected:', e.message)));
pool.run(sleep(500, 'slow')).catch((e) => console.log('slow task:', e.message));` }, complexity: `<p>run is O(1); memory O(maxQueue + size). Throughput = size / task time.</p>` }
});

practice.push({
  title: 'Graceful Shutdown for Cluster + HTTP', level: 'Hard', tags: ['cluster', 'shutdown', 'kubernetes'], companies: ['Amazon', 'Shopify'],
  statement: `<p>Design a zero-dropped-request deploy for a clustered Node service behind a load balancer. Cover: readiness, SIGTERM handling in primary and workers, keep-alive connections, a worker that never finishes, and a rolling reload that keeps capacity.</p>`,
  constraints: `Termination grace period 30 s, requests up to 10 s, WebSockets may exist.`,
  example: `<p>Timeline: t=0 SIGTERM → readiness fails; t=3 s LB stops routing; t=3-13 s workers finish requests; t=25 s forced exit; t=30 s SIGKILL (never reached).</p>`,
  brute: { why: `<p>Calling process.exit() on SIGTERM drops every in-flight request and open connection; relying on SIGKILL after the grace period does the same, only slower.</p>` },
  mcq: { q: 'Why fail the readiness check before closing the server?', options: ['It speeds up close()', 'The load balancer stops sending new requests, so close() only waits for in-flight ones', 'It frees ports', 'It is required by Node'], answer: 1, explain: 'Traffic must be drained from the routing layer first, or new requests arrive during shutdown.' },
  hints: [`<p>Hint 1: List the stages: stop new traffic, finish old work, release resources, exit.</p>`, `<p>Hint 2: Who receives SIGTERM, the primary only? What should it do with workers?</p>`, `<p>Hint 3: Add a force-exit timer below the platform's kill timeout and close idle keep-alive sockets.</p>`],
  solution: { approach: `<p>Stage 1: on SIGTERM the primary tells workers to stop (<code>worker.disconnect()</code> or a message) and does not fork replacements (<code>exitedAfterDisconnect</code> is true). Each worker sets readiness to failing, waits a few seconds so the load balancer notices, then calls <code>server.close()</code> and <code>closeIdleConnections()</code>; in-flight requests complete, keep-alive sockets get <code>Connection: close</code> on their next response. Stage 2: close DB pools and flush logs. Stage 3: exit 0. A forced-exit timer at about 25 s ends stuck workers before SIGKILL, and WebSocket clients are sent a close frame with a reconnect hint. For deploys, perform a rolling reload: start a new worker, wait until it listens, then retire one old worker, repeating so capacity never drops. In Kubernetes prefer one process per pod and let the rolling update plus readiness probes do the same job; add a <code>preStop</code> sleep to cover endpoint propagation.</p>`, complexity: `<p>Shutdown time is bounded by the longest request or the forced timer.</p>` }
});

practice.push({
  title: 'Find the Event Loop Stall', level: 'Hard', tags: ['performance', 'profiling', 'event loop lag'], companies: ['Datadog', 'Uber'],
  statement: `<p>Production API: p50 latency 20 ms but p99 spikes to 1.5 s every few minutes; CPU averages 35%; no errors. Describe your investigation step by step: what you measure, how you tell sync CPU from pool starvation from GC, and three likely culprits with fixes.</p>`,
  constraints: `You can add instrumentation and take a CPU profile in production for 30 seconds.`,
  example: `${H.table(['Signal', 'Points to'], [['Loop lag p99 high, one core at 100%', 'sync CPU on main thread'], ['Loop lag low, requests slow, CPU low', 'waiting on pool or downstream'], ['Periodic long pauses, heap growing', 'GC pressure']])}`,
  brute: { why: `<p>Adding servers or increasing memory without measuring spreads the problem (every instance stalls) and costs money without finding the cause.</p>` },
  mcq: { q: 'Which built-in tool gives a histogram of event loop lag?', options: ['process.memoryUsage', 'perf_hooks.monitorEventLoopDelay', 'os.loadavg', 'dns.lookup'], answer: 1, explain: 'monitorEventLoopDelay records delay samples; read percentiles from the histogram.' },
  hints: [`<p>Hint 1: First decide whether the event loop is the problem: measure its lag next to request latency.</p>`, `<p>Hint 2: A short CPU profile shows which function holds the thread. Use flame graphs.</p>`, `<p>Hint 3: Typical culprits: huge JSON.parse/stringify, regex backtracking, sync fs or crypto, cache rebuild, full GC.</p>`],
  solution: { approach: `<p><b>1. Measure:</b> enable <code>monitorEventLoopDelay</code> and <code>eventLoopUtilization</code>, export p99 lag and ELU as metrics, and line them up with latency and GC metrics. <b>2. Classify:</b> lag spikes together with latency means the loop is blocked; no lag but slow requests means waiting on I/O, the libuv pool (many fs/crypto/dns calls) or an upstream. <b>3. Capture:</b> run <code>node --cpu-prof</code> or attach a profiler during a spike, open the flame graph and find the wide frames; check <code>--trace-gc</code> for pauses. <b>4. Typical causes and fixes:</b> a scheduled job rebuilding a large in-memory cache or JSON (stream it, chunk with setImmediate, or move to a worker); a regex with catastrophic backtracking on user input (rewrite, use RE2, limit input length); sync crypto or fs in a handler (async APIs or worker pool); old-space GC from huge objects (reduce allocations, stream, raise heap carefully). <b>5. Guard:</b> alert on loop lag p99 above 100 ms, add timeouts and a regression load test.</p>`, complexity: `<p>Investigation question; instrumentation overhead is small (a few percent).</p>` }
});

practice.push({
  title: 'Design a Streaming LLM Proxy', level: 'Hard', tags: ['streams', 'SSE', 'backpressure', 'ai'], companies: ['OpenAI', 'Anthropic', 'Notion'],
  statement: `<p>Your Node service sits between browsers and an LLM API. It must stream tokens to the user as they arrive, enforce per-user quotas, stop paying for tokens when the user closes the tab, survive slow mobile clients, and keep memory flat with thousands of concurrent streams. Describe the design and the failure handling.</p>`,
  constraints: `5,000 concurrent streams, each lasting 5 to 60 s; upstream may time out or return 429.`,
  example: `<p>Flow: browser → auth + quota middleware → upstream fetch (stream) → <code>pipeline</code> through a parser Transform → SSE response; client disconnect → abort upstream.</p>`,
  brute: { why: `<p>Waiting for the full completion (await response.json()) and then sending it makes users stare at a spinner, holds large buffers per request, keeps generating after the user left, and gives no place for backpressure.</p>` },
  mcq: { q: 'The user closes the browser tab mid-stream. What must the server do?', options: ['Nothing, the model finishes anyway', 'Abort the upstream request (AbortController) and release resources', 'Retry the request', 'Restart the process'], answer: 1, explain: 'Aborting stops token generation and billing and frees sockets and memory.' },
  hints: [`<p>Hint 1: Where can data pile up? Upstream socket, your transform, the client socket.</p>`, `<p>Hint 2: Tie the upstream request lifetime to the client connection with an AbortController.</p>`, `<p>Hint 3: Plan for errors in the middle of a stream (cannot change status code any more) and for quota counting from usage events.</p>`],
  solution: { approach: `<p>Use <code>fetch</code> to the model API with <code>stream: true</code> and an <code>AbortController</code>. Convert the web body with <code>Readable.fromWeb</code> and run <code>pipeline(upstream, sseTransform, res, cb)</code>: the parser Transform splits SSE lines and re-emits <code>data:</code> frames; backpressure flows from the slow client socket back to the upstream read, so memory per stream stays near highWaterMark (64 KiB × a few buffers, so 5,000 streams use hundreds of MB at most; reduce HWM if needed). On <code>res.on('close')</code> call <code>controller.abort()</code> so upstream stops. Set headers (<code>text/event-stream</code>, <code>Cache-Control: no-cache</code>, disable proxy buffering) and send heartbeats every 15 s to keep proxies from closing. Errors before the first byte return normal status codes (429 passes through with Retry-After); errors mid-stream send an SSE <code>event: error</code> frame and end. Quotas: check before the call, reserve an estimate, then settle using the final usage event in a <code>finally</code>. Add per-request timeouts, a concurrency limit per user, and metrics on time to first token and aborted streams.</p>`, code: { lang: 'js', check: false, code: `app.post('/chat', auth, quota, async (req, res) => {\n  const ac = new AbortController();\n  res.on('close', () => ac.abort());                       // tab closed -> stop upstream and billing\n  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });\n  try {\n    const up = await fetch(MODEL_URL, { method: 'POST', body: JSON.stringify({ ...req.body, stream: true }), headers, signal: ac.signal });\n    if (!up.ok) { res.write('event: error\\ndata: ' + up.status + '\\n\\n'); return res.end(); }\n    await pipeline(Readable.fromWeb(up.body), res);       // backpressure end to end\n  } catch (err) {\n    if (!ac.signal.aborted) res.write('event: error\\ndata: upstream failed\\n\\n');\n    res.end();\n  }\n});` }, complexity: `<p>Memory O(streams × buffer size); CPU is small per token. Latency to first token equals the upstream time plus one hop.</p>` }
});

/* ---------------- QUIZ ---------------- */
quiz.push({ q: 'After the main script of a CommonJS file finishes, which runs first?', options: ['setTimeout(f, 0)', 'setImmediate(f)', 'process.nextTick(f)', 'Promise.then(f)'], answer: 2, explain: 'The nextTick queue is drained before the promise microtask queue, and both before any phase of the loop.' });
quiz.push({ q: 'Which event loop phase runs setImmediate callbacks?', options: ['timers', 'poll', 'check', 'pending callbacks'], answer: 2, explain: 'check follows poll and is dedicated to setImmediate.' });
quiz.push({ q: 'Inside an fs.readFile callback you call both setTimeout(f,0) and setImmediate(g). What prints first?', options: ['f always', 'g always', 'Random', 'Neither runs'], answer: 1, explain: 'You are in poll; check (g) comes next in the same lap, while the timer waits for the next lap.' });
quiz.push({ q: 'How many threads does the libuv pool have by default, and what is it used for?', options: ['1; JavaScript code', '4; fs, crypto, zlib, dns.lookup', '8; all network sockets', 'One per CPU core; HTTP requests'], answer: 1, explain: 'Default is 4 (UV_THREADPOOL_SIZE changes it). Sockets use OS async I/O, not the pool.' });
quiz.push({ q: 'A 400 ms synchronous for loop runs inside one route. What happens to other requests?', options: ['They are served by other threads', 'They wait because the single JS thread is busy', 'Node spawns a worker automatically', 'They fail with a 500'], answer: 1, explain: 'The event loop is the JS thread; nothing else runs until the callback returns.' });
quiz.push({ q: 'What does writable.write(chunk) returning false tell you?', options: ['The chunk was dropped', 'The stream is closed', 'The internal buffer reached highWaterMark; wait for drain', 'An error occurred'], answer: 2, explain: 'The chunk is still accepted; false is a request to pause until the drain event.' });
quiz.push({ q: 'Why is stream.pipeline preferred over pipe()?', options: ['It is faster', 'It forwards errors and destroys all streams', 'pipe has no backpressure', 'pipeline works only with files'], answer: 1, explain: 'pipe handles backpressure but not error propagation or cleanup.' });
quiz.push({ q: 'You emit "error" on an EventEmitter with no "error" listener. What happens?', options: ['Nothing', 'A warning is printed', 'The error is thrown', 'The event is queued'], answer: 2, explain: 'Unhandled error events throw, and uncaught, they can crash the process.' });
quiz.push({ q: 'A counter variable in a clustered app shows different values on each request. Why?', options: ['Race condition in V8', 'Each worker process has its own memory', 'Cluster is buggy', 'Counters are not supported'], answer: 1, explain: 'Workers are separate processes with separate heaps; share state via Redis or a database.' });
quiz.push({ q: 'Which is the best use of worker_threads?', options: ['Serving more sockets', 'CPU-heavy work like hashing or image processing', 'Reading files faster', 'Making fetch parallel'], answer: 1, explain: 'Workers keep CPU work off the main loop; I/O is already async.' });
quiz.push({ q: 'How does Express recognise error-handling middleware?', options: ['Four parameters (err, req, res, next)', 'It is named errorHandler', 'It returns a Promise', 'It is registered with app.catch'], answer: 0, explain: 'Express checks fn.length === 4.' });
quiz.push({ q: 'In Express 4 an async handler throws. Without a wrapper, what is the most likely result?', options: ['Clean 500 JSON', 'Unhandled rejection that can crash the process, and the request hangs', 'Express retries it', 'Nothing, the error is ignored safely'], answer: 1, explain: 'Express 4 ignores the returned promise. Express 5 forwards rejections to error middleware.' });
quiz.push({ q: 'What should you do inside process.on("uncaughtException")?', options: ['Ignore it and carry on', 'Log, clean up and exit so a supervisor restarts the process', 'Call the function again', 'Raise UV_THREADPOOL_SIZE'], answer: 1, explain: 'State after an uncaught exception is unknown; a controlled restart is safe.' });
quiz.push({ q: 'A recursive process.nextTick that never stops causes…', options: ['A stack overflow', 'Starvation of timers and I/O', 'A faster server', 'Nothing special'], answer: 1, explain: 'The tick queue is drained completely before the loop continues, so other phases never run.' });

/* ---------------- INTERVIEW ---------------- */
interview.push({ q: 'Explain the Node.js event loop phases in order.', level: 'I', a: `<p>One lap visits: <b>timers</b> (due setTimeout/setInterval callbacks), <b>pending callbacks</b> (deferred system callbacks), <b>idle/prepare</b> (internal), <b>poll</b> (retrieve finished I/O and run its callbacks; may block waiting for I/O if nothing else is scheduled), <b>check</b> (setImmediate), and <b>close callbacks</b>. Between every callback Node drains the <code>process.nextTick</code> queue and then the promise microtask queue. The loop is built on libuv and runs on one thread, so a slow callback delays all later work.</p>`, followUps: ['Where does a readFile callback run?', 'What does poll do when nothing is ready?'] });
interview.push({ q: 'What is the difference between process.nextTick, Promise.then and setImmediate?', level: 'I', a: `<p><code>nextTick</code> callbacks run right after the current operation, before any promise callbacks and before the loop continues. Promise callbacks (microtasks) run after the tick queue is empty. <code>setImmediate</code> runs in the check phase of the current lap, after poll. Order after the main script: sync code, nextTick, promises, then timers/immediates. Recursive nextTick or endless promise chains starve I/O. In ES modules, promises run before nextTick because the module code itself runs in a promise job.</p>`, followUps: ['Why are the names confusing?', 'Which would you use to break up a long loop?'] });
interview.push({ q: 'Node is single-threaded, so how can it handle thousands of concurrent connections?', level: 'B', a: `<p>JavaScript runs on one thread but waiting is delegated. Network sockets use the OS readiness APIs (epoll, kqueue, IOCP); the event loop is told when data is ready and runs a small callback. Blocking-style work (file system, DNS lookup, crypto, zlib) goes to the libuv thread pool (4 threads by default) and results return as callbacks. While requests wait for databases or networks the thread serves others. It breaks down when you do CPU-heavy work on the main thread, which then needs worker threads, clustering, or separate services.</p>`, followUps: ['What is the thread pool used for?', 'Give an example of work that would break this model.'] });
interview.push({ q: 'Why does a CPU-intensive loop block all requests and how do you fix it?', level: 'I', a: `<p>The event loop is the same thread that runs your JavaScript. While a callback runs for 400 ms, the loop cannot accept connections, fire timers or write responses, so every request waits (a latency spike for everyone, not just the caller). Fixes from cheapest: chunk the work and yield with <code>setImmediate</code>; move it to a <b>worker thread pool</b>; push it to a job queue and a separate worker service. Detect it with event loop lag metrics (<code>monitorEventLoopDelay</code>) and CPU profiles. <code>async</code> and <code>await</code> alone do not help because they do not move the work off the thread.</p>`, followUps: ['How would you measure event loop lag?', 'How do you choose the pool size?'] });
interview.push({ q: 'What is the libuv thread pool and when does it become a bottleneck?', level: 'A', a: `<p>libuv keeps a pool of worker threads (default 4, max 1024, set with <code>UV_THREADPOOL_SIZE</code> before start) that executes blocking operations: most <code>fs</code> calls, <code>dns.lookup</code>, <code>crypto.pbkdf2/scrypt/randomBytes</code>, async <code>zlib</code>, and native addons that use it. It becomes a bottleneck when many slow pool tasks queue behind each other: for example 100 concurrent file reads delay <code>dns.lookup</code> so outgoing HTTP calls look slow while CPU is idle. Remedies: limit concurrency, raise the size for I/O-bound work, size to core count for CPU-bound work, or use a dedicated worker pool for heavy tasks.</p>`, followUps: ['Which DNS function does not use the pool?', 'Why is bigger not always better?'] });
interview.push({ q: 'What is backpressure in streams and how does Node implement it?', level: 'I', a: `<p>Backpressure lets a slow consumer tell a fast producer to slow down so memory stays bounded. A writable has a buffer and a <code>highWaterMark</code>; <code>write()</code> returns <code>false</code> when the buffer reaches the mark, and emits <code>'drain'</code> once it has emptied. <code>pipe()</code> and <code>pipeline()</code> pause the readable when <code>write()</code> returns false and resume on drain. A manual loop must check the return value and <code>await once(stream, 'drain')</code>. Ignoring it makes memory grow with unflushed data and can crash the process under slow clients.</p>`, followUps: ['Is highWaterMark a hard limit?', 'How does it work across a TCP socket?'] });
interview.push({ q: 'How would you serve or process a 10 GB file with 512 MB RAM?', level: 'I', a: `<p>Use streams: <code>fs.createReadStream</code> piped through transforms (gzip, parsing, line splitting) to the destination with <code>stream.pipeline</code>. Memory is a few highWaterMark-sized buffers (64 KiB each), independent of file size, and the first byte is sent before the whole file is read. Use <code>for await</code> with <code>readline</code> for line processing. Handle errors and client aborts through pipeline callbacks so file descriptors are closed, add Range support for resumable downloads, and limit concurrent transfers so many slow clients cannot exhaust memory.</p>`, followUps: ['How do you handle a client that disconnects?', 'How would you parse a 10 GB JSON file?'] });
interview.push({ q: 'How does EventEmitter work and what are its pitfalls?', level: 'B', a: `<p>An EventEmitter keeps a map from event names to arrays of listeners. <code>on</code> adds one, <code>once</code> adds a self-removing wrapper, <code>off</code> removes by function reference, <code>emit</code> calls listeners synchronously in registration order and returns whether any ran. Pitfalls: emitting <code>'error'</code> without a listener throws; events emitted before a listener exists are lost; listeners that are never removed leak memory (the 11th listener prints a warning); async listeners are not awaited, so their rejections become unhandled unless <code>captureRejections</code> is set; and a throwing listener stops later listeners.</p>`, followUps: ['How would you implement once()?', 'When would you use an async iterator over events?'] });
interview.push({ q: 'Cluster vs worker threads vs child processes: how do you choose?', level: 'A', a: `<p><b>Cluster</b> forks full Node processes that share a port through the primary; use it to scale an I/O-bound server across cores with crash isolation, but memory is not shared. <b>Worker threads</b> run extra JS threads in the same process with message passing and optional SharedArrayBuffer; use them for CPU-heavy tasks inside a request so the main loop stays free, with a pool, not one per request. <b>child_process</b> runs external programs (ffmpeg, Python). Under Kubernetes the first lever is usually more pods with one process each. Shared state (sessions, caches, rate limits, socket rooms) must live in Redis or a database in all multi-process designs.</p>`, followUps: ['How do you do a zero-downtime reload?', 'Why do WebSockets need sticky sessions with round-robin?'] });
interview.push({ q: 'How does middleware work in Express, and how does error middleware differ?', level: 'B', a: `<p>Middleware are functions <code>(req, res, next)</code> registered with <code>app.use</code> or on routes. Express runs them in registration order; each either ends the response or calls <code>next()</code>. Order matters: body parsers before routes, auth before protected routes. Error middleware has four parameters <code>(err, req, res, next)</code>; calling <code>next(err)</code> or throwing synchronously skips normal middleware and goes to it. It must be registered last, should check <code>res.headersSent</code>, log the details, and return a safe message. Express 5 also forwards rejected promises from async handlers.</p>`, followUps: ['What happens if you forget next()?', 'How do you implement compose()?'] });
interview.push({ q: 'Compare Express and Fastify.', level: 'I', a: `<p>Express is a minimal framework built around an ordered middleware list; it is flexible and has the largest ecosystem, but validation, serialization and structure are up to you. Fastify is designed for speed and structure: a radix-tree router, a fixed request lifecycle with hooks (onRequest, preValidation, preHandler, onSend...), plugins with encapsulation, built-in JSON Schema validation (ajv) and schema-based fast serialization, native async/await error handling, and a built-in pino logger. Fastify typically handles substantially more requests per second at the same CPU, and its schemas double as documentation (OpenAPI). Express wins on familiarity; Fastify on performance and consistency for new services.</p>`, followUps: ['What is plugin encapsulation?', 'How would you migrate an Express app gradually?'] });
interview.push({ q: 'How do you handle async errors and unhandled rejections in Node?', level: 'I', a: `<p>Every promise must be awaited, returned or have a catch. Use try/catch around await where you can recover, and let others bubble to a central handler: Express error middleware (wrap async handlers in 4, native in 5) or Fastify's setErrorHandler. Distinguish operational errors (validation, not found, upstream timeout: respond and continue) from programmer errors (bugs: log and restart). Since Node 15 an unhandled rejection crashes the process; add <code>unhandledRejection</code> and <code>uncaughtException</code> handlers that log and shut down gracefully, never swallow. Enforce with the lint rule no-floating-promises, add timeouts with AbortSignal, and retry only idempotent operations with backoff and jitter.</p>`, followUps: ['Why not continue after uncaughtException?', 'How do you implement graceful shutdown?'] });
interview.push({ q: 'What happens during a graceful shutdown in Kubernetes for a Node service?', level: 'A', a: `<p>Kubernetes sends SIGTERM and starts the termination grace period (default 30 s). The app should immediately make its readiness probe fail so the endpoints are removed (often with a short preStop sleep to cover propagation), then call <code>server.close()</code> and close idle keep-alive connections so in-flight requests finish, close database pools and message consumers, flush logs and exit 0. A forced-exit timer slightly below the grace period prevents hanging on stuck connections, because SIGKILL follows. Long-lived WebSockets get a close frame with a reconnect hint. Handle SIGINT too for local runs.</p>`, followUps: ['Why does server.close() sometimes never complete?', 'How does this differ in a cluster setup?'] });
interview.push({ q: 'How would you find why a Node service has latency spikes but low average CPU?', level: 'E', a: `<p>First measure event loop lag (<code>monitorEventLoopDelay</code>) and utilization alongside request latency and GC metrics. If lag spikes with latency, something blocks the loop: capture a CPU profile (<code>--cpu-prof</code> or a flame graph) during a spike and look for wide frames: huge JSON.parse, regex backtracking, sync fs or crypto, cache rebuilds. If lag is low but requests are slow, check the libuv pool queue (many fs/dns/crypto tasks), connection pool waits, and downstream latency. Use <code>--trace-gc</code> to confirm GC pauses. Fix with chunking, worker pools, streaming, limits and timeouts, then alert on p99 lag and add a load test as a regression guard.</p>`, followUps: ['How would you distinguish pool starvation from loop blocking?', 'What alert thresholds would you set?'] });
interview.push({ q: 'How would you stream LLM tokens through a Node backend to browsers safely?', level: 'E', a: `<p>Call the model API with streaming enabled and pipe its body through <code>pipeline</code> to an SSE response so backpressure flows from the slow client back to the upstream read. Tie lifetimes together: on <code>res.close</code> abort the upstream request with an AbortController so generation (and billing) stops. Send proper SSE headers, disable proxy buffering, and heartbeat every ~15 s. Handle errors before the first byte with real status codes (pass through 429 with Retry-After) and mid-stream with an error event. Enforce quotas before the call and settle with usage afterwards, cap concurrent streams per user, set timeouts, and measure time to first token and abort rates.</p>`, followUps: ['How do you resume a dropped stream?', 'Where would you buffer if the client is slow?'] });

registerModule({
  id: 'be07',
  title: 'Node.js Deep Dive',
  lang: 'js',
  intro: `<p>Node.js looks simple (one thread, callbacks, a few <code>npm install</code>s) until production traffic arrives. Then questions appear: <i>why did one request freeze the whole API? why did memory explode on a big download? why did the process crash from a promise nobody awaited?</i> This module opens the engine: the <b>event loop phases</b>, <b>nextTick and microtasks</b>, the <b>libuv thread pool</b>, <b>streams and backpressure</b>, <b>EventEmitter</b>, <b>cluster and worker threads</b>, <b>Express/Fastify middleware</b>, and <b>error handling</b>. Every topic starts with an everyday analogy, gives you a runnable model in pure JavaScript, and an animated visualizer so you can <i>see</i> the queues move.</p>`,
  goals: [
    'Predict the exact output order of <code>setTimeout</code>, <code>setImmediate</code>, <code>process.nextTick</code> and promises, and name the event loop phase for each',
    'Explain why a CPU loop blocks every request and choose between chunking, worker threads and a separate service',
    'Move large files and slow consumers through <code>stream.pipeline</code> with correct backpressure and bounded memory',
    'Write and reason about an EventEmitter (once, off, error event, leaks) and a middleware <code>compose()</code> with error middleware',
    'Scale Node across cores with cluster or worker pools, and know what is NOT shared between them',
    'Handle async errors, unhandled rejections and graceful shutdown the way production services do'
  ],
  prereqs: `Backend modules 1 to 6 (HTTP basics, your first REST API, databases from code) and comfortable JavaScript: functions, closures, promises and <code>async/await</code>.`,
  hours: 12,
  topics: topics,
  practice: practice,
  quiz: quiz,
  interview: interview
});
})();
