(function () {
  var topics = [], practice = [], quiz = [], interview = [];
  var R = String.raw;

  /* =====================================================================
     Shared helpers for this module's visualizers.
     ===================================================================== */
  function pad4(frames, tip) {
    while (frames.length < 4) {
      var last = frames[frames.length - 1];
      frames.push({ narr: tip || 'Tip: add more items to the input above to see more steps.', parts: last.parts });
    }
    return frames;
  }
  function splitList(input, max, hint) {
    var items = String(input === undefined ? '' : input).split(/[,\n]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (!items.length) throw new Error(hint);
    if (items.length > max) throw new Error('Use at most ' + max + ' items. ' + hint);
    return items;
  }

  /* A small catalogue of APIs and where they live. Used by several visualizers.
     layer: engine = ECMAScript built-in (exists in every runtime)
            web    = web-standard API that BOTH browsers and modern Node provide
            browser = browser-only host API
            node   = Node-only host API                                            */
  var API = {
    'Math.max': { layer: 'engine', async: false, note: 'ECMAScript built-in. Pure math, the engine does it alone.' },
    'JSON.parse': { layer: 'engine', async: false, note: 'ECMAScript built-in. Turns text into objects inside the engine.' },
    'JSON.stringify': { layer: 'engine', async: false, note: 'ECMAScript built-in.' },
    'Array.prototype.map': { layer: 'engine', async: false, note: 'ECMAScript built-in array method.' },
    'arr.map': { layer: 'engine', async: false, note: 'ECMAScript built-in array method.' },
    'Promise': { layer: 'engine', async: false, note: 'ECMAScript built-in. The engine owns the microtask queue for promise reactions.' },
    'Map': { layer: 'engine', async: false, note: 'ECMAScript built-in collection.' },
    'Date.now': { layer: 'engine', async: false, note: 'ECMAScript built-in (asks the host for the clock, but it is part of the language spec).' },
    'parseInt': { layer: 'engine', async: false, note: 'ECMAScript global function.' },
    'Symbol': { layer: 'engine', async: false, note: 'ECMAScript built-in.' },
    'globalThis': { layer: 'engine', async: false, note: 'ECMAScript 2020 name for the global object in every runtime.' },
    'console.log': { layer: 'web', async: false, note: 'NOT in the ECMAScript spec! A host API (WHATWG Console standard) that every runtime adds.' },
    'setTimeout': { layer: 'web', async: true, note: 'Host timer API. Browser returns a number id; Node returns a Timeout object.' },
    'setInterval': { layer: 'web', async: true, note: 'Host timer API in both browsers and Node.' },
    'queueMicrotask': { layer: 'web', async: true, note: 'Host API in both runtimes; schedules a microtask.' },
    'fetch': { layer: 'web', async: true, note: 'Web standard. Browsers always had it; Node has it built in (undici) since v18, stable since v21.' },
    'URL': { layer: 'web', async: false, note: 'WHATWG URL standard; global in browsers and Node.' },
    'TextEncoder': { layer: 'web', async: false, note: 'Encoding standard; global in browsers and Node.' },
    'AbortController': { layer: 'web', async: false, note: 'DOM standard; global in browsers and Node.' },
    'structuredClone': { layer: 'web', async: false, note: 'HTML standard deep clone; global in browsers and Node 17+.' },
    'crypto.randomUUID': { layer: 'web', async: false, note: 'Web Crypto; global in browsers (secure contexts) and Node 19+.' },
    'EventTarget': { layer: 'web', async: false, note: 'DOM standard event system; Node also ships it.' },
    'WebSocket': { layer: 'web', async: true, note: 'Browsers always; Node 22+ has a global WebSocket client.' },
    'document.querySelector': { layer: 'browser', async: false, note: 'DOM API. Only where there is a page (browser main thread).' },
    'document': { layer: 'browser', async: false, note: 'The DOM tree of the page. Browser only.' },
    'window': { layer: 'browser', async: false, note: 'Browser global object name. Undefined in Node and in workers.' },
    'localStorage': { layer: 'browser', async: false, note: 'Web Storage, tied to an origin. A browser feature (Node only has experimental support).' },
    'alert': { layer: 'browser', async: false, note: 'Browser UI dialog. Blocks the page.' },
    'addEventListener': { layer: 'browser', async: true, note: 'On window/DOM elements in the browser (Node has EventTarget, but no DOM).' },
    'requestAnimationFrame': { layer: 'browser', async: true, note: 'Runs before the next screen paint. Browser only.' },
    'navigator.geolocation': { layer: 'browser', async: true, note: 'Device location. Browser only (asks the user).' },
    'Worker': { layer: 'browser', async: true, note: 'Web Workers in browsers (Node uses worker_threads instead).' },
    'fs.readFile': { layer: 'node', async: true, note: 'File system. Node only: browsers cannot read your disk freely.' },
    'fs.readFileSync': { layer: 'node', async: false, note: 'Blocking file read. Node only.' },
    'require': { layer: 'node', async: false, note: 'CommonJS loader. Node only (and it is module-local, not on globalThis).' },
    'process.env': { layer: 'node', async: false, note: 'Environment variables of the OS process. Node only.' },
    'process.argv': { layer: 'node', async: false, note: 'Command-line arguments. Node only.' },
    'process.nextTick': { layer: 'node', async: true, note: 'Node-only queue that runs even before promise microtasks.' },
    'Buffer': { layer: 'node', async: false, note: 'Node binary data class (browsers use Uint8Array).' },
    'http.createServer': { layer: 'node', async: true, note: 'Start a web server. Node only.' },
    'path.join': { layer: 'node', async: false, note: 'File-path helper. Node only.' },
    '__dirname': { layer: 'node', async: false, note: 'CommonJS module-wrapper variable. Node CJS only (ESM uses import.meta.dirname).' },
    'setImmediate': { layer: 'node', async: true, note: 'Node timer that runs in the check phase of the libuv loop.' },
    'child_process.spawn': { layer: 'node', async: true, note: 'Start another OS program. Node only.' }
  };
  function lookupApi(name) {
    if (API[name]) return API[name];
    if (/^document\.|^window\.|^navigator\./.test(name)) return { layer: 'browser', async: false, note: 'Starts with document/window/navigator, so it belongs to the browser host.' };
    if (/^(fs|path|os|process|http|https|child_process|net|crypto\.createHash)\b/.test(name)) return { layer: 'node', async: /fs\.|http|net|child/.test(name) && !/Sync$/.test(name), note: 'A Node core module/global.' };
    if (/^(Math|JSON|Array|Object|String|Number|Reflect|Proxy|Intl|BigInt)\b/.test(name)) return { layer: 'engine', async: false, note: 'An ECMAScript built-in namespace.' };
    return { layer: 'unknown', async: false, note: 'Not in this mini catalogue. Check MDN (browser) or the Node docs.' };
  }
  var LAYER_NAME = { engine: 'Engine (ECMAScript)', web: 'Web-standard (both hosts)', browser: 'Browser host only', node: 'Node host only', unknown: 'Unknown' };
  /* =====================================================================
     TOPIC 1 — Engine vs Runtime
     ===================================================================== */
  topics.push({
    title: 'Engine vs Runtime: What Actually Runs Your JavaScript',
    analogy: `<p>Think of a <b>car engine</b> and a <b>whole car</b>. The engine (V8, SpiderMonkey, JavaScriptCore) can burn fuel and turn a shaft — that is all. It cannot steer, honk or play music. To be useful it is bolted into a <b>car body</b> (the <b>runtime</b>): a sports car (the browser) adds a dashboard screen and a steering wheel (the DOM, <code>window</code>, <code>fetch</code>), a truck (Node.js) adds a cargo bed and a tow hook (files, network servers, <code>process</code>). Same engine, very different vehicles.</p>
<p>The <b>language</b> (ECMAScript) is the <i>driving rules</i>; the <b>engine</b> obeys them; the <b>runtime</b> decides what buttons you can press.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> JavaScript code is just text. Something has to read it and run it. That job is split into two layers:</p>
<ul>
<li><b>JS engine</b> — a program that understands the JavaScript <i>language</i>: variables, functions, objects, <code>if</code>, loops, <code>Math</code>, <code>JSON</code>, <code>Array</code>, <code>Promise</code>. Famous engines: <b>V8</b> (Chrome, Edge, Node.js, Deno), <b>SpiderMonkey</b> (Firefox), <b>JavaScriptCore</b> (Safari, Bun), <b>Hermes</b> (React Native).</li>
<li><b>JS runtime</b> (also called the <b>host environment</b>) — the engine <i>plus</i> everything around it: extra APIs (things you can call), an <b>event loop</b> that decides when callbacks run, and a way to talk to the outside world (screen, network, disk).</li>
</ul>
${H.table(['Layer', 'What it gives you', 'Examples'], [
  ['Language spec', 'The rules (ECMAScript, a new edition every June)', '<code>let</code>, classes, <code>Array.prototype.map</code>, <code>Promise</code>'],
  ['Engine', 'Parses + compiles + runs those rules, manages memory (GC)', 'V8, SpiderMonkey, JavaScriptCore'],
  ['Runtime / host', 'Host APIs + event loop + I/O', 'Browser (Chrome, Firefox, Safari), Node.js, Deno, Bun']
])}
<p><b>The surprising fact:</b> things like <code>setTimeout</code>, <code>fetch</code>, <code>document</code> and even <code>console.log</code> are <b>not part of the JavaScript language</b>. The ECMAScript spec has no timers and no printing. The runtime adds them. That is why <code>document</code> works in Chrome but crashes in Node, and why <code>require('fs')</code> works in Node but not in Chrome.</p>
<p><b>🔵 How a call flows.</b> When you write <code>setTimeout(fn, 100)</code>: the engine sees a function call, finds that <code>setTimeout</code> is a host-provided function, and hands the job to the host. The host starts a timer (browser: its own timer system; Node: <b>libuv</b>, a C library). When the timer fires, the host puts <code>fn</code> in a <b>task queue</b>; the <b>event loop</b> waits until the engine's <b>call stack</b> is empty and then asks the engine to run <code>fn</code>. The engine runs your code on <b>one main thread</b>; the host does the slow waiting on other threads or OS facilities.</p>
${H.kv([['Engine owns', 'call stack, heap, GC, microtasks for promises'], ['Host owns', 'timers, network, DOM, files, task queues, event loop']], { label: 'Who owns what' })}`,
    clues: [
      '"What is the difference between V8 and Node.js?" → engine vs runtime',
      '"Is setTimeout part of JavaScript?" → no, it is a host (runtime) API',
      '"Why does document is not defined appear in Node?" → API exists only in the browser host',
      '"Node is single-threaded, so how does it read files concurrently?" → engine thread + libuv thread pool/OS async I/O',
      '"Can the same code run in Chrome, Node, Deno and Bun?" → only the engine + web-standard parts are portable',
      '"What does Bun use instead of V8?" → JavaScriptCore; the runtime layer is what differs'
    ],
    code: [{ lang: 'js', run: true, title: 'Probe which globals your runtime provides (runnable)', code: R`// The engine always provides ECMAScript built-ins (Math, JSON, Promise, Map ...).
// Everything else depends on the HOST (browser, Node, Deno, Bun).
var names = ['Math', 'JSON', 'Promise', 'Map', 'console', 'setTimeout',
             'fetch', 'document', 'window', 'process', 'require', 'Deno', 'Bun'];

names.forEach(function (n) {
  // typeof never throws, even for names that do not exist
  var kind = typeof globalThis[n];
  console.log(n.padEnd(11), '->', kind);
});

// Note: in Node CommonJS, require is a module-local variable passed in by the
// module wrapper, so globalThis.require is undefined even though require() works!
console.log('typeof require (local):', typeof require);` },
    { lang: 'js', title: 'Same engine, different host: Node-only code (syntax-checked, needs Node to run)', code: R`// Works in Node, crashes in a browser: fs is a Node host module.
const fs = require('fs');
const os = require('os');

console.log('Engine version (V8):', process.versions.v8);
console.log('Runtime version (Node):', process.version);
console.log('libuv version:', process.versions.uv);
console.log('CPU cores the host can use:', os.cpus().length);

// The host does the slow disk work; the engine just gets a callback later.
fs.readFile(__filename, 'utf8', function (err, text) {
  if (err) throw err;
  console.log('This file has', text.length, 'characters');
});
console.log('readFile was started; this line prints FIRST');` }],
    viz: [{
      title: 'Who handles each call? Engine vs host layers',
      input: 'Math.max, JSON.parse, console.log, setTimeout, document.querySelector, fs.readFile, fetch, process.env',
      inputLabel: 'API names (comma separated)',
      gen: function (input) {
        var items = splitList(input, 12, 'Example: Math.max, setTimeout, fs.readFile');
        var nodes = [
          { id: 'code', label: 'Your code', x: 10, y: 35, shape: 'box', w: 16 },
          { id: 'eng', label: 'JS Engine (V8 / SM / JSC)', x: 40, y: 35, shape: 'box', w: 26 },
          { id: 'web', label: 'Web-standard APIs', x: 75, y: 8, shape: 'box', w: 24 },
          { id: 'br', label: 'Browser host: DOM, window', x: 75, y: 30, shape: 'box', w: 26 },
          { id: 'nd', label: 'Node host: fs, process', x: 75, y: 52, shape: 'box', w: 24 },
          { id: 'loop', label: 'Event loop + task queue', x: 40, y: 64, shape: 'box', w: 26 }
        ];
        var edges = [['code', 'eng', 'call'], ['eng', 'web'], ['eng', 'br'], ['eng', 'nd'], ['web', 'loop'], ['br', 'loop'], ['nd', 'loop'], ['loop', 'eng', 'callback']];
        var frames = [], rows = [];
        frames.push({ narr: 'Every call starts in <b>your code</b> and goes to the <b>engine</b>. The engine either does the work itself (language built-ins) or hands it to the <b>host</b> (runtime). Async host work comes back later through the <b>event loop</b>.', parts: [
          { type: 'graph', directed: true, height: 72, nodes: nodes, edges: edges, hl: { eng: 'cur' } },
          { type: 'text', label: 'Legend', html: '<span class="c-g">green box</span> = layer doing the work, <span class="c-y">amber</span> = current step' }
        ] });
        items.forEach(function (name) {
          var info = lookupApi(name), hl = { code: 'done', eng: 'cur' }, ehl = { 'code-eng': 'ok' };
          var hostId = { web: 'web', browser: 'br', node: 'nd' }[info.layer];
          frames.push({ narr: '<b>' + H.esc(name) + '</b>: your code calls it; the engine looks the name up.', parts: [
            { type: 'graph', directed: true, height: 72, nodes: nodes, edges: edges, hl: hl, ehl: ehl },
            { type: 'table', label: 'Classified so far', columns: ['API', 'Layer', 'Async?'], rows: rows.slice() }
          ] });
          var hl2 = { code: 'done' }, ehl2 = { 'code-eng': 'done' }, narr;
          if (info.layer === 'engine') {
            hl2.eng = 'ok';
            narr = '<b>' + H.esc(name) + '</b> is an <span class="c-g">ECMAScript built-in</span>. The engine runs it alone, synchronously. ' + H.esc(info.note);
          } else if (info.layer === 'unknown') {
            hl2.eng = 'bad';
            narr = '<b>' + H.esc(name) + '</b>: <span class="c-r">not in my catalogue</span>. In real life, check MDN (browser) or nodejs.org (Node).';
          } else {
            hl2.eng = 'done'; hl2[hostId] = 'ok'; ehl2['eng-' + hostId] = 'ok';
            narr = '<b>' + H.esc(name) + '</b> is a <span class="c-b">' + LAYER_NAME[info.layer] + '</span> API. The engine hands it to the host. ' + H.esc(info.note);
          }
          rows.push([name, LAYER_NAME[info.layer], info.async ? 'yes' : 'no']);
          frames.push({ narr: narr, parts: [
            { type: 'graph', directed: true, height: 72, nodes: nodes, edges: edges, hl: hl2, ehl: ehl2 },
            { type: 'table', label: 'Classified so far', columns: ['API', 'Layer', 'Async?'], rows: rows.slice(), hl: (function () { var o = {}; o[rows.length - 1] = info.layer === 'unknown' ? 'bad' : 'ok'; return o; })() }
          ] });
          if (info.async && hostId) {
            var hl3 = { loop: 'cur', eng: 'ok' }; hl3[hostId] = 'done';
            var ehl3 = { 'loop-eng': 'ok' }; ehl3[hostId + '-loop'] = 'ok';
            frames.push({ narr: 'Because <b>' + H.esc(name) + '</b> is async, the host finishes the slow part off the main thread, then queues your callback. The <b>event loop</b> hands it back to the engine only when the call stack is empty.', parts: [
              { type: 'graph', directed: true, height: 72, nodes: nodes, edges: edges, hl: hl3, ehl: ehl3 },
              { type: 'queue', label: 'Task queue', items: ['callback of ' + name], hl: { 0: 'cur' }, frontLabel: 'next', backLabel: 'newest' }
            ] });
          }
        });
        var counts = {};
        rows.forEach(function (r) { counts[r[1]] = (counts[r[1]] || 0) + 1; });
        frames.push({ narr: 'Summary: only the <b>engine</b> and <b>web-standard</b> rows are portable across browsers and Node. Browser-only and Node-only rows lock your code to one runtime.', parts: [
          { type: 'table', label: 'Final classification', columns: ['API', 'Layer', 'Async?'], rows: rows.slice() },
          { type: 'map', label: 'Count per layer', entries: Object.keys(counts).map(function (k) { return [k, counts[k]]; }) }
        ] });
        return pad4(frames);
      }
    }, {
      title: 'Inside the engine: from text to running code (simplified V8 pipeline)',
      gen: function () {
        var nodes = [
          { id: 'src', label: 'Source text', x: 8, y: 20, shape: 'box', w: 14 },
          { id: 'parse', label: 'Parser', x: 28, y: 20, shape: 'box', w: 12 },
          { id: 'ast', label: 'AST', x: 46, y: 20, shape: 'box', w: 10 },
          { id: 'ign', label: 'Ignition (bytecode interpreter)', x: 70, y: 20, shape: 'box', w: 28 },
          { id: 'tf', label: 'Optimizing JIT (Maglev / TurboFan)', x: 70, y: 52, shape: 'box', w: 30 },
          { id: 'heap', label: 'Heap + Garbage Collector', x: 28, y: 52, shape: 'box', w: 26 }
        ];
        var edges = [['src', 'parse'], ['parse', 'ast'], ['ast', 'ign', 'bytecode'], ['ign', 'tf', 'hot code'], ['tf', 'ign', 'deopt'], ['ign', 'heap', 'objects']];
        var steps = [
          ['src', 'src-parse', 'The engine receives plain <b>text</b> from the host (a &lt;script&gt; tag or a file Node read from disk). The engine never fetches files itself — the host gives it the text.'],
          ['parse', 'parse-ast', 'The <b>parser</b> checks the grammar. A syntax error here means <i>nothing</i> in that script runs. Engines parse lazily: inner functions are only pre-parsed until called.'],
          ['ast', 'ast-ign', 'The <b>AST</b> (abstract syntax tree) is turned into compact <b>bytecode</b>.'],
          ['ign', 'ign-heap', '<b>Ignition</b> interprets the bytecode and starts quickly. Objects you create live on the <b>heap</b>; the GC frees ones nothing points to.'],
          ['tf', 'ign-tf', 'Functions that run often are <b>hot</b>. The optimizing JIT compiles them to fast machine code using the types it has seen.'],
          ['ign', 'tf-ign', 'If a guess breaks (e.g. a number suddenly becomes a string), the engine <b>deoptimizes</b> back to bytecode. All of this is inside the engine — the host never sees it.']
        ];
        return steps.map(function (s) {
          var hl = {}; hl[s[0]] = 'cur'; var ehl = {}; ehl[s[1]] = 'ok';
          return { narr: s[2], parts: [{ type: 'graph', directed: true, height: 66, nodes: nodes, edges: edges, hl: hl, ehl: ehl }] };
        });
      }
    }],
    examples: [
      { title: 'One engine, three runtimes', html: `<p><b>V8</b> powers Chrome, Node.js and Deno. All three agree on <code>[1,2,3].map(x =&gt; x * 2)</code> because that is pure language. They disagree on <code>document.title</code> (only Chrome has a page), <code>require('fs')</code> (only Node), and <code>Deno.readTextFile</code> (only Deno). Same engine, different host APIs.</p>`, code: { lang: 'js', run: true, code: R`// Pure ECMAScript: identical result in Chrome, Firefox, Safari, Node, Deno, Bun
console.log([1, 2, 3].map(function (x) { return x * 2; }));   // [ 2, 4, 6 ]
console.log(JSON.stringify({ engine: 'any', ok: true }));
console.log(Math.max(3, 9, 4));                                  // 9` } },
      { title: 'console.log is a host API', html: `<p>Search the ECMAScript spec for "console" — you will not find it. Each host implements the <b>Console standard</b> its own way: Chrome prints into DevTools with expandable objects, Node writes text to <code>process.stdout</code> using <code>util.inspect</code>. That is why <code>console.log({a:1})</code> prints <code>{ a: 1 }</code> in Node but an interactive tree in Chrome.</p>` },
      { title: 'Why Node can serve 10,000 connections with one JS thread', html: `<p>Your JS runs on one thread, but the <b>host</b> is not single-threaded. Node hands network sockets to the OS (epoll / kqueue / IOCP via <b>libuv</b>) and file reads to libuv's <b>thread pool</b> (4 threads by default, <code>UV_THREADPOOL_SIZE</code>). The engine only runs the small callbacks when data is ready. Same story in browsers: the network stack runs on other threads; your page's JS just receives the result.</p>` },
      { title: 'Spot the layer: a mixed snippet', html: `<p>In <code>const data = JSON.parse(await (await fetch(url)).text()); document.body.textContent = data.name;</code>: <code>JSON.parse</code> → engine; <code>await</code> → engine (language syntax); <code>fetch</code> → web-standard host API (browser and Node 18+); <code>document.body</code> → browser-only. So this line can only run in a browser page.</p>` }
    ],
    deepDive: `<p><b>🟣 The formal words.</b> The ECMAScript spec talks about a <b>host</b> and <b>host-defined</b> behaviour: the host creates the <b>realm</b> (a set of built-ins + a global object), provides <b>jobs</b> (the spec name for queued work), and defines hooks like <code>HostEnqueuePromiseJob</code> and <code>HostLoadImportedModule</code>. HTML (WHATWG) is the host spec for browsers; Node's behaviour is documented by Node itself.</p>
<p><b>Embedding.</b> An engine is a library with a C++ (or C/Rust) API. Node creates a V8 <code>Isolate</code> (one heap + one thread of execution) and <code>Context</code> (a realm), then installs bindings: C++ functions exposed to JS as <code>process</code>, <code>fs</code> internals, etc. Deno embeds V8 via Rust and uses Tokio instead of libuv; Bun embeds JavaScriptCore and is written in Zig. Cloudflare Workers embed V8 isolates without Node's APIs at all (many isolates per process — cheap cold starts). React Native uses Hermes, which compiles JS to bytecode ahead of time.</p>
<p><b>Threads.</b> One isolate = one JS thread at a time. Browsers give each tab (often each site, via <b>site isolation</b>) its own renderer process; Web Workers and Node <code>worker_threads</code> create <b>additional isolates</b> that share nothing by default and talk by message passing (or <code>SharedArrayBuffer</code> + <code>Atomics</code>).</p>
<p><b>Edge cases worth knowing.</b> (1) <code>Date.now()</code> and <code>Math.random()</code> are in the language spec but the host supplies the clock and entropy. (2) Engines differ in non-standard behaviour (error <code>stack</code> format, <code>Error.captureStackTrace</code> is V8-only). (3) Feature support depends on the <b>engine version</b> bundled inside the runtime: a new syntax may work in Chrome 1xx but not in an older Node LTS. Check <code>process.versions.v8</code> or caniuse / node.green.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants write a lot of JavaScript for you, but they often do not know <i>which runtime</i> the code will run in. The classic AI bug is mixing layers: using <code>document</code> in a Node script, <code>fs</code> in a React component, or <code>Buffer</code> in an edge function that has no Node APIs.</p>
<p><b>Use AI as a partner:</b> always state the runtime in your prompt — <code>Target: Node 22 ESM, no DOM</code> or <code>Target: browser, no bundler</code>. Ask it: <code>List every host API this file uses and which runtime provides it</code> — a great review prompt.</p>
<p><b>Where AI goes wrong:</b> it may claim Node lacks <code>fetch</code> (outdated training data — Node has had it built in since v18), or invent APIs that sound plausible. Verify on MDN / nodejs.org.</p>
<p><b>What you must still own:</b> the mental model of engine vs host. When an error says <code>X is not defined</code>, you instantly ask "which layer provides X, and am I in that runtime?" — no AI can debug faster than that question.</p>`,
    problems: [{
      title: 'Engine or Host? Classify API calls',
      level: 'Easy', tags: ['runtime', 'classification', 'hash map'], companies: ['Google', 'Microsoft', 'Atlassian'],
      statement: `<p>You are building a lint rule that warns when code is not portable. Write <code>classify(names)</code> that takes an array of API names and returns an object <code>{ engine: [], web: [], browser: [], node: [], unknown: [] }</code>:</p>
<ul><li><b>engine</b> — ECMAScript built-ins (exist in every runtime)</li><li><b>web</b> — web-standard host APIs found in both browsers and Node (<code>fetch</code>, <code>setTimeout</code>, <code>URL</code> …)</li><li><b>browser</b> / <b>node</b> — runtime-specific</li></ul>
<p>Rules: exact catalogue match first; otherwise use the prefix: <code>document.</code>, <code>window.</code>, <code>navigator.</code> → browser; <code>fs.</code>, <code>path.</code>, <code>process.</code>, <code>http.</code> → node; <code>Math.</code>, <code>JSON.</code>, <code>Array.</code>, <code>Object.</code> → engine.</p>`,
      constraints: `1 ≤ names.length ≤ 10<sup>4</sup>; each name ≤ 60 chars. Keep input order inside each group.`,
      example: `<p>Input: <code>['Math.max', 'fetch', 'document.title', 'fs.writeFile', 'foo']</code></p>
<p>Output: <code>{ engine: ['Math.max'], web: ['fetch'], browser: ['document.title'], node: ['fs.writeFile'], unknown: ['foo'] }</code></p>
<p>${H.c('g', 'Math.max')} is language; ${H.c('b', 'fetch')} exists in both hosts; ${H.c('y', 'document.title')} needs a page; ${H.c('p', 'fs.writeFile')} needs Node.</p>`,
      brute: { why: `<p>A long <code>if / else if</code> chain that tests every known name one by one with <code>===</code>. With K catalogue names that is O(K) per lookup, O(N·K) total, and every new API means editing code instead of data. Easy to get wrong ordering (prefix checks before exact checks).</p>`, code: R`function classifyBrute(names) {
  var out = { engine: [], web: [], browser: [], node: [], unknown: [] };
  for (var i = 0; i < names.length; i++) {
    var n = names[i];
    if (n === 'Math.max' || n === 'JSON.parse' || n === 'Promise') out.engine.push(n);
    else if (n === 'fetch' || n === 'setTimeout' || n === 'URL') out.web.push(n);
    else if (n === 'document.title' || n === 'localStorage') out.browser.push(n);
    else if (n === 'fs.writeFile' || n === 'process.env') out.node.push(n);
    else out.unknown.push(n);            // misses every name not hard-coded above
  }
  return out;
}
console.log(classifyBrute(['Math.max', 'fetch', 'document.title', 'fs.writeFile', 'foo']));` },
      mcq: { q: 'Which of these is part of the ECMAScript language itself (not a host API)?', options: ['<code>setTimeout</code>', '<code>console.log</code>', '<code>Promise</code>', '<code>fetch</code>'], answer: 2, explain: '<code>Promise</code> is defined in the ECMAScript spec. Timers, console and fetch are added by the host (browser / Node).' },
      hints: [`<p><b>Hint 1:</b> the knowledge is <i>data</i>, not logic. Put the catalogue in a Map from name → layer so a lookup is O(1).</p>`, `<p><b>Hint 2:</b> after an exact miss, look at the part before the first dot (<code>name.split('.')[0]</code>) and look that up in a second Map of prefixes.</p>`, `<p><b>Hint 3:</b> recipe — create the 5 buckets; for each name: exact map → prefix map → 'unknown'; push into the bucket. Remember <code>'process.env'</code> must hit the prefix <code>process</code>.</p>`],
      solution: {
        approach: `<p>Two hash maps: exact names and namespace prefixes. One pass over the input, O(1) average per name. Keeping knowledge in data makes the rule easy to extend (add <code>Deno.</code> or <code>Bun.</code> later).</p>`,
        code: { lang: 'js', run: true, code: R`var EXACT = new Map([
  ['Promise', 'engine'], ['Map', 'engine'], ['parseInt', 'engine'], ['globalThis', 'engine'],
  ['fetch', 'web'], ['setTimeout', 'web'], ['URL', 'web'], ['console.log', 'web'],
  ['structuredClone', 'web'], ['AbortController', 'web'], ['TextEncoder', 'web'],
  ['localStorage', 'browser'], ['alert', 'browser'], ['requestAnimationFrame', 'browser'],
  ['require', 'node'], ['Buffer', 'node'], ['__dirname', 'node'], ['setImmediate', 'node']
]);
var PREFIX = new Map([
  ['document', 'browser'], ['window', 'browser'], ['navigator', 'browser'],
  ['fs', 'node'], ['path', 'node'], ['process', 'node'], ['http', 'node'], ['os', 'node'],
  ['Math', 'engine'], ['JSON', 'engine'], ['Array', 'engine'], ['Object', 'engine'], ['Reflect', 'engine']
]);

function classify(names) {
  var out = { engine: [], web: [], browser: [], node: [], unknown: [] };
  for (var i = 0; i < names.length; i++) {
    var n = names[i];
    var layer = EXACT.get(n)                       // 1) exact catalogue match
             || PREFIX.get(n.split('.')[0])        // 2) namespace before the first dot
             || 'unknown';                         // 3) give up honestly
    out[layer].push(n);
  }
  return out;
}

console.log(classify(['Math.max', 'fetch', 'document.title', 'fs.writeFile', 'foo']));
console.log(classify(['process.env', 'structuredClone', 'window.innerWidth', 'JSON.parse']));` },
        dry: { head: ['name', 'EXACT hit?', 'prefix', 'PREFIX hit?', 'bucket'], rows: [
          ['Math.max', 'no', 'Math', 'engine', '<span class="c-g">engine</span>'],
          ['fetch', 'web', '-', '-', '<span class="c-b">web</span>'],
          ['document.title', 'no', 'document', 'browser', '<span class="c-y">browser</span>'],
          ['fs.writeFile', 'no', 'fs', 'node', '<span class="c-p">node</span>'],
          ['foo', 'no', 'foo', 'no', '<span class="c-r">unknown</span>']
        ] },
        complexity: `<p>Time O(N · L) where L is name length (for <code>split</code>), effectively O(N). Space O(N) for the output plus O(K) for the catalogue.</p>`,
        followUps: ['Add a <code>deno</code> and <code>bun</code> bucket for <code>Deno.*</code> / <code>Bun.*</code>.', 'How would a real linter (ESLint <code>env</code> / <code>globals</code>) know which globals exist?', 'Why is <code>require</code> in the node bucket even though <code>globalThis.require</code> is undefined?']
      }
    }]
  });
  /* =====================================================================
     TOPIC 2 — Browser APIs vs Node APIs
     ===================================================================== */
  var EQUIV = {
    'document': 'No page in Node. For tests use jsdom / happy-dom; for HTML strings use a parser library.',
    'document.querySelector': 'No DOM in Node. Tests: jsdom / happy-dom. Scraping: a HTML parser (e.g. cheerio).',
    'window': 'Use globalThis (works everywhere).',
    'localStorage': 'Node: a file, node:sqlite, or a real database / cache like Redis.',
    'alert': 'Node: console.log, or readline for interactive prompts.',
    'requestAnimationFrame': 'Node has no screen: setTimeout / setImmediate.',
    'navigator.geolocation': 'Node: none (servers usually get location from IP or the client).',
    'Worker': 'Node: worker_threads (new Worker from node:worker_threads).',
    'addEventListener': 'Node: EventEmitter (node:events) or EventTarget.',
    'fs.readFile': 'Browser: the user picks a file (input type=file + File.text()) or you fetch() it from a server.',
    'fs.readFileSync': 'Browser: no blocking disk access at all. Use fetch() or the File System Access API (Chromium, with permission).',
    'require': 'Browser: ES modules with import (or a bundler that understands require).',
    'process.env': 'Browser: no OS environment. Bundlers inline values at build time (import.meta.env).',
    'process.argv': 'Browser: read URL query params with new URL(location.href).searchParams.',
    'process.nextTick': 'Browser: queueMicrotask (closest equivalent).',
    'Buffer': 'Browser: Uint8Array + TextEncoder / TextDecoder (Node Buffer is a Uint8Array subclass).',
    'http.createServer': 'Browser cannot be a normal server. A Service Worker can intercept its own page requests.',
    'path.join': 'Browser: new URL(relative, base) for URLs.',
    '__dirname': 'Browser: new URL(".", import.meta.url). Node ESM: import.meta.dirname.',
    'setImmediate': 'Browser: setTimeout(fn, 0) or MessageChannel tricks.',
    'child_process.spawn': 'Browser: impossible by design (sandbox).'
  };
  topics.push({
    title: 'Browser APIs vs Node APIs (and the Shared Web Standards)',
    analogy: `<p>Imagine the same chef (the JS engine) working in two kitchens. The <b>restaurant kitchen</b> (browser) faces the customers: it has a serving window, menus and a bell (the DOM, <code>window</code>, <code>alert</code>, <code>localStorage</code>) but the chef is <i>not allowed into the storage basement</i> — a strict health inspector (the sandbox) protects the customers. The <b>catering warehouse</b> (Node) has no dining room at all, but the chef has keys to every shelf, truck and phone line (files, processes, raw network sockets). Both kitchens now share the same standard tools (knives, pans = <code>fetch</code>, <code>URL</code>, timers) so recipes travel more easily than before.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> A <b>browser</b> runs JavaScript from <i>strangers' websites</i>, so it is a locked-down <b>sandbox</b>: it can draw on the page and talk to the network, but it cannot read your files or start programs. <b>Node.js</b> runs JavaScript <i>you chose to install</i> on a computer or server, so it gets full operating-system power: files, processes, environment variables, raw TCP sockets.</p>
${H.table(['Job', 'Browser', 'Node.js'], [
  ['Show things to a user', '<code>document</code>, DOM, CSS, <code>canvas</code>', 'none (prints text to a terminal)'],
  ['Global object name', '<code>window</code> (also <code>self</code>)', '<code>global</code>'],
  ['Read/write files', 'only files the user picks', '<code>fs</code> / <code>fs/promises</code>'],
  ['Store small data', '<code>localStorage</code>, IndexedDB, cookies', 'files, databases'],
  ['Network', '<code>fetch</code>, WebSocket (CORS rules apply)', '<code>fetch</code>, <code>http</code>, <code>net</code> (no CORS — it is not a browser)'],
  ['Who is the program?', 'URL, <code>location</code>, <code>navigator</code>', '<code>process</code> (argv, env, pid, exit)'],
  ['Binary data', '<code>Uint8Array</code>, Blob, ArrayBuffer', '<code>Buffer</code> (a Uint8Array subclass) + the same typed arrays'],
  ['Background threads', 'Web Workers, Service Workers', '<code>worker_threads</code>, <code>child_process</code>, <code>cluster</code>']
])}
<p><b>🔵 The shared middle.</b> Since around Node 18 the two worlds have moved together. Node now ships many <b>web-standard</b> globals with the same names and behaviour as browsers: <code>fetch</code>, <code>Request</code>/<code>Response</code>/<code>Headers</code>, <code>URL</code>, <code>URLSearchParams</code>, <code>AbortController</code>, <code>TextEncoder</code>/<code>TextDecoder</code>, <code>structuredClone</code>, <code>crypto.subtle</code> + <code>crypto.randomUUID</code>, <code>EventTarget</code>, Web Streams, <code>Blob</code>, <code>BroadcastChannel</code>, <code>WebSocket</code> (Node 22+), <code>navigator</code> (a small subset). Deno and Bun also follow these standards, and the <b>WinterTC</b> group (Ecma TC55, formerly WinterCG) defines a common "minimum" API set for server runtimes. Code that only uses <b>engine + web-standard</b> APIs is <b>portable</b> ("isomorphic" / "universal").</p>
${H.chips(['fetch', 'URL', 'AbortController', 'TextEncoder', 'structuredClone', 'crypto.randomUUID', 'setTimeout', 'EventTarget', 'Blob', 'WebSocket'], { label: 'Portable web-standard APIs' })}
<p><b>Same name, different detail.</b> Watch out for APIs that exist in both but behave differently: <code>setTimeout</code> returns a <b>number</b> in browsers but a <b>Timeout object</b> in Node (with <code>.unref()</code>); <code>fetch</code> in the browser obeys CORS and sends cookies by rules, while Node's fetch has no CORS and no cookie jar; <code>console.log</code> output differs; <code>crypto</code> in Node also has the older <code>node:crypto</code> module API.</p>`,
    clues: [
      '"document is not defined" / "window is not defined" in a Node or SSR build → browser-only API used on the server',
      '"require is not defined" or "fs" fails in a bundle → Node-only API used in browser code',
      '"Can a web page read a file from my disk?" → sandbox: only files the user picks',
      '"Why does my fetch work in Node but fail with CORS in the browser?" → CORS is a browser security rule',
      '"Make this utility work on both client and server" → stick to engine + web-standard APIs, feature-detect the rest',
      '"Edge function / Cloudflare Worker / Vercel edge" → web-standard APIs only, many Node modules missing'
    ],
    code: [{ lang: 'js', run: true, title: 'Feature detection report (runnable — try it in a browser console too)', code: R`// Feature detection = ask "does this API exist HERE?" instead of guessing the runtime.
function runtimeReport() {
  var g = globalThis;
  return {
    hasDOM: typeof g.document !== 'undefined',            // browser page only
    hasFetch: typeof g.fetch === 'function',              // browsers + Node 18+
    hasStructuredClone: typeof g.structuredClone === 'function',
    hasProcess: typeof g.process !== 'undefined',         // Node (and Bun/Deno compat)
    hasBuffer: typeof g.Buffer === 'function',            // Node only
    hasLocalStorage: (function () {
      try { return typeof g.localStorage !== 'undefined' && g.localStorage !== null; }
      catch (e) { return false; }                         // can throw in privacy modes
    })()
  };
}
console.log(runtimeReport());

// Same name, different return type:
var t = setTimeout(function () {}, 0);
console.log('setTimeout returned a', typeof t);  // Node: object (Timeout), browser: number
clearTimeout(t);` },
    { lang: 'js', title: 'Browser-only: talking to the page (syntax-checked, run it in a browser)', code: R`// Every name here comes from the BROWSER host, not from JavaScript itself.
const button = document.querySelector('#save');          // DOM
const status = document.getElementById('status');

button.addEventListener('click', async () => {
  const draft = { text: document.querySelector('textarea').value, at: Date.now() };
  localStorage.setItem('draft', JSON.stringify(draft));   // per-origin storage
  status.textContent = 'Saved locally';

  // fetch is web-standard; in the browser it obeys CORS and sends cookies per credentials rules
  const res = await fetch('/api/drafts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft)
  });
  status.textContent = res.ok ? 'Synced' : 'Sync failed: ' + res.status;
});` },
    { lang: 'js', title: 'Node-only: files, env and a tiny server (syntax-checked, run it with node)', code: R`// Every import here is a NODE host module. Prefix node: makes that explicit.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';

const port = Number(process.env.PORT ?? 3000);            // OS environment variable

createServer(async (req, res) => {
  if (req.url === '/') {
    const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } else {
    res.writeHead(404).end('Not found');
  }
}).listen(port, () => console.log('Listening on http://localhost:' + port));` }],
    viz: {
      title: 'Where does each API exist? Build the comparison table',
      input: 'fetch, document.querySelector, fs.readFile, localStorage, Buffer, structuredClone, process.env, URL',
      inputLabel: 'API names (comma separated)',
      gen: function (input) {
        var items = splitList(input, 12, 'Example: fetch, document, fs.readFile, Buffer');
        var rows = [], portable = [], browserOnly = [], nodeOnly = [], frames = [];
        frames.push({ narr: 'We will check each API in two hosts. <b>Browser</b> has engine + web-standard + browser-only APIs. <b>Node</b> has engine + web-standard + node-only APIs. Only the overlap is portable.', parts: [
          { type: 'graph', height: 44, nodes: [
            { id: 'b', label: 'Browser: DOM, window, storage', x: 18, y: 22, shape: 'box', w: 30 },
            { id: 'w', label: 'Shared: engine + web standards', x: 50, y: 22, shape: 'box', w: 30 },
            { id: 'n', label: 'Node: fs, process, Buffer', x: 82, y: 22, shape: 'box', w: 28 }
          ], edges: [['b', 'w'], ['n', 'w']], hl: { w: 'ok' } },
          { type: 'table', label: 'Comparison', columns: ['API', 'Browser', 'Node', 'Portable?'], rows: [] }
        ] });
        items.forEach(function (name) {
          var info = lookupApi(name);
          var inB = info.layer === 'engine' || info.layer === 'web' || info.layer === 'browser';
          var inN = info.layer === 'engine' || info.layer === 'web' || info.layer === 'node';
          if (info.layer === 'unknown') { inB = '?'; inN = '?'; }
          var row = [name, inB === '?' ? '?' : (inB ? 'yes' : 'NO'), inN === '?' ? '?' : (inN ? 'yes' : 'NO'), inB === true && inN === true ? 'portable' : 'locked'];
          rows.push(row);
          if (inB === true && inN === true) portable.push(name); else if (inB === true) browserOnly.push(name); else if (inN === true) nodeOnly.push(name);
          var hlRow = {}; hlRow[rows.length - 1] = row[3] === 'portable' ? 'ok' : (info.layer === 'unknown' ? 'bad' : 'cur');
          var gh = {}; gh[{ engine: 'w', web: 'w', browser: 'b', node: 'n' }[info.layer] || 'w'] = info.layer === 'unknown' ? 'bad' : 'cur';
          var equiv = EQUIV[name] ? ' <b>Other side:</b> ' + H.esc(EQUIV[name]) : '';
          frames.push({ narr: '<b>' + H.esc(name) + '</b> → ' + LAYER_NAME[info.layer] + '. ' + H.esc(info.note) + equiv, parts: [
            { type: 'graph', height: 44, nodes: [
              { id: 'b', label: 'Browser: DOM, window, storage', x: 18, y: 22, shape: 'box', w: 30 },
              { id: 'w', label: 'Shared: engine + web standards', x: 50, y: 22, shape: 'box', w: 30 },
              { id: 'n', label: 'Node: fs, process, Buffer', x: 82, y: 22, shape: 'box', w: 28 }
            ], edges: [['b', 'w'], ['n', 'w']], hl: gh },
            { type: 'table', label: 'Comparison', columns: ['API', 'Browser', 'Node', 'Portable?'], rows: rows.slice(), hl: hlRow }
          ] });
        });
        frames.push({ narr: 'Result: a module that only uses the <span class="c-g">portable</span> set runs in browsers, Node, Deno, Bun and edge runtimes. Put the locked ones behind an adapter (one file per runtime).', parts: [
          { type: 'set', label: 'Portable (safe everywhere)', items: portable, hl: (function () { var o = {}; portable.forEach(function (p) { o[p] = 'ok'; }); return o; })() },
          { type: 'set', label: 'Browser only', items: browserOnly },
          { type: 'set', label: 'Node only', items: nodeOnly }
        ] });
        return pad4(frames);
      }
    },
    examples: [
      { title: 'Predict the output: typeof checks in Node', html: `<p>In Node (CommonJS file) this prints <code>undefined object object function</code>: there is no <code>window</code>; <code>globalThis</code> and <code>process</code> are objects; <code>fetch</code> is a function in Node 18+. In a browser it prints <code>object object undefined function</code>.</p>`, code: { lang: 'js', code: R`console.log(typeof window, typeof globalThis, typeof process, typeof fetch);` } },
      { title: 'CORS is a browser rule, not a server rule', html: `<p>A script calls <code>fetch('https://api.other.com/data')</code>. In <b>Node</b> it just works (Node is like curl). In the <b>browser</b> it fails unless the server replies with <code>Access-Control-Allow-Origin</code>. The browser protects the <i>user</i>: it stops a random page from reading another site with the user's cookies. Node has no user to protect, so it has no CORS.</p>` },
      { title: 'Binary data: Buffer vs Uint8Array', html: `<p><code>Buffer.from('hi')</code> is Node only. The portable way is <code>new TextEncoder().encode('hi')</code> → <code>Uint8Array [104, 105]</code>, which works in browsers, Node, Deno and Bun. Since Node's <code>Buffer</code> extends <code>Uint8Array</code>, functions that accept <code>Uint8Array</code> accept both.</p>`, code: { lang: 'js', run: true, code: R`var bytes = new TextEncoder().encode('hi');       // portable
console.log(bytes, bytes.length);                    // Uint8Array(2) [ 104, 105 ] 2
console.log(new TextDecoder().decode(bytes));        // hi` } },
      { title: 'Server-side rendering crash', html: `<p>A React/Next.js component reads <code>window.innerWidth</code> at the top of the file. During <b>SSR</b> that code runs in Node → <code>ReferenceError: window is not defined</code>. Fixes: read it inside <code>useEffect</code> (runs only in the browser), or guard with <code>typeof window !== 'undefined'</code>.</p>` }
    ],
    deepDive: `<p><b>🟣 Security model is the root cause.</b> Browsers enforce the <b>same-origin policy</b>, CORS, Content-Security-Policy, permission prompts (camera, location, notifications), and "secure context" rules (many APIs such as <code>crypto.subtle</code>, Service Workers and clipboard writes need HTTPS or localhost). Node trusts the code fully by default; recent Node versions add an opt-in <b>permission model</b> (<code>--permission</code> with <code>--allow-fs-read</code> etc.), and Deno is deny-by-default (<code>--allow-net</code>, <code>--allow-read</code>).</p>
<p><b>Same name, subtly different.</b> <code>fetch</code> in Node is implemented by <b>undici</b>: no CORS, no HTTP cache, no cookie jar, and you must consume or cancel the body to free the connection. Node's <code>Timeout</code> object keeps the process alive unless you call <code>.unref()</code>. <code>queueMicrotask</code> exists in both, but Node also has <code>process.nextTick</code>, which runs <i>before</i> promise microtasks. <code>structuredClone</code> cannot copy functions or DOM nodes in either.</p>
<p><b>Workers are their own hosts.</b> A Web Worker has <code>self</code> but no <code>window</code> or <code>document</code>; a Service Worker adds <code>caches</code> and the fetch event; Node <code>worker_threads</code> have <code>parentPort</code>. "Browser" really means several global scopes with different APIs.</p>
<p><b>Packaging for both.</b> Library authors use the <code>exports</code> field with <b>conditions</b> (<code>"browser"</code>, <code>"node"</code>, <code>"worker"</code>, <code>"default"</code>) so bundlers and runtimes pick the right file automatically. Node-only modules imported with the <code>node:</code> prefix are easy for tools (and humans) to flag.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI happily mixes runtimes — it might suggest <code>Buffer</code> inside a Cloudflare Worker, <code>localStorage</code> in a Next.js server component, or a Node-only npm package for browser code. Your job is to be the "runtime referee".</p>
<p><b>Use AI as a partner:</b> prompt with the runtime and constraints up front: <code>Write this for an edge runtime: web-standard APIs only (fetch, Request, Response, crypto.subtle). No node: imports.</code> Then ask it to produce a table of every API used and where it is supported.</p>
<p><b>Where AI goes wrong:</b> outdated knowledge ("Node has no fetch, install node-fetch"), invented polyfills, or forgetting that browsers enforce CORS while Node does not — so a script that worked in the AI's Node test fails in the browser.</p>
<p><b>What you must still own:</b> knowing the sandbox boundaries and the portable subset. Agents that run code (e.g. coding agents executing Node scripts on your machine) have Node's full OS power — understanding that difference is now a security skill, not trivia.</p>`,
    problems: [{
      title: 'Write a Runtime Detector',
      level: 'Medium', tags: ['feature detection', 'globals', 'runtime'], companies: ['Vercel', 'Shopify', 'Netflix'],
      statement: `<p>Write <code>detectRuntime(g)</code> that receives a <b>global object</b> (pass <code>globalThis</code> in real code; tests pass fake objects) and returns one of <code>'deno'</code>, <code>'bun'</code>, <code>'node'</code>, <code>'browser'</code>, <code>'webworker'</code>, <code>'unknown'</code>.</p>
<p>Facts: Deno exposes <code>Deno</code>; Bun exposes <code>Bun</code> <b>and</b> a Node-compatible <code>process.versions.node</code>; Node has <code>process.versions.node</code>; a browser page has both <code>window</code> and <code>document</code>; a Web Worker has <code>importScripts</code> (a function) but no <code>document</code>. Test environments such as jsdom put a fake <code>window</code> on Node's global — the answer must still be <code>'node'</code>.</p>`,
      constraints: `Never throw (the fake globals may have <code>process</code> without <code>versions</code>). Use only <code>typeof</code> / property checks.`,
      example: `<p><code>detectRuntime({ Bun: {}, process: { versions: { node: '22.0.0' } } })</code> → ${H.c('g', "'bun'")} (Bun must be checked <b>before</b> Node, otherwise it looks like Node).</p>
<p><code>detectRuntime({ window: {}, document: {} })</code> → ${H.c('g', "'browser'")}</p>`,
      brute: { why: `<p>The naive check is <code>typeof window !== 'undefined' ? 'browser' : 'node'</code>. It mislabels Deno, Bun, Web Workers and jsdom tests (fake window inside Node), and crashes or lies in edge runtimes. Order of checks is the whole problem.</p>`, code: R`function detectBrute(g) {
  // Only two answers, and the window check comes first: jsdom-in-Node => 'browser' (wrong),
  // Bun => 'node' (wrong), Web Worker => 'node' (very wrong).
  return typeof g.window !== 'undefined' ? 'browser' : 'node';
}
console.log(detectBrute({ importScripts: function () {} }));   // 'node' -- wrong, it is a worker` },
      mcq: { q: 'Why must the Bun check come before the Node check?', options: ['Bun is faster', 'Bun also exposes <code>process.versions.node</code> for compatibility', 'Bun has no <code>process</code>', 'Order does not matter'], answer: 1, explain: 'Bun (and Deno for npm packages) imitate Node globals. The most specific marker (<code>Bun</code>, <code>Deno</code>) must be tested first.' },
      hints: [`<p><b>Hint 1:</b> check the <b>most specific</b> marker first. Something that imitates Node must be ruled out before you accept "Node".</p>`, `<p><b>Hint 2:</b> read nested properties safely: <code>g.process &amp;&amp; g.process.versions &amp;&amp; g.process.versions.node</code> (or optional chaining <code>?.</code>).</p>`, `<p><b>Hint 3:</b> recipe — Deno → Bun → Node (versions.node) → browser (window AND document) → worker (importScripts function, no document) → unknown. Node before browser handles jsdom.</p>`],
      solution: {
        approach: `<p>An ordered list of rules, from most specific to least specific. Optional chaining makes every probe safe, so the function never throws on odd globals (edge runtimes, sandboxes).</p>`,
        code: { lang: 'js', run: true, code: R`function detectRuntime(g) {
  if (!g || typeof g !== 'object') return 'unknown';
  if (typeof g.Deno !== 'undefined') return 'deno';            // most specific first
  if (typeof g.Bun !== 'undefined') return 'bun';              // Bun ALSO looks like Node
  if (typeof g.process?.versions?.node === 'string') return 'node'; // before window: jsdom!
  if (typeof g.window !== 'undefined' && typeof g.document !== 'undefined') return 'browser';
  if (typeof g.importScripts === 'function' && typeof g.document === 'undefined') return 'webworker';
  return 'unknown';                                            // edge runtime, sandbox, etc.
}

var cases = [
  { Deno: {}, process: { versions: { node: '20' } } },
  { Bun: {}, process: { versions: { node: '22.0.0' } } },
  { process: { versions: { node: '22.11.0' } }, window: {}, document: {} },  // jsdom test
  { window: {}, document: {} },
  { importScripts: function () {} },
  { process: {} },                       // weird: process without versions
  {}
];
cases.forEach(function (c) { console.log(detectRuntime(c)); });
console.log('Real runtime here:', detectRuntime(globalThis));` },
        dry: { head: ['fake global has', 'Deno?', 'Bun?', 'versions.node?', 'window+document?', 'result'], rows: [
          ['Deno, process', 'yes', '-', '-', '-', '<span class="c-g">deno</span>'],
          ['Bun, process.versions.node', 'no', 'yes', '-', '-', '<span class="c-g">bun</span>'],
          ['process.versions.node, window, document', 'no', 'no', 'yes', '-', '<span class="c-g">node</span> (jsdom)'],
          ['window, document', 'no', 'no', 'no', 'yes', '<span class="c-g">browser</span>'],
          ['importScripts()', 'no', 'no', 'no', 'no', '<span class="c-g">webworker</span>'],
          ['process (no versions)', 'no', 'no', 'no (safe ?.)', 'no', '<span class="c-m">unknown</span>']
        ] },
        complexity: `<p>O(1): a fixed number of property checks. No allocation.</p>`,
        followUps: ['Why is <b>feature detection</b> (does <code>fetch</code> exist?) usually better than <b>runtime detection</b>?', 'How would you detect Cloudflare Workers or a Service Worker?', 'How do bundlers let you avoid runtime checks entirely (the <code>exports</code> conditions)?']
      }
    }]
  });
  /* =====================================================================
     TOPIC 3 — The Global Object
     ===================================================================== */
  topics.push({
    title: 'The Global Object: window, self, global and globalThis',
    analogy: `<p>The global object is the <b>shared fridge in an office kitchen</b>. Anything put on its shelves can be grabbed by everyone in the building. The runtime pre-stocks it (<code>setTimeout</code>, <code>JSON</code>, <code>fetch</code>…). The problem: if you put your lunch there with a common label like <i>"name"</i>, someone else's lunch with the same label gets swapped. Different buildings call the fridge different names (<code>window</code> in the browser office, <code>global</code> in the Node warehouse) — so the standards people finally put the same sign on every fridge: <b><code>globalThis</code></b>.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Every runtime has one special object that holds all the built-in global names. When you write <code>setTimeout(...)</code> without any prefix, JavaScript finds <code>setTimeout</code> on that <b>global object</b>.</p>
${H.table(['Runtime', 'Its own name', 'Also works'], [
  ['Browser page (main thread)', '<code>window</code> (also <code>self</code>, <code>frames</code>)', '<code>globalThis</code>'],
  ['Web Worker / Service Worker', '<code>self</code>', '<code>globalThis</code>'],
  ['Node.js', '<code>global</code>', '<code>globalThis</code>'],
  ['Deno / Bun / edge runtimes', '<code>globalThis</code> (Deno 2 removed <code>window</code>)', '<code>self</code> in some']
])}
<p><b>Rule of thumb in 2026:</b> write <code>globalThis</code> whenever you really mean "the global object". It is in the language since ES2020 and works everywhere.</p>
<p><b>🔵 What lands on the global object?</b> It depends on <b>where</b> the code runs:</p>
<ul>
<li><b>Classic browser script</b> (<code>&lt;script&gt;</code> without <code>type="module"</code>): top-level <code>var</code> and <code>function</code> declarations become <b>properties of window</b>. Top-level <code>let</code>, <code>const</code> and <code>class</code> are global <i>variables</i> visible to all scripts, but they are <b>not</b> properties of <code>window</code>.</li>
<li><b>ES module</b> (browser or Node): every top-level declaration is <b>local to the module</b>. Nothing leaks onto the global object.</li>
<li><b>Node CommonJS file</b>: your file is wrapped in a function, so top-level <code>var</code> is local to that function — nothing leaks.</li>
<li><b>Everywhere in sloppy mode:</b> assigning to an <b>undeclared</b> name (<code>total = 5</code>) silently creates a global property — the "implicit global" bug. In <b>strict mode</b> (and all modules and classes) it throws <code>ReferenceError</code>.</li>
</ul>
${H.table(['Top-level code', 'Classic script', 'ES module', 'Node CJS'], [
  ['<code>var a = 1</code>', '<span class="c-r">window.a === 1</span>', 'module-local', 'file-local'],
  ['<code>let b = 2</code>', 'global variable, not on window', 'module-local', 'file-local'],
  ['<code>function f(){}</code>', '<span class="c-r">window.f</span>', 'module-local', 'file-local'],
  ['<code>c = 3</code> (undeclared)', '<span class="c-r">window.c</span>', '<span class="c-r">ReferenceError</span> (strict)', '<span class="c-r">global.c</span>'],
  ['<code>this</code>', '<code>window</code>', '<code>undefined</code>', '<code>module.exports</code>']
])}`,
    clues: [
      '"Why is var name = 5 a string in the browser?" → var lands on window and collides with window.name',
      '"How do I access the global object in code that runs in browser and Node?" → globalThis',
      '"Variable is visible across script tags" / "two libraries overwrite each other" → global namespace pollution',
      '"What is this at the top level of a module / a CommonJS file?" → undefined / module.exports',
      '"I forgot let and it still worked" → implicit global in sloppy mode; strict mode throws',
      '"Polyfill" / "shim" a missing API → attach it to globalThis after feature detection'
    ],
    code: [{ lang: 'js', run: true, title: 'Implicit globals and globalThis (runnable)', code: R`// 1) Forgetting let/const in sloppy mode creates a GLOBAL property.
function leaky() {
  counter = 1;                    // no declaration! becomes globalThis.counter
}
leaky();
console.log('leaked:', globalThis.counter);          // 1
console.log('deletable:', delete globalThis.counter); // true (implicit globals are configurable)

// 2) Strict mode turns the same mistake into an error you can see.
function safe() {
  'use strict';
  try {
    total = 1;                    // ReferenceError in strict mode
  } catch (e) {
    console.log(e.name + ': ' + e.message);
  }
}
safe();

// 3) A safe, explicit global (e.g. a polyfill) -- feature-detect first.
if (typeof globalThis.myAppConfig === 'undefined') {
  globalThis.myAppConfig = Object.freeze({ debug: false });
}
console.log('config:', globalThis.myAppConfig);` },
    { lang: 'html', title: 'Two classic scripts share ONE global scope (browser)', code: `<script>
  var theme = 'dark';          // becomes window.theme
  let user = 'asha';           // global, but NOT window.user
<\/script>
<script>
  console.log(window.theme);   // 'dark'
  console.log(user);           // 'asha'  (shared global lexical scope)
  console.log(window.user);    // undefined
<\/script>
<script type="module">
  var secret = 42;             // module-local: window.secret stays undefined
  console.log(this);           // undefined at the top of a module
<\/script>` }],
    viz: {
      title: 'Same 6 lines, three places: what ends up on the global object?',
      input: 'script',
      inputLabel: 'Mode: script | module | node',
      gen: function (input) {
        var mode = String(input || 'script').trim().toLowerCase();
        if (['script', 'module', 'node'].indexOf(mode) < 0) throw new Error('Type one of: script, module, node');
        var code = 'var a = 1;\nlet b = 2;\nfunction f() {}\nc = 3;\nconsole.log(globalThis.a, globalThis.b, typeof globalThis.f, globalThis.c);\nconsole.log(this === globalThis);';
        var gName = mode === 'script' ? 'window (globalThis)' : (mode === 'node' ? 'global (globalThis)' : 'globalThis');
        var glob = [['setTimeout', 'ƒ'], ['JSON', '{…}']], scope = [], out = [], frames = [];
        var scopeName = mode === 'script' ? 'Global lexical scope (let/const/class)' : (mode === 'module' ? 'Module scope' : 'Module-wrapper function scope');
        function snap(line, narr, hlG, hlS, cls) {
          var h = {}; if (line) h[line] = cls || 'cur';
          var parts = [
            { type: 'code', label: mode === 'script' ? 'classic &lt;script&gt; (sloppy)' : (mode === 'module' ? 'ES module (always strict)' : 'Node CommonJS file (sloppy)'), lang: 'js', code: code, hl: h },
            { type: 'map', label: gName, entries: glob.slice(), hl: hlG || {} },
            { type: 'map', label: scopeName, entries: scope.slice(), hl: hlS || {} }
          ];
          if (out.length) parts.push({ type: 'text', label: 'Console output', html: '<pre>' + out.map(H.esc).join('\n') + '</pre>' });
          frames.push({ narr: narr, parts: parts });
        }
        snap(0, 'Mode <b>' + mode + '</b>. The global object already holds host built-ins. ' + (mode === 'node' ? 'Node secretly wraps this file in <code>function (exports, require, module, __filename, __dirname) { … }</code>.' : mode === 'module' ? 'Modules get their own scope and are strict automatically.' : 'Classic scripts all share one global scope.'));
        if (mode === 'script') {
          glob.push(['a', 1]); snap(1, '<code>var a</code> at the top of a classic script becomes a <span class="c-r">property of window</span>.', { a: 'bad' });
          scope.push(['b', 2]); snap(2, '<code>let b</code> is global (other scripts can see it) but lives in the <b>global lexical scope</b>, not on window.', {}, { b: 'ok' });
          glob.push(['f', 'ƒ f()']); snap(3, 'Top-level <code>function f</code> also becomes <span class="c-r">window.f</span>.', { f: 'bad' });
          glob.push(['c', 3]); snap(4, '<code>c = 3</code> with no declaration: sloppy mode silently creates <span class="c-r">window.c</span> (implicit global).', { c: 'bad' });
          out.push('1 undefined function 3'); snap(5, 'Prints <b>1 undefined function 3</b>: a, f, c are on window; b is not.', {}, {}, 'ok');
          out.push('true'); snap(6, 'Top-level <code>this</code> in a classic script is <b>window</b> → <b>true</b>.', {}, {}, 'ok');
        } else if (mode === 'module') {
          scope.push(['a', 1]); snap(1, '<code>var a</code> stays <span class="c-g">module-local</span>. The global object is untouched.', {}, { a: 'ok' });
          scope.push(['b', 2]); snap(2, '<code>let b</code> is module-local too.', {}, { b: 'ok' });
          scope.push(['f', 'ƒ f()']); snap(3, '<code>function f</code> is module-local. Other files must <code>import</code> it.', {}, { f: 'ok' });
          out.push('ReferenceError: c is not defined'); snap(4, 'Modules are <b>strict</b>: assigning to undeclared <code>c</code> throws <span class="c-r">ReferenceError</span>. Lines 5–6 never run — good, the bug is caught early!', {}, {}, 'bad');
          snap(0, 'If you deleted line 4, line 5 would print <b>undefined undefined undefined undefined</b> and line 6 <b>false</b> (<code>this</code> is <code>undefined</code> at the top of a module).');
        } else {
          scope.push(['exports', '{}'], ['require', 'ƒ'], ['module', '{…}']);
          scope.push(['a', 1]); snap(1, '<code>var a</code> is local to the hidden wrapper function — <span class="c-g">not</span> on <code>global</code>.', {}, { a: 'ok' });
          scope.push(['b', 2]); snap(2, '<code>let b</code> is local too.', {}, { b: 'ok' });
          scope.push(['f', 'ƒ f()']); snap(3, '<code>function f</code> is local to the wrapper.', {}, { f: 'ok' });
          glob.push(['c', 3]); snap(4, 'CommonJS files are sloppy by default, so <code>c = 3</code> leaks onto <span class="c-r">global.c</span>.', { c: 'bad' });
          out.push('undefined undefined undefined 3'); snap(5, 'Prints <b>undefined undefined undefined 3</b>: only the implicit global leaked.', {}, {}, 'ok');
          out.push('false'); snap(6, 'Top-level <code>this</code> in CommonJS is <code>module.exports</code> (an empty object), not global → <b>false</b>.', {}, {}, 'ok');
        }
        return pad4(frames);
      }
    },
    examples: [
      { title: 'The window.name trap', html: `<p>In a browser classic script: <code>var name = 42; console.log(typeof name);</code> prints <b>"string"</b>! <code>var name</code> refers to the existing <code>window.name</code> property, whose setter converts values to strings. In Node or a module it prints <b>"number"</b>. Lesson: do not use top-level <code>var</code> in browser scripts.</p>` },
      { title: 'Element ids become globals', html: `<p>HTML has a legacy feature called <b>named access</b>: <code>&lt;div id="cart"&gt;</code> makes <code>window.cart</code> refer to that element. So <code>console.log(cart)</code> "works" without <code>getElementById</code> — until a variable called <code>cart</code> shadows it. Never rely on it; always query the DOM explicitly.</p>` },
      { title: 'Predict: var vs let vs implicit global inside a function', html: `<p>Variables declared inside a function never touch the global object; only the undeclared assignment leaks (sloppy mode).</p>`, code: { lang: 'js', run: true, code: R`function setup() {
  var local1 = 'a';
  let local2 = 'b';
  oops = 'c';                         // implicit global (sloppy mode)
}
setup();
console.log(typeof local1, typeof local2, typeof oops);  // undefined undefined string
console.log('oops' in globalThis);                        // true
delete globalThis.oops;` } },
      { title: 'Writing a polyfill the right way', html: `<p>A polyfill adds a missing API to the global object, only if it is missing:</p>`, code: { lang: 'js', run: true, code: R`if (typeof globalThis.structuredClone !== 'function') {
  // Simplified fallback for plain JSON-safe data only
  globalThis.structuredClone = function (value) { return JSON.parse(JSON.stringify(value)); };
}
var copy = structuredClone({ a: [1, 2], b: { c: 3 } });
console.log(copy, typeof globalThis.structuredClone);` } }
    ],
    deepDive: `<p><b>🟣 Two halves of the global environment.</b> The spec's <b>Global Environment Record</b> has an <i>object record</i> (backed by the global object: <code>var</code>, function declarations, built-ins) and a <i>declarative record</i> (<code>let</code>/<code>const</code>/<code>class</code>). That is why <code>let x</code> at top level is global but not <code>window.x</code>, and why declaring <code>let alert = 1</code> in one script and <code>var alert</code> in another throws a <code>SyntaxError</code> (redeclaration).</p>
<p><b>Non-configurable vars.</b> A top-level <code>var</code> creates a non-configurable property, so <code>delete window.a</code> returns <code>false</code>; an implicit global is configurable, so <code>delete</code> works. Strict mode makes the failed delete throw.</p>
<p><b>WindowProxy.</b> In browsers <code>window</code> is actually a <b>WindowProxy</b> that points at the current Window object of a browsing context; when an iframe navigates, the proxy re-targets. Each iframe is its own <b>realm</b> with its own <code>Array</code>, which is why <code>arr instanceof Array</code> can be <code>false</code> for arrays from another frame (use <code>Array.isArray</code>).</p>
<p><b>Old-school global access.</b> Before ES2020, libraries used <code>typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : global</code>, or <code>Function('return this')()</code>, which breaks under strict Content-Security-Policy (no <code>eval</code>). <code>globalThis</code> solved this.</p>
<p><b>Node specifics.</b> In the Node REPL, top-level <code>var</code> <i>does</i> become a global property (REPL code is not wrapped). <code>global.require</code> is undefined in files: <code>require</code> comes from the wrapper. Frozen-intrinsics flags and <code>--disallow-code-generation-from-strings</code> let security-sensitive apps lock the global environment down.</p>`,
    aiEra: `<p><b>What AI changes:</b> generated snippets often assume one specific global: <code>window.addEventListener</code> in code that will run in a Worker, or <code>global.fetch = …</code> polyfills copied from 2019 blog posts. Ask your assistant to use <code>globalThis</code> and feature detection.</p>
<p><b>Use AI as a partner:</b> <code>Scan this file for implicit globals, top-level var in classic scripts, and any reliance on window/global names</code> — a quick audit that also teaches you what to look for. ESLint's <code>no-undef</code> and <code>no-implicit-globals</code> rules catch the same issues automatically.</p>
<p><b>Where AI goes wrong:</b> it may say "<code>let</code> variables are attached to window" (false) or forget that modules are strict. It may also suggest monkey-patching globals in shared code, which causes clashes between libraries.</p>
<p><b>What you must still own:</b> a clear picture of the three scopes (global object, global lexical scope, module scope). Browser extensions, analytics tags and AI-generated widgets all share your page's global object — understanding pollution and collisions is key to debugging "it works alone but not on our site".</p>`,
    problems: [{
      title: 'getGlobal(): a Universal Global Accessor',
      level: 'Easy', tags: ['globalThis', 'polyfill', 'feature detection'], companies: ['Meta', 'Adobe', 'Uber'],
      statement: `<p>Write <code>getGlobal(env)</code> that returns the global object. <code>env</code> describes which names exist (so we can test without many runtimes): an object that may have <code>globalThis</code>, <code>self</code>, <code>window</code> and/or <code>global</code> properties. Prefer <code>globalThis</code>, then <code>self</code> (browsers <b>and</b> workers), then <code>window</code>, then <code>global</code> (Node). If none exist, throw <code>Error('Unable to locate global object')</code>. Also show the real-world version using <code>typeof</code>.</p>`,
      constraints: `Do not use <code>eval</code> or <code>Function('return this')</code> (blocked by strict CSP).`,
      example: `<p><code>getGlobal({ global: G })</code> → ${H.c('g', 'G')} (old Node). <code>getGlobal({ self: S, window: S })</code> → ${H.c('g', 'S')}. <code>getGlobal({})</code> → ${H.c('r', 'throws')}.</p>`,
      brute: { why: `<p>Just <code>return window</code>: crashes in Node, Web Workers and Deno 2 with <code>ReferenceError</code>. Or <code>return this</code> at top level: <code>undefined</code> in modules and <code>module.exports</code> in CommonJS — not the global at all.</p>`, code: R`function getGlobalBrute() {
  return window;   // ReferenceError: window is not defined (Node, workers, Deno 2)
}
try { getGlobalBrute(); } catch (e) { console.log('brute failed:', e.message); }` },
      mcq: { q: 'Which name is the best <i>first</i> choice in 2026 code?', options: ['<code>window</code>', '<code>global</code>', '<code>globalThis</code>', '<code>this</code>'], answer: 2, explain: '<code>globalThis</code> is standard (ES2020) and works in every runtime and every scope. Use the others only as fallbacks for very old engines.' },
      hints: [`<p><b>Hint 1:</b> this is a <b>priority list</b>: walk an ordered array of candidate names and return the first that exists.</p>`, `<p><b>Hint 2:</b> in real code you cannot read <code>env.window</code> — you must use <code>typeof window !== 'undefined'</code> because reading an undeclared name throws, but <code>typeof</code> never does.</p>`, `<p><b>Hint 3:</b> order: globalThis → self → window → global → throw. <code>self</code> before <code>window</code> because it also covers Web Workers.</p>`],
      solution: {
        approach: `<p>Ordered fallback list. The testable version reads properties of <code>env</code>; the production version uses <code>typeof</code> guards so a missing name never throws.</p>`,
        code: { lang: 'js', run: true, code: R`// Testable version: env says which names exist.
function getGlobal(env) {
  var order = ['globalThis', 'self', 'window', 'global'];
  for (var i = 0; i < order.length; i++) {
    if (env[order[i]] !== undefined) return env[order[i]];
  }
  throw new Error('Unable to locate global object');
}

// Production version (what old libraries shipped before ES2020):
function realGlobal() {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof self !== 'undefined') return self;      // browsers + workers
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;  // old Node
  throw new Error('Unable to locate global object');
}

var G = { tag: 'node-global' }, S = { tag: 'browser-self' };
console.log(getGlobal({ global: G }).tag);             // node-global
console.log(getGlobal({ self: S, window: S }).tag);    // browser-self
try { getGlobal({}); } catch (e) { console.log('threw:', e.message); }
console.log(realGlobal() === globalThis);               // true` },
        dry: { head: ['env has', 'globalThis?', 'self?', 'window?', 'global?', 'returns'], rows: [
          ['global', 'no', 'no', 'no', 'yes', '<span class="c-g">G</span>'],
          ['self, window', 'no', 'yes', '-', '-', '<span class="c-g">S</span>'],
          ['globalThis, global', 'yes', '-', '-', '-', '<span class="c-g">globalThis value</span>'],
          ['(nothing)', 'no', 'no', 'no', 'no', '<span class="c-r">throw</span>']
        ] },
        complexity: `<p>O(1): at most four checks.</p>`,
        followUps: ['Why does <code>Function(\'return this\')()</code> fail under a strict Content-Security-Policy?', 'Why is <code>self</code> preferred over <code>window</code>?', 'What does top-level <code>this</code> equal in each runtime?']
      }
    }]
  });
registerModule({ id: 'js03', title: 'x', intro: 'x', goals: [], prereqs: 'x', hours: 1, topics: topics, practice: practice, quiz: quiz, interview: interview }); })();
