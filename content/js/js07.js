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
      input: 'start 5, *2, log, +3, throw boom, *10, catch 0, +1, finally',
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
      solution: {
        approach: `<p>Recursive chain: attempt n calls fn; on rejection either give up (rethrow) or return "wait, then attempt n + 1". Returning the promise from inside <code>.catch</code> links each retry into the same chain, so the caller sees just one promise.</p>`,
        code: { lang: 'js', run: true, code: `
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function retry(fn, opts) {
  const retries = opts.retries, baseDelay = opts.baseDelay;
  function attempt(n) {
    return fn(n).catch(function (err) {
      if (n >= retries || err.retryable === false) throw err; // give up: propagate
      const delay = baseDelay * Math.pow(2, n);               // 1x, 2x, 4x, ...
      console.log('  attempt ' + (n + 1) + ' failed (' + err.message + '), retrying in ' + delay + ' ms');
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
registerModule({ id: 'js07', title: 'Async I', intro: 'x', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
