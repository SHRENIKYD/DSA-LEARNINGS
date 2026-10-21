(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- shared visualizer helpers (js07) ---------- */
  function cp(code, hlMap, label) {
    return { type: 'code', label: label || 'JavaScript (current line highlighted)', lang: 'js', code: code, hl: hlMap || {} };
  }
  function vp(obj, hlMap, label) {
    var vals = {};
    Object.keys(obj).forEach(function (k) { vals[k] = String(obj[k]); });
    return { type: 'vars', label: label || 'Variables', vals: vals, hl: hlMap || {} };
  }
  function tx(html, label) { return { type: 'text', label: label, html: html }; }
  function fr(narr, parts) { return { narr: narr, parts: parts }; }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function outBox(lines) { return tx(lines.length ? '<pre>' + lines.map(esc).join('\n') + '</pre>' : '<i>(nothing printed yet)</i>', 'Console output'); }
  function items(s) { return String(s).split(',').map(function (x) { return x.trim(); }).filter(function (x) { return x.length; }); }

  /* ================= TOPIC 1: Synchronous vs Asynchronous ================= */
  topics.push({
    title: 'Synchronous vs Asynchronous: One Thread, Many Waiting Jobs',
    analogy: `<p>Picture a <b>restaurant with only one waiter</b>. A <b>synchronous</b> waiter takes your order, walks into the kitchen and <i>stands there</i> until your food is cooked. Every other table waits, angry. An <b>asynchronous</b> waiter takes your order, hands the ticket to the kitchen, and goes off to serve other tables. When the kitchen rings the bell ("order up!"), the waiter comes back and delivers your plate.</p>
<p>JavaScript is that one waiter. The kitchen is the <b>browser or Node.js</b> (timers, network, disk). The bell is a <b>callback</b> or a <b>Promise</b> settling.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> JavaScript runs your code on <b>one main thread</b>: it can only do <b>one thing at a time</b>, line after line. That is <b>synchronous</b> code: each line must finish before the next one starts.</p>
<p>But some jobs are slow and mostly <i>waiting</i>: a timer, a network request, reading a file, a user click. If JavaScript sat and waited, the page would freeze. So the runtime (browser / Node) does the waiting <b>for</b> JavaScript, and when the result is ready it puts a "call me back" job in a queue. That is <b>asynchronous</b> code: start now, finish later, don't block.</p>
${H.table(['', 'Synchronous', 'Asynchronous'], [['Meaning', 'Do it now, wait till done', 'Start it, get notified later'], ['Blocks the thread?', H.c('r', 'Yes'), H.c('g', 'No (the waiting happens outside JS)')], ['Examples', '<code>Math.max</code>, <code>arr.map</code>, a big <code>for</code> loop, <code>JSON.parse</code>', '<code>setTimeout</code>, <code>fetch</code>, <code>fs.readFile</code>, click events'], ['Result arrives', 'As the return value', 'Through a callback or a Promise']])}
<p>🔵 <b>The key rule: run-to-completion.</b> Once a piece of JavaScript starts running, nothing can interrupt it. A callback that is "ready" must <b>wait in a queue</b> until the current code (the whole call stack) is finished. That is why this prints <code>A C B</code>, even with a delay of 0:</p>
<pre>console.log('A');
setTimeout(() =&gt; console.log('B'), 0); // "ring me in 0 ms" — still goes to the queue
console.log('C');</pre>
<p>Three things to remember:</p>
<ul>
<li><b>Async does not mean parallel JavaScript.</b> Your JS still runs one piece at a time. Only the <i>waiting</i> (I/O, timers) happens in parallel, inside the runtime.</li>
<li><b>Total time:</b> 3 synchronous waits of 1 s each take 3 s. Three asynchronous waits started together take about 1 s (the longest one).</li>
<li><b>Blocking is contagious:</b> a 2-second <code>while</code> loop delays <i>every</i> timer, click and network callback by 2 seconds.</li>
</ul>
<p>The exact queue rules (task queue vs microtask queue) are Module JS 8. Here you only need: <b>sync first, then queued callbacks</b>.</p>`,
    clues: ['"Why does <code>setTimeout(fn, 0)</code> not run immediately?" → run-to-completion + queue', '"The page freezes while we process 1 million rows" → blocking the main thread; chunk it or use a Worker', '"Fetch 3 things — how long does it take?" → sequential = sum of times, parallel = max of times', '"Is JavaScript multi-threaded?" → one JS thread per agent; the runtime does I/O in the background', '"Predict the order of these console.logs" → sync lines first, then async callbacks', '"UI unresponsive / long task over 50 ms" → split work, yield to the event loop'],
    code: [{ lang: 'js', run: true, title: 'Sync vs async order + a blocking loop delaying a timer', code: `
// 1) Order: synchronous lines always finish before any queued callback
console.log('A: sync line 1');
setTimeout(function () {
  console.log('B: timer callback (waited in the queue)');
}, 0);
console.log('C: sync line 2');

// 2) Blocking: a busy loop delays a timer that is already "due"
const start = Date.now();
setTimeout(function () {
  // We asked for 10 ms, but the thread was busy for ~200 ms
  console.log('D: 10 ms timer actually fired after', Date.now() - start, 'ms');
}, 10);

while (Date.now() - start < 200) {
  // busy-wait: the ONE thread is stuck here, nothing else can run
}
console.log('E: busy loop done after', Date.now() - start, 'ms');
` }, { lang: 'js', run: true, title: 'Sequential vs parallel waiting (simulated with setTimeout)', code: `
// fakeTask finishes after ms milliseconds and calls done(name)
function fakeTask(name, ms, done) {
  setTimeout(function () { done(name); }, ms);
}

// SEQUENTIAL: start the next task only when the previous one finished
const t0 = Date.now();
fakeTask('toast', 100, function () {
  fakeTask('coffee', 150, function () {
    fakeTask('eggs', 200, function () {
      console.log('sequential total ~', Date.now() - t0, 'ms (100+150+200 = 450)');

      // PARALLEL: start all three at once, count finishes
      const t1 = Date.now();
      let finished = 0;
      ['toast:100', 'coffee:150', 'eggs:200'].forEach(function (job) {
        const parts = job.split(':');
        fakeTask(parts[0], Number(parts[1]), function () {
          finished++;
          if (finished === 3) console.log('parallel total ~', Date.now() - t1, 'ms (max = 200)');
        });
      });
    });
  });
});
` }],
    codeTitle: ['Order + blocking (runnable)', 'Sequential vs parallel timing (runnable)'],
    viz: [{
      title: 'Kitchen timeline: synchronous vs asynchronous',
      input: 'toast 2, coffee 3, eggs 4',
      inputLabel: 'Jobs as "name seconds", comma separated (max 6)',
      gen: function (input) {
        var jobs = items(input).map(function (s) {
          var m = s.split(/\s+/);
          if (m.length !== 2 || isNaN(Number(m[1])) || Number(m[1]) <= 0) throw new Error('Use the format: toast 2, coffee 3, eggs 4');
          return { name: m[0], t: Number(m[1]) };
        });
        if (jobs.length < 2 || jobs.length > 6) throw new Error('Give between 2 and 6 jobs');
        var frames = [], rows = [], clock = 0, sum = 0, max = 0;
        jobs.forEach(function (j) { sum += j.t; max = Math.max(max, j.t); });
        frames.push(fr('We have <b>' + jobs.length + '</b> jobs that are mostly <i>waiting</i> (like a toaster or a network call). First, the <b>synchronous</b> way: one waiter, who stands still until each job is done.', [
          { type: 'bars', label: 'how long each job waits (s)', values: jobs.map(function (j) { return j.t; }), idxLabels: jobs.map(function (j) { return j.name; }) },
          vp({ mode: 'synchronous', clock: '0 s' })
        ]));
        jobs.forEach(function (j, k) {
          rows.push([j.name, clock + ' s', (clock + j.t) + ' s', 'blocked the thread ' + j.t + ' s']);
          clock += j.t;
          var hl = {}; hl[k] = 'cur';
          frames.push(fr('Sync: <b>' + j.name + '</b> starts only after the previous job finished. Clock is now <b>' + clock + ' s</b>. While it waited, <span class="c-r">nothing else could run</span> — no clicks, no other timers.', [
            { type: 'table', label: 'Synchronous timeline', columns: ['job', 'starts', 'ends', 'note'], rows: rows.slice(), hl: hl },
            vp({ mode: 'synchronous', clock: clock + ' s' }, { clock: 'bad' })
          ]));
        });
        frames.push(fr('Sync total = sum of all waits = <b>' + sum + ' s</b>. Now the <b>asynchronous</b> way: the waiter hands every ticket to the kitchen at time 0 and stays free.', [
          vp({ 'sync total': sum + ' s', 'async total': '?' }, { 'sync total': 'bad' })
        ]));
        var arows = jobs.map(function (j) { return [j.name, '0 s', j.t + ' s', 'pending…']; });
        frames.push(fr('Async: all jobs <b>start at 0 s</b>. JavaScript only <i>registered</i> them (microseconds of work) and is free again. The runtime (browser / Node) does the waiting.', [
          { type: 'table', label: 'Asynchronous timeline', columns: ['job', 'starts', 'ready at', 'status'], rows: arows.map(function (r) { return r.slice(); }) }
        ]));
        var order = jobs.map(function (j, i) { return i; }).sort(function (a, b) { return jobs[a].t - jobs[b].t || a - b; });
        order.forEach(function (i) {
          arows[i][3] = 'done → callback queued';
          var hl = {}; hl[i] = 'ok';
          frames.push(fr('At <b>' + jobs[i].t + ' s</b> the kitchen rings the bell for <b>' + jobs[i].name + '</b>. Its callback goes into the queue and runs as soon as the thread is free. Notice jobs finish in order of <b>duration</b>, not in the order we wrote them.', [
            { type: 'table', label: 'Asynchronous timeline', columns: ['job', 'starts', 'ready at', 'status'], rows: arows.map(function (r) { return r.slice(); }), hl: hl }
          ]));
        });
        frames.push(fr('Async total ≈ the <b>longest</b> single wait = <b>' + max + ' s</b> instead of <b>' + sum + ' s</b>. That is why we never block the one JS thread on I/O.', [
          { type: 'bars', label: 'total seconds', values: [sum, max], idxLabels: ['synchronous', 'asynchronous'], hl: { 0: 'bad', 1: 'ok' } },
          vp({ 'sync total': sum + ' s', 'async total': max + ' s', 'saved': (sum - max) + ' s' }, { 'async total': 'ok' })
        ]));
        return frames;
      }
    }, {
      title: 'Why "A C B"? One thread, a call stack and a queue',
      gen: function () {
        var code = "console.log('A');\nsetTimeout(function cb() {\n  console.log('B');\n}, 0);\nconsole.log('C');";
        var out = [];
        function parts(line, stack, timers, queue, o, lineCls) {
          var h = {}; if (line) h[line] = lineCls || 'cur';
          return [cp(code, h), { type: 'stack', label: 'Call stack (JS thread)', items: stack, hl: stack.length ? (function () { var x = {}; x[stack.length - 1] = 'cur'; return x; })() : {} },
            { type: 'set', label: 'Runtime timers (waiting outside JS)', items: timers }, { type: 'queue', label: 'Callback queue', items: queue, frontLabel: 'next', backLabel: 'last' }, outBox(o.slice())];
        }
        var f = [];
        f.push(fr('The script starts. The whole file runs as one job on the <b>call stack</b>.', parts(0, ['main script'], [], [], out)));
        out.push('A');
        f.push(fr('Line 1 runs synchronously and prints <b>A</b>.', parts(1, ['main script', "console.log('A')"], [], [], out, 'ok')));
        f.push(fr('<code>setTimeout</code> does <b>not</b> run <code>cb</code>. It just tells the runtime "start a 0 ms timer and remember cb". That takes microseconds; JS moves on.', parts(2, ['main script', 'setTimeout(cb, 0)'], ['timer 0ms → cb'], [], out)));
        f.push(fr('The timer expires almost instantly, so the runtime moves <code>cb</code> into the <b>callback queue</b>. It must wait: the stack is still busy with the main script.', parts(2, ['main script'], [], ['cb'], out)));
        out.push('C');
        f.push(fr('Line 5 runs and prints <b>C</b>. Run-to-completion: queued callbacks never interrupt running code.', parts(5, ['main script', "console.log('C')"], [], ['cb'], out, 'ok')));
        f.push(fr('The main script is finished; the stack is <b>empty</b>. Now (and only now) the event loop takes the next callback from the queue.', parts(0, [], [], ['cb'], out)));
        out.push('B');
        f.push(fr('<code>cb</code> runs on the stack and prints <b>B</b>. Final output: <b>A C B</b>.', parts(3, ['cb', "console.log('B')"], [], [], out, 'ok')));
        f.push(fr('Takeaway: delay 0 means "<b>as soon as possible after the current code</b>", never "right now". Sync code always wins.', [outBox(out.slice()), tx('Rule: <b>all synchronous code first</b>, then queued callbacks, one at a time.', 'Rule')]));
        return f;
      }
    }],
    examples: [
      { title: 'setTimeout(fn, 0) is "later", not "now"', html: `<p>Even with 0 ms the callback goes to a queue. All synchronous code after it runs first. In browsers, deeply nested timers (5+ levels) are clamped to at least <b>4 ms</b>; in Node a delay of 0 becomes <b>1 ms</b>. So "0" is a wish, not a promise.</p>`, code: { lang: 'js', run: true, code: `
console.log('1 sync');
setTimeout(function () { console.log('3 timer'); }, 0);
for (let i = 0; i < 3; i++) console.log('2 sync loop', i);
// Output: 1 sync, 2 sync loop 0..2, then 3 timer
` } },
      { title: 'Not every callback is async: forEach is synchronous', html: `<p>Passing a function does <b>not</b> make code async. <code>arr.forEach(cb)</code>, <code>map</code>, <code>sort</code> call your callback <b>immediately</b>, before the next line. Only APIs that hand work to the runtime (timers, I/O, events, Promises) call you back later.</p>`, code: { lang: 'js', run: true, code: `
console.log('before');
[1, 2].forEach(function (x) { console.log('forEach callback', x); }); // runs NOW
setTimeout(function () { console.log('timer callback'); }, 0);          // runs LATER
console.log('after');
// before, forEach callback 1, forEach callback 2, after, timer callback
` } },
      { title: 'Sequential vs parallel: 3 × 100 ms', html: `<p>Three independent waits of 100 ms each: one after another = <b>~300 ms</b>; all started together = <b>~100 ms</b>. ${H.table(['strategy', 'starts', 'total'], [['sequential', '0, 100, 200 ms', H.c('r', '~300 ms')], ['parallel', '0, 0, 0 ms', H.c('g', '~100 ms')]])} Use sequential only when a step <b>needs</b> the previous result (e.g. login → then load profile).</p>` },
      { title: 'A heavy loop freezes everything', html: `<p>A loop that takes 2 seconds blocks clicks, animations and every timer. The fix is not "make it async" by wrapping in <code>setTimeout</code> once (that just freezes later) — it is to <b>split</b> the work into chunks and yield between them, or move it to a <b>Web Worker</b> / <b>worker_threads</b>, which really is another thread.</p>` }
    ],
    deepDive: `<p>🟣 <b>Where the "parallel" really happens.</b> In browsers, timers, network and rendering are handled by browser threads; in Node, libuv uses the OS's async I/O (epoll/kqueue/IOCP) for sockets and a <b>thread pool</b> (default 4 threads, <code>UV_THREADPOOL_SIZE</code>) for file system, DNS lookup, crypto and zlib. Your JS callbacks always come back to the single JS thread.</p>
<p><b>Timers are minimums, not guarantees.</b> <code>setTimeout(fn, 100)</code> means "not before 100 ms". If the thread is busy, it fires late. Browsers also throttle timers in background tabs (often to ≥ 1 s) and clamp nested timers to 4 ms. Never use timers for precise timekeeping — compute elapsed time from <code>performance.now()</code>.</p>
<p><b>Long tasks.</b> Browsers report any task over <b>50 ms</b> as a "long task"; it hurts Interaction to Next Paint (INP), a Core Web Vital. Techniques: chunk work and yield (<code>setTimeout</code>, <code>scheduler.yield()</code> in Chromium, <code>requestIdleCallback</code>), or offload CPU work to a Worker. CPU-heavy work is <b>not</b> fixed by async APIs — async only helps with <i>waiting</i>, not with <i>computing</i>.</p>
<p><b>Agents and memory.</b> Each Worker is a separate "agent" with its own stack, heap and event loop; they talk by message passing (structured clone) or share memory with <code>SharedArrayBuffer</code> + <code>Atomics</code>. Inside one agent there are no data races between your callbacks, which is why JS rarely needs locks.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants write async glue code instantly — fetch wrappers, timers, loaders. But they frequently produce code that is <i>accidentally sequential</i> (awaiting in a loop when calls are independent) or <i>accidentally blocking</i> (a giant synchronous JSON transform on the main thread).</p>
<p><b>Use AI as a partner:</b> ask <code>Mark which of these calls depend on each other and which can run in parallel</code>, or <code>Is any part of this function CPU-bound enough to block the UI for more than 50 ms?</code> Ask it to produce a timing table like the one above, then verify with <code>console.time</code>.</p>
<p><b>Where AI goes wrong:</b> claiming <code>setTimeout(fn, 0)</code> runs "immediately", saying async code "runs on another thread", or wrapping CPU work in a Promise and believing it no longer blocks. <b>What you must still own:</b> the mental model of one thread + queues, spotting what is waiting vs computing, and explaining the sum-vs-max timing difference in an interview.</p>`,
    problems: [{
      title: 'Unfreeze the Page: Process a Big List in Chunks',
      level: 'Medium', tags: ['async', 'setTimeout', 'chunking', 'main thread'], companies: ['Google', 'Atlassian', 'Flipkart'],
      statement: `<p>You must run <code>onItem(item, index)</code> for every element of a large array, then call <code>onDone()</code>. A plain loop blocks the thread so timers and clicks cannot run. Write <code>processInChunks(items, chunkSize, onItem, onDone)</code> that handles at most <code>chunkSize</code> items per turn and <b>yields</b> to the event loop between chunks.</p>`,
      constraints: `1 ≤ items.length ≤ 10<sup>7</sup>, 1 ≤ chunkSize. Each item must be processed exactly once, in order. <code>onDone</code> is called exactly once.`,
      example: `<p>items = [1..10], chunkSize = 4, and some other timer was scheduled before. Output:</p><pre>chunk 0..3
sync code finished
tick (another timer got a turn)
chunk 4..7
chunk 8..9
done, sum = 55</pre><p>${H.c('g', 'The other timer ran between chunks')} — the page stayed responsive.</p>`,
      brute: { why: `<p>One big <code>for</code> loop is correct but holds the thread for the whole run. With 10<sup>7</sup> items that can be seconds: clicks, animations and timers are all stuck until it ends.</p>`, code: { lang: 'js', run: true, code: `
function processAllAtOnce(items, onItem, onDone) {
  for (let i = 0; i < items.length; i++) onItem(items[i], i); // blocks until finished
  onDone();
}
setTimeout(() => console.log('tick (had to wait for the whole loop)'), 0);
let sum = 0;
processAllAtOnce(Array.from({ length: 10 }, (_, i) => i + 1), (x) => { sum += x; }, () => console.log('done, sum =', sum));
` } },
      mcq: { q: 'What is the key to keeping the thread responsive?', options: ['Wrap the whole loop in one setTimeout', 'Do a fixed slice of work, then schedule the next slice with setTimeout so other callbacks can run in between', 'Use a faster for loop', 'Use async keyword on the function'], answer: 1, explain: 'One setTimeout just moves the freeze later. Yielding between small slices lets queued callbacks run between them.' },
      hints: [`<p>Hint 1: the thread can only "breathe" when your code returns and the stack is empty. So the function must <b>return</b> after each chunk.</p>`, `<p>Hint 2: keep the position <code>i</code> in a closure variable, and let an inner <code>runChunk</code> function schedule itself again with <code>setTimeout(runChunk, 0)</code>.</p>`, `<p>Hint 3: recipe — end = min(i + chunkSize, n); process i..end-1; if i &lt; n schedule runChunk, else call onDone. Edge cases: empty array → call onDone (once).</p>`],
      tests: { sig: 'string string -> string', fn: '__tA', harness: { js: `function __runChild() {
  const fs = require('fs'), vm = require('vm'), util = require('util');
  process.on('unhandledRejection', () => {});
  process.on('uncaughtException', (e) => { process.stdout.write('@@ERROR uncaught ' + (e && e.stack || e) + '\\n'); process.exit(1); });
  const src = fs.readFileSync(process.env.SC_FILE, 'utf8');
  const body = src.slice(0, src.indexOf('/*@@' + 'END@@*/'));
  let now = 0, seq = 1, timers = [];
  const logs = [];
  const fake = {
    turns: 0, delays: [], uncaught: [],
    setTimeout(fn, ms, ...a) { const t = { id: seq++, at: now + Math.max(0, +ms || 0), fn, a }; timers.push(t); fake.delays.push(Math.max(0, +ms || 0)); return t.id; },
    clearTimeout(id) { timers = timers.filter((t) => t.id !== id); },
    now: () => now,
    pending: () => timers.length,
    reset() { timers = []; logs.length = 0; fake.delays.length = 0; fake.turns = 0; fake.uncaught.length = 0; },
    async flush(n = 60) { for (let i = 0; i < n; i++) await new Promise((r) => queueMicrotask(r)); },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        await fake.flush();
        timers.sort((a, b) => a.at - b.at || a.id - b.id);
        const t = timers[0];
        if (!t || t.at > end) break;
        timers.shift(); now = t.at; fake.turns++;
        try { t.fn(...t.a); } catch (e) { fake.uncaught.push(e && e.message); }
      }
      now = end; await fake.flush();
    }
  };
  const fmt = (x) => (typeof x === 'string' ? x : util.inspect(x, { depth: 3, breakLength: Infinity }));
  const ctx = vm.createContext({ console: { log: (...a) => logs.push({ t: now, s: a.map(fmt).join(' ') }), error() {}, warn() {} }, setTimeout: fake.setTimeout, clearTimeout: fake.clearTimeout, queueMicrotask, __fake: fake, __logs: logs });
  vm.runInContext(body, ctx, { filename: 'main.js' });
  (async () => {
    await fake.flush(100);
    const scenario = vm.runInContext('__scenario', ctx);
    const r = await scenario(process.env.SC_NAME, JSON.parse(process.env.SC_ARGS));
    process.stdout.write('@@RESULT ' + JSON.stringify(r === undefined ? null : r) + '\\n');
    process.exit(0);
  })().catch((e) => { process.stdout.write('@@ERROR ' + (e && e.stack || e) + '\\n'); process.exit(1); });
}
function __tA(name, argsJson) {
  const r = require('child_process').spawnSync(process.execPath, ['-e', '(' + __runChild.toString() + ')()'], {
    env: Object.assign({}, process.env, { SC_FILE: __filename, SC_NAME: name, SC_ARGS: argsJson || 'null' }), encoding: 'utf8', timeout: 20000, maxBuffer: 1 << 26
  });
  const m = /@@RESULT (.*)/.exec(r.stdout || '');
  if (!m) throw new Error('scenario failed: ' + String(r.stdout).slice(-400) + String(r.stderr).slice(-300));
  return JSON.parse(m[1]);
}
function __tD() { let res, rej; const p = new Promise((a, b) => { res = a; rej = b; }); return { p, res, rej }; }
function __tTrack(p) { const s = { st: 'pending' }; p.then((v) => { s.st = 'fulfilled'; s.v = v; }, (e) => { s.st = 'rejected'; s.e = e; }); return s; }
function __tEm(e) { return e !== null && typeof e === 'object' && 'message' in e ? e.name + ':' + e.message : e; }
function __tSum(s) { return s.st === 'fulfilled' ? ['ok', s.v] : s.st === 'rejected' ? ['err', __tEm(s.e)] : ['pending']; }
function __tBegin() { __fake.reset(); }
function __tTick(n) { return __fake.flush(n); }
function __tAdv(ms) { return __fake.advance(ms); }
function __tLater(ms, v, fail) { return new Promise((res, rej) => setTimeout(() => (fail ? rej(new Error(v)) : res(v)), ms)); }
async function __scenario(name, args) {
  const adv = __tAdv; __tBegin();
  const run = async (items, chunk) => {
    const ev = [], stamps = [], idx = []; let doneCalls = 0, doneStamp = null;
    setTimeout(() => ev.push('other'), 0);
    processInChunks(items, chunk, (x, i) => { ev.push(i); stamps.push(__fake.turns); idx.push([x, i]); }, () => { doneCalls++; doneStamp = __fake.turns; ev.push('done'); });
    const afterSync = stamps.length, pendingAfterSync = __fake.pending(), doneAfterSync = doneCalls;
    await adv(0);
    return { afterSync, pendingAfterSync, doneAfterSync, ev, stamps, doneCalls, doneStamp, idx };
  };
  const items = (n) => Array.from({ length: n }, (_, i) => i + 1);
  switch (name) {
    case 'example': { const r = await run(items(10), 4); return { afterSync: r.afterSync, pendingAfterSync: r.pendingAfterSync, ev: r.ev, doneCalls: r.doneCalls }; }
    case 'chunk-1': { const r = await run([10, 20, 30], 1); return { afterSync: r.afterSync, stamps: r.stamps, doneStamp: r.doneStamp, doneCalls: r.doneCalls }; }
    case 'bigger-than-list': { const r = await run([1, 2, 3], 10); return { afterSync: r.afterSync, doneAfterSync: r.doneAfterSync, doneCalls: r.doneCalls, stamps: r.stamps }; }
    case 'exact-multiple': { const r = await run(items(8), 4); return { stamps: r.stamps, doneStamp: r.doneStamp, doneCalls: r.doneCalls }; }
    case 'single': { const r = await run(['only'], 1); return { idx: r.idx, doneAfterSync: r.doneAfterSync, doneCalls: r.doneCalls }; }
    case 'args': { const r = await run(['a', 'b', 'c'], 2); return r.idx; }
    case 'order-once': { const r = await run(items(25), 7); return { sameOrder: r.idx.every(([x, i], k) => x === k + 1 && i === k), count: r.idx.length, doneCalls: r.doneCalls, maxPerTurn: Math.max(...Object.values(r.stamps.reduce((m, t) => { m[t] = (m[t] || 0) + 1; return m; }, {}))) }; }
    case 'big': {
      const n = 10000000; const arr = new Array(n); for (let i = 0; i < n; i++) arr[i] = i;
      const per = {}; let next = 0, ordered = true, doneCalls = 0;
      processInChunks(arr, 1000000, (x, i) => { if (i !== next || x !== i) ordered = false; next++; per[__fake.turns] = (per[__fake.turns] || 0) + 1; }, () => { doneCalls++; });
      await adv(0);
      return { count: next, ordered, turns: Object.keys(per).length, maxPerTurn: Math.max(...Object.values(per)), doneCalls };
    }
    case 'two-lists': { const a = [], b = []; processInChunks([1, 2, 3, 4], 2, (x) => a.push(x), () => a.push('A')); processInChunks([5, 6, 7, 8], 2, (x) => b.push(x), () => b.push('B')); await adv(0); return [a, b]; }
  }
}
/*@@END@@*/` }, cases: [
        [["example","null"],{"afterSync":4,"pendingAfterSync":2,"ev":[0,1,2,3,"other",4,5,6,7,8,9,"done"],"doneCalls":1}],
        [["chunk-1","null"],{"afterSync":1,"stamps":[0,2,3],"doneStamp":3,"doneCalls":1}],
        [["bigger-than-list","null"],{"afterSync":3,"doneAfterSync":1,"doneCalls":1,"stamps":[0,0,0]}],
        [["exact-multiple","null"],{"stamps":[0,0,0,0,2,2,2,2],"doneStamp":2,"doneCalls":1}],
        [["single","null"],{"idx":[["only",0]],"doneAfterSync":1,"doneCalls":1}],
        [["args","null"],[["a",0],["b",1],["c",2]]],
        [["order-once","null"],{"sameOrder":true,"count":25,"doneCalls":1,"maxPerTurn":7}],
        [["big","null"],{"count":10000000,"ordered":true,"turns":10,"maxPerTurn":1000000,"doneCalls":1}],
        [["two-lists","null"],[[1,2,3,4,"A"],[5,6,7,8,"B"]]]
      ] },
      solution: {
        approach: `<p>Turn one long job into many short jobs. Each <code>runChunk</code> call processes up to <code>chunkSize</code> items and then <b>returns</b>, after queuing the next chunk. Between chunks, any other queued callback (a click, a timer) gets its turn.</p>`,
        code: { lang: 'js', run: true, code: `
function processInChunks(items, chunkSize, onItem, onDone) {
  let i = 0; // position survives between chunks thanks to the closure
  function runChunk() {
    const end = Math.min(i + chunkSize, items.length);
    if (i < end) console.log('chunk ' + i + '..' + (end - 1));
    for (; i < end; i++) onItem(items[i], i);
    if (i < items.length) setTimeout(runChunk, 0); // yield, then continue
    else onDone();                                  // exactly once
  }
  runChunk();
}

setTimeout(() => console.log('tick (another timer got a turn)'), 0);
let sum = 0;
processInChunks([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 4, (x) => { sum += x; }, () => console.log('done, sum =', sum));
console.log('sync code finished');
` },
        dry: { head: ['turn', 'what runs', 'i after', 'queue after'], rows: [['1 (main script)', 'chunk 0..3', '4', 'tick, runChunk'], ['1 (cont.)', "log 'sync code finished'", '4', 'tick, runChunk'], ['2', 'tick timer', '4', 'runChunk'], ['3', 'chunk 4..7', '8', 'runChunk'], ['4', 'chunk 8..9 → onDone', '10', '(empty)']] },
        complexity: `<p>O(n) total work, same as the loop. Each turn does O(chunkSize). Extra latency ≈ (n / chunkSize) × timer delay, so pick chunks of a few milliseconds of work.</p>`,
        followUps: ['Choose chunk size by time (process until 8 ms have passed) instead of by count.', 'Return a Promise that resolves when done instead of taking onDone.', 'When should you use a Web Worker instead?']
      }
    }]
  });

  /* ================= TOPIC 2: Callbacks & Callback Hell ================= */
  topics.push({
    title: 'Callbacks, Error-First Style & Callback Hell',
    analogy: `<p>A <b>callback</b> is like leaving your phone number at a busy restaurant: "call me when a table is free". You go do other things; they call you later.</p>
<p><b>Callback hell</b> is when every call leads to another call: "when the table is free, call me; then I'll call the cab; when the cab arrives, call me; then I'll call the babysitter…" — a stack of nested promises-to-call that is hard to follow, and if one person forgets to call, nobody notices. Worse, you gave them your number: they might call <b>twice</b>, or <b>never</b>. That is <b>inversion of control</b>.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A <b>callback</b> is just a function you pass to another function, so it can be called later. Before Promises (2015), it was the <i>only</i> way to get an async result:</p>
<pre>setTimeout(function () { console.log('later'); }, 1000);
button.addEventListener('click', function () { console.log('clicked'); });</pre>
<p>🔵 <b>Node's error-first convention.</b> Node.js core APIs call your callback as <code>callback(err, result)</code>: if something failed, <code>err</code> is an Error and <code>result</code> is missing; on success <code>err</code> is <code>null</code>. You <b>must check err first</b> in every callback.</p>
<pre>fs.readFile('config.json', 'utf8', function (err, text) {
  if (err) return console.error('failed:', err.message); // handle + stop
  console.log('got', text.length, 'chars');
});</pre>
<p><b>Callback hell</b> ("pyramid of doom") appears when step 2 needs step 1's result, step 3 needs step 2's, and so on. Each step nests one level deeper:</p>
<pre>login(user, function (err, session) {
  if (err) return fail(err);
  getProfile(session, function (err, profile) {
    if (err) return fail(err);
    getOrders(profile, function (err, orders) {
      if (err) return fail(err);
      render(orders);
    });
  });
});</pre>
${H.table(['Problem', 'What goes wrong'], [['Readability', 'Code drifts right; the order of steps is hard to see'], ['Error handling', 'You repeat <code>if (err)</code> at every level; forget one and errors vanish'], ['Inversion of control', 'The library decides when/how often to call you: maybe twice, maybe never, maybe synchronously'], ['Composition', 'Running things in parallel, with timeouts or retries, needs manual counters and flags'], ['try/catch', 'Does not catch errors thrown later inside the callback (different turn of the event loop)']])}
<p><b>Fixes, old to new:</b> name the functions (flatten), libraries like <code>async.js</code>, then <b>Promises</b> (chain instead of nest), then <b>async/await</b> (looks like sync code). <code>util.promisify</code> and <code>fs/promises</code> turn callback APIs into Promise APIs.</p>`,
    clues: ['"Nested callbacks / pyramid of doom / hard to read async code" → callback hell; flatten with Promises', '"Implement <code>promisify</code>" → wrap an error-first function in <code>new Promise</code>', '"<code>callback(err, data)</code>" → Node error-first convention; check err first', '"The callback ran twice / never ran" → inversion of control; guard with <code>once</code>', '"Sometimes sync, sometimes async" → Zalgo; always call back asynchronously', '"Wait for N callbacks to finish" → counter pattern (or <code>Promise.all</code>)'],
    code: [{ lang: 'js', run: true, title: 'Error-first callbacks: a fake async database', code: `
// A fake "database" call using the Node error-first convention
function getUser(id, callback) {
  setTimeout(function () {
    if (id <= 0) callback(new Error('invalid id ' + id)); // failure: err set
    else callback(null, { id: id, name: 'user' + id });   // success: err = null
  }, 50);
}

function handle(err, user) {
  if (err) {                       // ALWAYS check err first
    console.log('error:', err.message);
    return;                        // and stop
  }
  console.log('loaded', user.name);
}

getUser(7, handle);   // loaded user7
getUser(-1, handle);  // error: invalid id -1
` }, { lang: 'js', run: true, title: 'Pyramid of doom vs promise chain (same three steps)', code: `
// --- callback versions ---
function login(name, cb)     { setTimeout(() => cb(null, { token: 'T-' + name }), 30); }
function getProfile(s, cb)   { setTimeout(() => cb(null, { id: 42, token: s.token }), 30); }
function getOrders(p, cb)    { setTimeout(() => cb(null, ['book', 'pen']), 30); }

login('asha', function (err, session) {
  if (err) return console.log('fail', err);
  getProfile(session, function (err, profile) {
    if (err) return console.log('fail', err);
    getOrders(profile, function (err, orders) {
      if (err) return console.log('fail', err);
      console.log('pyramid result:', orders.join(', '));
    });
  });
});

// --- promise versions (wrap once, then chain flat) ---
const toPromise = (fn) => (arg) => new Promise((resolve, reject) =>
  fn(arg, (err, value) => (err ? reject(err) : resolve(value))));

const loginP = toPromise(login), getProfileP = toPromise(getProfile), getOrdersP = toPromise(getOrders);

loginP('asha')
  .then(getProfileP)          // each step returns a promise → chain waits for it
  .then(getOrdersP)
  .then((orders) => console.log('chain result:', orders.join(', ')))
  .catch((err) => console.log('one catch for every step:', err));
` }],
    codeTitle: ['Error-first callbacks (runnable)', 'Pyramid vs chain (runnable)'],
    viz: {
      title: 'Callback pyramid vs promise chain',
      input: 'login, getProfile, getOrders, getInvoice',
      inputLabel: 'Steps that depend on each other (2 to 6, comma separated)',
      gen: function (input) {
        var steps = items(input);
        if (steps.length < 2 || steps.length > 6) throw new Error('Give 2 to 6 step names, e.g. login, getProfile, getOrders');
        steps.forEach(function (s) { if (!/^[A-Za-z_$][\w$]*$/.test(s)) throw new Error('Step names must be simple identifiers like getOrders'); });
        // Build pyramid code
        var lines = [], stepLine = [], ind = '';
        steps.forEach(function (s, k) {
          var arg = k === 0 ? 'input' : 'r' + (k - 1);
          lines.push(ind + s + '(' + arg + ', function (err, r' + k + ') {');
          stepLine.push(lines.length);
          lines.push(ind + '  if (err) return fail(err);');
          ind += '  ';
        });
        lines.push(ind + 'done(r' + (steps.length - 1) + ');');
        var doneLine = lines.length;
        for (var k = steps.length - 1; k >= 0; k--) { ind = ind.slice(2); lines.push(ind + '});'); }
        var pyr = lines.join('\n');
        // Build chain code
        var cl = [steps[0] + 'P(input)'];
        for (var j = 1; j < steps.length; j++) cl.push('  .then(' + steps[j] + 'P)');
        cl.push('  .then(done)');
        cl.push('  .catch(fail);  // ONE place for every error');
        var chain = cl.join('\n');
        var frames = [];
        frames.push(fr('We have <b>' + steps.length + '</b> steps; each needs the previous result. With plain callbacks, every step must be written <b>inside</b> the previous step\'s callback.', [cp(pyr, {}, 'Callback version'), { type: 'bars', label: 'indent depth per step', values: steps.map(function () { return 0; }), idxLabels: steps }]));
        var depth = [];
        steps.forEach(function (s, k) {
          var h = {}; h[stepLine[k]] = 'cur'; h[stepLine[k] + 1] = 'bad';
          depth.push(k + 1);
          var d = depth.slice(); while (d.length < steps.length) d.push(0);
          frames.push(fr('Step <b>' + s + '</b> runs at nesting level <b>' + (k + 1) + '</b>. Its result <code>r' + k + '</code> only exists inside this callback, so the next step must go one level deeper. Red line = a repeated <code>if (err)</code> check you must never forget.', [cp(pyr, h, 'Callback version'), { type: 'bars', label: 'indent depth per step', values: d, idxLabels: steps, hl: (function () { var x = {}; x[k] = 'cur'; return x; })() }]));
        });
        var hd = {}; hd[doneLine] = 'ok';
        frames.push(fr('Finally <code>done</code> runs at depth <b>' + steps.length + '</b>, followed by <b>' + steps.length + '</b> closing <code>});</code> lines. We wrote <b>' + steps.length + '</b> separate error checks. Adding a parallel step, timeout or retry here gets ugly fast.', [cp(pyr, hd, 'Callback version'), vp({ 'nesting depth': steps.length, 'error checks': steps.length, 'lines': lines.length }, { 'error checks': 'bad' })]));
        frames.push(fr('Now the <b>Promise</b> version: wrap each API once (<code>' + steps[0] + 'P</code> = promisified ' + steps[0] + '), then <b>chain</b>. Every step sits at the same depth.', [cp(chain, {}, 'Promise chain version')]));
        for (var q = 0; q < steps.length; q++) {
          var hh = {}; hh[q + 1] = 'cur';
          frames.push(fr('<b>' + steps[q] + 'P</b> returns a promise; <code>.then</code> waits for it and passes the value to the next line. Depth stays <b>1</b>.', [cp(chain, hh, 'Promise chain version'), { type: 'bars', label: 'indent depth per step', values: steps.map(function () { return 1; }), idxLabels: steps, hl: (function () { var x = {}; x[q] = 'ok'; return x; })() }]));
        }
        var hc = {}; hc[cl.length] = 'ok';
        frames.push(fr('If <b>any</b> step fails, the chain skips straight to the single <code>.catch</code>. Same behaviour, flat shape, one error handler.', [cp(chain, hc, 'Promise chain version'), { type: 'table', label: 'Comparison', columns: ['', 'callbacks', 'promise chain'], rows: [['max depth', String(steps.length), '1'], ['error checks', String(steps.length), '1'], ['lines', String(lines.length), String(cl.length)]] }]));
        return frames;
      }
    },
    examples: [
      { title: 'Guarding against "called twice": once()', html: `<p>A buggy library might call your callback twice (e.g. on <code>error</code> and then on <code>end</code>). A tiny <code>once</code> wrapper makes later calls no-ops — this is one reason Promises were invented: a promise can only settle <b>once</b>, by design.</p>`, code: { lang: 'js', run: true, code: `
function once(fn) {
  let called = false;
  return function (...args) {
    if (called) return;       // ignore every call after the first
    called = true;
    return fn.apply(this, args);
  };
}
const cb = once((err, v) => console.log('callback got', err, v));
cb(null, 1);  // runs
cb(null, 2);  // ignored
` } },
      { title: 'Releasing Zalgo: sometimes-sync callbacks', html: `<p>A function that calls back <b>synchronously</b> on a cache hit but <b>asynchronously</b> on a miss makes order unpredictable ("releasing Zalgo"). Rule: an async API must <b>always</b> be async. Fix with <code>queueMicrotask</code> / <code>process.nextTick</code> / <code>setTimeout</code> on the fast path.</p>`, code: { lang: 'js', run: true, code: `
const cache = new Map([['a', 1]]);
function getBad(key, cb) {
  if (cache.has(key)) cb(cache.get(key));            // SYNC on hit
  else setTimeout(() => cb(99), 10);                 // ASYNC on miss
}
function getGood(key, cb) {
  if (cache.has(key)) queueMicrotask(() => cb(cache.get(key))); // always async
  else setTimeout(() => cb(99), 10);
}
console.log('bad: before'); getBad('a', (v) => console.log('bad: value', v)); console.log('bad: after');
console.log('good: before'); getGood('a', (v) => console.log('good: value', v)); console.log('good: after');
` } },
      { title: 'Waiting for N parallel callbacks (counter pattern)', html: `<p>Before <code>Promise.all</code>, people counted finished callbacks. Results are stored <b>by index</b> so the output order matches the input order, not the finish order. The first error wins and later results are ignored.</p>`, code: { lang: 'js', run: true, code: `
function parallel(tasks, done) {
  const results = new Array(tasks.length);
  let left = tasks.length, failed = false;
  if (left === 0) return done(null, []);
  tasks.forEach(function (task, i) {
    task(function (err, value) {
      if (failed) return;                       // already reported an error
      if (err) { failed = true; return done(err); }
      results[i] = value;                       // keep input order
      if (--left === 0) done(null, results);
    });
  });
}
const job = (v, ms) => (cb) => setTimeout(() => cb(null, v), ms);
parallel([job('slow', 60), job('fast', 10), job('mid', 30)], (err, r) => console.log(err, r));
// null [ 'slow', 'fast', 'mid' ]
` } },
      { title: 'try/catch cannot catch a later callback error', html: `<p><code>try</code> only protects code running <b>right now</b> on the stack. A callback runs in a later turn, after the <code>try</code> block is long gone, so a throw there is uncaught. That is why error-first callbacks <b>pass</b> errors as arguments instead of throwing.</p>`, code: { lang: 'js', run: true, code: `
try {
  setTimeout(function () {
    try { JSON.parse('{bad json'); }                   // must catch INSIDE the callback
    catch (e) { console.log('caught inside callback:', e.name); }
  }, 0);
} catch (e) {
  console.log('outer catch never runs for the callback');
}
console.log('outer try finished long before the callback runs');
` } }
    ],
    deepDive: `<p>🟣 <b>Inversion of control, precisely.</b> When you hand a callback to third-party code you trust it to: call it at least once, at most once, not too early (synchronously), with the right arguments, and to pass errors instead of swallowing them. Promises restore control: <i>you</i> receive an object with a guaranteed contract — settles once, handlers always run asynchronously (as microtasks), and errors propagate along the chain.</p>
<p><b>Node internals.</b> <code>util.promisify(fn)</code> wraps error-first functions; it respects a custom <code>fn[util.promisify.custom]</code> (e.g. <code>setTimeout</code>'s promisified form, now also available as <code>timers/promises</code>). Callbacks with multiple success values (like <code>dns.lookup</code>'s address + family) are special-cased. The reverse, <code>util.callbackify</code>, turns async functions back into error-first ones and wraps falsy rejection reasons in an Error.</p>
<p><b>Event emitters are different.</b> Callbacks that fire <i>many times</i> (clicks, stream data) should stay as listeners/streams or async iterators — a Promise represents <b>one</b> future value. Converting <code>'data'</code> events to a single promise loses data; use <code>for await (const chunk of stream)</code> instead.</p>
<p><b>Error-first pitfalls.</b> Throwing inside a callback crashes Node (uncaught exception) because nobody up the stack is waiting. Calling back with a string instead of an Error loses the stack trace. And "calling back inside try" can cause a callback to be called twice if the callback itself throws and your catch calls it again with the error — call back <b>outside</b> the try.</p>`,
    aiEra: `<p><b>What AI changes:</b> modernising legacy callback code is a perfect AI task: "convert this <code>async.waterfall</code> to async/await" usually works in seconds. Most new code you will see uses Promises, but interviews still ask you to <b>implement promisify</b> and explain callback hell, because it proves you understand what Promises fix.</p>
<p><b>Use AI as a partner:</b> <code>Find every callback in this file that could be called twice or never</code>, <code>List callback APIs here that have a promise version (fs/promises, timers/promises, stream/promises)</code>.</p>
<p><b>Where AI goes wrong:</b> converting an event listener (fires many times) into a promise (resolves once); dropping the <code>if (err)</code> branch while refactoring; promisifying a method and losing <code>this</code> (forgets <code>.bind(obj)</code>); and making a sometimes-sync API. <b>What you must still own:</b> knowing which callbacks are one-shot vs repeating, keeping error paths intact, and recognising inversion-of-control bugs in review.</p>`,
    problems: [{
      title: 'Implement promisify',
      level: 'Medium', tags: ['callbacks', 'promises', 'polyfill'], companies: ['Uber', 'Microsoft', 'Swiggy'],
      statement: `<p>Write <code>promisify(fn)</code>. <code>fn</code> takes some arguments and, as its <b>last</b> argument, an error-first callback <code>(err, value)</code>. Return a new function that takes the same arguments (without the callback) and returns a <b>Promise</b> that resolves with <code>value</code> or rejects with <code>err</code>. It must keep <code>this</code> so methods work.</p>`,
      constraints: `fn calls its callback once. Must work for any number of arguments and preserve <code>this</code> when called as a method.`,
      example: `<pre>function add(a, b, cb) { setTimeout(() =&gt; cb(null, a + b), 10); }
const addP = promisify(add);
addP(2, 3).then(console.log);   // 5</pre><p>${H.c('g', 'resolve(5)')} because err was null; if the callback got an Error, the promise ${H.c('r', 'rejects')} with it.</p>`,
      brute: { why: `<p>Writing a hand-made wrapper for every single function works, but it is repetitive and easy to get wrong (forgetting reject, losing <code>this</code>). We want one generic helper.</p>`, code: { lang: 'js', run: true, code: `
function add(a, b, cb) { setTimeout(() => cb(null, a + b), 10); }
// One-off manual wrapper: fine for one function, repeated for every API
function addP(a, b) {
  return new Promise((resolve, reject) => {
    add(a, b, (err, v) => (err ? reject(err) : resolve(v)));
  });
}
addP(2, 3).then((v) => console.log('manual wrapper:', v));
` } },
      mcq: { q: 'Inside promisify, where should the callback go when calling fn?', options: ['As the first argument', 'Appended after all the caller\'s arguments', 'It is not needed, fn returns a promise', 'Bound as this'], answer: 1, explain: 'Error-first APIs expect the callback LAST: fn.call(this, ...args, callback).' },
      hints: [`<p>Hint 1: promisify returns a <b>function</b>; when that function is called, it returns <code>new Promise(...)</code>.</p>`, `<p>Hint 2: inside the executor call <code>fn.call(this, ...args, (err, value) =&gt; ...)</code>. Use a regular <code>function</code> for the returned wrapper so it has its own <code>this</code>, and an arrow for the executor so it reuses it.</p>`, `<p>Hint 3: in the callback: if err → reject(err), else resolve(value). Also wrap the call in try/catch? Not needed: a throw inside the executor already rejects the promise automatically.</p>`],
      tests: { sig: 'string string -> string', fn: '__tA', harness: { js: `function __runChild() {
  const fs = require('fs'), vm = require('vm'), util = require('util');
  process.on('unhandledRejection', () => {});
  process.on('uncaughtException', (e) => { process.stdout.write('@@ERROR uncaught ' + (e && e.stack || e) + '\\n'); process.exit(1); });
  const src = fs.readFileSync(process.env.SC_FILE, 'utf8');
  const body = src.slice(0, src.indexOf('/*@@' + 'END@@*/'));
  let now = 0, seq = 1, timers = [];
  const logs = [];
  const fake = {
    turns: 0, delays: [], uncaught: [],
    setTimeout(fn, ms, ...a) { const t = { id: seq++, at: now + Math.max(0, +ms || 0), fn, a }; timers.push(t); fake.delays.push(Math.max(0, +ms || 0)); return t.id; },
    clearTimeout(id) { timers = timers.filter((t) => t.id !== id); },
    now: () => now,
    pending: () => timers.length,
    reset() { timers = []; logs.length = 0; fake.delays.length = 0; fake.turns = 0; fake.uncaught.length = 0; },
    async flush(n = 60) { for (let i = 0; i < n; i++) await new Promise((r) => queueMicrotask(r)); },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        await fake.flush();
        timers.sort((a, b) => a.at - b.at || a.id - b.id);
        const t = timers[0];
        if (!t || t.at > end) break;
        timers.shift(); now = t.at; fake.turns++;
        try { t.fn(...t.a); } catch (e) { fake.uncaught.push(e && e.message); }
      }
      now = end; await fake.flush();
    }
  };
  const fmt = (x) => (typeof x === 'string' ? x : util.inspect(x, { depth: 3, breakLength: Infinity }));
  const ctx = vm.createContext({ console: { log: (...a) => logs.push({ t: now, s: a.map(fmt).join(' ') }), error() {}, warn() {} }, setTimeout: fake.setTimeout, clearTimeout: fake.clearTimeout, queueMicrotask, __fake: fake, __logs: logs });
  vm.runInContext(body, ctx, { filename: 'main.js' });
  (async () => {
    await fake.flush(100);
    const scenario = vm.runInContext('__scenario', ctx);
    const r = await scenario(process.env.SC_NAME, JSON.parse(process.env.SC_ARGS));
    process.stdout.write('@@RESULT ' + JSON.stringify(r === undefined ? null : r) + '\\n');
    process.exit(0);
  })().catch((e) => { process.stdout.write('@@ERROR ' + (e && e.stack || e) + '\\n'); process.exit(1); });
}
function __tA(name, argsJson) {
  const r = require('child_process').spawnSync(process.execPath, ['-e', '(' + __runChild.toString() + ')()'], {
    env: Object.assign({}, process.env, { SC_FILE: __filename, SC_NAME: name, SC_ARGS: argsJson || 'null' }), encoding: 'utf8', timeout: 20000, maxBuffer: 1 << 26
  });
  const m = /@@RESULT (.*)/.exec(r.stdout || '');
  if (!m) throw new Error('scenario failed: ' + String(r.stdout).slice(-400) + String(r.stderr).slice(-300));
  return JSON.parse(m[1]);
}
function __tD() { let res, rej; const p = new Promise((a, b) => { res = a; rej = b; }); return { p, res, rej }; }
function __tTrack(p) { const s = { st: 'pending' }; p.then((v) => { s.st = 'fulfilled'; s.v = v; }, (e) => { s.st = 'rejected'; s.e = e; }); return s; }
function __tEm(e) { return e !== null && typeof e === 'object' && 'message' in e ? e.name + ':' + e.message : e; }
function __tSum(s) { return s.st === 'fulfilled' ? ['ok', s.v] : s.st === 'rejected' ? ['err', __tEm(s.e)] : ['pending']; }
function __tBegin() { __fake.reset(); }
function __tTick(n) { return __fake.flush(n); }
function __tAdv(ms) { return __fake.advance(ms); }
function __tLater(ms, v, fail) { return new Promise((res, rej) => setTimeout(() => (fail ? rej(new Error(v)) : res(v)), ms)); }
async function __scenario(name) {
  const adv = __tAdv, track = __tTrack, sum = __tSum; __tBegin();
  switch (name) {
    case 'add': { const add = (a, b, cb) => setTimeout(() => cb(null, a + b), 10); const s = track(promisify(add)(2, 3)); await adv(9); const mid = s.st; await adv(1); return { mid, end: sum(s) }; }
    case 'error': { const failing = (cb) => setTimeout(() => cb(new Error('disk full')), 10); const s = track(promisify(failing)()); await adv(10); return sum(s); }
    case 'method-this': { const counter = { n: 10, incLater(by, cb) { setTimeout(() => cb(null, (this.n += by)), 10); } }; counter.incP = promisify(counter.incLater); const s = track(counter.incP(5)); await adv(10); return [sum(s), counter.n]; }
    case 'sync-throw': { const s = track(promisify(() => { throw new Error('sync'); })()); await __tTick(); return sum(s); }
    case 'zero-args': { const s = track(promisify((cb) => cb(null, 'z'))()); await __tTick(); return sum(s); }
    case 'many-args': { const s = track(promisify((...a) => { const cb = a.pop(); cb(null, a.reduce((x, y) => x + y, 0)); })(1, 2, 3, 4, 5)); await __tTick(); return sum(s); }
    case 'undefined-value': { const s = track(promisify((cb) => cb(null))()); await __tTick(); return sum(s); }
    case 'callback-twice': { const s = track(promisify((cb) => { cb(null, 1); cb(null, 2); cb(new Error('late')); })()); await __tTick(); return sum(s); }
    case 'falsy-error': { const s = track(promisify((cb) => cb(0, 'v'))()); await __tTick(); return sum(s); }
    case 'args-forwarded': { const s = track(promisify((a, b, cb) => cb(null, [a, b, typeof cb]))(1, 2)); await __tTick(); return sum(s); }
    case 'same-error-object': { const e = new Error('same'); let caught; promisify((cb) => cb(e))().catch((x) => { caught = x; }); await __tTick(); return caught === e; }
    case 'independent': { const f = promisify((v, d, cb) => setTimeout(() => cb(null, v), d)); const a = track(f('slow', 20)), b = track(f('fast', 5)); await adv(5); const mid = [a.st, b.st]; await adv(15); return [mid, sum(a), sum(b)]; }
    case 'returns-promise': { const p = promisify((cb) => cb(null))(); return [p instanceof Promise, typeof p.then]; }
    case 'reuse-wrapper': { const f = promisify((x, cb) => cb(null, x * 2)); const r = []; for (let i = 1; i <= 3; i++) r.push(await f(i)); return r; }
    case 'error-object-props': { const s = track(promisify((cb) => cb(Object.assign(new Error('E'), { code: 'ENOENT' })))()); await __tTick(); return [sum(s), s.e.code]; }
  }
}
/*@@END@@*/` }, cases: [
        [["add","null"],{"mid":"pending","end":["ok",5]}],
        [["error","null"],["err","Error:disk full"]],
        [["method-this","null"],[["ok",15],15]],
        [["sync-throw","null"],["err","Error:sync"]],
        [["zero-args","null"],["ok","z"]],
        [["many-args","null"],["ok",15]],
        [["undefined-value","null"],["ok",null]],
        [["callback-twice","null"],["ok",1]],
        [["falsy-error","null"],["ok","v"]],
        [["args-forwarded","null"],["ok",[1,2,"function"]]],
        [["same-error-object","null"],true],
        [["independent","null"],[["pending","fulfilled"],["ok","slow"],["ok","fast"]]],
        [["returns-promise","null"],[true,"function"]],
        [["reuse-wrapper","null"],[2,4,6]],
        [["error-object-props","null"],[["err","Error:E"],"ENOENT"]]
      ] },
      solution: {
        approach: `<p>Return a wrapper that builds a Promise. The executor calls the original function with the caller's arguments plus one extra callback that translates <code>(err, value)</code> into <code>reject</code>/<code>resolve</code>. Because a promise settles only once, a buggy double callback is also harmless.</p>`,
        code: { lang: 'js', run: true, code: `
function promisify(fn) {
  return function (...args) {              // regular function: keeps the caller's this
    return new Promise((resolve, reject) => {
      // arrow executor → same this as the wrapper
      fn.call(this, ...args, (err, value) => {
        if (err) reject(err);
        else resolve(value);
      });
    });                                    // a sync throw in fn also rejects (executor rule)
  };
}

// 1) plain function
function add(a, b, cb) { setTimeout(() => cb(null, a + b), 10); }
promisify(add)(2, 3).then((v) => console.log('add:', v));

// 2) error path
function failing(cb) { setTimeout(() => cb(new Error('disk full')), 10); }
promisify(failing)().catch((e) => console.log('rejected with:', e.message));

// 3) method that needs this
const counter = {
  n: 10,
  incLater(by, cb) { setTimeout(() => cb(null, (this.n += by)), 10); }
};
counter.incP = promisify(counter.incLater);
counter.incP(5).then((v) => console.log('method this kept:', v));
` },
        dry: { head: ['step', 'call', 'callback receives', 'promise'], rows: [['1', 'addP(2, 3)', '—', 'pending'], ['2', 'add(2, 3, cb) runs, timer set', '—', 'pending'], ['3', 'after 10 ms', '(null, 5)', H.c('g', 'fulfilled 5')], ['4', 'failing() after 10 ms', "(Error('disk full'))", H.c('r', 'rejected')]] },
        complexity: `<p>O(1) overhead per call: one Promise and one closure.</p>`,
        followUps: ['Support callbacks with several success values (resolve with an array).', 'Write the reverse: callbackify(asyncFn).', 'How does Node\'s util.promisify.custom symbol let a function provide its own promise version?']
      }
    }]
  });

  /* ================= TOPIC 3: Promise States & Creating Promises ================= */
  topics.push({
    title: 'Promise States: pending → fulfilled / rejected (Settled Once, Forever)',
    analogy: `<p>At a food court you pay and get a <b>buzzer</b>. Right now the buzzer is <b>pending</b> — no food yet, but a promise of food. Later it either buzzes green, "<b>your order is ready</b>" (<b>fulfilled</b>, with your burger as the value) or red, "<b>sorry, sold out</b>" (<b>rejected</b>, with a reason). Once it buzzes, it never changes its mind: a ready burger does not become sold-out later.</p>
<p>And you can hand the buzzer to a friend, attach notes like "when it buzzes, bring me ketchup" — even <i>after</i> it buzzed, the note still gets handled.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> A <b>Promise</b> is an object that stands for a value you will get <b>later</b>. It is always in one of three states:</p>
${H.table(['State', 'Meaning', 'Holds'], [[H.c('y', 'pending'), 'still waiting', 'nothing yet'], [H.c('g', 'fulfilled'), 'it worked', 'a <b>value</b>'], [H.c('r', 'rejected'), 'it failed', 'a <b>reason</b> (usually an Error)']])}
<p>"<b>Settled</b>" means fulfilled <i>or</i> rejected. A promise settles <b>at most once</b>; after that its state and value are frozen.</p>
<p>🔵 <b>Creating one.</b> You give <code>new Promise</code> an <b>executor</b> function. It runs <b>immediately and synchronously</b> and receives two functions, <code>resolve</code> and <code>reject</code>:</p>
<pre>const p = new Promise(function (resolve, reject) {
  // start some async work here
  setTimeout(function () { resolve('burger'); }, 1000);
});
p.then(function (food) { console.log('got', food); });</pre>
<p>Rules of the executor:</p>
<ul>
<li>The <b>first</b> call to <code>resolve</code> or <code>reject</code> wins. Every later call is silently <b>ignored</b>.</li>
<li>If the executor <b>throws</b> before settling, the promise becomes <b>rejected</b> with that error. A throw <i>after</i> settling is ignored.</li>
<li><code>resolve(anotherPromise)</code> does not fulfil with a promise object; it <b>follows</b> that promise and copies its eventual state ("locked in").</li>
<li>The executor's <code>return</code> value is ignored — only resolve/reject count.</li>
</ul>
<p><b>Shortcuts:</b> <code>Promise.resolve(v)</code> makes an already-fulfilled promise (or returns <code>v</code> itself if it is already a native promise), <code>Promise.reject(e)</code> an already-rejected one. ES2024 adds <code>Promise.withResolvers()</code> → <code>{ promise, resolve, reject }</code>.</p>
<p><b>Reading the result:</b> you never read the state directly. You subscribe with <code>.then(onFulfilled, onRejected)</code> / <code>.catch</code> / <code>.finally</code>. Handlers <b>always</b> run asynchronously (as microtasks), even if the promise is already settled.</p>`,
    clues: ['"What are the states of a Promise?" → pending, fulfilled, rejected; settled = not pending', '"What happens if you call resolve twice / resolve then reject?" → first call wins, rest ignored', '"Is the executor sync or async?" → sync; only the <code>.then</code> handlers are async', '"Wrap setTimeout / an event / a callback API in a promise" → <code>new Promise((resolve, reject) =&gt; ...)</code>', '"Deferred / resolve it from outside" → <code>Promise.withResolvers()</code>', '"Thenable" / "resolve with a promise" → adoption: the outer promise follows the inner one'],
    code: [{ lang: 'js', run: true, title: 'Executor runs synchronously; first settle wins', code: `
console.log('1. before new Promise');

const p = new Promise(function (resolve, reject) {
  console.log('2. executor runs RIGHT NOW (synchronously)');
  resolve('first value');          // wins
  reject(new Error('ignored'));    // ignored: already settled
  resolve('also ignored');         // ignored
  console.log('3. code after resolve still runs (resolve is not return)');
});

p.then(function (v) {
  console.log('5. then handler (async, later):', v);
});

console.log('4. after new Promise');
` }, { lang: 'js', run: true, title: 'delay(): wrapping setTimeout + a throwing executor', code: `
// The classic first promise everyone writes
function delay(ms, value) {
  return new Promise(function (resolve) {
    setTimeout(function () { resolve(value); }, ms);
  });
}

delay(50, 'ready after 50 ms').then(function (v) { console.log(v); });

// A throw inside the executor = automatic rejection
const broken = new Promise(function () {
  throw new Error('boom in executor');
});
broken.catch(function (e) { console.log('caught:', e.message); });

// Promise.resolve / Promise.reject shortcuts
Promise.resolve(42).then(function (v) { console.log('resolved shortcut:', v); });
Promise.reject(new Error('nope')).catch(function (e) { console.log('rejected shortcut:', e.message); });
` }],
    codeTitle: ['Executor order + first-settle-wins (runnable)', 'delay(), throwing executor, shortcuts (runnable)'],
    viz: {
      title: 'Promise state machine: which call wins?',
      input: 'resolve 42, reject oops, resolve 7, throw boom',
      inputLabel: 'Calls inside the executor, in order: resolve X / reject X / throw X (max 8)',
      gen: function (input) {
        var calls = items(input).map(function (s) {
          var m = s.match(/^(resolve|reject|throw)\s*(.*)$/);
          if (!m) throw new Error('Each call must start with resolve, reject or throw — e.g. resolve 42, reject oops');
          return { kind: m[1], val: m[2] || 'undefined' };
        });
        if (!calls.length || calls.length > 8) throw new Error('Give 1 to 8 calls');
        var nodes = [
          { id: 'P', label: 'pending', x: 14, y: 35, shape: 'box', w: 20 },
          { id: 'F', label: 'fulfilled', x: 80, y: 12, shape: 'box', w: 22 },
          { id: 'R', label: 'rejected', x: 80, y: 58, shape: 'box', w: 22 }
        ];
        var edges = [['P', 'F', 'resolve(v)'], ['P', 'R', 'reject(e) / throw']];
        function g(hl, ehl, tags) { return { type: 'graph', label: 'Promise state machine', directed: true, height: 70, nodes: nodes, edges: edges, hl: hl, ehl: ehl || {}, tags: tags || {} }; }
        var state = 'pending', value = '—', log = [], frames = [];
        frames.push(fr('<code>new Promise(executor)</code> creates a promise in state <b>pending</b>. The executor starts running <b>immediately</b>. Arrows only go <b>out</b> of pending — there is no way back.', [g({ P: 'cur' }), vp({ state: state, value: value }, { state: 'cur' })]));
        var thrown = false;
        calls.forEach(function (c, k) {
          if (thrown) {
            log.push([String(k + 1), c.kind + ' ' + c.val, H.c('m', 'never runs — executor already exited by throw')]);
            frames.push(fr('<code>' + c.kind + ' ' + esc(c.val) + '</code> never runs: a <code>throw</code> leaves the executor immediately, like any function.', [g(state === 'fulfilled' ? { F: 'sel' } : { R: 'sel' }), { type: 'table', label: 'Call log', columns: ['#', 'call', 'effect'], rows: log.slice(), hl: (function () { var x = {}; x[k] = 'done'; return x; })() }, vp({ state: state, value: value })]));
            return;
          }
          var target = c.kind === 'resolve' ? 'F' : 'R';
          if (c.kind === 'throw') thrown = true;
          if (state === 'pending') {
            state = c.kind === 'resolve' ? 'fulfilled' : 'rejected';
            value = c.kind === 'resolve' ? c.val : 'Error(' + c.val + ')';
            log.push([String(k + 1), c.kind + ' ' + c.val, H.c(target === 'F' ? 'g' : 'r', 'settles → ' + state)]);
            var hl = { P: 'done' }; hl[target] = target === 'F' ? 'ok' : 'bad';
            var ehl = {}; ehl['P-' + target] = 'cur';
            frames.push(fr('<code>' + c.kind + ' ' + esc(c.val) + '</code> is the <b>first</b> settling call, so it wins: pending → <b>' + state + '</b>' + (c.kind === 'throw' ? ' (a throw inside the executor counts as reject).' : '.') + ' From now on the state is <b>frozen</b>.', [g(hl, ehl, (function () { var t = {}; t[target] = esc(value); return t; })()), { type: 'table', label: 'Call log', columns: ['#', 'call', 'effect'], rows: log.slice(), hl: (function () { var x = {}; x[k] = 'ok'; return x; })() }, vp({ state: state, value: value }, { state: 'ok', value: 'ok' })]));
          } else {
            log.push([String(k + 1), c.kind + ' ' + c.val, H.c('m', 'ignored (already ' + state + ')')]);
            var hl2 = {}; hl2[state === 'fulfilled' ? 'F' : 'R'] = 'sel'; hl2[target] = hl2[target] || 'done';
            frames.push(fr('<code>' + c.kind + ' ' + esc(c.val) + '</code> is <span class="c-r">ignored</span>. The promise is already <b>' + state + '</b>; no error, no warning — it just does nothing.' + (c.kind === 'throw' ? ' A throw after settling is swallowed silently (the executor stops, the state stays).' : ''), [g(hl2, {}, (function () { var t = {}; t[state === 'fulfilled' ? 'F' : 'R'] = esc(value); return t; })()), { type: 'table', label: 'Call log', columns: ['#', 'call', 'effect'], rows: log.slice(), hl: (function () { var x = {}; x[k] = 'bad'; return x; })() }, vp({ state: state, value: value })]));
          }
        });
        if (state === 'pending') {
          frames.push(fr('No call settled the promise, so it stays <b>pending forever</b>. Any <code>.then</code> attached to it will never run — a classic "hanging promise" bug.', [g({ P: 'bad' }), vp({ state: state, value: value }, { state: 'bad' })]));
        } else {
          frames.push(fr('Final answer: <b>' + state + '</b> with ' + (state === 'fulfilled' ? 'value' : 'reason') + ' <b>' + esc(value) + '</b>. A <code>.then</code> attached now <i>or an hour later</i> sees exactly this result.', [g((function () { var x = {}; x[state === 'fulfilled' ? 'F' : 'R'] = 'sel'; return x; })(), {}, (function () { var t = {}; t[state === 'fulfilled' ? 'F' : 'R'] = esc(value); return t; })()), vp({ state: state, value: value, 'handler to run': state === 'fulfilled' ? '.then(onFulfilled)' : '.catch / .then(_, onRejected)' }, { 'handler to run': 'sel' })]));
        }
        return frames;
      }
    },
    examples: [
      { title: 'resolve() is not return', html: `<p>Calling <code>resolve</code> settles the promise but does <b>not</b> stop the executor. Code after it still runs. Write <code>return resolve(x)</code> when you want to stop.</p>`, code: { lang: 'js', run: true, code: `
new Promise(function (resolve) {
  resolve('done');
  console.log('still running after resolve!');
}).then(function (v) { console.log('then:', v); });
` } },
      { title: 'Resolving with another promise adopts its state', html: `<p><code>resolve(p2)</code> makes the outer promise <b>follow</b> <code>p2</code>. If <code>p2</code> later rejects, the outer one rejects too — even though we called <code>resolve</code>. That is why "resolved" ≠ "fulfilled": a promise can be <i>resolved</i> (locked onto another) while still <i>pending</i>.</p>`, code: { lang: 'js', run: true, code: `
const inner = new Promise(function (_, reject) {
  setTimeout(function () { reject(new Error('inner failed')); }, 20);
});
const outer = new Promise(function (resolve) {
  resolve(inner); // follow inner
});
outer.then(
  function (v) { console.log('fulfilled?', v); },
  function (e) { console.log('outer rejected because inner did:', e.message); }
);
console.log('Promise.resolve(inner) === inner ?', Promise.resolve(inner) === inner); // true
` } },
      { title: 'Late subscribers still get the value', html: `<p>Unlike events, a promise <b>remembers</b> its result. A handler attached long after settling still runs (asynchronously) with the same value — that is why caching a promise (not the value) is a great way to deduplicate requests.</p>`, code: { lang: 'js', run: true, code: `
const p = Promise.resolve('cached config');
setTimeout(function () {
  p.then(function (v) { console.log('100 ms later, still:', v); });
}, 100);
p.then(function (v) { console.log('right away:', v); });
` } },
      { title: 'Thenables: anything with a then method', html: `<p>Promises interoperate with any object that has a <code>then(resolve, reject)</code> method (a <b>thenable</b>). <code>Promise.resolve(thenable)</code> calls its <code>then</code> and adopts the outcome. This is how old libraries (jQuery Deferred, Bluebird) mix with native promises.</p>`, code: { lang: 'js', run: true, code: `
const thenable = {
  then(resolve) { setTimeout(() => resolve('from a thenable'), 10); }
};
Promise.resolve(thenable).then((v) => console.log(v));
` } }
    ],
    deepDive: `<p>🟣 <b>Spec internals.</b> A promise has internal slots <code>[[PromiseState]]</code>, <code>[[PromiseResult]]</code>, and two reaction lists. <code>new Promise</code> creates a pair of <b>resolving functions</b> sharing an <code>alreadyResolved</code> flag — that flag is why only the first call counts. When it settles, each stored reaction becomes a <b>PromiseReactionJob</b> on the microtask queue. A <code>then</code> on an already-settled promise queues the job immediately.</p>
<p><b>Resolve procedure.</b> <code>resolve(x)</code>: if <code>x</code> is the promise itself → reject with TypeError (a cycle). If <code>x</code> is an object/function with a callable <code>then</code>, schedule a <b>PromiseResolveThenableJob</b> that calls <code>x.then(resolve, reject)</code> — this costs <b>extra microtask ticks</b>, which is why <code>return somePromise</code> inside a <code>then</code> is slightly "later" than returning a plain value (a common output-puzzle trap). Otherwise fulfil with <code>x</code>.</p>
<p><b>Explicit construction anti-pattern.</b> Wrapping an existing promise in <code>new Promise((res, rej) =&gt; p.then(res, rej))</code> adds noise and often forgets the reject branch. Only use <code>new Promise</code> to wrap <b>non-promise</b> APIs (timers, events, callbacks).</p>
<p><b>Memory.</b> A forever-pending promise keeps all its reaction closures alive. In long-running servers, "promise leaks" (e.g. waiting on an event that never fires) slowly grow the heap — add timeouts. Unhandled rejections: Node ≥ 15 <b>crashes</b> the process by default (<code>--unhandled-rejections=throw</code>); browsers fire an <code>unhandledrejection</code> event.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated code is full of <code>new Promise</code> wrappers — many unnecessary (wrapping something that is already a promise) and some broken (forgetting to call <code>reject</code>, so errors make the promise hang forever).</p>
<p><b>Use AI as a partner:</b> ask <code>Can any path in this executor finish without calling resolve or reject?</code> and <code>Is this new Promise wrapping something that already returns a promise?</code>. Ask for a state-machine diagram for a tricky flow, like the visualizer above.</p>
<p><b>Where AI goes wrong:</b> saying the executor runs asynchronously; claiming a second <code>resolve</code> "updates" the value; using <code>async</code> executors (<code>new Promise(async (resolve) =&gt; ...)</code>), where a thrown error is <b>not</b> caught by the outer promise. <b>What you must still own:</b> the three states, first-settle-wins, executor timing, and spotting hanging promises in code review.</p>`,
    problems: [{
      title: 'Build a Deferred (Promise.withResolvers polyfill)',
      level: 'Easy', tags: ['promises', 'polyfill', 'state'], companies: ['Atlassian', 'Meta'],
      statement: `<p>Sometimes the code that <b>creates</b> a promise is not the code that <b>settles</b> it (e.g. a request/response matcher, or a test helper). Write <code>deferred()</code> that returns <code>{ promise, resolve, reject }</code>, where calling <code>resolve</code>/<code>reject</code> from outside settles <code>promise</code>. Also expose a read-only <code>state</code> getter ('pending' / 'fulfilled' / 'rejected') for debugging.</p>`,
      constraints: `Same semantics as <code>Promise.withResolvers()</code>: first settle wins. The state getter must reflect the first settling call.`,
      example: `<pre>const d = deferred();
d.state;            // 'pending'
d.resolve('hi');    // later code settles it
d.state;            // 'fulfilled'
d.promise.then(console.log); // 'hi'</pre><p>The ${H.c('b', 'executor runs synchronously')}, so resolve/reject are captured before <code>new Promise</code> even returns.</p>`,
      brute: { why: `<p>Without a helper, people make a promise, then "smuggle" resolve out into an outer <code>let</code> by hand every time. It works but is repeated boilerplate and nobody tracks the state.</p>`, code: { lang: 'js', run: true, code: `
let resolveLater;
const p = new Promise(function (resolve) { resolveLater = resolve; }); // smuggle out by hand
p.then(function (v) { console.log('got', v); });
setTimeout(function () { resolveLater('value from outside'); }, 10);
` } },
      mcq: { q: 'Why is it safe to read resolve right after `new Promise(...)` returns?', options: ['Because the executor runs synchronously, during the constructor call', 'Because resolve is global', 'Because Promise waits for the next tick', 'It is not safe'], answer: 0, explain: 'The executor runs immediately inside the constructor, so the captured functions are already assigned.' },
      hints: [`<p>Hint 1: declare <code>let resolve, reject</code> outside, assign them inside the executor.</p>`, `<p>Hint 2: to track state, wrap them: the first wrapper call sets <code>state</code> if it is still 'pending', then forwards to the real function.</p>`, `<p>Hint 3: return an object with a <code>get state()</code> getter so it is read-only. Edge: resolve(promiseThatRejects) — the state you track is "resolved" not "fulfilled"; for this exercise mark only plain values.</p>`],
      tests: { sig: 'string string -> string', fn: '__tA', harness: { js: `function __runChild() {
  const fs = require('fs'), vm = require('vm'), util = require('util');
  process.on('unhandledRejection', () => {});
  process.on('uncaughtException', (e) => { process.stdout.write('@@ERROR uncaught ' + (e && e.stack || e) + '\\n'); process.exit(1); });
  const src = fs.readFileSync(process.env.SC_FILE, 'utf8');
  const body = src.slice(0, src.indexOf('/*@@' + 'END@@*/'));
  let now = 0, seq = 1, timers = [];
  const logs = [];
  const fake = {
    turns: 0, delays: [], uncaught: [],
    setTimeout(fn, ms, ...a) { const t = { id: seq++, at: now + Math.max(0, +ms || 0), fn, a }; timers.push(t); fake.delays.push(Math.max(0, +ms || 0)); return t.id; },
    clearTimeout(id) { timers = timers.filter((t) => t.id !== id); },
    now: () => now,
    pending: () => timers.length,
    reset() { timers = []; logs.length = 0; fake.delays.length = 0; fake.turns = 0; fake.uncaught.length = 0; },
    async flush(n = 60) { for (let i = 0; i < n; i++) await new Promise((r) => queueMicrotask(r)); },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        await fake.flush();
        timers.sort((a, b) => a.at - b.at || a.id - b.id);
        const t = timers[0];
        if (!t || t.at > end) break;
        timers.shift(); now = t.at; fake.turns++;
        try { t.fn(...t.a); } catch (e) { fake.uncaught.push(e && e.message); }
      }
      now = end; await fake.flush();
    }
  };
  const fmt = (x) => (typeof x === 'string' ? x : util.inspect(x, { depth: 3, breakLength: Infinity }));
  const ctx = vm.createContext({ console: { log: (...a) => logs.push({ t: now, s: a.map(fmt).join(' ') }), error() {}, warn() {} }, setTimeout: fake.setTimeout, clearTimeout: fake.clearTimeout, queueMicrotask, __fake: fake, __logs: logs });
  vm.runInContext(body, ctx, { filename: 'main.js' });
  (async () => {
    await fake.flush(100);
    const scenario = vm.runInContext('__scenario', ctx);
    const r = await scenario(process.env.SC_NAME, JSON.parse(process.env.SC_ARGS));
    process.stdout.write('@@RESULT ' + JSON.stringify(r === undefined ? null : r) + '\\n');
    process.exit(0);
  })().catch((e) => { process.stdout.write('@@ERROR ' + (e && e.stack || e) + '\\n'); process.exit(1); });
}
function __tA(name, argsJson) {
  const r = require('child_process').spawnSync(process.execPath, ['-e', '(' + __runChild.toString() + ')()'], {
    env: Object.assign({}, process.env, { SC_FILE: __filename, SC_NAME: name, SC_ARGS: argsJson || 'null' }), encoding: 'utf8', timeout: 20000, maxBuffer: 1 << 26
  });
  const m = /@@RESULT (.*)/.exec(r.stdout || '');
  if (!m) throw new Error('scenario failed: ' + String(r.stdout).slice(-400) + String(r.stderr).slice(-300));
  return JSON.parse(m[1]);
}
function __tD() { let res, rej; const p = new Promise((a, b) => { res = a; rej = b; }); return { p, res, rej }; }
function __tTrack(p) { const s = { st: 'pending' }; p.then((v) => { s.st = 'fulfilled'; s.v = v; }, (e) => { s.st = 'rejected'; s.e = e; }); return s; }
function __tEm(e) { return e !== null && typeof e === 'object' && 'message' in e ? e.name + ':' + e.message : e; }
function __tSum(s) { return s.st === 'fulfilled' ? ['ok', s.v] : s.st === 'rejected' ? ['err', __tEm(s.e)] : ['pending']; }
function __tBegin() { __fake.reset(); }
function __tTick(n) { return __fake.flush(n); }
function __tAdv(ms) { return __fake.advance(ms); }
function __tLater(ms, v, fail) { return new Promise((res, rej) => setTimeout(() => (fail ? rej(new Error(v)) : res(v)), ms)); }
async function __scenario(name) {
  const track = __tTrack, sum = __tSum, tick = __tTick; __tBegin();
  switch (name) {
    case 'start': { const d = deferred(); return [d.state, typeof d.resolve, typeof d.reject, d.promise instanceof Promise]; }
    case 'resolve': { const d = deferred(); const s = track(d.promise); d.resolve('hi'); const st = d.state; await tick(); return [st, sum(s)]; }
    case 'reject': { const d = deferred(); const s = track(d.promise); d.reject(new Error('x')); const st = d.state; await tick(); return [st, sum(s)]; }
    case 'resolve-then-reject': { const d = deferred(); const s = track(d.promise); d.resolve('hi'); d.reject(new Error('too late')); await tick(); return [d.state, sum(s)]; }
    case 'reject-then-resolve': { const d = deferred(); const s = track(d.promise); d.reject(new Error('first')); d.resolve('late'); await tick(); return [d.state, sum(s)]; }
    case 'double-resolve': { const d = deferred(); const s = track(d.promise); d.resolve(1); d.resolve(2); await tick(); return [d.state, sum(s)]; }
    case 'readonly-state': { const d = deferred(); try { d.state = 'fulfilled'; } catch (e) { /* strict assignment throws */ } return d.state; }
    case 'resolve-with-promise': { const d = deferred(); const s = track(d.promise); d.resolve(Promise.resolve(5)); const st = d.state; await tick(); return [st, sum(s)]; }
    case 'then-before-settle': { const d = deferred(); const seen = []; d.promise.then((v) => seen.push([v, d.state])); await tick(); seen.push('before'); d.resolve('v'); await tick(); return seen; }
    case 'independent': { const a = deferred(), b = deferred(); a.resolve(1); return [a.state, b.state]; }
    case 'undefined-value': { const d = deferred(); const s = track(d.promise); d.resolve(); await tick(); return sum(s); }
    case 'many-order': { const ds = Array.from({ length: 1000 }, () => deferred()); const order = []; ds.forEach((d, i) => d.promise.then(() => order.push(i))); for (let i = 999; i >= 0; i--) ds[i].resolve(); await tick(); return [order.length, order[0], order[999], order.every((v, k) => v === 999 - k)]; }
    case 'catch-handler': { const d = deferred(); let msg; d.promise.catch((e) => { msg = e.message; }); d.reject(new Error('boom')); await tick(); return [msg, d.state]; }
    case 'thenable-resolution': { const d = deferred(); const s = track(d.promise); d.resolve({ then(r) { r('from thenable'); } }); await tick(); return [d.state, sum(s)]; }
  }
}
/*@@END@@*/` }, cases: [
        [["start","null"],["pending","function","function",true]],
        [["resolve","null"],["fulfilled",["ok","hi"]]],
        [["reject","null"],["rejected",["err","Error:x"]]],
        [["resolve-then-reject","null"],["fulfilled",["ok","hi"]]],
        [["reject-then-resolve","null"],["rejected",["err","Error:first"]]],
        [["double-resolve","null"],["fulfilled",["ok",1]]],
        [["readonly-state","null"],"pending"],
        [["resolve-with-promise","null"],["fulfilled",["ok",5]]],
        [["then-before-settle","null"],["before",["v","fulfilled"]]],
        [["independent","null"],["fulfilled","pending"]],
        [["undefined-value","null"],["ok",null]],
        [["many-order","null"],[1000,999,0,true]],
        [["catch-handler","null"],["boom","rejected"]],
        [["thenable-resolution","null"],["fulfilled",["ok","from thenable"]]]
      ] },
      solution: {
        approach: `<p>Capture the resolving functions from the synchronous executor, wrap them so the first call records the final state, and return them with the promise. If <code>Promise.withResolvers</code> exists (ES2024, Node 22+) you can use it directly; this is the polyfill.</p>`,
        code: { lang: 'js', run: true, code: `
function deferred() {
  let res, rej, state = 'pending';
  const promise = new Promise(function (resolve, reject) {
    res = resolve;   // executor runs synchronously,
    rej = reject;    // so these are set before we return
  });
  return {
    promise: promise,
    resolve: function (v) { if (state === 'pending') state = 'fulfilled'; res(v); },
    reject: function (e) { if (state === 'pending') state = 'rejected'; rej(e); },
    get state() { return state; }
  };
}

const d = deferred();
console.log('state at start:', d.state);
d.promise.then(function (v) { console.log('then got:', v, '| state:', d.state); });
setTimeout(function () {
  d.resolve('hi');
  d.reject(new Error('too late'));       // ignored, state stays fulfilled
  console.log('state after settle:', d.state);
}, 20);

// Built-in since ES2024:
if (typeof Promise.withResolvers === 'function') {
  const w = Promise.withResolvers();
  w.promise.then((v) => console.log('withResolvers:', v));
  w.resolve('native works too');
}
` },
        dry: { head: ['time', 'action', 'state', 'promise'], rows: [['0 ms', 'deferred()', 'pending', 'pending'], ['0 ms', 'attach then', 'pending', 'pending (handler stored)'], ['20 ms', "resolve('hi')", H.c('g', 'fulfilled'), "fulfilled 'hi' → handler queued"], ['20 ms', 'reject(...)', 'fulfilled', 'ignored']] },
        complexity: `<p>O(1) time and space per deferred.</p>`,
        followUps: ['Use a deferred to build a request/response matcher keyed by request id.', 'Why is the deferred pattern considered an anti-pattern when a normal promise would do?']
      }
    }]
  });

  /* ================= TOPIC 4: then / catch / finally chaining ================= */
  topics.push({
    title: 'Chaining with then, catch and finally',
    analogy: `<p>Think of a <b>factory assembly line</b>. Each station (<code>.then</code>) takes the item from the previous station, does one job, and puts the result on the belt for the next station. If a station finds a broken item, it drops it into the <b>red reject chute</b>; every normal station after that is skipped until the item reaches the <b>repair desk</b> (<code>.catch</code>), which may fix it and put it back on the main belt. At the very end, the <b>cleaner</b> (<code>.finally</code>) sweeps the floor no matter what happened — but doesn't touch the item.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> <code>.then(fn)</code> says "when this promise is fulfilled, call <code>fn</code> with its value". The magic: <b><code>.then</code> always returns a brand-new promise</b>, so you can chain another <code>.then</code> on it.</p>
<p>🔵 <b>What the next promise becomes</b> depends on what your handler does:</p>
${H.table(['Inside the handler you…', 'The promise returned by then becomes…'], [['<code>return 5</code>', H.c('g', 'fulfilled with 5')], ['return nothing', H.c('g', 'fulfilled with undefined') + ' (the #1 bug: forgot return)'], ['<code>return somePromise</code>', H.c('b', 'waits for it') + ' and copies its result (flattening — no promise of a promise)'], ['<code>throw err</code>', H.c('r', 'rejected with err')], ['<code>return Promise.reject(err)</code>', H.c('r', 'rejected with err')]])}
<p><b>The three methods:</b></p>
<ul>
<li><code>.then(onFulfilled, onRejected?)</code> — runs <code>onFulfilled</code> on success. If the previous step failed, it is <b>skipped</b> and the rejection passes through untouched.</li>
<li><code>.catch(onRejected)</code> — exactly <code>.then(undefined, onRejected)</code>. Skipped on success (value passes through). On failure it runs, and whatever it <b>returns</b> becomes a <i>success</i> again — the chain <b>recovers</b>. Re-<code>throw</code> to stay failed.</li>
<li><code>.finally(onFinally)</code> — runs on <b>both</b> outcomes, gets <b>no argument</b>, and <b>passes the original result through</b> (its return value is ignored). Exception: if it throws or returns a rejected promise, that new error replaces the result.</li>
</ul>
<pre>Promise.resolve(1)
  .then(v =&gt; v + 1)                  // 2
  .then(v =&gt; { throw new Error('x'); }) // rejected
  .then(v =&gt; v * 100)                // SKIPPED
  .catch(e =&gt; 10)                    // recovers → 10
  .finally(() =&gt; console.log('cleanup')) // 10 passes through
  .then(v =&gt; console.log(v));        // 10</pre>
<p><b>Chain vs branch.</b> <code>p.then(a).then(b)</code> is a chain: <code>b</code> gets <code>a</code>'s result. <code>p.then(a); p.then(b);</code> are two branches: both get <code>p</code>'s value, independently.</p>`,
    clues: ['"What does <code>.then</code> return?" → always a new promise', '"The next then logs undefined" → a handler forgot to <code>return</code>', '"Promise inside a promise / nested thens" → return the inner promise, chain flat', '"Difference between <code>then(f, g)</code> and <code>then(f).catch(g)</code>" → the second also catches errors thrown by <code>f</code>', '"Does finally get the value? Can it change it?" → no argument; passes result through unless it throws', '"Run steps one after another, each needing the previous result" → a then-chain or reduce'],
    code: [{ lang: 'js', run: true, title: 'Every rule of chaining in one run', code: `
function delay(ms, v) { return new Promise((resolve) => setTimeout(() => resolve(v), ms)); }

Promise.resolve(1)
  .then((v) => { console.log('A got', v); return v + 1; })        // return value → next
  .then((v) => { console.log('B got', v); return delay(50, v * 10); }) // return promise → chain WAITS
  .then((v) => { console.log('C got', v, '(after 50 ms)'); })     // no return → undefined
  .then((v) => { console.log('D got', v); throw new Error('bad step'); })
  .then((v) => { console.log('E never runs'); return v; })        // skipped: chain is rejected
  .catch((e) => { console.log('F caught', e.message); return 'recovered'; })
  .finally(() => { console.log('G finally: no argument, return ignored'); return 'IGNORED'; })
  .then((v) => console.log('H got', v));                         // 'recovered'
` }, { lang: 'js', run: true, title: 'then(f, g) vs then(f).catch(g)', code: `
const failInSuccessHandler = () => { throw new Error('thrown inside f'); };

// g is attached to the SAME then as f → it only watches the PREVIOUS promise
Promise.resolve('ok')
  .then(failInSuccessHandler, (e) => console.log('two-arg g caught:', e.message))
  .catch((e) => console.log('...so the error escaped to the next catch:', e.message));

// catch after then → watches everything before it, including f
Promise.resolve('ok')
  .then(failInSuccessHandler)
  .catch((e) => console.log('trailing catch caught:', e.message));
` }],
    codeTitle: ['All chaining rules (runnable)', 'then(f, g) vs then(f).catch(g) (runnable)'],
    viz: {
      title: 'Watch a value travel down a promise chain',
      input: 'start 5, *2, wait 100, log, +3, throw boom, *10, catch 0, +1, finally',
      inputLabel: 'start N | fail msg first, then: *N +N -N, wait N, log, throw msg, catch V, finally, finally throw msg (max 12)',
      gen: function (input) {
        var ops = items(input);
        if (ops.length < 2 || ops.length > 12) throw new Error('Give 2 to 12 steps, starting with "start 5" or "fail oops"');
        var first = ops[0].match(/^(start|fail)\s+(.+)$/);
        if (!first) throw new Error('First step must be "start <number>" or "fail <message>"');
        var lines = [], rows = [], frames = [];
        var state, val, clock = 0;
        function fmt(v) { return v === undefined ? 'undefined' : (typeof v === 'number' && isNaN(v)) ? 'NaN' : String(v); }
        if (first[1] === 'start') {
          if (isNaN(Number(first[2]))) throw new Error('start needs a number, e.g. start 5');
          state = 'fulfilled'; val = Number(first[2]); lines.push('Promise.resolve(' + val + ')');
        } else { state = 'rejected'; val = 'Error(' + first[2] + ')'; lines.push("Promise.reject(new Error('" + first[2] + "'))"); }
        var parsed = ops.slice(1).map(function (s) {
          var m;
          if ((m = s.match(/^([*+\-])\s*(-?\d+(\.\d+)?)$/))) return { k: 'math', op: m[1], n: Number(m[2]), line: '  .then(v => v ' + m[1] + ' ' + m[2] + ')' };
          if ((m = s.match(/^wait\s+(\d+)$/))) return { k: 'wait', n: Number(m[1]), line: '  .then(v => delay(' + m[1] + ', v))' };
          if (s === 'log') return { k: 'log', line: '  .then(v => { console.log(v); })  // no return!' };
          if ((m = s.match(/^throw\s+(.+)$/))) return { k: 'throw', msg: m[1], line: "  .then(v => { throw new Error('" + m[1] + "'); })" };
          if ((m = s.match(/^catch\s+(.+)$/))) return { k: 'catch', v: isNaN(Number(m[1])) ? m[1] : Number(m[1]), line: '  .catch(e => ' + (isNaN(Number(m[1])) ? "'" + m[1] + "'" : m[1]) + ')' };
          if ((m = s.match(/^finally\s+throw\s+(.+)$/))) return { k: 'finthrow', msg: m[1], line: "  .finally(() => { throw new Error('" + m[1] + "'); })" };
          if (s === 'finally') return { k: 'finally', line: '  .finally(() => cleanup())' };
          throw new Error('Unknown step "' + s + '". Use *2, +3, wait 100, log, throw msg, catch 0, finally');
        });
        parsed.forEach(function (p) { lines.push(p.line); });
        var code = lines.join('\n');
        rows.push(['0', esc(lines[0].trim()), 'starts', state === 'fulfilled' ? H.c('g', 'fulfilled ' + fmt(val)) : H.c('r', 'rejected ' + val)]);
        frames.push(fr('The chain starts ' + (state === 'fulfilled' ? '<b>fulfilled</b> with <b>' + fmt(val) + '</b>' : '<b>rejected</b> with <b>' + esc(val) + '</b>') + '. Each <code>.then/.catch/.finally</code> below created a <b>new</b> promise; they will settle one by one.', [cp(code, { 1: state === 'fulfilled' ? 'ok' : 'bad' }), { type: 'table', label: 'Chain links', columns: ['#', 'link', 'ran?', 'result promise'], rows: rows.slice(), hl: { 0: 'cur' } }, vp({ state: state, value: fmt(val), clock: clock + ' ms' }, { state: state === 'fulfilled' ? 'ok' : 'bad' })]));
        parsed.forEach(function (p, i) {
          var ln = i + 2, ran = 'skipped', narr = '', cls = 'done', log = '';
          if (p.k === 'math' || p.k === 'wait' || p.k === 'log' || p.k === 'throw') {
            if (state === 'rejected') {
              narr = 'The chain is <b>rejected</b>, so this <code>.then</code> handler is <span class="c-m">skipped</span>. The same error simply passes to the next link.';
            } else {
              ran = 'ran'; cls = 'cur';
              if (p.k === 'math') { var old = val; val = p.op === '*' ? val * p.n : p.op === '+' ? val + p.n : val - p.n; narr = 'Handler gets <b>' + fmt(old) + '</b>, returns <b>' + fmt(val) + '</b>. A returned plain value fulfils the next promise.' + (isNaN(val) ? ' <span class="c-r">NaN because the value was undefined — someone forgot to return!</span>' : ''); cls = isNaN(val) ? 'bad' : 'ok'; }
              else if (p.k === 'wait') { clock += p.n; narr = 'Handler returns a <b>promise</b> (<code>delay(' + p.n + ')</code>). The chain <b>waits</b> for it — clock moves to <b>' + clock + ' ms</b> — then continues with its value <b>' + fmt(val) + '</b>. That is flattening.'; cls = 'win'; }
              else if (p.k === 'log') { log = fmt(val); narr = 'Handler prints <b>' + fmt(val) + '</b> but <span class="c-r">returns nothing</span>, so the next promise is fulfilled with <b>undefined</b>.'; val = undefined; cls = 'bad'; }
              else { state = 'rejected'; val = 'Error(' + p.msg + ')'; narr = 'Handler <b>throws</b>. The promise returned by this <code>.then</code> becomes <span class="c-r">rejected</span>. All following <code>.then</code> success handlers will be skipped until a <code>.catch</code>.'; cls = 'bad'; }
            }
          } else if (p.k === 'catch') {
            if (state === 'rejected') { ran = 'ran'; narr = '<code>.catch</code> runs because the chain is rejected (reason ' + esc(val) + '). It <b>returns</b> ' + esc(fmt(p.v)) + ', so the chain is <span class="c-g">fulfilled again</span> — recovered.'; state = 'fulfilled'; val = p.v; cls = 'ok'; }
            else narr = 'The chain is fulfilled, so <code>.catch</code> is <span class="c-m">skipped</span>; the value <b>' + fmt(val) + '</b> passes straight through.';
          } else if (p.k === 'finally') { ran = 'ran'; cls = 'sel'; narr = '<code>.finally</code> runs on <b>both</b> outcomes, receives no argument, and lets the current result (' + (state === 'fulfilled' ? fmt(val) : esc(val)) + ') <b>pass through unchanged</b>.'; }
          else { ran = 'ran'; cls = 'bad'; narr = '<code>.finally</code> runs, but it <b>throws</b>. That is the one way finally can change the outcome: the chain becomes <span class="c-r">rejected</span> with the new error.'; state = 'rejected'; val = 'Error(' + p.msg + ')'; }
          rows.push([String(i + 1), esc(p.line.trim()), ran === 'ran' ? H.c('g', 'ran') : H.c('m', 'skipped'), state === 'fulfilled' ? H.c('g', 'fulfilled ' + esc(fmt(val))) : H.c('r', 'rejected ' + esc(val))]);
          var hl = {}; hl[ln] = cls; var th = {}; th[i + 1] = ran === 'ran' ? 'cur' : 'done';
          var parts = [cp(code, hl), { type: 'table', label: 'Chain links', columns: ['#', 'link', 'ran?', 'result promise'], rows: rows.slice(), hl: th }, vp({ state: state, value: fmt(val), clock: clock + ' ms' }, { state: state === 'fulfilled' ? 'ok' : 'bad' })];
          if (log) parts.push(outBox([log]));
          frames.push(fr('Link ' + (i + 1) + ': ' + narr, parts));
        });
        frames.push(fr('End of chain: <b>' + state + '</b> with ' + (state === 'fulfilled' ? 'value <b>' + esc(fmt(val)) + '</b>' : 'reason <b>' + esc(val) + '</b>' + ' — <span class="c-r">no catch at the end means an unhandled rejection!</span>') + '. Total waiting time: ' + clock + ' ms.', [{ type: 'table', label: 'Chain links (final)', columns: ['#', 'link', 'ran?', 'result promise'], rows: rows.slice(), hl: (function () { var x = {}; x[rows.length - 1] = 'sel'; return x; })() }, vp({ state: state, value: fmt(val) }, { state: state === 'fulfilled' ? 'ok' : 'bad' })]));
        return frames;
      }
    },
    examples: [
      { title: 'Nested then (the pyramid comes back) vs flat chain', html: `<p>Promises only fix callback hell if you <b>return</b> the inner promise instead of nesting. Nested <code>.then</code> inside <code>.then</code> also loses errors unless every level has its own catch.</p>`, code: { lang: 'js', run: true, code: `
const getUser = (id) => Promise.resolve({ id, name: 'asha' });
const getPosts = (user) => Promise.resolve(['p1', 'p2'].map((p) => user.name + ':' + p));

// BAD: nested (pyramid again)
getUser(1).then((user) => {
  getPosts(user).then((posts) => console.log('nested:', posts));   // not returned!
});

// GOOD: return the inner promise, keep it flat
getUser(1)
  .then((user) => getPosts(user))      // returned → chain waits for it
  .then((posts) => console.log('flat:', posts))
  .catch((e) => console.log('one handler for both steps', e));
` } },
      { title: 'Predict the output: forgotten return', html: `<p>Before running, guess each line. ${H.table(['line', 'logs', 'why'], [['A', '1', 'start value'], ['B', '2', 'A returned v + 1'], ['C', H.c('r', 'undefined'), 'B did not return'], ['E', 'x', 'C threw; D skipped'], ['F', '(no value)', 'finally gets no argument'], ['G', '10', 'catch returned 10; finally passed it through']])}</p>`, code: { lang: 'js', run: true, code: `
Promise.resolve(1)
  .then((v) => { console.log('A', v); return v + 1; })
  .then((v) => { console.log('B', v); })
  .then((v) => { console.log('C', v); throw new Error('x'); })
  .then((v) => console.log('D', v))
  .catch((e) => { console.log('E', e.message); return 10; })
  .finally(() => { console.log('F'); return 99; })
  .then((v) => console.log('G', v));
// A 1 / B 2 / C undefined / E x / F / G 10
` } },
      { title: 'Branching: two thens on the same promise', html: `<p>Each <code>.then</code> on the <b>same</b> promise gets the <b>same</b> value. Changing it in one branch does not affect the other. Great for "one request, many consumers".</p>`, code: { lang: 'js', run: true, code: `
const p = Promise.resolve(1);
p.then((v) => v + 1).then((v) => console.log('chain:', v));   // 2
p.then((v) => v + 10).then((v) => console.log('branch:', v)); // 11
p.then((v) => console.log('p is still:', v));                 // 1
` } },
      { title: 'finally for cleanup (spinners, locks, connections)', html: `<p>Use <code>finally</code> for work that must happen on success <i>and</i> failure: hide a loading spinner, release a lock, close a connection. It does not see the value and does not change it — unless it throws.</p>`, code: { lang: 'js', run: true, code: `
let loading = true;
function load(fail) {
  return new Promise((resolve, reject) => setTimeout(() => (fail ? reject(new Error('500')) : resolve('data')), 20));
}
load(true)
  .then((d) => console.log('got', d))
  .catch((e) => console.log('show error toast:', e.message))
  .finally(() => { loading = false; console.log('spinner hidden, loading =', loading); });
` } }
    ],
    deepDive: `<p>🟣 <b>How <code>then</code> really works.</b> <code>p.then(f, r)</code> creates a new promise <code>p2</code> (via <code>NewPromiseCapability</code> on <code>p.constructor[Symbol.species]</code>, which is why subclasses chain as subclasses) and registers a reaction. When <code>p</code> settles, a microtask calls the right handler; its return value is passed to <code>p2</code>'s <b>resolve</b> (so thenables are adopted), and a throw goes to <code>p2</code>'s reject. A missing handler is replaced by the identity (<code>v =&gt; v</code>) or the "thrower" (<code>e =&gt; { throw e; }</code>), which is why values and errors "pass through" skipped links.</p>
<p><b>finally's spec.</b> <code>finally(f)</code> is roughly <code>then(v =&gt; Promise.resolve(f()).then(() =&gt; v), e =&gt; Promise.resolve(f()).then(() =&gt; { throw e; }))</code>. So if <code>f</code> returns a promise, the chain <b>waits</b> for it (async cleanup works), and the extra wrapping costs additional microtask ticks — a classic reason for surprising output order.</p>
<p><b>Tick costs (useful for puzzles).</b> Returning a plain value: the next handler runs 1 microtask later. Returning a native promise: ~2 extra ticks (NewPromiseResolveThenableJob + its then). That is why, in two parallel chains, the one that returns a promise "falls behind" by two steps.</p>
<p><b>Performance and readability.</b> Very long chains are fine (each link is a small object), but chains in loops build a promise per iteration. In modern code prefer <code>async/await</code> (Module JS 8) for sequential logic; keep <code>.then</code> for short transforms and library-style code. Mixing styles is OK: <code>await</code> works on any thenable.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants convert between <code>.then</code> chains and <code>async/await</code> perfectly well, so writing chains by hand matters less. Reading them, predicting output, and spotting the missing <code>return</code> matters more — those are exactly the bugs AI introduces during refactors.</p>
<p><b>Use AI as a partner:</b> <code>Add a comment on each .then saying what value the next step receives</code>, <code>Find handlers that do not return a value but are followed by another then</code>, <code>Convert this chain to async/await and keep identical error behaviour (including finally)</code>.</p>
<p><b>Where AI goes wrong:</b> claiming <code>.finally</code> receives the value or can replace it by returning; treating <code>then(f, g)</code> as identical to <code>then(f).catch(g)</code>; leaving "floating" promises (started but not returned or awaited) inside handlers, so errors escape the chain. <b>What you must still own:</b> the return-value table above, recovery vs rethrow decisions, and output prediction in interviews.</p>`,
    problems: [{
      title: 'Sequential Fetch Simulation: Run Async Tasks One After Another',
      level: 'Medium', tags: ['promise chain', 'reduce', 'sequential vs parallel'], companies: ['Amazon', 'Zomato', 'PayPal'],
      statement: `<p>You get an array of <b>task functions</b>. Each task, when called, returns a promise (think "fetch page N" with rate limits, so only one may run at a time). Write <code>runSequentially(tasks)</code> that starts task <i>i+1</i> only after task <i>i</i> has fulfilled, and resolves with the array of all results in order. If any task rejects, the whole thing rejects with that error and later tasks never start.</p>`,
      constraints: `0 ≤ tasks.length ≤ 10<sup>4</sup>. Tasks are functions (not promises) so they do not start early. Use only Promises (no async/await).`,
      example: `<p>tasks = fetch A (100 ms), fetch B (50 ms), fetch C (80 ms) → resolves <code>['A', 'B', 'C']</code> after ${H.c('y', '~230 ms')} (100 + 50 + 80), versus ~100 ms if run in parallel.</p>`,
      brute: { why: `<p>Calling all tasks in a <code>forEach</code> starts them <b>all at once</b> (parallel), so the "one at a time" rule is broken and results arrive in finish order. Pushing results into an array from each handler also gives the wrong order.</p>`, code: { lang: 'js', run: true, code: `
const fakeFetch = (name, ms) => () => new Promise((resolve) => {
  console.log('start', name);
  setTimeout(() => { console.log('end', name); resolve(name); }, ms);
});
const tasks = [fakeFetch('A', 100), fakeFetch('B', 50), fakeFetch('C', 80)];
const results = [];
tasks.forEach((t) => t().then((r) => results.push(r)));  // all start at once!
setTimeout(() => console.log('wrong order:', results), 200);
` } },
      mcq: { q: 'Why must the input be functions, not promises?', options: ['Promises cannot be stored in arrays', 'A promise means the work has already started; functions let us decide WHEN to start', 'Functions are faster', 'reduce only works on functions'], answer: 1, explain: 'Creating a promise starts the work immediately. To control timing you need a function that creates the promise on demand.' },
      hints: [`<p>Hint 1: you need a chain <code>Promise.resolve().then(t0).then(t1).then(t2)…</code> built from an array → that is a <code>reduce</code>.</p>`, `<p>Hint 2: the accumulator is "the promise of the results so far". In each step: <code>acc.then(results =&gt; tasks[i]().then(r =&gt; [...results, r]))</code>.</p>`, `<p>Hint 3: start the reduce with <code>Promise.resolve([])</code> so an empty list resolves to []. A rejection anywhere skips all later then-handlers automatically — no extra code needed.</p>`],
      tests: { sig: 'string string -> string', fn: '__tA', harness: { js: `function __runChild() {
  const fs = require('fs'), vm = require('vm'), util = require('util');
  process.on('unhandledRejection', () => {});
  process.on('uncaughtException', (e) => { process.stdout.write('@@ERROR uncaught ' + (e && e.stack || e) + '\\n'); process.exit(1); });
  const src = fs.readFileSync(process.env.SC_FILE, 'utf8');
  const body = src.slice(0, src.indexOf('/*@@' + 'END@@*/'));
  let now = 0, seq = 1, timers = [];
  const logs = [];
  const fake = {
    turns: 0, delays: [], uncaught: [],
    setTimeout(fn, ms, ...a) { const t = { id: seq++, at: now + Math.max(0, +ms || 0), fn, a }; timers.push(t); fake.delays.push(Math.max(0, +ms || 0)); return t.id; },
    clearTimeout(id) { timers = timers.filter((t) => t.id !== id); },
    now: () => now,
    pending: () => timers.length,
    reset() { timers = []; logs.length = 0; fake.delays.length = 0; fake.turns = 0; fake.uncaught.length = 0; },
    async flush(n = 60) { for (let i = 0; i < n; i++) await new Promise((r) => queueMicrotask(r)); },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        await fake.flush();
        timers.sort((a, b) => a.at - b.at || a.id - b.id);
        const t = timers[0];
        if (!t || t.at > end) break;
        timers.shift(); now = t.at; fake.turns++;
        try { t.fn(...t.a); } catch (e) { fake.uncaught.push(e && e.message); }
      }
      now = end; await fake.flush();
    }
  };
  const fmt = (x) => (typeof x === 'string' ? x : util.inspect(x, { depth: 3, breakLength: Infinity }));
  const ctx = vm.createContext({ console: { log: (...a) => logs.push({ t: now, s: a.map(fmt).join(' ') }), error() {}, warn() {} }, setTimeout: fake.setTimeout, clearTimeout: fake.clearTimeout, queueMicrotask, __fake: fake, __logs: logs });
  vm.runInContext(body, ctx, { filename: 'main.js' });
  (async () => {
    await fake.flush(100);
    const scenario = vm.runInContext('__scenario', ctx);
    const r = await scenario(process.env.SC_NAME, JSON.parse(process.env.SC_ARGS));
    process.stdout.write('@@RESULT ' + JSON.stringify(r === undefined ? null : r) + '\\n');
    process.exit(0);
  })().catch((e) => { process.stdout.write('@@ERROR ' + (e && e.stack || e) + '\\n'); process.exit(1); });
}
function __tA(name, argsJson) {
  const r = require('child_process').spawnSync(process.execPath, ['-e', '(' + __runChild.toString() + ')()'], {
    env: Object.assign({}, process.env, { SC_FILE: __filename, SC_NAME: name, SC_ARGS: argsJson || 'null' }), encoding: 'utf8', timeout: 20000, maxBuffer: 1 << 26
  });
  const m = /@@RESULT (.*)/.exec(r.stdout || '');
  if (!m) throw new Error('scenario failed: ' + String(r.stdout).slice(-400) + String(r.stderr).slice(-300));
  return JSON.parse(m[1]);
}
function __tD() { let res, rej; const p = new Promise((a, b) => { res = a; rej = b; }); return { p, res, rej }; }
function __tTrack(p) { const s = { st: 'pending' }; p.then((v) => { s.st = 'fulfilled'; s.v = v; }, (e) => { s.st = 'rejected'; s.e = e; }); return s; }
function __tEm(e) { return e !== null && typeof e === 'object' && 'message' in e ? e.name + ':' + e.message : e; }
function __tSum(s) { return s.st === 'fulfilled' ? ['ok', s.v] : s.st === 'rejected' ? ['err', __tEm(s.e)] : ['pending']; }
function __tBegin() { __fake.reset(); }
function __tTick(n) { return __fake.flush(n); }
function __tAdv(ms) { return __fake.advance(ms); }
function __tLater(ms, v, fail) { return new Promise((res, rej) => setTimeout(() => (fail ? rej(new Error(v)) : res(v)), ms)); }
async function __scenario(name) {
  const track = __tTrack, sum = __tSum, tick = __tTick, adv = __tAdv, later = __tLater, D = __tD; __tBegin();
  switch (name) {
    case 'gated': {
      const ds = [D(), D(), D()], started = []; const snap = [];
      const tasks = ds.map((d, i) => () => { started.push(i); return d.p; });
      const s = track(runSequentially(tasks)); await tick(); snap.push([...started]);
      ds[0].res('A'); await tick(); snap.push([...started]);
      ds[1].res('B'); await tick(); snap.push([...started], s.st);
      ds[2].res('C'); await tick(); snap.push(sum(s)); return snap;
    }
    case 'timed': {
      const starts = {}; const mkT = (n, ms) => () => { starts[n] = __fake.now(); return later(ms, n); };
      let finished = null; const s = track(runSequentially([mkT('A', 100), mkT('B', 50), mkT('C', 80)]).then((r) => { finished = __fake.now(); return r; }));
      await adv(1000); return { starts, finished, res: sum(s) };
    }
    case 'reject-stops': {
      const started = []; const mkT = (n, fail) => () => { started.push(n); return fail ? Promise.reject(new Error(n + ' failed')) : Promise.resolve(n); };
      const s = track(runSequentially([mkT('X'), mkT('Y', true), mkT('Z')])); await tick(); return { started, res: sum(s) };
    }
    case 'empty': { const s = track(runSequentially([])); await tick(); return sum(s); }
    case 'single': { const s = track(runSequentially([() => Promise.resolve('only')])); await tick(); return sum(s); }
    case 'falsy-results': { const s = track(runSequentially([() => Promise.resolve(0), () => Promise.resolve(''), () => Promise.resolve(null), () => Promise.resolve(undefined)])); await tick(); return sum(s); }
    case 'sync-throw': { const s = track(runSequentially([() => Promise.resolve(1), () => { throw new Error('thrown'); }, () => Promise.resolve(3)])); await tick(); return sum(s); }
    case 'first-rejects': { const started = []; const s = track(runSequentially([() => { started.push(1); return Promise.reject(new Error('first')); }, () => { started.push(2); return Promise.resolve(2); }])); await tick(); return [started, sum(s)]; }
    case 'big': {
      const n = 10000, started = []; const tasks = Array.from({ length: n }, (_, i) => () => { started.push(i); return Promise.resolve(i * 2); });
      const r = await runSequentially(tasks);
      return { len: r.length, first: r[0], last: r[n - 1], ordered: started.every((v, k) => v === k), startedCount: started.length };
    }
    case 'new-array': { const t = [() => Promise.resolve(1)]; const r1 = await runSequentially(t); const r2 = await runSequentially(t); return [r1 !== r2, r1, r2]; }
    case 'not-parallel': { let running = 0, peak = 0; const mkT = () => () => { running++; peak = Math.max(peak, running); return later(10).then(() => { running--; return 'x'; }); }; const s = track(runSequentially([mkT(), mkT(), mkT()])); await adv(100); return [peak, sum(s)]; }
  }
}
/*@@END@@*/` }, cases: [
        [["gated","null"],[[0],[0,1],[0,1,2],"pending",["ok",["A","B","C"]]]],
        [["timed","null"],{"starts":{"A":0,"B":100,"C":150},"finished":230,"res":["ok",["A","B","C"]]}],
        [["reject-stops","null"],{"started":["X","Y"],"res":["err","Error:Y failed"]}],
        [["empty","null"],["ok",[]]],
        [["single","null"],["ok",["only"]]],
        [["falsy-results","null"],["ok",[0,"",null,null]]],
        [["sync-throw","null"],["err","Error:thrown"]],
        [["first-rejects","null"],[[1],["err","Error:first"]]],
        [["big","null"],{"len":10000,"first":0,"last":19998,"ordered":true,"startedCount":10000}],
        [["new-array","null"],[true,[1],[1]]],
        [["not-parallel","null"],[1,["ok",["x","x","x"]]]]
      ] },
      solution: {
        approach: `<p>Fold the task list into one chain. The accumulator promise holds the results array; each step waits for it, then calls the next task, then appends its result. Because each task is only <b>called inside</b> the previous <code>.then</code>, they run strictly one at a time. Errors propagate down the chain and skip the rest.</p>`,
        code: { lang: 'js', run: true, code: `
function runSequentially(tasks) {
  return tasks.reduce(function (acc, task) {
    return acc.then(function (results) {
      return task().then(function (r) {   // start this task only now
        return results.concat([r]);         // new array, keep order
      });
    });
  }, Promise.resolve([]));                  // empty input → []
}

// fake fetch that logs start/end so we can see the timing
const t0 = Date.now();
const fakeFetch = (name, ms, fail) => () => new Promise((resolve, reject) => {
  console.log('start', name, 'at', Date.now() - t0, 'ms');
  setTimeout(() => (fail ? reject(new Error(name + ' failed')) : resolve(name)), ms);
});

runSequentially([fakeFetch('A', 100), fakeFetch('B', 50), fakeFetch('C', 80)])
  .then((all) => {
    console.log('results', all, 'total ~', Date.now() - t0, 'ms');
    // Parallel version for comparison: start all now, Promise.all keeps input order
    const t1 = Date.now();
    return Promise.all([fakeFetch('A', 100), fakeFetch('B', 50), fakeFetch('C', 80)].map((f) => f()))
      .then((r) => console.log('parallel', r, 'total ~', Date.now() - t1, 'ms'));
  })
  .then(() => runSequentially([fakeFetch('X', 10), fakeFetch('Y', 10, true), fakeFetch('Z', 10)]))
  .catch((e) => console.log('stopped early:', e.message, '(Z never started)'));
` },
        dry: { head: ['time (ms)', 'event', 'acc holds'], rows: [['0', 'start A', 'Promise([])'], ['100', 'A done → start B', "['A']"], ['150', 'B done → start C', "['A','B']"], ['230', 'C done → resolve', "['A','B','C']"]] },
        complexity: `<p>Time = sum of task durations (by design). O(n) promises. <code>concat</code> copies make it O(n²) element copies for huge n; push into one shared array instead if n is large.</p>`,
        followUps: ['Rewrite with async/await and a for...of loop.', 'Allow at most K tasks at once (a concurrency pool).', 'Continue after failures and collect {status, value/reason} like allSettled.']
      }
    }]
  });

  /* ================= TOPIC 5: Promise.all / allSettled / race / any ================= */
  topics.push({
    title: 'Promise.all, allSettled, race and any: Combining Many Promises',
    analogy: `<p>You invite four friends to dinner and wait at the restaurant.</p>
<ul><li><b>all</b> — "We order when <b>everyone</b> is here. If <b>anyone</b> cancels, dinner is off." (all-or-nothing)</li>
<li><b>allSettled</b> — "I'll wait until everyone has either <b>arrived or cancelled</b>, then write down who did what." (full report)</li>
<li><b>race</b> — "Whoever reaches me <b>first</b> — or whoever <b>texts first</b> to cancel — decides the evening." (first to settle)</li>
<li><b>any</b> — "As soon as <b>one</b> friend arrives, we eat. Only if <b>everyone</b> cancels do I go home sad." (first success)</li></ul>`,
    explain: `<p>🟢 <b>The plain idea.</b> Often you start several async jobs <b>at the same time</b> and need one combined answer. Each combinator takes an <b>iterable</b> (usually an array) of promises (or plain values) and returns <b>one</b> promise:</p>
${H.table(['Combinator', 'Fulfils when…', 'Rejects when…', 'Result', 'Empty input []'], [['<code>Promise.all</code>', 'ALL fulfil', 'the FIRST one rejects (fail-fast)', 'array of values, <b>input order</b>', 'fulfils with <code>[]</code>'], ['<code>Promise.allSettled</code> (ES2020)', 'ALL settle (never rejects)', '— never', '<code>[{status, value}|{status, reason}]</code>', 'fulfils with <code>[]</code>'], ['<code>Promise.race</code>', 'the FIRST to settle fulfils', 'the FIRST to settle rejects', 'that one value / reason', H.c('r', 'pending forever')], ['<code>Promise.any</code> (ES2021)', 'the FIRST one fulfils', 'ALL reject', 'first value, or <code>AggregateError</code> with <code>.errors</code>', 'rejects with AggregateError']])}
<p>🔵 <b>Important details</b></p>
<ul>
<li><b>They don't start anything.</b> The jobs were already running the moment you created the promises. The combinator only <i>watches</i>. That is why <code>Promise.all([f(), g()])</code> is parallel.</li>
<li><b>They don't cancel the losers.</b> When <code>all</code> rejects early or <code>race</code> has a winner, the other jobs keep running; their results are just ignored. Use <code>AbortController</code> to really cancel.</li>
<li><b>Order:</b> <code>all</code> and <code>allSettled</code> return results in <b>input order</b>, not finishing order.</li>
<li><b>Plain values</b> are wrapped with <code>Promise.resolve</code>, so <code>Promise.all([1, p])</code> works.</li>
</ul>
<p><b>Which one?</b> Need every result and any failure is fatal → <code>all</code>. Dashboard of independent widgets → <code>allSettled</code>. Timeout ("whichever is first: the data or the timer") → <code>race</code>. Fastest of several mirrors/CDNs, ignore failures → <code>any</code>.</p>`,
    clues: ['"Fetch these N independent things as fast as possible" → start all, <code>Promise.all</code> (total ≈ max, not sum)', '"Show partial results even if some fail" → <code>Promise.allSettled</code>', '"Add a timeout to a request" → <code>Promise.race([request, timeoutPromise])</code>', '"First successful response from several servers / mirrors" → <code>Promise.any</code>', '"Implement Promise.all polyfill" → counter + results by index + first rejection wins', '"Results must be in the same order as input" → store by index, not by push'],
    code: [{ lang: 'js', run: true, title: 'All four combinators on the same three jobs', code: `
const t0 = Date.now();
// job(name, ms, ok): settles after ms; fulfils with name if ok, else rejects
function job(name, ms, ok) {
  return new Promise((resolve, reject) =>
    setTimeout(() => (ok ? resolve(name) : reject(new Error(name + ' failed'))), ms));
}
const make = () => [job('A', 300, true), job('B', 100, false), job('C', 200, true)];
const at = () => (Date.now() - t0) + 'ms';

Promise.all(make())
  .then((v) => console.log('all fulfilled', v))
  .catch((e) => console.log('all       rejected at ~100ms:', e.message, '| measured', at()));

Promise.allSettled(make())
  .then((r) => console.log('allSettled at ~300ms:', r.map((x) => x.status + ':' + (x.value || x.reason.message)).join(', '), '|', at()));

Promise.race(make())
  .then((v) => console.log('race fulfilled', v))
  .catch((e) => console.log('race      rejected at ~100ms:', e.message, '(B settled first)'));

Promise.any(make())
  .then((v) => console.log('any       fulfilled at ~200ms:', v, '(first SUCCESS)'));
` }, { lang: 'js', run: true, title: 'Edge cases: empty input, plain values, AggregateError', code: `
Promise.all([]).then((v) => console.log('all([]) ->', v));
Promise.allSettled([]).then((v) => console.log('allSettled([]) ->', v));
Promise.any([]).catch((e) => console.log('any([]) ->', e.constructor.name, e.errors));
Promise.all([1, Promise.resolve(2), 'three']).then((v) => console.log('plain values ok:', v));

Promise.any([Promise.reject(new Error('x')), Promise.reject(new Error('y'))])
  .catch((e) => console.log('all rejected ->', e.name, e.errors.map((er) => er.message)));

// race([]) never settles; we only prove it is still pending after 50 ms
let settled = false;
Promise.race([]).then(() => { settled = true; });
setTimeout(() => console.log('race([]) settled after 50ms?', settled), 50);
` }],
    codeTitle: ['All four combinators (runnable)', 'Edge cases (runnable)'],
    viz: {
      title: 'Timeline: how all / allSettled / race / any react',
      input: 'A:300:ok, B:100:fail, C:200:ok',
      inputLabel: 'Jobs as name:ms:ok|fail, comma separated (1 to 6)',
      gen: function (input) {
        var jobs = items(input).map(function (s, i) {
          var m = s.split(':').map(function (x) { return x.trim(); });
          if (m.length !== 3 || isNaN(Number(m[1])) || Number(m[1]) < 0 || (m[2] !== 'ok' && m[2] !== 'fail')) throw new Error('Use name:ms:ok or name:ms:fail, e.g. A:300:ok, B:100:fail');
          return { name: m[0], t: Number(m[1]), ok: m[2] === 'ok', i: i, st: 'pending' };
        });
        if (!jobs.length || jobs.length > 6) throw new Error('Give 1 to 6 jobs');
        var comb = {
          all: { st: 'pending', res: '—' }, allSettled: { st: 'pending', res: '—' },
          race: { st: 'pending', res: '—' }, any: { st: 'pending', res: '—' }
        };
        function jobRows() { return jobs.map(function (j) { return [j.name, j.t + ' ms', j.ok ? 'fulfil' : 'reject', j.st === 'pending' ? 'pending' : j.st === 'fulfilled' ? H.c('g', 'fulfilled ' + j.name) : H.c('r', 'rejected ' + j.name)]; }); }
        function combRows() { return ['all', 'allSettled', 'race', 'any'].map(function (k) { var c = comb[k]; return ['Promise.' + k, c.st === 'pending' ? 'pending' : c.st === 'fulfilled' ? H.c('g', 'fulfilled') : H.c('r', 'rejected'), c.res, c.at === undefined ? '' : c.at + ' ms']; }); }
        var frames = [];
        frames.push(fr('At <b>0 ms</b> all ' + jobs.length + ' jobs are started at once (that is what creating the promises does). All four combinators are watching the same jobs.', [
          { type: 'bars', label: 'settle time (ms)', values: jobs.map(function (j) { return j.t; }), idxLabels: jobs.map(function (j) { return j.name + (j.ok ? ' ✓' : ' ✗'); }) },
          { type: 'table', label: 'Jobs', columns: ['job', 'settles at', 'outcome', 'state'], rows: jobRows() },
          { type: 'table', label: 'Combinators', columns: ['combinator', 'state', 'result', 'settled at'], rows: combRows() }
        ]));
        var order = jobs.slice().sort(function (a, b) { return a.t - b.t || a.i - b.i; });
        var settledCount = 0, rejectedCount = 0, changedAny;
        order.forEach(function (j) {
          j.st = j.ok ? 'fulfilled' : 'rejected';
          settledCount++; if (!j.ok) rejectedCount++;
          var notes = [], hlc = {};
          // race
          if (comb.race.st === 'pending') { comb.race.st = j.st; comb.race.res = j.ok ? '"' + j.name + '"' : 'Error(' + j.name + ')'; comb.race.at = j.t; notes.push('<b>race</b> settles with the first settled job (' + j.name + ')'); hlc[2] = j.ok ? 'ok' : 'bad'; }
          // any
          if (comb.any.st === 'pending') {
            if (j.ok) { comb.any.st = 'fulfilled'; comb.any.res = '"' + j.name + '"'; comb.any.at = j.t; notes.push('<b>any</b> fulfils with the first success (' + j.name + ')'); hlc[3] = 'ok'; }
            else if (rejectedCount === jobs.length) { comb.any.st = 'rejected'; comb.any.res = 'AggregateError(' + jobs.length + ' errors)'; comb.any.at = j.t; notes.push('<b>any</b> rejects: every job failed → AggregateError'); hlc[3] = 'bad'; }
          }
          // all
          if (comb.all.st === 'pending') {
            if (!j.ok) { comb.all.st = 'rejected'; comb.all.res = 'Error(' + j.name + ')'; comb.all.at = j.t; notes.push('<b>all</b> fails fast on the first rejection (' + j.name + ') — the others keep running but are ignored'); hlc[0] = 'bad'; }
            else if (settledCount === jobs.length) { comb.all.st = 'fulfilled'; comb.all.res = '[' + jobs.map(function (x) { return '"' + x.name + '"'; }).join(', ') + ']'; comb.all.at = j.t; notes.push('<b>all</b> fulfils: every job succeeded; values in <b>input order</b>'); hlc[0] = 'ok'; }
          }
          // allSettled
          if (settledCount === jobs.length) { comb.allSettled.st = 'fulfilled'; comb.allSettled.res = '[' + jobs.map(function (x) { return x.ok ? 'ok:' + x.name : 'err:' + x.name; }).join(', ') + ']'; comb.allSettled.at = j.t; notes.push('<b>allSettled</b> fulfils with a status report for every job (input order)'); hlc[1] = 'sel'; }
          var jh = {}; jh[j.i] = j.ok ? 'ok' : 'bad';
          frames.push(fr('<b>' + j.t + ' ms</b>: job <b>' + j.name + '</b> ' + (j.ok ? '<span class="c-g">fulfils</span>' : '<span class="c-r">rejects</span>') + '. ' + (notes.length ? notes.join('; ') + '.' : 'No combinator changes state this time.'), [
            { type: 'table', label: 'Jobs', columns: ['job', 'settles at', 'outcome', 'state'], rows: jobRows(), hl: jh },
            { type: 'table', label: 'Combinators', columns: ['combinator', 'state', 'result', 'settled at'], rows: combRows(), hl: hlc }
          ]));
        });
        var maxT = Math.max.apply(null, jobs.map(function (j) { return j.t; }));
        var sumT = jobs.reduce(function (a, j) { return a + j.t; }, 0);
        frames.push(fr('Summary. Running in parallel, everything is known by <b>' + maxT + ' ms</b>. Awaiting the same jobs <b>one after another</b> would take <b>' + sumT + ' ms</b>. Note the input order of results is kept even though jobs finished in a different order.', [
          { type: 'table', label: 'Combinators (final)', columns: ['combinator', 'state', 'result', 'settled at'], rows: combRows() },
          { type: 'bars', label: 'total time (ms)', values: [sumT, maxT], idxLabels: ['sequential', 'parallel'], hl: { 0: 'bad', 1: 'ok' } }
        ]));
        return frames;
      }
    },
    examples: [
      { title: 'Sequential vs parallel fetch simulation', html: `<p>Three fake requests of 100 ms each. Awaiting one by one in a chain = <b>~300 ms</b>. Starting all and using <code>Promise.all</code> = <b>~100 ms</b>. The only change: <b>when</b> each promise is created.</p>`, code: { lang: 'js', run: true, code: `
const fakeFetch = (url) => new Promise((resolve) => setTimeout(() => resolve('data from ' + url), 100));
const urls = ['/a', '/b', '/c'];

const t0 = Date.now();
fakeFetch(urls[0])
  .then(() => fakeFetch(urls[1]))   // starts only after /a finished
  .then(() => fakeFetch(urls[2]))
  .then(() => {
    console.log('sequential ~', Date.now() - t0, 'ms');
    const t1 = Date.now();
    return Promise.all(urls.map(fakeFetch))         // all three start now
      .then((r) => console.log('parallel ~', Date.now() - t1, 'ms', r));
  });
` } },
      { title: 'Timeout with race (and clearing the timer)', html: `<p>Race the real work against a timer that rejects. Always <b>clear the timer</b> afterwards, or it keeps the Node process alive / fires a pointless rejection. Remember race does not stop the slow request — pair it with <code>AbortController</code> in real code.</p>`, code: { lang: 'js', run: true, code: `
function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout after ' + ms + ' ms')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
const slow = new Promise((r) => setTimeout(() => r('slow data'), 200));
const fast = new Promise((r) => setTimeout(() => r('fast data'), 20));
withTimeout(slow, 50).then(console.log, (e) => console.log('slow:', e.message));
withTimeout(fast, 50).then((v) => console.log('fast:', v));
` } },
      { title: 'any: fastest healthy mirror', html: `<p><code>Promise.any</code> ignores failures until one succeeds. Perfect for "try 3 CDN mirrors, use whichever answers first successfully". If all fail, inspect <code>err.errors</code> (an array, in input order).</p>`, code: { lang: 'js', run: true, code: `
const mirror = (name, ms, ok) => new Promise((res, rej) =>
  setTimeout(() => (ok ? res(name) : rej(new Error(name + ' down'))), ms));
Promise.any([mirror('eu', 30, false), mirror('us', 80, true), mirror('asia', 50, true)])
  .then((m) => console.log('using mirror:', m)); // asia (first success, eu failed first)
` } },
      { title: 'allSettled: a dashboard that survives failures', html: `<p>Each widget loads independently. With <code>all</code>, one broken widget would blank the whole dashboard. With <code>allSettled</code> we render what worked and show an error card for the rest.</p>`, code: { lang: 'js', run: true, code: `
const widget = (name, ok) => (ok ? Promise.resolve(name + ' data') : Promise.reject(new Error(name + ' API 500')));
Promise.allSettled([widget('sales', true), widget('weather', false), widget('news', true)])
  .then((results) => results.forEach((r, i) =>
    console.log(i, r.status === 'fulfilled' ? 'render ' + r.value : 'error card: ' + r.reason.message)));
` } }
    ],
    deepDive: `<p>🟣 <b>Spec behaviour.</b> All four call <code>C.resolve(x)</code> (default <code>Promise.resolve</code>) on each item, then <code>.then</code> on it — so they accept thenables, plain values and subclasses. They iterate the input <b>synchronously</b>; an iterator that throws makes the result reject. <code>Promise.all</code> keeps a "remaining elements" counter starting at 1 (decremented once after iteration) so that synchronous resolution can't finish early.</p>
<p><b>No cancellation in the language.</b> Promises are values, not tasks; there is no <code>.cancel()</code>. Losers of <code>race</code>/<code>any</code> and the survivors of a failed <code>all</code> keep consuming sockets, CPU and rate-limit budget. Real systems pass an <code>AbortSignal</code> (<code>fetch(url, { signal })</code>, <code>AbortSignal.timeout(ms)</code>, <code>AbortSignal.any([...])</code>) and abort the rest on the first failure.</p>
<p><b>Unhandled rejections inside all.</b> If two jobs reject, <code>all</code> rejects with the first; the second rejection is still "handled" (all attached a handler), so it is silently dropped — you lose that error. Use <code>allSettled</code> when you need every error.</p>
<p><b>Too much parallelism.</b> <code>Promise.all(10_000 urls.map(fetch))</code> opens thousands of sockets, hits rate limits and memory. Use a <b>concurrency limit</b> (pool of K workers, <code>p-limit</code>) or batches. And <code>Promise.race([])</code> is pending forever — guard empty inputs in timeout helpers.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI tools reach for <code>Promise.all</code> by default. That is often right, but they rarely ask "should one failure kill everything?" or "how many requests will this fire at once?". AI agents themselves are a great example: fan-out tool calls in parallel, collect with <code>allSettled</code>, and race against a timeout budget.</p>
<p><b>Use AI as a partner:</b> <code>For each Promise.all in this repo, tell me what happens if one item rejects and whether the others should be cancelled</code>; <code>Add an AbortSignal so losers are cancelled</code>; <code>Limit this to 5 concurrent requests</code>.</p>
<p><b>Where AI goes wrong:</b> mixing up <code>race</code> and <code>any</code> (race also settles on the first <i>failure</i>); assuming <code>all</code> returns results in completion order; forgetting <code>race([])</code> hangs; writing timeouts that never clear their timer. <b>What you must still own:</b> choosing the combinator from the failure semantics, explaining sum-vs-max timing, and implementing <code>Promise.all</code> from scratch in an interview.</p>`,
    problems: [{
      title: 'Implement Promise.all (polyfill)',
      level: 'Medium', tags: ['polyfill', 'promises', 'counter'], companies: ['Google', 'Amazon', 'Walmart', 'Razorpay'],
      statement: `<p>Write <code>promiseAll(iterable)</code> that behaves like <code>Promise.all</code>: returns a promise that fulfils with an array of all values <b>in input order</b> once every item fulfils, or rejects with the <b>first</b> rejection reason. Items may be promises, thenables or plain values. An empty input fulfils with <code>[]</code>.</p>`,
      constraints: `Do not use Promise.all / allSettled. Results must be in input order regardless of finish order. Must reject as soon as any item rejects.`,
      example: `<pre>promiseAll([delay(30, 'a'), 'b', delay(10, 'c')])  // → ['a', 'b', 'c'] after ~30 ms
promiseAll([delay(30, 'a'), Promise.reject('x')])   // → rejects 'x' immediately</pre><p>${H.c('g', 'c finished first')} but sits at index 2 — we write by index, not push.</p>`,
      brute: { why: `<p>A sequential loop (await item 0, then item 1, …) gives the right values but waits for each in turn and rejects late; pushing in a <code>.then</code> gives completion order. Both are wrong for an interview.</p>`, code: { lang: 'js', run: true, code: `
const delay = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));
function allWrongOrder(list) {
  return new Promise((resolve) => {
    const out = [];
    list.forEach((p) => Promise.resolve(p).then((v) => {
      out.push(v);                                 // completion order!
      if (out.length === list.length) resolve(out);
    }));                                           // and rejections are never handled
  });
}
allWrongOrder([delay(30, 'a'), 'b', delay(10, 'c')]).then((v) => console.log('wrong:', v)); // [ 'b', 'c', 'a' ]
` } },
      mcq: { q: 'How do you know when all items have fulfilled?', options: ['Check results.length === n after each push', 'Keep a counter of fulfilled items and resolve when it reaches n', 'Use setTimeout to wait long enough', 'Compare to the last item'], answer: 1, explain: 'results[i] = v on a sparse array makes length jump early (setting index 2 first gives length 3). A separate counter is reliable.' },
      hints: [`<p>Hint 1: convert the iterable with <code>Array.from</code>; wrap each item with <code>Promise.resolve(item)</code> so values and thenables behave like promises.</p>`, `<p>Hint 2: <code>results[i] = value</code> (by index) and <code>remaining--</code>; when it hits 0, resolve(results). Pass <code>reject</code> directly as the error handler — a promise ignores later calls, so "first rejection wins" is automatic.</p>`, `<p>Hint 3: edge case: empty input → resolve([]) immediately (otherwise you never resolve). Don't rely on <code>results.length</code> — sparse arrays lie.</p>`],
      tests: { sig: 'string string -> string', fn: '__tA', harness: { js: `function __runChild() {
  const fs = require('fs'), vm = require('vm'), util = require('util');
  process.on('unhandledRejection', () => {});
  process.on('uncaughtException', (e) => { process.stdout.write('@@ERROR uncaught ' + (e && e.stack || e) + '\\n'); process.exit(1); });
  const src = fs.readFileSync(process.env.SC_FILE, 'utf8');
  const body = src.slice(0, src.indexOf('/*@@' + 'END@@*/'));
  let now = 0, seq = 1, timers = [];
  const logs = [];
  const fake = {
    turns: 0, delays: [], uncaught: [],
    setTimeout(fn, ms, ...a) { const t = { id: seq++, at: now + Math.max(0, +ms || 0), fn, a }; timers.push(t); fake.delays.push(Math.max(0, +ms || 0)); return t.id; },
    clearTimeout(id) { timers = timers.filter((t) => t.id !== id); },
    now: () => now,
    pending: () => timers.length,
    reset() { timers = []; logs.length = 0; fake.delays.length = 0; fake.turns = 0; fake.uncaught.length = 0; },
    async flush(n = 60) { for (let i = 0; i < n; i++) await new Promise((r) => queueMicrotask(r)); },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        await fake.flush();
        timers.sort((a, b) => a.at - b.at || a.id - b.id);
        const t = timers[0];
        if (!t || t.at > end) break;
        timers.shift(); now = t.at; fake.turns++;
        try { t.fn(...t.a); } catch (e) { fake.uncaught.push(e && e.message); }
      }
      now = end; await fake.flush();
    }
  };
  const fmt = (x) => (typeof x === 'string' ? x : util.inspect(x, { depth: 3, breakLength: Infinity }));
  const ctx = vm.createContext({ console: { log: (...a) => logs.push({ t: now, s: a.map(fmt).join(' ') }), error() {}, warn() {} }, setTimeout: fake.setTimeout, clearTimeout: fake.clearTimeout, queueMicrotask, __fake: fake, __logs: logs });
  vm.runInContext(body, ctx, { filename: 'main.js' });
  (async () => {
    await fake.flush(100);
    const scenario = vm.runInContext('__scenario', ctx);
    const r = await scenario(process.env.SC_NAME, JSON.parse(process.env.SC_ARGS));
    process.stdout.write('@@RESULT ' + JSON.stringify(r === undefined ? null : r) + '\\n');
    process.exit(0);
  })().catch((e) => { process.stdout.write('@@ERROR ' + (e && e.stack || e) + '\\n'); process.exit(1); });
}
function __tA(name, argsJson) {
  const r = require('child_process').spawnSync(process.execPath, ['-e', '(' + __runChild.toString() + ')()'], {
    env: Object.assign({}, process.env, { SC_FILE: __filename, SC_NAME: name, SC_ARGS: argsJson || 'null' }), encoding: 'utf8', timeout: 20000, maxBuffer: 1 << 26
  });
  const m = /@@RESULT (.*)/.exec(r.stdout || '');
  if (!m) throw new Error('scenario failed: ' + String(r.stdout).slice(-400) + String(r.stderr).slice(-300));
  return JSON.parse(m[1]);
}
function __tD() { let res, rej; const p = new Promise((a, b) => { res = a; rej = b; }); return { p, res, rej }; }
function __tTrack(p) { const s = { st: 'pending' }; p.then((v) => { s.st = 'fulfilled'; s.v = v; }, (e) => { s.st = 'rejected'; s.e = e; }); return s; }
function __tEm(e) { return e !== null && typeof e === 'object' && 'message' in e ? e.name + ':' + e.message : e; }
function __tSum(s) { return s.st === 'fulfilled' ? ['ok', s.v] : s.st === 'rejected' ? ['err', __tEm(s.e)] : ['pending']; }
function __tBegin() { __fake.reset(); }
function __tTick(n) { return __fake.flush(n); }
function __tAdv(ms) { return __fake.advance(ms); }
function __tLater(ms, v, fail) { return new Promise((res, rej) => setTimeout(() => (fail ? rej(new Error(v)) : res(v)), ms)); }
async function __scenario(name) {
  const track = __tTrack, sum = __tSum, tick = __tTick, adv = __tAdv, later = __tLater, D = __tD; __tBegin();
  switch (name) {
    case 'values-order': { const s = track(promiseAll([later(30, 'a'), 'b', later(10, 'c')])); await adv(29); const mid = s.st; await adv(1); return [mid, sum(s)]; }
    case 'reject-fast': { const s = track(promiseAll([later(50, 'slow'), later(10, 'boom', true)])); await adv(10); return [sum(s), __fake.now()]; }
    case 'empty': { const s = track(promiseAll([])); await tick(); return sum(s); }
    case 'set': { const s = track(promiseAll(new Set([1, 2]))); await tick(); return sum(s); }
    case 'string': { const s = track(promiseAll('ab')); await tick(); return sum(s); }
    case 'thenable': { const s = track(promiseAll([{ then(r) { r('t'); } }, 2])); await tick(); return sum(s); }
    case 'thenable-throws': { const s = track(promiseAll([{ then() { throw new Error('bad then'); } }])); await tick(); return sum(s); }
    case 'already-rejected': { const s = track(promiseAll([Promise.reject(new Error('x')), later(5, 'y')])); await tick(); return sum(s); }
    case 'two-rejections': { const s = track(promiseAll([later(30, 'late', true), later(10, 'early', true)])); await adv(30); return sum(s); }
    case 'index-order': { const s = track(promiseAll([later(30, 'a'), later(20, 'b'), later(10, 'c')])); await adv(30); return sum(s); }
    case 'plain': { const s = track(promiseAll([1, 2, 3])); await tick(); return sum(s); }
    case 'undefined-null': { const s = track(promiseAll([undefined, null])); await tick(); return sum(s); }
    case 'holes': { const s = track(promiseAll([1, , 3])); await tick(); return sum(s); }
    case 'wait-for-last': { const ds = [D(), D(), D()]; const s = track(promiseAll(ds.map((d) => d.p))); ds[2].res(3); ds[0].res(1); await tick(); const mid = s.st; ds[1].res(2); await tick(); return [mid, sum(s)]; }
    case 'duplicates': { const p = Promise.resolve('v'); const s = track(promiseAll([p, p])); await tick(); return sum(s); }
    case 'async-not-sync': { const s = track(promiseAll([1])); const immediate = s.st; await tick(); return [immediate, s.st]; }
    case 'big': { const n = 100000; const r = await promiseAll(Array.from({ length: n }, (_, i) => Promise.resolve(i))); return [r.length, r[0], r[n - 1], r.every((v, k) => v === k)]; }
    case 'generator': { function* g() { yield 1; yield Promise.resolve(2); } const s = track(promiseAll(g())); await tick(); return sum(s); }
  }
}
/*@@END@@*/` }, cases: [
        [["values-order","null"],["pending",["ok",["a","b","c"]]]],
        [["reject-fast","null"],[["err","Error:boom"],10]],
        [["empty","null"],["ok",[]]],
        [["set","null"],["ok",[1,2]]],
        [["string","null"],["ok",["a","b"]]],
        [["thenable","null"],["ok",["t",2]]],
        [["thenable-throws","null"],["err","Error:bad then"]],
        [["already-rejected","null"],["err","Error:x"]],
        [["two-rejections","null"],["err","Error:early"]],
        [["index-order","null"],["ok",["a","b","c"]]],
        [["plain","null"],["ok",[1,2,3]]],
        [["undefined-null","null"],["ok",[null,null]]],
        [["holes","null"],["ok",[1,null,3]]],
        [["wait-for-last","null"],["pending",["ok",[1,2,3]]]],
        [["duplicates","null"],["ok",["v","v"]]],
        [["async-not-sync","null"],["pending","fulfilled"]],
        [["big","null"],[100000,0,99999,true]],
        [["generator","null"],["ok",[1,2]]]
      ] },
      solution: {
        approach: `<p>Wrap everything in one <code>new Promise</code>. Subscribe to every item at once (so they are all watched in parallel). Store each value at its own index and count down; resolve at zero. Any rejection calls the outer <code>reject</code>; later settles are ignored because a promise settles once.</p>`,
        code: { lang: 'js', run: true, code: `
function promiseAll(iterable) {
  return new Promise(function (resolve, reject) {
    const items = Array.from(iterable);
    const results = new Array(items.length);
    let remaining = items.length;
    if (remaining === 0) return resolve([]);        // empty input

    items.forEach(function (item, i) {
      Promise.resolve(item).then(function (value) {  // values & thenables too
        results[i] = value;                          // keep INPUT order
        remaining--;
        if (remaining === 0) resolve(results);
      }, reject);                                    // first rejection wins
    });
  });
}

const delay = (ms, v, fail) => new Promise((res, rej) => setTimeout(() => (fail ? rej(new Error(v)) : res(v)), ms));
const t0 = Date.now();
promiseAll([delay(30, 'a'), 'b', delay(10, 'c')])
  .then((v) => console.log('fulfilled', v, '~' + (Date.now() - t0) + 'ms'));
promiseAll([delay(50, 'slow'), delay(10, 'boom', true)])
  .catch((e) => console.log('rejected fast with', e.message, '~' + (Date.now() - t0) + 'ms'));
promiseAll([]).then((v) => console.log('empty ->', v));
promiseAll(new Set([1, 2])).then((v) => console.log('any iterable ->', v));
` },
        dry: { head: ['time', 'event', 'results', 'remaining'], rows: [['0 ms', "'b' (plain) fulfils (microtask)", "[ , 'b', ]", '2'], ['10 ms', "index 2 → 'c'", "[ , 'b', 'c']", '1'], ['30 ms', "index 0 → 'a'", "['a','b','c']", H.c('g', '0 → resolve')]] },
        complexity: `<p>O(n) time and space. All items are watched concurrently, so wall time = slowest item (or first rejection).</p>`,
        followUps: ['Now write allSettled and any with the same skeleton.', 'Add a concurrency limit: never more than K tasks running.', 'Why can you pass reject directly without checking whether you already rejected?']
      }
    }]
  });

  /* ================= TOPIC 6: Error Propagation ================= */
  topics.push({
    title: 'Error Propagation: How Rejections Travel, Recover and Escape',
    analogy: `<p>Imagine a <b>relay race with a warning flag</b>. Normally runners pass the baton (the value). If one runner trips, they raise a <b>red flag</b> instead. Every runner after that just passes the red flag along without running their leg — until it reaches a <b>coach</b> (<code>.catch</code>). The coach can fix things and hand a fresh baton back to the race (recover), or shout "still broken!" and pass the flag on (rethrow).</p>
<p>But if someone trips <b>off the track</b> (inside a <code>setTimeout</code> that nobody returned), the flag never enters the relay at all — no coach will ever see it.</p>`,
    explain: `<p>🟢 <b>The plain idea.</b> In a promise chain, an error does not crash things immediately. It turns the current promise <b>rejected</b>, and the rejection <b>flows down</b> the chain, <b>skipping</b> every success handler, until it meets the first error handler (<code>.catch</code> or the 2nd argument of <code>.then</code>).</p>
<p>🔵 <b>Ways a chain becomes rejected</b></p>
<ul>
<li><code>throw</code> inside the executor or inside any handler.</li>
<li>Calling <code>reject(err)</code>, or returning <code>Promise.reject(err)</code> / a promise that later rejects.</li>
<li>A runtime bug inside a handler (e.g. <code>undefined.x</code> → TypeError) — same as a throw.</li>
</ul>
<p><b>What a catch can do</b></p>
${H.table(['Inside .catch you…', 'Chain after it is…', 'Use when'], [['return a value', H.c('g', 'fulfilled (recovered)'), 'you have a fallback (cached data, default)'], ['<code>throw err</code> (rethrow)', H.c('r', 'still rejected'), 'you only logged / added context'], ['<code>throw new Error(msg, { cause: err })</code>', H.c('r', 'rejected with a wrapped error'), 'add meaning, keep the original'], ['return nothing', H.c('y', 'fulfilled with undefined'), 'usually a bug: later steps think all is fine']])}
<p><b>Where errors escape the chain</b> (and become uncaught):</p>
<ul>
<li>A promise created inside a handler but <b>not returned</b> ("floating promise").</li>
<li>A <code>throw</code> inside a plain callback (<code>setTimeout</code>, event listener) inside a handler — it runs later, outside the chain.</li>
<li>A chain with <b>no catch at the end</b> → <b>unhandled rejection</b>. In Node 15+ that <b>crashes the process</b> by default; browsers log it and fire <code>unhandledrejection</code>.</li>
<li>A <code>try/catch</code> around code that only <i>starts</i> a promise — the rejection happens later, after the try has finished.</li>
</ul>
<p><b>Golden rules:</b> always <b>return</b> promises from handlers; end every chain with a <code>.catch</code> (or return the chain to a caller who handles it); reject with <b>Error objects</b> (they have stack traces), not strings.</p>`,
    clues: ['"Where will this error be caught?" → trace the chain: it skips <code>.then</code> success handlers to the next catch', '"What does the chain return after a catch?" → whatever the catch returns (recovered) unless it rethrows', '"UnhandledPromiseRejection / process crashed" → missing catch or a floating promise', '"try/catch doesn\'t catch my promise error" → the rejection is async; use <code>.catch</code> or <code>await</code> inside try', '"Retry on failure" → catch, then return a new attempt (recursion) with backoff', '"Keep the original error" → <code>new Error(msg, { cause })</code>'],
    code: [{ lang: 'js', run: true, title: 'Propagation, recovery, rethrow and wrapping', code: `
function step(name, fail) {
  return function (v) {
    if (fail) throw new Error(name + ' failed');
    console.log(name, 'ok, value =', v);
    return v + 1;
  };
}

Promise.resolve(1)
  .then(step('parse'))               // ok → 2
  .then(step('validate', true))      // throws → rejected
  .then(step('save'))                // SKIPPED
  .catch(function (err) {
    console.log('log + rethrow with context:', err.message);
    throw new Error('request failed', { cause: err });  // still rejected
  })
  .then(step('notify'))              // SKIPPED
  .catch(function (err) {
    console.log('final handler:', err.message, '| cause:', err.cause.message);
    return 'fallback';                // recovered
  })
  .then(function (v) { console.log('chain continues with', v); });
` }, { lang: 'js', run: true, title: 'Errors that escape the chain (and how to see them)', code: `
// Safety nets so you can see escapes (Node). In browsers use window 'unhandledrejection'.
if (typeof process !== 'undefined' && process.on) {
  process.on('unhandledRejection', (r) => console.log('[net] unhandledRejection:', r.message));
  process.on('uncaughtException', (e) => console.log('[net] uncaughtException:', e.message));
}

// 1) floating promise: created in a handler but not returned
Promise.resolve()
  .then(() => { Promise.reject(new Error('floating rejection')); }) // forgot return
  .catch(() => console.log('never runs for the floating one'));

// 2) throw inside a timer inside a handler: runs later, outside the chain
Promise.resolve()
  .then(() => { setTimeout(() => { throw new Error('thrown in timer'); }, 0); })
  .catch(() => console.log('never runs for the timer throw'));

// 3) try/catch around a promise that rejects later
try {
  Promise.reject(new Error('async rejection'));       // no .catch attached
} catch (e) {
  console.log('try/catch never sees it');
}
` }],
    codeTitle: ['Propagation, rethrow, cause (runnable)', 'Escaping errors (runnable)'],
    viz: {
      title: 'Follow the red flag: where does the error land?',
      input: 'then, then!, then, catch, then!, then, finally, catch',
      inputLabel: 'Links: then, then! (throws), catch, catch! (rethrows), finally, finally! (throws). Start with "reject" to begin rejected. Max 9.',
      gen: function (input) {
        var toks = items(input);
        var startRejected = false;
        if (toks[0] === 'reject') { startRejected = true; toks = toks.slice(1); }
        if (!toks.length || toks.length > 9) throw new Error('Give 1 to 9 links, e.g. then, then!, catch, then');
        toks.forEach(function (t) { if (!/^(then|catch|finally)!?$/.test(t)) throw new Error('Unknown link "' + t + '". Use then, then!, catch, catch!, finally, finally!'); });
        var n = toks.length + 2, perRow = Math.ceil(n / 2), nodes = [], edges = [];
        for (var i = 0; i < n; i++) {
          var row = i < perRow ? 0 : 1, col = row === 0 ? i : (n - 1 - i);
          var label = i === 0 ? (startRejected ? 'Promise.reject' : 'Promise.resolve') : i === n - 1 ? 'end of chain' : '.' + toks[i - 1].replace('!', '') + (toks[i - 1].indexOf('!') >= 0 ? ' (throws)' : '');
          nodes.push({ id: 'n' + i, label: label, x: 8 + col * (84 / Math.max(1, perRow - 1)), y: row === 0 ? 14 : 56, shape: 'box', w: 15 });
          if (i > 0) edges.push(['n' + (i - 1), 'n' + i]);
        }
        var hl = {}, ehl = {}, tags = {}, frames = [];
        var state = startRejected ? 'rejected' : 'fulfilled', reason = startRejected ? 'E0' : '', errN = startRejected ? 1 : 0;
        hl.n0 = startRejected ? 'bad' : 'ok'; tags.n0 = startRejected ? 'E0' : 'value';
        function snap() { var a = {}, b = {}, c = {}; Object.keys(hl).forEach(function (k) { a[k] = hl[k]; }); Object.keys(ehl).forEach(function (k) { b[k] = ehl[k]; }); Object.keys(tags).forEach(function (k) { c[k] = tags[k]; }); return { type: 'graph', label: 'Promise chain', directed: true, height: 70, nodes: nodes, edges: edges, hl: a, ehl: b, tags: c }; }
        frames.push(fr('The chain starts <b>' + state + '</b>' + (startRejected ? ' with error <b>E0</b>.' : ' with a value.') + ' Green arrows will carry values, red arrows carry errors.', [snap(), vp({ state: state, error: reason || '—' }, { state: state === 'fulfilled' ? 'ok' : 'bad' })]));
        toks.forEach(function (t, k) {
          var id = 'n' + (k + 1), kind = t.replace('!', ''), throws = t.indexOf('!') >= 0, narr = '', before = state;
          ehl['n' + k + '-' + id] = state === 'fulfilled' ? 'ok' : 'bad';
          if (kind === 'then') {
            if (state === 'rejected') { hl[id] = 'done'; tags[id] = 'skipped'; narr = 'Error <b>' + reason + '</b> arrives. <code>.then</code> has no error handler, so it is <span class="c-m">skipped</span> and the same error flows on.'; }
            else if (throws) { errN++; state = 'rejected'; reason = 'E' + errN; hl[id] = 'bad'; tags[id] = 'threw ' + reason; narr = 'The value arrives; this handler <b>throws</b> <b>' + reason + '</b>. Its promise is now <span class="c-r">rejected</span>.'; }
            else { hl[id] = 'ok'; tags[id] = 'ran'; narr = 'The value arrives and the handler runs normally, returning a new value.'; }
          } else if (kind === 'catch') {
            if (state === 'fulfilled') { hl[id] = 'done'; tags[id] = 'skipped'; narr = 'No error here, so <code>.catch</code> is <span class="c-m">skipped</span>; the value passes through.'; }
            else if (throws) { hl[id] = 'bad'; tags[id] = 'rethrew'; narr = '<code>.catch</code> catches <b>' + reason + '</b> but <b>rethrows</b> (maybe after logging). The chain <span class="c-r">stays rejected</span>.'; }
            else { hl[id] = 'sel'; tags[id] = 'handled ' + reason; narr = '<code>.catch</code> handles <b>' + reason + '</b> and returns a fallback. The chain is <span class="c-g">fulfilled again</span> — recovered!'; state = 'fulfilled'; reason = ''; }
          } else {
            if (throws) { errN++; state = 'rejected'; reason = 'E' + errN; hl[id] = 'bad'; tags[id] = 'threw ' + reason; narr = '<code>.finally</code> runs on any outcome — but it <b>throws</b>, so its new error <b>' + reason + '</b> replaces whatever was flowing.'; }
            else { hl[id] = 'win'; tags[id] = 'ran, passed through'; narr = '<code>.finally</code> runs on any outcome and passes the current ' + (state === 'fulfilled' ? 'value' : 'error <b>' + reason + '</b>') + ' through unchanged.'; }
          }
          frames.push(fr('Link ' + (k + 1) + ' (<code>.' + kind + (throws ? '</code> that throws' : '</code>') + '): ' + narr, [snap(), vp({ 'arrived as': before, 'leaves as': state, error: reason || '—' }, { 'leaves as': state === 'fulfilled' ? 'ok' : 'bad' })]));
        });
        var last = 'n' + (n - 1);
        ehl['n' + (n - 2) + '-' + last] = state === 'fulfilled' ? 'ok' : 'bad';
        hl[last] = state === 'fulfilled' ? 'ok' : 'bad';
        tags[last] = state === 'fulfilled' ? 'fulfilled ✓' : 'UNHANDLED ' + reason;
        frames.push(fr(state === 'fulfilled' ? 'The chain ends <b>fulfilled</b>: every error was handled.' : 'The chain ends <b>rejected</b> with <b>' + reason + '</b> and nothing after it — an <span class="c-r">unhandled rejection</span>. Node 15+ would crash; add a final <code>.catch</code> or return the chain to a caller who handles it.', [snap(), vp({ final: state, error: reason || '—' }, { final: state === 'fulfilled' ? 'ok' : 'bad' })]));
        return frames;
      }
    },
    examples: [
      { title: 'Where you put catch matters', html: `<p>A <code>.catch</code> in the <b>middle</b> recovers and lets later steps run (with the fallback value). A <code>.catch</code> at the <b>end</b> stops everything after the failure. Choose by asking: "can the rest still make sense without this step?"</p>`, code: { lang: 'js', run: true, code: `
const loadPrefs = () => Promise.reject(new Error('prefs service down'));

// middle catch: default prefs, continue rendering
loadPrefs()
  .catch(() => ({ theme: 'light' }))                      // recover here
  .then((prefs) => console.log('middle: render with', prefs.theme));

// end catch: one failure aborts the whole flow
loadPrefs()
  .then((prefs) => console.log('end: render with', prefs.theme)) // skipped
  .catch((e) => console.log('end: show error page:', e.message));
` } },
      { title: 'Predict the output: catch then finally then', html: `<p>Guess first! ${H.table(['line', 'logs?', 'why'], [['1', H.c('r', 'no'), 'the start promise is rejected'], ['2', 'yes: 2 bad', 'first error handler'], ['3', 'yes: 3 undefined', '2 returned nothing → fulfilled(undefined)'], ['4', 'yes: 4 finally', 'runs on both outcomes'], ['5', H.c('r', 'no'), '3 threw, but 5 is a success handler'], ['6', 'yes: 6 oops', 'the throw from 3 lands here']])}</p>`, code: { lang: 'js', run: true, code: `
Promise.reject(new Error('bad'))
  .then(() => console.log('1'))                                  // skipped
  .catch((e) => console.log('2', e.message))                     // handles, returns undefined
  .then((v) => { console.log('3', v); throw new Error('oops'); })
  .finally(() => console.log('4 finally'))
  .then(() => console.log('5'))                                  // skipped
  .catch((e) => console.log('6', e.message));
` } },
      { title: 'Throwing strings loses the stack', html: `<p><code>reject('not found')</code> works, but a string has no stack trace, no <code>name</code>, no <code>cause</code>. Always reject with <code>Error</code> (or a subclass like <code>class NotFoundError extends Error</code>) so logs show where it came from and handlers can check <code>instanceof</code>.</p>`, code: { lang: 'js', run: true, code: `
class NotFoundError extends Error {
  constructor(what) { super(what + ' not found'); this.name = 'NotFoundError'; }
}
Promise.reject(new NotFoundError('user 7'))
  .catch((e) => {
    if (e instanceof NotFoundError) console.log('404 for client:', e.message);
    else throw e;                          // unknown errors keep propagating
  });
Promise.reject('just a string').catch((e) => console.log('string has stack?', typeof e.stack));
` } },
      { title: 'Recover with a cache, but keep real bugs loud', html: `<p>A blanket <code>.catch(() =&gt; null)</code> hides programmer bugs (TypeError) together with expected failures (network). Catch narrowly: handle what you expect, rethrow the rest.</p>`, code: { lang: 'js', run: true, code: `
const cache = { price: 99 };
function getPrice(kind) {
  if (kind === 'net') return Promise.reject(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }));
  return Promise.resolve().then(() => undefined.price);   // a real bug: TypeError
}
function safePrice(kind) {
  return getPrice(kind).catch((e) => {
    if (e.code === 'ETIMEDOUT') return cache.price;       // expected → fallback
    throw e;                                              // bug → stay loud
  });
}
safePrice('net').then((p) => console.log('fallback price', p));
safePrice('bug').catch((e) => console.log('bug still visible:', e.name));
` } }
    ],
    deepDive: `<p>🟣 <b>How "handled" is tracked.</b> Each promise has a <code>[[PromiseIsHandled]]</code> flag. When a promise rejects with no handler attached, the host is told (<code>HostPromiseRejectionTracker</code>, operation "reject"); if a handler is attached later, it is told again ("handle"). Browsers fire <code>unhandledrejection</code> / <code>rejectionhandled</code> after the microtask checkpoint; Node checks after microtasks drain, then by default (<code>--unhandled-rejections=throw</code>, Node 15+) raises it as an uncaught exception and exits with code 1.</p>
<p><b>Late handlers.</b> Because detection waits for microtasks, attaching <code>.catch</code> in the same synchronous turn is fine. Attaching it after a <code>setTimeout</code> is too late: you get a warning/crash first. That is why you should create and handle promises together, or use <code>allSettled</code>.</p>
<p><b>Async stack traces.</b> V8 reconstructs "async" frames across <code>await</code> (zero-cost async stack traces), but pure <code>.then</code> chains give shorter traces. Wrapping with <code>{ cause }</code> (ES2022) keeps the original error and is printed by Node and DevTools. <code>AggregateError</code> carries many errors (<code>Promise.any</code>).</p>
<p><b>Retries done right.</b> Retry only <b>idempotent</b> operations and only <b>transient</b> errors (timeouts, 429, 503 — not 400/404). Use exponential backoff with <b>jitter</b> to avoid thundering herds, cap the delay and the attempts, honour <code>Retry-After</code>, and respect an overall deadline / <code>AbortSignal</code>.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI-generated code is famous for <code>.catch(err =&gt; console.log(err))</code> everywhere — which silently converts failures into <code>undefined</code> successes — and for floating promises in event handlers. Linters such as typescript-eslint's <code>no-floating-promises</code> and <code>no-misused-promises</code> catch many of these; turn them on.</p>
<p><b>Use AI as a partner:</b> <code>Trace this chain: for each line, say whether it runs on success, on failure, or both, and what the next promise becomes</code>; <code>Find catches that swallow errors and return undefined</code>; <code>Classify these errors as retryable or not</code>.</p>
<p><b>Where AI goes wrong:</b> retrying non-idempotent POSTs; retrying 400s; wrapping promise code in <code>try/catch</code> without <code>await</code>; losing the original error when re-throwing. <b>What you must still own:</b> deciding where to recover vs fail, designing error types, and proving that every chain ends in a handler.</p>`,
    problems: [{
      title: 'Retry with Exponential Backoff',
      level: 'Medium', tags: ['error handling', 'recursion', 'backoff'], companies: ['Stripe', 'Netflix', 'Microsoft', 'CRED'],
      statement: `<p>Write <code>retry(fn, { retries, baseDelay })</code>. <code>fn</code> returns a promise. Call it; if it rejects, wait <code>baseDelay × 2<sup>attempt</sup></code> ms and try again, up to <code>retries</code> extra attempts. Resolve with the first success. If all attempts fail, reject with the <b>last</b> error. Errors with <code>retryable === false</code> must fail immediately.</p>`,
      constraints: `0 ≤ retries ≤ 10, baseDelay ≥ 0. Use only Promises and setTimeout (no async/await). Total attempts = retries + 1.`,
      example: `<p>fn fails twice then succeeds; retries = 3, baseDelay = 20:</p><pre>attempt 1 → fail, wait 20 ms
attempt 2 → fail, wait 40 ms
attempt 3 → success → resolve</pre><p>${H.c('g', 'Resolved after ~60 ms')} with attempt 3's value. With retries = 1 it would reject with attempt 2's error.</p>`,
      brute: { why: `<p>Retrying immediately in a tight loop (no delay) hammers a struggling server and usually fails again for the same reason. A synchronous <code>for</code> loop also can't wait for the async result at all — it fires every attempt at once.</p>`, code: { lang: 'js', run: true, code: `
let calls = 0;
const flaky = () => (++calls < 3 ? Promise.reject(new Error('busy ' + calls)) : Promise.resolve('ok'));
// BAD: fires all attempts at the same moment, no waiting, ignores results order
const attempts = [];
for (let i = 0; i < 3; i++) attempts.push(flaky().catch((e) => e.message));
Promise.all(attempts).then((r) => console.log('all fired at once:', r));
` } },
      mcq: { q: 'What should the catch handler return to try again?', options: ['Nothing — the chain retries automatically', 'A new promise: wait(delay).then(() => attempt(n + 1))', 'throw the error', 'Promise.race of all attempts'], answer: 1, explain: 'Returning the next attempt\'s promise makes the outer chain follow it, so success or the final error flows to the caller.' },
      hints: [`<p>Hint 1: write an inner <code>attempt(n)</code> that returns <code>fn().catch(err =&gt; …)</code>. Recursion replaces the loop.</p>`, `<p>Hint 2: in the catch: if <code>n &gt;= retries</code> or <code>err.retryable === false</code>, <code>throw err</code>. Otherwise <code>return wait(baseDelay * 2 ** n).then(() =&gt; attempt(n + 1))</code>.</p>`, `<p>Hint 3: because each catch <b>returns</b> the next attempt, the first success fulfils the outer promise and the last error rejects it. Add jitter (random 0..delay) in production.</p>`],
      tests: { sig: 'string string -> string', fn: '__tA', harness: { js: `function __runChild() {
  const fs = require('fs'), vm = require('vm'), util = require('util');
  process.on('unhandledRejection', () => {});
  process.on('uncaughtException', (e) => { process.stdout.write('@@ERROR uncaught ' + (e && e.stack || e) + '\\n'); process.exit(1); });
  const src = fs.readFileSync(process.env.SC_FILE, 'utf8');
  const body = src.slice(0, src.indexOf('/*@@' + 'END@@*/'));
  let now = 0, seq = 1, timers = [];
  const logs = [];
  const fake = {
    turns: 0, delays: [], uncaught: [],
    setTimeout(fn, ms, ...a) { const t = { id: seq++, at: now + Math.max(0, +ms || 0), fn, a }; timers.push(t); fake.delays.push(Math.max(0, +ms || 0)); return t.id; },
    clearTimeout(id) { timers = timers.filter((t) => t.id !== id); },
    now: () => now,
    pending: () => timers.length,
    reset() { timers = []; logs.length = 0; fake.delays.length = 0; fake.turns = 0; fake.uncaught.length = 0; },
    async flush(n = 60) { for (let i = 0; i < n; i++) await new Promise((r) => queueMicrotask(r)); },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        await fake.flush();
        timers.sort((a, b) => a.at - b.at || a.id - b.id);
        const t = timers[0];
        if (!t || t.at > end) break;
        timers.shift(); now = t.at; fake.turns++;
        try { t.fn(...t.a); } catch (e) { fake.uncaught.push(e && e.message); }
      }
      now = end; await fake.flush();
    }
  };
  const fmt = (x) => (typeof x === 'string' ? x : util.inspect(x, { depth: 3, breakLength: Infinity }));
  const ctx = vm.createContext({ console: { log: (...a) => logs.push({ t: now, s: a.map(fmt).join(' ') }), error() {}, warn() {} }, setTimeout: fake.setTimeout, clearTimeout: fake.clearTimeout, queueMicrotask, __fake: fake, __logs: logs });
  vm.runInContext(body, ctx, { filename: 'main.js' });
  (async () => {
    await fake.flush(100);
    const scenario = vm.runInContext('__scenario', ctx);
    const r = await scenario(process.env.SC_NAME, JSON.parse(process.env.SC_ARGS));
    process.stdout.write('@@RESULT ' + JSON.stringify(r === undefined ? null : r) + '\\n');
    process.exit(0);
  })().catch((e) => { process.stdout.write('@@ERROR ' + (e && e.stack || e) + '\\n'); process.exit(1); });
}
function __tA(name, argsJson) {
  const r = require('child_process').spawnSync(process.execPath, ['-e', '(' + __runChild.toString() + ')()'], {
    env: Object.assign({}, process.env, { SC_FILE: __filename, SC_NAME: name, SC_ARGS: argsJson || 'null' }), encoding: 'utf8', timeout: 20000, maxBuffer: 1 << 26
  });
  const m = /@@RESULT (.*)/.exec(r.stdout || '');
  if (!m) throw new Error('scenario failed: ' + String(r.stdout).slice(-400) + String(r.stderr).slice(-300));
  return JSON.parse(m[1]);
}
function __tD() { let res, rej; const p = new Promise((a, b) => { res = a; rej = b; }); return { p, res, rej }; }
function __tTrack(p) { const s = { st: 'pending' }; p.then((v) => { s.st = 'fulfilled'; s.v = v; }, (e) => { s.st = 'rejected'; s.e = e; }); return s; }
function __tEm(e) { return e !== null && typeof e === 'object' && 'message' in e ? e.name + ':' + e.message : e; }
function __tSum(s) { return s.st === 'fulfilled' ? ['ok', s.v] : s.st === 'rejected' ? ['err', __tEm(s.e)] : ['pending']; }
function __tBegin() { __fake.reset(); }
function __tTick(n) { return __fake.flush(n); }
function __tAdv(ms) { return __fake.advance(ms); }
function __tLater(ms, v, fail) { return new Promise((res, rej) => setTimeout(() => (fail ? rej(new Error(v)) : res(v)), ms)); }
async function __scenario(name) {
  const track = __tTrack, sum = __tSum, adv = __tAdv; __tBegin();
  let attempts = 0;
  const failing = (k, msg = 'busy #') => () => { attempts++; return attempts <= k ? Promise.reject(new Error(msg + attempts)) : Promise.resolve('ok on call ' + attempts); };
  const run = async (fn, opts) => { const s = track(retry(fn, opts)); let at = null; s.p = null; await adv(100000); return { res: sum(s), attempts, delays: [...__fake.delays] }; };
  switch (name) {
    case 'success-after-2': { let finished = null; const s = track(retry(failing(2), { retries: 3, baseDelay: 20 }).then((v) => { finished = __fake.now(); return v; })); await adv(1000); return { res: sum(s), attempts, delays: [...__fake.delays], finished }; }
    case 'give-up': { let finished = null; const s = track(retry(failing(5), { retries: 2, baseDelay: 10 }).catch((e) => { finished = __fake.now(); throw e; })); await adv(1000); return { res: sum(s), attempts, delays: [...__fake.delays], finished }; }
    case 'not-retryable': return run(() => { attempts++; return Promise.reject(Object.assign(new Error('400 bad input'), { retryable: false })); }, { retries: 5, baseDelay: 10 });
    case 'retries-0': return run(failing(1), { retries: 0, baseDelay: 10 });
    case 'first-success': return run(failing(0), { retries: 3, baseDelay: 10 });
    case 'base-0': return run(failing(2), { retries: 3, baseDelay: 0 });
    case 'max-10': return run(() => { attempts++; return Promise.reject(new Error('fail #' + attempts)); }, { retries: 10, baseDelay: 1 });
    case 'midway-not-retryable': return run(() => { attempts++; return Promise.reject(attempts < 3 ? new Error('soft ' + attempts) : Object.assign(new Error('hard'), { retryable: false })); }, { retries: 5, baseDelay: 1 });
    case 'null-reason': return run(() => { attempts++; return attempts === 1 ? Promise.reject(null) : Promise.resolve('done'); }, { retries: 2, baseDelay: 5 });
    case 'string-reason': return run(() => { attempts++; return attempts === 1 ? Promise.reject('plain string') : Promise.resolve('done'); }, { retries: 2, baseDelay: 5 });
    case 'undefined-reason-final': return run(() => { attempts++; return Promise.reject(undefined); }, { retries: 1, baseDelay: 5 });
    case 'last-error-kept': return run(() => { attempts++; return Promise.reject(new Error('err' + attempts)); }, { retries: 2, baseDelay: 1 });
    case 'retryable-true': return run(() => { attempts++; return attempts < 2 ? Promise.reject(Object.assign(new Error('t'), { retryable: true })) : Promise.resolve('fine'); }, { retries: 3, baseDelay: 2 });
  }
}
/*@@END@@*/` }, cases: [
        [["success-after-2","null"],{"res":["ok","ok on call 3"],"attempts":3,"delays":[20,40],"finished":60}],
        [["give-up","null"],{"res":["err","Error:busy #3"],"attempts":3,"delays":[10,20],"finished":30}],
        [["not-retryable","null"],{"res":["err","Error:400 bad input"],"attempts":1,"delays":[]}],
        [["retries-0","null"],{"res":["err","Error:busy #1"],"attempts":1,"delays":[]}],
        [["first-success","null"],{"res":["ok","ok on call 1"],"attempts":1,"delays":[]}],
        [["base-0","null"],{"res":["ok","ok on call 3"],"attempts":3,"delays":[0,0]}],
        [["max-10","null"],{"res":["err","Error:fail #11"],"attempts":11,"delays":[1,2,4,8,16,32,64,128,256,512]}],
        [["midway-not-retryable","null"],{"res":["err","Error:hard"],"attempts":3,"delays":[1,2]}],
        [["null-reason","null"],{"res":["ok","done"],"attempts":2,"delays":[5]}],
        [["string-reason","null"],{"res":["ok","done"],"attempts":2,"delays":[5]}],
        [["undefined-reason-final","null"],{"res":["err",null],"attempts":2,"delays":[5]}],
        [["last-error-kept","null"],{"res":["err","Error:err3"],"attempts":3,"delays":[1,2]}],
        [["retryable-true","null"],{"res":["ok","fine"],"attempts":2,"delays":[2]}]
      ] },
      solution: {
        approach: `<p>Recursive chain: attempt n calls fn; on rejection either give up (rethrow) or return "wait, then attempt n + 1". Returning the promise from inside <code>.catch</code> links each retry into the same chain, so the caller sees just one promise.</p>`,
        code: { lang: 'js', run: true, code: `
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function retry(fn, opts) {
  const retries = opts.retries, baseDelay = opts.baseDelay;
  function attempt(n) {
    return fn(n).catch(function (err) {
      if (n >= retries || (err && err.retryable === false)) throw err; // give up: propagate (err may be null)
      const delay = baseDelay * Math.pow(2, n);               // 1x, 2x, 4x, ...
      console.log('  attempt ' + (n + 1) + ' failed (' + (err && err.message) + '), retrying in ' + delay + ' ms');
      return wait(delay).then(function () { return attempt(n + 1); });
    });
  }
  return attempt(0);
}

// flaky(k): fails the first k calls, then succeeds
function flaky(k) {
  let calls = 0;
  return function () {
    calls++;
    return calls <= k ? Promise.reject(new Error('busy #' + calls)) : Promise.resolve('ok on call ' + calls);
  };
}

const t0 = Date.now();
retry(flaky(2), { retries: 3, baseDelay: 20 })
  .then((v) => console.log('success:', v, '~' + (Date.now() - t0) + 'ms'))
  .then(() => retry(flaky(5), { retries: 2, baseDelay: 10 }))
  .catch((e) => console.log('gave up with last error:', e.message))
  .then(() => retry(() => Promise.reject(Object.assign(new Error('400 bad input'), { retryable: false })), { retries: 5, baseDelay: 10 }))
  .catch((e) => console.log('not retryable, failed fast:', e.message));
` },
        dry: { head: ['n', 'fn result', 'decision', 'wait'], rows: [['0', 'reject busy #1', 'n &lt; 3 → retry', '20 ms'], ['1', 'reject busy #2', 'n &lt; 3 → retry', '40 ms'], ['2', "fulfil 'ok on call 3'", H.c('g', 'resolve outer'), '—'], ['(case 2) 2', 'reject busy #3', H.c('r', 'n = retries → throw last error'), '—']] },
        complexity: `<p>At most retries + 1 calls. Worst-case waiting = baseDelay × (2<sup>retries</sup> − 1). Recursion depth is tiny (each level is a new promise, not a stack frame).</p>`,
        followUps: ['Add full jitter: delay = random(0, base × 2^n).', 'Stop early when an AbortSignal fires.', 'Honour a Retry-After value carried on the error.']
      }
    }]
  });

  /* ================= PRACTICE: Easy ================= */
  practice.push({
    title: 'Predict the Output: Sync, setTimeout and Promises',
    level: 'Easy', tags: ['predict output', 'event order'], companies: ['Amazon', 'Paytm', 'Infosys'],
    statement: `<p>Without running it, write down the exact console output of this program, then explain each position.</p><pre>console.log(1);
setTimeout(() =&gt; console.log(2), 0);
Promise.resolve().then(() =&gt; console.log(3));
new Promise((res) =&gt; { console.log(4); res(); }).then(() =&gt; console.log(5));
console.log(6);</pre>`,
    constraints: `Standard browser or Node.js. No other code runs.`,
    example: `<p>Answer: <b>1 4 6 3 5 2</b>. ${H.c('b', '1, 4, 6')} are synchronous (the executor runs immediately). ${H.c('g', '3, 5')} are promise handlers (microtasks) run right after the script. ${H.c('y', '2')} is a timer callback (task), which waits for the next turn.</p>`,
    brute: { why: `<p>The naive reading "top to bottom" gives 1 2 3 4 5 6. It ignores that setTimeout and then only <b>schedule</b> callbacks, and wrongly assumes the executor is async.</p>`, code: { lang: 'js', run: true, code: `
// Naive guess written as a comment: 1 2 3 4 5 6  (WRONG)
// Run the real thing and compare:
console.log(1);
setTimeout(() => console.log(2), 0);
Promise.resolve().then(() => console.log(3));
new Promise((res) => { console.log(4); res(); }).then(() => console.log(5));
console.log(6);
` } },
    mcq: { q: 'Why does 4 print before 6?', options: ['The Promise executor runs synchronously during new Promise', 'Promises are faster than console.log', 'Because 4 < 6', 'Microtasks run first'], answer: 0, explain: 'The executor function is called immediately by the constructor; only .then handlers are deferred.' },
    hints: [`<p>Hint 1: first list only the lines that run <b>immediately</b>: plain console.log calls and the code inside the <code>new Promise</code> executor.</p>`, `<p>Hint 2: after the script finishes, all queued <b>promise handlers</b> run (in the order they were queued) before any timer.</p>`, `<p>Hint 3: the timer callback runs last, even with 0 ms. Recipe: sync lines → promise handlers → timers.</p>`],
    tests: { io: true, cases: [
      {"stdin":"","stdout":"1\nfinal order: 1 4 6 3 5 2"}
    ] },
    solution: {
      approach: `<p>Sort every callback into three buckets: <b>synchronous</b> (1, 4, 6), <b>promise reactions / microtasks</b> (3 then 5, in queue order), <b>timers / tasks</b> (2). Print bucket by bucket. Module JS 8 explains exactly why microtasks beat timers.</p>`,
      code: { lang: 'js', run: true, code: `
const out = [];
console.log(1); out.push(1);                                   // sync
setTimeout(() => { out.push(2); console.log('final order:', out.join(' ')); }, 0); // task
Promise.resolve().then(() => out.push(3));                     // microtask #1
new Promise((res) => { out.push(4); res(); })                  // executor: sync!
  .then(() => out.push(5));                                    // microtask #2
out.push(6);                                                   // sync
// final order: 1 4 6 3 5 2
` },
      dry: { head: ['phase', 'runs', 'output so far'], rows: [['sync', 'log 1, executor logs 4, log 6', '1 4 6'], ['microtasks', 'then → 3, then → 5', '1 4 6 3 5'], ['timers', 'setTimeout → 2', '1 4 6 3 5 2']] },
      complexity: `<p>Not an algorithm question: the skill is classifying each callback by when it is scheduled.</p>`,
      followUps: ['Add queueMicrotask(() => log(7)) after line 3 — where does 7 go?', 'What if the executor called res() inside a setTimeout?']
    }
  });

  practice.push({
    title: 'Predict the Output: First Settle Wins',
    level: 'Easy', tags: ['predict output', 'promise states'], companies: ['Microsoft', 'Zoho'],
    statement: `<p>What does this print, and why is <code>'D'</code> never shown?</p><pre>const p = new Promise((resolve, reject) =&gt; {
  console.log('A');
  resolve('B');
  console.log('C');
  reject('D');
});
p.then((v) =&gt; console.log(v)).catch((e) =&gt; console.log('caught', e));
console.log('E');</pre>`,
    constraints: `No other code runs.`,
    example: `<p>Output: <b>A C E B</b>. ${H.c('g', "resolve('B') settles the promise")}; ${H.c('m', "reject('D') is ignored")}; resolve does not stop the executor, so C prints; B prints later as a handler.</p>`,
    brute: { why: `<p>Common wrong answers: "A B C E caught D" (thinks resolve is synchronous delivery and reject still counts) or "A E B" (thinks resolve returns from the executor).</p>`, code: { lang: 'js', run: true, code: `
// Wrong mental model: "the LAST call wins" → would expect 'caught D'
const p = new Promise((resolve, reject) => { resolve('B'); reject('D'); });
p.then((v) => console.log('actually got', v), (e) => console.log('caught', e));
` } },
    mcq: { q: 'What happens to reject(\'D\')?', options: ['It overrides the value', 'It throws an error', 'It is silently ignored because the promise is already settled', 'It causes an unhandled rejection'], answer: 2, explain: 'A promise settles only once; later resolve/reject calls are no-ops.' },
    hints: [`<p>Hint 1: the executor runs synchronously — so A and C print during construction, before E.</p>`, `<p>Hint 2: only the first of resolve/reject counts; it does not exit the function either.</p>`, `<p>Hint 3: the then handler runs as a microtask after the script ends, printing B. The catch is never triggered.</p>`],
    tests: { io: true, cases: [
      {"stdin":"","stdout":"A\nC\nE\nB"}
    ] },
    solution: {
      approach: `<p>Executor runs immediately: <b>A</b>, settle with 'B', <b>C</b>, ignored reject. Script continues: <b>E</b>. Then the microtask: <b>B</b>. <code>.catch</code> receives a fulfilled promise and passes it through.</p>`,
      code: { lang: 'js', run: true, code: `
const p = new Promise((resolve, reject) => {
  console.log('A');
  resolve('B');      // settles: fulfilled with 'B'
  console.log('C');  // still runs
  reject('D');       // ignored
});
p.then((v) => console.log(v)).catch((e) => console.log('caught', e));
console.log('E');
// A C E B
` },
      dry: { head: ['step', 'action', 'state', 'printed'], rows: [['1', "log 'A'", 'pending', 'A'], ['2', "resolve('B')", 'fulfilled B', 'A'], ['3', "log 'C'; reject ignored", 'fulfilled B', 'A C'], ['4', "log 'E'", 'fulfilled B', 'A C E'], ['5', 'then handler (microtask)', 'fulfilled B', 'A C E B']] },
      complexity: `<p>Constant: the point is the settle-once rule and executor timing.</p>`,
      followUps: ['What prints if the executor throws after resolve?', 'What if you swap resolve and reject?']
    }
  });

  practice.push({
    title: 'Fix the Floating Promise',
    level: 'Easy', tags: ['chaining', 'bugs', 'return'], companies: ['Atlassian', 'Freshworks'],
    statement: `<p>This code should print the user's name and then <code>'saved'</code>, and any failure should reach the final <code>.catch</code>. Instead the second step logs <code>undefined</code> and save errors become unhandled. Find and fix both bugs.</p><pre>getUser(1)
  .then((u) =&gt; { getName(u); })
  .then((name) =&gt; { console.log(name); save(name); })
  .then(() =&gt; console.log('saved'))
  .catch((e) =&gt; console.log('error', e.message));</pre>`,
    constraints: `getUser, getName and save all return promises.`,
    example: `<p>Buggy output: ${H.c('r', 'undefined, saved')} (and save runs detached). Fixed output: ${H.c('g', 'asha, saved')}, or <code>error ...</code> if save rejects.</p>`,
    brute: { why: `<p>Braces <code>{ }</code> in an arrow function need an explicit <code>return</code>. Without it each handler returns <code>undefined</code>, so the next step gets <code>undefined</code> and does not wait for the inner promise. Errors inside those inner promises are "floating": no one handles them.</p>`, code: { lang: 'js', run: true, code: `
const getUser = (id) => Promise.resolve({ id, name: 'asha' });
const getName = (u) => new Promise((r) => setTimeout(() => r(u.name), 10));
const save = (name) => new Promise((r) => setTimeout(() => r(), 10));
getUser(1)
  .then((u) => { getName(u); })                       // BUG 1: no return
  .then((name) => { console.log(name); save(name); }) // BUG 2: no return
  .then(() => console.log('saved (but not really waited for)'))
  .catch((e) => console.log('error', e.message));
` } },
    mcq: { q: 'What does the arrow `(u) => { getName(u); }` return?', options: ['getName(u)', 'undefined', 'A pending promise', 'u'], answer: 1, explain: 'With a block body, an arrow function returns undefined unless you write return.' },
    hints: [`<p>Hint 1: check every <code>.then</code> handler: does it <b>return</b> the promise it creates?</p>`, `<p>Hint 2: use the concise arrow body <code>(u) =&gt; getName(u)</code> or add <code>return</code> inside the braces.</p>`, `<p>Hint 3: once every inner promise is returned, the chain waits for it, gets its value, and its rejections flow to the final catch.</p>`],
    tests: { io: true, cases: [
      {"stdin":"","stdout":"asha\nsaved\nasha\nerror db down"}
    ] },
    solution: {
      approach: `<p>Return every inner promise. Then the chain waits for <code>getName</code> (so the next step receives the name) and for <code>save</code> (so 'saved' is truthful), and any rejection reaches the single <code>.catch</code>.</p>`,
      code: { lang: 'js', run: true, code: `
const getUser = (id) => Promise.resolve({ id, name: 'asha' });
const getName = (u) => new Promise((r) => setTimeout(() => r(u.name), 10));
const save = (name, fail) => new Promise((r, j) => setTimeout(() => (fail ? j(new Error('db down')) : r()), 10));

function run(fail) {
  return getUser(1)
    .then((u) => getName(u))                               // returned
    .then((name) => { console.log(name); return save(name, fail); }) // returned
    .then(() => console.log('saved'))
    .catch((e) => console.log('error', e.message));
}
run(false).then(() => run(true));   // asha, saved, then asha, error db down
` },
      complexity: `<p>Same work as before; the fix only connects the promises so timing and errors are correct.</p>`,
      followUps: ['Which lint rule catches floating promises in TypeScript?', 'Rewrite with async/await.']
    }
  });

  practice.push({
    title: 'sleep(ms) and a Countdown',
    level: 'Easy', tags: ['new Promise', 'setTimeout', 'chaining'], companies: ['TCS', 'Swiggy'],
    statement: `<p>Write <code>sleep(ms)</code> that returns a promise fulfilled after <code>ms</code> milliseconds. Use it to print a countdown <code>3, 2, 1, go!</code> with 100 ms between lines, using only <code>.then</code> (no async/await, no nested setTimeout).</p>`,
    constraints: `0 ≤ ms ≤ 10<sup>4</sup>. Lines must be about 100 ms apart.`,
    example: `<pre>0 ms   3
100 ms 2
200 ms 1
300 ms go!</pre><p>Each ${H.c('b', '.then(() =&gt; sleep(100))')} returns a promise, so the chain pauses there.</p>`,
    brute: { why: `<p>Scheduling all lines with separate setTimeouts (100, 200, 300) works but hard-codes absolute times, and nested timers bring back the pyramid. A chain of sleeps reads top-to-bottom.</p>`, code: { lang: 'js', run: true, code: `
// Works, but each line needs its own absolute delay
setTimeout(() => console.log(3), 0);
setTimeout(() => console.log(2), 100);
setTimeout(() => console.log(1), 200);
setTimeout(() => console.log('go!'), 300);
` } },
    mcq: { q: 'In `.then(() => sleep(100))`, why does the chain wait?', options: ['then always waits 100 ms', 'Returning a promise from a handler makes the next promise follow it', 'sleep blocks the thread', 'It does not wait'], answer: 1, explain: 'Returned promises are adopted: the next link settles only when sleep\'s promise does.' },
    hints: [`<p>Hint 1: <code>new Promise(resolve =&gt; setTimeout(resolve, ms))</code> is the whole sleep.</p>`, `<p>Hint 2: build the chain with a loop or reduce over [3, 2, 1]: log, then return sleep(100).</p>`, `<p>Hint 3: don't call sleep without returning it — that would not pause anything. Finish with a final then that logs 'go!'.</p>`],
    tests: { sig: 'string string -> string', fn: '__tA', harness: { js: `function __runChild() {
  const fs = require('fs'), vm = require('vm'), util = require('util');
  process.on('unhandledRejection', () => {});
  process.on('uncaughtException', (e) => { process.stdout.write('@@ERROR uncaught ' + (e && e.stack || e) + '\\n'); process.exit(1); });
  const src = fs.readFileSync(process.env.SC_FILE, 'utf8');
  const body = src.slice(0, src.indexOf('/*@@' + 'END@@*/'));
  let now = 0, seq = 1, timers = [];
  const logs = [];
  const fake = {
    turns: 0, delays: [], uncaught: [],
    setTimeout(fn, ms, ...a) { const t = { id: seq++, at: now + Math.max(0, +ms || 0), fn, a }; timers.push(t); fake.delays.push(Math.max(0, +ms || 0)); return t.id; },
    clearTimeout(id) { timers = timers.filter((t) => t.id !== id); },
    now: () => now,
    pending: () => timers.length,
    reset() { timers = []; logs.length = 0; fake.delays.length = 0; fake.turns = 0; fake.uncaught.length = 0; },
    async flush(n = 60) { for (let i = 0; i < n; i++) await new Promise((r) => queueMicrotask(r)); },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        await fake.flush();
        timers.sort((a, b) => a.at - b.at || a.id - b.id);
        const t = timers[0];
        if (!t || t.at > end) break;
        timers.shift(); now = t.at; fake.turns++;
        try { t.fn(...t.a); } catch (e) { fake.uncaught.push(e && e.message); }
      }
      now = end; await fake.flush();
    }
  };
  const fmt = (x) => (typeof x === 'string' ? x : util.inspect(x, { depth: 3, breakLength: Infinity }));
  const ctx = vm.createContext({ console: { log: (...a) => logs.push({ t: now, s: a.map(fmt).join(' ') }), error() {}, warn() {} }, setTimeout: fake.setTimeout, clearTimeout: fake.clearTimeout, queueMicrotask, __fake: fake, __logs: logs });
  vm.runInContext(body, ctx, { filename: 'main.js' });
  (async () => {
    await fake.flush(100);
    const scenario = vm.runInContext('__scenario', ctx);
    const r = await scenario(process.env.SC_NAME, JSON.parse(process.env.SC_ARGS));
    process.stdout.write('@@RESULT ' + JSON.stringify(r === undefined ? null : r) + '\\n');
    process.exit(0);
  })().catch((e) => { process.stdout.write('@@ERROR ' + (e && e.stack || e) + '\\n'); process.exit(1); });
}
function __tA(name, argsJson) {
  const r = require('child_process').spawnSync(process.execPath, ['-e', '(' + __runChild.toString() + ')()'], {
    env: Object.assign({}, process.env, { SC_FILE: __filename, SC_NAME: name, SC_ARGS: argsJson || 'null' }), encoding: 'utf8', timeout: 20000, maxBuffer: 1 << 26
  });
  const m = /@@RESULT (.*)/.exec(r.stdout || '');
  if (!m) throw new Error('scenario failed: ' + String(r.stdout).slice(-400) + String(r.stderr).slice(-300));
  return JSON.parse(m[1]);
}
function __tD() { let res, rej; const p = new Promise((a, b) => { res = a; rej = b; }); return { p, res, rej }; }
function __tTrack(p) { const s = { st: 'pending' }; p.then((v) => { s.st = 'fulfilled'; s.v = v; }, (e) => { s.st = 'rejected'; s.e = e; }); return s; }
function __tEm(e) { return e !== null && typeof e === 'object' && 'message' in e ? e.name + ':' + e.message : e; }
function __tSum(s) { return s.st === 'fulfilled' ? ['ok', s.v] : s.st === 'rejected' ? ['err', __tEm(s.e)] : ['pending']; }
function __tBegin() { __fake.reset(); }
function __tTick(n) { return __fake.flush(n); }
function __tAdv(ms) { return __fake.advance(ms); }
function __tLater(ms, v, fail) { return new Promise((res, rej) => setTimeout(() => (fail ? rej(new Error(v)) : res(v)), ms)); }
async function __scenario(name) {
  const track = __tTrack, sum = __tSum, adv = __tAdv, tick = __tTick;
  if (name === 'countdown') { await adv(300); return __logs.map((l) => [l.t, l.s.split(' ')[0]]); }
  __tBegin();
  switch (name) {
    case 'basic': { const s = track(sleep(100)); await adv(99); const at99 = s.st; await adv(1); return { at99, at100: sum(s) }; }
    case 'zero': { const s = track(sleep(0)); await tick(); const before = s.st; await adv(0); return [before, s.st]; }
    case 'order': { const log = []; sleep(30).then(() => log.push(30)); sleep(10).then(() => log.push(10)); sleep(20).then(() => log.push(20)); await adv(30); return log; }
    case 'big-ms': { const s = track(sleep(10000)); await adv(9999); const a = s.st; await adv(1); return [a, s.st]; }
    case 'many': { const ss = Array.from({ length: 1000 }, (_, i) => track(sleep(i))); await adv(998); const mid = ss.filter((s) => s.st === 'fulfilled').length; await adv(1); return [mid, ss.every((s) => s.st === 'fulfilled')]; }
    case 'returns-promise': { const p = sleep(5); return [p instanceof Promise, __fake.pending()]; }
    case 'sequential': { const t = []; await (async () => { const p = sleep(10).then(() => t.push(__fake.now())).then(() => sleep(20)).then(() => t.push(__fake.now())); await adv(30); await p; })(); return t; }
    case 'independent': { const a = track(sleep(5)), b = track(sleep(50)); await adv(5); return [a.st, b.st]; }
  }
}
/*@@END@@*/` }, cases: [
      [["basic","null"],{"at99":"pending","at100":["ok",null]}],
      [["zero","null"],["pending","fulfilled"]],
      [["order","null"],[10,20,30]],
      [["big-ms","null"],["pending","fulfilled"]],
      [["many","null"],[999,true]],
      [["returns-promise","null"],[true,1]],
      [["sequential","null"],[10,30]],
      [["independent","null"],["fulfilled","pending"]],
      [["countdown","null"],[[0,"3"],[100,"2"],[200,"1"],[300,"go!"]]]
    ] },
    solution: {
      approach: `<p>Wrap setTimeout in a promise. Reduce over the numbers, each step logging and returning <code>sleep(100)</code>, so every log waits for the previous sleep.</p>`,
      code: { lang: 'js', run: true, code: `
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
const t0 = Date.now();
[3, 2, 1]
  .reduce((chain, n) => chain.then(() => {
    console.log(n, '@', Date.now() - t0, 'ms');
    return sleep(100);                         // pause before the next number
  }), Promise.resolve())
  .then(() => console.log('go! @', Date.now() - t0, 'ms'));
` },
      dry: { head: ['time', 'link', 'prints'], rows: [['0', 'n = 3', '3'], ['100', 'n = 2', '2'], ['200', 'n = 1', '1'], ['300', 'final then', 'go!']] },
      complexity: `<p>O(n) promises; total time n × 100 ms.</p>`,
      followUps: ['Make sleep cancellable with an AbortSignal.', 'Node has timers/promises setTimeout — how is it used?']
    }
  });

  /* ================= PRACTICE: Medium ================= */
  practice.push({
    title: 'Implement callbackify',
    level: 'Medium', tags: ['callbacks', 'promises', 'polyfill'], companies: ['Uber', 'Twilio'],
    statement: `<p>The reverse of promisify. Write <code>callbackify(fn)</code>: <code>fn</code> returns a promise. Return a function that takes the same arguments plus an error-first callback as the <b>last</b> argument, and calls <code>callback(err)</code> or <code>callback(null, value)</code>. A rejection with a falsy reason (like <code>null</code>) must still be reported as an Error.</p>`,
    constraints: `The callback must be called exactly once, asynchronously. An exception thrown <i>by the callback</i> must not cause the callback to be called a second time.`,
    example: `<pre>const addLater = (a, b) =&gt; Promise.resolve(a + b);
callbackify(addLater)(2, 3, (err, v) =&gt; console.log(err, v)); // null 5</pre><p>${H.c('r', 'Rejected with null')} → callback receives an Error with <code>.reason = null</code>.</p>`,
    brute: { why: `<p>The naive <code>fn(...args).then(v =&gt; cb(null, v)).catch(cb)</code> has a bug: if <code>cb</code> itself throws inside the then, the catch calls <code>cb</code> <b>again</b> with that error — callback called twice.</p>`, code: { lang: 'js', run: true, code: `
function callbackifyBad(fn) {
  return (...args) => {
    const cb = args.pop();
    fn(...args).then((v) => cb(null, v)).catch((e) => cb(e)); // cb may run twice!
  };
}
let count = 0;
callbackifyBad(() => Promise.resolve(1))(function (err, v) {
  count++;
  console.log('callback call #' + count, err ? 'err: ' + err.message : 'value: ' + v);
  if (count === 1) throw new Error('bug inside my callback');
});
` } },
    mcq: { q: 'Which form avoids calling the callback twice?', options: ['.then(ok).catch(fail)', '.then(ok, fail) — two-argument then', '.finally(cb)', 'try/catch around fn'], answer: 1, explain: 'With then(ok, fail), fail only watches fn\'s promise, not errors thrown inside ok.' },
    hints: [`<p>Hint 1: pop the last argument as the callback; call <code>fn.apply(this, args)</code>.</p>`, `<p>Hint 2: use <code>.then(onOk, onErr)</code> so a throw inside the callback is not routed back into it. Rethrow that throw outside the promise (e.g. via <code>queueMicrotask</code> / <code>setTimeout</code>) so it is not silently swallowed.</p>`, `<p>Hint 3: for a falsy reason, create <code>new Error('Promise was rejected with a falsy value')</code> and attach <code>.reason</code>. Also wrap the fn call so a sync throw becomes a callback error.</p>`],
    tests: { sig: 'string string -> string', fn: '__tA', harness: { js: `function __runChild() {
  const fs = require('fs'), vm = require('vm'), util = require('util');
  process.on('unhandledRejection', () => {});
  process.on('uncaughtException', (e) => { process.stdout.write('@@ERROR uncaught ' + (e && e.stack || e) + '\\n'); process.exit(1); });
  const src = fs.readFileSync(process.env.SC_FILE, 'utf8');
  const body = src.slice(0, src.indexOf('/*@@' + 'END@@*/'));
  let now = 0, seq = 1, timers = [];
  const logs = [];
  const fake = {
    turns: 0, delays: [], uncaught: [],
    setTimeout(fn, ms, ...a) { const t = { id: seq++, at: now + Math.max(0, +ms || 0), fn, a }; timers.push(t); fake.delays.push(Math.max(0, +ms || 0)); return t.id; },
    clearTimeout(id) { timers = timers.filter((t) => t.id !== id); },
    now: () => now,
    pending: () => timers.length,
    reset() { timers = []; logs.length = 0; fake.delays.length = 0; fake.turns = 0; fake.uncaught.length = 0; },
    async flush(n = 60) { for (let i = 0; i < n; i++) await new Promise((r) => queueMicrotask(r)); },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        await fake.flush();
        timers.sort((a, b) => a.at - b.at || a.id - b.id);
        const t = timers[0];
        if (!t || t.at > end) break;
        timers.shift(); now = t.at; fake.turns++;
        try { t.fn(...t.a); } catch (e) { fake.uncaught.push(e && e.message); }
      }
      now = end; await fake.flush();
    }
  };
  const fmt = (x) => (typeof x === 'string' ? x : util.inspect(x, { depth: 3, breakLength: Infinity }));
  const ctx = vm.createContext({ console: { log: (...a) => logs.push({ t: now, s: a.map(fmt).join(' ') }), error() {}, warn() {} }, setTimeout: fake.setTimeout, clearTimeout: fake.clearTimeout, queueMicrotask, __fake: fake, __logs: logs });
  vm.runInContext(body, ctx, { filename: 'main.js' });
  (async () => {
    await fake.flush(100);
    const scenario = vm.runInContext('__scenario', ctx);
    const r = await scenario(process.env.SC_NAME, JSON.parse(process.env.SC_ARGS));
    process.stdout.write('@@RESULT ' + JSON.stringify(r === undefined ? null : r) + '\\n');
    process.exit(0);
  })().catch((e) => { process.stdout.write('@@ERROR ' + (e && e.stack || e) + '\\n'); process.exit(1); });
}
function __tA(name, argsJson) {
  const r = require('child_process').spawnSync(process.execPath, ['-e', '(' + __runChild.toString() + ')()'], {
    env: Object.assign({}, process.env, { SC_FILE: __filename, SC_NAME: name, SC_ARGS: argsJson || 'null' }), encoding: 'utf8', timeout: 20000, maxBuffer: 1 << 26
  });
  const m = /@@RESULT (.*)/.exec(r.stdout || '');
  if (!m) throw new Error('scenario failed: ' + String(r.stdout).slice(-400) + String(r.stderr).slice(-300));
  return JSON.parse(m[1]);
}
function __tD() { let res, rej; const p = new Promise((a, b) => { res = a; rej = b; }); return { p, res, rej }; }
function __tTrack(p) { const s = { st: 'pending' }; p.then((v) => { s.st = 'fulfilled'; s.v = v; }, (e) => { s.st = 'rejected'; s.e = e; }); return s; }
function __tEm(e) { return e !== null && typeof e === 'object' && 'message' in e ? e.name + ':' + e.message : e; }
function __tSum(s) { return s.st === 'fulfilled' ? ['ok', s.v] : s.st === 'rejected' ? ['err', __tEm(s.e)] : ['pending']; }
function __tBegin() { __fake.reset(); }
function __tTick(n) { return __fake.flush(n); }
function __tAdv(ms) { return __fake.advance(ms); }
function __tLater(ms, v, fail) { return new Promise((res, rej) => setTimeout(() => (fail ? rej(new Error(v)) : res(v)), ms)); }
async function __scenario(name) {
  const tick = __tTick, adv = __tAdv, em = __tEm; __tBegin();
  const calls = [];
  switch (name) {
    case 'ok': { callbackify((a, b) => Promise.resolve(a + b))(2, 3, (e, v) => calls.push([e, v])); const sync = calls.length; await tick(); const afterTick = calls.length; await adv(0); return [sync, afterTick, calls]; }
    case 'reject-error': { callbackify(() => Promise.reject(new Error('x')))((e) => calls.push(em(e))); await adv(0); return calls; }
    case 'falsy-null': { callbackify(() => Promise.reject(null))((e) => calls.push([em(e), e.reason === null])); await adv(0); return calls; }
    case 'falsy-values': { for (const v of [0, '', undefined, false]) callbackify(() => Promise.reject(v))((e) => calls.push([e.message, e.reason === v, 'reason' in e])); await adv(0); return calls; }
    case 'sync-throw': { callbackify(() => { throw new Error('sync throw'); })((e) => calls.push(em(e))); await adv(0); return calls; }
    case 'this': { const o = { k: 10, m: callbackify(function (a) { return Promise.resolve(this.k + a); }) }; o.m(1, (e, v) => calls.push([e, v])); await adv(0); return calls; }
    case 'args': { callbackify((...a) => Promise.resolve(a.length))(1, 2, 3, (e, v) => calls.push(v)); await adv(0); return calls; }
    case 'cb-throws': { callbackify(() => Promise.resolve(1))(() => { calls.push('called'); throw new Error('cb broke'); }); await adv(0); await adv(100); return [calls, __fake.uncaught]; }
    case 'missing-callback': { try { callbackify(() => Promise.resolve(1))(1); return 'no error'; } catch (e) { return e.name; } }
    case 'truthy-reason-as-is': { callbackify(() => Promise.reject('str'))((e) => calls.push(e === 'str')); await adv(0); return calls; }
    case 'returns-undefined': return String(callbackify(() => Promise.resolve(1))(() => {}));
    case 'exactly-once': { callbackify(() => Promise.resolve(1))((e, v) => calls.push(v)); await adv(0); await adv(1000); return calls; }
    case 'many': { let n = 0; for (let i = 0; i < 1000; i++) callbackify((x) => Promise.resolve(x))(i, (e, v) => { n += v; }); await adv(0); return n; }
    case 'async-fn': { callbackify(async (x) => x * 2)(21, (e, v) => calls.push([e, v])); await adv(0); return calls; }
  }
}
/*@@END@@*/` }, cases: [
      [["ok","null"],[0,0,[[null,5]]]],
      [["reject-error","null"],["Error:x"]],
      [["falsy-null","null"],[["Error:Promise was rejected with a falsy value",true]]],
      [["falsy-values","null"],[["Promise was rejected with a falsy value",true,true],["Promise was rejected with a falsy value",true,true],["Promise was rejected with a falsy value",true,true],["Promise was rejected with a falsy value",true,true]]],
      [["sync-throw","null"],["Error:sync throw"]],
      [["this","null"],[[null,11]]],
      [["args","null"],[3]],
      [["cb-throws","null"],[["called"],["cb broke"]]],
      [["missing-callback","null"],"TypeError"],
      [["truthy-reason-as-is","null"],[true]],
      [["returns-undefined","null"],"undefined"],
      [["exactly-once","null"],[1]],
      [["many","null"],499500],
      [["async-fn","null"],[[null,42]]]
    ] },
    solution: {
      approach: `<p>Use the two-argument <code>then</code> so the error branch only handles fn's rejection. Invoke the callback outside the promise machinery (via <code>setTimeout</code> 0, like Node does with <code>process.nextTick</code>) so its own exceptions surface as normal uncaught errors instead of re-entering our handlers.</p>`,
      code: { lang: 'js', run: true, code: `
function callbackify(fn) {
  return function (...args) {
    const cb = args.pop();
    if (typeof cb !== 'function') throw new TypeError('last argument must be a callback');
    let p;
    try { p = Promise.resolve(fn.apply(this, args)); } catch (e) { p = Promise.reject(e); }
    p.then(
      (value) => setTimeout(() => cb(null, value), 0),
      (reason) => {
        let err = reason;
        if (!reason) { err = new Error('Promise was rejected with a falsy value'); err.reason = reason; }
        setTimeout(() => cb(err), 0);
      });
  };
}

const addLater = (a, b) => new Promise((r) => setTimeout(() => r(a + b), 10));
callbackify(addLater)(2, 3, (err, v) => console.log('ok path:', err, v));
callbackify(() => Promise.reject(null))((err) => console.log('falsy reject ->', err.message, '| reason:', err.reason));
callbackify(() => { throw new Error('sync throw'); })((err) => console.log('sync throw ->', err.message));
` },
      complexity: `<p>O(1) per call: one promise subscription and one timer.</p>`,
      followUps: ['How does Node\'s util.callbackify schedule the callback?', 'Why is calling a callback from inside a try block dangerous?']
    }
  });

  practice.push({
    title: 'Implement Promise.allSettled',
    level: 'Medium', tags: ['polyfill', 'combinators'], companies: ['Google', 'Flipkart'],
    statement: `<p>Write <code>allSettled(iterable)</code>: return a promise that <b>always fulfils</b>, once every item has settled, with an array (input order) of <code>{ status: 'fulfilled', value }</code> or <code>{ status: 'rejected', reason }</code>.</p>`,
    constraints: `No Promise.all/allSettled. Items may be plain values. Empty input → [].`,
    example: `<pre>allSettled([Promise.resolve(1), Promise.reject(new Error('x')), 3])
// [{status:'fulfilled',value:1}, {status:'rejected',reason:Error x}, {status:'fulfilled',value:3}]</pre><p>${H.c('g', 'Never rejects')} — failures become data.</p>`,
    brute: { why: `<p>Calling <code>Promise.all</code> fails fast on the first rejection and loses the rest. Awaiting items one by one works but is slow and still needs try/catch around each.</p>`, code: { lang: 'js', run: true, code: `
Promise.all([Promise.resolve(1), Promise.reject(new Error('x')), 3])
  .then((r) => console.log(r))
  .catch((e) => console.log('Promise.all lost everything else:', e.message));
` } },
    mcq: { q: 'What turns a rejection into a fulfilled entry?', options: ['A .then with a second (onRejected) handler that RETURNS an object', 'Throwing inside catch', 'Using finally', 'Promise.race'], answer: 0, explain: 'Returning from an error handler recovers the chain, so the per-item promise fulfils with the status object.' },
    hints: [`<p>Hint 1: map each item to <code>Promise.resolve(item).then(v =&gt; ({status:'fulfilled', value: v}), r =&gt; ({status:'rejected', reason: r}))</code>.</p>`, `<p>Hint 2: now every mapped promise fulfils. Combine them with your own counter (like promiseAll) storing by index.</p>`, `<p>Hint 3: handle the empty iterable (resolve [] immediately). There is no reject path at all.</p>`],
    tests: { sig: 'string string -> string', fn: '__tA', harness: { js: `function __runChild() {
  const fs = require('fs'), vm = require('vm'), util = require('util');
  process.on('unhandledRejection', () => {});
  process.on('uncaughtException', (e) => { process.stdout.write('@@ERROR uncaught ' + (e && e.stack || e) + '\\n'); process.exit(1); });
  const src = fs.readFileSync(process.env.SC_FILE, 'utf8');
  const body = src.slice(0, src.indexOf('/*@@' + 'END@@*/'));
  let now = 0, seq = 1, timers = [];
  const logs = [];
  const fake = {
    turns: 0, delays: [], uncaught: [],
    setTimeout(fn, ms, ...a) { const t = { id: seq++, at: now + Math.max(0, +ms || 0), fn, a }; timers.push(t); fake.delays.push(Math.max(0, +ms || 0)); return t.id; },
    clearTimeout(id) { timers = timers.filter((t) => t.id !== id); },
    now: () => now,
    pending: () => timers.length,
    reset() { timers = []; logs.length = 0; fake.delays.length = 0; fake.turns = 0; fake.uncaught.length = 0; },
    async flush(n = 60) { for (let i = 0; i < n; i++) await new Promise((r) => queueMicrotask(r)); },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        await fake.flush();
        timers.sort((a, b) => a.at - b.at || a.id - b.id);
        const t = timers[0];
        if (!t || t.at > end) break;
        timers.shift(); now = t.at; fake.turns++;
        try { t.fn(...t.a); } catch (e) { fake.uncaught.push(e && e.message); }
      }
      now = end; await fake.flush();
    }
  };
  const fmt = (x) => (typeof x === 'string' ? x : util.inspect(x, { depth: 3, breakLength: Infinity }));
  const ctx = vm.createContext({ console: { log: (...a) => logs.push({ t: now, s: a.map(fmt).join(' ') }), error() {}, warn() {} }, setTimeout: fake.setTimeout, clearTimeout: fake.clearTimeout, queueMicrotask, __fake: fake, __logs: logs });
  vm.runInContext(body, ctx, { filename: 'main.js' });
  (async () => {
    await fake.flush(100);
    const scenario = vm.runInContext('__scenario', ctx);
    const r = await scenario(process.env.SC_NAME, JSON.parse(process.env.SC_ARGS));
    process.stdout.write('@@RESULT ' + JSON.stringify(r === undefined ? null : r) + '\\n');
    process.exit(0);
  })().catch((e) => { process.stdout.write('@@ERROR ' + (e && e.stack || e) + '\\n'); process.exit(1); });
}
function __tA(name, argsJson) {
  const r = require('child_process').spawnSync(process.execPath, ['-e', '(' + __runChild.toString() + ')()'], {
    env: Object.assign({}, process.env, { SC_FILE: __filename, SC_NAME: name, SC_ARGS: argsJson || 'null' }), encoding: 'utf8', timeout: 20000, maxBuffer: 1 << 26
  });
  const m = /@@RESULT (.*)/.exec(r.stdout || '');
  if (!m) throw new Error('scenario failed: ' + String(r.stdout).slice(-400) + String(r.stderr).slice(-300));
  return JSON.parse(m[1]);
}
function __tD() { let res, rej; const p = new Promise((a, b) => { res = a; rej = b; }); return { p, res, rej }; }
function __tTrack(p) { const s = { st: 'pending' }; p.then((v) => { s.st = 'fulfilled'; s.v = v; }, (e) => { s.st = 'rejected'; s.e = e; }); return s; }
function __tEm(e) { return e !== null && typeof e === 'object' && 'message' in e ? e.name + ':' + e.message : e; }
function __tSum(s) { return s.st === 'fulfilled' ? ['ok', s.v] : s.st === 'rejected' ? ['err', __tEm(s.e)] : ['pending']; }
function __tBegin() { __fake.reset(); }
function __tTick(n) { return __fake.flush(n); }
function __tAdv(ms) { return __fake.advance(ms); }
function __tLater(ms, v, fail) { return new Promise((res, rej) => setTimeout(() => (fail ? rej(new Error(v)) : res(v)), ms)); }
async function __scenario(name) {
  const track = __tTrack, tick = __tTick, adv = __tAdv, later = __tLater, em = __tEm; __tBegin();
  const view = (s) => (s.st === 'pending' ? ['pending'] : s.st === 'rejected' ? ['rejected!', em(s.e)] : s.v.map((x) => (x.status === 'fulfilled' ? { status: 'fulfilled', value: x.value } : { status: 'rejected', reason: em(x.reason) })));
  switch (name) {
    case 'mixed': { const s = track(allSettled([Promise.resolve(1), Promise.reject(new Error('x')), 3])); await tick(); return view(s); }
    case 'timed': { const s = track(allSettled([later(30, 'a'), later(10, 'b failed', true), 3])); await adv(29); const mid = view(s); await adv(1); return [mid, view(s)]; }
    case 'empty': { const s = track(allSettled([])); await tick(); return view(s); }
    case 'set': { const s = track(allSettled(new Set([1, 2]))); await tick(); return view(s); }
    case 'all-rejected': { const s = track(allSettled([Promise.reject(1), Promise.reject(2)])); await tick(); return view(s); }
    case 'order': { const s = track(allSettled([later(30, 'a'), later(20, 'b'), later(10, 'c')])); await adv(30); return view(s); }
    case 'thenable': { const s = track(allSettled([{ then(r) { r('t'); } }, { then(_, j) { j('no'); } }])); await tick(); return view(s); }
    case 'undefined-value': { const s = track(allSettled([undefined])); await tick(); return view(s); }
    case 'undefined-reason': { const s = track(allSettled([Promise.reject(undefined)])); await tick(); return view(s); }
    case 'holes': { const s = track(allSettled([1, , 3])); await tick(); return view(s); }
    case 'string': { const s = track(allSettled('ab')); await tick(); return view(s); }
    case 'never-rejects': { const s = track(allSettled([Promise.reject(new Error('a')), Promise.reject(new Error('b'))])); await tick(); return s.st; }
    case 'big': { const r = await allSettled(Array.from({ length: 10000 }, (_, i) => (i % 2 ? Promise.reject(i) : Promise.resolve(i)))); return [r.length, r[0].status, r[1].status, r[9999].reason, r[9998].value]; }
    case 'wait-for-all': { const d = __tD(); const s = track(allSettled([1, d.p])); await tick(); const mid = s.st; d.rej(new Error('late')); await tick(); return [mid, view(s)]; }
  }
}
/*@@END@@*/` }, cases: [
      [["mixed","null"],[{"status":"fulfilled","value":1},{"status":"rejected","reason":"Error:x"},{"status":"fulfilled","value":3}]],
      [["timed","null"],[["pending"],[{"status":"fulfilled","value":"a"},{"status":"rejected","reason":"Error:b failed"},{"status":"fulfilled","value":3}]]],
      [["empty","null"],[]],
      [["set","null"],[{"status":"fulfilled","value":1},{"status":"fulfilled","value":2}]],
      [["all-rejected","null"],[{"status":"rejected","reason":1},{"status":"rejected","reason":2}]],
      [["order","null"],[{"status":"fulfilled","value":"a"},{"status":"fulfilled","value":"b"},{"status":"fulfilled","value":"c"}]],
      [["thenable","null"],[{"status":"fulfilled","value":"t"},{"status":"rejected","reason":"no"}]],
      [["undefined-value","null"],[{"status":"fulfilled"}]],
      [["undefined-reason","null"],[{"status":"rejected"}]],
      [["holes","null"],[{"status":"fulfilled","value":1},{"status":"fulfilled"},{"status":"fulfilled","value":3}]],
      [["string","null"],[{"status":"fulfilled","value":"a"},{"status":"fulfilled","value":"b"}]],
      [["never-rejects","null"],"fulfilled"],
      [["big","null"],[10000,"fulfilled","rejected",9999,9998]],
      [["wait-for-all","null"],["pending",[{"status":"fulfilled","value":1},{"status":"rejected","reason":"Error:late"}]]]
    ] },
    solution: {
      approach: `<p>Convert each item into a promise that cannot reject (its error handler returns a status object), then wait for all of them with an index-based counter.</p>`,
      code: { lang: 'js', run: true, code: `
function allSettled(iterable) {
  const items = Array.from(iterable);
  return new Promise((resolve) => {
    const out = new Array(items.length);
    let left = items.length;
    if (left === 0) return resolve([]);
    items.forEach((item, i) => {
      Promise.resolve(item)
        .then((value) => ({ status: 'fulfilled', value }),
              (reason) => ({ status: 'rejected', reason }))
        .then((entry) => {
          out[i] = entry;                // input order
          if (--left === 0) resolve(out);
        });
    });
  });
}

const later = (ms, v, fail) => new Promise((r, j) => setTimeout(() => (fail ? j(new Error(v)) : r(v)), ms));
allSettled([later(30, 'a'), later(10, 'b failed', true), 3]).then((r) =>
  r.forEach((x, i) => console.log(i, x.status, x.status === 'fulfilled' ? x.value : x.reason.message)));
allSettled([]).then((r) => console.log('empty ->', r));
` },
      complexity: `<p>O(n) time and space; wall time = the slowest item.</p>`,
      followUps: ['Add a per-item timeout that records status "timeout".', 'Return { fulfilled: [...], rejected: [...] } groups instead.']
    }
  });

  practice.push({
    title: 'Implement Promise.race and withTimeout',
    level: 'Medium', tags: ['polyfill', 'race', 'timeout'], companies: ['Amazon', 'Meesho'],
    statement: `<p>(1) Write <code>race(iterable)</code> like <code>Promise.race</code>: settle the same way as the first item that settles. (2) Use it to write <code>withTimeout(promise, ms)</code> that rejects with <code>Error('Timeout')</code> if <code>promise</code> takes longer than <code>ms</code>, and always clears its timer.</p>`,
    constraints: `No Promise.race. An empty iterable must stay pending forever (same as the spec).`,
    example: `<pre>withTimeout(delay(200, 'slow'), 50)  // rejects: Timeout (after ~50 ms)
withTimeout(delay(20, 'fast'), 50)   // fulfils: 'fast'</pre><p>The ${H.c('y', 'slow job keeps running')} — race doesn't cancel it.</p>`,
    brute: { why: `<p>Polling a "done" flag with setInterval works but wastes CPU, adds latency equal to the poll interval, and doesn't propagate rejections cleanly.</p>`, code: { lang: 'js', run: true, code: `
let done = false, result;
setTimeout(() => { done = true; result = 'slow'; }, 80);
const started = Date.now();
const poll = setInterval(() => {
  if (done) { clearInterval(poll); console.log('got', result); }
  else if (Date.now() - started > 50) { clearInterval(poll); console.log('timeout (polled)'); }
}, 10);
` } },
    mcq: { q: 'Why can race just pass resolve and reject to every item?', options: ['Because only the first settle of the outer promise counts; later calls are ignored', 'Because items settle in order', 'Because race cancels the others', 'It cannot — it needs a flag'], answer: 0, explain: 'Promise settle-once semantics give "first wins" for free.' },
    hints: [`<p>Hint 1: <code>new Promise((resolve, reject) =&gt; { for (const x of iterable) Promise.resolve(x).then(resolve, reject); })</code> — that's the whole race.</p>`, `<p>Hint 2: withTimeout = race between the promise and a timer promise that rejects. Keep the timer id outside.</p>`, `<p>Hint 3: use <code>.finally(() =&gt; clearTimeout(id))</code> so the timer is cleared on both outcomes and the process can exit early.</p>`],
    tests: { sig: 'string string -> string', fn: '__tA', harness: { js: `function __runChild() {
  const fs = require('fs'), vm = require('vm'), util = require('util');
  process.on('unhandledRejection', () => {});
  process.on('uncaughtException', (e) => { process.stdout.write('@@ERROR uncaught ' + (e && e.stack || e) + '\\n'); process.exit(1); });
  const src = fs.readFileSync(process.env.SC_FILE, 'utf8');
  const body = src.slice(0, src.indexOf('/*@@' + 'END@@*/'));
  let now = 0, seq = 1, timers = [];
  const logs = [];
  const fake = {
    turns: 0, delays: [], uncaught: [],
    setTimeout(fn, ms, ...a) { const t = { id: seq++, at: now + Math.max(0, +ms || 0), fn, a }; timers.push(t); fake.delays.push(Math.max(0, +ms || 0)); return t.id; },
    clearTimeout(id) { timers = timers.filter((t) => t.id !== id); },
    now: () => now,
    pending: () => timers.length,
    reset() { timers = []; logs.length = 0; fake.delays.length = 0; fake.turns = 0; fake.uncaught.length = 0; },
    async flush(n = 60) { for (let i = 0; i < n; i++) await new Promise((r) => queueMicrotask(r)); },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        await fake.flush();
        timers.sort((a, b) => a.at - b.at || a.id - b.id);
        const t = timers[0];
        if (!t || t.at > end) break;
        timers.shift(); now = t.at; fake.turns++;
        try { t.fn(...t.a); } catch (e) { fake.uncaught.push(e && e.message); }
      }
      now = end; await fake.flush();
    }
  };
  const fmt = (x) => (typeof x === 'string' ? x : util.inspect(x, { depth: 3, breakLength: Infinity }));
  const ctx = vm.createContext({ console: { log: (...a) => logs.push({ t: now, s: a.map(fmt).join(' ') }), error() {}, warn() {} }, setTimeout: fake.setTimeout, clearTimeout: fake.clearTimeout, queueMicrotask, __fake: fake, __logs: logs });
  vm.runInContext(body, ctx, { filename: 'main.js' });
  (async () => {
    await fake.flush(100);
    const scenario = vm.runInContext('__scenario', ctx);
    const r = await scenario(process.env.SC_NAME, JSON.parse(process.env.SC_ARGS));
    process.stdout.write('@@RESULT ' + JSON.stringify(r === undefined ? null : r) + '\\n');
    process.exit(0);
  })().catch((e) => { process.stdout.write('@@ERROR ' + (e && e.stack || e) + '\\n'); process.exit(1); });
}
function __tA(name, argsJson) {
  const r = require('child_process').spawnSync(process.execPath, ['-e', '(' + __runChild.toString() + ')()'], {
    env: Object.assign({}, process.env, { SC_FILE: __filename, SC_NAME: name, SC_ARGS: argsJson || 'null' }), encoding: 'utf8', timeout: 20000, maxBuffer: 1 << 26
  });
  const m = /@@RESULT (.*)/.exec(r.stdout || '');
  if (!m) throw new Error('scenario failed: ' + String(r.stdout).slice(-400) + String(r.stderr).slice(-300));
  return JSON.parse(m[1]);
}
function __tD() { let res, rej; const p = new Promise((a, b) => { res = a; rej = b; }); return { p, res, rej }; }
function __tTrack(p) { const s = { st: 'pending' }; p.then((v) => { s.st = 'fulfilled'; s.v = v; }, (e) => { s.st = 'rejected'; s.e = e; }); return s; }
function __tEm(e) { return e !== null && typeof e === 'object' && 'message' in e ? e.name + ':' + e.message : e; }
function __tSum(s) { return s.st === 'fulfilled' ? ['ok', s.v] : s.st === 'rejected' ? ['err', __tEm(s.e)] : ['pending']; }
function __tBegin() { __fake.reset(); }
function __tTick(n) { return __fake.flush(n); }
function __tAdv(ms) { return __fake.advance(ms); }
function __tLater(ms, v, fail) { return new Promise((res, rej) => setTimeout(() => (fail ? rej(new Error(v)) : res(v)), ms)); }
async function __scenario(name) {
  const track = __tTrack, sum = __tSum, tick = __tTick, adv = __tAdv, later = __tLater, D = __tD; __tBegin();
  switch (name) {
    case 'first-fulfil': { const s = track(race([later(30, 'thirty'), later(10, 'ten')])); await adv(10); return sum(s); }
    case 'first-reject': { const s = track(race([later(30, 'a'), later(10, 'boom', true)])); await adv(10); return sum(s); }
    case 'plain-value': { const s = track(race(['x', later(5, 'y')])); await tick(); return sum(s); }
    case 'array-order-tie': { const s = track(race([Promise.resolve(1), Promise.resolve(2)])); await tick(); return sum(s); }
    case 'reject-first-in-array': { const s = track(race([Promise.reject(new Error('r')), Promise.resolve(2)])); await tick(); return sum(s); }
    case 'empty-pending': { const s = track(race([])); await adv(1000000); return s.st; }
    case 'set': { const s = track(race(new Set([later(5, 'a'), later(2, 'b')]))); await adv(5); return sum(s); }
    case 'settles-once': { const d1 = D(), d2 = D(); const s = track(race([d1.p, d2.p])); d2.res('second'); d1.rej(new Error('first-late')); await tick(); return sum(s); }
    case 'timeout-slow': { let at = null; const s = track(withTimeout(later(200, 'slow'), 50).catch((e) => { at = __fake.now(); throw e; })); await adv(300); return [sum(s), at]; }
    case 'timeout-fast': { const s = track(withTimeout(later(20, 'fast'), 50)); await adv(20); return sum(s); }
    case 'timer-cleared-on-success': { const d = D(); const s = track(withTimeout(d.p, 100)); const during = __fake.pending(); d.res('v'); await tick(); return [sum(s), during, __fake.pending()]; }
    case 'timer-cleared-on-failure': { const d = D(); const s = track(withTimeout(d.p, 100)); d.rej(new Error('orig')); await tick(); return [sum(s), __fake.pending()]; }
    case 'late-after-timeout': { const d = D(); const s = track(withTimeout(d.p, 50)); await adv(50); d.res('late'); await tick(); return [sum(s), __fake.pending()]; }
    case 'ms-zero': { const d = D(); const s = track(withTimeout(d.p, 0)); await adv(0); return sum(s); }
    case 'sync-value': { const s = track(withTimeout(5, 100)); await tick(); return [sum(s), __fake.pending()]; }
    case 'exact-boundary': { const s = track(withTimeout(later(50, 'tie'), 50)); await adv(50); return sum(s); }
  }
}
/*@@END@@*/` }, cases: [
      [["first-fulfil","null"],["ok","ten"]],
      [["first-reject","null"],["err","Error:boom"]],
      [["plain-value","null"],["ok","x"]],
      [["array-order-tie","null"],["ok",1]],
      [["reject-first-in-array","null"],["err","Error:r"]],
      [["empty-pending","null"],"pending"],
      [["set","null"],["ok","b"]],
      [["settles-once","null"],["ok","second"]],
      [["timeout-slow","null"],[["err","Error:Timeout"],50]],
      [["timeout-fast","null"],["ok","fast"]],
      [["timer-cleared-on-success","null"],[["ok","v"],1,0]],
      [["timer-cleared-on-failure","null"],[["err","Error:orig"],0]],
      [["late-after-timeout","null"],[["err","Error:Timeout"],0]],
      [["ms-zero","null"],["err","Error:Timeout"]],
      [["sync-value","null"],[["ok",5],0]],
      [["exact-boundary","null"],["ok","tie"]]
    ] },
    solution: {
      approach: `<p>race subscribes resolve/reject of one outer promise to every item — first settle wins by the settle-once rule. withTimeout races the real promise against a rejecting timer and clears the timer in finally.</p>`,
      code: { lang: 'js', run: true, code: `
function race(iterable) {
  return new Promise((resolve, reject) => {
    for (const item of iterable) Promise.resolve(item).then(resolve, reject);
    // empty iterable → loop never runs → stays pending (spec behaviour)
  });
}

function withTimeout(promise, ms) {
  let id;
  const timer = new Promise((_, reject) => {
    id = setTimeout(() => reject(new Error('Timeout')), ms);
  });
  return race([promise, timer]).finally(() => clearTimeout(id));
}

const delay = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));
const t0 = Date.now();
withTimeout(delay(200, 'slow'), 50).catch((e) => console.log(e.message, '~' + (Date.now() - t0) + 'ms'));
withTimeout(delay(20, 'fast'), 50).then((v) => console.log('fulfilled', v));
race([delay(30, 'thirty'), delay(10, 'ten')]).then((v) => console.log('race winner:', v));
` },
      complexity: `<p>O(n) subscriptions; settles at the time of the fastest item.</p>`,
      followUps: ['Cancel the slow work using AbortController when the timeout wins.', 'What does AbortSignal.timeout(ms) give you for fetch?']
    }
  });

  practice.push({
    title: 'Implement Promise.any with AggregateError',
    level: 'Medium', tags: ['polyfill', 'any', 'AggregateError'], companies: ['Microsoft', 'Adobe'],
    statement: `<p>Write <code>any(iterable)</code>: fulfil with the <b>first fulfilled</b> value; if <b>all</b> items reject, reject with an <code>AggregateError</code> whose <code>errors</code> array holds every reason <b>in input order</b>. Empty input → reject with AggregateError immediately.</p>`,
    constraints: `No Promise.any. AggregateError is available in all modern runtimes.`,
    example: `<pre>any([reject('a'), delay(30, 'b'), delay(10, 'c')]) // 'c'
any([reject('x'), reject('y')])                     // AggregateError, errors = ['x', 'y']</pre><p>It is the ${H.c('b', 'mirror image of Promise.all')}: swap the roles of fulfil and reject.</p>`,
    brute: { why: `<p>Using race picks the first <b>settled</b> item, which may be a failure — wrong. Trying items one by one until one works (sequential fallback) is correct but slow.</p>`, code: { lang: 'js', run: true, code: `
const delay = (ms, v, fail) => new Promise((r, j) => setTimeout(() => (fail ? j(new Error(v)) : r(v)), ms));
Promise.race([delay(5, 'eu down', true), delay(20, 'us ok')])
  .then((v) => console.log('race gave', v))
  .catch((e) => console.log('race picked the failure:', e.message));
` } },
    mcq: { q: 'When must any() reject?', options: ['On the first rejection', 'When every item has rejected', 'After a timeout', 'Never'], answer: 1, explain: 'any only fails if there is no success at all — then you need all reasons, hence AggregateError.' },
    hints: [`<p>Hint 1: copy your promiseAll, but count <b>rejections</b> and store reasons by index.</p>`, `<p>Hint 2: pass <code>resolve</code> directly as the success handler: first fulfilment wins.</p>`, `<p>Hint 3: when the rejection counter reaches n → <code>reject(new AggregateError(errors, 'All promises were rejected'))</code>. Handle n = 0 up front.</p>`],
    tests: { sig: 'string string -> string', fn: '__tA', harness: { js: `function __runChild() {
  const fs = require('fs'), vm = require('vm'), util = require('util');
  process.on('unhandledRejection', () => {});
  process.on('uncaughtException', (e) => { process.stdout.write('@@ERROR uncaught ' + (e && e.stack || e) + '\\n'); process.exit(1); });
  const src = fs.readFileSync(process.env.SC_FILE, 'utf8');
  const body = src.slice(0, src.indexOf('/*@@' + 'END@@*/'));
  let now = 0, seq = 1, timers = [];
  const logs = [];
  const fake = {
    turns: 0, delays: [], uncaught: [],
    setTimeout(fn, ms, ...a) { const t = { id: seq++, at: now + Math.max(0, +ms || 0), fn, a }; timers.push(t); fake.delays.push(Math.max(0, +ms || 0)); return t.id; },
    clearTimeout(id) { timers = timers.filter((t) => t.id !== id); },
    now: () => now,
    pending: () => timers.length,
    reset() { timers = []; logs.length = 0; fake.delays.length = 0; fake.turns = 0; fake.uncaught.length = 0; },
    async flush(n = 60) { for (let i = 0; i < n; i++) await new Promise((r) => queueMicrotask(r)); },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        await fake.flush();
        timers.sort((a, b) => a.at - b.at || a.id - b.id);
        const t = timers[0];
        if (!t || t.at > end) break;
        timers.shift(); now = t.at; fake.turns++;
        try { t.fn(...t.a); } catch (e) { fake.uncaught.push(e && e.message); }
      }
      now = end; await fake.flush();
    }
  };
  const fmt = (x) => (typeof x === 'string' ? x : util.inspect(x, { depth: 3, breakLength: Infinity }));
  const ctx = vm.createContext({ console: { log: (...a) => logs.push({ t: now, s: a.map(fmt).join(' ') }), error() {}, warn() {} }, setTimeout: fake.setTimeout, clearTimeout: fake.clearTimeout, queueMicrotask, __fake: fake, __logs: logs });
  vm.runInContext(body, ctx, { filename: 'main.js' });
  (async () => {
    await fake.flush(100);
    const scenario = vm.runInContext('__scenario', ctx);
    const r = await scenario(process.env.SC_NAME, JSON.parse(process.env.SC_ARGS));
    process.stdout.write('@@RESULT ' + JSON.stringify(r === undefined ? null : r) + '\\n');
    process.exit(0);
  })().catch((e) => { process.stdout.write('@@ERROR ' + (e && e.stack || e) + '\\n'); process.exit(1); });
}
function __tA(name, argsJson) {
  const r = require('child_process').spawnSync(process.execPath, ['-e', '(' + __runChild.toString() + ')()'], {
    env: Object.assign({}, process.env, { SC_FILE: __filename, SC_NAME: name, SC_ARGS: argsJson || 'null' }), encoding: 'utf8', timeout: 20000, maxBuffer: 1 << 26
  });
  const m = /@@RESULT (.*)/.exec(r.stdout || '');
  if (!m) throw new Error('scenario failed: ' + String(r.stdout).slice(-400) + String(r.stderr).slice(-300));
  return JSON.parse(m[1]);
}
function __tD() { let res, rej; const p = new Promise((a, b) => { res = a; rej = b; }); return { p, res, rej }; }
function __tTrack(p) { const s = { st: 'pending' }; p.then((v) => { s.st = 'fulfilled'; s.v = v; }, (e) => { s.st = 'rejected'; s.e = e; }); return s; }
function __tEm(e) { return e !== null && typeof e === 'object' && 'message' in e ? e.name + ':' + e.message : e; }
function __tSum(s) { return s.st === 'fulfilled' ? ['ok', s.v] : s.st === 'rejected' ? ['err', __tEm(s.e)] : ['pending']; }
function __tBegin() { __fake.reset(); }
function __tTick(n) { return __fake.flush(n); }
function __tAdv(ms) { return __fake.advance(ms); }
function __tLater(ms, v, fail) { return new Promise((res, rej) => setTimeout(() => (fail ? rej(new Error(v)) : res(v)), ms)); }
async function __scenario(name) {
  const track = __tTrack, sum = __tSum, tick = __tTick, adv = __tAdv, later = __tLater, em = __tEm; __tBegin();
  const agg = (s) => (s.st === 'rejected' ? { name: s.e.name, message: s.e.message, isArray: Array.isArray(s.e.errors), errors: s.e.errors.map(em) } : sum(s));
  switch (name) {
    case 'first-success': { const s = track(any([later(5, 'a', true), later(30, 'b'), later(10, 'c')])); await adv(10); return sum(s); }
    case 'all-reject': { const s = track(any([later(20, 'x', true), later(5, 'y', true)])); await adv(20); return agg(s); }
    case 'empty': { const s = track(any([])); await tick(); return agg(s); }
    case 'plain-wins': { const s = track(any(['v', Promise.reject(1)])); await tick(); return sum(s); }
    case 'set': { const s = track(any(new Set([Promise.reject(1), 2]))); await tick(); return sum(s); }
    case 'success-after-rejection': { const s = track(any([Promise.reject(1), later(10, 'ok')])); await tick(); const mid = s.st; await adv(10); return [mid, sum(s)]; }
    case 'non-error-reasons': { const s = track(any([Promise.reject('s'), Promise.reject(2)])); await tick(); return agg(s); }
    case 'pending-until-all-fail': { const s = track(any([later(5, 'a', true), later(25, 'b', true)])); await adv(5); const mid = s.st; await adv(20); return [mid, agg(s).errors]; }
    case 'thenable': { const s = track(any([{ then(_, j) { j('no'); } }, { then(r) { r('yes'); } }])); await tick(); return sum(s); }
    case 'later-rejections-ignored': { const s = track(any([Promise.resolve('win'), later(5, 'x', true)])); await adv(10); return sum(s); }
    case 'big': { const s = track(any(Array.from({ length: 10000 }, (_, i) => Promise.reject(i)))); await tick(); const a = agg(s); return [a.errors.length, a.errors[0], a.errors[9999], a.name]; }
    case 'one-success-among-many-fail': { const items = Array.from({ length: 1000 }, (_, i) => (i === 700 ? Promise.resolve('found') : Promise.reject(i))); const s = track(any(items)); await tick(); return sum(s); }
    case 'undefined-fulfil': { const s = track(any([undefined])); await tick(); return sum(s); }
    case 'string-iterable': { const s = track(any('ab')); await tick(); return sum(s); }
  }
}
/*@@END@@*/` }, cases: [
      [["first-success","null"],["ok","c"]],
      [["all-reject","null"],{"name":"AggregateError","message":"All promises were rejected","isArray":true,"errors":["Error:x","Error:y"]}],
      [["empty","null"],{"name":"AggregateError","message":"All promises were rejected","isArray":true,"errors":[]}],
      [["plain-wins","null"],["ok","v"]],
      [["set","null"],["ok",2]],
      [["success-after-rejection","null"],["pending",["ok","ok"]]],
      [["non-error-reasons","null"],{"name":"AggregateError","message":"All promises were rejected","isArray":true,"errors":["s",2]}],
      [["pending-until-all-fail","null"],["pending",["Error:a","Error:b"]]],
      [["thenable","null"],["ok","yes"]],
      [["later-rejections-ignored","null"],["ok","win"]],
      [["big","null"],[10000,0,9999,"AggregateError"]],
      [["one-success-among-many-fail","null"],["ok","found"]],
      [["undefined-fulfil","null"],["ok",null]],
      [["string-iterable","null"],["ok","a"]]
    ] },
    solution: {
      approach: `<p>Inverse of all: success short-circuits, failures are collected by index; when all have failed, reject once with an AggregateError.</p>`,
      code: { lang: 'js', run: true, code: `
function any(iterable) {
  const items = Array.from(iterable);
  return new Promise((resolve, reject) => {
    const errors = new Array(items.length);
    let failed = 0;
    if (items.length === 0) return reject(new AggregateError([], 'All promises were rejected'));
    items.forEach((item, i) => {
      Promise.resolve(item).then(resolve, (reason) => {   // first success wins
        errors[i] = reason;
        if (++failed === items.length) reject(new AggregateError(errors, 'All promises were rejected'));
      });
    });
  });
}

const delay = (ms, v, fail) => new Promise((r, j) => setTimeout(() => (fail ? j(new Error(v)) : r(v)), ms));
any([delay(5, 'a', true), delay(30, 'b'), delay(10, 'c')]).then((v) => console.log('first success:', v));
any([delay(20, 'x', true), delay(5, 'y', true)]).catch((e) =>
  console.log(e.name, e.errors.map((er) => er.message)));   // input order: x, y
any([]).catch((e) => console.log('empty ->', e.name));
` },
      complexity: `<p>O(n) time/space; fulfils at the time of the first success.</p>`,
      followUps: ['Where is Promise.any useful in real systems?', 'How would you also cancel the remaining requests on success?']
    }
  });

  practice.push({
    title: 'Predict the Output: Two Chains Interleaving',
    level: 'Medium', tags: ['predict output', 'microtasks', 'chaining'], companies: ['Meta', 'Uber', 'PhonePe'],
    statement: `<p>Predict the exact output order.</p><pre>Promise.resolve()
  .then(() =&gt; console.log('a1'))
  .then(() =&gt; console.log('a2'))
  .then(() =&gt; console.log('a3'));
Promise.reject(new Error('x'))
  .catch(() =&gt; console.log('b1'))
  .then(() =&gt; console.log('b2'))
  .finally(() =&gt; console.log('b3'));
Promise.resolve()
  .then(() =&gt; { throw new Error('y'); })
  .then(() =&gt; console.log('c-skip'))
  .catch(() =&gt; console.log('c1'));</pre>`,
    constraints: `Each .then/.catch/.finally handler takes one microtask "tick" after its input promise settles.`,
    example: `<p>Answer: <b>a1 b1 a2 b2 a3 b3 c1</b>. Chains advance <b>one link per tick</b>, taking turns. ${H.c('m', 'c-skip')} never prints; the skipped link still costs a tick, so c1 arrives on tick 3.</p>`,
    brute: { why: `<p>The naive guess runs each chain to completion: a1 a2 a3 b1 b2 b3 c1. But a chain's next link can only run after the previous link's promise settles, which queues a <b>new</b> microtask behind the other chains' pending ones.</p>`, code: { lang: 'js', run: true, code: `
// Naive guess: a1 a2 a3 b1 b2 b3 c1 (each chain finishes before the next). Run to compare:
Promise.resolve().then(() => console.log('a1')).then(() => console.log('a2')).then(() => console.log('a3'));
Promise.reject(new Error('x')).catch(() => console.log('b1')).then(() => console.log('b2')).finally(() => console.log('b3'));
Promise.resolve().then(() => { throw new Error('y'); }).then(() => console.log('c-skip')).catch(() => console.log('c1'));
` } },
    mcq: { q: 'Why does the skipped .then in chain c still delay c1?', options: ['It doesn\'t', 'A skipped link still creates a promise that settles in its own microtask (pass-through)', 'Errors are slower than values', 'catch waits for a timer'], answer: 1, explain: 'A missing handler is replaced by a pass-through function, which still runs as a reaction job one tick later.' },
    hints: [`<p>Hint 1: number the ticks. Tick 1 runs the first link of every chain in creation order: a1, b1, (c throws).</p>`, `<p>Hint 2: tick 2 runs the second link of each chain: a2, b2, c's skipped then (passes error on).</p>`, `<p>Hint 3: tick 3: a3, b3 (finally), c1 (catch). Within a tick, order = order in which the reactions were queued.</p>`],
    tests: { io: true, cases: [
      {"stdin":"","stdout":"a1 b1 a2 b2 a3 b3 c1"}
    ] },
    solution: {
      approach: `<p>Model each chain as a list of links and advance all chains one link per microtask tick, in the order their reactions were queued. Skipped links still occupy a tick.</p>`,
      code: { lang: 'js', run: true, code: `
const out = [];
const log = (s) => out.push(s);
Promise.resolve().then(() => log('a1')).then(() => log('a2')).then(() => log('a3'));
Promise.reject(new Error('x')).catch(() => log('b1')).then(() => log('b2')).finally(() => log('b3'));
Promise.resolve().then(() => { throw new Error('y'); }).then(() => log('c-skip')).catch(() => log('c1'));
setTimeout(() => console.log(out.join(' ')), 0);   // a1 b1 a2 b2 a3 b3 c1
` },
      dry: { head: ['tick', 'chain a', 'chain b', 'chain c'], rows: [['1', 'a1', 'b1 (catch)', 'throws'], ['2', 'a2', 'b2', 'skip (pass error)'], ['3', 'a3', 'b3 (finally)', 'c1 (catch)']] },
      complexity: `<p>Output prediction: count links per tick, not lines.</p>`,
      followUps: ['What changes if a2 returns Promise.resolve()? (2 extra ticks)', 'Where would a setTimeout log appear?']
    }
  });

  practice.push({
    title: 'Fetch in Batches: Sequential vs Parallel vs Batched',
    level: 'Medium', tags: ['sequential vs parallel', 'Promise.all', 'batching'], companies: ['Zomato', 'Booking.com', 'Ola'],
    statement: `<p>You must fetch 6 URLs from an API that allows at most <b>2 requests at a time</b>. Write <code>fetchInBatches(urls, size, fetcher)</code> that runs <code>size</code> requests in parallel, waits for the whole batch, then starts the next batch. Return all results in input order. Compare total time with fully sequential and fully parallel versions.</p>`,
    constraints: `1 ≤ size. fetcher(url) returns a promise. Use promises only.`,
    example: `<p>6 requests of 100 ms, size 2 → 3 batches → ${H.c('y', '~300 ms')}. Sequential: ${H.c('r', '~600 ms')}. Fully parallel: ${H.c('g', '~100 ms')} (but breaks the 2-at-a-time limit).</p>`,
    brute: { why: `<p>Fully sequential respects the limit but wastes the allowed parallelism (600 ms). Fully parallel is fastest but violates the rate limit — the server returns 429s.</p>`, code: { lang: 'js', run: true, code: `
const fetcher = (u) => new Promise((r) => setTimeout(() => r('data' + u), 100));
const urls = [1, 2, 3, 4, 5, 6];
const t0 = Date.now();
urls.reduce((p, u) => p.then((acc) => fetcher(u).then((d) => acc.concat([d]))), Promise.resolve([]))
  .then((r) => console.log('sequential', r.length, 'results ~', Date.now() - t0, 'ms'));
` } },
    mcq: { q: 'What is the weakness of fixed batches compared to a sliding pool?', options: ['Results come out of order', 'One slow request holds up the whole next batch', 'It uses more memory', 'It cannot handle errors'], answer: 1, explain: 'A batch finishes only when its slowest member finishes; a pool starts a new request as soon as any slot frees up.' },
    hints: [`<p>Hint 1: split urls into chunks of <code>size</code> (slice in a loop).</p>`, `<p>Hint 2: each batch = <code>Promise.all(chunk.map(fetcher))</code>; chain batches sequentially with reduce, concatenating results.</p>`, `<p>Hint 3: time = (number of batches) × (slowest in each batch). Mention that a sliding-window pool (Hard problem) is better when durations vary.</p>`],
    tests: { sig: 'string string -> string', fn: '__tA', harness: { js: `function __runChild() {
  const fs = require('fs'), vm = require('vm'), util = require('util');
  process.on('unhandledRejection', () => {});
  process.on('uncaughtException', (e) => { process.stdout.write('@@ERROR uncaught ' + (e && e.stack || e) + '\\n'); process.exit(1); });
  const src = fs.readFileSync(process.env.SC_FILE, 'utf8');
  const body = src.slice(0, src.indexOf('/*@@' + 'END@@*/'));
  let now = 0, seq = 1, timers = [];
  const logs = [];
  const fake = {
    turns: 0, delays: [], uncaught: [],
    setTimeout(fn, ms, ...a) { const t = { id: seq++, at: now + Math.max(0, +ms || 0), fn, a }; timers.push(t); fake.delays.push(Math.max(0, +ms || 0)); return t.id; },
    clearTimeout(id) { timers = timers.filter((t) => t.id !== id); },
    now: () => now,
    pending: () => timers.length,
    reset() { timers = []; logs.length = 0; fake.delays.length = 0; fake.turns = 0; fake.uncaught.length = 0; },
    async flush(n = 60) { for (let i = 0; i < n; i++) await new Promise((r) => queueMicrotask(r)); },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        await fake.flush();
        timers.sort((a, b) => a.at - b.at || a.id - b.id);
        const t = timers[0];
        if (!t || t.at > end) break;
        timers.shift(); now = t.at; fake.turns++;
        try { t.fn(...t.a); } catch (e) { fake.uncaught.push(e && e.message); }
      }
      now = end; await fake.flush();
    }
  };
  const fmt = (x) => (typeof x === 'string' ? x : util.inspect(x, { depth: 3, breakLength: Infinity }));
  const ctx = vm.createContext({ console: { log: (...a) => logs.push({ t: now, s: a.map(fmt).join(' ') }), error() {}, warn() {} }, setTimeout: fake.setTimeout, clearTimeout: fake.clearTimeout, queueMicrotask, __fake: fake, __logs: logs });
  vm.runInContext(body, ctx, { filename: 'main.js' });
  (async () => {
    await fake.flush(100);
    const scenario = vm.runInContext('__scenario', ctx);
    const r = await scenario(process.env.SC_NAME, JSON.parse(process.env.SC_ARGS));
    process.stdout.write('@@RESULT ' + JSON.stringify(r === undefined ? null : r) + '\\n');
    process.exit(0);
  })().catch((e) => { process.stdout.write('@@ERROR ' + (e && e.stack || e) + '\\n'); process.exit(1); });
}
function __tA(name, argsJson) {
  const r = require('child_process').spawnSync(process.execPath, ['-e', '(' + __runChild.toString() + ')()'], {
    env: Object.assign({}, process.env, { SC_FILE: __filename, SC_NAME: name, SC_ARGS: argsJson || 'null' }), encoding: 'utf8', timeout: 20000, maxBuffer: 1 << 26
  });
  const m = /@@RESULT (.*)/.exec(r.stdout || '');
  if (!m) throw new Error('scenario failed: ' + String(r.stdout).slice(-400) + String(r.stderr).slice(-300));
  return JSON.parse(m[1]);
}
function __tD() { let res, rej; const p = new Promise((a, b) => { res = a; rej = b; }); return { p, res, rej }; }
function __tTrack(p) { const s = { st: 'pending' }; p.then((v) => { s.st = 'fulfilled'; s.v = v; }, (e) => { s.st = 'rejected'; s.e = e; }); return s; }
function __tEm(e) { return e !== null && typeof e === 'object' && 'message' in e ? e.name + ':' + e.message : e; }
function __tSum(s) { return s.st === 'fulfilled' ? ['ok', s.v] : s.st === 'rejected' ? ['err', __tEm(s.e)] : ['pending']; }
function __tBegin() { __fake.reset(); }
function __tTick(n) { return __fake.flush(n); }
function __tAdv(ms) { return __fake.advance(ms); }
function __tLater(ms, v, fail) { return new Promise((res, rej) => setTimeout(() => (fail ? rej(new Error(v)) : res(v)), ms)); }
async function __scenario(name) {
  const track = __tTrack, sum = __tSum, tick = __tTick, adv = __tAdv, later = __tLater; __tBegin();
  let active = 0, peak = 0; const started = [];
  const fetcher = (ms) => (u) => { active++; peak = Math.max(peak, active); started.push(u); return later(ms, 'data' + u).then((v) => { active--; return v; }); };
  const timed = async (urls, size, ms = 100) => { let fin = null; const s = track(fetchInBatches(urls, size, fetcher(ms)).then((r) => { fin = __fake.now(); return r; })); await adv(100000); return { res: sum(s), finishedAt: fin, peak }; };
  switch (name) {
    case 'six-by-two': return timed([1, 2, 3, 4, 5, 6], 2);
    case 'six-by-four': return timed([1, 2, 3, 4, 5, 6], 4);
    case 'size-ge-length': return timed([1, 2, 3], 10);
    case 'size-1': return timed([1, 2, 3], 1);
    case 'empty': return timed([], 3);
    case 'single': return timed([7], 2);
    case 'exact-batches': return timed([1, 2, 3, 4], 2, 50);
    case 'gated-start': {
      const s = track(fetchInBatches([1, 2, 3, 4], 2, fetcher(100))); await tick(); const first = [...started]; await adv(99); const mid = [...started]; await adv(1); const after = [...started]; await adv(100);
      return { first, mid, after, res: sum(s) };
    }
    case 'failure-stops': {
      const f = (u) => { started.push(u); return u === 3 ? Promise.reject(new Error('url 3 failed')) : Promise.resolve('d' + u); };
      const s = track(fetchInBatches([1, 2, 3, 4, 5, 6], 2, f)); await tick(); return { started, res: sum(s) };
    }
    case 'order': { const delays = { 1: 50, 2: 10, 3: 30, 4: 5 }; const f = (u) => later(delays[u], 'r' + u); const s = track(fetchInBatches([1, 2, 3, 4], 2, f)); await adv(1000); return sum(s); }
    case 'fetcher-args': { const seen = []; const f = (u, i, arr) => { seen.push(u); return Promise.resolve(u * 2); }; const s = track(fetchInBatches([1, 2, 3], 2, f)); await tick(); return [seen, sum(s)]; }
    case 'big': { const urls = Array.from({ length: 20000 }, (_, i) => i); const r = await fetchInBatches(urls, 100, (u) => Promise.resolve(u + 1)); return [r.length, r[0], r[19999]]; }
  }
}
/*@@END@@*/` }, cases: [
      [["six-by-two","null"],{"res":["ok",["data1","data2","data3","data4","data5","data6"]],"finishedAt":300,"peak":2}],
      [["six-by-four","null"],{"res":["ok",["data1","data2","data3","data4","data5","data6"]],"finishedAt":200,"peak":4}],
      [["size-ge-length","null"],{"res":["ok",["data1","data2","data3"]],"finishedAt":100,"peak":3}],
      [["size-1","null"],{"res":["ok",["data1","data2","data3"]],"finishedAt":300,"peak":1}],
      [["empty","null"],{"res":["ok",[]],"finishedAt":0,"peak":0}],
      [["single","null"],{"res":["ok",["data7"]],"finishedAt":100,"peak":1}],
      [["exact-batches","null"],{"res":["ok",["data1","data2","data3","data4"]],"finishedAt":100,"peak":2}],
      [["gated-start","null"],{"first":[1,2],"mid":[1,2],"after":[1,2,3,4],"res":["ok",["data1","data2","data3","data4"]]}],
      [["failure-stops","null"],{"started":[1,2,3,4],"res":["err","Error:url 3 failed"]}],
      [["order","null"],["ok",["r1","r2","r3","r4"]]],
      [["fetcher-args","null"],[[1,2,3],["ok",[2,4,6]]]],
      [["big","null"],[20000,1,20000]]
    ] },
    solution: {
      approach: `<p>Chunk the list; run each chunk in parallel with Promise.all; run chunks one after another by chaining. Results concatenate in input order.</p>`,
      code: { lang: 'js', run: true, code: `
function fetchInBatches(urls, size, fetcher) {
  const batches = [];
  for (let i = 0; i < urls.length; i += size) batches.push(urls.slice(i, i + size));
  return batches.reduce(
    (chain, batch) => chain.then((acc) =>
      Promise.all(batch.map(fetcher)).then((res) => acc.concat(res))),  // parallel inside batch
    Promise.resolve([]));                                               // sequential across batches
}

let active = 0, peak = 0;
const fetcher = (u) => new Promise((r) => { active++; peak = Math.max(peak, active); setTimeout(() => { active--; r('data' + u); }, 100); });
const urls = [1, 2, 3, 4, 5, 6];
const t0 = Date.now();
fetchInBatches(urls, 2, fetcher).then((r) => {
  console.log('batched', r, '~' + (Date.now() - t0) + 'ms, peak concurrency', peak);
  const t1 = Date.now(); peak = 0;
  return Promise.all(urls.map(fetcher)).then(() => console.log('parallel ~' + (Date.now() - t1) + 'ms, peak', peak));
});
` },
      dry: { head: ['batch', 'urls', 'starts', 'ends'], rows: [['1', '1, 2', '0 ms', '100 ms'], ['2', '3, 4', '100 ms', '200 ms'], ['3', '5, 6', '200 ms', '300 ms']] },
      complexity: `<p>O(n) work; time ≈ ⌈n / size⌉ × batch duration; peak concurrency = size.</p>`,
      followUps: ['Replace batches with a sliding pool (see the Hard problem).', 'Use allSettled per batch so one failure does not stop the rest.']
    }
  });

  /* ================= PRACTICE: Hard ================= */
  practice.push({
    title: 'Concurrency-Limited Promise Pool (mapLimit)',
    level: 'Hard', tags: ['concurrency', 'pool', 'promises'], companies: ['Google', 'Amazon', 'Rippling', 'Stripe'],
    statement: `<p>Write <code>mapLimit(items, limit, worker)</code>. <code>worker(item, index)</code> returns a promise. Run at most <code>limit</code> workers at the same time; as soon as one finishes, start the next item (a <b>sliding window</b>, not fixed batches). Resolve with results in <b>input order</b>; reject on the first failure and start no new work after it.</p>`,
    constraints: `0 ≤ items.length ≤ 10<sup>5</sup>, 1 ≤ limit. Never more than <code>limit</code> workers in flight. A worker that throws synchronously counts as a rejection.`,
    example: `<p>durations [100, 50, 80, 30, 60], limit 2:</p>${H.table(['time', 'event', 'running'], [['0', 'start 100, start 50', '2'], ['50', '50 done → start 80', '2'], ['100', '100 done → start 30', '2'], ['130', '80 and 30 done → start 60', '1'], ['190', '60 done → resolve', '0']])}<p>Total ${H.c('g', '~190 ms')}; fixed batches of 2 would take 100 + 80 + 60 = ${H.c('r', '240 ms')}.</p>`,
    brute: { why: `<p>Fixed batches (Promise.all per chunk) respect the limit but idle while waiting for the slowest member of each batch. Plain Promise.all on everything ignores the limit.</p>`, code: { lang: 'js', run: true, code: `
const job = (ms) => new Promise((r) => setTimeout(() => r(ms), ms));
const items = [100, 50, 80, 30, 60];
const t0 = Date.now();
const chunks = [[100, 50], [80, 30], [60]];
chunks.reduce((p, c) => p.then((acc) => Promise.all(c.map(job)).then((r) => acc.concat(r))), Promise.resolve([]))
  .then((r) => console.log('batched', r, '~' + (Date.now() - t0) + 'ms'));
` } },
    mcq: { q: 'What should happen when one worker finishes?', options: ['Wait for the rest of its batch', 'Immediately start the next unstarted item if under the limit', 'Restart all workers', 'Resolve the pool'], answer: 1, explain: 'A sliding window keeps exactly limit tasks busy, so no slot sits idle.' },
    hints: [`<p>Hint 1: keep <code>next</code> (index of the next item to start), <code>active</code> (in flight) and <code>done</code> (finished).</p>`, `<p>Hint 2: a <code>launch()</code> function starts items while <code>active &lt; limit</code> and items remain. Each completion stores <code>results[i]</code>, decrements active, and calls launch again.</p>`, `<p>Hint 3: wrap the worker call in <code>Promise.resolve().then(() =&gt; worker(...))</code> so sync throws become rejections. Set a <code>failed</code> flag on error so no new work starts. Empty input → resolve([]).</p>`],
    tests: { sig: 'string string -> string', fn: '__tA', harness: { js: `function __runChild() {
  const fs = require('fs'), vm = require('vm'), util = require('util');
  process.on('unhandledRejection', () => {});
  process.on('uncaughtException', (e) => { process.stdout.write('@@ERROR uncaught ' + (e && e.stack || e) + '\\n'); process.exit(1); });
  const src = fs.readFileSync(process.env.SC_FILE, 'utf8');
  const body = src.slice(0, src.indexOf('/*@@' + 'END@@*/'));
  let now = 0, seq = 1, timers = [];
  const logs = [];
  const fake = {
    turns: 0, delays: [], uncaught: [],
    setTimeout(fn, ms, ...a) { const t = { id: seq++, at: now + Math.max(0, +ms || 0), fn, a }; timers.push(t); fake.delays.push(Math.max(0, +ms || 0)); return t.id; },
    clearTimeout(id) { timers = timers.filter((t) => t.id !== id); },
    now: () => now,
    pending: () => timers.length,
    reset() { timers = []; logs.length = 0; fake.delays.length = 0; fake.turns = 0; fake.uncaught.length = 0; },
    async flush(n = 60) { for (let i = 0; i < n; i++) await new Promise((r) => queueMicrotask(r)); },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        await fake.flush();
        timers.sort((a, b) => a.at - b.at || a.id - b.id);
        const t = timers[0];
        if (!t || t.at > end) break;
        timers.shift(); now = t.at; fake.turns++;
        try { t.fn(...t.a); } catch (e) { fake.uncaught.push(e && e.message); }
      }
      now = end; await fake.flush();
    }
  };
  const fmt = (x) => (typeof x === 'string' ? x : util.inspect(x, { depth: 3, breakLength: Infinity }));
  const ctx = vm.createContext({ console: { log: (...a) => logs.push({ t: now, s: a.map(fmt).join(' ') }), error() {}, warn() {} }, setTimeout: fake.setTimeout, clearTimeout: fake.clearTimeout, queueMicrotask, __fake: fake, __logs: logs });
  vm.runInContext(body, ctx, { filename: 'main.js' });
  (async () => {
    await fake.flush(100);
    const scenario = vm.runInContext('__scenario', ctx);
    const r = await scenario(process.env.SC_NAME, JSON.parse(process.env.SC_ARGS));
    process.stdout.write('@@RESULT ' + JSON.stringify(r === undefined ? null : r) + '\\n');
    process.exit(0);
  })().catch((e) => { process.stdout.write('@@ERROR ' + (e && e.stack || e) + '\\n'); process.exit(1); });
}
function __tA(name, argsJson) {
  const r = require('child_process').spawnSync(process.execPath, ['-e', '(' + __runChild.toString() + ')()'], {
    env: Object.assign({}, process.env, { SC_FILE: __filename, SC_NAME: name, SC_ARGS: argsJson || 'null' }), encoding: 'utf8', timeout: 20000, maxBuffer: 1 << 26
  });
  const m = /@@RESULT (.*)/.exec(r.stdout || '');
  if (!m) throw new Error('scenario failed: ' + String(r.stdout).slice(-400) + String(r.stderr).slice(-300));
  return JSON.parse(m[1]);
}
function __tD() { let res, rej; const p = new Promise((a, b) => { res = a; rej = b; }); return { p, res, rej }; }
function __tTrack(p) { const s = { st: 'pending' }; p.then((v) => { s.st = 'fulfilled'; s.v = v; }, (e) => { s.st = 'rejected'; s.e = e; }); return s; }
function __tEm(e) { return e !== null && typeof e === 'object' && 'message' in e ? e.name + ':' + e.message : e; }
function __tSum(s) { return s.st === 'fulfilled' ? ['ok', s.v] : s.st === 'rejected' ? ['err', __tEm(s.e)] : ['pending']; }
function __tBegin() { __fake.reset(); }
function __tTick(n) { return __fake.flush(n); }
function __tAdv(ms) { return __fake.advance(ms); }
function __tLater(ms, v, fail) { return new Promise((res, rej) => setTimeout(() => (fail ? rej(new Error(v)) : res(v)), ms)); }
async function __scenario(name) {
  const track = __tTrack, sum = __tSum, tick = __tTick, adv = __tAdv, later = __tLater; __tBegin();
  let running = 0, peak = 0; const started = [];
  const job = (ms, i) => { started.push(i); running++; peak = Math.max(peak, running); return later(ms, ms).then((v) => { running--; return v; }); };
  const timed = async (items, limit) => { let fin = null; const s = track(mapLimit(items, limit, (ms, i) => job(ms, i)).then((r) => { fin = __fake.now(); return r; })); await adv(100000); return { res: sum(s), finishedAt: fin, peak }; };
  switch (name) {
    case 'example': return timed([100, 50, 80, 30, 60], 2);
    case 'limit-3': return timed([100, 50, 80, 30, 60], 3);
    case 'limit-1': return timed([10, 20, 30], 1);
    case 'limit-big': return timed([10, 20, 30], 100);
    case 'empty': return timed([], 3);
    case 'failure': {
      const s = track(mapLimit([10, 20, 30], 2, (ms, i) => (i === 1 ? Promise.reject(new Error('item 1 failed')) : job(ms, i)))); await adv(1000);
      return { res: sum(s), started };
    }
    case 'sync-throw': { const s = track(mapLimit([1, 2, 3], 2, (x) => { if (x === 2) throw new Error('boom ' + x); return Promise.resolve(x); })); await tick(); return sum(s); }
    case 'order': { const s = track(mapLimit([30, 10, 20], 3, (ms) => later(ms, 'v' + ms))); await adv(100); return sum(s); }
    case 'args': { const seen = []; const s = track(mapLimit(['a', 'b'], 2, (item, i) => { seen.push([item, i]); return Promise.resolve(item + i); })); await tick(); return [seen, sum(s)]; }
    case 'sliding-window': {
      const log = []; const items = [100, 10, 10, 10]; const s = track(mapLimit(items, 2, (ms, i) => { log.push([__fake.now(), i]); return later(ms, ms); })); await adv(200);
      return { log, res: sum(s) };
    }
    case 'peak-many': { const s = track(mapLimit(Array.from({ length: 1000 }, (_, i) => (i % 5) + 1), 7, (ms, i) => job(ms, i))); await adv(100000); return { peak, res: sum(s)[0], n: started.length }; }
    case 'big-immediate': { const n = 100000; const r = await mapLimit(Array.from({ length: n }, (_, i) => i), 100, (x) => Promise.resolve(x * 2)); return [r.length, r[0], r[n - 1]]; }
    case 'after-failure-no-new': { let launched = 0; const s = track(mapLimit([1, 2, 3, 4, 5, 6], 2, (x) => { launched++; return x === 1 ? Promise.reject(new Error('f')) : later(10, x); })); await adv(100); return [launched, sum(s)]; }
    case 'falsy-results': { const s = track(mapLimit([0, 1, 2], 2, (x) => Promise.resolve(x === 0 ? 0 : x === 1 ? '' : null))); await tick(); return sum(s); }
  }
}
/*@@END@@*/` }, cases: [
      [["example","null"],{"res":["ok",[100,50,80,30,60]],"finishedAt":190,"peak":2}],
      [["limit-3","null"],{"res":["ok",[100,50,80,30,60]],"finishedAt":140,"peak":3}],
      [["limit-1","null"],{"res":["ok",[10,20,30]],"finishedAt":60,"peak":1}],
      [["limit-big","null"],{"res":["ok",[10,20,30]],"finishedAt":30,"peak":3}],
      [["empty","null"],{"res":["ok",[]],"finishedAt":0,"peak":0}],
      [["failure","null"],{"res":["err","Error:item 1 failed"],"started":[0]}],
      [["sync-throw","null"],["err","Error:boom 2"]],
      [["order","null"],["ok",["v30","v10","v20"]]],
      [["args","null"],[[["a",0],["b",1]],["ok",["a0","b1"]]]],
      [["sliding-window","null"],{"log":[[0,0],[0,1],[10,2],[20,3]],"res":["ok",[100,10,10,10]]}],
      [["peak-many","null"],{"peak":7,"res":"ok","n":1000}],
      [["big-immediate","null"],[100000,0,199998]],
      [["after-failure-no-new","null"],[2,["err","Error:f"]]],
      [["falsy-results","null"],["ok",[0,"",null]]]
    ] },
    solution: {
      approach: `<p>A self-refilling pool: launch up to <code>limit</code> tasks; every completion records its result by index and refills the pool. When <code>done === n</code>, resolve. First error → reject and stop launching.</p>`,
      code: { lang: 'js', run: true, code: `
function mapLimit(items, limit, worker) {
  return new Promise((resolve, reject) => {
    const results = new Array(items.length);
    let next = 0, active = 0, done = 0, failed = false;
    if (items.length === 0) return resolve([]);

    function launch() {
      while (active < limit && next < items.length && !failed) {
        const i = next++;
        active++;
        Promise.resolve()
          .then(() => worker(items[i], i))          // sync throw → rejection
          .then((value) => {
            results[i] = value;                      // input order
            active--; done++;
            if (done === items.length) resolve(results);
            else launch();                           // refill the free slot
          }, (err) => { failed = true; reject(err); });
      }
    }
    launch();
  });
}

let running = 0, peak = 0;
const job = (ms) => new Promise((r) => {
  running++; peak = Math.max(peak, running);
  setTimeout(() => { running--; r(ms); }, ms);
});
const t0 = Date.now();
mapLimit([100, 50, 80, 30, 60], 2, job)
  .then((r) => console.log('results', r, 'peak', peak, '~' + (Date.now() - t0) + 'ms'))
  .then(() => mapLimit([10, 20, 30], 2, (ms, i) => (i === 1 ? Promise.reject(new Error('item 1 failed')) : job(ms))))
  .catch((e) => console.log('pool stopped:', e.message));
` },
      dry: { head: ['time', 'event', 'active', 'next'], rows: [['0', 'launch 0 (100), 1 (50)', '2', '2'], ['50', '1 done → launch 2 (80)', '2', '3'], ['100', '0 done → launch 3 (30)', '2', '4'], ['130', '2 done → launch 4 (60); 3 done', '1', '5'], ['190', '4 done → done = 5 → resolve', '0', '5']] },
      complexity: `<p>O(n) time and space; peak concurrency = limit; wall time ≈ total work / limit (better than batches when durations vary).</p>`,
      followUps: ['Return an async iterator that yields results as they complete.', 'Add per-task timeout and retry.', 'Support cancelling all in-flight work with an AbortSignal.']
    }
  });

  practice.push({
    title: 'Build Your Own Promise (MyPromise)',
    level: 'Hard', tags: ['promises', 'polyfill', 'state machine', 'microtasks'], companies: ['Google', 'Meta', 'Atlassian'],
    statement: `<p>Implement a class <code>MyPromise</code> with: the executor (sync, try/catch → reject), the three states with settle-once, <code>then(onFulfilled, onRejected)</code> returning a new MyPromise, handlers run <b>asynchronously</b> (microtasks), returned values / thenables adopted by the next promise, pass-through when a handler is missing, plus <code>catch</code>, <code>finally</code>, <code>MyPromise.resolve</code> and <code>MyPromise.reject</code>.</p>`,
    constraints: `Use queueMicrotask for scheduling. Must interoperate with native promises (thenables). Resolving a promise with itself must reject with a TypeError.`,
    example: `<pre>new MyPromise((r) =&gt; setTimeout(() =&gt; r(1), 20))
  .then((v) =&gt; v + 1)
  .then((v) =&gt; new MyPromise((r) =&gt; setTimeout(() =&gt; r(v * 10), 20)))
  .then((v) =&gt; { throw new Error('boom'); })
  .catch((e) =&gt; 'recovered')
  .finally(() =&gt; console.log('finally ran'))
  .then(console.log);   // finally ran, recovered</pre>`,
    brute: { why: `<p>A first attempt usually stores one callback and calls it synchronously on resolve. It breaks: multiple <code>.then</code> calls, handlers attached after settling, chaining (then returns nothing), adoption of returned promises, and the async guarantee.</p>`, code: { lang: 'js', run: true, code: `
class NaivePromise {
  constructor(executor) { this.cb = null; executor((v) => { this.value = v; if (this.cb) this.cb(v); }); }
  then(cb) { this.cb = cb; }      // no chaining, one handler only, nothing if already resolved
}
new NaivePromise((r) => r('sync value')).then((v) => console.log('never printed:', v));
new NaivePromise((r) => setTimeout(() => r('late value'), 10)).then((v) => console.log('only works when late:', v));
` } },
    mcq: { q: 'What must then() do if the promise is ALREADY fulfilled?', options: ['Call the handler synchronously right now', 'Ignore the handler', 'Schedule the handler as a microtask with the stored value', 'Throw'], answer: 2, explain: 'Handlers are always async, whether attached before or after settling — consistent ordering, no Zalgo.' },
    hints: [`<p>Hint 1: store <code>state</code>, <code>value</code> and a list of <b>reactions</b> <code>{onFulfilled, onRejected, resolve, reject}</code>, where resolve/reject belong to the promise that <code>then</code> returns.</p>`, `<p>Hint 2: when settling, schedule every reaction with <code>queueMicrotask</code>. A reaction calls the right handler and passes its return value to the child's <b>resolve</b> (or the thrown error to reject). Missing handler → forward value/error unchanged.</p>`, `<p>Hint 3: resolve(x): if x === this → TypeError; if x has a callable <code>then</code> → call it (once-guarded) to adopt the state; else fulfil. Use one shared "called" flag so only the first resolve/reject counts.</p>`],
    tests: { sig: 'string string -> string', fn: '__tA', harness: { js: `function __runChild() {
  const fs = require('fs'), vm = require('vm'), util = require('util');
  process.on('unhandledRejection', () => {});
  process.on('uncaughtException', (e) => { process.stdout.write('@@ERROR uncaught ' + (e && e.stack || e) + '\\n'); process.exit(1); });
  const src = fs.readFileSync(process.env.SC_FILE, 'utf8');
  const body = src.slice(0, src.indexOf('/*@@' + 'END@@*/'));
  let now = 0, seq = 1, timers = [];
  const logs = [];
  const fake = {
    turns: 0, delays: [], uncaught: [],
    setTimeout(fn, ms, ...a) { const t = { id: seq++, at: now + Math.max(0, +ms || 0), fn, a }; timers.push(t); fake.delays.push(Math.max(0, +ms || 0)); return t.id; },
    clearTimeout(id) { timers = timers.filter((t) => t.id !== id); },
    now: () => now,
    pending: () => timers.length,
    reset() { timers = []; logs.length = 0; fake.delays.length = 0; fake.turns = 0; fake.uncaught.length = 0; },
    async flush(n = 60) { for (let i = 0; i < n; i++) await new Promise((r) => queueMicrotask(r)); },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        await fake.flush();
        timers.sort((a, b) => a.at - b.at || a.id - b.id);
        const t = timers[0];
        if (!t || t.at > end) break;
        timers.shift(); now = t.at; fake.turns++;
        try { t.fn(...t.a); } catch (e) { fake.uncaught.push(e && e.message); }
      }
      now = end; await fake.flush();
    }
  };
  const fmt = (x) => (typeof x === 'string' ? x : util.inspect(x, { depth: 3, breakLength: Infinity }));
  const ctx = vm.createContext({ console: { log: (...a) => logs.push({ t: now, s: a.map(fmt).join(' ') }), error() {}, warn() {} }, setTimeout: fake.setTimeout, clearTimeout: fake.clearTimeout, queueMicrotask, __fake: fake, __logs: logs });
  vm.runInContext(body, ctx, { filename: 'main.js' });
  (async () => {
    await fake.flush(100);
    const scenario = vm.runInContext('__scenario', ctx);
    const r = await scenario(process.env.SC_NAME, JSON.parse(process.env.SC_ARGS));
    process.stdout.write('@@RESULT ' + JSON.stringify(r === undefined ? null : r) + '\\n');
    process.exit(0);
  })().catch((e) => { process.stdout.write('@@ERROR ' + (e && e.stack || e) + '\\n'); process.exit(1); });
}
function __tA(name, argsJson) {
  const r = require('child_process').spawnSync(process.execPath, ['-e', '(' + __runChild.toString() + ')()'], {
    env: Object.assign({}, process.env, { SC_FILE: __filename, SC_NAME: name, SC_ARGS: argsJson || 'null' }), encoding: 'utf8', timeout: 20000, maxBuffer: 1 << 26
  });
  const m = /@@RESULT (.*)/.exec(r.stdout || '');
  if (!m) throw new Error('scenario failed: ' + String(r.stdout).slice(-400) + String(r.stderr).slice(-300));
  return JSON.parse(m[1]);
}
function __tD() { let res, rej; const p = new Promise((a, b) => { res = a; rej = b; }); return { p, res, rej }; }
function __tTrack(p) { const s = { st: 'pending' }; p.then((v) => { s.st = 'fulfilled'; s.v = v; }, (e) => { s.st = 'rejected'; s.e = e; }); return s; }
function __tEm(e) { return e !== null && typeof e === 'object' && 'message' in e ? e.name + ':' + e.message : e; }
function __tSum(s) { return s.st === 'fulfilled' ? ['ok', s.v] : s.st === 'rejected' ? ['err', __tEm(s.e)] : ['pending']; }
function __tBegin() { __fake.reset(); }
function __tTick(n) { return __fake.flush(n); }
function __tAdv(ms) { return __fake.advance(ms); }
function __tLater(ms, v, fail) { return new Promise((res, rej) => setTimeout(() => (fail ? rej(new Error(v)) : res(v)), ms)); }
async function __scenario(name) {
  const track = __tTrack, sum = __tSum, tick = __tTick, adv = __tAdv, em = __tEm, D = __tD; __tBegin();
  const log = [];
  switch (name) {
    case 'sync-async-order': { log.push('start'); new MyPromise((r) => { log.push('executor'); r(1); }).then(() => log.push('then')); log.push('end'); await tick(); return log; }
    case 'chain': { const s = track(MyPromise.resolve(1).then((v) => v + 1).then((v) => v * 10)); await tick(); return sum(s); }
    case 'adopt-mypromise': { const s = track(MyPromise.resolve(1).then((v) => new MyPromise((r) => r(v + 41)))); await tick(); return sum(s); }
    case 'adopt-native': { const s = track(MyPromise.resolve(Promise.resolve('native'))); await tick(); return sum(s); }
    case 'adopt-thenable': { const s = track(new MyPromise((r) => r({ then(res) { res('thenable'); } }))); await tick(); return sum(s); }
    case 'executor-throws': { const s = track(new MyPromise(() => { throw new Error('exec'); })); await tick(); return sum(s); }
    case 'settle-once': { const a = track(new MyPromise((res, rej) => { res('first'); rej('second'); res('third'); })); const b = track(new MyPromise((res, rej) => { rej('r1'); res('x'); })); await tick(); return [sum(a), sum(b)]; }
    case 'pass-through': { const a = track(MyPromise.resolve(5).then().then((v) => v)); const b = track(MyPromise.reject(new Error('e')).then((v) => v).catch((e) => 'caught ' + e.message)); await tick(); return [sum(a), sum(b)]; }
    case 'catch-recover': { const s = track(MyPromise.reject(new Error('boom')).catch((e) => 'recovered ' + e.message).then((v) => v + '!')); await tick(); return sum(s); }
    case 'handler-throws': { const s = track(MyPromise.resolve(1).then(() => { throw new Error('in handler'); }).then(() => 'skipped')); await tick(); return sum(s); }
    case 'finally-pass': { const f = []; const a = track(MyPromise.resolve('v').finally(() => { f.push('f1'); return 'ignored'; })); const b = track(MyPromise.reject(new Error('r')).finally(() => { f.push('f2'); })); await tick(); return [sum(a), sum(b), f]; }
    case 'finally-throws': { const s = track(MyPromise.resolve('v').finally(() => { throw new Error('fin'); })); await tick(); return sum(s); }
    case 'finally-awaits': { const d = D(); const s = track(MyPromise.resolve('v').finally(() => d.p)); await tick(); const mid = s.st; d.res(); await tick(); return [mid, sum(s)]; }
    case 'self-resolution': { let selfP; selfP = new MyPromise((r) => { queueMicrotask(() => r(selfP)); }); const s = track(selfP); await tick(); return sum(s); }
    case 'resolve-static': { const p = new MyPromise((r) => r(1)); return [MyPromise.resolve(p) === p, MyPromise.resolve(3) instanceof MyPromise, MyPromise.reject(1) instanceof MyPromise]; }
    case 'multiple-then': { const p = MyPromise.resolve('x'); p.then((v) => log.push('a' + v)); p.then((v) => log.push('b' + v)); p.then((v) => log.push('c' + v)); await tick(); return log; }
    case 'late-then': { const p = MyPromise.resolve(1); await tick(); p.then((v) => log.push('late' + v)); const sync = log.length; await tick(); return [sync, log]; }
    case 'pending-then': { let res; const p = new MyPromise((r) => { res = r; }); p.then((v) => log.push(v)); await tick(); const before = log.length; res('go'); await tick(); return [before, log]; }
    case 'interleave': {
      const trace = (P) => { const out = []; const a = P.resolve().then(() => out.push('a1')).then(() => out.push('a2')).then(() => out.push('a3')); const b = P.resolve().then(() => out.push('b1')).then(() => out.push('b2')).then(() => out.push('b3')); return { out, done: Promise.all([a, b]) }; };
      const mine = trace(MyPromise), native = trace(Promise); await tick(100); return [mine.out, native.out, mine.out.join() === native.out.join()];
    }
    case 'non-function-handlers': { const s = track(MyPromise.resolve(7).then(5, 6)); const t = track(MyPromise.reject(new Error('z')).then(null, null)); await tick(); return [sum(s), sum(t)]; }
    case 'thenable-throws-after-resolve': { const s = track(new MyPromise((r) => r({ then(res) { res('ok'); throw new Error('ignored'); } }))); await tick(); return sum(s); }
    case 'thenable-calls-twice': { const s = track(new MyPromise((r) => r({ then(res, rej) { res('one'); res('two'); rej(new Error('three')); } }))); await tick(); return sum(s); }
    case 'then-getter-throws': { const evil = {}; Object.defineProperty(evil, 'then', { get() { throw new Error('getter'); } }); const s = track(new MyPromise((r) => r(evil))); await tick(); return sum(s); }
    case 'nested-adoption': { let p = MyPromise.resolve('deep'); for (let i = 0; i < 100; i++) { const prev = p; p = MyPromise.resolve().then(() => prev); } const s = track(p); await tick(2000); return sum(s); }
    case 'long-chain': { let p = MyPromise.resolve(0); for (let i = 0; i < 10000; i++) p = p.then((v) => v + 1); const s = track(p); await tick(30000); return sum(s); }
    case 'rejection-reasons': { const s = track(new MyPromise((_, rej) => rej(undefined))); await tick(); return [s.st, s.e === undefined]; }
    case 'demo-chain': {
      const out = []; const p = new MyPromise((r) => setTimeout(() => r(1), 20)).then((v) => v + 1).then((v) => new MyPromise((r) => setTimeout(() => r(v * 10), 20))).then(() => { throw new Error('boom'); }).catch((e) => 'recovered').finally(() => out.push('finally ran')).then((v) => out.push(v));
      await adv(40); await tick(); return out;
    }
    case 'state-fields': { const p = MyPromise.resolve(9); await tick(); const q = MyPromise.reject(new Error('x')); q.catch(() => {}); await tick(); return [p.state, p.value, q.state]; }
  }
}
/*@@END@@*/` }, cases: [
      [["sync-async-order","null"],["start","executor","end","then"]],
      [["chain","null"],["ok",20]],
      [["adopt-mypromise","null"],["ok",42]],
      [["adopt-native","null"],["ok","native"]],
      [["adopt-thenable","null"],["ok","thenable"]],
      [["executor-throws","null"],["err","Error:exec"]],
      [["settle-once","null"],[["ok","first"],["err","r1"]]],
      [["pass-through","null"],[["ok",5],["ok","caught e"]]],
      [["catch-recover","null"],["ok","recovered boom!"]],
      [["handler-throws","null"],["err","Error:in handler"]],
      [["finally-pass","null"],[["ok","v"],["err","Error:r"],["f1","f2"]]],
      [["finally-throws","null"],["err","Error:fin"]],
      [["finally-awaits","null"],["pending",["ok","v"]]],
      [["self-resolution","null"],["err","TypeError:Chaining cycle detected"]],
      [["resolve-static","null"],[true,true,true]],
      [["multiple-then","null"],["ax","bx","cx"]],
      [["late-then","null"],[0,["late1"]]],
      [["pending-then","null"],[0,["go"]]],
      [["interleave","null"],[["a1","b1","a2","b2","a3","b3"],["a1","b1","a2","b2","a3","b3"],true]],
      [["non-function-handlers","null"],[["ok",7],["err","Error:z"]]],
      [["thenable-throws-after-resolve","null"],["ok","ok"]],
      [["thenable-calls-twice","null"],["ok","one"]],
      [["then-getter-throws","null"],["err","Error:getter"]],
      [["nested-adoption","null"],["ok","deep"]],
      [["long-chain","null"],["ok",10000]],
      [["rejection-reasons","null"],["rejected",true]],
      [["demo-chain","null"],["finally ran","recovered"]],
      [["state-fields","null"],["fulfilled",9,"rejected"]]
    ] },
    solution: {
      approach: `<p>The promise is a tiny state machine plus a reaction queue. <code>then</code> creates a child promise and registers a reaction; settling (or attaching to an already-settled promise) schedules reactions as microtasks. The resolve procedure adopts thenables, which is what makes chaining flat. <code>finally</code> is built on <code>then</code> so it waits for async cleanup and passes the original result through.</p>`,
      code: { lang: 'js', run: true, code: `
class MyPromise {
  constructor(executor) {
    this.state = 'pending';
    this.value = undefined;
    this.reactions = [];
    let called = false;                                      // first settle wins
    const resolve = (x) => { if (called) return; called = true; this._resolve(x); };
    const reject = (e) => { if (called) return; called = true; this._settle('rejected', e); };
    try { executor(resolve, reject); } catch (e) { reject(e); } // sync executor
  }
  _resolve(x) {
    if (x === this) return this._settle('rejected', new TypeError('Chaining cycle detected'));
    if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
      let then;
      try { then = x.then; } catch (e) { return this._settle('rejected', e); }
      if (typeof then === 'function') {                      // thenable → adopt
        let done = false;
        queueMicrotask(() => {
          try {
            then.call(x,
              (y) => { if (!done) { done = true; this._resolve(y); } },
              (r) => { if (!done) { done = true; this._settle('rejected', r); } });
          } catch (e) { if (!done) { done = true; this._settle('rejected', e); } }
        });
        return;
      }
    }
    this._settle('fulfilled', x);
  }
  _settle(state, value) {
    if (this.state !== 'pending') return;
    this.state = state;
    this.value = value;
    this.reactions.forEach((r) => this._schedule(r));
    this.reactions = null;
  }
  _schedule(r) {
    queueMicrotask(() => {                                   // handlers are always async
      const handler = this.state === 'fulfilled' ? r.onFulfilled : r.onRejected;
      if (typeof handler !== 'function') {                   // pass-through
        return this.state === 'fulfilled' ? r.resolve(this.value) : r.reject(this.value);
      }
      try { r.resolve(handler(this.value)); } catch (e) { r.reject(e); }
    });
  }
  then(onFulfilled, onRejected) {
    return new MyPromise((resolve, reject) => {
      const r = { onFulfilled, onRejected, resolve, reject };
      if (this.state === 'pending') this.reactions.push(r);
      else this._schedule(r);
    });
  }
  catch(onRejected) { return this.then(undefined, onRejected); }
  finally(onFinally) {
    return this.then(
      (v) => MyPromise.resolve(onFinally()).then(() => v),
      (e) => MyPromise.resolve(onFinally()).then(() => { throw e; }));
  }
  static resolve(v) { return v instanceof MyPromise ? v : new MyPromise((res) => res(v)); }
  static reject(e) { return new MyPromise((_, rej) => rej(e)); }
}

console.log('sync start');
new MyPromise((resolve) => setTimeout(() => resolve(1), 20))
  .then((v) => { console.log('got', v); return v + 1; })
  .then((v) => new MyPromise((res) => setTimeout(() => res(v * 10), 20)))
  .then((v) => { console.log('adopted inner promise:', v); throw new Error('boom'); })
  .then(() => console.log('skipped'))
  .catch((e) => { console.log('caught', e.message); return 'recovered'; })
  .finally(() => console.log('finally ran'))
  .then((v) => console.log('final value', v));
MyPromise.resolve(Promise.resolve('native thenable')).then((v) => console.log('interop:', v));
new MyPromise((res, rej) => { res('first'); rej('second'); }).then((v) => console.log('first settle wins:', v));
console.log('sync end');
` },
      dry: { head: ['time', 'event', 'state of chain'], rows: [['0 ms', 'sync start / sync end printed; handlers registered', 'all pending'], ['0 ms (microtasks)', "'first settle wins', 'interop' handlers run", '—'], ['20 ms', 'resolve(1) → got 1 → returns 2', 'link 2 fulfilled'], ['40 ms', 'inner MyPromise adopted → 20 → throw', 'rejected boom'], ['40 ms', "skipped → caught → finally → 'recovered'", 'fulfilled recovered']] },
      complexity: `<p>O(1) per then/settle; each reaction runs once. Memory: reactions are released after settling.</p>`,
      followUps: ['Add MyPromise.all / race as statics.', 'Track unhandled rejections (warn if a rejected promise has no handler after a tick).', 'Which Promises/A+ test cases does this pass?']
    }
  });

  practice.push({
    title: 'Predict the Output: Returning a Promise Costs Two Extra Ticks',
    level: 'Hard', tags: ['predict output', 'microtasks', 'thenable adoption'], companies: ['ByteDance', 'Meta', 'Google'],
    statement: `<p>A famous puzzle. Predict the output, and explain why <code>4</code> appears where it does.</p><pre>Promise.resolve()
  .then(() =&gt; { console.log(0); return Promise.resolve(4); })
  .then((x) =&gt; console.log(x));

Promise.resolve()
  .then(() =&gt; console.log(1))
  .then(() =&gt; console.log(2))
  .then(() =&gt; console.log(3))
  .then(() =&gt; console.log(5))
  .then(() =&gt; console.log(6));</pre>`,
    constraints: `Modern V8 / spec-compliant engine.`,
    example: `<p>Output: <b>0 1 2 3 4 5 6</b>. Returning a <b>promise</b> from a handler is not like returning a value: adopting it costs ${H.c('y', 'two extra microtask ticks')} (NewPromiseResolveThenableJob, then the inner then's reaction).</p>`,
    brute: { why: `<p>The naive guess treats <code>return Promise.resolve(4)</code> like <code>return 4</code>, giving <b>0 1 4 2 3 5 6</b>. That would be true for a plain value — but promise adoption takes extra jobs.</p>`, code: { lang: 'js', run: true, code: `
// With a plain value the guess IS right: 0 1 4 2 3 5 6
const out = [];
Promise.resolve().then(() => { out.push(0); return 4; }).then((x) => out.push(x));
Promise.resolve().then(() => out.push(1)).then(() => out.push(2)).then(() => out.push(3)).then(() => out.push(5)).then(() => out.push(6));
setTimeout(() => console.log('plain value version:', out.join(' ')), 0);
` } },
    mcq: { q: 'How many microtask ticks does `return Promise.resolve(4)` add compared to `return 4`?', options: ['0', '1', '2', 'It waits for a macrotask'], answer: 2, explain: 'Tick A: NewPromiseResolveThenableJob calls inner.then(resolveOuter). Tick B: that then-reaction runs and resolves the outer promise. Then the next handler is queued.' },
    hints: [`<p>Hint 1: write ticks as columns. Tick 1: log 0 (returns a promise), log 1.</p>`, `<p>Hint 2: resolving with a thenable queues a <b>job</b> (tick 2) that calls <code>p.then(resolve)</code>; that reaction runs on tick 3 and finally fulfils the outer promise.</p>`, `<p>Hint 3: the handler that logs 4 runs on tick 4. Count the ticks: 2 prints on tick 2, 3 on tick 3, 4 and 5 on tick 4 (4 was queued first), 6 on tick 5.</p>`],
    tests: { io: true, cases: [
      {"stdin":"","stdout":"0 1 2 3 4 5 6"}
    ] },
    solution: {
      approach: `<p>Simulate ticks. Chain B advances one link per tick (1, 2, 3, 5, 6 on ticks 1–5). Chain A: tick 1 logs 0 and returns a native promise → tick 2: ResolveThenableJob → tick 3: inner reaction resolves outer → tick 4: <code>x =&gt; log(x)</code> runs. On tick 3 the adoption reaction runs <b>before</b> the handler that logs 3, so the 4-handler is queued ahead of the 5-handler; on tick 4, 4 prints before 5.</p>`,
      code: { lang: 'js', run: true, code: `
const out = [];
Promise.resolve()
  .then(() => { out.push(0); return Promise.resolve(4); })   // adoption: +2 ticks
  .then((x) => out.push(x));
Promise.resolve()
  .then(() => out.push(1))
  .then(() => out.push(2))
  .then(() => out.push(3))
  .then(() => out.push(5))
  .then(() => out.push(6));
setTimeout(() => console.log(out.join(' ')), 0);   // 0 1 2 3 4 5 6
` },
      dry: { head: ['tick', 'chain A', 'chain B'], rows: [['1', 'log 0, return promise', 'log 1'], ['2', 'ResolveThenableJob: inner.then(...)', 'log 2'], ['3', 'inner reaction resolves outer', 'log 3'], ['4', 'log 4', 'log 5'], ['5', '—', 'log 6']] },
      complexity: `<p>Puzzle; the lesson: returning a native promise from a handler costs 2 ticks; async functions that <code>return await p</code> vs <code>return p</code> differ similarly (Module JS 8).</p>`,
      followUps: ['What if chain A returned a non-native thenable { then(r) { r(4); } }?', 'What if A used .then(() => 4) — where does 4 go?']
    }
  });

  practice.push({
    title: 'Async Memoize with In-Flight Dedupe',
    level: 'Hard', tags: ['caching', 'promises', 'dedupe'], companies: ['Netflix', 'Airbnb', 'Shopify'],
    statement: `<p>Write <code>memoizeAsync(fn)</code> for a promise-returning <code>fn(key)</code>. Requirements: (1) concurrent calls with the same key share <b>one</b> in-flight request; (2) successful results are cached; (3) a <b>failed</b> call must be evicted so the next call retries; (4) sync throws from fn become rejections.</p>`,
    constraints: `Keys are strings/numbers. Calls with different keys are independent.`,
    example: `<p>Three components call <code>getUser(1)</code> at the same moment → ${H.c('g', 'one network call')}, all three get the same object. <code>getUser(-1)</code> fails → evicted → next <code>getUser(-1)</code> calls fn again.</p>`,
    brute: { why: `<p>Caching the <b>value</b> (after it arrives) does not dedupe concurrent calls: all three see an empty cache and each fires a request. Caching the promise without eviction caches failures forever.</p>`, code: { lang: 'js', run: true, code: `
let calls = 0;
const fetchUser = (id) => new Promise((r) => { calls++; setTimeout(() => r({ id }), 20); });
const cache = new Map();
function getUserBad(id) {
  if (cache.has(id)) return Promise.resolve(cache.get(id));
  return fetchUser(id).then((u) => { cache.set(id, u); return u; });  // caches VALUE, too late
}
Promise.all([getUserBad(1), getUserBad(1), getUserBad(1)]).then(() => console.log('value cache made', calls, 'calls'));
` } },
    mcq: { q: 'What should the cache store to dedupe concurrent calls?', options: ['The resolved value', 'The promise itself, stored immediately', 'A boolean "loading" flag', 'Nothing'], answer: 1, explain: 'Storing the promise synchronously means every later caller gets the same in-flight promise.' },
    hints: [`<p>Hint 1: <code>cache.set(key, promise)</code> <b>before</b> the promise settles; return <code>cache.get(key)</code> on hits.</p>`, `<p>Hint 2: attach <code>p.catch(() =&gt; cache.delete(key))</code> — but only delete if the cache still holds <b>this</b> promise (a newer one may have replaced it).</p>`, `<p>Hint 3: build p as <code>Promise.resolve().then(() =&gt; fn(key))</code> so sync throws reject. The eviction catch also prevents an unhandled-rejection warning for that internal branch; callers still see the rejection.</p>`],
    tests: { sig: 'string string -> string', fn: '__tA', harness: { js: `function __runChild() {
  const fs = require('fs'), vm = require('vm'), util = require('util');
  process.on('unhandledRejection', () => {});
  process.on('uncaughtException', (e) => { process.stdout.write('@@ERROR uncaught ' + (e && e.stack || e) + '\\n'); process.exit(1); });
  const src = fs.readFileSync(process.env.SC_FILE, 'utf8');
  const body = src.slice(0, src.indexOf('/*@@' + 'END@@*/'));
  let now = 0, seq = 1, timers = [];
  const logs = [];
  const fake = {
    turns: 0, delays: [], uncaught: [],
    setTimeout(fn, ms, ...a) { const t = { id: seq++, at: now + Math.max(0, +ms || 0), fn, a }; timers.push(t); fake.delays.push(Math.max(0, +ms || 0)); return t.id; },
    clearTimeout(id) { timers = timers.filter((t) => t.id !== id); },
    now: () => now,
    pending: () => timers.length,
    reset() { timers = []; logs.length = 0; fake.delays.length = 0; fake.turns = 0; fake.uncaught.length = 0; },
    async flush(n = 60) { for (let i = 0; i < n; i++) await new Promise((r) => queueMicrotask(r)); },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        await fake.flush();
        timers.sort((a, b) => a.at - b.at || a.id - b.id);
        const t = timers[0];
        if (!t || t.at > end) break;
        timers.shift(); now = t.at; fake.turns++;
        try { t.fn(...t.a); } catch (e) { fake.uncaught.push(e && e.message); }
      }
      now = end; await fake.flush();
    }
  };
  const fmt = (x) => (typeof x === 'string' ? x : util.inspect(x, { depth: 3, breakLength: Infinity }));
  const ctx = vm.createContext({ console: { log: (...a) => logs.push({ t: now, s: a.map(fmt).join(' ') }), error() {}, warn() {} }, setTimeout: fake.setTimeout, clearTimeout: fake.clearTimeout, queueMicrotask, __fake: fake, __logs: logs });
  vm.runInContext(body, ctx, { filename: 'main.js' });
  (async () => {
    await fake.flush(100);
    const scenario = vm.runInContext('__scenario', ctx);
    const r = await scenario(process.env.SC_NAME, JSON.parse(process.env.SC_ARGS));
    process.stdout.write('@@RESULT ' + JSON.stringify(r === undefined ? null : r) + '\\n');
    process.exit(0);
  })().catch((e) => { process.stdout.write('@@ERROR ' + (e && e.stack || e) + '\\n'); process.exit(1); });
}
function __tA(name, argsJson) {
  const r = require('child_process').spawnSync(process.execPath, ['-e', '(' + __runChild.toString() + ')()'], {
    env: Object.assign({}, process.env, { SC_FILE: __filename, SC_NAME: name, SC_ARGS: argsJson || 'null' }), encoding: 'utf8', timeout: 20000, maxBuffer: 1 << 26
  });
  const m = /@@RESULT (.*)/.exec(r.stdout || '');
  if (!m) throw new Error('scenario failed: ' + String(r.stdout).slice(-400) + String(r.stderr).slice(-300));
  return JSON.parse(m[1]);
}
function __tD() { let res, rej; const p = new Promise((a, b) => { res = a; rej = b; }); return { p, res, rej }; }
function __tTrack(p) { const s = { st: 'pending' }; p.then((v) => { s.st = 'fulfilled'; s.v = v; }, (e) => { s.st = 'rejected'; s.e = e; }); return s; }
function __tEm(e) { return e !== null && typeof e === 'object' && 'message' in e ? e.name + ':' + e.message : e; }
function __tSum(s) { return s.st === 'fulfilled' ? ['ok', s.v] : s.st === 'rejected' ? ['err', __tEm(s.e)] : ['pending']; }
function __tBegin() { __fake.reset(); }
function __tTick(n) { return __fake.flush(n); }
function __tAdv(ms) { return __fake.advance(ms); }
function __tLater(ms, v, fail) { return new Promise((res, rej) => setTimeout(() => (fail ? rej(new Error(v)) : res(v)), ms)); }
async function __scenario(name) {
  const track = __tTrack, sum = __tSum, tick = __tTick, adv = __tAdv, D = __tD; __tBegin();
  let calls = 0; const ds = new Map();
  const fn = (key) => { calls++; const d = D(); ds.set(key, d); return d.p; };
  switch (name) {
    case 'dedupe': { const get = memoizeAsync(fn); const a = get(1), b = get(1), c = get(1); await tick(); const c1 = calls; ds.get(1).res({ id: 1 }); await tick(); const r = await Promise.all([a, b, c]); return { calls: c1, same: a === b && b === c, sameObject: r[0] === r[2], id: r[0].id }; }
    case 'cached-after-success': { const get = memoizeAsync(fn); const p1 = get('k'); await tick(); ds.get('k').res('v'); await p1; const p2 = get('k'); await tick(); return { calls, same: p1 === p2, v: await p2 }; }
    case 'evict-on-failure': {
      const get = memoizeAsync(fn); const p1 = get(-1); await tick(); ds.get(-1).rej(new Error('bad id')); const s1 = track(p1); await tick();
      const p2 = get(-1); const s2 = track(p2); await tick(); const afterRetry = calls; ds.get(-1).res('good'); await tick(); return { first: sum(s1), afterRetry, second: sum(s2), differentPromise: p1 !== p2 };
    }
    case 'concurrent-failure-shared': { const get = memoizeAsync(fn); const a = track(get('x')), b = track(get('x')); await tick(); ds.get('x').rej(new Error('nope')); await tick(); return { calls, a: sum(a), b: sum(b) }; }
    case 'sync-throw': { const get = memoizeAsync(() => { calls++; throw new Error('sync boom'); }); const s = track(get('k')); await tick(); const s2 = track(get('k')); await tick(); return { calls, a: sum(s), b: sum(s2) }; }
    case 'independent-keys': { const get = memoizeAsync(fn); get(1); get(2); get('1'); await tick(); return { calls, keys: [...ds.keys()] }; }
    case 'undefined-result-cached': { const get = memoizeAsync((k) => { calls++; return Promise.resolve(undefined); }); await get('a'); await get('a'); return calls; }
    case 'falsy-results-cached': { const get = memoizeAsync(() => { calls++; return Promise.resolve(0); }); const r = [await get('a'), await get('a')]; return [r, calls]; }
    case 'failure-does-not-evict-other-keys': { const get = memoizeAsync(fn); const ok = get('ok'); const bad = track(get('bad')); await tick(); ds.get('ok').res(1); ds.get('bad').rej(new Error('b')); await tick(); await get('ok'); return { calls, bad: sum(bad), ok: await ok }; }
    case 'many-keys': { const get = memoizeAsync((k) => { calls++; return Promise.resolve(k * 2); }); const r = await Promise.all(Array.from({ length: 10000 }, (_, i) => get(i))); const r2 = await Promise.all(Array.from({ length: 10000 }, (_, i) => get(i))); return [calls, r[9999], r2[5000]]; }
    case 'many-concurrent-same': { const get = memoizeAsync(fn); const ps = Array.from({ length: 10000 }, () => get('same')); await tick(); ds.get('same').res('one'); const r = await Promise.all(ps); return [calls, r.every((v) => v === 'one')]; }
    case 'retry-can-fail-again': { const get = memoizeAsync(fn); const a = track(get('r')); await tick(); ds.get('r').rej(new Error('1')); await tick(); const b = track(get('r')); await tick(); ds.get('r').rej(new Error('2')); await tick(); return { calls, a: sum(a), b: sum(b) }; }
  }
}
/*@@END@@*/` }, cases: [
      [["dedupe","null"],{"calls":1,"same":true,"sameObject":true,"id":1}],
      [["cached-after-success","null"],{"calls":1,"same":true,"v":"v"}],
      [["evict-on-failure","null"],{"first":["err","Error:bad id"],"afterRetry":2,"second":["ok","good"],"differentPromise":true}],
      [["concurrent-failure-shared","null"],{"calls":1,"a":["err","Error:nope"],"b":["err","Error:nope"]}],
      [["sync-throw","null"],{"calls":2,"a":["err","Error:sync boom"],"b":["err","Error:sync boom"]}],
      [["independent-keys","null"],{"calls":3,"keys":[1,2,"1"]}],
      [["undefined-result-cached","null"],1],
      [["falsy-results-cached","null"],[[0,0],1]],
      [["failure-does-not-evict-other-keys","null"],{"calls":2,"bad":["err","Error:b"],"ok":1}],
      [["many-keys","null"],[10000,19998,10000]],
      [["many-concurrent-same","null"],[1,true]],
      [["retry-can-fail-again","null"],{"calls":2,"a":["err","Error:1"],"b":["err","Error:2"]}]
    ] },
    solution: {
      approach: `<p>Cache promises, not values. Insert synchronously for dedupe, evict on rejection (guarded by identity), and let callers handle errors on their own branch.</p>`,
      code: { lang: 'js', run: true, code: `
function memoizeAsync(fn) {
  const cache = new Map();
  return function (key) {
    if (cache.has(key)) return cache.get(key);          // hit: same promise (maybe in flight)
    const p = Promise.resolve().then(() => fn(key));    // sync throw → rejection
    cache.set(key, p);                                  // store BEFORE it settles → dedupe
    p.catch(() => { if (cache.get(key) === p) cache.delete(key); }); // evict failures
    return p;
  };
}

let calls = 0;
const fetchUser = (id) => new Promise((res, rej) => {
  calls++;
  setTimeout(() => (id < 0 ? rej(new Error('bad id')) : res({ id })), 30);
});
const getUser = memoizeAsync(fetchUser);

Promise.all([getUser(1), getUser(1), getUser(1)])
  .then((u) => console.log('3 callers, calls =', calls, '| same object?', u[0] === u[2]))
  .then(() => getUser(-1).catch((e) => console.log('failed:', e.message)))
  .then(() => getUser(-1).catch(() => console.log('retried after eviction, calls =', calls)));
` },
      complexity: `<p>O(1) per call; memory grows with distinct keys — add TTL or an LRU bound in production.</p>`,
      followUps: ['Add a TTL so cached results expire.', 'Bound the cache with LRU eviction.', 'How do SWR / React Query build on this idea (stale-while-revalidate)?']
    }
  });

  practice.push({
    title: 'Latest-Only Requests (Ignore Stale Responses)',
    level: 'Hard', tags: ['race conditions', 'search-as-you-type', 'promises'], companies: ['Google', 'LinkedIn', 'Swiggy'],
    statement: `<p>A search box fires a request on every keystroke. Responses can arrive <b>out of order</b> (the request for "r" may return after "rea"), showing stale results. Write <code>latestOnly(asyncFn)</code> that returns a wrapped function: only the promise from the <b>most recent</b> call ever settles; older calls' results are ignored.</p>`,
    constraints: `asyncFn returns a promise. Do not delay requests (that is debounce, a different tool). Explain the trade-off of never-settling promises.`,
    example: `<p>Calls at 0, 10, 20 ms for "r" (120 ms), "re" (40 ms), "rea" (40 ms). Without protection the UI shows "rea" at 60 ms and then ${H.c('r', 'overwrites it with "r" at 120 ms')}. With latestOnly: only ${H.c('g', 'results for rea')} renders.</p>`,
    brute: { why: `<p>Rendering every response as it arrives shows whatever finished last, not what the user typed last — a classic race condition.</p>`, code: { lang: 'js', run: true, code: `
const search = (q) => new Promise((r) => setTimeout(() => r('results for ' + q), q.length === 1 ? 120 : 40));
['r', 're', 'rea'].forEach((q, i) => setTimeout(() => search(q).then((v) => console.log('render:', v)), i * 10));
// render: results for re, render: results for rea, render: results for r   <- stale last!
` } },
    mcq: { q: 'How do you know a response is stale?', options: ['Compare its timestamp to Date.now()', 'Give each call an increasing id; on arrival, check it is still the latest id', 'Check if the string is shorter', 'Use Promise.race on all calls'], answer: 1, explain: 'A monotonically increasing request id captured in a closure tells each response whether a newer call has started since.' },
    hints: [`<p>Hint 1: keep a counter <code>lastId</code> in the closure; each call captures <code>const id = ++lastId</code>.</p>`, `<p>Hint 2: return a new promise that forwards the inner result only if <code>id === lastId</code> when it arrives.</p>`, `<p>Hint 3: stale promises never settle — fine for UI, but mention the alternative: reject them with an <code>AbortError</code> and also <b>abort</b> the old request with AbortController to save bandwidth.</p>`],
    tests: { sig: 'string string -> string', fn: '__tA', harness: { js: `function __runChild() {
  const fs = require('fs'), vm = require('vm'), util = require('util');
  process.on('unhandledRejection', () => {});
  process.on('uncaughtException', (e) => { process.stdout.write('@@ERROR uncaught ' + (e && e.stack || e) + '\\n'); process.exit(1); });
  const src = fs.readFileSync(process.env.SC_FILE, 'utf8');
  const body = src.slice(0, src.indexOf('/*@@' + 'END@@*/'));
  let now = 0, seq = 1, timers = [];
  const logs = [];
  const fake = {
    turns: 0, delays: [], uncaught: [],
    setTimeout(fn, ms, ...a) { const t = { id: seq++, at: now + Math.max(0, +ms || 0), fn, a }; timers.push(t); fake.delays.push(Math.max(0, +ms || 0)); return t.id; },
    clearTimeout(id) { timers = timers.filter((t) => t.id !== id); },
    now: () => now,
    pending: () => timers.length,
    reset() { timers = []; logs.length = 0; fake.delays.length = 0; fake.turns = 0; fake.uncaught.length = 0; },
    async flush(n = 60) { for (let i = 0; i < n; i++) await new Promise((r) => queueMicrotask(r)); },
    async advance(ms) {
      const end = now + ms;
      for (;;) {
        await fake.flush();
        timers.sort((a, b) => a.at - b.at || a.id - b.id);
        const t = timers[0];
        if (!t || t.at > end) break;
        timers.shift(); now = t.at; fake.turns++;
        try { t.fn(...t.a); } catch (e) { fake.uncaught.push(e && e.message); }
      }
      now = end; await fake.flush();
    }
  };
  const fmt = (x) => (typeof x === 'string' ? x : util.inspect(x, { depth: 3, breakLength: Infinity }));
  const ctx = vm.createContext({ console: { log: (...a) => logs.push({ t: now, s: a.map(fmt).join(' ') }), error() {}, warn() {} }, setTimeout: fake.setTimeout, clearTimeout: fake.clearTimeout, queueMicrotask, __fake: fake, __logs: logs });
  vm.runInContext(body, ctx, { filename: 'main.js' });
  (async () => {
    await fake.flush(100);
    const scenario = vm.runInContext('__scenario', ctx);
    const r = await scenario(process.env.SC_NAME, JSON.parse(process.env.SC_ARGS));
    process.stdout.write('@@RESULT ' + JSON.stringify(r === undefined ? null : r) + '\\n');
    process.exit(0);
  })().catch((e) => { process.stdout.write('@@ERROR ' + (e && e.stack || e) + '\\n'); process.exit(1); });
}
function __tA(name, argsJson) {
  const r = require('child_process').spawnSync(process.execPath, ['-e', '(' + __runChild.toString() + ')()'], {
    env: Object.assign({}, process.env, { SC_FILE: __filename, SC_NAME: name, SC_ARGS: argsJson || 'null' }), encoding: 'utf8', timeout: 20000, maxBuffer: 1 << 26
  });
  const m = /@@RESULT (.*)/.exec(r.stdout || '');
  if (!m) throw new Error('scenario failed: ' + String(r.stdout).slice(-400) + String(r.stderr).slice(-300));
  return JSON.parse(m[1]);
}
function __tD() { let res, rej; const p = new Promise((a, b) => { res = a; rej = b; }); return { p, res, rej }; }
function __tTrack(p) { const s = { st: 'pending' }; p.then((v) => { s.st = 'fulfilled'; s.v = v; }, (e) => { s.st = 'rejected'; s.e = e; }); return s; }
function __tEm(e) { return e !== null && typeof e === 'object' && 'message' in e ? e.name + ':' + e.message : e; }
function __tSum(s) { return s.st === 'fulfilled' ? ['ok', s.v] : s.st === 'rejected' ? ['err', __tEm(s.e)] : ['pending']; }
function __tBegin() { __fake.reset(); }
function __tTick(n) { return __fake.flush(n); }
function __tAdv(ms) { return __fake.advance(ms); }
function __tLater(ms, v, fail) { return new Promise((res, rej) => setTimeout(() => (fail ? rej(new Error(v)) : res(v)), ms)); }
async function __scenario(name) {
  const track = __tTrack, sum = __tSum, tick = __tTick, adv = __tAdv, later = __tLater, D = __tD; __tBegin();
  switch (name) {
    case 'statement': {
      const search = (q) => later(q.length === 1 ? 120 : 40, 'results for ' + q); const safe = latestOnly(search);
      const log = []; const states = {};
      const fire = (q) => { states[q] = track(safe(q)); states[q].p = 1; safe; };
      fire('r'); await adv(10); fire('re'); await adv(10); fire('rea'); await adv(40);
      const at60 = { r: states.r.st, re: states.re.st, rea: sum(states.rea) };
      await adv(200); return { at60, final: { r: states.r.st, re: states.re.st, rea: sum(states.rea) } };
    }
    case 'single': { const safe = latestOnly((x) => Promise.resolve(x * 2)); const s = track(safe(21)); await tick(); return sum(s); }
    case 'sequential': { const safe = latestOnly((x) => Promise.resolve(x)); const a = await safe(1); const b = await safe(2); return [a, b]; }
    case 'latest-rejects': { const d1 = D(), d2 = D(); let n = 0; const safe = latestOnly(() => (++n === 1 ? d1.p : d2.p)); const a = track(safe()), b = track(safe()); d1.res('old'); d2.rej(new Error('new failed')); await tick(); return [a.st, sum(b)]; }
    case 'stale-rejection-ignored': { const d1 = D(), d2 = D(); let n = 0; const safe = latestOnly(() => (++n === 1 ? d1.p : d2.p)); const a = track(safe()), b = track(safe()); d1.rej(new Error('old failed')); d2.res('new ok'); await tick(); return [a.st, sum(b)]; }
    case 'this-args': { const o = { k: 3, f: latestOnly(function (a, b) { return Promise.resolve(this.k + a + b); }) }; const s = track(o.f(1, 2)); await tick(); return sum(s); }
    case 'stale-fulfils-after-latest': { const d1 = D(), d2 = D(); let n = 0; const safe = latestOnly(() => (++n === 1 ? d1.p : d2.p)); const a = track(safe()), b = track(safe()); d2.res('latest'); await tick(); d1.res('stale-late'); await tick(); return [a.st, sum(b)]; }
    case 'sync-throw': { const safe = latestOnly(() => { throw new Error('sync'); }); const s = track(safe()); await tick(); return sum(s); }
    case 'stale-never-settles': { const d1 = D(), d2 = D(); let n = 0; const safe = latestOnly(() => (++n === 1 ? d1.p : d2.p)); const a = track(safe()); safe(); d1.res('x'); await adv(100000); return a.st; }
    case 'many-calls': { let n = 0; const ds = []; const safe = latestOnly(() => { const d = D(); ds.push(d); return d.p; }); const ps = Array.from({ length: 1000 }, () => track(safe())); ds.forEach((d, i) => d.res(i)); await tick(); return [ps.filter((s) => s.st === 'fulfilled').length, sum(ps[999]), ps[0].st]; }
    case 'resolve-order-reversed': { const ds = [D(), D(), D()]; let n = 0; const safe = latestOnly(() => ds[n++].p); const ps = [track(safe()), track(safe()), track(safe())]; ds[2].res('c'); ds[1].res('b'); ds[0].res('a'); await tick(); return ps.map(sum); }
    case 'after-latest-settled-new-call': { const safe = latestOnly((x) => Promise.resolve(x)); const a = await safe('first'); const b = track(safe('second')); await tick(); return [a, sum(b)]; }
    case 'independent-wrappers': { const f = latestOnly((x) => Promise.resolve('f' + x)), g = latestOnly((x) => Promise.resolve('g' + x)); const a = track(f(1)), b = track(g(1)); const a2 = track(f(2)); await tick(); return [a.st, sum(b), sum(a2)]; }
  }
}
/*@@END@@*/` }, cases: [
      [["statement","null"],{"at60":{"r":"pending","re":"pending","rea":["ok","results for rea"]},"final":{"r":"pending","re":"pending","rea":["ok","results for rea"]}}],
      [["single","null"],["ok",42]],
      [["sequential","null"],[1,2]],
      [["latest-rejects","null"],["pending",["err","Error:new failed"]]],
      [["stale-rejection-ignored","null"],["pending",["ok","new ok"]]],
      [["this-args","null"],["ok",6]],
      [["stale-fulfils-after-latest","null"],["pending",["ok","latest"]]],
      [["sync-throw","null"],["err","Error:sync"]],
      [["stale-never-settles","null"],"pending"],
      [["many-calls","null"],[1,["ok",999],"pending"]],
      [["resolve-order-reversed","null"],[["pending"],["pending"],["ok","c"]]],
      [["after-latest-settled-new-call","null"],["first",["ok","second"]]],
      [["independent-wrappers","null"],["pending",["ok","g1"],["ok","f2"]]]
    ] },
    solution: {
      approach: `<p>Tag every call with an increasing id. When its response (or error) arrives, compare with the current latest id; forward it only if it still is the latest. In production, also abort the previous request (AbortController) so the network work stops, not just the rendering.</p>`,
      code: { lang: 'js', run: true, code: `
function latestOnly(asyncFn) {
  let lastId = 0;
  return function (...args) {
    const id = ++lastId;                                  // this call's ticket
    return new Promise((resolve, reject) => {
      asyncFn.apply(this, args).then(
        (v) => { if (id === lastId) resolve(v); },        // stale → ignored
        (e) => { if (id === lastId) reject(e); });
    });
  };
}

const search = (q) => new Promise((r) => setTimeout(() => r('results for ' + q), q.length === 1 ? 120 : 40));
const safeSearch = latestOnly(search);
['r', 're', 'rea'].forEach((q, i) =>
  setTimeout(() => safeSearch(q).then((v) => console.log('render:', v)), i * 10));
// only: render: results for rea
` },
      dry: { head: ['time', 'event', 'lastId', 'action'], rows: [['0', "call 'r' (id 1)", '1', 'request'], ['10', "call 're' (id 2)", '2', 'request'], ['20', "call 'rea' (id 3)", '3', 'request'], ['50', "'re' arrives (id 2)", '3', H.c('m', 'ignored')], ['60', "'rea' arrives (id 3)", '3', H.c('g', 'render')], ['120', "'r' arrives (id 1)", '3', H.c('m', 'ignored')]] },
      complexity: `<p>O(1) per call. Ignored promises stay pending (their closures are freed once the inner request finishes).</p>`,
      followUps: ['Combine with debounce so fewer requests are sent at all.', 'Use AbortController to cancel stale fetches.', 'How does RxJS switchMap solve the same problem?']
    }
  });

  /* ================= QUIZ ================= */
  quiz.push({ q: 'What does this print? <code>console.log(\'A\'); setTimeout(() =&gt; console.log(\'B\'), 0); console.log(\'C\');</code>', options: ['A B C', 'A C B', 'B A C', 'C A B'], answer: 1, explain: 'The timer callback is queued and can only run after the current script (A, C) has finished: run-to-completion.' });
  quiz.push({ q: 'Three independent 200 ms requests are started together and awaited with Promise.all. Roughly how long until all are done?', options: ['600 ms', '200 ms', '400 ms', '0 ms'], answer: 1, explain: 'Parallel waiting takes about as long as the slowest one (max), not the sum.' });
  quiz.push({ q: 'In Node\'s error-first convention, how is a successful result delivered?', options: ['callback(result)', 'callback(null, result)', 'callback(result, null)', 'return result'], answer: 1, explain: 'The first argument is reserved for an error; null (or undefined) means success, and the result comes second.' });
  quiz.push({ q: 'When does the executor passed to <code>new Promise(executor)</code> run?', options: ['On the next tick', 'Immediately and synchronously inside the constructor', 'When .then is called', 'After all timers'], answer: 1, explain: 'The executor runs right away; only the reactions (.then/.catch/.finally handlers) are asynchronous.' });
  quiz.push({ q: 'A promise calls <code>resolve(1)</code>, then <code>reject(new Error())</code>, then <code>resolve(2)</code>. Its final state?', options: ['fulfilled with 2', 'rejected', 'fulfilled with 1', 'it throws'], answer: 2, explain: 'Only the first settling call counts; later resolve/reject calls are ignored.' });
  quiz.push({ q: 'What does <code>Promise.resolve(1).then(v =&gt; { v + 1; }).then(v =&gt; console.log(v))</code> print?', options: ['2', '1', 'undefined', 'NaN'], answer: 2, explain: 'The block-bodied arrow has no return statement, so the next promise fulfils with undefined.' });
  quiz.push({ q: 'What value reaches the last then? <code>Promise.reject(new Error(\'x\')).catch(() =&gt; 5).finally(() =&gt; 9).then(v =&gt; console.log(v))</code>', options: ['9', '5', 'Error x', 'undefined'], answer: 1, explain: 'catch recovers with 5; finally ignores its own return value and passes 5 through.' });
  quiz.push({ q: 'Which combinator never rejects?', options: ['Promise.all', 'Promise.race', 'Promise.any', 'Promise.allSettled'], answer: 3, explain: 'allSettled always fulfils with an array of {status, value|reason} objects.' });
  quiz.push({ q: 'Jobs: A fulfils at 300 ms, B rejects at 100 ms, C fulfils at 200 ms. What does <code>Promise.any([A, B, C])</code> give?', options: ['Rejects with B at 100 ms', 'Fulfils with C at 200 ms', 'Fulfils with A at 300 ms', 'AggregateError'], answer: 1, explain: 'any ignores rejections and fulfils with the first success, which is C.' });
  quiz.push({ q: 'Same jobs. What does <code>Promise.race([A, B, C])</code> give?', options: ['Fulfils with C', 'Rejects with B at 100 ms', 'Fulfils with A', 'Stays pending'], answer: 1, explain: 'race settles like the first job to settle at all, success or failure — B at 100 ms.' });
  quiz.push({ q: 'What is <code>Promise.race([])</code>?', options: ['Fulfilled with undefined', 'Rejected with AggregateError', 'Pending forever', 'A TypeError'], answer: 2, explain: 'There is nothing to settle it, so it never settles — guard empty inputs in timeout helpers.' });
  quiz.push({ q: 'Why does <code>try { Promise.reject(new Error(\'x\')); } catch (e) { ... }</code> not catch the error?', options: ['try/catch does not work in JS', 'The rejection is a value delivered asynchronously to handlers, not a synchronous throw', 'Errors in promises are ignored', 'Because Error is not thrown with new'], answer: 1, explain: 'Rejections travel to .catch handlers (or await). The try block finished synchronously without any throw.' });
  quiz.push({ q: 'Which order is right for <code>then(f, g)</code> vs <code>then(f).catch(g)</code> if <code>f</code> throws?', options: ['Both call g', 'Only then(f).catch(g) calls g; then(f, g) lets the error escape to the next handler', 'Only then(f, g) calls g', 'Neither calls g'], answer: 1, explain: 'In then(f, g), g only watches the previous promise; errors thrown by f go to the promise returned by then.' });

  /* ================= INTERVIEW ================= */
  interview.push({ level: 'B', q: 'What is the difference between synchronous and asynchronous code in JavaScript?', a: `<p><b>Synchronous</b> code runs line by line on the single JS thread; each line finishes before the next starts, and a slow line blocks everything (clicks, timers, rendering). <b>Asynchronous</b> code starts an operation (timer, network, file) that the <b>runtime</b> waits for in the background; JS continues immediately, and when the result is ready a callback is queued and runs after the current code finishes (run-to-completion). Async is about <i>waiting</i> without blocking — it does not make CPU work faster or run JS in parallel.</p>`, followUps: ['Why does setTimeout(fn, 0) not run immediately?', 'How would you keep the UI responsive during heavy computation?'] });
  interview.push({ level: 'B', q: 'What is a callback, and what is callback hell?', a: `<p>A <b>callback</b> is a function passed to another function to be called later — synchronously (<code>arr.map(fn)</code>) or asynchronously (<code>setTimeout(fn)</code>, <code>fs.readFile(path, cb)</code>). <b>Callback hell</b> is deep nesting when each async step depends on the previous one: code drifts right, every level repeats <code>if (err)</code>, parallel work needs manual counters, and control is inverted — the library decides whether your callback runs once, twice, never, or synchronously. Fixes: named functions, Promises (flat chains, one catch), and async/await.</p>`, followUps: ['What is inversion of control?', 'What is "releasing Zalgo"?'] });
  interview.push({ level: 'B', q: 'What are the states of a Promise?', a: `<p><b>pending</b> (not finished), <b>fulfilled</b> (succeeded, has a value) and <b>rejected</b> (failed, has a reason). "Settled" means fulfilled or rejected. A promise settles at most once and then never changes; extra resolve/reject calls are ignored. "Resolved" is subtly different: a promise resolved with another promise is <i>locked in</i> to follow it, but may still be pending. You observe the result only through <code>.then/.catch/.finally</code> (or <code>await</code>), and handlers always run asynchronously, even if attached after settling.</p>`, followUps: ['Can you read a promise\'s state synchronously?', 'What happens if resolve is called with the promise itself?'] });
  interview.push({ level: 'I', q: 'Implement promisify. What pitfalls do you watch for?', a: `<p><code>const promisify = (fn) =&gt; function (...args) { return new Promise((res, rej) =&gt; fn.call(this, ...args, (err, v) =&gt; err ? rej(err) : res(v))); };</code></p><p>Pitfalls: preserve <code>this</code> (use a regular function wrapper, arrow executor); append the callback <b>last</b>; callbacks with several success values (resolve an array, or use <code>util.promisify.custom</code>); APIs that are not error-first; one-shot only — do not promisify event emitters that fire many times. A buggy double callback is harmless because the promise settles once.</p>`, followUps: ['Implement callbackify.', 'Why not promisify an EventEmitter "data" event?'] });
  interview.push({ level: 'I', q: 'What does .then return, and how does the returned promise get its value?', a: `<p><code>.then</code> always returns a <b>new</b> promise. When the handler runs: a returned plain value fulfils it; a returned promise/thenable is <b>adopted</b> (the new promise follows it — this is why chains are flat); a <code>throw</code> rejects it; no return means fulfilled with <code>undefined</code>. If the matching handler is missing (e.g. success handler on a rejected promise) the value or error passes through unchanged. <code>catch(g)</code> is <code>then(undefined, g)</code>; <code>finally(f)</code> runs on both outcomes, gets no argument and passes the result through unless f throws.</p>`, followUps: ['Why is returning a promise slower (in ticks) than returning a value?', 'Chain vs branch: p.then(a).then(b) vs p.then(a); p.then(b)?'] });
  interview.push({ level: 'I', q: 'Compare Promise.all, allSettled, race and any.', a: `<p><b>all</b>: fulfils with all values in input order, rejects fast on the first rejection; [] → []. <b>allSettled</b>: waits for all, never rejects, returns <code>{status, value|reason}</code> objects. <b>race</b>: settles like the first item to settle (success or failure); [] → pending forever. <b>any</b>: fulfils with the first success, rejects only if all reject, with an <code>AggregateError</code> (<code>.errors</code> in input order); [] → rejects. None of them start or cancel work — the promises are already running; losers keep running unless you abort them. Use all for all-or-nothing, allSettled for partial results, race for timeouts, any for the fastest healthy mirror.</p>`, followUps: ['Implement Promise.all.', 'How would you cancel the losers?'] });
  interview.push({ level: 'I', q: 'How do errors propagate in a promise chain?', a: `<p>A throw or rejection makes the current promise rejected. The rejection flows down the chain, <b>skipping</b> success handlers, until the first rejection handler (<code>.catch</code> or <code>then</code>'s 2nd arg). If that handler returns normally, the chain is <b>recovered</b> (fulfilled with its return value); if it rethrows, the chain stays rejected. Errors escape the chain when promises are not returned (floating), when you throw inside a plain callback like setTimeout, or when the chain has no final catch — an unhandled rejection that crashes Node 15+ by default.</p>`, followUps: ['Where should catch go: middle or end?', 'How do you keep the original error when wrapping it?'] });
  interview.push({ level: 'I', q: 'How do you run async tasks sequentially vs in parallel, and when would you choose each?', a: `<p><b>Parallel</b>: create all promises at once (<code>items.map(fetchItem)</code>) and combine with <code>Promise.all</code> — total time ≈ the slowest. <b>Sequential</b>: create each only after the previous finishes, e.g. <code>tasks.reduce((p, t) =&gt; p.then(t), Promise.resolve())</code> or a for...of loop with await — total time = the sum. Choose sequential when steps depend on each other (login → profile) or the API requires one at a time; parallel when they are independent. For many items, use a <b>concurrency limit</b> (pool) to avoid rate limits and resource exhaustion.</p>`, followUps: ['Why must the input be functions rather than promises for sequential execution?', 'Implement mapLimit.'] });
  interview.push({ level: 'I', q: 'What is an unhandled promise rejection and how do you deal with it?', a: `<p>A promise that rejects with no rejection handler attached by the time the microtask queue drains. Browsers log it and fire <code>unhandledrejection</code>; Node 15+ treats it as an uncaught exception and <b>exits</b> (default <code>--unhandled-rejections=throw</code>). Prevent it by returning promises up to a caller that handles them, ending chains with <code>.catch</code>, avoiding floating promises (lint: <code>no-floating-promises</code>), and using allSettled when several may fail. Global handlers (<code>process.on('unhandledRejection')</code>) are for logging/crash reporting, not normal control flow.</p>`, followUps: ['Why is attaching .catch inside a setTimeout too late?', 'What happens to the second rejection inside Promise.all?'] });
  interview.push({ level: 'A', q: 'Explain the Promise resolution procedure and thenable adoption.', a: `<p>When a promise is resolved with <code>x</code>: if <code>x</code> is the same promise → reject with TypeError (cycle). If <code>x</code> is an object or function, read <code>x.then</code> once (a throwing getter rejects). If it is callable, schedule a <b>PromiseResolveThenableJob</b> that calls <code>then.call(x, resolve, reject)</code> with once-guarded functions, so the outer promise adopts x's eventual state. Otherwise fulfil with x. This makes promises interoperable with any thenable (old libraries) and flattens nested promises; the extra job is why returning a promise from a handler costs two extra microtask ticks.</p>`, followUps: ['What does Promise.resolve(p) return when p is a native promise?', 'Why read x.then only once?'] });
  interview.push({ level: 'A', q: 'How would you add a timeout to any promise, correctly?', a: `<p>Race it against a timer promise that rejects: <code>Promise.race([p, new Promise((_, rej) =&gt; { id = setTimeout(() =&gt; rej(new TimeoutError()), ms); })]).finally(() =&gt; clearTimeout(id))</code>. Details that matter: clear the timer on both outcomes (otherwise it keeps Node alive and wastes resources); use a distinguishable error type; remember race does <b>not</b> cancel the underlying work — pass an <code>AbortSignal</code> (<code>AbortSignal.timeout(ms)</code> for fetch) so the request is really aborted; and guard against an empty race.</p>`, followUps: ['How would you combine a user cancel signal with a timeout signal?', 'What is a deadline vs a per-attempt timeout in retries?'] });
  interview.push({ level: 'A', q: 'Design a retry helper for flaky network calls.', a: `<p><code>retry(fn, {retries, baseDelay, maxDelay, signal})</code>: call fn; on rejection decide if it is <b>retryable</b> (timeouts, 429, 5xx — not 4xx validation errors) and the operation is <b>idempotent</b>; wait <code>min(maxDelay, base × 2^n)</code> with <b>jitter</b> (randomised to avoid thundering herds), honour <code>Retry-After</code>, stop on abort or overall deadline, and reject with the last error (optionally an AggregateError of all). Implement by returning the next attempt from inside <code>.catch</code> so it is one chain. Add metrics/logging per attempt and a circuit breaker for persistent failure.</p>`, followUps: ['Why is jitter important?', 'How do you make POST requests safe to retry (idempotency keys)?'] });
  interview.push({ level: 'E', q: 'In production, what async/promise mistakes cause the most incidents, and how do you prevent them?', a: `<p>(1) <b>Floating promises</b> — errors vanish or crash later; prevent with typescript-eslint <code>no-floating-promises</code> / <code>no-misused-promises</code>. (2) <b>Unbounded parallelism</b> — <code>Promise.all</code> over 50k items exhausts sockets/memory or hits rate limits; use pools. (3) <b>Swallowing catches</b> — <code>.catch(() =&gt; null)</code> turns outages into silent bad data; catch narrowly and rethrow. (4) <b>No timeouts/cancellation</b> — hanging promises leak memory and hold resources; use AbortSignal everywhere. (5) <b>Stale responses</b> overwriting newer state; use request ids or abort. (6) <b>Accidental sequential awaits</b> slowing endpoints. Pair code review checklists with tracing so slow/failed async spans are visible.</p>`, followUps: ['How do you trace async work across services?', 'What metrics would you add around a promise pool?'] });
  interview.push({ level: 'E', q: 'Promises cannot be cancelled. How do real systems handle cancellation and why was it left out of the spec?', a: `<p>A promise represents a <b>result</b>, which may have many consumers; letting one consumer cancel it would affect the others, and cancellation semantics (does finally run? is it a rejection?) were contentious, so TC39 dropped cancelable promises (2016). The platform standardised <b>AbortController / AbortSignal</b> instead: the <i>operation</i> takes a signal (<code>fetch</code>, streams, Node fs/timers, addEventListener) and rejects with an <code>AbortError</code> when aborted. Compose with <code>AbortSignal.timeout(ms)</code> and <code>AbortSignal.any([...])</code>. For your own APIs, accept a <code>signal</code>, check <code>signal.aborted</code>, listen for 'abort', clean up, and reject with <code>signal.reason</code>.</p>`, followUps: ['How would you make mapLimit cancellable?', 'What should finally do when an operation is aborted?'] });

  /* ================= REGISTER ================= */
  registerModule({
    id: 'js07',
    title: 'Async I: Callbacks & Promises',
    intro: `<p>JavaScript has <b>one thread</b>, yet it handles timers, network calls, files and clicks all at once without freezing. This module shows how: the difference between <b>synchronous</b> and <b>asynchronous</b> code, the old way (<b>callbacks</b>, error-first style and callback hell) and the modern way (<b>Promises</b>).</p>
<p>You will learn the Promise <b>state machine</b> (pending → fulfilled / rejected, settled once), how <b>then / catch / finally</b> chains pass values and errors along, the four combinators <b>Promise.all / allSettled / race / any</b>, and exactly how <b>errors propagate</b> — and escape. Every topic has a step-by-step visualizer and runnable code. Practice includes classic machine-coding tasks (<b>promisify</b>, Promise.all/any/race polyfills, <b>sequential vs parallel fetch simulations</b>, a concurrency pool, your own Promise class) and <b>predict-the-output</b> puzzles that interviewers love.</p>
<p>Module JS 8 builds on this with the event loop, microtasks and async/await.</p>`,
    goals: [
      'Explain sync vs async with the one-thread + queue model, and predict when callbacks run',
      'Recognise callback hell and inversion of control, and convert error-first callbacks to promises (promisify)',
      'Describe the three Promise states, executor timing and settle-once rules',
      'Predict exactly what each link of a then/catch/finally chain receives and returns',
      'Choose between Promise.all, allSettled, race and any from the failure semantics, and implement them from scratch',
      'Trace error propagation, recover vs rethrow correctly, and prevent unhandled rejections and floating promises',
      'Write sequential, parallel, batched and concurrency-limited async flows and reason about their timing'
    ],
    prereqs: `JS 2 (Functions, Arrays &amp; Objects — arrow functions, reduce), JS 4 (Scope &amp; Closures — closures are used everywhere here) and JS 5 (<code>this</code> and call/apply, for promisify).`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
