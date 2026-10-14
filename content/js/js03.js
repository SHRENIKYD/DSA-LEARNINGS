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
  /* =====================================================================
     TOPIC 4 — Script vs Module (browser) and CommonJS vs ESM (Node)
     ===================================================================== */
  function parseModGraph(input) {
    var txt = String(input || '').trim();
    if (!txt) throw new Error('Format: main: a b; a: c; b: c; c:');
    var order = [], deps = {};
    txt.split(/[;\n]+/).forEach(function (part) {
      part = part.trim(); if (!part) return;
      var m = part.split(':');
      if (m.length !== 2) throw new Error('Each entry needs one colon, e.g. "a: b c". Problem near "' + part + '"');
      var name = m[0].trim();
      if (!/^[\w.\-]+$/.test(name)) throw new Error('Module names: letters/digits only. Bad: "' + name + '"');
      var ds = m[1].trim() ? m[1].trim().split(/[\s,]+/) : [];
      if (deps[name]) throw new Error('Module "' + name + '" listed twice');
      deps[name] = ds; order.push(name);
    });
    order.slice().forEach(function (n) { deps[n].forEach(function (d) { if (!deps[d]) { deps[d] = []; order.push(d); } }); });
    if (order.length > 8) throw new Error('Use at most 8 modules');
    return { order: order, deps: deps };
  }
  topics.push({
    title: 'Script vs Module: Classic Scripts, ES Modules and CommonJS',
    analogy: `<p>A <b>classic script</b> is like everyone in a shared flat writing on <b>one big whiteboard</b>: whatever you write, everyone sees, and you can rub out someone else's notes by accident. A <b>module</b> is like each person getting their <b>own notebook</b>: nothing is shared unless you <i>tear out a page and hand it over</i> (<code>export</code>) and the other person <i>asks for it by name</i> (<code>import</code>). And a notebook is only ever written once — if two people ask for the same notebook, they get the very same copy.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> JavaScript files can be loaded in two ways:</p>
<ul>
<li><b>Classic script</b> — the old way. All top-level names go into one shared global scope. No <code>import</code>/<code>export</code>. Sloppy mode unless you write <code>'use strict'</code>.</li>
<li><b>Module</b> — the modern way (ES modules, "ESM", standard since ES2015). Each file has its own scope; you share with <code>export</code> and pull in with <code>import</code>. Always strict mode. Runs only once no matter how many files import it.</li>
</ul>
${H.table(['Feature', 'Classic script', 'ES module'], [
  ['How (browser)', '<code>&lt;script src="a.js"&gt;</code>', '<code>&lt;script type="module" src="a.js"&gt;</code>'],
  ['Scope', 'shared global', 'private per file'],
  ['Strict mode', 'only if you opt in', 'always'],
  ['<code>import</code> / <code>export</code>', 'SyntaxError', 'yes (plus dynamic <code>import()</code> everywhere)'],
  ['Top-level <code>this</code>', '<code>window</code>', '<code>undefined</code>'],
  ['Top-level <code>await</code>', 'no', 'yes'],
  ['When it runs', 'immediately, blocking HTML parsing', 'deferred: after HTML is parsed'],
  ['Included twice', 'runs twice', 'runs once (cached by URL)'],
  ['Cross-origin', 'allowed', 'needs CORS headers; <code>file://</code> pages fail']
])}
<p><b>🔵 Node has two module systems.</b> Node was created before ES modules existed, so it invented <b>CommonJS</b> (CJS): <code>require()</code> and <code>module.exports</code>. Today Node supports both:</p>
${H.table(['', 'CommonJS', 'ES modules in Node'], [
  ['Syntax', '<code>const x = require(\'./x\')</code>, <code>module.exports = …</code>', '<code>import x from \'./x.js\'</code>, <code>export …</code>'],
  ['File is ESM when…', '<code>.cjs</code>, or <code>.js</code> without <code>"type": "module"</code>', '<code>.mjs</code>, or <code>.js</code> with <code>"type": "module"</code> in package.json'],
  ['Loading', 'synchronous, at the line where <code>require</code> runs', 'whole graph parsed and linked first, then evaluated'],
  ['Exports are', 'a <b>copy</b> of a value (an object you get back)', '<b>live bindings</b> (you always see the current value)'],
  ['File helpers', '<code>__dirname</code>, <code>__filename</code>', '<code>import.meta.dirname</code>, <code>import.meta.filename</code>, <code>import.meta.url</code>'],
  ['Extensions', 'optional (<code>./x</code> works)', 'required for relative paths (<code>./x.js</code>)']
])}
<p><b>The ESM loading flow</b> has three phases: (1) <b>construction</b> — fetch and parse every file in the graph, discovering imports without running anything; (2) <b>linking</b> — connect each <code>import</code> to the matching <code>export</code> slot in memory; (3) <b>evaluation</b> — run each module's top-level code, <b>dependencies first</b> (depth-first, post-order), each exactly once.</p>`,
    clues: [
      '"Cannot use import statement outside a module" → file treated as classic script / CommonJS; add type="module" or "type": "module"',
      '"require is not defined in ES module scope" → you are in ESM; use import or createRequire',
      '"__dirname is not defined" → ESM in Node; use import.meta.dirname',
      '"In what order do these modules log?" → dependencies evaluate first, each module once',
      '"Why does my module script fail when I open index.html by double-click?" → file:// + CORS',
      '"defer vs async" → order preserved and after parsing vs as-soon-as-downloaded'
    ],
    code: [{ lang: 'js', title: 'CommonJS in Node (syntax-checked): math.cjs then app.cjs', code: R`// ---- math.cjs ----
let count = 0;
function add(a, b) { count++; return a + b; }
module.exports = { add, count };          // count is COPIED now (value 0)

// ---- app.cjs ----
// const { add, count } = require('./math.cjs');   // runs math.cjs NOW, synchronously
// add(1, 2);
// console.log(count);                             // 0  -- the copy never changes
// console.log(require.cache);                     // math.cjs is cached: required once
// console.log(__dirname, __filename);             // provided by the module wrapper` },
    { lang: 'js', title: 'ES modules in Node (syntax-checked): math.mjs then app.mjs', code: R`// ---- math.mjs ----
export let count = 0;
export function add(a, b) { count++; return a + b; }

// ---- app.mjs ----  (shown as comments because one snippet = one file)
// import { add, count } from './math.mjs';   // hoisted: math.mjs runs BEFORE app.mjs
// add(1, 2);
// console.log(count);                        // 1  -- live binding sees the update
// console.log(import.meta.dirname);          // ESM replacement for __dirname
// const { default: big } = await import('./big.mjs');   // dynamic import, lazy` },
    { lang: 'js', run: true, title: 'Copy vs live binding, simulated in plain JS (runnable)', code: R`// CommonJS hands you a snapshot object: the value at export time.
function cjsStyle() {
  var count = 0;
  return { count: count, inc: function () { count++; } };
}
// ESM gives a live binding: like a getter into the module's own variable.
function esmStyle() {
  var count = 0;
  return { get count() { return count; }, inc: function () { count++; } };
}
var c = cjsStyle(), e = esmStyle();
c.inc(); c.inc();
e.inc(); e.inc();
console.log('CommonJS-style count:', c.count);   // 0 (stale copy)
console.log('ESM-style count:', e.count);        // 2 (live)` },
    { lang: 'html', title: 'Script loading attributes in the browser', code: `<!-- Blocks HTML parsing while it downloads AND runs -->
<script src="legacy.js"><\/script>

<!-- Downloads in parallel, runs after parsing, in document order -->
<script defer src="app.js"><\/script>

<!-- Downloads in parallel, runs as soon as ready, any order (analytics, ads) -->
<script async src="analytics.js"><\/script>

<!-- Module: deferred by default, strict, own scope, runs once -->
<script type="module" src="main.js"><\/script>

<!-- Fallback for very old browsers that do not understand modules -->
<script nomodule src="legacy-bundle.js"><\/script>` }],
    viz: [{
      title: 'Module loading flow: construct → link → evaluate',
      input: 'main: a b; a: c; b: c a; c:',
      inputLabel: 'Module graph — "name: imports; ..." (first = entry)',
      gen: function (input) {
        var g = parseModGraph(input), order = g.order, deps = g.deps, entry = order[0];
        // BFS levels for layout
        var level = {}, q = [entry], seenB = {}; level[entry] = 0; seenB[entry] = true;
        var bfsOrder = [];
        while (q.length) {
          var u = q.shift(); bfsOrder.push(u);
          deps[u].forEach(function (d) { if (!seenB[d]) { seenB[d] = true; level[d] = level[u] + 1; q.push(d); } });
        }
        order.forEach(function (n) { if (level[n] === undefined) level[n] = 0; });
        var byLevel = {};
        order.forEach(function (n) { (byLevel[level[n]] = byLevel[level[n]] || []).push(n); });
        var maxL = 0; Object.keys(byLevel).forEach(function (k) { maxL = Math.max(maxL, +k); });
        var nodes = order.map(function (n) {
          var row = byLevel[level[n]], i = row.indexOf(n);
          return { id: n, label: n + '.js', x: Math.round((i + 1) * 100 / (row.length + 1)), y: 8 + level[n] * Math.round(50 / Math.max(1, maxL)) };
        });
        var edges = []; order.forEach(function (n) { deps[n].forEach(function (d) { edges.push([n, d, 'import']); }); });
        var frames = [], H2 = function (o) { return o; };
        var fetched = [];
        // Phase 1: construction (BFS discovery, nothing runs)
        var queue = [entry], seen = {}; seen[entry] = true;
        frames.push({ narr: '<b>Phase 1 — construction.</b> The host fetches <b>' + entry + '.js</b> and parses it. Parsing reveals its <code>import</code> lines. <b>No code runs yet.</b>', parts: [
          { type: 'graph', directed: true, height: 66, nodes: nodes, edges: edges, hl: H2((function () { var o = {}; o[entry] = 'cur'; return o; })()) },
          { type: 'queue', label: 'To fetch + parse', items: queue.slice(), frontLabel: 'next', backLabel: 'last' }
        ] });
        while (queue.length) {
          var cur = queue.shift(); fetched.push(cur);
          var newOnes = [];
          deps[cur].forEach(function (d) { if (!seen[d]) { seen[d] = true; queue.push(d); newOnes.push(d); } });
          var hl = {}; fetched.forEach(function (f) { hl[f] = 'done'; }); hl[cur] = 'cur'; newOnes.forEach(function (d) { hl[d] = 'win'; });
          var ehl = {}; deps[cur].forEach(function (d) { ehl[cur + '-' + d] = 'ok'; });
          frames.push({ narr: 'Parsed <b>' + cur + '.js</b>: it imports ' + (deps[cur].length ? deps[cur].map(function (d) { return '<b>' + d + '</b>'; }).join(', ') : 'nothing') + '. ' + (newOnes.length ? 'New files to fetch: ' + newOnes.join(', ') + ' (fetched in parallel).' : 'No new files — already known modules are never fetched twice.'), parts: [
            { type: 'graph', directed: true, height: 66, nodes: nodes, edges: edges, hl: hl, ehl: ehl },
            { type: 'queue', label: 'To fetch + parse', items: queue.slice(), frontLabel: 'next', backLabel: 'last' },
            { type: 'list', label: 'Module map (parsed, not run)', values: fetched.slice() }
          ] });
        }
        // Phase 2: linking
        var allE = {}; edges.forEach(function (e) { allE[e[0] + '-' + e[1]] = 'win'; });
        frames.push({ narr: '<b>Phase 2 — linking.</b> Every <code>import { x }</code> is wired to the memory slot of the matching <code>export</code> (a <b>live binding</b>). A missing export name fails <i>here</i>, before any code runs: <code>SyntaxError: does not provide an export named …</code>', parts: [
          { type: 'graph', directed: true, height: 66, nodes: nodes, edges: edges, ehl: allE },
          { type: 'text', label: 'Why it matters', html: 'Typos in import names are caught before side effects happen. CommonJS cannot do this: it only finds out when <code>require</code> runs.' }
        ] });
        // Phase 3: evaluation (DFS post-order)
        var state = {}, evalOrder = [], stack = [];
        function hlNow(cur, cls) {
          var o = {}; evalOrder.forEach(function (n) { o[n] = 'ok'; }); stack.forEach(function (n) { if (!o[n]) o[n] = 'win'; }); if (cur) o[cur] = cls || 'cur'; return o;
        }
        function push(n, narr, cls) {
          frames.push({ narr: narr, parts: [
            { type: 'graph', directed: true, height: 66, nodes: nodes, edges: edges, hl: hlNow(n, cls) },
            { type: 'stack', label: 'DFS stack (visiting)', items: stack.slice(), hl: stack.length ? (function () { var o = {}; o[stack.length - 1] = 'cur'; return o; })() : {} },
            { type: 'array', label: 'Evaluation order', values: evalOrder.slice(), hl: evalOrder.length ? (function () { var o = {}; o[evalOrder.length - 1] = 'ok'; return o; })() : {} }
          ] });
        }
        function visit(n) {
          state[n] = 'visiting'; stack.push(n);
          push(n, '<b>Phase 3 — evaluation.</b> Visit <b>' + n + '</b>. Before running its code, its imports must run first.');
          deps[n].forEach(function (d) {
            if (state[d] === 'done') push(d, '<b>' + d + '</b> already evaluated — modules run <b>once</b>. Reuse it.', 'done');
            else if (state[d] === 'visiting') push(d, '<span class="c-r">Cycle!</span> <b>' + d + '</b> is still on the stack. Skip it; <b>' + n + '</b> may see its bindings uninitialised (TDZ error if it reads them at top level).', 'bad');
            else visit(d);
          });
          stack.pop(); state[n] = 'done'; evalOrder.push(n);
          push(n, 'All imports of <b>' + n + '</b> are done → run <b>' + n + '.js</b> top-level code now.', 'ok');
        }
        visit(entry);
        frames.push({ narr: 'Final evaluation order: <b>' + evalOrder.join(' → ') + '</b>. Rule to remember: <b>dependencies first, entry last, each module once</b> (post-order DFS, imports visited in source order).', parts: [
          { type: 'graph', directed: true, height: 66, nodes: nodes, edges: edges, hl: hlNow(null) },
          { type: 'array', label: 'Evaluation order', values: evalOrder.slice(), hl: { 0: 'sel' } }
        ] });
        return pad4(frames);
      }
    }, {
      title: 'Script loading timeline: classic vs defer vs async vs module',
      input: 'classic',
      inputLabel: 'Mode: classic | defer | async | module',
      gen: function (input) {
        var mode = String(input || 'classic').trim().toLowerCase();
        var plans = {
          classic: { parse: [0, 1, 2, 8, 9, 10, 11], pause: [3, 4, 5, 6, 7], dl: [3, 4, 5], dep: [], run: [6, 7], dcl: 12, note: 'Parsing <b>stops</b> at the &lt;script&gt; tag until the file is downloaded <i>and</i> run. Slow scripts in &lt;head&gt; = blank page.' },
          defer: { parse: [0, 1, 2, 3, 4, 5, 6], pause: [], dl: [3, 4, 5], dep: [], run: [7, 8], dcl: 9, note: 'Download happens <b>in parallel</b> with parsing; the script runs <b>after</b> parsing finishes, in document order, before DOMContentLoaded.' },
          async: { parse: [0, 1, 2, 3, 4, 5, 8], pause: [6, 7], dl: [3, 4, 5], dep: [], run: [6, 7], dcl: 9, note: 'Downloads in parallel, then runs <b>as soon as it arrives</b> — interrupting parsing. Order between async scripts is not guaranteed.' },
          module: { parse: [0, 1, 2, 3, 4, 5, 6], pause: [], dl: [3, 4, 5], dep: [6, 7], run: [8, 9], dcl: 10, note: 'Modules are <b>deferred by default</b>. The browser also fetches the module\'s imports (dep.js) before running anything, then evaluates dep.js, then main.' }
        };
        var p = plans[mode];
        if (!p) throw new Error('Type one of: classic, defer, async, module');
        var T = 13, colHead = []; for (var t = 0; t < T; t++) colHead.push('t' + t);
        var rowHead = ['HTML parsing', 'download ' + (mode === 'module' ? 'main.js' : 'app.js'), mode === 'module' ? 'download dep.js' : '(no imports)', 'run script'];
        var frames = [];
        function build(upto) {
          var rows = [[], [], [], []], hl = {};
          for (var t = 0; t < T; t++) {
            var show = t <= upto;
            rows[0].push(show ? (p.parse.indexOf(t) >= 0 ? 'parse' : (p.pause.indexOf(t) >= 0 ? 'PAUSED' : (t >= p.dcl ? 'done' : ''))) : '');
            rows[1].push(show && p.dl.indexOf(t) >= 0 ? 'fetch' : '');
            rows[2].push(show && p.dep.indexOf(t) >= 0 ? 'fetch' : '');
            rows[3].push(show && p.run.indexOf(t) >= 0 ? 'run' : '');
            if (show) {
              if (p.parse.indexOf(t) >= 0) hl['0,' + t] = 'ok';
              if (p.pause.indexOf(t) >= 0) hl['0,' + t] = 'bad';
              if (p.dl.indexOf(t) >= 0) hl['1,' + t] = 'win';
              if (p.dep.indexOf(t) >= 0) hl['2,' + t] = 'win';
              if (p.run.indexOf(t) >= 0) hl['3,' + t] = 'cur';
              if (t >= p.dcl) hl['0,' + t] = 'sel';
            }
          }
          return { type: 'grid', label: mode + ' script — timeline', rows: rows, rowHead: rowHead, colHead: colHead, hl: hl };
        }
        var marks = [0, 3, 5, 6, 7, 8, 9, 10, 12];
        marks.forEach(function (t) {
          var what = [];
          if (p.parse.indexOf(t) >= 0) what.push('HTML parser is working');
          if (p.pause.indexOf(t) >= 0) what.push('<span class="c-r">parser is blocked</span>');
          if (p.dl.indexOf(t) >= 0) what.push('script downloading');
          if (p.dep.indexOf(t) >= 0) what.push('module import downloading');
          if (p.run.indexOf(t) >= 0) what.push('<span class="c-y">JS executing on the main thread</span>');
          if (t === p.dcl) what.push('<span class="c-p">DOMContentLoaded fires</span>');
          frames.push({ narr: '<b>t' + t + '</b>: ' + (what.length ? what.join('; ') : 'idle') + '.', parts: [build(t)] });
        });
        frames.push({ narr: p.note + ' DOMContentLoaded at <b>t' + p.dcl + '</b>. Try the other modes to compare.', parts: [build(T)] });
        return frames;
      }
    }],
    examples: [
      { title: 'Predict the order: ESM imports are hoisted', html: `<p><code>main.mjs</code>: <code>console.log('main start'); import './a.mjs';</code> and <code>a.mjs</code>: <code>console.log('a');</code>. Output: <b>a</b> then <b>main start</b>. Import declarations are hoisted: the whole graph is linked and dependencies evaluate <i>before</i> the importing module's first line. With CommonJS <code>require</code> in the same position, the order follows the lines: <b>main start</b>, then <b>a</b>.</p>` },
      { title: 'Each module runs once', html: `<p>If <code>a.js</code> and <code>b.js</code> both import <code>config.js</code>, its top-level <code>console.log('config loaded')</code> prints <b>once</b>. Modules are singletons per URL (browser) or per resolved file path (Node, both CJS cache and ESM map). This is why a module is a natural place for a shared cache or a DB connection pool.</p>`, code: { lang: 'js', run: true, code: R`// A tiny module registry that mimics "evaluate once, then cache"
var registry = {}, cache = {};
function define(name, factory) { registry[name] = factory; }
function load(name) {
  if (name in cache) return cache[name];          // already evaluated -> reuse
  console.log('evaluating', name);
  cache[name] = registry[name](load);
  return cache[name];
}
define('config', function () { return { env: 'dev' }; });
define('a', function (req) { return 'a sees ' + req('config').env; });
define('b', function (req) { return 'b sees ' + req('config').env; });
console.log(load('a'));
console.log(load('b'));     // 'evaluating config' was printed only once` } },
      { title: 'Interop: mixing CJS and ESM in Node', html: `<p>ESM can <code>import</code> a CommonJS file: you get <code>module.exports</code> as the <b>default</b> export (named exports work when Node can detect them statically). CommonJS can load ESM with dynamic <code>await import('./x.mjs')</code>; recent Node versions (22.12+, 20.19+) also allow <code>require()</code> of an ES module as long as it has no top-level <code>await</code>. Libraries often ship both formats via the <code>exports</code> field ("dual packages").</p>` },
      { title: 'Why my module works on a server but not from file://', html: `<p>Double-clicking <code>index.html</code> opens it with <code>file://</code>. Module scripts are fetched with CORS rules, and <code>file://</code> URLs have an opaque origin, so Chrome blocks them. Fix: serve the folder over HTTP — <code>npx serve</code>, <code>python3 -m http.server</code>, or a dev server like Vite.</p>` }
    ],
    deepDive: `<p><b>🟣 Why ESM is statically analysable.</b> <code>import</code>/<code>export</code> declarations must be at the top level with string-literal specifiers, so tools know the dependency graph <i>without running code</i>. That enables <b>tree shaking</b> (dropping unused exports), early errors for missing names, parallel fetching, and <code>&lt;link rel="modulepreload"&gt;</code>. CommonJS <code>require</code> is just a function call (could be inside an <code>if</code> or computed), so bundlers must be conservative.</p>
<p><b>Spec phases.</b> Each file becomes a <b>Module Record</b>. <code>Link()</code> creates module environments and binds imports to exporters' bindings (indirect bindings, not copies). <code>Evaluate()</code> runs a DFS post-order with Tarjan-style strongly-connected-component handling for cycles; with top-level <code>await</code>, a module's evaluation becomes async and its dependents wait, while siblings that don't depend on it may proceed.</p>
<p><b>Cycles.</b> In ESM, a module in a cycle can be imported before it has finished evaluating; reading its <code>let</code>/<code>const</code>/<code>class</code> exports early throws a TDZ <code>ReferenceError</code>, while function declarations are hoisted and usable. In CommonJS, a cycle returns the <b>partially filled</b> <code>module.exports</code> object — no error, just mysterious <code>undefined</code>s.</p>
<p><b>Node resolution details.</b> ESM in Node needs full relative paths with extensions (<code>./util.js</code>), does not search <code>index.js</code> automatically, and resolves bare specifiers (<code>'lodash'</code>) through <code>node_modules</code> and the package's <code>exports</code> map. Import maps (<code>&lt;script type="importmap"&gt;</code>) let browsers resolve bare specifiers without a bundler. Import attributes (<code>import data from './x.json' with { type: 'json' }</code>) are standard in modern engines.</p>
<p><b>Performance reality.</b> Deep unbundled module graphs mean many requests (waterfalls as imports are discovered level by level). HTTP/2 and <code>modulepreload</code> help, but production sites usually still bundle (Vite/Rollup, esbuild, webpack, Rspack) while dev servers serve native ESM for speed.</p>`,
    aiEra: `<p><b>What AI changes:</b> half the JavaScript on the internet is CommonJS and half is ESM, so assistants frequently mix them in one file (<code>import</code> at the top, <code>module.exports</code> at the bottom) or use <code>__dirname</code> in an ESM file. You will see the resulting errors daily.</p>
<p><b>Use AI as a partner:</b> tell it the module system: <code>Node 22, "type": "module", ESM only, top-level await allowed</code>. Ask it to convert a file from CJS to ESM and explain each change (<code>__dirname</code> → <code>import.meta.dirname</code>, <code>require.main === module</code> → <code>import.meta.main</code> or a path comparison, JSON imports with import attributes).</p>
<p><b>Where AI goes wrong:</b> forgetting <code>.js</code> extensions in ESM relative imports, suggesting <code>require()</code> in browser code, or claiming CJS cannot load ESM at all (outdated since <code>require(esm)</code> landed). It also may "fix" circular import errors by adding random lazy requires — understand the cycle instead.</p>
<p><b>What you must still own:</b> predicting evaluation order and knowing which module system a file is in (extension + nearest package.json <code>type</code>). Modern AI tool servers (e.g. MCP servers) are typically ESM Node packages — you'll debug their loading the same way.</p>`,
    problems: [{
      title: 'Predict the ES Module Evaluation Order',
      level: 'Medium', tags: ['modules', 'dfs', 'graph', 'output prediction'], companies: ['Google', 'Microsoft', 'Bloomberg'],
      statement: `<p>Each module logs its own name when its top-level code runs. Given the import graph as an object (<code>graph[name]</code> = list of imports in source order) and the entry module, return the order in which modules <b>log</b>, following ES module rules: dependencies before dependents, imports visited in source order, every module evaluated <b>once</b>, and a module that is already being visited (a cycle) is skipped.</p>`,
      constraints: `1 ≤ modules ≤ 10<sup>4</sup>; total imports ≤ 10<sup>5</sup>; graph may contain cycles; avoid recursion-depth issues for long chains if you can.`,
      example: `<p>graph = <code>{ main: ['a', 'b'], a: ['c'], b: ['c', 'a'], c: [] }</code>, entry = <code>'main'</code></p>
<p>Output: ${H.arr(['c', 'a', 'b', 'main'], { hl: { 3: 'g' } })}</p>
<p>main → visit a → visit c → ${H.c('g', 'log c')} → ${H.c('g', 'log a')} → visit b → c done, a done → ${H.c('g', 'log b')} → ${H.c('g', 'log main')}.</p>`,
      brute: { why: `<p>A common wrong guess is "BFS order from the entry" (main, a, b, c) or "the order the imports appear" — that is <b>construction/fetch</b> order, not evaluation order. Another brute force re-evaluates shared dependencies every time they are imported, which both duplicates logs and can loop forever on cycles.</p>`, code: R`function evalOrderBrute(graph, entry) {
  // WRONG: BFS = fetch order, and no "evaluate once" protection beyond seen
  var out = [], q = [entry], seen = {};
  seen[entry] = true;
  while (q.length) {
    var m = q.shift();
    out.push(m);                              // logs main first -- not how ESM runs
    graph[m].forEach(function (d) { if (!seen[d]) { seen[d] = true; q.push(d); } });
  }
  return out;
}
console.log(evalOrderBrute({ main: ['a', 'b'], a: ['c'], b: ['c', 'a'], c: [] }, 'main'));` },
      mcq: { q: 'Module <code>main</code> imports <code>x</code> on line 5 and logs on line 1. What logs first?', options: ['main (line 1 runs first)', 'x (imports are hoisted; dependencies evaluate first)', 'It depends on network speed', 'Neither — SyntaxError'], answer: 1, explain: 'Static <code>import</code> declarations are hoisted. The whole graph is linked first, then evaluated depth-first, so <code>x</code> runs before any line of <code>main</code>.' },
      hints: [`<p><b>Hint 1:</b> "dependencies first, me last" is exactly <b>post-order depth-first search</b>.</p>`, `<p><b>Hint 2:</b> keep a state per module: unvisited / visiting / done. "done" means skip (run once). "visiting" means a cycle — skip too.</p>`, `<p><b>Hint 3:</b> recipe — visit(m): mark visiting; for each import d in order: if unvisited, visit(d); then mark done and push m. For huge chains use an explicit stack of [module, nextImportIndex] pairs.</p>`],
      solution: {
        approach: `<p>Iterative post-order DFS with an explicit stack of frames <code>[module, indexOfNextImport]</code>, so very deep import chains cannot overflow the call stack. A module is appended to the output when all of its imports have been processed.</p>`,
        code: { lang: 'js', run: true, code: R`function evaluationOrder(graph, entry) {
  var state = {};                 // undefined = unvisited, 1 = visiting, 2 = done
  var out = [];
  var stack = [[entry, 0]];
  state[entry] = 1;
  while (stack.length) {
    var top = stack[stack.length - 1];
    var mod = top[0], imports = graph[mod] || [];
    if (top[1] < imports.length) {
      var dep = imports[top[1]++];            // next import in source order
      if (state[dep] === undefined) {         // unvisited -> go deeper
        state[dep] = 1;
        stack.push([dep, 0]);
      }                                       // visiting (cycle) or done -> skip
    } else {
      stack.pop();                            // all imports handled
      state[mod] = 2;
      out.push(mod);                          // NOW this module's code runs
    }
  }
  return out;
}

console.log(evaluationOrder({ main: ['a', 'b'], a: ['c'], b: ['c', 'a'], c: [] }, 'main'));
// cycle: a imports b, b imports a
console.log(evaluationOrder({ main: ['a'], a: ['b'], b: ['a'] }, 'main'));   // [ 'b', 'a', 'main' ]` },
        dry: { head: ['step', 'stack (module:idx)', 'action', 'output'], rows: [
          ['1', 'main:0', 'next import a → push', '[]'],
          ['2', 'main:1, a:0', 'next import c → push', '[]'],
          ['3', 'main:1, a:1, c:0', 'c has no imports → pop', '<span class="c-g">[c]</span>'],
          ['4', 'main:1, a:1', 'a done → pop', '<span class="c-g">[c, a]</span>'],
          ['5', 'main:2, b:0', 'b imports c (done) skip, a (done) skip', '[c, a]'],
          ['6', 'main:2', 'b done → pop; main done → pop', '<span class="c-g">[c, a, b, main]</span>']
        ] },
        complexity: `<p>Time O(V + E): each module pushed once, each import edge examined once. Space O(V) for states and the stack.</p>`,
        followUps: ['How does top-level <code>await</code> change the order for sibling modules?', 'With CommonJS <code>require</code> calls in the middle of a file, how does the order differ?', 'In the cycle example, what happens if <code>b</code> reads a <code>const</code> exported by <code>a</code> at top level?']
      }
    }]
  });
  /* =====================================================================
     TOPIC 5 — npm basics
     ===================================================================== */
  function parseVer(s) {
    var m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(s).trim());
    if (!m) throw new Error('Versions must look like 1.2.3 (no pre-release tags in this demo). Bad: "' + s + '"');
    return [+m[1], +m[2], +m[3]];
  }
  function cmpVer(a, b) { for (var i = 0; i < 3; i++) { if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1; } return 0; }
  function vs(v) { return v ? v.join('.') : '∞'; }
  function parseRange(r) {
    r = String(r).trim();
    var m, v;
    if (r === '*' || r === 'x' || r === '') return { lo: [0, 0, 0], hi: null, desc: 'any version' };
    if ((m = /^\^(.+)$/.exec(r))) {
      v = parseVer(m[1]);
      var hi = v[0] > 0 ? [v[0] + 1, 0, 0] : (v[1] > 0 ? [0, v[1] + 1, 0] : [0, 0, v[2] + 1]);
      var why = v[0] > 0 ? 'major is ' + v[0] + ' → allow new minors and patches, block the next major' : (v[1] > 0 ? 'major is 0 → caret is stricter: only patches of 0.' + v[1] : 'major and minor are 0 → only this exact patch line');
      return { lo: v, hi: hi, desc: '^ caret: ' + why };
    }
    if ((m = /^~(.+)$/.exec(r))) { v = parseVer(m[1]); return { lo: v, hi: [v[0], v[1] + 1, 0], desc: '~ tilde: allow patch updates only' }; }
    if ((m = /^>=\s*(.+)$/.exec(r))) { v = parseVer(m[1]); return { lo: v, hi: null, desc: '>= : this version or anything newer (risky: includes new majors)' }; }
    if ((m = /^(\d+)\.(x|\*)$/.exec(r))) { return { lo: [+m[1], 0, 0], hi: [+m[1] + 1, 0, 0], desc: 'x-range: any ' + m[1] + '.y.z' }; }
    if ((m = /^(\d+)\.(\d+)\.(x|\*)$/.exec(r))) { return { lo: [+m[1], +m[2], 0], hi: [+m[1], +m[2] + 1, 0], desc: 'x-range: any ' + m[1] + '.' + m[2] + '.z' }; }
    v = parseVer(r);
    return { lo: v, hi: [v[0], v[1], v[2] + 1], desc: 'exact pin: only ' + vs(v) };
  }
  topics.push({
    title: 'npm Basics: package.json, Semver, node_modules and the Lockfile',
    analogy: `<p>npm is a <b>giant public library plus a librarian</b>. <code>package.json</code> is your <b>shopping list</b> ("flour, any 1.x brand"); the librarian (npm CLI) fetches books from the library (the npm <b>registry</b>, millions of packages) and shelves them in your <b>pantry</b> (<code>node_modules</code>). The <b>receipt</b> (<code>package-lock.json</code>) records exactly which edition of each book you got, so your teammate's pantry ends up identical. Version ranges like <code>^1.4.0</code> mean "any edition that is still <i>book 1</i>, from 1.4.0 upward".</p>`,
    explain: `<p><b>🟢 The plain idea.</b> <b>npm</b> ("node package manager") comes installed with Node. It does three jobs: (1) <b>downloads packages</b> other people published, (2) <b>records</b> what your project needs in <code>package.json</code>, (3) <b>runs scripts</b> like <code>npm test</code>. The everyday commands:</p>
${H.table(['Command', 'What it does'], [
  ['<code>npm init -y</code>', 'create a <code>package.json</code> with defaults'],
  ['<code>npm install dayjs</code> (or <code>npm i</code>)', 'download it into <code>node_modules</code>, add to <code>dependencies</code>, update the lockfile'],
  ['<code>npm i -D vitest</code>', 'a tool only needed while developing → <code>devDependencies</code>'],
  ['<code>npm install</code>', 'install everything listed (may update the lockfile within the ranges)'],
  ['<code>npm ci</code>', 'clean, exact install from the lockfile — use in CI and Docker'],
  ['<code>npm run build</code>', 'run the <code>build</code> script (also runs <code>prebuild</code>/<code>postbuild</code> if defined)'],
  ['<code>npm test</code>, <code>npm start</code>', 'shortcuts for <code>npm run test</code> / <code>npm run start</code>'],
  ['<code>npx create-vite</code>', 'run a package\'s command without installing it globally'],
  ['<code>npm outdated</code>, <code>npm audit</code>', 'show newer versions / known vulnerabilities']
])}
<p><b>🔵 Semantic versioning (semver).</b> A version is <code>MAJOR.MINOR.PATCH</code>, e.g. <code>4.17.21</code>. <b>PATCH</b> = bug fix, <b>MINOR</b> = new feature that does not break you, <b>MAJOR</b> = breaking change. In <code>package.json</code> you write a <b>range</b>:</p>
${H.table(['Range', 'Means', 'Example matches', 'Does not match'], [
  ['<code>^1.4.2</code> (npm default)', '&gt;=1.4.2 &lt;2.0.0', '1.4.3, 1.9.0', '2.0.0, 1.4.1'],
  ['<code>~1.4.2</code>', '&gt;=1.4.2 &lt;1.5.0', '1.4.9', '1.5.0'],
  ['<code>1.4.2</code>', 'exactly 1.4.2', '1.4.2', '1.4.3'],
  ['<code>^0.3.1</code>', '&gt;=0.3.1 &lt;0.4.0 (0.x is "unstable": minor = breaking)', '0.3.9', '0.4.0'],
  ['<code>^0.0.3</code>', 'exactly the 0.0.3 line: &gt;=0.0.3 &lt;0.0.4', '0.0.3', '0.0.4']
])}
<p><b>Where packages go.</b> <code>npm install</code> puts packages in <code>./node_modules</code>. When your code does <code>require('dayjs')</code> or <code>import 'dayjs'</code>, Node looks for <code>node_modules/dayjs</code> in the current folder, then the parent folder, then the grandparent… up to the file-system root. Commands of installed tools land in <code>node_modules/.bin</code>, which npm adds to <code>PATH</code> while running scripts — that's why <code>"test": "vitest"</code> works without a global install.</p>
<p><b>The lockfile.</b> Ranges are flexible, so two installs a month apart could get different versions. <code>package-lock.json</code> pins the <b>exact</b> version (and integrity hash) of every package in the whole tree. <b>Commit it.</b> Never commit <code>node_modules</code>.</p>`,
    clues: [
      '"It works on my machine but not in CI" → lockfile not committed / npm install instead of npm ci',
      '"What does ^ mean in package.json?" → caret range: compatible updates below the next major',
      '"Cannot find module \'x\'" → not installed, wrong folder, or resolution walked up and missed it',
      '"Should TypeScript/ESLint/Vitest be a dependency?" → devDependencies (not needed at runtime)',
      '"npm run vs npx" → run a script from package.json vs execute a package binary',
      '"A package was compromised / malicious postinstall" → supply chain: lockfile, audit, ignore-scripts, provenance'
    ],
    code: [{ lang: 'json', title: 'A typical package.json (valid JSON — no comments allowed in it!)', code: `{
  "name": "weather-cli",
  "version": "1.0.0",
  "description": "Prints today's weather",
  "type": "module",
  "main": "./src/index.js",
  "bin": { "weather": "./src/cli.js" },
  "scripts": {
    "start": "node src/cli.js",
    "dev": "node --watch src/cli.js",
    "pretest": "npm run lint",
    "test": "vitest run",
    "lint": "eslint ."
  },
  "dependencies": {
    "dayjs": "^1.11.13"
  },
  "devDependencies": {
    "eslint": "^9.0.0",
    "vitest": "^3.0.0"
  },
  "engines": { "node": ">=20" }
}` },
    { lang: 'bash', title: 'Everyday npm session', code: `mkdir weather-cli && cd weather-cli
npm init -y                 # creates package.json
npm install dayjs           # -> dependencies, node_modules/, package-lock.json
npm install -D vitest       # -> devDependencies
npm run test                # runs "pretest" first, then "test"
npx vitest --version        # run the local binary from node_modules/.bin
npm ci                      # in CI: delete node_modules, install EXACTLY the lockfile
npm ci --omit=dev           # production image: skip devDependencies
npm outdated                # what could be upgraded?
npm audit                   # known vulnerabilities in the tree
npm install --ignore-scripts  # do not run install scripts from dependencies` },
    { lang: 'js', run: true, title: 'Compare semver versions (runnable)', code: R`function parse(v) { return v.split('.').map(Number); }      // '1.10.0' -> [1, 10, 0]

function compare(a, b) {
  var x = parse(a), y = parse(b);
  for (var i = 0; i < 3; i++) {
    if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;      // first differing part decides
  }
  return 0;
}

var versions = ['1.10.0', '1.2.0', '2.0.0', '1.9.3', '1.2.10'];
console.log(versions.slice().sort());                       // WRONG: string sort puts 1.10.0 before 1.2.0
console.log(versions.slice().sort(compare));                // RIGHT: numeric part by part
console.log(compare('1.2.10', '1.2.9'));                    // 1 (10 > 9 as numbers)` },
    { lang: 'js', title: 'Ask Node how it resolves a package (syntax-checked, Node only)', code: R`// CommonJS file
console.log(require.resolve.paths('dayjs'));   // every node_modules folder Node will try, nearest first
try {
  console.log(require.resolve('dayjs'));       // the exact file Node would load
} catch (e) {
  console.log('Not installed:', e.code);       // MODULE_NOT_FOUND
}
console.log(require.resolve('fs'));            // 'fs' -- core modules win, no search` }],
    viz: [{
      title: 'Semver range checker: which versions does a range accept?',
      input: '^1.4.2 | 1.4.1, 1.4.2, 1.4.9, 1.10.0, 2.0.0, 1.5.0',
      inputLabel: 'range | versions (e.g. ~1.4.2 | 1.4.3, 1.5.0)',
      gen: function (input) {
        var s = String(input || '');
        if (s.indexOf('|') < 0) throw new Error('Format: range | v1, v2, v3   e.g. ^0.3.1 | 0.3.5, 0.4.0');
        var parts = s.split('|'), rangeStr = parts[0].trim();
        var rng = parseRange(rangeStr);
        var list = splitList(parts[1], 10, 'List versions like 1.2.3 after the |');
        var vers = list.map(parseVer);
        var rows = [], frames = [], best = null;
        frames.push({ narr: 'Range <b>' + H.esc(rangeStr) + '</b> → ' + H.esc(rng.desc) + '. It means <b>&gt;= ' + vs(rng.lo) + '</b> and <b>&lt; ' + vs(rng.hi) + '</b>.', parts: [
          { type: 'vars', label: 'Expanded range', vals: { lower_inclusive: vs(rng.lo), upper_exclusive: vs(rng.hi) } },
          { type: 'text', label: 'Rule', html: 'Compare MAJOR, then MINOR, then PATCH — as <b>numbers</b>, not text (so 1.10.0 &gt; 1.9.0).' }
        ] });
        vers.forEach(function (v, i) {
          var geLo = cmpVer(v, rng.lo) >= 0, ltHi = rng.hi === null || cmpVer(v, rng.hi) < 0, ok = geLo && ltHi;
          if (ok && (!best || cmpVer(v, best) > 0)) best = v;
          rows.push([vs(v), geLo ? 'yes' : 'no', ltHi ? 'yes' : 'no', ok ? 'MATCH' : 'reject']);
          var hl = {}; hl[rows.length - 1] = ok ? 'ok' : 'bad';
          var reason = !geLo ? vs(v) + ' is <b>older</b> than ' + vs(rng.lo) : (!ltHi ? vs(v) + ' reaches the upper bound ' + vs(rng.hi) + ' (would be a breaking update)' : vs(v) + ' sits inside the range');
          frames.push({ narr: 'Check <b>' + vs(v) + '</b>: ' + reason + ' → ' + (ok ? '<span class="c-g">accepted</span>' : '<span class="c-r">rejected</span>') + '.', parts: [
            { type: 'array', label: 'version parts [major, minor, patch]', values: v, hl: { 0: ok ? 'ok' : 'bad', 1: ok ? 'ok' : 'bad', 2: ok ? 'ok' : 'bad' } },
            { type: 'table', label: 'Results', columns: ['version', '>= lower?', '< upper?', 'verdict'], rows: rows.slice(), hl: hl }
          ] });
        });
        frames.push({ narr: best ? '<code>npm install</code> picks the <b>highest</b> matching version: <span class="c-g">' + vs(best) + '</span>, and writes it into package-lock.json so everyone gets the same one.' : '<span class="c-r">No version matches</span> → npm fails with ETARGET (no matching version).', parts: [
          { type: 'table', label: 'Results', columns: ['version', '>= lower?', '< upper?', 'verdict'], rows: rows.slice() },
          { type: 'vars', label: 'Chosen', vals: { range: rangeStr, installed: best ? vs(best) : 'none' }, hl: { installed: best ? 'ok' : 'bad' } }
        ] });
        return pad4(frames);
      }
    }, {
      title: 'How Node finds a package: walking up node_modules folders',
      input: '/home/me/app/src/lib/util.js | dayjs | /home/me/app',
      inputLabel: 'file | package | folders that have it in node_modules',
      gen: function (input) {
        var p = String(input || '').split('|').map(function (x) { return x.trim(); });
        if (p.length < 2 || p[0].charAt(0) !== '/') throw new Error('Format: /abs/path/file.js | package | /folder1, /folder2');
        var file = p[0], pkg = p[1], have = (p[2] || '').split(/[,\s]+/).filter(Boolean).map(function (d) { return d.replace(/\/+$/, '') || '/'; });
        var CORE = ['fs', 'path', 'http', 'os', 'events', 'crypto', 'url', 'util', 'stream', 'child_process'];
        var frames = [];
        var dirs = file.split('/').filter(Boolean); dirs.pop();
        if (dirs.length > 9) throw new Error('Use a shorter path (max 9 folders)');
        var bare = pkg.replace(/^node:/, '');
        if (pkg.indexOf('node:') === 0 || CORE.indexOf(bare) >= 0) {
          frames.push({ narr: '<b>' + H.esc(pkg) + '</b> is a <span class="c-g">core module</span>. Node returns its built-in copy immediately — no folder search. (Tip: write <code>node:' + H.esc(bare) + '</code> to make that obvious.)', parts: [{ type: 'vars', vals: { request: pkg, result: 'built-in ' + bare }, hl: { result: 'ok' } }] });
          return pad4(frames, 'Core modules always win. Try a non-core package name like dayjs.');
        }
        if (/^\.{1,2}\//.test(pkg)) {
          frames.push({ narr: '<b>' + H.esc(pkg) + '</b> starts with ./ or ../ → it is a <b>relative path</b>, resolved from the file\'s folder. node_modules is not searched.', parts: [{ type: 'vars', vals: { request: pkg, from: '/' + dirs.join('/') } }] });
          return pad4(frames, 'Relative imports never search node_modules. Try a bare name like dayjs.');
        }
        var cands = [];
        for (var i = dirs.length; i >= 0; i--) {
          var base = '/' + dirs.slice(0, i).join('/');
          if (dirs[i - 1] === 'node_modules') continue;   // Node skips .../node_modules/node_modules
          cands.push(base === '/' ? '/node_modules/' + pkg : base + '/node_modules/' + pkg);
        }
        frames.push({ narr: 'Bare name <b>' + H.esc(pkg) + '</b> (not core, not relative). Node builds a list of candidate folders from <b>' + H.esc('/' + dirs.join('/')) + '</b> up to the root.', parts: [
          { type: 'list', label: 'Candidates (nearest first)', values: cands }
        ] });
        var found = -1;
        for (var k = 0; k < cands.length; k++) {
          var owner = cands[k].replace(/\/node_modules\/.*$/, '') || '/';
          var hit = have.indexOf(owner) >= 0;
          var hl = {}; for (var j = 0; j < k; j++) hl[j] = 'bad'; hl[k] = hit ? 'ok' : 'cur';
          frames.push({ narr: 'Try <b>' + H.esc(cands[k]) + '</b> … ' + (hit ? '<span class="c-g">exists!</span> Node reads its package.json (<code>exports</code>, else <code>main</code>, else index.js) and stops searching.' : '<span class="c-r">not there</span>, go up one folder.'), parts: [
            { type: 'list', label: 'Candidates (nearest first)', values: cands, hl: hl, ptr: (function () { var o = {}; o[k] = 'try'; return o; })() }
          ] });
          if (hit) { found = k; break; }
        }
        if (found < 0) frames.push({ narr: '<span class="c-r">Error: Cannot find module \'' + H.esc(pkg) + '\'</span> (code MODULE_NOT_FOUND). Run <code>npm install ' + H.esc(pkg) + '</code> in the project folder.', parts: [{ type: 'list', label: 'All candidates failed', values: cands, hl: (function () { var o = {}; cands.forEach(function (c, i) { o[i] = 'bad'; }); return o; })() }] });
        else frames.push({ narr: 'Resolved. Because the search walks <b>up</b>, a package installed in a parent folder is visible to every subfolder — the trick behind monorepo "hoisting" (and behind phantom-dependency bugs).', parts: [{ type: 'vars', vals: { request: pkg, resolved: cands[found] }, hl: { resolved: 'ok' } }] });
        return pad4(frames);
      }
    }],
    examples: [
      { title: 'dependencies vs devDependencies', html: `<p>Your web server imports <code>express</code> at runtime → <b>dependencies</b>. You run <code>vitest</code>, <code>eslint</code>, <code>typescript</code> only while developing or building → <b>devDependencies</b>. In a production Docker image you run <code>npm ci --omit=dev</code>, so mistakes in this split either bloat the image or crash production with "Cannot find module".</p>` },
      { title: 'Why ^0.x is stricter', html: `<p>Before 1.0.0 a project is "still finding its shape", so semver treats the <b>minor</b> number as breaking. <code>^0.3.1</code> accepts 0.3.9 but not 0.4.0. <code>^0.0.3</code> accepts only 0.0.3. Teams are often surprised that <code>npm update</code> did not move them from 0.3 to 0.4.</p>` },
      { title: 'npm install vs npm ci', html: `<p><code>npm install</code> reads package.json, may resolve newer versions inside the ranges, and rewrites the lockfile. <code>npm ci</code> requires a lockfile, <b>deletes</b> node_modules, installs <b>exactly</b> what the lockfile says, and fails if package.json and the lockfile disagree. Use <code>npm ci</code> in CI pipelines for reproducible builds.</p>` },
      { title: 'Scripts get node_modules/.bin on PATH', html: `<p>With <code>"lint": "eslint ."</code> you can run <code>npm run lint</code> without installing ESLint globally — npm adds <code>./node_modules/.bin</code> to <code>PATH</code> for scripts. Outside scripts, use <code>npx eslint .</code>. Extra args go after <code>--</code>: <code>npm test -- --watch</code>.</p>` }
    ],
    deepDive: `<p><b>🟣 The tree on disk.</b> npm (v3+) <b>hoists</b>: it flattens packages to the top <code>node_modules</code> when versions agree and nests a different version only where there's a conflict (e.g. <code>node_modules/a/node_modules/lodash@3</code>). Flattening causes <b>phantom dependencies</b>: your code can <code>require</code> a package you never declared because some dependency pulled it in — until it disappears in an update. <b>pnpm</b> avoids this with a content-addressable store plus symlinks (strict, disk-efficient); <b>Yarn</b> offers Plug'n'Play; <b>Bun</b> has a very fast installer. All read <code>package.json</code>.</p>
<p><b>Peer dependencies.</b> A React component library declares <code>"peerDependencies": { "react": "^18 || ^19" }</code>: "I need React, but use the app's copy" — avoiding two Reacts in one bundle. npm 7+ installs peers automatically and errors on conflicts (<code>--legacy-peer-deps</code> is an escape hatch, not a fix).</p>
<p><b>The <code>exports</code> field</b> is the modern entry-point map: <code>"exports": { ".": { "import": "./dist/index.mjs", "require": "./dist/index.cjs" }, "./utils": "./dist/utils.js" }</code>. It also <b>hides</b> internal files — deep imports not listed throw <code>ERR_PACKAGE_PATH_NOT_EXPORTED</code>.</p>
<p><b>Supply-chain security.</b> Installing runs <b>lifecycle scripts</b> (<code>preinstall</code>, <code>postinstall</code>) from any package in the tree with your user's permissions. Recent years saw high-profile incidents: typosquats, hijacked maintainer accounts publishing malware into very popular packages, and self-spreading worms that stole tokens. Defences: commit the lockfile and use <code>npm ci</code>; review new dependencies; <code>npm audit</code>; <code>--ignore-scripts</code> (pnpm blocks dependency build scripts by default in recent versions); 2FA and <b>trusted publishing</b>/<b>provenance</b> attestations for your own packages; a short "minimum release age" policy before adopting brand-new versions.</p>
<p><b>Semver is a promise, not a guarantee.</b> A "patch" can still break you. Lockfiles plus automated update PRs (Dependabot, Renovate) with tests are the professional answer.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants suggest packages constantly, and sometimes the package <b>does not exist</b> (a hallucinated name). Attackers register those names — "slopsquatting" — so a blindly copied <code>npm install</code> can install malware. AI coding agents may also run <code>npm install</code> and scripts on your machine autonomously.</p>
<p><b>Use AI as a partner:</b> ask <code>Do we need a dependency for this, or is it 10 lines with built-ins?</code> (often: <code>structuredClone</code>, <code>fetch</code>, <code>Intl</code>, <code>crypto.randomUUID</code> replace old packages). Ask it to explain a confusing <code>npm ERR! ERESOLVE</code> peer-dependency error.</p>
<p><b>Where AI goes wrong:</b> outdated versions and APIs (suggesting major versions from its training data), wrong dependency type (TypeScript in dependencies), <code>--force</code>/<code>--legacy-peer-deps</code> as a "fix", and invented packages.</p>
<p><b>What you must still own:</b> verify every package on npmjs.com (downloads, maintainers, repo, last publish), read semver ranges, keep lockfiles reviewed, and sandbox agents that can install packages. Many AI tool integrations (MCP servers) are launched with <code>npx some-package</code> — that is running remote code; pin versions.</p>`,
    problems: [{
      title: 'Implement semver satisfies() for ^, ~ and exact',
      level: 'Medium', tags: ['semver', 'parsing', 'npm'], companies: ['GitHub', 'Microsoft', 'Vercel'],
      statement: `<p>Write <code>satisfies(version, range)</code> returning <code>true</code>/<code>false</code>, where <code>version</code> is <code>"MAJOR.MINOR.PATCH"</code> and <code>range</code> is one of: an exact version <code>"1.2.3"</code>, a tilde range <code>"~1.2.3"</code>, or a caret range <code>"^1.2.3"</code> (with npm's special rules for <code>^0.y.z</code> and <code>^0.0.z</code>).</p>`,
      constraints: `All numbers are non-negative integers ≤ 10<sup>6</sup>. No pre-release tags. Compare numerically.`,
      example: `<p><code>satisfies('1.9.0', '^1.4.2')</code> → ${H.c('g', 'true')}; <code>satisfies('2.0.0', '^1.4.2')</code> → ${H.c('r', 'false')}; <code>satisfies('0.4.0', '^0.3.1')</code> → ${H.c('r', 'false')} (0.x: minor is breaking); <code>satisfies('1.4.9', '~1.4.2')</code> → ${H.c('g', 'true')}.</p>`,
      brute: { why: `<p>String comparison (<code>'1.10.0' &gt; '1.9.0'</code> is <b>false</b> because <code>'1' &lt; '9'</code> character-wise) and checking only "same major" for caret — which gets every <code>^0.x</code> case wrong.</p>`, code: R`function satisfiesBrute(version, range) {
  var base = range.replace(/^[\^~]/, '');
  // compares as STRINGS and ignores the 0.x rule
  return version.split('.')[0] === base.split('.')[0] && version >= base;
}
console.log(satisfiesBrute('1.10.0', '^1.9.0'));   // false -- WRONG ('1.10.0' < '1.9.0' as text)
console.log(satisfiesBrute('0.4.0', '^0.3.1'));    // true  -- WRONG (0.x minor bump is breaking)` },
      mcq: { q: 'What upper bound does <code>^0.2.5</code> have?', options: ['&lt;1.0.0', '&lt;0.3.0', '&lt;0.2.6', 'none'], answer: 1, explain: 'Caret allows changes that do not modify the left-most non-zero part. Here that is the minor 2, so the bound is &lt;0.3.0.' },
      hints: [`<p><b>Hint 1:</b> turn every range into an interval <code>[lower, upper)</code>; then <code>satisfies</code> is just two comparisons.</p>`, `<p><b>Hint 2:</b> compare versions as arrays of numbers, part by part: the first difference decides.</p>`, `<p><b>Hint 3:</b> caret upper bound = bump the <b>left-most non-zero</b> part (major if &gt;0, else minor if &gt;0, else patch). Tilde = bump minor. Exact = lower equals upper (inclusive), or bump patch.</p>`],
      solution: {
        approach: `<p>Parse to number triples, convert the range to a half-open interval, compare lexicographically on numbers.</p>`,
        code: { lang: 'js', run: true, code: R`function parse(v) {
  var p = v.split('.').map(Number);
  if (p.length !== 3 || p.some(isNaN)) throw new Error('bad version ' + v);
  return p;
}
function cmp(a, b) {
  for (var i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  return 0;
}
function toInterval(range) {
  var op = range[0] === '^' || range[0] === '~' ? range[0] : '';
  var lo = parse(op ? range.slice(1) : range);
  var hi;
  if (op === '^') {
    if (lo[0] > 0) hi = [lo[0] + 1, 0, 0];          // ^1.4.2 -> <2.0.0
    else if (lo[1] > 0) hi = [0, lo[1] + 1, 0];     // ^0.3.1 -> <0.4.0
    else hi = [0, 0, lo[2] + 1];                    // ^0.0.3 -> <0.0.4
  } else if (op === '~') {
    hi = [lo[0], lo[1] + 1, 0];                     // ~1.4.2 -> <1.5.0
  } else {
    hi = [lo[0], lo[1], lo[2] + 1];                 // exact  -> <1.4.3
  }
  return { lo: lo, hi: hi };
}
function satisfies(version, range) {
  var v = parse(version), r = toInterval(range);
  return cmp(v, r.lo) >= 0 && cmp(v, r.hi) < 0;
}

[['1.9.0', '^1.4.2'], ['2.0.0', '^1.4.2'], ['1.10.0', '^1.9.0'], ['0.4.0', '^0.3.1'],
 ['0.0.4', '^0.0.3'], ['1.4.9', '~1.4.2'], ['1.5.0', '~1.4.2'], ['1.4.2', '1.4.2']]
  .forEach(function (t) { console.log(t[0], t[1], satisfies(t[0], t[1])); });` },
        dry: { head: ['version', 'range', 'interval', 'v ≥ lo?', 'v &lt; hi?', 'result'], rows: [
          ['1.9.0', '^1.4.2', '[1.4.2, 2.0.0)', 'yes', 'yes', '<span class="c-g">true</span>'],
          ['1.10.0', '^1.9.0', '[1.9.0, 2.0.0)', 'yes (10 &gt; 9)', 'yes', '<span class="c-g">true</span>'],
          ['0.4.0', '^0.3.1', '[0.3.1, 0.4.0)', 'yes', 'no', '<span class="c-r">false</span>'],
          ['1.5.0', '~1.4.2', '[1.4.2, 1.5.0)', 'yes', 'no', '<span class="c-r">false</span>']
        ] },
        complexity: `<p>O(1) per call (fixed 3 parts). For N versions, O(N) to filter, O(N log N) to also pick the max by sorting (or O(N) with a running max).</p>`,
        followUps: ['Add <code>1.x</code>, <code>&gt;=</code>, <code>&lt;</code> and <code>||</code> unions.', 'How do pre-release tags like <code>2.0.0-beta.1</code> sort and match?', 'Why does the lockfile make ranges matter less day to day?']
      }
    }]
  });
  /* =====================================================================
     TOPIC 6 — Debugging with DevTools (browser + Node)
     ===================================================================== */
  topics.push({
    title: 'Debugging with DevTools: Console, Breakpoints and node --inspect',
    analogy: `<p>Debugging with only <code>console.log</code> is like finding a leak by <b>putting buckets everywhere</b> and checking which ones fill up. A <b>debugger</b> is like having a <b>pause button for time</b>: you freeze the house at the exact moment water appears, walk around, open every pipe (variable), and see which room called which (the call stack) — then press play one step at a time. DevTools is that pause button, and it works for both the browser and Node.</p>`,
    explain: `<p><b>🟢 The plain idea.</b> Every major browser ships <b>DevTools</b> (open with <kbd>F12</kbd> or <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd> / <kbd>Cmd</kbd>+<kbd>Opt</kbd>+<kbd>I</kbd>). The panels you will use most:</p>
${H.table(['Panel', 'Use it to'], [
  ['<b>Console</b>', 'see logs and errors, run JS live against the page (<code>$0</code> = selected element)'],
  ['<b>Sources</b> (Debugger in Firefox)', 'set breakpoints, step through code, inspect variables and the call stack'],
  ['<b>Network</b>', 'see every request: URL, status, headers, timing, response body, CORS errors'],
  ['<b>Elements</b>', 'inspect and live-edit the DOM and CSS'],
  ['<b>Performance</b> / <b>Memory</b>', 'record what is slow; find memory leaks with heap snapshots'],
  ['<b>Application</b>', 'localStorage, cookies, IndexedDB, Service Workers, cache']
])}
<p><b>Level 1 — the console, used well.</b> Beyond <code>console.log</code>: <code>console.table(rows)</code> for arrays of objects, <code>console.error</code>/<code>warn</code> (red/yellow, filterable), <code>console.group</code>/<code>groupEnd</code> for nesting, <code>console.time</code>/<code>timeEnd</code> for quick timing, <code>console.count</code>, <code>console.assert(cond, msg)</code>, <code>console.trace()</code> to print the current call stack, <code>console.dir(obj)</code> for the object view.</p>
<p><b>🔵 Level 2 — breakpoints.</b> Click a line number in Sources (or write <code>debugger;</code> in code). When execution reaches it, the whole JS thread <b>pauses</b>. Then:</p>
${H.table(['Button', 'Key (Chrome)', 'Meaning'], [
  ['Resume', '<kbd>F8</kbd>', 'run until the next breakpoint'],
  ['Step over', '<kbd>F10</kbd>', 'run this line; do not go inside function calls'],
  ['Step into', '<kbd>F11</kbd>', 'go inside the function called on this line'],
  ['Step out', '<kbd>Shift</kbd>+<kbd>F11</kbd>', 'finish the current function, pause in the caller']
])}
<p>While paused, the right side shows <b>Scope</b> (local, closure, global variables), <b>Call Stack</b> (who called whom), and <b>Watch</b> (expressions you want re-evaluated at every step). Hover any variable to see its value. Special breakpoints: <b>conditional</b> (pause only if <code>i === 99</code>), <b>logpoints</b> (print without editing code), <b>pause on exceptions</b>, DOM-change, event-listener and fetch/XHR breakpoints.</p>
<p><b>Node uses the same tools.</b> Run <code>node --inspect app.js</code> (or <code>--inspect-brk</code> to pause on the first line), open <code>chrome://inspect</code> in Chrome, and click <i>inspect</i>: you get the same Sources/Console/Memory panels for your server. VS Code's <b>JavaScript Debug Terminal</b> does this automatically for any <code>node</code> or <code>npm</code> command you start in it.</p>`,
    clues: [
      '"How would you debug this?" → reproduce, breakpoint/logpoint, inspect scope + call stack, fix, add a test',
      '"Cannot read properties of undefined (reading \'x\')" → pause on exceptions, look one frame up the call stack',
      '"The API call fails only in the browser" → Network panel: status, CORS error, request/response headers',
      '"Debug a Node server / a test" → node --inspect(-brk) + chrome://inspect or VS Code debug terminal',
      '"The bug only happens on the 1000th iteration" → conditional breakpoint, not 1000 logs',
      '"Stack trace points to minified code" → source maps'
    ],
    code: [{ lang: 'js', run: true, title: 'Console power tools (runnable — works in Node and browsers)', code: R`var orders = [
  { id: 1, item: 'tea', qty: 2, price: 3 },
  { id: 2, item: 'cake', qty: 1, price: 5 },
  { id: 3, item: 'tea', qty: 4, price: 3 }
];

console.table(orders);                            // a real table, sortable in DevTools

console.group('Checkout');                        // indent related logs
orders.forEach(function (o) {
  console.count(o.item);                          // tea: 1, cake: 1, tea: 2
  console.assert(o.qty > 0, 'qty must be positive', o);   // silent when true
});
console.groupEnd();

console.time('total');                            // quick-and-dirty timing
var total = orders.reduce(function (s, o) { return s + o.qty * o.price; }, 0);
console.timeEnd('total');                         // total: 0.05ms (varies)

console.log('total =', total);                    // total = 23
console.dir({ nested: { deep: { deeper: { deepest: 1 } } } }, { depth: null });
console.warn('warnings go to stderr in Node, yellow in DevTools');` },
    { lang: 'js', title: 'The debugger statement and a conditional breakpoint stand-in', code: R`function processItems(items) {
  for (let i = 0; i < items.length; i++) {
    // Pauses here ONLY if DevTools (or a Node inspector) is attached; otherwise a no-op.
    if (items[i] == null) debugger;          // like a conditional breakpoint written in code
    items[i].done = true;
  }
}
// Remove 'debugger' before committing -- linters flag it (ESLint: no-debugger).
processItems([{ id: 1 }, { id: 2 }]);` },
    { lang: 'bash', title: 'Debugging Node with the same DevTools', code: `node --inspect server.js          # starts; DevTools can attach any time
node --inspect-brk server.js      # pauses before the first line (good for startup bugs)
node --inspect-brk --test         # debug Node's built-in test runner
# then open chrome://inspect in Chrome -> "Open dedicated DevTools for Node"

node --watch server.js            # auto-restart on file save (no nodemon needed)
node --enable-source-maps dist/server.js   # stack traces point to your TypeScript lines
NODE_OPTIONS=--inspect npm run dev         # attach to whatever npm starts` }],
    viz: {
      title: 'A debugger session: breakpoint, step, watch, pause on exception',
      input: '5 7',
      inputLabel: 'Prices in the cart (space separated, 1–5 numbers)',
      gen: function (input) {
        var prices = String(input || '').trim().split(/[\s,]+/).filter(Boolean).map(Number);
        if (!prices.length || prices.some(isNaN)) throw new Error('Enter prices like: 5 7 3');
        if (prices.length > 5) throw new Error('Use at most 5 prices');
        var code = 'function total(cart) {\n  let sum = 0;\n  for (let i = 0; i <= cart.length; i++) {\n    sum += cart[i].price;\n  }\n  return sum;\n}\nconst cart = [' + prices.map(function (p) { return '{ price: ' + p + ' }'; }).join(', ') + '];\nconsole.log(total(cart));';
        var frames = [], n = prices.length, sum = 0;
        function fr(line, narr, stack, scope, watch, cls, extra) {
          var h = {}; h[line] = cls || 'cur';
          var parts = [
            { type: 'code', label: 'Sources panel (paused)', lang: 'js', code: code, hl: h },
            { type: 'stack', label: 'Call Stack (top = current)', items: stack, hl: (function () { var o = {}; o[stack.length - 1] = 'cur'; return o; })() },
            { type: 'vars', label: 'Scope → Local', vals: scope.vals, hl: scope.hl || {} },
            { type: 'vars', label: 'Watch', vals: watch }
          ];
          if (extra) parts.push(extra);
          frames.push({ narr: narr, parts: parts });
        }
        var cartStr = '[' + prices.map(function (p) { return '{…}'; }).join(', ') + '] (length ' + n + ')';
        fr(9, 'Bug report: "total() crashes". We set a <b>breakpoint on line 9</b> and reload. Execution pauses <i>before</i> the line runs. Call stack: just the top-level script.', ['(anonymous) script'], { vals: { cart: cartStr } }, { 'cart.length': n });
        fr(2, '<b>Step into</b> (F11) enters <code>total</code>. A new frame appears on the <b>call stack</b>; <b>Scope</b> shows the parameter <code>cart</code>.', ['(anonymous) script', 'total'], { vals: { cart: cartStr, sum: 'TDZ (not yet initialised)' } }, { 'cart.length': n, 'i <= cart.length': 'i is not defined' });
        fr(3, '<b>Step over</b> (F10): <code>sum = 0</code>. We add watch expressions <code>i</code>, <code>cart[i]</code> and <code>i &lt;= cart.length</code> to follow the loop.', ['(anonymous) script', 'total'], { vals: { cart: cartStr, sum: 0, i: 0 }, hl: { sum: 'ok' } }, { 'cart.length': n, i: 0, 'cart[i]': '{price: ' + prices[0] + '}', 'i <= cart.length': true });
        for (var i = 0; i < n; i++) {
          sum += prices[i];
          fr(4, 'Step over line 4 with <code>i = ' + i + '</code>: <code>cart[' + i + '].price</code> is ' + prices[i] + ', so <code>sum</code> becomes <b>' + sum + '</b>.', ['(anonymous) script', 'total'], { vals: { cart: cartStr, sum: sum, i: i }, hl: { sum: 'ok', i: 'cur' } }, { 'cart.length': n, i: i, 'cart[i]': '{price: ' + prices[i] + '}', 'i <= cart.length': true });
        }
        fr(3, 'Back at the loop test with <code>i = ' + n + '</code>. The watch shows <b>i &lt;= cart.length</b> is still <span class="c-r">true</span> — but index ' + n + ' does not exist! Suspicious…', ['(anonymous) script', 'total'], { vals: { cart: cartStr, sum: sum, i: n }, hl: { i: 'bad' } }, { 'cart.length': n, i: n, 'cart[i]': 'undefined', 'i <= cart.length': true }, 'bad');
        fr(4, '<b>Pause on exceptions</b> stops here: <span class="c-r">TypeError: Cannot read properties of undefined (reading \'price\')</span>. <code>cart[' + n + ']</code> is <code>undefined</code>. The watch panel already told us why.', ['(anonymous) script', 'total'], { vals: { cart: cartStr, sum: sum, i: n }, hl: { i: 'bad' } }, { 'cart.length': n, i: n, 'cart[i]': 'undefined', 'i <= cart.length': true }, 'bad', { type: 'text', label: 'Console', html: '<span class="c-r">Uncaught TypeError: Cannot read properties of undefined (reading \'price\')<br>    at total (app.js:4)<br>    at app.js:9</span>' });
        frames.push({ narr: 'Root cause: an <b>off-by-one</b> loop condition. Fix line 3 to <code>i &lt; cart.length</code> (or use <code>for…of</code> / <code>reduce</code>). Re-run: prints <b>' + sum + '</b>. Finally, add a test so it never returns.', parts: [
          { type: 'code', label: 'Fixed', lang: 'js', code: 'function total(cart) {\n  let sum = 0;\n  for (let i = 0; i < cart.length; i++) {\n    sum += cart[i].price;\n  }\n  return sum;\n}', hl: { 3: 'ok' } },
          { type: 'vars', label: 'Result', vals: { 'total(cart)': sum }, hl: { 'total(cart)': 'ok' } },
          { type: 'text', label: 'The debugging loop', html: '1) reproduce → 2) pause near the symptom → 3) read scope + call stack → 4) form a hypothesis → 5) fix → 6) add a test' }
        ] });
        return frames;
      }
    },
    examples: [
      { title: 'console.log shows a LIVE object in Chrome', html: `<p><code>const user = { name: 'Asha' }; console.log(user); user.name = 'Ben';</code> — in Chrome, when you <b>expand</b> the logged object later, it shows <b>Ben</b>: the console keeps a reference and reads it on expand (a small "i" icon warns "value evaluated upon first expanding"). To freeze a snapshot, log <code>JSON.stringify(user)</code> or <code>structuredClone(user)</code>. Node prints text immediately, so it shows <b>Asha</b>.</p>` },
      { title: 'Network panel beats guessing', html: `<p>A login form "does nothing". The Network panel shows the <code>POST /api/login</code> returned <b>401</b> with body <code>{"error":"bad csrf token"}</code> — the bug is in headers, not in your click handler. If the request is red with "CORS error", the server must send <code>Access-Control-Allow-Origin</code>; no frontend code change will fix it.</p>` },
      { title: 'Reading a stack trace from bottom to top', html: `<p>The top line is where it crashed; lines below are the callers. Find the <b>first frame in your own code</b> (skip <code>node_modules</code> and <code>node:internal</code> frames). Async functions show <code>at async …</code> frames because V8 records "zero-cost async stack traces".</p>`, code: { lang: 'js', run: true, code: R`function a() { b(); }
function b() { c(); }
function c() { throw new Error('boom'); }
try { a(); } catch (e) {
  // Print just the first few stack lines: c is on top, then b, then a
  console.log(e.stack.split('\n').slice(0, 4).join('\n'));
}` } },
      { title: 'Conditional breakpoint vs 1000 logs', html: `<p>A bug appears only for order id 7731 in a list of 50,000. Right-click the line number → <b>Add conditional breakpoint</b> → <code>order.id === 7731</code>. DevTools pauses exactly once, with full scope. A <b>logpoint</b> (<code>'order', order.id, order.total</code>) prints without editing or redeploying code.</p>` }
    ],
    deepDive: `<p><b>🟣 How the debugger talks to the engine.</b> DevTools speaks the <b>Chrome DevTools Protocol (CDP)</b> — JSON messages over a WebSocket — to V8's inspector. <code>node --inspect</code> opens such a WebSocket on port 9229 (bound to 127.0.0.1 by default; <b>never</b> expose it publicly: anyone connected can run arbitrary code). Firefox uses its own remote protocol, and the cross-browser <b>WebDriver BiDi</b> standard is replacing older automation protocols. Puppeteer and Playwright drive browsers over these same protocols.</p>
<p><b>Source maps.</b> Production code is bundled and minified, so <code>a.js:1:48213</code> is useless. A <code>.map</code> file maps generated positions back to original files/lines (TypeScript, JSX). Browsers load them when DevTools is open; Node needs <code>--enable-source-maps</code>. Error-monitoring services (Sentry etc.) upload maps privately so users don't download them.</p>
<p><b>Pausing really pauses.</b> When stopped at a breakpoint, the page's main thread is frozen: no rendering, no timers, no event handlers. In Node, the whole event loop stops — health checks time out, so don't breakpoint a production server. Use logging, tracing and heap snapshots there instead.</p>
<p><b>Advanced tools.</b> Performance panel flame charts (long tasks over 50 ms block input), Memory panel heap snapshots and allocation timelines (detached DOM nodes, growing arrays), <code>--cpu-prof</code>/<code>--heap-prof</code> in Node, <code>performance.mark</code>/<code>measure</code> for custom timings, "Local overrides" to edit production files locally, and <b>blackboxing</b> (ignore list) so stepping skips library code. Console utilities: <code>$0</code> (selected element), <code>$_</code> (last result), <code>copy(obj)</code>, <code>monitorEvents(el)</code>, <code>queryObjects(Constructor)</code>.</p>`,
    aiEra: `<p><b>What AI changes:</b> pasting an error + stack trace into an AI is now the fastest first step, and browsers have built-in AI help (Chrome DevTools offers AI assistance that explains console errors, network requests and performance traces). Agents can even drive DevTools themselves: Chrome's DevTools MCP server lets a coding agent open a page, read console errors, inspect network calls and record performance traces.</p>
<p><b>Use AI as a partner:</b> give it the <b>evidence</b> you collected — the exact error, the top stack frames in your code, the values in Scope at the pause, the failing request from the Network panel. <code>Here is the paused scope and call stack; what hypothesis explains cart[i] being undefined?</code> gets far better answers than "my code doesn't work".</p>
<p><b>Where AI goes wrong:</b> it guesses from code alone and often "fixes" the symptom (adding <code>?.</code> everywhere) instead of the root cause (the off-by-one). It cannot see runtime state unless you or a tool provide it.</p>
<p><b>What you must still own:</b> the scientific debugging loop — reproduce, observe, hypothesise, test, fix, add a regression test. Knowing how to pause time and read a call stack is what lets you verify (or reject) the AI's theory in seconds.</p>`,
    problems: [{
      title: 'Build a Call Tracer (your own mini Call Stack panel)',
      level: 'Medium', tags: ['debugging', 'higher-order functions', 'recursion'], companies: ['Amazon', 'Atlassian', 'Stripe'],
      statement: `<p>Write <code>trace(fn, name, log)</code> that returns a wrapped function. Each call of the wrapper logs <code>"&gt; name(args)"</code> on entry and <code>"&lt; name = result"</code> on exit, indented by two spaces per current call depth (like the Call Stack panel), then returns the real result. If <code>fn</code> throws, log <code>"! name threw message"</code>, restore the depth, and re-throw. Recursive calls must go through the wrapper so they are traced too.</p>`,
      constraints: `Depth ≤ 1000. Arguments are JSON-printable. Must work with <code>this</code> (use <code>apply</code>). <code>log</code> is a function that receives one string.`,
      example: `<p>Tracing <code>fact</code> with <code>fact(2)</code> logs:</p><pre>&gt; fact(2)
  &gt; fact(1)
    &gt; fact(0)
    &lt; fact = 1
  &lt; fact = 1
&lt; fact = 2</pre><p>The indentation is the call stack depth at that moment.</p>`,
      brute: { why: `<p>Sprinkling <code>console.log</code> at the top and bottom of every function by hand: tedious, easy to forget the exit log on early <code>return</code>s or thrown errors, no indentation, and you must remove it all afterwards.</p>`, code: R`function factLogged(n) {
  console.log('enter fact', n);         // manual, no depth info
  if (n === 0) return 1;                 // forgot the exit log on this path!
  var r = n * factLogged(n - 1);
  console.log('exit fact', r);
  return r;
}
factLogged(2);` },
      mcq: { q: 'Why must the depth counter be decreased in a <code>finally</code> block?', options: ['For speed', 'So the depth is restored even when the function throws', 'Because <code>return</code> skips code', 'It does not matter'], answer: 1, explain: 'If <code>fn</code> throws and the decrement is after the call, the depth stays too high forever and every later log is mis-indented. <code>finally</code> runs on both return and throw.' },
      hints: [`<p><b>Hint 1:</b> a closure variable <code>depth</code> shared by all calls of the wrapper acts as your call-stack height.</p>`, `<p><b>Hint 2:</b> wrapper = log entry → <code>depth++</code> → <code>fn.apply(this, args)</code> → log exit → return; use try / catch / finally.</p>`, `<p><b>Hint 3:</b> for recursion, the recursive call must use the <b>wrapped</b> name: define <code>var fact = trace(function (n) { … fact(n - 1) … }, 'fact')</code>.</p>`],
      solution: {
        approach: `<p>Higher-order function + closure counter. <code>try/finally</code> guarantees the depth is restored on throw; the catch logs and re-throws so behaviour is unchanged (a good debugging tool must not alter the program).</p>`,
        code: { lang: 'js', run: true, code: R`function trace(fn, name, log) {
  var depth = 0;                                   // shared by every call: our "call stack height"
  log = log || console.log;
  return function traced() {
    var args = Array.prototype.slice.call(arguments);
    var pad = '  '.repeat(depth);
    log(pad + '> ' + name + '(' + args.map(function (a) { return JSON.stringify(a); }).join(', ') + ')');
    depth++;
    try {
      var result = fn.apply(this, args);            // keep 'this' working
      log(pad + '< ' + name + ' = ' + JSON.stringify(result));
      return result;
    } catch (e) {
      log(pad + '! ' + name + ' threw ' + e.message);
      throw e;                                      // do not swallow errors
    } finally {
      depth--;                                      // restored on return AND throw
    }
  };
}

var fact = trace(function (n) { return n === 0 ? 1 : n * fact(n - 1); }, 'fact');
console.log('result:', fact(2));

var risky = trace(function (x) { if (x < 0) throw new Error('negative'); return Math.sqrt(x); }, 'risky');
try { risky(-1); } catch (e) { console.log('caught:', e.message); }
console.log('after error, depth is back to 0:', risky(9));` },
        dry: { head: ['event', 'depth before', 'log line', 'depth after'], rows: [
          ['call fact(2)', '0', '&gt; fact(2)', '1'],
          ['call fact(1)', '1', '&nbsp;&nbsp;&gt; fact(1)', '2'],
          ['call fact(0)', '2', '&nbsp;&nbsp;&nbsp;&nbsp;&gt; fact(0)', '3'],
          ['fact(0) returns 1', '3', '&nbsp;&nbsp;&nbsp;&nbsp;&lt; fact = 1', '2'],
          ['fact(1) returns 1', '2', '&nbsp;&nbsp;&lt; fact = 1', '1'],
          ['fact(2) returns 2', '1', '&lt; fact = 2', '0']
        ] },
        complexity: `<p>O(1) extra work per call plus the cost of stringifying arguments; O(1) extra memory (the closure counter) beyond the log output.</p>`,
        followUps: ['Make it work for <code>async</code> functions (log when the promise settles).', 'Add timing per call like <code>console.time</code>.', 'How would you trace every method of an object automatically (hint: Proxy)?']
      }
    }]
  });
  /* =====================================================================
     PRACTICE — Easy
     ===================================================================== */
  practice.push({
    title: 'Which Runtime Is This? Classify Code Snippets',
    level: 'Easy', tags: ['runtime', 'regex', 'which API'], companies: ['Google', 'Atlassian', 'Zoho'],
    statement: `<p>Write <code>whichRuntime(code)</code> that looks at a snippet and returns <code>'browser'</code> (uses browser-only APIs), <code>'node'</code> (uses Node-only APIs), <code>'mixed'</code> (both — will crash in each runtime!) or <code>'portable'</code> (neither). Browser markers: <code>document.</code>, <code>window.</code>, <code>localStorage</code>, <code>alert(</code>, <code>navigator.</code>. Node markers: <code>require(</code>, <code>process.</code>, <code>__dirname</code>, <code>Buffer.</code>, <code>fs.</code>, <code>'node:</code> / <code>"node:</code>.</p>`,
    constraints: `Snippet length ≤ 10<sup>4</sup>. Markers are case-sensitive. Ignore the problem of comments/strings for this version.`,
    example: `<p><code>whichRuntime("const x = await fetch(url)")</code> → ${H.c('g', 'portable')} (fetch is web-standard)</p>
<p><code>whichRuntime("document.title = process.env.NAME")</code> → ${H.c('r', 'mixed')}</p>`,
    brute: { why: `<p>Checking with <code>includes('window')</code> matches innocent words like <code>windowSize</code> or <code>myWindow</code>, and <code>includes('fs')</code> matches <code>offset</code>. We need <b>word boundaries</b>, not substring search.</p>`, code: R`function whichRuntimeBrute(code) {
  var b = code.includes('window') || code.includes('document');
  var n = code.includes('fs') || code.includes('process');
  return b && n ? 'mixed' : b ? 'browser' : n ? 'node' : 'portable';
}
console.log(whichRuntimeBrute('const offset = windowSize * 2'));   // 'mixed' -- totally wrong` },
    mcq: { q: '<code>const id = crypto.randomUUID(); setTimeout(save, 100);</code> — which runtime?', options: ['Browser only', 'Node only', 'Portable (both)', 'Neither'], answer: 2, explain: 'Both <code>crypto.randomUUID</code> (Web Crypto) and <code>setTimeout</code> are provided by browsers and modern Node.' },
    hints: [`<p><b>Hint 1:</b> keep two lists of regular expressions, one per runtime, and test each list with <code>some()</code>.</p>`, `<p><b>Hint 2:</b> use <code>\\b</code> (word boundary) so <code>\\bwindow\\.</code> does not match <code>myWindow.</code>; escape dots and parentheses.</p>`, `<p><b>Hint 3:</b> recipe — b = browserRegexes.some(test); n = nodeRegexes.some(test); return mixed / browser / node / portable in that order.</p>`],
    solution: {
      approach: `<p>Two lists of anchored regexes with word boundaries, two boolean flags, a four-way decision. Real tools (ESLint's environment globals, bundler "platform" checks) do the same with an AST instead of regexes, which also skips comments and strings.</p>`,
      code: { lang: 'js', run: true, code: R`var BROWSER = [/\bdocument\./, /\bwindow\./, /\blocalStorage\b/, /\balert\(/, /\bnavigator\./];
var NODE = [/\brequire\(/, /\bprocess\./, /\b__dirname\b/, /\bBuffer\./, /\bfs\./, /['"]node:/];

function whichRuntime(code) {
  var b = BROWSER.some(function (re) { return re.test(code); });
  var n = NODE.some(function (re) { return re.test(code); });
  if (b && n) return 'mixed';
  if (b) return 'browser';
  if (n) return 'node';
  return 'portable';
}

console.log(whichRuntime('const x = await fetch(url)'));                // portable
console.log(whichRuntime('document.title = process.env.NAME'));          // mixed
console.log(whichRuntime("import fs from 'node:fs'"));                   // node
console.log(whichRuntime('localStorage.setItem("k", "v")'));             // browser
console.log(whichRuntime('const offset = windowSize * 2'));              // portable` },
      dry: { head: ['snippet', 'browser hit', 'node hit', 'result'], rows: [
        ['fetch(url)', 'none', 'none', 'portable'],
        ['document.title = process.env.NAME', 'document.', 'process.', '<span class="c-r">mixed</span>'],
        ["import fs from 'node:fs'", 'none', "'node:", 'node'],
        ['windowSize * 2', 'none (\\b blocks it)', 'none', 'portable']
      ] },
      complexity: `<p>O(M · L): M patterns (constant) times snippet length L. Effectively linear.</p>`,
      followUps: ['How would you ignore markers inside comments and strings? (tokenize or parse to an AST)', 'Add Deno and Bun markers.', 'Why is <code>fetch</code> not a marker anymore?']
    }
  });

  practice.push({
    title: 'Predict the Output: typeof Probes in Node',
    level: 'Easy', tags: ['predict the output', 'globals', 'node'], companies: ['Infosys', 'TCS', 'Swiggy'],
    statement: `<p>A CommonJS file run with <code>node probe.js</code> (Node 22) contains:</p>
<pre>console.log(typeof window);
console.log(typeof globalThis);
console.log(typeof global === typeof globalThis);
console.log(typeof setTimeout(function () {}, 0));
console.log(typeof fetch);
console.log(typeof document === 'undefined' ? 'server' : 'browser');</pre>
<p>Predict each line, then write the code that verifies your prediction and explain any line that would differ in a browser.</p>`,
    constraints: `Node 18+ (fetch is global). The file is CommonJS, not a module.`,
    example: `<p>Line 1 → ${H.c('g', 'undefined')}: there is no <code>window</code> in Node, and <code>typeof</code> on a missing name does not throw.</p>`,
    brute: { why: `<p>The naive approach guesses from browser experience: "<code>window</code> is an object, <code>setTimeout</code> returns a number". Both are wrong in Node. Worse, writing <code>window.foo</code> instead of <code>typeof window</code> throws a ReferenceError.</p>`, code: R`try {
  console.log(window.location.href);     // browser habit
} catch (e) {
  console.log(e.name + ': ' + e.message);   // ReferenceError: window is not defined
}` },
    mcq: { q: 'What does <code>typeof setTimeout(fn, 0)</code> print in Node?', options: ['number', 'object', 'function', 'undefined'], answer: 1, explain: 'Node returns a <code>Timeout</code> object (with <code>ref</code>, <code>unref</code>, <code>refresh</code>). Browsers return a numeric id.' },
    hints: [`<p><b>Hint 1:</b> <code>typeof</code> of an undeclared name is <code>'undefined'</code> and never throws — that's why it's used for runtime probing.</p>`, `<p><b>Hint 2:</b> in Node, <code>global</code> and <code>globalThis</code> are the same object; timers return objects.</p>`, `<p><b>Hint 3:</b> fetch has been a global function since Node 18. <code>document</code> does not exist, so the ternary picks 'server'.</p>`],
    solution: {
      approach: `<p>Expected Node output: <b>undefined, object, true, object, function, server</b>. In a browser: <b>object, object, false</b> (no <code>global</code>, so typeof is 'undefined' vs 'object'), <b>number</b>, <b>function</b>, <b>browser</b>.</p>`,
      code: { lang: 'js', run: true, code: R`console.log(typeof window);                              // Node: undefined   | browser: object
console.log(typeof globalThis);                          // object everywhere
console.log(typeof global === typeof globalThis);       // Node: true        | browser: false
var t = setTimeout(function () {}, 0);
console.log(typeof t);                                   // Node: object      | browser: number
clearTimeout(t);
console.log(typeof fetch);                               // function (Node 18+ and browsers)
console.log(typeof document === 'undefined' ? 'server' : 'browser');   // Node: server` },
      dry: { head: ['line', 'Node', 'Browser', 'why'], rows: [
        ['typeof window', 'undefined', 'object', 'browser global name'],
        ['typeof global === typeof globalThis', 'true', 'false', '<code>global</code> is Node-only'],
        ['typeof setTimeout(...)', 'object', 'number', 'Timeout object vs id'],
        ['document check', 'server', 'browser', 'DOM exists only in pages']
      ] },
      complexity: `<p>Constant time; the point is the runtime model, not the algorithm.</p>`,
      followUps: ['What would <code>typeof require</code> print in an ES module (.mjs)?', 'What does <code>typeof self</code> print in Node vs a Web Worker?']
    }
  });

  practice.push({
    title: 'npm run: Which Scripts Actually Execute?',
    level: 'Easy', tags: ['npm', 'package.json', 'scripts'], companies: ['Microsoft', 'Postman', 'Razorpay'],
    statement: `<p>npm runs <b>pre</b> and <b>post</b> hooks automatically: <code>npm run build</code> runs <code>prebuild</code> (if defined), then <code>build</code>, then <code>postbuild</code> (if defined). Write <code>scriptsToRun(pkg, name)</code> that returns the ordered list of <code>[scriptName, command]</code> pairs, or throws <code>Error('Missing script: "name"')</code> if <code>name</code> itself is not defined (npm does not run hooks for a missing script).</p>`,
    constraints: `pkg is a parsed package.json object; <code>pkg.scripts</code> may be missing. Hooks do not chain (no <code>prepretest</code>).`,
    example: `<p>scripts = <code>{ pretest: 'eslint .', test: 'vitest run', posttest: 'echo done' }</code>, name = <code>'test'</code> → ${H.c('g', '[pretest, test, posttest]')} with their commands.</p>`,
    brute: { why: `<p>Returning just <code>[name]</code> forgets the hooks — and real CI breaks when a <code>pretest</code> lint step silently doesn't run in your mental model. Also forgetting the missing-script error leads to running only hooks.</p>`, code: R`function scriptsToRunBrute(pkg, name) {
  return [[name, pkg.scripts[name]]];      // ignores pre/post hooks, crashes if no scripts
}
console.log(scriptsToRunBrute({ scripts: { pretest: 'eslint .', test: 'vitest run' } }, 'test'));` },
    mcq: { q: 'Which command runs your <code>"start"</code> script?', options: ['<code>npm start</code> (and <code>npm run start</code>)', 'Only <code>npm run start</code>', '<code>npx start</code>', '<code>node start</code>'], answer: 0, explain: '<code>start</code>, <code>test</code>, <code>stop</code> and <code>restart</code> have shortcuts. Others need <code>npm run</code>.' },
    hints: [`<p><b>Hint 1:</b> default <code>pkg.scripts</code> to <code>{}</code> so a package.json without scripts does not crash.</p>`, `<p><b>Hint 2:</b> check the main script first and throw if missing; then build the list ['pre' + name, name, 'post' + name] and keep only defined ones.</p>`, `<p><b>Hint 3:</b> use <code>Object.prototype.hasOwnProperty.call</code> so a script called <code>constructor</code> does not hit the prototype.</p>`],
    solution: {
      approach: `<p>Validate the target, then filter the three candidate names in order. Mirrors npm's behaviour (npm also sets <code>npm_lifecycle_event</code> to the current name for each step).</p>`,
      code: { lang: 'js', run: true, code: R`function scriptsToRun(pkg, name) {
  var scripts = (pkg && pkg.scripts) || {};
  var has = function (k) { return Object.prototype.hasOwnProperty.call(scripts, k); };
  if (!has(name)) throw new Error('Missing script: "' + name + '"');
  return ['pre' + name, name, 'post' + name]
    .filter(has)
    .map(function (k) { return [k, scripts[k]]; });
}

var pkg = { scripts: { pretest: 'eslint .', test: 'vitest run', posttest: 'echo done', build: 'vite build' } };
console.log(scriptsToRun(pkg, 'test'));
console.log(scriptsToRun(pkg, 'build'));
try { scriptsToRun({}, 'deploy'); } catch (e) { console.log(e.message); }` },
      dry: { head: ['name', 'pre?', 'main?', 'post?', 'result'], rows: [
        ['test', 'pretest ✓', 'test ✓', 'posttest ✓', '3 steps'],
        ['build', 'no', 'build ✓', 'no', '1 step'],
        ['deploy', '-', '<span class="c-r">missing</span>', '-', 'throw']
      ] },
      complexity: `<p>O(1): three lookups.</p>`,
      followUps: ['Why do many teams avoid pre/post hooks and use explicit <code>"test": "npm run lint &amp;&amp; vitest"</code>?', 'What is special about the <code>postinstall</code> hook from a security point of view?']
    }
  });

  practice.push({
    title: 'Implement console.table as Plain Text',
    level: 'Easy', tags: ['console', 'formatting', 'debugging'], companies: ['Amazon', 'Freshworks', 'Flipkart'],
    statement: `<p>Write <code>toTable(rows)</code> that turns an array of objects into a text table like DevTools' <code>console.table</code>: first column <code>(index)</code>, then the union of all keys in first-seen order, every column padded to its widest cell, columns separated by <code> | </code>, and a line of dashes under the header. Missing values print as empty.</p>`,
    constraints: `≤ 1000 rows, ≤ 20 keys. Values are strings/numbers/booleans.`,
    example: `<pre>(index) | item | qty
------- | ---- | ---
0       | tea  | 2
1       | cake |</pre><p>Row 1 has no <code>qty</code>, so that cell is blank.</p>`,
    brute: { why: `<p>Logging each row with <code>JSON.stringify</code> works but is unreadable for many rows and doesn't line up columns. Padding to a fixed width (say 10) breaks on long values.</p>`, code: R`function toTableBrute(rows) {
  return rows.map(function (r, i) { return i + ' ' + JSON.stringify(r); }).join('\n');
}
console.log(toTableBrute([{ item: 'tea', qty: 2 }, { item: 'cake' }]));` },
    mcq: { q: 'In which order should the columns appear?', options: ['Alphabetical', 'First-seen order across rows', 'Random', 'By value length'], answer: 1, explain: 'console.table shows columns in the order keys are first encountered, which matches how people read the data.' },
    hints: [`<p><b>Hint 1:</b> two passes: first collect the header (union of keys, in first-seen order) and measure the widest cell of each column; second pass prints.</p>`, `<p><b>Hint 2:</b> build a 2-D array of strings (header row + data rows) first, then <code>padEnd</code> each cell to its column width.</p>`, `<p><b>Hint 3:</b> treat <code>undefined</code> as <code>''</code>; trim the trailing spaces of each line for tidy output.</p>`],
    solution: {
      approach: `<p>Collect columns, convert everything to a grid of strings, compute widths with a max per column, and join. Two linear passes.</p>`,
      code: { lang: 'js', run: true, code: R`function toTable(rows) {
  var cols = [];
  rows.forEach(function (r) {
    Object.keys(r).forEach(function (k) { if (cols.indexOf(k) < 0) cols.push(k); });
  });
  var header = ['(index)'].concat(cols);
  var grid = rows.map(function (r, i) {
    return [String(i)].concat(cols.map(function (c) { return r[c] === undefined ? '' : String(r[c]); }));
  });
  var widths = header.map(function (h, j) {
    return grid.reduce(function (w, row) { return Math.max(w, row[j].length); }, h.length);
  });
  function line(cells) {
    return cells.map(function (c, j) { return c.padEnd(widths[j]); }).join(' | ').replace(/\s+$/, '');
  }
  var out = [line(header), widths.map(function (w) { return '-'.repeat(w); }).join(' | ')];
  grid.forEach(function (row) { out.push(line(row)); });
  return out.join('\n');
}

console.log(toTable([{ item: 'tea', qty: 2 }, { item: 'cake' }, { item: 'coffee', qty: 10, hot: true }]));` },
      dry: { head: ['step', 'state'], rows: [
        ['columns', '[item, qty, hot]'],
        ['widths', '(index)=7, item=6, qty=3, hot=4'],
        ['row 1', '1 | cake | (blank) | (blank)']
      ] },
      complexity: `<p>O(R · C) time and space for R rows and C columns.</p>`,
      followUps: ['Support a second argument to pick columns, like <code>console.table(data, [\'item\'])</code>.', 'Right-align numeric columns.']
    }
  });

  /* =====================================================================
     PRACTICE — Medium
     ===================================================================== */
  practice.push({
    title: 'Production Install Set (npm ci --omit=dev)',
    level: 'Medium', tags: ['npm', 'graph', 'bfs'], companies: ['Vercel', 'Netflix', 'Datadog'],
    statement: `<p>Given the root <code>package.json</code> (<code>dependencies</code>, <code>devDependencies</code>) and a resolved lock graph <code>lock[name] = [names it depends on]</code>, return the <b>sorted</b> list of packages installed by <code>npm ci --omit=dev</code>: everything reachable from the production <code>dependencies</code>. A package needed by both a production and a dev dependency is still installed. Also return the packages that are <b>dev-only</b>.</p>`,
    constraints: `≤ 10<sup>5</sup> packages, ≤ 10<sup>6</sup> edges; the graph may have cycles.`,
    example: `<p>deps = {express}, devDeps = {vitest}; lock: express → [debug, qs], vitest → [debug, chai], debug → [ms]</p>
<p>prod = ${H.chips(['debug', 'express', 'ms', 'qs'])} devOnly = ${H.chips(['chai', 'vitest'])}</p>`,
    brute: { why: `<p>Dropping only the names written in <code>devDependencies</code> forgets their <b>transitive</b> deps (chai stays installed), and dropping all transitive deps of dev tools wrongly removes shared packages (debug), crashing production.</p>`, code: R`function prodBrute(pkg, lock) {
  var all = Object.keys(lock);
  var dev = Object.keys(pkg.devDependencies || {});
  return all.filter(function (n) { return dev.indexOf(n) < 0; }).sort();   // keeps chai (dev-only!)
}
console.log(prodBrute({ dependencies: { express: '^5' }, devDependencies: { vitest: '^3' } },
  { express: ['debug', 'qs'], vitest: ['debug', 'chai'], debug: ['ms'], qs: [], chai: [], ms: [] }));` },
    mcq: { q: '<code>debug</code> is required by both <code>express</code> (prod) and <code>vitest</code> (dev). With <code>--omit=dev</code>…', options: ['debug is removed', 'debug is installed', 'npm errors', 'it depends on the order in package.json'], answer: 1, explain: 'Reachability from production roots decides. Anything reachable from a prod dependency must be present at runtime.' },
    hints: [`<p><b>Hint 1:</b> this is <b>graph reachability</b>: start a BFS/DFS from each production dependency.</p>`, `<p><b>Hint 2:</b> a <code>Set</code> of visited packages handles cycles and shared packages.</p>`, `<p><b>Hint 3:</b> devOnly = (reachable from all roots) minus prod. Do a second BFS from dev roots, then subtract.</p>`],
    solution: {
      approach: `<p>Multi-source BFS from production roots → prod set. Second BFS from dev roots → dev set; devOnly = dev − prod. Both sorted for stable output.</p>`,
      code: { lang: 'js', run: true, code: R`function reach(roots, lock) {
  var seen = new Set(roots), queue = roots.slice();
  while (queue.length) {
    var p = queue.shift();
    (lock[p] || []).forEach(function (d) {
      if (!seen.has(d)) { seen.add(d); queue.push(d); }
    });
  }
  return seen;
}
function productionInstall(pkg, lock) {
  var prod = reach(Object.keys(pkg.dependencies || {}), lock);
  var dev = reach(Object.keys(pkg.devDependencies || {}), lock);
  var devOnly = Array.from(dev).filter(function (d) { return !prod.has(d); });
  return { prod: Array.from(prod).sort(), devOnly: devOnly.sort() };
}

console.log(productionInstall(
  { dependencies: { express: '^5.0.0' }, devDependencies: { vitest: '^3.0.0' } },
  { express: ['debug', 'qs'], vitest: ['debug', 'chai'], debug: ['ms'], qs: [], chai: [], ms: ['debug'] }
));` },
      dry: { head: ['BFS', 'queue', 'seen'], rows: [
        ['prod start', '[express]', '{express}'],
        ['pop express', '[debug, qs]', '{express, debug, qs}'],
        ['pop debug', '[qs, ms]', '{…, ms}'],
        ['pop ms → debug seen (cycle)', '[]', '{express, debug, qs, ms}']
      ] },
      complexity: `<p>O(V + E) time, O(V) space.</p>`,
      followUps: ['How do optional and peer dependencies change this?', 'Why should a Docker image run <code>npm ci --omit=dev</code> after building?']
    }
  });

  practice.push({
    title: 'Generate node_modules Lookup Paths',
    level: 'Medium', tags: ['node', 'module resolution', 'paths'], companies: ['Microsoft', 'Uber', 'LinkedIn'],
    statement: `<p>Implement <code>lookupPaths(fromFile)</code> like Node's <code>require.resolve.paths()</code>: starting at the folder of <code>fromFile</code>, list <code>&lt;dir&gt;/node_modules</code> for that folder and every parent up to the root (<code>/node_modules</code>). Skip folders that are themselves named <code>node_modules</code> (Node never builds <code>node_modules/node_modules</code>).</p>`,
    constraints: `POSIX absolute paths. Path depth ≤ 100. Ignore global folders such as <code>~/.node_modules</code>.`,
    example: `<p><code>lookupPaths('/app/node_modules/express/lib/router.js')</code> →</p>
<pre>/app/node_modules/express/lib/node_modules
/app/node_modules/express/node_modules
/app/node_modules
/node_modules</pre><p>The folder <code>/app/node_modules</code> itself is skipped as a "parent", so there's no <code>/app/node_modules/node_modules</code>.</p>`,
    brute: { why: `<p>Only checking <code>./node_modules</code> next to the file ("it's always at the project root") fails for nested packages and monorepos; naive walking produces bogus <code>node_modules/node_modules</code> entries.</p>`, code: R`function lookupBrute(fromFile) {
  return [fromFile.split('/').slice(0, -1).join('/') + '/node_modules'];   // one guess only
}
console.log(lookupBrute('/app/src/index.js'));` },
    mcq: { q: 'Why can a file deep inside <code>/app/src/a/b/</code> import a package installed at <code>/app/node_modules</code>?', options: ['npm copies it into every folder', 'Node walks up parent folders looking for node_modules', 'Because of PATH', 'Symlinks'], answer: 1, explain: 'The resolution algorithm tries node_modules in the current folder and each ancestor until it finds the package.' },
    hints: [`<p><b>Hint 1:</b> split the directory into segments; for i from the deepest down to 0, the prefix <code>segments[0..i)</code> is a candidate folder.</p>`, `<p><b>Hint 2:</b> if the last segment of the candidate folder is <code>node_modules</code>, skip it.</p>`, `<p><b>Hint 3:</b> the root is special: join produces <code>''</code>, so emit <code>/node_modules</code>.</p>`],
    solution: {
      approach: `<p>Walk the directory prefixes from longest to shortest, skipping those ending in <code>node_modules</code>, appending <code>/node_modules</code>.</p>`,
      code: { lang: 'js', run: true, code: R`function lookupPaths(fromFile) {
  var parts = fromFile.split('/').filter(Boolean);
  parts.pop();                                  // drop the file name -> its directory
  var out = [];
  for (var i = parts.length; i >= 0; i--) {
    if (i > 0 && parts[i - 1] === 'node_modules') continue;    // no node_modules/node_modules
    var dir = '/' + parts.slice(0, i).join('/');
    out.push(dir === '/' ? '/node_modules' : dir + '/node_modules');
  }
  return out;
}

console.log(lookupPaths('/app/node_modules/express/lib/router.js'));
console.log(lookupPaths('/home/me/app/src/index.js'));
console.log(lookupPaths('/index.js'));` },
      dry: { head: ['i', 'prefix', 'skip?', 'emit'], rows: [
        ['4', '/app/node_modules/express/lib', 'no', '…/lib/node_modules'],
        ['3', '/app/node_modules/express', 'no', '…/express/node_modules'],
        ['2', '/app/node_modules', '<span class="c-r">yes</span>', '-'],
        ['1', '/app', 'no', '/app/node_modules'],
        ['0', '/', 'no', '/node_modules']
      ] },
      complexity: `<p>O(D<sup>2</sup>) characters for D segments because of the slices/joins; O(D) paths returned.</p>`,
      followUps: ['Add Windows paths (drive letters, backslashes).', 'After finding the folder, how does Node pick the file (exports → main → index.js)?']
    }
  });

  practice.push({
    title: 'Expand a Semver Range into Comparators',
    level: 'Medium', tags: ['semver', 'parsing', 'npm'], companies: ['GitHub', 'JFrog', 'Atlassian'],
    statement: `<p>Write <code>expand(range)</code> that turns npm shorthand into explicit comparators, the way the <code>semver</code> package does internally:</p>
<ul><li><code>^1.2.3</code> → <code>&gt;=1.2.3 &lt;2.0.0</code>; <code>^0.2.3</code> → <code>&gt;=0.2.3 &lt;0.3.0</code>; <code>^0.0.3</code> → <code>&gt;=0.0.3 &lt;0.0.4</code></li>
<li><code>~1.2.3</code> → <code>&gt;=1.2.3 &lt;1.3.0</code></li>
<li><code>1.2.x</code> → <code>&gt;=1.2.0 &lt;1.3.0</code>; <code>1.x</code> → <code>&gt;=1.0.0 &lt;2.0.0</code>; <code>*</code> or <code>x</code> → <code>&gt;=0.0.0</code></li>
<li><code>1.2.3</code> → <code>=1.2.3</code></li></ul>`,
    constraints: `Single range only (no <code>||</code>); invalid input throws.`,
    example: `<p><code>expand('^0.2.3')</code> → ${H.c('g', '"&gt;=0.2.3 &lt;0.3.0"')} — caret bumps the left-most non-zero part.</p>`,
    brute: { why: `<p>Hard-coding "caret = bump major" breaks every <code>0.x</code> package, which are extremely common (many popular libraries spent years at 0.x).</p>`, code: R`function expandBrute(r) {
  var v = r.slice(1).split('.').map(Number);
  return '>=' + v.join('.') + ' <' + (v[0] + 1) + '.0.0';   // ^0.2.3 -> <1.0.0 (wrong)
}
console.log(expandBrute('^0.2.3'));` },
    mcq: { q: 'What does <code>~1.2</code> mean in npm?', options: ['&gt;=1.2.0 &lt;1.3.0', '&gt;=1.2.0 &lt;2.0.0', 'exactly 1.2.0', 'invalid'], answer: 0, explain: 'Tilde allows patch-level changes if a minor version is specified.' },
    hints: [`<p><b>Hint 1:</b> detect the form with regexes: caret, tilde, x-range, star, exact. Handle each in its own branch.</p>`, `<p><b>Hint 2:</b> caret: find the first non-zero among major/minor/patch and bump that one, zeroing everything to the right.</p>`, `<p><b>Hint 3:</b> x-ranges: the first wildcard position is where you bump the part to its left. Throw on anything else with a helpful message.</p>`],
    solution: {
      approach: `<p>Regex dispatch + small helpers. Every branch produces a lower bound and (optionally) an exclusive upper bound.</p>`,
      code: { lang: 'js', run: true, code: R`function expand(range) {
  var r = range.trim(), m;
  if (r === '*' || r === 'x' || r === 'X') return '>=0.0.0';
  if ((m = /^\^(\d+)\.(\d+)\.(\d+)$/.exec(r))) {
    var M = +m[1], mi = +m[2], p = +m[3];
    var hi = M > 0 ? (M + 1) + '.0.0' : mi > 0 ? '0.' + (mi + 1) + '.0' : '0.0.' + (p + 1);
    return '>=' + M + '.' + mi + '.' + p + ' <' + hi;
  }
  if ((m = /^~(\d+)\.(\d+)(?:\.(\d+))?$/.exec(r))) {
    return '>=' + m[1] + '.' + m[2] + '.' + (m[3] || 0) + ' <' + m[1] + '.' + (+m[2] + 1) + '.0';
  }
  if ((m = /^(\d+)\.[xX*]$/.exec(r))) return '>=' + m[1] + '.0.0 <' + (+m[1] + 1) + '.0.0';
  if ((m = /^(\d+)\.(\d+)\.[xX*]$/.exec(r))) return '>=' + m[1] + '.' + m[2] + '.0 <' + m[1] + '.' + (+m[2] + 1) + '.0';
  if (/^\d+\.\d+\.\d+$/.test(r)) return '=' + r;
  throw new Error('Unsupported range: ' + range);
}

['^1.2.3', '^0.2.3', '^0.0.3', '~1.2.3', '~1.2', '1.2.x', '1.x', '*', '1.2.3']
  .forEach(function (r) { console.log(r.padEnd(7), '=>', expand(r)); });` },
      dry: { head: ['range', 'branch', 'bumped part', 'result'], rows: [
        ['^1.2.3', 'caret', 'major (1 → 2)', '&gt;=1.2.3 &lt;2.0.0'],
        ['^0.2.3', 'caret', 'minor (2 → 3)', '&gt;=0.2.3 &lt;0.3.0'],
        ['1.2.x', 'x-range', 'minor', '&gt;=1.2.0 &lt;1.3.0']
      ] },
      complexity: `<p>O(L) for a range string of length L (regex matching).</p>`,
      followUps: ['Support hyphen ranges <code>1.2.3 - 2.3.4</code>.', 'Why does the real semver library write <code>&lt;2.0.0-0</code> as the upper bound?']
    }
  });

  practice.push({
    title: 'Portable Base64 Without btoa or Buffer',
    level: 'Medium', tags: ['portable', 'TextEncoder', 'bytes'], companies: ['Cloudflare', 'Stripe', 'Shopify'],
    statement: `<p><code>btoa</code> exists in browsers (and modern Node) but only accepts Latin-1 characters — <code>btoa('₹')</code> throws. <code>Buffer.from(s).toString('base64')</code> is Node-only. Write <code>toBase64(str)</code> that works in <b>any</b> runtime for any Unicode string: encode to UTF-8 bytes with <code>TextEncoder</code>, then Base64 the bytes by hand.</p>`,
    constraints: `String length ≤ 10<sup>6</sup>. Output standard Base64 with <code>=</code> padding.`,
    example: `<p><code>toBase64('hi')</code> → ${H.c('g', '"aGk="')}; <code>toBase64('₹5')</code> → ${H.c('g', '"4oK5NQ=="')} (₹ is 3 UTF-8 bytes: E2 82 B9).</p>`,
    brute: { why: `<p>Calling <code>btoa(str)</code> directly throws <code>InvalidCharacterError</code> for any character above U+00FF (emoji, ₹, Hindi, Chinese…). Using <code>Buffer</code> breaks in browsers and edge runtimes.</p>`, code: R`function toBase64Brute(str) {
  return btoa(str);                 // throws for '₹' -- not Latin-1
}
try { console.log(toBase64Brute('₹5')); } catch (e) { console.log(e.name); }` },
    mcq: { q: 'How many Base64 characters encode 3 bytes?', options: ['3', '4', '6', '8'], answer: 1, explain: '3 bytes = 24 bits = four 6-bit groups, each one Base64 character.' },
    hints: [`<p><b>Hint 1:</b> <code>new TextEncoder().encode(str)</code> gives a <code>Uint8Array</code> of UTF-8 bytes in every modern runtime.</p>`, `<p><b>Hint 2:</b> process 3 bytes at a time: combine into a 24-bit number <code>(b0 &lt;&lt; 16) | (b1 &lt;&lt; 8) | b2</code> and pull out four 6-bit indexes.</p>`, `<p><b>Hint 3:</b> for the final 1 or 2 bytes, treat missing bytes as 0 and replace the extra output characters with <code>=</code>. Collect characters in an array and join once.</p>`],
    solution: {
      approach: `<p>UTF-8 encode with the portable <code>TextEncoder</code>, then classic 3-bytes → 4-chars Base64 with padding. Optionally use a native fast path when present (<code>Uint8Array.prototype.toBase64</code> is a new standard method in recent engines).</p>`,
      code: { lang: 'js', run: true, code: R`var ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function toBase64(str) {
  var bytes = new TextEncoder().encode(str);      // portable UTF-8 bytes
  var out = [];
  for (var i = 0; i < bytes.length; i += 3) {
    var b0 = bytes[i], b1 = bytes[i + 1], b2 = bytes[i + 2];
    var n = (b0 << 16) | ((b1 || 0) << 8) | (b2 || 0);
    out.push(ALPHA[(n >> 18) & 63], ALPHA[(n >> 12) & 63]);
    out.push(i + 1 < bytes.length ? ALPHA[(n >> 6) & 63] : '=');
    out.push(i + 2 < bytes.length ? ALPHA[n & 63] : '=');
  }
  return out.join('');
}

console.log(toBase64('hi'));        // aGk=
console.log(toBase64('₹5'));        // 4oK5NQ==
console.log(toBase64('Man'));       // TWFu
console.log(toBase64(''));          // (empty)` },
      dry: { head: ['chunk', 'bytes', '24-bit groups', 'output'], rows: [
        ['"Man"', '4D 61 6E', '19 22 5 46', 'TWFu'],
        ['"hi"', '68 69 (00)', '26 6 36 (pad)', 'aGk='],
        ['"₹5" part 2', '35 (00 00)', '13 16 (pad pad)', 'NQ==']
      ] },
      complexity: `<p>O(N) time and space in the number of UTF-8 bytes.</p>`,
      followUps: ['Write the decoder (Base64 → string with TextDecoder).', 'Produce Base64URL (<code>-</code>, <code>_</code>, no padding) for JWTs.']
    }
  });

  practice.push({
    title: 'Simulate Top-Level Declarations: What Leaks onto globalThis?',
    level: 'Medium', tags: ['global object', 'script vs module', 'simulation'], companies: ['Meta', 'Adobe', 'PayPal'],
    statement: `<p>Write <code>simulate(lines, mode)</code> for <code>mode</code> in <code>'script'</code> (classic browser script), <code>'module'</code> (ES module) or <code>'cjs'</code> (Node CommonJS). Each line is one of: <code>var x</code>, <code>let x</code>, <code>const x</code>, <code>class X</code>, <code>function f</code>, or an assignment to an undeclared name <code>x = …</code>. Return <code>{ globalProps, error }</code>: the names that become properties of the global object, and the first error (a <code>ReferenceError</code> message) if a line throws — execution stops at that line.</p>`,
    constraints: `≤ 1000 lines. An assignment to a name declared earlier in the same file is a normal assignment (no leak).`,
    example: `<p>lines = <code>['var a = 1', 'let b = 2', 'function f() {}', 'c = 3']</code></p>
<p>script → ${H.c('r', '[a, f, c]')}; module → ${H.c('r', 'error: c is not defined')}, nothing leaked; cjs → ${H.c('r', '[c]')}</p>`,
    brute: { why: `<p>Assuming "everything at top level is global" (true only for <code>var</code>/<code>function</code> in classic scripts) or "nothing is ever global" (false for implicit globals in sloppy CJS) — both give wrong answers in two of three modes.</p>`, code: R`function simulateBrute(lines) {
  // "top-level means global" -- wrong for let/const/class, modules and CommonJS
  return lines.map(function (l) { return l.replace(/^(var|let|const|class|function)\s+/, '').split(/[\s=(]/)[0]; });
}
console.log(simulateBrute(['var a = 1', 'let b = 2', 'function f() {}', 'c = 3']));` },
    mcq: { q: 'In a classic script, which line creates a property on <code>window</code>?', options: ['<code>let x = 1</code>', '<code>const x = 1</code>', '<code>var x = 1</code>', '<code>class X {}</code>'], answer: 2, explain: 'Only <code>var</code> and function declarations (plus implicit globals) go on the global object; let/const/class live in the global lexical scope.' },
    hints: [`<p><b>Hint 1:</b> parse each line with one regex: optional keyword, then the name. No keyword means "assignment".</p>`, `<p><b>Hint 2:</b> keep a <code>declared</code> set. An assignment to a declared name is harmless; to an undeclared name it is an implicit global — or a ReferenceError in strict code.</p>`, `<p><b>Hint 3:</b> table — script: var/function → global, sloppy; module: nothing global, strict; cjs: nothing global from declarations, sloppy (implicit globals leak).</p>`],
    solution: {
      approach: `<p>Rule table per mode + a declared-names set. Strictness decides the fate of undeclared assignments; the "where do declarations live" rule decides var/function.</p>`,
      code: { lang: 'js', run: true, code: R`var RULES = {
  script: { strict: false, varOnGlobal: true },
  module: { strict: true, varOnGlobal: false },
  cjs:    { strict: false, varOnGlobal: false }
};

function simulate(lines, mode) {
  var rule = RULES[mode];
  if (!rule) throw new Error('mode must be script | module | cjs');
  var declared = new Set(), globalProps = [];
  for (var i = 0; i < lines.length; i++) {
    var m = /^\s*(var|let|const|class|function)?\s*([A-Za-z_$][\w$]*)/.exec(lines[i]);
    if (!m) continue;
    var kw = m[1], name = m[2];
    if (kw) {
      declared.add(name);
      if (rule.varOnGlobal && (kw === 'var' || kw === 'function')) globalProps.push(name);
    } else if (!declared.has(name)) {
      if (rule.strict) return { globalProps: globalProps, error: 'ReferenceError: ' + name + ' is not defined' };
      declared.add(name);
      globalProps.push(name);                       // implicit global
    }
  }
  return { globalProps: globalProps, error: null };
}

var prog = ['var a = 1', 'let b = 2', 'function f() {}', 'c = 3', 'a = 4'];
['script', 'module', 'cjs'].forEach(function (mode) { console.log(mode, simulate(prog, mode)); });` },
      dry: { head: ['line', 'script', 'module', 'cjs'], rows: [
        ['var a = 1', 'global a', 'local', 'local'],
        ['let b = 2', 'global lexical (not a prop)', 'local', 'local'],
        ['function f() {}', 'global f', 'local', 'local'],
        ['c = 3', 'implicit global c', '<span class="c-r">ReferenceError</span>', 'implicit global c'],
        ['a = 4', 'assign (declared)', '(not reached)', 'assign (declared)']
      ] },
      complexity: `<p>O(N) lines, O(N) set space.</p>`,
      followUps: ['Add <code>\'use strict\'</code> as a possible first line for script and cjs.', 'What happens with <code>let x</code> in one classic script and <code>var x</code> in another?']
    }
  });

  practice.push({
    title: 'A Cross-Runtime Event Emitter',
    level: 'Medium', tags: ['events', 'portable', 'design'], companies: ['Microsoft', 'Discord', 'Slack'],
    statement: `<p>Browsers have <code>EventTarget</code>; Node has <code>EventEmitter</code> from <code>node:events</code>. Your shared library must not import either. Write a class <code>Emitter</code> with <code>on(event, fn)</code> (returns an unsubscribe function), <code>once(event, fn)</code>, <code>off(event, fn)</code> and <code>emit(event, ...args)</code> (returns <code>true</code> if any listener ran). Listeners run in registration order; removing a listener <i>during</i> an emit must not skip the others.</p>`,
    constraints: `≤ 10<sup>4</sup> listeners per event. Pure JS, no host APIs.`,
    example: `<p><code>e.once('ready', f); e.emit('ready'); e.emit('ready');</code> → f runs ${H.c('g', 'once')}; the second emit returns ${H.c('r', 'false')}.</p>`,
    brute: { why: `<p>Iterating the live listener array while a <code>once</code> listener removes itself shifts indexes, so the next listener is <b>skipped</b>. A classic bug in hand-rolled emitters.</p>`, code: R`function BruteEmitter() { this.map = {}; }
BruteEmitter.prototype.on = function (e, f) { (this.map[e] = this.map[e] || []).push(f); };
BruteEmitter.prototype.emit = function (e) {
  var list = this.map[e] || [];
  for (var i = 0; i < list.length; i++) list[i]();     // live array: removals skip items
};
var b = new BruteEmitter(), self;
b.on('x', self = function () { b.map.x.splice(b.map.x.indexOf(self), 1); console.log('A'); });
b.on('x', function () { console.log('B (skipped by the bug)'); });
b.emit('x');` },
    mcq: { q: 'How do you avoid skipping listeners when one removes itself during emit?', options: ['Iterate backwards only', 'Iterate over a copy (snapshot) of the array', 'Use setTimeout', 'Forbid removal'], answer: 1, explain: 'Snapshot the listener list before calling them, which is what Node\'s EventEmitter does.' },
    hints: [`<p><b>Hint 1:</b> store <code>Map&lt;event, fn[]&gt;</code>. <code>on</code> pushes and returns <code>() =&gt; this.off(event, fn)</code>.</p>`, `<p><b>Hint 2:</b> <code>once</code> wraps fn in a wrapper that calls <code>off(wrapper)</code> then fn; remember the original on the wrapper so <code>off(event, fn)</code> can still remove it.</p>`, `<p><b>Hint 3:</b> in <code>emit</code>, copy the array with <code>slice()</code> and loop over the copy; return whether the copy was non-empty.</p>`],
    solution: {
      approach: `<p>Map of arrays; snapshot on emit; <code>once</code> via a self-removing wrapper that keeps a reference to the original listener.</p>`,
      code: { lang: 'js', run: true, code: R`class Emitter {
  #listeners = new Map();                 // private field: event -> array of functions

  on(event, fn) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, []);
    this.#listeners.get(event).push(fn);
    return () => this.off(event, fn);     // handy unsubscribe
  }
  once(event, fn) {
    const wrapper = (...args) => { this.off(event, wrapper); fn.apply(this, args); };
    wrapper.original = fn;                // so off(event, fn) also works
    return this.on(event, wrapper);
  }
  off(event, fn) {
    const list = this.#listeners.get(event);
    if (!list) return;
    const i = list.findIndex((l) => l === fn || l.original === fn);
    if (i >= 0) list.splice(i, 1);
    if (!list.length) this.#listeners.delete(event);
  }
  emit(event, ...args) {
    const list = this.#listeners.get(event);
    if (!list || !list.length) return false;
    for (const fn of list.slice()) fn.apply(this, args);   // snapshot!
    return true;
  }
}

const e = new Emitter();
e.once('ready', () => console.log('A (once)'));
const stop = e.on('ready', (v) => console.log('B got', v));
console.log(e.emit('ready', 1));   // A (once), B got 1, true
stop();
console.log(e.emit('ready', 2));   // false -- nobody left` },
      dry: { head: ['call', 'listeners[ready]', 'output'], rows: [
        ['once(A)', '[wA]', '-'],
        ['on(B)', '[wA, B]', '-'],
        ['emit(1)', 'snapshot [wA, B]; wA removes itself', 'A, B got 1 → true'],
        ['stop(); emit(2)', '[] → deleted', 'false']
      ] },
      complexity: `<p><code>on</code> O(1); <code>off</code> O(k); <code>emit</code> O(k) for k listeners (plus the snapshot copy).</p>`,
      followUps: ['Add <code>maxListeners</code> leak warnings like Node.', 'Make <code>emit</code> catch listener errors and emit an <code>\'error\'</code> event instead.', 'How is <code>EventTarget</code> different (event objects, capture/bubble, <code>{ once: true }</code>)?']
    }
  });
  /* =====================================================================
     PRACTICE — Hard
     ===================================================================== */
  practice.push({
    title: 'Build a Mini CommonJS Loader (wrapper, cache, cycles)',
    level: 'Hard', tags: ['commonjs', 'module system', 'closures', 'machine coding'], companies: ['Google', 'Microsoft', 'Atlassian'],
    statement: `<p>Implement <code>createLoader(files)</code> where <code>files</code> maps absolute paths (e.g. <code>'/app/main.js'</code>) to source strings. It returns <code>require(path)</code> that behaves like Node's CommonJS:</p>
<ul><li>Wraps each source as <code>function (exports, require, module, __filename, __dirname) { … }</code> and calls it with <code>this === module.exports</code>.</li>
<li>Resolves relative specifiers (<code>'./util'</code>, <code>'../lib/x.js'</code>) against the requiring file's folder; adds <code>.js</code> if missing.</li>
<li><b>Caches</b> modules: a second <code>require</code> of the same file returns the same exports without re-running.</li>
<li><b>Cycles</b>: if A requires B and B requires A while A is still running, B receives A's <b>partially filled</b> exports (no infinite loop).</li>
<li>Throws <code>Error("Cannot find module 'x'")</code> for unknown files.</li></ul>`,
    constraints: `≤ 1000 files. Sources are trusted (this is a teaching model). Use <code>new Function</code> to build the wrapper.`,
    example: `<p>a.js: <code>exports.loaded = false; const b = require('./b'); exports.loaded = true;</code> b.js: <code>const a = require('./a'); exports.sawA = a.loaded;</code></p>
<p>Requiring a.js gives ${H.c('g', 'b.sawA === false')}: when b ran, a had only executed its first line.</p>`,
    brute: { why: `<p>Evaluating each file with no cache re-runs modules on every require (double side effects, separate state) and recurses forever on a cycle (A → B → A → B …) until "Maximum call stack size exceeded".</p>`, code: R`function bruteRequire(files, path) {
  var module = { exports: {} };
  var fn = new Function('exports', 'require', 'module', files[path]);
  fn(module.exports, function (p) { return bruteRequire(files, '/' + p.replace('./', '') + '.js'); }, module);
  return module.exports;                     // no cache: cycles never end
}
try {
  bruteRequire({ '/a.js': "require('./b')", '/b.js': "require('./a')" }, '/a.js');
} catch (e) { console.log(e.name + ': ' + e.message); }` },
    mcq: { q: 'Why must a module be put in the cache <i>before</i> its code runs?', options: ['For speed only', 'So a circular require gets the in-progress exports instead of recursing forever', 'Because Node is single-threaded', 'It must be cached after'], answer: 1, explain: 'Node inserts the module into <code>require.cache</code> first. A cycle then finds it and returns the partial <code>module.exports</code>.' },
    hints: [`<p><b>Hint 1:</b> a module record is <code>{ id, exports: {}, loaded: false }</code>. Store it in <code>cache[id]</code> <b>before</b> running the wrapper.</p>`, `<p><b>Hint 2:</b> path resolution: split the base folder and the specifier on <code>/</code>; for each part, <code>..</code> pops, <code>.</code> is skipped, anything else pushes. Append <code>.js</code> if absent.</p>`, `<p><b>Hint 3:</b> each module gets its <b>own</b> <code>require</code> bound to its folder (a closure). Return <code>module.exports</code> at the end — not the original <code>exports</code> object — so <code>module.exports = fn</code> works.</p>`],
    solution: {
      approach: `<p>Cache-first module records + a per-module <code>require</code> closure + POSIX path normalisation. This is essentially Node's <code>Module._load</code> in miniature: resolve → check cache → create record → cache it → compile wrapper → run with <code>this = exports</code> → mark loaded → return <code>module.exports</code>.</p>`,
      code: { lang: 'js', run: true, code: R`function createLoader(files) {
  var cache = {};

  function resolve(fromDir, spec) {
    if (!/^\.{1,2}\//.test(spec) && spec[0] !== '/') throw new Error("Cannot find module '" + spec + "' (only relative paths in this model)");
    var parts = spec[0] === '/' ? [] : fromDir.split('/').filter(Boolean);
    spec.split('/').forEach(function (seg) {
      if (seg === '..') parts.pop();
      else if (seg && seg !== '.') parts.push(seg);
    });
    var id = '/' + parts.join('/');
    if (!/\.js$/.test(id)) id += '.js';
    if (!(id in files)) throw new Error("Cannot find module '" + spec + "'");
    return id;
  }

  function load(id) {
    if (cache[id]) return cache[id].exports;            // cached (or in progress -> partial)
    var module = { id: id, exports: {}, loaded: false };
    cache[id] = module;                                 // cache BEFORE running: cycles OK
    var dir = id.slice(0, id.lastIndexOf('/')) || '/';
    var localRequire = function (spec) { return load(resolve(dir, spec)); };
    var wrapper = new Function('exports', 'require', 'module', '__filename', '__dirname', files[id]);
    wrapper.call(module.exports, module.exports, localRequire, module, id, dir);
    module.loaded = true;
    return module.exports;                              // honours module.exports = ...
  }

  return function require(path) { return load(resolve('/', path)); };
}

var files = {
  '/app/main.js': "const a = require('./a'); const u = require('./lib/util'); console.log('a.loaded', a.loaded, 'b saw', a.b.sawA); console.log(u(2, 3), require('./lib/util') === u); console.log('this === exports:', this === exports);",
  '/app/a.js': "exports.loaded = false; exports.b = require('./b'); exports.loaded = true;",
  '/app/b.js': "const a = require('./a.js'); exports.sawA = a.loaded;",
  '/app/lib/util.js': "console.log('util evaluated once', __filename); module.exports = function add(x, y) { return x + y; };"
};
var req = createLoader(files);
req('/app/main.js');
try { req('/app/missing'); } catch (e) { console.log(e.message); }` },
      dry: { head: ['step', 'cache', 'event'], rows: [
        ['require main', '{main*}', 'main runs, requires ./a'],
        ['load a', '{main*, a*}', 'a: loaded=false, requires ./b'],
        ['load b', '{…, b*}', 'b requires ./a.js → cache hit, <b>partial</b> exports (loaded=false)'],
        ['b done', '{…, b}', 'b.sawA = false'],
        ['a done', '{…, a}', 'a.loaded = true'],
        ['util ×2', '{…, util}', 'second require returns cached function (true)']
      ] },
      complexity: `<p>Each file is compiled and run once: O(total source size) plus O(path length) per require. Memory O(number of modules).</p>`,
      followUps: ['Add <code>index.js</code> folder resolution and a <code>node_modules</code> walk for bare names.', 'Add JSON files (<code>require(\'./data.json\')</code>).', 'How do ES modules avoid the "partial exports" problem (and what do they have instead — TDZ errors)?']
    }
  });

  practice.push({
    title: 'ES Module Cycles: Find the TDZ Crashes',
    level: 'Hard', tags: ['esm', 'dfs', 'cycles', 'predict the output'], companies: ['Google', 'Bloomberg', 'Meta'],
    statement: `<p>You get an ES module graph: <code>mods[name] = { imports: [...], exports: { binding: 'let' | 'const' | 'class' | 'function' }, topLevelReads: ['mod.binding', ...] }</code>. <code>topLevelReads</code> are imported bindings read while the module's top-level code runs. Starting from <code>entry</code>, compute the ESM <b>evaluation order</b> (post-order DFS, imports in order, each once, cycles skipped) and report every top-level read that would throw a <b>TDZ ReferenceError</b>: reading a <code>let</code>/<code>const</code>/<code>class</code> export of a module that has <b>not finished evaluating</b> yet. <code>function</code> declarations are hoisted and initialised during linking, so they are always safe.</p>`,
    constraints: `≤ 10<sup>4</sup> modules. Report errors in evaluation order as strings <code>"reader: mod.binding"</code>. Assume nothing throws earlier (report all).`,
    example: `<p>main → a; a → b; b → a. b reads <code>a.config</code> (const) and <code>a.helper</code> (function).</p>
<p>Order: ${H.arr(['b', 'a', 'main'])} Errors: ${H.c('r', '["b: a.config"]')} — when b runs, a is still on the stack; <code>a.helper</code> is fine because function declarations are hoisted.</p>`,
    brute: { why: `<p>"Cycles are always errors" or "cycles are never errors" are both wrong. The answer depends on <b>which</b> module evaluates first and on the <b>kind</b> of binding. Without simulating the DFS you cannot tell.</p>`, code: R`function tdzBrute(mods) {
  // flags EVERY read that is part of a cycle -- includes safe function reads
  var errs = [];
  Object.keys(mods).forEach(function (m) {
    mods[m].topLevelReads.forEach(function (r) {
      var src = r.split('.')[0];
      if (mods[src].imports.indexOf(m) >= 0) errs.push(m + ': ' + r);
    });
  });
  return errs;
}
console.log(tdzBrute({
  a: { imports: ['b'], exports: { config: 'const', helper: 'function' }, topLevelReads: [] },
  b: { imports: ['a'], exports: {}, topLevelReads: ['a.config', 'a.helper'] }
}));` },
    mcq: { q: 'In a cycle, which imported binding can safely be <b>called</b> at the top level before its module finished evaluating?', options: ['an exported <code>const</code> arrow function', 'an exported <code>function</code> declaration', 'an exported <code>class</code>', 'none of them'], answer: 1, explain: 'Function declarations are instantiated during linking (hoisted). const/let/class bindings stay in the TDZ until their declaration line runs.' },
    hints: [`<p><b>Hint 1:</b> first compute the evaluation order exactly as in the guided problem (post-order DFS with visiting/done states).</p>`, `<p><b>Hint 2:</b> when module M is evaluated (appended to the order), check each of its top-level reads <code>X.b</code>: it is safe iff X is already <b>done</b>, or the binding kind is <code>function</code>.</p>`, `<p><b>Hint 3:</b> because evaluation happens at the moment of post-order append, you can do the check inline in the DFS: at append time, state[X] tells you whether X has finished.</p>`],
    solution: {
      approach: `<p>Post-order DFS; at the moment a module is "evaluated" (appended), inspect its reads against the <code>done</code> set and the binding kind. This mirrors the real spec: TDZ errors come from bindings not yet initialised by their module's evaluation.</p>`,
      code: { lang: 'js', run: true, code: R`function analyze(mods, entry) {
  var state = {}, order = [], errors = [];
  function visit(m) {
    state[m] = 'visiting';
    mods[m].imports.forEach(function (d) { if (!state[d]) visit(d); });   // skip visiting/done
    // m evaluates NOW: check every imported binding it reads at top level
    mods[m].topLevelReads.forEach(function (r) {
      var parts = r.split('.'), src = parts[0], name = parts[1];
      var kind = mods[src].exports[name];
      if (state[src] !== 'done' && kind !== 'function') errors.push(m + ': ' + r);
    });
    state[m] = 'done';
    order.push(m);
  }
  visit(entry);
  return { order: order, errors: errors };
}

var mods = {
  main: { imports: ['a'], exports: {}, topLevelReads: ['a.config'] },
  a: { imports: ['b'], exports: { config: 'const', helper: 'function' }, topLevelReads: ['b.VERSION'] },
  b: { imports: ['a'], exports: { VERSION: 'const' }, topLevelReads: ['a.config', 'a.helper'] }
};
console.log(analyze(mods, 'main'));
// { order: [ 'b', 'a', 'main' ], errors: [ 'b: a.config' ] }
// Fix idea: move config into its own module c that both a and b import (break the cycle).` },
      dry: { head: ['evaluate', 'reads', 'source state', 'kind', 'verdict'], rows: [
        ['b', 'a.config', 'a visiting', 'const', '<span class="c-r">TDZ error</span>'],
        ['b', 'a.helper', 'a visiting', 'function', '<span class="c-g">ok (hoisted)</span>'],
        ['a', 'b.VERSION', 'b done', 'const', '<span class="c-g">ok</span>'],
        ['main', 'a.config', 'a done', 'const', '<span class="c-g">ok</span>']
      ] },
      complexity: `<p>O(V + E + R): each module, import edge and top-level read processed once.</p>`,
      followUps: ['Rewrite the DFS iteratively for very deep graphs.', 'How would the CommonJS version of this graph behave (undefined instead of an error)?', 'Which refactors break cycles (extract shared module, dependency injection, lazy import())?']
    }
  });

  practice.push({
    title: 'npm Resolution: maxSatisfying with Comparator Sets and ||',
    level: 'Hard', tags: ['semver', 'parsing', 'npm install'], companies: ['GitHub', 'Microsoft', 'Vercel'],
    statement: `<p>When you run <code>npm install pkg@"range"</code>, npm picks the <b>highest published version</b> that satisfies the range. Implement <code>maxSatisfying(versions, range)</code> for ranges made of:</p>
<ul><li>sets separated by <code>||</code> (a version matches if it matches <b>any</b> set);</li>
<li>each set is space-separated comparators that must <b>all</b> hold: <code>&gt;=v</code>, <code>&gt;v</code>, <code>&lt;=v</code>, <code>&lt;v</code>, <code>=v</code> or bare <code>v</code>, <code>^v</code>, <code>~v</code>, <code>1.x</code>, <code>1.2.x</code>, <code>*</code>.</li></ul>
<p>Return the version string or <code>null</code>.</p>`,
    constraints: `≤ 10<sup>5</sup> versions (unsorted), plain <code>MAJOR.MINOR.PATCH</code> only, range ≤ 200 chars.`,
    example: `<p>versions = <code>['1.2.0', '1.9.3', '2.0.0', '2.4.1', '3.0.0']</code>, range = <code>'^1.5.0 || &gt;=2.1.0 &lt;3'</code></p>
<p>Set 1 matches ${H.c('g', '1.9.3')}; set 2 matches ${H.c('g', '2.4.1')} (note <code>&lt;3</code> means &lt;3.0.0). Highest → ${H.c('g', '2.4.1')}.</p>`,
    brute: { why: `<p>Sorting versions as strings and picking the last one that "starts with the major" ignores <code>||</code>, inequality comparators and numeric ordering (<code>'1.10.0' &lt; '1.9.0'</code> as text).</p>`, code: R`function maxBrute(versions, range) {
  var major = range.replace(/[^\d.]/g, '').split('.')[0];
  var ok = versions.filter(function (v) { return v.split('.')[0] === major; }).sort();
  return ok[ok.length - 1] || null;            // string sort + ignores || and < >
}
console.log(maxBrute(['1.9.3', '1.10.0', '2.4.1'], '^1.5.0 || >=2.1.0 <3'));   // '1.9.3' -- wrong twice` },
    mcq: { q: '<code>&gt;=1.2.0 &lt;2</code> — what is the exclusive upper bound?', options: ['2.9.9', '2.0.0', '1.9.9', '3.0.0'], answer: 1, explain: 'A partial version in <code>&lt;2</code> fills missing parts with zeros: &lt;2.0.0.' },
    hints: [`<p><b>Hint 1:</b> compile the range once into a list of sets; each set is a list of simple comparators <code>{ op, ver }</code> with op in <code>&gt;= &gt; &lt;= &lt; =</code>. Shorthands (^, ~, x) expand into a <code>&gt;=</code> and a <code>&lt;</code>.</p>`, `<p><b>Hint 2:</b> then for each version: parse once, test <code>sets.some(set =&gt; set.every(test))</code>, and keep a running maximum with numeric comparison — no need to sort.</p>`, `<p><b>Hint 3:</b> partial versions like <code>&lt;3</code> or <code>&gt;=2.1</code>: pad missing parts with 0. Wildcards: <code>1.x</code> → [&gt;=1.0.0, &lt;2.0.0]; <code>*</code> → [&gt;=0.0.0].</p>`],
    solution: {
      approach: `<p>Compile-then-scan. Compilation turns the human syntax into primitive comparators; the scan is O(N) with a running max, so no O(N log N) sort is needed.</p>`,
      code: { lang: 'js', run: true, code: R`function parseV(s) {
  var p = s.split('.').map(Number);
  while (p.length < 3) p.push(0);                       // '<3' -> 3.0.0
  return p;
}
function cmp(a, b) { for (var i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1; return 0; }

function compileToken(tok) {
  var m;
  if (tok === '*' || tok === 'x') return [{ op: '>=', v: [0, 0, 0] }];
  if ((m = /^\^(\d+(?:\.\d+){0,2})$/.exec(tok))) {
    var c = parseV(m[1]);
    var hi = c[0] > 0 ? [c[0] + 1, 0, 0] : c[1] > 0 ? [0, c[1] + 1, 0] : [0, 0, c[2] + 1];
    return [{ op: '>=', v: c }, { op: '<', v: hi }];
  }
  if ((m = /^~(\d+(?:\.\d+){0,2})$/.exec(tok))) {
    var t = parseV(m[1]);
    return [{ op: '>=', v: t }, { op: '<', v: [t[0], t[1] + 1, 0] }];
  }
  if ((m = /^(\d+)\.[x*]$/.exec(tok))) return [{ op: '>=', v: [+m[1], 0, 0] }, { op: '<', v: [+m[1] + 1, 0, 0] }];
  if ((m = /^(\d+)\.(\d+)\.[x*]$/.exec(tok))) return [{ op: '>=', v: [+m[1], +m[2], 0] }, { op: '<', v: [+m[1], +m[2] + 1, 0] }];
  if ((m = /^(>=|<=|>|<|=)?(\d+(?:\.\d+){0,2})$/.exec(tok))) return [{ op: m[1] || '=', v: parseV(m[2]) }];
  throw new Error('Bad comparator: ' + tok);
}
function compile(range) {
  return range.split('||').map(function (set) {
    var toks = set.trim().replace(/(>=|<=|>|<|=)\s+/g, '$1').split(/\s+/).filter(Boolean);
    if (!toks.length) toks = ['*'];
    return toks.reduce(function (acc, t) { return acc.concat(compileToken(t)); }, []);
  });
}
function test(v, c) {
  var r = cmp(v, c.v);
  return c.op === '>=' ? r >= 0 : c.op === '>' ? r > 0 : c.op === '<=' ? r <= 0 : c.op === '<' ? r < 0 : r === 0;
}
function maxSatisfying(versions, range) {
  var sets = compile(range), best = null, bestV = null;
  versions.forEach(function (s) {
    var v = parseV(s);
    var ok = sets.some(function (set) { return set.every(function (c) { return test(v, c); }); });
    if (ok && (!bestV || cmp(v, bestV) > 0)) { best = s; bestV = v; }
  });
  return best;
}

var vs = ['1.2.0', '1.9.3', '1.10.0', '2.0.0', '2.4.1', '3.0.0'];
console.log(maxSatisfying(vs, '^1.5.0 || >=2.1.0 <3'));   // 2.4.1
console.log(maxSatisfying(vs, '^1.5.0'));                 // 1.10.0 (numeric, not text!)
console.log(maxSatisfying(vs, '~1.2.0'));                 // 1.2.0
console.log(maxSatisfying(vs, '>= 2.0.0 <= 2.0.0'));      // 2.0.0 (spaces after operators)
console.log(maxSatisfying(vs, '>3.0.0'));                 // null` },
      dry: { head: ['version', 'set 1: ≥1.5.0 &lt;2.0.0', 'set 2: ≥2.1.0 &lt;3.0.0', 'match?', 'best so far'], rows: [
        ['1.2.0', 'no', 'no', 'no', 'null'],
        ['1.9.3', 'yes', 'no', 'yes', '1.9.3'],
        ['1.10.0', 'yes', 'no', 'yes', '1.10.0'],
        ['2.4.1', 'no', 'yes', 'yes', '<span class="c-g">2.4.1</span>'],
        ['3.0.0', 'no', 'no (not &lt;3.0.0)', 'no', '2.4.1']
      ] },
      complexity: `<p>Compile O(L) for range length L; scan O(N · C) for N versions and C comparators (C is tiny), so effectively O(N). No sorting needed.</p>`,
      followUps: ['Add pre-release handling (<code>2.0.0-rc.1</code> only matches ranges that mention a pre-release of the same tuple).', 'npm also respects <code>dist-tags</code> like <code>latest</code> — how does that interact with ranges?', 'Hyphen ranges: <code>1.2 - 2.3.4</code>.']
    }
  });

  practice.push({
    title: 'Write a structuredClone Fallback (cycles, Date, Map, Set)',
    level: 'Hard', tags: ['deep clone', 'portable', 'recursion', 'WeakMap'], companies: ['Meta', 'Amazon', 'Walmart'],
    statement: `<p><code>structuredClone</code> is a web-standard global (browsers, Node 17+, Deno, Bun), but some older or locked-down environments lack it. Write <code>deepClone(value)</code> that copies: primitives, plain objects, arrays, <code>Date</code>, <code>RegExp</code>, <code>Map</code>, <code>Set</code>, and handles <b>cycles and shared references</b> (the clone keeps the same shape of sharing). Like the real thing, throw an error named <code>DataCloneError</code> for functions and symbols.</p>`,
    constraints: `Object graph ≤ 10<sup>5</sup> nodes; depth may be large (prefer no recursion limit issues, but recursion is acceptable here). Prototypes of class instances are not preserved (plain objects come back), matching structuredClone.`,
    example: `<p><code>const a = { d: new Date(0), list: [1, 2] }; a.self = a;</code> → clone <code>c</code> with ${H.c('g', 'c.self === c')}, ${H.c('g', 'c.d instanceof Date')}, ${H.c('g', 'c !== a')}.</p>`,
    brute: { why: `<p><code>JSON.parse(JSON.stringify(x))</code>: Dates become strings, Map/Set become <code>{}</code>, <code>undefined</code> disappears, <code>NaN</code> becomes <code>null</code>, and a cycle throws <code>TypeError: Converting circular structure to JSON</code>.</p>`, code: R`var a = { d: new Date(0), m: new Map([['k', 1]]), u: undefined };
var c = JSON.parse(JSON.stringify(a));
console.log(typeof c.d, c.m, 'u' in c);        // string {} false
a.self = a;
try { JSON.stringify(a); } catch (e) { console.log(e.name); }   // TypeError` },
    mcq: { q: 'Which data structure lets the clone handle cycles?', options: ['A stack of keys', 'A Map/WeakMap from original object → its clone', 'A Set of visited keys', 'JSON'], answer: 1, explain: 'Before recursing into an object, record original → clone. If you meet the original again, return the recorded clone instead of copying again.' },
    hints: [`<p><b>Hint 1:</b> primitives (and <code>null</code>) are returned as-is; functions and symbols throw. Everything else is an object to copy.</p>`, `<p><b>Hint 2:</b> keep a <code>WeakMap</code> original → clone. <b>Register the empty clone before filling it</b>, so a child pointing back at the parent finds it.</p>`, `<p><b>Hint 3:</b> branch on type: Date → new Date(time); RegExp → new RegExp(source, flags); Map → set clone(k), clone(v); Set → add clone(v); Array → index loop; plain object → own enumerable string keys.</p>`],
    solution: {
      approach: `<p>Recursive copy with a memo table. The memo makes cycles terminate and preserves shared references (two properties pointing at the same object still point at one shared clone). Compare with the real <code>structuredClone</code> when available.</p>`,
      code: { lang: 'js', run: true, code: R`function deepClone(value, memo) {
  memo = memo || new WeakMap();
  var t = typeof value;
  if (t === 'function' || t === 'symbol') {
    var err = new Error(String(value).slice(0, 30) + ' could not be cloned.');
    err.name = 'DataCloneError';
    throw err;
  }
  if (value === null || t !== 'object') return value;           // primitives
  if (memo.has(value)) return memo.get(value);                  // cycle / shared ref

  var out;
  if (value instanceof Date) { out = new Date(value.getTime()); memo.set(value, out); return out; }
  if (value instanceof RegExp) { out = new RegExp(value.source, value.flags); memo.set(value, out); return out; }
  if (value instanceof Map) {
    out = new Map(); memo.set(value, out);                      // register BEFORE filling
    value.forEach(function (v, k) { out.set(deepClone(k, memo), deepClone(v, memo)); });
    return out;
  }
  if (value instanceof Set) {
    out = new Set(); memo.set(value, out);
    value.forEach(function (v) { out.add(deepClone(v, memo)); });
    return out;
  }
  out = Array.isArray(value) ? new Array(value.length) : {};
  memo.set(value, out);
  Object.keys(value).forEach(function (k) { out[k] = deepClone(value[k], memo); });
  return out;
}

var shared = { tag: 'shared' };
var a = { d: new Date(0), re: /ab+c/gi, m: new Map([['k', shared]]), s: new Set([1, shared]), list: [1, 2, shared], u: undefined, n: NaN };
a.self = a;
var c = deepClone(a);
console.log(c !== a, c.self === c, c.d instanceof Date, c.d.getTime());
console.log(c.m.get('k') === c.list[2], c.list[2] !== shared);   // sharing preserved, but copied
console.log(c.re.flags, 'u' in c, Number.isNaN(c.n));
try { deepClone({ f: function () {} }); } catch (e) { console.log(e.name); }
if (typeof structuredClone === 'function') {
  var real = structuredClone({ d: new Date(0), m: new Map([[1, 2]]) });
  console.log('native agrees:', real.d instanceof Date && real.m.get(1) === 2);
}` },
      dry: { head: ['visit', 'memo before', 'action'], rows: [
        ['a (object)', '{}', 'create {} and memo a → c'],
        ['a.d (Date)', '{a}', 'new Date(0)'],
        ['a.m → shared', '{a, m}', 'clone shared → s′ and memo it'],
        ['a.list[2] → shared', '{a, m, shared}', 'memo hit → reuse s′'],
        ['a.self → a', '{…}', 'memo hit → c (cycle closed)']
      ] },
      complexity: `<p>O(N) time and space over N reachable values (each object copied once thanks to the memo).</p>`,
      followUps: ['Make it iterative (explicit stack) for very deep structures.', 'Support typed arrays and ArrayBuffer.', 'What does real <code>structuredClone</code> do with class instances, getters and Error objects?']
    }
  });
  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push(
    { q: 'Which statement best describes the difference between a JS <b>engine</b> and a JS <b>runtime</b>?', options: ['They are the same thing', 'The engine runs the language; the runtime = engine + host APIs + event loop', 'The runtime compiles JS; the engine only interprets it', 'The engine is for browsers, the runtime is for servers'], answer: 1, explain: 'V8 / SpiderMonkey / JavaScriptCore execute ECMAScript. Browsers, Node, Deno and Bun wrap an engine and add APIs (DOM, fs, fetch, timers) plus an event loop.' },
    { q: 'Which of these is <b>not</b> defined by the ECMAScript language spec?', options: ['<code>Array.prototype.map</code>', '<code>Promise</code>', '<code>console.log</code>', '<code>JSON.parse</code>'], answer: 2, explain: '<code>console</code> is a host API (WHATWG Console standard) that every runtime provides, but the language spec does not define it.' },
    { q: 'Which engine does Bun use?', options: ['V8', 'SpiderMonkey', 'JavaScriptCore', 'Hermes'], answer: 2, explain: 'Bun embeds JavaScriptCore (Safari\'s engine). Node and Deno embed V8; Firefox uses SpiderMonkey; React Native uses Hermes.' },
    { q: 'In Node (CommonJS), what does <code>typeof setTimeout(() =&gt; {}, 0)</code> print?', options: ['number', 'object', 'function', 'undefined'], answer: 1, explain: 'Node returns a <code>Timeout</code> object (with <code>unref()</code>/<code>ref()</code>). Browsers return a number.' },
    { q: 'In a <b>classic</b> browser script, which top-level declaration creates a property on <code>window</code>?', options: ['<code>let a = 1</code>', '<code>const a = 1</code>', '<code>class A {}</code>', '<code>var a = 1</code>'], answer: 3, explain: 'Top-level <code>var</code> and function declarations go on the global object. let/const/class live in the global lexical scope (global, but not properties).' },
    { q: 'What is top-level <code>this</code> in an ES module?', options: ['<code>window</code>', '<code>globalThis</code>', '<code>undefined</code>', '<code>module.exports</code>'], answer: 2, explain: 'Modules are strict and top-level <code>this</code> is <code>undefined</code>. In Node CommonJS it is <code>module.exports</code>; in a classic browser script it is <code>window</code>.' },
    { q: '<code>&lt;script type="module" src="main.js"&gt;</code> without other attributes behaves like…', options: ['a blocking classic script', 'a <code>defer</code> script', 'an <code>async</code> script', 'an inline script'], answer: 1, explain: 'Module scripts are deferred by default: downloaded in parallel, executed after HTML parsing, in order. Add <code>async</code> to run them as soon as ready.' },
    { q: 'Node treats <code>src/app.js</code> as an ES module when…', options: ['it contains the word import', 'the nearest package.json has <code>"type": "module"</code>', 'it is inside src/', 'Node always treats .js as ESM'], answer: 1, explain: '<code>.mjs</code> is always ESM and <code>.cjs</code> always CommonJS. For <code>.js</code>, the nearest package.json <code>"type"</code> decides (recent Node can also detect ESM syntax as a fallback, but be explicit).' },
    { q: 'Which range accepts <code>1.9.0</code> but rejects <code>2.0.0</code> and <code>1.4.1</code>?', options: ['<code>~1.4.2</code>', '<code>^1.4.2</code>', '<code>1.4.2</code>', '<code>&gt;=1.4.2</code>'], answer: 1, explain: '<code>^1.4.2</code> = &gt;=1.4.2 &lt;2.0.0. Tilde stops at &lt;1.5.0; exact accepts only 1.4.2; &gt;= accepts 2.0.0.' },
    { q: 'Your CI should install dependencies with…', options: ['<code>npm install</code>', '<code>npm ci</code>', '<code>npm update</code>', '<code>npx install</code>'], answer: 1, explain: '<code>npm ci</code> installs exactly what package-lock.json says, fails on mismatch, and starts from a clean node_modules — reproducible builds.' },
    { q: 'Where does Node look for <code>require(\'dayjs\')</code> from <code>/app/src/x.js</code>?', options: ['Only /app/src/node_modules', 'A global folder only', '/app/src/node_modules, then /app/node_modules, then /node_modules', 'The current working directory only'], answer: 2, explain: 'Bare specifiers walk up the folder tree trying each <code>node_modules</code> (after checking core modules).' },
    { q: 'You need to pause only when <code>order.id === 7731</code> inside a loop of 50,000 items. Best tool?', options: ['50,000 console.logs', 'A conditional breakpoint', 'alert()', 'Restarting the server'], answer: 1, explain: 'Conditional breakpoints pause only when the expression is truthy, giving full scope and call stack at the exact moment.' },
    { q: 'How do you debug a Node server with Chrome DevTools?', options: ['It is impossible', '<code>node --inspect server.js</code> then open <code>chrome://inspect</code>', 'Add <code>alert()</code> calls', 'Run it inside a browser tab'], answer: 1, explain: '<code>--inspect</code> (or <code>--inspect-brk</code> to stop on line 1) opens the inspector protocol; Chrome connects through chrome://inspect.' },
    { q: 'Which API would make a "universal" helper <b>not</b> portable to the browser?', options: ['<code>fetch</code>', '<code>new URL()</code>', '<code>Buffer.from()</code>', '<code>structuredClone</code>'], answer: 2, explain: '<code>Buffer</code> is Node-only. Use <code>Uint8Array</code> + <code>TextEncoder</code> for portable binary data.' }
  );
  /* =====================================================================
     INTERVIEW
     ===================================================================== */
  interview.push(
    { q: 'What is the difference between a JavaScript engine and a JavaScript runtime?', level: 'B', a: `<p>An <b>engine</b> (V8, SpiderMonkey, JavaScriptCore, Hermes) implements the ECMAScript language: it parses, compiles (interpreter + JIT), executes code, and manages memory with a garbage collector. It knows nothing about screens, files or networks.</p><p>A <b>runtime</b> (host environment) embeds an engine and adds <b>host APIs</b> (DOM and <code>window</code> in browsers; <code>fs</code>, <code>process</code>, <code>http</code> in Node), an <b>event loop</b> with task queues, and I/O machinery (libuv in Node). Example: Chrome and Node both use V8, but only Chrome has <code>document</code> and only Node has <code>require('fs')</code>.</p>`, followUps: ['Is <code>setTimeout</code> part of JavaScript?', 'Name a runtime that uses a non-V8 engine.', 'Where does the event loop live — engine or host?'] },
    { q: 'Node.js is "single-threaded". How can it handle thousands of concurrent connections?', level: 'I', a: `<p>Only <b>your JavaScript</b> runs on one main thread. Node's host layer, <b>libuv</b>, uses the OS's non-blocking I/O (epoll on Linux, kqueue on macOS, IOCP on Windows) for sockets, so one thread can watch thousands of connections, and a small <b>thread pool</b> (default 4) for work without good async OS APIs: file system, DNS lookup, some crypto and zlib. When I/O completes, callbacks are queued and the event loop runs them on the main thread. The catch: CPU-heavy JS (big JSON parsing, image work) blocks everyone — move it to <code>worker_threads</code> or another service.</p>`, followUps: ['What is <code>UV_THREADPOOL_SIZE</code>?', 'How do you detect event-loop blocking in production?', 'Workers vs cluster vs child processes?'] },
    { q: 'Which APIs are available in both browsers and Node today, and why does that matter?', level: 'I', a: `<p>Modern Node ships many <b>web-standard</b> globals: <code>fetch</code>/<code>Request</code>/<code>Response</code>/<code>Headers</code>, <code>URL</code>/<code>URLSearchParams</code>, <code>AbortController</code>, <code>TextEncoder</code>/<code>TextDecoder</code>, <code>structuredClone</code>, Web Crypto (<code>crypto.subtle</code>, <code>crypto.randomUUID</code>), <code>EventTarget</code>, Web Streams, <code>Blob</code>, <code>BroadcastChannel</code>, timers, <code>queueMicrotask</code> and (Node 22+) <code>WebSocket</code>. Deno, Bun and edge platforms implement the same set (the WinterTC "minimum common API").</p><p>It matters because code limited to engine built-ins + these APIs is <b>portable</b>: the same validation, API client or crypto helper runs on the server, in the browser and at the edge. Differences remain in details (CORS and cookies in browser fetch, Timeout objects in Node).</p>`, followUps: ['How does fetch differ between Node and browsers?', 'What is an "isomorphic" or "universal" library?'] },
    { q: 'Explain globalThis, window, self and global. What lands on the global object?', level: 'B', a: `<p>They are names for the <b>global object</b>: <code>window</code> on a browser page, <code>self</code> in browsers and workers, <code>global</code> in Node, and <code>globalThis</code> — the ES2020 standard name that works everywhere and should be the default choice.</p><p>What lands on it: in a <b>classic script</b>, top-level <code>var</code> and function declarations become properties (so <code>var name</code> collides with <code>window.name</code>), while let/const/class are global but <b>not</b> properties. In <b>modules</b> and <b>CommonJS files</b> top-level declarations are local. Anywhere in sloppy mode, assigning to an undeclared variable creates an implicit global; strict mode throws a ReferenceError instead.</p>`, followUps: ['What is top-level <code>this</code> in a module vs CommonJS?', 'Why can <code>arr instanceof Array</code> be false for an array from an iframe?'] },
    { q: 'What are the differences between a classic script and an ES module in the browser?', level: 'I', a: `<p>Module scripts (<code>type="module"</code>): have their own top-level scope; are always strict; support <code>import</code>/<code>export</code> and top-level <code>await</code>; have <code>this === undefined</code> and <code>import.meta</code>; are <b>deferred</b> by default; execute <b>once</b> per URL even if included twice; are fetched with CORS (so <code>file://</code> pages fail). Classic scripts share the global scope, are sloppy unless opted into strict mode, block parsing unless <code>defer</code>/<code>async</code>, and run every time they are included.</p><p>Practical impact: modules prevent global collisions and enable static analysis (tree shaking), but deep unbundled graphs cause request waterfalls, so production usually still bundles.</p>`, followUps: ['defer vs async — when do you use each?', 'What is an import map?', 'What does <code>nomodule</code> do?'] },
    { q: 'Compare CommonJS and ES modules in Node.', level: 'I', a: `<p><b>CommonJS</b>: <code>require</code>/<code>module.exports</code>, loaded <b>synchronously</b> when the require line runs, each file wrapped in a function giving <code>exports, require, module, __filename, __dirname</code>; exports are a plain object (values are copied when destructured); cycles yield partially filled exports. <b>ESM</b>: <code>import</code>/<code>export</code>, the graph is parsed and linked before evaluation, <b>live bindings</b>, strict mode, top-level await, <code>import.meta.url/dirname/filename</code>, file extensions required.</p><p>Which is used: <code>.mjs</code>/<code>.cjs</code> force it; for <code>.js</code>, package.json <code>"type"</code>. Interop: ESM imports CJS (module.exports becomes the default); CJS can <code>await import()</code> ESM and, in recent Node, <code>require()</code> ESM without top-level await. Library authors publish via the <code>exports</code> map with <code>import</code>/<code>require</code> conditions.</p>`, followUps: ['What is the "dual package hazard"?', 'Why does tree shaking work better with ESM?', 'How do you get __dirname in ESM?'] },
    { q: 'In what order do ES modules evaluate? Walk through a cycle.', level: 'A', a: `<p>Three phases: <b>construction</b> (fetch + parse all modules, discover imports), <b>linking</b> (bind imports to exporters' bindings, catch missing names), <b>evaluation</b> — a depth-first <b>post-order</b> walk from the entry: a module runs after all its dependencies, imports visited in source order, each module exactly once.</p><p>Cycle main → a → b → a: DFS reaches b while a is still "evaluating", so b runs first. If b reads a <code>const</code>/<code>let</code>/<code>class</code> exported by a at top level, it throws a <b>TDZ ReferenceError</b> because a hasn't initialised it yet; function declarations are fine because they are initialised during linking. Fixes: move shared values into a third module, read the binding lazily inside a function, or use dynamic <code>import()</code>.</p>`, followUps: ['How does top-level await change evaluation?', 'How would the same cycle behave in CommonJS?'] },
    { q: 'Explain package.json, semver ranges and the lockfile. Why does "works on my machine" happen?', level: 'B', a: `<p><code>package.json</code> declares the project (name, version, scripts, <code>type</code>, entry points) and its <b>dependencies</b> as <b>ranges</b>: <code>^1.4.2</code> means &gt;=1.4.2 &lt;2.0.0 (for 0.x the caret is stricter), <code>~1.4.2</code> means &gt;=1.4.2 &lt;1.5.0. Ranges allow different installs to pick different versions over time.</p><p><code>package-lock.json</code> records the <b>exact</b> resolved version and integrity hash of every package in the tree. "Works on my machine" usually means the lockfile wasn't committed, or CI ran <code>npm install</code> (which may re-resolve) instead of <code>npm ci</code>, or different Node versions (<code>engines</code>, <code>.nvmrc</code>) were used.</p>`, followUps: ['dependencies vs devDependencies vs peerDependencies?', 'When would you pin an exact version?'] },
    { q: 'How does Node resolve <code>import x from \'some-pkg\'</code>?', level: 'A', a: `<p>1) If it is a <b>core module</b> (<code>fs</code> or <code>node:fs</code>) return the built-in. 2) If it starts with <code>./</code>, <code>../</code> or <code>/</code>, resolve it as a path (ESM needs the exact file with extension; CJS tries extensions and <code>index.js</code>). 3) Otherwise it is a <b>bare specifier</b>: walk up from the importing file's folder trying <code>node_modules/some-pkg</code> in each ancestor. 4) In the package folder read <code>package.json</code>: the <code>exports</code> map (with conditions like <code>import</code>, <code>require</code>, <code>node</code>, <code>default</code>) wins; otherwise <code>main</code>, otherwise <code>index.js</code>. Unlisted subpaths are blocked when <code>exports</code> exists (ERR_PACKAGE_PATH_NOT_EXPORTED). Package <code>imports</code> (<code>#internal</code> aliases) and self-referencing are also supported.</p>`, followUps: ['What is a phantom dependency and how does pnpm prevent it?', 'How do bundlers and TypeScript (moduleResolution) mirror this?'] },
    { q: 'Walk me through how you debug a bug in a web app using DevTools.', level: 'I', a: `<p>1) <b>Reproduce</b> reliably and read the Console error and stack trace (find the first frame in my code). 2) Check the <b>Network</b> panel for failing requests (status, payload, CORS). 3) In <b>Sources</b>, set a breakpoint (or conditional breakpoint / logpoint) near the symptom, or enable <b>pause on exceptions</b>. 4) When paused, inspect <b>Scope</b>, <b>Call Stack</b> and <b>Watch</b> expressions; step over/into/out to see where state goes wrong. 5) Form a hypothesis, fix, verify, and add a regression test. For production code I rely on <b>source maps</b> so stack traces map to original TypeScript. For Node I use <code>node --inspect</code> + chrome://inspect or the VS Code debug terminal.</p>`, followUps: ['How do you find a memory leak?', 'Why is pausing a production Node process dangerous?', 'What is a logpoint?'] },
    { q: 'Your utility library must run in browsers, Node, Deno, Bun and Cloudflare Workers. How do you design it?', level: 'A', a: `<p>Restrict the core to <b>engine built-ins + web-standard APIs</b> (fetch, URL, TextEncoder, Web Crypto, streams, structuredClone). Isolate anything runtime-specific (file system, Buffer, DOM) behind small adapters with one file per platform, selected by the package <code>exports</code> conditions (<code>"browser"</code>, <code>"node"</code>, <code>"workerd"</code>, <code>"default"</code>) rather than runtime <code>if</code>s. Use <b>feature detection</b> (<code>typeof globalThis.X</code>) where conditions aren't enough. Ship ESM (optionally CJS), avoid top-level side effects so it tree-shakes, test on every target in CI (e.g. Node + a headless browser + workerd/Miniflare), and lint with <code>node:</code>-prefix rules to catch accidental Node imports.</p>`, followUps: ['Feature detection vs user-agent / runtime sniffing?', 'How do you test in multiple runtimes cheaply?'] },
    { q: 'What security differences exist between running JS in a browser and in Node, and what does that mean for npm?', level: 'E', a: `<p>The browser is a <b>sandbox</b> for untrusted code: same-origin policy, CORS, CSP, permission prompts, site isolation, no file or process access. Node runs code with the <b>full privileges</b> of the OS user: it can read SSH keys, environment secrets and spawn processes (an opt-in permission model exists, and Deno is deny-by-default).</p><p>So every npm dependency — and its install scripts (<code>postinstall</code>) — is code you execute with those privileges. Supply-chain attacks (typosquatting, hijacked maintainer accounts, worms that steal tokens and republish) target exactly this. Mitigations: lockfiles + <code>npm ci</code>, minimal dependencies, review and pin, <code>--ignore-scripts</code> / allow-lists for build scripts, <code>npm audit</code> and SCA tooling, 2FA and trusted publishing with provenance for your own packages, least-privilege CI tokens, and sandboxing AI agents that can install packages.</p>`, followUps: ['What is slopsquatting?', 'How does Node\'s permission model work?', 'What is npm provenance?'] },
    { q: 'Why might <code>console.log(obj)</code> in Chrome show a value that the object did not have when the line ran?', level: 'I', a: `<p>Chrome's console logs a <b>live reference</b>. The collapsed preview is captured at log time, but when you <b>expand</b> the object later, DevTools reads its <b>current</b> properties — so mutations after the log appear (an "i" badge notes "value below was evaluated just now"). Node formats the object to text immediately with <code>util.inspect</code>, so it shows the value at the time of the call. To capture a snapshot in the browser, log <code>JSON.stringify(obj)</code>, <code>structuredClone(obj)</code>, or set a breakpoint and inspect Scope at that moment.</p>`, followUps: ['How do you print deeply nested objects in Node (depth)?', 'What do <code>console.table</code> and <code>console.trace</code> do?'] }
  );
  registerModule({
    id: 'js03',
    title: 'JavaScript Runtimes: Browser vs Node',
    lang: 'js',
    intro: `<p>You have written JavaScript — but <b>what actually runs it</b>? This module pulls back the curtain. You will learn that the language itself is tiny (no timers, no printing, no files!) and that everything else comes from the <b>runtime</b> wrapped around a <b>JS engine</b>: the browser gives you the DOM and <code>window</code>; Node gives you files, processes and servers; both now share a growing set of web-standard APIs like <code>fetch</code> and <code>URL</code>.</p>
<p>We cover the global object (<code>window</code> vs <code>global</code> vs <code>globalThis</code>), classic scripts vs ES modules vs CommonJS (and the exact order modules load and run), npm and semantic versioning, how Node finds packages, and how to debug with DevTools in both the browser and Node. Every topic has a visualizer, "which runtime/API is this?" and "predict the output" practice, and an AI-era section on working alongside coding assistants without falling into runtime traps.</p>`,
    goals: [
      'Explain engine vs runtime with concrete examples (V8 in Chrome/Node/Deno, JavaScriptCore in Safari/Bun) and say which layer provides any API you see',
      'Classify APIs as engine built-in, web-standard (portable), browser-only or Node-only, and write feature-detection code that runs everywhere',
      'Predict what lands on the global object and what top-level <code>this</code> is in classic scripts, ES modules and CommonJS',
      'Predict ES module evaluation order (including cycles and TDZ errors) and choose between defer, async and type="module"',
      'Use npm confidently: package.json, scripts and hooks, semver ranges (^, ~, 0.x rules), lockfiles, npm ci, and node_modules resolution',
      'Debug like a pro with Console tools, breakpoints, Scope/Call Stack/Watch, the Network panel and <code>node --inspect</code>'
    ],
    prereqs: `JS 1 (Basics: Syntax, Types &amp; Operators) and JS 2 (Functions, Arrays &amp; Objects). Node.js installed (an Active LTS version) and a Chromium or Firefox browser for DevTools practice. No async or closure knowledge needed yet — the event loop is previewed here and covered fully in Async II.`,
    hours: 9,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
