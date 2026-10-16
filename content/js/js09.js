(function () {
  var topics = [], practice = [], quiz = [], interview = [];

  /* ---------- small helpers shared by the visualizers of this module ---------- */
  function F(narr, parts) { return { narr: narr, parts: parts }; }
  function C(label, code, hl) { return { type: 'code', label: label, lang: 'js', code: code, hl: hl || {} }; }
  function V(label, vals, hl) { return { type: 'vars', label: label, vals: vals, hl: hl || {} }; }
  function T(html, label) { return { type: 'text', label: label, html: html }; }
  function TB(label, columns, rows, hl) { return { type: 'table', label: label, columns: columns, rows: rows, hl: hl || {} }; }
  function MP(label, entries, hl) { return { type: 'map', label: label, entries: entries, hl: hl || {} }; }
  function OUT(lines) { return { type: 'array', label: 'console output', values: lines.length ? lines.slice() : ['(nothing yet)'] }; }

  /* =====================================================================
     TOPIC 1: ES Modules vs CommonJS
     ===================================================================== */
  var ESM_COUNTER = 'export let count = 0;\nexport function inc() { count++; }';
  var ESM_MAIN = "import { count, inc } from './counter.js';\nconsole.log(count);\ninc();\nconsole.log(count);\ncount = 5; // try to write an import";
  var CJS_COUNTER = 'let count = 0;\nfunction inc() { count++; }\nmodule.exports = { count, inc };';
  var CJS_MAIN = "const { count, inc } = require('./counter');\nconsole.log(count);\ninc();\nconsole.log(count);\nconst again = require('./counter');";

  function modGraph(kind, hl, ehl, tags) {
    var nodes = [
      { id: 'main', label: kind === 'esm' ? 'main.js (ESM)' : 'main.js (CJS)', x: 18, y: 22, shape: 'box' },
      { id: 'counter', label: 'counter.js', x: 70, y: 22, shape: 'box' }
    ];
    var edges = [['main', 'counter', kind === 'esm' ? 'static import' : 'require() at runtime']];
    if (kind === 'cjs') { nodes.push({ id: 'cache', label: 'require.cache', x: 70, y: 50, shape: 'box' }); edges.push(['counter', 'cache', 'stored once']); }
    else { nodes.push({ id: 'env', label: 'shared binding slot: count', x: 44, y: 50, shape: 'box' }); edges.push(['main', 'env', 'reads']); edges.push(['counter', 'env', 'owns']); }
    return { type: 'graph', label: kind === 'esm' ? 'ES module graph' : 'CommonJS loading', directed: true, height: 60, nodes: nodes, edges: edges, hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
  }

  function moduleFrames(input) {
    var mode = String(input || 'esm').trim().toLowerCase();
    if (mode !== 'esm' && mode !== 'cjs') throw new Error('Type esm or cjs');
    var fr = [];
    if (mode === 'esm') {
      fr.push(F('<b>Phase 1, Construction (parse).</b> Before running ANY line, the engine scans main.js for <code>import</code> statements. They are static (top level, plain string paths), so it can find and download counter.js first.',
        [modGraph('esm', { main: 'cur' }, { 'main-counter': 'win' }), C('main.js', ESM_MAIN, { 1: 'cur' }), C('counter.js', ESM_COUNTER), OUT([])]));
      fr.push(F('<b>Phase 2, Linking (instantiate).</b> Each module gets an environment record. The <code>count</code> that main imports is wired to the <b>same memory slot</b> that counter.js owns. Nothing has run yet, so the slot is uninitialized (temporal dead zone).',
        [modGraph('esm', { env: 'cur' }, { 'main-env': 'ok', 'counter-env': 'ok' }), V('binding slots', { 'counter.count': '&lt;uninitialized&gt;', 'main sees count →': 'same slot' }, { 'counter.count': 'cur' }), OUT([])]));
      fr.push(F('<b>Phase 3, Evaluation.</b> Dependencies run first (depth-first, post-order). counter.js runs: <code>count = 0</code>, and <code>inc</code> is ready.',
        [modGraph('esm', { counter: 'cur' }), C('counter.js', ESM_COUNTER, { 1: 'cur' }), V('binding slots', { 'counter.count': 0 }, { 'counter.count': 'ok' }), OUT([])]));
      fr.push(F('Now main.js runs. <code>console.log(count)</code> reads the shared slot and prints <b>0</b>.',
        [C('main.js', ESM_MAIN, { 2: 'cur' }), V('binding slots', { 'counter.count': 0, 'main reads': 0 }), OUT(['0'])]));
      fr.push(F('<code>inc()</code> runs <b>inside counter.js</b> and bumps its own <code>count</code> to 1. Because main does not hold a copy, it will see the change.',
        [C('main.js', ESM_MAIN, { 3: 'cur' }), C('counter.js', ESM_COUNTER, { 2: 'cur' }), V('binding slots', { 'counter.count': 1 }, { 'counter.count': 'ok' }), OUT(['0'])]));
      fr.push(F('<code>console.log(count)</code> prints <b>1</b>. This is a <b>live binding</b>: an import is a read-only window onto the exporter\'s variable, not a snapshot.',
        [C('main.js', ESM_MAIN, { 4: 'ok' }), modGraph('esm', { env: 'ok' }, { 'main-env': 'ok' }), V('binding slots', { 'counter.count': 1, 'main reads': 1 }, { 'main reads': 'ok' }), OUT(['0', '1'])]));
      fr.push(F('<code>count = 5</code> in main throws <b>TypeError: Assignment to constant variable</b>. Imports are read-only from the importer\'s side; only the owner (counter.js) may change it.',
        [C('main.js', ESM_MAIN, { 5: 'bad' }), T('<span class="c-r">TypeError: Assignment to constant variable.</span> Fix: export a setter function and call it.'), OUT(['0', '1'])]));
      fr.push(F('<b>Summary:</b> ESM = static structure known before running → enables tree-shaking, live bindings, top-level await, strict mode by default, and async loading in browsers.',
        [TB('ESM recap', ['feature', 'ESM'], [['when imports resolve', 'before any code runs'], ['what you get', 'live read-only binding'], ['loading', 'async (can fetch over network)'], ['top-level this', 'undefined']]), OUT(['0', '1'])]));
    } else {
      fr.push(F('Node wraps main.js in a function: <code>(function (exports, require, module, __filename, __dirname) { ... })</code> and calls it. Nothing is known about dependencies in advance.',
        [modGraph('cjs', { main: 'cur' }), C('main.js', CJS_MAIN, {}), OUT([])]));
      fr.push(F('Line 1 calls <code>require(\'./counter\')</code>. main.js <b>pauses</b> and counter.js is read from disk and executed <b>synchronously, right now</b>.',
        [modGraph('cjs', { counter: 'cur' }, { 'main-counter': 'cur' }), C('main.js', CJS_MAIN, { 1: 'cur' }), C('counter.js', CJS_COUNTER, { 1: 'cur' }), OUT([])]));
      fr.push(F('counter.js builds <code>module.exports = { count, inc }</code>. The object literal <b>copies the current value</b> of count (0) into a property. From now on, exports.count and the inner variable are separate.',
        [C('counter.js', CJS_COUNTER, { 3: 'cur' }), V('memory', { 'inner count': 0, 'module.exports.count': 0 }, { 'module.exports.count': 'cur' }), OUT([])]));
      fr.push(F('The result is cached in <code>require.cache</code> by absolute filename, then returned. main destructures it, so main\'s <code>count</code> is <b>another copy</b> (0).',
        [modGraph('cjs', { cache: 'ok' }, { 'counter-cache': 'ok' }), V('memory', { 'inner count': 0, 'module.exports.count': 0, 'main count': 0 }, { 'main count': 'ok' }), OUT([])]));
      fr.push(F('<code>console.log(count)</code> prints <b>0</b>.',
        [C('main.js', CJS_MAIN, { 2: 'cur' }), V('memory', { 'inner count': 0, 'module.exports.count': 0, 'main count': 0 }), OUT(['0'])]));
      fr.push(F('<code>inc()</code> changes the <b>inner</b> variable to 1. Neither the exports property nor main\'s copy changes.',
        [C('main.js', CJS_MAIN, { 3: 'cur' }), C('counter.js', CJS_COUNTER, { 2: 'cur' }), V('memory', { 'inner count': 1, 'module.exports.count': 0, 'main count': 0 }, { 'inner count': 'ok', 'main count': 'bad' }), OUT(['0'])]));
      fr.push(F('<code>console.log(count)</code> prints <b>0 again</b>. CommonJS hands you a <b>value copy</b> at require time. Fix: export a getter like <code>get count() { return count; }</code> or a function.',
        [C('main.js', CJS_MAIN, { 4: 'bad' }), V('memory', { 'inner count': 1, 'main count': 0 }, { 'main count': 'bad' }), OUT(['0', '0'])]));
      fr.push(F('A second <code>require(\'./counter\')</code> does NOT re-run counter.js: it returns the cached object. Modules are singletons per resolved path.',
        [C('main.js', CJS_MAIN, { 5: 'cur' }), modGraph('cjs', { cache: 'cur' }, { 'counter-cache': 'win' }), T('again === the first exports object → <b>true</b>'), OUT(['0', '0'])]));
      fr.push(F('<b>Summary:</b> CJS = dynamic <code>require</code> calls that run synchronously; you get whatever value <code>module.exports</code> held at that moment.',
        [TB('CJS recap', ['feature', 'CommonJS'], [['when imports resolve', 'when require() line runs'], ['what you get', 'a value (copy of the reference)'], ['loading', 'synchronous from disk'], ['top-level this', 'module.exports']]), OUT(['0', '0'])]));
    }
    return fr;
  }

  topics.push({
    title: 'ES Modules vs CommonJS',
    analogy: `<p>Think of <b>CommonJS</b> as ordering food <b>at the counter</b>: you walk up when you are hungry (<code>require()</code> runs at that line), wait while it is cooked (synchronous), and get a <b>plate</b> (a copy of whatever was ready at that moment). <b>ES Modules</b> are like a <b>restaurant menu printed in advance</b>: the kitchen reads the whole order list (<code>import</code> lines) before cooking anything, and instead of a plate you get a <b>window into the kitchen</b>, so if the chef changes the dish you see the change (a <i>live binding</i>).</p>`,
    explain: `<p>A <b>module</b> is just a file with its own private scope that chooses what to share. JavaScript has two module systems you must know:</p>
      ${H.table(['', 'CommonJS (CJS)', 'ES Modules (ESM)'], [
        ['Syntax', '<code>require()</code> / <code>module.exports</code>', '<code>import</code> / <code>export</code>'],
        ['Born in', 'Node.js (2009)', 'the language spec (ES2015)'],
        ['When deps load', 'when the require line runs', 'before any code runs (static)'],
        ['Loading', 'synchronous', 'asynchronous-capable'],
        ['You receive', 'a value copy of exports', 'a <b>live, read-only binding</b>'],
        ['Strict mode', 'only if you opt in', 'always on'],
        ['Top-level <code>await</code>', 'no', 'yes'],
        ['Tree-shaking', 'hard (dynamic)', 'easy (static)'],
        ['File clue in Node', '<code>.cjs</code> or no <code>"type"</code>', '<code>.mjs</code> or <code>"type": "module"</code>']
      ])}
      <p><b>How Node decides:</b> a <code>.mjs</code> file is always ESM, <code>.cjs</code> is always CJS, and a plain <code>.js</code> file follows the nearest <code>package.json</code> <code>"type"</code> field (<code>"module"</code> or <code>"commonjs"</code>, default commonjs). In browsers you opt in with <code>&lt;script type="module"&gt;</code>.</p>
      <p><b>Named vs default exports:</b> <code>export const a = 1</code> (named, imported with braces <code>{ a }</code>) vs <code>export default fn</code> (one per file, imported with any name). Named exports are friendlier to tooling and refactors.</p>
      <p><b>Dynamic import:</b> <code>import('./x.js')</code> is a function-like expression that returns a <b>Promise</b> of the module namespace. It works in both CJS and ESM and is how you code-split or load something conditionally.</p>`,
    clues: ['"Why does my imported counter not update?" → CommonJS value copy vs ESM live binding', '"tree-shaking", "dead code elimination", "bundle size" → static ESM imports', '"require is not defined in ES module scope" / "Cannot use import statement outside a module" → module type mismatch (.mjs/.cjs/"type")', '"load this only when the user clicks" / "code splitting" → dynamic <code>import()</code>', '"__dirname is not defined" → you are in ESM; use <code>import.meta.dirname</code> or <code>import.meta.url</code>', '"circular dependency returns undefined/partial object" → module evaluation order + caching'],
    code: [{ lang: 'js', title: 'CommonJS in action (runnable: simulated with a tiny registry)', run: true, code: `
      // Node wraps every CJS file like this. We imitate it to SEE what require does.
      const files = {
        counter: function (exports, require, module) {
          let count = 0;
          function inc() { count++; }
          module.exports = { count, inc, get live() { return count; } };
        }
      };
      const cache = {};
      function require(name) {
        if (cache[name]) return cache[name].exports;   // 2nd call: cached, file NOT re-run
        const module = { exports: {} };
        cache[name] = module;                          // cache BEFORE running (handles cycles)
        files[name](module.exports, require, module);  // run the file synchronously
        return module.exports;
      }

      const { count, inc } = require('counter');
      inc();
      console.log('copied count:', count);                  // 0  (value copy)
      console.log('getter count:', require('counter').live); // 1  (getter reads the inner variable)
      console.log('same object?', require('counter') === require('counter')); // true (singleton)
    ` }, { lang: 'js', title: 'The same idea in real ESM files (syntax only)', code: `
      // counter.js
      export let count = 0;
      export function inc() { count++; }
      export default function reset() { count = 0; }

      // main.js
      import reset, { count, inc } from './counter.js';
      import * as counterNs from './counter.js';    // namespace object (frozen, live)
      inc();
      console.log(count, counterNs.count);           // 1 1  (live bindings)
      reset();
      console.log(count);                            // 0

      // dynamic import: returns a Promise, works anywhere
      const { default: dayjs } = await import('dayjs'); // top-level await is ESM-only
      console.log(import.meta.url);                  // file:///.../main.js
    ` }],
    codeTitle: ['Simulated require()', 'ESM syntax tour'],
    viz: {
      title: 'Live binding (ESM) vs value copy (CJS)',
      input: 'esm',
      inputLabel: 'Module system: esm or cjs',
      gen: moduleFrames
    },
    examples: [
      { title: 'Predict the output: exports vs module.exports', html: `<p>In CJS, <code>exports</code> is just a shortcut variable pointing at <code>module.exports</code>. Re-assigning <code>exports</code> breaks the link, and <code>require</code> always returns <code>module.exports</code>.</p>${H.table(['line', 'module.exports', 'exports'], [['start', '{}', 'same {}'], ['exports.a = 1', '{ a: 1 }', 'same object'], ['exports = { b: 2 }', '{ a: 1 }', '<span class="c-r">new object, ignored</span>']])}<p>Output: ${H.c('g', '{ a: 1 }')}.</p>`, code: { lang: 'js', run: true, code: `
        // Node calls your file like this: fileBody(module.exports, require, module)
        function fileBody(exports, require, module) {
          exports.a = 1;                    // mutates the shared object: OK
          exports = { b: 2 };               // rebinds the LOCAL parameter only
        }
        const mod = { exports: {} };
        fileBody(mod.exports, null, mod);
        console.log(mod.exports);           // { a: 1 }  <- this is what require() returns
      ` } },
      { title: 'Circular dependency: the half-built object', html: `<p>a.js requires b.js, and b.js requires a.js back. Because the cache entry is created <b>before</b> a.js finishes, b.js receives a.js's <b>partially filled</b> exports. In ESM the same cycle gives a ${H.c('r', 'ReferenceError (TDZ)')} if b reads an a binding before a has evaluated, instead of a silent <code>undefined</code>.</p>`, code: { lang: 'js', run: true, code: `
        const files = {
          a(exports, require) { exports.early = 'a-early'; const b = require('b'); exports.late = 'a-late'; console.log('a sees b.done =', b.done); },
          b(exports, require) { const a = require('a'); console.log('b sees a =', JSON.stringify(a)); exports.done = true; }
        };
        const cache = {};
        function require(n) {
          if (cache[n]) return cache[n].exports;
          const m = (cache[n] = { exports: {} });
          files[n](m.exports, require, m);
          return m.exports;
        }
        require('a');
        // b sees a = {"early":"a-early"}   <- 'late' does not exist yet
        // a sees b.done = true
      ` } },
      { title: 'Interop rules you will be asked about', html: `<ul><li><b>ESM importing CJS:</b> works. <code>import pkg from './old.cjs'</code> gives <code>module.exports</code> as the default export; named imports work only when Node can statically detect them.</li><li><b>CJS requiring ESM:</b> since Node 22.12 / 20.19, <code>require(esm)</code> works for ESM graphs <b>without top-level await</b>; otherwise use <code>await import()</code>.</li><li><b>Dual packages:</b> the <code>"exports"</code> field in package.json maps <code>"import"</code> and <code>"require"</code> conditions to different files.</li><li><b>JSON:</b> <code>import data from './d.json' with { type: 'json' }</code> (import attributes, ES2025).</li></ul>`, code: { lang: 'json', code: `{
  "name": "my-lib",
  "type": "module",
  "exports": {
    ".": { "import": "./dist/index.js", "require": "./dist/index.cjs", "types": "./dist/index.d.ts" },
    "./utils": "./dist/utils.js"
  }
}` } }
    ],
    deepDive: `<p><b>The three ESM phases.</b> (1) <i>Construction</i>: find, fetch and parse every file into a <i>Module Record</i>; the import graph is fully known without executing code. (2) <i>Instantiation/Linking</i>: allocate environment slots for every export and point importers at those same slots (this is why bindings are live and why you cannot write to an import). (3) <i>Evaluation</i>: run each module's top-level code once, dependencies first (post-order DFS). A module with top-level <code>await</code> becomes async and its parents wait for it, but siblings can proceed.</p>
      <p><b>Why bundlers love ESM:</b> since imports cannot be inside <code>if</code> or computed at runtime, tools build the graph statically and drop unused exports (tree-shaking). Side-effectful modules defeat this, which is why libraries mark <code>"sideEffects": false</code>. <code>require(someVariable)</code> forces bundlers to include everything.</p>
      <p><b>Other differences that bite in production:</b> ESM has no <code>__dirname</code>, <code>__filename</code>, <code>require.cache</code> or <code>module</code>; use <code>import.meta.dirname</code> / <code>import.meta.filename</code> (Node 20.11+) and <code>createRequire(import.meta.url)</code> when you truly need require. ESM resolution in Node requires <b>full file extensions</b> for relative paths. The module namespace object (<code>import * as ns</code>) is frozen and has a <code>null</code> prototype and <code>Symbol.toStringTag</code> of <code>"Module"</code>. In the browser, module scripts are deferred by default and fetched with CORS. Hot cache invalidation is trivial in CJS (<code>delete require.cache[path]</code>) and deliberately impossible in ESM, which is why test runners use loaders/hooks for mocking.</p>`,
    aiEra: `<p><b>What AI changes:</b> assistants happily generate a mix of <code>require</code> and <code>import</code> in the same file, or ESM snippets with <code>__dirname</code>, because training data spans both eras. The error messages ("Cannot use import statement outside a module", "ERR_REQUIRE_ESM") are now the most common AI-introduced breakages in Node projects.</p>
      <p><b>Use AI as a partner:</b> <code>Convert this CJS file to ESM; list every behavioural difference (live bindings, __dirname, JSON imports, default interop)</code>. Ask it to generate the <code>"exports"</code> map for a dual package and then verify with <code>node -e "require('pkg')"</code> and <code>node --input-type=module -e "import 'pkg'"</code>.</p>
      <p><b>What you must still own:</b> knowing that the <code>"type"</code> field and file extension decide the system, reasoning about evaluation order in circular imports, and spotting when a "fixed" import silently turned a live binding into a stale copy.</p>`,
    problems: [{
      title: 'Build a Tiny require() with Caching and Cycle Safety',
      level: 'Medium', tags: ['modules', 'commonjs', 'cache', 'closures'], companies: ['Atlassian', 'Uber', 'Razorpay'],
      statement: `<p>You are given an object <code>files</code> mapping a module name to a function <code>(exports, require, module)</code>, exactly like Node's module wrapper. Write <code>createRequire(files)</code> that returns a <code>require(name)</code> function which: runs each module <b>once</b>, returns <code>module.exports</code>, caches results, supports <b>circular</b> requires (return the partially built exports instead of looping forever), and throws <code>Error('Cannot find module X')</code> for unknown names.</p>`,
      constraints: `Up to 1000 modules; module functions may call require recursively; modules may replace <code>module.exports</code> entirely.`,
      example: `<p><code>files = { a: (e, r) =&gt; { e.x = 1; r('b'); }, b: (e, r) =&gt; { e.seenA = r('a').x; } }</code></p><p><code>require('a')</code> returns ${H.c('g', '{ x: 1 }')} and <code>require('b')</code> returns ${H.c('g', '{ seenA: 1 }')}. Why: when b asks for a, a is already in the cache (half done, but <code>x</code> was set before the <code>r('b')</code> call), so b reads 1 instead of recursing forever.</p>`,
      brute: { why: `<p>The naive loader just calls the module function every time. It re-runs side effects on every require, returns a different exports object each time (no singleton), and a cycle a → b → a recurses until <b>"Maximum call stack size exceeded"</b>.</p>`,
        code: `
          function createRequireNaive(files) {
            return function require(name) {
              const module = { exports: {} };
              files[name](module.exports, require, module); // re-runs every time, cycles never end
              return module.exports;
            };
          }
        ` },
      mcq: { q: 'When must the module be put into the cache so that cycles terminate?', options: ['After the module function returns', 'Before calling the module function', 'Only on the second require', 'Never: detect cycles with a counter'], answer: 1, explain: 'If the cache entry exists before the body runs, a recursive require of the same name finds it and returns the partial exports immediately. This is exactly what Node does.' },
      hints: [
        `<p>Hint 1: A module is "an object with an <code>exports</code> property". Keep a <code>cache</code> map of name → that object.</p>`,
        `<p>Hint 2: Order matters: check cache → create <code>{ exports: {} }</code> → store in cache → run the file → return <code>module.exports</code> (read it AFTER running, the file may replace it).</p>`,
        `<p>Hint 3: Unknown name → throw before caching. If the module function throws, delete the cache entry so a retry can work (Node does this too). Recipe: lookup, guard, cache, run in try/catch, return.</p>`
      ],
      solution: {
        approach: `<p>Mirror Node's algorithm: a cache keyed by name holds module objects. The entry is created <b>before</b> executing the module so a circular <code>require</code> returns whatever has been exported so far. We return <code>module.exports</code> after execution so a file that does <code>module.exports = fn</code> works.</p>`,
        code: { lang: 'js', run: true, code: `
          function createRequire(files) {
            const cache = new Map();                    // name -> { exports, loaded }
            function require(name) {
              const hit = cache.get(name);
              if (hit) return hit.exports;              // cached OR currently loading (cycle)
              const fn = files[name];
              if (typeof fn !== 'function') throw new Error('Cannot find module ' + name);
              const module = { exports: {}, loaded: false };
              cache.set(name, module);                  // BEFORE running: breaks cycles
              try {
                fn(module.exports, require, module);
              } catch (err) {
                cache.delete(name);                     // failed load should not stay cached
                throw err;
              }
              module.loaded = true;
              return module.exports;                    // read after run: may have been replaced
            }
            require.cache = cache;
            return require;
          }

          const files = {
            a(exports, require) { exports.x = 1; require('b'); exports.y = 2; },
            b(exports, require) { exports.seenA = JSON.stringify(require('a')); },
            fn(exports, require, module) { module.exports = () => 'I replaced exports'; }
          };
          const req = createRequire(files);
          console.log(req('a'));            // { x: 1, y: 2 }
          console.log(req('b'));            // { seenA: '{"x":1}' }   partial view during the cycle
          console.log(req('fn')());         // I replaced exports
          console.log(req('a') === req('a')); // true
          try { req('nope'); } catch (e) { console.log(e.message); }
        ` },
        dry: { head: ['call', 'cache before', 'action', 'returns'], rows: [
          ['req(a)', '{}', 'cache a, run a: x = 1, calls req(b)', '(pending)'],
          ['req(b)', '{a (loading)}', 'cache b, run b, calls req(a)', '(pending)'],
          ['req(a) inside b', '{a, b}', '<span class="c-y">hit: a still loading</span>', '{ x: 1 }'],
          ['b finishes', '{a, b}', 'seenA = \'{"x":1}\'', '{ seenA }'],
          ['a finishes', '{a, b}', 'y = 2', '<span class="c-g">{ x: 1, y: 2 }</span>']
        ] },
        complexity: `<p>Each module runs once: O(total module work); each later require is an O(1) Map lookup. Space O(M) for M modules.</p>`,
        followUps: ['Resolve relative names like <code>./x</code> against the requiring module.', 'Add <code>require.resolve</code> and support deleting from cache for hot reload.', 'How would ESM handle the same cycle differently (TDZ instead of partial object)?']
      }
    }]
  });

  /* =====================================================================
     TOPIC 2: Iterators & Symbol.iterator
     ===================================================================== */
  var RANGE_CODE = [
    'const range = {',
    '  from: FROM, to: TO, step: STEP,',
    '  [Symbol.iterator]() {',
    '    let cur = this.from;',
    '    return {',
    '      next: () => {',
    '        if (cur > this.to) return { value: undefined, done: true };',
    '        const value = cur; cur += this.step;',
    '        return { value, done: false };',
    '      }',
    '    };',
    '  }',
    '};',
    'for (const x of range) console.log(x);'
  ].join('\n');

  function iterFrames(input) {
    var nums = String(input || '').trim().split(/[\s,]+/).map(Number);
    if (nums.length !== 3 || nums.some(isNaN)) throw new Error('Enter three numbers: from to step (e.g. 1 7 2)');
    var from = nums[0], to = nums[1], step = nums[2];
    if (step <= 0) throw new Error('step must be positive (otherwise the loop never ends!)');
    if ((to - from) / step > 10) throw new Error('Keep it small: at most about 10 values');
    var code = RANGE_CODE.replace('FROM', from).replace('TO', to).replace('STEP', step);
    var fr = [], out = [], calls = [], cur = from, n = 0;
    fr.push(F('<code>for...of</code> starts by asking the object for an iterator: it calls <code>range[Symbol.iterator]()</code> <b>once</b>. An object that has this method is called <b>iterable</b>.',
      [C('range.js', code, { 14: 'cur', 3: 'cur' }), V('iterator state', { cur: '-', 'next() calls': 0 }), OUT(out)]));
    fr.push(F('The method sets up private state (<code>cur = ' + from + '</code>, captured by a closure) and returns the <b>iterator</b>: any object with a <code>next()</code> method.',
      [C('range.js', code, { 4: 'ok', 5: 'ok' }), V('iterator state', { cur: cur, 'next() calls': 0 }, { cur: 'ok' }), OUT(out)]));
    while (true) {
      n++;
      if (cur > to) {
        calls.push([String(n), '{ value: undefined, done: true }']);
        fr.push(F('next() call #' + n + ': <code>cur (' + cur + ') &gt; to (' + to + ')</code>, so it returns <b>done: true</b>. for...of sees <code>done</code> and <b>stops without running the body</b>. The value of a done result is ignored by for...of.',
          [C('range.js', code, { 6: 'cur', 7: 'bad' }), V('iterator state', { cur: cur, 'next() calls': n, done: true }, { done: 'bad' }), TB('every next() result', ['call', 'returned'], calls.slice(), (function () { var h = {}; h[calls.length - 1] = 'bad'; return h; })()), OUT(out)]));
        break;
      }
      var v = cur; cur += step;
      calls.push([String(n), '{ value: ' + v + ', done: false }']);
      fr.push(F('next() call #' + n + ': cur = ' + v + ' is ≤ ' + to + ', so it returns <code>{ value: ' + v + ', done: false }</code> and moves cur to ' + cur + '. Nothing is computed ahead of time: values are produced <b>one at a time, on demand</b>.',
        [C('range.js', code, { 6: 'cur', 8: 'cur', 9: 'ok' }), V('iterator state', { cur: cur, value: v, 'next() calls': n, done: false }, { value: 'ok' }), TB('every next() result', ['call', 'returned'], calls.slice(), (function () { var h = {}; h[calls.length - 1] = 'ok'; return h; })()), OUT(out)]));
      out.push(String(v));
      fr.push(F('for...of unwraps <code>.value</code> into <code>x</code> and runs the loop body: <code>console.log(' + v + ')</code>.',
        [C('range.js', code, { 14: 'cur' }), V('loop', { x: v }, { x: 'ok' }), OUT(out)]));
    }
    fr.push(F('Done. The protocol is just two tiny contracts: <b>iterable</b> = has <code>[Symbol.iterator]()</code>; <b>iterator</b> = has <code>next()</code> returning <code>{ value, done }</code>. Spread, destructuring, Array.from, new Map(), Promise.all and yield* all speak this protocol.',
      [TB('who uses the protocol', ['consumer', 'example'], [['for...of', 'for (const x of range)'], ['spread', '[...range]'], ['destructuring', 'const [a, b] = range'], ['Array.from', 'Array.from(range)'], ['constructors', 'new Set(range)']]), OUT(out)]));
    return fr;
  }

  topics.push({
    title: 'Iterators & the Symbol.iterator Protocol',
    analogy: `<p>A <b>Pez candy dispenser</b>: you do not get the whole pack at once. Each time you tilt the head (<code>next()</code>) you get <b>one candy</b> (<code>value</code>), and when it is empty you get a "no more" signal (<code>done: true</code>). The <b>pack on the shelf</b> is the <i>iterable</i> (it can give you a dispenser); the <b>dispenser in your hand</b> is the <i>iterator</i> (it remembers how many candies are left).</p>`,
    explain: `<p>JavaScript has one universal way to "walk through things": the <b>iteration protocol</b>. Two small agreements:</p>
      <ul>
        <li><b>Iterable</b>: an object with a method under the key <code>Symbol.iterator</code>. Calling it returns an iterator.</li>
        <li><b>Iterator</b>: an object with <code>next()</code>, which returns <code>{ value, done }</code>. When <code>done</code> is <code>true</code>, the sequence is over.</li>
      </ul>
      ${H.table(['Built-in', 'Iterable?', 'What you get'], [
        ['Array', H.c('g', 'yes'), 'elements'],
        ['String', H.c('g', 'yes'), 'Unicode <b>code points</b> (emoji stay whole)'],
        ['Map', H.c('g', 'yes'), '[key, value] pairs in insertion order'],
        ['Set', H.c('g', 'yes'), 'values in insertion order'],
        ['arguments, NodeList, TypedArray', H.c('g', 'yes'), 'items'],
        ['plain object {}', H.c('r', 'no'), 'TypeError: obj is not iterable; use Object.entries(obj)']
      ])}
      <p>Everything that "loops over stuff" in modern JS uses this protocol: <code>for...of</code>, spread <code>[...x]</code>, array destructuring, <code>Array.from</code>, <code>new Map(x)</code>/<code>new Set(x)</code>, <code>Promise.all(x)</code>, and <code>yield*</code>. So if your own class implements <code>[Symbol.iterator]</code>, it instantly works with all of them.</p>
      <p><b>Laziness:</b> an iterator computes the next value only when asked, so it can represent huge or even infinite sequences using O(1) memory.</p>
      <p><b>Iterator helpers (ES2025)</b>: iterators now have array-like methods that stay lazy: <code>.map .filter .take .drop .flatMap .reduce .toArray .forEach .some .every .find</code>, plus <code>Iterator.from(obj)</code> to wrap any iterator. They are supported in current Chrome, Firefox, Safari and Node 22+.</p>`,
    clues: ['"make my class work with for...of / spread" → implement <code>[Symbol.iterator]</code>', '"lazy", "on demand", "infinite sequence", "stream of values without building an array" → iterator', '"TypeError: x is not iterable" → plain object or missing Symbol.iterator', '"clean up when the loop breaks early" → iterator <code>return()</code> method', '"iterate a Map/Set in insertion order" → built-in iterators (<code>entries/keys/values</code>)', '"Why does [...str] differ from str.length?" → string iterator walks code points'],
    code: [{ lang: 'js', title: 'A reusable iterable class with early-exit cleanup', run: true, code: `
      class Range {
        constructor(from, to, step = 1) { Object.assign(this, { from, to, step }); }
        // Each call returns a FRESH iterator, so the same Range can be looped many times
        [Symbol.iterator]() {
          let cur = this.from;
          const { to, step } = this;
          return {
            next() {
              if (cur > to) return { value: undefined, done: true };
              const value = cur;
              cur += step;
              return { value, done: false };
            },
            // Called automatically by for...of on break / throw / return
            return() {
              console.log('  cleanup: iterator closed early at', cur);
              return { value: undefined, done: true };
            }
          };
        }
      }

      const r = new Range(1, 10, 3);
      console.log([...r]);                 // [ 1, 4, 7, 10 ]
      console.log(Array.from(r, x => x * 2)); // [ 2, 8, 14, 20 ]
      const [first, second] = r;           // destructuring also iterates (and closes!)
      console.log(first, second);          // 1 4
      for (const x of r) { if (x > 4) break; console.log('loop', x); }
    ` }, { lang: 'js', title: 'Driving an iterator by hand (what for...of does)', run: true, code: `
      const it = ['a', 'b'][Symbol.iterator]();
      console.log(it.next()); // { value: 'a', done: false }
      console.log(it.next()); // { value: 'b', done: false }
      console.log(it.next()); // { value: undefined, done: true }
      console.log(it.next()); // stays done forever

      // Desugared for...of:
      const iterable = new Set([10, 20]);
      const iter = iterable[Symbol.iterator]();
      let step;
      while (!(step = iter.next()).done) {
        console.log('value', step.value);
      }
    ` }],
    codeTitle: ['Range class', 'Manual next() calls'],
    viz: {
      title: 'for...of calling next() on a custom iterator',
      input: '1 7 2',
      inputLabel: 'from to step (e.g. 1 7 2)',
      gen: iterFrames
    },
    examples: [
      { title: 'Predict the output: strings iterate by code point', html: `<p><code>'a😀'.length</code> counts UTF-16 units: ${H.c('y', '3')} (the emoji is a surrogate pair). The string <b>iterator</b> walks code points, so <code>[...'a😀'].length</code> is ${H.c('g', '2')}. This is why "reverse a string" with <code>split('')</code> breaks emoji but <code>[...s].reverse()</code> does not (grapheme clusters like 👨‍👩‍👧 still need <code>Intl.Segmenter</code>).</p>`, code: { lang: 'js', run: true, code: `
        const s = 'a😀';
        console.log(s.length);                 // 3
        console.log([...s].length);            // 2
        console.log(s.split('').reverse().join('') === [...s].reverse().join('')); // false: split broke the emoji
      ` } },
      { title: 'Predict the output: iterators are one-shot', html: `<p>An array is iterable many times (each loop gets a fresh iterator). But an <b>iterator</b> is also iterable (its <code>[Symbol.iterator]</code> returns <code>this</code>), and once consumed it stays empty.</p>${H.table(['expression', 'result'], [['[...arr]', '[1, 2, 3]'], ['[...arr]', '[1, 2, 3] (fresh)'], ['[...it]', '[1, 2, 3]'], ['[...it]', H.c('r', '[] (exhausted)')]])}`, code: { lang: 'js', run: true, code: `
        const arr = [1, 2, 3];
        const it = arr[Symbol.iterator]();
        console.log([...arr], [...arr]);   // [1,2,3] [1,2,3]
        console.log([...it]);              // [1,2,3]
        console.log([...it]);              // []
        console.log(it[Symbol.iterator]() === it); // true
      ` } },
      { title: 'Iterator helpers: lazy pipelines on an infinite source', html: `<p>An endless counter would hang <code>Array.prototype.map</code>, but iterator helpers pull one value at a time. <code>take(3)</code> stops the pipeline after 3 results, so only 6 numbers are ever generated.</p>${H.arr([1, 2, 3, 4, 5, 6], { label: 'numbers actually pulled', hl: { 1: 'g', 3: 'g', 5: 'g' } })}`, code: { lang: 'js', run: true, code: `
        let pulled = 0;
        const naturals = { [Symbol.iterator]() { let n = 0; return { next: () => ({ value: (++pulled, ++n), done: false }) }; } };
        if (typeof Iterator !== 'undefined' && Iterator.from) {
          const result = Iterator.from(naturals[Symbol.iterator]())
            .filter(n => n % 2 === 0)   // lazy
            .map(n => n * n)            // lazy
            .take(3)                    // stops pulling after 3 results
            .toArray();
          console.log(result, 'pulled:', pulled); // [ 4, 16, 36 ] pulled: 6
        } else {
          console.log('Iterator helpers not supported in this runtime');
        }
      ` } },
      { title: 'Plain objects are not iterable (and how to fix it)', html: `<p><code>for (const x of { a: 1 })</code> throws ${H.c('r', 'TypeError: {(intermediate value)} is not iterable')}. Choose a view: <code>Object.keys</code>, <code>Object.values</code> or <code>Object.entries</code> (all arrays), or convert with <code>new Map(Object.entries(obj))</code>. <code>for...in</code> is different: it walks enumerable <b>string keys</b>, including inherited ones.</p>`, code: { lang: 'js', run: true, code: `
        const prices = { apple: 3, kiwi: 5 };
        try { for (const x of prices) console.log(x); } catch (e) { console.log(e.constructor.name + ':', e.message); }
        for (const [fruit, price] of Object.entries(prices)) console.log(fruit, price);
      ` } }
    ],
    deepDive: `<p><b>Exact protocol details.</b> <code>next()</code> must return an object; returning a primitive throws a TypeError. Optional methods: <code>return(value)</code> is called by consumers when they stop early (break, throw, destructuring that does not read everything), which lets the iterator release resources (file handles, DB cursors, event listeners). <code>throw(err)</code> is used by <code>yield*</code> delegation. Built-in iterators inherit from <code>%IteratorPrototype%</code>, whose <code>[Symbol.iterator]</code> returns <code>this</code>, which is why an iterator can be passed where an iterable is expected.</p>
      <p><b>Performance.</b> V8 optimizes <code>for...of</code> over arrays to roughly the speed of an index loop (escape analysis removes the <code>{value, done}</code> allocations). Custom iterators in hot loops may allocate one result object per step; that is usually fine, but for millions of items in tight code an index loop or typed array is still fastest. Mutating an array while iterating it is allowed: the array iterator just reads <code>length</code> on each step, so pushing inside the loop can loop forever.</p>
      <p><b>Async iteration.</b> <code>Symbol.asyncIterator</code> + <code>next()</code> returning a Promise, consumed by <code>for await...of</code> (streams, paginated APIs, Node <code>readline</code>, <code>ReadableStream</code> in modern runtimes). <code>Array.fromAsync</code> (ES2024) collects one into an array.</p>
      <p><b>Map/Set iterators are live:</b> entries added during iteration are visited, deleted ones are skipped; this is defined by the spec, unlike Java's ConcurrentModificationException.</p>`,
    aiEra: `<p><b>What AI changes:</b> asking for "make this tree iterable" now gets you a working generator in seconds, so interviews shift to whether you <b>understand the protocol</b>: what <code>for...of</code> calls, when <code>return()</code> runs, why an iterator is one-shot, and where laziness saves memory.</p>
      <p><b>Use AI as a partner:</b> <code>Write tests that prove my iterator closes its resource on break, on throw, and on partial destructuring</code>. Or ask it to rewrite an eager <code>.map().filter().slice()</code> chain into iterator helpers and explain the memory difference.</p>
      <p><b>Where AI goes wrong:</b> returning <code>this</code> from <code>[Symbol.iterator]</code> on a collection (making it single-use), forgetting <code>done: true</code> (infinite loops), and using iterator helpers without checking runtime support. <b>You own</b>: choosing eager vs lazy deliberately and explaining the trade-off.</p>`,
    problems: [{
      title: 'Make a Linked List Work with for...of and Spread',
      level: 'Easy', tags: ['iterator', 'Symbol.iterator', 'linked list'], companies: ['Amazon', 'Microsoft', 'Swiggy'],
      statement: `<p>Given a class <code>LinkedList</code> with <code>add(value)</code>, make instances <b>iterable</b> so <code>for...of</code>, <code>[...list]</code>, <code>Array.from(list)</code> and destructuring all work. Each loop must start from the head again (reusable), and the list must not be copied into an array internally.</p>`,
      constraints: `Up to 10<sup>6</sup> nodes; O(1) extra memory per iteration; do not use generators in your first version (write the iterator object by hand).`,
      example: `<p><code>list.add(1).add(2).add(3)</code> → <code>[...list]</code> is ${H.c('g', '[1, 2, 3]')}, and <code>[...list]</code> again is still ${H.c('g', '[1, 2, 3]')} because every call to <code>[Symbol.iterator]()</code> creates a fresh cursor at the head.</p>`,
      brute: { why: `<p>Building a temporary array in <code>toArray()</code> and returning <code>arr[Symbol.iterator]()</code> works but doubles memory (an extra O(N) array) and walks the list twice. Also, callers must remember a custom method instead of using standard syntax.</p>`,
        code: `
          class LinkedListBrute {
            constructor() { this.head = null; this.tail = null; }
            add(value) { const n = { value, next: null }; if (this.tail) this.tail.next = n; else this.head = n; this.tail = n; return this; }
            [Symbol.iterator]() {
              const arr = [];
              for (let n = this.head; n; n = n.next) arr.push(n.value); // extra O(N) copy
              return arr[Symbol.iterator]();
            }
          }
        ` },
      mcq: { q: 'Where should the "current node" cursor live?', options: ['As a property on the list (this.cursor)', 'In a local variable inside [Symbol.iterator](), captured by next()', 'In a global variable', 'Inside each node'], answer: 1, explain: 'A per-iterator closure variable lets two loops run at the same time (even nested) without interfering, and makes the list reusable. A shared this.cursor would break nested loops.' },
      hints: [
        `<p>Hint 1: <code>[Symbol.iterator]()</code> must return an object with <code>next()</code>. Store the cursor in a local variable so each loop has its own.</p>`,
        `<p>Hint 2: <code>next()</code>: if cursor is null return <code>{ value: undefined, done: true }</code>; else read its value, move cursor to <code>cursor.next</code>, return <code>{ value, done: false }</code>.</p>`,
        `<p>Hint 3: Nested loops over the same list must work, which proves your cursor is per-iterator. Bonus: the generator version is just <code>*[Symbol.iterator]() { for (let n = this.head; n; n = n.next) yield n.value; }</code>.</p>`
      ],
      solution: {
        approach: `<p>Implement the iterator protocol directly: a fresh closure-held cursor per call to <code>[Symbol.iterator]</code>, advancing one node per <code>next()</code>. Zero copying, O(1) memory, and every standard consumer works automatically.</p>`,
        code: { lang: 'js', run: true, code: `
          class LinkedList {
            constructor() { this.head = null; this.tail = null; this.size = 0; }
            add(value) {
              const node = { value, next: null };
              if (this.tail) this.tail.next = node; else this.head = node;
              this.tail = node;
              this.size++;
              return this;                       // chainable
            }
            [Symbol.iterator]() {
              let cursor = this.head;            // private to THIS iterator
              return {
                next() {
                  if (cursor === null) return { value: undefined, done: true };
                  const value = cursor.value;
                  cursor = cursor.next;
                  return { value, done: false };
                },
                [Symbol.iterator]() { return this; } // iterators should be iterable too
              };
            }
          }

          const list = new LinkedList().add(1).add(2).add(3);
          console.log([...list]);                // [ 1, 2, 3 ]
          console.log([...list]);                // [ 1, 2, 3 ]  reusable
          const [a, , c] = list;
          console.log(a, c);                     // 1 3
          for (const x of list) for (const y of list) if (x === y && x === 2) console.log('nested ok');
          console.log(Math.max(...list));        // 3
        ` },
        alt: [{ lang: 'js', code: `
          // Generator version: same behaviour, the engine writes next() for you
          class LinkedList2 {
            constructor() { this.head = null; }
            *[Symbol.iterator]() {
              for (let n = this.head; n !== null; n = n.next) yield n.value;
            }
          }
        ` }],
        dry: { head: ['next() #', 'cursor before', 'returned', 'cursor after'], rows: [
          ['1', 'node(1)', '{ value: 1, done: false }', 'node(2)'],
          ['2', 'node(2)', '{ value: 2, done: false }', 'node(3)'],
          ['3', 'node(3)', '{ value: 3, done: false }', 'null'],
          ['4', 'null', '<span class="c-r">{ value: undefined, done: true }</span>', 'null']
        ] },
        complexity: `<p>O(1) per <code>next()</code>, O(N) for a full loop, O(1) extra memory per iterator (versus O(N) for the copy-to-array version).</p>`,
        followUps: ['Add a <code>reverse()</code> method that returns an iterable going backwards (hint: doubly linked list).', 'What happens if a node is added while a loop is running?', 'Make it async iterable for a list whose nodes are loaded from a server.']
      }
    }]
  });

  /* =====================================================================
     TOPIC 3: Generators
     ===================================================================== */
  var GEN_CODE = [
    'function* calc() {',
    "  console.log('started');",
    "  const a = yield 'first';",
    '  const b = yield a * 2;',
    '  return a + b;',
    '}',
    'const g = calc();   // body does NOT run yet'
  ].join('\n');

  function show(v) {
    if (v === undefined) return 'undefined';
    if (typeof v === 'number' && isNaN(v)) return 'NaN';
    if (typeof v === 'string') return "'" + v + "'";
    return String(v);
  }

  function genFrames(input) {
    var toks = String(input || '').trim().split(/[\s,]+/).filter(function (t) { return t.length; });
    if (!toks.length) throw new Error('Enter calls like: _ 10 20 30   (use _ for next() with no argument, ret:5 for return(5), throw for throw())');
    if (toks.length > 8) throw new Error('Use at most 8 calls');
    var fr = [], out = [], pos = 0, a, b, calls = [];
    var stateName = ['suspendedStart', 'suspendedYield (line 3)', 'suspendedYield (line 4)', 'completed'];
    function vars(extra, hl) {
      var o = { state: stateName[pos], a: show(a), b: show(b) };
      for (var k in extra) o[k] = extra[k];
      return V('generator object g', o, hl || {});
    }
    function results(hlLast) { var h = {}; if (calls.length) h[calls.length - 1] = hlLast; return TB('calls so far', ['call', 'result'], calls.slice(), h); }
    fr.push(F('<code>calc()</code> is called but <b>no code inside it runs</b>. You just get a generator object (an iterator) parked before line 2. Its stack frame (local variables a and b, the current line) will live on the heap between calls.',
      [C('calc.js', GEN_CODE, { 7: 'cur' }), vars({}), { type: 'stack', label: 'call stack', items: ['main'] }, OUT(out)]));
    toks.forEach(function (tok, i) {
      var kind = 'next', arg, label;
      if (tok === '_' || tok === '-') { label = 'g.next()'; }
      else if (/^ret(urn)?(:.*)?$/i.test(tok)) { kind = 'return'; var rv = tok.indexOf(':') >= 0 ? tok.split(':')[1] : undefined; arg = rv === undefined ? undefined : (isNaN(Number(rv)) ? rv : Number(rv)); label = 'g.return(' + (arg === undefined ? '' : show(arg)) + ')'; }
      else if (/^throw$/i.test(tok)) { kind = 'throw'; label = "g.throw(new Error('boom'))"; }
      else { arg = isNaN(Number(tok)) ? tok : Number(tok); label = 'g.next(' + show(arg) + ')'; }
      var n = i + 1, res, hlLines = {}, narr;
      if (kind === 'next') {
        if (pos === 0) {
          out.push('started'); res = "{ value: 'first', done: false }"; pos = 1; hlLines = { 2: 'ok', 3: 'cur' };
          narr = 'Call ' + n + ' <code>' + label + '</code>: the body starts, logs "started", then hits <code>yield \'first\'</code> and <b>pauses</b>, handing out \'first\'.' + (arg !== undefined ? ' The argument ' + show(arg) + ' is <b>ignored</b>: there is no paused yield yet to receive it.' : '');
        } else if (pos === 1) {
          a = arg; pos = 2; res = '{ value: ' + show(a * 2) + ', done: false }'; hlLines = { 3: 'ok', 4: 'cur' };
          narr = 'Call ' + n + ' <code>' + label + '</code>: the paused <code>yield \'first\'</code> <b>evaluates to the argument</b>, so <code>a = ' + show(a) + '</code>. Execution continues to <code>yield a * 2</code> and pauses again with ' + show(a * 2) + '.' + (a === undefined ? ' (No argument → a is undefined → NaN.)' : '');
        } else if (pos === 2) {
          b = arg; pos = 3; res = '{ value: ' + show(a + b) + ', done: true }'; hlLines = { 4: 'ok', 5: 'sel' };
          narr = 'Call ' + n + ' <code>' + label + '</code>: <code>b = ' + show(b) + '</code>, then <code>return a + b</code> finishes the generator with <b>done: true</b>. Note: for...of and spread would IGNORE this returned value.';
        } else {
          res = '{ value: undefined, done: true }'; hlLines = {};
          narr = 'Call ' + n + ' <code>' + label + '</code>: the generator is <b>completed</b>. Every further next() just returns <code>{ value: undefined, done: true }</code>.';
        }
      } else if (kind === 'return') {
        res = '{ value: ' + show(arg) + ', done: true }';
        narr = 'Call ' + n + ' <code>' + label + '</code>: ' + (pos === 0 ? 'the body never started, so it is simply closed.' : pos === 3 ? 'already completed: it echoes the value back with done: true.' : 'acts like a <code>return</code> statement <b>at the paused yield</b>. Any <code>finally</code> blocks would run now. The generator is closed.') + ' This is what for...of calls when you <code>break</code>.';
        hlLines = pos === 1 ? { 3: 'bad' } : pos === 2 ? { 4: 'bad' } : {};
        pos = 3;
      } else {
        res = '<span class="c-r">throws Error: boom</span>';
        narr = 'Call ' + n + ' <code>' + label + '</code>: ' + (pos === 1 || pos === 2 ? 'the error is thrown <b>inside the generator at the paused yield</b>. There is no try/catch around it, so the generator closes and the error bubbles out to the caller.' : 'the generator is not paused at a yield, so it closes and the error is thrown straight back to the caller.');
        hlLines = pos === 1 ? { 3: 'bad' } : pos === 2 ? { 4: 'bad' } : {};
        pos = 3;
      }
      calls.push([label, res]);
      fr.push(F(narr, [C('calc.js', GEN_CODE, hlLines), vars({ 'last result': res.replace(/<[^>]*>/g, '') }, { 'last result': 'ok' }),
        { type: 'stack', label: 'call stack during the call', items: pos === 3 && kind !== 'next' ? ['main', label] : ['main', label, 'calc() resumed'], hl: { 2: 'cur' } }, results(kind === 'throw' ? 'bad' : 'ok'), OUT(out)]));
    });
    fr.push(F('<b>Recap:</b> <code>yield</code> pauses and sends a value OUT; the next <code>next(x)</code> resumes and sends x IN as the value of that yield. The very first next() argument is always lost. <code>return()</code> and <code>throw()</code> resume the generator with a return or an exception instead.',
      [results('sel'), vars({}), OUT(out)]));
    return fr;
  }

  topics.push({
    title: 'Generators: Pausable Functions',
    analogy: `<p>A <b>bookmark in a novel</b>. A normal function is a short story: once you start you read to the end. A <b>generator</b> is a novel you can put down mid-chapter: <code>yield</code> drops a bookmark and hands the reader a quote; <code>next()</code> opens the book at the bookmark and keeps reading. You can even <b>scribble a note</b> on the page when you come back (<code>next(value)</code> sends a value in).</p>`,
    explain: `<p>A generator function is written with <code>function*</code>. Calling it does <b>not</b> run its body; it returns a <b>generator object</b>, which is both an <i>iterator</i> (has <code>next()</code>) and an <i>iterable</i> (works in <code>for...of</code>).</p>
      <ul>
        <li><code>yield value</code>: pause here and give <code>{ value, done: false }</code> to whoever called <code>next()</code>.</li>
        <li><code>return value</code>: finish with <code>{ value, done: true }</code> (for...of and spread ignore this final value).</li>
        <li><code>next(x)</code>: resume; the paused <code>yield</code> expression evaluates to <code>x</code>. The argument of the <b>first</b> next() is lost because nothing is paused yet.</li>
        <li><code>yield* iterable</code>: delegate to another iterable/generator and pass along all its values.</li>
        <li><code>g.return(v)</code> / <code>g.throw(err)</code>: resume the generator as if a return / throw happened at the paused yield.</li>
      </ul>
      ${H.table(['state', 'meaning'], [['suspendedStart', 'created, body not started'], ['executing', 'inside a next() call right now'], ['suspendedYield', 'paused at a yield, locals kept alive'], ['completed', 'returned or threw; next() always gives done: true']])}
      <p>Why care? Generators make writing iterators trivial (no hand-made <code>next()</code>), give you <b>lazy and infinite sequences</b>, let you build <b>pipelines</b> that process one item at a time, and they are the idea that <code>async/await</code> grew out of (pause at <code>await</code>, resume when the promise settles). <code>async function*</code> mixes both: you <code>await</code> inside and consumers use <code>for await...of</code>.</p>`,
    clues: ['"generate values on demand / lazily / infinite stream (IDs, Fibonacci, pages)" → generator', '"pause and resume a function", "coroutine", "two-way communication" → <code>yield</code> + <code>next(x)</code>', '"flatten nested structure / traverse a tree recursively without building arrays" → <code>yield*</code>', '"how does async/await work under the hood?" → generators + promises (co/regenerator)', '"paginated API, read until no more pages" → <code>async function*</code> + <code>for await</code>', '"predict the output with next(5)" → first next() argument is discarded'],
    code: [{ lang: 'js', title: 'Generator basics: lazy, infinite, two-way', run: true, code: `
      function* idMaker(prefix) {
        let n = 1;
        while (true) {                       // infinite is fine: it is lazy
          const reset = yield prefix + n;    // value OUT, value IN
          n = reset ? 1 : n + 1;
        }
      }
      const ids = idMaker('user-');
      console.log(ids.next().value);         // user-1
      console.log(ids.next().value);         // user-2
      console.log(ids.next(true).value);     // user-1  (we sent true IN -> reset)

      function* fib() { let [a, b] = [0, 1]; for (;;) { yield a; [a, b] = [b, a + b]; } }
      function* take(n, it) { for (const x of it) { if (n-- <= 0) return; yield x; } }
      console.log([...take(10, fib())]);     // [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
    ` }, { lang: 'js', title: 'return(), throw() and finally (cleanup)', run: true, code: `
      function* worker() {
        try {
          while (true) {
            try { yield 'working'; }
            catch (e) { console.log('caught inside:', e.message); }
          }
        } finally {
          console.log('finally: releasing resources');
        }
      }
      const w = worker();
      console.log(w.next());                    // { value: 'working', done: false }
      console.log(w.throw(new Error('hiccup'))); // caught inside -> loops -> { value: 'working', done: false }
      console.log(w.return('bye'));             // finally runs -> { value: 'bye', done: true }
      console.log(w.next());                    // { value: undefined, done: true }

      for (const x of worker()) { console.log(x); break; } // break -> return() -> finally runs
    ` }],
    codeTitle: ['Lazy & two-way', 'Closing a generator'],
    viz: {
      title: 'Step a generator: next(x) in, yield value out',
      input: '_ 10 20 30',
      inputLabel: 'calls: _ = next(), number = next(n), ret:5 = return(5), throw = throw()',
      gen: genFrames
    },
    examples: [
      { title: 'Predict the output: the lost first argument', html: `<p>Using the visualizer code: <code>g.next(5); g.next(10); g.next(20)</code>.</p>${H.table(['call', 'what happens', 'result'], [['next(5)', '5 is lost; runs to first yield', "{ value: 'first', done: false }"], ['next(10)', 'a = 10; yield 20', '{ value: 20, done: false }'], ['next(20)', 'b = 20; return 30', H.c('g', '{ value: 30, done: true }')]])}`, code: { lang: 'js', run: true, code: `
        function* calc() { const a = yield 'first'; const b = yield a * 2; return a + b; }
        const g = calc();
        console.log(g.next(5));   // { value: 'first', done: false }
        console.log(g.next(10));  // { value: 20, done: false }
        console.log(g.next(20));  // { value: 30, done: true }
        console.log([...calc()]); // [ 'first', NaN ]  <- the final return value (NaN) is ignored by spread
      ` } },
      { title: 'yield* for recursive tree traversal', html: `<p><code>yield*</code> forwards every value of an inner generator. A recursive in-order traversal becomes 4 lines and produces nodes lazily, so <code>find</code>-style early exits do not walk the whole tree.</p>${H.table(['node', 'left', 'right'], [['4', '2', '6'], ['2', '1', '3'], ['6', '5', '7']])}<p>In-order: ${H.c('g', '1 2 3 4 5 6 7')}.</p>`, code: { lang: 'js', run: true, code: `
        const t = (v, l = null, r = null) => ({ v, l, r });
        const root = t(4, t(2, t(1), t(3)), t(6, t(5), t(7)));
        function* inorder(node) {
          if (!node) return;
          yield* inorder(node.l);   // delegate: pass through every value
          yield node.v;
          yield* inorder(node.r);
        }
        console.log([...inorder(root)].join(' '));      // 1 2 3 4 5 6 7
        for (const v of inorder(root)) if (v > 2) { console.log('first > 2 is', v); break; }
      ` } },
      { title: 'async function* for paginated data', html: `<p>An API returns pages with a <code>next</code> cursor. An async generator hides the paging loop; the caller just writes <code>for await</code> and can <code>break</code> early, which stops further fetches.</p>${H.table(['page', 'items', 'next'], [['1', 'a, b', '2'], ['2', 'c, d', '3'], ['3', 'e', 'null']])}`, code: { lang: 'js', run: true, code: `
        const PAGES = { 1: { items: ['a', 'b'], next: 2 }, 2: { items: ['c', 'd'], next: 3 }, 3: { items: ['e'], next: null } };
        const fetchPage = (p) => new Promise((res) => setTimeout(() => { console.log('  fetched page', p); res(PAGES[p]); }, 5));

        async function* allItems() {
          let page = 1;
          while (page !== null) {
            const { items, next } = await fetchPage(page);
            yield* items;           // yield* works with arrays too
            page = next;
          }
        }
        (async () => {
          for await (const item of allItems()) {
            console.log(item);
            if (item === 'c') break;  // page 3 is never fetched
          }
        })();
      ` } }
    ],
    deepDive: `<p><b>How engines implement it.</b> A generator's frame (locals, current bytecode offset, operand registers) is saved into the generator object on the heap at each <code>yield</code> and restored on resume. V8's Ignition compiles generators into a state machine with a <code>SuspendGenerator</code>/<code>ResumeGenerator</code> bytecode pair and a jump table on the resume point. Transpilers (Babel's regenerator) do the same thing by hand: a <code>switch (context.next)</code> over numbered states. <code>async/await</code> is specified with the same machinery: <code>await p</code> suspends the async function and resumes it from a promise reaction job (a microtask).</p>
      <p><b>Subtleties interviewers probe.</b> (1) Generators are not constructors: <code>new gen()</code> throws. (2) Arrow functions cannot be generators. (3) <code>yield</code> has very low precedence: <code>yield a + b</code> yields the sum; use <code>(yield a) + b</code> to add after resuming. (4) <code>return</code> inside <code>try</code> with a <code>finally</code> that <code>yield</code>s will pause again before finishing. (5) <code>yield*</code> forwards <code>next/throw/return</code> calls to the inner iterator and evaluates to the inner generator's <b>return value</b>. (6) A generator is single-use; to iterate again, call the function again.</p>
      <p><b>Production uses:</b> Redux-Saga (effects as yielded descriptions, easy to test), Koa v1 middleware, lazy data pipelines over large files, cooperative scheduling (React's work loop uses the same "slice work, yield to the browser" idea), and test data factories. Performance: generator resumption is cheaper than allocating closures per step, but a hand-written index loop is still faster in hot paths.</p>`,
    aiEra: `<p><b>What AI changes:</b> generator code used to be rare because it was hard to read; AI can now explain or write a saga or async pipeline instantly. That makes it more important that you can <b>predict execution order</b> (the first-next() argument, when finally runs, what spread ignores) because subtle bugs pass casual review.</p>
      <p><b>Use AI as a partner:</b> <code>Rewrite this callback-based paginator as an async generator and show how break stops fetching</code>, then ask <code>Which promises are still pending if the consumer breaks?</code>. Have it produce a transpiled (regenerator) version so you can see the state machine.</p>
      <p><b>Where AI goes wrong:</b> forgetting that <code>return</code> values are dropped by for...of, mixing <code>yield</code> inside nested callbacks (<code>arr.forEach(x =&gt; yield x)</code> is a SyntaxError), and leaking resources by not using <code>try/finally</code>. <b>You own</b>: choosing generators only where laziness or pausing genuinely helps readability.</p>`,
    problems: [{
      title: 'Lazily Flatten a Deeply Nested Array',
      level: 'Medium', tags: ['generators', 'yield*', 'recursion', 'lazy'], companies: ['Meta', 'Flipkart', 'Adobe'],
      statement: `<p>Write a generator <code>flatten(arr, depth = Infinity)</code> that yields the elements of a nested array in order, descending at most <code>depth</code> levels (like <code>Array.prototype.flat(depth)</code>) but <b>lazily</b>: the consumer may stop early, and no intermediate arrays may be built.</p>`,
      constraints: `Total elements up to 10<sup>6</sup>; nesting depth up to 10<sup>3</sup>; elements can be any value (only real arrays are descended into, not strings).`,
      example: `<p><code>[...flatten([1, [2, [3, [4]]], 5])]</code> → ${H.c('g', '[1, 2, 3, 4, 5]')}. <code>[...flatten([1, [2, [3, [4]]]], 1)]</code> → ${H.c('g', '[1, 2, [3, [4]]]')} because only one level is opened. Taking just the first 2 values touches only <code>1</code> and <code>2</code>.</p>`,
      brute: { why: `<p>Recursively building a result array with <code>concat</code> or <code>flat(Infinity)</code> is fine for small data, but it creates a full copy (O(N) memory), cannot stop early, and repeated <code>concat</code> can turn into O(N·depth) copying.</p>`,
        code: `
          function flattenEager(arr, depth = Infinity) {
            let out = [];
            for (const x of arr) {
              if (Array.isArray(x) && depth > 0) out = out.concat(flattenEager(x, depth - 1)); // copies again and again
              else out.push(x);
            }
            return out;
          }
        ` },
      mcq: { q: 'Which keyword passes every value of the recursive call through to the outer consumer?', options: ['yield', 'yield*', 'return', 'await'], answer: 1, explain: '<code>yield flatten(x)</code> would yield the generator object itself. <code>yield* flatten(x)</code> delegates and forwards each inner value.' },
      hints: [
        `<p>Hint 1: Walk the array with for...of. If an item is an array and you still have depth left, the answer for that item is "everything flatten(item) produces".</p>`,
        `<p>Hint 2: Use <code>yield* flatten(item, depth - 1)</code> for arrays, plain <code>yield item</code> for everything else. Use <code>Array.isArray</code> so strings are not split into characters.</p>`,
        `<p>Hint 3: Very deep nesting (10<sup>4</sup>+) can overflow the call stack via recursion. Expert version: an explicit stack of iterators. Recipe: stack = [[arr iterator, depth]]; loop: take top, next(); if done pop; if array and depth &gt; 0 push its iterator; else yield.</p>`
      ],
      solution: {
        approach: `<p>Recursive generator with <code>yield*</code> delegation: each nesting level is a paused generator frame, so memory is O(depth) instead of O(N), and the consumer pulls values one by one. An iterative version with an explicit stack avoids recursion limits.</p>`,
        code: { lang: 'js', run: true, code: `
          function* flatten(arr, depth = Infinity) {
            for (const item of arr) {
              if (Array.isArray(item) && depth > 0) {
                yield* flatten(item, depth - 1);   // delegate the whole sub-array
              } else {
                yield item;
              }
            }
          }

          // Iterative version: safe for extremely deep nesting
          function* flattenIter(arr, depth = Infinity) {
            const stack = [[arr[Symbol.iterator](), depth]];
            while (stack.length) {
              const [it, d] = stack[stack.length - 1];
              const { value, done } = it.next();
              if (done) { stack.pop(); continue; }
              if (Array.isArray(value) && d > 0) stack.push([value[Symbol.iterator](), d - 1]);
              else yield value;
            }
          }

          const data = [1, [2, [3, [4]]], 5, 'hi'];
          console.log([...flatten(data)]);          // [ 1, 2, 3, 4, 5, 'hi' ]
          console.log([...flatten(data, 1)]);       // [ 1, 2, [ 3, [ 4 ] ], 5, 'hi' ]
          let deep = [42]; for (let i = 0; i < 20000; i++) deep = [deep];
          console.log([...flattenIter(deep)]);      // [ 42 ]  (recursion would overflow)
          const g = flatten(data); console.log(g.next().value, g.next().value); // 1 2  (lazy)
        ` },
        dry: { head: ['step', 'item', 'depth left', 'action', 'yielded'], rows: [
          ['1', '1', '∞', 'not array → yield', '1'],
          ['2', '[2,[3,[4]]]', '∞', 'yield* flatten(…)', '-'],
          ['3', '2 (inner)', '∞', 'yield', '2'],
          ['4', '[3,[4]] (inner)', '∞', 'yield* deeper', '3, 4'],
          ['5', '5', '∞', 'yield', '<span class="c-g">5</span>']
        ] },
        complexity: `<p>O(N) total time over all elements, O(depth) memory for paused frames (no output array). Each yielded value through k levels of <code>yield*</code> costs O(k) in naive engines; the iterative stack version is strictly O(1) per value.</p>`,
        followUps: ['Flatten any iterable (Sets, generators) but not strings.', 'Add a <code>path</code> to each yielded value (indices from the root).', 'Make an async version that flattens a stream of pages.']
      }
    }]
  });

  /* =====================================================================
     TOPIC 4: Map & Set
     ===================================================================== */
  function parseKeys(input) {
    var raw = String(input || '').split(',').map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
    if (!raw.length) throw new Error("Enter comma-separated keys, e.g. 1, '1', true, {}, NaN");
    if (raw.length > 12) throw new Error('Use at most 12 keys');
    var objN = 0;
    return raw.map(function (t) {
      if (/^'.*'$/.test(t) || /^".*"$/.test(t)) { var s = t.slice(1, -1); return { kind: 'string', val: s, str: s, show: "'" + s + "'" }; }
      if (t === 'true' || t === 'false') return { kind: 'boolean', val: t === 'true', str: t, show: t };
      if (t === 'null') return { kind: 'null', val: null, str: 'null', show: 'null' };
      if (t === 'undefined') return { kind: 'undefined', val: undefined, str: 'undefined', show: 'undefined' };
      if (t === '{}') { objN++; return { kind: 'object', ref: 'o' + objN, str: '[object Object]', show: '{} #' + objN }; }
      if (t === '[]') { objN++; return { kind: 'array', ref: 'o' + objN, str: '', show: '[] #' + objN }; }
      if (t === 'NaN') return { kind: 'number', val: NaN, str: 'NaN', show: 'NaN' };
      if (t === '-0') return { kind: 'number', val: -0, str: '0', show: '-0' };
      var n = Number(t);
      if (!isNaN(n)) return { kind: 'number', val: n, str: String(n), show: String(n) };
      throw new Error('Unknown key "' + t + '". Use numbers, quoted strings, true/false, null, undefined, NaN, -0, {} or []');
    });
  }
  function sameValueZero(a, b) {
    if (a.ref || b.ref) return a.ref === b.ref;
    if (a.kind !== b.kind) return false;
    if (a.kind === 'number' && isNaN(a.val) && isNaN(b.val)) return true;
    return a.val === b.val; // -0 === 0 is true, matching SameValueZero
  }
  function objOrder(keys) {
    var idx = keys.filter(function (k) { return /^(0|[1-9]\d*)$/.test(k) && Number(k) < 4294967295; }).sort(function (x, y) { return Number(x) - Number(y); });
    var rest = keys.filter(function (k) { return idx.indexOf(k) < 0; });
    return idx.concat(rest);
  }

  function mapFrames(input) {
    var keys = parseKeys(input);
    var obj = {}, objKeys = [], mapEntries = [], fr = [];
    function tables(hlObjKey, hlMapIdx, objCls, mapCls) {
      var order = objOrder(objKeys), oh = {}, mh = {};
      var rows = order.map(function (k, i) { if (k === hlObjKey) oh[i] = objCls; return ["'" + k + "'", String(obj[k])]; });
      if (hlMapIdx >= 0) mh[hlMapIdx] = mapCls;
      return [
        TB('plain object: keys become STRINGS', ['key (string)', 'value'], rows, oh),
        TB('Map: keys keep their type & identity', ['key', 'type', 'value'], mapEntries.map(function (e) { return [e.k.show, e.k.kind, String(e.v)]; }), mh)
      ];
    }
    fr.push(F('We will run <code>obj[key] = i</code> and <code>map.set(key, i)</code> for each key, where i is its position. Watch where the two containers disagree.',
      [{ type: 'array', label: 'keys to insert (i = index)', values: keys.map(function (k) { return k.show; }), showIdx: true }].concat(tables(null, -1))));
    keys.forEach(function (k, i) {
      var existed = objKeys.indexOf(k.str) >= 0;
      if (!existed) objKeys.push(k.str);
      obj[k.str] = i;
      var mi = -1;
      for (var j = 0; j < mapEntries.length; j++) if (sameValueZero(mapEntries[j].k, k)) { mi = j; break; }
      var mapHit = mi >= 0;
      if (mapHit) mapEntries[mi].v = i; else { mapEntries.push({ k: k, v: i }); mi = mapEntries.length - 1; }
      var why = [];
      why.push('Object: <code>' + H.esc(k.show) + '</code> is converted with String() to <b>\'' + H.esc(k.str) + '\'</b>' + (existed ? ' which <span class="c-r">already exists, so the old value is overwritten</span>.' : ', a new property.'));
      if (mapHit) why.push('Map: SameValueZero says it equals an existing key' + (k.kind === 'number' && isNaN(k.val) ? ' (NaN equals NaN in a Map)' : k.show === '-0' ? ' (-0 and 0 are the same Map key)' : '') + ', so the value is <b>updated in place</b> (order unchanged).');
      else why.push('Map: <span class="c-g">new distinct key</span>' + (k.ref ? ' (objects are compared by <b>identity</b>, not content)' : ' (type is kept)') + '.');
      var arrHl = {}; arrHl[i] = 'cur';
      fr.push(F('i = ' + i + ', key <code>' + H.esc(k.show) + '</code>. ' + why.join(' '),
        [{ type: 'array', label: 'keys to insert', values: keys.map(function (x) { return x.show; }), hl: arrHl, showIdx: true }].concat(tables(k.str, mi, existed ? 'bad' : 'ok', mapHit ? 'cur' : 'ok'))));
    });
    var order = objOrder(objKeys);
    fr.push(F('Final: the object has <b>' + objKeys.length + '</b> keys, the Map has <b>' + mapEntries.length + '</b> (<code>map.size</code>). Also notice the object lists integer-like keys first in ascending order, while a Map always remembers <b>insertion order</b>.',
      [V('sizes', { 'Object.keys(obj).length': objKeys.length, 'map.size': mapEntries.length }, { 'map.size': 'ok' }),
        TB('iteration order', ['Object.keys(obj)', '[...map.keys()]'], (function () {
          var rows = [], n = Math.max(order.length, mapEntries.length);
          for (var r = 0; r < n; r++) rows.push([order[r] !== undefined ? "'" + order[r] + "'" : '', mapEntries[r] ? mapEntries[r].k.show : '']);
          return rows;
        })())]));
    fr.push(F('<b>Rule of thumb:</b> use a <b>Map</b> for dynamic keyed collections (any key type, frequent add/delete, size, guaranteed order); use a plain <b>object</b> for fixed-shape records with known string keys (and JSON).',
      [TB('Map vs Object', ['', 'Map', 'Object'], [['key types', 'anything', 'string / symbol'], ['size', 'map.size O(1)', 'Object.keys(o).length O(n)'], ['order', 'insertion', 'integer keys first'], ['inherited keys', 'none', 'prototype (toString, __proto__)'], ['JSON', 'needs conversion', 'native'], ['frequent add/delete', 'optimized', 'can deopt to dictionary mode']])]));
    return fr;
  }

  topics.push({
    title: 'Map and Set: Real Keyed Collections',
    analogy: `<p>A plain object is a <b>filing cabinet with paper labels</b>: whatever you file under, the label is written as <b>text</b>, so the number 1 and the word "1" end up in the same drawer. A <b>Map</b> is a <b>coat-check counter</b>: you hand over the <i>actual thing</i> (a number, an object, even a function) as the ticket, and only that exact ticket gets your coat back. A <b>Set</b> is a <b>guest list</b>: each name appears at most once, and checking "is she on the list?" is instant.</p>`,
    explain: `<p><b>Map</b> stores key → value pairs where the key can be <b>any value</b>, compared with <i>SameValueZero</i> (like <code>===</code>, except <code>NaN</code> equals <code>NaN</code>, and <code>-0</code> equals <code>0</code>). <b>Set</b> stores unique values with the same comparison. Both remember <b>insertion order</b> and give O(1) average add / lookup / delete.</p>
      ${H.table(['Map method', 'does'], [['new Map([[k, v], ...])', 'build from any iterable of pairs'], ['set(k, v) / get(k)', 'write / read (set returns the map: chainable)'], ['has(k) / delete(k)', 'check / remove (delete returns true if removed)'], ['size', 'number of entries (a property, not a method)'], ['keys() / values() / entries()', 'iterators in insertion order'], ['forEach((v, k) =&gt; ...)', 'note: value first, then key'], ['Map.groupBy(items, fn)', 'ES2024: group into a Map']])}
      ${H.table(['Set method', 'does'], [['new Set(iterable)', 'dedupe anything iterable'], ['add / has / delete / clear', 'basic ops'], ['union, intersection, difference', 'ES2025 set algebra, return new Sets'], ['symmetricDifference', 'in exactly one of the two'], ['isSubsetOf / isSupersetOf / isDisjointFrom', 'relationship checks']])}
      <p><b>Object keys vs Map keys:</b></p>${H.kv([['obj[1]', "same as obj['1']"], ['obj[{}]', "obj['[object Object]'] (every object collides!)"], ['map.set(1, …)', 'different from map.set(\'1\', …)'], ['map.set({}, …)', 'each object is its own key']], { label: 'quick comparison' })}
      <p><b>Gotcha:</b> objects and arrays are compared by <b>reference</b>: <code>new Set([[1], [1]]).size</code> is 2, and <code>map.get([1])</code> never finds a key set with a different <code>[1]</code> array. Use a string key (<code>'1,2'</code>) or nested Maps when you need value-based keys.</p>`,
    clues: ['"count frequencies", "group by", "first non-repeating" → Map (counts keep insertion order)', '"remove duplicates", "has it been seen?", "unique visitors" → Set', '"keys are objects / DOM nodes / functions" → Map (or WeakMap if they should not be kept alive)', '"need size quickly", "frequent add and delete" → Map over object', '"least recently used", "keep insertion order and move to back" → Map delete + set trick', '"intersection / union of two lists" → Set (ES2025 methods or filter + has)'],
    code: [{ lang: 'js', title: 'Map & Set essentials', run: true, code: `
      // Map with non-string keys
      const visits = new Map();
      const alice = { name: 'Alice' }, bob = { name: 'Bob' };
      visits.set(alice, 3).set(bob, 1);          // chainable
      visits.set(alice, visits.get(alice) + 1);  // update
      console.log(visits.get(alice), visits.size); // 4 2
      for (const [user, n] of visits) console.log(user.name, n); // insertion order

      // Converting back and forth
      const obj = { a: 1, b: 2 };
      const m = new Map(Object.entries(obj));
      console.log(Object.fromEntries(m));        // { a: 1, b: 2 }
      console.log(JSON.stringify([...m]));       // [["a",1],["b",2]]  (JSON.stringify(m) would be {})

      // Set: dedupe + set algebra
      const a = new Set([1, 2, 3, 3]), b = new Set([3, 4]);
      console.log([...a]);                       // [1, 2, 3]
      if (a.union) {                             // ES2025 (Node 22+, modern browsers)
        console.log([...a.union(b)], [...a.intersection(b)], [...a.difference(b)]); // [1,2,3,4] [3] [1,2]
      }
      console.log(new Set([NaN, NaN, 0, -0]).size); // 2  (NaN once, 0 once)
    ` }, { lang: 'js', title: 'Frequency count + group by', run: true, code: `
      const words = 'the cat and the hat and the bat'.split(' ');
      const freq = new Map();
      for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
      console.log([...freq]);   // [['the',3],['cat',1],['and',2],['hat',1],['bat',1]]
      const mostCommon = [...freq].sort((x, y) => y[1] - x[1])[0];
      console.log('most common:', mostCommon);   // [ 'the', 3 ]

      const people = [{ n: 'A', age: 31 }, { n: 'B', age: 25 }, { n: 'C', age: 38 }];
      const byDecade = Map.groupBy ? Map.groupBy(people, p => Math.floor(p.age / 10) * 10) : null;
      if (byDecade) for (const [decade, list] of byDecade) console.log(decade, list.map(p => p.n));
    ` }],
    codeTitle: ['Essentials', 'Counting & grouping'],
    viz: {
      title: 'Same keys into an object and a Map',
      input: "1, '1', true, 'true', {}, {}, NaN, NaN, -0, 0",
      inputLabel: "Comma-separated keys: numbers, 'strings', true/false, null, undefined, NaN, -0, {}, []",
      gen: mapFrames
    },
    examples: [
      { title: 'Predict the output: object keys collide', html: `<p>Every object stringifies to <code>'[object Object]'</code>, so two different objects used as keys of a plain object overwrite each other.</p>${H.table(['code', 'object result', 'Map result'], [['k1 = {}, k2 = {}', '1 key', '2 keys'], ['store[k1] = "a"; store[k2] = "b"', 'store[k1] → "b"', 'map.get(k1) → "a"']])}`, code: { lang: 'js', run: true, code: `
        const k1 = {}, k2 = {};
        const store = {};
        store[k1] = 'a'; store[k2] = 'b';
        console.log(store[k1], Object.keys(store));   // b [ '[object Object]' ]
        const map = new Map([[k1, 'a'], [k2, 'b']]);
        console.log(map.get(k1), map.size);           // a 2
      ` } },
      { title: 'Predict the output: forEach argument order and size', html: `<p><code>Map.prototype.forEach</code> passes <b>(value, key)</b>, matching <code>Array.prototype.forEach(element, index)</code>. People expect (key, value) and get them swapped. And <code>size</code> is a property: <code>map.size()</code> throws ${H.c('r', 'TypeError: map.size is not a function')}.</p>`, code: { lang: 'js', run: true, code: `
        const m = new Map([['x', 10], ['y', 20]]);
        m.forEach((a, b) => console.log(a, b));   // 10 x  then  20 y
        console.log(m.size);                      // 2
        try { m.size(); } catch (e) { console.log(e.message); }
      ` } },
      { title: 'Value-based keys: tuple → string or nested Map', html: `<p>Grid coordinates <code>[r, c]</code> as Set entries never match because each array is new. Encode the tuple as a string (<code>r + ',' + c</code>) or as a number (<code>r * COLS + c</code>), which is also faster to hash.</p>${H.chips(['0,0', '0,1', '1,1'], { label: 'visited (string keys)' })}`, code: { lang: 'js', run: true, code: `
        const visitedBad = new Set([[0, 0]]);
        console.log(visitedBad.has([0, 0]));          // false: different array object
        const visited = new Set(['0,0']);
        const key = (r, c) => r + ',' + c;
        console.log(visited.has(key(0, 0)));          // true
        const COLS = 1000;
        const visitedNum = new Set([0 * COLS + 0]);
        console.log(visitedNum.has(0 * COLS + 0));    // true, numeric keys are cheapest
      ` } }
    ],
    deepDive: `<p><b>Under the hood.</b> V8 implements Map and Set as <b>deterministic hash tables</b> (Tyler Close's design): entries live in an array in insertion order, and a separate bucket array of chains points into it. That is why iteration order is insertion order "for free" and why deletes leave holes that are compacted on rehash. Lookups hash the key: strings cache their hash, numbers hash by value, objects get a random identity hash stored lazily on the object.</p>
      <p><b>Map vs object performance.</b> For a fixed set of string keys known in advance (a record), objects win: V8 gives them a hidden class and inline caches turn property access into a single memory load. For dynamic keys with many inserts and deletes, objects fall back to slow "dictionary mode", and Maps are typically faster and more memory-friendly. Never use <code>delete</code> on hot objects; it deopts them.</p>
      <p><b>Security:</b> using a plain object as a dictionary of user-supplied keys invites <b>prototype pollution</b> (<code>obj['__proto__']</code>) and false hits like <code>'toString' in obj</code>. Use <code>Map</code> or <code>Object.create(null)</code>.</p>
      <p><b>Ordering rules for objects</b> (since ES2015/2020): integer-index keys ascending, then string keys in insertion order, then symbols in insertion order. Maps: insertion order only; updating an existing key does not move it (delete then set to move it to the end, which is the LRU trick).</p>`,
    aiEra: `<p><b>What AI changes:</b> AI-generated code still defaults to <code>{}</code> as a dictionary (old training data). It works until a key is <code>'__proto__'</code>, a number vs string mix, or an object key. Reviewing for "should this be a Map?" is now a key human skill.</p>
      <p><b>Use AI as a partner:</b> <code>Find every plain object in this file that is used as a dynamic dictionary and say whether it should be a Map, Set or Object.create(null)</code>. Ask for a micro-benchmark harness, then run it yourself; AI "speed" claims are often from old engines.</p>
      <p><b>Where AI goes wrong:</b> <code>JSON.stringify(map)</code> silently returning <code>{}</code>, using arrays as Set members expecting value equality, and forgetting that ES2025 Set methods need a modern runtime. <b>You own</b>: the data-structure choice and its justification in an interview.</p>`,
    problems: [{
      title: 'LRU Cache Using Only a Map',
      level: 'Medium', tags: ['map', 'lru', 'design'], companies: ['Amazon', 'Microsoft', 'Uber', 'Zomato'],
      statement: `<p>Implement <code>class LRUCache</code> with <code>constructor(capacity)</code>, <code>get(key)</code> returning the value or <code>-1</code>, and <code>put(key, value)</code>. When the cache is full, evict the <b>least recently used</b> key. Both operations must be O(1) on average. Use JavaScript's <code>Map</code> ordering instead of writing a doubly linked list.</p>`,
      constraints: `1 ≤ capacity ≤ 3000; up to 2·10<sup>5</sup> calls; keys may be any value.`,
      example: `<p>cap = 2: <code>put(1,1) put(2,2) get(1)</code> → 1 (now 1 is most recent), <code>put(3,3)</code> evicts ${H.c('r', 'key 2')} (least recent), <code>get(2)</code> → ${H.c('r', '-1')}, <code>get(3)</code> → ${H.c('g', '3')}.</p>${H.chips(['2', '1'], { label: 'Map order after get(1) (oldest first)', hl: { '2': 'r' } })}`,
      brute: { why: `<p>Keep an array of keys ordered by recency. Every <code>get</code>/<code>put</code> must find and move the key with <code>indexOf</code> + <code>splice</code>: O(capacity) per call, ~6·10<sup>8</sup> steps worst case.</p>`,
        code: `
          class LRUBrute {
            constructor(cap) { this.cap = cap; this.data = new Map(); this.order = []; }
            touch(k) { const i = this.order.indexOf(k); if (i >= 0) this.order.splice(i, 1); this.order.push(k); } // O(n)
            get(k) { if (!this.data.has(k)) return -1; this.touch(k); return this.data.get(k); }
            put(k, v) {
              this.data.set(k, v); this.touch(k);
              if (this.order.length > this.cap) this.data.delete(this.order.shift()); // shift is O(n) too
            }
          }
        ` },
      mcq: { q: 'How do you move an existing Map key to the "most recent" end?', options: ['map.set(k, v) again', 'map.delete(k) then map.set(k, v)', 'Sort the map', 'It is impossible with Map'], answer: 1, explain: 'Updating with set keeps the original position. Deleting first and re-inserting appends it at the end of the insertion order.' },
      hints: [
        `<p>Hint 1: A Map iterates in insertion order, so its <b>first</b> key is the oldest one. That is exactly the eviction candidate.</p>`,
        `<p>Hint 2: On every access (get hit or put), <code>delete</code> the key and <code>set</code> it again so it moves to the end. The oldest key is <code>map.keys().next().value</code>.</p>`,
        `<p>Hint 3: Edge cases: <code>put</code> on an existing key must refresh, not evict; capacity 1; stored value could legitimately be falsy, so test with <code>has</code>, not truthiness. Recipe: get → has? delete+set, return; put → delete, set, if size &gt; cap delete first key.</p>`
      ],
      solution: {
        approach: `<p>A Map is internally an insertion-ordered hash table, which is precisely "hash map + linked list" of the classic LRU design. Delete + re-set moves a key to the newest end in O(1); the oldest key is the first one from <code>keys()</code>.</p>`,
        code: { lang: 'js', run: true, code: `
          class LRUCache {
            constructor(capacity) {
              this.capacity = capacity;
              this.map = new Map();            // oldest ... newest
            }
            get(key) {
              if (!this.map.has(key)) return -1;
              const value = this.map.get(key);
              this.map.delete(key);            // move to newest end
              this.map.set(key, value);
              return value;
            }
            put(key, value) {
              if (this.map.has(key)) this.map.delete(key);
              this.map.set(key, value);
              if (this.map.size > this.capacity) {
                const oldest = this.map.keys().next().value; // first = least recently used
                this.map.delete(oldest);
              }
            }
          }

          const c = new LRUCache(2);
          c.put(1, 1); c.put(2, 2);
          console.log(c.get(1));   // 1
          c.put(3, 3);             // evicts 2
          console.log(c.get(2));   // -1
          c.put(4, 4);             // evicts 1
          console.log(c.get(1), c.get(3), c.get(4)); // -1 3 4
          console.log([...c.map.keys()]); // [ 3, 4 ]
        ` },
        dry: { head: ['op', 'Map order (old → new)', 'output'], rows: [
          ['put(1,1)', '1', '-'], ['put(2,2)', '1, 2', '-'], ['get(1)', '2, 1', '1'],
          ['put(3,3)', '<span class="c-r">evict 2</span> → 1, 3', '-'], ['get(2)', '1, 3', '-1'],
          ['put(4,4)', '<span class="c-r">evict 1</span> → 3, 4', '-']
        ] },
        complexity: `<p>O(1) average for get and put (hash operations plus O(1) first-key access); O(capacity) memory.</p>`,
        followUps: ['Add TTL expiry per key.', 'Make it an LFU cache (least frequently used).', 'Why is <code>map.keys().next()</code> O(1) here even after many deletes? (V8 compacts on rehash.)']
      }
    }]
  });

  /* =====================================================================
     TOPIC 5: WeakMap & WeakSet
     ===================================================================== */
  function gcGraph(mode, opt) {
    opt = opt || {};
    var weak = mode === 'weakmap';
    var nodes = [{ id: 'R', label: 'Roots (stack + globals)', x: 12, y: 30, shape: 'box' }];
    var edges = [];
    if (opt.user !== false) nodes.push({ id: 'U', label: "user { name: 'Ann' }", x: 55, y: 8, shape: 'box' });
    if (opt.cache) nodes.push({ id: 'C', label: weak ? 'cache: WeakMap' : 'cache: Map', x: 45, y: 52, shape: 'box' });
    if (opt.meta && opt.user !== false) nodes.push({ id: 'M', label: 'meta { visits: 1 }', x: 86, y: 40, shape: 'box' });
    if (opt.rootUser) edges.push(['R', 'U', 'let user']);
    if (opt.cache) edges.push(['R', 'C', 'const cache']);
    if (opt.meta && opt.user !== false) { edges.push(['C', 'U', weak ? 'key (WEAK)' : 'key (strong)']); edges.push(['C', 'M', 'value']); }
    return { type: 'graph', label: weak ? 'heap: references (WeakMap)' : 'heap: references (Map)', directed: true, height: 62, nodes: nodes, edges: edges, hl: opt.hl || {}, ehl: opt.ehl || {}, tags: opt.tags || {} };
  }
  function weakFrames(input) {
    var mode = String(input || 'weakmap').trim().toLowerCase();
    if (mode !== 'map' && mode !== 'weakmap') throw new Error('Type map or weakmap');
    var W = mode === 'weakmap', name = W ? 'WeakMap' : 'Map', fr = [];
    var code = "let user = { name: 'Ann' };\nconst cache = new " + name + "();\ncache.set(user, { visits: 1 });\nuser = null;   // we are done with Ann\n// ... later, the garbage collector runs";
    fr.push(F('<code>let user = {...}</code>: an object is created on the heap and a <b>root</b> (a variable on the stack) points to it. Anything reachable from a root is kept alive.',
      [C('app.js', code, { 1: 'cur' }), gcGraph(mode, { rootUser: true, hl: { U: 'ok' } })]));
    fr.push(F('<code>const cache = new ' + name + '()</code>: the cache itself is reachable from a root.',
      [C('app.js', code, { 2: 'cur' }), gcGraph(mode, { rootUser: true, cache: true, hl: { C: 'ok' } })]));
    fr.push(F('<code>cache.set(user, meta)</code>. ' + (W ? 'A WeakMap holds its key <b>weakly</b>: this edge does NOT count when the GC decides what is alive. The value is kept alive only <i>as long as the key is alive</i> (an "ephemeron").' : 'A Map holds its key <b>strongly</b>: the cache now keeps user alive by itself, just like any variable would.'),
      [C('app.js', code, { 3: 'cur' }), gcGraph(mode, { rootUser: true, cache: true, meta: true, ehl: { 'C-U': W ? 'win' : 'cur', 'C-M': 'ok' } })]));
    fr.push(F('<code>user = null</code>: the root no longer points at Ann. We think we are done with her. Is the object now garbage?',
      [C('app.js', code, { 4: 'cur' }), gcGraph(mode, { cache: true, meta: true, hl: { U: 'cur' }, tags: { U: 'no root edge' } })]));
    fr.push(F('<b>GC mark phase:</b> start at the roots and follow references. Roots → cache is marked. ' + (W ? 'The WeakMap key edge is <b>skipped</b>, and the value is only marked if its key gets marked some other way. Nothing else reaches Ann.' : 'From the Map, the <b>strong key edge</b> reaches Ann, and the value edge reaches meta. Both get marked alive.'),
      [gcGraph(mode, { cache: true, meta: true, hl: W ? { R: 'ok', C: 'ok', U: 'bad', M: 'bad' } : { R: 'ok', C: 'ok', U: 'ok', M: 'ok' }, ehl: W ? { 'R-C': 'ok' } : { 'R-C': 'ok', 'C-U': 'ok', 'C-M': 'ok' }, tags: W ? { U: 'unmarked', M: 'unmarked' } : { U: 'marked', M: 'marked' } }),
        V('mark results', W ? { cache: 'alive', user: 'unreachable', meta: 'unreachable' } : { cache: 'alive', user: 'alive (via Map)', meta: 'alive' }, W ? { user: 'bad', meta: 'bad' } : { user: 'bad' })]));
    if (W) {
      fr.push(F('<b>Sweep:</b> Ann and her meta are freed, and the WeakMap entry silently disappears. No leak, no manual cleanup. (When exactly this happens is up to the engine; you can never observe it directly.)',
        [gcGraph(mode, { cache: true, user: false, hl: { C: 'ok' } }), V('cache', { 'cache.has(Ann)': 'cannot ask: no reference left', entries: 'gone' }, { entries: 'ok' })]));
    } else {
      fr.push(F('<b>Sweep:</b> nothing is freed. Ann lives as long as the Map lives. Do this for every user who ever visited and you have a classic <span class="c-r">memory leak</span>: <code>cache.size</code> only grows.',
        [gcGraph(mode, { cache: true, meta: true, hl: { U: 'bad', M: 'bad' }, tags: { U: 'leaked', M: 'leaked' } }), V('cache', { 'cache.size': 1, 'can still iterate': 'yes, [...cache.keys()]' }, { 'cache.size': 'bad' })]));
    }
    fr.push(F('<b>The trade-off:</b> because entries can vanish at any moment, a WeakMap/WeakSet has <b>no size, no iteration, no clear()</b>. You can only ask about a key you already hold. Keys must be objects (or non-registered symbols).',
      [TB('Map vs WeakMap', ['', 'Map', 'WeakMap'], [['key types', 'any value', 'objects, non-registered symbols'], ['keeps key alive?', 'yes (strong)', 'no (weak)'], ['size / iteration', 'yes', 'no'], ['methods', 'get set has delete clear + iterators', 'get set has delete'], ['typical use', 'general dictionary', 'metadata / cache tied to object lifetime']])]));
    return fr;
  }

  topics.push({
    title: 'WeakMap & WeakSet: Memory-Friendly Side Tables',
    analogy: `<p>A <b>Map</b> is a <b>hotel that keeps your luggage forever</b>: even after you check out, your bags stay in storage because the hotel's ledger points to them. A <b>WeakMap</b> is a <b>sticky note on the guest</b>: the note is only useful while the guest is around; once the guest leaves town, the note goes with them and nobody has to remember to throw it away.</p>`,
    explain: `<p>JavaScript frees memory automatically with a <b>garbage collector (GC)</b>: anything you can no longer reach from a "root" (a live variable, the global object, the current call stack) gets cleaned up. A normal <code>Map</code> or <code>Set</code> is a strong reference: storing an object in it keeps the object alive.</p>
      <p><b>WeakMap</b> and <b>WeakSet</b> hold their keys/members <b>weakly</b>: they do not stop the GC from collecting them. When the key object dies, its entry disappears automatically.</p>
      ${H.table(['Want to...', 'Use'], [['attach extra data to an object you do not own (DOM node, library object)', '<b>WeakMap</b>'], ['cache results per object without leaking', '<b>WeakMap</b>'], ['mark objects as "seen / processed / branded"', '<b>WeakSet</b>'], ['count, list or iterate the entries', 'Map / Set (weak ones cannot)'], ['use strings or numbers as keys', 'Map (primitives are not allowed in WeakMap)']])}
      <p>The price of weakness: since entries may vanish at any moment, you <b>cannot</b> get <code>size</code>, iterate, or <code>clear()</code> a WeakMap. You can only <code>get/set/has/delete</code> with a key you already hold. Keys must be objects (and since ES2023, non-registered symbols). Using a primitive throws <code>TypeError: Invalid value used as weak map key</code>.</p>
      <p><b>Related tools:</b> <code>WeakRef</code> (a weak pointer you can try to <code>deref()</code>) and <code>FinalizationRegistry</code> (a callback some time after an object is collected). Both are non-deterministic and meant for advanced caches; the spec itself advises avoiding them when possible.</p>`,
    clues: ['"attach metadata to DOM nodes / objects without modifying them" → WeakMap', '"cache per object but avoid memory leaks" → WeakMap memoization', '"memory keeps growing, Map of listeners/objects never shrinks" → swap Map for WeakMap (or delete entries)', '"track visited objects in deep clone / deep equal with cycles" → WeakMap / WeakSet', '"private data per instance (before #private fields)" → module-level WeakMap', '"why can\'t I get the size of a WeakMap?" → GC non-determinism'],
    code: [{ lang: 'js', title: 'Per-object metadata without leaks', run: true, code: `
      const clicks = new WeakMap();            // element -> click count
      function track(el) {
        clicks.set(el, (clicks.get(el) ?? 0) + 1);
        return clicks.get(el);
      }
      let button = { id: 'buy' };              // stands in for a DOM node
      track(button); track(button);
      console.log(clicks.get(button));         // 2
      console.log(clicks.has({ id: 'buy' }));  // false: different object, identity matters
      button = null;                           // node removed: entry becomes collectable

      // WeakSet as a "seen" marker / brand check
      const processed = new WeakSet();
      function processOnce(job) {
        if (processed.has(job)) return 'skipped';
        processed.add(job);
        return 'done';
      }
      const job = { id: 1 };
      console.log(processOnce(job), processOnce(job)); // done skipped

      try { new WeakMap().set('str', 1); } catch (e) { console.log(e.constructor.name, e.message); }
    ` }, { lang: 'js', title: 'WeakRef cache with FinalizationRegistry (advanced, non-deterministic)', code: `
      // A cache that does not keep big values alive. Results may disappear after any GC.
      const cache = new Map();                          // key (string) -> WeakRef(value)
      const registry = new FinalizationRegistry((key) => {
        const ref = cache.get(key);
        if (ref && !ref.deref()) cache.delete(key);     // clean the dead slot
      });
      function getImage(url, load) {
        const hit = cache.get(url)?.deref();
        if (hit) return hit;                            // still alive
        const img = load(url);                          // expensive object
        cache.set(url, new WeakRef(img));
        registry.register(img, url);                    // tell me when img is collected
        return img;
      }
    ` }],
    codeTitle: ['WeakMap & WeakSet basics', 'WeakRef + FinalizationRegistry'],
    viz: {
      title: 'Garbage collection with a Map vs a WeakMap',
      input: 'weakmap',
      inputLabel: 'Cache type: map or weakmap',
      gen: weakFrames
    },
    examples: [
      { title: 'Private instance data (the pre-#private pattern)', html: `<p>Before <code>#private</code> fields, libraries stored secrets in a module-level WeakMap keyed by the instance. Outsiders cannot reach the data, and when the instance dies the data dies with it. You will still see this in older code and transpiler output for <code>#fields</code>.</p>`, code: { lang: 'js', run: true, code: `
        const _balance = new WeakMap();
        class Account {
          constructor(start) { _balance.set(this, start); }
          deposit(x) { _balance.set(this, _balance.get(this) + x); return this; }
          get balance() { return _balance.get(this); }
        }
        const acc = new Account(100).deposit(50);
        console.log(acc.balance);                 // 150
        console.log(Object.keys(acc), JSON.stringify(acc)); // [] {}  -> nothing leaks out
      ` } },
      { title: 'Deep clone that survives cycles', html: `<p>An object that points to itself (<code>a.self = a</code>) makes a naive recursive clone loop forever. A <b>WeakMap from original → copy</b> remembers what we already cloned, so a second visit reuses the copy. WeakMap (not Map) because the bookkeeping should never keep inputs alive.</p>${H.table(['visit', 'in seen?', 'action'], [['a', 'no', 'create copy, record a → copy'], ['a.self (= a)', H.c('g', 'yes'), 'return the existing copy']])}`, code: { lang: 'js', run: true, code: `
        function deepClone(value, seen = new WeakMap()) {
          if (value === null || typeof value !== 'object') return value;
          if (seen.has(value)) return seen.get(value);       // cycle or shared ref
          const copy = Array.isArray(value) ? [] : Object.create(Object.getPrototypeOf(value));
          seen.set(value, copy);                             // record BEFORE recursing
          for (const key of Reflect.ownKeys(value)) copy[key] = deepClone(value[key], seen);
          return copy;
        }
        const a = { n: 1, list: [1, 2] };
        a.self = a;
        const b = deepClone(a);
        console.log(b !== a, b.self === b, b.list !== a.list); // true true true
      ` } },
      { title: 'Predict the output: what a WeakMap refuses to do', html: `<p>Each line below either works or throws. Primitive keys throw; size and iteration simply do not exist (<code>undefined</code> / not iterable).</p>${H.table(['code', 'result'], [['wm.set({}, 1)', H.c('g', 'ok')], ['wm.set(1, 1)', H.c('r', 'TypeError')], ['wm.size', 'undefined'], ['[...wm]', H.c('r', 'TypeError: wm is not iterable')], ["wm.set(Symbol('s'), 1)", H.c('g', 'ok (ES2023)')], ["wm.set(Symbol.for('s'), 1)", H.c('r', 'TypeError (registered symbol)')]])}`, code: { lang: 'js', run: true, code: `
        const wm = new WeakMap();
        const tryIt = (label, fn) => { try { console.log(label, '->', fn()); } catch (e) { console.log(label, '-> throws', e.constructor.name); } };
        tryIt('object key', () => wm.set({}, 1) === wm);
        tryIt('number key', () => wm.set(1, 1));
        tryIt('size', () => wm.size);
        tryIt('spread', () => [...wm]);
        tryIt('symbol key', () => wm.set(Symbol('s'), 1) === wm);
        tryIt('Symbol.for key', () => wm.set(Symbol.for('s'), 1));
      ` } }
    ],
    deepDive: `<p><b>Ephemerons.</b> A WeakMap entry is an <i>ephemeron</i>: the value is reachable only if the key is reachable through some other path. This matters when the value references its own key (<code>wm.set(obj, { owner: obj })</code>): with a normal Map that is a cycle held by the Map forever; with a WeakMap the GC sees that nothing outside the entry reaches <code>obj</code> and frees both. V8 processes ephemerons in a fix-point loop during marking, which is why huge WeakMaps can slow GC pauses a little.</p>
      <p><b>Not a magic leak fix.</b> A WeakMap entry still lives as long as its key does. If the key object is held somewhere else (a closure, an event listener, a global array), nothing is freed. Also the values are strong while the key lives: storing a huge buffer per long-lived key is still expensive. Typical real leaks in JS: forgotten timers and listeners, growing module-level Maps/arrays, detached DOM nodes held by JS, and closures capturing large scopes. Find them with Chrome DevTools heap snapshots ("Comparison" view, retainers panel) or Node <code>--inspect</code> + <code>--heapsnapshot-signal</code>.</p>
      <p><b>Why no iteration?</b> If you could list a WeakMap, its contents would depend on when the GC last ran, making programs non-deterministic and leaking GC timing (a security side channel). WeakRef/FinalizationRegistry accept that non-determinism explicitly; finalizers may run late or never (e.g. at process exit), so never put required cleanup (closing files, flushing data) there.</p>
      <p><b>Frameworks:</b> Vue 3's reactivity keeps <code>WeakMap&lt;target, Map&lt;key, Set&lt;effect&gt;&gt;&gt;</code>; React and many libraries cache per-object derived data in WeakMaps; Babel compiles <code>#private</code> fields to WeakMaps for older targets.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI tools are good at spotting "this Map keyed by objects never shrinks" in code review, and can generate heap-snapshot investigation steps. But they also over-prescribe WeakMap as a cure-all, even where entries need to be listed (WeakMap cannot) or keys are strings (WeakMap rejects them).</p>
      <p><b>Use AI as a partner:</b> paste a heap snapshot summary or retainer chain and ask <code>Explain which reference keeps these 40k objects alive and propose the smallest fix</code>. Ask it to write a test that uses <code>node --expose-gc</code> and <code>global.gc()</code> plus a <code>FinalizationRegistry</code> to assert an object becomes collectable.</p>
      <p><b>What you must still own:</b> drawing the reference graph in your head (roots → objects), knowing the limits (no size, object keys only, values strong while key lives), and explaining why GC-observable behaviour is deliberately hidden.</p>`
  });

  /* =====================================================================
     TOPIC 6: Symbol
     ===================================================================== */
  var SYM_CODE = [
    "const id = Symbol('id');",
    "const id2 = Symbol('id');",
    "const role = Symbol.for('app.role');",
    "const user = { name: 'Ann', age: 30, [id]: 7, [role]: 'admin' };",
    'for (const k in user) log(k);',
    'Object.keys(user);',
    'JSON.stringify(user);',
    'Object.getOwnPropertySymbols(user);',
    'Reflect.ownKeys(user);',
    '({ ...user });   // and Object.assign'
  ].join('\n');
  var SYM_ROWS = [
    ['for...in', "'name', 'age'", 'hidden'],
    ['Object.keys / values / entries', "['name', 'age']", 'hidden'],
    ['JSON.stringify', '{"name":"Ann","age":30}', 'dropped'],
    ['Object.getOwnPropertySymbols', '[Symbol(id), Symbol(app.role)]', 'ONLY symbols'],
    ['Reflect.ownKeys', "['name', 'age', Symbol(id), Symbol(app.role)]", 'everything'],
    ['spread / Object.assign', 'copies all 4 props', 'COPIED']
  ];
  function symFrames() {
    var fr = [];
    fr.push(F('<code>Symbol(\'id\')</code> creates a brand-new, <b>unique</b> primitive. The text \'id\' is only a description for debugging. Two symbols with the same description are still different.',
      [C('symbols.js', SYM_CODE, { 1: 'ok', 2: 'ok' }), V('values', { 'id === id2': false, 'typeof id': "'symbol'", 'id.description': "'id'" }, { 'id === id2': 'bad' })]));
    fr.push(F('<code>Symbol.for(\'app.role\')</code> looks up a <b>global registry</b> shared by the whole runtime (even across iframes/realms). The first call creates it; every later call with the same string returns the <b>same</b> symbol.',
      [C('symbols.js', SYM_CODE, { 3: 'cur' }), MP('global symbol registry', [['app.role', 'Symbol(app.role)']], { 'app.role': 'ok' }), V('values', { "Symbol.for('app.role') === role": true, 'Symbol.keyFor(role)': "'app.role'", 'Symbol.keyFor(id)': 'undefined' }, { "Symbol.for('app.role') === role": 'ok' })]));
    fr.push(F('Symbols can be <b>property keys</b> (computed <code>[id]</code> syntax). The object now has 2 string keys and 2 symbol keys. Symbol keys can never clash with anyone else\'s string keys, which is why libraries and the language itself use them for "hidden-ish" hooks.',
      [C('symbols.js', SYM_CODE, { 4: 'cur' }), MP('own properties of user', [["'name'", "'Ann'"], ["'age'", '30'], ['Symbol(id)', '7'], ['Symbol(app.role)', "'admin'"]], { 'Symbol(id)': 'sel', 'Symbol(app.role)': 'sel' })]));
    for (var i = 0; i < SYM_ROWS.length; i++) {
      var hl = {}; hl[i] = SYM_ROWS[i][2] === 'hidden' || SYM_ROWS[i][2] === 'dropped' ? 'bad' : 'ok';
      var notes = [
        '<code>for...in</code> walks enumerable <b>string</b> keys only (including inherited ones). Symbol keys are skipped.',
        '<code>Object.keys</code> (and values/entries) also ignore symbol keys. That is why symbols are handy for metadata you do not want showing up in normal loops.',
        '<code>JSON.stringify</code> drops symbol-keyed properties entirely (and symbol <i>values</i> become undefined/omitted).',
        'But symbols are <b>not private</b>: <code>Object.getOwnPropertySymbols</code> lists them for anyone who asks.',
        '<code>Reflect.ownKeys</code> returns every own key: strings (integer keys first) then symbols, in insertion order.',
        'Spread and <code>Object.assign</code> <b>do copy</b> enumerable symbol properties. Surprise for many people!'
      ];
      fr.push(F(notes[i], [C('symbols.js', SYM_CODE, (function () { var h = {}; h[5 + i] = 'cur'; return h; })()), TB('who can see symbol keys?', ['API', 'result', 'symbols?'], SYM_ROWS.slice(0, i + 1), hl)]));
    }
    fr.push(F('<b>Well-known symbols</b> are built-in symbols the language checks to let your objects hook into core behaviour. Example: <code>Symbol.toPrimitive</code> receives a <b>hint</b> telling you which kind of value the engine wants.',
      [C('money.js', "class Money {\n  constructor(c) { this.cents = c; }\n  [Symbol.toPrimitive](hint) {\n    if (hint === 'number') return this.cents / 100;\n    if (hint === 'string') return '$' + (this.cents / 100).toFixed(2);\n    return this.cents / 100;   // 'default' (+, ==)\n  }\n}", { 3: 'cur' }),
        TB('expression → hint → result (price = new Money(1250))', ['expression', 'hint', 'result'], [['+price', "'number'", '12.5'], ['String(price) / template literal', "'string'", "'$12.50'"], ["price + ''", "'default'", "'12.5'"], ['price &gt; 10', "'number'", 'true']], { 0: 'ok', 1: 'ok', 2: 'cur' })]));
    fr.push(F('The other well-known symbols you should recognise. Each one is a "plug" the engine looks up on your object.',
      [TB('well-known symbols', ['symbol', 'used by', 'lets you'], [['Symbol.iterator', 'for...of, spread', 'make objects iterable'], ['Symbol.asyncIterator', 'for await...of', 'async iteration'], ['Symbol.toPrimitive', '+, ==, template literals', 'control conversion'], ['Symbol.toStringTag', 'Object.prototype.toString', "change '[object X]'"], ['Symbol.hasInstance', 'instanceof', 'custom instanceof'], ['Symbol.species', 'map/filter on subclasses', 'choose result constructor'], ['Symbol.dispose', '<code>using</code> declarations', 'auto cleanup (explicit resource management)']], { 0: 'sel' })]));
    return fr;
  }

  topics.push({
    title: 'Symbol: Unique Keys & Language Hooks',
    analogy: `<p>A Symbol is like a <b>key cut for one specific lock</b>: two keys can both have the tag "front door" (the description), but only the one you actually cut opens your lock. <b>Well-known symbols</b> are like the <b>standard sockets</b> in a wall: if your appliance has the right plug shape (<code>Symbol.iterator</code>, <code>Symbol.toPrimitive</code>), the building (the JS engine) knows how to power it.</p>`,
    explain: `<p><code>Symbol</code> is the 7th primitive type (with string, number, bigint, boolean, undefined, null). Every call to <code>Symbol(description)</code> returns a <b>unique</b> value; the description is just a label for debugging (<code>sym.description</code>).</p>
      <p><b>Three things symbols are used for:</b></p>
      <ol>
        <li><b>Collision-free property keys.</b> A library can attach <code>obj[Symbol('meta')]</code> without any chance of clashing with your <code>obj.meta</code>.</li>
        <li><b>"Out of the way" properties.</b> Symbol keys are skipped by <code>for...in</code>, <code>Object.keys</code> and <code>JSON.stringify</code>. They are <b>not private</b> though: <code>Object.getOwnPropertySymbols</code> and <code>Reflect.ownKeys</code> reveal them. For real privacy use <code>#private</code> fields.</li>
        <li><b>Well-known symbols</b> (<code>Symbol.iterator</code>, <code>Symbol.toPrimitive</code>, <code>Symbol.toStringTag</code>, <code>Symbol.hasInstance</code>, <code>Symbol.asyncIterator</code>...) are hooks the language calls on your objects.</li>
      </ol>
      ${H.table(['create with', 'unique?', 'shared across files/realms?'], [["Symbol('x')", H.c('g', 'always unique'), 'no'], ["Symbol.for('x')", 'one per string', H.c('g', 'yes, global registry')]])}
      <p><b>Conversion rules:</b> symbols do not auto-convert to strings: <code>'a' + sym</code> throws <code>TypeError: Cannot convert a Symbol value to a string</code>, but <code>String(sym)</code> and <code>sym.toString()</code> work. <code>new Symbol()</code> throws (it is not a constructor). <code>typeof sym === 'symbol'</code>.</p>`,
    clues: ['"add a property without clashing with existing or future keys" → Symbol key', '"hide metadata from Object.keys / JSON" → symbol (not private, just out of the way)', '"make my object work with +, template literals, comparison" → <code>Symbol.toPrimitive</code>', '"customise [object Object] in logs" → <code>Symbol.toStringTag</code>', '"same symbol across modules / iframes" → <code>Symbol.for</code>', '"Cannot convert a Symbol value to a string" → implicit coercion of a symbol'],
    code: [{ lang: 'js', title: 'Symbols in practice', run: true, code: `
      const id = Symbol('id');
      const user = { name: 'Ann', [id]: 42 };
      console.log(Object.keys(user), JSON.stringify(user)); // [ 'name' ] {"name":"Ann"}
      console.log(user[id], Object.getOwnPropertySymbols(user)); // 42 [ Symbol(id) ]
      console.log({ ...user }[id]);                // 42: spread copies symbol keys

      console.log(Symbol('a') === Symbol('a'));    // false
      console.log(Symbol.for('a') === Symbol.for('a')); // true
      console.log(String(id), id.description);     // Symbol(id) id
      try { console.log('id: ' + id); } catch (e) { console.log(e.message); }

      // Well-known: Symbol.toStringTag and Symbol.hasInstance
      class Temperature { get [Symbol.toStringTag]() { return 'Temperature'; } }
      console.log(Object.prototype.toString.call(new Temperature())); // [object Temperature]
      const Even = { [Symbol.hasInstance]: (n) => n % 2 === 0 };
      console.log(4 instanceof Even, 5 instanceof Even); // true false
    ` }],
    codeTitle: ['Symbols tour'],
    viz: {
      title: 'Where symbol keys show up (and well-known hooks)',
      gen: symFrames
    },
    examples: [
      { title: 'Symbol.toPrimitive: a Money type that behaves', html: `<p>The engine calls <code>[Symbol.toPrimitive](hint)</code> whenever it needs a primitive. Hint <code>'number'</code> for math and <code>&lt;</code>, <code>'string'</code> for template literals and <code>String()</code>, <code>'default'</code> for <code>+</code> and <code>==</code>.</p>${H.table(['expression', 'hint', 'output'], [['`Total: ${...}`', 'string', 'Total: $12.50'], ['price * 2', 'number', '25'], ["price + ''", 'default', '12.5']]).replace('${...}', '&#36;{price}')}`, code: { lang: 'js', run: true, code: `
        class Money {
          constructor(cents) { this.cents = cents; }
          [Symbol.toPrimitive](hint) {
            console.log('  hint =', hint);
            if (hint === 'string') return '$' + (this.cents / 100).toFixed(2);
            return this.cents / 100;            // 'number' and 'default'
          }
        }
        const price = new Money(1250);
        console.log(String(price));             // hint = string  -> $12.50
        console.log(price * 2);                 // hint = number  -> 25
        console.log(price + '');                // hint = default -> 12.5
        console.log(price > 10);                // hint = number  -> true
      ` } },
      { title: 'Predict the output: symbols and coercion', html: `<p>Which lines throw?</p>${H.table(['code', 'result'], [["String(Symbol('x'))", H.c('g', "'Symbol(x)'")], ["Symbol('x') + ''", H.c('r', 'TypeError')], ["`${sym}`", H.c('r', 'TypeError')], ["!!Symbol('x')", H.c('g', 'true (symbols are truthy)')], ["+Symbol('x')", H.c('r', 'TypeError')], ["new Symbol('x')", H.c('r', 'TypeError: not a constructor')]]).replace('${sym}', '&#36;{sym}')}`, code: { lang: 'js', run: true, code: `
        const s = Symbol('x');
        const tests = [() => String(s), () => s + '', () => \`\${s}\`, () => !!s, () => +s, () => new Symbol('x')];
        tests.forEach((t, i) => { try { console.log(i, 'ok', String(t())); } catch (e) { console.log(i, 'throws', e.constructor.name); } });
      ` } },
      { title: 'Protocol keys in a library (why Redux, RxJS and Node use symbols)', html: `<p>Libraries mark their objects with a symbol so detection is reliable and never collides: e.g. a <code>Symbol.for('react.element')</code>-style tag lets code recognise elements even across duplicate package copies, and Node's <code>util.inspect.custom</code> is a registered symbol for custom console output. Using <code>Symbol.for</code> is what makes two copies of a library agree.</p>`, code: { lang: 'js', run: true, code: `
        const OBSERVABLE = Symbol.for('my-lib.observable');   // registered: same in every copy of the lib
        function isObservable(x) { return x != null && typeof x[OBSERVABLE] === 'function'; }
        const stream = { [OBSERVABLE]() { return this; }, subscribe() {} };
        console.log(isObservable(stream), isObservable({ subscribe() {} })); // true false
        console.log(Object.keys(stream));  // [ 'subscribe' ]  -> the marker stays out of the way
      ` } }
    ],
    deepDive: `<p><b>Where symbols live.</b> In V8, a symbol is a heap object with a hash and an optional description; property lookups with a symbol key use the same hidden-class/inline-cache machinery as string keys, so they are just as fast. Private class fields (<code>#x</code>) are implemented internally with <i>private symbols</i> that are invisible even to <code>Reflect.ownKeys</code> and Proxies, which is the real privacy symbols alone do not give you.</p>
      <p><b>Registry semantics.</b> <code>Symbol.for</code> keys are global across realms (iframes, workers share nothing, but iframes in one agent do share the registry), so a registered symbol is not collectable and cannot be a WeakMap key. Plain symbols are collectable and since ES2023 allowed as WeakMap/WeakSet keys.</p>
      <p><b>Well-known symbol details.</b> <code>Symbol.toPrimitive</code> overrides the default <code>valueOf</code>/<code>toString</code> order (default: hint 'string' tries toString first, otherwise valueOf first; Date is special and treats 'default' as 'string'). <code>Symbol.species</code> lets subclasses of Array/Promise choose what <code>map</code>/<code>then</code> construct, and is a known source of engine complexity and past security bugs. <code>Symbol.isConcatSpreadable</code> controls <code>concat</code> flattening; <code>Symbol.unscopables</code> hides methods from <code>with</code>. <code>Symbol.dispose</code>/<code>Symbol.asyncDispose</code> power explicit resource management (<code>using res = getHandle()</code>), shipped in TypeScript 5.2 and in V8-based runtimes since 2025.</p>`,
    aiEra: `<p><b>What AI changes:</b> asking "how do I make my class print nicely / compare / iterate" quickly yields well-known-symbol code. The risk is subtle: AI often claims symbols make properties <i>private</i>, which they do not.</p>
      <p><b>Use AI as a partner:</b> <code>List every well-known symbol, which operation triggers it, and give a 3-line example each</code>, then verify each example in Node. Ask it to audit a codebase for <code>Symbol()</code> used where <code>Symbol.for</code> is needed (duplicated package copies) or vice versa.</p>
      <p><b>What you must still own:</b> knowing the visibility rules (keys/JSON skip them, spread copies them, getOwnPropertySymbols reveals them), the coercion TypeErrors, and when to choose <code>#private</code>, a WeakMap, or a symbol for "hidden" data.</p>`
  });

  /* =====================================================================
     TOPIC 7: Proxy & Reflect
     ===================================================================== */
  var PROXY_CODE = [
    'const handler = {',
    '  get(t, k, r)   { log("get", k); return hidden(k) ? undefined : Reflect.get(t, k, r); },',
    '  set(t, k, v, r) {',
    '    if (k === "age" && !(Number.isInteger(v) && v >= 0)) throw new TypeError("bad age");',
    '    return Reflect.set(t, k, v, r);',
    '  },',
    '  has(t, k)      { return !hidden(k) && Reflect.has(t, k); },',
    '  deleteProperty(t, k) { return !hidden(k) && Reflect.deleteProperty(t, k); },',
    '  ownKeys(t)     { return Reflect.ownKeys(t).filter(k => !hidden(k)); }',
    '};',
    'const user = new Proxy(target, handler);   // hidden = key starts with "_"'
  ].join('\n');
  var TRAP_LINE = { get: 2, set: 3, has: 7, deleteProperty: 8, ownKeys: 9 };

  function proxyGraph(hl, ehl, tags) {
    return { type: 'graph', label: 'every operation goes through the proxy', directed: true, height: 56,
      nodes: [
        { id: 'code', label: 'your code', x: 8, y: 14, shape: 'box' },
        { id: 'proxy', label: 'Proxy', x: 30, y: 14, shape: 'box' },
        { id: 'trap', label: 'handler trap', x: 52, y: 14, shape: 'box' },
        { id: 'reflect', label: 'Reflect.*', x: 74, y: 14, shape: 'box' },
        { id: 'target', label: 'target object', x: 93, y: 14, shape: 'box' },
        { id: 'err', label: 'TypeError / false', x: 52, y: 46, shape: 'box' }
      ],
      edges: [['code', 'proxy', 'operation'], ['proxy', 'trap', 'intercept'], ['trap', 'reflect', 'forward'], ['reflect', 'target', 'default'], ['trap', 'err', 'reject']],
      hl: hl || {}, ehl: ehl || {}, tags: tags || {} };
  }
  function proxyFrames(input) {
    var ops = String(input || '').split(/[;\n]+/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length; });
    if (!ops.length) throw new Error('Enter operations like: get name; set age 30; has _secret; delete name; keys');
    if (ops.length > 9) throw new Error('Use at most 9 operations');
    var target = { name: 'Ann', age: 25, _secret: 'xyz' }, order = ['name', 'age', '_secret'], log = [], fr = [];
    function hidden(k) { return k.charAt(0) === '_'; }
    function tgt(hlk, cls) {
      var h = {}; if (hlk) h[hlk] = cls;
      return MP('target (the real object)', order.map(function (k) { return [k, JSON.stringify(target[k])]; }), h);
    }
    fr.push(F('Setup: <code>user</code> is a <b>Proxy</b> wrapping <code>target</code>. Your code only ever touches <code>user</code>. Each operation (read, write, <code>in</code>, delete, listing keys) is routed to a matching <b>trap</b> on the handler. The trap usually calls <b>Reflect</b>, which performs the normal default behaviour on the target.',
      [proxyGraph({ proxy: 'cur' }), C('handler.js', PROXY_CODE, { 11: 'cur' }), tgt()]));
    ops.forEach(function (op) {
      var p = op.split(/\s+/), cmd = p[0].toLowerCase(), key = p[1], trap, expr, result, rejected = false, why;
      if (cmd === 'get') {
        if (!key) throw new Error('get needs a key, e.g. get name');
        trap = 'get'; expr = 'user.' + key;
        log.push('get ' + key);
        if (hidden(key)) { result = 'undefined'; why = 'The trap sees a key starting with "_" and returns <b>undefined</b> without asking the target: the secret is hidden.'; rejected = true; }
        else { result = target.hasOwnProperty(key) ? JSON.stringify(target[key]) : 'undefined'; why = 'Not hidden, so the trap forwards with <code>Reflect.get(t, k, r)</code> and returns ' + result + '.'; }
      } else if (cmd === 'set') {
        if (!key || p.length < 3) throw new Error('set needs a key and value, e.g. set age 30');
        var raw = p.slice(2).join(' '), val = isNaN(Number(raw)) ? raw : Number(raw);
        trap = 'set'; expr = 'user.' + key + ' = ' + JSON.stringify(val);
        if (key === 'age' && !(typeof val === 'number' && Math.floor(val) === val && val >= 0)) { rejected = true; result = 'TypeError: bad age'; why = 'Validation fails (age must be a non-negative integer), so the trap <b>throws</b> and the target is never touched.'; }
        else { if (!target.hasOwnProperty(key)) order.push(key); target[key] = val; result = 'true'; why = 'Valid, so <code>Reflect.set</code> writes to the target and returns true (a set trap must return true or, in strict mode, a TypeError is thrown).'; }
      } else if (cmd === 'has') {
        if (!key) throw new Error('has needs a key, e.g. has name');
        trap = 'has'; expr = "'" + key + "' in user";
        if (hidden(key)) { rejected = true; result = 'false'; why = 'The <code>in</code> operator hits the <b>has</b> trap, which lies for hidden keys: false, even though the target has it.'; }
        else { result = String(target.hasOwnProperty(key)); why = '<code>Reflect.has</code> answers honestly: ' + result + '.'; }
      } else if (cmd === 'delete') {
        if (!key) throw new Error('delete needs a key, e.g. delete name');
        trap = 'deleteProperty'; expr = 'delete user.' + key;
        if (hidden(key)) { rejected = true; result = 'false (TypeError in strict mode)'; why = 'The trap refuses (returns false). In strict-mode code a refused delete throws a TypeError.'; }
        else { var had = target.hasOwnProperty(key); delete target[key]; order = order.filter(function (k) { return k !== key; }); result = 'true'; why = had ? '<code>Reflect.deleteProperty</code> removes it from the target.' : 'Nothing to delete, which still returns true (same as normal objects).'; }
      } else if (cmd === 'keys') {
        trap = 'ownKeys'; expr = 'Object.keys(user)';
        var vis = order.filter(function (k) { return !hidden(k); });
        result = JSON.stringify(vis); why = '<code>Object.keys</code>, <code>for...in</code>, spread and <code>JSON.stringify</code> all start by calling the <b>ownKeys</b> trap. Hidden keys are filtered out.';
      } else throw new Error('Unknown operation "' + cmd + '". Use get, set, has, delete or keys');
      if (cmd !== 'get') log.push(trap + ' ' + (key || ''));
      var lineHl = {}; lineHl[TRAP_LINE[trap]] = rejected ? 'bad' : 'cur';
      if (trap === 'set' && !rejected) lineHl[5] = 'ok';
      fr.push(F('<code>' + H.esc(expr) + '</code> → the Proxy calls <code>handler.' + trap + '</code>.',
        [proxyGraph({ code: 'cur', proxy: 'cur', trap: 'cur' }, { 'code-proxy': 'cur', 'proxy-trap': 'cur' }, { trap: trap }), C('handler.js', PROXY_CODE, lineHl), tgt()]));
      fr.push(F(why + ' Result: <b>' + H.esc(result) + '</b>.',
        [rejected ? proxyGraph({ trap: 'bad', err: 'bad' }, { 'trap-err': 'bad' }, { trap: trap }) : proxyGraph({ reflect: 'ok', target: 'ok' }, { 'trap-reflect': 'ok', 'reflect-target': 'ok' }, { trap: trap }),
          tgt(cmd === 'set' && !rejected ? key : null, 'ok'), V('result', { expression: expr, returns: result }, { returns: rejected ? 'bad' : 'ok' }), { type: 'array', label: 'trap log', values: log.slice() }]));
    });
    fr.push(F('<b>Recap:</b> a Proxy is a programmable middleman. Traps decide; <code>Reflect</code> provides the exact default behaviour (with the right return values and receiver), so forwarding is one line.',
      [TB('common traps', ['trap', 'triggered by'], [['get / set', 'obj.x, obj.x = 1'], ['has', "'x' in obj"], ['deleteProperty', 'delete obj.x'], ['ownKeys', 'Object.keys, for...in, spread'], ['apply', 'fn() (function targets)'], ['construct', 'new Fn()'], ['getOwnPropertyDescriptor / defineProperty', 'descriptors, Object.defineProperty']]), tgt()]));
    return fr;
  }

  topics.push({
    title: 'Proxy & Reflect: Intercepting Object Operations',
    analogy: `<p>A <b>Proxy</b> is a <b>receptionist in front of the boss's office</b>. Every visitor (read, write, delete, "is X here?") talks to the receptionist first. The receptionist can let them through, turn them away, log the visit, or answer on the boss's behalf. <b>Reflect</b> is the receptionist's <b>standard procedure manual</b>: "if nothing special applies, do exactly what would normally happen".</p>`,
    explain: `<p><code>new Proxy(target, handler)</code> creates an object that looks like <code>target</code> but routes each internal operation through a <b>trap</b> on <code>handler</code>. If a trap is missing, the operation goes straight to the target.</p>
      ${H.table(['you write', 'trap called'], [['proxy.x', 'get(target, key, receiver)'], ['proxy.x = v', 'set(target, key, value, receiver)'], ["'x' in proxy", 'has(target, key)'], ['delete proxy.x', 'deleteProperty(target, key)'], ['Object.keys(proxy), for...in', 'ownKeys(target) (+ getOwnPropertyDescriptor)'], ['proxy(...args)', 'apply(target, thisArg, args)'], ['new proxy(...args)', 'construct(target, args, newTarget)']])}
      <p><b>Reflect</b> is a plain object with one function per trap (<code>Reflect.get</code>, <code>Reflect.set</code>, <code>Reflect.has</code>, <code>Reflect.ownKeys</code>, <code>Reflect.apply</code>, <code>Reflect.construct</code>, ...) that performs the <b>default</b> behaviour and returns useful results (e.g. <code>Reflect.set</code> returns true/false instead of throwing). The idiom is: do your extra work in the trap, then <code>return Reflect.xxx(...arguments)</code>.</p>
      <p><b>Everyday uses:</b> validation, default values for missing keys, logging/tracing, negative array indexes, read-only views, API clients where <code>api.users.get()</code> is built on the fly, and <b>reactivity</b> (Vue 3, MobX and Solid stores track reads in <code>get</code> and trigger updates in <code>set</code>).</p>
      <p><b>Rules:</b> traps must respect <b>invariants</b> (e.g. a non-configurable, non-writable property must report its real value), otherwise the engine throws a TypeError. <code>Proxy.revocable()</code> gives you a switch to cut access later.</p>`,
    clues: ['"validate every assignment to an object" / "throw on unknown property" → set/get traps', '"log or track every property access" → get trap (reactivity, ORMs, mocks)', '"default value for missing keys" / "arr[-1]" → get trap', '"make an object read-only without freezing the original" → set/deleteProperty traps returning false', '"forward the default behaviour correctly (getters, receiver)" → Reflect.get(t, k, receiver)', '"revoke access to an object later" → <code>Proxy.revocable</code>'],
    code: [{ lang: 'js', title: 'Validation + defaults + logging with Proxy and Reflect', run: true, code: `
      'use strict';
      function createUser(target) {
        return new Proxy(target, {
          get(t, key, receiver) {
            if (!(key in t)) return typeof key === 'string' ? '(no ' + key + ')' : undefined; // default
            return Reflect.get(t, key, receiver);
          },
          set(t, key, value, receiver) {
            if (key === 'age' && !(Number.isInteger(value) && value >= 0)) {
              throw new TypeError('age must be a non-negative integer, got ' + value);
            }
            console.log('  set', key, '=', value);
            return Reflect.set(t, key, value, receiver); // returns true on success
          },
          deleteProperty(t, key) {
            if (key === 'id') return false;             // refuse -> TypeError in strict mode
            return Reflect.deleteProperty(t, key);
          }
        });
      }
      const user = createUser({ id: 1, name: 'Ann', age: 25 });
      user.age = 26;
      console.log(user.age, user.email);   // 26 (no email)
      try { user.age = -3; } catch (e) { console.log(e.message); }
      try { delete user.id; } catch (e) { console.log('delete refused:', e.constructor.name); }
      console.log(JSON.stringify(user));   // {"id":1,"name":"Ann","age":26}
    ` }, { lang: 'js', title: 'Why Reflect.get needs the receiver', run: true, code: `
      const base = { _name: 'base', get name() { return this._name; } };
      const badProxy  = new Proxy(base, { get: (t, k) => t[k] });               // ignores receiver
      const goodProxy = new Proxy(base, { get: (t, k, r) => Reflect.get(t, k, r) });
      const child1 = Object.create(badProxy);  child1._name = 'child';
      const child2 = Object.create(goodProxy); child2._name = 'child';
      console.log(child1.name);  // base   <- getter ran with this = target (wrong)
      console.log(child2.name);  // child  <- getter ran with this = receiver (right)
    ` }],
    codeTitle: ['Validation proxy', 'Receiver matters'],
    viz: {
      title: 'Trace operations through Proxy → trap → Reflect → target',
      input: 'get name; set age 30; set age -5; has _secret; get _secret; delete name; keys',
      inputLabel: 'Operations separated by ; (get k, set k v, has k, delete k, keys)',
      gen: proxyFrames
    },
    examples: [
      { title: 'Predict the output: the proxy is not the target', html: `<p>A proxy has its own identity: <code>proxy === target</code> is ${H.c('r', 'false')}, and a Set containing the target does not contain the proxy. Writes through a handler with no traps <b>do</b> reach the target, and writes to the target are visible through the proxy (it holds no copy).</p>`, code: { lang: 'js', run: true, code: `
        const target = { n: 1 };
        const p = new Proxy(target, {});    // empty handler: transparent forwarding
        p.n = 2;
        console.log(target.n, p === target);           // 2 false
        target.n = 3;
        console.log(p.n, new Set([target]).has(p));    // 3 false
      ` } },
      { title: 'Revocable access (hand out, then take back)', html: `<p><code>Proxy.revocable</code> returns <code>{ proxy, revoke }</code>. After <code>revoke()</code>, every operation on the proxy throws ${H.c('r', 'TypeError: Cannot perform \'get\' on a proxy that has been revoked')}. Useful for capability-based APIs: give a plugin temporary access to an object.</p>`, code: { lang: 'js', run: true, code: `
        const secrets = { apiKey: 'k-123' };
        const { proxy, revoke } = Proxy.revocable(secrets, {});
        console.log(proxy.apiKey);            // k-123
        revoke();
        try { proxy.apiKey; } catch (e) { console.log(e.message); }
      ` } },
      { title: 'Gotcha: #private fields and built-ins do not proxy', html: `<p>Class methods that touch <code>this.#x</code> fail when called through a proxy, because <code>this</code> is the proxy, which does not have the private slot. Same for built-ins with internal slots (<code>Map</code>, <code>Date</code>): <code>new Proxy(new Map(), {}).get('a')</code> throws. The fix is binding methods to the target in the get trap.</p>${H.table(['call', 'result'], [['proxy.getCount()', H.c('r', 'TypeError (no #count on proxy)')], ['bound version', H.c('g', 'works')]])}`, code: { lang: 'js', run: true, code: `
        class Counter { #count = 0; inc() { return ++this.#count; } }
        const p = new Proxy(new Counter(), {});
        try { p.inc(); } catch (e) { console.log('broken:', e.constructor.name); }

        const fixed = new Proxy(new Counter(), {
          get(t, k, r) { const v = Reflect.get(t, k, r); return typeof v === 'function' ? v.bind(t) : v; }
        });
        console.log('fixed:', fixed.inc(), fixed.inc());   // 1 2

        const mp = new Proxy(new Map([['a', 1]]), { get(t, k) { const v = t[k]; return typeof v === 'function' ? v.bind(t) : v; } });
        console.log('map via proxy:', mp.get('a'));         // 1
      ` } }
    ],
    deepDive: `<p><b>Internal methods.</b> The spec defines every object operation in terms of ~13 internal methods (<code>[[Get]]</code>, <code>[[Set]]</code>, <code>[[HasProperty]]</code>, <code>[[OwnPropertyKeys]]</code>, <code>[[DefineOwnProperty]]</code>, <code>[[GetPrototypeOf]]</code>, <code>[[Call]]</code>, <code>[[Construct]]</code>...). A Proxy is an "exotic object" whose internal methods call your traps; Reflect exposes the ordinary versions as functions. That 1:1 mapping is why <code>Reflect.xxx(...arguments)</code> is always the correct default.</p>
      <p><b>Invariants.</b> After each trap the engine checks consistency with the target: a non-configurable property cannot be reported missing by <code>has</code>/<code>ownKeys</code>, a non-writable non-configurable data property must be returned unchanged by <code>get</code>, <code>ownKeys</code> must list all non-configurable keys and, for a non-extensible target, exactly its keys. Violations throw TypeError. This prevents a proxy from lying about frozen objects, keeping security guarantees.</p>
      <p><b>Performance.</b> Proxies defeat inline caches: every property access becomes a call into the trap, typically 10x–100x slower than a plain property load in microbenchmarks. Fine for config objects and reactive state at UI scale; not for hot numeric loops. Vue 3 mitigates by proxying lazily (nested objects wrapped on first access) and caching proxies in a WeakMap (<code>target → proxy</code>).</p>
      <p><b>Identity &amp; equality.</b> <code>proxy !== target</code>, so libraries that store objects in Maps/Sets can double-count. <code>JSON.stringify</code>, <code>structuredClone</code> and <code>console.log</code> interact with proxies differently (structuredClone throws on proxies: DataCloneError). <code>Array.isArray(new Proxy([], {}))</code> is true (the spec looks through proxies here); <code>typeof</code> mirrors the target (function targets give 'function').</p>`,
    aiEra: `<p><b>What AI changes:</b> AI can scaffold a reactive store, a mock object or an auto-generated API client with Proxies in minutes. The hard parts it often gets wrong are exactly the interview questions: forgetting <code>receiver</code>, ignoring invariants, returning <code>undefined</code> from a set trap (which throws in strict mode), proxying objects with private fields, and dropping performance in hot paths.</p>
      <p><b>Use AI as a partner:</b> <code>Write a deep reactive proxy; then list 5 edge cases (arrays, Map, getters, private fields, identity) and tests for each</code>. Ask it to benchmark proxy vs plain object reads in Node so you have real numbers for your design discussion.</p>
      <p><b>What you must still own:</b> deciding whether metaprogramming is worth the debugging cost. "Magic" proxies make stack traces and DevTools inspection harder; a plain function or a class with setters is often clearer.</p>`,
    problems: [{
      title: 'Python-Style Negative Indexes for Arrays',
      level: 'Medium', tags: ['proxy', 'reflect', 'arrays'], companies: ['Google', 'Atlassian', 'PhonePe'],
      statement: `<p>Write <code>withNegativeIndex(arr)</code> that returns a Proxy so that <code>p[-1]</code> reads the last element, <code>p[-2]</code> the second last, and <code>p[-1] = x</code> writes the last element. All other behaviour (length, methods, iteration, <code>Array.isArray</code>, positive indexes) must work exactly like the original array.</p>`,
      constraints: `Array length up to 10<sup>6</sup>; keys arrive as strings (or symbols); out-of-range negative reads return <code>undefined</code>; must not copy the array.`,
      example: `<p><code>const p = withNegativeIndex([10, 20, 30])</code>: <code>p[-1]</code> → ${H.c('g', '30')}, <code>p[-3]</code> → ${H.c('g', '10')}, <code>p[-4]</code> → ${H.c('m', 'undefined')}. <code>p[-1] = 99</code> → the array becomes ${H.c('g', '[10, 20, 99]')}. <code>p.length</code> → 3, <code>[...p]</code> works.</p>${H.arr([10, 20, 30], { label: 'index -3 -2 -1 maps to', hl: { 2: 'g' } })}`,
      brute: { why: `<p>Writing a helper <code>at(arr, i)</code> works for reads (and <code>arr.at(-1)</code> exists since ES2022), but it is not the requested syntax and it gives no way to <b>write</b> with a negative index. Copying into a wrapper object breaks <code>Array.isArray</code>, iteration and live updates.</p>`,
        code: `
          function getAt(arr, i) {
            return i < 0 ? arr[arr.length + i] : arr[i];   // read only; callers must change syntax
          }
          function setAt(arr, i, v) {
            arr[i < 0 ? arr.length + i : i] = v;
          }
        ` },
      mcq: { q: 'Inside the get trap, what type is the key for <code>p[-1]</code>?', options: ['The number -1', "The string '-1'", 'A symbol', 'undefined'], answer: 1, explain: 'Property keys are always strings or symbols. <code>p[-1]</code> calls the trap with <code>"-1"</code>, so you must check <code>typeof key === "string"</code> and parse it.' },
      hints: [
        `<p>Hint 1: Keys are strings like <code>"-1"</code>. Symbols (e.g. <code>Symbol.iterator</code>) also arrive, so check the type before parsing.</p>`,
        `<p>Hint 2: Convert: if the key is a string matching <code>/^-\\d+$/</code>, map it to <code>String(target.length + Number(key))</code>, then forward with <code>Reflect.get</code> / <code>Reflect.set</code>.</p>`,
        `<p>Hint 3: Do the mapping in BOTH get and set traps; leave everything else untouched. Out of range (index still negative after mapping) → return undefined on read, refuse (return false or throw) on write. Recipe: normalize(key) helper shared by both traps.</p>`
      ],
      solution: {
        approach: `<p>Intercept only the keys that look like negative integers and translate them to a real index; forward everything else unchanged with <code>Reflect</code>. Because the target is the real array, <code>length</code>, methods, iteration and <code>Array.isArray</code> keep working, and there is no copy.</p>`,
        code: { lang: 'js', run: true, code: `
          function withNegativeIndex(arr) {
            const normalize = (target, key) => {
              if (typeof key === 'string' && /^-\\d+$/.test(key)) {
                const idx = target.length + Number(key);     // -1 -> length - 1
                return idx >= 0 ? String(idx) : null;        // null = out of range
              }
              return key;                                     // positive index, 'length', symbols...
            };
            return new Proxy(arr, {
              get(target, key, receiver) {
                const k = normalize(target, key);
                return k === null ? undefined : Reflect.get(target, k, receiver);
              },
              set(target, key, value, receiver) {
                const k = normalize(target, key);
                if (k === null) throw new RangeError('Index ' + key + ' out of range');
                return Reflect.set(target, k, value, receiver);
              }
            });
          }

          const p = withNegativeIndex([10, 20, 30]);
          console.log(p[-1], p[-3], p[-4]);  // 30 10 undefined
          p[-1] = 99;
          console.log([...p], p.length);     // [ 10, 20, 99 ] 3
          p.push(40);
          console.log(p[-1], Array.isArray(p)); // 40 true
          console.log(p.map(x => x / 10));   // [ 1, 2, 9.9, 4 ]
        ` },
        dry: { head: ['operation', 'key in trap', 'normalized', 'result'], rows: [
          ['p[-1]', "'-1'", "'2'", '30'],
          ['p[-4]', "'-4'", 'null', 'undefined'],
          ['p[-1] = 99', "'-1'", "'2'", 'arr[2] = 99'],
          ['p.length', "'length'", "'length'", '3'],
          ['[...p]', 'Symbol.iterator', 'unchanged', '<span class="c-g">[10, 20, 99]</span>']
        ] },
        complexity: `<p>O(1) extra per access (a regex test and an addition), no copying; memory O(1). The proxy makes every access slower than a raw array, so do not use it in hot loops.</p>`,
        followUps: ['Also support negative indexes in <code>has</code> and <code>deleteProperty</code>.', 'Why does <code>p.push</code> still work even though push uses <code>this.length</code>?', 'Compare with the built-in <code>Array.prototype.at</code>.']
      }
    }]
  });

  /* =====================================================================
     TOPIC 8: Optional chaining (?.) & nullish coalescing (??)
     ===================================================================== */
  var OC_EXPRS = [
    { text: "user?.profile?.name ?? 'Anonymous'", hops: [['profile', true], ['name', true]], op: '??', dflt: 'Anonymous' },
    { text: 'user.profile.age || 18', hops: [['profile', false], ['age', false]], op: '||', dflt: 18 },
    { text: 'user.profile.age ?? 18', hops: [['profile', false], ['age', false]], op: '??', dflt: 18 },
    { text: "user?.profile?.address?.city ?? 'Unknown'", hops: [['profile', true], ['address', true], ['city', true]], op: '??', dflt: 'Unknown' },
    { text: "user.settings?.theme ?? 'light'", hops: [['settings', false], ['theme', true]], op: '??', dflt: 'light' },
    { text: "user.getTag?.() ?? 'no tag'", hops: [['getTag', false], ['()', true]], op: '??', dflt: 'no tag' }
  ];
  function short(v) {
    if (v === undefined) return 'undefined';
    var s = JSON.stringify(v);
    return s.length > 34 ? s.slice(0, 31) + '...' : s;
  }
  function ocFrames(input) {
    var user;
    try { user = JSON.parse(String(input || '')); } catch (e) { throw new Error('Enter valid JSON for user, e.g. {"profile":{"name":"Asha","age":0}}'); }
    var fr = [];
    fr.push(F('Here is <code>user</code>. We will evaluate 6 expressions against it. Remember: <code>?.</code> stops and returns <b>undefined</b> if the thing on its LEFT is <code>null</code> or <code>undefined</code>; <code>??</code> uses the right side only if the left is <code>null</code>/<code>undefined</code>; <code>||</code> uses it for <b>any falsy</b> value.',
      [T('<code>' + H.esc(JSON.stringify(user)) + '</code>', 'user'), TB('the 6 expressions', ['#', 'expression'], OC_EXPRS.map(function (e, i) { return [String(i + 1), e.text]; }))]));
    OC_EXPRS.forEach(function (ex, n) {
      var cur = user, rows = [['user', '-', short(cur), 'start']], hlRows = {}, err = null, shorted = false;
      for (var i = 0; i < ex.hops.length; i++) {
        var key = ex.hops[i][0], opt = ex.hops[i][1];
        var link = (opt ? '?.' : (key === '()' ? '' : '.')) + key;
        if (cur === null || cur === undefined) {
          if (opt) { rows.push([link, 'yes', 'undefined', 'left side is ' + short(cur) + ' → <b>short-circuit</b>: the REST of the chain is skipped']); hlRows[rows.length - 1] = 'sel'; cur = undefined; shorted = true; break; }
          err = 'TypeError: Cannot read properties of ' + short(cur) + " (reading '" + key + "')";
          rows.push([link, 'no', '-', '<span class="c-r">' + err + '</span>']); hlRows[rows.length - 1] = 'bad'; break;
        }
        if (key === '()') {
          if (typeof cur !== 'function') { err = 'TypeError: not a function'; rows.push([link, 'yes', '-', 'value is not a function']); hlRows[rows.length - 1] = 'bad'; break; }
        } else {
          var next = (typeof cur === 'object') ? cur[key] : undefined;
          rows.push([link, opt ? 'yes' : 'no', short(next), 'left is ' + (Array.isArray(cur) ? 'an array' : typeof cur) + ', read .' + key]);
          hlRows[rows.length - 1] = 'ok';
          cur = next;
        }
      }
      var label = 'expression ' + (n + 1) + ': ' + ex.text;
      if (err) {
        fr.push(F('<code>' + H.esc(ex.text) + '</code>: a plain <code>.</code> (no question mark) hit ' + H.esc(rows[rows.length - 2][2]) + ', so JavaScript <b>throws</b>. The <code>' + ex.op + '</code> never even runs. This is the bug <code>?.</code> exists to prevent.',
          [TB(label, ['link', 'optional?', 'value', 'what happens'], rows, hlRows), V('result', { value: err }, { value: 'bad' })]));
        return;
      }
      fr.push(F('<code>' + H.esc(ex.text) + '</code>: walking the chain' + (shorted ? ' until a <code>?.</code> meets null/undefined and <b>short-circuits</b> to undefined.' : ' link by link. Every link had a real value on its left.') + ' Chain value = <b>' + H.esc(short(cur)) + '</b>.',
        [TB(label, ['link', 'optional?', 'value', 'what happens'], rows, hlRows), V('chain value', { value: short(cur) }, { value: 'cur' })]));
      var useRight = ex.op === '??' ? (cur === null || cur === undefined) : !cur;
      var result = useRight ? ex.dflt : cur;
      var why = ex.op === '??'
        ? (useRight ? 'Left is ' + short(cur) + ' (nullish), so <code>??</code> falls back to ' + H.esc(short(ex.dflt)) + '.' : 'Left is ' + H.esc(short(cur)) + ', which is NOT null/undefined, so <code>??</code> keeps it' + (!cur ? ' <b>even though it is falsy</b>. That is the whole point of ??.' : '.'))
        : (useRight ? 'Left is ' + H.esc(short(cur)) + ', which is <b>falsy</b>, so <code>||</code> replaces it with ' + H.esc(short(ex.dflt)) + (cur === 0 || cur === '' || cur === false ? '. <span class="c-r">Bug alert: a real value was thrown away!</span>' : '.') : 'Left is truthy, so <code>||</code> keeps it.');
      fr.push(F(why, [V('applying ' + ex.op, { left: short(cur), operator: ex.op, right: short(ex.dflt), result: short(result) }, { result: useRight ? 'win' : 'ok' })]));
    });
    fr.push(F('<b>Cheat sheet:</b> which values does each operator replace?',
      [TB("x || 'd'  vs  x ?? 'd'", ['x', "x || 'd'", "x ?? 'd'"], [['0', "'d'", '0'], ["''", "'d'", "''"], ['false', "'d'", 'false'], ['NaN', "'d'", 'NaN'], ['null', "'d'", "'d'"], ['undefined', "'d'", "'d'"], ["'hi'", "'hi'", "'hi'"]], { 0: 'cur', 1: 'cur', 2: 'cur', 3: 'cur' })]));
    return fr;
  }

  topics.push({
    title: 'Optional Chaining (?.) & Nullish Coalescing (??)',
    analogy: `<p><b>Optional chaining</b> is like following directions with a rule: "go to the 3rd floor, then room 12, then the blue drawer, <b>but if any door is missing, just come back and say 'not found'</b>" instead of walking into a wall (a TypeError). <b>Nullish coalescing</b> is a <b>spare key</b> you use only when the real key is <b>missing</b>, not when the real key happens to be small, like the number 0 or an empty string.</p>`,
    explain: `<p><b>Optional chaining <code>?.</code></b> (ES2020): if the value on its left is <code>null</code> or <code>undefined</code>, the whole chain stops and evaluates to <code>undefined</code> instead of throwing.</p>
      ${H.table(['form', 'example', 'safe when'], [['property', 'user?.address', 'user is null/undefined'], ['computed', 'user?.[key]', 'user is null/undefined'], ['call', 'cb?.()', 'cb is null/undefined (still throws if it is e.g. a number)'], ['method', 'obj.method?.()', 'method does not exist']])}
      <p><b>Short-circuiting:</b> once a <code>?.</code> hits nullish, everything to its right in the same chain is skipped, including function calls and their arguments: in <code>a?.b.c(x++)</code>, if <code>a</code> is null, <code>x++</code> never runs.</p>
      <p><b>Nullish coalescing <code>??</code></b>: <code>a ?? b</code> gives <code>b</code> only when <code>a</code> is <code>null</code> or <code>undefined</code>. Compare with <code>||</code>, which replaces <b>every falsy</b> value (<code>0, '', false, NaN, 0n</code>):</p>
      ${H.table(['', 'count = 0', 'name = ""', 'flag = false', 'x = null'], [["x || 'default'", H.c('r', "'default'"), H.c('r', "'default'"), H.c('r', "'default'"), "'default'"], ["x ?? 'default'", H.c('g', '0'), H.c('g', '""'), H.c('g', 'false'), "'default'"]])}
      <p><b>Logical assignment</b> (ES2021): <code>a ??= b</code> (assign if nullish), <code>a ||= b</code> (assign if falsy), <code>a &amp;&amp;= b</code> (assign if truthy). They only assign when needed, so setters do not fire unnecessarily.</p>
      <p><b>Rules:</b> you cannot mix <code>??</code> with <code>||</code> or <code>&amp;&amp;</code> without parentheses (<code>a || b ?? c</code> is a SyntaxError). You cannot assign through optional chaining (<code>user?.name = 'x'</code> is a SyntaxError).</p>`,
    clues: ['"Cannot read properties of undefined (reading ...)" → missing <code>?.</code> on deep API data', '"default value, but 0 / empty string / false are valid" → <code>??</code>, not <code>||</code>', '"call the callback if provided" → <code>onDone?.()</code>', '"set default only if not already set" → <code>??=</code>', '"API response may be missing nested fields" → <code>data?.items?.[0]?.id ?? fallback</code>', '"a || b ?? c gives SyntaxError" → parenthesise mixed operators'],
    code: [{ lang: 'js', title: 'Everyday patterns', run: true, code: `
      const res = { data: { items: [{ id: 7, stock: 0, title: '' }] } };
      const empty = {};

      console.log(res.data?.items?.[0]?.id ?? 'none');   // 7
      console.log(empty.data?.items?.[0]?.id ?? 'none'); // none   (no TypeError)

      const item = res.data.items[0];
      console.log(item.stock || 10, item.stock ?? 10);   // 10 0  <- || destroyed a real 0
      console.log(item.title || 'Untitled', JSON.stringify(item.title ?? 'Untitled')); // Untitled ""

      function load(onDone) { onDone?.('loaded'); return 'ok'; }
      console.log(load(), load(msg => console.log('callback:', msg)));

      const config = { retries: 0 };
      config.retries ??= 3;       // stays 0
      config.timeout ??= 5000;    // set because it was undefined
      config.name ||= 'svc';      // set because undefined is falsy
      console.log(config);        // { retries: 0, timeout: 5000, name: 'svc' }
    ` }, { lang: 'js', title: 'Short-circuit: the rest of the chain is skipped', run: true, code: `
      let calls = 0;
      const sideEffect = () => { calls++; return 'x'; };
      const a = null;
      console.log(a?.b.c.d(sideEffect()));   // undefined, and .c/.d are never touched
      console.log('sideEffect ran', calls, 'times'); // 0
      try {
        (a?.b).toString();                   // parens END the chain: (undefined).toString()
      } catch (e) {
        console.log('parens end the chain ->', e.constructor.name); // TypeError
      }
    ` }],
    codeTitle: ['?. and ?? patterns', 'Short-circuit scope'],
    viz: {
      title: 'Evaluate ?. chains and ?? vs || on your data',
      input: '{"profile":{"name":"Asha","age":0,"address":null}}',
      inputLabel: 'user as JSON',
      gen: ocFrames
    },
    examples: [
      { title: 'Predict the output: parentheses end the chain', html: `<p><code>a?.b.c</code> with <code>a = null</code> is <code>undefined</code> (the whole chain short-circuits). But <code>(a?.b).c</code> first computes <code>(undefined)</code>, then reads <code>.c</code> on it: ${H.c('r', 'TypeError')}. Grouping breaks the short-circuit.</p>`, code: { lang: 'js', run: true, code: `
        const a = null;
        console.log(a?.b.c);                 // undefined
        try { console.log((a?.b).c); } catch (e) { console.log('TypeError:', e.message); }
      ` } },
      { title: 'Predict the output: ?? precedence and mixing', html: `<p><code>??</code> has lower precedence than arithmetic and comparison. <code>null ?? 1 + 1</code> is ${H.c('g', '2')} (the + happens first on the right side). <code>0 ?? 5 &gt; 3</code> is ${H.c('g', '0')}. And <code>a || b ?? c</code> does not even parse: wrap one side, e.g. <code>(a || b) ?? c</code>.</p>${H.table(['expression', 'result'], [['null ?? 1 + 1', '2'], ['0 ?? 5 &gt; 3', '0'], ["'' ?? 'x'", "''"], ['(null || undefined) ?? "d"', '"d"']])}`, code: { lang: 'js', run: true, code: `
        console.log(null ?? 1 + 1);            // 2
        console.log(0 ?? 5 > 3);               // 0
        console.log('' ?? 'x', JSON.stringify('' ?? 'x')); //  ""
        console.log((null || undefined) ?? 'd'); // d
      ` } },
      { title: 'Refactoring legacy guards', html: `<p>Old code used long <code>&amp;&amp;</code> chains which also have the falsy problem (a <code>0</code> count stops the chain and returns <code>0</code>, not undefined). Modern code is shorter and more precise.</p>${H.table(['legacy', 'modern'], [['user &amp;&amp; user.address &amp;&amp; user.address.city', 'user?.address?.city'], ["opts.size !== undefined &amp;&amp; opts.size !== null ? opts.size : 10", 'opts.size ?? 10'], ["if (typeof cb === 'function') cb()", 'cb?.() (only checks nullish!)'], ['if (!o.list) o.list = []', 'o.list ??= []']])}`, code: { lang: 'js', run: true, code: `
        const order = { items: [], meta: { count: 0 } };
        console.log(order && order.meta && order.meta.count && order.meta.count.toFixed(1)); // 0  (stopped early, surprise)
        console.log(order?.meta?.count?.toFixed(1));  // 0.0
        order.tags ??= [];
        order.tags.push('new');
        console.log(order.tags);                      // [ 'new' ]
      ` } }
    ],
    deepDive: `<p><b>Exact semantics.</b> <code>a?.b</code> is roughly <code>(a === null || a === undefined) ? undefined : a.b</code>, but <code>a</code> is evaluated <b>once</b> (important if it is a getter or a function call). The spec models a whole chain as one <i>OptionalChain</i> node, which is why short-circuiting covers every later link until the chain ends (a parenthesis, an operator, or the end of the expression). <code>obj.method?.()</code> keeps <code>this</code> bound to <code>obj</code>. <code>?.</code> checks only for nullish: <code>(5)?.()</code> still throws "is not a function", and <code>document.all ?? x</code> is the one weird legacy exception (document.all is falsy but not nullish).</p>
      <p><b>Over-chaining smell.</b> Sprinkling <code>?.</code> everywhere hides real bugs: if <code>user</code> must exist at this point, <code>user?.id</code> converts a crash you would notice into a silent <code>undefined</code> that breaks something far away. Use <code>?.</code> only where absence is a legal state, and validate API shapes at the boundary (e.g. with zod/valibot) so internal code can trust its data. TypeScript's strict null checks make this explicit.</p>
      <p><b>Performance and transpilation.</b> In modern engines these operators are as fast as the manual checks. Older targets (pre-2020 browsers) need transpiling; Babel turns <code>a?.b</code> into <code>(_a = a) === null || _a === void 0 ? void 0 : _a.b</code>, which slightly increases bundle size. <code>??=</code> is not just sugar for <code>a = a ?? b</code>: it does not perform the assignment when <code>a</code> is already non-nullish, so read-only properties and setters behave differently.</p>`,
    aiEra: `<p><b>What AI changes:</b> AI assistants add <code>?.</code> defensively to everything and often "fix" defaults with <code>||</code>. Both pass tests with typical data and fail on the edge values that matter (<code>0</code> items in a cart, an empty search string, a false feature flag).</p>
      <p><b>Use AI as a partner:</b> <code>Find every || default in this diff where the left side could legally be 0, '' or false and suggest ?? instead</code>. Ask it to generate edge-case fixtures (null, missing, 0, '', false, NaN) for each optional path in an API response.</p>
      <p><b>What you must still own:</b> the judgement of which absences are legal (use <code>?.</code>) versus programmer errors (let it throw or validate at the boundary), and reading precedence/short-circuit puzzles quickly in interviews.</p>`,
    problems: [{
      title: 'Safe Deep Get with Defaults (lodash.get)',
      level: 'Easy', tags: ['optional chaining', 'nullish coalescing', 'strings'], companies: ['Walmart', 'Paytm', 'Meesho'],
      statement: `<p>Implement <code>get(obj, path, defaultValue)</code>. <code>path</code> is a string like <code>"a.b[0].c"</code> or an array of keys. Walk the object safely: if any step is <code>null</code>/<code>undefined</code>, stop. Return <code>defaultValue</code> <b>only if the final result is <code>undefined</code></b> (so stored <code>0</code>, <code>''</code>, <code>false</code> and <code>null</code> values are returned as-is, like lodash).</p>`,
      constraints: `Path length ≤ 100 segments; keys contain letters, digits, _ and $; bracket indexes are non-negative integers.`,
      example: `<p><code>obj = { a: { b: [{ c: 0 }] } }</code></p><p><code>get(obj, 'a.b[0].c', 5)</code> → ${H.c('g', '0')} (a real zero, not replaced). <code>get(obj, 'a.x.y', 'd')</code> → ${H.c('g', "'d'")} (a.x is undefined, chain stops, no TypeError). <code>get(obj, ['a', 'b', 'length'])</code> → ${H.c('g', '1')}.</p>`,
      brute: { why: `<p>Chaining plain property reads crashes on the first missing step, and the common "fix" with <code>||</code> replaces legitimate falsy values: <code>get(obj, 'a.b[0].c', 5)</code> would wrongly return 5.</p>`,
        code: `
          function getBroken(obj, path, def) {
            const keys = path.replace(/\\[(\\d+)\\]/g, '.$1').split('.');
            let cur = obj;
            for (const k of keys) cur = cur[k];        // TypeError when cur is undefined
            return cur || def;                         // 0, '' and false wrongly replaced
          }
        ` },
      mcq: { q: 'Which return expression matches lodash semantics (default only when the result is undefined)?', options: ['cur || def', 'cur ?? def', 'cur === undefined ? def : cur', 'cur ? cur : def'], answer: 2, explain: '<code>??</code> would also replace a stored <code>null</code>, but lodash returns stored nulls. Only an explicit <code>=== undefined</code> check matches exactly. (In everyday app code, <code>??</code> is usually what you want.)' },
      hints: [
        `<p>Hint 1: Normalise the path first: turn <code>[0]</code> into <code>.0</code>, then split on dots, dropping empty pieces. Arrays are already a key list.</p>`,
        `<p>Hint 2: Walk with a loop: before each step, if <code>cur == null</code> (null or undefined) return the default. Otherwise <code>cur = cur[key]</code>. This is optional chaining written by hand.</p>`,
        `<p>Hint 3: At the end return <code>cur === undefined ? defaultValue : cur</code>. Edge cases: empty path returns obj itself; primitives along the way are fine (<code>'abc'.length</code> works).</p>`
      ],
      solution: {
        approach: `<p>Normalise the path into keys, then perform a manual optional chain: stop as soon as the current value is nullish. Apply the default only for <code>undefined</code>, preserving every real falsy value. For a fixed, known path in app code, <code>obj?.a?.b?.[0]?.c ?? fallback</code> is the inline equivalent.</p>`,
        code: { lang: 'js', run: true, code: `
          function get(obj, path, defaultValue) {
            const keys = Array.isArray(path)
              ? path
              : String(path).replace(/\\[(\\d+)\\]/g, '.$1').split('.').filter(Boolean);
            let cur = obj;
            for (const key of keys) {
              if (cur == null) return defaultValue;   // null or undefined: the chain stops (like ?.)
              cur = cur[key];
            }
            return cur === undefined ? defaultValue : cur;
          }

          const obj = { a: { b: [{ c: 0, d: null, e: false }] } };
          console.log(get(obj, 'a.b[0].c', 5));      // 0
          console.log(get(obj, 'a.b[0].d', 5));      // null (stored null is kept)
          console.log(get(obj, 'a.b[0].e', true));   // false
          console.log(get(obj, 'a.x.y', 'd'));       // d
          console.log(get(obj, ['a', 'b', 'length'])); // 1
          console.log(obj?.a?.b?.[0]?.c ?? 5);       // 0  (inline version for a known path)
        ` },
        dry: { head: ['step', 'key', 'cur before', 'action'], rows: [
          ['parse', '-', '-', "'a.b[0].c' → ['a','b','0','c']"],
          ['1', 'a', 'obj', 'cur = obj.a'],
          ['2', 'b', '{ b: [...] }', 'cur = [...]'],
          ['3', '0', '[{...}]', 'cur = { c: 0, ... }'],
          ['4', 'c', '{ c: 0 }', 'cur = 0'],
          ['end', '-', '0', '<span class="c-g">0 !== undefined → return 0</span>']
        ] },
        complexity: `<p>O(L) for L path characters (parse) plus O(k) steps; O(k) memory for the key list.</p>`,
        followUps: ['Write the matching <code>set(obj, path, value)</code> that creates missing objects/arrays.', 'Support quoted bracket keys like <code>a["x.y"]</code>.', 'Type it in TypeScript so the return type follows the path.']
      }
    }]
  });

  /* =====================================================================
     PRACTICE: Easy
     ===================================================================== */
  practice.push({
    title: 'Reusable range() Iterable',
    level: 'Easy', tags: ['iterator', 'Symbol.iterator'], companies: ['Google', 'Atlassian'],
    statement: `<p>Write <code>range(start, end, step = 1)</code> that returns an <b>iterable</b> (not an array) producing <code>start, start+step, …</code> while the value is <b>less than</b> <code>end</code> (or <b>greater than</b> <code>end</code> for a negative step). It must work with <code>for...of</code>, spread and destructuring, and must be <b>reusable</b>: looping over the same range twice gives the full sequence both times. A step of 0 must throw a <code>RangeError</code>.</p>`,
    constraints: `-10<sup>9</sup> ≤ start, end ≤ 10<sup>9</sup>; step ≠ 0; the range may be huge, so memory must be O(1).`,
    example: `<p><code>[...range(1, 10, 3)]</code> → ${H.arr([1, 4, 7], { hl: { 0: 'g', 1: 'g', 2: 'g' } })} because 10 is not &lt; 10. <code>[...range(5, 0, -2)]</code> → <b>[5, 3, 1]</b>. Spreading the same range object twice gives the same answer both times, because each spread asks <code>[Symbol.iterator]()</code> for a ${H.c('b', 'fresh iterator')}.</p>`,
    brute: { why: `<p>Build an array with a loop and return it. It works for small inputs but <code>range(0, 1e9)</code> allocates a billion numbers (about 8 GB) before the first value is used, and a <code>break</code> after 3 items still paid for all of them.</p>`,
      code: { lang: 'js', run: true, code: `
        function rangeArray(start, end, step = 1) {
          const out = [];
          for (let v = start; step > 0 ? v < end : v > end; v += step) out.push(v); // eager: all values in memory
          return out;
        }
        console.log(rangeArray(1, 10, 3)); // [ 1, 4, 7 ]
      ` } },
    mcq: { q: 'Why should <code>[Symbol.iterator]()</code> return a NEW object each call instead of <code>this</code>?', options: ['So the range can be looped many times, each loop with its own position', 'Because returning this is a syntax error', 'To make the iterator faster', 'Spread requires a class instance'], answer: 0, explain: 'If the iterable returns itself, its cursor is shared: the second loop starts where the first one stopped (usually at the end) and yields nothing.' },
    hints: [
      `<p>Hint 1: for...of only needs an object with a <code>[Symbol.iterator]</code> method that returns something with <code>next()</code> → <code>{ value, done }</code>.</p>`,
      `<p>Hint 2: Keep <code>start/end/step</code> on the iterable; keep the moving cursor <b>inside</b> the iterator created by each call. A generator method <code>*[Symbol.iterator]()</code> does that automatically.</p>`,
      `<p>Hint 3: Edge cases: step 0 → throw early; negative step flips the comparison; <code>range(3, 3)</code> is empty. Recipe: validate, return <code>{ *[Symbol.iterator]() { for (let v = start; cond(v); v += step) yield v; } }</code>.</p>`
    ],
    solution: {
      approach: `<p>Store only the three numbers. Each time a consumer asks for an iterator, a generator method creates a fresh cursor, so the range is reusable and lazy. Memory stays O(1) regardless of length.</p>`,
      code: { lang: 'js', run: true, code: `
        function range(start, end, step = 1) {
          if (step === 0) throw new RangeError('step must not be 0');
          const inRange = step > 0 ? (v) => v < end : (v) => v > end;
          return {
            // A generator method: every call gives a brand-new iterator with its own v
            *[Symbol.iterator]() {
              for (let v = start; inRange(v); v += step) yield v;
            }
          };
        }

        const r = range(1, 10, 3);
        console.log([...r]);                 // [ 1, 4, 7 ]
        console.log([...r]);                 // [ 1, 4, 7 ]  reusable
        console.log([...range(5, 0, -2)]);   // [ 5, 3, 1 ]
        const [first, second] = range(100, Infinity, 50); // lazy: infinite range is fine
        console.log(first, second);          // 100 150
        try { range(0, 5, 0); } catch (e) { console.log(e.name); } // RangeError
      ` },
      dry: { head: ['call', 'v', 'v &lt; 10?', 'result'], rows: [
        ['next()', '1', 'yes', '{ value: 1, done: false }'],
        ['next()', '4', 'yes', '{ value: 4, done: false }'],
        ['next()', '7', 'yes', '{ value: 7, done: false }'],
        ['next()', '10', '<span class="c-r">no</span>', '{ value: undefined, done: true }']
      ] },
      complexity: `<p>O(1) per value, O(1) memory. Creating the iterable is O(1) no matter how long the range is.</p>`,
      followUps: ['Add <code>.length</code> and <code>.includes(x)</code> computed in O(1) with arithmetic.', 'Support BigInt ranges.', 'Make <code>range</code> also usable with <code>Iterator.from(...).map()</code> helpers.']
    }
  });

  practice.push({
    title: 'Remove Duplicates, Keep First Order',
    level: 'Easy', tags: ['set', 'array'], companies: ['Amazon', 'Flipkart'],
    statement: `<p>Given an array of primitives, return a new array with duplicates removed, keeping the <b>first</b> occurrence of each value in its original order. Treat <code>NaN</code> as equal to <code>NaN</code> and <code>0</code> equal to <code>-0</code> (the same rule a <code>Set</code> uses). Then write <code>uniqueBy(arr, keyFn)</code> that dedupes objects by a computed key.</p>`,
    constraints: `0 ≤ n ≤ 10<sup>6</sup>; aim for O(n).`,
    example: `<p>${H.arr([3, 1, 3, 'NaN', 2, 1, 'NaN'], { hl: { 2: 'r', 5: 'r', 6: 'r' } })} → ${H.arr([3, 1, 'NaN', 2], { hl: { 0: 'g', 1: 'g', 2: 'g', 3: 'g' } })} Red cells are repeats. A Set remembers what it has seen, and iterates in insertion order, so the first occurrences survive in order.</p>`,
    brute: { why: `<p><code>arr.filter((x, i) =&gt; arr.indexOf(x) === i)</code> is O(n²) because <code>indexOf</code> scans from the start every time, and it also <b>drops every NaN</b> because <code>indexOf</code> uses <code>===</code> and <code>NaN !== NaN</code>.</p>`,
      code: { lang: 'js', run: true, code: `
        const dedupeSlow = (arr) => arr.filter((x, i) => arr.indexOf(x) === i); // O(n^2), loses NaN
        console.log(dedupeSlow([3, 1, 3, NaN, 2, 1, NaN])); // [ 3, 1, 2 ]  NaN vanished!
      ` } },
    mcq: { q: 'What does <code>[...new Set([1, \'1\', 1, NaN, NaN])]</code> give?', options: ["[1, '1', NaN]", '[1, NaN]', "[1, '1', NaN, NaN]", "['1', NaN]"], answer: 0, explain: "Set uses SameValueZero: 1 and '1' differ by type, the second 1 is a duplicate, and NaN equals NaN in a Set." },
    hints: [
      `<p>Hint 1: A Set already stores each value once and keeps insertion order. Spreading it back gives the answer.</p>`,
      `<p>Hint 2: For objects, a Set of the objects themselves compares by <b>identity</b>, so compute a key with <code>keyFn</code> and keep a Set of keys seen.</p>`,
      `<p>Hint 3: Recipe for uniqueBy: <code>seen = new Set()</code>; for each item, <code>k = keyFn(item)</code>; if not seen, add k and push item.</p>`
    ],
    solution: {
      approach: `<p>One pass with a Set: O(1) average membership test, insertion order preserved, SameValueZero semantics for free.</p>`,
      code: { lang: 'js', run: true, code: `
        const dedupe = (arr) => [...new Set(arr)];

        function uniqueBy(arr, keyFn) {
          const seen = new Set();
          const out = [];
          for (const item of arr) {
            const k = keyFn(item);
            if (seen.has(k)) continue;   // a repeat: skip it
            seen.add(k);
            out.push(item);              // first occurrence wins
          }
          return out;
        }

        console.log(dedupe([3, 1, 3, NaN, 2, 1, NaN])); // [ 3, 1, NaN, 2 ]
        console.log(dedupe([0, -0, '0']));              // [ 0, '0' ]
        const users = [{ id: 1, n: 'a' }, { id: 2, n: 'b' }, { id: 1, n: 'c' }];
        console.log(uniqueBy(users, (u) => u.id));      // ids 1 and 2, first ones kept
      ` },
      dry: { head: ['x', 'seen before?', 'Set after', 'output'], rows: [
        ['3', 'no', '{3}', '[3]'], ['1', 'no', '{3,1}', '[3,1]'], ['3', '<span class="c-r">yes</span>', '{3,1}', '[3,1]'],
        ['NaN', 'no', '{3,1,NaN}', '[3,1,NaN]'], ['NaN', '<span class="c-r">yes</span>', '{3,1,NaN}', '[3,1,NaN]']
      ] },
      complexity: `<p>O(n) time on average, O(n) extra memory for the Set.</p>`,
      followUps: ['Keep the <b>last</b> occurrence instead.', 'Dedupe objects by deep content (stable stringify as key).', 'Return the duplicates instead of the uniques.']
    }
  });

  practice.push({
    title: 'Merge Config Defaults Without Losing 0, false or ""',
    level: 'Easy', tags: ['nullish coalescing', 'optional chaining'], companies: ['Microsoft', 'Swiggy'],
    statement: `<p>A service reads user settings that may be partial or missing: <code>{ retries?: number, verbose?: boolean, prefix?: string, db?: { port?: number } }</code>. Write <code>resolveConfig(user)</code> that returns a full config using defaults <code>{ retries: 3, verbose: true, prefix: 'app', port: 5432 }</code> <b>only</b> when the user value is <code>null</code> or <code>undefined</code>. A user who sets <code>retries: 0</code>, <code>verbose: false</code> or <code>prefix: ''</code> must keep those values. <code>user</code> itself may be <code>undefined</code>.</p>`,
    constraints: `No external libraries. Must not throw for <code>undefined</code>, <code>{}</code> or <code>{ db: null }</code>.`,
    example: `<p><code>resolveConfig({ retries: 0, verbose: false, db: null })</code> → <code>{ retries: ${H.c('g', '0')}, verbose: ${H.c('g', 'false')}, prefix: 'app', port: 5432 }</code>. With <code>||</code> you would wrongly get ${H.c('r', 'retries: 3, verbose: true')} because 0 and false are falsy.</p>`,
    brute: { why: `<p>The classic <code>||</code> + <code>&amp;&amp;</code> guards treat every falsy value as "missing", silently overriding deliberate <code>0</code>, <code>false</code> and <code>''</code>. That is a real production bug (for example "retries: 0" for idempotency-sensitive calls becoming 3).</p>`,
      code: { lang: 'js', run: true, code: `
        function resolveConfigBuggy(user) {
          return {
            retries: (user && user.retries) || 3,      // 0 -> 3  (bug)
            verbose: (user && user.verbose) || true,   // false -> true (bug)
            prefix: (user && user.prefix) || 'app',    // '' -> 'app' (bug)
            port: (user && user.db && user.db.port) || 5432
          };
        }
        console.log(resolveConfigBuggy({ retries: 0, verbose: false, prefix: '' }));
      ` } },
    mcq: { q: 'Which value of <code>x</code> makes <code>x ?? \'d\'</code> and <code>x || \'d\'</code> give DIFFERENT results?', options: ['0', 'undefined', 'null', "'hello'"], answer: 0, explain: '?? only falls back for null/undefined. || falls back for every falsy value, including 0, so 0 ?? "d" is 0 but 0 || "d" is "d".' },
    hints: [
      `<p>Hint 1: You need "fallback only for null/undefined" — that is exactly what <code>??</code> means.</p>`,
      `<p>Hint 2: Reach into possibly-missing objects with <code>?.</code>: <code>user?.db?.port</code> is <code>undefined</code> instead of a TypeError when <code>user</code> or <code>db</code> is missing.</p>`,
      `<p>Hint 3: Do not mix <code>??</code> with <code>||</code>/<code>&amp;&amp;</code> without parentheses (it is a SyntaxError). Recipe: each field = <code>user?.path ?? default</code>.</p>`
    ],
    solution: {
      approach: `<p>Combine optional chaining (safe reads) with nullish coalescing (correct defaults). Each field is a single, readable expression.</p>`,
      code: { lang: 'js', run: true, code: `
        const DEFAULTS = { retries: 3, verbose: true, prefix: 'app', port: 5432 };

        function resolveConfig(user) {
          return {
            retries: user?.retries ?? DEFAULTS.retries,
            verbose: user?.verbose ?? DEFAULTS.verbose,
            prefix: user?.prefix ?? DEFAULTS.prefix,
            port: user?.db?.port ?? DEFAULTS.port   // db may be null/undefined
          };
        }

        console.log(resolveConfig({ retries: 0, verbose: false, prefix: '', db: null }));
        // { retries: 0, verbose: false, prefix: '', port: 5432 }
        console.log(resolveConfig(undefined));
        // { retries: 3, verbose: true, prefix: 'app', port: 5432 }
        console.log(resolveConfig({ db: { port: 6543 } }).port); // 6543
      ` },
      dry: { head: ['field', 'user value', '?? result', '|| result'], rows: [
        ['retries', '0', '<span class="c-g">0</span>', '<span class="c-r">3</span>'],
        ['verbose', 'false', '<span class="c-g">false</span>', '<span class="c-r">true</span>'],
        ['prefix', "''", "<span class=\"c-g\">''</span>", "<span class=\"c-r\">'app'</span>"],
        ['port', 'user.db is null → undefined', '5432', '5432']
      ] },
      complexity: `<p>O(1): a fixed number of property reads.</p>`,
      followUps: ['Generalise to a deep merge of any defaults object, still respecting falsy user values.', 'Use <code>??=</code> to fill defaults in place.', 'Type it in TypeScript with <code>Required&lt;Config&gt;</code> as the return type.']
    }
  });

  practice.push({
    title: 'Infinite Fibonacci Generator with take()',
    level: 'Easy', tags: ['generator', 'lazy evaluation'], companies: ['Adobe', 'Zoho'],
    statement: `<p>Write a generator <code>fib()</code> that yields the Fibonacci numbers <code>0, 1, 1, 2, 3, 5, …</code> forever, and a helper generator <code>take(iterable, n)</code> that yields at most the first <code>n</code> values and then <b>stops the source</b>. Print the first 10 Fibonacci numbers and the first Fibonacci number greater than 1000.</p>`,
    constraints: `0 ≤ n ≤ 1000. Use BigInt if you want exact values beyond 2<sup>53</sup>.`,
    example: `<p><code>[...take(fib(), 10)]</code> → ${H.arr([0, 1, 1, 2, 3, 5, 8, 13, 21, 34])} Nothing past the 10th value is ever computed: the generator is paused at its <code>yield</code> and then closed by <code>return()</code> when <code>take</code> finishes.</p>`,
    brute: { why: `<p>Compute a big array first (say 1000 numbers) and slice it. You guess a size up front, waste work for small n, fail if the guess is too small, and cannot express "first value greater than 1000" without guessing again.</p>`,
      code: { lang: 'js', run: true, code: `
        function fibArray(count) {
          const a = [0, 1];
          while (a.length < count) a.push(a[a.length - 1] + a[a.length - 2]); // eager
          return a.slice(0, count);
        }
        console.log(fibArray(10)); // must know the size in advance
      ` } },
    mcq: { q: 'What stops an infinite <code>while (true) { yield … }</code> loop from hanging the program?', options: ['The consumer simply stops calling next(), so the body stays paused', 'JavaScript detects infinite loops', 'Generators run on another thread', 'yield throws after 1000 values'], answer: 0, explain: 'A generator only runs until its next yield when next() is called. If nobody calls next() again, the loop never advances.' },
    hints: [
      `<p>Hint 1: Keep two variables <code>a, b</code> inside the generator and update them with destructuring after each <code>yield a</code>.</p>`,
      `<p>Hint 2: <code>take</code> is also a generator: loop <code>for...of</code> over the source, yield each value, and <code>return</code> when the count hits n. Returning out of a for...of automatically calls the source's <code>return()</code>.</p>`,
      `<p>Hint 3: Edge case n = 0 must yield nothing <b>and</b> not even start the source. Check <code>n &lt;= 0</code> before the loop.</p>`
    ],
    solution: {
      approach: `<p>The generator holds the state <code>(a, b)</code> across pauses. <code>take</code> is a lazy adapter; for...of + early return closes the source cleanly. Finding the first value over 1000 is just another early-exit loop.</p>`,
      code: { lang: 'js', run: true, code: `
        function* fib() {
          let [a, b] = [0, 1];
          while (true) {          // infinite, but only advances on demand
            yield a;
            [a, b] = [b, a + b];
          }
        }

        function* take(iterable, n) {
          if (n <= 0) return;     // do not even start the source
          let i = 0;
          for (const v of iterable) {
            yield v;
            if (++i >= n) return; // leaving for...of calls source.return()
          }
        }

        console.log([...take(fib(), 10)]); // [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]

        for (const v of fib()) {
          if (v > 1000) { console.log('first > 1000:', v); break; } // 1597
        }
        console.log([...take(fib(), 0)]);  // []
      ` },
      dry: { head: ['next() #', 'yielded a', 'a, b after update'], rows: [
        ['1', '0', '1, 1'], ['2', '1', '1, 2'], ['3', '1', '2, 3'], ['4', '2', '3, 5'], ['5', '3', '5, 8']
      ] },
      complexity: `<p>O(1) per value, O(1) memory. <code>take(fib(), n)</code> costs O(n) total.</p>`,
      followUps: ['Switch to BigInt to print the 100th Fibonacci exactly.', 'Rewrite <code>take</code> with the built-in iterator helper <code>fib().take(10).toArray()</code>.', 'Add <code>takeWhile(pred)</code>.']
    }
  });

  /* =====================================================================
     PRACTICE: Medium
     ===================================================================== */
  practice.push({
    title: 'Group Anagrams with a Map',
    level: 'Medium', tags: ['map', 'hashing', 'string'], companies: ['Amazon', 'Meta', 'Bloomberg'],
    statement: `<p>Given an array of lowercase words, group the anagrams together. Return an array of groups; the groups must appear in the order their <b>first</b> word appeared, and words inside a group keep their input order.</p>`,
    constraints: `1 ≤ words.length ≤ 10<sup>4</sup>, 0 ≤ word.length ≤ 100, letters a–z.`,
    example: `<p><code>['eat','tea','tan','ate','nat','bat']</code> → <b>[['eat','tea','ate'], ['tan','nat'], ['bat']]</b>.</p>${H.kv([['aet', "['eat','tea','ate']"], ['ant', "['tan','nat']"], ['abt', "['bat']"]], { label: 'Map: sorted-letters key → group', hl: { aet: 'g' } })}<p>A Map keeps keys in insertion order, so <code>[...map.values()]</code> is already ordered by first appearance.</p>`,
    brute: { why: `<p>Compare every word with every existing group using a full anagram check: O(n² · k). With 10<sup>4</sup> words that is up to 10<sup>8</sup> comparisons of 100-letter strings.</p>`,
      code: { lang: 'js', run: true, code: `
        const isAnagram = (a, b) => a.length === b.length && [...a].sort().join('') === [...b].sort().join('');
        function groupSlow(words) {
          const groups = [];
          for (const w of words) {
            const g = groups.find((grp) => isAnagram(grp[0], w)); // scans all groups
            if (g) g.push(w); else groups.push([w]);
          }
          return groups;
        }
        console.log(groupSlow(['eat', 'tea', 'tan', 'ate', 'nat', 'bat']));
      ` } },
    mcq: { q: 'Why is a Map preferred over a plain object for the groups here?', options: ['Guaranteed insertion-order iteration for all keys and no prototype key collisions', 'Objects cannot have string keys', 'Maps sort their keys alphabetically', 'Maps use less memory per entry in all engines'], answer: 0, explain: 'An object would put integer-like keys first and inherits from Object.prototype (a key like "constructor" is a trap). A Map iterates in insertion order with no inherited keys.' },
    hints: [
      `<p>Hint 1: Two words are anagrams exactly when their letter multisets match. A canonical form (sorted letters, or a 26-count signature) makes them equal strings.</p>`,
      `<p>Hint 2: Map from canonical key → array of words. <code>map.get(key)</code> or create.</p>`,
      `<p>Hint 3: A count signature like <code>'1#0#0#…'</code> is O(k) instead of O(k log k). Empty strings all share one key. Return <code>[...map.values()]</code>.</p>`
    ],
    solution: {
      approach: `<p>Hash every word to a canonical key and bucket it in a Map. Insertion order of the Map gives the required group order for free.</p>`,
      code: { lang: 'js', run: true, code: `
        function signature(word) {
          const counts = new Array(26).fill(0);
          for (let i = 0; i < word.length; i++) counts[word.charCodeAt(i) - 97]++;
          return counts.join('#');           // O(k) canonical key
        }

        function groupAnagrams(words) {
          const groups = new Map();          // key -> words, in first-seen order
          for (const w of words) {
            const key = signature(w);
            let bucket = groups.get(key);
            if (!bucket) { bucket = []; groups.set(key, bucket); }
            bucket.push(w);
          }
          return [...groups.values()];
        }

        console.log(groupAnagrams(['eat', 'tea', 'tan', 'ate', 'nat', 'bat']));
        // [ [ 'eat', 'tea', 'ate' ], [ 'tan', 'nat' ], [ 'bat' ] ]
        console.log(groupAnagrams(['', 'b', '']));  // [ [ '', '' ], [ 'b' ] ]
      ` },
      dry: { head: ['word', 'key (sorted view)', 'new key?', 'Map state'], rows: [
        ['eat', 'aet', 'yes', 'aet:[eat]'], ['tea', 'aet', 'no', 'aet:[eat,tea]'], ['tan', 'ant', 'yes', 'aet:[..], ant:[tan]'],
        ['ate', 'aet', 'no', 'aet:[eat,tea,ate]'], ['nat', 'ant', 'no', 'ant:[tan,nat]'], ['bat', 'abt', 'yes', '3 groups']
      ] },
      complexity: `<p>O(n · k) time with the count signature (O(n · k log k) with sorting), O(n · k) memory.</p>`,
      followUps: ['Support any Unicode letters (use a Map of counts and sort entries for the key).', 'Return only groups of size ≥ 2.', 'Stream words in and emit groups lazily with a generator.']
    }
  });

  practice.push({
    title: 'Lazy Pipeline: map, filter, take with Generators',
    level: 'Medium', tags: ['generator', 'iterator', 'lazy'], companies: ['Netflix', 'Uber'],
    statement: `<p>Build a tiny lazy collection library: <code>lazy(iterable)</code> returns an object with chainable <code>map(fn)</code>, <code>filter(fn)</code>, <code>take(n)</code> and a terminal <code>toArray()</code>. Nothing must be computed until <code>toArray()</code> (or a for...of) runs, and each source value must flow through the whole chain <b>one at a time</b> (no intermediate arrays). The object itself must be iterable.</p>`,
    constraints: `Source may be infinite. Each stage must be O(1) extra memory.`,
    example: `<p><code>lazy(naturals()).map(x =&gt; x * x).filter(x =&gt; x % 2).take(3).toArray()</code> → <b>[1, 9, 25]</b>. Trace: 1 → 1 → odd ✓; 2 → 4 → ${H.c('r', 'even ✗')}; 3 → 9 ✓; 4 → 16 ✗; 5 → 25 ✓ → take is full, the source is closed at 5 — ${H.c('g', 'only 5 values ever read')}.</p>`,
    brute: { why: `<p>Using array methods (<code>arr.map().filter().slice()</code>) builds a full intermediate array per stage and needs a finite array up front. On an infinite source it never returns; on a large one it wastes memory proportional to n per stage.</p>`,
      code: { lang: 'js', run: true, code: `
        const nums = Array.from({ length: 1e5 }, (_, i) => i + 1);  // must materialise the source
        let mapped = 0;
        const res = nums.map((x) => { mapped++; return x * x; })    // 100000 squares computed
          .filter((x) => x % 2)
          .slice(0, 3);
        console.log(res, 'map calls:', mapped);                      // [1, 9, 25] map calls: 100000
      ` } },
    mcq: { q: 'In a lazy pipeline, in what order are calls made for the first value?', options: ['source → map → filter → take for value 1, then value 2 starts', 'map runs on all values, then filter on all', 'filter runs before map', 'take pre-fetches n values'], answer: 0, explain: 'Pull-based iteration: the consumer asks take for a value, which asks filter, which asks map, which asks the source. Each value travels the whole chain before the next one is pulled.' },
    hints: [
      `<p>Hint 1: Each operator is a generator that wraps the previous iterable: <code>function* map(src, fn) { for (const x of src) yield fn(x); }</code>.</p>`,
      `<p>Hint 2: <code>lazy(src)</code> returns an object holding <code>src</code>; each method returns <code>lazy(newGenerator)</code> so calls chain. Implement <code>[Symbol.iterator]</code> by delegating to the source.</p>`,
      `<p>Hint 3: <code>take</code> must return as soon as it has n items (leaving for...of closes the upstream). <code>take(0)</code> must not pull anything.</p>`
    ],
    solution: {
      approach: `<p>Wrap generators. Each method builds a new generator around the current iterable, so the chain is just nested iterators. Pulling from the outermost one pulls exactly one value through each stage. This is the same model as ES2025 iterator helpers (<code>Iterator.prototype.map/filter/take</code>).</p>`,
      code: { lang: 'js', run: true, code: `
        function lazy(source) {
          return {
            [Symbol.iterator]() { return source[Symbol.iterator](); },
            map(fn) {
              return lazy((function* () { for (const x of source) yield fn(x); })());
            },
            filter(pred) {
              return lazy((function* () { for (const x of source) if (pred(x)) yield x; })());
            },
            take(n) {
              return lazy((function* () {
                if (n <= 0) return;
                let i = 0;
                for (const x of source) { yield x; if (++i >= n) return; } // closes upstream
              })());
            },
            toArray() { return [...this]; }
          };
        }

        function* naturals() { let n = 1; while (true) yield n++; }

        let pulled = 0;
        const counted = (function* () { for (const n of naturals()) { pulled++; yield n; } })();
        const out = lazy(counted).map((x) => x * x).filter((x) => x % 2).take(3).toArray();
        console.log(out, 'source values pulled:', pulled); // [ 1, 9, 25 ] source values pulled: 5

        // Same thing with built-in iterator helpers (ES2025, Node 22+):
        if (typeof Iterator !== 'undefined' && Iterator.prototype.map) {
          console.log(naturals().map((x) => x * x).filter((x) => x % 2).take(3).toArray());
        }
      ` },
      dry: { head: ['source n', 'map → x²', 'filter odd?', 'take count'], rows: [
        ['1', '1', '<span class="c-g">yes</span>', '1'], ['2', '4', '<span class="c-r">no</span>', '1'], ['3', '9', '<span class="c-g">yes</span>', '2'],
        ['4', '16', '<span class="c-r">no</span>', '2'], ['5', '25', '<span class="c-g">yes</span>', '3 → stop, close source']
      ] },
      complexity: `<p>O(k) total work where k is the number of source values actually needed; O(1) memory per stage (plus the output array).</p>`,
      followUps: ['Add <code>flatMap</code> and <code>chunk(size)</code>.', 'Make an async version with <code>async function*</code> and <code>for await</code>.', 'Why is a pipeline of generators slower per element than a hand-written loop, and when does it not matter?']
    }
  });

  practice.push({
    title: 'Memoize: Map for Primitives, WeakMap for Objects',
    level: 'Medium', tags: ['map', 'weakmap', 'caching', 'closures'], companies: ['Google', 'Atlassian', 'PhonePe'],
    statement: `<p>Write <code>memoize(fn)</code> for functions of <b>any number</b> of arguments. Arguments may be primitives or objects. Results must be cached per exact argument list (objects compared by identity, primitives by SameValueZero), the cache must not mix up <code>1</code> and <code>'1'</code>, and an object argument that is no longer used anywhere else must be <b>garbage-collectable</b> (the cache must not keep it alive).</p>`,
    constraints: `Up to 10<sup>5</sup> calls; argument count may vary between calls.`,
    example: `<p><code>m(1, 2)</code> computes, <code>m(1, 2)</code> again is a cache hit, <code>m('1', 2)</code> computes again (different type). With <code>m(objA)</code>, the cache path is ${H.c('b', 'root WeakMap → objA → result')}, so dropping every other reference to objA lets the GC remove that branch.</p>`,
    brute: { why: `<p><code>JSON.stringify(args)</code> as a cache key: <code>1</code> and <code>'1'</code> stay distinct, but two different objects with the same content collide, functions/symbols/undefined vanish, cycles throw, Maps become <code>{}</code>, and the string cache keeps growing forever (a memory leak).</p>`,
      code: { lang: 'js', run: true, code: `
        function memoizeJson(fn) {
          const cache = new Map();
          return (...args) => {
            const key = JSON.stringify(args);      // lossy key
            if (!cache.has(key)) cache.set(key, fn(...args));
            return cache.get(key);
          };
        }
        const sizeOf = memoizeJson((o) => Object.keys(o).length);
        const a = { x: 1 }; const b = { x: 1 };
        console.log(sizeOf(a), sizeOf(b));          // b reuses a's entry (collision)
        console.log(JSON.stringify([undefined, () => 1])); // [null,null]
      ` } },
    mcq: { q: 'Why build a TREE of caches (one level per argument) instead of one flat Map?', options: ['Each argument can then be used as a real key (object identity, no stringifying), and object levels can be WeakMaps', 'Trees are always faster than flat maps', 'Maps cannot hold arrays as values', 'To sort the arguments'], answer: 0, explain: 'There is no built-in way to hash an argument LIST by identity. A trie of caches keyed by each argument in turn keeps identity semantics, and object keys can live in WeakMaps so they stay collectable.' },
    hints: [
      `<p>Hint 1: Think of the argument list as a path in a trie: node = cache level, edge = one argument.</p>`,
      `<p>Hint 2: Each node has two child tables: a <code>Map</code> for primitive args and a <code>WeakMap</code> for object/function args. The final node stores the result.</p>`,
      `<p>Hint 3: Distinguish "argument count" too: <code>f(1)</code> and <code>f(1, undefined)</code> differ, so store results at the node reached after exactly <code>args.length</code> steps, using a <code>hasResult</code> flag (the result itself may be <code>undefined</code>).</p>`
    ],
    solution: {
      approach: `<p>A trie whose levels are <code>Map</code> (primitives) or <code>WeakMap</code> (objects). Lookup walks one level per argument. Identity semantics come for free, and object branches disappear when their keys are collected.</p>`,
      code: { lang: 'js', run: true, code: `
        function memoize(fn) {
          const makeNode = () => ({ prim: new Map(), obj: new WeakMap(), hasResult: false, result: undefined });
          const root = makeNode();
          const isObj = (v) => (typeof v === 'object' && v !== null) || typeof v === 'function';

          return function (...args) {
            let node = root;
            for (const arg of args) {
              const table = isObj(arg) ? node.obj : node.prim;  // WeakMap keeps objects collectable
              let next = table.get(arg);
              if (!next) { next = makeNode(); table.set(arg, next); }
              node = next;
            }
            if (!node.hasResult) {               // result may legitimately be undefined
              node.result = fn.apply(this, args);
              node.hasResult = true;
            }
            return node.result;
          };
        }

        let calls = 0;
        const add = memoize((a, b) => { calls++; return a + b; });
        console.log(add(1, 2), add(1, 2), add('1', 2), 'calls =', calls); // 3 3 '12' calls = 2

        const keysOf = memoize((o) => { calls++; return Object.keys(o).length; });
        const a = { x: 1 }, b = { x: 1 };
        console.log(keysOf(a), keysOf(b), keysOf(a), 'calls =', calls); // 1 1 1 calls = 4
        console.log(add(-0, 5), add(0, 5), 'calls =', calls);             // 5 5 calls = 5 (-0 and 0 share one Map key)
      ` },
      dry: { head: ['call', 'path walked', 'hit?', 'calls'], rows: [
        ['add(1,2)', 'root → prim 1 → prim 2', 'no, compute 3', '1'],
        ['add(1,2)', 'root → prim 1 → prim 2', '<span class="c-g">yes</span>', '1'],
        ["add('1',2)", "root → prim '1' (new) → prim 2", 'no, compute', '2'],
        ['keysOf(a)', 'root → obj a (WeakMap)', 'no', '3'],
        ['keysOf(b)', 'root → obj b (different identity)', 'no', '4']
      ] },
      complexity: `<p>O(k) per call for k arguments (one hash lookup per level). Memory grows with distinct argument lists, but object-keyed branches are reclaimable.</p>`,
      followUps: ['Add an LRU bound to the primitive levels.', 'Support async functions: cache the promise, delete it on rejection.', 'Explain why a WeakMap cannot be used for primitive arguments.']
    }
  });

  practice.push({
    title: 'Change-Tracking Object with Proxy',
    level: 'Medium', tags: ['proxy', 'reflect', 'observer'], companies: ['Microsoft', 'Vercel', 'Razorpay'],
    statement: `<p>Write <code>observe(target, onChange)</code> that returns a proxy. Every successful <b>write</b> or <b>delete</b> on the proxy, including on <b>nested objects and arrays</b>, must call <code>onChange(path, oldValue, newValue)</code> where <code>path</code> is a dotted string like <code>'user.tags.1'</code>. Writes that do not change the value (same value per <code>Object.is</code>) must not notify. Reads must behave exactly like the original object.</p>`,
    constraints: `Objects and arrays may nest to any depth. Do not deep-copy the target.`,
    example: `<p>With <code>state = observe({ user: { name: 'A', tags: ['x'] } }, log)</code>:</p>${H.table(['operation', 'onChange call'], [["state.user.name = 'B'", "('user.name', 'A', 'B')"], ["state.user.tags.push('y')", "('user.tags.1', undefined, 'y') only: writing index 1 already grew length to 2, so push's own length write is a no-op"], ["state.user.name = 'B'", H.c('m', 'no call (unchanged)')], ['delete state.user.tags', "('user.tags', [...], undefined)"]])}`,
    brute: { why: `<p>Polling: keep a deep copy and diff it against the live object on a timer. It is O(size) every tick, misses changes made and reverted between ticks, and reports late. Another naive approach, <code>Object.defineProperty</code> getters/setters per key (Vue 2 style), cannot see newly added keys, deletes or array index writes.</p>`,
      code: { lang: 'js', run: true, code: `
        function diffPoll(prev, next, path = '') {
          const changes = [];
          const keys = new Set([...Object.keys(prev || {}), ...Object.keys(next || {})]);
          for (const k of keys) {
            const p = path ? path + '.' + k : k;
            const a = prev?.[k], b = next?.[k];
            if (a && b && typeof a === 'object' && typeof b === 'object') changes.push(...diffPoll(a, b, p));
            else if (!Object.is(a, b)) changes.push(p);
          }
          return changes;                         // O(size of object) every time
        }
        const before = { user: { name: 'A' } };
        const snapshot = structuredClone(before);
        before.user.name = 'B';
        console.log(diffPoll(snapshot, before)); // [ 'user.name' ]
      ` } },
    mcq: { q: 'Why does the <code>get</code> trap need to wrap nested objects in proxies too?', options: ['Writes to state.user.name happen on the inner object; without a proxy there, the set trap never fires', 'Because Reflect.get only works on proxies', 'To make reads faster', 'Proxies cannot have object values'], answer: 0, explain: 'state.user returns the raw inner object; the assignment .name = ... targets that inner object directly. Only a proxy around it can intercept the write.' },
    hints: [
      `<p>Hint 1: Traps you need: <code>get</code> (to wrap nested objects lazily), <code>set</code> and <code>deleteProperty</code> (to notify). Use <code>Reflect</code> to do the real work.</p>`,
      `<p>Hint 2: Create the nested proxy with the extended path, e.g. <code>wrap(value, path + '.' + key)</code>. Cache proxies in a <code>WeakMap</code> (raw object → proxy) so <code>state.user === state.user</code> stays true.</p>`,
      `<p>Hint 3: In <code>set</code>: read <code>old</code>, call <code>Reflect.set</code>, and only if it succeeded and <code>!Object.is(old, value)</code>, notify. Return the boolean from Reflect (strict mode throws on false).</p>`
    ],
    solution: {
      approach: `<p>Lazy deep proxies: the get trap returns a child proxy for object values, built on demand and carrying its path. set/deleteProperty forward to Reflect and then notify. This is the core of Vue 3's reactivity and MobX observables.</p>`,
      code: { lang: 'js', run: true, code: `
        function observe(target, onChange) {
          const cache = new WeakMap();   // raw object -> its proxy (per path root)

          function wrap(obj, path) {
            if (cache.has(obj)) return cache.get(obj);
            const join = (key) => (path ? path + '.' + String(key) : String(key));
            const proxy = new Proxy(obj, {
              get(t, key, receiver) {
                const v = Reflect.get(t, key, receiver);
                return v !== null && typeof v === 'object' ? wrap(v, join(key)) : v; // wrap lazily
              },
              set(t, key, value, receiver) {
                const old = t[key];
                const ok = Reflect.set(t, key, value, receiver);
                if (ok && !Object.is(old, value)) onChange(join(key), old, value);
                return ok;
              },
              deleteProperty(t, key) {
                const had = Object.prototype.hasOwnProperty.call(t, key);
                const old = t[key];
                const ok = Reflect.deleteProperty(t, key);
                if (ok && had) onChange(join(key), old, undefined);
                return ok;
              }
            });
            cache.set(obj, proxy);
            return proxy;
          }
          return wrap(target, '');
        }

        const log = [];
        const state = observe({ user: { name: 'A', tags: ['x'] } }, (p, o, n) => log.push(p + ': ' + JSON.stringify(o) + ' -> ' + JSON.stringify(n)));
        state.user.name = 'B';
        state.user.tags.push('y');
        state.user.name = 'B';                    // unchanged: no log
        delete state.user.tags;
        console.log(log.join('\\n'));
        console.log(state.user === state.user);   // true (proxy cache)
      ` },
      dry: { head: ['operation', 'trap path', 'notify?'], rows: [
        ["state.user", 'get → wrap(user, "user")', 'no (read)'],
        [".name = 'B'", "set on user proxy: old 'A'", '<span class="c-g">user.name</span>'],
        [".tags.push('y')", 'set index 1, then set length (already 2)', '<span class="c-g">user.tags.1</span> only'],
        [".name = 'B' again", "old 'B', Object.is → same", '<span class="c-m">skip</span>'],
        ['delete .tags', 'deleteProperty', '<span class="c-g">user.tags</span>']
      ] },
      complexity: `<p>O(1) extra work per operation plus one proxy per object actually accessed (lazy). Memory: one WeakMap entry per wrapped object.</p>`,
      followUps: ['The same raw object reachable from two paths gets the path of whichever was accessed first. How would you fix that?', 'Batch notifications per microtask (like Vue does).', 'Why must <code>set</code> return a boolean?']
    }
  });

  practice.push({
    title: 'Set Algebra: Union, Intersection, Difference, Subset',
    level: 'Medium', tags: ['set', 'ES2025'], companies: ['Salesforce', 'Oracle'],
    statement: `<p>Implement <code>union(a, b)</code>, <code>intersection(a, b)</code>, <code>difference(a, b)</code>, <code>symmetricDifference(a, b)</code> and <code>isSubsetOf(a, b)</code> for two <code>Set</code>s, each returning a <b>new</b> Set (or boolean) in O(|a| + |b|) time. Result order should follow the first set, then the second (like the ES2025 built-ins). Then show the equivalent ES2025 <code>Set.prototype</code> methods.</p>`,
    constraints: `|a|, |b| ≤ 10<sup>6</sup>. Inputs must not be modified.`,
    example: `<p>a = ${H.chips(['1', '2', '3'])} b = ${H.chips(['2', '3', '4'])}</p>${H.table(['operation', 'result'], [['union', '{1, 2, 3, 4}'], ['intersection', H.c('g', '{2, 3}')], ['difference a − b', '{1}'], ['symmetricDifference', '{1, 4}'], ['isSubsetOf(a, b)', H.c('r', 'false')]])}`,
    brute: { why: `<p>Convert to arrays and use <code>arr.includes</code> inside <code>filter</code>: each <code>includes</code> is a linear scan, so intersection is O(|a| · |b|), about 10<sup>12</sup> steps at the limits.</p>`,
      code: { lang: 'js', run: true, code: `
        const a = [1, 2, 3], b = [2, 3, 4];
        const interSlow = a.filter((x) => b.includes(x)); // O(|a| * |b|)
        console.log(interSlow); // [ 2, 3 ]
      ` } },
    mcq: { q: 'For intersection, which set should you iterate over?', options: ['The smaller one, checking membership in the larger', 'Always the first one', 'The larger one', 'Both, nested'], answer: 0, explain: 'Iterating the smaller set and calling has() on the larger costs O(min(|a|, |b|)). The ES2025 Set.prototype.intersection does exactly this size check.' },
    hints: [
      `<p>Hint 1: <code>Set.prototype.has</code> is O(1) average, so every operation is "loop one set, ask the other".</p>`,
      `<p>Hint 2: union = copy a, add all of b. difference = keep x in a with <code>!b.has(x)</code>. symmetricDifference = difference both ways.</p>`,
      `<p>Hint 3: isSubsetOf can exit early: if <code>a.size &gt; b.size</code> return false immediately; otherwise every x in a must be in b.</p>`
    ],
    solution: {
      approach: `<p>Each operation is a single pass using O(1) membership tests. Modern runtimes (Node 22+, all evergreen browsers since 2024) ship these as built-in <code>Set</code> methods with the same semantics.</p>`,
      code: { lang: 'js', run: true, code: `
        function union(a, b) { const r = new Set(a); for (const x of b) r.add(x); return r; }

        function intersection(a, b) {
          const r = new Set();
          for (const x of a) if (b.has(x)) r.add(x);   // keep a's order
          return r;
        }

        function difference(a, b) {
          const r = new Set();
          for (const x of a) if (!b.has(x)) r.add(x);
          return r;
        }

        function symmetricDifference(a, b) {
          const r = difference(a, b);
          for (const x of b) if (!a.has(x)) r.add(x);
          return r;
        }

        function isSubsetOf(a, b) {
          if (a.size > b.size) return false;            // early exit
          for (const x of a) if (!b.has(x)) return false;
          return true;
        }

        const a = new Set([1, 2, 3]), b = new Set([2, 3, 4]);
        console.log([...union(a, b)], [...intersection(a, b)], [...difference(a, b)]);
        console.log([...symmetricDifference(a, b)], isSubsetOf(new Set([2, 3]), b));

        if (typeof Set.prototype.union === 'function') {   // ES2025 built-ins
          console.log([...a.union(b)], [...a.intersection(b)], a.isDisjointFrom(new Set([9])));
        }
      ` },
      dry: { head: ['op', 'loop over', 'check', 'result'], rows: [
        ['intersection', 'a: 1, 2, 3', 'b.has → F, T, T', '{2, 3}'],
        ['difference', 'a: 1, 2, 3', '!b.has → T, F, F', '{1}'],
        ['symDiff', 'then b: 2, 3, 4', '!a.has → F, F, T', '{1, 4}'],
        ['isSubsetOf({2,3}, b)', '2, 3', 'both in b', 'true']
      ] },
      complexity: `<p>O(|a| + |b|) time for union/symmetric difference, O(|a|) for intersection/difference (O(min) if you iterate the smaller), O(result) memory.</p>`,
      followUps: ['Make them work for any iterable of the second argument (the built-ins require a "set-like": size, has, keys).', 'Write <code>isDisjointFrom</code>.', 'How would you intersect k sets efficiently?']
    }
  });

  practice.push({
    title: 'Strict Enum with Symbols and a Proxy Guard',
    level: 'Medium', tags: ['symbol', 'proxy', 'object.freeze'], companies: ['Stripe', 'Intuit'],
    statement: `<p>Write <code>makeEnum(names)</code> that returns an enum object where each member is a <b>unique Symbol</b> (so <code>Color.RED</code> can never equal a plain string or another enum's member). Reading an <b>unknown</b> member like <code>Color.REDD</code> must throw a <code>TypeError</code> instead of returning <code>undefined</code>; writing or deleting must throw too. Also provide <code>Color.has(x)</code>, <code>Color.nameOf(sym)</code> and make the enum <b>iterable</b> over its members.</p>`,
    constraints: `Names are unique non-empty strings; up to 1000 members.`,
    example: `<p><code>const Color = makeEnum(['RED', 'GREEN'])</code>; <code>Color.RED === Color.RED</code> → ${H.c('g', 'true')}; <code>Color.RED === 'RED'</code> → false; <code>Color.REDD</code> → ${H.c('r', 'TypeError: Unknown enum member REDD')}; <code>[...Color].map(Color.nameOf)</code> → ['RED', 'GREEN'].</p>`,
    brute: { why: `<p>A frozen object of strings, <code>{ RED: 'RED' }</code>, catches nothing: a typo like <code>Color.REDD</code> silently returns <code>undefined</code>, and any random string <code>'RED'</code> from user input passes equality checks, so you cannot tell an enum value from data.</p>`,
      code: { lang: 'js', run: true, code: `
        const ColorLoose = Object.freeze({ RED: 'RED', GREEN: 'GREEN' });
        console.log(ColorLoose.REDD);                 // undefined, typo goes unnoticed
        console.log(ColorLoose.RED === 'RED');        // true, any string can impersonate it
      ` } },
    mcq: { q: 'Why must the get trap let through <code>Symbol.iterator</code> and other symbol keys?', options: ['Spread, for...of, console.log and type checks read well-known symbol keys; throwing on them would break normal usage', 'Symbols cannot be thrown', 'Proxies ignore symbol keys anyway', 'For performance only'], answer: 0, explain: 'Runtime machinery probes objects with symbol keys (Symbol.iterator, Symbol.toPrimitive, Symbol.toStringTag, util.inspect.custom). Only unknown STRING keys should be treated as typos.' },
    hints: [
      `<p>Hint 1: <code>Symbol(name)</code> gives a unique value with a readable description; keep a <code>Map</code> from symbol → name for <code>nameOf</code>.</p>`,
      `<p>Hint 2: Put members + helpers on a frozen base object, then wrap it in a Proxy whose <code>get</code> throws for unknown string keys and whose <code>set</code>/<code>deleteProperty</code>/<code>defineProperty</code> always throw.</p>`,
      `<p>Hint 3: Let symbol keys and <code>then</code> pass (so the enum is not mistaken for a thenable by <code>await</code>). Implement <code>[Symbol.iterator]</code> as a generator over the member symbols.</p>`
    ],
    solution: {
      approach: `<p>Symbols give identity (no impersonation), a Map gives reverse lookup, freezing gives immutability, and a Proxy turns silent <code>undefined</code> typos into loud errors. Well-known symbols stay readable so the enum still plays nicely with the language.</p>`,
      code: { lang: 'js', run: true, code: `
        function makeEnum(names) {
          const byName = {};
          const nameOfSym = new Map();
          for (const n of names) {
            const s = Symbol(n);           // unique, has a readable description
            byName[n] = s;
            nameOfSym.set(s, n);
          }
          const base = Object.freeze({
            ...byName,
            has: (x) => nameOfSym.has(x),
            nameOf: (x) => nameOfSym.get(x),
            *[Symbol.iterator]() { yield* nameOfSym.keys(); }
          });
          const fail = (msg) => { throw new TypeError(msg); };
          return new Proxy(base, {
            get(t, key, r) {
              if (typeof key === 'symbol' || key === 'then' || key in t) return Reflect.get(t, key, r);
              return fail('Unknown enum member ' + key);
            },
            set: (t, key) => fail('Enum is read-only (tried to set ' + String(key) + ')'),
            deleteProperty: (t, key) => fail('Enum is read-only (tried to delete ' + String(key) + ')'),
            defineProperty: () => fail('Enum is read-only')
          });
        }

        const Color = makeEnum(['RED', 'GREEN', 'BLUE']);
        console.log(Color.RED === Color.RED, Color.RED === 'RED');   // true false
        console.log(Color.RED.toString(), Color.nameOf(Color.GREEN)); // Symbol(RED) GREEN
        console.log([...Color].map(Color.nameOf));                    // [ 'RED', 'GREEN', 'BLUE' ]
        console.log(Color.has(Symbol('RED')));                         // false, a different symbol
        try { Color.REDD; } catch (e) { console.log(e.message); }       // Unknown enum member REDD
        try { Color.RED = 1; } catch (e) { console.log(e.message); }
      ` },
      dry: { head: ['access', 'key type', 'in base?', 'result'], rows: [
        ['Color.RED', 'string', 'yes', 'Symbol(RED)'],
        ['[...Color]', 'symbol (Symbol.iterator)', 'yes', 'iterates members'],
        ['Color.REDD', 'string', '<span class="c-r">no</span>', '<span class="c-r">TypeError</span>'],
        ['Color.RED = 1', 'set trap', '-', '<span class="c-r">TypeError</span>']
      ] },
      complexity: `<p>O(n) to build, O(1) per access. The proxy adds a small constant cost per property read.</p>`,
      followUps: ['Make members serializable (JSON) by adding <code>toJSON</code> to a member class instead of using bare symbols.', 'Compare with TypeScript <code>enum</code>, <code>const enum</code> and string-literal unions.', 'How would you exhaustively switch over the members?']
    }
  });

  practice.push({
    title: 'Round-Robin Interleave of Many Iterables',
    level: 'Medium', tags: ['iterator', 'generator', 'queue'], companies: ['LinkedIn', 'Spotify'],
    statement: `<p>Write a generator <code>interleave(...iterables)</code> that yields the first value of each iterable, then the second of each, and so on, <b>skipping</b> iterables that run out, until all are exhausted. It must work for infinite iterables (lazily), for strings, Sets, Maps and generators, and it must call <code>return()</code> on all still-open iterators if the consumer stops early.</p>`,
    constraints: `Up to 10<sup>4</sup> iterables. O(1) amortised work per yielded value.`,
    example: `<p><code>[...interleave([1, 2, 3], 'ab', new Set([true]))]</code> → <b>[1, 'a', true, 2, 'b', 3]</b>.</p>${H.table(['round', 'queue (front → back)', 'yield'], [['1', 'A B C', "1, 'a', true"], ['2', 'A B (C done)', "2, 'b'"], ['3', 'A (B done)', '3'], ['4', H.c('m', 'empty'), H.c('g', 'stop')]])}`,
    brute: { why: `<p>Convert every iterable to an array first, then loop index by index. This breaks completely on infinite generators (never finishes converting), and costs O(total) memory before the first value is produced.</p>`,
      code: { lang: 'js', run: true, code: `
        function interleaveEager(...its) {
          const arrays = its.map((it) => [...it]);    // materialises everything
          const out = [];
          const max = Math.max(0, ...arrays.map((a) => a.length));
          for (let i = 0; i < max; i++) for (const a of arrays) if (i < a.length) out.push(a[i]);
          return out;
        }
        console.log(interleaveEager([1, 2, 3], 'ab', new Set([true])));
      ` } },
    mcq: { q: 'Why use a queue of iterators instead of looping over the array of iterators each round?', options: ['Finished iterators are dropped once instead of being re-checked every round', 'Queues are required by the iterator protocol', 'Arrays cannot hold iterators', 'It changes the output order'], answer: 0, explain: 'With a queue, each next() either re-enqueues the iterator or drops it forever, so work is O(1) per value even when many iterables end early.' },
    hints: [
      `<p>Hint 1: Get an iterator from each iterable up front with <code>it[Symbol.iterator]()</code>. Strings, Sets and Maps all have one.</p>`,
      `<p>Hint 2: Round-robin = queue. Shift an iterator, call <code>next()</code>; if not done, yield the value and push it back; if done, drop it.</p>`,
      `<p>Hint 3: Wrap the loop in <code>try { … } finally { for each remaining iterator call it.return?.() }</code> so early exit cleans up. Use a head index instead of <code>shift()</code> for O(1).</p>`
    ],
    solution: {
      approach: `<p>A FIFO of live iterators. Each step advances one iterator; exhausted ones fall out. The generator's <code>finally</code> block runs when the consumer breaks early (for...of calls our <code>return()</code>), and we forward that cleanup to every still-open source.</p>`,
      code: { lang: 'js', run: true, code: `
        function* interleave(...iterables) {
          let queue = iterables.map((it) => it[Symbol.iterator]());
          let head = 0;                                   // index-based queue: O(1) dequeue
          try {
            while (head < queue.length) {
              const it = queue[head++];
              const { value, done } = it.next();
              if (done) continue;                         // drop finished iterator
              queue.push(it);                             // back of the line
              if (head > 1024 && head * 2 > queue.length) { queue = queue.slice(head); head = 0; } // compact
              yield value;
            }
          } finally {
            for (let i = head; i < queue.length; i++) queue[i].return?.(); // early-exit cleanup
          }
        }

        console.log([...interleave([1, 2, 3], 'ab', new Set([true]))]); // [1, 'a', true, 2, 'b', 3]

        let closed = 0;
        function* naturals(tag) { try { for (let n = 0; ; n++) yield tag + n; } finally { closed++; } }
        const first5 = [];
        for (const v of interleave(naturals('x'), naturals('y'))) { first5.push(v); if (first5.length === 5) break; }
        console.log(first5, 'sources closed:', closed); // [ 'x0', 'y0', 'x1', 'y1', 'x2' ] sources closed: 2
      ` },
      dry: { head: ['dequeue', 'next()', 'action', 'yield'], rows: [
        ['A', '1', 're-enqueue A', '1'], ['B', "'a'", 're-enqueue B', "'a'"], ['C', 'true', 're-enqueue C', 'true'],
        ['A', '2', 're-enqueue', '2'], ['B', "'b'", 're-enqueue', "'b'"], ['C', 'done', '<span class="c-r">drop C</span>', '-'],
        ['A', '3', 're-enqueue', '3'], ['B', 'done', '<span class="c-r">drop B</span>', '-'], ['A', 'done', 'drop A → queue empty', 'stop']
      ] },
      complexity: `<p>O(total values + number of iterables) time, O(number of iterables) memory. Infinite sources are fine.</p>`,
      followUps: ['Write <code>zip(...iterables)</code> that stops at the shortest.', 'Make an async version that yields whichever source produces first (a merge).', 'Weighted round-robin (k values from A per value from B).']
    }
  });

  /* =====================================================================
     PRACTICE: Hard
     ===================================================================== */
  practice.push({
    title: 'Deep Clone with Cycles, Map, Set, Date and Symbols',
    level: 'Hard', tags: ['weakmap', 'map', 'set', 'symbol', 'recursion'], companies: ['Google', 'Meta', 'Atlassian'],
    statement: `<p>Write <code>deepClone(value)</code> that copies any mix of plain objects, arrays, <code>Map</code>, <code>Set</code>, <code>Date</code> and <code>RegExp</code>, including <b>symbol-keyed</b> properties, while preserving <b>shared references and cycles</b>: if the same object appears twice in the input, the clone must contain one copy appearing twice; <code>a.self = a</code> must clone to <code>b.self === b</code>. Map keys that are objects must be cloned too. Prototypes of class instances should be kept.</p>`,
    constraints: `Depth up to 10<sup>3</sup>; up to 10<sup>5</sup> nodes. Functions are copied by reference.`,
    example: `<p>Input: <code>const a = { d: new Date(0), m: new Map([[k, 1]]), [Symbol('id')]: 7 }; a.self = a;</code></p>${H.table(['check on clone b', 'expected'], [['b !== a', H.c('g', 'true')], ['b.self === b', H.c('g', 'true (cycle kept)')], ['b.d instanceof Date && b.d !== a.d', H.c('g', 'true')], ['symbol key copied', H.c('g', '7')]])}`,
    brute: { why: `<p><code>JSON.parse(JSON.stringify(x))</code> throws on cycles, turns Dates into strings and Maps/Sets into <code>{}</code>, drops <code>undefined</code>, functions and symbol keys, and loses prototypes. A plain recursive copy without memory overflows the stack on <code>a.self = a</code> and duplicates shared objects.</p>`,
      code: { lang: 'js', run: true, code: `
        const a = { d: new Date(0), m: new Map([['k', 1]]), u: undefined };
        const b = JSON.parse(JSON.stringify(a));
        console.log(typeof b.d, b.m, 'u' in b);   // string {} false
        a.self = a;
        try { JSON.stringify(a); } catch (e) { console.log(e.name); } // TypeError (cycle)
      ` } },
    mcq: { q: 'Why must the "seen" table be filled BEFORE recursing into an object\'s children?', options: ['So that a child pointing back to the parent finds the half-built clone instead of recursing forever', 'To make the WeakMap smaller', 'Because WeakMap.set is asynchronous', 'Order does not matter'], answer: 0, explain: 'With a.self = a, cloning a recurses into a.self, which is a again. If a → clone(a) is registered first, the lookup returns the (still being filled) clone and the cycle closes correctly.' },
    hints: [
      `<p>Hint 1: Keep a <code>WeakMap</code> original → clone. Before cloning any object, check it; after creating the empty shell, register it, then fill it.</p>`,
      `<p>Hint 2: Dispatch by type: Date → <code>new Date(+d)</code>; RegExp → <code>new RegExp(r.source, r.flags)</code> plus <code>lastIndex</code>; Map → clone keys and values; Set → clone values; Array → <code>new Array(len)</code>; other objects → <code>Object.create(Object.getPrototypeOf(o))</code>.</p>`,
      `<p>Hint 3: Copy keys with <code>Reflect.ownKeys</code> (includes symbols and non-enumerables), or <code>Object.getOwnPropertyDescriptors</code> to keep getters. For huge depths, swap recursion for an explicit stack.</p>`
    ],
    solution: {
      approach: `<p>Graph copy with a memo table. Each original object maps to exactly one clone, which handles both sharing and cycles. A WeakMap is the right memo: keys are objects, and it does not keep the originals alive after the function returns. This is what <code>structuredClone</code> does internally (though structuredClone drops prototypes, symbols and functions).</p>`,
      code: { lang: 'js', run: true, code: `
        function deepClone(value, seen = new WeakMap()) {
          if (value === null || typeof value !== 'object') return value; // primitives & functions
          if (seen.has(value)) return seen.get(value);                     // shared ref or cycle

          let copy;
          if (value instanceof Date) return remember(new Date(value.getTime()));
          if (value instanceof RegExp) {
            copy = remember(new RegExp(value.source, value.flags));
            copy.lastIndex = value.lastIndex;
            return copy;
          }
          if (value instanceof Map) {
            copy = remember(new Map());
            for (const [k, v] of value) copy.set(deepClone(k, seen), deepClone(v, seen));
            return copy;
          }
          if (value instanceof Set) {
            copy = remember(new Set());
            for (const v of value) copy.add(deepClone(v, seen));
            return copy;
          }
          copy = remember(Array.isArray(value) ? new Array(value.length) : Object.create(Object.getPrototypeOf(value)));
          for (const key of Reflect.ownKeys(value)) {          // strings + symbols
            if (Array.isArray(value) && key === 'length') continue;
            const desc = Object.getOwnPropertyDescriptor(value, key);
            if ('value' in desc) desc.value = deepClone(desc.value, seen);
            Object.defineProperty(copy, key, desc);             // keeps getters/enumerability
          }
          return copy;

          function remember(c) { seen.set(value, c); return c; } // register BEFORE children
        }

        class Point { constructor(x) { this.x = x; } norm() { return Math.abs(this.x); } }
        const key = { k: 1 };
        const id = Symbol('id');
        const shared = [1, 2];
        const a = { d: new Date(0), m: new Map([[key, shared]]), s: new Set([shared]), p: new Point(-3), [id]: 7, r: /ab+/gi };
        a.self = a;

        const b = deepClone(a);
        console.log(b !== a, b.self === b);                           // true true
        console.log(b.d instanceof Date, b.d !== a.d, b[id]);         // true true 7
        const [[k2, v2]] = b.m;
        console.log(k2 !== key, v2 === [...b.s][0], v2 !== shared);   // true true true (sharing kept)
        console.log(b.p.norm(), b.r.flags);                           // 3 'gi'
      ` },
      dry: { head: ['visit', 'in seen?', 'action', 'seen size'], rows: [
        ['a', 'no', 'create {} shell, register', '1'],
        ['a.d (Date)', 'no', 'new Date(0)', '2'],
        ['a.m → key, shared', 'no', 'clone key, clone shared', '5'],
        ['a.s → shared', '<span class="c-g">yes</span>', 'reuse clone of shared', '5'],
        ['a.self = a', '<span class="c-g">yes</span>', 'b.self = b (cycle closed)', '7']
      ] },
      complexity: `<p>O(V + E) time where V is the number of objects and E the number of references; O(V) memory for the WeakMap plus O(depth) recursion stack.</p>`,
      followUps: ['Convert the recursion to an explicit stack to survive depth 10<sup>6</sup>.', 'Compare with <code>structuredClone</code>: what does it support that yours does not (ArrayBuffer transfer, Blob), and what does it drop?', 'Clone typed arrays and ArrayBuffers sharing one buffer.']
    }
  });

  practice.push({
    title: 'co(): Run Async Flows Written as Generators',
    level: 'Hard', tags: ['generator', 'promise', 'async'], companies: ['Netflix', 'Microsoft', 'Uber'],
    statement: `<p>Before <code>async/await</code>, libraries like <b>co</b> and <b>redux-saga</b> let you write async code as a generator that <code>yield</code>s promises. Implement <code>co(genFn, ...args)</code> returning a Promise. It must: resume the generator with each promise's <b>resolved value</b>; on rejection, <b>throw the error into the generator</b> (so <code>try/catch</code> inside works); accept non-promise yields (resume with the value as-is); resolve with the generator's <code>return</code> value; reject if the generator throws an uncaught error.</p>`,
    constraints: `Up to 10<sup>5</sup> yields; must not grow the call stack per yield.`,
    example: `<p>${H.table(['generator line', 'what co does'], [['const u = yield fetchUser(1)', 'waits, then next(user)'], ['try { yield fail() } catch (e)', H.c('r', 'throw(err) into the generator') + ' → caught inside'], ['const n = yield 5', 'next(5) straight away'], ["return u.name + '!'", H.c('g', 'resolve the outer promise')]])}</p>`,
    brute: { why: `<p>Nesting <code>.then</code> callbacks (or classic callbacks) by hand: every step adds a level of indentation, errors must be forwarded manually at each level, and a single <code>try/catch</code> cannot cover the whole flow. The control flow (loops, early return) becomes very hard to express.</p>`,
      code: { lang: 'js', run: true, code: `
        const delay = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));
        delay(5, { name: 'Asha' })
          .then((user) => delay(5, user.name.length)
            .then((len) => delay(5, len * 2)
              .then((x) => console.log('nested result', x))))   // pyramid of doom
          .catch((e) => console.log('one catch, but no local recovery', e));
      ` } },
    mcq: { q: 'How does co make <code>try { yield failingPromise } catch (e) {}</code> work inside the generator?', options: ['On rejection it calls it.throw(err), which raises the error at the paused yield', 'It wraps the generator in try/catch', 'It ignores rejected promises', 'Generators catch promise rejections automatically'], answer: 0, explain: 'Generator.prototype.throw resumes the generator by throwing at the current yield expression, so a surrounding try/catch inside the generator body handles it like synchronous code.' },
    hints: [
      `<p>Hint 1: The driver is a function <code>step(method, arg)</code> that calls <code>it[method](arg)</code> where method is <code>'next'</code> or <code>'throw'</code>.</p>`,
      `<p>Hint 2: If the result is done, resolve with its value. Otherwise <code>Promise.resolve(result.value).then(v =&gt; step('next', v), e =&gt; step('throw', e))</code>.</p>`,
      `<p>Hint 3: Wrap <code>it[method](arg)</code> in try/catch and reject on an uncaught throw. Because each step is scheduled from a promise callback, the stack never grows, even for 10<sup>5</sup> yields.</p>`
    ],
    solution: {
      approach: `<p>A trampoline driven by promise callbacks: yield = "await this", next(v) = "the await returned v", throw(e) = "the await threw e". This is literally how Babel/TypeScript downlevel <code>async/await</code> to generators (<code>__awaiter</code>), and how redux-saga interprets effects.</p>`,
      code: { lang: 'js', run: true, code: `
        function co(genFn, ...args) {
          return new Promise((resolve, reject) => {
            const it = genFn(...args);
            function step(method, arg) {
              let res;
              try {
                res = it[method](arg);            // resume: next(value) or throw(error)
              } catch (err) {
                return reject(err);               // uncaught inside the generator
              }
              if (res.done) return resolve(res.value);
              Promise.resolve(res.value).then(
                (v) => step('next', v),
                (e) => step('throw', e)
              );
            }
            step('next', undefined);
          });
        }

        const delay = (ms, v) => new Promise((r) => setTimeout(() => r(v), ms));
        const fail = (msg) => new Promise((_, rej) => setTimeout(() => rej(new Error(msg)), 5));

        co(function* (id) {
          const user = yield delay(5, { id, name: 'Asha' });
          let note;
          try {
            yield fail('network down');
          } catch (e) {
            note = 'recovered from ' + e.message;     // error thrown INTO the generator
          }
          const n = yield 41;                          // plain value
          return user.name + ' / ' + note + ' / ' + (n + 1);
        }, 7).then((r) => console.log('result:', r));

        co(function* () { yield delay(1); throw new Error('boom'); })
          .catch((e) => console.log('rejected with', e.message));

        co(function* () { let s = 0; for (let i = 0; i < 100000; i++) s += yield i; return s; })
          .then((s) => console.log('100k yields, sum =', s));   // no stack overflow
      ` },
      dry: { head: ['step', 'call', 'generator yields / returns', 'co then'], rows: [
        ['1', 'next(undefined)', 'delay(5, user)', 'wait 5 ms'],
        ['2', 'next(user)', 'fail(...)', 'rejects after 5 ms'],
        ['3', '<span class="c-r">throw(err)</span>', 'caught → yield 41', 'Promise.resolve(41)'],
        ['4', 'next(41)', "return 'Asha / recovered… / 42'", '<span class="c-g">resolve</span>']
      ] },
      complexity: `<p>O(1) work per yield plus one microtask hop; constant stack depth. Total O(number of yields).</p>`,
      followUps: ['Support yielding arrays of promises (run in parallel like Promise.all).', 'Add cancellation: calling <code>cancel()</code> invokes <code>it.return()</code> so <code>finally</code> blocks run.', 'Why did async/await replace this pattern, and where do generators still win (sagas, testable effects)?']
    }
  });

  practice.push({
    title: 'Mini Immer: produce() with Copy-on-Write Proxies',
    level: 'Hard', tags: ['proxy', 'reflect', 'weakmap', 'immutability'], companies: ['Meta', 'Microsoft', 'Flipkart'],
    statement: `<p>Implement <code>produce(base, recipe)</code>: <code>recipe(draft)</code> may <b>mutate</b> the draft freely (assign, delete, push onto arrays, nested edits). <code>produce</code> returns a new state where only the objects on a changed path are copied, everything untouched is <b>shared by reference</b> with <code>base</code>, the base is never modified, and if nothing changed the result <b>is</b> <code>base</code>. Changed objects in the result must be frozen.</p>`,
    constraints: `Plain objects and arrays only. State size up to 10<sup>5</sup> nodes; cost must be proportional to the touched part, not the whole tree.`,
    example: `<p><code>next = produce(state, d =&gt; { d.todos[1].done = true; })</code></p>${H.table(['path', 'next vs state'], [['root', H.c('y', 'new object')], ['todos', H.c('y', 'new array')], ['todos[1]', H.c('y', 'new object')], ['todos[0]', H.c('g', 'same reference (shared)')], ['user', H.c('g', 'same reference (shared)')]])}`,
    brute: { why: `<p>Deep-clone the whole state, let the recipe mutate the clone, return it. It is O(size of state) for a one-field change, and every object gets a new identity, so React/Redux <code>===</code> checks think everything changed and re-render the entire app. Hand-written spreads avoid that but get very verbose for deep paths.</p>`,
      code: { lang: 'js', run: true, code: `
        function produceSlow(base, recipe) {
          const draft = structuredClone(base);       // copies EVERYTHING
          recipe(draft);
          return draft;
        }
        const state = { user: { name: 'A' }, todos: [{ t: 'x', done: false }, { t: 'y', done: false }] };
        const next = produceSlow(state, (d) => { d.todos[1].done = true; });
        console.log(next.user === state.user); // false: untouched branch lost its identity
      ` } },
    mcq: { q: 'Why does the draft proxy copy an object only on the FIRST write (copy-on-write)?', options: ['So reads cost nothing and untouched subtrees keep their original identity', 'Because Proxy cannot intercept reads', 'Because objects are immutable in JS', 'To avoid using WeakMap'], answer: 0, explain: 'Until something is written, the draft can read straight from the base. Only nodes on a written path need a shallow copy, which is what keeps structural sharing and makes produce fast.' },
    hints: [
      `<p>Hint 1: Each draft has a state record <code>{ base, copy, parent, modified }</code>. Reads go to <code>copy || base</code>. The first write makes <code>copy</code> a shallow copy and marks the node and <b>all its ancestors</b> as modified.</p>`,
      `<p>Hint 2: In <code>get</code>, if the value is a plain object/array that still equals the base value, replace it in the copy with a child draft (lazy). Keep proxy → state in a WeakMap so you can recognise drafts.</p>`,
      `<p>Hint 3: Finalize recursively: unmodified draft → its <code>base</code>; modified → walk its copy, replace child drafts by their finalized values, freeze. Use a fresh empty object/array as the Proxy <b>target</b> so frozen bases do not trip Proxy invariants.</p>`
    ],
    solution: {
      approach: `<p>Lazy draft tree + copy-on-write + structural sharing. Reads are pass-through, writes copy one node and bubble a "modified" flag to the root, and finalization swaps drafts back to plain frozen objects. This is the design of the real Immer library (used by Redux Toolkit).</p>`,
      code: { lang: 'js', run: true, code: `
        function produce(base, recipe) {
          const states = new WeakMap();                       // draft proxy -> state
          const isDraftable = (v) => v !== null && typeof v === 'object' &&
            (Array.isArray(v) || Object.getPrototypeOf(v) === Object.prototype);
          const source = (s) => s.copy || s.base;
          const prepareCopy = (s) => { if (!s.copy) s.copy = Array.isArray(s.base) ? s.base.slice() : { ...s.base }; };
          function markChanged(s) {
            for (let n = s; n && !n.modified; n = n.parent) { n.modified = true; prepareCopy(n); }
          }

          function createDraft(obj, parent) {
            const s = { base: obj, copy: null, parent, modified: false };
            const proxy = new Proxy(Array.isArray(obj) ? [] : {}, {   // fresh target: no invariant clashes
              get(t, key) {
                const src = source(s);
                const v = src[key];
                if (!Object.prototype.hasOwnProperty.call(src, key) || !isDraftable(v) || states.has(v)) return v;
                if (v !== s.base[key]) return v;                       // a new value set by the recipe
                prepareCopy(s);                                        // copy holds child drafts
                return (s.copy[key] = createDraft(v, s));
              },
              set(t, key, value) {
                const cur = source(s)[key];
                if (Object.is(cur, value) && Object.prototype.hasOwnProperty.call(source(s), key)) return true;
                markChanged(s);
                s.copy[key] = value;
                return true;
              },
              deleteProperty(t, key) {
                if (!Object.prototype.hasOwnProperty.call(source(s), key)) return true;
                markChanged(s);
                delete s.copy[key];
                return true;
              },
              has: (t, key) => key in source(s),
              ownKeys: () => Reflect.ownKeys(source(s)),
              getOwnPropertyDescriptor(t, key) {
                const d = Reflect.getOwnPropertyDescriptor(source(s), key);
                if (d && !(Array.isArray(t) && key === 'length')) d.configurable = true;
                return d;
              }
            });
            states.set(proxy, s);
            return proxy;
          }

          function finalize(value) {
            const s = states.get(value);
            if (!s) return value;                        // plain value
            if (!s.modified) return s.base;              // untouched: share the original
            for (const key of Reflect.ownKeys(s.copy)) {
              if (key !== 'length') s.copy[key] = finalize(s.copy[key]);
            }
            return Object.freeze(s.copy);
          }

          const root = createDraft(base, null);
          recipe(root);
          return finalize(root);
        }

        const state = Object.freeze({ user: { name: 'A' }, todos: [{ t: 'x', done: false }, { t: 'y', done: false }] });
        const next = produce(state, (d) => { d.todos[1].done = true; d.todos.push({ t: 'z', done: false }); });

        console.log(next !== state, next.user === state.user, next.todos[0] === state.todos[0]); // true true true
        console.log(next.todos[1].done, state.todos[1].done, next.todos.length);                // true false 3
        console.log(Object.isFrozen(next.todos), produce(state, (d) => { d.user.name = 'A'; }) === state); // true true
      ` },
      dry: { head: ['operation', 'draft node', 'copy made?', 'modified chain'], rows: [
        ['d.todos', 'root.get → child draft for todos', 'root copy (holds drafts)', 'none'],
        ['[1]', 'todos.get → child draft for todos[1]', 'todos copy', 'none'],
        ['.done = true', 'todos[1].set', 'todos[1] copy', '<span class="c-y">todos[1] → todos → root</span>'],
        ['.push(z)', 'todos.set 2, set length', 'already copied', 'already modified'],
        ['finalize', 'root → todos → [0] unmodified', '-', '<span class="c-g">todos[0], user shared</span>']
      ] },
      complexity: `<p>O(k) where k is the number of nodes touched by the recipe (each read creates at most one draft; each write copies one node shallowly and walks up once). Untouched subtrees cost nothing.</p>`,
      followUps: ['Support Map and Set drafts.', 'Generate JSON-patch style "patches" and "inverse patches" for undo/redo.', 'Handle a recipe that assigns a draft into a new plain object (drafts nested inside non-draft values).']
    }
  });

  practice.push({
    title: 'ES Module Evaluation Order with Cycle Detection',
    level: 'Hard', tags: ['modules', 'graph', 'dfs', 'ESM'], companies: ['Vercel', 'Google', 'Shopify'],
    statement: `<p>A bundler must reproduce the exact order in which ES modules <b>evaluate</b>. You get the entry name and a map <code>module → [imports in source order]</code>. ESM rules: a module evaluates only after all its imports have evaluated, imports are visited in source order, each module evaluates <b>once</b>, and when an import points back to a module that is still being visited (a cycle), that edge is skipped (the importer may then hit a TDZ error if it uses the binding during evaluation). Return the evaluation order and the list of cycles found.</p>`,
    constraints: `Up to 10<sup>5</sup> modules and 10<sup>6</sup> import edges. Must not overflow the call stack.`,
    example: `<p>Graph: <code>main → [a, b]</code>, <code>a → [c]</code>, <code>b → [c, a]</code>, <code>c → [a]</code>.</p>${H.table(['visit', 'state', 'note'], [['main', 'visiting', ''], ['a', 'visiting', ''], ['c', 'visiting', 'c imports a: ' + H.c('r', 'a is visiting → cycle a → c → a')], ['c', H.c('g', 'evaluated #1'), ''], ['a', H.c('g', 'evaluated #2'), ''], ['b', 'visiting', 'c, a already done'], ['b', H.c('g', '#3'), ''], ['main', H.c('g', '#4'), '']])}<p>Order: <b>c, a, b, main</b>.</p>`,
    brute: { why: `<p>Plain recursion "evaluate my imports, then me" without tracking state evaluates shared modules many times and recurses forever on a cycle. Even with a simple "done" set, recursive DFS overflows the stack on a 10<sup>5</sup>-long import chain.</p>`,
      code: { lang: 'js', run: true, code: `
        const graph = { main: ['a', 'b'], a: ['c'], b: ['c', 'a'], c: [] };   // no cycle here
        const order = [];
        function evalNaive(m) { for (const d of graph[m]) evalNaive(d); order.push(m); }
        evalNaive('main');
        console.log(order); // [ 'c', 'a', 'c', 'c', 'a', 'b', 'main' ]  c evaluated 3 times
      ` } },
    mcq: { q: 'In ESM, when <code>c.js</code> imports <code>a.js</code> while <code>a.js</code> is still being linked/evaluated, what does c see?', options: ['A live binding that is still uninitialised (TDZ): using it at top level throws ReferenceError', 'A copy of a\'s exports at that moment', 'An empty object {}, like CommonJS', 'The import is retried later automatically'], answer: 0, explain: 'ESM bindings are live references created at link time. a has not run yet, so its let/const/class exports are in the TDZ; touching them during c\'s evaluation throws. Functions declarations are hoisted and do work.' },
    hints: [
      `<p>Hint 1: Three colours per module: unvisited, <b>visiting</b> (on the current DFS path), <b>done</b>. Post-order (after all children) is the evaluation order.</p>`,
      `<p>Hint 2: An edge to a <i>visiting</i> module is a back-edge = cycle. Record the cycle by slicing the current path from that module, then skip the edge. An edge to a <i>done</i> module is simply skipped.</p>`,
      `<p>Hint 3: Use an explicit stack of frames <code>{ name, nextChild }</code> to avoid recursion limits. When a frame has no more children, pop it, mark done, append to the order.</p>`
    ],
    solution: {
      approach: `<p>Iterative DFS with colouring. The spec's <code>InnerModuleEvaluation</code> is a Tarjan-style DFS that evaluates modules in exactly this post-order (a strongly connected component evaluates together once its root finishes, which gives the same order). Back-edges are the cycles that can cause TDZ errors or, in CommonJS, half-initialised exports.</p>`,
      code: { lang: 'js', run: true, code: `
        function evaluationOrder(entry, graph) {
          const state = new Map();          // name -> 'visiting' | 'done'
          const order = [];
          const cycles = [];
          const path = [];                  // current DFS path (names)
          const stack = [{ name: entry, i: 0 }];
          state.set(entry, 'visiting');
          path.push(entry);

          while (stack.length) {
            const frame = stack[stack.length - 1];
            const deps = graph[frame.name] || [];
            if (frame.i < deps.length) {
              const dep = deps[frame.i++];
              const st = state.get(dep);
              if (st === 'done') continue;                  // already evaluated
              if (st === 'visiting') {                       // back-edge: cycle
                cycles.push(path.slice(path.indexOf(dep)).concat(dep).join(' -> '));
                continue;
              }
              state.set(dep, 'visiting');
              path.push(dep);
              stack.push({ name: dep, i: 0 });
            } else {
              stack.pop();                                   // all imports handled
              path.pop();
              state.set(frame.name, 'done');
              order.push(frame.name);                        // post-order = evaluation order
            }
          }
          return { order, cycles };
        }

        const graph = { main: ['a', 'b'], a: ['c'], b: ['c', 'a'], c: ['a'] };
        console.log(evaluationOrder('main', graph));
        // { order: [ 'c', 'a', 'b', 'main' ], cycles: [ 'a -> c -> a' ] }

        const chain = {};                                     // 100k-long chain: no stack overflow
        for (let i = 0; i < 100000; i++) chain['m' + i] = i + 1 < 100000 ? ['m' + (i + 1)] : [];
        const r = evaluationOrder('m0', chain);
        console.log(r.order.length, r.order[0], r.order[r.order.length - 1]); // 100000 m99999 m0
      ` },
      dry: { head: ['top frame', 'next import', 'state of import', 'action', 'order'], rows: [
        ['main', 'a', 'unvisited', 'push a', '[]'],
        ['a', 'c', 'unvisited', 'push c', '[]'],
        ['c', 'a', '<span class="c-r">visiting</span>', 'record cycle a → c → a', '[]'],
        ['c', '(none)', '-', 'pop, done', '[c]'],
        ['a', '(none)', '-', 'pop, done', '[c, a]'],
        ['main', 'b', 'unvisited', 'push b; c, a done → pop b', '[c, a, b]'],
        ['main', '(none)', '-', 'pop', '[c, a, b, main]']
      ] },
      complexity: `<p>O(V + E) time, O(V) memory; the explicit stack keeps native stack depth constant.</p>`,
      followUps: ['Return the strongly connected components (Tarjan) so a bundler can wrap each cycle in one scope.', 'Add top-level <code>await</code>: which modules can evaluate in parallel?', 'Given the order, flag which cyclic imports are used at top level (real TDZ risk) vs only inside functions (safe).']
    }
  });

  /* =====================================================================
     QUIZ
     ===================================================================== */
  quiz.push({
    q: `<code>counter.mjs</code> exports <code>let count = 0</code> and <code>function inc() { count++ }</code>. <code>main.mjs</code> does <code>import { count, inc } from './counter.mjs'; inc(); console.log(count);</code>. What prints?`,
    options: ['1, because ESM imports are live bindings', '0, because imports are copied at import time', 'ReferenceError', 'undefined'],
    answer: 0,
    explain: 'An ESM import is a read-only view of the exporting module\'s variable, not a copy. After inc() the binding reads 1. The CommonJS equivalent (const { count } = require(...)) would copy the number and print 0.'
  });
  quiz.push({
    q: `Which statement about CommonJS vs ES modules in Node.js (2026) is TRUE?`,
    options: ['require() can load a synchronous ES module graph (no top-level await) in current Node versions', 'ESM files can use __dirname directly', 'import declarations can appear inside if blocks', 'module.exports and export default are the same object'],
    answer: 0,
    explain: 'require(esm) shipped unflagged in Node 22.12/20.19 for ESM graphs without top-level await. ESM has no __dirname (use import.meta.dirname or import.meta.url), static imports must be top level (use import() for conditional loading), and export default is a separate binding.'
  });
  quiz.push({
    q: `What does <code>const it = [10, 20][Symbol.iterator](); it.next(); it.next(); console.log(it.next());</code> print?`,
    options: ['{ value: undefined, done: true }', '{ value: 20, done: true }', '{ value: 20, done: false }', 'It throws StopIteration'],
    answer: 0,
    explain: 'The first two next() calls return 10 and 20 with done: false. The third finds no more items and returns { value: undefined, done: true }. JavaScript never throws to signal the end; it uses the done flag.'
  });
  quiz.push({
    q: `<code>function* g() { const x = yield 1; console.log(x); }</code> and <code>const it = g(); it.next('a'); it.next('b');</code>. What is logged?`,
    options: ["'b'", "'a'", 'undefined', "'a' then 'b'"],
    answer: 0,
    explain: 'The first next() starts the body and runs up to yield 1; its argument has no paused yield to receive it, so "a" is lost. The second next("b") resumes the paused yield, which evaluates to "b", so x = "b".'
  });
  quiz.push({
    q: `Spreading a generator: <code>function* g() { yield 1; yield 2; return 3; }</code> — what is <code>[...g()]</code>?`,
    options: ['[1, 2]', '[1, 2, 3]', '[3]', '[]'],
    answer: 0,
    explain: 'Spread and for...of stop as soon as they see done: true, and they ignore the value that comes with it. The return value 3 is only visible if you call next() manually or use yield* (which evaluates to it).'
  });
  quiz.push({
    q: `What is <code>new Map([[NaN, 'a']]).get(NaN)</code> and <code>new Map([[{}, 'b']]).get({})</code>?`,
    options: ["'a' and undefined", "undefined and 'b'", "'a' and 'b'", 'undefined and undefined'],
    answer: 0,
    explain: 'Map uses SameValueZero: NaN matches NaN. Objects are compared by identity, and the two {} literals are different objects, so the second get misses.'
  });
  quiz.push({
    q: `Which is a valid reason to use a <code>WeakMap</code> instead of a <code>Map</code>?`,
    options: ['You attach metadata to DOM nodes or objects you do not own and must not keep them alive', 'You need to know how many entries it has', 'You need string keys', 'You need to iterate over all entries'],
    answer: 0,
    explain: 'WeakMap keys are held weakly, so entries vanish once the key object is otherwise unreachable. In exchange it has no size, no iteration and no clear(), and keys must be objects (or non-registered symbols).'
  });
  quiz.push({
    q: `What does <code>JSON.stringify({ [Symbol('id')]: 1, a: 2 })</code> return, and what does <code>Object.keys</code> return for that object?`,
    options: ['\'{"a":2}\' and [\'a\']', '\'{"id":1,"a":2}\' and [\'id\', \'a\']', 'It throws TypeError', '\'{"a":2}\' and [Symbol(id), \'a\']'],
    answer: 0,
    explain: 'Symbol-keyed properties are skipped by JSON.stringify, Object.keys, for...in and Object.entries. Use Object.getOwnPropertySymbols or Reflect.ownKeys to see them. (Object spread and Object.assign DO copy them.)'
  });
  quiz.push({
    q: `<code>Symbol.for('app') === Symbol.for('app')</code> and <code>Symbol('app') === Symbol('app')</code> evaluate to…`,
    options: ['true, false', 'false, false', 'true, true', 'false, true'],
    answer: 0,
    explain: 'Symbol.for looks up (or creates) a symbol in the global, cross-realm registry by key, so both calls return the same symbol. Symbol() always creates a brand-new unique symbol; the description is only a label.'
  });
  quiz.push({
    q: `In a Proxy <code>set</code> trap, why is <code>return Reflect.set(target, key, value, receiver)</code> preferred over <code>target[key] = value; return true;</code>?`,
    options: ['It returns the real success boolean and passes the receiver so setters and inheritance behave correctly', 'Reflect.set is faster in all engines', 'Assigning to target inside a trap is a syntax error', 'Reflect.set skips the trap recursion limit'],
    answer: 0,
    explain: 'Reflect.set performs the default [[Set]] with the right receiver (so a setter on the prototype sees the proxy as this) and returns false when the write fails (frozen, non-writable). Returning true unconditionally can hide failures and violate proxy invariants.'
  });
  quiz.push({
    q: `What is <code>0 ?? 5</code>, <code>0 || 5</code>, and <code>null?.x ?? 'none'</code>?`,
    options: ["0, 5, 'none'", "5, 5, 'none'", '0, 0, undefined', "5, 0, TypeError"],
    answer: 0,
    explain: '?? only replaces null/undefined, so 0 stays. || replaces any falsy value, so 0 becomes 5. null?.x short-circuits to undefined (no TypeError), then ?? gives "none".'
  });
  quiz.push({
    q: `Which line is a <b>SyntaxError</b>?`,
    options: ['a || b ?? c', '(a || b) ?? c', 'a?.[0]?.(1)', 'x ??= 10'],
    answer: 0,
    explain: 'Mixing ?? with || or && without parentheses is forbidden by the grammar to avoid precedence confusion. Parenthesised mixing is fine; ?.[ ] and ?.( ) are valid optional element access and optional call; ??= is logical nullish assignment (ES2021).'
  });
  quiz.push({
    q: `Why is <code>for (const [k, v] of Object.entries(obj))</code> often replaced by a <code>Map</code> in hot code that adds and removes keys constantly?`,
    options: ['Map is optimised for frequent insert/delete and has O(1) size; objects with churning keys fall off fast hidden-class paths', 'Objects cannot be iterated', 'Map uses less memory for 3-field records', 'Object.entries is deprecated'],
    answer: 0,
    explain: 'Engines optimise objects for stable shapes (hidden classes / inline caches). Heavy add/delete turns them into slow dictionary mode, and getting the size is O(n). Maps are hash tables designed for churn. For small fixed-shape records, plain objects are still faster.'
  });

  /* =====================================================================
     INTERVIEW Q&A
     ===================================================================== */
  interview.push({
    q: 'What are the main differences between ES modules and CommonJS?',
    level: 'B',
    a: `<p><b>Short answer:</b> CommonJS (<code>require</code>/<code>module.exports</code>) is Node's original, <b>synchronous, run-time</b> system; ES modules (<code>import</code>/<code>export</code>) are the language standard: <b>static, asynchronous-capable, with live bindings</b>.</p>
      <ul><li><b>When resolved:</b> <code>require()</code> is a normal function call that can happen anywhere, even inside an <code>if</code>. <code>import</code> declarations are parsed before any code runs, so the whole graph is known up front (enables tree-shaking and early errors).</li>
      <li><b>Values vs bindings:</b> CJS hands you a copy of whatever <code>module.exports</code> held. ESM imports are read-only live views of the exporter's variables.</li>
      <li><b>Loading:</b> CJS loads and runs synchronously. ESM goes parse → link → evaluate and supports top-level <code>await</code>.</li>
      <li><b>Other:</b> ESM is always strict mode, has <code>import.meta</code> instead of <code>__dirname</code>/<code>__filename</code>, and <code>this</code> is <code>undefined</code> at the top level.</li></ul>
      <p>In 2026 Node supports both; new code and packages should be ESM, and <code>require(esm)</code> now works for graphs without top-level await.</p>`,
    followUps: ['How does Node decide whether a <code>.js</code> file is ESM or CJS? (nearest package.json "type", .mjs/.cjs extensions, and syntax detection)', 'What is the "dual package hazard"?', 'How do you get <code>__dirname</code> in ESM?']
  });
  interview.push({
    q: 'What does "live binding" mean for ES module imports? Show a case where it matters.',
    level: 'I',
    a: `<p>An imported name is not a variable holding a copy; it is a <b>reference to the exporter's variable slot</b>. If the exporting module later changes that variable, every importer sees the new value. Importers cannot assign to it (<code>TypeError: Assignment to constant variable</code>).</p>
      <p>Where it matters: a module exports <code>let count</code> and an <code>inc()</code> function; after <code>inc()</code>, <code>count</code> in the importer reads the updated value. With CJS and destructuring (<code>const { count } = require(...)</code>) the importer keeps the old number forever.</p>
      <p>It also explains <b>circular imports</b>: in a cycle, the importer gets the binding before the exporter has run, so touching a <code>let</code>/<code>const</code>/<code>class</code> export at top level throws a TDZ <code>ReferenceError</code>, while using it later (inside a function called after loading) works fine.</p>`,
    followUps: ['Why do hoisted function declarations work across a cycle but <code>const</code> arrow functions do not?', 'How do bundlers preserve live bindings when they concatenate modules?']
  });
  interview.push({
    q: 'Explain the iterator and iterable protocols. How does for...of work under the hood?',
    level: 'B',
    a: `<p>An <b>iterable</b> is any object with a <code>[Symbol.iterator]()</code> method. Calling it returns an <b>iterator</b>: an object with <code>next()</code> that returns <code>{ value, done }</code>.</p>
      <p><code>for (const x of obj)</code> roughly does: <code>const it = obj[Symbol.iterator]();</code> then loops <code>let r = it.next()</code> until <code>r.done</code> is true, binding <code>x = r.value</code> each time. If the loop exits early (<code>break</code>, <code>return</code>, an exception), it calls <code>it.return?.()</code> so the source can clean up (close a file, release a lock, run a generator's <code>finally</code>).</p>
      <p>Spread, array destructuring, <code>Array.from</code>, <code>new Map(iterable)</code>, <code>Promise.all</code> and <code>yield*</code> all use the same protocol. Arrays, strings (by code point), Maps, Sets, typed arrays, <code>arguments</code> and NodeLists are built-in iterables; plain objects are not.</p>`,
    followUps: ['Why does destructuring <code>const [a] = gen()</code> close the generator?', 'What is the async iteration protocol (<code>Symbol.asyncIterator</code>, <code>for await</code>)?', 'What are iterator helpers (<code>Iterator.prototype.map</code>) and why are they lazy?']
  });
  interview.push({
    q: 'What is a generator? How do yield, next(value), return() and throw() interact?',
    level: 'I',
    a: `<p>A generator function (<code>function*</code>) returns a paused <b>generator object</b> that is both an iterator and an iterable. Its body runs only when <code>next()</code> is called, and stops at each <code>yield</code>, keeping its local variables and position alive on the heap.</p>
      <ul><li><code>yield v</code> sends <code>v</code> out as <code>{ value: v, done: false }</code>.</li>
      <li><code>next(x)</code> resumes and makes the paused <code>yield</code> expression evaluate to <code>x</code> (the first <code>next</code>'s argument is ignored because nothing is paused yet).</li>
      <li><code>return(v)</code> resumes as if a <code>return v</code> happened at the yield: <code>finally</code> blocks run, result is <code>{ value: v, done: true }</code>.</li>
      <li><code>throw(e)</code> resumes by throwing <code>e</code> at the yield; a try/catch inside can handle it, otherwise it propagates to the caller and the generator closes.</li></ul>
      <p>Uses: lazy/infinite sequences, custom iterables, tree traversal with <code>yield*</code>, state machines, and historically async flow control (co, redux-saga), which is exactly how <code>async/await</code> was first implemented.</p>`,
    followUps: ['What does <code>yield*</code> evaluate to?', 'How would you implement async/await with generators and promises?', 'Why are generators slower than hand-written loops, and when does it matter?']
  });
  interview.push({
    q: 'When would you use a Map instead of a plain object, and a Set instead of an array?',
    level: 'B',
    a: `<p><b>Map over object</b> when the data is a <i>collection keyed by something dynamic</i>:</p>
      <ul><li>Keys of any type (objects, numbers kept as numbers) compared by SameValueZero; objects coerce every key to a string or symbol.</li>
      <li>Frequent add/delete: Maps are tuned for it; objects fall into slow dictionary mode.</li>
      <li><code>size</code> is O(1); iteration is in insertion order for all keys (objects put integer-like keys first).</li>
      <li>No prototype surprises: a key named <code>__proto__</code> or <code>constructor</code> is just data.</li></ul>
      <p>Keep <b>objects</b> for fixed-shape records (a user with name/age), JSON interchange, and destructuring.</p>
      <p><b>Set over array</b> when you need uniqueness or fast membership: <code>has</code> is O(1) average vs <code>includes</code> O(n). ES2025 added <code>union</code>, <code>intersection</code>, <code>difference</code>, <code>isSubsetOf</code> and friends. Keep arrays when order by index, duplicates or sorting matter.</p>`,
    followUps: ['How do you JSON-serialize a Map?', 'Why does <code>new Set([[1,2],[1,2]]).size</code> equal 2?', 'How are Maps implemented in V8 (deterministic hash tables)?']
  });
  interview.push({
    q: 'How do WeakMap and WeakSet work, and why can you not iterate them or read their size?',
    level: 'I',
    a: `<p>A WeakMap holds its <b>keys weakly</b>: the entry does not count as a reference for garbage collection. When nothing else references the key object, the GC may remove the key <b>and its value</b> at any time. Values are held strongly but only as long as their key is alive (this is an <b>ephemeron</b>).</p>
      <p>Because entries can disappear at unpredictable moments, exposing <code>size</code>, <code>keys()</code> or iteration would make program results depend on GC timing, which differs between engines and runs. The language deliberately hides it, so only <code>get/set/has/delete</code> exist and keys must be objects (or, since ES2023, non-registered symbols), because primitives can be recreated at will and would never be "unreachable".</p>
      <p>Typical uses: private per-instance data, caching computed results per object (memoize by object), tagging visited nodes, and associating metadata with DOM nodes or third-party objects without leaking them.</p>`,
    followUps: ['How is a WeakRef different, and why is <code>deref()</code> allowed to return undefined?', 'What is FinalizationRegistry and why should you never rely on it for correctness?', 'Can a value in a WeakMap keep its own key alive?']
  });
  interview.push({
    q: 'Walk me through a memory leak caused by a Map, and how to fix it.',
    level: 'A',
    a: `<p><b>Scenario:</b> a UI library caches per-component data in a module-level <code>const cache = new Map()</code> keyed by the component's DOM element. Components are unmounted and their elements removed, but nobody calls <code>cache.delete(el)</code>. The Map still references every element (and the element references its whole subtree and listeners), so heap snapshots show "Detached HTMLDivElement" growing forever.</p>
      <p><b>Diagnose:</b> take two heap snapshots in DevTools (or <code>node --inspect</code>), compare, look at the retainers chain of detached objects: it ends at the Map's backing store.</p>
      <p><b>Fix options:</b> (1) switch to <code>WeakMap</code> when the key's lifetime should decide the entry's lifetime; (2) explicit lifecycle cleanup (delete on unmount, <code>AbortController</code> to remove listeners); (3) bounded caches (LRU with a max size, TTL) when keys are primitives such as URLs; (4) for large values you want to keep only "if memory allows", a <code>WeakRef</code> + <code>FinalizationRegistry</code> cache, accepting non-determinism.</p>`,
    followUps: ['Why does a closure in an event listener also cause leaks?', 'How would you write a test that detects this leak (e.g. <code>--expose-gc</code> + WeakRef)?']
  });
  interview.push({
    q: 'What are Symbols used for? Explain well-known symbols with examples.',
    level: 'I',
    a: `<p>A Symbol is a primitive whose value is <b>unique</b>. Uses:</p>
      <ul><li><b>Collision-free property keys</b> on objects you share with other code: a library can add <code>obj[kMeta]</code> without clashing with user keys; symbol keys are skipped by <code>Object.keys</code>, <code>for...in</code> and <code>JSON.stringify</code>.</li>
      <li><b>Global registry</b> via <code>Symbol.for('key')</code>: the same symbol across modules and realms (iframes, workers), useful for protocol markers like <code>Symbol.for('react.element')</code>.</li>
      <li><b>Well-known symbols</b> let your objects plug into language behaviour: <code>Symbol.iterator</code> (for...of), <code>Symbol.asyncIterator</code> (for await), <code>Symbol.toPrimitive</code> (how <code>+obj</code> and template strings convert), <code>Symbol.toStringTag</code> (<code>Object.prototype.toString</code> output), <code>Symbol.hasInstance</code> (instanceof), <code>Symbol.dispose</code>/<code>asyncDispose</code> (the <code>using</code> declaration for automatic cleanup).</li></ul>
      <p>Symbols are <b>not</b> private: <code>Object.getOwnPropertySymbols</code> and <code>Reflect.ownKeys</code> reveal them. For true privacy use <code>#private</code> fields or a WeakMap.</p>`,
    followUps: ['Why does putting a symbol inside a template literal throw a TypeError while <code>String(Symbol())</code> works?', 'How does the <code>using</code> declaration use <code>Symbol.dispose</code>?']
  });
  interview.push({
    q: 'What is a Proxy, what is Reflect, and why are they usually used together?',
    level: 'I',
    a: `<p>A <b>Proxy</b> wraps a target object and lets you intercept its fundamental operations through <b>traps</b> in a handler: <code>get</code>, <code>set</code>, <code>has</code> (the <code>in</code> operator), <code>deleteProperty</code>, <code>ownKeys</code>, <code>getOwnPropertyDescriptor</code>, <code>defineProperty</code>, <code>apply</code> and <code>construct</code> (for function targets), and a few more (13 in total).</p>
      <p><b>Reflect</b> is a namespace with one function per trap that performs the <b>default</b> behaviour, returning booleans instead of throwing. Inside a trap you do your extra work (validate, log, notify) and then call <code>Reflect.xxx(...arguments)</code> to do the real operation correctly, including passing the <b>receiver</b> so getters/setters on the prototype chain see the proxy as <code>this</code>.</p>
      <p>Real uses: Vue 3 and MobX reactivity, Immer drafts, validation layers, negative array indexes, API clients that build URLs from property access, mocks/spies in tests, and revocable capabilities (<code>Proxy.revocable</code>).</p>`,
    followUps: ['What are proxy invariants? Give one example that throws.', 'Why do Map/Set methods and #private fields break when called through a proxy?', 'What does a proxy cost in performance?']
  });
  interview.push({
    q: 'Implement a reactive "watch" system like Vue 3 using Proxy. What are the key design points?',
    level: 'A',
    a: `<p><b>Core idea:</b> track which effect reads which property, and re-run those effects when the property is written.</p>
      <ul><li><code>reactive(obj)</code> returns a Proxy. The <code>get</code> trap calls <code>track(target, key)</code>: if an effect is currently running, add it to <code>deps[target][key]</code>. Nested objects are wrapped lazily on access.</li>
      <li>The <code>set</code>/<code>deleteProperty</code> traps call <code>Reflect</code> first, then, only if the value really changed (<code>Object.is</code>), <code>trigger(target, key)</code> which re-runs the effects in that dependency set.</li>
      <li>Storage: <code>WeakMap&lt;target, Map&lt;key, Set&lt;effect&gt;&gt;&gt;</code> so dropped state objects are collectable, plus a <code>WeakMap&lt;raw, proxy&gt;</code> so the same object always gets the same proxy (identity stays stable).</li>
      <li><code>effect(fn)</code> sets a global "active effect", runs fn, and resets it; before each run it clears its old dependencies so conditional branches are tracked correctly.</li></ul>
      <p><b>Production details:</b> batch triggers into a microtask queue (scheduler) to avoid running an effect 100 times in a loop; special handling for arrays (<code>length</code>, iteration keys via <code>ownKeys</code>), Map/Set (instrumented methods, since their internals bypass traps); avoid infinite loops when an effect writes what it reads.</p>`,
    followUps: ['How does Vue track iteration (<code>for...in</code>) dependencies?', 'Compare with signals (Preact/Solid/Angular) that avoid proxies.']
  });
  interview.push({
    q: 'Explain optional chaining and nullish coalescing, including their pitfalls.',
    level: 'B',
    a: `<p><code>a?.b</code> reads <code>b</code> only if <code>a</code> is not <code>null</code>/<code>undefined</code>; otherwise the <b>whole chain</b> short-circuits to <code>undefined</code> (the rest of the chain, including function calls and argument evaluation, never runs). Forms: <code>a?.b</code>, <code>a?.[expr]</code>, <code>fn?.(args)</code>.</p>
      <p><code>a ?? b</code> returns <code>b</code> only when <code>a</code> is <code>null</code>/<code>undefined</code>, unlike <code>||</code> which also replaces <code>0</code>, <code>''</code>, <code>false</code> and <code>NaN</code>. <code>??=</code> assigns only when the target is nullish.</p>
      <p><b>Pitfalls:</b> (1) Overuse hides bugs: <code>user?.id</code> everywhere means a missing user silently becomes <code>undefined</code> downstream; validate at boundaries instead. (2) Parentheses end the chain: <code>(a?.b).c</code> throws if <code>a</code> is null. (3) Mixing <code>??</code> with <code>||</code>/<code>&amp;&amp;</code> needs parentheses (SyntaxError). (4) You cannot assign through it: <code>a?.b = 1</code> is a SyntaxError. (5) <code>?.</code> does not protect against a property that exists but is not a function: <code>obj.fn?.()</code> still throws if <code>fn</code> is a number.</p>`,
    followUps: ['Why is <code>a?.b.c</code> safe when <code>a</code> is null but not when <code>a.b</code> is null?', 'How would TypeScript narrow types after <code>if (user?.profile)</code>?']
  });
  interview.push({
    q: 'How would you design a library API that is safe across CommonJS and ESM consumers in 2026?',
    level: 'E',
    a: `<p><b>Goal:</b> one copy of state, correct types, tree-shakeable, works with <code>require</code> and <code>import</code>.</p>
      <ul><li><b>Prefer ESM-only</b> where your users can take it: since Node 22.12/20.19 <code>require(esm)</code> works for synchronous ESM graphs, so most CJS callers can still load you. Avoid top-level <code>await</code> in the entry so that keeps working.</li>
      <li>If you must ship dual builds, use <code>package.json</code> <code>"exports"</code> with <code>"import"</code>/<code>"require"</code>/<code>"types"</code> conditions, and beware the <b>dual package hazard</b>: if both copies load, singletons, <code>instanceof</code> checks and caches split in two. Mitigate by keeping state in one format (a CJS core with a thin ESM wrapper) or using <code>Symbol.for</code> keys for cross-copy identity.</li>
      <li>Mark <code>"sideEffects": false</code> and use named exports for tree-shaking; avoid a default-export object of everything.</li>
      <li>Ship <code>.d.ts</code> per condition (<code>.d.mts</code>/<code>.d.cts</code>) and test with <code>moduleResolution: "nodenext"</code> and tools like "are the types wrong".</li>
      <li>Never rely on <code>__dirname</code>; use <code>import.meta.dirname</code> in ESM and keep file lookups inside a small adapter.</li></ul>`,
    followUps: ['What is the "module.exports" interop key that Node uses when an ESM module is required?', 'How do bundlers (Vite, esbuild) handle CJS dependencies in an ESM app?', 'How would you migrate a 500-file CJS monorepo to ESM incrementally?']
  });
  interview.push({
    q: 'Generators vs async/await vs async generators: when do you choose which?',
    level: 'A',
    a: `<p><b>Sync generators</b> (<code>function*</code>) produce values <b>on demand, synchronously</b>: lazy sequences, custom iterables, tree walks, parsers/tokenisers, state machines, and pull-based pipelines where the consumer controls the pace. They can also model effects as data (redux-saga yields plain objects describing effects, making flows testable without mocks).</p>
      <p><b>async/await</b> is for a <b>single</b> asynchronous result computed step by step: fetch, then parse, then save. It is built on promises and is the default choice for one-shot async work.</p>
      <p><b>Async generators</b> (<code>async function*</code> + <code>for await</code>) produce <b>many values over time</b> with back-pressure: paginated APIs, reading a file or socket in chunks (Node streams are async iterables), streaming LLM tokens, polling. The consumer awaits each item, so the producer naturally slows down to match.</p>
      <p>Rule of thumb: one value later → async function; many values now-ish, lazily → generator; many values over time → async generator (or a stream/observable for push-based, multi-subscriber cases).</p>`,
    followUps: ['How does breaking out of <code>for await</code> clean up an async generator?', 'Why might you still choose RxJS observables over async iterators?']
  });

  /* =====================================================================
     MODULE REGISTRATION
     ===================================================================== */
  registerModule({
    id: 'js09',
    title: 'Modern JS: Modules, Iterators, Generators, Map/Set, Proxy',
    intro: `<p>This module is the "modern JavaScript toolbox" that senior interviews love to probe. You will see how code is split into <b>modules</b> (ES modules vs CommonJS, and why live bindings and circular imports behave the way they do), how <b>for...of</b> really works through the <b>iterator protocol</b> and <code>Symbol.iterator</code>, and how <b>generators</b> give you pausable functions for lazy and infinite data.</p>
      <p>Then we cover the <b>keyed collections</b> (<code>Map</code>, <code>Set</code>, <code>WeakMap</code>, <code>WeakSet</code>) and when each beats a plain object or array, <b>Symbols</b> as collision-free keys and language hooks, <b>Proxy and Reflect</b> for intercepting object operations (the engine behind Vue, MobX and Immer), and the everyday safety operators <b>?.</b> and <b>??</b>.</p>
      <p>Every topic starts with a real-world analogy, has a step-by-step visualizer you can feed your own input, worked "predict the output" examples, an expert deep dive, and notes on using AI tools well. Finish with 15 practice problems, a quiz and interview questions.</p>`,
    goals: [
      'Explain ES modules vs CommonJS (static vs dynamic, live bindings vs copies, cycles, interop) and pick the right one for a 2026 Node or browser project',
      'Make any object iterable with <code>Symbol.iterator</code> and explain exactly what for...of, spread and destructuring do with next(), done and return()',
      'Write generators for lazy and infinite sequences, trace next(value), return() and throw(), and build lazy pipelines',
      'Choose between Map, Set, WeakMap, WeakSet and plain objects/arrays, and explain how weak references avoid memory leaks',
      'Use Symbols and well-known symbols (iterator, toPrimitive, toStringTag, dispose) to hook into language behaviour',
      'Build Proxy-based validation, change tracking and copy-on-write with Reflect, and know the invariants and performance costs',
      'Use ?. and ?? correctly, avoiding the falsy-value bug of || and the classic short-circuit pitfalls'
    ],
    prereqs: `JS 2 (Functions, Arrays &amp; Objects), JS 4 (Scope &amp; Closures), JS 6 (Prototypes &amp; Classes) and JS 7–8 (Promises, Event Loop, async/await). Comfort with recursion and hash maps (DSA hashing module) helps for the practice problems.`,
    hours: 12,
    topics: topics,
    practice: practice,
    quiz: quiz,
    interview: interview
  });
})();
